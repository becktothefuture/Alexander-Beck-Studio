// ╔══════════════════════════════════════════════════════════════════════════════╗
// ║                    CYLINDER BACKGROUND SIMULATION                            ║
// ║         Spinning cylinder effect synced with carousel rotation               ║
// ╚══════════════════════════════════════════════════════════════════════════════╝

import { pickRandomColor } from '../visual/colors.js';
import { getGlobals } from '../core/state.js';
import { getMobileAdjustedCount } from '../core/state.js';

export class CylinderBackground {
  constructor(portfolioApp, config = {}) {
    this.app = portfolioApp; // Reference to PortfolioApp for wheelRotation
    this.config = {
      enabled: config.enabled !== false,
      ringCount: config.ringCount ?? 12,
      dotsPerRing: config.dotsPerRing ?? 24,
      depthRange: config.depthRange ?? 1000,
      radiusMin: config.radiusMin ?? 100,
      radiusMax: config.radiusMax ?? 500,
      radiusStep: config.radiusStep ?? 80, // Spacing between concentric rings
      radiusRings: config.radiusRings ?? 5, // Number of concentric rings extending outward
      verticalSpacing: config.verticalSpacing ?? 60, // Vertical spacing between rings
      randomness: config.randomness ?? 0.2,
      dotSize: config.dotSize ?? 3,
      opacityMin: config.opacityMin ?? 0.15,
      opacityMax: config.opacityMax ?? 0.9,
      rotationSync: config.rotationSync ?? 1.0,
      gridPattern: config.gridPattern ?? 'even', // 'even' or 'spiral'
    };
    
    this.container = null;
    this.dotElements = [];
    this.dots = [];
    this.animationFrame = null;
    this.lastRotation = 0;
  }

  initialize() {
    if (!this.config.enabled) return;
    
    try {
      // Wait for rig to be created (it's created in renderSlides)
      const sliderRig = this.app?.rig || document.querySelector('.slider-rig');
      const sliderTrack = document.getElementById('track') || document.querySelector('.slider-track');
      
      if (!sliderTrack) {
        console.warn('⚠️ CylinderBackground: .slider-track not found');
        return;
      }

      // Create container for cylinder dots - positioned in same 3D space as slides
      this.container = document.createElement('div');
      this.container.className = 'cylinder-dots-container';
      this.container.setAttribute('aria-hidden', 'true');
      this.container.style.cssText = `
        position: absolute;
        left: 50%;
        top: 50%;
        width: 1px;
        height: 1px;
        overflow: visible;
        transform-style: preserve-3d;
        pointer-events: none;
        z-index: 0;
      `;

      // Insert into slider-track (same parent as slider-rig) so it shares the same 3D perspective
      // Add after rig if it exists, otherwise just append to track
      if (sliderRig && sliderRig.nextSibling) {
        sliderTrack.insertBefore(this.container, sliderRig.nextSibling);
      } else {
        sliderTrack.appendChild(this.container);
      }

      this.dotElements = [];
      this.generateDots();
      this.startAnimation();
    } catch (error) {
      console.error('⚠️ CylinderBackground initialization error:', error);
      // Don't break the page if initialization fails
    }
  }

