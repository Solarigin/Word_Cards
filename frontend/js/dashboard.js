document.addEventListener('DOMContentLoaded', async () => {
  const container = document.getElementById('stats-container');
  try {
    const stats = await apiRequest('/stats/overview');
    container.innerHTML = `
      <p class="text-lg mb-2">今日复习：${stats.reviewed}/${stats.total}</p>
      <p class="text-lg">正确率：${stats.accuracy}%</p>
    `;
  } catch (e) {
    console.error(e);
    container.textContent = '加载失败';
  }
});
