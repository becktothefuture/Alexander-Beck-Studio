import aboutContent from 'virtual:abs-content/about';
import { hasAboutNarrativeRestoredProgress } from './aboutNarrativeScrollRestoration.js';

const openingField = aboutContent?.tracks?.text?.fields?.find(
  (field) => field.id === 'text-promise-main',
);

export function AboutNarrativeLoadingFrame() {
  const isRestoring = hasAboutNarrativeRestoredProgress();
  if (isRestoring) {
    return (
      <div
        className="route-centered-page"
        data-route-content="about"
        data-about-opening-frame="restoring"
        aria-busy="true"
      >
        <h1 id="about-route-title" className="screen-reader">
          About Me
        </h1>
        <p className="screen-reader" role="status">Restoring the About narrative.</p>
      </div>
    );
  }

  return (
    <div
      className="route-centered-page"
      data-route-content="about"
      data-about-opening-frame="loading"
      aria-busy="true"
    >
      <section
        className="route-centered-page__inner route-title-lockup"
        aria-labelledby="about-route-title"
        aria-describedby={openingField?.description ? 'about-route-loading-description' : undefined}
      >
        <h1 id="about-route-title" className="route-centered-page__title route-bookend-title">
          {openingField?.text || 'About Me'}
        </h1>
        <span className="route-title-lockup__rule" aria-hidden="true" />
        {openingField?.description ? (
          <p
            id="about-route-loading-description"
            className="route-centered-page__description route-intro-description"
          >
            {openingField.description}
          </p>
        ) : null}
      </section>
    </div>
  );
}
