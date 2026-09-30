import { BOARD_WIDTH } from './boardScene.js';

// The editable About frames in Figma use this same proportional guide:
// 12 columns, 48-unit side margins and 24-unit gutters on a 960-unit board.
export const BOARD_TEXT_GRID = Object.freeze({ columns: 12, margin: 48, gutter: 24 });

const columnWidth = (BOARD_WIDTH - 2 * BOARD_TEXT_GRID.margin
  - (BOARD_TEXT_GRID.columns - 1) * BOARD_TEXT_GRID.gutter) / BOARD_TEXT_GRID.columns;

export function boardTextGridSlot(column, span, centered = false) {
  const left = BOARD_TEXT_GRID.margin + (column - 1) * (columnWidth + BOARD_TEXT_GRID.gutter);
  const width = span * columnWidth + (span - 1) * BOARD_TEXT_GRID.gutter;
  return {
    left: `${(centered ? left + width / 2 : left) / BOARD_WIDTH * 100}%`,
    width: `${width / BOARD_WIDTH * 100}%`,
    ...(centered ? { transform: 'translateX(-50%)' } : {}),
  };
}

export const BOARD_TEXT_SLOTS = Object.freeze({
  introduction: { desktop: [1, 6], mobile: [1, 12] },
  'garden-ideas': { desktop: [4, 6], mobile: [2, 10] },
  disciplines: { desktop: [2, 10], mobile: [2, 10] },
  practice: { desktop: [4, 6], mobile: [2, 10] },
  making: { desktop: [4, 6], mobile: [2, 10] },
  'working-together': { desktop: [1, 12], mobile: [1, 12] },
  'final-statement': { desktop: [4, 6], mobile: [2, 10] },
});

export function boardEditorialGridSlot(id, mobile) {
  const [column, span] = BOARD_TEXT_SLOTS[id][mobile ? 'mobile' : 'desktop'];
  return { ...boardTextGridSlot(column, span), transform: 'none' };
}
