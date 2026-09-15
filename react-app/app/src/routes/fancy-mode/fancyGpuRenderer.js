// About already owns a WebGL renderer. Keep its depth-tested scene on the GPU:
// one low-resolution role image, two tiny history buffers and one atlas pass.
// No readPixels, projected-point arrays, duplicate context or independent RAF.
const VERTEX = `
  varying vec2 vUv;
  void main() { vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }
`;
const ACCUMULATE = `
  precision highp float;
  varying vec2 vUv;
  uniform sampler2D uSource;
  uniform sampler2D uPrevious;
  uniform vec2 uSize;
  uniform float uCell;
  uniform float uDt;
  uniform float uWake;
  uniform float uPatternScale;
  uniform float uReduced;
  uniform vec4 uRipples[8];
  uniform vec4 uWave; // speed, width, lifetime, strength
  uniform float uReveal;
  uniform float uRippleCount;
  uniform vec4 uTitle;
  uniform float uTitleClearance;
  uniform vec4 uCopy[8];
  uniform float uCopyCount;
  uniform float uCopyClearance;
  void main() {
    vec4 source = texture2D(uSource, vUv);
    vec4 previous = texture2D(uPrevious, vUv);
    vec2 p = vec2(vUv.x, 1.0 - vUv.y) * uSize;
    float wave = 0.0;
    for (int i = 0; i < 8; i++) {
      if (float(i) >= uRippleCount) break;
      vec4 ripple = uRipples[i];
      float band = max(0.0, 1.0 - abs(distance(p, ripple.xy) - ripple.z * uWave.x) / uWave.y);
      wave += band * band * exp(-ripple.z * 3.12 / uWave.z) * ripple.w * uWave.w;
    }
    float clearance = 1.0;
    if (uTitle.z > 0.0 && uTitle.w > 0.0) {
      vec2 delta = (p - uTitle.xy) / uTitle.zw;
      float d = pow(delta.x, 4.0) + pow(delta.y, 4.0);
      if (d < 1.0) clearance *= 1.0 - uTitleClearance * (1.0 - smoothstep(0.0, 1.0, d));
    }
    for (int i = 0; i < 8; i++) {
      if (float(i) >= uCopyCount) break;
      vec4 rect = uCopy[i];
      float edge = max(max(rect.x - p.x, p.x - rect.z), max(rect.y - p.y, p.y - rect.w));
      clearance *= 1.0 - uCopyClearance * (1.0 - smoothstep(0.0, uCell * 2.0, max(0.0, edge)));
    }
    float target = min(1.0, source.a + wave * uReveal) * clearance;
    float rate = target > previous.g ? 20.0 : 5.5 / max(0.01, uWake);
    float presence = uReduced > 0.5 || uWake < 0.01 ? target : mix(previous.g, target, 1.0 - exp(-uDt * rate));
    float energy = max(abs(source.a - previous.a) * 2.5, wave);
    float role = source.a > 0.01 ? source.r : previous.r;
    if (source.a < 0.01 && previous.g < 0.045) {
      vec2 cell = p / (uCell * uPatternScale);
      float band = sin(cell.x * 0.17 + sin(cell.y * 0.075) * 2.8) + cos(cell.y * 0.21 + cell.x * 0.046);
      role = (mod(floor((band + 2.0) * 1.99), 6.0) + 0.5) / 8.0;
    }
    gl_FragColor = vec4(role, presence, min(1.0, energy), source.a);
  }
`;
const STAMP = `
  precision highp float;
  varying vec2 vUv;
  uniform sampler2D uField;
  uniform sampler2D uAtlas;
  uniform vec2 uSize;
  uniform vec2 uGrid;
  uniform float uCell;
  uniform float uFill;
  uniform float uOpacity;
  uniform float uRichness;
  uniform float uMotionResponse;
  uniform float uGridLock;
  uniform float uPatternScale;
  uniform float uShape;
  uniform vec2 uRoles[6];
  void main() {
    vec2 p = vec2(vUv.x, 1.0 - vUv.y) * uSize;
    vec2 cell = floor(p / uCell);
    vec2 center = (cell + 0.5) * uCell;
    vec4 state = texture2D(uField, vec2((cell.x + 0.5) / uGrid.x, 1.0 - (cell.y + 0.5) / uGrid.y));
    if (state.g < 0.045) discard;
    float role = clamp(floor(state.r * 8.0), 0.0, 5.0);
    vec2 glyph = uRoles[0];
    for (int i = 0; i < 6; i++) { if (abs(float(i) - role) < 0.5) glyph = uRoles[i]; }
    float shape = uShape >= 0.0 ? uShape : glyph.x;
    float seed = fract(sin(dot(cell, vec2(127.1, 311.7))) * 43758.5453);
    vec2 bandCell = cell / uPatternScale;
    float band = (sin(bandCell.x * 0.17 + sin(bandCell.y * 0.075) * 2.8) + cos(bandCell.y * 0.21 + bandCell.x * 0.046) + 2.0) / 4.0;
    float blend = seed < 0.16 ? clamp(uRichness * 0.85 + state.b * uMotionResponse * 0.55 + state.g * 0.12 - band * 0.6, 0.0, 1.0) : 1.0;
    // Keep the same bounded within-cell give as the 2D field.
    center += (1.0 - uGridLock) * uCell * 0.4 * state.b * vec2(sin(seed * 6.28), cos(seed * 6.28));
    float size = uCell * uFill * min(1.0, sqrt(state.g) * 1.14);
    vec2 local = (p - center) / max(0.1, size) + 0.5;
    if (min(local.x, local.y) < 0.0 || max(local.x, local.y) > 1.0) discard;
    vec2 atlasUv = vec2((shape + local.x) / 7.0, 1.0 - (glyph.y + local.y) / 8.0);
    vec4 mark = texture2D(uAtlas, atlasUv);
    if (blend < 1.0) {
      vec4 disc = texture2D(uAtlas, vec2(local.x / 7.0, atlasUv.y));
      mark = mix(disc, mark, blend);
    }
    gl_FragColor = vec4(mark.rgb, mark.a * min(1.0, state.g * 3.5) * uOpacity);
    #include <colorspace_fragment>
  }
`;

