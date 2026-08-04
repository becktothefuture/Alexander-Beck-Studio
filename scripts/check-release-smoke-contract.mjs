#!/usr/bin/env node
import assert from 'node:assert/strict';
import { ROUTE_MANIFEST } from '../react-app/app/src/lib/route-manifest.js';
import {
  RELEASE_SMOKE_ROUTES,
  assertRepresentativeKeyboardFocus,
  buildReleaseSmokeSuccessReport,
} from './lib/release-smoke-helpers.mjs';

const routeIds = RELEASE_SMOKE_ROUTES.map((route) => route.id);
const primaryRouteIds = Object.values(ROUTE_MANIFEST)
  .filter((route) => route.shellTab)
  .sort((left, right) => left.shellTab.order - right.shellTab.order)
  .map((route) => route.id);
assert.deepEqual(routeIds, primaryRouteIds);

const focusRoutes = RELEASE_SMOKE_ROUTES.filter((route) => route.representativeFocus);
assert.deepEqual(focusRoutes.map((route) => route.id), ['about', 'playground']);
for (const route of focusRoutes) {
  assert.equal(typeof route.representativeFocus.selector, 'string');
  assert.ok(route.representativeFocus.selector.length > 0);
}

const createFocusPage = ({ targetSelector, focusSequence, styles = {} }) => {
  let activeSelector = '';
  let pressCount = 0;
  return {
    keyboard: {
      async press(key) {
        assert.equal(key, 'Tab');
        activeSelector = focusSequence[Math.min(pressCount, focusSequence.length - 1)] || '';
        pressCount += 1;
      },
    },
    async evaluate() {
      return focusSequence.length + 1;
    },
    locator(selector) {
      assert.equal(selector, targetSelector);
      return {
        async evaluate(callback) {
          if (String(callback).includes('getComputedStyle')) {
            return {
              active: activeSelector === targetSelector,
              focusVisible: true,
              outlineStyle: 'solid',
              outlineWidth: 2,
              outlineColor: 'rgb(0, 0, 0)',
              outlineVisible: true,
              focusIndicatorVisible: true,
              indicatorKinds: ['outline'],
              inViewport: true,
              ...styles,
            };
          }
          return activeSelector === targetSelector;
        },
      };
    },
  };
};

for (const route of focusRoutes) {
  const targetSelector = route.representativeFocus.selector;
  const page = createFocusPage({
    targetSelector,
    focusSequence: ['[data-fixture-before-target]', targetSelector],
  });
  const result = await assertRepresentativeKeyboardFocus(page, route);
  assert.equal(result.active, true);
  assert.equal(result.focusIndicatorVisible, true);
}

const playground = focusRoutes.find((route) => route.id === 'playground');
const underlinedFocus = await assertRepresentativeKeyboardFocus(
  createFocusPage({
    targetSelector: playground.representativeFocus.selector,
    focusSequence: [playground.representativeFocus.selector],
    styles: {
      outlineStyle: 'none',
      outlineWidth: 0,
      outlineVisible: false,
      focusIndicatorVisible: true,
      indicatorKinds: ['descendant-underline'],
    },
  }),
  playground,
);
assert.deepEqual(underlinedFocus.indicatorKinds, ['descendant-underline']);

await assert.rejects(
  assertRepresentativeKeyboardFocus(
    createFocusPage({
      targetSelector: playground.representativeFocus.selector,
      focusSequence: [playground.representativeFocus.selector],
      styles: {
        outlineStyle: 'none',
        outlineWidth: 0,
        outlineVisible: false,
        focusIndicatorVisible: false,
        indicatorKinds: [],
      },
    }),
    playground,
  ),
  (error) => error.routeId === 'playground'
    && error.assertion === 'representative-focus-visible-style',
);

await assert.rejects(
  assertRepresentativeKeyboardFocus(
    createFocusPage({
      targetSelector: playground.representativeFocus.selector,
      focusSequence: ['[data-fixture-never-target]'],
    }),
    playground,
  ),
  (error) => error.routeId === 'playground'
    && error.assertion === 'representative-keyboard-focus-target',
);

const successReport = buildReleaseSmokeSuccessReport({
  browser: 'chromium',
  preview: '127.0.0.1:8015',
  baseUrl: 'http://127.0.0.1:8015',
  viewport: { width: 1280, height: 900 },
  durationMs: 1234,
  completedAt: '2026-07-31T00:00:00.000Z',
  results: [
    { phase: 'direct', routeId: 'home', durationMs: 500, internalState: 'omitted' },
    { phase: 'spa-return', routeId: 'portfolio', durationMs: 734 },
  ],
});
assert.deepEqual(successReport, {
  schemaVersion: 1,
  status: 'passed',
  completedAt: '2026-07-31T00:00:00.000Z',
  browser: 'chromium',
  preview: '127.0.0.1:8015',
  baseUrl: 'http://127.0.0.1:8015',
  viewport: { width: 1280, height: 900 },
  durationMs: 1234,
  diagnostics: {
    pageErrors: 0,
    consoleErrors: 0,
    failedResponses: 0,
    failedRequests: 0,
  },
  results: [
    { phase: 'direct', routeId: 'home', durationMs: 500 },
    { phase: 'spa-return', routeId: 'portfolio', durationMs: 734 },
  ],
});

console.log('PASS: release smoke route-aware focus, failure fixture, and success report contract.');
