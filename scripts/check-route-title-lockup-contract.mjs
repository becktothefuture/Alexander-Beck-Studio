import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const read = (path) => readFile(new URL(path, import.meta.url), 'utf8');
const designConfig = JSON.parse(await read('../react-app/app/public/config/design-system.json'));
const sources = Object.fromEntries(await Promise.all([
  ['main', '../react-app/app/public/css/main.css'],
  ['portfolioStyles', '../react-app/app/public/css/portfolio.css'],
  ['portfolio', '../react-app/app/src/legacy/modules/portfolio/app.js'],
  ['contact', '../react-app/app/src/routes/contact/ContactRouteContent.jsx'],
  ['playground', '../react-app/app/src/routes/playground/PlaygroundExperience.jsx'],
  ['playgroundComingSoon', '../react-app/app/src/routes/playground/PlaygroundComingSoon.jsx'],
  ['playgroundStyles', '../react-app/app/src/routes/playground/playground.css'],
  ['playgroundResponsive', '../react-app/app/src/routes/playground/spatial/responsiveProfile.js'],
  ['about', '../react-app/app/src/routes/about-narrative-lab/AboutNarrativeLabExperience.jsx'],
  ['aboutComingSoon', '../react-app/app/src/routes/about/AboutComingSoon.jsx'],
  ['aboutRoute', '../react-app/app/src/routes/about/AboutRoute.jsx'],
  ['aboutStyles', '../react-app/app/src/routes/about-narrative-lab/about-narrative-lab.css'],
  ['siteApp', '../react-app/app/src/components/app/SiteApp.jsx'],
  ['routeReadiness', '../react-app/app/src/lib/motion/route-transition-readiness.js'],
  ['entranceEvents', '../react-app/app/src/lib/motion/route-entrance-events.js'],
  ['entranceSequence', '../react-app/app/src/lib/motion/entrance-sequence.js'],
  ['titleDepth', '../react-app/app/src/legacy/modules/rendering/title-depth.js'],
  ['homeRoute', '../react-app/app/src/routes/home/HomeRoute.jsx'],
  ['home', '../react-app/app/public/css/main.css'],
].map(async ([key, path]) => [key, await read(path)])));

test('every production route lockup consumes the shared title, rule, and description roles', () => {
  assert.match(sources.portfolio, /portfolio-deck-intro__title route-centered-page__title route-bookend-title/);
  assert.match(sources.portfolio, /route-title-lockup__rule/);
  assert.match(sources.portfolio, /portfolio-deck-intro__body route-centered-page__description route-intro-description/);

  assert.match(sources.contact, /route-centered-page__title route-bookend-title/);
  assert.match(sources.contact, /route-title-lockup__rule/);
  assert.match(sources.contact, /route-centered-page__description route-intro-description/);
  assert.match(sources.contact, /<LinkedInAction href=\{linkedin\} soundSource="contact-linkedin"/);

  assert.match(sources.playground, /route-centered-page__title route-bookend-title/);
  assert.match(sources.playground, /className="route-title-lockup__rule"/);
  assert.match(sources.playground, /className="route-centered-page__description route-intro-description"/);

  assert.match(sources.aboutComingSoon, /route-centered-page__title route-bookend-title/);
  assert.match(sources.aboutComingSoon, /id="about-coming-soon-title"/);
  assert.equal((sources.about.match(/route-centered-page__title route-bookend-title/g) || []).length, 2);
  assert.equal((sources.about.match(/route-title-lockup__rule/g) || []).length, 2);
  assert.equal((sources.about.match(/route-centered-page__description route-intro-description/g) || []).length, 2);
  assert.match(sources.about, /<LinkedInAction[\s\S]*?href=\{ABOUT_NARRATIVE_CONTACT\.linkedin\}/);

  assert.match(sources.home, /--home-hero-title-scale: var\(--route-bookend-title-scale\)/);
  assert.match(sources.home, /--home-hero-title-size-scale: 0\.9/);
  assert.match(sources.home, /--home-hero-title-anchor-y: 55%/);
  assert.match(sources.home, /var\(--route-entry-title-size\)\s*\*\s*var\(--home-hero-title-scale\)/);
  assert.match(sources.home, /var\(--home-hero-title-size-scale\)/);
  assert.match(sources.home, /var\(--route-title-line-height\) \* var\(--abs-font-headline-line-height-scale, 1\)/);
});

