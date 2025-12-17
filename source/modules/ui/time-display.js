/**
 * Updates the footer time display to show current London time.
 */
export function initTimeDisplay() {
  const timeDisplay = document.getElementById('time-display');
  if (!timeDisplay) return;

  // Prebuild formatter so we avoid reallocating inside the interval.
  const formatTime = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Europe/London',
    hour: 'numeric',
    minute: '2-digit',
    second: '2-digit',
    hour12: true
  });

  function updateTime() {
    const now = new Date();
    timeDisplay.textContent = formatTime.format(now).toUpperCase();
  }

  // Update immediately
  updateTime();

  // Update every second to keep display current without extra work.
  setInterval(updateTime, 1000);
}

