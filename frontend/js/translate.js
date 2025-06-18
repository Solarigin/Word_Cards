function init() {
  const btn = document.getElementById('btnTranslate');
  const input = document.getElementById('inputText');
  const output = document.getElementById('outputText');
  const langSel = document.getElementById('targetLang');
  const loading = document.getElementById('loading');

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
      alert('翻译失败');
    } finally {
      loading.classList.add('hidden');
      btn.disabled = false;
    }
  };
}

window.addEventListener('DOMContentLoaded', init);
