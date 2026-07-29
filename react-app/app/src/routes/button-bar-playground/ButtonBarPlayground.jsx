import { useEffect, useRef, useState } from 'react';
import { ShellButtonBar } from '../../components/app/ShellButtonBar.jsx';
import { SHELL_ROUTE_TABS } from '../../lib/routes.js';
import { getSimulationPaletteSnapshot } from '../../palette/simulationPaletteController.js';
import './button-bar-playground.css';
import './button-bar-playground-spatial-states.css';
import '../../components/app/shell-button-bar-dominant.css';

const PLAYGROUND_THEME_STORAGE_KEY = 'button-bar-playground-theme-v1';
const WALKMAN_CONFIG_STORAGE_KEY = 'button-bar-playground-walkman-config-v4';
const DEFAULT_WALKMAN_CONFIG = Object.freeze({
  perspective: 1720,
  originX: 50,
  originY: -55,
  bankTiltX: 1,
  bankYawY: 0,
  restingLift: 0.5,
  activeLift: 13,
  bodyContrast: 19,
  rimSoftness: 65,
  layerCount: 3,
  flatShadowEdge: 3,
  flatShadowBlur: 5.25,
  flatLightEdge: 2.5,
  flatLightBlur: 2.5,
});

const FLAT_CONTROLS = Object.freeze([
  { id: 'flatShadowEdge', label: 'Shadow edge', min: 0, max: 6, step: 0.25, unit: 'px' },
  { id: 'flatShadowBlur', label: 'Shadow blur', min: 0, max: 8, step: 0.25, unit: 'px' },
  { id: 'flatLightEdge', label: 'Light edge', min: 0, max: 4, step: 0.25, unit: 'px' },
  { id: 'flatLightBlur', label: 'Light blur', min: 0, max: 4, step: 0.25, unit: 'px' },
]);

const SPATIAL_CAMERA_CONTROLS = Object.freeze([
  { id: 'perspective', label: 'Perspective', min: 240, max: 2000, step: 10, unit: 'px' },
  { id: 'originX', label: 'Origin X', min: -400, max: 400, step: 5, unit: 'vh' },
  { id: 'originY', label: 'Origin Y', min: -400, max: 400, step: 5, unit: 'vh' },
  { id: 'bankTiltX', label: 'Bank tilt X', min: -18, max: 18, step: 0.5, unit: 'deg' },
  { id: 'bankYawY', label: 'Bank yaw Y', min: -12, max: 12, step: 0.5, unit: 'deg' },
]);

const SPATIAL_BODY_CONTROLS = Object.freeze([
  { id: 'restingLift', label: 'Rest / low lift', min: 0, max: 12, step: 0.5, unit: 'px' },
  { id: 'activeLift', label: 'Active / high lift', min: 6, max: 24, step: 0.5, unit: 'px' },
  { id: 'layerCount', label: 'Body layers', min: 2, max: 6, step: 1, unit: '' },
  { id: 'bodyContrast', label: 'Body contrast', min: 0, max: 50, step: 1, unit: '%' },
  { id: 'rimSoftness', label: 'Rim softness', min: 0, max: 100, step: 1, unit: '%' },
]);

const PLAYGROUND_CONTROL_GROUPS = Object.freeze([
  { id: 'flat-buttons', title: 'Flat buttons', controls: FLAT_CONTROLS },
  { id: 'spatial-camera', title: 'Spatial camera', controls: SPATIAL_CAMERA_CONTROLS },
  { id: 'spatial-body', title: 'Spatial body', controls: SPATIAL_BODY_CONTROLS },
]);

const PLAYGROUND_CONTROLS = Object.freeze(
  PLAYGROUND_CONTROL_GROUPS.flatMap((group) => group.controls),
);

const PLAYGROUND_TIME_PALETTE = getSimulationPaletteSnapshot();
const PLAYGROUND_TIME_COLORS = PLAYGROUND_TIME_PALETTE.colors;

