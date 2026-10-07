const input = document.querySelector('#inputEditor');
const output = document.querySelector('#outputEditor code');
const formatButton = document.querySelector('#formatButton');
const formatTabs = [...document.querySelectorAll('.format-tab')];
const fileInput = document.querySelector('#fileInput');
const apiStatus = document.querySelector('#apiStatus');
const apiBase = window.FORMATLY_CONFIG?.apiBase || 'https://made-by-sahil.onrender.com';
let format = 'json';
let lastOutput = '';

const samples = {
  json: '{"customer":{"id":"CUS-4182","name":"Maya Chen"},"items":[{"sku":"XR-01","quantity":2}],"total":86.4}',
  xml: '"&lt;?xml version=\\"1.1\\"?&gt;&lt;invoice&gt;&lt;customer id=\\"CUS-4182\\"&gt;Maya Chen&lt;/customer&gt;&lt;items&gt;&lt;item sku=\\"XR-01\\" quantity=\\"2\\"/&gt;&lt;/items&gt;&lt;/invoice&gt;"'
};

function updateCounts() { document.querySelector('#inputCount').textContent = `${input.value.length.toLocaleString()} characters`; }
function setToast(message) { const toast = document.querySelector('#toast'); toast.textContent = message; toast.classList.add('show'); setTimeout(() => toast.classList.remove('show'), 2200); }
function escapeHtml(value) { return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
function highlightJson(value) {
  const token = /("(?:\\.|[^"\\])*")(\s*:)?|(-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?)|\b(true|false|null)\b|([{}\[\],:])/g;
  let html = '', cursor = 0, match;
  while ((match = token.exec(value))) {
    html += escapeHtml(value.slice(cursor, match.index));
    const className = match[1] ? (match[2] ? 'token-key' : 'token-string') : match[3] ? 'token-number' : match[4] === 'null' ? 'token-null' : match[4] ? 'token-boolean' : 'token-punctuation';
    html += `<span class="${className}">${escapeHtml(match[0])}</span>`; cursor = token.lastIndex;
  }
  return html + escapeHtml(value.slice(cursor));
}
function highlightXmlTag(tag) {
  if (tag.startsWith('<?') || tag.startsWith('<!--') || tag.startsWith('<!')) {
    return `<span class="token-declaration">${escapeHtml(tag)}</span>`;
  }
  const parts = tag.match(/^(<\/?)([\w:.-]+)([\s\S]*?)(\/?>)$/);
  if (!parts) return escapeHtml(tag);
  const [, open, name, rawAttributes, close] = parts;
  const attributes = rawAttributes.replace(/(\s+)([\w:.-]+)(\s*=\s*)?("[^"]*"|'[^']*')?/g, (_, space, key, equals = '', value = '') => {
    const assignment = equals ? `${escapeHtml(equals)}<span class="token-string">${escapeHtml(value)}</span>` : '';
    return `${space}<span class="token-attribute">${escapeHtml(key)}</span>${assignment}`;
  });
  return `<span class="token-prefix">${escapeHtml(open)}</span><span class="token-tag">${escapeHtml(name)}</span>${attributes}<span class="token-prefix">${escapeHtml(close)}</span>`;
}
function highlightXml(value) {
  const tags = /<\?[\s\S]*?\?>|<!--[\s\S]*?-->|<![^>]*>|<\/?[\w:.-]+(?:\s+[\w:.-]+(?:\s*=\s*(?:"[^"]*"|'[^']*'))?)*\s*\/?>/g;
  let html = '', cursor = 0, match;
  while ((match = tags.exec(value))) {
    html += escapeHtml(value.slice(cursor, match.index));
    html += highlightXmlTag(match[0]);
    cursor = tags.lastIndex;
  }
  return html + escapeHtml(value.slice(cursor));
}
function renderOutput(value) {
  if (!value) { output.textContent = 'Your formatted result will appear here.'; return; }
  const highlighter = format === 'json' ? highlightJson : highlightXml;
  output.innerHTML = value.split('\n').map(line => `<span class="code-line">${highlighter(line) || ' '}</span>`).join('');
}
function syncReportData() {
  const target = document.querySelector('input[name="reportTarget"]:checked').value;
  document.querySelector(target === 'request' ? '#reportRequestInput' : '#reportResponseInput').value = lastOutput;
}
function setOutput(value, state = 'Formatted successfully') { lastOutput = value; renderOutput(value); if (state === 'Formatted successfully') syncReportData(); document.querySelector('#outputCount').textContent = `${value.length.toLocaleString()} characters`; document.querySelector('#outputState').textContent = state; }
function setFormat(next) {
  format = next;
  formatTabs.forEach(tab => { const selected = tab.dataset.format === format; tab.classList.toggle('active', selected); tab.setAttribute('aria-selected', selected); });
  input.placeholder = format === 'json' ? 'Paste your JSON here…' : 'Paste your XML here…';
  document.querySelector('#inputHint').textContent = format === 'json' ? 'Accepts raw or escaped JSON' : 'Uses organization XML rules';
  setOutput('', 'Waiting for input');
}
async function beautify() {
  const text = input.value.trim();
  if (!text) { setToast(`Paste or upload ${format.toUpperCase()} first.`); input.focus(); return; }
  formatButton.disabled = true; formatButton.firstElementChild.textContent = 'Working';
  try {
    const response = await fetch(`${apiBase}/${format}`, { method:'POST', headers:{ 'Content-Type':'text/plain' }, body:text });
    const result = await response.text();
    if (!response.ok) throw new Error(result || `Request failed (${response.status})`);
    if (result.trim().startsWith('❌')) throw new Error(result);
    setOutput(result); apiStatus.classList.remove('offline'); apiStatus.lastElementChild.textContent = 'Java API connected';
  } catch (error) {
    setOutput(error.message, 'Could not format'); apiStatus.classList.add('offline'); apiStatus.lastElementChild.textContent = 'Backend unavailable'; setToast('Could not reach the Java API. Is it running on this origin?');
  } finally { formatButton.disabled = false; formatButton.firstElementChild.textContent = 'Beautify'; }
}

formatTabs.forEach(tab => tab.addEventListener('click', () => setFormat(tab.dataset.format)));
input.addEventListener('input', updateCounts);
formatButton.addEventListener('click', beautify);
document.querySelector('#sampleButton').addEventListener('click', () => { input.value = samples[format]; updateCounts(); input.focus(); });
document.querySelector('#clearButton').addEventListener('click', () => { input.value = ''; updateCounts(); setOutput('', 'Waiting for input'); input.focus(); });
document.querySelector('#uploadButton').addEventListener('click', () => fileInput.click());
fileInput.addEventListener('change', async () => { const file = fileInput.files[0]; if (!file) return; input.value = await file.text(); if (file.name.endsWith('.xml')) setFormat('xml'); if (file.name.endsWith('.json')) setFormat('json'); updateCounts(); setToast(`${file.name} loaded`); fileInput.value = ''; });
document.querySelector('#copyButton').addEventListener('click', async () => { if (!lastOutput) return setToast('Nothing to copy yet.'); await navigator.clipboard.writeText(lastOutput); setToast('Formatted output copied.'); });
document.querySelector('#downloadButton').addEventListener('click', () => { if (!lastOutput) return setToast('Nothing to download yet.'); const blob = new Blob([lastOutput], { type: format === 'json' ? 'application/json' : 'application/xml' }); const link = Object.assign(document.createElement('a'), { href:URL.createObjectURL(blob), download:`beautified.${format}` }); link.click(); URL.revokeObjectURL(link.href); });
document.querySelector('#loadReportDataButton').addEventListener('click', () => { syncReportData(); setToast('Formatted output loaded into the selected field.'); });
document.querySelector('#downloadReportButton').addEventListener('click', () => {
  const sections = [];
  const credentials = document.querySelector('#credentialsInput').value.trim();
  if (document.querySelector('#includeCredentials').checked && credentials) sections.push(`CREDENTIALS\n${'='.repeat(48)}\n${credentials}`);
  const request = document.querySelector('#reportRequestInput').value.trim();
  const response = document.querySelector('#reportResponseInput').value.trim();
  if (document.querySelector('#includeRequest').checked && request) sections.push(`REQUEST\n${'='.repeat(48)}\n${request}`);
  if (document.querySelector('#includeResponse').checked && response) sections.push(`RESPONSE\n${'='.repeat(48)}\n${response}`);
  if (!sections.length) { setToast('Choose content to include before downloading.'); return; }
  const filename = document.querySelector('#reportFilename').value.trim().replace(/[^a-z0-9_-]/gi, '-') || 'api-transaction-report';
  const report = `API TRANSACTION REPORT\nGenerated: ${new Date().toLocaleString()}\n\n${sections.join('\n\n')}`;
  const link = Object.assign(document.createElement('a'), { href: URL.createObjectURL(new Blob([report], { type: 'text/plain;charset=utf-8' })), download: `${filename}.txt` });
  link.click(); URL.revokeObjectURL(link.href); setToast('Report download started.');
});
const themeToggle = document.querySelector('#themeToggle');
function setTheme(dark) { document.body.classList.toggle('dark', dark); themeToggle.setAttribute('aria-pressed', dark); themeToggle.innerHTML = `<span aria-hidden="true">${dark ? '☀' : '◐'}</span> ${dark ? 'Light mode' : 'Dark mode'}`; localStorage.setItem('formatly-theme', dark ? 'dark' : 'light'); }
themeToggle.addEventListener('click', () => setTheme(!document.body.classList.contains('dark')));
setTheme(localStorage.getItem('formatly-theme') === 'dark');
document.addEventListener('keydown', event => { if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') { event.preventDefault(); beautify(); } });
updateCounts();
