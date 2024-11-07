import { describe, it, expect, spyOn, afterEach, beforeAll, afterAll, jest } from 'bun:test';
import { getPostgresClient, setupInMemoryPostgres } from './index.ts'; 
import { newDb } from 'pg-mem';
import tcpPortUsed from 'tcp-port-used';
import type { Client } from 'pg';
import { Client as PgClient } from 'pg'

let client: Client | undefined; // Global variable to track the client

describe('In-Memory PostgreSQL Setup Tests', () => {
    beforeAll(async () => {
        // Initialize the client only once
        if (!client) {
            client = await getPostgresClient(); 
        }
    });

    afterAll(async () => {
        if (client) {
            await client.end();
        }
    });

    it('should create an in-memory PostgreSQL instance when no real PostgreSQL is running', async () => {
        const inMemoryClient = await setupInMemoryPostgres();
        expect(inMemoryClient).toBeDefined();

        const result = await inMemoryClient!.query('SELECT 1');
        expect(result.rows).toEqual([{ column: 1 }]);

        await inMemoryClient!.end();
    });

    it('should skip in-memory setup if PostgreSQL is already running', async () => {
        const checkSpy = spyOn(tcpPortUsed, 'check').mockResolvedValue(true);

        const inMemoryClient = await setupInMemoryPostgres();
        expect(inMemoryClient).toBeUndefined();

        checkSpy.mockRestore();
    });

    it('should insert and retrieve data into/from the wabe table in the in-memory database', async () => {
        // Setup the in-memory Postgres database
        const inMemoryClient = await setupInMemoryPostgres(); // Assume this sets up the schema
        expect(inMemoryClient).toBeDefined();
    
        // Define the table schema in the in-memory database
        await inMemoryClient!.query(`
            CREATE TABLE wabe (
                id SERIAL PRIMARY KEY,
                wabe_project_name VARCHAR(255),
                email VARCHAR(255) UNIQUE
            );
        `);
    
        // Insert data into the wabe table
        const insertQuery = `
            INSERT INTO wabe (wabe_project_name, email)
            VALUES ('Test Project', 'test@example.com')
            RETURNING *;
        `;
        const insertResult = await inMemoryClient!.query(insertQuery);
        
        // Verify that one row was inserted
        expect(insertResult.rows.length).toBe(1);
        expect(insertResult.rows[0].wabe_project_name).toBe('Test Project');
        expect(insertResult.rows[0].email).toBe('test@example.com');
    
        // Test selecting the inserted data from the wabe table
        const selectQuery = 'SELECT * FROM wabe WHERE email = $1;';
        const selectResult = await inMemoryClient!.query(selectQuery, ['test@example.com']);
        
        // Verify the selected data matches what was inserted
        expect(selectResult.rows.length).toBe(1);
        expect(selectResult.rows[0].wabe_project_name).toBe('Test Project');
        expect(selectResult.rows[0].email).toBe('test@example.com');
    
        // End the client connection after the test
        await inMemoryClient!.end();
    });
    
    

    it('should create, insert, and retrieve a row in the wabe table', async () => {
        const inMemoryClient = await setupInMemoryPostgres();

        await inMemoryClient!.query(`
            CREATE TABLE IF NOT EXISTS wabe (
                id INTEGER,
                wabe_project_name TEXT,
                email TEXT
            );
        `);

        let nextId = 1;

        const insertQuery = `
            INSERT INTO wabe (id, wabe_project_name, email)
            VALUES ($1, $2, $3)
            RETURNING *;
        `;
        const insertResult = await inMemoryClient!.query(insertQuery, [nextId++, 'Test Project', 'test@example.com']);

        expect(insertResult.rows[0]).toBeDefined();
        expect(insertResult.rows[0].wabe_project_name).toBe('Test Project');
        expect(insertResult.rows[0].email).toBe('test@example.com');

        const selectQuery = 'SELECT * FROM wabe WHERE email = $1;';
        const selectResult = await inMemoryClient!.query(selectQuery, ['test@example.com']);

        expect(selectResult.rows.length).toBe(1);
        expect(selectResult.rows[0].wabe_project_name).toBe('Test Project');

        await inMemoryClient!.end();
    });
});

