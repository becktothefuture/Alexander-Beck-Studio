export const UTILITY_RAIL_DEFAULTS = Object.freeze({
  utilityRailButtonSizePx: 32,
  utilityRailHorizontalOffsetPx: -11,
  utilityRailMobileButtonSizePx: 25,
  utilityRailMobileHorizontalOffsetPx: -11,
  utilityRailMobileVerticalPositionVh: 76,
});

export const UTILITY_RAIL_CONTROL_GROUPS = Object.freeze([
  {
    title: 'Desktop',
    initiallyOpen: true,
    controls: [
      {
        id: 'utilityRailButtonSizePx',
        label: 'Button Size',
        type: 'range',
        min: 22,
        max: 64,
        step: 1,
        display: 'px',
        hint: 'Desktop size of both utility buttons. The icon scales with the button.',
      },
      {
        id: 'utilityRailHorizontalOffsetPx',
        label: 'Horizontal Position',
        type: 'range',
        min: -160,
        max: 160,
        step: 1,
        display: 'px',
        hint: 'Distance inward from the studio window right edge.',
      },
    ],
  },
  {
    title: 'Mobile',
    initiallyOpen: true,
    controls: [
      {
        id: 'utilityRailMobileButtonSizePx',
        label: 'Button Size',
        type: 'range',
        min: 22,
        max: 44,
        step: 1,
        display: 'px',
        hint: 'Mobile-only size for both utility buttons. The icon scales with the button.',
      },
      {
        id: 'utilityRailMobileHorizontalOffsetPx',
        label: 'Horizontal Position',
        type: 'range',
        min: -160,
        max: 160,
        step: 1,
        display: 'px',
        hint: 'Mobile-only distance inward from the studio window right edge. Negative values move the rail outward.',
      },
      {
        id: 'utilityRailMobileVerticalPositionVh',
        label: 'Vertical Position',
        type: 'range',
        min: 55,
        max: 90,
        step: 1,
        display: '%',
        hint: 'Mobile-only rail centre measured from the top of the viewport.',
      },
    ],
  },
]);

export const UTILITY_RAIL_CONTROLS = Object.freeze(
  UTILITY_RAIL_CONTROL_GROUPS.flatMap((group) => group.controls),
);

function clampNumber(value, min, max, fallback) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return fallback;
  return Math.min(max, Math.max(min, numeric));
}

export function normalizeUtilityRailConfig(source = {}) {
  const input = source && typeof source === 'object' ? source : {};
  return Object.fromEntries(
    UTILITY_RAIL_CONTROLS.map((control) => [
      control.id,
      clampNumber(
        input[control.id],
        control.min,
        control.max,
        UTILITY_RAIL_DEFAULTS[control.id],
      ),
    ]),
  );
}

export function applyUtilityRailCssVars(source = {}, root = null) {
  const targetRoot = root || (typeof document !== 'undefined' ? document.documentElement : null);
  if (!targetRoot?.style) return;
  const config = normalizeUtilityRailConfig(source);

  targetRoot.style.setProperty('--utility-rail-button-size', `${config.utilityRailButtonSizePx}px`);
  targetRoot.style.setProperty(
    '--utility-rail-icon-size',
    `${Number((config.utilityRailButtonSizePx * 0.46).toFixed(2))}px`,
  );
  targetRoot.style.setProperty(
    '--utility-rail-horizontal-offset',
    `${config.utilityRailHorizontalOffsetPx}px`,
  );
  targetRoot.style.setProperty(
    '--utility-rail-mobile-button-size',
    `${config.utilityRailMobileButtonSizePx}px`,
  );
  targetRoot.style.setProperty(
    '--utility-rail-mobile-icon-size',
    `${Number((config.utilityRailMobileButtonSizePx * 0.46).toFixed(2))}px`,
  );
  targetRoot.style.setProperty(
    '--utility-rail-mobile-horizontal-offset',
    `${config.utilityRailMobileHorizontalOffsetPx}px`,
  );
  targetRoot.style.setProperty(
    '--utility-rail-mobile-vertical-position',
    `${config.utilityRailMobileVerticalPositionVh}svh`,
  );
}

export function formatUtilityRailControlValue(value, control) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return String(value ?? '');
  if (control.display === 'px') return `${Math.round(numeric)}px`;
  if (control.display === '%') return `${Math.round(numeric)}%`;
  return String(numeric);
}
