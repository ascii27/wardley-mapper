const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const path = require('path');
require('dotenv').config();

const db = require('./db');

const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(bodyParser.json());
// Serve frontend assets from ../frontend via Express
const frontendDir = path.join(__dirname, '../frontend');
app.use(express.static(frontendDir));

function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) return res.sendStatus(401);
  jwt.verify(token, process.env.JWT_SECRET || 'secret', (err, user) => {
    if (err) return res.sendStatus(403);
    req.user = user;
    next();
  });
}

app.post('/signup', async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) return res.status(400).json({ error: 'Username and password required' });
  try {
    const hashed = await bcrypt.hash(password, 10);
    const result = await db.query('INSERT INTO users (username, password) VALUES ($1, $2) RETURNING id', [username, hashed]);
    const token = jwt.sign({ id: result.rows[0].id, username }, process.env.JWT_SECRET || 'secret');
    res.json({ token });
  } catch (err) {
    // Unique violation
    if (err && err.code === '23505') {
      return res.status(409).json({ error: 'Username already exists' });
    }
    console.error('Signup failed:', err);
    res.status(400).json({ error: 'User creation failed' });
  }
});

app.post('/login', async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) return res.status(400).json({ error: 'Username and password required' });
  const result = await db.query('SELECT * FROM users WHERE username=$1', [username]);
  if (!result.rows.length) return res.status(400).json({ error: 'Invalid credentials' });
  const user = result.rows[0];
  const match = await bcrypt.compare(password, user.password);
  if (!match) return res.status(400).json({ error: 'Invalid credentials' });
  const token = jwt.sign({ id: user.id, username: user.username }, process.env.JWT_SECRET || 'secret');
  res.json({ token });
});

app.post('/logout', (req, res) => {
  res.json({ message: 'Logged out' });
});

app.get('/dashboard', authenticateToken, (req, res) => {
  res.json({ message: `Welcome ${req.user.username}` });
});

// Serve the frontend index for the root path
app.get('/', (req, res) => {
  res.sendFile(path.join(frontendDir, 'index.html'));
});
// Initialize DB then start server
(async () => {
  try {
    await db.initDb();
    app.listen(port, () => console.log(`API running on port ${port}`));
  } catch (e) {
    console.error('Database initialization failed at startup:', e);
    process.exit(1);
  }
})();
