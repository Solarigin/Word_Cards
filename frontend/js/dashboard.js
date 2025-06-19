// Dashboard page script

let studyWords = [];
let studyIndex = 0;
let showBack = false;
let dailyCount = parseInt(localStorage.getItem('dailyCount'), 10) || 5;
let currentBook = localStorage.getItem('wordBook') || 'TEST';
let loadedBook = null;
let wordBookData = [];
let progress = 0;
let favorites = new Map();

async function refreshFavorites() {
  try {
    const data = await api('/favorites');
    favorites.clear();
    data.forEach(w => favorites.set(w.word.toLowerCase(), w.id));
  } catch {}
}

function handleKey(e) {
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
  await refreshFavorites();
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
  const phrases = w.phrases && w.phrases.length
    ? '<ul class="list-disc pl-4 space-y-1">' +
      w.phrases.map(p => `<li>${p.phrase} - ${p.translation}</li>`).join('') +
      '</ul>'
    : '';
  const backNormal = `<div>${translation}${phrases ? '<hr class="my-2">' + phrases : ''}</div>`;
  const front = card.mode === 'normal' ? w.word : translation;
  const back = card.mode === 'normal' ? backNormal : w.word;
  const favKey = w.word.toLowerCase();
  const favText = favorites.has(favKey) ? '已收藏' : '收藏';
  const favClass = favorites.has(favKey) ? 'bg-green-600 text-white' : 'bg-green-200 text-green-800';
  main.innerHTML = `
    <div class="flex flex-col items-center gap-4 min-h-screen">
      <div class="relative">
        <div id="card" class="border p-4 text-center w-80 h-48 overflow-y-auto flex items-center justify-center cursor-pointer bg-white shadow rounded">${showBack ? back : front}</div>
        <button id="favStudyBtn" class="absolute top-2 right-2 border px-2 rounded ${favClass}">${favText}</button>
      </div>
      <div id="buttons" class="flex gap-2 fixed bottom-4 left-1/2 -translate-x-1/2">
        ${['不认识','模糊','认识'].map((t,i) => {
          const colors = ['bg-red-500 text-white','bg-yellow-400','bg-green-500 text-white'];
          return `<button class="border rounded px-2 shadow ${colors[i]}" data-q="${i}">${t}</button>`;
        }).join('')}
      </div>
    </div>`;
  document.getElementById('card').onclick = () => { showBack = !showBack; renderStudy(); };
  const favBtn = document.getElementById('favStudyBtn');
  favBtn.onclick = async () => {
    if (favorites.has(favKey)) return;
    const added = await addFavoriteByWord(w.word);
    if (added) {
      favBtn.textContent = '已收藏';
      favBtn.classList.remove('bg-green-200', 'text-green-800');
      favBtn.classList.add('bg-green-600', 'text-white');
    }
  };
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
  const main = document.getElementById('main');
  main.innerHTML = `
    <div class="flex flex-col gap-4 max-w-xl mx-auto">
      <div class="flex gap-2">
        <input id="q" class="border p-2 flex-grow" placeholder="Search word">
        <button id="go" class="border rounded px-4 py-2 shadow bg-white hover:bg-gray-100">Search</button>
      </div>
      <ul id="results" class="space-y-2"></ul>
      <div id="pagination" class="flex gap-2 justify-center"></div>
    </div>
    <div id="modal" class="fixed inset-0 bg-black/50 flex items-center justify-center hidden">
      <div class="bg-white p-4 rounded shadow max-w-md w-full">
        <button id="closeModal" class="float-right">✖</button>
        <div id="modalContent" class="mt-2"></div>
      </div>
    </div>`;
  const input = document.getElementById('q');
  const results = document.getElementById('results');
  const pagination = document.getElementById('pagination');
  let data = [];
  let page = 1;
  const PAGE_SIZE = 10;

  function render() {
    const total = Math.ceil(data.length / PAGE_SIZE);
    const start = (page - 1) * PAGE_SIZE;
    const slice = data.slice(start, start + PAGE_SIZE);
    const list = slice.map((w, i) => {
      const idx = start + i;
      return `<li data-i="${idx}" class="p-2 border rounded shadow bg-white cursor-pointer"><span class="text-blue-500 font-semibold">${w.word}</span> <span class="text-gray-600">${w.translations.map(t=>t.translation).join(', ')}</span>${w.ai ? '<div class="text-xs text-gray-500">非本阶段词汇, 使用AI大模型进行解释</div>' : ''}</li>`;
    }).join('');
    results.innerHTML = list;
    if (total > 1) {
      pagination.innerHTML = `<button id="prevPage" ${page===1?'disabled':''} class="border rounded px-2 bg-white shadow">上一页</button><span>${page}/${total}</span><button id="nextPage" ${page===total?'disabled':''} class="border rounded px-2 bg-white shadow">下一页</button>`;
    } else {
      pagination.innerHTML = '';
    }
  }
  async function search() {
    const qRaw = input.value.trim();
    if(!qRaw) return;
    const q = qRaw.toLowerCase();
    try {
      data = await api('/search?q=' + encodeURIComponent(q));
    } catch { data = []; }
    await ensureWordBook();
    const local = wordBookData.filter(w =>
      w.word.toLowerCase().includes(q) ||
      (w.translations && w.translations.some(t => t.translation.includes(q)))
    );
    for (const w of local) {
      if(!data.some(d => d.word.toLowerCase() === w.word.toLowerCase())) {
        data.push(w);
      }
    }
    if (data.length === 0) {
      try {
        const res = await api('/translate', { method: 'POST', body: { text: qRaw, lang: 'zh' } });
        data = [{ word: qRaw, translations: [{ translation: res.result }], phrases: [], ai: true }];
      } catch {
        data = [{ word: qRaw, translations: [{ translation: 'N/A' }], phrases: [], ai: true }];
      }
    }
    page = 1;
    render();
  }
  document.getElementById('go').onclick = search;
  input.addEventListener('keydown', e => { if(e.key === 'Enter') search(); });
  pagination.onclick = (e) => {
    if (e.target.id === 'prevPage' && page > 1) {
      page--; render();
    } else if (e.target.id === 'nextPage' && page < Math.ceil(data.length / PAGE_SIZE)) {
      page++; render();
    }
  };
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
  const isFav = favorites.has(w.word.toLowerCase());
  const favText = isFav ? '已收藏' : '收藏';
  const favClass = isFav ? 'bg-green-600 text-white' : 'bg-green-200 text-green-800';
  content.innerHTML = `
    <h2 class="text-xl font-bold mb-2">${w.word}</h2>
    <div>${w.translations.map(t => `<div>${t.type || ''} ${t.translation}</div>`).join('')}</div>
    ${w.phrases && w.phrases.length ? `<ul class="list-disc pl-4 space-y-1 mt-2">${w.phrases.map(p => `<li>${p.phrase} - ${p.translation}</li>`).join('')}</ul>` : ''}
    ${w.ai ? '<div class="text-xs text-gray-500 mt-1">非本阶段词汇, 使用AI大模型进行解释</div>' : ''}
    <div class="mt-2 space-x-2">
      <button id="speakBtn" class="border px-2 rounded bg-white shadow">🔊</button>
      ${w.id ? `<button id="favBtn" class="border px-2 rounded ${favClass}">${favText}</button>` : ''}
    </div>
  `;
  modal.classList.remove('hidden');
  document.getElementById('speakBtn').onclick = () => speak(w.word);
  const fav = document.getElementById('favBtn');
  if (fav) fav.onclick = async () => {
    if (favorites.has(w.word.toLowerCase())) return;
    try {
      await api('/favorites/' + w.id, { method: 'POST' });
      favorites.set(w.word.toLowerCase(), w.id);
      fav.textContent = '已收藏';
      fav.classList.remove('bg-green-200', 'text-green-800');
      fav.classList.add('bg-green-600', 'text-white');
    } catch {}
  };
  document.getElementById('closeModal').onclick = () => modal.classList.add('hidden');
}

