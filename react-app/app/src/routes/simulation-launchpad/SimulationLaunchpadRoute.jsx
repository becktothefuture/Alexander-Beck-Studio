/* eslint-disable react-refresh/only-export-components */
import { useCallback, useEffect, useMemo, useState } from 'react';
import { buildRouteHref } from '../../lib/routes.js';
import {
  SIMULATION_CATALOG,
  SIMULATION_CATALOG_UPDATED_AT,
  SIMULATION_STAGES,
  getDailySimulation,
} from '../../data/simulationCatalog.js';
import { IssuePanel } from './IssuePanel.jsx';
import { useSimulationAdminApi } from './useSimulationAdminApi.js';
import './simulation-launchpad.css';

const homeHref = buildRouteHref('home');

export const SIMULATION_LAUNCHPAD_ROUTE_RUNTIME = {};

const FILTERS = [
  { id: 'review', label: 'Review Queue' },
  { id: 'candidates', label: 'Candidates' },
  { id: 'daily', label: 'Daily Rotation' },
  { id: 'collection', label: 'Collection' },
  { id: 'issues', label: 'Issues' },
  { id: 'missing', label: 'Missing Assets' },
  { id: 'hidden', label: 'Hidden' },
  { id: 'all', label: 'All Simulations' },
];

const STAGE_LABELS = {
  [SIMULATION_STAGES.DAILY_ROTATION]: 'Daily Rotation',
  [SIMULATION_STAGES.COLLECTION]: 'Collection',
  [SIMULATION_STAGES.AUTOMATION_CANDIDATE]: 'Automation Candidate',
  [SIMULATION_STAGES.HIDDEN]: 'Hidden',
};

const STAGE_TO_FILTER = {
  [SIMULATION_STAGES.DAILY_ROTATION]: 'daily',
  [SIMULATION_STAGES.COLLECTION]: 'collection',
  [SIMULATION_STAGES.AUTOMATION_CANDIDATE]: 'candidates',
  [SIMULATION_STAGES.HIDDEN]: 'hidden',
};

const REVIEW_STATUS_PRIORITY = {
  candidate: 36,
  new: 30,
  watch: 22,
  stable: 8,
  internal: 4,
};

const REVIEW_ACTIONS = [
  { id: 'stable', label: 'Reviewed', icon: 'ti-check' },
  { id: 'watch', label: 'Watch', icon: 'ti-eye' },
  { id: 'candidate', label: 'Candidate', icon: 'ti-star' },
];

async function readDashboardStatus() {
  const response = await fetch('/api/simulations/status');
  return response.ok ? response.json() : null;
}

function getStatus(statusById, entry) {
  return statusById[entry.id] || {
    issueCount: 0,
    issues: [],
    activity: [],
    preview: { poster: null, animated: null },
    pitch: entry.pitchPath ? { path: entry.pitchPath, present: null } : null,
    validation: 'unknown',
    blockers: [],
  };
}

function getSimulationCounts(simulations) {
  return simulations.reduce((counts, item) => {
    counts.total += 1;
    counts[item.stage] = (counts[item.stage] || 0) + 1;
    if (item.issueCount > 0) counts.issues += 1;
    if (item.hasMissingAssets) counts.missing += 1;
    if (item.isReviewQueue) counts.review += 1;
    if (item.validation === 'passing') counts.passing += 1;
    return counts;
  }, {
    total: 0,
    issues: 0,
    missing: 0,
    passing: 0,
    review: 0,
  });
}

function buildSimulationViewModels(simulations, statusById, statusReady) {
  return simulations.map((entry) => {
    const status = getStatus(statusById, entry);
    const isHidden = entry.stage === SIMULATION_STAGES.HIDDEN;
    const missingPreview = statusReady && !isHidden && (
      status.preview?.poster === false || status.preview?.animated === false
    );
    const missingPitch = statusReady && !isHidden && status.pitch && status.pitch.present === false;
    const hasMissingAssets = Boolean(missingPreview || missingPitch || status.blockers?.length);
    const issueCount = status.issueCount || 0;
    const validation = status.validation || (statusReady ? 'passing' : 'unknown');
    const isReviewQueue = isHidden
      ? issueCount > 0
      : (
        entry.stage === SIMULATION_STAGES.AUTOMATION_CANDIDATE
        || ['candidate', 'watch', 'new'].includes(entry.reviewStatus)
        || issueCount > 0
        || hasMissingAssets
      );

    return {
      ...entry,
      status,
      issueCount,
      validation,
      hasMissingAssets,
      isReviewQueue,
    };
  });
}

