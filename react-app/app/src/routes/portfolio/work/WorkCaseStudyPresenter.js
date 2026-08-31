import { announceToScreenReader } from '../../../legacy/modules/utils/accessibility.js';
import { refreshCursor } from '../../../legacy/modules/rendering/cursor.js';
import {
  getPortfolioCoverFallback,
  resolvePortfolioAsset,
} from '../../../legacy/modules/portfolio/portfolio-data.js';
import { PortfolioProjectDrawer } from '../../../legacy/modules/portfolio/project-drawer.js';
import { PortfolioProjectHandoff } from '../../../legacy/modules/portfolio/project-handoff.js';

const OPEN_DURATION_MS = 500;
const CLOSE_DURATION_MS = 380;

function setSheetHostHidden(host, hidden) {
  if (!host) return;
  host.setAttribute('aria-hidden', hidden ? 'true' : 'false');
}

export class WorkCaseStudyPresenter {
  constructor({
    host,
    getCanvasStage,
    shouldReduceMotion,
    onRequestClose,
    onBackgroundInertChange,
    onRestoreFocus,
    onPhaseChange,
  }) {
    this.host = host;
    this.getCanvasStage = getCanvasStage;
    this.shouldReduceMotion = shouldReduceMotion;
    this.onRequestClose = onRequestClose;
    this.onBackgroundInertChange = onBackgroundInertChange;
    this.onRestoreFocus = onRestoreFocus;
    this.onPhaseChange = onPhaseChange;
    this.drawer = null;
    this.handoff = null;
    this.root = null;
    this.sourceCard = null;
    this.item = null;
    this.phase = 'idle';
    this.destroyed = false;
    this.boundKeydown = (event) => this.handleKeydown(event);
  }

  mount() {
    if (!this.host || this.drawer) return this.root;
    this.drawer = new PortfolioProjectDrawer({
      host: this.host,
      resolveAsset: resolvePortfolioAsset,
      coverFallback: getPortfolioCoverFallback(),
      onRequestClose: () => this.onRequestClose?.({ reason: 'drawer' }),
    });
    this.root = this.drawer.mount();
    this.root.dataset.workCaseStudy = 'true';
    this.drawer.commitSharedClosed?.();
    setSheetHostHidden(this.host, true);
    this.handoff = new PortfolioProjectHandoff({
      host: this.host,
      drawerView: this.drawer,
      getDeckStage: () => this.getCanvasStage?.(),
      shouldReduceMotion: () => this.shouldReduceMotion?.() === true,
      backgroundOpacity: 1,
      onStateChange: (snapshot) => this.setPhase(snapshot.state),
      onOpened: () => this.finishOpen(),
      onClosed: () => this.finishClose(),
    });
    return this.root;
  }

  setPhase(phase) {
    this.phase = phase;
    if (this.root) this.root.dataset.workPresentationPhase = phase;
    this.onPhaseChange?.(phase);
  }

  get activeItemId() {
    return this.item?.id || '';
  }

  async open(item, sourceCard) {
    if (this.destroyed || !item?.project || !sourceCard) return false;
    this.mount();
    if (!this.drawer || !this.handoff) return false;
    if (this.item?.id === item.id && !['idle', 'closed'].includes(this.phase)) return true;

    this.item = item;
    this.sourceCard = sourceCard;
    this.sourceCard.setAttribute('aria-expanded', 'true');
    this.sourceCard.classList.add('is-selected');
    setSheetHostHidden(this.host, false);
    document.body.classList.add('portfolio-project-open');
    document.body.classList.remove('portfolio-project-closing');
    this.onBackgroundInertChange?.(true);
    refreshCursor();

    this.drawer.syncProject(item.project, {
      animate: false,
      deferReveal: true,
      openDurationMs: OPEN_DURATION_MS,
      imageFadeMs: 220,
      titleDelayMs: 300,
    });
    document.addEventListener('keydown', this.boundKeydown, true);
    announceToScreenReader(`Opening case study: ${item.label}`);
    this.setPhase('preparing');

    const started = await this.handoff.open({
      sourceCard,
      project: item.project,
      openDurationMs: OPEN_DURATION_MS,
      closeDurationMs: CLOSE_DURATION_MS,
    });
    if (!started && this.item?.id === item.id) {
      this.drawer.commitSharedOpen?.(this.drawer.imageMotion, {
        activateHeroMotion: !this.shouldReduceMotion?.(),
      });
      this.finishOpen();
    }
    return true;
  }

  finishOpen() {
    if (!this.item) return;
    this.setPhase('open');
    announceToScreenReader(`Opened case study: ${this.item.label}`);
    this.drawer?.backButton?.focus({ preventScroll: true });
  }

  close() {
    if (!this.item || !this.drawer || !this.handoff) return false;
    if (this.phase === 'closing') return true;
    document.body.classList.add('portfolio-project-closing');
    this.setPhase('closing');
    const started = this.handoff.close({
      sourceCard: this.sourceCard,
      closeDurationMs: CLOSE_DURATION_MS,
    });
    if (!started) {
      this.drawer.commitSharedClosed?.(this.drawer.imageMotion);
      this.finishClose();
    }
    return true;
  }

  finishClose() {
    const itemId = this.item?.id || '';
    this.sourceCard?.classList.remove('is-selected', 'is-handoff-source-hidden');
    this.sourceCard?.setAttribute('aria-expanded', 'false');
    document.removeEventListener('keydown', this.boundKeydown, true);
    document.body.classList.remove('portfolio-project-open', 'portfolio-project-closing');
    setSheetHostHidden(this.host, true);
    this.onBackgroundInertChange?.(false);
    refreshCursor();
    this.drawer?.setScrollSoundEnabled?.(false);
    this.item = null;
    this.sourceCard = null;
    this.setPhase('closed');
    announceToScreenReader('Closed case study');
    if (itemId) this.onRestoreFocus?.(itemId);
  }

  handleKeydown(event) {
    if (!this.item) return;
    if (event.key === 'Escape') {
      event.preventDefault();
      this.onRequestClose?.({ reason: 'escape' });
      return;
    }
    if (event.key !== 'Tab') return;
    const focusables = this.drawer?.getFocusableElements?.() || [];
    if (!focusables.length) return;
    const first = focusables[0];
    const last = focusables[focusables.length - 1];
    const active = document.activeElement;
    if (event.shiftKey && (active === first || !this.root?.contains(active))) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && (active === last || !this.root?.contains(active))) {
      event.preventDefault();
      first.focus();
    }
  }

  destroy() {
    if (this.destroyed) return;
    this.destroyed = true;
    document.removeEventListener('keydown', this.boundKeydown, true);
    this.handoff?.destroy();
    this.drawer?.destroy();
    document.body.classList.remove('portfolio-project-open', 'portfolio-project-closing');
    setSheetHostHidden(this.host, true);
    this.onBackgroundInertChange?.(false);
    this.item = null;
    this.sourceCard = null;
    this.root = null;
    this.handoff = null;
    this.drawer = null;
  }
}
