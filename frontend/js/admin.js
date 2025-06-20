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
      <td class="border px-2">${escapeHTML(u.username)}</td>
      <td class="border px-2">${escapeHTML(u.role)}</td>
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

async function loadDeletions() {
  try {
    const data = await api('/admin/deletion_requests');
    const rows = data.map(r => `<tr>
      <td class="border px-2">${r.user_id}</td>
      <td class="border px-2">${escapeHTML(r.username)}</td>
      <td class="border px-2">${new Date(r.requested_at).toLocaleString()}</td>
      <td class="border px-2 text-center"><button data-id="${r.user_id}" class="approve bg-red-500 text-white px-2 rounded">Approve</button></td>
    </tr>`).join('');
    document.getElementById('main').innerHTML = `
      <table class="table-auto w-full bg-white shadow rounded">
        <thead><tr><th class="border px-2">ID</th><th class="border px-2">User</th><th class="border px-2">Requested</th><th class="border px-2">Actions</th></tr></thead>
        <tbody>${rows}</tbody>
      </table>
      <div id="msg" class="text-green-600 mt-2"></div>`;
    document.querySelectorAll('button.approve').forEach(btn => {
      btn.onclick = async () => {
        try {
          await api(`/admin/deletion_requests/${btn.dataset.id}/approve`, { method: 'POST' });
          loadDeletions();
        } catch {
          document.getElementById('msg').textContent = 'Error';
        }
      };
    });
  } catch {
    document.getElementById('main').textContent = 'Failed to load requests';
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
  const sidebar = document.getElementById('sidebar');
  document.getElementById('toggleNav').onclick = () => sidebar.classList.toggle('open');
  sidebar.addEventListener('click', e => { if (e.target.tagName === 'BUTTON') sidebar.classList.remove('open'); });
  document.getElementById('logout').onclick = logout;
  document.getElementById('users').onclick = loadUsers;
  document.getElementById('deletions').onclick = loadDeletions;
  loadUsers();
}

window.addEventListener('DOMContentLoaded', init);
