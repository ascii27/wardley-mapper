const db = require('./db');

(async () => {
  try {
    await db.initDb();
    console.log('Database initialized');
  } catch (err) {
    console.error('Database initialization failed', err);
    process.exit(1);
  } finally {
    process.exit();
  }
})();
