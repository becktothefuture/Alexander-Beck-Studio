// ╔══════════════════════════════════════════════════════════════════════════════╗
// ║                          RUBBER RING WALL SYSTEM                             ║
// ║                                                                              ║
// ║  Phase 1 (visual-only):                                                      ║
// ║  - Replace 4 separate edges with ONE continuous rubber ring                  ║
// ║  - Corners are part of the same material (no breaks)                         ║
// ║  - Collisions remain rigid/rounded-rect (Ball.walls)                          ║
// ║  - Impacts/pressure still come from Ball.walls via side names                ║
// ║  - Designed for performance: fixed sample count, typed arrays, O(N)          ║
// ╚══════════════════════════════════════════════════════════════════════════════╝

import { getGlobals } from '../core/state.js';
import { WALL_PRESETS } from '../core/constants.js';

// ═══════════════════════════════════════════════════════════════════════════════
// CONSTANTS (kept small + fixed for perf)
// ═══════════════════════════════════════════════════════════════════════════════
const RING_SAMPLES = 384; // High density physics simulation for accuracy
// Rendering decimation: separate sample count for rendering vs physics
// Physics uses RING_SAMPLES (384) for accuracy, rendering uses fewer for performance
// The 5-tap smoothing filter maintains corner quality even at lower render resolution
// Performance vs Quality (render samples):
//   384 = ultra-smooth but slow (~384 lineTo() calls per frame)
//   192 = very smooth, 2x faster
//   128 = smooth corners, 3x faster - RECOMMENDED
//   96 = good corners, 4x faster
//   64 = acceptable, 6x faster
const RENDER_DECIMATION = 3; // Render samples = RING_SAMPLES / 3 = 128 points (~3x faster)
const DEFAULT_STIFFNESS = 2200;
const DEFAULT_DAMPING = 35;
const DEFAULT_MAX_DEFORM = 45; // CSS px at DPR 1
const DEFAULT_TENSION_MUL = 0.18; // Neighbor coupling relative to stiffness
const DEFAULT_RENDER_THRESHOLD_PX = 2.0; // Skip drawing micro-wobbles
// Visual test multiplier (Phase 1): exaggerate inward wall deformation without
// changing collision bounds. Set back to 1 to return to normal.
const WALL_VISUAL_TEST_DEFORM_MUL = 1.0; // normal (no exaggeration)
// Performance caps (hard limits; UI ranges can remain expressive)
const MAX_RING_IMPACTS_PER_PHYSICS_STEP = 64;
const MAX_RING_PRESSURE_EVENTS_PER_PHYSICS_STEP = 256;
const MAX_IMPACT_SIGMA = 6.0; // cap for safety if config sets extreme values
const MAX_IMPACT_SPAN_SAMPLES = 24; // caps gaussian work: 2*span+1 writes
const MAX_WALL_STEP_DT = 1 / 30; // clamp wall integration step for stability

// Pressure→stability coupling:
// In dense bottom stacks we want the wall to feel heavier and avoid rare spikes.
// We automatically attenuate impact injection and max velocity in high-pressure zones.
const PRESSURE_IMPULSE_ATTENUATION = 0.65; // 0..1
const PRESSURE_MAXVEL_ATTENUATION = 0.55;  // 0..1
const PRESSURE_ATTEN_MIN = 0.25;           // never drop below this (keeps responsiveness)

// Cached wall fill color (avoid per-frame getComputedStyle)
let CACHED_WALL_COLOR = null;

// ═══════════════════════════════════════════════════════════════════════════════
// WALL PRESETS - Moved to core/constants.js to avoid circular deps
// ═══════════════════════════════════════════════════════════════════════════════
export { WALL_PRESETS }; // Re-export for convenience if needed, but prefer direct import

/**
 * Apply a named preset to the global state
 * @param {string} presetName key in WALL_PRESETS
 * @param {object} g global state object
 */
export function applyWallPreset(presetName, g) {
  const preset = WALL_PRESETS[presetName];
  if (!preset) return;
  // Presets may be either a plain values object or a { label, description, values } record.
  const values = preset?.values ? preset.values : preset;
  Object.assign(g, values);
  g.wallPreset = presetName;
}

// ═══════════════════════════════════════════════════════════════════════════════
// RUBBER RING (1D wave + spring model around a rounded-rect perimeter)
// - Each sample stores inward deformation (CSS px at DPR 1)
// - Neighbor coupling makes the wall feel like a single continuous material
// ═══════════════════════════════════════════════════════════════════════════════
class RubberRingWall {
  constructor(sampleCount) {
    const n = Math.max(8, Math.round(sampleCount || RING_SAMPLES));
    this.n = n;
    this.deformations = new Float32Array(n);
    this.velocities = new Float32Array(n);
    this.pressure = new Float32Array(n);
    // Render-time smoothing buffer (no allocations in draw path).
    this.renderDeformations = new Float32Array(n);

    // Cached geometry (canvas px space)
    this._w = 0;
    this._h = 0;
    this._r = 0;
    this._Lt = 0;
    this._Lr = 0;
    this._La = 0;
    this._L = 0;
    this._offTop = 0;
    this._offRight = 0;
    this._offBottom = 0;
    this._offLeft = 0;
    this._offTopLeft = 0;
    this._offTopRight = 0;
    this._offBottomLeft = 0;
    this._offBottomRight = 0;

    // Per-sample geometry (canvas px space), recomputed on resize only.
    this.baseX = new Float32Array(n);
    this.baseY = new Float32Array(n);
    this.normX = new Float32Array(n);
    this.normY = new Float32Array(n);
    this.cornerMask = new Float32Array(n); // 1 on corners, 0 on straights

    this._maxDeform = 0;
    this._maxVel = 0;
    this._active = false;

    // Safety: cap total impact energy injected per physics tick
    this._energyThisStep = 0;
  }

  /**
   * Ensure this ring uses the requested sample count.
   * Reallocates typed arrays only when the count changes (not a hot-path operation).
   *
   * IMPORTANT: This preserves deformation/velocity/pressure by resampling the
   * previous arrays into the new resolution. Without this, changing sample count
   * would zero impulses and make the wall appear "stuck".
   */
  ensureSampleCount(sampleCount) {
    const target = Math.max(8, Math.round(Number(sampleCount) || RING_SAMPLES));
    if (target === this.n) return;

    const prevN = this.n;
    const prevDef = this.deformations;
    const prevVel = this.velocities;
    const prevP = this.pressure;

    const nextDef = new Float32Array(target);
    const nextVel = new Float32Array(target);
    const nextP = new Float32Array(target);
    const nextRender = new Float32Array(target);

    // Resample ring fields with wrap-around linear interpolation in index space.
    // This is stable and cheap enough because it only runs when sample count changes.
    if (prevN > 0) {
      let maxDef = 0;
      let maxVel = 0;
      for (let i = 0; i < target; i++) {
        const f = (i / target) * prevN;
        const i0 = Math.floor(f) % prevN;
        const t = f - i0;
        const i1 = (i0 + 1) % prevN;

        const d = (1 - t) * prevDef[i0] + t * prevDef[i1];
        const v = (1 - t) * prevVel[i0] + t * prevVel[i1];
        const p = (1 - t) * prevP[i0] + t * prevP[i1];

        nextDef[i] = d;
        nextVel[i] = v;
        nextP[i] = p;

        if (d > maxDef) maxDef = d;
        const vAbs = Math.abs(v);
        if (vAbs > maxVel) maxVel = vAbs;
      }
      this._maxDeform = maxDef;
      this._maxVel = maxVel;
      this._active = maxDef > 0 || maxVel > 0;
    } else {
      this._maxDeform = 0;
      this._maxVel = 0;
      this._active = false;
    }

    this.n = target;
    this.deformations = nextDef;
    this.velocities = nextVel;
    this.pressure = nextP;
    this.renderDeformations = nextRender;

    this.baseX = new Float32Array(target);
    this.baseY = new Float32Array(target);
    this.normX = new Float32Array(target);
    this.normY = new Float32Array(target);
    this.cornerMask = new Float32Array(target);

    // Invalidate cached geometry so next ensureGeometry recomputes everything.
    this._w = 0;
    this._h = 0;
    this._r = 0;
    this._Lt = 0;
    this._Lr = 0;
    this._La = 0;
    this._L = 0;
    this._offTop = 0;
    this._offRight = 0;
    this._offBottom = 0;
    this._offLeft = 0;
    this._offTopLeft = 0;
    this._offTopRight = 0;
    this._offBottomLeft = 0;
    this._offBottomRight = 0;
  }

  clearPressure() {
    this.pressure.fill(0);
  }

  reset() {
    this.deformations.fill(0);
    this.velocities.fill(0);
    this.pressure.fill(0);
    this.renderDeformations.fill(0);
    this._maxDeform = 0;
    this._maxVel = 0;
    this._active = false;
    this._energyThisStep = 0;
  }

  hasDeformation() {
    return this._maxDeform > DEFAULT_RENDER_THRESHOLD_PX;
  }

