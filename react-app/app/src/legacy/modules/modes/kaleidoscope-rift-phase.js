export function advanceKaleidoscopeRiftPhase(phase, ratePerSecond, dtSeconds) {
  const currentPhase = Number.isFinite(phase) ? phase : 0;
  const rate = Number.isFinite(ratePerSecond) ? ratePerSecond : 0;
  const dt = Number.isFinite(dtSeconds) ? Math.max(0, dtSeconds) : 0;

  // The renderer samples this phase at several fractional frequencies. Wrapping
  // at 2π makes those samples discontinuous even though the base angle repeats.
  return currentPhase + rate * dt;
}
