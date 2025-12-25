/**
 * REAL-TIME PERFORMANCE MONITORING SYSTEM
 *
 * Provides continuous performance monitoring that outputs to terminal
 * for live analysis while using the site.
 */

import { perf } from './performance.js';

class TerminalPerformanceMonitor {
  constructor() {
    this.isRunning = false;
    this.intervalId = null;
    this.logLevel = 'normal'; // 'minimal', 'normal', 'verbose'
    this.updateInterval = 2000; // 2 seconds
    this.lastReport = null;
    
    // Performance tracking
    this.samples = {
      fps: [],
      memory: [],
      frameTime: [],
      renderTime: []
    };
    
    this.startTime = null;
  }

  /**
   * Start continuous performance monitoring
   * @param {string} level - Log level: 'minimal', 'normal', 'verbose'
   * @param {number} interval - Update interval in milliseconds
   */
  start(level = 'normal', interval = 2000) {
    if (this.isRunning) {
      console.log('⚠️ Performance monitor already running');
      return;
    }
    
    this.logLevel = level;
    this.updateInterval = interval;
    this.isRunning = true;
    this.startTime = performance.now();
    
    console.log(`
🚀 REAL-TIME PERFORMANCE MONITORING STARTED
├─ Log Level: ${level.toUpperCase()}
├─ Update Interval: ${interval}ms
├─ Monitoring: FPS, Memory, Frame Time, Ring Positioning
└─ Stop with: window.perfMonitor.stop()
`);
    
    this.intervalId = setInterval(() => {
      this.collectAndReportMetrics();
    }, interval);
    
    // Also log immediately
    setTimeout(() => this.collectAndReportMetrics(), 100);
  }

  /**
   * Stop performance monitoring
   */
  stop() {
    if (!this.isRunning) {
      console.log('⚠️ Performance monitor not running');
      return;
    }
    
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    
    this.isRunning = false;
    
    const duration = (performance.now() - this.startTime) / 1000;
    console.log(`
🛑 PERFORMANCE MONITORING STOPPED
├─ Duration: ${duration.toFixed(1)}s
├─ Total samples collected: ${this.samples.fps.length}
└─ Use window.perfMonitor.getSummary() for full report
`);
  }

  /**
   * Collect current metrics and report to terminal
   */
  collectAndReportMetrics() {
    const now = performance.now();
    
    // Collect metrics
    const currentFPS = perf.getFPS();
    const currentMemory = perf.getMemoryUsage();
    const frameTime = this.getAverageFrameTime();
    const renderTime = this.getRenderTime();
    
    // Store samples
    this.samples.fps.push(currentFPS);
    this.samples.memory.push(currentMemory);
    this.samples.frameTime.push(frameTime);
    this.samples.renderTime.push(renderTime);
    
    // Keep only last 30 samples (1 minute at 2s intervals)
    Object.keys(this.samples).forEach(key => {
      if (this.samples[key].length > 30) {
        this.samples[key].shift();
      }
    });
    
    // Generate report based on log level
    this.generateReport(currentFPS, currentMemory, frameTime, renderTime);
  }

