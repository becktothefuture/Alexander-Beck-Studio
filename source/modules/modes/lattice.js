// ╔══════════════════════════════════════════════════════════════════════════════╗
// ║                              LATTICE MODE                                    ║
// ║                   Crystallization into a hex grid                             ║
// ╚══════════════════════════════════════════════════════════════════════════════╝

import { spawnBall } from '../physics/spawn.js';
import { getGlobals, clearBalls } from '../core/state.js';
import { getColorByIndex } from '../visual/colors.js';

function toPxFromVwLike(canvas, vw) {
  const basis = Math.max(1, Math.min(canvas.width, canvas.height));
  return (vw * 0.01) * basis;
}

export function initializeLattice() {
  const g = getGlobals();
  clearBalls();

  const canvas = g.canvas;
  const w = canvas.width;
  const h = canvas.height;
  
  // Compute hex grid layout
  const spacing = Math.max(8, toPxFromVwLike(canvas, g.latticeSpacingVw ?? 8.5));
  const rowHeight = spacing * 0.8660254037844386; // sin(60°)
  
  // Calculate grid dimensions needed to FILL viewport completely
  // Add extra rows/cols to ensure complete edge coverage
  const cols = Math.ceil(w / spacing) + 2;
  const rows = Math.ceil(h / rowHeight) + 2;
  
  // Alignment control: 'center' (default), 'top-left', 'top-center', 'top-right', etc.
  const alignment = g.latticeAlignment ?? 'center';
  
  // Calculate ACTUAL grid size (not including extra cells)
  const gridWidth = (cols - 1) * spacing;
  const gridHeight = (rows - 1) * rowHeight;
  
  // Calculate starting position based on alignment
  let startX, startY;
  
  if (alignment === 'center') {
    // Center the grid so it fills viewport symmetrically
    startX = (w - gridWidth) * 0.5;
    startY = (h - gridHeight) * 0.5;
  } else if (alignment === 'top-left') {
    // Align to top-left with slight negative offset for edge coverage
    startX = -spacing * 0.5;
    startY = -rowHeight * 0.5;
  } else if (alignment === 'top-center') {
    // Center horizontally, align to top
    startX = (w - gridWidth) * 0.5;
    startY = -rowHeight * 0.5;
  } else if (alignment === 'top-right') {
    // Align to top-right with edge coverage
    startX = w - gridWidth + spacing * 0.5;
    startY = -rowHeight * 0.5;
  } else {
    // Default to center
    startX = (w - gridWidth) * 0.5;
    startY = (h - gridHeight) * 0.5;
  }
  
  // Create ALL balls to fill viewport (no ball count limit)
  // Use first 8 palette colors, then cycle through them
  const edgeMargin = spacing * 0.25;
  let ballIndex = 0;
  
  for (let row = 0; row < rows; row++) {
    const isOddRow = (row & 1) !== 0;
    const xOffset = isOddRow ? spacing * 0.5 : 0;
    const y = startY + row * rowHeight;
    
    for (let col = 0; col < cols; col++) {
      const x = startX + col * spacing + xOffset;
      
      // Only create balls within viewport bounds (with small edge tolerance for complete coverage)
      if (x >= -edgeMargin && x <= w + edgeMargin && y >= -edgeMargin && y <= h + edgeMargin) {
        // Cycle through color palette (8 colors)
        const colorIndex = ballIndex % 8;
        const ball = spawnBall(x, y, getColorByIndex(colorIndex));
        
        // Store HOME position - this is where the ball always wants to return
        ball.latticeHomeX = x;
        ball.latticeHomeY = y;
        ball.latticeRow = row;
        ball.latticeCol = col;
        
        ball.vx = 0;
        ball.vy = 0;
        ball.driftAx = 0;
        ball.driftTime = 0;
        
        ballIndex++;
      }
    }
  }
}

