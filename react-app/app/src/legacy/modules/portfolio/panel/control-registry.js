const CONTROL_SECTIONS = {
  layout: {
    title: 'Layout',
    icon: 'LAY',
    defaultOpen: true,
    controls: [
      { id: 'portfolioNavTop', label: 'Header top (extra)', cssVar: '--portfolio-nav-top', type: 'range', min: 0, max: 48, step: 1, unit: 'px', default: 0 },
      { id: 'portfolioStagePad', label: 'Stage Padding', cssVar: '--portfolio-stage-pad', type: 'range', min: 8, max: 48, step: 1, unit: 'px', default: 24 },
      { id: 'spawnInsetViewport', label: 'Spawn Inset', configKey: 'runtime.layout.spawnInsetViewport', type: 'range', min: 0.04, max: 0.24, step: 0.01, unit: '', default: 0.1, refresh: true },
      { id: 'headerTopSpacing', label: 'Header Spacing', configKey: 'runtime.layout.headerTopSpacing', type: 'range', min: 8, max: 64, step: 1, unit: 'px', default: 24 },
    ],
  },
  bodies: {
    title: 'Bodies',
    icon: 'BOD',
    defaultOpen: true,
    controls: [
      {
        id: 'minDiameterViewport',
        label: 'Min Size',
        configKey: 'runtime.bodies.minDiameterViewport',
        type: 'range',
        min: 0.08,
        max: 1,
        step: 0.01,
        unit: '',
        default: 0.105,
        refresh: true,
        hint: 'Min diameter as a fraction of √(inner pit width×height). Same relative scale on mobile and desktop; clamped so bodies stay inside the wall.',
      },
      {
        id: 'maxDiameterViewport',
        label: 'Max Size',
        configKey: 'runtime.bodies.maxDiameterViewport',
        type: 'range',
        min: 0.1,
        max: 1,
        step: 0.01,
        unit: '',
        default: 0.22,
        refresh: true,
        hint: 'Max diameter as a fraction of √(inner pit area). Paired with Min Size and Diameter scale in pit-mode.',
      },
      {
        id: 'wallRestitution',
        label: 'Wall Bounce',
        configKey: 'runtime.motion.wallRestitution',
        type: 'range',
        min: 0,
        max: 0.6,
        step: 0.01,
        unit: '',
        default: 0.3,
        hint: 'How much bodies bounce off walls. 0 = dead stop, 0.3 = thick rubber, 0.6 = bouncy.',
      },
      {
        id: 'collisionRestitution',
        label: 'Body Bounce',
        configKey: 'runtime.motion.collisionRestitution',
        type: 'range',
        min: 0,
        max: 0.6,
        step: 0.01,
        unit: '',
        default: 0.35,
        hint: 'How much bodies bounce off each other. 0 = no bounce, 0.35 = thick rubber, 0.6 = bouncy.',
      },
    ],
  },
  labeling: {
    title: 'Titles',
    icon: 'TXT',
    defaultOpen: false,
    controls: [
      { id: 'fontDesktopPx', label: 'Desktop Size', configKey: 'runtime.labeling.fontDesktopPx', type: 'range', min: 16, max: 40, step: 1, unit: 'px', default: 28, refresh: true },
      { id: 'fontMobilePx', label: 'Mobile Size', configKey: 'runtime.labeling.fontMobilePx', type: 'range', min: 14, max: 30, step: 1, unit: 'px', default: 20, refresh: true },
      { id: 'lineHeight', label: 'Title Line Height', configKey: 'runtime.labeling.titleLineHeight', type: 'range', min: 0.6, max: 1, step: 0.01, unit: '', default: 0.76, refresh: true },
      { id: 'innerPaddingRatio', label: 'Inner Padding', configKey: 'runtime.labeling.innerPaddingRatio', type: 'range', min: 0.08, max: 0.28, step: 0.01, unit: '', default: 0.18, refresh: true },
      { id: 'blockRotationRangeDeg', label: 'Block Rotation', configKey: 'runtime.labeling.blockRotationRangeDeg', type: 'range', min: 0, max: 10, step: 0.5, unit: 'deg', default: 3.5, refresh: true },
    ],
  },
  motion: {
    title: 'Motion',
    icon: 'MOV',
    defaultOpen: false,
    controls: [
      { id: 'gravityScale', label: 'Gravity', configKey: 'runtime.motion.gravityScale', type: 'range', min: 0.15, max: 1.2, step: 0.01, unit: '', default: 0.82, refresh: true },
      { id: 'massMultiplier', label: 'Mass', configKey: 'runtime.motion.massMultiplier', type: 'range', min: 0.5, max: 2, step: 0.05, unit: '', default: 1, refresh: true },
      { id: 'neighborImpulse', label: 'Neighbor Impulse', configKey: 'runtime.motion.neighborImpulse', type: 'range', min: 0, max: 1200, step: 10, unit: '', default: 0 },
      { id: 'dragThrowMultiplier', label: 'Throw Multiplier', configKey: 'runtime.motion.dragThrowMultiplier', type: 'range', min: 0.2, max: 2, step: 0.05, unit: '', default: 1.05 },
      { id: 'openDurationMs', label: 'Open Duration', configKey: 'runtime.motion.openDurationMs', type: 'range', min: 200, max: 1500, step: 10, unit: 'ms', default: 546 },
      { id: 'colorFloodHoldMs', label: 'Color Hold', configKey: 'runtime.motion.colorFloodHoldMs', type: 'range', min: 0, max: 600, step: 10, unit: 'ms', default: 120 },
      { id: 'imageFadeMs', label: 'Image Fade', configKey: 'runtime.motion.imageFadeMs', type: 'range', min: 0, max: 600, step: 10, unit: 'ms', default: 220 },
      { id: 'titleRevealDelayMs', label: 'Title Delay', configKey: 'runtime.motion.titleRevealDelayMs', type: 'range', min: 200, max: 1500, step: 10, unit: 'ms', default: 480 },
    ],
  },
  hero: {
    title: 'Open Hero',
    icon: 'OPEN',
    defaultOpen: false,
    controls: [
      { id: 'portfolioHeroTitleMax', label: 'Title Max', cssVar: '--portfolio-hero-title-max', type: 'range', min: 8, max: 24, step: 1, unit: 'ch', default: 14 },
      { id: 'portfolioImageVeilOpacity', label: 'Image Veil', cssVar: '--portfolio-image-veil-opacity', type: 'range', min: 0, max: 0.6, step: 0.01, unit: '', default: 0.14 },
      {
        id: 'heroKenBurnsDurationMs',
        label: 'Ken Burns Duration',
        configKey: 'runtime.motion.heroKenBurnsDurationMs',
        type: 'range',
        min: 12000,
        max: 60000,
        step: 500,
        unit: 'ms',
        default: 28000,
        hint: 'Base duration for the open-hero camera move. Higher values feel more cinematic and deliberate.',
      },
      {
        id: 'heroKenBurnsPanPx',
        label: 'Ken Burns Drift',
        configKey: 'runtime.motion.heroKenBurnsPanPx',
        type: 'range',
        min: 6,
        max: 36,
        step: 1,
        unit: 'px',
        default: 18,
        hint: 'How far the hero image pans across the frame during the move.',
      },
      {
        id: 'heroKenBurnsZoomPct',
        label: 'Ken Burns Zoom',
        configKey: 'runtime.motion.heroKenBurnsZoomPct',
        type: 'range',
        min: 6,
        max: 30,
        step: 1,
        unit: '%',
        default: 18,
        hint: 'Total zoom added from the opening frame to the end of the move.',
      },
      { id: 'portfolioScrollHintOffset', label: 'Scroll Hint', cssVar: '--portfolio-scroll-hint-offset', type: 'range', min: 12, max: 120, step: 1, unit: 'px', default: 52 },
      { id: 'reducedMotionDurationMs', label: 'Reduced Motion', configKey: 'runtime.behavior.reducedMotionDurationMs', type: 'range', min: 120, max: 600, step: 10, unit: 'ms', default: 320 },
    ],
  },
  drawer: {
    title: 'Drawer',
    icon: 'DRV',
    defaultOpen: false,
    controls: [
      {
        id: 'portfolioDrawerSeatInset',
        label: 'Drawer inset',
        cssVar: '--portfolio-drawer-seat-inset',
        type: 'range',
        min: 0,
        max: 24,
        step: 1,
        unit: 'px',
        default: 0,
        hint: 'Optional recess from the sheet clip. Rim lighting uses the same band thickness as the inner wall.',
      },
      {
        id: 'portfolioDrawerEdgeWidth',
        label: 'Edge width',
        cssVar: '--portfolio-drawer-edge-width',
        type: 'range',
        min: 0.5,
        max: 6,
        step: 0.5,
        unit: 'px',
        default: 2,
        hint: 'Band thickness; pair with Light Group “Edge width” on the inner wall for a flush insert read.',
      },
      {
        id: 'portfolioDrawerTopLightOpacity',
        label: 'Top light',
        cssVar: '--portfolio-drawer-top-light-opacity',
        type: 'range',
        min: 0,
        max: 0.55,
        step: 0.01,
        unit: '',
        default: 0.32,
        hint: 'Highlight on the drawer top edge (inverse of the wall’s top shadow lip). Brightest at the center, fades toward corners.',
      },
      {
        id: 'portfolioDrawerRimShadowOpacity',
        label: 'Side & bottom shadow',
        cssVar: '--portfolio-drawer-rim-shadow-opacity',
        type: 'range',
        min: 0,
        max: 0.55,
        step: 0.01,
        unit: '',
        default: 0.3,
        hint: 'Shadow bands on the drawer bottom and sides (inverse of the wall’s bottom + side light rims). Side strength tracks bottom at the same ratio as the wall rim.',
      },
    ],
  },
};

