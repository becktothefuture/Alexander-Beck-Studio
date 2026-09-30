/** Reusable broad phase for equally sized balls. Buckets are retained and
 * emptied between steps, so a filled reservoir does not allocate per contact. */
export function createBoardSpatialIndex(cellSize) {
  const size = Math.max(1, cellSize);
  const buckets = new Map();
  const used = [];
  const key = (x, y) => (y + 32768) * 65536 + x + 32768;
  return {
    reset() {
      for (const bucket of used) bucket.length = 0;
      used.length = 0;
    },
    add(body) {
      const id = key(Math.floor(body.position.x / size), Math.floor(body.position.y / size));
      let bucket = buckets.get(id);
      if (!bucket) { bucket = []; buckets.set(id, bucket); }
      if (!bucket.length) used.push(bucket);
      bucket.push(body);
    },
    query(minX, minY, maxX, maxY, result) {
      result.length = 0;
      for (let y = Math.floor(minY / size); y <= Math.floor(maxY / size); y += 1) {
        for (let x = Math.floor(minX / size); x <= Math.floor(maxX / size); x += 1) {
          const bucket = buckets.get(key(x, y));
          if (bucket) for (const body of bucket) result.push(body);
        }
      }
      return result;
    },
  };
}
