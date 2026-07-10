let activeIntervalId = null;

function cleanupTimeDisplay() {
  if (activeIntervalId !== null) {
    clearInterval(activeIntervalId);
    activeIntervalId = null;
  }
}

const formatTime = new Intl.DateTimeFormat('en-GB', {
  timeZone: 'Europe/London',
  hour: 'numeric',
  minute: '2-digit',
  second: '2-digit',
  hour12: true
});

/**
 * Updates the footer time display to show current London time.
 */
export function initTimeDisplay() {
  const timeDisplay = document.getElementById('time-display');
  cleanupTimeDisplay();
  if (!timeDisplay) return;

  function updateTime() {
    const now = new Date();
    timeDisplay.textContent = formatTime.format(now).toUpperCase();
  }

  // Update immediately
  updateTime();

  // Update every second to keep display current without extra work.
  activeIntervalId = setInterval(updateTime, 1000);
}
