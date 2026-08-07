const PREVIEW_VIEWPORTS = Object.freeze({
  mobile: Object.freeze({
    label: 'iPhone 17 Pro Max · 440 × 956',
    width: 440,
    height: 956,
    titleScale: 1,
  }),
  desktop: Object.freeze({
    label: 'Desktop · 1440 × 960',
    width: 1440,
    height: 960,
    titleScale: 1.465,
  }),
});

const FONT_FACES = Object.freeze({
  geist: Object.freeze({
    label: 'Geist',
    family: 'Geist',
    locals: [],
    openSource: true,
    weights: '100–900',
  }),
  displayHeavy: Object.freeze({
    label: 'Display Heavy',
    family: 'GT Era Display Heavy Prototype',
    file: 'GT-Era-Display-Heavy-Trial.woff2',
    locals: ['GT Era Display Trial Hv', 'GTEraDisplayTrial-Hv'],
  }),
  displayRegular: Object.freeze({
    label: 'Display Regular',
    family: 'GT Era Display Regular Prototype',
    file: 'GT-Era-Display-Regular-Trial.woff2',
    locals: ['GT Era Display Trial Rg', 'GTEraDisplayTrial-Rg'],
  }),
  displayMedium: Object.freeze({
    label: 'Display Medium',
    family: 'GT Era Display Medium Prototype',
    file: 'GT-Era-Display-Medium-Trial.woff2',
    locals: ['GT Era Display Trial Md', 'GTEraDisplayTrial-Md'],
  }),
  textRegular: Object.freeze({
    label: 'Text Regular',
    family: 'GT Era Text Regular Prototype',
    file: 'GT-Era-Text-Regular-Trial.woff2',
    locals: ['GT Era Text Trial Rg', 'GTEraTextTrial-Rg'],
  }),
  textMedium: Object.freeze({
    label: 'Text Medium',
    family: 'GT Era Text Medium Prototype',
    file: 'GT-Era-Text-Medium-Trial.woff2',
    locals: ['GT Era Text Trial Md', 'GTEraTextTrial-Md'],
  }),
  inter: Object.freeze({
    label: 'Inter',
    family: 'Inter',
    locals: [],
    openSource: true,
    weights: '100–900',
  }),
  onest: Object.freeze({
    label: 'Onest',
    family: 'Onest',
    locals: [],
    openSource: true,
    weights: '100–900',
  }),
  figtree: Object.freeze({
    label: 'Figtree',
    family: 'Figtree',
    locals: [],
    openSource: true,
    weights: '300–900',
  }),
  dmSans: Object.freeze({
    label: 'DM Sans',
    family: 'DM Sans',
    locals: [],
    openSource: true,
    weights: '100–1000',
  }),
  workSans: Object.freeze({
    label: 'Work Sans',
    family: 'Work Sans',
    locals: [],
    openSource: true,
    weights: '100–900',
  }),
  archivo: Object.freeze({
    label: 'Archivo',
    family: 'Archivo',
    locals: [],
    openSource: true,
    weights: '100–900',
  }),
  hankenGrotesk: Object.freeze({
    label: 'Hanken Grotesk',
    family: 'Hanken Grotesk',
    locals: [],
    openSource: true,
    weights: '100–900',
  }),
  instrumentSans: Object.freeze({
    label: 'Instrument Sans',
    family: 'Instrument Sans',
    locals: [],
    openSource: true,
    weights: '400–700',
  }),
  publicSans: Object.freeze({
    label: 'Public Sans',
    family: 'Public Sans',
    locals: [],
    openSource: true,
    weights: '100–900',
  }),
});

const BODY_FONT_OPTIONS = Object.freeze([
  Object.freeze({ value: 'textRegular', label: 'GT Era Text Regular — reference' }),
  Object.freeze({ value: 'onest', label: 'Onest — best balance' }),
  Object.freeze({ value: 'publicSans', label: 'Public Sans — metric closest' }),
  Object.freeze({ value: 'instrumentSans', label: 'Instrument Sans — visual closest' }),
  Object.freeze({ value: 'inter', label: 'Inter' }),
  Object.freeze({ value: 'workSans', label: 'Work Sans' }),
  Object.freeze({ value: 'dmSans', label: 'DM Sans' }),
  Object.freeze({ value: 'geist', label: 'Geist' }),
  Object.freeze({ value: 'figtree', label: 'Figtree' }),
  Object.freeze({ value: 'archivo', label: 'Archivo' }),
  Object.freeze({ value: 'hankenGrotesk', label: 'Hanken Grotesk' }),
]);

