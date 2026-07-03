export const BEACH_BALL_ROOM_DEFAULT_SETTINGS = Object.freeze({
  showRoomLines: true,
  roomLineOpacity: 0.22,
  roomLineThickness: 0.006,
  roomInset: 0.33,
  roomDepth: 3.7,
  foregroundLimit: 1.85,
  ballDiameterViewportRatio: 0.56,
  colourStripCount: 5,
  colourStripColumns: 4,
  whiteStripColumns: 4,
  stripPhase: 298,
  topCapAngleDeg: 27,
  bottomCapAngleDeg: 12,
  latitudeRows: 24,
  beadRadiusScale: 0.78,
  beadSurfaceOffset: 0.08,
  mobileDensityScale: 0.92,
  gravity: 8.8,
  restitution: 0.56,
  bounceBoost: 2.38,
  backWallBounceBoost: 1.56,
  bounceMinVelocity: 0.42,
  linearDamping: 0.24,
  angularDamping: 0.26,
  wallFriction: 0.58,
  collisionSpinBoost: 0.34,
  maxLinearSpeed: 9.5,
  maxAngularSpeed: 1.45,
  pointerInfluenceRadius: 1.95,
  tapPushStrength: 18.9,
  dragFlickStrength: 48,
  dragDepthPush: 2.25,
  pointerSpinStrength: 0.42,
});

const SETTING_RULES = Object.freeze({
  showRoomLines: Object.freeze({ type: 'checkbox' }),
  roomLineOpacity: Object.freeze({ min: 0, max: 1 }),
  roomLineThickness: Object.freeze({ min: 0, max: 0.25 }),
  roomInset: Object.freeze({ min: 0, max: 0.75 }),
  roomDepth: Object.freeze({ min: 1, max: 12 }),
  foregroundLimit: Object.freeze({ min: 0.3, max: 3 }),
  ballDiameterViewportRatio: Object.freeze({ min: 0.15, max: 0.9 }),
  colourStripCount: Object.freeze({ min: 1, max: 24, integer: true }),
  colourStripColumns: Object.freeze({ min: 1, max: 24, integer: true }),
  whiteStripColumns: Object.freeze({ min: 1, max: 24, integer: true }),
  stripPhase: Object.freeze({ min: 0, max: 360, integer: true, convertNegativeRadians: true }),
  topCapAngleDeg: Object.freeze({ min: 0, max: 90, integer: true }),
  bottomCapAngleDeg: Object.freeze({ min: 0, max: 90, integer: true }),
  latitudeRows: Object.freeze({ min: 1, max: 80, integer: true }),
  beadRadiusScale: Object.freeze({ min: 0, max: 6 }),
  beadSurfaceOffset: Object.freeze({ min: 0, max: 2 }),
  mobileDensityScale: Object.freeze({ min: 0, max: 4 }),
  gravity: Object.freeze({ min: 0, max: 40, absNegative: true }),
  restitution: Object.freeze({ min: 0, max: 2 }),
  bounceBoost: Object.freeze({ min: 1, max: 5 }),
  backWallBounceBoost: Object.freeze({ min: 1, max: 5 }),
  bounceMinVelocity: Object.freeze({ min: 0, max: 10 }),
  linearDamping: Object.freeze({ min: 0, max: 5 }),
  angularDamping: Object.freeze({ min: 0, max: 5 }),
  wallFriction: Object.freeze({ min: 0, max: 1 }),
  collisionSpinBoost: Object.freeze({ min: 0, max: 8 }),
  maxLinearSpeed: Object.freeze({ min: 1, max: 60 }),
  maxAngularSpeed: Object.freeze({ min: 1, max: 60 }),
  pointerInfluenceRadius: Object.freeze({ min: 1, max: 5 }),
  tapPushStrength: Object.freeze({ min: 0, max: 20 }),
  dragFlickStrength: Object.freeze({ min: 0, max: 80 }),
  dragDepthPush: Object.freeze({ min: 0, max: 5 }),
  pointerSpinStrength: Object.freeze({ min: 0, max: 10 }),
});

export function clampBeachBallRoomNumber(value, min, max) {
  const n = Number(value);
  if (!Number.isFinite(n)) return min;
  return Math.max(min, Math.min(max, n));
}

export function clampBeachBallRoomInteger(value, min, max) {
  return Math.round(clampBeachBallRoomNumber(value, min, max));
}

export function getBeachBallRoomChangedSettingKeys(previousSettings, nextSettings) {
  if (!previousSettings) return Object.keys(BEACH_BALL_ROOM_DEFAULT_SETTINGS);
  return Object.keys(BEACH_BALL_ROOM_DEFAULT_SETTINGS).filter((key) => previousSettings[key] !== nextSettings[key]);
}

export function sanitizeBeachBallRoomSettings(input) {
  const next = { ...BEACH_BALL_ROOM_DEFAULT_SETTINGS };
  if (!input || typeof input !== 'object') return next;

  for (const [key, rule] of Object.entries(SETTING_RULES)) {
    if (!Object.prototype.hasOwnProperty.call(input, key)) continue;
    let value = input[key];
    if (rule.absNegative && Number(value) < 0) {
      value = Math.abs(Number(value));
    } else if (rule.convertNegativeRadians && Number(value) < 0) {
      value = (((Number(value) * 180 / Math.PI) % 360) + 360) % 360;
    }

    if (rule.type === 'checkbox') {
      next[key] = Boolean(value);
    } else if (rule.integer) {
      next[key] = clampBeachBallRoomInteger(value, rule.min, rule.max);
    } else {
      next[key] = clampBeachBallRoomNumber(value, rule.min, rule.max);
    }
  }

  return next;
}
