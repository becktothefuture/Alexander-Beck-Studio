import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const read = (path) => readFile(new URL(path, import.meta.url), 'utf8');
const sources = Object.fromEntries(await Promise.all([
  ['main', '../react-app/app/public/css/main.css'],
  ['portfolioStyles', '../react-app/app/public/css/portfolio.css'],
  ['portfolio', '../react-app/app/src/legacy/modules/portfolio/app.js'],
  ['contact', '../react-app/app/src/routes/contact/ContactRouteContent.jsx'],
  ['playground', '../react-app/app/src/routes/playground/PlaygroundExperience.jsx'],
  ['playgroundStyles', '../react-app/app/src/routes/playground/playground.css'],
  ['playgroundResponsive', '../react-app/app/src/routes/playground/spatial/responsiveProfile.js'],
  ['about', '../react-app/app/src/routes/about-narrative-lab/AboutNarrativeLabExperience.jsx'],
  ['aboutRoute', '../react-app/app/src/routes/about/AboutRoute.jsx'],
  ['aboutStyles', '../react-app/app/src/routes/about-narrative-lab/about-narrative-lab.css'],
  ['entranceEvents', '../react-app/app/src/lib/motion/route-entrance-events.js'],
  ['home', '../react-app/app/public/css/main.css'],
].map(async ([key, path]) => [key, await read(path)])));

test('every production route lockup consumes the shared title, rule, and description roles', () => {
  assert.match(sources.portfolio, /portfolio-deck-intro__title route-centered-page__title route-bookend-title/);
  assert.match(sources.portfolio, /route-title-lockup__rule/);
  assert.match(sources.portfolio, /portfolio-deck-intro__body route-centered-page__description route-intro-description/);

  assert.match(sources.contact, /route-centered-page__title route-bookend-title/);
  assert.match(sources.contact, /route-title-lockup__rule/);
  assert.match(sources.contact, /route-centered-page__description route-intro-description/);

  assert.match(sources.playground, /route-centered-page__title route-bookend-title/);
  assert.match(sources.playground, /className="route-title-lockup__rule"/);
  assert.match(sources.playground, /className="route-centered-page__description route-intro-description"/);

  assert.equal((sources.about.match(/route-centered-page__title route-bookend-title/g) || []).length, 2);
  assert.equal((sources.about.match(/route-title-lockup__rule/g) || []).length, 2);
  assert.equal((sources.about.match(/route-centered-page__description route-intro-description/g) || []).length, 2);

  assert.match(sources.home, /--home-hero-title-scale: var\(--route-bookend-title-scale\)/);
  assert.match(sources.home, /var\(--route-entry-title-size\) \* var\(--home-hero-title-scale\)/);
  assert.match(sources.home, /var\(--route-title-line-height\) \* var\(--abs-font-headline-line-height-scale, 1\)/);
});

test('shared CSS owns lockup typography, rule geometry, spacing, and settled description tone', () => {
  assert.match(sources.main, /--route-intro-description-max-width: 50\.4ch/);
  assert.match(sources.main, /--route-intro-description-line-height: 1\.485/);
  assert.match(sources.main, /--route-intro-description-opacity: 0\.64/);
  assert.match(sources.main, /route-centered-page__description\.route-intro-description \{[\s\S]*?var\(--route-intro-description-max-width\)[\s\S]*?var\(--route-intro-description-line-height\)[\s\S]*?var\(--route-intro-description-opacity\)/);
  assert.match(sources.main, /\.route-title-lockup__rule \{[\s\S]*?var\(--route-title-rule-width\)[\s\S]*?var\(--route-title-rule-offset\)/);
  assert.match(sources.main, /\.route-title-lockup > :is\([\s\S]*?margin-top: var\(--route-title-description-gap\)/);

  assert.doesNotMatch(sources.playground, /playground-title-lockup__(?:rule|description)|data-playground-(?:title-rule|description)/);
  assert.doesNotMatch(sources.playgroundStyles, /playground-title-lockup h1|playground-title-lockup__(?:rule|description)|data-playground-(?:title-rule|description)/);
  assert.match(sources.playgroundResponsive, /titleScale: 1/);
  assert.match(sources.portfolioStyles, /is-portfolio-deck-revealing \.portfolio-deck-intro__body \{\s*opacity: var\(--route-intro-description-opacity\)/);

  const finaleTitleRule = sources.aboutStyles.match(/about-narrative-spatial-copy\.is-finale[\s\S]*?route-bookend-title \{([^}]*)\}/)?.[1] || '';
  assert.doesNotMatch(finaleTitleRule, /font-(?:family|size|weight)|letter-spacing|line-height/);
  assert.doesNotMatch(sources.aboutStyles, /--about-bookend-description-max-width/);
  assert.match(sources.aboutStyles, /--route-intro-description-max-width: 42ch/);
  assert.match(sources.aboutStyles, /--route-intro-description-max-width: 32ch/);
});

test('About prewarms its code-split scene and cannot paint an unstaged opener', () => {
  assert.match(sources.aboutRoute, /prewarm: \(\{ stage \} = \{\}\) => \{/);
  assert.match(sources.aboutRoute, /stage === 'data'/);
  assert.match(sources.aboutRoute, /return loadAboutNarrativeExperience\(\)/);
  assert.match(sources.about, /data-about-route-entry-rule/);
  assert.match(sources.entranceEvents, /routeContent\.dataset\.routeEntranceStarted = 'true'/);
  assert.match(
    sources.main,
    /\.about-narrative-lab:not\(\[data-route-entrance-started='true'\]\)[\s\S]*?visibility: hidden/,
  );
  assert.match(
    sources.main,
    /data-abs-transition-phase='route-loading'[\s\S]*?\.about-narrative-indicator-layer[\s\S]*?visibility: hidden/,
  );
});
