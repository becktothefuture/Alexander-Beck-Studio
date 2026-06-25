import { useState } from 'react';
import { SIMULATION_STAGES } from '../../data/simulationCatalog.js';

function SimulationPreview({ entry }) {
  const [hovering, setHovering] = useState(false);
  const [posterFailed, setPosterFailed] = useState(false);
  const [animatedFailed, setAnimatedFailed] = useState(false);
  const animatedSrc = entry.preview?.animated;
  const posterSrc = entry.preview?.poster;
  const activeSrc = hovering && animatedSrc && !animatedFailed ? animatedSrc : posterSrc;

  return (
    <div
      className="simulation-preview"
      onMouseEnter={() => setHovering(true)}
      onMouseLeave={() => setHovering(false)}
    >
      {!posterFailed && activeSrc ? (
        <img
          src={activeSrc}
          alt=""
          loading="lazy"
          onError={() => {
            if (activeSrc === animatedSrc) {
              setAnimatedFailed(true);
              return;
            }
            setPosterFailed(true);
          }}
        />
      ) : (
        <div className="simulation-preview__fallback" aria-hidden="true">
          <span />
          <span />
          <span />
        </div>
      )}
    </div>
  );
}

function StagePill({ stage }) {
  return (
    <span className={`simulation-stage simulation-stage--${stage}`}>
      {stage.replace('-', ' ')}
    </span>
  );
}

export function SimulationCard({
  entry,
  adminApi,
  onStageChange,
  onIssueOpen,
}) {
  const isDaily = entry.stage === SIMULATION_STAGES.DAILY_ROTATION;
  const isCandidate = entry.stage === SIMULATION_STAGES.AUTOMATION_CANDIDATE;
  const nextPrimaryStage = isDaily ? SIMULATION_STAGES.COLLECTION : SIMULATION_STAGES.DAILY_ROTATION;
  const primaryLabel = isDaily ? 'Remove daily' : 'Set daily';

  async function handleStageChange(nextStage) {
    const nextEntry = await adminApi.changeStage(entry, nextStage);
    if (nextEntry) onStageChange(nextEntry);
  }

  return (
    <article className={`simulation-card simulation-card--${entry.stage}`}>
      <SimulationPreview entry={entry} />

      <div className="simulation-card__body">
        <div className="simulation-card__header">
          <div>
            <h2>{entry.name}</h2>
            <p>{entry.chapter}</p>
          </div>
          <StagePill stage={entry.stage} />
        </div>

        <p className="simulation-card__summary">{entry.summary}</p>

        <dl className="simulation-card__meta">
          <div>
            <dt>Surface</dt>
            <dd>{entry.surface}</dd>
          </div>
          <div>
            <dt>Origin</dt>
            <dd>{entry.origin}</dd>
          </div>
          <div>
            <dt>Date</dt>
            <dd>{entry.introducedOn || 'Untracked'}</dd>
          </div>
        </dl>

        <div className="simulation-card__actions">
          <a
            className="simulation-action simulation-action--primary"
            href={entry.launchPath}
            target="_blank"
            rel="noreferrer"
          >
            <i className="ti ti-external-link" aria-hidden="true" />
            <span>Open</span>
          </a>
          {entry.dailyHref ? (
            <a
              className="simulation-action"
              href={entry.dailyHref}
              target="_blank"
              rel="noreferrer"
            >
              <i className="ti ti-calendar-dot" aria-hidden="true" />
              <span>Daily view</span>
            </a>
          ) : null}
          <button type="button" className="simulation-action" onClick={() => onIssueOpen(entry)}>
            <i className="ti ti-flag" aria-hidden="true" />
            <span>Log</span>
          </button>
          {entry.stage !== SIMULATION_STAGES.HIDDEN ? (
            <button type="button" className="simulation-action" onClick={() => handleStageChange(nextPrimaryStage)}>
              <i className={isDaily ? 'ti ti-circle-minus' : 'ti ti-circle-plus'} aria-hidden="true" />
              <span>{primaryLabel}</span>
            </button>
          ) : null}
          {!isCandidate && !isDaily ? (
            <button type="button" className="simulation-action" onClick={() => handleStageChange(SIMULATION_STAGES.AUTOMATION_CANDIDATE)}>
              <i className="ti ti-sparkles" aria-hidden="true" />
              <span>Candidate</span>
            </button>
          ) : null}
        </div>
      </div>
    </article>
  );
}