function filterSimulations(simulations, activeFilter, query) {
  const needle = query.trim().toLowerCase();
  return simulations.filter((entry) => {
    const matchesFilter = (
      activeFilter === 'all'
      || (activeFilter === 'review' && entry.isReviewQueue)
      || (activeFilter === 'issues' && entry.issueCount > 0)
      || (activeFilter === 'missing' && entry.hasMissingAssets)
      || STAGE_TO_FILTER[entry.stage] === activeFilter
    );
    const matchesQuery = !needle
      || entry.name.toLowerCase().includes(needle)
      || entry.id.toLowerCase().includes(needle)
      || entry.chapter.toLowerCase().includes(needle)
      || entry.surface.toLowerCase().includes(needle)
      || entry.origin.toLowerCase().includes(needle);
    return matchesFilter && matchesQuery;
  });
}

function getFilterCount(filterId, counts) {
  if (filterId === 'all') return counts.total;
  if (filterId === 'review') return counts.review;
  if (filterId === 'issues') return counts.issues;
  if (filterId === 'missing') return counts.missing;

  const stage = Object.keys(STAGE_TO_FILTER).find((key) => STAGE_TO_FILTER[key] === filterId);
  return stage ? counts[stage] || 0 : 0;
}

function getReviewPriority(entry) {
  let priority = REVIEW_STATUS_PRIORITY[entry.reviewStatus] || 0;
  if (entry.stage === SIMULATION_STAGES.AUTOMATION_CANDIDATE) priority += 48;
  if (entry.issueCount > 0) priority += 42 + entry.issueCount;
  if (entry.hasMissingAssets) priority += 36;
  if (entry.stage === SIMULATION_STAGES.HIDDEN) priority -= 80;
  return priority;
}

function sortSimulationsByPriority(simulations) {
  return [...simulations].sort((a, b) => {
    const priorityDiff = getReviewPriority(b) - getReviewPriority(a);
    if (priorityDiff !== 0) return priorityDiff;
    return a.name.localeCompare(b.name);
  });
}

function formatDate(value) {
  if (!value) return 'Untracked';
  return value;
}

function StatusPill({ kind, children }) {
  return (
    <span className={`simulation-dashboard-pill simulation-dashboard-pill--${kind}`}>
      {children}
    </span>
  );
}

function DashboardButton({
  className = '',
  disabled = false,
  icon,
  label,
  title,
  type = 'button',
  onClick,
}) {
  return (
    <button
      className={`simulation-dashboard-button ${className}`.trim()}
      type={type}
      title={title || label}
      aria-label={title || label}
      disabled={disabled}
      onClick={onClick}
    >
      <i className={`ti ${icon}`} aria-hidden="true" />
      <span>{label}</span>
    </button>
  );
}

function DashboardIconButton({
  as: Component = 'button',
  className = '',
  disabled = false,
  href,
  icon,
  label,
  onClick,
  target,
  rel,
}) {
  const props = Component === 'a'
    ? { href, target, rel }
    : { type: 'button', disabled };

  return (
    <Component
      {...props}
      className={`simulation-dashboard-icon-button ${className}`.trim()}
      title={label}
      aria-label={label}
      onClick={onClick}
    >
      <i className={`ti ${icon}`} aria-hidden="true" />
    </Component>
  );
}

