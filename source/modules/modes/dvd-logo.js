// ╔══════════════════════════════════════════════════════════════════════════════╗
// ║                            DVD LOGO MODE                                       ║
// ║     Classic DVD screensaver: "DVD" spelled in balls, bouncing linearly        ║
// ║              with color changes on wall bounce                                 ║
// ╚══════════════════════════════════════════════════════════════════════════════╝

import { getGlobals, clearBalls } from '../core/state.js';
import { Ball } from '../physics/Ball.js';
import { pickRandomColor } from '../visual/colors.js';
import { MODES } from '../core/constants.js';
import { randomRadiusForMode } from '../utils/ball-sizing.js';

// Logo state: center position and velocity
let logoCenterX = 0;
let logoCenterY = 0;
let logoVelX = 0;
let logoVelY = 0;
let currentColorIndex = 0;

// ═══════════════════════════════════════════════════════════════════════════════
// LETTER SHAPE DEFINITIONS (RELATIVE POSITIONS)
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Define letter "D" shape using relative positions (normalized coordinates)
 * Returns array of {x, y} positions relative to letter center
 */
function getLetterDShape() {
  const points = [];
  
  // Left vertical line (5 points)
  for (let i = 0; i < 5; i++) {
    points.push({ x: -1, y: -2 + i });
  }
  
  // Top horizontal (2 points)
  points.push({ x: 0, y: -2 });
  points.push({ x: 1, y: -2 });
  
  // Right curve (3 points)
  points.push({ x: 1.5, y: -1 });
  points.push({ x: 1.5, y: 0 });
  points.push({ x: 1.5, y: 1 });
  
  // Bottom horizontal (2 points)
  points.push({ x: 1, y: 2 });
  points.push({ x: 0, y: 2 });
  
  return points;
}

/**
 * Define letter "V" shape using relative positions
 */
function getLetterVShape() {
  const points = [];
  
  // Left diagonal (3 points)
  points.push({ x: -1.5, y: -2 });
  points.push({ x: -1, y: -0.5 });
  points.push({ x: -0.5, y: 1 });
  
  // Bottom point (2 points for emphasis)
  points.push({ x: 0, y: 2 });
  points.push({ x: 0, y: 2.2 });
  
  // Right diagonal (3 points)
  points.push({ x: 0.5, y: 1 });
  points.push({ x: 1, y: -0.5 });
  points.push({ x: 1.5, y: -2 });
  
  return points;
}

/**
 * Calculate ball positions for the full "DVD" logo
 * @param {number} targetBallCount - Total balls to distribute across letters
 * @param {number} ballRadius - Radius of each ball
 * @param {number} ballSpacingMul - Spacing multiplier between balls
 * @param {number} letterSpacingMul - Spacing multiplier between letters
 * @returns Array of {x, y} absolute positions
 */
function calculateDvdPositions(targetBallCount, ballRadius, ballSpacingMul, letterSpacingMul) {
  const positions = [];
  
  // Get letter shapes (normalized coordinates)
  const letterD = getLetterDShape();
  const letterV = getLetterVShape();
  
  // Calculate spacing based on ball radius (no overlap)
  const spacing = ballRadius * 2 * ballSpacingMul; // Each ball gets diameter * multiplier
  const letterSpacing = spacing * 3 * letterSpacingMul; // Space between letters
  
  // Calculate how many balls per letter (distribute evenly)
  const ballsPerLetter = Math.floor(targetBallCount / 3);
  const remainder = targetBallCount % 3;
  
  // Create ball positions for each letter
  const letters = [
    { shape: letterD, offset: -letterSpacing, count: ballsPerLetter + (remainder > 0 ? 1 : 0) },
    { shape: letterV, offset: 0, count: ballsPerLetter + (remainder > 1 ? 1 : 0) },
    { shape: letterD, offset: letterSpacing, count: ballsPerLetter }
  ];
  
  letters.forEach(letter => {
    const shapePoints = letter.shape;
    const pointCount = shapePoints.length;
    
    // Distribute balls evenly across letter shape points (no jitter to prevent overlap)
    for (let i = 0; i < letter.count; i++) {
      const pointIndex = Math.floor((i / letter.count) * pointCount);
      const point = shapePoints[pointIndex % pointCount];
      
      positions.push({
        x: point.x * spacing + letter.offset,
        y: point.y * spacing
      });
    }
  });
  
  return positions;
}

// ═══════════════════════════════════════════════════════════════════════════════
// MODE INITIALIZATION
// ═══════════════════════════════════════════════════════════════════════════════

