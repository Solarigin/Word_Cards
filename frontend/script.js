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
      <button id="settings" class="hover:text-blue-400">Settings</button>
      <button id="logout" class="ml-auto hover:text-blue-400">Logout</button>
    </nav>
    <main id="main" class="p-4"></main>`;
  document.getElementById('logout').onclick = () => { localStorage.removeItem('token'); showLogin(); };
  document.getElementById('study').onclick = showStudy;
  document.getElementById('search').onclick = showSearch;
  document.getElementById('stats').onclick = showStats;
  document.getElementById('settings').onclick = showSettings;
  showStudy();
}

let studyWords = [];
let studyIndex = 0;
let showBack = false;
let dailyCount = parseInt(localStorage.getItem('dailyCount'), 10) || 5;

async function showStudy() {
  studyWords = await api('/words/today?limit=' + dailyCount);
  studyIndex = 0;
  showBack = false;
  renderStudy();
}

function renderStudy() {
  const w = studyWords[studyIndex];
  const main = document.getElementById('main');
  if (!w) {
    main.innerHTML = studyIndex === 0 ? '<div>No words due today</div>' : '<div>All done!</div>';
    return;
  }
  const translation = w.translations.map(t => `${t.type || ''} ${t.translation}`).join('<br>');
  const phrases = w.phrases ? w.phrases.map(p => `${p.phrase} - ${p.translation}`).join('<br>') : '';
  const back = `<div>${translation}${phrases ? '<hr class="my-2">' + phrases : ''}</div>`;
  main.innerHTML = `
    <div class="flex flex-col items-center gap-4">
      <div id="card" class="border p-4 text-center w-72 min-h-40 flex items-center justify-center cursor-pointer bg-white shadow rounded">${showBack ? back : w.word}</div>
      <div id="buttons" class="flex gap-2 ${showBack ? '' : 'hidden'}">
        ${['不认识','模糊','认识'].map((t,i) => `<button class="border rounded px-2 shadow" data-q="${i}">${t}</button>`).join('')}
      </div>
    </div>`;
  document.getElementById('card').onclick = () => { showBack = !showBack; renderStudy(); };
  document.querySelectorAll('#buttons button').forEach(btn => {
    btn.onclick = async () => {
      const map = [1,3,5];
      const q = parseInt(btn.dataset.q,10);
      await api('/review/' + w.id, { method: 'POST', body: { quality: map[q] } });
      showBack = false;
      if(q < 2) studyWords.push(w);
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
    </div>
    <div id="modal" class="fixed inset-0 bg-black/50 items-center justify-center hidden">
      <div class="bg-white p-4 rounded shadow max-w-md w-full">
        <button id="closeModal" class="float-right">✖</button>
        <div id="modalContent" class="mt-2"></div>
      </div>
    </div>`;
  const input = document.getElementById('q');
  const results = document.getElementById('results');
  let data = [];
  async function search() {
    const q = input.value.trim();
    if(!q) return;
    const res = await api('/search?q=' + encodeURIComponent(q));
    data = res;
    const list = res.map((w,i) => `<li data-i="${i}" class="p-2 border rounded shadow bg-white cursor-pointer"><span class="text-blue-500 font-semibold">${w.word}</span> <span class="text-gray-600">${w.translations.map(t=>t.translation).join(', ')}</span></li>`).join('');
    results.innerHTML = list;
  }
  document.getElementById('go').onclick = search;
  input.addEventListener('keydown', e => { if(e.key === 'Enter') search(); });
  results.onclick = (e) => {
    const li = e.target.closest('li[data-i]');
    if(!li) return;
    const w = data[li.dataset.i];
    showWordModal(w);
  };
}

function showWordModal(w) {
  const modal = document.getElementById('modal');
  const content = document.getElementById('modalContent');
  content.innerHTML = `
    <h2 class="text-xl font-bold mb-2">${w.word}</h2>
    <div>${w.translations.map(t => `<div>${t.type || ''} ${t.translation}</div>`).join('')}</div>
    ${w.phrases && w.phrases.length ? `<div class="mt-2">${w.phrases.map(p => `<div>${p.phrase} - ${p.translation}</div>`).join('')}</div>` : ''}
    <button id="speakBtn" class="mt-2 border px-2 rounded bg-white shadow">🔊</button>
  `;
  modal.classList.remove('hidden');
  document.getElementById('speakBtn').onclick = () => speak(w.word);
  document.getElementById('closeModal').onclick = () => modal.classList.add('hidden');
}

function speak(text) {
  window.speechSynthesis.speak(new SpeechSynthesisUtterance(text));
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

function showSettings() {
  const main = document.getElementById('main');
  main.innerHTML = `
    <div class="flex flex-col gap-4 max-w-sm mx-auto">
      <div>
        <label class="block mb-1">Daily words</label>
        <input id="dailyInput" type="number" min="1" class="border p-2 w-full" value="${dailyCount}">
      </div>
      <div>
        <label class="block mb-1">Username</label>
        <input id="usernameInput" class="border p-2 w-full">
      </div>
      <div>
        <label class="block mb-1">New Password</label>
        <input id="passwordInput" type="password" class="border p-2 w-full">
      </div>
      <button id="saveSettings" class="border rounded px-4 py-2 shadow bg-blue-500 text-white">Save</button>
      <div id="settingsMsg" class="text-green-600"></div>
    </div>`;
  api('/users/me').then(data => {
    document.getElementById('usernameInput').value = data.username;
  });
  document.getElementById('saveSettings').onclick = async () => {
    const daily = parseInt(document.getElementById('dailyInput').value, 10);
    if (!isNaN(daily) && daily > 0) {
      dailyCount = daily;
      localStorage.setItem('dailyCount', daily);
    }
    const username = document.getElementById('usernameInput').value.trim();
    const password = document.getElementById('passwordInput').value;
    try {
      if (username) await api('/users/me', { method: 'PUT', body: { username } });
      if (password) await api('/users/me/password', { method: 'PUT', body: { password } });
      document.getElementById('settingsMsg').textContent = 'Saved';
    } catch {
      document.getElementById('settingsMsg').textContent = 'Error';
    }
  };
}

window.addEventListener('load', () => {
  if (localStorage.getItem('token')) showDashboard();
  else showLogin();
});
