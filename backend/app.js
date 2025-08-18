const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const path = require('path');
require('dotenv').config();

const db = require('./db');
const { generateMapFromPrompt } = require('./ai');
const { chatOnMap } = require('./ai');
const { suggestUsersNeeds, suggestCapabilities, suggestEvolution } = require('./ai');

const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(bodyParser.json());
// Serve frontend assets from ../frontend via Express
const frontendDir = path.join(__dirname, '../frontend');
app.use(express.static(frontendDir));

function authenticateToken(req, res, next) {
  // In test mode, bypass auth for simplicity
  if (process.env.NODE_ENV === 'test') { req.user = { id: 1, username: 'test' }; return next(); }
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

      const linksWithIds = await client.query('SELECT id, source_component_id, target_component_id FROM links WHERE map_id=$1', [mapId]);
      const comps = [];
      for (const [name, compId] of componentIdByName.entries()) {
        const c = mapData.components.find(x => x.name === name);
        if (c) comps.push({ id: compId, name, evolution: c.evolution, visibility: c.visibility });
      }
      await client.query('COMMIT');
      res.json({ id: mapId, name: mapData.name || 'Generated Map', components: comps, links: linksWithIds.rows });
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
// Create map (for wizard flow)
app.post('/maps', authenticateToken, async (req, res) => {
  const { name, description } = req.body || {};
  const nm = (name || "Untitled Map").toString();
  const desc = description ? description.toString() : null;
  const ins = await db.query('INSERT INTO maps (user_id, name, description, updated_at) VALUES ($1, $2, $3, NOW()) RETURNING id, name, description, created_at, updated_at', [req.user.id, nm, desc]);
  res.status(201).json(ins.rows[0]);
});


app.get('/maps/:id', authenticateToken, async (req, res) => {
  const { id } = req.params;
  const map = await db.query('SELECT id, name, prompt FROM maps WHERE id=$1 AND user_id=$2', [id, req.user.id]);
  if (!map.rows.length) return res.sendStatus(404);
  const components = await db.query('SELECT id, name, evolution, visibility, kind, delta_evolution, delta_visibility FROM components WHERE map_id=$1', [id]);
  const links = await db.query('SELECT id, source_component_id, target_component_id FROM links WHERE map_id=$1', [id]);
  // link names for context convenience
  const linkRows = [];
  for (const l of links.rows) {
    const from = components.rows.find(c => c.id === l.source_component_id);
    const to = components.rows.find(c => c.id === l.target_component_id);
    linkRows.push({ id: l.id, source_component_id: l.source_component_id, target_component_id: l.target_component_id, fromName: from?.name, toName: to?.name });
  }
  res.json({
    id: Number(id),
    name: map.rows[0].name,
    prompt: map.rows[0].prompt,
    components: components.rows,
    links: linkRows,
  });
});

// Phase 3: Component CRUD
app.post('/maps/:id/components', authenticateToken, async (req, res) => {
  const { id } = req.params;
  const { name, evolution = 0.5, visibility = 0.5, kind = 'capability', delta_evolution = null, delta_visibility = null } = req.body || {};
  if (!name) return res.status(400).json({ error: 'name is required' });
  const map = await db.query('SELECT id FROM maps WHERE id=$1 AND user_id=$2', [id, req.user.id]);
  if (!map.rows.length) return res.sendStatus(404);
  const ins = await db.query(
    'INSERT INTO components (map_id, name, evolution, visibility, kind, delta_evolution, delta_visibility) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id, name, evolution, visibility, kind, delta_evolution, delta_visibility',
    [id, name, clamp01(evolution), clamp01(visibility), sanitizeKind(kind), normalizeDelta(delta_evolution), normalizeDelta(delta_visibility)]
  );
  res.status(201).json(ins.rows[0]);
});

app.patch('/maps/:id/components/:componentId', authenticateToken, async (req, res) => {
  const { id, componentId } = req.params;
  const map = await db.query('SELECT id FROM maps WHERE id=$1 AND user_id=$2', [id, req.user.id]);
  if (!map.rows.length) return res.sendStatus(404);
  const existing = await db.query('SELECT id FROM components WHERE id=$1 AND map_id=$2', [componentId, id]);
  if (!existing.rows.length) return res.sendStatus(404);
  const { name, evolution, visibility, kind, delta_evolution, delta_visibility } = req.body || {};
  const fields = [];
  const values = [];
  if (name !== undefined) { fields.push('name'); values.push(name); }
  if (evolution !== undefined) { fields.push('evolution'); values.push(clamp01(evolution)); }
  if (visibility !== undefined) { fields.push('visibility'); values.push(clamp01(visibility)); }
  if (kind !== undefined) { fields.push('kind'); values.push(sanitizeKind(kind)); }
  if (delta_evolution !== undefined) { fields.push('delta_evolution'); values.push(normalizeDelta(delta_evolution)); }
  if (delta_visibility !== undefined) { fields.push('delta_visibility'); values.push(normalizeDelta(delta_visibility)); }
  if (!fields.length) return res.status(400).json({ error: 'no fields to update' });
  const setClause = fields.map((f, i) => `${f}=$${i+1}`).join(', ');
  values.push(componentId);
  const upd = await db.query(`UPDATE components SET ${setClause} WHERE id=$${values.length} RETURNING id, name, evolution, visibility, kind, delta_evolution, delta_visibility`, values);
  res.json(upd.rows[0]);
});

app.delete('/maps/:id/components/:componentId', authenticateToken, async (req, res) => {
  const { id, componentId } = req.params;
  const map = await db.query('SELECT id FROM maps WHERE id=$1 AND user_id=$2', [id, req.user.id]);
  if (!map.rows.length) return res.sendStatus(404);
  await db.query('DELETE FROM links WHERE map_id=$1 AND (source_component_id=$2 OR target_component_id=$2)', [id, componentId]);
  await db.query('DELETE FROM components WHERE id=$1 AND map_id=$2', [componentId, id]);
  res.sendStatus(204);
});

// Phase 3: Link CRUD
app.post('/maps/:id/links', authenticateToken, async (req, res) => {
  const { id } = req.params;
  const { sourceId, targetId } = req.body || {};
  if (!sourceId || !targetId) return res.status(400).json({ error: 'sourceId and targetId required' });
  const map = await db.query('SELECT id FROM maps WHERE id=$1 AND user_id=$2', [id, req.user.id]);
  if (!map.rows.length) return res.sendStatus(404);
  const a = await db.query('SELECT id FROM components WHERE id=$1 AND map_id=$2', [sourceId, id]);
  const b = await db.query('SELECT id FROM components WHERE id=$1 AND map_id=$2', [targetId, id]);
  if (!a.rows.length || !b.rows.length) return res.status(400).json({ error: 'components must belong to map' });
  const ins = await db.query(
    'INSERT INTO links (map_id, source_component_id, target_component_id) VALUES ($1, $2, $3) RETURNING id, source_component_id, target_component_id',
    [id, sourceId, targetId]
  );
  res.status(201).json(ins.rows[0]);
});

app.delete('/maps/:id/links/:linkId', authenticateToken, async (req, res) => {
  const { id, linkId } = req.params;
  const map = await db.query('SELECT id FROM maps WHERE id=$1 AND user_id=$2', [id, req.user.id]);
  if (!map.rows.length) return res.sendStatus(404);
  await db.query('DELETE FROM links WHERE id=$1 AND map_id=$2', [linkId, id]);
  res.sendStatus(204);
});

// Phase 4: Chat
async function getOrCreateSession(userId, mapId) {
  const existing = await db.query('SELECT id FROM chat_sessions WHERE user_id=$1 AND map_id=$2 ORDER BY id DESC LIMIT 1', [userId, mapId]);
  if (existing.rows.length) return existing.rows[0].id;
  const ins = await db.query('INSERT INTO chat_sessions (user_id, map_id) VALUES ($1, $2) RETURNING id', [userId, mapId]);
  return ins.rows[0].id;
}

app.get('/maps/:id/chat', authenticateToken, async (req, res) => {
  const { id } = req.params;
  const map = await db.query('SELECT id FROM maps WHERE id=$1 AND user_id=$2', [id, req.user.id]);
  if (!map.rows.length) return res.sendStatus(404);
  const sessionId = await getOrCreateSession(req.user.id, id);
  const msgs = await db.query('SELECT id, role, content, created_at FROM chat_messages WHERE session_id=$1 ORDER BY id ASC', [sessionId]);
  res.json({ sessionId, messages: msgs.rows });
});

app.post('/maps/:id/chat', authenticateToken, async (req, res) => {
  const { id } = req.params;
  const { message } = req.body || {};
  if (!message) return res.status(400).json({ error: 'message is required' });
  const mapRow = await db.query('SELECT id, name FROM maps WHERE id=$1 AND user_id=$2', [id, req.user.id]);
  if (!mapRow.rows.length) return res.sendStatus(404);
  const sessionId = await getOrCreateSession(req.user.id, id);
  await db.query('INSERT INTO chat_messages (session_id, role, content) VALUES ($1, $2, $3)', [sessionId, 'user', message]);

  // Build map context
  const components = await db.query('SELECT id, name, evolution, visibility FROM components WHERE map_id=$1', [id]);
  const links = await db.query('SELECT id, source_component_id, target_component_id FROM links WHERE map_id=$1', [id]);
  const linkRows = links.rows.map(l => ({
    id: l.id,
    from: components.rows.find(c => c.id === l.source_component_id)?.name,
    to: components.rows.find(c => c.id === l.target_component_id)?.name,
  })).filter(l => l.from && l.to);
  const historyRows = await db.query('SELECT role, content FROM chat_messages WHERE session_id=$1 ORDER BY id DESC LIMIT 10', [sessionId]);
  const history = historyRows.rows.reverse();

  try {
    const ai = await chatOnMap({
      prompt: message,
      map: { id: Number(id), name: mapRow.rows[0].name, components: components.rows, links: linkRows },
      history
    });

    // Apply commands
    const client = await db.getClient();
    try {
      await client.query('BEGIN');
      const nameToId = new Map(components.rows.map(c => [c.name, c.id]));
      for (const cmd of ai.commands) {
        switch (cmd.op) {
          case 'add_component': {
            if (typeof cmd.name === 'string') {
              const ins = await client.query('INSERT INTO components (map_id, name, evolution, visibility) VALUES ($1,$2,$3,$4) RETURNING id', [id, cmd.name, clamp01(cmd.evolution), clamp01(cmd.visibility)]);
              nameToId.set(cmd.name, ins.rows[0].id);
            }
            break;
          }
          case 'move_component': {
            const cid = nameToId.get(cmd.name);
            if (cid) await client.query('UPDATE components SET evolution=$1, visibility=$2 WHERE id=$3', [clamp01(cmd.evolution), clamp01(cmd.visibility), cid]);
            break;
          }
          case 'delete_component': {
            const cid = nameToId.get(cmd.name);
            if (cid) {
              await client.query('DELETE FROM links WHERE map_id=$1 AND (source_component_id=$2 OR target_component_id=$2)', [id, cid]);
              await client.query('DELETE FROM components WHERE id=$1', [cid]);
              nameToId.delete(cmd.name);
            }
            break;
          }
          case 'add_link': {
            const fromId = nameToId.get(cmd.from);
            const toId = nameToId.get(cmd.to);
            if (fromId && toId) await client.query('INSERT INTO links (map_id, source_component_id, target_component_id) VALUES ($1,$2,$3)', [id, fromId, toId]);
            break;
          }
          case 'delete_link': {
            const fromId = nameToId.get(cmd.from);
            const toId = nameToId.get(cmd.to);
            if (fromId && toId) await client.query('DELETE FROM links WHERE map_id=$1 AND source_component_id=$2 AND target_component_id=$3', [id, fromId, toId]);
            break;
          }
          default:
            break;
        }
      }
      await client.query('COMMIT');
    } catch (e) {
      await client.query('ROLLBACK');
      throw e;
    } finally {
      client.release();
    }

    // Save assistant message
    await db.query('INSERT INTO chat_messages (session_id, role, content) VALUES ($1, $2, $3)', [sessionId, 'assistant', ai.reply]);

    // Return updated map and the assistant reply
    const comps2 = await db.query('SELECT id, name, evolution, visibility FROM components WHERE map_id=$1', [id]);
    const links2 = await db.query('SELECT id, source_component_id, target_component_id FROM links WHERE map_id=$1', [id]);
    res.json({
      sessionId,
      assistant: ai.reply,
      components: comps2.rows,
      links: links2.rows,
    });
  } catch (e) {
    console.error('chat failed:', e);
    res.status(500).json({ error: 'chat failed', details: e.message });
  }
});

// Phase 5b: Wizard AI endpoints
app.post('/ai/wizard/users-needs', authenticateToken, async (req, res) => {
  try {
    const { context } = req.body || {};
    if (!context) return res.status(400).json({ error: 'context is required' });
    const out = await suggestUsersNeeds(context);
    res.json(out);
  } catch (e) {
    console.error('users-needs failed:', e); res.status(500).json({ error: 'failed', details: e.message });
  }
});

app.post('/ai/wizard/capabilities', authenticateToken, async (req, res) => {
  try {
    const { needs, context = '' } = req.body || {};
    if (!needs) return res.status(400).json({ error: 'needs is required' });
    const out = await suggestCapabilities(needs, context);
    res.json(out);
  } catch (e) {
    console.error('capabilities failed:', e); res.status(500).json({ error: 'failed', details: e.message });
  }
});

app.post('/ai/wizard/evolution', authenticateToken, async (req, res) => {
  try {
    const { capabilities, context = '' } = req.body || {};
    if (!capabilities) return res.status(400).json({ error: 'capabilities is required' });
    const out = await suggestEvolution(capabilities, context);
    res.json(out);
  } catch (e) {
    console.error('evolution failed:', e); res.status(500).json({ error: 'failed', details: e.message });
  }
});

function clamp01(v) {
  const n = Number(v);
  if (Number.isNaN(n)) return 0.5;
  return Math.max(0, Math.min(1, n));
}

function sanitizeKind(k) {
  const s = (k || '').toString().toLowerCase();
  if (s === 'user' || s === 'need' || s === 'capability') return s;
  return 'capability';
}
function normalizeDelta(v) {
  if (v === null || v === undefined || v === '') return null;
  const n = Number(v);
  if (Number.isNaN(n)) return null;
  return Math.max(-1, Math.min(1, n));
}

// Serve the frontend index for the root path
app.get('/', (req, res) => {
  res.sendFile(path.join(frontendDir, 'index.html'));
});
// Initialize DB then start server
// Initialize DB then start server when run directly
async function start() {
  try {
    await db.initDb();
    app.listen(port, () => console.log(`API running on port ${port}`));
  } catch (e) {
    console.error('Database initialization failed at startup:', e);
    process.exit(1);
  }
}

if (require.main === module) start();

module.exports = app;
