// ╔══════════════════════════════════════════════════════════════════════════════╗
// ║                           APPLY RUNTIME TEXT (DOM)                            ║
// ║  Single source of truth: source/config/contents-home.json → window.__TEXT__   ║
// ║     Goal: apply ALL user-facing copy before fade-in (no pop-in)               ║
// ╚══════════════════════════════════════════════════════════════════════════════╝

import { getText } from '../utils/text-loader.js';

function setText(el, text) {
  if (!el) return;
  el.textContent = String(text ?? '');
}

function setAttr(el, name, value) {
  if (!el) return;
  if (value === undefined || value === null) return;
  try {
    el.setAttribute(name, String(value));
  } catch (e) {}
}

function applyMeta() {
  const title = getText('meta.title', '');
  if (title) document.title = title;

  const description = getText('meta.description', '');
  if (description) {
    const meta = document.querySelector('meta[name="description"]');
    if (meta) meta.setAttribute('content', description);
  }
}

function applyEdge() {
  setText(document.getElementById('edge-chapter-text'), getText('edge.chapterText', ''));
  const copyEl = document.querySelector('.edge-copyright__text');
  setText(copyEl, getText('edge.copyright', ''));
}

function applyLegend() {
  const nav = document.getElementById('expertise-legend');
  setAttr(nav, 'aria-label', getText('legend.ariaLabel', ''));

  const items = getText('legend.items', null);
  if (!Array.isArray(items) || !nav) return;

  const itemEls = nav.querySelectorAll('.legend__item');
  for (let i = 0; i < itemEls.length && i < items.length; i++) {
    const itemEl = itemEls[i];
    const label = items?.[i]?.label;
    const tooltip = items?.[i]?.tooltip;
    const colorClass = items?.[i]?.colorClass;

    const labelSpan = itemEl.querySelector('span');
    if (label && labelSpan) labelSpan.textContent = label;

    // Tooltips are driven by the data-tooltip attribute (used by legend-interactive.js).
    if (tooltip) itemEl.setAttribute('data-tooltip', tooltip);

    // Keep the legend dot color in sync with config (fallback HTML should still match).
    if (colorClass) {
      const dot = itemEl.querySelector('.circle');
      if (dot) {
        // Remove any existing bg-ball-* classes, then apply the configured one.
        const next = [];
        for (const cls of String(dot.className || '').split(/\s+/).filter(Boolean)) {
          if (!cls.startsWith('bg-ball-')) next.push(cls);
        }
        next.push(colorClass);
        dot.className = next.join(' ');
      }
    }
  }
}

function applyPhilosophy() {
  // Only apply on pages that actually include the decorative-script block (index).
  const p = document.querySelector('.decorative-script p');
  if (!p) return;

  const before = getText('philosophy.textBeforeLink', '');
  const linkId = getText('philosophy.link.id', 'contact-email-inline') || 'contact-email-inline';
  const linkHref = getText('philosophy.link.href', '#') || '#';
  const linkText = getText('philosophy.link.text', '') || '';

  let link = document.getElementById(linkId);
  if (!link) link = p.querySelector('a');
  if (!link) return;

  // Ensure correct id/href/text
  link.id = linkId;
  link.setAttribute('href', linkHref);
  link.textContent = linkText;

  // Ensure the text before the link is a single text node directly before the <a>
  const prev = link.previousSibling;
  if (prev && prev.nodeType === Node.TEXT_NODE) {
    prev.nodeValue = before;
  } else {
    p.insertBefore(document.createTextNode(before), link);
  }

  // Remove stray text nodes after link to avoid drift.
  const next = link.nextSibling;
  if (next && next.nodeType === Node.TEXT_NODE) {
    next.nodeValue = '';
  }
}

function applyFooter() {
  const nav = document.getElementById('main-links');
  setAttr(nav, 'aria-label', getText('footer.navAriaLabel', ''));

  const links = getText('footer.links', null);
  if (!links || typeof links !== 'object') return;

  for (const key of ['contact', 'portfolio', 'cv']) {
    const entry = links?.[key];
    if (!entry) continue;
    const el = document.getElementById(entry.id || '');
    if (!el) continue;
    if (entry.href) el.setAttribute('href', entry.href);
    if (entry.text) el.textContent = entry.text;
  }
}

function applySocials() {
  const ul = document.getElementById('social-links');
  setAttr(ul, 'aria-label', getText('socials.ariaLabel', ''));

  const items = getText('socials.items', null);
  if (!ul || !items || typeof items !== 'object') return;

  const order = ['appleMusic', 'x', 'linkedin'];
  const anchors = ul.querySelectorAll('a.footer_icon-link');

  for (let i = 0; i < anchors.length && i < order.length; i++) {
    const a = anchors[i];
    const cfg = items?.[order[i]];
    if (!cfg) continue;
    if (cfg.url) a.setAttribute('href', cfg.url);
    if (cfg.ariaLabel) a.setAttribute('aria-label', cfg.ariaLabel);

    const sr = a.querySelector('.screen-reader');
    if (sr && cfg.screenReaderText) sr.textContent = cfg.screenReaderText;
  }
}

function applyHeaderCvLink() {
  // Reuse footer.links.cv as the single source of truth for the Bio/CV label + href.
  const link = document.getElementById('header-cv-link');
  if (!link) return;

  const entry = getText('footer.links.cv', null);
  if (!entry || typeof entry !== 'object') return;

  if (entry.href) link.setAttribute('href', entry.href);
  if (entry.text) link.textContent = entry.text;
}

function applyPortfolioBlurb() {
  // Only applies on portfolio UI pages.
  const p = document.querySelector('[data-portfolio-ui] .decorative-script p');
  if (!p) return;
  const text = getText('portfolio.blurb', '');
  if (text) {
    p.textContent = text;
  }
}

/**
 * Apply runtime text to all user-facing DOM nodes.
 * Must be called AFTER `loadRuntimeText()` and BEFORE fade-in starts.
 */
export function applyRuntimeTextToDOM() {
  try {
    applyMeta();
    applyEdge();
    applyLegend();
    applyPhilosophy();
    applyFooter();
    applySocials();
    applyHeaderCvLink();
    applyPortfolioBlurb();
  } catch (e) {
    // Never allow copy application to crash boot.
  }
}

