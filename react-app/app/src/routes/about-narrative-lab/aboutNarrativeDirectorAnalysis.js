import {
  createAboutNarrativeComposerFrameSample,
  sampleAboutNarrativeComposerPlanInto,
} from './aboutNarrativeComposer.js';

const EPSILON = 0.000001;
const distance3 = (left, right) => Math.hypot(
  Number(right[0]) - Number(left[0]),
  Number(right[1]) - Number(left[1]),
  Number(right[2]) - Number(left[2]),
);

function quaternionAngle(left, right) {
  const dot = Math.min(1, Math.abs(
    (left[0] * right[0]) + (left[1] * right[1]) + (left[2] * right[2]) + (left[3] * right[3]),
  ));
  return 2 * Math.acos(dot) * (180 / Math.PI);
}

function cameraSegments(plan) {
  const move = plan.camera.moveKeys.slice(0, -1).map((from, index) => {
    const to = plan.camera.moveKeys[index + 1];
    const durationWU = Math.max(EPSILON, Number(to.atWU) - Number(from.atWU));
    return {
      id: `${from.id}:${to.id}`,
      startWU: Number(from.atWU),
      endWU: Number(to.atWU),
      value: distance3(from.position, to.position) / durationWU,
      constant: from.velocityMode === 'constant',
    };
  });
  const look = plan.camera.lookKeys.slice(0, -1).map((from, index) => {
    const to = plan.camera.lookKeys[index + 1];
    const durationWU = Math.max(EPSILON, Number(to.atWU) - Number(from.atWU));
    return {
      id: `${from.id}:${to.id}`,
      startWU: Number(from.atWU),
      endWU: Number(to.atWU),
      value: quaternionAngle(from.quaternion, to.quaternion) / durationWU,
    };
  });
  const orbit = plan.camera.orbit;
  if (orbit?.startPosition && orbit?.target) {
    const durationWU = Math.max(EPSILON, Number(orbit.endWU) - Number(orbit.startWU));
    const radius = Math.hypot(
      Number(orbit.startPosition[0]) - Number(orbit.target[0]),
      Number(orbit.startPosition[2]) - Number(orbit.target[2]),
    );
    move.push({
      id: orbit.id,
      startWU: Number(orbit.startWU),
      endWU: Number(orbit.endWU),
      value: radius * Math.abs(Number(orbit.arcRadians)) / durationWU,
      constant: true,
      orbit: true,
    });
    look.push({
      id: `${orbit.id}:look`,
      startWU: Number(orbit.startWU),
      endWU: Number(orbit.endWU),
      value: Math.abs(Number(orbit.arcRadians)) * (180 / Math.PI) / durationWU,
      orbit: true,
    });
  }
  return { move, look };
}

function activityAt(plan, frame, storyWU, previousCamera) {
  const text = plan.model.tracks.text.fields.some((field) => (
    field.publishable !== false
    && field.kind !== 'stub'
    && storyWU >= Number(field.startWU)
    && storyWU <= Number(field.endWU)
  ));
  const simulation = Number(frame.simulation.visibility) > 0.01;
  const camera = previousCamera && (
    distance3(previousCamera.position, frame.camera.position) > 0.00001
    || quaternionAngle(previousCamera.quaternion, frame.camera.quaternion) > 0.001
  );
  if (text) return 'text';
  if (simulation) return 'simulation';
  if (camera) return 'reframe';
  return 'empty';
}

function pushSegment(segments, type, startWU, endWU) {
  const previous = segments.at(-1);
  if (previous?.type === type && Math.abs(previous.endWU - startWU) <= EPSILON) {
    previous.endWU = endWU;
    return;
  }
  segments.push({ type, startWU, endWU });
}

function coverage(plan, stepWU) {
  const frame = createAboutNarrativeComposerFrameSample();
  const previousCamera = { position: [0, 0, 0], quaternion: [0, 0, 0, 1] };
  const segments = [];
  let previousType = null;
  let segmentStartWU = 0;
  for (let storyWU = 0; storyWU <= plan.durationWU + EPSILON; storyWU += stepWU) {
    const atWU = Math.min(plan.durationWU, storyWU);
    sampleAboutNarrativeComposerPlanInto(plan, atWU, frame);
    const type = activityAt(plan, frame, atWU, previousType == null ? null : previousCamera);
    if (previousType != null && type !== previousType) {
      pushSegment(segments, previousType, segmentStartWU, atWU);
      segmentStartWU = atWU;
    }
    previousType = type;
    previousCamera.position.splice(0, 3, ...frame.camera.position);
    previousCamera.quaternion.splice(0, 4, ...frame.camera.quaternion);
    if (atWU >= plan.durationWU) break;
  }
  pushSegment(segments, previousType || 'empty', segmentStartWU, plan.durationWU);
  return segments;
}

export function analyseAboutNarrativeComposerPlan(plan, { stepWU = 0.025 } = {}) {
  if (!plan?.valid) return { camera: { move: [], look: [] }, coverage: [], gaps: [] };
  const coverageSegments = coverage(plan, stepWU);
  return {
    camera: cameraSegments(plan),
    coverage: coverageSegments,
    gaps: coverageSegments.filter((segment) => segment.type === 'empty' && segment.endWU - segment.startWU > 0.15 + EPSILON),
  };
}
