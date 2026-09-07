import assert from 'node:assert/strict';
import { createServer } from 'node:net';
import { once } from 'node:events';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { resolve, dirname } from 'node:path';
import { mkdtemp, mkdir, readFile, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import process from 'node:process';
import adapter from '../../design-mode.config.mjs';
import { createTokenPlan, applyTokenPlan, readSnapshot } from '../lib/design-mode-pipeline.mjs';

const root = fileURLToPath(new URL('../..', import.meta.url));
const checkout = resolve(root, '.cache/design-mode');
const load = (path) => import(pathToFileURL(resolve(checkout, 'node_modules', path)).href);
const { Client } = await load('@modelcontextprotocol/sdk/dist/esm/client/index.js');
const { StdioClientTransport } = await load('@modelcontextprotocol/sdk/dist/esm/client/stdio.js');
const { default: WebSocket } = await load('ws/wrapper.mjs');
const portReservation = createServer();
portReservation.listen(0, '127.0.0.1');
await once(portReservation, 'listening');
const port = portReservation.address().port;
await new Promise((fulfil) => portReservation.close(fulfil));
const fixture = await mkdtemp(resolve(tmpdir(), 'design-mode-mcp-'));
const client = new Client({ name: 'beck-design-mode-protocol-check', version: '0.1.0' });
const transport = new StdioClientTransport({ command: process.execPath,
  args: [resolve(root, 'scripts/design-mode-tooling.mjs'), 'mcp'],
  env: { ...process.env, DM_PORT: String(port) }, stderr: 'pipe',
});
let ws;
let stderr = '';
transport.stderr?.on('data', (chunk) => { stderr += chunk; });
const parse = (result) => {
  assert.notEqual(result.isError, true);
  return JSON.parse(result.content.find((item) => item.type === 'text').text);
};
try {
  for (const file of adapter.files) {
    await mkdir(dirname(resolve(fixture, file)), { recursive: true });
    await writeFile(resolve(fixture, file), await readFile(resolve(root, file)));
  }
  await client.connect(transport);
  const { tools } = await client.listTools();
  assert.equal(tools.length, 8);
  const offline = parse(await client.callTool({ name: 'get_session_summary', arguments: {} }));
  assert.equal(offline.extensionConnected, false);
  const response = await fetch(`http://127.0.0.1:${port}/.design-mode/health`);
  assert.equal(response.status, 200);
  const health = await response.json();
  assert.equal(health.identity, 'design-mode-mcp');
  // Use the normal extension handshake. Never log the ephemeral socket token.
  ws = new WebSocket(`ws://127.0.0.1:${port}/?token=${encodeURIComponent(health.webSocketToken)}`);
  await once(ws, 'open');
  const snapshot = await readSnapshot(fixture, adapter);
  const oldValue = snapshot[adapter.canonical].document.runtime.buttonBarMobileHeightPx;
  const tokenChanges = [{ cssVar: '--button-bar-mobile-height', scopeSelector: ':root',
    oldValue: `${oldValue}px`, newValue: '66px', cssRule: ':root { --button-bar-mobile-height: 66px; }' }];
  const session = { pageUrl: 'http://localhost:8012/', pageTitle: 'Protocol fixture',
    styleChanges: [], textChanges: [], domChanges: [], tokenChanges,
    tokenGuidance: 'Edit the canonical token source, preserving its scope.',
    cssBlock: '', handoff: { requestedAt: Date.now(), pageUrl: 'http://localhost:8012/', pageTitle: 'Protocol fixture' } };
  ws.send(JSON.stringify({ type: 'SESSION_UPDATE', payload: session }));
  await new Promise((fulfil, reject) => ws.ping('barrier', undefined, (error) => error ? reject(error) : fulfil()));
  let handoff;
  for (let attempt = 0; attempt < 5; attempt += 1) {
    handoff = parse(await client.callTool({ name: 'get_changes', arguments: {} }));
    if (handoff.pageUrl === session.pageUrl) break;
  }
  assert.deepEqual(handoff.tokenChanges, tokenChanges, 'Local MCP must preserve token metadata from SESSION_UPDATE.');
  assert.equal(handoff.tokenGuidance, session.tokenGuidance);
  const online = parse(await client.callTool({ name: 'get_session_summary', arguments: {} }));
  assert.equal(online.extensionConnected, true);
  const plan = await createTokenPlan(fixture, adapter, handoff);
  assert.equal(plan.ready, true);
  await applyTokenPlan(fixture, adapter, plan);
  assert.equal((await readSnapshot(fixture, adapter))[adapter.canonical].document.runtime.buttonBarMobileHeightPx, 66);
  console.log('PASS: 8 MCP tools, offline/connected handshake, token metadata, canonical write and generated reload. Browser messages were simulated; no real extension UI was driven.');
} catch (error) {
  if (!stderr.includes('MCP READY')) console.error('Companion did not reach ready state; run npm run design:setup and npm run design:doctor.');
  throw error;
} finally {
  if (ws) { ws.close(); ws.terminate(); }
  await client.close();
  await rm(fixture, { recursive: true, force: true });
}