export function applyLatticeForces(ball, dt) {
  const g = getGlobals();
  const canvas = g.canvas;
  if (!canvas) return;

  // ══════════════════════════════════════════════════════════════════════════════
  // PHASE 1: CURSOR REPELLER — Disrupts the crystalline structure
  // ══════════════════════════════════════════════════════════════════════════════
  const mouseX = g.mouseX;
  const mouseY = g.mouseY;
  const repellerEnabled = g.repellerEnabled !== false; // default true
  
  if (repellerEnabled && mouseX !== -1e9 && g.mouseInCanvas) {
    // Lattice disruption: DRAMATIC mesh-stretching effect
    // Large radius + high power + shallow falloff = visible elastic deformation
    const disruptRadius = (g.latticeDisruptRadius ?? 600) * g.DPR;
    const disruptPower = g.latticeDisruptPower ?? 25.0;
    
    const dx = ball.x - mouseX;
    const dy = ball.y - mouseY;
    const d2 = dx * dx + dy * dy;
    const r2 = disruptRadius * disruptRadius;
    
    if (d2 < r2) {
      const d = Math.max(Math.sqrt(d2), 1e-4);
      const nx = dx / d;
      const ny = dy / d;
      const q = Math.max(0, 1 - d / disruptRadius);
      
      // Shallow falloff (power 1.8) = more balls affected at once = visible mesh stretch
      // High base multiplier (80.0) = dramatic displacement
      const strength = disruptPower * 80.0 * Math.pow(q, 1.8);
      const massScale = Math.max(0.25, ball.m / g.MASS_BASELINE_KG);
      
      ball.vx += (nx * strength * dt) / massScale;
      ball.vy += (ny * strength * dt) / massScale;
    }
  }

  // ══════════════════════════════════════════════════════════════════════════════
  // PHASE 2: HOME POSITION SPRING FORCES — Pull towards original mesh position
  // ══════════════════════════════════════════════════════════════════════════════
  // Each ball remembers its home position and always returns there
  if (ball.latticeHomeX === undefined || ball.latticeHomeY === undefined) {
    // Fallback: if home position not set, use current position
    ball.latticeHomeX = ball.x;
    ball.latticeHomeY = ball.y;
  }
  
  // ══════════════════════════════════════════════════════════════════════════════
  // PHASE 2.5: LIVING MESH ANIMATION — Subtle breathing/wave motion
  // ══════════════════════════════════════════════════════════════════════════════
  const time = performance.now() * 0.001; // seconds
  const meshWaveStrength = g.latticeMeshWaveStrength ?? 12.0; // px amplitude
  const meshWaveSpeed = g.latticeMeshWaveSpeed ?? 0.8; // Hz
  
  // Multi-directional wave for organic movement
  const waveX = Math.sin(time * meshWaveSpeed + ball.latticeHomeX * 0.004) * meshWaveStrength;
  const waveY = Math.cos(time * meshWaveSpeed * 0.7 + ball.latticeHomeY * 0.004) * meshWaveStrength;
  
  // Breathing effect (entire mesh expands/contracts slightly)
  const breathe = Math.sin(time * meshWaveSpeed * 0.5) * 0.015; // 1.5% scale
  const cx = canvas.width * 0.5;
  const cy = canvas.height * 0.5;
  const breatheX = (ball.latticeHomeX - cx) * breathe;
  const breatheY = (ball.latticeHomeY - cy) * breathe;
  
  // Target position = home + wave animation + breathing
  const targetX = ball.latticeHomeX + waveX + breatheX;
  const targetY = ball.latticeHomeY + waveY + breatheY;

  const dx = targetX - ball.x;
  const dy = targetY - ball.y;

  const stiffness = Math.max(0, g.latticeStiffness ?? 2.2);
  const massScale = Math.max(0.25, ball.m / g.MASS_BASELINE_KG);
  ball.vx += (dx * stiffness * dt) / massScale;
  ball.vy += (dy * stiffness * dt) / massScale;

  // ══════════════════════════════════════════════════════════════════════════════
  // PHASE 3: DAMPING — Settle into crystal structure
  // ══════════════════════════════════════════════════════════════════════════════
  const damp60 = Math.max(0.0, Math.min(1.0, g.latticeDamping ?? 0.92));
  const damp = Math.pow(damp60, dt * 60);
  ball.vx *= damp;
  ball.vy *= damp;
}

