const API_URL = 'http://localhost:8000';

function escapeHTML(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

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