export function createFancyGpuRenderer(THREE, renderer, field) {
  const source = new THREE.WebGLRenderTarget(1, 1, { minFilter: THREE.NearestFilter, magFilter: THREE.NearestFilter });
  const history = [0, 1].map(() => new THREE.WebGLRenderTarget(1, 1, {
    minFilter: THREE.NearestFilter, magFilter: THREE.NearestFilter, depthBuffer: false,
  }));
  const common = {
    uSize: { value: new THREE.Vector2() }, uCell: { value: 8 },
    uPatternScale: { value: 2 },
  };
  const accumulateUniforms = {
    ...common,
    uSource: { value: source.texture }, uPrevious: { value: history[0].texture },
    uDt: { value: 1 / 60 }, uWake: { value: 1 }, uReduced: { value: 0 },
    uRipples: { value: Array.from({ length: 8 }, () => new THREE.Vector4()) },
    uWave: { value: new THREE.Vector4() }, uReveal: { value: 0.32 }, uRippleCount: { value: 0 },
    uTitle: { value: new THREE.Vector4() }, uTitleClearance: { value: 0 },
    uCopy: { value: Array.from({ length: 8 }, () => new THREE.Vector4()) },
    uCopyCount: { value: 0 }, uCopyClearance: { value: 0 },
  };
  const stampUniforms = {
    ...common,
    uField: { value: null }, uAtlas: { value: null }, uGrid: { value: new THREE.Vector2() },
    uFill: { value: 1 }, uOpacity: { value: 1 }, uRichness: { value: 1.4 },
    uMotionResponse: { value: 1 }, uGridLock: { value: 0.9 }, uShape: { value: -1 },
    uRoles: { value: Array.from({ length: 6 }, () => new THREE.Vector2()) },
  };
  const accumulation = new THREE.ShaderMaterial({
    vertexShader: VERTEX, fragmentShader: ACCUMULATE, uniforms: accumulateUniforms,
    depthTest: false, depthWrite: false, blending: THREE.NoBlending,
  });
  const stamp = new THREE.ShaderMaterial({
    vertexShader: VERTEX, fragmentShader: STAMP, uniforms: stampUniforms,
    depthTest: false, depthWrite: false, transparent: true,
  });
  const quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), accumulation);
  quad.frustumCulled = false;
  const screen = new THREE.Scene();
  screen.add(quad);
  const camera = new THREE.Camera();
  let atlasCanvas = null;
  let atlasTexture = null;
  let previousTime = 0;
  let index = 0;
  let gridKey = '';

  return {
    render(scene, sceneCamera, sceneUniforms, canvas, width, height, particles) {
      const started = performance.now();
      const config = field.config;
      const patterns = field.patterns;
      patterns.update(field.getPalette(), config.dark, config.family, config.followPalette);
      if (atlasCanvas !== patterns.atlas) {
        atlasTexture?.dispose();
        atlasCanvas = patterns.atlas;
        atlasTexture = new THREE.CanvasTexture(atlasCanvas);
        atlasTexture.colorSpace = THREE.SRGBColorSpace;
        atlasTexture.generateMipmaps = false;
        atlasTexture.minFilter = THREE.LinearFilter;
        stampUniforms.uAtlas.value = atlasTexture;
      }
      if (field.canvas !== canvas) {
        field.canvas = canvas;
        field.ripples.length = 0;
      }
      field.width = width;
      field.height = height;
      field.cell = Math.max(config.cell || (width <= 600 ? 7 : 9), Math.sqrt(width * height / 24000));
      field.onFrame();
      const cols = Math.ceil(width / field.cell);
      const rows = Math.ceil(height / field.cell);
      const nextGridKey = `${cols}:${rows}:${field.cell}`;
      const previousTarget = renderer.getRenderTarget();
      if (nextGridKey !== gridKey) {
        gridKey = nextGridKey;
        source.setSize(cols, rows);
        for (const target of history) {
          target.setSize(cols, rows);
          renderer.setRenderTarget(target);
          renderer.clear();
        }
      }
      const now = started / 1000;
      while (field.ripples.length && now - field.ripples[0].born > config.rippleLife) field.ripples.shift();
      common.uSize.value.set(width, height);
      common.uCell.value = field.cell;
      common.uPatternScale.value = config.patternScale;
      accumulateUniforms.uDt.value = Math.min(0.05, previousTime ? now - previousTime : 1 / 60);
      previousTime = now;
      accumulateUniforms.uWake.value = config.wake * (config.adaptSimulation ? 0.35 : 1);
      accumulateUniforms.uReduced.value = field.reducedMotion ? 1 : 0;
      accumulateUniforms.uReveal.value = config.reveal;
      accumulateUniforms.uWave.value.set(config.rippleSpeed, config.rippleWidth, config.rippleLife, config.rippleStrength);
      accumulateUniforms.uRippleCount.value = field.ripples.length;
      field.ripples.forEach((ripple, i) => accumulateUniforms.uRipples.value[i].set(ripple.x, ripple.y, now - ripple.born, ripple.strength));
      const title = field.title;
      accumulateUniforms.uTitle.value.set(title?.x || 0, title?.y || 0, title?.rx || 0, title?.ry || 0);
      accumulateUniforms.uTitleClearance.value = config.artwork ? 0 : config.titleClearance;
      accumulateUniforms.uCopyClearance.value = config.artwork ? 0 : config.copyClearance;
      accumulateUniforms.uCopyCount.value = Math.min(8, field.copyRegions.length);
      for (let i = 0; i < Math.min(8, field.copyRegions.length); i++) {
        const rect = field.copyRegions[i];
        accumulateUniforms.uCopy.value[i].set(rect.left, rect.top, rect.right, rect.bottom);
      }
      stampUniforms.uGrid.value.set(cols, rows);
      for (const key of ['fill', 'opacity', 'richness', 'motionResponse', 'gridLock', 'shape']) {
        stampUniforms[`u${key[0].toUpperCase()}${key.slice(1)}`].value = config[key];
      }
      for (let i = 0; i < 6; i++) stampUniforms.uRoles.value[i].set(patterns.roleShapes[i], patterns.rolePigments[i]);
      // The existing scene writes role IDs instead of shaded ball sprites.
      sceneUniforms.uPresentationEncoding.value = 1;
      sceneUniforms.uPresentationCoverage.value = config.coverage;
      sceneUniforms.uPresentationMinRadiusPx.value = config.adaptSimulation ? field.cell * 0.75 * renderer.getPixelRatio() : 0;
      renderer.setRenderTarget(source);
      renderer.render(scene, sceneCamera);
      sceneUniforms.uPresentationEncoding.value = 0;
      sceneUniforms.uPresentationCoverage.value = 1;
      sceneUniforms.uPresentationMinRadiusPx.value = 0;
      const next = 1 - index;
      accumulateUniforms.uPrevious.value = history[index].texture;
      renderer.setRenderTarget(history[next]);
      quad.material = accumulation;
      renderer.render(screen, camera);
      stampUniforms.uField.value = history[next].texture;
      renderer.setRenderTarget(previousTarget);
      quad.material = stamp;
      renderer.render(screen, camera);
      index = next;
      field.stats.frames += 1;
      field.stats.profile = 'about';
      field.stats.renderer = 'webgl-grid';
      field.stats.cells = cols * rows;
      field.stats.visibleCells = null; // No expensive GPU readback for a counter.
      field.stats.particles = particles;
      field.stats.frameMs = field.stats.frameMs * 0.94 + (performance.now() - started) * 0.06;
    },
    destroy() {
      source.dispose();
      history.forEach((target) => target.dispose());
      atlasTexture?.dispose();
      accumulation.dispose();
      stamp.dispose();
      quad.geometry.dispose();
    },
  };
}
