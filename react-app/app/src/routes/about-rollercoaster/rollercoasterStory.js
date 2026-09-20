// Copy is canonical editorial data; the scene supplies every physical beat
// boundary. These names only connect that data to the authored scene.
export const ROLLERCOASTER_COPY_FIELDS = Object.freeze({
  departure: ['text-promise-main'],
  background: ['text-background-unit'],
  curiosity: ['text-complexity-curiosity'],
  'tunnel-a': [],
  release: ['text-complexity-listen'],
  disciplines: ['text-discipline-labels', 'text-selected-clients'],
  statements: ['text-disciplines-title', 'text-life-momentum'],
  method: ['text-life-character'],
  'tunnel-b': [],
  approach: [],
  ending: ['text-epilogue-invitation'],
});

export const ROLLERCOASTER_READING_BEATS = Object.freeze(['background', 'disciplines', 'method']);

export function clampRollercoasterProgress(value) {
  return Math.min(1, Math.max(0, Number(value) || 0));
}

export function selectRollercoasterCopy(document) {
  const source = new Map((document?.tracks?.text?.fields || []).map(field => [field.id, field]));
  return Object.fromEntries(ROLLERCOASTER_BEAT_IDS.map(id => [id,
    ROLLERCOASTER_COPY_FIELDS[id].map((fieldId) => {
      const field = source.get(fieldId);
      if (!field || field.publishable !== true) {
        throw new Error(`The About story requires the published copy field ${fieldId}.`);
      }
      return field;
    }),
  ]));
}

/** Allocate native distance, not camera keyframes. A paragraph starts below
 * the viewport and its last line has left before the next authored beat.
 * Larger copy extends only its own reading chamber. Title pacing adds native
 * distance around the same source boundaries; it never takes tunnel distance. */
export function createRollercoasterStoryLayout(beats, {
  viewportHeight,
  readingHeights = {},
  clearancePx = 24,
  titleDurationScale = 1,
} = {}) {
  if (!Number.isFinite(viewportHeight) || viewportHeight <= 0
    || !Number.isFinite(clearancePx) || clearancePx < 0) {
    throw new TypeError('About layout requires a positive viewport and a finite reading clearance.');
  }
  if (!Number.isFinite(titleDurationScale) || titleDurationScale < 1 || titleDurationScale > 4) {
    throw new TypeError('About title duration scale must be between 1 and 4.');
  }
  validateRollercoasterStoryBeats(beats);
  let cursor = 0;
  const segments = beats.map((beat) => {
    const { id, start, end, scrollScreens } = beat;
    const reading = ROLLERCOASTER_READING_BEATS.includes(id);
    const copyHeight = Number(readingHeights[id] ?? 0);
    if (!Number.isFinite(copyHeight) || copyHeight < 0) {
      throw new TypeError(`Invalid measured copy height for ${id}.`);
    }
    const title = beat.kind === 'title' || beat.kind === 'ending';
    const baseDistance = scrollScreens * viewportHeight * (title ? titleDurationScale : 1);
    const readingDistance = reading ? copyHeight + viewportHeight + (2 * clearancePx) : 0;
    const distance = Math.max(baseDistance, readingDistance);
    const segment = {
      id, kind: beat.kind, start, end, startPx: cursor, endPx: cursor + distance,
      distancePx: distance, baseScreens: scrollScreens, screens: distance / viewportHeight,
      copyHeightPx: reading ? copyHeight : 0,
      copyOffsetPx: reading
        ? viewportHeight + clearancePx + ((distance - readingDistance) / 2) : 0,
    };
    cursor += distance;
    return segment;
  });
  // Join unequal reading/travel budgets with one speed at each boundary.
  // Harmonic means stay below twice either secant, so each cubic is monotone.
  // The opening and the held final camera arrive with zero speed.
  const slopes = segments.map(segment => (segment.end - segment.start) / segment.distancePx);
  const speedAt = index => {
    if (index === 0 || index === segments.length || segments[index].kind === 'ending') return 0;
    const before = slopes[index - 1];
    const after = slopes[index];
    return (2 * before * after) / (before + after);
  };
  segments.forEach((segment, index) => {
    segment.cameraStartTangent = speedAt(index) * segment.distancePx;
    segment.cameraEndTangent = speedAt(index + 1) * segment.distancePx;
  });
  return {
    viewportHeight, clearancePx, segments,
    totalScrollPx: cursor, contentHeightPx: cursor + viewportHeight,
    totalScreens: cursor / viewportHeight,
  };
}

