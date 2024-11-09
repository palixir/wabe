import {
  describe,
  it,
  expect,
  spyOn,
  beforeAll,
  afterAll,
  afterEach,
} from 'bun:test'
import { WabeInMemoryPostgres, testPostgresClient } from './index.ts'
import tcpPortUsed from 'tcp-port-used'
import { Client as PgClient } from 'pg'

let client: PgClient | undefined // Global variable to track the client

describe('In-Memory PostgreSQL Setup Tests', () => {
  let inMemoryClient: PgClient | undefined

  beforeAll(async () => {
    // Initialize the client only once
    if (!client) {
      client = await testPostgresClient()
    }
  })

  afterEach(async () => {
    if (inMemoryClient) {
      await inMemoryClient!.end()
      inMemoryClient = undefined
    }
  })

  afterAll(async () => {
    if (client) {
      await client.end()
    }
  })

  it('should skip in-memory setup if PostgreSQL is already running', async () => {
    const checkSpy = spyOn(tcpPortUsed, 'check').mockResolvedValue(true)

    const inMemoryClient = await WabeInMemoryPostgres()
    expect(inMemoryClient).toBeUndefined()

    checkSpy.mockRestore()
  })

  it('should create an in-memory PostgreSQL instance when no real PostgreSQL is running', async () => {
    const inMemoryClient = await WabeInMemoryPostgres()
    expect(inMemoryClient).toBeDefined()

    const result = await inMemoryClient!.query('SELECT 1')
    expect(result.rows).toEqual([{ column: 1 }])

    await inMemoryClient!.end()
  })

  it('should select records with a WHERE clause', async () => {
    const inMemoryClient = await WabeInMemoryPostgres()

    // Create the table
    await inMemoryClient!.query(`
            CREATE TABLE users (
                id SERIAL PRIMARY KEY,
                name VARCHAR(255)
            )
        `)

    // Insert multiple records
    await inMemoryClient!.query(`
            INSERT INTO users (name) 
            VALUES 
            ('John Doe'),
            ('Jane Doe'),
            ('Alice Johnson')
        `)

    // Retrieve records with a WHERE clause
    const result = await inMemoryClient!.query(
      `SELECT name FROM users WHERE name = 'Jane Doe'`,
    )

    // Verify the result
    expect(result.rows.length).toBe(1) // Should return exactly 1 record
    expect(result.rows[0].name).toBe('Jane Doe')

    await inMemoryClient!.end()
  })

  it('should select all records', async () => {
    const inMemoryClient = await WabeInMemoryPostgres()

    // Create the table
    await inMemoryClient!.query(`
            CREATE TABLE users (
                id SERIAL PRIMARY KEY,
                name VARCHAR(255)
            )
        `)

    // Insert multiple records
    await inMemoryClient!.query(`
            INSERT INTO users (name) 
            VALUES 
            ('John Doe'),
            ('Jane Doe'),
            ('Alice Johnson')
        `)

    // Select all records
    const result = await inMemoryClient!.query(`SELECT name FROM users`)

    // Verify the result
    expect(result.rows.length).toBe(3) // Should return 3 records
    expect(result.rows[0].name).toBe('John Doe')
    expect(result.rows[1].name).toBe('Jane Doe')
    expect(result.rows[2].name).toBe('Alice Johnson')

    await inMemoryClient!.end()
  })

  it('should create a table and verify its existence', async () => {
    const inMemoryClient = await WabeInMemoryPostgres()

    // Create the table
    await inMemoryClient!.query(
      `CREATE TABLE test_table (id SERIAL PRIMARY KEY, name VARCHAR(255))`,
    )

    // Check if the table exists
    const result = await inMemoryClient!.query(`
            SELECT EXISTS (
                SELECT 1 FROM information_schema.tables 
                WHERE table_name = 'test_table'
            );
        `)

    expect(result.rows[0].exists).toBe(true) // Table should exist

    await inMemoryClient!.end()
  })

  it('should insert and retrieve data into/from the wabe table in the in-memory database', async () => {
    // Setup the in-memory Postgres database
    const inMemoryClient = await WabeInMemoryPostgres() // Assume this sets up the schema
    expect(inMemoryClient).toBeDefined()

    // Define the table schema in the in-memory database
    await inMemoryClient!.query(`
            CREATE TABLE wabe (
                id SERIAL PRIMARY KEY,
                wabe_project_name VARCHAR(255),
                email VARCHAR(255) UNIQUE
            );
        `)

    // Insert data into the wabe table
    const insertQuery = `
            INSERT INTO wabe (wabe_project_name, email)
            VALUES ('Test Project', 'test@example.com')
            RETURNING *;
        `
    const insertResult = await inMemoryClient!.query(insertQuery)

    // Verify that one row was inserted
    expect(insertResult.rows.length).toBe(1)
    expect(insertResult.rows[0].wabe_project_name).toBe('Test Project')
    expect(insertResult.rows[0].email).toBe('test@example.com')

    // Test selecting the inserted data from the wabe table
    const selectQuery = 'SELECT * FROM wabe WHERE email = $1;'
    const selectResult = await inMemoryClient!.query(selectQuery, [
      'test@example.com',
    ])

    // Verify the selected data matches what was inserted
    expect(selectResult.rows.length).toBe(1)
    expect(selectResult.rows[0].wabe_project_name).toBe('Test Project')
    expect(selectResult.rows[0].email).toBe('test@example.com')

    // End the client connection after the test
    await inMemoryClient!.end()
  })

  it('should create, insert, and retrieve a row in the wabe table', async () => {
    const inMemoryClient = await WabeInMemoryPostgres()

    await inMemoryClient!.query(`
            CREATE TABLE IF NOT EXISTS wabe (
                id INTEGER,
                wabe_project_name TEXT,
                email TEXT
            );
        `)

    let nextId = 1

    const insertQuery = `
            INSERT INTO wabe (id, wabe_project_name, email)
            VALUES ($1, $2, $3)
            RETURNING *;
        `
    const insertResult = await inMemoryClient!.query(insertQuery, [
      nextId++,
      'Test Project',
      'test@example.com',
    ])

    expect(insertResult.rows[0]).toBeDefined()
    expect(insertResult.rows[0].wabe_project_name).toBe('Test Project')
    expect(insertResult.rows[0].email).toBe('test@example.com')

    const selectQuery = 'SELECT * FROM wabe WHERE email = $1;'
    const selectResult = await inMemoryClient!.query(selectQuery, [
      'test@example.com',
    ])

    expect(selectResult.rows.length).toBe(1)
    expect(selectResult.rows[0].wabe_project_name).toBe('Test Project')

    await inMemoryClient!.end()
  })

  it('should allow concurrent connections to separate in-memory databases', async () => {
    const client1 = await WabeInMemoryPostgres()
    const client2 = await WabeInMemoryPostgres()

    await client1!.query(
      `CREATE TABLE test (id SERIAL PRIMARY KEY, name VARCHAR(255))`,
    )
    await client2!.query(
      `CREATE TABLE test (id SERIAL PRIMARY KEY, name VARCHAR(255))`,
    )

    await client1!.query(`INSERT INTO test (name) VALUES ('Client1')`)
    await client2!.query(`INSERT INTO test (name) VALUES ('Client2')`)

    const result1 = await client1!.query(`SELECT * FROM test`)
    const result2 = await client2!.query(`SELECT * FROM test`)

    expect(result1.rows.length).toBe(1)
    expect(result1.rows[0].name).toBe('Client1')
    expect(result2.rows.length).toBe(1)
    expect(result2.rows[0].name).toBe('Client2')

    await client1!.end()
    await client2!.end()
  })

  it('should not persist schema between tests', async () => {
    const inMemoryClient = await WabeInMemoryPostgres()
    await inMemoryClient!.query(
      `CREATE TABLE temp_table (id SERIAL PRIMARY KEY)`,
    )

    const checkTable = await inMemoryClient!.query(
      `SELECT * FROM information_schema.tables WHERE table_name = 'temp_table'`,
    )
    expect(checkTable.rows.length).toBe(1)

    await inMemoryClient!.end()

    // In the next connection, temp_table should not exist
    const newInMemoryClient = await WabeInMemoryPostgres()
    const checkTableAgain = await newInMemoryClient!.query(
      `SELECT * FROM information_schema.tables WHERE table_name = 'temp_table'`,
    )
    expect(checkTableAgain.rows.length).toBe(0)

    await newInMemoryClient!.end()
  })

  it('should enforce unique constraints', async () => {
    const inMemoryClient = await WabeInMemoryPostgres()
    await inMemoryClient!.query(`
            CREATE TABLE unique_test (
                id SERIAL PRIMARY KEY,
                email VARCHAR(255) UNIQUE
            );
        `)

    await inMemoryClient!.query(
      `INSERT INTO unique_test (email) VALUES ('unique@example.com')`,
    )

    await expect(
      inMemoryClient!.query(
        `INSERT INTO unique_test (email) VALUES ('unique@example.com')`,
      ),
    ).rejects.toThrow()

    await inMemoryClient!.end()
  })

  it('should persist data across queries within the same test', async () => {
    const inMemoryClient = await WabeInMemoryPostgres()

    await inMemoryClient!.query(
      `CREATE TABLE persistence_test (id SERIAL PRIMARY KEY, name VARCHAR(255))`,
    )
    await inMemoryClient!.query(
      `INSERT INTO persistence_test (name) VALUES ('Persistent Entry')`,
    )

    const result = await inMemoryClient!.query(
      `SELECT * FROM persistence_test WHERE name = 'Persistent Entry'`,
    )
    expect(result.rows.length).toBe(1)
    expect(result.rows[0].name).toBe('Persistent Entry')

    await inMemoryClient!.end()
  })

  it('should respect case sensitivity in column names', async () => {
    const inMemoryClient = await WabeInMemoryPostgres()
    await inMemoryClient!.query(`
            CREATE TABLE case_test (
                "CaseSensitiveName" VARCHAR(255)
            );
        `)

    await inMemoryClient!.query(
      `INSERT INTO case_test ("CaseSensitiveName") VALUES ('Test Value')`,
    )
    const result = await inMemoryClient!.query(
      `SELECT "CaseSensitiveName" FROM case_test`,
    )
    expect(result.rows[0].CaseSensitiveName).toBe('Test Value')

    // This query should fail because it uses the wrong case
    await expect(
      inMemoryClient!.query(`SELECT casesensitivename FROM case_test`),
    ).rejects.toThrow()

    await inMemoryClient!.end()
  })
  it('should handle large amounts of data', async () => {
    const inMemoryClient = await WabeInMemoryPostgres()
    await inMemoryClient!.query(
      `CREATE TABLE large_data_test (id SERIAL PRIMARY KEY, value VARCHAR(255))`,
    )

    const insertPromises = []
    for (let i = 0; i < 1000; i++) {
      insertPromises.push(
        inMemoryClient!.query(
          `INSERT INTO large_data_test (value) VALUES ($1)`,
          [`Value ${i}`],
        ),
      )
    }
    await Promise.all(insertPromises)

    const countResult = await inMemoryClient!.query(
      `SELECT COUNT(*) FROM large_data_test`,
    )
    expect(parseInt(countResult.rows[0].count)).toBe(1000)

    await inMemoryClient!.end()
  })

  it('should insert and retrieve multiple rows', async () => {
    const inMemoryClient = await WabeInMemoryPostgres()
    await inMemoryClient!.query(
      `CREATE TABLE items (id SERIAL PRIMARY KEY, name VARCHAR(255))`,
    )

    // Insert multiple rows
    await inMemoryClient!.query(
      `INSERT INTO items (name) VALUES ('Item 1'), ('Item 2'), ('Item 3')`,
    )

    // Retrieve and verify the rows
    const result = await inMemoryClient!.query(`SELECT * FROM items`)
    expect(result.rows.length).toBe(3)
    expect(result.rows[0].name).toBe('Item 1')
    expect(result.rows[1].name).toBe('Item 2')
    expect(result.rows[2].name).toBe('Item 3')

    await inMemoryClient!.end()
  })

  it('should delete data from the table', async () => {
    const inMemoryClient = await WabeInMemoryPostgres()
    await inMemoryClient!.query(
      `CREATE TABLE deletable (id SERIAL PRIMARY KEY, name VARCHAR(255))`,
    )

    // Insert a row
    await inMemoryClient!.query(
      `INSERT INTO deletable (name) VALUES ('Deletable Item')`,
    )

    // Delete the row
    await inMemoryClient!.query(
      `DELETE FROM deletable WHERE name = 'Deletable Item'`,
    )

    // Verify that no rows remain
    const result = await inMemoryClient!.query(
      `SELECT * FROM deletable WHERE name = 'Deletable Item'`,
    )
    expect(result.rows.length).toBe(0) // Should be empty after deletion

    await inMemoryClient!.end()
  })

  it('should update data in the table', async () => {
    const inMemoryClient = await WabeInMemoryPostgres()
    await inMemoryClient!.query(
      `CREATE TABLE updatable (id SERIAL PRIMARY KEY, name VARCHAR(255))`,
    )

    // Insert a row
    await inMemoryClient!.query(
      `INSERT INTO updatable (name) VALUES ('Original Name')`,
    )

    // Update the row
    await inMemoryClient!.query(
      `UPDATE updatable SET name = 'Updated Name' WHERE name = 'Original Name'`,
    )

    // Verify the update
    const result = await inMemoryClient!.query(
      `SELECT name FROM updatable WHERE name = 'Updated Name'`,
    )
    expect(result.rows.length).toBe(1)
    expect(result.rows[0].name).toBe('Updated Name')

    await inMemoryClient!.end()
  })

  it('should rollback changes in a nested transaction', async () => {
    const inMemoryClient = await WabeInMemoryPostgres()
    await inMemoryClient!.query(
      `CREATE TABLE nested_transaction_test (id SERIAL PRIMARY KEY, name VARCHAR(255))`,
    )

    await inMemoryClient!.query('BEGIN')
    try {
      // Insert a row in outer transaction
      await inMemoryClient!.query(
        `INSERT INTO nested_transaction_test (name) VALUES ('Outer Transaction')`,
      )

      // Start an inner transaction (sub-transaction)
      await inMemoryClient!.query('SAVEPOINT sp1')
      try {
        await inMemoryClient!.query(
          `INSERT INTO nested_transaction_test (name) VALUES ('Inner Transaction')`,
        )
        throw new Error('Simulated error to test rollback')
      } catch (error) {
        await inMemoryClient!.query('ROLLBACK TO SAVEPOINT sp1') // Rollback inner transaction only
      }

      await inMemoryClient!.query('COMMIT') // Commit outer transaction
    } catch (error) {
      await inMemoryClient!.query('ROLLBACK')
    }

    // Verify that only the outer transaction data exists
    const result = await inMemoryClient!.query(
      `SELECT name FROM nested_transaction_test`,
    )
    expect(result.rows.length).toBe(1)
    expect(result.rows[0].name).toBe('Outer Transaction')

    await inMemoryClient!.end()
  })

  it('should insert and retrieve a single row', async () => {
    const inMemoryClient = await WabeInMemoryPostgres()

    // Create the table
    await inMemoryClient!.query(
      `CREATE TABLE users (id SERIAL PRIMARY KEY, name VARCHAR(255))`,
    )

    // Insert a single row
    await inMemoryClient!.query(`INSERT INTO users (name) VALUES ('John Doe')`)

    // Retrieve the inserted row
    const result = await inMemoryClient!.query(
      `SELECT name FROM users WHERE name = 'John Doe'`,
    )

    // Verify that the row was inserted
    expect(result.rows.length).toBe(1)
    expect(result.rows[0].name).toBe('John Doe')

    await inMemoryClient!.end()
  })

  it('should insert a row, delete it, and verify it is deleted', async () => {
    const inMemoryClient = await WabeInMemoryPostgres()

    // Create the table
    await inMemoryClient!.query(
      `CREATE TABLE users (id SERIAL PRIMARY KEY, name VARCHAR(255))`,
    )

    // Insert a row
    await inMemoryClient!.query(`INSERT INTO users (name) VALUES ('Jane Doe')`)

    // Delete the row
    await inMemoryClient!.query(`DELETE FROM users WHERE name = 'Jane Doe'`)

    // Verify the row is deleted
    const result = await inMemoryClient!.query(
      `SELECT name FROM users WHERE name = 'Jane Doe'`,
    )

    expect(result.rows.length).toBe(0) // No rows should be returned

    await inMemoryClient!.end()
  })

  it('should insert a row, update it, and verify the update', async () => {
    const inMemoryClient = await WabeInMemoryPostgres()

    // Create the table
    await inMemoryClient!.query(
      `CREATE TABLE users (id SERIAL PRIMARY KEY, name VARCHAR(255))`,
    )

    // Insert a row
    await inMemoryClient!.query(`INSERT INTO users (name) VALUES ('Alice')`)

    // Update the row
    await inMemoryClient!.query(
      `UPDATE users SET name = 'Alice Smith' WHERE name = 'Alice'`,
    )

    // Retrieve the updated row
    const result = await inMemoryClient!.query(
      `SELECT name FROM users WHERE name = 'Alice Smith'`,
    )

    // Verify that the row was updated
    expect(result.rows.length).toBe(1) // Only one row should exist
    expect(result.rows[0].name).toBe('Alice Smith') // Name should be updated

    await inMemoryClient!.end()
  })

  it('should enforce unique constraint on a column', async () => {
    const inMemoryClient = await WabeInMemoryPostgres()

    // Create the table with a unique constraint on the 'email' column
    await inMemoryClient!.query(
      `CREATE TABLE users (id SERIAL PRIMARY KEY, name VARCHAR(255), email VARCHAR(255) UNIQUE)`,
    )

    // Insert a row
    await inMemoryClient!.query(
      `INSERT INTO users (name, email) VALUES ('Charlie', 'charlie@example.com')`,
    )

    // Try inserting another row with the same email (should fail due to the unique constraint)
    let errorOccurred = false
    try {
      await inMemoryClient!.query(
        `INSERT INTO users (name, email) VALUES ('Charlie Duplicate', 'charlie@example.com')`,
      )
    } catch (error) {
      errorOccurred = true // The error should be caught here due to the unique constraint violation
    }

    // Verify that an error occurred (should not allow duplicate emails)
    expect(errorOccurred).toBe(true)

    // Clean up
    await inMemoryClient!.end()
  })

  it('should count the number of rows in a table', async () => {
    const inMemoryClient = await WabeInMemoryPostgres()

    // Create the table
    await inMemoryClient!.query(
      `CREATE TABLE users (id SERIAL PRIMARY KEY, name VARCHAR(255))`,
    )

    // Insert some rows
    await inMemoryClient!.query(
      `INSERT INTO users (name) VALUES ('John'), ('Jane'), ('Alice')`,
    )

    // Count the rows in the table
    const result = await inMemoryClient!.query(`SELECT COUNT(*) FROM users`)

    // Verify that the number of rows is 3
    expect(parseInt(result.rows[0].count)).toBe(3) // Should be 3 after inserting three users

    await inMemoryClient!.end()
  })

  it('should handle NULL values in columns correctly', async () => {
    const inMemoryClient = await WabeInMemoryPostgres()

    // Create the table
    await inMemoryClient!.query(
      `CREATE TABLE users (id SERIAL PRIMARY KEY, name VARCHAR(255), email VARCHAR(255))`,
    )

    // Insert a row with a NULL email
    await inMemoryClient!.query(
      `INSERT INTO users (name, email) VALUES ('David', NULL)`,
    )

    // Retrieve the row where email is NULL
    const result = await inMemoryClient!.query(
      `SELECT email FROM users WHERE name = 'David'`,
    )

    // Verify that the email is NULL
    expect(result.rows[0].email).toBeNull()

    await inMemoryClient!.end()
  })

  it('should join two tables and retrieve related data', async () => {
    const inMemoryClient = await WabeInMemoryPostgres()

    // Create two tables: users and orders
    await inMemoryClient!.query(`
            CREATE TABLE users (
                id SERIAL PRIMARY KEY,
                name VARCHAR(255)
            )
        `)

    await inMemoryClient!.query(`
            CREATE TABLE orders (
                id SERIAL PRIMARY KEY,
                user_id INTEGER,
                amount DECIMAL,
                FOREIGN KEY (user_id) REFERENCES users(id)
            )
        `)

    // Insert users
    await inMemoryClient!.query(
      `INSERT INTO users (name) VALUES ('John'), ('Jane')`,
    )

    // Insert orders for the users
    await inMemoryClient!.query(
      `INSERT INTO orders (user_id, amount) VALUES (1, 100.50), (2, 250.75)`,
    )

    // Perform a JOIN between users and orders to get the user's name and their order amounts
    const result = await inMemoryClient!.query(`
            SELECT users.name, orders.amount
            FROM users
            JOIN orders ON users.id = orders.user_id
        `)

    // Verify that the data matches the expected result
    expect(result.rows.length).toBe(2) // Should return 2 rows
    expect(result.rows[0].name).toBe('John')
    expect(result.rows[0].amount).toBe(100.5)
    expect(result.rows[1].name).toBe('Jane')
    expect(result.rows[1].amount).toBe(250.75)

    await inMemoryClient!.end()
  })

  it('should group by a column and aggregate data', async () => {
    const inMemoryClient = await WabeInMemoryPostgres()

    // Create a table for orders
    await inMemoryClient!.query(`
            CREATE TABLE orders (
                id SERIAL PRIMARY KEY,
                user_id INTEGER,
                amount DECIMAL
            )
        `)

    // Insert some rows
    await inMemoryClient!.query(`
            INSERT INTO orders (user_id, amount) 
            VALUES 
            (1, 100.50), 
            (2, 250.75), 
            (1, 300.25), 
            (2, 50.50),
            (3, 150.00)
        `)

    // Perform a GROUP BY to get the total amount spent per user
    const result = await inMemoryClient!.query(`
            SELECT user_id, COUNT(*) AS order_count, SUM(amount) AS total_spent
            FROM orders
            GROUP BY user_id
            ORDER BY user_id
        `)

    // Verify the results of the aggregation
    expect(result.rows.length).toBe(3) // Three unique user_id's
    expect(result.rows[0].user_id).toBe(1)
    expect(result.rows[0].order_count).toBe(2) // Two orders for user 1
    expect(result.rows[0].total_spent).toBe(400.75) // Sum of orders for user 1

    expect(result.rows[1].user_id).toBe(2)
    expect(result.rows[1].order_count).toBe(2) // Two orders for user 2
    expect(result.rows[1].total_spent).toBe(301.25) // Sum of orders for user 2

    expect(result.rows[2].user_id).toBe(3)
    expect(result.rows[2].order_count).toBe(1) // One order for user 3
    expect(result.rows[2].total_spent).toBe(150.0) // Sum of orders for user 3

    await inMemoryClient!.end()
  })

  it('should left join and return rows even with no matching data', async () => {
    const inMemoryClient = await WabeInMemoryPostgres()

    // Create users and orders tables
    await inMemoryClient!.query(`
            CREATE TABLE users (
                id SERIAL PRIMARY KEY,
                name VARCHAR(255)
            )
        `)

    await inMemoryClient!.query(`
            CREATE TABLE orders (
                id SERIAL PRIMARY KEY,
                user_id INTEGER,
                amount DECIMAL,
                FOREIGN KEY (user_id) REFERENCES users(id)
            )
        `)

    // Insert users
    await inMemoryClient!.query(
      `INSERT INTO users (name) VALUES ('John'), ('Jane'), ('Alice')`,
    )

    // Insert only one order for John
    await inMemoryClient!.query(
      `INSERT INTO orders (user_id, amount) VALUES (1, 100.50)`,
    )

    // Perform a LEFT JOIN between users and orders
    const result = await inMemoryClient!.query(`
            SELECT users.name, orders.amount
            FROM users
            LEFT JOIN orders ON users.id = orders.user_id
        `)

    // Verify the results: John should have an order, but Jane and Alice should have null amounts
    expect(result.rows.length).toBe(3) // Three users total
    expect(result.rows[0].name).toBe('John')
    expect(result.rows[0].amount).toBe(100.5)
    expect(result.rows[1].name).toBe('Jane')
    expect(result.rows[1].amount).toBeNull()
    expect(result.rows[2].name).toBe('Alice')
    expect(result.rows[2].amount).toBeNull()

    await inMemoryClient!.end()
  })

  it('should inner join with multiple conditions and return correct results', async () => {
    const inMemoryClient = await WabeInMemoryPostgres()

    // Create users and orders tables
    await inMemoryClient!.query(`
            CREATE TABLE users (
                id SERIAL PRIMARY KEY,
                name VARCHAR(255),
                city VARCHAR(255)
            )
        `)

    await inMemoryClient!.query(`
            CREATE TABLE orders (
                id SERIAL PRIMARY KEY,
                user_id INTEGER,
                amount DECIMAL,
                status VARCHAR(50),
                FOREIGN KEY (user_id) REFERENCES users(id)
            )
        `)

    // Insert users
    await inMemoryClient!.query(
      `INSERT INTO users (name, city) VALUES ('John', 'New York'), ('Jane', 'Boston'), ('Alice', 'Chicago')`,
    )

    // Insert orders
    await inMemoryClient!.query(`
            INSERT INTO orders (user_id, amount, status) 
            VALUES 
            (1, 100.50, 'completed'),
            (2, 150.75, 'pending'),
            (1, 200.25, 'completed')
        `)

    // Perform INNER JOIN with multiple conditions
    const result = await inMemoryClient!.query(`
            SELECT users.name, users.city, orders.amount, orders.status
            FROM users
            INNER JOIN orders 
            ON users.id = orders.user_id
            AND orders.status = 'completed'
        `)

    // Verify the results: Only John should have completed orders
    expect(result.rows.length).toBe(2) // Two completed orders for John
    expect(result.rows[0].name).toBe('John')
    expect(result.rows[0].amount).toBe(100.5)
    expect(result.rows[0].status).toBe('completed')
    expect(result.rows[1].name).toBe('John')
    expect(result.rows[1].amount).toBe(200.25)
    expect(result.rows[1].status).toBe('completed')

    await inMemoryClient!.end()
  })
})

