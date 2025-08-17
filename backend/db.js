const { Pool } = require('pg');
require('dotenv').config();

// Require URL and user; password may be empty or omitted (e.g., local trust auth)
const requiredEnv = ['DATABASE_URL', 'DB_USER'];
const missing = requiredEnv.filter((k) => process.env[k] === undefined || process.env[k] === '');
if (missing.length) {
  throw new Error(
    `Missing required environment variables: ${missing.join(', ')}. Set them in a .env file or the environment.`
  );
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  user: process.env.DB_USER,
  // Allow empty password explicitly
  password: process.env.DB_PASSWORD !== undefined ? process.env.DB_PASSWORD : undefined,
});

async function initDb() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      username TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL
    );
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS maps (
      id SERIAL PRIMARY KEY,
      user_id INTEGER REFERENCES users(id),
      name TEXT
    );
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS components (
      id SERIAL PRIMARY KEY,
      map_id INTEGER REFERENCES maps(id),
      name TEXT
    );
  `);
}

module.exports = {
  query: (text, params) => pool.query(text, params),
  initDb,
};