  generateDots() {
    if (!this.container) return;
    
    try {
      this.dots = [];
      const viewport = this.app?.viewport;
      if (!viewport) {
        console.warn('⚠️ CylinderBackground: viewport not available yet');
        return;
      }

      const viewportWidth = viewport.clientWidth || window.innerWidth;
      const viewportHeight = viewport.clientHeight || window.innerHeight;

      if (viewportWidth <= 0 || viewportHeight <= 0) {
        console.warn('⚠️ CylinderBackground: invalid viewport dimensions');
        return;
      }

      // Mobile scaling
      const ringCount = Math.max(1, getMobileAdjustedCount(this.config.ringCount || 12));
      const dotsPerRing = Math.max(1, getMobileAdjustedCount(this.config.dotsPerRing || 24));
      const radiusRings = Math.max(1, getMobileAdjustedCount(this.config.radiusRings || 5));

      // 3D Grid Parameters
      // Vertical spacing: even spacing between rings along Y-axis
      const verticalSpacing = Math.max(1, this.config.verticalSpacing || 60);
      const verticalStart = -viewportHeight * 0.5;
      const verticalEnd = viewportHeight * 0.5;
      const verticalRange = verticalEnd - verticalStart;
      const verticalRingCount = Math.max(1, Math.floor(verticalRange / verticalSpacing));

      // Radial spacing: concentric rings extending outward
      const radiusStep = Math.max(1, this.config.radiusStep || 80);
      const radiusStart = Math.max(1, this.config.radiusMin || 100);
      const radiusEnd = radiusStart + (radiusRings - 1) * radiusStep;

      // Z depth: how far back the grid extends
      const zNear = 50;
      const depthRange = Math.max(100, this.config.depthRange || 1000);
      const zFar = zNear + depthRange;
      const zStep = (zFar - zNear) / Math.max(1, ringCount - 1);

      // Generate 3D grid: vertical rings × radial rings × depth layers
      const dotSize = Math.max(1, this.config.dotSize || 3);
      const randomness = Math.max(0, Math.min(1, this.config.randomness || 0.2));
      
      for (let verticalIndex = 0; verticalIndex < verticalRingCount; verticalIndex++) {
      const y = verticalStart + verticalIndex * verticalSpacing; // Even vertical spacing
      
      for (let radiusIndex = 0; radiusIndex < radiusRings; radiusIndex++) {
        const radius = radiusStart + radiusIndex * radiusStep; // Even radial spacing outward
        
        for (let depthIndex = 0; depthIndex < ringCount; depthIndex++) {
          const z = zNear + depthIndex * zStep; // Depth layers
          const depthFactor = depthIndex / Math.max(1, ringCount - 1);
          
          // Determine layer (split by depth)
          const layer = depthFactor < 0.5 ? 'background' : 'foreground';

          // Generate dots around the circumference of this ring
          for (let dotIndex = 0; dotIndex < dotsPerRing; dotIndex++) {
            const baseAngle = (dotIndex / dotsPerRing) * Math.PI * 2; // Angle around Y-axis
            
            // Apply randomness (optional jitter)
            const angleJitter = (Math.random() - 0.5) * randomness * 0.2;
            const radiusJitter = (Math.random() - 0.5) * randomness * radiusStep * 0.15;
            const zJitter = (Math.random() - 0.5) * randomness * zStep * 0.2;
            const yJitter = (Math.random() - 0.5) * randomness * verticalSpacing * 0.15;
            
            const angle = baseAngle + angleJitter;
            const finalRadius = Math.max(1, radius + radiusJitter);
            const finalZ = z + zJitter;
            const finalY = y + yJitter;

            // Create DOM element for this dot
            const dotElement = document.createElement('div');
            dotElement.className = 'cylinder-dot';
            dotElement.setAttribute('aria-hidden', 'true');
            const dotColor = pickRandomColor();
            dotElement.style.cssText = `
              position: absolute;
              width: ${dotSize * 2}px;
              height: ${dotSize * 2}px;
              border-radius: 50%;
              background: ${dotColor};
              pointer-events: none;
              transform-style: preserve-3d;
              will-change: transform, opacity;
            `;

            // Store 3D position and element reference
            const dot = {
              element: dotElement,
              baseAngle: baseAngle,
              angle: angle, // Angle around Y-axis (rotates with carousel)
              radius: finalRadius, // Radius from center (extends outward)
              y: finalY, // Vertical position (even spacing)
              z: finalZ, // Depth position
              verticalIndex: verticalIndex,
              radiusIndex: radiusIndex,
              depthIndex: depthIndex,
              color: dotColor,
              size: dotSize,
            };

            this.container.appendChild(dotElement);
            this.dots.push(dot);
            this.dotElements.push(dotElement);
          }
        }
      }
    }
    } catch (error) {
      console.error('⚠️ CylinderBackground generateDots error:', error);
      // Don't break the page if dot generation fails
    }
  }

  update(dt = 0) {
    if (!this.app || !this.config.enabled) return;

    // Read wheelRotation from PortfolioApp
    const wheelRotation = this.app.wheelRotation || 0;
    this.lastRotation = wheelRotation;

    // Update dot angles based on carousel rotation
    // Rotate dots around Y-axis (vertical cylinder axis)
    const syncRotation = wheelRotation * this.config.rotationSync;
    
    this.dots.forEach(dot => {
      // Rotate dot around Y-axis (vertical cylinder axis)
      dot.angle = dot.baseAngle + syncRotation;
    });
  }

