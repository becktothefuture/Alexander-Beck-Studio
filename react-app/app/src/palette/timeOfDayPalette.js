import {
  DEFAULT_LONDON_WEATHER_PALETTE_ID,
  getLondonWeatherPalette,
} from './londonPalettes.js';

export const TIME_OF_DAY_PALETTE_PERIODS = Object.freeze([
  Object.freeze({
    id: 'after-midnight',
    label: 'After Midnight',
    hours: '00:00–02:59',
    startHour: 0,
    paletteId: 'nightTube2049',
  }),
  Object.freeze({
    id: 'pre-dawn',
    label: 'Pre-dawn',
    hours: '03:00–05:59',
    startHour: 3,
    paletteId: 'riverMist',
  }),
  Object.freeze({
    id: 'morning',
    label: 'Morning',
    hours: '06:00–08:59',
    startHour: 6,
    paletteId: 'portlandHaze',
  }),
  Object.freeze({
    id: 'civic-morning',
    label: 'Civic Morning',
    hours: '09:00–11:59',
    startHour: 9,
    paletteId: 'barbicanWarning',
  }),
  Object.freeze({
    id: 'midday',
    label: 'Midday',
    hours: '12:00–14:59',
    startHour: 12,
    paletteId: 'blueBreak',
  }),
  Object.freeze({
    id: 'afternoon-rush',
    label: 'Afternoon Rush',
    hours: '15:00–17:59',
    startHour: 15,
    paletteId: 'ryeLaneRush',
  }),
  Object.freeze({
    id: 'evening',
    label: 'Evening',
    hours: '18:00–20:59',
    startHour: 18,
    paletteId: 'sodiumRain',
  }),
  Object.freeze({
    id: 'late-night',
    label: 'Late Night',
    hours: '21:00–23:59',
    startHour: 21,
    paletteId: 'nightBusStatic',
  }),
]);

const DEFAULT_PERIOD = TIME_OF_DAY_PALETTE_PERIODS.find(
  (period) => period.paletteId === 'portlandHaze',
) || TIME_OF_DAY_PALETTE_PERIODS[0];

export function resolveTimeOfDayPalettePeriod(hour) {
  const normalizedHour = Number(hour);
  if (!Number.isFinite(normalizedHour)) return DEFAULT_PERIOD;

  const localHour = ((Math.floor(normalizedHour) % 24) + 24) % 24;
  for (let index = TIME_OF_DAY_PALETTE_PERIODS.length - 1; index >= 0; index -= 1) {
    if (localHour >= TIME_OF_DAY_PALETTE_PERIODS[index].startHour) {
      return TIME_OF_DAY_PALETTE_PERIODS[index];
    }
  }
  return TIME_OF_DAY_PALETTE_PERIODS[0];
}

export function getTimeOfDayPalettePeriod(date = new Date()) {
  const localHour = date instanceof Date ? date.getHours() : new Date(date).getHours();
  return resolveTimeOfDayPalettePeriod(localHour);
}

export function getTimeOfDayPaletteId(date = new Date()) {
  return getTimeOfDayPalettePeriod(date)?.paletteId || DEFAULT_LONDON_WEATHER_PALETTE_ID;
}

export function getTimeOfDayPalette(date = new Date()) {
  return getLondonWeatherPalette(getTimeOfDayPaletteId(date));
}

export function getTimeOfDayPaletteColors(date = new Date(), isDarkMode = false) {
  const palette = getTimeOfDayPalette(date);
  const colors = isDarkMode ? palette?.dark : palette?.light;
  return Array.isArray(colors) ? colors.slice() : [];
}

export function syncTimeOfDayPaletteCssVars({
  date = new Date(),
  isDarkMode = false,
  root = typeof document !== 'undefined' ? document.documentElement : null,
} = {}) {
  const paletteId = getTimeOfDayPaletteId(date);
  const colors = getTimeOfDayPaletteColors(date, isDarkMode);
  if (!root) return { paletteId, colors };

  colors.slice(0, 8).forEach((color, index) => {
    root.style.setProperty(`--ball-${index + 1}`, color);
  });
  root.dataset.absTimeOfDayPalette = paletteId;
  return { paletteId, colors };
}

export function getTimeUntilNextPalettePeriod(date = new Date()) {
  const current = date instanceof Date ? new Date(date.getTime()) : new Date(date);
  if (!Number.isFinite(current.getTime())) return 60_000;

  const next = TIME_OF_DAY_PALETTE_PERIODS
    .map((period) => {
      const boundary = new Date(current.getTime());
      boundary.setHours(period.startHour, 0, 0, 0);
      return boundary;
    })
    .find((boundary) => boundary.getTime() > current.getTime());

  if (next) {
    return Math.max(1_000, next.getTime() - current.getTime());
  }

  const firstBoundaryTomorrow = new Date(current.getTime());
  firstBoundaryTomorrow.setDate(firstBoundaryTomorrow.getDate() + 1);
  firstBoundaryTomorrow.setHours(TIME_OF_DAY_PALETTE_PERIODS[0].startHour, 0, 0, 0);
  return Math.max(1_000, firstBoundaryTomorrow.getTime() - current.getTime());
}