const LONDON_SVG_URL = '/prototypes/assets/london-wordmark.svg';
const OPEN_SOURCE_FONT_CSS_URL = 'https://fonts.googleapis.com/css2?family=Archivo:wght@100..900&family=DM+Sans:wght@100..1000&family=Figtree:wght@300..900&family=Geist:wght@100..900&family=Hanken+Grotesk:wght@100..900&family=Instrument+Sans:wght@400..700&family=Inter:wght@100..900&family=Onest:wght@100..900&family=Public+Sans:wght@100..900&family=Work+Sans:wght@100..900&display=swap';

const REFERENCE_UPPERCASE = Object.freeze({
  preset: 'reference',
  previewViewport: 'mobile',
  name: 'alex',
  titleCase: 'uppercase',
  titleSizePx: 44,
  titleWidthPercent: 88,
  titleTrackingEm: -0.025,
  titleLeading: 0.8,
  titleTopPercent: 52.5,
  secondaryOpacity: 0.72,
  bodyCut: 'textRegular',
  interfaceCut: 'same',
  bodySizePercent: 100,
  bodyLeadingPercent: 100,
  bodyTrackingEm: 0,
  menuCut: 'same',
  menuWeight: '600',
  menuTrackingEm: 0.04,
  clockTrackingEm: 0.015,
  clockYOffsetPx: 10,
  londonWidthPx: 72,
  londonYOffsetPx: 0,
});

const PRESETS = Object.freeze({
  reference: REFERENCE_UPPERCASE,
  titleCase: Object.freeze({
    ...REFERENCE_UPPERCASE,
    preset: 'titleCase',
    name: 'alexander',
    titleCase: 'title',
    titleSizePx: 38,
    titleTrackingEm: -0.01,
    titleLeading: 1.48,
  }),
  open: Object.freeze({
    ...REFERENCE_UPPERCASE,
    preset: 'open',
    name: 'alex',
    titleCase: 'uppercase',
    titleSizePx: 50,
    titleWidthPercent: 104,
    titleTrackingEm: 0,
    titleLeading: 1,
  }),
});