// describe("Actual PostgreSQL Client Tests", () => {

//     it('should use default loopback address 127.0.0.1', async () => {
//         const changedAddress = '127.0.0.1';
//         const client = await getPostgresClient(changedAddress);

//         expect(client).toBeDefined();
//     });

//     it('should check if real instance PostgreSQL is running on the default port', async () => {
//         const port = 5432; // Default PostgreSQL port
//         const user = 'your_db_user'; // Replace with actual PostgreSQL username
//         const host = 'localhost'; // Assuming PostgreSQL is running locally
//         const database = 'your_database'; // Replace with actual database name
//         const password = 'your_db_password'; // Replace with actual password

//             // Call getPostgresClient with real PostgreSQL credentials
//             const client = await testPostgresClient() as PgClient

//             // Ensure the client is defined (connected successfully)
//             expect(client).toBeDefined();

//             // Optionally, check if the client can perform a simple query
//             const result = await client!.query('SELECT NOW();'); // Example query
//             expect(result).toBeDefined();

//             // Clean up: close the connection
//             await client!.end();

//     });

//     it('should get a real PostgreSQL client in production', async () => {
//         // process.env.NODE_ENV = 'production'; // Set environment to production

//         // Create a more complete mockPgClient
//         const mockPgClient = {
//             connect: Bun.connect // Mock connect
//             end:  Bun.connect ,
//             query: jest.fn(), // Add any other methods you plan to use
//             release: jest.fn(),
//         } as unknown as PgClient; // Force type casting to PgClient

