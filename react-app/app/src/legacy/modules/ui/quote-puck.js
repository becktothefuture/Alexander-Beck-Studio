// ╔══════════════════════════════════════════════════════════════════════════════╗
// ║                    QUOTE PUCK — AIR-HOCKEY PHYSICS                             ║
// ║   Drag-to-flick · wall bounce · friction · spin on text via --quote-tilt.     ║
// ║   Round fill (.quote-display__disk) scales on hover; text does not.            ║
// ║   stays aligned with the scene (rotating the surface warps high-contrast edges). ║
// ║   Shell: left/top only — rim/shadow stay fixed. No drag/hover CSS class.     ║
// ╚══════════════════════════════════════════════════════════════════════════════╝

import { playCollisionSound } from '../audio/sound-engine.js';

const SAMPLES = 5;
const SAMPLE_AGE = 120;
const MAX_DT = 1 / 30;
const MIN_RELEASE = 30;
const MIN_ALIVE = 8;
const MAX_SPEED = 5000;
const RESTITUTION = 0.55;
const FRICTION = 1.2;
const SPIN_FRICTION = 3.0;
const WALL_SPIN_GAIN = 0.06;
const MIN_SPIN = 0.3;
const SOUND_ID = 'quote-puck';
const DEG = 180 / Math.PI;

function clamp(v, lo, hi) {
  return v < lo ? lo : v > hi ? hi : v;
}

