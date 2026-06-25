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
    const error = new Error(result?.error || `Request failed: ${response.status}`);
    error.result = result;
    error.plan = result?.plan;
    throw error;
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

function buildDeletePrompt(entry, plan) {
  const blockers = plan?.blockers?.length
    ? plan.blockers.map((blocker) => `- ${blocker}`).join('\n')
    : '- The dashboard could not prove source ownership safely.';
  return [
    `In /Users/alexanderbeck/Projects-code/Alexander Beck Studio Website, safely delete simulation "${entry.id}".`,
    '',
    'Automatic deletion was blocked for this reason:',
    blockers,
    '',
    'Remove the catalog entry, repo-owned preview assets, pitch/issues/activity records, and only source files or route wiring uniquely owned by this simulation.',
    'Do not delete shared route/runtime files unless this simulation is their only owner.',
    'Then run npm run sim:validate, npm run lint --prefix react-app/app, and npm run build.',
  ].join('\n');
}

function sendNotice(onDone, notice) {
  onDone(typeof notice === 'string' ? {
    tone: 'info',
    title: 'Dashboard update',
    detail: notice,
  } : notice);
}

function summarizeOutput(result, fallback) {
  const output = [result?.stdout, result?.stderr]
    .filter(Boolean)
    .join('\n')
    .trim();
  if (!output) return fallback;

  const lines = output
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);
  const signalLines = lines.filter((line) => (
    line.includes('passed')
    || line.includes('built in')
    || line.includes('✓ built')
    || line.includes('Simulation catalog validation')
    || line.includes('HTML fragment validation')
  ));
  return (signalLines.length ? signalLines : lines).slice(-4).join('\n');
}

function copyText(value, onDone, title = 'Copied Codex prompt') {
  if (!navigator?.clipboard?.writeText) {
    sendNotice(onDone, {
      tone: 'warning',
      title: 'Clipboard unavailable',
      detail: 'The fallback prompt was written to the browser console.',
    });
    console.info(value);
    return;
  }

  navigator.clipboard.writeText(value)
    .then(() => sendNotice(onDone, {
      tone: 'warning',
      title,
      detail: 'Local dev API was unavailable, so the matching Codex prompt is on your clipboard.',
    }))
    .catch(() => {
      console.info(value);
      sendNotice(onDone, {
        tone: 'warning',
        title: 'Clipboard blocked',
        detail: 'The fallback prompt was written to the browser console.',
      });
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
        sendNotice(onMessage, {
          tone: 'success',
          title: 'Stage updated',
          detail: `${entry.name} moved to ${nextStage.replace('-', ' ')}.`,
        });
        return result.simulation;
      } catch {
        copyText(buildActionPrompt(entry, nextStage), onMessage, 'Copied stage-change prompt');
        return null;
      }
    },

    async changeReviewStatus(entry, reviewStatus) {
      try {
        const result = await postJson('/api/simulations/review-status', {
          id: entry.id,
          reviewStatus,
        });
        sendNotice(onMessage, {
          tone: 'success',
          title: 'Review updated',
          detail: `${entry.name} review status set to ${reviewStatus}.`,
        });
        return result.simulation;
      } catch {
        copyText(buildReviewPrompt(entry, reviewStatus), onMessage, 'Copied review prompt');
        return null;
      }
    },

    async logIssue(entry, issue) {
      try {
        const result = await postJson('/api/simulations/issues', {
          id: entry.id,
          ...issue,
        });
        sendNotice(onMessage, {
          tone: 'success',
          title: 'Issue logged',
          detail: result.relativePath,
        });
        return true;
      } catch {
        copyText(buildIssuePrompt(entry, issue), onMessage, 'Copied issue prompt');
        return false;
      }
    },

    async updateIssueStatus(issue, status) {
      try {
        const result = await postJson('/api/simulations/issues/status', {
          fileName: issue.fileName,
          status,
        });
        sendNotice(onMessage, {
          tone: 'success',
          title: 'Issue updated',
          detail: `${issue.title} marked ${result.status}.`,
        });
        return true;
      } catch {
        copyText(`Set ${issue.relativePath} status to ${status}.`, onMessage, 'Copied issue-status prompt');
        return false;
      }
    },

    async validateCatalog() {
      try {
        const result = await postJson('/api/simulations/validate', {});
        sendNotice(onMessage, {
          tone: 'success',
          title: 'Validation passed',
          detail: summarizeOutput(result, 'Simulation catalog validation passed.'),
        });
        return true;
      } catch {
        copyText('npm run sim:validate', onMessage, 'Copied validation command');
        return false;
      }
    },

    async runBuild() {
      try {
        const result = await postJson('/api/simulations/build', {});
        sendNotice(onMessage, {
          tone: 'success',
          title: 'Production build updated',
          detail: summarizeOutput(result, 'npm run build completed.'),
        });
        return true;
      } catch {
        copyText('npm run build', onMessage, 'Copied build command');
        return false;
      }
    },

    async capturePreview(entry) {
      try {
        const result = await postJson('/api/simulations/capture', {
          id: entry.id,
          baseUrl: window.location.origin,
        });
        sendNotice(onMessage, {
          tone: 'success',
          title: 'Preview captured',
          detail: summarizeOutput(result, `Captured preview for ${entry.name}.`),
        });
        return true;
      } catch {
        copyText(`npm run sim:capture -- --ids=${entry.id} --frames=4`, onMessage, 'Copied capture command');
        return false;
      }
    },

    async previewDelete(entry) {
      try {
        const result = await postJson('/api/simulations/delete', {
          id: entry.id,
          dryRun: true,
        });
        if (result.plan?.blocked) {
          sendNotice(onMessage, {
            tone: 'warning',
            title: 'Delete blocked',
            detail: result.plan.blockers?.join('\n') || 'This simulation needs manual cleanup.',
          });
        } else {
          sendNotice(onMessage, {
            tone: 'warning',
            title: 'Delete plan ready',
            detail: `Review the cleanup plan for ${entry.name}.`,
          });
        }
        return result.plan;
      } catch {
        copyText(buildDeletePrompt(entry), onMessage, 'Copied delete prompt');
        return null;
      }
    },

    async deleteSimulation(entry, confirmId, plan) {
      try {
        const result = await postJson('/api/simulations/delete', {
          id: entry.id,
          confirmId,
        });
        sendNotice(onMessage, {
          tone: 'success',
          title: 'Simulation deleted',
          detail: `${entry.name} was removed from the catalog and owned repo files.`,
        });
        return result;
      } catch (error) {
        copyText(error?.plan?.cleanupPrompt || buildDeletePrompt(entry, plan), onMessage, 'Copied delete cleanup prompt');
        return null;
      }
    },
  }), [onMessage]);
}
