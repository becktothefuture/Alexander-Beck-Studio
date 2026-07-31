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
  } catch (e) {
    // Ignore optional attribute writes that the host element rejects.
  }
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

    // Tooltips are driven by the data-tooltip attribute consumed by legend UI styles/behavior.
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
  const mobileBefore = getText('philosophy.mobileTextBeforeLink', before) || before;
  const beforeWithGap = before ? `${String(before).replace(/\s+$/, '')} ` : '';
  const linkText = getText('philosophy.link.text', '') || '';

  const link = p.querySelector('a');
  if (!link) return;

  // React owns link identity and route destination; content owns only the label.
  link.textContent = linkText;

  const fullCopy = p.querySelector('.home-philosophy-copy--full');
  const mobileCopy = p.querySelector('.home-philosophy-copy--mobile');
  if (fullCopy && mobileCopy) {
    setText(fullCopy, before);
    setText(mobileCopy, mobileBefore);
    for (const node of Array.from(p.childNodes)) {
      if (node.nodeType === Node.TEXT_NODE) p.removeChild(node);
    }
    p.insertBefore(document.createTextNode(' '), link);
    return;
  }

  // Ensure the text before the link is exactly one text node directly before the <a>.
  for (const node of Array.from(p.childNodes)) {
    if (node !== link && node.nodeType === Node.TEXT_NODE) {
      p.removeChild(node);
    }
  }
  p.insertBefore(document.createTextNode(beforeWithGap), link);

  // Remove stray text nodes after link to avoid drift.
  const next = link.nextSibling;
  if (next && next.nodeType === Node.TEXT_NODE) {
    next.nodeValue = '';
  }
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
    applyLegend();
    applyPhilosophy();
    applyPortfolioBlurb();
  } catch (e) {
    // Never allow copy application to crash boot.
  }
}
