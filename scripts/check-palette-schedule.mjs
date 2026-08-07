import {
  LONDON_PALETTES,
  LONDON_PALETTE_MAP,
  LONDON_PALETTE_STATUS,
} from '../react-app/app/src/palette/londonPalettes.js';
import {
  TIME_OF_DAY_PALETTE_PERIODS,
  getTimeUntilNextPalettePeriod,
  resolveTimeOfDayPalettePeriod,
} from '../react-app/app/src/palette/timeOfDayPalette.js';

const EXPECTED_START_HOURS = Object.freeze([0, 3, 6, 9, 12, 15, 18, 21]);
const EXPECTED_PALETTE_COUNT = 4;
const EXPECTED_ROTATION_COUNT = 2;
const NEUTRAL_ROLE_INDEX = 0;
const ART_DIRECTION_ROLE_INDEX = 2;
const PRIMARY_ROLE_INDEX = 6;
const APPROVED_PALETTE_COLORS = Object.freeze({
  bowWornSignal: Object.freeze(['#747474', '#553875', '#ffffff', '#1aae7d', '#0b090c', '#87915a', '#ff4b00', '#cf287c']),
  silvertownCobaltVoltage: Object.freeze(['#747474', '#71463a', '#ffffff', '#00843d', '#0c1118', '#8e764d', '#1557ff', '#695a74']),
  ryeAfterClosing: Object.freeze(['#666666', '#00744a', '#ffffff', '#3344d7', '#07100d', '#f2bd00', '#ff6500', '#9a637f']),
  ryeAfterClosingTurmeric: Object.freeze(['#747474', '#246147', '#ffffff', '#3b4ed8', '#08100c', '#a67847', '#ffd000', '#99647f']),
});

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function getColorProfile(color) {
  const channels = color.slice(1).match(/.{2}/g).map((value) => Number.parseInt(value, 16) / 255);
  const maximum = Math.max(...channels);
  const minimum = Math.min(...channels);
  const delta = maximum - minimum;
  const lightness = (maximum + minimum) / 2;
  const saturation = delta === 0 ? 0 : delta / (1 - Math.abs((2 * lightness) - 1));
  const linear = channels.map((channel) => (
    channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4
  ));
  return {
    saturation,
    luminance: (0.2126 * linear[0]) + (0.7152 * linear[1]) + (0.0722 * linear[2]),
  };
}

assert(LONDON_PALETTE_STATUS === 'stable', 'The approved London palette set must remain stable.');
assert(
  TIME_OF_DAY_PALETTE_PERIODS.length === EXPECTED_START_HOURS.length,
  `Expected ${EXPECTED_START_HOURS.length} palette periods, got ${TIME_OF_DAY_PALETTE_PERIODS.length}`,
);

const scheduledPaletteCounts = new Map();
TIME_OF_DAY_PALETTE_PERIODS.forEach((period, index) => {
  assert(
    period.startHour === EXPECTED_START_HOURS[index],
    `Period ${period.id} must start at ${EXPECTED_START_HOURS[index]}:00`,
  );
  assert(
    Boolean(LONDON_PALETTE_MAP[period.paletteId]),
    `Period ${period.id} references missing palette ${period.paletteId}`,
  );
  scheduledPaletteCounts.set(
    period.paletteId,
    (scheduledPaletteCounts.get(period.paletteId) || 0) + 1,
  );
});

assert(
  LONDON_PALETTES.length === EXPECTED_PALETTE_COUNT,
  `Expected ${EXPECTED_PALETTE_COUNT} authored palettes, got ${LONDON_PALETTES.length}`,
);
assert(
  scheduledPaletteCounts.size === EXPECTED_PALETTE_COUNT,
  `Expected ${EXPECTED_PALETTE_COUNT} scheduled palettes, got ${scheduledPaletteCounts.size}`,
);

const approvedPaletteIds = Object.keys(APPROVED_PALETTE_COLORS);
assert(
  JSON.stringify(LONDON_PALETTES.map((palette) => palette.id)) === JSON.stringify(approvedPaletteIds),
  'The production registry must contain only the four approved palettes in rotation order.',
);

