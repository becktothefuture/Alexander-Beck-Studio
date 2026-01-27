// ╔══════════════════════════════════════════════════════════════════════════════╗
// ║                           SHOOTING STARS MODE                                 ║
// ║         Magical arcing trajectories - no collisions, just beauty              ║
// ╚══════════════════════════════════════════════════════════════════════════════╝

import { getGlobals, clearBalls } from '../core/state.js';
import { pickRandomColor } from '../visual/colors.js';

// Module-level star array (not balls, just data)
let _shootingStars = [];
let _lastTime = 0;

// Smoothed mouse state for gentle interaction
let _smoothMouseX = 0;
let _smoothMouseY = 0;
let _mouseInitialized = false;

function easeInOutQuad(t) {
  return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
}

function createShootingStar(w, h, config) {
  const {
    minSpeed = 200,
    maxSpeed = 800,
    minSize = 0.4,
    maxSize = 2.0,
    arcHeight = 0.3,
    duration = 2.0
  } = config;

  // Random spawn position (from edges)
  const spawnEdge = Math.floor(Math.random() * 4); // 0=top, 1=right, 2=bottom, 3=left
  let startX, startY, endX, endY;

  const margin = 0.2; // 20% margin from edges
  
  switch (spawnEdge) {
    case 0: // Top edge → diagonal down
      startX = Math.random() * w;
      startY = -h * 0.1;
      endX = Math.random() * w;
      endY = h * (1 + 0.1);
      break;
    case 1: // Right edge → diagonal left
      startX = w * (1 + 0.1);
      startY = Math.random() * h;
      endX = -w * 0.1;
      endY = Math.random() * h;
      break;
    case 2: // Bottom edge → diagonal up
      startX = Math.random() * w;
      startY = h * (1 + 0.1);
      endX = Math.random() * w;
      endY = -h * 0.1;
      break;
    case 3: // Left edge → diagonal right
      startX = -w * 0.1;
      startY = Math.random() * h;
      endX = w * (1 + 0.1);
      endY = Math.random() * h;
      break;
  }

  // Calculate arc control point (creates the "shooting" curve)
  const midX = (startX + endX) / 2;
  const midY = (startY + endY) / 2;
  const dx = endX - startX;
  const dy = endY - startY;
  const dist = Math.sqrt(dx * dx + dy * dy);
  const perpX = -dy / dist;
  const perpY = dx / dist;
  const arcOffset = dist * arcHeight * (Math.random() - 0.5) * 2;
  const controlX = midX + perpX * arcOffset;
  const controlY = midY + perpY * arcOffset;

  return {
    startX,
    startY,
    endX,
    endY,
    controlX,
    controlY,
    currentX: startX,
    currentY: startY,
    progress: 0, // 0 to 1
    duration: duration + Math.random() * duration * 0.5, // Vary duration
    speed: minSpeed + Math.random() * (maxSpeed - minSpeed),
    size: minSize + Math.random() * (maxSize - minSize),
    color: pickRandomColor(),
    alpha: 0,
    fadeInDuration: 0.15, // Quick fade in
    fadeOutDuration: 0.3, // Longer fade out
    active: true
  };
}

// Quadratic bezier curve interpolation
function quadraticBezier(t, p0, p1, p2) {
  const oneMinusT = 1 - t;
  return oneMinusT * oneMinusT * p0 + 
         2 * oneMinusT * t * p1 + 
         t * t * p2;
}

export function initializeShootingStars() {
  const g = getGlobals();
  const canvas = g.canvas;
  if (!canvas) return;

  // Clear any existing balls (we don't use them)
  clearBalls();

  const w = canvas.width;
  const h = canvas.height;
  
  // Config
  const count = Math.max(5, Math.min(50, Math.round(g.shootingStarsCount ?? 20)));
  const minSpeed = Math.max(50, g.shootingStarsMinSpeed ?? 200);
  const maxSpeed = Math.max(minSpeed, g.shootingStarsMaxSpeed ?? 800);
  const minSize = Math.max(0.2, Math.min(1.0, g.shootingStarsMinSize ?? 0.4));
  const maxSize = Math.max(minSize, Math.min(4.0, g.shootingStarsMaxSize ?? 2.0));
  const arcHeight = Math.max(0.0, Math.min(1.0, g.shootingStarsArcHeight ?? 0.3));
  const duration = Math.max(0.5, g.shootingStarsDuration ?? 2.0);

  const config = {
    minSpeed,
    maxSpeed,
    minSize,
    maxSize,
    arcHeight,
    duration
  };

  // Create initial stars with staggered starts
  _shootingStars = [];
  for (let i = 0; i < count; i++) {
    const star = createShootingStar(w, h, config);
    // Stagger initial progress to avoid all starting at once
    star.progress = Math.random() * 0.5;
    _shootingStars.push(star);
  }

  _lastTime = performance.now();
  
  // Reset mouse state
  _smoothMouseX = 0;
  _smoothMouseY = 0;
  _mouseInitialized = false;
}

