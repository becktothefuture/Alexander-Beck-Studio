const SIXTY_HZ_MODES = new Set([
  'flies',
  'weightless',
  'water',
  'magnetic',
  'elastic-center',
]);

export function resolvePhysicsStepSeconds(mode, globals = {}) {
  if (globals.isMobile || globals.isMobileViewport || SIXTY_HZ_MODES.has(mode)) return 1 / 60;
  return 1 / 120;
}

export function shouldSkipSleepingBodyStep(mode, globals = {}) {
  return mode === 'pit'
    || mode === 'portfolio-pit'
    || globals.physicsSkipSleepingSteps !== false;
}
