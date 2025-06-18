function init() {
  if (!localStorage.getItem('token')) {
    window.location.href = 'login.html';
    return;
  }

  const btn = document.getElementById('btnTranslate');
  const input = document.getElementById('inputText');
  const output = document.getElementById('outputText');
  const langSel = document.getElementById('targetLang');
  const loading = document.getElementById('loading');

  const backBtn = document.getElementById('dashboard');
  const logoutBtn = document.getElementById('logout');

  backBtn.onclick = () => {
    window.location.href = 'dashboard.html';
  };
  logoutBtn.onclick = () => {
    localStorage.removeItem('token');
    window.location.href = 'login.html';
  };

  btn.onclick = async () => {
    const text = input.value.trim();
    const lang = langSel.value;
    if (!text) {
      alert('请输入要翻译的内容');
      return;
    }
    btn.disabled = true;
    loading.classList.remove('hidden');
    try {
      const res = await api('/translate', { method: 'POST', body: { text, lang } });
      output.value = res.result;
    } catch (err) {
      console.error(err);
      let msg = '翻译失败';
      try {
        const data = JSON.parse(err.message);
        if (data.detail) msg = data.detail;
      } catch {}
      alert(msg);
    } finally {
      loading.classList.add('hidden');
      btn.disabled = false;
    }
  };
}

window.addEventListener('DOMContentLoaded', init);
