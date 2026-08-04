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
const EXPECTED_PALETTE_COUNT = 4;
const EXPECTED_ROTATION_COUNT = 2;

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

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
    Boolean(LONDON_WEATHER_PALETTE_MAP[period.paletteId]),
    `Period ${period.id} references missing palette ${period.paletteId}`,
  );
  scheduledPaletteCounts.set(
    period.paletteId,
    (scheduledPaletteCounts.get(period.paletteId) || 0) + 1,
  );
});

assert(
  LONDON_WEATHER_PALETTES.length === EXPECTED_PALETTE_COUNT,
  `Expected ${EXPECTED_PALETTE_COUNT} authored palettes, got ${LONDON_WEATHER_PALETTES.length}`,
);
assert(
  scheduledPaletteCounts.size === EXPECTED_PALETTE_COUNT,
  `Expected ${EXPECTED_PALETTE_COUNT} scheduled palettes, got ${scheduledPaletteCounts.size}`,
);
LONDON_WEATHER_PALETTES.forEach((palette, index) => {
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

function getColorProfile(color) {
  const channels = color.slice(1).match(/.{2}/g).map((value) => Number.parseInt(value, 16) / 255);
  const [red, green, blue] = channels;
  const maximum = Math.max(red, green, blue);
  const minimum = Math.min(red, green, blue);
  const delta = maximum - minimum;
  const lightness = (maximum + minimum) / 2;
  let hue = 0;
  if (delta > 0) {
    if (maximum === red) hue = 60 * (((green - blue) / delta) % 6);
    else if (maximum === green) hue = 60 * (((blue - red) / delta) + 2);
    else hue = 60 * (((red - green) / delta) + 4);
  }
  if (hue < 0) hue += 360;
  const saturation = delta === 0 ? 0 : delta / (1 - Math.abs((2 * lightness) - 1));
  const linear = channels.map((channel) => (
    channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4
  ));
  const luminance = (0.2126 * linear[0]) + (0.7152 * linear[1]) + (0.0722 * linear[2]);
  return { hue, luminance, saturation };
}

function getChromaticHueFamily({ hue, saturation }) {
  if (saturation < 0.45) return null;
  if (hue >= 345 || hue < 15) return 'red';
  if (hue < 75) return 'orange-yellow';
  if (hue < 165) return 'green';
  if (hue < 200) return 'cyan';
  if (hue < 260) return 'blue';
  return 'purple';
}

const authoredColors = new Set();
for (const palette of LONDON_WEATHER_PALETTES) {
  assert(palette.light === palette.dark, `${palette.id} must share one light/dark colour array`);
  assert(palette.light.length === 8, `${palette.id} must define exactly eight colours`);
  assert(
    palette.light.every((color) => /^#[\da-f]{6}$/i.test(color)),
    `${palette.id} contains a malformed colour`,
  );
  assert(new Set(palette.light).size === 8, `${palette.id} must not repeat a colour`);
  palette.light.forEach((color) => {
    assert(!authoredColors.has(color), `${palette.id} reuses ${color} from another personality`);
    authoredColors.add(color);
  });

  const profiles = palette.light.map(getColorProfile);
  assert(
    profiles.filter(({ saturation }) => saturation >= 0.45).length >= 4,
    `${palette.id} must retain at least four confident chromatic colours`,
  );
  const chromaticHueFamilies = new Set(
    profiles.map(getChromaticHueFamily).filter(Boolean),
  );
  assert(
    chromaticHueFamilies.size >= 3,
    `${palette.id} must span at least three chromatic hue families`,
  );
  assert(
    profiles.some(({ luminance }) => luminance <= 0.02)
      && profiles.some(({ luminance }) => luminance >= 0.75),
    `${palette.id} must be grounded by both near-black and light mineral neutrals`,
  );
  assert(
    !profiles.some(({ hue, saturation }) => saturation >= 0.3 && hue >= 260 && hue <= 330),
    `${palette.id} must remain purple-free`,
  );
  const hasChristmasRed = profiles.some(({ hue, saturation }) => (
    saturation >= 0.45 && (hue <= 15 || hue >= 345)
  ));
  const hasChristmasGreen = profiles.some(({ hue, saturation }) => (
    saturation >= 0.4 && hue >= 95 && hue <= 155
  ));
  assert(
    !(hasChristmasRed && hasChristmasGreen),
    `${palette.id} must not pair saturated Christmas red and green`,
  );
}

for (const startHour of EXPECTED_START_HOURS) {
  const boundary = new Date(2026, 6, 18, startHour, 0, 0, 0);
  assert(
    getTimeUntilNextPalettePeriod(boundary) === 3 * 60 * 60 * 1000,
    `Boundary ${startHour}:00 must advance exactly three hours`,
  );
}

console.log('PASS: four distinct London palettes rotate twice across eight equal three-hour periods.');
