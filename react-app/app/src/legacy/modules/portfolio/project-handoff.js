const HANDOFF_EASING = 'cubic-bezier(0.22, 0, 0.16, 1)';
const REDUCED_MOTION_DURATION_MS = 120;
const DIRECT_CLOSE_DURATION_MS = 220;

function serializeRect(rect) {
  if (!rect) return null;
  return {
    left: Number(rect.left.toFixed(2)),
    top: Number(rect.top.toFixed(2)),
    width: Number(rect.width.toFixed(2)),
    height: Number(rect.height.toFixed(2)),
  };
}

function usableRect(rect) {
  return Boolean(rect && rect.width > 0 && rect.height > 0);
}

function waitForRenderableImage(image, timeoutMs = 140) {
  if (!image || image.hidden || (image.complete && image.naturalWidth > 0)) return Promise.resolve();
  const ready = typeof image.decode === 'function'
    ? image.decode().catch(() => {})
    : new Promise((resolve) => image.addEventListener('load', resolve, { once: true }));
  return Promise.race([
    ready,
    new Promise((resolve) => window.setTimeout(resolve, timeoutMs)),
  ]);
}

function cancelAnimations(animations) {
  animations.forEach((animation) => {
    try {
      animation.cancel();
    } catch (_) {
      /* ignore */
    }
  });
}

export class PortfolioProjectHandoff {
  constructor({
    host,
    drawerView,
    getDeckStage,
    shouldReduceMotion,
    onStateChange,
    onOpened,
    onClosed,
  }) {
    this.host = host;
    this.drawerView = drawerView;
    this.getDeckStage = getDeckStage;
    this.shouldReduceMotion = shouldReduceMotion;
    this.onStateChange = onStateChange;
    this.onOpened = onOpened;
    this.onClosed = onClosed;
    this.state = 'idle';
    this.reason = 'initial';
    this.bridge = null;
    this.sourceCard = null;
    this.sourceMedia = null;
    this.mediaMotion = null;
    this.image = null;
    this.animations = [];
    this.primaryAnimation = null;
    this.durationMs = 0;
    this.openDurationMs = 700;
    this.closeDurationMs = 520;
    this.sequenceToken = 0;
    this.sourceRect = null;
    this.targetRect = null;
    this.sourceObjectPosition = '50% 50%';
    this.targetObjectPosition = '50% 50%';
    this.sourceFilter = 'none';
    this.targetFilter = 'none';
    this.frozenHeroTransform = 'none';
  }

  setState(state, reason) {
    this.state = state;
    this.reason = reason || this.reason;
    this.onStateChange?.(this.getSnapshot());
  }

  get progress() {
    const currentTime = Number(this.primaryAnimation?.currentTime);
    if (!Number.isFinite(currentTime) || !(this.durationMs > 0)) {
      return this.state === 'open' ? 1 : 0;
    }
    return Math.max(0, Math.min(1, currentTime / this.durationMs));
  }

  getSnapshot() {
    return {
      state: this.state,
      reason: this.reason,
      progress: Number(this.progress.toFixed(4)),
      sourceRect: serializeRect(this.sourceRect),
      targetRect: serializeRect(this.targetRect),
      bridgeRect: serializeRect(this.bridge?.getBoundingClientRect?.()),
      mediaNodeCount: this.host?.querySelectorAll?.('.portfolio-project-media-bridge').length || 0,
      hasSharedMedia: Boolean(this.mediaMotion?.isConnected),
    };
  }

