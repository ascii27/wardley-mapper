// Frontend application logic
const API = '';

// State
let currentMapId = null;
let components = [];
let links = [];
let selectedComponentId = null;
let dragState = null;
let pendingLinkSourceId = null;
let sessionId = null;
let mapsList = [];

// DOM helpers
function $(id) { return document.getElementById(id); }

function showAuth() {
  $('auth').classList.remove('hidden');
  $('app').classList.add('hidden');
  $('logoutBtn').classList.add('hidden');
}
function showApp() {
  $('auth').classList.add('hidden');
  $('app').classList.remove('hidden');
  $('logoutBtn').classList.remove('hidden');
  // default to generator view
  $('generatorView').classList.remove('hidden');
  $('editorView').classList.add('hidden');
}

async function init() {
  // Header actions
  $('logoutBtn').addEventListener('click', logout);
  $('logoutSidebar').addEventListener('click', logout);
  $('profileBtn').addEventListener('click', () => alert('Profile coming soon'));
  $('newMapBtn').addEventListener('click', () => {
    currentMapId = null; components = []; links = []; selectedComponentId = null;
    $('generatorView').classList.remove('hidden'); $('editorView').classList.add('hidden');
    renderMap();
  });

  // Auth forms
  $('signupForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const username = $('signupUsername').value; const password = $('signupPassword').value;
    const res = await fetch(API + '/signup', { method:'POST', headers:{ 'Content-Type':'application/json' }, body: JSON.stringify({ username, password }) });
    const data = await res.json(); if (data.token) { localStorage.setItem('token', data.token); await afterLogin(); }
  });
  $('loginForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const username = $('loginUsername').value; const password = $('loginPassword').value;
    const res = await fetch(API + '/login', { method:'POST', headers:{ 'Content-Type':'application/json' }, body: JSON.stringify({ username, password }) });
    const data = await res.json(); if (data.token) { localStorage.setItem('token', data.token); await afterLogin(); }
  });

  // Sidebar
  $('mapSearch').addEventListener('input', renderMapList);

  // Generator
  $('generateMap').addEventListener('click', generateMapFromPrompt);

  // Editor actions
  $('addComponent').addEventListener('click', addComponentHandler);
  $('deleteComponent').addEventListener('click', deleteSelectedComponent);
  $('sendChat').addEventListener('click', sendChatMessage);

  // Canvas interactions
  const canvas = $('mapCanvas');
  canvas.addEventListener('mousedown', onCanvasMouseDown);
  canvas.addEventListener('mousemove', onCanvasMouseMove);
  canvas.addEventListener('mouseup', onCanvasMouseUp);
  canvas.addEventListener('click', onCanvasClick);

  // Session bootstrap
  if (localStorage.getItem('token')) await afterLogin();
  else showAuth();
}

async function afterLogin() {
  const token = localStorage.getItem('token');
  const res = await fetch(API + '/dashboard', { headers: { 'Authorization': 'Bearer ' + token } });
  const data = await res.json();
  const w = $('welcome');
  if (w) w.innerText = data.message || 'Logged in';
  showApp();
  await populateMaps();
}

async function logout() {
  const token = localStorage.getItem('token');
  await fetch(API + '/logout', { method:'POST', headers: { 'Authorization': 'Bearer ' + token } });
  localStorage.removeItem('token');
  showAuth();
}

// Maps sidebar
async function populateMaps() {
  const res = await fetch(API + '/maps', { headers: { 'Authorization': 'Bearer ' + localStorage.getItem('token') } });
  mapsList = await res.json();
  renderMapList();
}
function renderMapList() {
  const q = ($('mapSearch').value || '').toLowerCase();
  const list = $('mapsList'); list.innerHTML = '';
  mapsList
    .filter(m => !q || (m.name||'').toLowerCase().includes(q) || (m.description||'').toLowerCase().includes(q))
    .forEach(m => {
      const li = document.createElement('li');
      if (m.id === currentMapId) li.classList.add('active');
      const left = document.createElement('div');
      const name = document.createElement('div'); name.textContent = m.name || 'Untitled';
      const meta = document.createElement('div'); meta.className = 'meta'; meta.textContent = (m.updated_at ? new Date(m.updated_at).toLocaleString() : '');
      left.appendChild(name); left.appendChild(meta);
      const actions = document.createElement('div'); actions.className='flex gap-2';
      const edit = document.createElement('button'); edit.className='btn btn-tonal'; edit.textContent='Edit'; edit.addEventListener('click', (e)=>{ e.stopPropagation(); editMapMeta(m); });
      const del = document.createElement('button'); del.className='btn btn-danger'; del.textContent='Delete'; del.addEventListener('click', (e)=>{ e.stopPropagation(); deleteMap(m); });
      actions.appendChild(edit); actions.appendChild(del);
      li.appendChild(left); li.appendChild(actions);
      li.addEventListener('click', async ()=>{ await loadMap(m.id); });
      list.appendChild(li);
    });
}

