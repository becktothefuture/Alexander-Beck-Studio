#!/usr/bin/env node

import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import process from 'node:process';
import { chromium, webkit } from 'playwright';
import { PNG } from 'pngjs';
import {
  RELEASE_SMOKE_ROUTES,
  startProductionPreview,
  waitForRouteReady,
} from './lib/release-smoke-helpers.mjs';

const repoRoot = resolve(fileURLToPath(new URL('..', import.meta.url)));
const outputRoot = resolve(repoRoot, 'output/playwright/focus-contrast');
const browserOption = String(process.env.ABS_BROWSER || 'all').trim().toLowerCase();
const browserLaunchers = new Map([
  ['chromium', chromium],
  ['webkit', webkit],
]);
const browserNames = browserOption === 'all' ? [...browserLaunchers.keys()] : [browserOption];
const themeOption = String(process.env.ABS_AUDIT_THEME || 'all').trim().toLowerCase();
const themes = themeOption === 'all' ? ['light', 'dark'] : [themeOption];
const profileOption = String(process.env.ABS_AUDIT_PROFILE || 'all').trim().toLowerCase();
const routeOption = String(process.env.ABS_AUDIT_ROUTE || 'all').trim().toLowerCase();
const ROUTE_READINESS_TIMEOUT_MS = 45_000;
const profiles = Object.freeze([
  Object.freeze({ id: 'desktop', viewport: Object.freeze({ width: 1280, height: 900 }), reducedMotion: 'no-preference' }),
  Object.freeze({ id: 'mobile-reduced', viewport: Object.freeze({ width: 390, height: 844 }), reducedMotion: 'reduce' }),
].filter((profile) => profileOption === 'all' || profile.id === profileOption));
const PORTFOLIO_INVITE_CODE = process.env.ABS_PORTFOLIO_CODE || '739284';
const focusableSelector = [
  'a[href]',
  'button:not(:disabled)',
  'input:not(:disabled)',
  'select:not(:disabled)',
  'textarea:not(:disabled)',
  '[tabindex]:not([tabindex="-1"])',
].join(',');
const contrastContracts = Object.freeze({
  home: Object.freeze({
    applicable: true,
    state: 'settled-home',
    expectations: Object.freeze([
      Object.freeze({ selector: '.decorative-script p', count: 1 }),
      Object.freeze({ selector: '.edge-caption__line', count: 1 }),
      Object.freeze({ selector: '.legend__item span', count: 6 }),
    ]),
  }),
  portfolio: Object.freeze({
    applicable: true,
    state: 'protected-project-gate',
    expectations: Object.freeze([
      Object.freeze({
        selector: '#portfolio-access-gate-description.route-centered-page__description',
        count: 1,
      }),
    ]),
  }),
  about: Object.freeze({
    applicable: false,
    state: 'production-coming-soon',
    reason: 'The production About contract renders only the Coming soon title and has no supporting normal text.',
    markerSelector: '#about-coming-soon-title.route-centered-page__title',
    markerCount: 1,
    unexpectedSelector: '.route-centered-page__description, .route-intro-description, .gate-description',
  }),
  contact: Object.freeze({
    applicable: true,
    state: 'settled-contact',
    expectations: Object.freeze([
      Object.freeze({ selector: '#contact-route-description.route-centered-page__description', count: 1 }),
    ]),
  }),
  playground: Object.freeze({
    applicable: true,
    state: 'settled-playground',
    expectations: Object.freeze([
      Object.freeze({ selector: '#playground-route-description.route-centered-page__description', count: 1 }),
    ]),
  }),
});

function getFocusContract(routeId, profile) {
  const shellExpectations = [
    { selector: '[data-button-bar-item]', count: 5, indicator: 'underline' },
    {
      selector: '.button-bar__sound-toggle',
      count: 1,
      exposedCount: profile.id === 'mobile-reduced' ? 0 : 1,
      minimumPassingEdges: 3,
    },
    { selector: '.button-bar__theme-toggle', count: 1, minimumPassingEdges: 3 },
    {
      selector: '.button-bar__mobile-theme-reset',
      count: 1,
      exposedCount: profile.id === 'mobile-reduced' ? 1 : 0,
      minimumPassingEdges: 3,
    },
  ];
  const routeExpectations = {
    home: [
      {
        selector: '#expertise-legend .legend__item--interactive:first-child',
        count: 1,
        indicator: 'underline',
      },
      {
        selector: '#expertise-legend .legend__item--interactive:not(:first-child)',
        count: 5,
        indicator: 'dual-ring',
      },
      { selector: '#contact-route-inline', count: 1, indicator: 'dual-ring' },
      { selector: '#social-links a', count: 2, indicator: 'dual-ring' },
      { selector: '.simulation-focus-switcher', count: 1, indicator: 'dual-ring' },
      ...shellExpectations,
    ],
    portfolio: [
      { selector: '.portfolio-project-card.is-active[tabindex="0"]', count: 1, indicator: 'underline' },
      ...shellExpectations,
    ],
    about: [...shellExpectations],
    contact: [
      { selector: '.contact-email-row', count: 1, indicator: 'dual-ring' },
      ...shellExpectations,
    ],
    playground: [
      {
        selector: '[data-playground-viewport][tabindex="0"]',
        count: 1,
        indicator: 'outline',
        // On the mobile shell, the stable Button Bar deliberately covers both
        // side edges. Require both unobscured horizontal edges to retain full
        // rendered contrast instead of treating shell occlusion as ring loss.
        minimumPassingEdges: 2,
      },
      {
        selector: '.playground-semantic-collection [data-playground-item] > button',
        count: 20,
        indicator: 'dual-ring',
        allowFocusReposition: true,
        allowPartialViewport: true,
        minimumPassingEdges: 3,
        minimumPassingEdgesWhenClipped: 1,
      },
      ...shellExpectations,
    ],
  };
  return {
    id: `${routeId}-settled`,
    scopeSelector: null,
    expectations: routeExpectations[routeId],
  };
}

const specialFocusContracts = Object.freeze({
  simulationModal: Object.freeze({
    id: 'home-simulation-modal',
    scopeSelector: '#simulation-focus-modal[aria-hidden="false"]',
    expectations: Object.freeze([
      Object.freeze({ selector: '.gate-back', count: 1, indicator: 'dual-ring' }),
      Object.freeze({ selector: '.simulation-focus-row', count: 17, indicator: 'dual-ring' }),
    ]),
  }),
  portfolioGate: Object.freeze({
    id: 'portfolio-protected-gate',
    scopeSelector: '.portfolio-access-gate.is-open',
    expectations: Object.freeze([
      Object.freeze({ selector: '.portfolio-access-gate__close', count: 1, indicator: 'dual-ring' }),
      Object.freeze({ selector: '.portfolio-digit', count: 6 }),
    ]),
  }),
  portfolioDrawer: Object.freeze({
    id: 'portfolio-project-drawer',
    scopeSelector: '.portfolio-project-view.is-open[aria-hidden="false"]',
    expectations: Object.freeze([
      Object.freeze({ selector: '.portfolio-project-view__back--top', count: 1, indicator: 'dual-ring' }),
      Object.freeze({ selector: '.portfolio-project-view__scroll[tabindex="0"]', count: 1, indicator: 'outline' }),
    ]),
  }),
});

const focusSuppressionMutationContracts = Object.freeze({
  'about-settled': Object.freeze({
    family: 'outline',
    selector: '.button-bar__sound-toggle, .button-bar__theme-toggle',
  }),
  'home-settled': Object.freeze([
    Object.freeze({
      family: 'underline',
      selector: '#expertise-legend .legend__item--interactive:first-child',
    }),
    Object.freeze({
      family: 'two-tone',
      selector: '#expertise-legend .legend__item--interactive:not(:first-child)',
    }),
  ]),
  'portfolio-settled': Object.freeze({ family: 'underline', selector: '.portfolio-project-card.is-active[tabindex="0"]' }),
  'portfolio-project-drawer': Object.freeze({ family: 'localized-cue', selector: '.portfolio-project-view__scroll[tabindex="0"]' }),
});

function assert(condition, message, details = null) {
  if (condition) return;
  throw new Error(`${message}${details ? `\n${JSON.stringify(details, null, 2)}` : ''}`);
}

function relativeLuminance([red, green, blue]) {
  const channels = [red, green, blue].map((channel) => {
    const value = channel / 255;
    return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
  });
  return (0.2126 * channels[0]) + (0.7152 * channels[1]) + (0.0722 * channels[2]);
}

function contrastRatio(foreground, background) {
  const foregroundLuminance = relativeLuminance(foreground);
  const backgroundLuminance = relativeLuminance(background);
  return (Math.max(foregroundLuminance, backgroundLuminance) + 0.05)
    / (Math.min(foregroundLuminance, backgroundLuminance) + 0.05);
}

function composite(foreground, background, opacity) {
  return foreground.map((channel, index) => (
    (channel * opacity) + (background[index] * (1 - opacity))
  ));
}

