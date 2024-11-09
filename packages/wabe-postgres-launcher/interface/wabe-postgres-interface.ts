/**
 * PostgresClientOptions - Configuration options for PostgreSQL client connection behavior.
 * 
 * Use this interface to customize how `getPostgresClient` behaves based on your connection requirements.
 * 
 * @property {boolean} useConnectionString - Set to `true` (default) to prioritize connecting with the provided connection string.
 *                                         If `false`, the function will look for other connection parameters (like `db_user`, `host`, etc.).
 * @property {boolean} useDefaultPostgres - Set to `true` to use default local PostgreSQL connection settings (e.g., `localhost`, default credentials).
 *                                         If `false`, the function may fall back to using the connection string or in-memory DB.
 */

export interface PostgresClientOptions {
    useConnectionString?: boolean; // Use the connection string if available
    useDefaultPostgres?: boolean;  // Use default PostgreSQL connection if true
}

/**
 * User - Represents a user object in the database.
 * 
 * This interface defines the basic properties for a user record in the database, typically retrieved through SELECT queries.
 * 
 * @property {number} id - The unique identifier of the user (typically auto-incremented).
 * @property {string} name - The name of the user.
 * @property {string} email - The email address of the user (unique).
 */

// User interface 
export interface User {
    id: number
    name: string
    email: string
}

/**
 * PostgresClientParams - Parameters for configuring PostgreSQL client connections.
 * 
 * This interface helps define the connection parameters when initializing a PostgreSQL client using the `getPostgresClient` function.
 * You can either use a connection string or provide the individual connection parameters.
 * 
 * @property {string} db_user - The database user (required for default PostgreSQL setup).
 * @property {string} host - The host address for the PostgreSQL server (default is `localhost`).
 * @property {string} database - The database name (default is `default_db`).
 * @property {string} password - The password for the database user.
 * @property {number} port - The port number for the PostgreSQL server (default is `5432`).
 * @property {string} connection_string - The full connection URI for PostgreSQL (e.g., `postgres://user:password@localhost:5432/mydb`).
 * @property {PostgresClientOptions} options - Custom options to control connection behavior, including:
 *    - `useConnectionString`: Whether to prioritize using the provided connection string.
 *    - `useDefaultPostgres`: Whether to use default PostgreSQL connection settings (for local development/testing).
 */

//Wabe postgres client connection params 
export interface PostgresClientParams {
    db_user?: string;
    host?: string;
    database?: string;
    password?: string;
    port?: number;
    connection_string?: string;
    options?: PostgresClientOptions;
  }