async function createMap(name, description) {
  const res = await fetch(API + '/maps', { method:'POST', headers:{ 'Content-Type':'application/json', 'Authorization': 'Bearer '+localStorage.getItem('token') }, body: JSON.stringify({ name, description }) });
  const data = await res.json(); if (!res.ok) { alert('Create failed'); return; }
  mapsList.unshift(data); renderMapList();
}
async function editMapMeta(m) {
  const name = prompt('Map name:', m.name || ''); if (name===null) return;
  const description = prompt('Description:', m.description || ''); if (description===null) return;
  const res = await fetch(API + `/maps/${m.id}`, { method:'PATCH', headers:{ 'Content-Type':'application/json','Authorization':'Bearer '+localStorage.getItem('token') }, body: JSON.stringify({ name, description }) });
  const data = await res.json(); if (!res.ok) { alert('Update failed'); return; }
  const idx = mapsList.findIndex(x=>x.id===m.id); if (idx>=0) mapsList[idx]=data; renderMapList();
  if (currentMapId===m.id) { await loadMap(m.id); }
}
async function deleteMap(m) {
  if (!confirm(`Delete map "${m.name}"? This cannot be undone.`)) return;
  const res = await fetch(API + `/maps/${m.id}`, { method:'DELETE', headers:{ 'Authorization': 'Bearer '+localStorage.getItem('token') } });
  if (!res.ok) { alert('Delete failed'); return; }
  mapsList = mapsList.filter(x=>x.id!==m.id); renderMapList();
  if (currentMapId===m.id) { currentMapId=null; components=[]; links=[]; $('editorView').classList.add('hidden'); $('generatorView').classList.remove('hidden'); renderMap(); }
}

// Generator
async function generateMapFromPrompt() {
  const prompt = $('mapPrompt').value.trim(); if (!prompt) return;
  $('genStatus').textContent = 'Generating...';
  try {
    const res = await fetch(API + '/ai/generate-map', { method:'POST', headers: { 'Content-Type':'application/json', 'Authorization': 'Bearer ' + localStorage.getItem('token') }, body: JSON.stringify({ prompt }) });
    const data = await res.json(); if (!res.ok) throw new Error(data.error || 'Failed');
    $('genStatus').textContent = `Map generated: ${data.name || ''}`;
    currentMapId = data.id; components = (data.components||[]).map(c=>({ ...c })); links = (data.links||[]).map(l=>({ ...l }));
    $('mapTitle').textContent = data.name || 'Map'; $('mapUpdated').textContent = 'Just now';
    $('generatorView').classList.add('hidden'); $('editorView').classList.remove('hidden');
    await populateMaps();
    renderMap();
    await loadChat();
  } catch (e) { $('genStatus').textContent = 'Error: ' + e.message; }
}

// Load an existing map
async function loadMap(id) {
  const res = await fetch(API + `/maps/${id}`, { headers: { 'Authorization': 'Bearer ' + localStorage.getItem('token') } });
  const data = await res.json(); if (!res.ok) return;
  currentMapId = id; components = (data.components||[]).map(c=>({ ...c })); links = (data.links||[]).map(l=>({ ...l }));
  $('mapTitle').textContent = data.name || 'Map'; $('mapUpdated').textContent = data.description ? data.description : '';
  $('generatorView').classList.add('hidden'); $('editorView').classList.remove('hidden');
  renderMap();
  await loadChat();
}

