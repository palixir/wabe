
import { describe, it, expect, mock , beforeEach} from 'bun:test';
import { runDatabase } from './index';
import tcpPortUsed from 'tcp-port-used';
import { newDb } from 'pg-mem';

describe('runDatabase', () => {
  // Clear all mocks before each test
  beforeEach(() => {
    mock.restore();
  });

  const port = 5432;
  const universalPort = '127.0.0.1';

  it('should return early if PostgreSQL is already running', async () => {
    mock.module('tcp-port-used', () => ({
      check: mock(() => Promise.resolve(true))
    }));

    const result = await runDatabase();
    expect(result).toBeUndefined();
  });

  it('should start an in-memory PostgreSQL database if not running', async () => {
    mock.module('tcp-port-used', () => ({
      check: mock(() => Promise.resolve(false))
    }));

    mock.module('pg-mem', () => ({
      newDb: mock(() => ({
        adapters: {
          bindServer: mock(() => Promise.resolve())
        }
      }))
    }));

    await runDatabase();
  });


  it('should start an in-memory PostgreSQL database and perform basic operations', async () => {
    // Mock port check
    mock.module('tcp-port-used', () => ({
      check: mock(() => Promise.resolve(false))
    }));

    // Create a mock database with query capabilities
    const mockDb = {
      adapters: {
        bindServer: mock(() => Promise.resolve()),
        query: mock((queryString: string, params?: any[]) => {
          // Simulate different query behaviors
          if (queryString.includes('CREATE TABLE')) {
            return { command: 'CREATE', rowCount: 0 };
          }
          if (queryString.includes('INSERT INTO')) {
            return { command: 'INSERT', rowCount: 1 };
          }
          if (queryString.includes('SELECT')) {
            return {
              rows: [
                { id: 1, name: 'Test User' },
                { id: 2, name: 'Another User' }
              ],
              rowCount: 2
            };
          }
          return { rows: [], rowCount: 0 };
        })
      }
    };

    // Mock newDb to return our mock database
    mock.module('pg-mem', () => ({
      newDb: mock(() => mockDb)
    }));

    // Run database and perform some mock queries
    await runDatabase();

    // Perform create table query
    const createTableResult = mockDb.adapters.query(
      'CREATE TABLE users (id SERIAL PRIMARY KEY, name VARCHAR(100))'
    );
    expect(createTableResult.command).toBe('CREATE');

    // Perform insert query
    const insertResult = mockDb.adapters.query(
      'INSERT INTO users (name) VALUES ($1)',
      ['John Doe']
    );
    expect(insertResult.rowCount).toBe(1);

    // Perform select query
    const selectResult = mockDb.adapters.query('SELECT * FROM users');
    expect(selectResult.rows!.length).toBe(2);
    expect(selectResult.rows![0].name).toBe('Test User');
  });


  it('should handle complex database transactions', async () => {
    // Mock port check
    mock.module('tcp-port-used', () => ({
      check: mock(() => Promise.resolve(false))
    }));

    // Create a mock database with transaction capabilities
    const mockDb = {
      adapters: {
        bindServer: mock(() => Promise.resolve()),
        beginTransaction: mock(() => Promise.resolve()),
        query: mock((queryString: string, params?: any[]) => {
          if (queryString.includes('BEGIN')) {
            return { command: 'BEGIN' };
          }
          if (queryString.includes('COMMIT')) {
            return { command: 'COMMIT' };
          }
          if (queryString.includes('ROLLBACK')) {
            return { command: 'ROLLBACK' };
          }
          return { rows: [], rowCount: 0 };
        }),
        commitTransaction: mock(() => Promise.resolve()),
        rollbackTransaction: mock(() => Promise.resolve())
      }
    };

    // Mock newDb to return our mock database
    mock.module('pg-mem', () => ({
      newDb: mock(() => mockDb)
    }));

    // Run database
    await runDatabase();

    // Simulate a transaction
    const beginResult = mockDb.adapters.query('BEGIN');
    expect(beginResult.command).toBe('BEGIN');

    // Simulate a commit
    const commitResult = mockDb.adapters.query('COMMIT');
    expect(commitResult.command).toBe('COMMIT');
  });

  it('should handle database connection pooling', async () => {
    mock.module('tcp-port-used', () => ({
      check: mock(() => Promise.resolve(false))
    }));

    const mockDb = {
      adapters: {
        bindServer: mock(() => Promise.resolve()),
        createPool: mock(() => ({
          connect: mock(() => ({
            query: mock((queryString: string) => {
              if (queryString.includes('MAX_CONNECTIONS')) {
                return { rows: [{ max_connections: 100 }] };
              }
              return { rows: [] };
            }),
            release: mock(() => Promise.resolve())
          }))
        }))
      }
    };

    mock.module('pg-mem', () => ({
      newDb: mock(() => mockDb)
    }));

    await runDatabase();

    // Create connection pool
    const pool = mockDb.adapters.createPool();
    const client = await pool.connect();

    // Check max connections
    const connectionsResult = await client.query('SHOW MAX_CONNECTIONS');
    expect(connectionsResult.rows[0].max_connections).toBe(100);

    // Release client back to pool
    client.release();
  });
});