const API_BASE = 'http://localhost:8000';

async function apiRequest(path, options = {}) {
  const token = localStorage.getItem('token');
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {})
  };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const res = await fetch(API_BASE + path, { ...options, headers });
  if (!res.ok) throw new Error(`API Error ${res.status}`);
  return res.json();
}

// Study 页面逻辑：加载单词、翻转、下一词
document.addEventListener('DOMContentLoaded', () => {
  const front = document.getElementById('card-front');
  const back = document.getElementById('card-back');
  const inner = document.getElementById('card-inner');
  if (!front || !back || !inner) return;
  document.getElementById('flip-btn').addEventListener('click', () => {
    inner.classList.toggle('flipped');
  });
  document.getElementById('next-btn').addEventListener('click', loadWord);

  async function loadWord() {
    try {
      const data = await apiRequest('/words/review');
      front.textContent = data.word;
      back.textContent = data.translation;
      inner.classList.remove('flipped');
      const prog = document.getElementById('progress-text');
      if (prog && data.reviewed != null && data.total != null) {
        prog.textContent = `今日：${data.reviewed}/${data.total}`;
      }
    } catch (e) {
      console.error(e);
    }
  }

  loadWord();
});
