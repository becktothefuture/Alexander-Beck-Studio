import Matter from 'matter-js';
import { BOARD_WORLD_PHYSICS, stepBoardWorld } from './boardDynamics.js';

const { Collision, Sleeping } = Matter;

/** Sleeping is valid only while a contact chain reaches the architecture.
 * A moving or removed support can leave Matter's sleeping pairs behind. Check
 * their current geometry, including whole piles, without inventing a force.
 * Scratch collections are reused; this bounded scan runs ten times a second. */
export function createBoardSupportSafety(engine, balls, fixtures) {
  const present = new Set();
  const supported = new Set();
  const links = new Map();
  const linkPool = [];
  const queue = [];
  let usedLinks = 0;
  let elapsed = 0;
  let recovered = 0;

  function scan(wake = false) {
    present.clear();
    supported.clear();
    links.clear();
    queue.length = 0;
    usedLinks = 0;
    for (const ball of balls) if (!ball.isSensor && !ball.isStatic) present.add(ball);
    // The cold-start pack records a bottom-up equilibrium graph against the
    // real closed fixtures. Sleeping bodies have no Matter pairs yet. Retain
    // these contacts only while every supporting centre/fixture is unchanged;
    // once the outlet moves, ordinary live contacts and gravity take over.
    for (const ball of present) {
      const rest = ball.plugin?.boardInitialRest;
      if (!rest || Math.hypot(ball.position.x - rest.x, ball.position.y - rest.y) > .08) continue;
      if (!rest.supports.length || rest.supports.some(support => {
        // A missing member invalidates the whole equilibrium; one oblique
        // contact cannot stand in for a required two-contact support pair.
        if (!support) return true;
        const lower = support.body;
        return (!present.has(lower) && !fixtures.includes(lower))
          || Math.hypot(lower.position.x - support.x, lower.position.y - support.y) > .08
          || Math.abs(lower.angle - support.angle) > .001
          || (!lower.isStatic && !lower.plugin.boardPreparedRest && !supported.has(lower));
      })) continue;
      supported.add(ball);
    }
    for (const pair of engine.pairs.list) {
      if (pair.isSensor) continue;
      const a = pair.bodyA.parent;
      const b = pair.bodyB.parent;
      if ((!present.has(a) && !fixtures.includes(a))
        || (!present.has(b) && !fixtures.includes(b))) continue;
      let normalOnAY;
      if (pair.collision?.boardNativeContact) {
        // Rapier solves true circles and retains the small contact margin.
        // Re-querying Matter's inscribed display polygon can incorrectly say
        // an angled circle is unsupported while its real collider is at rest.
        normalOnAY = pair.collision.parentA === a
          ? pair.collision.normal.y : -pair.collision.normal.y;
      } else if (a.circleRadius && b.circleRadius) {
        const distance = Math.hypot(a.position.x - b.position.x, a.position.y - b.position.y);
        if (distance > a.circleRadius + b.circleRadius + .25) continue;
        normalOnAY = (a.position.y - b.position.y) / Math.max(.001, distance);
      } else {
        const collision = Collision.collides(pair.bodyA, pair.bodyB);
        if (!collision) continue;
        normalOnAY = collision.parentA === a ? collision.normal.y : -collision.normal.y;
      }
      // Touching a vertical wall or the underside of a rail is not support.
      // Only a normal opposing downward gravity can carry a resting ball.
      if (a.isStatic && present.has(b) && normalOnAY > .02) supported.add(b);
      else if (b.isStatic && present.has(a) && normalOnAY < -.02) supported.add(a);
      else if (present.has(a) && present.has(b)) {
        if (normalOnAY > .02) addLink(a, b); // lower -> upper
        else if (normalOnAY < -.02) addLink(b, a);
      }
    }
    // Resolve connected stacks from their real supports. An isolated cluster
    // does not support itself just because its sleeping balls touch each other.
    // Visit each contact once. Repeatedly scanning every pair for each layer
    // of a tall reservoir made the safety check itself quadratic.
    for (const body of supported) queue.push(body);
    for (let cursor = 0; cursor < queue.length; cursor += 1) {
      for (const upper of links.get(queue[cursor]) || []) {
        if (supported.has(upper)) continue;
        supported.add(upper);
        queue.push(upper);
      }
    }
    let unsupportedSleeping = 0;
    for (const ball of present) {
      if (!ball.isSleeping || supported.has(ball)) continue;
      unsupportedSleeping += 1;
      if (wake) Sleeping.set(ball, false);
    }
    if (wake) recovered += unsupportedSleeping;
    return { unsupportedSleeping, supported: supported.size, recovered };
  }

  function addLink(lower, upper) {
    let list = links.get(lower);
    if (!list) {
      list = linkPool[usedLinks] || (linkPool[usedLinks] = []);
      usedLinks += 1;
      list.length = 0;
      links.set(lower, list);
    }
    list.push(upper);
  }

  return {
    inspect: () => scan(),
    settleSupported(predicate, freeze) {
      // Resolve from the architecture upwards. A temporarily fixed grain must
      // rest on an already fixed support; no suspended island can freeze.
      const contactSupports = new Map();
      const add = (upper, lower) => {
        let list = contactSupports.get(upper);
        if (!list) { list = []; contactSupports.set(upper, list); }
        list.push(lower);
      };
      for (const pair of engine.pairs.list) {
        const a = pair.bodyA.parent, b = pair.bodyB.parent;
        const normal = pair.collision?.normal;
        if (!normal || pair.isSensor) continue;
        if (normal.y < -.02) add(a, b);
        else if (normal.y > .02) add(b, a);
      }
      for (const ball of queue) {
        if (ball.plugin.boardPreparedRest || !predicate(ball)) continue;
        const contacts = (contactSupports.get(ball) || [])
          .filter(lower => lower.isStatic || lower.plugin.boardPreparedRest);
        if (!contacts.length) continue;
        ball.plugin.boardInitialRest = { x: ball.position.x, y: ball.position.y,
          supports: contacts.map(body => ({ body, x: body.position.x, y: body.position.y, angle: body.angle })) };
        ball.plugin.boardPreparedRest = true;
        freeze(ball);
      }
    },
    update(deltaMs) {
      elapsed += deltaMs;
      if (elapsed < 100) return;
      elapsed %= 100;
      scan(true);
    },
  };
}

