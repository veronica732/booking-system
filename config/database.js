const { Pool } = require('pg');
require('dotenv').config();

let poolConfig;

// ALWAYS use DATABASE_URL if it exists (Render provides this)
if (process.env.DATABASE_URL) {
  console.log('Using DATABASE_URL for PostgreSQL connection');
  poolConfig = {
    connectionString: process.env.DATABASE_URL,
    ssl: {
      rejectUnauthorized: false
    }
  };
} else {
  // Local development only
  console.log('Using local PostgreSQL configuration');
  poolConfig = {
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'booking_system',
    port: process.env.DB_PORT || 5432,
    max: 10,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
  };
}

// Create PostgreSQL connection pool
const pool = new Pool(poolConfig);

// Test connection
pool.on('connect', () => {
  console.log('✅ PostgreSQL pool connected');
});

pool.on('error', (err) => {
  console.error('❌ PostgreSQL pool error:', err);
});

module.exports = { pool };
