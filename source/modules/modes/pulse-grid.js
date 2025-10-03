// ╔══════════════════════════════════════════════════════════════════════════════╗
// ║                               PULSE GRID MODE                                ║
// ║      Grid helpers, initializer and rhythmic update (extracted subset)       ║
// ╚══════════════════════════════════════════════════════════════════════════════╝

import { getGlobals, clearBalls } from '../core/state.js';
import { spawnBall } from '../physics/spawn.js';

function calculateGridDimensions() {
  const g = getGlobals();
  const w = g.canvas.width;
  const h = g.canvas.height;
  const cols = Math.max(1, Math.floor(g.gridColumns));
  const cellW = w / cols;
  const cellH = cellW * (g.gridCellAspect || 1.0);
  const rows = Math.max(1, Math.floor(h / cellH));
  g.gridCols = cols;
  g.gridRows = rows;
  g.gridCellW = cellW;
  g.gridCellH = cellH;
}

function gridCellToPixel(col, row) {
  const g = getGlobals();
  const x = (col + 0.5) * g.gridCellW;
  const y = (row + 0.5) * g.gridCellH;
  return { x, y };
}

export function initializePulseGrid() {
  const g = getGlobals();
  clearBalls();
  calculateGridDimensions();

  const maxCells = g.gridCols * g.gridRows;
  const targetBalls = Math.min(g.gridBallCount || 120, maxCells);

  const allCells = [];
  for (let r = 0; r < g.gridRows; r++) {
    for (let c = 0; c < g.gridCols; c++) {
      allCells.push({ gridX: c, gridY: r });
    }
  }
  for (let i = allCells.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [allCells[i], allCells[j]] = [allCells[j], allCells[i]];
  }

  for (let i = 0; i < targetBalls; i++) {
    const cell = allCells[i];
    const pos = gridCellToPixel(cell.gridX, cell.gridY);
    const ball = spawnBall(pos.x, pos.y);
    ball.gridX = cell.gridX;
    ball.gridY = cell.gridY;
    ball.targetX = pos.x;
    ball.targetY = pos.y;
    ball.jumpProgress = 1.0;
    ball.vx = 0;
    ball.vy = 0;
    ball.driftAx = 0;
    ball.driftTime = 0;
    const baseDelay = g.pulseInterval || 0.8;
    const phaseOffset = (g.pulseSynchronicity || 0.3) * Math.random() * baseDelay;
    ball.nextJumpTime = baseDelay + phaseOffset;
  }
}

export function updatePulseGrid(dt) {
  const g = getGlobals();
  const balls = g.balls;
  const cols = g.gridCols;
  const rows = g.gridRows;
  const interval = g.pulseInterval || 0.8;
  const randomness = g.pulseRandomness || 0.4;
  const synch = g.pulseSynchronicity || 0.3;
  const speed = g.pulseSpeed || 0.25;

  for (let i = 0; i < balls.length; i++) {
    const ball = balls[i];
    ball.nextJumpTime -= dt;

    if (ball.nextJumpTime <= 0 && (ball.jumpProgress === undefined || ball.jumpProgress >= 1.0)) {
      const dirs = [ {dx:0,dy:-1}, {dx:0,dy:1}, {dx:-1,dy:0}, {dx:1,dy:0} ];
      const dir = dirs[Math.floor(Math.random() * dirs.length)];
      const minSteps = g.pulseMinSteps || 1;
      const maxSteps = g.pulseMaxSteps || 3;
      const steps = minSteps + Math.floor(Math.random() * (maxSteps - minSteps + 1));
      const randomizedSteps = Math.max(1, Math.round(steps * (1 - randomness * 0.5 + randomness * Math.random())));

      let newX = Math.max(0, Math.min(cols - 1, ball.gridX + dir.dx * randomizedSteps));
      let newY = Math.max(0, Math.min(rows - 1, ball.gridY + dir.dy * randomizedSteps));
      ball.gridX = newX; ball.gridY = newY;
      const pos = gridCellToPixel(newX, newY);
      ball.targetX = pos.x; ball.targetY = pos.y;
      ball.jumpProgress = 0.0;
      ball.jumpStartX = ball.x; ball.jumpStartY = ball.y;

      const intervalJitter = randomness * interval * (Math.random() - 0.5);
      const syncJitter = synch * interval * Math.random();
      ball.nextJumpTime = interval + intervalJitter + syncJitter;
    }

    if (ball.jumpProgress !== undefined && ball.jumpProgress < 1.0) {
      ball.jumpProgress = Math.min(1.0, ball.jumpProgress + dt / speed);
      // Easing: simple easeInOut
      const t = ball.jumpProgress;
      const eased = t < 0.5 ? 2*t*t : -1 + (4 - 2*t) * t;
      ball.x = ball.jumpStartX + (ball.targetX - ball.jumpStartX) * eased;
      ball.y = ball.jumpStartY + (ball.targetY - ball.jumpStartY) * eased;
    }
  }
}



