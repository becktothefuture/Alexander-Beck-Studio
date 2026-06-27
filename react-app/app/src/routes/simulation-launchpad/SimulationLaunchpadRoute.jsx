/* eslint-disable react-refresh/only-export-components */
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Archive,
  ArrowLeft,
  Box,
  CalendarDays,
  Check,
  ChevronDown,
  Clipboard,
  ExternalLink,
  Eye,
  Folder,
  LoaderCircle,
  MessageCircle,
  PackageCheck,
  RotateCcw,
  Search,
  ShieldAlert,
  Sparkles,
  Star,
  Trash2,
  X,
} from 'lucide-react';
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
  {
    id: 'review',
    label: 'Review',
    description: 'Step 1: candidates, issues, and blockers that need a decision.',
  },
  {
    id: 'collection',
    label: 'Collection',
    description: 'Step 2: approved simulations kept available but outside the live daily rotation.',
  },
  {
    id: 'daily',
    label: 'Daily',
    description: 'Step 3: simulations promoted to the live daily rotation.',
  },
  {
    id: 'hidden',
    label: 'Archive',
    description: 'Step 4: retired simulations kept in the repo but out of normal management.',
  },
];

const STAGE_LABELS = {
  [SIMULATION_STAGES.DAILY_ROTATION]: 'Daily Rotation',
  [SIMULATION_STAGES.COLLECTION]: 'Collection',
  [SIMULATION_STAGES.AUTOMATION_CANDIDATE]: 'Automation Candidate',
  [SIMULATION_STAGES.HIDDEN]: 'Archive',
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
  { id: 'stable', label: 'Reviewed', icon: Check },
  { id: 'watch', label: 'Watch', icon: Eye },
  { id: 'candidate', label: 'Candidate', icon: Star },
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
    const isArchived = entry.stage === SIMULATION_STAGES.HIDDEN;
    const missingPreview = statusReady && !isArchived && (
      status.preview?.poster === false || status.preview?.animated === false
    );
    const missingPitch = statusReady && !isArchived && status.pitch && status.pitch.present === false;
    const hasMissingAssets = Boolean(missingPreview || missingPitch || status.blockers?.length);
    const issueCount = status.issueCount || 0;
    const validation = status.validation || (statusReady ? 'passing' : 'unknown');
    const isReviewQueue = !isArchived && (
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
      (activeFilter === 'review' && entry.isReviewQueue)
      || STAGE_TO_FILTER[entry.stage] === activeFilter
    );
    const matchesQuery = !needle
      || String(entry.name || '').toLowerCase().includes(needle)
      || String(entry.id || '').toLowerCase().includes(needle)
      || String(entry.chapter || '').toLowerCase().includes(needle)
      || String(entry.surface || '').toLowerCase().includes(needle)
      || String(entry.origin || '').toLowerCase().includes(needle);
    return matchesFilter && matchesQuery;
  });
}