/** All sections whose controls participate in bind + save snapshot. */
const ACTIVE_SECTION_KEYS = ['layout', 'bodies', 'labeling', 'motion', 'hero', 'drawer'];

/** Page master-group only: pit rim is injected under Simulation (see panel-dock). */
const PORTFOLIO_PAGE_SECTION_KEYS = ['layout', 'bodies', 'labeling', 'motion', 'hero', 'drawer'];

function getControlInputId(control) {
  return `${control.id}Slider`;
}

function getControlValueId(control) {
  return `${control.id}Val`;
}

function getConfigValue(config, path) {
  if (!config || !path) return undefined;
  const parts = String(path).split('.');
  let cursor = config;
  for (const part of parts) {
    if (!cursor || typeof cursor !== 'object') return undefined;
    cursor = cursor[part];
  }
  return cursor;
}

function setConfigValue(config, path, value) {
  if (!config || !path) return;
  const parts = String(path).split('.');
  let cursor = config;
  for (let index = 0; index < parts.length - 1; index += 1) {
    const part = parts[index];
    if (!cursor[part] || typeof cursor[part] !== 'object') cursor[part] = {};
    cursor = cursor[part];
  }
  cursor[parts[parts.length - 1]] = value;
}

function parseNumeric(value, fallback) {
  const numeric = Number.parseFloat(value);
  if (Number.isFinite(numeric)) return numeric;
  const fallbackNumeric = Number.parseFloat(fallback);
  return Number.isFinite(fallbackNumeric) ? fallbackNumeric : 0;
}

