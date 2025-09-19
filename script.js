// Countdown: 12 hours in seconds
let countdownDuration = 43200;

// Elements
const timerElement = document.getElementById('timer');
const modalEl = document.getElementById('upload-warning-modal');
const modalTimerEl = document.getElementById('modal-timer');
const ackBtn = document.getElementById('acknowledge-warning');
const uploadOverlay = document.getElementById('upload-overlay');
const uploadTargets = document.querySelectorAll('.upload-target');
const uploadCompleteEl = document.getElementById('upload-complete');

function formatTime(seconds) {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

function showModal() {
  if (modalEl) {
    modalEl.classList.add('is-visible');
  }
}

function hideModal() {
  if (modalEl) {
    modalEl.classList.remove('is-visible');
  }
}

if (ackBtn) {
  ackBtn.addEventListener('click', hideModal);
}

function startUploadSequence() {
  if (!uploadOverlay) return;
  uploadOverlay.classList.add('is-visible');
  uploadOverlay.setAttribute('aria-hidden', 'false');

  uploadTargets.forEach((item, idx) => {
    setTimeout(() => {
      item.classList.add('active');
      setTimeout(() => item.classList.add('complete'), 1600);
    }, idx * 350);
  });

  const totalTime = uploadTargets.length * 350 + 1800;
  setTimeout(() => {
    if (uploadCompleteEl) {
      uploadCompleteEl.hidden = false;
      uploadCompleteEl.classList.add('show');
    }
  }, totalTime);
}

function updateTimersDisplay(seconds) {
  const text = formatTime(seconds);
  if (timerElement) timerElement.textContent = text;
  if (modalTimerEl) modalTimerEl.textContent = text;
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
