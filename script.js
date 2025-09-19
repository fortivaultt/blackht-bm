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

// i18n dictionary
const DICT = {
  en: {
    connecting: 'Connecting to servers…',
    preparing: 'Preparing bundles…',
    awaiting: 'Awaiting launch sequence…',
    preChecklistTitle: 'Pre-upload checklist',
    warningTitle: 'Scheduled Automatic Upload',
    warningNotice: 'Warning: All images and videos on this site are scheduled to be automatically uploaded when the countdown ends.',
    publishing: 'Publishing to the open internet…',
    completeLabel: '✅ Simulation complete — Content Upload (Inhalts-Upload)',
    acknowledge: 'I understand',
    modalLines: ['Connecting to BerlinNet Provider (fiktiv)…', 'Authenticating route… OK', 'Establishing secure tunnel… OK']
  },
  de: {
    connecting: 'Verbinde mit Servern…',
    preparing: 'Bereite Bundles vor…',
    awaiting: 'Warte auf Startsequenz…',
    preChecklistTitle: 'Vor dem Upload prüfen',
    warningTitle: 'Geplanter automatischer Upload',
    warningNotice: 'Warnung: Alle Bilder und Videos auf dieser Seite werden nach Ende des Countdowns automatisch hochgeladen.',
    publishing: 'Veröffentliche im offenen Internet…',
    completeLabel: '✅ Simulation abgeschlossen — Inhalts-Upload',
    acknowledge: 'Verstanden',
    modalLines: ['Verbinde mit BerlinNet Provider (fiktiv)…', 'Authentifiziere Route… OK', 'Sichere Verbindung wird hergestellt… OK']
  }
};

let currentLang = (function(){
  const stored = localStorage.getItem('site_lang');
  if (stored) return stored;
  const nav = (navigator.languages && navigator.languages[0]) || navigator.language || 'en';
  return nav.toLowerCase().startsWith('de') ? 'de' : 'en';
})();

function setLangButtons() {
  [langEnBtn, langDeBtn].forEach(b => { if (!b) return; b.setAttribute('aria-pressed', b.dataset.lang === currentLang ? 'true' : 'false'); });
}

function updateLanguage(lang) {
  currentLang = lang;
  localStorage.setItem('site_lang', lang);
  setLangButtons();

  const dict = DICT[lang] || DICT.en;
  // update connecting texts
  document.querySelectorAll('.checklist-item').forEach(el => {
    const key = el.dataset.key;
    const textEl = el.querySelector('.check-text');
    if (textEl && dict[key]) textEl.textContent = dict[key];
  });
  document.querySelectorAll('.checklist-title').forEach(e => e.textContent = dict.preChecklistTitle || 'Pre-upload checklist');
  if (connectTextEl) connectTextEl.textContent = dict.connecting;
  if (connectStatusEl) connectStatusEl.textContent = dict.connecting;
  document.querySelectorAll('.upload-title').forEach(e => e.textContent = dict.publishing);
  document.querySelectorAll('#content-label').forEach(e => e.textContent = dict.completeLabel);
  document.querySelectorAll('.modal-button').forEach(b => { if (b) b.textContent = dict.acknowledge; });
  if (modalEl) modalEl.querySelector('#upload-warning-title').textContent = dict.warningTitle;
  if (modalEl) modalEl.querySelector('#warning-paragraph').textContent = dict.warningNotice;
}

if (langEnBtn) langEnBtn.addEventListener('click', () => updateLanguage('en'));
if (langDeBtn) langDeBtn.addEventListener('click', () => updateLanguage('de'));

// Initialize language
updateLanguage(currentLang);

function formatTime(seconds) {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

function showModal() {
  if (modalEl) {
    modalEl.classList.add('is-visible');
    requestAnimationFrame(() => startOnboardingEffects());
  }
}

function hideModal() {
  if (modalEl) modalEl.classList.remove('is-visible');
}

if (ackBtn) ackBtn.addEventListener('click', hideModal);

function startOnboardingEffects() {
  const card = modalEl ? modalEl.querySelector('.modal-card') : null;
  if (card) {
    card.classList.add('attention');
    card.style.animation = (card.style.animation ? card.style.animation + ', ' : '') + 'jiggle 0.6s ease-out';
    setTimeout(() => { if (card) card.style.animation = card.style.animation.replace(/,?\s*jiggle[^,]*/,''); }, 700);
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

  const dict = DICT[currentLang] || DICT.en;
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

  setTimeout(() => {
    uploadOverlay.classList.add('is-visible');
    uploadOverlay.setAttribute('aria-hidden', 'false');
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
    const dict = DICT[currentLang] || DICT.en;
    const lines = [dict.modalLines[0], 'Resolving DNS… OK', 'TLS handshake… OK', 'Transfer channels open… OK'];
    typeLines(terminalEl, lines, 14, 180).then(() => {
      if (uploadCompleteEl) {
        uploadCompleteEl.hidden = false;
        uploadCompleteEl.classList.add('show');
        uploadCompleteEl.textContent = (currentLang === 'de') ? 'Upload abgeschlossen – Inhalte sind live (Simulation)' : 'Upload complete – content is live (simulation)';
      }
      if (contentUploadEl) contentUploadEl.hidden = false;
      if (fadeScreen) {
        fadeScreen.classList.remove('fade-in');
        fadeScreen.setAttribute('aria-hidden', 'true');
      }
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

// Pre-upload animated spinner/pulse (keep subtle)
(function decorateChecklist(){
  const icons = document.querySelectorAll('.check-icon');
  icons.forEach(i => i.classList.add('animated-icon'));
})();

// Flashing connecting text toggles EN/DE quickly for realism but language switch overrides
(function startConnectingTicker(){
  let t = 0;
  setInterval(() => {
    t++;
    const dots = '.'.repeat(t % 4);
    const en = `${DICT.en.connecting}${dots}`;
    const de = `${DICT.de.connecting}${dots}`;
    const text = (t % 8 < 4) ? en : de;
    if (connectTextEl && !document.hidden) connectTextEl.textContent = text;
    if (connectStatusEl && !document.hidden) connectStatusEl.textContent = text;
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

// initialize language button states after DOM ready
setLangButtons();
