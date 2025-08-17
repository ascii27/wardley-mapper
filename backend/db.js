const { Pool } = require('pg');
let pool;
if (process.env.DATABASE_URL) {
  pool = new Pool({ connectionString: process.env.DATABASE_URL });
} else {
  const { newDb } = require('pg-mem');
  const db = newDb();
  const pgMem = db.adapters.createPg();
  pool = new pgMem.Pool();
}

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
