/**
 * Fixture rebound is intentionally discrete. Add a Figma layer ID to the
 * high-rebound set when a later review promotes that part of the machine.
 * Zero is a third, non-elastic material for indexing machinery that must guide
 * a ball without returning impact energy.
 */
export const REBOUND_LEVELS = Object.freeze({
  default: Object.freeze({ restitution: 0.44, friction: 0.015, slop: 0.01 }),
  high: Object.freeze({ restitution: 0.88, friction: 0.005, slop: 0.01 }),
  zero: Object.freeze({ restitution: 0, friction: 0.08, frictionStatic: 0.12, slop: 0.01 }),
});

const HIGH_REBOUND_FIXTURE_IDS = new Set([
  'geometry-fixture-0002',
  'geometry-fixture-0003',
  'geometry-pinball-bumper-0001',
  'geometry-pinball-bumper-0002',
  'geometry-pinball-bumper-0003',
  'pinball-post-left',
  'pinball-post-right',
  'pinball-sling-left',
  'pinball-sling-right',
]);

const ZERO_REBOUND_FIXTURE_IDS = new Set([
  'large-drum-casing',
  'large-drum-throat',
  'large-drum-carrier',
  'small-drum-casing',
  'small-drum-throat',
  'small-drum-carrier',
]);

export function reboundLevelForFixture(id) {
  if (id.startsWith('geometry-pinball-bumper-')) return 'high';
  if (id.startsWith('drum-transfer-')) return 'zero';
  if (ZERO_REBOUND_FIXTURE_IDS.has(id)) return 'zero';
  return HIGH_REBOUND_FIXTURE_IDS.has(id) ? 'high' : 'default';
}

export const TRANSFER_CANAL_MATERIAL = Object.freeze({
  ...REBOUND_LEVELS.zero, friction: 0, frictionStatic: 0,
});

export function reboundMaterial(level = 'default') {
  return REBOUND_LEVELS[level] || REBOUND_LEVELS.default;
}
