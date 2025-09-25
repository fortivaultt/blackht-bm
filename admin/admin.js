async function getCurrent() {
  try {
    const res = await fetch('/api/countdown', { cache: 'no-store' });
    if (!res.ok) throw new Error('err');
    const d = await res.json();
    return d && d.endTimestamp ? Number(d.endTimestamp) : null;
  } catch (e) { return null; }
}
function fmt(ts) { try { const d=new Date(Number(ts)); return d.toLocaleString(); } catch (e) { return String(ts); } }
async function refreshDisplay() {
  const ts = await getCurrent();
  const el = document.getElementById('current-end');
  if (!el) return;
  el.textContent = ts ? fmt(ts) + ' (' + Math.ceil((ts-Date.now())/1000) + 's übrig)' : 'nicht verfügbar';
  if (ts) {
    const d = new Date(ts);
    const iso = new Date(d.getTime() - d.getTimezoneOffset()*60000).toISOString().slice(0,16);
    document.getElementById('admin-end-datetime').value = iso;
  }
}
async function postEnd(ts) {
  try {
    const res = await fetch('/api/countdown', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ endTimestamp: ts }) });
    return res.ok;
  } catch (e) { return false; }
}

document.addEventListener('DOMContentLoaded', () => {
  const setBtn = document.getElementById('admin-set-end');
  const setDurationBtn = document.getElementById('admin-set-duration');
  const resetBtn = document.getElementById('admin-reset');
  const refreshBtn = document.getElementById('admin-refresh');

  if (setBtn) setBtn.addEventListener('click', async () => {
    const v = document.getElementById('admin-end-datetime').value;
    if (!v) return alert('Bitte Endzeit wählen');
    const ts = new Date(v).getTime();
    if (isNaN(ts) || ts <= Date.now()) return alert('Endzeit muss in der Zukunft liegen');
    const ok = await postEnd(ts);
    if (ok) { alert('Gesetzt'); await refreshDisplay(); } else alert('Fehler');
  });

  if (setDurationBtn) setDurationBtn.addEventListener('click', async () => {
    const h = Number(document.getElementById('admin-hours').value || 0);
    const m = Number(document.getElementById('admin-mins').value || 0);
    if (isNaN(h) || isNaN(m) || h<0 || m<0) return alert('Ungültig');
    const ts = Date.now() + (h*3600 + m*60)*1000;
    const ok = await postEnd(ts);
    if (ok) { alert('Gesetzt'); await refreshDisplay(); } else alert('Fehler');
  });

  if (resetBtn) resetBtn.addEventListener('click', async () => {
    const ok = await fetch('/api/countdown', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ reset: true }) });
    if (ok.ok) { alert('Zurückgesetzt'); await refreshDisplay(); } else alert('Fehler');
  });

  if (refreshBtn) refreshBtn.addEventListener('click', refreshDisplay);
  refreshDisplay();
});
