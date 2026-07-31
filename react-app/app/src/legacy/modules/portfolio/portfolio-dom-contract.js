export const PORTFOLIO_DOM_CONTRACT = Object.freeze({
  route: Object.freeze({
    scene: '#abs-scene',
    frame: '#app-frame',
    wall: '#simulations',
    canvas: '#c',
    title: '#hero-title',
    topbar: '.ui-top-main.route-topbar',
  }),
  deck: Object.freeze({
    mount: '#portfolioProjectMount',
    stage: '.portfolio-deck-stage',
    card: '.portfolio-deck-card',
    activeCard: '.portfolio-deck-card.is-active',
    label: '.portfolio-project-label',
    nearestLabel: '.portfolio-project-label[data-ring-nearest="true"]',
  }),
  drawer: Object.freeze({
    host: '#portfolio-sheet-host',
    view: '#portfolioProjectView',
  }),
  state: Object.freeze({
    bodyLoadState: 'data-portfolio-load-state',
    entrancePhase: 'data-portfolio-entrance-phase',
    entranceReason: 'data-portfolio-entrance-reason',
    mediaReady: 'data-portfolio-media-ready',
    activeProject: 'data-project-index',
  }),
});
