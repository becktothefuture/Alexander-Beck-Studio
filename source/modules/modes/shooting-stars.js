// ╔══════════════════════════════════════════════════════════════════════════════╗
// ║                           SHOOTING STARS MODE                                 ║
// ║         Sporadic meteors in one direction with trailing effect               ║
// ╚══════════════════════════════════════════════════════════════════════════════╝

import { getGlobals, clearBalls } from '../core/state.js';
import { pickRandomColor } from '../visual/colors.js';

// Module-level star array (not balls, just data)
let _shootingStars = [];
let _lastTime = 0;
let _nextSpawnTime = 0;

function createShootingStar(w, h, config) {
  const {
    minSpeed = 400,
    maxSpeed = 1200,
    minSize = 0.5,
    maxSize = 1.5,
    angle = -45, // Diagonal downward (degrees)
    trailLength = 5
  } = config;

  // Convert angle to radians
  const angleRad = (angle * Math.PI) / 180;
  const dirX = Math.cos(angleRad);
  const dirY = Math.sin(angleRad);

  // Spawn from top portion of screen, random X position
  const startX = Math.random() * w * 1.2 - w * 0.1; // Slightly off-screen left/right
  const startY = -h * 0.1; // Above viewport

  // Calculate how far it needs to travel to exit screen
  const maxDist = Math.sqrt(w * w + h * h) * 1.5;

  const speed = minSpeed + Math.random() * (maxSpeed - minSpeed);
  const size = minSize + Math.random() * (maxSize - minSize);

  return {
    x: startX,
    y: startY,
    vx: dirX * speed,
    vy: dirY * speed,
    size,
    color: pickRandomColor(),
    alpha: 0,
    age: 0,
    maxAge: maxDist / speed, // Lifetime based on distance/speed
    fadeInDuration: 0.1,
    fadeOutDuration: 0.5,
    trailLength: Math.round(trailLength),
    trail: [], // Array of {x, y, alpha} for trail points
    active: true
  };
}

export function initializeShootingStars() {
  const g = getGlobals();
  const canvas = g.canvas;
  if (!canvas) return;

  // Clear any existing balls (we don't use them)
  clearBalls();

  const w = canvas.width;
  const h = canvas.height;

  // Config for initial stars
  const minSpeed = Math.max(100, g.shootingStarsMinSpeed ?? 400);
  const maxSpeed = Math.max(minSpeed, g.shootingStarsMaxSpeed ?? 1200);
  const minSize = Math.max(0.2, Math.min(2.0, g.shootingStarsMinSize ?? 0.5));
  const maxSize = Math.max(minSize, Math.min(4.0, g.shootingStarsMaxSize ?? 1.5));
  const angle = g.shootingStarsAngle ?? -45;
  const trailLength = Math.max(0, Math.min(20, g.shootingStarsTrailLength ?? 5));

  const config = {
    minSpeed,
    maxSpeed,
    minSize,
    maxSize,
    angle,
    trailLength
  };

  // Spawn 2-3 initial stars at different positions to avoid empty screen
  _shootingStars = [];
  const initialCount = 3;
  for (let i = 0; i < initialCount; i++) {
    const star = createShootingStar(w, h, config);
    // Stagger them along their path (different ages)
    star.age = i * 0.3; // 0s, 0.3s, 0.6s into their journey
    star.x += star.vx * star.age;
    star.y += star.vy * star.age;
    _shootingStars.push(star);
  }

  _lastTime = performance.now();
  _nextSpawnTime = 2.0; // Next spawn in 2 seconds
}

