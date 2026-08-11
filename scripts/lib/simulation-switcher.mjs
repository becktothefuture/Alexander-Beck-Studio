export function getNextDailySimulation(dailySimulations, currentId) {
  if (!Array.isArray(dailySimulations) || dailySimulations.length === 0) return null;
  const currentIndex = dailySimulations.findIndex((entry) => entry.id === currentId);
  return dailySimulations[(currentIndex + 1 + dailySimulations.length) % dailySimulations.length] || null;
}

export async function waitForSimulationSwitcherIdle(page, waitMs = 30_000) {
  await page.waitForFunction(
    () => {
      const root = document.documentElement;
      const switcher = document.querySelector('.simulation-focus-switcher');
      return Boolean(
        switcher
        && !switcher.disabled
        && switcher.dataset.phase === 'idle'
        && (root.dataset.absSimulationFocusTransition || 'idle') === 'idle'
      );
    },
    null,
    { timeout: waitMs, polling: 50 },
  );
}

export async function advanceSimulationSwitcher(page, dailySimulations, waitMs = 30_000) {
  await waitForSimulationSwitcherIdle(page, waitMs);
  const switcher = page.locator('.simulation-focus-switcher');
  const currentId = await switcher.getAttribute('data-simulation-id');
  const expected = getNextDailySimulation(dailySimulations, currentId);
  if (!expected) throw new Error(`Could not resolve the simulation after "${currentId || 'unknown'}"`);

  await switcher.click({ timeout: waitMs });
  await page.waitForFunction(
    (expectedId) => document.querySelector('.simulation-focus-switcher')?.dataset.simulationId === expectedId,
    expected.id,
    { timeout: waitMs, polling: 50 },
  );
  await waitForSimulationSwitcherIdle(page, waitMs);
  return expected;
}

export async function advanceSimulationSwitcherTo(
  page,
  dailySimulations,
  targetId,
  waitMs = 30_000,
) {
  if (!dailySimulations.some((entry) => entry.id === targetId)) {
    throw new Error(`Simulation "${targetId}" is not in the Daily circular order`);
  }

  for (let step = 0; step < dailySimulations.length; step += 1) {
    const currentId = await page.locator('.simulation-focus-switcher')
      .getAttribute('data-simulation-id');
    if (currentId === targetId) {
      return dailySimulations.find((entry) => entry.id === targetId) || null;
    }
    await advanceSimulationSwitcher(page, dailySimulations, waitMs);
  }

  throw new Error(`Circular switcher did not reach "${targetId}" within one complete cycle`);
}
