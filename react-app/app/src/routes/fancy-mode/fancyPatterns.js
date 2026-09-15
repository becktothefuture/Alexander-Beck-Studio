// The legend and field use the same atlas and expertise-to-pattern contract.
import { resolveFancyPatternFamily } from './fancyStyles.js';

export const SPRITE_SIZE = 40;
export const FANCY_SHAPES = [
  { value: 0, label: 'Discs' }, { value: 1, label: 'Squares' },
  { value: 2, label: 'Crosses' }, { value: 3, label: 'Rings' },
  { value: 4, label: 'Split discs' }, { value: 5, label: 'Stripes' },
  { value: 6, label: 'Four dots' },
];
export const FANCY_ROLE_SHAPES = Object.freeze({
  'product-design': 1,
  'experience-design': 3,
  'art-direction': 4,
  'motion-3d': 5,
  'creative-engineering': 2,
  'parametric-systems': 6,
});
const WAKE_ROLES = [
  'motion-3d', 'experience-design', 'creative-engineering', 'art-direction',
  'parametric-systems', 'motion-3d', 'experience-design', 'product-design',
];
const TAU = Math.PI * 2;

function disc(ctx, x, y, radius) {
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, TAU);
  ctx.fill();
}

function rectangle(ctx, x, y, width, height, radius = 0) {
  if (!radius) {
    ctx.fillRect(x, y, width, height);
    return;
  }
  ctx.beginPath();
  ctx.roundRect(x, y, width, height, radius);
  ctx.fill();
}

function cross(ctx, x, y, size, thickness, radius = 0) {
  rectangle(ctx, x - thickness / 2, y - size / 2, thickness, size, radius);
  rectangle(ctx, x - size / 2, y - thickness / 2, size, thickness, radius);
}

// All pigment is flat. Rebuilt only when the palette, paper or family changes.
function createAtlas(colors, dark, family) {
  const atlas = document.createElement('canvas');
  atlas.width = SPRITE_SIZE * FANCY_SHAPES.length;
  atlas.height = SPRITE_SIZE * colors.length;
  const ctx = atlas.getContext('2d');
  const paper = dark ? '#ffffff' : colors[4];
  const ground = dark ? '#000000' : '#ffffff';
  const rounded = family === 1;
  const diagonal = family === 2;
  const bold = family === 3;
  for (let ci = 0; ci < colors.length; ci += 1) {
    // Neutral pigment reverses with the paper. Chromatic pigments never invert.
    const color = ci === (dark ? 4 : 2) ? paper : colors[ci];
    // Only the split disc has a second pigment. Never add white decoration to
    // coloured roles: each mark should read as one simple, coloured silhouette.
    const accent = ci === 6 ? colors[7] : colors[6];
    for (let shape = 0; shape < FANCY_SHAPES.length; shape += 1) {
      ctx.save();
      ctx.translate(shape * SPRITE_SIZE + 20, ci * SPRITE_SIZE + 20);
      ctx.fillStyle = color;
      if (shape === 0) disc(ctx, 0, 0, 18);
      if (diagonal && shape > 0) ctx.rotate(Math.PI / 4);
      if (shape === 1) {
        const size = diagonal ? 25.5 : 36;
        rectangle(ctx, -size / 2, -size / 2, size, size, rounded ? 10 : 0);
      }
      if (shape === 2) cross(ctx, 0, 0, 36, bold ? 16 : 10, rounded ? 5 : 0);
      if (shape === 3) {
        disc(ctx, 0, 0, 18);
        ctx.fillStyle = ground;
        disc(ctx, 0, 0, bold ? 8 : 11);
      }
      if (shape === 4) {
        disc(ctx, 0, 0, 18);
        ctx.beginPath();
        ctx.arc(0, 0, 18, 0, TAU);
        ctx.clip();
        if (rounded) ctx.rotate(Math.PI / 2);
        ctx.fillStyle = accent;
        rectangle(ctx, 0, -18, 18, 36);
      }
      if (shape === 5) {
        const count = bold ? 2 : 3;
        const width = diagonal ? 24 : 36;
        const height = bold ? 14 : diagonal ? 6 : 8;
        const spacing = bold ? 22 : diagonal ? 10 : 14;
        for (let stripe = 0; stripe < count; stripe += 1) {
          rectangle(ctx, -width / 2, -(count - 1) * spacing / 2 - height / 2 + stripe * spacing,
            width, height, rounded ? height / 2 : 0);
        }
      }
      if (shape === 6) {
        const radius = bold ? 8.5 : 7;
        const offset = diagonal ? 8 : 9;
        disc(ctx, -offset, -offset, radius);
        disc(ctx, offset, offset, radius);
        disc(ctx, offset, -offset, radius);
        disc(ctx, -offset, offset, radius);
      }
      ctx.restore();
    }
  }
  return atlas;
}

