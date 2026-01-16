// ╔══════════════════════════════════════════════════════════════════════════════╗
// ║                              SNAKE MODE                                      ║
// ║     Classic snake game behavior - head moves continuously, body follows path ║
// ╚══════════════════════════════════════════════════════════════════════════════╝

import { getGlobals, clearBalls, getMobileAdjustedCount } from '../core/state.js';
import { Ball } from '../physics/Ball.js';
import { pickRandomColorWithIndex } from '../visual/colors.js';
import { MODES } from '../core/constants.js';
import { randomRadiusForMode } from '../utils/ball-sizing.js';

// Store chain structure using WeakMaps
const chainNext = new WeakMap(); // Next ball in chain (null if last)
const chainPrev = new WeakMap(); // Previous ball in chain (null if first)
const chainIndex = new WeakMap(); // Index in chain (0 = head)
const chainRestLength = new WeakMap(); // Rest length of connection to next ball

// Path tracking for snake game behavior
let snakePath = []; // Array of {x, y, time} points for path following
const MAX_PATH_POINTS = 2000; // Maximum path points to store

/**
 * Initialize snake mode - creates a trail of connected balls
 */
export function initializeSnake() {
  const g = getGlobals();
  clearBalls();
  
  const canvas = g.canvas;
  if (!canvas) return;

  const w = canvas.width;
  const h = canvas.height;
  
  // Configuration
  const baseCount = g.snakeBallCount ?? 50;
  const count = getMobileAdjustedCount(baseCount);
  if (count <= 0) return;
  
  const DPR = g.DPR || 1;
  const avgRadius = (g.R_MIN + g.R_MAX) * 0.5;
  const baseRestLength = (g.snakeRestLength ?? 25) * DPR;
  // Rest length = ball diameter (touching) + small gap
  const effectiveRestLength = avgRadius * 2.0 + (baseRestLength - avgRadius * 2.0) * 0.3;
  
  // Calculate snake total length to ensure it fits within scene
  const snakeTotalLength = count * effectiveRestLength;
  
  // Position snake around the center of the viewport
  const margin = effectiveRestLength * 2;
  const centerX = w * 0.5;
  const centerY = h * 0.5;
  
  // Starting position is exactly at the center of the viewport
  const startX = centerX;
  const startY = centerY;
  
  // Create a natural "sleeping" snake layout - curled/coiled position around center
  // Snake should look like it's lying down asleep, coiled around the center
  const coilRadius = effectiveRestLength * count * 0.12; // Radius of the coil (slightly smaller for tighter coil)
  const coilTurns = 1.8 + Math.random() * 0.7; // 1.8 to 2.5 turns for natural curl
  const coilAngleOffset = Math.random() * Math.PI * 2; // Random starting angle for coil
  
  // Initialize path with coiled positions
  snakePath = [];
  const now = performance.now();
  
  // Create trail of balls - snake positioned in a natural curled/coiled sleeping position
  const balls = [];
  
  for (let i = 0; i < count; i++) {
    // Calculate position in a coiled/curled pattern (like a sleeping snake)
    const progress = i / Math.max(1, count - 1); // 0 to 1
    
    // Create a spiral coil pattern - tighter at center, looser at edges
    const angle = coilAngleOffset + progress * Math.PI * 2 * coilTurns;
    const radius = coilRadius * (0.3 + progress * 0.7); // Start smaller, grow outward
    
    // Add some natural variation to make it look more organic
    const variation = Math.sin(progress * Math.PI * 4) * effectiveRestLength * 0.3;
    
    // Position in a curled/coiled pattern centered at start position
    const x = startX + Math.cos(angle) * (radius + variation);
    const y = startY + Math.sin(angle) * (radius + variation);
    
    // Clamp to ensure snake stays within scene bounds
    const clampedX = Math.max(margin, Math.min(w - margin, x));
    const clampedY = Math.max(margin, Math.min(h - margin, y));
    
    // Add to path (all at same time since snake is "asleep" - not moving)
    snakePath.push({ x: clampedX, y: clampedY, time: now });
    
    const r = randomRadiusForMode(g, MODES.SNAKE);
    const { color, distributionIndex } = pickRandomColorWithIndex();
    const ball = new Ball(clampedX, clampedY, r, color);
    ball.distributionIndex = distributionIndex;
    ball.isSnake = true;
    
    // Initialize velocity to zero - snake is "asleep" and stationary
    ball.vx = 0;
    ball.vy = 0;
    ball.omega = 0;
    
    // Mark as sleeping initially to prevent any movement
    if (i === 0) {
      ball._snakeAsleep = true;
    }
    
    // Store chain relationships
    chainIndex.set(ball, i);
    
    if (i > 0) {
      const prev = balls[i - 1];
      chainPrev.set(ball, prev);
      chainNext.set(prev, ball);
      chainRestLength.set(prev, effectiveRestLength);
    } else {
      chainPrev.set(ball, null);
    }
    
    if (i === count - 1) {
      chainNext.set(ball, null);
    }
    
    balls.push(ball);
    g.balls.push(ball);
  }
  
  // Store reference to head for path tracking
  g._snakeHead = balls[0];
}

