#!/usr/bin/env node
import { createHash } from 'node:crypto';
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium, webkit } from 'playwright';
import {
  classifyPortfolioOverlaps,
  computedContractSignature,
  evaluateActiveCardPaintSuppression,
  parseCssRules,
  promoteEvidenceRun,
  summarizeOwnership,
} from './lib/portfolio-css-ownership.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const outputParent = resolve(__dirname, '..', 'output', 'playwright');
const outputDir = resolve(outputParent, 'portfolio-css-ownership');
const computedFixturePath = resolve(__dirname, 'fixtures', 'portfolio-css-computed.json');
const origin = String(process.env.ABS_DEV_URL || 'http://127.0.0.1:8013').replace(/\/+$/, '');
const timeoutMs = Number(process.env.ABS_PORTFOLIO_CSS_TIMEOUT_MS || 30000);
const requestedBrowser = String(process.env.ABS_BROWSER || 'all').toLowerCase();
const updateComputedFixture = process.env.ABS_UPDATE_PORTFOLIO_CSS_FIXTURE === '1';
if (!['all', 'chromium', 'webkit'].includes(requestedBrowser)) {
  throw new Error(`Unsupported ABS_BROWSER ${requestedBrowser}.`);
}

const browsers = [['chromium', chromium], ['webkit', webkit]]
  .filter(([name]) => requestedBrowser === 'all' || requestedBrowser === name);
const profiles = [
  { name: 'desktop', viewport: { width: 1440, height: 900 }, mobile: false },
  { name: 'mobile', viewport: { width: 390, height: 844 }, mobile: true },
];
const themes = ['light', 'dark'];
const STYLE_CONTRACT = {
  title: ['color', 'font-family', 'font-size', 'line-height', 'z-index'],
  deck: ['background-color', 'border-radius', 'position', 'z-index'],
  card: ['background-color', 'color', 'border-radius', 'font-family', 'z-index'],
  sheetHost: ['background-color', 'color', 'border-radius', 'position', 'z-index'],
  drawer: ['background-color', 'color', 'border-radius', 'font-family', 'z-index'],
  gate: ['background-color', 'color', 'border-radius', 'font-family', 'z-index', 'backdrop-filter', '-webkit-backdrop-filter'],
  buttonBar: ['background-color', 'color', 'border-radius', 'font-family', 'position', 'z-index'],
  buttonBarControls: ['background-color', 'color', 'border-radius', 'position', 'z-index'],
};

function assert(condition, message, detail = null) {
  if (condition) return;
  throw new Error(`${message}${detail ? `\n${JSON.stringify(detail, null, 2)}` : ''}`);
}

async function waitForDeck(page, theme, label) {
  try {
    await page.waitForFunction((expectedTheme) => {
    const root = document.documentElement;
    const mount = document.getElementById('portfolioProjectMount');
    return root.dataset.absTheme === expectedTheme
      && (root.dataset.absTransitionPhase || 'idle') === 'idle'
      && mount?.dataset?.portfolioEntrancePhase === 'complete'
      && Boolean(mount.querySelector('.portfolio-project-card.is-active'))
      && !document.getElementById('abs-boot-overlay');
    }, theme, { timeout: timeoutMs });
  } catch (error) {
    throw new Error(`${label}: deck readiness failed: ${error.message}`);
  }
}

