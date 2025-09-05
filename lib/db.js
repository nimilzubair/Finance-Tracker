import { Pool } from 'pg';

// Create a single pool instance that gets reused
const pool = new Pool({
  connectionString: process.env.POSTGRES_URL
});
export default pool;