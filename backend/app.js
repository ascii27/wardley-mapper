const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const path = require('path');
require('dotenv').config();

const db = require('./db');
const { generateMapFromPrompt } = require('./ai');

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

// Phase 2: Generate map from prompt via OpenAI
app.post('/ai/generate-map', authenticateToken, async (req, res) => {
  const { prompt } = req.body || {};
  if (!prompt || typeof prompt !== 'string') return res.status(400).json({ error: 'prompt is required' });
  try {
    const mapData = await generateMapFromPrompt(prompt);
    const client = await db.getClient();
    try {
      await client.query('BEGIN');
      const mapInsert = await client.query(
        'INSERT INTO maps (user_id, name, prompt) VALUES ($1, $2, $3) RETURNING id',
        [req.user.id, mapData.name || 'Generated Map', prompt]
      );
      const mapId = mapInsert.rows[0].id;

      // Insert components
      const componentIdByName = new Map();
      for (const c of mapData.components) {
        const ins = await client.query(
          'INSERT INTO components (map_id, name, evolution, visibility) VALUES ($1, $2, $3, $4) RETURNING id',
          [mapId, c.name, c.evolution, c.visibility]
        );
        componentIdByName.set(c.name, ins.rows[0].id);
      }

      // Insert links (skip if missing names)
      for (const l of mapData.links) {
        const fromId = componentIdByName.get(l.from);
        const toId = componentIdByName.get(l.to);
        if (fromId && toId) {
          await client.query(
            'INSERT INTO links (map_id, source_component_id, target_component_id) VALUES ($1, $2, $3)',
            [mapId, fromId, toId]
          );
        }
      }

      await client.query('COMMIT');
      res.json({ id: mapId, ...mapData });
    } catch (inner) {
      await client.query('ROLLBACK');
      throw inner;
    } finally {
      client.release();
    }
  } catch (e) {
    console.error('generate-map failed:', e);
    res.status(500).json({ error: 'Map generation failed', details: e.message });
  }
});

// Phase 2: Fetch maps
app.get('/maps', authenticateToken, async (req, res) => {
  const maps = await db.query('SELECT id, name, prompt FROM maps WHERE user_id=$1 ORDER BY id DESC LIMIT 20', [req.user.id]);
  res.json(maps.rows);
});

app.get('/maps/:id', authenticateToken, async (req, res) => {
  const { id } = req.params;
  const map = await db.query('SELECT id, name, prompt FROM maps WHERE id=$1 AND user_id=$2', [id, req.user.id]);
  if (!map.rows.length) return res.sendStatus(404);
  const components = await db.query('SELECT id, name, evolution, visibility FROM components WHERE map_id=$1', [id]);
  const links = await db.query('SELECT source_component_id, target_component_id FROM links WHERE map_id=$1', [id]);
  res.json({
    id: Number(id),
    name: map.rows[0].name,
    prompt: map.rows[0].prompt,
    components: components.rows,
    links: links.rows,
  });
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