async function readStyles(page) {
  return page.evaluate((styleContract) => {
    const targets = {
      title: '.portfolio-deck-intro__title',
      deck: '.portfolio-deck-stage',
      card: '.portfolio-project-card.is-active',
      sheetHost: '#portfolio-sheet-host',
      drawer: '#portfolioProjectView',
      gate: '.portfolio-access-gate',
      buttonBar: '[data-button-bar]',
      buttonBarControls: '.button-bar__primary-buttons',
    };
    const styleRules = [];
    let cascadeOrder = 0;
    const visitRules = (rules, href, conditions = []) => {
      for (const rule of Array.from(rules || [])) {
        if (rule.selectorText && rule.style) {
          cascadeOrder += 1;
          styleRules.push({ rule, href, conditions, cascadeOrder });
          continue;
        }
        if (!rule.cssRules) continue;
        let active = true;
        const condition = rule.conditionText || rule.name || rule.constructor?.name || '';
        if (rule.constructor?.name === 'CSSMediaRule') active = matchMedia(rule.conditionText).matches;
        else if (rule.constructor?.name === 'CSSSupportsRule') active = CSS.supports(rule.conditionText);
        if (active) visitRules(rule.cssRules, href, [...conditions, condition]);
      }
    };
    for (const sheet of Array.from(document.styleSheets)) {
      let href = sheet.href || '<inline>';
      try { if (sheet.href) href = new URL(sheet.href).pathname; } catch {}
      try { visitRules(sheet.cssRules, href); } catch {}
    }
    const inheritedProperties = new Set(['color', 'font-family', 'font-size', 'line-height']);
    const provenanceFor = (element, property, computedValue) => {
      const matches = [];
      let subject = element;
      for (let ancestorDepth = 0; subject; ancestorDepth += 1, subject = subject.parentElement) {
        const inlineValue = subject.style?.getPropertyValue(property) || '';
        if (inlineValue) matches.push({
          href: '<inline>', selector: '<inline>', value: inlineValue.trim(),
          important: subject.style.getPropertyPriority(property) === 'important',
          ancestorDepth, cascadeOrder: Number.MAX_SAFE_INTEGER, conditions: [],
        });
        for (const entry of styleRules) {
          const value = entry.rule.style.getPropertyValue(property);
          if (!value) continue;
          let matchesSelector = false;
          try { matchesSelector = subject.matches(entry.rule.selectorText); } catch {}
          if (!matchesSelector) continue;
          matches.push({
            href: entry.href,
            selector: entry.rule.selectorText.replace(/\s+/g, ' ').trim(),
            value: value.trim(),
            important: entry.rule.style.getPropertyPriority(property) === 'important',
            ancestorDepth,
            cascadeOrder: entry.cascadeOrder,
            conditions: entry.conditions,
          });
        }
        if (!inheritedProperties.has(property)) break;
        if (matches.length) break;
      }
      if (!matches.length) matches.push({
        href: '<initial>', selector: '<initial>', value: computedValue,
        important: false, ancestorDepth: null, cascadeOrder: -1, conditions: [],
      });
      return matches;
    };
    const result = {};
    for (const [name, selector] of Object.entries(targets)) {
      const element = document.querySelector(selector);
      const style = element ? getComputedStyle(element) : null;
      const rect = element?.getBoundingClientRect() || null;
      result[name] = {
        selector,
        count: document.querySelectorAll(selector).length,
        display: style?.display || '',
        visibility: style?.visibility || '',
        opacity: Number.parseFloat(style?.opacity || '0'),
        position: style?.position || '',
        zIndex: style?.zIndex || '',
        color: style?.color || '',
        backgroundColor: style?.backgroundColor || '',
        fontFamily: style?.fontFamily || '',
        borderRadius: style?.borderRadius || '',
        contract: Object.fromEntries((styleContract[name] || []).map((property) => {
          const computedValue = style?.getPropertyValue(property).trim() || '';
          return [property, computedValue || (property.startsWith('-webkit-') ? '<unsupported>' : '')];
        })),
        provenance: Object.fromEntries((styleContract[name] || []).map((property) => {
          const rawValue = style?.getPropertyValue(property).trim() || '';
          const computedValue = rawValue || (property.startsWith('-webkit-') ? '<unsupported>' : '');
          return [property, element ? provenanceFor(element, property, computedValue) : []];
        })),
        rect: rect ? {
          top: rect.top, right: rect.right, bottom: rect.bottom, left: rect.left,
          width: rect.width, height: rect.height,
        } : null,
      };
    }
    return {
      theme: document.documentElement.dataset.absTheme || '',
      viewport: { width: innerWidth, height: innerHeight },
      styleSheetOrder: Array.from(document.styleSheets).map((sheet) => sheet.href || '').filter(Boolean),
      targets: result,
    };
  }, STYLE_CONTRACT);
}

