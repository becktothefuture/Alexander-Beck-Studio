import { useEffect, useRef, useState } from 'react';
import { ActionButton } from '../../components/app/ActionButton.jsx';
import {
  applyButtonStyles, BUTTON_STYLE_GROUPS, normalizeButtonStyles, openButtonStylePreview,
} from '../../lib/buttonStyles.js';
import { loadDesignSystemConfig } from '../../legacy/modules/utils/design-config.js';

function ExactValue({ control, value, disabled, onChange }) {
  const [draft, setDraft] = useState(null);
  return <input
    type="number"
    aria-label={`${control.label} exact value`}
    min={control.min} max={control.max} step={control.step}
    disabled={disabled}
    value={draft ?? value}
    onChange={event => setDraft(event.currentTarget.value)}
    onBlur={event => {
      const next = event.currentTarget.valueAsNumber;
      if (Number.isFinite(next)) onChange(next);
      setDraft(null);
    }}
    onKeyDown={event => {
      if (event.key === 'Escape') event.currentTarget.value = value;
      if (event.key === 'Enter' || event.key === 'Escape') {
        event.preventDefault();
        event.currentTarget.blur();
      }
    }}
  />;
}

function StyleControl({ control, styles, setStyle, disabled }) {
  const { id, label, start, unit, min, max, step } = control;
  const enabled = Object.hasOwn(styles, id);
  const value = styles[id] ?? start;
  const inputId = `button-style-${id}`;
  const setValue = next => setStyle(id, next);
  if (start === true) {
    return <label className="button-style-control button-style-control--toggle">
      <span>{label}</span>
      <input id={inputId} type="checkbox" checked={enabled} disabled={disabled}
        onChange={event => setValue(event.currentTarget.checked ? true : undefined)} />
    </label>;
  }
  return <div className="button-style-control">
    <div className="button-style-control__label">
      <label htmlFor={inputId}>{label}</label>
      <label className="button-style-control__override">
        <input type="checkbox" checked={enabled} disabled={disabled}
          aria-label={`Override ${label.toLowerCase()}`}
          onChange={event => setValue(event.currentTarget.checked ? start : undefined)} />
        Override
      </label>
    </div>
    {typeof start === 'number' ? <div className="button-style-control__number">
      <input id={inputId} type="range" min={min} max={max} step={step}
        value={value} disabled={disabled || !enabled}
        onChange={event => setValue(event.currentTarget.valueAsNumber)} />
      <ExactValue control={control} value={value} disabled={disabled || !enabled} onChange={setValue} />
      {unit ? <span>{unit}</span> : null}
    </div> : <div className="button-style-control__colour">
      <input id={inputId} type="color" value={value} disabled={disabled || !enabled}
        onChange={event => setValue(event.currentTarget.value)} />
      <span>{value}</span>
    </div>}
  </div>;
}

export function ButtonStyleEditor() {
  const [saved, setSaved] = useState(null);
  const [styles, setStyles] = useState({});
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState('');
  const channelRef = useRef(null);
  const previewRef = useRef(null);
  const [owner] = useState(() => crypto.randomUUID());
  const dirty = saved !== null && JSON.stringify(styles) !== JSON.stringify(saved);

  useEffect(() => {
    let mounted = true;
    loadDesignSystemConfig().then(config => {
      if (!mounted) return;
      const next = normalizeButtonStyles(config.shell?.surface?.buttonStyles);
      setSaved(next);
      setStyles(next);
    }).catch(() => { if (mounted) setNotice('Could not load the saved button styles. Reload to try again.'); });
    return () => { mounted = false; };
  }, []);

  useEffect(() => {
    const channel = openButtonStylePreview();
    channelRef.current = channel;
    const closePreview = () => channel?.postMessage({ type: 'close', owner });
    channel?.addEventListener('message', ({ data }) => {
      if (data?.type === 'ready' && previewRef.current) channel.postMessage(previewRef.current);
    });
    window.addEventListener('pagehide', closePreview);
    return () => {
      window.removeEventListener('pagehide', closePreview);
      closePreview();
      channel?.close();
    };
  }, [owner]);

  useEffect(() => {
    if (saved === null) return;
    applyButtonStyles(document.documentElement, styles);
    previewRef.current = dirty ? { type: 'preview', owner, styles } : null;
    channelRef.current?.postMessage(previewRef.current ?? { type: 'close', owner });
  }, [dirty, owner, saved, styles]);

  function setStyle(id, value) {
    setNotice('');
    setStyles(current => normalizeButtonStyles({ ...current, [id]: value }));
  }

  async function save() {
    setSaving(true);
    setNotice('');
    try {
      const response = await fetch('/api/design-system/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ buttonStyles: styles, expectedButtonStyles: saved }),
      });
      if (response.status === 409) {
        setNotice('The saved styles changed. Reload the playground to use the latest version.');
        return;
      }
      if (!response.ok) throw new Error('Could not save');
      const next = normalizeButtonStyles((await response.json()).buttonStyles);
      channelRef.current?.postMessage({ type: 'saved', styles: next });
      setStyles(next);
      setSaved(next);
      setNotice('Saved to the shared design settings.');
    } catch {
      setNotice('Could not save the styles. Use the local authoring server and try again.');
    } finally {
      setSaving(false);
    }
  }

  return <aside className="button-style-editor" data-button-style-editor aria-label="Global button styles">
    <div className="button-style-editor__heading">
      <h2>Global styles</h2>
      <div className="button-style-editor__actions">
        <ActionButton label="Reset draft" disabled={!dirty || saving}
          onClick={() => { setStyles(saved); setNotice('Draft reset.'); }} />
        <ActionButton label={saving ? 'Saving…' : 'Save to site'} data-button-style-save
          disabled={!dirty || saving} onClick={save} />
      </div>
      <p className="button-style-editor__status" role="status">
        {notice || (dirty ? 'Unsaved changes' : saved === null ? 'Loading styles…' : 'Enable an override to start.')}
      </p>
    </div>
    {BUTTON_STYLE_GROUPS.map((group, index) => <details key={group.label} open={index < 2 || undefined}>
      <summary>{group.label}</summary>
      {group.controls.map(control => <StyleControl key={control.id} control={control}
        styles={styles} setStyle={setStyle} disabled={saved === null || saving} />)}
    </details>)}
  </aside>;
}