//         // Mock getPostgresClient to return the mockPgClient
//         const getPostgresClient = jest.fn().mockResolvedValue(mockPgClient);

//         // Call the function
//         const client = await testPostgresClient() as PgClient

//         // Ensure client is not undefined
//         expect(client).toBeDefined();

//         // Debugging step: Check if client is the mockPgClient
//         expect(client).toEqual(mockPgClient); // This ensures we're getting the mock back

//         // Manually call connect if necessary
//         await client.connect(); // Manually trigger the connect call

//         // Check if the mockPgClient.connect method was called
//         expect(mockPgClient.connect).toHaveBeenCalledTimes(1);

//         // Cleanup
//         jest.restoreAllMocks();
//     });

//     it('should create the wabe table and retrieve the inserted wabe project using a real postgres instance', async () => {
//         // process.env.NODE_ENV = 'production';

//         console.log(process.env.NODE_ENV)

//         const client = await testPostgresClient() as PgClient

//         expect(client).toBeDefined();

//         if (client) {
//             const createTableQuery = `
//                 CREATE TABLE IF NOT EXISTS wabe (
//                     id SERIAL PRIMARY KEY,
//                     wabe_project_name VARCHAR(255) NOT NULL,
//                     email VARCHAR(255) UNIQUE NOT NULL
//                 );
//             `;
//             await client.query(createTableQuery);