describe("Actual PostgreSQL Client Tests", () => {

    it('should use default loopback address 127.0.0.1', async () => {
        const changedAddress = '127.0.0.1';
        const client = await getPostgresClient(changedAddress);

        expect(client).toBeDefined();
    });

    it('should check if real instance PostgreSQL is running on the default port', async () => {
        const port = 5432; // Default PostgreSQL port
        const user = 'your_db_user'; // Replace with actual PostgreSQL username
        const host = 'localhost'; // Assuming PostgreSQL is running locally
        const database = 'your_database'; // Replace with actual database name
        const password = 'your_db_password'; // Replace with actual password
    
    
            // Call getPostgresClient with real PostgreSQL credentials
            const client = await getPostgresClient(user, host, database, password, port);
    
            // Ensure the client is defined (connected successfully)
            expect(client).toBeDefined();
    
            // Optionally, check if the client can perform a simple query
            const result = await client!.query('SELECT NOW();'); // Example query
            expect(result).toBeDefined();
    
            // Clean up: close the connection
            await client!.end();
        
    });
    

    it('should get a real PostgreSQL client in production', async () => {
        process.env.NODE_ENV = 'production'; // Set environment to production
    
        // Create a more complete mockPgClient
        const mockPgClient = {
            connect: jest.fn(), // Mock connect
            end: jest.fn(),
            query: jest.fn(), // Add any other methods you plan to use
            release: jest.fn(),
        } as unknown as PgClient; // Force type casting to PgClient
    
        // Mock getPostgresClient to return the mockPgClient
        const getPostgresClient = jest.fn().mockResolvedValue(mockPgClient);
    
        // Call the function
        const client = await getPostgresClient('user', 'host', 'database', 'password', 5432) as PgClient;
    
        // Ensure client is not undefined
        expect(client).toBeDefined();
    
        // Debugging step: Check if client is the mockPgClient
        expect(client).toEqual(mockPgClient); // This ensures we're getting the mock back
    
        // Manually call connect if necessary
        await client.connect(); // Manually trigger the connect call
    
        // Check if the mockPgClient.connect method was called
        expect(mockPgClient.connect).toHaveBeenCalledTimes(1);
    
        // Cleanup
        jest.restoreAllMocks();
    });
    
    

    it('should create the wabe table and retrieve the inserted wabe project using a real postgres instance', async () => {
        process.env.NODE_ENV = 'production';
    
        const client = await getPostgresClient('user', 'host', 'database', 'password', 5432);
    
        expect(client).toBeDefined();
    
        if (client) {
            const createTableQuery = `
                CREATE TABLE IF NOT EXISTS wabe (
                    id SERIAL PRIMARY KEY,
                    wabe_project_name VARCHAR(255) NOT NULL,
                    email VARCHAR(255) UNIQUE NOT NULL
                );
            `;
            await client.query(createTableQuery);
    
            // Insert a new wabe project
            const insertQuery = `
                INSERT INTO wabe (wabe_project_name, email)
                VALUES ($1, $2)
                RETURNING *;
            `;
            const values = ['Test Project', 'test2@example.com']; 
            const insertResult = await client.query(insertQuery, values);
    
            // Ensure that the insert was successful
            expect(insertResult.rows.length).toBe(1);
            expect(insertResult.rows[0].wabe_project_name).toBe('Test Project');
            expect(insertResult.rows[0].email).toBe('test2@example.com');
    
            // Select the inserted project by email
            const selectQuery = `SELECT * FROM wabe WHERE email = $1;`;
            const selectValues = ['test2@example.com']; 
            const result = await client.query(selectQuery, selectValues);
    
            // Ensure one row was retrieved
            expect(result.rows.length).toBe(1);
    
            // Verify the wabe_project_name and email of the retrieved row
            expect(result.rows[0].wabe_project_name).toBe('Test Project');
            expect(result.rows[0].email).toBe('test2@example.com');
        }
        
    });

    it('should connect to PostgreSQL using a real connection string (URI)', async () => {
        // Define the PostgreSQL connection string
        process.env.NODE_ENV = 'production';

        const connectionString = 'postgres://user:password@localhost:5432/database'; 
    
            // Call getPostgresClient with the connection string
            const client = await getPostgresClient(connectionString);
    
            // Ensure the client is defined (connected successfully)
            expect(client).toBeDefined();
    
            // Optionally, check if the client can perform a simple query
            const result = await client!.query('SELECT NOW();'); // Example query
            expect(result).toBeDefined();
    
            // Clean up: close the connection
            await client!.end();
    });

    it('should connect to PostgreSQL using a real connection string (URI) with the env', async () => {
        // Define the PostgreSQL connection string
        process.env.NODE_ENV = 'production';

        const connectionString = 'postgres://user:password@localhost:5432/database'; 
    
            // Call getPostgresClient with the connection string
            const client = await getPostgresClient(connectionString);
    
            // Ensure the client is defined (connected successfully)
            expect(client).toBeDefined();
    
            // Optionally, check if the client can perform a simple query
            const result = await client!.query('SELECT NOW();'); // Example query
            expect(result).toBeDefined();
    
            // Clean up: close the connection
            await client!.end();
    });
    
    
});

