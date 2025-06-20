const form = document.getElementById('register-form');
form.addEventListener('submit', async e => {
  e.preventDefault();
  const u = form.username.value;
  const p = form.password.value;
  try {
    const data = await apiRequest('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ username: u, password: p })
    });
    localStorage.setItem('token', data.access_token);
    window.location.href = 'index.html';
  } catch {
    alert('注册失败，用户名可能已被占用');
  }
});
