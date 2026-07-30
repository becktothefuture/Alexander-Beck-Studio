import { useCallback, useEffect, useMemo, useState } from 'react';
import homeContent from 'virtual:abs-content/home';
import { HOME_IDENTITY } from '../../lib/home-identity.js';
import { useSimulationPalette } from '../../hooks/useSimulationPalette.js';
import {
  startSimulationPaletteController,
  stopSimulationPaletteController,
} from '../../palette/simulationPaletteController.js';
import {
  TITLE_ENTRANCE_LAB_CONTROLS,
  TITLE_ENTRANCE_LAB_DEFAULTS,
  createTitleEntranceLabSearch,
  resolveTitleEntranceLabConfig,
} from './titleEntranceLabControls.js';
import './title-entrance-lab.css';

const HOME_TITLE_LINES = Object.freeze([HOME_IDENTITY.name, ...HOME_IDENTITY.roleLines]);
const CONTACT_TITLE_LINES = Object.freeze([homeContent.contact?.title || "Let's talk"]);
const CONTACT_DESCRIPTION = homeContent.contact?.description
  || 'If you’re building something that needs design, technology and AI to move together, send me a note.';

function getRelativeLuminance(hex) {
  const normalized = String(hex || '').replace('#', '');
  if (!/^[\da-f]{6}$/i.test(normalized)) return 0;
  const channels = [0, 2, 4].map((offset) => {
    const channel = Number.parseInt(normalized.slice(offset, offset + 2), 16) / 255;
    return channel <= 0.04045
      ? channel / 12.92
      : ((channel + 0.055) / 1.055) ** 2.4;
  });
  return (channels[0] * 0.2126) + (channels[1] * 0.7152) + (channels[2] * 0.0722);
}

function getSeededSample(seed) {
  return Math.abs(Math.sin((seed + 1) * 12.9898) * 43758.5453) % 1;
}

function createRandomOrderedFlashColors(colors, count, theme, seed) {
  const selected = colors
    .map((color, index) => ({ color, rank: getSeededSample(seed + (index * 47)) }))
    .sort((left, right) => left.rank - right.rank)
    .slice(0, Math.min(count, colors.length))
    .map((entry) => entry.color)
    .sort((left, right) => getRelativeLuminance(left) - getRelativeLuminance(right));
  return theme === 'dark' ? selected : selected.reverse();
}

function createGlyphStyle({
  colorCount,
  glyphIndex,
  paletteColors,
  sequenceKey,
  theme,
}) {
  const flashColors = createRandomOrderedFlashColors(
    paletteColors,
    colorCount,
    theme,
    (sequenceKey * 97) + (glyphIndex * 19),
  );
  return flashColors.reduce((style, color, index) => ({
    ...style,
    [`--flash-${index + 1}`]: color,
  }), { '--reveal-index': glyphIndex });
}

function splitDescriptionIntoLines(description, lineCount = 3) {
  const words = String(description || '').trim().split(/\s+/).filter(Boolean);
  if (words.length <= lineCount) return words;
  const targetLength = Math.ceil(description.length / lineCount);
  const lines = [];
  let currentLine = '';

  words.forEach((word) => {
    const candidate = currentLine ? `${currentLine} ${word}` : word;
    if (lines.length < lineCount - 1 && currentLine && candidate.length > targetLength) {
      lines.push(currentLine);
      currentLine = word;
      return;
    }
    currentLine = candidate;
  });
  if (currentLine) lines.push(currentLine);
  return lines;
}

function createSupportingLockupStyle(config, glyphCount, descriptionLineCount) {
  const letterStaggerMs = config.letterDurationMs * (1 - (config.overlapPercent / 100));
  const titleSequenceDurationMs = config.letterDurationMs
    + ((glyphCount - 1) * letterStaggerMs);
  const titleRuleOverlapMs = Math.min(config.lineOverlapMs, titleSequenceDurationMs);
  const ruleDelayMs = Math.max(0, titleSequenceDurationMs - titleRuleOverlapMs);
  const descriptionDelayMs = ruleDelayMs + config.descriptionDelayMs;
  const descriptionMotionDurationMs = config.descriptionDurationMs
    + (Math.max(0, descriptionLineCount - 1) * config.descriptionLineStaggerMs);
  return {
    '--rule-duration': `${config.lineDurationMs}ms`,
    '--rule-delay': `${ruleDelayMs}ms`,
    '--description-duration': `${config.descriptionDurationMs}ms`,
    '--description-motion-duration': `${descriptionMotionDurationMs}ms`,
    '--description-delay': `${descriptionDelayMs}ms`,
    '--description-line-stagger': `${config.descriptionLineStaggerMs}ms`,
  };
}

