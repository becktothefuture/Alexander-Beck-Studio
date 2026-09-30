import { readFile, writeFile, mkdir } from 'node:fs/promises';

const root = process.env.ABS_OUTPUT || 'output/playwright/about-performance-20260925';
const read = path => readFile(path, 'utf8').then(JSON.parse).catch(() => null);
const baseline = await read(`${root}/baseline/manifest.json`);
const improved = await read(`${root}/after/manifest.json`);
if (!baseline) throw new Error('Record the baseline before generating this report.');
const escape = value => String(value ?? '').replace(/[&<>"']/g,
  character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character]);
const number = value => Number.isFinite(value) ? value.toFixed(1) : '—';
const names = { 'opening-rest': 'Opening at rest', 'reservoir-release': 'Reservoir release',
  'fast-2d-scroll': 'Fast 2D scrolling', 'seam-approach': '2D → 3D entrance',
  'tunnel-hold': 'Inside the tunnel', 'fast-3d-scroll': 'Fast 3D scrolling',
  'reverse-to-machine': 'Return to the machine', 'closed-return': 'Return to the opening' };
const drawRate = phase => {
  const count = phase.authoredDrawCount ?? Math.max(0,
    (phase.after.stats.authoredEnding?.gpu?.drawCount || 0)
      - (phase.before.stats.authoredEnding?.gpu?.drawCount || 0));
  return count / (phase.wallMs / 1000);
};
const bar = (value, label, className) => `<div class="bar-row"><span>${label}</span><div class="track"><div class="bar ${className}" style="width:${Math.min(100, value / 65 * 100)}%"></div><i></i></div><b>${number(value)} ms</b></div>`;
const views = baseline.reports.map(report => {
  const after = improved?.reports.find(item => item.id === report.id);
  return `<section><h2>${report.viewport.width < 600 ? 'Phone viewport' : 'Desktop'} <small>${report.viewport.width} × ${report.viewport.height}</small></h2>
  <p>${escape(report.gpuRenderer)}. Phone results use this desktop hardware; they do not certify a physical phone.</p>
  <div class="phases">${report.phases.map(phase => {
    const next = after?.phases.find(item => item.name === phase.name);
    const path = `${report.id}-${phase.name}`;
    return `<article><h3>${names[phase.name] || escape(phase.name)}</h3>
      ${bar(phase.frame.p95, 'Before', 'before')}${next ? bar(next.frame.p95, 'After', 'after') : '<p class="pending">After measurement pending</p>'}
      <p class="caption">95th percentile RAF interval · line marks 16.7 ms</p>
      <dl><div><dt>Long tasks before</dt><dd>${phase.longTasks.count} · worst ${number(phase.longTasks.maxMs)} ms</dd></div>
      ${next ? `<div><dt>Long tasks after</dt><dd>${next.longTasks.count} · worst ${number(next.longTasks.maxMs)} ms</dd></div>` : ''}
      <div><dt>Canvas 2D paints / second</dt><dd>${number(phase.canvasPaintCount / phase.wallMs * 1000)}${next ? ` → ${number((next.completedCanvasPaintCount ?? next.canvasPaintCount) / next.wallMs * 1000)}` : ''}</dd></div>
      ${phase.name.includes('3d') || phase.name === 'tunnel-hold' ? `<div><dt>Authored 3D draws / second</dt><dd>${number(drawRate(phase))}${next ? ` → ${number(drawRate(next))}` : ''}</dd></div>` : ''}
      ${phase.name === 'reservoir-release' ? `<div><dt>Physics / real time</dt><dd>${number((phase.after.stats.elapsedMs - phase.before.stats.elapsedMs) / phase.wallMs * 100)}%${next ? ` → ${number(next.simulationToWallRatio * 100)}%` : ''}</dd></div>` : ''}</dl>
      <details><summary>Trace this result</summary><p><a href="baseline/${path}.cpuprofile">Before CPU profile</a> · <a href="baseline/${path}-frames.json">Frame log</a> · <a href="baseline/${path}.png">Capture</a>${next ? ` · <a href="after/${path}.cpuprofile">After CPU profile</a>` : ''}</p>
      <table><thead><tr><th>Before: sampled function</th><th>Self time</th></tr></thead><tbody>${phase.cpu.filter(row => row.url).slice(0, 7).map(row => `<tr><td>${escape(row.function)}<small>${escape(row.url.replace(/^.*\/src\//, 'src/').replace(/\?.*$/, ''))}:${row.line}</small></td><td>${number(row.selfMs)} ms</td></tr>`).join('')}</tbody></table></details></article>`;
  }).join('')}</div><p><a href="baseline/${report.id}-report.json">Complete before diagnostics</a>${after ? ` · <a href="after/${report.id}-report.json">Complete after diagnostics</a>` : ''}</p></section>`;
}).join('');

