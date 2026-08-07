import {
  PALETTE_MATERIAL_LABELS,
  PALETTE_ROLE_DISTRIBUTION,
  PRODUCTION_PALETTE_CARDS,
} from './palette-lab-data.js';
import './palette-lab.css';

const STAGE_LABELS = Object.freeze({
  live: 'Live / timed',
});

function WeightedField({ concept }) {
  return (
    <div
      className="palette-lab-field"
      role="img"
      aria-label={`${concept.name} weighted discipline colour field`}
    >
      {PALETTE_ROLE_DISTRIBUTION.map((role) => {
        const color = concept.palette.light[role.colorIndex];
        return (
          <span
            key={`${concept.id}-${role.label}`}
            className="palette-lab-field__segment"
            style={{
              '--palette-lab-swatch': color,
              '--palette-lab-weight': role.weight,
            }}
            title={`${role.label}: ${color.toUpperCase()} · ${role.weight}%`}
          >
            <span className="palette-lab-field__label" aria-hidden="true">
              {role.shortLabel}
            </span>
          </span>
        );
      })}
    </div>
  );
}

function MaterialStrip({ concept }) {
  return (
    <div className="palette-lab-materials" aria-label={`${concept.name} complete material palette`}>
      {concept.palette.light.map((color, index) => (
        <span
          key={`${concept.id}-${PALETTE_MATERIAL_LABELS[index]}`}
          className="palette-lab-materials__swatch"
          style={{ '--palette-lab-swatch': color }}
          title={`${PALETTE_MATERIAL_LABELS[index]}: ${color.toUpperCase()}`}
          aria-label={`${PALETTE_MATERIAL_LABELS[index]} ${color.toUpperCase()}`}
        />
      ))}
    </div>
  );
}

function ProductionPaletteCard({ concept }) {
  const meta = concept.schedule || concept.lifecycle;

  return (
    <article className="palette-lab-card" data-stage={concept.kind}>
      <header className="palette-lab-card__header">
        <p className="palette-lab-card__stage">{STAGE_LABELS[concept.kind]}</p>
        <p className="palette-lab-card__meta">{meta}</p>
      </header>
      <div className="palette-lab-card__identity">
        <div>
          <p className="palette-lab-card__facet">{concept.facet}</p>
          <h3 className="palette-lab-card__name">{concept.name}</h3>
        </div>
        <p className="palette-lab-card__designer">{concept.designer}</p>
      </div>
      <WeightedField concept={concept} />
      <MaterialStrip concept={concept} />
      <p className="palette-lab-card__note">{concept.note}</p>
    </article>
  );
}

export function PaletteLabExperience() {
  return (
    <section className="palette-lab" aria-labelledby="palette-lab-title">
      <header className="palette-lab__intro">
        <div className="palette-lab__intro-index" aria-hidden="true">
          <span>04</span>
        </div>
        <div className="palette-lab__intro-copy">
          <p className="palette-lab__eyebrow">London production colour system · August 2026</p>
          <h1 id="palette-lab-title" className="palette-lab__title">
            Four signals / one clock
          </h1>
          <p className="palette-lab__lede">
            These are the only four production colour schemes. Every route shares the same palette,
            changes on the visitor’s local three-hour boundaries, and keeps the same sphere-gradient
            material.
          </p>
        </div>
        <div className="palette-lab__legend" aria-label="Daily palette sequence">
          <span><b>00 / 12</b> Worn Signal</span>
          <span><b>03 / 15</b> Cobalt Voltage</span>
          <span><b>06 / 18</b> After Closing</span>
          <span><b>09 / 21</b> Turmeric cut</span>
        </div>
      </header>

      <div className="palette-lab__threads">
        {PRODUCTION_PALETTE_CARDS.map((concept, index) => (
          <section className="palette-lab-thread" key={concept.id} aria-labelledby={`${concept.id}-title`}>
            <header className="palette-lab-thread__header">
              <p className="palette-lab-thread__label">
                Rotation {String(index + 1).padStart(2, '0')}
              </p>
              <h2 id={`${concept.id}-title`} className="palette-lab-thread__title">
                {concept.facet}
              </h2>
            </header>
            <div className="palette-lab-thread__cards">
              <ProductionPaletteCard concept={concept} />
            </div>
          </section>
        ))}
      </div>

      <footer className="palette-lab__footer">
        <p>
          Stable production set. Neutral-grey Product Design and pure-white Art Direction remain
          fixed roles. The shared controller repeats these four palettes twice across eight equal
          three-hour periods on Home, Work, About, Contact, and Lab.
        </p>
      </footer>
    </section>
  );
}
