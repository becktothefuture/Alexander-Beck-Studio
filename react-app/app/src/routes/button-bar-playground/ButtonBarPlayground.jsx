import { useEffect, useRef, useState } from 'react';
import { ShellButtonBar } from '../../components/app/ShellButtonBar.jsx';
import { SHELL_ROUTE_TABS } from '../../lib/routes.js';
import './button-bar-playground.css';

const PLAYGROUND_THEME_STORAGE_KEY = 'button-bar-playground-theme-v1';
const WALKMAN_CONFIG_STORAGE_KEY = 'button-bar-playground-walkman-config-v2';
const DEFAULT_WALKMAN_CONFIG = Object.freeze({
  perspective: 980,
  originX: 50,
  originY: 50,
  bodyDepth: 8,
  rimSoftness: 42,
  layerCount: 6,
});

const WALKMAN_CONTROLS = Object.freeze([
  { id: 'perspective', label: 'Perspective', min: 240, max: 2000, step: 10, unit: 'px' },
  { id: 'originX', label: 'Origin X', min: -400, max: 400, step: 5, unit: 'vh' },
  { id: 'originY', label: 'Origin Y', min: -400, max: 400, step: 5, unit: 'vh' },
  { id: 'bodyDepth', label: 'Body depth', min: 3, max: 16, step: 1, unit: 'px' },
  { id: 'rimSoftness', label: 'Rim softness', min: 0, max: 100, step: 1, unit: '%' },
  { id: 'layerCount', label: 'Body layers', min: 1, max: 6, step: 1, unit: '' },
]);