export function initializeDvdLogo() {
  const g = getGlobals();
  clearBalls();
  
  const canvas = g.canvas;
  if (!canvas) return;
  
  const w = canvas.width;
  const h = canvas.height;
  const DPR = g.DPR || 1;
  
  // Configuration
  const ballCount = g.dvdLogoBallCount || 60;
  const logoSize = g.dvdLogoSize || 1.0;
  const speed = (g.dvdLogoSpeed || 400) * DPR;
  const ballSpacingMul = g.dvdLogoBallSpacing || 1.3; // Multiplier for spacing between balls
  const letterSpacingMul = g.dvdLogoLetterSpacing || 1.0; // Multiplier for spacing between letters
  
  // Use consistent ball radius for uniform spacing (scaled by logo size)
  const baseRadius = randomRadiusForMode(g, MODES.DVD_LOGO);
  const uniformRadius = baseRadius * logoSize;
  
  // Calculate ball positions with proper spacing
  const positions = calculateDvdPositions(ballCount, uniformRadius, ballSpacingMul, letterSpacingMul);
  
  // Initial logo center (random position or center)
  const wallInset = Math.max(0, (g.wallThickness ?? 0) * DPR);
  const borderInset = Math.max(0, (g.wallInset ?? 3) * DPR);
  const margin = wallInset + borderInset + uniformRadius * 10; // Extra margin for logo bounds
  
  logoCenterX = margin + Math.random() * (w - margin * 2);
  logoCenterY = margin + Math.random() * (h - margin * 2);
  
  // Initial velocity (random direction, constant speed)
  // Ensure angle is at least 30 degrees from horizontal/vertical (avoid shallow bounces)
  const minAngleDeg = 30;
  const minAngleRad = minAngleDeg * (Math.PI / 180);
  
  // Pick a random quadrant and angle within that quadrant (30-60 degrees from each axis)
  const quadrant = Math.floor(Math.random() * 4); // 0=NE, 1=SE, 2=SW, 3=NW
  const angleInQuadrant = minAngleRad + Math.random() * (Math.PI / 2 - minAngleRad * 2);
  const angle = quadrant * (Math.PI / 2) + angleInQuadrant;
  
  logoVelX = Math.cos(angle) * speed;
  logoVelY = Math.sin(angle) * speed;
  
  // Color sequence: prioritize bright colors, use only one grey
  const dvdColorSequence = [
    '#ff4013', // Red/orange (bright)
    '#0d5cb6', // Blue (bright)
    '#ffa000', // Amber (bright)
    '#00695c', // Teal (bright)
    '#ffffff', // White (bright)
    '#b5b7b6', // Grey (single grey only)
    '#000000'  // Black
  ];
  
  // Start with first bright color
  currentColorIndex = 0;
  const initialColor = dvdColorSequence[currentColorIndex];
  
  // Create balls at calculated positions (all with same radius for uniform spacing)
  positions.forEach(pos => {
    const x = logoCenterX + pos.x;
    const y = logoCenterY + pos.y;
    const ball = new Ball(x, y, uniformRadius, initialColor);
    ball.isDvdLogo = true;
    ball._dvdOffsetX = pos.x; // Store relative position
    ball._dvdOffsetY = pos.y;
    
    // Normal mass - wall impacts will be disabled anyway
    ball.m = g.MASS_BASELINE_KG;
    
    // Set velocity (will be overridden in update loop)
    ball.vx = logoVelX;
    ball.vy = logoVelY;
    ball.omega = 0; // No rotation
    
    // Disable wall effects and squash for DVD logo balls
    ball._skipWallEffects = true;
    ball.squashAmount = 0; // Keep perfectly round
    ball._noSquash = true; // Prevent squash updates
    
    g.balls.push(ball);
  });
}

// ═══════════════════════════════════════════════════════════════════════════════
// FORCE APPLICATION (NO-OP - LINEAR MOVEMENT ONLY)
// ═══════════════════════════════════════════════════════════════════════════════

export function applyDvdLogoForces(ball, dt) {
  // No forces needed - movement is purely kinematic (handled in update)
}

// ═══════════════════════════════════════════════════════════════════════════════
// UPDATE LOOP - LINEAR MOVEMENT AND WALL BOUNCE
// ═══════════════════════════════════════════════════════════════════════════════

