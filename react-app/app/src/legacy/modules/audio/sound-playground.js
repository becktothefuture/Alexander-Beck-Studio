let audioContext = null;
let outputGain = null;
let isReady = false;
let previewTimers = [];

// THROWAWAY AUDITION PROTOTYPE: three scroll-detent families for review in
// /lab/sound-playground.html. Production routes do not import these voices.
const SCROLL_CANDIDATE_IDS = Object.freeze([
  'felt-ratchet',
  'crystal-notch',
  'air-teeth',
]);

const SCROLL_CANDIDATE_INTERVAL_MS = Object.freeze({
  'felt-ratchet': 48,
  'crystal-notch': 58,
  'air-teeth': 54,
});

const lastScrollCandidateAt = new Map();

function getAudioContextConstructor() {
  if (typeof window === 'undefined') return null;
  return window.AudioContext || window.webkitAudioContext || null;
}

function scheduleEnvelope(gainNode, start, peak, attack, release) {
  const safePeak = Math.max(0.0001, peak);
  gainNode.gain.setValueAtTime(0.0001, start);
  gainNode.gain.exponentialRampToValueAtTime(safePeak, start + attack);
  gainNode.gain.exponentialRampToValueAtTime(0.0001, start + attack + release);
}

function connectToOutput(node) {
  node.connect(outputGain);
  return node;
}

function createNoiseBuffer(duration = 0.06) {
  const length = Math.max(1, Math.floor(audioContext.sampleRate * duration));
  const buffer = audioContext.createBuffer(1, length, audioContext.sampleRate);
  const data = buffer.getChannelData(0);
  for (let index = 0; index < length; index += 1) {
    data[index] = Math.random() * 2 - 1;
  }
  return buffer;
}

function finishNode(node, source, stopAt, startAt = audioContext.currentTime) {
  source.onended = () => {
    try { source.disconnect(); } catch { /* Audio cleanup is best effort. */ }
    try { node.disconnect(); } catch { /* Audio cleanup is best effort. */ }
  };
  source.start(startAt);
  source.stop(stopAt);
}

function getVelocityPresence(velocity) {
  const normalizedVelocity = Math.max(0, Math.min(1, (Number(velocity) || 0) / 1800));
  return 0.86 + normalizedVelocity * 0.18;
}

function getEmphasisMultiplier(emphasis) {
  return emphasis ? 1.42 : 1;
}

function playNoiseTick({
  duration,
  peak,
  frequencyStart,
  frequencyEnd,
  q,
  startAt = audioContext.currentTime,
}) {
  const stopAt = startAt + duration;
  const source = audioContext.createBufferSource();
  const filter = audioContext.createBiquadFilter();
  const gain = audioContext.createGain();
  source.buffer = createNoiseBuffer(duration);
  filter.type = 'bandpass';
  filter.frequency.setValueAtTime(frequencyStart, startAt);
  filter.frequency.exponentialRampToValueAtTime(frequencyEnd, stopAt);
  filter.Q.value = q;
  scheduleEnvelope(gain, startAt, peak, 0.0015, Math.max(0.004, duration - 0.003));
  connectToOutput(source.connect(filter).connect(gain));
  finishNode(gain, source, stopAt, startAt);
}

function playToneTick({
  type = 'sine',
  duration,
  peak,
  frequencyStart,
  frequencyEnd,
  lowpassHz,
  startAt = audioContext.currentTime,
}) {
  const stopAt = startAt + duration;
  const oscillator = audioContext.createOscillator();
  const filter = audioContext.createBiquadFilter();
  const gain = audioContext.createGain();
  oscillator.type = type;
  oscillator.frequency.setValueAtTime(frequencyStart, startAt);
  oscillator.frequency.exponentialRampToValueAtTime(frequencyEnd, stopAt);
  filter.type = 'lowpass';
  filter.frequency.value = lowpassHz;
  filter.Q.value = 0.35;
  scheduleEnvelope(gain, startAt, peak, 0.001, Math.max(0.004, duration - 0.002));
  connectToOutput(oscillator.connect(filter).connect(gain));
  finishNode(gain, oscillator, stopAt, startAt);
}

