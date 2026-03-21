import { startTransition, useState } from 'react';
import { buildRouteHref } from '../../lib/routes.js';
import { LONDON_WEATHER_PALETTES } from './palette-lab-data.js';

function PaletteLabStill({ concept }) {
  return (
    <div className="palette-lab-still">
      <img
        className="palette-lab-still__image"
        src={concept.screenshot}
        alt={`${concept.name} simulation still`}
      />
    </div>
  );
}

function PaletteBand({ label, colors }) {
  return (
    <div className="palette-lab-band">
      <p className="palette-lab-band__label">{label}</p>
      <div className="palette-lab-band__swatches">
        {colors.map((color) => (
          <span
            key={`${label}-${color}`}
            className="palette-lab-band__swatch"
            style={{ '--palette-lab-swatch': color }}
            title={color.toUpperCase()}
            aria-label={`${label} colour ${color.toUpperCase()}`}
          />
        ))}
      </div>
    </div>
  );
}

export function PaletteLabExperience() {
  const [activeIndex, setActiveIndex] = useState(
    Math.max(
      0,
      LONDON_WEATHER_PALETTES.findIndex((palette) => palette.id === 'portlandHaze')
    )
  );
  const active = LONDON_WEATHER_PALETTES[activeIndex] || LONDON_WEATHER_PALETTES[0];

  const selectConcept = (index) => {
    startTransition(() => {
      setActiveIndex(index);
    });
  };

  return (
    <section className="palette-lab" aria-label="London weather palette review">
      <div className="palette-lab__selector" role="tablist" aria-label="Palette concepts">
        {LONDON_WEATHER_PALETTES.map((concept, index) => {
          const isActive = index === activeIndex;
          return (
            <button
              key={concept.id}
              type="button"
              role="tab"
              aria-selected={isActive}
              aria-controls={`palette-lab-panel-${concept.id}`}
              className={`palette-lab-card${isActive ? ' is-active' : ''}`}
              onClick={() => selectConcept(index)}
            >
              <span className="palette-lab-card__weather">{concept.weather}</span>
              <span className="palette-lab-card__name">{concept.name}</span>
              <span className="palette-lab-card__swatches" aria-hidden="true">
                {concept.palette.light.map((color) => (
                  <span
                    key={`${concept.id}-${color}`}
                    className="palette-lab-card__swatch"
                    style={{ '--palette-lab-swatch': color }}
                  />
                ))}
              </span>
            </button>
          );
        })}
      </div>

      <section
        id={`palette-lab-panel-${active.id}`}
        className="palette-lab__details"
        aria-label={`${active.name} palette mood`}
      >
        <div className="palette-lab__active-copy">
          <div className="palette-lab__active-header">
            <div>
              <p className="palette-lab__active-weather">{active.weather}</p>
              <h2 className="palette-lab__active-name">{active.name}</h2>
            </div>
            <p className="palette-lab__active-personality">{active.personality}</p>
          </div>
          <p className="palette-lab__strapline">{active.strapline}</p>
          <p className="palette-lab__story">{active.story}</p>
          <div className="palette-lab__word-cloud" aria-label={`${active.name} word cloud`}>
            {active.words.map((word) => (
              <span key={`${active.id}-${word}`} className="palette-lab__word">
                {word}
              </span>
            ))}
          </div>
          <div className="palette-lab__bands">
            <PaletteBand label="Day" colors={active.palette.light} />
            <PaletteBand label="Night" colors={active.palette.dark} />
          </div>
          <a
            className="palette-lab__open-link"
            href={buildRouteHref('home', { searchParams: { palette: active.slug } })}
          >
            Open live simulation with this palette
          </a>
        </div>
        <div className="palette-lab__preview">
          <PaletteLabStill concept={active} />
          <div className="palette-lab__preview-caption">
            Live still from the home simulation, forced into the palette-aware pit scene.
          </div>
        </div>
      </section>
    </section>
  );
}
