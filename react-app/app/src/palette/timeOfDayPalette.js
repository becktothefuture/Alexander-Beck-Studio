export const TIME_OF_DAY_PALETTE_PERIODS = Object.freeze([
  Object.freeze({
    id: 'after-midnight',
    label: 'After Midnight',
    hours: '00:00–02:59',
    startHour: 0,
    paletteId: 'bowWornSignal',
  }),
  Object.freeze({
    id: 'pre-dawn',
    label: 'Pre-dawn',
    hours: '03:00–05:59',
    startHour: 3,
    paletteId: 'silvertownCobaltVoltage',
  }),
  Object.freeze({
    id: 'morning',
    label: 'Morning',
    hours: '06:00–08:59',
    startHour: 6,
    paletteId: 'ryeAfterClosing',
  }),
  Object.freeze({
    id: 'civic-morning',
    label: 'Civic Morning',
    hours: '09:00–11:59',
    startHour: 9,
    paletteId: 'ryeAfterClosingTurmeric',
  }),
  Object.freeze({
    id: 'midday',
    label: 'Midday',
    hours: '12:00–14:59',
    startHour: 12,
    paletteId: 'bowWornSignal',
  }),
  Object.freeze({
    id: 'afternoon-rush',
    label: 'Afternoon Rush',
    hours: '15:00–17:59',
    startHour: 15,
    paletteId: 'silvertownCobaltVoltage',
  }),
  Object.freeze({
    id: 'evening',
    label: 'Evening',
    hours: '18:00–20:59',
    startHour: 18,
    paletteId: 'ryeAfterClosing',
  }),
  Object.freeze({
    id: 'late-night',
    label: 'Late Night',
    hours: '21:00–23:59',
    startHour: 21,
    paletteId: 'ryeAfterClosingTurmeric',
  }),
]);

const DEFAULT_PERIOD = TIME_OF_DAY_PALETTE_PERIODS.find(
  (period) => period.paletteId === 'silvertownCobaltVoltage',
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
  return getTimeOfDayPalettePeriod(date)?.paletteId || DEFAULT_PERIOD.paletteId;
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
    return Math.max(1, next.getTime() - current.getTime());
  }

  const firstBoundaryTomorrow = new Date(current.getTime());
  firstBoundaryTomorrow.setDate(firstBoundaryTomorrow.getDate() + 1);
  firstBoundaryTomorrow.setHours(TIME_OF_DAY_PALETTE_PERIODS[0].startHour, 0, 0, 0);
  return Math.max(1, firstBoundaryTomorrow.getTime() - current.getTime());
}

export function getNextTimeOfDayPaletteBoundary(date = new Date()) {
  const current = date instanceof Date ? new Date(date.getTime()) : new Date(date);
  if (!Number.isFinite(current.getTime())) return new Date(Date.now() + 60_000);
  return new Date(current.getTime() + getTimeUntilNextPalettePeriod(current));
}
