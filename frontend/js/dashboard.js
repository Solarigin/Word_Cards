// Dashboard page script

let studyWords = [];
let studyIndex = 0;
let showBack = false;
let dailyCount = parseInt(localStorage.getItem('dailyCount'), 10) || 5;
let currentBook = localStorage.getItem('wordBook') || 'TEST';
let loadedBook = null;
let wordBookData = [];
let progress = 0;

function handleKey(e) {
  if (!showBack) return;
  if (['1', '2', '3'].includes(e.key)) {
    const btn = document.querySelector(`#buttons button[data-q="${parseInt(e.key, 10) - 1}"]`);
    if (btn) btn.click();
  }
}

async function ensureWordBook() {
  currentBook = localStorage.getItem('wordBook') || 'TEST';
  if (loadedBook !== currentBook) {
    wordBookData = await loadWordBook(currentBook);
    loadedBook = currentBook;
  }
}

function saveProgress() {
  localStorage.setItem('progress_' + currentBook, progress);
}

async function loadWordBook(name) {
  return api('/wordbook/' + name);
}

function logout() {
  localStorage.removeItem('token');
  window.location.href = 'login.html';
}

async function showStudy() {
  dailyCount = parseInt(localStorage.getItem('dailyCount'), 10) || 5;
  await ensureWordBook();
  progress = parseInt(localStorage.getItem('progress_' + currentBook), 10) || 0;
  if (localStorage.getItem('study_done') === 'true') {
    studyWords = [];
    studyIndex = 1; // force "All done" message
  } else {
    const slice = wordBookData.slice(progress, progress + dailyCount);
    studyWords = slice.map(w => ({ word: w, mode: 'normal' }));
    studyIndex = 0;
    localStorage.setItem('study_done', 'false');
  }
  showBack = false;
  renderStudy();
}

function renderStudy() {
  const card = studyWords[studyIndex];
  const main = document.getElementById('main');
  if (!card) {
    main.innerHTML = studyIndex === 0 ? '<div>No words due today</div>' : `<div>All done!</div>
      <div class="mt-4 flex gap-2">
        <button id="more5" class="border rounded px-3 py-1 bg-blue-500 text-white">继续学习5个</button>
        <button id="more10" class="border rounded px-3 py-1 bg-blue-500 text-white">继续学习10个</button>
      </div>`;
    if (studyIndex > 0) {
      localStorage.setItem('study_done', 'true');
    }
    if (!card) {
      const b5 = document.getElementById('more5');
      if (b5) {
        b5.onclick = () => continueStudy(5);
        document.getElementById('more10').onclick = () => continueStudy(10);
      }
    }
    return;
  }
  const w = card.word;
  const translation = w.translations.map(t => `${t.type || ''} ${t.translation}`).join('<br>');
  const phrases = w.phrases ? w.phrases.map(p => `${p.phrase} - ${p.translation}`).join('<br>') : '';
  const backNormal = `<div>${translation}${phrases ? '<hr class="my-2">' + phrases : ''}</div>`;
  const front = card.mode === 'normal' ? w.word : translation;
  const back = card.mode === 'normal' ? backNormal : w.word;
  main.innerHTML = `
    <div class="flex flex-col items-center gap-4 min-h-screen">
      <div id="card" class="border p-4 text-center w-80 h-48 overflow-y-auto flex items-center justify-center cursor-pointer bg-white shadow rounded">${showBack ? back : front}</div>
      <div id="buttons" class="flex gap-2 ${showBack ? '' : 'hidden'} fixed bottom-4 left-1/2 -translate-x-1/2">
        ${['不认识','模糊','认识'].map((t,i) => {
          const colors = ['bg-red-500 text-white','bg-yellow-400','bg-green-500 text-white'];
          return `<button class="border rounded px-2 shadow ${colors[i]}" data-q="${i}">${t}</button>`;
        }).join('')}
      </div>
    </div>`;
  document.getElementById('card').onclick = () => { showBack = !showBack; renderStudy(); };
  document.querySelectorAll('#buttons button').forEach(btn => {
    btn.onclick = () => {
      const q = parseInt(btn.dataset.q, 10);
      showBack = false;
      if (q === 0) {
        studyWords.push(card);
      } else if (q === 1) {
        studyWords.splice(studyIndex + 1, 0, { word: w, mode: 'rev' });
      } else if (q === 2) {
        progress++;
        saveProgress();
      }
      studyIndex++;
      renderStudy();
    };
  });
}

