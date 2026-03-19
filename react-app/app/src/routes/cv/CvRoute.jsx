import homeContent from '../../../public/config/contents-home.json';
import cvContent from '../../../public/config/contents-cv.json';

export const CV_ROUTE_RUNTIME = {
  exportName: 'bootstrapCvPage',
  loadModule: () => import('../../legacy/modules/cv-init.js')
};

function renderParagraphs(paragraphs = []) {
  return paragraphs.map((paragraph) => <p key={paragraph}>{paragraph}</p>);
}

function renderEntries(entries = []) {
  return entries.map((entry) => (
    <div key={`${entry.title}-${entry.meta || ''}`} className="cv-entry">
      <h3 className="cv-entry-title">{entry.title}</h3>
      <p className="cv-entry-meta">{entry.meta}</p>
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

export function getCvRouteView() {
  const footerLinks = homeContent.footer.links;

  return {
    bodyClass: 'body cv-page',
    wallClassName: 'cv-simulation w-embed',
    wallContent: (
      <>
        <div className="cv-scroll-container">
          <article className="cv-content">
            <aside className="cv-left" aria-label="CV introduction">
              <div className="cv-left__inner">
                <div className="cv-photo">
                  <img
                    src={cvContent.intro.photo.src}
                    alt={cvContent.intro.photo.alt}
                    className="cv-photo__image"
                  />
                </div>
                <div className="cv-intro">
                  <h1 className="cv-name">{cvContent.intro.name}</h1>
                  <p className="cv-title">{cvContent.intro.title}</p>
                  <p className="cv-intro-text">{cvContent.intro.text}</p>
                </div>
              </div>
            </aside>

            <div className="cv-right">
              <div className="cv-right__inner">
                {cvContent.sections.map((section) => (
                  <section key={section.title} className="cv-section">
                    <h2 className="cv-section-title">{section.title}</h2>
                    {section.paragraphs ? renderParagraphs(section.paragraphs) : null}
                    {section.entries ? renderEntries(section.entries) : null}
                    {section.items ? <ul className="cv-skills">{renderSkills(section.items)}</ul> : null}
                    {section.lead ? <p>{section.lead}</p> : null}
                    {section.projects ? <ul className="cv-projects">{renderProjects(section.projects)}</ul> : null}
                    {section.recognition ? (
                      <p className="cv-recognition">{section.recognition}</p>
                    ) : null}
                  </section>
                ))}

                <footer className="cv-footer">
                  <p className="cv-contact">{cvContent.footer.contact}</p>
                  <p className="cv-copyright">{cvContent.footer.copyright}</p>
                </footer>
              </div>
            </div>
          </article>
        </div>

        <canvas className="cv-wall-canvas" aria-hidden="true" />
      </>
    ),
    headerContent: (
      <header className="ui-top">
        <div className="ui-top-main route-topbar">
          <div className="route-topbar__left">
            <a
              href="index.html"
              className="gate-back abs-icon-btn"
              data-nav-transition
              data-transition
              aria-label="Back to home"
            >
              <i className="ti ti-arrow-left" aria-hidden="true" />
            </a>
          </div>
          <nav className="route-topbar__center ui-main-nav" aria-label="CV navigation">
            <button
              id={footerLinks.portfolio.id}
              type="button"
              className="footer_link"
              aria-label="Portfolio"
              aria-haspopup="dialog"
            >
              {footerLinks.portfolio.text}
            </button>
            <button
              id={footerLinks.contact.id}
              type="button"
              className="footer_link"
              aria-label="Contact"
              aria-haspopup="dialog"
            >
              {footerLinks.contact.text}
            </button>
          </nav>
          <div className="route-topbar__right ui-top-right">
            <div id="sound-toggle-slot" />
          </div>
        </div>

        <div id="top-elements-soundRow" className="ui-top-soundRow" />
      </header>
    ),
    mainContent: <main className="ui-center-spacer" aria-hidden="true" />
  };
}
