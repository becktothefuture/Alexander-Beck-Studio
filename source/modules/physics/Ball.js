// ╔══════════════════════════════════════════════════════════════════════════════╗
// ║                              BALL CLASS (COMPLETE)                           ║
// ║                   Extracted from balls-source.html lines 1823-2234           ║
// ╚══════════════════════════════════════════════════════════════════════════════╝

import { getConfig, getGlobals } from '../core/state.js';
import { CONSTANTS, MODES } from '../core/constants.js';

export class Ball {
  constructor(x, y, r, color) {
    const globals = getGlobals();
    this.x = x;
    this.y = y;
    this.vx = (Math.random()*2 - 1) * 200;
    this.vy = -Math.random()*200;
    this.r = r;
    this.rBase = r;
    this.m = globals.ballMassKg;
    this.color = color;
    this.t = 0;
    this.age = 0;
    this.driftAx = 0;
    this.driftTime = 0;
    this.omega = 0;
    this.squash = 1.0;
    this.squashDirX = 1;
    this.squashDirY = 0;
    this.theta = 0;
    this.squashAmount = 0.0;
    this.squashNormalAngle = 0.0;
    this.alpha = 1.0;
    this.isSleeping = false;
    this.sleepTimer = 0;  // Time spent below sleep threshold
  }

  step(dt, applyForcesFunc) {
    const globals = getGlobals();
    const { currentMode, G, gravityScale, FRICTION, MASS_BASELINE_KG } = globals;
    
    this.t += dt;
    this.age += dt;
    
    // Wake up if sleeping and mouse is nearby (Ball Pit mode only)
    if (this.isSleeping && currentMode === MODES.PIT) {
      const mouseX = globals.mouseX;
      const mouseY = globals.mouseY;
      const wakeRadius = (globals.repelRadius || 710) * globals.DPR * 1.2; // 20% larger than repel radius
      const dx = this.x - mouseX;
      const dy = this.y - mouseY;
      const dist2 = dx * dx + dy * dy;
      
      if (dist2 < wakeRadius * wakeRadius) {
        this.wake();
      }
    }
    
    // Skip all physics if sleeping (Box2D approach)
    if (this.isSleeping) {
      return;
    }

    // Gravity (skip in weightless)
    if (currentMode !== MODES.WEIGHTLESS) {
      this.vy += (G * gravityScale) * dt;
    }
    
    // Drag
    const massScale = Math.max(0.25, this.m / MASS_BASELINE_KG);
    const dragAmount = (currentMode === MODES.WEIGHTLESS) ? 0.0001 : FRICTION;
    const drag = Math.max(0, 1 - (dragAmount / massScale));
    this.vx *= drag;
    this.vy *= drag;
    
    // Drift
    if (this.driftAx !== 0 && this.age < this.driftTime) {
      this.vx += (this.driftAx * dt) / massScale;
    } else if (this.driftAx !== 0) {
      this.driftAx = 0;
    }
    
    // External forces
    if (applyForcesFunc) applyForcesFunc(this, dt);
    
    this.x += this.vx * dt;
    this.y += this.vy * dt;
    
    // Spin
    const spinDamp = Math.max(0, 1 - CONSTANTS.SPIN_DAMP_PER_S * dt);
    this.omega *= spinDamp;
    this.theta += this.omega * dt;
    
    // Squash decay
    const decay = Math.min(1, CONSTANTS.SQUASH_DECAY_PER_S * dt);
    this.squashAmount += (0 - this.squashAmount) * decay;
    this.squash = 1 - this.squashAmount;
    
    // Sleep detection (Ball Pit mode only, Box2D-style)
    if (currentMode === MODES.PIT) {
      this.updateSleepState(dt, globals);
    }
  }
  
  /**
   * Box2D-inspired sleep detection
   * Only sleeps if grounded AND below velocity threshold for sustained time
   */
  updateSleepState(dt, globals) {
    const speed = Math.sqrt(this.vx * this.vx + this.vy * this.vy);
    const angularSpeed = Math.abs(this.omega);
    const canvas = globals.canvas;
    
    // Check if grounded (within 1px of bottom)
    const isGrounded = canvas && (this.y + this.r >= canvas.height - 1);
    
    // Box2D uses 0.05 m/s threshold, we use 5 px/s
    const belowThreshold = speed < CONSTANTS.SLEEP_VELOCITY_THRESHOLD && 
                          angularSpeed < CONSTANTS.SLEEP_ANGULAR_THRESHOLD;
    
    if (isGrounded && belowThreshold) {
      this.sleepTimer += dt;
      
      // Must be below threshold for TIME_TO_SLEEP seconds (stability check)
      if (this.sleepTimer >= CONSTANTS.TIME_TO_SLEEP) {
        this.vx = 0;
        this.vy = 0;
        this.omega = 0;
        this.isSleeping = true;
      }
    } else {
      // Reset timer if ball moves or lifts off ground
      this.sleepTimer = 0;
    }
  }
  
  /**
   * Wake up a sleeping ball (Box2D-style)
   * Called when external forces are about to be applied
   */
  wake() {
    this.isSleeping = false;
    this.sleepTimer = 0;
  }