async function waitForSettledDrawer(page) {
  try {
    await page.waitForFunction(() => {
    const drawer = document.getElementById('portfolioProjectView');
    const drawerPanel = drawer?.querySelector('.portfolio-project-view__drawer');
    const heroCopy = drawer?.querySelector('.portfolio-project-view__hero-copy');
    const backButton = drawer?.querySelector('.portfolio-project-view__back--top');
    const title = drawer?.querySelector('.portfolio-project-view__title');
    const openSnapshot = window.__ABS_PORTFOLIO_AUDIT__?.getApp?.()?.getDeckDebugSnapshot?.()?.open;
    if (!document.body.classList.contains('portfolio-project-open')
      || openSnapshot?.phase !== 'open'
      || openSnapshot?.handoffState !== 'open'
      || openSnapshot?.handoffMediaNodeCount !== 0
      || !drawer?.classList.contains('is-open')
      || !drawer.classList.contains('is-title-visible')
      || drawer.classList.contains('is-shared-handoff')
      || document.querySelector('.portfolio-project-media-bridge')
      || !drawerPanel || !heroCopy || !backButton || !title) return false;
    const finiteAnimations = drawer.getAnimations({ subtree: true }).filter((animation) => {
      const iterations = animation.effect?.getTiming?.().iterations;
      return animation.playState === 'running' && iterations !== Infinity;
    });
    if (finiteAnimations.length) return false;
    return finiteAnimations.length === 0;
    }, null, { timeout: timeoutMs, polling: 50 });
  } catch (error) {
    const lastSnapshot = await page.evaluate(() => window.__ABS_PORTFOLIO_AUDIT__
      ?.getApp?.()?.getDeckDebugSnapshot?.()?.open || null);
    assert(false, 'Drawer transition did not settle into the authoritative open phase.', {
      cause: error.message,
      lastSnapshot,
    });
  }
  const stable = await page.evaluate(async () => {
    const drawer = document.getElementById('portfolioProjectView');
    const drawerPanel = drawer?.querySelector('.portfolio-project-view__drawer');
    const heroCopy = drawer?.querySelector('.portfolio-project-view__hero-copy');
    const backButton = drawer?.querySelector('.portfolio-project-view__back--top');
    const title = drawer?.querySelector('.portfolio-project-view__title');
    const sample = () => {
      const style = getComputedStyle(drawer);
      const panelStyle = getComputedStyle(drawerPanel);
      const heroStyle = getComputedStyle(heroCopy);
      const backStyle = getComputedStyle(backButton);
      const rect = drawer.getBoundingClientRect();
      const panelRect = drawerPanel.getBoundingClientRect();
      const titleRect = title.getBoundingClientRect();
      const backRect = backButton.getBoundingClientRect();
      const topHitBelongsTo = (element, elementRect) => {
        const hit = document.elementFromPoint(
          elementRect.left + (elementRect.width / 2),
          elementRect.top + (elementRect.height / 2),
        );
        return Boolean(hit && (hit === element || element.contains(hit)));
      };
      return {
        rect: [
          rect.top, rect.right, rect.bottom, rect.left, rect.width, rect.height,
          panelRect.top, panelRect.right, panelRect.bottom, panelRect.left, panelRect.width, panelRect.height,
        ],
        styles: [
          style.backgroundColor, style.color, style.borderRadius, style.fontFamily, style.zIndex,
          panelStyle.opacity, panelStyle.transform,
          heroStyle.opacity, heroStyle.filter, heroStyle.transform,
          backStyle.opacity, backStyle.visibility,
        ],
        visible: Number.parseFloat(panelStyle.opacity || '0') >= 0.98
          && Number.parseFloat(heroStyle.opacity || '0') >= 0.98
          && heroStyle.filter === 'none'
          && Number.parseFloat(backStyle.opacity || '0') >= 0.98
          && backStyle.visibility === 'visible'
          && titleRect.width > 0 && titleRect.height > 0
          && backRect.width > 0 && backRect.height > 0
          && topHitBelongsTo(title, titleRect)
          && topHitBelongsTo(backButton, backRect),
      };
    };
    const first = sample();
    await new Promise((resolveFrame) => requestAnimationFrame(() => requestAnimationFrame(resolveFrame)));
    const second = sample();
    return first.visible && second.visible
      && first.styles.every((value, index) => value === second.styles[index])
      && first.rect.every((value, index) => Math.abs(value - second.rect[index]) <= 0.25);
  });
  assert(stable, 'Drawer reached open phase but visible geometry did not stabilize across two frames.');
}

