// Countdown: 12 hours in seconds
let countdownDuration = 43200;
const initialDuration = countdownDuration;

// Elements
const timerElement = document.getElementById('timer');
const modalEl = document.getElementById('upload-warning-modal');
const modalTimerEl = document.getElementById('modal-timer');
const ackBtn = document.getElementById('acknowledge-warning');
const modalProgressFill = document.getElementById('modal-progress-fill');
const pageProgressFill = document.getElementById('page-progress-fill');

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
}

function updateProgress(secondsRemaining) {
  const progressed = Math.min(Math.max((initialDuration - secondsRemaining) / initialDuration, 0), 1);
  const pct = (progressed * 100).toFixed(2) + '%';
  if (modalProgressFill) modalProgressFill.style.width = pct;
  if (pageProgressFill) pageProgressFill.style.width = pct;
}

// Initialize displays
updateTimersDisplay(countdownDuration);
updateProgress(countdownDuration);

const countdownInterval = setInterval(() => {
  if (countdownDuration <= 0) {
    clearInterval(countdownInterval);
    countdownDuration = 0;
    updateTimersDisplay(0);
    updateProgress(0);
  } else {
    updateTimersDisplay(countdownDuration);
    updateProgress(countdownDuration);
    countdownDuration--;
  }
}, 1000);

// Show modal on page load
showModal();
