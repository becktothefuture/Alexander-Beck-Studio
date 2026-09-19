import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { createTitleActivationSequence } from '../react-app/app/src/lib/motion/title-activation-order.js';
import { applyRollercoasterTitlePresentation } from '../react-app/app/src/routes/about-rollercoaster/rollercoasterStory.js';

const read = (path) => readFile(new URL(path, import.meta.url), 'utf8');
const designConfig = JSON.parse(await read('../react-app/app/public/config/design-system.json'));
const sources = Object.fromEntries(await Promise.all([
  ['main', '../react-app/app/public/css/main.css'],
  ['actionButtons', '../react-app/app/src/components/app/action-buttons.css'],
  ['portfolioRoute', '../react-app/app/src/routes/portfolio/PortfolioRoute.jsx'],
  ['contactStyles', '../react-app/app/src/routes/contact/contact-route.css'],
  ['contact', '../react-app/app/src/routes/contact/ContactRouteContent.jsx'],
  ['playground', '../react-app/app/src/routes/playground/PlaygroundExperience.jsx'],
  ['playgroundStyles', '../react-app/app/src/routes/playground/playground.css'],
  ['playgroundResponsive', '../react-app/app/src/routes/playground/spatial/responsiveProfile.js'],
  ['about', '../react-app/app/src/routes/about-rollercoaster/AboutRollercoasterExperience.jsx'],
  ['aboutComingSoon', '../react-app/app/src/routes/about/AboutComingSoon.jsx'],
  ['aboutRoute', '../react-app/app/src/routes/about/AboutRoute.jsx'],
  ['aboutStyles', '../react-app/app/src/routes/about-rollercoaster/about-rollercoaster.css'],
  ['siteApp', '../react-app/app/src/components/app/SiteApp.jsx'],
  ['routeReadiness', '../react-app/app/src/lib/motion/route-transition-readiness.js'],
  ['entranceEvents', '../react-app/app/src/lib/motion/route-entrance-events.js'],
  ['entranceSequence', '../react-app/app/src/lib/motion/entrance-sequence.js'],
  ['titleDepth', '../react-app/app/src/legacy/modules/rendering/title-depth.js'],
  ['homeRoute', '../react-app/app/src/routes/home/HomeRoute.jsx'],
  ['home', '../react-app/app/public/css/main.css'],
].map(async ([key, path]) => [key, await read(path)])));

