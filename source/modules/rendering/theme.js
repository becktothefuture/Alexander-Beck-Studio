// ╔══════════════════════════════════════════════════════════════════════════════╗
// ║                                    THEME                                     ║
// ║                 Dark mode, CSS variables, and palettes (stub)                ║
// ╚══════════════════════════════════════════════════════════════════════════════╝

export function initializeTheme() {
  // Minimal stub: apply container class for light mode by default
  const container = document.getElementById('bravia-balls');
  if (!container) return;
  container.classList.remove('dark-mode');
}

export function setDarkMode(enabled) {
  const container = document.getElementById('bravia-balls');
  if (!container) return;
  container.classList.toggle('dark-mode', !!enabled);
}