  async open({ sourceCard, project, openDurationMs = 700, closeDurationMs = 520 }) {
    if (!sourceCard || !project || !this.drawerView || !this.host) return false;
    if (!['idle', 'closed'].includes(this.state)) return false;

    const sourceMedia = sourceCard.querySelector('.portfolio-project-card__media');
    const sourceRect = sourceMedia?.getBoundingClientRect?.();
    const targetRect = this.drawerView.getHeroImageRect?.();
    if (!sourceMedia || !usableRect(sourceRect) || !usableRect(targetRect)) return false;

    this.sequenceToken += 1;
    const token = this.sequenceToken;
    this.openDurationMs = Math.max(200, Number(openDurationMs) || 700);
    this.closeDurationMs = Math.max(160, Number(closeDurationMs) || 520);
    this.sourceCard = sourceCard;
    this.sourceMedia = sourceMedia;
    this.sourceRect = sourceRect;
    this.targetRect = targetRect;
    this.setState('preparing', 'open-request');

    const transitionMedia = this.drawerView.getTransitionMedia?.();
    this.mediaMotion = transitionMedia?.motion || null;
    this.image = transitionMedia?.image || null;
    if (!this.mediaMotion) {
      this.setState('idle', 'missing-transition-media');
      return false;
    }

    const sourceVisual = sourceMedia.querySelector('.portfolio-project-card__image, .portfolio-project-card__video');
    const sourceVisualStyle = sourceVisual ? getComputedStyle(sourceVisual) : null;
    const targetVisualStyle = this.image ? getComputedStyle(this.image) : null;
    this.sourceObjectPosition = sourceVisualStyle?.objectPosition || '50% 50%';
    this.targetObjectPosition = this.image?.style.objectPosition || targetVisualStyle?.objectPosition || '50% 50%';
    this.sourceFilter = sourceVisualStyle?.filter || 'none';
    this.targetFilter = targetVisualStyle?.filter || 'none';
    this.frozenHeroTransform = 'none';

    await waitForRenderableImage(this.image);
    if (token !== this.sequenceToken || this.state !== 'preparing') return false;

    if (this.shouldReduceMotion?.()) {
      this.runDirectOpen(token);
      return true;
    }

    this.buildBridge({ atTarget: false });
    this.buildTimeline(this.openDurationMs, false);
    this.setState('opening', 'shared-media-open');
    this.playTimeline({ reverse: false, token });
    return true;
  }

  close({ sourceCard, closeDurationMs = this.closeDurationMs } = {}) {
    if (this.state === 'opening' && this.primaryAnimation) {
      this.reverse('close-during-open', closeDurationMs);
      return true;
    }
    if (this.state === 'preparing') {
      this.abort({ settle: 'closed', reason: 'close-during-prepare' });
      return true;
    }
    if (this.state !== 'open') return false;

    this.sourceCard = sourceCard || this.sourceCard;
    this.sourceMedia = this.sourceCard?.querySelector('.portfolio-project-card__media') || this.sourceMedia;
    const freshSourceRect = this.sourceMedia?.getBoundingClientRect?.();
    const freshTargetRect = this.drawerView.getHeroImageRect?.();
    if (usableRect(freshSourceRect)) this.sourceRect = freshSourceRect;
    if (usableRect(freshTargetRect)) this.targetRect = freshTargetRect;

    this.sequenceToken += 1;
    const token = this.sequenceToken;
    this.closeDurationMs = Math.max(160, Number(closeDurationMs) || 520);

    if (this.shouldReduceMotion?.() || !this.drawerView.isHeroAtTop?.() || !usableRect(this.sourceRect)) {
      this.runDirectClose(token, this.shouldReduceMotion?.() ? REDUCED_MOTION_DURATION_MS : DIRECT_CLOSE_DURATION_MS);
      return true;
    }

    const transitionMedia = this.drawerView.getTransitionMedia?.();
    this.mediaMotion = transitionMedia?.motion || this.mediaMotion;
    this.image = transitionMedia?.image || this.image;
    this.frozenHeroTransform = getComputedStyle(this.mediaMotion).transform || 'none';
    this.targetObjectPosition = this.image?.style.objectPosition || getComputedStyle(this.image).objectPosition || '50% 50%';
    this.targetFilter = getComputedStyle(this.image).filter || 'none';
    const sourceVisual = this.sourceMedia?.querySelector('.portfolio-project-card__image, .portfolio-project-card__video');
    const sourceStyle = sourceVisual ? getComputedStyle(sourceVisual) : null;
    this.sourceObjectPosition = sourceStyle?.objectPosition || this.sourceObjectPosition;
    this.sourceFilter = sourceStyle?.filter || this.sourceFilter;

    this.drawerView.beginSharedHandoff?.('close');
    this.buildBridge({ atTarget: true });
    this.buildTimeline(this.closeDurationMs, true);
    this.setState('closing', 'shared-media-close');
    this.playTimeline({ reverse: true, token });
    return true;
  }

  reverse(reason = 'reverse', closeDurationMs = this.closeDurationMs) {
    if (!this.primaryAnimation || this.state !== 'opening') return false;
    this.sequenceToken += 1;
    const token = this.sequenceToken;
    const playbackRate = -(this.openDurationMs / Math.max(160, Number(closeDurationMs) || 520));
    this.setState('closing', reason);
    this.animations.forEach((animation) => {
      try {
        animation.updatePlaybackRate(playbackRate);
        animation.play();
      } catch (_) {
        /* ignore */
      }
    });
    this.watchTimeline({ reverse: true, token });
    return true;
  }

