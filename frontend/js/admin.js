document.addEventListener('DOMContentLoaded', loadUsers);

async function loadUsers() {
  const tbody = document.getElementById('user-table-body');
  try {
    const users = await apiRequest('/admin/users');
    tbody.innerHTML = '';
    users.forEach(u => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td class="px-4 py-2">${u.id}</td>
        <td class="px-4 py-2">${u.username}</td>
        <td class="px-4 py-2">${u.role}</td>
        <td class="px-4 py-2 space-x-2">
          <button data-id="${u.id}" class="px-3 py-1 rounded bg-indigo-600 text-white reset-btn">Reset</button>
          <button data-id="${u.id}" class="px-3 py-1 rounded bg-gray-200 text-gray-700 delete-btn">Delete</button>
        </td>`;
      tbody.appendChild(tr);
    });
    document.querySelectorAll('.reset-btn').forEach(b =>
      b.addEventListener('click', resetUser)
    );
    document.querySelectorAll('.delete-btn').forEach(b =>
      b.addEventListener('click', deleteUser)
    );
  } catch (e) {
    console.error(e);
    tbody.innerHTML = '<tr><td colspan="4" class="text-center py-4">加载失败</td></tr>';
  }
}

async function resetUser(e) {
  if (!confirm('确定重置此用户数据？')) return;
  const id = e.target.dataset.id;
  await apiRequest(`/admin/users/${id}/reset`, { method: 'POST' });
  alert('已重置');
}

async function deleteUser(e) {
  if (!confirm('确定删除此用户？')) return;
  const id = e.target.dataset.id;
  await apiRequest(`/admin/users/${id}`, { method: 'DELETE' });
  loadUsers();
}