function AnimatedSpecimen({
  config,
  description,
  label,
  lines,
  meta,
  number,
  paletteColors,
  playing,
  sequenceKey,
}) {
  let glyphIndex = 0;
  const titleText = lines.join(' ');
  const glyphCount = lines.reduce((count, line) => count + Array.from(line).length, 0);
  const descriptionLines = splitDescriptionIntoLines(description);
  const supportingLockupStyle = description
    ? createSupportingLockupStyle(config, glyphCount, descriptionLines.length)
    : undefined;

  return (
    <article className="title-entrance-specimen" style={supportingLockupStyle}>
      <header className="title-entrance-specimen__meta">
        <div>
          <span>{number}</span>
          <h2>{label}</h2>
        </div>
        <p>{meta}</p>
      </header>

      <div className="title-entrance-specimen__viewport">
        <div className="title-entrance-specimen__lockup">
          <h3 className="title-entrance-specimen__title" aria-label={titleText}>
            <span className="screen-reader">{titleText}</span>
            <span aria-hidden="true">
              {lines.map((line, lineIndex) => (
                <span
                  key={`${lineIndex}-${line}`}
                  className="title-entrance-specimen__line"
                  data-title-tone={lineIndex === 0 ? 'primary' : 'secondary'}
                >
                  {Array.from(line).map((glyph) => {
                    const index = glyphIndex;
                    glyphIndex += 1;
                    return (
                      <span
                        key={`${sequenceKey}-${lineIndex}-${index}-${glyph}`}
                        className={[
                          'title-entrance-specimen__glyph',
                          playing ? 'is-playing' : '',
                        ].filter(Boolean).join(' ')}
                        data-color-count={config.colorCount}
                        style={createGlyphStyle({
                          colorCount: config.colorCount,
                          glyphIndex: index,
                          paletteColors,
                          sequenceKey,
                          theme: config.theme,
                        })}
                      >
                        {glyph === ' ' ? '\u00a0' : glyph}
                      </span>
                    );
                  })}
                </span>
              ))}
            </span>
          </h3>
          {description ? (
            <>
              <span
                className={[
                  'title-entrance-specimen__rule',
                  playing ? 'is-playing' : '',
                ].filter(Boolean).join(' ')}
                aria-hidden="true"
              />
              <p
                aria-label={description}
                className={[
                  'title-entrance-specimen__description',
                  playing ? 'is-playing' : '',
                ].filter(Boolean).join(' ')}
              >
                <span aria-hidden="true">
                  {descriptionLines.map((descriptionLine, lineIndex) => (
                    <span
                      key={`${lineIndex}-${descriptionLine}`}
                      className="title-entrance-specimen__description-line"
                    >
                      {descriptionLine}
                    </span>
                  ))}
                </span>
              </p>
            </>
          ) : null}
        </div>
      </div>
    </article>
  );
}