function getContrastInk(hex) {
  const normalized = String(hex || '').replace('#', '');
  if (!/^[0-9a-f]{6}$/i.test(normalized)) return '#ffffff';
  const channels = [0, 2, 4].map((offset) => {
    const channel = Number.parseInt(normalized.slice(offset, offset + 2), 16) / 255;
    return channel <= 0.04045
      ? channel / 12.92
      : ((channel + 0.055) / 1.055) ** 2.4;
  });
  const luminance = (channels[0] * 0.2126) + (channels[1] * 0.7152) + (channels[2] * 0.0722);
  return luminance > 0.179 ? '#101113' : '#ffffff';
}

const PLAYGROUND_PALETTE_STYLE = Object.freeze({
  ...PLAYGROUND_TIME_COLORS.reduce((style, color, index) => {
    style[`--ball-${index + 1}`] = color;
    return style;
  }, {}),
  '--button-bar-accent-home': PLAYGROUND_TIME_COLORS[3],
  '--button-bar-accent-home-ink': getContrastInk(PLAYGROUND_TIME_COLORS[3]),
  '--button-bar-accent-sound': PLAYGROUND_TIME_COLORS[3],
  '--button-bar-accent-sound-ink': getContrastInk(PLAYGROUND_TIME_COLORS[3]),
  '--button-bar-accent-portfolio': PLAYGROUND_TIME_COLORS[5],
  '--button-bar-accent-portfolio-ink': getContrastInk(PLAYGROUND_TIME_COLORS[5]),
  '--button-bar-accent-about': PLAYGROUND_TIME_COLORS[6],
  '--button-bar-accent-about-ink': getContrastInk(PLAYGROUND_TIME_COLORS[6]),
  '--button-bar-accent-contact': PLAYGROUND_TIME_COLORS[7],
  '--button-bar-accent-contact-ink': getContrastInk(PLAYGROUND_TIME_COLORS[7]),
});

const DOMINANT_TAB_VARIANT = Object.freeze({
  id: 'dominant-tab',
  number: '11',
  title: 'Dominant tab',
  structure: 'proportional tab rhythm',
  family: 'flat',
  palette: 'mixed',
  usesRouteAccent: true,
});

const RAISED_SELECTION_VARIANT = Object.freeze({
  id: 'spatial-raised-mono',
  number: '12',
  title: 'Raised selection',
  structure: 'raised selective-colour extrusion',
  family: 'spatial',
  palette: 'mixed',
  spatialModel: 'raised',
  spatialMaterial: 'selection-colour',
  usesRouteAccent: true,
});

