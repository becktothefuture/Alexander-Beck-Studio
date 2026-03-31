#!/usr/bin/env node

import process from 'node:process';
import { chromium, devices, firefox, webkit } from 'playwright';

const FIGMA_CAPTURE_SCRIPT_URL = 'https://mcp.figma.com/mcp/html-to-design/capture.js';

function printHelp() {
  console.log(`Literal external-site capture to a Figma capture ID.

Usage:
  npm run figma:capture:external -- --url <https://example.com> --capture-id <uuid> [options]

Required:
  --url <url>                 External page URL to capture
  --capture-id <uuid>         Capture ID returned by the Figma MCP tool

Viewport options:
  --device <name>             Playwright device preset, e.g. "iPhone 13"
  --width <px>                Viewport width when not using --device
  --height <px>               Viewport height when not using --device

Capture options:
  --selector <css>            CSS selector to capture (default: body)
  --wait-until <event>        Playwright waitUntil strategy (default: domcontentloaded)
  --settle-ms <ms>            Extra settle delay after navigation (default: 4000)
  --timeout <ms>              Navigation timeout (default: 60000)
  --browser <name>            chromium | firefox | webkit (default: chromium)
  --headed                    Run headed instead of headless

Examples:
  npm run figma:capture:external -- --url https://www.heynds.com/en --capture-id abc123 --width 1440 --height 900
  npm run figma:capture:external -- --url https://www.heynds.com/en --capture-id def456 --device "iPhone 13"
`);
}

function parseArgs(argv) {
  const result = {};
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (token === '--help' || token === '-h') {
      result.help = true;
      continue;
    }
    if (token === '--headed') {
      result.headed = true;
      continue;
    }
    if (!token.startsWith('--')) {
      throw new Error(`Unexpected argument: ${token}`);
    }
    const key = token.slice(2);
    const next = argv[index + 1];
    if (!next || next.startsWith('--')) {
      throw new Error(`Missing value for --${key}`);
    }
    result[key] = next;
    index += 1;
  }
  return result;
}

function resolveBrowser(browserName) {
  switch ((browserName || 'chromium').toLowerCase()) {
    case 'chromium':
      return chromium;
    case 'firefox':
      return firefox;
    case 'webkit':
      return webkit;
    default:
      throw new Error(`Unsupported browser "${browserName}". Use chromium, firefox, or webkit.`);
  }
}

function resolveViewportOptions(options) {
  if (options.device) {
    const preset = devices[options.device];
    if (!preset) {
      throw new Error(`Unknown Playwright device preset "${options.device}".`);
    }
    return { ...preset };
  }

  const width = Number(options.width || 1440);
  const height = Number(options.height || 900);
  if (!Number.isFinite(width) || !Number.isFinite(height)) {
    throw new Error('Viewport width/height must be numeric.');
  }

  return {
    viewport: {
      width,
      height,
    },
  };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    printHelp();
    return;
  }

  const url = args.url?.trim();
  const captureId = args['capture-id']?.trim();
  if (!url || !captureId) {
    printHelp();
    throw new Error('Both --url and --capture-id are required.');
  }
  if (!/^https?:\/\//i.test(url)) {
    throw new Error('Only http(s) URLs are supported.');
  }

  const browserType = resolveBrowser(args.browser);
  const contextOptions = resolveViewportOptions(args);
  const waitUntil = args['wait-until'] || 'domcontentloaded';
  const settleMs = Number(args['settle-ms'] || 4000);
  const timeout = Number(args.timeout || 60000);
  const selector = args.selector || 'body';
  const endpoint = `https://mcp.figma.com/mcp/capture/${captureId}/submit`;

  const browser = await browserType.launch({ headless: !args.headed });

  try {
    const context = await browser.newContext(contextOptions);
    const page = await context.newPage();

    await page.route('**/*', async (route) => {
      const response = await route.fetch();
      const headers = { ...response.headers() };
      delete headers['content-security-policy'];
      delete headers['content-security-policy-report-only'];
      await route.fulfill({ response, headers });
    });

    await page.goto(url, { waitUntil, timeout });
    await page.waitForTimeout(settleMs);

    const captureScript = await context.request.get(FIGMA_CAPTURE_SCRIPT_URL);
    if (!captureScript.ok()) {
      throw new Error(`Failed to fetch capture script: ${captureScript.status()} ${captureScript.statusText()}`);
    }

    await page.addScriptTag({ content: await captureScript.text() });
    await page.waitForTimeout(1000);

    const result = await page.evaluate(async ({ captureId: currentCaptureId, endpoint: currentEndpoint, selector: currentSelector }) => {
      if (!window.figma || typeof window.figma.captureForDesign !== 'function') {
        throw new Error('window.figma.captureForDesign is unavailable after script injection.');
      }

      if (document.fonts?.ready) {
        try {
          await document.fonts.ready;
        } catch {
          // Font readiness should not block literal capture.
        }
      }

      return window.figma.captureForDesign({
        captureId: currentCaptureId,
        endpoint: currentEndpoint,
        selector: currentSelector,
      });
    }, { captureId, endpoint, selector });

    console.log(JSON.stringify({
      ok: true,
      url,
      captureId,
      endpoint,
      selector,
      device: args.device || null,
      width: contextOptions.viewport?.width ?? null,
      height: contextOptions.viewport?.height ?? null,
      waitUntil,
      settleMs,
      result,
    }, null, 2));
  } finally {
    await browser.close();
  }
}

main().catch((error) => {
  console.error(`figma:capture:external failed: ${error.message}`);
  process.exit(1);
});