function validateContrastObservation(contract, observation, label) {
  assert(contract && typeof contract.applicable === 'boolean', `${label}: missing contrast route contract`);
  assert(observation?.state === contract.state, `${label}: contrast state did not match its route contract`, observation);

  if (!contract.applicable) {
    assert(Boolean(contract.reason), `${label}: non-applicable contrast contract needs a reason`);
    assert(
      observation.markerCount === contract.markerCount,
      `${label}: non-applicable route marker count changed`,
      observation,
    );
    assert(
      observation.markerVisibleCount === contract.markerCount,
      `${label}: non-applicable route marker is not visible`,
      observation,
    );
    assert(
      observation.unexpectedVisibleCount === 0,
      `${label}: supporting normal text appeared on a route marked non-applicable`,
      observation,
    );
    assert(observation.samples.length === 0, `${label}: non-applicable route unexpectedly produced samples`, observation);
    return;
  }

  const expectedSampleCount = contract.expectations.reduce((total, expectation) => total + expectation.count, 0);
  assert(expectedSampleCount > 0, `${label}: applicable contrast contract has no expected samples`);
  assert(
    observation.expectations.length === contract.expectations.length,
    `${label}: contrast expectation result count changed`,
    observation,
  );
  for (let index = 0; index < contract.expectations.length; index += 1) {
    const expected = contract.expectations[index];
    const actual = observation.expectations[index];
    assert(actual.selector === expected.selector, `${label}: contrast selector order changed`, actual);
    assert(actual.totalCount === expected.count, `${label}: contrast selector count changed`, actual);
    assert(actual.visibleCount === expected.count, `${label}: expected contrast target is not visible`, actual);
  }
  assert(
    observation.samples.length === expectedSampleCount,
    `${label}: contrast sample count did not match the route contract`,
    observation,
  );
  for (const sample of observation.samples) {
    assert(
      sample.foregroundRgb.length === 3
        && sample.backgroundRgb.length === 3
        && sample.foregroundRgb.every(Number.isFinite)
        && sample.backgroundRgb.every(Number.isFinite)
        && Number.isFinite(sample.effectiveOpacity),
      `${label}: contrast sample could not be measured`,
      sample,
    );
  }
}

function runContrastContractMutationChecks() {
  const applicable = {
    applicable: true,
    state: 'fixture',
    expectations: [{ selector: '.fixture-copy', count: 1 }],
  };
  const applicableObservation = {
    state: 'fixture',
    expectations: [{ selector: '.fixture-copy', totalCount: 1, visibleCount: 1 }],
    samples: [{ foregroundRgb: [0, 0, 0], backgroundRgb: [255, 255, 255], effectiveOpacity: 1 }],
  };
  validateContrastObservation(applicable, applicableObservation, 'mutation-fixture/applicable');

  let missingSampleFailed = false;
  try {
    validateContrastObservation(
      applicable,
      { ...applicableObservation, samples: [] },
      'mutation-fixture/missing-sample',
    );
  } catch {
    missingSampleFailed = true;
  }
  assert(missingSampleFailed, 'Contrast validator mutation check did not reject a missing sample');
  assert(
    contrastContracts.home.expectations.some(({ selector }) => selector === '.edge-caption__line')
      && !contrastContracts.home.expectations.some(({ selector }) => selector === '.edge-caption'),
    'Home contrast contract must sample the rendered edge-caption text child, not its container',
  );
  assert(
    contrastContracts.home.expectations.some(({ selector }) => selector === '.decorative-script p')
      && !contrastContracts.home.expectations.some(({ selector }) => selector === '.decorative-script'),
    'Home contrast contract must sample the rendered philosophy text child, not its container',
  );

  const notApplicable = {
    applicable: false,
    state: 'fixture-na',
    reason: 'Fixture has no supporting normal text.',
    markerCount: 1,
  };
  let unexpectedTextFailed = false;
  try {
    validateContrastObservation(notApplicable, {
      state: 'fixture-na',
      markerCount: 1,
      markerVisibleCount: 1,
      unexpectedVisibleCount: 1,
      samples: [],
    }, 'mutation-fixture/unexpected-text');
  } catch {
    unexpectedTextFailed = true;
  }
  assert(unexpectedTextFailed, 'Contrast validator mutation check did not reject unexpected supporting text');
}

function validateFocusInventory(contract, inventory, label) {
  const expectedCount = contract.expectations.reduce((total, expectation) => (
    total + (expectation.exposedCount ?? expectation.count)
  ), 0);
  const expectedElementIds = [];
  assert(inventory.expectations.length === contract.expectations.length, `${label}: focus expectation count changed`, inventory);
  for (let index = 0; index < contract.expectations.length; index += 1) {
    const expected = contract.expectations[index];
    const actual = inventory.expectations[index];
    const expectedExpectationId = `${label}-expectation-${index}`;
    assert(actual.selector === expected.selector, `${label}: focus selector order changed`, actual);
    assert(actual.expectationId === expectedExpectationId, `${label}: focus expectation identity changed`, actual);
    assert(actual.totalCount === expected.count, `${label}: expected focus target count changed`, actual);
    assert(
      actual.exposedCount === (expected.exposedCount ?? expected.count),
      `${label}: exposed focus target count changed`,
      actual,
    );
    assert(
      actual.exposedElements.length === actual.exposedCount,
      `${label}: exposed focus element identity count changed`,
      actual,
    );
    for (const element of actual.exposedElements) {
      assert(element.matchesFocusableSelector, `${label}: exposed expected control is not focusable`, {
        expectation: actual,
        element,
      });
      expectedElementIds.push(element.elementId);
    }
  }
  assert(
    new Set(expectedElementIds).size === expectedElementIds.length,
    `${label}: one exposed control matched more than one expected selector`,
    inventory,
  );
  assert(inventory.targets.length === expectedCount, `${label}: unaccounted or missing focus targets`, inventory);
  const discoveredElementIds = inventory.targets.map((target) => target.elementId);
  assert(
    new Set(discoveredElementIds).size === discoveredElementIds.length,
    `${label}: duplicate focus targets were discovered`,
    inventory,
  );
  for (const target of inventory.targets) {
    assert(
      target.matchedExpectationIds.length === 1,
      `${label}: discovered focus target must match exactly one expected selector`,
      target,
    );
    assert(
      target.expectationId === target.matchedExpectationIds[0] && Boolean(target.expectedSelector),
      `${label}: discovered focus target lost its expected-selector identity`,
      target,
    );
    assert(
      expectedElementIds.includes(target.elementId),
      `${label}: unrelated focusable element entered the state inventory`,
      target,
    );
  }
  assert(
    expectedElementIds.every((elementId) => discoveredElementIds.includes(elementId)),
    `${label}: an expected focusable element was not discovered as a target`,
    inventory,
  );
}

function runFocusContractMutationChecks() {
  const contract = { expectations: [{ selector: '.fixture-button', count: 1 }] };
  const valid = {
    expectations: [{
      selector: '.fixture-button',
      expectationId: 'mutation-fixture/focus-expectation-0',
      totalCount: 1,
      exposedCount: 1,
      exposedElements: [{ elementId: 'expected-button', matchesFocusableSelector: true }],
    }],
    targets: [{
      elementId: 'expected-button',
      expectationId: 'mutation-fixture/focus-expectation-0',
      expectedSelector: '.fixture-button',
      matchedExpectationIds: ['mutation-fixture/focus-expectation-0'],
    }],
  };
  validateFocusInventory(contract, valid, 'mutation-fixture/focus');
  let missingTargetFailed = false;
  try {
    validateFocusInventory(contract, { ...valid, targets: [] }, 'mutation-fixture/missing-focus-target');
  } catch {
    missingTargetFailed = true;
  }
  assert(missingTargetFailed, 'Focus validator mutation check did not reject a missing target');

  let substitutionFailed = false;
  try {
    validateFocusInventory(contract, {
      expectations: [{
        ...valid.expectations[0],
        exposedElements: [{ elementId: 'expected-button', matchesFocusableSelector: false }],
      }],
      targets: [{
        elementId: 'unrelated-link',
        expectationId: null,
        expectedSelector: null,
        matchedExpectationIds: [],
      }],
    }, 'mutation-fixture/focus');
  } catch {
    substitutionFailed = true;
  }
  assert(
    substitutionFailed,
    'Focus validator mutation check did not reject expected-control removal plus unrelated-focusable substitution',
  );
}

