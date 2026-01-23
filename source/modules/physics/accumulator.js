// ╔══════════════════════════════════════════════════════════════════════════════╗
// ║                    PHYSICS ACCUMULATOR MODULE                               ║
// ║           Fixed-timestep accumulator for deterministic physics              ║
// ╚══════════════════════════════════════════════════════════════════════════════╝

/**
 * Physics accumulator for fixed-timestep integration.
 * Accumulates frame time and consumes it in fixed DT chunks,
 * ensuring consistent physics behavior regardless of frame rate.
 */
let accumulator = 0;

/**
 * Get the current accumulator value.
 * @returns {number} Accumulated time in seconds
 */
export function getAccumulator() {
  return accumulator;
}

/**
 * Set the accumulator to a specific value.
 * @param {number} value - New accumulator value in seconds
 */
export function setAccumulator(value) {
  accumulator = value;
}

/**
 * Add time to the accumulator.
 * @param {number} dt - Delta time to add in seconds
 */
export function addToAccumulator(dt) {
  accumulator += dt;
}

/**
 * Subtract time from the accumulator.
 * @param {number} dt - Delta time to subtract in seconds
 */
export function subtractFromAccumulator(dt) {
  accumulator -= dt;
}

/**
 * Reset the physics accumulator to zero.
 * Called on mode changes, window resize, etc. to prevent
 * physics catching up after pauses.
 */
export function resetPhysicsAccumulator() {
  accumulator = 0;
}