const CONTROL_GROUPS = Object.freeze([
  Object.freeze({
    title: 'Starting point',
    controls: Object.freeze([
      Object.freeze({
        id: 'preset',
        label: 'Preset',
        type: 'select',
        options: Object.freeze([
          Object.freeze({ value: 'reference', label: 'Previous uppercase' }),
          Object.freeze({ value: 'titleCase', label: 'Title-case study' }),
          Object.freeze({ value: 'open', label: 'Uppercase open' }),
          Object.freeze({ value: 'custom', label: 'Custom' }),
        ]),
      }),
      Object.freeze({
        id: 'previewViewport',
        label: 'Viewport',
        type: 'select',
        options: Object.freeze(Object.entries(PREVIEW_VIEWPORTS).map(([value, viewport]) => (
          Object.freeze({ value, label: viewport.label })
        ))),
      }),
      Object.freeze({
        id: 'name',
        label: 'Name',
        type: 'select',
        options: Object.freeze([
          Object.freeze({ value: 'alexander', label: 'Alexander Beck' }),
          Object.freeze({ value: 'alex', label: 'Alex Beck' }),
        ]),
      }),
      Object.freeze({
        id: 'titleCase',
        label: 'Case',
        type: 'select',
        options: Object.freeze([
          Object.freeze({ value: 'title', label: 'Title case' }),
          Object.freeze({ value: 'uppercase', label: 'Uppercase' }),
        ]),
      }),
    ]),
  }),
  Object.freeze({
    title: 'Title',
    controls: Object.freeze([
      Object.freeze({ id: 'titleSizePx', label: 'Size', type: 'number', min: 32, max: 58, step: 0.25, unit: 'px' }),
      Object.freeze({ id: 'titleWidthPercent', label: 'Width', type: 'number', min: 88, max: 112, step: 0.25, unit: '%' }),
      Object.freeze({ id: 'titleTrackingEm', label: 'Tracking', type: 'number', min: -0.08, max: 0.04, step: 0.001, unit: 'em' }),
      Object.freeze({ id: 'titleLeading', label: 'Leading', type: 'number', min: 0.75, max: 1.6, step: 0.01, unit: '' }),
    ]),
  }),
  Object.freeze({
    title: 'Composition',
    controls: Object.freeze([
      Object.freeze({ id: 'titleTopPercent', label: 'Vertical', type: 'number', min: 47, max: 59, step: 0.1, unit: '%' }),
      Object.freeze({ id: 'secondaryOpacity', label: 'Lower lines', type: 'number', min: 0.5, max: 1, step: 0.01, unit: '' }),
    ]),
  }),
  Object.freeze({
    title: 'Supporting type',
    controls: Object.freeze([
      Object.freeze({
        id: 'bodyCut',
        label: 'Text cut',
        type: 'select',
        options: BODY_FONT_OPTIONS,
      }),
      Object.freeze({ id: 'bodySizePercent', label: 'Text size', type: 'number', min: 92, max: 116, step: 0.25, unit: '%' }),
      Object.freeze({ id: 'bodyLeadingPercent', label: 'Text leading', type: 'number', min: 90, max: 116, step: 0.5, unit: '%' }),
      Object.freeze({ id: 'bodyTrackingEm', label: 'Text tracking', type: 'number', min: -0.025, max: 0.04, step: 0.001, unit: 'em' }),
      Object.freeze({
        id: 'menuCut',
        label: 'Menu face',
        type: 'select',
        options: Object.freeze([
          Object.freeze({ value: 'same', label: 'Same as text' }),
          Object.freeze({ value: 'displayMedium', label: 'Display Medium' }),
          Object.freeze({ value: 'displayHeavy', label: 'Display Heavy' }),
        ]),
      }),
      Object.freeze({
        id: 'menuWeight',
        label: 'Menu weight',
        type: 'select',
        options: Object.freeze([
          Object.freeze({ value: '400', label: 'Regular 400' }),
          Object.freeze({ value: '500', label: 'Medium 500' }),
          Object.freeze({ value: '600', label: 'SemiBold 600' }),
          Object.freeze({ value: '700', label: 'Bold 700' }),
        ]),
      }),
      Object.freeze({ id: 'menuTrackingEm', label: 'Menu tracking', type: 'number', min: -0.02, max: 0.12, step: 0.005, unit: 'em' }),
      Object.freeze({ id: 'clockTrackingEm', label: 'Clock tracking', type: 'number', min: -0.02, max: 0.08, step: 0.001, unit: 'em' }),
      Object.freeze({ id: 'clockYOffsetPx', label: 'Clock vertical', type: 'number', min: -4, max: 18, step: 0.25, unit: 'px' }),
      Object.freeze({ id: 'londonWidthPx', label: 'London width', type: 'number', min: 48, max: 120, step: 0.25, unit: 'px' }),
      Object.freeze({ id: 'londonYOffsetPx', label: 'London vertical', type: 'number', min: -12, max: 12, step: 0.25, unit: 'px' }),
    ]),
  }),
]);

const CONTROL_INDEX = new Map(
  CONTROL_GROUPS.flatMap((group) => group.controls.map((control) => [control.id, control])),
);

const QUERY_KEYS = Object.freeze({
  previewViewport: 'vp',
  name: 'name',
  titleCase: 'case',
  titleSizePx: 'ts',
  titleWidthPercent: 'tw',
  titleTrackingEm: 'tt',
  titleLeading: 'tl',
  titleTopPercent: 'ty',
  secondaryOpacity: 'to',
  bodyCut: 'bc',
  interfaceCut: 'ic',
  bodySizePercent: 'bs',
  bodyLeadingPercent: 'bl',
  bodyTrackingEm: 'bt',
  menuCut: 'mc',
  menuWeight: 'mw',
  menuTrackingEm: 'mt',
  clockTrackingEm: 'ct',
  clockYOffsetPx: 'cy',
  londonWidthPx: 'lw',
  londonYOffsetPx: 'ly',
});

const SUPPORTING_SIZE_SELECTORS = Object.freeze([
  '.legend',
  '.legend__item',
  '.description',
  '.philosophy',
  '.decorative-script',
  '.caption',
  '#time-display',
  '.edge-caption__line',
  '.simulation-focus-pill',
  '.simulation-focus-modal__title',
  '.simulation-focus-row__name',
  '.gate-back span',
]);

const frame = document.querySelector('#prototype-site');
const previewRegion = document.querySelector('.prototype-preview');
const controlsHost = document.querySelector('[data-controls]');
const panel = document.querySelector('.typography-parameterizer');
const status = document.querySelector('[data-status]');
const params = new URLSearchParams(window.location.search);
const isCapture = params.get('capture') === '1';

document.body.dataset.capture = isCapture ? 'true' : 'false';

let state = readStateFromUrl(params);
let applyScheduled = false;
let frameReady = false;
let londonSvgMarkupPromise;
const openFontStylesheetPromises = new WeakMap();

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function decimalsForStep(step) {
  const text = String(step);
  return text.includes('.') ? text.length - text.indexOf('.') - 1 : 0;
}

