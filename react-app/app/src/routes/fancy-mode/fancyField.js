import { normalizeFancyConfig } from './fancyConfig.js';
import { SPRITE_SIZE } from './fancyPatterns.js';
import { FANCY_SIMULATION_PROFILES, FANCY_UNADAPTED_PROFILE } from './fancySimulationProfiles.js';

const MAX_CELLS = 24000;
const MAX_RIPPLES = 8;
const clamp01 = (value) => Math.max(0, Math.min(1, value));

function areaClearance(x, y, area, feather, strength) {
  const edge = Math.max(0, area.left - x, x - area.right, area.top - y, y - area.bottom) / feather;
  return edge >= 1 ? 1 : 1 - strength * (1 - edge * edge * (3 - 2 * edge));
}

export class FancyField {
  constructor({ patterns, getPalette, getSimulation = () => 'pit', onFrame = () => {}, config }) {
    this.config = normalizeFancyConfig(config);
    this.enabled = this.config.fancy;
    this.getPalette = getPalette;
    this.getSimulation = getSimulation;
    this.patterns = patterns;
    this.onFrame = onFrame;
    this.ripples = [];
    this.title = null;
    this.legend = null;
    this.copyRegions = [];
    this.clearanceDirty = true;
    this.lastTime = 0;
    this.time = 0;
    this.lastPointerTime = 0;
    this.pointerX = null;
    this.pointerY = null;
    this.width = 0;
    this.height = 0;
    this.stats = { frames: 0, cells: 0, visibleCells: 0, particles: 0, frameMs: 0 };
    this.reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
    this.drawLegacyBody = (ctx, ball, radius) => {
      this.particle(ball.x, ball.y, radius, ball.color, ctx.globalAlpha, ball.distributionIndex);
    };
  }

  configure(config) {
    this.clearanceDirty = true;
    this.config = normalizeFancyConfig({ ...this.config, ...config });
    this.enabled = this.config.fancy;
    this.ripples = this.ripples.filter((ripple) => this.allowsRipple(ripple.source));
    if (!this.enabled) this.ripples.length = 0;
  }

  allowsRipple(source) {
    if (this.config.rippleStrength <= 0) return false;
    if (source === 'touch') return this.config.touchRipples;
    if (source === 'mouse') return this.config.mouseRipples;
    if (source === 'intro') return this.config.introRipple;
    return true;
  }

  ripple(x = this.width * 0.5, y = this.height * 0.64, strength = 1, source = 'manual') {
    if (this.reducedMotion || !this.enabled || !this.allowsRipple(source)) return;
    if (this.ripples.length >= MAX_RIPPLES) this.ripples.shift();
    this.ripples.push({ x, y, born: performance.now() / 1000, strength, source });
    window.dispatchEvent(new Event('abs:simulation-presentation-changed'));
  }

  pointer(x, y, down = false, source = 'mouse') {
    if (!this.allowsRipple(source)) return;
    const now = performance.now();
    if (down || (now - this.lastPointerTime > 90
      && (this.pointerX === null || Math.hypot(x - this.pointerX, y - this.pointerY) > 26))) {
      this.ripple(x, y, down ? 1 : 0.72, source);
      this.lastPointerTime = now;
      this.pointerX = x;
      this.pointerY = y;
    }
  }

