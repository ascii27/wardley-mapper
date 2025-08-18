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
let wizardCapabilities = [];
let wizardNeedCapLinks = [];

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
  const collapseBtn = $('collapseSidebar'); if (collapseBtn) collapseBtn.addEventListener('click', () => {
    const grid = document.querySelector('.app-grid');
    if (grid) grid.classList.toggle('collapsed');
  });
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
    // populate need-for-user select from any current users
    updateNeedForUserOptions(); renderWizardLinks(); renderWizardCapabilities();
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
  const addCapBtn = $('addCapBtn'); if (addCapBtn) addCapBtn.addEventListener('click', () => {
    const name = $('wizCapInput').value.trim(); if (!name) return; const stage = Number($('wizCapStage').value || 3);
    wizardCapabilities.push({ name, stage, rationale: '', delta_evolution: null, delta_visibility: null }); $('wizCapInput').value = ''; renderWizardCapabilities();
  });
  const addLinkBtn = $('addLinkBtn'); if (addLinkBtn) addLinkBtn.addEventListener('click', () => {
    const need = $('linkNeedSelect').value; const cap = $('linkCapSelect').value; if (!need || !cap) return alert('Select need and capability');
    wizardNeedCapLinks.push({ need, capability: cap }); renderWizardLinks(); renderWizardPreview();
  });
  // wizard add user/need buttons
  const addUserBtn = $('addUserBtn'); if (addUserBtn) addUserBtn.addEventListener('click', () => {
    const input = $('wizUserInput'); if (!input) return; const v = input.value.trim(); if (!v) return; const list = $('wizUsersList'); const li = document.createElement('li'); li.dataset.name = v; li.textContent = v; const btn = document.createElement('button'); btn.textContent = 'Delete'; btn.className='btn btn-tonal p-1 ml-2'; btn.addEventListener('click', () => { li.remove(); updateNeedForUserOptions(); }); li.appendChild(btn); list.appendChild(li); input.value=''; updateNeedForUserOptions(); });
  const addNeedBtn = $('addNeedBtn'); if (addNeedBtn) addNeedBtn.addEventListener('click', () => {
    const name = $('wizNeedName').value.trim(); const forUser = $('wizNeedForUser').value; if (!name) return alert('Need name required');
    const list = $('wizNeedsList'); const li = document.createElement('li'); li.dataset.name = name; li.dataset.forUser = forUser; li.textContent = `${name} (for ${forUser || '—'})`;
    const btn = document.createElement('button'); btn.textContent = 'Delete'; btn.className='btn btn-tonal p-1 ml-2'; btn.addEventListener('click', () => { li.remove(); }); li.appendChild(btn); list.appendChild(li);
    $('wizNeedName').value='';
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
  ctx.font = '14px Roboto, Arial, sans-serif';
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
    ctx.fillStyle = '#111'; ctx.font = '13px Roboto, Arial, sans-serif'; ctx.fillText(c.name, x + 10, y - 8);
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
    if (Array.isArray(data.users)) setWizardUsers(data.users);
    if (Array.isArray(data.needs)) setWizardNeeds(data.needs);
  } catch (e) { alert('AI error'); }
}

// Wizard UI helpers for Users and Needs
function getWizardUsers() {
  const list = $('wizUsersList'); const out = [];
  if (!list) return out;
  for (const li of list.children) out.push(li.dataset.name);
  return out;
}
function setWizardUsers(users) {
  const list = $('wizUsersList'); if (!list) return;
  list.innerHTML = '';
  const select = $('wizNeedForUser'); select.innerHTML = '<option value="">-- for user --</option>';
  for (const u of users) {
    const li = document.createElement('li'); li.dataset.name = u;
    const span = document.createElement('span'); span.className='wiz-item-name'; span.textContent = u; span.title = 'Double-click to edit';
    span.addEventListener('dblclick', () => { span.contentEditable = 'true'; span.focus(); });
    span.addEventListener('blur', () => {
      const old = li.dataset.name; const nv = span.textContent.trim(); if (!nv) { span.textContent = old; span.contentEditable = 'false'; return; }
      if (nv === old) { span.contentEditable = 'false'; return; }
      // update name and update any needs referencing this user
      li.dataset.name = nv; span.contentEditable = 'false'; updateNeedForUserOptions(old, nv);
    });
    const btn = document.createElement('button'); btn.textContent = 'Delete'; btn.className = 'btn btn-tonal p-1 ml-2'; btn.addEventListener('click', () => { li.remove(); updateNeedForUserOptions(); renderWizardLinks(); renderWizardPreview(); });
    li.appendChild(span); li.appendChild(btn); list.appendChild(li);
    const opt = document.createElement('option'); opt.value = u; opt.textContent = u; select.appendChild(opt);
  }
  renderWizardPreview();
}