function getFilterCount(filterId, counts) {
  if (filterId === 'review') return counts.review;

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

function getTooltipClassName(placement) {
  return placement ? ` simulation-dashboard-tooltip--${placement}` : '';
}

function DashboardButton({
  className = '',
  disabled = false,
  icon: Icon,
  label,
  tooltip,
  tooltipPlacement,
  title,
  type = 'button',
  onClick,
}) {
  return (
    <button
      className={`simulation-dashboard-button ${className}${getTooltipClassName(tooltipPlacement)}`.trim()}
      type={type}
      data-tooltip={tooltip || title || label}
      aria-label={title || label}
      disabled={disabled}
      onClick={onClick}
    >
      {Icon ? <Icon aria-hidden="true" size={16} strokeWidth={2} /> : null}
      <span>{label}</span>
    </button>
  );
}

function DashboardIconButton({
  as: Component = 'button',
  className = '',
  disabled = false,
  href,
  icon: Icon,
  label,
  onClick,
  target,
  tooltipPlacement = 'above-end',
  rel,
}) {
  const props = Component === 'a'
    ? { href, target, rel }
    : { type: 'button', disabled };
  const iconNode = Icon ? <Icon aria-hidden="true" size={16} strokeWidth={2} /> : null;

  return (
    <Component
      {...props}
      className={`simulation-dashboard-icon-button ${className}${getTooltipClassName(tooltipPlacement)}`.trim()}
      data-tooltip={label}
      aria-label={label}
      onClick={onClick}
    >
      {iconNode}
    </Component>
  );
}

function DashboardThumbnail({ entry, playAnimated = false, size = 'compact' }) {
  const [hovering, setHovering] = useState(false);
  const [animatedFailed, setAnimatedFailed] = useState(false);
  const [posterFailed, setPosterFailed] = useState(false);
  const animatedSrc = entry.preview?.animated;
  const posterSrc = entry.preview?.poster;
  const shouldPlayAnimated = playAnimated || hovering;
  const src = shouldPlayAnimated && animatedSrc && !animatedFailed ? animatedSrc : posterSrc;

  return (
    <div
      className={`simulation-dashboard-thumb simulation-dashboard-thumb--${size}`}
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

function HeaderActions({ onBuild, onValidate, pendingAction }) {
  return (
    <div className="simulation-dashboard-header__actions">
      <a
        className="simulation-dashboard-button simulation-dashboard-button--ghost simulation-dashboard-tooltip--below-end"
        href={homeHref}
        data-tooltip="Return to the current development site"
        aria-label="Open development site"
      >
        <ArrowLeft aria-hidden="true" size={16} strokeWidth={2} />
        <span>Dev Site</span>
      </a>
      <DashboardButton
        className="simulation-dashboard-button--ghost"
        disabled={Boolean(pendingAction)}
        icon={PackageCheck}
        label={pendingAction === 'build' ? 'Building' : 'Build'}
        tooltip="Run production build"
        tooltipPlacement="below-end"
        onClick={onBuild}
      />
      <DashboardButton
        className="simulation-dashboard-button--primary"
        disabled={Boolean(pendingAction)}
        icon={Check}
        label={pendingAction === 'validate' ? 'Running' : 'Validate'}
        tooltip="Run simulation catalog validation"
        tooltipPlacement="below-end"
        onClick={onValidate}
      />
    </div>
  );
}

function getPendingActionLabel(pendingAction) {
  if (!pendingAction) return '';
  if (pendingAction === 'validate') return 'Running catalog validation';
  if (pendingAction === 'build') return 'Updating production build';
  if (pendingAction.startsWith('issue-')) return 'Updating issue status';
  if (pendingAction.startsWith('delete-plan-')) return 'Preparing delete plan';
  if (pendingAction.startsWith('delete-')) return 'Deleting simulation';
  return 'Working';
}

function InlineNotice({ notice, pendingAction }) {
  const runningLabel = getPendingActionLabel(pendingAction);
  const title = runningLabel || notice?.title;
  if (!title && !notice?.detail) return null;

  const tone = pendingAction ? 'running' : notice?.tone || 'info';
  const detail = pendingAction
    ? 'Running against the local dev API.'
    : notice?.detail;
  const Icon = pendingAction ? LoaderCircle : Check;

  return (
    <div className={`simulation-dashboard-inline-notice simulation-dashboard-inline-notice--${tone}`} role="status">
      <Icon className={pendingAction ? 'is-spinning' : ''} aria-hidden="true" size={14} strokeWidth={2} />
      <div>
        <strong>{title}</strong>
        {detail ? <span>{detail}</span> : null}
      </div>
    </div>
  );
}

function SummaryStrip({ counts, todaySimulation, statusReady }) {
  const validationPercent = counts.total ? Math.round((counts.passing / counts.total) * 100) : 0;
  const summary = [
    { label: 'Total', value: counts.total, detail: 'catalog' },
    { label: 'Daily', value: counts[SIMULATION_STAGES.DAILY_ROTATION] || 0, detail: todaySimulation?.name || 'none' },
    { label: 'Candidates', value: counts[SIMULATION_STAGES.AUTOMATION_CANDIDATE] || 0, detail: 'review' },
    { label: 'Issues', value: counts.issues, detail: 'open' },
    { label: 'Missing', value: counts.missing, detail: statusReady ? 'assets' : 'status off' },
    { label: 'Validation', value: statusReady ? `${validationPercent}%` : 'Local', detail: statusReady ? 'passing' : 'catalog' },
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

function getFilterTooltipPlacement(index) {
  if (index < 2) return 'below-start';
  if (index > FILTERS.length - 3) return 'below-end';
  return 'below';
}

function FilterToolbar({ activeFilter, counts, onFilterChange, query, onQueryChange }) {
  return (
    <section className="simulation-dashboard-toolbar" aria-label="Simulation filters">
      <div className="simulation-dashboard-search">
        <Search aria-hidden="true" size={16} strokeWidth={2} />
        <label>
          <span className="simulation-dashboard-sr">Search simulations</span>
          <input
            value={query}
            onChange={(event) => onQueryChange(event.target.value)}
            placeholder="Search by name, id, source, or status"
          />
        </label>
      </div>

      <nav className="simulation-dashboard-filter-list" aria-label="Queues">
        {FILTERS.map((filter, index) => {
          const count = getFilterCount(filter.id, counts);
          const tooltipPlacement = getFilterTooltipPlacement(index);
          return (
            <button
              key={filter.id}
              type="button"
              className={`${activeFilter === filter.id ? 'is-active ' : ''}simulation-dashboard-tooltip--${tooltipPlacement}`.trim()}
              data-tooltip={`${filter.description} ${count} simulations.`}
              onClick={() => onFilterChange(filter.id)}
            >
              <span>{filter.label}</span>
              <strong>{count}</strong>
            </button>
          );
        })}
      </nav>
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
    <section className="simulation-dashboard-section simulation-dashboard-issues">
      <h3>Issues</h3>
      <ul>
        {issues.map((issue) => {
          const isOpen = !['resolved', 'closed'].includes(String(issue.status || '').toLowerCase());
          return (
            <li key={issue.fileName}>
              <div>
                <strong>{issue.title}</strong>
                <span>{issue.severity} · {issue.status} · {formatDate(issue.reportedAt?.slice(0, 10))}</span>
                <small>{issue.relativePath}</small>
              </div>
              <DashboardIconButton
                disabled={Boolean(pendingAction)}
                icon={isOpen ? Check : RotateCcw}
                label={isOpen ? `Resolve issue: ${issue.title}` : `Reopen issue: ${issue.title}`}
                onClick={() => onIssueStatusChange(issue, isOpen ? 'resolved' : 'open')}
              />
            </li>
          );
        })}
      </ul>
    </section>
  );
}

function formatActivityLabel(event) {
  if (event.type === 'stage-change') return `Stage ${event.from} to ${event.to}`;
  if (event.type === 'review-status-change') return `Review ${event.from} to ${event.to}`;
  if (event.type === 'issue-created') return `Issue logged · ${event.title}`;
  if (event.type === 'issue-status-change') return `Issue ${event.status}`;
  return event.type || 'Activity';
}

function formatActivityDetail(event) {
  const parts = [];
  if (event.issue) parts.push(event.issue);
  if (event.severity) parts.push(`severity ${event.severity}`);
  if (event.status) parts.push(`status ${event.status}`);
  return parts.join(' · ');
}

function ActivityList({ activity }) {
  if (!activity?.length) return null;

  return (
    <section className="simulation-dashboard-section simulation-dashboard-activity">
      <h3>Activity Log <span>{activity.length}</span></h3>
      <ol>
        {activity.map((event, index) => {
          const detail = formatActivityDetail(event);
          return (
            <li key={`${event.at}-${event.type}-${event.issue || event.to || index}`}>
              <div>
                <span>{formatActivityLabel(event)}</span>
                {detail ? <small>{detail}</small> : null}
              </div>
              <time dateTime={event.at}>{formatDate(event.at?.slice(0, 10))}</time>
            </li>
          );
        })}
      </ol>
    </section>
  );
}

function ExpandedSimulationDetails({
  activeFilter,
  adminApi,
  entry,
  onDelete,
  onIssueOpen,
  onIssueStatusChange,
  onStageChange,
  pendingAction,
}) {
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

  const isDaily = entry.stage === SIMULATION_STAGES.DAILY_ROTATION;
  const archiveActionVisible = activeFilter !== 'review' && entry.stage !== SIMULATION_STAGES.HIDDEN;

  return (
    <div className="simulation-dashboard-expanded" id={`simulation-details-${entry.id}`}>
      <div className="simulation-dashboard-expanded__preview">
        <DashboardThumbnail entry={entry} playAnimated size="large" />
        <div className="simulation-dashboard-expanded__links">
          <a
            className="simulation-dashboard-button simulation-dashboard-button--ghost simulation-dashboard-tooltip--below-start"
            href={entry.launchPath}
            target="_blank"
            rel="noreferrer"
            data-tooltip="Open in a new tab"
          >
            <ExternalLink aria-hidden="true" size={16} strokeWidth={2} />
            <span>Open</span>
          </a>
          {entry.dailyHref ? (
            <a
              className="simulation-dashboard-button simulation-dashboard-button--ghost simulation-dashboard-tooltip--below-start"
              href={entry.dailyHref}
              target="_blank"
              rel="noreferrer"
              data-tooltip="Open the daily-route version in a new tab"
            >
              <CalendarDays aria-hidden="true" size={16} strokeWidth={2} />
              <span>Daily</span>
            </a>
          ) : null}
        </div>
      </div>

      <div className="simulation-dashboard-expanded__main">
        <section className="simulation-dashboard-section">
          <h3>Overview</h3>
          <p>{entry.summary}</p>
          <dl className="simulation-dashboard-detail-list">
            <DetailRow label="Stage"><StatusPill kind={entry.stage}>{STAGE_LABELS[entry.stage] || entry.stage}</StatusPill></DetailRow>
            <DetailRow label="Review"><StatusPill kind={entry.reviewStatus || 'unknown'}>{entry.reviewStatus || 'Unknown'}</StatusPill></DetailRow>
            <DetailRow label="Surface">{entry.surface}</DetailRow>
            <DetailRow label="Origin">{entry.origin}</DetailRow>
            <DetailRow label="Date">{formatDate(entry.lastReviewedAt || entry.introducedOn)}</DetailRow>
            <DetailRow label="Issues"><span className={entry.issueCount > 0 ? 'has-issues' : ''}>{entry.issueCount} open</span></DetailRow>
            <DetailRow label="Validation"><StatusPill kind={entry.validation}>{entry.validation}</StatusPill></DetailRow>
            <DetailRow label="Pitch">{entry.pitchPath ? (entry.status.pitch?.present === false ? 'Missing' : entry.pitchPath) : 'n/a'}</DetailRow>
            <DetailRow label="Config">{entry.configPath || 'n/a'}</DetailRow>
            <DetailRow label="Capture">{entry.capture?.notes || 'Default preview capture timing.'}</DetailRow>
          </dl>
        </section>

        {entry.status.blockers?.length ? (
          <section className="simulation-dashboard-section simulation-dashboard-blockers">
            <h3>Blockers</h3>
            <ul>
              {entry.status.blockers.map((blocker) => <li key={blocker}>{blocker}</li>)}
            </ul>
          </section>
        ) : null}

        <IssueList
          issues={entry.status.issues}
          onIssueStatusChange={onIssueStatusChange}
          pendingAction={pendingAction}
        />

        <ActivityList activity={entry.status.activity} />
      </div>

      <div className="simulation-dashboard-expanded__controls">
        <section className="simulation-dashboard-section simulation-dashboard-review-actions" aria-label="Review status controls">
          <h3>Review</h3>
          <div>
            {REVIEW_ACTIONS.map((action) => (
              <DashboardButton
                key={action.id}
                className={entry.reviewStatus === action.id ? 'is-active' : ''}
                disabled={Boolean(pendingAction)}
                icon={action.icon}
                label={action.label}
                tooltip={`Set review status to ${action.label}`}
                onClick={() => changeReviewStatus(action.id)}
              />
            ))}
          </div>
        </section>

        <section className="simulation-dashboard-section simulation-dashboard-stage-actions" aria-label="Stage controls">
          <h3>Stage</h3>
          <div>
            {entry.stage !== SIMULATION_STAGES.DAILY_ROTATION ? (
              <DashboardButton
                className="simulation-dashboard-button--promote"
                disabled={Boolean(pendingAction)}
                icon={Sparkles}
                label="Promote"
                tooltip="Promote to the live daily rotation"
                onClick={() => changeStage(SIMULATION_STAGES.DAILY_ROTATION)}
              />
            ) : null}
            {entry.stage !== SIMULATION_STAGES.COLLECTION ? (
              <DashboardButton
                className="simulation-dashboard-button--ghost"
                disabled={Boolean(pendingAction)}
                icon={Folder}
                label="Collection"
                tooltip="Move out of daily rotation but keep available for review"
                onClick={() => changeStage(SIMULATION_STAGES.COLLECTION)}
              />
            ) : null}
            {entry.stage !== SIMULATION_STAGES.AUTOMATION_CANDIDATE && !isDaily ? (
              <DashboardButton
                className="simulation-dashboard-button--ghost"
                disabled={Boolean(pendingAction)}
                icon={Star}
                label="Candidate"
                tooltip="Mark as an automation candidate for review"
                onClick={() => changeStage(SIMULATION_STAGES.AUTOMATION_CANDIDATE)}
              />
            ) : null}
            {archiveActionVisible ? (
              <DashboardButton
                className="simulation-dashboard-button--ghost"
                disabled={Boolean(pendingAction)}
                icon={Archive}
                label="Archive"
                tooltip="Keep code and assets, remove from normal review and collection work"
                onClick={() => changeStage(SIMULATION_STAGES.HIDDEN)}
              />
            ) : null}
          </div>
        </section>

        <section className="simulation-dashboard-section simulation-dashboard-danger-zone" aria-label="Destructive controls">
          <h3>Actions</h3>
          <div>
            <DashboardButton
              className="simulation-dashboard-button--primary"
              disabled={Boolean(pendingAction)}
              icon={MessageCircle}
              label="Log Issue"
              tooltip="Create a dated issue note for this simulation"
              onClick={() => onIssueOpen(entry)}
            />
            <DashboardButton
              className="simulation-dashboard-button--danger"
              disabled={Boolean(pendingAction) || isDaily}
              icon={Trash2}
              label="Delete"
              tooltip={isDaily ? 'Move to Collection before deleting.' : 'Delete repo-owned simulation files'}
              onClick={() => onDelete(entry)}
            />
          </div>
        </section>
      </div>
    </div>
  );
}

function SimulationListItem({
  activeFilter,
  adminApi,
  entry,
  expanded,
  onDelete,
  onIssueOpen,
  onIssueStatusChange,
  onStageChange,
  onToggle,
  pendingAction,
}) {
  return (
    <article className={`simulation-dashboard-list-item ${expanded ? 'is-expanded' : ''}`}>
      <div className="simulation-dashboard-list-row">
        <button
          type="button"
          className="simulation-dashboard-list-row__main"
          aria-expanded={expanded}
          aria-controls={`simulation-details-${entry.id}`}
          onClick={() => onToggle(entry.id)}
        >
          <DashboardThumbnail entry={entry} playAnimated={expanded} />
          <span className="simulation-dashboard-list-row__title">
            <strong>{entry.name}</strong>
            <span>{entry.id} · {entry.surface} · {entry.origin}</span>
          </span>
          <span className="simulation-dashboard-list-row__status">
            <StatusPill kind={entry.stage}>{STAGE_LABELS[entry.stage] || entry.stage}</StatusPill>
            <StatusPill kind={entry.validation}>{entry.validation}</StatusPill>
          </span>
          <span className="simulation-dashboard-list-row__meta">
            <span className={entry.issueCount > 0 ? 'has-issues' : ''}>{entry.issueCount} issues</span>
            <span>{formatDate(entry.lastReviewedAt || entry.introducedOn)}</span>
          </span>
          <span className="simulation-dashboard-list-row__toggle">
            <ChevronDown aria-hidden="true" size={16} strokeWidth={2} />
            <span>{expanded ? 'Close' : 'Open'}</span>
          </span>
        </button>
        <div className="simulation-dashboard-row-actions" aria-label={`${entry.name} quick actions`}>
          <DashboardIconButton
            icon={MessageCircle}
            label="Log issue"
            tooltipPlacement="above-end"
            onClick={(event) => { event.stopPropagation(); onIssueOpen(entry); }}
          />
          <DashboardIconButton
            as="a"
            href={entry.launchPath}
            target="_blank"
            rel="noreferrer"
            icon={ExternalLink}
            label="Open in a new tab"
            tooltipPlacement="above-end"
            onClick={(event) => event.stopPropagation()}
          />
        </div>
      </div>

      {expanded ? (
        <ExpandedSimulationDetails
          activeFilter={activeFilter}
          adminApi={adminApi}
          entry={entry}
          onDelete={onDelete}
          onIssueOpen={onIssueOpen}
          onIssueStatusChange={onIssueStatusChange}
          onStageChange={onStageChange}
          pendingAction={pendingAction}
        />
      ) : null}
    </article>
  );
}

function SimulationList({
  activeFilter,
  adminApi,
  expandedId,
  notice,
  simulations,
  onDelete,
  onIssueOpen,
  onIssueStatusChange,
  onStageChange,
  onToggle,
  pendingAction,
}) {
  return (
    <section className="simulation-dashboard-list-panel" aria-label="Simulation management list">
      <div className="simulation-dashboard-list-panel__bar">
        <div>
          <strong>{simulations.length} results</strong>
          <span>Sorted by review priority</span>
        </div>
        <InlineNotice notice={notice} pendingAction={pendingAction} />
      </div>

      {simulations.length ? (
        <div className="simulation-dashboard-list">
          {simulations.map((entry) => (
            <SimulationListItem
              key={entry.id}
              activeFilter={activeFilter}
              adminApi={adminApi}
              entry={entry}
              expanded={expandedId === entry.id}
              onDelete={onDelete}
              onIssueOpen={onIssueOpen}
              onIssueStatusChange={onIssueStatusChange}
              onStageChange={onStageChange}
              onToggle={onToggle}
              pendingAction={pendingAction}
            />
          ))}
        </div>
      ) : (
        <p className="simulation-dashboard-empty">No simulations match this view.</p>
      )}
    </section>
  );
}

function DeleteConfirmationModal({
  confirmValue,
  entry,
  onClose,
  onConfirm,
  onConfirmValueChange,
  onCopyPrompt,
  pendingAction,
  plan,
}) {
  if (!entry || !plan) return null;

  const blocked = Boolean(plan.blocked);
  const canConfirm = !blocked && confirmValue === entry.id && !pendingAction;
  const targets = plan.deleteTargets || [];
  const edits = plan.sourceEdits || [];

  return (
    <div className="simulation-dashboard-modal simulation-dashboard-delete-modal" role="dialog" aria-modal="true" aria-labelledby="simulation-delete-title">
      <div className="simulation-dashboard-modal__panel">
        <div className="simulation-dashboard-modal__header">
          <div>
            <span className={blocked ? 'simulation-dashboard-modal__eyebrow is-blocked' : 'simulation-dashboard-modal__eyebrow'}>{blocked ? 'Blocked' : 'Confirm Delete'}</span>
            <h2 id="simulation-delete-title">{entry.name}</h2>
            <p>{entry.id}</p>
          </div>
          <DashboardIconButton icon={X} label="Close delete dialog" tooltipPlacement="below-end" onClick={onClose} />
        </div>

        {blocked ? (
          <section className="simulation-dashboard-delete-modal__block">
            <ShieldAlert aria-hidden="true" size={18} strokeWidth={2} />
            <div>
              <strong>Automatic deletion is blocked</strong>
              <ul>
                {(plan.blockers || []).map((blocker) => <li key={blocker}>{blocker}</li>)}
              </ul>
            </div>
          </section>
        ) : null}

        <section className="simulation-dashboard-delete-modal__plan">
          <h3>Source edits</h3>
          {edits.length ? (
            <ul>
              {edits.map((edit) => (
                <li key={`${edit.path}-${edit.description}`}>
                  <strong>{edit.path}</strong>
                  <span>{edit.description}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p>No automatic source edits are available.</p>
          )}
        </section>

        <section className="simulation-dashboard-delete-modal__plan">
          <h3>Files and folders</h3>
          {targets.length ? (
            <ul>
              {targets.map((target) => (
                <li key={`${target.kind}-${target.path}`}>
                  <strong>{target.path}</strong>
                  <span>{target.exists ? `${target.kind} · ${target.label}` : `missing · ${target.label}`}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p>No repo-owned file targets were approved for automatic deletion.</p>
          )}
        </section>

        {!blocked ? (
          <label className="simulation-dashboard-delete-modal__confirm">
            <span>Type <strong>{entry.id}</strong> to delete this simulation from the repo.</span>
            <input
              value={confirmValue}
              onChange={(event) => onConfirmValueChange(event.target.value)}
              placeholder={entry.id}
              autoComplete="off"
            />
          </label>
        ) : null}

        <div className="simulation-dashboard-modal__actions">
          <DashboardButton
            className="simulation-dashboard-button--ghost"
            icon={Clipboard}
            label={blocked ? 'Copy Cleanup Prompt' : 'Copy Plan'}
            tooltip={blocked ? 'Copy the manual Codex cleanup prompt' : 'Copy the delete plan for review'}
            onClick={onCopyPrompt}
          />
          <div>
            <DashboardButton
              className="simulation-dashboard-button--ghost"
              icon={ArrowLeft}
              label="Cancel"
              tooltip="Close without changing files"
              onClick={onClose}
            />
            <DashboardButton
              className="simulation-dashboard-button--danger"
              disabled={!canConfirm}
              icon={Trash2}
              label={pendingAction === `delete-${entry.id}` ? 'Deleting' : 'Delete'}
              tooltip="Delete repo-owned simulation files"
              onClick={onConfirm}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

function SimulationDashboard() {
  const [simulations, setSimulations] = useState(SIMULATION_CATALOG);
  const [statusById, setStatusById] = useState({});
  const [statusReady, setStatusReady] = useState(false);
  const [activeFilter, setActiveFilter] = useState('review');
  const [query, setQuery] = useState('');
  const [expandedId, setExpandedId] = useState('');
  const [issueEntry, setIssueEntry] = useState(null);
  const [deleteState, setDeleteState] = useState({ entry: null, plan: null, confirmValue: '' });
  const [notice, setNotice] = useState(null);
  const [pendingAction, setPendingAction] = useState('');
  const adminApi = useSimulationAdminApi(setNotice);

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

  useEffect(() => {
    if (!filteredSimulations.length) {
      if (expandedId) setExpandedId('');
      return;
    }
    if (expandedId && !filteredSimulations.some((entry) => entry.id === expandedId)) {
      setExpandedId('');
    }
  }, [expandedId, filteredSimulations]);

  function handleStageChange(nextEntry) {
    if (!nextEntry?.id) return;
    setSimulations((current) => current.map((entry) => (
      entry.id === nextEntry.id ? { ...entry, ...nextEntry } : entry
    )));
    setExpandedId(nextEntry.id);
  }

  async function runDashboardAction(key, label, action) {
    if (pendingAction) return false;
    setPendingAction(key);
    setNotice({
      tone: 'running',
      title: label,
      detail: 'Local command started.',
    });
    try {
      return await action();
    } finally {
      setPendingAction('');
    }
  }

  async function handleValidate() {
    await runDashboardAction('validate', 'Running validation', async () => {
      const ok = await adminApi.validateCatalog();
      await refreshStatus();
      return ok;
    });
  }

  async function handleBuild() {
    await runDashboardAction('build', 'Updating production build', async () => {
      const ok = await adminApi.runBuild();
      await refreshStatus();
      return ok;
    });
  }

  async function handleDeleteRequest(entry) {
    if (!entry || entry.stage === SIMULATION_STAGES.DAILY_ROTATION) return;
    await runDashboardAction(`delete-plan-${entry.id}`, `Preparing delete plan for ${entry.name}`, async () => {
      const plan = await adminApi.previewDelete(entry);
      if (plan) setDeleteState({ entry, plan, confirmValue: '' });
      return Boolean(plan);
    });
  }

  async function handleDeleteConfirm() {
    const { entry, plan, confirmValue } = deleteState;
    if (!entry || !plan || plan.blocked || confirmValue !== entry.id) return;
    await runDashboardAction(`delete-${entry.id}`, `Deleting ${entry.name}`, async () => {
      const result = await adminApi.deleteSimulation(entry, confirmValue, plan);
      if (!result?.deletedId) return false;
      setSimulations((current) => current.filter((item) => item.id !== result.deletedId));
      setDeleteState({ entry: null, plan: null, confirmValue: '' });
      setExpandedId('');
      await refreshStatus();
      return true;
    });
  }

  async function handleCopyDeletePrompt() {
    const { entry, plan } = deleteState;
    if (!entry || !plan) return;
    const text = plan.cleanupPrompt || JSON.stringify(plan, null, 2);
    if (navigator?.clipboard?.writeText) {
      await navigator.clipboard.writeText(text).catch(() => null);
    }
    setNotice({
      tone: 'info',
      title: plan.blocked ? 'Cleanup prompt copied' : 'Delete plan copied',
      detail: plan.blocked ? 'Paste it into Codex for a manual safe cleanup.' : 'The dry-run delete plan is on your clipboard.',
    });
  }

  async function handleIssueSaved() {
    setIssueEntry(null);
    await refreshStatus();
  }

  async function handleIssueStatusChange(issue, status) {
    await runDashboardAction(`issue-${issue.fileName}`, `Updating ${issue.title}`, async () => {
      const ok = await adminApi.updateIssueStatus(issue, status);
      await refreshStatus();
      return ok;
    });
  }

  function handleToggle(entryId) {
    setExpandedId((current) => (current === entryId ? '' : entryId));
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
          <span>{pendingAction ? getPendingActionLabel(pendingAction) : statusReady ? 'Dev API connected' : 'Catalog-only mode'}</span>
          {pendingAction ? (
            <LoaderCircle className="is-spinning" aria-hidden="true" size={14} strokeWidth={2} />
          ) : (
            <Box aria-hidden="true" size={14} strokeWidth={2} />
          )}
        </div>
        <HeaderActions onBuild={handleBuild} onValidate={handleValidate} pendingAction={pendingAction} />
      </header>

      <SummaryStrip counts={counts} todaySimulation={todaySimulation} statusReady={statusReady} />

      <FilterToolbar
        activeFilter={activeFilter}
        counts={counts}
        onFilterChange={setActiveFilter}
        query={query}
        onQueryChange={setQuery}
      />

      <SimulationList
        activeFilter={activeFilter}
        adminApi={adminApi}
        expandedId={expandedId}
        notice={notice}
        simulations={filteredSimulations}
        onDelete={handleDeleteRequest}
        onIssueOpen={setIssueEntry}
        onIssueStatusChange={handleIssueStatusChange}
        onStageChange={handleStageChange}
        onToggle={handleToggle}
        pendingAction={pendingAction}
      />

      <DeleteConfirmationModal
        confirmValue={deleteState.confirmValue}
        entry={deleteState.entry}
        plan={deleteState.plan}
        pendingAction={pendingAction}
        onClose={() => setDeleteState({ entry: null, plan: null, confirmValue: '' })}
        onConfirm={handleDeleteConfirm}
        onConfirmValueChange={(confirmValue) => setDeleteState((current) => ({ ...current, confirmValue }))}
        onCopyPrompt={handleCopyDeletePrompt}
      />

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
