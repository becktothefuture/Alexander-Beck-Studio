import aboutContent from 'virtual:abs-content/about';
import { boardEditorialGridSlot } from './boardTextGrid.js';

const fields = new Map(aboutContent.tracks.text.fields.map(field => [field.id, field]));
const copy = id => fields.get(id);
const disciplines = copy('text-discipline-labels').block.items;
const clients = copy('text-selected-clients').block;
const background = copy('text-background-unit').block.modules;
// Optical plate widths from Figma; content retains its existing shared schema.
const clientWidths = { yoti: 212.16, 'sp-global': 216, bentley: 145.44, sunexpress: 254.64,
  mccann: 234.24, 'american-heart-association': 193.44, sony: 232.08,
  'jaguar-land-rover': 193.44, 'maybourne-hotels': 300, experian: 260.4, dcc: 257.52,
  'tourism-ireland': 289.2, lufthansa: 282.48, 'general-motors': 271.44,
  'think-money-think-life': 146.744 };

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
        <p>{discipline.description}</p>
      </li>;
    })}
  </ul>;
}

function ClientLogoGrid({ module }) {
  return <ul className="about-board-client-logos" aria-label={module.label}>
    {module.items.map(item => <li key={item.id} data-client-id={item.id}>
      <img src={item.src} alt={item.alt || item.label} loading="lazy" decoding="async"
        style={{ '--about-client-scale': item.scale || 1,
          '--about-client-width': `${clientWidths[item.id] || 216}px` }} />
    </li>)}
  </ul>;
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
    <BoardText layout={layout} slotId="final-statement" className="about-board-prose" label="Working with me">
      <p>{copy('text-life-character').block.modules.find(module => module.id === 'purpose').text}</p>
    </BoardText>
  </>;
}