function getWizardNeeds() {
  const list = $('wizNeedsList'); const out = [];
  if (!list) return out;
  for (const li of list.children) {
    out.push({ name: li.dataset.name, forUser: li.dataset.forUser });
  }
  return out;
}
function setWizardNeeds(needs) {
  const list = $('wizNeedsList'); if (!list) return;
  list.innerHTML = '';
  for (const n of needs) {
    const li = document.createElement('li'); li.dataset.name = n.name; li.dataset.forUser = n.forUser || '';
    const span = document.createElement('span'); span.className='wiz-item-name'; span.textContent = n.name; span.title='Double-click to edit';
    span.addEventListener('dblclick', () => { span.contentEditable = 'true'; span.focus(); });
    span.addEventListener('blur', () => { const old = li.dataset.name; const nv = span.textContent.trim(); if (!nv) { span.textContent = old; span.contentEditable='false'; return; } if (nv===old) { span.contentEditable='false'; return; } li.dataset.name = nv; span.contentEditable='false'; renderWizardLinks(); renderWizardPreview(); });
    const meta = document.createElement('span'); meta.className='ml-2 text-sm text-gray-600'; meta.textContent = `(for ${n.forUser || '—'})`;
    const btn = document.createElement('button'); btn.textContent = 'Delete'; btn.className = 'btn btn-tonal p-1 ml-2'; btn.addEventListener('click', () => { li.remove(); renderWizardLinks(); renderWizardPreview(); updateNeedForUserOptions(); });
    li.appendChild(span); li.appendChild(meta); li.appendChild(btn); list.appendChild(li);
  }
  renderWizardPreview();
}

function getWizardCapabilities() { return wizardCapabilities.slice(); }
function setWizardCapabilities(caps) {
  wizardCapabilities = (caps || []).map(c => ({ name: c.name, stage: c.stage || 3, rationale: c.rationale || '', delta_evolution: c.delta_evolution ?? null, delta_visibility: c.delta_visibility ?? null }));
  renderWizardCapabilities();
}

function renderWizardCapabilities() {
  const list = $('wizCapsList'); if (list) { list.innerHTML = ''; wizardCapabilities.forEach((c, i) => {
    const li = document.createElement('li'); li.dataset.idx = i;
    const span = document.createElement('span'); span.className='wiz-item-name'; span.textContent = c.name; span.title='Double-click to edit';
    span.addEventListener('dblclick', () => { span.contentEditable='true'; span.focus(); });
    span.addEventListener('blur', () => { const old = c.name; const nv = span.textContent.trim(); if (!nv) { span.textContent = old; span.contentEditable='false'; return; } if (nv===old) { span.contentEditable='false'; return; } wizardCapabilities[i].name = nv; wizardNeedCapLinks = wizardNeedCapLinks.map(l => ({ need: l.need, capability: l.capability === old ? nv : l.capability })); span.contentEditable='false'; renderWizardLinks(); renderWizardCapabilities(); renderWizardPreview(); });
    const btn = document.createElement('button'); btn.textContent = 'Delete'; btn.className='btn btn-tonal p-1 ml-2'; btn.addEventListener('click', () => { wizardCapabilities.splice(i,1); renderWizardCapabilities(); renderWizardLinks(); renderWizardPreview(); });
    li.appendChild(span); li.appendChild(document.createTextNode(` (stage ${c.stage}) `)); li.appendChild(btn); list.appendChild(li);
  }); }
  // stages view
  const stages = $('wizCapsStages'); if (stages) { stages.innerHTML = ''; wizardCapabilities.forEach((c, i) => {
    const li = document.createElement('li'); const sel = document.createElement('select'); sel.className='border p-1 rounded mr-2'; [1,2,3,4].forEach(s=>{ const o=document.createElement('option'); o.value=s; o.textContent=`Stage ${s}`; if(s===c.stage) o.selected=true; sel.appendChild(o); });
    sel.addEventListener('change', () => { c.stage = Number(sel.value); renderWizardCapabilities(); renderWizardPreview(); });
    const rationale = document.createElement('input'); rationale.className='border p-1 rounded ml-2 w-64'; rationale.placeholder='Rationale (AI hint shown below)'; rationale.value = c.rationale || ''; rationale.addEventListener('input', () => { c.rationale = rationale.value; });
    const hint = document.createElement('div'); hint.className='text-sm text-gray-500 ml-2'; hint.textContent = c.rationale ? `AI: ${c.rationale}` : '';
    li.appendChild(document.createTextNode(c.name + ' ')); li.appendChild(sel); li.appendChild(rationale); li.appendChild(hint); stages.appendChild(li);
  }); }
  // deltas view
  const deltas = $('wizCapsDeltas'); if (deltas) { deltas.innerHTML = ''; wizardCapabilities.forEach((c, i) => {
    const li = document.createElement('li'); const de = document.createElement('input'); de.type='number'; de.step='0.01'; de.min='-0.3'; de.max='0.3'; de.className='border p-1 rounded w-24 mr-2'; de.placeholder='Δevo'; de.value = c.delta_evolution ?? '';
    de.addEventListener('change', () => { const v = Number(de.value); c.delta_evolution = Number.isNaN(v) ? null : v; renderWizardPreview(); });
    const dv = document.createElement('input'); dv.type='number'; dv.step='0.01'; dv.min='-0.3'; dv.max='0.3'; dv.className='border p-1 rounded w-24 mr-2'; dv.placeholder='Δvis'; dv.value = c.delta_visibility ?? '';
    dv.addEventListener('change', () => { const v = Number(dv.value); c.delta_visibility = Number.isNaN(v) ? null : v; renderWizardPreview(); });
    li.appendChild(document.createTextNode(c.name + ' ')); li.appendChild(de); li.appendChild(dv); deltas.appendChild(li);
  }); }
  renderWizardPreview();
}

