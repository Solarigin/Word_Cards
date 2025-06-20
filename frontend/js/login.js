const form = document.getElementById('login-form');
form.addEventListener('submit', async e => {
  e.preventDefault();
  const u = form.username.value;
  const p = form.password.value;
  try {
    const data = await apiRequest('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username: u, password: p })
    });
    localStorage.setItem('token', data.token);
    window.location.href = 'index.html';
  } catch {
    alert('登陆失败，请检查用户名或密码');
  }
});