async function assertDrawerPaintState(page, label) {
  const state = await page.evaluate(() => {
    const host = document.getElementById('portfolio-sheet-host');
    const root = document.getElementById('portfolioProjectView');
    const panel = root?.querySelector('.portfolio-project-view__drawer');
    const deck = document.querySelector('.portfolio-deck-stage');
    const card = document.querySelector('.portfolio-project-card.is-active');
    const title = root?.querySelector('.portfolio-project-view__title');
    const back = root?.querySelector('.portfolio-project-view__back--top');
    const describe = (element) => {
      const style = element ? getComputedStyle(element) : null;
      const rect = element?.getBoundingClientRect() || null;
      return {
        display: style?.display || '', visibility: style?.visibility || '',
        opacity: Number.parseFloat(style?.opacity || '0'), zIndex: style?.zIndex || '',
        rect: rect ? {
          top: rect.top, right: rect.right, bottom: rect.bottom, left: rect.left,
          width: rect.width, height: rect.height,
        } : null,
      };
    };
    return {
      runtime: window.__ABS_PORTFOLIO_AUDIT__?.getApp?.()?.getDeckDebugSnapshot?.()?.open || null,
      host: describe(host), root: describe(root), panel: describe(panel),
      deck: describe(deck), card: describe(card), title: describe(title), back: describe(back),
      cardContainedByDeck: Boolean(deck && card && deck.contains(card)),
    };
  });
  const within = (inner, outer, tolerance = 2) => inner && outer
    && inner.left >= outer.left - tolerance && inner.right <= outer.right + tolerance
    && inner.top >= outer.top - tolerance && inner.bottom <= outer.bottom + tolerance;
  assert(state.runtime?.phase === 'open' && state.runtime?.handoffState === 'open'
    && state.runtime?.handoffMediaNodeCount === 0, `${label}: runtime did not reach final open paint phase`, state);
  assert(state.panel.opacity >= 0.98 && within(state.panel.rect, state.host.rect),
    `${label}: drawer panel does not occupy the sheet host`, state);
  const paintSuppression = evaluateActiveCardPaintSuppression(state);
  assert(paintSuppression.cardContainedByDeck,
    `${label}: active Portfolio card escaped the deck-stage paint boundary`, { ...state, paintSuppression });
  assert(paintSuppression.accepted,
    `${label}: neither the deck stage nor active card suppresses paint above the open project sheet`, {
      ...state,
      paintSuppression,
    });
  assert(state.title.opacity >= 0.98 && state.title.visibility === 'visible'
    && state.title.rect?.width > 0 && state.title.rect?.height > 0 && within(state.title.rect, state.host.rect),
  `${label}: drawer title lacks visible screenshot geometry`, state);
  assert(state.back.opacity >= 0.98 && state.back.visibility === 'visible'
    && state.back.rect?.width > 0 && state.back.rect?.height > 0 && within(state.back.rect, state.host.rect),
  `${label}: drawer back control lacks visible screenshot geometry`, state);
}

function assertProvenance(snapshot, targetNames, label) {
  for (const name of targetNames) {
    const target = snapshot.targets[name];
    for (const [property, value] of Object.entries(target.contract)) {
      assert(value !== '', `${label}: ${name}.${property} has no computed value`, target);
      assert((target.provenance[property] || []).length > 0,
        `${label}: ${name}.${property} has no matched-rule provenance`, target);
    }
  }
}

function computedContract(results) {
  const pick = (snapshot, names) => Object.fromEntries(names.map((name) => [name, {
    contract: snapshot.targets[name].contract,
    provenance: snapshot.targets[name].provenance,
  }]));
  return results.map((result) => ({
    browser: result.browser,
    profile: result.profile,
    theme: result.theme,
    visualGate: result.visualGate,
    base: pick(result.base, ['title', 'deck', 'card', 'sheetHost', 'drawer', 'buttonBar', 'buttonBarControls']),
    gate: pick(result.gate, ['gate', 'buttonBar', 'buttonBarControls']),
    drawer: pick(result.drawer, ['sheetHost', 'drawer', 'buttonBar', 'buttonBarControls']),
  }));
}

function assertBase(snapshot, theme, label) {
  const { targets } = snapshot;
  assert(snapshot.theme === theme, `${label}: theme did not settle`, snapshot);
  for (const name of ['title', 'deck', 'card', 'sheetHost', 'drawer', 'buttonBar', 'buttonBarControls']) {
    assert(targets[name].count === 1, `${label}: ${name} is not unique`, targets[name]);
  }
  assert(targets.title.fontFamily.toLowerCase().includes('instrument serif'), `${label}: title lost headline ownership`, targets.title);
  assert(targets.deck.rect?.width > 0 && targets.card.rect?.width > 0, `${label}: deck/card has no geometry`, targets);
  assert(targets.buttonBar.position === 'fixed', `${label}: Button Bar is not shell-fixed`, targets.buttonBar);
  assert(Math.abs((snapshot.viewport.height - targets.buttonBar.rect.bottom) - 10.5) <= 0.5, `${label}: Button Bar lost its 10.5px bottom inset`, targets.buttonBar);
  const mainIndex = snapshot.styleSheetOrder.findIndex((href) => /\/css\/main\.css(?:\?|$)/.test(href));
  const portfolioIndex = snapshot.styleSheetOrder.findIndex((href) => /\/css\/portfolio\.css(?:\?|$)/.test(href));
  assert(mainIndex >= 0 && portfolioIndex > mainIndex, `${label}: stylesheet order changed`, snapshot.styleSheetOrder);
  assertProvenance(snapshot, ['title', 'deck', 'card', 'sheetHost', 'drawer', 'buttonBar', 'buttonBarControls'], label);
}

