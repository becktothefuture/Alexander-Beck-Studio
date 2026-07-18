import {
  LONDON_WEATHER_PALETTES,
  LONDON_WEATHER_PALETTE_MAP,
} from '../react-app/app/src/palette/londonPalettes.js';
import {
  TIME_OF_DAY_PALETTE_PERIODS,
  getTimeUntilNextPalettePeriod,
  resolveTimeOfDayPalettePeriod,
} from '../react-app/app/src/palette/timeOfDayPalette.js';

const EXPECTED_START_HOURS = Object.freeze([0, 3, 6, 9, 12, 15, 18, 21]);

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

assert(
  TIME_OF_DAY_PALETTE_PERIODS.length === EXPECTED_START_HOURS.length,
  `Expected ${EXPECTED_START_HOURS.length} palette periods, got ${TIME_OF_DAY_PALETTE_PERIODS.length}`,
);

const scheduledPaletteIds = new Set();
TIME_OF_DAY_PALETTE_PERIODS.forEach((period, index) => {
  assert(
    period.startHour === EXPECTED_START_HOURS[index],
    `Period ${period.id} must start at ${EXPECTED_START_HOURS[index]}:00`,
  );
  assert(
    Boolean(LONDON_WEATHER_PALETTE_MAP[period.paletteId]),
    `Period ${period.id} references missing palette ${period.paletteId}`,
  );
  assert(
    !scheduledPaletteIds.has(period.paletteId),
    `Palette ${period.paletteId} is scheduled more than once`,
  );
  scheduledPaletteIds.add(period.paletteId);
});

assert(
  scheduledPaletteIds.size === LONDON_WEATHER_PALETTES.length,
  'Every authored palette must appear exactly once in the 24-hour schedule',
);

for (let hour = 0; hour < 24; hour += 1) {
  const period = resolveTimeOfDayPalettePeriod(hour);
  const expectedPeriod = TIME_OF_DAY_PALETTE_PERIODS[Math.floor(hour / 3)];
  assert(
    period === expectedPeriod,
    `Hour ${hour} resolved to ${period.id}; expected ${expectedPeriod.id}`,
  );
}

for (const palette of LONDON_WEATHER_PALETTES) {
  assert(palette.light === palette.dark, `${palette.id} must share one light/dark colour array`);
  assert(palette.light.length === 8, `${palette.id} must define exactly eight colours`);
  assert(
    palette.light.every((color) => /^#[\da-f]{6}$/i.test(color)),
    `${palette.id} contains a malformed colour`,
  );
}

for (const startHour of EXPECTED_START_HOURS) {
  const boundary = new Date(2026, 6, 18, startHour, 0, 0, 0);
  assert(
    getTimeUntilNextPalettePeriod(boundary) === 3 * 60 * 60 * 1000,
    `Boundary ${startHour}:00 must advance exactly three hours`,
  );
}

console.log('PASS: eight palettes cover one 24-hour cycle in equal three-hour periods.');
