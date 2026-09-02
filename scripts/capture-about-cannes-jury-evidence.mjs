import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import sharp from 'sharp';
import {
  ABOUT_RECOVERY_PROFILES,
  ABOUT_STORYBOARD_BEAT_RANGES,
  createAboutStoryboardCheckpoints,
  driveAboutStoryWU,
  getAboutSurfelJourneyMap,
  getAboutSurfelState,
  launchAboutAuditBrowser,
} from './lib/about-recovery-audit-helpers.mjs';

const baseUrl = process.env.ABS_BASE_URL || 'http://localhost:8012';
const browserName = process.env.ABS_BROWSER === 'webkit' ? 'webkit' : 'chromium';
const outputDir = resolve(process.env.ABS_CANNES_JURY_OUTPUT
  || 'output/playwright/cannes-lions-recovery-final-20260901');
const requestedProfiles = String(process.env.ABS_CANNES_JURY_PROFILES || 'desktop,mobile')
  .split(',').map((value) => value.trim()).filter(Boolean);
const travelDurationMs = Math.max(8_000, Number(process.env.ABS_CANNES_JURY_TRAVEL_MS || 12_000));
const theme = ['light', 'dark'].includes(process.env.ABS_CANNES_JURY_THEME)
  ? process.env.ABS_CANNES_JURY_THEME
  : 'dark';
const stillsOnly = process.env.ABS_CANNES_JURY_STILLS_ONLY === '1';

function escapeXml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&apos;');
}

