const CONTROL_SECTIONS = {
  layout: {
    title: 'Layout',
    icon: 'LAY',
    defaultOpen: true,
    controls: [
      { id: 'portfolioNavTop', label: 'Header Top', cssVar: '--portfolio-nav-top', type: 'range', min: 8, max: 64, step: 1, unit: 'px', default: 24 },
      { id: 'portfolioStagePad', label: 'Stage Padding', cssVar: '--portfolio-stage-pad', type: 'range', min: 8, max: 48, step: 1, unit: 'px', default: 24 },
      { id: 'spawnInsetViewport', label: 'Spawn Inset', configKey: 'runtime.layout.spawnInsetViewport', type: 'range', min: 0.04, max: 0.24, step: 0.01, unit: '', default: 0.12, refresh: true },
      { id: 'headerTopSpacing', label: 'Header Spacing', configKey: 'runtime.layout.headerTopSpacing', type: 'range', min: 8, max: 64, step: 1, unit: 'px', default: 24 },
    ],
  },
  bodies: {
    title: 'Bodies',
    icon: 'BOD',
    defaultOpen: true,
    controls: [
      { id: 'minDiameterViewport', label: 'Min Size', configKey: 'runtime.bodies.minDiameterViewport', type: 'range', min: 0.12, max: 0.32, step: 0.01, unit: '', default: 0.2, refresh: true },
      { id: 'maxDiameterViewport', label: 'Max Size', configKey: 'runtime.bodies.maxDiameterViewport', type: 'range', min: 0.16, max: 0.42, step: 0.01, unit: '', default: 0.28, refresh: true },
      { id: 'blockWidthMultiplier', label: 'Block Width', configKey: 'runtime.bodies.blockWidthMultiplier', type: 'range', min: 1, max: 1.6, step: 0.01, unit: '', default: 1.24, refresh: true },
      { id: 'blockCornerRadius', label: 'Block Radius', configKey: 'runtime.bodies.blockCornerRadius', type: 'range', min: 12, max: 96, step: 1, unit: 'px', default: 48, refresh: true },
    ],
  },
  labeling: {
    title: 'Titles',
    icon: 'TXT',
    defaultOpen: false,
    controls: [
      { id: 'fontMinPx', label: 'Font Min', configKey: 'runtime.labeling.fontMinPx', type: 'range', min: 10, max: 28, step: 1, unit: 'px', default: 16, refresh: true },
      { id: 'fontMaxPx', label: 'Font Max', configKey: 'runtime.labeling.fontMaxPx', type: 'range', min: 16, max: 52, step: 1, unit: 'px', default: 34, refresh: true },
      { id: 'lineHeight', label: 'Line Height', configKey: 'runtime.labeling.lineHeight', type: 'range', min: 0.85, max: 1.2, step: 0.01, unit: '', default: 0.94, refresh: true },
      { id: 'innerPaddingRatio', label: 'Inner Padding', configKey: 'runtime.labeling.innerPaddingRatio', type: 'range', min: 0.08, max: 0.28, step: 0.01, unit: '', default: 0.19, refresh: true },
      { id: 'blockRotationRangeDeg', label: 'Block Rotation', configKey: 'runtime.labeling.blockRotationRangeDeg', type: 'range', min: 0, max: 14, step: 0.5, unit: 'deg', default: 6, refresh: true },
    ],
  },
  motion: {
    title: 'Motion',
    icon: 'MOV',
    defaultOpen: false,
    controls: [
      { id: 'neighborImpulse', label: 'Neighbor Impulse', configKey: 'runtime.motion.neighborImpulse', type: 'range', min: 0, max: 1200, step: 10, unit: '', default: 540 },
      { id: 'dragThrowMultiplier', label: 'Throw Multiplier', configKey: 'runtime.motion.dragThrowMultiplier', type: 'range', min: 0.2, max: 2, step: 0.05, unit: '', default: 1.05 },
      { id: 'openDurationMs', label: 'Open Duration', configKey: 'runtime.motion.openDurationMs', type: 'range', min: 200, max: 1500, step: 10, unit: 'ms', default: 820 },
      { id: 'colorFloodHoldMs', label: 'Color Hold', configKey: 'runtime.motion.colorFloodHoldMs', type: 'range', min: 0, max: 600, step: 10, unit: 'ms', default: 280 },
      { id: 'imageFadeMs', label: 'Image Fade', configKey: 'runtime.motion.imageFadeMs', type: 'range', min: 0, max: 600, step: 10, unit: 'ms', default: 220 },
      { id: 'titleRevealDelayMs', label: 'Title Delay', configKey: 'runtime.motion.titleRevealDelayMs', type: 'range', min: 200, max: 1500, step: 10, unit: 'ms', default: 1240 },
    ],
  },
  hero: {
    title: 'Open Hero',
    icon: 'OPEN',
    defaultOpen: false,
    controls: [
      { id: 'portfolioHeroTitleMax', label: 'Title Max', cssVar: '--portfolio-hero-title-max', type: 'range', min: 8, max: 24, step: 1, unit: 'ch', default: 14 },
      { id: 'portfolioImageVeilOpacity', label: 'Image Veil', cssVar: '--portfolio-image-veil-opacity', type: 'range', min: 0, max: 0.6, step: 0.01, unit: '', default: 0.14 },
      { id: 'portfolioScrollHintOffset', label: 'Scroll Hint', cssVar: '--portfolio-scroll-hint-offset', type: 'range', min: 12, max: 120, step: 1, unit: 'px', default: 52 },
      { id: 'reducedMotionDurationMs', label: 'Reduced Motion', configKey: 'runtime.behavior.reducedMotionDurationMs', type: 'range', min: 120, max: 600, step: 10, unit: 'ms', default: 320 },
    ],
  },
};

const ACTIVE_SECTION_KEYS = ['layout', 'bodies', 'labeling', 'motion', 'hero'];

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

function generateControlHTML(control, config, computedRoot) {
  const value = resolveControlValue(control, config, computedRoot);
  const numericValue = parseNumeric(value, control.default);
  return `
    <label class="control-row" data-control-id="${control.id}">
      <div class="control-row-header">
        <span class="control-label">${control.label}</span>
        <span class="control-value" id="${getControlValueId(control)}">${formatControlDisplay(control, numericValue)}</span>
      </div>
      <input type="range" id="${getControlInputId(control)}" min="${control.min}" max="${control.max}" step="${control.step}" value="${numericValue}" aria-label="${control.label}">
    </label>`;
}

function generateSectionHTML(section, config, computedRoot) {
  const controlsHtml = section.controls.map((control) => generateControlHTML(control, config, computedRoot)).join('');
  const openAttr = section.defaultOpen ? 'open' : '';
  return `
    <details class="panel-section-accordion" ${openAttr}>
      <summary class="panel-section-header">
        <span class="section-icon">${section.icon}</span>
        <span class="section-label">${section.title}</span>
      </summary>
      <div class="panel-section-content">${controlsHtml}</div>
    </details>`;
}

export function generatePanelSectionsHTML(config, computedRoot = null) {
  const rootStyle = computedRoot || getComputedStyle(document.documentElement);
  return ACTIVE_SECTION_KEYS
    .map((key) => generateSectionHTML(CONTROL_SECTIONS[key], config, rootStyle))
    .join('');
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