  render() {
    if (!this.config.enabled || !this.container) return;

    const viewport = this.app.viewport;
    if (!viewport) return;

    const viewportWidth = viewport.clientWidth || window.innerWidth;
    const viewportHeight = viewport.clientHeight || window.innerHeight;

    // Use same perspective system as carousel
    // Dots positioned in 3D space using CSS transforms
    this.dots.forEach(dot => {
      if (!dot.element) return;

      // Calculate 3D position on cylinder
      // X and Z form the circle around Y-axis
      const x3d = Math.cos(dot.angle) * dot.radius; // Horizontal position on circle
      const z3d = Math.sin(dot.angle) * dot.radius; // Depth position on circle
      
      // Convert to viewport units (same as slides use)
      const xVw = viewportWidth ? (x3d / viewportWidth) * 100 : 0;
      const yVh = viewportHeight ? (dot.y / viewportHeight) * 100 : 0;
      
      // Z position in vmin (same system as slides: --slide-z)
      // Calculate Z based on depth: dots further back have negative Z, closer have positive
      // Match carousel depth system: zSpreadVmin = wheelDepth * 10
      // For cylinder: use z3d (depth on circle) + dot.z (overall depth) to determine position
      const totalDepth = dot.z + z3d * 0.5; // Combine circle depth with overall depth
      const depthFactor = Math.min(1, Math.max(0, (totalDepth - 50) / this.config.depthRange));
      const zSpreadVmin = this.config.depthRange * 0.01; // Same scale as carousel
      const zVmin = (0.5 - depthFactor) * zSpreadVmin; // Same calculation as slides
      
      // Depth-based opacity (using same depthFactor)
      const opacity = this.config.opacityMin + (this.config.opacityMax - this.config.opacityMin) * (1 - depthFactor);
      
      // Size scales with depth (further dots appear smaller)
      const depthScale = Math.max(0.3, Math.min(1.5, 1 - depthFactor * 0.5));
      const size = dot.size * depthScale;

      // Apply CSS transforms for 3D positioning
      // Use same transform system as slides for proper perspective
      dot.element.style.setProperty('--dot-x', `${xVw}vw`);
      dot.element.style.setProperty('--dot-y', `${yVh}vh`);
      dot.element.style.setProperty('--dot-z', `${zVmin.toFixed(2)}vmin`);
      
      // Match slide transform pattern: translate3d(x, y, z) translate(-50%, -50%)
      dot.element.style.transform = `
        translate3d(var(--dot-x), var(--dot-y), var(--dot-z))
        translate(-50%, -50%)
      `;
      
      dot.element.style.opacity = opacity.toString();
      dot.element.style.width = `${size * 2}px`;
      dot.element.style.height = `${size * 2}px`;
      
      // Z-index for proper layering in 3D space
      // Dots with positive Z (closer) get higher z-index, negative Z (further) get lower
      // This ensures proper stacking: dots behind cards have lower z-index, dots in front have higher
      const zIndex = Math.round((zVmin + zSpreadVmin) * 10); // Scale to match slide z-index range
      dot.element.style.zIndex = String(zIndex);
    });
  }

  startAnimation() {
    if (this.animationFrame) return;
    
    let lastTime = performance.now();
    const tick = (now) => {
      const dt = Math.min(0.05, (now - lastTime) / 1000);
      lastTime = now;
      
      this.update(dt);
      this.render();
      
      this.animationFrame = requestAnimationFrame(tick);
    };
    
    this.animationFrame = requestAnimationFrame(tick);
  }

  stop() {
    if (this.animationFrame) {
      cancelAnimationFrame(this.animationFrame);
      this.animationFrame = null;
    }
    
    // Remove all dot elements
    this.dotElements.forEach(el => {
      if (el.parentNode) el.parentNode.removeChild(el);
    });
    this.dotElements = [];
    this.dots = [];
    
    // Remove container
    if (this.container && this.container.parentNode) {
      this.container.parentNode.removeChild(this.container);
    }
    this.container = null;
  }

  updateConfig(newConfig) {
    const oldEnabled = this.config.enabled;
    const needsRegenerate = 
      newConfig.ringCount !== undefined && newConfig.ringCount !== this.config.ringCount ||
      newConfig.dotsPerRing !== undefined && newConfig.dotsPerRing !== this.config.dotsPerRing ||
      newConfig.depthRange !== undefined && newConfig.depthRange !== this.config.depthRange ||
      newConfig.radiusMin !== undefined && newConfig.radiusMin !== this.config.radiusMin ||
      newConfig.radiusMax !== undefined && newConfig.radiusMax !== this.config.radiusMax ||
      newConfig.radiusStep !== undefined && newConfig.radiusStep !== this.config.radiusStep ||
      newConfig.radiusRings !== undefined && newConfig.radiusRings !== this.config.radiusRings ||
      newConfig.verticalSpacing !== undefined && newConfig.verticalSpacing !== this.config.verticalSpacing ||
      newConfig.randomness !== undefined && newConfig.randomness !== this.config.randomness ||
      newConfig.gridPattern !== undefined && newConfig.gridPattern !== this.config.gridPattern;
    
    this.config = { ...this.config, ...newConfig };
    
    // Handle enable/disable
    if (newConfig.enabled !== undefined) {
      if (newConfig.enabled && !oldEnabled) {
        // Enable: initialize if not already done
        if (this.dots.length === 0) {
          this.generateDots();
        }
        if (!this.animationFrame) {
          this.startAnimation();
        }
      } else if (!newConfig.enabled && oldEnabled) {
        // Disable: stop animation
        this.stop();
      }
    }
    
    // Regenerate dots if structure changed
    if (needsRegenerate && this.config.enabled) {
      // Clean up existing dots
      this.dotElements.forEach(el => {
        if (el.parentNode) el.parentNode.removeChild(el);
      });
      this.dotElements = [];
      this.dots = [];
      
      // Regenerate
      if (this.container) {
        this.generateDots();
      }
    }
  }
}

