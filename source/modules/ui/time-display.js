/**
 * Updates the footer time display to show current London time.
 */
export function initTimeDisplay() {
  const timeDisplay = document.getElementById('time-display');
  if (!timeDisplay) return;

  function updateTime() {
    const now = new Date();
    // Get London time
    const timeString = now.toLocaleTimeString('en-GB', {
      timeZone: 'Europe/London',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    }).toUpperCase(); // AM/PM usually upper case

    // Remove any leading zero if present (en-GB/US might add it depending on browser, 
    // but hour: 'numeric' usually suppresses it).
    // Also, usually AM/PM is with space.
    
    timeDisplay.textContent = timeString;
  }

  // Update immediately
  updateTime();

  // Update every second to ensure accuracy (lightweight)
  setInterval(updateTime, 1000);
}

