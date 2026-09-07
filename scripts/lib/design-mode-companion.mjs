import { fileURLToPath, pathToFileURL } from 'node:url';
import { resolve } from 'node:path';

// Compatibility adapter for the pinned 2.2.1 local server. SESSION_UPDATE
// stores tokenChanges/tokenGuidance but getChangeReport drops both fields.
// Decorate the in-memory report only; keep the vendor checkout and UI intact.
// The actual stdio + socket regression test must pass before removing this
// adapter on an upstream upgrade.
const root = fileURLToPath(new URL('../..', import.meta.url));
const checkout = resolve(root, '.cache/design-mode');
const module = await import(pathToFileURL(resolve(checkout, 'packages/mcp-local/src/state.ts')).href);
const state = module.state || module.default?.state;
if (!state || typeof state.getChangeReport !== 'function' || typeof state.getSession !== 'function') {
  throw new Error('The pinned Design Mode state API changed. Revalidate the compatibility adapter.');
}
const originalReport = state.getChangeReport.bind(state);
state.getChangeReport = () => ({
  ...originalReport(),
  tokenChanges: state.getSession()?.tokenChanges || [],
  tokenGuidance: state.getSession()?.tokenGuidance,
});
await import(pathToFileURL(resolve(checkout, 'packages/mcp-local/src/bin/cli.ts')).href);
