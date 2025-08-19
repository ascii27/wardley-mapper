const API = '';
const { createApp } = Vue;
const { createRouter, createWebHashHistory } = VueRouter;

const LandingPage = {
  template: `
  <div>
    <header class="masthead text-center">
      <div class="container">
        <h1 class="mb-3">Wardley Mapper</h1>
        <p class="lead mb-4">Understand, strategize, decide with maps.</p>
        <a class="btn btn-primary" href="#" @click.prevent="scrollToAuth">Get Started</a>
      </div>
    </header>
    <section class="py-5">
      <div class="container">
        <div class="row gx-4">
          <div class="col-md-4 text-center" v-for="f in features" :key="f.title">
            <div class="mb-3"><i :class="f.icon" style="font-size:2rem;"></i></div>
            <h5>{{ f.title }}</h5>
            <p class="text-muted">{{ f.text }}</p>
          </div>
        </div>
      </div>
    </section>
    <section id="auth" class="py-5 bg-light">
      <div class="container">
        <div class="row">
          <div class="col-md-6">
            <h2 class="h4 mb-3">Sign Up</h2>
            <form @submit.prevent="signup">
              <div class="mb-3">
                <input v-model="signupForm.username" class="form-control" placeholder="Username" required>
              </div>
              <div class="mb-3">
                <input v-model="signupForm.password" type="password" class="form-control" placeholder="Password" required>
              </div>
              <button class="btn btn-primary">Sign Up</button>
            </form>
          </div>
          <div class="col-md-6 mt-4 mt-md-0">
            <h2 class="h4 mb-3">Login</h2>
            <form @submit.prevent="login">
              <div class="mb-3">
                <input v-model="loginForm.username" class="form-control" placeholder="Username" required>
              </div>
              <div class="mb-3">
                <input v-model="loginForm.password" type="password" class="form-control" placeholder="Password" required>
              </div>
              <button class="btn btn-primary">Login</button>
            </form>
          </div>
        </div>
      </div>
    </section>
  </div>
  `,
  data() {
    return {
      loginForm: { username:'', password:'' },
      signupForm: { username:'', password:'' },
      features: [
        { icon:'bi bi-diagram-3', title:'Map', text:'Visualize your landscape' },
        { icon:'bi bi-brush', title:'Edit', text:'Refine components and links' },
        { icon:'bi bi-chat-dots', title:'Discuss', text:'Chat about strategy' }
      ]
    };
  },
  methods: {
    scrollToAuth() {
      const el = document.getElementById('auth');
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    },
    async login() {
      try {
        const res = await fetch(API + '/login', {
          method:'POST',
          headers:{'Content-Type':'application/json'},
          body: JSON.stringify(this.loginForm)
        });
        const data = await res.json();
        if(!res.ok) return alert(data.error||'Login failed');
        localStorage.setItem('token', data.token);
        this.$router.push('/app');
      } catch(e) { alert('Login failed'); }
    },
    async signup() {
      try {
        const res = await fetch(API + '/signup', {
          method:'POST',
          headers:{'Content-Type':'application/json'},
          body: JSON.stringify(this.signupForm)
        });
        const data = await res.json();
        if(!res.ok) return alert(data.error||'Signup failed');
        localStorage.setItem('token', data.token);
        this.$router.push('/app');
      } catch(e) { alert('Signup failed'); }
    }
  }
};

