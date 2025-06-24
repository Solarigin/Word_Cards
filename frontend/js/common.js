// Base URL of the backend API. Update if the server is hosted elsewhere.
const API_URL = 'http://localhost:8000';

// Simple HTML escaping to avoid XSS when rendering user supplied text.
function escapeHTML(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// Generic helper for calling the backend API with the stored token.
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

// Password format check used on the login/register screens.
function validatePassword(pwd) {
  return /^[A-Za-z0-9]{6,}$/.test(pwd)
    ? ''
    : '密码不能为空, 不能含特殊字符且至少6位';
}
