// Countdown: 12 hours in seconds
const DEFAULT_DURATION = 43200; // 12 hours in seconds

function getStoredEndTimestamp() {
  const raw = localStorage.getItem('countdown_end');
  const n = raw ? parseInt(raw, 10) : NaN;
  return Number.isFinite(n) ? n : null;
}
function setStoredEndTimestamp(ts) { localStorage.setItem('countdown_end', String(ts)); }
function clearStoredEndTimestamp() { localStorage.removeItem('countdown_end'); }

let endTimestamp = null;

async function fetchServerEndTimestamp() {
  try {
    const res = await fetch('/api/countdown', { method: 'GET', cache: 'no-store' });
    if (!res.ok) throw new Error('Network response not ok');
    const data = await res.json();
    if (data && typeof data.endTimestamp === 'number') return data.endTimestamp;
  } catch (e) {
    return null;
  }
  return null;
}

// If server is not available, fallback to localStorage behavior
function computeLocalEndTimestamp() {
  let ts = getStoredEndTimestamp();
  if (!ts) {
    ts = Date.now() + DEFAULT_DURATION * 1000;
    setStoredEndTimestamp(ts);
  }
  return ts;
}

function getRemainingSeconds() {
  return Math.max(0, Math.ceil((endTimestamp - Date.now()) / 1000));
}

let countdownDuration = 0;
const TOTAL_SECONDS = DEFAULT_DURATION;

// Elements
const timerElement = document.getElementById('timer');
const modalEl = document.getElementById('upload-warning-modal');
const modalTimerEl = document.getElementById('modal-timer');
const ackBtn = document.getElementById('acknowledge-warning');
const uploadOverlay = document.getElementById('upload-overlay');
const uploadTargets = document.querySelectorAll('.upload-target');
const uploadCompleteEl = document.getElementById('upload-complete');

const countdownBarEl = document.getElementById('countdown-bar');
const connectTextEl = document.getElementById('connecting-text');
const connectStatusEl = document.getElementById('connect-status');
const masterBarEl = document.getElementById('master-bar');
const terminalEl = document.getElementById('terminal') || document.getElementById('modal-console');
const globeEl = document.getElementById('globe');
const warningLightsEl = document.querySelector('.warning-lights');
const contentUploadEl = document.getElementById('content-upload');
const modalTyperEl = document.getElementById('onboarding-typer');
const modalProgressBarEl = document.getElementById('modal-progress-bar');
const fadeScreen = document.getElementById('fade-screen');
const preChecklist = document.getElementById('pre-upload-checklist');
const langEnBtn = document.getElementById('lang-en');
const langDeBtn = document.getElementById('lang-de');

// Main/content element that should be blurred when modals are visible
const mainContent = document.querySelector('main') || document.body;

// Helper to update background blur state based on whether any modal/overlay/backdrop is active
function updateBlurState() {
  const modalVisible = !!document.querySelector('.modal-overlay.is-visible');
  const uploadVisible = !!document.querySelector('.upload-overlay.is-visible');
  const fadeActive = !!document.querySelector('.fade-screen.fade-in');
  const shouldBlur = modalVisible || uploadVisible || fadeActive;
  if (!mainContent) return;
  if (shouldBlur) mainContent.classList.add('blurred-content');
  else mainContent.classList.remove('blurred-content');
}

// i18n dictionary
const DICT = {
  en: {
    connecting: 'Connecting to servers…',
    preparing: 'Preparing bundles…',
    awaiting: 'Waiting for start sequence…',
    preChecklistTitle: 'Pre-upload checklist',
    warningTitle: 'Planned Automatic Upload',
    warningNotice: 'Warning: All images and videos on this page will be automatically uploaded when the countdown ends.',
    publishing: 'Publishing to the open Internet…',
    completeLabel: '✅ Timer complete — Content upload',
    acknowledge: 'Understood',
    modalLines: ['Connecting to BerlinNet provider (simulated)…', 'Authenticating route… OK', 'Secure connection being established… OK'],
    identityTitle: 'Identity Details',
    nameLabel: 'Name:',
    addressLabel: 'Address:',
    idLabel: 'Photo ID:',
    connected: 'Connected',
    bundlesComplete: 'Bundles compiled',
    uploadComplete: 'Upload complete — contents are live (simulation)'
  }
};

let currentLang = 'en';

function setLangButtons() {
  [langEnBtn, langDeBtn].forEach(b => { if (!b) return; b.setAttribute('aria-pressed', b.dataset.lang === currentLang ? 'true' : 'false'); });
}