async function readFocusableContract(page, contract, keyboardKey = 'Tab') {
  const inventory = await page.evaluate(({ selector, stateContract }) => {
    const isExposed = (element) => {
      const rect = element.getBoundingClientRect();
      if (rect.width <= 0 || rect.height <= 0) return false;
      for (let current = element; current; current = current.parentElement) {
        const style = getComputedStyle(current);
        if (
          current.hidden
          || current.hasAttribute('inert')
          || current.getAttribute('aria-hidden') === 'true'
          || style.display === 'none'
          || style.visibility === 'hidden'
          || Number(style.opacity) === 0
        ) return false;
      }
      return true;
    };
    const root = stateContract.scopeSelector
      ? document.querySelector(stateContract.scopeSelector)
      : document;
    if (!root) {
      return { expectations: [], targets: [], missingScope: stateContract.scopeSelector };
    }
    const elementIds = new WeakMap();
    let nextElementId = 0;
    const getElementId = (element) => {
      if (!elementIds.has(element)) {
        elementIds.set(element, `${stateContract.id}-element-${nextElementId}`);
        nextElementId += 1;
      }
      return elementIds.get(element);
    };
    const expectations = stateContract.expectations.map((expectation, expectationIndex) => {
      const elements = [...root.querySelectorAll(expectation.selector)];
      const exposedElements = elements.filter(isExposed);
      return {
        selector: expectation.selector,
        expectationId: `${stateContract.id}-expectation-${expectationIndex}`,
        expectedCount: expectation.count,
        totalCount: elements.length,
        exposedCount: exposedElements.length,
        exposedElements: exposedElements.map((element) => ({
          elementId: getElementId(element),
          matchesFocusableSelector: element.matches(selector),
        })),
      };
    });
    const targets = [...root.querySelectorAll(selector)]
      .filter(isExposed)
      .map((element, index) => {
        const auditId = `${stateContract.id}-focus-${index}`;
        element.dataset.absFocusAuditId = auditId;
        const rect = element.getBoundingClientRect();
        const matchingExpectations = stateContract.expectations.flatMap((candidate, expectationIndex) => (
          element.matches(candidate.selector)
            ? [{ ...candidate, expectationId: `${stateContract.id}-expectation-${expectationIndex}` }]
            : []
        ));
        const expectation = matchingExpectations.length === 1 ? matchingExpectations[0] : null;
        return {
          auditId,
          elementId: getElementId(element),
          expectationId: expectation?.expectationId || null,
          expectedSelector: expectation?.selector || null,
          matchedExpectationIds: matchingExpectations.map(({ expectationId }) => expectationId),
          expectedIndicator: expectation?.indicator || 'outline',
          allowFocusReposition: Boolean(expectation?.allowFocusReposition),
          allowPartialViewport: Boolean(expectation?.allowPartialViewport),
          minimumPassingEdges: Number.isInteger(expectation?.minimumPassingEdges)
            ? expectation.minimumPassingEdges
            : null,
          minimumPassingEdgesWhenClipped: Number.isInteger(expectation?.minimumPassingEdgesWhenClipped)
            ? expectation.minimumPassingEdgesWhenClipped
            : null,
          label: element.getAttribute('aria-label')
            || element.textContent?.trim().replace(/\s+/g, ' ').slice(0, 80)
            || element.tagName.toLowerCase(),
          baseRect: { x: rect.x, y: rect.y, width: rect.width, height: rect.height },
        };
      });
    return { expectations, targets };
  }, { selector: focusableSelector, stateContract: contract });
  assert(!inventory.missingScope, `${contract.id}: focus scope was not mounted`, inventory);
  validateFocusInventory(contract, inventory, contract.id);
  const { targets } = inventory;

  await page.evaluate(() => document.activeElement?.blur());
  const visited = new Map();
  // WebKit's macOS-style Option+Tab traversal can consume an extra stop when
  // entering a focus-trapped dialog. Keep the traversal bounded, but allow two
  // complete passes through the exact, already-validated target inventory.
  for (let index = 0; index < (targets.length * 2) + 8; index += 1) {
    await page.keyboard.press(keyboardKey);
    await page.evaluate(() => new Promise((resolveFrame) => requestAnimationFrame(resolveFrame)));
    const activeAuditId = await page.evaluate(() => document.activeElement?.dataset?.absFocusAuditId || '');
    const activeTarget = targets.find((target) => target.auditId === activeAuditId);
    if (activeTarget?.expectedIndicator === 'dual-ring') await page.waitForTimeout(220);
    const row = await page.evaluate(() => {
      const resolveColor = (value) => {
        const canvas = document.createElement('canvas');
        canvas.width = 1;
        canvas.height = 1;
        const context = canvas.getContext('2d', { willReadFrequently: true });
        context.clearRect(0, 0, 1, 1);
        context.fillStyle = value;
        context.fillRect(0, 0, 1, 1);
        return [...context.getImageData(0, 0, 1, 1).data];
      };
      const element = document.activeElement;
      const auditId = element?.dataset?.absFocusAuditId || '';
      if (!auditId) return null;
      const style = getComputedStyle(element);
      const rect = element.getBoundingClientRect();
      const ownOutlineWidth = Number.parseFloat(style.outlineWidth || '0');
      const ownOutlineVisible = style.outlineStyle !== 'none'
        && ownOutlineWidth >= 2
        && style.outlineColor !== 'transparent'
        && !/rgba\([^)]*,\s*0(?:\.0+)?\)$/.test(style.outlineColor);
      const proxy = element.querySelector('[data-focus-indicator-proxy]');
      const proxyStyle = proxy ? getComputedStyle(proxy) : null;
      const proxyOutlineWidth = Number.parseFloat(proxyStyle?.outlineWidth || '0');
      const proxyOutlineVisible = Boolean(proxyStyle)
        && proxyStyle.outlineStyle !== 'none'
        && proxyOutlineWidth >= 2
        && proxyStyle.outlineColor !== 'transparent'
        && !/rgba\([^)]*,\s*0(?:\.0+)?\)$/.test(proxyStyle.outlineColor);
      const indicatorElement = ownOutlineVisible || !proxyOutlineVisible ? element : proxy;
      const indicatorStyle = indicatorElement === element ? style : proxyStyle;
      const indicatorRect = indicatorElement.getBoundingClientRect();
      const outlineWidth = Number.parseFloat(indicatorStyle.outlineWidth || '0');
      const outlineVisible = indicatorStyle.outlineStyle !== 'none'
        && outlineWidth >= 2
        && indicatorStyle.outlineColor !== 'transparent'
        && !/rgba\([^)]*,\s*0(?:\.0+)?\)$/.test(indicatorStyle.outlineColor);
      const shadowColors = [...indicatorStyle.boxShadow.matchAll(/rgba?\([^)]*\)/g)].map((match) => match[0]);
      const resolvedShadowColors = shadowColors.map((color) => ({ color, rgba: resolveColor(color) }));
      const visibleShadow = resolvedShadowColors.findLast(({ rgba }) => rgba[3] > 0) || null;
      const shadowVisible = indicatorStyle.boxShadow !== 'none' && Boolean(visibleShadow);
      const underlinedElement = [element, ...element.querySelectorAll('*')].find((child) => {
        const childStyle = getComputedStyle(child);
        return childStyle.textDecorationLine.includes('underline')
          && Number.parseFloat(childStyle.textDecorationThickness || '0') >= 2;
      }) || null;
      const underlineStyle = underlinedElement ? getComputedStyle(underlinedElement) : null;
      const underlineRect = underlinedElement?.getBoundingClientRect() || null;
      const underlineLineRects = underlinedElement ? (() => {
        const range = document.createRange();
        range.selectNodeContents(underlinedElement);
        const seen = new Set();
        return [...range.getClientRects()].flatMap((lineRect) => {
          if (lineRect.width <= 0 || lineRect.height <= 0) return [];
          const key = [lineRect.x, lineRect.y, lineRect.width, lineRect.height]
            .map((value) => Math.round(value * 4) / 4)
            .join(':');
          if (seen.has(key)) return [];
          seen.add(key);
          return [{ x: lineRect.x, y: lineRect.y, width: lineRect.width, height: lineRect.height }];
        });
      })() : [];
      const indicator = outlineVisible && shadowVisible
        ? {
            kind: 'dual-ring',
            color: `${indicatorStyle.outlineColor} + ${visibleShadow.color}`,
            rgba: resolveColor(indicatorStyle.outlineColor),
            boxShadow: indicatorStyle.boxShadow,
            secondaryRgba: visibleShadow.rgba,
            width: outlineWidth,
            offset: Number.parseFloat(indicatorStyle.outlineOffset || '0'),
            borderRadius: Number.parseFloat(indicatorStyle.borderTopLeftRadius || '0'),
            rect: { x: indicatorRect.x, y: indicatorRect.y, width: indicatorRect.width, height: indicatorRect.height },
          }
        : outlineVisible
        ? {
            kind: 'outline',
            color: indicatorStyle.outlineColor,
            rgba: resolveColor(indicatorStyle.outlineColor),
            width: outlineWidth,
            offset: Number.parseFloat(indicatorStyle.outlineOffset || '0'),
            borderRadius: Number.parseFloat(indicatorStyle.borderTopLeftRadius || '0'),
            rect: { x: indicatorRect.x, y: indicatorRect.y, width: indicatorRect.width, height: indicatorRect.height },
          }
        : underlinedElement
          ? {
              kind: 'underline',
              color: underlineStyle.textDecorationColor,
              rgba: resolveColor(underlineStyle.textDecorationColor),
              width: Number.parseFloat(underlineStyle.textDecorationThickness || '0'),
              offset: Number.parseFloat(underlineStyle.textUnderlineOffset || '0'),
              rect: {
                x: underlineRect.x,
                y: underlineRect.y,
                width: underlineRect.width,
                height: underlineRect.height,
              },
              lineRects: underlineLineRects,
            }
          : null;
      return {
        auditId,
        focusVisible: element.matches(':focus-visible'),
        outlineStyle: style.outlineStyle,
        outlineWidth: ownOutlineWidth,
        outlineColor: style.outlineColor,
        outlineVisible,
        underlined: Boolean(underlinedElement),
        indicator,
        focusRect: { x: rect.x, y: rect.y, width: rect.width, height: rect.height },
      };
    });
    if (row && !visited.has(row.auditId)) visited.set(row.auditId, row);
  }

  return targets.map((target) => ({ ...target, ...(visited.get(target.auditId) || {}) }));
}