const Dashboard = {
  template: `
  <div id="wrapper">
    <div id="sidebar-wrapper" :class="{collapsed: sidebarCollapsed}" class="border-end">
      <div class="sidebar-heading p-3">Wardley Mapper</div>
      <div class="list-group list-group-flush">
        <a v-for="m in maps" :key="m.id" class="list-group-item list-group-item-action" href="#" @click.prevent="selectMap(m)">
          {{ m.name }}
        </a>
        <a class="list-group-item list-group-item-action" href="#" @click.prevent="newMap">+ New Map</a>
      </div>
    </div>
    <div id="page-content-wrapper">
      <nav class="navbar navbar-light bg-light border-bottom">
        <button class="btn btn-outline-primary" @click="toggleSidebar">☰</button>
        <div class="ms-auto">
          <button class="btn btn-outline-secondary" @click="logout">Logout</button>
        </div>
      </nav>
      <div class="container-fluid mt-4">
        <h1 v-if="currentMap" class="d-inline-flex align-items-center gap-2">
          <span v-if="!editingMapName" @click="startEditMapName" style="cursor:text;">{{ currentMap.name }}</span>
          <span v-else class="d-inline-flex align-items-center gap-2">
            <input class="form-control form-control-sm" v-model="mapNameDraft" style="min-width: 260px; display:inline-block;" @keydown="onMapNameKeydown" />
            <button class="btn btn-sm btn-primary" @click="saveMapName" title="Save"><i class="bi bi-check"></i></button>
            <button class="btn btn-sm btn-outline-secondary" @click="cancelMapName" title="Cancel"><i class="bi bi-x"></i></button>
          </span>
        </h1>
        <div v-else>
          <div class="row g-4">
            <div class="col-12 col-lg-6">
              <div class="card h-100">
                <div class="card-body">
                  <h5 class="card-title">Generate a Map with AI</h5>
                  <p class="text-muted">Describe your context and goals. We’ll draft components and links.</p>
                  <textarea class="form-control mb-2" rows="5" v-model="aiPrompt" placeholder="e.g., Map a payments platform for SMB merchants focusing on onboarding and risk"></textarea>
                  <button class="btn btn-primary" :disabled="generating || !aiPrompt.trim()" @click="aiGenerateMap">{{ generating ? 'Generating…' : 'Generate Map' }}</button>
                </div>
              </div>
            </div>
            <div class="col-12 col-lg-6">
              <div class="card h-100">
                <div class="card-body d-flex flex-column">
                  <h5 class="card-title">Start Wizard</h5>
                  <p class="text-muted">Step through users → needs → capabilities → evolution, then create a map.</p>
                  <div class="mt-auto d-flex gap-2">
                    <button class="btn btn-outline-primary" @click="openWizard">Open Wizard</button>
                    <button class="btn btn-outline-secondary" @click="createBlankMap">Start Blank Map</button>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <p class="text-muted mt-4" v-if="!maps.length">No maps yet — generate one, start the wizard, or use “New Map”.</p>
        </div>
        <div v-if="currentMap">
          <div class="map-toolbar mb-2">
            <button class="toolbar-btn" :class="{active: mode==='select'}" @click="setMode('select')" title="Select / Drag"><i class="bi bi-cursor"></i></button>
            <button class="toolbar-btn" :class="{active: mode==='link'}" @click="setMode('link')" title="Link Mode"><i class="bi bi-link-45deg"></i></button>
            <span class="toolbar-sep"></span>
            <button class="toolbar-btn" @click="addComponent" title="Add Component"><i class="bi bi-plus-lg"></i></button>
            <button class="toolbar-btn" :disabled="!selectedComponent" @click="deleteSelected" title="Delete Component"><i class="bi bi-trash"></i></button>
            <button class="toolbar-btn" :disabled="!selectedLink" @click="deleteSelectedLink" title="Delete Link"><i class="bi bi-scissors"></i></button>
            <span class="ms-2 text-muted" v-if="mode==='link' && linkFrom">Link: {{ linkFrom.name }} → (choose target)</span>
            <div class="ms-auto d-flex align-items-center gap-2">
              <button class="toolbar-btn" @click="toggleChat" :title="showChat ? 'Hide Chat' : 'Show Chat'"><i class="bi bi-chat-dots"></i></button>
            </div>
          </div>
          <div class="map-wrap mb-3">
            <canvas id="mapCanvas" class="map-canvas" width="1200" height="640"></canvas>
          </div>

          <!-- Component editor panel -->
          <div class="editor-panel mb-4" v-if="selectedComponent">
            <div class="d-flex justify-content-between align-items-center mb-2">
              <strong>Edit Component</strong>
              <span class="text-muted small">ID {{ selectedComponent.id }}</span>
            </div>
            <div class="row g-2 align-items-center">
              <div class="col-12 col-md-6">
                <label class="form-label form-label-sm">Name</label>
                <input class="form-control" v-model="componentNameDraft" :disabled="(selectedComponent.kind||'').toLowerCase()==='user'" @keydown="onComponentNameKeydown" />
              </div>
              <div class="col-12 col-md-6">
                <label class="form-label form-label-sm">Kind</label>
                <select class="form-select" v-model="componentKindDraft">
                  <option value="user">User</option>
                  <option value="need">Need</option>
                  <option value="capability">Capability</option>
                </select>
              </div>
              <div class="col-12 d-flex align-items-center gap-2 mt-2">
                <button class="btn btn-sm btn-primary" :disabled="componentSaving" @click="saveSelectedComponent">Save</button>
                <button class="btn btn-sm btn-outline-secondary" :disabled="componentSaving" @click="resetSelectedDrafts">Reset</button>
                <span v-if="componentSaved" class="text-success small">Saved</span>
              </div>
            </div>
          </div>

          <!-- Right-side Chat Drawer -->
          <div class="chat-drawer" :class="{ collapsed: !showChat }">
            <div class="d-flex align-items-center justify-content-between p-2 border-bottom">
              <strong>Chat</strong>
              <button class="btn btn-sm btn-outline-secondary" @click="toggleChat" title="Close"><i class="bi bi-x"></i></button>
            </div>
            <div class="chat-body">
              <div v-for="(m, i) in chatMessages" :key="i" class="chat-msg">
                <span class="role" :class="{ 'text-primary': m.role==='user', 'text-success': m.role==='assistant' }">{{ m.role }}:</span>
                <span class="content">{{ m.content }}</span>
              </div>
            </div>
            <form class="chat-input d-flex" @submit.prevent="sendChat">
              <input class="form-control me-2" v-model="chatInput" placeholder="Ask the assistant about this map..." />
              <button class="btn btn-primary" :disabled="sendingChat || !chatInput.trim()">{{ sendingChat ? 'Sending…' : 'Send' }}</button>
            </form>
          </div>
        </div>
        <!-- Wizard overlay -->
        <div v-if="wizardOpen" class="wizard-overlay">
          <div class="wizard-modal card shadow">
            <div class="card-body">
              <div class="d-flex justify-content-between align-items-start mb-2">
                <h5 class="mb-0">Map Wizard</h5>
                <button class="btn btn-sm btn-outline-secondary" @click="closeWizard" :disabled="wizardBusy">Close</button>
              </div>
              <div class="text-muted mb-3">Step {{ wizardStep }} of 4</div>

              <div v-show="wizardStep===1">
                <h6>1) Who is the user?</h6>
                <input class="form-control" v-model="wizard.userName" placeholder="e.g., Small Business Owner" />
                <div class="form-text">Enter a single primary user.</div>
              </div>
              <div v-show="wizardStep===2">
                <h6>2) What does the user need?</h6>
                <input class="form-control" v-model="wizard.needName" placeholder="e.g., Accept online payments" />
                <div class="form-text">Describe one top-level need.</div>
              </div>
              <div v-show="wizardStep===3">
                <h6>3) Capabilities</h6>
                <div class="d-flex gap-2 mb-2">
                  <input class="form-control" v-model="wizard.capabilityInput" placeholder="Add a capability (press Add)" />
                  <button class="btn btn-outline-primary" @click="addCapabilityFromInput">Add</button>
                </div>
                <div v-if="wizard.capabilities.length" class="mb-2">
                  <div class="small text-muted mb-1">Added capabilities</div>
                  <ul class="list-group">
                    <li class="list-group-item d-flex justify-content-between align-items-center" v-for="(c,i) in wizard.capabilities" :key="i">
                      <span>{{ c }}</span>
                      <button class="btn btn-sm btn-outline-danger" @click="removeCapability(i)">Remove</button>
                    </li>
                  </ul>
                </div>
                <div class="mt-3 d-flex align-items-center gap-2">
                  <button class="btn btn-outline-primary" @click="regenerateCapabilityIdeas" :disabled="wizardBusy">
                    <i class="bi bi-stars me-1"></i>{{ wizard.capabilityIdeas.length ? 'Regenerate Ideas' : 'Generate Ideas' }}
                  </button>
                  <span v-if="wizardBusy" class="text-muted small">Working…</span>
                </div>
                <div class="mt-2" v-if="wizard.capabilityIdeas.length">
                  <div class="small text-muted mb-1">Suggested ideas</div>
                  <div class="d-flex flex-wrap gap-2">
                    <button type="button" class="btn btn-sm" :class="it.selected ? 'btn-success' : 'btn-outline-secondary'" @click="toggleIdeaSelected(i)" v-for="(it,i) in wizard.capabilityIdeas" :key="i">{{ it.name }}</button>
                  </div>
                </div>
              </div>
              <div v-show="wizardStep===4">
                <h6>4) Review</h6>
                <p class="mb-1"><strong>User:</strong> {{ wizard.userName }}</p>
                <p class="mb-1"><strong>Need:</strong> {{ wizard.needName }}</p>
                <div><strong>Capabilities:</strong>
                  <span v-for="(c,i) in wizard.capabilities" :key="i" class="badge text-bg-light me-1">{{ c }}</span>
                  <span v-for="(it,i) in wizard.capabilityIdeas.filter(x=>x.selected)" :key="'s'+i" class="badge text-bg-light me-1">{{ it.name }}</span>
                </div>
                <div class="alert alert-info mt-2">Click Create Map to build a draft with these items.</div>
              </div>

              <div class="d-flex justify-content-between mt-3">
                <button class="btn btn-outline-secondary" @click="wizardBack" :disabled="wizardBusy || wizardStep===1">Back</button>
                <button class="btn btn-primary" @click="wizardNext" :disabled="wizardBusy || (wizardStep===1 && !wizard.userName.trim()) || (wizardStep===2 && !wizard.needName.trim())">
                  <span v-if="wizardBusy">Working…</span>
                  <span v-else>{{ wizardStep<4 ? 'Next' : 'Create Map' }}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
  `,
  data() {
    return {
      maps: [],
      currentMap: null,
      sidebarCollapsed:false,
      // Map state
      components: [],
      links: [],
      selectedComponent: null,
      selectedLink: null,
      dragging: null,
      linkFrom: null,
      hoverComponent: null,
      hoverLink: null,
      mode: 'select',
      // Chat state
      chatMessages: [],
      chatInput: '',
      sendingChat: false,
      showChat: false,
      // internals
      canvas: null,
      ctx: null,
      // AI generate
      aiPrompt: '',
      generating: false,
      // Wizard
      wizardOpen: false,
      wizardStep: 1,
      wizardBusy: false,
      wizard: {
        userName: '',
        needName: '',
        capabilityInput: '',
        capabilities: [], // manually added
        capabilityIdeas: [] // { name, selected }
      },
      // Map name editing
      editingMapName: false,
      mapNameDraft: '',
      // Component editor drafts
      componentNameDraft: '',
      componentKindDraft: 'capability',
      componentSaving: false,
      componentSaved: false
    };
  },
  created() {
    this.populateMaps();
  },
  watch: {
    currentMap(newMap) {
      if (newMap) {
        // Ensure canvas is present before wiring events and drawing
        this.$nextTick(() => {
          this.setupCanvas();
          this.draw();
        });
        this.loadMap();
        this.loadChat();
      }
    },
    selectedComponent(newVal){
      if (newVal) { this.componentNameDraft = newVal.name; this.componentKindDraft = (newVal.kind||'capability'); }
    }
  },
  mounted() {
    this.setupCanvas();
  },
  computed: {
    linksWithNames(){
      const byId = new Map(this.components.map(c => [c.id, c.name]));
      return (this.links || []).map(l => ({
        id: l.id,
        fromName: l.fromName || byId.get(l.source_component_id || l.sourceId) || '',
        toName: l.toName || byId.get(l.target_component_id || l.targetId) || ''
      }));
    }
  },
  methods: {
    toggleSidebar(){ this.sidebarCollapsed=!this.sidebarCollapsed; },
    async populateMaps(){
      try {
        const res = await fetch(API + '/maps', {
          headers:{ 'Authorization':'Bearer '+localStorage.getItem('token') }
        });
        const data = await res.json();
        if(res.ok) this.maps = data;
      } catch(e) { /* ignore */ }
    },
    selectMap(m){
      this.currentMap = m;
    },
    // Map name editing
    startEditMapName(){ this.editingMapName = true; this.mapNameDraft = this.currentMap?.name || ''; },
    async saveMapName(){
      const name = (this.mapNameDraft || '').trim();
      if (!name) { this.cancelMapName(); return; }
      try {
        const res = await fetch(API + `/maps/${this.currentMap.id}`, {
          method:'PATCH', headers:{ 'Content-Type':'application/json', 'Authorization':'Bearer '+localStorage.getItem('token') },
          body: JSON.stringify({ name })
        });
        const data = await res.json();
        if (res.ok) {
          this.currentMap.name = data.name || name;
          const idx = this.maps.findIndex(x => x.id === this.currentMap.id);
          if (idx >= 0) this.maps[idx].name = this.currentMap.name;
        }
      } catch(e) { /* ignore */ }
      this.editingMapName = false;
    },
    cancelMapName(){ this.editingMapName = false; },
    onMapNameKeydown(e){
      if (e.key === 'Enter') { e.preventDefault(); this.saveMapName(); }
      else if (e.key === 'Escape' || e.key === 'Esc') { e.preventDefault(); this.cancelMapName(); }
    },
    async aiGenerateMap(){
      if (!this.aiPrompt.trim()) return;
      this.generating = true;
      try {
        const res = await fetch(API + '/ai/generate-map', {
          method:'POST',
          headers:{ 'Content-Type':'application/json', 'Authorization':'Bearer '+localStorage.getItem('token') },
          body: JSON.stringify({ prompt: this.aiPrompt.trim() })
        });
        const data = await res.json();
        if (!res.ok) {
          alert(data.error || 'Failed to generate map');
          return;
        }
        // Add to list and select
        const { id, name, components = [], links = [] } = data || {};
        const newMap = { id, name };
        this.maps.unshift(newMap);
        this.currentMap = newMap;
        this.components = components;
        this.links = links;
        this.chatMessages = [];
        this.draw();
      } catch (e) {
        alert('Failed to generate map');
      } finally {
        this.generating = false;
      }
    },
    // Wizard flow (manual user/need/capabilities)
    openWizard(){
      this.wizardOpen = true; this.wizardStep = 1; this.wizardBusy = false;
      this.wizard = { userName:'', needName:'', capabilityInput:'', capabilities:[], capabilityIdeas:[] };
    },
    closeWizard(){ if (!this.wizardBusy) this.wizardOpen = false; },
    wizardBack(){ if (this.wizardStep > 1) this.wizardStep--; },
    async wizardNext(){
      if (this.wizardStep === 1) {
        if (!this.wizard.userName.trim()) return;
        this.wizardStep = 2;
      } else if (this.wizardStep === 2) {
        if (!this.wizard.needName.trim()) return;
        // Move to capabilities step and auto-generate suggestions
        this.wizard.capabilityIdeas = [];
        this.wizardStep = 3;
        await this.regenerateCapabilityIdeas();
      } else if (this.wizardStep === 3) {
        // Ensure at least one capability
        const chosen = new Set(this.wizard.capabilities.map(s => s.trim()).filter(Boolean));
        for (const idea of this.wizard.capabilityIdeas) if (idea.selected) chosen.add(idea.name);
        if (!chosen.size) return;
        this.wizard.capabilities = Array.from(chosen);
        this.wizardStep = 4;
      } else if (this.wizardStep === 4) {
        this.createWizardMap();
      }
    },
    addCapabilityFromInput(){
      const v = (this.wizard.capabilityInput || '').trim();
      if (!v) return;
      if (!this.wizard.capabilities.includes(v)) this.wizard.capabilities.push(v);
      this.wizard.capabilityInput = '';
    },
    toggleIdeaSelected(idx){ const it = this.wizard.capabilityIdeas[idx]; if (it) it.selected = !it.selected; },
    removeCapability(idx){ this.wizard.capabilities.splice(idx,1); },
    async regenerateCapabilityIdeas(){
      this.wizardBusy = true;
      try {
        const local = this.prepareCapabilityIdeas(this.wizard.needName);
        let ai = [];
        try {
          const payload = {
            needs: [{ name: this.wizard.needName, forUser: this.wizard.userName }],
            context: `User: ${this.wizard.userName}\nNeed: ${this.wizard.needName}`
          };
          const res = await fetch(API + '/ai/wizard/capabilities', {
            method:'POST', headers:{ 'Content-Type':'application/json', 'Authorization':'Bearer '+localStorage.getItem('token') },
            body: JSON.stringify(payload)
          });
          const data = await res.json();
          if (res.ok) ai = (data.capabilities || data || []).map(x => x.name || x).filter(Boolean);
        } catch (e) { /* ignore AI errors; show local */ }
        const set = new Set([ ...local, ...ai ]);
        this.wizard.capabilityIdeas = Array.from(set).map(n => ({ name:n, selected:false }));
      } finally {
        this.wizardBusy = false;
      }
    },
    prepareCapabilityIdeas(needText){
      // Start with no defaults; add contextually based on keywords
      const out = new Set();
      const text = (needText||'').toLowerCase();
      const words = text.split(/[^a-z0-9]+/).filter(Boolean);
      const has = (...ks) => ks.some(k => text.includes(k));

      // Auth only if relevant
      if (has('login','authenticate','auth','secure','security','account','user')) {
        out.add('Authentication'); out.add('Authorization'); out.add('Profile Service'); out.add('Onboarding');
      }
      // Payments domain
      if (has('payment','checkout','billing','invoice','subscription')) {
        out.add('Payments'); out.add('Fraud Detection'); out.add('Reconciliation'); out.add('Ledger');
      }
      // Search
      if (has('search','discover','find')) { out.add('Search'); out.add('Indexing'); out.add('Relevance Tuning'); }
      // Notifications/Comms
      if (has('notify','notification','email','sms','message','chat')) { out.add('Notifications'); out.add('Email Service'); out.add('SMS Service'); }
      // Analytics/Reporting
      if (has('report','analytics','insight','metric','dashboard')) { out.add('Reporting'); out.add('Analytics'); out.add('Data Pipeline'); }
      // Media/static delivery
      if (has('image','video','media','static','asset')) { out.add('CDN'); out.add('Transcoding'); }
      // Performance/latency
      if (has('fast','performance','latency','scale','traffic','load')) { out.add('Cache'); out.add('Monitoring'); }
      // Async/events/processing
      if (has('event','async','background','job','queue','stream')) { out.add('Queueing'); out.add('Stream Processing'); }
      // API/platform
      if (has('api','integrate','integration','partner')) { out.add('API Gateway'); out.add('Webhook Service'); }
      // Storage only if data/files explicitly mentioned
      if (has('file','upload','download','store','storage','data lake','archive')) { out.add('Storage'); }

      return Array.from(out).slice(0, 18);
    },
    async createWizardMap(){
      this.wizardBusy = true;
      try {
        // 1) Create map
        const title = `${this.wizard.userName} — ${this.wizard.needName}`;
        const res = await fetch(API + '/maps', {
          method:'POST', headers:{ 'Content-Type':'application/json', 'Authorization':'Bearer '+localStorage.getItem('token') },
          body: JSON.stringify({ name: title })
        });
        const mapData = await res.json();
        if (!res.ok) throw new Error('create map failed');
        const mapId = mapData.id;
        // 2) Add components
        const addComp = async (payload) => {
          const r = await fetch(API + `/maps/${mapId}/components`, { method:'POST', headers:{ 'Content-Type':'application/json', 'Authorization':'Bearer '+localStorage.getItem('token') }, body: JSON.stringify(payload) });
          const d = await r.json(); if (!r.ok) throw new Error('add component failed'); return d;
        };
        const user = await addComp({ name: this.wizard.userName, kind:'user', evolution:0.5, visibility: 0.99 });
        const need = await addComp({ name: this.wizard.needName, kind:'need', evolution:0.45, visibility: 0.9 });
        const caps = [];
        const arr = this.wizard.capabilities;
        for (let i=0;i<arr.length;i++){
          const evo = 0.2 + (i/(Math.max(arr.length-1,1))) * 0.6; // spread across x
          const vis = 0.6 - (i/(Math.max(arr.length-1,1))) * 0.2; // slight slope
          caps.push(await addComp({ name: arr[i], kind:'capability', evolution: evo, visibility: vis }));
        }
        // 3) Add links: user->need, need->each capability
        const addLink = async (sourceId, targetId) => {
          const r = await fetch(API + `/maps/${mapId}/links`, { method:'POST', headers:{ 'Content-Type':'application/json', 'Authorization':'Bearer '+localStorage.getItem('token') }, body: JSON.stringify({ sourceId, targetId }) });
          if (!r.ok) throw new Error('add link failed');
        };
        await addLink(user.id, need.id);
        for (const c of caps) await addLink(need.id, c.id);
        // 4) Load map in UI
        const newMap = { id: mapId, name: mapData.name };
        this.maps.unshift(newMap);
        this.currentMap = newMap;
        this.components = [user, need, ...caps];
        // fetch links for consistent shape
        const lr = await fetch(API + `/maps/${mapId}`, { headers:{ 'Authorization':'Bearer '+localStorage.getItem('token') } });
        const ldata = await lr.json();
        this.links = ldata.links || [];
        this.chatMessages = [];
        this.wizardOpen = false;
        this.$nextTick(() => { this.setupCanvas(); this.draw(); });
      } catch (e) {
        alert('Failed to create map');
      } finally {
        this.wizardBusy = false;
      }
    },
    async loadMap() {
      try {
        const res = await fetch(API + `/maps/${this.currentMap.id}`, {
          headers:{ 'Authorization':'Bearer '+localStorage.getItem('token') }
        });
        const data = await res.json();
        if(res.ok){
          this.components = data.components || [];
          this.links = data.links || [];
          this.draw();
        }
      } catch (e) { /* ignore */ }
    },
    async newMap(){
      // Show the creation panel (AI / Wizard / Blank)
      this.currentMap = null;
      this.$nextTick(() => { window.scrollTo({ top: 0, behavior: 'smooth' }); });
    },
    async createBlankMap(){
      try {
        const res = await fetch(API + '/maps', {
          method:'POST',
          headers:{'Content-Type':'application/json','Authorization':'Bearer '+localStorage.getItem('token')},
          body: JSON.stringify({ name: 'Untitled Map' })
        });
        const data = await res.json();
        if(res.ok){
          this.maps.unshift({ id: data.id, name: data.name });
          this.currentMap = { id: data.id, name: data.name };
          this.components = []; this.links = []; this.chatMessages = [];
          this.$nextTick(() => { this.setupCanvas(); this.draw(); });
        } else alert('Failed to create');
      } catch(e){ alert('Failed to create'); }
    },
    // Canvas setup and drawing
    setupCanvas(){
      this.canvas = document.getElementById('mapCanvas');
      if (!this.canvas) return;
      this.ctx = this.canvas.getContext('2d');
      const onDown = (e) => {
        const p = this.getMousePos(e);
        const hitComp = this.hitTestComponent(p.x, p.y);
        const hitLink = hitComp ? null : this.hitTestLink(p.x, p.y);
        if (this.mode === 'select') {
          if (hitComp) {
            this.selectedLink = null;
            this.selectedComponent = hitComp;
            if ((hitComp.kind||'').toLowerCase() !== 'user') {
              this.dragging = { comp: hitComp, startX: p.x, startY: p.y };
            }
          } else if (hitLink) {
            this.selectedComponent = null;
            this.selectedLink = hitLink;
          } else {
            this.selectedComponent = null;
            this.selectedLink = null;
          }
        } else if (this.mode === 'link') {
          if (!this.linkFrom && hitComp) {
            this.linkFrom = hitComp;
          } else if (this.linkFrom && hitComp && hitComp.id !== this.linkFrom.id) {
            this.createLink(this.linkFrom.id, hitComp.id);
            this.linkFrom = null;
          }
        }
        this.updateCursor();
        this.draw();
      };
      const onMove = (e) => {
        const p = this.getMousePos(e);
        if (this.dragging) {
          const xNorm = p.x / this.canvas.width;
          const yNorm = p.y / this.canvas.height;
          this.dragging.comp.evolution = this.clamp01(xNorm);
          this.dragging.comp.visibility = this.clamp01(1 - yNorm);
          this.draw();
          return;
        }
        // Hover detection
        const hComp = this.hitTestComponent(p.x, p.y);
        const hLink = hComp ? null : this.hitTestLink(p.x, p.y);
        this.hoverComponent = hComp;
        this.hoverLink = hLink;
        this.updateCursor();
        this.draw();
      };
      const onKeyDown = async (e) => {
        const t = e.target;
        const tag = (t && t.tagName) ? t.tagName.toLowerCase() : '';
        const isEditable = (t && (t.isContentEditable || tag === 'input' || tag === 'textarea' || tag === 'select'));
        if (isEditable) return; // do not intercept typing/backspace in inputs
        if (e.key === 'Delete' || e.key === 'Backspace') {
          if (this.selectedComponent) {
            e.preventDefault();
            await this.deleteSelected();
          } else if (this.selectedLink) {
            e.preventDefault();
            await this.deleteSelectedLink();
          }
        }
      };
      const onUp = async () => {
        if (this.dragging) {
          const c = this.dragging.comp;
          this.dragging = null;
          // Persist position
          try {
            await fetch(API + `/maps/${this.currentMap.id}/components/${c.id}`, {
              method: 'PATCH',
              headers: { 'Content-Type':'application/json', 'Authorization':'Bearer '+localStorage.getItem('token') },
              body: JSON.stringify({ evolution: c.evolution, visibility: c.visibility })
            });
          } catch (e) { /* ignore */ }
        }
      };
      this.canvas.addEventListener('mousedown', onDown);
      window.addEventListener('mousemove', onMove);
      window.addEventListener('mouseup', onUp);
      window.addEventListener('keydown', onKeyDown);
    },
    updateCursor(){
      if (!this.canvas) return;
      if (this.dragging) { this.canvas.style.cursor = 'move'; return; }
      if (this.mode === 'link') { this.canvas.style.cursor = this.hoverComponent ? 'pointer' : 'crosshair'; return; }
      if (this.hoverComponent) { this.canvas.style.cursor = ((this.hoverComponent.kind||'').toLowerCase() === 'user') ? 'default' : 'pointer'; return; }
      if (this.hoverLink) { this.canvas.style.cursor = 'pointer'; return; }
      this.canvas.style.cursor = 'default';
    },
    draw(){
      if (!this.ctx || !this.canvas) return;
      const ctx = this.ctx;
      const W = this.canvas.width;
      const H = this.canvas.height;
      ctx.clearRect(0,0,W,H);
      // background
      ctx.fillStyle = '#fff';
      ctx.fillRect(0,0,W,H);
      // vertical gridlines for Wardley stages
      ctx.strokeStyle = '#e9ecef';
      ctx.lineWidth = 1;
      for (let i=1;i<4;i++){
        const x = (i/4)*W; ctx.beginPath(); ctx.moveTo(x,0); ctx.lineTo(x,H); ctx.stroke();
      }
      // left y-axis line
      ctx.strokeStyle = '#adb5bd';
      ctx.beginPath(); ctx.moveTo(0,0); ctx.lineTo(0,H); ctx.stroke();
      // axis labels and stage labels
      const stages = ['Genesis','Custom','Product','Commodity'];
      ctx.fillStyle = '#495057';
      ctx.font = '13px system-ui';
      ctx.textAlign = 'start';
      ctx.textBaseline = 'alphabetic';
      ctx.fillText('Visible', 8, 16);
      ctx.fillText('Invisible', 8, H-8);
      ctx.fillText('Evolution →', W-110, H-8);
      // stage labels centered in each quarter at bottom
      ctx.font = '13px system-ui';
      ctx.fillStyle = '#343a40';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'alphabetic';
      for (let i=0;i<4;i++){
        const cx = ((i + 0.5)/4) * W;
        ctx.fillText(stages[i], cx, H - 24);
      }
      // Vertical 'Value Chain'
      ctx.save();
      ctx.translate(22, H/2);
      ctx.rotate(-Math.PI/2);
      ctx.font = 'bold 18px system-ui';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = '#212529';
      ctx.fillText('Value Chain', 0, 0);
      ctx.restore();
      // links
      const byId = new Map(this.components.map(c => [c.id, c]));
      for (const l of this.links) {
        const a = byId.get(l.source_component_id || l.sourceId);
        const b = byId.get(l.target_component_id || l.targetId);
        if (!a || !b) continue;
        const A = this.getComponentXY(a, W, H);
        const B = this.getComponentXY(b, W, H);
        if (this.selectedLink && this.selectedLink.id === l.id) { ctx.strokeStyle = '#dc3545'; ctx.lineWidth = 3; }
        else if (this.hoverLink && this.hoverLink.id === l.id) { ctx.strokeStyle = '#0d6efd'; ctx.lineWidth = 3; }
        else { ctx.strokeStyle = '#adb5bd'; ctx.lineWidth = 2; }
        ctx.beginPath(); ctx.moveTo(A.x, A.y); ctx.lineTo(B.x, B.y); ctx.stroke();
      }
      // components
      for (const c of this.components) {
        const { x, y } = this.getComponentXY(c, W, H);
        const selected = this.selectedComponent && this.selectedComponent.id === c.id;
        const hovered = this.hoverComponent && this.hoverComponent.id === c.id;
        const color = selected ? '#0b5ed7' : hovered ? '#20c997' : '#0d6efd';
        const r = selected ? 9 : 7;
        const kind = (c.kind||'').toLowerCase();
        if (kind === 'user') {
          this.drawPerson(ctx, x, y, color);
        } else if (kind === 'need') {
          this.drawSquare(ctx, x, y, r, color);
        } else {
          this.drawCircle(ctx, x, y, r, color);
        }
        ctx.fillStyle = '#212529';
        ctx.font = '12px system-ui';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'alphabetic';
        ctx.fillText(c.name, x + 10, y - 10);
      }
    },
    getMousePos(e){
      const rect = this.canvas.getBoundingClientRect();
      const x = (e.clientX - rect.left) / rect.width * this.canvas.width;
      const y = (e.clientY - rect.top) / rect.height * this.canvas.height;
      return { x, y };
    },
    getComponentXY(c, W, H){
      if ((c.kind||'').toLowerCase() === 'user') return { x: 0.5 * W, y: 24 };
      return { x: this.clamp01(c.evolution) * W, y: (1 - this.clamp01(c.visibility)) * H };
    },
    drawCircle(ctx, x, y, r, color){ ctx.beginPath(); ctx.fillStyle = color; ctx.arc(x, y, r, 0, Math.PI*2); ctx.fill(); },
    drawSquare(ctx, x, y, r, color){ const s = r*2; ctx.fillStyle = color; ctx.fillRect(x - r, y - r, s, s); },
    drawPerson(ctx, x, y, color){
      ctx.save();
      ctx.strokeStyle = color; ctx.fillStyle = color; ctx.lineWidth = 2;
      // head
      ctx.beginPath(); ctx.arc(x, y - 10, 6, 0, Math.PI*2); ctx.stroke();
      // body
      ctx.beginPath(); ctx.moveTo(x, y - 4); ctx.lineTo(x, y + 12); ctx.stroke();
      // arms
      ctx.beginPath(); ctx.moveTo(x - 10, y + 2); ctx.lineTo(x + 10, y + 2); ctx.stroke();
      // legs
      ctx.beginPath(); ctx.moveTo(x, y + 12); ctx.lineTo(x - 8, y + 24); ctx.moveTo(x, y + 12); ctx.lineTo(x + 8, y + 24); ctx.stroke();
      ctx.restore();
    },
    hitTestComponent(px, py){
      const W = this.canvas.width; const H = this.canvas.height;
      for (const c of this.components) {
        const { x, y } = this.getComponentXY(c, W, H);
        const dx = px - x; const dy = py - y; const r = 12;
        if (dx*dx + dy*dy <= r*r) return c;
      }
      return null;
    },
    hitTestLink(px, py){
      const W = this.canvas.width; const H = this.canvas.height;
      const byId = new Map(this.components.map(c => [c.id, c]));
      const thresh = 6;
      for (const l of this.links) {
        const a = byId.get(l.source_component_id || l.sourceId);
        const b = byId.get(l.target_component_id || l.targetId);
        if (!a || !b) continue;
        const A = this.getComponentXY(a, W, H);
        const B = this.getComponentXY(b, W, H);
        const d = this.pointToSegDist({x:px,y:py}, A, B);
        if (d <= thresh) return l;
      }
      return null;
    },
    pointToSegDist(P, A, B){
      const vx = B.x - A.x, vy = B.y - A.y;
      const wx = P.x - A.x, wy = P.y - A.y;
      const c1 = vx*wx + vy*wy; if (c1 <= 0) return Math.hypot(P.x - A.x, P.y - A.y);
      const c2 = vx*vx + vy*vy; if (c2 <= c1) return Math.hypot(P.x - B.x, P.y - B.y);
      const t = c1 / c2; const px = A.x + t*vx, py = A.y + t*vy; return Math.hypot(P.x - px, P.y - py);
    },
    clamp01(v){ return Math.max(0, Math.min(1, v)); },
    setMode(m){ this.mode = m; this.linkFrom = null; },
    async addComponent(){
      const name = prompt('Component name');
      if (!name) return;
      try {
        const res = await fetch(API + `/maps/${this.currentMap.id}/components`, {
          method:'POST',
          headers:{ 'Content-Type':'application/json', 'Authorization':'Bearer '+localStorage.getItem('token') },
          body: JSON.stringify({ name, evolution: 0.5, visibility: 0.5 })
        });
        const data = await res.json();
        if (res.ok) { this.components.push(data); this.draw(); }
      } catch (e) { /* ignore */ }
    },
    async deleteSelected(){
      if (!this.selectedComponent) return;
      const id = this.selectedComponent.id;
      if (!confirm('Delete component and its links?')) return;
      try {
        const res = await fetch(API + `/maps/${this.currentMap.id}/components/${id}`, {
          method:'DELETE',
          headers:{ 'Authorization':'Bearer '+localStorage.getItem('token') }
        });
        if (res.status === 204) {
          this.components = this.components.filter(c => c.id !== id);
          this.links = this.links.filter(l => l.source_component_id !== id && l.target_component_id !== id);
          this.selectedComponent = null;
          this.draw();
        }
      } catch (e) { /* ignore */ }
    },
    // Component editor helpers
    resetSelectedDrafts(){
      if (!this.selectedComponent) return;
      this.componentNameDraft = this.selectedComponent.name;
      this.componentKindDraft = (this.selectedComponent.kind||'capability');
    },
    async saveSelectedComponent(){
      this.componentSaved = false;
      this.componentSaving = true;
      if (!this.selectedComponent) return;
      const id = this.selectedComponent.id;
      const payload = {};
      const trimmed = (this.componentNameDraft || '').trim();
      if (trimmed && trimmed !== this.selectedComponent.name) payload.name = trimmed;
      const newKind = (this.componentKindDraft||'capability').toLowerCase();
      if (newKind !== (this.selectedComponent.kind||'capability')) payload.kind = newKind;
      if (!Object.keys(payload).length) return;
      try {
        const res = await fetch(API + `/maps/${this.currentMap.id}/components/${id}`, {
          method:'PATCH', headers:{ 'Content-Type':'application/json', 'Authorization':'Bearer '+localStorage.getItem('token') },
          body: JSON.stringify(payload)
        });
        const data = await res.json();
        if (res.ok) {
          const idx = this.components.findIndex(c => c.id === id);
          if (idx >= 0) this.components[idx] = data;
          this.selectedComponent = this.components[idx];
          this.draw();
          this.componentSaved = true;
          setTimeout(() => { this.componentSaved = false; }, 1200);
        }
      } catch(e) { /* ignore */ }
      finally { this.componentSaving = false; }
    },
    async createLink(fromId, toId){
      try {
        const res = await fetch(API + `/maps/${this.currentMap.id}/links`, {
          method:'POST',
          headers:{ 'Content-Type':'application/json', 'Authorization':'Bearer '+localStorage.getItem('token') },
          body: JSON.stringify({ sourceId: fromId, targetId: toId })
        });
        const data = await res.json();
        if (res.ok) { this.links.push(data); this.draw(); }
      } catch (e) { /* ignore */ }
    },
    onComponentNameKeydown(e){ if (e.key === 'Enter') { e.preventDefault(); this.saveSelectedComponent(); } },
    async deleteLink(linkId){
      try {
        const res = await fetch(API + `/maps/${this.currentMap.id}/links/${linkId}`, {
          method:'DELETE',
          headers:{ 'Authorization':'Bearer '+localStorage.getItem('token') }
        });
        if (res.status === 204) { this.links = this.links.filter(l => l.id !== linkId); this.draw(); }
      } catch (e) { /* ignore */ }
    },
    async deleteSelectedLink(){
      if (!this.selectedLink) return;
      const id = this.selectedLink.id;
      try {
        const res = await fetch(API + `/maps/${this.currentMap.id}/links/${id}`, {
          method:'DELETE',
          headers:{ 'Authorization':'Bearer '+localStorage.getItem('token') }
        });
        if (res.status === 204) {
          this.links = this.links.filter(l => l.id !== id);
          this.selectedLink = null; this.hoverLink = null;
          this.draw();
        }
      } catch (e) { /* ignore */ }
    },
    // Chat
    async loadChat(){
      try {
        const res = await fetch(API + `/maps/${this.currentMap.id}/chat`, {
          headers:{ 'Authorization':'Bearer '+localStorage.getItem('token') }
        });
        const data = await res.json();
        if (res.ok) this.chatMessages = data.messages || [];
      } catch (e) { this.chatMessages = []; }
    },
    async sendChat(){
      if (!this.chatInput.trim()) return;
      const msg = this.chatInput.trim();
      this.chatInput = '';
      this.chatMessages.push({ role: 'user', content: msg });
      this.sendingChat = true;
      try {
        const res = await fetch(API + `/maps/${this.currentMap.id}/chat`, {
          method:'POST',
          headers:{ 'Content-Type':'application/json', 'Authorization':'Bearer '+localStorage.getItem('token') },
          body: JSON.stringify({ message: msg })
        });
        const data = await res.json();
        if (res.ok) {
          this.chatMessages.push({ role: 'assistant', content: data.assistant });
          if (data.components) this.components = data.components;
          if (data.links) this.links = data.links;
          this.draw();
        } else {
          this.chatMessages.push({ role: 'assistant', content: data.error || 'Chat failed' });
        }
      } catch (e) {
        this.chatMessages.push({ role: 'assistant', content: 'Chat failed' });
      } finally {
        this.sendingChat = false;
      }
    },
    toggleChat(){ this.showChat = !this.showChat; },
    logout(){
      localStorage.removeItem('token');
      this.$router.push('/');
    }
  }
};

const routes = [
  { path:'/', component:LandingPage },
  { path:'/app', component:Dashboard },
  // Catch-all to avoid warnings when hash is used for anchors (e.g. #auth, #!)
  { path: '/:pathMatch(.*)*', redirect: '/' }
];

const router = createRouter({
  history: createWebHashHistory(),
  routes
});

// Root app renders the current route's component
const app = createApp({
  template: '<router-view />'
});
app.use(router);
app.mount('#app');
// Wizard overlay template (rendered by Dashboard component)
// Inline in component template below the map content for simplicity
