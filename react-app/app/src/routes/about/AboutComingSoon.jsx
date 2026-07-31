import { useEffect } from 'react';
import { registerSimulationAtmosphereSource } from '../../legacy/modules/rendering/atmosphere/simulation-atmosphere.js';

export function AboutComingSoon() {
  useEffect(() => registerSimulationAtmosphereSource({
    id: 'about:ambient',
    routeId: 'about',
    kind: 'ambient',
    scheduler: 'internal',
  }), []);

  return (
    <div className="route-centered-page">
      <section className="route-centered-page__inner" aria-labelledby="about-coming-soon-title">
        <h1
          id="about-coming-soon-title"
          className="route-centered-page__title route-bookend-title"
          data-route-enter="identity"
          data-route-enter-order="0"
          data-route-enter-variant="bookend-title"
          data-route-focus-target
          tabIndex={-1}
        >
          Coming soon.
        </h1>
      </section>
    </div>
  );
}
