import { setupInMemoryPostgres } from './index.ts'; // Import the setup function

(async () => {
    try {
        // Initialize the in-memory PostgreSQL
        const client = await setupInMemoryPostgres();
        
        if (!client) {
            console.error('Failed to initialize in-memory PostgreSQL.');
            return;
        }

        console.log('In-memory PostgreSQL initialized successfully.');

        // Run a test query to check if we can insert data
        const insertQuery = `
            INSERT INTO wabe (wabe_project_name, email) 
            VALUES ('Test Project', 'test@example.com') 
            RETURNING *;
        `;
        const result = await client.query(insertQuery);

        // Check if the query was successful
        console.log('Inserted row:', result.rows[0]);

        // Now run a select query to confirm data exists
        const selectQuery = 'SELECT * FROM wabe;';
        const selectResult = await client.query(selectQuery);

        console.log('Data in wabe table:', selectResult.rows);

        // Close the client connection (only once)
        await client.end();
        console.log('In-memory PostgreSQL connection closed.');

    } catch (error) {
        console.error('Error during in-memory PostgreSQL test:', error);
    }
})();
