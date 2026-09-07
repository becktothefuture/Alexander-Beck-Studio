import { ROUTE_MANIFEST } from '../../react-app/app/src/lib/route-manifest.js';
import { createTokenPlan } from './design-mode-pipeline.mjs';

const changeKinds = ['tokenChanges', 'styleChanges', 'textChanges', 'domChanges', 'comments'];

// A read-only handoff index. Browser selectors and hints never choose write paths.
export async function reviewDesignModeHandoff(root, adapter, report) {
  const url = new URL(report.pageUrl);
  if (url.username || url.password || !adapter.origins.includes(url.origin)) {
    throw new Error('Design Mode source review requires the local authoring origin on port 8012.');
  }
  if (report.handoff?.pageUrl && report.handoff.pageUrl !== report.pageUrl) {
    throw new Error('The handoff and active page differ. Select the intended page before reviewing.');
  }
  const route = Object.values(ROUTE_MANIFEST).find(entry => entry.aliases.includes(url.pathname));
  const routeId = route?.id;
  const routeSources = adapter.routeSources[routeId];
  if (!routeSources) throw new Error('This page has no registered source-review map. Register its owners before editing.');
  for (const kind of changeKinds) {
    if (report[kind] !== undefined && !Array.isArray(report[kind])) throw new Error(`Expected an array for ${kind}.`);
  }

  let tokenPlan = null;
  let tokenError = null;
  if (report.tokenChanges?.length) {
    try {
      // Keep all non-token items below; the deterministic writer receives only tokens.
      tokenPlan = await createTokenPlan(root, adapter, {
        pageUrl: report.pageUrl, tokenChanges: report.tokenChanges,
      });
    } catch (error) { tokenError = error.message; }
  }
  const unresolvedIndices = new Set(tokenPlan?.unresolved.map(item => item.index).filter(Number.isInteger));
  const items = changeKinds.flatMap(kind => (report[kind] || []).map((change, index) => ({
    kind, index,
    id: change?.id ?? null,
    handling: kind === 'tokenChanges' && tokenPlan?.ready && !unresolvedIndices.has(index)
      ? 'review-token-plan' : 'review-authored-source',
    change,
  })));
  return {
    project: adapter.id, route: routeId, pageUrl: report.pageUrl,
    sourceCandidates: [...new Set([...adapter.sourceReferences, ...routeSources])],
    items, tokenPlan, tokenError,
    verification: {
      overrides: 'Inspect Original or disable overrides and reload after source save.',
      widths: [390, 600, 601, 768, 1024, 1025, 1440],
      states: ['light', 'dark', 'keyboard-focus', 'reduced-motion'],
      commands: ['npm run check:design-config', 'npm run check:site'],
    },
    limits: [
      'Source candidates require selector/component tracing; they are not automatic write targets.',
      'Keep aliases, expressions, conditional rules and component scope in authored source.',
      'Canvas/WebGL content uses the existing simulation editor; Blender owns About geometry.',
      'Work case-study facts must follow the portfolio evidence workflow and content holds.',
      'Token metadata has no per-token IDs. Do not invent IDs or clear mixed unresolved sessions.',
    ],
  };
}
