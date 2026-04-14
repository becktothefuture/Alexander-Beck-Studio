/**
 * Serial strict transition gate:
 * - chromium strict pass
 * - webkit strict pass
 *
 * Runs sequentially (never parallel) to keep audits deterministic.
 */
import { spawn } from 'node:child_process';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const transitionAuditScript = resolve(__dirname, 'audit-transition-flows.mjs');
const BROWSERS = ['chromium', 'webkit'];

function runAuditForBrowser(browser) {
  return new Promise((resolveRun) => {
    const env = {
      ...process.env,
      ABS_BROWSER: browser,
      ABS_TRANSITION_STRICT_RAF: '1',
    };

    console.log(`[transition-gate] starting ${browser} strict run`);
    const child = spawn(process.execPath, [transitionAuditScript], {
      stdio: 'inherit',
      env,
    });

    child.on('exit', (code, signal) => {
      if (signal) {
        resolveRun({ browser, ok: false, code: 1, signal });
        return;
      }
      resolveRun({ browser, ok: code === 0, code: code ?? 1, signal: null });
    });
  });
}

async function main() {
  const results = [];
  for (const browser of BROWSERS) {
    const result = await runAuditForBrowser(browser);
    results.push(result);
    if (!result.ok) {
      console.error(`[transition-gate] ${browser} strict run failed`);
    } else {
      console.log(`[transition-gate] ${browser} strict run passed`);
    }
  }

  const failed = results.filter((result) => !result.ok);
  if (failed.length > 0) {
    const summary = failed
      .map((result) => `${result.browser} (code=${result.code}${result.signal ? ` signal=${result.signal}` : ''})`)
      .join(', ');
    console.error(`[transition-gate] FAIL: ${summary}`);
    process.exit(1);
  }

  console.log('[transition-gate] PASS: chromium + webkit strict runs passed serially');
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