//             // Insert a new wabe project
//             const insertQuery = `
//                 INSERT INTO wabe (wabe_project_name, email)
//                 VALUES ($1, $2)
//                 RETURNING *;
//             `;
//             const values = ['Test Project', 'test2@example.com'];
//             const insertResult = await client.query(insertQuery, values);

//             // Ensure that the insert was successful
//             expect(insertResult.rows.length).toBe(1);
//             expect(insertResult.rows[0].wabe_project_name).toBe('Test Project');
//             expect(insertResult.rows[0].email).toBe('test2@example.com');

//             // Select the inserted project by email
//             const selectQuery = `SELECT * FROM wabe WHERE email = $1;`;
//             const selectValues = ['test2@example.com'];
//             const result = await client.query(selectQuery, selectValues);

//             // Ensure one row was retrieved
//             expect(result.rows.length).toBe(1);

//             // Verify the wabe_project_name and email of the retrieved row
//             expect(result.rows[0].wabe_project_name).toBe('Test Project');
//             expect(result.rows[0].email).toBe('test2@example.com');
//         }

//     });

// //     it('should connect to PostgreSQL using a real connection string (URI)', async () => {
// //         // Define the PostgreSQL connection string
// //         // process.env.NODE_ENV = 'production';

// //             // Call getPostgresClient with the connection string
// //             const client = await testPostgresClient() as PgClient

