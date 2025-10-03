// ╔══════════════════════════════════════════════════════════════════════════════╗
// ║                                KEYBOARD INPUT                                ║
// ║                   Minimal shortcuts for modular demo                         ║
// ╚══════════════════════════════════════════════════════════════════════════════╝

export function setupKeyboardShortcuts() {
  const panel = document.getElementById('controlPanel');
  window.addEventListener('keydown', (e) => {
    const k = e.key.toLowerCase();
    if ((k === '/' || e.code === 'Slash') && panel) {
      e.preventDefault();
      panel.classList.toggle('hidden');
      panel.style.display = panel.classList.contains('hidden') ? 'none' : '';
    }
  });
}


