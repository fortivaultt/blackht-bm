// Countdown: 12 hours in seconds
let countdownDuration = 43200;
const TOTAL_SECONDS = countdownDuration;

// Elements
const timerElement = document.getElementById('timer');
const modalEl = document.getElementById('upload-warning-modal');
const modalTimerEl = document.getElementById('modal-timer');
const ackBtn = document.getElementById('acknowledge-warning');
const uploadOverlay = document.getElementById('upload-overlay');
const uploadTargets = document.querySelectorAll('.upload-target');
const uploadCompleteEl = document.getElementById('upload-complete');

// New UI elements
const countdownBarEl = document.getElementById('countdown-bar');
const connectTextEl = document.getElementById('connecting-text');
const connectStatusEl = document.getElementById('connect-status');
const masterBarEl = document.getElementById('master-bar');
const terminalEl = document.getElementById('terminal');
const globeEl = document.getElementById('globe');
const warningLightsEl = document.querySelector('.warning-lights');
const contentUploadEl = document.getElementById('content-upload');

function formatTime(seconds) {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

function showModal() {
  if (modalEl) modalEl.classList.add('is-visible');
}

function hideModal() {
  if (modalEl) modalEl.classList.remove('is-visible');
}

if (ackBtn) ackBtn.addEventListener('click', hideModal);

function updateTimersDisplay(seconds) {
  const text = formatTime(seconds);
  if (timerElement) timerElement.textContent = text;
  if (modalTimerEl) modalTimerEl.textContent = text;
  if (countdownBarEl) {
    const pct = TOTAL_SECONDS > 0 ? ((TOTAL_SECONDS - seconds) / TOTAL_SECONDS) * 100 : 100;
    countdownBarEl.style.width = `${Math.max(0, Math.min(100, pct))}%`;
  }
}

// Flashing "Connecting to servers…" text (EN/DE)
(function startConnectingTicker(){
  let t = 0;
  setInterval(() => {
    t++;
    const dots = '.'.repeat(t % 4);
    const en = `Connecting to servers${dots}`;
    const de = `Verbinde mit Servern${dots}`;
    const text = (t % 8 < 4) ? en : de;
    if (connectTextEl) connectTextEl.textContent = text;
    if (connectStatusEl) connectStatusEl.textContent = text;
  }, 600);
})();

// Terminal typing effect
function typeLines(el, lines, charDelay = 18, lineDelay = 250) {
  return new Promise(resolve => {
    if (!el) return resolve();
    let li = 0, ci = 0;
    el.textContent = '';
    let cursorVisible = true;

    const cursor = document.createElement('span');
    cursor.className = 'cursor';
    el.appendChild(cursor);

    function typeNextChar() {
      if (li >= lines.length) {
        return resolve();
      }
      const line = lines[li];
      if (ci < line.length) {
        cursor.before(document.createTextNode(line[ci]));
        ci++;
        el.scrollTop = el.scrollHeight;
        setTimeout(typeNextChar, charDelay);
      } else {
        cursor.before(document.createTextNode('\n'));
        li++;
        ci = 0;
        setTimeout(typeNextChar, lineDelay);
      }
    }

    // Keep cursor blinking using CSS; just start typing
    typeNextChar();
  });
}

function startUploadSequence() {
  if (!uploadOverlay) return;
  uploadOverlay.classList.add('is-visible');
  uploadOverlay.setAttribute('aria-hidden', 'false');
  if (warningLightsEl) warningLightsEl.style.display = 'none';

  // Sequentially animate target bars
  uploadTargets.forEach((item, idx) => {
    setTimeout(() => {
      item.classList.add('active');
      setTimeout(() => item.classList.add('complete'), 1600);
    }, idx * 350);
  });

  // Master progress smooth fill
  let master = 0;
  const masterTimer = setInterval(() => {
    master = Math.min(100, master + 3 + Math.random() * 5);
    if (masterBarEl) masterBarEl.style.width = `${master}%`;
    if (master >= 100) clearInterval(masterTimer);
  }, 250);

  // Terminal staged logs (EN/DE for realism)
  const lines = [
    '[DE] Initialisiere Upload-Pipeline…',
    'Resolving DNS… OK (34 ms)',
    'TLS 1.3 handshake… OK',
    '[DE] Verbinde mit ARD… OK',
    '[DE] Verbinde mit ZDF… OK',
    '[DE] Verbinde mit Tagesschau… OK',
    'Handshake Cloudflare/Akamai… OK',
    'OAuth2 scope: upload.read write… OK',
    '[DE] Sichere Metadaten hinzufügen (geo=DE, lang=de-DE)… OK',
    'Queue: 4 videos, 12 photos',
    'Multipart upload start…',
    'Chunk 1/8… OK',
    'Chunk 2/8… OK',
    'Chunk 3/8… OK',
    'Chunk 4/8… OK',
    'Chunk 5/8… OK',
    'Chunk 6/8… OK',
    'Chunk 7/8… OK',
    'Chunk 8/8… OK',
    '[DE] Abschluss & Verifizierung… OK'
  ];

  typeLines(terminalEl, lines, 14, 180).then(() => {
    // Show completion message and reveal content
    if (uploadCompleteEl) {
      uploadCompleteEl.hidden = false;
      uploadCompleteEl.classList.add('show');
      uploadCompleteEl.textContent = 'Upload abgeschlossen – Inhalte sind live (Simulation)';
    }
    if (contentUploadEl) contentUploadEl.hidden = false;
  });
}

// Initialize displays
updateTimersDisplay(countdownDuration);

const countdownInterval = setInterval(() => {
  if (countdownDuration <= 0) {
    clearInterval(countdownInterval);
    updateTimersDisplay(0);
    startUploadSequence();
  } else {
    updateTimersDisplay(countdownDuration);
    countdownDuration--;
  }
}, 1000);

// Show modal on page load
showModal();

function ensureAutoplay() {
  document.querySelectorAll('.sp-embed-player iframe').forEach((f) => {
    try {
      const u = new URL(f.src);
      if (!u.searchParams.get('autoplay')) u.searchParams.set('autoplay', '1');
      u.searchParams.set('muted', '1');
      f.setAttribute('allow', 'autoplay; fullscreen');
      if (f.getAttribute('src') !== u.toString()) f.src = u.toString();
    } catch (e) {}
  });
}

ensureAutoplay();
setTimeout(ensureAutoplay, 1200);