async function showSearch() {
  await ensureWordBook();
  const main = document.getElementById('main');
  main.innerHTML = `
    <div class="flex flex-col gap-4 max-w-xl mx-auto">
      <div class="flex gap-2">
        <input id="q" class="border p-2 flex-grow" placeholder="Search word">
        <button id="go" class="border rounded px-4 py-2 shadow bg-white hover:bg-gray-100">Search</button>
      </div>
      <ul id="results" class="space-y-2"></ul>
    </div>
    <div id="modal" class="fixed inset-0 bg-black/50 flex items-center justify-center hidden">
      <div class="bg-white p-4 rounded shadow max-w-md w-full">
        <button id="closeModal" class="float-right">✖</button>
        <div id="modalContent" class="mt-2"></div>
      </div>
    </div>`;
  const input = document.getElementById('q');
  const results = document.getElementById('results');
  let data = [];
  function search() {
    const q = input.value.trim().toLowerCase();
    if(!q) return;
    data = wordBookData.filter(w =>
      w.word.toLowerCase().includes(q) ||
      (w.translations.some(t => t.translation.includes(q)))
    );
    const list = data.map((w,i) => `<li data-i="${i}" class="p-2 border rounded shadow bg-white cursor-pointer"><span class="text-blue-500 font-semibold">${w.word}</span> <span class="text-gray-600">${w.translations.map(t=>t.translation).join(', ')}</span></li>`).join('');
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

async function continueStudy(n) {
  dailyCount += n;
  localStorage.setItem('dailyCount', dailyCount);
  localStorage.setItem('study_done', 'false');
  await showStudy();
}

async function showStats() {
  await ensureWordBook();
  progress = parseInt(localStorage.getItem('progress_' + currentBook), 10) || 0;
  const learned = progress;
  const daily = dailyCount;
  const total = wordBookData.length;
  document.getElementById('main').innerHTML = `
    <div class="grid sm:grid-cols-3 gap-4 text-center">
      <div class="shadow rounded p-4 bg-white"><div class="text-2xl font-bold">${learned}</div><div class="text-gray-500">已学习</div></div>
      <div class="shadow rounded p-4 bg-white"><div class="text-2xl font-bold">${daily}</div><div class="text-gray-500">Daily Words</div></div>
      <div class="shadow rounded p-4 bg-white"><div class="text-2xl font-bold">${total}</div><div class="text-gray-500">总词数</div></div>
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
        <label class="block mb-1">Word Book</label>
        <select id="wordBookSelect" class="border p-2 w-full"></select>
      </div>
      <div>
        <label class="block mb-1">Username</label>
        <input id="usernameInput" class="border p-2 w-full">
      </div>
      <div>
        <label class="block mb-1">Old Password</label>
        <input id="oldPasswordInput" type="password" class="border p-2 w-full">
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
  api('/wordbooks').then(list => {
    const select = document.getElementById('wordBookSelect');
    select.innerHTML = list.map(n => `<option value="${n}">${n}</option>`).join('');
    const current = localStorage.getItem('wordBook');
    if (current) select.value = current;
  });
  document.getElementById('saveSettings').onclick = async () => {
    const daily = parseInt(document.getElementById('dailyInput').value, 10);
    if (!isNaN(daily) && daily > 0) {
      dailyCount = daily;
      localStorage.setItem('dailyCount', daily);
    }
    const book = document.getElementById('wordBookSelect').value;
    if (book) {
      localStorage.setItem('wordBook', book);
      loadedBook = null;
    }
    const username = document.getElementById('usernameInput').value.trim();
    const oldPwd = document.getElementById('oldPasswordInput').value;
    const newPwd = document.getElementById('passwordInput').value;
    try {
      if (username) await api('/users/me', { method: 'PUT', body: { username } });
      if (oldPwd && newPwd) {
        await api('/users/me/password', { method: 'PUT', body: { old_password: oldPwd, new_password: newPwd } });
        localStorage.removeItem('token');
        window.location.href = 'login.html';
        return;
      }
      document.getElementById('settingsMsg').textContent = 'Saved';
    } catch {
      document.getElementById('settingsMsg').textContent = 'Error';
    }
  };
}

function init() {
  if (!localStorage.getItem('token')) {
    window.location.href = 'login.html';
    return;
  }
  document.getElementById('logout').onclick = logout;
  document.getElementById('study').onclick = showStudy;
  document.getElementById('search').onclick = showSearch;
  document.getElementById('translate').onclick = () => {
    window.location.href = 'translate.html';
  };
  document.getElementById('stats').onclick = showStats;
  document.getElementById('settings').onclick = showSettings;
  document.addEventListener('keydown', handleKey);
  showStudy();
}

window.addEventListener('DOMContentLoaded', init);
