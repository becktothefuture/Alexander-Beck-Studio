import {
  DEFAULT_LONDON_WEATHER_PALETTE_ID,
  getLondonWeatherPalette,
} from './londonPalettes.js';

export const TIME_OF_DAY_PALETTE_PERIODS = Object.freeze([
  Object.freeze({
    id: 'night',
    label: 'Night',
    hours: '22:00–04:59',
    paletteId: 'riverMist',
  }),
  Object.freeze({
    id: 'morning',
    label: 'Morning',
    hours: '05:00–10:59',
    paletteId: 'portlandHaze',
  }),
  Object.freeze({
    id: 'day',
    label: 'Day',
    hours: '11:00–16:59',
    paletteId: 'blueBreak',
  }),
  Object.freeze({
    id: 'evening',
    label: 'Evening',
    hours: '17:00–21:59',
    paletteId: 'sodiumRain',
  }),
]);

const DEFAULT_PERIOD = TIME_OF_DAY_PALETTE_PERIODS[1];

export function resolveTimeOfDayPalettePeriod(hour) {
  const normalizedHour = Number(hour);
  if (!Number.isFinite(normalizedHour)) return DEFAULT_PERIOD;

  const localHour = ((Math.floor(normalizedHour) % 24) + 24) % 24;
  if (localHour >= 22 || localHour < 5) return TIME_OF_DAY_PALETTE_PERIODS[0];
  if (localHour < 11) return TIME_OF_DAY_PALETTE_PERIODS[1];
  if (localHour < 17) return TIME_OF_DAY_PALETTE_PERIODS[2];
  return TIME_OF_DAY_PALETTE_PERIODS[3];
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