function updateNeedForUserOptions(oldName, newName) {
  const select = $('wizNeedForUser'); if (!select) return; select.innerHTML = '<option value="">-- for user --</option>';
  const users = getWizardUsers(); for (const u of users) { const opt = document.createElement('option'); opt.value = u; opt.textContent = u; select.appendChild(opt); }
  if (oldName !== undefined) {
    // update existing needs that referenced the old user
    const list = $('wizNeedsList'); if (!list) return;
    for (const li of list.children) {
      if (li.dataset.forUser === oldName) {
        li.dataset.forUser = newName || '';
        const meta = li.querySelector('.text-sm'); if (meta) meta.textContent = `(for ${li.dataset.forUser || '—'})`;
      }
    }
  }
}

function renderWizardLinks() {
  const list = $('wizLinksList'); if (!list) return; list.innerHTML = '';
  wizardNeedCapLinks.forEach((l, i) => {
    const li = document.createElement('li'); li.textContent = `${l.need} → ${l.capability}`;
    const btn = document.createElement('button'); btn.textContent = 'Delete'; btn.className='btn btn-tonal p-1 ml-2'; btn.addEventListener('click', () => { wizardNeedCapLinks.splice(i,1); renderWizardLinks(); renderWizardPreview(); });
    li.appendChild(btn); list.appendChild(li);
  });
  const needSel = $('linkNeedSelect'); const capSel = $('linkCapSelect'); if (needSel && capSel) {
    needSel.innerHTML = '<option value="">-- need --</option>'; capSel.innerHTML = '<option value="">-- capability --</option>';
    const needs = getWizardNeeds(); needs.forEach(n => { const o = document.createElement('option'); o.value = n.name; o.textContent = n.name; needSel.appendChild(o); });
    wizardCapabilities.forEach(c => { const o = document.createElement('option'); o.value = c.name; o.textContent = c.name; capSel.appendChild(o); });
  }
}

// addLinkBtn listener is attached in init()