function normalizeValue(control, rawValue, fallback) {
  if (control.type === 'select') {
    return control.options.some((option) => option.value === rawValue) ? rawValue : fallback;
  }

  const value = Number(rawValue);
  if (!Number.isFinite(value)) return fallback;
  const clamped = clamp(value, control.min, control.max);
  const decimals = decimalsForStep(control.step);
  return Number(clamped.toFixed(decimals));
}

function readStateFromUrl(urlParams) {
  const next = { ...REFERENCE_UPPERCASE };
  for (const [id, key] of Object.entries(QUERY_KEYS)) {
    if (!urlParams.has(key)) continue;
    const control = CONTROL_INDEX.get(id);
    if (!control) continue;
    next[id] = normalizeValue(control, urlParams.get(key), next[id]);
  }
  next.preset = urlParams.has('preset') && PRESETS[urlParams.get('preset')]
    ? urlParams.get('preset')
    : 'custom';

  const hasAuthoredValues = Object.values(QUERY_KEYS).some((key) => urlParams.has(key));
  if (!hasAuthoredValues) next.preset = 'reference';
  return next;
}

function writeStateToUrl() {
  const nextUrl = new URL(window.location.href);
  nextUrl.searchParams.delete('variant');
  nextUrl.searchParams.delete('lm');
  nextUrl.searchParams.set('preset', state.preset);
  for (const [id, key] of Object.entries(QUERY_KEYS)) {
    nextUrl.searchParams.set(key, String(state[id]));
  }
  window.history.replaceState({}, '', nextUrl);
}

function fontFaceCss() {
  return Object.values(FONT_FACES).filter((font) => font.file || font.locals.length).map((font) => {
    const sources = [
      ...(font.file
        ? [`url('/prototypes/.gt-era-trial-fonts/${font.file}') format('woff2')`]
        : []),
      ...font.locals.map((localName) => `local('${localName}')`),
    ];

    return `
    @font-face {
      font-family: '${font.family}';
      src:
        ${sources.join(',\n        ')};
      font-style: normal;
      font-weight: 400;
      font-display: block;
    }
  `;
  }).join('\n');
}

function ensureOpenFontStylesheet(frameDocument) {
  if (openFontStylesheetPromises.has(frameDocument)) {
    return openFontStylesheetPromises.get(frameDocument);
  }

  const promise = new Promise((resolve, reject) => {
    const existing = frameDocument.querySelector('#gt-era-open-fonts');
    if (existing?.dataset.loaded === 'true') {
      resolve();
      return;
    }

    const link = existing ?? frameDocument.createElement('link');
    link.id = 'gt-era-open-fonts';
    link.rel = 'stylesheet';
    link.href = OPEN_SOURCE_FONT_CSS_URL;
    link.addEventListener('load', () => {
      link.dataset.loaded = 'true';
      resolve();
    }, { once: true });
    link.addEventListener('error', () => {
      reject(new Error('Unable to load the open-source comparison fonts.'));
    }, { once: true });
    if (!existing) frameDocument.head.append(link);
  });

  openFontStylesheetPromises.set(frameDocument, promise);
  return promise;
}

function titleLines(config) {
  const name = config.name === 'alex' ? 'Alex Beck' : 'Alexander Beck';
  const lines = [name, 'Creative &', 'Technologist.'];
  return config.titleCase === 'uppercase'
    ? lines.map((line) => line.toLocaleUpperCase('en-GB'))
    : lines;
}

function ensureTitle(frameDocument) {
  const host = frameDocument.querySelector('#simulations');
  if (!host) return null;

  let title = frameDocument.querySelector('#gt-era-prototype-title');
  if (!title) {
    title = frameDocument.createElement('div');
    title.id = 'gt-era-prototype-title';
    title.setAttribute('aria-hidden', 'true');
    host.append(title);
  }
  return title;
}

function getLondonSvgMarkup() {
  if (!londonSvgMarkupPromise) {
    londonSvgMarkupPromise = fetch(LONDON_SVG_URL).then((response) => {
      if (!response.ok) throw new Error(`Unable to load London SVG (${response.status})`);
      return response.text();
    });
  }
  return londonSvgMarkupPromise;
}

async function applyLondonWordmark(frameDocument) {
  const location = frameDocument.querySelector('.location-name');
  if (!location) return;

  const markup = await getLondonSvgMarkup();
  const parsed = new DOMParser().parseFromString(markup, 'image/svg+xml');
  const svg = frameDocument.importNode(parsed.documentElement, true);
  svg.setAttribute('aria-hidden', 'true');
  svg.setAttribute('focusable', 'false');
  location.classList.add('location-name--svg');
  location.setAttribute('aria-label', 'London');
  location.replaceChildren(svg);
}