async function readScreenshotPixels(page) {
  const screenshot = await page.screenshot({ animations: 'disabled' });
  const image = PNG.sync.read(screenshot);
  return { data: image.data, width: image.width, height: image.height, channels: 4 };
}

function readPixel(image, x, y) {
  const pixelX = Math.max(0, Math.min(image.width - 1, Math.round(x)));
  const pixelY = Math.max(0, Math.min(image.height - 1, Math.round(y)));
  const offset = ((pixelY * image.width) + pixelX) * image.channels;
  return [image.data[offset], image.data[offset + 1], image.data[offset + 2]];
}

async function writeFocusEvidenceCrop(image, indicator, label, auditId, variant) {
  const margin = Math.ceil(Math.abs(indicator.offset || 0) + indicator.width + 8);
  const left = Math.max(0, Math.floor(indicator.rect.x - margin));
  const top = Math.max(0, Math.floor(indicator.rect.y - margin));
  const right = Math.min(image.width, Math.ceil(indicator.rect.x + indicator.rect.width + margin));
  const bottom = Math.min(image.height, Math.ceil(indicator.rect.y + indicator.rect.height + margin));
  const crop = new PNG({ width: right - left, height: bottom - top });
  for (let row = 0; row < crop.height; row += 1) {
    const sourceStart = (((top + row) * image.width) + left) * image.channels;
    const destinationStart = row * crop.width * 4;
    image.data.copy(crop.data, destinationStart, sourceStart, sourceStart + (crop.width * 4));
  }
  const evidenceDirectory = resolve(outputRoot, 'focus-evidence');
  await mkdir(evidenceDirectory, { recursive: true });
  const filename = `${label}-${auditId}-${variant}`.replace(/[^a-z0-9_-]+/gi, '-').toLowerCase();
  const path = resolve(evidenceDirectory, `${filename}.png`);
  await writeFile(path, PNG.sync.write(crop));
  return `output/playwright/focus-contrast/focus-evidence/${filename}.png`;
}

function buildBandPoints(center, edge, width) {
  const count = Math.max(1, Math.ceil(width));
  const start = -((count - 1) / 2);
  const points = Array.from({ length: count }, (_, index) => {
    const offset = start + index;
    return edge === 'top' || edge === 'bottom'
      ? { x: center.x, y: center.y + offset }
      : { x: center.x + offset, y: center.y };
  });
  const seen = new Set();
  return points.flatMap((point) => {
    const pixelPoint = { x: Math.floor(point.x), y: Math.floor(point.y) };
    const key = `${pixelPoint.x}:${pixelPoint.y}`;
    if (seen.has(key)) return [];
    seen.add(key);
    return [pixelPoint];
  });
}

function buildIndicatorProbePairs(indicator) {
  const rect = indicator.rect;
  if (indicator.kind === 'underline') {
    const lineRects = indicator.lineRects?.length ? indicator.lineRects : [rect];
    return lineRects.flatMap((lineRect, lineIndex) => (
      [0.2, 0.35, 0.5, 0.65, 0.8].map((position) => ({
        edge: `underline-line-${lineIndex + 1}`,
        bands: [
          {
            name: 'underline-line-box',
            points: buildBandPoints({
              x: lineRect.x + (lineRect.width * position),
              // Browser text-decoration geometry is baseline-relative. The
              // DOM Range exposes the line box rather than the baseline, so
              // probe the rendered line-box edge as well as the declared
              // offset estimate below.
              y: lineRect.y + lineRect.height - (indicator.width / 2),
            }, 'bottom', indicator.width),
          },
          {
            name: 'underline-declared-offset',
            points: buildBandPoints({
              x: lineRect.x + (lineRect.width * position),
              y: lineRects.length === 1
                ? rect.y + rect.height + indicator.offset + (indicator.width / 2)
                : lineRect.y + lineRect.height - indicator.offset + (indicator.width / 4),
            }, 'bottom', indicator.width),
          },
        ],
      }))
    ));
  }
  const inset = indicator.offset < 0;
  const primaryDistance = inset
    ? Math.max(1, Math.abs(indicator.offset))
    : Math.max(1, indicator.offset + (indicator.width / 2));
  const secondaryDistance = indicator.kind === 'dual-ring'
    ? indicator.boxShadow.includes('inset')
      ? 0
      : Math.max(1, Math.abs(indicator.offset) / 2)
    : null;
  const minimumDimension = Math.min(rect.width, rect.height);
  const isRoundedControl = (indicator.borderRadius || 0) >= minimumDimension * 0.35;
  // Pills and circles have only one cardinal point for each named edge. Other
  // controls retain three tightly centered probes along their straight sides.
  const positions = isRoundedControl ? [0.5] : [0.45, 0.5, 0.55];
  const coordinate = (edge, position, distance) => {
    if (edge === 'top') return { x: rect.x + (rect.width * position), y: rect.y + (inset ? distance : -distance) };
    if (edge === 'bottom') return { x: rect.x + (rect.width * position), y: rect.y + rect.height + (inset ? -distance : distance) };
    if (edge === 'left') return { x: rect.x + (inset ? distance : -distance), y: rect.y + (rect.height * position) };
    return { x: rect.x + rect.width + (inset ? -distance : distance), y: rect.y + (rect.height * position) };
  };
  return ['top', 'bottom', 'left', 'right'].flatMap((edge) => positions.map((position) => {
    const bands = [{
      name: 'primary',
      points: buildBandPoints(coordinate(edge, position, primaryDistance), edge, indicator.width),
    }];
    if (secondaryDistance !== null) {
      bands.push({
        name: 'counter',
        points: buildBandPoints(coordinate(edge, position, secondaryDistance), edge, indicator.width),
      });
    }
    return {
      edge,
      bands,
    };
  }));
}

function channelDelta(first, second) {
  return Math.max(...first.map((channel, index) => Math.abs(channel - second[index])));
}

async function setFocusStyleSuppression(page, suppressed) {
  await page.evaluate((enabled) => {
    const styleId = 'abs-focus-audit-suppression-style';
    let style = document.getElementById(styleId);
    if (!style) {
      style = document.createElement('style');
      style.id = styleId;
      style.textContent = `
        html[data-abs-focus-audit-suppress='true'] *:focus-visible,
        html[data-abs-focus-audit-suppress='true'] *:focus-visible * {
          outline: none !important;
          box-shadow: none !important;
          text-decoration: none !important;
        }
      `;
      document.head.append(style);
    }
    if (enabled) document.documentElement.dataset.absFocusAuditSuppress = 'true';
    else delete document.documentElement.dataset.absFocusAuditSuppress;
  }, suppressed);
}

async function freezeRenderedState(page) {
  await Promise.all(page.frames().map((frame) => frame.evaluate(() => {
    if (window.__ABS_FOCUS_AUDIT_FREEZE__) throw new Error('Focus audit render state is already frozen');
    const style = document.createElement('style');
    style.id = 'abs-focus-audit-freeze-style';
    style.textContent = `
      html[data-abs-focus-audit-frozen='true'] *,
      html[data-abs-focus-audit-frozen='true'] *::before,
      html[data-abs-focus-audit-frozen='true'] *::after {
        animation-play-state: paused !important;
        transition: none !important;
        caret-color: transparent !important;
      }
    `;
    document.head.append(style);
    document.documentElement.dataset.absFocusAuditFrozen = 'true';
    const videos = [...document.querySelectorAll('video')].map((video) => ({ video, wasPaused: video.paused }));
    for (const { video } of videos) video.pause();
    const originalRequestAnimationFrame = window.requestAnimationFrame;
    const originalCancelAnimationFrame = window.cancelAnimationFrame;
    const queuedCallbacks = new Map();
    let nextQueuedId = -1;
    window.requestAnimationFrame = (callback) => {
      const id = nextQueuedId;
      nextQueuedId -= 1;
      queuedCallbacks.set(id, callback);
      return id;
    };
    window.cancelAnimationFrame = (id) => {
      if (queuedCallbacks.has(id)) queuedCallbacks.delete(id);
      else originalCancelAnimationFrame.call(window, id);
    };
    window.__ABS_FOCUS_AUDIT_FREEZE__ = {
      originalRequestAnimationFrame,
      originalCancelAnimationFrame,
      queuedCallbacks,
      videos,
    };
  })));
  // Let every RAF callback already submitted before the patch finish once and
  // queue its successor. The page then remains on one rendered frame.
  await page.waitForTimeout(80);
  await Promise.all(page.frames().map((frame) => frame.evaluate(() => {
    const state = window.__ABS_FOCUS_AUDIT_FREEZE__;
    state.canvasFrames = [...document.querySelectorAll('canvas')].flatMap((canvas) => {
      const context = canvas.getContext('2d');
      if (!context || canvas.width <= 0 || canvas.height <= 0) return [];
      return [{
        canvas,
        context,
        imageData: context.getImageData(0, 0, canvas.width, canvas.height),
      }];
    });
  })));
}

async function restoreFrozenCanvasFrames(page) {
  await Promise.all(page.frames().map((frame) => frame.evaluate(() => {
    const state = window.__ABS_FOCUS_AUDIT_FREEZE__;
    for (const { context, imageData } of state?.canvasFrames || []) {
      context.putImageData(imageData, 0, 0);
    }
  })));
}

