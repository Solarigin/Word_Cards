function logout() {
  localStorage.removeItem('token');
  localStorage.removeItem('role');
  window.location.href = 'login.html';
}

async function loadUsers() {
  try {
    const data = await api('/admin/users');
    const rows = data.map(u => `<tr>
      <td class="border px-2">${u.id}</td>
      <td class="border px-2">${u.username}</td>
      <td class="border px-2">${u.role}</td>
      <td class="border px-2 text-center"><button data-id="${u.id}" class="reset bg-blue-500 text-white px-2 rounded">Reset</button></td>
    </tr>`).join('');
    document.getElementById('main').innerHTML = `
      <table class="table-auto w-full bg-white shadow rounded">
        <thead><tr><th class="border px-2">ID</th><th class="border px-2">Username</th><th class="border px-2">Role</th><th class="border px-2">Actions</th></tr></thead>
        <tbody>${rows}</tbody>
      </table>
      <div id="msg" class="text-green-600 mt-2"></div>`;
    document.querySelectorAll('button.reset').forEach(btn => {
      btn.onclick = async () => {
        const pwd = prompt('New password:');
        if (!pwd) return;
        try {
          await api(`/admin/users/${btn.dataset.id}/reset_pwd?password=${encodeURIComponent(pwd)}`, { method: 'PUT' });
          document.getElementById('msg').textContent = 'Password reset';
        } catch {
          document.getElementById('msg').textContent = 'Error';
        }
      };
    });
  } catch {
    document.getElementById('main').textContent = 'Failed to load users';
  }
}

function init() {
  if (!localStorage.getItem('token')) {
    window.location.href = 'login.html';
    return;
  }
  if (localStorage.getItem('role') !== 'admin') {
    window.location.href = 'dashboard.html';
    return;
  }
  document.getElementById('logout').onclick = logout;
  document.getElementById('users').onclick = loadUsers;
  loadUsers();
}

window.addEventListener('DOMContentLoaded', init);
