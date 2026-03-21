import {
  DEFAULT_LONDON_WEATHER_PALETTE_ID,
  getLondonWeatherPalette,
} from '../palette/londonPalettes.js';

const FALLBACK_PALETTE_ID = 'portlandHaze';

const RAIN_TOKENS = ['rain', 'drizzle', 'shower', 'showers', 'sleet', 'wet'];
const SUN_TOKENS = ['sun', 'sunny', 'clear', 'bright', 'sunshine', 'intervals'];
const CLOUD_TOKENS = ['cloud', 'cloudy', 'overcast', 'grey', 'gray', 'mist', 'fog'];
const HEAT_TOKENS = ['heat', 'haze', 'humid', 'muggy', 'hot', 'thunder', 'storm'];

export const LONDON_WEATHER_ASSESSMENT = Object.freeze({
  location: 'London, UK',
  asOfDate: '2026-03-21',
  source: 'Latest verified local assessment',
  currentCondition: 'Mostly cloudy',
  forecastConditions: ['Plenty of sunshine', 'Cloudy'],
});

function normalizeWeatherText(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\s]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function includesAny(text, tokens) {
  return tokens.some((token) => text.includes(token));
}

export function classifyLondonWeatherCondition(value) {
  const text = normalizeWeatherText(value);
  if (!text) return 'nearest';

  const hasRain = includesAny(text, RAIN_TOKENS);
  const hasSun = includesAny(text, SUN_TOKENS);
  const hasCloud = includesAny(text, CLOUD_TOKENS);
  const hasHeat = includesAny(text, HEAT_TOKENS);

  if (hasHeat) return 'heat';
  if (hasRain && hasSun) return 'sun-break';
  if (hasRain) return 'rain';
  if (hasSun) return 'sun-break';
  if (hasCloud) return 'overcast';
  return 'nearest';
}

export function resolvePaletteIdFromLondonWeather(value) {
  switch (classifyLondonWeatherCondition(value)) {
    case 'rain':
      return 'riverMist';
    case 'sun-break':
      return 'blueBreak';
    case 'overcast':
      return 'portlandHaze';
    case 'heat':
      return 'sodiumRain';
    default:
      return FALLBACK_PALETTE_ID || DEFAULT_LONDON_WEATHER_PALETTE_ID;
  }
}

export function getLondonWeatherPaletteIdFromAssessment(
  assessment = LONDON_WEATHER_ASSESSMENT
) {
  const currentId = resolvePaletteIdFromLondonWeather(assessment?.currentCondition);
  if (currentId) return currentId;

  const forecast = Array.isArray(assessment?.forecastConditions) ? assessment.forecastConditions : [];
  for (const condition of forecast) {
    const resolved = resolvePaletteIdFromLondonWeather(condition);
    if (resolved) return resolved;
  }

  return FALLBACK_PALETTE_ID || DEFAULT_LONDON_WEATHER_PALETTE_ID;
}

export function getLondonWeatherPaletteFromAssessment(assessment = LONDON_WEATHER_ASSESSMENT) {
  return getLondonWeatherPalette(getLondonWeatherPaletteIdFromAssessment(assessment));
}