async function restoreRenderedState(page) {
  await Promise.all(page.frames().map((frame) => frame.evaluate(() => {
    const state = window.__ABS_FOCUS_AUDIT_FREEZE__;
    if (!state) return;
    window.requestAnimationFrame = state.originalRequestAnimationFrame;
    window.cancelAnimationFrame = state.originalCancelAnimationFrame;
    const callbacks = [...state.queuedCallbacks.values()];
    delete window.__ABS_FOCUS_AUDIT_FREEZE__;
    delete document.documentElement.dataset.absFocusAuditFrozen;
    document.getElementById('abs-focus-audit-freeze-style')?.remove();
    for (const callback of callbacks) window.requestAnimationFrame(callback);
    for (const { video, wasPaused } of state.videos) {
      if (!wasPaused) void video.play().catch(() => {});
    }
  })));
}

async function readIndicatorGeometry(locator, indicatorKind) {
  return locator.evaluate((element, kind) => {
      const elementRect = element.getBoundingClientRect();
      let indicatorRect = elementRect;
      let lineRects = [];
      if (kind === 'underline') {
        const underlinedElement = [element, ...element.querySelectorAll('*')].find((child) => (
          getComputedStyle(child).textDecorationLine.includes('underline')
        ));
        if (underlinedElement) {
          indicatorRect = underlinedElement.getBoundingClientRect();
          const range = document.createRange();
          range.selectNodeContents(underlinedElement);
          const seen = new Set();
          lineRects = [...range.getClientRects()].flatMap((lineRect) => {
            if (lineRect.width <= 0 || lineRect.height <= 0) return [];
            const key = [lineRect.x, lineRect.y, lineRect.width, lineRect.height]
              .map((value) => Math.round(value * 4) / 4)
              .join(':');
            if (seen.has(key)) return [];
            seen.add(key);
            return [{ x: lineRect.x, y: lineRect.y, width: lineRect.width, height: lineRect.height }];
          });
        }
      } else {
        const proxy = element.querySelector('[data-focus-indicator-proxy]');
        if (proxy && getComputedStyle(proxy).outlineStyle !== 'none') {
          indicatorRect = proxy.getBoundingClientRect();
        }
      }
      return {
        focusVisible: element.matches(':focus-visible'),
        elementRect: {
          x: elementRect.x,
          y: elementRect.y,
          width: elementRect.width,
          height: elementRect.height,
        },
        rect: {
          x: indicatorRect.x,
          y: indicatorRect.y,
          width: indicatorRect.width,
          height: indicatorRect.height,
        },
        lineRects,
      };
    }, indicatorKind);
}

function analyzeFocusPixelFrames(unfocusedImage, unfocusedVerificationImage, focusedImage, indicator) {
  const pairs = buildIndicatorProbePairs(indicator).filter(({ bands }) => (
    bands.every(({ points }) => points.every(({ x, y }) => (
      x >= 0 && x < focusedImage.width && y >= 0 && y < focusedImage.height
    )))
  ));
  const actualPixelSamples = pairs.map(({ edge, bands }) => {
    const bandSamples = bands.map((band) => {
      const pixels = band.points.map(({ x, y }) => {
        const unfocusedRenderedBackgroundRgb = readPixel(unfocusedImage, x, y);
        const unfocusedVerificationRgb = readPixel(unfocusedVerificationImage, x, y);
        const focusedIndicatorRgb = readPixel(focusedImage, x, y);
        const baselineStabilityChannelDelta = channelDelta(
          unfocusedRenderedBackgroundRgb,
          unfocusedVerificationRgb,
        );
        const focusInducedContrastRatio = contrastRatio(
          focusedIndicatorRgb,
          unfocusedRenderedBackgroundRgb,
        );
        return {
          x,
          y,
          unfocusedRenderedBackgroundRgb,
          unfocusedVerificationRgb,
          focusedIndicatorRgb,
          baselineStabilityChannelDelta,
          channelDelta: channelDelta(unfocusedRenderedBackgroundRgb, focusedIndicatorRgb),
          focusInducedContrastRatio,
          passes: baselineStabilityChannelDelta <= 2 && focusInducedContrastRatio >= 3,
        };
      });
      let longestPassingRun = 0;
      let currentPassingRun = 0;
      for (const pixel of pixels) {
        currentPassingRun = pixel.passes ? currentPassingRun + 1 : 0;
        longestPassingRun = Math.max(longestPassingRun, currentPassingRun);
      }
      // The computed-style contract already requires a 2 CSS px indicator.
      // A subpixel-positioned 2 px stroke can rasterize as one fully covered
      // pixel plus two antialiased boundary pixels, so requiring two complete
      // raster pixels would incorrectly reject the declared 2 px geometry.
      // Require a threshold-passing exact-coordinate pixel inside that fixed
      // computed band; edge/line coverage is enforced independently below.
      const requiredContiguousPixels = 1;
      const passingPixels = pixels.filter(({ passes }) => passes);
      return {
        name: band.name,
        requiredContiguousPixels,
        longestPassingRun,
        passes: longestPassingRun >= requiredContiguousPixels,
        minimumPassingPixelContrastRatio: passingPixels.length
          ? Math.min(...passingPixels.map(({ focusInducedContrastRatio }) => focusInducedContrastRatio))
          : null,
        pixels,
      };
    });
    const passingBands = bandSamples.filter(({ passes }) => passes);
    const selectedBand = passingBands.length
      ? passingBands.reduce((best, candidate) => (
          candidate.minimumPassingPixelContrastRatio > best.minimumPassingPixelContrastRatio
            ? candidate
            : best
        ))
      : null;
    return {
      edge,
      bandSamples,
      passes: Boolean(selectedBand),
      selectedBand: selectedBand?.name || null,
      minimumPassingProbeContrastRatio: selectedBand?.minimumPassingPixelContrastRatio || null,
    };
  });
  const edgeSummaries = [...new Set(actualPixelSamples.map(({ edge }) => edge))].map((edge) => {
    const edgeSamples = actualPixelSamples.filter((sample) => sample.edge === edge);
    const passingSamples = edgeSamples.filter(({ passes }) => passes);
    const requiredPassingProbes = Math.ceil(edgeSamples.length / 2);
    return {
      edge,
      probeCount: edgeSamples.length,
      passingProbeCount: passingSamples.length,
      requiredPassingProbes,
      passes: passingSamples.length >= requiredPassingProbes,
      minimumPassingProbeContrastRatio: passingSamples.length
        ? Math.min(...passingSamples.map(({ minimumPassingProbeContrastRatio }) => (
            minimumPassingProbeContrastRatio
          )))
        : null,
    };
  });
  const passingEdges = edgeSummaries.filter(({ passes }) => passes);
  const clippedEdgeMinimum = edgeSummaries.length < 4
    && Number.isInteger(indicator.minimumPassingEdgesWhenClipped)
      ? indicator.minimumPassingEdgesWhenClipped
      : null;
  const requiredPassingEdges = Number.isInteger(clippedEdgeMinimum)
    ? Math.min(edgeSummaries.length, Math.max(1, clippedEdgeMinimum))
    : Number.isInteger(indicator.minimumPassingEdges)
      ? Math.min(edgeSummaries.length, Math.max(1, indicator.minimumPassingEdges))
    : indicator.kind === 'underline' || indicator.allowPartialViewport
      ? edgeSummaries.length
      : 4;
  return {
    requiredPassingEdges,
    passingEdgeCount: passingEdges.length,
    passes: passingEdges.length >= requiredPassingEdges,
    edgeSummaries,
    actualPixelSamples,
    minimumPassingFocusPixelContrastRatio: passingEdges.length
      ? Math.min(...passingEdges.map(({ minimumPassingProbeContrastRatio }) => minimumPassingProbeContrastRatio))
      : null,
  };
}

async function captureFocusIndicatorEvidence(page, target, label, { suppressFocusStyles = false } = {}) {
  const locator = page.locator(`[data-abs-focus-audit-id="${target.auditId}"]`);
  await locator.focus();
  await page.waitForTimeout(30);
  await locator.blur();
  await setFocusStyleSuppression(page, suppressFocusStyles);
  let unfocusedImage;
  let unfocusedVerificationImage;
  let focusedImage;
  let establishedGeometry;
  let focusedState;
  try {
    await freezeRenderedState(page);
    await locator.focus();
    establishedGeometry = await readIndicatorGeometry(locator, target.indicator.kind);
    await locator.blur();
    await restoreFrozenCanvasFrames(page);
    unfocusedImage = await readScreenshotPixels(page);
    await page.waitForTimeout(30);
    await restoreFrozenCanvasFrames(page);
    unfocusedVerificationImage = await readScreenshotPixels(page);
    await locator.focus();
    await page.waitForTimeout(30);
    focusedState = await readIndicatorGeometry(locator, target.indicator.kind);
    await restoreFrozenCanvasFrames(page);
    focusedImage = await readScreenshotPixels(page);
  } finally {
    await restoreRenderedState(page);
    await setFocusStyleSuppression(page, false);
  }
  assert(focusedState.focusVisible, `${label}: ${target.label} lost :focus-visible during pixel capture`, target);
  for (const dimension of ['x', 'y', 'width', 'height']) {
    assert(
      Math.abs(establishedGeometry.elementRect[dimension] - focusedState.elementRect[dimension]) <= 0.25,
      `${label}: ${target.label} focus evidence geometry changed between matching frames`,
      { establishedGeometry, focusedState },
    );
  }
    const indicator = {
      ...target.indicator,
      allowPartialViewport: target.allowPartialViewport,
      minimumPassingEdges: target.minimumPassingEdges,
      minimumPassingEdgesWhenClipped: target.minimumPassingEdgesWhenClipped,
      rect: focusedState.rect,
      lineRects: focusedState.lineRects.length ? focusedState.lineRects : target.indicator.lineRects,
    };
  const observation = analyzeFocusPixelFrames(
    unfocusedImage,
    unfocusedVerificationImage,
    focusedImage,
    indicator,
  );
  const variantPrefix = suppressFocusStyles ? 'suppressed-' : '';
  const [unfocusedScreenshot, focusedScreenshot] = await Promise.all([
    writeFocusEvidenceCrop(unfocusedImage, indicator, label, target.auditId, `${variantPrefix}unfocused`),
    writeFocusEvidenceCrop(focusedImage, indicator, label, target.auditId, `${variantPrefix}focused`),
  ]);
  return { ...observation, indicator, unfocusedScreenshot, focusedScreenshot };
}

