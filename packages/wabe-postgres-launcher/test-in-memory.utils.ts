/**
 * Database utility functions for type-safe PostgreSQL operations.
 *
 * Key features:
 * - Type-safe queries with generics (<T>)
 * - Null-safe client handling
 * - Multiple query patterns:
 *   - executeQuery<T>: Full QueryResult with type safety
 *   - executeQueryRows<T>: Direct array of typed results
 *   - executeQuerySingle<T>: Single record lookup
 *   - executeSafeQuery<T>: Error-handled operations
 *
 * DX Benefits:
 * - No need for manual type casting
 * - Automated null checking
 * - Consistent error handling
 * - IntelliSense support for query results
 *
 * Example:
 * ```typescript
 * interface User { id: number; name: string; }
 *
 * // Type-safe query with error handling
 * const { data, error } = await executeSafeQuery<User>(
 *   client,
 *   'SELECT * FROM users WHERE id = $1',
 *   [1]
 * );
 *
 * // TypeScript knows data is User | null
 * if (data) {
 *   console.log(data.name); // Full type completion
 * }
 * ```
 */

import {  Client as PgClient, type QueryResult, type QueryResultRow } from 'pg'
import { WabeInMemoryPostgres } from './index'
import type { User } from './interface/wabe-postgres-interface'

// Option 1: Using QueryResult<T> as the return type
export const executeQuery = async <T extends QueryResultRow>(
  client: PgClient | undefined,
  sql: string,
  params?: any[],
): Promise<QueryResult<T> | null> => {
  if (!client) {
    return null
  }

  return client.query<T>(sql, params)
}

// Option 2: If you want to return just the rows
export const executeQueryRows = async <T extends QueryResultRow>(
  client: PgClient | undefined,
  sql: string,
  params?: any[],
): Promise<T[] | null> => {
  if (!client) {
    return null
  }

  const result = await client.query<T>(sql, params)
  return result.rows
}

// Helper function to get a single row or null
export const executeQuerySingle = async <T extends QueryResultRow>(
  client: PgClient | undefined,
  sql: string,
  params?: any[],
): Promise<T | null> => {
  if (!client) {
    return null
  }

  const result = await client.query<T>(sql, params)
  return result.rows[0] || null
}


async function example() {
  const client = await WabeInMemoryPostgres()

  // Using Option 1: Get full QueryResult
  const result = await executeQuery<User>(
    client,
    'INSERT INTO users (name, email) VALUES ($1, $2) RETURNING *',
    ['John', 'john@example.com'],
  )

  if (result) {
    // Access QueryResult properties
    console.log('Rows affected:', result.rowCount)
    console.log('First user:', result.rows[0])
  }

  // Using Option 2: Get just the rows
  const users = await executeQueryRows<User>(
    client,
    'SELECT * FROM users WHERE email = $1',
    ['john@example.com'],
  )

  if (users) {
    // Work directly with the array of users
    users.forEach((user) => {
      console.log(`User ${user.name} has ID ${user.id}`)
    })
  }
}

// Example with error handling

const DatabaseError = {
  CONNECTION_ERROR: 'CONNECTION_ERROR',
  QUERY_ERROR: 'QUERY_ERROR',
} as const

export type DatabaseErrorType = (typeof DatabaseError)[keyof typeof DatabaseError]

export interface DatabaseResult<T> {
  data: T | null
  error: { type: DatabaseErrorType; message: string } | null
}


export const executeSafeQuery = async <T extends QueryResultRow>(
  client: PgClient | undefined,
  sql: string,
  params?: any[],
): Promise<DatabaseResult<T>> => {
  try {
    if (!client) {
      return {
        data: null,
        error: {
          type: DatabaseError.CONNECTION_ERROR,
          message: 'Database connection not available',
        },
      }
    }

    const result = await client.query<T>(sql, params)
    return {
      data: result.rows[0] || null,
      error: null,
    }
  } catch (err) {
    return {
      data: null,
      error: {
        type: DatabaseError.QUERY_ERROR,
        message: err instanceof Error ? err.message : 'Unknown error occurred',
      },
    }
  }
}

// Usage with error handling
;(async function exampleWithErrorHandling() {
  const client = await WabeInMemoryPostgres()

  if (!client) {
    throw new Error('Failed to initialize in-memory PostgreSQL client.')
  }

  // Define schema for the "users" table
  await client.query(`
        CREATE TABLE users (
            id SERIAL PRIMARY KEY,
            email VARCHAR(255) UNIQUE NOT NULL,
            name VARCHAR(255),
            created_at TIMESTAMP DEFAULT NOW()
        );
    `)

  // Insert a sample user for testing
  await client.query(`
        INSERT INTO users (email, name) 
        VALUES ('john@example.com', 'John Doe');
    `)

  // Now we can run the query
  const { data: user, error } = await executeSafeQuery<User>(
    client,
    'SELECT * FROM users WHERE email = $1',
    ['john@example.com'],
  )

  if (error) {
    console.error(`Database error (${error.type}):`, error.message)
    await client.end()
    return
  }

  if (user) {
    console.log('Found user:', user)
    await client.end() // End connection if user is found
  } else {
    console.log('User not found')
    await client.end() // End connection if user is not found
  }
})()
