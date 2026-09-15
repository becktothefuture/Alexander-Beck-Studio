import { useEffect, useRef } from 'react';
import { FancyPatternAtlas, SPRITE_SIZE } from './fancyPatterns.js';
import { FANCY_PALETTE_MODES, FANCY_PATTERN_FAMILIES, getFancyStyleState } from './fancyStyles.js';
import { DEFAULT_SIMULATION_COLOR_DISTRIBUTION, resolveSimulationColorDistribution } from '../../palette/simulationPaletteContract.js';

const distribution = resolveSimulationColorDistribution(DEFAULT_SIMULATION_COLOR_DISTRIBUTION);

function PatternStrip({ palette, family, dark }) {
  const canvasRef = useRef(null);
  useEffect(() => {
    const patterns = new FancyPatternAtlas();
    patterns.update({ paletteId: palette.paletteId, colors: palette.colors, distribution }, dark, family);
    const context = canvasRef.current.getContext('2d');
    context.clearRect(0, 0, SPRITE_SIZE * 6, SPRITE_SIZE);
    for (let role = 0; role < 6; role += 1) {
      context.drawImage(patterns.atlas, patterns.roleShapes[role] * SPRITE_SIZE,
        patterns.rolePigments[role] * SPRITE_SIZE, SPRITE_SIZE, SPRITE_SIZE,
        role * SPRITE_SIZE, 0, SPRITE_SIZE, SPRITE_SIZE);
    }
  }, [palette, family, dark]);
  return <canvas ref={canvasRef} width={SPRITE_SIZE * 6} height={SPRITE_SIZE}
    role="img" aria-label={`${FANCY_PATTERN_FAMILIES[family].label}: six expertise patterns in ${palette.label}`} />;
}

export function FancyStyleStatus({ config, metrics, compact = false }) {
  const { palette, family, period, automatic } = getFancyStyleState(config, metrics);
  if (compact) return <p className="fancy-controls__palette" title={`${palette.label} · ${family.label}`}>
    {palette.shortLabel} · {family.label} · {automatic ? period.hours : 'Manual colours'}
  </p>;
  return <div className="fancy-style-status" role="status">
    <strong>{palette.label} · {family.label}</strong>
    <span>{automatic ? `${period.label} · ${period.hours}` : 'Manual colours · stays selected'}</span>
    <span>{config.followPalette ? 'Patterns follow the colours.' : 'Pattern pinned · turn on Follow colours to link it.'}</span>
  </div>;
}

export function FancyStyleGuide({ config, metrics }) {
  const active = getFancyStyleState(config, metrics);
  return <details className="fancy-style-guide" open>
    <summary>Four variations &amp; colour times</summary>
    <p>Automatic times use your device’s local time. Use Colour mode to preview any palette. The six expertise roles stay the same.</p>
    {FANCY_PALETTE_MODES.map((palette) => {
      const family = FANCY_PATTERN_FAMILIES[palette.family];
      return <figure key={palette.paletteId} data-active={active.palette.paletteId === palette.paletteId}
        data-fancy-style={palette.paletteId}>
        <figcaption><strong>{family.label}</strong><span>{palette.label}</span></figcaption>
        <span className="fancy-style-guide__times">{palette.periods.map((period) => period.hours).join(' · ')}</span>
        <PatternStrip palette={palette} family={family.value} dark={config.dark} />
        <div className="fancy-style-guide__swatches" aria-label={`${palette.label} colours`}>
          {palette.colors.map((color, index) => <span key={index} style={{ backgroundColor: color }} title={color} />)}
        </div>
      </figure>;
    })}
  </details>;
}
