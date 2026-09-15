import { useEffect, useRef, useState } from 'react';
import { FancyConfigPanel } from './FancyConfigPanel.jsx';
import { FancyStudyNotes } from './FancyStudyNotes.jsx';
import { FancyStyleStatus } from './FancyStyleGuide.jsx';
import { FANCY_DEFAULT_CONFIG, FANCY_HOME_DEFAULT_CONFIG, readFancyConfig, fancySearchParams, normalizeFancyConfig } from './fancyConfig.js';
import { getDailyFocusSimulations } from '../../data/simulationCatalog.js';
import { FANCY_VIEWS } from './fancyRoutes.js';
import './fancy-mode.css';

const SIMULATIONS = [
  { id: 'pit', label: 'Pit' },
  { id: 'kaleidoscope-3', label: 'Kaleidoscope' },
  { id: 'flock-of-birds', label: 'Flock' },
];

const HOME_SIMULATIONS = getDailyFocusSimulations().map(({ id, name }) => ({ id, label: name }));

function frameHref(simulation, config, view = 'home') {
  const params = fancySearchParams(config, simulation);
  params.set('fancyLab', '1');
  params.set('panel', '0');
  return `${FANCY_VIEWS[view].path}?${params}`;
}

export function FancyModeLab({ homepage = false }) {
  const simulations = homepage ? HOME_SIMULATIONS : SIMULATIONS;
  const defaults = homepage ? FANCY_HOME_DEFAULT_CONFIG : FANCY_DEFAULT_CONFIG;
  const frameRef = useRef(null);
  const tuneRef = useRef(null);
  const notesRef = useRef(null);
  const [config, setConfig] = useState(() => readFancyConfig(new URLSearchParams(window.location.search), defaults));
  const [simulation, setSimulation] = useState(() => {
    const requested = new URLSearchParams(window.location.search).get('mode');
    return simulations.some(({ id }) => id === requested) ? requested : 'pit';
  });
  const [view, setView] = useState(() => {
    const requested = new URLSearchParams(window.location.search).get('view');
    return homepage && Object.hasOwn(FANCY_VIEWS, requested) ? requested : 'home';
  });
  const [source, setSource] = useState(() => frameHref(simulation, config, view));
  const [expanded, setExpanded] = useState(false);
  const [notesOpen, setNotesOpen] = useState(false);
  const [metrics, setMetrics] = useState(null);
  const [loading, setLoading] = useState(true);
  const shareParams = fancySearchParams(config, simulation, defaults);
  if (view !== 'home') shareParams.set('view', view);
  const shareUrl = `${window.location.origin}${window.location.pathname}?${shareParams}`;
  const api = () => {
    try {
      return frameRef.current?.contentWindow?.__ABS_FANCY_PREVIEW__;
    } catch {
      return null;
    }
  };

  useEffect(() => {
    api()?.configure(config);
    window.history.replaceState(null, '', shareUrl);
  }, [config, shareUrl]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      const snapshot = api()?.snapshot();
      if (snapshot) {
        setMetrics(snapshot);
        if (homepage && snapshot.view) setView(snapshot.view);
        if (snapshot.ready) setLoading(false);
      }
    }, 600);
    return () => window.clearInterval(timer);
  }, [homepage]);

  function switchSimulation(id) {
    if (id === simulation) return;
    setSimulation(id);
    setLoading(true);
    setSource(frameHref(id, config));
  }

  function patch(next) {
    setConfig((current) => normalizeFancyConfig({ ...current, ...next }));
  }

  function closePanel() {
    setExpanded(false);
    tuneRef.current?.focus();
  }

  return (
    <main className={`fancy-mode-lab${homepage ? ' fancy-home-study' : ''}`} data-ground={config.dark ? 'black' : 'white'}>
      <iframe
        ref={frameRef}
        data-fancy-preview
        data-fancy-config={JSON.stringify(config)}
        data-fancy-simulation={simulation}
        className="fancy-mode-lab__site"
        title={homepage ? 'Alexander Beck Studio — Fancy website study' : 'Alexander Beck Studio — Fancy Mode preview'}
        src={source}
        onLoad={() => api()?.configure(config)}
      />
      {expanded && <FancyConfigPanel config={config} metrics={metrics} patch={patch}
        ripple={() => api()?.ripple()} close={closePanel}
        reset={() => setConfig({ ...defaults, fancy: config.fancy, dark: config.dark })}
        initialFolder={homepage ? 'patterns' : 'ripples'}
        simulation={simulation}
        shareUrl={shareUrl} />}
      {notesOpen && <FancyStudyNotes simulation={view === 'home' ? simulation : view}
        label={view === 'home' ? simulations.find(({ id }) => id === simulation)?.label : FANCY_VIEWS[view].label}
        close={() => { setNotesOpen(false); notesRef.current?.focus(); }} />}
      <section className="fancy-controls" aria-label="Fancy Mode controls">
        <div className="fancy-controls__bar">
          <button type="button" className="fancy-controls__mode" aria-pressed={config.fancy}
            onClick={() => patch({ fancy: !config.fancy })}>
            <span className="fancy-controls__mark" aria-hidden="true">✳</span>
            {config.fancy ? 'Fancy Mode' : 'Normal Mode'}
          </button>
          <div className="fancy-controls__simulations" role="group" aria-label="Simulation">
            {homepage ? <>
              {view === 'home' ? <select aria-label="Simulation" className="fancy-controls__select" value={simulation}
                onChange={(event) => switchSimulation(event.target.value)}>
                {simulations.map(({ id, label }) => <option key={id} value={id}>{label}</option>)}
              </select> : <span className="fancy-controls__view">{FANCY_VIEWS[view].label}</span>}
              <button ref={notesRef} type="button" aria-label="About this study" onClick={() => setNotesOpen(true)}>Why?</button>
            </> : simulations.map(({ id, label }) => (
              <button key={id} type="button" aria-pressed={id === simulation}
                onClick={() => switchSimulation(id)}>{label}</button>
            ))}
          </div>
          <button type="button" className="fancy-controls__theme"
            aria-label={config.dark ? 'Switch to white background' : 'Switch to black background'}
            onClick={() => patch({ dark: !config.dark })}>
            <span aria-hidden="true">{config.dark ? '◑' : '◐'}</span>
          </button>
          <button ref={tuneRef} type="button" className="fancy-controls__tune" aria-expanded={expanded}
            aria-controls="fancy-tuning" onClick={() => setExpanded(!expanded)}>Tune</button>
        </div>
        <FancyStyleStatus config={config} metrics={metrics} compact />
        <p className="fancy-controls__hint" role="status">{loading ? 'Opening the field…'
          : !config.fancy ? 'Original sphere material.'
            : config.rippleStrength === 0 ? 'Wave strength 0 · particles still respond.'
            : !config.touchRipples && !config.mouseRipples ? 'Input ripples off · particles still respond.'
              : !config.touchRipples ? 'Touch ripples off · mouse ripples on.'
                : !config.mouseRipples ? 'Mouse ripples off · touch ripples on.'
                  : 'Move, touch, make a ripple.'}</p>
      </section>
    </main>
  );
}
