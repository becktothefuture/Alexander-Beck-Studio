// ╔══════════════════════════════════════════════════════════════════════════════╗
// ║                              MAIN RENDER LOOP                                ║
// ║                Extracted from balls-source.html lines 2472-2592              ║
// ╚══════════════════════════════════════════════════════════════════════════════╝

import { updatePhysics, render } from '../physics/engine.js';
import { trackFrame } from '../utils/performance.js';

let last = performance.now() / 1000;

export function startMainLoop(applyForcesFunc) {
  function frame(nowMs) {
    const now = nowMs / 1000;
    let dt = Math.min(0.033, now - last);
    last = now;
    
    // Physics update
    updatePhysics(dt, applyForcesFunc);
    
    // Render
    render();
    
    // FPS tracking
    trackFrame(performance.now());
    
    requestAnimationFrame(frame);
  }
  
  requestAnimationFrame(frame);
}