test('every production route lockup consumes the shared title, rule, and description roles', () => {
  assert.match(sources.contact, /route-centered-page__title route-bookend-title/);
  assert.match(sources.contact, /route-title-lockup__rule/);
  assert.match(sources.contact, /route-centered-page__description route-intro-description/);
  assert.match(sources.contact, /<LinkedInAction href=\{linkedin\} soundSource="contact-linkedin"/);

  assert.match(sources.playground, /route-centered-page__title route-bookend-title/);
  assert.match(sources.playground, /className="route-title-lockup__rule"/);
  assert.match(sources.playground, /className="route-centered-page__description route-intro-description"/);

  assert.match(sources.aboutComingSoon, /route-centered-page__title route-bookend-title/);
  assert.match(sources.aboutComingSoon, /id="about-coming-soon-title"/);
  assert.match(sources.about, /function TitleField\(\{ field, opening = false, ending = false/);
  assert.match(sources.about, /rollercoaster-title route-centered-page__title/);
  assert.match(sources.about, /data-title-ink/);
  assert.equal((sources.about.match(/route-title-lockup__rule/g) || []).length, 1);
  assert.equal((sources.about.match(/route-centered-page__description route-intro-description/g) || []).length, 1);
  assert.match(sources.about, /<LinkedInAction[\s\S]*?href=\{CONTACT\.linkedin\}/);

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
  assert.match(sources.aboutStyles, /font-family: var\(--abs-font-headline\)/);
  assert.match(sources.aboutStyles, /line-height: calc\(var\(--route-title-line-height\)/);
  assert.match(sources.aboutStyles, /letter-spacing: var\(--route-title-letter-spacing\)/);
  assert.match(sources.aboutStyles, /var\(--route-bookend-title-size\)/);
  assert.match(sources.aboutStyles, /\.rollercoaster-title-support \.route-intro-description \{[\s\S]*?var\(--route-description-font-size\)[\s\S]*?var\(--route-intro-description-line-height\)/);

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
  assert.match(sources.actionButtons, /\.abs-labelled-action > i \{[\s\S]*?font-size: var\(--abs-labelled-action-icon-size\);/);
  assert.doesNotMatch(sources.main, /\.contact-linkedin-action i \{/);
  assert.match(sources.about, /rollercoaster-contact-actions contact-action-stack/);
  assert.match(sources.aboutStyles, /\.rollercoaster-title-support \{[\s\S]*?align-items: center;[\s\S]*?overflow-y: auto;/);
  assert.match(sources.aboutStyles, /\.rollercoaster-contact-actions \{[\s\S]*?flex-wrap: wrap;[\s\S]*?justify-content: center;[\s\S]*?max-width: 100%;/);
  assert.doesNotMatch(sources.aboutStyles, /top: 58%/);

});

test('every production bookend uses one cached paint endpoint and glyph-only travel contract', () => {
  assert.match(sources.homeRoute, /data-canvas-title-source="home"/);
  assert.equal(
    (sources.homeRoute.match(/data-route-enter-variant="bookend-title"/g) || []).length,
    2,
  );
  assert.match(sources.contact, /data-route-enter-variant="bookend-title"/);
  assert.match(sources.aboutComingSoon, /data-route-enter-variant="bookend-title"/);
  assert.match(sources.about, /rollercoasterTitleOpacity\(/);
  assert.match(sources.about, /applyRollercoasterTitlePresentation\(record, opacity\)/);
  assert.doesNotMatch(sources.about, /data-route-enter-variant="bookend-title"/,
    'The flight title owns its stationary glyph lifecycle rather than entrance travel.');
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

test('About readiness waits for the narrative scene root in production and development', () => {
  const readySelector = /\.about-narrative-lab\[data-route-content=["']about["']\]/;
  assert.match(sources.siteApp, readySelector);
  assert.match(sources.routeReadiness, readySelector);
  assert.doesNotMatch(sources.routeReadiness, /getElementById\('about-coming-soon-title'\)/);
  assert.match(sources.siteApp, /const waitsForAboutNarrativeScene = routeId === 'about'/);
});

test('Work holds production at Coming soon and prewarms the canvas only in development', () => {
  assert.match(
    sources.portfolioRoute,
    /PORTFOLIO_ROUTE_RUNTIME = \{[\s\S]*?legacyRuntime: false,[\s\S]*?prewarm:/,
  );
  assert.match(sources.portfolioRoute, /const WorkExperience = import\.meta\.env\.DEV \? lazy/);
  assert.match(sources.portfolioRoute, /if \(!import\.meta\.env\.DEV\) return Promise\.resolve\(\)/);
  assert.match(sources.portfolioRoute, /if \(!import\.meta\.env\.DEV\) \{[\s\S]*?secondary: <PortfolioComingSoon \/>/);
  assert.doesNotMatch(sources.portfolioRoute, /location\.|searchParams|localStorage|sessionStorage/);
  assert.match(sources.portfolioRoute, /routeRenderKey: 'portfolio'/);
  assert.match(sources.portfolioRoute, /experience="work"/);
  assert.match(sources.routeReadiness, /portfolio-coming-soon-title/);
  assert.match(sources.siteApp, /const isPortfolioWorkCanvas = routeId === 'portfolio' && import\.meta\.env\.DEV/);
});

test('About prewarms its code-split scene and cannot paint an unstaged opener', () => {
  assert.match(sources.aboutRoute, /prewarm: \(\{ stage \} = \{\}\) => \{/);
  assert.match(sources.aboutRoute, /stage === 'data'/);
  assert.match(sources.aboutRoute, /return loadAboutNarrativeExperience\(\)/);
  assert.match(sources.aboutRoute, /import\('\.\.\/about-rollercoaster\/AboutRollercoasterExperience\.jsx'\)/);
  assert.doesNotMatch(sources.aboutRoute, /AboutComingSoon|if \(!import\.meta\.env\.DEV\)/);
  assert.doesNotMatch(sources.aboutRoute, /searchParams|localStorage|sessionStorage/);
  assert.match(sources.entranceEvents, /routeContent\.dataset\.routeEntranceStarted = 'true'/);
  assert.match(
    sources.main,
    /\.about-narrative-lab:not\(\[data-route-entrance-started='true'\]\)[\s\S]*?visibility: hidden/,
  );
  assert.match(
    sources.aboutStyles,
    /data-abs-transition-phase='route-loading'[\s\S]*?\.rollercoaster-indicator-layer[\s\S]*?visibility: hidden/,
  );
});


test('letter activation assigns every existing time slot once without changing the time window', () => {
  for (const count of [0, 1, 2, 4, 48]) {
    const slots = Array.from({ length: count }, (_, index) => 500 + index * 31.36);
    const sequence = createTitleActivationSequence({ random: () => 0, history: new Map(), remember: () => {} });
    const shuffled = sequence.delaysFor(`title-${count}`, slots);
    assert.deepEqual([...shuffled].sort((a, b) => a - b), slots);
    assert.equal(new Set(shuffled).size, count);
    assert.ok(Object.isFrozen(shuffled));
    if (count > 1) assert.notDeepEqual(shuffled, slots);
  }
});

test('letter activation survives recollection and resize within one entrance', () => {
  let draws = 0;
  const sequence = createTitleActivationSequence({
    random: () => { draws += 1; return 0.25; }, history: new Map(), remember: () => {},
  });
  const initial = sequence.delaysFor('AlexanderBeck|Creative&Technologist.', [500, 530, 560, 590]);
  const initialDraws = draws;
  const recollected = sequence.delaysFor('AlexanderBeck|Creative&Technologist.', [500, 530, 560, 590]);
  const resized = sequence.delaysFor('AlexanderBeck|Creative&Technologist.', [500, 500, 640, 640]);
  assert.strictEqual(recollected, initial);
  assert.strictEqual(resized, initial);
  assert.equal(draws, initialDraws);
});

test('successive entrances and restored reload history cannot repeat the same letter order', () => {
  for (const count of [2, 4, 48]) {
    const slots = Array.from({ length: count }, (_, index) => index);
    const history = new Map();
    const options = { random: () => 0, history, remember: () => {} };
    const first = createTitleActivationSequence(options).delaysFor('title', slots);
    const second = createTitleActivationSequence(options).delaysFor('title', slots);
    assert.notDeepEqual(second, first);
    const restored = new Map(JSON.parse(JSON.stringify([...history])));
    const afterReload = createTitleActivationSequence({ ...options, history: restored }).delaysFor('title', slots);
    assert.notDeepEqual(afterReload, second);
    assert.deepEqual([...afterReload].sort((a, b) => a - b), slots);
  }
});

test('every flight title keeps its optical centre while travelling only in depth', () => {
  assert.match(sources.aboutStyles, /\.rollercoaster-title-viewport \{[\s\S]*?position: sticky;[\s\S]*?top: 0;[\s\S]*?height: var\(--beat-viewport-height/);
  assert.match(sources.aboutStyles, /\.rollercoaster-title-anchor \{[\s\S]*?inset: 0;[\s\S]*?display: grid;[\s\S]*?place-items: center;/);
  assert.match(sources.aboutStyles, /\.rollercoaster-title \{[\s\S]*?left: var\(--title-ink-x, 0px\);[\s\S]*?top: var\(--title-ink-y, 0px\);[\s\S]*?margin: 0;[\s\S]*?transform: translate3d\(0, 0, var\(--title-depth, 0px\)\);/);
  assert.match(sources.about, /centreTitleInk\(field\.querySelector\('\[data-title-ink\]'\), glyphContext\)/);
  assert.match(sources.about, /\(box\.width \/ 2\)[\s\S]*?\(\(minX \+ maxX\) \/ 2\)/);
  assert.match(sources.about, /\(box\.height \/ 2\)[\s\S]*?\(\(minY \+ maxY\) \/ 2\)/);
  const lifecycleStart = sources.about.indexOf('        titleRecords.forEach((record) => {');
  const lifecycleEnd = sources.about.indexOf('        const progressValue', lifecycleStart);
  assert(lifecycleStart >= 0 && lifecycleEnd > lifecycleStart, 'Inspect the actual cached title update loop.');
  const visibleLifecycle = sources.about.slice(lifecycleStart, lifecycleEnd);
  assert.match(visibleLifecycle, /rollercoasterTitleOpacity\(frame\.localProgress, record\.options\)/);
  assert.match(visibleLifecycle, /applyRollercoasterTitlePresentation\(record, opacity\)/);
  assert.doesNotMatch(visibleLifecycle, /transform|\.style\.(?:top|left)|title-ink/);
});

test('flight title presentation preserves semantic copy and only gates ending controls', () => {
  // Frozen/sealed nodes make any whole-field hiding, inertness, positional
  // style, or transform mutation fail in the actual shared implementation.
  for (const ending of [false, true]) {
    const node = Object.freeze({
      style: Object.seal({ opacity: '0' }),
      dataset: Object.seal({ titleActive: 'false' }),
      inert: false,
      ariaHidden: null,
    });
    const record = { node, options: { ending },
      support: Object.seal({ tabIndex: -1 }), actions: Object.seal({ inert: true }) };
    for (const opacity of [0, 0.25, 1, 0.25, 0]) {
      applyRollercoasterTitlePresentation(record, opacity);
      assert.equal(node.style.opacity, String(opacity));
      assert.equal(node.dataset.titleActive, String(opacity > 0));
      assert.equal(node.inert, false);
      assert.equal(node.ariaHidden, null);
      assert.equal(record.support.tabIndex, ending && opacity > 0 ? 0 : -1);
      assert.equal(record.actions.inert, !(ending && opacity > 0));
    }
  }
  const titleFieldRule = sources.aboutStyles.match(/\.rollercoaster-title-field \{([^}]*)\}/)?.[1];
  assert(titleFieldRule, 'Inspect the real title field CSS.');
  assert.doesNotMatch(titleFieldRule, /visibility:\s*hidden|display:\s*none/);
  assert.match(sources.aboutStyles, /\.rollercoaster-title-field\[data-title-active='true'\] \.rollercoaster-title,[\s\S]*?\.rollercoaster-title-field\[data-title-active='true'\] \.rollercoaster-title-support \{\s*pointer-events: auto;/);
});