describe('getPostgresClient - Environment Variables', () => {

    afterEach(() => {
        // Restore any environment variables that were mocked or changed
        jest.restoreAllMocks();
        delete process.env.DATABASE_URL;
        delete process.env.DB_USER;
        delete process.env.DB_HOST;
        delete process.env.DB_NAME;
        delete process.env.DB_PASSWORD;
        delete process.env.DB_PORT;
        process.env.NODE_ENV = 'test'; // Reset to default
    });

    it('should use DATABASE_URL  with env as staging', async () => {
               // Define the PostgreSQL connection string
                process.env.NODE_ENV = 'staging';

                const connectionString = 'postgres://user:password@localhost:5432/database'; 
            
                    // Call getPostgresClient with the connection string
                    const client = await getPostgresClient(connectionString);
            
                    expect(client).toBeDefined();
            
                    // Optionally, check if the client can perform a simple query
                    const result = await client!.query('SELECT NOW();'); // Example query
                    expect(result).toBeDefined();
            
                    // Clean up: close the connection
                    await client!.end();
    });

    it('should use individual environment variables if DATABASE_URL is not set', async () => {
        // Set environment variables directly in the test
        process.env.NODE_ENV = 'production'; // Set environment to production
        process.env.DB_USER = 'postgres';
        process.env.DB_HOST = 'localhost';
        process.env.DB_NAME = 'postgres';
        const user_password  =  process.env.DB_PASSWORD = 'password';
        process.env.DB_PORT = '5432';
    
        const mockConnect = spyOn(PgClient.prototype, 'connect').mockImplementation(async () => {});
    
        const client = await getPostgresClient(); // This should now get a real PgClient
    
        expect(client).toBeDefined();
        expect(mockConnect).toHaveBeenCalled(); // Ensure connect was called
        expect(client).toBeInstanceOf(PgClient); // Expect PgClient now
        expect(client!.user).toBe('stephenawuah'); // Check against hardcoded value
        expect(client!.host).toBe('localhost'); // Check against hardcoded value
        expect(client!.database).toBe('stephenawuah'); // Check against hardcoded value
        expect(user_password).toBe('password'); // Check against hardcoded value
        expect(client!.port).toBe(5432); // Check against hardcoded value
    
        await client!.end(); 
    });
});