function ParameterRow({ config, control, onChange }) {
  const controlId = `title-entrance-control-${control.id}`;
  const disabled = control.id === 'travelPercent' && !config.movementEnabled;

  if (control.type === 'select') {
    return (
      <label className="parameterizer-row" htmlFor={controlId}>
        <span className="parameterizer-label">{control.label}</span>
        <span className="parameterizer-control">
          <select
            id={controlId}
            value={config[control.id]}
            onChange={(event) => onChange(control.id, event.target.value)}
          >
            {control.options.map((option) => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>
        </span>
      </label>
    );
  }

  if (control.type === 'boolean') {
    return (
      <label className="parameterizer-row" htmlFor={controlId}>
        <span className="parameterizer-label">{control.label}</span>
        <span className="parameterizer-control parameterizer-control--boolean">
          <input
            id={controlId}
            type="checkbox"
            checked={config[control.id]}
            onChange={(event) => onChange(control.id, event.target.checked)}
          />
        </span>
      </label>
    );
  }

  return (
    <label className="parameterizer-row" data-disabled={disabled} htmlFor={controlId}>
      <span className="parameterizer-label">{control.label}</span>
      <span className="parameterizer-control">
        <input
          id={controlId}
          type="range"
          min={control.min}
          max={control.max}
          step={control.step}
          value={config[control.id]}
          disabled={disabled}
          onChange={(event) => onChange(control.id, Number(event.target.value))}
        />
        <output className="parameterizer-value" htmlFor={controlId}>
          {config[control.id]}{control.unit}
        </output>
      </span>
    </label>
  );
}

function ParameterFolder({ children, label }) {
  return (
    <details className="parameterizer-folder" open>
      <summary className="parameterizer-folder-title">{label}</summary>
      <div>{children}</div>
    </details>
  );
}

function TitleEntrancePanel({ config, copyStatus, onChange, onCopy, onReplay, onReset, palette }) {
  const groupedControls = useMemo(() => ({
    Appearance: TITLE_ENTRANCE_LAB_CONTROLS.filter((control) => !control.group),
    Timing: TITLE_ENTRANCE_LAB_CONTROLS.filter((control) => control.group === 'Timing'),
    Movement: TITLE_ENTRANCE_LAB_CONTROLS.filter((control) => control.group === 'Movement'),
  }), []);

  return (
    <aside className="parameterizer-panel title-entrance-panel" aria-label="Title animation controls">
      <header className="parameterizer-header">
        <div>
          <strong>Title entrance</strong>
          <span>Parametric study</span>
        </div>
        <button type="button" onClick={onReplay}>Replay</button>
      </header>

      <div className="parameterizer-scroll">
        {Object.entries(groupedControls).map(([group, controls]) => (
          <ParameterFolder key={group} label={group}>
            {controls.map((control) => (
              <ParameterRow
                key={control.id}
                config={config}
                control={control}
                onChange={onChange}
              />
            ))}
          </ParameterFolder>
        ))}

        <div className="title-entrance-panel__palette">
          <span>Current ball palette</span>
          <div aria-label={`${palette.paletteId} palette`}>
            {palette.colors.map((color, index) => (
              <i key={`${color}-${index}`} style={{ background: color }} title={color} />
            ))}
          </div>
          <small>{palette.paletteId}</small>
        </div>
      </div>

      <footer className="parameterizer-actions">
        <button type="button" onClick={onReset}>Reset</button>
        <button type="button" onClick={onCopy}>{copyStatus}</button>
      </footer>
    </aside>
  );
}

function getInitialConfig() {
  return resolveTitleEntranceLabConfig(typeof window === 'undefined' ? '' : window.location.search);
}

export function TitleEntranceLab() {
  const [config, setConfig] = useState(getInitialConfig);
  const [sequenceKey, setSequenceKey] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [copyStatus, setCopyStatus] = useState('Copy setup link');
  const palette = useSimulationPalette();
  const paletteColors = useMemo(() => (
    Array.isArray(palette.colors) ? palette.colors : []
  ), [palette.colors]);
  const letterStaggerMs = config.letterDurationMs * (1 - (config.overlapPercent / 100));
  const pageStyle = {
    '--letter-duration': `${config.letterDurationMs}ms`,
    '--letter-stagger': `${letterStaggerMs}ms`,
    '--travel-percent': config.movementEnabled ? `${config.travelPercent}%` : '0%',
    '--description-rise': config.movementEnabled ? 'clamp(4px, 0.45em, 7px)' : '0px',
  };

  const replay = useCallback(() => {
    setPlaying(false);
    window.requestAnimationFrame(() => {
      setSequenceKey((key) => key + 1);
      setPlaying(true);
    });
  }, []);

  useEffect(() => {
    startSimulationPaletteController();
    return () => stopSimulationPaletteController();
  }, []);

  useEffect(() => {
    let cancelled = false;
    const begin = async () => {
      await document.fonts?.ready;
      await new Promise((resolve) => window.requestAnimationFrame(resolve));
      if (!cancelled) replay();
    };
    void begin();
    return () => {
      cancelled = true;
    };
  }, [replay]);

  const updateConfig = (id, value) => {
    setConfig((current) => {
      const next = { ...current, [id]: value };
      const nextUrl = `${window.location.pathname}${createTitleEntranceLabSearch(next)}${window.location.hash}`;
      window.history.replaceState(null, '', nextUrl);
      return next;
    });
    replay();
  };

  const resetConfig = () => {
    const next = { ...TITLE_ENTRANCE_LAB_DEFAULTS };
    setConfig(next);
    window.history.replaceState(null, '', window.location.pathname);
    replay();
  };

  const copySetupLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopyStatus('Link copied');
    } catch {
      setCopyStatus('Copy failed');
    }
    window.setTimeout(() => setCopyStatus('Copy setup link'), 1600);
  };

  const directionLabel = config.theme === 'dark'
    ? 'Darkest to lightest, settling on white'
    : 'Lightest to darkest, settling on black';

  return (
    <main
      className="title-entrance-lab"
      data-theme={config.theme}
      data-movement={config.movementEnabled}
      style={pageStyle}
    >
      <header className="title-entrance-lab__header">
        <div>
          <p className="title-entrance-lab__eyebrow">Motion lab / Instrument Serif</p>
          <h1>Colour-flash title entrances</h1>
        </div>
        <p>
          Two ordered examples use the exact Home and Contact content with the current ball palette.
          {` ${directionLabel}.`}
        </p>
      </header>

      <div className="title-entrance-lab__layout">
        <TitleEntrancePanel
          config={config}
          copyStatus={copyStatus}
          onChange={updateConfig}
          onCopy={copySetupLink}
          onReplay={replay}
          onReset={resetConfig}
          palette={palette}
        />

        <section className="title-entrance-lab__specimens" aria-label="Title animation examples">
          <AnimatedSpecimen
            key={`home-${sequenceKey}`}
            config={config}
            label="Home title"
            lines={HOME_TITLE_LINES}
            meta="Title only, without a supporting rule or description."
            number="01"
            paletteColors={paletteColors}
            playing={playing}
            sequenceKey={sequenceKey}
          />
          <AnimatedSpecimen
            key={`contact-${sequenceKey}`}
            config={config}
            description={CONTACT_DESCRIPTION}
            label="Contact lockup"
            lines={CONTACT_TITLE_LINES}
            meta="The title hands into its rule, then a top-to-bottom description fade."
            number="02"
            paletteColors={paletteColors}
            playing={playing}
            sequenceKey={sequenceKey}
          />
        </section>
      </div>
    </main>
  );
}