async function waitForAbout(page, profile) {
  await page.goto(`${baseUrl}/about.html?preview=about&edit=0`, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(({ expectedProfile, expectedTheme }) => {
    const root = document.querySelector('.about-narrative-lab');
    return root?.dataset.pointWorldState === 'ready'
      && root.dataset.aboutSceneReady === 'true'
      && root.dataset.aboutLayoutProfile === expectedProfile
      && root.dataset.aboutEntranceState === 'complete'
      && document.documentElement.getAttribute('data-abs-theme') === expectedTheme
      && Number.isFinite(window.__aboutNarrativeRuntime?.getMotionSnapshot?.().cameraDistanceWU);
  }, { expectedProfile: profile, expectedTheme: theme }, { timeout: 120_000 });
}

async function setCaptureTheme(context) {
  await context.addInitScript((value) => {
    localStorage.setItem('theme-preference-v3', value);
  }, theme);
}

function compactFraming(modelFraming = {}) {
  return Object.fromEntries(Object.entries(modelFraming).map(([key, value]) => [key, {
    stageVisibility: value.stageVisibility,
    renderedVisibleCount: value.renderedVisibleCount,
    occupiedRowCount: value.occupiedRowCount,
    occupiedColumnCount: value.occupiedColumnCount,
    framedDepthSpanWU: value.framedDepthSpanWU,
    protectedRegionVisibleCounts: value.protectedRegionVisibleCounts,
  }]));
}

async function createContactSheet(profile, checkpoints) {
  const columns = 3;
  const panelWidth = profile === 'mobile' ? 220 : 420;
  const viewport = ABOUT_RECOVERY_PROFILES[profile].viewport;
  const imageHeight = Math.round(panelWidth * viewport.height / viewport.width);
  const labelHeight = 80;
  const gutter = 12;
  const rows = Math.ceil(checkpoints.length / columns);
  const panels = [];
  for (const checkpoint of checkpoints) {
    const frame = await sharp(checkpoint.screenshotPath)
      .resize({ width: panelWidth, height: imageHeight, fit: 'cover' })
      .png().toBuffer();
    const label = Buffer.from(`<svg width="${panelWidth}" height="${labelHeight}" xmlns="http://www.w3.org/2000/svg">
      <rect width="100%" height="100%" fill="#050505"/>
      <text x="12" y="20" fill="#fff" font-family="Arial, sans-serif" font-size="13" font-weight="700">${escapeXml(`${checkpoint.beatIndex}. ${checkpoint.beatLabel}`)}</text>
      <text x="12" y="39" fill="#d7ad33" font-family="Arial, sans-serif" font-size="11" font-weight="700">${escapeXml(checkpoint.phase.toUpperCase())} · ${checkpoint.paintedScrollPercent.toFixed(2)}%</text>
      <text x="12" y="56" fill="${checkpoint.nestedWithin ? '#74a7ff' : '#777'}" font-family="Arial, sans-serif" font-size="10" font-weight="700">${escapeXml(checkpoint.nestedWithin ? `NESTED IN ${checkpoint.nestedWithin.toUpperCase()}` : 'PRIMARY JOURNEY BEAT')}</text>
      <text x="12" y="72" fill="#aaa" font-family="Arial, sans-serif" font-size="10">Story ${checkpoint.storyWU.toFixed(3)} WU · camera ${checkpoint.cameraDistanceWU == null ? 'n/a' : `${checkpoint.cameraDistanceWU.toFixed(2)} WU`}</text>
    </svg>`);
    panels.push(await sharp({
      create: { width: panelWidth, height: imageHeight + labelHeight, channels: 4, background: '#050505' },
    }).composite([{ input: frame, top: 0, left: 0 }, { input: label, top: imageHeight, left: 0 }]).png().toBuffer());
  }
  const path = resolve(outputDir, `contact-sheet-${profile}.png`);
  await sharp({
    create: {
      width: columns * panelWidth + (columns + 1) * gutter,
      height: rows * (imageHeight + labelHeight) + (rows + 1) * gutter,
      channels: 4,
      background: '#111',
    },
  }).composite(panels.map((input, index) => ({
    input,
    left: gutter + (index % columns) * (panelWidth + gutter),
    top: gutter + Math.floor(index / columns) * (imageHeight + labelHeight + gutter),
  }))).png().toFile(path);
  return path;
}

async function collectCheckpointDiagnostics(page) {
  return page.evaluate(() => {
    const finite = (value) => Number.isFinite(Number(value)) ? Number(value) : null;
    const root = document.querySelector('.about-narrative-lab');
    const scrollport = document.querySelector('.about-narrative-scrollport');
    const runtime = window.__aboutNarrativeRuntime;
    const motion = runtime?.getMotionSnapshot?.() || null;
    const continuity = runtime?.getContinuitySnapshot?.() || null;
    const metrics = runtime?.getMetrics?.() || null;
    const maximumScrollTop = scrollport
      ? Math.max(0, scrollport.scrollHeight - scrollport.clientHeight) : 0;
    const paintedScrollProgress = maximumScrollTop > 0
      ? Math.min(1, Math.max(0, scrollport.scrollTop / maximumScrollTop)) : null;
    const effectiveOpacity = (node) => {
      let value = 1;
      for (let current = node; current instanceof HTMLElement; current = current.parentElement) {
        const style = getComputedStyle(current);
        if (style.display === 'none' || style.visibility === 'hidden') return 0;
        value *= Number.parseFloat(style.opacity) || 0;
      }
      return value;
    };
    const visibleTitles = Array.from(document.querySelectorAll(
      '.about-narrative-render-span--title [data-text-field-id]',
    )).flatMap((field) => {
      const title = field.querySelector('.about-narrative-spatial-title, .route-bookend-title');
      if (!title || effectiveOpacity(title) <= 0.05) return [];
      const bounds = title.getBoundingClientRect();
      if (bounds.width <= 0 || bounds.height <= 0
        || bounds.bottom <= 0 || bounds.top >= window.innerHeight) return [];
      return [{
        fieldId: field.dataset.textFieldId || null,
        renderedViewportYPx: bounds.top + bounds.height / 2,
        renderedViewportYPercent: (bounds.top + bounds.height / 2) / window.innerHeight * 100,
        opacity: effectiveOpacity(title),
      }];
    }).sort((left, right) => right.opacity - left.opacity);
    const title = visibleTitles[0] || null;
    return {
      paintedScrollTopPx: finite(scrollport?.scrollTop),
      maximumScrollTopPx: finite(maximumScrollTop),
      paintedScrollProgress,
      cameraProgress: finite(continuity?.journeyProgress ?? metrics?.journeyProgress),
      cameraDistanceWU: finite(motion?.cameraDistanceWU
        ?? continuity?.cameraDistanceWU ?? metrics?.cameraDistanceWU),
      activeModels: Array.isArray(continuity?.activeModelIds)
        ? [...continuity.activeModelIds] : null,
      visibleSurfelCounts: {
        sampled: finite(continuity?.sampledVisibleSurfelCount),
        stage: finite(continuity?.visibleStageSurfelCount),
        rendered: finite(continuity?.renderedSurfelCount ?? metrics?.activeSurfelCount),
      },
      drawCalls: finite(metrics?.drawCalls),
      titleFieldId: title?.fieldId || null,
      titleRenderedViewportYPx: finite(title?.renderedViewportYPx),
      titleRenderedViewportYPercent: finite(title?.renderedViewportYPercent),
      storyWU: finite(root?.dataset.narrativeStoryWu),
    };
  });
}

function assertStoryboardCapture(checkpoints) {
  assert.equal(checkpoints.length, 24, 'Each viewport must capture 24 storyboard frames.');
  assert.equal(new Set(checkpoints.map(({ id }) => id)).size, 24,
    'Each viewport must capture 24 unique storyboard frames.');
  for (const beat of ABOUT_STORYBOARD_BEAT_RANGES) {
    const beatCheckpoints = checkpoints.filter(({ beatId }) => beatId === beat.id);
    assert.deepEqual(
      beatCheckpoints.map(({ phase }) => phase),
      ['entry', 'key', 'exit'],
      `${beat.label} must include entry, key, and exit captures.`,
    );
    assert.ok(beatCheckpoints.every(({ rangeRelationship, nestedWithin }) => (
      rangeRelationship === (beat.relationship || 'primary')
      && nestedWithin === (beat.nestedWithin || null)
    )), `${beat.label} capture relationship metadata must match its storyboard range.`);
  }
  for (const checkpoint of checkpoints) {
    assert.ok(checkpoint.paintedScrollPercent > checkpoint.rangeStartPercent
      && checkpoint.paintedScrollPercent < checkpoint.rangeEndPercent,
    `${checkpoint.id} painted at ${checkpoint.paintedScrollPercent}% outside `
      + `${checkpoint.rangeStartPercent}-${checkpoint.rangeEndPercent}%.`);
  }
}

async function captureStills(browser, profile) {
  const viewport = ABOUT_RECOVERY_PROFILES[profile].viewport;
  const context = await browser.newContext({
    viewport,
    deviceScaleFactor: 1,
    hasTouch: profile === 'mobile',
    isMobile: profile === 'mobile',
    colorScheme: theme,
  });
  await setCaptureTheme(context);
  const page = await context.newPage();
  await waitForAbout(page, profile);
  const journeyMap = await getAboutSurfelJourneyMap(page);
  const requestedCheckpoints = createAboutStoryboardCheckpoints(journeyMap.durationWU);
  const checkpoints = [];
  for (const spec of requestedCheckpoints) {
    await driveAboutStoryWU(page, spec.storyWU);
    await page.waitForTimeout(120);
    const state = await getAboutSurfelState(page);
    const diagnostics = await collectCheckpointDiagnostics(page);
    const screenshot = resolve(outputDir, `${profile}-${spec.id}.png`);
    await page.screenshot({ path: screenshot });
    checkpoints.push({
      ...spec,
      requestedStoryWU: spec.storyWU,
      storyWU: state.storyWU,
      paintedScrollTopPx: diagnostics.paintedScrollTopPx,
      maximumScrollTopPx: diagnostics.maximumScrollTopPx,
      paintedScrollProgress: diagnostics.paintedScrollProgress,
      paintedScrollPercent: diagnostics.paintedScrollProgress == null
        ? null : diagnostics.paintedScrollProgress * 100,
      cameraProgress: diagnostics.cameraProgress,
      cameraDistanceWU: diagnostics.cameraDistanceWU,
      activeModels: diagnostics.activeModels,
      visibleSurfelCounts: diagnostics.visibleSurfelCounts,
      drawCalls: diagnostics.drawCalls,
      titleFieldId: diagnostics.titleFieldId,
      titleRenderedViewportYPx: diagnostics.titleRenderedViewportYPx,
      titleRenderedViewportYPercent: diagnostics.titleRenderedViewportYPercent,
      screenshotPath: screenshot,
      modelFraming: compactFraming(state.metrics.modelFraming),
    });
  }
  assertStoryboardCapture(checkpoints);
  await context.close();
  return { viewport, checkpoints, contactSheet: await createContactSheet(profile, checkpoints) };
}

async function captureContinuousJourney(browser, profile) {
  const viewport = ABOUT_RECOVERY_PROFILES[profile].viewport;
  const rawDir = resolve(outputDir, 'raw-video', profile);
  await mkdir(rawDir, { recursive: true });
  const context = await browser.newContext({
    viewport,
    deviceScaleFactor: 1,
    hasTouch: profile === 'mobile',
    isMobile: profile === 'mobile',
    colorScheme: theme,
    recordVideo: { dir: rawDir, size: viewport },
  });
  await setCaptureTheme(context);
  const page = await context.newPage();
  const video = page.video();
  await waitForAbout(page, profile);
  const trace = await page.evaluate(async ({ duration }) => {
    const scrollport = document.querySelector('.about-narrative-scrollport');
    const maximum = scrollport.scrollHeight - scrollport.clientHeight;
    const samples = [];
    const travel = (from, to) => new Promise((resolveTravel) => {
      const start = performance.now();
      const frame = (time) => {
        const progress = Math.min(1, (time - start) / duration);
        scrollport.scrollTop = from + (to - from) * progress;
        scrollport.dispatchEvent(new Event('scroll'));
        if (samples.length === 0 || time - samples.at(-1).time >= 100) {
          const motion = window.__aboutNarrativeRuntime.getMotionSnapshot();
          samples.push({ time, scrollTop: scrollport.scrollTop, cameraDistanceWU: motion.cameraDistanceWU });
        }
        if (progress >= 1) resolveTravel(); else requestAnimationFrame(frame);
      };
      requestAnimationFrame(frame);
    });
    scrollport.scrollTop = 0;
    scrollport.dispatchEvent(new Event('scroll'));
    await new Promise((resolveHold) => setTimeout(resolveHold, 700));
    await travel(0, maximum);
    await new Promise((resolveHold) => setTimeout(resolveHold, 900));
    await travel(maximum, 0);
    await new Promise((resolveHold) => setTimeout(resolveHold, 700));
    return { maximumScrollTop: maximum, samples };
  }, { duration: travelDurationMs });
  await page.close();
  const videoPath = resolve(outputDir, `continuous-forward-reverse-${profile}.webm`);
  await video.saveAs(videoPath);
  await context.close();
  return { videoPath, travelDurationMs, trace };
}

await mkdir(outputDir, { recursive: true });
const browser = await launchAboutAuditBrowser(browserName);
const report = {
  schema: 'about-cannes-jury-evidence/v2',
  browser: browserName,
  baseUrl,
  theme,
  travelDurationMs,
  stillsOnly,
  storyboard: {
    source: 'tasks/about-cinematic-storyboard-2026-09-01.md',
    frameCountPerProfile: 24,
    captureOrder: 'eight beat rows with entry, key, and exit; nested rows may revisit an earlier timeline range',
    beats: ABOUT_STORYBOARD_BEAT_RANGES,
    overlaps: ABOUT_STORYBOARD_BEAT_RANGES.filter(({ nestedWithin }) => nestedWithin)
      .map(({ id, nestedWithin, startPercent, endPercent }) => ({
        beatId: id,
        nestedWithin,
        rangePercent: [startPercent, endPercent],
      })),
  },
  recordedAt: new Date().toISOString(),
  profiles: [],
};
try {
  for (const profile of requestedProfiles) {
    if (!ABOUT_RECOVERY_PROFILES[profile]) throw new Error(`Unknown profile ${profile}.`);
    const stills = await captureStills(browser, profile);
    const continuous = stillsOnly ? null : await captureContinuousJourney(browser, profile);
    report.profiles.push({ profile, ...stills, continuous });
  }
} finally {
  await browser.close();
}
await writeFile(resolve(outputDir, 'report.json'), `${JSON.stringify(report, null, 2)}\n`);
console.log(`PASS: Cannes jury evidence written to ${outputDir}.`);
