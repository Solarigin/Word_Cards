// Perform a login request using a form POST.
function loginRequest(username, password) {
  const form = new URLSearchParams();
  form.append('username', username);
  form.append('password', password);
  return fetch(API_URL + '/auth/login', { method: 'POST', body: form })
    .then(res => res.ok ? res.json() : Promise.reject());
}

// Store token and redirect to the appropriate dashboard after login.
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

// Register a new account via the API.
function registerRequest(username, password) {
  return api('/auth/register', { method: 'POST', body: { username, password } });
}

// Wire up the login and register buttons once the page loads.
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
