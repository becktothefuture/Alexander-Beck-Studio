import aboutContent from 'virtual:abs-content/about';
import { boardEditorialGridSlot } from './boardTextGrid.js';

const fields = new Map(aboutContent.tracks.text.fields.map(field => [field.id, field]));
const copy = id => fields.get(id);
const disciplines = copy('text-discipline-labels').block.items;
const clients = copy('text-selected-clients').block;
const background = copy('text-background-unit').block.modules;
const purpose = copy('text-life-character').block.modules.find(module => module.id === 'purpose');
// Visible artwork bounds remove the source plates' unequal transparent padding.
// The last value is an optically balanced width, not a common bounding-box size.
const clientArtwork = {
  yoti: [75, 39, 90, 42, 68], 'sp-global': [52, 45, 136, 30, 100],
  bentley: [51, 37, 138, 45, 90], sunexpress: [49, 44, 142, 32, 112],
  mccann: [50, 44, 140, 32, 105], 'american-heart-association': [68, 29, 103, 62, 74],
  sony: [52, 48, 136, 24, 98], 'jaguar-land-rover': [85, 29, 70, 62, 48],
  'maybourne-hotels': [48, 52, 144, 16, 122], experian: [55, 39, 130, 42, 104],
  dcc: [48, 37, 144, 46, 107], 'tourism-ireland': [47, 45, 146, 29, 112],
  lufthansa: [49, 47, 142, 26, 116], 'general-motors': [42, 39, 156, 42, 120],
  'think-money-think-life': [11, 34, 199, 42, 104],
  'mccann-agency': [0, 0, 1825, 436.455, 80],
};

function BoardText({ layout, y, className = '', slotId, label, children }) {
  const physicalY = layout.placement?.textY(slotId) ?? layout.placeY(y);
  const position = layout.readerMode ? undefined : {
    ...boardEditorialGridSlot(slotId, layout.mobile),
    top: `${layout.mapY(physicalY) / layout.sceneHeight * 100}%`,
  };
  return <section className={`about-board-text ${className}`} style={position}
    data-about-scroll-text data-board-text-slot={slotId} aria-label={label}>
    {children}
  </section>;
}

function DisciplineGrid() {
  return <ul className="about-board-disciplines">
    {disciplines.map(discipline => {
      // The editorial ID predates the shared palette's semantic role ID.
      const role = discipline.id === 'motion-and-3d' ? 'motion-3d' : discipline.id;
      return <li key={discipline.id} data-discipline={role}>
        <h3>
          <span className="about-board-discipline-dot" aria-hidden="true"
            style={{ backgroundColor: `var(--simulation-role-${role})` }} />
          <span>{discipline.label}</span>
        </h3>
        <p className="route-centered-page__description route-intro-description">{discipline.description}</p>
      </li>;
    })}
  </ul>;
}

function ClientLogoGrid({ module }) {
  return <ul className="about-board-client-logos" aria-label={module.label}>
    {module.items.map(item => {
      const [x, y, width, height, opticalWidth] = clientArtwork[item.id] || [0, 0, 240, 120, 100];
      const [plateWidth, plateHeight] = item.id === 'mccann-agency' ? [1825, 436.455]
        : item.id === 'think-money-think-life' ? [221, 110] : [240, 120];
      return <li key={item.id} data-client-id={item.id}>
        <svg viewBox={`${x} ${y} ${width} ${height}`} role="img"
          aria-label={item.alt || item.label} width={width} height={height}
          style={{ '--about-client-width': opticalWidth }}>
          <image href={item.src} width={plateWidth} height={plateHeight} />
        </svg>
      </li>;
    })}
  </ul>;
}

function CareerTimeline({ module }) {
  return <ol className="about-board-career-timeline" aria-label={module.label}>
    {[...module.items].reverse().map(item => <li key={item.id}>
      <time dateTime={item.yearLabel}>{item.yearLabel}</time>
      <div className="about-board-timeline-entry">
        <h3>{item.employer}</h3>
        <p className="route-centered-page__description route-intro-description">{item.role}</p>
        {item.description ? <p className="about-board-timeline-description route-centered-page__description route-intro-description">{item.description}</p> : null}
      </div>
    </li>)}
  </ol>;
}

export function BoardEditorial({ layout }) {
  return <>
    <BoardText layout={layout} slotId="garden-ideas" className="about-board-centered" label="Across disciplines">
      <h2 className="about-board-paired-title">I follow ideas across disciplines.</h2>
    </BoardText>
    <BoardText layout={layout} slotId="disciplines" className="about-board-discipline-section" label="Disciplines">
      <DisciplineGrid />
    </BoardText>
    <BoardText layout={layout} slotId="practice" className="about-board-prose" label="My practice">
      <p>{background.find(module => module.id === 'practice').text}</p>
      <p>{background.find(module => module.id === 'collaboration').text}</p>
    </BoardText>
    <BoardText layout={layout} slotId="making" className="about-board-centered" label="Making and refining">
      <p>{background.find(module => module.id === 'making').text}</p>
    </BoardText>
    <BoardText layout={layout} slotId="working-together" label="Experience and selected clients">
      <div className="about-board-experience">
        {clients.modules.filter(module => module.kind === 'prose')
          .map(module => <p key={module.id}>{module.text}</p>)}
      </div>
      <ClientLogoGrid module={clients.modules.find(module => module.kind === 'logo-grid')} />
    </BoardText>
    <BoardText layout={layout} slotId="career-timeline" className="about-board-career" label="Career and purpose">
      <CareerTimeline module={background.find(module => module.kind === 'career-sequence')} />
      <p className="about-board-final-statement" data-about-scroll-text data-board-text-slot="final-statement">
        {purpose.text}
      </p>
    </BoardText>
  </>;
}