const BUTTON_BAR_VARIANT_GROUPS = Object.freeze([
  {
    id: 'shortlist',
    anchor: '11 / 12',
    title: 'Shortlist',
    variants: [DOMINANT_TAB_VARIANT, RAISED_SELECTION_VARIANT],
  },
  {
    id: 'physical-studies',
    anchor: '00–06',
    title: 'How little depth is enough?',
    variants: [
      {
        id: 'final-menu-bar',
        number: '00',
        title: 'Final menu bar',
        structure: 'terraced wall channels',
        composition: ['stepped-cavity'],
      },
      {
        id: 'hairline-cutout',
        number: '01',
        title: 'Hairline cutout',
        structure: 'fine horizontal cooling lines',
      },
      {
        id: 'light-edge',
        number: '02',
        title: 'Light edge',
        structure: 'stacked edge-lit fins',
      },
      {
        id: 'continuous-rail',
        number: '03',
        title: 'Continuous rail',
        structure: 'long recessed guide rails',
      },
      {
        id: 'precision-gasket',
        number: '04',
        title: 'Precision gasket',
        structure: 'paired horizontal pressure bands',
      },
      {
        id: 'stepped-cavity',
        number: '05',
        title: 'Stepped cavity',
        structure: 'terraced wall channels',
      },
      {
        number: '06',
        id: 'ribbed-monolith',
        title: 'Ribbed monolith',
        structure: 'dense ribbed wall blocks',
      },
    ],
  },
  {
    id: 'flat-studies',
    anchor: '07–10',
    title: 'What if there were no depth at all?',
    variants: [
      {
        id: 'type-rail',
        number: '07',
        title: 'Type rail',
        structure: 'flat typographic register',
        family: 'flat',
        palette: 'mono',
      },
      {
        id: 'signal-blocks',
        number: '08',
        title: 'Signal blocks',
        structure: 'solid colour register',
        family: 'flat',
        palette: 'colour',
        usesRouteAccent: true,
      },
      {
        id: 'binary-grid',
        number: '09',
        title: 'Binary grid',
        structure: 'binary segment grid',
        family: 'flat',
        palette: 'mono',
      },
      {
        id: 'split-field',
        number: '10',
        title: 'Split field',
        structure: 'hard-stop colour bands',
        family: 'flat',
        palette: 'colour',
        usesRouteAccent: true,
      },
    ],
  },
  {
    id: 'spatial-studies',
    anchor: '13–17',
    title: 'Can one edge describe the whole body?',
    variants: [
      {
        id: 'spatial-raised-colour',
        number: '13',
        title: 'Raised selection / colour',
        structure: 'raised colour extrusion',
        family: 'spatial',
        palette: 'colour',
        spatialModel: 'raised',
        spatialMaterial: 'colour',
        usesRouteAccent: true,
      },
      {
        id: 'spatial-pressed-mono',
        number: '14',
        title: 'Walkman pressed mode',
        structure: 'pressed monochrome extrusion',
        family: 'spatial',
        palette: 'mono',
        spatialModel: 'pressed',
        spatialMaterial: 'mono',
      },
      {
        id: 'spatial-pressed-colour',
        number: '15',
        title: 'Walkman pressed mode / colour',
        structure: 'pressed colour extrusion',
        family: 'spatial',
        palette: 'colour',
        spatialModel: 'pressed',
        spatialMaterial: 'colour',
        usesRouteAccent: true,
      },
      {
        id: 'spatial-inverted-mono',
        number: '16',
        title: 'Inverted camera',
        structure: 'inverted monochrome extrusion',
        family: 'spatial',
        palette: 'mono',
        spatialModel: 'inverted',
        spatialMaterial: 'mono',
      },
      {
        id: 'spatial-inverted-colour',
        number: '17',
        title: 'Inverted camera / colour',
        structure: 'inverted colour extrusion',
        family: 'spatial',
        palette: 'colour',
        spatialModel: 'inverted',
        spatialMaterial: 'colour',
        usesRouteAccent: true,
      },
    ],
  },
]);

function readPlaygroundTheme() {
  const authoredTheme = document.documentElement.dataset.buttonBarPlaygroundTheme;
  if (authoredTheme === 'light' || authoredTheme === 'dark') return authoredTheme;
  try {
    const storedTheme = localStorage.getItem(PLAYGROUND_THEME_STORAGE_KEY);
    if (storedTheme === 'light' || storedTheme === 'dark') return storedTheme;
  } catch {
    // Storage can be unavailable in private browsing contexts.
  }
  return 'dark';
}

function readWalkmanConfig() {
  try {
    const stored = JSON.parse(localStorage.getItem(WALKMAN_CONFIG_STORAGE_KEY));
    return PLAYGROUND_CONTROLS.reduce((config, control) => {
      const value = Number(stored?.[control.id]);
      config[control.id] = Number.isFinite(value)
        ? Math.min(control.max, Math.max(control.min, value))
        : DEFAULT_WALKMAN_CONFIG[control.id];
      return config;
    }, {});
  } catch {
    return { ...DEFAULT_WALKMAN_CONFIG };
  }
}