LONDON_PALETTES.forEach((palette, index) => {
  assert(
    JSON.stringify(palette.light) === JSON.stringify(APPROVED_PALETTE_COLORS[palette.id]),
    `${palette.id} drifted from the approved production colours`,
  );
  assert(
    TIME_OF_DAY_PALETTE_PERIODS[index].paletteId === palette.id,
    `The first rotation must follow authored palette order at slot ${index + 1}`,
  );
  assert(
    TIME_OF_DAY_PALETTE_PERIODS[index + EXPECTED_PALETTE_COUNT].paletteId === palette.id,
    `The second rotation must repeat ${palette.id} after twelve hours`,
  );
  assert(
    scheduledPaletteCounts.get(palette.id) === EXPECTED_ROTATION_COUNT,
    `${palette.id} must appear exactly ${EXPECTED_ROTATION_COUNT} times per day`,
  );
});

for (let hour = 0; hour < 24; hour += 1) {
  const period = resolveTimeOfDayPalettePeriod(hour);
  const expectedPeriod = TIME_OF_DAY_PALETTE_PERIODS[Math.floor(hour / 3)];
  assert(
    period === expectedPeriod,
    `Hour ${hour} resolved to ${period.id}; expected ${expectedPeriod.id}`,
  );
}

const authoredColorRoles = new Map();
for (const palette of LONDON_PALETTES) {
  assert(palette.light === palette.dark, `${palette.id} must share one light/dark colour array`);
  assert(palette.light.length === 8, `${palette.id} must define exactly eight colours`);
  assert(
    palette.light.every((color) => /^#[\da-f]{6}$/i.test(color)),
    `${palette.id} contains a malformed colour`,
  );
  assert(new Set(palette.light).size === 8, `${palette.id} must not repeat a colour`);

  palette.light.forEach((color, colorIndex) => {
    const normalized = color.toLowerCase();
    const previousRole = authoredColorRoles.get(normalized);
    if (previousRole !== undefined) {
      assert(
        previousRole === colorIndex
          && (colorIndex === NEUTRAL_ROLE_INDEX || colorIndex === ART_DIRECTION_ROLE_INDEX),
        `${palette.id} reuses ${color} outside a shared neutral role`,
      );
    } else {
      authoredColorRoles.set(normalized, colorIndex);
    }
  });

  const profiles = palette.light.map(getColorProfile);
  const neutralRoleChannels = palette.light[NEUTRAL_ROLE_INDEX].slice(1).match(/.{2}/g);
  assert(
    new Set(neutralRoleChannels).size === 1
      && profiles[NEUTRAL_ROLE_INDEX].luminance >= 0.08
      && profiles[NEUTRAL_ROLE_INDEX].luminance <= 0.45,
    `${palette.id} must keep Product Design as a true mid-value neutral grey at index 0`,
  );
  assert(
    palette.light[ART_DIRECTION_ROLE_INDEX].toLowerCase() === '#ffffff',
    `${palette.id} must use pure white for Art Direction at index 2`,
  );
  assert(
    profiles[4].luminance <= 0.02,
    `${palette.id} must keep a near-black ground at index 4`,
  );
  assert(
    profiles[PRIMARY_ROLE_INDEX].saturation >= 0.8,
    `${palette.id} must keep one clear high-saturation signal at index 6`,
  );
}

assert(
  new Set(LONDON_PALETTES.map((palette) => JSON.stringify(palette.light))).size
    === EXPECTED_PALETTE_COUNT,
  'Every approved palette must remain a distinct eight-colour scheme.',
);
assert(
  new Set(LONDON_PALETTES.map((palette) => palette.light[PRIMARY_ROLE_INDEX])).size
    === EXPECTED_PALETTE_COUNT,
  'Every approved palette must keep its own exact signal colour.',
);

for (const startHour of EXPECTED_START_HOURS) {
  const boundary = new Date(2026, 6, 18, startHour, 0, 0, 0);
  assert(
    getTimeUntilNextPalettePeriod(boundary) === 3 * 60 * 60 * 1000,
    `Boundary ${startHour}:00 must advance exactly three hours`,
  );
}

console.log('PASS: only the four approved London palettes rotate twice across eight equal three-hour periods.');