// //             // Ensure the client is defined (connected successfully)
// //             expect(client).toBeDefined();

// //             // Optionally, check if the client can perform a simple query
// //             const result = await client!.query('SELECT NOW();'); // Example query
// //             expect(result).toBeDefined();

// //             // Clean up: close the connection
// //             await client!.end();
// //     });

// //     it('should connect to PostgreSQL using a real connection string (URI) with the env', async () => {
// //         // Define the PostgreSQL connection string
// //         // process.env.NODE_ENV = 'production';

// //             // Call getPostgresClient with the connection string
// //             const client = await testPostgresClient() as PgClient

// //             // Ensure the client is defined (connected successfully)
// //             expect(client).toBeDefined();

// //             // Optionally, check if the client can perform a simple query
// //             const result = await client!.query('SELECT NOW();'); // Example query
// //             expect(result).toBeDefined();

// //             // Clean up: close the connection
// //             await client!.end();
// //     });

// // });

// // // describe('getPostgresClient - Environment Variables', () => {

// // //     afterEach(() => {
// // //         // Restore any environment variables that were mocked or changed
// // //         jest.restoreAllMocks();
// // //         delete process.env.DATABASE_URL;
// // //         delete process.env.DB_USER;
// // //         delete process.env.DB_HOST;
// // //         delete process.env.DB_NAME;
// // //         delete process.env.DB_PASSWORD;
// // //         delete process.env.DB_PORT;
// // //         process.env.NODE_ENV = 'test'; // Reset to default
// // //     });

