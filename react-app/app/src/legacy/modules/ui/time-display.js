import { toggleDarkMode } from '../visual/dark-mode-v2.js';

let activeIntervalId = null;
let activeThemeToggleTarget = null;
let activeThemeToggleHandler = null;

function cleanupTimeDisplay() {
  if (activeIntervalId !== null) {
    clearInterval(activeIntervalId);
    activeIntervalId = null;
  }

  if (activeThemeToggleTarget && activeThemeToggleHandler) {
    activeThemeToggleTarget.removeEventListener('click', activeThemeToggleHandler);
  }

  activeThemeToggleTarget = null;
  activeThemeToggleHandler = null;
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
 * Clicking the time toggles between light/dark mode.
 */
export function initTimeDisplay() {
  const timeDisplay = document.getElementById('time-display');
  const siteYear = document.getElementById('site-year');
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

  // Click on time element toggles dark/light mode
  if (siteYear) {
    activeThemeToggleTarget = siteYear;
    activeThemeToggleHandler = () => {
      toggleDarkMode();
    };
    siteYear.addEventListener('click', activeThemeToggleHandler);
  }
}