function DashboardThumbnail({ entry }) {
  const [hovering, setHovering] = useState(false);
  const [animatedFailed, setAnimatedFailed] = useState(false);
  const [posterFailed, setPosterFailed] = useState(false);
  const animatedSrc = entry.preview?.animated;
  const posterSrc = entry.preview?.poster;
  const src = hovering && animatedSrc && !animatedFailed ? animatedSrc : posterSrc;

  return (
    <div
      className="simulation-dashboard-thumb"
      onMouseEnter={() => setHovering(true)}
      onMouseLeave={() => setHovering(false)}
    >
      {!posterFailed && src ? (
        <img
          src={src}
          alt=""
          loading="lazy"
          onError={() => {
            if (src === animatedSrc) {
              setAnimatedFailed(true);
              return;
            }
            setPosterFailed(true);
          }}
        />
      ) : (
        <span aria-hidden="true" />
      )}
      {animatedSrc ? <em>GIF</em> : null}
    </div>
  );
}

function HeaderActions({ onValidate, pendingAction }) {
  return (
    <div className="simulation-dashboard-header__actions">
      <a className="simulation-dashboard-button simulation-dashboard-button--ghost" href={homeHref} title="Open live site">
        <i className="ti ti-arrow-left" aria-hidden="true" />
        <span>Site</span>
      </a>
      <DashboardButton
        className="simulation-dashboard-button--primary"
        disabled={Boolean(pendingAction)}
        icon="ti-check"
        label={pendingAction === 'validate' ? 'Running' : 'Validate'}
        title="Run simulation catalog validation"
        onClick={onValidate}
      />
    </div>
  );
}

function SummaryStrip({ counts, todaySimulation, statusReady }) {
  const validationPercent = counts.total ? Math.round((counts.passing / counts.total) * 100) : 0;
  const summary = [
    { label: 'Total Simulations', value: counts.total, detail: 'Catalog entries' },
    { label: 'Daily Rotation', value: counts[SIMULATION_STAGES.DAILY_ROTATION] || 0, detail: todaySimulation?.name || 'No daily mode' },
    { label: 'Candidates', value: counts[SIMULATION_STAGES.AUTOMATION_CANDIDATE] || 0, detail: 'Awaiting review' },
    { label: 'With Issues', value: counts.issues, detail: 'Logged notes' },
    { label: 'Missing Assets', value: counts.missing, detail: statusReady ? 'Preview or pitch' : 'Status unavailable' },
    { label: 'Validation', value: statusReady ? `${validationPercent}%` : 'Local', detail: statusReady ? 'Passing' : 'Catalog only' },
  ];

  return (
    <section className="simulation-dashboard-summary" aria-label="Simulation status summary">
      {summary.map((item) => (
        <div key={item.label} className="simulation-dashboard-summary__item">
          <span>{item.label}</span>
          <strong>{item.value}</strong>
          <p>{item.detail}</p>
        </div>
      ))}
    </section>
  );
}

function FilterRail({ activeFilter, counts, onFilterChange, query, onQueryChange }) {
  return (
    <aside className="simulation-dashboard-rail" aria-label="Simulation filters">
      <div className="simulation-dashboard-search">
        <i className="ti ti-search" aria-hidden="true" />
        <label>
          <span className="simulation-dashboard-sr">Search simulations</span>
          <input
            value={query}
            onChange={(event) => onQueryChange(event.target.value)}
            placeholder="Search simulations..."
          />
        </label>
      </div>

      <nav className="simulation-dashboard-filter-list" aria-label="Queues">
        <p>Queues</p>
        {FILTERS.map((filter) => {
          const count = getFilterCount(filter.id, counts);
          return (
            <button
              key={filter.id}
              type="button"
              className={activeFilter === filter.id ? 'is-active' : ''}
              onClick={() => onFilterChange(filter.id)}
            >
              <span>{filter.label}</span>
              <strong>{count}</strong>
            </button>
          );
        })}
      </nav>
    </aside>
  );
}