  buildBridge({ atTarget }) {
    this.removeBridge({ keepMedia: true });
    const sourceStyle = getComputedStyle(this.sourceMedia);
    const sourceMaterial = this.sourceCard.querySelector('.portfolio-project-card__surface') || this.sourceCard;
    const sourceMaterialStyle = getComputedStyle(sourceMaterial);
    const targetStyle = getComputedStyle(this.drawerView.getHeroImageShell?.() || this.sourceMedia);
    const bridge = document.createElement('div');
    bridge.className = 'portfolio-project-media-bridge';
    bridge.setAttribute('aria-hidden', 'true');
    bridge.inert = true;
    bridge.dataset.handoffState = atTarget ? 'closing' : 'opening';
    bridge.dataset.mediaMode = this.drawerView.usesColorMedia?.() ? 'colour' : 'image';
    bridge.style.setProperty('--portfolio-project-hero-colour', this.drawerView.getHeroColor?.() || 'transparent');
    const initialRect = atTarget ? this.targetRect : this.sourceRect;
    Object.assign(bridge.style, {
      left: `${initialRect.left}px`,
      top: `${initialRect.top}px`,
      width: `${initialRect.width}px`,
      height: `${initialRect.height}px`,
      borderRadius: atTarget ? targetStyle.borderRadius : sourceStyle.borderRadius,
      background: this.drawerView.usesColorMedia?.()
        ? (this.drawerView.getHeroColor?.() || sourceStyle.backgroundColor)
        : sourceStyle.backgroundColor,
      boxShadow: sourceMaterialStyle.boxShadow,
    });

    const sourceVeilElement = this.sourceMedia.querySelector('.portfolio-project-card__media-veil');
    const sourceVeil = sourceVeilElement?.cloneNode(true) || null;
    if (sourceVeil) {
      const sourceVeilStyle = getComputedStyle(sourceVeilElement);
      sourceVeil.classList.add('portfolio-project-media-bridge__source-veil');
      sourceVeil.style.backgroundImage = sourceVeilStyle.backgroundImage;
      sourceVeil.style.backgroundColor = sourceVeilStyle.backgroundColor;
      bridge.appendChild(sourceVeil);
    }

    this.mediaMotion.style.animation = 'none';
    this.mediaMotion.style.transform = atTarget ? this.frozenHeroTransform : 'none';
    this.mediaMotion.style.background = this.drawerView.usesColorMedia?.()
      ? (this.drawerView.getHeroColor?.() || 'transparent')
      : 'transparent';
    if (this.image) {
      this.image.style.objectPosition = atTarget ? this.targetObjectPosition : this.sourceObjectPosition;
      this.image.style.filter = atTarget ? this.targetFilter : this.sourceFilter;
    }
    bridge.insertBefore(this.mediaMotion, bridge.firstChild);
    this.host.appendChild(bridge);
    this.bridge = bridge;
    this.sourceCard.classList.add('is-handoff-source-hidden');
    this.drawerView.beginSharedHandoff?.(atTarget ? 'close' : 'open');
  }

