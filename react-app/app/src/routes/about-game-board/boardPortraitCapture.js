import { normalizeAboutPortrait } from '../../lib/aboutPortrait.js';

/** Cubic arrival retains an incoming tangent and reaches its target at rest. */
export function samplePortraitArrival(record, progress, out) {
  const t = Math.max(0, Math.min(1, progress));
  const t2 = t * t, t3 = t2 * t;
  const start = 2 * t3 - 3 * t2 + 1;
  const tangent = t3 - 2 * t2 + t;
  const end = -2 * t3 + 3 * t2;
  out.x = start * record.startX + tangent * record.tangentX + end * record.target.x;
  out.y = start * record.startY + tangent * record.tangentY + end * record.target.y;
  return out;
}

/** The field owns captured identities. No collider, rotation or per-ball DOM. */
export function createPortraitCapture(map, initialSettings, initialReducedMotion = false) {
  let settings = normalizeAboutPortrait(initialSettings);
  let reducedMotion = initialReducedMotion;
  const records = [...map.pigments].map(([id, pigment], index) => ({
    id, pigment, index, state: 'machine', sourceX: 0, sourceY: 0,
    velocityX: 0, velocityY: 0, sourceRadius: 0, source: null, sourceColour: null, outletY: null, target: null,
    startX: 0, startY: -.06, tangentX: 0, tangentY: 0,
    x: 0, y: -.06, elapsed: 0, duration: 0,
  }));
  const recordById = new Map(records.map(record => [record.id, record]));
  const incoming = new Uint32Array(map.count);
  const targets = Array.from({ length: 6 }, (_, pigment) =>
    map.rows.flatMap(row => row.filter(target => target.pigment === pigment)));
  const targetHeads = new Uint32Array(6);
  const startedRowFlags = new Uint8Array(map.rows[0][0].row + 1);
  const active = new Uint32Array(map.count);
  const settled = [];
  let activeCount = 0, captured = 0, incomingHead = 0, startedRows = 0, clock = 0;
  let revision = 0, maximumActive = 0;
  let entry = { size: 960, portraitHeight: 960, left: 0, top: 0, machineLeft: 0,
    boardScale: 1, outletTop: -60, floorY: Infinity };
  const position = { x: 0, y: 0 };
  const maximumArrivals = 384;

  function accept(id, x, y, velocityX = 0, velocityY = 0, colour = null, outletY = null, radius = 0) {
    const record = recordById.get(id);
    if (!record || record.state !== 'machine') return false;
    record.state = 'waiting';
    record.sourceX = x; record.sourceY = y;
    record.velocityX = velocityX; record.velocityY = velocityY;
    record.sourceRadius = radius;
    record.source = 'outlet'; record.sourceColour = colour; record.outletY = outletY;
    incoming[captured] = record.index;
    captured += 1;
    revision += 1;
    return true;
  }

  function advance(deltaMs) {
    clock += Math.max(0, Math.min(50, deltaMs)) * settings.aboutPortraitSpeed;
    if (activeCount) revision += 1;
    for (let index = activeCount - 1; index >= 0; index -= 1) {
      const record = records[active[index]];
      record.elapsed += Math.max(0, Math.min(50, deltaMs)) * settings.aboutPortraitSpeed;
      samplePortraitArrival(record, record.elapsed / record.duration, position);
      record.x = position.x; record.y = Math.min(position.y, entry.floorY ?? Infinity);
      if (record.elapsed < record.duration && !reducedMotion) continue;
      record.state = 'settled';
      record.x = record.target.x; record.y = record.target.y;
      settled.push(record.index);
      active[index] = active[--activeCount];
    }
    // Real arrivals keep their order. Each colour fills its lowest remaining
    // position, without holding other balls for a missing colour or full row.
    while (incomingHead < captured && (reducedMotion || activeCount < maximumArrivals)) {
      const record = records[incoming[incomingHead++]];
      const target = targets[record.pigment][targetHeads[record.pigment]++];
      record.target = target;
      if (!startedRowFlags[target.row]) { startedRowFlags[target.row] = 1; startedRows += 1; }
      record.state = reducedMotion ? 'settled' : 'arriving';
      // Project the actual outlet pose into the mural's coordinate system.
      // No invented entry lane, lateral spread or radius transition.
      record.startX = (entry.machineLeft + record.sourceX * entry.boardScale - entry.left) / entry.size;
      record.startY = (entry.outletTop + (record.sourceY - record.outletY) * entry.boardScale
        - entry.top) / entry.portraitHeight;
      const distance = Math.hypot((target.x - record.startX) * entry.size,
        (target.y - record.startY) * entry.portraitHeight);
      const speed = Math.hypot(record.velocityX, record.velocityY) * entry.boardScale / (1000 / 60);
      record.duration = Math.max(1100, Math.min(2600, distance / Math.max(.7, speed)));
      record.tangentX = record.velocityX * entry.boardScale * record.duration / (1000 / 60) / entry.size;
      record.tangentY = Math.max(0, record.velocityY) * entry.boardScale * record.duration / (1000 / 60)
        / entry.portraitHeight;
      record.elapsed = 0;
      record.x = record.startX; record.y = record.startY;
      if (reducedMotion) {
        record.x = target.x; record.y = target.y;
        settled.push(record.index);
      } else active[activeCount++] = record.index;
      revision += 1;
      maximumActive = Math.max(maximumActive, activeCount);
    }
  }

  return {
    map, records, active, settled,
    accept,
    owns: id => recordById.has(id) && recordById.get(id).state !== 'machine',
    acceptBody: (body, outletY) => body.position.y >= outletY && accept(body.plugin.boardId,
      body.position.x, body.position.y, body.velocity.x, body.velocity.y, body.plugin.boardColour, outletY,
      body.circleRadius * (body.plugin.boardRenderScale ?? 1)),
    advance,
    setSettings: next => { settings = normalizeAboutPortrait(next); revision += 1; },
    setReducedMotion: next => { reducedMotion = next; revision += 1; },
    setEntryGeometry: next => { entry = next; },
    getSettings: () => settings,
    get revision() { return revision; },
    get capturedCount() { return captured; },
    get activeCount() { return activeCount; },
    hasActivity: () => activeCount > 0 || incomingHead < captured,
    inspect: () => ({ count: map.count, captured, waiting: captured - activeCount - settled.length,
      active: activeCount, settled: settled.length, rows: map.rows.length, startedRows,
      complete: settled.length === map.count, maximumActive,
      outletCaptures: captured,
      clockMs: clock, revision, settings: { ...settings } }),
    snapshot: () => records.map(record => ({ id: record.id, pigment: record.pigment,
      state: record.state, source: record.source, sourceColour: record.sourceColour, outletY: record.outletY,
      sourceX: record.sourceX, sourceY: record.sourceY,
      velocityX: record.velocityX, velocityY: record.velocityY,
      sourceRadius: record.sourceRadius,
      targetIndex: record.target?.index ?? null, x: record.x, y: record.y })),
  };
}
