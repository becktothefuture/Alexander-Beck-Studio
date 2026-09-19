// Linear-light exposure for the whole scene. Palette slots, gradient texture,
// circle dimensions, depth coverage and geometry remain shared and unchanged.
const DARK_SHOULDER = 5.5;
const LIGHT_FLOOR = 0.25;
const LUMINANCE = [0.2126, 0.7152, 0.0722];

export function mapRollercoasterTone(linearColor, darkMix = 0) {
  if (!Array.isArray(linearColor) || linearColor.length !== 3
    || !linearColor.every(channel => Number.isFinite(channel) && channel >= 0 && channel <= 1)
    || !Number.isFinite(darkMix) || darkMix < 0 || darkMix > 1) {
    throw new RangeError('About tone requires linear RGB and a theme mix within zero to one.');
  }
  const luminance = linearColor.reduce((sum, channel, index) => sum + channel * LUMINANCE[index], 0);
  const shoulder = 1 + DARK_SHOULDER * luminance;
  return linearColor.map(channel => {
    const light = LIGHT_FLOOR + (1 - LIGHT_FLOOR) * channel;
    const dark = channel / shoulder;
    return light + (dark - light) * darkMix;
  });
}

export const ROLLERCOASTER_TONE_GLSL = `
  vec3 applyRollercoasterTone(vec3 color, float darkMix) {
    float luminance = dot(color, vec3(0.2126, 0.7152, 0.0722));
    vec3 dark = color / (1.0 + ${DARK_SHOULDER.toFixed(1)} * luminance);
    vec3 light = mix(vec3(${LIGHT_FLOOR.toFixed(2)}), vec3(1.0), color);
    return mix(light, dark, darkMix);
  }
`;
