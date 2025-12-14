#!/usr/bin/env node
// ╔══════════════════════════════════════════════════════════════════════════════╗
// ║                         WEBFLOW ASSET SYNC                                   ║
// ║                                                                              ║
// ║  Goal: Make dev (source/) visually identical to build (public/) by copying   ║
// ║  the minimal set of Webflow-exported assets into source/ for the dev server.║
// ║                                                                              ║
// ║  Copies (from webflow-export/ → source/webflow/):                             ║
// ║   - css/*                                                                    ║
// ║   - js/webflow.js                                                            ║
// ║   - images/*                                                                 ║
// ╚══════════════════════════════════════════════════════════════════════════════╝

const fs = require('fs');
const path = require('path');

const ROOT = process.cwd();
const SRC_WEBFLOW = path.join(ROOT, 'webflow-export');
const DST_WEBFLOW = path.join(ROOT, 'source', 'webflow');

function ensureDir(dir) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function copyFileIfChanged(src, dst) {
  const srcStat = fs.statSync(src);
  if (fs.existsSync(dst)) {
    const dstStat = fs.statSync(dst);
    if (dstStat.size === srcStat.size && dstStat.mtimeMs >= srcStat.mtimeMs) return false;
  }
  ensureDir(path.dirname(dst));
  fs.copyFileSync(src, dst);
  return true;
}

function copyDir(srcDir, dstDir) {
  ensureDir(dstDir);
  const items = fs.readdirSync(srcDir);
  let copied = 0;

  for (const item of items) {
    const src = path.join(srcDir, item);
    const dst = path.join(dstDir, item);
    const stat = fs.statSync(src);

    if (stat.isDirectory()) {
      copied += copyDir(src, dst);
      continue;
    }

    if (copyFileIfChanged(src, dst)) copied += 1;
  }

  return copied;
}

function main() {
  if (!fs.existsSync(SRC_WEBFLOW)) {
    console.error(`[sync-webflow-assets] Missing directory: ${SRC_WEBFLOW}`);
    process.exit(1);
  }

  const cssSrc = path.join(SRC_WEBFLOW, 'css');
  const jsSrc = path.join(SRC_WEBFLOW, 'js');
  const imgSrc = path.join(SRC_WEBFLOW, 'images');

  const cssDst = path.join(DST_WEBFLOW, 'css');
  const jsDst = path.join(DST_WEBFLOW, 'js');
  const imgDst = path.join(DST_WEBFLOW, 'images');

  let copied = 0;

  if (fs.existsSync(cssSrc)) copied += copyDir(cssSrc, cssDst);
  if (fs.existsSync(imgSrc)) copied += copyDir(imgSrc, imgDst);

  const webflowJs = path.join(jsSrc, 'webflow.js');
  if (fs.existsSync(webflowJs)) {
    if (copyFileIfChanged(webflowJs, path.join(jsDst, 'webflow.js'))) copied += 1;
  }

  if (copied > 0) {
    console.log(`[sync-webflow-assets] Synced ${copied} file(s) → source/webflow/`);
  } else {
    console.log('[sync-webflow-assets] Up to date');
  }
}

main();