export function initQuotePuck() {
  const el = document.getElementById('quote-display');
  if (!el || !el.querySelector('.quote-display__disk')) return;

  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

  const initRect = el.getBoundingClientRect();
  let x = initRect.left;
  let y = initRect.top;
  let w = el.offsetWidth;
  let h = el.offsetHeight;

  el.classList.add('quote-display--positioned');
  el.style.left = `${x}px`;
  el.style.top = `${y}px`;
  el.style.touchAction = 'none';
  el.style.removeProperty('transform');

  let vx = 0;
  let vy = 0;
  let angle = -3;
  let spin = 0;
  let prevHeading = null;
  let dragging = false;
  let pid = null;
  let offX = 0;
  let offY = 0;
  let raf = 0;
  let lastTs = 0;
  let samples = [];

  function bounds() {
    w = el.offsetWidth;
    h = el.offsetHeight;
    return { minX: 0, minY: 0, maxX: window.innerWidth - w, maxY: window.innerHeight - h };
  }

  function writePos() {
    el.style.left = `${x}px`;
    el.style.top = `${y}px`;
    el.style.setProperty('--quote-tilt', `${angle.toFixed(1)}deg`);
  }

  function pushSample(e) {
    samples.push({ x: e.clientX, y: e.clientY, t: e.timeStamp || performance.now() });
    if (samples.length > SAMPLES) samples.shift();
  }

  function estimateVelocity() {
    if (samples.length < 2) return { vx: 0, vy: 0 };
    const newest = samples[samples.length - 1].t;
    const recent = samples.filter((s) => newest - s.t <= SAMPLE_AGE);
    if (recent.length < 2) return { vx: 0, vy: 0 };

    let svx = 0;
    let svy = 0;
    let sw = 0;
    for (let i = 1; i < recent.length; i++) {
      const a = recent[i - 1];
      const b = recent[i];
      const dt = (b.t - a.t) / 1000;
      if (dt <= 0) continue;
      const weight = i;
      svx += ((b.x - a.x) / dt) * weight;
      svy += ((b.y - a.y) / dt) * weight;
      sw += weight;
    }
    if (!sw) return { vx: 0, vy: 0 };
    let rvx = svx / sw;
    let rvy = svy / sw;
    const spd = Math.hypot(rvx, rvy);
    if (spd > MAX_SPEED) {
      const k = MAX_SPEED / spd;
      rvx *= k;
      rvy *= k;
    }
    return { vx: rvx, vy: rvy };
  }

  function estimateSpin() {
    if (samples.length < 3) return 0;
    const newest = samples[samples.length - 1].t;
    const recent = samples.filter((s) => newest - s.t <= SAMPLE_AGE);
    if (recent.length < 3) return 0;

    let totalAngleDelta = 0;
    let totalTime = 0;

    for (let i = 2; i < recent.length; i++) {
      const a = recent[i - 2];
      const b = recent[i - 1];
      const c = recent[i];
      const dt = (c.t - a.t) / 1000;
      if (dt <= 0) continue;

      const h1 = Math.atan2(b.y - a.y, b.x - a.x);
      const h2 = Math.atan2(c.y - b.y, c.x - b.x);

      let dh = h2 - h1;
      if (dh > Math.PI) dh -= 2 * Math.PI;
      if (dh < -Math.PI) dh += 2 * Math.PI;

      totalAngleDelta += dh;
      totalTime += dt;
    }

    if (totalTime <= 0) return 0;
    return (totalAngleDelta / totalTime) * DEG;
  }

  function wallSound(impactVx, impactVy) {
    const spd = Math.hypot(impactVx, impactVy);
    if (spd < MIN_ALIVE) return;
    const intensity = clamp(spd / MAX_SPEED, 0.05, 1);
    const pan = clamp((x + w / 2) / Math.max(1, window.innerWidth), 0, 1);
    playCollisionSound(w / 2, intensity, pan, SOUND_ID);
  }

  function isAlive() {
    return Math.hypot(vx, vy) >= MIN_ALIVE || Math.abs(spin) >= MIN_SPIN;
  }

  function stopLoop() {
    if (raf) {
      cancelAnimationFrame(raf);
      raf = 0;
    }
    vx = 0;
    vy = 0;
    spin = 0;
    lastTs = 0;
  }

  function startLoop() {
    if (dragging || prefersReducedMotion.matches || raf) return;
    if (!isAlive()) {
      stopLoop();
      return;
    }
    lastTs = 0;
    raf = requestAnimationFrame(tick);
  }

  function tick(ts) {
    raf = 0;
    if (dragging || document.hidden || prefersReducedMotion.matches) return;
    if (!lastTs) {
      lastTs = ts;
      raf = requestAnimationFrame(tick);
      return;
    }

    const dt = Math.min((ts - lastTs) / 1000, MAX_DT);
    lastTs = ts;
    if (dt <= 0) {
      raf = requestAnimationFrame(tick);
      return;
    }

    const damp = Math.exp(-FRICTION * dt);
    vx *= damp;
    vy *= damp;

    spin *= Math.exp(-SPIN_FRICTION * dt);
    if (Math.abs(spin) < MIN_SPIN) spin = 0;

    angle += spin * dt;

    const b = bounds();
    const pvx = vx;
    const pvy = vy;

    x += vx * dt;
    y += vy * dt;

    let hitX = false;
    let hitY = false;

    if (x <= b.minX) {
      x = b.minX;
      if (pvx < 0) {
        vx = -pvx * RESTITUTION;
        hitX = true;
      }
    } else if (x >= b.maxX) {
      x = b.maxX;
      if (pvx > 0) {
        vx = -pvx * RESTITUTION;
        hitX = true;
      }
    }

    if (y <= b.minY) {
      y = b.minY;
      if (pvy < 0) {
        vy = -pvy * RESTITUTION;
        hitY = true;
      }
    } else if (y >= b.maxY) {
      y = b.maxY;
      if (pvy > 0) {
        vy = -pvy * RESTITUTION;
        hitY = true;
      }
    }

    if (hitX || hitY) {
      let tangential = 0;
      if (hitX) tangential += pvy;
      if (hitY) tangential -= pvx;
      spin += tangential * WALL_SPIN_GAIN;

      wallSound(hitX ? pvx : 0, hitY ? pvy : 0);
      if (Math.abs(vx) < MIN_ALIVE) vx = 0;
      if (Math.abs(vy) < MIN_ALIVE) vy = 0;
    }

    writePos();

    if (!isAlive()) {
      stopLoop();
      return;
    }
    raf = requestAnimationFrame(tick);
  }

  function onDown(e) {
    if (dragging || !e.isPrimary) return;
    if (e.pointerType === 'mouse' && e.button !== 0) return;

    stopLoop();
    w = el.offsetWidth;
    h = el.offsetHeight;

    dragging = true;
    pid = e.pointerId;
    offX = e.clientX - x;
    offY = e.clientY - y;
    samples = [];
    prevHeading = null;
    pushSample(e);

    try {
      el.setPointerCapture(e.pointerId);
    } catch {}
    e.preventDefault();
  }

  function onMove(e) {
    if (!dragging || e.pointerId !== pid) return;

    if (
      e.clientX < 0 ||
      e.clientX > window.innerWidth ||
      e.clientY < 0 ||
      e.clientY > window.innerHeight
    ) {
      endDrag(true);
      return;
    }

    const prevX = x;
    const prevY = y;
    pushSample(e);
    const b = bounds();
    x = clamp(e.clientX - offX, b.minX, b.maxX);
    y = clamp(e.clientY - offY, b.minY, b.maxY);

    const dx = x - prevX;
    const dy = y - prevY;
    const dist = Math.hypot(dx, dy);
    if (dist > 2) {
      const heading = Math.atan2(dy, dx);
      if (prevHeading !== null) {
        let dh = heading - prevHeading;
        if (dh > Math.PI) dh -= 2 * Math.PI;
        if (dh < -Math.PI) dh += 2 * Math.PI;
        angle += dh * DEG * 0.3;
      }
      prevHeading = heading;
    }

    writePos();
  }

  function endDrag(withMomentum) {
    if (!dragging) return;
    const p = pid;
    dragging = false;
    pid = null;
    prevHeading = null;
    try {
      if (p !== null && el.hasPointerCapture(p)) el.releasePointerCapture(p);
    } catch {}

    if (!withMomentum || prefersReducedMotion.matches) {
      samples = [];
      stopLoop();
      return;
    }

    const v = estimateVelocity();
    spin = estimateSpin() * 0.3;
    samples = [];
    vx = v.vx;
    vy = v.vy;

    if (Math.hypot(vx, vy) < MIN_RELEASE) {
      stopLoop();
      return;
    }

    const b = bounds();
    if (x <= b.minX && vx < 0) {
      vx = -vx * RESTITUTION;
      wallSound(vx, 0);
    } else if (x >= b.maxX && vx > 0) {
      vx = -vx * RESTITUTION;
      wallSound(vx, 0);
    }
    if (y <= b.minY && vy < 0) {
      vy = -vy * RESTITUTION;
      wallSound(0, vy);
    } else if (y >= b.maxY && vy > 0) {
      vy = -vy * RESTITUTION;
      wallSound(0, vy);
    }

    startLoop();
  }

  function onUp(e) {
    if (e && e.pointerId !== pid) return;
    if (e) {
      const inBounds =
        e.clientX >= 0 &&
        e.clientX <= window.innerWidth &&
        e.clientY >= 0 &&
        e.clientY <= window.innerHeight;
      if (inBounds) pushSample(e);
    }
    endDrag(true);
  }

  function onCancel() {
    endDrag(false);
  }

  function onLostCapture() {
    if (dragging) endDrag(true);
  }

  function onResize() {
    const b = bounds();
    x = clamp(x, b.minX, b.maxX);
    y = clamp(y, b.minY, b.maxY);
    writePos();
  }

  function onVisChange() {
    if (document.hidden) {
      if (raf) {
        cancelAnimationFrame(raf);
        raf = 0;
        lastTs = 0;
      }
    } else if (isAlive() && !dragging) {
      startLoop();
    }
  }

  function onBlur() {
    if (dragging) endDrag(true);
  }

  el.addEventListener('pointerdown', onDown);
  el.addEventListener('pointermove', onMove);
  el.addEventListener('pointerup', onUp);
  el.addEventListener('pointercancel', onCancel);
  el.addEventListener('lostpointercapture', onLostCapture);
  window.addEventListener('resize', onResize, { passive: true });
  window.addEventListener('blur', onBlur);
  document.addEventListener('visibilitychange', onVisChange);

  writePos();
}
