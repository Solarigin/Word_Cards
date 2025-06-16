const API_URL = 'http://localhost:8000';

function api(path, options = {}) {
  options.headers = options.headers || {};
  const token = localStorage.getItem('token');
  if (token) options.headers['Authorization'] = 'Bearer ' + token;
  if (options.body && !(options.body instanceof FormData)) {
    options.headers['Content-Type'] = 'application/json';
    options.body = JSON.stringify(options.body);
  }
  return fetch(API_URL + path, options).then(async (res) => {
    if (!res.ok) throw new Error(await res.text());
    const ct = res.headers.get('content-type');
    return ct && ct.includes('application/json') ? res.json() : res.text();
  });
}

function showLogin() {
  document.body.innerHTML = `
  <div class="p-4 max-w-sm mx-auto flex flex-col gap-2">
    <h1 class="text-center text-2xl font-semibold mb-2">Word Cards</h1>
    <input id="user" class="border p-2" placeholder="Username">
    <input id="pwd" class="border p-2" type="password" placeholder="Password">
    <button id="login" class="border rounded px-4 py-2 shadow bg-blue-500 text-white">Login</button>
    <button id="register" class="border rounded px-4 py-2 shadow bg-white hover:bg-gray-100">Register</button>
    <div id="msg" class="text-red-600"></div>
  </div>`;
  document.getElementById('login').onclick = async () => {
    const u = document.getElementById('user').value;
    const p = document.getElementById('pwd').value;
    try {
      const data = await login(u, p);
      localStorage.setItem('token', data.access_token);
      showDashboard();
    } catch (e) {
      document.getElementById('msg').textContent = 'Login failed';
    }
  };
  document.getElementById('register').onclick = async () => {
    const u = document.getElementById('user').value;
    const p = document.getElementById('pwd').value;
    try {
      await register(u, p);
      const data = await login(u, p);
      localStorage.setItem('token', data.access_token);
      showDashboard();
    } catch (e) {
      document.getElementById('msg').textContent = 'Register failed';
    }
  };
}

function login(username, password) {
  const form = new URLSearchParams();
  form.append('username', username);
  form.append('password', password);
  return fetch(API_URL + '/auth/login', { method: 'POST', body: form })
    .then(res => res.ok ? res.json() : Promise.reject());
}

function register(username, password) {
  return api('/auth/register', { method: 'POST', body: { username, password } });
}

function showDashboard() {
  document.body.innerHTML = `
    <nav class="bg-gray-800 text-white px-4 py-3 flex gap-4 items-center">
      <button id="study" class="hover:text-blue-400">Study</button>
      <button id="search" class="hover:text-blue-400">Search</button>
      <button id="stats" class="hover:text-blue-400">Stats</button>
      <button id="logout" class="ml-auto hover:text-blue-400">Logout</button>
    </nav>
    <main id="main" class="p-4"></main>`;
  document.getElementById('logout').onclick = () => { localStorage.removeItem('token'); showLogin(); };
  document.getElementById('study').onclick = showStudy;
  document.getElementById('search').onclick = showSearch;
  document.getElementById('stats').onclick = showStats;
  showStudy();
}

let studyWords = [];
let studyIndex = 0;
let showBack = false;

async function showStudy() {
  studyWords = await api('/words/today');
  studyIndex = 0;
  showBack = false;
  renderStudy();
}

function renderStudy() {
  const w = studyWords[studyIndex];
  const main = document.getElementById('main');
  if (!w) {
    main.innerHTML = '<div>All done!</div>';
    return;
  }
  const translation = w.translations.map(t => t.translation).join(', ');
  main.innerHTML = `
    <div class="flex flex-col items-center gap-4">
      <div id="card" class="border p-8 text-center w-64 h-40 flex items-center justify-center cursor-pointer bg-white shadow rounded">${showBack ? translation : w.word}</div>
      <div id="buttons" class="flex gap-2 ${showBack ? '' : 'hidden'}">
        ${[0,1,2,3,4,5].map(q => `<button class="border rounded px-2 shadow" data-q="${q}">${q}</button>`).join('')}
      </div>
    </div>`;
  document.getElementById('card').onclick = () => { showBack = !showBack; renderStudy(); };
  document.querySelectorAll('#buttons button').forEach(btn => {
    btn.onclick = async () => {
      await api('/review/' + w.id, { method: 'POST', body: { quality: btn.dataset.q } });
      showBack = false;
      studyIndex++;
      renderStudy();
    };
  });
}

function showSearch() {
  const main = document.getElementById('main');
  main.innerHTML = `
    <div class="flex flex-col gap-4 max-w-xl mx-auto">
      <div class="flex gap-2">
        <input id="q" class="border p-2 flex-grow" placeholder="Search word">
        <button id="go" class="border rounded px-4 py-2 shadow bg-white hover:bg-gray-100">Search</button>
      </div>
      <ul id="results" class="space-y-2"></ul>
    </div>`;
  document.getElementById('go').onclick = async () => {
    const q = document.getElementById('q').value;
    const res = await api('/search?q=' + encodeURIComponent(q));
    const list = res.map(w => `<li class="p-2 border rounded shadow bg-white"><span class="text-blue-500 font-semibold">${w.word}</span> <span class="text-gray-600">${w.translations.map(t=>t.translation).join(', ')}</span></li>`).join('');
    document.getElementById('results').innerHTML = list;
  };
}

async function showStats() {
  const data = await api('/stats/overview');
  document.getElementById('main').innerHTML = `
    <div class="grid sm:grid-cols-3 gap-4 text-center">
      <div class="shadow rounded p-4 bg-white"><div class="text-2xl font-bold">${data.reviewed}</div><div class="text-gray-500">Reviewed</div></div>
      <div class="shadow rounded p-4 bg-white"><div class="text-2xl font-bold">${data.due}</div><div class="text-gray-500">Due Today</div></div>
      <div class="shadow rounded p-4 bg-white"><div class="text-2xl font-bold">${data.next_due ? new Date(data.next_due).toLocaleDateString() : 'N/A'}</div><div class="text-gray-500">Next Due</div></div>
    </div>`;
}

window.addEventListener('load', () => {
  if (localStorage.getItem('token')) showDashboard();
  else showLogin();
});
