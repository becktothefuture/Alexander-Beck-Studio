import { resolvePortfolioLabelContent } from './portfolio-content.js';
import { createScrollPresence } from '../utils/scroll-presence.js';

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function toNumber(value, fallback) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : fallback;
}

function parseColorToRgb(value) {
  const input = String(value || '').trim();
  if (!input) return null;
  if (input.startsWith('#')) {
    const hex = input.slice(1);
    const normalized = hex.length === 3
      ? hex.split('').map((part) => `${part}${part}`).join('')
      : hex.padEnd(6, '0').slice(0, 6);
    const int = Number.parseInt(normalized, 16);
    if (!Number.isFinite(int)) return null;
    return {
      r: (int >> 16) & 255,
      g: (int >> 8) & 255,
      b: int & 255,
    };
  }
  const match = input.match(/^rgba?\(([^)]+)\)$/i);
  if (!match) return null;
  const parts = match[1].split(',').map((part) => Number.parseFloat(part.trim()));
  if (parts.length < 3 || parts.slice(0, 3).some((part) => !Number.isFinite(part))) return null;
  return {
    r: clamp(parts[0], 0, 255),
    g: clamp(parts[1], 0, 255),
    b: clamp(parts[2], 0, 255),
  };
}

function rgbToHsl({ r, g, b }) {
  const red = r / 255;
  const green = g / 255;
  const blue = b / 255;
  const max = Math.max(red, green, blue);
  const min = Math.min(red, green, blue);
  const lightness = (max + min) / 2;
  const delta = max - min;
  if (delta === 0) return { h: 0, s: 0, l: lightness };

  const saturation = lightness > 0.5
    ? delta / (2 - max - min)
    : delta / (max + min);

  let hue;
  switch (max) {
    case red:
      hue = ((green - blue) / delta) + (green < blue ? 6 : 0);
      break;
    case green:
      hue = ((blue - red) / delta) + 2;
      break;
    default:
      hue = ((red - green) / delta) + 4;
      break;
  }

  return { h: hue * 60, s: saturation, l: lightness };
}

function buildCueColor(sampleRgb, fallbackColor) {
  const fallbackRgb = parseColorToRgb(fallbackColor);
  const sampleHsl = sampleRgb ? rgbToHsl(sampleRgb) : null;
  const fallbackHsl = fallbackRgb ? rgbToHsl(fallbackRgb) : null;
  const hue = sampleHsl && sampleHsl.s >= 0.12
    ? sampleHsl.h
    : (fallbackHsl ? fallbackHsl.h : 32);
  const saturation = clamp(
    Math.max(sampleHsl?.s || 0, fallbackHsl?.s || 0, 0.56),
    0.56,
    0.84
  );
  let lightness = sampleHsl?.l ?? fallbackHsl?.l ?? 0.66;
  if (lightness < 0.36) {
    lightness = 0.7;
  } else if (lightness > 0.76) {
    lightness = 0.42;
  } else {
    lightness = clamp(lightness + 0.08, 0.44, 0.72);
  }
  return `var(--color-detected-hslmathroundhue)}deg ${Math.round(saturation * 100)}% ${Math.round(lightness * 100)}%)`;
}

