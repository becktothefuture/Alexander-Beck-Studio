export const ABOUT_PORTRAIT_CHANGE_EVENT = 'abs:about-portrait-change';

export const ABOUT_PORTRAIT_CONTROLS = Object.freeze([
  { key: 'aboutPortraitSpacing', label: 'Ball Spacing', min: .02, max: .24, step: .01, default: .08 },
  { key: 'aboutPortraitSpeed', label: 'Build Speed', min: .5, max: 1.8, step: .05, default: 1 },
]);

export function normalizeAboutPortrait(input = {}) {
  return Object.fromEntries(ABOUT_PORTRAIT_CONTROLS.map(control => {
    const value = Number(input[control.key] ?? control.default);
    return [control.key, Number.isFinite(value)
      ? Math.max(control.min, Math.min(control.max, value)) : control.default];
  }));
}

export function publishAboutPortraitChange(input, target = globalThis.window) {
  target?.dispatchEvent(new CustomEvent(ABOUT_PORTRAIT_CHANGE_EVENT, {
    detail: normalizeAboutPortrait(input),
  }));
}
