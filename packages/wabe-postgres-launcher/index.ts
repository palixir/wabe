import { newDb } from 'pg-mem';
import tcpPortUsed from 'tcp-port-used';
import { Client as PgClient } from 'pg'; // For real PostgreSQL in production

// Function to set up the in-memory PostgreSQL using pg-mem
export const setupInMemoryPostgres = async (): Promise<PgClient | undefined> => {
    const port = 5432;
    const universalPort = '127.0.0.1'; // Default to '127.0.0.1' if no port/loopback address is provided

    const isPortInUse = await tcpPortUsed.check(port, universalPort);

    if(isPortInUse){
        console.info(`in-mem port is active`)
        return
    }
    try {
        
        const db = await newDb();
        const adapters = db.adapters;

        // Bind the server to the in-memory database
        await adapters.bindServer();


        // Get a connected PostgreSQL client using the 'createPg' method
        const { Client } = adapters.createPg();
        const client = new Client();
        await client.connect();
        await client.query('SELECT NOW();');

        return client;

    } catch (error) {
        console.error('Error setting up in-memory PostgreSQL:', error);
        throw error;
    }
};

// Utility to get the correct PostgreSQL client based on the environment
export const getPostgresClient = async (
    db_user?: string,
    host?: string,
    database?: string,
    password?: string,
    port?: number,
    connection_string? : string 
    
): Promise<PgClient | undefined> => {
   
    const postgresConnectionString = connection_string 

    if (postgresConnectionString) {

        const client = postgresConnectionString
            ? new PgClient(postgresConnectionString) // Use URI if available
            : new PgClient({
                user: db_user ,
                host:  host,
                database:  database,
                password:  password,
                port: port,
            });

        try {
            await client.connect();
            console.info('Connected to real PostgreSQL instance');
            return client;
        } catch (error) {
            console.error('Failed to connect to PostgreSQL:', error);
            throw error;
        }
    } else {
        return await setupInMemoryPostgres();
    }
};


//for testing purposes
export const testPostgresClient = async (): Promise<PgClient | undefined> => {
    return await setupInMemoryPostgres();
};




// Run the client setup function
getPostgresClient().then(client => {
    if (client) {
        console.log('PostgreSQL client is ready.');
    } else {
        console.log('No PostgreSQL client initialized.');
    }
}).catch(error => {
    console.error('Error during PostgreSQL setup:', error);
});
