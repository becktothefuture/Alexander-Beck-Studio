#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { minify } = require('terser');

const CONFIG_FILE = path.join(__dirname, 'current-config.json');
const ALT_CONFIG_FILE = path.join(__dirname, 'current-config-2.json');
const SOURCE_FILE = path.join(__dirname, 'balls-source.html');
const OUTPUT_JS_FILE = path.join(__dirname, '..', 'public', 'js', 'bouncy-balls-embed.js');

console.log('🚀 Building optimized embed JS...');

// Check if config file exists
let config = null;
if (fs.existsSync(CONFIG_FILE)) {
  console.log('📋 Found current-config.json, applying custom settings...');
  config = JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8'));
} else if (fs.existsSync(ALT_CONFIG_FILE)) {
  console.log('📋 Found current-config-2.json, applying custom settings...');
  config = JSON.parse(fs.readFileSync(ALT_CONFIG_FILE, 'utf8'));
} else {
  console.log('⚠️  No config file found, using default settings from source');
}

// Read the source file
const sourceHtml = fs.readFileSync(SOURCE_FILE, 'utf8');

// Extract the JavaScript from the source (prefer the last inline <script> block without src)
const scriptBlocks = Array.from(sourceHtml.matchAll(/<script(?:\s+[^>]*src=["'][^"']+["'][^>]*)?\s*>[\s\S]*?<\/script>/gi));
if (!scriptBlocks.length) {
  console.error('❌ Could not find any <script> blocks in source file');
  process.exit(1);
}
// Pick the last inline script that does NOT have a src attribute; fallback to last script
let jsCode = '';
for (let i = scriptBlocks.length - 1; i >= 0; i--) {
  const block = scriptBlocks[i][0];
  const hasSrc = /<script[^>]*\ssrc=/i.test(block);
  if (!hasSrc) {
    const inner = block.replace(/^<[\s\S]*?>/, '').replace(/<\/script>\s*$/, '');
    jsCode = inner;
    break;
  }
}
if (!jsCode) {
  // Fallback: use the last block's inner content
  const last = scriptBlocks[scriptBlocks.length - 1][0];
  jsCode = last.replace(/^<[\s\S]*?>/, '').replace(/<\/script>\s*$/, '');
}