export function updateDvdLogo(dt) {
  const g = getGlobals();
  if (g.currentMode !== MODES.DVD_LOGO) return;
  
  const canvas = g.canvas;
  if (!canvas) return;
  
  const w = canvas.width;
  const h = canvas.height;
  const DPR = g.DPR || 1;
  
  const balls = g.balls;
  if (balls.length === 0) return;
  
  // Wall boundaries
  const wallInset = Math.max(0, (g.wallThickness ?? 0) * DPR);
  const borderInset = Math.max(0, (g.wallInset ?? 3) * DPR);
  const totalInset = wallInset + borderInset;
  
  // Calculate logo bounds (bounding box of all balls)
  let minX = Infinity, maxX = -Infinity;
  let minY = Infinity, maxY = -Infinity;
  
  for (let i = 0; i < balls.length; i++) {
    const ball = balls[i];
    if (!ball.isDvdLogo) continue;
    const ballLeft = ball.x - ball.r;
    const ballRight = ball.x + ball.r;
    const ballTop = ball.y - ball.r;
    const ballBottom = ball.y + ball.r;
    
    if (ballLeft < minX) minX = ballLeft;
    if (ballRight > maxX) maxX = ballRight;
    if (ballTop < minY) minY = ballTop;
    if (ballBottom > maxY) maxY = ballBottom;
  }
  
  // Check for wall collisions and bounce (perfect linear reflection)
  let hitWall = false;
  let newColor = null;
  
  // Minimum angle from axes (30 degrees = 0.524 radians)
  const minAngleDeg = 30;
  const minAngleRad = minAngleDeg * (Math.PI / 180);
  const minRatio = Math.tan(minAngleRad); // tan(30°) ≈ 0.577
  
  // Left wall - perfect reflection
  if (minX <= totalInset) {
    if (logoVelX < 0) {
      logoVelX = Math.abs(logoVelX); // Ensure positive (moving right)
      logoCenterX += (totalInset - minX); // Push away from wall
      hitWall = true;
      
      // Ensure angle isn't too shallow (at least 30° from vertical)
      if (Math.abs(logoVelX) < Math.abs(logoVelY) * minRatio) {
        logoVelX = Math.abs(logoVelY) * minRatio * Math.sign(logoVelX || 1);
      }
    }
  }
  
  // Right wall - perfect reflection
  if (maxX >= w - totalInset) {
    if (logoVelX > 0) {
      logoVelX = -Math.abs(logoVelX); // Ensure negative (moving left)
      logoCenterX -= (maxX - (w - totalInset)); // Push away from wall
      hitWall = true;
      
      // Ensure angle isn't too shallow
      if (Math.abs(logoVelX) < Math.abs(logoVelY) * minRatio) {
        logoVelX = -Math.abs(logoVelY) * minRatio;
      }
    }
  }
  
  // Top wall - perfect reflection
  if (minY <= totalInset) {
    if (logoVelY < 0) {
      logoVelY = Math.abs(logoVelY); // Ensure positive (moving down)
      logoCenterY += (totalInset - minY); // Push away from wall
      hitWall = true;
      
      // Ensure angle isn't too shallow (at least 30° from horizontal)
      if (Math.abs(logoVelY) < Math.abs(logoVelX) * minRatio) {
        logoVelY = Math.abs(logoVelX) * minRatio * Math.sign(logoVelY || 1);
      }
    }
  }
  
  // Bottom wall - perfect reflection
  if (maxY >= h - totalInset) {
    if (logoVelY > 0) {
      logoVelY = -Math.abs(logoVelY); // Ensure negative (moving up)
      logoCenterY -= (maxY - (h - totalInset)); // Push away from wall
      hitWall = true;
      
      // Ensure angle isn't too shallow
      if (Math.abs(logoVelY) < Math.abs(logoVelX) * minRatio) {
        logoVelY = -Math.abs(logoVelX) * minRatio;
      }
    }
  }
  
  // If hit wall, change color
  if (hitWall) {
    // Cycle to next color in sequence (bright colors first, single grey, then black)
    const dvdColorSequence = [
      '#ff4013', // Red/orange (bright)
      '#0d5cb6', // Blue (bright)
      '#ffa000', // Amber (bright)
      '#00695c', // Teal (bright)
      '#ffffff', // White (bright)
      '#b5b7b6', // Grey (single grey only)
      '#000000'  // Black
    ];
    currentColorIndex = (currentColorIndex + 1) % dvdColorSequence.length;
    newColor = dvdColorSequence[currentColorIndex];
  }
  
  // ═══════════════════════════════════════════════════════════════════════════
  // ADJUST VELOCITY TO MATCH CONFIGURED SPEED (dynamic speed control)
  // ═══════════════════════════════════════════════════════════════════════════
  const targetSpeed = (g.dvdLogoSpeed || 400) * DPR;
  const currentSpeed = Math.sqrt(logoVelX * logoVelX + logoVelY * logoVelY);
  
  if (currentSpeed > 0.1) {
    // Adjust velocity magnitude to match target speed while maintaining direction
    const speedRatio = targetSpeed / currentSpeed;
    logoVelX *= speedRatio;
    logoVelY *= speedRatio;
  }
  
  // Update logo center position based on velocity
  logoCenterX += logoVelX * dt;
  logoCenterY += logoVelY * dt;
  
  // Update all ball positions and velocities
  for (let i = 0; i < balls.length; i++) {
    const ball = balls[i];
    if (!ball.isDvdLogo) continue;
    
    // Update position relative to logo center
    ball.x = logoCenterX + ball._dvdOffsetX;
    ball.y = logoCenterY + ball._dvdOffsetY;
    
    // Set velocity (for physics engine compatibility)
    ball.vx = logoVelX;
    ball.vy = logoVelY;
    ball.omega = 0; // No rotation
    
    // Keep balls perfectly round (no squash)
    ball.squashAmount = 0;
    
    // Change color if we hit a wall
    if (newColor) {
      ball.color = newColor;
    }
  }
}
