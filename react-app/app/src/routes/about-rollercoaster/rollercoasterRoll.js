const smoother = value => {
  const t = Math.max(0, Math.min(1, value));
  return t * t * t * (t * (6 * t - 15) + 10);
};

// The same C2 envelope as About Director. Signed degrees stay unwrapped;
// overlapping cues add, and reversing the camera retraces the same orientation.
export function sampleRollercoasterRoll(cues, progress) {
  let degrees = 0;
  for (const cue of cues || []) {
    if (!cue.enabled || progress <= cue.start) continue;
    if (cue.mode === 'hold') {
      degrees += cue.angleDegrees * smoother((progress - cue.start) / (cue.end - cue.start));
      continue;
    }
    if (progress >= cue.end) continue;
    const t = progress <= cue.peak
      ? (progress - cue.start) / (cue.peak - cue.start)
      : (cue.end - progress) / (cue.end - cue.peak);
    degrees += cue.angleDegrees * smoother(t);
  }
  return degrees;
}

export function validateRollercoasterRoll(cues, beats, regions) {
  if (cues === undefined) return;
  if (!Array.isArray(cues) || cues.length > 16) throw new Error('About roll needs at most 16 cues.');
  for (const cue of cues) {
    const canopy = cue.chapter === 'gallery-b';
    const beat = (canopy ? regions : beats)?.find(item => item.id === cue.chapter);
    const bounds = beat ? [beat.start, beat.end] : [0, 1];
    const hold = cue.mode === 'hold';
    if (!['tunnel-a', 'tunnel-b', 'gallery-b'].includes(cue.chapter)
      || (beats && (canopy ? !beat : beat?.kind !== 'travel'))
      || !bounds.every(Number.isFinite) || bounds[0] < 0 || bounds[1] > 1 || bounds[1] <= bounds[0]
      || ![undefined, 'recover', 'hold'].includes(cue.mode)
      || typeof cue.name !== 'string' || !cue.name.trim() || typeof cue.enabled !== 'boolean'
      || ![cue.start, cue.end, cue.angleDegrees].every(Number.isFinite)
      || cue.start < bounds[0] || cue.end > bounds[1]
      || (hold ? cue.end - cue.start < 0.008 - 1e-8
        : !Number.isFinite(cue.peak) || cue.peak - cue.start < 0.004 - 1e-8 || cue.end - cue.peak < 0.004 - 1e-8)
      || Math.abs(cue.angleDegrees) > 720) throw new Error('Invalid About roll cue or directed-section interval.');
  }
}

export function validateRollercoasterBank(bank) {
  if (bank === undefined) return;
  if (typeof bank.enabled !== 'boolean' || !Number.isFinite(bank.maxDegrees) || bank.maxDegrees < 0 || bank.maxDegrees > 45
    || !Number.isFinite(bank.smoothingDistanceWU) || bank.smoothingDistanceWU < 4 || bank.smoothingDistanceWU > 24
    || !Array.isArray(bank.samples) || (bank.enabled ? bank.samples.length !== 513 : bank.samples.length !== 0)) {
    throw new Error('Invalid About curve banking settings.');
  }
  bank.samples.forEach((sample, i) => {
    if (!Array.isArray(sample) || sample.length !== 3 || !sample.every(Number.isFinite)
      || Math.abs(sample[0] - i / (bank.samples.length - 1)) > 1e-8 || Math.abs(sample[1]) > bank.maxDegrees + 1e-8
      || ((i === 0 || i === bank.samples.length - 1) && (sample[1] !== 0 || sample[2] !== 0))) {
      throw new Error('Invalid About curve banking profile.');
    }
    if (i > 0) {
      const previous = bank.samples[i - 1];
      const slope = (sample[1] - previous[1]) / (sample[0] - previous[0]);
      if ([previous[2], sample[2]].some(value => value * slope < 0 || Math.abs(value) > 3 * Math.abs(slope) + 1e-8)) {
        throw new Error('About curve banking tangents must preserve the bounded profile.');
      }
    }
  });
}

export function sampleRollercoasterBank(bank, progress) {
  if (!bank?.enabled) return 0;
  const samples = bank.samples;
  const scaled = Math.max(0, Math.min(1, progress)) * (samples.length - 1);
  const i = Math.min(samples.length - 2, Math.floor(scaled)), t = scaled - i;
  const a = samples[i], b = samples[i + 1], width = b[0] - a[0];
  return (2*t**3-3*t*t+1)*a[1] + (t**3-2*t*t+t)*width*a[2]
    + (-2*t**3+3*t*t)*b[1] + (t**3-t*t)*width*b[2];
}

export function applyRollercoasterRoll(quaternion, degrees) {
  const halfAngle = -degrees * Math.PI / 360;
  const s = Math.sin(halfAngle), c = Math.cos(halfAngle);
  const [x, y, z, w] = quaternion;
  // Post-multiply around camera-local Z. The camera looks along -Z, so a
  // positive authored angle is clockwise looking forward; its tangent is fixed.
  quaternion[0] = x * c + y * s;
  quaternion[1] = y * c - x * s;
  quaternion[2] = z * c + w * s;
  quaternion[3] = w * c - z * s;
}