// Custom renderer - draws shooting stars directly to canvas
export function renderShootingStars(ctx) {
  const g = getGlobals();
  const canvas = g.canvas;
  if (!canvas) return;

  const now = performance.now();
  const dt = Math.min(0.1, (now - _lastTime) / 1000);
  _lastTime = now;

  const w = canvas.width;
  const h = canvas.height;

  // Config
  const baseR = g.R_MED || 20;
  const minSpeed = Math.max(100, g.shootingStarsMinSpeed ?? 400);
  const maxSpeed = Math.max(minSpeed, g.shootingStarsMaxSpeed ?? 1200);
  const minSize = Math.max(0.2, Math.min(2.0, g.shootingStarsMinSize ?? 0.5));
  const maxSize = Math.max(minSize, Math.min(4.0, g.shootingStarsMaxSize ?? 1.5));
  const angle = g.shootingStarsAngle ?? -45; // Diagonal downward
  const trailLength = Math.max(0, Math.min(20, g.shootingStarsTrailLength ?? 5));
  const spawnInterval = Math.max(0.5, g.shootingStarsSpawnInterval ?? 3.0); // Seconds between spawns
  const burstSize = Math.max(1, Math.min(10, g.shootingStarsBurstSize ?? 1)); // Stars per burst

  const config = {
    minSpeed,
    maxSpeed,
    minSize,
    maxSize,
    angle,
    trailLength
  };

  // Sporadic spawning system
  _nextSpawnTime -= dt;
  if (_nextSpawnTime <= 0) {
    // Spawn a burst of stars
    for (let i = 0; i < burstSize; i++) {
      const star = createShootingStar(w, h, config);
      // Stagger burst slightly
      star.age = -i * 0.05; // Delay each star in burst by 50ms
      _shootingStars.push(star);
    }
    // Schedule next spawn with some randomness
    _nextSpawnTime = spawnInterval * (0.7 + Math.random() * 0.6);
  }

  // Update and draw each star
  for (let i = _shootingStars.length - 1; i >= 0; i--) {
    const star = _shootingStars[i];

    // Update age
    star.age += dt;

    // Skip if not yet active (burst stagger)
    if (star.age < 0) continue;

    // Update position
    star.x += star.vx * dt;
    star.y += star.vy * dt;

    // Add current position to trail
    if (star.age > 0) {
      star.trail.push({
        x: star.x,
        y: star.y,
        alpha: 1.0
      });

      // Limit trail length
      if (star.trail.length > star.trailLength) {
        star.trail.shift();
      }
    }

    // Calculate alpha based on age (fade in/out)
    if (star.age < star.fadeInDuration) {
      star.alpha = star.age / star.fadeInDuration;
    } else if (star.age > star.maxAge - star.fadeOutDuration) {
      star.alpha = (star.maxAge - star.age) / star.fadeOutDuration;
    } else {
      star.alpha = 1;
    }

    // Draw trail (older points fade more)
    for (let j = 0; j < star.trail.length; j++) {
      const point = star.trail[j];
      const trailProgress = j / star.trail.length;
      const trailAlpha = trailProgress * 0.6; // Trail fades toward tail
      const trailSize = trailProgress; // Trail gets smaller toward tail
      
      if (trailAlpha > 0.05) {
        const r = baseR * star.size * trailSize * 0.8;
        ctx.globalAlpha = star.alpha * trailAlpha;
        ctx.beginPath();
        ctx.arc(point.x, point.y, r, 0, Math.PI * 2);
        ctx.fillStyle = star.color;
        ctx.fill();
      }
    }

    // Draw main star (head)
    if (star.alpha > 0) {
      const r = baseR * star.size;
      ctx.globalAlpha = star.alpha;
      ctx.beginPath();
      ctx.arc(star.x, star.y, r, 0, Math.PI * 2);
      ctx.fillStyle = star.color;
      ctx.fill();
      ctx.globalAlpha = 1;
    }

    // Remove dead stars
    if (star.age > star.maxAge || star.y > h * 1.2 || star.x < -w * 0.2 || star.x > w * 1.2) {
      _shootingStars.splice(i, 1);
    }
  }

  // Reset global alpha
  ctx.globalAlpha = 1;
}

// No-op force applicator (we don't use balls)
export function applyShootingStarsForces(ball, dt) {}

// No-op updater
export function updateShootingStars(renderDt) {}