function prototypeCss(config) {
  const bodyFont = FONT_FACES[config.bodyCut] ?? FONT_FACES.geist;
  const interfaceFont = bodyFont;
  const menuFont = config.menuCut === 'same'
    ? bodyFont
    : FONT_FACES[config.menuCut] ?? FONT_FACES.displayMedium;
  const menuWeight = menuFont.openSource ? config.menuWeight : '400';
  const previewViewport = PREVIEW_VIEWPORTS[config.previewViewport] ?? PREVIEW_VIEWPORTS.mobile;
  const titleSizePx = config.titleSizePx * previewViewport.titleScale;

  return `${fontFaceCss()}
    :root {
      --gt-era-prototype-body: '${bodyFont.family}';
      --gt-era-prototype-interface: '${interfaceFont.family}';
      --gt-era-prototype-title: '${FONT_FACES.displayHeavy.family}';
      --gt-era-prototype-menu: '${menuFont.family}';
      --abs-font-sans: var(--gt-era-prototype-body);
      --abs-font-mono: var(--gt-era-prototype-body);
      --abs-font-headline: var(--gt-era-prototype-title);
    }

    body,
    button,
    input,
    textarea,
    select,
    .legend,
    .legend__item,
    .decorative-script,
    .caption,
    #time-display,
    .edge-caption__line,
    .simulation-focus-modal,
    .simulation-focus-row,
    .gate-back {
      font-family: var(--gt-era-prototype-body) !important;
      font-weight: 400 !important;
      font-synthesis: none;
      font-optical-sizing: auto;
    }

    .simulation-focus-pill,
    .simulation-focus-modal__title,
    .simulation-focus-row__name,
    .gate-back span {
      font-family: var(--gt-era-prototype-interface) !important;
      font-weight: 400 !important;
      font-synthesis: none;
      font-optical-sizing: auto;
    }

    .button-bar__label {
      font-family: var(--gt-era-prototype-menu) !important;
      font-weight: ${menuWeight} !important;
      font-synthesis: none;
      font-optical-sizing: auto;
      letter-spacing: ${config.menuTrackingEm}em !important;
    }

    .location-name--svg {
      display: inline-flex;
      width: ${config.londonWidthPx}px;
      height: auto;
      align-items: center;
      color: var(--text-logo);
      line-height: 0;
      vertical-align: middle;
      transform: translateY(${config.londonYOffsetPx}px);
    }

    #site-year .meta-stack {
      position: relative;
      display: inline-block;
      transform: translateY(${config.clockYOffsetPx}px);
    }

    #site-year .meta-location {
      position: absolute;
      right: 0;
      bottom: calc(100% + 4px);
      display: block;
      line-height: 0;
      pointer-events: none;
    }

    #site-year .meta-separator {
      display: none;
    }

    #time-display,
    #time-display.time-display--wide {
      contain: layout style;
      display: block;
      inline-size: 10.5ch;
      min-width: 10.5ch;
      overflow: visible;
      text-align: right;
      white-space: nowrap;
    }

    .location-name--svg svg {
      display: block;
      width: 100%;
      height: auto;
      overflow: visible;
    }

    .ti,
    [class^='ti-'],
    [class*=' ti-'] {
      font-family: 'tabler-icons' !important;
    }

    #simulation-title-canvas {
      opacity: 0 !important;
      visibility: hidden !important;
    }

    .panel-toggle-btn,
    #panelDock {
      display: none !important;
    }

    #gt-era-prototype-title {
      position: absolute;
      top: ${config.titleTopPercent}%;
      left: 50%;
      z-index: 9;
      width: 94%;
      margin: 0;
      padding: 0;
      color: var(--text-logo);
      font-family: var(--gt-era-prototype-title);
      font-size: ${titleSizePx}px;
      font-style: normal;
      font-weight: 400;
      font-kerning: normal;
      font-synthesis: none;
      letter-spacing: ${config.titleTrackingEm}em;
      line-height: ${config.titleLeading};
      text-align: center;
      white-space: nowrap;
      pointer-events: none;
      transform: translate(-50%, -50%) scaleX(${config.titleWidthPercent / 100});
      transform-origin: 50% 50%;
    }

    #gt-era-prototype-title span {
      display: block;
    }

    #gt-era-prototype-title span + span {
      color: inherit;
      opacity: ${config.secondaryOpacity};
    }
  `;
}