// Components and links
async function addComponentHandler() {
  if (!currentMapId) return;
  const name = $('newComponentName').value.trim(); if (!name) return;
  const res = await fetch(API + `/maps/${currentMapId}/components`, { method:'POST', headers: { 'Content-Type':'application/json','Authorization': 'Bearer ' + localStorage.getItem('token') }, body: JSON.stringify({ name, evolution: 0.5, visibility: 0.5 }) });
  const data = await res.json(); if (!res.ok) { $('editStatus').textContent = 'Error: ' + (data.error || 'add failed'); return; }
  components.push(data); $('newComponentName').value=''; renderMap();
}
async function deleteSelectedComponent() {
  if (!currentMapId || !selectedComponentId) return;
  await fetch(API + `/maps/${currentMapId}/components/${selectedComponentId}`, { method:'DELETE', headers: { 'Authorization': 'Bearer ' + localStorage.getItem('token') } });
  components = components.filter(c => c.id !== selectedComponentId);
  links = links.filter(l => l.source_component_id !== selectedComponentId && l.target_component_id !== selectedComponentId);
  selectedComponentId = null; renderMap();
}

// Canvas rendering and interactions
function renderMap() {
  const canvas = $('mapCanvas'); if (!canvas) return; const ctx = canvas.getContext('2d');
  const w = canvas.width, h = canvas.height; ctx.clearRect(0, 0, w, h);
  // axes
  ctx.strokeStyle = '#888'; ctx.beginPath(); ctx.moveTo(40, 10); ctx.lineTo(40, h-30); ctx.lineTo(w-10, h-30); ctx.stroke();
  ctx.fillStyle = '#444'; ctx.fillText('Visibility ↑', 5, 20); ctx.fillText('Evolution →', w-110, h-10);
  const x0 = 40, y0 = h-30, x1 = w-10, y1 = 10;
  const toX = (evolution) => x0 + (x1 - x0) * clamp01(evolution);
  const toY = (visibility) => y0 - (y0 - y1) * clamp01(visibility);
  // links
  ctx.strokeStyle = '#aaa';
  for (const l of links) {
    const from = components.find(c => c.id === l.source_component_id) || components.find(c => c.name === l.from);
    const to = components.find(c => c.id === l.target_component_id) || components.find(c => c.name === l.to);
    if (!from || !to) continue;
    ctx.beginPath(); ctx.moveTo(toX(from.evolution), toY(from.visibility)); ctx.lineTo(toX(to.evolution), toY(to.visibility)); ctx.stroke();
  }
  // components
  for (const c of components) {
    const x = toX(c.evolution), y = toY(c.visibility);
    ctx.fillStyle = (c.id === selectedComponentId) ? '#f59e0b' : '#2563eb';
    ctx.beginPath(); ctx.arc(x, y, 5, 0, Math.PI*2); ctx.fill();
    ctx.fillStyle = '#111'; ctx.fillText(c.name, x + 8, y - 8);
  }
  // Links list UI
  const list = $('linksList'); if (list) {
    list.innerHTML = '';
    links.forEach((l) => {
      const from = components.find(c => c.id === l.source_component_id) || { name: l.from };
      const to = components.find(c => c.id === l.target_component_id) || { name: l.to };
      const li = document.createElement('li');
      li.textContent = `${from.name} → ${to.name}`;
      const btn = document.createElement('button'); btn.textContent = 'Delete'; btn.className = 'btn btn-danger p-2 ml-2';
      btn.addEventListener('click', async () => {
        if (!currentMapId || !l.id) return;
        await fetch(API + `/maps/${currentMapId}/links/${l.id}`, { method: 'DELETE', headers: { 'Authorization': 'Bearer ' + localStorage.getItem('token') } });
        links = links.filter(x => x !== l); renderMap();
      });
      li.appendChild(btn); list.appendChild(li);
    });
  }
}

function clamp01(v){ const n = Number(v); if (Number.isNaN(n)) return 0.5; return Math.max(0, Math.min(1, n)); }

function getMousePos(canvas, evt) {
  const r = canvas.getBoundingClientRect();
  const sx = canvas.width / r.width;
  const sy = canvas.height / r.height;
  return { x: (evt.clientX - r.left) * sx, y: (evt.clientY - r.top) * sy };
}
function hitTest(x, y) {
  const canvas = $('mapCanvas'); const w = canvas.width, h = canvas.height; const x0 = 40, x1 = w-10, y0 = h-30, y1 = 10;
  const toPixX = (e) => x0 + (x1 - x0) * clamp01(e); const toPixY = (v) => y0 - (y0 - y1) * clamp01(v);
  for (const c of components) { const cx = toPixX(c.evolution), cy = toPixY(c.visibility); const d2=(x-cx)*(x-cx)+(y-cy)*(y-cy); if (d2<=8*8) return c; }
  return null;
}