function WalkmanConfigPanel({ config, onChange, onClose, onReset }) {
  return (
    <aside className="parameterizer-panel walkman-config-panel" aria-label="Button geometry controls">
      <div className="parameterizer-header">
        <span>Button geometry</span>
        <button type="button" onClick={onClose} aria-label="Close button geometry controls">Close</button>
      </div>
      <div className="parameterizer-scroll">
        {PLAYGROUND_CONTROL_GROUPS.map((group) => (
          <details className="parameterizer-folder" open key={group.id}>
            <summary className="parameterizer-folder-title">{group.title}</summary>
            <div className="walkman-config-panel__rows">
              {group.controls.map((control) => (
                <label className="parameterizer-row" htmlFor={`walkman-${control.id}`} key={control.id}>
                  <span className="parameterizer-label">{control.label}</span>
                  <span className="parameterizer-control">
                    <input
                      id={`walkman-${control.id}`}
                      type="range"
                      min={control.min}
                      max={control.max}
                      step={control.step}
                      value={config[control.id]}
                      onChange={(event) => onChange(control.id, Number(event.target.value))}
                    />
                  </span>
                  <output className="parameterizer-value" htmlFor={`walkman-${control.id}`}>
                    {config[control.id]}{control.unit}
                  </output>
                </label>
              ))}
            </div>
          </details>
        ))}
        <div className="walkman-config-panel__note">
          Pressed mode swaps the low and high lifts. Inverted camera reverses the bank tilt.
        </div>
      </div>
      <div className="parameterizer-actions">
        <button type="button" onClick={onReset}>Reset defaults</button>
      </div>
    </aside>
  );
}

function PlaygroundThemeToggle({ theme, onToggle }) {
  const isDark = theme === 'dark';
  const nextTheme = isDark ? 'light' : 'dark';

  return (
    <button
      type="button"
      className="button-bar-playground__theme-toggle"
      aria-label={`Switch playground to ${nextTheme} mode`}
      aria-pressed={isDark}
      data-state={theme}
      onClick={() => onToggle(nextTheme)}
    >
      <span className="button-bar-playground__theme-toggle-track" aria-hidden="true">
        <span>Light</span>
        <span>Dark</span>
        <i />
      </span>
    </button>
  );
}

function SpatialButtonBody() {
  return (
    <span className="spatial-button-layers" aria-hidden="true">
      <i className="spatial-button-layer" />
      <i className="spatial-button-layer" />
      <i className="spatial-button-layer" />
      <i className="spatial-button-layer" />
      <i className="spatial-button-layer" />
      <i className="spatial-button-layer" />
    </span>
  );
}

function ButtonBarVariant({
  variant,
  activeRouteId,
  playgroundTheme,
  headingLevel = 'h2',
  onSelectRoute,
  onToggleTheme,
}) {
  const sampleRef = useRef(null);
  const Heading = headingLevel;
  const headingId = 'button-bar-variant-' + variant.id;
  const sampleClassName = [
    'button-bar-playground__sample',
    'button-bar-playground__sample--' + variant.id,
    ...(variant.composition || []).map((id) => 'button-bar-playground__sample--' + id),
  ].join(' ');

  useEffect(() => {
    const nav = sampleRef.current?.querySelector('[data-button-bar-nav]');
    nav?.setAttribute('aria-label', variant.title + ' button bar preview');
  }, [activeRouteId, variant.title]);

  return (
    <article
      ref={sampleRef}
      className={sampleClassName}
      aria-labelledby={headingId}
      data-route-accent={variant.usesRouteAccent ? 'true' : undefined}
      data-variant-family={variant.family}
      data-palette={variant.palette}
      data-spatial-model={variant.spatialModel}
      data-spatial-material={variant.spatialMaterial}
    >
      <header className="button-bar-playground__sample-header">
        <span className="button-bar-playground__sample-number" aria-hidden="true">
          {variant.number}
        </span>
        <div className="button-bar-playground__sample-copy">
          <Heading id={headingId}>{variant.title}</Heading>
        </div>
      </header>
      <div className="button-bar-playground__stage">
        <div
          className="button-bar-playground__side button-bar-playground__side--left"
          aria-hidden="true"
          data-structure={variant.structure}
        ><i /><i /><i /><i /><i /></div>
        <ShellButtonBar
          activeRouteId={activeRouteId}
          className="button-bar-playground__bar"
          materialVariant={variant.id === 'dominant-tab' ? 'dominant-tab' : undefined}
          navClassName="button-bar-playground__tabs"
          onRouteSelect={onSelectRoute}
          preview
          previewTheme={playgroundTheme}
          onPreviewThemeChange={onToggleTheme}
          renderRouteButtonDecoration={variant.family === 'spatial' ? SpatialButtonBody : undefined}
          renderSecondaryButtonDecoration={variant.family === 'spatial' ? SpatialButtonBody : undefined}
        />
        <div
          className="button-bar-playground__side button-bar-playground__side--right"
          aria-hidden="true"
          data-structure={variant.structure}
        ><i /><i /><i /><i /><i /></div>
      </div>
    </article>
  );
}

