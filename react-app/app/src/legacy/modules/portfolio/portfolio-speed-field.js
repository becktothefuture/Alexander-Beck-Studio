import {
  createSimulationMaterialSequence,
  getSimulationPaletteSnapshot,
  subscribeSimulationPalette,
} from '../../../palette/simulationPaletteController.js';

const DPR_CAP = 2;
const REFERENCE_AREA = 1440 * 900;
const FULL_INTENSITY_VELOCITY = 7;
const VELOCITY_EPSILON = 0.025;
const OPACITY_EPSILON = 0.004;
const WRAP_PADDING = 40;

const FIELD_LAYERS = Object.freeze([
  Object.freeze({ count: 18, radiusMinT: 0, radiusMaxT: 0.28, speed: 0.34 }),
  Object.freeze({ count: 14, radiusMinT: 0.18, radiusMaxT: 0.58, speed: 0.72 }),
  Object.freeze({ count: 9, radiusMinT: 0.48, radiusMaxT: 1, speed: 1.24 }),
]);

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function lerp(from, to, amount) {
  return from + ((to - from) * amount);
}

function toNumber(value, fallback) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : fallback;
}

function createSeededRandom(seed) {
  let state = seed >>> 0;
  return () => {
    state = ((state * 1664525) + 1013904223) >>> 0;
    return state / 4294967296;
  };
}

