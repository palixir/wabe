import { newDb, type nil } from 'pg-mem'
import tcpPortUsed from 'tcp-port-used'
import { Client } from 'pg' // For real PostgreSQL in production
import type { PostgresClientParams } from './interface/wabe-postgres-interface'

/**
 * Sets up an in-memory PostgreSQL instance for testing and development.
 * Uses pg-mem to create a temporary database that behaves like a real PostgreSQL instance.
 *
 * Features:
 * - Automatically checks port availability (5432)
 * - Creates fresh database instance for each run
 * - Returns standard PgClient for familiar API
 * - No persistence between runs (good for tests)
 *
 *
 *  Zero Configuration Setup
 *    - Auto-initializes on port 5432
 *    - No physical database installation needed
 *    - Works out of the box for testing/development
 *
 *  Development Friendly
 *    - Standard PgClient interface
 *    - Compatible with typical PostgreSQL queries
 *    - Supports async/await pattern
 *
 *  Limitations:
 * - Not for production use
 * - Data doesn't persist after restart
 * - Limited to single port (5432)
 *
 *  Common Use Cases:
 * 1. Unit Testing
 *    ```typescript
 *    beforeEach(async () => {
 *      client = await WabeInMemoryPostgres();
 *    });
 *    ```
 *
 * 2. Development Environment
 *    ```typescript
 *    if (process.env.NODE_ENV === 'development') {
 *      client = await WabeInMemoryPostgres();
 *    }
 *    ```
 *
 * y
 * 3. CI/CD Pipelines
 *    - No need to set up actual database
 *    - Consistent test environment
 *
 * @see pg-mem documentation for advanced features
 *
 * @returns Promise<PgClient | undefined> - PostgreSQL client if setup succeeds,
 *                                         undefined if port is already in use
 *
 * @example
 * ```typescript
 * const client = await WabeInMemoryPostgres();
 *
 * if (client) {
 *   // Fresh database instance
 *   await client.query('CREATE TABLE users (id SERIAL PRIMARY KEY)');
 * }
 * ```
 *
 * Note: Port 5432 must be available for new instances.
 * If port is in use, assumes existing instance and returns undefined.
 */

// Function to set up the in-memory PostgreSQL using pg-mem
export const WabeInMemoryPostgres = async (): Promise<Client | nil> => {
  const port = 5432
  const universalPort = '127.0.0.1'

  const isPortInUse = await tcpPortUsed.check(port, universalPort)

  if (isPortInUse) {
    console.info(
      `PostgreSQL is already running on port ${port}. Using the existing instance.`,
    )
    return // You can return an existing real client here if needed
  }

  try {
    const db = newDb() // Create a new in-memory database instance
    const adapters = db.adapters

    // Bind the in-memory database to a PostgreSQL client
    await adapters.bindServer() // This binds the server, preparing it for connections

    console.info('In-memory PostgreSQL database created successfully')

    // Return the pg-mem client (using createPg to get both Pool and Client)
    const { Client: pgClient } = adapters.createPg()
    return new pgClient()
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
  options = {},
  // Default options
}: PostgresClientParams): Promise<Client | nil> => {
  const { useConnectionString = true, useDefaultPostgres = false } = options

  // Try to use connection string if specified and enabled
  if (useConnectionString && connection_string) {
    const client = new Client(connection_string)
    try {
      await client.connect()
      console.info('Connected to PostgreSQL using connection string')
      return client
    } catch (error) {
      console.error(
        'Failed to connect to PostgreSQL with connection string:',
        error,
      )
      throw error
    }
  }

  // Use default PostgreSQL connection if enabled
  if (useDefaultPostgres) {
    const client = new Client({
      user: db_user,
      host: host,
      database: database,
      password: password,
      port: port || 5432,
    })
    try {
      await client.connect()
      console.info('Connected to default PostgreSQL instance')
      return client
    } catch (error) {
      console.error('Failed to connect to default PostgreSQL instance:', error)
      throw error
    }
  }

  // Fall back to in-memory PostgreSQL
  console.info('Using in-memory PostgreSQL instance')
  return await WabeInMemoryPostgres()
}