function validateFocusPixelEvidence(observation, target, label) {
  assert(observation.actualPixelSamples.length > 0, `${label}: ${target.label} had no in-frame focus-pixel probes`, target);
  for (const sample of observation.actualPixelSamples) {
    for (const band of sample.bandSamples) {
      for (const pixel of band.pixels) {
        assert(
          pixel.baselineStabilityChannelDelta <= 2,
          `${label}: ${target.label} unfocused baseline changed between frozen matching frames`,
          pixel,
        );
      }
    }
  }
  assert(
      observation.passes,
      `${label}: ${target.label} had insufficient high-contrast rendered focus-edge coverage`,
      { ...target, ...observation },
    );
}

async function attachFocusIndicatorEvidence(page, focus, contract, label) {
  const evidence = [];
  for (const target of focus) {
    assert(target.indicator, `${label}: ${target.label} had no measurable focus indicator`, target);
    assert(
      target.indicator.kind === target.expectedIndicator,
      `${label}: ${target.label} used an unapproved focus indicator`,
      target,
    );
    const observation = await captureFocusIndicatorEvidence(page, target, label);
    validateFocusPixelEvidence(observation, target, label);
    evidence.push({
      ...target,
      ...observation,
      focusPixelEvidenceMethod: 'fixed computed-geometry bands in frozen matching frames; two unfocused captures first prove the exact band coordinates stable, then a rendered pixel inside each declared 2 CSS px indicator band must differ from that same-coordinate unfocused background by at least 3:1, with coverage on all four outline edges or every rendered underline line fragment',
    });
  }

  const mutationContracts = focusSuppressionMutationContracts[contract.id] || [];
  for (const mutationContract of Array.isArray(mutationContracts) ? mutationContracts : [mutationContracts]) {
    let mutationIndex = -1;
    for (let index = 0; index < focus.length; index += 1) {
      const matches = await page.locator(`[data-abs-focus-audit-id="${focus[index].auditId}"]`)
        .evaluate((element, selector) => element.matches(selector), mutationContract.selector);
      if (matches) {
        mutationIndex = index;
        break;
      }
    }
    assert(mutationIndex >= 0, `${label}: missing ${mutationContract.family} suppression-mutation target`);
    const mutationTarget = focus[mutationIndex];
    const mutationObservation = await captureFocusIndicatorEvidence(
      page,
      mutationTarget,
      `${label}/suppressed-${mutationContract.family}`,
      { suppressFocusStyles: true },
    );
    assert(
      !mutationObservation.passes,
      `${label}: ${mutationContract.family} focus-style suppression mutation did not fail`,
      mutationObservation,
    );
    evidence[mutationIndex].focusStyleSuppressionMutation = {
      family: mutationContract.family,
      rejected: true,
      passingEdgeCount: mutationObservation.passingEdgeCount,
      requiredPassingEdges: mutationObservation.requiredPassingEdges,
      unfocusedScreenshot: mutationObservation.unfocusedScreenshot,
      focusedScreenshot: mutationObservation.focusedScreenshot,
    };
  }
  return evidence;
}

async function prepareSettledRouteState(page, routeId) {
  if (routeId === 'home') {
    await page.locator('.simulation-focus-switcher').waitFor({ state: 'visible', timeout: 30_000 });
  }
  if (routeId !== 'portfolio') return;
  await page.waitForFunction(() => {
    const mount = document.getElementById('portfolioProjectMount');
    const activeCard = mount?.querySelector('.portfolio-project-card.is-active');
    return mount?.dataset?.portfolioEntrancePhase === 'complete'
      && activeCard?.getAttribute('tabindex') === '0';
  }, undefined, { timeout: 30_000, polling: 25 });
}

async function waitForPortfolioGate(page) {
  await page.waitForFunction(() => {
    const gate = document.querySelector('.portfolio-access-gate.is-open');
    const gateStyle = gate ? getComputedStyle(gate) : null;
    const contentLayer = gate?.closest('.window-overlay-content-layer');
    const contentStyle = contentLayer ? getComputedStyle(contentLayer) : null;
    return document.documentElement.dataset.absPortfolioAccessGatePhase === 'open'
      && Boolean(gate)
      && Number.parseFloat(gateStyle.opacity || '0') >= 0.999
      && (gateStyle.filter === 'none' || gateStyle.filter === 'blur(0px)')
      && Number.parseFloat(contentStyle?.opacity || '0') >= 0.999
      && contentStyle?.visibility === 'visible';
  }, undefined, { timeout: 30_000, polling: 25 });
}

async function waitForPortfolioGateClosed(page) {
  await page.waitForFunction(() => (
    !document.documentElement.classList.contains('portfolio-access-gate-open')
    && !document.documentElement.classList.contains('portfolio-access-gate-closing')
    && !document.querySelector('.portfolio-access-gate')
  ), undefined, { timeout: 30_000, polling: 25 });
}

async function waitForPortfolioDrawer(page, isOpen = true) {
  await page.waitForFunction((expectedOpen) => {
    const drawer = document.querySelector('.portfolio-project-view');
    const backButton = drawer?.querySelector('.portfolio-project-view__back--top');
    const backExposed = Boolean(backButton) && (() => {
      for (let current = backButton; current; current = current.parentElement) {
        const style = getComputedStyle(current);
        if (style.display === 'none' || style.visibility === 'hidden' || Number(style.opacity) === 0) return false;
      }
      return true;
    })();
    const open = document.body.classList.contains('portfolio-project-open')
      && drawer?.classList.contains('is-open')
      && drawer?.getAttribute('aria-hidden') === 'false'
      && backExposed;
    return expectedOpen ? open : !document.body.classList.contains('portfolio-project-open');
  }, isOpen, { timeout: 30_000, polling: 25 });
}

async function fillPortfolioGate(page) {
  const inputs = page.locator('.portfolio-access-gate.is-open .portfolio-digit');
  assert(await inputs.count() === PORTFOLIO_INVITE_CODE.length, 'Portfolio gate digit count changed');
  for (let index = 0; index < PORTFOLIO_INVITE_CODE.length; index += 1) {
    await inputs.nth(index).fill(PORTFOLIO_INVITE_CODE[index]);
  }
}

async function auditFocusState(page, contract, keyboardKey, label) {
  let focus = await readFocusableContract(page, contract, keyboardKey);
  for (const target of focus) {
    assert(target.focusVisible, `${label}: ${target.label} was not keyboard reachable`, target);
    assert(target.indicator, `${label}: ${target.label} had no visible focus indicator`, target);
    const stableDimensions = target.allowFocusReposition
      ? ['width', 'height']
      : ['x', 'width', 'height'];
    for (const dimension of stableDimensions) {
      assert(
        Math.abs(target.baseRect[dimension] - target.focusRect[dimension]) <= 0.25,
        `${label}: focus changed ${target.label} layout`,
        target,
      );
    }
  }
  focus = await attachFocusIndicatorEvidence(page, focus, contract, label);
  return focus;
}

async function auditContrastState(page, routeId, label) {
  const contract = contrastContracts[routeId];
  if (routeId === 'playground') {
    await page.evaluate(() => window.__ABS_PLAYGROUND__?.recenter?.());
    await page.waitForFunction(() => {
      const description = document.querySelector('#playground-route-description');
      const rect = description?.getBoundingClientRect();
      return Boolean(
        rect
        && rect.bottom > 0
        && rect.top < innerHeight
        && rect.right > 0
        && rect.left < innerWidth
      );
    }, undefined, { timeout: 10_000, polling: 'raf' });
  }
  const frameCount = routeId === 'home' ? 3 : 1;
  const frames = [];
  for (let frameIndex = 0; frameIndex < frameCount; frameIndex += 1) {
    let observation = await readContrastContract(page, contract);
    validateContrastObservation(contract, observation, `${label}/frame-${frameIndex + 1}`);
    observation = await attachRenderedBackgroundEvidence(
      page,
      observation,
      contract,
      `${label}/frame-${frameIndex + 1}`,
    );
    frames.push(observation);
    if (frameIndex < frameCount - 1) await page.waitForTimeout(300);
  }
  if (frameCount === 1) return frames[0];
  return {
    ...frames[0],
    representativeFrameCount: frameCount,
    samples: frames[0].samples.map((sample, sampleIndex) => {
      const representativeFrames = frames.map((frame, frameIndex) => ({
        frameIndex: frameIndex + 1,
        glyphPixelCount: frame.samples[sampleIndex].glyphPixelCount,
        renderedBackgroundContrastRatio: frame.samples[sampleIndex].renderedBackgroundContrastRatio,
        worstPixel: frame.samples[sampleIndex].worstPixel,
      }));
      const worstFrame = representativeFrames.reduce((worst, frame) => (
        frame.renderedBackgroundContrastRatio < worst.renderedBackgroundContrastRatio ? frame : worst
      ));
      return {
        ...sample,
        representativeFrames,
        renderedBackgroundContrastRatio: worstFrame.renderedBackgroundContrastRatio,
        worstPixel: worstFrame.worstPixel,
      };
    }),
  };
}

