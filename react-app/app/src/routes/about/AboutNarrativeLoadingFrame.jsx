import { hasAboutNarrativeRestoredProgress } from './aboutNarrativeScrollRestoration.js';

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
      <h1 id="about-route-title" className="screen-reader">About Me</h1>
      <p className="screen-reader" role="status">Preparing the About page.</p>
    </div>
  );
}