export function ButtonBarPlayground() {
  const [activeRouteId, setActiveRouteId] = useState('contact');
  const [theme, setTheme] = useState(readPlaygroundTheme);
  const [walkmanConfig, setWalkmanConfig] = useState(readWalkmanConfig);
  const [isWalkmanPanelOpen, setIsWalkmanPanelOpen] = useState(false);
  const activeTab = SHELL_ROUTE_TABS.find((tab) => tab.routeId === activeRouteId)
    || SHELL_ROUTE_TABS[0];

  useEffect(() => {
    const root = document.documentElement;
    const body = document.body;
    root.dataset.buttonBarPlaygroundTheme = theme;
    body.dataset.buttonBarPlaygroundTheme = theme;
    root.style.colorScheme = theme;
    try {
      localStorage.setItem(PLAYGROUND_THEME_STORAGE_KEY, theme);
    } catch {
      // Theme still works for the current session when storage is unavailable.
    }
  }, [theme]);

  useEffect(() => {
    try {
      localStorage.setItem(WALKMAN_CONFIG_STORAGE_KEY, JSON.stringify(walkmanConfig));
    } catch {
      // Live tuning remains available when storage is unavailable.
    }
  }, [walkmanConfig]);

  useEffect(() => {
    const root = document.documentElement;
    const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
    const finePointer = matchMedia('(hover: hover) and (pointer: fine)');
    let animationFrame = 0;
    let cameraX = 0;
    let cameraY = 0;

    const applyCamera = () => {
      animationFrame = 0;
      root.style.setProperty('--button-bar-playground-camera-x', `${cameraX.toFixed(3)}deg`);
      root.style.setProperty('--button-bar-playground-camera-y', `${cameraY.toFixed(3)}deg`);
    };

    const handlePointerMove = (event) => {
      if (reducedMotion.matches || !finePointer.matches) return;
      cameraX = ((event.clientY / innerHeight) - 0.5) * -2.4;
      cameraY = ((event.clientX / innerWidth) - 0.5) * 3.2;
      if (!animationFrame) animationFrame = requestAnimationFrame(applyCamera);
    };

    window.addEventListener('pointermove', handlePointerMove, { passive: true });
    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      if (animationFrame) cancelAnimationFrame(animationFrame);
      root.style.removeProperty('--button-bar-playground-camera-x');
      root.style.removeProperty('--button-bar-playground-camera-y');
    };
  }, []);

  const walkmanStyle = {
    ...PLAYGROUND_PALETTE_STYLE,
    '--spatial-perspective': `${walkmanConfig.perspective}px`,
    '--spatial-origin-x': `${walkmanConfig.originX}vh`,
    '--spatial-origin-y': `${walkmanConfig.originY}vh`,
    '--spatial-bank-tilt-x': `${walkmanConfig.bankTiltX}deg`,
    '--spatial-bank-yaw-y': `${walkmanConfig.bankYawY}deg`,
    '--spatial-resting-lift': `${walkmanConfig.restingLift}px`,
    '--spatial-active-lift': `${walkmanConfig.activeLift}px`,
    '--spatial-body-contrast': `${walkmanConfig.bodyContrast}%`,
    '--spatial-rim-blur': `${1 + (walkmanConfig.rimSoftness * 0.05)}px`,
    '--flat-pressed-shadow-edge': `${walkmanConfig.flatShadowEdge}px`,
    '--flat-pressed-shadow-blur': `${walkmanConfig.flatShadowBlur}px`,
    '--flat-pressed-light-edge': `${walkmanConfig.flatLightEdge}px`,
    '--flat-pressed-light-blur': `${walkmanConfig.flatLightBlur}px`,
  };

  return (
    <>
      <PlaygroundThemeToggle theme={theme} onToggle={setTheme} />
      <button
        type="button"
        className="button-bar-playground__config-toggle"
        aria-expanded={isWalkmanPanelOpen}
        aria-controls="walkman-config-panel"
        onClick={() => setIsWalkmanPanelOpen((isOpen) => !isOpen)}
      >
        Tune depth
      </button>
      <main
        className="button-bar-playground"
        aria-labelledby="button-bar-playground-title"
        data-playground-theme={theme}
        data-time-palette={PLAYGROUND_TIME_PALETTE.paletteId}
        data-config-panel-open={isWalkmanPanelOpen ? 'true' : 'false'}
        data-spatial-layers={walkmanConfig.layerCount}
        style={walkmanStyle}
      >
      <header className="button-bar-playground__header">
        <div className="button-bar-playground__intro">
          <div className="button-bar-playground__eyebrow">
            <span>Playground / Button Bar</span>
          </div>
          <h1 id="button-bar-playground-title">Button bar studies</h1>
        </div>
        <div className="button-bar-playground__readout" role="status" aria-live="polite">
          <span>Previewing</span>
          <strong>{activeTab.label}</strong>
        </div>
      </header>

      <section className="button-bar-playground__samples" aria-label="Button bar variants">
        {BUTTON_BAR_VARIANT_GROUPS.map((group) => {
          const groupHeadingId = 'button-bar-group-' + group.id;

          return (
            <section
              key={group.id}
              className={'button-bar-playground__variant-group button-bar-playground__variant-group--' + group.id}
              aria-label={group.title ? undefined : 'Current button bar studies'}
              aria-labelledby={group.title ? groupHeadingId : undefined}
            >
              {group.title ? (
                <header className="button-bar-playground__group-header">
                  <span className="button-bar-playground__group-anchor" aria-hidden="true">
                    {group.anchor}
                  </span>
                  <div className="button-bar-playground__group-copy">
                    <h2 id={groupHeadingId}>{group.title}</h2>
                  </div>
                </header>
              ) : null}
              {group.variants.map((variant) => {
                const preview = (
                  <ButtonBarVariant
                    key={variant.id}
                    variant={variant}
                    activeRouteId={activeRouteId}
                    playgroundTheme={theme}
                    headingLevel={group.title ? 'h3' : 'h2'}
                    onSelectRoute={setActiveRouteId}
                    onToggleTheme={setTheme}
                  />
                );

                return group.id === 'shortlist' ? (
                  <div
                    key={variant.id}
                    className={`button-bar-playground__shortlist-item button-bar-playground__variant-group--${variant.family}-studies`}
                  >
                    {preview}
                  </div>
                ) : preview;
              })}
            </section>
          );
        })}
      </section>
      </main>
      {isWalkmanPanelOpen ? (
        <div id="walkman-config-panel">
          <WalkmanConfigPanel
            config={walkmanConfig}
            onChange={(id, value) => setWalkmanConfig((current) => ({ ...current, [id]: value }))}
            onClose={() => setIsWalkmanPanelOpen(false)}
            onReset={() => setWalkmanConfig({ ...DEFAULT_WALKMAN_CONFIG })}
          />
        </div>
      ) : null}
    </>
  );
}
