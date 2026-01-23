// ╔══════════════════════════════════════════════════════════════════════════════╗
// ║                       PARALLAX SLIDER BACKGROUND                             ║
// ║                                                                              ║
// ║  A vast, sparse field of dots at different depths that creates a parallax   ║
// ║  effect tied to the portfolio slider's scroll position.                     ║
// ║                                                                              ║
// ║  Features:                                                                   ║
// ║  - Truly infinite horizontal scrolling (expands on demand)                  ║
// ║  - Recycling: off-screen dots are repositioned ahead of scroll direction    ║
// ║  - Uses same weighted color distribution as index page                      ║
// ║  - Multiple depth layers for parallax effect                                ║
// ║  - All parameters adjustable via dev panel                                  ║
// ╚══════════════════════════════════════════════════════════════════════════════╝

import { pickRandomColorWithIndex, getCurrentPalette } from '../visual/colors.js';

const DEFAULT_CONFIG = {
  enabled: true,
  dotCount: 180,             // Number of dots (recycled for performance)
  bufferZoneVw: 3,           // Buffer zone in viewport widths on each side
  parallaxSpeedMul: 0.18,    // Speed relative to slider (slower = more subtle)
  dotSizeMin: 2,             // Minimum dot radius in pixels (starfield: uniform small)
  dotSizeMax: 4,             // Maximum dot radius in pixels (starfield: uniform small)
  verticalSpread: 2.0,       // Vertical spread multiplier (1 = viewport height)
  driftSpeed: 6,             // Drift speed in pixels/second (subtle cosmic drift)
  zNear: 0,                  // Near depth (0 = front)
  zFar: 2000,                // Far depth (extended for starfield)
  focalLength: 300,          // Perspective strength (lower = more dramatic parallax)
  opacityNear: 1.0,          // Opacity for near dots
  opacityFar: 0.2,           // Opacity for far dots
  randomness: 0.3,           // Position randomness (0 = grid, 1 = chaos)
};

export class ParallaxSliderBackground {
  constructor(canvas, config = {}) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d', { alpha: true });
    this.config = { ...DEFAULT_CONFIG, ...config };
    
    this.dots = [];
    
    // Default colors - synced from palette on init
    this.colors = [];
    this.colorDistribution = null; // Will be set from globals
    
    // Animation state
    this.rafId = null;
    this.lastTime = 0;
    this.scrollOffset = 0;
    this.targetScrollOffset = 0;
    this.time = 0;
    
    // Track accumulated scroll for infinite expansion
    this.totalScrollOffset = 0;
    
    // Viewport cache
    this.vw = 0;
    this.vh = 0;
    this.dpr = Math.min(2, window.devicePixelRatio || 1);
    
    this.prefersReducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches ?? false;
    
