// ╔══════════════════════════════════════════════════════════════════════════════╗
// ║                           CV SCROLL TYPOGRAPHY                               ║
// ║                                                                              ║
// ║  Simplified: No more line-by-line scroll effects. Blur is now handled by     ║
// ║  two fixed gradient bars (top and bottom) in CSS. This module is a no-op.    ║
// ╚══════════════════════════════════════════════════════════════════════════════╝

export function initCvScrollTypography() {
  // No-op: scroll blur is now handled by fixed gradient bars in CSS
  return {
    rebuild() {},
    destroy() {},
  };
}