test('shared CSS owns lockup typography, rule geometry, spacing, and settled description tone', () => {
  assert.match(sources.main, /--route-intro-description-max-width: 50\.4ch/);
  assert.match(sources.main, /--route-intro-description-line-height: 1\.485/);
  assert.match(
    sources.main,
    /--route-intro-description-opacity: var\(--supporting-description-opacity\)/,
  );
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

test('Contact and About share one centred, compact two-action family', () => {
  assert.match(
    sources.main,
    /\.contact-action-stack \{[\s\S]*?flex-direction: column;[\s\S]*?align-items: center;[\s\S]*?width: fit-content;[\s\S]*?max-width: 100%;[\s\S]*?margin-inline: auto;/,
  );
  assert.match(
    sources.main,
    /\.contact-action-stack__primary,[\s\S]*?\.contact-action-stack__secondary \{[\s\S]*?flex: 0 0 auto;[\s\S]*?width: auto;[\s\S]*?max-width: 100%;/,
  );
  assert.match(sources.main, /\.contact-email-text \{[\s\S]*?font: inherit;/);
  assert.match(sources.main, /\.contact-email-copy i \{[\s\S]*?font-size: var\(--abs-labelled-action-icon-size\);/);
  assert.match(sources.main, /\.contact-linkedin-action i \{[\s\S]*?font-size: var\(--abs-labelled-action-icon-size\);/);
  assert.match(
    sources.aboutStyles,
    /data-about-experience-version='v2'[\s\S]*?\.about-narrative-finale-content \{[\s\S]*?top: 50%;[\s\S]*?justify-items: center;[\s\S]*?transform: translate3d\(0, -50%, 0\)/,
  );
  assert.doesNotMatch(sources.aboutStyles, /top: 58%/);
  assert.doesNotMatch(sources.aboutStyles, /left: 50%;[\s\S]{0,120}width: 50%/);
});

test('every production bookend uses one cached paint endpoint and glyph-only travel contract', () => {
  assert.match(sources.homeRoute, /data-canvas-title-source="home"/);
  assert.equal(
    (sources.homeRoute.match(/data-route-enter-variant="bookend-title"/g) || []).length,
    2,
  );
  assert.match(sources.portfolio, /heading\.dataset\.routeEnterVariant = 'bookend-title'/);
  assert.match(sources.contact, /data-route-enter-variant="bookend-title"/);
  assert.match(sources.aboutComingSoon, /data-route-enter-variant="bookend-title"/);
  assert.match(sources.about, /data-route-enter-variant="bookend-title"/);
  assert.match(sources.playgroundComingSoon, /data-route-enter-variant="bookend-title"/);
  assert.match(sources.playground, /data-route-enter-variant="bookend-title"/);

  assert.match(sources.entranceSequence, /const bookendEndpointByElement = new WeakMap\(\)/);
  assert.match(sources.entranceSequence, /cached\?\.sequenceSeed === sequenceSeed/);
  assert.match(sources.entranceSequence, /const finalColor = bookendEndpoint\?\.finalColor \|\| ''/);
  assert.match(
    sources.entranceSequence,
    /finalOpacity: bookendEndpoint\?\.finalOpacity \?\? readFinalOpacity\(element, sequenceSeed\)/,
  );
  assert.match(
    sources.entranceSequence,
    /glyph\.style\.transform = canvasOwnsMovement[\s\S]*?'translate3d\(0, 0, 0\)'[\s\S]*?target\.travelPercent/,
  );
  assert.match(
    sources.main,
    /\.route-entrance-glyph \{[\s\S]*?transform: translate3d\(0, 0, 0\);[\s\S]*?transform-origin: 50% 50%/,
  );
});

test('bookend palette frames stay fully opaque before their quieter resting endpoint', () => {
  assert.equal(designConfig.runtime.brandLogoSecondaryOpacity, 0.36);
  assert.equal(designConfig.shell.motion.routeTransition.routeBookendDurationMs, 196);
  assert.match(sources.entranceSequence, /subtitleGapMs: 98/);
  assert.match(
    sources.entranceSequence,
    /flashColors\.map\([\s\S]*?opacity: 1,[\s\S]*?easing: 'steps\(1, end\)'/,
  );
  assert.match(
    sources.entranceSequence,
    /keyframes\.push\(\{ color: finalColor, opacity: finalOpacity, offset: 1 \}\)/,
  );
  assert.match(
    sources.entranceSequence,
    /createSteppedColorKeyframes\(flashColors, target\.finalColor, target\.finalOpacity\)/,
  );
  assert.match(
    sources.titleDepth,
    /const opacity = linearProgress < 1 \? 1 : glyph\.finalOpacity/,
  );
});

test('About readiness accepts the production gate or the development narrative scene root', () => {
  const readySelector = /\.about-narrative-lab\[data-route-content=["']about["']\]/;
  assert.match(sources.siteApp, readySelector);
  assert.match(sources.routeReadiness, readySelector);
  assert.match(sources.routeReadiness, /getElementById\('about-coming-soon-title'\)/);
  assert.match(sources.siteApp, /routeId === 'about' && import\.meta\.env\.DEV/);
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