/**
 * Get point on path at a given distance from the end
 */
function getPathPointAtDistance(targetDistance) {
  if (snakePath.length < 2) {
    return snakePath.length > 0 ? snakePath[0] : null;
  }
  
  let accumulatedDistance = 0;
  
  // Walk backwards from the end of the path
  for (let i = snakePath.length - 1; i > 0; i--) {
    const p1 = snakePath[i];
    const p2 = snakePath[i - 1];
    const dx = p2.x - p1.x;
    const dy = p2.y - p1.y;
    const segmentLength = Math.sqrt(dx * dx + dy * dy);
    
    if (accumulatedDistance + segmentLength >= targetDistance) {
      // Interpolate along this segment
      const t = (targetDistance - accumulatedDistance) / segmentLength;
      return {
        x: p1.x + dx * t,
        y: p1.y + dy * t,
        time: p1.time + (p2.time - p1.time) * t
      };
    }
    
    accumulatedDistance += segmentLength;
  }
  
  // If we haven't found it, return the oldest point
  return snakePath[0];
}

/**
 * Apply snake forces - classic snake game behavior
 */
export function applySnakeForces(ball, dt) {
  const g = getGlobals();
  if (g.currentMode !== MODES.SNAKE) return;
  if (!ball.isSnake) return;
  
  const DPR = g.DPR || 1;
  const springStrength = (g.snakeSpringStrength ?? 50) * DPR; // Much lower default to prevent wiggling
  const damping = g.snakeDamping ?? 0.97;
  const groundFriction = g.snakeGroundFriction ?? 1.0;
  const snakeSpeed = (g.snakeSpeed ?? 400) * DPR; // Constant speed for snake head
  
  const index = chainIndex.get(ball);
  const prev = chainPrev.get(ball);
  
  // ═══════════════════════════════════════════════════════════════════════════
  // SNAKE HEAD: Moves continuously in direction toward mouse (classic snake)
  // ═══════════════════════════════════════════════════════════════════════════
  if (index === 0) {
    // Check if snake is "asleep" (initial state) - wake up when mouse moves
    const now = performance.now();
    const mouseIdleThreshold = 150; // ms - if mouse hasn't moved in this time, it's idle
    const isMouseIdle = (now - (g.lastPointerMoveMs || 0)) > mouseIdleThreshold;
    
    // Wake up snake when mouse moves (if it was asleep)
    if (ball._snakeAsleep && g.mouseInCanvas && !isMouseIdle) {
      ball._snakeAsleep = false;
    }
    
    // If snake is asleep, don't move at all
    if (ball._snakeAsleep) {
      ball.vx = 0;
      ball.vy = 0;
      return; // Skip all movement logic
    }
    
    // Record current position in path (only if moving)
    const currentPathPoint = { x: ball.x, y: ball.y, time: now };
    
    // Add to path (only if moved enough to avoid duplicate points)
    if (snakePath.length === 0 || 
        Math.hypot(ball.x - snakePath[snakePath.length - 1].x, 
                   ball.y - snakePath[snakePath.length - 1].y) > 0.5) {
      snakePath.push(currentPathPoint);
      
      // Limit path length to prevent memory issues
      if (snakePath.length > MAX_PATH_POINTS) {
        snakePath.shift(); // Remove oldest points
      }
    }
    
    // Snake only moves when mouse is active (not idle) and in canvas
    if (g.mouseInCanvas && !isMouseIdle) {
      // Calculate direction toward mouse
      const dx = g.mouseX - ball.x;
      const dy = g.mouseY - ball.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      
      if (dist > 0.1) {
        // Normalize direction
        const nx = dx / dist;
        const ny = dy / dist;
        
        // Set constant velocity in direction toward mouse (classic snake movement)
        ball.vx = nx * snakeSpeed;
        ball.vy = ny * snakeSpeed;
      } else {
        // If very close to mouse, maintain current direction
        const currentSpeed = Math.sqrt(ball.vx * ball.vx + ball.vy * ball.vy);
        if (currentSpeed < 10) {
          // If stopped, maintain zero velocity (don't start moving randomly)
          ball.vx = 0;
          ball.vy = 0;
        }
      }
    } else {
      // When mouse is idle or leaves canvas, stop moving
      ball.vx = 0;
      ball.vy = 0;
    }
  }
  
  // ═══════════════════════════════════════════════════════════════════════════
  // SNAKE BODY: Follow path that head took (classic snake game behavior)
  // ═══════════════════════════════════════════════════════════════════════════
  if (prev && index > 0) {
    // Calculate distance along path this segment should be from previous
    const avgRadius = (g.R_MIN + g.R_MAX) * 0.5;
    const baseRestLength = (g.snakeRestLength ?? 25) * DPR;
    const restLength = chainRestLength.get(prev) ?? (avgRadius * 2.0 + (baseRestLength - avgRadius * 2.0) * 0.3);
    
    // Target distance along path = index * restLength (each segment follows path)
    const targetDistance = index * restLength;
    
    // Get target position on path
    const targetPoint = getPathPointAtDistance(targetDistance);
    
    if (targetPoint) {
      // Move toward target point on path
      const dx = targetPoint.x - ball.x;
      const dy = targetPoint.y - ball.y;
      const dist = Math.max(0.1, Math.sqrt(dx * dx + dy * dy));
      
      // Gentle spring to follow path (reduced multiplier to prevent wiggling)
      const springForce = springStrength * dist * dt * 0.5; // Reduced from 3.0 to 0.5
      const nx = dx / dist;
      const ny = dy / dist;
      
      ball.vx += nx * springForce;
      ball.vy += ny * springForce;
      
      // Cap velocity for smooth following
      const speed = Math.sqrt(ball.vx * ball.vx + ball.vy * ball.vy);
      const maxSpeed = snakeSpeed * 1.5; // Body can move slightly faster to catch up
      if (speed > maxSpeed) {
        ball.vx = (ball.vx / speed) * maxSpeed;
        ball.vy = (ball.vy / speed) * maxSpeed;
      }
    }
  }
  
  // ═══════════════════════════════════════════════════════════════════════════
  // DAMPING & GROUND FRICTION - High friction ground simulation
  // ═══════════════════════════════════════════════════════════════════════════
  // Apply high damping for high-friction ground
  ball.vx *= damping;
  ball.vy *= damping;
  
  // Additional ground friction (simulates high-friction surface)
  const speed = Math.sqrt(ball.vx * ball.vx + ball.vy * ball.vy);
  if (speed > 0) {
    // Apply additional friction force proportional to velocity
    const frictionForce = groundFriction * speed * dt;
    const frictionX = -(ball.vx / speed) * frictionForce;
    const frictionY = -(ball.vy / speed) * frictionForce;
    ball.vx += frictionX;
    ball.vy += frictionY;
  }
  
  // Angular damping (reduce spinning)
  if (ball.omega) {
    ball.omega *= damping * 0.95;
  }
}

/**
 * Update snake mode - clean up old path points
 */
export function updateSnake(dt) {
  const g = getGlobals();
  if (g.currentMode !== MODES.SNAKE) return;
  
  // Clean up path points older than 10 seconds (prevent memory buildup)
  const now = performance.now();
  const maxAge = 10000; // 10 seconds
  
  while (snakePath.length > 0 && (now - snakePath[0].time) > maxAge) {
    snakePath.shift();
  }
}