function formatControlDisplay(control, value) {
  const numeric = parseNumeric(value, control.default);
  return control.unit ? `${numeric}${control.unit}` : String(numeric);
}

function formatCssValue(control, numericValue) {
  return control.unit ? `${numericValue}${control.unit}` : String(numericValue);
}

function getAllControls() {
  return ACTIVE_SECTION_KEYS.flatMap((sectionKey) => CONTROL_SECTIONS[sectionKey]?.controls || []);
}

function resolveControlValue(control, config, computedRoot) {
  if (control.cssVar) {
    const configured = config?.cssVars?.[control.cssVar];
    if (configured !== undefined) return configured;
    const computed = computedRoot?.getPropertyValue(control.cssVar)?.trim();
    if (computed) return computed;
  }
  if (control.configKey) {
    const configured = getConfigValue(config, control.configKey);
    if (configured !== undefined) return configured;
  }
  return control.default;
}

function escapeAttr(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;');
}

function generatePortfolioControlRow(control, config, computedRoot) {
  const rawValue = resolveControlValue(control, config, computedRoot);
  const numericValue = parseNumeric(rawValue, control.default);
  const sliderId = getControlInputId(control);
  const valId = getControlValueId(control);
  const hintTitleAttr = control.hint ? ` title="${escapeAttr(control.hint)}"` : '';
  const hintHtml = control.hint ? `<p class="control-hint">${escapeAttr(control.hint)}</p>` : '';
  const display = formatControlDisplay(control, numericValue);
  return `
      <label class="control-row" data-control-id="${escapeAttr(control.id)}">
        <div class="control-row-header">
          <span class="control-label"${hintTitleAttr}>${escapeAttr(control.label)}</span>
          <span class="control-value" id="${valId}">${escapeAttr(display)}</span>
        </div>
        <input type="range" id="${sliderId}" min="${control.min}" max="${control.max}" step="${control.step}" value="${numericValue}" aria-label="${escapeAttr(control.label)}">
      </label>
      ${hintHtml}`;
}