function renderWizardPreview() {
  const canvas = $('wizPreviewCanvas'); if (!canvas) return; const ctx = canvas.getContext('2d'); const w = canvas.width; const h = canvas.height; ctx.clearRect(0,0,w,h);
  // axes
  ctx.strokeStyle = '#888'; ctx.beginPath(); ctx.moveTo(40, 10); ctx.lineTo(40, h-30); ctx.lineTo(w-10, h-30); ctx.stroke();
  ctx.setLineDash([4,4]); [0.25,0.5,0.75].forEach(p=>{ const x = 40 + (w-50)*p; ctx.strokeStyle='#ddd'; ctx.beginPath(); ctx.moveTo(x,h-30); ctx.lineTo(x,10); ctx.stroke(); }); ctx.setLineDash([]);
  // threshold
  ctx.setLineDash([2,4]); ctx.strokeStyle='#bbb'; ctx.beginPath(); ctx.moveTo(40, 50); ctx.lineTo(w-10, 50); ctx.stroke(); ctx.setLineDash([]);
  const toX = (e) => 40 + (w-50)*clamp01(e);
  const toY = (v) => (h-30) - (h-40)*clamp01(v);
  // draw users (top area)
  let ux = 60;
  getWizardUsers().forEach(u => { ctx.fillStyle = '#7c3aed'; ctx.beginPath(); const x = ux, y = 30; ctx.moveTo(x, y-6); ctx.lineTo(x+6,y); ctx.lineTo(x,y+6); ctx.lineTo(x-6,y); ctx.closePath(); ctx.fill(); ctx.fillStyle='#111'; ctx.fillText(u, x+10, y+4); ux += 120; });
  // draw needs
  let nx = 60;
  getWizardNeeds().forEach(n => { ctx.fillStyle = '#059669'; const x = nx, y = 70; roundRect(ctx, x-12, y-8, 90, 20, 5); ctx.fill(); ctx.fillStyle='#fff'; ctx.fillText(n.name, x-8, y+6); nx += 140; });
  // draw capabilities
  const caps = getWizardCapabilities(); caps.forEach((c, i) => {
    const evo = stageToEvolution(c.stage || 3);
    const vis = 0.6; const x = toX(evo); const y = toY(vis);
    ctx.fillStyle = '#2563eb'; ctx.beginPath(); ctx.arc(x, y, 6, 0, Math.PI*2); ctx.fill(); ctx.fillStyle='#111'; ctx.fillText(c.name, x+8, y+4);
  });
  // draw links
  ctx.strokeStyle = '#999'; wizardNeedCapLinks.forEach(l => {
    const needEl = Array.from(($('wizNeedsList')?.children||[])).find(li => li.dataset.name === l.need);
    const cap = wizardCapabilities.find(c=>c.name===l.capability);
    if (!needEl || !cap) return;
    const nx = 60 + Array.from($('wizNeedsList').children).indexOf(needEl)*140;
    const ny = 70;
    const cx = toX(stageToEvolution(cap.stage||3)); const cy = toY(0.6);
    ctx.beginPath(); ctx.moveTo(nx, ny); ctx.lineTo(cx, cy); ctx.stroke();
  });
}



function parseJsonField(id, fallback) {
  try { const v = $(id).value.trim(); if (!v) return fallback; return JSON.parse(v); } catch { alert(`Invalid JSON in ${id}`); throw new Error('parse'); }
}

async function aiSuggestCapabilities() {
  try {
    const needs = getWizardNeeds();
    const context = $('wizCapsContext')?.value?.trim() || '';
    const res = await fetch(API + '/ai/wizard/capabilities', { method:'POST', headers:{ 'Content-Type':'application/json','Authorization':'Bearer '+localStorage.getItem('token') }, body: JSON.stringify({ needs, context }) });
    const data = await res.json(); if (!res.ok) return alert('AI failed: ' + (data.error||''));
    // data: { capabilities:[{name}], links:[{need,capability}] }
    wizardNeedCapLinks = data.links || [];
    setWizardCapabilities(data.capabilities || []);
    renderWizardLinks();
  } catch (e) { /* handled */ }
}

async function aiSuggestEvolution() {
  try {
    const capabilities = getWizardCapabilities().map(c => ({ name: c.name }));
    const context = $('wizEvoContext')?.value?.trim() || '';
    const res = await fetch(API + '/ai/wizard/evolution', { method:'POST', headers:{ 'Content-Type':'application/json','Authorization':'Bearer '+localStorage.getItem('token') }, body: JSON.stringify({ capabilities, context }) });
    const data = await res.json(); if (!res.ok) return alert('AI failed: ' + (data.error||''));
    // data: [{name, stage, rationale}]
    const byName = new Map((data||[]).map(x => [x.name, x]));
    wizardCapabilities.forEach(c => {
      const s = byName.get(c.name); if (s) { c.stage = s.stage || c.stage; c.rationale = s.rationale || c.rationale; }
    });
    renderWizardCapabilities();
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

    const users = getWizardUsers();
    const needs = getWizardNeeds();
    // validation: every need must have a forUser present in users
    for (const n of needs) {
      if (!n.forUser || !users.includes(n.forUser)) {
        return alert(`Each need must specify an existing user. Issue with need: ${n.name}`);
      }
    }
    if (!users.length) return alert('Please add at least one User');
    if (!needs.length) return alert('Please add at least one Need');
    const caps = getWizardCapabilities();
    if (!caps.length) return alert('Please add at least one Capability');
    const needCapLinks = wizardNeedCapLinks || [];
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
      const st = stageByName.get(c.name) || c.stage;
      const evo = st ? stageToEvolution(st) : 0.5;
      const dv = deltaByName.get(c.name) || {};
      const body = { name: c.name, kind:'capability', evolution: evo, visibility: 0.6 };
      // also include any deltas set in the wizardCapabilities
      const local = wizardCapabilities.find(x => x.name === c.name) || {};
      if (local.delta_evolution != null) body.delta_evolution = local.delta_evolution;
      if (local.delta_visibility != null) body.delta_visibility = local.delta_visibility;
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