function supportingElements(frameDocument) {
  const elements = new Set();
  for (const selector of SUPPORTING_SIZE_SELECTORS) {
    frameDocument.querySelectorAll(selector).forEach((element) => {
      if (!element.closest('.location-name')) elements.add(element);
    });
  }
  return [...elements];
}

function applySupportingMetrics(frameDocument, config) {
  const view = frameDocument.defaultView;
  if (!view) return;

  for (const element of supportingElements(frameDocument)) {
    if (!element.dataset.gtEraBaseSize) {
      const computed = view.getComputedStyle(element);
      const size = Number.parseFloat(computed.fontSize);
      const lineHeight = Number.parseFloat(computed.lineHeight);
      const tracking = computed.letterSpacing === 'normal'
        ? 0
        : Number.parseFloat(computed.letterSpacing);
      element.dataset.gtEraBaseSize = String(Number.isFinite(size) ? size : 16);
      element.dataset.gtEraBaseLeading = String(Number.isFinite(lineHeight) ? lineHeight : size * 1.2);
      element.dataset.gtEraBaseTracking = String(Number.isFinite(tracking) ? tracking : 0);
    }

    const baseSize = Number(element.dataset.gtEraBaseSize);
    const baseLeading = Number(element.dataset.gtEraBaseLeading);
    const baseTracking = Number(element.dataset.gtEraBaseTracking);
    const nextSize = baseSize * config.bodySizePercent / 100;
    const nextLeading = baseLeading * config.bodyLeadingPercent / 100;
    const nextTracking = element.matches('#time-display')
      ? nextSize * config.clockTrackingEm
      : baseTracking + nextSize * config.bodyTrackingEm;

    element.style.setProperty('font-size', `${nextSize}px`, 'important');
    element.style.setProperty('line-height', `${nextLeading}px`, 'important');
    element.style.setProperty('letter-spacing', `${nextTracking}px`, 'important');
  }
}

async function applyState({ updateUrl = true } = {}) {
  applyPreviewViewport();
  resizePreview();
  const frameDocument = frame.contentDocument;
  const title = frameDocument && ensureTitle(frameDocument);
  if (!frameDocument?.documentElement || !title) return false;

  title.replaceChildren(...titleLines(state).map((line) => {
    const span = frameDocument.createElement('span');
    span.textContent = line;
    return span;
  }));

  let style = frameDocument.querySelector('#gt-era-typography-prototype-style');
  if (!style) {
    style = frameDocument.createElement('style');
    style.id = 'gt-era-typography-prototype-style';
    frameDocument.head.append(style);
  }
  style.textContent = prototypeCss(state);

  await ensureOpenFontStylesheet(frameDocument);

  const bodyFont = FONT_FACES[state.bodyCut] ?? FONT_FACES.geist;
  const interfaceFont = bodyFont;
  const menuFont = state.menuCut === 'same'
    ? bodyFont
    : FONT_FACES[state.menuCut] ?? FONT_FACES.displayMedium;
  const menuWeight = menuFont.openSource ? state.menuWeight : '400';

  await Promise.all([
    frameDocument.fonts.load(`16px '${FONT_FACES.displayHeavy.family}'`),
    frameDocument.fonts.load(`400 16px '${bodyFont.family}'`),
    frameDocument.fonts.load(`400 16px '${interfaceFont.family}'`),
    frameDocument.fonts.load(`${menuWeight} 16px '${menuFont.family}'`),
  ]);
  await frameDocument.fonts.ready;

  await applyLondonWordmark(frameDocument);
  applySupportingMetrics(frameDocument, state);
  syncControls();
  if (updateUrl) writeStateToUrl();

  status.textContent = 'LIVE';
  frameReady = true;
  document.body.dataset.prototypeReady = 'true';
  window.dispatchEvent(new CustomEvent('gt-era-prototype:ready', {
    detail: { config: { ...state } },
  }));
  return true;
}

function scheduleApply() {
  if (applyScheduled) return;
  applyScheduled = true;
  window.requestAnimationFrame(() => {
    applyScheduled = false;
    void applyState();
  });
}

function setStateValue(id, value) {
  const control = CONTROL_INDEX.get(id);
  if (!control) return;

  if (id === 'preset') {
    if (value !== 'custom' && PRESETS[value]) state = { ...PRESETS[value] };
    else state.preset = 'custom';
  } else {
    state[id] = normalizeValue(control, value, state[id]);
    state.preset = 'custom';
  }
  scheduleApply();
}

