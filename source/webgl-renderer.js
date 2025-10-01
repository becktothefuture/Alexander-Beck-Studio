// ╔══════════════════════════════════════════════════════════════════════════════╗
// ║                         WEBGL RENDERER MODULE                                ║
// ║                    PixiJS-based high-performance renderer                    ║
// ║                          Phase 2.1: Foundation                               ║
// ╚══════════════════════════════════════════════════════════════════════════════╝

/**
 * WebGL Renderer using PixiJS for 120 FPS performance
 * 
 * Architecture:
 * - Parallel system alongside Canvas 2D
 * - Physics-independent (reads Ball positions only)
 * - Feature parity with Canvas 2D rendering
 * - Switchable via URL param: ?renderer=webgl
 * 
 * Validation Gates:
 * 1. PixiJS initialization
 * 2. Canvas dimension matching
 * 3. Ball sprite creation
 * 4. Position synchronization
 */

import * as PIXI from '../node_modules/pixi.js/dist/pixi.mjs';

// ═══════════════════════════════════════════════════════════════════════════
// RENDERER ABSTRACTION LAYER
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Base Renderer Interface
 * Both Canvas2D and WebGL renderers implement this
 */
class IRenderer {
  constructor(container, width, height, dpr) {
    this.container = container;
    this.width = width;
    this.height = height;
    this.dpr = dpr;
    this.isReady = false;
  }

  async initialize() {
    throw new Error('initialize() must be implemented');
  }

  resize(width, height, dpr) {
    throw new Error('resize() must be implemented');
  }

  clear() {
    throw new Error('clear() must be implemented');
  }

  drawBall(ball) {
    throw new Error('drawBall() must be implemented');
  }

  drawRoundedBoundary(width, height, radius) {
    throw new Error('drawRoundedBoundary() must be implemented');
  }

  render() {
    throw new Error('render() must be implemented');
  }

