import { useEffect, useRef, useState } from 'react';
import { FANCY_CONTROLS, FANCY_GROUPS, fancyControlValue } from './fancyConfig.js';
import { FancyStyleGuide, FancyStyleStatus } from './FancyStyleGuide.jsx';
import { getFancyStyleState } from './fancyStyles.js';

export function FancyConfigPanel({ config, metrics, patch, ripple, reset, close, shareUrl, simulation, initialFolder = 'ripples' }) {
  const [folder, setFolder] = useState(initialFolder);
  const [notice, setNotice] = useState('Settings stay in this page’s link.');
  const panelRef = useRef(null);
  useEffect(() => { panelRef.current?.querySelector('input')?.focus(); }, []);
  useEffect(() => {
    const handleKey = (event) => {
      if (event.key === 'Escape' && !event.defaultPrevented) close();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [close]);

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setNotice('Link copied with your settings.');
    } catch {
      setNotice('Copy this page’s address to keep your settings.');
    }
  }

  function exportSettings() {
    const contents = JSON.stringify({ version: 1, simulation, config, url: shareUrl }, null, 2);
    const url = URL.createObjectURL(new Blob([contents], { type: 'application/json' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = 'fancy-mode-settings.json';
    link.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    setNotice('Settings exported with a link to reopen them.');
  }

  function controlRow(control) {
    const value = control.id === 'cell' && config.cell === 0
      ? (metrics?.cell || (window.innerWidth <= 600 ? 7 : 9))
      : control.id === 'family' ? getFancyStyleState(config, metrics).family.value : config[control.id];
    return (
      <label className="parameterizer-row" key={control.id} title={control.help}>
        <span className="parameterizer-label">{control.label}</span>
        {control.type === 'boolean' ? (
          <>
            <input className="parameterizer-control parameterizer-check" type="checkbox"
              checked={value} onChange={(event) => patch({ [control.id]: event.target.checked,
                ...(control.id === 'followPalette' && !event.target.checked
                  ? { family: getFancyStyleState(config, metrics).family.value } : {}) })} />
            <span className="parameterizer-value" aria-hidden="true">{value ? 'On' : 'Off'}</span>
          </>
        ) : control.type === 'select' ? (
          <select className="parameterizer-control parameterizer-select" value={value}
            onChange={(event) => patch({ [control.id]: Number(event.target.value),
              ...(control.id === 'family' ? { followPalette: false } : {}) })}>
            {control.options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
          </select>
        ) : (
          <>
            <input className="parameterizer-control" type="range" min={control.min} max={control.max} step={control.step}
              value={value} aria-valuetext={fancyControlValue(control, value)}
              onChange={(event) => patch({ [control.id]: Number(event.target.value) })} />
            <output className="parameterizer-value" aria-hidden="true">{fancyControlValue(control, value)}</output>
          </>
        )}
      </label>
    );
  }

  return (
    <aside ref={panelRef} className="parameterizer-panel" id="fancy-tuning" aria-label="Fancy Mode configuration">
      <div className="parameterizer-header">
        <strong>Fancy Mode <span>{FANCY_CONTROLS.length} controls</span></strong>
        <button type="button" onClick={() => { reset(); setNotice('This study’s starting settings restored.'); }}>Reset</button>
        <button type="button" aria-label="Close configuration" onClick={close}>×</button>
      </div>
      {FANCY_GROUPS.map((group) => (
        <section className="parameterizer-folder" key={group.id} data-open={folder === group.id}>
          <button type="button" className="parameterizer-folder-title" aria-expanded={folder === group.id}
            aria-controls={`fancy-folder-${group.id}`} onClick={() => setFolder(folder === group.id ? null : group.id)}>
            <span aria-hidden="true">{folder === group.id ? '−' : '+'}</span>{group.label}
          </button>
          {folder === group.id && (
            <div className="parameterizer-scroll" id={`fancy-folder-${group.id}`}>
              {group.id === 'patterns' && <FancyStyleStatus config={config} metrics={metrics} />}
              {FANCY_CONTROLS.filter((control) => control.group === group.id).map((control) => <div key={control.id}>
                {controlRow(control)}
                {control.id === 'family' && <FancyStyleGuide config={config} metrics={metrics} />}
              </div>)}
              {group.id === 'patterns' && (
                <div className="parameterizer-extra">
                  <button type="button" aria-pressed={config.artwork} onClick={() => patch({ artwork: !config.artwork })}>Artwork only</button>
                  <p>{config.shape === -1 ? 'Six expertise patterns match the legend. A few discs soften the transitions.' : 'This shape applies to every category. Choose By expertise to restore the six legend patterns.'}</p>
                </div>
              )}
              {group.id === 'ripples' && (
                <div className="parameterizer-extra">
                  <button type="button" onClick={ripple} disabled={!config.fancy || metrics?.reducedMotion || config.rippleStrength === 0}>Make a ripple</button>
                  <p>{metrics?.reducedMotion ? 'Reduced motion keeps ripples off.' : config.rippleStrength === 0
                    ? 'Strength is 0, so waves are off. Raise it to see ripples.'
                    : 'Touch includes pen input. These switches change visual ripples; particles still respond.'}</p>
                </div>
              )}
            </div>
          )}
        </section>
      ))}
      <div className="parameterizer-actions">
        <div><button type="button" onClick={copyLink}>Copy link</button><button type="button" onClick={exportSettings}>Export settings</button></div>
        <p role="status">{notice}</p>
      </div>
    </aside>
  );
}