function playFeltRatchet({ velocity = 520, emphasis = false } = {}) {
  const start = audioContext.currentTime;
  const presence = getVelocityPresence(velocity) * getEmphasisMultiplier(emphasis);
  const variance = 0.94 + Math.random() * 0.12;
  playNoiseTick({
    duration: 0.026,
    peak: 0.030 * presence,
    frequencyStart: 1380 * variance,
    frequencyEnd: 820 * variance,
    q: 0.78,
    startAt: start,
  });
  playToneTick({
    duration: 0.033,
    peak: 0.018 * presence,
    frequencyStart: 188 * variance,
    frequencyEnd: 142 * variance,
    lowpassHz: 560,
    startAt: start,
  });
}

function playCrystalNotch({ velocity = 520, emphasis = false } = {}) {
  const start = audioContext.currentTime;
  const presence = getVelocityPresence(velocity) * getEmphasisMultiplier(emphasis);
  const variance = 0.92 + Math.random() * 0.16;
  playNoiseTick({
    duration: 0.018,
    peak: 0.019 * presence,
    frequencyStart: 3600 * variance,
    frequencyEnd: 2100 * variance,
    q: 1.35,
    startAt: start,
  });
  playToneTick({
    type: 'triangle',
    duration: 0.025,
    peak: 0.0105 * presence,
    frequencyStart: 1360 * variance,
    frequencyEnd: 920 * variance,
    lowpassHz: 2800,
    startAt: start,
  });
}

function playAirTeeth({ velocity = 520, emphasis = false } = {}) {
  const start = audioContext.currentTime;
  const presence = getVelocityPresence(velocity) * getEmphasisMultiplier(emphasis);
  const variance = 0.92 + Math.random() * 0.16;
  playNoiseTick({
    duration: 0.036,
    peak: 0.027 * presence,
    frequencyStart: 2200 * variance,
    frequencyEnd: 1050 * variance,
    q: 0.48,
    startAt: start,
  });
}

const SCROLL_PLAYERS = {
  'felt-ratchet': playFeltRatchet,
  'crystal-notch': playCrystalNotch,
  'air-teeth': playAirTeeth,
};

export async function unlockSoundPlaygroundAudio() {
  if (isReady && audioContext) {
    if (audioContext.state === 'suspended') await audioContext.resume();
    return true;
  }

  const AudioContextConstructor = getAudioContextConstructor();
  if (!AudioContextConstructor) return false;

  try {
    audioContext = new AudioContextConstructor({ latencyHint: 'interactive', sampleRate: 44100 });
    if (audioContext.state === 'suspended') await audioContext.resume();
    outputGain = audioContext.createGain();
    outputGain.gain.value = 0.55;
    outputGain.connect(audioContext.destination);
    isReady = true;
    return true;
  } catch {
    audioContext = null;
    outputGain = null;
    return false;
  }
}

export function playSoundPlaygroundScrollCandidate(candidateId, options = {}) {
  const player = SCROLL_PLAYERS[candidateId];
  if (!isReady || !audioContext || !outputGain || !player) return false;
  const now = performance.now();
  const minimumIntervalMs = SCROLL_CANDIDATE_INTERVAL_MS[candidateId] || 52;
  if (!options.emphasis && now - (lastScrollCandidateAt.get(candidateId) || -Infinity) < minimumIntervalMs) {
    return false;
  }
  lastScrollCandidateAt.set(candidateId, now);
  player(options);
  return true;
}

export function playSoundPlaygroundScrollPreview(candidateId, { mode = 'continuous' } = {}) {
  if (!SCROLL_PLAYERS[candidateId] || !isReady || !audioContext || !outputGain) return false;
  previewTimers.forEach((timer) => window.clearTimeout(timer));
  previewTimers = [];

  if (mode === 'step') {
    playSoundPlaygroundScrollCandidate(candidateId, { velocity: 420, emphasis: true });
    return true;
  }

  const sequence = [0, 150, 270, 370, 455, 530, 605, 685, 780, 900, 1040, 1210];
  sequence.forEach((delay, index) => {
    previewTimers.push(window.setTimeout(() => {
      const phase = index / Math.max(1, sequence.length - 1);
      const velocity = 260 + Math.sin(phase * Math.PI) * 1240;
      playSoundPlaygroundScrollCandidate(candidateId, { velocity });
    }, delay));
  });
  return true;
}

export function getSoundPlaygroundScrollCandidateIds() {
  return [...SCROLL_CANDIDATE_IDS];
}
