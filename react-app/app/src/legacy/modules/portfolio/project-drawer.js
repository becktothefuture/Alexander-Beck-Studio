import { resolvePortfolioLabelContent } from './pit-mode.js';

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function computeDrawerMediaScrollShiftY(mediaRect, scrollerRect) {
  const scrollHeight = scrollerRect.height;
  if (!(scrollHeight > 1)) return 0;
  const band = scrollHeight + mediaRect.height * 0.9;
  const raw = (scrollerRect.bottom - mediaRect.top) / band;
  const progress = clamp(raw, 0, 1);
  const neutral = 0.4;
  return (neutral - progress) * 20;
}

function getVideoMimeType(src) {
  if (src.endsWith('.webm')) return 'video/webm';
  if (src.endsWith('.mp4')) return 'video/mp4';
  return '';
}

export function getProjectContentBlocks(project) {
  if (Array.isArray(project?.contentBlocks) && project.contentBlocks.length) {
    return project.contentBlocks;
  }
  if (Array.isArray(project?.gallery) && project.gallery.length) {
    return project.gallery.map((src) => ({ type: 'image', src }));
  }
  return [];
}

function hashString(value) {
  let hash = 2166136261;
  const input = String(value || 'portfolio');
  for (let index = 0; index < input.length; index += 1) {
    hash ^= input.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function createKenBurnsSequence(project) {
  const seed = hashString(`${project?.title || ''}|${project?.image || ''}|${project?.client || ''}`);
  const xOffsets = [-18, -14, -10, -6, 6, 10, 14, 18];
  const yOffsets = [-18, -13, -8, -4, 4, 8, 13, 18];
  const scales = [1, 1.08, 1.14, 1.22, 1.3];
  const pick = (list, shift) => list[(seed >>> shift) % list.length];
  const durationMs = 10000 + ((seed >> 9) % 5001);
  return {
    durationMs,
    points: [
      { x: pick(xOffsets, 0), y: pick(yOffsets, 3), scale: scales[0] },
      { x: pick(xOffsets, 6), y: pick(yOffsets, 9), scale: pick(scales.slice(1, 4), 12) },
      { x: pick(xOffsets, 15), y: pick(yOffsets, 18), scale: pick(scales.slice(2), 21) },
      { x: pick(xOffsets, 24), y: pick(yOffsets, 27), scale: pick(scales.slice(1, 4), 4) },
    ],
  };
}

function createProjectDrawerMarkup() {
  return `
    <section
      id="portfolioProjectView"
      class="portfolio-project-view"
      aria-hidden="true"
      role="dialog"
      aria-modal="true"
      aria-labelledby="portfolioProjectEyebrow portfolioProjectTitle"
    >
      <div class="portfolio-project-view__backdrop" aria-hidden="true"></div>
      <div class="portfolio-project-view__drawer">
        <button class="portfolio-project-view__close abs-icon-btn" type="button" aria-label="Close project">
          <svg class="portfolio-project-view__close-icon" viewBox="0 0 24 24" width="24" height="24" aria-hidden="true" focusable="false">
            <path
              fill="currentColor"
              d="M6.22 4.93 12 10.71l5.78-5.78 1.29 1.29L13.29 12l5.78 5.78-1.29 1.29L12 13.29l-5.78 5.78-1.29-1.29L10.71 12 4.93 6.22z"
            />
          </svg>
        </button>
        <div class="portfolio-project-view__scroll">
          <section class="portfolio-project-view__hero">
            <div class="portfolio-project-view__image-shell">
              <div class="portfolio-project-view__image-motion">
                <img class="portfolio-project-view__image" alt="" loading="eager" />
              </div>
              <div class="portfolio-project-view__image-veil" aria-hidden="true"></div>
            </div>
            <div class="portfolio-project-view__hero-copy">
              <p id="portfolioProjectEyebrow" class="portfolio-project-view__eyebrow"></p>
              <h1 id="portfolioProjectTitle" class="portfolio-project-view__title"></h1>
              <p class="portfolio-project-view__scroll-hint">(scroll please)</p>
            </div>
          </section>
          <section class="portfolio-project-view__body">
            <div class="portfolio-project-view__body-inner" id="portfolioProjectContent"></div>
          </section>
        </div>
      </div>
    </section>
  `;
}

export class PortfolioProjectDrawer {
  constructor({ host, resolveAsset, coverFallback, onRequestClose }) {
    this.host = host;
    this.resolveAsset = resolveAsset;
    this.coverFallback = coverFallback;
    this.onRequestClose = onRequestClose;
    this.root = null;
    this.backdrop = null;
    this.drawer = null;
    this.scroll = null;
    this.imageMotion = null;
    this.image = null;
    this.eyebrow = null;
    this.title = null;
    this.content = null;
    this.closeButton = null;
    this.openTimers = [];
    this.closeFallbackTimer = null;
    this.mediaShiftRaf = null;
    this.boundScheduleDrawerMediaScrollShift = () => this.scheduleDrawerMediaScrollShift();
    this.boundRequestClose = (event) => {
      if (event?.type === 'pointerdown' && event.target !== this.backdrop) return;
      event?.stopPropagation?.();
      this.onRequestClose?.(event);
    };
    this.boundTransitionEnd = (event) => {
      if (event.target !== this.drawer) return;
      if (event.propertyName !== 'transform') return;
      if (!this.root?.classList.contains('is-closing')) return;
      this.completeClose();
    };
  }

  mount() {
    if (!this.host) return null;
    const existing = document.getElementById('portfolioProjectView');
    if (existing) existing.remove();
    this.host.insertAdjacentHTML('beforeend', createProjectDrawerMarkup());
    this.root = document.getElementById('portfolioProjectView');
    this.backdrop = this.root?.querySelector('.portfolio-project-view__backdrop') || null;
    this.drawer = this.root?.querySelector('.portfolio-project-view__drawer') || null;
    this.scroll = this.root?.querySelector('.portfolio-project-view__scroll') || null;
    this.imageMotion = this.root?.querySelector('.portfolio-project-view__image-motion') || null;
    this.image = this.root?.querySelector('.portfolio-project-view__image') || null;
    this.eyebrow = this.root?.querySelector('.portfolio-project-view__eyebrow') || null;
    this.title = this.root?.querySelector('.portfolio-project-view__title') || null;
    this.content = this.root?.querySelector('#portfolioProjectContent') || null;
    this.closeButton = this.root?.querySelector('.portfolio-project-view__close') || null;
    this.closeButton?.addEventListener('click', this.boundRequestClose);
    this.backdrop?.addEventListener('pointerdown', this.boundRequestClose);
    this.setupMediaScrollShift();
    return this.root;
  }

  setupMediaScrollShift() {
    this.teardownMediaScrollShift();
    if (!this.scroll) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    this.scroll.addEventListener('scroll', this.boundScheduleDrawerMediaScrollShift, { passive: true });
  }

  teardownMediaScrollShift() {
    if (this.mediaShiftRaf != null) {
      cancelAnimationFrame(this.mediaShiftRaf);
      this.mediaShiftRaf = null;
    }
    this.scroll?.removeEventListener('scroll', this.boundScheduleDrawerMediaScrollShift, { passive: true });
  }

  scheduleDrawerMediaScrollShift() {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    if (this.mediaShiftRaf != null) return;
    this.mediaShiftRaf = window.requestAnimationFrame(() => {
      this.mediaShiftRaf = null;
      this.updateDrawerMediaScrollShift();
    });
  }

  updateDrawerMediaScrollShift() {
    if (!this.scroll) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const scrollRect = this.scroll.getBoundingClientRect();
    const mediaNodes = this.scroll.querySelectorAll('.portfolio-project-view__block img, .portfolio-project-view__block video');
    for (let index = 0; index < mediaNodes.length; index += 1) {
      const node = mediaNodes[index];
      const mediaRect = node.getBoundingClientRect();
      const translateY = computeDrawerMediaScrollShiftY(mediaRect, scrollRect);
      node.style.transform = `translate3d(0, ${translateY.toFixed(2)}px, 0)`;
    }
  }

  resetMediaTransforms() {
    if (!this.scroll) return;
    const mediaNodes = this.scroll.querySelectorAll('.portfolio-project-view__block img, .portfolio-project-view__block video');
    for (let index = 0; index < mediaNodes.length; index += 1) {
      mediaNodes[index].style.transform = '';
    }
  }

  clearOpenTimers() {
    while (this.openTimers.length) {
      window.clearTimeout(this.openTimers.pop());
    }
  }

  resetScrollTop() {
    if (!this.scroll) return;
    this.scroll.scrollTop = 0;
  }

  applyKenBurnsMotion(project) {
    if (!this.imageMotion) return;
    const sequence = createKenBurnsSequence(project);
    this.imageMotion.style.setProperty('--portfolio-kb-duration', `${sequence.durationMs}ms`);
    sequence.points.forEach((point, index) => {
      this.imageMotion.style.setProperty(`--portfolio-kb-x-${index}`, `${point.x}px`);
      this.imageMotion.style.setProperty(`--portfolio-kb-y-${index}`, `${point.y}px`);
      this.imageMotion.style.setProperty(`--portfolio-kb-scale-${index}`, point.scale.toFixed(3));
    });
  }

  buildProjectContent(project) {
    const blocks = getProjectContentBlocks(project);
    const links = Array.isArray(project?.links) ? project.links : [];
    const takeaways = Array.isArray(project?.takeaways) ? project.takeaways : [];

    const linksHtml = links.length
      ? `
        <div class="portfolio-project-view__links">
          ${links.map((link) => `
            <a href="${escapeHtml(link.url)}" target="_blank" rel="noopener noreferrer">
              ${escapeHtml(link.label)}
              <i class="ti ti-external-link" aria-hidden="true"></i>
            </a>
          `).join('')}
        </div>`
      : '';

    const blocksHtml = blocks.map((block) => {
      if (block.type === 'video') {
        const src = this.resolveAsset(block.src);
        const type = getVideoMimeType(src);
        const autoplay = window.matchMedia('(prefers-reduced-motion: reduce)').matches ? '' : 'autoplay';
        return `
          <figure class="portfolio-project-view__block portfolio-project-view__block--video">
            <video ${autoplay} muted loop playsinline preload="metadata" controls>
              <source src="${src}"${type ? ` type="${type}"` : ''}>
            </video>
            ${block.caption ? `<figcaption>${escapeHtml(block.caption)}</figcaption>` : ''}
          </figure>
        `;
      }
      if (block.type === 'text') {
        return `<div class="portfolio-project-view__block portfolio-project-view__block--text"><p>${escapeHtml(block.text)}</p></div>`;
      }
      return `
        <figure class="portfolio-project-view__block">
          <img src="${this.resolveAsset(block.src)}" alt="${escapeHtml(block.alt || project?.title || 'Project image')}" loading="lazy">
          ${block.caption ? `<figcaption>${escapeHtml(block.caption)}</figcaption>` : ''}
        </figure>
      `;
    }).join('');

    const takeawayHtml = takeaways.length
      ? `
        <section class="portfolio-project-view__takeaways">
          <h2>Personal takeaways</h2>
          <ul>${takeaways.map((item) => `<li>${escapeHtml(item)}</li>`).join('')}</ul>
        </section>
      `
      : '';

    return `
      <div class="portfolio-project-view__summary">
        <p>${escapeHtml(project?.summary || '')}</p>
      </div>
      ${project?.overview ? `
        <section class="portfolio-project-view__overview">
          <h2>Overview</h2>
          <p>${escapeHtml(project.overview)}</p>
        </section>
      ` : ''}
      ${linksHtml}
      <section class="portfolio-project-view__stack">
        ${blocksHtml}
      </section>
      ${takeawayHtml}
    `;
  }

  syncProject(project, options = {}) {
    if (!this.root || !project) return;
    const {
      animate = true,
      openDurationMs = 420,
      imageFadeMs = 220,
      titleDelayMs = 280,
    } = options;
    const labelContent = resolvePortfolioLabelContent(project, project?.title || 'Project');
    const spokenLabel = labelContent.eyebrow
      ? `${labelContent.eyebrow}: ${labelContent.title}`
      : labelContent.title;

    this.root.style.setProperty('--portfolio-project-open-ms', `${openDurationMs}ms`);
    this.root.style.setProperty('--portfolio-project-image-fade-ms', `${imageFadeMs}ms`);
    this.root.style.setProperty('--portfolio-project-title-delay-ms', `${titleDelayMs}ms`);

    if (this.image) {
      this.image.src = this.resolveAsset(project.image || this.coverFallback);
      this.image.alt = spokenLabel ? `${spokenLabel} cover` : 'Project cover';
      this.image.addEventListener('load', () => {
        this.scheduleDrawerMediaScrollShift();
      }, { once: true });
    }
    this.applyKenBurnsMotion(project);
    if (this.eyebrow) {
      this.eyebrow.textContent = labelContent.eyebrow || '';
      this.eyebrow.hidden = !labelContent.eyebrow;
    }
    if (this.title) this.title.textContent = labelContent.title || '';
    this.root.setAttribute('aria-labelledby', labelContent.eyebrow
      ? 'portfolioProjectEyebrow portfolioProjectTitle'
      : 'portfolioProjectTitle');
    if (this.content) this.content.innerHTML = this.buildProjectContent(project);
    this.scheduleDrawerMediaScrollShift();

    this.clearOpenTimers();
    this.root.classList.remove('is-closing');
    this.root.classList.add('is-visible');
    this.root.setAttribute('aria-hidden', 'false');
    this.resetScrollTop();

    if (!animate || window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      this.root.classList.add('is-open', 'is-title-visible');
      return;
    }

    this.root.classList.remove('is-open', 'is-title-visible');
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        this.root?.classList.add('is-open');
      });
    });
    this.openTimers.push(window.setTimeout(() => {
      this.root?.classList.add('is-title-visible');
    }, titleDelayMs));
  }

  beginClose({ reducedMotion = false, durationMs = 420, onComplete } = {}) {
    if (!this.root) return;
    this.clearOpenTimers();
    this.drawer?.removeEventListener('transitionend', this.boundTransitionEnd);
    this.drawer?.addEventListener('transitionend', this.boundTransitionEnd);
    this.root.classList.remove('is-title-visible');
    this.onCloseComplete = onComplete;

    if (reducedMotion || !this.drawer) {
      this.completeClose();
      return;
    }

    this.root.classList.add('is-closing');
    this.root.classList.remove('is-open');
    this.closeFallbackTimer = window.setTimeout(() => {
      this.closeFallbackTimer = null;
      if (this.root?.classList.contains('is-closing')) this.completeClose();
    }, durationMs + 200);
  }

  completeClose() {
    if (!this.root) return;
    this.resetMediaTransforms();
    if (this.closeFallbackTimer !== null) {
      window.clearTimeout(this.closeFallbackTimer);
      this.closeFallbackTimer = null;
    }
    this.drawer?.removeEventListener('transitionend', this.boundTransitionEnd);
    this.root.classList.remove('is-visible', 'is-closing', 'is-open', 'is-title-visible');
    this.root.setAttribute('aria-hidden', 'true');
    const onComplete = this.onCloseComplete;
    this.onCloseComplete = null;
    onComplete?.();
  }

  getFocusableElements() {
    if (!this.root) return [];
    return Array.from(this.root.querySelectorAll(
      'button:not([disabled]), a[href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
    )).filter((element) => !element.hasAttribute('disabled') && element.getAttribute('aria-hidden') !== 'true');
  }

  destroy() {
    this.clearOpenTimers();
    this.teardownMediaScrollShift();
    if (this.closeFallbackTimer !== null) {
      window.clearTimeout(this.closeFallbackTimer);
      this.closeFallbackTimer = null;
    }
    this.closeButton?.removeEventListener('click', this.boundRequestClose);
    this.backdrop?.removeEventListener('pointerdown', this.boundRequestClose);
    this.drawer?.removeEventListener('transitionend', this.boundTransitionEnd);
    this.root?.remove();
    this.root = null;
    this.backdrop = null;
    this.drawer = null;
    this.scroll = null;
    this.imageMotion = null;
    this.image = null;
    this.eyebrow = null;
    this.title = null;
    this.content = null;
    this.closeButton = null;
  }
}