  destroy() {
    throw new Error('destroy() must be implemented');
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// CANVAS 2D RENDERER (Wrapper for existing code)
// ═══════════════════════════════════════════════════════════════════════════

class Canvas2DRenderer extends IRenderer {
  constructor(container, width, height, dpr) {
    super(container, width, height, dpr);
    this.canvas = null;
    this.ctx = null;
  }

  async initialize() {
    // Find or create canvas element
    this.canvas = this.container.querySelector('#c');
    if (!this.canvas) {
      this.canvas = document.createElement('canvas');
      this.canvas.id = 'c';
      this.container.appendChild(this.canvas);
    }

    this.ctx = this.canvas.getContext('2d', { alpha: false });
    this.resize(this.width, this.height, this.dpr);
    this.isReady = true;

    console.log('✅ Canvas2D Renderer initialized');
    return true;
  }

  resize(width, height, dpr) {
    this.width = width;
    this.height = height;
    this.dpr = dpr;

    if (this.canvas) {
      this.canvas.width = width * dpr;
      this.canvas.height = height * dpr;
      this.canvas.style.width = `${width}px`;
      this.canvas.style.height = `${height}px`;
      this.ctx.scale(dpr, dpr);
    }
  }

  clear() {
    if (this.ctx) {
      this.ctx.clearRect(0, 0, this.width, this.height);
    }
  }

  drawBall(ball) {
    // Delegate to existing Ball.draw() method
    ball.draw(this.ctx);
  }

  drawRoundedBoundary(width, height, radius) {
    if (!this.ctx || radius <= 0) return;

    this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
    this.ctx.lineWidth = 2;
    this.ctx.beginPath();
    this.ctx.moveTo(radius, 0);
    this.ctx.lineTo(width - radius, 0);
    this.ctx.arcTo(width, 0, width, radius, radius);
    this.ctx.lineTo(width, height - radius);
    this.ctx.arcTo(width, height, width - radius, height, radius);
    this.ctx.lineTo(radius, height);
    this.ctx.arcTo(0, height, 0, height - radius, radius);
    this.ctx.lineTo(0, radius);
    this.ctx.arcTo(0, 0, radius, 0, radius);
    this.ctx.closePath();
    this.ctx.stroke();
  }

  render() {
    // Rendering happens via drawBall() calls
    // No explicit render step needed for Canvas2D
  }

  destroy() {
    if (this.canvas && this.canvas.parentNode) {
      this.canvas.parentNode.removeChild(this.canvas);
    }
    this.canvas = null;
    this.ctx = null;
    this.isReady = false;
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// WEBGL RENDERER (PixiJS-based)
// ═══════════════════════════════════════════════════════════════════════════

class WebGLRenderer extends IRenderer {
  constructor(container, width, height, dpr) {
    super(container, width, height, dpr);
    this.app = null;
    this.ballSprites = new Map(); // Map<Ball, PIXI.Graphics>
    this.boundaryGraphics = null;
  }

  async initialize() {
    try {
      // Create PixiJS application
      this.app = new PIXI.Application({
        width: this.width,
        height: this.height,
        resolution: this.dpr,
        autoDensity: true,
        backgroundColor: 0xCECECE, // Match HTML background
        antialias: true,
        powerPreference: 'high-performance',
      });

      // Add canvas to container
      this.container.appendChild(this.app.view);
      this.app.view.id = 'c'; // Match Canvas2D id for CSS

      // Create container for ball sprites
      this.ballContainer = new PIXI.Container();
      this.app.stage.addChild(this.ballContainer);

      // Create boundary graphics
      this.boundaryGraphics = new PIXI.Graphics();
      this.app.stage.addChild(this.boundaryGraphics);

      this.isReady = true;
      console.log('✅ WebGL Renderer initialized (PixiJS)');
      console.log(`   Resolution: ${this.width}×${this.height} @ ${this.dpr}× DPR`);
      console.log(`   Renderer: ${this.app.renderer.type === PIXI.RENDERER_TYPE.WEBGL ? 'WebGL' : 'Canvas'}`);

      // Validation Gate 1: Check WebGL support
      if (this.app.renderer.type !== PIXI.RENDERER_TYPE.WEBGL) {
        console.warn('⚠️  WebGL not supported, falling back to Canvas');
        return false;
      }

      return true;
    } catch (error) {
      console.error('❌ WebGL Renderer initialization failed:', error);
      this.isReady = false;
      return false;
    }
  }

  resize(width, height, dpr) {
    this.width = width;
    this.height = height;
    this.dpr = dpr;

    if (this.app) {
      this.app.renderer.resize(width, height);
      this.app.renderer.resolution = dpr;
    }

    // Validation Gate 2: Verify dimensions match
    if (this.app) {
      const actualWidth = this.app.renderer.width / this.app.renderer.resolution;
      const actualHeight = this.app.renderer.height / this.app.renderer.resolution;
      
      if (Math.abs(actualWidth - width) > 1 || Math.abs(actualHeight - height) > 1) {
        console.warn(`⚠️  Dimension mismatch: expected ${width}×${height}, got ${actualWidth}×${actualHeight}`);
      }
    }
  }

  clear() {
    // PixiJS handles clearing automatically
    // We just need to clear our sprite map if balls are removed
  }

  /**
   * Create or update ball sprite
   * Validation Gate 3: Ball sprite creation
   */
  drawBall(ball) {
    let sprite = this.ballSprites.get(ball);

    // Create sprite if it doesn't exist
    if (!sprite) {
      sprite = new PIXI.Graphics();
      this.ballContainer.addChild(sprite);
      this.ballSprites.set(ball, sprite);
    }

    // Clear previous drawing
    sprite.clear();

    // Parse hex color to number
    const colorHex = ball.color.replace('#', '');
    const colorNum = parseInt(colorHex, 16);

    // Draw flat circle (roundness = 0 for Phase 2.1)
    sprite.beginFill(colorNum);
    sprite.drawCircle(0, 0, ball.r);
    sprite.endFill();

    // Update position (Validation Gate 4: Position sync)
    sprite.x = ball.x;
    sprite.y = ball.y;

    // Apply squash/stretch transformation (if ball is large enough)
    if (ball.r > 15 && ball.squashAmount > 0.001) {
      const s = 1 + ball.squashAmount;
      const inv = 1 / s;
      
      // Reset transform
      sprite.rotation = 0;
      sprite.scale.set(1, 1);
      
      // Apply squash
      sprite.rotation = ball.squashNormalAngle;
      sprite.scale.set(s, inv);
    } else {
      sprite.rotation = 0;
      sprite.scale.set(1, 1);
    }
  }

  drawRoundedBoundary(width, height, radius) {
    if (!this.boundaryGraphics || radius <= 0) return;

    this.boundaryGraphics.clear();
    this.boundaryGraphics.lineStyle(2, 0xFFFFFF, 0.1);

    // Draw rounded rectangle
    this.boundaryGraphics.drawRoundedRect(0, 0, width, height, radius);
  }

  render() {
    // PixiJS renders automatically on requestAnimationFrame
    // This method can be used for manual rendering if needed
    if (this.app) {
      this.app.renderer.render(this.app.stage);
    }
  }

  /**
   * Clean up ball sprites that are no longer in the balls array
   */
  cleanupSprites(activeBalls) {
    const activeSet = new Set(activeBalls);
    
    for (const [ball, sprite] of this.ballSprites.entries()) {
      if (!activeSet.has(ball)) {
        sprite.destroy();
        this.ballSprites.delete(ball);
      }
    }
  }

  destroy() {
    if (this.app) {
      // Clean up all sprites
      for (const sprite of this.ballSprites.values()) {
        sprite.destroy();
      }
      this.ballSprites.clear();

      // Destroy app
      this.app.destroy(true, { children: true, texture: true });
      this.app = null;
    }

    this.isReady = false;
    console.log('🗑️  WebGL Renderer destroyed');
  }

  /**
   * Performance diagnostics
   */
  getStats() {
    if (!this.app) return null;

    return {
      renderer: this.app.renderer.type === PIXI.RENDERER_TYPE.WEBGL ? 'WebGL' : 'Canvas',
      sprites: this.ballSprites.size,
      drawCalls: this.app.renderer.gl ? this.app.renderer.gl.getParameter(this.app.renderer.gl.DRAW_CALLS) : 'N/A',
      resolution: this.app.renderer.resolution,
      width: this.app.renderer.width,
      height: this.app.renderer.height,
    };
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// RENDERER FACTORY
// ═══════════════════════════════════════════════════════════════════════════

class RendererFactory {
  /**
   * Create renderer based on user preference or capability
   * @param {string} type - 'webgl' | 'canvas2d' | 'auto'
   */
  static async create(container, width, height, dpr, type = 'auto') {
    // Check URL parameter for forced renderer
    const urlParams = new URLSearchParams(window.location.search);
    const urlRenderer = urlParams.get('renderer');
    
    if (urlRenderer === 'canvas2d' || urlRenderer === 'canvas') {
      type = 'canvas2d';
      console.log('🎨 Forced Canvas2D via URL parameter');
    } else if (urlRenderer === 'webgl' || urlRenderer === 'gl') {
      type = 'webgl';
      console.log('🎨 Forced WebGL via URL parameter');
    }

    // Auto-detect best renderer
    if (type === 'auto') {
      // Try WebGL first, fallback to Canvas2D
      const webglSupported = await RendererFactory.checkWebGLSupport();
      type = webglSupported ? 'webgl' : 'canvas2d';
      console.log(`🎨 Auto-selected ${type.toUpperCase()} renderer`);
    }

    // Create requested renderer
    let renderer;
    
    if (type === 'webgl') {
      renderer = new WebGLRenderer(container, width, height, dpr);
      const success = await renderer.initialize();
      
      if (!success) {
        console.warn('⚠️  WebGL initialization failed, falling back to Canvas2D');
        renderer.destroy();
        renderer = new Canvas2DRenderer(container, width, height, dpr);
        await renderer.initialize();
      }
    } else {
      renderer = new Canvas2DRenderer(container, width, height, dpr);
      await renderer.initialize();
    }

    return renderer;
  }

  /**
   * Check if WebGL is supported
   */
  static async checkWebGLSupport() {
    try {
      const canvas = document.createElement('canvas');
      const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
      return !!gl;
    } catch (e) {
      return false;
    }
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// VALIDATION TESTS
// ═══════════════════════════════════════════════════════════════════════════

class RendererValidator {
  /**
   * Run validation tests on a renderer
   */
  static async validate(renderer) {
    console.log('🔍 Running renderer validation tests...');
    
    const tests = [
      this.testInitialization(renderer),
      this.testDimensions(renderer),
      this.testBallRendering(renderer),
    ];

    const results = await Promise.all(tests);
    const passed = results.filter(r => r.passed).length;
    const total = results.length;

    console.log(`📊 Validation: ${passed}/${total} tests passed`);
    
    return { passed, total, results };
  }

  static async testInitialization(renderer) {
    const test = { name: 'Initialization', passed: false, message: '' };
    
    if (renderer.isReady) {
      test.passed = true;
      test.message = '✅ Renderer initialized successfully';
    } else {
      test.message = '❌ Renderer not ready';
    }
    
    console.log(test.message);
    return test;
  }

  static async testDimensions(renderer) {
    const test = { name: 'Dimensions', passed: false, message: '' };
    
    if (renderer.width > 0 && renderer.height > 0) {
      test.passed = true;
      test.message = `✅ Valid dimensions: ${renderer.width}×${renderer.height}`;
    } else {
      test.message = `❌ Invalid dimensions: ${renderer.width}×${renderer.height}`;
    }
    
    console.log(test.message);
    return test;
  }

  static async testBallRendering(renderer) {
    const test = { name: 'Ball Rendering', passed: false, message: '' };
    
    try {
      // Create a mock ball
      const mockBall = {
        x: 100,
        y: 100,
        r: 20,
        color: '#FF6B6B',
        squashAmount: 0,
        squashNormalAngle: 0,
      };

      // Try to draw it
      renderer.drawBall(mockBall);
      
      test.passed = true;
      test.message = '✅ Ball rendering works';
    } catch (error) {
      test.message = `❌ Ball rendering failed: ${error.message}`;
    }
    
    console.log(test.message);
    return test;
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// EXPORTS
// ═══════════════════════════════════════════════════════════════════════════

export {
  IRenderer,
  Canvas2DRenderer,
  WebGLRenderer,
  RendererFactory,
  RendererValidator,
};