function sampleImageCueColor(image) {
  if (!(image instanceof HTMLImageElement)) return null;
  if (!(image.naturalWidth > 0) || !(image.naturalHeight > 0)) return null;
  try {
    const canvas = document.createElement('canvas');
    canvas.width = 24;
    canvas.height = 24;
    const context = canvas.getContext('2d', { willReadFrequently: true });
    if (!context) return null;

    const sourceWidth = Math.max(1, Math.round(image.naturalWidth * 0.42));
    const sourceHeight = Math.max(1, Math.round(image.naturalHeight * 0.32));
    const sourceX = Math.max(0, Math.round((image.naturalWidth - sourceWidth) * 0.5));
    const sourceY = Math.max(0, Math.round(image.naturalHeight * 0.12));
    context.drawImage(image, sourceX, sourceY, sourceWidth, sourceHeight, 0, 0, canvas.width, canvas.height);

    const { data } = context.getImageData(0, 0, canvas.width, canvas.height);
    let red = 0;
    let green = 0;
    let blue = 0;
    let weight = 0;
    for (let index = 0; index < data.length; index += 4) {
      const alpha = data[index + 3] / 255;
      if (alpha <= 0) continue;
      red += data[index] * alpha;
      green += data[index + 1] * alpha;
      blue += data[index + 2] * alpha;
      weight += alpha;
    }
    if (weight <= 0) return null;
    return {
      r: red / weight,
      g: green / weight,
      b: blue / weight,
    };
  } catch (error) {
    return null;
  }
}

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function buildChapterProseMarkup(title, body) {
  const highlightedTitle = title
    ? `<span class="portfolio-project-view__prose-highlight">${escapeHtml(title)}</span>`
    : '';
  const bodyCopy = body ? escapeHtml(body) : '';
  return [highlightedTitle, bodyCopy].filter(Boolean).join(' ');
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

function resolveBlockAspectRatio(block) {
  const aspectValue = String(block?.layout?.aspect || '').trim().toLowerCase();
  if (aspectValue === 'auto') return '';
  if (aspectValue === '16:9') return '16 / 9';
  if (aspectValue === '4:3') return '4 / 3';
  if (aspectValue === '1:1') return '1 / 1';
  if (aspectValue === '3:2') return '3 / 2';
  if (aspectValue === '2:3') return '2 / 3';

  const customRatio = Number(block?.layout?.ratio);
  if (Number.isFinite(customRatio) && customRatio > 0) {
    return String(customRatio);
  }
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

function createKenBurnsSequence(project, motionConfig = {}) {
  const seed = hashString(`${project?.title || ''}|${project?.image || ''}|${project?.client || ''}`);
  const directionX = (seed & 1) === 0 ? -1 : 1;
  const directionY = (seed & 2) === 0 ? -1 : 1;
  const swayX = (seed & 4) === 0 ? -1 : 1;
  const swayY = (seed & 8) === 0 ? -1 : 1;
  const baseDurationMs = clamp(toNumber(motionConfig.heroKenBurnsDurationMs, 28000), 12000, 60000);
  const basePanPx = clamp(toNumber(motionConfig.heroKenBurnsPanPx, 18), 6, 36);
  const zoomPct = clamp(toNumber(motionConfig.heroKenBurnsZoomPct, 18), 6, 30);
  const spanVariance = 2 + ((seed >>> 4) % 5);
  const spanX = clamp(basePanPx - 2 + spanVariance, 6, 40);
  const spanY = clamp(Math.round(basePanPx * (0.55 + (((seed >>> 7) % 4) * 0.06))), 4, 32);
  const baseScale = 1.06 + (((seed >>> 10) % 4) * 0.02);
  const startScale = 1;
  const endScale = baseScale + (zoomPct / 100);
  const midScale = startScale + ((endScale - startScale) * 0.42);
  const settleScale = startScale + ((endScale - startScale) * 0.74);
  const durationMs = baseDurationMs + ((seed >>> 21) % 2501);
  return {
    durationMs,
    points: [
      {
        x: 0,
        y: 0,
        scale: Number(startScale.toFixed(3)),
      },
      {
        x: directionX * -Math.round(spanX * 0.36) + (swayX * 2),
        y: directionY * -Math.round(spanY * 0.42) + swayY,
        scale: Number(midScale.toFixed(3)),
      },
      {
        x: directionX * Math.round(spanX * 0.32) + (swayX * 3),
        y: directionY * Math.round(spanY * 0.26) + (swayY * 2),
        scale: Number(settleScale.toFixed(3)),
      },
      {
        x: directionX * Math.round(spanX * 0.82),
        y: directionY * Math.round(spanY * 0.74),
        scale: Number(endScale.toFixed(3)),
      },
    ],
  };
}

function createDetailImageKenBurnsSequence(project, blockSrc, imageOrdinal) {
  const seed = hashString(`${project?.title || ''}|${blockSrc || ''}|detail|${imageOrdinal}`);
  const directionX = (seed & 1) === 0 ? -1 : 1;
  const directionY = (seed & 2) === 0 ? -1 : 1;
  const spanX = 10 + ((seed >>> 3) % 7);
  const spanY = 6 + ((seed >>> 6) % 5);
  const startScale = 1.03 + (((seed >>> 9) % 3) * 0.015);
  const endScale = startScale + (0.08 + (((seed >>> 12) % 4) * 0.015));
  const midScale = startScale + ((endScale - startScale) * 0.46);
  const settleScale = startScale + ((endScale - startScale) * 0.74);
  const durationMs = 18000 + ((seed >>> 15) % 7001);
  return {
    durationMs,
    points: [
      { x: directionX * -spanX, y: directionY * -spanY, scale: Number(startScale.toFixed(3)) },
      {
        x: directionX * -Math.round(spanX * 0.34),
        y: directionY * -Math.round(spanY * 0.4),
        scale: Number(midScale.toFixed(3)),
      },
      {
        x: directionX * Math.round(spanX * 0.28),
        y: directionY * Math.round(spanY * 0.24),
        scale: Number(settleScale.toFixed(3)),
      },
      {
        x: directionX * Math.round(spanX * 0.72),
        y: directionY * Math.round(spanY * 0.66),
        scale: Number(endScale.toFixed(3)),
      },
    ],
  };
}

function buildKenBurnsStyleVars(sequence) {
  const vars = [`--portfolio-kb-duration:${sequence.durationMs}ms`];
  sequence.points.forEach((point, index) => {
    vars.push(`--portfolio-kb-x-${index}:${point.x}px`);
    vars.push(`--portfolio-kb-y-${index}:${point.y}px`);
    vars.push(`--portfolio-kb-scale-${index}:${point.scale.toFixed(3)}`);
  });
  return vars.join(';');
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
        <button
          class="portfolio-project-view__back portfolio-project-view__back--top gate-back abs-icon-btn"
          type="button"
          aria-label="Back to portfolio projects"
          data-portfolio-project-back
        >
          <i class="ti ti-arrow-left" aria-hidden="true"></i>
        </button>
        <div
          class="portfolio-project-view__scroll"
          data-scroll-presence-root
          tabindex="0"
          role="region"
          aria-label="Project details"
        >
          <section class="portfolio-project-view__hero">
            <div class="portfolio-project-view__image-shell">
              <div class="portfolio-project-view__image-motion">
                <img class="portfolio-project-view__image" alt="" loading="eager" />
              </div>
              <div class="portfolio-project-view__image-veil" aria-hidden="true"></div>
              <div class="portfolio-project-view__scroll-cue" aria-hidden="true">
                <i class="ti ti-arrow-left portfolio-project-view__scroll-cue-icon"></i>
              </div>
            </div>
            <div class="portfolio-project-view__hero-copy" data-scroll-presence data-scroll-presence-span="0.28">
              <p id="portfolioProjectEyebrow" class="portfolio-project-view__eyebrow"></p>
              <h1 id="portfolioProjectTitle" class="portfolio-project-view__title"></h1>
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
    this.imageShell = null;
    this.imageMotion = null;
    this.image = null;
    this.eyebrow = null;
    this.title = null;
    this.content = null;
    this.backButton = null;
    this.scrollPresence = null;
    this.openTimers = [];
    this.closeFallbackTimer = null;
    this.mediaShiftRaf = null;
    this.boundScheduleDrawerMediaScrollShift = () => this.scheduleDrawerMediaScrollShift();
    this.boundUpdateScrollState = () => this.updateScrollState();
    this.boundRequestClose = (event) => {
      if (event?.type === 'pointerdown' && event.target !== this.backdrop) return;
      event?.stopPropagation?.();
      this.onRequestClose?.(event);
    };
    this.boundBackClick = (event) => {
      if (!event.target?.closest?.('[data-portfolio-project-back]')) return;
      this.boundRequestClose(event);
    };
    this.boundTransitionEnd = (event) => {
      if (event.target !== this.drawer) return;
      if (event.propertyName !== 'opacity') return;
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
    this.imageShell = this.root?.querySelector('.portfolio-project-view__image-shell') || null;
    this.imageMotion = this.root?.querySelector('.portfolio-project-view__image-motion') || null;
    this.image = this.root?.querySelector('.portfolio-project-view__image') || null;
    this.eyebrow = this.root?.querySelector('.portfolio-project-view__eyebrow') || null;
    this.title = this.root?.querySelector('.portfolio-project-view__title') || null;
    this.content = this.root?.querySelector('#portfolioProjectContent') || null;
    this.backButton = this.root?.querySelector('.portfolio-project-view__back--top') || null;
    this.root?.addEventListener('click', this.boundBackClick);
    this.backdrop?.addEventListener('pointerdown', this.boundRequestClose);
    this.scroll?.addEventListener('scroll', this.boundUpdateScrollState, { passive: true });
    this.scrollPresence = this.scroll
      ? createScrollPresence(this.scroll, {
          defaultSpanRatio: 0.18,
          minSpanPx: 88,
          maxSpanPx: 220,
        })
      : null;
    this.setupMediaScrollShift();
    this.updateScrollState();
    return this.root;
  }

  updateScrollState() {
    this.root?.classList.toggle('is-scrolled', (this.scroll?.scrollTop || 0) > 16);
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

  getDrawerRect() {
    const rect = this.drawer?.getBoundingClientRect();
    if (!rect || !(rect.width > 0) || !(rect.height > 0)) return null;
    return rect;
  }

  getHeroImageRect() {
    const rect = this.imageShell?.getBoundingClientRect();
    if (!rect || !(rect.width > 0) || !(rect.height > 0)) return null;
    return rect;
  }

  getHeroImageShell() {
    return this.imageShell;
  }

  getTransitionMedia() {
    return {
      motion: this.imageMotion,
      image: this.image,
    };
  }

  getHeroVeil() {
    return this.root?.querySelector('.portfolio-project-view__image-veil') || null;
  }

  getHeroCopy() {
    return this.root?.querySelector('.portfolio-project-view__hero-copy') || null;
  }

  getScrollCue() {
    return this.root?.querySelector('.portfolio-project-view__scroll-cue') || null;
  }

  usesColorMedia() {
    return this.root?.dataset?.mediaMode === 'colour';
  }

  getHeroColor() {
    if (!this.root) return '';
    return getComputedStyle(this.root).getPropertyValue('--portfolio-project-hero-colour').trim();
  }

  isHeroAtTop() {
    if (!this.scroll) return true;
    const heroHeight = this.root?.querySelector('.portfolio-project-view__hero')?.getBoundingClientRect?.().height || 0;
    return this.scroll.scrollTop <= Math.max(16, heroHeight * 0.4);
  }

  beginSharedHandoff(direction = 'open') {
    if (!this.root) return;
    this.root.classList.add('is-visible', 'is-shared-handoff');
    this.root.classList.toggle('is-shared-handoff-closing', direction !== 'open');
    this.root.classList.remove('is-hero-motion-active', 'is-closing');
    this.root.setAttribute('aria-hidden', 'false');
  }

  restoreTransitionMedia(mediaMotion = this.imageMotion) {
    if (!mediaMotion || !this.imageShell) return;
    const veil = this.getHeroVeil();
    this.imageShell.insertBefore(mediaMotion, veil || this.imageShell.firstChild);
    this.imageMotion = mediaMotion;
    this.image = mediaMotion.querySelector('.portfolio-project-view__image') || this.image;
  }

  commitSharedOpen(mediaMotion = this.imageMotion, { activateHeroMotion = true } = {}) {
    if (!this.root) return;
    this.restoreTransitionMedia(mediaMotion);
    this.root.classList.remove(
      'is-preopen',
      'is-closing',
      'is-shared-handoff',
      'is-shared-handoff-closing',
    );
    this.root.classList.add('is-visible', 'is-open', 'is-title-visible');
    this.root.classList.toggle('is-hero-motion-active', Boolean(activateHeroMotion));
    this.root.setAttribute('aria-hidden', 'false');
  }

  commitSharedClosed(mediaMotion = this.imageMotion) {
    if (!this.root) return;
    this.restoreTransitionMedia(mediaMotion);
    this.resetMediaTransforms();
    this.root.classList.remove(
      'is-visible',
      'is-closing',
      'is-open',
      'is-title-visible',
      'is-preopen',
      'is-hero-motion-active',
      'is-shared-handoff',
      'is-shared-handoff-closing',
    );
    this.root.setAttribute('aria-hidden', 'true');
    this.resetScrollTop();
    this.updateScrollState();
  }

  activateHeroMotion() {
    this.root?.classList.add('is-hero-motion-active');
  }

  applyKenBurnsMotion(project, motionConfig = {}) {
    if (!this.imageMotion) return;
    const sequence = createKenBurnsSequence(project, motionConfig);
    this.imageMotion.style.setProperty('--portfolio-kb-duration', `${sequence.durationMs}ms`);
    sequence.points.forEach((point, index) => {
      this.imageMotion.style.setProperty(`--portfolio-kb-x-${index}`, `${point.x}px`);
      this.imageMotion.style.setProperty(`--portfolio-kb-y-${index}`, `${point.y}px`);
      this.imageMotion.style.setProperty(`--portfolio-kb-scale-${index}`, point.scale.toFixed(3));
    });
  }

  updateScrollCueColor(fallbackColor) {
    if (!this.root) return;
    const sampledRgb = sampleImageCueColor(this.image);
    const cueColor = buildCueColor(sampledRgb, fallbackColor);
    this.root.style.setProperty('--portfolio-scroll-cue-color', cueColor);
  }

  buildProjectContent(project) {
    const blocks = getProjectContentBlocks(project);
    const links = Array.isArray(project?.links) ? project.links : [];
    const metadata = Array.isArray(project?.metadata)
      ? project.metadata.filter((item) => item?.label && item?.value)
      : [];
    const takeaways = Array.isArray(project?.takeaways) ? project.takeaways : [];
    let stillImageOrdinal = 1;

    const metadataHtml = metadata.length
      ? `
        <dl class="portfolio-project-view__metadata" aria-label="Project details" data-scroll-presence data-scroll-presence-span="0.16">
          ${metadata.map((item) => `
            <div class="portfolio-project-view__metadata-item">
              <dt>${escapeHtml(item.label)}</dt>
              <dd>${escapeHtml(item.value)}</dd>
            </div>
          `).join('')}
        </dl>
      `
      : '';

    const linksHtml = links.length
      ? `
        <div class="portfolio-project-view__links" data-scroll-presence data-scroll-presence-span="0.16">
          ${links.map((link) => `
            <a href="${escapeHtml(link.url)}" target="_blank" rel="noopener noreferrer">
              ${escapeHtml(link.label)}
              <i class="ti ti-external-link" aria-hidden="true"></i>
            </a>
          `).join('')}
        </div>`
      : '';

    const blocksHtml = blocks.map((block) => {
      const blockAspectRatio = resolveBlockAspectRatio(block);
      const mediaFrameStyle = blockAspectRatio
        ? ` style="--portfolio-block-aspect-ratio:${escapeHtml(blockAspectRatio)};"`
        : '';

      if (block.type === 'video') {
        const src = this.resolveAsset(block.src);
        const type = getVideoMimeType(src);
        const autoplay = window.matchMedia('(prefers-reduced-motion: reduce)').matches ? '' : 'autoplay';
        return `
          <figure class="portfolio-project-view__block portfolio-project-view__block--video" data-scroll-presence data-scroll-presence-span="0.16">
            <div class="portfolio-project-view__block-media-frame"${mediaFrameStyle}>
              <video ${autoplay} muted loop playsinline preload="metadata" controls>
                <source src="${src}"${type ? ` type="${type}"` : ''}>
              </video>
            </div>
            ${block.caption ? `<figcaption>${escapeHtml(block.caption)}</figcaption>` : ''}
          </figure>
        `;
      }
      if (block.type === 'text') {
        const text = block.body || block.text || '';
        return `<div class="portfolio-project-view__block portfolio-project-view__block--text" data-scroll-presence data-scroll-presence-span="0.16"><p>${escapeHtml(text)}</p></div>`;
      }
      if (block.type === 'chapter') {
        const number = block.number || '';
        const label = block.label || '';
        const title = block.title || '';
        const body = block.body || block.text || '';
        return `
          <section class="portfolio-project-view__block portfolio-project-view__block--chapter" data-scroll-presence data-scroll-presence-span="0.2">
            ${number ? `<span class="portfolio-project-view__chapter-number" aria-hidden="true">${escapeHtml(number)}</span>` : ''}
            <div class="portfolio-project-view__chapter-copy">
              ${label ? `<p class="portfolio-project-view__chapter-label">${escapeHtml(label)}</p>` : ''}
              ${title || body ? `<p class="portfolio-project-view__chapter-line">${buildChapterProseMarkup(title, body)}</p>` : ''}
            </div>
          </section>
        `;
      }
      if (block.type === 'note') {
        const label = block.label || 'Note';
        const text = block.body || block.text || '';
        return `
          <aside class="portfolio-project-view__block portfolio-project-view__block--note" data-scroll-presence data-scroll-presence-span="0.16">
            <span>${escapeHtml(label)}</span>
            <p>${escapeHtml(text)}</p>
          </aside>
        `;
      }
      if (block.type === 'colour') {
        const colour = block.color || '#d8d4cf';
        return `
          <figure class="portfolio-project-view__block portfolio-project-view__block--colour" data-scroll-presence data-scroll-presence-span="0.16">
            <div class="portfolio-project-view__block-media-frame"${mediaFrameStyle} aria-hidden="true">
              <div class="portfolio-project-view__colour-field" style="--portfolio-block-colour:${escapeHtml(colour)}"></div>
            </div>
            ${block.caption ? `<figcaption>${escapeHtml(block.caption)}</figcaption>` : ''}
          </figure>
        `;
      }
      if (block.type === 'quote') {
        const text = block.text || '';
        const attribution = block.attribution || '';
        return `
          <figure class="portfolio-project-view__block portfolio-project-view__block--quote" data-scroll-presence data-scroll-presence-span="0.16">
            <blockquote>${escapeHtml(text)}</blockquote>
            ${attribution ? `<figcaption>${escapeHtml(attribution)}</figcaption>` : ''}
          </figure>
        `;
      }
      if (block.type === 'stats') {
        const items = Array.isArray(block.items) ? block.items : [];
        if (!items.length) return '';
        return `
          <section class="portfolio-project-view__block portfolio-project-view__block--stats" aria-label="Project stats" data-scroll-presence data-scroll-presence-span="0.16">
            <ul>
              ${items.map((item) => `
                <li>
                  <span class="portfolio-project-view__stat-value">${escapeHtml(item.value || '')}</span>
                  <span class="portfolio-project-view__stat-label">${escapeHtml(item.label || '')}</span>
                </li>
              `).join('')}
            </ul>
          </section>
        `;
      }
      stillImageOrdinal += 1;
      const shouldAnimate = stillImageOrdinal % 4 === 0;
      const imageMarkup = shouldAnimate
        ? `<div class="portfolio-project-view__block-media-frame"${mediaFrameStyle}>
            <div class="portfolio-project-view__block-media portfolio-project-view__block-media--ken-burns" style="${escapeHtml(buildKenBurnsStyleVars(createDetailImageKenBurnsSequence(project, block.src, stillImageOrdinal)))}">
              <img class="portfolio-project-view__block-media-image" src="${this.resolveAsset(block.src)}" alt="${escapeHtml(block.alt || project?.title || 'Project image')}" loading="lazy">
            </div>
          </div>`
        : `<div class="portfolio-project-view__block-media-frame"${mediaFrameStyle}>
            <img class="portfolio-project-view__block-media-image" src="${this.resolveAsset(block.src)}" alt="${escapeHtml(block.alt || project?.title || 'Project image')}" loading="lazy">
          </div>`;
      return `
        <figure class="portfolio-project-view__block portfolio-project-view__block--media${shouldAnimate ? ' portfolio-project-view__block--ken-burns' : ''}" data-scroll-presence data-scroll-presence-span="0.16">
          ${imageMarkup}
          ${block.caption ? `<figcaption>${escapeHtml(block.caption)}</figcaption>` : ''}
        </figure>
      `;
    }).join('');

    const takeawayHtml = takeaways.length
      ? `
        <section class="portfolio-project-view__takeaways" data-scroll-presence data-scroll-presence-span="0.18">
          <p class="portfolio-project-view__section-label">${escapeHtml(project?.takeawaysTitle || 'Personal takeaways')}</p>
          <ul>${takeaways.map((item) => `<li>${escapeHtml(item)}</li>`).join('')}</ul>
        </section>
      `
      : '';

    return `
      <div class="portfolio-project-view__summary" data-scroll-presence data-scroll-presence-span="0.18">
        <p>${escapeHtml(project?.summary || '')}</p>
      </div>
      ${metadataHtml}
      ${project?.overview ? `
        <section class="portfolio-project-view__overview" data-scroll-presence data-scroll-presence-span="0.18">
          <p class="portfolio-project-view__section-label">Overview</p>
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
      imageHandoffDelayMs = 0,
      titleDelayMs = 280,
      accentColor = '',
      motionConfig = {},
      deferReveal = false,
    } = options;
    const labelContent = resolvePortfolioLabelContent(project, project?.title || 'Project');
    const spokenLabel = labelContent.eyebrow
      ? `${labelContent.eyebrow}: ${labelContent.title}`
      : labelContent.title;

    this.root.style.setProperty('--portfolio-project-open-ms', `${openDurationMs}ms`);
    this.root.style.setProperty('--portfolio-project-image-fade-ms', `${imageFadeMs}ms`);
    this.root.style.setProperty('--portfolio-project-handoff-delay-ms', `${imageHandoffDelayMs}ms`);
    this.root.style.setProperty('--portfolio-project-title-delay-ms', `${titleDelayMs}ms`);
    this.root.style.setProperty('--portfolio-project-accent', accentColor || 'var(--cursor-color)');
    this.root.style.setProperty(
      '--portfolio-project-hero-colour',
      project.heroColor || project.thumbnailColor || accentColor || 'var(--cursor-color)'
    );
    this.root.dataset.projectId = String(project.id || '');
    this.root.dataset.mediaMode = project.mediaMode === 'colour' ? 'colour' : 'image';

    if (this.image) {
      const usesColourPlaceholder = project.mediaMode === 'colour';
      this.image.hidden = usesColourPlaceholder;
      if (usesColourPlaceholder) {
        this.image.removeAttribute('src');
        this.image.alt = '';
        this.image.style.objectPosition = '';
      } else {
        this.image.src = this.resolveAsset(project.image || this.coverFallback);
        this.image.alt = spokenLabel ? `${spokenLabel} cover` : 'Project cover';
        this.image.style.objectPosition = project.heroPosition || '';
        this.image.addEventListener('load', () => {
          this.updateScrollCueColor(accentColor);
          this.scheduleDrawerMediaScrollShift();
          this.scrollPresence?.refresh();
        }, { once: true });
      }
    }
    this.updateScrollCueColor(accentColor);
    this.applyKenBurnsMotion(project, motionConfig);
    if (this.eyebrow) {
      this.eyebrow.textContent = labelContent.eyebrow || '';
      this.eyebrow.hidden = !labelContent.eyebrow;
    }
    if (this.title) this.title.textContent = labelContent.title || '';
    this.root.setAttribute('aria-labelledby', labelContent.eyebrow
      ? 'portfolioProjectEyebrow portfolioProjectTitle'
      : 'portfolioProjectTitle');
    if (this.content) this.content.innerHTML = this.buildProjectContent(project);
    this.scrollPresence?.refresh();
    this.scheduleDrawerMediaScrollShift();

    this.clearOpenTimers();
    this.root.classList.remove('is-closing', 'is-open', 'is-title-visible', 'is-hero-motion-active');
    this.root.classList.add('is-visible');
    this.root.setAttribute('aria-hidden', 'false');
    this.resetScrollTop();
    this.updateScrollState();

    if (deferReveal) {
      this.root.classList.add('is-preopen');
      return;
    }

    this.reveal({
      animate,
      titleDelayMs,
    });
  }

  reveal({ animate = true, titleDelayMs = 280, immediateStart = false } = {}) {
    if (!this.root) return;
    this.root.classList.remove('is-preopen', 'is-closing');
    if (!animate || window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      this.root.classList.add('is-open', 'is-title-visible', 'is-hero-motion-active');
      return;
    }

    this.root.classList.remove('is-open', 'is-title-visible');
    if (immediateStart) {
      // Flush the hidden composition before the media bridge is appended in the
      // same task. The bridge covers this local fade, so no intermediate sheet
      // frame is exposed and the handoff does not depend on a future RAF.
      void this.root.offsetWidth;
      this.root.classList.add('is-open');
    } else {
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          this.root?.classList.add('is-open');
        });
      });
    }
    this.openTimers.push(window.setTimeout(() => {
      this.root?.classList.add('is-title-visible');
    }, titleDelayMs));
  }

  beginClose({ reducedMotion = false, durationMs = 420, onComplete } = {}) {
    if (!this.root) return;
    this.clearOpenTimers();
    this.root.style.setProperty('--portfolio-project-close-ms', `${durationMs}ms`);
    this.drawer?.removeEventListener('transitionend', this.boundTransitionEnd);
    this.drawer?.addEventListener('transitionend', this.boundTransitionEnd);
    this.root.classList.remove('is-title-visible');
    this.root.classList.remove('is-hero-motion-active');
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
    this.root.classList.remove(
      'is-visible',
      'is-closing',
      'is-open',
      'is-title-visible',
      'is-preopen',
      'is-hero-motion-active',
    );
    this.root.setAttribute('aria-hidden', 'true');
    const onComplete = this.onCloseComplete;
    this.onCloseComplete = null;
    onComplete?.();
  }

  getFocusableElements() {
    if (!this.root) return [];
    return Array.from(this.root.querySelectorAll(
      [
        'button:not([disabled])',
        'a[href]',
        'input:not([disabled])',
        'select:not([disabled])',
        'textarea:not([disabled])',
        'video[controls]',
        'audio[controls]',
        '[contenteditable="true"]',
        '[tabindex]:not([tabindex="-1"])',
      ].join(',')
    )).filter((element) => {
      if (element.hasAttribute('disabled')) return false;
      if (element.closest('[aria-hidden="true"], [inert]')) return false;
      const style = window.getComputedStyle(element);
      return style.visibility !== 'hidden' && style.display !== 'none';
    });
  }

  destroy() {
    this.clearOpenTimers();
    this.teardownMediaScrollShift();
    this.scrollPresence?.destroy();
    this.scrollPresence = null;
    if (this.closeFallbackTimer !== null) {
      window.clearTimeout(this.closeFallbackTimer);
      this.closeFallbackTimer = null;
    }
    this.root?.removeEventListener('click', this.boundBackClick);
    this.backdrop?.removeEventListener('pointerdown', this.boundRequestClose);
    this.scroll?.removeEventListener('scroll', this.boundUpdateScrollState);
    this.drawer?.removeEventListener('transitionend', this.boundTransitionEnd);
    this.root?.remove();
    this.root = null;
    this.backdrop = null;
    this.drawer = null;
    this.scroll = null;
    this.imageShell = null;
    this.imageMotion = null;
    this.image = null;
    this.eyebrow = null;
    this.title = null;
    this.content = null;
    this.backButton = null;
  }
}