function generatePortfolioSectionHTML(sectionKey, config, computedRoot) {
  const section = CONTROL_SECTIONS[sectionKey];
  if (!section?.controls?.length) return '';
  const body = section.controls.map((c) => generatePortfolioControlRow(c, config, computedRoot)).join('');
  const openAttr = section.defaultOpen ? ' open' : '';
  const iconHtml = section.icon ? `<span class="section-icon">${section.icon}</span>` : '';
  return `
    <details class="panel-section-accordion"${openAttr}>
      <summary class="panel-section-header">
        ${iconHtml}
        <span class="section-label">${escapeAttr(section.title)}</span>
      </summary>
      <div class="panel-section-content">${body}</div>
    </details>`;
}

export function generatePortfolioPitChromePanelHTML() {
  return '';
}

export function generatePanelSectionsHTML(config, computedRoot = null) {
  const root = computedRoot
    || (typeof document !== 'undefined' ? getComputedStyle(document.documentElement) : null);
  return PORTFOLIO_PAGE_SECTION_KEYS.map((key) => generatePortfolioSectionHTML(key, config, root)).join('');
}

export function generatePanelHTML(config) {
  return `
    ${generatePanelSectionsHTML(config)}
    <div class="panel-section panel-section--action">
      <button id="savePortfolioConfigBtn" class="primary">Save Portfolio Config</button>
    </div>
    <div class="panel-footer"><kbd>/</kbd> panel</div>`;
}

export function bindRegisteredControls(config, options = {}) {
  if (!config || typeof config !== 'object') return;
  if (!config.cssVars || typeof config.cssVars !== 'object') config.cssVars = {};
  if (!config.runtime || typeof config.runtime !== 'object') config.runtime = {};
  const root = document.documentElement;
  const computedRoot = getComputedStyle(root);
  const { onMetricsChange, onRuntimeChange } = options;

  for (const control of getAllControls()) {
    const input = document.getElementById(getControlInputId(control));
    const valueNode = document.getElementById(getControlValueId(control));
    if (!input) continue;

    const rawValue = resolveControlValue(control, config, computedRoot);
    input.value = String(parseNumeric(rawValue, control.default));
    if (valueNode) valueNode.textContent = formatControlDisplay(control, input.value);

    input.addEventListener('input', (event) => {
      const numericValue = parseNumeric(event.target.value, control.default);
      if (control.cssVar) {
        const cssValue = formatCssValue(control, numericValue);
        root.style.setProperty(control.cssVar, cssValue);
        config.cssVars[control.cssVar] = cssValue;
      }
      if (control.configKey) {
        setConfigValue(config, control.configKey, numericValue);
      }
      if (valueNode) valueNode.textContent = formatControlDisplay(control, numericValue);

      if (control.refresh && typeof onMetricsChange === 'function') onMetricsChange();
      if (control.configKey && typeof onRuntimeChange === 'function') onRuntimeChange(config.runtime);
    });
  }
}

export function buildConfigSnapshot(config) {
  const snapshot = {
    cssVars: {},
    runtime: {
      layout: {},
      bodies: {},
      labeling: {},
      motion: {},
      openHero: {},
      behavior: {},
    },
  };
  const computedRoot = getComputedStyle(document.documentElement);

  for (const control of getAllControls()) {
    if (control.cssVar) {
      const value = computedRoot.getPropertyValue(control.cssVar).trim()
        || config?.cssVars?.[control.cssVar]
        || formatCssValue(control, control.default);
      snapshot.cssVars[control.cssVar] = String(value);
      continue;
    }
    if (control.configKey) {
      setConfigValue(snapshot, control.configKey, parseNumeric(getConfigValue(config, control.configKey), control.default));
    }
  }

  snapshot.runtime.openHero.imageVeilOpacity = parseNumeric(
    snapshot.cssVars['--portfolio-image-veil-opacity'],
    0.14
  );
  snapshot.runtime.openHero.titleMaxWidthCh = parseNumeric(
    snapshot.cssVars['--portfolio-hero-title-max'],
    14
  );
  snapshot.runtime.openHero.scrollHintOffsetVh = parseNumeric(
    snapshot.cssVars['--portfolio-scroll-hint-offset'],
    52
  );

  return snapshot;
}

export { CONTROL_SECTIONS };
