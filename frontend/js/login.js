function loginRequest(username, password) {
  const form = new URLSearchParams();
  form.append('username', username);
  form.append('password', password);
  return fetch(API_URL + '/auth/login', { method: 'POST', body: form })
    .then(res => res.ok ? res.json() : Promise.reject());
}

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

function registerRequest(username, password) {
  return api('/auth/register', { method: 'POST', body: { username, password } });
}

function init() {
  document.getElementById('login').onclick = async () => {
    const u = document.getElementById('user').value;
    const p = document.getElementById('pwd').value;
    if (!/^[A-Za-z0-9]{6,}$/.test(p)) {
      document.getElementById('msg').textContent = '密码不能为空, 不能含特殊字符且至少6位';
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
    if (!/^[A-Za-z0-9]{6,}$/.test(p)) {
      document.getElementById('msg').textContent = '密码不能为空, 不能含特殊字符且至少6位';
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
