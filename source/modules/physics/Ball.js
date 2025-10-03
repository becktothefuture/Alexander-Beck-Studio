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
  }

  step(dt, applyForcesFunc) {
    const globals = getGlobals();
    const { currentMode, G, gravityScale, FRICTION, MASS_BASELINE_KG } = globals;
    
    this.t += dt;
    this.age += dt;

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
  }

  walls(w, h, dt, customRest) {
    const globals = getGlobals();
    const { REST, MASS_BASELINE_KG, MASS_REST_EXP, cornerRadius, currentMode } = globals;
    const rest = customRest !== undefined ? customRest : REST;
    
    const viewportTop = (currentMode === MODES.PIT) ? (h / 3) : 0;
    
    // Bottom
    if (this.y + this.r > h) {
      this.y = h - this.r;
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
    if (this.y - this.r < viewportTop) {
      this.y = viewportTop + this.r;
      this.vy = -this.vy * rest;
      const impact = Math.min(1, Math.abs(this.vy) / (this.r * 90));
      this.squashAmount = Math.min(globals.getSquashMax(), impact * 0.8);
      this.squashNormalAngle = Math.PI / 2;
    }
    
    // Right
    if (this.x + this.r > w) {
      this.x = w - this.r;
      const slip = this.vy - this.omega * this.r;
      const massScale = Math.max(0.25, this.m / MASS_BASELINE_KG);
      this.omega += (slip / this.r) * (CONSTANTS.SPIN_GAIN * 0.5) / massScale;
      this.vx = -this.vx * (REST * Math.pow(MASS_BASELINE_KG / this.m, MASS_REST_EXP));
      const impact = Math.min(1, Math.abs(this.vx)/(this.r*70));
      this.squashAmount = Math.min(globals.getSquashMax(), impact * 0.8);
      this.squashNormalAngle = Math.PI;
    }
    
    // Left
    if (this.x - this.r < 0) {
      this.x = this.r;
      const slip = this.vy - this.omega * this.r;
      const massScale = Math.max(0.25, this.m / MASS_BASELINE_KG);
      this.omega += (slip / this.r) * (CONSTANTS.SPIN_GAIN * 0.5) / massScale;
      this.vx = -this.vx * (REST * Math.pow(MASS_BASELINE_KG / this.m, MASS_REST_EXP));
      const impact = Math.min(1, Math.abs(this.vx)/(this.r*70));
      this.squashAmount = Math.min(globals.getSquashMax(), impact * 0.8);
      this.squashNormalAngle = 0;
    }
    // Text collision detection
    this.checkTextCollisions(dt);
  }

  checkTextCollisions(dt) {
    const globals = getGlobals();
    const colliders = globals.textColliders || [];
    for (let i = 0; i < colliders.length; i++) {
      const rect = colliders[i];
      const closestX = Math.max(rect.x, Math.min(this.x, rect.x + rect.width));
      const closestY = Math.max(rect.y, Math.min(this.y, rect.y + rect.height));
      const dx = this.x - closestX;
      const dy = this.y - closestY;
      const distance = Math.sqrt(dx * dx + dy * dy);
      if (distance < this.r) {
        if (distance === 0) {
          this.y = rect.y - this.r;
          this.vy = -Math.abs(this.vy) * 0.97;
        } else {
          const overlap = this.r - distance;
          const nx = dx / distance;
          const ny = dy / distance;
          this.x += nx * overlap;
          this.y += ny * overlap;
          const dot = this.vx * nx + this.vy * ny;
          if (dot < 0) {
            this.vx -= 2 * dot * nx * 0.97;
            this.vy -= 2 * dot * ny * 0.97;
          }
        }
      }
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
