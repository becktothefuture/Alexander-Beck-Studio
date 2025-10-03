// ╔══════════════════════════════════════════════════════════════════════════════╗
// ║                           PERFORMANCE / FPS                                  ║
// ╚══════════════════════════════════════════════════════════════════════════════╝

let lastFpsUpdate = 0;
let frames = 0;
let currentFPS = 0;

export function trackFrame(now) {
  frames++;
  if (now - lastFpsUpdate > 1000) {
    currentFPS = frames;
    frames = 0;
    lastFpsUpdate = now;
    const el = document.getElementById('render-fps');
    if (el) el.textContent = String(currentFPS);
  }
}