  beginFrame(ctx, dpr, coordinateScale = dpr) {
    this.frameStart = performance.now();
    this.stats.renderer = 'canvas-grid';
    this.patterns.update(this.getPalette(), this.config.dark, this.config.family, this.config.followPalette);
    this.dpr = dpr;
    this.coordinateScale = coordinateScale;
    this.width = ctx.canvas.width / dpr;
    this.height = ctx.canvas.height / dpr;
    if (this.canvas !== ctx.canvas) {
      this.cols = null;
      this.lastTime = 0;
      this.ripples.length = 0;
    }
    this.canvas = ctx.canvas;
    const mode = this.canvas.id === 'flock-of-birds-canvas' ? 'flock-of-birds'
      : this.canvas.id === 'repel-room-canvas' ? 'repel-room' : this.getSimulation();
    this.profile = (this.config.adaptSimulation && FANCY_SIMULATION_PROFILES[mode]) || FANCY_UNADAPTED_PROFILE;
    this.stats.profile = this.config.adaptSimulation ? mode : 'unadapted';
    this.onFrame();
    const requestedCell = this.config.cell || (this.width <= 600 ? 7 : 9);
    const cell = Math.max(requestedCell, Math.sqrt(this.width * this.height / MAX_CELLS));
    const cols = Math.ceil(this.width / cell);
    const rows = Math.ceil(this.height / cell);
    if (cols !== this.cols || rows !== this.rows || cell !== this.cell) {
      this.cell = cell;
      this.cols = cols;
      this.rows = rows;
      const count = cols * rows;
      this.density = new Float32Array(count);
      this.strongest = new Float32Array(count);
      this.presence = new Float32Array(count);
      this.previous = new Float32Array(count);
      this.energy = new Float32Array(count);
      this.offsetX = new Float32Array(count);
      this.offsetY = new Float32Array(count);
      this.clearance = new Float32Array(count);
      this.clearanceDirty = true;
      this.roles = new Uint8Array(count);
      this.transitions = new Float32Array(count);
      this.patternScale = null;
      this.stats.cells = count;
    }
    if (this.patternScale !== this.config.patternScale) {
      this.patternScale = this.config.patternScale;
      const scale = this.patternScale;
      for (let row = 0; row < rows; row += 1) {
        for (let col = 0; col < cols; col += 1) {
          const band = Math.sin(col / scale * 0.17 + Math.sin(row / scale * 0.075) * 2.8)
            + Math.cos(row / scale * 0.21 + col / scale * 0.046);
          const index = row * cols + col;
          // Only a small, stable subset can soften into discs. The other cells
          // always use their expertise pattern, even after motion settles.
          const seed = (Math.imul(col + 1, 374761393) ^ Math.imul(row + 1, 668265263)) >>> 0;
          this.transitions[index] = seed % 100 < 16 ? (band + 2) / 4 : -1;
          this.roles[index] = this.patterns.wakeRoles[Math.floor((band + 2) * 1.99) % this.patterns.wakeRoles.length];
        }
      }
    }
    this.time = this.frameStart / 1000;
    this.dt = Math.min(0.05, Math.max(0.001, this.time - (this.lastTime || this.time - 1 / 60)));
    this.lastTime = this.time;
    this.density.fill(0);
    this.strongest.fill(0);
    this.followMotion = this.config.gridLock < 1;
    if (this.followMotion) {
      this.offsetX.fill(0);
      this.offsetY.fill(0);
    }
    this.stats.particles = 0;
    while (this.ripples.length && this.time - this.ripples[0].born > this.config.rippleLife) this.ripples.shift();
  }

  particle(sourceX, sourceY, sourceRadius, color, alpha = 1, distributionIndex = -1) {
    const x = sourceX / this.coordinateScale;
    const y = sourceY / this.coordinateScale;
    const radius = sourceRadius / this.coordinateScale;
    if (radius < 0.1 || alpha < 0.01) return;
    this.stats.particles += 1;
    // A small, soft support kernel connects neighbouring bodies into a textile.
    // It changes only visible coverage; simulation radii and collisions stay exact.
    const support = Math.max(radius * this.config.coverage * this.profile.coverage + this.cell * 0.65,
      this.cell * this.profile.minSupport);
    const invRadiusSq = 1 / (support * support);
    const minCol = Math.max(0, Math.floor((x - support) / this.cell));
    const maxCol = Math.min(this.cols - 1, Math.floor((x + support) / this.cell));
    const minRow = Math.max(0, Math.floor((y - support) / this.cell));
    const maxRow = Math.min(this.rows - 1, Math.floor((y + support) / this.cell));
    const roleIndex = this.patterns.resolveRole(distributionIndex, color);
    for (let row = minRow; row <= maxRow; row += 1) {
      const dy = (row + 0.5) * this.cell - y;
      for (let col = minCol; col <= maxCol; col += 1) {
        const dx = (col + 0.5) * this.cell - x;
        const distance = (dx * dx + dy * dy) * invRadiusSq;
        if (distance >= 1) continue;
        const weight = (1 - distance) * (1 - distance) * alpha;
        const index = row * this.cols + col;
        this.density[index] += weight;
        if (this.followMotion) {
          this.offsetX[index] -= dx * weight;
          this.offsetY[index] -= dy * weight;
        }
        if (weight > this.strongest[index]) {
          this.strongest[index] = weight;
          this.roles[index] = roleIndex;
        }
      }
    }
  }

  updateClearance() {
    if (!this.clearanceDirty) return;
    this.clearanceDirty = false;
    this.clearance.fill(1);
    if (this.config.artwork) return;
    // Layout and typography stay still between measurements. Cache their mask
    // once instead of testing every title/legend/copy region on every frame.
    for (let row = 0; row < this.rows; row += 1) {
      const y = (row + 0.5) * this.cell;
      for (let col = 0; col < this.cols; col += 1) {
        const x = (col + 0.5) * this.cell;
        let clearance = 1;
        if (this.title) {
          const distance = ((x - this.title.x) / this.title.rx) ** 4 + ((y - this.title.y) / this.title.ry) ** 4;
          if (distance < 1) clearance *= 1 - this.config.titleClearance * (1 - distance * distance * (3 - 2 * distance));
        }
        if (this.legend) clearance *= areaClearance(x, y, this.legend, this.cell * 2, 0.84);
        if (this.config.copyClearance > 0) {
          for (let i = 0; i < this.copyRegions.length; i += 1) {
            clearance *= areaClearance(x, y, this.copyRegions[i], this.cell * 2, this.config.copyClearance);
          }
        }
        this.clearance[row * this.cols + col] = clearance;
      }
    }
  }

