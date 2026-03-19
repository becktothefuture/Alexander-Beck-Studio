// ╔══════════════════════════════════════════════════════════════════════════════╗
// ║ DEV CONFIG PANEL BRIDGE                                                      ║
// ║ React: dev-only `setupKeyboardShortcuts()` so `/` works on every SPA route.  ║
// ║ The only settings UI is `panel-dock.js` (same dock on home/portfolio/CV).  ║
// ╚══════════════════════════════════════════════════════════════════════════════╝

import { useEffect } from 'react';

export function DevConfigPanelBridge() {
  useEffect(() => {
    if (!import.meta.env?.DEV) return undefined;

    let cancelled = false;
    import('../../legacy/modules/ui/keyboard.js').then((mod) => {
      if (!cancelled) mod.setupKeyboardShortcuts?.();
    }).catch(() => {});

    return () => {
      cancelled = true;
    };
  }, []);

  return null;
}