  ensureGeometry(w, h, rCanvasPx) {
    const ww = Math.max(1, w | 0);
    const hh = Math.max(1, h | 0);
    const rr = Math.max(0, Math.min(Number(rCanvasPx) || 0, Math.min(ww, hh) * 0.5));
    if (ww === this._w && hh === this._h && Math.abs(rr - this._r) < 1e-3) return;

    this._w = ww;
    this._h = hh;
    this._r = rr;

    if (rr <= 0) {
      const Lt = ww;
      const Lr = hh;
      const L = 2 * (Lt + Lr);
      this._Lt = Lt;
      this._Lr = Lr;
      this._La = 0;
      this._L = L;
      // Start at MIDDLE OF BOTTOM EDGE (least visible seam location)
      this._offBottom = 0;
      this._offRight = Lt / 2;
      this._offTop = Lt / 2 + Lr;
      this._offLeft = Lt / 2 + Lr + Lt;
      this._offTopLeft = 0;
      this._offTopRight = 0;
      this._offBottomLeft = 0;
      this._offBottomRight = 0;

      for (let i = 0; i < this.n; i++) {
        // Start at middle of bottom edge, go clockwise
        const s = ((i / this.n) * L + (Lt / 2)) % L;
        const middleX = ww / 2; // Middle of bottom edge
        if (s < Lt / 2) {
          // Bottom straight (middle -> right)
          this.baseX[i] = middleX + s; // Go from middle to right edge
          this.baseY[i] = hh;
          this.normX[i] = 0;
          this.normY[i] = -1;
        } else if (s < Lt / 2 + Lr) {
          // Right straight (bottom -> top)
          const t = s - Lt / 2;
          this.baseX[i] = ww;
          this.baseY[i] = t;
          this.normX[i] = -1;
          this.normY[i] = 0;
        } else if (s < Lt / 2 + Lr + Lt) {
          // Top straight (right -> left)
          const t = s - (Lt / 2 + Lr);
          this.baseX[i] = ww - t;
          this.baseY[i] = 0;
          this.normX[i] = 0;
          this.normY[i] = 1;
        } else if (s < Lt / 2 + Lr + Lt + Lr) {
          // Left straight (top -> bottom)
          const t = s - (Lt / 2 + Lr + Lt);
          this.baseX[i] = 0;
          this.baseY[i] = hh - t;
          this.normX[i] = 1;
          this.normY[i] = 0;
        } else {
          // Bottom straight (left half, wraps to start)
          const t = s - (Lt / 2 + Lr + Lt + Lr);
          this.baseX[i] = t; // Go from left edge (0) to middle
          this.baseY[i] = hh;
          this.normX[i] = 0;
          this.normY[i] = -1;
        }
        this.cornerMask[i] = 0;
      }
      return;
    }

    const Lt = Math.max(0, ww - 2 * rr);
    const Lr = Math.max(0, hh - 2 * rr);
    const La = 0.5 * Math.PI * rr;
    const L = 2 * (Lt + Lr) + 4 * La;
    this._Lt = Lt;
    this._Lr = Lr;
    this._La = La;
    this._L = L;
    // Offsets for new starting point: MIDDLE OF BOTTOM EDGE (least visible seam location)
    // Segment order: bottom-middle -> bottom-right arc -> right -> top-right arc -> top -> top-left arc -> left -> bottom-left arc -> back to bottom-middle
    // Start at middle of bottom edge, go clockwise
    this._offBottom = 0;                  // Start: middle of bottom straight (going right -> left)
    this._offBottomRight = Lt / 2;        // Start: bottom-right arc
    this._offRight = Lt / 2 + La;         // Start: right straight
    this._offTopRight = Lt / 2 + La + Lr; // Start: top-right arc
    this._offTop = Lt / 2 + La + Lr + La; // Start: top straight
    this._offTopLeft = Lt / 2 + La + Lr + La + Lt; // Start: top-left arc
    this._offLeft = Lt / 2 + La + Lr + La + Lt + La; // Start: left straight
    this._offBottomLeft = Lt / 2 + La + Lr + La + Lt + La + Lr; // Start: bottom-left arc
    // Bottom straight continues from bottom-left arc back to start (wraps at Lt / 2 + La + Lr + La + Lt + La + Lr + La)

    // Precompute per-sample point + inward normal.
    // Perimeter order is clockwise, starting at MIDDLE OF BOTTOM EDGE.
    // This places the seam in the middle of the bottom edge (least visible location).
    const w0 = ww;
    const h0 = hh;
    const r0 = rr;
    const n = this.n;

    // Helper function to calculate arc point
    const arcPoint = (cx, cy, radius, startAngle, endAngle, t) => {
      const angle = startAngle + (endAngle - startAngle) * t;
      const ca = Math.cos(angle);
      const sa = Math.sin(angle);
      return {
        x: cx + radius * ca,
        y: cy + radius * sa,
        nx: -ca,
        ny: -sa
      };
    };

    // Define segment boundaries (cumulative distances from start)
    const seg0_end = Lt / 2;                    // Bottom right half
    const seg1_end = seg0_end + La;            // Bottom-right arc
    const seg2_end = seg1_end + Lr;            // Right straight
    const seg3_end = seg2_end + La;            // Top-right arc
    const seg4_end = seg3_end + Lt;            // Top straight
    const seg5_end = seg4_end + La;            // Top-left arc
    const seg6_end = seg5_end + Lr;            // Left straight
    const seg7_end = seg6_end + La;            // Bottom-left arc
    // seg8_end = seg7_end + Lt/2 = L (wraps to start)

    // Key positions
    const middleX = r0 + (Lt / 2); // Middle of bottom edge = w0/2
    const rightCornerX = w0 - r0;
    const leftCornerX = r0;

    for (let i = 0; i < n; i++) {
      // Start at MIDDLE OF BOTTOM EDGE, go clockwise
      let s = ((i / n) * L + (Lt / 2)) % L;
      let x = 0, y = 0, nx = 0, ny = 0;
      let isCorner = 0;

      if (s < seg0_end) {
        // Segment 0: Bottom right half (middle -> right corner)
        x = middleX + s;
        y = h0;
        nx = 0;
        ny = -1;
      } else if (s < seg1_end) {
        // Segment 1: Bottom-right arc (bottom edge -> right edge)
        const t = (s - seg0_end) / La;
        const pt = arcPoint(w0 - r0, h0 - r0, r0, Math.PI / 2, 0, t);
        x = pt.x;
        y = pt.y;
        nx = pt.nx;
        ny = pt.ny;
        isCorner = 1;
      } else if (s < seg2_end) {
        // Segment 2: Right straight (bottom -> top)
        // After bottom-right arc ends at (w0, h0-r0), go UP to (w0, r0)
        const t = s - seg1_end;
        x = w0;
        y = (h0 - r0) - t;  // FIXED: y decreases from h0-r0 to r0
        nx = -1;
        ny = 0;
      } else if (s < seg3_end) {
        // Segment 3: Top-right arc (right edge -> top edge)
        const t = (s - seg2_end) / La;
        const pt = arcPoint(w0 - r0, r0, r0, 0, -Math.PI / 2, t);
        x = pt.x;
        y = pt.y;
        nx = pt.nx;
        ny = pt.ny;
        isCorner = 1;
      } else if (s < seg4_end) {
        // Segment 4: Top straight (right -> left)
        const t = s - seg3_end;
        x = rightCornerX - t;
        y = 0;
        nx = 0;
        ny = 1;
      } else if (s < seg5_end) {
        // Segment 5: Top-left arc (top edge -> left edge)
        // Start at (r0, 0) = top edge left point (angle = -π/2 = 3π/2)
        // End at (0, r0) = left edge top point (angle = π)
        // Going clockwise in screen coords: angle decreases from 3π/2 to π
        const t = (s - seg4_end) / La;
        const pt = arcPoint(r0, r0, r0, 3 * Math.PI / 2, Math.PI, t);  // FIXED: swapped angles
        x = pt.x;
        y = pt.y;
        nx = pt.nx;
        ny = pt.ny;
        isCorner = 1;
      } else if (s < seg6_end) {
        // Segment 6: Left straight (top -> bottom)
        // After top-left arc ends at (0, r0), go DOWN to (0, h0-r0)
        const t = s - seg5_end;
        x = 0;
        y = r0 + t;  // FIXED: y increases from r0 to h0-r0
        nx = 1;
        ny = 0;
      } else if (s < seg7_end) {
        // Segment 7: Bottom-left arc (left edge -> bottom edge)
        const t = (s - seg6_end) / La;
        const pt = arcPoint(r0, h0 - r0, r0, Math.PI, Math.PI / 2, t);
        x = pt.x;
        y = pt.y;
        nx = pt.nx;
        ny = pt.ny;
        isCorner = 1;
      } else {
        // Segment 8: Bottom left half (left corner -> middle, wraps to start)
        const t = s - seg7_end;
        x = leftCornerX + t;
        y = h0;
        nx = 0;
        ny = -1;
      }

      this.baseX[i] = x;
      this.baseY[i] = y;
      this.normX[i] = nx;
      this.normY[i] = ny;
      this.cornerMask[i] = isCorner ? 1 : 0;
    }
  }

