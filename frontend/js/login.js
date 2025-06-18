function loginRequest(username, password) {
  const form = new URLSearchParams();
  form.append('username', username);
  form.append('password', password);
  return fetch(API_URL + '/auth/login', { method: 'POST', body: form })
    .then(res => res.ok ? res.json() : Promise.reject());
}

function registerRequest(username, password) {
  return api('/auth/register', { method: 'POST', body: { username, password } });
}

function init() {
  document.getElementById('login').onclick = async () => {
    const u = document.getElementById('user').value;
    const p = document.getElementById('pwd').value;
    try {
      const data = await loginRequest(u, p);
      localStorage.setItem('token', data.access_token);
      window.location.href = 'dashboard.html';
    } catch {
      document.getElementById('msg').textContent = 'Login failed';
    }
  };

  document.getElementById('register').onclick = async () => {
    const u = document.getElementById('user').value;
    const p = document.getElementById('pwd').value;
    try {
      await registerRequest(u, p);
      const data = await loginRequest(u, p);
      localStorage.setItem('token', data.access_token);
      window.location.href = 'dashboard.html';
    } catch {
      document.getElementById('msg').textContent = 'Register failed';
    }
  };
}

window.addEventListener('DOMContentLoaded', init);