async function addFavoriteByWord(word) {
  try {
    const res = await api('/search?q=' + encodeURIComponent(word));
    const item = res.find(w => w.word.toLowerCase() === word.toLowerCase());
    if (item) {
      await api('/favorites/' + item.id, { method: 'POST' });
      favorites.set(word.toLowerCase(), item.id);
      return true;
    }
  } catch {}
  return false;
}

function speak(text) {
  window.speechSynthesis.speak(new SpeechSynthesisUtterance(text));
}

async function showFavorites() {
  const main = document.getElementById('main');
  main.innerHTML = `
    <div class="flex flex-col gap-2 max-w-xl mx-auto">
      <div id="favList" class="space-y-2"></div>
      <button id="genArticle" class="border rounded px-4 py-2 bg-blue-500 text-white">AI生成文章</button>
    </div>
    <div id="modal" class="fixed inset-0 bg-black/50 flex items-center justify-center hidden">
      <div class="bg-white p-4 rounded shadow max-w-md w-full">
        <button id="closeModal" class="float-right">✖</button>
        <div id="articleContent" class="mt-2 whitespace-pre-wrap"></div>
        <div id="articleLoading" class="hidden flex justify-center my-2">
          <svg class="animate-spin h-5 w-5 text-blue-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"></path>
          </svg>
        </div>
      </div>
    </div>`;
  const data = await api('/favorites');
  const list = data.map(w => `<label class="flex items-center gap-2"><input type="checkbox" value="${w.id}"><span>${w.word}</span></label>`).join('');
  document.getElementById('favList').innerHTML = list;

  document.getElementById('genArticle').onclick = async () => {
    const ids = Array.from(document.querySelectorAll('#favList input:checked')).map(cb => parseInt(cb.value, 10));
    if (!ids.length) return;
    const btn = document.getElementById('genArticle');
    const modal = document.getElementById('modal');
    const content = document.getElementById('articleContent');
    const loading = document.getElementById('articleLoading');
    btn.disabled = true;
    content.textContent = '';
    modal.classList.remove('hidden');
    loading.classList.remove('hidden');
    try {
      const res = await api('/generate_article', { method: 'POST', body: { word_ids: ids } });
      const text = res.result;
      loading.classList.add('hidden');
      let i = 0;
      const timer = setInterval(() => {
        content.textContent += text[i] || '';
        i++;
        if (i >= text.length) clearInterval(timer);
      }, 50);
      document.getElementById('closeModal').onclick = () => { modal.classList.add('hidden'); clearInterval(timer); };
    } catch (err) {
      console.error(err);
      loading.classList.add('hidden');
      modal.classList.add('hidden');
      let msg = '生成失败';
      try {
        const data = JSON.parse(err.message);
        if (data.detail) msg = data.detail;
      } catch {}
      alert(msg);
    } finally {
      btn.disabled = false;
    }
  };
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
      <button id="deleteAccount" class="border rounded px-4 py-2 shadow bg-red-500 text-white">Delete Account</button>
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
        if (!/^[A-Za-z0-9]{6,}$/.test(newPwd)) {
          document.getElementById('settingsMsg').textContent = '密码不能为空, 不能含特殊字符且至少6位';
          return;
        }
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
  document.getElementById('deleteAccount').onclick = async () => {
    if (!confirm('Are you sure you want to delete your account?')) return;
    try {
      await api('/users/request_delete', { method: 'POST' });
      document.getElementById('settingsMsg').textContent = '您的帐号将会在24小时内注销';
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
  if (localStorage.getItem('role') === 'admin') {
    window.location.href = 'admin.html';
    return;
  }
  refreshFavorites();
  document.getElementById('logout').onclick = logout;
  document.getElementById('study').onclick = showStudy;
  document.getElementById('search').onclick = showSearch;
  document.getElementById('translate').onclick = () => {
    window.location.href = 'translate.html';
  };
  document.getElementById('favorites').onclick = showFavorites;
  document.getElementById('stats').onclick = showStats;
  document.getElementById('settings').onclick = showSettings;
  document.addEventListener('keydown', handleKey);
  showStudy();
}

window.addEventListener('DOMContentLoaded', init);
