// ╔══════════════════════════════════════════════════════════════════════════════╗
// ║                           THEME TOGGLE BUTTON                                ║
// ║          Standalone button for quick light/dark mode switching               ║
// ╚══════════════════════════════════════════════════════════════════════════════╝

import { getCurrentTheme as getTheme, setTheme } from '../visual/dark-mode-v2.js';

export function createThemeToggle() {
  // Check if toggle already exists
  if (document.getElementById('theme-toggle-btn')) return;
  
  const btn = document.createElement('button');
  btn.id = 'theme-toggle-btn';
  btn.className = 'theme-toggle'; // Styles defined in main.css
  btn.setAttribute('aria-label', 'Toggle dark mode');
  btn.setAttribute('type', 'button');
  
  // Set initial state
  updateButtonState(btn);
  
  // Toggle on click
  btn.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    
    const current = getTheme();
    // Toggle between light and dark (skipping auto for simplicity in this button)
    const next = current === 'dark' ? 'light' : 'dark';
    
    setTheme(next);
    updateButtonState(btn);
    
    // Announce to screen readers
    const announcer = document.getElementById('announcer');
    if (announcer) {
      announcer.textContent = `Theme switched to ${next} mode`;
    }
  });
  
  // Add to body
  document.body.appendChild(btn);
}

function updateButtonState(btn) {
  const current = getTheme();
  // Use simple icon instead of text label
  btn.textContent = current === 'dark' ? '☀' : '☾';
  btn.title = current === 'dark' ? 'Switch to light mode' : 'Switch to dark mode';
}
