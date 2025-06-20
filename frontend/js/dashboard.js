// Dashboard page script

let studyWords = [];
let studyIndex = 0;
let showBack = false;
let showAllPhrases = false;
let dailyCount = parseInt(localStorage.getItem('dailyCount'), 10) || 5;
let currentBook = localStorage.getItem('wordBook') || 'TEST';
let loadedBook = null;
let wordBookData = [];
let progress = 0;
let favorites = new Map();
let statsCounts = JSON.parse(localStorage.getItem('statsCounts') || '{"unknown":0,"fuzzy":0,"known":0}');
let statsWords = JSON.parse(localStorage.getItem('statsWords') || '{"unknown":[],"fuzzy":[],"known":[]}');
let progressHistory = JSON.parse(localStorage.getItem('progressHistory') || '[]');
let speakOnLoad = localStorage.getItem('speakOnLoad') !== 'false';
let shuffleStudy = localStorage.getItem('shuffleStudy') === 'true';

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
  speakOnLoad = localStorage.getItem('speakOnLoad') !== 'false';
  shuffleStudy = localStorage.getItem('shuffleStudy') === 'true';
  await refreshFavorites();
  await ensureWordBook();
  progress = parseInt(localStorage.getItem('progress_' + currentBook), 10) || 0;
  if (localStorage.getItem('study_done') === 'true') {
    studyWords = [];
    studyIndex = 1; // force "All done" message
  } else {
    let remaining = wordBookData.slice(progress);
    if (shuffleStudy) {
      for (let i = remaining.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [remaining[i], remaining[j]] = [remaining[j], remaining[i]];
      }
    }
    const slice = remaining.slice(0, dailyCount);
    studyWords = slice.map(w => ({ word: w, mode: 'normal' }));
    studyIndex = 0;
    localStorage.setItem('study_done', 'false');
  }
  showBack = false;
  showAllPhrases = false;
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
  const translation = w.translations
    .map(t => `${escapeHTML(t.type || '')} ${escapeHTML(t.translation)}`)
    .join('<br>');
  const phrases = w.phrases && w.phrases.length
    ? (() => {
        const list = showAllPhrases ? w.phrases : w.phrases.slice(0, 3);
        const items = list.map(p => `<li>${escapeHTML(p.phrase)} - ${escapeHTML(p.translation)}</li>`).join('');
        const btn = w.phrases.length > 3
          ? `<button id="togglePhrases" class="text-blue-500 underline ml-2">${showAllPhrases ? '收起' : '更多...'}</button>`
          : '';
        return '<ul class="list-disc pl-4 space-y-1">' + items + '</ul>' + btn;
      })()
    : '';
  const backNormal = `<div>${translation}${phrases ? '<hr class="my-2">' + phrases : ''}</div>`;
  const front = card.mode === 'normal'
    ? `<div class="flex flex-col items-center justify-center h-full"><span class="card-word">${escapeHTML(w.word)}</span></div>`
    : translation;
  const back = card.mode === 'normal' ? backNormal : escapeHTML(w.word);
  const favKey = w.word.toLowerCase();
  const favText = favorites.has(favKey) ? '取消收藏' : '收藏';
  const favClass = favorites.has(favKey) ? 'bg-green-600 text-white' : 'bg-green-200 text-green-800';
  main.innerHTML = `
    <div class="flex flex-col items-center gap-4 min-h-screen animate-slide-up">
      <div class="relative">
        <div id="card" class="flip-card w-[49vw] h-[49vh] cursor-pointer card-hover">
          <div class="flip-card-inner ${showBack ? 'flip' : ''}">
            <div class="flip-card-front border p-4 text-center w-full h-full overflow-y-auto flex items-center justify-center bg-white shadow rounded">${front}</div>
            <div class="flip-card-back border p-4 text-left w-full h-full overflow-y-auto flex items-start justify-start bg-white shadow rounded">${back}</div>
          </div>
        </div>
        <button id="favStudyBtn" class="absolute top-2 right-2 border px-2 rounded ${favClass}">${favText}</button>
      </div>
      <div id="buttons" class="flex gap-2 fixed bottom-4 left-1/2 -translate-x-1/2">
        ${['不认识','模糊','认识'].map((t,i) => {
          const colors = ['bg-red-500 text-white','bg-yellow-400','bg-green-500 text-white'];
          return `<button class="border rounded px-2 shadow ${colors[i]}" data-q="${i}">${t}</button>`;
        }).join('')}
      </div>
    </div>`;
  const cardOuter = document.getElementById('card');
  const cardInner = cardOuter.querySelector('.flip-card-inner');
  if (speakOnLoad && card.mode === 'normal') speak(w.word);
  cardOuter.onclick = () => {
    if (showBack) {
      cardInner.classList.remove('flip');
    } else {
      cardInner.classList.add('flip');
    }
    showBack = !showBack;
  };
  const favBtn = document.getElementById('favStudyBtn');
  favBtn.onclick = async () => {
    if (favorites.has(favKey)) {
      try {
        await api('/favorites/' + favorites.get(favKey), { method: 'DELETE' });
        favorites.delete(favKey);
        favBtn.textContent = '收藏';
        favBtn.classList.remove('bg-green-600', 'text-white');
        favBtn.classList.add('bg-green-200', 'text-green-800');
      } catch {}
      return;
    }
    const added = await addFavoriteByWord(w.word);
    if (added) {
      favBtn.textContent = '取消收藏';
      favBtn.classList.remove('bg-green-200', 'text-green-800');
      favBtn.classList.add('bg-green-600', 'text-white');
    }
  };
  const toggleBtn = document.getElementById('togglePhrases');
  if (toggleBtn) toggleBtn.onclick = () => { showAllPhrases = !showAllPhrases; renderStudy(); };
  document.querySelectorAll('#buttons button').forEach(btn => {
    btn.onclick = () => {
      const q = parseInt(btn.dataset.q, 10);
      showBack = false;
      showAllPhrases = false;
      const wordText = w.word;
      if (q === 0) {
        studyWords.push(card);
        statsCounts.unknown++;
        if (!statsWords.unknown.includes(wordText)) statsWords.unknown.push(wordText);
      } else if (q === 1) {
        studyWords.splice(studyIndex + 1, 0, { word: w, mode: 'rev' });
        statsCounts.fuzzy++;
        if (!statsWords.fuzzy.includes(wordText)) statsWords.fuzzy.push(wordText);
      } else if (q === 2) {
        progress++;
        saveProgress();
        statsCounts.known++;
        if (!statsWords.known.includes(wordText)) statsWords.known.push(wordText);
        const now = Date.now();
        const today = new Date(now).toISOString().slice(0, 10);
        const last = progressHistory[progressHistory.length - 1];
        if (last && new Date(last.time).toISOString().slice(0, 10) === today) {
          last.time = now;
          last.progress = progress;
        } else {
          progressHistory.push({ time: now, progress });
        }
        localStorage.setItem('progressHistory', JSON.stringify(progressHistory));
      }
      localStorage.setItem('statsCounts', JSON.stringify(statsCounts));
      localStorage.setItem('statsWords', JSON.stringify(statsWords));
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
      const word = escapeHTML(w.word);
      const trans = w.translations.map(t => escapeHTML(t.translation)).join(', ');
      return `<li data-i="${idx}" class="p-2 border rounded shadow bg-white cursor-pointer card-hover"><span class="text-blue-500 font-semibold">${word}</span> <span class="text-gray-600">${trans}</span>${w.ai ? '<div class="text-xs text-gray-500">非本阶段词汇, 使用AI大模型进行解释</div>' : ''}</li>`;
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

async function showTranslate() {
  const main = document.getElementById('main');
  main.innerHTML = `
    <div class="bg-white rounded shadow p-6 w-full mx-auto space-y-4 max-w-2xl">
      <h1 class="text-2xl font-semibold mb-4 text-center">通用翻译</h1>
      <label class="block mb-2">
        <span class="text-gray-700">目标语言：</span>
        <select id="targetLang" class="mt-1 block w-full rounded-lg border-gray-300 p-2 focus:outline-none focus:ring-2 focus:ring-blue-300">
          <option value="en">English</option>
          <option value="zh">中文</option>
          <option value="fr">Français</option>
          <option value="de">Deutsch</option>
          <option value="es">Español</option>
          <option value="it">Italiano</option>
          <option value="ja">日本語</option>
          <option value="ko">한국어</option>
          <option value="ru">Русский</option>
          <option value="pt">Português</option>
        </select>
      </label>
      <label class="block mb-4">
        <span class="text-gray-700">输入文本：</span>
        <textarea id="inputText" rows="6" class="mt-1 block w-full rounded-lg border-gray-300 p-2 focus:outline-none focus:ring-2 focus:ring-blue-300" placeholder="在这里输入要翻译的内容…"></textarea>
      </label>
      <button id="btnTranslate" class="btn-primary w-full">翻 译</button>
      <div id="loading" class="hidden flex justify-center my-2">
        <svg class="animate-spin h-5 w-5 text-blue-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
          <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"></path>
        </svg>
      </div>
      <label class="block mt-4">
        <span class="text-gray-700">翻译结果：</span>
        <textarea id="outputText" rows="6" readonly class="mt-1 block w-full rounded-lg border-gray-300 p-2 bg-gray-50"></textarea>
      </label>
    </div>`;

  const btn = document.getElementById('btnTranslate');
  const input = document.getElementById('inputText');
  const output = document.getElementById('outputText');
  const langSel = document.getElementById('targetLang');
  const loading = document.getElementById('loading');

  btn.onclick = async () => {
    const text = input.value.trim();
    const lang = langSel.value;
    if (!text) {
      alert('请输入要翻译的内容');
      return;
    }
    btn.disabled = true;
    loading.classList.remove('hidden');
    try {
      const res = await api('/translate', { method: 'POST', body: { text, lang } });
      output.value = res.result;
    } catch (err) {
      console.error(err);
      let msg = '翻译失败';
      try {
        const data = JSON.parse(err.message);
        if (data.detail) msg = data.detail;
      } catch {}
      alert(msg);
    } finally {
      loading.classList.add('hidden');
      btn.disabled = false;
    }
  };
}

function showWordModal(w) {
  const modal = document.getElementById('modal');
  const content = document.getElementById('modalContent');
  const isFav = favorites.has(w.word.toLowerCase());
  const favText = isFav ? '取消收藏' : '收藏';
  const favClass = isFav ? 'bg-green-600 text-white' : 'bg-green-200 text-green-800';
  content.innerHTML = `
    <h2 class="text-xl font-bold mb-2">${escapeHTML(w.word)}</h2>
    <div>${w.translations.map(t => `<div>${escapeHTML(t.type || '')} ${escapeHTML(t.translation)}</div>`).join('')}</div>
    ${w.phrases && w.phrases.length ? `<ul class="list-disc pl-4 space-y-1 mt-2 max-h-40 overflow-y-auto">${w.phrases.map(p => `<li>${escapeHTML(p.phrase)} - ${escapeHTML(p.translation)}</li>`).join('')}</ul>` : ''}
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
    const key = w.word.toLowerCase();
    if (favorites.has(key)) {
      try {
        await api('/favorites/' + favorites.get(key), { method: 'DELETE' });
        favorites.delete(key);
        fav.textContent = '收藏';
        fav.classList.remove('bg-green-600', 'text-white');
        fav.classList.add('bg-green-200', 'text-green-800');
      } catch {}
      return;
    }
    let id = w.id;
    if (!id) {
      try {
        const res = await api('/search?q=' + encodeURIComponent(w.word));
        const item = res.find(it => it.word.toLowerCase() === key);
        if (item) id = item.id;
      } catch {}
    }
    if (!id) return;
    try {
      await api('/favorites/' + id, { method: 'POST' });
      favorites.set(key, id);
      fav.textContent = '取消收藏';
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
      <div class="flex gap-2">
        <input id="favSearch" class="border p-2 flex-grow" placeholder="Search favorites">
        <button id="favGo" class="border rounded px-4 py-2 bg-white shadow">Search</button>
      </div>
      <div id="favList" class="space-y-2"></div>
      <button id="genArticle" class="border rounded px-4 py-2 bg-blue-500 text-white">AI生成文章</button>
    </div>
    <div id="modal" class="fixed inset-0 bg-black/50 flex items-center justify-center hidden">
      <div class="bg-white p-4 rounded shadow max-w-md w-full">
        <button id="closeModal" class="float-right">✖</button>
        <div id="articleContent" class="mt-2 prose max-h-96 overflow-y-auto"></div>
        <div id="articleLoading" class="hidden flex justify-center my-2">
          <svg class="animate-spin h-5 w-5 text-blue-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"></path>
          </svg>
        </div>
      </div>
    </div>`;
  const data = await api('/favorites');
  let view = data;
  const favList = document.getElementById('favList');
  function render(list) {
    if (!list.length) {
      favList.innerHTML = '<div class="text-center text-gray-500">No favorites</div>';
      return;
    }
    favList.innerHTML = list.map(w => `
      <label class="flex items-center gap-2">
        <input type="checkbox" value="${w.id}">
        <span class="font-semibold">${escapeHTML(w.word)}</span>
        <span class="text-sm text-gray-600">${w.translations.map(t => `${escapeHTML(t.type || '')} ${escapeHTML(t.translation || '')}`).join(', ')}</span>
        <span class="text-xs text-gray-400 ml-auto">${new Date(w.added_at).toLocaleDateString()}</span>
        <button data-id="${w.id}" class="removeFav text-red-600 ml-2">🗑</button>
      </label>`).join('');
  }
  render(view);
  function doSearch() {
    const q = document.getElementById('favSearch').value.trim().toLowerCase();
    if (!q) {
      view = data;
    } else {
      view = data.filter(w =>
        w.word.toLowerCase().includes(q) ||
        w.translations.some(t => (t.translation && t.translation.includes(q)) || (t.type && t.type.toLowerCase().includes(q)))
      );
    }
    render(view);
  }
  document.getElementById('favGo').onclick = doSearch;
  document.getElementById('favSearch').addEventListener('input', doSearch);

  favList.addEventListener('click', async (e) => {
    if (e.target.classList.contains('removeFav')) {
      const id = parseInt(e.target.dataset.id, 10);
      try {
        await api('/favorites/' + id, { method: 'DELETE' });
        const word = data.find(w => w.id === id).word.toLowerCase();
        favorites.delete(word);
        data.splice(data.findIndex(w => w.id === id), 1);
        view = view.filter(w => w.id !== id);
        render(view);
      } catch {}
    }
  });

  document.getElementById('genArticle').onclick = async () => {
    const ids = Array.from(document.querySelectorAll('#favList input:checked')).map(cb => parseInt(cb.value, 10));
    if (!ids.length) return;
    const btn = document.getElementById('genArticle');
    const modal = document.getElementById('modal');
    const content = document.getElementById('articleContent');
    const loading = document.getElementById('articleLoading');
    btn.disabled = true;
    content.innerHTML = '';
    modal.classList.remove('hidden');
    loading.classList.remove('hidden');
    try {
      const res = await api('/generate_article', { method: 'POST', body: { word_ids: ids } });
      let text = res.result;
      const selected = ids.map(id => data.find(w => w.id === id).word);
      selected.forEach(w => {
        const reg = new RegExp('\\b' + w.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&') + '\\b', 'gi');
        text = text.replace(reg, m => `**${m}**`);
      });
      loading.classList.add('hidden');
      content.innerHTML = '<span class="cursor typing-dot">●</span>';
      const cursor = content.querySelector('.cursor');
      let idx = 0;
      const timer = setInterval(() => {
        if (idx >= text.length) {
          clearInterval(timer);
          cursor.remove();
          content.innerHTML = marked.parse(text);
          return;
        }
        content.insertBefore(document.createTextNode(text[idx++]), cursor);
        content.scrollTop = content.scrollHeight;
      }, 30);
      document.getElementById('closeModal').onclick = () => {
        modal.classList.add('hidden');
        clearInterval(timer);
      };
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
  showAllPhrases = false;
  await showStudy();
}

async function showStats() {
  await ensureWordBook();
  progress = parseInt(localStorage.getItem('progress_' + currentBook), 10) || 0;
  const learned = progress;
  const daily = dailyCount;
  const total = wordBookData.length;
  const counts = statsCounts;
  const history = progressHistory;
  document.getElementById('main').innerHTML = `
    <div class="grid sm:grid-cols-3 gap-4 text-center">
      <div class="shadow rounded p-4 bg-white"><div class="text-2xl font-bold">${learned}</div><div class="text-gray-500">已学习</div></div>
      <div class="shadow rounded p-4 bg-white"><div class="text-2xl font-bold">${daily}</div><div class="text-gray-500">Daily Words</div></div>
      <div class="shadow rounded p-4 bg-white"><div class="text-2xl font-bold">${total}</div><div class="text-gray-500">总词数</div></div>
    </div>
    <div class="mt-6"><canvas id="progressChart"></canvas></div>
    <div class="mt-4 grid grid-cols-3 gap-2 text-center">
      <div data-type="unknown" class="stats-item shadow rounded p-4 bg-white cursor-pointer"><div class="text-xl font-bold">${counts.unknown}</div><div class="text-gray-500">不认识</div></div>
      <div data-type="fuzzy" class="stats-item shadow rounded p-4 bg-white cursor-pointer"><div class="text-xl font-bold">${counts.fuzzy}</div><div class="text-gray-500">模糊</div></div>
      <div data-type="known" class="stats-item shadow rounded p-4 bg-white cursor-pointer"><div class="text-xl font-bold">${counts.known}</div><div class="text-gray-500">认识</div></div>
    </div>
    <div id="statsModal" class="fixed inset-0 bg-black/50 flex items-center justify-center hidden">
      <div class="bg-white p-4 rounded shadow max-w-md w-full">
        <button id="closeStatsModal" class="float-right">✖</button>
        <div id="statsModalContent" class="mt-2 max-h-60 overflow-y-auto"></div>
      </div>
    </div>`;
  if (history.length) {
    const daily = new Map();
    history.forEach(h => {
      const day = new Date(h.time).toISOString().slice(0, 10);
      daily.set(day, h.progress);
    });
    const labels = Array.from(daily.keys());
    const data = Array.from(daily.values());
    const ctx = document.getElementById('progressChart');
    new Chart(ctx, {
      type: 'line',
      data: {
        labels,
        datasets: [{ label: 'Progress', data, borderColor: 'blue', fill: false }]
      },
      options: { scales: { y: { beginAtZero: true } } }
    });
  }
  document.querySelectorAll('.stats-item').forEach(it => {
    it.onclick = () => {
      const type = it.dataset.type;
      const list = statsWords[type] || [];
      const modal = document.getElementById('statsModal');
      const content = document.getElementById('statsModalContent');
      if (list.length) {
        content.innerHTML = '<ul class="list-disc pl-4 space-y-1">' + list.map(w => '<li>' + escapeHTML(w) + '</li>').join('') + '</ul>';
      } else {
        content.innerHTML = '<div class="text-center text-gray-500">No words</div>';
      }
      modal.classList.remove('hidden');
    };
  });
  document.getElementById('closeStatsModal').onclick = () => {
    document.getElementById('statsModal').classList.add('hidden');
  };
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
      <label class="inline-flex items-center gap-2"><input id="speakOnLoad" type="checkbox">自动发音</label>
      <label class="inline-flex items-center gap-2"><input id="shuffleStudy" type="checkbox">乱序学习</label>
      <button id="changePwd" class="border rounded px-4 py-2 shadow bg-gray-300">Change Password</button>
      <button id="saveSettings" class="border rounded px-4 py-2 shadow bg-blue-500 text-white">Save</button>
      <button id="deleteAccount" class="border rounded px-4 py-2 shadow bg-red-500 text-white">Delete Account</button>
      <div id="settingsMsg" class="text-green-600"></div>
    </div>
    <div id="pwdModal" class="fixed inset-0 bg-black/50 flex items-center justify-center hidden">
      <div class="bg-white p-4 rounded shadow max-w-sm w-full">
        <button id="closePwdModal" class="float-right">✖</button>
        <div class="mt-2 space-y-2">
          <div>
            <label class="block mb-1">Old Password</label>
            <input id="oldPasswordInput" type="password" class="border p-2 w-full">
          </div>
          <div>
            <label class="block mb-1">New Password</label>
            <input id="passwordInput" type="password" class="border p-2 w-full">
          </div>
          <button id="savePassword" class="border rounded px-4 py-2 shadow bg-blue-500 text-white">Save</button>
        </div>
      </div>
    </div>`;
  api('/users/me').then(data => {
    document.getElementById('usernameInput').value = data.username;
  });
  api('/wordbooks').then(list => {
    const select = document.getElementById('wordBookSelect');
    select.innerHTML = list.map(n => `<option value="${escapeHTML(n)}">${escapeHTML(n)}</option>`).join('');
    const current = localStorage.getItem('wordBook');
    if (current) select.value = current;
  });
  document.getElementById('speakOnLoad').checked = speakOnLoad;
  document.getElementById('shuffleStudy').checked = shuffleStudy;
  document.getElementById('changePwd').onclick = () => {
    document.getElementById('pwdModal').classList.remove('hidden');
  };
  document.getElementById('closePwdModal').onclick = () => {
    document.getElementById('pwdModal').classList.add('hidden');
  };
  document.getElementById('savePassword').onclick = async () => {
    const oldPwd = document.getElementById('oldPasswordInput').value;
    const newPwd = document.getElementById('passwordInput').value;
    if (!oldPwd || !newPwd) return;
    const err = validatePassword(newPwd);
    if (err) {
      document.getElementById('settingsMsg').textContent = err;
      return;
    }
    try {
      await api('/users/me/password', { method: 'PUT', body: { old_password: oldPwd, new_password: newPwd } });
      localStorage.removeItem('token');
      window.location.href = 'login.html';
    } catch {
      document.getElementById('settingsMsg').textContent = 'Error';
    }
  };
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
    const speakChk = document.getElementById('speakOnLoad').checked;
    localStorage.setItem('speakOnLoad', speakChk ? 'true' : 'false');
    const shuffleChk = document.getElementById('shuffleStudy').checked;
    localStorage.setItem('shuffleStudy', shuffleChk ? 'true' : 'false');
    const username = document.getElementById('usernameInput').value.trim();
    try {
      if (username) await api('/users/me', { method: 'PUT', body: { username } });
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
  const sidebar = document.getElementById('sidebar');
  document.getElementById('toggleNav').onclick = () => sidebar.classList.toggle('open');
  sidebar.addEventListener('click', e => { if (e.target.tagName === 'BUTTON') sidebar.classList.remove('open'); });
  document.getElementById('logout').onclick = logout;
  document.getElementById('study').onclick = showStudy;
  document.getElementById('search').onclick = showSearch;
  document.getElementById('translate').onclick = showTranslate;
  document.getElementById('favorites').onclick = showFavorites;
  document.getElementById('stats').onclick = showStats;
  document.getElementById('settings').onclick = showSettings;
  document.addEventListener('keydown', handleKey);
  showStudy();
}

window.addEventListener('DOMContentLoaded', init);
