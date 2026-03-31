import { MainNavLink } from '../../components/MainNavLink.jsx';
import homeContent from 'virtual:abs-content/home';
import cvContent from 'virtual:abs-content/cv';

export const CV_ROUTE_RUNTIME = {
  exportName: 'bootstrapCvRoute',
  loadModule: () => import('./cv-bootstrap.js')
};

function renderParagraphs(paragraphs = []) {
  return paragraphs.map((paragraph) => <p key={paragraph}>{paragraph}</p>);
}

function renderIntroParagraphs(intro = {}) {
  const paragraphs = Array.isArray(intro.paragraphs) && intro.paragraphs.length
    ? intro.paragraphs
    : (intro.text ? [intro.text] : []);

  return paragraphs.map((paragraph) => (
    <p key={paragraph} className="cv-intro-text">{paragraph}</p>
  ));
}

function renderEntries(entries = []) {
  return entries.map((entry) => (
    <div key={`${entry.title}-${entry.meta || ''}`} className="cv-entry">
      <h3 className="cv-entry-title">{entry.title}</h3>
      {entry.meta ? <p className="cv-entry-meta">{entry.meta}</p> : null}
      {entry.body ? <p>{entry.body}</p> : null}
    </div>
  ));
}

function renderSkills(items = []) {
  return items.map((item) => <li key={item}>{item}</li>);
}

function renderProjects(projects = []) {
  return projects.map((project) => (
    <li key={project.title}>
      <strong>{project.title}</strong>
      {' — '}
      {project.body}
    </li>
  ));
}

function getSectionClassName(section) {
  const classNames = ['cv-section'];

  if (section.projects) classNames.push('cv-section--chapters');
  if (section.entries) classNames.push('cv-section--experience');
  if (section.lead) classNames.push('cv-section--with-lead');
  if (section.items && !section.entries && !section.projects) classNames.push('cv-section--list');
  if (section.title === 'Where I keep growing' || section.title === 'Signals') {
    classNames.push('cv-section--closing');
  }
  if (section.title === 'Signals') classNames.push('cv-section--signals');

  return classNames.join(' ');
}

function getSectionPresenceSpan(section) {
  if (section.projects) return '0.28';
  if (section.entries) return '0.24';
  if (section.title === 'Signals') return '0.18';
  return '0.22';
}

export function getCvRouteView() {
  const portfolioLink = homeContent.footer.links.portfolio;
  const contactLink = homeContent.footer.links.contact;

  return {
    bodyClass: 'body cv-page',
    wallClassName: 'cv-simulation w-embed',
    wallContent: (
      <div id="cv-scroll-container" className="cv-scroll-container" data-scroll-presence-root>
        <main className="cv-page-content" aria-label="About Me">
          <article className="cv-page-inner">
            <header className="cv-hero" aria-label="Profile" data-scroll-presence data-scroll-presence-span="0.28">
              <div className="cv-photo">
                <img
                  src={cvContent.intro.photo.src}
                  alt={cvContent.intro.photo.alt}
                  className="cv-photo__image"
                />
              </div>
              <div className="cv-intro">
                <h1 className="cv-hero-label">About me</h1>
                <p className="cv-name">{cvContent.intro.name}</p>
                <p className="cv-title">{cvContent.intro.title}</p>
                {renderIntroParagraphs(cvContent.intro)}
              </div>
            </header>

            {cvContent.sections.map((section) => (
              <section
                key={section.title}
                className={getSectionClassName(section)}
                data-scroll-presence
                data-scroll-presence-span={getSectionPresenceSpan(section)}
              >
                <h2 className="cv-section-title">{section.title}</h2>
                {section.paragraphs ? renderParagraphs(section.paragraphs) : null}
                {section.entries ? renderEntries(section.entries) : null}
                {section.lead ? <p className="cv-section-lead">{section.lead}</p> : null}
                {section.items ? <ul className="cv-skills">{renderSkills(section.items)}</ul> : null}
                {section.projects ? <ul className="cv-projects">{renderProjects(section.projects)}</ul> : null}
                {section.recognition ? (
                  <p className="cv-recognition">{section.recognition}</p>
                ) : null}
              </section>
            ))}

            <footer className="cv-footer" data-scroll-presence data-scroll-presence-span="0.24">
              <button
                type="button"
                className="cv-back-to-top"
                onClick={(event) => {
                  event.currentTarget.closest('.cv-scroll-container')?.scrollTo({
                    top: 0,
                    behavior: 'smooth',
                  });
                }}
              >
                Back to top
              </button>
              {cvContent.footer.prompt ? (
                <p className="cv-footer-prompt">{cvContent.footer.prompt}</p>
              ) : null}
              <p className="cv-contact">{cvContent.footer.contact}</p>
              <p className="cv-copyright">{cvContent.footer.copyright}</p>
            </footer>
          </article>
        </main>
      </div>
    ),
    headerContent: (
      <header className="ui-top">
        <div className="ui-top-main route-topbar portfolio-topbar">
          <div className="route-topbar__left">
            <a
              href="index.html"
              className="gate-back abs-icon-btn"
              data-nav-transition
              aria-label="Back to home"
            >
              <i className="ti ti-arrow-left" aria-hidden="true" />
            </a>
            <nav className="portfolio-topnav ui-main-nav" aria-label="CV navigation">
              <MainNavLink
                id={portfolioLink.id}
                aria-label={portfolioLink.text}
                aria-haspopup="dialog"
              >
                {portfolioLink.text}
              </MainNavLink>
              <MainNavLink
                id={contactLink.id}
                aria-label={contactLink.text}
                aria-haspopup="dialog"
              >
                {contactLink.text}
              </MainNavLink>
            </nav>
          </div>
          <div className="route-topbar__center" aria-hidden="true" />
          <div className="route-topbar__right ui-top-right">
            <div id="sound-toggle-slot" className="portfolio-sound-slot" />
          </div>
        </div>

        <div id="top-elements-soundRow" className="ui-top-soundRow" />
      </header>
    ),
    mainContent: <main className="ui-center-spacer" aria-hidden="true" />
  };
}
