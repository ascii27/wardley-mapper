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
let wizardStep = 1;

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
  const guidesBtn = $('guidesBtn'); if (guidesBtn) guidesBtn.addEventListener('click', showGuides);
  $('newMapBtn').addEventListener('click', (e) => {
    e.stopPropagation();
    const menu = $('newMenu');
    if (menu) menu.classList.toggle('hidden');
  });
  document.addEventListener('click', () => {
    const menu = $('newMenu');
    if (!menu) return;
    if (!menu.classList.contains('hidden')) menu.classList.add('hidden');
  });
  const btnWizard = $('newWizard'); if (btnWizard) btnWizard.addEventListener('click', () => {
    currentMapId = null; components = []; links = []; selectedComponentId = null;
    const wiz = $('wizardView'); if (wiz) wiz.classList.remove('hidden');
    const gen = $('generatorView'); if (gen) gen.classList.add('hidden');
    const ed = $('editorView'); if (ed) ed.classList.add('hidden');
    const g = $('guidesView'); if (g) g.classList.add('hidden');
    $('newMenu')?.classList.add('hidden');
    renderMap();
  });
  const btnGen = $('newGenerator'); if (btnGen) btnGen.addEventListener('click', () => {
    currentMapId = null; components = []; links = []; selectedComponentId = null;
    const gen = $('generatorView'); if (gen) gen.classList.remove('hidden');
    const wiz = $('wizardView'); if (wiz) wiz.classList.add('hidden');
    const ed = $('editorView'); if (ed) ed.classList.add('hidden');
    const g = $('guidesView'); if (g) g.classList.add('hidden');
    $('newMenu')?.classList.add('hidden');
    renderMap();
  });
  const btnBlank = $('newBlank'); if (btnBlank) btnBlank.addEventListener('click', async () => {
    const name = prompt('New map name:', 'Untitled Map'); if (name === null) return;
    const res = await fetch(API + '/maps', { method:'POST', headers:{ 'Content-Type':'application/json','Authorization':'Bearer '+localStorage.getItem('token') }, body: JSON.stringify({ name }) });
    const data = await res.json(); if (!res.ok) { alert('Create failed'); return; }
    currentMapId = data.id; components = []; links = []; selectedComponentId = null;
    const ed = $('editorView'); if (ed) ed.classList.remove('hidden');
    const wiz = $('wizardView'); if (wiz) wiz.classList.add('hidden');
    const gen = $('generatorView'); if (gen) gen.classList.add('hidden');
    const g = $('guidesView'); if (g) g.classList.add('hidden');
    $('newMenu')?.classList.add('hidden');
    await populateMaps();
    renderMap();
  });

  // Wizard handlers
  const wizBack = $('wizBack'), wizNext = $('wizNext'), wizCreate = $('wizCreate');
  if (wizBack && wizNext && wizCreate) {
    wizBack.addEventListener('click', () => wizardShowStep(wizardStep - 1));
    wizNext.addEventListener('click', () => wizardShowStep(wizardStep + 1));
    wizCreate.addEventListener('click', createMapFromWizard);
  }
  const wizAiUsers = $('wizAiUsers'); if (wizAiUsers) wizAiUsers.addEventListener('click', aiSuggestUsersNeeds);
  const wizAiCaps = $('wizAiCaps'); if (wizAiCaps) wizAiCaps.addEventListener('click', aiSuggestCapabilities);
  const wizAiEvo = $('wizAiEvo'); if (wizAiEvo) wizAiEvo.addEventListener('click', aiSuggestEvolution);


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
  $('saveSelected').addEventListener('click', saveSelectedDetails);
  $('showVectors').addEventListener('change', () => renderMap());

  // Canvas interactions
  const canvas = $('mapCanvas');
  canvas.addEventListener('mousedown', onCanvasMouseDown);
  canvas.addEventListener('mousemove', onCanvasMouseMove);
  canvas.addEventListener('mouseup', onCanvasMouseUp);
  canvas.addEventListener('click', onCanvasClick);
  const toggleBtn = $('toggleMapSize'); if (toggleBtn) toggleBtn.addEventListener('click', toggleMapSize);

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
  if (currentMapId===m.id) { currentMapId=null; components=[]; links=[]; $('editorView').classList.add('hidden'); $('guidesView')?.classList.add('hidden'); $('generatorView').classList.remove('hidden'); renderMap(); }
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
    $('generatorView').classList.add('hidden'); $('editorView').classList.remove('hidden'); $('guidesView')?.classList.add('hidden');
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
  $('generatorView').classList.add('hidden'); $('editorView').classList.remove('hidden'); $('guidesView')?.classList.add('hidden');
  renderMap();
  await loadChat();
}

