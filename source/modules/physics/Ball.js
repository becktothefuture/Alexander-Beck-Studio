// ╔══════════════════════════════════════════════════════════════════════════════╗
// ║                              BALL CLASS (COMPLETE)                           ║
// ║                   Extracted from balls-source.html lines 1823-2234           ║
// ╚══════════════════════════════════════════════════════════════════════════════╝

import { getConfig, getGlobals } from '../core/state.js';
import { CONSTANTS, MODES } from '../core/constants.js';
import { playCollisionSound } from '../audio/sound-engine.js';
import { registerWallImpact, registerWallPressure } from './wall-state.js';

// Unique ID counter for ball sound debouncing
let ballIdCounter = 0;

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
    this._soundId = `ball-${ballIdCounter++}`; // Unique ID for sound debouncing
  }

  step(dt, applyForcesFunc) {
    const globals = getGlobals();
    const { currentMode, G, gravityScale, FRICTION, MASS_BASELINE_KG } = globals;
    
    this.t += dt;
    this.age += dt;
    
    // Wake up if sleeping and mouse is nearby (Ball Pit mode only)
    const isPitLike = currentMode === MODES.PIT || currentMode === MODES.PIT_THROWS;
    if (this.isSleeping && isPitLike) {
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
    
    // ════════════════════════════════════════════════════════════════════════════
    // PROGRESSIVE DRAG - Higher damping at low velocities to prevent micro-jitters
    // This simulates rolling resistance and static friction engaging at low speeds
    // ════════════════════════════════════════════════════════════════════════════
    const massScale = Math.max(0.25, this.m / MASS_BASELINE_KG);
    const speed = Math.sqrt(this.vx * this.vx + this.vy * this.vy);
    
    // Base drag from config (skip for WEIGHTLESS and ORBIT modes - they manage their own damping)
    const baseDrag = (currentMode === MODES.WEIGHTLESS || currentMode === MODES.ORBIT_3D || currentMode === MODES.ORBIT_3D_2) ? 0 : FRICTION;
    
    // Progressive drag: multiply instead of divide for stability
    // At high speed (>100 px/s): base drag only (multiplier = 0)
    // At low speed (<10 px/s): up to 2x base drag (multiplier = 1)
    const speedMultiplier = Math.max(0, Math.min(1, 1 - speed / 100));
    const progressiveDrag = baseDrag * (1 + speedMultiplier * 1.0); // Up to 2x at low speed
    
    const drag = Math.max(0, 1 - (progressiveDrag / massScale));
    this.vx *= drag;
    this.vy *= drag;
    
    // ════════════════════════════════════════════════════════════════════════════
    // MICRO-JITTER PREVENTION - Snap tiny velocities to zero
    // Below this threshold, friction would dominate anyway
    // Skip for ORBIT modes (orbital velocities need to persist)
    // ════════════════════════════════════════════════════════════════════════════
    if (currentMode !== MODES.ORBIT_3D && currentMode !== MODES.ORBIT_3D_2) {
    const MICRO_VEL_THRESHOLD = 2.0; // px/s - below this, snap to zero
    if (Math.abs(this.vx) < MICRO_VEL_THRESHOLD) this.vx = 0;
    if (Math.abs(this.vy) < MICRO_VEL_THRESHOLD && currentMode === MODES.WEIGHTLESS) {
      // Only snap vy in weightless (gravity modes need vy to settle naturally)
      this.vy = 0;
      }
    }
    
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
    
    // ════════════════════════════════════════════════════════════════════════════
    // SPIN DAMPING - Progressive damping prevents endless rotation
    // ════════════════════════════════════════════════════════════════════════════
    const angularSpeed = Math.abs(this.omega);
    // Multiply instead of divide for stability: higher damping at low angular velocity
    const angularMultiplier = Math.max(0, Math.min(1, 1 - angularSpeed / 2.0));
    const progressiveSpinDamp = CONSTANTS.SPIN_DAMP_PER_S * (1 + angularMultiplier * 0.5); // Up to 1.5x
    const spinDamp = Math.max(0, 1 - progressiveSpinDamp * dt);
    this.omega *= spinDamp;
    this.theta += this.omega * dt;
    
    // Snap tiny angular velocity to zero
    if (Math.abs(this.omega) < 0.01) this.omega = 0;
    
    // Squash decay
    const decay = Math.min(1, CONSTANTS.SQUASH_DECAY_PER_S * dt);
    this.squashAmount += (0 - this.squashAmount) * decay;
    this.squash = 1 - this.squashAmount;
    
    // Sleep detection (Ball Pit mode only, Box2D-style)
    if (isPitLike) {
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
    const { REST, MASS_BASELINE_KG, MASS_REST_EXP, currentMode, DPR } = globals;
    const rest = customRest !== undefined ? customRest : REST;
    const wobbleThreshold = globals.wallWobbleImpactThreshold ?? CONSTANTS.WALL_REST_VEL_THRESHOLD;
    
    // Corner radius for rounded corner collision
    const cornerRadiusPx = (typeof globals.getCanvasCornerRadius === 'function')
      ? globals.getCanvasCornerRadius()
      : (globals.cornerRadius ?? globals.wallRadius ?? 42);
    const cr = Math.max(0, cornerRadiusPx) * (DPR || 1);
    
    // Small inset to create a gap between balls and walls (prevents overlap)
    // Positive value = balls stop before the edge
    const borderInset = Math.max(0, (globals.wallInset ?? 3)) * (DPR || 1);
    // If we inset the playable bounds, the corner arc radius must shrink by the same amount
    // so the straight edges and the rounded corners remain perfectly tangent/aligned.
    const cornerArc = Math.max(0, cr - borderInset);
    
    let hasWallCollision = false;
    
    // ════════════════════════════════════════════════════════════════════════
    // CORNER COLLISION: Push balls out of rounded corner zones
    // Check if ball center is within a corner quadrant and too close to arc
    // ════════════════════════════════════════════════════════════════════════
    const corners = [
      { cx: cr, cy: cr },           // Top-left
      { cx: w - cr, cy: cr },       // Top-right
      { cx: cr, cy: h - cr },       // Bottom-left
      { cx: w - cr, cy: h - cr }    // Bottom-right
    ];
    
    for (let i = 0; i < corners.length; i++) {
      // Skip top corners (0, 1) in Ball Pit mode so balls can fall in
      if ((currentMode === MODES.PIT || currentMode === MODES.PIT_THROWS) && i < 2) continue;
      
      const corner = corners[i];
      // Check if ball is in this corner's quadrant
      const inXZone = (i % 2 === 0) ? (this.x < cr) : (this.x > w - cr);
      const inYZone = (i < 2) ? (this.y < cr) : (this.y > h - cr);
      
      if (inXZone && inYZone) {
        const dx = this.x - corner.cx;
        const dy = this.y - corner.cy;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const minDist = cornerArc - this.r; // Ball must stay inside the inset arc
        
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
            // Note: Corners are ANCHORED - no rubber wall impact
          }
        }
      }
    }
    
    // Effective boundaries (accounting for inner border)
    // Same for ALL modes - walls never move
    const minX = borderInset;
    const maxX = w - borderInset;
    const minY = borderInset;  // No special viewportTop offset - walls stay fixed
    const maxY = h - borderInset;
    
    // Bottom
    if (this.y + this.r > maxY) {
      hasWallCollision = true;
      this.y = maxY - this.r;
      const preVy = this.vy;
      const slip = this.vx - this.omega * this.r;
      const massScale = Math.max(0.25, this.m / MASS_BASELINE_KG);
      this.omega += (slip / this.r) * CONSTANTS.SPIN_GAIN / massScale;
      
      // ══════════════════════════════════════════════════════════════════════════
      // PROGRESSIVE GROUND FRICTION - Higher friction at low speeds
      // Simulates rolling resistance and static friction engaging
      // ══════════════════════════════════════════════════════════════════════════
      const groundSpeed = Math.abs(this.vx);
      // Progressive friction: multiply instead of divide for stability
      // Higher at low speeds (up to 2x at <10 px/s)
      const frictionMultiplier = Math.max(0, Math.min(1, 1 - groundSpeed / 80));
      const progressiveRollFriction = CONSTANTS.ROLL_FRICTION_PER_S * (1 + frictionMultiplier * 1.0);
      const rollDamp = Math.max(0, 1 - progressiveRollFriction * dt / massScale);
      this.vx *= rollDamp;
      
      // Snap slow horizontal movement to zero (prevents endless creeping)
      if (Math.abs(this.vx) < 3.0) this.vx = 0;
      
      const wallRest = Math.abs(preVy) < wobbleThreshold ? 0 : rest;
      this.vy = -this.vy * (wallRest * Math.pow(MASS_BASELINE_KG / this.m, MASS_REST_EXP));
      const impact = Math.min(1, Math.abs(preVy) / (this.r * 90));
      this.squashAmount = Math.min(globals.getSquashMax(), impact * 0.8);
      this.squashNormalAngle = -Math.PI / 2;
      const rollTarget = this.vx / this.r;
      this.omega += (rollTarget - this.omega) * Math.min(1, CONSTANTS.GROUND_COUPLING_PER_S * dt);
      
      // Snap slow spin to zero when on ground
      if (Math.abs(this.omega) < 0.05) this.omega = 0;
      
      // Sound: floor impact (threshold handled by sound engine)
      playCollisionSound(this.r, impact * 0.7, this.x / w, this._soundId);
      // Rubbery wall wobble - only register if ball is moving DOWN into wall (actual impact, not just weight)
      // Skip if sleeping (resting balls shouldn't cause wobble)
      if (!this.isSleeping && preVy > 0 && preVy >= wobbleThreshold) {
        registerWallImpact('bottom', this.x / w, impact);
      }
      
      // ALWAYS register pressure when touching ground (whether impacting or not)
      // This kills wobble from stacked/resting balls
      // Pressure is cumulative, so more balls = more damping
      const pressureAmount = this.isSleeping ? 1.0 : Math.min(1.0, (wobbleThreshold - Math.abs(preVy)) / wobbleThreshold);
      if (pressureAmount > 0.1) {
        registerWallPressure('bottom', this.x / w, pressureAmount);
      }
    }
    
    // Top (ceiling) - Skip in Ball Pit mode so balls can fall in from above
    if (currentMode !== MODES.PIT && currentMode !== MODES.PIT_THROWS && this.y - this.r < minY) {
      hasWallCollision = true;
      this.y = minY + this.r;
      const preVy = this.vy;  // Capture BEFORE reversal for impact calculation
      this.vy = -this.vy * rest;
      const impact = Math.min(1, Math.abs(preVy) / (this.r * 90));
      this.squashAmount = Math.min(globals.getSquashMax(), impact * 0.8);
      this.squashNormalAngle = Math.PI / 2;
      // Sound: ceiling impact (threshold handled by sound engine)
      playCollisionSound(this.r, impact * 0.7, this.x / w, this._soundId);
      // Rubbery wall wobble - only register if ball is moving UP into wall (actual impact, not just weight)
      // Skip if sleeping (resting balls shouldn't cause wobble)
      if (!this.isSleeping && preVy < 0 && Math.abs(preVy) >= wobbleThreshold) {
        registerWallImpact('top', this.x / w, impact);
      }
      
      // ALWAYS register pressure when touching ceiling
      const pressureAmount = this.isSleeping ? 1.0 : Math.min(1.0, (wobbleThreshold - Math.abs(preVy)) / wobbleThreshold);
      if (pressureAmount > 0.1) {
        registerWallPressure('top', this.x / w, pressureAmount);
      }
    }
    
    // Right
    if (this.x + this.r > maxX) {
      hasWallCollision = true;
      this.x = maxX - this.r;
      const preVx = this.vx;
      const slip = this.vy - this.omega * this.r;
      const massScale = Math.max(0.25, this.m / MASS_BASELINE_KG);
      this.omega += (slip / this.r) * (CONSTANTS.SPIN_GAIN * 0.5) / massScale;
      this.vx = -this.vx * (REST * Math.pow(MASS_BASELINE_KG / this.m, MASS_REST_EXP));
      const impact = Math.min(1, Math.abs(preVx)/(this.r*70));
      this.squashAmount = Math.min(globals.getSquashMax(), impact * 0.8);
      this.squashNormalAngle = Math.PI;
      // Sound: right wall impact (threshold handled by sound engine)
      playCollisionSound(this.r, impact * 0.6, 1.0, this._soundId);
      // Rubbery wall wobble - only register if ball is moving RIGHT into wall (actual impact, not just weight)
      // Skip if sleeping (resting balls shouldn't cause wobble)
      if (!this.isSleeping && preVx > 0 && preVx >= wobbleThreshold) {
        registerWallImpact('right', this.y / h, impact);
      }
      
      // ALWAYS register pressure when touching wall
      const pressureAmountR = this.isSleeping ? 1.0 : Math.min(1.0, (wobbleThreshold - Math.abs(preVx)) / wobbleThreshold);
      if (pressureAmountR > 0.1) {
        registerWallPressure('right', this.y / h, pressureAmountR);
      }
    }
    
    // Left
    if (this.x - this.r < minX) {
      hasWallCollision = true;
      this.x = minX + this.r;
      const preVx = this.vx;
      const slip = this.vy - this.omega * this.r;
      const massScale = Math.max(0.25, this.m / MASS_BASELINE_KG);
      this.omega += (slip / this.r) * (CONSTANTS.SPIN_GAIN * 0.5) / massScale;
      this.vx = -this.vx * (REST * Math.pow(MASS_BASELINE_KG / this.m, MASS_REST_EXP));
      const impact = Math.min(1, Math.abs(preVx)/(this.r*70));
      this.squashAmount = Math.min(globals.getSquashMax(), impact * 0.8);
      this.squashNormalAngle = 0;
      // Sound: left wall impact (threshold handled by sound engine)
      playCollisionSound(this.r, impact * 0.6, 0.0, this._soundId);
      // Rubbery wall wobble - only register if ball is moving LEFT into wall (actual impact, not just weight)
      // Skip if sleeping (resting balls shouldn't cause wobble)
      if (!this.isSleeping && preVx < 0 && Math.abs(preVx) >= wobbleThreshold) {
        registerWallImpact('left', this.y / h, impact);
      }
      
      // ALWAYS register pressure when touching wall
      const pressureAmountL = this.isSleeping ? 1.0 : Math.min(1.0, (wobbleThreshold - Math.abs(preVx)) / wobbleThreshold);
      if (pressureAmountL > 0.1) {
        registerWallPressure('left', this.y / h, pressureAmountL);
      }
    }
    
    // Wake on wall collision (prevents sleeping balls from getting stuck in walls)
    if (hasWallCollision && this.isSleeping) {
      this.wake();
    }
  }

  draw(ctx) {
    // ══════════════════════════════════════════════════════════════════════════════
    // PERFORMANCE: Optimized draw with minimal state changes
    // - Skip save/restore when possible (expensive operations)
    // - Batch similar operations
    // - Only use transforms when necessary
    // ══════════════════════════════════════════════════════════════════════════════
    
    const hasSquash = this.squashAmount > 0.001;
    const hasAlpha = this.alpha < 1.0;
    
    // Only use save/restore when we have transforms that need cleanup
    if (hasSquash || hasAlpha) {
      ctx.save();
      ctx.translate(this.x, this.y);
      
      if (hasSquash) {
        ctx.rotate(this.theta + this.squashNormalAngle);
        const squashX = 1 - this.squashAmount * 0.3;
        const squashY = 1 + this.squashAmount * 0.3;
        ctx.scale(squashX, squashY);
        ctx.rotate(-this.squashNormalAngle);
      } else {
        ctx.rotate(this.theta);
      }
      
      if (hasAlpha) {
        ctx.globalAlpha = this.alpha;
      }
      
      ctx.beginPath();
      ctx.arc(0, 0, this.r, 0, Math.PI * 2);
      ctx.fillStyle = this.color;
      ctx.fill();
      
      ctx.restore();
    } else {
      // Fast path: no squash, no alpha - draw directly without save/restore
      ctx.fillStyle = this.color;
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.r, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}