const BUTTON_BAR_VARIANT_GROUPS = Object.freeze([
  {
    id: 'physical-studies',
    anchor: '00–06',
    title: 'How little depth is enough?',
    description: 'The production solution and six fitted-wall studies establish the current mechanical baseline.',
    variants: [
      {
        id: 'final-menu-bar',
        number: '00',
        title: 'Final menu bar',
        description: 'The production choice: Precision Gasket controls with Stepped Cavity wall relief.',
        structure: 'terraced wall channels',
        composition: ['stepped-cavity'],
      },
      {
        id: 'hairline-cutout',
        number: '01',
        title: 'Hairline cutout',
        description: 'Flush wall plates defined by a single dark seam; the selected plate sinks cleanly into its aperture.',
        structure: 'fine horizontal cooling lines',
      },
      {
        id: 'light-edge',
        number: '02',
        title: 'Light edge',
        description: 'A dark upper cut and a pale lower edge give the flush plates a precise machined fit.',
        structure: 'stacked edge-lit fins',
      },
      {
        id: 'continuous-rail',
        number: '03',
        title: 'Continuous rail',
        description: 'The buttons become one fitted control strip, with fine internal joints and a deeper selected bay.',
        structure: 'long recessed guide rails',
      },
      {
        id: 'precision-gasket',
        number: '04',
        title: 'Precision gasket',
        description: 'A narrow double seam suggests a soft mechanical gasket without making the controls look raised.',
        structure: 'paired horizontal pressure bands',
      },
      {
        id: 'stepped-cavity',
        number: '05',
        title: 'Stepped cavity',
        description: 'Each cutout has a shallow inner step; selection drops to the second level with restrained depth.',
        structure: 'terraced wall channels',
      },
      {
        number: '06',
        id: 'ribbed-monolith',
        title: 'Ribbed monolith',
        description: 'The bar sits inside a single architectural wall object whose fine ribs stop around each control cutout.',
        structure: 'dense ribbed wall blocks',
      },
    ],
  },
  {
    id: 'flat-studies',
    anchor: '07–11',
    title: 'What if there were no depth at all?',
    description: 'Five studies remove lighting, shadows, and physical displacement. Interest comes from type, proportion, rhythm, and solid colour.',
    variants: [
      {
        id: 'type-rail',
        number: '07',
        title: 'Type rail',
        description: 'The button bodies disappear. One reversed label block is enough to make the active route decisive.',
        structure: 'flat typographic register',
        family: 'flat',
        palette: 'mono',
      },
      {
        id: 'signal-blocks',
        number: '08',
        title: 'Signal blocks',
        description: 'Every route becomes a solid colour field; selection is expressed through saturation and ink inversion.',
        structure: 'solid colour register',
        family: 'flat',
        palette: 'colour',
        usesRouteAccent: true,
      },
      {
        id: 'binary-grid',
        number: '09',
        title: 'Binary grid',
        description: 'A strict monochrome control grid uses only rules, solid cells, and black–white inversion.',
        structure: 'binary segment grid',
        family: 'flat',
        palette: 'mono',
      },
      {
        id: 'split-field',
        number: '10',
        title: 'Split field',
        description: 'A hard-edged route-colour field occupies part of every tab and expands across the selected state.',
        structure: 'hard-stop colour bands',
        family: 'flat',
        palette: 'colour',
        usesRouteAccent: true,
      },
      {
        id: 'dominant-tab',
        number: '11',
        title: 'Dominant tab',
        description: 'The active route claims more width and a solid signal colour while inactive routes compress around it.',
        structure: 'proportional tab rhythm',
        family: 'flat',
        palette: 'mixed',
        usesRouteAccent: true,
      },
    ],
  },
  {
    id: 'spatial-studies',
    anchor: '12–20',
    title: 'How quiet can a physical button be?',
    description: 'Nine Walkman-like banks sit directly on the wall, using broad surfaces and restrained edges to create depth without visual noise.',
    variants: [
      {
        id: 'walkman-bank',
        number: '12',
        title: 'Walkman bank',
        description: 'The original mechanical key language, simplified and mounted directly to the wall without a surrounding tray.',
        structure: 'direct-mounted mechanical keys',
        family: 'spatial',
        palette: 'mono',
      },
      {
        id: 'walkman-polished',
        number: '13',
        title: 'Polished plastic',
        description: 'A soft inner rim borrows the lightest body tone, smoothing the transition between face and edge.',
        structure: 'soft polished rim',
        family: 'spatial',
        palette: 'mono',
      },
      {
        id: 'walkman-soft-body',
        number: '14',
        title: 'Soft body',
        description: 'One broad tonal body and a feathered lower contact shadow create depth with almost no visible strata.',
        structure: 'broad soft body',
        family: 'spatial',
        palette: 'mono',
      },
      {
        id: 'walkman-low-profile',
        number: '15',
        title: 'Low profile',
        description: 'A shallower body and wider highlight make the controls feel moulded rather than assembled from layers.',
        structure: 'shallow moulded keys',
        family: 'spatial',
        palette: 'mono',
      },
      {
        id: 'walkman-inverted',
        number: '16',
        title: 'Inverted camera',
        description: 'The same quiet button body viewed from the opposite perspective origin, reversing the spatial pull across the viewport.',
        structure: 'inverted perspective origin',
        family: 'spatial',
        palette: 'mono',
      },
      {
        id: 'walkman-active-colour',
        number: '17',
        title: 'Colour when pressed',
        description: 'The selected key switches to its route colour; its label, highlight, body edge, and contact shadow adapt with the material.',
        structure: 'active route colour body',
        family: 'spatial',
        palette: 'colour',
        usesRouteAccent: true,
      },
      {
        id: 'walkman-always-colour',
        number: '18',
        title: 'Always colour',
        description: 'Every key keeps its route colour at rest and when pressed, with individual contrast-aware labels and matching tonal edges.',
        structure: 'persistent route colour bodies',
        family: 'spatial',
        palette: 'colour',
        usesRouteAccent: true,
      },
      {
        id: 'walkman-lifted-mono',
        number: '19',
        title: 'Lifted selection',
        description: 'Resting keys sit snug with the wall behind a hairline seam; the selected monochrome key rises outward and reveals its body.',
        structure: 'inverse-pressure monochrome keys',
        family: 'spatial',
        palette: 'mono',
      },
      {
        id: 'walkman-lifted-colour',
        number: '20',
        title: 'Lifted colour selection',
        description: 'The same flush resting state, but the selected key rises as a route-coloured physical body with contrast-aware ink.',
        structure: 'inverse-pressure route colour keys',
        family: 'spatial',
        palette: 'colour',
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
    return WALKMAN_CONTROLS.reduce((config, control) => {
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
    <aside className="parameterizer-panel walkman-config-panel" aria-label="Walkman button controls">
      <div className="parameterizer-header">
        <span>Walkman geometry</span>
        <button type="button" onClick={onClose} aria-label="Close Walkman controls">Close</button>
      </div>
      <div className="parameterizer-scroll">
        <details className="parameterizer-folder" open>
          <summary className="parameterizer-folder-title">Camera &amp; body</summary>
          <div className="walkman-config-panel__rows">
            {WALKMAN_CONTROLS.map((control) => (
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
        <div className="walkman-config-panel__note">
          The inverted study mirrors both origin axes. Pointer tilt remains intentionally subtle.
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

function ButtonBarVariant({
  variant,
  activeRouteId,
  headingLevel = 'h2',
  onSelectRoute,
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
    >
      <header className="button-bar-playground__sample-header">
        <span className="button-bar-playground__sample-number" aria-hidden="true">
          {variant.number}
        </span>
        <div className="button-bar-playground__sample-copy">
          <Heading id={headingId}>{variant.title}</Heading>
          <p>{variant.description}</p>
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
          navClassName="button-bar-playground__tabs"
          onRouteSelect={onSelectRoute}
          preview
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
  const [activeRouteId, setActiveRouteId] = useState('about');
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
    '--walkman-perspective': `${walkmanConfig.perspective}px`,
    '--walkman-origin-x': `${walkmanConfig.originX}vh`,
    '--walkman-origin-y': `${walkmanConfig.originY}vh`,
    '--walkman-body-depth': `${walkmanConfig.bodyDepth}px`,
    '--walkman-rim-mix': `${walkmanConfig.rimSoftness}%`,
    '--walkman-rim-blur': `${2 + (walkmanConfig.rimSoftness * 0.04)}px`,
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
        data-config-panel-open={isWalkmanPanelOpen ? 'true' : 'false'}
        data-walkman-layers={walkmanConfig.layerCount}
        style={walkmanStyle}
      >
      <header className="button-bar-playground__header">
        <div className="button-bar-playground__intro">
          <div className="button-bar-playground__eyebrow">
            <span>Playground / Button Bar</span>
          </div>
          <h1 id="button-bar-playground-title">Button bar studies</h1>
          <p>Twenty-one ways to ask what a tab should feel like: fitted into the wall, completely flat, or built as a quiet physical body.</p>
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
                    <p>{group.description}</p>
                  </div>
                </header>
              ) : null}
              {group.variants.map((variant) => (
                <ButtonBarVariant
                  key={variant.id}
                  variant={variant}
                  activeRouteId={activeRouteId}
                  headingLevel={group.title ? 'h3' : 'h2'}
                  onSelectRoute={setActiveRouteId}
                />
              ))}
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
