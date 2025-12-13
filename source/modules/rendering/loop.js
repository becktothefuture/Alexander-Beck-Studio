// ╔══════════════════════════════════════════════════════════════════════════════╗
// ║                              MAIN RENDER LOOP                                ║
// ║                Extracted from balls-source.html lines 2472-2592              ║
// ╚══════════════════════════════════════════════════════════════════════════════╝

import { updatePhysics, render, getBalls } from '../physics/engine.js';
import { trackFrame } from '../utils/performance.js';
import { updateAmbientSounds } from '../audio/sound-engine.js';
import { getGlobals } from '../core/state.js';

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
    
    // Update ambient sounds (rolling rumble + air whoosh)
    const balls = getBalls();
    const globals = getGlobals();
    const floorY = globals.canvas ? globals.canvas.height - (globals.simulationPadding || 0) : Infinity;
    updateAmbientSounds(balls, floorY);
    
    // FPS tracking
    trackFrame(performance.now());
    
    requestAnimationFrame(frame);
  }
  
  requestAnimationFrame(frame);
}

