import { useEffect } from 'react';
import { buildRouteHref } from '../../lib/routes.js';
import { registerSimulationAtmosphereSource } from '../../legacy/modules/rendering/atmosphere/simulation-atmosphere.js';

export function AboutComingSoon() {
  useEffect(() => registerSimulationAtmosphereSource({
    id: 'about:ambient',
    routeId: 'about',
    kind: 'ambient',
    scheduler: 'internal',
  }), []);
  const previewHref = buildRouteHref('about', {
    searchParams: { preview: 'about' },
  });

  const revealAbout = (event) => {
    event.preventDefault();
    window.location.assign(previewHref);
  };

  return (
    <div className="route-centered-page">
      <section className="route-centered-page__inner" aria-labelledby="about-coming-soon-title">
        <div className="about-coming-soon__title-row">
          <h1
            id="about-coming-soon-title"
            className="route-centered-page__title route-bookend-title"
            aria-label="Coming soon."
            data-route-enter="identity"
            data-route-enter-order="0"
            data-route-enter-variant="bookend-title"
            data-route-enter-text="Coming soon"
            data-route-focus-target
            tabIndex={-1}
          >
            Coming soon
          </h1>
          <a
            className="about-coming-soon__reveal"
            href={previewHref}
            aria-label="Reveal the About Me page"
            onClick={revealAbout}
          >
            .
          </a>
        </div>
      </section>
    </div>
  );
}