  buildTimeline(durationMs, startAtTarget) {
    cancelAnimations(this.animations);
    this.animations = [];
    this.durationMs = durationMs;
    const sourceStyle = getComputedStyle(this.sourceMedia);
    const sourceMaterial = this.sourceCard.querySelector('.portfolio-project-card__surface') || this.sourceCard;
    const sourceMaterialStyle = getComputedStyle(sourceMaterial);
    const targetStyle = getComputedStyle(this.drawerView.getHeroImageShell?.() || this.sourceMedia);
    const animationOptions = {
      duration: durationMs,
      easing: HANDOFF_EASING,
      fill: 'both',
    };
    const add = (element, keyframes) => {
      if (!element) return null;
      const animation = element.animate(keyframes, animationOptions);
      animation.pause();
      animation.currentTime = startAtTarget ? durationMs : 0;
      this.animations.push(animation);
      return animation;
    };

    this.primaryAnimation = add(this.bridge, [
      {
        left: `${this.sourceRect.left}px`,
        top: `${this.sourceRect.top}px`,
        width: `${this.sourceRect.width}px`,
        height: `${this.sourceRect.height}px`,
        borderRadius: sourceStyle.borderRadius,
        boxShadow: sourceMaterialStyle.boxShadow,
      },
      {
        left: `${this.targetRect.left}px`,
        top: `${this.targetRect.top}px`,
        width: `${this.targetRect.width}px`,
        height: `${this.targetRect.height}px`,
        borderRadius: targetStyle.borderRadius || '0px',
        boxShadow: 'none',
      },
    ]);
    add(this.image, [
      { objectPosition: this.sourceObjectPosition, filter: this.sourceFilter },
      { objectPosition: this.targetObjectPosition, filter: this.targetFilter },
    ]);
    add(this.mediaMotion, [
      { transform: 'none' },
      { transform: this.frozenHeroTransform || 'none' },
    ]);
    add(this.bridge.querySelector('.portfolio-project-media-bridge__source-veil'), [
      { opacity: 1, offset: 0 },
      { opacity: 1, offset: 0.55 },
      { opacity: 0, offset: 1 },
    ]);
    add(this.getDeckStage?.(), [
      { opacity: 1, offset: 0 },
      { opacity: 1, offset: 0.12 },
      { opacity: 0, offset: 0.48 },
      { opacity: 0, offset: 1 },
    ]);
    add(this.sourceCard?.querySelector('.portfolio-project-card__cta'), [
      { opacity: 1, offset: 0 },
      { opacity: 0, offset: 0.14 },
      { opacity: 0, offset: 1 },
    ]);
    add(this.sourceCard?.querySelector('.portfolio-project-card__copy'), [
      { opacity: 1, offset: 0 },
      { opacity: 1, offset: 0.06 },
      { opacity: 0, offset: 0.24 },
      { opacity: 0, offset: 1 },
    ]);
    add(this.drawerView.getHeroVeil?.(), [
      { opacity: 0, offset: 0 },
      { opacity: 0, offset: 0.55 },
      { opacity: 1, offset: 1 },
    ]);
    add(this.drawerView.getHeroCopy?.(), [
      { opacity: 0, filter: 'blur(3px)', transform: 'translateY(3px) scale(0.994)', offset: 0 },
      { opacity: 0, filter: 'blur(3px)', transform: 'translateY(3px) scale(0.994)', offset: 0.7 },
      { opacity: 1, filter: 'blur(0px)', transform: 'translateY(0px) scale(1)', offset: 1 },
    ]);
    add(this.drawerView.backButton, [
      { opacity: 0, offset: 0 },
      { opacity: 0, offset: 0.82 },
      { opacity: 1, offset: 1 },
    ]);
    add(this.drawerView.getScrollCue?.(), [
      { opacity: 0, offset: 0 },
      { opacity: 0, offset: 0.85 },
      { opacity: 1, offset: 1 },
    ]);
  }

  playTimeline({ reverse, token }) {
    const playbackRate = reverse ? -1 : 1;
    window.requestAnimationFrame(() => {
      if (token !== this.sequenceToken) return;
      this.animations.forEach((animation) => {
        animation.playbackRate = playbackRate;
        animation.play();
      });
      this.watchTimeline({ reverse, token });
    });
  }

  watchTimeline({ reverse, token }) {
    const finished = this.primaryAnimation?.finished;
    if (!finished) return;
    finished.then(() => {
      if (token !== this.sequenceToken) return;
      if (reverse) this.finishClosed('shared-media-close-complete');
      else this.finishOpen('shared-media-open-complete');
    }).catch(() => {});
  }

  runDirectOpen(token) {
    this.drawerView.commitSharedOpen?.(this.mediaMotion, { activateHeroMotion: false });
    const deck = this.getDeckStage?.();
    const drawer = this.drawerView.drawer;
    const animations = [
      deck?.animate([{ opacity: 1 }, { opacity: 0 }], { duration: REDUCED_MOTION_DURATION_MS, fill: 'forwards' }),
      drawer?.animate([{ opacity: 0 }, { opacity: 1 }], { duration: REDUCED_MOTION_DURATION_MS, fill: 'forwards' }),
    ].filter(Boolean);
    this.animations = animations;
    this.primaryAnimation = animations[0] || animations[1] || null;
    this.durationMs = REDUCED_MOTION_DURATION_MS;
    this.setState('opening', 'reduced-motion-open');
    Promise.all(animations.map((animation) => animation.finished.catch(() => {}))).then(() => {
      if (token === this.sequenceToken) this.finishOpen('reduced-motion-open-complete');
    });
  }

