// ╔══════════════════════════════════════════════════════════════════════════════╗
// ║                              NEURAL MODE                                     ║
// ║                   Emergent connectivity ("synapses")                          ║
// ╚══════════════════════════════════════════════════════════════════════════════╝

import { spawnBall } from '../physics/spawn.js';
import { getGlobals, clearBalls, getMobileAdjustedCount } from '../core/state.js';
import { pickRandomColor } from '../visual/colors.js';
import { randomRadiusForMode } from '../utils/ball-sizing.js';
import { MODES } from '../core/constants.js';
import { Ball } from '../physics/Ball.js';

// Neural network mode — dense nodes with ball-based connections
// - Calm wander with gentle group dynamics
// - Connector balls positioned between nearby nodes (synapses)
// - Dense, interconnected network appearance
// - Smooth mouse interaction

// Store connector balls and their connection info
let connectorBalls = [];
let nodeBalls = []; // Track which balls are nodes (not connectors)

export function initializeNeural() {
  const g = getGlobals();
  const canvas = g.canvas;
  if (!canvas) return;
  clearBalls();
  
  // Clear connector tracking
  connectorBalls = [];
  nodeBalls = [];

  const baseCount = Math.max(8, Math.min(g.neuralBallCount ?? 180, 400));
  const targetBalls = getMobileAdjustedCount(baseCount);
  if (targetBalls <= 0) return;
  const w = canvas.width;
  const h = canvas.height;
  const margin = 40 * (g.DPR || 1);
  const DPR = g.DPR || 1;

  // Ensure at least one ball of each color (0-7)
  const first = Math.min(8, targetBalls);
  for (let colorIndex = 0; colorIndex < first; colorIndex++) {
    const x = margin + Math.random() * (w - 2 * margin);
    const y = margin + Math.random() * (h - 2 * margin);
    const ball = spawnBall(x, y, pickRandomColor());

    const rr = randomRadiusForMode(g, MODES.NEURAL);
    ball.r = rr;
    ball.rBase = rr;
    ball.m = Math.max(1, rr * rr * 0.12);

    ball.vx = 0;
    ball.vy = 0;
    ball.driftAx = 0;
    ball.driftTime = 0;
    // Calm, slow rotation for gentle curving motion
    ball._neuralAngle = Math.random() * Math.PI * 2;
    ball._neuralRotSpeed = 0.15 + Math.random() * 0.15; // Slower, more neutral
    ball._isNeuralNode = true; // Mark as node ball
    nodeBalls.push(ball);
  }

  for (let i = first; i < targetBalls; i++) {
    const x = margin + Math.random() * (w - 2 * margin);
    const y = margin + Math.random() * (h - 2 * margin);
    const ball = spawnBall(x, y, pickRandomColor());

    const rr = randomRadiusForMode(g, MODES.NEURAL);
    ball.r = rr;
    ball.rBase = rr;
    ball.m = Math.max(1, rr * rr * 0.12);

    ball.vx = 0;
    ball.vy = 0;
    ball.driftAx = 0;
    ball.driftTime = 0;
    ball._neuralAngle = Math.random() * Math.PI * 2;
    ball._neuralRotSpeed = 0.15 + Math.random() * 0.15;
    ball._isNeuralNode = true; // Mark as node ball
    nodeBalls.push(ball);
  }
  
  // Create connector balls based on initial connections
  updateNeuralConnectors();
}

export function applyNeuralForces(ball, dt) {
  // Skip physics for connector balls (they're positioned manually)
  if (ball._isNeuralConnector) return;
  
  const g = getGlobals();
  const massScale = Math.max(0.25, ball.m / g.MASS_BASELINE_KG);
  const DPR = g.DPR || 1;

  // ════════════════════════════════════════════════════════════════════════════
  // CALM WANDER — gentle directional flow
  // ════════════════════════════════════════════════════════════════════════════
  const wanderStrength = Math.max(0, g.neuralWanderStrength ?? 350); // Neutral, calm
  const angle = ball._neuralAngle ?? 0;
  const rotSpeed = ball._neuralRotSpeed ?? 0.2;
  
  // Rotate direction very slowly for smooth, predictable motion
  ball._neuralAngle = angle + dt * rotSpeed;
  
  // Apply gentle constant-force wander
  const ax = Math.cos(angle) * wanderStrength;
  const ay = Math.sin(angle) * wanderStrength;
  ball.vx += (ax * dt) / massScale;
  ball.vy += (ay * dt) / massScale;

  // ════════════════════════════════════════════════════════════════════════════
  // SUBTLE LOCAL INTERACTIONS — adds interest without chaos
  // ════════════════════════════════════════════════════════════════════════════
  const separationRadius = (g.neuralSeparationRadius ?? 100) * DPR;
  const separationStrength = g.neuralSeparationStrength ?? 8000; // Gentle push
  let sepX = 0, sepY = 0, neighborCount = 0;
  
  // Check nearby neighbors for subtle avoidance (only node balls, not connectors)
  const balls = g.balls;
  for (let i = 0; i < balls.length; i++) {
    const other = balls[i];
    if (other === ball || other._isNeuralConnector) continue; // Skip connector balls
    
    const dx = ball.x - other.x;
    const dy = ball.y - other.y;
    const distSq = dx * dx + dy * dy;
    const dist = Math.sqrt(distSq);
    
    // Gentle repulsion when too close
    if (dist < separationRadius && dist > 0.1) {
      const strength = 1 - (dist / separationRadius);
      sepX += (dx / dist) * strength;
      sepY += (dy / dist) * strength;
      neighborCount++;
    }
  }
  
  // Apply separation force (subtle, not aggressive)
  if (neighborCount > 0) {
    ball.vx += (sepX / neighborCount) * separationStrength * dt / massScale;
    ball.vy += (sepY / neighborCount) * separationStrength * dt / massScale;
  }

  // ════════════════════════════════════════════════════════════════════════════
  // MOUSE INTERACTION — smooth, gentle attraction
  // ════════════════════════════════════════════════════════════════════════════
  if (g.mouseInCanvas) {
    const mx = g.mouseX;
    const my = g.mouseY;
    const dx = mx - ball.x;
    const dy = my - ball.y;
    const distSq = dx * dx + dy * dy;
    const dist = Math.max(20 * DPR, Math.sqrt(distSq));
    
    // Gentle, smooth attraction — doesn't overpower wander
    const mouseStrength = g.neuralMouseStrength ?? 40000; // More neutral
    const maxDist = 300 * DPR;
    const distFactor = dist > maxDist ? 0 : 1 - (dist / maxDist);
    const forceMag = (mouseStrength * distFactor) / (dist + 50 * DPR);
    
    // Normalize direction
    const nx = dx / dist;
    const ny = dy / dist;
    
    // Apply attractive force (blends with wander)
    ball.vx += (nx * forceMag * dt) / massScale;
    ball.vy += (ny * forceMag * dt) / massScale;
  }

  // ════════════════════════════════════════════════════════════════════════════
  // DAMPING — higher for calm, settled motion
  // ════════════════════════════════════════════════════════════════════════════
  const damp60 = Math.max(0.0, Math.min(1.0, g.neuralDamping ?? 0.985)); // More damping
  const damp = Math.pow(damp60, dt * 60);
  ball.vx *= damp;
  ball.vy *= damp;
}

