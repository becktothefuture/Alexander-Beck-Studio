import {
  MAX_PARTICLE_LIGHTS_PER_BALL,
  resolveParticleLightCount,
  resolveParticleLightSample,
  resolveParticlePatternOffset,
} from './particle-light-source.js';

const FULLSCREEN_VERTEX_SHADER = `#version 300 es
layout(location = 0) in vec2 aPosition;
out vec2 vUv;
void main() {
  vUv = aPosition * 0.5 + 0.5;
  gl_Position = vec4(aPosition, 0.0, 1.0);
}`;

const FEEDBACK_FRAGMENT_SHADER = `#version 300 es
precision highp float;
in vec2 vUv;
uniform sampler2D uCurrent;
uniform sampler2D uHistory;
uniform vec2 uTexel;
uniform vec2 uDrift;
uniform float uTime;
uniform float uDecay;
uniform float uThreshold;
uniform float uHaloSpread;
uniform float uTurbulence;
uniform float uEmissionGain;
uniform int uBloomLevels;
out vec4 outColor;

vec4 sampleRing(vec2 uv, float radius) {
  vec2 o = uTexel * radius;
  vec4 sum = texture(uCurrent, uv + vec2(o.x, 0.0));
  sum += texture(uCurrent, uv - vec2(o.x, 0.0));
  sum += texture(uCurrent, uv + vec2(0.0, o.y));
  sum += texture(uCurrent, uv - vec2(0.0, o.y));
  sum += texture(uCurrent, uv + o);
  sum += texture(uCurrent, uv - o);
  sum += texture(uCurrent, uv + vec2(o.x, -o.y));
  sum += texture(uCurrent, uv + vec2(-o.x, o.y));
  return sum * 0.125;
}

void main() {
  float wave = sin(vUv.y * 11.0 + uTime * 0.31) * cos(vUv.x * 8.0 - uTime * 0.23);
  vec2 flow = uDrift + vec2(wave, -wave * 0.55) * uTexel * uTurbulence * 3.0;
  vec2 historyUv = vUv - flow;
  vec2 historyOffset = uTexel * (0.9 + uHaloSpread * 0.85);
  vec4 previousCenter = texture(uHistory, historyUv);
  vec4 previousDiffuse = texture(uHistory, historyUv + vec2(historyOffset.x, 0.0));
  previousDiffuse += texture(uHistory, historyUv - vec2(historyOffset.x, 0.0));
  previousDiffuse += texture(uHistory, historyUv + vec2(0.0, historyOffset.y));
  previousDiffuse += texture(uHistory, historyUv - vec2(0.0, historyOffset.y));
  previousDiffuse *= 0.25;
  float diffusion = min(0.42, 0.16 + uHaloSpread * 0.06 + uTurbulence * 0.12);
  vec4 previous = mix(previousCenter, previousDiffuse, diffusion) * uDecay;
  vec4 current = texture(uCurrent, vUv);
  vec4 bloom = current;
  float total = 1.0;
  for (int level = 1; level <= 4; level++) {
    if (level <= uBloomLevels) {
      float radius = (1.5 + float(level) * 2.25) * uHaloSpread;
      bloom += sampleRing(vUv, radius);
      total += 1.0;
    }
  }
  bloom /= total;
  float luminance = max(bloom.r, max(bloom.g, bloom.b));
  float gate = smoothstep(uThreshold, min(1.0, uThreshold + 0.28), luminance + bloom.a * 0.2);
  vec3 emission = bloom.rgb * gate;
  float emissionAlpha = bloom.a * gate;
  float injection = max(0.018, 1.0 - uDecay) * (1.0 + uEmissionGain * 1.1);
  outColor = vec4(
    min(vec3(1.0), previous.rgb + emission * injection),
    min(1.0, previous.a + emissionAlpha * injection)
  );
}`;

