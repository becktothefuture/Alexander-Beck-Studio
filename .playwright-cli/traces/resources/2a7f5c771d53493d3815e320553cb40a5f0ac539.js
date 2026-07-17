"use client";
import "/node_modules/.vite/deps/chunk-G3PMV62Z.js?v=6e8fde4d";

// node_modules/web-haptics/dist/chunk-4NSAIXAB.mjs
var b = { success: { pattern: [{ duration: 30, intensity: 0.5 }, { delay: 60, duration: 40, intensity: 1 }] }, warning: { pattern: [{ duration: 40, intensity: 0.8 }, { delay: 100, duration: 40, intensity: 0.6 }] }, error: { pattern: [{ duration: 40, intensity: 0.9 }, { delay: 40, duration: 40, intensity: 0.9 }, { delay: 40, duration: 40, intensity: 0.9 }] }, light: { pattern: [{ duration: 15, intensity: 0.4 }] }, medium: { pattern: [{ duration: 25, intensity: 0.7 }] }, heavy: { pattern: [{ duration: 35, intensity: 1 }] }, soft: { pattern: [{ duration: 40, intensity: 0.5 }] }, rigid: { pattern: [{ duration: 10, intensity: 1 }] }, selection: { pattern: [{ duration: 8, intensity: 0.3 }] }, nudge: { pattern: [{ duration: 80, intensity: 0.8 }, { delay: 80, duration: 50, intensity: 0.3 }] }, buzz: { pattern: [{ duration: 1e3, intensity: 1 }] } };
var g = 16;
var x = 184;
var m = 1e3;
var p = 20;
function C(o2) {
  if (typeof o2 == "number") return { vibrations: [{ duration: o2 }] };
  if (typeof o2 == "string") {
    let i = b[o2];
    return i ? { vibrations: i.pattern.map((t) => ({ ...t })) } : (console.warn(`[web-haptics] Unknown preset: "${o2}"`), null);
  }
  if (Array.isArray(o2)) {
    if (o2.length === 0) return { vibrations: [] };
    if (typeof o2[0] == "number") {
      let i = o2, t = [];
      for (let e = 0; e < i.length; e += 2) {
        let n = e > 0 ? i[e - 1] : 0;
        t.push({ ...n > 0 && { delay: n }, duration: i[e] });
      }
      return { vibrations: t };
    }
    return { vibrations: o2.map((i) => ({ ...i })) };
  }
  return { vibrations: o2.pattern.map((i) => ({ ...i })) };
}
function w(o2, i) {
  if (i >= 1) return [o2];
  if (i <= 0) return [];
  let t = Math.max(1, Math.round(p * i)), e = p - t, n = [], s2 = o2;
  for (; s2 >= p; ) n.push(t), n.push(e), s2 -= p;
  if (s2 > 0) {
    let a = Math.max(1, Math.round(s2 * i));
    n.push(a);
    let r = s2 - a;
    r > 0 && n.push(r);
  }
  return n;
}
function M(o2, i) {
  let t = [];
  for (let e = 0; e < o2.length; e++) {
    let n = o2[e], s2 = Math.max(0, Math.min(1, n.intensity ?? i)), a = n.delay ?? 0;
    a > 0 && (t.length > 0 && t.length % 2 === 0 ? t[t.length - 1] += a : (t.length === 0 && t.push(0), t.push(a)));
    let r = w(n.duration, s2);
    if (r.length === 0) {
      t.length > 0 && t.length % 2 === 0 ? t[t.length - 1] += n.duration : n.duration > 0 && (t.push(0), t.push(n.duration));
      continue;
    }
    for (let d of r) t.push(d);
  }
  return t;
}
var I = 0;
var v = class o {
  hapticLabel = null;
  domInitialized = false;
  instanceId;
  debug;
  showSwitch;
  rafId = null;
  patternResolve = null;
  audioCtx = null;
  audioFilter = null;
  audioGain = null;
  audioBuffer = null;
  constructor(i) {
    this.instanceId = ++I, this.debug = i?.debug ?? false, this.showSwitch = i?.showSwitch ?? false;
  }
  static isSupported = typeof navigator < "u" && typeof navigator.vibrate == "function";
  async trigger(i = [{ duration: 25, intensity: 0.7 }], t) {
    let e = C(i);
    if (!e) return;
    let { vibrations: n } = e;
    if (n.length === 0) return;
    let s2 = Math.max(0, Math.min(1, t?.intensity ?? 0.5));
    for (let a of n) if (a.duration > m && (a.duration = m), !Number.isFinite(a.duration) || a.duration < 0 || a.delay !== void 0 && (!Number.isFinite(a.delay) || a.delay < 0)) {
      console.warn("[web-haptics] Invalid vibration values. Durations and delays must be finite non-negative numbers.");
      return;
    }
    if (o.isSupported && navigator.vibrate(M(n, s2)), !o.isSupported || this.debug) {
      if (this.ensureDOM(), !this.hapticLabel) return;
      this.debug && await this.ensureAudio(), this.stopPattern();
      let r = (n[0]?.delay ?? 0) === 0;
      if (r && (this.hapticLabel.click(), this.debug && this.audioCtx)) {
        let d = Math.max(0, Math.min(1, n[0].intensity ?? s2));
        this.playClick(d);
      }
      await this.runPattern(n, s2, r);
    }
  }
  cancel() {
    this.stopPattern(), o.isSupported && navigator.vibrate(0);
  }
  destroy() {
    this.stopPattern(), this.hapticLabel && (this.hapticLabel.remove(), this.hapticLabel = null, this.domInitialized = false), this.audioCtx && (this.audioCtx.close(), this.audioCtx = null, this.audioFilter = null, this.audioGain = null, this.audioBuffer = null);
  }
  setDebug(i) {
    this.debug = i, !i && this.audioCtx && (this.audioCtx.close(), this.audioCtx = null, this.audioFilter = null, this.audioGain = null, this.audioBuffer = null);
  }
  setShowSwitch(i) {
    if (this.showSwitch = i, this.hapticLabel) {
      let t = this.hapticLabel.querySelector("input");
      this.hapticLabel.style.display = i ? "" : "none", t && (t.style.display = i ? "" : "none");
    }
  }
  stopPattern() {
    this.rafId !== null && (cancelAnimationFrame(this.rafId), this.rafId = null), this.patternResolve?.(), this.patternResolve = null;
  }
  runPattern(i, t, e) {
    return new Promise((n) => {
      this.patternResolve = n;
      let s2 = [], a = 0;
      for (let u of i) {
        let c = Math.max(0, Math.min(1, u.intensity ?? t)), l = u.delay ?? 0;
        l > 0 && (a += l, s2.push({ end: a, isOn: false, intensity: 0 })), a += u.duration, s2.push({ end: a, isOn: true, intensity: c });
      }
      let r = a, d = 0, h = -1, y = (u) => {
        d === 0 && (d = u);
        let c = u - d;
        if (c >= r) {
          this.rafId = null, this.patternResolve = null, n();
          return;
        }
        let l = s2[0];
        for (let f of s2) if (c < f.end) {
          l = f;
          break;
        }
        if (l.isOn) {
          let f = g + (1 - l.intensity) * x;
          h === -1 ? (h = u, e || (this.hapticLabel?.click(), this.debug && this.audioCtx && this.playClick(l.intensity), e = true)) : u - h >= f && (this.hapticLabel?.click(), this.debug && this.audioCtx && this.playClick(l.intensity), h = u);
        }
        this.rafId = requestAnimationFrame(y);
      };
      this.rafId = requestAnimationFrame(y);
    });
  }
  playClick(i) {
    if (!this.audioCtx || !this.audioFilter || !this.audioGain || !this.audioBuffer) return;
    let t = this.audioBuffer.getChannelData(0);
    for (let a = 0; a < t.length; a++) t[a] = (Math.random() * 2 - 1) * Math.exp(-a / 25);
    this.audioGain.gain.value = 0.5 * i;
    let e = 2e3 + i * 2e3, n = 1 + (Math.random() - 0.5) * 0.3;
    this.audioFilter.frequency.value = e * n;
    let s2 = this.audioCtx.createBufferSource();
    s2.buffer = this.audioBuffer, s2.connect(this.audioFilter), s2.onended = () => s2.disconnect(), s2.start();
  }
  async ensureAudio() {
    if (!this.audioCtx && typeof AudioContext < "u") {
      this.audioCtx = new AudioContext(), this.audioFilter = this.audioCtx.createBiquadFilter(), this.audioFilter.type = "bandpass", this.audioFilter.frequency.value = 4e3, this.audioFilter.Q.value = 8, this.audioGain = this.audioCtx.createGain(), this.audioFilter.connect(this.audioGain), this.audioGain.connect(this.audioCtx.destination);
      let i = 4e-3;
      this.audioBuffer = this.audioCtx.createBuffer(1, this.audioCtx.sampleRate * i, this.audioCtx.sampleRate);
      let t = this.audioBuffer.getChannelData(0);
      for (let e = 0; e < t.length; e++) t[e] = (Math.random() * 2 - 1) * Math.exp(-e / 25);
    }
    this.audioCtx?.state === "suspended" && await this.audioCtx.resume();
  }
  ensureDOM() {
    if (this.domInitialized || typeof document > "u") return;
    let i = `web-haptics-${this.instanceId}`, t = document.createElement("label");
    t.setAttribute("for", i), t.textContent = "Haptic feedback", t.style.position = "fixed", t.style.bottom = "10px", t.style.left = "10px", t.style.padding = "5px 10px", t.style.backgroundColor = "rgba(0, 0, 0, 0.7)", t.style.color = "white", t.style.fontFamily = "sans-serif", t.style.fontSize = "14px", t.style.borderRadius = "4px", t.style.zIndex = "9999", t.style.userSelect = "none", this.hapticLabel = t;
    let e = document.createElement("input");
    e.type = "checkbox", e.setAttribute("switch", ""), e.id = i, e.style.all = "initial", e.style.appearance = "auto", this.showSwitch || (t.style.display = "none", e.style.display = "none"), t.appendChild(e), document.body.appendChild(t), this.domInitialized = true;
  }
};

// node_modules/web-haptics/dist/index.mjs
var s = "0.0.6";
export {
  v as WebHaptics,
  b as defaultPatterns,
  s as version
};
//# sourceMappingURL=web-haptics.js.map