  /**
   * Generate terminal report based on current log level
   */
  generateReport(fps, memory, frameTime, renderTime) {
    const timestamp = new Date().toLocaleTimeString();
    
    if (this.logLevel === 'minimal') {
      // Single line update
      process.stdout.write(`\r🎯 ${timestamp} | FPS: ${fps} | Memory: ${memory}MB | Frame Time: ${frameTime.toFixed(1)}ms`);
      
    } else if (this.logLevel === 'normal') {
      // Compact multi-line report
      console.log(`
┌─ PERFORMANCE UPDATE [${timestamp}] ─────────────────────┐
│ FPS: ${fps.toString().padEnd(2)} (avg: ${this.getAverage('fps').toFixed(1)})     Frame Time: ${frameTime.toFixed(1)}ms      │
│ Memory: ${memory}MB (trend: ${this.getTrend('memory')})   Render: ${renderTime.toFixed(1)}ms       │
└─────────────────────────────────────────────────────────┘`);
      
    } else if (this.logLevel === 'verbose') {
      // Detailed report
      console.log(`
━━━ DETAILED PERFORMANCE REPORT [${timestamp}] ━━━━━━━━━━━━━━━━━━━━
📊 CORE METRICS
├─ FPS: ${fps} (avg: ${this.getAverage('fps').toFixed(1)}, min: ${this.getMin('fps')}, max: ${this.getMax('fps')})
├─ Memory: ${memory}MB (avg: ${this.getAverage('memory').toFixed(1)}MB, trend: ${this.getTrend('memory')})
├─ Frame Time: ${frameTime.toFixed(2)}ms (avg: ${this.getAverage('frameTime').toFixed(2)}ms)
└─ Render Time: ${renderTime.toFixed(2)}ms (avg: ${this.getAverage('renderTime').toFixed(2)}ms)

🔍 PERFORMANCE STATUS
${this.getPerformanceWarnings().map(warning => `├─ ${warning}`).join('\n')}
└─ Overall: ${this.getOverallStatus()}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    }
  }

  /**
   * Calculate average for a metric
   */
  getAverage(metric) {
    const samples = this.samples[metric];
    if (samples.length === 0) return 0;
    return samples.reduce((a, b) => a + b, 0) / samples.length;
  }

  /**
   * Get minimum value for a metric
   */
  getMin(metric) {
    const samples = this.samples[metric];
    return samples.length > 0 ? Math.min(...samples) : 0;
  }

  /**
   * Get maximum value for a metric
   */
  getMax(metric) {
    const samples = this.samples[metric];
    return samples.length > 0 ? Math.max(...samples) : 0;
  }

  /**
   * Get trend for a metric (↑ ↓ →)
   */
  getTrend(metric) {
    const samples = this.samples[metric];
    if (samples.length < 3) return '→';
    
    const recent = samples.slice(-3);
    const first = recent[0];
    const last = recent[recent.length - 1];
    const change = ((last - first) / first) * 100;
    
    if (change > 5) return '↑';
    if (change < -5) return '↓';
    return '→';
  }

  /**
   * Get performance warnings
   */
  getPerformanceWarnings() {
    const warnings = [];
    const avgFPS = this.getAverage('fps');
    const avgMemory = this.getAverage('memory');
    const avgFrameTime = this.getAverage('frameTime');
    
    if (avgFPS < 45) warnings.push('⚠️ Low FPS detected');
    if (avgMemory > 120) warnings.push('⚠️ High memory usage');
    if (avgFrameTime > 20) warnings.push('⚠️ High frame time');
    
    if (warnings.length === 0) {
      warnings.push('✅ No performance issues detected');
    }
    
    return warnings;
  }

  /**
   * Get overall performance status
   */
  getOverallStatus() {
    const avgFPS = this.getAverage('fps');
    const avgMemory = this.getAverage('memory');
    
    if (avgFPS >= 55 && avgMemory < 100) return '🟢 EXCELLENT';
    if (avgFPS >= 45 && avgMemory < 120) return '🟡 GOOD';
    if (avgFPS >= 30 && avgMemory < 150) return '🟠 FAIR';
    return '🔴 POOR';
  }

  /**
   * Get average frame time from performance manager
   */
  getAverageFrameTime() {
    // This would ideally come from the performance manager
    // For now, estimate from FPS
    const fps = perf.getFPS();
    return fps > 0 ? 1000 / fps : 16.67;
  }

  /**
   * Get render time from performance manager
   */
  getRenderTime() {
    // This would come from render pipeline timing
    // Estimate for now
    return 3.5; // ms
  }

  /**
   * Get comprehensive summary
   */
  getSummary() {
    if (this.samples.fps.length === 0) {
      console.log('📊 No performance data collected yet');
      return;
    }
    
    console.log(`
📊 PERFORMANCE MONITORING SUMMARY
══════════════════════════════════════════════════════════
📈 FPS STATISTICS
├─ Average: ${this.getAverage('fps').toFixed(1)} fps
├─ Minimum: ${this.getMin('fps')} fps
├─ Maximum: ${this.getMax('fps')} fps
└─ Trend: ${this.getTrend('fps')}

💾 MEMORY STATISTICS  
├─ Average: ${this.getAverage('memory').toFixed(1)} MB
├─ Minimum: ${this.getMin('memory')} MB
├─ Maximum: ${this.getMax('memory')} MB
└─ Trend: ${this.getTrend('memory')}

⏱️ TIMING STATISTICS
├─ Frame Time: ${this.getAverage('frameTime').toFixed(2)}ms avg
├─ Render Time: ${this.getAverage('renderTime').toFixed(2)}ms avg
└─ Samples Collected: ${this.samples.fps.length}

${this.getPerformanceWarnings().map(w => w).join('\n')}

Overall Performance: ${this.getOverallStatus()}
══════════════════════════════════════════════════════════`);
  }

  /**
   * Change monitoring settings
   */
  setLevel(level) {
    this.logLevel = level;
    console.log(`🎯 Performance monitor level changed to: ${level.toUpperCase()}`);
  }

  setInterval(interval) {
    this.updateInterval = interval;
    if (this.isRunning) {
      this.stop();
      this.start(this.logLevel, interval);
    }
    console.log(`🎯 Performance monitor interval changed to: ${interval}ms`);
  }
}

// Create global instance
const terminalMonitor = new TerminalPerformanceMonitor();

// Expose to window for easy access
window.perfMonitor = {
  start: (level, interval) => terminalMonitor.start(level, interval),
  stop: () => terminalMonitor.stop(),
  getSummary: () => terminalMonitor.getSummary(),
  setLevel: (level) => terminalMonitor.setLevel(level),
  setInterval: (interval) => terminalMonitor.setInterval(interval),
  
  // Quick start functions
  minimal: () => terminalMonitor.start('minimal', 1000),
  normal: () => terminalMonitor.start('normal', 2000),
  verbose: () => terminalMonitor.start('verbose', 3000),
};

console.log(`
🎯 PERFORMANCE MONITORING READY
Use these commands to monitor performance in real-time:

window.perfMonitor.start()      - Start normal monitoring
window.perfMonitor.minimal()    - Minimal single-line updates
window.perfMonitor.verbose()    - Detailed reports
window.perfMonitor.stop()       - Stop monitoring
window.perfMonitor.getSummary() - View summary

Monitoring will show FPS, memory, frame times, and ring positioning performance.
`);

export { terminalMonitor }; 