const PRESENT_FRAGMENT_SHADER = `#version 300 es
precision highp float;
in vec2 vUv;
uniform sampler2D uCurrent;
uniform sampler2D uHistory;
uniform float uFogDensity;
uniform float uEmissionGain;
uniform float uAccentLift;
uniform float uExtinction;
uniform vec4 uTitleMask;
uniform float uTitleClearance;
uniform float uDensityCurve;
uniform float uWhitePoint;
uniform float uColourSeparation;
uniform float uOpacityCeiling;
uniform float uLightDefinition;
out vec4 outColor;

void main() {
  vec4 history = texture(uHistory, vUv);
  vec4 current = texture(uCurrent, vUv);
  vec2 titleDelta = (vUv - uTitleMask.xy) / max(uTitleMask.zw, vec2(0.001));
  float titleDistance = length(titleDelta);
  float titleAir = mix(1.0 - uTitleClearance, 1.0, smoothstep(0.34, 1.18, titleDistance));
  vec3 lifted = history.rgb * (0.8 + uAccentLift * 0.48) + current.rgb * (0.08 + uLightDefinition * 1.1);
  float exposure = (0.65 + uEmissionGain * 0.55) / max(0.55, uWhitePoint);
  float colourPeak = max(lifted.r, max(lifted.g, lifted.b));
  vec3 chroma = lifted / max(0.001, colourPeak);
  vec3 colour = chroma * (1.0 - exp(-colourPeak * exposure));
  float luminance = dot(colour, vec3(0.2126, 0.7152, 0.0722));
  colour = clamp(mix(vec3(luminance), colour, 1.0 + uColourSeparation), 0.0, 1.0);
  float density = pow(clamp(history.a, 0.0, 1.0), max(0.25, uDensityCurve)) * uFogDensity;
  float lightAlpha = current.a * uLightDefinition * 1.45;
  float alpha = max(density, lightAlpha) * titleAir * (1.0 - uExtinction * 0.24);
  outColor = vec4(colour, clamp(alpha, 0.0, uOpacityCeiling));
}`;

const SPLAT_VERTEX_SHADER = `#version 300 es
in vec2 aCorner;
in vec2 aCenter;
in vec2 aRadius;
in vec4 aColour;
out vec2 vCorner;
out vec4 vColour;
void main() {
  vec2 center = vec2(aCenter.x * 2.0 - 1.0, 1.0 - aCenter.y * 2.0);
  vec2 extent = aRadius * 2.0;
  gl_Position = vec4(center + aCorner * extent, 0.0, 1.0);
  vCorner = aCorner;
  vColour = aColour;
}`;

const SPLAT_FRAGMENT_SHADER = `#version 300 es
precision highp float;
in vec2 vCorner;
in vec4 vColour;
uniform float uSoftness;
out vec4 outColor;
void main() {
  float distanceFromCenter = length(vCorner);
  if (distanceFromCenter > 1.0) discard;
  float exponent = mix(3.2, 1.15, uSoftness);
  float alpha = pow(max(0.0, 1.0 - distanceFromCenter), exponent) * vColour.a;
  outColor = vec4(vColour.rgb * alpha, alpha);
}`;

function compileShader(gl, type, source) {
  const shader = gl.createShader(type);
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    const message = gl.getShaderInfoLog(shader) || 'Unknown shader compilation error';
    gl.deleteShader(shader);
    throw new Error(message);
  }
  return shader;
}

function createProgram(gl, vertexSource, fragmentSource) {
  const program = gl.createProgram();
  const vertex = compileShader(gl, gl.VERTEX_SHADER, vertexSource);
  const fragment = compileShader(gl, gl.FRAGMENT_SHADER, fragmentSource);
  gl.attachShader(program, vertex);
  gl.attachShader(program, fragment);
  gl.linkProgram(program);
  gl.deleteShader(vertex);
  gl.deleteShader(fragment);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    const message = gl.getProgramInfoLog(program) || 'Unknown shader link error';
    gl.deleteProgram(program);
    throw new Error(message);
  }
  return program;
}

function createTexture(gl, width, height) {
  const texture = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, texture);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, width, height, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
  return texture;
}

function createFramebuffer(gl, texture) {
  const framebuffer = gl.createFramebuffer();
  gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);
  gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, texture, 0);
  return framebuffer;
}

function getUniformLocations(gl, program, names) {
  return Object.fromEntries(names.map((name) => [name, gl.getUniformLocation(program, name)]));
}

function setTextureUnit(gl, location, unit, texture) {
  gl.activeTexture(gl.TEXTURE0 + unit);
  gl.bindTexture(gl.TEXTURE_2D, texture);
  gl.uniform1i(location, unit);
}