// If we have a config, apply the values
if (config) {
  console.log('🔧 Applying configuration values...');

  function replaceVar(name, valueLiteral) {
    const re = new RegExp(`(let\\s+${name}\\s*=\\s*)([^;]+)(;)`);
    const before = jsCode;
    jsCode = jsCode.replace(re, `$1${valueLiteral}$3`);
    if (before === jsCode) {
      // Try const form
      const reConst = new RegExp(`(const\\s+${name}\\s*=\\s*)([^;]+)(;)`);
      jsCode = jsCode.replace(reConst, `$1${valueLiteral}$3`);
    }
  }

  function replaceArrayConst(name, arr) {
    const re = new RegExp(`(const\\s+${name}\\s*=\\s*)\\[[\\s\\S]*?\\](;)`);
    jsCode = jsCode.replace(re, `$1${JSON.stringify(arr)}$2`);
  }

  // Physics
  if (typeof config.gravityMultiplier === 'number') replaceVar('gravityMultiplier', String(config.gravityMultiplier));
  if (typeof config.restitution === 'number') replaceVar('REST', String(config.restitution));
  if (typeof config.friction === 'number') replaceVar('FRICTION', String(config.friction));
  if (typeof config.ballMass === 'number') replaceVar('ballMassKg', String(config.ballMass));

  // Spawn & size
  if (typeof config.emitRate === 'number') replaceVar('EMIT_INTERVAL', String(config.emitRate));
  if (typeof config.maxBalls === 'number') replaceVar('MAX_BALLS', String(config.maxBalls));
  if (typeof config.ballScale === 'number') replaceVar('sizeScale', String(config.ballScale));
  if (typeof config.ballVariation === 'number') replaceVar('sizeVariation', String(config.ballVariation));
  if (typeof config.spawnX === 'number') replaceVar('SPAWN_X_CENTER_VW', String(config.spawnX));
  if (typeof config.spawnY === 'number') replaceVar('SPAWN_Y_VH', String(config.spawnY));
  if (typeof config.spawnWidth === 'number') replaceVar('SPAWN_W_VW', String(config.spawnWidth));
  if (typeof config.spawnHeight === 'number') replaceVar('SPAWN_H_VH', String(config.spawnHeight));
  if (typeof config.sweepEnabled === 'boolean') replaceVar('EMITTER_SWEEP_ENABLED', String(config.sweepEnabled));

  // Repeller
  if (typeof config.repelRadius === 'number') replaceVar('repelRadius', String(config.repelRadius));
  if (typeof config.repelPower === 'number') replaceVar('repelPower', String(config.repelPower));
  if (typeof config.repelSoftness === 'number') replaceVar('repelSoft', String(config.repelSoftness));

  // Scene
  if (typeof config.trailFade === 'number') replaceVar('trailFade', String(config.trailFade));
  if (typeof config.trailSubtlety === 'number') replaceVar('trailSubtlety', String(config.trailSubtlety));

  // Colors & template
  if (typeof config.cursorColorIndex === 'number') {
    const reCursor = /(let\s+cursorBallIndex\s*=\s*)\d+(;)/;
    jsCode = jsCode.replace(reCursor, `$1${config.cursorColorIndex}$2`);
  }
  if (typeof config.currentTemplate === 'string') {
    const reTpl = /(let\s+currentTemplate\s*=\s*)'[^']+'(;)/;
    jsCode = jsCode.replace(reTpl, `$1'${config.currentTemplate}'$2`);
  }
  if (Array.isArray(config.colors)) {
    const reColors = /(let\s+currentColors\s*=\s*)[^;]+(;)/;
    jsCode = jsCode.replace(reColors, `$1${JSON.stringify(config.colors)}$2`);
  }
  if (Array.isArray(config.colorWeights)) {
    replaceArrayConst('COLOR_WEIGHTS', config.colorWeights);
  }

  // Pulse Grid mode parameters
  if (typeof config.gridColumns === 'number') replaceVar('gridColumns', String(config.gridColumns));
  if (typeof config.gridCellAspect === 'number') replaceVar('gridCellAspect', String(config.gridCellAspect));
  if (typeof config.gridBallCount === 'number') replaceVar('gridBallCount', String(config.gridBallCount));
  if (typeof config.pulseInterval === 'number') replaceVar('pulseInterval', String(config.pulseInterval));
  if (typeof config.pulseSpeed === 'number') replaceVar('pulseSpeed', String(config.pulseSpeed));
  if (typeof config.pulseSynchronicity === 'number') replaceVar('pulseSynchronicity', String(config.pulseSynchronicity));
  if (typeof config.pulseRandomness === 'number') replaceVar('pulseRandomness', String(config.pulseRandomness));
  if (typeof config.pulseMinSteps === 'number') replaceVar('pulseMinSteps', String(config.pulseMinSteps));
  if (typeof config.pulseMaxSteps === 'number') replaceVar('pulseMaxSteps', String(config.pulseMaxSteps));
  if (typeof config.pulseEasingStyle === 'string') {
    const reEasing = /(let\s+pulseEasingStyle\s*=\s*)'[^']+'(;)/;
    jsCode = jsCode.replace(reEasing, `$1'${config.pulseEasingStyle}'$2`);
  }
  if (typeof config.pulseOvershoot === 'number') replaceVar('pulseOvershoot', String(config.pulseOvershoot));
  if (typeof config.pulseBounceIntensity === 'number') replaceVar('pulseBounceIntensity', String(config.pulseBounceIntensity));

  // Canvas shadow parameters
  if (typeof config.canvasShadowEnabled === 'boolean') replaceVar('canvasShadowEnabled', String(config.canvasShadowEnabled));
  if (typeof config.shadowOffsetX === 'number') replaceVar('shadowOffsetX', String(config.shadowOffsetX));
  if (typeof config.shadowOffsetY === 'number') replaceVar('shadowOffsetY', String(config.shadowOffsetY));
  if (typeof config.shadowBlur === 'number') replaceVar('shadowBlur', String(config.shadowBlur));
  if (typeof config.shadowOpacity === 'number') replaceVar('shadowOpacity', String(config.shadowOpacity));
  if (typeof config.shadowColor === 'string') {
    const reShadowColor = /(let\s+shadowColor\s*=\s*)'[^']+'(;)/;
    jsCode = jsCode.replace(reShadowColor, `$1'${config.shadowColor}'$2`);
  }
  if (typeof config.shadow2Enabled === 'boolean') replaceVar('shadow2Enabled', String(config.shadow2Enabled));
  if (typeof config.shadow2Blur === 'number') replaceVar('shadow2Blur', String(config.shadow2Blur));
  if (typeof config.shadow2Opacity === 'number') replaceVar('shadow2Opacity', String(config.shadow2Opacity));

  console.log('✅ Applied configuration values to source JS');
}

// Remove all UI-related code (panel, controls, etc.)
console.log('🧹 Removing UI controls and panel...');

// Do not strip UI via regex; keep source intact for robustness.

// Minify JS only (self-invoking bundle suitable for <script src>)
console.log('🗜️  Minifying JS...');
const terserOptions = {
  compress: { passes: 2 },
  mangle: true,               // keep names short for size
  format: { comments: false },
  sourceMap: {
    filename: 'bouncy-balls-embed.js',
    url: 'bouncy-balls-embed.js.map',
    root: '../source/'
  }
};

minify(jsCode, terserOptions)
  .then(result => {
    if (!result || !result.code) {
      throw new Error('Terser returned empty output');
    }
    // Ensure target directory exists
    fs.mkdirSync(path.dirname(OUTPUT_JS_FILE), { recursive: true });
    fs.writeFileSync(OUTPUT_JS_FILE, result.code);
    
    // Write source map if generated
    if (result.map) {
      const mapFile = OUTPUT_JS_FILE + '.map';
      fs.writeFileSync(mapFile, result.map);
      console.log(`🗺️  Source map: ${mapFile}`);
    }

    console.log('✅ Build complete!');
    console.log(`📦 Output: ${OUTPUT_JS_FILE}`);
    console.log(`📊 Size: ${(result.code.length / 1024).toFixed(1)}KB`);
    if (config) {
      console.log(`🎯 Applied config: ${config.currentTemplate || 'custom'} theme`);
    }
    console.log('🎉 Ready to embed!');
  })
  .catch(error => {
    console.error('❌ Minification failed:', error);
    process.exit(1);
  });