async function readContrastContract(page, contract) {
  return page.evaluate((routeContract) => {
    const parseRgb = (value) => {
      const channels = String(value).match(/[\d.]+/g)?.map(Number) || [];
      return {
        rgb: channels.slice(0, 3),
        alpha: channels.length > 3 ? channels[3] : 1,
      };
    };
    const resolveColor = (value, property) => {
      const probe = document.createElement('span');
      probe.style[property] = value;
      document.body.append(probe);
      const resolved = getComputedStyle(probe)[property];
      probe.remove();
      return resolved;
    };
    const isVisible = (element) => {
      const rect = element.getBoundingClientRect();
      if (rect.width <= 0 || rect.height <= 0) return false;
      for (let current = element; current; current = current.parentElement) {
        const style = getComputedStyle(current);
        if (
          current.hidden
          || current.hasAttribute('inert')
          || style.display === 'none'
          || style.visibility === 'hidden'
          || Number(style.opacity) === 0
        ) return false;
      }
      return true;
    };
    if (!routeContract.applicable) {
      return {
        applicable: false,
        state: routeContract.state,
        reason: routeContract.reason,
        markerSelector: routeContract.markerSelector,
        markerCount: document.querySelectorAll(routeContract.markerSelector).length,
        markerVisibleCount: [...document.querySelectorAll(routeContract.markerSelector)].filter(isVisible).length,
        unexpectedSelector: routeContract.unexpectedSelector,
        unexpectedVisibleCount: [...document.querySelectorAll(routeContract.unexpectedSelector)].filter(isVisible).length,
        expectations: [],
        samples: [],
      };
    }

    const rootStyle = getComputedStyle(document.documentElement);
    const background = resolveColor(rootStyle.getPropertyValue('--studio-window-bg').trim(), 'backgroundColor');
    const parsedBackground = parseRgb(background).rgb;
    const expectations = [];
    const samples = [];
    for (const expectation of routeContract.expectations) {
      const elements = [...document.querySelectorAll(expectation.selector)];
      const visibleElements = elements.filter(isVisible);
      expectations.push({
        selector: expectation.selector,
        expectedCount: expectation.count,
        totalCount: elements.length,
        visibleCount: visibleElements.length,
      });
      for (const [index, element] of visibleElements.entries()) {
        let opacity = 1;
        for (let current = element; current && current !== document.documentElement; current = current.parentElement) {
          opacity *= Number(getComputedStyle(current).opacity || '1');
        }
        const foreground = resolveColor(getComputedStyle(element).color, 'color');
        const parsedForeground = parseRgb(foreground);
        const effectiveOpacity = opacity * parsedForeground.alpha;
        samples.push({
          index,
          expectationSelector: expectation.selector,
          selector: element.id
            ? `#${element.id}`
            : element.classList.length
              ? `.${[...element.classList].join('.')}`
              : expectation.selector,
          foreground,
          background,
          foregroundRgb: parsedForeground.rgb,
          backgroundRgb: parsedBackground,
          effectiveOpacity,
          rect: {
            x: element.getBoundingClientRect().x,
            y: element.getBoundingClientRect().y,
            width: element.getBoundingClientRect().width,
            height: element.getBoundingClientRect().height,
          },
        });
      }
    }
    return {
      applicable: true,
      state: routeContract.state,
      expectations,
      samples,
    };
  }, contract);
}

async function attachRenderedBackgroundEvidence(page, observation, contract, label) {
  if (!contract.applicable) return observation;
  await page.evaluate((expectations) => {
    const roots = expectations.flatMap((expectation) => [...document.querySelectorAll(expectation.selector)]);
    const nodes = [...new Set(roots.flatMap((root) => [root, ...root.querySelectorAll('*')]))];
    const properties = [
      'color',
      'opacity',
      'text-decoration-color',
      'text-shadow',
      '-webkit-text-fill-color',
    ];
    window.__ABS_CONTRAST_TARGETS__ = {
      roots,
      nodes: nodes.map((element) => ({
        element,
        styles: Object.fromEntries(properties.map((property) => [property, {
          value: element.style.getPropertyValue(property),
          priority: element.style.getPropertyPriority(property),
        }])),
      })),
    };
    nodes.forEach((element) => {
      element.style.setProperty('color', 'transparent', 'important');
      element.style.setProperty('text-decoration-color', 'transparent', 'important');
      element.style.setProperty('text-shadow', 'none', 'important');
      element.style.setProperty('-webkit-text-fill-color', 'transparent', 'important');
    });
  }, contract.expectations);

  let backgroundImage;
  let glyphMaskImage;
  let alternateGlyphMaskImage;
  try {
    backgroundImage = await readScreenshotPixels(page);
    await page.evaluate(() => {
      window.__ABS_CONTRAST_TARGETS__.nodes.forEach(({ element }) => {
        element.style.setProperty('color', 'rgb(255, 0, 255)', 'important');
        element.style.setProperty('opacity', '1', 'important');
        element.style.setProperty('-webkit-text-fill-color', 'rgb(255, 0, 255)', 'important');
        element.style.setProperty('text-shadow', 'none', 'important');
      });
    });
    glyphMaskImage = await readScreenshotPixels(page);
    await page.evaluate(() => {
      window.__ABS_CONTRAST_TARGETS__.nodes.forEach(({ element }) => {
        element.style.setProperty('color', 'rgb(0, 255, 0)', 'important');
        element.style.setProperty('-webkit-text-fill-color', 'rgb(0, 255, 0)', 'important');
      });
    });
    alternateGlyphMaskImage = await readScreenshotPixels(page);
  } finally {
    await page.evaluate(() => {
      (window.__ABS_CONTRAST_TARGETS__?.nodes || []).forEach(({ element, styles }) => {
        Object.entries(styles).forEach(([property, { value, priority }]) => {
          if (value) element.style.setProperty(property, value, priority);
          else element.style.removeProperty(property);
        });
      });
      delete window.__ABS_CONTRAST_TARGETS__;
    });
  }

  observation.samples = observation.samples.map((sample) => {
    const left = Math.max(0, Math.floor(sample.rect.x));
    const top = Math.max(0, Math.floor(sample.rect.y));
    const right = Math.min(backgroundImage.width, Math.ceil(sample.rect.x + sample.rect.width));
    const bottom = Math.min(backgroundImage.height, Math.ceil(sample.rect.y + sample.rect.height));
    assert(right > left && bottom > top, `${label}: contrast target escaped the rendered viewport`, sample);
    let minimum = Number.POSITIVE_INFINITY;
    let worstPixel = null;
    let glyphPixelCount = 0;
    for (let y = top; y < bottom; y += 1) {
      for (let x = left; x < right; x += 1) {
        const renderedBackgroundRgb = readPixel(backgroundImage, x, y);
        const maskRgb = readPixel(glyphMaskImage, x, y);
        const alternateMaskRgb = readPixel(alternateGlyphMaskImage, x, y);
        const markerDelta = maskRgb.reduce((total, channel, index) => (
          total + Math.abs(channel - alternateMaskRgb[index])
        ), 0);
        const isGlyphPixel = markerDelta >= 36
          && maskRgb[0] - maskRgb[1] >= 12
          && maskRgb[2] - maskRgb[1] >= 12
          && alternateMaskRgb[1] - alternateMaskRgb[0] >= 12
          && alternateMaskRgb[1] - alternateMaskRgb[2] >= 12;
        if (!isGlyphPixel) continue;
        glyphPixelCount += 1;
        const renderedForegroundRgb = composite(
          sample.foregroundRgb,
          renderedBackgroundRgb,
          sample.effectiveOpacity,
        );
        const ratio = contrastRatio(renderedForegroundRgb, renderedBackgroundRgb);
        if (ratio < minimum) {
          minimum = ratio;
          worstPixel = { x, y, renderedBackgroundRgb };
        }
      }
    }
    assert(glyphPixelCount > 0, `${label}: rendered glyph mask produced no text pixels`, sample);
    assert(
      minimum >= 4.5,
      `${label}: supporting text contrast below 4.5:1 on its rendered background`,
      { ...sample, glyphPixelCount, renderedBackgroundContrastRatio: minimum, worstPixel },
    );
    return {
      ...sample,
      contrastMethod: 'resolved-foreground-over-hidden-text-rendered-background-glyph-pixels',
      glyphPixelCount,
      renderedBackgroundContrastRatio: minimum,
      worstPixel,
    };
  });
  return observation;
}