// Custom renderer - draws shooting stars directly to canvas
export function renderShootingStars(ctx) {
  const g = getGlobals();
  const canvas = g.canvas;
  if (!canvas || _shootingStars.length === 0) return;

  const now = performance.now();
  const dt = Math.min(0.1, (now - _lastTime) / 1000);
  _lastTime = now;

  const w = canvas.width;
  const h = canvas.height;
  const cx = w * 0.5;
  const cy = h * 0.5;

  // Config
  const baseR = g.R_MED || 20;
  const spawnRate = Math.max(0.1, g.shootingStarsSpawnRate ?? 1.0);
  const mouseInfluence = Math.max(0, g.shootingStarsMouseInfluence ?? 50);
  const respectMotion = g.reducedMotion || false;

  // Config for star creation
  const minSpeed = Math.max(50, g.shootingStarsMinSpeed ?? 200);
  const maxSpeed = Math.max(minSpeed, g.shootingStarsMaxSpeed ?? 800);
  const minSize = Math.max(0.2, Math.min(1.0, g.shootingStarsMinSize ?? 0.4));
  const maxSize = Math.max(minSize, Math.min(4.0, g.shootingStarsMaxSize ?? 2.0));
  const arcHeight = Math.max(0.0, Math.min(1.0, g.shootingStarsArcHeight ?? 0.3));
  const duration = Math.max(0.5, g.shootingStarsDuration ?? 2.0);

  const config = {
    minSpeed,
    maxSpeed,
    minSize,
    maxSize,
    arcHeight,
    duration
  };

  // Smooth mouse interpolation
  const mouseEasing = 6;
  let targetX = 0, targetY = 0;
  if (g.mouseInCanvas && !respectMotion) {
    targetX = g.mouseX;
    targetY = g.mouseY;
  } else {
    targetX = cx;
    targetY = cy;
  }

  const easeFactor = 1 - Math.exp(-mouseEasing * dt);
  if (!_mouseInitialized) {
    _smoothMouseX = targetX;
    _smoothMouseY = targetY;
    _mouseInitialized = true;
  } else {
    _smoothMouseX += (targetX - _smoothMouseX) * easeFactor;
    _smoothMouseY += (targetY - _smoothMouseY) * easeFactor;
  }

  // Update and draw each star
  for (let i = _shootingStars.length - 1; i >= 0; i--) {
    const star = _shootingStars[i];

    if (!star.active) continue;

    // Update progress along curve
    const progressSpeed = dt / star.duration;
    star.progress += progressSpeed * spawnRate;

    // Calculate position along quadratic bezier curve
    const t = Math.min(1, star.progress);
    const baseX = quadraticBezier(t, star.startX, star.controlX, star.endX);
    const baseY = quadraticBezier(t, star.startY, star.controlY, star.endY);

    // Gentle mouse attraction (subtle influence)
    const dx = _smoothMouseX - baseX;
    const dy = _smoothMouseY - baseY;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const influence = mouseInfluence / Math.max(1, dist);
    
    star.currentX = baseX + dx * influence * dt;
    star.currentY = baseY + dy * influence * dt;

    // Calculate alpha based on progress (fade in/out)
    if (star.progress < star.fadeInDuration) {
      star.alpha = star.progress / star.fadeInDuration;
    } else if (star.progress > 1 - star.fadeOutDuration) {
      star.alpha = (1 - star.progress) / star.fadeOutDuration;
    } else {
      star.alpha = 1;
    }

    // Draw star
    if (star.alpha > 0) {
      const r = baseR * star.size;
      ctx.globalAlpha = star.alpha;
      ctx.beginPath();
      ctx.arc(star.currentX, star.currentY, r, 0, Math.PI * 2);
      ctx.fillStyle = star.color;
      ctx.fill();
      ctx.globalAlpha = 1;
    }

    // Recycle star when journey complete
    if (star.progress >= 1) {
      const newStar = createShootingStar(w, h, config);
      _shootingStars[i] = newStar;
    }
  }
}

// No-op force applicator (we don't use balls)
export function applyShootingStarsForces(ball, dt) {}

// No-op updater
export function updateShootingStars(renderDt) {}
