const { Pool } = require('pg');
require('dotenv').config();

// Create PostgreSQL connection pool
const pool = new Pool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    port: process.env.DB_PORT || 5432,
    max: 10, // maximum number of clients in the pool
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
});

// Test connection function
async function testConnection() {
    try {
        const client = await pool.connect();
        const result = await client.query('SELECT NOW() as current_time, 1 + 1 as test_result');
        client.release();
        console.log('✅ PostgreSQL connection successful!');
        console.log('   Current time:', result.rows[0].current_time);
        console.log('   Test calculation:', result.rows[0].test_result);
        return true;
    } catch (error) {
        console.error('❌ PostgreSQL connection failed:', error.message);
        console.error('   Error details:', error);
        return false;
    }
}

// Function to check if tables exist
async function checkTables() {
    try {
        const client = await pool.connect();
        const result = await client.query(`
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public'
            ORDER BY table_name;
        `);
        client.release();
        
        console.log('\n📊 Existing tables in database:');
        if (result.rows.length === 0) {
            console.log('   No tables found. You need to create your tables.');
        } else {
            result.rows.forEach(row => {
                console.log('   -', row.table_name);
            });
        }
        return result.rows;
    } catch (error) {
        console.error('Error checking tables:', error.message);
        return [];
    }
}

module.exports = {
    pool,
    testConnection,
    checkTables
};