  runDirectClose(token, durationMs) {
    this.drawerView.beginSharedHandoff?.('direct-close');
    this.sourceCard?.classList.remove('is-handoff-source-hidden');
    const deck = this.getDeckStage?.();
    const drawer = this.drawerView.drawer;
    const animations = [
      deck?.animate([{ opacity: 0 }, { opacity: 1 }], { duration: durationMs, easing: HANDOFF_EASING, fill: 'forwards' }),
      drawer?.animate([{ opacity: 1 }, { opacity: 0 }], { duration: durationMs, easing: HANDOFF_EASING, fill: 'forwards' }),
    ].filter(Boolean);
    if (durationMs > REDUCED_MOTION_DURATION_MS) {
      const staggerOptions = { duration: durationMs, easing: HANDOFF_EASING, fill: 'forwards' };
      const sourceCopy = this.sourceCard?.querySelector('.portfolio-project-card__copy');
      const sourceCta = this.sourceCard?.querySelector('.portfolio-project-card__cta');
      if (sourceCopy) {
        animations.push(sourceCopy.animate([
          { opacity: 0, offset: 0 },
          { opacity: 0, offset: 0.28 },
          { opacity: 1, offset: 0.72 },
          { opacity: 1, offset: 1 },
        ], staggerOptions));
      }
      if (sourceCta) {
        animations.push(sourceCta.animate([
          { opacity: 0, offset: 0 },
          { opacity: 0, offset: 0.58 },
          { opacity: 1, offset: 0.92 },
          { opacity: 1, offset: 1 },
        ], staggerOptions));
      }
    }
    this.animations = animations;
    this.primaryAnimation = animations[0] || animations[1] || null;
    this.durationMs = durationMs;
    this.setState('closing', durationMs === REDUCED_MOTION_DURATION_MS ? 'reduced-motion-close' : 'scrolled-direct-close');
    Promise.all(animations.map((animation) => animation.finished.catch(() => {}))).then(() => {
      if (token === this.sequenceToken) this.finishClosed('direct-close-complete');
    });
  }

  finishOpen(reason) {
    this.sequenceToken += 1;
    this.drawerView.commitSharedOpen?.(this.mediaMotion, {
      activateHeroMotion: !this.shouldReduceMotion?.(),
    });
    const deck = this.getDeckStage?.();
    if (deck) deck.style.opacity = '0';
    if (this.image) {
      this.image.style.objectPosition = this.targetObjectPosition;
      this.image.style.filter = this.targetFilter;
    }
    this.mediaMotion.style.animation = '';
    this.mediaMotion.style.transform = '';
    this.mediaMotion.style.background = '';
    cancelAnimations(this.animations);
    this.animations = [];
    this.primaryAnimation = null;
    this.removeBridge({ keepMedia: true });
    this.setState('open', reason);
    this.onOpened?.(this.getSnapshot());
  }

  finishClosed(reason) {
    this.sequenceToken += 1;
    this.drawerView.commitSharedClosed?.(this.mediaMotion);
    cancelAnimations(this.animations);
    this.animations = [];
    this.primaryAnimation = null;
    this.removeBridge({ keepMedia: true });
    this.sourceCard?.classList.remove('is-handoff-source-hidden');
    const deck = this.getDeckStage?.();
    if (deck) deck.style.opacity = '';
    if (this.mediaMotion) {
      this.mediaMotion.style.animation = '';
      this.mediaMotion.style.transform = '';
      this.mediaMotion.style.background = '';
    }
    this.setState('closed', reason);
    this.onClosed?.(this.getSnapshot());
  }

  removeBridge({ keepMedia = false } = {}) {
    if (keepMedia && this.bridge?.contains(this.mediaMotion)) {
      this.drawerView.restoreTransitionMedia?.(this.mediaMotion);
    }
    this.bridge?.remove();
    this.bridge = null;
  }

  abort({ settle = 'closed', reason = 'abort' } = {}) {
    this.sequenceToken += 1;
    cancelAnimations(this.animations);
    this.animations = [];
    this.primaryAnimation = null;
    if (settle === 'open') this.finishOpen(reason);
    else this.finishClosed(reason);
  }

  destroy() {
    this.sequenceToken += 1;
    cancelAnimations(this.animations);
    this.animations = [];
    this.primaryAnimation = null;
    this.removeBridge({ keepMedia: true });
    this.sourceCard?.classList.remove('is-handoff-source-hidden');
    this.state = 'idle';
  }
}
