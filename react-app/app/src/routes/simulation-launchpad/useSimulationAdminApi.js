import { useMemo } from 'react';
import { SIMULATION_STAGES } from '../../data/simulationCatalog.js';

async function postJson(url, payload) {
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  const result = await response.json().catch(() => ({}));
  if (!response.ok || result?.ok === false) {
    throw new Error(result?.error || `Request failed: ${response.status}`);
  }
  return result;
}

function buildActionPrompt(entry, nextStage) {
  const action = nextStage === SIMULATION_STAGES.DAILY_ROTATION ? 'promote' : 'move';
  return [
    `In /Users/alexanderbeck/Projects-code/Alexander Beck Studio Website, ${action} simulation "${entry.id}" to stage "${nextStage}".`,
    'Update react-app/app/src/data/simulationCatalog.json only unless the catalog reveals a missing route/config wiring issue.',
    'Then run npm run sim:validate and npm run build, and report the changed files plus verification result.',
  ].join('\n');
}

function buildReviewPrompt(entry, reviewStatus) {
  return [
    `In /Users/alexanderbeck/Projects-code/Alexander Beck Studio Website, set simulation "${entry.id}" reviewStatus to "${reviewStatus}".`,
    'Update react-app/app/src/data/simulationCatalog.json only.',
    'Then run npm run sim:validate and npm run build, and report the changed files plus verification result.',
  ].join('\n');
}

function buildIssuePrompt(entry, issue) {
  return [
    `In /Users/alexanderbeck/Projects-code/Alexander Beck Studio Website, log this simulation issue for "${entry.id}".`,
    `Title: ${issue.title || 'Untitled issue'}`,
    `Severity: ${issue.severity}`,
    '',
    issue.note || 'No detail provided.',
    '',
    'Create a dated Markdown note under docs/simulations/issues/ and do not change behavior unless asked.',
  ].join('\n');
}

function copyText(value, onDone) {
  if (!navigator?.clipboard?.writeText) {
    onDone('Clipboard unavailable. Copy the command text from the browser console.');
    console.info(value);
    return;
  }

  navigator.clipboard.writeText(value)
    .then(() => onDone('Copied Codex prompt.'))
    .catch(() => {
      console.info(value);
      onDone('Clipboard blocked. Prompt was written to the browser console.');
    });
}

export function useSimulationAdminApi(onMessage) {
  return useMemo(() => ({
    async changeStage(entry, nextStage) {
      try {
        const result = await postJson('/api/simulations/stage', {
          id: entry.id,
          stage: nextStage,
        });
        onMessage(`${entry.name} moved to ${nextStage.replace('-', ' ')}.`);
        return result.simulation;
      } catch {
        copyText(buildActionPrompt(entry, nextStage), onMessage);
        return null;
      }
    },

    async changeReviewStatus(entry, reviewStatus) {
      try {
        const result = await postJson('/api/simulations/review-status', {
          id: entry.id,
          reviewStatus,
        });
        onMessage(`${entry.name} review status set to ${reviewStatus}.`);
        return result.simulation;
      } catch {
        copyText(buildReviewPrompt(entry, reviewStatus), onMessage);
        return null;
      }
    },

    async logIssue(entry, issue) {
      try {
        const result = await postJson('/api/simulations/issues', {
          id: entry.id,
          ...issue,
        });
        onMessage(`Logged issue: ${result.relativePath}`);
        return true;
      } catch {
        copyText(buildIssuePrompt(entry, issue), onMessage);
        return false;
      }
    },

    async updateIssueStatus(issue, status) {
      try {
        const result = await postJson('/api/simulations/issues/status', {
          fileName: issue.fileName,
          status,
        });
        onMessage(`${issue.title} marked ${result.status}.`);
        return true;
      } catch {
        copyText(`Set ${issue.relativePath} status to ${status}.`, onMessage);
        return false;
      }
    },

    async validateCatalog() {
      try {
        const result = await postJson('/api/simulations/validate', {});
        onMessage(result.stdout || 'Simulation catalog validation passed.');
        return true;
      } catch {
        copyText('npm run sim:validate', onMessage);
        return false;
      }
    },

    async capturePreview(entry) {
      try {
        const result = await postJson('/api/simulations/capture', {
          id: entry.id,
          baseUrl: window.location.origin,
        });
        onMessage(result.stdout || `Captured preview for ${entry.name}.`);
        return true;
      } catch {
        copyText(`npm run sim:capture -- --ids=${entry.id} --frames=4`, onMessage);
        return false;
      }
    },
  }), [onMessage]);
}