// // //     it('should use DATABASE_URL  with env as staging', async () => {
// // //                // Define the PostgreSQL connection string
// // //                 // process.env.NODE_ENV = 'staging';

// // //                     // Call getPostgresClient with the connection string
// // //                     const client = await testPostgresClient() as PgClient

// // //                     expect(client).toBeDefined();

// // //                     // Optionally, check if the client can perform a simple query
// // //                     const result = await client!.query('SELECT NOW();'); // Example query
// // //                     expect(result).toBeDefined();

// //                     // Clean up: close the connection
// //                     await client!.end();
// //     });

// //     it('should use individual environment variables if DATABASE_URL is not set', async () => {
// //         // Set environment variables directly in the test
// //         // process.env.NODE_ENV = 'production'; // Set environment to production
// //         process.env.DB_USER = 'postgres';
// //         process.env.DB_HOST = 'localhost';
// //         process.env.DB_NAME = 'postgres';
// //         const user_password  =  process.env.DB_PASSWORD = 'password';
// //         process.env.DB_PORT = '5432';

// //         const mockConnect = spyOn(PgClient.prototype, 'connect').mockImplementation(async () => {});

// //         const client = await getPostgresClient(); // This should now get a real PgClient

// //         expect(client).toBeDefined();
// //         expect(mockConnect).toHaveBeenCalled(); // Ensure connect was called
// //         expect(client).toBeInstanceOf(PgClient); // Expect PgClient now
// //         expect(client!.user).toBe('stephenawuah'); // Check against hardcoded value
// //         expect(client!.host).toBe('localhost'); // Check against hardcoded value
// //         expect(client!.database).toBe('stephenawuah'); // Check against hardcoded value
// //         expect(user_password).toBe('password'); // Check against hardcoded value
// //         expect(client!.port).toBe(5432); // Check against hardcoded value

// //         await client!.end();
// //     });
// // });
