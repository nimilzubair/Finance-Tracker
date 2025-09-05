const { Pool } = require('pg');

// Explicit connection details - copy EXACTLY from Neon
const config = {
  user: "neondb_owner",
  password: "npg_nau36EOgmUNK",
  host: "ep-round-king-adr18gxt-pooler.c-2.us-east-1.aws.neon.tech",
  database: "neondb",
  port: 5432,
  ssl: {
    rejectUnauthorized: false // This is important for Neon
  }
};

console.log('Testing connection to Neon database...');

const pool = new Pool(config);

async function test() {
  let client;
  try {
    client = await pool.connect();
    console.log('✅ Connected to Neon successfully!');
    
    // Test a simple query
    const result = await client.query('SELECT version()');
    console.log('📊 PostgreSQL version:', result.rows[0].version);
    
  } catch (error) {
    console.log('❌ Connection failed:', error.message);
    console.log('Error details:', error);
  } finally {
    if (client) client.release();
    await pool.end();
    console.log('Connection closed.');
  }
}

test();