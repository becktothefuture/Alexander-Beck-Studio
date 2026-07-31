import assert from 'node:assert/strict';

function assertStages(actualStages, requiredStages, label) {
  const positions = requiredStages.map((stage) => actualStages.indexOf(stage));
  positions.forEach((position, index) => {
    assert.ok(position >= 0, `${label} missed readiness stage ${requiredStages[index]}.`);
  });
  for (let index = 1; index < positions.length; index += 1) {
    assert.ok(positions[index] > positions[index - 1], `${label} readiness stages settled out of order.`);
  }
}

export function assertPortfolioReadySnapshot(snapshot, fixture, { spa = false } = {}) {
  const label = spa ? 'SPA Portfolio' : 'Direct Portfolio';
  assert.equal(snapshot.path, '/portfolio.html', `${label} settled on the wrong path.`);
  assert.equal(snapshot.loadState, 'loaded', `${label} did not publish loaded state.`);
  assert.equal(snapshot.booting, false, `${label} retained its booting class.`);
  assert.equal(snapshot.loaded, true, `${label} did not publish its loaded class.`);
  assert.equal(snapshot.transitionPhase, 'idle', `${label} transition did not settle.`);
  assert.equal(snapshot.auditAppReady, true, `${label} audit app was unavailable.`);
  assert.ok(snapshot.projectCount >= fixture.minimumProjectCount, `${label} rendered too few projects.`);
  assert.equal(snapshot.activeCardCount, 1, `${label} must expose one active card.`);
  assert.ok(snapshot.labelCount >= snapshot.projectCount, `${label} omitted project labels.`);
  assert.equal(snapshot.drawerCount, 1, `${label} must keep one stable drawer host.`);
  assert.equal(snapshot.drawerHidden, 'true', `${label} drawer must start closed.`);
  assert.equal(snapshot.mountBusy, null, `${label} mount retained aria-busy.`);
  assertStages(snapshot.bootstrapStages, spa ? fixture.spaReadinessStages : fixture.directReadinessStages, label);
}

export function assertPortfolioDomContractSnapshot(snapshot, projectCount) {
  for (const [name, count] of Object.entries(snapshot.routeNodeCounts)) {
    assert.equal(count, 1, `Portfolio DOM contract route node ${name} must match exactly once.`);
  }
  assert.equal(snapshot.mountCount, 1, 'Portfolio DOM contract must expose one deck mount.');
  assert.equal(snapshot.stageCount, 1, 'Portfolio DOM contract must expose one deck stage.');
  assert.ok(snapshot.cardCount >= projectCount, 'Portfolio DOM contract rendered too few deck cards.');
  assert.equal(snapshot.activeCardCount, 1, 'Portfolio DOM contract must expose one active card.');
  assert.ok(snapshot.labelCount >= projectCount, 'Portfolio DOM contract rendered too few labels.');
  assert.equal(snapshot.drawerHostCount, 1, 'Portfolio DOM contract must expose one drawer host.');
  assert.equal(snapshot.drawerViewCount, 1, 'Portfolio DOM contract must expose one drawer view.');
  assert.equal(snapshot.loadState, 'loaded', 'Portfolio DOM load-state marker did not settle.');
  assert.ok(
    ['preparing', 'entering', 'complete'].includes(snapshot.entrancePhase),
    `Portfolio DOM entrance marker is invalid: ${snapshot.entrancePhase || '<missing>'}.`,
  );
  assert.ok(snapshot.entranceReason, 'Portfolio DOM entrance-reason marker is missing.');
  assert.equal(snapshot.mediaReady, 'true', 'Portfolio DOM media-ready marker did not settle.');
  assert.equal(snapshot.activeProjectMarkersValid, true, 'Active Portfolio card lost its project marker.');
}

export function assertPortfolioCleanupSnapshot(snapshot) {
  assert.equal(snapshot.path, '/index.html', 'Portfolio cleanup settled on the wrong route.');
  assert.equal(snapshot.auditBridgePresent, false, 'Portfolio audit bridge survived cleanup.');
  assert.equal(snapshot.previousAppDestroyed, true, 'Previous Portfolio app was not destroyed.');
  assert.equal(snapshot.loadState, null, 'Portfolio load state survived cleanup.');
  assert.equal(snapshot.portfolioPage, false, 'Portfolio page class survived cleanup.');
  assert.equal(snapshot.portfolioOpen, false, 'Portfolio drawer state survived cleanup.');
  assert.equal(snapshot.mountCount, 0, 'Portfolio mount survived cleanup.');
  assert.equal(snapshot.drawerCount, 0, 'Portfolio drawer host survived cleanup.');
  assert.equal(snapshot.documentIdentityStable, true, 'Portfolio route navigation replaced the document.');
}

export function assertPortfolioFocusSnapshot(snapshot) {
  assert.equal(snapshot.drawerOpen, false, 'Portfolio drawer did not close after keyboard dismissal.');
  assert.equal(snapshot.deckInert, false, 'Portfolio deck stayed inert after close.');
  assert.equal(snapshot.focusedProjectIndex, snapshot.expectedProjectIndex, 'Focus did not return to the originating project card.');
}
