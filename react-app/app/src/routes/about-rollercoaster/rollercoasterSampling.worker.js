import { sampleRollercoasterField } from './rollercoasterField.js';

self.onmessage = ({ data: { id, geometry, settings } }) => {
  try {
    const started = performance.now();
    const result = sampleRollercoasterField(geometry, settings);
    result.samplingMs = performance.now() - started;
    self.postMessage({ id, result }, [result.points.buffer]);
  } catch (error) {
    self.postMessage({ id, error: error.message });
  }
};
