let countdownDuration = 43200;
const timerElement = document.getElementById('timer');

function formatTime(seconds) {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

const countdownInterval = setInterval(() => {
  if (countdownDuration <= 0) {
    clearInterval(countdownInterval);
    timerElement.textContent = '00:00:00';
  } else {
    timerElement.textContent = formatTime(countdownDuration);
    countdownDuration--;
  }
}, 1000);

timerElement.textContent = formatTime(countdownDuration);