export class PortfolioParticleField {
  constructor(canvas, options = {}) {
    this.canvas = canvas || null;
    this.ctx = this.canvas?.getContext?.('2d', { alpha: true, desynchronized: true }) || null;
    this.width = 0;
    this.height = 0;
    this.dpr = 1;
    this.particles = [];
    this.colors = [];
    this.colorDistribution = [];
    this.paletteId = '';
    this.paletteGeneration = 0;
    this.maskGradient = null;
    this.targetVelocity = 0;
    this.filteredVelocity = 0;
    this.opacity = 0;
    this.lastDirection = -1;
    this.started = false;
    this.running = false;
    this.suspended = false;
    this.animationFrame = 0;
    this.frameTimer = 0;
    this.lastFrameAt = 0;
    this.frameCount = 0;
    this.drawCount = 0;
    this.options = {};
    this.onSuspensionChange = typeof options.onSuspensionChange === 'function'
      ? options.onSuspensionChange
      : null;
    this.reducedMotionQuery = window.matchMedia?.('(prefers-reduced-motion: reduce)') || null;
    this.boundVisibilityChange = () => this.syncLifecycle();
    this.boundMotionPreferenceChange = () => this.syncLifecycle();
    this.transitionObserver = typeof MutationObserver === 'function'
      ? new MutationObserver(() => this.syncLifecycle())
      : null;
    document.addEventListener('visibilitychange', this.boundVisibilityChange);
    this.reducedMotionQuery?.addEventListener?.('change', this.boundMotionPreferenceChange);
    this.transitionObserver?.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['data-abs-transition-phase'],
    });
    this.unsubscribePalette = subscribeSimulationPalette((snapshot) => this.refreshPalette(snapshot));
    this.configure(options);
  }

  configure(options = {}) {
    const previous = this.options;
    const minRadiusPx = clamp(toNumber(options.minRadiusPx, 1.8), 0.75, 6);
    const maxRadiusPx = clamp(
      toNumber(options.maxRadiusPx, 18),
      Math.max(6, minRadiusPx + 1),
      36
    );
    const idleOpacity = clamp(toNumber(options.idleOpacity, 0), 0, 1);
    this.options = {
      idleOpacity,
      fastOpacity: clamp(toNumber(options.fastOpacity, 0.26), idleOpacity, 1),
      quietBandHeight: clamp(toNumber(options.quietBandHeight, 0.42), 0.18, 0.72),
      quietBandOpacity: clamp(toNumber(options.quietBandOpacity, 0.3), 0.05, 1),
      quietBandCenterY: clamp(toNumber(options.quietBandCenterY, 0.5), 0.1, 0.9),
      densityScale: clamp(toNumber(options.densityScale, 1), 0.25, 2),
      minRadiusPx,
      maxRadiusPx,
      motionResponse: clamp(toNumber(options.motionResponse, 1), 0.25, 2.5),
      parallaxDepth: clamp(toNumber(options.parallaxDepth, 1), 0.25, 2),
    };

    const allocationChanged = !previous.densityScale
      || previous.densityScale !== this.options.densityScale
      || previous.minRadiusPx !== this.options.minRadiusPx
      || previous.maxRadiusPx !== this.options.maxRadiusPx
      || previous.parallaxDepth !== this.options.parallaxDepth;

    if (!this.width || !this.height) {
      this.resize({ force: true });
    } else {
      if (allocationChanged) this.seedParticles();
      this.buildMaskGradient();
      if (this.started) this.drawFrame(performance.now(), 0);
    }
    this.syncLifecycle();
  }

  refreshPalette(snapshot = getSimulationPaletteSnapshot()) {
    if (!this.canvas) return;
    if (snapshot.generation === this.paletteGeneration) return;
    this.colors.splice(0, this.colors.length, ...snapshot.colors);
    this.colorDistribution = snapshot.distribution.slice();
    this.paletteId = snapshot.paletteId;
    this.paletteGeneration = snapshot.generation;
    const roleById = new Map(snapshot.distribution.map((row) => [row.roleId, row]));
    for (let index = 0; index < this.particles.length; index += 1) {
      const particle = this.particles[index];
      const role = roleById.get(particle.roleId) || snapshot.distribution[particle.distributionIndex];
      if (role) particle.colorIndex = role.colorIndex;
    }
    this.canvas.dataset.simulationPaletteGeneration = String(snapshot.generation);
    this.canvas.dataset.simulationPaletteId = snapshot.paletteId;
    if (this.width && this.height && this.started) this.drawFrame(performance.now(), 0);
  }

  resize({ force = false } = {}) {
    if (!this.canvas || !this.ctx) return false;
    const rect = this.canvas.getBoundingClientRect();
    const width = Math.max(1, Math.round(rect.width));
    const height = Math.max(1, Math.round(rect.height));
    const dpr = Math.min(DPR_CAP, Math.max(1, window.devicePixelRatio || 1));
    if (!force && width === this.width && height === this.height && dpr === this.dpr) return false;

    this.width = width;
    this.height = height;
    this.dpr = dpr;
    this.canvas.width = Math.ceil(width * dpr);
    this.canvas.height = Math.ceil(height * dpr);
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    this.seedParticles();
    this.buildMaskGradient();
    if (this.started) this.drawFrame(performance.now(), 0);
    return true;
  }

  seedParticles() {
    if (!this.width || !this.height) return;
    const random = createSeededRandom(0xabecc1e);
    const colorRandom = createSeededRandom(0xc0104ab5);
    const areaScale = clamp(Math.sqrt((this.width * this.height) / REFERENCE_AREA), 0.62, 1.32);
    const radiusRange = this.options.maxRadiusPx - this.options.minRadiusPx;
    const layerCounts = FIELD_LAYERS.map((layer) => (
      Math.max(3, Math.round(layer.count * areaScale * this.options.densityScale))
    ));
    const materialSequence = createSimulationMaterialSequence(
      layerCounts.reduce((sum, count) => sum + count, 0),
      {},
      getSimulationPaletteSnapshot(),
    ).slice();
    for (let index = materialSequence.length - 1; index > 0; index -= 1) {
      const swapIndex = Math.floor(colorRandom() * (index + 1));
      [materialSequence[index], materialSequence[swapIndex]] = [materialSequence[swapIndex], materialSequence[index]];
    }
    this.particles.length = 0;
    FIELD_LAYERS.forEach((layer, layerIndex) => {
      const count = layerCounts[layerIndex];
      const layerSpeed = clamp(
        0.72 + ((layer.speed - 0.72) * this.options.parallaxDepth),
        0.08,
        2.1
      );
      for (let index = 0; index < count; index += 1) {
        const radiusT = lerp(layer.radiusMinT, layer.radiusMaxT, random());
        this.particles.push({
          x: random() * this.width,
          y: random() * this.height,
          radius: this.options.minRadiusPx + (radiusRange * radiusT),
          speed: layerSpeed * (0.82 + (random() * 0.36)),
          drift: (random() - 0.5) * (0.08 + (layerIndex * 0.035)),
          arcPhase: random() * Math.PI * 2,
          arcAmplitude: lerp(8, 26, layerIndex / Math.max(1, FIELD_LAYERS.length - 1))
            * (0.72 + (random() * 0.56)),
          roleId: materialSequence[this.particles.length]?.roleId || this.colorDistribution[0]?.roleId,
          distributionIndex: materialSequence[this.particles.length]?.distributionIndex || 0,
          colorIndex: materialSequence[this.particles.length]?.colorIndex || 0,
          layerIndex,
        });
      }
    });
  }

  buildMaskGradient() {
    if (!this.ctx || !this.height) return;
    const center = this.options.quietBandCenterY;
    const halfBand = this.options.quietBandHeight * 0.5;
    const innerHalfBand = halfBand * 0.48;
    const outerStart = clamp(center - halfBand, 0, 1);
    const innerStart = clamp(center - innerHalfBand, outerStart, 1);
    const innerEnd = clamp(center + innerHalfBand, innerStart, 1);
    const outerEnd = clamp(center + halfBand, innerEnd, 1);
    const quietAlpha = this.options.quietBandOpacity;
    const gradient = this.ctx.createLinearGradient(0, 0, 0, this.height);
    gradient.addColorStop(0, 'rgba(255,255,255,1)');
    gradient.addColorStop(outerStart, 'rgba(255,255,255,1)');
    gradient.addColorStop(innerStart, `rgba(255,255,255,${quietAlpha})`);
    gradient.addColorStop(innerEnd, `rgba(255,255,255,${quietAlpha})`);
    gradient.addColorStop(outerEnd, 'rgba(255,255,255,1)');
    gradient.addColorStop(1, 'rgba(255,255,255,1)');
    this.maskGradient = gradient;
  }

  clear() {
    if (!this.ctx) return;
    this.ctx.clearRect(0, 0, this.width, this.height);
  }

  start() {
    this.started = true;
    this.resize({ force: true });
    this.canvas?.classList.add('is-active');
    this.syncLifecycle();
  }

  setVelocity(measuredVelocity) {
    this.targetVelocity = toNumber(measuredVelocity, 0);
    if (Math.abs(this.targetVelocity) >= VELOCITY_EPSILON) {
      this.lastDirection = -Math.sign(this.targetVelocity);
    }
    if (this.started) this.scheduleFrame({ immediate: true });
  }

  setSuspended(suspended) {
    const nextSuspended = Boolean(suspended);
    const changed = this.suspended !== nextSuspended;
    this.suspended = nextSuspended;
    this.syncLifecycle();
    if (changed) this.onSuspensionChange?.(this.suspended);
  }

  isReducedMotion() {
    return Boolean(this.reducedMotionQuery?.matches);
  }

  isRouteTransitionPaused() {
    const transitionPhase = document.documentElement.dataset.absTransitionPhase || 'idle';
    return transitionPhase === 'route-out'
      || transitionPhase === 'route-loading'
      || transitionPhase === 'route-in';
  }

  isLifecycleSuspended() {
    return this.suspended
      || document.hidden;
  }

  isMotionPaused() {
    return this.isLifecycleSuspended() || this.isRouteTransitionPaused();
  }

  drawStaticFrame(timestamp = performance.now()) {
    const previousVelocity = this.filteredVelocity;
    const direction = previousVelocity < 0 ? -1 : 1;
    this.filteredVelocity = direction * FULL_INTENSITY_VELOCITY * 0.12;
    this.drawFrame(timestamp, 0);
    this.filteredVelocity = previousVelocity;
  }

  syncLifecycle() {
    if (!this.started || !this.canvas || !this.ctx) return;
    if (this.isLifecycleSuspended()) {
      this.cancelScheduledFrame();
      this.running = false;
      this.clear();
      this.canvas.classList.add('is-suspended');
      return;
    }

    this.canvas.classList.remove('is-suspended');
    if (this.isReducedMotion() || this.isRouteTransitionPaused()) {
      this.cancelScheduledFrame();
      this.running = false;
      if (this.isReducedMotion()) {
        this.filteredVelocity = 0;
        this.targetVelocity = 0;
      }
      this.drawStaticFrame();
      return;
    }
    this.scheduleFrame({ immediate: true });
  }

  scheduleFrame({ immediate = false } = {}) {
    if (!this.started || this.isMotionPaused() || this.isReducedMotion()) return;
    if (this.animationFrame || this.frameTimer) return;
    const hasVelocity = Math.abs(this.targetVelocity) >= VELOCITY_EPSILON
      || Math.abs(this.filteredVelocity) >= VELOCITY_EPSILON;
    const targetOpacity = hasVelocity
      ? lerp(
        this.options.idleOpacity,
        this.options.fastOpacity,
        clamp(Math.abs(this.filteredVelocity || this.targetVelocity) / FULL_INTENSITY_VELOCITY, 0, 1)
      )
      : this.options.idleOpacity;
    const fading = Math.abs(this.opacity - targetOpacity) > OPACITY_EPSILON;
    if (!immediate && !hasVelocity && !fading) return;
    const requestFrame = () => {
      this.frameTimer = 0;
      this.animationFrame = window.requestAnimationFrame((timestamp) => this.tick(timestamp));
    };
    requestFrame();
  }

  cancelScheduledFrame() {
    if (this.animationFrame) window.cancelAnimationFrame(this.animationFrame);
    if (this.frameTimer) window.clearTimeout(this.frameTimer);
    this.animationFrame = 0;
    this.frameTimer = 0;
    this.lastFrameAt = 0;
  }

  tick(timestamp) {
    this.animationFrame = 0;
    if (!this.started || this.isMotionPaused() || this.isReducedMotion()) {
      this.syncLifecycle();
      return;
    }
    const previousTimestamp = this.lastFrameAt || timestamp;
    const dtMs = this.lastFrameAt ? clamp(timestamp - previousTimestamp, 1, 50) : 16.67;
    this.lastFrameAt = timestamp;
    const velocityAlpha = 1 - Math.exp(-dtMs / 72);
    this.filteredVelocity += (this.targetVelocity - this.filteredVelocity) * velocityAlpha;
    if (Math.abs(this.targetVelocity) < VELOCITY_EPSILON && Math.abs(this.filteredVelocity) < 0.01) {
      this.filteredVelocity = 0;
    }
    this.drawFrame(timestamp, dtMs / 1000);
    const hasVelocity = Math.abs(this.targetVelocity) >= VELOCITY_EPSILON
      || Math.abs(this.filteredVelocity) >= VELOCITY_EPSILON;
    const targetOpacity = hasVelocity
      ? lerp(
        this.options.idleOpacity,
        this.options.fastOpacity,
        clamp(Math.abs(this.filteredVelocity || this.targetVelocity) / FULL_INTENSITY_VELOCITY, 0, 1)
      )
      : this.options.idleOpacity;
    this.running = hasVelocity || Math.abs(this.opacity - targetOpacity) > OPACITY_EPSILON;
    this.scheduleFrame();
  }

  drawFrame(timestamp, dtSeconds) {
    if (!this.ctx || !this.width || !this.height || this.isLifecycleSuspended()) return;
    const absoluteVelocity = Math.abs(this.filteredVelocity);
    const intensity = clamp(absoluteVelocity / FULL_INTENSITY_VELOCITY, 0, 1);
    const targetOpacity = lerp(this.options.idleOpacity, this.options.fastOpacity, intensity);
    const opacityAlpha = dtSeconds > 0 ? 1 - Math.exp(-(dtSeconds * 1000) / 110) : 1;
    this.opacity += (targetOpacity - this.opacity) * opacityAlpha;
    if (this.opacity <= OPACITY_EPSILON && targetOpacity <= OPACITY_EPSILON) {
      this.opacity = 0;
      this.clear();
      this.frameCount += 1;
      this.drawCount += 1;
      this.canvas.__absAuditFrameCount = this.frameCount;
      this.canvas.__absAuditLastDrawAt = timestamp;
      return;
    }

    if (!this.isReducedMotion() && dtSeconds > 0) {
      const direction = absoluteVelocity >= VELOCITY_EPSILON ? -Math.sign(this.filteredVelocity) : this.lastDirection;
      if (absoluteVelocity >= VELOCITY_EPSILON) this.lastDirection = direction;
      const velocityTravel = absoluteVelocity
        * Math.max(240, this.width)
        * 0.048
        * this.options.motionResponse;
      const baseTravel = velocityTravel * dtSeconds;
      for (let index = 0; index < this.particles.length; index += 1) {
        const particle = this.particles[index];
        const travel = baseTravel * particle.speed;
        const previousArc = Math.cos(((particle.x / Math.max(1, this.width)) * Math.PI * 2) + particle.arcPhase)
          * particle.arcAmplitude;
        particle.x += direction * travel;
        const nextArc = Math.cos(((particle.x / Math.max(1, this.width)) * Math.PI * 2) + particle.arcPhase)
          * particle.arcAmplitude;
        particle.y += (nextArc - previousArc) + (travel * particle.drift);
        if (particle.x < -WRAP_PADDING) particle.x = this.width + WRAP_PADDING;
        else if (particle.x > this.width + WRAP_PADDING) particle.x = -WRAP_PADDING;
        if (particle.y < -WRAP_PADDING) particle.y = this.height + WRAP_PADDING;
        else if (particle.y > this.height + WRAP_PADDING) particle.y = -WRAP_PADDING;
      }
    }

    this.clear();
    this.ctx.globalAlpha = this.opacity;
    for (let colorIndex = 0; colorIndex < this.colors.length; colorIndex += 1) {
      this.ctx.fillStyle = this.colors[colorIndex];
      this.ctx.beginPath();
      for (let index = 0; index < this.particles.length; index += 1) {
        const particle = this.particles[index];
        if (particle.colorIndex !== colorIndex) continue;
        this.ctx.moveTo(particle.x + particle.radius, particle.y);
        this.ctx.arc(particle.x, particle.y, particle.radius, 0, Math.PI * 2);
      }
      this.ctx.fill();
    }
    this.ctx.globalAlpha = 1;
    if (this.maskGradient) {
      this.ctx.globalCompositeOperation = 'destination-in';
      this.ctx.fillStyle = this.maskGradient;
      this.ctx.fillRect(0, 0, this.width, this.height);
      this.ctx.globalCompositeOperation = 'source-over';
    }
    this.frameCount += 1;
    this.drawCount += 1;
    this.canvas.__absAuditFrameCount = this.frameCount;
    this.canvas.__absAuditLastDrawAt = timestamp;
  }

  getSnapshot() {
    const transitionPaused = this.isRouteTransitionPaused();
    const colorCounts = new Array(this.colors.length).fill(0);
    const roleCounts = Object.fromEntries(
      this.colorDistribution.map((row) => [row.roleId, 0]),
    );
    for (let index = 0; index < this.particles.length; index += 1) {
      const particle = this.particles[index];
      const colorIndex = particle?.colorIndex;
      if (Number.isInteger(colorIndex) && colorCounts[colorIndex] !== undefined) {
        colorCounts[colorIndex] += 1;
      }
      if (particle?.roleId && roleCounts[particle.roleId] !== undefined) {
        roleCounts[particle.roleId] += 1;
      }
    }
    return {
      active: this.started && !this.isLifecycleSuspended(),
      running: this.running,
      suspended: this.isLifecycleSuspended(),
      transitionPaused,
      reducedMotion: this.isReducedMotion(),
      targetVelocity: this.targetVelocity,
      filteredVelocity: this.filteredVelocity,
      opacity: this.opacity,
      visible: this.opacity > OPACITY_EPSILON,
      idleOpacity: this.options.idleOpacity,
      fastOpacity: this.options.fastOpacity,
      quietBandHeight: this.options.quietBandHeight,
      quietBandOpacity: this.options.quietBandOpacity,
      quietBandCenterY: this.options.quietBandCenterY,
      densityScale: this.options.densityScale,
      minRadiusPx: this.options.minRadiusPx,
      maxRadiusPx: this.options.maxRadiusPx,
      motionResponse: this.options.motionResponse,
      parallaxDepth: this.options.parallaxDepth,
      arcMotion: true,
      cadence: this.isReducedMotion() || transitionPaused
        ? 'static'
        : (Math.abs(this.targetVelocity) >= VELOCITY_EPSILON
          || Math.abs(this.filteredVelocity) >= VELOCITY_EPSILON ? 'motion' : 'idle'),
      scheduled: Boolean(this.animationFrame || this.frameTimer),
      particleCount: this.particles.length,
      palette: this.colors.slice(),
      paletteId: this.paletteId,
      paletteGeneration: this.paletteGeneration,
      colorDistribution: this.colorDistribution.map((row) => ({
        roleId: row.roleId,
        label: row.label,
        distributionIndex: row.distributionIndex,
        colorIndex: row.colorIndex,
        weight: row.weight,
      })),
      colorCounts,
      roleCounts,
      frameCount: this.frameCount,
      drawCount: this.drawCount,
      cssWidth: this.width,
      cssHeight: this.height,
      backingWidth: this.canvas?.width || 0,
      backingHeight: this.canvas?.height || 0,
      dpr: this.dpr,
    };
  }

  destroy() {
    this.started = false;
    this.cancelScheduledFrame();
    document.removeEventListener('visibilitychange', this.boundVisibilityChange);
    this.reducedMotionQuery?.removeEventListener?.('change', this.boundMotionPreferenceChange);
    this.transitionObserver?.disconnect();
    this.unsubscribePalette?.();
    this.unsubscribePalette = null;
    this.clear();
    this.particles.length = 0;
    this.colors.length = 0;
    this.colorDistribution.length = 0;
    this.paletteId = '';
    this.maskGradient = null;
    this.onSuspensionChange = null;
    this.canvas = null;
    this.ctx = null;
  }
}
