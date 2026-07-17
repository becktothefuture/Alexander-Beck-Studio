import { createHotContext as __vite__createHotContext } from "/@vite/client";import.meta.hot = __vite__createHotContext("/src/routes/simulation-launchpad/SimulationLaunchpadRoute.jsx");import __vite__cjsImport0_react_jsxDevRuntime from "/node_modules/.vite/deps/react_jsx-dev-runtime.js?v=6e8fde4d"; const jsxDEV = __vite__cjsImport0_react_jsxDevRuntime["jsxDEV"];
var _s = $RefreshSig$(), _s2 = $RefreshSig$();
import __vite__cjsImport1_react from "/node_modules/.vite/deps/react.js?v=6e8fde4d"; const useCallback = __vite__cjsImport1_react["useCallback"]; const useEffect = __vite__cjsImport1_react["useEffect"]; const useMemo = __vite__cjsImport1_react["useMemo"]; const useState = __vite__cjsImport1_react["useState"];
import {
  Archive,
  ArrowLeft,
  Box,
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
  X
} from "/node_modules/.vite/deps/lucide-react.js?v=6e8fde4d";
import { buildRouteHref } from "/src/lib/routes.js";
import {
  SIMULATION_CATALOG,
  SIMULATION_CATALOG_UPDATED_AT,
  SIMULATION_STAGES,
  getReloadSimulation
} from "/src/data/simulationCatalog.js";
import { IssuePanel } from "/src/routes/simulation-launchpad/IssuePanel.jsx";
import { useSimulationAdminApi } from "/src/routes/simulation-launchpad/useSimulationAdminApi.js";
import "/src/routes/simulation-launchpad/simulation-launchpad.css";
const homeHref = buildRouteHref("home");
export const SIMULATION_LAUNCHPAD_ROUTE_RUNTIME = {};
const FILTERS = [
  {
    id: "review",
    label: "Review",
    description: "Step 1: candidates, issues, and blockers that need a decision."
  },
  {
    id: "collection",
    label: "Collection",
    description: "Step 2: approved simulations kept available but outside Daily Simulation."
  },
  {
    id: "daily",
    label: "Daily Simulation",
    description: "Step 3: simulations promoted to the daily-selected homepage set."
  },
  {
    id: "hidden",
    label: "Archive",
    description: "Step 4: retired simulations kept in the repo but out of normal management."
  }
];
const STAGE_LABELS = {
  [SIMULATION_STAGES.DAILY_ROTATION]: "Daily Simulation",
  [SIMULATION_STAGES.COLLECTION]: "Collection",
  [SIMULATION_STAGES.AUTOMATION_CANDIDATE]: "Automation Candidate",
  [SIMULATION_STAGES.HIDDEN]: "Archive"
};
const STAGE_TO_FILTER = {
  [SIMULATION_STAGES.DAILY_ROTATION]: "daily",
  [SIMULATION_STAGES.COLLECTION]: "collection",
  [SIMULATION_STAGES.AUTOMATION_CANDIDATE]: "candidates",
  [SIMULATION_STAGES.HIDDEN]: "hidden"
};
const REVIEW_STATUS_PRIORITY = {
  candidate: 36,
  new: 30,
  watch: 22,
  stable: 8,
  internal: 4
};
const REVIEW_ACTIONS = [
  { id: "stable", label: "Reviewed", icon: Check },
  { id: "watch", label: "Watch", icon: Eye },
  { id: "candidate", label: "Candidate", icon: Star }
];
async function readDashboardStatus() {
  const response = await fetch("/api/simulations/status");
  return response.ok ? response.json() : null;
}
function getStatus(statusById, entry) {
  return statusById[entry.id] || {
    issueCount: 0,
    issues: [],
    activity: [],
    preview: { poster: null, animated: null },
    pitch: entry.pitchPath ? { path: entry.pitchPath, present: null } : null,
    validation: "unknown",
    blockers: []
  };
}
function getSimulationCounts(simulations) {
  return simulations.reduce((counts, item) => {
    counts.total += 1;
    counts[item.stage] = (counts[item.stage] || 0) + 1;
    if (item.issueCount > 0) counts.issues += 1;
    if (item.hasMissingAssets) counts.missing += 1;
    if (item.isReviewQueue) counts.review += 1;
    if (item.validation === "passing") counts.passing += 1;
    return counts;
  }, {
    total: 0,
    issues: 0,
    missing: 0,
    passing: 0,
    review: 0
  });
}
function buildSimulationViewModels(simulations, statusById, statusReady) {
  return simulations.map((entry) => {
    const status = getStatus(statusById, entry);
    const isArchived = entry.stage === SIMULATION_STAGES.HIDDEN;
    const missingPreview = statusReady && !isArchived && (status.preview?.poster === false || status.preview?.animated === false);
    const missingPitch = statusReady && !isArchived && status.pitch && status.pitch.present === false;
    const hasMissingAssets = Boolean(missingPreview || missingPitch || status.blockers?.length);
    const issueCount = status.issueCount || 0;
    const validation = status.validation || (statusReady ? "passing" : "unknown");
    const isReviewQueue = !isArchived && (entry.stage === SIMULATION_STAGES.AUTOMATION_CANDIDATE || ["candidate", "watch", "new"].includes(entry.reviewStatus) || issueCount > 0 || hasMissingAssets);
    return {
      ...entry,
      status,
      issueCount,
      validation,
      hasMissingAssets,
      isReviewQueue
    };
  });
}
function filterSimulations(simulations, activeFilter, query) {
  const needle = query.trim().toLowerCase();
  return simulations.filter((entry) => {
    const matchesFilter = activeFilter === "review" && entry.isReviewQueue || STAGE_TO_FILTER[entry.stage] === activeFilter;
    const matchesQuery = !needle || String(entry.name || "").toLowerCase().includes(needle) || String(entry.id || "").toLowerCase().includes(needle) || String(entry.chapter || "").toLowerCase().includes(needle) || String(entry.surface || "").toLowerCase().includes(needle) || String(entry.origin || "").toLowerCase().includes(needle);
    return matchesFilter && matchesQuery;
  });
}
function getFilterCount(filterId, counts) {
  if (filterId === "review") return counts.review;
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
  if (!value) return "Untracked";
  return value;
}
function StatusPill({ kind, children }) {
  return /* @__PURE__ */ jsxDEV("span", { className: `simulation-dashboard-pill simulation-dashboard-pill--${kind}`, children }, void 0, false, {
    fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/simulation-launchpad/SimulationLaunchpadRoute.jsx",
    lineNumber: 202,
    columnNumber: 5
  }, this);
}
_c = StatusPill;
function getTooltipClassName(placement) {
  return placement ? ` simulation-dashboard-tooltip--${placement}` : "";
}
function DashboardButton({
  className = "",
  disabled = false,
  icon: Icon,
  label,
  tooltip,
  tooltipPlacement,
  title,
  type = "button",
  onClick
}) {
  return /* @__PURE__ */ jsxDEV(
    "button",
    {
      className: `simulation-dashboard-button ${className}${getTooltipClassName(tooltipPlacement)}`.trim(),
      type,
      "data-tooltip": tooltip || title || label,
      "aria-label": title || label,
      disabled,
      onClick,
      children: [
        Icon ? /* @__PURE__ */ jsxDEV(Icon, { "aria-hidden": "true", size: 16, strokeWidth: 2 }, void 0, false, {
          fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/simulation-launchpad/SimulationLaunchpadRoute.jsx",
          lineNumber: 232,
          columnNumber: 15
        }, this) : null,
        /* @__PURE__ */ jsxDEV("span", { children: label }, void 0, false, {
          fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/simulation-launchpad/SimulationLaunchpadRoute.jsx",
          lineNumber: 233,
          columnNumber: 7
        }, this)
      ]
    },
    void 0,
    true,
    {
      fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/simulation-launchpad/SimulationLaunchpadRoute.jsx",
      lineNumber: 224,
      columnNumber: 5
    },
    this
  );
}
_c2 = DashboardButton;
function DashboardIconButton({
  as: Component = "button",
  className = "",
  disabled = false,
  href,
  icon: Icon,
  label,
  onClick,
  target,
  tooltipPlacement = "above-end",
  rel
}) {
  const props = Component === "a" ? { href, target, rel } : { type: "button", disabled };
  const iconNode = Icon ? /* @__PURE__ */ jsxDEV(Icon, { "aria-hidden": "true", size: 16, strokeWidth: 2 }, void 0, false, {
    fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/simulation-launchpad/SimulationLaunchpadRoute.jsx",
    lineNumber: 253,
    columnNumber: 27
  }, this) : null;
  return /* @__PURE__ */ jsxDEV(
    Component,
    {
      ...props,
      className: `simulation-dashboard-icon-button ${className}${getTooltipClassName(tooltipPlacement)}`.trim(),
      "data-tooltip": label,
      "aria-label": label,
      onClick,
      children: iconNode
    },
    void 0,
    false,
    {
      fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/simulation-launchpad/SimulationLaunchpadRoute.jsx",
      lineNumber: 256,
      columnNumber: 5
    },
    this
  );
}
_c3 = DashboardIconButton;
function DashboardThumbnail({ entry, playAnimated = false, size = "compact" }) {
  _s();
  const [hovering, setHovering] = useState(false);
  const [animatedFailed, setAnimatedFailed] = useState(false);
  const [posterFailed, setPosterFailed] = useState(false);
  const animatedSrc = entry.preview?.animated;
  const posterSrc = entry.preview?.poster;
  const shouldPlayAnimated = playAnimated || hovering;
  const src = shouldPlayAnimated && animatedSrc && !animatedFailed ? animatedSrc : posterSrc;
  return /* @__PURE__ */ jsxDEV(
    "div",
    {
      className: `simulation-dashboard-thumb simulation-dashboard-thumb--${size}`,
      onMouseEnter: () => setHovering(true),
      onMouseLeave: () => setHovering(false),
      children: [
        !posterFailed && src ? /* @__PURE__ */ jsxDEV(
          "img",
          {
            src,
            alt: "",
            loading: "lazy",
            onError: () => {
              if (src === animatedSrc) {
                setAnimatedFailed(true);
                return;
              }
              setPosterFailed(true);
            }
          },
          void 0,
          false,
          {
            fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/simulation-launchpad/SimulationLaunchpadRoute.jsx",
            lineNumber: 284,
            columnNumber: 7
          },
          this
        ) : /* @__PURE__ */ jsxDEV("span", { "aria-hidden": "true" }, void 0, false, {
          fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/simulation-launchpad/SimulationLaunchpadRoute.jsx",
          lineNumber: 297,
          columnNumber: 7
        }, this),
        animatedSrc ? /* @__PURE__ */ jsxDEV("em", { children: "GIF" }, void 0, false, {
          fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/simulation-launchpad/SimulationLaunchpadRoute.jsx",
          lineNumber: 299,
          columnNumber: 22
        }, this) : null
      ]
    },
    void 0,
    true,
    {
      fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/simulation-launchpad/SimulationLaunchpadRoute.jsx",
      lineNumber: 278,
      columnNumber: 5
    },
    this
  );
}
_s(DashboardThumbnail, "neixq/Qg6/EMF2HcJW2RkmD7pQ0=");
_c4 = DashboardThumbnail;
function HeaderActions({ onBuild, onValidate, pendingAction }) {
  return /* @__PURE__ */ jsxDEV("div", { className: "simulation-dashboard-header__actions", children: [
    /* @__PURE__ */ jsxDEV(
      "a",
      {
        className: "simulation-dashboard-button simulation-dashboard-button--ghost simulation-dashboard-tooltip--below-end",
        href: homeHref,
        "data-tooltip": "Return to the current development site",
        "aria-label": "Open development site",
        children: [
          /* @__PURE__ */ jsxDEV(ArrowLeft, { "aria-hidden": "true", size: 16, strokeWidth: 2 }, void 0, false, {
            fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/simulation-launchpad/SimulationLaunchpadRoute.jsx",
            lineNumber: 313,
            columnNumber: 9
          }, this),
          /* @__PURE__ */ jsxDEV("span", { children: "Dev Site" }, void 0, false, {
            fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/simulation-launchpad/SimulationLaunchpadRoute.jsx",
            lineNumber: 314,
            columnNumber: 9
          }, this)
        ]
      },
      void 0,
      true,
      {
        fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/simulation-launchpad/SimulationLaunchpadRoute.jsx",
        lineNumber: 307,
        columnNumber: 7
      },
      this
    ),
    /* @__PURE__ */ jsxDEV(
      DashboardButton,
      {
        className: "simulation-dashboard-button--ghost",
        disabled: Boolean(pendingAction),
        icon: PackageCheck,
        label: pendingAction === "build" ? "Building" : "Build",
        tooltip: "Run production build",
        tooltipPlacement: "below-end",
        onClick: onBuild
      },
      void 0,
      false,
      {
        fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/simulation-launchpad/SimulationLaunchpadRoute.jsx",
        lineNumber: 316,
        columnNumber: 7
      },
      this
    ),
    /* @__PURE__ */ jsxDEV(
      DashboardButton,
      {
        className: "simulation-dashboard-button--primary",
        disabled: Boolean(pendingAction),
        icon: Check,
        label: pendingAction === "validate" ? "Running" : "Validate",
        tooltip: "Run simulation catalog validation",
        tooltipPlacement: "below-end",
        onClick: onValidate
      },
      void 0,
      false,
      {
        fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/simulation-launchpad/SimulationLaunchpadRoute.jsx",
        lineNumber: 325,
        columnNumber: 7
      },
      this
    )
  ] }, void 0, true, {
    fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/simulation-launchpad/SimulationLaunchpadRoute.jsx",
    lineNumber: 306,
    columnNumber: 5
  }, this);
}
_c5 = HeaderActions;
function getPendingActionLabel(pendingAction) {
  if (!pendingAction) return "";
  if (pendingAction === "validate") return "Running catalog validation";
  if (pendingAction === "build") return "Updating production build";
  if (pendingAction.startsWith("issue-")) return "Updating issue status";
  if (pendingAction.startsWith("delete-plan-")) return "Preparing delete plan";
  if (pendingAction.startsWith("delete-")) return "Deleting simulation";
  return "Working";
}
function InlineNotice({ notice, pendingAction }) {
  const runningLabel = getPendingActionLabel(pendingAction);
  const title = runningLabel || notice?.title;
  if (!title && !notice?.detail) return null;
  const tone = pendingAction ? "running" : notice?.tone || "info";
  const detail = pendingAction ? "Running against the local dev API." : notice?.detail;
  const Icon = pendingAction ? LoaderCircle : Check;
  return /* @__PURE__ */ jsxDEV("div", { className: `simulation-dashboard-inline-notice simulation-dashboard-inline-notice--${tone}`, role: "status", children: [
    /* @__PURE__ */ jsxDEV(Icon, { className: pendingAction ? "is-spinning" : "", "aria-hidden": "true", size: 14, strokeWidth: 2 }, void 0, false, {
      fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/simulation-launchpad/SimulationLaunchpadRoute.jsx",
      lineNumber: 361,
      columnNumber: 7
    }, this),
    /* @__PURE__ */ jsxDEV("div", { children: [
      /* @__PURE__ */ jsxDEV("strong", { children: title }, void 0, false, {
        fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/simulation-launchpad/SimulationLaunchpadRoute.jsx",
        lineNumber: 363,
        columnNumber: 9
      }, this),
      detail ? /* @__PURE__ */ jsxDEV("span", { children: detail }, void 0, false, {
        fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/simulation-launchpad/SimulationLaunchpadRoute.jsx",
        lineNumber: 364,
        columnNumber: 19
      }, this) : null
    ] }, void 0, true, {
      fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/simulation-launchpad/SimulationLaunchpadRoute.jsx",
      lineNumber: 362,
      columnNumber: 7
    }, this)
  ] }, void 0, true, {
    fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/simulation-launchpad/SimulationLaunchpadRoute.jsx",
    lineNumber: 360,
    columnNumber: 5
  }, this);
}
_c6 = InlineNotice;
function SummaryStrip({ counts, reloadSimulation, statusReady }) {
  const validationPercent = counts.total ? Math.round(counts.passing / counts.total * 100) : 0;
  const summary = [
    { label: "Total", value: counts.total, detail: "catalog" },
    { label: "Daily", value: counts[SIMULATION_STAGES.DAILY_ROTATION] || 0, detail: reloadSimulation?.name || "none" },
    { label: "Candidates", value: counts[SIMULATION_STAGES.AUTOMATION_CANDIDATE] || 0, detail: "review" },
    { label: "Issues", value: counts.issues, detail: "open" },
    { label: "Missing", value: counts.missing, detail: statusReady ? "assets" : "status off" },
    { label: "Validation", value: statusReady ? `${validationPercent}%` : "Local", detail: statusReady ? "passing" : "catalog" }
  ];
  return /* @__PURE__ */ jsxDEV("section", { className: "simulation-dashboard-summary", "aria-label": "Simulation status summary", children: summary.map(
    (item) => /* @__PURE__ */ jsxDEV("div", { className: "simulation-dashboard-summary__item", children: [
      /* @__PURE__ */ jsxDEV("span", { children: item.label }, void 0, false, {
        fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/simulation-launchpad/SimulationLaunchpadRoute.jsx",
        lineNumber: 385,
        columnNumber: 11
      }, this),
      /* @__PURE__ */ jsxDEV("strong", { children: item.value }, void 0, false, {
        fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/simulation-launchpad/SimulationLaunchpadRoute.jsx",
        lineNumber: 386,
        columnNumber: 11
      }, this),
      /* @__PURE__ */ jsxDEV("p", { children: item.detail }, void 0, false, {
        fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/simulation-launchpad/SimulationLaunchpadRoute.jsx",
        lineNumber: 387,
        columnNumber: 11
      }, this)
    ] }, item.label, true, {
      fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/simulation-launchpad/SimulationLaunchpadRoute.jsx",
      lineNumber: 384,
      columnNumber: 7
    }, this)
  ) }, void 0, false, {
    fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/simulation-launchpad/SimulationLaunchpadRoute.jsx",
    lineNumber: 382,
    columnNumber: 5
  }, this);
}
_c7 = SummaryStrip;
function getFilterTooltipPlacement(index) {
  if (index < 2) return "below-start";
  if (index > FILTERS.length - 3) return "below-end";
  return "below";
}
function FilterToolbar({ activeFilter, counts, onFilterChange, query, onQueryChange }) {
  return /* @__PURE__ */ jsxDEV("section", { className: "simulation-dashboard-toolbar", "aria-label": "Simulation filters", children: [
    /* @__PURE__ */ jsxDEV("div", { className: "simulation-dashboard-search", children: [
      /* @__PURE__ */ jsxDEV(Search, { "aria-hidden": "true", size: 16, strokeWidth: 2 }, void 0, false, {
        fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/simulation-launchpad/SimulationLaunchpadRoute.jsx",
        lineNumber: 404,
        columnNumber: 9
      }, this),
      /* @__PURE__ */ jsxDEV("label", { children: [
        /* @__PURE__ */ jsxDEV("span", { className: "simulation-dashboard-sr", children: "Search simulations" }, void 0, false, {
          fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/simulation-launchpad/SimulationLaunchpadRoute.jsx",
          lineNumber: 406,
          columnNumber: 11
        }, this),
        /* @__PURE__ */ jsxDEV(
          "input",
          {
            value: query,
            onChange: (event) => onQueryChange(event.target.value),
            placeholder: "Search by name, id, source, or status"
          },
          void 0,
          false,
          {
            fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/simulation-launchpad/SimulationLaunchpadRoute.jsx",
            lineNumber: 407,
            columnNumber: 11
          },
          this
        )
      ] }, void 0, true, {
        fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/simulation-launchpad/SimulationLaunchpadRoute.jsx",
        lineNumber: 405,
        columnNumber: 9
      }, this)
    ] }, void 0, true, {
      fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/simulation-launchpad/SimulationLaunchpadRoute.jsx",
      lineNumber: 403,
      columnNumber: 7
    }, this),
    /* @__PURE__ */ jsxDEV("nav", { className: "simulation-dashboard-filter-list", "aria-label": "Queues", children: FILTERS.map((filter, index) => {
      const count = getFilterCount(filter.id, counts);
      const tooltipPlacement = getFilterTooltipPlacement(index);
      return /* @__PURE__ */ jsxDEV(
        "button",
        {
          type: "button",
          className: `${activeFilter === filter.id ? "is-active " : ""}simulation-dashboard-tooltip--${tooltipPlacement}`.trim(),
          "data-tooltip": `${filter.description} ${count} simulations.`,
          onClick: () => onFilterChange(filter.id),
          children: [
            /* @__PURE__ */ jsxDEV("span", { children: filter.label }, void 0, false, {
              fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/simulation-launchpad/SimulationLaunchpadRoute.jsx",
              lineNumber: 427,
              columnNumber: 15
            }, this),
            /* @__PURE__ */ jsxDEV("strong", { children: count }, void 0, false, {
              fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/simulation-launchpad/SimulationLaunchpadRoute.jsx",
              lineNumber: 428,
              columnNumber: 15
            }, this)
          ]
        },
        filter.id,
        true,
        {
          fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/simulation-launchpad/SimulationLaunchpadRoute.jsx",
          lineNumber: 420,
          columnNumber: 13
        },
        this
      );
    }) }, void 0, false, {
      fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/simulation-launchpad/SimulationLaunchpadRoute.jsx",
      lineNumber: 415,
      columnNumber: 7
    }, this)
  ] }, void 0, true, {
    fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/simulation-launchpad/SimulationLaunchpadRoute.jsx",
    lineNumber: 402,
    columnNumber: 5
  }, this);
}
_c8 = FilterToolbar;
function DetailRow({ label, children }) {
  return /* @__PURE__ */ jsxDEV("div", { className: "simulation-dashboard-detail-row", children: [
    /* @__PURE__ */ jsxDEV("dt", { children: label }, void 0, false, {
      fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/simulation-launchpad/SimulationLaunchpadRoute.jsx",
      lineNumber: 440,
      columnNumber: 7
    }, this),
    /* @__PURE__ */ jsxDEV("dd", { children }, void 0, false, {
      fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/simulation-launchpad/SimulationLaunchpadRoute.jsx",
      lineNumber: 441,
      columnNumber: 7
    }, this)
  ] }, void 0, true, {
    fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/simulation-launchpad/SimulationLaunchpadRoute.jsx",
    lineNumber: 439,
    columnNumber: 5
  }, this);
}
_c9 = DetailRow;
function IssueList({ issues, onIssueStatusChange, pendingAction }) {
  if (!issues?.length) return null;
  return /* @__PURE__ */ jsxDEV("section", { className: "simulation-dashboard-section simulation-dashboard-issues", children: [
    /* @__PURE__ */ jsxDEV("h3", { children: "Issues" }, void 0, false, {
      fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/simulation-launchpad/SimulationLaunchpadRoute.jsx",
      lineNumber: 451,
      columnNumber: 7
    }, this),
    /* @__PURE__ */ jsxDEV("ul", { children: issues.map((issue) => {
      const isOpen = !["resolved", "closed"].includes(String(issue.status || "").toLowerCase());
      return /* @__PURE__ */ jsxDEV("li", { children: [
        /* @__PURE__ */ jsxDEV("div", { children: [
          /* @__PURE__ */ jsxDEV("strong", { children: issue.title }, void 0, false, {
            fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/simulation-launchpad/SimulationLaunchpadRoute.jsx",
            lineNumber: 458,
            columnNumber: 17
          }, this),
          /* @__PURE__ */ jsxDEV("span", { children: [
            issue.severity,
            " · ",
            issue.status,
            " · ",
            formatDate(issue.reportedAt?.slice(0, 10))
          ] }, void 0, true, {
            fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/simulation-launchpad/SimulationLaunchpadRoute.jsx",
            lineNumber: 459,
            columnNumber: 17
          }, this),
          /* @__PURE__ */ jsxDEV("small", { children: issue.relativePath }, void 0, false, {
            fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/simulation-launchpad/SimulationLaunchpadRoute.jsx",
            lineNumber: 460,
            columnNumber: 17
          }, this)
        ] }, void 0, true, {
          fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/simulation-launchpad/SimulationLaunchpadRoute.jsx",
          lineNumber: 457,
          columnNumber: 15
        }, this),
        /* @__PURE__ */ jsxDEV(
          DashboardIconButton,
          {
            disabled: Boolean(pendingAction),
            icon: isOpen ? Check : RotateCcw,
            label: isOpen ? `Resolve issue: ${issue.title}` : `Reopen issue: ${issue.title}`,
            onClick: () => onIssueStatusChange(issue, isOpen ? "resolved" : "open")
          },
          void 0,
          false,
          {
            fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/simulation-launchpad/SimulationLaunchpadRoute.jsx",
            lineNumber: 462,
            columnNumber: 15
          },
          this
        )
      ] }, issue.fileName, true, {
        fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/simulation-launchpad/SimulationLaunchpadRoute.jsx",
        lineNumber: 456,
        columnNumber: 13
      }, this);
    }) }, void 0, false, {
      fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/simulation-launchpad/SimulationLaunchpadRoute.jsx",
      lineNumber: 452,
      columnNumber: 7
    }, this)
  ] }, void 0, true, {
    fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/simulation-launchpad/SimulationLaunchpadRoute.jsx",
    lineNumber: 450,
    columnNumber: 5
  }, this);
}
_c0 = IssueList;
function formatActivityLabel(event) {
  if (event.type === "stage-change") return `Stage ${event.from} to ${event.to}`;
  if (event.type === "review-status-change") return `Review ${event.from} to ${event.to}`;
  if (event.type === "issue-created") return `Issue logged · ${event.title}`;
  if (event.type === "issue-status-change") return `Issue ${event.status}`;
  return event.type || "Activity";
}
function formatActivityDetail(event) {
  const parts = [];
  if (event.issue) parts.push(event.issue);
  if (event.severity) parts.push(`severity ${event.severity}`);
  if (event.status) parts.push(`status ${event.status}`);
  return parts.join(" · ");
}
function ActivityList({ activity }) {
  if (!activity?.length) return null;
  return /* @__PURE__ */ jsxDEV("section", { className: "simulation-dashboard-section simulation-dashboard-activity", children: [
    /* @__PURE__ */ jsxDEV("h3", { children: [
      "Activity Log ",
      /* @__PURE__ */ jsxDEV("span", { children: activity.length }, void 0, false, {
        fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/simulation-launchpad/SimulationLaunchpadRoute.jsx",
        lineNumber: 497,
        columnNumber: 24
      }, this)
    ] }, void 0, true, {
      fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/simulation-launchpad/SimulationLaunchpadRoute.jsx",
      lineNumber: 497,
      columnNumber: 7
    }, this),
    /* @__PURE__ */ jsxDEV("ol", { children: activity.map((event, index) => {
      const detail = formatActivityDetail(event);
      return /* @__PURE__ */ jsxDEV("li", { children: [
        /* @__PURE__ */ jsxDEV("div", { children: [
          /* @__PURE__ */ jsxDEV("span", { children: formatActivityLabel(event) }, void 0, false, {
            fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/simulation-launchpad/SimulationLaunchpadRoute.jsx",
            lineNumber: 504,
            columnNumber: 17
          }, this),
          detail ? /* @__PURE__ */ jsxDEV("small", { children: detail }, void 0, false, {
            fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/simulation-launchpad/SimulationLaunchpadRoute.jsx",
            lineNumber: 505,
            columnNumber: 27
          }, this) : null
        ] }, void 0, true, {
          fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/simulation-launchpad/SimulationLaunchpadRoute.jsx",
          lineNumber: 503,
          columnNumber: 15
        }, this),
        /* @__PURE__ */ jsxDEV("time", { dateTime: event.at, children: formatDate(event.at?.slice(0, 10)) }, void 0, false, {
          fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/simulation-launchpad/SimulationLaunchpadRoute.jsx",
          lineNumber: 507,
          columnNumber: 15
        }, this)
      ] }, `${event.at}-${event.type}-${event.issue || event.to || index}`, true, {
        fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/simulation-launchpad/SimulationLaunchpadRoute.jsx",
        lineNumber: 502,
        columnNumber: 13
      }, this);
    }) }, void 0, false, {
      fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/simulation-launchpad/SimulationLaunchpadRoute.jsx",
      lineNumber: 498,
      columnNumber: 7
    }, this)
  ] }, void 0, true, {
    fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/simulation-launchpad/SimulationLaunchpadRoute.jsx",
    lineNumber: 496,
    columnNumber: 5
  }, this);
}
_c1 = ActivityList;
function ExpandedSimulationDetails({
  activeFilter,
  adminApi,
  entry,
  onDelete,
  onIssueOpen,
  onIssueStatusChange,
  onStageChange,
  pendingAction
}) {
  async function changeStage(stage) {
    const needsConfirmation = [
      SIMULATION_STAGES.DAILY_ROTATION,
      SIMULATION_STAGES.HIDDEN
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
  const archiveActionVisible = activeFilter !== "review" && entry.stage !== SIMULATION_STAGES.HIDDEN;
  return /* @__PURE__ */ jsxDEV("div", { className: "simulation-dashboard-expanded", id: `simulation-details-${entry.id}`, children: [
    /* @__PURE__ */ jsxDEV("div", { className: "simulation-dashboard-expanded__preview", children: [
      /* @__PURE__ */ jsxDEV(DashboardThumbnail, { entry, playAnimated: true, size: "large" }, void 0, false, {
        fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/simulation-launchpad/SimulationLaunchpadRoute.jsx",
        lineNumber: 549,
        columnNumber: 9
      }, this),
      /* @__PURE__ */ jsxDEV("div", { className: "simulation-dashboard-expanded__links", children: /* @__PURE__ */ jsxDEV(
        "a",
        {
          className: "simulation-dashboard-button simulation-dashboard-button--ghost simulation-dashboard-tooltip--below-start",
          href: entry.launchPath,
          target: "_blank",
          rel: "noreferrer",
          "data-tooltip": "Open in a new tab",
          children: [
            /* @__PURE__ */ jsxDEV(ExternalLink, { "aria-hidden": "true", size: 16, strokeWidth: 2 }, void 0, false, {
              fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/simulation-launchpad/SimulationLaunchpadRoute.jsx",
              lineNumber: 558,
              columnNumber: 13
            }, this),
            /* @__PURE__ */ jsxDEV("span", { children: "Open" }, void 0, false, {
              fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/simulation-launchpad/SimulationLaunchpadRoute.jsx",
              lineNumber: 559,
              columnNumber: 13
            }, this)
          ]
        },
        void 0,
        true,
        {
          fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/simulation-launchpad/SimulationLaunchpadRoute.jsx",
          lineNumber: 551,
          columnNumber: 11
        },
        this
      ) }, void 0, false, {
        fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/simulation-launchpad/SimulationLaunchpadRoute.jsx",
        lineNumber: 550,
        columnNumber: 9
      }, this)
    ] }, void 0, true, {
      fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/simulation-launchpad/SimulationLaunchpadRoute.jsx",
      lineNumber: 548,
      columnNumber: 7
    }, this),
    /* @__PURE__ */ jsxDEV("div", { className: "simulation-dashboard-expanded__main", children: [
      /* @__PURE__ */ jsxDEV("section", { className: "simulation-dashboard-section", children: [
        /* @__PURE__ */ jsxDEV("h3", { children: "Overview" }, void 0, false, {
          fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/simulation-launchpad/SimulationLaunchpadRoute.jsx",
          lineNumber: 566,
          columnNumber: 11
        }, this),
        /* @__PURE__ */ jsxDEV("p", { children: entry.summary }, void 0, false, {
          fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/simulation-launchpad/SimulationLaunchpadRoute.jsx",
          lineNumber: 567,
          columnNumber: 11
        }, this),
        /* @__PURE__ */ jsxDEV("dl", { className: "simulation-dashboard-detail-list", children: [
          /* @__PURE__ */ jsxDEV(DetailRow, { label: "Stage", children: /* @__PURE__ */ jsxDEV(StatusPill, { kind: entry.stage, children: STAGE_LABELS[entry.stage] || entry.stage }, void 0, false, {
            fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/simulation-launchpad/SimulationLaunchpadRoute.jsx",
            lineNumber: 569,
            columnNumber: 38
          }, this) }, void 0, false, {
            fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/simulation-launchpad/SimulationLaunchpadRoute.jsx",
            lineNumber: 569,
            columnNumber: 13
          }, this),
          /* @__PURE__ */ jsxDEV(DetailRow, { label: "Review", children: /* @__PURE__ */ jsxDEV(StatusPill, { kind: entry.reviewStatus || "unknown", children: entry.reviewStatus || "Unknown" }, void 0, false, {
            fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/simulation-launchpad/SimulationLaunchpadRoute.jsx",
            lineNumber: 570,
            columnNumber: 39
          }, this) }, void 0, false, {
            fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/simulation-launchpad/SimulationLaunchpadRoute.jsx",
            lineNumber: 570,
            columnNumber: 13
          }, this),
          /* @__PURE__ */ jsxDEV(DetailRow, { label: "Surface", children: entry.surface }, void 0, false, {
            fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/simulation-launchpad/SimulationLaunchpadRoute.jsx",
            lineNumber: 571,
            columnNumber: 13
          }, this),
          /* @__PURE__ */ jsxDEV(DetailRow, { label: "Origin", children: entry.origin }, void 0, false, {
            fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/simulation-launchpad/SimulationLaunchpadRoute.jsx",
            lineNumber: 572,
            columnNumber: 13
          }, this),
          /* @__PURE__ */ jsxDEV(DetailRow, { label: "Date", children: formatDate(entry.lastReviewedAt || entry.introducedOn) }, void 0, false, {
            fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/simulation-launchpad/SimulationLaunchpadRoute.jsx",
            lineNumber: 573,
            columnNumber: 13
          }, this),
          /* @__PURE__ */ jsxDEV(DetailRow, { label: "Issues", children: /* @__PURE__ */ jsxDEV("span", { className: entry.issueCount > 0 ? "has-issues" : "", children: [
            entry.issueCount,
            " open"
          ] }, void 0, true, {
            fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/simulation-launchpad/SimulationLaunchpadRoute.jsx",
            lineNumber: 574,
            columnNumber: 39
          }, this) }, void 0, false, {
            fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/simulation-launchpad/SimulationLaunchpadRoute.jsx",
            lineNumber: 574,
            columnNumber: 13
          }, this),
          /* @__PURE__ */ jsxDEV(DetailRow, { label: "Validation", children: /* @__PURE__ */ jsxDEV(StatusPill, { kind: entry.validation, children: entry.validation }, void 0, false, {
            fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/simulation-launchpad/SimulationLaunchpadRoute.jsx",
            lineNumber: 575,
            columnNumber: 43
          }, this) }, void 0, false, {
            fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/simulation-launchpad/SimulationLaunchpadRoute.jsx",
            lineNumber: 575,
            columnNumber: 13
          }, this),
          /* @__PURE__ */ jsxDEV(DetailRow, { label: "Pitch", children: entry.pitchPath ? entry.status.pitch?.present === false ? "Missing" : entry.pitchPath : "n/a" }, void 0, false, {
            fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/simulation-launchpad/SimulationLaunchpadRoute.jsx",
            lineNumber: 576,
            columnNumber: 13
          }, this),
          /* @__PURE__ */ jsxDEV(DetailRow, { label: "Config", children: entry.configPath || "n/a" }, void 0, false, {
            fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/simulation-launchpad/SimulationLaunchpadRoute.jsx",
            lineNumber: 577,
            columnNumber: 13
          }, this),
          /* @__PURE__ */ jsxDEV(DetailRow, { label: "Capture", children: entry.capture?.notes || "Default preview capture timing." }, void 0, false, {
            fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/simulation-launchpad/SimulationLaunchpadRoute.jsx",
            lineNumber: 578,
            columnNumber: 13
          }, this)
        ] }, void 0, true, {
          fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/simulation-launchpad/SimulationLaunchpadRoute.jsx",
          lineNumber: 568,
          columnNumber: 11
        }, this)
      ] }, void 0, true, {
        fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/simulation-launchpad/SimulationLaunchpadRoute.jsx",
        lineNumber: 565,
        columnNumber: 9
      }, this),
      entry.status.blockers?.length ? /* @__PURE__ */ jsxDEV("section", { className: "simulation-dashboard-section simulation-dashboard-blockers", children: [
        /* @__PURE__ */ jsxDEV("h3", { children: "Blockers" }, void 0, false, {
          fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/simulation-launchpad/SimulationLaunchpadRoute.jsx",
          lineNumber: 584,
          columnNumber: 13
        }, this),
        /* @__PURE__ */ jsxDEV("ul", { children: entry.status.blockers.map((blocker) => /* @__PURE__ */ jsxDEV("li", { children: blocker }, blocker, false, {
          fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/simulation-launchpad/SimulationLaunchpadRoute.jsx",
          lineNumber: 586,
          columnNumber: 55
        }, this)) }, void 0, false, {
          fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/simulation-launchpad/SimulationLaunchpadRoute.jsx",
          lineNumber: 585,
          columnNumber: 13
        }, this)
      ] }, void 0, true, {
        fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/simulation-launchpad/SimulationLaunchpadRoute.jsx",
        lineNumber: 583,
        columnNumber: 9
      }, this) : null,
      /* @__PURE__ */ jsxDEV(
        IssueList,
        {
          issues: entry.status.issues,
          onIssueStatusChange,
          pendingAction
        },
        void 0,
        false,
        {
          fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/simulation-launchpad/SimulationLaunchpadRoute.jsx",
          lineNumber: 591,
          columnNumber: 9
        },
        this
      ),
      /* @__PURE__ */ jsxDEV(ActivityList, { activity: entry.status.activity }, void 0, false, {
        fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/simulation-launchpad/SimulationLaunchpadRoute.jsx",
        lineNumber: 597,
        columnNumber: 9
      }, this)
    ] }, void 0, true, {
      fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/simulation-launchpad/SimulationLaunchpadRoute.jsx",
      lineNumber: 564,
      columnNumber: 7
    }, this),
    /* @__PURE__ */ jsxDEV("div", { className: "simulation-dashboard-expanded__controls", children: [
      /* @__PURE__ */ jsxDEV("section", { className: "simulation-dashboard-section simulation-dashboard-review-actions", "aria-label": "Review status controls", children: [
        /* @__PURE__ */ jsxDEV("h3", { children: "Review" }, void 0, false, {
          fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/simulation-launchpad/SimulationLaunchpadRoute.jsx",
          lineNumber: 602,
          columnNumber: 11
        }, this),
        /* @__PURE__ */ jsxDEV("div", { children: REVIEW_ACTIONS.map(
          (action) => /* @__PURE__ */ jsxDEV(
            DashboardButton,
            {
              className: entry.reviewStatus === action.id ? "is-active" : "",
              disabled: Boolean(pendingAction),
              icon: action.icon,
              label: action.label,
              tooltip: `Set review status to ${action.label}`,
              onClick: () => changeReviewStatus(action.id)
            },
            action.id,
            false,
            {
              fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/simulation-launchpad/SimulationLaunchpadRoute.jsx",
              lineNumber: 605,
              columnNumber: 13
            },
            this
          )
        ) }, void 0, false, {
          fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/simulation-launchpad/SimulationLaunchpadRoute.jsx",
          lineNumber: 603,
          columnNumber: 11
        }, this)
      ] }, void 0, true, {
        fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/simulation-launchpad/SimulationLaunchpadRoute.jsx",
        lineNumber: 601,
        columnNumber: 9
      }, this),
      /* @__PURE__ */ jsxDEV("section", { className: "simulation-dashboard-section simulation-dashboard-stage-actions", "aria-label": "Stage controls", children: [
        /* @__PURE__ */ jsxDEV("h3", { children: "Stage" }, void 0, false, {
          fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/simulation-launchpad/SimulationLaunchpadRoute.jsx",
          lineNumber: 619,
          columnNumber: 11
        }, this),
        /* @__PURE__ */ jsxDEV("div", { children: [
          entry.stage !== SIMULATION_STAGES.DAILY_ROTATION ? /* @__PURE__ */ jsxDEV(
            DashboardButton,
            {
              className: "simulation-dashboard-button--promote",
              disabled: Boolean(pendingAction),
              icon: Sparkles,
              label: "Promote",
              tooltip: "Promote to Daily Simulation",
              onClick: () => changeStage(SIMULATION_STAGES.DAILY_ROTATION)
            },
            void 0,
            false,
            {
              fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/simulation-launchpad/SimulationLaunchpadRoute.jsx",
              lineNumber: 622,
              columnNumber: 13
            },
            this
          ) : null,
          entry.stage !== SIMULATION_STAGES.COLLECTION ? /* @__PURE__ */ jsxDEV(
            DashboardButton,
            {
              className: "simulation-dashboard-button--ghost",
              disabled: Boolean(pendingAction),
              icon: Folder,
              label: "Collection",
              tooltip: "Move out of Daily Simulation but keep available for review",
              onClick: () => changeStage(SIMULATION_STAGES.COLLECTION)
            },
            void 0,
            false,
            {
              fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/simulation-launchpad/SimulationLaunchpadRoute.jsx",
              lineNumber: 632,
              columnNumber: 13
            },
            this
          ) : null,
          entry.stage !== SIMULATION_STAGES.AUTOMATION_CANDIDATE && !isDaily ? /* @__PURE__ */ jsxDEV(
            DashboardButton,
            {
              className: "simulation-dashboard-button--ghost",
              disabled: Boolean(pendingAction),
              icon: Star,
              label: "Candidate",
              tooltip: "Mark as an automation candidate for review",
              onClick: () => changeStage(SIMULATION_STAGES.AUTOMATION_CANDIDATE)
            },
            void 0,
            false,
            {
              fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/simulation-launchpad/SimulationLaunchpadRoute.jsx",
              lineNumber: 642,
              columnNumber: 13
            },
            this
          ) : null,
          archiveActionVisible ? /* @__PURE__ */ jsxDEV(
            DashboardButton,
            {
              className: "simulation-dashboard-button--ghost",
              disabled: Boolean(pendingAction),
              icon: Archive,
              label: "Archive",
              tooltip: "Keep code and assets, remove from normal review and collection work",
              onClick: () => changeStage(SIMULATION_STAGES.HIDDEN)
            },
            void 0,
            false,
            {
              fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/simulation-launchpad/SimulationLaunchpadRoute.jsx",
              lineNumber: 652,
              columnNumber: 13
            },
            this
          ) : null
        ] }, void 0, true, {
          fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/simulation-launchpad/SimulationLaunchpadRoute.jsx",
          lineNumber: 620,
          columnNumber: 11
        }, this)
      ] }, void 0, true, {
        fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/simulation-launchpad/SimulationLaunchpadRoute.jsx",
        lineNumber: 618,
        columnNumber: 9
      }, this),
      /* @__PURE__ */ jsxDEV("section", { className: "simulation-dashboard-section simulation-dashboard-danger-zone", "aria-label": "Destructive controls", children: [
        /* @__PURE__ */ jsxDEV("h3", { children: "Actions" }, void 0, false, {
          fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/simulation-launchpad/SimulationLaunchpadRoute.jsx",
          lineNumber: 665,
          columnNumber: 11
        }, this),
        /* @__PURE__ */ jsxDEV("div", { children: [
          /* @__PURE__ */ jsxDEV(
            DashboardButton,
            {
              className: "simulation-dashboard-button--primary",
              disabled: Boolean(pendingAction),
              icon: MessageCircle,
              label: "Log Issue",
              tooltip: "Create a dated issue note for this simulation",
              onClick: () => onIssueOpen(entry)
            },
            void 0,
            false,
            {
              fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/simulation-launchpad/SimulationLaunchpadRoute.jsx",
              lineNumber: 667,
              columnNumber: 13
            },
            this
          ),
          /* @__PURE__ */ jsxDEV(
            DashboardButton,
            {
              className: "simulation-dashboard-button--danger",
              disabled: Boolean(pendingAction) || isDaily,
              icon: Trash2,
              label: "Delete",
              tooltip: isDaily ? "Move to Collection before deleting." : "Delete repo-owned simulation files",
              onClick: () => onDelete(entry)
            },
            void 0,
            false,
            {
              fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/simulation-launchpad/SimulationLaunchpadRoute.jsx",
              lineNumber: 675,
              columnNumber: 13
            },
            this
          )
        ] }, void 0, true, {
          fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/simulation-launchpad/SimulationLaunchpadRoute.jsx",
          lineNumber: 666,
          columnNumber: 11
        }, this)
      ] }, void 0, true, {
        fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/simulation-launchpad/SimulationLaunchpadRoute.jsx",
        lineNumber: 664,
        columnNumber: 9
      }, this)
    ] }, void 0, true, {
      fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/simulation-launchpad/SimulationLaunchpadRoute.jsx",
      lineNumber: 600,
      columnNumber: 7
    }, this)
  ] }, void 0, true, {
    fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/simulation-launchpad/SimulationLaunchpadRoute.jsx",
    lineNumber: 547,
    columnNumber: 5
  }, this);
}
_c10 = ExpandedSimulationDetails;
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
  pendingAction
}) {
  return /* @__PURE__ */ jsxDEV("article", { className: `simulation-dashboard-list-item ${expanded ? "is-expanded" : ""}`, children: [
    /* @__PURE__ */ jsxDEV("div", { className: "simulation-dashboard-list-row", children: [
      /* @__PURE__ */ jsxDEV(
        "button",
        {
          type: "button",
          className: "simulation-dashboard-list-row__main",
          "aria-expanded": expanded,
          "aria-controls": `simulation-details-${entry.id}`,
          onClick: () => onToggle(entry.id),
          children: [
            /* @__PURE__ */ jsxDEV(DashboardThumbnail, { entry, playAnimated: expanded }, void 0, false, {
              fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/simulation-launchpad/SimulationLaunchpadRoute.jsx",
              lineNumber: 712,
              columnNumber: 11
            }, this),
            /* @__PURE__ */ jsxDEV("span", { className: "simulation-dashboard-list-row__title", children: [
              /* @__PURE__ */ jsxDEV("strong", { children: entry.name }, void 0, false, {
                fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/simulation-launchpad/SimulationLaunchpadRoute.jsx",
                lineNumber: 714,
                columnNumber: 13
              }, this),
              /* @__PURE__ */ jsxDEV("span", { children: [
                entry.id,
                " · ",
                entry.surface,
                " · ",
                entry.origin
              ] }, void 0, true, {
                fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/simulation-launchpad/SimulationLaunchpadRoute.jsx",
                lineNumber: 715,
                columnNumber: 13
              }, this)
            ] }, void 0, true, {
              fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/simulation-launchpad/SimulationLaunchpadRoute.jsx",
              lineNumber: 713,
              columnNumber: 11
            }, this),
            /* @__PURE__ */ jsxDEV("span", { className: "simulation-dashboard-list-row__status", children: [
              /* @__PURE__ */ jsxDEV(StatusPill, { kind: entry.stage, children: STAGE_LABELS[entry.stage] || entry.stage }, void 0, false, {
                fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/simulation-launchpad/SimulationLaunchpadRoute.jsx",
                lineNumber: 718,
                columnNumber: 13
              }, this),
              /* @__PURE__ */ jsxDEV(StatusPill, { kind: entry.validation, children: entry.validation }, void 0, false, {
                fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/simulation-launchpad/SimulationLaunchpadRoute.jsx",
                lineNumber: 719,
                columnNumber: 13
              }, this)
            ] }, void 0, true, {
              fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/simulation-launchpad/SimulationLaunchpadRoute.jsx",
              lineNumber: 717,
              columnNumber: 11
            }, this),
            /* @__PURE__ */ jsxDEV("span", { className: "simulation-dashboard-list-row__meta", children: [
              /* @__PURE__ */ jsxDEV("span", { className: entry.issueCount > 0 ? "has-issues" : "", children: [
                entry.issueCount,
                " issues"
              ] }, void 0, true, {
                fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/simulation-launchpad/SimulationLaunchpadRoute.jsx",
                lineNumber: 722,
                columnNumber: 13
              }, this),
              /* @__PURE__ */ jsxDEV("span", { children: formatDate(entry.lastReviewedAt || entry.introducedOn) }, void 0, false, {
                fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/simulation-launchpad/SimulationLaunchpadRoute.jsx",
                lineNumber: 723,
                columnNumber: 13
              }, this)
            ] }, void 0, true, {
              fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/simulation-launchpad/SimulationLaunchpadRoute.jsx",
              lineNumber: 721,
              columnNumber: 11
            }, this),
            /* @__PURE__ */ jsxDEV("span", { className: "simulation-dashboard-list-row__toggle", children: [
              /* @__PURE__ */ jsxDEV(ChevronDown, { "aria-hidden": "true", size: 16, strokeWidth: 2 }, void 0, false, {
                fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/simulation-launchpad/SimulationLaunchpadRoute.jsx",
                lineNumber: 726,
                columnNumber: 13
              }, this),
              /* @__PURE__ */ jsxDEV("span", { children: expanded ? "Close" : "Open" }, void 0, false, {
                fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/simulation-launchpad/SimulationLaunchpadRoute.jsx",
                lineNumber: 727,
                columnNumber: 13
              }, this)
            ] }, void 0, true, {
              fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/simulation-launchpad/SimulationLaunchpadRoute.jsx",
              lineNumber: 725,
              columnNumber: 11
            }, this)
          ]
        },
        void 0,
        true,
        {
          fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/simulation-launchpad/SimulationLaunchpadRoute.jsx",
          lineNumber: 705,
          columnNumber: 9
        },
        this
      ),
      /* @__PURE__ */ jsxDEV("div", { className: "simulation-dashboard-row-actions", "aria-label": `${entry.name} quick actions`, children: [
        /* @__PURE__ */ jsxDEV(
          DashboardIconButton,
          {
            icon: MessageCircle,
            label: "Log issue",
            tooltipPlacement: "above-end",
            onClick: (event) => {
              event.stopPropagation();
              onIssueOpen(entry);
            }
          },
          void 0,
          false,
          {
            fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/simulation-launchpad/SimulationLaunchpadRoute.jsx",
            lineNumber: 731,
            columnNumber: 11
          },
          this
        ),
        /* @__PURE__ */ jsxDEV(
          DashboardIconButton,
          {
            as: "a",
            href: entry.launchPath,
            target: "_blank",
            rel: "noreferrer",
            icon: ExternalLink,
            label: "Open in a new tab",
            tooltipPlacement: "above-end",
            onClick: (event) => event.stopPropagation()
          },
          void 0,
          false,
          {
            fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/simulation-launchpad/SimulationLaunchpadRoute.jsx",
            lineNumber: 737,
            columnNumber: 11
          },
          this
        )
      ] }, void 0, true, {
        fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/simulation-launchpad/SimulationLaunchpadRoute.jsx",
        lineNumber: 730,
        columnNumber: 9
      }, this)
    ] }, void 0, true, {
      fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/simulation-launchpad/SimulationLaunchpadRoute.jsx",
      lineNumber: 704,
      columnNumber: 7
    }, this),
    expanded ? /* @__PURE__ */ jsxDEV(
      ExpandedSimulationDetails,
      {
        activeFilter,
        adminApi,
        entry,
        onDelete,
        onIssueOpen,
        onIssueStatusChange,
        onStageChange,
        pendingAction
      },
      void 0,
      false,
      {
        fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/simulation-launchpad/SimulationLaunchpadRoute.jsx",
        lineNumber: 751,
        columnNumber: 7
      },
      this
    ) : null
  ] }, void 0, true, {
    fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/simulation-launchpad/SimulationLaunchpadRoute.jsx",
    lineNumber: 703,
    columnNumber: 5
  }, this);
}
_c11 = SimulationListItem;
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
  pendingAction
}) {
  return /* @__PURE__ */ jsxDEV("section", { className: "simulation-dashboard-list-panel", "aria-label": "Simulation management list", children: [
    /* @__PURE__ */ jsxDEV("div", { className: "simulation-dashboard-list-panel__bar", children: [
      /* @__PURE__ */ jsxDEV("div", { children: [
        /* @__PURE__ */ jsxDEV("strong", { children: [
          simulations.length,
          " results"
        ] }, void 0, true, {
          fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/simulation-launchpad/SimulationLaunchpadRoute.jsx",
          lineNumber: 783,
          columnNumber: 11
        }, this),
        /* @__PURE__ */ jsxDEV("span", { children: "Sorted by review priority" }, void 0, false, {
          fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/simulation-launchpad/SimulationLaunchpadRoute.jsx",
          lineNumber: 784,
          columnNumber: 11
        }, this)
      ] }, void 0, true, {
        fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/simulation-launchpad/SimulationLaunchpadRoute.jsx",
        lineNumber: 782,
        columnNumber: 9
      }, this),
      /* @__PURE__ */ jsxDEV(InlineNotice, { notice, pendingAction }, void 0, false, {
        fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/simulation-launchpad/SimulationLaunchpadRoute.jsx",
        lineNumber: 786,
        columnNumber: 9
      }, this)
    ] }, void 0, true, {
      fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/simulation-launchpad/SimulationLaunchpadRoute.jsx",
      lineNumber: 781,
      columnNumber: 7
    }, this),
    simulations.length ? /* @__PURE__ */ jsxDEV("div", { className: "simulation-dashboard-list", children: simulations.map(
      (entry) => /* @__PURE__ */ jsxDEV(
        SimulationListItem,
        {
          activeFilter,
          adminApi,
          entry,
          expanded: expandedId === entry.id,
          onDelete,
          onIssueOpen,
          onIssueStatusChange,
          onStageChange,
          onToggle,
          pendingAction
        },
        entry.id,
        false,
        {
          fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/simulation-launchpad/SimulationLaunchpadRoute.jsx",
          lineNumber: 792,
          columnNumber: 9
        },
        this
      )
    ) }, void 0, false, {
      fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/simulation-launchpad/SimulationLaunchpadRoute.jsx",
      lineNumber: 790,
      columnNumber: 7
    }, this) : /* @__PURE__ */ jsxDEV("p", { className: "simulation-dashboard-empty", children: "No simulations match this view." }, void 0, false, {
      fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/simulation-launchpad/SimulationLaunchpadRoute.jsx",
      lineNumber: 808,
      columnNumber: 7
    }, this)
  ] }, void 0, true, {
    fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/simulation-launchpad/SimulationLaunchpadRoute.jsx",
    lineNumber: 780,
    columnNumber: 5
  }, this);
}
_c12 = SimulationList;
function DeleteConfirmationModal({
  confirmValue,
  entry,
  onClose,
  onConfirm,
  onConfirmValueChange,
  onCopyPrompt,
  pendingAction,
  plan
}) {
  if (!entry || !plan) return null;
  const blocked = Boolean(plan.blocked);
  const canConfirm = !blocked && confirmValue === entry.id && !pendingAction;
  const targets = plan.deleteTargets || [];
  const edits = plan.sourceEdits || [];
  return /* @__PURE__ */ jsxDEV("div", { className: "simulation-dashboard-modal simulation-dashboard-delete-modal", role: "dialog", "aria-modal": "true", "aria-labelledby": "simulation-delete-title", children: /* @__PURE__ */ jsxDEV("div", { className: "simulation-dashboard-modal__panel", children: [
    /* @__PURE__ */ jsxDEV("div", { className: "simulation-dashboard-modal__header", children: [
      /* @__PURE__ */ jsxDEV("div", { children: [
        /* @__PURE__ */ jsxDEV("span", { className: blocked ? "simulation-dashboard-modal__eyebrow is-blocked" : "simulation-dashboard-modal__eyebrow", children: blocked ? "Blocked" : "Confirm Delete" }, void 0, false, {
          fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/simulation-launchpad/SimulationLaunchpadRoute.jsx",
          lineNumber: 836,
          columnNumber: 13
        }, this),
        /* @__PURE__ */ jsxDEV("h2", { id: "simulation-delete-title", children: entry.name }, void 0, false, {
          fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/simulation-launchpad/SimulationLaunchpadRoute.jsx",
          lineNumber: 837,
          columnNumber: 13
        }, this),
        /* @__PURE__ */ jsxDEV("p", { children: entry.id }, void 0, false, {
          fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/simulation-launchpad/SimulationLaunchpadRoute.jsx",
          lineNumber: 838,
          columnNumber: 13
        }, this)
      ] }, void 0, true, {
        fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/simulation-launchpad/SimulationLaunchpadRoute.jsx",
        lineNumber: 835,
        columnNumber: 11
      }, this),
      /* @__PURE__ */ jsxDEV(DashboardIconButton, { icon: X, label: "Close delete dialog", tooltipPlacement: "below-end", onClick: onClose }, void 0, false, {
        fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/simulation-launchpad/SimulationLaunchpadRoute.jsx",
        lineNumber: 840,
        columnNumber: 11
      }, this)
    ] }, void 0, true, {
      fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/simulation-launchpad/SimulationLaunchpadRoute.jsx",
      lineNumber: 834,
      columnNumber: 9
    }, this),
    blocked ? /* @__PURE__ */ jsxDEV("section", { className: "simulation-dashboard-delete-modal__block", children: [
      /* @__PURE__ */ jsxDEV(ShieldAlert, { "aria-hidden": "true", size: 18, strokeWidth: 2 }, void 0, false, {
        fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/simulation-launchpad/SimulationLaunchpadRoute.jsx",
        lineNumber: 845,
        columnNumber: 13
      }, this),
      /* @__PURE__ */ jsxDEV("div", { children: [
        /* @__PURE__ */ jsxDEV("strong", { children: "Automatic deletion is blocked" }, void 0, false, {
          fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/simulation-launchpad/SimulationLaunchpadRoute.jsx",
          lineNumber: 847,
          columnNumber: 15
        }, this),
        /* @__PURE__ */ jsxDEV("ul", { children: (plan.blockers || []).map((blocker) => /* @__PURE__ */ jsxDEV("li", { children: blocker }, blocker, false, {
          fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/simulation-launchpad/SimulationLaunchpadRoute.jsx",
          lineNumber: 849,
          columnNumber: 57
        }, this)) }, void 0, false, {
          fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/simulation-launchpad/SimulationLaunchpadRoute.jsx",
          lineNumber: 848,
          columnNumber: 15
        }, this)
      ] }, void 0, true, {
        fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/simulation-launchpad/SimulationLaunchpadRoute.jsx",
        lineNumber: 846,
        columnNumber: 13
      }, this)
    ] }, void 0, true, {
      fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/simulation-launchpad/SimulationLaunchpadRoute.jsx",
      lineNumber: 844,
      columnNumber: 9
    }, this) : null,
    /* @__PURE__ */ jsxDEV("section", { className: "simulation-dashboard-delete-modal__plan", children: [
      /* @__PURE__ */ jsxDEV("h3", { children: "Source edits" }, void 0, false, {
        fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/simulation-launchpad/SimulationLaunchpadRoute.jsx",
        lineNumber: 856,
        columnNumber: 11
      }, this),
      edits.length ? /* @__PURE__ */ jsxDEV("ul", { children: edits.map(
        (edit) => /* @__PURE__ */ jsxDEV("li", { children: [
          /* @__PURE__ */ jsxDEV("strong", { children: edit.path }, void 0, false, {
            fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/simulation-launchpad/SimulationLaunchpadRoute.jsx",
            lineNumber: 861,
            columnNumber: 19
          }, this),
          /* @__PURE__ */ jsxDEV("span", { children: edit.description }, void 0, false, {
            fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/simulation-launchpad/SimulationLaunchpadRoute.jsx",
            lineNumber: 862,
            columnNumber: 19
          }, this)
        ] }, `${edit.path}-${edit.description}`, true, {
          fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/simulation-launchpad/SimulationLaunchpadRoute.jsx",
          lineNumber: 860,
          columnNumber: 13
        }, this)
      ) }, void 0, false, {
        fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/simulation-launchpad/SimulationLaunchpadRoute.jsx",
        lineNumber: 858,
        columnNumber: 11
      }, this) : /* @__PURE__ */ jsxDEV("p", { children: "No automatic source edits are available." }, void 0, false, {
        fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/simulation-launchpad/SimulationLaunchpadRoute.jsx",
        lineNumber: 867,
        columnNumber: 11
      }, this)
    ] }, void 0, true, {
      fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/simulation-launchpad/SimulationLaunchpadRoute.jsx",
      lineNumber: 855,
      columnNumber: 9
    }, this),
    /* @__PURE__ */ jsxDEV("section", { className: "simulation-dashboard-delete-modal__plan", children: [
      /* @__PURE__ */ jsxDEV("h3", { children: "Files and folders" }, void 0, false, {
        fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/simulation-launchpad/SimulationLaunchpadRoute.jsx",
        lineNumber: 872,
        columnNumber: 11
      }, this),
      targets.length ? /* @__PURE__ */ jsxDEV("ul", { children: targets.map(
        (target) => /* @__PURE__ */ jsxDEV("li", { children: [
          /* @__PURE__ */ jsxDEV("strong", { children: target.path }, void 0, false, {
            fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/simulation-launchpad/SimulationLaunchpadRoute.jsx",
            lineNumber: 877,
            columnNumber: 19
          }, this),
          /* @__PURE__ */ jsxDEV("span", { children: target.exists ? `${target.kind} · ${target.label}` : `missing · ${target.label}` }, void 0, false, {
            fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/simulation-launchpad/SimulationLaunchpadRoute.jsx",
            lineNumber: 878,
            columnNumber: 19
          }, this)
        ] }, `${target.kind}-${target.path}`, true, {
          fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/simulation-launchpad/SimulationLaunchpadRoute.jsx",
          lineNumber: 876,
          columnNumber: 13
        }, this)
      ) }, void 0, false, {
        fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/simulation-launchpad/SimulationLaunchpadRoute.jsx",
        lineNumber: 874,
        columnNumber: 11
      }, this) : /* @__PURE__ */ jsxDEV("p", { children: "No repo-owned file targets were approved for automatic deletion." }, void 0, false, {
        fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/simulation-launchpad/SimulationLaunchpadRoute.jsx",
        lineNumber: 883,
        columnNumber: 11
      }, this)
    ] }, void 0, true, {
      fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/simulation-launchpad/SimulationLaunchpadRoute.jsx",
      lineNumber: 871,
      columnNumber: 9
    }, this),
    !blocked ? /* @__PURE__ */ jsxDEV("label", { className: "simulation-dashboard-delete-modal__confirm", children: [
      /* @__PURE__ */ jsxDEV("span", { children: [
        "Type ",
        /* @__PURE__ */ jsxDEV("strong", { children: entry.id }, void 0, false, {
          fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/simulation-launchpad/SimulationLaunchpadRoute.jsx",
          lineNumber: 889,
          columnNumber: 24
        }, this),
        " to delete this simulation from the repo."
      ] }, void 0, true, {
        fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/simulation-launchpad/SimulationLaunchpadRoute.jsx",
        lineNumber: 889,
        columnNumber: 13
      }, this),
      /* @__PURE__ */ jsxDEV(
        "input",
        {
          value: confirmValue,
          onChange: (event) => onConfirmValueChange(event.target.value),
          placeholder: entry.id,
          autoComplete: "off"
        },
        void 0,
        false,
        {
          fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/simulation-launchpad/SimulationLaunchpadRoute.jsx",
          lineNumber: 890,
          columnNumber: 13
        },
        this
      )
    ] }, void 0, true, {
      fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/simulation-launchpad/SimulationLaunchpadRoute.jsx",
      lineNumber: 888,
      columnNumber: 9
    }, this) : null,
    /* @__PURE__ */ jsxDEV("div", { className: "simulation-dashboard-modal__actions", children: [
      /* @__PURE__ */ jsxDEV(
        DashboardButton,
        {
          className: "simulation-dashboard-button--ghost",
          icon: Clipboard,
          label: blocked ? "Copy Cleanup Prompt" : "Copy Plan",
          tooltip: blocked ? "Copy the manual Codex cleanup prompt" : "Copy the delete plan for review",
          onClick: onCopyPrompt
        },
        void 0,
        false,
        {
          fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/simulation-launchpad/SimulationLaunchpadRoute.jsx",
          lineNumber: 900,
          columnNumber: 11
        },
        this
      ),
      /* @__PURE__ */ jsxDEV("div", { children: [
        /* @__PURE__ */ jsxDEV(
          DashboardButton,
          {
            className: "simulation-dashboard-button--ghost",
            icon: ArrowLeft,
            label: "Cancel",
            tooltip: "Close without changing files",
            onClick: onClose
          },
          void 0,
          false,
          {
            fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/simulation-launchpad/SimulationLaunchpadRoute.jsx",
            lineNumber: 908,
            columnNumber: 13
          },
          this
        ),
        /* @__PURE__ */ jsxDEV(
          DashboardButton,
          {
            className: "simulation-dashboard-button--danger",
            disabled: !canConfirm,
            icon: Trash2,
            label: pendingAction === `delete-${entry.id}` ? "Deleting" : "Delete",
            tooltip: "Delete repo-owned simulation files",
            onClick: onConfirm
          },
          void 0,
          false,
          {
            fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/simulation-launchpad/SimulationLaunchpadRoute.jsx",
            lineNumber: 915,
            columnNumber: 13
          },
          this
        )
      ] }, void 0, true, {
        fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/simulation-launchpad/SimulationLaunchpadRoute.jsx",
        lineNumber: 907,
        columnNumber: 11
      }, this)
    ] }, void 0, true, {
      fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/simulation-launchpad/SimulationLaunchpadRoute.jsx",
      lineNumber: 899,
      columnNumber: 9
    }, this)
  ] }, void 0, true, {
    fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/simulation-launchpad/SimulationLaunchpadRoute.jsx",
    lineNumber: 833,
    columnNumber: 7
  }, this) }, void 0, false, {
    fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/simulation-launchpad/SimulationLaunchpadRoute.jsx",
    lineNumber: 832,
    columnNumber: 5
  }, this);
}
_c13 = DeleteConfirmationModal;
function SimulationDashboard() {
  _s2();
  const [simulations, setSimulations] = useState(SIMULATION_CATALOG);
  const [statusById, setStatusById] = useState({});
  const [statusReady, setStatusReady] = useState(false);
  const [activeFilter, setActiveFilter] = useState("review");
  const [query, setQuery] = useState("");
  const [expandedId, setExpandedId] = useState("");
  const [issueEntry, setIssueEntry] = useState(null);
  const [deleteState, setDeleteState] = useState({ entry: null, plan: null, confirmValue: "" });
  const [notice, setNotice] = useState(null);
  const [pendingAction, setPendingAction] = useState("");
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
    readDashboardStatus().then((payload) => {
      if (!cancelled && payload?.ok && payload.simulations) {
        setStatusById(payload.simulations);
        setStatusReady(true);
      }
    }).catch(() => {
      if (!cancelled) setStatusReady(false);
    });
    return () => {
      cancelled = true;
    };
  }, []);
  const viewModels = useMemo(
    () => buildSimulationViewModels(simulations, statusById, statusReady),
    [simulations, statusById, statusReady]
  );
  const counts = getSimulationCounts(viewModels);
  const reloadSimulation = getReloadSimulation(simulations);
  const filteredSimulations = useMemo(
    () => sortSimulationsByPriority(filterSimulations(viewModels, activeFilter, query)),
    [viewModels, activeFilter, query]
  );
  useEffect(() => {
    if (!filteredSimulations.length) {
      if (expandedId) setExpandedId("");
      return;
    }
    if (expandedId && !filteredSimulations.some((entry) => entry.id === expandedId)) {
      setExpandedId("");
    }
  }, [expandedId, filteredSimulations]);
  function handleStageChange(nextEntry) {
    if (!nextEntry?.id) return;
    setSimulations((current) => current.map(
      (entry) => entry.id === nextEntry.id ? { ...entry, ...nextEntry } : entry
    ));
    setExpandedId(nextEntry.id);
  }
  async function runDashboardAction(key, label, action) {
    if (pendingAction) return false;
    setPendingAction(key);
    setNotice({
      tone: "running",
      title: label,
      detail: "Local command started."
    });
    try {
      return await action();
    } finally {
      setPendingAction("");
    }
  }
  async function handleValidate() {
    await runDashboardAction("validate", "Running validation", async () => {
      const ok = await adminApi.validateCatalog();
      await refreshStatus();
      return ok;
    });
  }
  async function handleBuild() {
    await runDashboardAction("build", "Updating production build", async () => {
      const ok = await adminApi.runBuild();
      await refreshStatus();
      return ok;
    });
  }
  async function handleDeleteRequest(entry) {
    if (!entry || entry.stage === SIMULATION_STAGES.DAILY_ROTATION) return;
    await runDashboardAction(`delete-plan-${entry.id}`, `Preparing delete plan for ${entry.name}`, async () => {
      const plan = await adminApi.previewDelete(entry);
      if (plan) setDeleteState({ entry, plan, confirmValue: "" });
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
      setDeleteState({ entry: null, plan: null, confirmValue: "" });
      setExpandedId("");
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
      tone: "info",
      title: plan.blocked ? "Cleanup prompt copied" : "Delete plan copied",
      detail: plan.blocked ? "Paste it into Codex for a manual safe cleanup." : "The dry-run delete plan is on your clipboard."
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
    setExpandedId((current) => current === entryId ? "" : entryId);
  }
  return /* @__PURE__ */ jsxDEV("main", { className: "simulation-dashboard", "aria-label": "Simulation operations dashboard", children: [
    /* @__PURE__ */ jsxDEV("header", { className: "simulation-dashboard-header", children: [
      /* @__PURE__ */ jsxDEV("div", { className: "simulation-dashboard-header__title", children: [
        /* @__PURE__ */ jsxDEV("span", { children: "Local" }, void 0, false, {
          fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/simulation-launchpad/SimulationLaunchpadRoute.jsx",
          lineNumber: 1089,
          columnNumber: 11
        }, this),
        /* @__PURE__ */ jsxDEV("h1", { children: "Simulation Operations" }, void 0, false, {
          fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/simulation-launchpad/SimulationLaunchpadRoute.jsx",
          lineNumber: 1090,
          columnNumber: 11
        }, this),
        /* @__PURE__ */ jsxDEV("p", { children: [
          "Catalog updated ",
          SIMULATION_CATALOG_UPDATED_AT
        ] }, void 0, true, {
          fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/simulation-launchpad/SimulationLaunchpadRoute.jsx",
          lineNumber: 1091,
          columnNumber: 11
        }, this)
      ] }, void 0, true, {
        fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/simulation-launchpad/SimulationLaunchpadRoute.jsx",
        lineNumber: 1088,
        columnNumber: 9
      }, this),
      /* @__PURE__ */ jsxDEV("div", { className: "simulation-dashboard-header__status", children: [
        /* @__PURE__ */ jsxDEV("span", { children: pendingAction ? getPendingActionLabel(pendingAction) : statusReady ? "Dev API connected" : "Catalog-only mode" }, void 0, false, {
          fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/simulation-launchpad/SimulationLaunchpadRoute.jsx",
          lineNumber: 1094,
          columnNumber: 11
        }, this),
        pendingAction ? /* @__PURE__ */ jsxDEV(LoaderCircle, { className: "is-spinning", "aria-hidden": "true", size: 14, strokeWidth: 2 }, void 0, false, {
          fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/simulation-launchpad/SimulationLaunchpadRoute.jsx",
          lineNumber: 1096,
          columnNumber: 11
        }, this) : /* @__PURE__ */ jsxDEV(Box, { "aria-hidden": "true", size: 14, strokeWidth: 2 }, void 0, false, {
          fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/simulation-launchpad/SimulationLaunchpadRoute.jsx",
          lineNumber: 1098,
          columnNumber: 11
        }, this)
      ] }, void 0, true, {
        fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/simulation-launchpad/SimulationLaunchpadRoute.jsx",
        lineNumber: 1093,
        columnNumber: 9
      }, this),
      /* @__PURE__ */ jsxDEV(HeaderActions, { onBuild: handleBuild, onValidate: handleValidate, pendingAction }, void 0, false, {
        fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/simulation-launchpad/SimulationLaunchpadRoute.jsx",
        lineNumber: 1101,
        columnNumber: 9
      }, this)
    ] }, void 0, true, {
      fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/simulation-launchpad/SimulationLaunchpadRoute.jsx",
      lineNumber: 1087,
      columnNumber: 7
    }, this),
    /* @__PURE__ */ jsxDEV(SummaryStrip, { counts, reloadSimulation, statusReady }, void 0, false, {
      fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/simulation-launchpad/SimulationLaunchpadRoute.jsx",
      lineNumber: 1104,
      columnNumber: 7
    }, this),
    /* @__PURE__ */ jsxDEV(
      FilterToolbar,
      {
        activeFilter,
        counts,
        onFilterChange: setActiveFilter,
        query,
        onQueryChange: setQuery
      },
      void 0,
      false,
      {
        fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/simulation-launchpad/SimulationLaunchpadRoute.jsx",
        lineNumber: 1106,
        columnNumber: 7
      },
      this
    ),
    /* @__PURE__ */ jsxDEV(
      SimulationList,
      {
        activeFilter,
        adminApi,
        expandedId,
        notice,
        simulations: filteredSimulations,
        onDelete: handleDeleteRequest,
        onIssueOpen: setIssueEntry,
        onIssueStatusChange: handleIssueStatusChange,
        onStageChange: handleStageChange,
        onToggle: handleToggle,
        pendingAction
      },
      void 0,
      false,
      {
        fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/simulation-launchpad/SimulationLaunchpadRoute.jsx",
        lineNumber: 1114,
        columnNumber: 7
      },
      this
    ),
    /* @__PURE__ */ jsxDEV(
      DeleteConfirmationModal,
      {
        confirmValue: deleteState.confirmValue,
        entry: deleteState.entry,
        plan: deleteState.plan,
        pendingAction,
        onClose: () => setDeleteState({ entry: null, plan: null, confirmValue: "" }),
        onConfirm: handleDeleteConfirm,
        onConfirmValueChange: (confirmValue) => setDeleteState((current) => ({ ...current, confirmValue })),
        onCopyPrompt: handleCopyDeletePrompt
      },
      void 0,
      false,
      {
        fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/simulation-launchpad/SimulationLaunchpadRoute.jsx",
        lineNumber: 1128,
        columnNumber: 7
      },
      this
    ),
    /* @__PURE__ */ jsxDEV(
      IssuePanel,
      {
        entry: issueEntry,
        adminApi,
        onSaved: handleIssueSaved,
        onClose: () => setIssueEntry(null)
      },
      void 0,
      false,
      {
        fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/simulation-launchpad/SimulationLaunchpadRoute.jsx",
        lineNumber: 1139,
        columnNumber: 7
      },
      this
    )
  ] }, void 0, true, {
    fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/simulation-launchpad/SimulationLaunchpadRoute.jsx",
    lineNumber: 1086,
    columnNumber: 5
  }, this);
}
_s2(SimulationDashboard, "e5rC6Z/ihGTPQ7vbpo+rm6VRKAU=", false, function() {
  return [useSimulationAdminApi];
});
_c14 = SimulationDashboard;
export function getSimulationLaunchpadRouteView() {
  return {
    layout: "standalone",
    htmlClassName: "simulation-dashboard-document",
    bodyClass: "body simulation-dashboard-page",
    mainContent: /* @__PURE__ */ jsxDEV(SimulationDashboard, {}, void 0, false, {
      fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/simulation-launchpad/SimulationLaunchpadRoute.jsx",
      lineNumber: 1154,
      columnNumber: 18
    }, this)
  };
}
var _c, _c2, _c3, _c4, _c5, _c6, _c7, _c8, _c9, _c0, _c1, _c10, _c11, _c12, _c13, _c14;
$RefreshReg$(_c, "StatusPill");
$RefreshReg$(_c2, "DashboardButton");
$RefreshReg$(_c3, "DashboardIconButton");
$RefreshReg$(_c4, "DashboardThumbnail");
$RefreshReg$(_c5, "HeaderActions");
$RefreshReg$(_c6, "InlineNotice");
$RefreshReg$(_c7, "SummaryStrip");
$RefreshReg$(_c8, "FilterToolbar");
$RefreshReg$(_c9, "DetailRow");
$RefreshReg$(_c0, "IssueList");
$RefreshReg$(_c1, "ActivityList");
$RefreshReg$(_c10, "ExpandedSimulationDetails");
$RefreshReg$(_c11, "SimulationListItem");
$RefreshReg$(_c12, "SimulationList");
$RefreshReg$(_c13, "DeleteConfirmationModal");
$RefreshReg$(_c14, "SimulationDashboard");
import * as RefreshRuntime from "/@react-refresh";
const inWebWorker = typeof WorkerGlobalScope !== "undefined" && self instanceof WorkerGlobalScope;
if (import.meta.hot && !inWebWorker) {
  if (!window.$RefreshReg$) {
    throw new Error(
      "@vitejs/plugin-react can't detect preamble. Something is wrong."
    );
  }
  RefreshRuntime.__hmr_import(import.meta.url).then((currentExports) => {
    RefreshRuntime.registerExportsForReactRefresh("/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/simulation-launchpad/SimulationLaunchpadRoute.jsx", currentExports);
    import.meta.hot.accept((nextExports) => {
      if (!nextExports) return;
      const invalidateMessage = RefreshRuntime.validateRefreshBoundaryAndEnqueueUpdate("/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/simulation-launchpad/SimulationLaunchpadRoute.jsx", currentExports, nextExports);
      if (invalidateMessage) import.meta.hot.invalidate(invalidateMessage);
    });
  });
}
function $RefreshReg$(type, id) {
  return RefreshRuntime.register(type, "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/simulation-launchpad/SimulationLaunchpadRoute.jsx " + id);
}
function $RefreshSig$() {
  return RefreshRuntime.createSignatureFunctionForTransform();
}

//# sourceMappingURL=data:application/json;base64,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dmUiLCJBcnJvd0xlZnQiLCJCb3giLCJDaGVjayIsIkNoZXZyb25Eb3duIiwiQ2xpcGJvYXJkIiwiRXh0ZXJuYWxMaW5rIiwiRXllIiwiRm9sZGVyIiwiTG9hZGVyQ2lyY2xlIiwiTWVzc2FnZUNpcmNsZSIsIlBhY2thZ2VDaGVjayIsIlJvdGF0ZUNjdyIsIlNlYXJjaCIsIlNoaWVsZEFsZXJ0IiwiU3BhcmtsZXMiLCJTdGFyIiwiVHJhc2gyIiwiWCIsImJ1aWxkUm91dGVIcmVmIiwiU0lNVUxBVElPTl9DQVRBTE9HIiwiU0lNVUxBVElPTl9DQVRBTE9HX1VQREFURURfQVQiLCJTSU1VTEFUSU9OX1NUQUdFUyIsImdldFJlbG9hZFNpbXVsYXRpb24iLCJJc3N1ZVBhbmVsIiwidXNlU2ltdWxhdGlvbkFkbWluQXBpIiwiaG9tZUhyZWYiLCJTSU1VTEFUSU9OX0xBVU5DSFBBRF9ST1VURV9SVU5USU1FIiwiRklMVEVSUyIsImlkIiwibGFiZWwiLCJkZXNjcmlwdGlvbiIsIlNUQUdFX0xBQkVMUyIsIkRBSUxZX1JPVEFUSU9OIiwiQ09MTEVDVElPTiIsIkFVVE9NQVRJT05fQ0FORElEQVRFIiwiSElEREVOIiwiU1RBR0VfVE9fRklMVEVSIiwiUkVWSUVXX1NUQVRVU19QUklPUklUWSIsImNhbmRpZGF0ZSIsIm5ldyIsIndhdGNoIiwic3RhYmxlIiwiaW50ZXJuYWwiLCJSRVZJRVdfQUNUSU9OUyIsImljb24iLCJyZWFkRGFzaGJvYXJkU3RhdHVzIiwicmVzcG9uc2UiLCJmZXRjaCIsIm9rIiwianNvbiIsImdldFN0YXR1cyIsInN0YXR1c0J5SWQiLCJlbnRyeSIsImlzc3VlQ291bnQiLCJpc3N1ZXMiLCJhY3Rpdml0eSIsInByZXZpZXciLCJwb3N0ZXIiLCJhbmltYXRlZCIsInBpdGNoIiwicGl0Y2hQYXRoIiwicGF0aCIsInByZXNlbnQiLCJ2YWxpZGF0aW9uIiwiYmxvY2tlcnMiLCJnZXRTaW11bGF0aW9uQ291bnRzIiwic2ltdWxhdGlvbnMiLCJyZWR1Y2UiLCJjb3VudHMiLCJpdGVtIiwidG90YWwiLCJzdGFnZSIsImhhc01pc3NpbmdBc3NldHMiLCJtaXNzaW5nIiwiaXNSZXZpZXdRdWV1ZSIsInJldmlldyIsInBhc3NpbmciLCJidWlsZFNpbXVsYXRpb25WaWV3TW9kZWxzIiwic3RhdHVzUmVhZHkiLCJtYXAiLCJzdGF0dXMiLCJpc0FyY2hpdmVkIiwibWlzc2luZ1ByZXZpZXciLCJtaXNzaW5nUGl0Y2giLCJCb29sZWFuIiwibGVuZ3RoIiwiaW5jbHVkZXMiLCJyZXZpZXdTdGF0dXMiLCJmaWx0ZXJTaW11bGF0aW9ucyIsImFjdGl2ZUZpbHRlciIsInF1ZXJ5IiwibmVlZGxlIiwidHJpbSIsInRvTG93ZXJDYXNlIiwiZmlsdGVyIiwibWF0Y2hlc0ZpbHRlciIsIm1hdGNoZXNRdWVyeSIsIlN0cmluZyIsIm5hbWUiLCJjaGFwdGVyIiwic3VyZmFjZSIsIm9yaWdpbiIsImdldEZpbHRlckNvdW50IiwiZmlsdGVySWQiLCJPYmplY3QiLCJrZXlzIiwiZmluZCIsImtleSIsImdldFJldmlld1ByaW9yaXR5IiwicHJpb3JpdHkiLCJzb3J0U2ltdWxhdGlvbnNCeVByaW9yaXR5Iiwic29ydCIsImEiLCJiIiwicHJpb3JpdHlEaWZmIiwibG9jYWxlQ29tcGFyZSIsImZvcm1hdERhdGUiLCJ2YWx1ZSIsIlN0YXR1c1BpbGwiLCJraW5kIiwiY2hpbGRyZW4iLCJfYyIsImdldFRvb2x0aXBDbGFzc05hbWUiLCJwbGFjZW1lbnQiLCJEYXNoYm9hcmRCdXR0b24iLCJjbGFzc05hbWUiLCJkaXNhYmxlZCIsIkljb24iLCJ0b29sdGlwIiwidG9vbHRpcFBsYWNlbWVudCIsInRpdGxlIiwidHlwZSIsIm9uQ2xpY2siLCJfYzIiLCJEYXNoYm9hcmRJY29uQnV0dG9uIiwiYXMiLCJDb21wb25lbnQiLCJocmVmIiwidGFyZ2V0IiwicmVsIiwicHJvcHMiLCJpY29uTm9kZSIsIl9jMyIsIkRhc2hib2FyZFRodW1ibmFpbCIsInBsYXlBbmltYXRlZCIsInNpemUiLCJfcyIsImhvdmVyaW5nIiwic2V0SG92ZXJpbmciLCJhbmltYXRlZEZhaWxlZCIsInNldEFuaW1hdGVkRmFpbGVkIiwicG9zdGVyRmFpbGVkIiwic2V0UG9zdGVyRmFpbGVkIiwiYW5pbWF0ZWRTcmMiLCJwb3N0ZXJTcmMiLCJzaG91bGRQbGF5QW5pbWF0ZWQiLCJzcmMiLCJIZWFkZXJBY3Rpb25zIiwib25CdWlsZCIsIm9uVmFsaWRhdGUiLCJwZW5kaW5nQWN0aW9uIiwiX2M1IiwiZ2V0UGVuZGluZ0FjdGlvbkxhYmVsIiwic3RhcnRzV2l0aCIsIklubGluZU5vdGljZSIsIm5vdGljZSIsInJ1bm5pbmdMYWJlbCIsImRldGFpbCIsInRvbmUiLCJfYzYiLCJTdW1tYXJ5U3RyaXAiLCJyZWxvYWRTaW11bGF0aW9uIiwidmFsaWRhdGlvblBlcmNlbnQiLCJNYXRoIiwicm91bmQiLCJzdW1tYXJ5IiwiX2M3IiwiZ2V0RmlsdGVyVG9vbHRpcFBsYWNlbWVudCIsImluZGV4IiwiRmlsdGVyVG9vbGJhciIsIm9uRmlsdGVyQ2hhbmdlIiwib25RdWVyeUNoYW5nZSIsImV2ZW50IiwiY291bnQiLCJfYzgiLCJEZXRhaWxSb3ciLCJfYzkiLCJJc3N1ZUxpc3QiLCJvbklzc3VlU3RhdHVzQ2hhbmdlIiwiaXNzdWUiLCJpc09wZW4iLCJzZXZlcml0eSIsInJlcG9ydGVkQXQiLCJzbGljZSIsInJlbGF0aXZlUGF0aCIsImZpbGVOYW1lIiwiX2MwIiwiZm9ybWF0QWN0aXZpdHlMYWJlbCIsImZyb20iLCJ0byIsImZvcm1hdEFjdGl2aXR5RGV0YWlsIiwicGFydHMiLCJwdXNoIiwiam9pbiIsIkFjdGl2aXR5TGlzdCIsImF0IiwiX2MxIiwiRXhwYW5kZWRTaW11bGF0aW9uRGV0YWlscyIsImFkbWluQXBpIiwib25EZWxldGUiLCJvbklzc3VlT3BlbiIsIm9uU3RhZ2VDaGFuZ2UiLCJjaGFuZ2VTdGFnZSIsIm5lZWRzQ29uZmlybWF0aW9uIiwid2luZG93IiwiY29uZmlybSIsIm5leHRFbnRyeSIsImNoYW5nZVJldmlld1N0YXR1cyIsImlzRGFpbHkiLCJhcmNoaXZlQWN0aW9uVmlzaWJsZSIsImxhdW5jaFBhdGgiLCJsYXN0UmV2aWV3ZWRBdCIsImludHJvZHVjZWRPbiIsImNvbmZpZ1BhdGgiLCJjYXB0dXJlIiwibm90ZXMiLCJibG9ja2VyIiwiYWN0aW9uIiwiX2MxMCIsIlNpbXVsYXRpb25MaXN0SXRlbSIsImV4cGFuZGVkIiwib25Ub2dnbGUiLCJzdG9wUHJvcGFnYXRpb24iLCJfYzExIiwiU2ltdWxhdGlvbkxpc3QiLCJleHBhbmRlZElkIiwiX2MxMiIsIkRlbGV0ZUNvbmZpcm1hdGlvbk1vZGFsIiwiY29uZmlybVZhbHVlIiwib25DbG9zZSIsIm9uQ29uZmlybSIsIm9uQ29uZmlybVZhbHVlQ2hhbmdlIiwib25Db3B5UHJvbXB0IiwicGxhbiIsImJsb2NrZWQiLCJjYW5Db25maXJtIiwidGFyZ2V0cyIsImRlbGV0ZVRhcmdldHMiLCJlZGl0cyIsInNvdXJjZUVkaXRzIiwiZWRpdCIsImV4aXN0cyIsIl9jMTMiLCJTaW11bGF0aW9uRGFzaGJvYXJkIiwiX3MyIiwic2V0U2ltdWxhdGlvbnMiLCJzZXRTdGF0dXNCeUlkIiwic2V0U3RhdHVzUmVhZHkiLCJzZXRBY3RpdmVGaWx0ZXIiLCJzZXRRdWVyeSIsInNldEV4cGFuZGVkSWQiLCJpc3N1ZUVudHJ5Iiwic2V0SXNzdWVFbnRyeSIsImRlbGV0ZVN0YXRlIiwic2V0RGVsZXRlU3RhdGUiLCJzZXROb3RpY2UiLCJzZXRQZW5kaW5nQWN0aW9uIiwicmVmcmVzaFN0YXR1cyIsInBheWxvYWQiLCJjYXRjaCIsImNhbmNlbGxlZCIsInRoZW4iLCJ2aWV3TW9kZWxzIiwiZmlsdGVyZWRTaW11bGF0aW9ucyIsInNvbWUiLCJoYW5kbGVTdGFnZUNoYW5nZSIsImN1cnJlbnQiLCJydW5EYXNoYm9hcmRBY3Rpb24iLCJoYW5kbGVWYWxpZGF0ZSIsInZhbGlkYXRlQ2F0YWxvZyIsImhhbmRsZUJ1aWxkIiwicnVuQnVpbGQiLCJoYW5kbGVEZWxldGVSZXF1ZXN0IiwicHJldmlld0RlbGV0ZSIsImhhbmRsZURlbGV0ZUNvbmZpcm0iLCJyZXN1bHQiLCJkZWxldGVTaW11bGF0aW9uIiwiZGVsZXRlZElkIiwiaGFuZGxlQ29weURlbGV0ZVByb21wdCIsInRleHQiLCJjbGVhbnVwUHJvbXB0IiwiSlNPTiIsInN0cmluZ2lmeSIsIm5hdmlnYXRvciIsImNsaXBib2FyZCIsIndyaXRlVGV4dCIsImhhbmRsZUlzc3VlU2F2ZWQiLCJoYW5kbGVJc3N1ZVN0YXR1c0NoYW5nZSIsInVwZGF0ZUlzc3VlU3RhdHVzIiwiaGFuZGxlVG9nZ2xlIiwiZW50cnlJZCIsImdldFNpbXVsYXRpb25MYXVuY2hwYWRSb3V0ZVZpZXciLCJsYXlvdXQiLCJodG1sQ2xhc3NOYW1lIiwiYm9keUNsYXNzIiwibWFpbkNvbnRlbnQiLCJfYzQiLCJfYzE0Il0sImlnbm9yZUxpc3QiOltdLCJzb3VyY2VzIjpbIlNpbXVsYXRpb25MYXVuY2hwYWRSb3V0ZS5qc3giXSwic291cmNlc0NvbnRlbnQiOlsiLyogZXNsaW50LWRpc2FibGUgcmVhY3QtcmVmcmVzaC9vbmx5LWV4cG9ydC1jb21wb25lbnRzICovXG5pbXBvcnQgeyB1c2VDYWxsYmFjaywgdXNlRWZmZWN0LCB1c2VNZW1vLCB1c2VTdGF0ZSB9IGZyb20gJ3JlYWN0JztcbmltcG9ydCB7XG4gIEFyY2hpdmUsXG4gIEFycm93TGVmdCxcbiAgQm94LFxuICBDaGVjayxcbiAgQ2hldnJvbkRvd24sXG4gIENsaXBib2FyZCxcbiAgRXh0ZXJuYWxMaW5rLFxuICBFeWUsXG4gIEZvbGRlcixcbiAgTG9hZGVyQ2lyY2xlLFxuICBNZXNzYWdlQ2lyY2xlLFxuICBQYWNrYWdlQ2hlY2ssXG4gIFJvdGF0ZUNjdyxcbiAgU2VhcmNoLFxuICBTaGllbGRBbGVydCxcbiAgU3BhcmtsZXMsXG4gIFN0YXIsXG4gIFRyYXNoMixcbiAgWCxcbn0gZnJvbSAnbHVjaWRlLXJlYWN0JztcbmltcG9ydCB7IGJ1aWxkUm91dGVIcmVmIH0gZnJvbSAnLi4vLi4vbGliL3JvdXRlcy5qcyc7XG5pbXBvcnQge1xuICBTSU1VTEFUSU9OX0NBVEFMT0csXG4gIFNJTVVMQVRJT05fQ0FUQUxPR19VUERBVEVEX0FULFxuICBTSU1VTEFUSU9OX1NUQUdFUyxcbiAgZ2V0UmVsb2FkU2ltdWxhdGlvbixcbn0gZnJvbSAnLi4vLi4vZGF0YS9zaW11bGF0aW9uQ2F0YWxvZy5qcyc7XG5pbXBvcnQgeyBJc3N1ZVBhbmVsIH0gZnJvbSAnLi9Jc3N1ZVBhbmVsLmpzeCc7XG5pbXBvcnQgeyB1c2VTaW11bGF0aW9uQWRtaW5BcGkgfSBmcm9tICcuL3VzZVNpbXVsYXRpb25BZG1pbkFwaS5qcyc7XG5pbXBvcnQgJy4vc2ltdWxhdGlvbi1sYXVuY2hwYWQuY3NzJztcblxuY29uc3QgaG9tZUhyZWYgPSBidWlsZFJvdXRlSHJlZignaG9tZScpO1xuXG5leHBvcnQgY29uc3QgU0lNVUxBVElPTl9MQVVOQ0hQQURfUk9VVEVfUlVOVElNRSA9IHt9O1xuXG5jb25zdCBGSUxURVJTID0gW1xuICB7XG4gICAgaWQ6ICdyZXZpZXcnLFxuICAgIGxhYmVsOiAnUmV2aWV3JyxcbiAgICBkZXNjcmlwdGlvbjogJ1N0ZXAgMTogY2FuZGlkYXRlcywgaXNzdWVzLCBhbmQgYmxvY2tlcnMgdGhhdCBuZWVkIGEgZGVjaXNpb24uJyxcbiAgfSxcbiAge1xuICAgIGlkOiAnY29sbGVjdGlvbicsXG4gICAgbGFiZWw6ICdDb2xsZWN0aW9uJyxcbiAgICBkZXNjcmlwdGlvbjogJ1N0ZXAgMjogYXBwcm92ZWQgc2ltdWxhdGlvbnMga2VwdCBhdmFpbGFibGUgYnV0IG91dHNpZGUgRGFpbHkgU2ltdWxhdGlvbi4nLFxuICB9LFxuICB7XG4gICAgaWQ6ICdkYWlseScsXG4gICAgbGFiZWw6ICdEYWlseSBTaW11bGF0aW9uJyxcbiAgICBkZXNjcmlwdGlvbjogJ1N0ZXAgMzogc2ltdWxhdGlvbnMgcHJvbW90ZWQgdG8gdGhlIGRhaWx5LXNlbGVjdGVkIGhvbWVwYWdlIHNldC4nLFxuICB9LFxuICB7XG4gICAgaWQ6ICdoaWRkZW4nLFxuICAgIGxhYmVsOiAnQXJjaGl2ZScsXG4gICAgZGVzY3JpcHRpb246ICdTdGVwIDQ6IHJldGlyZWQgc2ltdWxhdGlvbnMga2VwdCBpbiB0aGUgcmVwbyBidXQgb3V0IG9mIG5vcm1hbCBtYW5hZ2VtZW50LicsXG4gIH0sXG5dO1xuXG5jb25zdCBTVEFHRV9MQUJFTFMgPSB7XG4gIFtTSU1VTEFUSU9OX1NUQUdFUy5EQUlMWV9ST1RBVElPTl06ICdEYWlseSBTaW11bGF0aW9uJyxcbiAgW1NJTVVMQVRJT05fU1RBR0VTLkNPTExFQ1RJT05dOiAnQ29sbGVjdGlvbicsXG4gIFtTSU1VTEFUSU9OX1NUQUdFUy5BVVRPTUFUSU9OX0NBTkRJREFURV06ICdBdXRvbWF0aW9uIENhbmRpZGF0ZScsXG4gIFtTSU1VTEFUSU9OX1NUQUdFUy5ISURERU5dOiAnQXJjaGl2ZScsXG59O1xuXG5jb25zdCBTVEFHRV9UT19GSUxURVIgPSB7XG4gIFtTSU1VTEFUSU9OX1NUQUdFUy5EQUlMWV9ST1RBVElPTl06ICdkYWlseScsXG4gIFtTSU1VTEFUSU9OX1NUQUdFUy5DT0xMRUNUSU9OXTogJ2NvbGxlY3Rpb24nLFxuICBbU0lNVUxBVElPTl9TVEFHRVMuQVVUT01BVElPTl9DQU5ESURBVEVdOiAnY2FuZGlkYXRlcycsXG4gIFtTSU1VTEFUSU9OX1NUQUdFUy5ISURERU5dOiAnaGlkZGVuJyxcbn07XG5cbmNvbnN0IFJFVklFV19TVEFUVVNfUFJJT1JJVFkgPSB7XG4gIGNhbmRpZGF0ZTogMzYsXG4gIG5ldzogMzAsXG4gIHdhdGNoOiAyMixcbiAgc3RhYmxlOiA4LFxuICBpbnRlcm5hbDogNCxcbn07XG5cbmNvbnN0IFJFVklFV19BQ1RJT05TID0gW1xuICB7IGlkOiAnc3RhYmxlJywgbGFiZWw6ICdSZXZpZXdlZCcsIGljb246IENoZWNrIH0sXG4gIHsgaWQ6ICd3YXRjaCcsIGxhYmVsOiAnV2F0Y2gnLCBpY29uOiBFeWUgfSxcbiAgeyBpZDogJ2NhbmRpZGF0ZScsIGxhYmVsOiAnQ2FuZGlkYXRlJywgaWNvbjogU3RhciB9LFxuXTtcblxuYXN5bmMgZnVuY3Rpb24gcmVhZERhc2hib2FyZFN0YXR1cygpIHtcbiAgY29uc3QgcmVzcG9uc2UgPSBhd2FpdCBmZXRjaCgnL2FwaS9zaW11bGF0aW9ucy9zdGF0dXMnKTtcbiAgcmV0dXJuIHJlc3BvbnNlLm9rID8gcmVzcG9uc2UuanNvbigpIDogbnVsbDtcbn1cblxuZnVuY3Rpb24gZ2V0U3RhdHVzKHN0YXR1c0J5SWQsIGVudHJ5KSB7XG4gIHJldHVybiBzdGF0dXNCeUlkW2VudHJ5LmlkXSB8fCB7XG4gICAgaXNzdWVDb3VudDogMCxcbiAgICBpc3N1ZXM6IFtdLFxuICAgIGFjdGl2aXR5OiBbXSxcbiAgICBwcmV2aWV3OiB7IHBvc3RlcjogbnVsbCwgYW5pbWF0ZWQ6IG51bGwgfSxcbiAgICBwaXRjaDogZW50cnkucGl0Y2hQYXRoID8geyBwYXRoOiBlbnRyeS5waXRjaFBhdGgsIHByZXNlbnQ6IG51bGwgfSA6IG51bGwsXG4gICAgdmFsaWRhdGlvbjogJ3Vua25vd24nLFxuICAgIGJsb2NrZXJzOiBbXSxcbiAgfTtcbn1cblxuZnVuY3Rpb24gZ2V0U2ltdWxhdGlvbkNvdW50cyhzaW11bGF0aW9ucykge1xuICByZXR1cm4gc2ltdWxhdGlvbnMucmVkdWNlKChjb3VudHMsIGl0ZW0pID0+IHtcbiAgICBjb3VudHMudG90YWwgKz0gMTtcbiAgICBjb3VudHNbaXRlbS5zdGFnZV0gPSAoY291bnRzW2l0ZW0uc3RhZ2VdIHx8IDApICsgMTtcbiAgICBpZiAoaXRlbS5pc3N1ZUNvdW50ID4gMCkgY291bnRzLmlzc3VlcyArPSAxO1xuICAgIGlmIChpdGVtLmhhc01pc3NpbmdBc3NldHMpIGNvdW50cy5taXNzaW5nICs9IDE7XG4gICAgaWYgKGl0ZW0uaXNSZXZpZXdRdWV1ZSkgY291bnRzLnJldmlldyArPSAxO1xuICAgIGlmIChpdGVtLnZhbGlkYXRpb24gPT09ICdwYXNzaW5nJykgY291bnRzLnBhc3NpbmcgKz0gMTtcbiAgICByZXR1cm4gY291bnRzO1xuICB9LCB7XG4gICAgdG90YWw6IDAsXG4gICAgaXNzdWVzOiAwLFxuICAgIG1pc3Npbmc6IDAsXG4gICAgcGFzc2luZzogMCxcbiAgICByZXZpZXc6IDAsXG4gIH0pO1xufVxuXG5mdW5jdGlvbiBidWlsZFNpbXVsYXRpb25WaWV3TW9kZWxzKHNpbXVsYXRpb25zLCBzdGF0dXNCeUlkLCBzdGF0dXNSZWFkeSkge1xuICByZXR1cm4gc2ltdWxhdGlvbnMubWFwKChlbnRyeSkgPT4ge1xuICAgIGNvbnN0IHN0YXR1cyA9IGdldFN0YXR1cyhzdGF0dXNCeUlkLCBlbnRyeSk7XG4gICAgY29uc3QgaXNBcmNoaXZlZCA9IGVudHJ5LnN0YWdlID09PSBTSU1VTEFUSU9OX1NUQUdFUy5ISURERU47XG4gICAgY29uc3QgbWlzc2luZ1ByZXZpZXcgPSBzdGF0dXNSZWFkeSAmJiAhaXNBcmNoaXZlZCAmJiAoXG4gICAgICBzdGF0dXMucHJldmlldz8ucG9zdGVyID09PSBmYWxzZSB8fCBzdGF0dXMucHJldmlldz8uYW5pbWF0ZWQgPT09IGZhbHNlXG4gICAgKTtcbiAgICBjb25zdCBtaXNzaW5nUGl0Y2ggPSBzdGF0dXNSZWFkeSAmJiAhaXNBcmNoaXZlZCAmJiBzdGF0dXMucGl0Y2ggJiYgc3RhdHVzLnBpdGNoLnByZXNlbnQgPT09IGZhbHNlO1xuICAgIGNvbnN0IGhhc01pc3NpbmdBc3NldHMgPSBCb29sZWFuKG1pc3NpbmdQcmV2aWV3IHx8IG1pc3NpbmdQaXRjaCB8fCBzdGF0dXMuYmxvY2tlcnM/Lmxlbmd0aCk7XG4gICAgY29uc3QgaXNzdWVDb3VudCA9IHN0YXR1cy5pc3N1ZUNvdW50IHx8IDA7XG4gICAgY29uc3QgdmFsaWRhdGlvbiA9IHN0YXR1cy52YWxpZGF0aW9uIHx8IChzdGF0dXNSZWFkeSA/ICdwYXNzaW5nJyA6ICd1bmtub3duJyk7XG4gICAgY29uc3QgaXNSZXZpZXdRdWV1ZSA9ICFpc0FyY2hpdmVkICYmIChcbiAgICAgIGVudHJ5LnN0YWdlID09PSBTSU1VTEFUSU9OX1NUQUdFUy5BVVRPTUFUSU9OX0NBTkRJREFURVxuICAgICAgfHwgWydjYW5kaWRhdGUnLCAnd2F0Y2gnLCAnbmV3J10uaW5jbHVkZXMoZW50cnkucmV2aWV3U3RhdHVzKVxuICAgICAgfHwgaXNzdWVDb3VudCA+IDBcbiAgICAgIHx8IGhhc01pc3NpbmdBc3NldHNcbiAgICApO1xuXG4gICAgcmV0dXJuIHtcbiAgICAgIC4uLmVudHJ5LFxuICAgICAgc3RhdHVzLFxuICAgICAgaXNzdWVDb3VudCxcbiAgICAgIHZhbGlkYXRpb24sXG4gICAgICBoYXNNaXNzaW5nQXNzZXRzLFxuICAgICAgaXNSZXZpZXdRdWV1ZSxcbiAgICB9O1xuICB9KTtcbn1cblxuZnVuY3Rpb24gZmlsdGVyU2ltdWxhdGlvbnMoc2ltdWxhdGlvbnMsIGFjdGl2ZUZpbHRlciwgcXVlcnkpIHtcbiAgY29uc3QgbmVlZGxlID0gcXVlcnkudHJpbSgpLnRvTG93ZXJDYXNlKCk7XG4gIHJldHVybiBzaW11bGF0aW9ucy5maWx0ZXIoKGVudHJ5KSA9PiB7XG4gICAgY29uc3QgbWF0Y2hlc0ZpbHRlciA9IChcbiAgICAgIChhY3RpdmVGaWx0ZXIgPT09ICdyZXZpZXcnICYmIGVudHJ5LmlzUmV2aWV3UXVldWUpXG4gICAgICB8fCBTVEFHRV9UT19GSUxURVJbZW50cnkuc3RhZ2VdID09PSBhY3RpdmVGaWx0ZXJcbiAgICApO1xuICAgIGNvbnN0IG1hdGNoZXNRdWVyeSA9ICFuZWVkbGVcbiAgICAgIHx8IFN0cmluZyhlbnRyeS5uYW1lIHx8ICcnKS50b0xvd2VyQ2FzZSgpLmluY2x1ZGVzKG5lZWRsZSlcbiAgICAgIHx8IFN0cmluZyhlbnRyeS5pZCB8fCAnJykudG9Mb3dlckNhc2UoKS5pbmNsdWRlcyhuZWVkbGUpXG4gICAgICB8fCBTdHJpbmcoZW50cnkuY2hhcHRlciB8fCAnJykudG9Mb3dlckNhc2UoKS5pbmNsdWRlcyhuZWVkbGUpXG4gICAgICB8fCBTdHJpbmcoZW50cnkuc3VyZmFjZSB8fCAnJykudG9Mb3dlckNhc2UoKS5pbmNsdWRlcyhuZWVkbGUpXG4gICAgICB8fCBTdHJpbmcoZW50cnkub3JpZ2luIHx8ICcnKS50b0xvd2VyQ2FzZSgpLmluY2x1ZGVzKG5lZWRsZSk7XG4gICAgcmV0dXJuIG1hdGNoZXNGaWx0ZXIgJiYgbWF0Y2hlc1F1ZXJ5O1xuICB9KTtcbn1cblxuZnVuY3Rpb24gZ2V0RmlsdGVyQ291bnQoZmlsdGVySWQsIGNvdW50cykge1xuICBpZiAoZmlsdGVySWQgPT09ICdyZXZpZXcnKSByZXR1cm4gY291bnRzLnJldmlldztcblxuICBjb25zdCBzdGFnZSA9IE9iamVjdC5rZXlzKFNUQUdFX1RPX0ZJTFRFUikuZmluZCgoa2V5KSA9PiBTVEFHRV9UT19GSUxURVJba2V5XSA9PT0gZmlsdGVySWQpO1xuICByZXR1cm4gc3RhZ2UgPyBjb3VudHNbc3RhZ2VdIHx8IDAgOiAwO1xufVxuXG5mdW5jdGlvbiBnZXRSZXZpZXdQcmlvcml0eShlbnRyeSkge1xuICBsZXQgcHJpb3JpdHkgPSBSRVZJRVdfU1RBVFVTX1BSSU9SSVRZW2VudHJ5LnJldmlld1N0YXR1c10gfHwgMDtcbiAgaWYgKGVudHJ5LnN0YWdlID09PSBTSU1VTEFUSU9OX1NUQUdFUy5BVVRPTUFUSU9OX0NBTkRJREFURSkgcHJpb3JpdHkgKz0gNDg7XG4gIGlmIChlbnRyeS5pc3N1ZUNvdW50ID4gMCkgcHJpb3JpdHkgKz0gNDIgKyBlbnRyeS5pc3N1ZUNvdW50O1xuICBpZiAoZW50cnkuaGFzTWlzc2luZ0Fzc2V0cykgcHJpb3JpdHkgKz0gMzY7XG4gIGlmIChlbnRyeS5zdGFnZSA9PT0gU0lNVUxBVElPTl9TVEFHRVMuSElEREVOKSBwcmlvcml0eSAtPSA4MDtcbiAgcmV0dXJuIHByaW9yaXR5O1xufVxuXG5mdW5jdGlvbiBzb3J0U2ltdWxhdGlvbnNCeVByaW9yaXR5KHNpbXVsYXRpb25zKSB7XG4gIHJldHVybiBbLi4uc2ltdWxhdGlvbnNdLnNvcnQoKGEsIGIpID0+IHtcbiAgICBjb25zdCBwcmlvcml0eURpZmYgPSBnZXRSZXZpZXdQcmlvcml0eShiKSAtIGdldFJldmlld1ByaW9yaXR5KGEpO1xuICAgIGlmIChwcmlvcml0eURpZmYgIT09IDApIHJldHVybiBwcmlvcml0eURpZmY7XG4gICAgcmV0dXJuIGEubmFtZS5sb2NhbGVDb21wYXJlKGIubmFtZSk7XG4gIH0pO1xufVxuXG5mdW5jdGlvbiBmb3JtYXREYXRlKHZhbHVlKSB7XG4gIGlmICghdmFsdWUpIHJldHVybiAnVW50cmFja2VkJztcbiAgcmV0dXJuIHZhbHVlO1xufVxuXG5mdW5jdGlvbiBTdGF0dXNQaWxsKHsga2luZCwgY2hpbGRyZW4gfSkge1xuICByZXR1cm4gKFxuICAgIDxzcGFuIGNsYXNzTmFtZT17YHNpbXVsYXRpb24tZGFzaGJvYXJkLXBpbGwgc2ltdWxhdGlvbi1kYXNoYm9hcmQtcGlsbC0tJHtraW5kfWB9PlxuICAgICAge2NoaWxkcmVufVxuICAgIDwvc3Bhbj5cbiAgKTtcbn1cblxuZnVuY3Rpb24gZ2V0VG9vbHRpcENsYXNzTmFtZShwbGFjZW1lbnQpIHtcbiAgcmV0dXJuIHBsYWNlbWVudCA/IGAgc2ltdWxhdGlvbi1kYXNoYm9hcmQtdG9vbHRpcC0tJHtwbGFjZW1lbnR9YCA6ICcnO1xufVxuXG5mdW5jdGlvbiBEYXNoYm9hcmRCdXR0b24oe1xuICBjbGFzc05hbWUgPSAnJyxcbiAgZGlzYWJsZWQgPSBmYWxzZSxcbiAgaWNvbjogSWNvbixcbiAgbGFiZWwsXG4gIHRvb2x0aXAsXG4gIHRvb2x0aXBQbGFjZW1lbnQsXG4gIHRpdGxlLFxuICB0eXBlID0gJ2J1dHRvbicsXG4gIG9uQ2xpY2ssXG59KSB7XG4gIHJldHVybiAoXG4gICAgPGJ1dHRvblxuICAgICAgY2xhc3NOYW1lPXtgc2ltdWxhdGlvbi1kYXNoYm9hcmQtYnV0dG9uICR7Y2xhc3NOYW1lfSR7Z2V0VG9vbHRpcENsYXNzTmFtZSh0b29sdGlwUGxhY2VtZW50KX1gLnRyaW0oKX1cbiAgICAgIHR5cGU9e3R5cGV9XG4gICAgICBkYXRhLXRvb2x0aXA9e3Rvb2x0aXAgfHwgdGl0bGUgfHwgbGFiZWx9XG4gICAgICBhcmlhLWxhYmVsPXt0aXRsZSB8fCBsYWJlbH1cbiAgICAgIGRpc2FibGVkPXtkaXNhYmxlZH1cbiAgICAgIG9uQ2xpY2s9e29uQ2xpY2t9XG4gICAgPlxuICAgICAge0ljb24gPyA8SWNvbiBhcmlhLWhpZGRlbj1cInRydWVcIiBzaXplPXsxNn0gc3Ryb2tlV2lkdGg9ezJ9IC8+IDogbnVsbH1cbiAgICAgIDxzcGFuPntsYWJlbH08L3NwYW4+XG4gICAgPC9idXR0b24+XG4gICk7XG59XG5cbmZ1bmN0aW9uIERhc2hib2FyZEljb25CdXR0b24oe1xuICBhczogQ29tcG9uZW50ID0gJ2J1dHRvbicsXG4gIGNsYXNzTmFtZSA9ICcnLFxuICBkaXNhYmxlZCA9IGZhbHNlLFxuICBocmVmLFxuICBpY29uOiBJY29uLFxuICBsYWJlbCxcbiAgb25DbGljayxcbiAgdGFyZ2V0LFxuICB0b29sdGlwUGxhY2VtZW50ID0gJ2Fib3ZlLWVuZCcsXG4gIHJlbCxcbn0pIHtcbiAgY29uc3QgcHJvcHMgPSBDb21wb25lbnQgPT09ICdhJ1xuICAgID8geyBocmVmLCB0YXJnZXQsIHJlbCB9XG4gICAgOiB7IHR5cGU6ICdidXR0b24nLCBkaXNhYmxlZCB9O1xuICBjb25zdCBpY29uTm9kZSA9IEljb24gPyA8SWNvbiBhcmlhLWhpZGRlbj1cInRydWVcIiBzaXplPXsxNn0gc3Ryb2tlV2lkdGg9ezJ9IC8+IDogbnVsbDtcblxuICByZXR1cm4gKFxuICAgIDxDb21wb25lbnRcbiAgICAgIHsuLi5wcm9wc31cbiAgICAgIGNsYXNzTmFtZT17YHNpbXVsYXRpb24tZGFzaGJvYXJkLWljb24tYnV0dG9uICR7Y2xhc3NOYW1lfSR7Z2V0VG9vbHRpcENsYXNzTmFtZSh0b29sdGlwUGxhY2VtZW50KX1gLnRyaW0oKX1cbiAgICAgIGRhdGEtdG9vbHRpcD17bGFiZWx9XG4gICAgICBhcmlhLWxhYmVsPXtsYWJlbH1cbiAgICAgIG9uQ2xpY2s9e29uQ2xpY2t9XG4gICAgPlxuICAgICAge2ljb25Ob2RlfVxuICAgIDwvQ29tcG9uZW50PlxuICApO1xufVxuXG5mdW5jdGlvbiBEYXNoYm9hcmRUaHVtYm5haWwoeyBlbnRyeSwgcGxheUFuaW1hdGVkID0gZmFsc2UsIHNpemUgPSAnY29tcGFjdCcgfSkge1xuICBjb25zdCBbaG92ZXJpbmcsIHNldEhvdmVyaW5nXSA9IHVzZVN0YXRlKGZhbHNlKTtcbiAgY29uc3QgW2FuaW1hdGVkRmFpbGVkLCBzZXRBbmltYXRlZEZhaWxlZF0gPSB1c2VTdGF0ZShmYWxzZSk7XG4gIGNvbnN0IFtwb3N0ZXJGYWlsZWQsIHNldFBvc3RlckZhaWxlZF0gPSB1c2VTdGF0ZShmYWxzZSk7XG4gIGNvbnN0IGFuaW1hdGVkU3JjID0gZW50cnkucHJldmlldz8uYW5pbWF0ZWQ7XG4gIGNvbnN0IHBvc3RlclNyYyA9IGVudHJ5LnByZXZpZXc/LnBvc3RlcjtcbiAgY29uc3Qgc2hvdWxkUGxheUFuaW1hdGVkID0gcGxheUFuaW1hdGVkIHx8IGhvdmVyaW5nO1xuICBjb25zdCBzcmMgPSBzaG91bGRQbGF5QW5pbWF0ZWQgJiYgYW5pbWF0ZWRTcmMgJiYgIWFuaW1hdGVkRmFpbGVkID8gYW5pbWF0ZWRTcmMgOiBwb3N0ZXJTcmM7XG5cbiAgcmV0dXJuIChcbiAgICA8ZGl2XG4gICAgICBjbGFzc05hbWU9e2BzaW11bGF0aW9uLWRhc2hib2FyZC10aHVtYiBzaW11bGF0aW9uLWRhc2hib2FyZC10aHVtYi0tJHtzaXplfWB9XG4gICAgICBvbk1vdXNlRW50ZXI9eygpID0+IHNldEhvdmVyaW5nKHRydWUpfVxuICAgICAgb25Nb3VzZUxlYXZlPXsoKSA9PiBzZXRIb3ZlcmluZyhmYWxzZSl9XG4gICAgPlxuICAgICAgeyFwb3N0ZXJGYWlsZWQgJiYgc3JjID8gKFxuICAgICAgICA8aW1nXG4gICAgICAgICAgc3JjPXtzcmN9XG4gICAgICAgICAgYWx0PVwiXCJcbiAgICAgICAgICBsb2FkaW5nPVwibGF6eVwiXG4gICAgICAgICAgb25FcnJvcj17KCkgPT4ge1xuICAgICAgICAgICAgaWYgKHNyYyA9PT0gYW5pbWF0ZWRTcmMpIHtcbiAgICAgICAgICAgICAgc2V0QW5pbWF0ZWRGYWlsZWQodHJ1ZSk7XG4gICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHNldFBvc3RlckZhaWxlZCh0cnVlKTtcbiAgICAgICAgICB9fVxuICAgICAgICAvPlxuICAgICAgKSA6IChcbiAgICAgICAgPHNwYW4gYXJpYS1oaWRkZW49XCJ0cnVlXCIgLz5cbiAgICAgICl9XG4gICAgICB7YW5pbWF0ZWRTcmMgPyA8ZW0+R0lGPC9lbT4gOiBudWxsfVxuICAgIDwvZGl2PlxuICApO1xufVxuXG5mdW5jdGlvbiBIZWFkZXJBY3Rpb25zKHsgb25CdWlsZCwgb25WYWxpZGF0ZSwgcGVuZGluZ0FjdGlvbiB9KSB7XG4gIHJldHVybiAoXG4gICAgPGRpdiBjbGFzc05hbWU9XCJzaW11bGF0aW9uLWRhc2hib2FyZC1oZWFkZXJfX2FjdGlvbnNcIj5cbiAgICAgIDxhXG4gICAgICAgIGNsYXNzTmFtZT1cInNpbXVsYXRpb24tZGFzaGJvYXJkLWJ1dHRvbiBzaW11bGF0aW9uLWRhc2hib2FyZC1idXR0b24tLWdob3N0IHNpbXVsYXRpb24tZGFzaGJvYXJkLXRvb2x0aXAtLWJlbG93LWVuZFwiXG4gICAgICAgIGhyZWY9e2hvbWVIcmVmfVxuICAgICAgICBkYXRhLXRvb2x0aXA9XCJSZXR1cm4gdG8gdGhlIGN1cnJlbnQgZGV2ZWxvcG1lbnQgc2l0ZVwiXG4gICAgICAgIGFyaWEtbGFiZWw9XCJPcGVuIGRldmVsb3BtZW50IHNpdGVcIlxuICAgICAgPlxuICAgICAgICA8QXJyb3dMZWZ0IGFyaWEtaGlkZGVuPVwidHJ1ZVwiIHNpemU9ezE2fSBzdHJva2VXaWR0aD17Mn0gLz5cbiAgICAgICAgPHNwYW4+RGV2IFNpdGU8L3NwYW4+XG4gICAgICA8L2E+XG4gICAgICA8RGFzaGJvYXJkQnV0dG9uXG4gICAgICAgIGNsYXNzTmFtZT1cInNpbXVsYXRpb24tZGFzaGJvYXJkLWJ1dHRvbi0tZ2hvc3RcIlxuICAgICAgICBkaXNhYmxlZD17Qm9vbGVhbihwZW5kaW5nQWN0aW9uKX1cbiAgICAgICAgaWNvbj17UGFja2FnZUNoZWNrfVxuICAgICAgICBsYWJlbD17cGVuZGluZ0FjdGlvbiA9PT0gJ2J1aWxkJyA/ICdCdWlsZGluZycgOiAnQnVpbGQnfVxuICAgICAgICB0b29sdGlwPVwiUnVuIHByb2R1Y3Rpb24gYnVpbGRcIlxuICAgICAgICB0b29sdGlwUGxhY2VtZW50PVwiYmVsb3ctZW5kXCJcbiAgICAgICAgb25DbGljaz17b25CdWlsZH1cbiAgICAgIC8+XG4gICAgICA8RGFzaGJvYXJkQnV0dG9uXG4gICAgICAgIGNsYXNzTmFtZT1cInNpbXVsYXRpb24tZGFzaGJvYXJkLWJ1dHRvbi0tcHJpbWFyeVwiXG4gICAgICAgIGRpc2FibGVkPXtCb29sZWFuKHBlbmRpbmdBY3Rpb24pfVxuICAgICAgICBpY29uPXtDaGVja31cbiAgICAgICAgbGFiZWw9e3BlbmRpbmdBY3Rpb24gPT09ICd2YWxpZGF0ZScgPyAnUnVubmluZycgOiAnVmFsaWRhdGUnfVxuICAgICAgICB0b29sdGlwPVwiUnVuIHNpbXVsYXRpb24gY2F0YWxvZyB2YWxpZGF0aW9uXCJcbiAgICAgICAgdG9vbHRpcFBsYWNlbWVudD1cImJlbG93LWVuZFwiXG4gICAgICAgIG9uQ2xpY2s9e29uVmFsaWRhdGV9XG4gICAgICAvPlxuICAgIDwvZGl2PlxuICApO1xufVxuXG5mdW5jdGlvbiBnZXRQZW5kaW5nQWN0aW9uTGFiZWwocGVuZGluZ0FjdGlvbikge1xuICBpZiAoIXBlbmRpbmdBY3Rpb24pIHJldHVybiAnJztcbiAgaWYgKHBlbmRpbmdBY3Rpb24gPT09ICd2YWxpZGF0ZScpIHJldHVybiAnUnVubmluZyBjYXRhbG9nIHZhbGlkYXRpb24nO1xuICBpZiAocGVuZGluZ0FjdGlvbiA9PT0gJ2J1aWxkJykgcmV0dXJuICdVcGRhdGluZyBwcm9kdWN0aW9uIGJ1aWxkJztcbiAgaWYgKHBlbmRpbmdBY3Rpb24uc3RhcnRzV2l0aCgnaXNzdWUtJykpIHJldHVybiAnVXBkYXRpbmcgaXNzdWUgc3RhdHVzJztcbiAgaWYgKHBlbmRpbmdBY3Rpb24uc3RhcnRzV2l0aCgnZGVsZXRlLXBsYW4tJykpIHJldHVybiAnUHJlcGFyaW5nIGRlbGV0ZSBwbGFuJztcbiAgaWYgKHBlbmRpbmdBY3Rpb24uc3RhcnRzV2l0aCgnZGVsZXRlLScpKSByZXR1cm4gJ0RlbGV0aW5nIHNpbXVsYXRpb24nO1xuICByZXR1cm4gJ1dvcmtpbmcnO1xufVxuXG5mdW5jdGlvbiBJbmxpbmVOb3RpY2UoeyBub3RpY2UsIHBlbmRpbmdBY3Rpb24gfSkge1xuICBjb25zdCBydW5uaW5nTGFiZWwgPSBnZXRQZW5kaW5nQWN0aW9uTGFiZWwocGVuZGluZ0FjdGlvbik7XG4gIGNvbnN0IHRpdGxlID0gcnVubmluZ0xhYmVsIHx8IG5vdGljZT8udGl0bGU7XG4gIGlmICghdGl0bGUgJiYgIW5vdGljZT8uZGV0YWlsKSByZXR1cm4gbnVsbDtcblxuICBjb25zdCB0b25lID0gcGVuZGluZ0FjdGlvbiA/ICdydW5uaW5nJyA6IG5vdGljZT8udG9uZSB8fCAnaW5mbyc7XG4gIGNvbnN0IGRldGFpbCA9IHBlbmRpbmdBY3Rpb25cbiAgICA/ICdSdW5uaW5nIGFnYWluc3QgdGhlIGxvY2FsIGRldiBBUEkuJ1xuICAgIDogbm90aWNlPy5kZXRhaWw7XG4gIGNvbnN0IEljb24gPSBwZW5kaW5nQWN0aW9uID8gTG9hZGVyQ2lyY2xlIDogQ2hlY2s7XG5cbiAgcmV0dXJuIChcbiAgICA8ZGl2IGNsYXNzTmFtZT17YHNpbXVsYXRpb24tZGFzaGJvYXJkLWlubGluZS1ub3RpY2Ugc2ltdWxhdGlvbi1kYXNoYm9hcmQtaW5saW5lLW5vdGljZS0tJHt0b25lfWB9IHJvbGU9XCJzdGF0dXNcIj5cbiAgICAgIDxJY29uIGNsYXNzTmFtZT17cGVuZGluZ0FjdGlvbiA/ICdpcy1zcGlubmluZycgOiAnJ30gYXJpYS1oaWRkZW49XCJ0cnVlXCIgc2l6ZT17MTR9IHN0cm9rZVdpZHRoPXsyfSAvPlxuICAgICAgPGRpdj5cbiAgICAgICAgPHN0cm9uZz57dGl0bGV9PC9zdHJvbmc+XG4gICAgICAgIHtkZXRhaWwgPyA8c3Bhbj57ZGV0YWlsfTwvc3Bhbj4gOiBudWxsfVxuICAgICAgPC9kaXY+XG4gICAgPC9kaXY+XG4gICk7XG59XG5cbmZ1bmN0aW9uIFN1bW1hcnlTdHJpcCh7IGNvdW50cywgcmVsb2FkU2ltdWxhdGlvbiwgc3RhdHVzUmVhZHkgfSkge1xuICBjb25zdCB2YWxpZGF0aW9uUGVyY2VudCA9IGNvdW50cy50b3RhbCA/IE1hdGgucm91bmQoKGNvdW50cy5wYXNzaW5nIC8gY291bnRzLnRvdGFsKSAqIDEwMCkgOiAwO1xuICBjb25zdCBzdW1tYXJ5ID0gW1xuICAgIHsgbGFiZWw6ICdUb3RhbCcsIHZhbHVlOiBjb3VudHMudG90YWwsIGRldGFpbDogJ2NhdGFsb2cnIH0sXG4gICAgeyBsYWJlbDogJ0RhaWx5JywgdmFsdWU6IGNvdW50c1tTSU1VTEFUSU9OX1NUQUdFUy5EQUlMWV9ST1RBVElPTl0gfHwgMCwgZGV0YWlsOiByZWxvYWRTaW11bGF0aW9uPy5uYW1lIHx8ICdub25lJyB9LFxuICAgIHsgbGFiZWw6ICdDYW5kaWRhdGVzJywgdmFsdWU6IGNvdW50c1tTSU1VTEFUSU9OX1NUQUdFUy5BVVRPTUFUSU9OX0NBTkRJREFURV0gfHwgMCwgZGV0YWlsOiAncmV2aWV3JyB9LFxuICAgIHsgbGFiZWw6ICdJc3N1ZXMnLCB2YWx1ZTogY291bnRzLmlzc3VlcywgZGV0YWlsOiAnb3BlbicgfSxcbiAgICB7IGxhYmVsOiAnTWlzc2luZycsIHZhbHVlOiBjb3VudHMubWlzc2luZywgZGV0YWlsOiBzdGF0dXNSZWFkeSA/ICdhc3NldHMnIDogJ3N0YXR1cyBvZmYnIH0sXG4gICAgeyBsYWJlbDogJ1ZhbGlkYXRpb24nLCB2YWx1ZTogc3RhdHVzUmVhZHkgPyBgJHt2YWxpZGF0aW9uUGVyY2VudH0lYCA6ICdMb2NhbCcsIGRldGFpbDogc3RhdHVzUmVhZHkgPyAncGFzc2luZycgOiAnY2F0YWxvZycgfSxcbiAgXTtcblxuICByZXR1cm4gKFxuICAgIDxzZWN0aW9uIGNsYXNzTmFtZT1cInNpbXVsYXRpb24tZGFzaGJvYXJkLXN1bW1hcnlcIiBhcmlhLWxhYmVsPVwiU2ltdWxhdGlvbiBzdGF0dXMgc3VtbWFyeVwiPlxuICAgICAge3N1bW1hcnkubWFwKChpdGVtKSA9PiAoXG4gICAgICAgIDxkaXYga2V5PXtpdGVtLmxhYmVsfSBjbGFzc05hbWU9XCJzaW11bGF0aW9uLWRhc2hib2FyZC1zdW1tYXJ5X19pdGVtXCI+XG4gICAgICAgICAgPHNwYW4+e2l0ZW0ubGFiZWx9PC9zcGFuPlxuICAgICAgICAgIDxzdHJvbmc+e2l0ZW0udmFsdWV9PC9zdHJvbmc+XG4gICAgICAgICAgPHA+e2l0ZW0uZGV0YWlsfTwvcD5cbiAgICAgICAgPC9kaXY+XG4gICAgICApKX1cbiAgICA8L3NlY3Rpb24+XG4gICk7XG59XG5cbmZ1bmN0aW9uIGdldEZpbHRlclRvb2x0aXBQbGFjZW1lbnQoaW5kZXgpIHtcbiAgaWYgKGluZGV4IDwgMikgcmV0dXJuICdiZWxvdy1zdGFydCc7XG4gIGlmIChpbmRleCA+IEZJTFRFUlMubGVuZ3RoIC0gMykgcmV0dXJuICdiZWxvdy1lbmQnO1xuICByZXR1cm4gJ2JlbG93Jztcbn1cblxuZnVuY3Rpb24gRmlsdGVyVG9vbGJhcih7IGFjdGl2ZUZpbHRlciwgY291bnRzLCBvbkZpbHRlckNoYW5nZSwgcXVlcnksIG9uUXVlcnlDaGFuZ2UgfSkge1xuICByZXR1cm4gKFxuICAgIDxzZWN0aW9uIGNsYXNzTmFtZT1cInNpbXVsYXRpb24tZGFzaGJvYXJkLXRvb2xiYXJcIiBhcmlhLWxhYmVsPVwiU2ltdWxhdGlvbiBmaWx0ZXJzXCI+XG4gICAgICA8ZGl2IGNsYXNzTmFtZT1cInNpbXVsYXRpb24tZGFzaGJvYXJkLXNlYXJjaFwiPlxuICAgICAgICA8U2VhcmNoIGFyaWEtaGlkZGVuPVwidHJ1ZVwiIHNpemU9ezE2fSBzdHJva2VXaWR0aD17Mn0gLz5cbiAgICAgICAgPGxhYmVsPlxuICAgICAgICAgIDxzcGFuIGNsYXNzTmFtZT1cInNpbXVsYXRpb24tZGFzaGJvYXJkLXNyXCI+U2VhcmNoIHNpbXVsYXRpb25zPC9zcGFuPlxuICAgICAgICAgIDxpbnB1dFxuICAgICAgICAgICAgdmFsdWU9e3F1ZXJ5fVxuICAgICAgICAgICAgb25DaGFuZ2U9eyhldmVudCkgPT4gb25RdWVyeUNoYW5nZShldmVudC50YXJnZXQudmFsdWUpfVxuICAgICAgICAgICAgcGxhY2Vob2xkZXI9XCJTZWFyY2ggYnkgbmFtZSwgaWQsIHNvdXJjZSwgb3Igc3RhdHVzXCJcbiAgICAgICAgICAvPlxuICAgICAgICA8L2xhYmVsPlxuICAgICAgPC9kaXY+XG5cbiAgICAgIDxuYXYgY2xhc3NOYW1lPVwic2ltdWxhdGlvbi1kYXNoYm9hcmQtZmlsdGVyLWxpc3RcIiBhcmlhLWxhYmVsPVwiUXVldWVzXCI+XG4gICAgICAgIHtGSUxURVJTLm1hcCgoZmlsdGVyLCBpbmRleCkgPT4ge1xuICAgICAgICAgIGNvbnN0IGNvdW50ID0gZ2V0RmlsdGVyQ291bnQoZmlsdGVyLmlkLCBjb3VudHMpO1xuICAgICAgICAgIGNvbnN0IHRvb2x0aXBQbGFjZW1lbnQgPSBnZXRGaWx0ZXJUb29sdGlwUGxhY2VtZW50KGluZGV4KTtcbiAgICAgICAgICByZXR1cm4gKFxuICAgICAgICAgICAgPGJ1dHRvblxuICAgICAgICAgICAgICBrZXk9e2ZpbHRlci5pZH1cbiAgICAgICAgICAgICAgdHlwZT1cImJ1dHRvblwiXG4gICAgICAgICAgICAgIGNsYXNzTmFtZT17YCR7YWN0aXZlRmlsdGVyID09PSBmaWx0ZXIuaWQgPyAnaXMtYWN0aXZlICcgOiAnJ31zaW11bGF0aW9uLWRhc2hib2FyZC10b29sdGlwLS0ke3Rvb2x0aXBQbGFjZW1lbnR9YC50cmltKCl9XG4gICAgICAgICAgICAgIGRhdGEtdG9vbHRpcD17YCR7ZmlsdGVyLmRlc2NyaXB0aW9ufSAke2NvdW50fSBzaW11bGF0aW9ucy5gfVxuICAgICAgICAgICAgICBvbkNsaWNrPXsoKSA9PiBvbkZpbHRlckNoYW5nZShmaWx0ZXIuaWQpfVxuICAgICAgICAgICAgPlxuICAgICAgICAgICAgICA8c3Bhbj57ZmlsdGVyLmxhYmVsfTwvc3Bhbj5cbiAgICAgICAgICAgICAgPHN0cm9uZz57Y291bnR9PC9zdHJvbmc+XG4gICAgICAgICAgICA8L2J1dHRvbj5cbiAgICAgICAgICApO1xuICAgICAgICB9KX1cbiAgICAgIDwvbmF2PlxuICAgIDwvc2VjdGlvbj5cbiAgKTtcbn1cblxuZnVuY3Rpb24gRGV0YWlsUm93KHsgbGFiZWwsIGNoaWxkcmVuIH0pIHtcbiAgcmV0dXJuIChcbiAgICA8ZGl2IGNsYXNzTmFtZT1cInNpbXVsYXRpb24tZGFzaGJvYXJkLWRldGFpbC1yb3dcIj5cbiAgICAgIDxkdD57bGFiZWx9PC9kdD5cbiAgICAgIDxkZD57Y2hpbGRyZW59PC9kZD5cbiAgICA8L2Rpdj5cbiAgKTtcbn1cblxuZnVuY3Rpb24gSXNzdWVMaXN0KHsgaXNzdWVzLCBvbklzc3VlU3RhdHVzQ2hhbmdlLCBwZW5kaW5nQWN0aW9uIH0pIHtcbiAgaWYgKCFpc3N1ZXM/Lmxlbmd0aCkgcmV0dXJuIG51bGw7XG5cbiAgcmV0dXJuIChcbiAgICA8c2VjdGlvbiBjbGFzc05hbWU9XCJzaW11bGF0aW9uLWRhc2hib2FyZC1zZWN0aW9uIHNpbXVsYXRpb24tZGFzaGJvYXJkLWlzc3Vlc1wiPlxuICAgICAgPGgzPklzc3VlczwvaDM+XG4gICAgICA8dWw+XG4gICAgICAgIHtpc3N1ZXMubWFwKChpc3N1ZSkgPT4ge1xuICAgICAgICAgIGNvbnN0IGlzT3BlbiA9ICFbJ3Jlc29sdmVkJywgJ2Nsb3NlZCddLmluY2x1ZGVzKFN0cmluZyhpc3N1ZS5zdGF0dXMgfHwgJycpLnRvTG93ZXJDYXNlKCkpO1xuICAgICAgICAgIHJldHVybiAoXG4gICAgICAgICAgICA8bGkga2V5PXtpc3N1ZS5maWxlTmFtZX0+XG4gICAgICAgICAgICAgIDxkaXY+XG4gICAgICAgICAgICAgICAgPHN0cm9uZz57aXNzdWUudGl0bGV9PC9zdHJvbmc+XG4gICAgICAgICAgICAgICAgPHNwYW4+e2lzc3VlLnNldmVyaXR5fSDCtyB7aXNzdWUuc3RhdHVzfSDCtyB7Zm9ybWF0RGF0ZShpc3N1ZS5yZXBvcnRlZEF0Py5zbGljZSgwLCAxMCkpfTwvc3Bhbj5cbiAgICAgICAgICAgICAgICA8c21hbGw+e2lzc3VlLnJlbGF0aXZlUGF0aH08L3NtYWxsPlxuICAgICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgICAgPERhc2hib2FyZEljb25CdXR0b25cbiAgICAgICAgICAgICAgICBkaXNhYmxlZD17Qm9vbGVhbihwZW5kaW5nQWN0aW9uKX1cbiAgICAgICAgICAgICAgICBpY29uPXtpc09wZW4gPyBDaGVjayA6IFJvdGF0ZUNjd31cbiAgICAgICAgICAgICAgICBsYWJlbD17aXNPcGVuID8gYFJlc29sdmUgaXNzdWU6ICR7aXNzdWUudGl0bGV9YCA6IGBSZW9wZW4gaXNzdWU6ICR7aXNzdWUudGl0bGV9YH1cbiAgICAgICAgICAgICAgICBvbkNsaWNrPXsoKSA9PiBvbklzc3VlU3RhdHVzQ2hhbmdlKGlzc3VlLCBpc09wZW4gPyAncmVzb2x2ZWQnIDogJ29wZW4nKX1cbiAgICAgICAgICAgICAgLz5cbiAgICAgICAgICAgIDwvbGk+XG4gICAgICAgICAgKTtcbiAgICAgICAgfSl9XG4gICAgICA8L3VsPlxuICAgIDwvc2VjdGlvbj5cbiAgKTtcbn1cblxuZnVuY3Rpb24gZm9ybWF0QWN0aXZpdHlMYWJlbChldmVudCkge1xuICBpZiAoZXZlbnQudHlwZSA9PT0gJ3N0YWdlLWNoYW5nZScpIHJldHVybiBgU3RhZ2UgJHtldmVudC5mcm9tfSB0byAke2V2ZW50LnRvfWA7XG4gIGlmIChldmVudC50eXBlID09PSAncmV2aWV3LXN0YXR1cy1jaGFuZ2UnKSByZXR1cm4gYFJldmlldyAke2V2ZW50LmZyb219IHRvICR7ZXZlbnQudG99YDtcbiAgaWYgKGV2ZW50LnR5cGUgPT09ICdpc3N1ZS1jcmVhdGVkJykgcmV0dXJuIGBJc3N1ZSBsb2dnZWQgwrcgJHtldmVudC50aXRsZX1gO1xuICBpZiAoZXZlbnQudHlwZSA9PT0gJ2lzc3VlLXN0YXR1cy1jaGFuZ2UnKSByZXR1cm4gYElzc3VlICR7ZXZlbnQuc3RhdHVzfWA7XG4gIHJldHVybiBldmVudC50eXBlIHx8ICdBY3Rpdml0eSc7XG59XG5cbmZ1bmN0aW9uIGZvcm1hdEFjdGl2aXR5RGV0YWlsKGV2ZW50KSB7XG4gIGNvbnN0IHBhcnRzID0gW107XG4gIGlmIChldmVudC5pc3N1ZSkgcGFydHMucHVzaChldmVudC5pc3N1ZSk7XG4gIGlmIChldmVudC5zZXZlcml0eSkgcGFydHMucHVzaChgc2V2ZXJpdHkgJHtldmVudC5zZXZlcml0eX1gKTtcbiAgaWYgKGV2ZW50LnN0YXR1cykgcGFydHMucHVzaChgc3RhdHVzICR7ZXZlbnQuc3RhdHVzfWApO1xuICByZXR1cm4gcGFydHMuam9pbignIMK3ICcpO1xufVxuXG5mdW5jdGlvbiBBY3Rpdml0eUxpc3QoeyBhY3Rpdml0eSB9KSB7XG4gIGlmICghYWN0aXZpdHk/Lmxlbmd0aCkgcmV0dXJuIG51bGw7XG5cbiAgcmV0dXJuIChcbiAgICA8c2VjdGlvbiBjbGFzc05hbWU9XCJzaW11bGF0aW9uLWRhc2hib2FyZC1zZWN0aW9uIHNpbXVsYXRpb24tZGFzaGJvYXJkLWFjdGl2aXR5XCI+XG4gICAgICA8aDM+QWN0aXZpdHkgTG9nIDxzcGFuPnthY3Rpdml0eS5sZW5ndGh9PC9zcGFuPjwvaDM+XG4gICAgICA8b2w+XG4gICAgICAgIHthY3Rpdml0eS5tYXAoKGV2ZW50LCBpbmRleCkgPT4ge1xuICAgICAgICAgIGNvbnN0IGRldGFpbCA9IGZvcm1hdEFjdGl2aXR5RGV0YWlsKGV2ZW50KTtcbiAgICAgICAgICByZXR1cm4gKFxuICAgICAgICAgICAgPGxpIGtleT17YCR7ZXZlbnQuYXR9LSR7ZXZlbnQudHlwZX0tJHtldmVudC5pc3N1ZSB8fCBldmVudC50byB8fCBpbmRleH1gfT5cbiAgICAgICAgICAgICAgPGRpdj5cbiAgICAgICAgICAgICAgICA8c3Bhbj57Zm9ybWF0QWN0aXZpdHlMYWJlbChldmVudCl9PC9zcGFuPlxuICAgICAgICAgICAgICAgIHtkZXRhaWwgPyA8c21hbGw+e2RldGFpbH08L3NtYWxsPiA6IG51bGx9XG4gICAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgICA8dGltZSBkYXRlVGltZT17ZXZlbnQuYXR9Pntmb3JtYXREYXRlKGV2ZW50LmF0Py5zbGljZSgwLCAxMCkpfTwvdGltZT5cbiAgICAgICAgICAgIDwvbGk+XG4gICAgICAgICAgKTtcbiAgICAgICAgfSl9XG4gICAgICA8L29sPlxuICAgIDwvc2VjdGlvbj5cbiAgKTtcbn1cblxuZnVuY3Rpb24gRXhwYW5kZWRTaW11bGF0aW9uRGV0YWlscyh7XG4gIGFjdGl2ZUZpbHRlcixcbiAgYWRtaW5BcGksXG4gIGVudHJ5LFxuICBvbkRlbGV0ZSxcbiAgb25Jc3N1ZU9wZW4sXG4gIG9uSXNzdWVTdGF0dXNDaGFuZ2UsXG4gIG9uU3RhZ2VDaGFuZ2UsXG4gIHBlbmRpbmdBY3Rpb24sXG59KSB7XG4gIGFzeW5jIGZ1bmN0aW9uIGNoYW5nZVN0YWdlKHN0YWdlKSB7XG4gICAgY29uc3QgbmVlZHNDb25maXJtYXRpb24gPSBbXG4gICAgICBTSU1VTEFUSU9OX1NUQUdFUy5EQUlMWV9ST1RBVElPTixcbiAgICAgIFNJTVVMQVRJT05fU1RBR0VTLkhJRERFTixcbiAgICBdLmluY2x1ZGVzKHN0YWdlKSAmJiBlbnRyeS5zdGFnZSAhPT0gc3RhZ2U7XG4gICAgaWYgKG5lZWRzQ29uZmlybWF0aW9uICYmICF3aW5kb3cuY29uZmlybShgTW92ZSAke2VudHJ5Lm5hbWV9IHRvICR7U1RBR0VfTEFCRUxTW3N0YWdlXSB8fCBzdGFnZX0/YCkpIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG4gICAgY29uc3QgbmV4dEVudHJ5ID0gYXdhaXQgYWRtaW5BcGkuY2hhbmdlU3RhZ2UoZW50cnksIHN0YWdlKTtcbiAgICBpZiAobmV4dEVudHJ5KSBvblN0YWdlQ2hhbmdlKG5leHRFbnRyeSk7XG4gIH1cblxuICBhc3luYyBmdW5jdGlvbiBjaGFuZ2VSZXZpZXdTdGF0dXMocmV2aWV3U3RhdHVzKSB7XG4gICAgY29uc3QgbmV4dEVudHJ5ID0gYXdhaXQgYWRtaW5BcGkuY2hhbmdlUmV2aWV3U3RhdHVzKGVudHJ5LCByZXZpZXdTdGF0dXMpO1xuICAgIGlmIChuZXh0RW50cnkpIG9uU3RhZ2VDaGFuZ2UobmV4dEVudHJ5KTtcbiAgfVxuXG4gIGNvbnN0IGlzRGFpbHkgPSBlbnRyeS5zdGFnZSA9PT0gU0lNVUxBVElPTl9TVEFHRVMuREFJTFlfUk9UQVRJT047XG4gIGNvbnN0IGFyY2hpdmVBY3Rpb25WaXNpYmxlID0gYWN0aXZlRmlsdGVyICE9PSAncmV2aWV3JyAmJiBlbnRyeS5zdGFnZSAhPT0gU0lNVUxBVElPTl9TVEFHRVMuSElEREVOO1xuXG4gIHJldHVybiAoXG4gICAgPGRpdiBjbGFzc05hbWU9XCJzaW11bGF0aW9uLWRhc2hib2FyZC1leHBhbmRlZFwiIGlkPXtgc2ltdWxhdGlvbi1kZXRhaWxzLSR7ZW50cnkuaWR9YH0+XG4gICAgICA8ZGl2IGNsYXNzTmFtZT1cInNpbXVsYXRpb24tZGFzaGJvYXJkLWV4cGFuZGVkX19wcmV2aWV3XCI+XG4gICAgICAgIDxEYXNoYm9hcmRUaHVtYm5haWwgZW50cnk9e2VudHJ5fSBwbGF5QW5pbWF0ZWQgc2l6ZT1cImxhcmdlXCIgLz5cbiAgICAgICAgPGRpdiBjbGFzc05hbWU9XCJzaW11bGF0aW9uLWRhc2hib2FyZC1leHBhbmRlZF9fbGlua3NcIj5cbiAgICAgICAgICA8YVxuICAgICAgICAgICAgY2xhc3NOYW1lPVwic2ltdWxhdGlvbi1kYXNoYm9hcmQtYnV0dG9uIHNpbXVsYXRpb24tZGFzaGJvYXJkLWJ1dHRvbi0tZ2hvc3Qgc2ltdWxhdGlvbi1kYXNoYm9hcmQtdG9vbHRpcC0tYmVsb3ctc3RhcnRcIlxuICAgICAgICAgICAgaHJlZj17ZW50cnkubGF1bmNoUGF0aH1cbiAgICAgICAgICAgIHRhcmdldD1cIl9ibGFua1wiXG4gICAgICAgICAgICByZWw9XCJub3JlZmVycmVyXCJcbiAgICAgICAgICAgIGRhdGEtdG9vbHRpcD1cIk9wZW4gaW4gYSBuZXcgdGFiXCJcbiAgICAgICAgICA+XG4gICAgICAgICAgICA8RXh0ZXJuYWxMaW5rIGFyaWEtaGlkZGVuPVwidHJ1ZVwiIHNpemU9ezE2fSBzdHJva2VXaWR0aD17Mn0gLz5cbiAgICAgICAgICAgIDxzcGFuPk9wZW48L3NwYW4+XG4gICAgICAgICAgPC9hPlxuICAgICAgICA8L2Rpdj5cbiAgICAgIDwvZGl2PlxuXG4gICAgICA8ZGl2IGNsYXNzTmFtZT1cInNpbXVsYXRpb24tZGFzaGJvYXJkLWV4cGFuZGVkX19tYWluXCI+XG4gICAgICAgIDxzZWN0aW9uIGNsYXNzTmFtZT1cInNpbXVsYXRpb24tZGFzaGJvYXJkLXNlY3Rpb25cIj5cbiAgICAgICAgICA8aDM+T3ZlcnZpZXc8L2gzPlxuICAgICAgICAgIDxwPntlbnRyeS5zdW1tYXJ5fTwvcD5cbiAgICAgICAgICA8ZGwgY2xhc3NOYW1lPVwic2ltdWxhdGlvbi1kYXNoYm9hcmQtZGV0YWlsLWxpc3RcIj5cbiAgICAgICAgICAgIDxEZXRhaWxSb3cgbGFiZWw9XCJTdGFnZVwiPjxTdGF0dXNQaWxsIGtpbmQ9e2VudHJ5LnN0YWdlfT57U1RBR0VfTEFCRUxTW2VudHJ5LnN0YWdlXSB8fCBlbnRyeS5zdGFnZX08L1N0YXR1c1BpbGw+PC9EZXRhaWxSb3c+XG4gICAgICAgICAgICA8RGV0YWlsUm93IGxhYmVsPVwiUmV2aWV3XCI+PFN0YXR1c1BpbGwga2luZD17ZW50cnkucmV2aWV3U3RhdHVzIHx8ICd1bmtub3duJ30+e2VudHJ5LnJldmlld1N0YXR1cyB8fCAnVW5rbm93bid9PC9TdGF0dXNQaWxsPjwvRGV0YWlsUm93PlxuICAgICAgICAgICAgPERldGFpbFJvdyBsYWJlbD1cIlN1cmZhY2VcIj57ZW50cnkuc3VyZmFjZX08L0RldGFpbFJvdz5cbiAgICAgICAgICAgIDxEZXRhaWxSb3cgbGFiZWw9XCJPcmlnaW5cIj57ZW50cnkub3JpZ2lufTwvRGV0YWlsUm93PlxuICAgICAgICAgICAgPERldGFpbFJvdyBsYWJlbD1cIkRhdGVcIj57Zm9ybWF0RGF0ZShlbnRyeS5sYXN0UmV2aWV3ZWRBdCB8fCBlbnRyeS5pbnRyb2R1Y2VkT24pfTwvRGV0YWlsUm93PlxuICAgICAgICAgICAgPERldGFpbFJvdyBsYWJlbD1cIklzc3Vlc1wiPjxzcGFuIGNsYXNzTmFtZT17ZW50cnkuaXNzdWVDb3VudCA+IDAgPyAnaGFzLWlzc3VlcycgOiAnJ30+e2VudHJ5Lmlzc3VlQ291bnR9IG9wZW48L3NwYW4+PC9EZXRhaWxSb3c+XG4gICAgICAgICAgICA8RGV0YWlsUm93IGxhYmVsPVwiVmFsaWRhdGlvblwiPjxTdGF0dXNQaWxsIGtpbmQ9e2VudHJ5LnZhbGlkYXRpb259PntlbnRyeS52YWxpZGF0aW9ufTwvU3RhdHVzUGlsbD48L0RldGFpbFJvdz5cbiAgICAgICAgICAgIDxEZXRhaWxSb3cgbGFiZWw9XCJQaXRjaFwiPntlbnRyeS5waXRjaFBhdGggPyAoZW50cnkuc3RhdHVzLnBpdGNoPy5wcmVzZW50ID09PSBmYWxzZSA/ICdNaXNzaW5nJyA6IGVudHJ5LnBpdGNoUGF0aCkgOiAnbi9hJ308L0RldGFpbFJvdz5cbiAgICAgICAgICAgIDxEZXRhaWxSb3cgbGFiZWw9XCJDb25maWdcIj57ZW50cnkuY29uZmlnUGF0aCB8fCAnbi9hJ308L0RldGFpbFJvdz5cbiAgICAgICAgICAgIDxEZXRhaWxSb3cgbGFiZWw9XCJDYXB0dXJlXCI+e2VudHJ5LmNhcHR1cmU/Lm5vdGVzIHx8ICdEZWZhdWx0IHByZXZpZXcgY2FwdHVyZSB0aW1pbmcuJ308L0RldGFpbFJvdz5cbiAgICAgICAgICA8L2RsPlxuICAgICAgICA8L3NlY3Rpb24+XG5cbiAgICAgICAge2VudHJ5LnN0YXR1cy5ibG9ja2Vycz8ubGVuZ3RoID8gKFxuICAgICAgICAgIDxzZWN0aW9uIGNsYXNzTmFtZT1cInNpbXVsYXRpb24tZGFzaGJvYXJkLXNlY3Rpb24gc2ltdWxhdGlvbi1kYXNoYm9hcmQtYmxvY2tlcnNcIj5cbiAgICAgICAgICAgIDxoMz5CbG9ja2VyczwvaDM+XG4gICAgICAgICAgICA8dWw+XG4gICAgICAgICAgICAgIHtlbnRyeS5zdGF0dXMuYmxvY2tlcnMubWFwKChibG9ja2VyKSA9PiA8bGkga2V5PXtibG9ja2VyfT57YmxvY2tlcn08L2xpPil9XG4gICAgICAgICAgICA8L3VsPlxuICAgICAgICAgIDwvc2VjdGlvbj5cbiAgICAgICAgKSA6IG51bGx9XG5cbiAgICAgICAgPElzc3VlTGlzdFxuICAgICAgICAgIGlzc3Vlcz17ZW50cnkuc3RhdHVzLmlzc3Vlc31cbiAgICAgICAgICBvbklzc3VlU3RhdHVzQ2hhbmdlPXtvbklzc3VlU3RhdHVzQ2hhbmdlfVxuICAgICAgICAgIHBlbmRpbmdBY3Rpb249e3BlbmRpbmdBY3Rpb259XG4gICAgICAgIC8+XG5cbiAgICAgICAgPEFjdGl2aXR5TGlzdCBhY3Rpdml0eT17ZW50cnkuc3RhdHVzLmFjdGl2aXR5fSAvPlxuICAgICAgPC9kaXY+XG5cbiAgICAgIDxkaXYgY2xhc3NOYW1lPVwic2ltdWxhdGlvbi1kYXNoYm9hcmQtZXhwYW5kZWRfX2NvbnRyb2xzXCI+XG4gICAgICAgIDxzZWN0aW9uIGNsYXNzTmFtZT1cInNpbXVsYXRpb24tZGFzaGJvYXJkLXNlY3Rpb24gc2ltdWxhdGlvbi1kYXNoYm9hcmQtcmV2aWV3LWFjdGlvbnNcIiBhcmlhLWxhYmVsPVwiUmV2aWV3IHN0YXR1cyBjb250cm9sc1wiPlxuICAgICAgICAgIDxoMz5SZXZpZXc8L2gzPlxuICAgICAgICAgIDxkaXY+XG4gICAgICAgICAgICB7UkVWSUVXX0FDVElPTlMubWFwKChhY3Rpb24pID0+IChcbiAgICAgICAgICAgICAgPERhc2hib2FyZEJ1dHRvblxuICAgICAgICAgICAgICAgIGtleT17YWN0aW9uLmlkfVxuICAgICAgICAgICAgICAgIGNsYXNzTmFtZT17ZW50cnkucmV2aWV3U3RhdHVzID09PSBhY3Rpb24uaWQgPyAnaXMtYWN0aXZlJyA6ICcnfVxuICAgICAgICAgICAgICAgIGRpc2FibGVkPXtCb29sZWFuKHBlbmRpbmdBY3Rpb24pfVxuICAgICAgICAgICAgICAgIGljb249e2FjdGlvbi5pY29ufVxuICAgICAgICAgICAgICAgIGxhYmVsPXthY3Rpb24ubGFiZWx9XG4gICAgICAgICAgICAgICAgdG9vbHRpcD17YFNldCByZXZpZXcgc3RhdHVzIHRvICR7YWN0aW9uLmxhYmVsfWB9XG4gICAgICAgICAgICAgICAgb25DbGljaz17KCkgPT4gY2hhbmdlUmV2aWV3U3RhdHVzKGFjdGlvbi5pZCl9XG4gICAgICAgICAgICAgIC8+XG4gICAgICAgICAgICApKX1cbiAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgPC9zZWN0aW9uPlxuXG4gICAgICAgIDxzZWN0aW9uIGNsYXNzTmFtZT1cInNpbXVsYXRpb24tZGFzaGJvYXJkLXNlY3Rpb24gc2ltdWxhdGlvbi1kYXNoYm9hcmQtc3RhZ2UtYWN0aW9uc1wiIGFyaWEtbGFiZWw9XCJTdGFnZSBjb250cm9sc1wiPlxuICAgICAgICAgIDxoMz5TdGFnZTwvaDM+XG4gICAgICAgICAgPGRpdj5cbiAgICAgICAgICAgIHtlbnRyeS5zdGFnZSAhPT0gU0lNVUxBVElPTl9TVEFHRVMuREFJTFlfUk9UQVRJT04gPyAoXG4gICAgICAgICAgICAgIDxEYXNoYm9hcmRCdXR0b25cbiAgICAgICAgICAgICAgICBjbGFzc05hbWU9XCJzaW11bGF0aW9uLWRhc2hib2FyZC1idXR0b24tLXByb21vdGVcIlxuICAgICAgICAgICAgICAgIGRpc2FibGVkPXtCb29sZWFuKHBlbmRpbmdBY3Rpb24pfVxuICAgICAgICAgICAgICAgIGljb249e1NwYXJrbGVzfVxuICAgICAgICAgICAgICAgIGxhYmVsPVwiUHJvbW90ZVwiXG4gICAgICAgICAgICAgICAgdG9vbHRpcD1cIlByb21vdGUgdG8gRGFpbHkgU2ltdWxhdGlvblwiXG4gICAgICAgICAgICAgICAgb25DbGljaz17KCkgPT4gY2hhbmdlU3RhZ2UoU0lNVUxBVElPTl9TVEFHRVMuREFJTFlfUk9UQVRJT04pfVxuICAgICAgICAgICAgICAvPlxuICAgICAgICAgICAgKSA6IG51bGx9XG4gICAgICAgICAgICB7ZW50cnkuc3RhZ2UgIT09IFNJTVVMQVRJT05fU1RBR0VTLkNPTExFQ1RJT04gPyAoXG4gICAgICAgICAgICAgIDxEYXNoYm9hcmRCdXR0b25cbiAgICAgICAgICAgICAgICBjbGFzc05hbWU9XCJzaW11bGF0aW9uLWRhc2hib2FyZC1idXR0b24tLWdob3N0XCJcbiAgICAgICAgICAgICAgICBkaXNhYmxlZD17Qm9vbGVhbihwZW5kaW5nQWN0aW9uKX1cbiAgICAgICAgICAgICAgICBpY29uPXtGb2xkZXJ9XG4gICAgICAgICAgICAgICAgbGFiZWw9XCJDb2xsZWN0aW9uXCJcbiAgICAgICAgICAgICAgICB0b29sdGlwPVwiTW92ZSBvdXQgb2YgRGFpbHkgU2ltdWxhdGlvbiBidXQga2VlcCBhdmFpbGFibGUgZm9yIHJldmlld1wiXG4gICAgICAgICAgICAgICAgb25DbGljaz17KCkgPT4gY2hhbmdlU3RhZ2UoU0lNVUxBVElPTl9TVEFHRVMuQ09MTEVDVElPTil9XG4gICAgICAgICAgICAgIC8+XG4gICAgICAgICAgICApIDogbnVsbH1cbiAgICAgICAgICAgIHtlbnRyeS5zdGFnZSAhPT0gU0lNVUxBVElPTl9TVEFHRVMuQVVUT01BVElPTl9DQU5ESURBVEUgJiYgIWlzRGFpbHkgPyAoXG4gICAgICAgICAgICAgIDxEYXNoYm9hcmRCdXR0b25cbiAgICAgICAgICAgICAgICBjbGFzc05hbWU9XCJzaW11bGF0aW9uLWRhc2hib2FyZC1idXR0b24tLWdob3N0XCJcbiAgICAgICAgICAgICAgICBkaXNhYmxlZD17Qm9vbGVhbihwZW5kaW5nQWN0aW9uKX1cbiAgICAgICAgICAgICAgICBpY29uPXtTdGFyfVxuICAgICAgICAgICAgICAgIGxhYmVsPVwiQ2FuZGlkYXRlXCJcbiAgICAgICAgICAgICAgICB0b29sdGlwPVwiTWFyayBhcyBhbiBhdXRvbWF0aW9uIGNhbmRpZGF0ZSBmb3IgcmV2aWV3XCJcbiAgICAgICAgICAgICAgICBvbkNsaWNrPXsoKSA9PiBjaGFuZ2VTdGFnZShTSU1VTEFUSU9OX1NUQUdFUy5BVVRPTUFUSU9OX0NBTkRJREFURSl9XG4gICAgICAgICAgICAgIC8+XG4gICAgICAgICAgICApIDogbnVsbH1cbiAgICAgICAgICAgIHthcmNoaXZlQWN0aW9uVmlzaWJsZSA/IChcbiAgICAgICAgICAgICAgPERhc2hib2FyZEJ1dHRvblxuICAgICAgICAgICAgICAgIGNsYXNzTmFtZT1cInNpbXVsYXRpb24tZGFzaGJvYXJkLWJ1dHRvbi0tZ2hvc3RcIlxuICAgICAgICAgICAgICAgIGRpc2FibGVkPXtCb29sZWFuKHBlbmRpbmdBY3Rpb24pfVxuICAgICAgICAgICAgICAgIGljb249e0FyY2hpdmV9XG4gICAgICAgICAgICAgICAgbGFiZWw9XCJBcmNoaXZlXCJcbiAgICAgICAgICAgICAgICB0b29sdGlwPVwiS2VlcCBjb2RlIGFuZCBhc3NldHMsIHJlbW92ZSBmcm9tIG5vcm1hbCByZXZpZXcgYW5kIGNvbGxlY3Rpb24gd29ya1wiXG4gICAgICAgICAgICAgICAgb25DbGljaz17KCkgPT4gY2hhbmdlU3RhZ2UoU0lNVUxBVElPTl9TVEFHRVMuSElEREVOKX1cbiAgICAgICAgICAgICAgLz5cbiAgICAgICAgICAgICkgOiBudWxsfVxuICAgICAgICAgIDwvZGl2PlxuICAgICAgICA8L3NlY3Rpb24+XG5cbiAgICAgICAgPHNlY3Rpb24gY2xhc3NOYW1lPVwic2ltdWxhdGlvbi1kYXNoYm9hcmQtc2VjdGlvbiBzaW11bGF0aW9uLWRhc2hib2FyZC1kYW5nZXItem9uZVwiIGFyaWEtbGFiZWw9XCJEZXN0cnVjdGl2ZSBjb250cm9sc1wiPlxuICAgICAgICAgIDxoMz5BY3Rpb25zPC9oMz5cbiAgICAgICAgICA8ZGl2PlxuICAgICAgICAgICAgPERhc2hib2FyZEJ1dHRvblxuICAgICAgICAgICAgICBjbGFzc05hbWU9XCJzaW11bGF0aW9uLWRhc2hib2FyZC1idXR0b24tLXByaW1hcnlcIlxuICAgICAgICAgICAgICBkaXNhYmxlZD17Qm9vbGVhbihwZW5kaW5nQWN0aW9uKX1cbiAgICAgICAgICAgICAgaWNvbj17TWVzc2FnZUNpcmNsZX1cbiAgICAgICAgICAgICAgbGFiZWw9XCJMb2cgSXNzdWVcIlxuICAgICAgICAgICAgICB0b29sdGlwPVwiQ3JlYXRlIGEgZGF0ZWQgaXNzdWUgbm90ZSBmb3IgdGhpcyBzaW11bGF0aW9uXCJcbiAgICAgICAgICAgICAgb25DbGljaz17KCkgPT4gb25Jc3N1ZU9wZW4oZW50cnkpfVxuICAgICAgICAgICAgLz5cbiAgICAgICAgICAgIDxEYXNoYm9hcmRCdXR0b25cbiAgICAgICAgICAgICAgY2xhc3NOYW1lPVwic2ltdWxhdGlvbi1kYXNoYm9hcmQtYnV0dG9uLS1kYW5nZXJcIlxuICAgICAgICAgICAgICBkaXNhYmxlZD17Qm9vbGVhbihwZW5kaW5nQWN0aW9uKSB8fCBpc0RhaWx5fVxuICAgICAgICAgICAgICBpY29uPXtUcmFzaDJ9XG4gICAgICAgICAgICAgIGxhYmVsPVwiRGVsZXRlXCJcbiAgICAgICAgICAgICAgdG9vbHRpcD17aXNEYWlseSA/ICdNb3ZlIHRvIENvbGxlY3Rpb24gYmVmb3JlIGRlbGV0aW5nLicgOiAnRGVsZXRlIHJlcG8tb3duZWQgc2ltdWxhdGlvbiBmaWxlcyd9XG4gICAgICAgICAgICAgIG9uQ2xpY2s9eygpID0+IG9uRGVsZXRlKGVudHJ5KX1cbiAgICAgICAgICAgIC8+XG4gICAgICAgICAgPC9kaXY+XG4gICAgICAgIDwvc2VjdGlvbj5cbiAgICAgIDwvZGl2PlxuICAgIDwvZGl2PlxuICApO1xufVxuXG5mdW5jdGlvbiBTaW11bGF0aW9uTGlzdEl0ZW0oe1xuICBhY3RpdmVGaWx0ZXIsXG4gIGFkbWluQXBpLFxuICBlbnRyeSxcbiAgZXhwYW5kZWQsXG4gIG9uRGVsZXRlLFxuICBvbklzc3VlT3BlbixcbiAgb25Jc3N1ZVN0YXR1c0NoYW5nZSxcbiAgb25TdGFnZUNoYW5nZSxcbiAgb25Ub2dnbGUsXG4gIHBlbmRpbmdBY3Rpb24sXG59KSB7XG4gIHJldHVybiAoXG4gICAgPGFydGljbGUgY2xhc3NOYW1lPXtgc2ltdWxhdGlvbi1kYXNoYm9hcmQtbGlzdC1pdGVtICR7ZXhwYW5kZWQgPyAnaXMtZXhwYW5kZWQnIDogJyd9YH0+XG4gICAgICA8ZGl2IGNsYXNzTmFtZT1cInNpbXVsYXRpb24tZGFzaGJvYXJkLWxpc3Qtcm93XCI+XG4gICAgICAgIDxidXR0b25cbiAgICAgICAgICB0eXBlPVwiYnV0dG9uXCJcbiAgICAgICAgICBjbGFzc05hbWU9XCJzaW11bGF0aW9uLWRhc2hib2FyZC1saXN0LXJvd19fbWFpblwiXG4gICAgICAgICAgYXJpYS1leHBhbmRlZD17ZXhwYW5kZWR9XG4gICAgICAgICAgYXJpYS1jb250cm9scz17YHNpbXVsYXRpb24tZGV0YWlscy0ke2VudHJ5LmlkfWB9XG4gICAgICAgICAgb25DbGljaz17KCkgPT4gb25Ub2dnbGUoZW50cnkuaWQpfVxuICAgICAgICA+XG4gICAgICAgICAgPERhc2hib2FyZFRodW1ibmFpbCBlbnRyeT17ZW50cnl9IHBsYXlBbmltYXRlZD17ZXhwYW5kZWR9IC8+XG4gICAgICAgICAgPHNwYW4gY2xhc3NOYW1lPVwic2ltdWxhdGlvbi1kYXNoYm9hcmQtbGlzdC1yb3dfX3RpdGxlXCI+XG4gICAgICAgICAgICA8c3Ryb25nPntlbnRyeS5uYW1lfTwvc3Ryb25nPlxuICAgICAgICAgICAgPHNwYW4+e2VudHJ5LmlkfSDCtyB7ZW50cnkuc3VyZmFjZX0gwrcge2VudHJ5Lm9yaWdpbn08L3NwYW4+XG4gICAgICAgICAgPC9zcGFuPlxuICAgICAgICAgIDxzcGFuIGNsYXNzTmFtZT1cInNpbXVsYXRpb24tZGFzaGJvYXJkLWxpc3Qtcm93X19zdGF0dXNcIj5cbiAgICAgICAgICAgIDxTdGF0dXNQaWxsIGtpbmQ9e2VudHJ5LnN0YWdlfT57U1RBR0VfTEFCRUxTW2VudHJ5LnN0YWdlXSB8fCBlbnRyeS5zdGFnZX08L1N0YXR1c1BpbGw+XG4gICAgICAgICAgICA8U3RhdHVzUGlsbCBraW5kPXtlbnRyeS52YWxpZGF0aW9ufT57ZW50cnkudmFsaWRhdGlvbn08L1N0YXR1c1BpbGw+XG4gICAgICAgICAgPC9zcGFuPlxuICAgICAgICAgIDxzcGFuIGNsYXNzTmFtZT1cInNpbXVsYXRpb24tZGFzaGJvYXJkLWxpc3Qtcm93X19tZXRhXCI+XG4gICAgICAgICAgICA8c3BhbiBjbGFzc05hbWU9e2VudHJ5Lmlzc3VlQ291bnQgPiAwID8gJ2hhcy1pc3N1ZXMnIDogJyd9PntlbnRyeS5pc3N1ZUNvdW50fSBpc3N1ZXM8L3NwYW4+XG4gICAgICAgICAgICA8c3Bhbj57Zm9ybWF0RGF0ZShlbnRyeS5sYXN0UmV2aWV3ZWRBdCB8fCBlbnRyeS5pbnRyb2R1Y2VkT24pfTwvc3Bhbj5cbiAgICAgICAgICA8L3NwYW4+XG4gICAgICAgICAgPHNwYW4gY2xhc3NOYW1lPVwic2ltdWxhdGlvbi1kYXNoYm9hcmQtbGlzdC1yb3dfX3RvZ2dsZVwiPlxuICAgICAgICAgICAgPENoZXZyb25Eb3duIGFyaWEtaGlkZGVuPVwidHJ1ZVwiIHNpemU9ezE2fSBzdHJva2VXaWR0aD17Mn0gLz5cbiAgICAgICAgICAgIDxzcGFuPntleHBhbmRlZCA/ICdDbG9zZScgOiAnT3Blbid9PC9zcGFuPlxuICAgICAgICAgIDwvc3Bhbj5cbiAgICAgICAgPC9idXR0b24+XG4gICAgICAgIDxkaXYgY2xhc3NOYW1lPVwic2ltdWxhdGlvbi1kYXNoYm9hcmQtcm93LWFjdGlvbnNcIiBhcmlhLWxhYmVsPXtgJHtlbnRyeS5uYW1lfSBxdWljayBhY3Rpb25zYH0+XG4gICAgICAgICAgPERhc2hib2FyZEljb25CdXR0b25cbiAgICAgICAgICAgIGljb249e01lc3NhZ2VDaXJjbGV9XG4gICAgICAgICAgICBsYWJlbD1cIkxvZyBpc3N1ZVwiXG4gICAgICAgICAgICB0b29sdGlwUGxhY2VtZW50PVwiYWJvdmUtZW5kXCJcbiAgICAgICAgICAgIG9uQ2xpY2s9eyhldmVudCkgPT4geyBldmVudC5zdG9wUHJvcGFnYXRpb24oKTsgb25Jc3N1ZU9wZW4oZW50cnkpOyB9fVxuICAgICAgICAgIC8+XG4gICAgICAgICAgPERhc2hib2FyZEljb25CdXR0b25cbiAgICAgICAgICAgIGFzPVwiYVwiXG4gICAgICAgICAgICBocmVmPXtlbnRyeS5sYXVuY2hQYXRofVxuICAgICAgICAgICAgdGFyZ2V0PVwiX2JsYW5rXCJcbiAgICAgICAgICAgIHJlbD1cIm5vcmVmZXJyZXJcIlxuICAgICAgICAgICAgaWNvbj17RXh0ZXJuYWxMaW5rfVxuICAgICAgICAgICAgbGFiZWw9XCJPcGVuIGluIGEgbmV3IHRhYlwiXG4gICAgICAgICAgICB0b29sdGlwUGxhY2VtZW50PVwiYWJvdmUtZW5kXCJcbiAgICAgICAgICAgIG9uQ2xpY2s9eyhldmVudCkgPT4gZXZlbnQuc3RvcFByb3BhZ2F0aW9uKCl9XG4gICAgICAgICAgLz5cbiAgICAgICAgPC9kaXY+XG4gICAgICA8L2Rpdj5cblxuICAgICAge2V4cGFuZGVkID8gKFxuICAgICAgICA8RXhwYW5kZWRTaW11bGF0aW9uRGV0YWlsc1xuICAgICAgICAgIGFjdGl2ZUZpbHRlcj17YWN0aXZlRmlsdGVyfVxuICAgICAgICAgIGFkbWluQXBpPXthZG1pbkFwaX1cbiAgICAgICAgICBlbnRyeT17ZW50cnl9XG4gICAgICAgICAgb25EZWxldGU9e29uRGVsZXRlfVxuICAgICAgICAgIG9uSXNzdWVPcGVuPXtvbklzc3VlT3Blbn1cbiAgICAgICAgICBvbklzc3VlU3RhdHVzQ2hhbmdlPXtvbklzc3VlU3RhdHVzQ2hhbmdlfVxuICAgICAgICAgIG9uU3RhZ2VDaGFuZ2U9e29uU3RhZ2VDaGFuZ2V9XG4gICAgICAgICAgcGVuZGluZ0FjdGlvbj17cGVuZGluZ0FjdGlvbn1cbiAgICAgICAgLz5cbiAgICAgICkgOiBudWxsfVxuICAgIDwvYXJ0aWNsZT5cbiAgKTtcbn1cblxuZnVuY3Rpb24gU2ltdWxhdGlvbkxpc3Qoe1xuICBhY3RpdmVGaWx0ZXIsXG4gIGFkbWluQXBpLFxuICBleHBhbmRlZElkLFxuICBub3RpY2UsXG4gIHNpbXVsYXRpb25zLFxuICBvbkRlbGV0ZSxcbiAgb25Jc3N1ZU9wZW4sXG4gIG9uSXNzdWVTdGF0dXNDaGFuZ2UsXG4gIG9uU3RhZ2VDaGFuZ2UsXG4gIG9uVG9nZ2xlLFxuICBwZW5kaW5nQWN0aW9uLFxufSkge1xuICByZXR1cm4gKFxuICAgIDxzZWN0aW9uIGNsYXNzTmFtZT1cInNpbXVsYXRpb24tZGFzaGJvYXJkLWxpc3QtcGFuZWxcIiBhcmlhLWxhYmVsPVwiU2ltdWxhdGlvbiBtYW5hZ2VtZW50IGxpc3RcIj5cbiAgICAgIDxkaXYgY2xhc3NOYW1lPVwic2ltdWxhdGlvbi1kYXNoYm9hcmQtbGlzdC1wYW5lbF9fYmFyXCI+XG4gICAgICAgIDxkaXY+XG4gICAgICAgICAgPHN0cm9uZz57c2ltdWxhdGlvbnMubGVuZ3RofSByZXN1bHRzPC9zdHJvbmc+XG4gICAgICAgICAgPHNwYW4+U29ydGVkIGJ5IHJldmlldyBwcmlvcml0eTwvc3Bhbj5cbiAgICAgICAgPC9kaXY+XG4gICAgICAgIDxJbmxpbmVOb3RpY2Ugbm90aWNlPXtub3RpY2V9IHBlbmRpbmdBY3Rpb249e3BlbmRpbmdBY3Rpb259IC8+XG4gICAgICA8L2Rpdj5cblxuICAgICAge3NpbXVsYXRpb25zLmxlbmd0aCA/IChcbiAgICAgICAgPGRpdiBjbGFzc05hbWU9XCJzaW11bGF0aW9uLWRhc2hib2FyZC1saXN0XCI+XG4gICAgICAgICAge3NpbXVsYXRpb25zLm1hcCgoZW50cnkpID0+IChcbiAgICAgICAgICAgIDxTaW11bGF0aW9uTGlzdEl0ZW1cbiAgICAgICAgICAgICAga2V5PXtlbnRyeS5pZH1cbiAgICAgICAgICAgICAgYWN0aXZlRmlsdGVyPXthY3RpdmVGaWx0ZXJ9XG4gICAgICAgICAgICAgIGFkbWluQXBpPXthZG1pbkFwaX1cbiAgICAgICAgICAgICAgZW50cnk9e2VudHJ5fVxuICAgICAgICAgICAgICBleHBhbmRlZD17ZXhwYW5kZWRJZCA9PT0gZW50cnkuaWR9XG4gICAgICAgICAgICAgIG9uRGVsZXRlPXtvbkRlbGV0ZX1cbiAgICAgICAgICAgICAgb25Jc3N1ZU9wZW49e29uSXNzdWVPcGVufVxuICAgICAgICAgICAgICBvbklzc3VlU3RhdHVzQ2hhbmdlPXtvbklzc3VlU3RhdHVzQ2hhbmdlfVxuICAgICAgICAgICAgICBvblN0YWdlQ2hhbmdlPXtvblN0YWdlQ2hhbmdlfVxuICAgICAgICAgICAgICBvblRvZ2dsZT17b25Ub2dnbGV9XG4gICAgICAgICAgICAgIHBlbmRpbmdBY3Rpb249e3BlbmRpbmdBY3Rpb259XG4gICAgICAgICAgICAvPlxuICAgICAgICAgICkpfVxuICAgICAgICA8L2Rpdj5cbiAgICAgICkgOiAoXG4gICAgICAgIDxwIGNsYXNzTmFtZT1cInNpbXVsYXRpb24tZGFzaGJvYXJkLWVtcHR5XCI+Tm8gc2ltdWxhdGlvbnMgbWF0Y2ggdGhpcyB2aWV3LjwvcD5cbiAgICAgICl9XG4gICAgPC9zZWN0aW9uPlxuICApO1xufVxuXG5mdW5jdGlvbiBEZWxldGVDb25maXJtYXRpb25Nb2RhbCh7XG4gIGNvbmZpcm1WYWx1ZSxcbiAgZW50cnksXG4gIG9uQ2xvc2UsXG4gIG9uQ29uZmlybSxcbiAgb25Db25maXJtVmFsdWVDaGFuZ2UsXG4gIG9uQ29weVByb21wdCxcbiAgcGVuZGluZ0FjdGlvbixcbiAgcGxhbixcbn0pIHtcbiAgaWYgKCFlbnRyeSB8fCAhcGxhbikgcmV0dXJuIG51bGw7XG5cbiAgY29uc3QgYmxvY2tlZCA9IEJvb2xlYW4ocGxhbi5ibG9ja2VkKTtcbiAgY29uc3QgY2FuQ29uZmlybSA9ICFibG9ja2VkICYmIGNvbmZpcm1WYWx1ZSA9PT0gZW50cnkuaWQgJiYgIXBlbmRpbmdBY3Rpb247XG4gIGNvbnN0IHRhcmdldHMgPSBwbGFuLmRlbGV0ZVRhcmdldHMgfHwgW107XG4gIGNvbnN0IGVkaXRzID0gcGxhbi5zb3VyY2VFZGl0cyB8fCBbXTtcblxuICByZXR1cm4gKFxuICAgIDxkaXYgY2xhc3NOYW1lPVwic2ltdWxhdGlvbi1kYXNoYm9hcmQtbW9kYWwgc2ltdWxhdGlvbi1kYXNoYm9hcmQtZGVsZXRlLW1vZGFsXCIgcm9sZT1cImRpYWxvZ1wiIGFyaWEtbW9kYWw9XCJ0cnVlXCIgYXJpYS1sYWJlbGxlZGJ5PVwic2ltdWxhdGlvbi1kZWxldGUtdGl0bGVcIj5cbiAgICAgIDxkaXYgY2xhc3NOYW1lPVwic2ltdWxhdGlvbi1kYXNoYm9hcmQtbW9kYWxfX3BhbmVsXCI+XG4gICAgICAgIDxkaXYgY2xhc3NOYW1lPVwic2ltdWxhdGlvbi1kYXNoYm9hcmQtbW9kYWxfX2hlYWRlclwiPlxuICAgICAgICAgIDxkaXY+XG4gICAgICAgICAgICA8c3BhbiBjbGFzc05hbWU9e2Jsb2NrZWQgPyAnc2ltdWxhdGlvbi1kYXNoYm9hcmQtbW9kYWxfX2V5ZWJyb3cgaXMtYmxvY2tlZCcgOiAnc2ltdWxhdGlvbi1kYXNoYm9hcmQtbW9kYWxfX2V5ZWJyb3cnfT57YmxvY2tlZCA/ICdCbG9ja2VkJyA6ICdDb25maXJtIERlbGV0ZSd9PC9zcGFuPlxuICAgICAgICAgICAgPGgyIGlkPVwic2ltdWxhdGlvbi1kZWxldGUtdGl0bGVcIj57ZW50cnkubmFtZX08L2gyPlxuICAgICAgICAgICAgPHA+e2VudHJ5LmlkfTwvcD5cbiAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICA8RGFzaGJvYXJkSWNvbkJ1dHRvbiBpY29uPXtYfSBsYWJlbD1cIkNsb3NlIGRlbGV0ZSBkaWFsb2dcIiB0b29sdGlwUGxhY2VtZW50PVwiYmVsb3ctZW5kXCIgb25DbGljaz17b25DbG9zZX0gLz5cbiAgICAgICAgPC9kaXY+XG5cbiAgICAgICAge2Jsb2NrZWQgPyAoXG4gICAgICAgICAgPHNlY3Rpb24gY2xhc3NOYW1lPVwic2ltdWxhdGlvbi1kYXNoYm9hcmQtZGVsZXRlLW1vZGFsX19ibG9ja1wiPlxuICAgICAgICAgICAgPFNoaWVsZEFsZXJ0IGFyaWEtaGlkZGVuPVwidHJ1ZVwiIHNpemU9ezE4fSBzdHJva2VXaWR0aD17Mn0gLz5cbiAgICAgICAgICAgIDxkaXY+XG4gICAgICAgICAgICAgIDxzdHJvbmc+QXV0b21hdGljIGRlbGV0aW9uIGlzIGJsb2NrZWQ8L3N0cm9uZz5cbiAgICAgICAgICAgICAgPHVsPlxuICAgICAgICAgICAgICAgIHsocGxhbi5ibG9ja2VycyB8fCBbXSkubWFwKChibG9ja2VyKSA9PiA8bGkga2V5PXtibG9ja2VyfT57YmxvY2tlcn08L2xpPil9XG4gICAgICAgICAgICAgIDwvdWw+XG4gICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICA8L3NlY3Rpb24+XG4gICAgICAgICkgOiBudWxsfVxuXG4gICAgICAgIDxzZWN0aW9uIGNsYXNzTmFtZT1cInNpbXVsYXRpb24tZGFzaGJvYXJkLWRlbGV0ZS1tb2RhbF9fcGxhblwiPlxuICAgICAgICAgIDxoMz5Tb3VyY2UgZWRpdHM8L2gzPlxuICAgICAgICAgIHtlZGl0cy5sZW5ndGggPyAoXG4gICAgICAgICAgICA8dWw+XG4gICAgICAgICAgICAgIHtlZGl0cy5tYXAoKGVkaXQpID0+IChcbiAgICAgICAgICAgICAgICA8bGkga2V5PXtgJHtlZGl0LnBhdGh9LSR7ZWRpdC5kZXNjcmlwdGlvbn1gfT5cbiAgICAgICAgICAgICAgICAgIDxzdHJvbmc+e2VkaXQucGF0aH08L3N0cm9uZz5cbiAgICAgICAgICAgICAgICAgIDxzcGFuPntlZGl0LmRlc2NyaXB0aW9ufTwvc3Bhbj5cbiAgICAgICAgICAgICAgICA8L2xpPlxuICAgICAgICAgICAgICApKX1cbiAgICAgICAgICAgIDwvdWw+XG4gICAgICAgICAgKSA6IChcbiAgICAgICAgICAgIDxwPk5vIGF1dG9tYXRpYyBzb3VyY2UgZWRpdHMgYXJlIGF2YWlsYWJsZS48L3A+XG4gICAgICAgICAgKX1cbiAgICAgICAgPC9zZWN0aW9uPlxuXG4gICAgICAgIDxzZWN0aW9uIGNsYXNzTmFtZT1cInNpbXVsYXRpb24tZGFzaGJvYXJkLWRlbGV0ZS1tb2RhbF9fcGxhblwiPlxuICAgICAgICAgIDxoMz5GaWxlcyBhbmQgZm9sZGVyczwvaDM+XG4gICAgICAgICAge3RhcmdldHMubGVuZ3RoID8gKFxuICAgICAgICAgICAgPHVsPlxuICAgICAgICAgICAgICB7dGFyZ2V0cy5tYXAoKHRhcmdldCkgPT4gKFxuICAgICAgICAgICAgICAgIDxsaSBrZXk9e2Ake3RhcmdldC5raW5kfS0ke3RhcmdldC5wYXRofWB9PlxuICAgICAgICAgICAgICAgICAgPHN0cm9uZz57dGFyZ2V0LnBhdGh9PC9zdHJvbmc+XG4gICAgICAgICAgICAgICAgICA8c3Bhbj57dGFyZ2V0LmV4aXN0cyA/IGAke3RhcmdldC5raW5kfSDCtyAke3RhcmdldC5sYWJlbH1gIDogYG1pc3NpbmcgwrcgJHt0YXJnZXQubGFiZWx9YH08L3NwYW4+XG4gICAgICAgICAgICAgICAgPC9saT5cbiAgICAgICAgICAgICAgKSl9XG4gICAgICAgICAgICA8L3VsPlxuICAgICAgICAgICkgOiAoXG4gICAgICAgICAgICA8cD5ObyByZXBvLW93bmVkIGZpbGUgdGFyZ2V0cyB3ZXJlIGFwcHJvdmVkIGZvciBhdXRvbWF0aWMgZGVsZXRpb24uPC9wPlxuICAgICAgICAgICl9XG4gICAgICAgIDwvc2VjdGlvbj5cblxuICAgICAgICB7IWJsb2NrZWQgPyAoXG4gICAgICAgICAgPGxhYmVsIGNsYXNzTmFtZT1cInNpbXVsYXRpb24tZGFzaGJvYXJkLWRlbGV0ZS1tb2RhbF9fY29uZmlybVwiPlxuICAgICAgICAgICAgPHNwYW4+VHlwZSA8c3Ryb25nPntlbnRyeS5pZH08L3N0cm9uZz4gdG8gZGVsZXRlIHRoaXMgc2ltdWxhdGlvbiBmcm9tIHRoZSByZXBvLjwvc3Bhbj5cbiAgICAgICAgICAgIDxpbnB1dFxuICAgICAgICAgICAgICB2YWx1ZT17Y29uZmlybVZhbHVlfVxuICAgICAgICAgICAgICBvbkNoYW5nZT17KGV2ZW50KSA9PiBvbkNvbmZpcm1WYWx1ZUNoYW5nZShldmVudC50YXJnZXQudmFsdWUpfVxuICAgICAgICAgICAgICBwbGFjZWhvbGRlcj17ZW50cnkuaWR9XG4gICAgICAgICAgICAgIGF1dG9Db21wbGV0ZT1cIm9mZlwiXG4gICAgICAgICAgICAvPlxuICAgICAgICAgIDwvbGFiZWw+XG4gICAgICAgICkgOiBudWxsfVxuXG4gICAgICAgIDxkaXYgY2xhc3NOYW1lPVwic2ltdWxhdGlvbi1kYXNoYm9hcmQtbW9kYWxfX2FjdGlvbnNcIj5cbiAgICAgICAgICA8RGFzaGJvYXJkQnV0dG9uXG4gICAgICAgICAgICBjbGFzc05hbWU9XCJzaW11bGF0aW9uLWRhc2hib2FyZC1idXR0b24tLWdob3N0XCJcbiAgICAgICAgICAgIGljb249e0NsaXBib2FyZH1cbiAgICAgICAgICAgIGxhYmVsPXtibG9ja2VkID8gJ0NvcHkgQ2xlYW51cCBQcm9tcHQnIDogJ0NvcHkgUGxhbid9XG4gICAgICAgICAgICB0b29sdGlwPXtibG9ja2VkID8gJ0NvcHkgdGhlIG1hbnVhbCBDb2RleCBjbGVhbnVwIHByb21wdCcgOiAnQ29weSB0aGUgZGVsZXRlIHBsYW4gZm9yIHJldmlldyd9XG4gICAgICAgICAgICBvbkNsaWNrPXtvbkNvcHlQcm9tcHR9XG4gICAgICAgICAgLz5cbiAgICAgICAgICA8ZGl2PlxuICAgICAgICAgICAgPERhc2hib2FyZEJ1dHRvblxuICAgICAgICAgICAgICBjbGFzc05hbWU9XCJzaW11bGF0aW9uLWRhc2hib2FyZC1idXR0b24tLWdob3N0XCJcbiAgICAgICAgICAgICAgaWNvbj17QXJyb3dMZWZ0fVxuICAgICAgICAgICAgICBsYWJlbD1cIkNhbmNlbFwiXG4gICAgICAgICAgICAgIHRvb2x0aXA9XCJDbG9zZSB3aXRob3V0IGNoYW5naW5nIGZpbGVzXCJcbiAgICAgICAgICAgICAgb25DbGljaz17b25DbG9zZX1cbiAgICAgICAgICAgIC8+XG4gICAgICAgICAgICA8RGFzaGJvYXJkQnV0dG9uXG4gICAgICAgICAgICAgIGNsYXNzTmFtZT1cInNpbXVsYXRpb24tZGFzaGJvYXJkLWJ1dHRvbi0tZGFuZ2VyXCJcbiAgICAgICAgICAgICAgZGlzYWJsZWQ9eyFjYW5Db25maXJtfVxuICAgICAgICAgICAgICBpY29uPXtUcmFzaDJ9XG4gICAgICAgICAgICAgIGxhYmVsPXtwZW5kaW5nQWN0aW9uID09PSBgZGVsZXRlLSR7ZW50cnkuaWR9YCA/ICdEZWxldGluZycgOiAnRGVsZXRlJ31cbiAgICAgICAgICAgICAgdG9vbHRpcD1cIkRlbGV0ZSByZXBvLW93bmVkIHNpbXVsYXRpb24gZmlsZXNcIlxuICAgICAgICAgICAgICBvbkNsaWNrPXtvbkNvbmZpcm19XG4gICAgICAgICAgICAvPlxuICAgICAgICAgIDwvZGl2PlxuICAgICAgICA8L2Rpdj5cbiAgICAgIDwvZGl2PlxuICAgIDwvZGl2PlxuICApO1xufVxuXG5mdW5jdGlvbiBTaW11bGF0aW9uRGFzaGJvYXJkKCkge1xuICBjb25zdCBbc2ltdWxhdGlvbnMsIHNldFNpbXVsYXRpb25zXSA9IHVzZVN0YXRlKFNJTVVMQVRJT05fQ0FUQUxPRyk7XG4gIGNvbnN0IFtzdGF0dXNCeUlkLCBzZXRTdGF0dXNCeUlkXSA9IHVzZVN0YXRlKHt9KTtcbiAgY29uc3QgW3N0YXR1c1JlYWR5LCBzZXRTdGF0dXNSZWFkeV0gPSB1c2VTdGF0ZShmYWxzZSk7XG4gIGNvbnN0IFthY3RpdmVGaWx0ZXIsIHNldEFjdGl2ZUZpbHRlcl0gPSB1c2VTdGF0ZSgncmV2aWV3Jyk7XG4gIGNvbnN0IFtxdWVyeSwgc2V0UXVlcnldID0gdXNlU3RhdGUoJycpO1xuICBjb25zdCBbZXhwYW5kZWRJZCwgc2V0RXhwYW5kZWRJZF0gPSB1c2VTdGF0ZSgnJyk7XG4gIGNvbnN0IFtpc3N1ZUVudHJ5LCBzZXRJc3N1ZUVudHJ5XSA9IHVzZVN0YXRlKG51bGwpO1xuICBjb25zdCBbZGVsZXRlU3RhdGUsIHNldERlbGV0ZVN0YXRlXSA9IHVzZVN0YXRlKHsgZW50cnk6IG51bGwsIHBsYW46IG51bGwsIGNvbmZpcm1WYWx1ZTogJycgfSk7XG4gIGNvbnN0IFtub3RpY2UsIHNldE5vdGljZV0gPSB1c2VTdGF0ZShudWxsKTtcbiAgY29uc3QgW3BlbmRpbmdBY3Rpb24sIHNldFBlbmRpbmdBY3Rpb25dID0gdXNlU3RhdGUoJycpO1xuICBjb25zdCBhZG1pbkFwaSA9IHVzZVNpbXVsYXRpb25BZG1pbkFwaShzZXROb3RpY2UpO1xuXG4gIGNvbnN0IHJlZnJlc2hTdGF0dXMgPSB1c2VDYWxsYmFjayhhc3luYyAoKSA9PiB7XG4gICAgY29uc3QgcGF5bG9hZCA9IGF3YWl0IHJlYWREYXNoYm9hcmRTdGF0dXMoKS5jYXRjaCgoKSA9PiBudWxsKTtcbiAgICBpZiAocGF5bG9hZD8ub2sgJiYgcGF5bG9hZC5zaW11bGF0aW9ucykge1xuICAgICAgc2V0U3RhdHVzQnlJZChwYXlsb2FkLnNpbXVsYXRpb25zKTtcbiAgICAgIHNldFN0YXR1c1JlYWR5KHRydWUpO1xuICAgICAgcmV0dXJuIHRydWU7XG4gICAgfVxuICAgIHNldFN0YXR1c1JlYWR5KGZhbHNlKTtcbiAgICByZXR1cm4gZmFsc2U7XG4gIH0sIFtdKTtcblxuICB1c2VFZmZlY3QoKCkgPT4ge1xuICAgIGxldCBjYW5jZWxsZWQgPSBmYWxzZTtcbiAgICByZWFkRGFzaGJvYXJkU3RhdHVzKClcbiAgICAgIC50aGVuKChwYXlsb2FkKSA9PiB7XG4gICAgICAgIGlmICghY2FuY2VsbGVkICYmIHBheWxvYWQ/Lm9rICYmIHBheWxvYWQuc2ltdWxhdGlvbnMpIHtcbiAgICAgICAgICBzZXRTdGF0dXNCeUlkKHBheWxvYWQuc2ltdWxhdGlvbnMpO1xuICAgICAgICAgIHNldFN0YXR1c1JlYWR5KHRydWUpO1xuICAgICAgICB9XG4gICAgICB9KVxuICAgICAgLmNhdGNoKCgpID0+IHtcbiAgICAgICAgaWYgKCFjYW5jZWxsZWQpIHNldFN0YXR1c1JlYWR5KGZhbHNlKTtcbiAgICAgIH0pO1xuICAgIHJldHVybiAoKSA9PiB7XG4gICAgICBjYW5jZWxsZWQgPSB0cnVlO1xuICAgIH07XG4gIH0sIFtdKTtcblxuICBjb25zdCB2aWV3TW9kZWxzID0gdXNlTWVtbyhcbiAgICAoKSA9PiBidWlsZFNpbXVsYXRpb25WaWV3TW9kZWxzKHNpbXVsYXRpb25zLCBzdGF0dXNCeUlkLCBzdGF0dXNSZWFkeSksXG4gICAgW3NpbXVsYXRpb25zLCBzdGF0dXNCeUlkLCBzdGF0dXNSZWFkeV0sXG4gICk7XG4gIGNvbnN0IGNvdW50cyA9IGdldFNpbXVsYXRpb25Db3VudHModmlld01vZGVscyk7XG4gIGNvbnN0IHJlbG9hZFNpbXVsYXRpb24gPSBnZXRSZWxvYWRTaW11bGF0aW9uKHNpbXVsYXRpb25zKTtcbiAgY29uc3QgZmlsdGVyZWRTaW11bGF0aW9ucyA9IHVzZU1lbW8oXG4gICAgKCkgPT4gc29ydFNpbXVsYXRpb25zQnlQcmlvcml0eShmaWx0ZXJTaW11bGF0aW9ucyh2aWV3TW9kZWxzLCBhY3RpdmVGaWx0ZXIsIHF1ZXJ5KSksXG4gICAgW3ZpZXdNb2RlbHMsIGFjdGl2ZUZpbHRlciwgcXVlcnldLFxuICApO1xuXG4gIHVzZUVmZmVjdCgoKSA9PiB7XG4gICAgaWYgKCFmaWx0ZXJlZFNpbXVsYXRpb25zLmxlbmd0aCkge1xuICAgICAgaWYgKGV4cGFuZGVkSWQpIHNldEV4cGFuZGVkSWQoJycpO1xuICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICBpZiAoZXhwYW5kZWRJZCAmJiAhZmlsdGVyZWRTaW11bGF0aW9ucy5zb21lKChlbnRyeSkgPT4gZW50cnkuaWQgPT09IGV4cGFuZGVkSWQpKSB7XG4gICAgICBzZXRFeHBhbmRlZElkKCcnKTtcbiAgICB9XG4gIH0sIFtleHBhbmRlZElkLCBmaWx0ZXJlZFNpbXVsYXRpb25zXSk7XG5cbiAgZnVuY3Rpb24gaGFuZGxlU3RhZ2VDaGFuZ2UobmV4dEVudHJ5KSB7XG4gICAgaWYgKCFuZXh0RW50cnk/LmlkKSByZXR1cm47XG4gICAgc2V0U2ltdWxhdGlvbnMoKGN1cnJlbnQpID0+IGN1cnJlbnQubWFwKChlbnRyeSkgPT4gKFxuICAgICAgZW50cnkuaWQgPT09IG5leHRFbnRyeS5pZCA/IHsgLi4uZW50cnksIC4uLm5leHRFbnRyeSB9IDogZW50cnlcbiAgICApKSk7XG4gICAgc2V0RXhwYW5kZWRJZChuZXh0RW50cnkuaWQpO1xuICB9XG5cbiAgYXN5bmMgZnVuY3Rpb24gcnVuRGFzaGJvYXJkQWN0aW9uKGtleSwgbGFiZWwsIGFjdGlvbikge1xuICAgIGlmIChwZW5kaW5nQWN0aW9uKSByZXR1cm4gZmFsc2U7XG4gICAgc2V0UGVuZGluZ0FjdGlvbihrZXkpO1xuICAgIHNldE5vdGljZSh7XG4gICAgICB0b25lOiAncnVubmluZycsXG4gICAgICB0aXRsZTogbGFiZWwsXG4gICAgICBkZXRhaWw6ICdMb2NhbCBjb21tYW5kIHN0YXJ0ZWQuJyxcbiAgICB9KTtcbiAgICB0cnkge1xuICAgICAgcmV0dXJuIGF3YWl0IGFjdGlvbigpO1xuICAgIH0gZmluYWxseSB7XG4gICAgICBzZXRQZW5kaW5nQWN0aW9uKCcnKTtcbiAgICB9XG4gIH1cblxuICBhc3luYyBmdW5jdGlvbiBoYW5kbGVWYWxpZGF0ZSgpIHtcbiAgICBhd2FpdCBydW5EYXNoYm9hcmRBY3Rpb24oJ3ZhbGlkYXRlJywgJ1J1bm5pbmcgdmFsaWRhdGlvbicsIGFzeW5jICgpID0+IHtcbiAgICAgIGNvbnN0IG9rID0gYXdhaXQgYWRtaW5BcGkudmFsaWRhdGVDYXRhbG9nKCk7XG4gICAgICBhd2FpdCByZWZyZXNoU3RhdHVzKCk7XG4gICAgICByZXR1cm4gb2s7XG4gICAgfSk7XG4gIH1cblxuICBhc3luYyBmdW5jdGlvbiBoYW5kbGVCdWlsZCgpIHtcbiAgICBhd2FpdCBydW5EYXNoYm9hcmRBY3Rpb24oJ2J1aWxkJywgJ1VwZGF0aW5nIHByb2R1Y3Rpb24gYnVpbGQnLCBhc3luYyAoKSA9PiB7XG4gICAgICBjb25zdCBvayA9IGF3YWl0IGFkbWluQXBpLnJ1bkJ1aWxkKCk7XG4gICAgICBhd2FpdCByZWZyZXNoU3RhdHVzKCk7XG4gICAgICByZXR1cm4gb2s7XG4gICAgfSk7XG4gIH1cblxuICBhc3luYyBmdW5jdGlvbiBoYW5kbGVEZWxldGVSZXF1ZXN0KGVudHJ5KSB7XG4gICAgaWYgKCFlbnRyeSB8fCBlbnRyeS5zdGFnZSA9PT0gU0lNVUxBVElPTl9TVEFHRVMuREFJTFlfUk9UQVRJT04pIHJldHVybjtcbiAgICBhd2FpdCBydW5EYXNoYm9hcmRBY3Rpb24oYGRlbGV0ZS1wbGFuLSR7ZW50cnkuaWR9YCwgYFByZXBhcmluZyBkZWxldGUgcGxhbiBmb3IgJHtlbnRyeS5uYW1lfWAsIGFzeW5jICgpID0+IHtcbiAgICAgIGNvbnN0IHBsYW4gPSBhd2FpdCBhZG1pbkFwaS5wcmV2aWV3RGVsZXRlKGVudHJ5KTtcbiAgICAgIGlmIChwbGFuKSBzZXREZWxldGVTdGF0ZSh7IGVudHJ5LCBwbGFuLCBjb25maXJtVmFsdWU6ICcnIH0pO1xuICAgICAgcmV0dXJuIEJvb2xlYW4ocGxhbik7XG4gICAgfSk7XG4gIH1cblxuICBhc3luYyBmdW5jdGlvbiBoYW5kbGVEZWxldGVDb25maXJtKCkge1xuICAgIGNvbnN0IHsgZW50cnksIHBsYW4sIGNvbmZpcm1WYWx1ZSB9ID0gZGVsZXRlU3RhdGU7XG4gICAgaWYgKCFlbnRyeSB8fCAhcGxhbiB8fCBwbGFuLmJsb2NrZWQgfHwgY29uZmlybVZhbHVlICE9PSBlbnRyeS5pZCkgcmV0dXJuO1xuICAgIGF3YWl0IHJ1bkRhc2hib2FyZEFjdGlvbihgZGVsZXRlLSR7ZW50cnkuaWR9YCwgYERlbGV0aW5nICR7ZW50cnkubmFtZX1gLCBhc3luYyAoKSA9PiB7XG4gICAgICBjb25zdCByZXN1bHQgPSBhd2FpdCBhZG1pbkFwaS5kZWxldGVTaW11bGF0aW9uKGVudHJ5LCBjb25maXJtVmFsdWUsIHBsYW4pO1xuICAgICAgaWYgKCFyZXN1bHQ/LmRlbGV0ZWRJZCkgcmV0dXJuIGZhbHNlO1xuICAgICAgc2V0U2ltdWxhdGlvbnMoKGN1cnJlbnQpID0+IGN1cnJlbnQuZmlsdGVyKChpdGVtKSA9PiBpdGVtLmlkICE9PSByZXN1bHQuZGVsZXRlZElkKSk7XG4gICAgICBzZXREZWxldGVTdGF0ZSh7IGVudHJ5OiBudWxsLCBwbGFuOiBudWxsLCBjb25maXJtVmFsdWU6ICcnIH0pO1xuICAgICAgc2V0RXhwYW5kZWRJZCgnJyk7XG4gICAgICBhd2FpdCByZWZyZXNoU3RhdHVzKCk7XG4gICAgICByZXR1cm4gdHJ1ZTtcbiAgICB9KTtcbiAgfVxuXG4gIGFzeW5jIGZ1bmN0aW9uIGhhbmRsZUNvcHlEZWxldGVQcm9tcHQoKSB7XG4gICAgY29uc3QgeyBlbnRyeSwgcGxhbiB9ID0gZGVsZXRlU3RhdGU7XG4gICAgaWYgKCFlbnRyeSB8fCAhcGxhbikgcmV0dXJuO1xuICAgIGNvbnN0IHRleHQgPSBwbGFuLmNsZWFudXBQcm9tcHQgfHwgSlNPTi5zdHJpbmdpZnkocGxhbiwgbnVsbCwgMik7XG4gICAgaWYgKG5hdmlnYXRvcj8uY2xpcGJvYXJkPy53cml0ZVRleHQpIHtcbiAgICAgIGF3YWl0IG5hdmlnYXRvci5jbGlwYm9hcmQud3JpdGVUZXh0KHRleHQpLmNhdGNoKCgpID0+IG51bGwpO1xuICAgIH1cbiAgICBzZXROb3RpY2Uoe1xuICAgICAgdG9uZTogJ2luZm8nLFxuICAgICAgdGl0bGU6IHBsYW4uYmxvY2tlZCA/ICdDbGVhbnVwIHByb21wdCBjb3BpZWQnIDogJ0RlbGV0ZSBwbGFuIGNvcGllZCcsXG4gICAgICBkZXRhaWw6IHBsYW4uYmxvY2tlZCA/ICdQYXN0ZSBpdCBpbnRvIENvZGV4IGZvciBhIG1hbnVhbCBzYWZlIGNsZWFudXAuJyA6ICdUaGUgZHJ5LXJ1biBkZWxldGUgcGxhbiBpcyBvbiB5b3VyIGNsaXBib2FyZC4nLFxuICAgIH0pO1xuICB9XG5cbiAgYXN5bmMgZnVuY3Rpb24gaGFuZGxlSXNzdWVTYXZlZCgpIHtcbiAgICBzZXRJc3N1ZUVudHJ5KG51bGwpO1xuICAgIGF3YWl0IHJlZnJlc2hTdGF0dXMoKTtcbiAgfVxuXG4gIGFzeW5jIGZ1bmN0aW9uIGhhbmRsZUlzc3VlU3RhdHVzQ2hhbmdlKGlzc3VlLCBzdGF0dXMpIHtcbiAgICBhd2FpdCBydW5EYXNoYm9hcmRBY3Rpb24oYGlzc3VlLSR7aXNzdWUuZmlsZU5hbWV9YCwgYFVwZGF0aW5nICR7aXNzdWUudGl0bGV9YCwgYXN5bmMgKCkgPT4ge1xuICAgICAgY29uc3Qgb2sgPSBhd2FpdCBhZG1pbkFwaS51cGRhdGVJc3N1ZVN0YXR1cyhpc3N1ZSwgc3RhdHVzKTtcbiAgICAgIGF3YWl0IHJlZnJlc2hTdGF0dXMoKTtcbiAgICAgIHJldHVybiBvaztcbiAgICB9KTtcbiAgfVxuXG4gIGZ1bmN0aW9uIGhhbmRsZVRvZ2dsZShlbnRyeUlkKSB7XG4gICAgc2V0RXhwYW5kZWRJZCgoY3VycmVudCkgPT4gKGN1cnJlbnQgPT09IGVudHJ5SWQgPyAnJyA6IGVudHJ5SWQpKTtcbiAgfVxuXG4gIHJldHVybiAoXG4gICAgPG1haW4gY2xhc3NOYW1lPVwic2ltdWxhdGlvbi1kYXNoYm9hcmRcIiBhcmlhLWxhYmVsPVwiU2ltdWxhdGlvbiBvcGVyYXRpb25zIGRhc2hib2FyZFwiPlxuICAgICAgPGhlYWRlciBjbGFzc05hbWU9XCJzaW11bGF0aW9uLWRhc2hib2FyZC1oZWFkZXJcIj5cbiAgICAgICAgPGRpdiBjbGFzc05hbWU9XCJzaW11bGF0aW9uLWRhc2hib2FyZC1oZWFkZXJfX3RpdGxlXCI+XG4gICAgICAgICAgPHNwYW4+TG9jYWw8L3NwYW4+XG4gICAgICAgICAgPGgxPlNpbXVsYXRpb24gT3BlcmF0aW9uczwvaDE+XG4gICAgICAgICAgPHA+Q2F0YWxvZyB1cGRhdGVkIHtTSU1VTEFUSU9OX0NBVEFMT0dfVVBEQVRFRF9BVH08L3A+XG4gICAgICAgIDwvZGl2PlxuICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cInNpbXVsYXRpb24tZGFzaGJvYXJkLWhlYWRlcl9fc3RhdHVzXCI+XG4gICAgICAgICAgPHNwYW4+e3BlbmRpbmdBY3Rpb24gPyBnZXRQZW5kaW5nQWN0aW9uTGFiZWwocGVuZGluZ0FjdGlvbikgOiBzdGF0dXNSZWFkeSA/ICdEZXYgQVBJIGNvbm5lY3RlZCcgOiAnQ2F0YWxvZy1vbmx5IG1vZGUnfTwvc3Bhbj5cbiAgICAgICAgICB7cGVuZGluZ0FjdGlvbiA/IChcbiAgICAgICAgICAgIDxMb2FkZXJDaXJjbGUgY2xhc3NOYW1lPVwiaXMtc3Bpbm5pbmdcIiBhcmlhLWhpZGRlbj1cInRydWVcIiBzaXplPXsxNH0gc3Ryb2tlV2lkdGg9ezJ9IC8+XG4gICAgICAgICAgKSA6IChcbiAgICAgICAgICAgIDxCb3ggYXJpYS1oaWRkZW49XCJ0cnVlXCIgc2l6ZT17MTR9IHN0cm9rZVdpZHRoPXsyfSAvPlxuICAgICAgICAgICl9XG4gICAgICAgIDwvZGl2PlxuICAgICAgICA8SGVhZGVyQWN0aW9ucyBvbkJ1aWxkPXtoYW5kbGVCdWlsZH0gb25WYWxpZGF0ZT17aGFuZGxlVmFsaWRhdGV9IHBlbmRpbmdBY3Rpb249e3BlbmRpbmdBY3Rpb259IC8+XG4gICAgICA8L2hlYWRlcj5cblxuICAgICAgPFN1bW1hcnlTdHJpcCBjb3VudHM9e2NvdW50c30gcmVsb2FkU2ltdWxhdGlvbj17cmVsb2FkU2ltdWxhdGlvbn0gc3RhdHVzUmVhZHk9e3N0YXR1c1JlYWR5fSAvPlxuXG4gICAgICA8RmlsdGVyVG9vbGJhclxuICAgICAgICBhY3RpdmVGaWx0ZXI9e2FjdGl2ZUZpbHRlcn1cbiAgICAgICAgY291bnRzPXtjb3VudHN9XG4gICAgICAgIG9uRmlsdGVyQ2hhbmdlPXtzZXRBY3RpdmVGaWx0ZXJ9XG4gICAgICAgIHF1ZXJ5PXtxdWVyeX1cbiAgICAgICAgb25RdWVyeUNoYW5nZT17c2V0UXVlcnl9XG4gICAgICAvPlxuXG4gICAgICA8U2ltdWxhdGlvbkxpc3RcbiAgICAgICAgYWN0aXZlRmlsdGVyPXthY3RpdmVGaWx0ZXJ9XG4gICAgICAgIGFkbWluQXBpPXthZG1pbkFwaX1cbiAgICAgICAgZXhwYW5kZWRJZD17ZXhwYW5kZWRJZH1cbiAgICAgICAgbm90aWNlPXtub3RpY2V9XG4gICAgICAgIHNpbXVsYXRpb25zPXtmaWx0ZXJlZFNpbXVsYXRpb25zfVxuICAgICAgICBvbkRlbGV0ZT17aGFuZGxlRGVsZXRlUmVxdWVzdH1cbiAgICAgICAgb25Jc3N1ZU9wZW49e3NldElzc3VlRW50cnl9XG4gICAgICAgIG9uSXNzdWVTdGF0dXNDaGFuZ2U9e2hhbmRsZUlzc3VlU3RhdHVzQ2hhbmdlfVxuICAgICAgICBvblN0YWdlQ2hhbmdlPXtoYW5kbGVTdGFnZUNoYW5nZX1cbiAgICAgICAgb25Ub2dnbGU9e2hhbmRsZVRvZ2dsZX1cbiAgICAgICAgcGVuZGluZ0FjdGlvbj17cGVuZGluZ0FjdGlvbn1cbiAgICAgIC8+XG5cbiAgICAgIDxEZWxldGVDb25maXJtYXRpb25Nb2RhbFxuICAgICAgICBjb25maXJtVmFsdWU9e2RlbGV0ZVN0YXRlLmNvbmZpcm1WYWx1ZX1cbiAgICAgICAgZW50cnk9e2RlbGV0ZVN0YXRlLmVudHJ5fVxuICAgICAgICBwbGFuPXtkZWxldGVTdGF0ZS5wbGFufVxuICAgICAgICBwZW5kaW5nQWN0aW9uPXtwZW5kaW5nQWN0aW9ufVxuICAgICAgICBvbkNsb3NlPXsoKSA9PiBzZXREZWxldGVTdGF0ZSh7IGVudHJ5OiBudWxsLCBwbGFuOiBudWxsLCBjb25maXJtVmFsdWU6ICcnIH0pfVxuICAgICAgICBvbkNvbmZpcm09e2hhbmRsZURlbGV0ZUNvbmZpcm19XG4gICAgICAgIG9uQ29uZmlybVZhbHVlQ2hhbmdlPXsoY29uZmlybVZhbHVlKSA9PiBzZXREZWxldGVTdGF0ZSgoY3VycmVudCkgPT4gKHsgLi4uY3VycmVudCwgY29uZmlybVZhbHVlIH0pKX1cbiAgICAgICAgb25Db3B5UHJvbXB0PXtoYW5kbGVDb3B5RGVsZXRlUHJvbXB0fVxuICAgICAgLz5cblxuICAgICAgPElzc3VlUGFuZWxcbiAgICAgICAgZW50cnk9e2lzc3VlRW50cnl9XG4gICAgICAgIGFkbWluQXBpPXthZG1pbkFwaX1cbiAgICAgICAgb25TYXZlZD17aGFuZGxlSXNzdWVTYXZlZH1cbiAgICAgICAgb25DbG9zZT17KCkgPT4gc2V0SXNzdWVFbnRyeShudWxsKX1cbiAgICAgIC8+XG4gICAgPC9tYWluPlxuICApO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gZ2V0U2ltdWxhdGlvbkxhdW5jaHBhZFJvdXRlVmlldygpIHtcbiAgcmV0dXJuIHtcbiAgICBsYXlvdXQ6ICdzdGFuZGFsb25lJyxcbiAgICBodG1sQ2xhc3NOYW1lOiAnc2ltdWxhdGlvbi1kYXNoYm9hcmQtZG9jdW1lbnQnLFxuICAgIGJvZHlDbGFzczogJ2JvZHkgc2ltdWxhdGlvbi1kYXNoYm9hcmQtcGFnZScsXG4gICAgbWFpbkNvbnRlbnQ6IDxTaW11bGF0aW9uRGFzaGJvYXJkIC8+LFxuICB9O1xufVxuIl0sImZpbGUiOiIvVXNlcnMvYWxleGFuZGVyYmVjay9Qcm9qZWN0cy1jb2RlL0FsZXhhbmRlciBCZWNrIFN0dWRpbyBXZWJzaXRlL3JlYWN0LWFwcC9hcHAvc3JjL3JvdXRlcy9zaW11bGF0aW9uLWxhdW5jaHBhZC9TaW11bGF0aW9uTGF1bmNocGFkUm91dGUuanN4In0=