export class FancyPatternAtlas {
  constructor() {
    this.snapshot = null;
    this.dark = null;
    this.colorRoles = new Map();
    this.roleShapes = new Uint8Array(6);
    this.rolePigments = new Uint8Array(6);
    this.wakeRoles = new Uint8Array(WAKE_ROLES.length);
  }

  update(snapshot, dark, requestedFamily = 0, followPalette = false) {
    const family = resolveFancyPatternFamily(requestedFamily, followPalette, snapshot.paletteId);
    if (snapshot === this.snapshot && dark === this.dark && family === this.family) return;
    this.snapshot = snapshot;
    this.dark = dark;
    this.family = family;
    this.atlas = createAtlas(snapshot.colors, dark, family);
    this.colorRoles.clear();
    snapshot.distribution.forEach((role, index) => {
      this.roleShapes[index] = FANCY_ROLE_SHAPES[role.roleId] ?? index + 1;
      this.rolePigments[index] = role.colorIndex;
      const hex = snapshot.colors[role.colorIndex].toLowerCase();
      // A body's explicit role wins, even when two roles share one colour.
      if (this.colorRoles.has(hex)) return;
      const rgb = [1, 3, 5].map((start) => parseInt(hex.slice(start, start + 2), 16));
      this.colorRoles.set(hex, index);
      this.colorRoles.set(`rgb(${rgb.join(', ')})`, index);
      this.colorRoles.set(`rgba(${rgb.join(', ')}, 1)`, index);
    });
    WAKE_ROLES.forEach((roleId, index) => {
      this.wakeRoles[index] = Math.max(0, snapshot.distribution.findIndex((role) => role.roleId === roleId));
    });
  }

  resolveRole(distributionIndex, color) {
    if (Number.isInteger(distributionIndex) && distributionIndex >= 0 && distributionIndex < this.roleShapes.length) {
      return distributionIndex;
    }
    return this.colorRoles.get(color) ?? this.colorRoles.get(color.toLowerCase()) ?? 0;
  }
}

export function paintFancyLegend(patterns, selectedShape) {
  const roles = patterns.snapshot.distribution;
  for (const item of document.querySelectorAll('#expertise-legend .legend__item')) {
    const label = item.querySelector('span')?.textContent.trim().toLowerCase();
    const roleIndex = roles.findIndex((role) => role.label.trim().toLowerCase() === label);
    const swatch = item.querySelector('.circle');
    if (roleIndex < 0 || !swatch) continue;
    let canvas = swatch.querySelector('.fancy-legend-pattern');
    if (!canvas) {
      canvas = document.createElement('canvas');
      canvas.className = 'fancy-legend-pattern';
      canvas.width = SPRITE_SIZE;
      canvas.height = SPRITE_SIZE;
      canvas.setAttribute('aria-hidden', 'true');
      swatch.appendChild(canvas);
    }
    const shape = selectedShape === -1 ? patterns.roleShapes[roleIndex] : selectedShape;
    const pigment = patterns.rolePigments[roleIndex];
    canvas.dataset.role = roles[roleIndex].roleId;
    canvas.dataset.shape = String(shape);
    canvas.dataset.pigment = String(pigment);
    canvas.dataset.family = String(patterns.family);
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, SPRITE_SIZE, SPRITE_SIZE);
    ctx.drawImage(patterns.atlas, shape * SPRITE_SIZE, pigment * SPRITE_SIZE,
      SPRITE_SIZE, SPRITE_SIZE, 0, 0, SPRITE_SIZE, SPRITE_SIZE);
  }
}