function parseColour(value) {
  const colour = String(value || '#ffffff').trim();
  if (/^#[0-9a-f]{6}$/i.test(colour)) {
    return [
      Number.parseInt(colour.slice(1, 3), 16) / 255,
      Number.parseInt(colour.slice(3, 5), 16) / 255,
      Number.parseInt(colour.slice(5, 7), 16) / 255,
    ];
  }
  if (/^#[0-9a-f]{3}$/i.test(colour)) {
    return [1, 2, 3].map((index) => Number.parseInt(colour[index] + colour[index], 16) / 255);
  }
  const rgb = colour.match(/[\d.]+/g)?.slice(0, 3).map(Number);
  if (rgb?.length === 3) return rgb.map((channel) => Math.min(1, Math.max(0, channel / 255)));
  return [1, 1, 1];
}

export class WebglAtmosphereEffect {
  constructor(outputCanvas, { mode = 'post' } = {}) {
    this.outputCanvas = outputCanvas;
    this.mode = mode;
    this.gl = outputCanvas.getContext('webgl2', {
      alpha: true,
      antialias: false,
      depth: false,
      stencil: false,
      premultipliedAlpha: false,
      preserveDrawingBuffer: false,
      powerPreference: 'high-performance',
    });
    if (!this.gl) throw new Error('WebGL2 atmosphere context unavailable');

    const gl = this.gl;
    this.feedbackProgram = createProgram(gl, FULLSCREEN_VERTEX_SHADER, FEEDBACK_FRAGMENT_SHADER);
    this.presentProgram = createProgram(gl, FULLSCREEN_VERTEX_SHADER, PRESENT_FRAGMENT_SHADER);
    this.splatProgram = mode === 'density' ? createProgram(gl, SPLAT_VERTEX_SHADER, SPLAT_FRAGMENT_SHADER) : null;
    this.feedbackUniforms = getUniformLocations(gl, this.feedbackProgram, [
      'uCurrent', 'uHistory', 'uTexel', 'uDrift', 'uTime', 'uDecay', 'uThreshold',
      'uHaloSpread', 'uTurbulence', 'uEmissionGain', 'uBloomLevels',
    ]);
    this.presentUniforms = getUniformLocations(gl, this.presentProgram, [
      'uCurrent', 'uHistory', 'uFogDensity', 'uEmissionGain', 'uAccentLift',
      'uExtinction', 'uTitleMask', 'uTitleClearance', 'uDensityCurve',
      'uWhitePoint', 'uColourSeparation', 'uOpacityCeiling', 'uLightDefinition',
    ]);
    this.splatUniforms = this.splatProgram
      ? getUniformLocations(gl, this.splatProgram, ['uSoftness'])
      : null;
    this.fullscreenVao = gl.createVertexArray();
    this.fullscreenBuffer = gl.createBuffer();
    gl.bindVertexArray(this.fullscreenVao);
    gl.bindBuffer(gl.ARRAY_BUFFER, this.fullscreenBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    const positionLocation = gl.getAttribLocation(this.feedbackProgram, 'aPosition');
    gl.enableVertexAttribArray(positionLocation);
    gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);

    this.colourCache = new Map();
    this.instanceCapacity = 0;
    this.instanceData = new Float32Array(0);
    this.particleSample = { x: 0, y: 0, radial: 0, size: 1, intensity: 1 };
    this.lastInstanceCount = 0;
    this.splatVao = null;
    this.cornerBuffer = null;
    this.instanceBuffer = null;
    if (mode === 'density') this.initializeSplatGeometry();
    this.width = 0;
    this.height = 0;
    this.historyIndex = 0;
    this.contextLost = false;
    outputCanvas.addEventListener('webglcontextlost', this.handleContextLost, { passive: false });
  }

  handleContextLost = (event) => {
    event.preventDefault();
    this.contextLost = true;
  };