function updateLanguage(lang) {
  currentLang = (lang === 'en') ? 'en' : 'en';
  localStorage.setItem('site_lang', currentLang);
  setLangButtons();

  const dict = DICT[currentLang] || DICT.en;
  // update connecting texts
  document.querySelectorAll('.checklist-item').forEach(el => {
    const key = el.dataset.key;
    const textEl = el.querySelector('.check-text');
    if (textEl && dict[key]) textEl.textContent = dict[key];
  });
  document.querySelectorAll('.checklist-title').forEach(e => e.textContent = dict.preChecklistTitle);
  if (connectTextEl) connectTextEl.textContent = dict.connecting;
  if (connectStatusEl) connectStatusEl.textContent = dict.connecting;
  document.querySelectorAll('.upload-title').forEach(e => e.textContent = dict.publishing);
  document.querySelectorAll('#content-label').forEach(e => e.textContent = dict.completeLabel);
  document.querySelectorAll('.modal-button').forEach(b => { if (b) b.textContent = dict.acknowledge; });
  if (modalEl) modalEl.querySelector('#upload-warning-title').textContent = dict.warningTitle;
  if (modalEl) modalEl.querySelector('#warning-paragraph').textContent = dict.warningNotice;

  const idTitle = document.getElementById('identity-title');
  if (idTitle) idTitle.textContent = dict.identityTitle;
  const idName = document.getElementById('identity-name-label');
  if (idName) idName.textContent = dict.nameLabel;
  const idAddr = document.getElementById('identity-address-label');
  if (idAddr) idAddr.textContent = dict.addressLabel;

  // summary (page body) labels
  const sumTitle = document.getElementById('summary-identity-title');
  if (sumTitle) sumTitle.textContent = dict.identityTitle;
  const sumNameLabel = document.getElementById('summary-name-label');
  if (sumNameLabel) sumNameLabel.textContent = dict.nameLabel;
  const sumAddrLabel = document.getElementById('summary-address-label');
  if (sumAddrLabel) sumAddrLabel.textContent = dict.addressLabel;
  const sumIdLabel = document.getElementById('summary-id-label');
  if (sumIdLabel) sumIdLabel.textContent = dict.idLabel;
}

// No language switch listeners (kept for safety if elements exist)
if (langEnBtn) langEnBtn.addEventListener('click', () => updateLanguage('de'));
if (langDeBtn) langDeBtn.addEventListener('click', () => updateLanguage('de'));

// Initialize language
updateLanguage('de');