function onCanvasMouseDown(e) {
  const canvas = $('mapCanvas'); const pos = getMousePos(canvas, e); const hit = hitTest(pos.x, pos.y);
  if (hit) { selectedComponentId = hit.id; dragState = { id: hit.id, startX: pos.x, startY: pos.y }; renderMap(); }
  else { selectedComponentId = null; dragState = null; renderMap(); }
}
function onCanvasMouseMove(e) {
  const canvas = $('mapCanvas'); const pos = getMousePos(canvas, e);
  if (!dragState) {
    const hover = hitTest(pos.x, pos.y);
    canvas.style.cursor = hover ? 'pointer' : 'default';
    return;
  }
  
  const dx = pos.x - dragState.startX, dy = pos.y - dragState.startY;
  const c = components.find(c => c.id === dragState.id); if (!c) return;
  const w = canvas.width, h = canvas.height; const x0 = 40, x1 = w-10, y0 = h-30, y1 = 10;
  const toPixX = (e) => x0 + (x1 - x0) * clamp01(e); const toPixY = (v) => y0 - (y0 - y1) * clamp01(v);
  const fromPixX = toPixX(c.evolution) + dx; const fromPixY = toPixY(c.visibility) + dy;
  c.evolution = clamp01((fromPixX - x0) / (x1 - x0)); c.visibility = clamp01(1 - (fromPixY - y1) / (y0 - y1));
  dragState.startX = pos.x; dragState.startY = pos.y; renderMap();
}
async function onCanvasMouseUp() {
  if (dragState) {
    const c = components.find(c => c.id === dragState.id);
    if (c && currentMapId) {
      await fetch(API + `/maps/${currentMapId}/components/${c.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + localStorage.getItem('token') }, body: JSON.stringify({ evolution: c.evolution, visibility: c.visibility }) });
    }
  }
  dragState = null;
}
async function onCanvasClick(e) {
  const canvas = $('mapCanvas'); const pos = getMousePos(canvas, e); const hit = hitTest(pos.x, pos.y);
  const linkMode = $('linkMode')?.checked;
  if (linkMode && hit) {
    if (pendingLinkSourceId == null) { pendingLinkSourceId = hit.id; $('editStatus').textContent = `Link source: ${components.find(c=>c.id===hit.id)?.name}`; }
    else if (pendingLinkSourceId !== hit.id) {
      const sourceId = pendingLinkSourceId, targetId = hit.id; pendingLinkSourceId = null;
      const res = await fetch(API + `/maps/${currentMapId}/links`, { method:'POST', headers:{ 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + localStorage.getItem('token') }, body: JSON.stringify({ sourceId, targetId }) });
      const data = await res.json(); if (res.ok) { links.push(data); $('editStatus').textContent = 'Link created'; renderMap(); }
      else { $('editStatus').textContent = 'Error: ' + (data.error || 'link failed'); }
    }
  }
}

// Chat
async function loadChat() {
  if (!currentMapId) return;
  const res = await fetch(API + `/maps/${currentMapId}/chat`, { headers: { 'Authorization': 'Bearer ' + localStorage.getItem('token') } });
  if (!res.ok) return; const data = await res.json(); sessionId = data.sessionId;
  const log = $('chatLog'); log.innerHTML = ''; for (const m of data.messages) appendChat(m.role, m.content);
}
async function sendChatMessage() {
  const input = $('chatInput'); const txt = input.value.trim(); if (!txt || !currentMapId) return;
  appendChat('user', txt); input.value = ''; $('chatStatus').textContent = 'Thinking...';
  const res = await fetch(API + `/maps/${currentMapId}/chat`, { method:'POST', headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + localStorage.getItem('token') }, body: JSON.stringify({ message: txt }) });
  const data = await res.json(); if (!res.ok) { $('chatStatus').textContent = 'Error: ' + (data.error || 'chat failed'); return; }
  $('chatStatus').textContent = ''; appendChat('assistant', data.assistant || '');
  if (Array.isArray(data.components)) components = data.components; if (Array.isArray(data.links)) links = data.links; renderMap();
}
function appendChat(role, content) {
  const log = $('chatLog'); const div = document.createElement('div');
  div.className = role === 'assistant' ? 'mb-2' : 'mb-2'; div.textContent = `${role}: ${content}`; log.appendChild(div); log.scrollTop = log.scrollHeight;
}

if (document.readyState === 'loading') {
  window.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
