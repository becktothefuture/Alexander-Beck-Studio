#!/usr/bin/env node
// ╔══════════════════════════════════════════════════════════════════════════════╗
// ║                         BUILD PARITY VERIFIER (PROD)                         ║
// ║                                                                              ║
// ║  Goal: Catch dev/build drift EARLY by asserting invariants about `public/`.   ║
// ║                                                                              ║
// ║  This script is intentionally strict and fails the build if any invariant     ║
// ║  is violated. Keep checks focused on drift-prone surfaces (HTML composition).║
// ╚══════════════════════════════════════════════════════════════════════════════╝

const fs = require('fs');
const path = require('path');

function readText(filePath) {
  return fs.readFileSync(filePath, 'utf8');
}

function assert(cond, msg, failures) {
  if (cond) return;
  failures.push(msg);
}

function assertIncludes(haystack, needle, msg, failures) {
  assert(String(haystack).includes(String(needle)), msg, failures);
}

function assertNotIncludes(haystack, needle, msg, failures) {
  assert(!String(haystack).includes(String(needle)), msg, failures);
}

function assertFileExists(filePath, failures) {
  assert(fs.existsSync(filePath), `Missing file: ${filePath}`, failures);
}

function assertNoMarkers(html, label, failures) {
  assertNotIncludes(html, 'ABS_BUILD_MARKER', `${label}: build markers leaked into output`, failures);
}

function assertHasCacheBust(html, assetSubstring, label, failures) {
  const re = new RegExp(`${assetSubstring.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\?v=\\d+`);
  assert(re.test(html), `${label}: missing cache-busted asset reference for ${assetSubstring}`, failures);
}

function verifyBuildParity(opts = {}) {
  const publicDir = opts.publicDir || path.join(process.cwd(), 'public');
  const failures = [];

  const publicIndex = path.join(publicDir, 'index.html');
  const publicPortfolio = path.join(publicDir, 'portfolio.html');
  const publicCv = path.join(publicDir, 'cv.html');
  const publicModulesDir = path.join(publicDir, 'modules');

  assertFileExists(publicIndex, failures);
  assertFileExists(publicPortfolio, failures);
  assertFileExists(publicCv, failures);

  const indexHtml = readText(publicIndex);
  const portfolioHtml = readText(publicPortfolio);
  const cvHtml = readText(publicCv);

  // Global: no marker leakage
  assertNoMarkers(indexHtml, 'index.html', failures);
  assertNoMarkers(portfolioHtml, 'portfolio.html', failures);
  assertNoMarkers(cvHtml, 'cv.html', failures);

  // Global: bundled build should not ship the raw module graph directory
  assert(!fs.existsSync(publicModulesDir), 'public/modules/ should not exist (bundles must be used)', failures);

  // index.html invariants
  assertIncludes(indexHtml, 'id="bravia-balls-css"', 'index.html: missing #bravia-balls-css link tag', failures);
  assertIncludes(indexHtml, 'id="bravia-balls-js"', 'index.html: missing #bravia-balls-js script tag', failures);
  assertHasCacheBust(indexHtml, 'css/bouncy-balls.css', 'index.html', failures);
  assertHasCacheBust(indexHtml, 'js/bouncy-balls-embed.js', 'index.html', failures);

  assertNotIncludes(indexHtml, 'type="module" src="main.js"', 'index.html: dev module entrypoint leaked', failures);
  assertNotIncludes(indexHtml, 'css/tokens.css', 'index.html: unbundled CSS leaked (tokens.css)', failures);
  assertNotIncludes(indexHtml, 'css/normalize.css', 'index.html: unbundled CSS leaked (normalize.css)', failures);
  assertNotIncludes(indexHtml, 'css/main.css', 'index.html: unbundled CSS leaked (main.css)', failures);
  assertNotIncludes(indexHtml, 'css/panel.css', 'index.html: dev-only CSS leaked (panel.css)', failures);

  assertIncludes(indexHtml, 'window.__RUNTIME_CONFIG__=', 'index.html: missing inline __RUNTIME_CONFIG__', failures);
  assertIncludes(indexHtml, 'window.__TEXT__=', 'index.html: missing inline __TEXT__', failures);

  // Key DOM IDs for runtime systems
  assertIncludes(indexHtml, 'id="bravia-balls"', 'index.html: missing #bravia-balls container', failures);
  assertIncludes(indexHtml, 'id="brand-logo"', 'index.html: missing #brand-logo', failures);
  assertIncludes(indexHtml, 'id="modal-blur-layer"', 'index.html: missing #modal-blur-layer', failures);
  assertIncludes(indexHtml, 'id="modal-content-layer"', 'index.html: missing #modal-content-layer', failures);

  // portfolio.html invariants
  assertHasCacheBust(portfolioHtml, 'css/bouncy-balls.css', 'portfolio.html', failures);
  assertHasCacheBust(portfolioHtml, 'css/portfolio.css', 'portfolio.html', failures);
  assertHasCacheBust(portfolioHtml, 'js/portfolio-bundle.js', 'portfolio.html', failures);
  assertNotIncludes(portfolioHtml, 'type="module"', 'portfolio.html: dev module script leaked', failures);
  assertNotIncludes(portfolioHtml, 'modules/portfolio/app.js', 'portfolio.html: dev entrypoint leaked', failures);
  assertIncludes(portfolioHtml, 'window.__PORTFOLIO_CONFIG__=', 'portfolio.html: missing inline __PORTFOLIO_CONFIG__', failures);
  assertIncludes(portfolioHtml, 'window.__RUNTIME_CONFIG__=', 'portfolio.html: missing inline __RUNTIME_CONFIG__', failures);

  // cv.html invariants
  assertHasCacheBust(cvHtml, 'css/bouncy-balls.css', 'cv.html', failures);
  assertHasCacheBust(cvHtml, 'js/cv-bundle.js', 'cv.html', failures);
  assertNotIncludes(cvHtml, 'type="module"', 'cv.html: dev module script leaked', failures);
  assertIncludes(cvHtml, 'window.__RUNTIME_CONFIG__=', 'cv.html: missing inline __RUNTIME_CONFIG__', failures);
  assertIncludes(cvHtml, 'window.__TEXT__=', 'cv.html: missing inline __TEXT__', failures);

  if (failures.length) {
    // Print a compact error list (keep it readable in build logs).
    console.error('\n❌ BUILD PARITY CHECK FAILED\n');
    for (const msg of failures) console.error(`- ${msg}`);
    console.error('\nFix the issues above (source templates/build pipeline) and rebuild.\n');
    process.exit(1);
  }

  console.log('✅ Build parity verified (public/ HTML + assets invariants)');
}

module.exports = { verifyBuildParity };

if (require.main === module) {
  verifyBuildParity();
}

