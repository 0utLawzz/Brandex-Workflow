import { Pool } from 'pg';

let pool: Pool | null = null;

if (process.env.DATABASE_URL) {
  pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
  });
}

export async function query(text: string, params?: any[]) {
  if (!pool) {
    throw new Error('Database not configured. Please set DATABASE_URL environment variable.');
  }
  const client = await pool.connect();
  try {
    return await client.query(text, params);
  } finally {
    client.release();
  }
}

export async function initDB() {
  if (!pool) return;
  try {
    await query(`
      CREATE TABLE IF NOT EXISTS trademark_records (
        id SERIAL PRIMARY KEY,
        serial_no VARCHAR(50),
        trademark_no VARCHAR(50) NOT NULL,
        category VARCHAR(100) DEFAULT 'INITIAL TRADEMARK',
        mark_name VARCHAR(255) NOT NULL,
        class_no VARCHAR(10) NOT NULL,
        class_desc TEXT,
        app_type VARCHAR(100),
        applicant_name VARCHAR(255) NOT NULL,
        father_name VARCHAR(255),
        cnic VARCHAR(50),
        issue_date VARCHAR(100),
        expiry_date VARCHAR(100),
        trading_as VARCHAR(255) NOT NULL,
        address TEXT,
        usage_year VARCHAR(20),
        consultant_name VARCHAR(255),
        consultant_addr TEXT,
        logo_url TEXT,
        status VARCHAR(50) DEFAULT 'PENDING',
        filing_process VARCHAR(50) DEFAULT 'PENDING',
        tracking_id VARCHAR(100),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
  } catch (err) {
    console.warn('DB init warning:', err);
  }
}