function formatTime(seconds) {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

function showModal() {
  if (modalEl) {
    modalEl.classList.add('is-visible');
    updateBlurState();
    requestAnimationFrame(() => startOnboardingEffects());
  }
}

function hideModal() {
  if (modalEl) modalEl.classList.remove('is-visible');
  // defer update to ensure any other overlays are considered
  setTimeout(updateBlurState, 8);
}

if (ackBtn) ackBtn.addEventListener('click', hideModal);

function startOnboardingEffects() {
  const card = modalEl ? modalEl.querySelector('.modal-card') : null;
  if (card) {
    card.classList.add('attention');
    card.style.animation = (card.style.animation ? card.style.animation + ', ' : '') + 'jiggle 0.6s ease-out';
    setTimeout(() => { if (card) card.style.animation = card.style.animation.replace(/,?\s*jiggle[^,]*/, ''); }, 700);
  }

  if (modalProgressBarEl) {
    modalProgressBarEl.style.width = '0%';
    let p = 0;
    const t = setInterval(() => {
      p = Math.min(100, p + 5 + Math.random() * 8);
      modalProgressBarEl.style.width = p + '%';
      if (p >= 100) clearInterval(t);
    }, 180);
  }

  const dict = DICT[currentLang] || DICT.de;
  const lines = dict.modalLines;
  typeLines(modalTyperEl, lines, 16, 320);
}

function startUploadSequence() {
  if (!uploadOverlay) return;
  // Fade to black, then show upload overlay with modal console
  if (fadeScreen) {
    fadeScreen.setAttribute('aria-hidden', 'false');
    fadeScreen.classList.add('fade-in');
  }
  updateBlurState();

  setTimeout(() => {
    uploadOverlay.classList.add('is-visible');
    uploadOverlay.setAttribute('aria-hidden', 'false');
    updateBlurState();
    if (warningLightsEl) warningLightsEl.style.display = 'none';

    uploadTargets.forEach((item, idx) => {
      setTimeout(() => {
        item.classList.add('active');
        setTimeout(() => item.classList.add('complete'), 1600);
      }, idx * 350);
    });

    // master progress from 0 -> 100
    let master = 0;
    const masterTimer = setInterval(() => {
      master = Math.min(100, master + 4 + Math.random() * 6);
      if (masterBarEl) masterBarEl.style.width = `${master}%`;
      if (master >= 100) clearInterval(masterTimer);
    }, 200);

    // console typing & globe pulse
    const dict = DICT[currentLang] || DICT.de;
    const extraLines = (currentLang === 'de')
      ? ['DNS wird aufgelöst… OK', 'TLS-Handshake… OK', 'Übertragungskanäle geöffnet… OK']
      : ['Resolving DNS… OK', 'TLS handshake… OK', 'Transfer channels open… OK'];
    const lines = [dict.modalLines[0], ...extraLines];
    typeLines(terminalEl, lines, 14, 180).then(() => {
      if (uploadCompleteEl) {
        uploadCompleteEl.hidden = false;
        uploadCompleteEl.classList.add('show');
        uploadCompleteEl.textContent = 'Upload abgeschlossen – Inhalte sind live (Simulation)';
      }
      if (contentUploadEl) contentUploadEl.hidden = false;
      if (fadeScreen) {
        fadeScreen.classList.remove('fade-in');
        fadeScreen.setAttribute('aria-hidden', 'true');
      }
      // update blur after fade-screen removed
      setTimeout(updateBlurState, 8);
    });
  }, 500);
}

function updateTimersDisplay(seconds) {
  const text = formatTime(seconds);
  if (timerElement) timerElement.textContent = text;
  if (modalTimerEl) modalTimerEl.textContent = text;
  if (countdownBarEl) {
    const pct = TOTAL_SECONDS > 0 ? ((TOTAL_SECONDS - seconds) / TOTAL_SECONDS) * 100 : 100;
    countdownBarEl.style.width = `${Math.max(0, Math.min(100, pct))}%`;
  }
}

// Pre-upload animated spinner/pulse (keep subtle) + checklist sequence
function runChecklistSequence() {
  const items = {
    connecting: document.querySelector('.checklist-item[data-key="connecting"]'),
    preparing: document.querySelector('.checklist-item[data-key="preparing"]'),
    awaiting: document.querySelector('.checklist-item[data-key="awaiting"]')
  };

  // helper to mark complete and swap icon to check
  function markComplete(el) {
    if (!el) return;
    const icon = el.querySelector('.check-icon');
    const textEl = el.querySelector('.check-text');
    if (icon) { icon.classList.remove('animated-icon'); icon.textContent = '✅'; }
    el.classList.add('completed');
    if (textEl) textEl.classList.add('status');
  }

  // CONNECTING -> Connected -> fade away
  if (items.connecting) {
    const textEl = items.connecting.querySelector('.check-text');
    setTimeout(() => {
      if (textEl) textEl.textContent = 'Verbunden';
      markComplete(items.connecting);
      setTimeout(() => items.connecting.classList.add('fade-away'), 1200);
    }, 2400);
  }

  // PREPARING -> Bundles compiled -> fade away
  if (items.preparing) {
    const textEl = items.preparing.querySelector('.check-text');
    setTimeout(() => {
      if (textEl) textEl.textContent = DICT[currentLang].preparing;
    }, 300);

    setTimeout(() => {
      if (textEl) textEl.textContent = 'Bundles abgeschlossen';
      markComplete(items.preparing);
      setTimeout(() => items.preparing.classList.add('fade-away'), 1200);
    }, 4200);
  }

  // awaiting stays visible
}

(function decorateChecklist(){
  const icons = document.querySelectorAll('.check-icon');
  icons.forEach(i => i.classList.add('animated-icon'));
  runChecklistSequence();
})();

// Connecting text ticker (German only)
(function startConnectingTicker(){
  let t = 0;
  setInterval(() => {
    t++;
    const dots = '.'.repeat(t % 4);
    const de = `${DICT.de.connecting}${dots}`;
    if (connectTextEl && !document.hidden) connectTextEl.textContent = de;
    if (connectStatusEl && !document.hidden) connectStatusEl.textContent = de;
  }, 600);
})();

function typeLines(el, lines, charDelay = 18, lineDelay = 250) {
  return new Promise(resolve => {
    if (!el) return resolve();
    let li = 0, ci = 0;
    el.textContent = '';

    const cursor = document.createElement('span');
    cursor.className = 'cursor';
    el.appendChild(cursor);

    function typeNextChar() {
      if (li >= lines.length) return resolve();
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
    typeNextChar();
  });
}

function startCountdownLoop() {
  // Initialize displays
  countdownDuration = getRemainingSeconds();
  updateTimersDisplay(countdownDuration);

  const countdownInterval = setInterval(() => {
    countdownDuration = getRemainingSeconds();
    if (countdownDuration <= 0) {
      clearInterval(countdownInterval);
      updateTimersDisplay(0);
      clearStoredEndTimestamp();
      startUploadSequence();
    } else {
      updateTimersDisplay(countdownDuration);
    }
  }, 1000);
}

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

// initialize language button states after DOM ready
setLangButtons();

// Boot sequence: obtain persistent end timestamp from server; fallback to localStorage when offline
(async function init() {
  const serverTs = await fetchServerEndTimestamp();
  if (serverTs && typeof serverTs === 'number') {
    endTimestamp = serverTs;
    setStoredEndTimestamp(endTimestamp);
  } else {
    endTimestamp = computeLocalEndTimestamp();
  }

  startCountdownLoop();
  showModal();
})();