/** Run the unshown packing under normal gravity with the valve closed. Work
 * is sliced between paints; no velocity reset or forced sleeping can turn an
 * unsupported seed into a floating decoration. Reveal only actual rest. */
export function createBoardReservoirPreparation(engine, balls, fixtures, supportSafety, backend = null) {
  let steps = 0;
  let ready = balls.length === 0 || (balls.every(ball => ball.isSleeping)
    && supportSafety.inspect().unsupportedSleeping === 0);
  let settled = ready;
  const stepMs = backend?.fixedStepMs || BOARD_WORLD_PHYSICS.fixedStepMs;
  const maximumSteps = Math.ceil(30000 / stepMs);
  return {
    get ready() { return ready; },
    get settled() { return settled; },
    get steps() { return steps; },
    advance(budgetMs = 6) {
      const deadline = performance.now() + budgetMs;
      for (let slice = 0; !ready && slice < 120; slice += 1) {
        if (backend) backend.step(stepMs, 1, null, true);
        else stepBoardWorld(engine, balls, stepMs, fixtures);
        supportSafety.update(stepMs);
        steps += 1;
        if (backend?.pinPreparedBody && steps >= 240 && steps % 12 === 0) {
          const support = supportSafety.inspect();
          if (support.supported && supportSafety.settleSupported) {
            supportSafety.settleSupported(body => body.speed < .75 && Math.abs(body.angularSpeed) < .08,
              backend.pinPreparedBody);
          }
        }
        settled = steps % 12 === 0 && balls.every(ball => ball.isSleeping)
          && supportSafety.inspect().unsupportedSleeping === 0;
        // Invalid geometry must not leave an invisible scene or block input
        // forever. After thirty simulated seconds, continue the actual moving
        // world and report the failed rest preparation. The timeout never
        // resets seeds or freezes unsupported bodies to claim convergence.
        ready = settled || steps >= maximumSteps;
        if (ready) backend?.releasePreparedBodies?.();
        if (performance.now() >= deadline) break;
      }
      return ready;
    },
  };
}
