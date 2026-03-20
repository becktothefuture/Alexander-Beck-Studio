import { startTransition, useState } from 'react';
import { buildRouteHref } from '../../lib/routes.js';
import {
  CURRENT_SYSTEM_NOTES,
  LONDON_WEATHER_PALETTES,
  PALETTE_SLOT_LABELS,
} from './palette-lab-data.js';

function PaletteLabDevice({ concept }) {
  return (
    <div className="palette-lab-device">
      <div className="palette-lab-device__frame">
        <div className="palette-lab-device__screen">
          <img
            className="palette-lab-device__image"
            src={concept.screenshot}
            alt={`${concept.name} simulation still`}
          />
        </div>
      </div>
    </div>
  );
}

function PaletteSwatchRow({ label, colors }) {
  return (
    <div className="palette-lab-swatches">
      <div className="palette-lab-swatches__label">{label}</div>
      <div className="palette-lab-swatches__track">
        {colors.map((color, index) => (
          <div key={`${label}-${color}`} className="palette-lab-swatches__item">
            <span
              className="palette-lab-swatches__chip"
              style={{ '--palette-lab-swatch': color }}
              aria-hidden="true"
            />
            <span className="palette-lab-swatches__meta">
              <span>{PALETTE_SLOT_LABELS[index]}</span>
              <code>{color}</code>
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function PaletteLabExperience() {
  const [activeIndex, setActiveIndex] = useState(0);
  const active = LONDON_WEATHER_PALETTES[activeIndex] || LONDON_WEATHER_PALETTES[0];

  const selectConcept = (index) => {
    startTransition(() => {
      setActiveIndex(index);
    });
  };

  return (
    <section className="palette-lab" aria-labelledby="palette-lab-title">
      <div className="palette-lab__hero">
        <div className="palette-lab__intro">
          <p className="palette-lab__eyebrow">London Weather Palette Lab</p>
          <h1 id="palette-lab-title" className="palette-lab__title">
            Four London weather chapters, built to replace the old palette rotation with something more local, more atmospheric, and more exact.
          </h1>
          <p className="palette-lab__lede">
            Each concept keeps the existing 8-slot simulation logic intact, but shifts the palette language toward recurring London conditions: drizzle, bright overcast, a blue break between showers, and rain after dusk.
          </p>

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
          </div>
        </div>

        <div className="palette-lab__preview">
          <PaletteLabDevice concept={active} />
          <div className="palette-lab__preview-caption">
            Simulation still from the live home scene in dark mode, mounted as a review frame for the active weather chapter.
          </div>
          <a
            className="palette-lab__open-link"
            href={buildRouteHref('home', { searchParams: { palette: active.slug } })}
          >
            Open live simulation with this palette
          </a>
        </div>
      </div>

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
              <span className="palette-lab-card__strap">{concept.strapline}</span>
            </button>
          );
        })}
      </div>

      <section
        id={`palette-lab-panel-${active.id}`}
        className="palette-lab__details"
        aria-label={`${active.name} palette details`}
      >
        <div className="palette-lab__swatch-column">
          <PaletteSwatchRow label="Light chapter" colors={active.palette.light} />
          <PaletteSwatchRow label="Dark chapter" colors={active.palette.dark} />
        </div>
        <div className="palette-lab__notes">
          <p className="palette-lab__notes-title">Current system constraints</p>
          <ul className="palette-lab__notes-list">
            {CURRENT_SYSTEM_NOTES.map((note) => (
              <li key={note}>{note}</li>
            ))}
          </ul>
        </div>
      </section>
    </section>
  );
}
