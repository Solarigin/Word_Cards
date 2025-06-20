const form = document.getElementById('login-form');
form.addEventListener('submit', async e => {
  e.preventDefault();
  const u = form.username.value;
  const p = form.password.value;
  try {
    const data = await apiRequest('/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ username: u, password: p })
    });
    localStorage.setItem('token', data.access_token);
    window.location.href = 'index.html';
  } catch {
    alert('登陆失败，请检查用户名或密码');
  }
});