  initializeSplatGeometry() {
    const gl = this.gl;
    const program = this.splatProgram;
    this.splatVao = gl.createVertexArray();
    this.cornerBuffer = gl.createBuffer();
    this.instanceBuffer = gl.createBuffer();
    gl.bindVertexArray(this.splatVao);
    gl.bindBuffer(gl.ARRAY_BUFFER, this.cornerBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
      -1, -1, 1, -1, -1, 1,
      -1, 1, 1, -1, 1, 1,
    ]), gl.STATIC_DRAW);
    const cornerLocation = gl.getAttribLocation(program, 'aCorner');
    gl.enableVertexAttribArray(cornerLocation);
    gl.vertexAttribPointer(cornerLocation, 2, gl.FLOAT, false, 0, 0);

    gl.bindBuffer(gl.ARRAY_BUFFER, this.instanceBuffer);
    const stride = 8 * Float32Array.BYTES_PER_ELEMENT;
    const attributes = [
      ['aCenter', 2, 0],
      ['aRadius', 2, 2],
      ['aColour', 4, 4],
    ];
    attributes.forEach(([name, size, offset]) => {
      const location = gl.getAttribLocation(program, name);
      gl.enableVertexAttribArray(location);
      gl.vertexAttribPointer(location, size, gl.FLOAT, false, stride, offset * Float32Array.BYTES_PER_ELEMENT);
      gl.vertexAttribDivisor(location, 1);
    });
  }

  resize(width, height) {
    if (this.width === width && this.height === height) return;
    const gl = this.gl;
    this.width = width;
    this.height = height;
    this.outputCanvas.width = width;
    this.outputCanvas.height = height;
    this.sourceTexture && gl.deleteTexture(this.sourceTexture);
    this.currentTexture && gl.deleteTexture(this.currentTexture);
    this.currentFramebuffer && gl.deleteFramebuffer(this.currentFramebuffer);
    this.historyTextures?.forEach((texture) => gl.deleteTexture(texture));
    this.historyFramebuffers?.forEach((framebuffer) => gl.deleteFramebuffer(framebuffer));
    this.sourceTexture = createTexture(gl, width, height);
    this.currentTexture = this.mode === 'density' ? createTexture(gl, width, height) : this.sourceTexture;
    this.currentFramebuffer = this.mode === 'density' ? createFramebuffer(gl, this.currentTexture) : null;
    this.historyTextures = [createTexture(gl, width, height), createTexture(gl, width, height)];
    this.historyFramebuffers = this.historyTextures.map((texture) => createFramebuffer(gl, texture));
    this.historyIndex = 0;
    this.clear();
  }

  clear() {
    const gl = this.gl;
    gl.viewport(0, 0, this.width, this.height);
    gl.clearColor(0, 0, 0, 0);
    this.historyFramebuffers?.forEach((framebuffer) => {
      gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);
      gl.clear(gl.COLOR_BUFFER_BIT);
    });
    if (this.currentFramebuffer) {
      gl.bindFramebuffer(gl.FRAMEBUFFER, this.currentFramebuffer);
      gl.clear(gl.COLOR_BUFFER_BIT);
    }
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.clear(gl.COLOR_BUFFER_BIT);
  }

  uploadSource(sourceCanvas) {
    const gl = this.gl;
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.sourceTexture);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
    gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, gl.RGBA, gl.UNSIGNED_BYTE, sourceCanvas);
  }

  getColour(value) {
    const key = String(value || '#ffffff');
    if (!this.colourCache.has(key)) this.colourCache.set(key, parseColour(key));
    return this.colourCache.get(key);
  }

  renderDensity(balls, mainCanvas, config, nowMs) {
    const gl = this.gl;
    const ballCount = Math.min(Array.isArray(balls) ? balls.length : 0, 160);
    const particleCount = resolveParticleLightCount(config);
    const maximumInstances = Math.min(
      ballCount * (particleCount + 1),
      160 * (MAX_PARTICLE_LIGHTS_PER_BALL + 1),
    );
    if (maximumInstances > this.instanceCapacity) {
      this.instanceCapacity = Math.max(maximumInstances, Math.ceil(this.instanceCapacity * 1.5), 256);
      this.instanceData = new Float32Array(this.instanceCapacity * 8);
      gl.bindBuffer(gl.ARRAY_BUFFER, this.instanceBuffer);
      gl.bufferData(gl.ARRAY_BUFFER, this.instanceData.byteLength, gl.DYNAMIC_DRAW);
    }
    const canvasWidth = Math.max(1, mainCanvas.width);
    const canvasHeight = Math.max(1, mainCanvas.height);
    const spread = Math.max(0, Number(config.particleSpread) || 0);
    const particleSize = Math.max(0.01, Number(config.particleSize) || 0.01);
    const energy = Math.max(0, Number(config.particleEnergy) || 0);
    const bodyEnergy = Math.max(0, Math.min(1, Number(config.bodyEnergy) || 0));
    const bodySize = Math.max(0.01, Number(config.bodySize) || 0.01);
    const shimmer = Math.max(0, Math.min(1, Number(config.particleShimmer) || 0));
    let validCount = 0;
    for (let ballIndex = 0; ballIndex < ballCount && validCount < maximumInstances; ballIndex += 1) {
      const ball = balls[ballIndex];
      const radius = typeof ball?.getDisplayRadius === 'function' ? ball.getDisplayRadius() : Number(ball?.r || 0);
      if (!Number.isFinite(ball?.x) || !Number.isFinite(ball?.y) || !Number.isFinite(radius) || radius <= 0) continue;
      const colour = this.getColour(ball.color);
      const seed = Number.isFinite(ball.pebbleSeed) ? ball.pebbleSeed : ballIndex;
      const patternOffset = resolveParticlePatternOffset(seed);
      const cloudRadius = radius * spread;
      if (bodyEnergy > 0 && validCount < maximumInstances) {
        const bodyOffset = validCount * 8;
        const bodyRadius = radius * bodySize;
        this.instanceData[bodyOffset] = ball.x / canvasWidth;
        this.instanceData[bodyOffset + 1] = ball.y / canvasHeight;
        this.instanceData[bodyOffset + 2] = bodyRadius / canvasWidth;
        this.instanceData[bodyOffset + 3] = bodyRadius / canvasHeight;
        this.instanceData[bodyOffset + 4] = colour[0];
        this.instanceData[bodyOffset + 5] = colour[1];
        this.instanceData[bodyOffset + 6] = colour[2];
        this.instanceData[bodyOffset + 7] = bodyEnergy;
        validCount += 1;
      }
      for (let particleIndex = 0; particleIndex < particleCount && validCount < maximumInstances; particleIndex += 1) {
        const patternIndex = patternOffset + particleIndex;
        const sample = resolveParticleLightSample(
          this.particleSample,
          patternIndex,
          particleIndex,
          particleCount,
          nowMs,
          shimmer,
        );
        const lightRadius = radius * particleSize * sample.size;
        const radialFade = Math.max(0.52, 1 - sample.radial * 0.24);
        const offset = validCount * 8;
        this.instanceData[offset] = (ball.x + sample.x * cloudRadius) / canvasWidth;
        this.instanceData[offset + 1] = (ball.y + sample.y * cloudRadius) / canvasHeight;
        this.instanceData[offset + 2] = lightRadius / canvasWidth;
        this.instanceData[offset + 3] = lightRadius / canvasHeight;
        this.instanceData[offset + 4] = colour[0];
        this.instanceData[offset + 5] = colour[1];
        this.instanceData[offset + 6] = colour[2];
        this.instanceData[offset + 7] = Math.min(1, energy * sample.intensity * radialFade);
        validCount += 1;
      }
    }

    gl.bindFramebuffer(gl.FRAMEBUFFER, this.currentFramebuffer);
    gl.viewport(0, 0, this.width, this.height);
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
    gl.useProgram(this.splatProgram);
    gl.bindVertexArray(this.splatVao);
    gl.bindBuffer(gl.ARRAY_BUFFER, this.instanceBuffer);
    if (validCount > 0) gl.bufferSubData(gl.ARRAY_BUFFER, 0, this.instanceData, 0, validCount * 8);
    gl.uniform1f(this.splatUniforms.uSoftness, config.lightSoftness);
    gl.drawArraysInstanced(gl.TRIANGLES, 0, 6, validCount);
    gl.disable(gl.BLEND);
    this.lastInstanceCount = validCount;
    return validCount;
  }

  render({ sourceCanvas, balls, mainCanvas, config, dtMs, titleMask, nowMs, responsiveScale = 1 }) {
    if (this.contextLost) throw new Error('WebGL2 atmosphere context lost');
    const gl = this.gl;
    let activeCurrentTexture = this.currentTexture;
    if (this.mode === 'density') {
      const densityCount = this.renderDensity(balls, mainCanvas, config, nowMs);
      if (densityCount === 0) {
        this.uploadSource(sourceCanvas);
        activeCurrentTexture = this.sourceTexture;
      }
    } else {
      this.uploadSource(sourceCanvas);
    }

    const readIndex = this.historyIndex;
    const writeIndex = 1 - readIndex;
    const halfLife = Math.max(0, config.afterglowHalfLifeMs);
    const decay = halfLife > 0 ? Math.exp((-Math.LN2 * dtMs) / halfLife) : 0;
    const spatialScale = Math.max(0.65, Math.min(1, Number(responsiveScale) || 1));
    const driftScale = config.driftSpeedPxPerSec * spatialScale * (dtMs / 1000);
    const driftX = driftScale / this.width;
    const driftY = driftScale * 0.38 / this.height;

    gl.bindFramebuffer(gl.FRAMEBUFFER, this.historyFramebuffers[writeIndex]);
    gl.viewport(0, 0, this.width, this.height);
    gl.useProgram(this.feedbackProgram);
    gl.bindVertexArray(this.fullscreenVao);
    setTextureUnit(gl, this.feedbackUniforms.uCurrent, 0, activeCurrentTexture);
    setTextureUnit(gl, this.feedbackUniforms.uHistory, 1, this.historyTextures[readIndex]);
    gl.uniform2f(this.feedbackUniforms.uTexel, 1 / this.width, 1 / this.height);
    gl.uniform2f(this.feedbackUniforms.uDrift, driftX, driftY);
    gl.uniform1f(this.feedbackUniforms.uTime, performance.now() / 1000);
    gl.uniform1f(this.feedbackUniforms.uDecay, decay);
    gl.uniform1f(this.feedbackUniforms.uThreshold, config.emissionThreshold || 0);
    gl.uniform1f(this.feedbackUniforms.uHaloSpread, config.haloSpread * spatialScale);
    gl.uniform1f(this.feedbackUniforms.uTurbulence, config.turbulence);
    gl.uniform1f(this.feedbackUniforms.uEmissionGain, config.emissionGain);
    gl.uniform1i(this.feedbackUniforms.uBloomLevels, Math.round(config.bloomLevels || 2));
    gl.drawArrays(gl.TRIANGLES, 0, 3);

    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.viewport(0, 0, this.width, this.height);
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.useProgram(this.presentProgram);
    gl.bindVertexArray(this.fullscreenVao);
    setTextureUnit(gl, this.presentUniforms.uCurrent, 0, activeCurrentTexture);
    setTextureUnit(gl, this.presentUniforms.uHistory, 1, this.historyTextures[writeIndex]);
    gl.uniform1f(this.presentUniforms.uFogDensity, config.fogDensity);
    gl.uniform1f(this.presentUniforms.uEmissionGain, config.emissionGain);
    gl.uniform1f(this.presentUniforms.uAccentLift, config.accentLift);
    gl.uniform1f(this.presentUniforms.uExtinction, config.extinction || 0);
    gl.uniform4f(
      this.presentUniforms.uTitleMask,
      titleMask.x,
      1 - titleMask.y,
      titleMask.radiusX,
      titleMask.radiusY,
    );
    gl.uniform1f(this.presentUniforms.uTitleClearance, config.titleClearance);
    gl.uniform1f(this.presentUniforms.uDensityCurve, config.densityCurve || 1);
    gl.uniform1f(this.presentUniforms.uWhitePoint, config.whitePoint || 1);
    gl.uniform1f(this.presentUniforms.uColourSeparation, config.colourSeparation || 0);
    gl.uniform1f(this.presentUniforms.uOpacityCeiling, config.opacityCeiling || 0.94);
    gl.uniform1f(this.presentUniforms.uLightDefinition, config.lightDefinition || 0);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
    this.historyIndex = writeIndex;
  }

  destroy() {
    const gl = this.gl;
    this.outputCanvas.removeEventListener('webglcontextlost', this.handleContextLost);
    this.historyTextures?.forEach((texture) => gl.deleteTexture(texture));
    this.historyFramebuffers?.forEach((framebuffer) => gl.deleteFramebuffer(framebuffer));
    gl.deleteTexture(this.sourceTexture);
    if (this.currentTexture !== this.sourceTexture) gl.deleteTexture(this.currentTexture);
    if (this.currentFramebuffer) gl.deleteFramebuffer(this.currentFramebuffer);
    gl.deleteProgram(this.feedbackProgram);
    gl.deleteProgram(this.presentProgram);
    if (this.splatProgram) gl.deleteProgram(this.splatProgram);
    gl.deleteBuffer(this.fullscreenBuffer);
    gl.deleteVertexArray(this.fullscreenVao);
    if (this.cornerBuffer) gl.deleteBuffer(this.cornerBuffer);
    if (this.instanceBuffer) gl.deleteBuffer(this.instanceBuffer);
    if (this.splatVao) gl.deleteVertexArray(this.splatVao);
  }
}
