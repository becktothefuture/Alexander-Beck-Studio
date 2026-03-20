// ╔══════════════════════════════════════════════════════════════════════════════╗
// ║                              BALL CLASS (COMPLETE)                           ║
// ║                   Extracted from balls-source.html lines 1823-2234           ║
// ╚══════════════════════════════════════════════════════════════════════════════╝

import { getConfig, getGlobals } from '../core/state.js';
import { CONSTANTS, MODES, isPitLikeMode } from '../core/constants.js';
import { playCollisionSound } from '../audio/sound-engine.js';
import { registerWallImpactAtPoint, registerWallPressureAtPoint } from './wall-state.js';
import { getPortfolioBodyMaxExtentAlongWorldNormal } from './portfolio-body-geometry.js';

// Unique ID counter for ball sound debouncing
let ballIdCounter = 0;

/**
 * Rounded-rect interior wall violation (same geometry as Ball.walls).
 * @returns {null | { nx: number, ny: number, penetration: number, effectiveRadius: number }}
 */
function getInteriorWallViolation(ball, w, h) {
  const globals = getGlobals();
  const { currentMode, DPR } = globals;

  const spacingRatio = globals.ballSpacing || 0;
  const effectiveRadius = ball.r * (1 + spacingRatio);

  const cornerRadiusPx = (typeof globals.getCanvasCornerRadius === 'function')
    ? globals.getCanvasCornerRadius()
    : (globals.cornerRadius ?? globals.wallRadius ?? 0);
  const cr = Math.max(0, Number(cornerRadiusPx) || 0) * (DPR || 1);

  const frameBorderWidthPx = Math.max(0, (globals.frameBorderWidth ?? 0) * (DPR || 1));
  const insetPx = frameBorderWidthPx;
  const borderInset = Math.max(0, (globals.wallInset ?? 3)) * (DPR || 1);

  const innerW = Math.max(1, w - insetPx * 2);
  const innerH = Math.max(1, h - insetPx * 2);
  const innerR = Math.max(0, Math.min(cr, innerW * 0.5, innerH * 0.5));

  const isPitMode = isPitLikeMode(currentMode);
  const hx = innerW * 0.5;
  const hy = innerH * 0.5;
  const rr = innerR;

  const cx = insetPx + hx;
  const cy = insetPx + hy;
  const lx = ball.x - cx;
  const ly = ball.y - cy;
  const ax = Math.abs(lx);
  const ay = Math.abs(ly);

  const rdx = ax - (hx - rr);
  const rdy = ay - (hy - rr);
  const outsideCorner = Math.hypot(Math.max(rdx, 0), Math.max(rdy, 0));
  const insideRect = Math.min(Math.max(rdx, rdy), 0);
  const sdfDist = outsideCorner + insideRect - rr;

  let nx = 0;
  let ny = 0;
  if (rdx > 0 && rdy > 0) {
    const len = Math.hypot(rdx, rdy);
    if (len > 1e-6) {
      nx = rdx / len;
      ny = rdy / len;
    }
  } else if (rdx > rdy) {
    nx = 1;
    ny = 0;
  } else {
    nx = 0;
    ny = 1;
  }
  nx *= lx < 0 ? -1 : 1;
  ny *= ly < 0 ? -1 : 1;

  const skipForPit = isPitMode && ny < -0.5;
  const skipForBubbles = currentMode === MODES.BUBBLES && ny < -0.5;
  // Rounded portfolio bodies fit inside a circle of radius r but extend less in many directions
  // than r; using r for walls makes them “float” above the floor. Use convex hull support along
  // the same SDF normal n as for circles (max dot(vertex - center, n)).
  const usePortfolioWallExtent =
    currentMode === MODES.PORTFOLIO_PIT
    && ball.portfolioBodyShape === 'roundedRect';
  const shapeExtentAlongN = usePortfolioWallExtent
    ? getPortfolioBodyMaxExtentAlongWorldNormal(ball, nx, ny, globals)
    : effectiveRadius;
  const margin = shapeExtentAlongN + borderInset;
  const penetration = sdfDist + margin;
  if (penetration <= 0) return null;
  if (skipForPit || skipForBubbles) return null;
  return { nx, ny, penetration, effectiveRadius: shapeExtentAlongN };
}

/**
 * Snap ball center to the legal interior (frame inset + rounded corners). Used for
 * pointer-drag clamping; matches Ball.walls position resolution.
 * A few iterations cover tight corners without running the full physics step.
 */