function createNumberControl(control) {
  const wrapper = document.createElement('span');
  wrapper.className = 'parameterizer-control parameterizer-control--number';

  const range = document.createElement('input');
  range.type = 'range';
  range.min = String(control.min);
  range.max = String(control.max);
  range.step = String(control.step);
  range.dataset.control = control.id;
  range.setAttribute('aria-label', control.label);

  const number = document.createElement('input');
  number.type = 'number';
  number.min = String(control.min);
  number.max = String(control.max);
  number.step = String(control.step);
  number.dataset.control = control.id;
  number.setAttribute('aria-label', `${control.label} exact value`);

  range.addEventListener('input', () => setStateValue(control.id, range.value));
  number.addEventListener('input', () => setStateValue(control.id, number.value));
  wrapper.append(range, number);
  return wrapper;
}

function createSelectControl(control) {
  const wrapper = document.createElement('span');
  wrapper.className = 'parameterizer-control parameterizer-control--select';

  const select = document.createElement('select');
  select.dataset.control = control.id;
  select.setAttribute('aria-label', control.label);
  for (const optionDefinition of control.options) {
    const option = document.createElement('option');
    option.value = optionDefinition.value;
    option.textContent = optionDefinition.label;
    select.append(option);
  }
  select.addEventListener('change', () => setStateValue(control.id, select.value));
  wrapper.append(select);
  return wrapper;
}

function buildControls() {
  const fragment = document.createDocumentFragment();
  for (const group of CONTROL_GROUPS) {
    const folder = document.createElement('details');
    folder.className = 'parameterizer-folder';
    folder.open = true;

    const summary = document.createElement('summary');
    summary.className = 'parameterizer-folder-title';
    summary.textContent = group.title;
    folder.append(summary);

    for (const control of group.controls) {
      const row = document.createElement('label');
      row.className = 'parameterizer-row';

      const label = document.createElement('span');
      label.className = 'parameterizer-label';
      label.textContent = control.label;
      label.title = control.label;

      row.append(
        label,
        control.type === 'number' ? createNumberControl(control) : createSelectControl(control),
      );
      folder.append(row);
    }
    fragment.append(folder);
  }
  controlsHost.replaceChildren(fragment);
}

function syncControls() {
  document.querySelectorAll('[data-control]').forEach((input) => {
    const id = input.dataset.control;
    const value = state[id];
    if (String(input.value) !== String(value)) input.value = String(value);
  });
}

function setCollapsed(collapsed) {
  panel.dataset.collapsed = collapsed ? 'true' : 'false';
  const collapseButton = document.querySelector('[data-collapse]');
  collapseButton.setAttribute('aria-expanded', collapsed ? 'false' : 'true');
  collapseButton.textContent = collapsed ? 'SHOW' : 'HIDE';
  resizePreview();
}

function applyPreviewViewport() {
  const previewViewport = PREVIEW_VIEWPORTS[state.previewViewport] ?? PREVIEW_VIEWPORTS.mobile;
  document.documentElement.style.setProperty('--preview-width', `${previewViewport.width}px`);
  document.documentElement.style.setProperty('--preview-height', `${previewViewport.height}px`);
  document.body.dataset.previewViewport = state.previewViewport;
  previewRegion.setAttribute('aria-label', `${previewViewport.label} website preview`);
}

function resizePreview() {
  if (isCapture) {
    document.documentElement.style.setProperty('--preview-scale', '1');
    return;
  }

  const panelVisible = panel.dataset.collapsed !== 'true' && window.innerWidth > 760;
  const reservedWidth = panelVisible ? 380 : 0;
  const availableWidth = Math.max(240, window.innerWidth - reservedWidth - 24);
  const availableHeight = Math.max(320, window.innerHeight - 24);
  const previewViewport = PREVIEW_VIEWPORTS[state.previewViewport] ?? PREVIEW_VIEWPORTS.mobile;
  const scale = Math.min(
    1,
    availableWidth / previewViewport.width,
    availableHeight / previewViewport.height,
  );
  document.documentElement.style.setProperty('--preview-scale', String(scale));
}

async function copyShareUrl() {
  writeStateToUrl();
  const button = document.querySelector('[data-action="copy"]');
  try {
    await navigator.clipboard.writeText(window.location.href);
    button.textContent = 'COPIED';
  } catch {
    window.prompt('Copy this prototype link', window.location.href);
    button.textContent = 'LINK READY';
  }
  window.setTimeout(() => { button.textContent = 'COPY LINK'; }, 1400);
}

function waitForHome() {
  const deadline = window.performance.now() + 12000;
  const poll = () => {
    if (frame.contentDocument?.querySelector('#hero-title')) {
      void applyState({ updateUrl: false });
      return;
    }
    if (window.performance.now() < deadline) window.requestAnimationFrame(poll);
    else status.textContent = 'FAILED';
  };
  poll();
}