// Components and links
async function addComponentHandler() {
  if (!currentMapId) return;
  const name = $('newComponentName').value.trim(); if (!name) return;
  const kind = $('newComponentKind').value || 'capability';
  const res = await fetch(API + `/maps/${currentMapId}/components`, { method:'POST', headers: { 'Content-Type':'application/json','Authorization': 'Bearer ' + localStorage.getItem('token') }, body: JSON.stringify({ name, evolution: 0.5, visibility: 0.5, kind }) });
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
  ctx.fillStyle = '#444';
  ctx.fillText('Value Chain (Invisible → Visible)', 45, 20);
  ctx.fillText('Evolution', w/2 - 20, h - 10);
  const x0 = 40, y0 = h-30, x1 = w-10, y1 = 10;
  const toX = (evolution) => x0 + (x1 - x0) * clamp01(evolution);
  const toY = (visibility) => y0 - (y0 - y1) * clamp01(visibility);

  // X stages and labels
  ctx.setLineDash([4, 4]);
  [0.25, 0.5, 0.75].forEach(p => {
    const x = toX(p);
    ctx.strokeStyle = '#ddd'; ctx.beginPath(); ctx.moveTo(x, y0); ctx.lineTo(x, y1); ctx.stroke();
  });
  ctx.setLineDash([]);
  ctx.fillStyle = '#555';
  const labels = ['Genesis', 'Custom', 'Product', 'Commodity'];
  [0.0, 0.25, 0.5, 0.75].forEach((p, i) => {
    const x = toX(p) + 5; ctx.fillText(labels[i], x, h - 15);
  });

  // Horizontal dotted threshold to split Users/Needs (above) from Capabilities (below)
  ctx.setLineDash([2, 4]); ctx.strokeStyle = '#bbb'; ctx.beginPath(); ctx.moveTo(40, 50); ctx.lineTo(w-10, 50); ctx.stroke(); ctx.setLineDash([]);
  // links
  ctx.strokeStyle = '#aaa';
  for (const l of links) {
    const from = components.find(c => c.id === l.source_component_id) || components.find(c => c.name === l.from);
    const to = components.find(c => c.id === l.target_component_id) || components.find(c => c.name === l.to);
    if (!from || !to) continue;
    ctx.beginPath(); ctx.moveTo(toX(from.evolution), toY(from.visibility)); ctx.lineTo(toX(to.evolution), toY(to.visibility)); ctx.stroke();
  }
  // components with shapes and optional change vectors
  const showVectors = $('showVectors')?.checked;
  function jitter(name){ let h=0; for (let i=0;i<name.length;i++) h=(h*31 + name.charCodeAt(i))|0; return ((h%7)-3)*1.5; }
  for (const c of components) {
    const x = toX(c.evolution)+jitter(c.name), y = toY(c.visibility)+jitter(c.name+'y');
    // change vector
    if (showVectors && c.delta_evolution != null && c.delta_visibility != null) {
      const tx = toX(clamp01(Number(c.evolution) + Number(c.delta_evolution)));
      const ty = toY(clamp01(Number(c.visibility) + Number(c.delta_visibility)));
      ctx.strokeStyle = '#999'; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(tx, ty); ctx.stroke();
      const ang = Math.atan2(ty - y, tx - x);
      const ah = 6; ctx.beginPath(); ctx.moveTo(tx, ty);
      ctx.lineTo(tx - ah * Math.cos(ang - Math.PI / 6), ty - ah * Math.sin(ang - Math.PI / 6));
      ctx.lineTo(tx - ah * Math.cos(ang + Math.PI / 6), ty - ah * Math.sin(ang + Math.PI / 6));
      ctx.closePath(); ctx.fillStyle = '#999'; ctx.fill();
    }

    const kind = (c.kind || 'capability').toLowerCase();
    const selected = c.id === selectedComponentId;
    const fill = selected ? '#f59e0b' : (kind === 'user' ? '#7c3aed' : kind === 'need' ? '#059669' : '#2563eb');
    ctx.fillStyle = fill; ctx.strokeStyle = fill;
    if (kind === 'user') {
      const s = 8; ctx.beginPath(); ctx.moveTo(x, y - s); ctx.lineTo(x + s, y); ctx.lineTo(x, y + s); ctx.lineTo(x - s, y); ctx.closePath(); ctx.fill();
    } else if (kind === 'need') {
      const rw = 24, rh = 14, r = 5; const lx = x - rw/2, ly = y - rh/2;
      roundRect(ctx, lx, ly, rw, rh, r); ctx.fill();
    } else {
      ctx.beginPath(); ctx.arc(x, y, 5, 0, Math.PI*2); ctx.fill();
    }
    ctx.fillStyle = '#111'; ctx.fillText(c.name, x + 10, y - 8);
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
  // populate selected controls
  const sel = components.find(c => c.id === selectedComponentId);
  if (sel) {
    $('compKind').value = (sel.kind || 'capability');
    $('deltaEvo').value = sel.delta_evolution ?? '';
    $('deltaVis').value = sel.delta_visibility ?? '';
  } else {
    $('compKind').value = 'capability'; $('deltaEvo').value = ''; $('deltaVis').value = '';
  }
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

async function saveSelectedDetails() {
  if (!currentMapId || !selectedComponentId) return;
  const kind = $('compKind').value;
  const delta_evolution = $('deltaEvo').value;
  const delta_visibility = $('deltaVis').value;
  const res = await fetch(API + `/maps/${currentMapId}/components/${selectedComponentId}`, { method:'PATCH', headers:{ 'Content-Type': 'application/json','Authorization': 'Bearer ' + localStorage.getItem('token') }, body: JSON.stringify({ kind, delta_evolution, delta_visibility })});
  const data = await res.json(); if (!res.ok) { $('editStatus').textContent = 'Error saving'; return; }
  const idx = components.findIndex(c=>c.id===selectedComponentId); if (idx>=0) components[idx]=data; renderMap();
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath(); ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
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

function showGuides() {
  const g = $('guidesView'); if (!g) return;
  $('generatorView')?.classList.add('hidden');
  $('editorView')?.classList.add('hidden');
  g.classList.remove('hidden');
}

if (document.readyState === 'loading') {
  window.addEventListener('DOMContentLoaded', init);
} else {
  init();
}


// Wizard helpers
function wizardShowStep(n) {
  wizardStep = Math.max(1, Math.min(5, n));
  const steps = [1,2,3,4,5];
  steps.forEach(i => {
    const el = $(`wizStep${i}`);
    if (el) el.classList.toggle('hidden', i !== wizardStep);
  });
  const num = $('wizStepNum'); if (num) num.textContent = String(wizardStep);
  const next = $('wizNext'), back = $('wizBack'), create = $('wizCreate');
  if (back) back.disabled = wizardStep === 1;
  if (next) next.classList.toggle('hidden', wizardStep === 5);
  if (create) create.classList.toggle('hidden', wizardStep !== 5);
}

async function aiSuggestUsersNeeds() {
  try {
    const context = $('wizContext').value.trim(); if (!context) return alert('Please provide context.');
    const res = await fetch(API + '/ai/wizard/users-needs', { method:'POST', headers:{ 'Content-Type':'application/json','Authorization':'Bearer '+localStorage.getItem('token') }, body: JSON.stringify({ context }) });
    const data = await res.json(); if (!res.ok) return alert('AI failed: ' + (data.error||''));
    if (Array.isArray(data.users)) $('wizUsers').value = JSON.stringify(data.users, null, 2);
    if (Array.isArray(data.needs)) $('wizNeeds').value = JSON.stringify(data.needs, null, 2);
  } catch (e) { alert('AI error'); }
}

function parseJsonField(id, fallback) {
  try { const v = $(id).value.trim(); if (!v) return fallback; return JSON.parse(v); } catch { alert(`Invalid JSON in ${id}`); throw new Error('parse'); }
}

async function aiSuggestCapabilities() {
  try {
    const needs = parseJsonField('wizNeeds', []);
    const res = await fetch(API + '/ai/wizard/capabilities', { method:'POST', headers:{ 'Content-Type':'application/json','Authorization':'Bearer '+localStorage.getItem('token') }, body: JSON.stringify({ needs, context }) });
    const data = await res.json(); if (!res.ok) return alert('AI failed: ' + (data.error||''));
    $('wizCaps').value = JSON.stringify(data, null, 2);
  } catch (e) { /* handled */ }
}

async function aiSuggestEvolution() {
  try {
    const caps = parseJsonField('wizCaps', {capabilities:[]});
    const capabilities = caps.capabilities || [];
    const res = await fetch(API + '/ai/wizard/evolution', { method:'POST', headers:{ 'Content-Type':'application/json','Authorization':'Bearer '+localStorage.getItem('token') }, body: JSON.stringify({ capabilities, context }) });
    const data = await res.json(); if (!res.ok) return alert('AI failed: ' + (data.error||''));
    $('wizStages').value = JSON.stringify(data, null, 2);
  } catch (e) { /* handled */ }
}

function stageToEvolution(stage) {
  const s = Number(stage);
  if (s === 1) return 0.125;
  if (s === 2) return 0.375;
  if (s === 3) return 0.625;
  if (s === 4) return 0.875;
  return 0.5;
}

async function createMapFromWizard() {
  try {
    const name = $('wizName').value.trim() || 'Untitled Map';
    const res = await fetch(API + '/maps', { method:'POST', headers:{ 'Content-Type':'application/json','Authorization':'Bearer '+localStorage.getItem('token') }, body: JSON.stringify({ name }) });
    const map = await res.json(); if (!res.ok) return alert('Create map failed');
    const mapId = map.id; currentMapId = mapId;

    const users = parseJsonField('wizUsers', []);
    const needs = parseJsonField('wizNeeds', []);
    const capObj = parseJsonField('wizCaps', {capabilities:[],links:[]});
    const caps = capObj.capabilities || [];
    const needCapLinks = capObj.links || [];
    const stages = parseJsonField('wizStages', []);
    const deltas = parseJsonField('wizDeltas', []);
    const stageByName = new Map(stages.map(x => [x.name, x.stage]));
    const deltaByName = new Map(deltas.map(x => [x.name, {de:x.delta_evolution, dv:x.delta_visibility}]));

    const nameToId = new Map();
    for (const u of users) {
      const r = await fetch(API + `/maps/${mapId}/components`, { method:'POST', headers:{ 'Content-Type':'application/json','Authorization':'Bearer '+localStorage.getItem('token') }, body: JSON.stringify({ name: u, kind:'user', evolution: 0.9, visibility: 0.95 }) });
      const d = await r.json(); if (r.ok) nameToId.set(u, d.id);
    }
    for (const n of needs) {
      const r = await fetch(API + `/maps/${mapId}/components`, { method:'POST', headers:{ 'Content-Type':'application/json','Authorization':'Bearer '+localStorage.getItem('token') }, body: JSON.stringify({ name: n.name, kind:'need', evolution: 0.6, visibility: 0.9 }) });
      const d = await r.json(); if (r.ok) {
        nameToId.set(n.name, d.id);
        const uid = nameToId.get(n.forUser);
        if (uid) {
          await fetch(API + `/maps/${mapId}/links`, { method:'POST', headers:{ 'Content-Type':'application/json','Authorization':'Bearer '+localStorage.getItem('token') }, body: JSON.stringify({ sourceId: uid, targetId: d.id }) });
        }
      }
    }
    for (const c of caps) {
      const st = stageByName.get(c.name);
      const evo = st ? stageToEvolution(st) : 0.5;
      const dv = deltaByName.get(c.name) || {};
      const body = { name: c.name, kind:'capability', evolution: evo, visibility: 0.6 };
      if (dv.de !== undefined) body.delta_evolution = dv.de;
      if (dv.dv !== undefined) body.delta_visibility = dv.dv;
      const r = await fetch(API + `/maps/${mapId}/components`, { method:'POST', headers:{ 'Content-Type':'application/json','Authorization':'Bearer '+localStorage.getItem('token') }, body: JSON.stringify(body) });
      const d = await r.json(); if (r.ok) nameToId.set(c.name, d.id);
    }
    for (const l of needCapLinks) {
      const sid = nameToId.get(l.need), tid = nameToId.get(l.capability);
      if (sid && tid) {
        await fetch(API + `/maps/${mapId}/links`, { method:'POST', headers:{ 'Content-Type':'application/json','Authorization':'Bearer '+localStorage.getItem('token') }, body: JSON.stringify({ sourceId: sid, targetId: tid }) });
      }
    }

    const wiz = $('wizardView'); if (wiz) wiz.classList.add('hidden');
    const ed = $('editorView'); if (ed) ed.classList.remove('hidden');
    const gen = $('generatorView'); if (gen) gen.classList.add('hidden');
    const g = $('guidesView'); if (g) g.classList.add('hidden');
    await populateMaps();
    await loadMap(mapId);
  } catch (e) { alert('Failed to create map from wizard.'); }
}


function toggleMapSize() {
  const canvas = $('mapCanvas');
  if (!canvas) return;
  const expanded = canvas.dataset.size === 'expanded';
  const btn = $('toggleMapSize');
  if (expanded) {
    canvas.width = 1200; canvas.height = 640; canvas.dataset.size = '';
    if (btn) btn.innerHTML = '<span class="material-symbols-outlined">fullscreen</span>Expand';
  } else {
    canvas.width = 1600; canvas.height = 900; canvas.dataset.size = 'expanded';
    if (btn) btn.innerHTML = '<span class="material-symbols-outlined">fullscreen_exit</span>Collapse';
  }
  renderMap();
}