function assertOverlay(snapshot, name, label) {
  const overlay = snapshot.targets[name];
  const bar = snapshot.targets.buttonBar;
  const controls = snapshot.targets.buttonBarControls;
  assert(overlay.count === 1 && overlay.rect?.width > 0 && overlay.opacity > 0.5, `${label}: overlay unavailable`, overlay);
  const buttonBarOverlapPx = overlay.rect.bottom - bar.rect.top;
  assert(Math.abs(buttonBarOverlapPx - 15.5) <= 1, `${label}: overlay and capsule lost the intentional 15.5px overlap`, { overlay, bar });
  assert(Math.abs(controls.rect.top - bar.rect.top) <= 0.5, `${label}: Button Bar controls detached from capsule geometry`, { controls, bar });
  assertProvenance(snapshot, [name, 'buttonBar', 'buttonBarControls'], label);
}

async function capture(page, path, manifest, metadata, publishedPath) {
  const buffer = await page.screenshot({ path, fullPage: true });
  manifest.push({ ...metadata, path: publishedPath, bytes: buffer.length, sha256: createHash('sha256').update(buffer).digest('hex') });
}

await mkdir(outputParent, { recursive: true });
const runDir = await mkdtemp(resolve(outputParent, '.portfolio-css-ownership-run-'));
let pendingFixturePath = '';
try {
const cssRoot = resolve(__dirname, '..', 'react-app', 'app', 'public', 'css');
const [mainSource, portfolioSource] = await Promise.all([
  readFile(resolve(cssRoot, 'main.css'), 'utf8'),
  readFile(resolve(cssRoot, 'portfolio.css'), 'utf8'),
]);
const mainRules = parseCssRules(mainSource, 'main.css');
const portfolioRules = parseCssRules(portfolioSource, 'portfolio.css');
const overlaps = classifyPortfolioOverlaps(mainRules, portfolioRules);
const ownershipSummary = summarizeOwnership(mainRules, portfolioRules, overlaps);
await writeFile(resolve(runDir, 'overlap-inventory.json'), `${JSON.stringify({
  generatedAt: new Date().toISOString(),
  accessibilityDependency: 'M07 accepted: 40 browser/theme/route states passed',
  summary: ownershipSummary,
  overlaps,
}, null, 2)}\n`);
const screenshots = [];
const results = [];
for (const [browserName, browserType] of browsers) {
  const browser = await browserType.launch();
  try {
    for (const profile of profiles) {
      for (const theme of themes) {
        const context = await browser.newContext({
          viewport: profile.viewport,
          colorScheme: theme,
          deviceScaleFactor: 1,
          isMobile: profile.mobile,
          hasTouch: profile.mobile,
        });
        await context.addInitScript((preference) => {
          localStorage.setItem('theme-preference-v3', preference);
          sessionStorage.removeItem('abs_portfolio_ok');
          localStorage.removeItem('abs_portfolio_ok');
          document.cookie = 'abs_portfolio_ok=; Path=/; Max-Age=0; SameSite=Lax';
        }, theme);
        const page = await context.newPage();
        const label = `${browserName}/${profile.name}/${theme}`;
        try {
          await page.goto(`${origin}/portfolio.html`, { waitUntil: 'domcontentloaded', timeout: 60000 });
          await waitForDeck(page, theme, label);
          const base = await readStyles(page);
          assertBase(base, theme, label);
          const deckName = `${browserName}-${profile.name}-${theme}-deck.png`;
          await capture(page, resolve(runDir, deckName), screenshots,
            { browser: browserName, viewport: profile.viewport, theme, state: 'deck' }, resolve(outputDir, deckName));

          await page.locator('.portfolio-project-card.is-active').click();
          await page.waitForFunction(() => {
            const gate = document.querySelector('.portfolio-access-gate.is-open');
            return document.documentElement.dataset.absPortfolioAccessGatePhase === 'open'
              && Boolean(gate)
              && Number.parseFloat(getComputedStyle(gate).opacity || '0') > 0.5;
          }, null, { timeout: timeoutMs });
          const gate = await readStyles(page);
          assertOverlay(gate, 'gate', `${label}/gate`);
          const gateName = `${browserName}-${profile.name}-${theme}-gate.png`;
          await capture(page, resolve(runDir, gateName), screenshots,
            { browser: browserName, viewport: profile.viewport, theme, state: 'gate' }, resolve(outputDir, gateName));
          await page.getByRole('button', { name: 'Close portfolio access prompt' }).click();
          await page.waitForSelector('.portfolio-access-gate', { state: 'detached', timeout: timeoutMs });

          await page.evaluate(() => {
            document.cookie = 'abs_portfolio_ok=1; Path=/; SameSite=Lax; Max-Age=31536000';
            sessionStorage.setItem('abs_portfolio_ok', 'm12-css-ownership');
          });
          await page.locator('.portfolio-project-card.is-active').click();
          await waitForSettledDrawer(page);
          await assertDrawerPaintState(page, `${label}/drawer-paint`);
          const drawer = await readStyles(page);
          assertOverlay(drawer, 'sheetHost', `${label}/sheet-host`);
          assertOverlay(drawer, 'drawer', `${label}/drawer`);
          const drawerName = `${browserName}-${profile.name}-${theme}-drawer.png`;
          await capture(page, resolve(runDir, drawerName), screenshots,
            { browser: browserName, viewport: profile.viewport, theme, state: 'drawer' }, resolve(outputDir, drawerName));
          const visualGate = { status: 'pass', risk: '' };
          results.push({ browser: browserName, profile: profile.name, theme, visualGate, base, gate, drawer });
        } finally {
          await context.close();
        }
      }
    }
  } finally {
    await browser.close();
  }
}

const report = {
  generatedAt: new Date().toISOString(), origin,
  accessibilityDependency: 'M07 accepted: 40 browser/theme/route states passed',
  ownershipSummary,
  resultCount: results.length, screenshotCount: screenshots.length, results, screenshots,
};
const contract = computedContract(results);
const computedStyleSignature = computedContractSignature(contract);
assert(results.filter((result) => result.browser === 'webkit')
  .every((result) => result.visualGate.status === 'pass'),
'WebKit gate foreground must remain sharp in every accepted matrix state.');
if (updateComputedFixture) {
  assert(requestedBrowser === 'all', 'Computed fixture updates require ABS_BROWSER=all.');
  pendingFixturePath = `${computedFixturePath}.tmp-${process.pid}-${Date.now()}`;
  await writeFile(pendingFixturePath, `${JSON.stringify({
    status: 'accepted-post-m07',
    computedStyleSignature,
    contract,
  }, null, 2)}\n`);
} else {
  const fixture = JSON.parse(await readFile(computedFixturePath, 'utf8'));
  assert(JSON.stringify(contract) === JSON.stringify(fixture.contract),
    'Computed style/provenance contract drifted; review before updating the fixture.');
  assert(computedStyleSignature === fixture.computedStyleSignature,
    'Computed style/provenance contract drifted; review before updating the fixture.', {
      expected: fixture.computedStyleSignature,
      actual: computedStyleSignature,
    });
}
report.computedStyleSignature = computedStyleSignature;
report.visualGate = {
  chromium: 'pass',
  webkit: 'pass: foreground is sharp over the independent backdrop layer',
  drawer: 'pass: authoritative-open project sheet visible with deck-stage paint suppressed',
};
await writeFile(resolve(runDir, 'report.json'), `${JSON.stringify(report, null, 2)}\n`);
await writeFile(resolve(runDir, 'screenshot-manifest.json'), `${JSON.stringify(screenshots, null, 2)}\n`);
await promoteEvidenceRun({
  runDir,
  approvedDir: outputDir,
  validate: async () => {},
  pendingFixturePath,
  fixturePath: computedFixturePath,
});
console.log(`PASS: Portfolio CSS ownership audit (${results.length} matrix states, ${screenshots.length} screenshots).`);
} catch (error) {
  if (pendingFixturePath) await rm(pendingFixturePath, { force: true });
  await rm(runDir, { recursive: true, force: true });
  throw error;
}