async function run() {
  runContrastContractMutationChecks();
  runFocusContractMutationChecks();
  for (const browserName of browserNames) {
    assert(browserLaunchers.has(browserName), `Unsupported ABS_BROWSER=${browserName}`);
  }
  assert(themes.every((theme) => ['light', 'dark'].includes(theme)), `Unsupported ABS_AUDIT_THEME=${themeOption}`);
  assert(profiles.length > 0, `Unsupported ABS_AUDIT_PROFILE=${profileOption}`);

  await mkdir(outputRoot, { recursive: true });
  const preview = await startProductionPreview({ repoRoot, host: '127.0.0.1', port: 8029 });
  const results = [];
  try {
    for (const browserName of browserNames) {
      const browser = await browserLaunchers.get(browserName).launch();
      try {
        for (const theme of themes) {
          for (const profile of profiles) {
            const isMobile = profile.id === 'mobile-reduced';
            const context = await browser.newContext({
              viewport: profile.viewport,
              colorScheme: theme,
              reducedMotion: profile.reducedMotion,
              isMobile,
              hasTouch: isMobile,
            });
            await context.addInitScript((forcedTheme) => {
              localStorage.setItem('theme-preference-v3', forcedTheme);
              localStorage.removeItem('theme-preference');
              sessionStorage.removeItem('abs_portfolio_ok');
              localStorage.removeItem('abs_portfolio_ok');
              window.__ABS_RELEASE_SMOKE_EVENTS__ = { routeFailures: [], pageErrors: [] };
            }, theme);
            try {
              for (const route of RELEASE_SMOKE_ROUTES.filter((candidate) => (
                routeOption === 'all' || candidate.id === routeOption
              ))) {
                const page = await context.newPage();
                const label = `${browserName}/${theme}/${profile.id}/${route.id}`;
                try {
                  await page.goto(new URL(route.requestPath || route.path, `${preview.baseUrl}/`).toString(), {
                    waitUntil: 'domcontentloaded',
                    timeout: 30_000,
                  });
                  await waitForRouteReady(page, route, ROUTE_READINESS_TIMEOUT_MS);
                  await prepareSettledRouteState(page, route.id);

                  // WebKit follows macOS/Safari's default: Option+Tab includes links,
                  // while plain Tab is limited by the system keyboard-navigation setting.
                  const keyboardKey = browserName === 'webkit' ? 'Alt+Tab' : 'Tab';
                  const focusStates = {};
                  focusStates.settled = await auditFocusState(
                    page,
                    getFocusContract(route.id, profile),
                    keyboardKey,
                    `${label}/settled`,
                  );

                  let contrastObservation;
                  const reverseNavigation = {};
                  if (route.id === 'portfolio') {
                    const activeCard = page.locator('.portfolio-project-card.is-active[tabindex="0"]');
                    await activeCard.click();
                    await waitForPortfolioGate(page);
                    contrastObservation = await auditContrastState(page, route.id, `${label}/gate`);
                    focusStates.gate = await auditFocusState(
                      page,
                      specialFocusContracts.portfolioGate,
                      keyboardKey,
                      `${label}/gate`,
                    );
                    await page.screenshot({
                      path: resolve(outputRoot, `${browserName}-${theme}-${profile.id}-portfolio-gate.png`),
                      fullPage: true,
                      animations: 'disabled',
                    });
                    await page.locator('.portfolio-access-gate__close').focus();
                    await page.keyboard.press('Escape');
                    await waitForPortfolioGateClosed(page);
                    await page.waitForFunction(() => (
                      document.activeElement?.matches('.portfolio-project-card.is-active[tabindex="0"]')
                    ), undefined, { timeout: 2_000, polling: 25 });
                    reverseNavigation.gateReturnedToCard = await activeCard.evaluate((element) => document.activeElement === element);
                    assert(reverseNavigation.gateReturnedToCard, `${label}: closing the gate did not restore active-card focus`);

                    await activeCard.click();
                    await waitForPortfolioGate(page);
                    await fillPortfolioGate(page);
                    await waitForPortfolioGateClosed(page);
                    await waitForPortfolioDrawer(page);
                    focusStates.drawer = await auditFocusState(
                      page,
                      specialFocusContracts.portfolioDrawer,
                      keyboardKey,
                      `${label}/drawer`,
                    );
                    await page.screenshot({
                      path: resolve(outputRoot, `${browserName}-${theme}-${profile.id}-portfolio-drawer.png`),
                      fullPage: true,
                      animations: 'disabled',
                    });
                    const drawerBack = page.locator('.portfolio-project-view__back--top');
                    await drawerBack.focus();
                    await page.keyboard.press('Enter');
                    await waitForPortfolioDrawer(page, false);
                    await page.waitForFunction(() => (
                      document.activeElement?.matches('.portfolio-project-card.is-active[tabindex="0"]')
                    ), undefined, { timeout: 2_000, polling: 25 });
                    reverseNavigation.drawerReturnedToCard = await activeCard.evaluate((element) => document.activeElement === element);
                    assert(reverseNavigation.drawerReturnedToCard, `${label}: closing the drawer did not restore active-card focus`);

                    const restoredCard = page.locator('.portfolio-project-card.is-active[tabindex="0"]');
                    await restoredCard.click();
                    await waitForPortfolioDrawer(page);
                    const liveOriginBack = page.locator('.portfolio-project-view__back--top');
                    await liveOriginBack.focus();
                    await page.keyboard.press('Enter');
                    await waitForPortfolioDrawer(page, false);
                    await page.waitForFunction(() => (
                      document.activeElement?.matches('.portfolio-project-card.is-active[tabindex="0"]')
                    ), undefined, { timeout: 2_000, polling: 25 });
                    reverseNavigation.drawerReturnedToLiveCard = await restoredCard.evaluate((element) => (
                      document.activeElement === element
                    ));
                    assert(
                      reverseNavigation.drawerReturnedToLiveCard,
                      `${label}: closing a directly opened drawer did not restore its live active-card origin`,
                    );
                  } else {
                    contrastObservation = await auditContrastState(page, route.id, `${label}/settled`);
                  }

                  if (route.id === 'home') {
                    const switcher = page.locator('.simulation-focus-switcher');
                    await switcher.click();
                    await page.locator('#simulation-focus-modal[aria-hidden="false"]').waitFor({ state: 'visible', timeout: 30_000 });
                    await page.waitForFunction(() => {
                      const modal = document.querySelector('#simulation-focus-modal.active[aria-hidden="false"]');
                      return modal && Number.parseFloat(getComputedStyle(modal).opacity || '0') >= 0.999;
                    }, undefined, { timeout: 30_000, polling: 25 });
                    focusStates.modal = await auditFocusState(
                      page,
                      specialFocusContracts.simulationModal,
                      keyboardKey,
                      `${label}/modal`,
                    );
                    await page.screenshot({
                      path: resolve(outputRoot, `${browserName}-${theme}-${profile.id}-home-modal.png`),
                      fullPage: true,
                      animations: 'disabled',
                    });
                    await page.keyboard.press('Escape');
                    await page.waitForFunction(() => (
                      !document.documentElement.classList.contains('simulation-focus-modal-open')
                    ), undefined, { timeout: 30_000, polling: 25 });
                    reverseNavigation.modalReturnedToSwitcher = await switcher.evaluate((element) => document.activeElement === element);
                    assert(reverseNavigation.modalReturnedToSwitcher, `${label}: closing the simulation modal did not restore switcher focus`);
                  }

                  await page.screenshot({
                    path: resolve(outputRoot, `${browserName}-${theme}-${profile.id}-${route.id}.png`),
                    fullPage: true,
                  });
                  results.push({
                    browserName,
                    theme,
                    profile: profile.id,
                    viewport: profile.viewport,
                    reducedMotion: profile.reducedMotion,
                    routeId: route.id,
                    focusStates,
                    contrastContract: contrastObservation,
                    contrast: contrastObservation.samples,
                    reverseNavigation,
                  });
                  const contrastLabel = contrastContracts[route.id].applicable
                    ? `${contrastObservation.samples.length} rendered-pixel contrast samples`
                    : `contrast N/A: ${contrastContracts[route.id].reason}`;
                  const focusCount = Object.values(focusStates).reduce((total, state) => total + state.length, 0);
                  console.log(`[focus-contrast] ${label}: ${focusCount} state targets, ${contrastLabel}`);
                } finally {
                  await page.close();
                }
              }
            } finally {
              await context.close();
            }
          }
        }
      } finally {
        await browser.close();
      }
    }
  } finally {
    await preview.stop();
  }

  const reportStamp = new Date().toISOString().replaceAll(':', '-').replaceAll('.', '-');
  const reportScope = [browserOption, themeOption, profileOption, routeOption]
    .map((value) => value.replaceAll(/[^a-z0-9-]+/g, '-'))
    .join('-');
  const reportPath = resolve(outputRoot, `results-${reportStamp}-${reportScope}.json`);
  await writeFile(reportPath, `${JSON.stringify(results, null, 2)}\n`);
  console.log(`[focus-contrast] Report: ${reportPath}`);
  console.log(`[focus-contrast] PASS: ${results.length} browser/theme/route states.`);
}

try {
  await run();
} catch (error) {
  console.error(`[focus-contrast] FAIL: ${error.message}`);
  if (error.details) console.error(JSON.stringify(error.details, null, 2));
  process.exitCode = 1;
}
