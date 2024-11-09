import { newDb } from 'pg-mem'
import tcpPortUsed from 'tcp-port-used'
import { Client as PgClient } from 'pg' // For real PostgreSQL in production
import type { PostgresClientOptions, PostgresClientParams } from './interface/wabe-postgres-interface'

// Function to set up the in-memory PostgreSQL using pg-mem
export const WabeInMemoryPostgres = async (): Promise<
  PgClient | undefined
> => {
  const port = 5432
  const universalPort = '127.0.0.1' // Default to '127.0.0.1' if no port/loopback address is provided

  const isPortInUse = await tcpPortUsed.check(port, universalPort)

  if (isPortInUse) {
    console.info(
      `Wabe IN-MEMORY: In-mem Postgres initialize and is active and ready to accept data on port ${port} \n`,
    )
    return
  }
  try {
    const db = await newDb()
    const adapters = db.adapters

    // Bind the server to the in-memory database
    await adapters.bindServer()

    // Get a connected PostgreSQL client using the 'createPg' method
    const { Client } = adapters.createPg()
    const client = new Client()
    await client.connect()
    await client.query('SELECT NOW();')

    return client
  } catch (error) {
    console.error('Error setting up in-memory PostgreSQL:', error)
    throw error
  }
}



/**
 * WabePostgresClient - A flexible PostgreSQL client initializer that can connect 
 * to a real PostgreSQL instance using either a connection string or default 
 * credentials, or fall back to an in-memory PostgreSQL instance for testing.
 * 
 * You can connect using:
 * 1. **Connection String**: Use the provided PostgreSQL connection URI string.
 * 2. **Default PostgreSQL Setup**: Use default connection settings (local PostgreSQL credentials).
 * 3. **In-Memory Database**: Automatically uses an in-memory PostgreSQL instance (useful for testing).
 *
 * @param {string} db_user - The database user (for default PostgreSQL connection).
 * @param {string} host - The host address (for default PostgreSQL connection).
 * @param {string} database - The database name (for default PostgreSQL connection).
 * @param {string} password - The password (for default PostgreSQL connection).
 * @param {number} port - The port number (for default PostgreSQL connection).
 * @param {string} connection_string - A full connection URI string for PostgreSQL.
 * @param {PostgresClientOptions} options - Configures connection behavior:
 *    - `useConnectionString` (default: true): Uses the provided connection string if available.
 *    - `useDefaultPostgres` (default: false): Falls back to default PostgreSQL config if true.
 *
 * @returns {Promise<PgClient | undefined>} - The connected PostgreSQL client, 
 *                                            or an in-memory instance for testing.
 *
 * Example 1: **Connecting using a connection string** (overrides default settings).
 * ```typescript
 * const client = await getPostgresClient({
 *   connection_string: "postgres://user:password@localhost:5432/mydatabase",
 *   options: { useConnectionString: true }
 * });
 * ```
 * - Pass the full connection URI string and optionally set `useConnectionString: true` (defaults to true).
 *
 * Example 2: **Connecting using default PostgreSQL connection settings** (overrides URI).
 * ```typescript
 * const client = await getPostgresClient({
 *   db_user: "default_user",       // Database user
 *   host: "localhost",             // Host for the database
 *   database: "default_db",        // Database name
 *   password: "default_password",  // Password for the database
 *   port: 5432,                    // Port number
 *   options: { useDefaultPostgres: true }  // Set to true to use default PostgreSQL credentials
 * });
 * ```
 * - Pass the default credentials for PostgreSQL and set `useDefaultPostgres: true` to prioritize it.
 *
 * Example 3: **Using an in-memory database for testing**.
 * ```typescript
 * const client = await getPostgresClient({
 *   options: { useConnectionString: false, useDefaultPostgres: false }
 * });
 * ```
 * - This will create an in-memory PostgreSQL instance for testing without needing external DB setup.
 *
 *
 * Example:
 * ```typescript
 * const client = await getPostgresClient(
 *    'user', 'localhost', 'mydb', 'password', 5432,
 *    undefined, { useDefaultPostgres: true }
 * );
 * ```
 */

//Initializes a PostgreSQL client not In-memory.
export const WabePostgresClient = async ({
  db_user,
  host,
  database,
  password,
  port,
  connection_string,
  options = {}
// Default options
}: PostgresClientParams): Promise<PgClient | undefined> => {
  const { useConnectionString = true, useDefaultPostgres = false } = options;
  
  // Try to use connection string if specified and enabled
  if (useConnectionString && connection_string) {
    const client = new PgClient(connection_string);
    try {
      await client.connect();
      console.info('Connected to PostgreSQL using connection string');
      return client;
    } catch (error) {
      console.error('Failed to connect to PostgreSQL with connection string:', error);
      throw error;
    }
  }

  // Use default PostgreSQL connection if enabled
  if (useDefaultPostgres) {
    const client = new PgClient({
      user: db_user,
      host: host,
      database: database,
      password: password,
      port: port || 5432,
    });
    try {
      await client.connect();
      console.info('Connected to default PostgreSQL instance');
      return client;
    } catch (error) {
      console.error('Failed to connect to default PostgreSQL instance:', error);
      throw error;
    }
  }

  // Fall back to in-memory PostgreSQL
  console.info('Using in-memory PostgreSQL instance');
  return await WabeInMemoryPostgres();
};


//for testing purposes
export const testPostgresClient = async (): Promise<PgClient | undefined> => {
  return await WabeInMemoryPostgres()
}

