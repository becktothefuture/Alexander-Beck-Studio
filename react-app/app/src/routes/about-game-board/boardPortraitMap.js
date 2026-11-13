import { resolveBoardBallRoleColours } from './boardScene.js';

const CHROMATIC_PIGMENTS = [4, 1, 3, 5]; // shadow through highlight

function luminance(hex) {
  const channels = hex.slice(1).match(/../g).map(part => {
    const channel = parseInt(part, 16) / 255;
    return channel <= .04045 ? channel / 12.92 : ((channel + .055) / 1.055) ** 2.4;
  });
  return channels[0] * .2126 + channels[1] * .7152 + channels[2] * .0722;
}

/** Palette changes alter pigment appearance, never identity or geometry. */
export function portraitPaletteRoles(palette) {
  const colours = resolveBoardBallRoleColours(palette);
  const ordered = [...CHROMATIC_PIGMENTS].sort((a, b) =>
    luminance(colours[a]) - luminance(colours[b]) || a - b);
  const roles = [0, 1, 2, 3, 4, 5];
  CHROMATIC_PIGMENTS.forEach((pigment, index) => { roles[pigment] = ordered[index]; });
  return roles;
}

export function decodePortraitMask(source) {
  if (source.version !== 1 || !source.width || source.rows.length !== source.height) {
    throw new Error('Invalid portrait mask.');
  }
  const pixels = new Uint8Array(source.width * source.height);
  source.rows.forEach((runs, y) => {
    let x = 0;
    for (let index = 0; index < runs.length; index += 2) {
      const value = runs[index], length = runs[index + 1];
      if (value < 0 || value > 6 || !Number.isInteger(length) || length < 1
        || x + length > source.width) throw new Error('Invalid portrait row.');
      pixels.fill(value, y * source.width + x, y * source.width + x + length);
      x += length;
    }
    if (x !== source.width) throw new Error('Incomplete portrait row.');
  });
  return { width: source.width, height: source.height, coverage: source.coverage, pixels };
}

/** One setup-time lattice for the real responsive inventory, including its IDs. */
export function createPortraitMap(mask, balls) {
  if (!balls.length || new Set(balls.map(ball => ball.id)).size !== balls.length) {
    throw new Error('Portrait requires a nonempty unique inventory.');
  }
  const at = (x, y) => x < 0 || y < 0 || x >= mask.width || y >= mask.height ? 0
    : mask.pixels[Math.floor(y) * mask.width + Math.floor(x)];
  function coverage(x, y, pitch) {
    let count = 0;
    for (const dy of [-.4, -.2, 0, .2, .4]) {
      for (const dx of [-.4, -.2, 0, .2, .4]) count += Number(at(x + dx * pitch, y + dy * pitch) > 0);
    }
    return count / 25;
  }
  function lattice(columns) {
    const pitch = mask.width / columns;
    const rowPitch = pitch * Math.sqrt(3) / 2;
    const rows = Math.floor(mask.height / rowPitch);
    const offset = (mask.height - rows * rowPitch) / 2;
    const cells = [];
    for (let row = 0; row < rows; row += 1) {
      for (let column = 0; column < columns; column += 1) {
        const x = (column + .5 + (row % 2) * .5) * pitch;
        const y = offset + (row + .5) * rowPitch;
        const area = coverage(x, y, pitch);
        if (at(x, y) && area >= .5) cells.push({ row, column, x, y, area });
      }
    }
    return { columns, rows, pitch, cells };
  }
  // Coverage supplies a close estimate; only neighbouring lattice sizes run.
  let columns = Math.max(2, Math.floor(Math.sqrt(balls.length * Math.sqrt(3) / 2 / mask.coverage)) - 2);
  let grid = lattice(columns);
  while (grid.cells.length < balls.length) {
    if (++columns > 256) throw new Error('Portrait inventory exceeds supported lattice.');
    grid = lattice(columns);
  }
  const excess = grid.cells.length - balls.length;
  const edgeOrder = [...grid.cells].sort((a, b) =>
    (a.area + coverage(a.x, a.y, grid.pitch * 2.8))
    - (b.area + coverage(b.x, b.y, grid.pitch * 2.8)) || a.row - b.row || a.column - b.column);
  const excluded = new Set(edgeOrder.slice(0, excess));
  const cells = grid.cells.filter(cell => !excluded.has(cell));
  const counts = [0, 0, 0, 0, 0, 0];
  const targets = cells.map((cell, index) => {
    const votes = [0, 0, 0, 0, 0, 0];
    for (const dy of [-.3, -.15, 0, .15, .3]) {
      for (const dx of [-.3, -.15, 0, .15, .3]) {
        const value = at(cell.x + dx * grid.pitch, cell.y + dy * grid.pitch);
        if (value) votes[value - 1] += 1;
      }
    }
    const pigment = votes.indexOf(Math.max(...votes));
    counts[pigment] += 1;
    return { index, row: cell.row, column: cell.column, pigment,
      x: cell.x / mask.width, y: cell.y / mask.height };
  });
  // A deterministic shuffle mixes pigments in the opening without changing totals.
  const ids = balls.map(ball => ball.id);
  let seed = balls.length + 20261005;
  for (let index = ids.length - 1; index > 0; index -= 1) {
    seed ^= seed << 13; seed ^= seed >>> 17; seed ^= seed << 5;
    const other = (seed >>> 0) % (index + 1);
    [ids[index], ids[other]] = [ids[other], ids[index]];
  }
  const pigments = new Map(targets.map((target, index) => [ids[index], target.pigment]));
  const rows = [...new Set(targets.map(target => target.row))].sort((a, b) => b - a)
    .map(row => targets.filter(target => target.row === row));
  return { version: 2, count: balls.length, columns: grid.columns, pitch: grid.pitch / mask.width,
    aspect: mask.width / mask.height,
    targets, rows, pigments, counts };
}

export function portraitRoleAssignments(map, roles) {
  return new Map([...map.pigments].map(([id, pigment]) => [id, roles[pigment]]));
}
