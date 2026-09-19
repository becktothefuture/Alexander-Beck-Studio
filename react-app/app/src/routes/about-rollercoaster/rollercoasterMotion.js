const TAU = Math.PI * 2;

export function rollercoasterMotionPhase(group, ambientSeconds = 0) {
  if (group.kind === 'static') return 0;
  const time = Number.isFinite(ambientSeconds) ? Math.max(0, ambientSeconds) : 0;
  // Reduce before uploading to float uniforms; long holds do not lose phase precision.
  return TAU * ((time % group.period) / group.period) + (group.phase % TAU);
}

export function sampleRollercoasterMotion(point, group, ambientSeconds = 0, target = [0, 0, 0]) {
  const x = point[0], y = point[1], z = point[2];
  target[0] = x; target[1] = y; target[2] = z;
  if (group.kind === 'static') return target;
  const theta = rollercoasterMotionPhase(group, ambientSeconds);
  const [ax, ay, az] = group.axis;
  if (group.kind === 'rotate') {
    const angle = group.continuous ? theta : group.amplitude * Math.sin(theta);
    const dx = x - group.pivot[0], dy = y - group.pivot[1], dz = z - group.pivot[2];
    const c = Math.cos(angle), s = Math.sin(angle), d = dx * ax + dy * ay + dz * az;
    target[0] = group.pivot[0] + dx * c + (ay * dz - az * dy) * s + ax * d * (1 - c);
    target[1] = group.pivot[1] + dy * c + (az * dx - ax * dz) * s + ay * d * (1 - c);
    target[2] = group.pivot[2] + dz * c + (ax * dy - ay * dx) * s + az * d * (1 - c);
  } else if (group.kind === 'wave') {
    const dx = x - group.origin[0], dy = y - group.origin[1], dz = z - group.origin[2];
    const u = dx * group.uAxis[0] + dy * group.uAxis[1] + dz * group.uAxis[2];
    const v = dx * group.vAxis[0] + dy * group.vAxis[1] + dz * group.vAxis[2];
    const edge = Math.max(0, Math.min(1, (Math.hypot(u, v) - group.quietRadius) / group.quietFeather));
    const quiet = edge * edge * (3 - 2 * edge);
    const displacement = group.amplitude * quiet * (
      Math.sin(TAU * u / group.wavelength + theta)
      + 0.5 * Math.sin(TAU * 0.73 * v / group.wavelength - theta)
    ) / 1.5;
    target[0] += ax * displacement;
    target[1] += ay * displacement;
    target[2] += az * displacement;
  }
  return target;
}

// Keep the CPU inspection above and this GPU transform on the same source algebra.
// A: axis/type; B: pivot or origin/amplitude; C: U/phase; D: V/wavelength;
// E: quiet radius/feather/continuous flag. Static groups have type zero.
export const ROLLERCOASTER_MOTION_GLSL = `
  vec3 applyAuthoredMotion(vec3 point, int group) {
    vec4 a = uMotionA[group];
    vec4 b = uMotionB[group];
    vec4 c = uMotionC[group];
    vec4 d = uMotionD[group];
    vec4 e = uMotionE[group];
    if (a.w > 0.5 && a.w < 1.5) {
      float angle = e.z > 0.5 ? c.w : b.w * sin(c.w);
      vec3 delta = point - b.xyz;
      float cosine = cos(angle);
      return b.xyz + delta * cosine + cross(a.xyz, delta) * sin(angle)
        + a.xyz * dot(a.xyz, delta) * (1.0 - cosine);
    }
    if (a.w > 1.5) {
      vec3 delta = point - b.xyz;
      float u = dot(delta, c.xyz);
      float v = dot(delta, d.xyz);
      float quiet = smoothstep(e.x, e.x + e.y, length(vec2(u, v)));
      float displacement = b.w * quiet * (
        sin(6.28318530718 * u / d.w + c.w)
        + 0.5 * sin(6.28318530718 * 0.73 * v / d.w - c.w)
      ) / 1.5;
      return point + a.xyz * displacement;
    }
    return point;
  }
`;
