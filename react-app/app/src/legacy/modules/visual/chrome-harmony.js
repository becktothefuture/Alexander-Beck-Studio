// ╔══════════════════════════════════════════════════════════════════════════════╗
// ║                  BROWSER ↔ FRAME CHROME HARMONY                              ║
// ║     Browser family, display gamut, and site theme cannot alter the frame     ║
// ╚══════════════════════════════════════════════════════════════════════════════╝

import {
  applyFrameChromePalette,
  applyShellPalette,
  detectBrowserFamily,
  getShellConfig,
  resolveShellPalette,
  resolveSiteFramePalette,
} from './site-shell.js';
import { resolveOuterFramePolicy } from './outer-shell-policy.js';

/**
 * Browser/OS scheme is independent from the manual studio-window theme.
 */
export function resolveBrowserChromeIsDark() {
  return Boolean(window.matchMedia?.('(prefers-color-scheme: dark)').matches);
}

export function applyChromeHarmony() {
  const shellConfig = getShellConfig();
  const family = detectBrowserFamily();
  const browserIsDark = resolveBrowserChromeIsDark();
  const authoredFrame = resolveSiteFramePalette().active;
  const framePolicy = resolveOuterFramePolicy({ authoredFrame });

  applyShellPalette(resolveShellPalette(shellConfig));
  applyFrameChromePalette({ active: framePolicy.active });

  return {
    mode: 'auto',
    family,
    browserIsDark,
    source: framePolicy.source,
  };
}
