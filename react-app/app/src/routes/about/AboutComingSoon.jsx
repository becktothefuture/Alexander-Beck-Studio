export function AboutComingSoon() {
  return (
    <div className="route-centered-page" data-route-content="about" data-about-publication="held">
      <section className="route-centered-page__inner route-title-lockup" aria-labelledby="about-coming-soon-title">
        <h1
          id="about-coming-soon-title"
          className="route-centered-page__title route-bookend-title"
          data-route-enter="identity"
          data-route-enter-order="0"
          data-route-enter-variant="bookend-title"
          data-route-enter-text="Coming soon."
          data-route-focus-target
          tabIndex={-1}
        >
          Coming soon.
        </h1>
        <span className="route-title-lockup__rule" aria-hidden="true" />
        <p className="route-centered-page__description route-intro-description" data-route-enter="context" data-route-enter-variant="bookend-description">
          A proper introduction is on its way.
        </p>
      </section>
    </div>
  );
}
