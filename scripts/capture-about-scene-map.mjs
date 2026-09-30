import { mkdir, mkdtemp, rename, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { chromium } from 'playwright';

// Capture the live design, then add labels in a separate review document.
// No capture labels, placement overrides or synthetic balls enter the site.
const origin = process.env.ABS_URL || 'http://localhost:8012';
const gpu = process.env.ABS_ABOUT_GPU || (process.platform === 'darwin' ? 'metal' : 'swiftshader');
const output = path.resolve(process.env.ABS_OUTPUT || 'output/playwright/about-scene-map');
const capturedAt = new Date().toISOString();
const variants = [
  { id: 'desktop', name: 'Desktop', width: 1440, height: 1000, imageWidth: 820, file: 'index.html' },
  { id: 'mobile', name: 'Mobile', width: 390, height: 844, imageWidth: 390, file: 'mobile.html' },
];
const uri = bytes => `data:image/png;base64,${bytes.toString('base64')}`;
const escape = value => String(value).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('"', '&quot;');
const parts = [
  ['A01', 'Introduction', 'Editorial', 260, null, 'About Me · opening statement. Shared scroll contrast.'],
  ['A02', 'Reservoir', 'Static + physics', 480, 'reservoir', 'Straight chamber: one viewport high and completely filled at rest. Home-sized balls peek into the opening’s lower 30%.'],
  ['A03', 'Funnel', 'Static + physics', 720, 958, 'Sloped shoulders guide the pile into the outlet.'],
  ['A04', 'Reservoir valve', 'Scroll', 478, 1124, 'Scroll down opens; scroll up closes. Intermediate poses hold.'],
  ['A05', 'Bumper garden', 'Static + physics', 430, 1860, 'Round obstacles · “I care about how things work.”'],
  ['A06', 'Transfer wedge', 'Static + physics', 226, 2590, 'Launches the loose balls into the next section.'],
  ['A07', 'Propeller', 'Automatic', 715, 2970, 'Three vanes rotate around the central hub.'],
  ['A08', 'Pinball chamber', 'Manual + physics', 480, 4030, 'Paired solid slings, return lanes and three top bumpers. Drawing and collisions share geometry.'],
  ['A09', 'Flipper pair', 'Manual', 665, 4376, 'Left / right click or tap · J / K keys.'],
  ['A10', 'Product receiver', 'Static + physics', 480, 4980, 'Raised collection funnel, closing the gap below Product Design and the flippers.'],
  ['A11', 'Metering valve', 'Scroll', 382, 5144, 'Second valve. Same reversible scroll control.'],
  ['A12', 'Transfer pipeline', 'Static + physics', 650, 6070, 'Enclosed diagonal channel and downward outlet.'],
  ['A13', 'Experience receiver', 'Static + physics', 510, 6470, 'Broad funnel leading into the large rotor.'],
  ['A14', 'Art Direction drum', 'Automatic', 691, 6830, 'Six-compartment wheel transports loose batches. Copy occupies the clear space to its left.'],
  ['A15', 'Drum transfer canal', 'Gravity', 550, 7230, 'Continuous curved channel joins both drums. Zero surface friction and rebound.'],
  ['A16', 'Motion & 3D drum', 'Automatic', 281, 7525, 'Second six-compartment wheel. Copy sits in the open space to its right.'],
  ['A17', 'Balance beam', 'Impact', 472, 7980, 'Pivoting ramp · engineering and systems copy below.'],
  ['A21', 'Pinball bumper bank', 'Impact', 480, 8485, 'Five symmetrically placed bumpers carry the high-rebound material.'],
  ['A18', 'Impact leaves', 'Impact', 800, 8725, 'Paired hinged ramps · selected clients below.'],
  ['A19', 'Direction ramps', 'Static + physics', 470, 9340, 'Final broad ramps · purpose statement.'],
];
const seam = ['A20', 'Socket grid', 0, 'Capture / seam', '176 receptacles meet the continuing band. Empty sockets stay visible; occupied sockets show their ball. This is the actual viewport at the start of the handoff.'];
const stages = [
  ['B01', 'Travelling band', .25, 'Scroll', 'The occupied grid continues as a curved band. One camera follows it into a low, shallow perspective.'],
  ['B02', 'Authored tunnel', .66, 'Scroll + automatic', 'The same band closes into the existing Blender tunnel. Scroll owns the shared camera; assemblies retain their automatic motion.'],
  ['B03', 'Final wall', .88, 'Scroll + automatic', 'The final field approaches. The camera retraces the same path when scrolling up.'],
  ['B04', 'Contact clearing', 1, 'Scroll + action', 'Balls shrink to reveal an organic opening, a centred invitation, the email address, LinkedIn and a gated CV download.'],
];

async function settleScroll(page, top) {
  await page.locator('.about-board-scrollport').evaluate((port, value) => { port.scrollTop = value; }, top);
  // Native scroll and the bounded ball strip must both have sampled this pose.
  // A fixed delay alone can capture an old canvas against the new architecture.
  await page.waitForFunction(() => {
    const stats = window.__ABS_ABOUT_GAME_BOARD__.getStats();
    return Math.abs(stats.handledScrollTop - stats.scrollTop) < 1
      && (!stats.boardVisible || Math.abs(stats.boardRenderer.renderedScrollTop - stats.scrollTop) < 1);
  });
  await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
}

async function captureVariant(browser, variant) {
  const page = await browser.newPage({
    viewport: { width: variant.width, height: variant.height }, deviceScaleFactor: 1,
    isMobile: variant.id === 'mobile', hasTouch: variant.id === 'mobile', colorScheme: 'light',
  });
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  try {
    await page.goto(`${origin}/about.html`);
    await page.waitForFunction(() => window.__ABS_ABOUT_GAME_BOARD__?.getStats().reservoirReady,
      null, { timeout: 60000 });
    await page.waitForFunction(() => {
      const overlay = document.querySelector('#abs-boot-overlay');
      return !overlay || getComputedStyle(overlay).display === 'none'
        || Number(getComputedStyle(overlay).opacity) < .01;
    });
    await page.evaluate(() => document.fonts.ready);
    if (await page.locator('html').getAttribute('data-abs-theme') !== 'light') {
      await page.getByRole('button', { name: 'Switch to light mode' }).click();
    }
    await settleScroll(page, 0);
    const shell = uri(await page.screenshot());
    // Include the complete shell above. Hide fixed chrome only in the content
    // strip so the utility notch and tracker do not repeat in every tile.
    await page.addStyleTag({ content: `
      .about-board-scroll-ui,.shell-utility-rail,.shell-window-contour{visibility:hidden!important}
      .app-scene[data-utility-contour='ready'] #simulations{clip-path:none!important;border-radius:0!important}
    ` });
    const geometry = await page.evaluate(() => {
      const port = document.querySelector('.about-board-scrollport');
      const world = port.querySelector('.about-board-world');
      const stage = port.querySelector('.about-board-three-stage');
      const box = port.getBoundingClientRect();
      const top = element => element.getBoundingClientRect().top - box.top + port.scrollTop;
      const stats = window.__ABS_ABOUT_GAME_BOARD__.getStats();
      return { x: box.x, y: box.y, width: box.width, height: box.height,
        worldTop: top(world), scale: world.clientWidth / 960,
        originY: stats.reservoir.topY, worldEnd: top(world) + world.getBoundingClientRect().height,
        // Stop before the sticky 3D viewport: stitching past this point would
        // splice different perspective poses into a false flat socket grid.
        end: top(stage), stageHeight: stage.getBoundingClientRect().height };
    });
    const tiles = [];
    const inset = 42;
    let top = 0;
    while (top < geometry.end) {
      const pad = top === 0 ? 0 : inset;
      const height = Math.min(geometry.height - inset - pad, geometry.end - top);
      await settleScroll(page, top - pad);
      const bytes = await page.screenshot({ clip: { x: geometry.x, y: geometry.y + pad,
        width: geometry.width, height } });
      tiles.push({ top, height, image: uri(bytes) });
      top += height;
    }
    const frames = [];
    for (const [id, name, progress, motion, description] of [seam, ...stages]) {
      await settleScroll(page, geometry.end + progress * (geometry.stageHeight - geometry.height));
      // Asset loading finishes before the first authored pose is painted.
      await page.waitForFunction(target => {
        const scene = window.__ABS_ABOUT_GAME_BOARD__.getStats().authoredEnding;
        return scene?.status === 'ready' && Math.abs(scene.bandJourney?.progress - target) < .002;
      }, progress, { timeout: 60000 });
      await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
      const image = uri(await page.screenshot({ clip: { x: geometry.x, y: geometry.y,
        width: geometry.width, height: geometry.height } }));
      frames.push({ id, name, progress, motion, description, image });
    }
    if (errors.length) throw new Error(`${variant.name} runtime errors: ${errors.join('; ')}`);
    const ratio = variant.imageWidth / geometry.width;
    const annotations = parts.map(([id, name, motion, x, worldY, description]) => {
      const y = worldY === null ? geometry.worldTop * .45 : worldY === 'reservoir'
        ? geometry.worldTop + (825 - geometry.originY) * geometry.scale * .5
        : geometry.worldTop + (worldY - geometry.originY) * geometry.scale;
      return { id, name, motion, description, sourceX: x, sourceY: worldY,
        pointX: x * geometry.scale * ratio, pointY: y * ratio };
    });
    console.log(`${variant.name}: ${tiles.length} 2D tiles, socket seam and ${stages.length} 3D poses.`);
    return { ...variant, capturedAt, geometry, ratio, shell, tiles, annotations, frames, errors };
  } finally {
    await page.close();
  }
}

function renderMap(capture) {
  const { imageWidth, geometry, ratio } = capture;
  const labelLeft = imageWidth + 64;
  const width = labelLeft + 345;
  const stripHeight = geometry.end * ratio;
  const labels = capture.annotations.map(item => `<article id="${item.id}" class="callout" data-point-y="${item.pointY}" style="top:${item.pointY}px">
    <div class="eyebrow">${item.id} <span>${escape(item.motion)}</span></div><h3>${escape(item.name)}</h3>
    <p>${escape(item.description)}</p></article>`).join('');
  const lines = capture.annotations.map(item => `<path data-for="${item.id}" data-x="${item.pointX}" data-y="${item.pointY}"/>
    <circle cx="${item.pointX}" cy="${item.pointY}" r="12"/><text x="${item.pointX}" y="${item.pointY + 4}">${item.id.slice(1)}</text>`).join('');
  const frameHtml = frame => `<section class="frame" id="${frame.id}"><img alt="${escape(frame.name)} — ${capture.name}" src="${frame.image}"><div>
    <div class="eyebrow">${frame.id} <span>${escape(frame.motion)}</span></div><h3>${escape(frame.name)}</h3><p>${escape(frame.description)}</p>
    <p class="meta">${Math.round(frame.progress * 100)}% of the 3D passage · actual viewport</p></div></section>`;
  const date = new Date(capturedAt).toLocaleString('en-GB', { timeZone: 'Europe/London', dateStyle: 'long', timeStyle: 'short' });
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
  <title>About — ${capture.name.toLowerCase()} annotated scene map</title><style>
  *{box-sizing:border-box}html{scroll-behavior:smooth}body{margin:0;background:#f6f5f0;color:#202522;font:15px/1.5 -apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif}
  main{width:${width}px;margin:0 auto;padding:42px 0 80px}.kicker,.eyebrow{font-size:11px;letter-spacing:.12em;text-transform:uppercase;font-weight:700;color:#365d53}
  h1{font:64px/1.05 Georgia,serif;margin:18px 0}h2{font:42px/1.15 Georgia,serif;margin:12px 0}h3{font-size:20px;line-height:1.15;margin:7px 0}p{margin:8px 0}
  .lede{max-width:720px;font-size:19px;color:#535d57}.meta{margin:24px 0;color:#616b64;font-size:13px}.intro{display:grid;grid-template-columns:1fr ${capture.id === 'mobile' ? 190 : 360}px;gap:48px;margin:32px 0 44px}
  .intro img{width:100%;border-radius:16px}.legend{display:flex;gap:8px;flex-wrap:wrap;margin:22px 0}.legend span,.eyebrow span{background:#e4eae4;border-radius:5px;padding:4px 7px;letter-spacing:.03em}
  .views{display:flex;align-items:center;gap:10px}.views a{display:inline-block;text-decoration:none;border:1px solid #bbc6bd;border-radius:8px;padding:10px 16px}.views a[aria-current]{background:#202b26;color:#fff;border-color:#202b26}.views small{font-size:12px;opacity:.75;margin-left:8px}
  nav{position:fixed;bottom:20px;right:20px;background:#202b26;color:#fff;padding:12px 18px;border-radius:30px;z-index:3;box-shadow:0 2px 20px #0002}a{color:inherit}nav a{margin:0 8px;text-decoration:none}a:focus-visible{outline:3px solid #4c826e;outline-offset:5px}
  .part{border-top:1px solid #bbc6bd;padding:35px 0 25px}.strip{position:relative;width:${width}px;height:${stripHeight + 25}px}
  .tile{display:block;position:absolute;left:0;width:${imageWidth}px}.leaders{position:absolute;inset:0;pointer-events:none;overflow:visible}.leaders path{fill:none;stroke:#3c705f;stroke-width:1.2}.leaders circle{fill:#3c705f;stroke:#f6f5f0;stroke-width:2}.leaders text{fill:white;font:10px sans-serif;text-anchor:middle}
  .callout{position:absolute;left:${labelLeft}px;width:345px;scroll-margin-top:30px}.callout p{font-size:14px;color:#59635c}.eyebrow span{font-size:9px;margin-left:9px}
  .frame{display:grid;grid-template-columns:${imageWidth}px 345px;gap:64px;margin:20px 0 65px;align-items:center;scroll-margin-top:25px}.frame img{display:block;width:100%}.frame h3{font-size:30px}
  footer{border-top:1px solid #bbc6bd;padding-top:25px;color:#5b655e;font-size:13px}.note{padding:15px 20px;background:#e9eee8;border-left:3px solid #66806c;max-width:870px;margin:20px 0 30px}
  @media print{nav{display:none}}@media(max-width:${width + 48}px){main{margin:0 24px}}
  </style></head><body><nav aria-label="Scene sections"><a href="#top">Overview</a><a href="#part-a">2D motion</a><a href="#A20">Socket grid</a><a href="#part-b">3D world</a></nav><main id="top">
  <div class="views" aria-label="Captured viewport">${variants.map(variant => `<a href="${variant.file}"${capture.id === variant.id ? ' aria-current="page"' : ''}>${variant.name} <small>${variant.width} × ${variant.height}</small></a>`).join('')}</div>
  <div class="intro"><div><div class="kicker">Alexander Beck Studio / About / ${capture.name}</div><h1>One page.<br>Two worlds.</h1>
  <p class="lede">The current design, from the opening reservoir to the final invitation. Use the same element names and IDs in both viewport references.</p>
  <div class="legend"><span>Scroll = reversible position</span><span>Automatic = time</span><span>Impact = balls</span><span>Manual = visitor input</span></div>
  <p class="meta">${capture.width} × ${capture.height} · light mode · ${escape(date)} London time.<br>Actual local browser captures. Particle positions change between captures.</p></div><img alt="${capture.name} opening with complete site shell" src="${capture.shell}"></div>
  <section id="part-a" class="part"><div class="kicker">Part A / top</div><h2>2D motion</h2><p>The reservoir, funnel, valves, pinball and assembly machine.</p>
  <div class="note">The opening is shown above with its complete shell. Below, fixed controls are omitted from the continuous strip so they do not repeat. Architecture, text, colours and ball sizes come directly from the page.</div></section>
  <div class="strip" data-content-height="${stripHeight}">${capture.tiles.map(tile => `<img class="tile" alt="2D page segment starting at ${Math.round(tile.top)} pixels" style="top:${tile.top * ratio}px;height:${tile.height * ratio}px" src="${tile.image}">`).join('')}
  <svg class="leaders" width="${width}" height="${stripHeight}">${lines}</svg>${labels}</div>
  ${frameHtml(capture.frames[0])}
  <section id="part-b" class="part"><div class="kicker">Part B / bottom</div><h2>3D world</h2><p>Four scroll positions show the spatial passage. These are successive viewport views, rather than a stitched flat scene.</p></section>
  ${capture.frames.slice(1).map(frameHtml).join('')}
  <footer>Local design reference · captured from ${escape(origin)}/about.html. The 2D strip stops at the handoff; the socket-grid view and four 3D poses continue through the contact clearing. Empty sockets reflect the actual captured occupancy. This is visual evidence, not a motion or performance certification.</footer></main></body></html>`;
}

async function renderAndVerify(browser, capture, directory) {
  const page = await browser.newPage({ viewport: { width: 1340, height: 1000 } });
  try {
    await page.setContent(renderMap(capture));
    await page.evaluate(async () => { await Promise.all([...document.images].map(image => image.decode())); });
    // Measure real annotation heights. The phone has less vertical separation;
    // fixed label heights would make the drum and valve descriptions overlap.
    const annotations = await page.evaluate(imageWidth => {
      let bottom = 0;
      const layout = [...document.querySelectorAll('.callout')].map(label => {
        const top = Math.max(Number(label.dataset.pointY) - 35, bottom + 18);
        label.style.top = `${top}px`;
        bottom = top + label.getBoundingClientRect().height;
        const line = document.querySelector(`path[data-for="${label.id}"]`);
        line.setAttribute('d', `M${line.dataset.x} ${line.dataset.y}H${imageWidth + 22}L${imageWidth + 48} ${top + 25}H${imageWidth + 62}`);
        return { id: label.id, labelY: top, labelHeight: bottom - top };
      });
      const strip = document.querySelector('.strip');
      strip.style.height = `${Math.max(Number(strip.dataset.contentHeight), bottom) + 25}px`;
      return layout;
    }, capture.imageWidth);
    capture.annotations = capture.annotations.map(item => ({ ...item, ...annotations.find(label => label.id === item.id) }));
    const issues = await page.evaluate(() => {
      const issues = [];
      for (const image of document.images) if (!image.complete || !image.naturalWidth) issues.push(`Missing image: ${image.alt}`);
      const ids = [...document.querySelectorAll('[id]')].map(element => element.id);
      if (new Set(ids).size !== ids.length) issues.push('Duplicate element IDs');
      for (const link of document.querySelectorAll('a[href^="#"]')) {
        if (!document.getElementById(link.hash.slice(1))) issues.push(`Broken section link: ${link.hash}`);
      }
      const labels = [...document.querySelectorAll('.callout')];
      for (let i = 1; i < labels.length; i++) {
        if (labels[i].getBoundingClientRect().top < labels[i - 1].getBoundingClientRect().bottom) issues.push(`Label overlap: ${labels[i].id}`);
      }
      return issues;
    });
    if (issues.length) throw new Error(`${capture.name} reference: ${issues.join('; ')}`);
    await writeFile(path.join(directory, capture.file), await page.content());
    const suffix = capture.id === 'desktop' ? '' : '-mobile';
    await page.screenshot({ path: path.join(directory, `annotated-page${suffix}.png`), fullPage: true });
    await page.screenshot({ path: path.join(directory, `overview${suffix}.png`) });
    // Small, readable proofs avoid relying on an illegibly tall full-page PNG.
    for (const id of ['A02', 'A08', 'A10', 'A14', 'A17', 'A20', 'B01', 'B02', 'B04']) {
      await page.locator(`#${id}`).evaluate(element => element.scrollIntoView({ block: 'center', behavior: 'instant' }));
      await page.screenshot({ path: path.join(directory, `${capture.id}-${id}.png`) });
    }
  } finally {
    await page.close();
  }
}

await mkdir(path.dirname(output), { recursive: true });
const staging = await mkdtemp(path.join(path.dirname(output), '.about-scene-map-'));
const browser = await chromium.launch({ args: [`--use-angle=${gpu}`,
  '--enable-webgl', gpu === 'metal' ? '--enable-gpu' : '--enable-unsafe-swiftshader'] });
const captures = [];
try {
  // One active simulation at a time keeps capture load from changing the scene.
  for (const variant of variants) captures.push(await captureVariant(browser, variant));
} finally {
  await browser.close();
}
// Rasterise the tall reference only after releasing all live WebGL scenes.
const reportBrowser = await chromium.launch();
try {
  for (const capture of captures) await renderAndVerify(reportBrowser, capture, staging);
  const page = await reportBrowser.newPage();
  await page.goto(pathToFileURL(path.join(staging, 'index.html')).href);
  await page.getByRole('link', { name: 'Mobile 390 × 844', exact: true }).click();
  await page.waitForURL('**/mobile.html');
  await page.getByRole('link', { name: 'Desktop 1440 × 1000', exact: true }).click();
  await page.waitForURL('**/index.html');
  await page.close();
} finally {
  await reportBrowser.close();
}
await writeFile(path.join(staging, 'map.json'), JSON.stringify({ capturedAt, url: `${origin}/about.html`, gpu,
  viewports: captures.map(({ shell, tiles, frames, ...capture }) => ({ ...capture,
    tiles: tiles.map(({ image, ...tile }) => tile), frames: frames.map(({ image, ...frame }) => frame) })),
  verification: { runtimeErrors: 0, brokenImages: 0, annotationOverlaps: 0, viewportNavigation: 'passed' },
}, null, 2));
// Keep the previous reference intact until both new variants are verified.
const backup = `${output}-previous-${capturedAt.replaceAll(/[:.]/g, '-')}`;
let backedUp = false;
try { await rename(output, backup); backedUp = true; } catch (error) { if (error.code !== 'ENOENT') throw error; }
try { await rename(staging, output); } catch (error) {
  if (backedUp) await rename(backup, output);
  throw error;
}
console.log(`Verified desktop and mobile annotated references: ${output}`);
