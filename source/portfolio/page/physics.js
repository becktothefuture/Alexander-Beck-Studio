// physics.js – lightweight spring-solver for realistic page settling
// -------------------------------------------------------------------
// The solver treats a page as a thin rigid plate hinged at its top edge.
// While the user is actively scrolling we directly map wheel delta → angle
// outside this module. The moment the user lets go, the page is released
// with its current angle and angular velocity. We then integrate forward
// each animation frame until the page rests flat (0° or 180°).
//
// Simplifications:
// • The plate’s moment of inertia around the hinge is approximated as
//   I = (1/3) * m * h^2   (thin rod formula; good enough visually).
// • Damping term models hinge friction / air resistance.
// • We cap dt to avoid large jumps on low frame-rate devices.
//
// The solver is intentionally stateless outside the PagePhysics instance so
// multiple pages can run in parallel if ever needed.

const DEFAULTS = {
  mass: 0.009,            // kg (150 gsm A4 ≈ 0.009 kg)
  height: 0.297,          // m (A4 height) – used for inertia approximation
  gravityMul: 2.0,        // gravity multiplier (Earth×2)
  damping: 5,             // critical damping ≈ 2*sqrt(k*I); tweak in debug UI
  maxDt: 1 / 30,          // seconds – clamp to 30 fps for stability
  restThresholdDeg: 0.2,  // stop simulation when |ω| < … and close to flat
};

export class PagePhysics {
  constructor({
    mass = DEFAULTS.mass,
    height = DEFAULTS.height,
    gravityMul = DEFAULTS.gravityMul,
    damping = DEFAULTS.damping,
  } = {}) {
    this.mass = mass;
    this.height = height;
    this.g = 9.81 * gravityMul;
    this.damping = damping;

    // Moment of inertia around hinge (thin plate pivoting around edge)
    // I = (1/3) m h^2
    this.I = (1 / 3) * this.mass * Math.pow(this.height, 2);

    // State
    this.theta = 0;      // radians (0 = flat unread side)
    this.omega = 0;      // rad/s
    this.targetSide = 0; // 0 for unread, Math.PI for read stack
    this.active = false; // running solver
  }

  /**
   * Start a settle towards the closest side based on current angle.
   * thetaDeg: current rotation in degrees.
   * omegaDeg: current angular velocity in deg/s.
   */
  release({ thetaDeg, omegaDeg }) {
    this.theta = (thetaDeg * Math.PI) / 180;
    this.omega = (omegaDeg * Math.PI) / 180;
    // Decide landing side
    this.targetSide = this.theta > Math.PI / 2 ? Math.PI : 0;
    this.active = true;
  }

  /** advance simulation by dt seconds */
  step(dt) {
    if (!this.active) return this.theta;

    // Clamp dt for stability
    dt = Math.min(dt, DEFAULTS.maxDt);

    // Compute torque due to gravity – assume CoM at h/2 from hinge
    const torque = this.mass * this.g * (this.height / 2) * Math.sin(this.theta);
    // Equation: I * α + damping * ω + k*(theta-target) = torque
    // We model spring-like bias towards target side with large k.
    const k = 500; // N·m/rad – stiff spring to landing position
    const alpha = (torque - this.damping * this.omega - k * (this.theta - this.targetSide)) / this.I;

    // Integrate (semi-implicit Euler)
    this.omega += alpha * dt;
    this.theta += this.omega * dt;

    // Check rest condition
    const thetaDeg = (this.theta * 180) / Math.PI;
    const omegaDeg = (this.omega * 180) / Math.PI;
    if (Math.abs(omegaDeg) < 5 && Math.abs(thetaDeg - (this.targetSide * 180) / Math.PI) < DEFAULTS.restThresholdDeg) {
      this.theta = this.targetSide;
      this.omega = 0;
      this.active = false;
    }

    return this.theta; // radians
  }

  isActive() {
    return this.active;
  }
}

// -------------------------------------------------------------
// Helper: derive page lift height from paper weight (gsm)
// A4 page area ≈ 0.06237 m². 80 gsm standard office paper gives
//   baseLiftPx = 20 px (empirically looks natural). We scale
//   proportionally with stiffnessFactor = gsm / 80.
// You can override baseLiftPx in PHYSICAL config.

export function getPageLiftHeight(gsm, baseLiftPx = 20) {
  if (typeof gsm !== 'number' || gsm <= 0) return baseLiftPx;
  const stiffnessFactor = gsm / 80; // 80 gsm baseline
  return baseLiftPx * stiffnessFactor;
}

// Helper for debug panel integration
export function createDefaultPagePhysics() {
  return new PagePhysics();
} 