// lib/db.ts
import { Pool } from 'pg';

// Neon.tech requires SSL connection
const pool = new Pool({
  connectionString: process.env.POSTGRES_URL,
  ssl: {
    rejectUnauthorized: false // Required for Neon.tech
  }
});

// Test connection on startup
pool.on('connect', () => {
  console.log('Connected to Neon.tech database');
});

pool.on('error', (err) => {
  console.error('Database connection error:', err);
});

export default pool;