/**
 * Update connector balls between connected nodes
 */
function updateNeuralConnectors() {
  const g = getGlobals();
  if (g.currentMode !== MODES.NEURAL) return;
  
  const linkDistanceVw = g.neuralLinkDistanceVw ?? 18;
  const maxLinksPerBall = g.neuralMaxLinksPerBall ?? 6;
  const connectorDensity = g.neuralConnectorDensity ?? 3; // Balls per connection
  const DPR = g.DPR || 1;
  const vw = (g.canvas.width / 100) || 10;
  const maxLinkDist = linkDistanceVw * vw * DPR;
  const maxLinkDistSq = maxLinkDist * maxLinkDist;
  
  // Get node balls (filter out connector balls)
  const nodes = g.balls.filter(b => b._isNeuralNode);
  if (nodes.length < 2) return;
  
  // Find connections and create/update connector balls
  const connections = [];
  
  for (let i = 0; i < nodes.length; i++) {
    const nodeA = nodes[i];
    let linkCount = 0;
    
    for (let j = i + 1; j < nodes.length && linkCount < maxLinksPerBall; j++) {
      const nodeB = nodes[j];
      const dx = nodeA.x - nodeB.x;
      const dy = nodeA.y - nodeB.y;
      const distSq = dx * dx + dy * dy;
      
      if (distSq < maxLinkDistSq && distSq > 0.1) {
        connections.push({ nodeA, nodeB, dist: Math.sqrt(distSq) });
        linkCount++;
      }
    }
  }
  
  // Calculate how many connector balls we need
  const neededConnectors = connections.length * connectorDensity;
  
  // Remove excess connectors or create new ones
  let currentConnectors = g.balls.filter(b => !b._isNeuralNode);
  
  // Remove excess connectors
  while (currentConnectors.length > neededConnectors) {
    const connector = currentConnectors.pop();
    const index = g.balls.indexOf(connector);
    if (index > -1) {
      g.balls.splice(index, 1);
      const connIndex = connectorBalls.indexOf(connector);
      if (connIndex > -1) connectorBalls.splice(connIndex, 1);
    }
  }
  
  // Create new connectors if needed
  while (currentConnectors.length < neededConnectors) {
    const connector = new Ball(0, 0, (g.ballSizeDesktop || 9) * 0.4 * DPR, '#888');
    connector._isNeuralNode = false;
    connector._isNeuralConnector = true;
    connector.vx = 0;
    connector.vy = 0;
    connector.m = connector.r * connector.r * 0.05; // Lighter
    connector.alpha = 0.6; // Slightly transparent
    g.balls.push(connector);
    connectorBalls.push(connector);
    currentConnectors.push(connector); // Update local array to avoid infinite loop
  }
  
  // Get fresh list after any additions/removals
  const allConnectors = g.balls.filter(b => !b._isNeuralNode);
  
  // Update connector positions along connection paths
  let connectorIndex = 0;
  for (const conn of connections) {
    const { nodeA, nodeB } = conn;
    
    // Position connectors evenly along the path
    for (let i = 0; i < connectorDensity && connectorIndex < allConnectors.length; i++) {
      const t = (i + 1) / (connectorDensity + 1); // 0..1, excluding endpoints
      const connector = allConnectors[connectorIndex];
      
      connector.x = nodeA.x + (nodeB.x - nodeA.x) * t;
      connector.y = nodeA.y + (nodeB.y - nodeA.y) * t;
      
      connectorIndex++;
    }
  }
}

/**
 * Update connector positions each frame
 */
export function updateNeural() {
  updateNeuralConnectors();
}

export function preRenderNeural(_ctx) {
  // Connector balls are regular balls, rendered automatically
}