function SimulationTable({
  simulations,
  selectedId,
  onSelect,
  onCapture,
  onIssueOpen,
  pendingAction,
}) {
  return (
    <section className="simulation-dashboard-table-panel" aria-label="Simulation management table">
      <div className="simulation-dashboard-table-panel__bar">
        <div>
          <strong>{simulations.length} results</strong>
          <span>Sorted by review priority</span>
        </div>
      </div>

      <div className="simulation-dashboard-table-wrap">
        <table className="simulation-dashboard-table">
          <thead>
            <tr>
              <th>Preview</th>
              <th>Simulation</th>
              <th>Stage</th>
              <th>Review</th>
              <th>Issues</th>
              <th>Validation</th>
              <th>Updated</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {simulations.map((entry) => (
              <tr
                key={entry.id}
                className={selectedId === entry.id ? 'is-selected' : ''}
                onClick={() => onSelect(entry.id)}
              >
                <td><DashboardThumbnail entry={entry} /></td>
                <td>
                  <button type="button" className="simulation-dashboard-row-title" onClick={() => onSelect(entry.id)}>
                    <strong>{entry.name}</strong>
                    <span>ID: {entry.id}</span>
                  </button>
                </td>
                <td><StatusPill kind={entry.stage}>{STAGE_LABELS[entry.stage] || entry.stage}</StatusPill></td>
                <td><StatusPill kind={entry.reviewStatus || 'unknown'}>{entry.reviewStatus || 'Unknown'}</StatusPill></td>
                <td className={entry.issueCount > 0 ? 'has-issues' : ''}>{entry.issueCount}</td>
                <td><StatusPill kind={entry.validation}>{entry.validation}</StatusPill></td>
                <td>{formatDate(entry.lastReviewedAt || entry.introducedOn)}</td>
                <td>
                  <div className="simulation-dashboard-row-actions">
                    <DashboardIconButton
                      disabled={Boolean(pendingAction)}
                      icon="ti-camera"
                      label={`Capture preview for ${entry.name}`}
                      onClick={(event) => { event.stopPropagation(); onCapture(entry); }}
                    />
                    <DashboardIconButton
                      icon="ti-message-circle"
                      label={`Log issue for ${entry.name}`}
                      onClick={(event) => { event.stopPropagation(); onIssueOpen(entry); }}
                    />
                    <DashboardIconButton
                      as="a"
                      href={entry.launchPath}
                      target="_blank"
                      rel="noreferrer"
                      icon="ti-external-link"
                      label={`Open ${entry.name}`}
                      onClick={(event) => event.stopPropagation()}
                    />
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function DetailRow({ label, children }) {
  return (
    <div className="simulation-dashboard-detail-row">
      <dt>{label}</dt>
      <dd>{children}</dd>
    </div>
  );
}

function IssueList({ issues, onIssueStatusChange, pendingAction }) {
  if (!issues?.length) return null;

  return (
    <div className="simulation-dashboard-issues">
      <h3>Issues</h3>
      <ul>
        {issues.map((issue) => {
          const isOpen = !['resolved', 'closed'].includes(String(issue.status || '').toLowerCase());
          return (
            <li key={issue.fileName}>
              <div>
                <strong>{issue.title}</strong>
                <span>{issue.severity} · {issue.status}</span>
              </div>
              <DashboardIconButton
                disabled={Boolean(pendingAction)}
                icon={isOpen ? 'ti-check' : 'ti-rotate-clockwise'}
                label={isOpen ? `Resolve ${issue.title}` : `Reopen ${issue.title}`}
                onClick={() => onIssueStatusChange(issue, isOpen ? 'resolved' : 'open')}
              />
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function formatActivityLabel(event) {
  if (event.type === 'stage-change') return `Stage ${event.from} to ${event.to}`;
  if (event.type === 'review-status-change') return `Review ${event.from} to ${event.to}`;
  if (event.type === 'issue-created') return `Issue logged · ${event.title}`;
  if (event.type === 'issue-status-change') return `Issue ${event.status}`;
  return event.type || 'Activity';
}

function ActivityList({ activity }) {
  if (!activity?.length) return null;

  return (
    <div className="simulation-dashboard-activity">
      <h3>Activity</h3>
      <ol>
        {activity.slice(0, 5).map((event) => (
          <li key={`${event.at}-${event.type}-${event.issue || event.to || ''}`}>
            <span>{formatActivityLabel(event)}</span>
            <time dateTime={event.at}>{formatDate(event.at?.slice(0, 10))}</time>
          </li>
        ))}
      </ol>
    </div>
  );
}

function DetailDrawer({
  entry,
  adminApi,
  onCapture,
  onIssueStatusChange,
  onStageChange,
  onIssueOpen,
  pendingAction,
}) {
  if (!entry) {
    return (
      <aside className="simulation-dashboard-drawer" aria-label="Simulation details">
        <p className="simulation-dashboard-empty">Select a simulation to inspect it.</p>
      </aside>
    );
  }

  async function changeStage(stage) {
    const needsConfirmation = [
      SIMULATION_STAGES.DAILY_ROTATION,
      SIMULATION_STAGES.HIDDEN,
    ].includes(stage) && entry.stage !== stage;
    if (needsConfirmation && !window.confirm(`Move ${entry.name} to ${STAGE_LABELS[stage] || stage}?`)) {
      return;
    }
    const nextEntry = await adminApi.changeStage(entry, stage);
    if (nextEntry) onStageChange(nextEntry);
  }

  async function changeReviewStatus(reviewStatus) {
    const nextEntry = await adminApi.changeReviewStatus(entry, reviewStatus);
    if (nextEntry) onStageChange(nextEntry);
  }

  return (
    <aside className="simulation-dashboard-drawer" aria-label={`${entry.name} details`}>
      <div className="simulation-dashboard-drawer__header">
        <div>
          <h2>{entry.id}</h2>
          <p>{entry.name}</p>
        </div>
        <a href={entry.launchPath} target="_blank" rel="noreferrer" aria-label={`Open ${entry.name}`}>
          <i className="ti ti-external-link" aria-hidden="true" />
        </a>
      </div>

      <DashboardThumbnail entry={entry} />

      <div className="simulation-dashboard-drawer__links">
        <a className="simulation-dashboard-button simulation-dashboard-button--ghost" href={entry.launchPath} target="_blank" rel="noreferrer" title={`Open ${entry.name}`}>
          <i className="ti ti-external-link" aria-hidden="true" />
          <span>Open</span>
        </a>
        {entry.dailyHref ? (
          <a className="simulation-dashboard-button simulation-dashboard-button--ghost" href={entry.dailyHref} target="_blank" rel="noreferrer" title={`Open daily route for ${entry.name}`}>
            <i className="ti ti-calendar" aria-hidden="true" />
            <span>Daily</span>
          </a>
        ) : null}
        <DashboardButton
          className="simulation-dashboard-button--ghost"
          disabled={Boolean(pendingAction)}
          icon="ti-camera"
          label={pendingAction === `capture-${entry.id}` ? 'Capturing' : 'Capture'}
          title={`Capture preview for ${entry.name}`}
          onClick={() => onCapture(entry)}
        />
      </div>

      <dl className="simulation-dashboard-detail-list">
        <DetailRow label="Stage"><StatusPill kind={entry.stage}>{STAGE_LABELS[entry.stage] || entry.stage}</StatusPill></DetailRow>
        <DetailRow label="Review Status"><StatusPill kind={entry.reviewStatus || 'unknown'}>{entry.reviewStatus || 'Unknown'}</StatusPill></DetailRow>
        <DetailRow label="Surface">{entry.surface}</DetailRow>
        <DetailRow label="Origin">{entry.origin}</DetailRow>
        <DetailRow label="Date">{formatDate(entry.lastReviewedAt || entry.introducedOn)}</DetailRow>
        <DetailRow label="Issues"><span className={entry.issueCount > 0 ? 'has-issues' : ''}>{entry.issueCount} open</span></DetailRow>
        <DetailRow label="Validation">
          <StatusPill kind={entry.validation}>{entry.validation}</StatusPill>
        </DetailRow>
        <DetailRow label="Preview">{entry.status.preview?.poster === false ? 'Missing poster' : 'Present'}</DetailRow>
        <DetailRow label="Pitch">{entry.pitchPath ? (entry.status.pitch?.present === false ? 'Missing' : entry.pitchPath) : 'n/a'}</DetailRow>
        <DetailRow label="Config">{entry.configPath || 'n/a'}</DetailRow>
      </dl>

      <div className="simulation-dashboard-drawer__description">
        <h3>Description</h3>
        <p>{entry.summary}</p>
      </div>

      {entry.status.blockers?.length ? (
        <div className="simulation-dashboard-blockers">
          <h3>Blockers</h3>
          <ul>
            {entry.status.blockers.map((blocker) => <li key={blocker}>{blocker}</li>)}
          </ul>
        </div>
      ) : null}

      <IssueList
        issues={entry.status.issues}
        onIssueStatusChange={onIssueStatusChange}
        pendingAction={pendingAction}
      />

      <ActivityList activity={entry.status.activity} />

      <div className="simulation-dashboard-review-actions" aria-label="Review status controls">
        <h3>Review</h3>
        <div>
          {REVIEW_ACTIONS.map((action) => (
            <DashboardButton
              key={action.id}
              className={entry.reviewStatus === action.id ? 'is-active' : ''}
              disabled={Boolean(pendingAction)}
              icon={action.icon}
              label={action.label}
              title={`Set review status to ${action.label}`}
              onClick={() => changeReviewStatus(action.id)}
            />
          ))}
        </div>
      </div>

      <div className="simulation-dashboard-drawer__actions">
        {entry.stage !== SIMULATION_STAGES.DAILY_ROTATION ? (
          <DashboardButton
            className="simulation-dashboard-button--promote"
            disabled={Boolean(pendingAction)}
            icon="ti-arrow-up"
            label="Promote to Daily"
            onClick={() => changeStage(SIMULATION_STAGES.DAILY_ROTATION)}
          />
        ) : null}
        {entry.stage !== SIMULATION_STAGES.COLLECTION ? (
          <DashboardButton
            className="simulation-dashboard-button--ghost"
            disabled={Boolean(pendingAction)}
            icon="ti-folder"
            label="Move to Collection"
            onClick={() => changeStage(SIMULATION_STAGES.COLLECTION)}
          />
        ) : null}
        {entry.stage !== SIMULATION_STAGES.AUTOMATION_CANDIDATE && entry.stage !== SIMULATION_STAGES.DAILY_ROTATION ? (
          <DashboardButton
            className="simulation-dashboard-button--ghost"
            disabled={Boolean(pendingAction)}
            icon="ti-star"
            label="Mark Candidate"
            onClick={() => changeStage(SIMULATION_STAGES.AUTOMATION_CANDIDATE)}
          />
        ) : null}
        <DashboardButton
          className="simulation-dashboard-button--danger"
          disabled={Boolean(pendingAction)}
          icon="ti-archive"
          label="Hide"
          onClick={() => changeStage(SIMULATION_STAGES.HIDDEN)}
        />
        <DashboardButton
          className="simulation-dashboard-button--primary"
          disabled={Boolean(pendingAction)}
          icon="ti-message-circle"
          label="Log Issue"
          onClick={() => onIssueOpen(entry)}
        />
      </div>
    </aside>
  );
}

function SimulationDashboard() {
  const [simulations, setSimulations] = useState(SIMULATION_CATALOG);
  const [statusById, setStatusById] = useState({});
  const [statusReady, setStatusReady] = useState(false);
  const [activeFilter, setActiveFilter] = useState('review');
  const [query, setQuery] = useState('');
  const [selectedId, setSelectedId] = useState('');
  const [issueEntry, setIssueEntry] = useState(null);
  const [message, setMessage] = useState('');
  const [pendingAction, setPendingAction] = useState('');
  const adminApi = useSimulationAdminApi(setMessage);

  const refreshStatus = useCallback(async () => {
    const payload = await readDashboardStatus().catch(() => null);
    if (payload?.ok && payload.simulations) {
      setStatusById(payload.simulations);
      setStatusReady(true);
      return true;
    }
    setStatusReady(false);
    return false;
  }, []);

  useEffect(() => {
    let cancelled = false;
    readDashboardStatus()
      .then((payload) => {
        if (!cancelled && payload?.ok && payload.simulations) {
          setStatusById(payload.simulations);
          setStatusReady(true);
        }
      })
      .catch(() => {
        if (!cancelled) setStatusReady(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const viewModels = useMemo(
    () => buildSimulationViewModels(simulations, statusById, statusReady),
    [simulations, statusById, statusReady],
  );
  const counts = getSimulationCounts(viewModels);
  const todaySimulation = getDailySimulation(new Date(), simulations);
  const filteredSimulations = useMemo(
    () => sortSimulationsByPriority(filterSimulations(viewModels, activeFilter, query)),
    [viewModels, activeFilter, query],
  );
  const selectedEntry = filteredSimulations.find((entry) => entry.id === selectedId)
    || filteredSimulations[0]
    || viewModels[0]
    || null;

  function handleStageChange(nextEntry) {
    if (!nextEntry?.id) return;
    setSimulations((current) => current.map((entry) => (
      entry.id === nextEntry.id ? { ...entry, ...nextEntry } : entry
    )));
    setSelectedId(nextEntry.id);
  }

  async function runDashboardAction(key, action) {
    if (pendingAction) return false;
    setPendingAction(key);
    try {
      return await action();
    } finally {
      setPendingAction('');
    }
  }

  async function handleValidate() {
    await runDashboardAction('validate', async () => {
      const ok = await adminApi.validateCatalog();
      await refreshStatus();
      return ok;
    });
  }

  async function handleCapture(entry) {
    if (!entry) return;
    await runDashboardAction(`capture-${entry.id}`, async () => {
      const ok = await adminApi.capturePreview(entry);
      await refreshStatus();
      return ok;
    });
  }

  async function handleIssueSaved() {
    setIssueEntry(null);
    await refreshStatus();
  }

  async function handleIssueStatusChange(issue, status) {
    await runDashboardAction(`issue-${issue.fileName}`, async () => {
      const ok = await adminApi.updateIssueStatus(issue, status);
      await refreshStatus();
      return ok;
    });
  }

  return (
    <main className="simulation-dashboard" aria-label="Simulation operations dashboard">
      <header className="simulation-dashboard-header">
        <div className="simulation-dashboard-header__title">
          <span>Local</span>
          <h1>Simulation Operations</h1>
          <p>Catalog updated {SIMULATION_CATALOG_UPDATED_AT}</p>
        </div>
        <div className="simulation-dashboard-header__status">
          <span>{statusReady ? 'Local status connected' : 'Catalog-only mode'}</span>
          <i aria-hidden="true" />
        </div>
        <HeaderActions onValidate={handleValidate} pendingAction={pendingAction} />
      </header>

      <SummaryStrip counts={counts} todaySimulation={todaySimulation} statusReady={statusReady} />

      {message ? <div className="simulation-dashboard-message" role="status">{message}</div> : null}

      <div className="simulation-dashboard-layout">
        <FilterRail
          activeFilter={activeFilter}
          counts={counts}
          onFilterChange={setActiveFilter}
          query={query}
          onQueryChange={setQuery}
        />
        <SimulationTable
          simulations={filteredSimulations}
          selectedId={selectedEntry?.id}
          onSelect={setSelectedId}
          onCapture={handleCapture}
          onIssueOpen={setIssueEntry}
          pendingAction={pendingAction}
        />
        <DetailDrawer
          entry={selectedEntry}
          adminApi={adminApi}
          onCapture={handleCapture}
          onIssueStatusChange={handleIssueStatusChange}
          onStageChange={handleStageChange}
          onIssueOpen={setIssueEntry}
          pendingAction={pendingAction}
        />
      </div>

      <IssuePanel
        entry={issueEntry}
        adminApi={adminApi}
        onSaved={handleIssueSaved}
        onClose={() => setIssueEntry(null)}
      />
    </main>
  );
}

export function getSimulationLaunchpadRouteView() {
  return {
    layout: 'standalone',
    htmlClassName: 'simulation-dashboard-document',
    bodyClass: 'body simulation-dashboard-page',
    mainContent: <SimulationDashboard />,
  };
}
