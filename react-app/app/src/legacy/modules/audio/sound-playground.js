let audioContext = null;
let outputGain = null;
let isReady = false;

const CANDIDATE_IDS = Object.freeze([
  'air-whisper',
  'soft-bloom',
  'velvet-tap',
  'magnetic-halo',
  'elastic-ping',
]);

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

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

function finishNode(node, source, stopAt) {
  source.onended = () => {
    try { source.disconnect(); } catch {}
    try { node.disconnect(); } catch {}
  };
  source.start();
  source.stop(stopAt);
}

function playAirWhisper() {
  const start = audioContext.currentTime;
  const source = audioContext.createBufferSource();
  const filter = audioContext.createBiquadFilter();
  const gain = audioContext.createGain();
  source.buffer = createNoiseBuffer(0.055);
  filter.type = 'bandpass';
  filter.frequency.setValueAtTime(1200, start);
  filter.frequency.exponentialRampToValueAtTime(760, start + 0.045);
  filter.Q.value = 0.65;
  scheduleEnvelope(gain, start, 0.048, 0.004, 0.045);
  connectToOutput(source.connect(filter).connect(gain));
  finishNode(gain, source, start + 0.06);
}

function playSoftBloom() {
  const start = audioContext.currentTime;
  const stopAt = start + 0.17;
  const oscillator = audioContext.createOscillator();
  const filter = audioContext.createBiquadFilter();
  const gain = audioContext.createGain();
  oscillator.type = 'triangle';
  oscillator.frequency.setValueAtTime(720, start);
  oscillator.frequency.exponentialRampToValueAtTime(520, stopAt);
  filter.type = 'lowpass';
  filter.frequency.value = 1700;
  filter.Q.value = 0.35;
  scheduleEnvelope(gain, start, 0.035, 0.014, 0.15);
  connectToOutput(oscillator.connect(filter).connect(gain));
  finishNode(gain, oscillator, stopAt);
}

function playVelvetTap() {
  const start = audioContext.currentTime;
  const stopAt = start + 0.105;
  const oscillator = audioContext.createOscillator();
  const filter = audioContext.createBiquadFilter();
  const gain = audioContext.createGain();
  oscillator.type = 'sine';
  oscillator.frequency.setValueAtTime(210, start);
  oscillator.frequency.exponentialRampToValueAtTime(150, stopAt);
  filter.type = 'lowpass';
  filter.frequency.value = 620;
  filter.Q.value = 0.45;
  scheduleEnvelope(gain, start, 0.060, 0.002, 0.095);
  connectToOutput(oscillator.connect(filter).connect(gain));
  finishNode(gain, oscillator, stopAt);
}

function playMagneticHalo() {
  const start = audioContext.currentTime;
  const stopAt = start + 0.19;
  const gain = audioContext.createGain();
  const filter = audioContext.createBiquadFilter();
  const oscillators = [
    { frequency: 910, detune: -7, gain: 0.021 },
    { frequency: 910, detune: 7, gain: 0.018 },
  ].map(({ frequency, detune, gain: partialGain }) => {
    const oscillator = audioContext.createOscillator();
    const partial = audioContext.createGain();
    oscillator.type = 'sine';
    oscillator.frequency.value = frequency;
    oscillator.detune.value = detune;
    partial.gain.value = partialGain;
    oscillator.connect(partial).connect(gain);
    oscillator.start(start);
    oscillator.stop(stopAt);
    return oscillator;
  });
  filter.type = 'lowpass';
  filter.frequency.value = 2400;
  filter.Q.value = 0.25;
  scheduleEnvelope(gain, start, 0.8, 0.018, 0.17);
  connectToOutput(gain.connect(filter));
  oscillators[0].onended = () => {
    try { gain.disconnect(); } catch {}
    try { filter.disconnect(); } catch {}
  };
}

function playElasticPing() {
  const start = audioContext.currentTime;
  const stopAt = start + 0.23;
  const oscillator = audioContext.createOscillator();
  const filter = audioContext.createBiquadFilter();
  const gain = audioContext.createGain();
  oscillator.type = 'sine';
  oscillator.frequency.setValueAtTime(560, start);
  oscillator.frequency.exponentialRampToValueAtTime(310, stopAt);
  filter.type = 'lowpass';
  filter.frequency.value = 1250;
  filter.Q.value = 0.5;
  scheduleEnvelope(gain, start, 0.042, 0.006, 0.215);
  connectToOutput(oscillator.connect(filter).connect(gain));
  finishNode(gain, oscillator, stopAt);
}

const PLAYERS = {
  'air-whisper': playAirWhisper,
  'soft-bloom': playSoftBloom,
  'velvet-tap': playVelvetTap,
  'magnetic-halo': playMagneticHalo,
  'elastic-ping': playElasticPing,
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

export function playSoundPlaygroundHover(candidateId) {
  if (!isReady || !audioContext || !outputGain || !PLAYERS[candidateId]) return false;
  PLAYERS[candidateId]();
  return true;
}

export function getSoundPlaygroundCandidateIds() {
  return [...CANDIDATE_IDS];
}
