const { createApp } = Vue;

createApp({
  data() {
    return {
      API: '',
      user: null,
      signupForm: { username: '', password: '' },
      loginForm: { username: '', password: '' },
      maps: [],
      prompt: '',
      genStatus: '',
      currentMap: null,
      components: [],
      links: []
    };
  },
  methods: {
    async signup() {
      const res = await fetch(this.API + '/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(this.signupForm)
      });
      const data = await res.json();
      if (data.token) {
        localStorage.setItem('token', data.token);
        await this.afterLogin();
      }
    },
    async login() {
      const res = await fetch(this.API + '/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(this.loginForm)
      });
      const data = await res.json();
      if (data.token) {
        localStorage.setItem('token', data.token);
        await this.afterLogin();
      }
    },
    async afterLogin() {
      const token = localStorage.getItem('token');
      const res = await fetch(this.API + '/dashboard', {
        headers: { 'Authorization': 'Bearer ' + token }
      });
      const data = await res.json();
      this.user = { message: data.message };
      await this.fetchMaps();
    },
    async logout() {
      const token = localStorage.getItem('token');
      await fetch(this.API + '/logout', {
        method: 'POST',
        headers: { 'Authorization': 'Bearer ' + token }
      });
      localStorage.removeItem('token');
      this.user = null;
      this.maps = [];
      this.currentMap = null;
    },
    async fetchMaps() {
      const res = await fetch(this.API + '/maps', {
        headers: { 'Authorization': 'Bearer ' + localStorage.getItem('token') }
      });
      this.maps = await res.json();
    },
    async generate() {
      if (!this.prompt) return;
      this.genStatus = 'Generating...';
      const res = await fetch(this.API + '/ai/generate-map', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer ' + localStorage.getItem('token')
        },
        body: JSON.stringify({ prompt: this.prompt })
      });
      const data = await res.json();
      if (res.ok) {
        this.currentMap = data;
        this.components = data.components || [];
        this.links = data.links || [];
        this.maps.unshift({ id: data.id, name: data.name });
        this.renderMap();
        this.genStatus = 'Done';
      } else {
        this.genStatus = data.error || 'Failed';
      }
    },
    async loadMap(map) {
      const res = await fetch(this.API + `/maps/${map.id}`, {
        headers: { 'Authorization': 'Bearer ' + localStorage.getItem('token') }
      });
      const data = await res.json();
      this.currentMap = data;
      this.components = data.components || [];
      this.links = data.links || [];
      this.renderMap();
    },
    async deleteMap(map) {
      await fetch(this.API + `/maps/${map.id}`, {
        method: 'DELETE',
        headers: { 'Authorization': 'Bearer ' + localStorage.getItem('token') }
      });
      this.maps = this.maps.filter(m => m.id !== map.id);
      if (this.currentMap && this.currentMap.id === map.id) {
        this.currentMap = null;
        this.components = [];
        this.links = [];
      }
    },
    renderMap() {
      const canvas = document.getElementById('mapCanvas');
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.strokeStyle = '#ccc';
      ctx.beginPath();
      ctx.moveTo(40, 10);
      ctx.lineTo(40, canvas.height - 30);
      ctx.lineTo(canvas.width - 10, canvas.height - 30);
      ctx.stroke();
      const toPixX = e => 40 + (canvas.width - 50) * e;
      const toPixY = v => canvas.height - 30 - (canvas.height - 40) * v;
      ctx.strokeStyle = '#888';
      for (const l of this.links) {
        const from = this.components.find(c => c.id === l.source_component_id);
        const to = this.components.find(c => c.id === l.target_component_id);
        if (from && to) {
          ctx.beginPath();
          ctx.moveTo(toPixX(from.evolution), toPixY(from.visibility));
          ctx.lineTo(toPixX(to.evolution), toPixY(to.visibility));
          ctx.stroke();
        }
      }
      ctx.fillStyle = '#0d6efd';
      for (const c of this.components) {
        const x = toPixX(c.evolution);
        const y = toPixY(c.visibility);
        ctx.beginPath();
        ctx.arc(x, y, 6, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#000';
        ctx.fillText(c.name, x + 8, y - 8);
        ctx.fillStyle = '#0d6efd';
      }
    }
  },
  mounted() {
    if (localStorage.getItem('token')) {
      this.afterLogin();
    }
  }
}).mount('#app');