const html = `<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>About · Performance evidence</title>
<style>*{box-sizing:border-box}body{margin:0;background:#f4f3ef;color:#222826;font:16px/1.5 system-ui,sans-serif}main{max-width:1160px;margin:auto;padding:48px 28px 80px}h1{font:clamp(42px,6vw,72px)/1.05 Georgia,serif;margin:16px 0 22px;max-width:15ch}h2{font-size:26px;margin-top:52px}h2 small{font-size:15px;color:#626b66;font-weight:400}h3{font-size:19px;margin:0 0 20px}p{max-width:80ch}.eyebrow{font-size:12px;letter-spacing:.16em;text-transform:uppercase;color:#47685b}a{color:#235b48;text-underline-offset:3px}.intro{font-size:19px}.note{border-left:3px solid #87948c;padding:10px 20px;background:#e9ece6}.phases{display:grid;grid-template-columns:1fr 1fr;gap:18px}article{padding:24px;border:1px solid #d5dad4;border-radius:12px;background:#fffdfa}.bar-row{display:grid;grid-template-columns:50px 1fr 62px;gap:8px;align-items:center;font-size:12px;margin:8px 0}.track{height:12px;background:#edece7;position:relative}.bar{height:100%;min-width:1px}.before{background:#a88765}.after{background:#47836c}.track i{position:absolute;left:25.69%;top:-4px;bottom:-4px;border-left:1px solid #222826}.bar-row b{font-variant-numeric:tabular-nums;font-weight:500;text-align:right}.caption,.pending{color:#6d736e;font-size:12px}.pending{padding:8px 0}dl{font-size:13px;margin:18px 0}dl div{display:flex;justify-content:space-between;gap:8px}dd{margin:0;font-variant-numeric:tabular-nums}summary{cursor:pointer;font-weight:600;font-size:13px}details p{font-size:12px}table{width:100%;font-size:12px;border-collapse:collapse}th,td{text-align:left;vertical-align:top;border-bottom:1px solid #e2e5df;padding:8px 0}td small{display:block;overflow-wrap:anywhere;font-size:10px;color:#69746c}td:last-child{width:68px;text-align:right}footer{margin-top:50px;color:#69746c;font-size:13px}@media(max-width:760px){.phases{grid-template-columns:1fr}main{padding:28px 16px}}</style>
<main><div class="eyebrow">Alexander Beck Studio / Local About / 25 September 2026</div><h1>Keep the machine together.</h1><p class="intro">Recorded browser evidence for scroll attachment, physics cost and the transition from the 2D machine into the 3D world.</p><p class="note">The target is 60 frames per second: 16.7 ms per frame. These charts show the 95th percentile RAF interval. RAF is browser scheduling, not proof that physics or 3D renders at 60 Hz: actual draws and physics versus real time are reported separately below.</p><p><strong>Current limit:</strong> dense desktop release still exceeds the frame budget. The retained collision guard prevents clipping and has not been removed to improve a benchmark.</p><p><a href="baseline/manifest.json">Before manifest</a> · <a href="after/manifest.json">After manifest</a> · <a href="baseline/source-manifest.json">Before sources</a> · <a href="after/source-manifest.json">After sources</a> · <a href="../../../docs/qa/about-performance-20260925.md">Findings and decisions</a></p><p>Additional checks: <a href="lifecycle/chromium-report.json">scene lifetime and exact ball identities</a> · <a href="attachment/report.json">scroll attachment</a> · <a href="resize/chromium-report.json">responsive 3D reconstruction</a>.</p>${views}<footer>CPU profiles retain function names, source URLs and line numbers. JSX line numbers refer to Vite's transformed module; function names and source fingerprints identify the original implementation. Chromium profiles can be opened in DevTools Performance. The first baseline used a slightly wider counter-sampling window; final frame intervals use exact browser timestamps. Measurements are local development evidence, not a promise for every device. No production changes were published.</footer></main></html>`;
await mkdir(root, { recursive: true });
await writeFile(`${root}/index.html`, html);
console.log(`${root}/index.html`);
