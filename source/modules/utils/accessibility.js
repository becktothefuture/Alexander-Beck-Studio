// ╔══════════════════════════════════════════════════════════════════════════════╗
// ║                            ACCESSIBILITY HELPERS                             ║
// ╚══════════════════════════════════════════════════════════════════════════════╝

export function announceToScreenReader(message) {
  const announcer = document.getElementById('announcer');
  if (!announcer) return;
  announcer.textContent = '';
  setTimeout(() => { announcer.textContent = message; }, 10);
}



