function clamp01(value) {
  return Math.min(1, Math.max(0, Number(value) || 0));
}

function rgb255ToHex({ r, g, b }) {
  const rr = (r | 0) & 255;
  const gg = (g | 0) & 255;
  const bb = (b | 0) & 255;
  const n = (rr << 16) | (gg << 8) | bb;
  return `#${n.toString(16).padStart(6, '0')}`;
}

function hexToRgb01(hex) {
  const h = String(hex || '').trim();
  if (!h) return null;
  const s = h[0] === '#' ? h.slice(1) : h;
  if (!(s.length === 3 || s.length === 6)) return null;
  const full = s.length === 3
    ? (s[0] + s[0] + s[1] + s[1] + s[2] + s[2])
    : s;
  const n = Number.parseInt(full, 16);
  if (!Number.isFinite(n)) return null;
  const r = (n >> 16) & 255;
  const g = (n >> 8) & 255;
  const b = n & 255;
  return { r: r / 255, g: g / 255, b: b / 255 };
}

function rgb01ToHsv({ r, g, b }) {
  const rr = clamp01(r);
  const gg = clamp01(g);
  const bb = clamp01(b);

  const max = Math.max(rr, gg, bb);
  const min = Math.min(rr, gg, bb);
  const d = max - min;

  let h = 0;
  if (d > 0) {
    if (max === rr) h = ((gg - bb) / d) % 6;
    else if (max === gg) h = (bb - rr) / d + 2;
    else h = (rr - gg) / d + 4;
    h *= 60;
    if (h < 0) h += 360;
  }

  const s = max <= 0 ? 0 : (d / max);
  const v = max;
  return { h, s, v };
}

function hsvToRgb01({ h, s, v }) {
  const hh = ((Number(h) % 360) + 360) % 360;
  const ss = clamp01(s);
  const vv = clamp01(v);

  const c = vv * ss;
  const x = c * (1 - Math.abs(((hh / 60) % 2) - 1));
  const m = vv - c;

  let rr = 0;
  let gg = 0;
  let bb = 0;
  if (hh < 60) { rr = c; gg = x; bb = 0; }
  else if (hh < 120) { rr = x; gg = c; bb = 0; }
  else if (hh < 180) { rr = 0; gg = c; bb = x; }
  else if (hh < 240) { rr = 0; gg = x; bb = c; }
  else if (hh < 300) { rr = x; gg = 0; bb = c; }
  else { rr = c; gg = 0; bb = x; }

  return { r: rr + m, g: gg + m, b: bb + m };
}

export function desaturateGreysToBackground(palette, bgHex, isDarkMode = false) {
  if (!Array.isArray(palette)) return palette;
  const out = [...palette];
  const bgRgb = hexToRgb01(bgHex);
  if (!bgRgb) return out;
  const bgHsv = rgb01ToHsv(bgRgb);
  const bgHue = bgHsv.s < 0.05 ? 0 : bgHsv.h;

  for (const index of [0, 1]) {
    const greyRgb = hexToRgb01(out[index]);
    if (!greyRgb) continue;
    const greyHsv = rgb01ToHsv(greyRgb);
    const desaturatedSat = Math.max(0, Math.min(0.15, greyHsv.s * 0.1));
    const adjustedValue = isDarkMode
      ? Math.max(0.15, greyHsv.v * 0.55)
      : greyHsv.v;
    const desaturatedRgb = hsvToRgb01({
      h: bgHue,
      s: desaturatedSat,
      v: adjustedValue,
    });
    out[index] = rgb255ToHex({
      r: Math.round(desaturatedRgb.r * 255),
      g: Math.round(desaturatedRgb.g * 255),
      b: Math.round(desaturatedRgb.b * 255),
    });
  }

  return out;
}