buildControls();
syncControls();
applyPreviewViewport();
resizePreview();

frame.addEventListener('load', waitForHome);
window.addEventListener('resize', resizePreview);

document.querySelector('[data-collapse]').addEventListener('click', () => setCollapsed(true));
document.querySelector('[data-launcher]').addEventListener('click', () => setCollapsed(false));
document.querySelector('[data-action="reset"]').addEventListener('click', () => {
  state = { ...REFERENCE_UPPERCASE };
  scheduleApply();
});
document.querySelector('[data-action="copy"]').addEventListener('click', () => void copyShareUrl());

window.__GT_ERA_TYPOGRAPHY_PROTOTYPE__ = Object.freeze({
  getFontCatalogue: () => BODY_FONT_OPTIONS.map(({ value, label }) => ({
    value,
    label,
    family: FONT_FACES[value]?.family ?? null,
    openSource: FONT_FACES[value]?.openSource === true,
    weights: FONT_FACES[value]?.weights ?? '400',
  })),
  applyConfig: async (partialConfig) => {
    for (const [id, value] of Object.entries(partialConfig ?? {})) {
      const control = CONTROL_INDEX.get(id);
      if (control) state[id] = normalizeValue(control, value, state[id]);
    }
    state.preset = 'custom';
    return applyState();
  },
  reset: async () => {
    state = { ...REFERENCE_UPPERCASE };
    return applyState();
  },
  getReport: () => {
    const frameDocument = frame.contentDocument;
    const title = frameDocument?.querySelector('#gt-era-prototype-title');
    const bodyFont = FONT_FACES[state.bodyCut] ?? FONT_FACES.textRegular;
    const menuFont = state.menuCut === 'same'
      ? bodyFont
      : FONT_FACES[state.menuCut] ?? FONT_FACES.displayMedium;
    const menuWeight = menuFont.openSource ? state.menuWeight : '400';
    const getFont = (selector) => {
      const element = frameDocument?.querySelector(selector);
      return element ? frame.contentWindow.getComputedStyle(element).fontFamily : null;
    };
    return {
      ready: frameReady,
      config: { ...state },
      previewViewport: {
        width: frame.contentWindow?.innerWidth ?? null,
        height: frame.contentWindow?.innerHeight ?? null,
      },
      fonts: {
        title: getFont('#gt-era-prototype-title'),
        body: getFont('.decorative-script'),
        legend: getFont('.legend__item'),
        interface: getFont('.simulation-focus-pill'),
        navigation: getFont('.button-bar__label'),
        london: 'SVG wordmark',
      },
      fontAvailability: {
        body: frameDocument?.fonts.check(`400 16px '${bodyFont.family}'`) ?? false,
        navigation: frameDocument?.fonts.check(`${menuWeight} 16px '${menuFont.family}'`) ?? false,
      },
      titleText: title ? [...title.children].map((line) => line.textContent) : [],
      titleLineBounds: title
        ? [...title.children].map((line) => line.getBoundingClientRect().toJSON())
        : [],
      titleBounds: title?.getBoundingClientRect().toJSON() ?? null,
      londonMark: (() => {
        const mark = frameDocument?.querySelector('.location-name--svg');
        const path = mark?.querySelector('path');
        if (!mark) return null;
        return {
          bounds: mark.getBoundingClientRect().toJSON(),
          color: frame.contentWindow.getComputedStyle(mark).color,
          fill: path ? frame.contentWindow.getComputedStyle(path).fill : null,
        };
      })(),
      clock: (() => {
        const clock = frameDocument?.querySelector('#time-display');
        const stack = frameDocument?.querySelector('#site-year .meta-stack');
        if (!clock || !stack) return null;
        return {
          text: clock.textContent.trim(),
          bounds: clock.getBoundingClientRect().toJSON(),
          letterSpacing: frame.contentWindow.getComputedStyle(clock).letterSpacing,
          stackTransform: frame.contentWindow.getComputedStyle(stack).transform,
        };
      })(),
      panel: {
        width: panel.getBoundingClientRect().width,
        headerHeight: panel.querySelector('.parameterizer-header')?.getBoundingClientRect().height ?? null,
        folderHeaderHeight: panel.querySelector('.parameterizer-folder-title')?.getBoundingClientRect().height ?? null,
        rowHeight: panel.querySelector('.parameterizer-row')?.getBoundingClientRect().height ?? null,
      },
    };
  },
});
