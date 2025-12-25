// ╔══════════════════════════════════════════════════════════════════════════════╗
// ║                        PORTFOLIO BASE PATH UTILITIES                         ║
// ║         Resolves assets/data when hosted under /portfolio/page/              ║
// ╚══════════════════════════════════════════════════════════════════════════════╝

const DEFAULT_BASE = 'portfolio/page/';

export const PORTFOLIO_BASE =
  typeof window !== 'undefined' && window.PORTFOLIO_BASE
    ? window.PORTFOLIO_BASE
    : DEFAULT_BASE;

export function portfolioUrl(p = '') {
  if (!p) return '';
  // Absolute or protocol-relative URLs pass through
  if (/^(https?:)?\/\//i.test(p)) return p;
  // Already rooted paths (e.g., /portfolio/...) – leave as-is
  if (p.startsWith('/')) return p;
  // Otherwise resolve relative to the portfolio base
  return new URL(p, `${window.location.origin}/${PORTFOLIO_BASE}`).toString();
}

export function rewriteElementSrc(el) {
  if (!el) return;
  const src = el.getAttribute('src');
  if (src) el.setAttribute('src', portfolioUrl(src));
  const poster = el.getAttribute('poster');
  if (poster) el.setAttribute('poster', portfolioUrl(poster));
}