export function clampBallPositionToWallInterior(ball, w, h) {
  for (let iter = 0; iter < 8; iter += 1) {
    const v = getInteriorWallViolation(ball, w, h);
    if (!v) return;
    ball.x -= v.nx * v.penetration;
    ball.y -= v.ny * v.penetration;
  }
}

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
    this.z = 1.0; // Z-depth for render ordering (0=back, 0.5=logo, 1=front). Default 1.0 = always on top of logo.
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
    if (this.isSleeping) {
      if (currentMode === MODES.PIT) {
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
    }

    if (this.isPointerLocked) {
      this.isSleeping = false;
      this.sleepTimer = 0;
      this.vx = 0;
      this.vy = 0;
      this.omega = 0;
      this.isGrounded = false;
      this.hasSupport = false;
      return;
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
    
    // Base drag from config (skip for WEIGHTLESS; managed separately)
    const baseDrag = currentMode === MODES.WEIGHTLESS ? 0 : FRICTION;
    
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
    // ════════════════════════════════════════════════════════════════════════════
    const MICRO_VEL_THRESHOLD = 2.0 * DPR; // px/s - below this, snap to zero
    if (Math.abs(this.vx) < MICRO_VEL_THRESHOLD) this.vx = 0;
    if (Math.abs(this.vy) < MICRO_VEL_THRESHOLD && currentMode === MODES.WEIGHTLESS) {
      // Only snap vy in weightless (gravity modes need vy to settle naturally)
      this.vy = 0;
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
    
    // Squash decay (skip for balls that should stay round)
    if (!this._noSquash) {
      const decay = Math.min(1, CONSTANTS.SQUASH_DECAY_PER_S * dt);
      this.squashAmount += (0 - this.squashAmount) * decay;
      this.squash = 1 - this.squashAmount;
    } else {
      this.squashAmount = 0;
      this.squash = 1;
    }
    
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
    const registerEffects = options.registerEffects !== false && !this._skipWallEffects;
    const globals = getGlobals();
    const { REST, MASS_BASELINE_KG, DPR } = globals;
    const rest = customRest !== undefined ? customRest : REST;
    const wobbleThreshold = globals.wallWobbleImpactThreshold ?? CONSTANTS.WALL_REST_VEL_THRESHOLD;

    let hasWallCollision = false;
    // Note: isGrounded is cleared at start of step() and re-set here if touching floor

    const violation = getInteriorWallViolation(this, w, h);
    if (violation) {
      const { nx, ny, penetration, effectiveRadius } = violation;
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
      
      // Visual squash (skip for DVD logo and other no-squash balls)
      if (!this._noSquash) {
        this.squashAmount = Math.min(globals.getSquashMax(), impact * 0.8);
        this.squashNormalAngle = Math.atan2(-ny, -nx);
      }
      
      // Sound and wobble effects
      if (registerEffects) {
        // Sound panned by x position
        const pan = this.x / Math.max(1, w);
        playCollisionSound(this.r, impact * 0.65, pan, this._soundId);
        
        // Wobble registration - use ball position for impact point
        const impactSpeedN = Math.max(0, preVn);
        // For meteors, use a lower threshold to ensure impacts register even after bouncing
        const isMeteor = this.isMeteor === true;
        const effectiveThreshold = isMeteor ? Math.max(20, wobbleThreshold * 0.3) : wobbleThreshold;
        if (!this.isSleeping && impactSpeedN >= effectiveThreshold) {
          // Impact intensity: scale by velocity and mass for dramatic effects
          // Mass multiplier: heavier balls (like meteors) create more dramatic deformation
          // Use square root of mass ratio for more natural scaling (9x mass → ~3x impact)
          const massRatio = this.m / MASS_BASELINE_KG;
          const massMultiplier = Math.max(0.5, Math.min(4.0, 0.5 + Math.sqrt(massRatio) * 0.5));
          const baseImpactN = Math.min(1, impactSpeedN / (this.r * 80));
          const impactN = Math.min(1, baseImpactN * massMultiplier);
          const contactX = this.x - nx * effectiveRadius;
          const contactY = this.y - ny * effectiveRadius;
          registerWallImpactAtPoint(contactX, contactY, impactN);
        }
        
        // Pressure registration (dampens wobble from resting contact)
        const pressureAmount = this.isSleeping ? 1.0 : Math.max(0, (wobbleThreshold - impactSpeed) / wobbleThreshold);
        if (pressureAmount > 0.1) {
          const contactX = this.x - nx * effectiveRadius;
          const contactY = this.y - ny * effectiveRadius;
          registerWallPressureAtPoint(contactX, contactY, pressureAmount);
        }
      }
    }
    
    // Wake on wall collision (prevents sleeping balls from getting stuck in walls)
    // Always wake meteors on wall collision to ensure they register impacts
    if (hasWallCollision) {
      if (this.isSleeping || this.isMeteor === true) {
        this.wake();
      }
    }
  }

  /**
   * Get effective radius considering filter size multiplier
   * @returns {number} The radius to use for rendering (physics uses this.r)
   */
  getDisplayRadius() {
    const filterSizeMul = this.filterSizeMultiplier ?? 1;
    return this.r * filterSizeMul;
  }

  draw(ctx) {
    // ══════════════════════════════════════════════════════════════════════════════
    // PERFORMANCE: Optimized draw with minimal state changes
    // - Skip save/restore when possible (expensive operations)
    // - Batch similar operations
    // - Only use transforms when necessary
    // ══════════════════════════════════════════════════════════════════════════════
    
    const hasSquash = this.squashAmount > 0.01;
    // Combine alpha with filter opacity (for legend filtering)
    const filterOpacity = this.filterOpacity ?? 1;
    const effectiveAlpha = this.alpha * filterOpacity;
    const hasAlpha = effectiveAlpha < 1.0;
    
    // Get display radius (may be scaled by legend filter)
    const displayRadius = this.getDisplayRadius();
    
    // Only use save/restore when we have transforms that need cleanup
    const needsSaveRestore = hasSquash || hasAlpha;
    
    if (needsSaveRestore) {
      ctx.save();
      
      if (hasSquash || hasAlpha) {
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
          ctx.globalAlpha = effectiveAlpha;
        }
        
        ctx.beginPath();
        ctx.arc(0, 0, displayRadius, 0, Math.PI * 2);
        ctx.fillStyle = this.color;
        ctx.fill();
      }
      
      ctx.restore();
    } else {
      // Fast path: no squash, no alpha - draw directly without save/restore
      ctx.fillStyle = this.color;
      ctx.beginPath();
      ctx.arc(this.x, this.y, displayRadius, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}