  walls(w, h, dt, customRest) {
    const globals = getGlobals();
    const { REST, MASS_BASELINE_KG, MASS_REST_EXP, cornerRadius, currentMode, DPR } = globals;
    const rest = customRest !== undefined ? customRest : REST;
    
    const viewportTop = (currentMode === MODES.PIT) ? (h / 3) : 0;
    
    // Corner radius inset (scaled by DPR)
    const cr = (cornerRadius || 42) * (DPR || 1);
    
    // No border inset - balls use full canvas bounds
    const borderInset = 0;
    
    let hasWallCollision = false;
    
    // ════════════════════════════════════════════════════════════════════════
    // CORNER COLLISION: Push balls out of rounded corner zones
    // Check if ball center is within a corner quadrant and too close to arc
    // ════════════════════════════════════════════════════════════════════════
    const corners = [
      { cx: cr, cy: viewportTop + cr },           // Top-left
      { cx: w - cr, cy: viewportTop + cr },       // Top-right
      { cx: cr, cy: h - cr },                      // Bottom-left
      { cx: w - cr, cy: h - cr }                   // Bottom-right
    ];
    
    for (let i = 0; i < corners.length; i++) {
      const corner = corners[i];
      // Check if ball is in this corner's quadrant
      const inXZone = (i % 2 === 0) ? (this.x < cr) : (this.x > w - cr);
      const inYZone = (i < 2) ? (this.y < viewportTop + cr) : (this.y > h - cr);
      
      if (inXZone && inYZone) {
        const dx = this.x - corner.cx;
        const dy = this.y - corner.cy;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const minDist = cr - this.r; // Ball must stay inside the arc
        
        if (dist > minDist && minDist > 0) {
          // Push ball back inside the rounded corner
          hasWallCollision = true;
          const overlap = dist - minDist;
          const nx = dx / dist;
          const ny = dy / dist;
          this.x -= nx * overlap;
          this.y -= ny * overlap;
          
          // Reflect velocity off the arc tangent
          const velDotN = this.vx * nx + this.vy * ny;
          if (velDotN > 0) {
            this.vx -= (1 + rest) * velDotN * nx;
            this.vy -= (1 + rest) * velDotN * ny;
          }
        }
      }
    }
    
    // Effective boundaries (accounting for inner border)
    const minX = borderInset;
    const maxX = w - borderInset;
    const minY = viewportTop + borderInset;
    const maxY = h - borderInset;
    
    // Bottom
    if (this.y + this.r > maxY) {
      hasWallCollision = true;
      this.y = maxY - this.r;
      const preVy = this.vy;
      const slip = this.vx - this.omega * this.r;
      const massScale = Math.max(0.25, this.m / MASS_BASELINE_KG);
      this.omega += (slip / this.r) * CONSTANTS.SPIN_GAIN / massScale;
      const rollDamp = Math.max(0, 1 - CONSTANTS.ROLL_FRICTION_PER_S * dt / massScale);
      this.vx *= rollDamp;
      const wallRest = Math.abs(preVy) < CONSTANTS.WALL_REST_VEL_THRESHOLD ? 0 : rest;
      this.vy = -this.vy * (wallRest * Math.pow(MASS_BASELINE_KG / this.m, MASS_REST_EXP));
      const impact = Math.min(1, Math.abs(preVy) / (this.r * 90));
      this.squashAmount = Math.min(globals.getSquashMax(), impact * 0.8);
      this.squashNormalAngle = -Math.PI / 2;
      const rollTarget = this.vx / this.r;
      this.omega += (rollTarget - this.omega) * Math.min(1, CONSTANTS.GROUND_COUPLING_PER_S * dt);
    }
    
    // Top
    if (this.y - this.r < minY) {
      hasWallCollision = true;
      this.y = minY + this.r;
      this.vy = -this.vy * rest;
      const impact = Math.min(1, Math.abs(this.vy) / (this.r * 90));
      this.squashAmount = Math.min(globals.getSquashMax(), impact * 0.8);
      this.squashNormalAngle = Math.PI / 2;
    }
    
    // Right
    if (this.x + this.r > maxX) {
      hasWallCollision = true;
      this.x = maxX - this.r;
      const slip = this.vy - this.omega * this.r;
      const massScale = Math.max(0.25, this.m / MASS_BASELINE_KG);
      this.omega += (slip / this.r) * (CONSTANTS.SPIN_GAIN * 0.5) / massScale;
      this.vx = -this.vx * (REST * Math.pow(MASS_BASELINE_KG / this.m, MASS_REST_EXP));
      const impact = Math.min(1, Math.abs(this.vx)/(this.r*70));
      this.squashAmount = Math.min(globals.getSquashMax(), impact * 0.8);
      this.squashNormalAngle = Math.PI;
    }
    
    // Left
    if (this.x - this.r < minX) {
      hasWallCollision = true;
      this.x = minX + this.r;
      const slip = this.vy - this.omega * this.r;
      const massScale = Math.max(0.25, this.m / MASS_BASELINE_KG);
      this.omega += (slip / this.r) * (CONSTANTS.SPIN_GAIN * 0.5) / massScale;
      this.vx = -this.vx * (REST * Math.pow(MASS_BASELINE_KG / this.m, MASS_REST_EXP));
      const impact = Math.min(1, Math.abs(this.vx)/(this.r*70));
      this.squashAmount = Math.min(globals.getSquashMax(), impact * 0.8);
      this.squashNormalAngle = 0;
    }
    
    // Wake on wall collision (prevents sleeping balls from getting stuck in walls)
    if (hasWallCollision && this.isSleeping) {
      this.wake();
    }
  }

  draw(ctx) {
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.theta);
    
    // Apply squash
    if (this.squashAmount > 0.001) {
      const squashX = 1 - this.squashAmount * 0.3;
      const squashY = 1 + this.squashAmount * 0.3;
      ctx.rotate(this.squashNormalAngle);
      ctx.scale(squashX, squashY);
      ctx.rotate(-this.squashNormalAngle);
    }
    
    ctx.beginPath();
    ctx.arc(0, 0, this.r, 0, Math.PI * 2);
    ctx.fillStyle = this.color;
    ctx.globalAlpha = this.alpha;
    ctx.fill();
    ctx.globalAlpha = 1.0;
    ctx.restore();
  }
}