/** Caller-owned target keeps the native scroll / render path allocation-free. */
export function sampleRollercoasterScroll(layout, scrollTop, target) {
  const position = Math.min(layout.totalScrollPx, Math.max(0, Number(scrollTop) || 0));
  let index = 0;
  while (index < layout.segments.length - 1 && position >= layout.segments[index].endPx) index += 1;
  const segment = layout.segments[index];
  const localProgress = clampRollercoasterProgress((position - segment.startPx) / segment.distancePx);
  target.progress = segment.start + ((segment.end - segment.start) * localProgress);
  target.beatId = segment.id;
  target.beatIndex = index;
  target.localProgress = localProgress;
  target.scrollTop = position;
  return target;
}

/** Camera-only Hermite timing. Text, history and layout retain native progress;
 * every authored boundary stays exact and reversing scroll retraces the curve. */
export function sampleRollercoasterCameraTarget(layout, frame) {
  const segment = layout.segments[frame.beatIndex];
  const t = frame.localProgress;
  const t2 = t * t;
  const t3 = t2 * t;
  return ((2 * t3 - 3 * t2 + 1) * segment.start)
    + ((t3 - 2 * t2 + t) * segment.cameraStartTangent)
    + ((-2 * t3 + 3 * t2) * segment.end)
    + ((t3 - t2) * segment.cameraEndTangent);
}

export function rollercoasterProgressToScroll(layout, progress) {
  const value = clampRollercoasterProgress(progress);
  const segment = layout.segments.find(beat => value < beat.end) || layout.segments.at(-1);
  return segment.startPx + ((value - segment.start) / (segment.end - segment.start)) * segment.distancePx;
}

export function restoreRollercoasterScrollPosition(scrollport, previous, next, progress, force = false) {
  const changed = !previous || next.viewportHeight !== previous.viewportHeight
    || next.segments.some((segment, index) => (
      segment.distancePx !== previous.segments[index]?.distancePx
    ));
  if (!changed && !force) return false;
  const current = sampleRollercoasterScroll(next, scrollport.scrollTop, {});
  if (scrollport.scrollTop >= 0 && scrollport.scrollTop <= next.totalScrollPx
    && current.progress === clampRollercoasterProgress(progress)) return false;
  scrollport.scrollTop = rollercoasterProgressToScroll(next, progress);
  return true;
}

const smoothstep = value => {
  const t = clampRollercoasterProgress(value);
  return t * t * (3 - (2 * t));
};

export function rollercoasterTitleOpacity(localProgress, {
  index = 0, count = 1, ending = false,
} = {}, motion = {}) {
  const local = (localProgress * count) - index;
  if (local < 0 || local > 1 || (local === 1 && !ending)) return 0;
  // The shared Home glyph reveal owns arrival; scroll owns only departure.
  const departure = ending ? 1 : smoothstep((1 - local) / Math.max(0.01, Number(motion.exitFraction ?? 0.1)));
  return departure;
}

// The actual heading remains semantic copy at every story position. Only
// visual hit targets and the ending's interactive controls follow opacity.
export function applyRollercoasterTitlePresentation(record, opacity) {
  const active = opacity > 0;
  record.node.style.opacity = String(opacity);
  record.node.dataset.titleActive = String(active);
  if (record.options.ending) {
    if (record.support) record.support.tabIndex = active ? 0 : -1;
    if (record.actions) record.actions.inert = !active;
  }
}
import { ROLLERCOASTER_BEAT_IDS, validateRollercoasterStoryBeats } from './rollercoasterContract.js';

export { ROLLERCOASTER_BEAT_IDS };
