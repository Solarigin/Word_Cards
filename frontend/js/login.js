// 使用表单 POST 执行登录请求。
function loginRequest(username, password) {
  const form = new URLSearchParams();
  form.append('username', username);
  form.append('password', password);
  return fetch(API_URL + '/auth/login', { method: 'POST', body: form })
    .then(res => res.ok ? res.json() : Promise.reject());
}

// 存储令牌并在登录后跳转到相应的页面。
async function afterAuth(token) {
  localStorage.setItem('token', token);
  try {
    const me = await api('/users/me');
    localStorage.setItem('role', me.role);
    window.location.href = me.role === 'admin' ? 'admin.html' : 'dashboard.html';
  } catch {
    document.getElementById('msg').textContent = 'Login failed';
  }
}

// 通过 API 注册新账户。
function registerRequest(username, password) {
  return api('/auth/register', { method: 'POST', body: { username, password } });
}

// 页面加载后绑定登录和注册按钮。
function init() {
  document.getElementById('login').onclick = async () => {
    const u = document.getElementById('user').value;
    const p = document.getElementById('pwd').value;
    const err = validatePassword(p);
    if (err) {
      document.getElementById('msg').textContent = err;
      return;
    }
    try {
      const data = await loginRequest(u, p);
      await afterAuth(data.access_token);
    } catch {
      document.getElementById('msg').textContent = 'Login failed';
    }
  };

  document.getElementById('register').onclick = async () => {
    const u = document.getElementById('user').value;
    const p = document.getElementById('pwd').value;
    const err = validatePassword(p);
    if (err) {
      document.getElementById('msg').textContent = err;
      return;
    }
    try {
      await registerRequest(u, p);
      const data = await loginRequest(u, p);
      await afterAuth(data.access_token);
    } catch {
      document.getElementById('msg').textContent = 'Register failed';
    }
  };
}

window.addEventListener('DOMContentLoaded', init);
