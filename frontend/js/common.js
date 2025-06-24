// 后端 API 的基础地址，如部署在其他位置请修改。
const API_URL = 'http://localhost:8000';

// 简单的 HTML 转义，防止渲染用户输入时出现 XSS。
function escapeHTML(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// 通用的后端 API 调用封装，会带上存储的令牌。
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

// 登录/注册界面使用的密码格式校验。
function validatePassword(pwd) {
  return /^[A-Za-z0-9]{6,}$/.test(pwd)
    ? ''
    : '密码不能为空, 不能含特殊字符且至少6位';
}