  /**
   * Map a point in inner-wall space to ring t (0..1).
   * Used for sampling deformation AND for injecting impacts/pressure at the true contact point.
   */
  tFromPoint(x, y) {
    const w = this._w;
    const h = this._h;
    const r = this._r;
    const n = this.n;
    if (n === 0 || !(w > 0 && h > 0)) return 0;

    const innerW = w;
    const innerH = h;
    const innerR = r;

    // Check if point is in a corner region
    const inTopLeftCorner = x < innerR && y < innerR;
    const inTopRightCorner = x > innerW - innerR && y < innerR;
    const inBottomLeftCorner = x < innerR && y > innerH - innerR;
    const inBottomRightCorner = x > innerW - innerR && y > innerH - innerR;

    let t = 0;
    if (inTopLeftCorner) {
      // Top-left corner: arc goes from π to 3π/2 (bottom of left edge to top of top edge)
      // In new order: top-left arc starts at _offTopLeft
      const dx = x - innerR;
      const dy = y - innerR;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist > 0) {
        const angle = Math.atan2(dy, dx); // -π to π
        // Map angle from [π, 3π/2] to [0, 1] for corner arc
        const normalizedAngle = (angle - Math.PI) / (Math.PI / 2); // 0 to 1
        const cornerStart = this._offTopLeft / this._L;
        const cornerEnd = (this._offTopLeft + this._La) / this._L;
        t = cornerStart + Math.max(0, Math.min(1, normalizedAngle)) * (cornerEnd - cornerStart);
      } else {
        t = this._offTopLeft / this._L;
      }
    } else if (inTopRightCorner) {
      // Top-right corner: arc goes from -π/2 to 0 (top of top edge to top of right edge)
      // In new order: top-right arc starts at _offTopRight
      const dx = x - (innerW - innerR);
      const dy = y - innerR;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist > 0) {
        const angle = Math.atan2(dy, dx); // -π to π
        // Map angle from [-π/2, 0] to [0, 1]
        const normalizedAngle = (angle + Math.PI / 2) / (Math.PI / 2); // 0 to 1
        const cornerStart = this._offTopRight / this._L;
        const cornerEnd = (this._offTopRight + this._La) / this._L;
        t = cornerStart + Math.max(0, Math.min(1, normalizedAngle)) * (cornerEnd - cornerStart);
      } else {
        t = this._offTopRight / this._L;
      }
    } else if (inBottomRightCorner) {
      // Bottom-right corner: arc goes from 0 to π/2 (top of right edge to top of bottom edge)
      // In new order: bottom-right arc starts at _offBottomRight
      const dx = x - (innerW - innerR);
      const dy = y - (innerH - innerR);
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist > 0) {
        const angle = Math.atan2(dy, dx); // -π to π
        // Map angle from [0, π/2] to [0, 1]
        const normalizedAngle = angle / (Math.PI / 2); // 0 to 1
        const cornerStart = this._offBottomRight / this._L;
        const cornerEnd = (this._offBottomRight + this._La) / this._L;
        t = cornerStart + Math.max(0, Math.min(1, normalizedAngle)) * (cornerEnd - cornerStart);
      } else {
        t = this._offBottomRight / this._L;
      }
    } else if (inBottomLeftCorner) {
      // Bottom-left corner: arc goes from π/2 to π (top of bottom edge to bottom of left edge)
      // In new order: bottom-left arc starts at _offBottomLeft (wraps to 0)
      const dx = x - innerR;
      const dy = y - (innerH - innerR);
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist > 0) {
        const angle = Math.atan2(dy, dx); // -π to π
        // Map angle from [π/2, π] to [0, 1]
        const normalizedAngle = (angle - Math.PI / 2) / (Math.PI / 2); // 0 to 1
        const cornerStart = this._offBottomLeft / this._L;
        const cornerEnd = 1.0; // Wraps to start (0)
        t = cornerStart + Math.max(0, Math.min(1, normalizedAngle)) * (cornerEnd - cornerStart);
        if (t >= 1.0) t = t - 1.0; // Wrap around
      } else {
        t = this._offBottomLeft / this._L;
      }
    } else {
      // On a straight edge
      if (y < innerR) {
        // Top edge (left -> right)
        const s = Math.max(0, Math.min(this._Lt, x - innerR));
        t = (this._offTop + s) / this._L;
      } else if (x > innerW - innerR) {
        // Right edge (bottom -> top)
        const s = Math.max(0, Math.min(this._Lr, y - innerR));
        t = (this._offRight + s) / this._L;
      } else if (y > innerH - innerR) {
        // Bottom edge - split in half with seam in middle
        // Bottom edge goes: middle (start) -> right -> right corner -> left corner -> left -> middle (wrap)
        const xFromRight = (innerW - innerR) - x;
        if (xFromRight <= this._Lt / 2) {
          // Right half of bottom edge (from middle to right corner)
          const s = this._Lt / 2 - xFromRight;
          t = (this._offBottom + s) / this._L;
        } else {
          // Left half of bottom edge (from left corner to middle, wraps to start)
          // After bottom-left arc, we're at _offBottomLeft + La
          // Then we go left -> middle, which is the remaining Lt/2
          const xFromLeft = x - innerR;
          const s = this._Lt / 2 + (this._Lt / 2 - xFromLeft);
          t = (this._offBottom + s) / this._L;
          if (t >= 1.0) t = t - 1.0; // Wrap around
        }
      } else if (x < innerR) {
        // Left edge (top -> bottom)
        const s = Math.max(0, Math.min(this._Lr, (innerH - innerR) - y));
        t = (this._offLeft + s) / this._L;
      }
    }

    return ((t % 1 + 1) % 1);
  }

  /**
   * Get deformation at a specific x,y position (inner-wall space).
   * Returns the inward deformation amount in CSS px (authored at DPR 1).
   */
  getDeformationAtPoint(x, y) {
    const n = this.n;
    if (n === 0) return 0;
    const t = this.tFromPoint(x, y);

    // Interpolate deformation at this t value
    const idx = t * n;
    const i0 = Math.floor(idx) % n;
    const i1 = (i0 + 1) % n;
    const frac = idx - i0;
    const def0 = this.deformations[i0];
    const def1 = this.deformations[i1];
    return (1 - frac) * def0 + frac * def1;
  }

  /**
   * Inject an impact at a point (inner-wall space).
   */
  impactAtPoint(x, y, intensity) {
    const t = this.tFromPoint(x, y);
    this.impactAtT(t, intensity);
  }

  /**
   * Add pressure at a point (inner-wall space).
   */
  addPressureAtPoint(x, y, amount, options = {}) {
    const t = this.tFromPoint(x, y);
    this.addPressureAtT(t, amount, options);
  }

  /**
   * Map a side + normalized position to ring t (0..1).
   * This is intentionally cheap: piecewise linear on straight spans.
   * Corners still participate via neighbor coupling (continuous ring).
   */
  tFromWall(wall, normalizedPos) {
    const w = this._w;
    const h = this._h;
    const r = this._r;
    const Lt = this._Lt;
    const Lr = this._Lr;
    const L = this._L;
    if (!(L > 0)) return 0;

    const p = Math.max(0, Math.min(1, Number(normalizedPos) || 0));

    if (wall === 'top') {
      const x = p * w;
      const s = Math.max(0, Math.min(Lt, x - r));
      return (this._offTop + s) / L;
    }
    if (wall === 'right') {
      const y = p * h;
      const s = Math.max(0, Math.min(Lr, y - r));
      return (this._offRight + s) / L;
    }
    if (wall === 'bottom') {
      const x = p * w;
      const s = Math.max(0, Math.min(Lt, (w - r) - x));
      return (this._offBottom + s) / L;
    }
    if (wall === 'left') {
      const y = p * h;
      const s = Math.max(0, Math.min(Lr, (h - r) - y));
      return (this._offLeft + s) / L;
    }
    return 0;
  }

  impactAtT(t, intensity) {
    const g = getGlobals();
    const n = this.n;
    if (n <= 0) return;
    const maxDeform = Math.max(0, g.wallWobbleMaxDeform ?? DEFAULT_MAX_DEFORM);
    const impulse = maxDeform * Math.max(0, Math.min(1, Number(intensity) || 0));
    if (!(impulse > 0)) return;

    const sigma = Math.max(0.25, Math.min(MAX_IMPACT_SIGMA, g.wallWobbleSigma ?? 2.0));
    const idx = ((Number(t) || 0) % 1 + 1) % 1 * n;

    // Stabilizers:
    // - clamp per-sample impulse injection (prevents huge spikes when many impacts stack)
    // - clamp absolute velocity (prevents erratic overshoot and deformation "slamming" maxDeform)
    const maxImpulse = Math.max(0, Number(g.wallWobbleMaxImpulse ?? 220) || 0); // deform-vel units
    const maxVelClamp = Math.max(0, Number(g.wallWobbleMaxVel ?? 800) || 0);     // deform-vel units
    const maxEnergy = Math.max(0, Number(g.wallWobbleMaxEnergyPerStep ?? 20000) || 0);

    // Only touch a local window (perf): 3σ contains ~99.7% of gaussian energy.
    const span = Math.max(2, Math.min(n, Math.min(MAX_IMPACT_SPAN_SAMPLES, Math.ceil(sigma * 3))));
    for (let k = -span; k <= span; k++) {
      const i = ((Math.round(idx) + k) % n + n) % n;
      const dist = Math.abs(idx - i);
      const d = Math.min(dist, n - dist);
      const falloff = Math.exp(-(d * d) / (2 * sigma * sigma));
      let add = impulse * falloff;
      if (maxImpulse > 0 && add > maxImpulse) add = maxImpulse;

      // Heavier goo under load: attenuate injection where pressure is high.
      // (Pressure is 0..1; higher means more balls resting here.)
      const p = this.pressure[i] || 0;
      if (p > 0) {
        const atten = Math.max(PRESSURE_ATTEN_MIN, 1 - p * PRESSURE_IMPULSE_ATTENUATION);
        add *= atten;
      }
      // Energy budget: once we hit a per-tick budget, stop injecting.
      if (maxEnergy > 0) {
        const remaining = maxEnergy - this._energyThisStep;
        if (remaining <= 0) break;
        if (add > remaining) add = remaining;
      }
      let v = this.velocities[i] + add;
      if (maxVelClamp > 0) {
        // Under pressure, reduce the velocity cap further (prevents bottom spikes).
        const p = this.pressure[i] || 0;
        const localClamp = p > 0
          ? (maxVelClamp * Math.max(PRESSURE_ATTEN_MIN, 1 - p * PRESSURE_MAXVEL_ATTENUATION))
          : maxVelClamp;
        if (v > localClamp) v = localClamp;
        else if (v < -localClamp) v = -localClamp;
      }
      this.velocities[i] = v;
      if (maxEnergy > 0) this._energyThisStep += Math.abs(add);
    }
    this._active = true;
  }

  addPressureAtT(t, amount, options = {}) {
    const n = this.n;
    if (n <= 0) return;
    const a = Math.max(0, Math.min(1, Number(amount) || 0));
    if (!(a > 0)) return;

    const idx = ((Number(t) || 0) % 1 + 1) % 1 * n;
    const center = Math.round(idx) % n;

    // Simple local pressure spread (linear falloff).
    const spread = options.fast ? 1 : 3;
    for (let k = -spread; k <= spread; k++) {
      const i = ((center + k) % n + n) % n;
      const falloff = Math.max(0, 1 - Math.abs(k) / (spread + 1));
      const next = this.pressure[i] + a * falloff;
      this.pressure[i] = next > 1 ? 1 : next;
    }
    this._active = true;
  }

  step(dt) {
    const g = getGlobals();
    const n = this.n;
    if (n <= 0) return;

    const dtSafe = Math.min(MAX_WALL_STEP_DT, Math.max(0, Number(dt) || 0));
    if (!(dtSafe > 0)) return;

    // When inactive, apply strong restoring force to pull wall back to perfect rounded rectangle
    if (!this._active) {
      let hasAnyDeform = false;
      const RESTORE_FORCE = 200.0; // Much stronger restoring force when inactive
      const TOP_EDGE_BOOST = 3.0; // Extra boost for top edge to prevent sagging
      const TOP_LEFT_BOOST = 5.0; // Extra boost specifically for top-left corner (wrap-around point)
      
      for (let i = 0; i < n; i++) {
        if (this.deformations[i] > 0.001 || Math.abs(this.velocities[i]) > 0.001) {
          hasAnyDeform = true;
          
          // Identify if this is a top edge sample (y = 0, not a corner)
          // Use a more lenient threshold to catch all top edge samples, including near corners
          const isTopEdge = this.baseY[i] < 1.0 && !this.cornerMask[i] && this.normY[i] > 0.7;
          // Also check if sample is near top corners - treat them like top edge for restoring force
          // Be more lenient for top-left corner area
          const nearTopLeftCorner = !this.cornerMask[i] && this.baseX[i] < this._r + 2.0 && this.baseY[i] < this._r + 2.0;
          const nearTopRightCorner = !this.cornerMask[i] && this.baseX[i] > this._w - this._r - 1.0 && this.baseY[i] < this._r + 1.0;
          const isNearTopCorner = nearTopLeftCorner || nearTopRightCorner;
          // Check if this IS a top corner sample (actual corner arc, not just nearby)
          // Use position-based detection for reliability - be more lenient for top-left corner
          const isTopLeftCorner = this.cornerMask[i] && this.baseX[i] < this._r + 3.0 && this.baseY[i] < this._r + 3.0;
          const isTopRightCorner = this.cornerMask[i] && this.baseX[i] > this._w - this._r - 2.0 && this.baseY[i] < this._r + 2.0;
          const isTopCorner = isTopLeftCorner || isTopRightCorner;
          
          // Top-left corner gets extra boost (it's at wrap-around point, needs more help)
          const forceMultiplier = isTopLeftCorner || nearTopLeftCorner 
            ? RESTORE_FORCE * TOP_EDGE_BOOST * TOP_LEFT_BOOST 
            : ((isTopEdge || isNearTopCorner || isTopCorner) ? RESTORE_FORCE * TOP_EDGE_BOOST : RESTORE_FORCE);
          
          // Strong restoring force: pull deformation to zero
          const restoreAccel = -forceMultiplier * this.deformations[i] - 20.0 * this.velocities[i];
          this.velocities[i] += restoreAccel * dtSafe;
          this.deformations[i] += this.velocities[i] * dtSafe;
          
          // Clamp to [-maxDeform, +maxDeform] range (allow outward bulge)
          const maxDeform = Math.max(0, g.wallWobbleMaxDeform ?? DEFAULT_MAX_DEFORM);
          if (this.deformations[i] < -maxDeform) {
            this.deformations[i] = -maxDeform;
            this.velocities[i] = 0;
          } else if (this.deformations[i] > maxDeform) {
            this.deformations[i] = maxDeform;
            this.velocities[i] = 0;
          }
          
          // Aggressive snap to zero (especially for top edge and top corners)
          const isTopArea = isTopEdge || isNearTopCorner || isTopCorner;
          // Top-left corner gets even more aggressive snap
          const isTopLeftArea = isTopLeftCorner || nearTopLeftCorner;
          const snapThreshold = isTopLeftArea ? 0.01 : (isTopArea ? 0.02 : 0.1); // Most aggressive for top-left
          const velThreshold = isTopLeftArea ? 0.2 : (isTopArea ? 0.3 : 1.0); // Lower velocity threshold for top-left
          if (this.deformations[i] < snapThreshold && Math.abs(this.velocities[i]) < velThreshold) {
            this.deformations[i] = 0;
            this.velocities[i] = 0;
          }
        }
      }
      // Update active state
      this._active = hasAnyDeform;
      if (!hasAnyDeform) {
        this._maxDeform = 0;
        this._maxVel = 0;
      }
      return;
    }

    const stiffnessBase = Math.max(1, g.wallWobbleStiffness ?? DEFAULT_STIFFNESS);
    const baseDamping = Math.max(0, g.wallWobbleDamping ?? DEFAULT_DAMPING);
    const maxDeform = Math.max(0, g.wallWobbleMaxDeform ?? DEFAULT_MAX_DEFORM);
    const maxVelClamp = Math.max(0, Number(g.wallWobbleMaxVel ?? 800) || 0); // deform-vel units

    // Corner "stickiness" now acts as corner stiffness boost (continuous, no hard pins).
    const cornerClamp = Math.max(0, Math.min(1, Number(g.wallWobbleCornerClamp) || 0));
    const cornerStiffMul = 1 + 5.0 * cornerClamp;

    // Neighbor coupling/tension: makes impacts behave like a single ring.
    const tension = stiffnessBase * DEFAULT_TENSION_MUL;

    // Settling speed (0-100): controls snap thresholds + pressure damping.
    const settlingSpeed = Math.max(0, Math.min(100, g.wallWobbleSettlingSpeed ?? 50));
    const settleFactor = settlingSpeed / 100;
    const pressureDampingMult = 5.0 + (30.0 * settleFactor);
    const snapScale = 0.5 + (1.5 * settleFactor);

    let maxDef = 0;
    let maxVel = 0;

    // Semi-implicit Euler with Laplacian coupling.
    for (let i = 0; i < n; i++) {
      const prev = i === 0 ? (n - 1) : (i - 1);
      const next = i === (n - 1) ? 0 : (i + 1);

      const def = this.deformations[i];
      const vel = this.velocities[i];

      // Local stiffness boost on corner samples (keeps the classic "stable corners" feel).
      // For straight edges: much stronger base stiffness to prevent sagging and maintain robust rounded rectangle.
      const isCorner = this.cornerMask[i] ? 1 : 0;
      // Identify top edge specifically for extra stiffness (including samples near top corners)
      // Use a more lenient threshold to catch all top edge samples, including near corners
      // Check both by Y position and normal direction to catch edge cases
      const isTopEdge = !isCorner && this.baseY[i] < 1.0 && this.normY[i] > 0.7;
      // Also check if sample is near top corners (within corner radius) - treat them like top edge
      // Be more lenient for top-left corner area
      const nearTopLeftCorner = !isCorner && this.baseX[i] < this._r + 2.0 && this.baseY[i] < this._r + 2.0;
      const nearTopRightCorner = !isCorner && this.baseX[i] > this._w - this._r - 1.0 && this.baseY[i] < this._r + 1.0;
      const isNearTopCorner = nearTopLeftCorner || nearTopRightCorner;
      // Check if this IS a top corner sample (actual corner arc)
      // Use position-based detection for reliability - be more lenient for top-left corner
      // Top-left corner: near (r, r) with Y < r+3 (more lenient since it's on arc)
      // Top-right corner: near (w-r, r) with Y < r+2
      const isTopLeftCorner = isCorner && this.baseX[i] < this._r + 3.0 && this.baseY[i] < this._r + 3.0;
      const isTopRightCorner = isCorner && this.baseX[i] > this._w - this._r - 2.0 && this.baseY[i] < this._r + 2.0;
      const isTopCorner = isTopLeftCorner || isTopRightCorner;
      // Top corners get extra stiffness boost (on top of corner multiplier) to match top edge robustness
      // Top-left corner gets even more boost since it's at wrap-around point
      const topCornerStiffBoost = isTopLeftCorner ? 3.0 : (isTopRightCorner ? 2.0 : 1.0);
      // Top edge (including near corners) gets 4x stiffness, other straight edges get 2x, corners get corner multiplier
      const straightEdgeStiffMul = isCorner ? topCornerStiffBoost : ((isTopEdge || isNearTopCorner) ? 4.0 : 2.0);
      const kLocal = stiffnessBase * (isCorner ? (cornerStiffMul * topCornerStiffBoost) : straightEdgeStiffMul);

      // Progressive damping: higher at low amplitude to kill micro-jitter.
      const defAbs = Math.abs(def);
      const velAbs = Math.abs(vel);

      const amplitudeFactor = Math.max(0, Math.min(1, 1 - defAbs / 20));
      const progressiveDamping = baseDamping * (1 + amplitudeFactor * 1.0);

      // Pressure adds friction (resting balls damp the ring).
      const pressure = this.pressure[i];
      const pressureDamping = progressiveDamping * (1 + pressure * pressureDampingMult);

      // Approximate critical damping cap (include tension influence).
      const critical = 2 * Math.sqrt(kLocal + 2 * tension);
      const effectiveDamping = Math.min(pressureDamping, critical * 0.95);

      // Laplacian (neighbor coupling) promotes smooth, continuous waves.
      const lap = (this.deformations[prev] + this.deformations[next] - 2 * def);
      const force = -kLocal * def + (tension * lap) - effectiveDamping * vel;

      let vNext = vel + force * dtSafe;
      if (maxVelClamp > 0) {
        // Under pressure, reduce max velocity (heavier goo / less jitter in stacks).
        const p = this.pressure[i] || 0;
        const localClamp = p > 0
          ? (maxVelClamp * Math.max(PRESSURE_ATTEN_MIN, 1 - p * PRESSURE_MAXVEL_ATTENUATION))
          : maxVelClamp;
        if (vNext > localClamp) vNext = localClamp;
        else if (vNext < -localClamp) vNext = -localClamp;
      }
      let dNext = def + vNext * dtSafe;

      // Clamp deformation: allow outward bulge (negative) for realistic bounce-back
      // Range: -maxDeform (outward bulge) to +maxDeform (inward dent)
      let clampedLow = false;
      let clampedHigh = false;
      if (dNext < -maxDeform) { dNext = -maxDeform; clampedLow = true; }
      if (dNext > maxDeform) { dNext = maxDeform; clampedHigh = true; }

      // Stability: prevent "bouncing" against hard deformation clamps.
      // If we are clamped and velocity is still pushing further into the clamp,
      // zero that component so the wall settles instead of jittering.
      if (clampedLow && vNext < 0) vNext = 0;
      if (clampedHigh && vNext > 0) vNext = 0;

      // Snap-to-zero thresholds (scaled by pressure + settling).
      // Much more aggressive snap-to-zero for straight edges, especially top edge.
      const isStraightEdge = !this.cornerMask[i];
      // Recompute isTopEdge here with same logic as above for consistency
      const isTopEdgeSnap = !isCorner && this.baseY[i] < 1.0 && this.normY[i] > 0.7;
      // Also check if sample is near top corners - treat them like top edge
      // Be more lenient for top-left corner area
      const nearTopLeftCornerSnap = !isCorner && this.baseX[i] < this._r + 2.0 && this.baseY[i] < this._r + 2.0;
      const nearTopRightCornerSnap = !isCorner && this.baseX[i] > this._w - this._r - 1.0 && this.baseY[i] < this._r + 1.0;
      const isNearTopCornerSnap = nearTopLeftCornerSnap || nearTopRightCornerSnap;
      // Check if this IS a top corner sample (actual corner arc)
      // Use position-based detection for reliability - be more lenient for top-left corner
      const isTopLeftCornerSnap = isCorner && this.baseX[i] < this._r + 3.0 && this.baseY[i] < this._r + 3.0;
      const isTopRightCornerSnap = isCorner && this.baseX[i] > this._w - this._r - 2.0 && this.baseY[i] < this._r + 2.0;
      const isTopCornerSnap = isTopLeftCornerSnap || isTopRightCornerSnap;
      // Top edge and top corners (including nearby samples) get 5x boost, other straight edges get 3x, other corners get 1x
      const straightEdgeSnapBoost = (isTopEdgeSnap || isNearTopCornerSnap || isTopCornerSnap) ? 5.0 : (isStraightEdge ? 3.0 : 1.0);
      const baseDeformThresh = pressure > 0.5 ? 0.3 : (pressure > 0.1 ? 0.8 : 2.0);
      const baseVelThresh = pressure > 0.5 ? 0.5 : (pressure > 0.1 ? 3.0 : 10.0);
      const deformThresh = baseDeformThresh * snapScale * straightEdgeSnapBoost;
      const velThresh = baseVelThresh * snapScale * straightEdgeSnapBoost;
      if (Math.abs(dNext) < deformThresh && velAbs < velThresh) {
        this.deformations[i] = 0;
        this.velocities[i] = 0;
      } else {
        this.deformations[i] = dNext;
        this.velocities[i] = vNext;
      }

      if (this.deformations[i] > maxDef) maxDef = this.deformations[i];
      const vAbsNext = Math.abs(this.velocities[i]);
      if (vAbsNext > maxVel) maxVel = vAbsNext;
    }

    // Hard failsafe: if anything becomes non-finite, reset immediately.
    // This prevents rare NaN/Infinity cascades from producing visual explosions.
    if (!Number.isFinite(maxDef) || !Number.isFinite(maxVel)) {
      this.reset();
      return;
    }

    this._maxDeform = maxDef;
    this._maxVel = maxVel;
    this._active = maxDef > 0 || maxVel > 0;
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// WALL STATE SINGLETON
// ═══════════════════════════════════════════════════════════════════════════════
export const wallState = {
  // Two-ring strategy:
  // - ringPhysics: high sample count for accurate integration/impulses
  // - ringRender: decimated sample count for fast geometry/path building
  ringPhysics: new RubberRingWall(RING_SAMPLES),
  ringRender: new RubberRingWall(Math.max(8, Math.floor(RING_SAMPLES / RENDER_DECIMATION))),
  _impactsThisStep: 0,
  _pressureEventsThisStep: 0,
  
  // Tier 1: Physics update frequency decoupling
  _physicsUpdateInterval: 1/30, // 30Hz physics (configurable, default 30fps)
  _physicsAccumulator: 0,
  _interpolationAlpha: 0, // 0-1 for lerp between states
  _prevDeformations: null, // Previous state for interpolation

  // Render cache (perf): avoid remapping+filtering every render frame.
  // We update these only on wall physics ticks, then linearly interpolate per-frame.
  _renderSmPrev: null,
  _renderSmCurr: null,
  _renderMapTmp: null,
  
  /**
   * Reset per-physics-step budgets/counters.
   * IMPORTANT: Do NOT clear `pressure` here — pressure is meant to accumulate
   * across the render-frame so the wall can settle under load.
   */
  resetStepBudgets() {
    this._impactsThisStep = 0;
    this._pressureEventsThisStep = 0;
    // Reset energy budget accumulator for this physics tick.
    this.ringPhysics._energyThisStep = 0;
  },

  /**
   * Clear accumulated pressure (call once per render-frame).
   */
  clearPressureFrame() {
    this.ringPhysics.clearPressure();
  },
  
  /**
   * Update all wall physics
   * Tier 1: Runs at lower frequency (default 30Hz) with interpolation for smooth visuals
   */
  step(dt) {
    const g = getGlobals();

    // Tier 2: Adaptive sample count (stability rule)
    // Only change sample count on "physics ticks" (when we are about to integrate),
    // not every render-frame. This prevents visual thrash and reduces path artifacts.
    const enableAdaptive = g.wallPhysicsAdaptiveSamples !== false;
    const minSamples = Math.max(8, Math.min(48, Math.round(Number(g.wallPhysicsMinSamples ?? 24) || 24)));
    const maxSamples = Math.min(RING_SAMPLES, Math.round(Number(g.wallPhysicsSamples ?? RING_SAMPLES) || RING_SAMPLES));

    // Optional: skip stepping when inactive (ring.step already has a cheap early return).
    // BUT: always run step() to allow restoring force to maintain perfect rounded rectangle shape
    // The ring.step() will handle the inactive case with strong restoring force
    if (g.wallPhysicsSkipInactive !== false && !this.ringPhysics._active) {
      // Still run step() to allow restoring force to work, but skip expensive interpolation updates
      this.ringPhysics.step(dt);
      this.ringRender.step(dt);
      this._interpolationAlpha = 1.0;
      return;
    }

    // Tier 1: Decouple physics update frequency from render frequency
    const updateHz = Math.max(10, Math.min(60, Number(g.wallPhysicsUpdateHz ?? 30) || 30));
    const updateInterval = 1 / updateHz;
    const enableInterpolation = g.wallPhysicsInterpolation !== false;

    this._physicsAccumulator += dt;

    // Only run physics when accumulator reaches update interval
    if (this._physicsAccumulator >= updateInterval) {
      // Tier 2: choose target sample count ONLY on physics ticks
      if (enableAdaptive) {
        const currentSamples = this.ringPhysics.n;
        let desiredSamples = currentSamples;

        if (!this.ringPhysics._active) {
          desiredSamples = Math.max(minSamples, Math.min(maxSamples, currentSamples - 1));
        } else {
          // Use last-step maxima to decide if we can downshift quality
          const maxDeform = this.ringPhysics._maxDeform || 0;
          const maxVel = this.ringPhysics._maxVel || 0;
          if (maxDeform < 5.0 && maxVel < 2.0) {
            desiredSamples = Math.max(minSamples, Math.min(maxSamples, currentSamples - 1));
          } else {
            desiredSamples = Math.min(maxSamples, Math.max(minSamples, currentSamples + 1));
          }
        }

        if (desiredSamples !== currentSamples) {
          this.ringPhysics.ensureSampleCount(desiredSamples);
        }
      } else {
        // Fixed sample count (no adaptive)
        const fixedSamples = Math.max(8, Math.min(RING_SAMPLES, maxSamples));
        if (this.ringPhysics.n !== fixedSamples) this.ringPhysics.ensureSampleCount(fixedSamples);
      }

      // Store previous state for interpolation BEFORE running physics (only if interpolation enabled)
      if (enableInterpolation && this.ringPhysics.n > 0) {
        const n = this.ringPhysics.n;
        if (!this._prevDeformations || this._prevDeformations.length !== n) {
          // Allocate arrays on first use or when sample count changes
          this._prevDeformations = new Float32Array(n);
          // Initialize with current state on first allocation (so interpolation works from the start)
          this._prevDeformations.set(this.ringPhysics.deformations);
        } else {
          // Copy current deformation state to previous (geometry doesn't change between physics steps)
          this._prevDeformations.set(this.ringPhysics.deformations);
        }
      }

      // Use exactly one interval for physics, keep remainder in accumulator
      let remaining = updateInterval;
      this._physicsAccumulator -= updateInterval; // Keep remainder

      // Stability: substep wall integration so we never integrate with a large dt.
      // This prevents "big dt" overshoot when Tier 1 lowers update cadence.
      const maxSubHz = Math.max(30, Math.min(240, Number(g.wallPhysicsMaxSubstepHz ?? 60) || 60));
      const maxSubDt = 1 / maxSubHz;
      let steps = 0;
      const maxSteps = 6; // hard safety cap (prevents runaway loops)

      while (remaining > 1e-6 && steps < maxSteps) {
        const dtStep = remaining > maxSubDt ? maxSubDt : remaining;
        this.ringPhysics.step(dtStep);
        remaining -= dtStep;
        steps++;
      }

      // PERF: update render smoothing cache only on physics ticks.
      // This replaces per-frame remap+low-pass cost inside drawWalls().
      try {
        const ringPhysics = this.ringPhysics;
        const ringRender = this.ringRender;
        const nPhys = ringPhysics.n | 0;
        const nR = ringRender.n | 0;
        if (nPhys > 0 && nR > 0) {
          if (!this._renderSmPrev || this._renderSmPrev.length !== nR) {
            this._renderSmPrev = new Float32Array(nR);
            this._renderSmCurr = new Float32Array(nR);
            this._renderMapTmp = new Float32Array(nR);
            // Initialize prev/curr as zero.
          } else {
            this._renderSmPrev.set(this._renderSmCurr);
          }

          const srcPhys = ringPhysics.deformations;
          const tmp = this._renderMapTmp;
          const curr = this._renderSmCurr;

          // Map physics samples -> render samples (linear interpolation in ring parameter space)
          for (let i = 0; i < nR; i++) {
            const f = (i / nR) * nPhys;
            const i0 = Math.floor(f) % nPhys;
            const t = f - i0;
            const i1 = (i0 + 1) % nPhys;
            tmp[i] = (1 - t) * srcPhys[i0] + t * srcPhys[i1];
          }

          // 5-tap low-pass around the ring (wrap-around).
          // Kernel: [1, 4, 6, 4, 1] / 16
          for (let i = 0; i < nR; i++) {
            const m2 = (i - 2 + nR) % nR;
            const m1 = (i - 1 + nR) % nR;
            const p1 = (i + 1) % nR;
            const p2 = (i + 2) % nR;
            curr[i] = (tmp[m2] + 4 * tmp[m1] + 6 * tmp[i] + 4 * tmp[p1] + tmp[p2]) * (1 / 16);
          }
        }
      } catch (e) {}

      // Calculate interpolation alpha based on remainder
      if (enableInterpolation) {
        this._interpolationAlpha = Math.max(0, Math.min(1, this._physicsAccumulator / updateInterval));
      } else {
        this._interpolationAlpha = 1.0; // No interpolation: use current state
      }
    } else {
      // Between physics updates: calculate interpolation alpha for smooth rendering
      if (enableInterpolation) {
        this._interpolationAlpha = Math.max(0, Math.min(1, this._physicsAccumulator / updateInterval));
      } else {
        this._interpolationAlpha = 1.0; // No interpolation: use current state
      }
    }
  },
  
  reset() {
    this.ringPhysics.reset();
    this.ringRender.reset();
    this._physicsAccumulator = 0;
    this._interpolationAlpha = 0;
    this._prevDeformations = null;
    this._renderSmPrev = null;
    this._renderSmCurr = null;
    this._renderMapTmp = null;
  },
  
  hasAnyDeformation() {
    return this.ringPhysics.hasDeformation();
  },

  /**
   * Get wall deformation at a specific point (canvas px coordinates).
   * Returns deformation in canvas pixels (scaled by DPR).
   * Used by ball collision to adjust boundaries dynamically.
   */
  getDeformationAtPoint(x, y) {
    const ring = this.ringPhysics;
    if (!ring || ring.n === 0) return 0;
    const g = getGlobals();
    const canvas = g.canvas;
    if (!canvas) return 0;
    
    // Convert canvas coordinates to inner wall coordinates.
    // Must match drawWalls(): inset = wallThickness * DPR.
    const DPR = g.DPR || 1;
    const wallThicknessPx = Math.max(0, (Number(g.wallThickness) || 0) * DPR);
    const insetPx = wallThicknessPx;
    const innerX = x - insetPx;
    const innerY = y - insetPx;
    
    // IMPORTANT UNIT NOTE:
    // `RubberRingWall.deformations[]` are authored/stepped in CSS px @ DPR=1
    // (see wallWobbleMaxDeform in state/config). Rendering scales by DPR.
    // Collisions operate in canvas px, so we scale the sampled deformation by DPR here.
    const dCssPx = ring.getDeformationAtPoint(innerX, innerY);
    return (dCssPx > 0) ? (dCssPx * DPR) : 0;
  }
};

// ═══════════════════════════════════════════════════════════════════════════════
// IMPACT REGISTRATION
// Called from Ball.walls() - collisions remain rigid; this is VISUAL only.
// ═══════════════════════════════════════════════════════════════════════════════
export function registerWallImpact(wall, normalizedPos, intensity) {
  if (!wall || wall.startsWith('corner')) return;
  if (wall !== 'top' && wall !== 'bottom' && wall !== 'left' && wall !== 'right') return;

  const g = getGlobals();
  const canvas = g.canvas;
  if (!canvas) return;

  const rCssPx = (typeof g.getCanvasCornerRadius === 'function')
    ? g.getCanvasCornerRadius()
    : (g.cornerRadius ?? g.wallRadius ?? 0);
  const rCanvasPx = Math.max(0, (Number(rCssPx) || 0) * (g.DPR || 1));

  // Ensure geometry matches drawWalls() / Ball.walls():
  // inner dims are inset by wallThickness only, radius is clamped to inner dims.
  const DPR = g.DPR || 1;
  const wallThicknessPx = Math.max(0, (Number(g.wallThickness) || 0) * DPR);
  const insetPx = wallThicknessPx;
  const innerW = Math.max(1, canvas.width - insetPx * 2);
  const innerH = Math.max(1, canvas.height - insetPx * 2);
  const innerR = Math.max(0, Math.min(rCanvasPx, innerW * 0.5, innerH * 0.5));
  wallState.ringPhysics.ensureGeometry(innerW, innerH, innerR);
  // Preserve the "stable corners" look from the previous edge-based system:
  // impacts are clamped away from corners (parameterized by wallWobbleCornerClamp).
  const clamp = Math.max(0, Math.min(0.45, Number(g.wallWobbleCornerClamp) || 0));
  const pos = Math.max(clamp, Math.min(1 - clamp, Number(normalizedPos) || 0));
  const t = wallState.ringPhysics.tFromWall(wall, pos);

  // Cap work in pathological cases (tons of impacts in a single physics step).
  if (wallState._impactsThisStep < MAX_RING_IMPACTS_PER_PHYSICS_STEP) {
    wallState.ringPhysics.impactAtT(t, intensity);
  } else {
    // Cheap fallback: keep responsiveness without the gaussian loop.
    const n = wallState.ringPhysics.n;
    if (n > 0) {
      const idx = ((Number(t) || 0) % 1 + 1) % 1 * n;
      const i = Math.round(idx) % n;
      const maxDeform = Math.max(0, g.wallWobbleMaxDeform ?? DEFAULT_MAX_DEFORM);
      const impulse = maxDeform * Math.max(0, Math.min(1, Number(intensity) || 0));
      wallState.ringPhysics.velocities[i] += impulse;
      wallState.ringPhysics._active = true;
    }
  }
  wallState._impactsThisStep++;
}

/**
 * Register an impact by contact point (canvas px space).
 * This is preferred for SDF collisions because it correctly drives corners/arcs.
 */
export function registerWallImpactAtPoint(x, y, intensity) {
  const g = getGlobals();
  const canvas = g.canvas;
  if (!canvas) return;

  const rCssPx = (typeof g.getCanvasCornerRadius === 'function')
    ? g.getCanvasCornerRadius()
    : (g.cornerRadius ?? g.wallRadius ?? 0);
  const rCanvasPx = Math.max(0, (Number(rCssPx) || 0) * (g.DPR || 1));

  // Ensure geometry matches drawWalls() / Ball.walls():
  // inner dims are inset by wallThickness only, radius is clamped to inner dims.
  const DPR = g.DPR || 1;
  const wallThicknessPx = Math.max(0, (Number(g.wallThickness) || 0) * DPR);
  const insetPx = wallThicknessPx;
  const innerW = Math.max(1, canvas.width - insetPx * 2);
  const innerH = Math.max(1, canvas.height - insetPx * 2);
  const innerR = Math.max(0, Math.min(rCanvasPx, innerW * 0.5, innerH * 0.5));
  wallState.ringPhysics.ensureGeometry(innerW, innerH, innerR);

  const ix = x - insetPx;
  const iy = y - insetPx;

  // Cap work in pathological cases (tons of impacts in a single physics step).
  if (wallState._impactsThisStep < MAX_RING_IMPACTS_PER_PHYSICS_STEP) {
    wallState.ringPhysics.impactAtPoint(ix, iy, intensity);
  } else {
    // Cheap fallback: keep responsiveness without the gaussian loop.
    const n = wallState.ringPhysics.n;
    if (n > 0) {
      const t = wallState.ringPhysics.tFromPoint(ix, iy);
      const idx = ((Number(t) || 0) % 1 + 1) % 1 * n;
      const i = Math.round(idx) % n;
      const maxDeform = Math.max(0, g.wallWobbleMaxDeform ?? DEFAULT_MAX_DEFORM);
      const impulse = maxDeform * Math.max(0, Math.min(1, Number(intensity) || 0));
      wallState.ringPhysics.velocities[i] += impulse;
      wallState.ringPhysics._active = true;
    }
  }

  wallState._impactsThisStep++;
}

/**
 * Register resting pressure (balls touching wall but not impacting)
 * This applies extra damping to stop wobble when balls settle
 */
export function registerWallPressure(wall, normalizedPos, amount = 1.0) {
  if (!wall || wall.startsWith('corner')) return;
  if (wall !== 'top' && wall !== 'bottom' && wall !== 'left' && wall !== 'right') return;

  const g = getGlobals();
  const canvas = g.canvas;
  if (!canvas) return;

  const rCssPx = (typeof g.getCanvasCornerRadius === 'function')
    ? g.getCanvasCornerRadius()
    : (g.cornerRadius ?? g.wallRadius ?? 0);
  const rCanvasPx = Math.max(0, (Number(rCssPx) || 0) * (g.DPR || 1));

  // Ensure geometry matches drawWalls() / Ball.walls() (same as registerWallImpact)
  const DPR = g.DPR || 1;
  const wallThicknessPx = Math.max(0, (Number(g.wallThickness) || 0) * DPR);
  const insetPx = wallThicknessPx;
  const innerW = Math.max(1, canvas.width - insetPx * 2);
  const innerH = Math.max(1, canvas.height - insetPx * 2);
  const innerR = Math.max(0, Math.min(rCanvasPx, innerW * 0.5, innerH * 0.5));
  wallState.ringPhysics.ensureGeometry(innerW, innerH, innerR);
  // Pressure is used for damping/settling: keep it less clamped than impacts.
  const clamp = 0.1;
  const pos = Math.max(clamp, Math.min(1 - clamp, Number(normalizedPos) || 0));
  const t = wallState.ringPhysics.tFromWall(wall, pos);
  const fast = wallState._pressureEventsThisStep >= MAX_RING_PRESSURE_EVENTS_PER_PHYSICS_STEP;
  wallState.ringPhysics.addPressureAtT(t, amount, { fast });
  wallState._pressureEventsThisStep++;
}

/**
 * Register resting pressure by contact point (canvas px space).
 * Preferred for SDF collisions because it works consistently at corners.
 */
export function registerWallPressureAtPoint(x, y, amount = 1.0) {
  const g = getGlobals();
  const canvas = g.canvas;
  if (!canvas) return;

  const rCssPx = (typeof g.getCanvasCornerRadius === 'function')
    ? g.getCanvasCornerRadius()
    : (g.cornerRadius ?? g.wallRadius ?? 0);
  const rCanvasPx = Math.max(0, (Number(rCssPx) || 0) * (g.DPR || 1));

  // Ensure geometry matches drawWalls() / Ball.walls():
  const DPR = g.DPR || 1;
  const wallThicknessPx = Math.max(0, (Number(g.wallThickness) || 0) * DPR);
  const insetPx = wallThicknessPx;
  const innerW = Math.max(1, canvas.width - insetPx * 2);
  const innerH = Math.max(1, canvas.height - insetPx * 2);
  const innerR = Math.max(0, Math.min(rCanvasPx, innerW * 0.5, innerH * 0.5));
  wallState.ringPhysics.ensureGeometry(innerW, innerH, innerR);

  const ix = x - insetPx;
  const iy = y - insetPx;

  const fast = wallState._pressureEventsThisStep >= MAX_RING_PRESSURE_EVENTS_PER_PHYSICS_STEP;
  wallState.ringPhysics.addPressureAtPoint(ix, iy, amount, { fast });
  wallState._pressureEventsThisStep++;
}

// ═══════════════════════════════════════════════════════════════════════════════
// WALL RENDERING
// Draws a continuous, deformed rubber ring (visual-only).
// ═══════════════════════════════════════════════════════════════════════════════
export function drawWalls(ctx, w, h) {
  const g = getGlobals();
  if (!ctx) return;

  const chromeColor = CACHED_WALL_COLOR || getChromeColorFromCSS();
  const DPR = g.DPR || 1;
  // DEBUG/TEST: allow exaggerating deformation (visual-only).
  // Default should remain 1.0 in config.
  const visualMul = Math.max(0, Math.min(10, Number(g.wallVisualDeformMul ?? 1.0) || 1.0));

  const rCssPx = (typeof g.getCanvasCornerRadius === 'function')
    ? g.getCanvasCornerRadius()
    : (g.cornerRadius ?? g.wallRadius ?? 0);
  const rCanvasPx = Math.max(0, (Number(rCssPx) || 0) * DPR);
  
  // Wall inset rule:
  // The wall inner edge (collision boundary) is defined ONLY by wall thickness.
  // Content padding is layout-only and must not affect wall geometry.
  const wallThicknessPx = Math.max(0, (Number(g.wallThickness) || 0) * DPR);
  const insetPx = wallThicknessPx;
  
  // COORDINATE SYSTEM CLARIFICATION:
  // The wall is drawn as a "frame" - it has an outer edge (at canvas boundary) and inner edge.
  // We draw the INNER edge of the wall as a rounded rectangle path.
  // The space between outer and inner edge is filled to create the wall "tube".
  //
  // The corner radius (from config) should apply to the INNER edge, not the outer edge.
  // This is because:
  // 1. The inner edge is where balls collide (physics expects this)
  // 2. The visual appearance is defined by the inner cutout shape
  // 3. The outer edge is just the canvas boundary (no control needed)
  //
  // So: innerW/innerH = canvas size minus wall thickness inset
  //     innerR = corner radius clamped to inner dims
  //     The path is drawn in innerW/innerH space, then offset by insetPx
  const innerW = Math.max(1, w - (insetPx * 2));
  const innerH = Math.max(1, h - (insetPx * 2));
  const innerR = Math.max(0, Math.min(rCanvasPx, innerW * 0.5, innerH * 0.5));
  
  // Ensure both rings share the same geometric basis (so t-mapping aligns).
  // Use inner dimensions for the wall geometry (wall is inset from container edges)
  // This creates the inner edge of the wall border - outer edge is at canvas boundaries
  wallState.ringPhysics.ensureGeometry(innerW, innerH, innerR);
  wallState.ringRender.ensureGeometry(innerW, innerH, innerR);

  // Small padding beyond canvas edges for sub-pixel path rounding safety (clipped by canvas anyway)
  const pad = Math.max(2, 2 * DPR);

  ctx.save();
  ctx.fillStyle = chromeColor;
  ctx.beginPath();

  // Outer path (CW): canvas edges (container fills viewport, wall is inset inside)
  ctx.moveTo(-pad, -pad);
  ctx.lineTo(w + pad, -pad);
  ctx.lineTo(w + pad, h + pad);
  ctx.lineTo(-pad, h + pad);
  ctx.closePath();

  // Inner path (CCW): deformed rounded-rect perimeter.
  const ringPhysics = wallState.ringPhysics;
  const ringRender = wallState.ringRender;
  const nPhys = ringPhysics.n;
  const n = ringRender.n;
  if (n > 0 && nPhys > 0) {
    // Smooth look:
    // Use the cached smoothed deformation field (updated only on wall physics ticks),
    // then interpolate across ticks for a continuous render.
    const enableInterpolation = g.wallPhysicsInterpolation !== false;
    const alpha = enableInterpolation ? Math.max(0, Math.min(1, wallState._interpolationAlpha || 0)) : 1.0;

    const sm = ringRender.renderDeformations; // scratch buffer for interpolated sm
    const prevSm = wallState._renderSmPrev;
    const currSm = wallState._renderSmCurr;
    const canUseCache = prevSm && currSm && prevSm.length === n && currSm.length === n;

    if (canUseCache) {
      for (let i = 0; i < n; i++) {
        const pv = prevSm[i];
        sm[i] = pv + (currSm[i] - pv) * alpha;
      }
    } else {
      // Fallback: map + smooth if cache isn't ready.
      const srcPhys = ringPhysics.deformations;
      const src = ringRender.deformations;
      for (let i = 0; i < n; i++) {
        const f = (i / n) * nPhys;
        const i0 = Math.floor(f) % nPhys;
        const t = f - i0;
        const i1 = (i0 + 1) % nPhys;
        src[i] = (1 - t) * srcPhys[i0] + t * srcPhys[i1];
      }
      for (let i = 0; i < n; i++) {
        const m2 = (i - 2 + n) % n;
        const m1 = (i - 1 + n) % n;
        const p1 = (i + 1) % n;
        const p2 = (i + 2) % n;
        sm[i] = (src[m2] + 4 * src[m1] + 6 * src[i] + 4 * src[p1] + src[p2]) * (1 / 16);
      }
    }

    const baseX = ringRender.baseX;
    const baseY = ringRender.baseY;
    const normX = ringRender.normX;
    const normY = ringRender.normY;

    // Render-only safety clamp:
    // - still respects configured max deform
    // - also prevents self-intersection on extreme configs
    const minDim = Math.max(1, Math.min(w, h));
    const maxDispGeomPx = Math.max(0, minDim * 0.18);
    const maxDeformCfg = Math.max(0, Number(g.wallWobbleMaxDeform ?? DEFAULT_MAX_DEFORM) || DEFAULT_MAX_DEFORM);
    const maxDispCfgPx = maxDeformCfg * DPR * WALL_VISUAL_TEST_DEFORM_MUL * visualMul;
    const maxDispCanvasPx = Math.min(maxDispGeomPx, maxDispCfgPx);
    const dispCanvasPx = (idx) => {
      const d = (sm[idx] * DPR * WALL_VISUAL_TEST_DEFORM_MUL * visualMul);
      if (!(d > 0)) return 0;
      return d > maxDispCanvasPx ? maxDispCanvasPx : d;
    };

    // Offset inner path by wall inset to position it inset from container edges
    const pointX = (idx) => (baseX[idx] + normX[idx] * dispCanvasPx(idx)) + insetPx;
    const pointY = (idx) => (baseY[idx] + normY[idx] * dispCanvasPx(idx)) + insetPx;

    // ════════════════════════════════════════════════════════════════════════════
    // SIMPLE LINEAR PATH with high sample density
    // Draws straight lines between closely-spaced samples for smooth appearance
    // ════════════════════════════════════════════════════════════════════════════
    
    // Start at first point (draw CCW for even-odd fill)
    ctx.moveTo(pointX(n - 1), pointY(n - 1));
    
    // Draw lines through all samples in reverse order (CCW)
    for (let i = n - 2; i >= 0; i--) {
      ctx.lineTo(pointX(i), pointY(i));
    }
    
    ctx.closePath();
  }

  // Prefer even-odd to define the ring; fallback to non-zero (inner path is CCW).
  try {
    ctx.fill('evenodd');
  } catch (e) {
    ctx.fill();
  }

  ctx.restore();
}

// ═══════════════════════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════════════════════
function getChromeColorFromCSS() {
  try {
    // Use --wall-color (theme-aware, single-token consumer).
    // In some contexts tokens might be scoped; try root → body → container.
    const root = document.documentElement;
    const body = document.body;
    const container = document.getElementById('bravia-balls');

    const read = (el, name) => {
      if (!el) return '';
      try {
        const value = getComputedStyle(el).getPropertyValue(name).trim();
        // If value is empty or just whitespace, try reading the resolved value
        if (!value) {
          // Try reading the actual computed color value
          const computed = getComputedStyle(el);
          // For --wall-color, check if it resolves to a color
          const resolved = computed.getPropertyValue(name).trim();
          return resolved;
        }
        return value;
      } catch (e) {
        return '';
      }
    };

    // Try --wall-color first (theme-aware)
    let color = read(root, '--wall-color');
    if (!color) {
      // Fallback: check if dark mode and use --wall-color-dark directly
      const isDark = root.classList.contains('dark-mode') || body.classList.contains('dark-mode');
      if (isDark) {
        color = read(root, '--wall-color-dark') || read(root, '--frame-color-dark');
      } else {
        color = read(root, '--wall-color-light') || read(root, '--frame-color-light');
      }
    }
    
    // If still no color, try body and container
    if (!color) {
      color = read(body, '--wall-color') || read(container, '--wall-color');
    }
    
    return color || '#0a0a0a';
  } catch {
    return '#0a0a0a';  // Must match --frame-color-* in main.css
  }
}

export function updateChromeColor() {
  CACHED_WALL_COLOR = getChromeColorFromCSS();
}

/**
 * Derive low-level wall wobble parameters from high-level controls
 * @param {number} softness 0-100 (softer = more flex, lower stiffness)
 * @param {number} bounciness 0-100 (bouncier = less damping, less settling)
 * @returns {Object} { wallWobbleStiffness, wallWobbleMaxDeform, wallWobbleDamping, wallWobbleSettlingSpeed }
 */
export function deriveWallParamsFromHighLevel(softness, bounciness) {
  const s = Math.max(0, Math.min(100, softness)) / 100;
  const b = Math.max(0, Math.min(100, bounciness)) / 100;
  
  function lerp(min, max, t) { return min + (max - min) * t; }
  
  return {
    wallWobbleStiffness: Math.round(lerp(2800, 600, s)),
    wallWobbleMaxDeform: Math.round(lerp(40, 140, s)),
    wallWobbleDamping: Math.round(lerp(70, 12, b)),
    // Settling speed inversely related to bounciness by default (bouncier = less settling)
    // But exposed as separate advanced control
    wallWobbleSettlingSpeed: Math.round(lerp(80, 20, b))
  };
}
