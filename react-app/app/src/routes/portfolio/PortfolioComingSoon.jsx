export function PortfolioComingSoon() {
  return (
    <div className="route-centered-page" data-route-content="portfolio">
      <section
        className="route-centered-page__inner"
        aria-labelledby="portfolio-coming-soon-title"
      >
        <h1
          id="portfolio-coming-soon-title"
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
      </section>
    </div>
  );
}
