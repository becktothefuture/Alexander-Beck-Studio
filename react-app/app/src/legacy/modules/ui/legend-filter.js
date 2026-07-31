// ╔══════════════════════════════════════════════════════════════════════════════╗
// ║                           LEGEND TOOLTIP SYSTEM                              ║
// ║  Purpose:                                                                   ║
// ║  - Provide click-to-toggle tooltips (writes to #legend-tooltip-output)       ║
// ║  - On mobile, route tapped legend detail into the home right-hand copy       ║
// ║  - Expose a no-op `window.legendFilter.syncAllBalls()` for backwards compat  ║
// ╚══════════════════════════════════════════════════════════════════════════════╝

/**
 * Initialize legend tooltip system.
 *
 * Notes:
 * - This runs once at startup.
 * - It is safe in production: no panel dependencies, no dev-only behavior.
 * - Click on label toggles tooltip; click outside closes it.
 */
export function initLegendFilterSystem() {
  // Expose no-op sync hook for backwards compatibility with mode-controller.
  try {
    if (typeof window !== 'undefined') {
      if (!window.legendFilter) window.legendFilter = {};
      window.legendFilter.syncAllBalls = () => {}; // No-op (filtering removed)
    }
  } catch (e) {}

  let dispose = () => {};

  // Attach tooltip behavior.
  try {
    let legend = document.getElementById('expertise-legend');
    let tooltipOutput = document.getElementById('legend-tooltip-output');
    let detailsStatus = document.getElementById('legend-details-status');
    if (!legend) return dispose;

    const tooltipOriginalParent = tooltipOutput?.parentNode || null;
    const tooltipOriginalNextSibling = tooltipOutput?.nextSibling || null;

    // Move tooltip to body so position:fixed is viewport-relative (not affected by parent transform/scroll).
    if (tooltipOutput && tooltipOutput.parentNode !== document.body) {
      document.body.appendChild(tooltipOutput);
    }

    let legendItems = Array.from(legend.querySelectorAll('.legend__item'));
    let mobileDetailTarget = document.querySelector('.ui-top-right .decorative-script p');
    let originalMobileDetailNodes = mobileDetailTarget
      ? Array.from(mobileDetailTarget.childNodes)
      : [];
    let mobileDetailMedia = window.matchMedia?.('(max-width: 600px)') || null;
    let activeMobileDetailItem = null;
    let disposed = false;
    const itemClickHandlers = new Map();
    const TOOLTIP_GAP = 8;
    const TOOLTIP_MAX_WIDTH = 260;
    const VIEWPORT_PAD = 16;

    function shouldUseMobileDetail() {
      return !!mobileDetailTarget && !!mobileDetailMedia?.matches;
    }

    function setDetailsStatus(text = '') {
      if (detailsStatus) detailsStatus.textContent = String(text || '');
    }

    function setLegendActive(item) {
      for (const legendItem of legendItems) {
        const isActive = !!item && legendItem === item;
        legendItem.classList.toggle('legend__item--active', isActive);
        legendItem.setAttribute('aria-pressed', String(isActive));
      }
    }

    function positionTooltip(el, item) {
      const rect = item.getBoundingClientRect();
      let left = rect.left;
      const top = rect.bottom + TOOLTIP_GAP;
      const viewportW = document.documentElement.clientWidth;
      if (left + TOOLTIP_MAX_WIDTH + VIEWPORT_PAD > viewportW) {
        left = Math.max(VIEWPORT_PAD, viewportW - TOOLTIP_MAX_WIDTH - VIEWPORT_PAD);
      }
      if (left < VIEWPORT_PAD) left = VIEWPORT_PAD;
      el.style.left = `${left}px`;
      el.style.top = `${top}px`;
    }

    function hideTooltip() {
      if (tooltipOutput) tooltipOutput.classList.remove('is-visible');
      setDetailsStatus('');
      setLegendActive(null);
    }

    function hideMobileDetail() {
      if (mobileDetailTarget && activeMobileDetailItem) {
        activeMobileDetailItem = null;
        mobileDetailTarget.replaceChildren(...originalMobileDetailNodes);
        mobileDetailTarget.closest('.decorative-script')?.classList.remove('is-legend-detail-active');
      }
      setDetailsStatus('');
      setLegendActive(null);
    }

    function showTooltip(item) {
      const tooltipText = item.getAttribute('data-tooltip');
      if (!tooltipText || !tooltipOutput) return;
      tooltipOutput.textContent = tooltipText;
      positionTooltip(tooltipOutput, item);
      tooltipOutput.classList.add('is-visible');
      setDetailsStatus(tooltipText);
      setLegendActive(item);
    }

    function isTooltipOpenFor(item) {
      if (!tooltipOutput || !tooltipOutput.classList.contains('is-visible')) return false;
      return tooltipOutput.textContent === item.getAttribute('data-tooltip');
    }

    function showMobileDetail(item) {
      const tooltipText = item.getAttribute('data-tooltip');
      if (!tooltipText || !mobileDetailTarget) return;
      hideTooltip();
      activeMobileDetailItem = item;
      mobileDetailTarget.textContent = tooltipText;
      mobileDetailTarget.closest('.decorative-script')?.classList.add('is-legend-detail-active');
      setDetailsStatus(tooltipText);
      setLegendActive(item);
    }

    function handleDocumentClick(event) {
      if (!legend?.contains(event.target)) {
        hideTooltip();
        hideMobileDetail();
      }
    }

    function handleMobileDetailChange() {
      if (!shouldUseMobileDetail()) hideMobileDetail();
    }

    for (const item of legendItems) {
      if (!item) continue;

      item.classList.add('legend__item--interactive');

      const handleItemClick = (event) => {
        event.preventDefault();
        event.stopPropagation();
        if (shouldUseMobileDetail()) {
          if (activeMobileDetailItem === item) {
            hideMobileDetail();
          } else {
            showMobileDetail(item);
          }
          return;
        }

        hideMobileDetail();
        if (isTooltipOpenFor(item)) {
          hideTooltip();
        } else {
          showTooltip(item);
        }
      };
      itemClickHandlers.set(item, handleItemClick);
      item.addEventListener('click', handleItemClick);
    }

    document.addEventListener('click', handleDocumentClick);
    mobileDetailMedia?.addEventListener?.('change', handleMobileDetailChange);

    if (tooltipOutput) {
      tooltipOutput.classList.remove('is-visible');
    }
    setDetailsStatus('');
    setLegendActive(null);

    dispose = () => {
      if (disposed) return;
      disposed = true;

      hideTooltip();
      hideMobileDetail();
      for (const [item, handleItemClick] of itemClickHandlers) {
        item.removeEventListener('click', handleItemClick);
        item.classList.remove('legend__item--interactive', 'legend__item--active');
      }
      itemClickHandlers.clear();
      document.removeEventListener('click', handleDocumentClick);
      mobileDetailMedia?.removeEventListener?.('change', handleMobileDetailChange);

      if (tooltipOutput?.parentNode === document.body) {
        if (tooltipOriginalParent?.isConnected) {
          tooltipOriginalParent.insertBefore(
            tooltipOutput,
            tooltipOriginalNextSibling?.parentNode === tooltipOriginalParent
              ? tooltipOriginalNextSibling
              : null,
          );
        } else {
          tooltipOutput.remove();
        }
      }

      legendItems.length = 0;
      originalMobileDetailNodes.length = 0;
      activeMobileDetailItem = null;
      legend = null;
      tooltipOutput = null;
      detailsStatus = null;
      mobileDetailTarget = null;
      mobileDetailMedia = null;
    };
  } catch (e) {
    // Never allow legend setup to crash boot.
  }
  return dispose;
}
