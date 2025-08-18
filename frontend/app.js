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
        <a class="btn btn-primary" href="#auth">Get Started</a>
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
        <h1 v-if="currentMap">{{ currentMap.name }}</h1>
        <p v-else class="text-muted">Select a map to begin.</p>
        <div v-if="currentMap">
          <canvas id="mapCanvas" width="1200" height="640" class="border rounded w-100 mb-4"></canvas>
          <p class="text-muted">Map editing coming soon.</p>
        </div>
      </div>
    </div>
  </div>
  `,
  data() {
    return {
      maps: [],
      currentMap: null,
      sidebarCollapsed:false
    };
  },
  created() {
    this.populateMaps();
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
    async newMap(){
      const name = prompt('Map name');
      if(!name) return;
      try {
        const res = await fetch(API + '/maps', {
          method:'POST',
          headers:{'Content-Type':'application/json','Authorization':'Bearer '+localStorage.getItem('token')},
          body: JSON.stringify({ name })
        });
        const data = await res.json();
        if(res.ok){
          this.maps.push(data);
          this.currentMap = data;
        } else alert('Failed to create');
      } catch(e){ alert('Failed to create'); }
    },
    logout(){
      localStorage.removeItem('token');
      this.$router.push('/');
    }
  }
};

const routes = [
  { path:'/', component:LandingPage },
  { path:'/app', component:Dashboard }
];

const router = createRouter({
  history: createWebHashHistory(),
  routes
});

const app = createApp({});
app.use(router);
app.mount('#app');
