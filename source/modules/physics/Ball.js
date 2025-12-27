// ╔══════════════════════════════════════════════════════════════════════════════╗
// ║                              BALL CLASS (COMPLETE)                           ║
// ║                   Extracted from balls-source.html lines 1823-2234           ║
// ╚══════════════════════════════════════════════════════════════════════════════╝

import { getConfig, getGlobals } from '../core/state.js';
import { CONSTANTS, MODES } from '../core/constants.js';
import { playCollisionSound } from '../audio/sound-engine.js';
import { registerWallImpactAtPoint, registerWallPressureAtPoint, wallState } from './wall-state.js';

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
    this.isGrounded = false; // Set during wall collisions (bottom contact)
    this.hasSupport = false; // Set during ball-ball collisions (ball below supports this one)
    this._soundId = `ball-${ballIdCounter++}`; // Unique ID for sound debouncing
  }

  step(dt, applyForcesFunc) {
    const globals = getGlobals();
    const { currentMode, G, gravityScale, FRICTION, MASS_BASELINE_KG } = globals;
    
    this.t += dt;
    this.age += dt;
    
    // Wake up if sleeping and mouse is nearby.
    // This is kept cheap (no sqrt) so sleeping can safely be used beyond Pit modes.
    const isPitLike = currentMode === MODES.PIT || currentMode === MODES.PIT_THROWS;
    if (this.isSleeping) {
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
    // Can be disabled for debugging / extreme tuning.
    if (this.isSleeping && globals.physicsSkipSleepingSteps !== false) {
      return;
    }

    // ════════════════════════════════════════════════════════════════════════════
    // REAL PHYSICS: Skip gravity for supported balls (simulates normal force)
    // In reality, gravity on a resting ball is BALANCED by the floor's OR another
    // ball's normal force. Without this, we get gravity→bounce oscillation = jitter.
    // hasSupport = resting on another ball; isGrounded = touching floor
    // ════════════════════════════════════════════════════════════════════════════
    const DPR = globals.DPR || 1;
    const wasGrounded = this.isGrounded;
    const wasSupported = this.hasSupport;
    this.isGrounded = false; // Clear; will be re-set in walls() if still touching floor
    this.hasSupport = false; // Clear; will be re-set in collision resolution if supported
    
    // Gravity (skip in weightless, skip for grounded/supported balls not jumping)
    if (currentMode !== MODES.WEIGHTLESS) {
      // Only apply gravity if:
      // 1. Ball was not grounded OR supported last frame (truly airborne), OR
      // 2. Ball has significant upward velocity (jumping)
      // Threshold DPR-scaled: 8 display-px/s upward motion still gets gravity
      const JUMP_VEL_THRESHOLD = -8 * DPR;
      if ((!wasGrounded && !wasSupported) || this.vy < JUMP_VEL_THRESHOLD) {
        this.vy += (G * gravityScale) * dt;
      }
    }
    
    // ════════════════════════════════════════════════════════════════════════════
    // PROGRESSIVE DRAG - Higher damping at low velocities to prevent micro-jitters
    // This simulates rolling resistance and static friction engaging at low speeds
    // DPR-scaled thresholds: physics runs in canvas pixels (displayPx * DPR)
    // ════════════════════════════════════════════════════════════════════════════
    const massScale = Math.max(0.25, this.m / MASS_BASELINE_KG);
    const speed = Math.sqrt(this.vx * this.vx + this.vy * this.vy);
    
    // Base drag from config (skip for WEIGHTLESS and ORBIT modes - they manage their own damping)
    const baseDrag = (currentMode === MODES.WEIGHTLESS || currentMode === MODES.ORBIT_3D || currentMode === MODES.ORBIT_3D_2) ? 0 : FRICTION;
    
    // Progressive drag: multiply instead of divide for stability
    // At high speed (>100 px/s * DPR): base drag only (multiplier = 0)
    // At low speed (<10 px/s * DPR): up to 2x base drag (multiplier = 1)
    const speedMultiplier = Math.max(0, Math.min(1, 1 - speed / (100 * DPR)));
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
    const MICRO_VEL_THRESHOLD = 2.0 * DPR; // px/s - below this, snap to zero
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
    // NOTE: Sleep evaluation is done after constraints (collisions + walls) in the engine.
  }
  
  /**
   * Box2D-inspired sleep detection
   * Only sleeps if grounded AND below velocity threshold for sustained time
   */
  updateSleepState(dt, globals) {
    const speed = Math.sqrt(this.vx * this.vx + this.vy * this.vy);
    const angularSpeed = Math.abs(this.omega);
    
    // Sleep thresholds are tunable via runtime config / control panel (Pit modes only).
    // Fall back to constants if missing.
    // DPR-scale velocity threshold: physics runs in canvas pixels (displayPx * DPR)
    const DPR = globals.DPR || 1;
    const vThresh = (Number.isFinite(globals.sleepVelocityThreshold)
      ? globals.sleepVelocityThreshold
      : CONSTANTS.SLEEP_VELOCITY_THRESHOLD) * DPR;
    const wThresh = Number.isFinite(globals.sleepAngularThreshold)
      ? globals.sleepAngularThreshold
      : CONSTANTS.SLEEP_ANGULAR_THRESHOLD;
    const tSleep = Number.isFinite(globals.timeToSleep)
      ? globals.timeToSleep
      : CONSTANTS.TIME_TO_SLEEP;

    // Critical: only allow sleep when grounded OR supported by another ball.
    // Without this, balls stacked on other balls can never settle (jitter).
    const isSettled = !!this.isGrounded || !!this.hasSupport;
    const belowThreshold = isSettled && speed < vThresh && angularSpeed < wThresh;
    
    // Simplified sleep (Pit-like modes):
    // If a ball is truly idle (supported by other balls or the floor), let it sleep.
    // Gravity will prevent mid-air balls from staying below threshold for long.
    if (belowThreshold) {
      this.sleepTimer += dt;
      
      // Must be below threshold for TIME_TO_SLEEP seconds (stability check)
      if (this.sleepTimer >= tSleep) {
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

  walls(w, h, dt, customRest, options = {}) {
    const registerEffects = options.registerEffects !== false;
    const globals = getGlobals();
    const { REST, MASS_BASELINE_KG, MASS_REST_EXP, currentMode, DPR } = globals;
    const rest = customRest !== undefined ? customRest : REST;
    const wobbleThreshold = globals.wallWobbleImpactThreshold ?? CONSTANTS.WALL_REST_VEL_THRESHOLD;
    
    // Spacing ratio: additional gap as a ratio of ball radius (matches ball-ball spacing)
    const spacingRatio = globals.ballSpacing || 0;
    const effectiveRadius = this.r * (1 + spacingRatio);
    
    // Corner radius for rounded corner collision
    // Must match the wall rendering's inner radius calculation exactly (same fallback chain)
    const cornerRadiusPx = (typeof globals.getCanvasCornerRadius === 'function')
      ? globals.getCanvasCornerRadius()
      : (globals.cornerRadius ?? globals.wallRadius ?? 0);
    const cr = Math.max(0, Number(cornerRadiusPx) || 0) * (DPR || 1);
    
    // Balls collide with the INNER EDGE of the wall, which is inset by wall thickness only.
    // Content padding is layout-only and must not affect physics.
    const wallThicknessPx = Math.max(0, (globals.wallThickness ?? 0) * (DPR || 1));
    const insetPx = wallThicknessPx;
    
    // Small additional inset to create a gap between balls and walls (prevents overlap)
    // This is physics-only padding on top of wall thickness
    const borderInset = Math.max(0, (globals.wallInset ?? 3)) * (DPR || 1);
    
    // Corner arc radius must match wall rendering's INNER geometry:
    // innerR is clamped to inner dims, then borderInset applies as physics-only padding.
    const innerW = Math.max(1, w - insetPx * 2);
    const innerH = Math.max(1, h - insetPx * 2);
    const innerR = Math.max(0, Math.min(cr, innerW * 0.5, innerH * 0.5));
    const cornerArc = Math.max(0, innerR - borderInset);
    
    let hasWallCollision = false;
    // Note: isGrounded is cleared at start of step() and re-set here if touching floor
    
    // ════════════════════════════════════════════════════════════════════════
    // UNIFIED ROUNDED-RECT SDF COLLISION
    // Single continuous distance field - no corner/edge transitions = no swirls
    // ════════════════════════════════════════════════════════════════════════
    const isPitMode = currentMode === MODES.PIT || currentMode === MODES.PIT_THROWS;
    
    // SDF parameters: inner boundary is inset by wallThickness
    const hx = innerW * 0.5;  // half-width
    const hy = innerH * 0.5;  // half-height
    const rr = innerR;        // corner radius
    
    // Transform ball position to inner coordinate space (centered)
    const cx = insetPx + hx;  // center x in canvas coords
    const cy = insetPx + hy;  // center y in canvas coords
    
    // Wall deformation (collision surface):
    // We treat the rubber wall deformation as an INWARD displacement of the boundary.
    // Precision controls how many deformation samples we take near contact.
    const precision = Math.max(0, Math.min(100, globals.wallDeformPhysicsPrecision ?? 50));
    const ring = wallState?.ringPhysics;
    const wallHasDeform = !!(ring && typeof ring.hasDeformation === 'function' && ring.hasDeformation());
    const useDeformation = precision > 0 && wallHasDeform && typeof wallState?.getDeformationAtPoint === 'function';
    // Max inward deform is authored in CSS px @ DPR=1; convert to canvas px.
    const maxDeformCanvasPx = Math.max(0, (Number(globals.wallWobbleMaxDeform) || 0) * (DPR || 1));
    
    // Rounded-rect SDF: returns (distance, outward normal)
    // Negative = inside, Positive = outside (in wall)
    // Now accounts for wall deformation: deformation pushes boundary inward
    const computeSDF = (px, py) => {
      // Local coords relative to center
      const lx = px - cx;
      const ly = py - cy;
      const ax = Math.abs(lx);
      const ay = Math.abs(ly);
      
      // Distance to inner rect (shrunk by corner radius)
      const dx = ax - (hx - rr);
      const dy = ay - (hy - rr);
      
      // SDF formula for rounded rect (base static boundary)
      const outsideCorner = Math.hypot(Math.max(dx, 0), Math.max(dy, 0));
      const insideRect = Math.min(Math.max(dx, dy), 0);
      const baseDist = outsideCorner + insideRect - rr;
      
      // Compute outward normal (gradient direction)
      let nx = 0, ny = 0;
      if (dx > 0 && dy > 0) {
        // In corner region: normal points away from corner center
        const len = Math.hypot(dx, dy);
        if (len > 1e-6) {
          nx = dx / len;
          ny = dy / len;
        }
      } else if (dx > dy) {
        // Closer to vertical edge
        nx = 1;
        ny = 0;
      } else {
        // Closer to horizontal edge
        nx = 0;
        ny = 1;
      }
      
      // Apply sign based on quadrant
      nx *= lx < 0 ? -1 : 1;
      ny *= ly < 0 ? -1 : 1;

      // Closest point on BASE (non-deformed) boundary in canvas space.
      // This is the correct place to sample + inject deformation because the ring is parameterized
      // along the rounded-rect perimeter.
      const bx = px - nx * baseDist;
      const by = py - ny * baseDist;
      
      // Deformation is only relevant when a ball is close enough that the inward
      // wall shift could matter. Far-inside balls should not pay the sampling cost.
      let deform = 0;
      if (useDeformation) {
        // If baseDist is more negative than -(margin + maxDeform), even max inward
        // shift can't reach the ball, so we can skip sampling.
        const nearThreshold = (effectiveRadius + borderInset) + maxDeformCanvasPx;
        if (baseDist > -nearThreshold) {
          // Precision-driven sampling along tangent (cheap, improves stability around corners)
          const sampleCount = Math.max(1, Math.min(6, 1 + Math.floor(precision / 20))); // 1..6
          const tx = -ny;
          const ty = nx;
          const amp = effectiveRadius * 0.35;
          let maxD = 0;
          if (sampleCount === 1) {
            maxD = wallState.getDeformationAtPoint(bx, by);
          } else {
            for (let s = 0; s < sampleCount; s++) {
              const t = (s / (sampleCount - 1)) - 0.5; // -0.5..0.5
              const sx = bx + tx * (t * amp);
              const sy = by + ty * (t * amp);
              const d = wallState.getDeformationAtPoint(sx, sy);
              if (d > maxD) maxD = d;
            }
          }
          deform = maxD;
      }
    }
    
      // Deformation is INWARD displacement of the boundary.
      // For an SDF where inside is negative, inward displacement increases the distance
      // (makes points "more outside" relative to the moved-in wall).
      const deformedDist = baseDist + deform;
      
      return { dist: deformedDist, nx, ny, bx, by, baseDist, deform };
    };
    
    // Compute deformed SDF and check for collision
    const { dist: sdfDist, nx, ny, bx, by } = computeSDF(this.x, this.y);
    
    // Ball Pit mode: skip collision if normal points upward (allow entry from top)
    const skipForPit = isPitMode && ny < -0.5;
    
    // Margin: ball radius + physics padding (deformation already accounted in SDF)
    const margin = effectiveRadius + borderInset;
    const penetration = sdfDist + margin;
    
    if (penetration > 0 && !skipForPit) {
      hasWallCollision = true;
      
      // Capture pre-collision velocity
      const preVn = this.vx * nx + this.vy * ny;
      
      // Push ball inward (opposite to outward normal)
      this.x -= nx * penetration;
      this.y -= ny * penetration;
      
      // Reflect velocity only if moving into wall (positive = outward = into wall)
      if (preVn > 0) {
        this.vx -= (1 + rest) * preVn * nx;
        this.vy -= (1 + rest) * preVn * ny;
      }
      
      // Determine wall classification for effects
      const absNx = Math.abs(nx);
      const absNy = Math.abs(ny);
      const isFloor = ny > 0.7;  // Mostly downward-facing = floor
      const isCeiling = ny < -0.7;
      const isLeftWall = nx < -0.7;
      const isRightWall = nx > 0.7;
      
      // Calculate impact strength
      const impactSpeed = Math.abs(preVn);
      const impact = Math.min(1, impactSpeed / (this.r * 80));
      
      // Floor-specific: grounding and rolling friction
      if (isFloor) {
        this.isGrounded = true;
        
        // Rolling friction
        const massScale = Math.max(0.25, this.m / MASS_BASELINE_KG);
      const groundSpeed = Math.abs(this.vx);
        const frictionMul = Math.max(0, Math.min(1, 1 - groundSpeed / (80 * DPR)));
        const rollFriction = CONSTANTS.ROLL_FRICTION_PER_S * (1 + frictionMul);
        const rollDamp = Math.max(0, 1 - rollFriction * dt / massScale);
      this.vx *= rollDamp;
      
      if (Math.abs(this.vx) < 3.0 * DPR) this.vx = 0;
      
        // Spin coupling
        const slip = this.vx - this.omega * this.r;
        this.omega += (slip / this.r) * CONSTANTS.SPIN_GAIN / massScale;
        const rollTarget = this.vx / this.r;
        this.omega += (rollTarget - this.omega) * Math.min(1, CONSTANTS.GROUND_COUPLING_PER_S * dt);
        if (Math.abs(this.omega) < 0.05) this.omega = 0;
      }
      
      // Visual squash
      this.squashAmount = Math.min(globals.getSquashMax(), impact * 0.8);
      this.squashNormalAngle = Math.atan2(-ny, -nx);
      
      // Sound and wobble effects
      if (registerEffects) {
        // Sound panned by x position
        const pan = this.x / Math.max(1, w);
        playCollisionSound(this.r, impact * 0.65, pan, this._soundId);
        
        // Wobble registration (drive the wall at the TRUE rounded-rect contact point).
        // This is critical for corners: SDF collision normal is diagonal there, which previously
        // failed the "which side?" test and resulted in missing wobble.
        //
        // Use normal velocity into the wall (preVn) to scale intensity: better tied to bounce.
        const impactSpeedN = Math.max(0, preVn);
        if (!this.isSleeping && impactSpeedN >= wobbleThreshold) {
          const impactN = Math.min(1, impactSpeedN / (this.r * 80));
          registerWallImpactAtPoint(bx, by, impactN);
        }
        
        // Pressure registration (dampens wobble from resting contact)
        const pressureAmount = this.isSleeping ? 1.0 : Math.max(0, (wobbleThreshold - impactSpeed) / wobbleThreshold);
        if (pressureAmount > 0.1) {
          registerWallPressureAtPoint(bx, by, pressureAmount);
        }
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
