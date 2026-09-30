export default typeof Worker === 'function'
  ? () => new Worker(new URL('./rollercoasterSampling.worker.js', import.meta.url), { type: 'module' })
  : null;
