import { createHotContext as __vite__createHotContext } from "/@vite/client";import.meta.hot = __vite__createHotContext("/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx");import __vite__cjsImport0_react_jsxDevRuntime from "/node_modules/.vite/deps/react_jsx-dev-runtime.js?v=6e8fde4d"; const Fragment = __vite__cjsImport0_react_jsxDevRuntime["Fragment"]; const jsxDEV = __vite__cjsImport0_react_jsxDevRuntime["jsxDEV"];
var _s = $RefreshSig$(), _s2 = $RefreshSig$(), _s3 = $RefreshSig$(), _s4 = $RefreshSig$(), _s5 = $RefreshSig$();
import __vite__cjsImport1_react from "/node_modules/.vite/deps/react.js?v=6e8fde4d"; const useEffect = __vite__cjsImport1_react["useEffect"]; const useRef = __vite__cjsImport1_react["useRef"]; const useState = __vite__cjsImport1_react["useState"]; const useSyncExternalStore = __vite__cjsImport1_react["useSyncExternalStore"];
import __vite__cjsImport2_reactDom from "/node_modules/.vite/deps/react-dom.js?v=6e8fde4d"; const createPortal = __vite__cjsImport2_reactDom["createPortal"];
import {
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  CircleAlert,
  Diamond,
  Info,
  LockKeyhole,
  Pause,
  Play,
  SkipBack,
  SkipForward,
  Trash2
} from "/node_modules/.vite/deps/lucide-react.js?v=6e8fde4d";
import {
  ABOUT_NARRATIVE_GLOBAL_CONTROLS,
  ABOUT_NARRATIVE_CORRESPONDENCE_MODES,
  ABOUT_NARRATIVE_DISCIPLINE_REVEAL_CONTROLS,
  ABOUT_NARRATIVE_EMPHASIS_TONES,
  ABOUT_NARRATIVE_MODIFIER_DEFINITIONS,
  ABOUT_NARRATIVE_SHAPE_DEFINITIONS
} from "/src/routes/about-narrative-lab/aboutNarrativeDefinitions.js";
import {
  clearAboutNarrativeRecoveryDraft,
  exportAboutNarrativeDocument,
  loadAboutNarrativeSource,
  readAboutNarrativeCheckpoints,
  readAboutNarrativeRecoveryDraft,
  saveAboutNarrativeSource,
  writeAboutNarrativeCheckpoint,
  writeAboutNarrativeRecoveryDraft
} from "/src/routes/about-narrative-lab/aboutNarrativePersistence.js";
import {
  assertValidAboutNarrativeDocument,
  cloneAboutNarrativeDocument
} from "/src/routes/about-narrative-lab/aboutNarrativeSchema.js";
import {
  getAboutNarrativeCueMovement,
  getAboutNarrativeCueMotionInterval,
  getAboutNarrativeWorldTransitionLimit,
  sampleAboutNarrativePlan
} from "/src/routes/about-narrative-lab/aboutNarrativeCompiler.js?t=1784283765510";
import {
  captureAboutNarrativePlayheadContext,
  createAboutNarrativeCueClipboardPayload,
  deriveAboutNarrativeLoopRange,
  duplicateAboutNarrativeCueGroup,
  duplicateAboutNarrativeSection,
  getAboutNarrativeCameraKeyTimingBounds,
  getAboutNarrativeCueTimingBounds,
  getAboutNarrativeExtentField,
  getAboutNarrativeSelectionMembers,
  moveAboutNarrativeCueTiming,
  remapAboutNarrativePlayheadContext,
  resolveAboutNarrativeCameraKeyDrop,
  resolveAboutNarrativeCueDistribution,
  resolveAboutNarrativeCueExactGap,
  resolveAboutNarrativeCueGroupMove,
  resolveAboutNarrativeCueGroupAlign,
  resolveAboutNarrativeCueGroupPaste,
  snapAboutNarrativeTimelineValue,
  stitchAboutNarrativeCameraBoundaries,
  toggleAboutNarrativeCueSelection,
  validateAboutNarrativeCueClipboardPayload
} from "/src/routes/about-narrative-lab/aboutNarrativeTimeline.js?t=1784283765510";
import "/src/routes/about-narrative-lab/about-narrative-editor.css";
const clamp01 = (value) => Math.min(1, Math.max(0, value));
const ABOUT_EDITOR_TIMELINE_STORAGE_KEY = "abs:about-narrative:timeline-open:v1";
const TIMELINE_KEY_EPSILON = 4e-3;
const INSPECTOR_EDGE_GAP = 8;
const CAMERA_POSE_FIELDS = /* @__PURE__ */ new Set(["offset", "lookAtOffset", "fov", "roll"]);
const DISCIPLINE_REVEAL_MAX = ABOUT_NARRATIVE_DISCIPLINE_REVEAL_CONTROLS.find((control) => control.id === "end")?.max || 4;
const DISCIPLINE_BALL_TOKEN_BY_GROUP = Object.freeze({
  1: "--ball-1",
  2: "--ball-4",
  3: "--ball-3",
  4: "--ball-7",
  5: "--ball-8",
  6: "--ball-6"
});
const TIMELINE_GLOBAL_TRACKS = Object.freeze(
  [
    Object.freeze({ lane: "section", label: "Sections", groupIds: Object.freeze(["sequence"]) }),
    Object.freeze({ lane: "camera", label: "Camera", groupIds: Object.freeze(["camera"]) }),
    Object.freeze({ lane: "world", label: "World", groupIds: Object.freeze(["material", "swarmTurbulence"]) }),
    Object.freeze({ lane: "text", label: "Text", groupIds: Object.freeze(["textMotion"]) }),
    Object.freeze({ lane: "interaction", label: "Interaction", groupIds: Object.freeze([]) })
  ]
);
function cameraPoseChanges(from, to) {
  if (!from || !to) return false;
  return ["offset", "lookAtOffset"].some(
    (field) => from[field].some((value, index) => Math.abs(value - to[field][index]) > 1e-4)
  ) || Math.abs(from.fov - to.fov) > 1e-4 || Math.abs(from.roll - to.roll) > 1e-4;
}
function copyCameraPose(target, source) {
  target.offset = [...source.offset];
  target.lookAtOffset = [...source.lookAtOffset];
  target.fov = source.fov;
  target.roll = source.roll;
}
function linkCameraBoundary(document2, sectionIndex, keyIndex) {
  const section = document2.sections[sectionIndex];
  const key = section?.camera.keys[keyIndex];
  if (!key) return;
  if (keyIndex === 0 && sectionIndex > 0) {
    copyCameraPose(document2.sections[sectionIndex - 1].camera.keys.at(-1), key);
  }
  if (keyIndex === section.camera.keys.length - 1 && sectionIndex < document2.sections.length - 1) {
    copyCameraPose(document2.sections[sectionIndex + 1].camera.keys[0], key);
  }
}
function bridgeCameraSection(document2, sectionIndex) {
  const section = document2.sections[sectionIndex];
  if (!section?.camera.keys.length) return;
  if (sectionIndex > 0) copyCameraPose(section.camera.keys[0], document2.sections[sectionIndex - 1].camera.keys.at(-1));
  if (sectionIndex < document2.sections.length - 1) copyCameraPose(section.camera.keys.at(-1), document2.sections[sectionIndex + 1].camera.keys[0]);
}
function getInspectorVerticalBounds(inspector, timelineOpen) {
  const editor = inspector.closest(".about-editor");
  const styles = editor ? getComputedStyle(editor) : null;
  const topbarHeight = Number.parseFloat(styles?.getPropertyValue("--about-editor-topbar")) || 44;
  const timelineHeight = timelineOpen ? Number.parseFloat(styles?.getPropertyValue("--about-editor-timeline")) || 188 : 0;
  const buttonBarTop = document.querySelector("[data-button-bar]")?.getBoundingClientRect().top ?? window.innerHeight;
  return {
    minTop: topbarHeight + INSPECTOR_EDGE_GAP,
    maxBottom: (timelineOpen ? window.innerHeight - timelineHeight : buttonBarTop) - INSPECTOR_EDGE_GAP
  };
}
function clampInspectorPosition(inspector, position, timelineOpen) {
  const { minTop, maxBottom } = getInspectorVerticalBounds(inspector, timelineOpen);
  const maxWidth = Math.max(240, window.innerWidth - INSPECTOR_EDGE_GAP * 2);
  const width = Math.min(position.width, maxWidth);
  const availableHeight = Math.max(240, maxBottom - minTop);
  const height = Math.min(position.height, availableHeight);
  const maxLeft = Math.max(INSPECTOR_EDGE_GAP, window.innerWidth - width - INSPECTOR_EDGE_GAP);
  const maxTop = Math.max(minTop, maxBottom - height);
  return {
    left: Math.min(maxLeft, Math.max(INSPECTOR_EDGE_GAP, position.left)),
    top: Math.min(maxTop, Math.max(minTop, position.top)),
    width,
    height
  };
}
function getSectionIndex(document2, sectionId) {
  return document2.sections.findIndex((section) => section.id === sectionId);
}
function getSection(document2, selection) {
  const sectionId = selection.sectionId || document2.sections[0]?.id;
  return document2.sections.find((section) => section.id === sectionId) || document2.sections[0];
}
function getLocalProgress(plan, section, storyWU) {
  const compiled = plan?.sections?.find((item) => item.id === section.id);
  return compiled ? clamp01((storyWU - compiled.startWU) / compiled.travelWU) : 0;
}
function formatWU(value) {
  return `${Number(value || 0).toFixed(2)} WU`;
}
function formatCameraPercent(value) {
  return `${Number((Number(value) * 100).toFixed(1))}%`;
}
function isTextEditingTarget(target) {
  return target instanceof HTMLElement && (target.matches("input, textarea, select") || target.isContentEditable);
}
function getTimelineKeyframes(snapshot) {
  const plan = snapshot.compiledPlan;
  if (!plan?.sections?.length) return [];
  const events = [];
  plan.sections.forEach((compiled, sectionIndex) => {
    const section = snapshot.document.sections[sectionIndex];
    const toStoryWU = (at) => compiled.startWU + Number(at || 0) * compiled.travelWU;
    section.camera.keys.forEach((key, keyIndex) => {
      if (key.at === 0 || key.at === 1) return;
      events.push({
        storyWU: toStoryWU(key.at),
        priority: 0,
        selection: { type: "camera-key", sectionId: section.id, keyIndex }
      });
    });
    if (section.world.mode === "set" && section.world.transitionIn.type !== "cut") {
      ["start", "end"].forEach((part, partIndex) => events.push({
        storyWU: toStoryWU(section.world.transitionIn[part]),
        priority: 10 + partIndex,
        selection: { type: "world", sectionId: section.id, keyPart: `transition-${part}` }
      }));
    }
    (section.text.cues || []).forEach((cue, cueIndex) => {
      events.push({
        storyWU: toStoryWU(cue.hold),
        priority: 20 + cueIndex,
        selection: { type: "cue", sectionId: section.id, cueId: cue.id, keyPart: "focus" }
      });
    });
    if (section.text.disciplineReveal) {
      events.push({
        storyWU: toStoryWU(section.text.disciplineReveal.start),
        priority: 28,
        selection: { type: "discipline-reveal", sectionId: section.id }
      });
    }
    if (section.interaction?.type !== "none" && Number.isFinite(section.interaction.activationStart)) {
      events.push({
        storyWU: toStoryWU(section.interaction.activationStart),
        priority: 30,
        selection: { type: "interaction", sectionId: section.id, keyPart: "activation" }
      });
    }
  });
  return events.sort((a, b) => a.storyWU - b.storyWU || a.priority - b.priority);
}
function getTimelineDeletion(snapshot) {
  const { selection, document: document2 } = snapshot;
  const sectionIndex = getSectionIndex(document2, selection.sectionId);
  const section = document2.sections[sectionIndex];
  if (!section) return null;
  if (selection.type === "camera-key") {
    const key = section.camera.keys[selection.keyIndex];
    if (!key) return null;
    const required = key.at === 0 || key.at === 1;
    return {
      label: required ? "Required camera key" : "Delete camera key",
      disabled: required,
      message: required ? "The start and end Camera keys preserve Section continuity and cannot be removed." : "",
      execute: (store) => store.commit("Delete camera key", (draft) => {
        draft.sections[sectionIndex].camera.keys.splice(selection.keyIndex, 1);
      }, { selection: { type: "section", sectionId: section.id } })
    };
  }
  if (selection.type === "world" && selection.keyPart?.startsWith("transition-")) {
    return {
      label: "Remove transition",
      disabled: false,
      message: "",
      execute: (store) => store.commit("Remove World transition", (draft) => {
        const transition = draft.sections[sectionIndex].world.transitionIn;
        transition.start = 0;
        transition.end = 0;
        transition.type = "cut";
      }, { selection: { type: "world", sectionId: section.id } })
    };
  }
  if (selection.type === "interaction" && selection.keyPart === "activation") {
    return {
      label: "Remove interaction key",
      disabled: false,
      message: "",
      execute: (store) => store.commit("Remove interaction key", (draft) => {
        draft.sections[sectionIndex].interaction = { type: "none" };
      }, { selection: { type: "section", sectionId: section.id } })
    };
  }
  return null;
}
function deleteTimelineSelection(store, snapshot) {
  const deletion = getTimelineDeletion(snapshot);
  if (!deletion) return false;
  if (deletion.disabled) {
    store.setSaveState({ message: deletion.message });
    return true;
  }
  deletion.execute(store);
  return true;
}
function seekTimelineKeyframe(store, event) {
  if (!event) return;
  store.setSelection(event.selection);
  store.setTransport({ owner: "timeline", playing: false, storyWU: event.storyWU });
}
function jumpTimelineKeyframe(store, snapshot, direction) {
  const events = getTimelineKeyframes(snapshot);
  const currentWU = snapshot.transport.storyWU;
  const targetPosition = direction > 0 ? events.find((event2) => event2.storyWU > currentWU + TIMELINE_KEY_EPSILON)?.storyWU : [...events].reverse().find((event2) => event2.storyWU < currentWU - TIMELINE_KEY_EPSILON)?.storyWU;
  const event = Number.isFinite(targetPosition) ? events.find((item) => Math.abs(item.storyWU - targetPosition) < TIMELINE_KEY_EPSILON) : null;
  seekTimelineKeyframe(store, event);
}
function makeSlug(value) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "item";
}
function nextId(document2, base) {
  const used = new Set(document2.sections.flatMap(
    (section) => [
      section.id,
      ...(section.text.cues || []).map((cue) => cue.id),
      ...(section.text.blocks || []).map((block) => block.id),
      ...section.text.disciplineReveal ? [section.text.disciplineReveal.id] : []
    ]
  ));
  let id = makeSlug(base);
  let suffix = 2;
  while (used.has(id)) {
    id = `${makeSlug(base)}-${suffix}`;
    suffix += 1;
  }
  return id;
}
function replaceDraftDocument(draft, nextDocument) {
  Object.keys(draft).forEach((key) => delete draft[key]);
  Object.assign(draft, cloneAboutNarrativeDocument(nextDocument));
}
function applyCueMoves(draft, moves) {
  moves.forEach((move) => {
    const section = draft.sections.find((item) => item.id === move.sectionId);
    const cue = section?.text?.cues?.find((item) => item.id === move.cueId);
    if (cue) Object.assign(cue, { enter: move.enter, hold: move.hold, exit: move.exit });
  });
}
function Property({ label, children, hint = "" }) {
  return /* @__PURE__ */ jsxDEV("label", { className: "about-editor-property", children: [
    /* @__PURE__ */ jsxDEV("span", { children: label }, void 0, false, {
      fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
      lineNumber: 342,
      columnNumber: 7
    }, this),
    children,
    hint ? /* @__PURE__ */ jsxDEV("small", { children: hint }, void 0, false, {
      fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
      lineNumber: 344,
      columnNumber: 15
    }, this) : null
  ] }, void 0, true, {
    fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
    lineNumber: 341,
    columnNumber: 5
  }, this);
}
_c = Property;
function NumberProperty({ label, value, min, max, step, onChange, unit = "", disabled = false }) {
  return /* @__PURE__ */ jsxDEV(Property, { label, children: /* @__PURE__ */ jsxDEV("div", { className: "about-editor-number", children: [
    /* @__PURE__ */ jsxDEV(
      "input",
      {
        type: "range",
        value,
        min,
        max,
        step,
        disabled,
        onChange: (event) => onChange(Number(event.target.value))
      },
      void 0,
      false,
      {
        fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
        lineNumber: 353,
        columnNumber: 9
      },
      this
    ),
    /* @__PURE__ */ jsxDEV(
      "input",
      {
        type: "number",
        value,
        min,
        max,
        step,
        disabled,
        onChange: (event) => onChange(Number(event.target.value))
      },
      void 0,
      false,
      {
        fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
        lineNumber: 362,
        columnNumber: 9
      },
      this
    ),
    unit ? /* @__PURE__ */ jsxDEV("em", { children: unit }, void 0, false, {
      fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
      lineNumber: 371,
      columnNumber: 17
    }, this) : null
  ] }, void 0, true, {
    fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
    lineNumber: 352,
    columnNumber: 7
  }, this) }, void 0, false, {
    fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
    lineNumber: 351,
    columnNumber: 5
  }, this);
}
_c2 = NumberProperty;
function RangeProperty({ label, start, end, min, max, step, onStartChange, onEndChange, hint = "" }) {
  const startPercent = (start - min) / Math.max(1e-5, max - min) * 100;
  const endPercent = (end - min) / Math.max(1e-5, max - min) * 100;
  const percentageStep = step * 100;
  const setStart = (value) => onStartChange(Math.min(end - step, Math.max(min, Number(value) || 0)));
  const setEnd = (value) => onEndChange(Math.max(start + step, Math.min(max, Number(value) || 0)));
  return /* @__PURE__ */ jsxDEV(
    "fieldset",
    {
      className: "about-editor-range-property",
      "data-global-control": "clearWindow",
      style: { "--about-range-start": `${startPercent}%`, "--about-range-end": `${endPercent}%` },
      children: [
        /* @__PURE__ */ jsxDEV("legend", { children: label }, void 0, false, {
          fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
          lineNumber: 389,
          columnNumber: 7
        }, this),
        /* @__PURE__ */ jsxDEV("div", { className: "about-editor-dual-range", children: [
          /* @__PURE__ */ jsxDEV("span", { "aria-hidden": "true" }, void 0, false, {
            fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
            lineNumber: 391,
            columnNumber: 9
          }, this),
          /* @__PURE__ */ jsxDEV("input", { type: "range", "aria-label": `${label} start`, min, max: end - step, step, value: start, onChange: (event) => setStart(event.target.value) }, void 0, false, {
            fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
            lineNumber: 392,
            columnNumber: 9
          }, this),
          /* @__PURE__ */ jsxDEV("input", { type: "range", "aria-label": `${label} end`, min: start + step, max, step, value: end, onChange: (event) => setEnd(event.target.value) }, void 0, false, {
            fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
            lineNumber: 393,
            columnNumber: 9
          }, this)
        ] }, void 0, true, {
          fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
          lineNumber: 390,
          columnNumber: 7
        }, this),
        /* @__PURE__ */ jsxDEV("div", { className: "about-editor-range-values", children: [
          /* @__PURE__ */ jsxDEV("label", { children: [
            /* @__PURE__ */ jsxDEV("span", { children: "Starts" }, void 0, false, {
              fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
              lineNumber: 396,
              columnNumber: 16
            }, this),
            /* @__PURE__ */ jsxDEV("input", { type: "number", min: min * 100, max: (end - step) * 100, step: percentageStep, value: Math.round(start * 100), onChange: (event) => setStart(Number(event.target.value) / 100) }, void 0, false, {
              fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
              lineNumber: 396,
              columnNumber: 35
            }, this),
            /* @__PURE__ */ jsxDEV("em", { children: "%" }, void 0, false, {
              fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
              lineNumber: 396,
              columnNumber: 218
            }, this)
          ] }, void 0, true, {
            fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
            lineNumber: 396,
            columnNumber: 9
          }, this),
          /* @__PURE__ */ jsxDEV("i", { "aria-hidden": "true", children: "→" }, void 0, false, {
            fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
            lineNumber: 397,
            columnNumber: 9
          }, this),
          /* @__PURE__ */ jsxDEV("label", { children: [
            /* @__PURE__ */ jsxDEV("span", { children: "Ends" }, void 0, false, {
              fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
              lineNumber: 398,
              columnNumber: 16
            }, this),
            /* @__PURE__ */ jsxDEV("input", { type: "number", min: (start + step) * 100, max: max * 100, step: percentageStep, value: Math.round(end * 100), onChange: (event) => setEnd(Number(event.target.value) / 100) }, void 0, false, {
              fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
              lineNumber: 398,
              columnNumber: 33
            }, this),
            /* @__PURE__ */ jsxDEV("em", { children: "%" }, void 0, false, {
              fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
              lineNumber: 398,
              columnNumber: 214
            }, this)
          ] }, void 0, true, {
            fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
            lineNumber: 398,
            columnNumber: 9
          }, this)
        ] }, void 0, true, {
          fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
          lineNumber: 395,
          columnNumber: 7
        }, this),
        hint ? /* @__PURE__ */ jsxDEV("small", { children: hint }, void 0, false, {
          fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
          lineNumber: 400,
          columnNumber: 15
        }, this) : null
      ]
    },
    void 0,
    true,
    {
      fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
      lineNumber: 384,
      columnNumber: 5
    },
    this
  );
}
_c3 = RangeProperty;
function Transport({ store, snapshot }) {
  const { transport, compiledPlan } = snapshot;
  const maxWU = compiledPlan?.maxStoryWU || 1;
  const play = () => store.setTransport({
    owner: transport.playing ? "timeline" : "playback",
    playing: !transport.playing,
    storyWU: transport.storyWU
  });
  const seek = (storyWU) => store.setTransport({ owner: "timeline", playing: false, storyWU });
  const selected = getSection(snapshot.document, snapshot.selection);
  const sectionIndex = getSectionIndex(snapshot.document, selected.id);
  const jumpSection = (direction) => {
    const next = snapshot.compiledPlan.sections[Math.max(0, Math.min(snapshot.compiledPlan.sections.length - 1, sectionIndex + direction))];
    if (next) seek(next.startWU);
  };
  return /* @__PURE__ */ jsxDEV("div", { className: "about-editor-transport", children: [
    /* @__PURE__ */ jsxDEV("button", { type: "button", title: "Previous Section", "aria-label": "Previous Section", onClick: () => jumpSection(-1), children: /* @__PURE__ */ jsxDEV(SkipBack, { "aria-hidden": "true" }, void 0, false, {
      fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
      lineNumber: 422,
      columnNumber: 116
    }, this) }, void 0, false, {
      fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
      lineNumber: 422,
      columnNumber: 7
    }, this),
    /* @__PURE__ */ jsxDEV("button", { type: "button", title: "Previous keyframe · Left arrow", "aria-label": "Previous keyframe", onClick: () => jumpTimelineKeyframe(store, snapshot, -1), children: /* @__PURE__ */ jsxDEV(ChevronLeft, { "aria-hidden": "true" }, void 0, false, {
      fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
      lineNumber: 423,
      columnNumber: 157
    }, this) }, void 0, false, {
      fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
      lineNumber: 423,
      columnNumber: 7
    }, this),
    /* @__PURE__ */ jsxDEV("button", { type: "button", className: "is-primary", title: transport.playing ? "Pause" : "Play", "aria-label": transport.playing ? "Pause" : "Play", onClick: play, children: transport.playing ? /* @__PURE__ */ jsxDEV(Pause, { "aria-hidden": "true" }, void 0, false, {
      fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
      lineNumber: 425,
      columnNumber: 30
    }, this) : /* @__PURE__ */ jsxDEV(Play, { "aria-hidden": "true" }, void 0, false, {
      fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
      lineNumber: 425,
      columnNumber: 61
    }, this) }, void 0, false, {
      fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
      lineNumber: 424,
      columnNumber: 7
    }, this),
    /* @__PURE__ */ jsxDEV("button", { type: "button", title: "Next Section", "aria-label": "Next Section", onClick: () => jumpSection(1), children: /* @__PURE__ */ jsxDEV(SkipForward, { "aria-hidden": "true" }, void 0, false, {
      fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
      lineNumber: 427,
      columnNumber: 107
    }, this) }, void 0, false, {
      fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
      lineNumber: 427,
      columnNumber: 7
    }, this),
    /* @__PURE__ */ jsxDEV("button", { type: "button", title: "Next keyframe · Right arrow", "aria-label": "Next keyframe", onClick: () => jumpTimelineKeyframe(store, snapshot, 1), children: /* @__PURE__ */ jsxDEV(ChevronRight, { "aria-hidden": "true" }, void 0, false, {
      fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
      lineNumber: 428,
      columnNumber: 149
    }, this) }, void 0, false, {
      fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
      lineNumber: 428,
      columnNumber: 7
    }, this),
    /* @__PURE__ */ jsxDEV("output", { children: formatWU(transport.storyWU) }, void 0, false, {
      fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
      lineNumber: 429,
      columnNumber: 7
    }, this),
    /* @__PURE__ */ jsxDEV(
      "input",
      {
        "aria-label": "Global narrative playhead",
        type: "range",
        min: "0",
        max: maxWU,
        step: "0.002",
        value: Math.min(maxWU, transport.storyWU),
        onChange: (event) => seek(Number(event.target.value))
      },
      void 0,
      false,
      {
        fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
        lineNumber: 430,
        columnNumber: 7
      },
      this
    ),
    /* @__PURE__ */ jsxDEV(
      "button",
      {
        type: "button",
        className: transport.owner === "scroll" ? "is-active" : "",
        onClick: () => store.setTransport({ owner: "scroll", playing: false }),
        children: "Follow scroll"
      },
      void 0,
      false,
      {
        fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
        lineNumber: 439,
        columnNumber: 7
      },
      this
    ),
    /* @__PURE__ */ jsxDEV(
      "button",
      {
        type: "button",
        className: transport.liveAmbient ? "is-active" : "",
        onClick: () => store.setTransport({ liveAmbient: !transport.liveAmbient }),
        children: "Live ambient"
      },
      void 0,
      false,
      {
        fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
        lineNumber: 444,
        columnNumber: 7
      },
      this
    ),
    /* @__PURE__ */ jsxDEV(
      "select",
      {
        "aria-label": "Preview profile",
        value: snapshot.previewProfile,
        onChange: (event) => store.setPreviewProfile(event.target.value),
        children: [
          /* @__PURE__ */ jsxDEV("option", { value: "desktop", children: "Desktop" }, void 0, false, {
            fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
            lineNumber: 454,
            columnNumber: 9
          }, this),
          /* @__PURE__ */ jsxDEV("option", { value: "mobile", children: "Mobile" }, void 0, false, {
            fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
            lineNumber: 455,
            columnNumber: 9
          }, this),
          /* @__PURE__ */ jsxDEV("option", { value: "reduced-motion", children: "Reduced motion" }, void 0, false, {
            fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
            lineNumber: 456,
            columnNumber: 9
          }, this)
        ]
      },
      void 0,
      true,
      {
        fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
        lineNumber: 449,
        columnNumber: 7
      },
      this
    )
  ] }, void 0, true, {
    fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
    lineNumber: 421,
    columnNumber: 5
  }, this);
}
_c4 = Transport;
function Timeline({ store, snapshot, onOpenGlobal }) {
  _s();
  const { document: document2, compiledPlan, selection, transport } = snapshot;
  const selectedCueMembers = getAboutNarrativeSelectionMembers(selection);
  const maxWU = Math.max(1e-3, compiledPlan?.maxStoryWU || document2.sections.reduce((sum, section) => sum + section.extentWU, 0));
  const playhead = `${transport.storyWU / maxWU * 100}%`;
  const lanesRef = useRef(null);
  const timingDragRef = useRef(null);
  const previewFrameRef = useRef(null);
  const pendingPreviewRef = useRef(null);
  const suppressedClickRef = useRef(null);
  const [cameraDragPreview, setCameraDragPreview] = useState(null);
  const [sectionResizePreview, setSectionResizePreview] = useState(null);
  const [marquee, setMarquee] = useState(null);
  const queuePreviewFrame = (callback) => {
    pendingPreviewRef.current = callback;
    if (previewFrameRef.current) return;
    previewFrameRef.current = requestAnimationFrame(() => {
      previewFrameRef.current = null;
      const pending = pendingPreviewRef.current;
      pendingPreviewRef.current = null;
      pending?.();
    });
  };
  const flushPreviewFrame = () => {
    if (previewFrameRef.current) cancelAnimationFrame(previewFrameRef.current);
    previewFrameRef.current = null;
    const pending = pendingPreviewRef.current;
    pendingPreviewRef.current = null;
    pending?.();
  };
  const zoomTimeline = (event) => {
    if (!event.ctrlKey && !event.metaKey) return;
    event.preventDefault();
    const lanes = lanesRef.current;
    if (!lanes) return;
    const rect = lanes.getBoundingClientRect();
    const pointerX = Math.min(rect.width, Math.max(0, event.clientX - rect.left));
    const storyRatio = (lanes.scrollLeft + pointerX) / Math.max(1, lanes.scrollWidth);
    const currentZoom = Math.max(1, Number(transport.zoom) || 1);
    const nextZoom = Math.min(8, Math.max(1, currentZoom * Math.exp(-event.deltaY * 25e-4)));
    store.setTransport({ zoom: Number(nextZoom.toFixed(3)) });
    requestAnimationFrame(() => {
      lanes.scrollLeft = storyRatio * lanes.scrollWidth - pointerX;
    });
  };
  useEffect(() => () => {
    if (previewFrameRef.current) cancelAnimationFrame(previewFrameRef.current);
  }, []);
  const resolveCameraDropAtClientX = (clientX) => {
    const lanes = lanesRef.current;
    const current = store.getSnapshot();
    if (!lanes) return { valid: false, reason: "The camera timeline is not ready." };
    const rect = lanes.getBoundingClientRect();
    const contentX = Math.min(
      lanes.scrollWidth,
      Math.max(0, clientX - rect.left + lanes.scrollLeft)
    );
    const storyWU = contentX / Math.max(1, lanes.scrollWidth) * Math.max(1e-3, current.compiledPlan?.maxStoryWU || maxWU);
    const drag = timingDragRef.current;
    const drop = resolveAboutNarrativeCameraKeyDrop({
      document: current.document,
      plan: current.compiledPlan,
      sourceSectionIndex: drag?.sectionIndex,
      sourceKeyIndex: drag?.keyIndex,
      storyWU
    });
    return { ...drop, contentX };
  };
  const beginTimingDrag = (event, drag) => {
    if (drag.locked || event.button !== 0) return;
    const clip = event.currentTarget.parentElement;
    const rect = clip?.getBoundingClientRect();
    if (!rect?.width) return;
    event.preventDefault();
    event.stopPropagation();
    event.currentTarget.setPointerCapture?.(event.pointerId);
    let nextSelection = drag.selection;
    if (drag.type === "cue") {
      const currentSelection = store.getSnapshot().selection;
      const currentMembers = getAboutNarrativeSelectionMembers(currentSelection);
      const alreadySelected = currentMembers.some(
        (member) => member.sectionId === drag.selection.sectionId && member.cueId === drag.selection.cueId
      );
      nextSelection = event.shiftKey ? toggleAboutNarrativeCueSelection(currentSelection, drag.selection) : alreadySelected && currentMembers.length > 1 ? { ...drag.selection, members: currentMembers } : drag.selection;
      store.beginPreview("Move text Cues");
    }
    timingDragRef.current = {
      ...drag,
      selection: nextSelection,
      members: drag.type === "cue" ? getAboutNarrativeSelectionMembers(nextSelection) : null,
      startDocument: drag.type === "cue" ? cloneAboutNarrativeDocument(store.getSnapshot().document) : null,
      startPlan: drag.type === "cue" ? store.getSnapshot().compiledPlan : null,
      pointerId: event.pointerId,
      rect,
      startX: event.clientX,
      moved: false,
      lastAt: drag.at,
      lastDrop: null
    };
    store.setSelection(nextSelection);
    store.setTransport({ owner: "timeline", playing: false, storyWU: drag.storyWU });
  };
  const moveTimingDrag = (event) => {
    const drag = timingDragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    if (!drag.moved && Math.abs(event.clientX - drag.startX) < 3) return;
    drag.moved = true;
    if (drag.type === "camera") {
      const drop = resolveCameraDropAtClientX(event.clientX);
      drag.lastDrop = drop;
      setCameraDragPreview({ ...drop, token: drag.token });
      if (drop.valid) {
        store.setTransport({ owner: "timeline", playing: false, storyWU: drop.storyWU });
      }
      return;
    }
    if (drag.type === "discipline-reveal") {
      const deltaLane = (event.clientX - drag.startX) / drag.rect.width;
      const nextAt = Math.min(drag.max, Math.max(
        drag.min,
        snapAboutNarrativeTimelineValue(drag.at + deltaLane)
      ));
      if (Math.abs(nextAt - drag.lastAt) < 1e-6) return;
      const delta = nextAt - drag.lastAt;
      store.commit("Move Discipline reveal", (draft) => {
        const reveal = draft.sections[drag.sectionIndex].text.disciplineReveal;
        if (!reveal) return;
        reveal.start += delta;
        reveal.end += delta;
      }, { coalesceKey: drag.coalesceKey, selection: drag.selection });
      drag.lastAt = nextAt;
      store.setTransport({
        owner: "timeline",
        playing: false,
        storyWU: drag.sectionStartWU + nextAt * drag.travelWU
      });
      return;
    }
    const localDelta = (event.clientX - drag.startX) / drag.rect.width;
    const movement = resolveAboutNarrativeCueGroupMove({
      document: drag.startDocument,
      plan: drag.startPlan,
      members: drag.members,
      primary: drag.selection,
      localDelta
    });
    if (!movement.valid || Math.abs(movement.deltaWU - (drag.lastDeltaWU || 0)) < 1e-6) return;
    drag.lastDeltaWU = movement.deltaWU;
    queuePreviewFrame(() => {
      store.updatePreview((draft) => {
        movement.moves.forEach((move) => {
          const cue = draft.sections[move.sectionIndex]?.text?.cues?.find((item) => item.id === move.cueId);
          if (cue) Object.assign(cue, { enter: move.enter, hold: move.hold, exit: move.exit });
        });
      }, {
        owner: "timeline",
        playing: false,
        storyWU: drag.storyWU + movement.deltaWU
      });
    });
  };
  const endTimingDrag = (event) => {
    const drag = timingDragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    if (event.currentTarget.hasPointerCapture?.(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
    if (drag.type === "cue") {
      flushPreviewFrame();
      if (event.type === "pointercancel" || !drag.moved) store.cancelPreview();
      else
        store.commitPreview(drag.selection);
    }
    if (drag.type === "camera" && drag.moved && event.type !== "pointercancel") {
      const drop = drag.lastDrop || resolveCameraDropAtClientX(event.clientX);
      if (drop.valid) {
        store.commit("Move camera key", (draft) => {
          const sourceKeys = draft.sections[drag.sectionIndex]?.camera.keys;
          const [movedKey] = sourceKeys?.splice(drag.keyIndex, 1) || [];
          if (!movedKey) return;
          movedKey.at = drop.at;
          const destinationKeys = draft.sections[drop.sectionIndex].camera.keys;
          destinationKeys.push(movedKey);
          destinationKeys.sort((a, b) => a.at - b.at);
        }, {
          selection: { type: "camera-key", sectionId: drop.sectionId, keyIndex: drop.keyIndex }
        });
        store.setTransport({ owner: "timeline", playing: false, storyWU: drop.storyWU });
      } else {
        store.setSaveState({ message: drop.reason || "That camera key cannot be placed here." });
      }
    }
    if (drag.moved) {
      suppressedClickRef.current = drag.token;
      window.setTimeout(() => {
        if (suppressedClickRef.current === drag.token) suppressedClickRef.current = null;
      }, 0);
    }
    setCameraDragPreview(null);
    timingDragRef.current = null;
  };
  const handleTimingClick = (token, action) => {
    if (suppressedClickRef.current === token) {
      suppressedClickRef.current = null;
      return;
    }
    action();
  };
  const beginSectionResize = (event, data) => {
    if (data.locked || event.button !== 0) return;
    event.preventDefault();
    event.stopPropagation();
    event.currentTarget.setPointerCapture?.(event.pointerId);
    const current = store.getSnapshot();
    const field = getAboutNarrativeExtentField(current.previewProfile);
    store.beginPreview(`Resize ${data.sectionLabel}`);
    store.setSelection({ type: "section", sectionId: data.sectionId });
    timingDragRef.current = {
      type: "section-resize",
      token: `section-resize:${data.sectionId}`,
      pointerId: event.pointerId,
      startX: event.clientX,
      moved: false,
      sectionId: data.sectionId,
      sectionIndex: data.sectionIndex,
      sectionLabel: data.sectionLabel,
      field,
      startExtent: Number(current.document.sections[data.sectionIndex][field]),
      startMaxWU: Math.max(1e-3, current.compiledPlan?.maxStoryWU || maxWU),
      startScrollWidth: Math.max(1, lanesRef.current?.scrollWidth || 1),
      playheadContext: captureAboutNarrativePlayheadContext({
        plan: current.compiledPlan,
        storyWU: current.transport.storyWU,
        resizedSectionId: data.sectionId
      }),
      selection: { type: "section", sectionId: data.sectionId }
    };
    setSectionResizePreview({ sectionId: data.sectionId, extent: Number(current.document.sections[data.sectionIndex][field]) });
  };
  const moveSectionResize = (event) => {
    const drag = timingDragRef.current;
    if (drag?.type !== "section-resize" || drag.pointerId !== event.pointerId) return;
    if (!drag.moved && Math.abs(event.clientX - drag.startX) < 3) return;
    drag.moved = true;
    const rawExtent = drag.startExtent + (event.clientX - drag.startX) / drag.startScrollWidth * drag.startMaxWU;
    const step = event.altKey ? 0.01 : event.shiftKey ? 0.25 : 0.05;
    const extent = Math.min(8, Math.max(1, Math.round(rawExtent / step) * step));
    if (Math.abs(extent - (drag.lastExtent ?? drag.startExtent)) < 1e-6) return;
    drag.lastExtent = Number(extent.toFixed(2));
    setSectionResizePreview({ sectionId: drag.sectionId, extent: drag.lastExtent });
    queuePreviewFrame(() => {
      store.updatePreview((draft) => {
        draft.sections[drag.sectionIndex][drag.field] = drag.lastExtent;
      });
      store.setTransport({
        owner: "timeline",
        playing: false,
        storyWU: remapAboutNarrativePlayheadContext(drag.playheadContext, store.getSnapshot().compiledPlan)
      });
    });
  };
  const endSectionResize = (event) => {
    const drag = timingDragRef.current;
    if (drag?.type !== "section-resize" || drag.pointerId !== event.pointerId) return;
    if (event.currentTarget.hasPointerCapture?.(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
    flushPreviewFrame();
    if (event.type === "pointercancel" || !drag.moved) store.cancelPreview();
    else
      store.commitPreview(drag.selection);
    timingDragRef.current = null;
    setSectionResizePreview(null);
  };
  const resetSectionExtent = (sectionId, sectionIndex) => {
    const current = store.getSnapshot();
    const field = getAboutNarrativeExtentField(current.previewProfile);
    const baselineSection = current.baselineDocument.sections.find((item) => item.id === sectionId);
    if (!baselineSection || baselineSection[field] === current.document.sections[sectionIndex][field]) return;
    const context = captureAboutNarrativePlayheadContext({
      plan: current.compiledPlan,
      storyWU: current.transport.storyWU,
      resizedSectionId: sectionId
    });
    store.beginPreview("Restore saved Section length");
    store.updatePreview((draft) => {
      draft.sections[sectionIndex][field] = baselineSection[field];
    });
    store.setTransport({ storyWU: remapAboutNarrativePlayheadContext(context, store.getSnapshot().compiledPlan) });
    store.commitPreview({ type: "section", sectionId });
  };
  const beginMarquee = (event) => {
    if (event.button !== 0 || event.target !== event.currentTarget) return;
    const canvas = lanesRef.current?.querySelector(".about-editor-timeline-canvas");
    if (!canvas) return;
    event.preventDefault();
    event.currentTarget.setPointerCapture?.(event.pointerId);
    const rect = canvas.getBoundingClientRect();
    timingDragRef.current = {
      type: "marquee",
      pointerId: event.pointerId,
      startClientX: event.clientX,
      startClientY: event.clientY,
      canvasRect: rect,
      additive: event.shiftKey
    };
    setMarquee({ left: event.clientX - rect.left, top: event.clientY - rect.top, width: 0, height: 0 });
  };
  const moveMarquee = (event) => {
    const drag = timingDragRef.current;
    if (drag?.type !== "marquee" || drag.pointerId !== event.pointerId) return;
    const left = Math.min(drag.startClientX, event.clientX) - drag.canvasRect.left;
    const top = Math.min(drag.startClientY, event.clientY) - drag.canvasRect.top;
    setMarquee({
      left,
      top,
      width: Math.abs(event.clientX - drag.startClientX),
      height: Math.abs(event.clientY - drag.startClientY)
    });
  };
  const endMarquee = (event) => {
    const drag = timingDragRef.current;
    if (drag?.type !== "marquee" || drag.pointerId !== event.pointerId) return;
    if (event.currentTarget.hasPointerCapture?.(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
    if (event.type !== "pointercancel") {
      const selectionRect = {
        left: Math.min(drag.startClientX, event.clientX),
        right: Math.max(drag.startClientX, event.clientX),
        top: Math.min(drag.startClientY, event.clientY),
        bottom: Math.max(drag.startClientY, event.clientY)
      };
      const laneRect = lanesRef.current?.getBoundingClientRect();
      const hits = [...lanesRef.current?.querySelectorAll(".about-editor-cue[data-cue-id]") || []].filter((node) => {
        const rect = node.getBoundingClientRect();
        const visible = laneRect && rect.right >= laneRect.left && rect.left <= laneRect.right;
        return visible && rect.right >= selectionRect.left && rect.left <= selectionRect.right && rect.bottom >= selectionRect.top && rect.top <= selectionRect.bottom;
      }).map((node) => ({ type: "cue", sectionId: node.dataset.sectionId, cueId: node.dataset.cueId, keyPart: "focus" }));
      if (hits.length) {
        let nextSelection = drag.additive ? store.getSnapshot().selection : hits[0];
        hits.slice(drag.additive ? 0 : 1).forEach((hit) => {
          nextSelection = toggleAboutNarrativeCueSelection(nextSelection, hit);
        });
        store.setSelection(nextSelection);
      }
    }
    timingDragRef.current = null;
    setMarquee(null);
  };
  return /* @__PURE__ */ jsxDEV("div", { className: "about-editor-timeline", children: [
    /* @__PURE__ */ jsxDEV("div", { className: "about-editor-lane-labels", "aria-label": "Timeline tracks", children: TIMELINE_GLOBAL_TRACKS.map(
      (track) => track.groupIds.length ? /* @__PURE__ */ jsxDEV(
        "button",
        {
          type: "button",
          className: selection.type === "sequence" && selection.track === track.lane ? "is-active" : "",
          "data-global-track": track.lane,
          "aria-label": `Open global ${track.label} controls`,
          "aria-pressed": selection.type === "sequence" && selection.track === track.lane,
          onClick: () => onOpenGlobal?.({ type: "sequence", track: track.lane, trackLabel: track.label, groupIds: track.groupIds }),
          children: track.label
        },
        track.lane,
        false,
        {
          fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
          lineNumber: 831,
          columnNumber: 9
        },
        this
      ) : /* @__PURE__ */ jsxDEV("span", { children: track.label }, track.lane, false, {
        fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
        lineNumber: 840,
        columnNumber: 9
      }, this)
    ) }, void 0, false, {
      fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
      lineNumber: 828,
      columnNumber: 7
    }, this),
    /* @__PURE__ */ jsxDEV("div", { ref: lanesRef, className: "about-editor-lanes", "data-solo-track": transport.soloTrack || "", onWheel: zoomTimeline, children: /* @__PURE__ */ jsxDEV("div", { className: "about-editor-timeline-canvas", style: { "--about-editor-playhead": playhead, "--about-editor-timeline-zoom": Math.max(1, Number(transport.zoom) || 1) }, children: [
      /* @__PURE__ */ jsxDEV("div", { className: "about-editor-playhead" }, void 0, false, {
        fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
        lineNumber: 845,
        columnNumber: 11
      }, this),
      marquee ? /* @__PURE__ */ jsxDEV("div", { className: "about-editor-marquee", style: marquee, "aria-hidden": "true" }, void 0, false, {
        fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
        lineNumber: 846,
        columnNumber: 22
      }, this) : null,
      cameraDragPreview ? /* @__PURE__ */ jsxDEV(
        "div",
        {
          className: `about-editor-camera-drag-ghost${cameraDragPreview.valid ? "" : " is-invalid"}`,
          style: { left: `${cameraDragPreview.contentX}px` },
          "aria-hidden": "true",
          children: [
            /* @__PURE__ */ jsxDEV("i", {}, void 0, false, {
              fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
              lineNumber: 853,
              columnNumber: 13
            }, this),
            /* @__PURE__ */ jsxDEV("span", { children: cameraDragPreview.valid ? `${cameraDragPreview.sectionLabel} · ${formatCameraPercent(cameraDragPreview.at)}` : cameraDragPreview.reason }, void 0, false, {
              fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
              lineNumber: 854,
              columnNumber: 13
            }, this)
          ]
        },
        void 0,
        true,
        {
          fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
          lineNumber: 848,
          columnNumber: 11
        },
        this
      ) : null,
      ["section", "camera", "world", "text", "interaction"].map(
        (lane) => /* @__PURE__ */ jsxDEV("div", { className: `about-editor-lane about-editor-lane--${lane}`, children: document2.sections.map((section, sectionIndex) => {
          const compiled = compiledPlan?.sections?.[sectionIndex];
          const startWU = Math.min(maxWU, compiled?.startWU || 0);
          const nextStartWU = Math.min(maxWU, compiledPlan?.sections?.[sectionIndex + 1]?.startWU ?? maxWU);
          const spanWU = Math.max(1e-3, nextStartWU - startWU);
          const width = `${spanWU / maxWU * 100}%`;
          const inSelectedSection = selection.sectionId === section.id;
          const localPercent = (at) => Math.min(100, Number(at || 0) * (compiled?.travelWU || spanWU) / spanWU * 100);
          const localPosition = (at) => `${localPercent(at)}%`;
          const extendedLocalPosition = (at) => `${Number(at || 0) * (compiled?.travelWU || spanWU) / spanWU * 100}%`;
          const extendedLocalWidth = (from, to) => `${Math.max(0.35, (Number(to) - Number(from)) * (compiled?.travelWU || spanWU) / spanWU * 100)}%`;
          const textPosition = (at) => `${clamp01(Number(at || 0)) * 100}%`;
          const selectAt = (nextSelection, at = 0) => {
            store.setSelection({ sectionId: section.id, ...nextSelection });
            store.setTransport({
              owner: "timeline",
              playing: false,
              storyWU: startWU + Number(at || 0) * (compiled?.travelWU || 0)
            });
          };
          if (lane === "section") {
            const isSelected2 = inSelectedSection && selection.type === "section";
            const resizeExtent = sectionResizePreview?.sectionId === section.id ? sectionResizePreview.extent : Number(section[getAboutNarrativeExtentField(snapshot.previewProfile)]);
            return /* @__PURE__ */ jsxDEV(
              "div",
              {
                className: `about-editor-section-clip${isSelected2 ? " is-selected" : ""}${inSelectedSection ? " is-context" : ""}`,
                style: { width },
                title: `${section.label} · ${formatWU(compiled?.resolvedExtentWU || section.extentWU)}`,
                children: [
                  /* @__PURE__ */ jsxDEV("button", { type: "button", "aria-pressed": isSelected2, onClick: () => selectAt({ type: "section" }), children: [
                    /* @__PURE__ */ jsxDEV("span", { children: String(sectionIndex + 1).padStart(2, "0") }, void 0, false, {
                      fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
                      lineNumber: 892,
                      columnNumber: 23
                    }, this),
                    section.label
                  ] }, void 0, true, {
                    fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
                    lineNumber: 891,
                    columnNumber: 21
                  }, this),
                  sectionResizePreview?.sectionId === section.id ? /* @__PURE__ */ jsxDEV("output", { children: [
                    formatWU(Math.max(0, resizeExtent - 1)),
                    " scroll · ",
                    formatWU(resizeExtent),
                    " total"
                  ] }, void 0, true, {
                    fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
                    lineNumber: 894,
                    columnNumber: 71
                  }, this) : null,
                  /* @__PURE__ */ jsxDEV(
                    "button",
                    {
                      type: "button",
                      className: "about-editor-section-resize",
                      disabled: section.locked,
                      "aria-label": `Resize ${section.label}`,
                      title: section.locked ? "Unlock this protected Section to resize it" : `Drag to change ${snapshot.previewProfile === "mobile" ? "mobile" : "desktop"} scroll length · double-click to restore saved length`,
                      onDoubleClick: (event) => {
                        event.preventDefault();
                        event.stopPropagation();
                        resetSectionExtent(section.id, sectionIndex);
                      },
                      onPointerDown: (event) => beginSectionResize(event, { sectionId: section.id, sectionIndex, sectionLabel: section.label, locked: section.locked }),
                      onPointerMove: moveSectionResize,
                      onPointerUp: endSectionResize,
                      onPointerCancel: endSectionResize
                    },
                    void 0,
                    false,
                    {
                      fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
                      lineNumber: 895,
                      columnNumber: 21
                    },
                    this
                  )
                ]
              },
              section.id,
              true,
              {
                fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
                lineNumber: 885,
                columnNumber: 19
              },
              this
            );
          }
          if (lane === "camera") {
            return /* @__PURE__ */ jsxDEV("div", { className: "about-editor-clip", style: { width }, children: [
              /* @__PURE__ */ jsxDEV("div", { className: "about-editor-camera-rail", "aria-hidden": "true", children: section.camera.keys.slice(1).map((key, keyIndex) => {
                const fromKey = section.camera.keys[keyIndex];
                const left = localPercent(fromKey.at);
                const right = localPercent(key.at);
                return /* @__PURE__ */ jsxDEV(
                  "span",
                  {
                    className: cameraPoseChanges(fromKey, key) ? "is-authored-motion" : "is-base-dolly",
                    style: { left: `${left}%`, width: `${Math.max(0.5, right - left)}%` }
                  },
                  `${section.id}:camera-span:${keyIndex}`,
                  false,
                  {
                    fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
                    lineNumber: 919,
                    columnNumber: 27
                  },
                  this
                );
              }) }, void 0, false, {
                fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
                lineNumber: 913,
                columnNumber: 21
              }, this),
              section.camera.keys.map((key, keyIndex) => {
                const timingBounds = getAboutNarrativeCameraKeyTimingBounds(section.camera.keys, keyIndex);
                const token = `camera:${section.id}:${keyIndex}`;
                const keySelection = { type: "camera-key", sectionId: section.id, keyIndex };
                const isSelected2 = inSelectedSection && selection.type === "camera-key" && selection.keyIndex === keyIndex;
                const required = timingBounds.locked;
                return /* @__PURE__ */ jsxDEV(
                  "button",
                  {
                    type: "button",
                    className: `about-editor-key${required ? " is-boundary" : " is-draggable"}${isSelected2 ? " is-selected" : ""}${cameraDragPreview?.token === token ? " is-drag-source" : ""}`,
                    style: { left: localPosition(key.at) },
                    title: required ? `Protected Camera key at ${formatCameraPercent(key.at)} · select to inspect` : `Camera key at ${formatCameraPercent(key.at)} · drag anywhere on the Camera track`,
                    "aria-label": `${required ? "Protected " : ""}Camera key at ${formatCameraPercent(key.at)} through ${section.label}`,
                    "aria-pressed": isSelected2,
                    onPointerDown: required ? void 0 : (event) => beginTimingDrag(event, {
                      type: "camera",
                      token,
                      locked: false,
                      at: key.at,
                      sectionIndex,
                      keyIndex,
                      sectionStartWU: startWU,
                      spanWU,
                      travelWU: compiled?.travelWU || spanWU,
                      storyWU: startWU + Number(key.at) * (compiled?.travelWU || 0),
                      selection: keySelection,
                      coalesceKey: `timeline:${token}`
                    }),
                    onPointerMove: required ? void 0 : moveTimingDrag,
                    onPointerUp: required ? void 0 : endTimingDrag,
                    onPointerCancel: required ? void 0 : endTimingDrag,
                    onClick: () => handleTimingClick(token, () => selectAt({ type: "camera-key", keyIndex }, key.at))
                  },
                  token,
                  false,
                  {
                    fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
                    lineNumber: 934,
                    columnNumber: 25
                  },
                  this
                );
              })
            ] }, section.id, true, {
              fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
              lineNumber: 912,
              columnNumber: 19
            }, this);
          }
          if (lane === "world") {
            const isSelected2 = inSelectedSection && selection.type === "world";
            const transition = section.world.mode === "set" && section.world.transitionIn.type !== "cut" ? section.world.transitionIn : null;
            return /* @__PURE__ */ jsxDEV("div", { className: `about-editor-clip${isSelected2 ? " is-selected" : ""}`, style: { width }, children: [
              /* @__PURE__ */ jsxDEV(
                "button",
                {
                  type: "button",
                  className: `about-editor-world-clip ${section.world.mode === "set" ? "has-world" : ""}${isSelected2 ? " is-selected" : ""}`,
                  "aria-pressed": isSelected2,
                  onClick: () => selectAt({ type: "world" }, transition ? transition.end : 0),
                  children: section.world.mode === "set" ? section.world.shapeId.replace("-v1", "") : "continue"
                },
                void 0,
                false,
                {
                  fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
                  lineNumber: 975,
                  columnNumber: 21
                },
                this
              ),
              transition ? ["start", "end"].map(
                (part) => /* @__PURE__ */ jsxDEV(
                  "button",
                  {
                    type: "button",
                    className: `about-editor-timing-key is-world${isSelected2 && selection.keyPart === `transition-${part}` ? " is-selected" : ""}`,
                    style: { left: extendedLocalPosition(transition[part]) },
                    title: `World transition ${part}`,
                    "aria-label": `${section.label} World transition ${part}`,
                    onClick: () => selectAt({ type: "world", keyPart: `transition-${part}` }, transition[part])
                  },
                  part,
                  false,
                  {
                    fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
                    lineNumber: 982,
                    columnNumber: 21
                  },
                  this
                )
              ) : null
            ] }, section.id, true, {
              fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
              lineNumber: 974,
              columnNumber: 19
            }, this);
          }
          if (lane === "text") {
            return /* @__PURE__ */ jsxDEV(
              "div",
              {
                className: `about-editor-clip${section.text.disciplineReveal ? " has-extended-discipline" : ""}`,
                style: { width },
                onPointerDown: beginMarquee,
                onPointerMove: moveMarquee,
                onPointerUp: endMarquee,
                onPointerCancel: endMarquee,
                children: [
                  (section.text.cues || []).map((cue) => {
                    const isSelected2 = selectedCueMembers.some((member) => member.sectionId === section.id && member.cueId === cue.id);
                    const isPrimary = selection.type === "cue" && selection.sectionId === section.id && selection.cueId === cue.id;
                    const movement = getAboutNarrativeCueMovement(cue);
                    const motionInterval = movement === "spatial" ? getAboutNarrativeCueMotionInterval(cue, document2.globals.textMotion) : null;
                    const motionSpan = motionInterval ? Math.max(1e-5, motionInterval.end - motionInterval.start) : 0;
                    const cueStyle = motionInterval ? {
                      left: textPosition(motionInterval.start),
                      width: `${Math.max(0.5, motionSpan * 100)}%`
                    } : { left: textPosition(cue.hold) };
                    const focusPosition = motionInterval ? `${(cue.hold - motionInterval.start) / motionSpan * 100}%` : "50%";
                    const timingBounds = getAboutNarrativeCueTimingBounds(cue);
                    const token = `cue:${section.id}:${cue.id}`;
                    const cueSelection = { type: "cue", sectionId: section.id, cueId: cue.id, keyPart: "focus" };
                    return /* @__PURE__ */ jsxDEV(
                      "button",
                      {
                        type: "button",
                        className: `about-editor-cue is-${movement}${timingBounds.min === timingBounds.max ? " is-boundary" : " is-draggable"}${isSelected2 ? " is-selected" : ""}${isPrimary ? " is-primary-selection" : ""}`,
                        "data-section-id": section.id,
                        "data-cue-id": cue.id,
                        style: cueStyle,
                        "aria-label": `${movement === "vertical" ? "Vertical" : "Spatial"} text at ${Math.round(cue.hold * 100)}%${motionInterval ? ` · travels ${Math.round(motionInterval.start * 100)}–${Math.round(motionInterval.end * 100)}%` : ""} · ${cue.text}`,
                        "aria-pressed": isSelected2,
                        title: `${movement === "vertical" ? "Vertical" : "Spatial"} title · drag to move it; duration stays global · ${cue.text}`,
                        onPointerDown: (event) => beginTimingDrag(event, {
                          type: "cue",
                          token,
                          locked: timingBounds.min === timingBounds.max,
                          min: timingBounds.min,
                          max: timingBounds.max,
                          at: cue.hold,
                          sectionIndex,
                          cueId: cue.id,
                          sectionStartWU: startWU,
                          spanWU,
                          travelWU: compiled?.travelWU || spanWU,
                          storyWU: startWU + Number(cue.hold) * (compiled?.travelWU || 0),
                          selection: cueSelection,
                          coalesceKey: `timeline:${token}`
                        }),
                        onPointerMove: moveTimingDrag,
                        onPointerUp: endTimingDrag,
                        onPointerCancel: endTimingDrag,
                        onKeyDown: (event) => {
                          if (event.shiftKey && event.code === "Space") {
                            event.preventDefault();
                            const nextSelection = toggleAboutNarrativeCueSelection(store.getSnapshot().selection, cueSelection);
                            store.setSelection(nextSelection);
                            store.setTransport({ owner: "timeline", playing: false, storyWU: startWU + Number(cue.hold) * (compiled?.travelWU || 0) });
                          }
                        },
                        onClick: () => handleTimingClick(token, () => {
                          store.setTransport({ owner: "timeline", playing: false, storyWU: startWU + Number(cue.hold) * (compiled?.travelWU || 0) });
                        }),
                        children: /* @__PURE__ */ jsxDEV("span", { className: "about-editor-cue-focus", style: { left: focusPosition }, "aria-hidden": "true" }, void 0, false, {
                          fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
                          lineNumber: 1065,
                          columnNumber: 27
                        }, this)
                      },
                      cue.id,
                      false,
                      {
                        fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
                        lineNumber: 1025,
                        columnNumber: 25
                      },
                      this
                    );
                  }),
                  section.text.disciplineReveal ? (() => {
                    const reveal = section.text.disciplineReveal;
                    const duration = reveal.end - reveal.start;
                    const centre = reveal.start + duration * 0.5;
                    const isSelected2 = inSelectedSection && selection.type === "discipline-reveal";
                    const token = `discipline-reveal:${section.id}:${reveal.id}`;
                    const revealSelection = { type: "discipline-reveal", sectionId: section.id };
                    return /* @__PURE__ */ jsxDEV(
                      "button",
                      {
                        type: "button",
                        className: `about-editor-discipline-reveal is-draggable${isSelected2 ? " is-selected" : ""}`,
                        style: { left: extendedLocalPosition(reveal.start), width: extendedLocalWidth(reveal.start, reveal.end) },
                        "aria-label": `Discipline reveal from ${Math.round(reveal.start * 100)}% to ${Math.round(reveal.end * 100)}%`,
                        "aria-pressed": isSelected2,
                        title: "Discipline reveal · drag the complete clip to retime",
                        onPointerDown: (event) => beginTimingDrag(event, {
                          type: "discipline-reveal",
                          token,
                          locked: false,
                          min: duration * 0.5,
                          max: DISCIPLINE_REVEAL_MAX - duration * 0.5,
                          at: centre,
                          sectionIndex,
                          sectionStartWU: startWU,
                          spanWU,
                          travelWU: compiled?.travelWU || spanWU,
                          storyWU: startWU + centre * (compiled?.travelWU || 0),
                          selection: revealSelection,
                          coalesceKey: `timeline:${token}`
                        }),
                        onPointerMove: moveTimingDrag,
                        onPointerUp: endTimingDrag,
                        onPointerCancel: endTimingDrag,
                        onClick: () => handleTimingClick(token, () => selectAt({ type: "discipline-reveal" }, reveal.start)),
                        children: "Discipline reveal"
                      },
                      void 0,
                      false,
                      {
                        fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
                        lineNumber: 1076,
                        columnNumber: 25
                      },
                      this
                    );
                  })() : null,
                  (section.text.blocks || []).length ? /* @__PURE__ */ jsxDEV("button", { type: "button", className: `about-editor-editorial-clip${inSelectedSection && selection.type === "section" ? " is-selected" : ""}`, onClick: () => selectAt({ type: "section" }), children: [
                    "Vertical · ",
                    section.text.blocks.length,
                    " blocks"
                  ] }, void 0, true, {
                    fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
                    lineNumber: 1106,
                    columnNumber: 21
                  }, this) : null
                ]
              },
              section.id,
              true,
              {
                fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
                lineNumber: 997,
                columnNumber: 19
              },
              this
            );
          }
          const isSelected = inSelectedSection && selection.type === "interaction";
          const activation = section.interaction?.type !== "none" ? section.interaction.activationStart : null;
          return /* @__PURE__ */ jsxDEV("div", { className: `about-editor-clip${isSelected ? " is-selected" : ""}`, style: { width }, children: [
            /* @__PURE__ */ jsxDEV(
              "button",
              {
                type: "button",
                className: `about-editor-interaction-clip ${section.interaction?.type !== "none" ? "has-interaction" : ""}${isSelected ? " is-selected" : ""}`,
                "aria-pressed": isSelected,
                onClick: () => selectAt({ type: "interaction" }, activation || 0),
                children: section.interaction?.type !== "none" ? section.interaction.type : ""
              },
              void 0,
              false,
              {
                fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
                lineNumber: 1117,
                columnNumber: 19
              },
              this
            ),
            Number.isFinite(activation) ? /* @__PURE__ */ jsxDEV(
              "button",
              {
                type: "button",
                className: `about-editor-timing-key is-interaction${isSelected && selection.keyPart === "activation" ? " is-selected" : ""}`,
                style: { left: localPosition(activation) },
                title: "Interaction activation",
                "aria-label": `${section.label} interaction activation keyframe`,
                onClick: () => selectAt({ type: "interaction", keyPart: "activation" }, activation)
              },
              void 0,
              false,
              {
                fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
                lineNumber: 1124,
                columnNumber: 19
              },
              this
            ) : null
          ] }, section.id, true, {
            fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
            lineNumber: 1116,
            columnNumber: 17
          }, this);
        }) }, lane, false, {
          fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
          lineNumber: 858,
          columnNumber: 11
        }, this)
      )
    ] }, void 0, true, {
      fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
      lineNumber: 844,
      columnNumber: 9
    }, this) }, void 0, false, {
      fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
      lineNumber: 843,
      columnNumber: 7
    }, this)
  ] }, void 0, true, {
    fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
    lineNumber: 827,
    columnNumber: 5
  }, this);
}
_s(Timeline, "V8B8QgS1RFfl00PqY9/a7lD+sxE=");
_c5 = Timeline;
function SequenceInspector({ store, snapshot }) {
  const commitGlobal = (group, key, value) => store.commit(`Change ${key}`, (draft) => {
    if (group === "sequence") draft.globals[key] = value;
    else {
      const targetKey = group === "material" ? "pointMaterial" : group;
      draft.globals[targetKey][key] = value;
    }
  }, { coalesceKey: `global:${group}:${key}` });
  return /* @__PURE__ */ jsxDEV(Fragment, { children: [
    /* @__PURE__ */ jsxDEV("header", { children: [
      /* @__PURE__ */ jsxDEV("span", { children: "Sequence" }, void 0, false, {
        fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
        lineNumber: 1154,
        columnNumber: 15
      }, this),
      /* @__PURE__ */ jsxDEV("strong", { children: "Global controls" }, void 0, false, {
        fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
        lineNumber: 1154,
        columnNumber: 36
      }, this)
    ] }, void 0, true, {
      fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
      lineNumber: 1154,
      columnNumber: 7
    }, this),
    ABOUT_NARRATIVE_GLOBAL_CONTROLS.map(
      (group) => /* @__PURE__ */ jsxDEV("details", { open: true, children: [
        /* @__PURE__ */ jsxDEV("summary", { children: group.label }, void 0, false, {
          fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
          lineNumber: 1157,
          columnNumber: 11
        }, this),
        group.id === "textMotion" ? /* @__PURE__ */ jsxDEV("p", { className: "about-editor-help", children: "Every title follows this path continuously. Negative Y is higher, positive Y is lower. The opener starts sharp at its own Y position; Clear from and Clear until set the sharp window for later titles." }, void 0, false, {
          fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
          lineNumber: 1158,
          columnNumber: 40
        }, this) : null,
        group.id === "swarmTurbulence" ? /* @__PURE__ */ jsxDEV("p", { className: "about-editor-help", children: "One ambient motion profile drives both the cluster and turbulent field. Each World only scales its strength, so the motion stays continuous while Shapes change." }, void 0, false, {
          fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
          lineNumber: 1159,
          columnNumber: 45
        }, this) : null,
        group.controls.map((control) => {
          const target = group.id === "sequence" ? snapshot.document.globals : snapshot.document.globals[group.id === "material" ? "pointMaterial" : group.id];
          return /* @__PURE__ */ jsxDEV(
            NumberProperty,
            {
              label: control.label,
              value: target[control.id],
              min: control.min,
              max: control.max,
              step: control.step,
              unit: control.unit,
              onChange: (value) => commitGlobal(group.id, control.id, value)
            },
            control.id,
            false,
            {
              fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
              lineNumber: 1165,
              columnNumber: 13
            },
            this
          );
        })
      ] }, group.id, true, {
        fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
        lineNumber: 1156,
        columnNumber: 7
      }, this)
    )
  ] }, void 0, true, {
    fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
    lineNumber: 1153,
    columnNumber: 5
  }, this);
}
_c6 = SequenceInspector;
function SectionInspector({ store, snapshot, section }) {
  const sectionIndex = getSectionIndex(snapshot.document, section.id);
  const compiledSection = snapshot.compiledPlan?.sections?.[sectionIndex];
  const activeExtentField = snapshot.previewProfile === "mobile" ? "mobileExtentWU" : "extentWU";
  const activeExtent = Number(section[activeExtentField]);
  const resolvedExtent = Number(compiledSection?.resolvedExtentWU ?? activeExtent);
  const contentMinimumActive = resolvedExtent > activeExtent + 1e-3;
  const baselineSection = snapshot.baselineDocument.sections.find((item) => item.id === section.id);
  const update = (label, mutate, coalesceKey = null) => store.commit(label, (draft) => {
    mutate(draft.sections[sectionIndex]);
  }, { coalesceKey, selection: snapshot.selection });
  const move = (direction) => store.commit("Reorder Section", (draft) => {
    const toIndex = sectionIndex + direction;
    if (toIndex < 0 || toIndex >= draft.sections.length) return;
    const [moved] = draft.sections.splice(sectionIndex, 1);
    draft.sections.splice(toIndex, 0, moved);
    replaceDraftDocument(draft, stitchAboutNarrativeCameraBoundaries(draft));
  }, { selection: { type: "section", sectionId: section.id } });
  const duplicate = () => {
    const result = duplicateAboutNarrativeSection({ document: snapshot.document, sectionId: section.id });
    if (!result.valid) {
      store.setSaveState({ message: result.reason || "This Section cannot be duplicated." });
      return;
    }
    store.commit("Duplicate Section", (draft) => replaceDraftDocument(draft, result.document), {
      selection: result.selection
    });
  };
  return /* @__PURE__ */ jsxDEV(Fragment, { children: [
    /* @__PURE__ */ jsxDEV("header", { children: [
      /* @__PURE__ */ jsxDEV("span", { children: [
        "Section ",
        String(sectionIndex + 1).padStart(2, "0")
      ] }, void 0, true, {
        fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
        lineNumber: 1214,
        columnNumber: 15
      }, this),
      /* @__PURE__ */ jsxDEV("strong", { children: section.label }, void 0, false, {
        fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
        lineNumber: 1214,
        columnNumber: 79
      }, this)
    ] }, void 0, true, {
      fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
      lineNumber: 1214,
      columnNumber: 7
    }, this),
    section.locked ? /* @__PURE__ */ jsxDEV("div", { className: "about-editor-lock", children: [
      /* @__PURE__ */ jsxDEV(LockKeyhole, { "aria-hidden": "true" }, void 0, false, {
        fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
        lineNumber: 1215,
        columnNumber: 60
      }, this),
      /* @__PURE__ */ jsxDEV("span", { children: "This protected Section cannot be reordered or have its World replaced accidentally." }, void 0, false, {
        fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
        lineNumber: 1215,
        columnNumber: 94
      }, this),
      /* @__PURE__ */ jsxDEV("button", { type: "button", onClick: () => update("Unlock protected Section", (draft) => {
        draft.locked = false;
      }), children: "Unlock advanced" }, void 0, false, {
        fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
        lineNumber: 1215,
        columnNumber: 190
      }, this)
    ] }, void 0, true, {
      fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
      lineNumber: 1215,
      columnNumber: 25
    }, this) : null,
    /* @__PURE__ */ jsxDEV("div", { className: "about-editor-inline-actions", children: [
      /* @__PURE__ */ jsxDEV("button", { type: "button", disabled: section.locked || sectionIndex === 0, onClick: () => move(-1), children: "Move earlier" }, void 0, false, {
        fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
        lineNumber: 1217,
        columnNumber: 9
      }, this),
      /* @__PURE__ */ jsxDEV("button", { type: "button", disabled: section.locked || sectionIndex === snapshot.document.sections.length - 1, onClick: () => move(1), children: "Move later" }, void 0, false, {
        fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
        lineNumber: 1218,
        columnNumber: 9
      }, this),
      /* @__PURE__ */ jsxDEV("button", { type: "button", disabled: section.locked || section.type === "finale", onClick: duplicate, children: "Duplicate" }, void 0, false, {
        fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
        lineNumber: 1219,
        columnNumber: 9
      }, this)
    ] }, void 0, true, {
      fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
      lineNumber: 1216,
      columnNumber: 7
    }, this),
    /* @__PURE__ */ jsxDEV(Property, { label: "Section name", children: /* @__PURE__ */ jsxDEV("input", { value: section.label, onChange: (event) => update("Rename Section", (draft) => {
      draft.label = event.target.value;
    }, `section:${section.id}:label`) }, void 0, false, {
      fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
      lineNumber: 1221,
      columnNumber: 38
    }, this) }, void 0, false, {
      fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
      lineNumber: 1221,
      columnNumber: 7
    }, this),
    /* @__PURE__ */ jsxDEV(Property, { label: "Stable ID", children: [
      /* @__PURE__ */ jsxDEV("input", { value: section.id, readOnly: true }, void 0, false, {
        fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
        lineNumber: 1222,
        columnNumber: 35
      }, this),
      /* @__PURE__ */ jsxDEV("small", { children: "References this Section without tying it to its current meaning." }, void 0, false, {
        fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
        lineNumber: 1222,
        columnNumber: 72
      }, this)
    ] }, void 0, true, {
      fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
      lineNumber: 1222,
      columnNumber: 7
    }, this),
    /* @__PURE__ */ jsxDEV(Property, { label: "Type", children: /* @__PURE__ */ jsxDEV("select", { value: section.type, disabled: section.type === "finale", onChange: (event) => update("Change Section type", (draft) => {
      draft.type = event.target.value;
    }), children: [
      /* @__PURE__ */ jsxDEV("option", { value: "spatial", children: "Spatial" }, void 0, false, {
        fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
        lineNumber: 1225,
        columnNumber: 11
      }, this),
      /* @__PURE__ */ jsxDEV("option", { value: "editorial", children: "Editorial" }, void 0, false, {
        fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
        lineNumber: 1225,
        columnNumber: 51
      }, this),
      /* @__PURE__ */ jsxDEV("option", { value: "finale", children: "Finale" }, void 0, false, {
        fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
        lineNumber: 1225,
        columnNumber: 95
      }, this)
    ] }, void 0, true, {
      fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
      lineNumber: 1224,
      columnNumber: 9
    }, this) }, void 0, false, {
      fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
      lineNumber: 1223,
      columnNumber: 7
    }, this),
    /* @__PURE__ */ jsxDEV("details", { open: true, children: [
      /* @__PURE__ */ jsxDEV("summary", { children: "Section timing" }, void 0, false, {
        fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
        lineNumber: 1229,
        columnNumber: 9
      }, this),
      /* @__PURE__ */ jsxDEV(Property, { label: "Scroll travel", children: /* @__PURE__ */ jsxDEV("output", { className: "about-editor-readout", children: formatWU(Math.max(0, activeExtent - 1)) }, void 0, false, {
        fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
        lineNumber: 1230,
        columnNumber: 41
      }, this) }, void 0, false, {
        fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
        lineNumber: 1230,
        columnNumber: 9
      }, this),
      /* @__PURE__ */ jsxDEV(Property, { label: "Total height", children: /* @__PURE__ */ jsxDEV("output", { className: "about-editor-readout", children: formatWU(activeExtent) }, void 0, false, {
        fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
        lineNumber: 1231,
        columnNumber: 40
      }, this) }, void 0, false, {
        fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
        lineNumber: 1231,
        columnNumber: 9
      }, this),
      /* @__PURE__ */ jsxDEV(NumberProperty, { label: "Desktop length", value: section.extentWU, min: 1, max: 8, step: 0.05, unit: "WU", onChange: (value) => update("Change desktop Section length", (draft) => {
        draft.extentWU = value;
      }, `section:${section.id}:extent`) }, void 0, false, {
        fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
        lineNumber: 1232,
        columnNumber: 9
      }, this),
      /* @__PURE__ */ jsxDEV(NumberProperty, { label: "Mobile length", value: section.mobileExtentWU, min: 1, max: 8, step: 0.05, unit: "WU", onChange: (value) => update("Change mobile Section length", (draft) => {
        draft.mobileExtentWU = value;
      }, `section:${section.id}:mobile`) }, void 0, false, {
        fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
        lineNumber: 1233,
        columnNumber: 9
      }, this),
      /* @__PURE__ */ jsxDEV(Property, { label: "Resolved height", children: /* @__PURE__ */ jsxDEV("output", { className: "about-editor-readout", children: formatWU(resolvedExtent) }, void 0, false, {
        fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
        lineNumber: 1234,
        columnNumber: 43
      }, this) }, void 0, false, {
        fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
        lineNumber: 1234,
        columnNumber: 9
      }, this),
      contentMinimumActive ? /* @__PURE__ */ jsxDEV("p", { className: "about-editor-timing-warning", children: [
        "Content minimum in effect. The rendered copy needs ",
        formatWU(resolvedExtent),
        " in this profile."
      ] }, void 0, true, {
        fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
        lineNumber: 1235,
        columnNumber: 33
      }, this) : null,
      /* @__PURE__ */ jsxDEV(
        "button",
        {
          type: "button",
          className: "about-editor-wide-action",
          disabled: !baselineSection || baselineSection[activeExtentField] === section[activeExtentField],
          onClick: () => update("Restore saved Section length", (draft) => {
            draft[activeExtentField] = baselineSection[activeExtentField];
          }),
          children: [
            "Reset ",
            snapshot.previewProfile === "mobile" ? "mobile" : "desktop",
            " length"
          ]
        },
        void 0,
        true,
        {
          fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
          lineNumber: 1236,
          columnNumber: 9
        },
        this
      )
    ] }, void 0, true, {
      fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
      lineNumber: 1228,
      columnNumber: 7
    }, this),
    section.type === "editorial" ? /* @__PURE__ */ jsxDEV(EditorialBlocks, { store, snapshot, section }, void 0, false, {
      fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
      lineNumber: 1243,
      columnNumber: 39
    }, this) : null,
    section.type !== "editorial" ? /* @__PURE__ */ jsxDEV(
      "button",
      {
        type: "button",
        className: "about-editor-wide-action",
        onClick: () => {
          const local = getLocalProgress(snapshot.compiledPlan, section, snapshot.transport.storyWU);
          const id = nextId(snapshot.document, `${section.id}-statement`);
          const focus = Math.min(0.92, Math.max(0.08, snapAboutNarrativeTimelineValue(local)));
          update("Add text Cue", (draft) => {
            draft.text.cues ||= [];
            draft.text.cues.push({ id, text: "New travelling statement", enter: focus - 0.08, hold: focus, exit: focus + 0.08, preset: "travelling-title-v1", motion: { mode: "spatial" } });
            draft.text.cues.sort((a, b) => a.hold - b.hold);
          });
          store.setSelection({ type: "cue", sectionId: section.id, cueId: id, keyPart: "focus" });
        },
        children: "Add text cue at playhead"
      },
      void 0,
      false,
      {
        fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
        lineNumber: 1245,
        columnNumber: 7
      },
      this
    ) : null
  ] }, void 0, true, {
    fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
    lineNumber: 1213,
    columnNumber: 5
  }, this);
}
_c7 = SectionInspector;
function EditorialBlocks({ store, snapshot, section }) {
  const sectionIndex = getSectionIndex(snapshot.document, section.id);
  const updateBlock = (blockIndex, field, value) => store.commit("Edit editorial copy", (draft) => {
    draft.sections[sectionIndex].text.blocks[blockIndex][field] = value;
  }, { coalesceKey: `block:${section.id}:${blockIndex}:${field}`, selection: snapshot.selection });
  const updateEmphasis = (blockIndex, emphasisIndex, field, value) => store.commit("Edit editorial highlight", (draft) => {
    draft.sections[sectionIndex].text.blocks[blockIndex].emphasis[emphasisIndex][field] = value;
  }, { coalesceKey: `block:${section.id}:${blockIndex}:emphasis:${emphasisIndex}:${field}`, selection: snapshot.selection });
  const addEmphasis = (blockIndex) => store.commit("Add editorial highlight", (draft) => {
    const block = draft.sections[sectionIndex].text.blocks[blockIndex];
    block.emphasis ||= [];
    block.emphasis.push({ text: block.text.trim().split(/\s+/).slice(0, 2).join(" "), tone: "blue" });
  }, { selection: snapshot.selection });
  const removeEmphasis = (blockIndex, emphasisIndex) => store.commit("Remove editorial highlight", (draft) => {
    draft.sections[sectionIndex].text.blocks[blockIndex].emphasis.splice(emphasisIndex, 1);
  }, { selection: snapshot.selection });
  return /* @__PURE__ */ jsxDEV("details", { open: true, children: [
    /* @__PURE__ */ jsxDEV("summary", { children: "Editorial content" }, void 0, false, {
      fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
      lineNumber: 1283,
      columnNumber: 7
    }, this),
    (section.text.blocks || []).map(
      (block, blockIndex) => /* @__PURE__ */ jsxDEV("div", { className: "about-editor-block", children: [
        /* @__PURE__ */ jsxDEV("div", { children: [
          /* @__PURE__ */ jsxDEV("code", { children: block.kind }, void 0, false, {
            fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
            lineNumber: 1286,
            columnNumber: 16
          }, this),
          /* @__PURE__ */ jsxDEV("span", { children: block.id }, void 0, false, {
            fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
            lineNumber: 1286,
            columnNumber: 41
          }, this)
        ] }, void 0, true, {
          fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
          lineNumber: 1286,
          columnNumber: 11
        }, this),
        block.label != null ? /* @__PURE__ */ jsxDEV(Property, { label: "Label", children: /* @__PURE__ */ jsxDEV("input", { value: block.label, onChange: (event) => updateBlock(blockIndex, "label", event.target.value) }, void 0, false, {
          fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
          lineNumber: 1287,
          columnNumber: 58
        }, this) }, void 0, false, {
          fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
          lineNumber: 1287,
          columnNumber: 34
        }, this) : null,
        block.text != null ? /* @__PURE__ */ jsxDEV(Property, { label: "Copy", children: /* @__PURE__ */ jsxDEV("textarea", { rows: "5", value: block.text, onChange: (event) => updateBlock(blockIndex, "text", event.target.value) }, void 0, false, {
          fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
          lineNumber: 1288,
          columnNumber: 56
        }, this) }, void 0, false, {
          fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
          lineNumber: 1288,
          columnNumber: 33
        }, this) : null,
        block.kind === "prose" ? /* @__PURE__ */ jsxDEV(Property, { label: "Reconnect point grid", children: /* @__PURE__ */ jsxDEV("input", { type: "checkbox", checked: block.worldInfluence === true, onChange: (event) => updateBlock(blockIndex, "worldInfluence", event.target.checked) }, void 0, false, {
          fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
          lineNumber: 1289,
          columnNumber: 76
        }, this) }, void 0, false, {
          fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
          lineNumber: 1289,
          columnNumber: 37
        }, this) : null,
        block.text != null ? /* @__PURE__ */ jsxDEV("div", { className: "about-editor-emphasis-controls", children: [
          /* @__PURE__ */ jsxDEV("span", { children: "Highlighted words" }, void 0, false, {
            fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
            lineNumber: 1292,
            columnNumber: 15
          }, this),
          (block.emphasis || []).map(
            (item, emphasisIndex) => /* @__PURE__ */ jsxDEV("div", { className: "about-editor-emphasis-row", children: [
              /* @__PURE__ */ jsxDEV("input", { "aria-label": "Highlighted phrase", value: item.text, onChange: (event) => updateEmphasis(blockIndex, emphasisIndex, "text", event.target.value) }, void 0, false, {
                fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
                lineNumber: 1295,
                columnNumber: 19
              }, this),
              /* @__PURE__ */ jsxDEV("select", { "aria-label": "Highlight colour", value: item.tone, onChange: (event) => updateEmphasis(blockIndex, emphasisIndex, "tone", event.target.value), children: ABOUT_NARRATIVE_EMPHASIS_TONES.map((tone) => /* @__PURE__ */ jsxDEV("option", { value: tone, children: tone }, tone, false, {
                fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
                lineNumber: 1297,
                columnNumber: 67
              }, this)) }, void 0, false, {
                fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
                lineNumber: 1296,
                columnNumber: 19
              }, this),
              /* @__PURE__ */ jsxDEV("button", { type: "button", "aria-label": `Remove ${item.text || "empty"} highlight`, onClick: () => removeEmphasis(blockIndex, emphasisIndex), children: "×" }, void 0, false, {
                fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
                lineNumber: 1299,
                columnNumber: 19
              }, this)
            ] }, `${block.id}-emphasis-${emphasisIndex}`, true, {
              fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
              lineNumber: 1294,
              columnNumber: 11
            }, this)
          ),
          /* @__PURE__ */ jsxDEV("button", { type: "button", onClick: () => addEmphasis(blockIndex), children: "Add highlight" }, void 0, false, {
            fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
            lineNumber: 1302,
            columnNumber: 15
          }, this)
        ] }, void 0, true, {
          fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
          lineNumber: 1291,
          columnNumber: 9
        }, this) : null,
        block.items ? /* @__PURE__ */ jsxDEV(Property, { label: "Items", children: /* @__PURE__ */ jsxDEV("textarea", { rows: "6", value: block.items.join("\n"), onChange: (event) => updateBlock(blockIndex, "items", event.target.value.split("\n").filter(Boolean)) }, void 0, false, {
          fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
          lineNumber: 1305,
          columnNumber: 50
        }, this) }, void 0, false, {
          fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
          lineNumber: 1305,
          columnNumber: 26
        }, this) : null
      ] }, block.id, true, {
        fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
        lineNumber: 1285,
        columnNumber: 7
      }, this)
    ),
    /* @__PURE__ */ jsxDEV("button", { type: "button", className: "about-editor-wide-action", onClick: () => store.commit("Add editorial block", (draft) => {
      draft.sections[sectionIndex].text.blocks.push({ id: nextId(draft, `${section.id}-prose`), kind: "prose", text: "New editorial paragraph." });
    }), children: "Add prose block" }, void 0, false, {
      fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
      lineNumber: 1308,
      columnNumber: 7
    }, this)
  ] }, void 0, true, {
    fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
    lineNumber: 1282,
    columnNumber: 5
  }, this);
}
_c8 = EditorialBlocks;
function CueRhythmAndReuse({ store, snapshot, clipboard, setClipboard }) {
  _s2();
  const members = getAboutNarrativeSelectionMembers(snapshot.selection);
  const [gapWU, setGapWU] = useState(0.35);
  const [anchor, setAnchor] = useState("primary");
  const [preview, setPreview] = useState(null);
  const [message, setMessage] = useState("");
  const previewMoves = (label, result) => {
    if (!result.valid) {
      if (snapshot.tryState) store.cancelTry();
      setPreview(result);
      setMessage(result.reason || "This arrangement does not fit the selected Sections.");
      return;
    }
    if (snapshot.tryState) store.cancelTry();
    store.beginTry(label, (draft) => applyCueMoves(draft, result.moves));
    setPreview({ ...result, label });
    setMessage("");
  };
  const cancelPreview = () => {
    if (snapshot.tryState) store.cancelTry();
    setPreview(null);
    setMessage("");
  };
  const applyPreview = () => {
    if (!preview?.valid || !snapshot.tryState) return;
    store.applyTry();
    setPreview(null);
    setMessage("");
  };
  const commitCandidate = (label, result) => {
    if (!result?.valid || !result.document) {
      setMessage(result?.reason || "This operation could not be completed safely.");
      return;
    }
    store.commit(label, (draft) => replaceDraftDocument(draft, result.document), {
      selection: result.selection || snapshot.selection
    });
    setMessage("");
  };
  const distribute = () => previewMoves("Distribute title rhythm", resolveAboutNarrativeCueDistribution({
    document: snapshot.document,
    plan: snapshot.compiledPlan,
    members,
    primary: snapshot.selection
  }));
  const exactGap = () => previewMoves("Set exact title gap", resolveAboutNarrativeCueExactGap({
    document: snapshot.document,
    plan: snapshot.compiledPlan,
    members,
    primary: snapshot.selection,
    gapWU,
    anchor
  }));
  const alignPrimary = () => previewMoves("Align titles to playhead", resolveAboutNarrativeCueGroupAlign({
    document: snapshot.document,
    plan: snapshot.compiledPlan,
    members,
    primary: snapshot.selection,
    playheadWU: snapshot.transport.storyWU
  }));
  const duplicate = () => commitCandidate("Duplicate title Cues", duplicateAboutNarrativeCueGroup({
    document: snapshot.document,
    members,
    primary: snapshot.selection
  }));
  const copy = () => {
    const result = createAboutNarrativeCueClipboardPayload({
      document: snapshot.document,
      plan: snapshot.compiledPlan,
      members,
      primary: snapshot.selection
    });
    const payload = result?.payload || result;
    const validation = validateAboutNarrativeCueClipboardPayload(payload);
    if (result?.valid === false || validation?.valid === false) {
      setMessage(result?.reason || validation?.reason || "These titles cannot be copied.");
      return;
    }
    setClipboard(payload);
    setMessage(`${members.length} title${members.length === 1 ? "" : "s"} copied for this editor session.`);
  };
  const paste = () => commitCandidate("Paste title Cues", resolveAboutNarrativeCueGroupPaste({
    document: snapshot.document,
    plan: snapshot.compiledPlan,
    payload: clipboard,
    destinationSectionId: snapshot.selection.sectionId,
    playheadWU: snapshot.transport.storyWU
  }));
  const ghostMoves = preview?.valid ? preview.moves : [];
  const maxWU = Math.max(1e-3, snapshot.compiledPlan?.maxStoryWU || 1);
  return /* @__PURE__ */ jsxDEV("details", { className: "about-editor-rhythm", open: members.length > 1, children: [
    /* @__PURE__ */ jsxDEV("summary", { children: "Rhythm and reuse" }, void 0, false, {
      fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
      lineNumber: 1410,
      columnNumber: 7
    }, this),
    members.length > 1 ? /* @__PURE__ */ jsxDEV(Fragment, { children: [
      /* @__PURE__ */ jsxDEV("div", { className: "about-editor-rhythm-actions", children: [
        /* @__PURE__ */ jsxDEV("button", { type: "button", onClick: distribute, children: "Distribute evenly" }, void 0, false, {
          fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
          lineNumber: 1414,
          columnNumber: 13
        }, this),
        /* @__PURE__ */ jsxDEV("button", { type: "button", onClick: alignPrimary, children: "Align primary to playhead" }, void 0, false, {
          fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
          lineNumber: 1415,
          columnNumber: 13
        }, this)
      ] }, void 0, true, {
        fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
        lineNumber: 1413,
        columnNumber: 11
      }, this),
      /* @__PURE__ */ jsxDEV("div", { className: "about-editor-rhythm-gap", children: [
        /* @__PURE__ */ jsxDEV(Property, { label: "Exact gap", children: /* @__PURE__ */ jsxDEV("input", { type: "number", min: "0", max: "8", step: "0.05", value: gapWU, onChange: (event) => setGapWU(Math.max(0, Number(event.target.value) || 0)) }, void 0, false, {
          fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
          lineNumber: 1418,
          columnNumber: 41
        }, this) }, void 0, false, {
          fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
          lineNumber: 1418,
          columnNumber: 13
        }, this),
        /* @__PURE__ */ jsxDEV(Property, { label: "Anchor", children: /* @__PURE__ */ jsxDEV("select", { value: anchor, onChange: (event) => setAnchor(event.target.value), children: [
          /* @__PURE__ */ jsxDEV("option", { value: "primary", children: "Primary" }, void 0, false, {
            fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
            lineNumber: 1419,
            columnNumber: 113
          }, this),
          /* @__PURE__ */ jsxDEV("option", { value: "first", children: "First" }, void 0, false, {
            fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
            lineNumber: 1419,
            columnNumber: 153
          }, this),
          /* @__PURE__ */ jsxDEV("option", { value: "last", children: "Last" }, void 0, false, {
            fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
            lineNumber: 1419,
            columnNumber: 189
          }, this)
        ] }, void 0, true, {
          fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
          lineNumber: 1419,
          columnNumber: 38
        }, this) }, void 0, false, {
          fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
          lineNumber: 1419,
          columnNumber: 13
        }, this),
        /* @__PURE__ */ jsxDEV("button", { type: "button", onClick: exactGap, children: "Preview exact gap" }, void 0, false, {
          fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
          lineNumber: 1420,
          columnNumber: 13
        }, this)
      ] }, void 0, true, {
        fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
        lineNumber: 1417,
        columnNumber: 11
      }, this)
    ] }, void 0, true, {
      fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
      lineNumber: 1412,
      columnNumber: 7
    }, this) : null,
    ghostMoves.length ? /* @__PURE__ */ jsxDEV("div", { className: "about-editor-rhythm-preview", "aria-label": "Proposed title rhythm", children: ghostMoves.map((move) => {
      const compiled = snapshot.compiledPlan.sections.find((item) => item.id === move.sectionId);
      const storyWU = Number(compiled?.startWU || 0) + move.hold * Number(compiled?.travelWU || 0);
      return /* @__PURE__ */ jsxDEV("i", { style: { left: `${storyWU / maxWU * 100}%` }, title: `${move.cueId} · ${formatWU(storyWU)}` }, `${move.sectionId}:${move.cueId}`, false, {
        fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
        lineNumber: 1429,
        columnNumber: 18
      }, this);
    }) }, void 0, false, {
      fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
      lineNumber: 1425,
      columnNumber: 7
    }, this) : null,
    message ? /* @__PURE__ */ jsxDEV("p", { className: `about-editor-rhythm-message${preview && !preview.valid ? " is-error" : ""}`, children: message }, void 0, false, {
      fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
      lineNumber: 1433,
      columnNumber: 18
    }, this) : null,
    preview?.valid && snapshot.tryState ? /* @__PURE__ */ jsxDEV("div", { className: "about-editor-try", children: [
      /* @__PURE__ */ jsxDEV("span", { children: [
        "Previewing ",
        preview.label
      ] }, void 0, true, {
        fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
        lineNumber: 1434,
        columnNumber: 80
      }, this),
      /* @__PURE__ */ jsxDEV("button", { type: "button", onClick: cancelPreview, children: "Cancel" }, void 0, false, {
        fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
        lineNumber: 1434,
        columnNumber: 119
      }, this),
      /* @__PURE__ */ jsxDEV("button", { type: "button", className: "is-primary", onClick: applyPreview, children: "Apply" }, void 0, false, {
        fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
        lineNumber: 1434,
        columnNumber: 180
      }, this)
    ] }, void 0, true, {
      fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
      lineNumber: 1434,
      columnNumber: 46
    }, this) : null,
    /* @__PURE__ */ jsxDEV("div", { className: "about-editor-rhythm-actions", children: [
      /* @__PURE__ */ jsxDEV("button", { type: "button", onClick: duplicate, children: [
        "Duplicate ",
        members.length > 1 ? "selection" : "title"
      ] }, void 0, true, {
        fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
        lineNumber: 1436,
        columnNumber: 9
      }, this),
      /* @__PURE__ */ jsxDEV("button", { type: "button", onClick: copy, children: "Copy" }, void 0, false, {
        fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
        lineNumber: 1437,
        columnNumber: 9
      }, this),
      /* @__PURE__ */ jsxDEV("button", { type: "button", disabled: !clipboard, onClick: paste, children: "Paste at playhead" }, void 0, false, {
        fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
        lineNumber: 1438,
        columnNumber: 9
      }, this)
    ] }, void 0, true, {
      fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
      lineNumber: 1435,
      columnNumber: 7
    }, this)
  ] }, void 0, true, {
    fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
    lineNumber: 1409,
    columnNumber: 5
  }, this);
}
_s2(CueRhythmAndReuse, "FBEF/iZFu/d8cqsKz3ZKkoCj4nU=");
_c9 = CueRhythmAndReuse;
function CueInspector({ store, snapshot, section, clipboard, setClipboard }) {
  const selectedMembers = getAboutNarrativeSelectionMembers(snapshot.selection);
  const sectionIndex = getSectionIndex(snapshot.document, section.id);
  const cueIndex = section.text.cues.findIndex((cue2) => cue2.id === snapshot.selection.cueId);
  const cue = section.text.cues[cueIndex];
  if (!cue) return /* @__PURE__ */ jsxDEV(SectionInspector, { store, snapshot, section }, void 0, false, {
    fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
    lineNumber: 1449,
    columnNumber: 20
  }, this);
  const update = (field, value) => store.commit(`Edit Cue ${field}`, (draft) => {
    draft.sections[sectionIndex].text.cues[cueIndex][field] = value;
  }, { coalesceKey: `cue:${cue.id}:${field}`, selection: snapshot.selection });
  const remove = () => store.commit("Delete text Cue", (draft) => {
    draft.sections[sectionIndex].text.cues.splice(cueIndex, 1);
  }, { selection: { type: "section", sectionId: section.id } });
  const timingBounds = getAboutNarrativeCueTimingBounds(cue);
  const motionInterval = getAboutNarrativeCueMotionInterval(cue, snapshot.document.globals.textMotion);
  const movement = getAboutNarrativeCueMovement(cue);
  const moveCue = (percent) => store.commit("Move text Cue", (draft) => {
    const target = draft.sections[sectionIndex].text.cues[cueIndex];
    Object.assign(target, moveAboutNarrativeCueTiming(target, percent / 100));
  }, { coalesceKey: `cue:${cue.id}:timing`, selection: { ...snapshot.selection, keyPart: "focus" } });
  const updateMovement = (mode) => store.commit("Change text movement", (draft) => {
    const target = draft.sections[sectionIndex].text.cues[cueIndex];
    target.motion = { ...target.motion, mode };
  }, { selection: snapshot.selection });
  return /* @__PURE__ */ jsxDEV(Fragment, { children: [
    /* @__PURE__ */ jsxDEV("header", { children: [
      /* @__PURE__ */ jsxDEV("span", { children: "Text Cue" }, void 0, false, {
        fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
        lineNumber: 1469,
        columnNumber: 15
      }, this),
      /* @__PURE__ */ jsxDEV("strong", { children: cue.id }, void 0, false, {
        fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
        lineNumber: 1469,
        columnNumber: 36
      }, this)
    ] }, void 0, true, {
      fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
      lineNumber: 1469,
      columnNumber: 7
    }, this),
    selectedMembers.length > 1 ? /* @__PURE__ */ jsxDEV("div", { className: "about-editor-group-summary", children: [
      /* @__PURE__ */ jsxDEV("strong", { children: [
        selectedMembers.length,
        " titles selected"
      ] }, void 0, true, {
        fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
        lineNumber: 1472,
        columnNumber: 11
      }, this),
      /* @__PURE__ */ jsxDEV("ol", { children: selectedMembers.map((member) => {
        const memberSection = snapshot.document.sections.find((item) => item.id === member.sectionId);
        const memberCue = memberSection?.text?.cues?.find((item) => item.id === member.cueId);
        return /* @__PURE__ */ jsxDEV("li", { children: [
          /* @__PURE__ */ jsxDEV("span", { children: memberSection?.label }, void 0, false, {
            fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
            lineNumber: 1476,
            columnNumber: 68
          }, this),
          memberCue?.text
        ] }, `${member.sectionId}:${member.cueId}`, true, {
          fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
          lineNumber: 1476,
          columnNumber: 20
        }, this);
      }) }, void 0, false, {
        fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
        lineNumber: 1473,
        columnNumber: 11
      }, this),
      /* @__PURE__ */ jsxDEV("button", { type: "button", onClick: () => store.setSelection({ type: "cue", sectionId: section.id, cueId: cue.id, keyPart: "focus" }), children: "Keep primary only" }, void 0, false, {
        fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
        lineNumber: 1478,
        columnNumber: 11
      }, this)
    ] }, void 0, true, {
      fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
      lineNumber: 1471,
      columnNumber: 7
    }, this) : null,
    /* @__PURE__ */ jsxDEV("p", { className: "about-editor-help", children: "Drag the pink timing marker anywhere from 0–100% of its Section. This moves the title's focus time only. Its travel duration, speed, blur, and in/out cadence remain controlled globally under Spatial titles." }, void 0, false, {
      fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
      lineNumber: 1481,
      columnNumber: 7
    }, this),
    /* @__PURE__ */ jsxDEV(Property, { label: "Statement", children: /* @__PURE__ */ jsxDEV("textarea", { rows: "7", value: cue.text, onChange: (event) => update("text", event.target.value) }, void 0, false, {
      fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
      lineNumber: 1482,
      columnNumber: 35
    }, this) }, void 0, false, {
      fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
      lineNumber: 1482,
      columnNumber: 7
    }, this),
    /* @__PURE__ */ jsxDEV(Property, { label: "Movement", children: /* @__PURE__ */ jsxDEV("select", { value: movement, onChange: (event) => updateMovement(event.target.value), children: [
      /* @__PURE__ */ jsxDEV("option", { value: "spatial", children: "Spatial travel" }, void 0, false, {
        fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
        lineNumber: 1483,
        columnNumber: 116
      }, this),
      /* @__PURE__ */ jsxDEV("option", { value: "vertical", children: "Vertical scroll" }, void 0, false, {
        fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
        lineNumber: 1483,
        columnNumber: 163
      }, this)
    ] }, void 0, true, {
      fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
      lineNumber: 1483,
      columnNumber: 34
    }, this) }, void 0, false, {
      fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
      lineNumber: 1483,
      columnNumber: 7
    }, this),
    /* @__PURE__ */ jsxDEV(
      NumberProperty,
      {
        label: "Position",
        value: Number((cue.hold * 100).toFixed(1)),
        min: Number((timingBounds.min * 100).toFixed(1)),
        max: Number((timingBounds.max * 100).toFixed(1)),
        step: 0.5,
        unit: "%",
        disabled: timingBounds.min === timingBounds.max,
        onChange: moveCue
      },
      void 0,
      false,
      {
        fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
        lineNumber: 1484,
        columnNumber: 7
      },
      this
    ),
    movement === "spatial" ? /* @__PURE__ */ jsxDEV(Fragment, { children: [
      /* @__PURE__ */ jsxDEV(Property, { label: "Auto travel", children: /* @__PURE__ */ jsxDEV("output", { className: "about-editor-readout", children: [
        Math.round(motionInterval.start * 100),
        "–",
        Math.round(motionInterval.end * 100),
        "%"
      ] }, void 0, true, {
        fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
        lineNumber: 1496,
        columnNumber: 41
      }, this) }, void 0, false, {
        fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
        lineNumber: 1496,
        columnNumber: 11
      }, this),
      /* @__PURE__ */ jsxDEV(Property, { label: "Motion preset", children: /* @__PURE__ */ jsxDEV("select", { value: cue.preset, onChange: (event) => update("preset", event.target.value), children: [
        /* @__PURE__ */ jsxDEV("option", { value: "travelling-title-v1", children: "Travelling title" }, void 0, false, {
          fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
          lineNumber: 1497,
          columnNumber: 129
        }, this),
        /* @__PURE__ */ jsxDEV("option", { value: "opener-v1", children: "Opener" }, void 0, false, {
          fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
          lineNumber: 1497,
          columnNumber: 190
        }, this),
        /* @__PURE__ */ jsxDEV("option", { value: "finale-v1", children: "Finale" }, void 0, false, {
          fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
          lineNumber: 1497,
          columnNumber: 231
        }, this)
      ] }, void 0, true, {
        fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
        lineNumber: 1497,
        columnNumber: 43
      }, this) }, void 0, false, {
        fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
        lineNumber: 1497,
        columnNumber: 11
      }, this)
    ] }, void 0, true, {
      fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
      lineNumber: 1495,
      columnNumber: 7
    }, this) : /* @__PURE__ */ jsxDEV(Property, { label: "Reveal", children: /* @__PURE__ */ jsxDEV("output", { className: "about-editor-readout", children: "Editorial vertical scroll" }, void 0, false, {
      fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
      lineNumber: 1499,
      columnNumber: 32
    }, this) }, void 0, false, {
      fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
      lineNumber: 1499,
      columnNumber: 7
    }, this),
    /* @__PURE__ */ jsxDEV(CueRhythmAndReuse, { store, snapshot, clipboard, setClipboard }, void 0, false, {
      fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
      lineNumber: 1500,
      columnNumber: 7
    }, this),
    /* @__PURE__ */ jsxDEV("button", { type: "button", className: "about-editor-danger", disabled: section.type === "finale", onClick: remove, children: "Delete Cue" }, void 0, false, {
      fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
      lineNumber: 1501,
      columnNumber: 7
    }, this)
  ] }, void 0, true, {
    fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
    lineNumber: 1468,
    columnNumber: 5
  }, this);
}
_c0 = CueInspector;
function DisciplineRevealInspector({ store, snapshot, section }) {
  const sectionIndex = getSectionIndex(snapshot.document, section.id);
  const reveal = section.text.disciplineReveal;
  if (!reveal) return /* @__PURE__ */ jsxDEV(SectionInspector, { store, snapshot, section }, void 0, false, {
    fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
    lineNumber: 1509,
    columnNumber: 23
  }, this);
  const update = (label, mutate, coalesceKey = null) => store.commit(label, (draft) => {
    mutate(draft.sections[sectionIndex].text.disciplineReveal);
  }, { coalesceKey, selection: snapshot.selection });
  const occupied = (reveal.items.length - 1) * reveal.stagger + reveal.labelDuration + reveal.hold;
  const limitsFor = (control) => {
    if (control.id === "start") return { min: control.min, max: Math.max(control.min, reveal.end - occupied) };
    if (control.id === "end") return { min: Math.min(control.max, reveal.start + occupied), max: control.max };
    if (control.id === "stagger") return {
      min: control.min,
      max: Math.max(control.min, (reveal.end - reveal.start - reveal.labelDuration - reveal.hold) / Math.max(1, reveal.items.length - 1))
    };
    if (control.id === "labelDuration") return {
      min: control.min,
      max: Math.max(control.min, reveal.end - reveal.start - (reveal.items.length - 1) * reveal.stagger - reveal.hold)
    };
    if (control.id === "hold") return {
      min: control.min,
      max: Math.max(control.min, reveal.end - reveal.start - (reveal.items.length - 1) * reveal.stagger - reveal.labelDuration)
    };
    return { min: control.min, max: control.max };
  };
  return /* @__PURE__ */ jsxDEV(Fragment, { children: [
    /* @__PURE__ */ jsxDEV("header", { children: [
      /* @__PURE__ */ jsxDEV("span", { children: "Text sequence" }, void 0, false, {
        fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
        lineNumber: 1533,
        columnNumber: 15
      }, this),
      /* @__PURE__ */ jsxDEV("strong", { children: "Discipline reveal" }, void 0, false, {
        fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
        lineNumber: 1533,
        columnNumber: 41
      }, this)
    ] }, void 0, true, {
      fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
      lineNumber: 1533,
      columnNumber: 7
    }, this),
    /* @__PURE__ */ jsxDEV("p", { className: "about-editor-help", children: "One clip controls the complete six-point sequence. Drag its striped block in the Text lane to move every reveal together." }, void 0, false, {
      fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
      lineNumber: 1534,
      columnNumber: 7
    }, this),
    /* @__PURE__ */ jsxDEV("details", { open: true, children: [
      /* @__PURE__ */ jsxDEV("summary", { children: "Reveal choreography" }, void 0, false, {
        fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
        lineNumber: 1535,
        columnNumber: 21
      }, this),
      ABOUT_NARRATIVE_DISCIPLINE_REVEAL_CONTROLS.map((control) => {
        const limits = limitsFor(control);
        return /* @__PURE__ */ jsxDEV(
          NumberProperty,
          {
            label: control.label,
            value: reveal[control.id],
            min: limits.min,
            max: limits.max,
            step: control.step,
            unit: control.unit,
            onChange: (value) => update(`Change ${control.label}`, (draft) => {
              draft[control.id] = value;
            }, `discipline-reveal:${section.id}:${control.id}`)
          },
          control.id,
          false,
          {
            fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
            lineNumber: 1539,
            columnNumber: 13
          },
          this
        );
      })
    ] }, void 0, true, {
      fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
      lineNumber: 1535,
      columnNumber: 7
    }, this),
    /* @__PURE__ */ jsxDEV("details", { open: true, children: [
      /* @__PURE__ */ jsxDEV("summary", { children: "Reveal order and labels" }, void 0, false, {
        fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
        lineNumber: 1552,
        columnNumber: 21
      }, this),
      /* @__PURE__ */ jsxDEV("div", { className: "about-editor-discipline-items", children: reveal.items.map(
        (item, itemIndex) => /* @__PURE__ */ jsxDEV("div", { className: "about-editor-discipline-item", children: [
          /* @__PURE__ */ jsxDEV("code", { children: String(itemIndex + 1).padStart(2, "0") }, void 0, false, {
            fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
            lineNumber: 1556,
            columnNumber: 15
          }, this),
          /* @__PURE__ */ jsxDEV("input", { value: item.label, "aria-label": `Discipline ${itemIndex + 1} label`, onChange: (event) => update("Edit discipline label", (draft) => {
            draft.items[itemIndex].label = event.target.value;
          }, `discipline-reveal:${section.id}:item:${item.group}:label`) }, void 0, false, {
            fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
            lineNumber: 1557,
            columnNumber: 15
          }, this),
          /* @__PURE__ */ jsxDEV("div", { className: "about-editor-discipline-palette", title: `${item.label} uses the Home simulation ${DISCIPLINE_BALL_TOKEN_BY_GROUP[item.group]}`, children: [
            /* @__PURE__ */ jsxDEV("i", { style: { background: `var(${DISCIPLINE_BALL_TOKEN_BY_GROUP[item.group]})` } }, void 0, false, {
              fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
              lineNumber: 1559,
              columnNumber: 17
            }, this),
            /* @__PURE__ */ jsxDEV("code", { children: DISCIPLINE_BALL_TOKEN_BY_GROUP[item.group] }, void 0, false, {
              fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
              lineNumber: 1560,
              columnNumber: 17
            }, this)
          ] }, void 0, true, {
            fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
            lineNumber: 1558,
            columnNumber: 15
          }, this),
          /* @__PURE__ */ jsxDEV("span", { children: [
            /* @__PURE__ */ jsxDEV("button", { type: "button", disabled: itemIndex === 0, "aria-label": `Reveal ${item.label} earlier`, onClick: () => update("Reorder discipline reveal", (draft) => {
              const [moved] = draft.items.splice(itemIndex, 1);
              draft.items.splice(itemIndex - 1, 0, moved);
            }), children: "↑" }, void 0, false, {
              fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
              lineNumber: 1563,
              columnNumber: 17
            }, this),
            /* @__PURE__ */ jsxDEV("button", { type: "button", disabled: itemIndex === reveal.items.length - 1, "aria-label": `Reveal ${item.label} later`, onClick: () => update("Reorder discipline reveal", (draft) => {
              const [moved] = draft.items.splice(itemIndex, 1);
              draft.items.splice(itemIndex + 1, 0, moved);
            }), children: "↓" }, void 0, false, {
              fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
              lineNumber: 1564,
              columnNumber: 17
            }, this)
          ] }, void 0, true, {
            fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
            lineNumber: 1562,
            columnNumber: 15
          }, this)
        ] }, item.group, true, {
          fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
          lineNumber: 1555,
          columnNumber: 11
        }, this)
      ) }, void 0, false, {
        fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
        lineNumber: 1553,
        columnNumber: 9
      }, this)
    ] }, void 0, true, {
      fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
      lineNumber: 1552,
      columnNumber: 7
    }, this),
    /* @__PURE__ */ jsxDEV("p", { className: "about-editor-help", children: "The six points persist after the labels leave. An editorial block marked “Reconnect point grid” restores the surrounding grid as that paragraph enters." }, void 0, false, {
      fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
      lineNumber: 1570,
      columnNumber: 7
    }, this)
  ] }, void 0, true, {
    fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
    lineNumber: 1532,
    columnNumber: 5
  }, this);
}
_c1 = DisciplineRevealInspector;
function CameraInspector({ store, snapshot, section }) {
  const sectionIndex = getSectionIndex(snapshot.document, section.id);
  const keyIndex = snapshot.selection.keyIndex;
  const selectedKey = section.camera.keys[keyIndex];
  const key = selectedKey && selectedKey.at > 0 && selectedKey.at < 1 ? selectedKey : null;
  const local = getLocalProgress(snapshot.compiledPlan, section, snapshot.transport.storyWU);
  const targetAt = Math.min(0.995, Math.max(5e-3, snapAboutNarrativeTimelineValue(local)));
  const applyPreset = (preset) => store.commit(`Apply ${preset} camera recipe`, (draft) => {
    const recipes2 = {
      Push: [
        { at: 0, offset: [0, 0, 0], lookAtOffset: [0, 0, -1], fov: 48, roll: 0, easing: "smoothstep" },
        { at: 1, offset: [0, 0, -1.2], lookAtOffset: [0, 0, -1], fov: 45, roll: 0, easing: "smoothstep" }
      ],
      Glide: [
        { at: 0, offset: [-0.8, 0, 0], lookAtOffset: [0.4, 0, -1], fov: 48, roll: 0, easing: "smoothstep" },
        { at: 1, offset: [0.8, 0, 0], lookAtOffset: [-0.4, 0, -1], fov: 48, roll: 0, easing: "smoothstep" }
      ],
      Orbit: [
        { at: 0, offset: [-0.7, 0, 0], lookAtOffset: [0.7, 0, -1], fov: 48, roll: -0.08, easing: "smoothstep" },
        { at: 0.5, offset: [0.7, 0.25, 0], lookAtOffset: [-0.7, -0.1, -1], fov: 48, roll: 0.08, easing: "smoothstep" },
        { at: 1, offset: [0, 0, 0], lookAtOffset: [0, 0, -1], fov: 48, roll: 0, easing: "smoothstep" }
      ],
      Reveal: [
        { at: 0, offset: [0, -0.45, 0.5], lookAtOffset: [0, 0.3, -1], fov: 56, roll: 0, easing: "smoothstep" },
        { at: 1, offset: [0, 0, 0], lookAtOffset: [0, 0, -1], fov: 46, roll: 0, easing: "smoothstep" }
      ],
      Resolve: [
        { at: 0, offset: [0.3, 0.2, 0], lookAtOffset: [-0.3, -0.2, -1], fov: 52, roll: 0.14, easing: "smoothstep" },
        { at: 1, offset: [0, 0, 0], lookAtOffset: [0, 0, -1], fov: 48, roll: 0, easing: "smoothstep" }
      ]
    };
    draft.sections[sectionIndex].camera.keys = recipes2[preset];
    bridgeCameraSection(draft, sectionIndex);
  }, { selection: { type: "section", sectionId: section.id } });
  const existingKeyAtPlayhead = section.camera.keys.findIndex(
    (item) => item.at > 0 && item.at < 1 && Math.abs(item.at - targetAt) < 25e-4
  );
  const setKey = () => {
    if (existingKeyAtPlayhead >= 0) {
      store.setSelection({ type: "camera-key", sectionId: section.id, keyIndex: existingKeyAtPlayhead });
      return;
    }
    const insertionIndex = section.camera.keys.findIndex((item) => item.at > targetAt);
    const selectedKeyIndex = insertionIndex < 0 ? section.camera.keys.length : insertionIndex;
    const sampled = sampleAboutNarrativePlan(snapshot.compiledPlan, snapshot.transport.storyWU);
    const baseZ = snapshot.document.globals.camera.startZ - snapshot.transport.storyWU * sampled.camera.cadence;
    const newKey = {
      at: targetAt,
      offset: [sampled.camera.position[0], sampled.camera.position[1], sampled.camera.position[2] - baseZ],
      lookAtOffset: sampled.camera.target.map((value, axis) => value - sampled.camera.position[axis]),
      fov: sampled.camera.fov,
      roll: sampled.camera.roll,
      easing: "smoothstep"
    };
    store.commit("Set camera key", (draft) => {
      draft.sections[sectionIndex].camera.keys.push(newKey);
      draft.sections[sectionIndex].camera.keys.sort((a, b) => a.at - b.at);
    }, { selection: { type: "camera-key", sectionId: section.id, keyIndex: selectedKeyIndex } });
  };
  const recipes = /* @__PURE__ */ jsxDEV("div", { className: "about-editor-camera-recipes", children: ["Push", "Glide", "Orbit", "Reveal", "Resolve"].map((name) => /* @__PURE__ */ jsxDEV("button", { type: "button", onClick: () => applyPreset(name), children: name }, name, false, {
    fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
    lineNumber: 1634,
    columnNumber: 127
  }, this)) }, void 0, false, {
    fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
    lineNumber: 1634,
    columnNumber: 19
  }, this);
  if (!key) {
    return /* @__PURE__ */ jsxDEV(Fragment, { children: [
      /* @__PURE__ */ jsxDEV("header", { children: [
        /* @__PURE__ */ jsxDEV("span", { children: "Camera track" }, void 0, false, {
          fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
          lineNumber: 1636,
          columnNumber: 22
        }, this),
        /* @__PURE__ */ jsxDEV("strong", { children: "Editing Section base" }, void 0, false, {
          fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
          lineNumber: 1636,
          columnNumber: 47
        }, this)
      ] }, void 0, true, {
        fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
        lineNumber: 1636,
        columnNumber: 14
      }, this),
      /* @__PURE__ */ jsxDEV("p", { className: "about-editor-help", children: "The dolly and Section joins are continuous automatically. Add visible keys only where the framing, aim, roll, or lens should change." }, void 0, false, {
        fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
        lineNumber: 1636,
        columnNumber: 93
      }, this),
      recipes,
      /* @__PURE__ */ jsxDEV("button", { type: "button", className: "about-editor-wide-action", onClick: setKey, children: [
        "Set camera key at ",
        formatCameraPercent(targetAt)
      ] }, void 0, true, {
        fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
        lineNumber: 1636,
        columnNumber: 271
      }, this)
    ] }, void 0, true, {
      fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
      lineNumber: 1636,
      columnNumber: 12
    }, this);
  }
  const update = (field, value) => store.commit(`Edit camera ${field}`, (draft) => {
    draft.sections[sectionIndex].camera.keys[keyIndex][field] = Array.isArray(value) ? [...value] : value;
    if (CAMERA_POSE_FIELDS.has(field)) linkCameraBoundary(draft, sectionIndex, keyIndex);
  }, { coalesceKey: `camera:${section.id}:${keyIndex}:${field}`, selection: snapshot.selection });
  const updateVector = (field, axis, value) => {
    const next = [...key[field]];
    next[axis] = value;
    update(field, next);
  };
  const timingBounds = getAboutNarrativeCameraKeyTimingBounds(section.camera.keys, keyIndex);
  const extentField = snapshot.previewProfile === "mobile" ? "mobileExtentWU" : "extentWU";
  const extentLabel = snapshot.previewProfile === "mobile" ? "Mobile length" : "Section length";
  const updateExtent = (value) => store.commit("Change Section extent", (draft) => {
    draft.sections[sectionIndex][extentField] = value;
  }, { coalesceKey: `section:${section.id}:${extentField}`, selection: snapshot.selection });
  return /* @__PURE__ */ jsxDEV(Fragment, { children: [
    /* @__PURE__ */ jsxDEV("header", { children: [
      /* @__PURE__ */ jsxDEV("span", { children: "Camera key" }, void 0, false, {
        fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
        lineNumber: 1655,
        columnNumber: 15
      }, this),
      /* @__PURE__ */ jsxDEV("strong", { children: [
        formatCameraPercent(key.at),
        " through ",
        section.label
      ] }, void 0, true, {
        fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
        lineNumber: 1655,
        columnNumber: 38
      }, this)
    ] }, void 0, true, {
      fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
      lineNumber: 1655,
      columnNumber: 7
    }, this),
    recipes,
    /* @__PURE__ */ jsxDEV(
      NumberProperty,
      {
        label: "Position",
        value: Number((key.at * 100).toFixed(1)),
        min: Number((timingBounds.min * 100).toFixed(1)),
        max: Number((timingBounds.max * 100).toFixed(1)),
        step: 0.5,
        unit: "%",
        onChange: (value) => update("at", Math.min(timingBounds.max, Math.max(timingBounds.min, snapAboutNarrativeTimelineValue(value / 100))))
      },
      void 0,
      false,
      {
        fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
        lineNumber: 1657,
        columnNumber: 7
      },
      this
    ),
    /* @__PURE__ */ jsxDEV(NumberProperty, { label: extentLabel, value: section[extentField], min: 1, max: 8, step: 0.05, unit: "WU", onChange: updateExtent }, void 0, false, {
      fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
      lineNumber: 1666,
      columnNumber: 7
    }, this),
    ["X offset", "Y offset", "Forward offset"].map((label, axis) => /* @__PURE__ */ jsxDEV(NumberProperty, { label, value: key.offset[axis], min: -8, max: 8, step: 0.02, unit: "WU", onChange: (value) => updateVector("offset", axis, value) }, label, false, {
      fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
      lineNumber: 1667,
      columnNumber: 72
    }, this)),
    ["Aim X", "Aim Y", "Aim depth"].map((label, axis) => /* @__PURE__ */ jsxDEV(NumberProperty, { label, value: key.lookAtOffset[axis], min: -8, max: 8, step: 0.02, unit: "WU", onChange: (value) => updateVector("lookAtOffset", axis, value) }, label, false, {
      fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
      lineNumber: 1668,
      columnNumber: 61
    }, this)),
    /* @__PURE__ */ jsxDEV(NumberProperty, { label: "Field of view", value: key.fov, min: 20, max: 90, step: 1, unit: "°", onChange: (value) => update("fov", value) }, void 0, false, {
      fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
      lineNumber: 1669,
      columnNumber: 7
    }, this),
    /* @__PURE__ */ jsxDEV(NumberProperty, { label: "Roll", value: key.roll, min: -1.2, max: 1.2, step: 0.01, unit: "rad", onChange: (value) => update("roll", value) }, void 0, false, {
      fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
      lineNumber: 1670,
      columnNumber: 7
    }, this),
    /* @__PURE__ */ jsxDEV(Property, { label: "Easing", children: /* @__PURE__ */ jsxDEV("select", { value: key.easing, onChange: (event) => update("easing", event.target.value), children: [
      /* @__PURE__ */ jsxDEV("option", { value: "smoothstep", children: "Smoothstep" }, void 0, false, {
        fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
        lineNumber: 1671,
        columnNumber: 118
      }, this),
      /* @__PURE__ */ jsxDEV("option", { value: "ease-in-out", children: "Ease in out" }, void 0, false, {
        fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
        lineNumber: 1671,
        columnNumber: 164
      }, this)
    ] }, void 0, true, {
      fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
      lineNumber: 1671,
      columnNumber: 32
    }, this) }, void 0, false, {
      fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
      lineNumber: 1671,
      columnNumber: 7
    }, this),
    /* @__PURE__ */ jsxDEV("button", { type: "button", className: "about-editor-wide-action", disabled: existingKeyAtPlayhead >= 0, onClick: setKey, children: existingKeyAtPlayhead >= 0 ? `Camera key already at ${formatCameraPercent(targetAt)}` : `Set another key at ${formatCameraPercent(targetAt)}` }, void 0, false, {
      fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
      lineNumber: 1672,
      columnNumber: 7
    }, this),
    /* @__PURE__ */ jsxDEV("button", { type: "button", className: "about-editor-danger", onClick: () => store.commit("Delete camera key", (draft) => {
      draft.sections[sectionIndex].camera.keys.splice(keyIndex, 1);
    }, { selection: { type: "section", sectionId: section.id } }), children: "Delete key" }, void 0, false, {
      fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
      lineNumber: 1673,
      columnNumber: 7
    }, this)
  ] }, void 0, true, {
    fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
    lineNumber: 1654,
    columnNumber: 5
  }, this);
}
_c10 = CameraInspector;
const CORRESPONDENCE_LABELS = Object.freeze({
  "index-v1": "Index order",
  "stable-seed": "Stable seed",
  "spatial-nearest-v1": "Local travel (approx.)",
  "group-aware": "Group aware"
});
function WorldInspector({ store, snapshot, section, runtimeMetrics }) {
  const sectionIndex = getSectionIndex(snapshot.document, section.id);
  if (section.world.mode !== "set") {
    return /* @__PURE__ */ jsxDEV(Fragment, { children: [
      /* @__PURE__ */ jsxDEV("header", { children: [
        /* @__PURE__ */ jsxDEV("span", { children: "World track" }, void 0, false, {
          fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
          lineNumber: 1688,
          columnNumber: 22
        }, this),
        /* @__PURE__ */ jsxDEV("strong", { children: "Inherited World" }, void 0, false, {
          fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
          lineNumber: 1688,
          columnNumber: 46
        }, this)
      ] }, void 0, true, {
        fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
        lineNumber: 1688,
        columnNumber: 14
      }, this),
      /* @__PURE__ */ jsxDEV("p", { className: "about-editor-help", children: "This Section keeps the previous World. Choose “Create World clip” only when the shape should change here." }, void 0, false, {
        fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
        lineNumber: 1688,
        columnNumber: 87
      }, this),
      /* @__PURE__ */ jsxDEV("button", { type: "button", className: "about-editor-wide-action", onClick: () => store.commit("Create World clip", (draft) => {
        draft.sections[sectionIndex].world = cloneAboutNarrativeDocument(draft.sections.slice(0, sectionIndex).reverse().find((item) => item.world.mode === "set")?.world || draft.sections[0].world);
      }), children: "Create World clip" }, void 0, false, {
        fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
        lineNumber: 1688,
        columnNumber: 229
      }, this)
    ] }, void 0, true, {
      fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
      lineNumber: 1688,
      columnNumber: 12
    }, this);
  }
  const world = section.world;
  const shape = ABOUT_NARRATIVE_SHAPE_DEFINITIONS[world.shapeId];
  const transitionLimit = getAboutNarrativeWorldTransitionLimit(snapshot.compiledPlan, sectionIndex);
  const transitionMax = Math.max(transitionLimit, world.transitionIn.end, 1);
  const transitionEnabled = world.transitionIn.type !== "cut";
  const correspondenceEnabled = ["morph", "dissolve-morph"].includes(world.transitionIn.type);
  const previousWorldSection = snapshot.document.sections.slice(0, sectionIndex).reverse().find((item) => item.world.mode === "set");
  const sourceShape = ABOUT_NARRATIVE_SHAPE_DEFINITIONS[previousWorldSection?.world.shapeId || world.shapeId];
  const prepared = runtimeMetrics?.preparedWorldIds?.includes(section.id);
  const correspondenceStatus = runtimeMetrics?.correspondenceSequenceState === "failed" ? "Failed" : runtimeMetrics?.correspondenceSequenceState === "loading" ? "Preparing" : prepared ? runtimeMetrics?.correspondenceFallback && runtimeMetrics?.correspondenceToWorldId === section.id ? "Baseline fallback" : "Ready" : "Preparing";
  const update = (label, mutate, coalesceKey = null) => store.commit(label, (draft) => mutate(draft.sections[sectionIndex].world), { coalesceKey, selection: snapshot.selection });
  const tryShape = (shapeId) => store.beginTry(`Replace Shape with ${ABOUT_NARRATIVE_SHAPE_DEFINITIONS[shapeId].label}`, (draft) => {
    const target = draft.sections[sectionIndex].world;
    target.shapeId = shapeId;
    target.shapeParameters = Object.fromEntries(ABOUT_NARRATIVE_SHAPE_DEFINITIONS[shapeId].parameters.map((control) => [control.id, control.id === "density" ? 1 : (control.min + control.max) / 2]));
  });
  return /* @__PURE__ */ jsxDEV(Fragment, { children: [
    /* @__PURE__ */ jsxDEV("header", { children: [
      /* @__PURE__ */ jsxDEV("span", { children: "World clip" }, void 0, false, {
        fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
        lineNumber: 1721,
        columnNumber: 15
      }, this),
      /* @__PURE__ */ jsxDEV("strong", { children: shape?.label || world.shapeId }, void 0, false, {
        fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
        lineNumber: 1721,
        columnNumber: 38
      }, this)
    ] }, void 0, true, {
      fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
      lineNumber: 1721,
      columnNumber: 7
    }, this),
    /* @__PURE__ */ jsxDEV("div", { className: "about-editor-shape-catalog", children: Object.values(ABOUT_NARRATIVE_SHAPE_DEFINITIONS).map(
      (item) => /* @__PURE__ */ jsxDEV("button", { type: "button", disabled: section.locked, className: item.id === world.shapeId ? "is-selected" : "", onClick: () => tryShape(item.id), children: [
        /* @__PURE__ */ jsxDEV("i", {}, void 0, false, {
          fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
          lineNumber: 1725,
          columnNumber: 13
        }, this),
        /* @__PURE__ */ jsxDEV("span", { children: [
          /* @__PURE__ */ jsxDEV("strong", { children: item.label }, void 0, false, {
            fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
            lineNumber: 1725,
            columnNumber: 24
          }, this),
          /* @__PURE__ */ jsxDEV("small", { children: [
            "Cost ",
            item.cost,
            " · Point field"
          ] }, void 0, true, {
            fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
            lineNumber: 1725,
            columnNumber: 53
          }, this)
        ] }, void 0, true, {
          fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
          lineNumber: 1725,
          columnNumber: 18
        }, this)
      ] }, item.id, true, {
        fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
        lineNumber: 1724,
        columnNumber: 9
      }, this)
    ) }, void 0, false, {
      fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
      lineNumber: 1722,
      columnNumber: 7
    }, this),
    snapshot.tryState ? /* @__PURE__ */ jsxDEV("div", { className: "about-editor-try", children: [
      /* @__PURE__ */ jsxDEV("span", { children: [
        "Trying ",
        snapshot.tryState.label
      ] }, void 0, true, {
        fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
        lineNumber: 1729,
        columnNumber: 62
      }, this),
      /* @__PURE__ */ jsxDEV("button", { type: "button", onClick: () => store.cancelTry(), children: "Cancel" }, void 0, false, {
        fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
        lineNumber: 1729,
        columnNumber: 107
      }, this),
      /* @__PURE__ */ jsxDEV("button", { type: "button", className: "is-primary", onClick: () => store.applyTry(), children: "Apply" }, void 0, false, {
        fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
        lineNumber: 1729,
        columnNumber: 178
      }, this)
    ] }, void 0, true, {
      fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
      lineNumber: 1729,
      columnNumber: 28
    }, this) : null,
    /* @__PURE__ */ jsxDEV("details", { open: true, children: [
      /* @__PURE__ */ jsxDEV("summary", { children: "Shape parameters" }, void 0, false, {
        fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
        lineNumber: 1730,
        columnNumber: 21
      }, this),
      (shape?.parameters || []).map((control) => /* @__PURE__ */ jsxDEV(NumberProperty, { label: control.label, value: world.shapeParameters[control.id], min: control.min, max: control.max, step: control.step, unit: control.unit, onChange: (value) => update(`Change ${control.label}`, (draft) => {
        draft.shapeParameters[control.id] = value;
      }, `world:${section.id}:${control.id}`) }, control.id, false, {
        fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
        lineNumber: 1731,
        columnNumber: 53
      }, this)),
      /* @__PURE__ */ jsxDEV("div", { className: "about-editor-inline-actions", children: [
        /* @__PURE__ */ jsxDEV("button", { type: "button", onClick: () => update("Reseed Shape", (draft) => {
          draft.seed = Math.floor(Math.random() * 4294967295);
        }), children: "Reseed" }, void 0, false, {
          fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
          lineNumber: 1732,
          columnNumber: 54
        }, this),
        /* @__PURE__ */ jsxDEV("code", { children: world.seed }, void 0, false, {
          fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
          lineNumber: 1732,
          columnNumber: 197
        }, this)
      ] }, void 0, true, {
        fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
        lineNumber: 1732,
        columnNumber: 9
      }, this)
    ] }, void 0, true, {
      fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
      lineNumber: 1730,
      columnNumber: 7
    }, this),
    /* @__PURE__ */ jsxDEV("details", { open: true, children: [
      /* @__PURE__ */ jsxDEV("summary", { children: "Placement" }, void 0, false, {
        fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
        lineNumber: 1734,
        columnNumber: 21
      }, this),
      /* @__PURE__ */ jsxDEV(NumberProperty, { label: "Distance at entry", value: world.entryDistanceWU, min: 0.2, max: 16, step: 0.05, unit: "WU", onChange: (value) => update("Move World", (draft) => {
        draft.entryDistanceWU = value;
      }, `world:${section.id}:distance`) }, void 0, false, {
        fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
        lineNumber: 1735,
        columnNumber: 9
      }, this),
      /* @__PURE__ */ jsxDEV(NumberProperty, { label: "Scale", value: world.transform.scale, min: 0.1, max: 3, step: 0.01, onChange: (value) => update("Scale World", (draft) => {
        draft.transform.scale = value;
      }, `world:${section.id}:scale`) }, void 0, false, {
        fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
        lineNumber: 1736,
        columnNumber: 9
      }, this)
    ] }, void 0, true, {
      fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
      lineNumber: 1734,
      columnNumber: 7
    }, this),
    /* @__PURE__ */ jsxDEV("details", { open: true, children: [
      /* @__PURE__ */ jsxDEV("summary", { children: "Transition in" }, void 0, false, {
        fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
        lineNumber: 1738,
        columnNumber: 21
      }, this),
      transitionEnabled ? /* @__PURE__ */ jsxDEV(Fragment, { children: [
        /* @__PURE__ */ jsxDEV("p", { className: "about-editor-help", children: [
          "Timing is relative to this Section: 1 is its end; values above 1 continue across inherited World Sections. The next World begins at ",
          transitionLimit.toFixed(3),
          "."
        ] }, void 0, true, {
          fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
          lineNumber: 1740,
          columnNumber: 11
        }, this),
        /* @__PURE__ */ jsxDEV(NumberProperty, { label: "Start", value: world.transitionIn.start, min: 0, max: transitionMax, step: 5e-3, unit: "× section", onChange: (value) => update("Change transition start", (draft) => {
          draft.transitionIn.start = Math.min(value, draft.transitionIn.end);
        }) }, void 0, false, {
          fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
          lineNumber: 1741,
          columnNumber: 11
        }, this),
        /* @__PURE__ */ jsxDEV(NumberProperty, { label: "End", value: world.transitionIn.end, min: 0, max: transitionMax, step: 5e-3, unit: "× section", onChange: (value) => update("Change transition end", (draft) => {
          draft.transitionIn.end = Math.max(value, draft.transitionIn.start);
        }) }, void 0, false, {
          fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
          lineNumber: 1742,
          columnNumber: 11
        }, this),
        /* @__PURE__ */ jsxDEV(Property, { label: "Type", children: /* @__PURE__ */ jsxDEV("select", { value: world.transitionIn.type, onChange: (event) => update("Change transition type", (draft) => {
          draft.transitionIn.type = event.target.value;
        }), children: [
          /* @__PURE__ */ jsxDEV("option", { value: "morph", children: "Morph" }, void 0, false, {
            fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
            lineNumber: 1743,
            columnNumber: 189
          }, this),
          /* @__PURE__ */ jsxDEV("option", { value: "dissolve-morph", children: "Dissolve morph" }, void 0, false, {
            fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
            lineNumber: 1743,
            columnNumber: 225
          }, this),
          /* @__PURE__ */ jsxDEV("option", { value: "crossfade", children: "Crossfade" }, void 0, false, {
            fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
            lineNumber: 1743,
            columnNumber: 279
          }, this),
          /* @__PURE__ */ jsxDEV("option", { value: "hold", children: "Hold" }, void 0, false, {
            fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
            lineNumber: 1743,
            columnNumber: 323
          }, this)
        ] }, void 0, true, {
          fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
          lineNumber: 1743,
          columnNumber: 34
        }, this) }, void 0, false, {
          fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
          lineNumber: 1743,
          columnNumber: 11
        }, this),
        /* @__PURE__ */ jsxDEV(Property, { label: "Easing", children: /* @__PURE__ */ jsxDEV("select", { value: world.transitionIn.easing, onChange: (event) => update("Change transition easing", (draft) => {
          draft.transitionIn.easing = event.target.value;
        }), children: [
          /* @__PURE__ */ jsxDEV("option", { value: "linear", children: "Linear" }, void 0, false, {
            fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
            lineNumber: 1744,
            columnNumber: 197
          }, this),
          /* @__PURE__ */ jsxDEV("option", { value: "smoothstep", children: "Smoothstep" }, void 0, false, {
            fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
            lineNumber: 1744,
            columnNumber: 235
          }, this),
          /* @__PURE__ */ jsxDEV("option", { value: "ease-in", children: "Ease in" }, void 0, false, {
            fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
            lineNumber: 1744,
            columnNumber: 281
          }, this),
          /* @__PURE__ */ jsxDEV("option", { value: "ease-out", children: "Ease out" }, void 0, false, {
            fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
            lineNumber: 1744,
            columnNumber: 321
          }, this),
          /* @__PURE__ */ jsxDEV("option", { value: "ease-in-out", children: "Ease in out" }, void 0, false, {
            fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
            lineNumber: 1744,
            columnNumber: 363
          }, this),
          /* @__PURE__ */ jsxDEV("option", { value: "hold", children: "Hold" }, void 0, false, {
            fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
            lineNumber: 1744,
            columnNumber: 411
          }, this)
        ] }, void 0, true, {
          fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
          lineNumber: 1744,
          columnNumber: 36
        }, this) }, void 0, false, {
          fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
          lineNumber: 1744,
          columnNumber: 11
        }, this),
        /* @__PURE__ */ jsxDEV("p", { className: "about-editor-help", children: [
          "Maps ",
          sourceShape?.label || "previous Shape",
          " → ",
          shape?.label || world.shapeId,
          "."
        ] }, void 0, true, {
          fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
          lineNumber: 1745,
          columnNumber: 11
        }, this),
        /* @__PURE__ */ jsxDEV(Property, { label: "Correspondence", children: /* @__PURE__ */ jsxDEV("select", { "aria-label": "Correspondence", value: world.transitionIn.correspondence, disabled: !correspondenceEnabled, title: correspondenceEnabled ? "Choose how source points are assigned to target points." : "Correspondence applies to Morph and Dissolve morph transitions.", onChange: (event) => update("Change correspondence", (draft) => {
          draft.transitionIn.correspondence = event.target.value;
        }), children: ABOUT_NARRATIVE_CORRESPONDENCE_MODES.map((mode) => /* @__PURE__ */ jsxDEV("option", { value: mode, children: CORRESPONDENCE_LABELS[mode] || mode }, mode, false, {
          fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
          lineNumber: 1746,
          columnNumber: 490
        }, this)) }, void 0, false, {
          fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
          lineNumber: 1746,
          columnNumber: 44
        }, this) }, void 0, false, {
          fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
          lineNumber: 1746,
          columnNumber: 11
        }, this),
        /* @__PURE__ */ jsxDEV("p", { className: "about-editor-help", role: "status", "aria-live": "polite", children: [
          "Correspondence: ",
          correspondenceStatus,
          prepared && runtimeMetrics?.correspondenceToWorldId === section.id && Number.isFinite(runtimeMetrics?.correspondenceImprovement) ? ` · ${Math.round(runtimeMetrics.correspondenceImprovement * 100)}% RMS improvement` : "",
          "."
        ] }, void 0, true, {
          fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
          lineNumber: 1747,
          columnNumber: 11
        }, this),
        /* @__PURE__ */ jsxDEV("button", { type: "button", className: "about-editor-danger", onClick: () => store.commit("Remove World transition", (draft) => {
          const transition = draft.sections[sectionIndex].world.transitionIn;
          transition.start = 0;
          transition.end = 0;
          transition.type = "cut";
        }, { selection: { type: "world", sectionId: section.id } }), children: "Remove transition keyframes" }, void 0, false, {
          fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
          lineNumber: 1748,
          columnNumber: 11
        }, this)
      ] }, void 0, true, {
        fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
        lineNumber: 1739,
        columnNumber: 30
      }, this) : /* @__PURE__ */ jsxDEV(Fragment, { children: [
        /* @__PURE__ */ jsxDEV("p", { className: "about-editor-help", children: "This World cuts in at the Section boundary and has no transition keyframes." }, void 0, false, {
          fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
          lineNumber: 1755,
          columnNumber: 11
        }, this),
        /* @__PURE__ */ jsxDEV("button", { type: "button", className: "about-editor-wide-action", onClick: () => store.commit("Add World transition", (draft) => {
          const transition = draft.sections[sectionIndex].world.transitionIn;
          transition.start = Math.min(0.08, transitionLimit);
          transition.end = Math.min(0.68, transitionLimit);
          transition.type = "morph";
        }, { selection: { type: "world", sectionId: section.id } }), children: "Add transition keyframes" }, void 0, false, {
          fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
          lineNumber: 1756,
          columnNumber: 11
        }, this)
      ] }, void 0, true, {
        fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
        lineNumber: 1754,
        columnNumber: 15
      }, this)
    ] }, void 0, true, {
      fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
      lineNumber: 1738,
      columnNumber: 7
    }, this),
    /* @__PURE__ */ jsxDEV("details", { open: true, children: [
      /* @__PURE__ */ jsxDEV("summary", { children: "Modifier stack" }, void 0, false, {
        fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
        lineNumber: 1764,
        columnNumber: 21
      }, this),
      world.modifiers.map((item, modifierIndex) => {
        const definition = ABOUT_NARRATIVE_MODIFIER_DEFINITIONS[item.id];
        const moveModifier = (direction) => update("Reorder modifier", (draft) => {
          const nextIndex = modifierIndex + direction;
          if (nextIndex < 0 || nextIndex >= draft.modifiers.length) return;
          const [moved] = draft.modifiers.splice(modifierIndex, 1);
          draft.modifiers.splice(nextIndex, 0, moved);
        });
        return /* @__PURE__ */ jsxDEV("div", { className: "about-editor-modifier", children: [
          /* @__PURE__ */ jsxDEV("div", { children: [
            /* @__PURE__ */ jsxDEV("label", { children: [
              /* @__PURE__ */ jsxDEV("input", { type: "checkbox", checked: item.enabled, onChange: (event) => update(`Toggle ${definition?.label}`, (draft) => {
                draft.modifiers[modifierIndex].enabled = event.target.checked;
              }) }, void 0, false, {
                fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
                lineNumber: 1773,
                columnNumber: 105
              }, this),
              definition?.label || item.id
            ] }, void 0, true, {
              fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
              lineNumber: 1773,
              columnNumber: 98
            }, this),
            /* @__PURE__ */ jsxDEV("span", { children: [
              /* @__PURE__ */ jsxDEV("button", { type: "button", disabled: modifierIndex === 0, onClick: () => moveModifier(-1), "aria-label": "Move modifier up", children: "↑" }, void 0, false, {
                fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
                lineNumber: 1773,
                columnNumber: 334
              }, this),
              /* @__PURE__ */ jsxDEV("button", { type: "button", disabled: modifierIndex === world.modifiers.length - 1, onClick: () => moveModifier(1), "aria-label": "Move modifier down", children: "↓" }, void 0, false, {
                fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
                lineNumber: 1773,
                columnNumber: 460
              }, this),
              " Cost ",
              definition?.cost || "?"
            ] }, void 0, true, {
              fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
              lineNumber: 1773,
              columnNumber: 328
            }, this)
          ] }, void 0, true, {
            fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
            lineNumber: 1773,
            columnNumber: 93
          }, this),
          (definition?.parameters || []).map((control) => control.type === "range" ? /* @__PURE__ */ jsxDEV(NumberProperty, { label: control.label, value: item.parameters[control.id], min: control.min, max: control.max, step: control.step, unit: control.unit, onChange: (value) => update(`Change ${control.label}`, (draft) => {
            draft.modifiers[modifierIndex].parameters[control.id] = value;
          }, `modifier:${section.id}:${modifierIndex}:${control.id}`) }, control.id, false, {
            fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
            lineNumber: 1773,
            columnNumber: 732
          }, this) : /* @__PURE__ */ jsxDEV(Property, { label: control.label, children: /* @__PURE__ */ jsxDEV("select", { value: item.parameters[control.id], onChange: (event) => update(`Change ${control.label}`, (draft) => {
            draft.modifiers[modifierIndex].parameters[control.id] = event.target.value;
          }), children: control.options.map((option) => /* @__PURE__ */ jsxDEV("option", { children: option }, option, false, {
            fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
            lineNumber: 1773,
            columnNumber: 1366
          }, this)) }, void 0, false, {
            fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
            lineNumber: 1773,
            columnNumber: 1143
          }, this) }, control.id, false, {
            fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
            lineNumber: 1773,
            columnNumber: 1094
          }, this))
        ] }, `${item.id}-${modifierIndex}`, true, {
          fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
          lineNumber: 1773,
          columnNumber: 18
        }, this);
      })
    ] }, void 0, true, {
      fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
      lineNumber: 1764,
      columnNumber: 7
    }, this)
  ] }, void 0, true, {
    fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
    lineNumber: 1720,
    columnNumber: 5
  }, this);
}
_c11 = WorldInspector;
function Diagnostics({ diagnostics }) {
  if (!diagnostics.length) return /* @__PURE__ */ jsxDEV("div", { className: "about-editor-diagnostics is-clear", children: [
    /* @__PURE__ */ jsxDEV(Check, { "aria-hidden": "true" }, void 0, false, {
      fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
      lineNumber: 1781,
      columnNumber: 86
    }, this),
    " No diagnostics"
  ] }, void 0, true, {
    fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
    lineNumber: 1781,
    columnNumber: 35
  }, this);
  return /* @__PURE__ */ jsxDEV("div", { className: "about-editor-diagnostics", children: diagnostics.map((item, index) => {
    const DiagnosticIcon = item.level === "error" ? CircleAlert : Info;
    return /* @__PURE__ */ jsxDEV("div", { className: `is-${item.level}`, children: [
      /* @__PURE__ */ jsxDEV(DiagnosticIcon, { "aria-hidden": "true" }, void 0, false, {
        fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
        lineNumber: 1784,
        columnNumber: 93
      }, this),
      /* @__PURE__ */ jsxDEV("span", { children: [
        /* @__PURE__ */ jsxDEV("strong", { children: item.message }, void 0, false, {
          fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
          lineNumber: 1784,
          columnNumber: 136
        }, this),
        /* @__PURE__ */ jsxDEV("small", { children: item.path }, void 0, false, {
          fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
          lineNumber: 1784,
          columnNumber: 167
        }, this)
      ] }, void 0, true, {
        fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
        lineNumber: 1784,
        columnNumber: 130
      }, this)
    ] }, `${item.code}-${item.path}-${index}`, true, {
      fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
      lineNumber: 1784,
      columnNumber: 14
    }, this);
  }) }, void 0, false, {
    fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
    lineNumber: 1782,
    columnNumber: 10
  }, this);
}
_c12 = Diagnostics;
function AuditionControls({ store, snapshot }) {
  _s3();
  const [preRollWU, setPreRollWU] = useState(0.18);
  const [postRollWU, setPostRollWU] = useState(0.18);
  const members = getAboutNarrativeSelectionMembers(snapshot.selection);
  const source = snapshot.selection.type === "cue" ? { type: "cue-group", sectionId: snapshot.selection.sectionId, members, primary: snapshot.selection } : ["section", "world", "camera-key"].includes(snapshot.selection.type) ? snapshot.selection : null;
  if (!source) return null;
  const range = deriveAboutNarrativeLoopRange({
    document: snapshot.document,
    plan: snapshot.compiledPlan,
    source,
    preRollWU,
    postRollWU
  });
  const active = range.valid && snapshot.transport.loop?.sourceType === range.sourceType && snapshot.transport.loop?.sourceId === range.sourceId;
  const toggle = () => {
    if (active) {
      store.setTransport({ owner: "timeline", playing: false, loop: null });
      return;
    }
    if (!range.valid) return;
    store.setTransport({
      owner: "playback",
      playing: true,
      liveAmbient: false,
      storyWU: range.startWU,
      loop: range
    });
  };
  return /* @__PURE__ */ jsxDEV("details", { className: "about-editor-audition", children: [
    /* @__PURE__ */ jsxDEV("summary", { children: "Boundary audition" }, void 0, false, {
      fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
      lineNumber: 1824,
      columnNumber: 7
    }, this),
    /* @__PURE__ */ jsxDEV("div", { className: "about-editor-audition-range", children: [
      /* @__PURE__ */ jsxDEV(Property, { label: "Pre-roll", children: /* @__PURE__ */ jsxDEV("input", { type: "number", min: "0", max: "2", step: "0.05", value: preRollWU, onChange: (event) => setPreRollWU(Math.max(0, Number(event.target.value) || 0)) }, void 0, false, {
        fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
        lineNumber: 1826,
        columnNumber: 36
      }, this) }, void 0, false, {
        fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
        lineNumber: 1826,
        columnNumber: 9
      }, this),
      /* @__PURE__ */ jsxDEV(Property, { label: "Post-roll", children: /* @__PURE__ */ jsxDEV("input", { type: "number", min: "0", max: "2", step: "0.05", value: postRollWU, onChange: (event) => setPostRollWU(Math.max(0, Number(event.target.value) || 0)) }, void 0, false, {
        fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
        lineNumber: 1827,
        columnNumber: 37
      }, this) }, void 0, false, {
        fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
        lineNumber: 1827,
        columnNumber: 9
      }, this)
    ] }, void 0, true, {
      fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
      lineNumber: 1825,
      columnNumber: 7
    }, this),
    range.valid ? /* @__PURE__ */ jsxDEV("p", { className: "about-editor-help", children: [
      formatWU(range.startWU),
      " → ",
      formatWU(range.endWU),
      " · ambient motion freezes for a repeatable review."
    ] }, void 0, true, {
      fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
      lineNumber: 1829,
      columnNumber: 22
    }, this) : /* @__PURE__ */ jsxDEV("p", { className: "about-editor-rhythm-message is-error", children: range.reason }, void 0, false, {
      fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
      lineNumber: 1829,
      columnNumber: 163
    }, this),
    /* @__PURE__ */ jsxDEV("button", { type: "button", className: active ? "is-active about-editor-wide-action" : "about-editor-wide-action", disabled: !range.valid, onClick: toggle, children: active ? "Stop audition" : "Loop this selection" }, void 0, false, {
      fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
      lineNumber: 1830,
      columnNumber: 7
    }, this)
  ] }, void 0, true, {
    fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
    lineNumber: 1823,
    columnNumber: 5
  }, this);
}
_s3(AuditionControls, "dFAS9Y1WbSWFrHycw0Ao6VfZPgM=");
_c13 = AuditionControls;
function Inspector({ store, snapshot, timelineOpen, runtimeMetrics, clipboard, setClipboard }) {
  _s4();
  const inspectorRef = useRef(null);
  const dragRef = useRef(null);
  const lastHeaderClickRef = useRef(null);
  const [position, setPosition] = useState(null);
  const [dragging, setDragging] = useState(false);
  const section = getSection(snapshot.document, snapshot.selection);
  let content = /* @__PURE__ */ jsxDEV(SectionInspector, { store, snapshot, section }, void 0, false, {
    fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
    lineNumber: 1842,
    columnNumber: 17
  }, this);
  if (snapshot.selection.type === "sequence") content = /* @__PURE__ */ jsxDEV(SequenceInspector, { store, snapshot }, void 0, false, {
    fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
    lineNumber: 1843,
    columnNumber: 57
  }, this);
  if (snapshot.selection.type === "cue") content = /* @__PURE__ */ jsxDEV(CueInspector, { store, snapshot, section, clipboard, setClipboard }, void 0, false, {
    fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
    lineNumber: 1844,
    columnNumber: 52
  }, this);
  if (snapshot.selection.type === "discipline-reveal") content = /* @__PURE__ */ jsxDEV(DisciplineRevealInspector, { store, snapshot, section }, void 0, false, {
    fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
    lineNumber: 1845,
    columnNumber: 66
  }, this);
  if (snapshot.selection.type === "camera-key") content = /* @__PURE__ */ jsxDEV(CameraInspector, { store, snapshot, section }, void 0, false, {
    fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
    lineNumber: 1846,
    columnNumber: 59
  }, this);
  if (snapshot.selection.type === "world") content = /* @__PURE__ */ jsxDEV(WorldInspector, { store, snapshot, section, runtimeMetrics }, void 0, false, {
    fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
    lineNumber: 1847,
    columnNumber: 54
  }, this);
  if (snapshot.selection.type === "interaction") content = /* @__PURE__ */ jsxDEV(SectionInspector, { store, snapshot, section }, void 0, false, {
    fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
    lineNumber: 1848,
    columnNumber: 60
  }, this);
  useEffect(() => {
    const keepInBounds = () => {
      if (window.innerWidth < 760) {
        setPosition(null);
        return;
      }
      setPosition(
        (current) => current && inspectorRef.current ? clampInspectorPosition(inspectorRef.current, current, timelineOpen) : current
      );
    };
    keepInBounds();
    window.addEventListener("resize", keepInBounds);
    return () => window.removeEventListener("resize", keepInBounds);
  }, [timelineOpen]);
  const beginDrag = (event) => {
    if (event.button !== 0 || window.innerWidth < 760 || !event.target.closest("header")) return;
    const inspector = inspectorRef.current;
    if (!inspector) return;
    const rect = inspector.getBoundingClientRect();
    const { minTop, maxBottom } = getInspectorVerticalBounds(inspector, timelineOpen);
    const availableHeight = maxBottom - minTop;
    const floatingHeight = Math.min(rect.height, 560, Math.max(240, availableHeight * 0.72));
    const start = clampInspectorPosition(inspector, {
      left: rect.left,
      top: rect.top,
      width: rect.width,
      height: floatingHeight
    }, timelineOpen);
    dragRef.current = {
      pointerId: event.pointerId,
      originX: event.clientX,
      originY: event.clientY,
      start,
      moved: false
    };
    inspector.setPointerCapture(event.pointerId);
  };
  const moveDrag = (event) => {
    const drag = dragRef.current;
    const inspector = inspectorRef.current;
    if (!drag || !inspector || drag.pointerId !== event.pointerId) return;
    const deltaX = event.clientX - drag.originX;
    const deltaY = event.clientY - drag.originY;
    if (!drag.moved && Math.hypot(deltaX, deltaY) < 3) return;
    drag.moved = true;
    setDragging(true);
    setPosition(clampInspectorPosition(inspector, {
      ...drag.start,
      left: drag.start.left + deltaX,
      top: drag.start.top + deltaY
    }, timelineOpen));
  };
  const endDrag = (event) => {
    const drag = dragRef.current;
    if (drag?.pointerId !== event.pointerId) return;
    if (!drag.moved) {
      const now = performance.now();
      const previous = lastHeaderClickRef.current;
      if (previous && now - previous.time < 360 && Math.hypot(event.clientX - previous.x, event.clientY - previous.y) < 6) {
        setPosition(null);
        lastHeaderClickRef.current = null;
      } else {
        lastHeaderClickRef.current = { time: now, x: event.clientX, y: event.clientY };
      }
    }
    dragRef.current = null;
    setDragging(false);
    if (inspectorRef.current?.hasPointerCapture(event.pointerId)) {
      inspectorRef.current.releasePointerCapture(event.pointerId);
    }
  };
  const resetPosition = () => setPosition(null);
  return /* @__PURE__ */ jsxDEV(
    "aside",
    {
      ref: inspectorRef,
      className: `about-editor-inspector${dragging ? " is-dragging" : ""}`,
      "data-floating": position ? "true" : "false",
      style: position ? {
        left: position.left,
        top: position.top,
        right: "auto",
        bottom: "auto",
        width: position.width,
        height: position.height
      } : void 0,
      onPointerDown: beginDrag,
      onPointerMove: moveDrag,
      onPointerUp: endDrag,
      onPointerCancel: endDrag,
      onDoubleClick: resetPosition,
      children: /* @__PURE__ */ jsxDEV("div", { className: "about-editor-inspector-scroll", children: [
        content,
        /* @__PURE__ */ jsxDEV(AuditionControls, { store, snapshot }, void 0, false, {
          fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
          lineNumber: 1948,
          columnNumber: 63
        }, this),
        /* @__PURE__ */ jsxDEV(Diagnostics, { diagnostics: snapshot.diagnostics }, void 0, false, {
          fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
          lineNumber: 1948,
          columnNumber: 117
        }, this)
      ] }, void 0, true, {
        fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
        lineNumber: 1948,
        columnNumber: 7
      }, this)
    },
    void 0,
    false,
    {
      fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
      lineNumber: 1931,
      columnNumber: 5
    },
    this
  );
}
_s4(Inspector, "+h4TZ3OOjdefApVkJJ1n/C7j/fg=");
_c14 = Inspector;
function CameraPathOverlay({ snapshot }) {
  const sections = snapshot.compiledPlan?.sections || [];
  const total = snapshot.compiledPlan?.maxStoryWU || 1;
  return /* @__PURE__ */ jsxDEV("div", { className: "about-editor-path-overlay", "aria-label": "Camera path overlay", children: [
    /* @__PURE__ */ jsxDEV("div", { children: [
      /* @__PURE__ */ jsxDEV("strong", { children: "Path · constant cadence" }, void 0, false, {
        fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
        lineNumber: 1957,
        columnNumber: 12
      }, this),
      /* @__PURE__ */ jsxDEV("span", { children: [
        formatWU(snapshot.transport.storyWU),
        " / ",
        formatWU(total)
      ] }, void 0, true, {
        fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
        lineNumber: 1957,
        columnNumber: 52
      }, this)
    ] }, void 0, true, {
      fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
      lineNumber: 1957,
      columnNumber: 7
    }, this),
    /* @__PURE__ */ jsxDEV("svg", { viewBox: "0 0 240 112", role: "img", "aria-label": "Camera and World anchors over story distance", children: [
      /* @__PURE__ */ jsxDEV("path", { d: "M18 56 H222" }, void 0, false, {
        fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
        lineNumber: 1959,
        columnNumber: 9
      }, this),
      sections.map((section) => {
        const x = 18 + section.startWU / total * 204;
        return /* @__PURE__ */ jsxDEV("g", { transform: `translate(${x} 56)`, children: [
          /* @__PURE__ */ jsxDEV("line", { y1: "-12", y2: "12" }, void 0, false, {
            fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
            lineNumber: 1962,
            columnNumber: 71
          }, this),
          /* @__PURE__ */ jsxDEV("circle", { r: section.worldState?.changesWorld ? 4 : 2 }, void 0, false, {
            fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
            lineNumber: 1962,
            columnNumber: 96
          }, this),
          /* @__PURE__ */ jsxDEV("title", { children: [
            section.label,
            section.worldState?.changesWorld ? ` · ${section.worldState.activeWorld.shapeId}` : ""
          ] }, void 0, true, {
            fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
            lineNumber: 1962,
            columnNumber: 151
          }, this)
        ] }, section.id, true, {
          fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
          lineNumber: 1962,
          columnNumber: 18
        }, this);
      }),
      /* @__PURE__ */ jsxDEV("g", { className: "is-playhead", transform: `translate(${18 + snapshot.transport.storyWU / total * 204} 56)`, children: [
        /* @__PURE__ */ jsxDEV("path", { d: "M0 -22 L5 -15 H-5 Z" }, void 0, false, {
          fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
          lineNumber: 1964,
          columnNumber: 113
        }, this),
        /* @__PURE__ */ jsxDEV("line", { y1: "-15", y2: "22" }, void 0, false, {
          fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
          lineNumber: 1964,
          columnNumber: 145
        }, this)
      ] }, void 0, true, {
        fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
        lineNumber: 1964,
        columnNumber: 9
      }, this)
    ] }, void 0, true, {
      fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
      lineNumber: 1958,
      columnNumber: 7
    }, this),
    /* @__PURE__ */ jsxDEV("small", { children: "Dots are Section boundaries. Large dots are fixed World anchors. The marker is the published camera." }, void 0, false, {
      fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
      lineNumber: 1966,
      columnNumber: 7
    }, this)
  ] }, void 0, true, {
    fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
    lineNumber: 1956,
    columnNumber: 5
  }, this);
}
_c15 = CameraPathOverlay;
export default function AboutNarrativeEditor({ store, runtimeRef, rootRef }) {
  _s5();
  const snapshot = useSyncExternalStore(store.subscribe, store.getSnapshot);
  const [checkpoints, setCheckpoints] = useState(() => readAboutNarrativeCheckpoints());
  const [clipboard, setClipboard] = useState(null);
  const [runtimeMetrics, setRuntimeMetrics] = useState(null);
  const [pathVisible, setPathVisible] = useState(false);
  const [directorView, setDirectorView] = useState(false);
  const [mobilePane, setMobilePane] = useState("sequence");
  const [timelineOpen, setTimelineOpen] = useState(
    () => window.localStorage.getItem(ABOUT_EDITOR_TIMELINE_STORAGE_KEY) !== "closed"
  );
  const importRef = useRef(null);
  const snapshotRef = useRef(snapshot);
  const activeSelection = snapshot.selection;
  useEffect(() => {
    snapshotRef.current = snapshot;
  }, [snapshot]);
  useEffect(() => {
    window.localStorage.setItem(ABOUT_EDITOR_TIMELINE_STORAGE_KEY, timelineOpen ? "open" : "closed");
  }, [timelineOpen]);
  useEffect(() => {
    const root = rootRef.current;
    const runtime = runtimeRef.current;
    root?.setAttribute("data-editor-active", "true");
    loadAboutNarrativeSource().then(({ document: document2, hash }) => {
      const current = store.getSnapshot();
      if (!current.dirty) store.replaceDocument("Refresh canonical source", document2);
      store.setBaseline(document2, hash);
      const recovery = readAboutNarrativeRecoveryDraft();
      if (recovery && recovery.timestamp > Date.now() - 14 * 864e5) {
        store.setRecoveryState({ available: true, draft: recovery, error: "" });
      }
    }).catch((error) => store.setSaveState({ status: "failed", message: error.message }));
    return () => {
      root?.removeAttribute("data-editor-active");
      runtime?.setDirectorView?.(false);
    };
  }, [rootRef, runtimeRef, store]);
  useEffect(() => {
    const root = rootRef.current;
    if (!root) return void 0;
    root.querySelectorAll(".is-editor-selected").forEach((node) => node.classList.remove("is-editor-selected"));
    getAboutNarrativeSelectionMembers(activeSelection).forEach((member) => {
      root.querySelector(`[data-text-cue="${CSS.escape(member.cueId)}"]`)?.classList.add("is-editor-selected");
    });
    root.dataset.editorSelectionType = activeSelection.type || "";
    return () => {
      root.querySelectorAll(".is-editor-selected").forEach((node) => node.classList.remove("is-editor-selected"));
      delete root.dataset.editorSelectionType;
    };
  }, [activeSelection, rootRef]);
  useEffect(() => {
    const interval = window.setInterval(() => setRuntimeMetrics(runtimeRef.current?.getMetrics?.() || null), 500);
    return () => window.clearInterval(interval);
  }, [runtimeRef]);
  useEffect(() => {
    if (!snapshot.dirty) return void 0;
    const timer = window.setTimeout(() => {
      try {
        writeAboutNarrativeRecoveryDraft(snapshot.document, snapshot.baselineHash);
      } catch (error) {
        store.setRecoveryState({ error: `Draft storage failed: ${error.message}` });
      }
    }, 900);
    return () => window.clearTimeout(timer);
  }, [snapshot.baselineHash, snapshot.dirty, snapshot.document, store]);
  useEffect(() => {
    const pagehide = () => {
      const current = snapshotRef.current;
      if (current.dirty) {
        try {
          writeAboutNarrativeRecoveryDraft(current.document, current.baselineHash);
        } catch {
        }
      }
    };
    const keydown = (event) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "s") {
        event.preventDefault();
        document.querySelector("[data-about-editor-save]")?.click();
      }
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "z") {
        event.preventDefault();
        event.shiftKey ? store.redo() : store.undo();
      }
      if (!event.metaKey && !event.ctrlKey && !event.altKey && !event.shiftKey && !isTextEditingTarget(event.target) && ["ArrowLeft", "ArrowRight"].includes(event.key)) {
        event.preventDefault();
        jumpTimelineKeyframe(store, store.getSnapshot(), event.key === "ArrowRight" ? 1 : -1);
      }
      if (!event.metaKey && !event.ctrlKey && !event.altKey && !isTextEditingTarget(event.target) && ["Backspace", "Delete"].includes(event.key) && deleteTimelineSelection(store, store.getSnapshot())) {
        event.preventDefault();
      }
      if (event.key === "Escape") {
        const current = store.getSnapshot();
        if (current.previewState) store.cancelPreview();
        else if (current.tryState) store.cancelTry();
        else if (getAboutNarrativeSelectionMembers(current.selection).length > 1) {
          store.setSelection({
            type: "cue",
            sectionId: current.selection.sectionId,
            cueId: current.selection.cueId,
            keyPart: current.selection.keyPart || "focus"
          });
        } else if (current.selection.type !== "section") store.setSelection({ type: "section", sectionId: current.selection.sectionId });
        else
          store.setSelection({ type: "sequence" });
      }
    };
    window.addEventListener("pagehide", pagehide);
    window.addEventListener("keydown", keydown);
    return () => {
      window.removeEventListener("pagehide", pagehide);
      window.removeEventListener("keydown", keydown);
    };
  }, [store]);
  const save = async () => {
    const editorUrl = new URL(window.location.href);
    editorUrl.searchParams.set("edit", "1");
    window.history.replaceState(window.history.state, "", `${editorUrl.pathname}${editorUrl.search}${editorUrl.hash}`);
    const sent = cloneAboutNarrativeDocument(snapshot.document);
    if (snapshot.diagnostics.some((item) => item.level === "error")) {
      store.setSaveState({ status: "failed", message: "Resolve validation errors before saving." });
      return;
    }
    store.setSaveState({ status: "saving", message: "" });
    try {
      const result = await saveAboutNarrativeSource(sent, snapshot.baselineHash);
      store.markSaved(sent, result.hash);
      clearAboutNarrativeRecoveryDraft();
    } catch (error) {
      store.setSaveState({ status: error.status === 409 ? "conflict" : "failed", message: error.message });
    }
  };
  const addCheckpoint = () => {
    const checkpoint = {
      id: crypto.randomUUID(),
      name: `Checkpoint ${(/* @__PURE__ */ new Date()).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`,
      timestamp: Date.now(),
      storyWU: snapshot.transport.storyWU,
      baseSourceHash: snapshot.baselineHash,
      document: snapshot.document
    };
    setCheckpoints(writeAboutNarrativeCheckpoint(checkpoint));
  };
  const statusLabel = snapshot.saveState.status === "saving" ? "Saving…" : snapshot.saveState.status === "conflict" ? "Source changed" : snapshot.saveState.status === "failed" ? "Save failed" : snapshot.dirty ? "Draft" : "Saved";
  const selected = getSection(snapshot.document, snapshot.selection);
  const compiledSelected = snapshot.compiledPlan?.sections.find((section) => section.id === selected?.id);
  const resolvedExtent = compiledSelected?.resolvedExtentWU || selected?.extentWU || 0;
  const selectedExtent = selected ? Number(snapshot.previewProfile === "mobile" ? selected.mobileExtentWU : selected.extentWU) : 0;
  const selectedCueCount = getAboutNarrativeSelectionMembers(snapshot.selection).length;
  const loopActive = Boolean(snapshot.transport.loop);
  const timelineDeletion = getTimelineDeletion(snapshot);
  const toggleLoop = () => {
    if (loopActive) {
      store.setTransport({ owner: "timeline", playing: false, loop: null });
      return;
    }
    const range = deriveAboutNarrativeLoopRange({
      document: snapshot.document,
      plan: snapshot.compiledPlan,
      source: selected ? { type: "section", sectionId: selected.id } : null
    });
    if (range.valid) store.setTransport({ loop: range });
  };
  const toggleSolo = (track) => store.setTransport({
    soloTrack: snapshot.transport.soloTrack === track ? null : track
  });
  const fitSequence = () => {
    store.setTransport({ zoom: 1 });
    requestAnimationFrame(() => {
      const lanes = document.querySelector(".about-editor-lanes");
      if (lanes) lanes.scrollLeft = 0;
    });
  };
  const fitSection = () => {
    if (!compiledSelected || !snapshot.compiledPlan?.maxStoryWU) return;
    const sectionSpan = Math.max(1e-3, compiledSelected.resolvedExtentWU);
    const zoom = Math.min(8, Math.max(1, snapshot.compiledPlan.maxStoryWU / sectionSpan * 0.82));
    store.setTransport({ zoom: Number(zoom.toFixed(3)) });
    requestAnimationFrame(() => {
      const lanes = document.querySelector(".about-editor-lanes");
      if (!lanes) return;
      const startRatio = compiledSelected.startWU / snapshot.compiledPlan.maxStoryWU;
      lanes.scrollLeft = Math.max(0, startRatio * lanes.scrollWidth - lanes.clientWidth * 0.08);
    });
  };
  const toggleDirector = () => {
    const next = !directorView;
    setDirectorView(next);
    runtimeRef.current?.setDirectorView?.(next);
  };
  const toggleBefore = () => {
    if (snapshot.tryState?.label === "Compare saved source") {
      store.cancelTry();
      return;
    }
    if (snapshot.tryState) return;
    store.beginTry("Compare saved source", (draft) => {
      Object.keys(draft).forEach((key) => delete draft[key]);
      Object.assign(draft, cloneAboutNarrativeDocument(snapshot.baselineDocument));
    });
  };
  return createPortal(
    /* @__PURE__ */ jsxDEV(
      "div",
      {
        className: "about-editor",
        "data-mobile-pane": mobilePane,
        "data-timeline-open": timelineOpen ? "true" : "false",
        role: "region",
        "aria-label": "About Narrative creative toolkit",
        children: [
          /* @__PURE__ */ jsxDEV("header", { className: "about-editor-topbar", children: [
            /* @__PURE__ */ jsxDEV("button", { type: "button", className: "about-editor-brand", onClick: () => store.setSelection({ type: "sequence" }), children: [
              /* @__PURE__ */ jsxDEV(Diamond, { "aria-hidden": "true" }, void 0, false, {
                fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
                lineNumber: 2194,
                columnNumber: 119
              }, this),
              /* @__PURE__ */ jsxDEV("span", { children: "About Narrative" }, void 0, false, {
                fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
                lineNumber: 2194,
                columnNumber: 149
              }, this),
              /* @__PURE__ */ jsxDEV("small", { children: "Creative toolkit" }, void 0, false, {
                fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
                lineNumber: 2194,
                columnNumber: 177
              }, this)
            ] }, void 0, true, {
              fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
              lineNumber: 2194,
              columnNumber: 9
            }, this),
            /* @__PURE__ */ jsxDEV(Transport, { store, snapshot }, void 0, false, {
              fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
              lineNumber: 2195,
              columnNumber: 9
            }, this),
            /* @__PURE__ */ jsxDEV("div", { className: "about-editor-actions", children: [
              /* @__PURE__ */ jsxDEV("button", { type: "button", disabled: !snapshot.history.canUndo, title: snapshot.history.undoLabel || "Undo", "aria-label": "Undo", onClick: () => store.undo(), children: /* @__PURE__ */ jsxDEV("span", { "aria-hidden": "true", children: "↶" }, void 0, false, {
                fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
                lineNumber: 2197,
                columnNumber: 162
              }, this) }, void 0, false, {
                fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
                lineNumber: 2197,
                columnNumber: 11
              }, this),
              /* @__PURE__ */ jsxDEV("button", { type: "button", disabled: !snapshot.history.canRedo, title: snapshot.history.redoLabel || "Redo", "aria-label": "Redo", onClick: () => store.redo(), children: /* @__PURE__ */ jsxDEV("span", { "aria-hidden": "true", children: "↷" }, void 0, false, {
                fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
                lineNumber: 2198,
                columnNumber: 162
              }, this) }, void 0, false, {
                fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
                lineNumber: 2198,
                columnNumber: 11
              }, this),
              /* @__PURE__ */ jsxDEV("button", { type: "button", className: pathVisible ? "is-active" : "", onClick: () => setPathVisible(!pathVisible), children: "Path" }, void 0, false, {
                fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
                lineNumber: 2199,
                columnNumber: 11
              }, this),
              /* @__PURE__ */ jsxDEV("button", { type: "button", className: directorView ? "is-active" : "", onClick: toggleDirector, children: directorView ? "Director" : "Camera" }, void 0, false, {
                fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
                lineNumber: 2200,
                columnNumber: 11
              }, this),
              /* @__PURE__ */ jsxDEV("button", { type: "button", className: snapshot.tryState?.label === "Compare saved source" ? "is-active" : "", disabled: snapshot.tryState && snapshot.tryState.label !== "Compare saved source", onClick: toggleBefore, children: snapshot.tryState?.label === "Compare saved source" ? "Before" : "After" }, void 0, false, {
                fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
                lineNumber: 2201,
                columnNumber: 11
              }, this),
              /* @__PURE__ */ jsxDEV("details", { className: "about-editor-more", children: [
                /* @__PURE__ */ jsxDEV("summary", { children: "More" }, void 0, false, {
                  fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
                  lineNumber: 2203,
                  columnNumber: 13
                }, this),
                /* @__PURE__ */ jsxDEV("div", { children: [
                  /* @__PURE__ */ jsxDEV("button", { type: "button", onClick: addCheckpoint, children: "Checkpoint" }, void 0, false, {
                    fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
                    lineNumber: 2205,
                    columnNumber: 15
                  }, this),
                  /* @__PURE__ */ jsxDEV("button", { type: "button", onClick: () => exportAboutNarrativeDocument(snapshot.document), children: "Export JSON" }, void 0, false, {
                    fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
                    lineNumber: 2206,
                    columnNumber: 15
                  }, this),
                  /* @__PURE__ */ jsxDEV("button", { type: "button", onClick: () => importRef.current?.click(), children: "Import JSON" }, void 0, false, {
                    fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
                    lineNumber: 2207,
                    columnNumber: 15
                  }, this)
                ] }, void 0, true, {
                  fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
                  lineNumber: 2204,
                  columnNumber: 13
                }, this)
              ] }, void 0, true, {
                fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
                lineNumber: 2202,
                columnNumber: 11
              }, this),
              /* @__PURE__ */ jsxDEV("input", { ref: importRef, hidden: true, type: "file", accept: "application/json", onChange: async (event) => {
                const file = event.target.files?.[0];
                if (!file) return;
                try {
                  const imported = JSON.parse(await file.text());
                  assertValidAboutNarrativeDocument(imported);
                  store.replaceDocument("Import document", imported);
                } catch (error) {
                  store.setSaveState({ status: "failed", message: error.message });
                }
                event.target.value = "";
              } }, void 0, false, {
                fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
                lineNumber: 2210,
                columnNumber: 11
              }, this),
              /* @__PURE__ */ jsxDEV("button", { type: "button", "data-about-editor-save": true, className: "is-save", disabled: snapshot.saveState.status === "saving", onClick: save, children: [
                /* @__PURE__ */ jsxDEV("span", { children: statusLabel }, void 0, false, {
                  fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
                  lineNumber: 2220,
                  columnNumber: 141
                }, this),
                /* @__PURE__ */ jsxDEV("kbd", { children: "⌘S" }, void 0, false, {
                  fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
                  lineNumber: 2220,
                  columnNumber: 167
                }, this)
              ] }, void 0, true, {
                fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
                lineNumber: 2220,
                columnNumber: 11
              }, this)
            ] }, void 0, true, {
              fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
              lineNumber: 2196,
              columnNumber: 9
            }, this)
          ] }, void 0, true, {
            fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
            lineNumber: 2193,
            columnNumber: 7
          }, this),
          snapshot.recoveryState.available ? /* @__PURE__ */ jsxDEV("div", { className: "about-editor-recovery", children: [
            /* @__PURE__ */ jsxDEV("span", { children: [
              "An unsaved draft from ",
              new Date(snapshot.recoveryState.draft.timestamp).toLocaleString(),
              " is available."
            ] }, void 0, true, {
              fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
              lineNumber: 2224,
              columnNumber: 82
            }, this),
            /* @__PURE__ */ jsxDEV("button", { type: "button", onClick: () => {
              store.replaceDocument("Recover draft", snapshot.recoveryState.draft.document);
              store.setRecoveryState({ available: false });
            }, children: "Recover as unsaved copy" }, void 0, false, {
              fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
              lineNumber: 2224,
              columnNumber: 198
            }, this),
            /* @__PURE__ */ jsxDEV("button", { type: "button", onClick: () => {
              exportAboutNarrativeDocument(snapshot.recoveryState.draft.document, "contents-about-recovered.json");
            }, children: "Export" }, void 0, false, {
              fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
              lineNumber: 2224,
              columnNumber: 394
            }, this),
            /* @__PURE__ */ jsxDEV("button", { type: "button", onClick: () => {
              clearAboutNarrativeRecoveryDraft();
              store.setRecoveryState({ available: false });
            }, children: "Discard" }, void 0, false, {
              fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
              lineNumber: 2224,
              columnNumber: 551
            }, this)
          ] }, void 0, true, {
            fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
            lineNumber: 2224,
            columnNumber: 43
          }, this) : null,
          snapshot.saveState.message ? /* @__PURE__ */ jsxDEV("div", { className: `about-editor-save-message is-${snapshot.saveState.status}`, children: [
            snapshot.saveState.message,
            /* @__PURE__ */ jsxDEV("button", { type: "button", "aria-label": "Dismiss message", onClick: () => store.setSaveState({ message: "" }), children: "×" }, void 0, false, {
              fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
              lineNumber: 2225,
              columnNumber: 142
            }, this)
          ] }, void 0, true, {
            fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
            lineNumber: 2225,
            columnNumber: 37
          }, this) : null,
          pathVisible ? /* @__PURE__ */ jsxDEV(CameraPathOverlay, { snapshot }, void 0, false, {
            fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
            lineNumber: 2227,
            columnNumber: 22
          }, this) : null,
          directorView ? /* @__PURE__ */ jsxDEV("div", { className: "about-editor-director-controls", children: [
            /* @__PURE__ */ jsxDEV("strong", { children: "Director View" }, void 0, false, {
              fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
              lineNumber: 2228,
              columnNumber: 71
            }, this),
            /* @__PURE__ */ jsxDEV("button", { type: "button", onClick: () => runtimeRef.current?.nudgeDirector?.({ yaw: -0.08 }), children: "←" }, void 0, false, {
              fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
              lineNumber: 2228,
              columnNumber: 101
            }, this),
            /* @__PURE__ */ jsxDEV("button", { type: "button", onClick: () => runtimeRef.current?.nudgeDirector?.({ pitch: 0.08 }), children: "↑" }, void 0, false, {
              fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
              lineNumber: 2228,
              columnNumber: 201
            }, this),
            /* @__PURE__ */ jsxDEV("button", { type: "button", onClick: () => runtimeRef.current?.nudgeDirector?.({ pitch: -0.08 }), children: "↓" }, void 0, false, {
              fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
              lineNumber: 2228,
              columnNumber: 302
            }, this),
            /* @__PURE__ */ jsxDEV("button", { type: "button", onClick: () => runtimeRef.current?.nudgeDirector?.({ yaw: 0.08 }), children: "→" }, void 0, false, {
              fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
              lineNumber: 2228,
              columnNumber: 404
            }, this),
            /* @__PURE__ */ jsxDEV("button", { type: "button", onClick: () => runtimeRef.current?.nudgeDirector?.({ distance: -0.2 }), children: "＋" }, void 0, false, {
              fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
              lineNumber: 2228,
              columnNumber: 503
            }, this),
            /* @__PURE__ */ jsxDEV("button", { type: "button", onClick: () => runtimeRef.current?.nudgeDirector?.({ distance: 0.2 }), children: "−" }, void 0, false, {
              fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
              lineNumber: 2228,
              columnNumber: 607
            }, this),
            /* @__PURE__ */ jsxDEV("button", { type: "button", onClick: () => runtimeRef.current?.resetDirector?.(), children: "Reset" }, void 0, false, {
              fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
              lineNumber: 2228,
              columnNumber: 710
            }, this),
            /* @__PURE__ */ jsxDEV("small", { children: "Temporary inspection only. Published Camera keys are unchanged." }, void 0, false, {
              fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
              lineNumber: 2228,
              columnNumber: 800
            }, this)
          ] }, void 0, true, {
            fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
            lineNumber: 2228,
            columnNumber: 23
          }, this) : null,
          /* @__PURE__ */ jsxDEV(Inspector, { store, snapshot, timelineOpen, runtimeMetrics, clipboard, setClipboard }, void 0, false, {
            fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
            lineNumber: 2230,
            columnNumber: 7
          }, this),
          /* @__PURE__ */ jsxDEV(
            "button",
            {
              type: "button",
              className: "about-editor-timeline-toggle",
              "aria-controls": "about-editor-timeline-panel",
              "aria-expanded": timelineOpen,
              title: timelineOpen ? "Hide timeline" : "Show timeline",
              onClick: () => setTimelineOpen((open) => !open),
              children: [
                timelineOpen ? /* @__PURE__ */ jsxDEV(ChevronDown, { "aria-hidden": "true" }, void 0, false, {
                  fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
                  lineNumber: 2238,
                  columnNumber: 25
                }, this) : /* @__PURE__ */ jsxDEV(ChevronUp, { "aria-hidden": "true" }, void 0, false, {
                  fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
                  lineNumber: 2238,
                  columnNumber: 62
                }, this),
                /* @__PURE__ */ jsxDEV("span", { children: timelineOpen ? "Hide timeline" : "Show timeline" }, void 0, false, {
                  fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
                  lineNumber: 2238,
                  columnNumber: 95
                }, this)
              ]
            },
            void 0,
            true,
            {
              fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
              lineNumber: 2231,
              columnNumber: 7
            },
            this
          ),
          /* @__PURE__ */ jsxDEV("div", { id: "about-editor-timeline-panel", className: "about-editor-bottom", "aria-hidden": !timelineOpen, children: [
            /* @__PURE__ */ jsxDEV("div", { className: "about-editor-contextbar", children: [
              /* @__PURE__ */ jsxDEV("span", { children: [
                /* @__PURE__ */ jsxDEV("strong", { children: selected?.label || "Sequence" }, void 0, false, {
                  fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
                  lineNumber: 2241,
                  columnNumber: 17
                }, this),
                " ",
                selected ? `${selected.type} · ${formatWU(Math.max(0, selectedExtent - 1))} scroll · ${formatWU(selectedExtent)} total${resolvedExtent > selectedExtent + 1e-3 ? ` · ${formatWU(resolvedExtent)} resolved` : ""}` : ""
              ] }, void 0, true, {
                fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
                lineNumber: 2241,
                columnNumber: 11
              }, this),
              selectedCueCount > 1 ? /* @__PURE__ */ jsxDEV("span", { className: "about-editor-selection-count", children: [
                selectedCueCount,
                " titles selected"
              ] }, void 0, true, {
                fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
                lineNumber: 2242,
                columnNumber: 35
              }, this) : null,
              /* @__PURE__ */ jsxDEV("span", { children: snapshot.autoKey ? "Auto-key armed" : "Auto-key off" }, void 0, false, {
                fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
                lineNumber: 2243,
                columnNumber: 11
              }, this),
              /* @__PURE__ */ jsxDEV("button", { type: "button", className: snapshot.autoKey ? "is-active" : "", onClick: () => store.setAutoKey(!snapshot.autoKey), children: "◆ Auto-key" }, void 0, false, {
                fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
                lineNumber: 2244,
                columnNumber: 11
              }, this),
              /* @__PURE__ */ jsxDEV("button", { type: "button", className: loopActive ? "is-active" : "", onClick: toggleLoop, children: loopActive ? "Stop audition" : "Loop Section" }, void 0, false, {
                fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
                lineNumber: 2245,
                columnNumber: 11
              }, this),
              /* @__PURE__ */ jsxDEV("button", { type: "button", onClick: fitSequence, children: "Fit sequence" }, void 0, false, {
                fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
                lineNumber: 2246,
                columnNumber: 11
              }, this),
              /* @__PURE__ */ jsxDEV("button", { type: "button", disabled: !compiledSelected, onClick: fitSection, children: "Fit Section" }, void 0, false, {
                fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
                lineNumber: 2247,
                columnNumber: 11
              }, this),
              ["camera", "world", "text"].map((track) => /* @__PURE__ */ jsxDEV("button", { type: "button", className: snapshot.transport.soloTrack === track ? "is-active" : "", onClick: () => toggleSolo(track), children: [
                "Solo ",
                track
              ] }, track, true, {
                fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
                lineNumber: 2248,
                columnNumber: 55
              }, this)),
              timelineDeletion ? /* @__PURE__ */ jsxDEV("button", { type: "button", className: "about-editor-delete-key", disabled: timelineDeletion.disabled, title: timelineDeletion.message || `${timelineDeletion.label} · Delete/Backspace`, onClick: () => deleteTimelineSelection(store, snapshot), children: [
                /* @__PURE__ */ jsxDEV(Trash2, { "aria-hidden": "true" }, void 0, false, {
                  fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
                  lineNumber: 2249,
                  columnNumber: 266
                }, this),
                timelineDeletion.label
              ] }, void 0, true, {
                fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
                lineNumber: 2249,
                columnNumber: 31
              }, this) : null,
              runtimeMetrics ? /* @__PURE__ */ jsxDEV("span", { className: "about-editor-hud", children: [
                runtimeMetrics.frameTimeMs.toFixed(2),
                "ms · ",
                runtimeMetrics.drawCalls,
                " draw · ",
                runtimeMetrics.pointCount.toLocaleString(),
                " pts · ",
                runtimeMetrics.activeModifiers,
                " modifiers · ",
                runtimeMetrics.bufferRebuilds,
                " rebuilds"
              ] }, void 0, true, {
                fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
                lineNumber: 2250,
                columnNumber: 29
              }, this) : null,
              checkpoints.length ? /* @__PURE__ */ jsxDEV("select", { "aria-label": "Restore checkpoint", defaultValue: "", onChange: (event) => {
                const found = checkpoints.find((item) => item.id === event.target.value);
                if (found) {
                  store.replaceDocument(`Restore ${found.name}`, found.document);
                  store.setTransport({ owner: "timeline", storyWU: found.storyWU, playing: false });
                }
                event.target.value = "";
              }, children: [
                /* @__PURE__ */ jsxDEV("option", { value: "", children: [
                  "Checkpoints (",
                  checkpoints.length,
                  ")"
                ] }, void 0, true, {
                  fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
                  lineNumber: 2251,
                  columnNumber: 369
                }, this),
                checkpoints.map((item) => /* @__PURE__ */ jsxDEV("option", { value: item.id, children: item.name }, item.id, false, {
                  fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
                  lineNumber: 2251,
                  columnNumber: 456
                }, this))
              ] }, void 0, true, {
                fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
                lineNumber: 2251,
                columnNumber: 33
              }, this) : null
            ] }, void 0, true, {
              fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
              lineNumber: 2240,
              columnNumber: 9
            }, this),
            /* @__PURE__ */ jsxDEV(Timeline, { store, snapshot }, void 0, false, {
              fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
              lineNumber: 2253,
              columnNumber: 9
            }, this)
          ] }, void 0, true, {
            fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
            lineNumber: 2239,
            columnNumber: 7
          }, this),
          /* @__PURE__ */ jsxDEV("nav", { className: "about-editor-mobile-tabs", "aria-label": "Editor panel", children: [
            /* @__PURE__ */ jsxDEV("button", { type: "button", className: mobilePane === "sequence" ? "is-active" : "", onClick: () => setMobilePane("sequence"), children: "Sequence" }, void 0, false, {
              fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
              lineNumber: 2255,
              columnNumber: 75
            }, this),
            /* @__PURE__ */ jsxDEV("button", { type: "button", className: mobilePane === "inspect" ? "is-active" : "", onClick: () => setMobilePane("inspect"), children: "Inspect" }, void 0, false, {
              fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
              lineNumber: 2255,
              columnNumber: 213
            }, this),
            /* @__PURE__ */ jsxDEV("button", { type: "button", className: mobilePane === "preview" ? "is-active" : "", onClick: () => setMobilePane("preview"), children: "Preview" }, void 0, false, {
              fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
              lineNumber: 2255,
              columnNumber: 348
            }, this)
          ] }, void 0, true, {
            fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
            lineNumber: 2255,
            columnNumber: 7
          }, this)
        ]
      },
      void 0,
      true,
      {
        fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
        lineNumber: 2186,
        columnNumber: 5
      },
      this
    ),
    document.body
  );
}
_s5(AboutNarrativeEditor, "bLb3NYqc3ahSTBTmrBEIMEiNsDo=");
_c16 = AboutNarrativeEditor;
var _c, _c2, _c3, _c4, _c5, _c6, _c7, _c8, _c9, _c0, _c1, _c10, _c11, _c12, _c13, _c14, _c15, _c16;
$RefreshReg$(_c, "Property");
$RefreshReg$(_c2, "NumberProperty");
$RefreshReg$(_c3, "RangeProperty");
$RefreshReg$(_c4, "Transport");
$RefreshReg$(_c5, "Timeline");
$RefreshReg$(_c6, "SequenceInspector");
$RefreshReg$(_c7, "SectionInspector");
$RefreshReg$(_c8, "EditorialBlocks");
$RefreshReg$(_c9, "CueRhythmAndReuse");
$RefreshReg$(_c0, "CueInspector");
$RefreshReg$(_c1, "DisciplineRevealInspector");
$RefreshReg$(_c10, "CameraInspector");
$RefreshReg$(_c11, "WorldInspector");
$RefreshReg$(_c12, "Diagnostics");
$RefreshReg$(_c13, "AuditionControls");
$RefreshReg$(_c14, "Inspector");
$RefreshReg$(_c15, "CameraPathOverlay");
$RefreshReg$(_c16, "AboutNarrativeEditor");
import * as RefreshRuntime from "/@react-refresh";
const inWebWorker = typeof WorkerGlobalScope !== "undefined" && self instanceof WorkerGlobalScope;
if (import.meta.hot && !inWebWorker) {
  if (!window.$RefreshReg$) {
    throw new Error(
      "@vitejs/plugin-react can't detect preamble. Something is wrong."
    );
  }
  RefreshRuntime.__hmr_import(import.meta.url).then((currentExports) => {
    RefreshRuntime.registerExportsForReactRefresh("/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx", currentExports);
    import.meta.hot.accept((nextExports) => {
      if (!nextExports) return;
      const invalidateMessage = RefreshRuntime.validateRefreshBoundaryAndEnqueueUpdate("/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx", currentExports, nextExports);
      if (invalidateMessage) import.meta.hot.invalidate(invalidateMessage);
    });
  });
}
function $RefreshReg$(type, id) {
  return RefreshRuntime.register(type, "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx " + id);
}
function $RefreshSig$() {
  return RefreshRuntime.createSignatureFunctionForTransform();
}

//# sourceMappingURL=data:application/json;base64,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LE1BQUFDLE1BQUE1SCxNQUFBNkg7QUFBQSxhQUFBcmhCLElBQUE7QUFBQSxhQUFBSyxLQUFBO0FBQUEsYUFBQVUsS0FBQTtBQUFBLGFBQUFZLEtBQUE7QUFBQSxhQUFBc2YsS0FBQTtBQUFBLGFBQUFuVSxLQUFBO0FBQUEsYUFBQWlCLEtBQUE7QUFBQSxhQUFBa0IsS0FBQTtBQUFBLGFBQUFpUyxLQUFBO0FBQUEsYUFBQTVQLEtBQUE7QUFBQSxhQUFBUyxLQUFBO0FBQUEsYUFBQTZCLE1BQUE7QUFBQSxhQUFBd0MsTUFBQTtBQUFBLGFBQUFNLE1BQUE7QUFBQSxhQUFBeUssTUFBQTtBQUFBLGFBQUFDLE1BQUE7QUFBQSxhQUFBNUgsTUFBQTtBQUFBLGFBQUE2SCxNQUFBIiwibmFtZXMiOlsidXNlRWZmZWN0IiwidXNlUmVmIiwidXNlU3RhdGUiLCJ1c2VTeW5jRXh0ZXJuYWxTdG9yZSIsImNyZWF0ZVBvcnRhbCIsIkNoZWNrIiwiQ2hldnJvbkRvd24iLCJDaGV2cm9uTGVmdCIsIkNoZXZyb25SaWdodCIsIkNoZXZyb25VcCIsIkNpcmNsZUFsZXJ0IiwiRGlhbW9uZCIsIkluZm8iLCJMb2NrS2V5aG9sZSIsIlBhdXNlIiwiUGxheSIsIlNraXBCYWNrIiwiU2tpcEZvcndhcmQiLCJUcmFzaDIiLCJBQk9VVF9OQVJSQVRJVkVfR0xPQkFMX0NPTlRST0xTIiwiQUJPVVRfTkFSUkFUSVZFX0NPUlJFU1BPTkRFTkNFX01PREVTIiwiQUJPVVRfTkFSUkFUSVZFX0RJU0NJUExJTkVfUkVWRUFMX0NPTlRST0xTIiwiQUJPVVRfTkFSUkFUSVZFX0VNUEhBU0lTX1RPTkVTIiwiQUJPVVRfTkFSUkFUSVZFX01PRElGSUVSX0RFRklOSVRJT05TIiwiQUJPVVRfTkFSUkFUSVZFX1NIQVBFX0RFRklOSVRJT05TIiwiY2xlYXJBYm91dE5hcnJhdGl2ZVJlY292ZXJ5RHJhZnQiLCJleHBvcnRBYm91dE5hcnJhdGl2ZURvY3VtZW50IiwibG9hZEFib3V0TmFycmF0aXZlU291cmNlIiwicmVhZEFib3V0TmFycmF0aXZlQ2hlY2twb2ludHMiLCJyZWFkQWJvdXROYXJyYXRpdmVSZWNvdmVyeURyYWZ0Iiwic2F2ZUFib3V0TmFycmF0aXZlU291cmNlIiwid3JpdGVBYm91dE5hcnJhdGl2ZUNoZWNrcG9pbnQiLCJ3cml0ZUFib3V0TmFycmF0aXZlUmVjb3ZlcnlEcmFmdCIsImFzc2VydFZhbGlkQWJvdXROYXJyYXRpdmVEb2N1bWVudCIsImNsb25lQWJvdXROYXJyYXRpdmVEb2N1bWVudCIsImdldEFib3V0TmFycmF0aXZlQ3VlTW92ZW1lbnQiLCJnZXRBYm91dE5hcnJhdGl2ZUN1ZU1vdGlvbkludGVydmFsIiwiZ2V0QWJvdXROYXJyYXRpdmVXb3JsZFRyYW5zaXRpb25MaW1pdCIsInNhbXBsZUFib3V0TmFycmF0aXZlUGxhbiIsImNhcHR1cmVBYm91dE5hcnJhdGl2ZVBsYXloZWFkQ29udGV4dCIsImNyZWF0ZUFib3V0TmFycmF0aXZlQ3VlQ2xpcGJvYXJkUGF5bG9hZCIsImRlcml2ZUFib3V0TmFycmF0aXZlTG9vcFJhbmdlIiwiZHVwbGljYXRlQWJvdXROYXJyYXRpdmVDdWVHcm91cCIsImR1cGxpY2F0ZUFib3V0TmFycmF0aXZlU2VjdGlvbiIsImdldEFib3V0TmFycmF0aXZlQ2FtZXJhS2V5VGltaW5nQm91bmRzIiwiZ2V0QWJvdXROYXJyYXRpdmVDdWVUaW1pbmdCb3VuZHMiLCJnZXRBYm91dE5hcnJhdGl2ZUV4dGVudEZpZWxkIiwiZ2V0QWJvdXROYXJyYXRpdmVTZWxlY3Rpb25NZW1iZXJzIiwibW92ZUFib3V0TmFycmF0aXZlQ3VlVGltaW5nIiwicmVtYXBBYm91dE5hcnJhdGl2ZVBsYXloZWFkQ29udGV4dCIsInJlc29sdmVBYm91dE5hcnJhdGl2ZUNhbWVyYUtleURyb3AiLCJyZXNvbHZlQWJvdXROYXJyYXRpdmVDdWVEaXN0cmlidXRpb24iLCJyZXNvbHZlQWJvdXROYXJyYXRpdmVDdWVFeGFjdEdhcCIsInJlc29sdmVBYm91dE5hcnJhdGl2ZUN1ZUdyb3VwTW92ZSIsInJlc29sdmVBYm91dE5hcnJhdGl2ZUN1ZUdyb3VwQWxpZ24iLCJyZXNvbHZlQWJvdXROYXJyYXRpdmVDdWVHcm91cFBhc3RlIiwic25hcEFib3V0TmFycmF0aXZlVGltZWxpbmVWYWx1ZSIsInN0aXRjaEFib3V0TmFycmF0aXZlQ2FtZXJhQm91bmRhcmllcyIsInRvZ2dsZUFib3V0TmFycmF0aXZlQ3VlU2VsZWN0aW9uIiwidmFsaWRhdGVBYm91dE5hcnJhdGl2ZUN1ZUNsaXBib2FyZFBheWxvYWQiLCJjbGFtcDAxIiwidmFsdWUiLCJNYXRoIiwibWluIiwibWF4IiwiQUJPVVRfRURJVE9SX1RJTUVMSU5FX1NUT1JBR0VfS0VZIiwiVElNRUxJTkVfS0VZX0VQU0lMT04iLCJJTlNQRUNUT1JfRURHRV9HQVAiLCJDQU1FUkFfUE9TRV9GSUVMRFMiLCJTZXQiLCJESVNDSVBMSU5FX1JFVkVBTF9NQVgiLCJmaW5kIiwiY29udHJvbCIsImlkIiwiRElTQ0lQTElORV9CQUxMX1RPS0VOX0JZX0dST1VQIiwiT2JqZWN0IiwiZnJlZXplIiwiVElNRUxJTkVfR0xPQkFMX1RSQUNLUyIsImxhbmUiLCJsYWJlbCIsImdyb3VwSWRzIiwiY2FtZXJhUG9zZUNoYW5nZXMiLCJmcm9tIiwidG8iLCJzb21lIiwiZmllbGQiLCJpbmRleCIsImFicyIsImZvdiIsInJvbGwiLCJjb3B5Q2FtZXJhUG9zZSIsInRhcmdldCIsInNvdXJjZSIsIm9mZnNldCIsImxvb2tBdE9mZnNldCIsImxpbmtDYW1lcmFCb3VuZGFyeSIsImRvY3VtZW50Iiwic2VjdGlvbkluZGV4Iiwia2V5SW5kZXgiLCJzZWN0aW9uIiwic2VjdGlvbnMiLCJrZXkiLCJjYW1lcmEiLCJrZXlzIiwiYXQiLCJsZW5ndGgiLCJicmlkZ2VDYW1lcmFTZWN0aW9uIiwiZ2V0SW5zcGVjdG9yVmVydGljYWxCb3VuZHMiLCJpbnNwZWN0b3IiLCJ0aW1lbGluZU9wZW4iLCJlZGl0b3IiLCJjbG9zZXN0Iiwic3R5bGVzIiwiZ2V0Q29tcHV0ZWRTdHlsZSIsInRvcGJhckhlaWdodCIsIk51bWJlciIsInBhcnNlRmxvYXQiLCJnZXRQcm9wZXJ0eVZhbHVlIiwidGltZWxpbmVIZWlnaHQiLCJidXR0b25CYXJUb3AiLCJxdWVyeVNlbGVjdG9yIiwiZ2V0Qm91bmRpbmdDbGllbnRSZWN0IiwidG9wIiwid2luZG93IiwiaW5uZXJIZWlnaHQiLCJtaW5Ub3AiLCJtYXhCb3R0b20iLCJjbGFtcEluc3BlY3RvclBvc2l0aW9uIiwicG9zaXRpb24iLCJtYXhXaWR0aCIsImlubmVyV2lkdGgiLCJ3aWR0aCIsImF2YWlsYWJsZUhlaWdodCIsImhlaWdodCIsIm1heExlZnQiLCJtYXhUb3AiLCJsZWZ0IiwiZ2V0U2VjdGlvbkluZGV4Iiwic2VjdGlvbklkIiwiZmluZEluZGV4IiwiZ2V0U2VjdGlvbiIsInNlbGVjdGlvbiIsImdldExvY2FsUHJvZ3Jlc3MiLCJwbGFuIiwic3RvcnlXVSIsImNvbXBpbGVkIiwiaXRlbSIsInN0YXJ0V1UiLCJ0cmF2ZWxXVSIsImZvcm1hdFdVIiwidG9GaXhlZCIsImZvcm1hdENhbWVyYVBlcmNlbnQiLCJpc1RleHRFZGl0aW5nVGFyZ2V0IiwiSFRNTEVsZW1lbnQiLCJtYXRjaGVzIiwiaXNDb250ZW50RWRpdGFibGUiLCJnZXRUaW1lbGluZUtleWZyYW1lcyIsInNuYXBzaG90IiwiY29tcGlsZWRQbGFuIiwiZXZlbnRzIiwiZm9yRWFjaCIsInRvU3RvcnlXVSIsInB1c2giLCJwcmlvcml0eSIsInR5cGUiLCJ3b3JsZCIsIm1vZGUiLCJ0cmFuc2l0aW9uSW4iLCJwYXJ0IiwicGFydEluZGV4Iiwia2V5UGFydCIsInRleHQiLCJjdWVzIiwiY3VlIiwiY3VlSW5kZXgiLCJob2xkIiwiY3VlSWQiLCJkaXNjaXBsaW5lUmV2ZWFsIiwic3RhcnQiLCJpbnRlcmFjdGlvbiIsImlzRmluaXRlIiwiYWN0aXZhdGlvblN0YXJ0Iiwic29ydCIsImEiLCJiIiwiZ2V0VGltZWxpbmVEZWxldGlvbiIsInJlcXVpcmVkIiwiZGlzYWJsZWQiLCJtZXNzYWdlIiwiZXhlY3V0ZSIsInN0b3JlIiwiY29tbWl0IiwiZHJhZnQiLCJzcGxpY2UiLCJzdGFydHNXaXRoIiwidHJhbnNpdGlvbiIsImVuZCIsImRlbGV0ZVRpbWVsaW5lU2VsZWN0aW9uIiwiZGVsZXRpb24iLCJzZXRTYXZlU3RhdGUiLCJzZWVrVGltZWxpbmVLZXlmcmFtZSIsImV2ZW50Iiwic2V0U2VsZWN0aW9uIiwic2V0VHJhbnNwb3J0Iiwib3duZXIiLCJwbGF5aW5nIiwianVtcFRpbWVsaW5lS2V5ZnJhbWUiLCJkaXJlY3Rpb24iLCJjdXJyZW50V1UiLCJ0cmFuc3BvcnQiLCJ0YXJnZXRQb3NpdGlvbiIsInJldmVyc2UiLCJtYWtlU2x1ZyIsInRvTG93ZXJDYXNlIiwicmVwbGFjZSIsIm5leHRJZCIsImJhc2UiLCJ1c2VkIiwiZmxhdE1hcCIsIm1hcCIsImJsb2NrcyIsImJsb2NrIiwic3VmZml4IiwiaGFzIiwicmVwbGFjZURyYWZ0RG9jdW1lbnQiLCJuZXh0RG9jdW1lbnQiLCJhc3NpZ24iLCJhcHBseUN1ZU1vdmVzIiwibW92ZXMiLCJtb3ZlIiwiZW50ZXIiLCJleGl0IiwiUHJvcGVydHkiLCJjaGlsZHJlbiIsImhpbnQiLCJfYyIsIk51bWJlclByb3BlcnR5Iiwic3RlcCIsIm9uQ2hhbmdlIiwidW5pdCIsIl9jMiIsIlJhbmdlUHJvcGVydHkiLCJvblN0YXJ0Q2hhbmdlIiwib25FbmRDaGFuZ2UiLCJzdGFydFBlcmNlbnQiLCJlbmRQZXJjZW50IiwicGVyY2VudGFnZVN0ZXAiLCJzZXRTdGFydCIsInNldEVuZCIsInJvdW5kIiwiX2MzIiwiVHJhbnNwb3J0IiwibWF4V1UiLCJtYXhTdG9yeVdVIiwicGxheSIsInNlZWsiLCJzZWxlY3RlZCIsImp1bXBTZWN0aW9uIiwibmV4dCIsImxpdmVBbWJpZW50IiwicHJldmlld1Byb2ZpbGUiLCJzZXRQcmV2aWV3UHJvZmlsZSIsIl9jNCIsIlRpbWVsaW5lIiwib25PcGVuR2xvYmFsIiwiX3MiLCJzZWxlY3RlZEN1ZU1lbWJlcnMiLCJyZWR1Y2UiLCJzdW0iLCJleHRlbnRXVSIsInBsYXloZWFkIiwibGFuZXNSZWYiLCJ0aW1pbmdEcmFnUmVmIiwicHJldmlld0ZyYW1lUmVmIiwicGVuZGluZ1ByZXZpZXdSZWYiLCJzdXBwcmVzc2VkQ2xpY2tSZWYiLCJjYW1lcmFEcmFnUHJldmlldyIsInNldENhbWVyYURyYWdQcmV2aWV3Iiwic2VjdGlvblJlc2l6ZVByZXZpZXciLCJzZXRTZWN0aW9uUmVzaXplUHJldmlldyIsIm1hcnF1ZWUiLCJzZXRNYXJxdWVlIiwicXVldWVQcmV2aWV3RnJhbWUiLCJjYWxsYmFjayIsImN1cnJlbnQiLCJyZXF1ZXN0QW5pbWF0aW9uRnJhbWUiLCJwZW5kaW5nIiwiZmx1c2hQcmV2aWV3RnJhbWUiLCJjYW5jZWxBbmltYXRpb25GcmFtZSIsInpvb21UaW1lbGluZSIsImN0cmxLZXkiLCJtZXRhS2V5IiwicHJldmVudERlZmF1bHQiLCJsYW5lcyIsInJlY3QiLCJwb2ludGVyWCIsImNsaWVudFgiLCJzdG9yeVJhdGlvIiwic2Nyb2xsTGVmdCIsInNjcm9sbFdpZHRoIiwiY3VycmVudFpvb20iLCJ6b29tIiwibmV4dFpvb20iLCJleHAiLCJkZWx0YVkiLCJyZXNvbHZlQ2FtZXJhRHJvcEF0Q2xpZW50WCIsImdldFNuYXBzaG90IiwidmFsaWQiLCJyZWFzb24iLCJjb250ZW50WCIsImRyYWciLCJkcm9wIiwic291cmNlU2VjdGlvbkluZGV4Iiwic291cmNlS2V5SW5kZXgiLCJiZWdpblRpbWluZ0RyYWciLCJsb2NrZWQiLCJidXR0b24iLCJjbGlwIiwiY3VycmVudFRhcmdldCIsInBhcmVudEVsZW1lbnQiLCJzdG9wUHJvcGFnYXRpb24iLCJzZXRQb2ludGVyQ2FwdHVyZSIsInBvaW50ZXJJZCIsIm5leHRTZWxlY3Rpb24iLCJjdXJyZW50U2VsZWN0aW9uIiwiY3VycmVudE1lbWJlcnMiLCJhbHJlYWR5U2VsZWN0ZWQiLCJtZW1iZXIiLCJzaGlmdEtleSIsIm1lbWJlcnMiLCJiZWdpblByZXZpZXciLCJzdGFydERvY3VtZW50Iiwic3RhcnRQbGFuIiwic3RhcnRYIiwibW92ZWQiLCJsYXN0QXQiLCJsYXN0RHJvcCIsIm1vdmVUaW1pbmdEcmFnIiwidG9rZW4iLCJkZWx0YUxhbmUiLCJuZXh0QXQiLCJkZWx0YSIsInJldmVhbCIsImNvYWxlc2NlS2V5Iiwic2VjdGlvblN0YXJ0V1UiLCJsb2NhbERlbHRhIiwibW92ZW1lbnQiLCJwcmltYXJ5IiwiZGVsdGFXVSIsImxhc3REZWx0YVdVIiwidXBkYXRlUHJldmlldyIsImVuZFRpbWluZ0RyYWciLCJoYXNQb2ludGVyQ2FwdHVyZSIsInJlbGVhc2VQb2ludGVyQ2FwdHVyZSIsImNhbmNlbFByZXZpZXciLCJjb21taXRQcmV2aWV3Iiwic291cmNlS2V5cyIsIm1vdmVkS2V5IiwiZGVzdGluYXRpb25LZXlzIiwic2V0VGltZW91dCIsImhhbmRsZVRpbWluZ0NsaWNrIiwiYWN0aW9uIiwiYmVnaW5TZWN0aW9uUmVzaXplIiwiZGF0YSIsInNlY3Rpb25MYWJlbCIsInN0YXJ0RXh0ZW50Iiwic3RhcnRNYXhXVSIsInN0YXJ0U2Nyb2xsV2lkdGgiLCJwbGF5aGVhZENvbnRleHQiLCJyZXNpemVkU2VjdGlvbklkIiwiZXh0ZW50IiwibW92ZVNlY3Rpb25SZXNpemUiLCJyYXdFeHRlbnQiLCJhbHRLZXkiLCJsYXN0RXh0ZW50IiwiZW5kU2VjdGlvblJlc2l6ZSIsInJlc2V0U2VjdGlvbkV4dGVudCIsImJhc2VsaW5lU2VjdGlvbiIsImJhc2VsaW5lRG9jdW1lbnQiLCJjb250ZXh0IiwiYmVnaW5NYXJxdWVlIiwiY2FudmFzIiwic3RhcnRDbGllbnRYIiwic3RhcnRDbGllbnRZIiwiY2xpZW50WSIsImNhbnZhc1JlY3QiLCJhZGRpdGl2ZSIsIm1vdmVNYXJxdWVlIiwiZW5kTWFycXVlZSIsInNlbGVjdGlvblJlY3QiLCJyaWdodCIsImJvdHRvbSIsImxhbmVSZWN0IiwiaGl0cyIsInF1ZXJ5U2VsZWN0b3JBbGwiLCJmaWx0ZXIiLCJub2RlIiwidmlzaWJsZSIsImRhdGFzZXQiLCJzbGljZSIsImhpdCIsInRyYWNrIiwidHJhY2tMYWJlbCIsInNvbG9UcmFjayIsIm5leHRTdGFydFdVIiwic3BhbldVIiwiaW5TZWxlY3RlZFNlY3Rpb24iLCJsb2NhbFBlcmNlbnQiLCJsb2NhbFBvc2l0aW9uIiwiZXh0ZW5kZWRMb2NhbFBvc2l0aW9uIiwiZXh0ZW5kZWRMb2NhbFdpZHRoIiwidGV4dFBvc2l0aW9uIiwic2VsZWN0QXQiLCJpc1NlbGVjdGVkIiwicmVzaXplRXh0ZW50IiwicmVzb2x2ZWRFeHRlbnRXVSIsIlN0cmluZyIsInBhZFN0YXJ0IiwiZnJvbUtleSIsInRpbWluZ0JvdW5kcyIsImtleVNlbGVjdGlvbiIsInVuZGVmaW5lZCIsInNoYXBlSWQiLCJpc1ByaW1hcnkiLCJtb3Rpb25JbnRlcnZhbCIsImdsb2JhbHMiLCJ0ZXh0TW90aW9uIiwibW90aW9uU3BhbiIsImN1ZVN0eWxlIiwiZm9jdXNQb3NpdGlvbiIsImN1ZVNlbGVjdGlvbiIsImNvZGUiLCJkdXJhdGlvbiIsImNlbnRyZSIsInJldmVhbFNlbGVjdGlvbiIsImFjdGl2YXRpb24iLCJTZXF1ZW5jZUluc3BlY3RvciIsImNvbW1pdEdsb2JhbCIsImdyb3VwIiwidGFyZ2V0S2V5IiwiY29udHJvbHMiLCJfYzYiLCJTZWN0aW9uSW5zcGVjdG9yIiwiY29tcGlsZWRTZWN0aW9uIiwiYWN0aXZlRXh0ZW50RmllbGQiLCJhY3RpdmVFeHRlbnQiLCJyZXNvbHZlZEV4dGVudCIsImNvbnRlbnRNaW5pbXVtQWN0aXZlIiwidXBkYXRlIiwibXV0YXRlIiwidG9JbmRleCIsImR1cGxpY2F0ZSIsInJlc3VsdCIsIm1vYmlsZUV4dGVudFdVIiwibG9jYWwiLCJmb2N1cyIsInByZXNldCIsIm1vdGlvbiIsIl9jNyIsIkVkaXRvcmlhbEJsb2NrcyIsInVwZGF0ZUJsb2NrIiwiYmxvY2tJbmRleCIsInVwZGF0ZUVtcGhhc2lzIiwiZW1waGFzaXNJbmRleCIsImVtcGhhc2lzIiwiYWRkRW1waGFzaXMiLCJ0cmltIiwic3BsaXQiLCJqb2luIiwidG9uZSIsInJlbW92ZUVtcGhhc2lzIiwia2luZCIsIndvcmxkSW5mbHVlbmNlIiwiY2hlY2tlZCIsIml0ZW1zIiwiQm9vbGVhbiIsIl9jOCIsIkN1ZVJoeXRobUFuZFJldXNlIiwiY2xpcGJvYXJkIiwic2V0Q2xpcGJvYXJkIiwiX3MyIiwiZ2FwV1UiLCJzZXRHYXBXVSIsImFuY2hvciIsInNldEFuY2hvciIsInByZXZpZXciLCJzZXRQcmV2aWV3Iiwic2V0TWVzc2FnZSIsInByZXZpZXdNb3ZlcyIsInRyeVN0YXRlIiwiY2FuY2VsVHJ5IiwiYmVnaW5UcnkiLCJhcHBseVByZXZpZXciLCJhcHBseVRyeSIsImNvbW1pdENhbmRpZGF0ZSIsImRpc3RyaWJ1dGUiLCJleGFjdEdhcCIsImFsaWduUHJpbWFyeSIsInBsYXloZWFkV1UiLCJjb3B5IiwicGF5bG9hZCIsInZhbGlkYXRpb24iLCJwYXN0ZSIsImRlc3RpbmF0aW9uU2VjdGlvbklkIiwiZ2hvc3RNb3ZlcyIsIkN1ZUluc3BlY3RvciIsInNlbGVjdGVkTWVtYmVycyIsInJlbW92ZSIsIm1vdmVDdWUiLCJwZXJjZW50IiwidXBkYXRlTW92ZW1lbnQiLCJtZW1iZXJTZWN0aW9uIiwibWVtYmVyQ3VlIiwiX2MwIiwiRGlzY2lwbGluZVJldmVhbEluc3BlY3RvciIsIm9jY3VwaWVkIiwic3RhZ2dlciIsImxhYmVsRHVyYXRpb24iLCJsaW1pdHNGb3IiLCJsaW1pdHMiLCJpdGVtSW5kZXgiLCJiYWNrZ3JvdW5kIiwiX2MxIiwiQ2FtZXJhSW5zcGVjdG9yIiwic2VsZWN0ZWRLZXkiLCJ0YXJnZXRBdCIsImFwcGx5UHJlc2V0IiwicmVjaXBlcyIsIlB1c2giLCJlYXNpbmciLCJHbGlkZSIsIk9yYml0IiwiUmV2ZWFsIiwiUmVzb2x2ZSIsImV4aXN0aW5nS2V5QXRQbGF5aGVhZCIsInNldEtleSIsImluc2VydGlvbkluZGV4Iiwic2VsZWN0ZWRLZXlJbmRleCIsInNhbXBsZWQiLCJiYXNlWiIsInN0YXJ0WiIsImNhZGVuY2UiLCJuZXdLZXkiLCJheGlzIiwibmFtZSIsIkFycmF5IiwiaXNBcnJheSIsInVwZGF0ZVZlY3RvciIsImV4dGVudEZpZWxkIiwiZXh0ZW50TGFiZWwiLCJ1cGRhdGVFeHRlbnQiLCJfYzEwIiwiQ09SUkVTUE9OREVOQ0VfTEFCRUxTIiwiV29ybGRJbnNwZWN0b3IiLCJydW50aW1lTWV0cmljcyIsInNoYXBlIiwidHJhbnNpdGlvbkxpbWl0IiwidHJhbnNpdGlvbk1heCIsInRyYW5zaXRpb25FbmFibGVkIiwiY29ycmVzcG9uZGVuY2VFbmFibGVkIiwiaW5jbHVkZXMiLCJwcmV2aW91c1dvcmxkU2VjdGlvbiIsInNvdXJjZVNoYXBlIiwicHJlcGFyZWQiLCJwcmVwYXJlZFdvcmxkSWRzIiwiY29ycmVzcG9uZGVuY2VTdGF0dXMiLCJjb3JyZXNwb25kZW5jZVNlcXVlbmNlU3RhdGUiLCJjb3JyZXNwb25kZW5jZUZhbGxiYWNrIiwiY29ycmVzcG9uZGVuY2VUb1dvcmxkSWQiLCJ0cnlTaGFwZSIsInNoYXBlUGFyYW1ldGVycyIsImZyb21FbnRyaWVzIiwicGFyYW1ldGVycyIsInZhbHVlcyIsImNvc3QiLCJzZWVkIiwiZmxvb3IiLCJyYW5kb20iLCJlbnRyeURpc3RhbmNlV1UiLCJ0cmFuc2Zvcm0iLCJzY2FsZSIsImNvcnJlc3BvbmRlbmNlIiwiY29ycmVzcG9uZGVuY2VJbXByb3ZlbWVudCIsIm1vZGlmaWVycyIsIm1vZGlmaWVySW5kZXgiLCJkZWZpbml0aW9uIiwibW92ZU1vZGlmaWVyIiwibmV4dEluZGV4IiwiZW5hYmxlZCIsIm9wdGlvbnMiLCJvcHRpb24iLCJfYzExIiwiRGlhZ25vc3RpY3MiLCJkaWFnbm9zdGljcyIsIkRpYWdub3N0aWNJY29uIiwibGV2ZWwiLCJwYXRoIiwiX2MxMiIsIkF1ZGl0aW9uQ29udHJvbHMiLCJfczMiLCJwcmVSb2xsV1UiLCJzZXRQcmVSb2xsV1UiLCJwb3N0Um9sbFdVIiwic2V0UG9zdFJvbGxXVSIsInJhbmdlIiwiYWN0aXZlIiwibG9vcCIsInNvdXJjZVR5cGUiLCJzb3VyY2VJZCIsInRvZ2dsZSIsImVuZFdVIiwiSW5zcGVjdG9yIiwiX3M0IiwiaW5zcGVjdG9yUmVmIiwiZHJhZ1JlZiIsImxhc3RIZWFkZXJDbGlja1JlZiIsInNldFBvc2l0aW9uIiwiZHJhZ2dpbmciLCJzZXREcmFnZ2luZyIsImNvbnRlbnQiLCJrZWVwSW5Cb3VuZHMiLCJhZGRFdmVudExpc3RlbmVyIiwicmVtb3ZlRXZlbnRMaXN0ZW5lciIsImJlZ2luRHJhZyIsImZsb2F0aW5nSGVpZ2h0Iiwib3JpZ2luWCIsIm9yaWdpblkiLCJtb3ZlRHJhZyIsImRlbHRhWCIsImh5cG90IiwiZW5kRHJhZyIsIm5vdyIsInBlcmZvcm1hbmNlIiwicHJldmlvdXMiLCJ0aW1lIiwieCIsInkiLCJyZXNldFBvc2l0aW9uIiwiQ2FtZXJhUGF0aE92ZXJsYXkiLCJ0b3RhbCIsIndvcmxkU3RhdGUiLCJjaGFuZ2VzV29ybGQiLCJhY3RpdmVXb3JsZCIsIl9jMTUiLCJBYm91dE5hcnJhdGl2ZUVkaXRvciIsInJ1bnRpbWVSZWYiLCJyb290UmVmIiwiX3M1Iiwic3Vic2NyaWJlIiwiY2hlY2twb2ludHMiLCJzZXRDaGVja3BvaW50cyIsInNldFJ1bnRpbWVNZXRyaWNzIiwicGF0aFZpc2libGUiLCJzZXRQYXRoVmlzaWJsZSIsImRpcmVjdG9yVmlldyIsInNldERpcmVjdG9yVmlldyIsIm1vYmlsZVBhbmUiLCJzZXRNb2JpbGVQYW5lIiwic2V0VGltZWxpbmVPcGVuIiwibG9jYWxTdG9yYWdlIiwiZ2V0SXRlbSIsImltcG9ydFJlZiIsInNuYXBzaG90UmVmIiwiYWN0aXZlU2VsZWN0aW9uIiwic2V0SXRlbSIsInJvb3QiLCJydW50aW1lIiwic2V0QXR0cmlidXRlIiwidGhlbiIsImhhc2giLCJkaXJ0eSIsInJlcGxhY2VEb2N1bWVudCIsInNldEJhc2VsaW5lIiwicmVjb3ZlcnkiLCJ0aW1lc3RhbXAiLCJEYXRlIiwic2V0UmVjb3ZlcnlTdGF0ZSIsImF2YWlsYWJsZSIsImVycm9yIiwiY2F0Y2giLCJzdGF0dXMiLCJyZW1vdmVBdHRyaWJ1dGUiLCJjbGFzc0xpc3QiLCJDU1MiLCJlc2NhcGUiLCJhZGQiLCJlZGl0b3JTZWxlY3Rpb25UeXBlIiwiaW50ZXJ2YWwiLCJzZXRJbnRlcnZhbCIsImdldE1ldHJpY3MiLCJjbGVhckludGVydmFsIiwidGltZXIiLCJiYXNlbGluZUhhc2giLCJjbGVhclRpbWVvdXQiLCJwYWdlaGlkZSIsImtleWRvd24iLCJjbGljayIsInJlZG8iLCJ1bmRvIiwicHJldmlld1N0YXRlIiwic2F2ZSIsImVkaXRvclVybCIsIlVSTCIsImxvY2F0aW9uIiwiaHJlZiIsInNlYXJjaFBhcmFtcyIsInNldCIsImhpc3RvcnkiLCJyZXBsYWNlU3RhdGUiLCJzdGF0ZSIsInBhdGhuYW1lIiwic2VhcmNoIiwic2VudCIsIm1hcmtTYXZlZCIsImFkZENoZWNrcG9pbnQiLCJjaGVja3BvaW50IiwiY3J5cHRvIiwicmFuZG9tVVVJRCIsInRvTG9jYWxlVGltZVN0cmluZyIsImhvdXIiLCJtaW51dGUiLCJiYXNlU291cmNlSGFzaCIsInN0YXR1c0xhYmVsIiwic2F2ZVN0YXRlIiwiY29tcGlsZWRTZWxlY3RlZCIsInNlbGVjdGVkRXh0ZW50Iiwic2VsZWN0ZWRDdWVDb3VudCIsImxvb3BBY3RpdmUiLCJ0aW1lbGluZURlbGV0aW9uIiwidG9nZ2xlTG9vcCIsInRvZ2dsZVNvbG8iLCJmaXRTZXF1ZW5jZSIsImZpdFNlY3Rpb24iLCJzZWN0aW9uU3BhbiIsInN0YXJ0UmF0aW8iLCJjbGllbnRXaWR0aCIsInRvZ2dsZURpcmVjdG9yIiwidG9nZ2xlQmVmb3JlIiwiY2FuVW5kbyIsInVuZG9MYWJlbCIsImNhblJlZG8iLCJyZWRvTGFiZWwiLCJmaWxlIiwiZmlsZXMiLCJpbXBvcnRlZCIsIkpTT04iLCJwYXJzZSIsInJlY292ZXJ5U3RhdGUiLCJ0b0xvY2FsZVN0cmluZyIsIm51ZGdlRGlyZWN0b3IiLCJ5YXciLCJwaXRjaCIsImRpc3RhbmNlIiwicmVzZXREaXJlY3RvciIsIm9wZW4iLCJhdXRvS2V5Iiwic2V0QXV0b0tleSIsImZyYW1lVGltZU1zIiwiZHJhd0NhbGxzIiwicG9pbnRDb3VudCIsImFjdGl2ZU1vZGlmaWVycyIsImJ1ZmZlclJlYnVpbGRzIiwiZm91bmQiLCJib2R5IiwiX2M1IiwiX2M5IiwiX2MxMyIsIl9jMTQiLCJfYzE2Il0sImlnbm9yZUxpc3QiOltdLCJzb3VyY2VzIjpbIkFib3V0TmFycmF0aXZlRWRpdG9yLmpzeCJdLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgeyB1c2VFZmZlY3QsIHVzZVJlZiwgdXNlU3RhdGUsIHVzZVN5bmNFeHRlcm5hbFN0b3JlIH0gZnJvbSAncmVhY3QnO1xuaW1wb3J0IHsgY3JlYXRlUG9ydGFsIH0gZnJvbSAncmVhY3QtZG9tJztcbmltcG9ydCB7XG4gIENoZWNrLFxuICBDaGV2cm9uRG93bixcbiAgQ2hldnJvbkxlZnQsXG4gIENoZXZyb25SaWdodCxcbiAgQ2hldnJvblVwLFxuICBDaXJjbGVBbGVydCxcbiAgRGlhbW9uZCxcbiAgSW5mbyxcbiAgTG9ja0tleWhvbGUsXG4gIFBhdXNlLFxuICBQbGF5LFxuICBTa2lwQmFjayxcbiAgU2tpcEZvcndhcmQsXG4gIFRyYXNoMixcbn0gZnJvbSAnbHVjaWRlLXJlYWN0JztcbmltcG9ydCB7XG4gIEFCT1VUX05BUlJBVElWRV9HTE9CQUxfQ09OVFJPTFMsXG4gIEFCT1VUX05BUlJBVElWRV9DT1JSRVNQT05ERU5DRV9NT0RFUyxcbiAgQUJPVVRfTkFSUkFUSVZFX0RJU0NJUExJTkVfUkVWRUFMX0NPTlRST0xTLFxuICBBQk9VVF9OQVJSQVRJVkVfRU1QSEFTSVNfVE9ORVMsXG4gIEFCT1VUX05BUlJBVElWRV9NT0RJRklFUl9ERUZJTklUSU9OUyxcbiAgQUJPVVRfTkFSUkFUSVZFX1NIQVBFX0RFRklOSVRJT05TLFxufSBmcm9tICcuL2Fib3V0TmFycmF0aXZlRGVmaW5pdGlvbnMuanMnO1xuaW1wb3J0IHtcbiAgY2xlYXJBYm91dE5hcnJhdGl2ZVJlY292ZXJ5RHJhZnQsXG4gIGV4cG9ydEFib3V0TmFycmF0aXZlRG9jdW1lbnQsXG4gIGxvYWRBYm91dE5hcnJhdGl2ZVNvdXJjZSxcbiAgcmVhZEFib3V0TmFycmF0aXZlQ2hlY2twb2ludHMsXG4gIHJlYWRBYm91dE5hcnJhdGl2ZVJlY292ZXJ5RHJhZnQsXG4gIHNhdmVBYm91dE5hcnJhdGl2ZVNvdXJjZSxcbiAgd3JpdGVBYm91dE5hcnJhdGl2ZUNoZWNrcG9pbnQsXG4gIHdyaXRlQWJvdXROYXJyYXRpdmVSZWNvdmVyeURyYWZ0LFxufSBmcm9tICcuL2Fib3V0TmFycmF0aXZlUGVyc2lzdGVuY2UuanMnO1xuaW1wb3J0IHtcbiAgYXNzZXJ0VmFsaWRBYm91dE5hcnJhdGl2ZURvY3VtZW50LFxuICBjbG9uZUFib3V0TmFycmF0aXZlRG9jdW1lbnQsXG59IGZyb20gJy4vYWJvdXROYXJyYXRpdmVTY2hlbWEuanMnO1xuaW1wb3J0IHtcbiAgZ2V0QWJvdXROYXJyYXRpdmVDdWVNb3ZlbWVudCxcbiAgZ2V0QWJvdXROYXJyYXRpdmVDdWVNb3Rpb25JbnRlcnZhbCxcbiAgZ2V0QWJvdXROYXJyYXRpdmVXb3JsZFRyYW5zaXRpb25MaW1pdCxcbiAgc2FtcGxlQWJvdXROYXJyYXRpdmVQbGFuLFxufSBmcm9tICcuL2Fib3V0TmFycmF0aXZlQ29tcGlsZXIuanMnO1xuaW1wb3J0IHtcbiAgY2FwdHVyZUFib3V0TmFycmF0aXZlUGxheWhlYWRDb250ZXh0LFxuICBjcmVhdGVBYm91dE5hcnJhdGl2ZUN1ZUNsaXBib2FyZFBheWxvYWQsXG4gIGRlcml2ZUFib3V0TmFycmF0aXZlTG9vcFJhbmdlLFxuICBkdXBsaWNhdGVBYm91dE5hcnJhdGl2ZUN1ZUdyb3VwLFxuICBkdXBsaWNhdGVBYm91dE5hcnJhdGl2ZVNlY3Rpb24sXG4gIGdldEFib3V0TmFycmF0aXZlQ2FtZXJhS2V5VGltaW5nQm91bmRzLFxuICBnZXRBYm91dE5hcnJhdGl2ZUN1ZVRpbWluZ0JvdW5kcyxcbiAgZ2V0QWJvdXROYXJyYXRpdmVFeHRlbnRGaWVsZCxcbiAgZ2V0QWJvdXROYXJyYXRpdmVTZWxlY3Rpb25NZW1iZXJzLFxuICBtb3ZlQWJvdXROYXJyYXRpdmVDdWVUaW1pbmcsXG4gIHJlbWFwQWJvdXROYXJyYXRpdmVQbGF5aGVhZENvbnRleHQsXG4gIHJlc29sdmVBYm91dE5hcnJhdGl2ZUNhbWVyYUtleURyb3AsXG4gIHJlc29sdmVBYm91dE5hcnJhdGl2ZUN1ZURpc3RyaWJ1dGlvbixcbiAgcmVzb2x2ZUFib3V0TmFycmF0aXZlQ3VlRXhhY3RHYXAsXG4gIHJlc29sdmVBYm91dE5hcnJhdGl2ZUN1ZUdyb3VwTW92ZSxcbiAgcmVzb2x2ZUFib3V0TmFycmF0aXZlQ3VlR3JvdXBBbGlnbixcbiAgcmVzb2x2ZUFib3V0TmFycmF0aXZlQ3VlR3JvdXBQYXN0ZSxcbiAgc25hcEFib3V0TmFycmF0aXZlVGltZWxpbmVWYWx1ZSxcbiAgc3RpdGNoQWJvdXROYXJyYXRpdmVDYW1lcmFCb3VuZGFyaWVzLFxuICB0b2dnbGVBYm91dE5hcnJhdGl2ZUN1ZVNlbGVjdGlvbixcbiAgdmFsaWRhdGVBYm91dE5hcnJhdGl2ZUN1ZUNsaXBib2FyZFBheWxvYWQsXG59IGZyb20gJy4vYWJvdXROYXJyYXRpdmVUaW1lbGluZS5qcyc7XG5pbXBvcnQgJy4vYWJvdXQtbmFycmF0aXZlLWVkaXRvci5jc3MnO1xuXG5jb25zdCBjbGFtcDAxID0gKHZhbHVlKSA9PiBNYXRoLm1pbigxLCBNYXRoLm1heCgwLCB2YWx1ZSkpO1xuY29uc3QgQUJPVVRfRURJVE9SX1RJTUVMSU5FX1NUT1JBR0VfS0VZID0gJ2FiczphYm91dC1uYXJyYXRpdmU6dGltZWxpbmUtb3Blbjp2MSc7XG5jb25zdCBUSU1FTElORV9LRVlfRVBTSUxPTiA9IDAuMDA0O1xuY29uc3QgSU5TUEVDVE9SX0VER0VfR0FQID0gODtcbmNvbnN0IENBTUVSQV9QT1NFX0ZJRUxEUyA9IG5ldyBTZXQoWydvZmZzZXQnLCAnbG9va0F0T2Zmc2V0JywgJ2ZvdicsICdyb2xsJ10pO1xuY29uc3QgRElTQ0lQTElORV9SRVZFQUxfTUFYID0gQUJPVVRfTkFSUkFUSVZFX0RJU0NJUExJTkVfUkVWRUFMX0NPTlRST0xTXG4gIC5maW5kKChjb250cm9sKSA9PiBjb250cm9sLmlkID09PSAnZW5kJyk/Lm1heCB8fCA0O1xuY29uc3QgRElTQ0lQTElORV9CQUxMX1RPS0VOX0JZX0dST1VQID0gT2JqZWN0LmZyZWV6ZSh7XG4gIDE6ICctLWJhbGwtMScsXG4gIDI6ICctLWJhbGwtNCcsXG4gIDM6ICctLWJhbGwtMycsXG4gIDQ6ICctLWJhbGwtNycsXG4gIDU6ICctLWJhbGwtOCcsXG4gIDY6ICctLWJhbGwtNicsXG59KTtcbmNvbnN0IFRJTUVMSU5FX0dMT0JBTF9UUkFDS1MgPSBPYmplY3QuZnJlZXplKFtcbiAgT2JqZWN0LmZyZWV6ZSh7IGxhbmU6ICdzZWN0aW9uJywgbGFiZWw6ICdTZWN0aW9ucycsIGdyb3VwSWRzOiBPYmplY3QuZnJlZXplKFsnc2VxdWVuY2UnXSkgfSksXG4gIE9iamVjdC5mcmVlemUoeyBsYW5lOiAnY2FtZXJhJywgbGFiZWw6ICdDYW1lcmEnLCBncm91cElkczogT2JqZWN0LmZyZWV6ZShbJ2NhbWVyYSddKSB9KSxcbiAgT2JqZWN0LmZyZWV6ZSh7IGxhbmU6ICd3b3JsZCcsIGxhYmVsOiAnV29ybGQnLCBncm91cElkczogT2JqZWN0LmZyZWV6ZShbJ21hdGVyaWFsJywgJ3N3YXJtVHVyYnVsZW5jZSddKSB9KSxcbiAgT2JqZWN0LmZyZWV6ZSh7IGxhbmU6ICd0ZXh0JywgbGFiZWw6ICdUZXh0JywgZ3JvdXBJZHM6IE9iamVjdC5mcmVlemUoWyd0ZXh0TW90aW9uJ10pIH0pLFxuICBPYmplY3QuZnJlZXplKHsgbGFuZTogJ2ludGVyYWN0aW9uJywgbGFiZWw6ICdJbnRlcmFjdGlvbicsIGdyb3VwSWRzOiBPYmplY3QuZnJlZXplKFtdKSB9KSxcbl0pO1xuXG5mdW5jdGlvbiBjYW1lcmFQb3NlQ2hhbmdlcyhmcm9tLCB0bykge1xuICBpZiAoIWZyb20gfHwgIXRvKSByZXR1cm4gZmFsc2U7XG4gIHJldHVybiBbJ29mZnNldCcsICdsb29rQXRPZmZzZXQnXS5zb21lKChmaWVsZCkgPT4gKFxuICAgIGZyb21bZmllbGRdLnNvbWUoKHZhbHVlLCBpbmRleCkgPT4gTWF0aC5hYnModmFsdWUgLSB0b1tmaWVsZF1baW5kZXhdKSA+IDAuMDAwMSlcbiAgKSkgfHwgTWF0aC5hYnMoZnJvbS5mb3YgLSB0by5mb3YpID4gMC4wMDAxIHx8IE1hdGguYWJzKGZyb20ucm9sbCAtIHRvLnJvbGwpID4gMC4wMDAxO1xufVxuXG5mdW5jdGlvbiBjb3B5Q2FtZXJhUG9zZSh0YXJnZXQsIHNvdXJjZSkge1xuICB0YXJnZXQub2Zmc2V0ID0gWy4uLnNvdXJjZS5vZmZzZXRdO1xuICB0YXJnZXQubG9va0F0T2Zmc2V0ID0gWy4uLnNvdXJjZS5sb29rQXRPZmZzZXRdO1xuICB0YXJnZXQuZm92ID0gc291cmNlLmZvdjtcbiAgdGFyZ2V0LnJvbGwgPSBzb3VyY2Uucm9sbDtcbn1cblxuZnVuY3Rpb24gbGlua0NhbWVyYUJvdW5kYXJ5KGRvY3VtZW50LCBzZWN0aW9uSW5kZXgsIGtleUluZGV4KSB7XG4gIGNvbnN0IHNlY3Rpb24gPSBkb2N1bWVudC5zZWN0aW9uc1tzZWN0aW9uSW5kZXhdO1xuICBjb25zdCBrZXkgPSBzZWN0aW9uPy5jYW1lcmEua2V5c1trZXlJbmRleF07XG4gIGlmICgha2V5KSByZXR1cm47XG4gIGlmIChrZXlJbmRleCA9PT0gMCAmJiBzZWN0aW9uSW5kZXggPiAwKSB7XG4gICAgY29weUNhbWVyYVBvc2UoZG9jdW1lbnQuc2VjdGlvbnNbc2VjdGlvbkluZGV4IC0gMV0uY2FtZXJhLmtleXMuYXQoLTEpLCBrZXkpO1xuICB9XG4gIGlmIChrZXlJbmRleCA9PT0gc2VjdGlvbi5jYW1lcmEua2V5cy5sZW5ndGggLSAxICYmIHNlY3Rpb25JbmRleCA8IGRvY3VtZW50LnNlY3Rpb25zLmxlbmd0aCAtIDEpIHtcbiAgICBjb3B5Q2FtZXJhUG9zZShkb2N1bWVudC5zZWN0aW9uc1tzZWN0aW9uSW5kZXggKyAxXS5jYW1lcmEua2V5c1swXSwga2V5KTtcbiAgfVxufVxuXG5mdW5jdGlvbiBicmlkZ2VDYW1lcmFTZWN0aW9uKGRvY3VtZW50LCBzZWN0aW9uSW5kZXgpIHtcbiAgY29uc3Qgc2VjdGlvbiA9IGRvY3VtZW50LnNlY3Rpb25zW3NlY3Rpb25JbmRleF07XG4gIGlmICghc2VjdGlvbj8uY2FtZXJhLmtleXMubGVuZ3RoKSByZXR1cm47XG4gIGlmIChzZWN0aW9uSW5kZXggPiAwKSBjb3B5Q2FtZXJhUG9zZShzZWN0aW9uLmNhbWVyYS5rZXlzWzBdLCBkb2N1bWVudC5zZWN0aW9uc1tzZWN0aW9uSW5kZXggLSAxXS5jYW1lcmEua2V5cy5hdCgtMSkpO1xuICBpZiAoc2VjdGlvbkluZGV4IDwgZG9jdW1lbnQuc2VjdGlvbnMubGVuZ3RoIC0gMSkgY29weUNhbWVyYVBvc2Uoc2VjdGlvbi5jYW1lcmEua2V5cy5hdCgtMSksIGRvY3VtZW50LnNlY3Rpb25zW3NlY3Rpb25JbmRleCArIDFdLmNhbWVyYS5rZXlzWzBdKTtcbn1cblxuZnVuY3Rpb24gZ2V0SW5zcGVjdG9yVmVydGljYWxCb3VuZHMoaW5zcGVjdG9yLCB0aW1lbGluZU9wZW4pIHtcbiAgY29uc3QgZWRpdG9yID0gaW5zcGVjdG9yLmNsb3Nlc3QoJy5hYm91dC1lZGl0b3InKTtcbiAgY29uc3Qgc3R5bGVzID0gZWRpdG9yID8gZ2V0Q29tcHV0ZWRTdHlsZShlZGl0b3IpIDogbnVsbDtcbiAgY29uc3QgdG9wYmFySGVpZ2h0ID0gTnVtYmVyLnBhcnNlRmxvYXQoc3R5bGVzPy5nZXRQcm9wZXJ0eVZhbHVlKCctLWFib3V0LWVkaXRvci10b3BiYXInKSkgfHwgNDQ7XG4gIGNvbnN0IHRpbWVsaW5lSGVpZ2h0ID0gdGltZWxpbmVPcGVuXG4gICAgPyBOdW1iZXIucGFyc2VGbG9hdChzdHlsZXM/LmdldFByb3BlcnR5VmFsdWUoJy0tYWJvdXQtZWRpdG9yLXRpbWVsaW5lJykpIHx8IDE4OFxuICAgIDogMDtcbiAgY29uc3QgYnV0dG9uQmFyVG9wID0gZG9jdW1lbnQucXVlcnlTZWxlY3RvcignW2RhdGEtYnV0dG9uLWJhcl0nKT8uZ2V0Qm91bmRpbmdDbGllbnRSZWN0KCkudG9wXG4gICAgPz8gd2luZG93LmlubmVySGVpZ2h0O1xuICByZXR1cm4ge1xuICAgIG1pblRvcDogdG9wYmFySGVpZ2h0ICsgSU5TUEVDVE9SX0VER0VfR0FQLFxuICAgIG1heEJvdHRvbTogKHRpbWVsaW5lT3BlbiA/IHdpbmRvdy5pbm5lckhlaWdodCAtIHRpbWVsaW5lSGVpZ2h0IDogYnV0dG9uQmFyVG9wKSAtIElOU1BFQ1RPUl9FREdFX0dBUCxcbiAgfTtcbn1cblxuZnVuY3Rpb24gY2xhbXBJbnNwZWN0b3JQb3NpdGlvbihpbnNwZWN0b3IsIHBvc2l0aW9uLCB0aW1lbGluZU9wZW4pIHtcbiAgY29uc3QgeyBtaW5Ub3AsIG1heEJvdHRvbSB9ID0gZ2V0SW5zcGVjdG9yVmVydGljYWxCb3VuZHMoaW5zcGVjdG9yLCB0aW1lbGluZU9wZW4pO1xuICBjb25zdCBtYXhXaWR0aCA9IE1hdGgubWF4KDI0MCwgd2luZG93LmlubmVyV2lkdGggLSAoSU5TUEVDVE9SX0VER0VfR0FQICogMikpO1xuICBjb25zdCB3aWR0aCA9IE1hdGgubWluKHBvc2l0aW9uLndpZHRoLCBtYXhXaWR0aCk7XG4gIGNvbnN0IGF2YWlsYWJsZUhlaWdodCA9IE1hdGgubWF4KDI0MCwgbWF4Qm90dG9tIC0gbWluVG9wKTtcbiAgY29uc3QgaGVpZ2h0ID0gTWF0aC5taW4ocG9zaXRpb24uaGVpZ2h0LCBhdmFpbGFibGVIZWlnaHQpO1xuICBjb25zdCBtYXhMZWZ0ID0gTWF0aC5tYXgoSU5TUEVDVE9SX0VER0VfR0FQLCB3aW5kb3cuaW5uZXJXaWR0aCAtIHdpZHRoIC0gSU5TUEVDVE9SX0VER0VfR0FQKTtcbiAgY29uc3QgbWF4VG9wID0gTWF0aC5tYXgobWluVG9wLCBtYXhCb3R0b20gLSBoZWlnaHQpO1xuICByZXR1cm4ge1xuICAgIGxlZnQ6IE1hdGgubWluKG1heExlZnQsIE1hdGgubWF4KElOU1BFQ1RPUl9FREdFX0dBUCwgcG9zaXRpb24ubGVmdCkpLFxuICAgIHRvcDogTWF0aC5taW4obWF4VG9wLCBNYXRoLm1heChtaW5Ub3AsIHBvc2l0aW9uLnRvcCkpLFxuICAgIHdpZHRoLFxuICAgIGhlaWdodCxcbiAgfTtcbn1cblxuZnVuY3Rpb24gZ2V0U2VjdGlvbkluZGV4KGRvY3VtZW50LCBzZWN0aW9uSWQpIHtcbiAgcmV0dXJuIGRvY3VtZW50LnNlY3Rpb25zLmZpbmRJbmRleCgoc2VjdGlvbikgPT4gc2VjdGlvbi5pZCA9PT0gc2VjdGlvbklkKTtcbn1cblxuZnVuY3Rpb24gZ2V0U2VjdGlvbihkb2N1bWVudCwgc2VsZWN0aW9uKSB7XG4gIGNvbnN0IHNlY3Rpb25JZCA9IHNlbGVjdGlvbi5zZWN0aW9uSWQgfHwgZG9jdW1lbnQuc2VjdGlvbnNbMF0/LmlkO1xuICByZXR1cm4gZG9jdW1lbnQuc2VjdGlvbnMuZmluZCgoc2VjdGlvbikgPT4gc2VjdGlvbi5pZCA9PT0gc2VjdGlvbklkKSB8fCBkb2N1bWVudC5zZWN0aW9uc1swXTtcbn1cblxuZnVuY3Rpb24gZ2V0TG9jYWxQcm9ncmVzcyhwbGFuLCBzZWN0aW9uLCBzdG9yeVdVKSB7XG4gIGNvbnN0IGNvbXBpbGVkID0gcGxhbj8uc2VjdGlvbnM/LmZpbmQoKGl0ZW0pID0+IGl0ZW0uaWQgPT09IHNlY3Rpb24uaWQpO1xuICByZXR1cm4gY29tcGlsZWQgPyBjbGFtcDAxKChzdG9yeVdVIC0gY29tcGlsZWQuc3RhcnRXVSkgLyBjb21waWxlZC50cmF2ZWxXVSkgOiAwO1xufVxuXG5mdW5jdGlvbiBmb3JtYXRXVSh2YWx1ZSkge1xuICByZXR1cm4gYCR7TnVtYmVyKHZhbHVlIHx8IDApLnRvRml4ZWQoMil9IFdVYDtcbn1cblxuZnVuY3Rpb24gZm9ybWF0Q2FtZXJhUGVyY2VudCh2YWx1ZSkge1xuICByZXR1cm4gYCR7TnVtYmVyKChOdW1iZXIodmFsdWUpICogMTAwKS50b0ZpeGVkKDEpKX0lYDtcbn1cblxuZnVuY3Rpb24gaXNUZXh0RWRpdGluZ1RhcmdldCh0YXJnZXQpIHtcbiAgcmV0dXJuIHRhcmdldCBpbnN0YW5jZW9mIEhUTUxFbGVtZW50XG4gICAgJiYgKHRhcmdldC5tYXRjaGVzKCdpbnB1dCwgdGV4dGFyZWEsIHNlbGVjdCcpIHx8IHRhcmdldC5pc0NvbnRlbnRFZGl0YWJsZSk7XG59XG5cbmZ1bmN0aW9uIGdldFRpbWVsaW5lS2V5ZnJhbWVzKHNuYXBzaG90KSB7XG4gIGNvbnN0IHBsYW4gPSBzbmFwc2hvdC5jb21waWxlZFBsYW47XG4gIGlmICghcGxhbj8uc2VjdGlvbnM/Lmxlbmd0aCkgcmV0dXJuIFtdO1xuICBjb25zdCBldmVudHMgPSBbXTtcbiAgcGxhbi5zZWN0aW9ucy5mb3JFYWNoKChjb21waWxlZCwgc2VjdGlvbkluZGV4KSA9PiB7XG4gICAgY29uc3Qgc2VjdGlvbiA9IHNuYXBzaG90LmRvY3VtZW50LnNlY3Rpb25zW3NlY3Rpb25JbmRleF07XG4gICAgY29uc3QgdG9TdG9yeVdVID0gKGF0KSA9PiBjb21waWxlZC5zdGFydFdVICsgKE51bWJlcihhdCB8fCAwKSAqIGNvbXBpbGVkLnRyYXZlbFdVKTtcbiAgICBzZWN0aW9uLmNhbWVyYS5rZXlzLmZvckVhY2goKGtleSwga2V5SW5kZXgpID0+IHtcbiAgICAgIGlmIChrZXkuYXQgPT09IDAgfHwga2V5LmF0ID09PSAxKSByZXR1cm47XG4gICAgICBldmVudHMucHVzaCh7XG4gICAgICAgIHN0b3J5V1U6IHRvU3RvcnlXVShrZXkuYXQpLFxuICAgICAgICBwcmlvcml0eTogMCxcbiAgICAgICAgc2VsZWN0aW9uOiB7IHR5cGU6ICdjYW1lcmEta2V5Jywgc2VjdGlvbklkOiBzZWN0aW9uLmlkLCBrZXlJbmRleCB9LFxuICAgICAgfSk7XG4gICAgfSk7XG4gICAgaWYgKHNlY3Rpb24ud29ybGQubW9kZSA9PT0gJ3NldCcgJiYgc2VjdGlvbi53b3JsZC50cmFuc2l0aW9uSW4udHlwZSAhPT0gJ2N1dCcpIHtcbiAgICAgIFsnc3RhcnQnLCAnZW5kJ10uZm9yRWFjaCgocGFydCwgcGFydEluZGV4KSA9PiBldmVudHMucHVzaCh7XG4gICAgICAgIHN0b3J5V1U6IHRvU3RvcnlXVShzZWN0aW9uLndvcmxkLnRyYW5zaXRpb25JbltwYXJ0XSksXG4gICAgICAgIHByaW9yaXR5OiAxMCArIHBhcnRJbmRleCxcbiAgICAgICAgc2VsZWN0aW9uOiB7IHR5cGU6ICd3b3JsZCcsIHNlY3Rpb25JZDogc2VjdGlvbi5pZCwga2V5UGFydDogYHRyYW5zaXRpb24tJHtwYXJ0fWAgfSxcbiAgICAgIH0pKTtcbiAgICB9XG4gICAgKHNlY3Rpb24udGV4dC5jdWVzIHx8IFtdKS5mb3JFYWNoKChjdWUsIGN1ZUluZGV4KSA9PiB7XG4gICAgICBldmVudHMucHVzaCh7XG4gICAgICAgIHN0b3J5V1U6IHRvU3RvcnlXVShjdWUuaG9sZCksXG4gICAgICAgIHByaW9yaXR5OiAyMCArIGN1ZUluZGV4LFxuICAgICAgICBzZWxlY3Rpb246IHsgdHlwZTogJ2N1ZScsIHNlY3Rpb25JZDogc2VjdGlvbi5pZCwgY3VlSWQ6IGN1ZS5pZCwga2V5UGFydDogJ2ZvY3VzJyB9LFxuICAgICAgfSk7XG4gICAgfSk7XG4gICAgaWYgKHNlY3Rpb24udGV4dC5kaXNjaXBsaW5lUmV2ZWFsKSB7XG4gICAgICBldmVudHMucHVzaCh7XG4gICAgICAgIHN0b3J5V1U6IHRvU3RvcnlXVShzZWN0aW9uLnRleHQuZGlzY2lwbGluZVJldmVhbC5zdGFydCksXG4gICAgICAgIHByaW9yaXR5OiAyOCxcbiAgICAgICAgc2VsZWN0aW9uOiB7IHR5cGU6ICdkaXNjaXBsaW5lLXJldmVhbCcsIHNlY3Rpb25JZDogc2VjdGlvbi5pZCB9LFxuICAgICAgfSk7XG4gICAgfVxuICAgIGlmIChzZWN0aW9uLmludGVyYWN0aW9uPy50eXBlICE9PSAnbm9uZScgJiYgTnVtYmVyLmlzRmluaXRlKHNlY3Rpb24uaW50ZXJhY3Rpb24uYWN0aXZhdGlvblN0YXJ0KSkge1xuICAgICAgZXZlbnRzLnB1c2goe1xuICAgICAgICBzdG9yeVdVOiB0b1N0b3J5V1Uoc2VjdGlvbi5pbnRlcmFjdGlvbi5hY3RpdmF0aW9uU3RhcnQpLFxuICAgICAgICBwcmlvcml0eTogMzAsXG4gICAgICAgIHNlbGVjdGlvbjogeyB0eXBlOiAnaW50ZXJhY3Rpb24nLCBzZWN0aW9uSWQ6IHNlY3Rpb24uaWQsIGtleVBhcnQ6ICdhY3RpdmF0aW9uJyB9LFxuICAgICAgfSk7XG4gICAgfVxuICB9KTtcbiAgcmV0dXJuIGV2ZW50cy5zb3J0KChhLCBiKSA9PiAoYS5zdG9yeVdVIC0gYi5zdG9yeVdVKSB8fCAoYS5wcmlvcml0eSAtIGIucHJpb3JpdHkpKTtcbn1cblxuZnVuY3Rpb24gZ2V0VGltZWxpbmVEZWxldGlvbihzbmFwc2hvdCkge1xuICBjb25zdCB7IHNlbGVjdGlvbiwgZG9jdW1lbnQgfSA9IHNuYXBzaG90O1xuICBjb25zdCBzZWN0aW9uSW5kZXggPSBnZXRTZWN0aW9uSW5kZXgoZG9jdW1lbnQsIHNlbGVjdGlvbi5zZWN0aW9uSWQpO1xuICBjb25zdCBzZWN0aW9uID0gZG9jdW1lbnQuc2VjdGlvbnNbc2VjdGlvbkluZGV4XTtcbiAgaWYgKCFzZWN0aW9uKSByZXR1cm4gbnVsbDtcbiAgaWYgKHNlbGVjdGlvbi50eXBlID09PSAnY2FtZXJhLWtleScpIHtcbiAgICBjb25zdCBrZXkgPSBzZWN0aW9uLmNhbWVyYS5rZXlzW3NlbGVjdGlvbi5rZXlJbmRleF07XG4gICAgaWYgKCFrZXkpIHJldHVybiBudWxsO1xuICAgIGNvbnN0IHJlcXVpcmVkID0ga2V5LmF0ID09PSAwIHx8IGtleS5hdCA9PT0gMTtcbiAgICByZXR1cm4ge1xuICAgICAgbGFiZWw6IHJlcXVpcmVkID8gJ1JlcXVpcmVkIGNhbWVyYSBrZXknIDogJ0RlbGV0ZSBjYW1lcmEga2V5JyxcbiAgICAgIGRpc2FibGVkOiByZXF1aXJlZCxcbiAgICAgIG1lc3NhZ2U6IHJlcXVpcmVkID8gJ1RoZSBzdGFydCBhbmQgZW5kIENhbWVyYSBrZXlzIHByZXNlcnZlIFNlY3Rpb24gY29udGludWl0eSBhbmQgY2Fubm90IGJlIHJlbW92ZWQuJyA6ICcnLFxuICAgICAgZXhlY3V0ZTogKHN0b3JlKSA9PiBzdG9yZS5jb21taXQoJ0RlbGV0ZSBjYW1lcmEga2V5JywgKGRyYWZ0KSA9PiB7XG4gICAgICAgIGRyYWZ0LnNlY3Rpb25zW3NlY3Rpb25JbmRleF0uY2FtZXJhLmtleXMuc3BsaWNlKHNlbGVjdGlvbi5rZXlJbmRleCwgMSk7XG4gICAgICB9LCB7IHNlbGVjdGlvbjogeyB0eXBlOiAnc2VjdGlvbicsIHNlY3Rpb25JZDogc2VjdGlvbi5pZCB9IH0pLFxuICAgIH07XG4gIH1cbiAgaWYgKHNlbGVjdGlvbi50eXBlID09PSAnd29ybGQnICYmIHNlbGVjdGlvbi5rZXlQYXJ0Py5zdGFydHNXaXRoKCd0cmFuc2l0aW9uLScpKSB7XG4gICAgcmV0dXJuIHtcbiAgICAgIGxhYmVsOiAnUmVtb3ZlIHRyYW5zaXRpb24nLFxuICAgICAgZGlzYWJsZWQ6IGZhbHNlLFxuICAgICAgbWVzc2FnZTogJycsXG4gICAgICBleGVjdXRlOiAoc3RvcmUpID0+IHN0b3JlLmNvbW1pdCgnUmVtb3ZlIFdvcmxkIHRyYW5zaXRpb24nLCAoZHJhZnQpID0+IHtcbiAgICAgICAgY29uc3QgdHJhbnNpdGlvbiA9IGRyYWZ0LnNlY3Rpb25zW3NlY3Rpb25JbmRleF0ud29ybGQudHJhbnNpdGlvbkluO1xuICAgICAgICB0cmFuc2l0aW9uLnN0YXJ0ID0gMDtcbiAgICAgICAgdHJhbnNpdGlvbi5lbmQgPSAwO1xuICAgICAgICB0cmFuc2l0aW9uLnR5cGUgPSAnY3V0JztcbiAgICAgIH0sIHsgc2VsZWN0aW9uOiB7IHR5cGU6ICd3b3JsZCcsIHNlY3Rpb25JZDogc2VjdGlvbi5pZCB9IH0pLFxuICAgIH07XG4gIH1cbiAgaWYgKHNlbGVjdGlvbi50eXBlID09PSAnaW50ZXJhY3Rpb24nICYmIHNlbGVjdGlvbi5rZXlQYXJ0ID09PSAnYWN0aXZhdGlvbicpIHtcbiAgICByZXR1cm4ge1xuICAgICAgbGFiZWw6ICdSZW1vdmUgaW50ZXJhY3Rpb24ga2V5JyxcbiAgICAgIGRpc2FibGVkOiBmYWxzZSxcbiAgICAgIG1lc3NhZ2U6ICcnLFxuICAgICAgZXhlY3V0ZTogKHN0b3JlKSA9PiBzdG9yZS5jb21taXQoJ1JlbW92ZSBpbnRlcmFjdGlvbiBrZXknLCAoZHJhZnQpID0+IHtcbiAgICAgICAgZHJhZnQuc2VjdGlvbnNbc2VjdGlvbkluZGV4XS5pbnRlcmFjdGlvbiA9IHsgdHlwZTogJ25vbmUnIH07XG4gICAgICB9LCB7IHNlbGVjdGlvbjogeyB0eXBlOiAnc2VjdGlvbicsIHNlY3Rpb25JZDogc2VjdGlvbi5pZCB9IH0pLFxuICAgIH07XG4gIH1cbiAgcmV0dXJuIG51bGw7XG59XG5cbmZ1bmN0aW9uIGRlbGV0ZVRpbWVsaW5lU2VsZWN0aW9uKHN0b3JlLCBzbmFwc2hvdCkge1xuICBjb25zdCBkZWxldGlvbiA9IGdldFRpbWVsaW5lRGVsZXRpb24oc25hcHNob3QpO1xuICBpZiAoIWRlbGV0aW9uKSByZXR1cm4gZmFsc2U7XG4gIGlmIChkZWxldGlvbi5kaXNhYmxlZCkge1xuICAgIHN0b3JlLnNldFNhdmVTdGF0ZSh7IG1lc3NhZ2U6IGRlbGV0aW9uLm1lc3NhZ2UgfSk7XG4gICAgcmV0dXJuIHRydWU7XG4gIH1cbiAgZGVsZXRpb24uZXhlY3V0ZShzdG9yZSk7XG4gIHJldHVybiB0cnVlO1xufVxuXG5mdW5jdGlvbiBzZWVrVGltZWxpbmVLZXlmcmFtZShzdG9yZSwgZXZlbnQpIHtcbiAgaWYgKCFldmVudCkgcmV0dXJuO1xuICBzdG9yZS5zZXRTZWxlY3Rpb24oZXZlbnQuc2VsZWN0aW9uKTtcbiAgc3RvcmUuc2V0VHJhbnNwb3J0KHsgb3duZXI6ICd0aW1lbGluZScsIHBsYXlpbmc6IGZhbHNlLCBzdG9yeVdVOiBldmVudC5zdG9yeVdVIH0pO1xufVxuXG5mdW5jdGlvbiBqdW1wVGltZWxpbmVLZXlmcmFtZShzdG9yZSwgc25hcHNob3QsIGRpcmVjdGlvbikge1xuICBjb25zdCBldmVudHMgPSBnZXRUaW1lbGluZUtleWZyYW1lcyhzbmFwc2hvdCk7XG4gIGNvbnN0IGN1cnJlbnRXVSA9IHNuYXBzaG90LnRyYW5zcG9ydC5zdG9yeVdVO1xuICBjb25zdCB0YXJnZXRQb3NpdGlvbiA9IGRpcmVjdGlvbiA+IDBcbiAgICA/IGV2ZW50cy5maW5kKChldmVudCkgPT4gZXZlbnQuc3RvcnlXVSA+IGN1cnJlbnRXVSArIFRJTUVMSU5FX0tFWV9FUFNJTE9OKT8uc3RvcnlXVVxuICAgIDogWy4uLmV2ZW50c10ucmV2ZXJzZSgpLmZpbmQoKGV2ZW50KSA9PiBldmVudC5zdG9yeVdVIDwgY3VycmVudFdVIC0gVElNRUxJTkVfS0VZX0VQU0lMT04pPy5zdG9yeVdVO1xuICBjb25zdCBldmVudCA9IE51bWJlci5pc0Zpbml0ZSh0YXJnZXRQb3NpdGlvbilcbiAgICA/IGV2ZW50cy5maW5kKChpdGVtKSA9PiBNYXRoLmFicyhpdGVtLnN0b3J5V1UgLSB0YXJnZXRQb3NpdGlvbikgPCBUSU1FTElORV9LRVlfRVBTSUxPTilcbiAgICA6IG51bGw7XG4gIHNlZWtUaW1lbGluZUtleWZyYW1lKHN0b3JlLCBldmVudCk7XG59XG5cbmZ1bmN0aW9uIG1ha2VTbHVnKHZhbHVlKSB7XG4gIHJldHVybiB2YWx1ZS50b0xvd2VyQ2FzZSgpLnJlcGxhY2UoL1teYS16MC05XSsvZywgJy0nKS5yZXBsYWNlKC9eLXwtJC9nLCAnJykgfHwgJ2l0ZW0nO1xufVxuXG5mdW5jdGlvbiBuZXh0SWQoZG9jdW1lbnQsIGJhc2UpIHtcbiAgY29uc3QgdXNlZCA9IG5ldyBTZXQoZG9jdW1lbnQuc2VjdGlvbnMuZmxhdE1hcCgoc2VjdGlvbikgPT4gW1xuICAgIHNlY3Rpb24uaWQsXG4gICAgLi4uKHNlY3Rpb24udGV4dC5jdWVzIHx8IFtdKS5tYXAoKGN1ZSkgPT4gY3VlLmlkKSxcbiAgICAuLi4oc2VjdGlvbi50ZXh0LmJsb2NrcyB8fCBbXSkubWFwKChibG9jaykgPT4gYmxvY2suaWQpLFxuICAgIC4uLihzZWN0aW9uLnRleHQuZGlzY2lwbGluZVJldmVhbCA/IFtzZWN0aW9uLnRleHQuZGlzY2lwbGluZVJldmVhbC5pZF0gOiBbXSksXG4gIF0pKTtcbiAgbGV0IGlkID0gbWFrZVNsdWcoYmFzZSk7XG4gIGxldCBzdWZmaXggPSAyO1xuICB3aGlsZSAodXNlZC5oYXMoaWQpKSB7XG4gICAgaWQgPSBgJHttYWtlU2x1ZyhiYXNlKX0tJHtzdWZmaXh9YDtcbiAgICBzdWZmaXggKz0gMTtcbiAgfVxuICByZXR1cm4gaWQ7XG59XG5cbmZ1bmN0aW9uIHJlcGxhY2VEcmFmdERvY3VtZW50KGRyYWZ0LCBuZXh0RG9jdW1lbnQpIHtcbiAgT2JqZWN0LmtleXMoZHJhZnQpLmZvckVhY2goKGtleSkgPT4gZGVsZXRlIGRyYWZ0W2tleV0pO1xuICBPYmplY3QuYXNzaWduKGRyYWZ0LCBjbG9uZUFib3V0TmFycmF0aXZlRG9jdW1lbnQobmV4dERvY3VtZW50KSk7XG59XG5cbmZ1bmN0aW9uIGFwcGx5Q3VlTW92ZXMoZHJhZnQsIG1vdmVzKSB7XG4gIG1vdmVzLmZvckVhY2goKG1vdmUpID0+IHtcbiAgICBjb25zdCBzZWN0aW9uID0gZHJhZnQuc2VjdGlvbnMuZmluZCgoaXRlbSkgPT4gaXRlbS5pZCA9PT0gbW92ZS5zZWN0aW9uSWQpO1xuICAgIGNvbnN0IGN1ZSA9IHNlY3Rpb24/LnRleHQ/LmN1ZXM/LmZpbmQoKGl0ZW0pID0+IGl0ZW0uaWQgPT09IG1vdmUuY3VlSWQpO1xuICAgIGlmIChjdWUpIE9iamVjdC5hc3NpZ24oY3VlLCB7IGVudGVyOiBtb3ZlLmVudGVyLCBob2xkOiBtb3ZlLmhvbGQsIGV4aXQ6IG1vdmUuZXhpdCB9KTtcbiAgfSk7XG59XG5cbmZ1bmN0aW9uIFByb3BlcnR5KHsgbGFiZWwsIGNoaWxkcmVuLCBoaW50ID0gJycgfSkge1xuICByZXR1cm4gKFxuICAgIDxsYWJlbCBjbGFzc05hbWU9XCJhYm91dC1lZGl0b3ItcHJvcGVydHlcIj5cbiAgICAgIDxzcGFuPntsYWJlbH08L3NwYW4+XG4gICAgICB7Y2hpbGRyZW59XG4gICAgICB7aGludCA/IDxzbWFsbD57aGludH08L3NtYWxsPiA6IG51bGx9XG4gICAgPC9sYWJlbD5cbiAgKTtcbn1cblxuZnVuY3Rpb24gTnVtYmVyUHJvcGVydHkoeyBsYWJlbCwgdmFsdWUsIG1pbiwgbWF4LCBzdGVwLCBvbkNoYW5nZSwgdW5pdCA9ICcnLCBkaXNhYmxlZCA9IGZhbHNlIH0pIHtcbiAgcmV0dXJuIChcbiAgICA8UHJvcGVydHkgbGFiZWw9e2xhYmVsfT5cbiAgICAgIDxkaXYgY2xhc3NOYW1lPVwiYWJvdXQtZWRpdG9yLW51bWJlclwiPlxuICAgICAgICA8aW5wdXRcbiAgICAgICAgICB0eXBlPVwicmFuZ2VcIlxuICAgICAgICAgIHZhbHVlPXt2YWx1ZX1cbiAgICAgICAgICBtaW49e21pbn1cbiAgICAgICAgICBtYXg9e21heH1cbiAgICAgICAgICBzdGVwPXtzdGVwfVxuICAgICAgICAgIGRpc2FibGVkPXtkaXNhYmxlZH1cbiAgICAgICAgICBvbkNoYW5nZT17KGV2ZW50KSA9PiBvbkNoYW5nZShOdW1iZXIoZXZlbnQudGFyZ2V0LnZhbHVlKSl9XG4gICAgICAgIC8+XG4gICAgICAgIDxpbnB1dFxuICAgICAgICAgIHR5cGU9XCJudW1iZXJcIlxuICAgICAgICAgIHZhbHVlPXt2YWx1ZX1cbiAgICAgICAgICBtaW49e21pbn1cbiAgICAgICAgICBtYXg9e21heH1cbiAgICAgICAgICBzdGVwPXtzdGVwfVxuICAgICAgICAgIGRpc2FibGVkPXtkaXNhYmxlZH1cbiAgICAgICAgICBvbkNoYW5nZT17KGV2ZW50KSA9PiBvbkNoYW5nZShOdW1iZXIoZXZlbnQudGFyZ2V0LnZhbHVlKSl9XG4gICAgICAgIC8+XG4gICAgICAgIHt1bml0ID8gPGVtPnt1bml0fTwvZW0+IDogbnVsbH1cbiAgICAgIDwvZGl2PlxuICAgIDwvUHJvcGVydHk+XG4gICk7XG59XG5cbmZ1bmN0aW9uIFJhbmdlUHJvcGVydHkoeyBsYWJlbCwgc3RhcnQsIGVuZCwgbWluLCBtYXgsIHN0ZXAsIG9uU3RhcnRDaGFuZ2UsIG9uRW5kQ2hhbmdlLCBoaW50ID0gJycgfSkge1xuICBjb25zdCBzdGFydFBlcmNlbnQgPSAoKHN0YXJ0IC0gbWluKSAvIE1hdGgubWF4KDAuMDAwMDEsIG1heCAtIG1pbikpICogMTAwO1xuICBjb25zdCBlbmRQZXJjZW50ID0gKChlbmQgLSBtaW4pIC8gTWF0aC5tYXgoMC4wMDAwMSwgbWF4IC0gbWluKSkgKiAxMDA7XG4gIGNvbnN0IHBlcmNlbnRhZ2VTdGVwID0gc3RlcCAqIDEwMDtcbiAgY29uc3Qgc2V0U3RhcnQgPSAodmFsdWUpID0+IG9uU3RhcnRDaGFuZ2UoTWF0aC5taW4oZW5kIC0gc3RlcCwgTWF0aC5tYXgobWluLCBOdW1iZXIodmFsdWUpIHx8IDApKSk7XG4gIGNvbnN0IHNldEVuZCA9ICh2YWx1ZSkgPT4gb25FbmRDaGFuZ2UoTWF0aC5tYXgoc3RhcnQgKyBzdGVwLCBNYXRoLm1pbihtYXgsIE51bWJlcih2YWx1ZSkgfHwgMCkpKTtcbiAgcmV0dXJuIChcbiAgICA8ZmllbGRzZXRcbiAgICAgIGNsYXNzTmFtZT1cImFib3V0LWVkaXRvci1yYW5nZS1wcm9wZXJ0eVwiXG4gICAgICBkYXRhLWdsb2JhbC1jb250cm9sPVwiY2xlYXJXaW5kb3dcIlxuICAgICAgc3R5bGU9e3sgJy0tYWJvdXQtcmFuZ2Utc3RhcnQnOiBgJHtzdGFydFBlcmNlbnR9JWAsICctLWFib3V0LXJhbmdlLWVuZCc6IGAke2VuZFBlcmNlbnR9JWAgfX1cbiAgICA+XG4gICAgICA8bGVnZW5kPntsYWJlbH08L2xlZ2VuZD5cbiAgICAgIDxkaXYgY2xhc3NOYW1lPVwiYWJvdXQtZWRpdG9yLWR1YWwtcmFuZ2VcIj5cbiAgICAgICAgPHNwYW4gYXJpYS1oaWRkZW49XCJ0cnVlXCIgLz5cbiAgICAgICAgPGlucHV0IHR5cGU9XCJyYW5nZVwiIGFyaWEtbGFiZWw9e2Ake2xhYmVsfSBzdGFydGB9IG1pbj17bWlufSBtYXg9e2VuZCAtIHN0ZXB9IHN0ZXA9e3N0ZXB9IHZhbHVlPXtzdGFydH0gb25DaGFuZ2U9eyhldmVudCkgPT4gc2V0U3RhcnQoZXZlbnQudGFyZ2V0LnZhbHVlKX0gLz5cbiAgICAgICAgPGlucHV0IHR5cGU9XCJyYW5nZVwiIGFyaWEtbGFiZWw9e2Ake2xhYmVsfSBlbmRgfSBtaW49e3N0YXJ0ICsgc3RlcH0gbWF4PXttYXh9IHN0ZXA9e3N0ZXB9IHZhbHVlPXtlbmR9IG9uQ2hhbmdlPXsoZXZlbnQpID0+IHNldEVuZChldmVudC50YXJnZXQudmFsdWUpfSAvPlxuICAgICAgPC9kaXY+XG4gICAgICA8ZGl2IGNsYXNzTmFtZT1cImFib3V0LWVkaXRvci1yYW5nZS12YWx1ZXNcIj5cbiAgICAgICAgPGxhYmVsPjxzcGFuPlN0YXJ0czwvc3Bhbj48aW5wdXQgdHlwZT1cIm51bWJlclwiIG1pbj17bWluICogMTAwfSBtYXg9eyhlbmQgLSBzdGVwKSAqIDEwMH0gc3RlcD17cGVyY2VudGFnZVN0ZXB9IHZhbHVlPXtNYXRoLnJvdW5kKHN0YXJ0ICogMTAwKX0gb25DaGFuZ2U9eyhldmVudCkgPT4gc2V0U3RhcnQoTnVtYmVyKGV2ZW50LnRhcmdldC52YWx1ZSkgLyAxMDApfSAvPjxlbT4lPC9lbT48L2xhYmVsPlxuICAgICAgICA8aSBhcmlhLWhpZGRlbj1cInRydWVcIj7ihpI8L2k+XG4gICAgICAgIDxsYWJlbD48c3Bhbj5FbmRzPC9zcGFuPjxpbnB1dCB0eXBlPVwibnVtYmVyXCIgbWluPXsoc3RhcnQgKyBzdGVwKSAqIDEwMH0gbWF4PXttYXggKiAxMDB9IHN0ZXA9e3BlcmNlbnRhZ2VTdGVwfSB2YWx1ZT17TWF0aC5yb3VuZChlbmQgKiAxMDApfSBvbkNoYW5nZT17KGV2ZW50KSA9PiBzZXRFbmQoTnVtYmVyKGV2ZW50LnRhcmdldC52YWx1ZSkgLyAxMDApfSAvPjxlbT4lPC9lbT48L2xhYmVsPlxuICAgICAgPC9kaXY+XG4gICAgICB7aGludCA/IDxzbWFsbD57aGludH08L3NtYWxsPiA6IG51bGx9XG4gICAgPC9maWVsZHNldD5cbiAgKTtcbn1cblxuZnVuY3Rpb24gVHJhbnNwb3J0KHsgc3RvcmUsIHNuYXBzaG90IH0pIHtcbiAgY29uc3QgeyB0cmFuc3BvcnQsIGNvbXBpbGVkUGxhbiB9ID0gc25hcHNob3Q7XG4gIGNvbnN0IG1heFdVID0gY29tcGlsZWRQbGFuPy5tYXhTdG9yeVdVIHx8IDE7XG4gIGNvbnN0IHBsYXkgPSAoKSA9PiBzdG9yZS5zZXRUcmFuc3BvcnQoe1xuICAgIG93bmVyOiB0cmFuc3BvcnQucGxheWluZyA/ICd0aW1lbGluZScgOiAncGxheWJhY2snLFxuICAgIHBsYXlpbmc6ICF0cmFuc3BvcnQucGxheWluZyxcbiAgICBzdG9yeVdVOiB0cmFuc3BvcnQuc3RvcnlXVSxcbiAgfSk7XG4gIGNvbnN0IHNlZWsgPSAoc3RvcnlXVSkgPT4gc3RvcmUuc2V0VHJhbnNwb3J0KHsgb3duZXI6ICd0aW1lbGluZScsIHBsYXlpbmc6IGZhbHNlLCBzdG9yeVdVIH0pO1xuICBjb25zdCBzZWxlY3RlZCA9IGdldFNlY3Rpb24oc25hcHNob3QuZG9jdW1lbnQsIHNuYXBzaG90LnNlbGVjdGlvbik7XG4gIGNvbnN0IHNlY3Rpb25JbmRleCA9IGdldFNlY3Rpb25JbmRleChzbmFwc2hvdC5kb2N1bWVudCwgc2VsZWN0ZWQuaWQpO1xuICBjb25zdCBqdW1wU2VjdGlvbiA9IChkaXJlY3Rpb24pID0+IHtcbiAgICBjb25zdCBuZXh0ID0gc25hcHNob3QuY29tcGlsZWRQbGFuLnNlY3Rpb25zW01hdGgubWF4KDAsIE1hdGgubWluKHNuYXBzaG90LmNvbXBpbGVkUGxhbi5zZWN0aW9ucy5sZW5ndGggLSAxLCBzZWN0aW9uSW5kZXggKyBkaXJlY3Rpb24pKV07XG4gICAgaWYgKG5leHQpIHNlZWsobmV4dC5zdGFydFdVKTtcbiAgfTtcbiAgcmV0dXJuIChcbiAgICA8ZGl2IGNsYXNzTmFtZT1cImFib3V0LWVkaXRvci10cmFuc3BvcnRcIj5cbiAgICAgIDxidXR0b24gdHlwZT1cImJ1dHRvblwiIHRpdGxlPVwiUHJldmlvdXMgU2VjdGlvblwiIGFyaWEtbGFiZWw9XCJQcmV2aW91cyBTZWN0aW9uXCIgb25DbGljaz17KCkgPT4ganVtcFNlY3Rpb24oLTEpfT48U2tpcEJhY2sgYXJpYS1oaWRkZW49XCJ0cnVlXCIgLz48L2J1dHRvbj5cbiAgICAgIDxidXR0b24gdHlwZT1cImJ1dHRvblwiIHRpdGxlPVwiUHJldmlvdXMga2V5ZnJhbWUgwrcgTGVmdCBhcnJvd1wiIGFyaWEtbGFiZWw9XCJQcmV2aW91cyBrZXlmcmFtZVwiIG9uQ2xpY2s9eygpID0+IGp1bXBUaW1lbGluZUtleWZyYW1lKHN0b3JlLCBzbmFwc2hvdCwgLTEpfT48Q2hldnJvbkxlZnQgYXJpYS1oaWRkZW49XCJ0cnVlXCIgLz48L2J1dHRvbj5cbiAgICAgIDxidXR0b24gdHlwZT1cImJ1dHRvblwiIGNsYXNzTmFtZT1cImlzLXByaW1hcnlcIiB0aXRsZT17dHJhbnNwb3J0LnBsYXlpbmcgPyAnUGF1c2UnIDogJ1BsYXknfSBhcmlhLWxhYmVsPXt0cmFuc3BvcnQucGxheWluZyA/ICdQYXVzZScgOiAnUGxheSd9IG9uQ2xpY2s9e3BsYXl9PlxuICAgICAgICB7dHJhbnNwb3J0LnBsYXlpbmcgPyA8UGF1c2UgYXJpYS1oaWRkZW49XCJ0cnVlXCIgLz4gOiA8UGxheSBhcmlhLWhpZGRlbj1cInRydWVcIiAvPn1cbiAgICAgIDwvYnV0dG9uPlxuICAgICAgPGJ1dHRvbiB0eXBlPVwiYnV0dG9uXCIgdGl0bGU9XCJOZXh0IFNlY3Rpb25cIiBhcmlhLWxhYmVsPVwiTmV4dCBTZWN0aW9uXCIgb25DbGljaz17KCkgPT4ganVtcFNlY3Rpb24oMSl9PjxTa2lwRm9yd2FyZCBhcmlhLWhpZGRlbj1cInRydWVcIiAvPjwvYnV0dG9uPlxuICAgICAgPGJ1dHRvbiB0eXBlPVwiYnV0dG9uXCIgdGl0bGU9XCJOZXh0IGtleWZyYW1lIMK3IFJpZ2h0IGFycm93XCIgYXJpYS1sYWJlbD1cIk5leHQga2V5ZnJhbWVcIiBvbkNsaWNrPXsoKSA9PiBqdW1wVGltZWxpbmVLZXlmcmFtZShzdG9yZSwgc25hcHNob3QsIDEpfT48Q2hldnJvblJpZ2h0IGFyaWEtaGlkZGVuPVwidHJ1ZVwiIC8+PC9idXR0b24+XG4gICAgICA8b3V0cHV0Pntmb3JtYXRXVSh0cmFuc3BvcnQuc3RvcnlXVSl9PC9vdXRwdXQ+XG4gICAgICA8aW5wdXRcbiAgICAgICAgYXJpYS1sYWJlbD1cIkdsb2JhbCBuYXJyYXRpdmUgcGxheWhlYWRcIlxuICAgICAgICB0eXBlPVwicmFuZ2VcIlxuICAgICAgICBtaW49XCIwXCJcbiAgICAgICAgbWF4PXttYXhXVX1cbiAgICAgICAgc3RlcD1cIjAuMDAyXCJcbiAgICAgICAgdmFsdWU9e01hdGgubWluKG1heFdVLCB0cmFuc3BvcnQuc3RvcnlXVSl9XG4gICAgICAgIG9uQ2hhbmdlPXsoZXZlbnQpID0+IHNlZWsoTnVtYmVyKGV2ZW50LnRhcmdldC52YWx1ZSkpfVxuICAgICAgLz5cbiAgICAgIDxidXR0b25cbiAgICAgICAgdHlwZT1cImJ1dHRvblwiXG4gICAgICAgIGNsYXNzTmFtZT17dHJhbnNwb3J0Lm93bmVyID09PSAnc2Nyb2xsJyA/ICdpcy1hY3RpdmUnIDogJyd9XG4gICAgICAgIG9uQ2xpY2s9eygpID0+IHN0b3JlLnNldFRyYW5zcG9ydCh7IG93bmVyOiAnc2Nyb2xsJywgcGxheWluZzogZmFsc2UgfSl9XG4gICAgICA+Rm9sbG93IHNjcm9sbDwvYnV0dG9uPlxuICAgICAgPGJ1dHRvblxuICAgICAgICB0eXBlPVwiYnV0dG9uXCJcbiAgICAgICAgY2xhc3NOYW1lPXt0cmFuc3BvcnQubGl2ZUFtYmllbnQgPyAnaXMtYWN0aXZlJyA6ICcnfVxuICAgICAgICBvbkNsaWNrPXsoKSA9PiBzdG9yZS5zZXRUcmFuc3BvcnQoeyBsaXZlQW1iaWVudDogIXRyYW5zcG9ydC5saXZlQW1iaWVudCB9KX1cbiAgICAgID5MaXZlIGFtYmllbnQ8L2J1dHRvbj5cbiAgICAgIDxzZWxlY3RcbiAgICAgICAgYXJpYS1sYWJlbD1cIlByZXZpZXcgcHJvZmlsZVwiXG4gICAgICAgIHZhbHVlPXtzbmFwc2hvdC5wcmV2aWV3UHJvZmlsZX1cbiAgICAgICAgb25DaGFuZ2U9eyhldmVudCkgPT4gc3RvcmUuc2V0UHJldmlld1Byb2ZpbGUoZXZlbnQudGFyZ2V0LnZhbHVlKX1cbiAgICAgID5cbiAgICAgICAgPG9wdGlvbiB2YWx1ZT1cImRlc2t0b3BcIj5EZXNrdG9wPC9vcHRpb24+XG4gICAgICAgIDxvcHRpb24gdmFsdWU9XCJtb2JpbGVcIj5Nb2JpbGU8L29wdGlvbj5cbiAgICAgICAgPG9wdGlvbiB2YWx1ZT1cInJlZHVjZWQtbW90aW9uXCI+UmVkdWNlZCBtb3Rpb248L29wdGlvbj5cbiAgICAgIDwvc2VsZWN0PlxuICAgIDwvZGl2PlxuICApO1xufVxuXG5mdW5jdGlvbiBUaW1lbGluZSh7IHN0b3JlLCBzbmFwc2hvdCwgb25PcGVuR2xvYmFsIH0pIHtcbiAgY29uc3QgeyBkb2N1bWVudCwgY29tcGlsZWRQbGFuLCBzZWxlY3Rpb24sIHRyYW5zcG9ydCB9ID0gc25hcHNob3Q7XG4gIGNvbnN0IHNlbGVjdGVkQ3VlTWVtYmVycyA9IGdldEFib3V0TmFycmF0aXZlU2VsZWN0aW9uTWVtYmVycyhzZWxlY3Rpb24pO1xuICBjb25zdCBtYXhXVSA9IE1hdGgubWF4KDAuMDAxLCBjb21waWxlZFBsYW4/Lm1heFN0b3J5V1UgfHwgZG9jdW1lbnQuc2VjdGlvbnMucmVkdWNlKChzdW0sIHNlY3Rpb24pID0+IHN1bSArIHNlY3Rpb24uZXh0ZW50V1UsIDApKTtcbiAgY29uc3QgcGxheWhlYWQgPSBgJHsodHJhbnNwb3J0LnN0b3J5V1UgLyBtYXhXVSkgKiAxMDB9JWA7XG4gIGNvbnN0IGxhbmVzUmVmID0gdXNlUmVmKG51bGwpO1xuICBjb25zdCB0aW1pbmdEcmFnUmVmID0gdXNlUmVmKG51bGwpO1xuICBjb25zdCBwcmV2aWV3RnJhbWVSZWYgPSB1c2VSZWYobnVsbCk7XG4gIGNvbnN0IHBlbmRpbmdQcmV2aWV3UmVmID0gdXNlUmVmKG51bGwpO1xuICBjb25zdCBzdXBwcmVzc2VkQ2xpY2tSZWYgPSB1c2VSZWYobnVsbCk7XG4gIGNvbnN0IFtjYW1lcmFEcmFnUHJldmlldywgc2V0Q2FtZXJhRHJhZ1ByZXZpZXddID0gdXNlU3RhdGUobnVsbCk7XG4gIGNvbnN0IFtzZWN0aW9uUmVzaXplUHJldmlldywgc2V0U2VjdGlvblJlc2l6ZVByZXZpZXddID0gdXNlU3RhdGUobnVsbCk7XG4gIGNvbnN0IFttYXJxdWVlLCBzZXRNYXJxdWVlXSA9IHVzZVN0YXRlKG51bGwpO1xuXG4gIGNvbnN0IHF1ZXVlUHJldmlld0ZyYW1lID0gKGNhbGxiYWNrKSA9PiB7XG4gICAgcGVuZGluZ1ByZXZpZXdSZWYuY3VycmVudCA9IGNhbGxiYWNrO1xuICAgIGlmIChwcmV2aWV3RnJhbWVSZWYuY3VycmVudCkgcmV0dXJuO1xuICAgIHByZXZpZXdGcmFtZVJlZi5jdXJyZW50ID0gcmVxdWVzdEFuaW1hdGlvbkZyYW1lKCgpID0+IHtcbiAgICAgIHByZXZpZXdGcmFtZVJlZi5jdXJyZW50ID0gbnVsbDtcbiAgICAgIGNvbnN0IHBlbmRpbmcgPSBwZW5kaW5nUHJldmlld1JlZi5jdXJyZW50O1xuICAgICAgcGVuZGluZ1ByZXZpZXdSZWYuY3VycmVudCA9IG51bGw7XG4gICAgICBwZW5kaW5nPy4oKTtcbiAgICB9KTtcbiAgfTtcbiAgY29uc3QgZmx1c2hQcmV2aWV3RnJhbWUgPSAoKSA9PiB7XG4gICAgaWYgKHByZXZpZXdGcmFtZVJlZi5jdXJyZW50KSBjYW5jZWxBbmltYXRpb25GcmFtZShwcmV2aWV3RnJhbWVSZWYuY3VycmVudCk7XG4gICAgcHJldmlld0ZyYW1lUmVmLmN1cnJlbnQgPSBudWxsO1xuICAgIGNvbnN0IHBlbmRpbmcgPSBwZW5kaW5nUHJldmlld1JlZi5jdXJyZW50O1xuICAgIHBlbmRpbmdQcmV2aWV3UmVmLmN1cnJlbnQgPSBudWxsO1xuICAgIHBlbmRpbmc/LigpO1xuICB9O1xuXG4gIGNvbnN0IHpvb21UaW1lbGluZSA9IChldmVudCkgPT4ge1xuICAgIGlmICghZXZlbnQuY3RybEtleSAmJiAhZXZlbnQubWV0YUtleSkgcmV0dXJuO1xuICAgIGV2ZW50LnByZXZlbnREZWZhdWx0KCk7XG4gICAgY29uc3QgbGFuZXMgPSBsYW5lc1JlZi5jdXJyZW50O1xuICAgIGlmICghbGFuZXMpIHJldHVybjtcbiAgICBjb25zdCByZWN0ID0gbGFuZXMuZ2V0Qm91bmRpbmdDbGllbnRSZWN0KCk7XG4gICAgY29uc3QgcG9pbnRlclggPSBNYXRoLm1pbihyZWN0LndpZHRoLCBNYXRoLm1heCgwLCBldmVudC5jbGllbnRYIC0gcmVjdC5sZWZ0KSk7XG4gICAgY29uc3Qgc3RvcnlSYXRpbyA9IChsYW5lcy5zY3JvbGxMZWZ0ICsgcG9pbnRlclgpIC8gTWF0aC5tYXgoMSwgbGFuZXMuc2Nyb2xsV2lkdGgpO1xuICAgIGNvbnN0IGN1cnJlbnRab29tID0gTWF0aC5tYXgoMSwgTnVtYmVyKHRyYW5zcG9ydC56b29tKSB8fCAxKTtcbiAgICBjb25zdCBuZXh0Wm9vbSA9IE1hdGgubWluKDgsIE1hdGgubWF4KDEsIGN1cnJlbnRab29tICogTWF0aC5leHAoLWV2ZW50LmRlbHRhWSAqIDAuMDAyNSkpKTtcbiAgICBzdG9yZS5zZXRUcmFuc3BvcnQoeyB6b29tOiBOdW1iZXIobmV4dFpvb20udG9GaXhlZCgzKSkgfSk7XG4gICAgcmVxdWVzdEFuaW1hdGlvbkZyYW1lKCgpID0+IHtcbiAgICAgIGxhbmVzLnNjcm9sbExlZnQgPSAoc3RvcnlSYXRpbyAqIGxhbmVzLnNjcm9sbFdpZHRoKSAtIHBvaW50ZXJYO1xuICAgIH0pO1xuICB9O1xuXG4gIHVzZUVmZmVjdCgoKSA9PiAoKSA9PiB7XG4gICAgaWYgKHByZXZpZXdGcmFtZVJlZi5jdXJyZW50KSBjYW5jZWxBbmltYXRpb25GcmFtZShwcmV2aWV3RnJhbWVSZWYuY3VycmVudCk7XG4gIH0sIFtdKTtcblxuICBjb25zdCByZXNvbHZlQ2FtZXJhRHJvcEF0Q2xpZW50WCA9IChjbGllbnRYKSA9PiB7XG4gICAgY29uc3QgbGFuZXMgPSBsYW5lc1JlZi5jdXJyZW50O1xuICAgIGNvbnN0IGN1cnJlbnQgPSBzdG9yZS5nZXRTbmFwc2hvdCgpO1xuICAgIGlmICghbGFuZXMpIHJldHVybiB7IHZhbGlkOiBmYWxzZSwgcmVhc29uOiAnVGhlIGNhbWVyYSB0aW1lbGluZSBpcyBub3QgcmVhZHkuJyB9O1xuICAgIGNvbnN0IHJlY3QgPSBsYW5lcy5nZXRCb3VuZGluZ0NsaWVudFJlY3QoKTtcbiAgICBjb25zdCBjb250ZW50WCA9IE1hdGgubWluKFxuICAgICAgbGFuZXMuc2Nyb2xsV2lkdGgsXG4gICAgICBNYXRoLm1heCgwLCBjbGllbnRYIC0gcmVjdC5sZWZ0ICsgbGFuZXMuc2Nyb2xsTGVmdCksXG4gICAgKTtcbiAgICBjb25zdCBzdG9yeVdVID0gKGNvbnRlbnRYIC8gTWF0aC5tYXgoMSwgbGFuZXMuc2Nyb2xsV2lkdGgpKVxuICAgICAgKiBNYXRoLm1heCgwLjAwMSwgY3VycmVudC5jb21waWxlZFBsYW4/Lm1heFN0b3J5V1UgfHwgbWF4V1UpO1xuICAgIGNvbnN0IGRyYWcgPSB0aW1pbmdEcmFnUmVmLmN1cnJlbnQ7XG4gICAgY29uc3QgZHJvcCA9IHJlc29sdmVBYm91dE5hcnJhdGl2ZUNhbWVyYUtleURyb3Aoe1xuICAgICAgZG9jdW1lbnQ6IGN1cnJlbnQuZG9jdW1lbnQsXG4gICAgICBwbGFuOiBjdXJyZW50LmNvbXBpbGVkUGxhbixcbiAgICAgIHNvdXJjZVNlY3Rpb25JbmRleDogZHJhZz8uc2VjdGlvbkluZGV4LFxuICAgICAgc291cmNlS2V5SW5kZXg6IGRyYWc/LmtleUluZGV4LFxuICAgICAgc3RvcnlXVSxcbiAgICB9KTtcbiAgICByZXR1cm4geyAuLi5kcm9wLCBjb250ZW50WCB9O1xuICB9O1xuXG4gIGNvbnN0IGJlZ2luVGltaW5nRHJhZyA9IChldmVudCwgZHJhZykgPT4ge1xuICAgIGlmIChkcmFnLmxvY2tlZCB8fCBldmVudC5idXR0b24gIT09IDApIHJldHVybjtcbiAgICBjb25zdCBjbGlwID0gZXZlbnQuY3VycmVudFRhcmdldC5wYXJlbnRFbGVtZW50O1xuICAgIGNvbnN0IHJlY3QgPSBjbGlwPy5nZXRCb3VuZGluZ0NsaWVudFJlY3QoKTtcbiAgICBpZiAoIXJlY3Q/LndpZHRoKSByZXR1cm47XG4gICAgZXZlbnQucHJldmVudERlZmF1bHQoKTtcbiAgICBldmVudC5zdG9wUHJvcGFnYXRpb24oKTtcbiAgICBldmVudC5jdXJyZW50VGFyZ2V0LnNldFBvaW50ZXJDYXB0dXJlPy4oZXZlbnQucG9pbnRlcklkKTtcbiAgICBsZXQgbmV4dFNlbGVjdGlvbiA9IGRyYWcuc2VsZWN0aW9uO1xuICAgIGlmIChkcmFnLnR5cGUgPT09ICdjdWUnKSB7XG4gICAgICBjb25zdCBjdXJyZW50U2VsZWN0aW9uID0gc3RvcmUuZ2V0U25hcHNob3QoKS5zZWxlY3Rpb247XG4gICAgICBjb25zdCBjdXJyZW50TWVtYmVycyA9IGdldEFib3V0TmFycmF0aXZlU2VsZWN0aW9uTWVtYmVycyhjdXJyZW50U2VsZWN0aW9uKTtcbiAgICAgIGNvbnN0IGFscmVhZHlTZWxlY3RlZCA9IGN1cnJlbnRNZW1iZXJzLnNvbWUoKG1lbWJlcikgPT4gKFxuICAgICAgICBtZW1iZXIuc2VjdGlvbklkID09PSBkcmFnLnNlbGVjdGlvbi5zZWN0aW9uSWQgJiYgbWVtYmVyLmN1ZUlkID09PSBkcmFnLnNlbGVjdGlvbi5jdWVJZFxuICAgICAgKSk7XG4gICAgICBuZXh0U2VsZWN0aW9uID0gZXZlbnQuc2hpZnRLZXlcbiAgICAgICAgPyB0b2dnbGVBYm91dE5hcnJhdGl2ZUN1ZVNlbGVjdGlvbihjdXJyZW50U2VsZWN0aW9uLCBkcmFnLnNlbGVjdGlvbilcbiAgICAgICAgOiBhbHJlYWR5U2VsZWN0ZWQgJiYgY3VycmVudE1lbWJlcnMubGVuZ3RoID4gMVxuICAgICAgICAgID8geyAuLi5kcmFnLnNlbGVjdGlvbiwgbWVtYmVyczogY3VycmVudE1lbWJlcnMgfVxuICAgICAgICAgIDogZHJhZy5zZWxlY3Rpb247XG4gICAgICBzdG9yZS5iZWdpblByZXZpZXcoJ01vdmUgdGV4dCBDdWVzJyk7XG4gICAgfVxuICAgIHRpbWluZ0RyYWdSZWYuY3VycmVudCA9IHtcbiAgICAgIC4uLmRyYWcsXG4gICAgICBzZWxlY3Rpb246IG5leHRTZWxlY3Rpb24sXG4gICAgICBtZW1iZXJzOiBkcmFnLnR5cGUgPT09ICdjdWUnID8gZ2V0QWJvdXROYXJyYXRpdmVTZWxlY3Rpb25NZW1iZXJzKG5leHRTZWxlY3Rpb24pIDogbnVsbCxcbiAgICAgIHN0YXJ0RG9jdW1lbnQ6IGRyYWcudHlwZSA9PT0gJ2N1ZScgPyBjbG9uZUFib3V0TmFycmF0aXZlRG9jdW1lbnQoc3RvcmUuZ2V0U25hcHNob3QoKS5kb2N1bWVudCkgOiBudWxsLFxuICAgICAgc3RhcnRQbGFuOiBkcmFnLnR5cGUgPT09ICdjdWUnID8gc3RvcmUuZ2V0U25hcHNob3QoKS5jb21waWxlZFBsYW4gOiBudWxsLFxuICAgICAgcG9pbnRlcklkOiBldmVudC5wb2ludGVySWQsXG4gICAgICByZWN0LFxuICAgICAgc3RhcnRYOiBldmVudC5jbGllbnRYLFxuICAgICAgbW92ZWQ6IGZhbHNlLFxuICAgICAgbGFzdEF0OiBkcmFnLmF0LFxuICAgICAgbGFzdERyb3A6IG51bGwsXG4gICAgfTtcbiAgICBzdG9yZS5zZXRTZWxlY3Rpb24obmV4dFNlbGVjdGlvbik7XG4gICAgc3RvcmUuc2V0VHJhbnNwb3J0KHsgb3duZXI6ICd0aW1lbGluZScsIHBsYXlpbmc6IGZhbHNlLCBzdG9yeVdVOiBkcmFnLnN0b3J5V1UgfSk7XG4gIH07XG5cbiAgY29uc3QgbW92ZVRpbWluZ0RyYWcgPSAoZXZlbnQpID0+IHtcbiAgICBjb25zdCBkcmFnID0gdGltaW5nRHJhZ1JlZi5jdXJyZW50O1xuICAgIGlmICghZHJhZyB8fCBkcmFnLnBvaW50ZXJJZCAhPT0gZXZlbnQucG9pbnRlcklkKSByZXR1cm47XG4gICAgaWYgKCFkcmFnLm1vdmVkICYmIE1hdGguYWJzKGV2ZW50LmNsaWVudFggLSBkcmFnLnN0YXJ0WCkgPCAzKSByZXR1cm47XG4gICAgZHJhZy5tb3ZlZCA9IHRydWU7XG4gICAgaWYgKGRyYWcudHlwZSA9PT0gJ2NhbWVyYScpIHtcbiAgICAgIGNvbnN0IGRyb3AgPSByZXNvbHZlQ2FtZXJhRHJvcEF0Q2xpZW50WChldmVudC5jbGllbnRYKTtcbiAgICAgIGRyYWcubGFzdERyb3AgPSBkcm9wO1xuICAgICAgc2V0Q2FtZXJhRHJhZ1ByZXZpZXcoeyAuLi5kcm9wLCB0b2tlbjogZHJhZy50b2tlbiB9KTtcbiAgICAgIGlmIChkcm9wLnZhbGlkKSB7XG4gICAgICAgIHN0b3JlLnNldFRyYW5zcG9ydCh7IG93bmVyOiAndGltZWxpbmUnLCBwbGF5aW5nOiBmYWxzZSwgc3RvcnlXVTogZHJvcC5zdG9yeVdVIH0pO1xuICAgICAgfVxuICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICBpZiAoZHJhZy50eXBlID09PSAnZGlzY2lwbGluZS1yZXZlYWwnKSB7XG4gICAgICBjb25zdCBkZWx0YUxhbmUgPSAoZXZlbnQuY2xpZW50WCAtIGRyYWcuc3RhcnRYKSAvIGRyYWcucmVjdC53aWR0aDtcbiAgICAgIGNvbnN0IG5leHRBdCA9IE1hdGgubWluKGRyYWcubWF4LCBNYXRoLm1heChcbiAgICAgICAgZHJhZy5taW4sXG4gICAgICAgIHNuYXBBYm91dE5hcnJhdGl2ZVRpbWVsaW5lVmFsdWUoZHJhZy5hdCArIGRlbHRhTGFuZSksXG4gICAgICApKTtcbiAgICAgIGlmIChNYXRoLmFicyhuZXh0QXQgLSBkcmFnLmxhc3RBdCkgPCAwLjAwMDAwMSkgcmV0dXJuO1xuICAgICAgY29uc3QgZGVsdGEgPSBuZXh0QXQgLSBkcmFnLmxhc3RBdDtcbiAgICAgIHN0b3JlLmNvbW1pdCgnTW92ZSBEaXNjaXBsaW5lIHJldmVhbCcsIChkcmFmdCkgPT4ge1xuICAgICAgICBjb25zdCByZXZlYWwgPSBkcmFmdC5zZWN0aW9uc1tkcmFnLnNlY3Rpb25JbmRleF0udGV4dC5kaXNjaXBsaW5lUmV2ZWFsO1xuICAgICAgICBpZiAoIXJldmVhbCkgcmV0dXJuO1xuICAgICAgICByZXZlYWwuc3RhcnQgKz0gZGVsdGE7XG4gICAgICAgIHJldmVhbC5lbmQgKz0gZGVsdGE7XG4gICAgICB9LCB7IGNvYWxlc2NlS2V5OiBkcmFnLmNvYWxlc2NlS2V5LCBzZWxlY3Rpb246IGRyYWcuc2VsZWN0aW9uIH0pO1xuICAgICAgZHJhZy5sYXN0QXQgPSBuZXh0QXQ7XG4gICAgICBzdG9yZS5zZXRUcmFuc3BvcnQoe1xuICAgICAgICBvd25lcjogJ3RpbWVsaW5lJyxcbiAgICAgICAgcGxheWluZzogZmFsc2UsXG4gICAgICAgIHN0b3J5V1U6IGRyYWcuc2VjdGlvblN0YXJ0V1UgKyAobmV4dEF0ICogZHJhZy50cmF2ZWxXVSksXG4gICAgICB9KTtcbiAgICAgIHJldHVybjtcbiAgICB9XG4gICAgY29uc3QgbG9jYWxEZWx0YSA9IChldmVudC5jbGllbnRYIC0gZHJhZy5zdGFydFgpIC8gZHJhZy5yZWN0LndpZHRoO1xuICAgIGNvbnN0IG1vdmVtZW50ID0gcmVzb2x2ZUFib3V0TmFycmF0aXZlQ3VlR3JvdXBNb3ZlKHtcbiAgICAgIGRvY3VtZW50OiBkcmFnLnN0YXJ0RG9jdW1lbnQsXG4gICAgICBwbGFuOiBkcmFnLnN0YXJ0UGxhbixcbiAgICAgIG1lbWJlcnM6IGRyYWcubWVtYmVycyxcbiAgICAgIHByaW1hcnk6IGRyYWcuc2VsZWN0aW9uLFxuICAgICAgbG9jYWxEZWx0YSxcbiAgICB9KTtcbiAgICBpZiAoIW1vdmVtZW50LnZhbGlkIHx8IE1hdGguYWJzKG1vdmVtZW50LmRlbHRhV1UgLSAoZHJhZy5sYXN0RGVsdGFXVSB8fCAwKSkgPCAwLjAwMDAwMSkgcmV0dXJuO1xuICAgIGRyYWcubGFzdERlbHRhV1UgPSBtb3ZlbWVudC5kZWx0YVdVO1xuICAgIHF1ZXVlUHJldmlld0ZyYW1lKCgpID0+IHtcbiAgICAgIHN0b3JlLnVwZGF0ZVByZXZpZXcoKGRyYWZ0KSA9PiB7XG4gICAgICAgIG1vdmVtZW50Lm1vdmVzLmZvckVhY2goKG1vdmUpID0+IHtcbiAgICAgICAgICBjb25zdCBjdWUgPSBkcmFmdC5zZWN0aW9uc1ttb3ZlLnNlY3Rpb25JbmRleF0/LnRleHQ/LmN1ZXM/LmZpbmQoKGl0ZW0pID0+IGl0ZW0uaWQgPT09IG1vdmUuY3VlSWQpO1xuICAgICAgICAgIGlmIChjdWUpIE9iamVjdC5hc3NpZ24oY3VlLCB7IGVudGVyOiBtb3ZlLmVudGVyLCBob2xkOiBtb3ZlLmhvbGQsIGV4aXQ6IG1vdmUuZXhpdCB9KTtcbiAgICAgICAgfSk7XG4gICAgICB9LCB7XG4gICAgICAgIG93bmVyOiAndGltZWxpbmUnLFxuICAgICAgICBwbGF5aW5nOiBmYWxzZSxcbiAgICAgICAgc3RvcnlXVTogZHJhZy5zdG9yeVdVICsgbW92ZW1lbnQuZGVsdGFXVSxcbiAgICAgIH0pO1xuICAgIH0pO1xuICB9O1xuXG4gIGNvbnN0IGVuZFRpbWluZ0RyYWcgPSAoZXZlbnQpID0+IHtcbiAgICBjb25zdCBkcmFnID0gdGltaW5nRHJhZ1JlZi5jdXJyZW50O1xuICAgIGlmICghZHJhZyB8fCBkcmFnLnBvaW50ZXJJZCAhPT0gZXZlbnQucG9pbnRlcklkKSByZXR1cm47XG4gICAgaWYgKGV2ZW50LmN1cnJlbnRUYXJnZXQuaGFzUG9pbnRlckNhcHR1cmU/LihldmVudC5wb2ludGVySWQpKSBldmVudC5jdXJyZW50VGFyZ2V0LnJlbGVhc2VQb2ludGVyQ2FwdHVyZShldmVudC5wb2ludGVySWQpO1xuICAgIGlmIChkcmFnLnR5cGUgPT09ICdjdWUnKSB7XG4gICAgICBmbHVzaFByZXZpZXdGcmFtZSgpO1xuICAgICAgaWYgKGV2ZW50LnR5cGUgPT09ICdwb2ludGVyY2FuY2VsJyB8fCAhZHJhZy5tb3ZlZCkgc3RvcmUuY2FuY2VsUHJldmlldygpO1xuICAgICAgZWxzZSBzdG9yZS5jb21taXRQcmV2aWV3KGRyYWcuc2VsZWN0aW9uKTtcbiAgICB9XG4gICAgaWYgKGRyYWcudHlwZSA9PT0gJ2NhbWVyYScgJiYgZHJhZy5tb3ZlZCAmJiBldmVudC50eXBlICE9PSAncG9pbnRlcmNhbmNlbCcpIHtcbiAgICAgIGNvbnN0IGRyb3AgPSBkcmFnLmxhc3REcm9wIHx8IHJlc29sdmVDYW1lcmFEcm9wQXRDbGllbnRYKGV2ZW50LmNsaWVudFgpO1xuICAgICAgaWYgKGRyb3AudmFsaWQpIHtcbiAgICAgICAgc3RvcmUuY29tbWl0KCdNb3ZlIGNhbWVyYSBrZXknLCAoZHJhZnQpID0+IHtcbiAgICAgICAgICBjb25zdCBzb3VyY2VLZXlzID0gZHJhZnQuc2VjdGlvbnNbZHJhZy5zZWN0aW9uSW5kZXhdPy5jYW1lcmEua2V5cztcbiAgICAgICAgICBjb25zdCBbbW92ZWRLZXldID0gc291cmNlS2V5cz8uc3BsaWNlKGRyYWcua2V5SW5kZXgsIDEpIHx8IFtdO1xuICAgICAgICAgIGlmICghbW92ZWRLZXkpIHJldHVybjtcbiAgICAgICAgICBtb3ZlZEtleS5hdCA9IGRyb3AuYXQ7XG4gICAgICAgICAgY29uc3QgZGVzdGluYXRpb25LZXlzID0gZHJhZnQuc2VjdGlvbnNbZHJvcC5zZWN0aW9uSW5kZXhdLmNhbWVyYS5rZXlzO1xuICAgICAgICAgIGRlc3RpbmF0aW9uS2V5cy5wdXNoKG1vdmVkS2V5KTtcbiAgICAgICAgICBkZXN0aW5hdGlvbktleXMuc29ydCgoYSwgYikgPT4gYS5hdCAtIGIuYXQpO1xuICAgICAgICB9LCB7XG4gICAgICAgICAgc2VsZWN0aW9uOiB7IHR5cGU6ICdjYW1lcmEta2V5Jywgc2VjdGlvbklkOiBkcm9wLnNlY3Rpb25JZCwga2V5SW5kZXg6IGRyb3Aua2V5SW5kZXggfSxcbiAgICAgICAgfSk7XG4gICAgICAgIHN0b3JlLnNldFRyYW5zcG9ydCh7IG93bmVyOiAndGltZWxpbmUnLCBwbGF5aW5nOiBmYWxzZSwgc3RvcnlXVTogZHJvcC5zdG9yeVdVIH0pO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgc3RvcmUuc2V0U2F2ZVN0YXRlKHsgbWVzc2FnZTogZHJvcC5yZWFzb24gfHwgJ1RoYXQgY2FtZXJhIGtleSBjYW5ub3QgYmUgcGxhY2VkIGhlcmUuJyB9KTtcbiAgICAgIH1cbiAgICB9XG4gICAgaWYgKGRyYWcubW92ZWQpIHtcbiAgICAgIHN1cHByZXNzZWRDbGlja1JlZi5jdXJyZW50ID0gZHJhZy50b2tlbjtcbiAgICAgIHdpbmRvdy5zZXRUaW1lb3V0KCgpID0+IHtcbiAgICAgICAgaWYgKHN1cHByZXNzZWRDbGlja1JlZi5jdXJyZW50ID09PSBkcmFnLnRva2VuKSBzdXBwcmVzc2VkQ2xpY2tSZWYuY3VycmVudCA9IG51bGw7XG4gICAgICB9LCAwKTtcbiAgICB9XG4gICAgc2V0Q2FtZXJhRHJhZ1ByZXZpZXcobnVsbCk7XG4gICAgdGltaW5nRHJhZ1JlZi5jdXJyZW50ID0gbnVsbDtcbiAgfTtcblxuICBjb25zdCBoYW5kbGVUaW1pbmdDbGljayA9ICh0b2tlbiwgYWN0aW9uKSA9PiB7XG4gICAgaWYgKHN1cHByZXNzZWRDbGlja1JlZi5jdXJyZW50ID09PSB0b2tlbikge1xuICAgICAgc3VwcHJlc3NlZENsaWNrUmVmLmN1cnJlbnQgPSBudWxsO1xuICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICBhY3Rpb24oKTtcbiAgfTtcblxuICBjb25zdCBiZWdpblNlY3Rpb25SZXNpemUgPSAoZXZlbnQsIGRhdGEpID0+IHtcbiAgICBpZiAoZGF0YS5sb2NrZWQgfHwgZXZlbnQuYnV0dG9uICE9PSAwKSByZXR1cm47XG4gICAgZXZlbnQucHJldmVudERlZmF1bHQoKTtcbiAgICBldmVudC5zdG9wUHJvcGFnYXRpb24oKTtcbiAgICBldmVudC5jdXJyZW50VGFyZ2V0LnNldFBvaW50ZXJDYXB0dXJlPy4oZXZlbnQucG9pbnRlcklkKTtcbiAgICBjb25zdCBjdXJyZW50ID0gc3RvcmUuZ2V0U25hcHNob3QoKTtcbiAgICBjb25zdCBmaWVsZCA9IGdldEFib3V0TmFycmF0aXZlRXh0ZW50RmllbGQoY3VycmVudC5wcmV2aWV3UHJvZmlsZSk7XG4gICAgc3RvcmUuYmVnaW5QcmV2aWV3KGBSZXNpemUgJHtkYXRhLnNlY3Rpb25MYWJlbH1gKTtcbiAgICBzdG9yZS5zZXRTZWxlY3Rpb24oeyB0eXBlOiAnc2VjdGlvbicsIHNlY3Rpb25JZDogZGF0YS5zZWN0aW9uSWQgfSk7XG4gICAgdGltaW5nRHJhZ1JlZi5jdXJyZW50ID0ge1xuICAgICAgdHlwZTogJ3NlY3Rpb24tcmVzaXplJyxcbiAgICAgIHRva2VuOiBgc2VjdGlvbi1yZXNpemU6JHtkYXRhLnNlY3Rpb25JZH1gLFxuICAgICAgcG9pbnRlcklkOiBldmVudC5wb2ludGVySWQsXG4gICAgICBzdGFydFg6IGV2ZW50LmNsaWVudFgsXG4gICAgICBtb3ZlZDogZmFsc2UsXG4gICAgICBzZWN0aW9uSWQ6IGRhdGEuc2VjdGlvbklkLFxuICAgICAgc2VjdGlvbkluZGV4OiBkYXRhLnNlY3Rpb25JbmRleCxcbiAgICAgIHNlY3Rpb25MYWJlbDogZGF0YS5zZWN0aW9uTGFiZWwsXG4gICAgICBmaWVsZCxcbiAgICAgIHN0YXJ0RXh0ZW50OiBOdW1iZXIoY3VycmVudC5kb2N1bWVudC5zZWN0aW9uc1tkYXRhLnNlY3Rpb25JbmRleF1bZmllbGRdKSxcbiAgICAgIHN0YXJ0TWF4V1U6IE1hdGgubWF4KDAuMDAxLCBjdXJyZW50LmNvbXBpbGVkUGxhbj8ubWF4U3RvcnlXVSB8fCBtYXhXVSksXG4gICAgICBzdGFydFNjcm9sbFdpZHRoOiBNYXRoLm1heCgxLCBsYW5lc1JlZi5jdXJyZW50Py5zY3JvbGxXaWR0aCB8fCAxKSxcbiAgICAgIHBsYXloZWFkQ29udGV4dDogY2FwdHVyZUFib3V0TmFycmF0aXZlUGxheWhlYWRDb250ZXh0KHtcbiAgICAgICAgcGxhbjogY3VycmVudC5jb21waWxlZFBsYW4sXG4gICAgICAgIHN0b3J5V1U6IGN1cnJlbnQudHJhbnNwb3J0LnN0b3J5V1UsXG4gICAgICAgIHJlc2l6ZWRTZWN0aW9uSWQ6IGRhdGEuc2VjdGlvbklkLFxuICAgICAgfSksXG4gICAgICBzZWxlY3Rpb246IHsgdHlwZTogJ3NlY3Rpb24nLCBzZWN0aW9uSWQ6IGRhdGEuc2VjdGlvbklkIH0sXG4gICAgfTtcbiAgICBzZXRTZWN0aW9uUmVzaXplUHJldmlldyh7IHNlY3Rpb25JZDogZGF0YS5zZWN0aW9uSWQsIGV4dGVudDogTnVtYmVyKGN1cnJlbnQuZG9jdW1lbnQuc2VjdGlvbnNbZGF0YS5zZWN0aW9uSW5kZXhdW2ZpZWxkXSkgfSk7XG4gIH07XG5cbiAgY29uc3QgbW92ZVNlY3Rpb25SZXNpemUgPSAoZXZlbnQpID0+IHtcbiAgICBjb25zdCBkcmFnID0gdGltaW5nRHJhZ1JlZi5jdXJyZW50O1xuICAgIGlmIChkcmFnPy50eXBlICE9PSAnc2VjdGlvbi1yZXNpemUnIHx8IGRyYWcucG9pbnRlcklkICE9PSBldmVudC5wb2ludGVySWQpIHJldHVybjtcbiAgICBpZiAoIWRyYWcubW92ZWQgJiYgTWF0aC5hYnMoZXZlbnQuY2xpZW50WCAtIGRyYWcuc3RhcnRYKSA8IDMpIHJldHVybjtcbiAgICBkcmFnLm1vdmVkID0gdHJ1ZTtcbiAgICBjb25zdCByYXdFeHRlbnQgPSBkcmFnLnN0YXJ0RXh0ZW50ICsgKCgoZXZlbnQuY2xpZW50WCAtIGRyYWcuc3RhcnRYKSAvIGRyYWcuc3RhcnRTY3JvbGxXaWR0aCkgKiBkcmFnLnN0YXJ0TWF4V1UpO1xuICAgIGNvbnN0IHN0ZXAgPSBldmVudC5hbHRLZXkgPyAwLjAxIDogZXZlbnQuc2hpZnRLZXkgPyAwLjI1IDogMC4wNTtcbiAgICBjb25zdCBleHRlbnQgPSBNYXRoLm1pbig4LCBNYXRoLm1heCgxLCBNYXRoLnJvdW5kKHJhd0V4dGVudCAvIHN0ZXApICogc3RlcCkpO1xuICAgIGlmIChNYXRoLmFicyhleHRlbnQgLSAoZHJhZy5sYXN0RXh0ZW50ID8/IGRyYWcuc3RhcnRFeHRlbnQpKSA8IDAuMDAwMDAxKSByZXR1cm47XG4gICAgZHJhZy5sYXN0RXh0ZW50ID0gTnVtYmVyKGV4dGVudC50b0ZpeGVkKDIpKTtcbiAgICBzZXRTZWN0aW9uUmVzaXplUHJldmlldyh7IHNlY3Rpb25JZDogZHJhZy5zZWN0aW9uSWQsIGV4dGVudDogZHJhZy5sYXN0RXh0ZW50IH0pO1xuICAgIHF1ZXVlUHJldmlld0ZyYW1lKCgpID0+IHtcbiAgICAgIHN0b3JlLnVwZGF0ZVByZXZpZXcoKGRyYWZ0KSA9PiB7XG4gICAgICAgIGRyYWZ0LnNlY3Rpb25zW2RyYWcuc2VjdGlvbkluZGV4XVtkcmFnLmZpZWxkXSA9IGRyYWcubGFzdEV4dGVudDtcbiAgICAgIH0pO1xuICAgICAgc3RvcmUuc2V0VHJhbnNwb3J0KHtcbiAgICAgICAgb3duZXI6ICd0aW1lbGluZScsXG4gICAgICAgIHBsYXlpbmc6IGZhbHNlLFxuICAgICAgICBzdG9yeVdVOiByZW1hcEFib3V0TmFycmF0aXZlUGxheWhlYWRDb250ZXh0KGRyYWcucGxheWhlYWRDb250ZXh0LCBzdG9yZS5nZXRTbmFwc2hvdCgpLmNvbXBpbGVkUGxhbiksXG4gICAgICB9KTtcbiAgICB9KTtcbiAgfTtcblxuICBjb25zdCBlbmRTZWN0aW9uUmVzaXplID0gKGV2ZW50KSA9PiB7XG4gICAgY29uc3QgZHJhZyA9IHRpbWluZ0RyYWdSZWYuY3VycmVudDtcbiAgICBpZiAoZHJhZz8udHlwZSAhPT0gJ3NlY3Rpb24tcmVzaXplJyB8fCBkcmFnLnBvaW50ZXJJZCAhPT0gZXZlbnQucG9pbnRlcklkKSByZXR1cm47XG4gICAgaWYgKGV2ZW50LmN1cnJlbnRUYXJnZXQuaGFzUG9pbnRlckNhcHR1cmU/LihldmVudC5wb2ludGVySWQpKSBldmVudC5jdXJyZW50VGFyZ2V0LnJlbGVhc2VQb2ludGVyQ2FwdHVyZShldmVudC5wb2ludGVySWQpO1xuICAgIGZsdXNoUHJldmlld0ZyYW1lKCk7XG4gICAgaWYgKGV2ZW50LnR5cGUgPT09ICdwb2ludGVyY2FuY2VsJyB8fCAhZHJhZy5tb3ZlZCkgc3RvcmUuY2FuY2VsUHJldmlldygpO1xuICAgIGVsc2Ugc3RvcmUuY29tbWl0UHJldmlldyhkcmFnLnNlbGVjdGlvbik7XG4gICAgdGltaW5nRHJhZ1JlZi5jdXJyZW50ID0gbnVsbDtcbiAgICBzZXRTZWN0aW9uUmVzaXplUHJldmlldyhudWxsKTtcbiAgfTtcblxuICBjb25zdCByZXNldFNlY3Rpb25FeHRlbnQgPSAoc2VjdGlvbklkLCBzZWN0aW9uSW5kZXgpID0+IHtcbiAgICBjb25zdCBjdXJyZW50ID0gc3RvcmUuZ2V0U25hcHNob3QoKTtcbiAgICBjb25zdCBmaWVsZCA9IGdldEFib3V0TmFycmF0aXZlRXh0ZW50RmllbGQoY3VycmVudC5wcmV2aWV3UHJvZmlsZSk7XG4gICAgY29uc3QgYmFzZWxpbmVTZWN0aW9uID0gY3VycmVudC5iYXNlbGluZURvY3VtZW50LnNlY3Rpb25zLmZpbmQoKGl0ZW0pID0+IGl0ZW0uaWQgPT09IHNlY3Rpb25JZCk7XG4gICAgaWYgKCFiYXNlbGluZVNlY3Rpb24gfHwgYmFzZWxpbmVTZWN0aW9uW2ZpZWxkXSA9PT0gY3VycmVudC5kb2N1bWVudC5zZWN0aW9uc1tzZWN0aW9uSW5kZXhdW2ZpZWxkXSkgcmV0dXJuO1xuICAgIGNvbnN0IGNvbnRleHQgPSBjYXB0dXJlQWJvdXROYXJyYXRpdmVQbGF5aGVhZENvbnRleHQoe1xuICAgICAgcGxhbjogY3VycmVudC5jb21waWxlZFBsYW4sXG4gICAgICBzdG9yeVdVOiBjdXJyZW50LnRyYW5zcG9ydC5zdG9yeVdVLFxuICAgICAgcmVzaXplZFNlY3Rpb25JZDogc2VjdGlvbklkLFxuICAgIH0pO1xuICAgIHN0b3JlLmJlZ2luUHJldmlldygnUmVzdG9yZSBzYXZlZCBTZWN0aW9uIGxlbmd0aCcpO1xuICAgIHN0b3JlLnVwZGF0ZVByZXZpZXcoKGRyYWZ0KSA9PiB7IGRyYWZ0LnNlY3Rpb25zW3NlY3Rpb25JbmRleF1bZmllbGRdID0gYmFzZWxpbmVTZWN0aW9uW2ZpZWxkXTsgfSk7XG4gICAgc3RvcmUuc2V0VHJhbnNwb3J0KHsgc3RvcnlXVTogcmVtYXBBYm91dE5hcnJhdGl2ZVBsYXloZWFkQ29udGV4dChjb250ZXh0LCBzdG9yZS5nZXRTbmFwc2hvdCgpLmNvbXBpbGVkUGxhbikgfSk7XG4gICAgc3RvcmUuY29tbWl0UHJldmlldyh7IHR5cGU6ICdzZWN0aW9uJywgc2VjdGlvbklkIH0pO1xuICB9O1xuXG4gIGNvbnN0IGJlZ2luTWFycXVlZSA9IChldmVudCkgPT4ge1xuICAgIGlmIChldmVudC5idXR0b24gIT09IDAgfHwgZXZlbnQudGFyZ2V0ICE9PSBldmVudC5jdXJyZW50VGFyZ2V0KSByZXR1cm47XG4gICAgY29uc3QgY2FudmFzID0gbGFuZXNSZWYuY3VycmVudD8ucXVlcnlTZWxlY3RvcignLmFib3V0LWVkaXRvci10aW1lbGluZS1jYW52YXMnKTtcbiAgICBpZiAoIWNhbnZhcykgcmV0dXJuO1xuICAgIGV2ZW50LnByZXZlbnREZWZhdWx0KCk7XG4gICAgZXZlbnQuY3VycmVudFRhcmdldC5zZXRQb2ludGVyQ2FwdHVyZT8uKGV2ZW50LnBvaW50ZXJJZCk7XG4gICAgY29uc3QgcmVjdCA9IGNhbnZhcy5nZXRCb3VuZGluZ0NsaWVudFJlY3QoKTtcbiAgICB0aW1pbmdEcmFnUmVmLmN1cnJlbnQgPSB7XG4gICAgICB0eXBlOiAnbWFycXVlZScsXG4gICAgICBwb2ludGVySWQ6IGV2ZW50LnBvaW50ZXJJZCxcbiAgICAgIHN0YXJ0Q2xpZW50WDogZXZlbnQuY2xpZW50WCxcbiAgICAgIHN0YXJ0Q2xpZW50WTogZXZlbnQuY2xpZW50WSxcbiAgICAgIGNhbnZhc1JlY3Q6IHJlY3QsXG4gICAgICBhZGRpdGl2ZTogZXZlbnQuc2hpZnRLZXksXG4gICAgfTtcbiAgICBzZXRNYXJxdWVlKHsgbGVmdDogZXZlbnQuY2xpZW50WCAtIHJlY3QubGVmdCwgdG9wOiBldmVudC5jbGllbnRZIC0gcmVjdC50b3AsIHdpZHRoOiAwLCBoZWlnaHQ6IDAgfSk7XG4gIH07XG5cbiAgY29uc3QgbW92ZU1hcnF1ZWUgPSAoZXZlbnQpID0+IHtcbiAgICBjb25zdCBkcmFnID0gdGltaW5nRHJhZ1JlZi5jdXJyZW50O1xuICAgIGlmIChkcmFnPy50eXBlICE9PSAnbWFycXVlZScgfHwgZHJhZy5wb2ludGVySWQgIT09IGV2ZW50LnBvaW50ZXJJZCkgcmV0dXJuO1xuICAgIGNvbnN0IGxlZnQgPSBNYXRoLm1pbihkcmFnLnN0YXJ0Q2xpZW50WCwgZXZlbnQuY2xpZW50WCkgLSBkcmFnLmNhbnZhc1JlY3QubGVmdDtcbiAgICBjb25zdCB0b3AgPSBNYXRoLm1pbihkcmFnLnN0YXJ0Q2xpZW50WSwgZXZlbnQuY2xpZW50WSkgLSBkcmFnLmNhbnZhc1JlY3QudG9wO1xuICAgIHNldE1hcnF1ZWUoe1xuICAgICAgbGVmdCxcbiAgICAgIHRvcCxcbiAgICAgIHdpZHRoOiBNYXRoLmFicyhldmVudC5jbGllbnRYIC0gZHJhZy5zdGFydENsaWVudFgpLFxuICAgICAgaGVpZ2h0OiBNYXRoLmFicyhldmVudC5jbGllbnRZIC0gZHJhZy5zdGFydENsaWVudFkpLFxuICAgIH0pO1xuICB9O1xuXG4gIGNvbnN0IGVuZE1hcnF1ZWUgPSAoZXZlbnQpID0+IHtcbiAgICBjb25zdCBkcmFnID0gdGltaW5nRHJhZ1JlZi5jdXJyZW50O1xuICAgIGlmIChkcmFnPy50eXBlICE9PSAnbWFycXVlZScgfHwgZHJhZy5wb2ludGVySWQgIT09IGV2ZW50LnBvaW50ZXJJZCkgcmV0dXJuO1xuICAgIGlmIChldmVudC5jdXJyZW50VGFyZ2V0Lmhhc1BvaW50ZXJDYXB0dXJlPy4oZXZlbnQucG9pbnRlcklkKSkgZXZlbnQuY3VycmVudFRhcmdldC5yZWxlYXNlUG9pbnRlckNhcHR1cmUoZXZlbnQucG9pbnRlcklkKTtcbiAgICBpZiAoZXZlbnQudHlwZSAhPT0gJ3BvaW50ZXJjYW5jZWwnKSB7XG4gICAgICBjb25zdCBzZWxlY3Rpb25SZWN0ID0ge1xuICAgICAgICBsZWZ0OiBNYXRoLm1pbihkcmFnLnN0YXJ0Q2xpZW50WCwgZXZlbnQuY2xpZW50WCksXG4gICAgICAgIHJpZ2h0OiBNYXRoLm1heChkcmFnLnN0YXJ0Q2xpZW50WCwgZXZlbnQuY2xpZW50WCksXG4gICAgICAgIHRvcDogTWF0aC5taW4oZHJhZy5zdGFydENsaWVudFksIGV2ZW50LmNsaWVudFkpLFxuICAgICAgICBib3R0b206IE1hdGgubWF4KGRyYWcuc3RhcnRDbGllbnRZLCBldmVudC5jbGllbnRZKSxcbiAgICAgIH07XG4gICAgICBjb25zdCBsYW5lUmVjdCA9IGxhbmVzUmVmLmN1cnJlbnQ/LmdldEJvdW5kaW5nQ2xpZW50UmVjdCgpO1xuICAgICAgY29uc3QgaGl0cyA9IFsuLi4obGFuZXNSZWYuY3VycmVudD8ucXVlcnlTZWxlY3RvckFsbCgnLmFib3V0LWVkaXRvci1jdWVbZGF0YS1jdWUtaWRdJykgfHwgW10pXVxuICAgICAgICAuZmlsdGVyKChub2RlKSA9PiB7XG4gICAgICAgICAgY29uc3QgcmVjdCA9IG5vZGUuZ2V0Qm91bmRpbmdDbGllbnRSZWN0KCk7XG4gICAgICAgICAgY29uc3QgdmlzaWJsZSA9IGxhbmVSZWN0ICYmIHJlY3QucmlnaHQgPj0gbGFuZVJlY3QubGVmdCAmJiByZWN0LmxlZnQgPD0gbGFuZVJlY3QucmlnaHQ7XG4gICAgICAgICAgcmV0dXJuIHZpc2libGUgJiYgcmVjdC5yaWdodCA+PSBzZWxlY3Rpb25SZWN0LmxlZnQgJiYgcmVjdC5sZWZ0IDw9IHNlbGVjdGlvblJlY3QucmlnaHRcbiAgICAgICAgICAgICYmIHJlY3QuYm90dG9tID49IHNlbGVjdGlvblJlY3QudG9wICYmIHJlY3QudG9wIDw9IHNlbGVjdGlvblJlY3QuYm90dG9tO1xuICAgICAgICB9KVxuICAgICAgICAubWFwKChub2RlKSA9PiAoeyB0eXBlOiAnY3VlJywgc2VjdGlvbklkOiBub2RlLmRhdGFzZXQuc2VjdGlvbklkLCBjdWVJZDogbm9kZS5kYXRhc2V0LmN1ZUlkLCBrZXlQYXJ0OiAnZm9jdXMnIH0pKTtcbiAgICAgIGlmIChoaXRzLmxlbmd0aCkge1xuICAgICAgICBsZXQgbmV4dFNlbGVjdGlvbiA9IGRyYWcuYWRkaXRpdmUgPyBzdG9yZS5nZXRTbmFwc2hvdCgpLnNlbGVjdGlvbiA6IGhpdHNbMF07XG4gICAgICAgIGhpdHMuc2xpY2UoZHJhZy5hZGRpdGl2ZSA/IDAgOiAxKS5mb3JFYWNoKChoaXQpID0+IHtcbiAgICAgICAgICBuZXh0U2VsZWN0aW9uID0gdG9nZ2xlQWJvdXROYXJyYXRpdmVDdWVTZWxlY3Rpb24obmV4dFNlbGVjdGlvbiwgaGl0KTtcbiAgICAgICAgfSk7XG4gICAgICAgIHN0b3JlLnNldFNlbGVjdGlvbihuZXh0U2VsZWN0aW9uKTtcbiAgICAgIH1cbiAgICB9XG4gICAgdGltaW5nRHJhZ1JlZi5jdXJyZW50ID0gbnVsbDtcbiAgICBzZXRNYXJxdWVlKG51bGwpO1xuICB9O1xuXG4gIHJldHVybiAoXG4gICAgPGRpdiBjbGFzc05hbWU9XCJhYm91dC1lZGl0b3ItdGltZWxpbmVcIj5cbiAgICAgIDxkaXYgY2xhc3NOYW1lPVwiYWJvdXQtZWRpdG9yLWxhbmUtbGFiZWxzXCIgYXJpYS1sYWJlbD1cIlRpbWVsaW5lIHRyYWNrc1wiPlxuICAgICAgICB7VElNRUxJTkVfR0xPQkFMX1RSQUNLUy5tYXAoKHRyYWNrKSA9PiAoXG4gICAgICAgICAgdHJhY2suZ3JvdXBJZHMubGVuZ3RoID8gKFxuICAgICAgICAgICAgPGJ1dHRvblxuICAgICAgICAgICAgICB0eXBlPVwiYnV0dG9uXCJcbiAgICAgICAgICAgICAga2V5PXt0cmFjay5sYW5lfVxuICAgICAgICAgICAgICBjbGFzc05hbWU9e3NlbGVjdGlvbi50eXBlID09PSAnc2VxdWVuY2UnICYmIHNlbGVjdGlvbi50cmFjayA9PT0gdHJhY2subGFuZSA/ICdpcy1hY3RpdmUnIDogJyd9XG4gICAgICAgICAgICAgIGRhdGEtZ2xvYmFsLXRyYWNrPXt0cmFjay5sYW5lfVxuICAgICAgICAgICAgICBhcmlhLWxhYmVsPXtgT3BlbiBnbG9iYWwgJHt0cmFjay5sYWJlbH0gY29udHJvbHNgfVxuICAgICAgICAgICAgICBhcmlhLXByZXNzZWQ9e3NlbGVjdGlvbi50eXBlID09PSAnc2VxdWVuY2UnICYmIHNlbGVjdGlvbi50cmFjayA9PT0gdHJhY2subGFuZX1cbiAgICAgICAgICAgICAgb25DbGljaz17KCkgPT4gb25PcGVuR2xvYmFsPy4oeyB0eXBlOiAnc2VxdWVuY2UnLCB0cmFjazogdHJhY2subGFuZSwgdHJhY2tMYWJlbDogdHJhY2subGFiZWwsIGdyb3VwSWRzOiB0cmFjay5ncm91cElkcyB9KX1cbiAgICAgICAgICAgID57dHJhY2subGFiZWx9PC9idXR0b24+XG4gICAgICAgICAgKSA6IDxzcGFuIGtleT17dHJhY2subGFuZX0+e3RyYWNrLmxhYmVsfTwvc3Bhbj5cbiAgICAgICAgKSl9XG4gICAgICA8L2Rpdj5cbiAgICAgIDxkaXYgcmVmPXtsYW5lc1JlZn0gY2xhc3NOYW1lPVwiYWJvdXQtZWRpdG9yLWxhbmVzXCIgZGF0YS1zb2xvLXRyYWNrPXt0cmFuc3BvcnQuc29sb1RyYWNrIHx8ICcnfSBvbldoZWVsPXt6b29tVGltZWxpbmV9PlxuICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cImFib3V0LWVkaXRvci10aW1lbGluZS1jYW52YXNcIiBzdHlsZT17eyAnLS1hYm91dC1lZGl0b3ItcGxheWhlYWQnOiBwbGF5aGVhZCwgJy0tYWJvdXQtZWRpdG9yLXRpbWVsaW5lLXpvb20nOiBNYXRoLm1heCgxLCBOdW1iZXIodHJhbnNwb3J0Lnpvb20pIHx8IDEpIH19PlxuICAgICAgICAgIDxkaXYgY2xhc3NOYW1lPVwiYWJvdXQtZWRpdG9yLXBsYXloZWFkXCIgLz5cbiAgICAgICAgICB7bWFycXVlZSA/IDxkaXYgY2xhc3NOYW1lPVwiYWJvdXQtZWRpdG9yLW1hcnF1ZWVcIiBzdHlsZT17bWFycXVlZX0gYXJpYS1oaWRkZW49XCJ0cnVlXCIgLz4gOiBudWxsfVxuICAgICAgICAgIHtjYW1lcmFEcmFnUHJldmlldyA/IChcbiAgICAgICAgICA8ZGl2XG4gICAgICAgICAgICBjbGFzc05hbWU9e2BhYm91dC1lZGl0b3ItY2FtZXJhLWRyYWctZ2hvc3Qke2NhbWVyYURyYWdQcmV2aWV3LnZhbGlkID8gJycgOiAnIGlzLWludmFsaWQnfWB9XG4gICAgICAgICAgICBzdHlsZT17eyBsZWZ0OiBgJHtjYW1lcmFEcmFnUHJldmlldy5jb250ZW50WH1weGAgfX1cbiAgICAgICAgICAgIGFyaWEtaGlkZGVuPVwidHJ1ZVwiXG4gICAgICAgICAgPlxuICAgICAgICAgICAgPGkgLz5cbiAgICAgICAgICAgIDxzcGFuPntjYW1lcmFEcmFnUHJldmlldy52YWxpZCA/IGAke2NhbWVyYURyYWdQcmV2aWV3LnNlY3Rpb25MYWJlbH0gwrcgJHtmb3JtYXRDYW1lcmFQZXJjZW50KGNhbWVyYURyYWdQcmV2aWV3LmF0KX1gIDogY2FtZXJhRHJhZ1ByZXZpZXcucmVhc29ufTwvc3Bhbj5cbiAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICApIDogbnVsbH1cbiAgICAgICAgICB7WydzZWN0aW9uJywgJ2NhbWVyYScsICd3b3JsZCcsICd0ZXh0JywgJ2ludGVyYWN0aW9uJ10ubWFwKChsYW5lKSA9PiAoXG4gICAgICAgICAgPGRpdiBjbGFzc05hbWU9e2BhYm91dC1lZGl0b3ItbGFuZSBhYm91dC1lZGl0b3ItbGFuZS0tJHtsYW5lfWB9IGtleT17bGFuZX0+XG4gICAgICAgICAgICB7ZG9jdW1lbnQuc2VjdGlvbnMubWFwKChzZWN0aW9uLCBzZWN0aW9uSW5kZXgpID0+IHtcbiAgICAgICAgICAgICAgY29uc3QgY29tcGlsZWQgPSBjb21waWxlZFBsYW4/LnNlY3Rpb25zPy5bc2VjdGlvbkluZGV4XTtcbiAgICAgICAgICAgICAgY29uc3Qgc3RhcnRXVSA9IE1hdGgubWluKG1heFdVLCBjb21waWxlZD8uc3RhcnRXVSB8fCAwKTtcbiAgICAgICAgICAgICAgY29uc3QgbmV4dFN0YXJ0V1UgPSBNYXRoLm1pbihtYXhXVSwgY29tcGlsZWRQbGFuPy5zZWN0aW9ucz8uW3NlY3Rpb25JbmRleCArIDFdPy5zdGFydFdVID8/IG1heFdVKTtcbiAgICAgICAgICAgICAgY29uc3Qgc3BhbldVID0gTWF0aC5tYXgoMC4wMDEsIG5leHRTdGFydFdVIC0gc3RhcnRXVSk7XG4gICAgICAgICAgICAgIGNvbnN0IHdpZHRoID0gYCR7KHNwYW5XVSAvIG1heFdVKSAqIDEwMH0lYDtcbiAgICAgICAgICAgICAgY29uc3QgaW5TZWxlY3RlZFNlY3Rpb24gPSBzZWxlY3Rpb24uc2VjdGlvbklkID09PSBzZWN0aW9uLmlkO1xuICAgICAgICAgICAgICBjb25zdCBsb2NhbFBlcmNlbnQgPSAoYXQpID0+IE1hdGgubWluKDEwMCwgKE51bWJlcihhdCB8fCAwKSAqIChjb21waWxlZD8udHJhdmVsV1UgfHwgc3BhbldVKSAvIHNwYW5XVSkgKiAxMDApO1xuICAgICAgICAgICAgICBjb25zdCBsb2NhbFBvc2l0aW9uID0gKGF0KSA9PiBgJHtsb2NhbFBlcmNlbnQoYXQpfSVgO1xuICAgICAgICAgICAgICBjb25zdCBleHRlbmRlZExvY2FsUG9zaXRpb24gPSAoYXQpID0+IGAkeyhOdW1iZXIoYXQgfHwgMCkgKiAoY29tcGlsZWQ/LnRyYXZlbFdVIHx8IHNwYW5XVSkgLyBzcGFuV1UpICogMTAwfSVgO1xuICAgICAgICAgICAgICBjb25zdCBleHRlbmRlZExvY2FsV2lkdGggPSAoZnJvbSwgdG8pID0+IGAke01hdGgubWF4KDAuMzUsIChOdW1iZXIodG8pIC0gTnVtYmVyKGZyb20pKSAqIChjb21waWxlZD8udHJhdmVsV1UgfHwgc3BhbldVKSAvIHNwYW5XVSAqIDEwMCl9JWA7XG4gICAgICAgICAgICAgIGNvbnN0IHRleHRQb3NpdGlvbiA9IChhdCkgPT4gYCR7Y2xhbXAwMShOdW1iZXIoYXQgfHwgMCkpICogMTAwfSVgO1xuICAgICAgICAgICAgICBjb25zdCBzZWxlY3RBdCA9IChuZXh0U2VsZWN0aW9uLCBhdCA9IDApID0+IHtcbiAgICAgICAgICAgICAgICBzdG9yZS5zZXRTZWxlY3Rpb24oeyBzZWN0aW9uSWQ6IHNlY3Rpb24uaWQsIC4uLm5leHRTZWxlY3Rpb24gfSk7XG4gICAgICAgICAgICAgICAgc3RvcmUuc2V0VHJhbnNwb3J0KHtcbiAgICAgICAgICAgICAgICAgIG93bmVyOiAndGltZWxpbmUnLFxuICAgICAgICAgICAgICAgICAgcGxheWluZzogZmFsc2UsXG4gICAgICAgICAgICAgICAgICBzdG9yeVdVOiBzdGFydFdVICsgKE51bWJlcihhdCB8fCAwKSAqIChjb21waWxlZD8udHJhdmVsV1UgfHwgMCkpLFxuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgICBpZiAobGFuZSA9PT0gJ3NlY3Rpb24nKSB7XG4gICAgICAgICAgICAgICAgY29uc3QgaXNTZWxlY3RlZCA9IGluU2VsZWN0ZWRTZWN0aW9uICYmIHNlbGVjdGlvbi50eXBlID09PSAnc2VjdGlvbic7XG4gICAgICAgICAgICAgICAgY29uc3QgcmVzaXplRXh0ZW50ID0gc2VjdGlvblJlc2l6ZVByZXZpZXc/LnNlY3Rpb25JZCA9PT0gc2VjdGlvbi5pZFxuICAgICAgICAgICAgICAgICAgPyBzZWN0aW9uUmVzaXplUHJldmlldy5leHRlbnRcbiAgICAgICAgICAgICAgICAgIDogTnVtYmVyKHNlY3Rpb25bZ2V0QWJvdXROYXJyYXRpdmVFeHRlbnRGaWVsZChzbmFwc2hvdC5wcmV2aWV3UHJvZmlsZSldKTtcbiAgICAgICAgICAgICAgICByZXR1cm4gKFxuICAgICAgICAgICAgICAgICAgPGRpdlxuICAgICAgICAgICAgICAgICAgICBrZXk9e3NlY3Rpb24uaWR9XG4gICAgICAgICAgICAgICAgICAgIGNsYXNzTmFtZT17YGFib3V0LWVkaXRvci1zZWN0aW9uLWNsaXAke2lzU2VsZWN0ZWQgPyAnIGlzLXNlbGVjdGVkJyA6ICcnfSR7aW5TZWxlY3RlZFNlY3Rpb24gPyAnIGlzLWNvbnRleHQnIDogJyd9YH1cbiAgICAgICAgICAgICAgICAgICAgc3R5bGU9e3sgd2lkdGggfX1cbiAgICAgICAgICAgICAgICAgICAgdGl0bGU9e2Ake3NlY3Rpb24ubGFiZWx9IMK3ICR7Zm9ybWF0V1UoY29tcGlsZWQ/LnJlc29sdmVkRXh0ZW50V1UgfHwgc2VjdGlvbi5leHRlbnRXVSl9YH1cbiAgICAgICAgICAgICAgICAgID5cbiAgICAgICAgICAgICAgICAgICAgPGJ1dHRvbiB0eXBlPVwiYnV0dG9uXCIgYXJpYS1wcmVzc2VkPXtpc1NlbGVjdGVkfSBvbkNsaWNrPXsoKSA9PiBzZWxlY3RBdCh7IHR5cGU6ICdzZWN0aW9uJyB9KX0+XG4gICAgICAgICAgICAgICAgICAgICAgPHNwYW4+e1N0cmluZyhzZWN0aW9uSW5kZXggKyAxKS5wYWRTdGFydCgyLCAnMCcpfTwvc3Bhbj57c2VjdGlvbi5sYWJlbH1cbiAgICAgICAgICAgICAgICAgICAgPC9idXR0b24+XG4gICAgICAgICAgICAgICAgICAgIHtzZWN0aW9uUmVzaXplUHJldmlldz8uc2VjdGlvbklkID09PSBzZWN0aW9uLmlkID8gPG91dHB1dD57Zm9ybWF0V1UoTWF0aC5tYXgoMCwgcmVzaXplRXh0ZW50IC0gMSkpfSBzY3JvbGwgwrcge2Zvcm1hdFdVKHJlc2l6ZUV4dGVudCl9IHRvdGFsPC9vdXRwdXQ+IDogbnVsbH1cbiAgICAgICAgICAgICAgICAgICAgPGJ1dHRvblxuICAgICAgICAgICAgICAgICAgICAgIHR5cGU9XCJidXR0b25cIlxuICAgICAgICAgICAgICAgICAgICAgIGNsYXNzTmFtZT1cImFib3V0LWVkaXRvci1zZWN0aW9uLXJlc2l6ZVwiXG4gICAgICAgICAgICAgICAgICAgICAgZGlzYWJsZWQ9e3NlY3Rpb24ubG9ja2VkfVxuICAgICAgICAgICAgICAgICAgICAgIGFyaWEtbGFiZWw9e2BSZXNpemUgJHtzZWN0aW9uLmxhYmVsfWB9XG4gICAgICAgICAgICAgICAgICAgICAgdGl0bGU9e3NlY3Rpb24ubG9ja2VkID8gJ1VubG9jayB0aGlzIHByb3RlY3RlZCBTZWN0aW9uIHRvIHJlc2l6ZSBpdCcgOiBgRHJhZyB0byBjaGFuZ2UgJHtzbmFwc2hvdC5wcmV2aWV3UHJvZmlsZSA9PT0gJ21vYmlsZScgPyAnbW9iaWxlJyA6ICdkZXNrdG9wJ30gc2Nyb2xsIGxlbmd0aCDCtyBkb3VibGUtY2xpY2sgdG8gcmVzdG9yZSBzYXZlZCBsZW5ndGhgfVxuICAgICAgICAgICAgICAgICAgICAgIG9uRG91YmxlQ2xpY2s9eyhldmVudCkgPT4geyBldmVudC5wcmV2ZW50RGVmYXVsdCgpOyBldmVudC5zdG9wUHJvcGFnYXRpb24oKTsgcmVzZXRTZWN0aW9uRXh0ZW50KHNlY3Rpb24uaWQsIHNlY3Rpb25JbmRleCk7IH19XG4gICAgICAgICAgICAgICAgICAgICAgb25Qb2ludGVyRG93bj17KGV2ZW50KSA9PiBiZWdpblNlY3Rpb25SZXNpemUoZXZlbnQsIHsgc2VjdGlvbklkOiBzZWN0aW9uLmlkLCBzZWN0aW9uSW5kZXgsIHNlY3Rpb25MYWJlbDogc2VjdGlvbi5sYWJlbCwgbG9ja2VkOiBzZWN0aW9uLmxvY2tlZCB9KX1cbiAgICAgICAgICAgICAgICAgICAgICBvblBvaW50ZXJNb3ZlPXttb3ZlU2VjdGlvblJlc2l6ZX1cbiAgICAgICAgICAgICAgICAgICAgICBvblBvaW50ZXJVcD17ZW5kU2VjdGlvblJlc2l6ZX1cbiAgICAgICAgICAgICAgICAgICAgICBvblBvaW50ZXJDYW5jZWw9e2VuZFNlY3Rpb25SZXNpemV9XG4gICAgICAgICAgICAgICAgICAgIC8+XG4gICAgICAgICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgICAgICApO1xuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgIGlmIChsYW5lID09PSAnY2FtZXJhJykge1xuICAgICAgICAgICAgICAgIHJldHVybiAoXG4gICAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cImFib3V0LWVkaXRvci1jbGlwXCIga2V5PXtzZWN0aW9uLmlkfSBzdHlsZT17eyB3aWR0aCB9fT5cbiAgICAgICAgICAgICAgICAgICAgPGRpdiBjbGFzc05hbWU9XCJhYm91dC1lZGl0b3ItY2FtZXJhLXJhaWxcIiBhcmlhLWhpZGRlbj1cInRydWVcIj5cbiAgICAgICAgICAgICAgICAgICAgICB7c2VjdGlvbi5jYW1lcmEua2V5cy5zbGljZSgxKS5tYXAoKGtleSwga2V5SW5kZXgpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IGZyb21LZXkgPSBzZWN0aW9uLmNhbWVyYS5rZXlzW2tleUluZGV4XTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IGxlZnQgPSBsb2NhbFBlcmNlbnQoZnJvbUtleS5hdCk7XG4gICAgICAgICAgICAgICAgICAgICAgICBjb25zdCByaWdodCA9IGxvY2FsUGVyY2VudChrZXkuYXQpO1xuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIChcbiAgICAgICAgICAgICAgICAgICAgICAgICAgPHNwYW5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjbGFzc05hbWU9e2NhbWVyYVBvc2VDaGFuZ2VzKGZyb21LZXksIGtleSkgPyAnaXMtYXV0aG9yZWQtbW90aW9uJyA6ICdpcy1iYXNlLWRvbGx5J31cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBrZXk9e2Ake3NlY3Rpb24uaWR9OmNhbWVyYS1zcGFuOiR7a2V5SW5kZXh9YH1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBzdHlsZT17eyBsZWZ0OiBgJHtsZWZ0fSVgLCB3aWR0aDogYCR7TWF0aC5tYXgoMC41LCByaWdodCAtIGxlZnQpfSVgIH19XG4gICAgICAgICAgICAgICAgICAgICAgICAgIC8+XG4gICAgICAgICAgICAgICAgICAgICAgICApO1xuICAgICAgICAgICAgICAgICAgICAgIH0pfVxuICAgICAgICAgICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgICAgICAgICAge3NlY3Rpb24uY2FtZXJhLmtleXMubWFwKChrZXksIGtleUluZGV4KSA9PiB7XG4gICAgICAgICAgICAgICAgICAgICAgY29uc3QgdGltaW5nQm91bmRzID0gZ2V0QWJvdXROYXJyYXRpdmVDYW1lcmFLZXlUaW1pbmdCb3VuZHMoc2VjdGlvbi5jYW1lcmEua2V5cywga2V5SW5kZXgpO1xuICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IHRva2VuID0gYGNhbWVyYToke3NlY3Rpb24uaWR9OiR7a2V5SW5kZXh9YDtcbiAgICAgICAgICAgICAgICAgICAgICBjb25zdCBrZXlTZWxlY3Rpb24gPSB7IHR5cGU6ICdjYW1lcmEta2V5Jywgc2VjdGlvbklkOiBzZWN0aW9uLmlkLCBrZXlJbmRleCB9O1xuICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IGlzU2VsZWN0ZWQgPSBpblNlbGVjdGVkU2VjdGlvbiAmJiBzZWxlY3Rpb24udHlwZSA9PT0gJ2NhbWVyYS1rZXknICYmIHNlbGVjdGlvbi5rZXlJbmRleCA9PT0ga2V5SW5kZXg7XG4gICAgICAgICAgICAgICAgICAgICAgY29uc3QgcmVxdWlyZWQgPSB0aW1pbmdCb3VuZHMubG9ja2VkO1xuICAgICAgICAgICAgICAgICAgICAgIHJldHVybiAoXG4gICAgICAgICAgICAgICAgICAgICAgICA8YnV0dG9uXG4gICAgICAgICAgICAgICAgICAgICAgICAgIHR5cGU9XCJidXR0b25cIlxuICAgICAgICAgICAgICAgICAgICAgICAgICBrZXk9e3Rva2VufVxuICAgICAgICAgICAgICAgICAgICAgICAgICBjbGFzc05hbWU9e2BhYm91dC1lZGl0b3Ita2V5JHtyZXF1aXJlZCA/ICcgaXMtYm91bmRhcnknIDogJyBpcy1kcmFnZ2FibGUnfSR7aXNTZWxlY3RlZCA/ICcgaXMtc2VsZWN0ZWQnIDogJyd9JHtjYW1lcmFEcmFnUHJldmlldz8udG9rZW4gPT09IHRva2VuID8gJyBpcy1kcmFnLXNvdXJjZScgOiAnJ31gfVxuICAgICAgICAgICAgICAgICAgICAgICAgICBzdHlsZT17eyBsZWZ0OiBsb2NhbFBvc2l0aW9uKGtleS5hdCkgfX1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgdGl0bGU9e3JlcXVpcmVkXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgPyBgUHJvdGVjdGVkIENhbWVyYSBrZXkgYXQgJHtmb3JtYXRDYW1lcmFQZXJjZW50KGtleS5hdCl9IMK3IHNlbGVjdCB0byBpbnNwZWN0YFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIDogYENhbWVyYSBrZXkgYXQgJHtmb3JtYXRDYW1lcmFQZXJjZW50KGtleS5hdCl9IMK3IGRyYWcgYW55d2hlcmUgb24gdGhlIENhbWVyYSB0cmFja2B9XG4gICAgICAgICAgICAgICAgICAgICAgICAgIGFyaWEtbGFiZWw9e2Ake3JlcXVpcmVkID8gJ1Byb3RlY3RlZCAnIDogJyd9Q2FtZXJhIGtleSBhdCAke2Zvcm1hdENhbWVyYVBlcmNlbnQoa2V5LmF0KX0gdGhyb3VnaCAke3NlY3Rpb24ubGFiZWx9YH1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgYXJpYS1wcmVzc2VkPXtpc1NlbGVjdGVkfVxuICAgICAgICAgICAgICAgICAgICAgICAgICBvblBvaW50ZXJEb3duPXtyZXF1aXJlZCA/IHVuZGVmaW5lZCA6IChldmVudCkgPT4gYmVnaW5UaW1pbmdEcmFnKGV2ZW50LCB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdHlwZTogJ2NhbWVyYScsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdG9rZW4sXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgbG9ja2VkOiBmYWxzZSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBhdDoga2V5LmF0LFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHNlY3Rpb25JbmRleCxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBrZXlJbmRleCxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBzZWN0aW9uU3RhcnRXVTogc3RhcnRXVSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBzcGFuV1UsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdHJhdmVsV1U6IGNvbXBpbGVkPy50cmF2ZWxXVSB8fCBzcGFuV1UsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgc3RvcnlXVTogc3RhcnRXVSArIChOdW1iZXIoa2V5LmF0KSAqIChjb21waWxlZD8udHJhdmVsV1UgfHwgMCkpLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHNlbGVjdGlvbjoga2V5U2VsZWN0aW9uLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvYWxlc2NlS2V5OiBgdGltZWxpbmU6JHt0b2tlbn1gLFxuICAgICAgICAgICAgICAgICAgICAgICAgICB9KX1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgb25Qb2ludGVyTW92ZT17cmVxdWlyZWQgPyB1bmRlZmluZWQgOiBtb3ZlVGltaW5nRHJhZ31cbiAgICAgICAgICAgICAgICAgICAgICAgICAgb25Qb2ludGVyVXA9e3JlcXVpcmVkID8gdW5kZWZpbmVkIDogZW5kVGltaW5nRHJhZ31cbiAgICAgICAgICAgICAgICAgICAgICAgICAgb25Qb2ludGVyQ2FuY2VsPXtyZXF1aXJlZCA/IHVuZGVmaW5lZCA6IGVuZFRpbWluZ0RyYWd9XG4gICAgICAgICAgICAgICAgICAgICAgICAgIG9uQ2xpY2s9eygpID0+IGhhbmRsZVRpbWluZ0NsaWNrKHRva2VuLCAoKSA9PiBzZWxlY3RBdCh7IHR5cGU6ICdjYW1lcmEta2V5Jywga2V5SW5kZXggfSwga2V5LmF0KSl9XG4gICAgICAgICAgICAgICAgICAgICAgICAvPlxuICAgICAgICAgICAgICAgICAgICAgICk7XG4gICAgICAgICAgICAgICAgICAgIH0pfVxuICAgICAgICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgICAgICAgKTtcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICBpZiAobGFuZSA9PT0gJ3dvcmxkJykge1xuICAgICAgICAgICAgICAgIGNvbnN0IGlzU2VsZWN0ZWQgPSBpblNlbGVjdGVkU2VjdGlvbiAmJiBzZWxlY3Rpb24udHlwZSA9PT0gJ3dvcmxkJztcbiAgICAgICAgICAgICAgICBjb25zdCB0cmFuc2l0aW9uID0gc2VjdGlvbi53b3JsZC5tb2RlID09PSAnc2V0JyAmJiBzZWN0aW9uLndvcmxkLnRyYW5zaXRpb25Jbi50eXBlICE9PSAnY3V0J1xuICAgICAgICAgICAgICAgICAgPyBzZWN0aW9uLndvcmxkLnRyYW5zaXRpb25JblxuICAgICAgICAgICAgICAgICAgOiBudWxsO1xuICAgICAgICAgICAgICAgIHJldHVybiAoXG4gICAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzTmFtZT17YGFib3V0LWVkaXRvci1jbGlwJHtpc1NlbGVjdGVkID8gJyBpcy1zZWxlY3RlZCcgOiAnJ31gfSBrZXk9e3NlY3Rpb24uaWR9IHN0eWxlPXt7IHdpZHRoIH19PlxuICAgICAgICAgICAgICAgICAgICA8YnV0dG9uXG4gICAgICAgICAgICAgICAgICAgICAgdHlwZT1cImJ1dHRvblwiXG4gICAgICAgICAgICAgICAgICAgICAgY2xhc3NOYW1lPXtgYWJvdXQtZWRpdG9yLXdvcmxkLWNsaXAgJHtzZWN0aW9uLndvcmxkLm1vZGUgPT09ICdzZXQnID8gJ2hhcy13b3JsZCcgOiAnJ30ke2lzU2VsZWN0ZWQgPyAnIGlzLXNlbGVjdGVkJyA6ICcnfWB9XG4gICAgICAgICAgICAgICAgICAgICAgYXJpYS1wcmVzc2VkPXtpc1NlbGVjdGVkfVxuICAgICAgICAgICAgICAgICAgICAgIG9uQ2xpY2s9eygpID0+IHNlbGVjdEF0KHsgdHlwZTogJ3dvcmxkJyB9LCB0cmFuc2l0aW9uID8gdHJhbnNpdGlvbi5lbmQgOiAwKX1cbiAgICAgICAgICAgICAgICAgICAgPntzZWN0aW9uLndvcmxkLm1vZGUgPT09ICdzZXQnID8gc2VjdGlvbi53b3JsZC5zaGFwZUlkLnJlcGxhY2UoJy12MScsICcnKSA6ICdjb250aW51ZSd9PC9idXR0b24+XG4gICAgICAgICAgICAgICAgICAgIHt0cmFuc2l0aW9uID8gWydzdGFydCcsICdlbmQnXS5tYXAoKHBhcnQpID0+IChcbiAgICAgICAgICAgICAgICAgICAgICA8YnV0dG9uXG4gICAgICAgICAgICAgICAgICAgICAgICB0eXBlPVwiYnV0dG9uXCJcbiAgICAgICAgICAgICAgICAgICAgICAgIGtleT17cGFydH1cbiAgICAgICAgICAgICAgICAgICAgICAgIGNsYXNzTmFtZT17YGFib3V0LWVkaXRvci10aW1pbmcta2V5IGlzLXdvcmxkJHtpc1NlbGVjdGVkICYmIHNlbGVjdGlvbi5rZXlQYXJ0ID09PSBgdHJhbnNpdGlvbi0ke3BhcnR9YCA/ICcgaXMtc2VsZWN0ZWQnIDogJyd9YH1cbiAgICAgICAgICAgICAgICAgICAgICAgIHN0eWxlPXt7IGxlZnQ6IGV4dGVuZGVkTG9jYWxQb3NpdGlvbih0cmFuc2l0aW9uW3BhcnRdKSB9fVxuICAgICAgICAgICAgICAgICAgICAgICAgdGl0bGU9e2BXb3JsZCB0cmFuc2l0aW9uICR7cGFydH1gfVxuICAgICAgICAgICAgICAgICAgICAgICAgYXJpYS1sYWJlbD17YCR7c2VjdGlvbi5sYWJlbH0gV29ybGQgdHJhbnNpdGlvbiAke3BhcnR9YH1cbiAgICAgICAgICAgICAgICAgICAgICAgIG9uQ2xpY2s9eygpID0+IHNlbGVjdEF0KHsgdHlwZTogJ3dvcmxkJywga2V5UGFydDogYHRyYW5zaXRpb24tJHtwYXJ0fWAgfSwgdHJhbnNpdGlvbltwYXJ0XSl9XG4gICAgICAgICAgICAgICAgICAgICAgLz5cbiAgICAgICAgICAgICAgICAgICAgKSkgOiBudWxsfVxuICAgICAgICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgICAgICAgKTtcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICBpZiAobGFuZSA9PT0gJ3RleHQnKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIChcbiAgICAgICAgICAgICAgICAgIDxkaXZcbiAgICAgICAgICAgICAgICAgICAgY2xhc3NOYW1lPXtgYWJvdXQtZWRpdG9yLWNsaXAke3NlY3Rpb24udGV4dC5kaXNjaXBsaW5lUmV2ZWFsID8gJyBoYXMtZXh0ZW5kZWQtZGlzY2lwbGluZScgOiAnJ31gfVxuICAgICAgICAgICAgICAgICAgICBrZXk9e3NlY3Rpb24uaWR9XG4gICAgICAgICAgICAgICAgICAgIHN0eWxlPXt7IHdpZHRoIH19XG4gICAgICAgICAgICAgICAgICAgIG9uUG9pbnRlckRvd249e2JlZ2luTWFycXVlZX1cbiAgICAgICAgICAgICAgICAgICAgb25Qb2ludGVyTW92ZT17bW92ZU1hcnF1ZWV9XG4gICAgICAgICAgICAgICAgICAgIG9uUG9pbnRlclVwPXtlbmRNYXJxdWVlfVxuICAgICAgICAgICAgICAgICAgICBvblBvaW50ZXJDYW5jZWw9e2VuZE1hcnF1ZWV9XG4gICAgICAgICAgICAgICAgICA+XG4gICAgICAgICAgICAgICAgICAgIHsoc2VjdGlvbi50ZXh0LmN1ZXMgfHwgW10pLm1hcCgoY3VlKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgICAgY29uc3QgaXNTZWxlY3RlZCA9IHNlbGVjdGVkQ3VlTWVtYmVycy5zb21lKChtZW1iZXIpID0+IG1lbWJlci5zZWN0aW9uSWQgPT09IHNlY3Rpb24uaWQgJiYgbWVtYmVyLmN1ZUlkID09PSBjdWUuaWQpO1xuICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IGlzUHJpbWFyeSA9IHNlbGVjdGlvbi50eXBlID09PSAnY3VlJyAmJiBzZWxlY3Rpb24uc2VjdGlvbklkID09PSBzZWN0aW9uLmlkICYmIHNlbGVjdGlvbi5jdWVJZCA9PT0gY3VlLmlkO1xuICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IG1vdmVtZW50ID0gZ2V0QWJvdXROYXJyYXRpdmVDdWVNb3ZlbWVudChjdWUpO1xuICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IG1vdGlvbkludGVydmFsID0gbW92ZW1lbnQgPT09ICdzcGF0aWFsJ1xuICAgICAgICAgICAgICAgICAgICAgICAgPyBnZXRBYm91dE5hcnJhdGl2ZUN1ZU1vdGlvbkludGVydmFsKGN1ZSwgZG9jdW1lbnQuZ2xvYmFscy50ZXh0TW90aW9uKVxuICAgICAgICAgICAgICAgICAgICAgICAgOiBudWxsO1xuICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IG1vdGlvblNwYW4gPSBtb3Rpb25JbnRlcnZhbCA/IE1hdGgubWF4KDAuMDAwMDEsIG1vdGlvbkludGVydmFsLmVuZCAtIG1vdGlvbkludGVydmFsLnN0YXJ0KSA6IDA7XG4gICAgICAgICAgICAgICAgICAgICAgY29uc3QgY3VlU3R5bGUgPSBtb3Rpb25JbnRlcnZhbCA/IHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGxlZnQ6IHRleHRQb3NpdGlvbihtb3Rpb25JbnRlcnZhbC5zdGFydCksXG4gICAgICAgICAgICAgICAgICAgICAgICB3aWR0aDogYCR7TWF0aC5tYXgoMC41LCBtb3Rpb25TcGFuICogMTAwKX0lYCxcbiAgICAgICAgICAgICAgICAgICAgICB9IDogeyBsZWZ0OiB0ZXh0UG9zaXRpb24oY3VlLmhvbGQpIH07XG4gICAgICAgICAgICAgICAgICAgICAgY29uc3QgZm9jdXNQb3NpdGlvbiA9IG1vdGlvbkludGVydmFsXG4gICAgICAgICAgICAgICAgICAgICAgICA/IGAkeygoY3VlLmhvbGQgLSBtb3Rpb25JbnRlcnZhbC5zdGFydCkgLyBtb3Rpb25TcGFuKSAqIDEwMH0lYFxuICAgICAgICAgICAgICAgICAgICAgICAgOiAnNTAlJztcbiAgICAgICAgICAgICAgICAgICAgICBjb25zdCB0aW1pbmdCb3VuZHMgPSBnZXRBYm91dE5hcnJhdGl2ZUN1ZVRpbWluZ0JvdW5kcyhjdWUpO1xuICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IHRva2VuID0gYGN1ZToke3NlY3Rpb24uaWR9OiR7Y3VlLmlkfWA7XG4gICAgICAgICAgICAgICAgICAgICAgY29uc3QgY3VlU2VsZWN0aW9uID0geyB0eXBlOiAnY3VlJywgc2VjdGlvbklkOiBzZWN0aW9uLmlkLCBjdWVJZDogY3VlLmlkLCBrZXlQYXJ0OiAnZm9jdXMnIH07XG4gICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIChcbiAgICAgICAgICAgICAgICAgICAgICAgIDxidXR0b25cbiAgICAgICAgICAgICAgICAgICAgICAgICAgdHlwZT1cImJ1dHRvblwiXG4gICAgICAgICAgICAgICAgICAgICAgICAgIGNsYXNzTmFtZT17YGFib3V0LWVkaXRvci1jdWUgaXMtJHttb3ZlbWVudH0ke3RpbWluZ0JvdW5kcy5taW4gPT09IHRpbWluZ0JvdW5kcy5tYXggPyAnIGlzLWJvdW5kYXJ5JyA6ICcgaXMtZHJhZ2dhYmxlJ30ke2lzU2VsZWN0ZWQgPyAnIGlzLXNlbGVjdGVkJyA6ICcnfSR7aXNQcmltYXJ5ID8gJyBpcy1wcmltYXJ5LXNlbGVjdGlvbicgOiAnJ31gfVxuICAgICAgICAgICAgICAgICAgICAgICAgICBrZXk9e2N1ZS5pZH1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgZGF0YS1zZWN0aW9uLWlkPXtzZWN0aW9uLmlkfVxuICAgICAgICAgICAgICAgICAgICAgICAgICBkYXRhLWN1ZS1pZD17Y3VlLmlkfVxuICAgICAgICAgICAgICAgICAgICAgICAgICBzdHlsZT17Y3VlU3R5bGV9XG4gICAgICAgICAgICAgICAgICAgICAgICAgIGFyaWEtbGFiZWw9e2Ake21vdmVtZW50ID09PSAndmVydGljYWwnID8gJ1ZlcnRpY2FsJyA6ICdTcGF0aWFsJ30gdGV4dCBhdCAke01hdGgucm91bmQoY3VlLmhvbGQgKiAxMDApfSUke21vdGlvbkludGVydmFsID8gYCDCtyB0cmF2ZWxzICR7TWF0aC5yb3VuZChtb3Rpb25JbnRlcnZhbC5zdGFydCAqIDEwMCl94oCTJHtNYXRoLnJvdW5kKG1vdGlvbkludGVydmFsLmVuZCAqIDEwMCl9JWAgOiAnJ30gwrcgJHtjdWUudGV4dH1gfVxuICAgICAgICAgICAgICAgICAgICAgICAgICBhcmlhLXByZXNzZWQ9e2lzU2VsZWN0ZWR9XG4gICAgICAgICAgICAgICAgICAgICAgICAgIHRpdGxlPXtgJHttb3ZlbWVudCA9PT0gJ3ZlcnRpY2FsJyA/ICdWZXJ0aWNhbCcgOiAnU3BhdGlhbCd9IHRpdGxlIMK3IGRyYWcgdG8gbW92ZSBpdDsgZHVyYXRpb24gc3RheXMgZ2xvYmFsIMK3ICR7Y3VlLnRleHR9YH1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgb25Qb2ludGVyRG93bj17KGV2ZW50KSA9PiBiZWdpblRpbWluZ0RyYWcoZXZlbnQsIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0eXBlOiAnY3VlJyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0b2tlbixcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBsb2NrZWQ6IHRpbWluZ0JvdW5kcy5taW4gPT09IHRpbWluZ0JvdW5kcy5tYXgsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgbWluOiB0aW1pbmdCb3VuZHMubWluLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIG1heDogdGltaW5nQm91bmRzLm1heCxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBhdDogY3VlLmhvbGQsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgc2VjdGlvbkluZGV4LFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGN1ZUlkOiBjdWUuaWQsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgc2VjdGlvblN0YXJ0V1U6IHN0YXJ0V1UsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgc3BhbldVLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRyYXZlbFdVOiBjb21waWxlZD8udHJhdmVsV1UgfHwgc3BhbldVLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHN0b3J5V1U6IHN0YXJ0V1UgKyAoTnVtYmVyKGN1ZS5ob2xkKSAqIChjb21waWxlZD8udHJhdmVsV1UgfHwgMCkpLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHNlbGVjdGlvbjogY3VlU2VsZWN0aW9uLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvYWxlc2NlS2V5OiBgdGltZWxpbmU6JHt0b2tlbn1gLFxuICAgICAgICAgICAgICAgICAgICAgICAgICB9KX1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgb25Qb2ludGVyTW92ZT17bW92ZVRpbWluZ0RyYWd9XG4gICAgICAgICAgICAgICAgICAgICAgICAgIG9uUG9pbnRlclVwPXtlbmRUaW1pbmdEcmFnfVxuICAgICAgICAgICAgICAgICAgICAgICAgICBvblBvaW50ZXJDYW5jZWw9e2VuZFRpbWluZ0RyYWd9XG4gICAgICAgICAgICAgICAgICAgICAgICAgIG9uS2V5RG93bj17KGV2ZW50KSA9PiB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGV2ZW50LnNoaWZ0S2V5ICYmIGV2ZW50LmNvZGUgPT09ICdTcGFjZScpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGV2ZW50LnByZXZlbnREZWZhdWx0KCk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zdCBuZXh0U2VsZWN0aW9uID0gdG9nZ2xlQWJvdXROYXJyYXRpdmVDdWVTZWxlY3Rpb24oc3RvcmUuZ2V0U25hcHNob3QoKS5zZWxlY3Rpb24sIGN1ZVNlbGVjdGlvbik7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICBzdG9yZS5zZXRTZWxlY3Rpb24obmV4dFNlbGVjdGlvbik7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICBzdG9yZS5zZXRUcmFuc3BvcnQoeyBvd25lcjogJ3RpbWVsaW5lJywgcGxheWluZzogZmFsc2UsIHN0b3J5V1U6IHN0YXJ0V1UgKyAoTnVtYmVyKGN1ZS5ob2xkKSAqIChjb21waWxlZD8udHJhdmVsV1UgfHwgMCkpIH0pO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgfX1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgb25DbGljaz17KCkgPT4gaGFuZGxlVGltaW5nQ2xpY2sodG9rZW4sICgpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBzdG9yZS5zZXRUcmFuc3BvcnQoeyBvd25lcjogJ3RpbWVsaW5lJywgcGxheWluZzogZmFsc2UsIHN0b3J5V1U6IHN0YXJ0V1UgKyAoTnVtYmVyKGN1ZS5ob2xkKSAqIChjb21waWxlZD8udHJhdmVsV1UgfHwgMCkpIH0pO1xuICAgICAgICAgICAgICAgICAgICAgICAgICB9KX1cbiAgICAgICAgICAgICAgICAgICAgICAgID48c3BhbiBjbGFzc05hbWU9XCJhYm91dC1lZGl0b3ItY3VlLWZvY3VzXCIgc3R5bGU9e3sgbGVmdDogZm9jdXNQb3NpdGlvbiB9fSBhcmlhLWhpZGRlbj1cInRydWVcIiAvPjwvYnV0dG9uPlxuICAgICAgICAgICAgICAgICAgICAgICk7XG4gICAgICAgICAgICAgICAgICAgIH0pfVxuICAgICAgICAgICAgICAgICAgICB7c2VjdGlvbi50ZXh0LmRpc2NpcGxpbmVSZXZlYWwgPyAoKCkgPT4ge1xuICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IHJldmVhbCA9IHNlY3Rpb24udGV4dC5kaXNjaXBsaW5lUmV2ZWFsO1xuICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IGR1cmF0aW9uID0gcmV2ZWFsLmVuZCAtIHJldmVhbC5zdGFydDtcbiAgICAgICAgICAgICAgICAgICAgICBjb25zdCBjZW50cmUgPSByZXZlYWwuc3RhcnQgKyAoZHVyYXRpb24gKiAwLjUpO1xuICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IGlzU2VsZWN0ZWQgPSBpblNlbGVjdGVkU2VjdGlvbiAmJiBzZWxlY3Rpb24udHlwZSA9PT0gJ2Rpc2NpcGxpbmUtcmV2ZWFsJztcbiAgICAgICAgICAgICAgICAgICAgICBjb25zdCB0b2tlbiA9IGBkaXNjaXBsaW5lLXJldmVhbDoke3NlY3Rpb24uaWR9OiR7cmV2ZWFsLmlkfWA7XG4gICAgICAgICAgICAgICAgICAgICAgY29uc3QgcmV2ZWFsU2VsZWN0aW9uID0geyB0eXBlOiAnZGlzY2lwbGluZS1yZXZlYWwnLCBzZWN0aW9uSWQ6IHNlY3Rpb24uaWQgfTtcbiAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gKFxuICAgICAgICAgICAgICAgICAgICAgICAgPGJ1dHRvblxuICAgICAgICAgICAgICAgICAgICAgICAgICB0eXBlPVwiYnV0dG9uXCJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgY2xhc3NOYW1lPXtgYWJvdXQtZWRpdG9yLWRpc2NpcGxpbmUtcmV2ZWFsIGlzLWRyYWdnYWJsZSR7aXNTZWxlY3RlZCA/ICcgaXMtc2VsZWN0ZWQnIDogJyd9YH1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgc3R5bGU9e3sgbGVmdDogZXh0ZW5kZWRMb2NhbFBvc2l0aW9uKHJldmVhbC5zdGFydCksIHdpZHRoOiBleHRlbmRlZExvY2FsV2lkdGgocmV2ZWFsLnN0YXJ0LCByZXZlYWwuZW5kKSB9fVxuICAgICAgICAgICAgICAgICAgICAgICAgICBhcmlhLWxhYmVsPXtgRGlzY2lwbGluZSByZXZlYWwgZnJvbSAke01hdGgucm91bmQocmV2ZWFsLnN0YXJ0ICogMTAwKX0lIHRvICR7TWF0aC5yb3VuZChyZXZlYWwuZW5kICogMTAwKX0lYH1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgYXJpYS1wcmVzc2VkPXtpc1NlbGVjdGVkfVxuICAgICAgICAgICAgICAgICAgICAgICAgICB0aXRsZT1cIkRpc2NpcGxpbmUgcmV2ZWFsIMK3IGRyYWcgdGhlIGNvbXBsZXRlIGNsaXAgdG8gcmV0aW1lXCJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgb25Qb2ludGVyRG93bj17KGV2ZW50KSA9PiBiZWdpblRpbWluZ0RyYWcoZXZlbnQsIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0eXBlOiAnZGlzY2lwbGluZS1yZXZlYWwnLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRva2VuLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGxvY2tlZDogZmFsc2UsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgbWluOiBkdXJhdGlvbiAqIDAuNSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBtYXg6IERJU0NJUExJTkVfUkVWRUFMX01BWCAtIChkdXJhdGlvbiAqIDAuNSksXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgYXQ6IGNlbnRyZSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBzZWN0aW9uSW5kZXgsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgc2VjdGlvblN0YXJ0V1U6IHN0YXJ0V1UsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgc3BhbldVLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRyYXZlbFdVOiBjb21waWxlZD8udHJhdmVsV1UgfHwgc3BhbldVLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHN0b3J5V1U6IHN0YXJ0V1UgKyAoY2VudHJlICogKGNvbXBpbGVkPy50cmF2ZWxXVSB8fCAwKSksXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgc2VsZWN0aW9uOiByZXZlYWxTZWxlY3Rpb24sXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY29hbGVzY2VLZXk6IGB0aW1lbGluZToke3Rva2VufWAsXG4gICAgICAgICAgICAgICAgICAgICAgICAgIH0pfVxuICAgICAgICAgICAgICAgICAgICAgICAgICBvblBvaW50ZXJNb3ZlPXttb3ZlVGltaW5nRHJhZ31cbiAgICAgICAgICAgICAgICAgICAgICAgICAgb25Qb2ludGVyVXA9e2VuZFRpbWluZ0RyYWd9XG4gICAgICAgICAgICAgICAgICAgICAgICAgIG9uUG9pbnRlckNhbmNlbD17ZW5kVGltaW5nRHJhZ31cbiAgICAgICAgICAgICAgICAgICAgICAgICAgb25DbGljaz17KCkgPT4gaGFuZGxlVGltaW5nQ2xpY2sodG9rZW4sICgpID0+IHNlbGVjdEF0KHsgdHlwZTogJ2Rpc2NpcGxpbmUtcmV2ZWFsJyB9LCByZXZlYWwuc3RhcnQpKX1cbiAgICAgICAgICAgICAgICAgICAgICAgID5EaXNjaXBsaW5lIHJldmVhbDwvYnV0dG9uPlxuICAgICAgICAgICAgICAgICAgICAgICk7XG4gICAgICAgICAgICAgICAgICAgIH0pKCkgOiBudWxsfVxuICAgICAgICAgICAgICAgICAgICB7KHNlY3Rpb24udGV4dC5ibG9ja3MgfHwgW10pLmxlbmd0aCA/IChcbiAgICAgICAgICAgICAgICAgICAgICA8YnV0dG9uIHR5cGU9XCJidXR0b25cIiBjbGFzc05hbWU9e2BhYm91dC1lZGl0b3ItZWRpdG9yaWFsLWNsaXAke2luU2VsZWN0ZWRTZWN0aW9uICYmIHNlbGVjdGlvbi50eXBlID09PSAnc2VjdGlvbicgPyAnIGlzLXNlbGVjdGVkJyA6ICcnfWB9IG9uQ2xpY2s9eygpID0+IHNlbGVjdEF0KHsgdHlwZTogJ3NlY3Rpb24nIH0pfT5cbiAgICAgICAgICAgICAgICAgICAgICAgIFZlcnRpY2FsIMK3IHtzZWN0aW9uLnRleHQuYmxvY2tzLmxlbmd0aH0gYmxvY2tzXG4gICAgICAgICAgICAgICAgICAgICAgPC9idXR0b24+XG4gICAgICAgICAgICAgICAgICAgICkgOiBudWxsfVxuICAgICAgICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgICAgICAgKTtcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICBjb25zdCBpc1NlbGVjdGVkID0gaW5TZWxlY3RlZFNlY3Rpb24gJiYgc2VsZWN0aW9uLnR5cGUgPT09ICdpbnRlcmFjdGlvbic7XG4gICAgICAgICAgICAgIGNvbnN0IGFjdGl2YXRpb24gPSBzZWN0aW9uLmludGVyYWN0aW9uPy50eXBlICE9PSAnbm9uZScgPyBzZWN0aW9uLmludGVyYWN0aW9uLmFjdGl2YXRpb25TdGFydCA6IG51bGw7XG4gICAgICAgICAgICAgIHJldHVybiAoXG4gICAgICAgICAgICAgICAgPGRpdiBjbGFzc05hbWU9e2BhYm91dC1lZGl0b3ItY2xpcCR7aXNTZWxlY3RlZCA/ICcgaXMtc2VsZWN0ZWQnIDogJyd9YH0ga2V5PXtzZWN0aW9uLmlkfSBzdHlsZT17eyB3aWR0aCB9fT5cbiAgICAgICAgICAgICAgICAgIDxidXR0b25cbiAgICAgICAgICAgICAgICAgICAgdHlwZT1cImJ1dHRvblwiXG4gICAgICAgICAgICAgICAgICAgIGNsYXNzTmFtZT17YGFib3V0LWVkaXRvci1pbnRlcmFjdGlvbi1jbGlwICR7c2VjdGlvbi5pbnRlcmFjdGlvbj8udHlwZSAhPT0gJ25vbmUnID8gJ2hhcy1pbnRlcmFjdGlvbicgOiAnJ30ke2lzU2VsZWN0ZWQgPyAnIGlzLXNlbGVjdGVkJyA6ICcnfWB9XG4gICAgICAgICAgICAgICAgICAgIGFyaWEtcHJlc3NlZD17aXNTZWxlY3RlZH1cbiAgICAgICAgICAgICAgICAgICAgb25DbGljaz17KCkgPT4gc2VsZWN0QXQoeyB0eXBlOiAnaW50ZXJhY3Rpb24nIH0sIGFjdGl2YXRpb24gfHwgMCl9XG4gICAgICAgICAgICAgICAgICA+e3NlY3Rpb24uaW50ZXJhY3Rpb24/LnR5cGUgIT09ICdub25lJyA/IHNlY3Rpb24uaW50ZXJhY3Rpb24udHlwZSA6ICcnfTwvYnV0dG9uPlxuICAgICAgICAgICAgICAgICAge051bWJlci5pc0Zpbml0ZShhY3RpdmF0aW9uKSA/IChcbiAgICAgICAgICAgICAgICAgICAgPGJ1dHRvblxuICAgICAgICAgICAgICAgICAgICAgIHR5cGU9XCJidXR0b25cIlxuICAgICAgICAgICAgICAgICAgICAgIGNsYXNzTmFtZT17YGFib3V0LWVkaXRvci10aW1pbmcta2V5IGlzLWludGVyYWN0aW9uJHtpc1NlbGVjdGVkICYmIHNlbGVjdGlvbi5rZXlQYXJ0ID09PSAnYWN0aXZhdGlvbicgPyAnIGlzLXNlbGVjdGVkJyA6ICcnfWB9XG4gICAgICAgICAgICAgICAgICAgICAgc3R5bGU9e3sgbGVmdDogbG9jYWxQb3NpdGlvbihhY3RpdmF0aW9uKSB9fVxuICAgICAgICAgICAgICAgICAgICAgIHRpdGxlPVwiSW50ZXJhY3Rpb24gYWN0aXZhdGlvblwiXG4gICAgICAgICAgICAgICAgICAgICAgYXJpYS1sYWJlbD17YCR7c2VjdGlvbi5sYWJlbH0gaW50ZXJhY3Rpb24gYWN0aXZhdGlvbiBrZXlmcmFtZWB9XG4gICAgICAgICAgICAgICAgICAgICAgb25DbGljaz17KCkgPT4gc2VsZWN0QXQoeyB0eXBlOiAnaW50ZXJhY3Rpb24nLCBrZXlQYXJ0OiAnYWN0aXZhdGlvbicgfSwgYWN0aXZhdGlvbil9XG4gICAgICAgICAgICAgICAgICAgIC8+XG4gICAgICAgICAgICAgICAgICApIDogbnVsbH1cbiAgICAgICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgICAgKTtcbiAgICAgICAgICAgIH0pfVxuICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICkpfVxuICAgICAgICA8L2Rpdj5cbiAgICAgIDwvZGl2PlxuICAgIDwvZGl2PlxuICApO1xufVxuXG5mdW5jdGlvbiBTZXF1ZW5jZUluc3BlY3Rvcih7IHN0b3JlLCBzbmFwc2hvdCB9KSB7XG4gIGNvbnN0IGNvbW1pdEdsb2JhbCA9IChncm91cCwga2V5LCB2YWx1ZSkgPT4gc3RvcmUuY29tbWl0KGBDaGFuZ2UgJHtrZXl9YCwgKGRyYWZ0KSA9PiB7XG4gICAgaWYgKGdyb3VwID09PSAnc2VxdWVuY2UnKSBkcmFmdC5nbG9iYWxzW2tleV0gPSB2YWx1ZTtcbiAgICBlbHNlIHtcbiAgICAgIGNvbnN0IHRhcmdldEtleSA9IGdyb3VwID09PSAnbWF0ZXJpYWwnID8gJ3BvaW50TWF0ZXJpYWwnIDogZ3JvdXA7XG4gICAgICBkcmFmdC5nbG9iYWxzW3RhcmdldEtleV1ba2V5XSA9IHZhbHVlO1xuICAgIH1cbiAgfSwgeyBjb2FsZXNjZUtleTogYGdsb2JhbDoke2dyb3VwfToke2tleX1gIH0pO1xuICByZXR1cm4gKFxuICAgIDw+XG4gICAgICA8aGVhZGVyPjxzcGFuPlNlcXVlbmNlPC9zcGFuPjxzdHJvbmc+R2xvYmFsIGNvbnRyb2xzPC9zdHJvbmc+PC9oZWFkZXI+XG4gICAgICB7QUJPVVRfTkFSUkFUSVZFX0dMT0JBTF9DT05UUk9MUy5tYXAoKGdyb3VwKSA9PiAoXG4gICAgICAgIDxkZXRhaWxzIG9wZW4ga2V5PXtncm91cC5pZH0+XG4gICAgICAgICAgPHN1bW1hcnk+e2dyb3VwLmxhYmVsfTwvc3VtbWFyeT5cbiAgICAgICAgICB7Z3JvdXAuaWQgPT09ICd0ZXh0TW90aW9uJyA/IDxwIGNsYXNzTmFtZT1cImFib3V0LWVkaXRvci1oZWxwXCI+RXZlcnkgdGl0bGUgZm9sbG93cyB0aGlzIHBhdGggY29udGludW91c2x5LiBOZWdhdGl2ZSBZIGlzIGhpZ2hlciwgcG9zaXRpdmUgWSBpcyBsb3dlci4gVGhlIG9wZW5lciBzdGFydHMgc2hhcnAgYXQgaXRzIG93biBZIHBvc2l0aW9uOyBDbGVhciBmcm9tIGFuZCBDbGVhciB1bnRpbCBzZXQgdGhlIHNoYXJwIHdpbmRvdyBmb3IgbGF0ZXIgdGl0bGVzLjwvcD4gOiBudWxsfVxuICAgICAgICAgIHtncm91cC5pZCA9PT0gJ3N3YXJtVHVyYnVsZW5jZScgPyA8cCBjbGFzc05hbWU9XCJhYm91dC1lZGl0b3ItaGVscFwiPk9uZSBhbWJpZW50IG1vdGlvbiBwcm9maWxlIGRyaXZlcyBib3RoIHRoZSBjbHVzdGVyIGFuZCB0dXJidWxlbnQgZmllbGQuIEVhY2ggV29ybGQgb25seSBzY2FsZXMgaXRzIHN0cmVuZ3RoLCBzbyB0aGUgbW90aW9uIHN0YXlzIGNvbnRpbnVvdXMgd2hpbGUgU2hhcGVzIGNoYW5nZS48L3A+IDogbnVsbH1cbiAgICAgICAgICB7Z3JvdXAuY29udHJvbHMubWFwKChjb250cm9sKSA9PiB7XG4gICAgICAgICAgICBjb25zdCB0YXJnZXQgPSBncm91cC5pZCA9PT0gJ3NlcXVlbmNlJ1xuICAgICAgICAgICAgICA/IHNuYXBzaG90LmRvY3VtZW50Lmdsb2JhbHNcbiAgICAgICAgICAgICAgOiBzbmFwc2hvdC5kb2N1bWVudC5nbG9iYWxzW2dyb3VwLmlkID09PSAnbWF0ZXJpYWwnID8gJ3BvaW50TWF0ZXJpYWwnIDogZ3JvdXAuaWRdO1xuICAgICAgICAgICAgcmV0dXJuIChcbiAgICAgICAgICAgICAgPE51bWJlclByb3BlcnR5XG4gICAgICAgICAgICAgICAga2V5PXtjb250cm9sLmlkfVxuICAgICAgICAgICAgICAgIGxhYmVsPXtjb250cm9sLmxhYmVsfVxuICAgICAgICAgICAgICAgIHZhbHVlPXt0YXJnZXRbY29udHJvbC5pZF19XG4gICAgICAgICAgICAgICAgbWluPXtjb250cm9sLm1pbn1cbiAgICAgICAgICAgICAgICBtYXg9e2NvbnRyb2wubWF4fVxuICAgICAgICAgICAgICAgIHN0ZXA9e2NvbnRyb2wuc3RlcH1cbiAgICAgICAgICAgICAgICB1bml0PXtjb250cm9sLnVuaXR9XG4gICAgICAgICAgICAgICAgb25DaGFuZ2U9eyh2YWx1ZSkgPT4gY29tbWl0R2xvYmFsKGdyb3VwLmlkLCBjb250cm9sLmlkLCB2YWx1ZSl9XG4gICAgICAgICAgICAgIC8+XG4gICAgICAgICAgICApO1xuICAgICAgICAgIH0pfVxuICAgICAgICA8L2RldGFpbHM+XG4gICAgICApKX1cbiAgICA8Lz5cbiAgKTtcbn1cblxuZnVuY3Rpb24gU2VjdGlvbkluc3BlY3Rvcih7IHN0b3JlLCBzbmFwc2hvdCwgc2VjdGlvbiB9KSB7XG4gIGNvbnN0IHNlY3Rpb25JbmRleCA9IGdldFNlY3Rpb25JbmRleChzbmFwc2hvdC5kb2N1bWVudCwgc2VjdGlvbi5pZCk7XG4gIGNvbnN0IGNvbXBpbGVkU2VjdGlvbiA9IHNuYXBzaG90LmNvbXBpbGVkUGxhbj8uc2VjdGlvbnM/LltzZWN0aW9uSW5kZXhdO1xuICBjb25zdCBhY3RpdmVFeHRlbnRGaWVsZCA9IHNuYXBzaG90LnByZXZpZXdQcm9maWxlID09PSAnbW9iaWxlJyA/ICdtb2JpbGVFeHRlbnRXVScgOiAnZXh0ZW50V1UnO1xuICBjb25zdCBhY3RpdmVFeHRlbnQgPSBOdW1iZXIoc2VjdGlvblthY3RpdmVFeHRlbnRGaWVsZF0pO1xuICBjb25zdCByZXNvbHZlZEV4dGVudCA9IE51bWJlcihjb21waWxlZFNlY3Rpb24/LnJlc29sdmVkRXh0ZW50V1UgPz8gYWN0aXZlRXh0ZW50KTtcbiAgY29uc3QgY29udGVudE1pbmltdW1BY3RpdmUgPSByZXNvbHZlZEV4dGVudCA+IGFjdGl2ZUV4dGVudCArIDAuMDAxO1xuICBjb25zdCBiYXNlbGluZVNlY3Rpb24gPSBzbmFwc2hvdC5iYXNlbGluZURvY3VtZW50LnNlY3Rpb25zLmZpbmQoKGl0ZW0pID0+IGl0ZW0uaWQgPT09IHNlY3Rpb24uaWQpO1xuICBjb25zdCB1cGRhdGUgPSAobGFiZWwsIG11dGF0ZSwgY29hbGVzY2VLZXkgPSBudWxsKSA9PiBzdG9yZS5jb21taXQobGFiZWwsIChkcmFmdCkgPT4ge1xuICAgIG11dGF0ZShkcmFmdC5zZWN0aW9uc1tzZWN0aW9uSW5kZXhdKTtcbiAgfSwgeyBjb2FsZXNjZUtleSwgc2VsZWN0aW9uOiBzbmFwc2hvdC5zZWxlY3Rpb24gfSk7XG4gIGNvbnN0IG1vdmUgPSAoZGlyZWN0aW9uKSA9PiBzdG9yZS5jb21taXQoJ1Jlb3JkZXIgU2VjdGlvbicsIChkcmFmdCkgPT4ge1xuICAgIGNvbnN0IHRvSW5kZXggPSBzZWN0aW9uSW5kZXggKyBkaXJlY3Rpb247XG4gICAgaWYgKHRvSW5kZXggPCAwIHx8IHRvSW5kZXggPj0gZHJhZnQuc2VjdGlvbnMubGVuZ3RoKSByZXR1cm47XG4gICAgY29uc3QgW21vdmVkXSA9IGRyYWZ0LnNlY3Rpb25zLnNwbGljZShzZWN0aW9uSW5kZXgsIDEpO1xuICAgIGRyYWZ0LnNlY3Rpb25zLnNwbGljZSh0b0luZGV4LCAwLCBtb3ZlZCk7XG4gICAgcmVwbGFjZURyYWZ0RG9jdW1lbnQoZHJhZnQsIHN0aXRjaEFib3V0TmFycmF0aXZlQ2FtZXJhQm91bmRhcmllcyhkcmFmdCkpO1xuICB9LCB7IHNlbGVjdGlvbjogeyB0eXBlOiAnc2VjdGlvbicsIHNlY3Rpb25JZDogc2VjdGlvbi5pZCB9IH0pO1xuICBjb25zdCBkdXBsaWNhdGUgPSAoKSA9PiB7XG4gICAgY29uc3QgcmVzdWx0ID0gZHVwbGljYXRlQWJvdXROYXJyYXRpdmVTZWN0aW9uKHsgZG9jdW1lbnQ6IHNuYXBzaG90LmRvY3VtZW50LCBzZWN0aW9uSWQ6IHNlY3Rpb24uaWQgfSk7XG4gICAgaWYgKCFyZXN1bHQudmFsaWQpIHtcbiAgICAgIHN0b3JlLnNldFNhdmVTdGF0ZSh7IG1lc3NhZ2U6IHJlc3VsdC5yZWFzb24gfHwgJ1RoaXMgU2VjdGlvbiBjYW5ub3QgYmUgZHVwbGljYXRlZC4nIH0pO1xuICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICBzdG9yZS5jb21taXQoJ0R1cGxpY2F0ZSBTZWN0aW9uJywgKGRyYWZ0KSA9PiByZXBsYWNlRHJhZnREb2N1bWVudChkcmFmdCwgcmVzdWx0LmRvY3VtZW50KSwge1xuICAgICAgc2VsZWN0aW9uOiByZXN1bHQuc2VsZWN0aW9uLFxuICAgIH0pO1xuICB9O1xuXG4gIHJldHVybiAoXG4gICAgPD5cbiAgICAgIDxoZWFkZXI+PHNwYW4+U2VjdGlvbiB7U3RyaW5nKHNlY3Rpb25JbmRleCArIDEpLnBhZFN0YXJ0KDIsICcwJyl9PC9zcGFuPjxzdHJvbmc+e3NlY3Rpb24ubGFiZWx9PC9zdHJvbmc+PC9oZWFkZXI+XG4gICAgICB7c2VjdGlvbi5sb2NrZWQgPyA8ZGl2IGNsYXNzTmFtZT1cImFib3V0LWVkaXRvci1sb2NrXCI+PExvY2tLZXlob2xlIGFyaWEtaGlkZGVuPVwidHJ1ZVwiIC8+PHNwYW4+VGhpcyBwcm90ZWN0ZWQgU2VjdGlvbiBjYW5ub3QgYmUgcmVvcmRlcmVkIG9yIGhhdmUgaXRzIFdvcmxkIHJlcGxhY2VkIGFjY2lkZW50YWxseS48L3NwYW4+PGJ1dHRvbiB0eXBlPVwiYnV0dG9uXCIgb25DbGljaz17KCkgPT4gdXBkYXRlKCdVbmxvY2sgcHJvdGVjdGVkIFNlY3Rpb24nLCAoZHJhZnQpID0+IHsgZHJhZnQubG9ja2VkID0gZmFsc2U7IH0pfT5VbmxvY2sgYWR2YW5jZWQ8L2J1dHRvbj48L2Rpdj4gOiBudWxsfVxuICAgICAgPGRpdiBjbGFzc05hbWU9XCJhYm91dC1lZGl0b3ItaW5saW5lLWFjdGlvbnNcIj5cbiAgICAgICAgPGJ1dHRvbiB0eXBlPVwiYnV0dG9uXCIgZGlzYWJsZWQ9e3NlY3Rpb24ubG9ja2VkIHx8IHNlY3Rpb25JbmRleCA9PT0gMH0gb25DbGljaz17KCkgPT4gbW92ZSgtMSl9Pk1vdmUgZWFybGllcjwvYnV0dG9uPlxuICAgICAgICA8YnV0dG9uIHR5cGU9XCJidXR0b25cIiBkaXNhYmxlZD17c2VjdGlvbi5sb2NrZWQgfHwgc2VjdGlvbkluZGV4ID09PSBzbmFwc2hvdC5kb2N1bWVudC5zZWN0aW9ucy5sZW5ndGggLSAxfSBvbkNsaWNrPXsoKSA9PiBtb3ZlKDEpfT5Nb3ZlIGxhdGVyPC9idXR0b24+XG4gICAgICAgIDxidXR0b24gdHlwZT1cImJ1dHRvblwiIGRpc2FibGVkPXtzZWN0aW9uLmxvY2tlZCB8fCBzZWN0aW9uLnR5cGUgPT09ICdmaW5hbGUnfSBvbkNsaWNrPXtkdXBsaWNhdGV9PkR1cGxpY2F0ZTwvYnV0dG9uPlxuICAgICAgPC9kaXY+XG4gICAgICA8UHJvcGVydHkgbGFiZWw9XCJTZWN0aW9uIG5hbWVcIj48aW5wdXQgdmFsdWU9e3NlY3Rpb24ubGFiZWx9IG9uQ2hhbmdlPXsoZXZlbnQpID0+IHVwZGF0ZSgnUmVuYW1lIFNlY3Rpb24nLCAoZHJhZnQpID0+IHsgZHJhZnQubGFiZWwgPSBldmVudC50YXJnZXQudmFsdWU7IH0sIGBzZWN0aW9uOiR7c2VjdGlvbi5pZH06bGFiZWxgKX0gLz48L1Byb3BlcnR5PlxuICAgICAgPFByb3BlcnR5IGxhYmVsPVwiU3RhYmxlIElEXCI+PGlucHV0IHZhbHVlPXtzZWN0aW9uLmlkfSByZWFkT25seSAvPjxzbWFsbD5SZWZlcmVuY2VzIHRoaXMgU2VjdGlvbiB3aXRob3V0IHR5aW5nIGl0IHRvIGl0cyBjdXJyZW50IG1lYW5pbmcuPC9zbWFsbD48L1Byb3BlcnR5PlxuICAgICAgPFByb3BlcnR5IGxhYmVsPVwiVHlwZVwiPlxuICAgICAgICA8c2VsZWN0IHZhbHVlPXtzZWN0aW9uLnR5cGV9IGRpc2FibGVkPXtzZWN0aW9uLnR5cGUgPT09ICdmaW5hbGUnfSBvbkNoYW5nZT17KGV2ZW50KSA9PiB1cGRhdGUoJ0NoYW5nZSBTZWN0aW9uIHR5cGUnLCAoZHJhZnQpID0+IHsgZHJhZnQudHlwZSA9IGV2ZW50LnRhcmdldC52YWx1ZTsgfSl9PlxuICAgICAgICAgIDxvcHRpb24gdmFsdWU9XCJzcGF0aWFsXCI+U3BhdGlhbDwvb3B0aW9uPjxvcHRpb24gdmFsdWU9XCJlZGl0b3JpYWxcIj5FZGl0b3JpYWw8L29wdGlvbj48b3B0aW9uIHZhbHVlPVwiZmluYWxlXCI+RmluYWxlPC9vcHRpb24+XG4gICAgICAgIDwvc2VsZWN0PlxuICAgICAgPC9Qcm9wZXJ0eT5cbiAgICAgIDxkZXRhaWxzIG9wZW4+XG4gICAgICAgIDxzdW1tYXJ5PlNlY3Rpb24gdGltaW5nPC9zdW1tYXJ5PlxuICAgICAgICA8UHJvcGVydHkgbGFiZWw9XCJTY3JvbGwgdHJhdmVsXCI+PG91dHB1dCBjbGFzc05hbWU9XCJhYm91dC1lZGl0b3ItcmVhZG91dFwiPntmb3JtYXRXVShNYXRoLm1heCgwLCBhY3RpdmVFeHRlbnQgLSAxKSl9PC9vdXRwdXQ+PC9Qcm9wZXJ0eT5cbiAgICAgICAgPFByb3BlcnR5IGxhYmVsPVwiVG90YWwgaGVpZ2h0XCI+PG91dHB1dCBjbGFzc05hbWU9XCJhYm91dC1lZGl0b3ItcmVhZG91dFwiPntmb3JtYXRXVShhY3RpdmVFeHRlbnQpfTwvb3V0cHV0PjwvUHJvcGVydHk+XG4gICAgICAgIDxOdW1iZXJQcm9wZXJ0eSBsYWJlbD1cIkRlc2t0b3AgbGVuZ3RoXCIgdmFsdWU9e3NlY3Rpb24uZXh0ZW50V1V9IG1pbj17MX0gbWF4PXs4fSBzdGVwPXswLjA1fSB1bml0PVwiV1VcIiBvbkNoYW5nZT17KHZhbHVlKSA9PiB1cGRhdGUoJ0NoYW5nZSBkZXNrdG9wIFNlY3Rpb24gbGVuZ3RoJywgKGRyYWZ0KSA9PiB7IGRyYWZ0LmV4dGVudFdVID0gdmFsdWU7IH0sIGBzZWN0aW9uOiR7c2VjdGlvbi5pZH06ZXh0ZW50YCl9IC8+XG4gICAgICAgIDxOdW1iZXJQcm9wZXJ0eSBsYWJlbD1cIk1vYmlsZSBsZW5ndGhcIiB2YWx1ZT17c2VjdGlvbi5tb2JpbGVFeHRlbnRXVX0gbWluPXsxfSBtYXg9ezh9IHN0ZXA9ezAuMDV9IHVuaXQ9XCJXVVwiIG9uQ2hhbmdlPXsodmFsdWUpID0+IHVwZGF0ZSgnQ2hhbmdlIG1vYmlsZSBTZWN0aW9uIGxlbmd0aCcsIChkcmFmdCkgPT4geyBkcmFmdC5tb2JpbGVFeHRlbnRXVSA9IHZhbHVlOyB9LCBgc2VjdGlvbjoke3NlY3Rpb24uaWR9Om1vYmlsZWApfSAvPlxuICAgICAgICA8UHJvcGVydHkgbGFiZWw9XCJSZXNvbHZlZCBoZWlnaHRcIj48b3V0cHV0IGNsYXNzTmFtZT1cImFib3V0LWVkaXRvci1yZWFkb3V0XCI+e2Zvcm1hdFdVKHJlc29sdmVkRXh0ZW50KX08L291dHB1dD48L1Byb3BlcnR5PlxuICAgICAgICB7Y29udGVudE1pbmltdW1BY3RpdmUgPyA8cCBjbGFzc05hbWU9XCJhYm91dC1lZGl0b3ItdGltaW5nLXdhcm5pbmdcIj5Db250ZW50IG1pbmltdW0gaW4gZWZmZWN0LiBUaGUgcmVuZGVyZWQgY29weSBuZWVkcyB7Zm9ybWF0V1UocmVzb2x2ZWRFeHRlbnQpfSBpbiB0aGlzIHByb2ZpbGUuPC9wPiA6IG51bGx9XG4gICAgICAgIDxidXR0b25cbiAgICAgICAgICB0eXBlPVwiYnV0dG9uXCJcbiAgICAgICAgICBjbGFzc05hbWU9XCJhYm91dC1lZGl0b3Itd2lkZS1hY3Rpb25cIlxuICAgICAgICAgIGRpc2FibGVkPXshYmFzZWxpbmVTZWN0aW9uIHx8IGJhc2VsaW5lU2VjdGlvblthY3RpdmVFeHRlbnRGaWVsZF0gPT09IHNlY3Rpb25bYWN0aXZlRXh0ZW50RmllbGRdfVxuICAgICAgICAgIG9uQ2xpY2s9eygpID0+IHVwZGF0ZSgnUmVzdG9yZSBzYXZlZCBTZWN0aW9uIGxlbmd0aCcsIChkcmFmdCkgPT4geyBkcmFmdFthY3RpdmVFeHRlbnRGaWVsZF0gPSBiYXNlbGluZVNlY3Rpb25bYWN0aXZlRXh0ZW50RmllbGRdOyB9KX1cbiAgICAgICAgPlJlc2V0IHtzbmFwc2hvdC5wcmV2aWV3UHJvZmlsZSA9PT0gJ21vYmlsZScgPyAnbW9iaWxlJyA6ICdkZXNrdG9wJ30gbGVuZ3RoPC9idXR0b24+XG4gICAgICA8L2RldGFpbHM+XG4gICAgICB7c2VjdGlvbi50eXBlID09PSAnZWRpdG9yaWFsJyA/IDxFZGl0b3JpYWxCbG9ja3Mgc3RvcmU9e3N0b3JlfSBzbmFwc2hvdD17c25hcHNob3R9IHNlY3Rpb249e3NlY3Rpb259IC8+IDogbnVsbH1cbiAgICAgIHtzZWN0aW9uLnR5cGUgIT09ICdlZGl0b3JpYWwnID8gKFxuICAgICAgICA8YnV0dG9uXG4gICAgICAgICAgdHlwZT1cImJ1dHRvblwiXG4gICAgICAgICAgY2xhc3NOYW1lPVwiYWJvdXQtZWRpdG9yLXdpZGUtYWN0aW9uXCJcbiAgICAgICAgICBvbkNsaWNrPXsoKSA9PiB7XG4gICAgICAgICAgICBjb25zdCBsb2NhbCA9IGdldExvY2FsUHJvZ3Jlc3Moc25hcHNob3QuY29tcGlsZWRQbGFuLCBzZWN0aW9uLCBzbmFwc2hvdC50cmFuc3BvcnQuc3RvcnlXVSk7XG4gICAgICAgICAgICBjb25zdCBpZCA9IG5leHRJZChzbmFwc2hvdC5kb2N1bWVudCwgYCR7c2VjdGlvbi5pZH0tc3RhdGVtZW50YCk7XG4gICAgICAgICAgICBjb25zdCBmb2N1cyA9IE1hdGgubWluKDAuOTIsIE1hdGgubWF4KDAuMDgsIHNuYXBBYm91dE5hcnJhdGl2ZVRpbWVsaW5lVmFsdWUobG9jYWwpKSk7XG4gICAgICAgICAgICB1cGRhdGUoJ0FkZCB0ZXh0IEN1ZScsIChkcmFmdCkgPT4ge1xuICAgICAgICAgICAgICBkcmFmdC50ZXh0LmN1ZXMgfHw9IFtdO1xuICAgICAgICAgICAgICBkcmFmdC50ZXh0LmN1ZXMucHVzaCh7IGlkLCB0ZXh0OiAnTmV3IHRyYXZlbGxpbmcgc3RhdGVtZW50JywgZW50ZXI6IGZvY3VzIC0gMC4wOCwgaG9sZDogZm9jdXMsIGV4aXQ6IGZvY3VzICsgMC4wOCwgcHJlc2V0OiAndHJhdmVsbGluZy10aXRsZS12MScsIG1vdGlvbjogeyBtb2RlOiAnc3BhdGlhbCcgfSB9KTtcbiAgICAgICAgICAgICAgZHJhZnQudGV4dC5jdWVzLnNvcnQoKGEsIGIpID0+IGEuaG9sZCAtIGIuaG9sZCk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIHN0b3JlLnNldFNlbGVjdGlvbih7IHR5cGU6ICdjdWUnLCBzZWN0aW9uSWQ6IHNlY3Rpb24uaWQsIGN1ZUlkOiBpZCwga2V5UGFydDogJ2ZvY3VzJyB9KTtcbiAgICAgICAgICB9fVxuICAgICAgICA+QWRkIHRleHQgY3VlIGF0IHBsYXloZWFkPC9idXR0b24+XG4gICAgICApIDogbnVsbH1cbiAgICA8Lz5cbiAgKTtcbn1cblxuZnVuY3Rpb24gRWRpdG9yaWFsQmxvY2tzKHsgc3RvcmUsIHNuYXBzaG90LCBzZWN0aW9uIH0pIHtcbiAgY29uc3Qgc2VjdGlvbkluZGV4ID0gZ2V0U2VjdGlvbkluZGV4KHNuYXBzaG90LmRvY3VtZW50LCBzZWN0aW9uLmlkKTtcbiAgY29uc3QgdXBkYXRlQmxvY2sgPSAoYmxvY2tJbmRleCwgZmllbGQsIHZhbHVlKSA9PiBzdG9yZS5jb21taXQoJ0VkaXQgZWRpdG9yaWFsIGNvcHknLCAoZHJhZnQpID0+IHtcbiAgICBkcmFmdC5zZWN0aW9uc1tzZWN0aW9uSW5kZXhdLnRleHQuYmxvY2tzW2Jsb2NrSW5kZXhdW2ZpZWxkXSA9IHZhbHVlO1xuICB9LCB7IGNvYWxlc2NlS2V5OiBgYmxvY2s6JHtzZWN0aW9uLmlkfToke2Jsb2NrSW5kZXh9OiR7ZmllbGR9YCwgc2VsZWN0aW9uOiBzbmFwc2hvdC5zZWxlY3Rpb24gfSk7XG4gIGNvbnN0IHVwZGF0ZUVtcGhhc2lzID0gKGJsb2NrSW5kZXgsIGVtcGhhc2lzSW5kZXgsIGZpZWxkLCB2YWx1ZSkgPT4gc3RvcmUuY29tbWl0KCdFZGl0IGVkaXRvcmlhbCBoaWdobGlnaHQnLCAoZHJhZnQpID0+IHtcbiAgICBkcmFmdC5zZWN0aW9uc1tzZWN0aW9uSW5kZXhdLnRleHQuYmxvY2tzW2Jsb2NrSW5kZXhdLmVtcGhhc2lzW2VtcGhhc2lzSW5kZXhdW2ZpZWxkXSA9IHZhbHVlO1xuICB9LCB7IGNvYWxlc2NlS2V5OiBgYmxvY2s6JHtzZWN0aW9uLmlkfToke2Jsb2NrSW5kZXh9OmVtcGhhc2lzOiR7ZW1waGFzaXNJbmRleH06JHtmaWVsZH1gLCBzZWxlY3Rpb246IHNuYXBzaG90LnNlbGVjdGlvbiB9KTtcbiAgY29uc3QgYWRkRW1waGFzaXMgPSAoYmxvY2tJbmRleCkgPT4gc3RvcmUuY29tbWl0KCdBZGQgZWRpdG9yaWFsIGhpZ2hsaWdodCcsIChkcmFmdCkgPT4ge1xuICAgIGNvbnN0IGJsb2NrID0gZHJhZnQuc2VjdGlvbnNbc2VjdGlvbkluZGV4XS50ZXh0LmJsb2Nrc1tibG9ja0luZGV4XTtcbiAgICBibG9jay5lbXBoYXNpcyB8fD0gW107XG4gICAgYmxvY2suZW1waGFzaXMucHVzaCh7IHRleHQ6IGJsb2NrLnRleHQudHJpbSgpLnNwbGl0KC9cXHMrLykuc2xpY2UoMCwgMikuam9pbignICcpLCB0b25lOiAnYmx1ZScgfSk7XG4gIH0sIHsgc2VsZWN0aW9uOiBzbmFwc2hvdC5zZWxlY3Rpb24gfSk7XG4gIGNvbnN0IHJlbW92ZUVtcGhhc2lzID0gKGJsb2NrSW5kZXgsIGVtcGhhc2lzSW5kZXgpID0+IHN0b3JlLmNvbW1pdCgnUmVtb3ZlIGVkaXRvcmlhbCBoaWdobGlnaHQnLCAoZHJhZnQpID0+IHtcbiAgICBkcmFmdC5zZWN0aW9uc1tzZWN0aW9uSW5kZXhdLnRleHQuYmxvY2tzW2Jsb2NrSW5kZXhdLmVtcGhhc2lzLnNwbGljZShlbXBoYXNpc0luZGV4LCAxKTtcbiAgfSwgeyBzZWxlY3Rpb246IHNuYXBzaG90LnNlbGVjdGlvbiB9KTtcbiAgcmV0dXJuIChcbiAgICA8ZGV0YWlscyBvcGVuPlxuICAgICAgPHN1bW1hcnk+RWRpdG9yaWFsIGNvbnRlbnQ8L3N1bW1hcnk+XG4gICAgICB7KHNlY3Rpb24udGV4dC5ibG9ja3MgfHwgW10pLm1hcCgoYmxvY2ssIGJsb2NrSW5kZXgpID0+IChcbiAgICAgICAgPGRpdiBjbGFzc05hbWU9XCJhYm91dC1lZGl0b3ItYmxvY2tcIiBrZXk9e2Jsb2NrLmlkfT5cbiAgICAgICAgICA8ZGl2Pjxjb2RlPntibG9jay5raW5kfTwvY29kZT48c3Bhbj57YmxvY2suaWR9PC9zcGFuPjwvZGl2PlxuICAgICAgICAgIHtibG9jay5sYWJlbCAhPSBudWxsID8gPFByb3BlcnR5IGxhYmVsPVwiTGFiZWxcIj48aW5wdXQgdmFsdWU9e2Jsb2NrLmxhYmVsfSBvbkNoYW5nZT17KGV2ZW50KSA9PiB1cGRhdGVCbG9jayhibG9ja0luZGV4LCAnbGFiZWwnLCBldmVudC50YXJnZXQudmFsdWUpfSAvPjwvUHJvcGVydHk+IDogbnVsbH1cbiAgICAgICAgICB7YmxvY2sudGV4dCAhPSBudWxsID8gPFByb3BlcnR5IGxhYmVsPVwiQ29weVwiPjx0ZXh0YXJlYSByb3dzPVwiNVwiIHZhbHVlPXtibG9jay50ZXh0fSBvbkNoYW5nZT17KGV2ZW50KSA9PiB1cGRhdGVCbG9jayhibG9ja0luZGV4LCAndGV4dCcsIGV2ZW50LnRhcmdldC52YWx1ZSl9IC8+PC9Qcm9wZXJ0eT4gOiBudWxsfVxuICAgICAgICAgIHtibG9jay5raW5kID09PSAncHJvc2UnID8gPFByb3BlcnR5IGxhYmVsPVwiUmVjb25uZWN0IHBvaW50IGdyaWRcIj48aW5wdXQgdHlwZT1cImNoZWNrYm94XCIgY2hlY2tlZD17YmxvY2sud29ybGRJbmZsdWVuY2UgPT09IHRydWV9IG9uQ2hhbmdlPXsoZXZlbnQpID0+IHVwZGF0ZUJsb2NrKGJsb2NrSW5kZXgsICd3b3JsZEluZmx1ZW5jZScsIGV2ZW50LnRhcmdldC5jaGVja2VkKX0gLz48L1Byb3BlcnR5PiA6IG51bGx9XG4gICAgICAgICAge2Jsb2NrLnRleHQgIT0gbnVsbCA/IChcbiAgICAgICAgICAgIDxkaXYgY2xhc3NOYW1lPVwiYWJvdXQtZWRpdG9yLWVtcGhhc2lzLWNvbnRyb2xzXCI+XG4gICAgICAgICAgICAgIDxzcGFuPkhpZ2hsaWdodGVkIHdvcmRzPC9zcGFuPlxuICAgICAgICAgICAgICB7KGJsb2NrLmVtcGhhc2lzIHx8IFtdKS5tYXAoKGl0ZW0sIGVtcGhhc2lzSW5kZXgpID0+IChcbiAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cImFib3V0LWVkaXRvci1lbXBoYXNpcy1yb3dcIiBrZXk9e2Ake2Jsb2NrLmlkfS1lbXBoYXNpcy0ke2VtcGhhc2lzSW5kZXh9YH0+XG4gICAgICAgICAgICAgICAgICA8aW5wdXQgYXJpYS1sYWJlbD1cIkhpZ2hsaWdodGVkIHBocmFzZVwiIHZhbHVlPXtpdGVtLnRleHR9IG9uQ2hhbmdlPXsoZXZlbnQpID0+IHVwZGF0ZUVtcGhhc2lzKGJsb2NrSW5kZXgsIGVtcGhhc2lzSW5kZXgsICd0ZXh0JywgZXZlbnQudGFyZ2V0LnZhbHVlKX0gLz5cbiAgICAgICAgICAgICAgICAgIDxzZWxlY3QgYXJpYS1sYWJlbD1cIkhpZ2hsaWdodCBjb2xvdXJcIiB2YWx1ZT17aXRlbS50b25lfSBvbkNoYW5nZT17KGV2ZW50KSA9PiB1cGRhdGVFbXBoYXNpcyhibG9ja0luZGV4LCBlbXBoYXNpc0luZGV4LCAndG9uZScsIGV2ZW50LnRhcmdldC52YWx1ZSl9PlxuICAgICAgICAgICAgICAgICAgICB7QUJPVVRfTkFSUkFUSVZFX0VNUEhBU0lTX1RPTkVTLm1hcCgodG9uZSkgPT4gPG9wdGlvbiB2YWx1ZT17dG9uZX0ga2V5PXt0b25lfT57dG9uZX08L29wdGlvbj4pfVxuICAgICAgICAgICAgICAgICAgPC9zZWxlY3Q+XG4gICAgICAgICAgICAgICAgICA8YnV0dG9uIHR5cGU9XCJidXR0b25cIiBhcmlhLWxhYmVsPXtgUmVtb3ZlICR7aXRlbS50ZXh0IHx8ICdlbXB0eSd9IGhpZ2hsaWdodGB9IG9uQ2xpY2s9eygpID0+IHJlbW92ZUVtcGhhc2lzKGJsb2NrSW5kZXgsIGVtcGhhc2lzSW5kZXgpfT7DlzwvYnV0dG9uPlxuICAgICAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgICApKX1cbiAgICAgICAgICAgICAgPGJ1dHRvbiB0eXBlPVwiYnV0dG9uXCIgb25DbGljaz17KCkgPT4gYWRkRW1waGFzaXMoYmxvY2tJbmRleCl9PkFkZCBoaWdobGlnaHQ8L2J1dHRvbj5cbiAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICkgOiBudWxsfVxuICAgICAgICAgIHtibG9jay5pdGVtcyA/IDxQcm9wZXJ0eSBsYWJlbD1cIkl0ZW1zXCI+PHRleHRhcmVhIHJvd3M9XCI2XCIgdmFsdWU9e2Jsb2NrLml0ZW1zLmpvaW4oJ1xcbicpfSBvbkNoYW5nZT17KGV2ZW50KSA9PiB1cGRhdGVCbG9jayhibG9ja0luZGV4LCAnaXRlbXMnLCBldmVudC50YXJnZXQudmFsdWUuc3BsaXQoJ1xcbicpLmZpbHRlcihCb29sZWFuKSl9IC8+PC9Qcm9wZXJ0eT4gOiBudWxsfVxuICAgICAgICA8L2Rpdj5cbiAgICAgICkpfVxuICAgICAgPGJ1dHRvbiB0eXBlPVwiYnV0dG9uXCIgY2xhc3NOYW1lPVwiYWJvdXQtZWRpdG9yLXdpZGUtYWN0aW9uXCIgb25DbGljaz17KCkgPT4gc3RvcmUuY29tbWl0KCdBZGQgZWRpdG9yaWFsIGJsb2NrJywgKGRyYWZ0KSA9PiB7XG4gICAgICAgIGRyYWZ0LnNlY3Rpb25zW3NlY3Rpb25JbmRleF0udGV4dC5ibG9ja3MucHVzaCh7IGlkOiBuZXh0SWQoZHJhZnQsIGAke3NlY3Rpb24uaWR9LXByb3NlYCksIGtpbmQ6ICdwcm9zZScsIHRleHQ6ICdOZXcgZWRpdG9yaWFsIHBhcmFncmFwaC4nIH0pO1xuICAgICAgfSl9PkFkZCBwcm9zZSBibG9jazwvYnV0dG9uPlxuICAgIDwvZGV0YWlscz5cbiAgKTtcbn1cblxuZnVuY3Rpb24gQ3VlUmh5dGhtQW5kUmV1c2UoeyBzdG9yZSwgc25hcHNob3QsIGNsaXBib2FyZCwgc2V0Q2xpcGJvYXJkIH0pIHtcbiAgY29uc3QgbWVtYmVycyA9IGdldEFib3V0TmFycmF0aXZlU2VsZWN0aW9uTWVtYmVycyhzbmFwc2hvdC5zZWxlY3Rpb24pO1xuICBjb25zdCBbZ2FwV1UsIHNldEdhcFdVXSA9IHVzZVN0YXRlKDAuMzUpO1xuICBjb25zdCBbYW5jaG9yLCBzZXRBbmNob3JdID0gdXNlU3RhdGUoJ3ByaW1hcnknKTtcbiAgY29uc3QgW3ByZXZpZXcsIHNldFByZXZpZXddID0gdXNlU3RhdGUobnVsbCk7XG4gIGNvbnN0IFttZXNzYWdlLCBzZXRNZXNzYWdlXSA9IHVzZVN0YXRlKCcnKTtcblxuICBjb25zdCBwcmV2aWV3TW92ZXMgPSAobGFiZWwsIHJlc3VsdCkgPT4ge1xuICAgIGlmICghcmVzdWx0LnZhbGlkKSB7XG4gICAgICBpZiAoc25hcHNob3QudHJ5U3RhdGUpIHN0b3JlLmNhbmNlbFRyeSgpO1xuICAgICAgc2V0UHJldmlldyhyZXN1bHQpO1xuICAgICAgc2V0TWVzc2FnZShyZXN1bHQucmVhc29uIHx8ICdUaGlzIGFycmFuZ2VtZW50IGRvZXMgbm90IGZpdCB0aGUgc2VsZWN0ZWQgU2VjdGlvbnMuJyk7XG4gICAgICByZXR1cm47XG4gICAgfVxuICAgIGlmIChzbmFwc2hvdC50cnlTdGF0ZSkgc3RvcmUuY2FuY2VsVHJ5KCk7XG4gICAgc3RvcmUuYmVnaW5UcnkobGFiZWwsIChkcmFmdCkgPT4gYXBwbHlDdWVNb3ZlcyhkcmFmdCwgcmVzdWx0Lm1vdmVzKSk7XG4gICAgc2V0UHJldmlldyh7IC4uLnJlc3VsdCwgbGFiZWwgfSk7XG4gICAgc2V0TWVzc2FnZSgnJyk7XG4gIH07XG4gIGNvbnN0IGNhbmNlbFByZXZpZXcgPSAoKSA9PiB7XG4gICAgaWYgKHNuYXBzaG90LnRyeVN0YXRlKSBzdG9yZS5jYW5jZWxUcnkoKTtcbiAgICBzZXRQcmV2aWV3KG51bGwpO1xuICAgIHNldE1lc3NhZ2UoJycpO1xuICB9O1xuICBjb25zdCBhcHBseVByZXZpZXcgPSAoKSA9PiB7XG4gICAgaWYgKCFwcmV2aWV3Py52YWxpZCB8fCAhc25hcHNob3QudHJ5U3RhdGUpIHJldHVybjtcbiAgICBzdG9yZS5hcHBseVRyeSgpO1xuICAgIHNldFByZXZpZXcobnVsbCk7XG4gICAgc2V0TWVzc2FnZSgnJyk7XG4gIH07XG4gIGNvbnN0IGNvbW1pdENhbmRpZGF0ZSA9IChsYWJlbCwgcmVzdWx0KSA9PiB7XG4gICAgaWYgKCFyZXN1bHQ/LnZhbGlkIHx8ICFyZXN1bHQuZG9jdW1lbnQpIHtcbiAgICAgIHNldE1lc3NhZ2UocmVzdWx0Py5yZWFzb24gfHwgJ1RoaXMgb3BlcmF0aW9uIGNvdWxkIG5vdCBiZSBjb21wbGV0ZWQgc2FmZWx5LicpO1xuICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICBzdG9yZS5jb21taXQobGFiZWwsIChkcmFmdCkgPT4gcmVwbGFjZURyYWZ0RG9jdW1lbnQoZHJhZnQsIHJlc3VsdC5kb2N1bWVudCksIHtcbiAgICAgIHNlbGVjdGlvbjogcmVzdWx0LnNlbGVjdGlvbiB8fCBzbmFwc2hvdC5zZWxlY3Rpb24sXG4gICAgfSk7XG4gICAgc2V0TWVzc2FnZSgnJyk7XG4gIH07XG5cbiAgY29uc3QgZGlzdHJpYnV0ZSA9ICgpID0+IHByZXZpZXdNb3ZlcygnRGlzdHJpYnV0ZSB0aXRsZSByaHl0aG0nLCByZXNvbHZlQWJvdXROYXJyYXRpdmVDdWVEaXN0cmlidXRpb24oe1xuICAgIGRvY3VtZW50OiBzbmFwc2hvdC5kb2N1bWVudCxcbiAgICBwbGFuOiBzbmFwc2hvdC5jb21waWxlZFBsYW4sXG4gICAgbWVtYmVycyxcbiAgICBwcmltYXJ5OiBzbmFwc2hvdC5zZWxlY3Rpb24sXG4gIH0pKTtcbiAgY29uc3QgZXhhY3RHYXAgPSAoKSA9PiBwcmV2aWV3TW92ZXMoJ1NldCBleGFjdCB0aXRsZSBnYXAnLCByZXNvbHZlQWJvdXROYXJyYXRpdmVDdWVFeGFjdEdhcCh7XG4gICAgZG9jdW1lbnQ6IHNuYXBzaG90LmRvY3VtZW50LFxuICAgIHBsYW46IHNuYXBzaG90LmNvbXBpbGVkUGxhbixcbiAgICBtZW1iZXJzLFxuICAgIHByaW1hcnk6IHNuYXBzaG90LnNlbGVjdGlvbixcbiAgICBnYXBXVSxcbiAgICBhbmNob3IsXG4gIH0pKTtcbiAgY29uc3QgYWxpZ25QcmltYXJ5ID0gKCkgPT4gcHJldmlld01vdmVzKCdBbGlnbiB0aXRsZXMgdG8gcGxheWhlYWQnLCByZXNvbHZlQWJvdXROYXJyYXRpdmVDdWVHcm91cEFsaWduKHtcbiAgICBkb2N1bWVudDogc25hcHNob3QuZG9jdW1lbnQsXG4gICAgcGxhbjogc25hcHNob3QuY29tcGlsZWRQbGFuLFxuICAgIG1lbWJlcnMsXG4gICAgcHJpbWFyeTogc25hcHNob3Quc2VsZWN0aW9uLFxuICAgIHBsYXloZWFkV1U6IHNuYXBzaG90LnRyYW5zcG9ydC5zdG9yeVdVLFxuICB9KSk7XG4gIGNvbnN0IGR1cGxpY2F0ZSA9ICgpID0+IGNvbW1pdENhbmRpZGF0ZSgnRHVwbGljYXRlIHRpdGxlIEN1ZXMnLCBkdXBsaWNhdGVBYm91dE5hcnJhdGl2ZUN1ZUdyb3VwKHtcbiAgICBkb2N1bWVudDogc25hcHNob3QuZG9jdW1lbnQsXG4gICAgbWVtYmVycyxcbiAgICBwcmltYXJ5OiBzbmFwc2hvdC5zZWxlY3Rpb24sXG4gIH0pKTtcbiAgY29uc3QgY29weSA9ICgpID0+IHtcbiAgICBjb25zdCByZXN1bHQgPSBjcmVhdGVBYm91dE5hcnJhdGl2ZUN1ZUNsaXBib2FyZFBheWxvYWQoe1xuICAgICAgZG9jdW1lbnQ6IHNuYXBzaG90LmRvY3VtZW50LFxuICAgICAgcGxhbjogc25hcHNob3QuY29tcGlsZWRQbGFuLFxuICAgICAgbWVtYmVycyxcbiAgICAgIHByaW1hcnk6IHNuYXBzaG90LnNlbGVjdGlvbixcbiAgICB9KTtcbiAgICBjb25zdCBwYXlsb2FkID0gcmVzdWx0Py5wYXlsb2FkIHx8IHJlc3VsdDtcbiAgICBjb25zdCB2YWxpZGF0aW9uID0gdmFsaWRhdGVBYm91dE5hcnJhdGl2ZUN1ZUNsaXBib2FyZFBheWxvYWQocGF5bG9hZCk7XG4gICAgaWYgKHJlc3VsdD8udmFsaWQgPT09IGZhbHNlIHx8IHZhbGlkYXRpb24/LnZhbGlkID09PSBmYWxzZSkge1xuICAgICAgc2V0TWVzc2FnZShyZXN1bHQ/LnJlYXNvbiB8fCB2YWxpZGF0aW9uPy5yZWFzb24gfHwgJ1RoZXNlIHRpdGxlcyBjYW5ub3QgYmUgY29waWVkLicpO1xuICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICBzZXRDbGlwYm9hcmQocGF5bG9hZCk7XG4gICAgc2V0TWVzc2FnZShgJHttZW1iZXJzLmxlbmd0aH0gdGl0bGUke21lbWJlcnMubGVuZ3RoID09PSAxID8gJycgOiAncyd9IGNvcGllZCBmb3IgdGhpcyBlZGl0b3Igc2Vzc2lvbi5gKTtcbiAgfTtcbiAgY29uc3QgcGFzdGUgPSAoKSA9PiBjb21taXRDYW5kaWRhdGUoJ1Bhc3RlIHRpdGxlIEN1ZXMnLCByZXNvbHZlQWJvdXROYXJyYXRpdmVDdWVHcm91cFBhc3RlKHtcbiAgICBkb2N1bWVudDogc25hcHNob3QuZG9jdW1lbnQsXG4gICAgcGxhbjogc25hcHNob3QuY29tcGlsZWRQbGFuLFxuICAgIHBheWxvYWQ6IGNsaXBib2FyZCxcbiAgICBkZXN0aW5hdGlvblNlY3Rpb25JZDogc25hcHNob3Quc2VsZWN0aW9uLnNlY3Rpb25JZCxcbiAgICBwbGF5aGVhZFdVOiBzbmFwc2hvdC50cmFuc3BvcnQuc3RvcnlXVSxcbiAgfSkpO1xuXG4gIGNvbnN0IGdob3N0TW92ZXMgPSBwcmV2aWV3Py52YWxpZCA/IHByZXZpZXcubW92ZXMgOiBbXTtcbiAgY29uc3QgbWF4V1UgPSBNYXRoLm1heCgwLjAwMSwgc25hcHNob3QuY29tcGlsZWRQbGFuPy5tYXhTdG9yeVdVIHx8IDEpO1xuICByZXR1cm4gKFxuICAgIDxkZXRhaWxzIGNsYXNzTmFtZT1cImFib3V0LWVkaXRvci1yaHl0aG1cIiBvcGVuPXttZW1iZXJzLmxlbmd0aCA+IDF9PlxuICAgICAgPHN1bW1hcnk+Umh5dGhtIGFuZCByZXVzZTwvc3VtbWFyeT5cbiAgICAgIHttZW1iZXJzLmxlbmd0aCA+IDEgPyAoXG4gICAgICAgIDw+XG4gICAgICAgICAgPGRpdiBjbGFzc05hbWU9XCJhYm91dC1lZGl0b3Itcmh5dGhtLWFjdGlvbnNcIj5cbiAgICAgICAgICAgIDxidXR0b24gdHlwZT1cImJ1dHRvblwiIG9uQ2xpY2s9e2Rpc3RyaWJ1dGV9PkRpc3RyaWJ1dGUgZXZlbmx5PC9idXR0b24+XG4gICAgICAgICAgICA8YnV0dG9uIHR5cGU9XCJidXR0b25cIiBvbkNsaWNrPXthbGlnblByaW1hcnl9PkFsaWduIHByaW1hcnkgdG8gcGxheWhlYWQ8L2J1dHRvbj5cbiAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cImFib3V0LWVkaXRvci1yaHl0aG0tZ2FwXCI+XG4gICAgICAgICAgICA8UHJvcGVydHkgbGFiZWw9XCJFeGFjdCBnYXBcIj48aW5wdXQgdHlwZT1cIm51bWJlclwiIG1pbj1cIjBcIiBtYXg9XCI4XCIgc3RlcD1cIjAuMDVcIiB2YWx1ZT17Z2FwV1V9IG9uQ2hhbmdlPXsoZXZlbnQpID0+IHNldEdhcFdVKE1hdGgubWF4KDAsIE51bWJlcihldmVudC50YXJnZXQudmFsdWUpIHx8IDApKX0gLz48L1Byb3BlcnR5PlxuICAgICAgICAgICAgPFByb3BlcnR5IGxhYmVsPVwiQW5jaG9yXCI+PHNlbGVjdCB2YWx1ZT17YW5jaG9yfSBvbkNoYW5nZT17KGV2ZW50KSA9PiBzZXRBbmNob3IoZXZlbnQudGFyZ2V0LnZhbHVlKX0+PG9wdGlvbiB2YWx1ZT1cInByaW1hcnlcIj5QcmltYXJ5PC9vcHRpb24+PG9wdGlvbiB2YWx1ZT1cImZpcnN0XCI+Rmlyc3Q8L29wdGlvbj48b3B0aW9uIHZhbHVlPVwibGFzdFwiPkxhc3Q8L29wdGlvbj48L3NlbGVjdD48L1Byb3BlcnR5PlxuICAgICAgICAgICAgPGJ1dHRvbiB0eXBlPVwiYnV0dG9uXCIgb25DbGljaz17ZXhhY3RHYXB9PlByZXZpZXcgZXhhY3QgZ2FwPC9idXR0b24+XG4gICAgICAgICAgPC9kaXY+XG4gICAgICAgIDwvPlxuICAgICAgKSA6IG51bGx9XG4gICAgICB7Z2hvc3RNb3Zlcy5sZW5ndGggPyAoXG4gICAgICAgIDxkaXYgY2xhc3NOYW1lPVwiYWJvdXQtZWRpdG9yLXJoeXRobS1wcmV2aWV3XCIgYXJpYS1sYWJlbD1cIlByb3Bvc2VkIHRpdGxlIHJoeXRobVwiPlxuICAgICAgICAgIHtnaG9zdE1vdmVzLm1hcCgobW92ZSkgPT4ge1xuICAgICAgICAgICAgY29uc3QgY29tcGlsZWQgPSBzbmFwc2hvdC5jb21waWxlZFBsYW4uc2VjdGlvbnMuZmluZCgoaXRlbSkgPT4gaXRlbS5pZCA9PT0gbW92ZS5zZWN0aW9uSWQpO1xuICAgICAgICAgICAgY29uc3Qgc3RvcnlXVSA9IE51bWJlcihjb21waWxlZD8uc3RhcnRXVSB8fCAwKSArIChtb3ZlLmhvbGQgKiBOdW1iZXIoY29tcGlsZWQ/LnRyYXZlbFdVIHx8IDApKTtcbiAgICAgICAgICAgIHJldHVybiA8aSBrZXk9e2Ake21vdmUuc2VjdGlvbklkfToke21vdmUuY3VlSWR9YH0gc3R5bGU9e3sgbGVmdDogYCR7KHN0b3J5V1UgLyBtYXhXVSkgKiAxMDB9JWAgfX0gdGl0bGU9e2Ake21vdmUuY3VlSWR9IMK3ICR7Zm9ybWF0V1Uoc3RvcnlXVSl9YH0gLz47XG4gICAgICAgICAgfSl9XG4gICAgICAgIDwvZGl2PlxuICAgICAgKSA6IG51bGx9XG4gICAgICB7bWVzc2FnZSA/IDxwIGNsYXNzTmFtZT17YGFib3V0LWVkaXRvci1yaHl0aG0tbWVzc2FnZSR7cHJldmlldyAmJiAhcHJldmlldy52YWxpZCA/ICcgaXMtZXJyb3InIDogJyd9YH0+e21lc3NhZ2V9PC9wPiA6IG51bGx9XG4gICAgICB7cHJldmlldz8udmFsaWQgJiYgc25hcHNob3QudHJ5U3RhdGUgPyA8ZGl2IGNsYXNzTmFtZT1cImFib3V0LWVkaXRvci10cnlcIj48c3Bhbj5QcmV2aWV3aW5nIHtwcmV2aWV3LmxhYmVsfTwvc3Bhbj48YnV0dG9uIHR5cGU9XCJidXR0b25cIiBvbkNsaWNrPXtjYW5jZWxQcmV2aWV3fT5DYW5jZWw8L2J1dHRvbj48YnV0dG9uIHR5cGU9XCJidXR0b25cIiBjbGFzc05hbWU9XCJpcy1wcmltYXJ5XCIgb25DbGljaz17YXBwbHlQcmV2aWV3fT5BcHBseTwvYnV0dG9uPjwvZGl2PiA6IG51bGx9XG4gICAgICA8ZGl2IGNsYXNzTmFtZT1cImFib3V0LWVkaXRvci1yaHl0aG0tYWN0aW9uc1wiPlxuICAgICAgICA8YnV0dG9uIHR5cGU9XCJidXR0b25cIiBvbkNsaWNrPXtkdXBsaWNhdGV9PkR1cGxpY2F0ZSB7bWVtYmVycy5sZW5ndGggPiAxID8gJ3NlbGVjdGlvbicgOiAndGl0bGUnfTwvYnV0dG9uPlxuICAgICAgICA8YnV0dG9uIHR5cGU9XCJidXR0b25cIiBvbkNsaWNrPXtjb3B5fT5Db3B5PC9idXR0b24+XG4gICAgICAgIDxidXR0b24gdHlwZT1cImJ1dHRvblwiIGRpc2FibGVkPXshY2xpcGJvYXJkfSBvbkNsaWNrPXtwYXN0ZX0+UGFzdGUgYXQgcGxheWhlYWQ8L2J1dHRvbj5cbiAgICAgIDwvZGl2PlxuICAgIDwvZGV0YWlscz5cbiAgKTtcbn1cblxuZnVuY3Rpb24gQ3VlSW5zcGVjdG9yKHsgc3RvcmUsIHNuYXBzaG90LCBzZWN0aW9uLCBjbGlwYm9hcmQsIHNldENsaXBib2FyZCB9KSB7XG4gIGNvbnN0IHNlbGVjdGVkTWVtYmVycyA9IGdldEFib3V0TmFycmF0aXZlU2VsZWN0aW9uTWVtYmVycyhzbmFwc2hvdC5zZWxlY3Rpb24pO1xuICBjb25zdCBzZWN0aW9uSW5kZXggPSBnZXRTZWN0aW9uSW5kZXgoc25hcHNob3QuZG9jdW1lbnQsIHNlY3Rpb24uaWQpO1xuICBjb25zdCBjdWVJbmRleCA9IHNlY3Rpb24udGV4dC5jdWVzLmZpbmRJbmRleCgoY3VlKSA9PiBjdWUuaWQgPT09IHNuYXBzaG90LnNlbGVjdGlvbi5jdWVJZCk7XG4gIGNvbnN0IGN1ZSA9IHNlY3Rpb24udGV4dC5jdWVzW2N1ZUluZGV4XTtcbiAgaWYgKCFjdWUpIHJldHVybiA8U2VjdGlvbkluc3BlY3RvciBzdG9yZT17c3RvcmV9IHNuYXBzaG90PXtzbmFwc2hvdH0gc2VjdGlvbj17c2VjdGlvbn0gLz47XG4gIGNvbnN0IHVwZGF0ZSA9IChmaWVsZCwgdmFsdWUpID0+IHN0b3JlLmNvbW1pdChgRWRpdCBDdWUgJHtmaWVsZH1gLCAoZHJhZnQpID0+IHtcbiAgICBkcmFmdC5zZWN0aW9uc1tzZWN0aW9uSW5kZXhdLnRleHQuY3Vlc1tjdWVJbmRleF1bZmllbGRdID0gdmFsdWU7XG4gIH0sIHsgY29hbGVzY2VLZXk6IGBjdWU6JHtjdWUuaWR9OiR7ZmllbGR9YCwgc2VsZWN0aW9uOiBzbmFwc2hvdC5zZWxlY3Rpb24gfSk7XG4gIGNvbnN0IHJlbW92ZSA9ICgpID0+IHN0b3JlLmNvbW1pdCgnRGVsZXRlIHRleHQgQ3VlJywgKGRyYWZ0KSA9PiB7XG4gICAgZHJhZnQuc2VjdGlvbnNbc2VjdGlvbkluZGV4XS50ZXh0LmN1ZXMuc3BsaWNlKGN1ZUluZGV4LCAxKTtcbiAgfSwgeyBzZWxlY3Rpb246IHsgdHlwZTogJ3NlY3Rpb24nLCBzZWN0aW9uSWQ6IHNlY3Rpb24uaWQgfSB9KTtcbiAgY29uc3QgdGltaW5nQm91bmRzID0gZ2V0QWJvdXROYXJyYXRpdmVDdWVUaW1pbmdCb3VuZHMoY3VlKTtcbiAgY29uc3QgbW90aW9uSW50ZXJ2YWwgPSBnZXRBYm91dE5hcnJhdGl2ZUN1ZU1vdGlvbkludGVydmFsKGN1ZSwgc25hcHNob3QuZG9jdW1lbnQuZ2xvYmFscy50ZXh0TW90aW9uKTtcbiAgY29uc3QgbW92ZW1lbnQgPSBnZXRBYm91dE5hcnJhdGl2ZUN1ZU1vdmVtZW50KGN1ZSk7XG4gIGNvbnN0IG1vdmVDdWUgPSAocGVyY2VudCkgPT4gc3RvcmUuY29tbWl0KCdNb3ZlIHRleHQgQ3VlJywgKGRyYWZ0KSA9PiB7XG4gICAgY29uc3QgdGFyZ2V0ID0gZHJhZnQuc2VjdGlvbnNbc2VjdGlvbkluZGV4XS50ZXh0LmN1ZXNbY3VlSW5kZXhdO1xuICAgIE9iamVjdC5hc3NpZ24odGFyZ2V0LCBtb3ZlQWJvdXROYXJyYXRpdmVDdWVUaW1pbmcodGFyZ2V0LCBwZXJjZW50IC8gMTAwKSk7XG4gIH0sIHsgY29hbGVzY2VLZXk6IGBjdWU6JHtjdWUuaWR9OnRpbWluZ2AsIHNlbGVjdGlvbjogeyAuLi5zbmFwc2hvdC5zZWxlY3Rpb24sIGtleVBhcnQ6ICdmb2N1cycgfSB9KTtcbiAgY29uc3QgdXBkYXRlTW92ZW1lbnQgPSAobW9kZSkgPT4gc3RvcmUuY29tbWl0KCdDaGFuZ2UgdGV4dCBtb3ZlbWVudCcsIChkcmFmdCkgPT4ge1xuICAgIGNvbnN0IHRhcmdldCA9IGRyYWZ0LnNlY3Rpb25zW3NlY3Rpb25JbmRleF0udGV4dC5jdWVzW2N1ZUluZGV4XTtcbiAgICB0YXJnZXQubW90aW9uID0geyAuLi50YXJnZXQubW90aW9uLCBtb2RlIH07XG4gIH0sIHsgc2VsZWN0aW9uOiBzbmFwc2hvdC5zZWxlY3Rpb24gfSk7XG4gIHJldHVybiAoXG4gICAgPD5cbiAgICAgIDxoZWFkZXI+PHNwYW4+VGV4dCBDdWU8L3NwYW4+PHN0cm9uZz57Y3VlLmlkfTwvc3Ryb25nPjwvaGVhZGVyPlxuICAgICAge3NlbGVjdGVkTWVtYmVycy5sZW5ndGggPiAxID8gKFxuICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cImFib3V0LWVkaXRvci1ncm91cC1zdW1tYXJ5XCI+XG4gICAgICAgICAgPHN0cm9uZz57c2VsZWN0ZWRNZW1iZXJzLmxlbmd0aH0gdGl0bGVzIHNlbGVjdGVkPC9zdHJvbmc+XG4gICAgICAgICAgPG9sPntzZWxlY3RlZE1lbWJlcnMubWFwKChtZW1iZXIpID0+IHtcbiAgICAgICAgICAgIGNvbnN0IG1lbWJlclNlY3Rpb24gPSBzbmFwc2hvdC5kb2N1bWVudC5zZWN0aW9ucy5maW5kKChpdGVtKSA9PiBpdGVtLmlkID09PSBtZW1iZXIuc2VjdGlvbklkKTtcbiAgICAgICAgICAgIGNvbnN0IG1lbWJlckN1ZSA9IG1lbWJlclNlY3Rpb24/LnRleHQ/LmN1ZXM/LmZpbmQoKGl0ZW0pID0+IGl0ZW0uaWQgPT09IG1lbWJlci5jdWVJZCk7XG4gICAgICAgICAgICByZXR1cm4gPGxpIGtleT17YCR7bWVtYmVyLnNlY3Rpb25JZH06JHttZW1iZXIuY3VlSWR9YH0+PHNwYW4+e21lbWJlclNlY3Rpb24/LmxhYmVsfTwvc3Bhbj57bWVtYmVyQ3VlPy50ZXh0fTwvbGk+O1xuICAgICAgICAgIH0pfTwvb2w+XG4gICAgICAgICAgPGJ1dHRvbiB0eXBlPVwiYnV0dG9uXCIgb25DbGljaz17KCkgPT4gc3RvcmUuc2V0U2VsZWN0aW9uKHsgdHlwZTogJ2N1ZScsIHNlY3Rpb25JZDogc2VjdGlvbi5pZCwgY3VlSWQ6IGN1ZS5pZCwga2V5UGFydDogJ2ZvY3VzJyB9KX0+S2VlcCBwcmltYXJ5IG9ubHk8L2J1dHRvbj5cbiAgICAgICAgPC9kaXY+XG4gICAgICApIDogbnVsbH1cbiAgICAgIDxwIGNsYXNzTmFtZT1cImFib3V0LWVkaXRvci1oZWxwXCI+RHJhZyB0aGUgcGluayB0aW1pbmcgbWFya2VyIGFueXdoZXJlIGZyb20gMOKAkzEwMCUgb2YgaXRzIFNlY3Rpb24uIFRoaXMgbW92ZXMgdGhlIHRpdGxlJ3MgZm9jdXMgdGltZSBvbmx5LiBJdHMgdHJhdmVsIGR1cmF0aW9uLCBzcGVlZCwgYmx1ciwgYW5kIGluL291dCBjYWRlbmNlIHJlbWFpbiBjb250cm9sbGVkIGdsb2JhbGx5IHVuZGVyIFNwYXRpYWwgdGl0bGVzLjwvcD5cbiAgICAgIDxQcm9wZXJ0eSBsYWJlbD1cIlN0YXRlbWVudFwiPjx0ZXh0YXJlYSByb3dzPVwiN1wiIHZhbHVlPXtjdWUudGV4dH0gb25DaGFuZ2U9eyhldmVudCkgPT4gdXBkYXRlKCd0ZXh0JywgZXZlbnQudGFyZ2V0LnZhbHVlKX0gLz48L1Byb3BlcnR5PlxuICAgICAgPFByb3BlcnR5IGxhYmVsPVwiTW92ZW1lbnRcIj48c2VsZWN0IHZhbHVlPXttb3ZlbWVudH0gb25DaGFuZ2U9eyhldmVudCkgPT4gdXBkYXRlTW92ZW1lbnQoZXZlbnQudGFyZ2V0LnZhbHVlKX0+PG9wdGlvbiB2YWx1ZT1cInNwYXRpYWxcIj5TcGF0aWFsIHRyYXZlbDwvb3B0aW9uPjxvcHRpb24gdmFsdWU9XCJ2ZXJ0aWNhbFwiPlZlcnRpY2FsIHNjcm9sbDwvb3B0aW9uPjwvc2VsZWN0PjwvUHJvcGVydHk+XG4gICAgICA8TnVtYmVyUHJvcGVydHlcbiAgICAgICAgbGFiZWw9XCJQb3NpdGlvblwiXG4gICAgICAgIHZhbHVlPXtOdW1iZXIoKGN1ZS5ob2xkICogMTAwKS50b0ZpeGVkKDEpKX1cbiAgICAgICAgbWluPXtOdW1iZXIoKHRpbWluZ0JvdW5kcy5taW4gKiAxMDApLnRvRml4ZWQoMSkpfVxuICAgICAgICBtYXg9e051bWJlcigodGltaW5nQm91bmRzLm1heCAqIDEwMCkudG9GaXhlZCgxKSl9XG4gICAgICAgIHN0ZXA9ezAuNX1cbiAgICAgICAgdW5pdD1cIiVcIlxuICAgICAgICBkaXNhYmxlZD17dGltaW5nQm91bmRzLm1pbiA9PT0gdGltaW5nQm91bmRzLm1heH1cbiAgICAgICAgb25DaGFuZ2U9e21vdmVDdWV9XG4gICAgICAvPlxuICAgICAge21vdmVtZW50ID09PSAnc3BhdGlhbCcgPyAoXG4gICAgICAgIDw+XG4gICAgICAgICAgPFByb3BlcnR5IGxhYmVsPVwiQXV0byB0cmF2ZWxcIj48b3V0cHV0IGNsYXNzTmFtZT1cImFib3V0LWVkaXRvci1yZWFkb3V0XCI+e01hdGgucm91bmQobW90aW9uSW50ZXJ2YWwuc3RhcnQgKiAxMDApfeKAk3tNYXRoLnJvdW5kKG1vdGlvbkludGVydmFsLmVuZCAqIDEwMCl9JTwvb3V0cHV0PjwvUHJvcGVydHk+XG4gICAgICAgICAgPFByb3BlcnR5IGxhYmVsPVwiTW90aW9uIHByZXNldFwiPjxzZWxlY3QgdmFsdWU9e2N1ZS5wcmVzZXR9IG9uQ2hhbmdlPXsoZXZlbnQpID0+IHVwZGF0ZSgncHJlc2V0JywgZXZlbnQudGFyZ2V0LnZhbHVlKX0+PG9wdGlvbiB2YWx1ZT1cInRyYXZlbGxpbmctdGl0bGUtdjFcIj5UcmF2ZWxsaW5nIHRpdGxlPC9vcHRpb24+PG9wdGlvbiB2YWx1ZT1cIm9wZW5lci12MVwiPk9wZW5lcjwvb3B0aW9uPjxvcHRpb24gdmFsdWU9XCJmaW5hbGUtdjFcIj5GaW5hbGU8L29wdGlvbj48L3NlbGVjdD48L1Byb3BlcnR5PlxuICAgICAgICA8Lz5cbiAgICAgICkgOiA8UHJvcGVydHkgbGFiZWw9XCJSZXZlYWxcIj48b3V0cHV0IGNsYXNzTmFtZT1cImFib3V0LWVkaXRvci1yZWFkb3V0XCI+RWRpdG9yaWFsIHZlcnRpY2FsIHNjcm9sbDwvb3V0cHV0PjwvUHJvcGVydHk+fVxuICAgICAgPEN1ZVJoeXRobUFuZFJldXNlIHN0b3JlPXtzdG9yZX0gc25hcHNob3Q9e3NuYXBzaG90fSBjbGlwYm9hcmQ9e2NsaXBib2FyZH0gc2V0Q2xpcGJvYXJkPXtzZXRDbGlwYm9hcmR9IC8+XG4gICAgICA8YnV0dG9uIHR5cGU9XCJidXR0b25cIiBjbGFzc05hbWU9XCJhYm91dC1lZGl0b3ItZGFuZ2VyXCIgZGlzYWJsZWQ9e3NlY3Rpb24udHlwZSA9PT0gJ2ZpbmFsZSd9IG9uQ2xpY2s9e3JlbW92ZX0+RGVsZXRlIEN1ZTwvYnV0dG9uPlxuICAgIDwvPlxuICApO1xufVxuXG5mdW5jdGlvbiBEaXNjaXBsaW5lUmV2ZWFsSW5zcGVjdG9yKHsgc3RvcmUsIHNuYXBzaG90LCBzZWN0aW9uIH0pIHtcbiAgY29uc3Qgc2VjdGlvbkluZGV4ID0gZ2V0U2VjdGlvbkluZGV4KHNuYXBzaG90LmRvY3VtZW50LCBzZWN0aW9uLmlkKTtcbiAgY29uc3QgcmV2ZWFsID0gc2VjdGlvbi50ZXh0LmRpc2NpcGxpbmVSZXZlYWw7XG4gIGlmICghcmV2ZWFsKSByZXR1cm4gPFNlY3Rpb25JbnNwZWN0b3Igc3RvcmU9e3N0b3JlfSBzbmFwc2hvdD17c25hcHNob3R9IHNlY3Rpb249e3NlY3Rpb259IC8+O1xuICBjb25zdCB1cGRhdGUgPSAobGFiZWwsIG11dGF0ZSwgY29hbGVzY2VLZXkgPSBudWxsKSA9PiBzdG9yZS5jb21taXQobGFiZWwsIChkcmFmdCkgPT4ge1xuICAgIG11dGF0ZShkcmFmdC5zZWN0aW9uc1tzZWN0aW9uSW5kZXhdLnRleHQuZGlzY2lwbGluZVJldmVhbCk7XG4gIH0sIHsgY29hbGVzY2VLZXksIHNlbGVjdGlvbjogc25hcHNob3Quc2VsZWN0aW9uIH0pO1xuICBjb25zdCBvY2N1cGllZCA9ICgocmV2ZWFsLml0ZW1zLmxlbmd0aCAtIDEpICogcmV2ZWFsLnN0YWdnZXIpICsgcmV2ZWFsLmxhYmVsRHVyYXRpb24gKyByZXZlYWwuaG9sZDtcbiAgY29uc3QgbGltaXRzRm9yID0gKGNvbnRyb2wpID0+IHtcbiAgICBpZiAoY29udHJvbC5pZCA9PT0gJ3N0YXJ0JykgcmV0dXJuIHsgbWluOiBjb250cm9sLm1pbiwgbWF4OiBNYXRoLm1heChjb250cm9sLm1pbiwgcmV2ZWFsLmVuZCAtIG9jY3VwaWVkKSB9O1xuICAgIGlmIChjb250cm9sLmlkID09PSAnZW5kJykgcmV0dXJuIHsgbWluOiBNYXRoLm1pbihjb250cm9sLm1heCwgcmV2ZWFsLnN0YXJ0ICsgb2NjdXBpZWQpLCBtYXg6IGNvbnRyb2wubWF4IH07XG4gICAgaWYgKGNvbnRyb2wuaWQgPT09ICdzdGFnZ2VyJykgcmV0dXJuIHtcbiAgICAgIG1pbjogY29udHJvbC5taW4sXG4gICAgICBtYXg6IE1hdGgubWF4KGNvbnRyb2wubWluLCAocmV2ZWFsLmVuZCAtIHJldmVhbC5zdGFydCAtIHJldmVhbC5sYWJlbER1cmF0aW9uIC0gcmV2ZWFsLmhvbGQpIC8gTWF0aC5tYXgoMSwgcmV2ZWFsLml0ZW1zLmxlbmd0aCAtIDEpKSxcbiAgICB9O1xuICAgIGlmIChjb250cm9sLmlkID09PSAnbGFiZWxEdXJhdGlvbicpIHJldHVybiB7XG4gICAgICBtaW46IGNvbnRyb2wubWluLFxuICAgICAgbWF4OiBNYXRoLm1heChjb250cm9sLm1pbiwgcmV2ZWFsLmVuZCAtIHJldmVhbC5zdGFydCAtICgocmV2ZWFsLml0ZW1zLmxlbmd0aCAtIDEpICogcmV2ZWFsLnN0YWdnZXIpIC0gcmV2ZWFsLmhvbGQpLFxuICAgIH07XG4gICAgaWYgKGNvbnRyb2wuaWQgPT09ICdob2xkJykgcmV0dXJuIHtcbiAgICAgIG1pbjogY29udHJvbC5taW4sXG4gICAgICBtYXg6IE1hdGgubWF4KGNvbnRyb2wubWluLCByZXZlYWwuZW5kIC0gcmV2ZWFsLnN0YXJ0IC0gKChyZXZlYWwuaXRlbXMubGVuZ3RoIC0gMSkgKiByZXZlYWwuc3RhZ2dlcikgLSByZXZlYWwubGFiZWxEdXJhdGlvbiksXG4gICAgfTtcbiAgICByZXR1cm4geyBtaW46IGNvbnRyb2wubWluLCBtYXg6IGNvbnRyb2wubWF4IH07XG4gIH07XG4gIHJldHVybiAoXG4gICAgPD5cbiAgICAgIDxoZWFkZXI+PHNwYW4+VGV4dCBzZXF1ZW5jZTwvc3Bhbj48c3Ryb25nPkRpc2NpcGxpbmUgcmV2ZWFsPC9zdHJvbmc+PC9oZWFkZXI+XG4gICAgICA8cCBjbGFzc05hbWU9XCJhYm91dC1lZGl0b3ItaGVscFwiPk9uZSBjbGlwIGNvbnRyb2xzIHRoZSBjb21wbGV0ZSBzaXgtcG9pbnQgc2VxdWVuY2UuIERyYWcgaXRzIHN0cmlwZWQgYmxvY2sgaW4gdGhlIFRleHQgbGFuZSB0byBtb3ZlIGV2ZXJ5IHJldmVhbCB0b2dldGhlci48L3A+XG4gICAgICA8ZGV0YWlscyBvcGVuPjxzdW1tYXJ5PlJldmVhbCBjaG9yZW9ncmFwaHk8L3N1bW1hcnk+XG4gICAgICAgIHtBQk9VVF9OQVJSQVRJVkVfRElTQ0lQTElORV9SRVZFQUxfQ09OVFJPTFMubWFwKChjb250cm9sKSA9PiB7XG4gICAgICAgICAgY29uc3QgbGltaXRzID0gbGltaXRzRm9yKGNvbnRyb2wpO1xuICAgICAgICAgIHJldHVybiAoXG4gICAgICAgICAgICA8TnVtYmVyUHJvcGVydHlcbiAgICAgICAgICAgICAga2V5PXtjb250cm9sLmlkfVxuICAgICAgICAgICAgICBsYWJlbD17Y29udHJvbC5sYWJlbH1cbiAgICAgICAgICAgICAgdmFsdWU9e3JldmVhbFtjb250cm9sLmlkXX1cbiAgICAgICAgICAgICAgbWluPXtsaW1pdHMubWlufVxuICAgICAgICAgICAgICBtYXg9e2xpbWl0cy5tYXh9XG4gICAgICAgICAgICAgIHN0ZXA9e2NvbnRyb2wuc3RlcH1cbiAgICAgICAgICAgICAgdW5pdD17Y29udHJvbC51bml0fVxuICAgICAgICAgICAgICBvbkNoYW5nZT17KHZhbHVlKSA9PiB1cGRhdGUoYENoYW5nZSAke2NvbnRyb2wubGFiZWx9YCwgKGRyYWZ0KSA9PiB7IGRyYWZ0W2NvbnRyb2wuaWRdID0gdmFsdWU7IH0sIGBkaXNjaXBsaW5lLXJldmVhbDoke3NlY3Rpb24uaWR9OiR7Y29udHJvbC5pZH1gKX1cbiAgICAgICAgICAgIC8+XG4gICAgICAgICAgKTtcbiAgICAgICAgfSl9XG4gICAgICA8L2RldGFpbHM+XG4gICAgICA8ZGV0YWlscyBvcGVuPjxzdW1tYXJ5PlJldmVhbCBvcmRlciBhbmQgbGFiZWxzPC9zdW1tYXJ5PlxuICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cImFib3V0LWVkaXRvci1kaXNjaXBsaW5lLWl0ZW1zXCI+XG4gICAgICAgICAge3JldmVhbC5pdGVtcy5tYXAoKGl0ZW0sIGl0ZW1JbmRleCkgPT4gKFxuICAgICAgICAgICAgPGRpdiBjbGFzc05hbWU9XCJhYm91dC1lZGl0b3ItZGlzY2lwbGluZS1pdGVtXCIga2V5PXtpdGVtLmdyb3VwfT5cbiAgICAgICAgICAgICAgPGNvZGU+e1N0cmluZyhpdGVtSW5kZXggKyAxKS5wYWRTdGFydCgyLCAnMCcpfTwvY29kZT5cbiAgICAgICAgICAgICAgPGlucHV0IHZhbHVlPXtpdGVtLmxhYmVsfSBhcmlhLWxhYmVsPXtgRGlzY2lwbGluZSAke2l0ZW1JbmRleCArIDF9IGxhYmVsYH0gb25DaGFuZ2U9eyhldmVudCkgPT4gdXBkYXRlKCdFZGl0IGRpc2NpcGxpbmUgbGFiZWwnLCAoZHJhZnQpID0+IHsgZHJhZnQuaXRlbXNbaXRlbUluZGV4XS5sYWJlbCA9IGV2ZW50LnRhcmdldC52YWx1ZTsgfSwgYGRpc2NpcGxpbmUtcmV2ZWFsOiR7c2VjdGlvbi5pZH06aXRlbToke2l0ZW0uZ3JvdXB9OmxhYmVsYCl9IC8+XG4gICAgICAgICAgICAgIDxkaXYgY2xhc3NOYW1lPVwiYWJvdXQtZWRpdG9yLWRpc2NpcGxpbmUtcGFsZXR0ZVwiIHRpdGxlPXtgJHtpdGVtLmxhYmVsfSB1c2VzIHRoZSBIb21lIHNpbXVsYXRpb24gJHtESVNDSVBMSU5FX0JBTExfVE9LRU5fQllfR1JPVVBbaXRlbS5ncm91cF19YH0+XG4gICAgICAgICAgICAgICAgPGkgc3R5bGU9e3sgYmFja2dyb3VuZDogYHZhcigke0RJU0NJUExJTkVfQkFMTF9UT0tFTl9CWV9HUk9VUFtpdGVtLmdyb3VwXX0pYCB9fSAvPlxuICAgICAgICAgICAgICAgIDxjb2RlPntESVNDSVBMSU5FX0JBTExfVE9LRU5fQllfR1JPVVBbaXRlbS5ncm91cF19PC9jb2RlPlxuICAgICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgICAgPHNwYW4+XG4gICAgICAgICAgICAgICAgPGJ1dHRvbiB0eXBlPVwiYnV0dG9uXCIgZGlzYWJsZWQ9e2l0ZW1JbmRleCA9PT0gMH0gYXJpYS1sYWJlbD17YFJldmVhbCAke2l0ZW0ubGFiZWx9IGVhcmxpZXJgfSBvbkNsaWNrPXsoKSA9PiB1cGRhdGUoJ1Jlb3JkZXIgZGlzY2lwbGluZSByZXZlYWwnLCAoZHJhZnQpID0+IHsgY29uc3QgW21vdmVkXSA9IGRyYWZ0Lml0ZW1zLnNwbGljZShpdGVtSW5kZXgsIDEpOyBkcmFmdC5pdGVtcy5zcGxpY2UoaXRlbUluZGV4IC0gMSwgMCwgbW92ZWQpOyB9KX0+4oaRPC9idXR0b24+XG4gICAgICAgICAgICAgICAgPGJ1dHRvbiB0eXBlPVwiYnV0dG9uXCIgZGlzYWJsZWQ9e2l0ZW1JbmRleCA9PT0gcmV2ZWFsLml0ZW1zLmxlbmd0aCAtIDF9IGFyaWEtbGFiZWw9e2BSZXZlYWwgJHtpdGVtLmxhYmVsfSBsYXRlcmB9IG9uQ2xpY2s9eygpID0+IHVwZGF0ZSgnUmVvcmRlciBkaXNjaXBsaW5lIHJldmVhbCcsIChkcmFmdCkgPT4geyBjb25zdCBbbW92ZWRdID0gZHJhZnQuaXRlbXMuc3BsaWNlKGl0ZW1JbmRleCwgMSk7IGRyYWZ0Lml0ZW1zLnNwbGljZShpdGVtSW5kZXggKyAxLCAwLCBtb3ZlZCk7IH0pfT7ihpM8L2J1dHRvbj5cbiAgICAgICAgICAgICAgPC9zcGFuPlxuICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgKSl9XG4gICAgICAgIDwvZGl2PlxuICAgICAgPC9kZXRhaWxzPlxuICAgICAgPHAgY2xhc3NOYW1lPVwiYWJvdXQtZWRpdG9yLWhlbHBcIj5UaGUgc2l4IHBvaW50cyBwZXJzaXN0IGFmdGVyIHRoZSBsYWJlbHMgbGVhdmUuIEFuIGVkaXRvcmlhbCBibG9jayBtYXJrZWQg4oCcUmVjb25uZWN0IHBvaW50IGdyaWTigJ0gcmVzdG9yZXMgdGhlIHN1cnJvdW5kaW5nIGdyaWQgYXMgdGhhdCBwYXJhZ3JhcGggZW50ZXJzLjwvcD5cbiAgICA8Lz5cbiAgKTtcbn1cblxuZnVuY3Rpb24gQ2FtZXJhSW5zcGVjdG9yKHsgc3RvcmUsIHNuYXBzaG90LCBzZWN0aW9uIH0pIHtcbiAgY29uc3Qgc2VjdGlvbkluZGV4ID0gZ2V0U2VjdGlvbkluZGV4KHNuYXBzaG90LmRvY3VtZW50LCBzZWN0aW9uLmlkKTtcbiAgY29uc3Qga2V5SW5kZXggPSBzbmFwc2hvdC5zZWxlY3Rpb24ua2V5SW5kZXg7XG4gIGNvbnN0IHNlbGVjdGVkS2V5ID0gc2VjdGlvbi5jYW1lcmEua2V5c1trZXlJbmRleF07XG4gIGNvbnN0IGtleSA9IHNlbGVjdGVkS2V5ICYmIHNlbGVjdGVkS2V5LmF0ID4gMCAmJiBzZWxlY3RlZEtleS5hdCA8IDEgPyBzZWxlY3RlZEtleSA6IG51bGw7XG4gIGNvbnN0IGxvY2FsID0gZ2V0TG9jYWxQcm9ncmVzcyhzbmFwc2hvdC5jb21waWxlZFBsYW4sIHNlY3Rpb24sIHNuYXBzaG90LnRyYW5zcG9ydC5zdG9yeVdVKTtcbiAgY29uc3QgdGFyZ2V0QXQgPSBNYXRoLm1pbigwLjk5NSwgTWF0aC5tYXgoMC4wMDUsIHNuYXBBYm91dE5hcnJhdGl2ZVRpbWVsaW5lVmFsdWUobG9jYWwpKSk7XG4gIGNvbnN0IGFwcGx5UHJlc2V0ID0gKHByZXNldCkgPT4gc3RvcmUuY29tbWl0KGBBcHBseSAke3ByZXNldH0gY2FtZXJhIHJlY2lwZWAsIChkcmFmdCkgPT4ge1xuICAgIGNvbnN0IHJlY2lwZXMgPSB7XG4gICAgICBQdXNoOiBbXG4gICAgICAgIHsgYXQ6IDAsIG9mZnNldDogWzAsIDAsIDBdLCBsb29rQXRPZmZzZXQ6IFswLCAwLCAtMV0sIGZvdjogNDgsIHJvbGw6IDAsIGVhc2luZzogJ3Ntb290aHN0ZXAnIH0sXG4gICAgICAgIHsgYXQ6IDEsIG9mZnNldDogWzAsIDAsIC0xLjJdLCBsb29rQXRPZmZzZXQ6IFswLCAwLCAtMV0sIGZvdjogNDUsIHJvbGw6IDAsIGVhc2luZzogJ3Ntb290aHN0ZXAnIH0sXG4gICAgICBdLFxuICAgICAgR2xpZGU6IFtcbiAgICAgICAgeyBhdDogMCwgb2Zmc2V0OiBbLTAuOCwgMCwgMF0sIGxvb2tBdE9mZnNldDogWzAuNCwgMCwgLTFdLCBmb3Y6IDQ4LCByb2xsOiAwLCBlYXNpbmc6ICdzbW9vdGhzdGVwJyB9LFxuICAgICAgICB7IGF0OiAxLCBvZmZzZXQ6IFswLjgsIDAsIDBdLCBsb29rQXRPZmZzZXQ6IFstMC40LCAwLCAtMV0sIGZvdjogNDgsIHJvbGw6IDAsIGVhc2luZzogJ3Ntb290aHN0ZXAnIH0sXG4gICAgICBdLFxuICAgICAgT3JiaXQ6IFtcbiAgICAgICAgeyBhdDogMCwgb2Zmc2V0OiBbLTAuNywgMCwgMF0sIGxvb2tBdE9mZnNldDogWzAuNywgMCwgLTFdLCBmb3Y6IDQ4LCByb2xsOiAtMC4wOCwgZWFzaW5nOiAnc21vb3Roc3RlcCcgfSxcbiAgICAgICAgeyBhdDogMC41LCBvZmZzZXQ6IFswLjcsIDAuMjUsIDBdLCBsb29rQXRPZmZzZXQ6IFstMC43LCAtMC4xLCAtMV0sIGZvdjogNDgsIHJvbGw6IDAuMDgsIGVhc2luZzogJ3Ntb290aHN0ZXAnIH0sXG4gICAgICAgIHsgYXQ6IDEsIG9mZnNldDogWzAsIDAsIDBdLCBsb29rQXRPZmZzZXQ6IFswLCAwLCAtMV0sIGZvdjogNDgsIHJvbGw6IDAsIGVhc2luZzogJ3Ntb290aHN0ZXAnIH0sXG4gICAgICBdLFxuICAgICAgUmV2ZWFsOiBbXG4gICAgICAgIHsgYXQ6IDAsIG9mZnNldDogWzAsIC0wLjQ1LCAwLjVdLCBsb29rQXRPZmZzZXQ6IFswLCAwLjMsIC0xXSwgZm92OiA1Niwgcm9sbDogMCwgZWFzaW5nOiAnc21vb3Roc3RlcCcgfSxcbiAgICAgICAgeyBhdDogMSwgb2Zmc2V0OiBbMCwgMCwgMF0sIGxvb2tBdE9mZnNldDogWzAsIDAsIC0xXSwgZm92OiA0Niwgcm9sbDogMCwgZWFzaW5nOiAnc21vb3Roc3RlcCcgfSxcbiAgICAgIF0sXG4gICAgICBSZXNvbHZlOiBbXG4gICAgICAgIHsgYXQ6IDAsIG9mZnNldDogWzAuMywgMC4yLCAwXSwgbG9va0F0T2Zmc2V0OiBbLTAuMywgLTAuMiwgLTFdLCBmb3Y6IDUyLCByb2xsOiAwLjE0LCBlYXNpbmc6ICdzbW9vdGhzdGVwJyB9LFxuICAgICAgICB7IGF0OiAxLCBvZmZzZXQ6IFswLCAwLCAwXSwgbG9va0F0T2Zmc2V0OiBbMCwgMCwgLTFdLCBmb3Y6IDQ4LCByb2xsOiAwLCBlYXNpbmc6ICdzbW9vdGhzdGVwJyB9LFxuICAgICAgXSxcbiAgICB9O1xuICAgIGRyYWZ0LnNlY3Rpb25zW3NlY3Rpb25JbmRleF0uY2FtZXJhLmtleXMgPSByZWNpcGVzW3ByZXNldF07XG4gICAgYnJpZGdlQ2FtZXJhU2VjdGlvbihkcmFmdCwgc2VjdGlvbkluZGV4KTtcbiAgfSwgeyBzZWxlY3Rpb246IHsgdHlwZTogJ3NlY3Rpb24nLCBzZWN0aW9uSWQ6IHNlY3Rpb24uaWQgfSB9KTtcbiAgY29uc3QgZXhpc3RpbmdLZXlBdFBsYXloZWFkID0gc2VjdGlvbi5jYW1lcmEua2V5cy5maW5kSW5kZXgoKGl0ZW0pID0+IChcbiAgICBpdGVtLmF0ID4gMCAmJiBpdGVtLmF0IDwgMSAmJiBNYXRoLmFicyhpdGVtLmF0IC0gdGFyZ2V0QXQpIDwgMC4wMDI1XG4gICkpO1xuICBjb25zdCBzZXRLZXkgPSAoKSA9PiB7XG4gICAgaWYgKGV4aXN0aW5nS2V5QXRQbGF5aGVhZCA+PSAwKSB7XG4gICAgICBzdG9yZS5zZXRTZWxlY3Rpb24oeyB0eXBlOiAnY2FtZXJhLWtleScsIHNlY3Rpb25JZDogc2VjdGlvbi5pZCwga2V5SW5kZXg6IGV4aXN0aW5nS2V5QXRQbGF5aGVhZCB9KTtcbiAgICAgIHJldHVybjtcbiAgICB9XG4gICAgY29uc3QgaW5zZXJ0aW9uSW5kZXggPSBzZWN0aW9uLmNhbWVyYS5rZXlzLmZpbmRJbmRleCgoaXRlbSkgPT4gaXRlbS5hdCA+IHRhcmdldEF0KTtcbiAgICBjb25zdCBzZWxlY3RlZEtleUluZGV4ID0gaW5zZXJ0aW9uSW5kZXggPCAwID8gc2VjdGlvbi5jYW1lcmEua2V5cy5sZW5ndGggOiBpbnNlcnRpb25JbmRleDtcbiAgICBjb25zdCBzYW1wbGVkID0gc2FtcGxlQWJvdXROYXJyYXRpdmVQbGFuKHNuYXBzaG90LmNvbXBpbGVkUGxhbiwgc25hcHNob3QudHJhbnNwb3J0LnN0b3J5V1UpO1xuICAgIGNvbnN0IGJhc2VaID0gc25hcHNob3QuZG9jdW1lbnQuZ2xvYmFscy5jYW1lcmEuc3RhcnRaIC0gKHNuYXBzaG90LnRyYW5zcG9ydC5zdG9yeVdVICogc2FtcGxlZC5jYW1lcmEuY2FkZW5jZSk7XG4gICAgY29uc3QgbmV3S2V5ID0ge1xuICAgICAgYXQ6IHRhcmdldEF0LFxuICAgICAgb2Zmc2V0OiBbc2FtcGxlZC5jYW1lcmEucG9zaXRpb25bMF0sIHNhbXBsZWQuY2FtZXJhLnBvc2l0aW9uWzFdLCBzYW1wbGVkLmNhbWVyYS5wb3NpdGlvblsyXSAtIGJhc2VaXSxcbiAgICAgIGxvb2tBdE9mZnNldDogc2FtcGxlZC5jYW1lcmEudGFyZ2V0Lm1hcCgodmFsdWUsIGF4aXMpID0+IHZhbHVlIC0gc2FtcGxlZC5jYW1lcmEucG9zaXRpb25bYXhpc10pLFxuICAgICAgZm92OiBzYW1wbGVkLmNhbWVyYS5mb3YsXG4gICAgICByb2xsOiBzYW1wbGVkLmNhbWVyYS5yb2xsLFxuICAgICAgZWFzaW5nOiAnc21vb3Roc3RlcCcsXG4gICAgfTtcbiAgICBzdG9yZS5jb21taXQoJ1NldCBjYW1lcmEga2V5JywgKGRyYWZ0KSA9PiB7XG4gICAgICBkcmFmdC5zZWN0aW9uc1tzZWN0aW9uSW5kZXhdLmNhbWVyYS5rZXlzLnB1c2gobmV3S2V5KTtcbiAgICAgIGRyYWZ0LnNlY3Rpb25zW3NlY3Rpb25JbmRleF0uY2FtZXJhLmtleXMuc29ydCgoYSwgYikgPT4gYS5hdCAtIGIuYXQpO1xuICAgIH0sIHsgc2VsZWN0aW9uOiB7IHR5cGU6ICdjYW1lcmEta2V5Jywgc2VjdGlvbklkOiBzZWN0aW9uLmlkLCBrZXlJbmRleDogc2VsZWN0ZWRLZXlJbmRleCB9IH0pO1xuICB9O1xuICBjb25zdCByZWNpcGVzID0gPGRpdiBjbGFzc05hbWU9XCJhYm91dC1lZGl0b3ItY2FtZXJhLXJlY2lwZXNcIj57WydQdXNoJywgJ0dsaWRlJywgJ09yYml0JywgJ1JldmVhbCcsICdSZXNvbHZlJ10ubWFwKChuYW1lKSA9PiA8YnV0dG9uIHR5cGU9XCJidXR0b25cIiBrZXk9e25hbWV9IG9uQ2xpY2s9eygpID0+IGFwcGx5UHJlc2V0KG5hbWUpfT57bmFtZX08L2J1dHRvbj4pfTwvZGl2PjtcbiAgaWYgKCFrZXkpIHtcbiAgICByZXR1cm4gPD48aGVhZGVyPjxzcGFuPkNhbWVyYSB0cmFjazwvc3Bhbj48c3Ryb25nPkVkaXRpbmcgU2VjdGlvbiBiYXNlPC9zdHJvbmc+PC9oZWFkZXI+PHAgY2xhc3NOYW1lPVwiYWJvdXQtZWRpdG9yLWhlbHBcIj5UaGUgZG9sbHkgYW5kIFNlY3Rpb24gam9pbnMgYXJlIGNvbnRpbnVvdXMgYXV0b21hdGljYWxseS4gQWRkIHZpc2libGUga2V5cyBvbmx5IHdoZXJlIHRoZSBmcmFtaW5nLCBhaW0sIHJvbGwsIG9yIGxlbnMgc2hvdWxkIGNoYW5nZS48L3A+e3JlY2lwZXN9PGJ1dHRvbiB0eXBlPVwiYnV0dG9uXCIgY2xhc3NOYW1lPVwiYWJvdXQtZWRpdG9yLXdpZGUtYWN0aW9uXCIgb25DbGljaz17c2V0S2V5fT5TZXQgY2FtZXJhIGtleSBhdCB7Zm9ybWF0Q2FtZXJhUGVyY2VudCh0YXJnZXRBdCl9PC9idXR0b24+PC8+O1xuICB9XG4gIGNvbnN0IHVwZGF0ZSA9IChmaWVsZCwgdmFsdWUpID0+IHN0b3JlLmNvbW1pdChgRWRpdCBjYW1lcmEgJHtmaWVsZH1gLCAoZHJhZnQpID0+IHtcbiAgICBkcmFmdC5zZWN0aW9uc1tzZWN0aW9uSW5kZXhdLmNhbWVyYS5rZXlzW2tleUluZGV4XVtmaWVsZF0gPSBBcnJheS5pc0FycmF5KHZhbHVlKSA/IFsuLi52YWx1ZV0gOiB2YWx1ZTtcbiAgICBpZiAoQ0FNRVJBX1BPU0VfRklFTERTLmhhcyhmaWVsZCkpIGxpbmtDYW1lcmFCb3VuZGFyeShkcmFmdCwgc2VjdGlvbkluZGV4LCBrZXlJbmRleCk7XG4gIH0sIHsgY29hbGVzY2VLZXk6IGBjYW1lcmE6JHtzZWN0aW9uLmlkfToke2tleUluZGV4fToke2ZpZWxkfWAsIHNlbGVjdGlvbjogc25hcHNob3Quc2VsZWN0aW9uIH0pO1xuICBjb25zdCB1cGRhdGVWZWN0b3IgPSAoZmllbGQsIGF4aXMsIHZhbHVlKSA9PiB7XG4gICAgY29uc3QgbmV4dCA9IFsuLi5rZXlbZmllbGRdXTtcbiAgICBuZXh0W2F4aXNdID0gdmFsdWU7XG4gICAgdXBkYXRlKGZpZWxkLCBuZXh0KTtcbiAgfTtcbiAgY29uc3QgdGltaW5nQm91bmRzID0gZ2V0QWJvdXROYXJyYXRpdmVDYW1lcmFLZXlUaW1pbmdCb3VuZHMoc2VjdGlvbi5jYW1lcmEua2V5cywga2V5SW5kZXgpO1xuICBjb25zdCBleHRlbnRGaWVsZCA9IHNuYXBzaG90LnByZXZpZXdQcm9maWxlID09PSAnbW9iaWxlJyA/ICdtb2JpbGVFeHRlbnRXVScgOiAnZXh0ZW50V1UnO1xuICBjb25zdCBleHRlbnRMYWJlbCA9IHNuYXBzaG90LnByZXZpZXdQcm9maWxlID09PSAnbW9iaWxlJyA/ICdNb2JpbGUgbGVuZ3RoJyA6ICdTZWN0aW9uIGxlbmd0aCc7XG4gIGNvbnN0IHVwZGF0ZUV4dGVudCA9ICh2YWx1ZSkgPT4gc3RvcmUuY29tbWl0KCdDaGFuZ2UgU2VjdGlvbiBleHRlbnQnLCAoZHJhZnQpID0+IHtcbiAgICBkcmFmdC5zZWN0aW9uc1tzZWN0aW9uSW5kZXhdW2V4dGVudEZpZWxkXSA9IHZhbHVlO1xuICB9LCB7IGNvYWxlc2NlS2V5OiBgc2VjdGlvbjoke3NlY3Rpb24uaWR9OiR7ZXh0ZW50RmllbGR9YCwgc2VsZWN0aW9uOiBzbmFwc2hvdC5zZWxlY3Rpb24gfSk7XG4gIHJldHVybiAoXG4gICAgPD5cbiAgICAgIDxoZWFkZXI+PHNwYW4+Q2FtZXJhIGtleTwvc3Bhbj48c3Ryb25nPntmb3JtYXRDYW1lcmFQZXJjZW50KGtleS5hdCl9IHRocm91Z2gge3NlY3Rpb24ubGFiZWx9PC9zdHJvbmc+PC9oZWFkZXI+XG4gICAgICB7cmVjaXBlc31cbiAgICAgIDxOdW1iZXJQcm9wZXJ0eVxuICAgICAgICBsYWJlbD1cIlBvc2l0aW9uXCJcbiAgICAgICAgdmFsdWU9e051bWJlcigoa2V5LmF0ICogMTAwKS50b0ZpeGVkKDEpKX1cbiAgICAgICAgbWluPXtOdW1iZXIoKHRpbWluZ0JvdW5kcy5taW4gKiAxMDApLnRvRml4ZWQoMSkpfVxuICAgICAgICBtYXg9e051bWJlcigodGltaW5nQm91bmRzLm1heCAqIDEwMCkudG9GaXhlZCgxKSl9XG4gICAgICAgIHN0ZXA9ezAuNX1cbiAgICAgICAgdW5pdD1cIiVcIlxuICAgICAgICBvbkNoYW5nZT17KHZhbHVlKSA9PiB1cGRhdGUoJ2F0JywgTWF0aC5taW4odGltaW5nQm91bmRzLm1heCwgTWF0aC5tYXgodGltaW5nQm91bmRzLm1pbiwgc25hcEFib3V0TmFycmF0aXZlVGltZWxpbmVWYWx1ZSh2YWx1ZSAvIDEwMCkpKSl9XG4gICAgICAvPlxuICAgICAgPE51bWJlclByb3BlcnR5IGxhYmVsPXtleHRlbnRMYWJlbH0gdmFsdWU9e3NlY3Rpb25bZXh0ZW50RmllbGRdfSBtaW49ezF9IG1heD17OH0gc3RlcD17MC4wNX0gdW5pdD1cIldVXCIgb25DaGFuZ2U9e3VwZGF0ZUV4dGVudH0gLz5cbiAgICAgIHtbJ1ggb2Zmc2V0JywgJ1kgb2Zmc2V0JywgJ0ZvcndhcmQgb2Zmc2V0J10ubWFwKChsYWJlbCwgYXhpcykgPT4gPE51bWJlclByb3BlcnR5IGtleT17bGFiZWx9IGxhYmVsPXtsYWJlbH0gdmFsdWU9e2tleS5vZmZzZXRbYXhpc119IG1pbj17LTh9IG1heD17OH0gc3RlcD17MC4wMn0gdW5pdD1cIldVXCIgb25DaGFuZ2U9eyh2YWx1ZSkgPT4gdXBkYXRlVmVjdG9yKCdvZmZzZXQnLCBheGlzLCB2YWx1ZSl9IC8+KX1cbiAgICAgIHtbJ0FpbSBYJywgJ0FpbSBZJywgJ0FpbSBkZXB0aCddLm1hcCgobGFiZWwsIGF4aXMpID0+IDxOdW1iZXJQcm9wZXJ0eSBrZXk9e2xhYmVsfSBsYWJlbD17bGFiZWx9IHZhbHVlPXtrZXkubG9va0F0T2Zmc2V0W2F4aXNdfSBtaW49ey04fSBtYXg9ezh9IHN0ZXA9ezAuMDJ9IHVuaXQ9XCJXVVwiIG9uQ2hhbmdlPXsodmFsdWUpID0+IHVwZGF0ZVZlY3RvcignbG9va0F0T2Zmc2V0JywgYXhpcywgdmFsdWUpfSAvPil9XG4gICAgICA8TnVtYmVyUHJvcGVydHkgbGFiZWw9XCJGaWVsZCBvZiB2aWV3XCIgdmFsdWU9e2tleS5mb3Z9IG1pbj17MjB9IG1heD17OTB9IHN0ZXA9ezF9IHVuaXQ9XCLCsFwiIG9uQ2hhbmdlPXsodmFsdWUpID0+IHVwZGF0ZSgnZm92JywgdmFsdWUpfSAvPlxuICAgICAgPE51bWJlclByb3BlcnR5IGxhYmVsPVwiUm9sbFwiIHZhbHVlPXtrZXkucm9sbH0gbWluPXstMS4yfSBtYXg9ezEuMn0gc3RlcD17MC4wMX0gdW5pdD1cInJhZFwiIG9uQ2hhbmdlPXsodmFsdWUpID0+IHVwZGF0ZSgncm9sbCcsIHZhbHVlKX0gLz5cbiAgICAgIDxQcm9wZXJ0eSBsYWJlbD1cIkVhc2luZ1wiPjxzZWxlY3QgdmFsdWU9e2tleS5lYXNpbmd9IG9uQ2hhbmdlPXsoZXZlbnQpID0+IHVwZGF0ZSgnZWFzaW5nJywgZXZlbnQudGFyZ2V0LnZhbHVlKX0+PG9wdGlvbiB2YWx1ZT1cInNtb290aHN0ZXBcIj5TbW9vdGhzdGVwPC9vcHRpb24+PG9wdGlvbiB2YWx1ZT1cImVhc2UtaW4tb3V0XCI+RWFzZSBpbiBvdXQ8L29wdGlvbj48L3NlbGVjdD48L1Byb3BlcnR5PlxuICAgICAgPGJ1dHRvbiB0eXBlPVwiYnV0dG9uXCIgY2xhc3NOYW1lPVwiYWJvdXQtZWRpdG9yLXdpZGUtYWN0aW9uXCIgZGlzYWJsZWQ9e2V4aXN0aW5nS2V5QXRQbGF5aGVhZCA+PSAwfSBvbkNsaWNrPXtzZXRLZXl9PntleGlzdGluZ0tleUF0UGxheWhlYWQgPj0gMCA/IGBDYW1lcmEga2V5IGFscmVhZHkgYXQgJHtmb3JtYXRDYW1lcmFQZXJjZW50KHRhcmdldEF0KX1gIDogYFNldCBhbm90aGVyIGtleSBhdCAke2Zvcm1hdENhbWVyYVBlcmNlbnQodGFyZ2V0QXQpfWB9PC9idXR0b24+XG4gICAgICA8YnV0dG9uIHR5cGU9XCJidXR0b25cIiBjbGFzc05hbWU9XCJhYm91dC1lZGl0b3ItZGFuZ2VyXCIgb25DbGljaz17KCkgPT4gc3RvcmUuY29tbWl0KCdEZWxldGUgY2FtZXJhIGtleScsIChkcmFmdCkgPT4geyBkcmFmdC5zZWN0aW9uc1tzZWN0aW9uSW5kZXhdLmNhbWVyYS5rZXlzLnNwbGljZShrZXlJbmRleCwgMSk7IH0sIHsgc2VsZWN0aW9uOiB7IHR5cGU6ICdzZWN0aW9uJywgc2VjdGlvbklkOiBzZWN0aW9uLmlkIH0gfSl9PkRlbGV0ZSBrZXk8L2J1dHRvbj5cbiAgICA8Lz5cbiAgKTtcbn1cblxuY29uc3QgQ09SUkVTUE9OREVOQ0VfTEFCRUxTID0gT2JqZWN0LmZyZWV6ZSh7XG4gICdpbmRleC12MSc6ICdJbmRleCBvcmRlcicsXG4gICdzdGFibGUtc2VlZCc6ICdTdGFibGUgc2VlZCcsXG4gICdzcGF0aWFsLW5lYXJlc3QtdjEnOiAnTG9jYWwgdHJhdmVsIChhcHByb3guKScsXG4gICdncm91cC1hd2FyZSc6ICdHcm91cCBhd2FyZScsXG59KTtcblxuZnVuY3Rpb24gV29ybGRJbnNwZWN0b3IoeyBzdG9yZSwgc25hcHNob3QsIHNlY3Rpb24sIHJ1bnRpbWVNZXRyaWNzIH0pIHtcbiAgY29uc3Qgc2VjdGlvbkluZGV4ID0gZ2V0U2VjdGlvbkluZGV4KHNuYXBzaG90LmRvY3VtZW50LCBzZWN0aW9uLmlkKTtcbiAgaWYgKHNlY3Rpb24ud29ybGQubW9kZSAhPT0gJ3NldCcpIHtcbiAgICByZXR1cm4gPD48aGVhZGVyPjxzcGFuPldvcmxkIHRyYWNrPC9zcGFuPjxzdHJvbmc+SW5oZXJpdGVkIFdvcmxkPC9zdHJvbmc+PC9oZWFkZXI+PHAgY2xhc3NOYW1lPVwiYWJvdXQtZWRpdG9yLWhlbHBcIj5UaGlzIFNlY3Rpb24ga2VlcHMgdGhlIHByZXZpb3VzIFdvcmxkLiBDaG9vc2Ug4oCcQ3JlYXRlIFdvcmxkIGNsaXDigJ0gb25seSB3aGVuIHRoZSBzaGFwZSBzaG91bGQgY2hhbmdlIGhlcmUuPC9wPjxidXR0b24gdHlwZT1cImJ1dHRvblwiIGNsYXNzTmFtZT1cImFib3V0LWVkaXRvci13aWRlLWFjdGlvblwiIG9uQ2xpY2s9eygpID0+IHN0b3JlLmNvbW1pdCgnQ3JlYXRlIFdvcmxkIGNsaXAnLCAoZHJhZnQpID0+IHtcbiAgICAgIGRyYWZ0LnNlY3Rpb25zW3NlY3Rpb25JbmRleF0ud29ybGQgPSBjbG9uZUFib3V0TmFycmF0aXZlRG9jdW1lbnQoZHJhZnQuc2VjdGlvbnMuc2xpY2UoMCwgc2VjdGlvbkluZGV4KS5yZXZlcnNlKCkuZmluZCgoaXRlbSkgPT4gaXRlbS53b3JsZC5tb2RlID09PSAnc2V0Jyk/LndvcmxkIHx8IGRyYWZ0LnNlY3Rpb25zWzBdLndvcmxkKTtcbiAgICB9KX0+Q3JlYXRlIFdvcmxkIGNsaXA8L2J1dHRvbj48Lz47XG4gIH1cbiAgY29uc3Qgd29ybGQgPSBzZWN0aW9uLndvcmxkO1xuICBjb25zdCBzaGFwZSA9IEFCT1VUX05BUlJBVElWRV9TSEFQRV9ERUZJTklUSU9OU1t3b3JsZC5zaGFwZUlkXTtcbiAgY29uc3QgdHJhbnNpdGlvbkxpbWl0ID0gZ2V0QWJvdXROYXJyYXRpdmVXb3JsZFRyYW5zaXRpb25MaW1pdChzbmFwc2hvdC5jb21waWxlZFBsYW4sIHNlY3Rpb25JbmRleCk7XG4gIGNvbnN0IHRyYW5zaXRpb25NYXggPSBNYXRoLm1heCh0cmFuc2l0aW9uTGltaXQsIHdvcmxkLnRyYW5zaXRpb25Jbi5lbmQsIDEpO1xuICBjb25zdCB0cmFuc2l0aW9uRW5hYmxlZCA9IHdvcmxkLnRyYW5zaXRpb25Jbi50eXBlICE9PSAnY3V0JztcbiAgY29uc3QgY29ycmVzcG9uZGVuY2VFbmFibGVkID0gWydtb3JwaCcsICdkaXNzb2x2ZS1tb3JwaCddLmluY2x1ZGVzKHdvcmxkLnRyYW5zaXRpb25Jbi50eXBlKTtcbiAgY29uc3QgcHJldmlvdXNXb3JsZFNlY3Rpb24gPSBzbmFwc2hvdC5kb2N1bWVudC5zZWN0aW9uc1xuICAgIC5zbGljZSgwLCBzZWN0aW9uSW5kZXgpXG4gICAgLnJldmVyc2UoKVxuICAgIC5maW5kKChpdGVtKSA9PiBpdGVtLndvcmxkLm1vZGUgPT09ICdzZXQnKTtcbiAgY29uc3Qgc291cmNlU2hhcGUgPSBBQk9VVF9OQVJSQVRJVkVfU0hBUEVfREVGSU5JVElPTlNbcHJldmlvdXNXb3JsZFNlY3Rpb24/LndvcmxkLnNoYXBlSWQgfHwgd29ybGQuc2hhcGVJZF07XG4gIGNvbnN0IHByZXBhcmVkID0gcnVudGltZU1ldHJpY3M/LnByZXBhcmVkV29ybGRJZHM/LmluY2x1ZGVzKHNlY3Rpb24uaWQpO1xuICBjb25zdCBjb3JyZXNwb25kZW5jZVN0YXR1cyA9IHJ1bnRpbWVNZXRyaWNzPy5jb3JyZXNwb25kZW5jZVNlcXVlbmNlU3RhdGUgPT09ICdmYWlsZWQnXG4gICAgPyAnRmFpbGVkJ1xuICAgIDogcnVudGltZU1ldHJpY3M/LmNvcnJlc3BvbmRlbmNlU2VxdWVuY2VTdGF0ZSA9PT0gJ2xvYWRpbmcnXG4gICAgICA/ICdQcmVwYXJpbmcnXG4gICAgICA6IHByZXBhcmVkXG4gICAgICAgID8gcnVudGltZU1ldHJpY3M/LmNvcnJlc3BvbmRlbmNlRmFsbGJhY2sgJiYgcnVudGltZU1ldHJpY3M/LmNvcnJlc3BvbmRlbmNlVG9Xb3JsZElkID09PSBzZWN0aW9uLmlkXG4gICAgICAgICAgPyAnQmFzZWxpbmUgZmFsbGJhY2snXG4gICAgICAgICAgOiAnUmVhZHknXG4gICAgICAgIDogJ1ByZXBhcmluZyc7XG4gIGNvbnN0IHVwZGF0ZSA9IChsYWJlbCwgbXV0YXRlLCBjb2FsZXNjZUtleSA9IG51bGwpID0+IHN0b3JlLmNvbW1pdChsYWJlbCwgKGRyYWZ0KSA9PiBtdXRhdGUoZHJhZnQuc2VjdGlvbnNbc2VjdGlvbkluZGV4XS53b3JsZCksIHsgY29hbGVzY2VLZXksIHNlbGVjdGlvbjogc25hcHNob3Quc2VsZWN0aW9uIH0pO1xuICBjb25zdCB0cnlTaGFwZSA9IChzaGFwZUlkKSA9PiBzdG9yZS5iZWdpblRyeShgUmVwbGFjZSBTaGFwZSB3aXRoICR7QUJPVVRfTkFSUkFUSVZFX1NIQVBFX0RFRklOSVRJT05TW3NoYXBlSWRdLmxhYmVsfWAsIChkcmFmdCkgPT4ge1xuICAgIGNvbnN0IHRhcmdldCA9IGRyYWZ0LnNlY3Rpb25zW3NlY3Rpb25JbmRleF0ud29ybGQ7XG4gICAgdGFyZ2V0LnNoYXBlSWQgPSBzaGFwZUlkO1xuICAgIHRhcmdldC5zaGFwZVBhcmFtZXRlcnMgPSBPYmplY3QuZnJvbUVudHJpZXMoQUJPVVRfTkFSUkFUSVZFX1NIQVBFX0RFRklOSVRJT05TW3NoYXBlSWRdLnBhcmFtZXRlcnMubWFwKChjb250cm9sKSA9PiBbY29udHJvbC5pZCwgY29udHJvbC5pZCA9PT0gJ2RlbnNpdHknID8gMSA6IChjb250cm9sLm1pbiArIGNvbnRyb2wubWF4KSAvIDJdKSk7XG4gIH0pO1xuICByZXR1cm4gKFxuICAgIDw+XG4gICAgICA8aGVhZGVyPjxzcGFuPldvcmxkIGNsaXA8L3NwYW4+PHN0cm9uZz57c2hhcGU/LmxhYmVsIHx8IHdvcmxkLnNoYXBlSWR9PC9zdHJvbmc+PC9oZWFkZXI+XG4gICAgICA8ZGl2IGNsYXNzTmFtZT1cImFib3V0LWVkaXRvci1zaGFwZS1jYXRhbG9nXCI+XG4gICAgICAgIHtPYmplY3QudmFsdWVzKEFCT1VUX05BUlJBVElWRV9TSEFQRV9ERUZJTklUSU9OUykubWFwKChpdGVtKSA9PiAoXG4gICAgICAgICAgPGJ1dHRvbiB0eXBlPVwiYnV0dG9uXCIga2V5PXtpdGVtLmlkfSBkaXNhYmxlZD17c2VjdGlvbi5sb2NrZWR9IGNsYXNzTmFtZT17aXRlbS5pZCA9PT0gd29ybGQuc2hhcGVJZCA/ICdpcy1zZWxlY3RlZCcgOiAnJ30gb25DbGljaz17KCkgPT4gdHJ5U2hhcGUoaXRlbS5pZCl9PlxuICAgICAgICAgICAgPGkgLz48c3Bhbj48c3Ryb25nPntpdGVtLmxhYmVsfTwvc3Ryb25nPjxzbWFsbD5Db3N0IHtpdGVtLmNvc3R9IMK3IFBvaW50IGZpZWxkPC9zbWFsbD48L3NwYW4+XG4gICAgICAgICAgPC9idXR0b24+XG4gICAgICAgICkpfVxuICAgICAgPC9kaXY+XG4gICAgICB7c25hcHNob3QudHJ5U3RhdGUgPyA8ZGl2IGNsYXNzTmFtZT1cImFib3V0LWVkaXRvci10cnlcIj48c3Bhbj5Ucnlpbmcge3NuYXBzaG90LnRyeVN0YXRlLmxhYmVsfTwvc3Bhbj48YnV0dG9uIHR5cGU9XCJidXR0b25cIiBvbkNsaWNrPXsoKSA9PiBzdG9yZS5jYW5jZWxUcnkoKX0+Q2FuY2VsPC9idXR0b24+PGJ1dHRvbiB0eXBlPVwiYnV0dG9uXCIgY2xhc3NOYW1lPVwiaXMtcHJpbWFyeVwiIG9uQ2xpY2s9eygpID0+IHN0b3JlLmFwcGx5VHJ5KCl9PkFwcGx5PC9idXR0b24+PC9kaXY+IDogbnVsbH1cbiAgICAgIDxkZXRhaWxzIG9wZW4+PHN1bW1hcnk+U2hhcGUgcGFyYW1ldGVyczwvc3VtbWFyeT5cbiAgICAgICAgeyhzaGFwZT8ucGFyYW1ldGVycyB8fCBbXSkubWFwKChjb250cm9sKSA9PiA8TnVtYmVyUHJvcGVydHkga2V5PXtjb250cm9sLmlkfSBsYWJlbD17Y29udHJvbC5sYWJlbH0gdmFsdWU9e3dvcmxkLnNoYXBlUGFyYW1ldGVyc1tjb250cm9sLmlkXX0gbWluPXtjb250cm9sLm1pbn0gbWF4PXtjb250cm9sLm1heH0gc3RlcD17Y29udHJvbC5zdGVwfSB1bml0PXtjb250cm9sLnVuaXR9IG9uQ2hhbmdlPXsodmFsdWUpID0+IHVwZGF0ZShgQ2hhbmdlICR7Y29udHJvbC5sYWJlbH1gLCAoZHJhZnQpID0+IHsgZHJhZnQuc2hhcGVQYXJhbWV0ZXJzW2NvbnRyb2wuaWRdID0gdmFsdWU7IH0sIGB3b3JsZDoke3NlY3Rpb24uaWR9OiR7Y29udHJvbC5pZH1gKX0gLz4pfVxuICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cImFib3V0LWVkaXRvci1pbmxpbmUtYWN0aW9uc1wiPjxidXR0b24gdHlwZT1cImJ1dHRvblwiIG9uQ2xpY2s9eygpID0+IHVwZGF0ZSgnUmVzZWVkIFNoYXBlJywgKGRyYWZ0KSA9PiB7IGRyYWZ0LnNlZWQgPSBNYXRoLmZsb29yKE1hdGgucmFuZG9tKCkgKiAweGZmZmZmZmZmKTsgfSl9PlJlc2VlZDwvYnV0dG9uPjxjb2RlPnt3b3JsZC5zZWVkfTwvY29kZT48L2Rpdj5cbiAgICAgIDwvZGV0YWlscz5cbiAgICAgIDxkZXRhaWxzIG9wZW4+PHN1bW1hcnk+UGxhY2VtZW50PC9zdW1tYXJ5PlxuICAgICAgICA8TnVtYmVyUHJvcGVydHkgbGFiZWw9XCJEaXN0YW5jZSBhdCBlbnRyeVwiIHZhbHVlPXt3b3JsZC5lbnRyeURpc3RhbmNlV1V9IG1pbj17MC4yfSBtYXg9ezE2fSBzdGVwPXswLjA1fSB1bml0PVwiV1VcIiBvbkNoYW5nZT17KHZhbHVlKSA9PiB1cGRhdGUoJ01vdmUgV29ybGQnLCAoZHJhZnQpID0+IHsgZHJhZnQuZW50cnlEaXN0YW5jZVdVID0gdmFsdWU7IH0sIGB3b3JsZDoke3NlY3Rpb24uaWR9OmRpc3RhbmNlYCl9IC8+XG4gICAgICAgIDxOdW1iZXJQcm9wZXJ0eSBsYWJlbD1cIlNjYWxlXCIgdmFsdWU9e3dvcmxkLnRyYW5zZm9ybS5zY2FsZX0gbWluPXswLjF9IG1heD17M30gc3RlcD17MC4wMX0gb25DaGFuZ2U9eyh2YWx1ZSkgPT4gdXBkYXRlKCdTY2FsZSBXb3JsZCcsIChkcmFmdCkgPT4geyBkcmFmdC50cmFuc2Zvcm0uc2NhbGUgPSB2YWx1ZTsgfSwgYHdvcmxkOiR7c2VjdGlvbi5pZH06c2NhbGVgKX0gLz5cbiAgICAgIDwvZGV0YWlscz5cbiAgICAgIDxkZXRhaWxzIG9wZW4+PHN1bW1hcnk+VHJhbnNpdGlvbiBpbjwvc3VtbWFyeT5cbiAgICAgICAge3RyYW5zaXRpb25FbmFibGVkID8gPD5cbiAgICAgICAgICA8cCBjbGFzc05hbWU9XCJhYm91dC1lZGl0b3ItaGVscFwiPlRpbWluZyBpcyByZWxhdGl2ZSB0byB0aGlzIFNlY3Rpb246IDEgaXMgaXRzIGVuZDsgdmFsdWVzIGFib3ZlIDEgY29udGludWUgYWNyb3NzIGluaGVyaXRlZCBXb3JsZCBTZWN0aW9ucy4gVGhlIG5leHQgV29ybGQgYmVnaW5zIGF0IHt0cmFuc2l0aW9uTGltaXQudG9GaXhlZCgzKX0uPC9wPlxuICAgICAgICAgIDxOdW1iZXJQcm9wZXJ0eSBsYWJlbD1cIlN0YXJ0XCIgdmFsdWU9e3dvcmxkLnRyYW5zaXRpb25Jbi5zdGFydH0gbWluPXswfSBtYXg9e3RyYW5zaXRpb25NYXh9IHN0ZXA9ezAuMDA1fSB1bml0PVwiw5cgc2VjdGlvblwiIG9uQ2hhbmdlPXsodmFsdWUpID0+IHVwZGF0ZSgnQ2hhbmdlIHRyYW5zaXRpb24gc3RhcnQnLCAoZHJhZnQpID0+IHsgZHJhZnQudHJhbnNpdGlvbkluLnN0YXJ0ID0gTWF0aC5taW4odmFsdWUsIGRyYWZ0LnRyYW5zaXRpb25Jbi5lbmQpOyB9KX0gLz5cbiAgICAgICAgICA8TnVtYmVyUHJvcGVydHkgbGFiZWw9XCJFbmRcIiB2YWx1ZT17d29ybGQudHJhbnNpdGlvbkluLmVuZH0gbWluPXswfSBtYXg9e3RyYW5zaXRpb25NYXh9IHN0ZXA9ezAuMDA1fSB1bml0PVwiw5cgc2VjdGlvblwiIG9uQ2hhbmdlPXsodmFsdWUpID0+IHVwZGF0ZSgnQ2hhbmdlIHRyYW5zaXRpb24gZW5kJywgKGRyYWZ0KSA9PiB7IGRyYWZ0LnRyYW5zaXRpb25Jbi5lbmQgPSBNYXRoLm1heCh2YWx1ZSwgZHJhZnQudHJhbnNpdGlvbkluLnN0YXJ0KTsgfSl9IC8+XG4gICAgICAgICAgPFByb3BlcnR5IGxhYmVsPVwiVHlwZVwiPjxzZWxlY3QgdmFsdWU9e3dvcmxkLnRyYW5zaXRpb25Jbi50eXBlfSBvbkNoYW5nZT17KGV2ZW50KSA9PiB1cGRhdGUoJ0NoYW5nZSB0cmFuc2l0aW9uIHR5cGUnLCAoZHJhZnQpID0+IHsgZHJhZnQudHJhbnNpdGlvbkluLnR5cGUgPSBldmVudC50YXJnZXQudmFsdWU7IH0pfT48b3B0aW9uIHZhbHVlPVwibW9ycGhcIj5Nb3JwaDwvb3B0aW9uPjxvcHRpb24gdmFsdWU9XCJkaXNzb2x2ZS1tb3JwaFwiPkRpc3NvbHZlIG1vcnBoPC9vcHRpb24+PG9wdGlvbiB2YWx1ZT1cImNyb3NzZmFkZVwiPkNyb3NzZmFkZTwvb3B0aW9uPjxvcHRpb24gdmFsdWU9XCJob2xkXCI+SG9sZDwvb3B0aW9uPjwvc2VsZWN0PjwvUHJvcGVydHk+XG4gICAgICAgICAgPFByb3BlcnR5IGxhYmVsPVwiRWFzaW5nXCI+PHNlbGVjdCB2YWx1ZT17d29ybGQudHJhbnNpdGlvbkluLmVhc2luZ30gb25DaGFuZ2U9eyhldmVudCkgPT4gdXBkYXRlKCdDaGFuZ2UgdHJhbnNpdGlvbiBlYXNpbmcnLCAoZHJhZnQpID0+IHsgZHJhZnQudHJhbnNpdGlvbkluLmVhc2luZyA9IGV2ZW50LnRhcmdldC52YWx1ZTsgfSl9PjxvcHRpb24gdmFsdWU9XCJsaW5lYXJcIj5MaW5lYXI8L29wdGlvbj48b3B0aW9uIHZhbHVlPVwic21vb3Roc3RlcFwiPlNtb290aHN0ZXA8L29wdGlvbj48b3B0aW9uIHZhbHVlPVwiZWFzZS1pblwiPkVhc2UgaW48L29wdGlvbj48b3B0aW9uIHZhbHVlPVwiZWFzZS1vdXRcIj5FYXNlIG91dDwvb3B0aW9uPjxvcHRpb24gdmFsdWU9XCJlYXNlLWluLW91dFwiPkVhc2UgaW4gb3V0PC9vcHRpb24+PG9wdGlvbiB2YWx1ZT1cImhvbGRcIj5Ib2xkPC9vcHRpb24+PC9zZWxlY3Q+PC9Qcm9wZXJ0eT5cbiAgICAgICAgICA8cCBjbGFzc05hbWU9XCJhYm91dC1lZGl0b3ItaGVscFwiPk1hcHMge3NvdXJjZVNoYXBlPy5sYWJlbCB8fCAncHJldmlvdXMgU2hhcGUnfSDihpIge3NoYXBlPy5sYWJlbCB8fCB3b3JsZC5zaGFwZUlkfS48L3A+XG4gICAgICAgICAgPFByb3BlcnR5IGxhYmVsPVwiQ29ycmVzcG9uZGVuY2VcIj48c2VsZWN0IGFyaWEtbGFiZWw9XCJDb3JyZXNwb25kZW5jZVwiIHZhbHVlPXt3b3JsZC50cmFuc2l0aW9uSW4uY29ycmVzcG9uZGVuY2V9IGRpc2FibGVkPXshY29ycmVzcG9uZGVuY2VFbmFibGVkfSB0aXRsZT17Y29ycmVzcG9uZGVuY2VFbmFibGVkID8gJ0Nob29zZSBob3cgc291cmNlIHBvaW50cyBhcmUgYXNzaWduZWQgdG8gdGFyZ2V0IHBvaW50cy4nIDogJ0NvcnJlc3BvbmRlbmNlIGFwcGxpZXMgdG8gTW9ycGggYW5kIERpc3NvbHZlIG1vcnBoIHRyYW5zaXRpb25zLid9IG9uQ2hhbmdlPXsoZXZlbnQpID0+IHVwZGF0ZSgnQ2hhbmdlIGNvcnJlc3BvbmRlbmNlJywgKGRyYWZ0KSA9PiB7IGRyYWZ0LnRyYW5zaXRpb25Jbi5jb3JyZXNwb25kZW5jZSA9IGV2ZW50LnRhcmdldC52YWx1ZTsgfSl9PntBQk9VVF9OQVJSQVRJVkVfQ09SUkVTUE9OREVOQ0VfTU9ERVMubWFwKChtb2RlKSA9PiA8b3B0aW9uIHZhbHVlPXttb2RlfSBrZXk9e21vZGV9PntDT1JSRVNQT05ERU5DRV9MQUJFTFNbbW9kZV0gfHwgbW9kZX08L29wdGlvbj4pfTwvc2VsZWN0PjwvUHJvcGVydHk+XG4gICAgICAgICAgPHAgY2xhc3NOYW1lPVwiYWJvdXQtZWRpdG9yLWhlbHBcIiByb2xlPVwic3RhdHVzXCIgYXJpYS1saXZlPVwicG9saXRlXCI+Q29ycmVzcG9uZGVuY2U6IHtjb3JyZXNwb25kZW5jZVN0YXR1c317cHJlcGFyZWQgJiYgcnVudGltZU1ldHJpY3M/LmNvcnJlc3BvbmRlbmNlVG9Xb3JsZElkID09PSBzZWN0aW9uLmlkICYmIE51bWJlci5pc0Zpbml0ZShydW50aW1lTWV0cmljcz8uY29ycmVzcG9uZGVuY2VJbXByb3ZlbWVudCkgPyBgIMK3ICR7TWF0aC5yb3VuZChydW50aW1lTWV0cmljcy5jb3JyZXNwb25kZW5jZUltcHJvdmVtZW50ICogMTAwKX0lIFJNUyBpbXByb3ZlbWVudGAgOiAnJ30uPC9wPlxuICAgICAgICAgIDxidXR0b24gdHlwZT1cImJ1dHRvblwiIGNsYXNzTmFtZT1cImFib3V0LWVkaXRvci1kYW5nZXJcIiBvbkNsaWNrPXsoKSA9PiBzdG9yZS5jb21taXQoJ1JlbW92ZSBXb3JsZCB0cmFuc2l0aW9uJywgKGRyYWZ0KSA9PiB7XG4gICAgICAgICAgICBjb25zdCB0cmFuc2l0aW9uID0gZHJhZnQuc2VjdGlvbnNbc2VjdGlvbkluZGV4XS53b3JsZC50cmFuc2l0aW9uSW47XG4gICAgICAgICAgICB0cmFuc2l0aW9uLnN0YXJ0ID0gMDtcbiAgICAgICAgICAgIHRyYW5zaXRpb24uZW5kID0gMDtcbiAgICAgICAgICAgIHRyYW5zaXRpb24udHlwZSA9ICdjdXQnO1xuICAgICAgICAgIH0sIHsgc2VsZWN0aW9uOiB7IHR5cGU6ICd3b3JsZCcsIHNlY3Rpb25JZDogc2VjdGlvbi5pZCB9IH0pfT5SZW1vdmUgdHJhbnNpdGlvbiBrZXlmcmFtZXM8L2J1dHRvbj5cbiAgICAgICAgPC8+IDogPD5cbiAgICAgICAgICA8cCBjbGFzc05hbWU9XCJhYm91dC1lZGl0b3ItaGVscFwiPlRoaXMgV29ybGQgY3V0cyBpbiBhdCB0aGUgU2VjdGlvbiBib3VuZGFyeSBhbmQgaGFzIG5vIHRyYW5zaXRpb24ga2V5ZnJhbWVzLjwvcD5cbiAgICAgICAgICA8YnV0dG9uIHR5cGU9XCJidXR0b25cIiBjbGFzc05hbWU9XCJhYm91dC1lZGl0b3Itd2lkZS1hY3Rpb25cIiBvbkNsaWNrPXsoKSA9PiBzdG9yZS5jb21taXQoJ0FkZCBXb3JsZCB0cmFuc2l0aW9uJywgKGRyYWZ0KSA9PiB7XG4gICAgICAgICAgICBjb25zdCB0cmFuc2l0aW9uID0gZHJhZnQuc2VjdGlvbnNbc2VjdGlvbkluZGV4XS53b3JsZC50cmFuc2l0aW9uSW47XG4gICAgICAgICAgICB0cmFuc2l0aW9uLnN0YXJ0ID0gTWF0aC5taW4oMC4wOCwgdHJhbnNpdGlvbkxpbWl0KTtcbiAgICAgICAgICAgIHRyYW5zaXRpb24uZW5kID0gTWF0aC5taW4oMC42OCwgdHJhbnNpdGlvbkxpbWl0KTtcbiAgICAgICAgICAgIHRyYW5zaXRpb24udHlwZSA9ICdtb3JwaCc7XG4gICAgICAgICAgfSwgeyBzZWxlY3Rpb246IHsgdHlwZTogJ3dvcmxkJywgc2VjdGlvbklkOiBzZWN0aW9uLmlkIH0gfSl9PkFkZCB0cmFuc2l0aW9uIGtleWZyYW1lczwvYnV0dG9uPlxuICAgICAgICA8Lz59XG4gICAgICA8L2RldGFpbHM+XG4gICAgICA8ZGV0YWlscyBvcGVuPjxzdW1tYXJ5Pk1vZGlmaWVyIHN0YWNrPC9zdW1tYXJ5PlxuICAgICAgICB7d29ybGQubW9kaWZpZXJzLm1hcCgoaXRlbSwgbW9kaWZpZXJJbmRleCkgPT4ge1xuICAgICAgICAgIGNvbnN0IGRlZmluaXRpb24gPSBBQk9VVF9OQVJSQVRJVkVfTU9ESUZJRVJfREVGSU5JVElPTlNbaXRlbS5pZF07XG4gICAgICAgICAgY29uc3QgbW92ZU1vZGlmaWVyID0gKGRpcmVjdGlvbikgPT4gdXBkYXRlKCdSZW9yZGVyIG1vZGlmaWVyJywgKGRyYWZ0KSA9PiB7XG4gICAgICAgICAgICBjb25zdCBuZXh0SW5kZXggPSBtb2RpZmllckluZGV4ICsgZGlyZWN0aW9uO1xuICAgICAgICAgICAgaWYgKG5leHRJbmRleCA8IDAgfHwgbmV4dEluZGV4ID49IGRyYWZ0Lm1vZGlmaWVycy5sZW5ndGgpIHJldHVybjtcbiAgICAgICAgICAgIGNvbnN0IFttb3ZlZF0gPSBkcmFmdC5tb2RpZmllcnMuc3BsaWNlKG1vZGlmaWVySW5kZXgsIDEpO1xuICAgICAgICAgICAgZHJhZnQubW9kaWZpZXJzLnNwbGljZShuZXh0SW5kZXgsIDAsIG1vdmVkKTtcbiAgICAgICAgICB9KTtcbiAgICAgICAgICByZXR1cm4gPGRpdiBjbGFzc05hbWU9XCJhYm91dC1lZGl0b3ItbW9kaWZpZXJcIiBrZXk9e2Ake2l0ZW0uaWR9LSR7bW9kaWZpZXJJbmRleH1gfT48ZGl2PjxsYWJlbD48aW5wdXQgdHlwZT1cImNoZWNrYm94XCIgY2hlY2tlZD17aXRlbS5lbmFibGVkfSBvbkNoYW5nZT17KGV2ZW50KSA9PiB1cGRhdGUoYFRvZ2dsZSAke2RlZmluaXRpb24/LmxhYmVsfWAsIChkcmFmdCkgPT4geyBkcmFmdC5tb2RpZmllcnNbbW9kaWZpZXJJbmRleF0uZW5hYmxlZCA9IGV2ZW50LnRhcmdldC5jaGVja2VkOyB9KX0gLz57ZGVmaW5pdGlvbj8ubGFiZWwgfHwgaXRlbS5pZH08L2xhYmVsPjxzcGFuPjxidXR0b24gdHlwZT1cImJ1dHRvblwiIGRpc2FibGVkPXttb2RpZmllckluZGV4ID09PSAwfSBvbkNsaWNrPXsoKSA9PiBtb3ZlTW9kaWZpZXIoLTEpfSBhcmlhLWxhYmVsPVwiTW92ZSBtb2RpZmllciB1cFwiPuKGkTwvYnV0dG9uPjxidXR0b24gdHlwZT1cImJ1dHRvblwiIGRpc2FibGVkPXttb2RpZmllckluZGV4ID09PSB3b3JsZC5tb2RpZmllcnMubGVuZ3RoIC0gMX0gb25DbGljaz17KCkgPT4gbW92ZU1vZGlmaWVyKDEpfSBhcmlhLWxhYmVsPVwiTW92ZSBtb2RpZmllciBkb3duXCI+4oaTPC9idXR0b24+IENvc3Qge2RlZmluaXRpb24/LmNvc3QgfHwgJz8nfTwvc3Bhbj48L2Rpdj57KGRlZmluaXRpb24/LnBhcmFtZXRlcnMgfHwgW10pLm1hcCgoY29udHJvbCkgPT4gY29udHJvbC50eXBlID09PSAncmFuZ2UnID8gPE51bWJlclByb3BlcnR5IGtleT17Y29udHJvbC5pZH0gbGFiZWw9e2NvbnRyb2wubGFiZWx9IHZhbHVlPXtpdGVtLnBhcmFtZXRlcnNbY29udHJvbC5pZF19IG1pbj17Y29udHJvbC5taW59IG1heD17Y29udHJvbC5tYXh9IHN0ZXA9e2NvbnRyb2wuc3RlcH0gdW5pdD17Y29udHJvbC51bml0fSBvbkNoYW5nZT17KHZhbHVlKSA9PiB1cGRhdGUoYENoYW5nZSAke2NvbnRyb2wubGFiZWx9YCwgKGRyYWZ0KSA9PiB7IGRyYWZ0Lm1vZGlmaWVyc1ttb2RpZmllckluZGV4XS5wYXJhbWV0ZXJzW2NvbnRyb2wuaWRdID0gdmFsdWU7IH0sIGBtb2RpZmllcjoke3NlY3Rpb24uaWR9OiR7bW9kaWZpZXJJbmRleH06JHtjb250cm9sLmlkfWApfSAvPiA6IDxQcm9wZXJ0eSBrZXk9e2NvbnRyb2wuaWR9IGxhYmVsPXtjb250cm9sLmxhYmVsfT48c2VsZWN0IHZhbHVlPXtpdGVtLnBhcmFtZXRlcnNbY29udHJvbC5pZF19IG9uQ2hhbmdlPXsoZXZlbnQpID0+IHVwZGF0ZShgQ2hhbmdlICR7Y29udHJvbC5sYWJlbH1gLCAoZHJhZnQpID0+IHsgZHJhZnQubW9kaWZpZXJzW21vZGlmaWVySW5kZXhdLnBhcmFtZXRlcnNbY29udHJvbC5pZF0gPSBldmVudC50YXJnZXQudmFsdWU7IH0pfT57Y29udHJvbC5vcHRpb25zLm1hcCgob3B0aW9uKSA9PiA8b3B0aW9uIGtleT17b3B0aW9ufT57b3B0aW9ufTwvb3B0aW9uPil9PC9zZWxlY3Q+PC9Qcm9wZXJ0eT4pfTwvZGl2PjtcbiAgICAgICAgfSl9XG4gICAgICA8L2RldGFpbHM+XG4gICAgPC8+XG4gICk7XG59XG5cbmZ1bmN0aW9uIERpYWdub3N0aWNzKHsgZGlhZ25vc3RpY3MgfSkge1xuICBpZiAoIWRpYWdub3N0aWNzLmxlbmd0aCkgcmV0dXJuIDxkaXYgY2xhc3NOYW1lPVwiYWJvdXQtZWRpdG9yLWRpYWdub3N0aWNzIGlzLWNsZWFyXCI+PENoZWNrIGFyaWEtaGlkZGVuPVwidHJ1ZVwiIC8+IE5vIGRpYWdub3N0aWNzPC9kaXY+O1xuICByZXR1cm4gPGRpdiBjbGFzc05hbWU9XCJhYm91dC1lZGl0b3ItZGlhZ25vc3RpY3NcIj57ZGlhZ25vc3RpY3MubWFwKChpdGVtLCBpbmRleCkgPT4ge1xuICAgIGNvbnN0IERpYWdub3N0aWNJY29uID0gaXRlbS5sZXZlbCA9PT0gJ2Vycm9yJyA/IENpcmNsZUFsZXJ0IDogSW5mbztcbiAgICByZXR1cm4gPGRpdiBrZXk9e2Ake2l0ZW0uY29kZX0tJHtpdGVtLnBhdGh9LSR7aW5kZXh9YH0gY2xhc3NOYW1lPXtgaXMtJHtpdGVtLmxldmVsfWB9PjxEaWFnbm9zdGljSWNvbiBhcmlhLWhpZGRlbj1cInRydWVcIiAvPjxzcGFuPjxzdHJvbmc+e2l0ZW0ubWVzc2FnZX08L3N0cm9uZz48c21hbGw+e2l0ZW0ucGF0aH08L3NtYWxsPjwvc3Bhbj48L2Rpdj47XG4gIH0pfTwvZGl2Pjtcbn1cblxuZnVuY3Rpb24gQXVkaXRpb25Db250cm9scyh7IHN0b3JlLCBzbmFwc2hvdCB9KSB7XG4gIGNvbnN0IFtwcmVSb2xsV1UsIHNldFByZVJvbGxXVV0gPSB1c2VTdGF0ZSgwLjE4KTtcbiAgY29uc3QgW3Bvc3RSb2xsV1UsIHNldFBvc3RSb2xsV1VdID0gdXNlU3RhdGUoMC4xOCk7XG4gIGNvbnN0IG1lbWJlcnMgPSBnZXRBYm91dE5hcnJhdGl2ZVNlbGVjdGlvbk1lbWJlcnMoc25hcHNob3Quc2VsZWN0aW9uKTtcbiAgY29uc3Qgc291cmNlID0gc25hcHNob3Quc2VsZWN0aW9uLnR5cGUgPT09ICdjdWUnXG4gICAgPyB7IHR5cGU6ICdjdWUtZ3JvdXAnLCBzZWN0aW9uSWQ6IHNuYXBzaG90LnNlbGVjdGlvbi5zZWN0aW9uSWQsIG1lbWJlcnMsIHByaW1hcnk6IHNuYXBzaG90LnNlbGVjdGlvbiB9XG4gICAgOiBbJ3NlY3Rpb24nLCAnd29ybGQnLCAnY2FtZXJhLWtleSddLmluY2x1ZGVzKHNuYXBzaG90LnNlbGVjdGlvbi50eXBlKVxuICAgICAgPyBzbmFwc2hvdC5zZWxlY3Rpb25cbiAgICAgIDogbnVsbDtcbiAgaWYgKCFzb3VyY2UpIHJldHVybiBudWxsO1xuICBjb25zdCByYW5nZSA9IGRlcml2ZUFib3V0TmFycmF0aXZlTG9vcFJhbmdlKHtcbiAgICBkb2N1bWVudDogc25hcHNob3QuZG9jdW1lbnQsXG4gICAgcGxhbjogc25hcHNob3QuY29tcGlsZWRQbGFuLFxuICAgIHNvdXJjZSxcbiAgICBwcmVSb2xsV1UsXG4gICAgcG9zdFJvbGxXVSxcbiAgfSk7XG4gIGNvbnN0IGFjdGl2ZSA9IHJhbmdlLnZhbGlkXG4gICAgJiYgc25hcHNob3QudHJhbnNwb3J0Lmxvb3A/LnNvdXJjZVR5cGUgPT09IHJhbmdlLnNvdXJjZVR5cGVcbiAgICAmJiBzbmFwc2hvdC50cmFuc3BvcnQubG9vcD8uc291cmNlSWQgPT09IHJhbmdlLnNvdXJjZUlkO1xuICBjb25zdCB0b2dnbGUgPSAoKSA9PiB7XG4gICAgaWYgKGFjdGl2ZSkge1xuICAgICAgc3RvcmUuc2V0VHJhbnNwb3J0KHsgb3duZXI6ICd0aW1lbGluZScsIHBsYXlpbmc6IGZhbHNlLCBsb29wOiBudWxsIH0pO1xuICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICBpZiAoIXJhbmdlLnZhbGlkKSByZXR1cm47XG4gICAgc3RvcmUuc2V0VHJhbnNwb3J0KHtcbiAgICAgIG93bmVyOiAncGxheWJhY2snLFxuICAgICAgcGxheWluZzogdHJ1ZSxcbiAgICAgIGxpdmVBbWJpZW50OiBmYWxzZSxcbiAgICAgIHN0b3J5V1U6IHJhbmdlLnN0YXJ0V1UsXG4gICAgICBsb29wOiByYW5nZSxcbiAgICB9KTtcbiAgfTtcbiAgcmV0dXJuIChcbiAgICA8ZGV0YWlscyBjbGFzc05hbWU9XCJhYm91dC1lZGl0b3ItYXVkaXRpb25cIj5cbiAgICAgIDxzdW1tYXJ5PkJvdW5kYXJ5IGF1ZGl0aW9uPC9zdW1tYXJ5PlxuICAgICAgPGRpdiBjbGFzc05hbWU9XCJhYm91dC1lZGl0b3ItYXVkaXRpb24tcmFuZ2VcIj5cbiAgICAgICAgPFByb3BlcnR5IGxhYmVsPVwiUHJlLXJvbGxcIj48aW5wdXQgdHlwZT1cIm51bWJlclwiIG1pbj1cIjBcIiBtYXg9XCIyXCIgc3RlcD1cIjAuMDVcIiB2YWx1ZT17cHJlUm9sbFdVfSBvbkNoYW5nZT17KGV2ZW50KSA9PiBzZXRQcmVSb2xsV1UoTWF0aC5tYXgoMCwgTnVtYmVyKGV2ZW50LnRhcmdldC52YWx1ZSkgfHwgMCkpfSAvPjwvUHJvcGVydHk+XG4gICAgICAgIDxQcm9wZXJ0eSBsYWJlbD1cIlBvc3Qtcm9sbFwiPjxpbnB1dCB0eXBlPVwibnVtYmVyXCIgbWluPVwiMFwiIG1heD1cIjJcIiBzdGVwPVwiMC4wNVwiIHZhbHVlPXtwb3N0Um9sbFdVfSBvbkNoYW5nZT17KGV2ZW50KSA9PiBzZXRQb3N0Um9sbFdVKE1hdGgubWF4KDAsIE51bWJlcihldmVudC50YXJnZXQudmFsdWUpIHx8IDApKX0gLz48L1Byb3BlcnR5PlxuICAgICAgPC9kaXY+XG4gICAgICB7cmFuZ2UudmFsaWQgPyA8cCBjbGFzc05hbWU9XCJhYm91dC1lZGl0b3ItaGVscFwiPntmb3JtYXRXVShyYW5nZS5zdGFydFdVKX0g4oaSIHtmb3JtYXRXVShyYW5nZS5lbmRXVSl9IMK3IGFtYmllbnQgbW90aW9uIGZyZWV6ZXMgZm9yIGEgcmVwZWF0YWJsZSByZXZpZXcuPC9wPiA6IDxwIGNsYXNzTmFtZT1cImFib3V0LWVkaXRvci1yaHl0aG0tbWVzc2FnZSBpcy1lcnJvclwiPntyYW5nZS5yZWFzb259PC9wPn1cbiAgICAgIDxidXR0b24gdHlwZT1cImJ1dHRvblwiIGNsYXNzTmFtZT17YWN0aXZlID8gJ2lzLWFjdGl2ZSBhYm91dC1lZGl0b3Itd2lkZS1hY3Rpb24nIDogJ2Fib3V0LWVkaXRvci13aWRlLWFjdGlvbid9IGRpc2FibGVkPXshcmFuZ2UudmFsaWR9IG9uQ2xpY2s9e3RvZ2dsZX0+e2FjdGl2ZSA/ICdTdG9wIGF1ZGl0aW9uJyA6ICdMb29wIHRoaXMgc2VsZWN0aW9uJ308L2J1dHRvbj5cbiAgICA8L2RldGFpbHM+XG4gICk7XG59XG5cbmZ1bmN0aW9uIEluc3BlY3Rvcih7IHN0b3JlLCBzbmFwc2hvdCwgdGltZWxpbmVPcGVuLCBydW50aW1lTWV0cmljcywgY2xpcGJvYXJkLCBzZXRDbGlwYm9hcmQgfSkge1xuICBjb25zdCBpbnNwZWN0b3JSZWYgPSB1c2VSZWYobnVsbCk7XG4gIGNvbnN0IGRyYWdSZWYgPSB1c2VSZWYobnVsbCk7XG4gIGNvbnN0IGxhc3RIZWFkZXJDbGlja1JlZiA9IHVzZVJlZihudWxsKTtcbiAgY29uc3QgW3Bvc2l0aW9uLCBzZXRQb3NpdGlvbl0gPSB1c2VTdGF0ZShudWxsKTtcbiAgY29uc3QgW2RyYWdnaW5nLCBzZXREcmFnZ2luZ10gPSB1c2VTdGF0ZShmYWxzZSk7XG4gIGNvbnN0IHNlY3Rpb24gPSBnZXRTZWN0aW9uKHNuYXBzaG90LmRvY3VtZW50LCBzbmFwc2hvdC5zZWxlY3Rpb24pO1xuICBsZXQgY29udGVudCA9IDxTZWN0aW9uSW5zcGVjdG9yIHN0b3JlPXtzdG9yZX0gc25hcHNob3Q9e3NuYXBzaG90fSBzZWN0aW9uPXtzZWN0aW9ufSAvPjtcbiAgaWYgKHNuYXBzaG90LnNlbGVjdGlvbi50eXBlID09PSAnc2VxdWVuY2UnKSBjb250ZW50ID0gPFNlcXVlbmNlSW5zcGVjdG9yIHN0b3JlPXtzdG9yZX0gc25hcHNob3Q9e3NuYXBzaG90fSAvPjtcbiAgaWYgKHNuYXBzaG90LnNlbGVjdGlvbi50eXBlID09PSAnY3VlJykgY29udGVudCA9IDxDdWVJbnNwZWN0b3Igc3RvcmU9e3N0b3JlfSBzbmFwc2hvdD17c25hcHNob3R9IHNlY3Rpb249e3NlY3Rpb259IGNsaXBib2FyZD17Y2xpcGJvYXJkfSBzZXRDbGlwYm9hcmQ9e3NldENsaXBib2FyZH0gLz47XG4gIGlmIChzbmFwc2hvdC5zZWxlY3Rpb24udHlwZSA9PT0gJ2Rpc2NpcGxpbmUtcmV2ZWFsJykgY29udGVudCA9IDxEaXNjaXBsaW5lUmV2ZWFsSW5zcGVjdG9yIHN0b3JlPXtzdG9yZX0gc25hcHNob3Q9e3NuYXBzaG90fSBzZWN0aW9uPXtzZWN0aW9ufSAvPjtcbiAgaWYgKHNuYXBzaG90LnNlbGVjdGlvbi50eXBlID09PSAnY2FtZXJhLWtleScpIGNvbnRlbnQgPSA8Q2FtZXJhSW5zcGVjdG9yIHN0b3JlPXtzdG9yZX0gc25hcHNob3Q9e3NuYXBzaG90fSBzZWN0aW9uPXtzZWN0aW9ufSAvPjtcbiAgaWYgKHNuYXBzaG90LnNlbGVjdGlvbi50eXBlID09PSAnd29ybGQnKSBjb250ZW50ID0gPFdvcmxkSW5zcGVjdG9yIHN0b3JlPXtzdG9yZX0gc25hcHNob3Q9e3NuYXBzaG90fSBzZWN0aW9uPXtzZWN0aW9ufSBydW50aW1lTWV0cmljcz17cnVudGltZU1ldHJpY3N9IC8+O1xuICBpZiAoc25hcHNob3Quc2VsZWN0aW9uLnR5cGUgPT09ICdpbnRlcmFjdGlvbicpIGNvbnRlbnQgPSA8U2VjdGlvbkluc3BlY3RvciBzdG9yZT17c3RvcmV9IHNuYXBzaG90PXtzbmFwc2hvdH0gc2VjdGlvbj17c2VjdGlvbn0gLz47XG5cbiAgdXNlRWZmZWN0KCgpID0+IHtcbiAgICBjb25zdCBrZWVwSW5Cb3VuZHMgPSAoKSA9PiB7XG4gICAgICBpZiAod2luZG93LmlubmVyV2lkdGggPCA3NjApIHtcbiAgICAgICAgc2V0UG9zaXRpb24obnVsbCk7XG4gICAgICAgIHJldHVybjtcbiAgICAgIH1cbiAgICAgIHNldFBvc2l0aW9uKChjdXJyZW50KSA9PiAoXG4gICAgICAgIGN1cnJlbnQgJiYgaW5zcGVjdG9yUmVmLmN1cnJlbnRcbiAgICAgICAgICA/IGNsYW1wSW5zcGVjdG9yUG9zaXRpb24oaW5zcGVjdG9yUmVmLmN1cnJlbnQsIGN1cnJlbnQsIHRpbWVsaW5lT3BlbilcbiAgICAgICAgICA6IGN1cnJlbnRcbiAgICAgICkpO1xuICAgIH07XG4gICAga2VlcEluQm91bmRzKCk7XG4gICAgd2luZG93LmFkZEV2ZW50TGlzdGVuZXIoJ3Jlc2l6ZScsIGtlZXBJbkJvdW5kcyk7XG4gICAgcmV0dXJuICgpID0+IHdpbmRvdy5yZW1vdmVFdmVudExpc3RlbmVyKCdyZXNpemUnLCBrZWVwSW5Cb3VuZHMpO1xuICB9LCBbdGltZWxpbmVPcGVuXSk7XG5cbiAgY29uc3QgYmVnaW5EcmFnID0gKGV2ZW50KSA9PiB7XG4gICAgaWYgKGV2ZW50LmJ1dHRvbiAhPT0gMCB8fCB3aW5kb3cuaW5uZXJXaWR0aCA8IDc2MCB8fCAhZXZlbnQudGFyZ2V0LmNsb3Nlc3QoJ2hlYWRlcicpKSByZXR1cm47XG4gICAgY29uc3QgaW5zcGVjdG9yID0gaW5zcGVjdG9yUmVmLmN1cnJlbnQ7XG4gICAgaWYgKCFpbnNwZWN0b3IpIHJldHVybjtcbiAgICBjb25zdCByZWN0ID0gaW5zcGVjdG9yLmdldEJvdW5kaW5nQ2xpZW50UmVjdCgpO1xuICAgIGNvbnN0IHsgbWluVG9wLCBtYXhCb3R0b20gfSA9IGdldEluc3BlY3RvclZlcnRpY2FsQm91bmRzKGluc3BlY3RvciwgdGltZWxpbmVPcGVuKTtcbiAgICBjb25zdCBhdmFpbGFibGVIZWlnaHQgPSBtYXhCb3R0b20gLSBtaW5Ub3A7XG4gICAgY29uc3QgZmxvYXRpbmdIZWlnaHQgPSBNYXRoLm1pbihyZWN0LmhlaWdodCwgNTYwLCBNYXRoLm1heCgyNDAsIGF2YWlsYWJsZUhlaWdodCAqIDAuNzIpKTtcbiAgICBjb25zdCBzdGFydCA9IGNsYW1wSW5zcGVjdG9yUG9zaXRpb24oaW5zcGVjdG9yLCB7XG4gICAgICBsZWZ0OiByZWN0LmxlZnQsXG4gICAgICB0b3A6IHJlY3QudG9wLFxuICAgICAgd2lkdGg6IHJlY3Qud2lkdGgsXG4gICAgICBoZWlnaHQ6IGZsb2F0aW5nSGVpZ2h0LFxuICAgIH0sIHRpbWVsaW5lT3Blbik7XG4gICAgZHJhZ1JlZi5jdXJyZW50ID0ge1xuICAgICAgcG9pbnRlcklkOiBldmVudC5wb2ludGVySWQsXG4gICAgICBvcmlnaW5YOiBldmVudC5jbGllbnRYLFxuICAgICAgb3JpZ2luWTogZXZlbnQuY2xpZW50WSxcbiAgICAgIHN0YXJ0LFxuICAgICAgbW92ZWQ6IGZhbHNlLFxuICAgIH07XG4gICAgaW5zcGVjdG9yLnNldFBvaW50ZXJDYXB0dXJlKGV2ZW50LnBvaW50ZXJJZCk7XG4gIH07XG5cbiAgY29uc3QgbW92ZURyYWcgPSAoZXZlbnQpID0+IHtcbiAgICBjb25zdCBkcmFnID0gZHJhZ1JlZi5jdXJyZW50O1xuICAgIGNvbnN0IGluc3BlY3RvciA9IGluc3BlY3RvclJlZi5jdXJyZW50O1xuICAgIGlmICghZHJhZyB8fCAhaW5zcGVjdG9yIHx8IGRyYWcucG9pbnRlcklkICE9PSBldmVudC5wb2ludGVySWQpIHJldHVybjtcbiAgICBjb25zdCBkZWx0YVggPSBldmVudC5jbGllbnRYIC0gZHJhZy5vcmlnaW5YO1xuICAgIGNvbnN0IGRlbHRhWSA9IGV2ZW50LmNsaWVudFkgLSBkcmFnLm9yaWdpblk7XG4gICAgaWYgKCFkcmFnLm1vdmVkICYmIE1hdGguaHlwb3QoZGVsdGFYLCBkZWx0YVkpIDwgMykgcmV0dXJuO1xuICAgIGRyYWcubW92ZWQgPSB0cnVlO1xuICAgIHNldERyYWdnaW5nKHRydWUpO1xuICAgIHNldFBvc2l0aW9uKGNsYW1wSW5zcGVjdG9yUG9zaXRpb24oaW5zcGVjdG9yLCB7XG4gICAgICAuLi5kcmFnLnN0YXJ0LFxuICAgICAgbGVmdDogZHJhZy5zdGFydC5sZWZ0ICsgZGVsdGFYLFxuICAgICAgdG9wOiBkcmFnLnN0YXJ0LnRvcCArIGRlbHRhWSxcbiAgICB9LCB0aW1lbGluZU9wZW4pKTtcbiAgfTtcblxuICBjb25zdCBlbmREcmFnID0gKGV2ZW50KSA9PiB7XG4gICAgY29uc3QgZHJhZyA9IGRyYWdSZWYuY3VycmVudDtcbiAgICBpZiAoZHJhZz8ucG9pbnRlcklkICE9PSBldmVudC5wb2ludGVySWQpIHJldHVybjtcbiAgICBpZiAoIWRyYWcubW92ZWQpIHtcbiAgICAgIGNvbnN0IG5vdyA9IHBlcmZvcm1hbmNlLm5vdygpO1xuICAgICAgY29uc3QgcHJldmlvdXMgPSBsYXN0SGVhZGVyQ2xpY2tSZWYuY3VycmVudDtcbiAgICAgIGlmIChwcmV2aW91cyAmJiBub3cgLSBwcmV2aW91cy50aW1lIDwgMzYwXG4gICAgICAgICYmIE1hdGguaHlwb3QoZXZlbnQuY2xpZW50WCAtIHByZXZpb3VzLngsIGV2ZW50LmNsaWVudFkgLSBwcmV2aW91cy55KSA8IDYpIHtcbiAgICAgICAgc2V0UG9zaXRpb24obnVsbCk7XG4gICAgICAgIGxhc3RIZWFkZXJDbGlja1JlZi5jdXJyZW50ID0gbnVsbDtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGxhc3RIZWFkZXJDbGlja1JlZi5jdXJyZW50ID0geyB0aW1lOiBub3csIHg6IGV2ZW50LmNsaWVudFgsIHk6IGV2ZW50LmNsaWVudFkgfTtcbiAgICAgIH1cbiAgICB9XG4gICAgZHJhZ1JlZi5jdXJyZW50ID0gbnVsbDtcbiAgICBzZXREcmFnZ2luZyhmYWxzZSk7XG4gICAgaWYgKGluc3BlY3RvclJlZi5jdXJyZW50Py5oYXNQb2ludGVyQ2FwdHVyZShldmVudC5wb2ludGVySWQpKSB7XG4gICAgICBpbnNwZWN0b3JSZWYuY3VycmVudC5yZWxlYXNlUG9pbnRlckNhcHR1cmUoZXZlbnQucG9pbnRlcklkKTtcbiAgICB9XG4gIH07XG5cbiAgY29uc3QgcmVzZXRQb3NpdGlvbiA9ICgpID0+IHNldFBvc2l0aW9uKG51bGwpO1xuXG4gIHJldHVybiAoXG4gICAgPGFzaWRlXG4gICAgICByZWY9e2luc3BlY3RvclJlZn1cbiAgICAgIGNsYXNzTmFtZT17YGFib3V0LWVkaXRvci1pbnNwZWN0b3Ike2RyYWdnaW5nID8gJyBpcy1kcmFnZ2luZycgOiAnJ31gfVxuICAgICAgZGF0YS1mbG9hdGluZz17cG9zaXRpb24gPyAndHJ1ZScgOiAnZmFsc2UnfVxuICAgICAgc3R5bGU9e3Bvc2l0aW9uID8ge1xuICAgICAgICBsZWZ0OiBwb3NpdGlvbi5sZWZ0LFxuICAgICAgICB0b3A6IHBvc2l0aW9uLnRvcCxcbiAgICAgICAgcmlnaHQ6ICdhdXRvJyxcbiAgICAgICAgYm90dG9tOiAnYXV0bycsXG4gICAgICAgIHdpZHRoOiBwb3NpdGlvbi53aWR0aCxcbiAgICAgICAgaGVpZ2h0OiBwb3NpdGlvbi5oZWlnaHQsXG4gICAgICB9IDogdW5kZWZpbmVkfVxuICAgICAgb25Qb2ludGVyRG93bj17YmVnaW5EcmFnfVxuICAgICAgb25Qb2ludGVyTW92ZT17bW92ZURyYWd9XG4gICAgICBvblBvaW50ZXJVcD17ZW5kRHJhZ31cbiAgICAgIG9uUG9pbnRlckNhbmNlbD17ZW5kRHJhZ31cbiAgICAgIG9uRG91YmxlQ2xpY2s9e3Jlc2V0UG9zaXRpb259XG4gICAgPjxkaXYgY2xhc3NOYW1lPVwiYWJvdXQtZWRpdG9yLWluc3BlY3Rvci1zY3JvbGxcIj57Y29udGVudH08QXVkaXRpb25Db250cm9scyBzdG9yZT17c3RvcmV9IHNuYXBzaG90PXtzbmFwc2hvdH0gLz48RGlhZ25vc3RpY3MgZGlhZ25vc3RpY3M9e3NuYXBzaG90LmRpYWdub3N0aWNzfSAvPjwvZGl2PjwvYXNpZGU+XG4gICk7XG59XG5cbmZ1bmN0aW9uIENhbWVyYVBhdGhPdmVybGF5KHsgc25hcHNob3QgfSkge1xuICBjb25zdCBzZWN0aW9ucyA9IHNuYXBzaG90LmNvbXBpbGVkUGxhbj8uc2VjdGlvbnMgfHwgW107XG4gIGNvbnN0IHRvdGFsID0gc25hcHNob3QuY29tcGlsZWRQbGFuPy5tYXhTdG9yeVdVIHx8IDE7XG4gIHJldHVybiAoXG4gICAgPGRpdiBjbGFzc05hbWU9XCJhYm91dC1lZGl0b3ItcGF0aC1vdmVybGF5XCIgYXJpYS1sYWJlbD1cIkNhbWVyYSBwYXRoIG92ZXJsYXlcIj5cbiAgICAgIDxkaXY+PHN0cm9uZz5QYXRoIMK3IGNvbnN0YW50IGNhZGVuY2U8L3N0cm9uZz48c3Bhbj57Zm9ybWF0V1Uoc25hcHNob3QudHJhbnNwb3J0LnN0b3J5V1UpfSAvIHtmb3JtYXRXVSh0b3RhbCl9PC9zcGFuPjwvZGl2PlxuICAgICAgPHN2ZyB2aWV3Qm94PVwiMCAwIDI0MCAxMTJcIiByb2xlPVwiaW1nXCIgYXJpYS1sYWJlbD1cIkNhbWVyYSBhbmQgV29ybGQgYW5jaG9ycyBvdmVyIHN0b3J5IGRpc3RhbmNlXCI+XG4gICAgICAgIDxwYXRoIGQ9XCJNMTggNTYgSDIyMlwiIC8+XG4gICAgICAgIHtzZWN0aW9ucy5tYXAoKHNlY3Rpb24pID0+IHtcbiAgICAgICAgICBjb25zdCB4ID0gMTggKyAoKHNlY3Rpb24uc3RhcnRXVSAvIHRvdGFsKSAqIDIwNCk7XG4gICAgICAgICAgcmV0dXJuIDxnIGtleT17c2VjdGlvbi5pZH0gdHJhbnNmb3JtPXtgdHJhbnNsYXRlKCR7eH0gNTYpYH0+PGxpbmUgeTE9XCItMTJcIiB5Mj1cIjEyXCIgLz48Y2lyY2xlIHI9e3NlY3Rpb24ud29ybGRTdGF0ZT8uY2hhbmdlc1dvcmxkID8gNCA6IDJ9IC8+PHRpdGxlPntzZWN0aW9uLmxhYmVsfXtzZWN0aW9uLndvcmxkU3RhdGU/LmNoYW5nZXNXb3JsZCA/IGAgwrcgJHtzZWN0aW9uLndvcmxkU3RhdGUuYWN0aXZlV29ybGQuc2hhcGVJZH1gIDogJyd9PC90aXRsZT48L2c+O1xuICAgICAgICB9KX1cbiAgICAgICAgPGcgY2xhc3NOYW1lPVwiaXMtcGxheWhlYWRcIiB0cmFuc2Zvcm09e2B0cmFuc2xhdGUoJHsxOCArICgoc25hcHNob3QudHJhbnNwb3J0LnN0b3J5V1UgLyB0b3RhbCkgKiAyMDQpfSA1NilgfT48cGF0aCBkPVwiTTAgLTIyIEw1IC0xNSBILTUgWlwiIC8+PGxpbmUgeTE9XCItMTVcIiB5Mj1cIjIyXCIgLz48L2c+XG4gICAgICA8L3N2Zz5cbiAgICAgIDxzbWFsbD5Eb3RzIGFyZSBTZWN0aW9uIGJvdW5kYXJpZXMuIExhcmdlIGRvdHMgYXJlIGZpeGVkIFdvcmxkIGFuY2hvcnMuIFRoZSBtYXJrZXIgaXMgdGhlIHB1Ymxpc2hlZCBjYW1lcmEuPC9zbWFsbD5cbiAgICA8L2Rpdj5cbiAgKTtcbn1cblxuZXhwb3J0IGRlZmF1bHQgZnVuY3Rpb24gQWJvdXROYXJyYXRpdmVFZGl0b3IoeyBzdG9yZSwgcnVudGltZVJlZiwgcm9vdFJlZiB9KSB7XG4gIGNvbnN0IHNuYXBzaG90ID0gdXNlU3luY0V4dGVybmFsU3RvcmUoc3RvcmUuc3Vic2NyaWJlLCBzdG9yZS5nZXRTbmFwc2hvdCk7XG4gIGNvbnN0IFtjaGVja3BvaW50cywgc2V0Q2hlY2twb2ludHNdID0gdXNlU3RhdGUoKCkgPT4gcmVhZEFib3V0TmFycmF0aXZlQ2hlY2twb2ludHMoKSk7XG4gIGNvbnN0IFtjbGlwYm9hcmQsIHNldENsaXBib2FyZF0gPSB1c2VTdGF0ZShudWxsKTtcbiAgY29uc3QgW3J1bnRpbWVNZXRyaWNzLCBzZXRSdW50aW1lTWV0cmljc10gPSB1c2VTdGF0ZShudWxsKTtcbiAgY29uc3QgW3BhdGhWaXNpYmxlLCBzZXRQYXRoVmlzaWJsZV0gPSB1c2VTdGF0ZShmYWxzZSk7XG4gIGNvbnN0IFtkaXJlY3RvclZpZXcsIHNldERpcmVjdG9yVmlld10gPSB1c2VTdGF0ZShmYWxzZSk7XG4gIGNvbnN0IFttb2JpbGVQYW5lLCBzZXRNb2JpbGVQYW5lXSA9IHVzZVN0YXRlKCdzZXF1ZW5jZScpO1xuICBjb25zdCBbdGltZWxpbmVPcGVuLCBzZXRUaW1lbGluZU9wZW5dID0gdXNlU3RhdGUoKCkgPT4gKFxuICAgIHdpbmRvdy5sb2NhbFN0b3JhZ2UuZ2V0SXRlbShBQk9VVF9FRElUT1JfVElNRUxJTkVfU1RPUkFHRV9LRVkpICE9PSAnY2xvc2VkJ1xuICApKTtcbiAgY29uc3QgaW1wb3J0UmVmID0gdXNlUmVmKG51bGwpO1xuICBjb25zdCBzbmFwc2hvdFJlZiA9IHVzZVJlZihzbmFwc2hvdCk7XG4gIGNvbnN0IGFjdGl2ZVNlbGVjdGlvbiA9IHNuYXBzaG90LnNlbGVjdGlvbjtcblxuICB1c2VFZmZlY3QoKCkgPT4ge1xuICAgIHNuYXBzaG90UmVmLmN1cnJlbnQgPSBzbmFwc2hvdDtcbiAgfSwgW3NuYXBzaG90XSk7XG5cbiAgdXNlRWZmZWN0KCgpID0+IHtcbiAgICB3aW5kb3cubG9jYWxTdG9yYWdlLnNldEl0ZW0oQUJPVVRfRURJVE9SX1RJTUVMSU5FX1NUT1JBR0VfS0VZLCB0aW1lbGluZU9wZW4gPyAnb3BlbicgOiAnY2xvc2VkJyk7XG4gIH0sIFt0aW1lbGluZU9wZW5dKTtcblxuICB1c2VFZmZlY3QoKCkgPT4ge1xuICAgIGNvbnN0IHJvb3QgPSByb290UmVmLmN1cnJlbnQ7XG4gICAgY29uc3QgcnVudGltZSA9IHJ1bnRpbWVSZWYuY3VycmVudDtcbiAgICByb290Py5zZXRBdHRyaWJ1dGUoJ2RhdGEtZWRpdG9yLWFjdGl2ZScsICd0cnVlJyk7XG4gICAgbG9hZEFib3V0TmFycmF0aXZlU291cmNlKCkudGhlbigoeyBkb2N1bWVudCwgaGFzaCB9KSA9PiB7XG4gICAgICBjb25zdCBjdXJyZW50ID0gc3RvcmUuZ2V0U25hcHNob3QoKTtcbiAgICAgIGlmICghY3VycmVudC5kaXJ0eSkgc3RvcmUucmVwbGFjZURvY3VtZW50KCdSZWZyZXNoIGNhbm9uaWNhbCBzb3VyY2UnLCBkb2N1bWVudCk7XG4gICAgICBzdG9yZS5zZXRCYXNlbGluZShkb2N1bWVudCwgaGFzaCk7XG4gICAgICBjb25zdCByZWNvdmVyeSA9IHJlYWRBYm91dE5hcnJhdGl2ZVJlY292ZXJ5RHJhZnQoKTtcbiAgICAgIGlmIChyZWNvdmVyeSAmJiByZWNvdmVyeS50aW1lc3RhbXAgPiBEYXRlLm5vdygpIC0gKDE0ICogODY0MDAwMDApKSB7XG4gICAgICAgIHN0b3JlLnNldFJlY292ZXJ5U3RhdGUoeyBhdmFpbGFibGU6IHRydWUsIGRyYWZ0OiByZWNvdmVyeSwgZXJyb3I6ICcnIH0pO1xuICAgICAgfVxuICAgIH0pLmNhdGNoKChlcnJvcikgPT4gc3RvcmUuc2V0U2F2ZVN0YXRlKHsgc3RhdHVzOiAnZmFpbGVkJywgbWVzc2FnZTogZXJyb3IubWVzc2FnZSB9KSk7XG4gICAgcmV0dXJuICgpID0+IHtcbiAgICAgIHJvb3Q/LnJlbW92ZUF0dHJpYnV0ZSgnZGF0YS1lZGl0b3ItYWN0aXZlJyk7XG4gICAgICBydW50aW1lPy5zZXREaXJlY3RvclZpZXc/LihmYWxzZSk7XG4gICAgfTtcbiAgfSwgW3Jvb3RSZWYsIHJ1bnRpbWVSZWYsIHN0b3JlXSk7XG5cbiAgdXNlRWZmZWN0KCgpID0+IHtcbiAgICBjb25zdCByb290ID0gcm9vdFJlZi5jdXJyZW50O1xuICAgIGlmICghcm9vdCkgcmV0dXJuIHVuZGVmaW5lZDtcbiAgICByb290LnF1ZXJ5U2VsZWN0b3JBbGwoJy5pcy1lZGl0b3Itc2VsZWN0ZWQnKS5mb3JFYWNoKChub2RlKSA9PiBub2RlLmNsYXNzTGlzdC5yZW1vdmUoJ2lzLWVkaXRvci1zZWxlY3RlZCcpKTtcbiAgICBnZXRBYm91dE5hcnJhdGl2ZVNlbGVjdGlvbk1lbWJlcnMoYWN0aXZlU2VsZWN0aW9uKS5mb3JFYWNoKChtZW1iZXIpID0+IHtcbiAgICAgIHJvb3QucXVlcnlTZWxlY3RvcihgW2RhdGEtdGV4dC1jdWU9XCIke0NTUy5lc2NhcGUobWVtYmVyLmN1ZUlkKX1cIl1gKT8uY2xhc3NMaXN0LmFkZCgnaXMtZWRpdG9yLXNlbGVjdGVkJyk7XG4gICAgfSk7XG4gICAgcm9vdC5kYXRhc2V0LmVkaXRvclNlbGVjdGlvblR5cGUgPSBhY3RpdmVTZWxlY3Rpb24udHlwZSB8fCAnJztcbiAgICByZXR1cm4gKCkgPT4ge1xuICAgICAgcm9vdC5xdWVyeVNlbGVjdG9yQWxsKCcuaXMtZWRpdG9yLXNlbGVjdGVkJykuZm9yRWFjaCgobm9kZSkgPT4gbm9kZS5jbGFzc0xpc3QucmVtb3ZlKCdpcy1lZGl0b3Itc2VsZWN0ZWQnKSk7XG4gICAgICBkZWxldGUgcm9vdC5kYXRhc2V0LmVkaXRvclNlbGVjdGlvblR5cGU7XG4gICAgfTtcbiAgfSwgW2FjdGl2ZVNlbGVjdGlvbiwgcm9vdFJlZl0pO1xuXG4gIHVzZUVmZmVjdCgoKSA9PiB7XG4gICAgY29uc3QgaW50ZXJ2YWwgPSB3aW5kb3cuc2V0SW50ZXJ2YWwoKCkgPT4gc2V0UnVudGltZU1ldHJpY3MocnVudGltZVJlZi5jdXJyZW50Py5nZXRNZXRyaWNzPy4oKSB8fCBudWxsKSwgNTAwKTtcbiAgICByZXR1cm4gKCkgPT4gd2luZG93LmNsZWFySW50ZXJ2YWwoaW50ZXJ2YWwpO1xuICB9LCBbcnVudGltZVJlZl0pO1xuXG4gIHVzZUVmZmVjdCgoKSA9PiB7XG4gICAgaWYgKCFzbmFwc2hvdC5kaXJ0eSkgcmV0dXJuIHVuZGVmaW5lZDtcbiAgICBjb25zdCB0aW1lciA9IHdpbmRvdy5zZXRUaW1lb3V0KCgpID0+IHtcbiAgICAgIHRyeSB7XG4gICAgICAgIHdyaXRlQWJvdXROYXJyYXRpdmVSZWNvdmVyeURyYWZ0KHNuYXBzaG90LmRvY3VtZW50LCBzbmFwc2hvdC5iYXNlbGluZUhhc2gpO1xuICAgICAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICAgICAgc3RvcmUuc2V0UmVjb3ZlcnlTdGF0ZSh7IGVycm9yOiBgRHJhZnQgc3RvcmFnZSBmYWlsZWQ6ICR7ZXJyb3IubWVzc2FnZX1gIH0pO1xuICAgICAgfVxuICAgIH0sIDkwMCk7XG4gICAgcmV0dXJuICgpID0+IHdpbmRvdy5jbGVhclRpbWVvdXQodGltZXIpO1xuICB9LCBbc25hcHNob3QuYmFzZWxpbmVIYXNoLCBzbmFwc2hvdC5kaXJ0eSwgc25hcHNob3QuZG9jdW1lbnQsIHN0b3JlXSk7XG5cbiAgdXNlRWZmZWN0KCgpID0+IHtcbiAgICBjb25zdCBwYWdlaGlkZSA9ICgpID0+IHtcbiAgICAgIGNvbnN0IGN1cnJlbnQgPSBzbmFwc2hvdFJlZi5jdXJyZW50O1xuICAgICAgaWYgKGN1cnJlbnQuZGlydHkpIHtcbiAgICAgICAgdHJ5IHsgd3JpdGVBYm91dE5hcnJhdGl2ZVJlY292ZXJ5RHJhZnQoY3VycmVudC5kb2N1bWVudCwgY3VycmVudC5iYXNlbGluZUhhc2gpOyB9IGNhdGNoIHsgLyogc3VyZmFjZWQgYnkgbm9ybWFsIGF1dG9zYXZlICovIH1cbiAgICAgIH1cbiAgICB9O1xuICAgIGNvbnN0IGtleWRvd24gPSAoZXZlbnQpID0+IHtcbiAgICAgIGlmICgoZXZlbnQubWV0YUtleSB8fCBldmVudC5jdHJsS2V5KSAmJiBldmVudC5rZXkudG9Mb3dlckNhc2UoKSA9PT0gJ3MnKSB7XG4gICAgICAgIGV2ZW50LnByZXZlbnREZWZhdWx0KCk7XG4gICAgICAgIGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3IoJ1tkYXRhLWFib3V0LWVkaXRvci1zYXZlXScpPy5jbGljaygpO1xuICAgICAgfVxuICAgICAgaWYgKChldmVudC5tZXRhS2V5IHx8IGV2ZW50LmN0cmxLZXkpICYmIGV2ZW50LmtleS50b0xvd2VyQ2FzZSgpID09PSAneicpIHtcbiAgICAgICAgZXZlbnQucHJldmVudERlZmF1bHQoKTtcbiAgICAgICAgZXZlbnQuc2hpZnRLZXkgPyBzdG9yZS5yZWRvKCkgOiBzdG9yZS51bmRvKCk7XG4gICAgICB9XG4gICAgICBpZiAoIWV2ZW50Lm1ldGFLZXkgJiYgIWV2ZW50LmN0cmxLZXkgJiYgIWV2ZW50LmFsdEtleSAmJiAhZXZlbnQuc2hpZnRLZXlcbiAgICAgICAgJiYgIWlzVGV4dEVkaXRpbmdUYXJnZXQoZXZlbnQudGFyZ2V0KSAmJiBbJ0Fycm93TGVmdCcsICdBcnJvd1JpZ2h0J10uaW5jbHVkZXMoZXZlbnQua2V5KSkge1xuICAgICAgICBldmVudC5wcmV2ZW50RGVmYXVsdCgpO1xuICAgICAgICBqdW1wVGltZWxpbmVLZXlmcmFtZShzdG9yZSwgc3RvcmUuZ2V0U25hcHNob3QoKSwgZXZlbnQua2V5ID09PSAnQXJyb3dSaWdodCcgPyAxIDogLTEpO1xuICAgICAgfVxuICAgICAgaWYgKCFldmVudC5tZXRhS2V5ICYmICFldmVudC5jdHJsS2V5ICYmICFldmVudC5hbHRLZXlcbiAgICAgICAgJiYgIWlzVGV4dEVkaXRpbmdUYXJnZXQoZXZlbnQudGFyZ2V0KSAmJiBbJ0JhY2tzcGFjZScsICdEZWxldGUnXS5pbmNsdWRlcyhldmVudC5rZXkpXG4gICAgICAgICYmIGRlbGV0ZVRpbWVsaW5lU2VsZWN0aW9uKHN0b3JlLCBzdG9yZS5nZXRTbmFwc2hvdCgpKSkge1xuICAgICAgICBldmVudC5wcmV2ZW50RGVmYXVsdCgpO1xuICAgICAgfVxuICAgICAgaWYgKGV2ZW50LmtleSA9PT0gJ0VzY2FwZScpIHtcbiAgICAgICAgY29uc3QgY3VycmVudCA9IHN0b3JlLmdldFNuYXBzaG90KCk7XG4gICAgICAgIGlmIChjdXJyZW50LnByZXZpZXdTdGF0ZSkgc3RvcmUuY2FuY2VsUHJldmlldygpO1xuICAgICAgICBlbHNlIGlmIChjdXJyZW50LnRyeVN0YXRlKSBzdG9yZS5jYW5jZWxUcnkoKTtcbiAgICAgICAgZWxzZSBpZiAoZ2V0QWJvdXROYXJyYXRpdmVTZWxlY3Rpb25NZW1iZXJzKGN1cnJlbnQuc2VsZWN0aW9uKS5sZW5ndGggPiAxKSB7XG4gICAgICAgICAgc3RvcmUuc2V0U2VsZWN0aW9uKHtcbiAgICAgICAgICAgIHR5cGU6ICdjdWUnLFxuICAgICAgICAgICAgc2VjdGlvbklkOiBjdXJyZW50LnNlbGVjdGlvbi5zZWN0aW9uSWQsXG4gICAgICAgICAgICBjdWVJZDogY3VycmVudC5zZWxlY3Rpb24uY3VlSWQsXG4gICAgICAgICAgICBrZXlQYXJ0OiBjdXJyZW50LnNlbGVjdGlvbi5rZXlQYXJ0IHx8ICdmb2N1cycsXG4gICAgICAgICAgfSk7XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSBpZiAoY3VycmVudC5zZWxlY3Rpb24udHlwZSAhPT0gJ3NlY3Rpb24nKSBzdG9yZS5zZXRTZWxlY3Rpb24oeyB0eXBlOiAnc2VjdGlvbicsIHNlY3Rpb25JZDogY3VycmVudC5zZWxlY3Rpb24uc2VjdGlvbklkIH0pO1xuICAgICAgICBlbHNlIHN0b3JlLnNldFNlbGVjdGlvbih7IHR5cGU6ICdzZXF1ZW5jZScgfSk7XG4gICAgICB9XG4gICAgfTtcbiAgICB3aW5kb3cuYWRkRXZlbnRMaXN0ZW5lcigncGFnZWhpZGUnLCBwYWdlaGlkZSk7XG4gICAgd2luZG93LmFkZEV2ZW50TGlzdGVuZXIoJ2tleWRvd24nLCBrZXlkb3duKTtcbiAgICByZXR1cm4gKCkgPT4geyB3aW5kb3cucmVtb3ZlRXZlbnRMaXN0ZW5lcigncGFnZWhpZGUnLCBwYWdlaGlkZSk7IHdpbmRvdy5yZW1vdmVFdmVudExpc3RlbmVyKCdrZXlkb3duJywga2V5ZG93bik7IH07XG4gIH0sIFtzdG9yZV0pO1xuXG4gIGNvbnN0IHNhdmUgPSBhc3luYyAoKSA9PiB7XG4gICAgY29uc3QgZWRpdG9yVXJsID0gbmV3IFVSTCh3aW5kb3cubG9jYXRpb24uaHJlZik7XG4gICAgZWRpdG9yVXJsLnNlYXJjaFBhcmFtcy5zZXQoJ2VkaXQnLCAnMScpO1xuICAgIHdpbmRvdy5oaXN0b3J5LnJlcGxhY2VTdGF0ZSh3aW5kb3cuaGlzdG9yeS5zdGF0ZSwgJycsIGAke2VkaXRvclVybC5wYXRobmFtZX0ke2VkaXRvclVybC5zZWFyY2h9JHtlZGl0b3JVcmwuaGFzaH1gKTtcbiAgICBjb25zdCBzZW50ID0gY2xvbmVBYm91dE5hcnJhdGl2ZURvY3VtZW50KHNuYXBzaG90LmRvY3VtZW50KTtcbiAgICBpZiAoc25hcHNob3QuZGlhZ25vc3RpY3Muc29tZSgoaXRlbSkgPT4gaXRlbS5sZXZlbCA9PT0gJ2Vycm9yJykpIHtcbiAgICAgIHN0b3JlLnNldFNhdmVTdGF0ZSh7IHN0YXR1czogJ2ZhaWxlZCcsIG1lc3NhZ2U6ICdSZXNvbHZlIHZhbGlkYXRpb24gZXJyb3JzIGJlZm9yZSBzYXZpbmcuJyB9KTtcbiAgICAgIHJldHVybjtcbiAgICB9XG4gICAgc3RvcmUuc2V0U2F2ZVN0YXRlKHsgc3RhdHVzOiAnc2F2aW5nJywgbWVzc2FnZTogJycgfSk7XG4gICAgdHJ5IHtcbiAgICAgIGNvbnN0IHJlc3VsdCA9IGF3YWl0IHNhdmVBYm91dE5hcnJhdGl2ZVNvdXJjZShzZW50LCBzbmFwc2hvdC5iYXNlbGluZUhhc2gpO1xuICAgICAgc3RvcmUubWFya1NhdmVkKHNlbnQsIHJlc3VsdC5oYXNoKTtcbiAgICAgIGNsZWFyQWJvdXROYXJyYXRpdmVSZWNvdmVyeURyYWZ0KCk7XG4gICAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICAgIHN0b3JlLnNldFNhdmVTdGF0ZSh7IHN0YXR1czogZXJyb3Iuc3RhdHVzID09PSA0MDkgPyAnY29uZmxpY3QnIDogJ2ZhaWxlZCcsIG1lc3NhZ2U6IGVycm9yLm1lc3NhZ2UgfSk7XG4gICAgfVxuICB9O1xuXG4gIGNvbnN0IGFkZENoZWNrcG9pbnQgPSAoKSA9PiB7XG4gICAgY29uc3QgY2hlY2twb2ludCA9IHtcbiAgICAgIGlkOiBjcnlwdG8ucmFuZG9tVVVJRCgpLFxuICAgICAgbmFtZTogYENoZWNrcG9pbnQgJHtuZXcgRGF0ZSgpLnRvTG9jYWxlVGltZVN0cmluZyhbXSwgeyBob3VyOiAnMi1kaWdpdCcsIG1pbnV0ZTogJzItZGlnaXQnIH0pfWAsXG4gICAgICB0aW1lc3RhbXA6IERhdGUubm93KCksXG4gICAgICBzdG9yeVdVOiBzbmFwc2hvdC50cmFuc3BvcnQuc3RvcnlXVSxcbiAgICAgIGJhc2VTb3VyY2VIYXNoOiBzbmFwc2hvdC5iYXNlbGluZUhhc2gsXG4gICAgICBkb2N1bWVudDogc25hcHNob3QuZG9jdW1lbnQsXG4gICAgfTtcbiAgICBzZXRDaGVja3BvaW50cyh3cml0ZUFib3V0TmFycmF0aXZlQ2hlY2twb2ludChjaGVja3BvaW50KSk7XG4gIH07XG4gIGNvbnN0IHN0YXR1c0xhYmVsID0gc25hcHNob3Quc2F2ZVN0YXRlLnN0YXR1cyA9PT0gJ3NhdmluZycgPyAnU2F2aW5n4oCmJ1xuICAgIDogc25hcHNob3Quc2F2ZVN0YXRlLnN0YXR1cyA9PT0gJ2NvbmZsaWN0JyA/ICdTb3VyY2UgY2hhbmdlZCdcbiAgICAgIDogc25hcHNob3Quc2F2ZVN0YXRlLnN0YXR1cyA9PT0gJ2ZhaWxlZCcgPyAnU2F2ZSBmYWlsZWQnXG4gICAgICAgIDogc25hcHNob3QuZGlydHkgPyAnRHJhZnQnIDogJ1NhdmVkJztcbiAgY29uc3Qgc2VsZWN0ZWQgPSBnZXRTZWN0aW9uKHNuYXBzaG90LmRvY3VtZW50LCBzbmFwc2hvdC5zZWxlY3Rpb24pO1xuICBjb25zdCBjb21waWxlZFNlbGVjdGVkID0gc25hcHNob3QuY29tcGlsZWRQbGFuPy5zZWN0aW9ucy5maW5kKChzZWN0aW9uKSA9PiBzZWN0aW9uLmlkID09PSBzZWxlY3RlZD8uaWQpO1xuICBjb25zdCByZXNvbHZlZEV4dGVudCA9IGNvbXBpbGVkU2VsZWN0ZWQ/LnJlc29sdmVkRXh0ZW50V1UgfHwgc2VsZWN0ZWQ/LmV4dGVudFdVIHx8IDA7XG4gIGNvbnN0IHNlbGVjdGVkRXh0ZW50ID0gc2VsZWN0ZWRcbiAgICA/IE51bWJlcihzbmFwc2hvdC5wcmV2aWV3UHJvZmlsZSA9PT0gJ21vYmlsZScgPyBzZWxlY3RlZC5tb2JpbGVFeHRlbnRXVSA6IHNlbGVjdGVkLmV4dGVudFdVKVxuICAgIDogMDtcbiAgY29uc3Qgc2VsZWN0ZWRDdWVDb3VudCA9IGdldEFib3V0TmFycmF0aXZlU2VsZWN0aW9uTWVtYmVycyhzbmFwc2hvdC5zZWxlY3Rpb24pLmxlbmd0aDtcbiAgY29uc3QgbG9vcEFjdGl2ZSA9IEJvb2xlYW4oc25hcHNob3QudHJhbnNwb3J0Lmxvb3ApO1xuICBjb25zdCB0aW1lbGluZURlbGV0aW9uID0gZ2V0VGltZWxpbmVEZWxldGlvbihzbmFwc2hvdCk7XG4gIGNvbnN0IHRvZ2dsZUxvb3AgPSAoKSA9PiB7XG4gICAgaWYgKGxvb3BBY3RpdmUpIHtcbiAgICAgIHN0b3JlLnNldFRyYW5zcG9ydCh7IG93bmVyOiAndGltZWxpbmUnLCBwbGF5aW5nOiBmYWxzZSwgbG9vcDogbnVsbCB9KTtcbiAgICAgIHJldHVybjtcbiAgICB9XG4gICAgY29uc3QgcmFuZ2UgPSBkZXJpdmVBYm91dE5hcnJhdGl2ZUxvb3BSYW5nZSh7XG4gICAgICBkb2N1bWVudDogc25hcHNob3QuZG9jdW1lbnQsXG4gICAgICBwbGFuOiBzbmFwc2hvdC5jb21waWxlZFBsYW4sXG4gICAgICBzb3VyY2U6IHNlbGVjdGVkID8geyB0eXBlOiAnc2VjdGlvbicsIHNlY3Rpb25JZDogc2VsZWN0ZWQuaWQgfSA6IG51bGwsXG4gICAgfSk7XG4gICAgaWYgKHJhbmdlLnZhbGlkKSBzdG9yZS5zZXRUcmFuc3BvcnQoeyBsb29wOiByYW5nZSB9KTtcbiAgfTtcbiAgY29uc3QgdG9nZ2xlU29sbyA9ICh0cmFjaykgPT4gc3RvcmUuc2V0VHJhbnNwb3J0KHtcbiAgICBzb2xvVHJhY2s6IHNuYXBzaG90LnRyYW5zcG9ydC5zb2xvVHJhY2sgPT09IHRyYWNrID8gbnVsbCA6IHRyYWNrLFxuICB9KTtcbiAgY29uc3QgZml0U2VxdWVuY2UgPSAoKSA9PiB7XG4gICAgc3RvcmUuc2V0VHJhbnNwb3J0KHsgem9vbTogMSB9KTtcbiAgICByZXF1ZXN0QW5pbWF0aW9uRnJhbWUoKCkgPT4ge1xuICAgICAgY29uc3QgbGFuZXMgPSBkb2N1bWVudC5xdWVyeVNlbGVjdG9yKCcuYWJvdXQtZWRpdG9yLWxhbmVzJyk7XG4gICAgICBpZiAobGFuZXMpIGxhbmVzLnNjcm9sbExlZnQgPSAwO1xuICAgIH0pO1xuICB9O1xuICBjb25zdCBmaXRTZWN0aW9uID0gKCkgPT4ge1xuICAgIGlmICghY29tcGlsZWRTZWxlY3RlZCB8fCAhc25hcHNob3QuY29tcGlsZWRQbGFuPy5tYXhTdG9yeVdVKSByZXR1cm47XG4gICAgY29uc3Qgc2VjdGlvblNwYW4gPSBNYXRoLm1heCgwLjAwMSwgY29tcGlsZWRTZWxlY3RlZC5yZXNvbHZlZEV4dGVudFdVKTtcbiAgICBjb25zdCB6b29tID0gTWF0aC5taW4oOCwgTWF0aC5tYXgoMSwgKHNuYXBzaG90LmNvbXBpbGVkUGxhbi5tYXhTdG9yeVdVIC8gc2VjdGlvblNwYW4pICogMC44MikpO1xuICAgIHN0b3JlLnNldFRyYW5zcG9ydCh7IHpvb206IE51bWJlcih6b29tLnRvRml4ZWQoMykpIH0pO1xuICAgIHJlcXVlc3RBbmltYXRpb25GcmFtZSgoKSA9PiB7XG4gICAgICBjb25zdCBsYW5lcyA9IGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3IoJy5hYm91dC1lZGl0b3ItbGFuZXMnKTtcbiAgICAgIGlmICghbGFuZXMpIHJldHVybjtcbiAgICAgIGNvbnN0IHN0YXJ0UmF0aW8gPSBjb21waWxlZFNlbGVjdGVkLnN0YXJ0V1UgLyBzbmFwc2hvdC5jb21waWxlZFBsYW4ubWF4U3RvcnlXVTtcbiAgICAgIGxhbmVzLnNjcm9sbExlZnQgPSBNYXRoLm1heCgwLCAoc3RhcnRSYXRpbyAqIGxhbmVzLnNjcm9sbFdpZHRoKSAtIChsYW5lcy5jbGllbnRXaWR0aCAqIDAuMDgpKTtcbiAgICB9KTtcbiAgfTtcbiAgY29uc3QgdG9nZ2xlRGlyZWN0b3IgPSAoKSA9PiB7XG4gICAgY29uc3QgbmV4dCA9ICFkaXJlY3RvclZpZXc7XG4gICAgc2V0RGlyZWN0b3JWaWV3KG5leHQpO1xuICAgIHJ1bnRpbWVSZWYuY3VycmVudD8uc2V0RGlyZWN0b3JWaWV3Py4obmV4dCk7XG4gIH07XG4gIGNvbnN0IHRvZ2dsZUJlZm9yZSA9ICgpID0+IHtcbiAgICBpZiAoc25hcHNob3QudHJ5U3RhdGU/LmxhYmVsID09PSAnQ29tcGFyZSBzYXZlZCBzb3VyY2UnKSB7XG4gICAgICBzdG9yZS5jYW5jZWxUcnkoKTtcbiAgICAgIHJldHVybjtcbiAgICB9XG4gICAgaWYgKHNuYXBzaG90LnRyeVN0YXRlKSByZXR1cm47XG4gICAgc3RvcmUuYmVnaW5UcnkoJ0NvbXBhcmUgc2F2ZWQgc291cmNlJywgKGRyYWZ0KSA9PiB7XG4gICAgICBPYmplY3Qua2V5cyhkcmFmdCkuZm9yRWFjaCgoa2V5KSA9PiBkZWxldGUgZHJhZnRba2V5XSk7XG4gICAgICBPYmplY3QuYXNzaWduKGRyYWZ0LCBjbG9uZUFib3V0TmFycmF0aXZlRG9jdW1lbnQoc25hcHNob3QuYmFzZWxpbmVEb2N1bWVudCkpO1xuICAgIH0pO1xuICB9O1xuXG4gIHJldHVybiBjcmVhdGVQb3J0YWwoKFxuICAgIDxkaXZcbiAgICAgIGNsYXNzTmFtZT1cImFib3V0LWVkaXRvclwiXG4gICAgICBkYXRhLW1vYmlsZS1wYW5lPXttb2JpbGVQYW5lfVxuICAgICAgZGF0YS10aW1lbGluZS1vcGVuPXt0aW1lbGluZU9wZW4gPyAndHJ1ZScgOiAnZmFsc2UnfVxuICAgICAgcm9sZT1cInJlZ2lvblwiXG4gICAgICBhcmlhLWxhYmVsPVwiQWJvdXQgTmFycmF0aXZlIGNyZWF0aXZlIHRvb2xraXRcIlxuICAgID5cbiAgICAgIDxoZWFkZXIgY2xhc3NOYW1lPVwiYWJvdXQtZWRpdG9yLXRvcGJhclwiPlxuICAgICAgICA8YnV0dG9uIHR5cGU9XCJidXR0b25cIiBjbGFzc05hbWU9XCJhYm91dC1lZGl0b3ItYnJhbmRcIiBvbkNsaWNrPXsoKSA9PiBzdG9yZS5zZXRTZWxlY3Rpb24oeyB0eXBlOiAnc2VxdWVuY2UnIH0pfT48RGlhbW9uZCBhcmlhLWhpZGRlbj1cInRydWVcIiAvPjxzcGFuPkFib3V0IE5hcnJhdGl2ZTwvc3Bhbj48c21hbGw+Q3JlYXRpdmUgdG9vbGtpdDwvc21hbGw+PC9idXR0b24+XG4gICAgICAgIDxUcmFuc3BvcnQgc3RvcmU9e3N0b3JlfSBzbmFwc2hvdD17c25hcHNob3R9IC8+XG4gICAgICAgIDxkaXYgY2xhc3NOYW1lPVwiYWJvdXQtZWRpdG9yLWFjdGlvbnNcIj5cbiAgICAgICAgICA8YnV0dG9uIHR5cGU9XCJidXR0b25cIiBkaXNhYmxlZD17IXNuYXBzaG90Lmhpc3RvcnkuY2FuVW5kb30gdGl0bGU9e3NuYXBzaG90Lmhpc3RvcnkudW5kb0xhYmVsIHx8ICdVbmRvJ30gYXJpYS1sYWJlbD1cIlVuZG9cIiBvbkNsaWNrPXsoKSA9PiBzdG9yZS51bmRvKCl9PjxzcGFuIGFyaWEtaGlkZGVuPVwidHJ1ZVwiPuKGtjwvc3Bhbj48L2J1dHRvbj5cbiAgICAgICAgICA8YnV0dG9uIHR5cGU9XCJidXR0b25cIiBkaXNhYmxlZD17IXNuYXBzaG90Lmhpc3RvcnkuY2FuUmVkb30gdGl0bGU9e3NuYXBzaG90Lmhpc3RvcnkucmVkb0xhYmVsIHx8ICdSZWRvJ30gYXJpYS1sYWJlbD1cIlJlZG9cIiBvbkNsaWNrPXsoKSA9PiBzdG9yZS5yZWRvKCl9PjxzcGFuIGFyaWEtaGlkZGVuPVwidHJ1ZVwiPuKGtzwvc3Bhbj48L2J1dHRvbj5cbiAgICAgICAgICA8YnV0dG9uIHR5cGU9XCJidXR0b25cIiBjbGFzc05hbWU9e3BhdGhWaXNpYmxlID8gJ2lzLWFjdGl2ZScgOiAnJ30gb25DbGljaz17KCkgPT4gc2V0UGF0aFZpc2libGUoIXBhdGhWaXNpYmxlKX0+UGF0aDwvYnV0dG9uPlxuICAgICAgICAgIDxidXR0b24gdHlwZT1cImJ1dHRvblwiIGNsYXNzTmFtZT17ZGlyZWN0b3JWaWV3ID8gJ2lzLWFjdGl2ZScgOiAnJ30gb25DbGljaz17dG9nZ2xlRGlyZWN0b3J9PntkaXJlY3RvclZpZXcgPyAnRGlyZWN0b3InIDogJ0NhbWVyYSd9PC9idXR0b24+XG4gICAgICAgICAgPGJ1dHRvbiB0eXBlPVwiYnV0dG9uXCIgY2xhc3NOYW1lPXtzbmFwc2hvdC50cnlTdGF0ZT8ubGFiZWwgPT09ICdDb21wYXJlIHNhdmVkIHNvdXJjZScgPyAnaXMtYWN0aXZlJyA6ICcnfSBkaXNhYmxlZD17c25hcHNob3QudHJ5U3RhdGUgJiYgc25hcHNob3QudHJ5U3RhdGUubGFiZWwgIT09ICdDb21wYXJlIHNhdmVkIHNvdXJjZSd9IG9uQ2xpY2s9e3RvZ2dsZUJlZm9yZX0+e3NuYXBzaG90LnRyeVN0YXRlPy5sYWJlbCA9PT0gJ0NvbXBhcmUgc2F2ZWQgc291cmNlJyA/ICdCZWZvcmUnIDogJ0FmdGVyJ308L2J1dHRvbj5cbiAgICAgICAgICA8ZGV0YWlscyBjbGFzc05hbWU9XCJhYm91dC1lZGl0b3ItbW9yZVwiPlxuICAgICAgICAgICAgPHN1bW1hcnk+TW9yZTwvc3VtbWFyeT5cbiAgICAgICAgICAgIDxkaXY+XG4gICAgICAgICAgICAgIDxidXR0b24gdHlwZT1cImJ1dHRvblwiIG9uQ2xpY2s9e2FkZENoZWNrcG9pbnR9PkNoZWNrcG9pbnQ8L2J1dHRvbj5cbiAgICAgICAgICAgICAgPGJ1dHRvbiB0eXBlPVwiYnV0dG9uXCIgb25DbGljaz17KCkgPT4gZXhwb3J0QWJvdXROYXJyYXRpdmVEb2N1bWVudChzbmFwc2hvdC5kb2N1bWVudCl9PkV4cG9ydCBKU09OPC9idXR0b24+XG4gICAgICAgICAgICAgIDxidXR0b24gdHlwZT1cImJ1dHRvblwiIG9uQ2xpY2s9eygpID0+IGltcG9ydFJlZi5jdXJyZW50Py5jbGljaygpfT5JbXBvcnQgSlNPTjwvYnV0dG9uPlxuICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgPC9kZXRhaWxzPlxuICAgICAgICAgIDxpbnB1dCByZWY9e2ltcG9ydFJlZn0gaGlkZGVuIHR5cGU9XCJmaWxlXCIgYWNjZXB0PVwiYXBwbGljYXRpb24vanNvblwiIG9uQ2hhbmdlPXthc3luYyAoZXZlbnQpID0+IHtcbiAgICAgICAgICAgIGNvbnN0IGZpbGUgPSBldmVudC50YXJnZXQuZmlsZXM/LlswXTtcbiAgICAgICAgICAgIGlmICghZmlsZSkgcmV0dXJuO1xuICAgICAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgICAgY29uc3QgaW1wb3J0ZWQgPSBKU09OLnBhcnNlKGF3YWl0IGZpbGUudGV4dCgpKTtcbiAgICAgICAgICAgICAgYXNzZXJ0VmFsaWRBYm91dE5hcnJhdGl2ZURvY3VtZW50KGltcG9ydGVkKTtcbiAgICAgICAgICAgICAgc3RvcmUucmVwbGFjZURvY3VtZW50KCdJbXBvcnQgZG9jdW1lbnQnLCBpbXBvcnRlZCk7XG4gICAgICAgICAgICB9IGNhdGNoIChlcnJvcikgeyBzdG9yZS5zZXRTYXZlU3RhdGUoeyBzdGF0dXM6ICdmYWlsZWQnLCBtZXNzYWdlOiBlcnJvci5tZXNzYWdlIH0pOyB9XG4gICAgICAgICAgICBldmVudC50YXJnZXQudmFsdWUgPSAnJztcbiAgICAgICAgICB9fSAvPlxuICAgICAgICAgIDxidXR0b24gdHlwZT1cImJ1dHRvblwiIGRhdGEtYWJvdXQtZWRpdG9yLXNhdmUgY2xhc3NOYW1lPVwiaXMtc2F2ZVwiIGRpc2FibGVkPXtzbmFwc2hvdC5zYXZlU3RhdGUuc3RhdHVzID09PSAnc2F2aW5nJ30gb25DbGljaz17c2F2ZX0+PHNwYW4+e3N0YXR1c0xhYmVsfTwvc3Bhbj48a2JkPuKMmFM8L2tiZD48L2J1dHRvbj5cbiAgICAgICAgPC9kaXY+XG4gICAgICA8L2hlYWRlcj5cblxuICAgICAge3NuYXBzaG90LnJlY292ZXJ5U3RhdGUuYXZhaWxhYmxlID8gPGRpdiBjbGFzc05hbWU9XCJhYm91dC1lZGl0b3ItcmVjb3ZlcnlcIj48c3Bhbj5BbiB1bnNhdmVkIGRyYWZ0IGZyb20ge25ldyBEYXRlKHNuYXBzaG90LnJlY292ZXJ5U3RhdGUuZHJhZnQudGltZXN0YW1wKS50b0xvY2FsZVN0cmluZygpfSBpcyBhdmFpbGFibGUuPC9zcGFuPjxidXR0b24gdHlwZT1cImJ1dHRvblwiIG9uQ2xpY2s9eygpID0+IHsgc3RvcmUucmVwbGFjZURvY3VtZW50KCdSZWNvdmVyIGRyYWZ0Jywgc25hcHNob3QucmVjb3ZlcnlTdGF0ZS5kcmFmdC5kb2N1bWVudCk7IHN0b3JlLnNldFJlY292ZXJ5U3RhdGUoeyBhdmFpbGFibGU6IGZhbHNlIH0pOyB9fT5SZWNvdmVyIGFzIHVuc2F2ZWQgY29weTwvYnV0dG9uPjxidXR0b24gdHlwZT1cImJ1dHRvblwiIG9uQ2xpY2s9eygpID0+IHsgZXhwb3J0QWJvdXROYXJyYXRpdmVEb2N1bWVudChzbmFwc2hvdC5yZWNvdmVyeVN0YXRlLmRyYWZ0LmRvY3VtZW50LCAnY29udGVudHMtYWJvdXQtcmVjb3ZlcmVkLmpzb24nKTsgfX0+RXhwb3J0PC9idXR0b24+PGJ1dHRvbiB0eXBlPVwiYnV0dG9uXCIgb25DbGljaz17KCkgPT4geyBjbGVhckFib3V0TmFycmF0aXZlUmVjb3ZlcnlEcmFmdCgpOyBzdG9yZS5zZXRSZWNvdmVyeVN0YXRlKHsgYXZhaWxhYmxlOiBmYWxzZSB9KTsgfX0+RGlzY2FyZDwvYnV0dG9uPjwvZGl2PiA6IG51bGx9XG4gICAgICB7c25hcHNob3Quc2F2ZVN0YXRlLm1lc3NhZ2UgPyA8ZGl2IGNsYXNzTmFtZT17YGFib3V0LWVkaXRvci1zYXZlLW1lc3NhZ2UgaXMtJHtzbmFwc2hvdC5zYXZlU3RhdGUuc3RhdHVzfWB9PntzbmFwc2hvdC5zYXZlU3RhdGUubWVzc2FnZX08YnV0dG9uIHR5cGU9XCJidXR0b25cIiBhcmlhLWxhYmVsPVwiRGlzbWlzcyBtZXNzYWdlXCIgb25DbGljaz17KCkgPT4gc3RvcmUuc2V0U2F2ZVN0YXRlKHsgbWVzc2FnZTogJycgfSl9PsOXPC9idXR0b24+PC9kaXY+IDogbnVsbH1cblxuICAgICAge3BhdGhWaXNpYmxlID8gPENhbWVyYVBhdGhPdmVybGF5IHNuYXBzaG90PXtzbmFwc2hvdH0gLz4gOiBudWxsfVxuICAgICAge2RpcmVjdG9yVmlldyA/IDxkaXYgY2xhc3NOYW1lPVwiYWJvdXQtZWRpdG9yLWRpcmVjdG9yLWNvbnRyb2xzXCI+PHN0cm9uZz5EaXJlY3RvciBWaWV3PC9zdHJvbmc+PGJ1dHRvbiB0eXBlPVwiYnV0dG9uXCIgb25DbGljaz17KCkgPT4gcnVudGltZVJlZi5jdXJyZW50Py5udWRnZURpcmVjdG9yPy4oeyB5YXc6IC0wLjA4IH0pfT7ihpA8L2J1dHRvbj48YnV0dG9uIHR5cGU9XCJidXR0b25cIiBvbkNsaWNrPXsoKSA9PiBydW50aW1lUmVmLmN1cnJlbnQ/Lm51ZGdlRGlyZWN0b3I/Lih7IHBpdGNoOiAwLjA4IH0pfT7ihpE8L2J1dHRvbj48YnV0dG9uIHR5cGU9XCJidXR0b25cIiBvbkNsaWNrPXsoKSA9PiBydW50aW1lUmVmLmN1cnJlbnQ/Lm51ZGdlRGlyZWN0b3I/Lih7IHBpdGNoOiAtMC4wOCB9KX0+4oaTPC9idXR0b24+PGJ1dHRvbiB0eXBlPVwiYnV0dG9uXCIgb25DbGljaz17KCkgPT4gcnVudGltZVJlZi5jdXJyZW50Py5udWRnZURpcmVjdG9yPy4oeyB5YXc6IDAuMDggfSl9PuKGkjwvYnV0dG9uPjxidXR0b24gdHlwZT1cImJ1dHRvblwiIG9uQ2xpY2s9eygpID0+IHJ1bnRpbWVSZWYuY3VycmVudD8ubnVkZ2VEaXJlY3Rvcj8uKHsgZGlzdGFuY2U6IC0wLjIgfSl9Pu+8izwvYnV0dG9uPjxidXR0b24gdHlwZT1cImJ1dHRvblwiIG9uQ2xpY2s9eygpID0+IHJ1bnRpbWVSZWYuY3VycmVudD8ubnVkZ2VEaXJlY3Rvcj8uKHsgZGlzdGFuY2U6IDAuMiB9KX0+4oiSPC9idXR0b24+PGJ1dHRvbiB0eXBlPVwiYnV0dG9uXCIgb25DbGljaz17KCkgPT4gcnVudGltZVJlZi5jdXJyZW50Py5yZXNldERpcmVjdG9yPy4oKX0+UmVzZXQ8L2J1dHRvbj48c21hbGw+VGVtcG9yYXJ5IGluc3BlY3Rpb24gb25seS4gUHVibGlzaGVkIENhbWVyYSBrZXlzIGFyZSB1bmNoYW5nZWQuPC9zbWFsbD48L2Rpdj4gOiBudWxsfVxuXG4gICAgICA8SW5zcGVjdG9yIHN0b3JlPXtzdG9yZX0gc25hcHNob3Q9e3NuYXBzaG90fSB0aW1lbGluZU9wZW49e3RpbWVsaW5lT3Blbn0gcnVudGltZU1ldHJpY3M9e3J1bnRpbWVNZXRyaWNzfSBjbGlwYm9hcmQ9e2NsaXBib2FyZH0gc2V0Q2xpcGJvYXJkPXtzZXRDbGlwYm9hcmR9IC8+XG4gICAgICA8YnV0dG9uXG4gICAgICAgIHR5cGU9XCJidXR0b25cIlxuICAgICAgICBjbGFzc05hbWU9XCJhYm91dC1lZGl0b3ItdGltZWxpbmUtdG9nZ2xlXCJcbiAgICAgICAgYXJpYS1jb250cm9scz1cImFib3V0LWVkaXRvci10aW1lbGluZS1wYW5lbFwiXG4gICAgICAgIGFyaWEtZXhwYW5kZWQ9e3RpbWVsaW5lT3Blbn1cbiAgICAgICAgdGl0bGU9e3RpbWVsaW5lT3BlbiA/ICdIaWRlIHRpbWVsaW5lJyA6ICdTaG93IHRpbWVsaW5lJ31cbiAgICAgICAgb25DbGljaz17KCkgPT4gc2V0VGltZWxpbmVPcGVuKChvcGVuKSA9PiAhb3Blbil9XG4gICAgICA+e3RpbWVsaW5lT3BlbiA/IDxDaGV2cm9uRG93biBhcmlhLWhpZGRlbj1cInRydWVcIiAvPiA6IDxDaGV2cm9uVXAgYXJpYS1oaWRkZW49XCJ0cnVlXCIgLz59PHNwYW4+e3RpbWVsaW5lT3BlbiA/ICdIaWRlIHRpbWVsaW5lJyA6ICdTaG93IHRpbWVsaW5lJ308L3NwYW4+PC9idXR0b24+XG4gICAgICA8ZGl2IGlkPVwiYWJvdXQtZWRpdG9yLXRpbWVsaW5lLXBhbmVsXCIgY2xhc3NOYW1lPVwiYWJvdXQtZWRpdG9yLWJvdHRvbVwiIGFyaWEtaGlkZGVuPXshdGltZWxpbmVPcGVufT5cbiAgICAgICAgPGRpdiBjbGFzc05hbWU9XCJhYm91dC1lZGl0b3ItY29udGV4dGJhclwiPlxuICAgICAgICAgIDxzcGFuPjxzdHJvbmc+e3NlbGVjdGVkPy5sYWJlbCB8fCAnU2VxdWVuY2UnfTwvc3Ryb25nPiB7c2VsZWN0ZWQgPyBgJHtzZWxlY3RlZC50eXBlfSDCtyAke2Zvcm1hdFdVKE1hdGgubWF4KDAsIHNlbGVjdGVkRXh0ZW50IC0gMSkpfSBzY3JvbGwgwrcgJHtmb3JtYXRXVShzZWxlY3RlZEV4dGVudCl9IHRvdGFsJHtyZXNvbHZlZEV4dGVudCA+IHNlbGVjdGVkRXh0ZW50ICsgMC4wMDEgPyBgIMK3ICR7Zm9ybWF0V1UocmVzb2x2ZWRFeHRlbnQpfSByZXNvbHZlZGAgOiAnJ31gIDogJyd9PC9zcGFuPlxuICAgICAgICAgIHtzZWxlY3RlZEN1ZUNvdW50ID4gMSA/IDxzcGFuIGNsYXNzTmFtZT1cImFib3V0LWVkaXRvci1zZWxlY3Rpb24tY291bnRcIj57c2VsZWN0ZWRDdWVDb3VudH0gdGl0bGVzIHNlbGVjdGVkPC9zcGFuPiA6IG51bGx9XG4gICAgICAgICAgPHNwYW4+e3NuYXBzaG90LmF1dG9LZXkgPyAnQXV0by1rZXkgYXJtZWQnIDogJ0F1dG8ta2V5IG9mZid9PC9zcGFuPlxuICAgICAgICAgIDxidXR0b24gdHlwZT1cImJ1dHRvblwiIGNsYXNzTmFtZT17c25hcHNob3QuYXV0b0tleSA/ICdpcy1hY3RpdmUnIDogJyd9IG9uQ2xpY2s9eygpID0+IHN0b3JlLnNldEF1dG9LZXkoIXNuYXBzaG90LmF1dG9LZXkpfT7il4YgQXV0by1rZXk8L2J1dHRvbj5cbiAgICAgICAgICA8YnV0dG9uIHR5cGU9XCJidXR0b25cIiBjbGFzc05hbWU9e2xvb3BBY3RpdmUgPyAnaXMtYWN0aXZlJyA6ICcnfSBvbkNsaWNrPXt0b2dnbGVMb29wfT57bG9vcEFjdGl2ZSA/ICdTdG9wIGF1ZGl0aW9uJyA6ICdMb29wIFNlY3Rpb24nfTwvYnV0dG9uPlxuICAgICAgICAgIDxidXR0b24gdHlwZT1cImJ1dHRvblwiIG9uQ2xpY2s9e2ZpdFNlcXVlbmNlfT5GaXQgc2VxdWVuY2U8L2J1dHRvbj5cbiAgICAgICAgICA8YnV0dG9uIHR5cGU9XCJidXR0b25cIiBkaXNhYmxlZD17IWNvbXBpbGVkU2VsZWN0ZWR9IG9uQ2xpY2s9e2ZpdFNlY3Rpb259PkZpdCBTZWN0aW9uPC9idXR0b24+XG4gICAgICAgICAge1snY2FtZXJhJywgJ3dvcmxkJywgJ3RleHQnXS5tYXAoKHRyYWNrKSA9PiA8YnV0dG9uIHR5cGU9XCJidXR0b25cIiBrZXk9e3RyYWNrfSBjbGFzc05hbWU9e3NuYXBzaG90LnRyYW5zcG9ydC5zb2xvVHJhY2sgPT09IHRyYWNrID8gJ2lzLWFjdGl2ZScgOiAnJ30gb25DbGljaz17KCkgPT4gdG9nZ2xlU29sbyh0cmFjayl9PlNvbG8ge3RyYWNrfTwvYnV0dG9uPil9XG4gICAgICAgICAge3RpbWVsaW5lRGVsZXRpb24gPyA8YnV0dG9uIHR5cGU9XCJidXR0b25cIiBjbGFzc05hbWU9XCJhYm91dC1lZGl0b3ItZGVsZXRlLWtleVwiIGRpc2FibGVkPXt0aW1lbGluZURlbGV0aW9uLmRpc2FibGVkfSB0aXRsZT17dGltZWxpbmVEZWxldGlvbi5tZXNzYWdlIHx8IGAke3RpbWVsaW5lRGVsZXRpb24ubGFiZWx9IMK3IERlbGV0ZS9CYWNrc3BhY2VgfSBvbkNsaWNrPXsoKSA9PiBkZWxldGVUaW1lbGluZVNlbGVjdGlvbihzdG9yZSwgc25hcHNob3QpfT48VHJhc2gyIGFyaWEtaGlkZGVuPVwidHJ1ZVwiIC8+e3RpbWVsaW5lRGVsZXRpb24ubGFiZWx9PC9idXR0b24+IDogbnVsbH1cbiAgICAgICAgICB7cnVudGltZU1ldHJpY3MgPyA8c3BhbiBjbGFzc05hbWU9XCJhYm91dC1lZGl0b3ItaHVkXCI+e3J1bnRpbWVNZXRyaWNzLmZyYW1lVGltZU1zLnRvRml4ZWQoMil9bXMgwrcge3J1bnRpbWVNZXRyaWNzLmRyYXdDYWxsc30gZHJhdyDCtyB7cnVudGltZU1ldHJpY3MucG9pbnRDb3VudC50b0xvY2FsZVN0cmluZygpfSBwdHMgwrcge3J1bnRpbWVNZXRyaWNzLmFjdGl2ZU1vZGlmaWVyc30gbW9kaWZpZXJzIMK3IHtydW50aW1lTWV0cmljcy5idWZmZXJSZWJ1aWxkc30gcmVidWlsZHM8L3NwYW4+IDogbnVsbH1cbiAgICAgICAgICB7Y2hlY2twb2ludHMubGVuZ3RoID8gPHNlbGVjdCBhcmlhLWxhYmVsPVwiUmVzdG9yZSBjaGVja3BvaW50XCIgZGVmYXVsdFZhbHVlPVwiXCIgb25DaGFuZ2U9eyhldmVudCkgPT4geyBjb25zdCBmb3VuZCA9IGNoZWNrcG9pbnRzLmZpbmQoKGl0ZW0pID0+IGl0ZW0uaWQgPT09IGV2ZW50LnRhcmdldC52YWx1ZSk7IGlmIChmb3VuZCkgeyBzdG9yZS5yZXBsYWNlRG9jdW1lbnQoYFJlc3RvcmUgJHtmb3VuZC5uYW1lfWAsIGZvdW5kLmRvY3VtZW50KTsgc3RvcmUuc2V0VHJhbnNwb3J0KHsgb3duZXI6ICd0aW1lbGluZScsIHN0b3J5V1U6IGZvdW5kLnN0b3J5V1UsIHBsYXlpbmc6IGZhbHNlIH0pOyB9IGV2ZW50LnRhcmdldC52YWx1ZSA9ICcnOyB9fT48b3B0aW9uIHZhbHVlPVwiXCI+Q2hlY2twb2ludHMgKHtjaGVja3BvaW50cy5sZW5ndGh9KTwvb3B0aW9uPntjaGVja3BvaW50cy5tYXAoKGl0ZW0pID0+IDxvcHRpb24gdmFsdWU9e2l0ZW0uaWR9IGtleT17aXRlbS5pZH0+e2l0ZW0ubmFtZX08L29wdGlvbj4pfTwvc2VsZWN0PiA6IG51bGx9XG4gICAgICAgIDwvZGl2PlxuICAgICAgICA8VGltZWxpbmUgc3RvcmU9e3N0b3JlfSBzbmFwc2hvdD17c25hcHNob3R9IC8+XG4gICAgICA8L2Rpdj5cbiAgICAgIDxuYXYgY2xhc3NOYW1lPVwiYWJvdXQtZWRpdG9yLW1vYmlsZS10YWJzXCIgYXJpYS1sYWJlbD1cIkVkaXRvciBwYW5lbFwiPjxidXR0b24gdHlwZT1cImJ1dHRvblwiIGNsYXNzTmFtZT17bW9iaWxlUGFuZSA9PT0gJ3NlcXVlbmNlJyA/ICdpcy1hY3RpdmUnIDogJyd9IG9uQ2xpY2s9eygpID0+IHNldE1vYmlsZVBhbmUoJ3NlcXVlbmNlJyl9PlNlcXVlbmNlPC9idXR0b24+PGJ1dHRvbiB0eXBlPVwiYnV0dG9uXCIgY2xhc3NOYW1lPXttb2JpbGVQYW5lID09PSAnaW5zcGVjdCcgPyAnaXMtYWN0aXZlJyA6ICcnfSBvbkNsaWNrPXsoKSA9PiBzZXRNb2JpbGVQYW5lKCdpbnNwZWN0Jyl9Pkluc3BlY3Q8L2J1dHRvbj48YnV0dG9uIHR5cGU9XCJidXR0b25cIiBjbGFzc05hbWU9e21vYmlsZVBhbmUgPT09ICdwcmV2aWV3JyA/ICdpcy1hY3RpdmUnIDogJyd9IG9uQ2xpY2s9eygpID0+IHNldE1vYmlsZVBhbmUoJ3ByZXZpZXcnKX0+UHJldmlldzwvYnV0dG9uPjwvbmF2PlxuICAgIDwvZGl2PlxuICApLCBkb2N1bWVudC5ib2R5KTtcbn1cbiJdLCJmaWxlIjoiL1VzZXJzL2FsZXhhbmRlcmJlY2svUHJvamVjdHMtY29kZS9BbGV4YW5kZXIgQmVjayBTdHVkaW8gV2Vic2l0ZS9yZWFjdC1hcHAvYXBwL3NyYy9yb3V0ZXMvYWJvdXQtbmFycmF0aXZlLWxhYi9BYm91dE5hcnJhdGl2ZUVkaXRvci5qc3gifQ==