  endFrame(ctx) {
    this.updateClearance();
    const attack = 1 - Math.exp(-this.dt * 20);
    const wake = this.config.wake * this.profile.wake;
    const release = wake === 0 ? 1 : 1 - Math.exp(-this.dt * 5.5 / wake);
    const energyDecay = wake === 0 ? 0 : Math.exp(-this.dt * 2.7 / wake);
    const follow = (1 - this.config.gridLock) * 0.4;
    const richness = this.config.richness;
    let visible = 0;
    let unsettled = false;
    ctx.save();
    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    ctx.globalCompositeOperation = 'source-over';
    ctx.imageSmoothingEnabled = true;
    for (let row = 0; row < this.rows; row += 1) {
      const y = (row + 0.5) * this.cell;
      for (let col = 0; col < this.cols; col += 1) {
        const index = row * this.cols + col;
        const x = (col + 0.5) * this.cell;
        let wave = 0;
        for (let ri = 0; ri < this.ripples.length; ri += 1) {
          const ripple = this.ripples[ri];
          const age = this.time - ripple.born;
          const distance = Math.hypot(x - ripple.x, y - ripple.y);
          const band = 1 - Math.abs(distance - age * this.config.rippleSpeed) / this.config.rippleWidth;
          if (band > 0) wave += band * band * Math.exp(-age * 3.12 / this.config.rippleLife) * ripple.strength * this.config.rippleStrength;
        }
        const density = Math.min(1.5, this.density[index]);
        const movement = this.reducedMotion ? 0 : Math.abs(density - this.previous[index]);
        this.previous[index] = density;
        this.energy[index] = Math.max(this.energy[index] * energyDecay, movement * 2.5 * this.config.motionResponse, wave);
        // Waves can briefly reveal tiny marks in the empty water, then disappear.
        const target = clamp01(density * 1.2 + wave * this.config.reveal) * this.clearance[index];
        const oldPresence = this.presence[index];
        const presence = this.reducedMotion || this.config.wake === 0 ? target
          : oldPresence + (target - oldPresence) * (target > oldPresence ? attack : release);
        this.presence[index] = presence;
        if (Math.abs(presence - target) > 0.003 || this.energy[index] > 0.02) unsettled = true;
        if (presence < 0.045) continue;
        visible += 1;
        const size = this.cell * this.config.fill * Math.min(1, Math.sqrt(presence) * 1.14);
        const role = this.roles[index];
        const shape = this.config.shape === -1 ? this.patterns.roleShapes[role] : this.config.shape;
        const blend = shape === 0 || this.transitions[index] < 0 ? 1
          : clamp01(richness * 0.85 + this.energy[index] * 0.55 + density * 0.12 - this.transitions[index] * 0.6);
        const pigment = this.patterns.rolePigments[role];
        const opacity = Math.min(1, presence * 3.5) * this.config.opacity;
        // A bounded shift towards the sampled bodies adds continuity without
        // drawing a second layer of balls or allowing unbounded displacement.
        const rawDensity = this.density[index];
        const drawX = x + (this.followMotion && rawDensity > 0.001
          ? Math.max(-this.cell, Math.min(this.cell, this.offsetX[index] / rawDensity)) * follow : 0);
        const drawY = y + (this.followMotion && rawDensity > 0.001
          ? Math.max(-this.cell, Math.min(this.cell, this.offsetY[index] / rawDensity)) * follow : 0);
        if (blend < 1) {
          ctx.globalAlpha = opacity * (1 - blend);
          ctx.drawImage(this.patterns.atlas, 0, pigment * SPRITE_SIZE, SPRITE_SIZE, SPRITE_SIZE,
            drawX - size / 2, drawY - size / 2, size, size);
        }
        if (blend > 0) {
          ctx.globalAlpha = opacity * blend;
          ctx.drawImage(this.patterns.atlas, shape * SPRITE_SIZE, pigment * SPRITE_SIZE, SPRITE_SIZE, SPRITE_SIZE,
            drawX - size / 2, drawY - size / 2, size, size);
        }
      }
    }
    ctx.restore();
    this.stats.frames += 1;
    this.stats.visibleCells = visible;
    this.needsAnimation = !this.reducedMotion && (unsettled || this.ripples.length > 0);
    this.stats.frameMs = this.stats.frameMs * 0.94 + (performance.now() - this.frameStart) * 0.06;
  }
}