    this._boundResize = this._resize.bind(this);
    this._boundAnimate = this._animate.bind(this);
  }

  init() {
    window.addEventListener('resize', this._boundResize, { passive: true });
    
    // Sync colors from palette system
    this._syncColorsFromPalette();
    
    this._resize();
    this._createDots();
    this.start();
  }

  /**
   * Sync colors from the global palette system (same as index page)
   */
  _syncColorsFromPalette() {
    try {
      const palette = getCurrentPalette();
      if (palette && Array.isArray(palette) && palette.length > 0) {
        this.colors = [...palette];
      }
    } catch (e) {
      // Fallback colors if palette not available
      this.colors = [
        '#b5b7b6', '#bbbdbd', '#ffffff', '#00695c',
        '#000000', '#00897b', '#0d5cb6', '#ffa000'
      ];
    }
  }

  /**
   * Pick a color using the same weighted distribution as the index page
   */
  _pickColor() {
    try {
      const { color } = pickRandomColorWithIndex();
      return color;
    } catch (e) {
      // Fallback to random from local colors
      return this.colors[Math.floor(Math.random() * this.colors.length)] || '#ffffff';
    }
  }

  updateConfig(newConfig) {
    const prevCount = this.config.dotCount;
    const wasEnabled = this.config.enabled;
    this.config = { ...this.config, ...newConfig };
    
    // Handle enable/disable
    if (newConfig.enabled !== undefined && newConfig.enabled !== wasEnabled) {
      if (this.config.enabled) {
        this.start();
      } else {
        this.stop();
        this._clearCanvas();
      }
    }
    
    // Recreate dots if count changed
    if (newConfig.dotCount !== undefined && newConfig.dotCount !== prevCount) {
      this._createDots();
    }
  }

  updateScroll(wheelRotation, wheelStep) {
    // Convert wheel rotation to scroll offset in pixels
    // More linear mapping: rotation directly to viewport widths
    const scrollPerRotation = this.vw * 1.5;
    const newTarget = -wheelRotation * scrollPerRotation / (Math.PI * 2);
    
    // Track total scroll for infinite field
    this.targetScrollOffset = newTarget;
  }

  start() {
    if (this.rafId || !this.config.enabled) return;
    this.lastTime = performance.now();
    this.rafId = requestAnimationFrame(this._boundAnimate);
  }

  stop() {
    if (this.rafId) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
  }

  destroy() {
    this.stop();
    window.removeEventListener('resize', this._boundResize);
    this.dots = [];
  }

  _clearCanvas() {
    if (this.ctx && this.canvas) {
      this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    }
  }

  _resize() {
    const rect = this.canvas.getBoundingClientRect();
    this.vw = rect.width;
    this.vh = rect.height;
    
    // Resize canvas buffer
    const w = Math.ceil(this.vw * this.dpr);
    const h = Math.ceil(this.vh * this.dpr);
    
    if (this.canvas.width !== w) this.canvas.width = w;
    if (this.canvas.height !== h) this.canvas.height = h;
  }

  _createDots() {
    this.dots = [];
    
    const { dotCount, dotSizeMin, dotSizeMax, zNear, zFar, verticalSpread, bufferZoneVw, randomness } = this.config;
    
    // Initial field spans viewport plus buffer zones on each side
    const fieldWidth = this.vw * (1 + bufferZoneVw * 2);
    const fieldHeight = this.vh * verticalSpread;
    const startX = -this.vw * bufferZoneVw;
    
    for (let i = 0; i < dotCount; i++) {
      this._createDot(startX, fieldWidth, fieldHeight);
    }
    
    // Sort back to front for proper layering
    this.dots.sort((a, b) => b.z - a.z);
  }

  _createDot(startX = 0, fieldWidth = null, fieldHeight = null) {
    const { dotSizeMin, dotSizeMax, zNear, zFar, verticalSpread, bufferZoneVw } = this.config;
    
    const fw = fieldWidth ?? this.vw * (1 + bufferZoneVw * 2);
    const fh = fieldHeight ?? this.vh * verticalSpread;
    const sx = startX ?? -this.vw * bufferZoneVw;
    
    // Random position
    const x = sx + Math.random() * fw;
    const y = (Math.random() - 0.5) * fh;
    
    // Z depth - uniform distribution for starfield
    const z = zNear + Math.random() * (zFar - zNear);
    
    // Starfield: uniform random size (NOT scaled by depth)
    // This creates the spacefield effect where all dots look similar
    const size = dotSizeMin + Math.random() * (dotSizeMax - dotSizeMin);
    
    // Drift parameters for subtle cosmic movement
    const driftPhase = Math.random() * Math.PI * 2;
    const driftAmplitudeX = 10 + Math.random() * 20;
    const driftAmplitudeY = 5 + Math.random() * 15;
    
    const dot = {
      x,
      y,
      z,
      baseX: x, // Original X for recycling calculations
      size,
      driftPhase,
      driftAmplitudeX,
      driftAmplitudeY,
      color: this._pickColor(),
    };
    
    this.dots.push(dot);
    return dot;
  }

  /**
   * Recycle a dot by repositioning it ahead of the scroll direction
   */
  _recycleDot(dot, scrollDirection) {
    const { bufferZoneVw, verticalSpread, dotSizeMin, dotSizeMax } = this.config;
    
    // Position ahead of scroll direction
    if (scrollDirection > 0) {
      // Scrolling right: recycle to the left edge
      dot.x = this.scrollOffset - this.vw * bufferZoneVw + Math.random() * this.vw * 0.5;
    } else {
      // Scrolling left: recycle to the right edge
      dot.x = this.scrollOffset + this.vw * (1 + bufferZoneVw) - Math.random() * this.vw * 0.5;
    }
    
    dot.baseX = dot.x;
    
    // Randomize Y within vertical spread
    dot.y = (Math.random() - 0.5) * this.vh * verticalSpread;
    
    // Starfield: uniform random size (NOT scaled by depth)
    dot.size = dotSizeMin + Math.random() * (dotSizeMax - dotSizeMin);
    dot.driftPhase = Math.random() * Math.PI * 2;
    dot.color = this._pickColor();
  }

  _animate(now) {
    if (!this.config.enabled) {
      this.rafId = null;
      return;
    }
    
    const dt = Math.min(0.1, (now - this.lastTime) / 1000);
    this.lastTime = now;
    this.time += dt;
    
    // Track scroll direction before easing
    const scrollDelta = this.targetScrollOffset - this.scrollOffset;
    const scrollDirection = Math.sign(scrollDelta);
    
    // Smooth easing towards target scroll
    const ease = 0.08;
    this.scrollOffset += scrollDelta * ease;
    
    this._update(dt, scrollDirection);
    this._render();
    
    this.rafId = requestAnimationFrame(this._boundAnimate);
  }

  _update(dt, scrollDirection) {
    const { driftSpeed, bufferZoneVw } = this.config;
    
    // Calculate visible bounds with buffer
    const visibleLeft = this.scrollOffset - this.vw * bufferZoneVw;
    const visibleRight = this.scrollOffset + this.vw * (1 + bufferZoneVw);
    
    for (const dot of this.dots) {
      // Apply gentle drift
      if (!this.prefersReducedMotion && driftSpeed > 0) {
        const driftX = Math.sin(this.time * 0.25 + dot.driftPhase) * dot.driftAmplitudeX * 0.008;
        const driftY = Math.cos(this.time * 0.18 + dot.driftPhase * 1.3) * dot.driftAmplitudeY * 0.008;
        dot.x += driftX * driftSpeed * dt;
        dot.y += driftY * driftSpeed * dt;
      }
      
      // Recycle dots that have scrolled out of view
      if (dot.x < visibleLeft - dot.size * 2 || dot.x > visibleRight + dot.size * 2) {
        this._recycleDot(dot, scrollDirection);
      }
    }
  }

  _render() {
    const { ctx, canvas, vw, vh, dpr } = this;
    const { zNear, zFar, focalLength, opacityNear, opacityFar, parallaxSpeedMul } = this.config;
    
    if (!ctx || vw <= 0 || vh <= 0 || !this.config.enabled) return;
    
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.save();
    ctx.scale(dpr, dpr);
    
    const centerX = vw / 2;
    const centerY = vh / 2;
    
    for (const dot of this.dots) {
      const depthFactor = (dot.z - zNear) / (zFar - zNear);
      
      // Parallax: near dots move more with scroll, far dots move less
      const parallaxMul = 1 - depthFactor * 0.85;
      
      // Calculate screen X with parallax offset
      const worldX = dot.x - this.scrollOffset * parallaxMul * parallaxSpeedMul;
      
      // Perspective projection
      const scale = focalLength / (focalLength + dot.z);
      
      // Screen position
      const screenX = centerX + (worldX - this.scrollOffset - centerX) * scale + this.scrollOffset;
      const screenY = centerY + dot.y * scale;
      
      // Skip dots outside visible area (with generous buffer)
      const maxSize = dot.size * scale * 2;
      if (screenX < -maxSize || screenX > vw + maxSize || 
          screenY < -maxSize || screenY > vh + maxSize) {
        continue;
      }
      
      // Size with perspective
      const radius = Math.max(1.5, dot.size * scale);
      
      // Opacity based on depth
      const opacity = opacityFar + (1 - depthFactor) * (opacityNear - opacityFar);
      
      // Draw dot
      ctx.beginPath();
      ctx.arc(screenX, screenY, radius, 0, Math.PI * 2);
      ctx.fillStyle = this._colorWithOpacity(dot.color, opacity);
      ctx.fill();
    }
    
    ctx.restore();
  }

  _colorWithOpacity(color, opacity) {
    // Handle hex colors
    if (color && color.startsWith('#')) {
      const hex = color.slice(1);
      if (hex.length >= 6) {
        const r = parseInt(hex.slice(0, 2), 16);
        const g = parseInt(hex.slice(2, 4), 16);
        const b = parseInt(hex.slice(4, 6), 16);
        return `rgba(${r}, ${g}, ${b}, ${opacity.toFixed(3)})`;
      }
    }
    
    // Handle rgba colors
    if (color) {
      const match = color.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/);
      if (match) {
        const r = match[1];
        const g = match[2];
        const b = match[3];
        const a = match[4] ? parseFloat(match[4]) : 1;
        return `rgba(${r}, ${g}, ${b}, ${(a * opacity).toFixed(3)})`;
      }
    }
    
    return color || `rgba(255, 255, 255, ${opacity.toFixed(3)})`;
  }

  /**
   * Update colors from external palette change
   */
  updateColors(colors) {
    if (!Array.isArray(colors) || colors.length === 0) return;
    this.colors = colors.filter(c => c && typeof c === 'string');
    
    // Re-pick colors for all dots using weighted distribution
    for (const dot of this.dots) {
      dot.color = this._pickColor();
    }
  }

  /**
   * Refresh colors from the palette system
   */
  refreshPalette() {
    this._syncColorsFromPalette();
    for (const dot of this.dots) {
      dot.color = this._pickColor();
    }
  }
}

export function createParallaxSliderBackground(canvas, config = {}) {
  const instance = new ParallaxSliderBackground(canvas, config);
  instance.init();
  return instance;
}
