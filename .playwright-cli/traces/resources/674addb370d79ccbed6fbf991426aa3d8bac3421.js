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
} from "/src/routes/about-narrative-lab/aboutNarrativeCompiler.js";
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
} from "/src/routes/about-narrative-lab/aboutNarrativeTimeline.js";
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
  const selected = snapshot.selection.type === "sequence" ? null : getSection(snapshot.document, snapshot.selection);
  const sectionIndex = getSectionIndex(snapshot.document, selected.id);
  const jumpSection = (direction) => {
    const next = snapshot.compiledPlan.sections[Math.max(0, Math.min(snapshot.compiledPlan.sections.length - 1, sectionIndex + direction))];
    if (next) seek(next.startWU);
  };
  return /* @__PURE__ */ jsxDEV("div", { className: "about-editor-transport", children: [
    /* @__PURE__ */ jsxDEV("button", { type: "button", title: "Previous Section", "aria-label": "Previous Section", onClick: () => jumpSection(-1), children: /* @__PURE__ */ jsxDEV(SkipBack, { "aria-hidden": "true" }, void 0, false, {
      fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
      lineNumber: 424,
      columnNumber: 116
    }, this) }, void 0, false, {
      fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
      lineNumber: 424,
      columnNumber: 7
    }, this),
    /* @__PURE__ */ jsxDEV("button", { type: "button", title: "Previous keyframe · Left arrow", "aria-label": "Previous keyframe", onClick: () => jumpTimelineKeyframe(store, snapshot, -1), children: /* @__PURE__ */ jsxDEV(ChevronLeft, { "aria-hidden": "true" }, void 0, false, {
      fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
      lineNumber: 425,
      columnNumber: 157
    }, this) }, void 0, false, {
      fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
      lineNumber: 425,
      columnNumber: 7
    }, this),
    /* @__PURE__ */ jsxDEV("button", { type: "button", className: "is-primary", title: transport.playing ? "Pause" : "Play", "aria-label": transport.playing ? "Pause" : "Play", onClick: play, children: transport.playing ? /* @__PURE__ */ jsxDEV(Pause, { "aria-hidden": "true" }, void 0, false, {
      fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
      lineNumber: 427,
      columnNumber: 30
    }, this) : /* @__PURE__ */ jsxDEV(Play, { "aria-hidden": "true" }, void 0, false, {
      fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
      lineNumber: 427,
      columnNumber: 61
    }, this) }, void 0, false, {
      fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
      lineNumber: 426,
      columnNumber: 7
    }, this),
    /* @__PURE__ */ jsxDEV("button", { type: "button", title: "Next Section", "aria-label": "Next Section", onClick: () => jumpSection(1), children: /* @__PURE__ */ jsxDEV(SkipForward, { "aria-hidden": "true" }, void 0, false, {
      fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
      lineNumber: 429,
      columnNumber: 107
    }, this) }, void 0, false, {
      fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
      lineNumber: 429,
      columnNumber: 7
    }, this),
    /* @__PURE__ */ jsxDEV("button", { type: "button", title: "Next keyframe · Right arrow", "aria-label": "Next keyframe", onClick: () => jumpTimelineKeyframe(store, snapshot, 1), children: /* @__PURE__ */ jsxDEV(ChevronRight, { "aria-hidden": "true" }, void 0, false, {
      fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
      lineNumber: 430,
      columnNumber: 149
    }, this) }, void 0, false, {
      fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
      lineNumber: 430,
      columnNumber: 7
    }, this),
    /* @__PURE__ */ jsxDEV("output", { children: formatWU(transport.storyWU) }, void 0, false, {
      fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
      lineNumber: 431,
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
        lineNumber: 432,
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
        lineNumber: 441,
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
        lineNumber: 446,
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
            lineNumber: 456,
            columnNumber: 9
          }, this),
          /* @__PURE__ */ jsxDEV("option", { value: "mobile", children: "Mobile" }, void 0, false, {
            fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
            lineNumber: 457,
            columnNumber: 9
          }, this),
          /* @__PURE__ */ jsxDEV("option", { value: "reduced-motion", children: "Reduced motion" }, void 0, false, {
            fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
            lineNumber: 458,
            columnNumber: 9
          }, this)
        ]
      },
      void 0,
      true,
      {
        fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
        lineNumber: 451,
        columnNumber: 7
      },
      this
    )
  ] }, void 0, true, {
    fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
    lineNumber: 423,
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
          lineNumber: 833,
          columnNumber: 9
        },
        this
      ) : /* @__PURE__ */ jsxDEV("span", { children: track.label }, track.lane, false, {
        fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
        lineNumber: 842,
        columnNumber: 9
      }, this)
    ) }, void 0, false, {
      fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
      lineNumber: 830,
      columnNumber: 7
    }, this),
    /* @__PURE__ */ jsxDEV("div", { ref: lanesRef, className: "about-editor-lanes", "data-solo-track": transport.soloTrack || "", onWheel: zoomTimeline, children: /* @__PURE__ */ jsxDEV("div", { className: "about-editor-timeline-canvas", style: { "--about-editor-playhead": playhead, "--about-editor-timeline-zoom": Math.max(1, Number(transport.zoom) || 1) }, children: [
      /* @__PURE__ */ jsxDEV("div", { className: "about-editor-playhead" }, void 0, false, {
        fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
        lineNumber: 847,
        columnNumber: 11
      }, this),
      marquee ? /* @__PURE__ */ jsxDEV("div", { className: "about-editor-marquee", style: marquee, "aria-hidden": "true" }, void 0, false, {
        fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
        lineNumber: 848,
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
              lineNumber: 855,
              columnNumber: 13
            }, this),
            /* @__PURE__ */ jsxDEV("span", { children: cameraDragPreview.valid ? `${cameraDragPreview.sectionLabel} · ${formatCameraPercent(cameraDragPreview.at)}` : cameraDragPreview.reason }, void 0, false, {
              fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
              lineNumber: 856,
              columnNumber: 13
            }, this)
          ]
        },
        void 0,
        true,
        {
          fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
          lineNumber: 850,
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
                      lineNumber: 894,
                      columnNumber: 23
                    }, this),
                    section.label
                  ] }, void 0, true, {
                    fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
                    lineNumber: 893,
                    columnNumber: 21
                  }, this),
                  sectionResizePreview?.sectionId === section.id ? /* @__PURE__ */ jsxDEV("output", { children: [
                    formatWU(Math.max(0, resizeExtent - 1)),
                    " scroll · ",
                    formatWU(resizeExtent),
                    " total"
                  ] }, void 0, true, {
                    fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
                    lineNumber: 896,
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
                      lineNumber: 897,
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
                lineNumber: 887,
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
                    lineNumber: 921,
                    columnNumber: 27
                  },
                  this
                );
              }) }, void 0, false, {
                fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
                lineNumber: 915,
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
                    lineNumber: 936,
                    columnNumber: 25
                  },
                  this
                );
              })
            ] }, section.id, true, {
              fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
              lineNumber: 914,
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
                  lineNumber: 977,
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
                    lineNumber: 984,
                    columnNumber: 21
                  },
                  this
                )
              ) : null
            ] }, section.id, true, {
              fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
              lineNumber: 976,
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
                          lineNumber: 1067,
                          columnNumber: 27
                        }, this)
                      },
                      cue.id,
                      false,
                      {
                        fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
                        lineNumber: 1027,
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
                        lineNumber: 1078,
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
                    lineNumber: 1108,
                    columnNumber: 21
                  }, this) : null
                ]
              },
              section.id,
              true,
              {
                fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
                lineNumber: 999,
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
                lineNumber: 1119,
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
                lineNumber: 1126,
                columnNumber: 19
              },
              this
            ) : null
          ] }, section.id, true, {
            fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
            lineNumber: 1118,
            columnNumber: 17
          }, this);
        }) }, lane, false, {
          fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
          lineNumber: 860,
          columnNumber: 11
        }, this)
      )
    ] }, void 0, true, {
      fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
      lineNumber: 846,
      columnNumber: 9
    }, this) }, void 0, false, {
      fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
      lineNumber: 845,
      columnNumber: 7
    }, this)
  ] }, void 0, true, {
    fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
    lineNumber: 829,
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
  const requestedGroupIds = snapshot.selection.type === "sequence" ? snapshot.selection.groupIds || [] : [];
  const groups = requestedGroupIds.length ? ABOUT_NARRATIVE_GLOBAL_CONTROLS.filter((group) => requestedGroupIds.includes(group.id)) : ABOUT_NARRATIVE_GLOBAL_CONTROLS;
  const heading = snapshot.selection.trackLabel ? `${snapshot.selection.trackLabel} track` : "Sequence";
  return /* @__PURE__ */ jsxDEV(Fragment, { children: [
    /* @__PURE__ */ jsxDEV("header", { children: [
      /* @__PURE__ */ jsxDEV("span", { children: heading }, void 0, false, {
        fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
        lineNumber: 1165,
        columnNumber: 15
      }, this),
      /* @__PURE__ */ jsxDEV("strong", { children: "Global controls" }, void 0, false, {
        fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
        lineNumber: 1165,
        columnNumber: 37
      }, this)
    ] }, void 0, true, {
      fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
      lineNumber: 1165,
      columnNumber: 7
    }, this),
    groups.map(
      (group) => /* @__PURE__ */ jsxDEV("details", { open: true, "data-global-group": group.id, children: [
        /* @__PURE__ */ jsxDEV("summary", { children: group.label }, void 0, false, {
          fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
          lineNumber: 1168,
          columnNumber: 11
        }, this),
        group.id === "textMotion" ? /* @__PURE__ */ jsxDEV("p", { className: "about-editor-help", children: "Every title follows one continuous Y and Z path. Negative Y is higher; positive Y is lower. Travel duration changes the width of every Spatial title block in the Text timeline." }, void 0, false, {
          fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
          lineNumber: 1169,
          columnNumber: 40
        }, this) : null,
        group.id === "swarmTurbulence" ? /* @__PURE__ */ jsxDEV("p", { className: "about-editor-help", children: "One ambient motion profile drives both the cluster and turbulent field. Each World only scales its strength, so the motion stays continuous while Shapes change." }, void 0, false, {
          fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
          lineNumber: 1170,
          columnNumber: 45
        }, this) : null,
        group.controls.map((control) => {
          const target = group.id === "sequence" ? snapshot.document.globals : snapshot.document.globals[group.id === "material" ? "pointMaterial" : group.id];
          if (group.id === "textMotion" && control.id === "readableEnd") return null;
          if (group.id === "textMotion" && control.id === "readableStart") {
            return /* @__PURE__ */ jsxDEV(
              RangeProperty,
              {
                label: "Clear window",
                start: target.readableStart,
                end: target.readableEnd,
                min: control.min,
                max: control.max,
                step: control.step,
                onStartChange: (value) => commitGlobal(group.id, "readableStart", value),
                onEndChange: (value) => commitGlobal(group.id, "readableEnd", value),
                hint: "The title is fully clear inside this part of its own travel. Outside it, blur and opacity build toward the ends."
              },
              "clearWindow",
              false,
              {
                fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
                lineNumber: 1178,
                columnNumber: 15
              },
              this
            );
          }
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
              lineNumber: 1193,
              columnNumber: 13
            },
            this
          );
        }),
        group.id === "textMotion" ? /* @__PURE__ */ jsxDEV("p", { className: "about-editor-help about-editor-depth-help", children: [
          /* @__PURE__ */ jsxDEV("strong", { children: "Depth moves; blur softens." }, void 0, false, {
            fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
            lineNumber: 1205,
            columnNumber: 97
          }, this),
          " Entry depth starts behind the screen on −Z and Exit depth finishes toward you on +Z. Perspective controls how strongly that Z travel changes apparent size; Maximum blur only changes sharpness."
        ] }, void 0, true, {
          fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
          lineNumber: 1205,
          columnNumber: 40
        }, this) : null
      ] }, group.id, true, {
        fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
        lineNumber: 1167,
        columnNumber: 7
      }, this)
    )
  ] }, void 0, true, {
    fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
    lineNumber: 1164,
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
        lineNumber: 1243,
        columnNumber: 15
      }, this),
      /* @__PURE__ */ jsxDEV("strong", { children: section.label }, void 0, false, {
        fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
        lineNumber: 1243,
        columnNumber: 79
      }, this)
    ] }, void 0, true, {
      fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
      lineNumber: 1243,
      columnNumber: 7
    }, this),
    section.locked ? /* @__PURE__ */ jsxDEV("div", { className: "about-editor-lock", children: [
      /* @__PURE__ */ jsxDEV(LockKeyhole, { "aria-hidden": "true" }, void 0, false, {
        fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
        lineNumber: 1244,
        columnNumber: 60
      }, this),
      /* @__PURE__ */ jsxDEV("span", { children: "This protected Section cannot be reordered or have its World replaced accidentally." }, void 0, false, {
        fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
        lineNumber: 1244,
        columnNumber: 94
      }, this),
      /* @__PURE__ */ jsxDEV("button", { type: "button", onClick: () => update("Unlock protected Section", (draft) => {
        draft.locked = false;
      }), children: "Unlock advanced" }, void 0, false, {
        fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
        lineNumber: 1244,
        columnNumber: 190
      }, this)
    ] }, void 0, true, {
      fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
      lineNumber: 1244,
      columnNumber: 25
    }, this) : null,
    /* @__PURE__ */ jsxDEV("div", { className: "about-editor-inline-actions", children: [
      /* @__PURE__ */ jsxDEV("button", { type: "button", disabled: section.locked || sectionIndex === 0, onClick: () => move(-1), children: "Move earlier" }, void 0, false, {
        fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
        lineNumber: 1246,
        columnNumber: 9
      }, this),
      /* @__PURE__ */ jsxDEV("button", { type: "button", disabled: section.locked || sectionIndex === snapshot.document.sections.length - 1, onClick: () => move(1), children: "Move later" }, void 0, false, {
        fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
        lineNumber: 1247,
        columnNumber: 9
      }, this),
      /* @__PURE__ */ jsxDEV("button", { type: "button", disabled: section.locked || section.type === "finale", onClick: duplicate, children: "Duplicate" }, void 0, false, {
        fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
        lineNumber: 1248,
        columnNumber: 9
      }, this)
    ] }, void 0, true, {
      fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
      lineNumber: 1245,
      columnNumber: 7
    }, this),
    /* @__PURE__ */ jsxDEV(Property, { label: "Section name", children: /* @__PURE__ */ jsxDEV("input", { value: section.label, onChange: (event) => update("Rename Section", (draft) => {
      draft.label = event.target.value;
    }, `section:${section.id}:label`) }, void 0, false, {
      fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
      lineNumber: 1250,
      columnNumber: 38
    }, this) }, void 0, false, {
      fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
      lineNumber: 1250,
      columnNumber: 7
    }, this),
    /* @__PURE__ */ jsxDEV(Property, { label: "Stable ID", children: [
      /* @__PURE__ */ jsxDEV("input", { value: section.id, readOnly: true }, void 0, false, {
        fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
        lineNumber: 1251,
        columnNumber: 35
      }, this),
      /* @__PURE__ */ jsxDEV("small", { children: "References this Section without tying it to its current meaning." }, void 0, false, {
        fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
        lineNumber: 1251,
        columnNumber: 72
      }, this)
    ] }, void 0, true, {
      fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
      lineNumber: 1251,
      columnNumber: 7
    }, this),
    /* @__PURE__ */ jsxDEV(Property, { label: "Type", children: /* @__PURE__ */ jsxDEV("select", { value: section.type, disabled: section.type === "finale", onChange: (event) => update("Change Section type", (draft) => {
      draft.type = event.target.value;
    }), children: [
      /* @__PURE__ */ jsxDEV("option", { value: "spatial", children: "Spatial" }, void 0, false, {
        fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
        lineNumber: 1254,
        columnNumber: 11
      }, this),
      /* @__PURE__ */ jsxDEV("option", { value: "editorial", children: "Editorial" }, void 0, false, {
        fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
        lineNumber: 1254,
        columnNumber: 51
      }, this),
      /* @__PURE__ */ jsxDEV("option", { value: "finale", children: "Finale" }, void 0, false, {
        fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
        lineNumber: 1254,
        columnNumber: 95
      }, this)
    ] }, void 0, true, {
      fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
      lineNumber: 1253,
      columnNumber: 9
    }, this) }, void 0, false, {
      fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
      lineNumber: 1252,
      columnNumber: 7
    }, this),
    /* @__PURE__ */ jsxDEV("details", { open: true, children: [
      /* @__PURE__ */ jsxDEV("summary", { children: "Section timing" }, void 0, false, {
        fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
        lineNumber: 1258,
        columnNumber: 9
      }, this),
      /* @__PURE__ */ jsxDEV(Property, { label: "Scroll travel", children: /* @__PURE__ */ jsxDEV("output", { className: "about-editor-readout", children: formatWU(Math.max(0, activeExtent - 1)) }, void 0, false, {
        fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
        lineNumber: 1259,
        columnNumber: 41
      }, this) }, void 0, false, {
        fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
        lineNumber: 1259,
        columnNumber: 9
      }, this),
      /* @__PURE__ */ jsxDEV(Property, { label: "Total height", children: /* @__PURE__ */ jsxDEV("output", { className: "about-editor-readout", children: formatWU(activeExtent) }, void 0, false, {
        fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
        lineNumber: 1260,
        columnNumber: 40
      }, this) }, void 0, false, {
        fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
        lineNumber: 1260,
        columnNumber: 9
      }, this),
      /* @__PURE__ */ jsxDEV(NumberProperty, { label: "Desktop length", value: section.extentWU, min: 1, max: 8, step: 0.05, unit: "WU", onChange: (value) => update("Change desktop Section length", (draft) => {
        draft.extentWU = value;
      }, `section:${section.id}:extent`) }, void 0, false, {
        fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
        lineNumber: 1261,
        columnNumber: 9
      }, this),
      /* @__PURE__ */ jsxDEV(NumberProperty, { label: "Mobile length", value: section.mobileExtentWU, min: 1, max: 8, step: 0.05, unit: "WU", onChange: (value) => update("Change mobile Section length", (draft) => {
        draft.mobileExtentWU = value;
      }, `section:${section.id}:mobile`) }, void 0, false, {
        fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
        lineNumber: 1262,
        columnNumber: 9
      }, this),
      /* @__PURE__ */ jsxDEV(Property, { label: "Resolved height", children: /* @__PURE__ */ jsxDEV("output", { className: "about-editor-readout", children: formatWU(resolvedExtent) }, void 0, false, {
        fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
        lineNumber: 1263,
        columnNumber: 43
      }, this) }, void 0, false, {
        fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
        lineNumber: 1263,
        columnNumber: 9
      }, this),
      contentMinimumActive ? /* @__PURE__ */ jsxDEV("p", { className: "about-editor-timing-warning", children: [
        "Content minimum in effect. The rendered copy needs ",
        formatWU(resolvedExtent),
        " in this profile."
      ] }, void 0, true, {
        fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
        lineNumber: 1264,
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
          lineNumber: 1265,
          columnNumber: 9
        },
        this
      )
    ] }, void 0, true, {
      fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
      lineNumber: 1257,
      columnNumber: 7
    }, this),
    section.type === "editorial" ? /* @__PURE__ */ jsxDEV(EditorialBlocks, { store, snapshot, section }, void 0, false, {
      fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
      lineNumber: 1272,
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
        lineNumber: 1274,
        columnNumber: 7
      },
      this
    ) : null
  ] }, void 0, true, {
    fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
    lineNumber: 1242,
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
      lineNumber: 1312,
      columnNumber: 7
    }, this),
    (section.text.blocks || []).map(
      (block, blockIndex) => /* @__PURE__ */ jsxDEV("div", { className: "about-editor-block", children: [
        /* @__PURE__ */ jsxDEV("div", { children: [
          /* @__PURE__ */ jsxDEV("code", { children: block.kind }, void 0, false, {
            fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
            lineNumber: 1315,
            columnNumber: 16
          }, this),
          /* @__PURE__ */ jsxDEV("span", { children: block.id }, void 0, false, {
            fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
            lineNumber: 1315,
            columnNumber: 41
          }, this)
        ] }, void 0, true, {
          fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
          lineNumber: 1315,
          columnNumber: 11
        }, this),
        block.label != null ? /* @__PURE__ */ jsxDEV(Property, { label: "Label", children: /* @__PURE__ */ jsxDEV("input", { value: block.label, onChange: (event) => updateBlock(blockIndex, "label", event.target.value) }, void 0, false, {
          fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
          lineNumber: 1316,
          columnNumber: 58
        }, this) }, void 0, false, {
          fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
          lineNumber: 1316,
          columnNumber: 34
        }, this) : null,
        block.text != null ? /* @__PURE__ */ jsxDEV(Property, { label: "Copy", children: /* @__PURE__ */ jsxDEV("textarea", { rows: "5", value: block.text, onChange: (event) => updateBlock(blockIndex, "text", event.target.value) }, void 0, false, {
          fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
          lineNumber: 1317,
          columnNumber: 56
        }, this) }, void 0, false, {
          fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
          lineNumber: 1317,
          columnNumber: 33
        }, this) : null,
        block.kind === "prose" ? /* @__PURE__ */ jsxDEV(Property, { label: "Reconnect point grid", children: /* @__PURE__ */ jsxDEV("input", { type: "checkbox", checked: block.worldInfluence === true, onChange: (event) => updateBlock(blockIndex, "worldInfluence", event.target.checked) }, void 0, false, {
          fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
          lineNumber: 1318,
          columnNumber: 76
        }, this) }, void 0, false, {
          fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
          lineNumber: 1318,
          columnNumber: 37
        }, this) : null,
        block.text != null ? /* @__PURE__ */ jsxDEV("div", { className: "about-editor-emphasis-controls", children: [
          /* @__PURE__ */ jsxDEV("span", { children: "Highlighted words" }, void 0, false, {
            fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
            lineNumber: 1321,
            columnNumber: 15
          }, this),
          (block.emphasis || []).map(
            (item, emphasisIndex) => /* @__PURE__ */ jsxDEV("div", { className: "about-editor-emphasis-row", children: [
              /* @__PURE__ */ jsxDEV("input", { "aria-label": "Highlighted phrase", value: item.text, onChange: (event) => updateEmphasis(blockIndex, emphasisIndex, "text", event.target.value) }, void 0, false, {
                fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
                lineNumber: 1324,
                columnNumber: 19
              }, this),
              /* @__PURE__ */ jsxDEV("select", { "aria-label": "Highlight colour", value: item.tone, onChange: (event) => updateEmphasis(blockIndex, emphasisIndex, "tone", event.target.value), children: ABOUT_NARRATIVE_EMPHASIS_TONES.map((tone) => /* @__PURE__ */ jsxDEV("option", { value: tone, children: tone }, tone, false, {
                fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
                lineNumber: 1326,
                columnNumber: 67
              }, this)) }, void 0, false, {
                fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
                lineNumber: 1325,
                columnNumber: 19
              }, this),
              /* @__PURE__ */ jsxDEV("button", { type: "button", "aria-label": `Remove ${item.text || "empty"} highlight`, onClick: () => removeEmphasis(blockIndex, emphasisIndex), children: "×" }, void 0, false, {
                fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
                lineNumber: 1328,
                columnNumber: 19
              }, this)
            ] }, `${block.id}-emphasis-${emphasisIndex}`, true, {
              fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
              lineNumber: 1323,
              columnNumber: 11
            }, this)
          ),
          /* @__PURE__ */ jsxDEV("button", { type: "button", onClick: () => addEmphasis(blockIndex), children: "Add highlight" }, void 0, false, {
            fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
            lineNumber: 1331,
            columnNumber: 15
          }, this)
        ] }, void 0, true, {
          fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
          lineNumber: 1320,
          columnNumber: 9
        }, this) : null,
        block.items ? /* @__PURE__ */ jsxDEV(Property, { label: "Items", children: /* @__PURE__ */ jsxDEV("textarea", { rows: "6", value: block.items.join("\n"), onChange: (event) => updateBlock(blockIndex, "items", event.target.value.split("\n").filter(Boolean)) }, void 0, false, {
          fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
          lineNumber: 1334,
          columnNumber: 50
        }, this) }, void 0, false, {
          fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
          lineNumber: 1334,
          columnNumber: 26
        }, this) : null
      ] }, block.id, true, {
        fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
        lineNumber: 1314,
        columnNumber: 7
      }, this)
    ),
    /* @__PURE__ */ jsxDEV("button", { type: "button", className: "about-editor-wide-action", onClick: () => store.commit("Add editorial block", (draft) => {
      draft.sections[sectionIndex].text.blocks.push({ id: nextId(draft, `${section.id}-prose`), kind: "prose", text: "New editorial paragraph." });
    }), children: "Add prose block" }, void 0, false, {
      fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
      lineNumber: 1337,
      columnNumber: 7
    }, this)
  ] }, void 0, true, {
    fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
    lineNumber: 1311,
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
      lineNumber: 1439,
      columnNumber: 7
    }, this),
    members.length > 1 ? /* @__PURE__ */ jsxDEV(Fragment, { children: [
      /* @__PURE__ */ jsxDEV("div", { className: "about-editor-rhythm-actions", children: [
        /* @__PURE__ */ jsxDEV("button", { type: "button", onClick: distribute, children: "Distribute evenly" }, void 0, false, {
          fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
          lineNumber: 1443,
          columnNumber: 13
        }, this),
        /* @__PURE__ */ jsxDEV("button", { type: "button", onClick: alignPrimary, children: "Align primary to playhead" }, void 0, false, {
          fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
          lineNumber: 1444,
          columnNumber: 13
        }, this)
      ] }, void 0, true, {
        fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
        lineNumber: 1442,
        columnNumber: 11
      }, this),
      /* @__PURE__ */ jsxDEV("div", { className: "about-editor-rhythm-gap", children: [
        /* @__PURE__ */ jsxDEV(Property, { label: "Exact gap", children: /* @__PURE__ */ jsxDEV("input", { type: "number", min: "0", max: "8", step: "0.05", value: gapWU, onChange: (event) => setGapWU(Math.max(0, Number(event.target.value) || 0)) }, void 0, false, {
          fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
          lineNumber: 1447,
          columnNumber: 41
        }, this) }, void 0, false, {
          fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
          lineNumber: 1447,
          columnNumber: 13
        }, this),
        /* @__PURE__ */ jsxDEV(Property, { label: "Anchor", children: /* @__PURE__ */ jsxDEV("select", { value: anchor, onChange: (event) => setAnchor(event.target.value), children: [
          /* @__PURE__ */ jsxDEV("option", { value: "primary", children: "Primary" }, void 0, false, {
            fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
            lineNumber: 1448,
            columnNumber: 113
          }, this),
          /* @__PURE__ */ jsxDEV("option", { value: "first", children: "First" }, void 0, false, {
            fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
            lineNumber: 1448,
            columnNumber: 153
          }, this),
          /* @__PURE__ */ jsxDEV("option", { value: "last", children: "Last" }, void 0, false, {
            fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
            lineNumber: 1448,
            columnNumber: 189
          }, this)
        ] }, void 0, true, {
          fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
          lineNumber: 1448,
          columnNumber: 38
        }, this) }, void 0, false, {
          fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
          lineNumber: 1448,
          columnNumber: 13
        }, this),
        /* @__PURE__ */ jsxDEV("button", { type: "button", onClick: exactGap, children: "Preview exact gap" }, void 0, false, {
          fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
          lineNumber: 1449,
          columnNumber: 13
        }, this)
      ] }, void 0, true, {
        fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
        lineNumber: 1446,
        columnNumber: 11
      }, this)
    ] }, void 0, true, {
      fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
      lineNumber: 1441,
      columnNumber: 7
    }, this) : null,
    ghostMoves.length ? /* @__PURE__ */ jsxDEV("div", { className: "about-editor-rhythm-preview", "aria-label": "Proposed title rhythm", children: ghostMoves.map((move) => {
      const compiled = snapshot.compiledPlan.sections.find((item) => item.id === move.sectionId);
      const storyWU = Number(compiled?.startWU || 0) + move.hold * Number(compiled?.travelWU || 0);
      return /* @__PURE__ */ jsxDEV("i", { style: { left: `${storyWU / maxWU * 100}%` }, title: `${move.cueId} · ${formatWU(storyWU)}` }, `${move.sectionId}:${move.cueId}`, false, {
        fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
        lineNumber: 1458,
        columnNumber: 18
      }, this);
    }) }, void 0, false, {
      fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
      lineNumber: 1454,
      columnNumber: 7
    }, this) : null,
    message ? /* @__PURE__ */ jsxDEV("p", { className: `about-editor-rhythm-message${preview && !preview.valid ? " is-error" : ""}`, children: message }, void 0, false, {
      fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
      lineNumber: 1462,
      columnNumber: 18
    }, this) : null,
    preview?.valid && snapshot.tryState ? /* @__PURE__ */ jsxDEV("div", { className: "about-editor-try", children: [
      /* @__PURE__ */ jsxDEV("span", { children: [
        "Previewing ",
        preview.label
      ] }, void 0, true, {
        fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
        lineNumber: 1463,
        columnNumber: 80
      }, this),
      /* @__PURE__ */ jsxDEV("button", { type: "button", onClick: cancelPreview, children: "Cancel" }, void 0, false, {
        fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
        lineNumber: 1463,
        columnNumber: 119
      }, this),
      /* @__PURE__ */ jsxDEV("button", { type: "button", className: "is-primary", onClick: applyPreview, children: "Apply" }, void 0, false, {
        fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
        lineNumber: 1463,
        columnNumber: 180
      }, this)
    ] }, void 0, true, {
      fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
      lineNumber: 1463,
      columnNumber: 46
    }, this) : null,
    /* @__PURE__ */ jsxDEV("div", { className: "about-editor-rhythm-actions", children: [
      /* @__PURE__ */ jsxDEV("button", { type: "button", onClick: duplicate, children: [
        "Duplicate ",
        members.length > 1 ? "selection" : "title"
      ] }, void 0, true, {
        fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
        lineNumber: 1465,
        columnNumber: 9
      }, this),
      /* @__PURE__ */ jsxDEV("button", { type: "button", onClick: copy, children: "Copy" }, void 0, false, {
        fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
        lineNumber: 1466,
        columnNumber: 9
      }, this),
      /* @__PURE__ */ jsxDEV("button", { type: "button", disabled: !clipboard, onClick: paste, children: "Paste at playhead" }, void 0, false, {
        fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
        lineNumber: 1467,
        columnNumber: 9
      }, this)
    ] }, void 0, true, {
      fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
      lineNumber: 1464,
      columnNumber: 7
    }, this)
  ] }, void 0, true, {
    fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
    lineNumber: 1438,
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
    lineNumber: 1478,
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
        lineNumber: 1498,
        columnNumber: 15
      }, this),
      /* @__PURE__ */ jsxDEV("strong", { children: cue.id }, void 0, false, {
        fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
        lineNumber: 1498,
        columnNumber: 36
      }, this)
    ] }, void 0, true, {
      fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
      lineNumber: 1498,
      columnNumber: 7
    }, this),
    selectedMembers.length > 1 ? /* @__PURE__ */ jsxDEV("div", { className: "about-editor-group-summary", children: [
      /* @__PURE__ */ jsxDEV("strong", { children: [
        selectedMembers.length,
        " titles selected"
      ] }, void 0, true, {
        fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
        lineNumber: 1501,
        columnNumber: 11
      }, this),
      /* @__PURE__ */ jsxDEV("ol", { children: selectedMembers.map((member) => {
        const memberSection = snapshot.document.sections.find((item) => item.id === member.sectionId);
        const memberCue = memberSection?.text?.cues?.find((item) => item.id === member.cueId);
        return /* @__PURE__ */ jsxDEV("li", { children: [
          /* @__PURE__ */ jsxDEV("span", { children: memberSection?.label }, void 0, false, {
            fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
            lineNumber: 1505,
            columnNumber: 68
          }, this),
          memberCue?.text
        ] }, `${member.sectionId}:${member.cueId}`, true, {
          fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
          lineNumber: 1505,
          columnNumber: 20
        }, this);
      }) }, void 0, false, {
        fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
        lineNumber: 1502,
        columnNumber: 11
      }, this),
      /* @__PURE__ */ jsxDEV("button", { type: "button", onClick: () => store.setSelection({ type: "cue", sectionId: section.id, cueId: cue.id, keyPart: "focus" }), children: "Keep primary only" }, void 0, false, {
        fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
        lineNumber: 1507,
        columnNumber: 11
      }, this)
    ] }, void 0, true, {
      fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
      lineNumber: 1500,
      columnNumber: 7
    }, this) : null,
    /* @__PURE__ */ jsxDEV("p", { className: "about-editor-help", children: "Drag the pink timing marker anywhere from 0–100% of its Section. This moves the title's focus time only. Its travel duration, speed, blur, and in/out cadence remain controlled globally under Spatial titles." }, void 0, false, {
      fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
      lineNumber: 1510,
      columnNumber: 7
    }, this),
    /* @__PURE__ */ jsxDEV(Property, { label: "Statement", children: /* @__PURE__ */ jsxDEV("textarea", { rows: "7", value: cue.text, onChange: (event) => update("text", event.target.value) }, void 0, false, {
      fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
      lineNumber: 1511,
      columnNumber: 35
    }, this) }, void 0, false, {
      fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
      lineNumber: 1511,
      columnNumber: 7
    }, this),
    /* @__PURE__ */ jsxDEV(Property, { label: "Movement", children: /* @__PURE__ */ jsxDEV("select", { value: movement, onChange: (event) => updateMovement(event.target.value), children: [
      /* @__PURE__ */ jsxDEV("option", { value: "spatial", children: "Spatial travel" }, void 0, false, {
        fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
        lineNumber: 1512,
        columnNumber: 116
      }, this),
      /* @__PURE__ */ jsxDEV("option", { value: "vertical", children: "Vertical scroll" }, void 0, false, {
        fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
        lineNumber: 1512,
        columnNumber: 163
      }, this)
    ] }, void 0, true, {
      fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
      lineNumber: 1512,
      columnNumber: 34
    }, this) }, void 0, false, {
      fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
      lineNumber: 1512,
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
        lineNumber: 1513,
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
        lineNumber: 1525,
        columnNumber: 41
      }, this) }, void 0, false, {
        fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
        lineNumber: 1525,
        columnNumber: 11
      }, this),
      /* @__PURE__ */ jsxDEV(Property, { label: "Motion preset", children: /* @__PURE__ */ jsxDEV("select", { value: cue.preset, onChange: (event) => update("preset", event.target.value), children: [
        /* @__PURE__ */ jsxDEV("option", { value: "travelling-title-v1", children: "Travelling title" }, void 0, false, {
          fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
          lineNumber: 1526,
          columnNumber: 129
        }, this),
        /* @__PURE__ */ jsxDEV("option", { value: "opener-v1", children: "Opener" }, void 0, false, {
          fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
          lineNumber: 1526,
          columnNumber: 190
        }, this),
        /* @__PURE__ */ jsxDEV("option", { value: "finale-v1", children: "Finale" }, void 0, false, {
          fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
          lineNumber: 1526,
          columnNumber: 231
        }, this)
      ] }, void 0, true, {
        fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
        lineNumber: 1526,
        columnNumber: 43
      }, this) }, void 0, false, {
        fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
        lineNumber: 1526,
        columnNumber: 11
      }, this)
    ] }, void 0, true, {
      fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
      lineNumber: 1524,
      columnNumber: 7
    }, this) : /* @__PURE__ */ jsxDEV(Property, { label: "Reveal", children: /* @__PURE__ */ jsxDEV("output", { className: "about-editor-readout", children: "Editorial vertical scroll" }, void 0, false, {
      fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
      lineNumber: 1528,
      columnNumber: 32
    }, this) }, void 0, false, {
      fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
      lineNumber: 1528,
      columnNumber: 7
    }, this),
    /* @__PURE__ */ jsxDEV(CueRhythmAndReuse, { store, snapshot, clipboard, setClipboard }, void 0, false, {
      fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
      lineNumber: 1529,
      columnNumber: 7
    }, this),
    /* @__PURE__ */ jsxDEV("button", { type: "button", className: "about-editor-danger", disabled: section.type === "finale", onClick: remove, children: "Delete Cue" }, void 0, false, {
      fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
      lineNumber: 1530,
      columnNumber: 7
    }, this)
  ] }, void 0, true, {
    fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
    lineNumber: 1497,
    columnNumber: 5
  }, this);
}
_c0 = CueInspector;
function DisciplineRevealInspector({ store, snapshot, section }) {
  const sectionIndex = getSectionIndex(snapshot.document, section.id);
  const reveal = section.text.disciplineReveal;
  if (!reveal) return /* @__PURE__ */ jsxDEV(SectionInspector, { store, snapshot, section }, void 0, false, {
    fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
    lineNumber: 1538,
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
        lineNumber: 1562,
        columnNumber: 15
      }, this),
      /* @__PURE__ */ jsxDEV("strong", { children: "Discipline reveal" }, void 0, false, {
        fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
        lineNumber: 1562,
        columnNumber: 41
      }, this)
    ] }, void 0, true, {
      fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
      lineNumber: 1562,
      columnNumber: 7
    }, this),
    /* @__PURE__ */ jsxDEV("p", { className: "about-editor-help", children: "One clip controls the complete six-point sequence. Drag its striped block in the Text lane to move every reveal together." }, void 0, false, {
      fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
      lineNumber: 1563,
      columnNumber: 7
    }, this),
    /* @__PURE__ */ jsxDEV("details", { open: true, children: [
      /* @__PURE__ */ jsxDEV("summary", { children: "Reveal choreography" }, void 0, false, {
        fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
        lineNumber: 1564,
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
            lineNumber: 1568,
            columnNumber: 13
          },
          this
        );
      })
    ] }, void 0, true, {
      fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
      lineNumber: 1564,
      columnNumber: 7
    }, this),
    /* @__PURE__ */ jsxDEV("details", { open: true, children: [
      /* @__PURE__ */ jsxDEV("summary", { children: "Reveal order and labels" }, void 0, false, {
        fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
        lineNumber: 1581,
        columnNumber: 21
      }, this),
      /* @__PURE__ */ jsxDEV("div", { className: "about-editor-discipline-items", children: reveal.items.map(
        (item, itemIndex) => /* @__PURE__ */ jsxDEV("div", { className: "about-editor-discipline-item", children: [
          /* @__PURE__ */ jsxDEV("code", { children: String(itemIndex + 1).padStart(2, "0") }, void 0, false, {
            fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
            lineNumber: 1585,
            columnNumber: 15
          }, this),
          /* @__PURE__ */ jsxDEV("input", { value: item.label, "aria-label": `Discipline ${itemIndex + 1} label`, onChange: (event) => update("Edit discipline label", (draft) => {
            draft.items[itemIndex].label = event.target.value;
          }, `discipline-reveal:${section.id}:item:${item.group}:label`) }, void 0, false, {
            fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
            lineNumber: 1586,
            columnNumber: 15
          }, this),
          /* @__PURE__ */ jsxDEV("div", { className: "about-editor-discipline-palette", title: `${item.label} uses the Home simulation ${DISCIPLINE_BALL_TOKEN_BY_GROUP[item.group]}`, children: [
            /* @__PURE__ */ jsxDEV("i", { style: { background: `var(${DISCIPLINE_BALL_TOKEN_BY_GROUP[item.group]})` } }, void 0, false, {
              fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
              lineNumber: 1588,
              columnNumber: 17
            }, this),
            /* @__PURE__ */ jsxDEV("code", { children: DISCIPLINE_BALL_TOKEN_BY_GROUP[item.group] }, void 0, false, {
              fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
              lineNumber: 1589,
              columnNumber: 17
            }, this)
          ] }, void 0, true, {
            fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
            lineNumber: 1587,
            columnNumber: 15
          }, this),
          /* @__PURE__ */ jsxDEV("span", { children: [
            /* @__PURE__ */ jsxDEV("button", { type: "button", disabled: itemIndex === 0, "aria-label": `Reveal ${item.label} earlier`, onClick: () => update("Reorder discipline reveal", (draft) => {
              const [moved] = draft.items.splice(itemIndex, 1);
              draft.items.splice(itemIndex - 1, 0, moved);
            }), children: "↑" }, void 0, false, {
              fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
              lineNumber: 1592,
              columnNumber: 17
            }, this),
            /* @__PURE__ */ jsxDEV("button", { type: "button", disabled: itemIndex === reveal.items.length - 1, "aria-label": `Reveal ${item.label} later`, onClick: () => update("Reorder discipline reveal", (draft) => {
              const [moved] = draft.items.splice(itemIndex, 1);
              draft.items.splice(itemIndex + 1, 0, moved);
            }), children: "↓" }, void 0, false, {
              fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
              lineNumber: 1593,
              columnNumber: 17
            }, this)
          ] }, void 0, true, {
            fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
            lineNumber: 1591,
            columnNumber: 15
          }, this)
        ] }, item.group, true, {
          fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
          lineNumber: 1584,
          columnNumber: 11
        }, this)
      ) }, void 0, false, {
        fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
        lineNumber: 1582,
        columnNumber: 9
      }, this)
    ] }, void 0, true, {
      fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
      lineNumber: 1581,
      columnNumber: 7
    }, this),
    /* @__PURE__ */ jsxDEV("p", { className: "about-editor-help", children: "The six points persist after the labels leave. An editorial block marked “Reconnect point grid” restores the surrounding grid as that paragraph enters." }, void 0, false, {
      fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
      lineNumber: 1599,
      columnNumber: 7
    }, this)
  ] }, void 0, true, {
    fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
    lineNumber: 1561,
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
    lineNumber: 1663,
    columnNumber: 127
  }, this)) }, void 0, false, {
    fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
    lineNumber: 1663,
    columnNumber: 19
  }, this);
  if (!key) {
    return /* @__PURE__ */ jsxDEV(Fragment, { children: [
      /* @__PURE__ */ jsxDEV("header", { children: [
        /* @__PURE__ */ jsxDEV("span", { children: "Camera track" }, void 0, false, {
          fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
          lineNumber: 1665,
          columnNumber: 22
        }, this),
        /* @__PURE__ */ jsxDEV("strong", { children: "Editing Section base" }, void 0, false, {
          fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
          lineNumber: 1665,
          columnNumber: 47
        }, this)
      ] }, void 0, true, {
        fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
        lineNumber: 1665,
        columnNumber: 14
      }, this),
      /* @__PURE__ */ jsxDEV("p", { className: "about-editor-help", children: "The dolly and Section joins are continuous automatically. Add visible keys only where the framing, aim, roll, or lens should change." }, void 0, false, {
        fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
        lineNumber: 1665,
        columnNumber: 93
      }, this),
      recipes,
      /* @__PURE__ */ jsxDEV("button", { type: "button", className: "about-editor-wide-action", onClick: setKey, children: [
        "Set camera key at ",
        formatCameraPercent(targetAt)
      ] }, void 0, true, {
        fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
        lineNumber: 1665,
        columnNumber: 271
      }, this)
    ] }, void 0, true, {
      fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
      lineNumber: 1665,
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
        lineNumber: 1684,
        columnNumber: 15
      }, this),
      /* @__PURE__ */ jsxDEV("strong", { children: [
        formatCameraPercent(key.at),
        " through ",
        section.label
      ] }, void 0, true, {
        fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
        lineNumber: 1684,
        columnNumber: 38
      }, this)
    ] }, void 0, true, {
      fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
      lineNumber: 1684,
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
        lineNumber: 1686,
        columnNumber: 7
      },
      this
    ),
    /* @__PURE__ */ jsxDEV(NumberProperty, { label: extentLabel, value: section[extentField], min: 1, max: 8, step: 0.05, unit: "WU", onChange: updateExtent }, void 0, false, {
      fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
      lineNumber: 1695,
      columnNumber: 7
    }, this),
    ["X offset", "Y offset", "Forward offset"].map((label, axis) => /* @__PURE__ */ jsxDEV(NumberProperty, { label, value: key.offset[axis], min: -8, max: 8, step: 0.02, unit: "WU", onChange: (value) => updateVector("offset", axis, value) }, label, false, {
      fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
      lineNumber: 1696,
      columnNumber: 72
    }, this)),
    ["Aim X", "Aim Y", "Aim depth"].map((label, axis) => /* @__PURE__ */ jsxDEV(NumberProperty, { label, value: key.lookAtOffset[axis], min: -8, max: 8, step: 0.02, unit: "WU", onChange: (value) => updateVector("lookAtOffset", axis, value) }, label, false, {
      fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
      lineNumber: 1697,
      columnNumber: 61
    }, this)),
    /* @__PURE__ */ jsxDEV(NumberProperty, { label: "Field of view", value: key.fov, min: 20, max: 90, step: 1, unit: "°", onChange: (value) => update("fov", value) }, void 0, false, {
      fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
      lineNumber: 1698,
      columnNumber: 7
    }, this),
    /* @__PURE__ */ jsxDEV(NumberProperty, { label: "Roll", value: key.roll, min: -1.2, max: 1.2, step: 0.01, unit: "rad", onChange: (value) => update("roll", value) }, void 0, false, {
      fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
      lineNumber: 1699,
      columnNumber: 7
    }, this),
    /* @__PURE__ */ jsxDEV(Property, { label: "Easing", children: /* @__PURE__ */ jsxDEV("select", { value: key.easing, onChange: (event) => update("easing", event.target.value), children: [
      /* @__PURE__ */ jsxDEV("option", { value: "smoothstep", children: "Smoothstep" }, void 0, false, {
        fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
        lineNumber: 1700,
        columnNumber: 118
      }, this),
      /* @__PURE__ */ jsxDEV("option", { value: "ease-in-out", children: "Ease in out" }, void 0, false, {
        fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
        lineNumber: 1700,
        columnNumber: 164
      }, this)
    ] }, void 0, true, {
      fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
      lineNumber: 1700,
      columnNumber: 32
    }, this) }, void 0, false, {
      fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
      lineNumber: 1700,
      columnNumber: 7
    }, this),
    /* @__PURE__ */ jsxDEV("button", { type: "button", className: "about-editor-wide-action", disabled: existingKeyAtPlayhead >= 0, onClick: setKey, children: existingKeyAtPlayhead >= 0 ? `Camera key already at ${formatCameraPercent(targetAt)}` : `Set another key at ${formatCameraPercent(targetAt)}` }, void 0, false, {
      fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
      lineNumber: 1701,
      columnNumber: 7
    }, this),
    /* @__PURE__ */ jsxDEV("button", { type: "button", className: "about-editor-danger", onClick: () => store.commit("Delete camera key", (draft) => {
      draft.sections[sectionIndex].camera.keys.splice(keyIndex, 1);
    }, { selection: { type: "section", sectionId: section.id } }), children: "Delete key" }, void 0, false, {
      fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
      lineNumber: 1702,
      columnNumber: 7
    }, this)
  ] }, void 0, true, {
    fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
    lineNumber: 1683,
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
          lineNumber: 1717,
          columnNumber: 22
        }, this),
        /* @__PURE__ */ jsxDEV("strong", { children: "Inherited World" }, void 0, false, {
          fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
          lineNumber: 1717,
          columnNumber: 46
        }, this)
      ] }, void 0, true, {
        fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
        lineNumber: 1717,
        columnNumber: 14
      }, this),
      /* @__PURE__ */ jsxDEV("p", { className: "about-editor-help", children: "This Section keeps the previous World. Choose “Create World clip” only when the shape should change here." }, void 0, false, {
        fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
        lineNumber: 1717,
        columnNumber: 87
      }, this),
      /* @__PURE__ */ jsxDEV("button", { type: "button", className: "about-editor-wide-action", onClick: () => store.commit("Create World clip", (draft) => {
        draft.sections[sectionIndex].world = cloneAboutNarrativeDocument(draft.sections.slice(0, sectionIndex).reverse().find((item) => item.world.mode === "set")?.world || draft.sections[0].world);
      }), children: "Create World clip" }, void 0, false, {
        fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
        lineNumber: 1717,
        columnNumber: 229
      }, this)
    ] }, void 0, true, {
      fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
      lineNumber: 1717,
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
        lineNumber: 1750,
        columnNumber: 15
      }, this),
      /* @__PURE__ */ jsxDEV("strong", { children: shape?.label || world.shapeId }, void 0, false, {
        fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
        lineNumber: 1750,
        columnNumber: 38
      }, this)
    ] }, void 0, true, {
      fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
      lineNumber: 1750,
      columnNumber: 7
    }, this),
    /* @__PURE__ */ jsxDEV("div", { className: "about-editor-shape-catalog", children: Object.values(ABOUT_NARRATIVE_SHAPE_DEFINITIONS).map(
      (item) => /* @__PURE__ */ jsxDEV("button", { type: "button", disabled: section.locked, className: item.id === world.shapeId ? "is-selected" : "", onClick: () => tryShape(item.id), children: [
        /* @__PURE__ */ jsxDEV("i", {}, void 0, false, {
          fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
          lineNumber: 1754,
          columnNumber: 13
        }, this),
        /* @__PURE__ */ jsxDEV("span", { children: [
          /* @__PURE__ */ jsxDEV("strong", { children: item.label }, void 0, false, {
            fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
            lineNumber: 1754,
            columnNumber: 24
          }, this),
          /* @__PURE__ */ jsxDEV("small", { children: [
            "Cost ",
            item.cost,
            " · Point field"
          ] }, void 0, true, {
            fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
            lineNumber: 1754,
            columnNumber: 53
          }, this)
        ] }, void 0, true, {
          fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
          lineNumber: 1754,
          columnNumber: 18
        }, this)
      ] }, item.id, true, {
        fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
        lineNumber: 1753,
        columnNumber: 9
      }, this)
    ) }, void 0, false, {
      fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
      lineNumber: 1751,
      columnNumber: 7
    }, this),
    snapshot.tryState ? /* @__PURE__ */ jsxDEV("div", { className: "about-editor-try", children: [
      /* @__PURE__ */ jsxDEV("span", { children: [
        "Trying ",
        snapshot.tryState.label
      ] }, void 0, true, {
        fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
        lineNumber: 1758,
        columnNumber: 62
      }, this),
      /* @__PURE__ */ jsxDEV("button", { type: "button", onClick: () => store.cancelTry(), children: "Cancel" }, void 0, false, {
        fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
        lineNumber: 1758,
        columnNumber: 107
      }, this),
      /* @__PURE__ */ jsxDEV("button", { type: "button", className: "is-primary", onClick: () => store.applyTry(), children: "Apply" }, void 0, false, {
        fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
        lineNumber: 1758,
        columnNumber: 178
      }, this)
    ] }, void 0, true, {
      fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
      lineNumber: 1758,
      columnNumber: 28
    }, this) : null,
    /* @__PURE__ */ jsxDEV("details", { open: true, children: [
      /* @__PURE__ */ jsxDEV("summary", { children: "Shape parameters" }, void 0, false, {
        fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
        lineNumber: 1759,
        columnNumber: 21
      }, this),
      (shape?.parameters || []).map((control) => /* @__PURE__ */ jsxDEV(NumberProperty, { label: control.label, value: world.shapeParameters[control.id], min: control.min, max: control.max, step: control.step, unit: control.unit, onChange: (value) => update(`Change ${control.label}`, (draft) => {
        draft.shapeParameters[control.id] = value;
      }, `world:${section.id}:${control.id}`) }, control.id, false, {
        fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
        lineNumber: 1760,
        columnNumber: 53
      }, this)),
      /* @__PURE__ */ jsxDEV("div", { className: "about-editor-inline-actions", children: [
        /* @__PURE__ */ jsxDEV("button", { type: "button", onClick: () => update("Reseed Shape", (draft) => {
          draft.seed = Math.floor(Math.random() * 4294967295);
        }), children: "Reseed" }, void 0, false, {
          fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
          lineNumber: 1761,
          columnNumber: 54
        }, this),
        /* @__PURE__ */ jsxDEV("code", { children: world.seed }, void 0, false, {
          fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
          lineNumber: 1761,
          columnNumber: 197
        }, this)
      ] }, void 0, true, {
        fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
        lineNumber: 1761,
        columnNumber: 9
      }, this)
    ] }, void 0, true, {
      fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
      lineNumber: 1759,
      columnNumber: 7
    }, this),
    /* @__PURE__ */ jsxDEV("details", { open: true, children: [
      /* @__PURE__ */ jsxDEV("summary", { children: "Placement" }, void 0, false, {
        fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
        lineNumber: 1763,
        columnNumber: 21
      }, this),
      /* @__PURE__ */ jsxDEV(NumberProperty, { label: "Distance at entry", value: world.entryDistanceWU, min: 0.2, max: 16, step: 0.05, unit: "WU", onChange: (value) => update("Move World", (draft) => {
        draft.entryDistanceWU = value;
      }, `world:${section.id}:distance`) }, void 0, false, {
        fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
        lineNumber: 1764,
        columnNumber: 9
      }, this),
      /* @__PURE__ */ jsxDEV(NumberProperty, { label: "Scale", value: world.transform.scale, min: 0.1, max: 3, step: 0.01, onChange: (value) => update("Scale World", (draft) => {
        draft.transform.scale = value;
      }, `world:${section.id}:scale`) }, void 0, false, {
        fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
        lineNumber: 1765,
        columnNumber: 9
      }, this)
    ] }, void 0, true, {
      fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
      lineNumber: 1763,
      columnNumber: 7
    }, this),
    /* @__PURE__ */ jsxDEV("details", { open: true, children: [
      /* @__PURE__ */ jsxDEV("summary", { children: "Transition in" }, void 0, false, {
        fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
        lineNumber: 1767,
        columnNumber: 21
      }, this),
      transitionEnabled ? /* @__PURE__ */ jsxDEV(Fragment, { children: [
        /* @__PURE__ */ jsxDEV("p", { className: "about-editor-help", children: [
          "Timing is relative to this Section: 1 is its end; values above 1 continue across inherited World Sections. The next World begins at ",
          transitionLimit.toFixed(3),
          "."
        ] }, void 0, true, {
          fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
          lineNumber: 1769,
          columnNumber: 11
        }, this),
        /* @__PURE__ */ jsxDEV(NumberProperty, { label: "Start", value: world.transitionIn.start, min: 0, max: transitionMax, step: 5e-3, unit: "× section", onChange: (value) => update("Change transition start", (draft) => {
          draft.transitionIn.start = Math.min(value, draft.transitionIn.end);
        }) }, void 0, false, {
          fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
          lineNumber: 1770,
          columnNumber: 11
        }, this),
        /* @__PURE__ */ jsxDEV(NumberProperty, { label: "End", value: world.transitionIn.end, min: 0, max: transitionMax, step: 5e-3, unit: "× section", onChange: (value) => update("Change transition end", (draft) => {
          draft.transitionIn.end = Math.max(value, draft.transitionIn.start);
        }) }, void 0, false, {
          fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
          lineNumber: 1771,
          columnNumber: 11
        }, this),
        /* @__PURE__ */ jsxDEV(Property, { label: "Type", children: /* @__PURE__ */ jsxDEV("select", { value: world.transitionIn.type, onChange: (event) => update("Change transition type", (draft) => {
          draft.transitionIn.type = event.target.value;
        }), children: [
          /* @__PURE__ */ jsxDEV("option", { value: "morph", children: "Morph" }, void 0, false, {
            fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
            lineNumber: 1772,
            columnNumber: 189
          }, this),
          /* @__PURE__ */ jsxDEV("option", { value: "dissolve-morph", children: "Dissolve morph" }, void 0, false, {
            fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
            lineNumber: 1772,
            columnNumber: 225
          }, this),
          /* @__PURE__ */ jsxDEV("option", { value: "crossfade", children: "Crossfade" }, void 0, false, {
            fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
            lineNumber: 1772,
            columnNumber: 279
          }, this),
          /* @__PURE__ */ jsxDEV("option", { value: "hold", children: "Hold" }, void 0, false, {
            fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
            lineNumber: 1772,
            columnNumber: 323
          }, this)
        ] }, void 0, true, {
          fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
          lineNumber: 1772,
          columnNumber: 34
        }, this) }, void 0, false, {
          fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
          lineNumber: 1772,
          columnNumber: 11
        }, this),
        /* @__PURE__ */ jsxDEV(Property, { label: "Easing", children: /* @__PURE__ */ jsxDEV("select", { value: world.transitionIn.easing, onChange: (event) => update("Change transition easing", (draft) => {
          draft.transitionIn.easing = event.target.value;
        }), children: [
          /* @__PURE__ */ jsxDEV("option", { value: "linear", children: "Linear" }, void 0, false, {
            fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
            lineNumber: 1773,
            columnNumber: 197
          }, this),
          /* @__PURE__ */ jsxDEV("option", { value: "smoothstep", children: "Smoothstep" }, void 0, false, {
            fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
            lineNumber: 1773,
            columnNumber: 235
          }, this),
          /* @__PURE__ */ jsxDEV("option", { value: "ease-in", children: "Ease in" }, void 0, false, {
            fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
            lineNumber: 1773,
            columnNumber: 281
          }, this),
          /* @__PURE__ */ jsxDEV("option", { value: "ease-out", children: "Ease out" }, void 0, false, {
            fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
            lineNumber: 1773,
            columnNumber: 321
          }, this),
          /* @__PURE__ */ jsxDEV("option", { value: "ease-in-out", children: "Ease in out" }, void 0, false, {
            fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
            lineNumber: 1773,
            columnNumber: 363
          }, this),
          /* @__PURE__ */ jsxDEV("option", { value: "hold", children: "Hold" }, void 0, false, {
            fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
            lineNumber: 1773,
            columnNumber: 411
          }, this)
        ] }, void 0, true, {
          fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
          lineNumber: 1773,
          columnNumber: 36
        }, this) }, void 0, false, {
          fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
          lineNumber: 1773,
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
          lineNumber: 1774,
          columnNumber: 11
        }, this),
        /* @__PURE__ */ jsxDEV(Property, { label: "Correspondence", children: /* @__PURE__ */ jsxDEV("select", { "aria-label": "Correspondence", value: world.transitionIn.correspondence, disabled: !correspondenceEnabled, title: correspondenceEnabled ? "Choose how source points are assigned to target points." : "Correspondence applies to Morph and Dissolve morph transitions.", onChange: (event) => update("Change correspondence", (draft) => {
          draft.transitionIn.correspondence = event.target.value;
        }), children: ABOUT_NARRATIVE_CORRESPONDENCE_MODES.map((mode) => /* @__PURE__ */ jsxDEV("option", { value: mode, children: CORRESPONDENCE_LABELS[mode] || mode }, mode, false, {
          fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
          lineNumber: 1775,
          columnNumber: 490
        }, this)) }, void 0, false, {
          fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
          lineNumber: 1775,
          columnNumber: 44
        }, this) }, void 0, false, {
          fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
          lineNumber: 1775,
          columnNumber: 11
        }, this),
        /* @__PURE__ */ jsxDEV("p", { className: "about-editor-help", role: "status", "aria-live": "polite", children: [
          "Correspondence: ",
          correspondenceStatus,
          prepared && runtimeMetrics?.correspondenceToWorldId === section.id && Number.isFinite(runtimeMetrics?.correspondenceImprovement) ? ` · ${Math.round(runtimeMetrics.correspondenceImprovement * 100)}% RMS improvement` : "",
          "."
        ] }, void 0, true, {
          fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
          lineNumber: 1776,
          columnNumber: 11
        }, this),
        /* @__PURE__ */ jsxDEV("button", { type: "button", className: "about-editor-danger", onClick: () => store.commit("Remove World transition", (draft) => {
          const transition = draft.sections[sectionIndex].world.transitionIn;
          transition.start = 0;
          transition.end = 0;
          transition.type = "cut";
        }, { selection: { type: "world", sectionId: section.id } }), children: "Remove transition keyframes" }, void 0, false, {
          fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
          lineNumber: 1777,
          columnNumber: 11
        }, this)
      ] }, void 0, true, {
        fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
        lineNumber: 1768,
        columnNumber: 30
      }, this) : /* @__PURE__ */ jsxDEV(Fragment, { children: [
        /* @__PURE__ */ jsxDEV("p", { className: "about-editor-help", children: "This World cuts in at the Section boundary and has no transition keyframes." }, void 0, false, {
          fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
          lineNumber: 1784,
          columnNumber: 11
        }, this),
        /* @__PURE__ */ jsxDEV("button", { type: "button", className: "about-editor-wide-action", onClick: () => store.commit("Add World transition", (draft) => {
          const transition = draft.sections[sectionIndex].world.transitionIn;
          transition.start = Math.min(0.08, transitionLimit);
          transition.end = Math.min(0.68, transitionLimit);
          transition.type = "morph";
        }, { selection: { type: "world", sectionId: section.id } }), children: "Add transition keyframes" }, void 0, false, {
          fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
          lineNumber: 1785,
          columnNumber: 11
        }, this)
      ] }, void 0, true, {
        fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
        lineNumber: 1783,
        columnNumber: 15
      }, this)
    ] }, void 0, true, {
      fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
      lineNumber: 1767,
      columnNumber: 7
    }, this),
    /* @__PURE__ */ jsxDEV("details", { open: true, children: [
      /* @__PURE__ */ jsxDEV("summary", { children: "Modifier stack" }, void 0, false, {
        fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
        lineNumber: 1793,
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
                lineNumber: 1802,
                columnNumber: 105
              }, this),
              definition?.label || item.id
            ] }, void 0, true, {
              fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
              lineNumber: 1802,
              columnNumber: 98
            }, this),
            /* @__PURE__ */ jsxDEV("span", { children: [
              /* @__PURE__ */ jsxDEV("button", { type: "button", disabled: modifierIndex === 0, onClick: () => moveModifier(-1), "aria-label": "Move modifier up", children: "↑" }, void 0, false, {
                fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
                lineNumber: 1802,
                columnNumber: 334
              }, this),
              /* @__PURE__ */ jsxDEV("button", { type: "button", disabled: modifierIndex === world.modifiers.length - 1, onClick: () => moveModifier(1), "aria-label": "Move modifier down", children: "↓" }, void 0, false, {
                fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
                lineNumber: 1802,
                columnNumber: 460
              }, this),
              " Cost ",
              definition?.cost || "?"
            ] }, void 0, true, {
              fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
              lineNumber: 1802,
              columnNumber: 328
            }, this)
          ] }, void 0, true, {
            fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
            lineNumber: 1802,
            columnNumber: 93
          }, this),
          (definition?.parameters || []).map((control) => control.type === "range" ? /* @__PURE__ */ jsxDEV(NumberProperty, { label: control.label, value: item.parameters[control.id], min: control.min, max: control.max, step: control.step, unit: control.unit, onChange: (value) => update(`Change ${control.label}`, (draft) => {
            draft.modifiers[modifierIndex].parameters[control.id] = value;
          }, `modifier:${section.id}:${modifierIndex}:${control.id}`) }, control.id, false, {
            fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
            lineNumber: 1802,
            columnNumber: 732
          }, this) : /* @__PURE__ */ jsxDEV(Property, { label: control.label, children: /* @__PURE__ */ jsxDEV("select", { value: item.parameters[control.id], onChange: (event) => update(`Change ${control.label}`, (draft) => {
            draft.modifiers[modifierIndex].parameters[control.id] = event.target.value;
          }), children: control.options.map((option) => /* @__PURE__ */ jsxDEV("option", { children: option }, option, false, {
            fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
            lineNumber: 1802,
            columnNumber: 1366
          }, this)) }, void 0, false, {
            fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
            lineNumber: 1802,
            columnNumber: 1143
          }, this) }, control.id, false, {
            fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
            lineNumber: 1802,
            columnNumber: 1094
          }, this))
        ] }, `${item.id}-${modifierIndex}`, true, {
          fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
          lineNumber: 1802,
          columnNumber: 18
        }, this);
      })
    ] }, void 0, true, {
      fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
      lineNumber: 1793,
      columnNumber: 7
    }, this)
  ] }, void 0, true, {
    fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
    lineNumber: 1749,
    columnNumber: 5
  }, this);
}
_c11 = WorldInspector;
function Diagnostics({ diagnostics }) {
  if (!diagnostics.length) return /* @__PURE__ */ jsxDEV("div", { className: "about-editor-diagnostics is-clear", children: [
    /* @__PURE__ */ jsxDEV(Check, { "aria-hidden": "true" }, void 0, false, {
      fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
      lineNumber: 1810,
      columnNumber: 86
    }, this),
    " No diagnostics"
  ] }, void 0, true, {
    fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
    lineNumber: 1810,
    columnNumber: 35
  }, this);
  return /* @__PURE__ */ jsxDEV("div", { className: "about-editor-diagnostics", children: diagnostics.map((item, index) => {
    const DiagnosticIcon = item.level === "error" ? CircleAlert : Info;
    return /* @__PURE__ */ jsxDEV("div", { className: `is-${item.level}`, children: [
      /* @__PURE__ */ jsxDEV(DiagnosticIcon, { "aria-hidden": "true" }, void 0, false, {
        fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
        lineNumber: 1813,
        columnNumber: 93
      }, this),
      /* @__PURE__ */ jsxDEV("span", { children: [
        /* @__PURE__ */ jsxDEV("strong", { children: item.message }, void 0, false, {
          fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
          lineNumber: 1813,
          columnNumber: 136
        }, this),
        /* @__PURE__ */ jsxDEV("small", { children: item.path }, void 0, false, {
          fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
          lineNumber: 1813,
          columnNumber: 167
        }, this)
      ] }, void 0, true, {
        fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
        lineNumber: 1813,
        columnNumber: 130
      }, this)
    ] }, `${item.code}-${item.path}-${index}`, true, {
      fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
      lineNumber: 1813,
      columnNumber: 14
    }, this);
  }) }, void 0, false, {
    fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
    lineNumber: 1811,
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
      lineNumber: 1853,
      columnNumber: 7
    }, this),
    /* @__PURE__ */ jsxDEV("div", { className: "about-editor-audition-range", children: [
      /* @__PURE__ */ jsxDEV(Property, { label: "Pre-roll", children: /* @__PURE__ */ jsxDEV("input", { type: "number", min: "0", max: "2", step: "0.05", value: preRollWU, onChange: (event) => setPreRollWU(Math.max(0, Number(event.target.value) || 0)) }, void 0, false, {
        fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
        lineNumber: 1855,
        columnNumber: 36
      }, this) }, void 0, false, {
        fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
        lineNumber: 1855,
        columnNumber: 9
      }, this),
      /* @__PURE__ */ jsxDEV(Property, { label: "Post-roll", children: /* @__PURE__ */ jsxDEV("input", { type: "number", min: "0", max: "2", step: "0.05", value: postRollWU, onChange: (event) => setPostRollWU(Math.max(0, Number(event.target.value) || 0)) }, void 0, false, {
        fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
        lineNumber: 1856,
        columnNumber: 37
      }, this) }, void 0, false, {
        fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
        lineNumber: 1856,
        columnNumber: 9
      }, this)
    ] }, void 0, true, {
      fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
      lineNumber: 1854,
      columnNumber: 7
    }, this),
    range.valid ? /* @__PURE__ */ jsxDEV("p", { className: "about-editor-help", children: [
      formatWU(range.startWU),
      " → ",
      formatWU(range.endWU),
      " · ambient motion freezes for a repeatable review."
    ] }, void 0, true, {
      fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
      lineNumber: 1858,
      columnNumber: 22
    }, this) : /* @__PURE__ */ jsxDEV("p", { className: "about-editor-rhythm-message is-error", children: range.reason }, void 0, false, {
      fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
      lineNumber: 1858,
      columnNumber: 163
    }, this),
    /* @__PURE__ */ jsxDEV("button", { type: "button", className: active ? "is-active about-editor-wide-action" : "about-editor-wide-action", disabled: !range.valid, onClick: toggle, children: active ? "Stop audition" : "Loop this selection" }, void 0, false, {
      fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
      lineNumber: 1859,
      columnNumber: 7
    }, this)
  ] }, void 0, true, {
    fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
    lineNumber: 1852,
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
    lineNumber: 1871,
    columnNumber: 17
  }, this);
  if (snapshot.selection.type === "sequence") content = /* @__PURE__ */ jsxDEV(SequenceInspector, { store, snapshot }, void 0, false, {
    fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
    lineNumber: 1872,
    columnNumber: 57
  }, this);
  if (snapshot.selection.type === "cue") content = /* @__PURE__ */ jsxDEV(CueInspector, { store, snapshot, section, clipboard, setClipboard }, void 0, false, {
    fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
    lineNumber: 1873,
    columnNumber: 52
  }, this);
  if (snapshot.selection.type === "discipline-reveal") content = /* @__PURE__ */ jsxDEV(DisciplineRevealInspector, { store, snapshot, section }, void 0, false, {
    fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
    lineNumber: 1874,
    columnNumber: 66
  }, this);
  if (snapshot.selection.type === "camera-key") content = /* @__PURE__ */ jsxDEV(CameraInspector, { store, snapshot, section }, void 0, false, {
    fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
    lineNumber: 1875,
    columnNumber: 59
  }, this);
  if (snapshot.selection.type === "world") content = /* @__PURE__ */ jsxDEV(WorldInspector, { store, snapshot, section, runtimeMetrics }, void 0, false, {
    fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
    lineNumber: 1876,
    columnNumber: 54
  }, this);
  if (snapshot.selection.type === "interaction") content = /* @__PURE__ */ jsxDEV(SectionInspector, { store, snapshot, section }, void 0, false, {
    fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
    lineNumber: 1877,
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
          lineNumber: 1977,
          columnNumber: 63
        }, this),
        /* @__PURE__ */ jsxDEV(Diagnostics, { diagnostics: snapshot.diagnostics }, void 0, false, {
          fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
          lineNumber: 1977,
          columnNumber: 117
        }, this)
      ] }, void 0, true, {
        fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
        lineNumber: 1977,
        columnNumber: 7
      }, this)
    },
    void 0,
    false,
    {
      fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
      lineNumber: 1960,
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
        lineNumber: 1986,
        columnNumber: 12
      }, this),
      /* @__PURE__ */ jsxDEV("span", { children: [
        formatWU(snapshot.transport.storyWU),
        " / ",
        formatWU(total)
      ] }, void 0, true, {
        fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
        lineNumber: 1986,
        columnNumber: 52
      }, this)
    ] }, void 0, true, {
      fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
      lineNumber: 1986,
      columnNumber: 7
    }, this),
    /* @__PURE__ */ jsxDEV("svg", { viewBox: "0 0 240 112", role: "img", "aria-label": "Camera and World anchors over story distance", children: [
      /* @__PURE__ */ jsxDEV("path", { d: "M18 56 H222" }, void 0, false, {
        fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
        lineNumber: 1988,
        columnNumber: 9
      }, this),
      sections.map((section) => {
        const x = 18 + section.startWU / total * 204;
        return /* @__PURE__ */ jsxDEV("g", { transform: `translate(${x} 56)`, children: [
          /* @__PURE__ */ jsxDEV("line", { y1: "-12", y2: "12" }, void 0, false, {
            fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
            lineNumber: 1991,
            columnNumber: 71
          }, this),
          /* @__PURE__ */ jsxDEV("circle", { r: section.worldState?.changesWorld ? 4 : 2 }, void 0, false, {
            fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
            lineNumber: 1991,
            columnNumber: 96
          }, this),
          /* @__PURE__ */ jsxDEV("title", { children: [
            section.label,
            section.worldState?.changesWorld ? ` · ${section.worldState.activeWorld.shapeId}` : ""
          ] }, void 0, true, {
            fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
            lineNumber: 1991,
            columnNumber: 151
          }, this)
        ] }, section.id, true, {
          fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
          lineNumber: 1991,
          columnNumber: 18
        }, this);
      }),
      /* @__PURE__ */ jsxDEV("g", { className: "is-playhead", transform: `translate(${18 + snapshot.transport.storyWU / total * 204} 56)`, children: [
        /* @__PURE__ */ jsxDEV("path", { d: "M0 -22 L5 -15 H-5 Z" }, void 0, false, {
          fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
          lineNumber: 1993,
          columnNumber: 113
        }, this),
        /* @__PURE__ */ jsxDEV("line", { y1: "-15", y2: "22" }, void 0, false, {
          fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
          lineNumber: 1993,
          columnNumber: 145
        }, this)
      ] }, void 0, true, {
        fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
        lineNumber: 1993,
        columnNumber: 9
      }, this)
    ] }, void 0, true, {
      fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
      lineNumber: 1987,
      columnNumber: 7
    }, this),
    /* @__PURE__ */ jsxDEV("small", { children: "Dots are Section boundaries. Large dots are fixed World anchors. The marker is the published camera." }, void 0, false, {
      fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
      lineNumber: 1995,
      columnNumber: 7
    }, this)
  ] }, void 0, true, {
    fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
    lineNumber: 1985,
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
                lineNumber: 2223,
                columnNumber: 119
              }, this),
              /* @__PURE__ */ jsxDEV("span", { children: "About Narrative" }, void 0, false, {
                fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
                lineNumber: 2223,
                columnNumber: 149
              }, this),
              /* @__PURE__ */ jsxDEV("small", { children: "Creative toolkit" }, void 0, false, {
                fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
                lineNumber: 2223,
                columnNumber: 177
              }, this)
            ] }, void 0, true, {
              fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
              lineNumber: 2223,
              columnNumber: 9
            }, this),
            /* @__PURE__ */ jsxDEV(Transport, { store, snapshot }, void 0, false, {
              fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
              lineNumber: 2224,
              columnNumber: 9
            }, this),
            /* @__PURE__ */ jsxDEV("div", { className: "about-editor-actions", children: [
              /* @__PURE__ */ jsxDEV("button", { type: "button", disabled: !snapshot.history.canUndo, title: snapshot.history.undoLabel || "Undo", "aria-label": "Undo", onClick: () => store.undo(), children: /* @__PURE__ */ jsxDEV("span", { "aria-hidden": "true", children: "↶" }, void 0, false, {
                fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
                lineNumber: 2226,
                columnNumber: 162
              }, this) }, void 0, false, {
                fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
                lineNumber: 2226,
                columnNumber: 11
              }, this),
              /* @__PURE__ */ jsxDEV("button", { type: "button", disabled: !snapshot.history.canRedo, title: snapshot.history.redoLabel || "Redo", "aria-label": "Redo", onClick: () => store.redo(), children: /* @__PURE__ */ jsxDEV("span", { "aria-hidden": "true", children: "↷" }, void 0, false, {
                fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
                lineNumber: 2227,
                columnNumber: 162
              }, this) }, void 0, false, {
                fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
                lineNumber: 2227,
                columnNumber: 11
              }, this),
              /* @__PURE__ */ jsxDEV("button", { type: "button", className: pathVisible ? "is-active" : "", onClick: () => setPathVisible(!pathVisible), children: "Path" }, void 0, false, {
                fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
                lineNumber: 2228,
                columnNumber: 11
              }, this),
              /* @__PURE__ */ jsxDEV("button", { type: "button", className: directorView ? "is-active" : "", onClick: toggleDirector, children: directorView ? "Director" : "Camera" }, void 0, false, {
                fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
                lineNumber: 2229,
                columnNumber: 11
              }, this),
              /* @__PURE__ */ jsxDEV("button", { type: "button", className: snapshot.tryState?.label === "Compare saved source" ? "is-active" : "", disabled: snapshot.tryState && snapshot.tryState.label !== "Compare saved source", onClick: toggleBefore, children: snapshot.tryState?.label === "Compare saved source" ? "Before" : "After" }, void 0, false, {
                fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
                lineNumber: 2230,
                columnNumber: 11
              }, this),
              /* @__PURE__ */ jsxDEV("details", { className: "about-editor-more", children: [
                /* @__PURE__ */ jsxDEV("summary", { children: "More" }, void 0, false, {
                  fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
                  lineNumber: 2232,
                  columnNumber: 13
                }, this),
                /* @__PURE__ */ jsxDEV("div", { children: [
                  /* @__PURE__ */ jsxDEV("button", { type: "button", onClick: addCheckpoint, children: "Checkpoint" }, void 0, false, {
                    fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
                    lineNumber: 2234,
                    columnNumber: 15
                  }, this),
                  /* @__PURE__ */ jsxDEV("button", { type: "button", onClick: () => exportAboutNarrativeDocument(snapshot.document), children: "Export JSON" }, void 0, false, {
                    fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
                    lineNumber: 2235,
                    columnNumber: 15
                  }, this),
                  /* @__PURE__ */ jsxDEV("button", { type: "button", onClick: () => importRef.current?.click(), children: "Import JSON" }, void 0, false, {
                    fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
                    lineNumber: 2236,
                    columnNumber: 15
                  }, this)
                ] }, void 0, true, {
                  fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
                  lineNumber: 2233,
                  columnNumber: 13
                }, this)
              ] }, void 0, true, {
                fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
                lineNumber: 2231,
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
                lineNumber: 2239,
                columnNumber: 11
              }, this),
              /* @__PURE__ */ jsxDEV("button", { type: "button", "data-about-editor-save": true, className: "is-save", disabled: snapshot.saveState.status === "saving", onClick: save, children: [
                /* @__PURE__ */ jsxDEV("span", { children: statusLabel }, void 0, false, {
                  fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
                  lineNumber: 2249,
                  columnNumber: 141
                }, this),
                /* @__PURE__ */ jsxDEV("kbd", { children: "⌘S" }, void 0, false, {
                  fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
                  lineNumber: 2249,
                  columnNumber: 167
                }, this)
              ] }, void 0, true, {
                fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
                lineNumber: 2249,
                columnNumber: 11
              }, this)
            ] }, void 0, true, {
              fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
              lineNumber: 2225,
              columnNumber: 9
            }, this)
          ] }, void 0, true, {
            fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
            lineNumber: 2222,
            columnNumber: 7
          }, this),
          snapshot.recoveryState.available ? /* @__PURE__ */ jsxDEV("div", { className: "about-editor-recovery", children: [
            /* @__PURE__ */ jsxDEV("span", { children: [
              "An unsaved draft from ",
              new Date(snapshot.recoveryState.draft.timestamp).toLocaleString(),
              " is available."
            ] }, void 0, true, {
              fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
              lineNumber: 2253,
              columnNumber: 82
            }, this),
            /* @__PURE__ */ jsxDEV("button", { type: "button", onClick: () => {
              store.replaceDocument("Recover draft", snapshot.recoveryState.draft.document);
              store.setRecoveryState({ available: false });
            }, children: "Recover as unsaved copy" }, void 0, false, {
              fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
              lineNumber: 2253,
              columnNumber: 198
            }, this),
            /* @__PURE__ */ jsxDEV("button", { type: "button", onClick: () => {
              exportAboutNarrativeDocument(snapshot.recoveryState.draft.document, "contents-about-recovered.json");
            }, children: "Export" }, void 0, false, {
              fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
              lineNumber: 2253,
              columnNumber: 394
            }, this),
            /* @__PURE__ */ jsxDEV("button", { type: "button", onClick: () => {
              clearAboutNarrativeRecoveryDraft();
              store.setRecoveryState({ available: false });
            }, children: "Discard" }, void 0, false, {
              fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
              lineNumber: 2253,
              columnNumber: 551
            }, this)
          ] }, void 0, true, {
            fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
            lineNumber: 2253,
            columnNumber: 43
          }, this) : null,
          snapshot.saveState.message ? /* @__PURE__ */ jsxDEV("div", { className: `about-editor-save-message is-${snapshot.saveState.status}`, children: [
            snapshot.saveState.message,
            /* @__PURE__ */ jsxDEV("button", { type: "button", "aria-label": "Dismiss message", onClick: () => store.setSaveState({ message: "" }), children: "×" }, void 0, false, {
              fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
              lineNumber: 2254,
              columnNumber: 142
            }, this)
          ] }, void 0, true, {
            fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
            lineNumber: 2254,
            columnNumber: 37
          }, this) : null,
          pathVisible ? /* @__PURE__ */ jsxDEV(CameraPathOverlay, { snapshot }, void 0, false, {
            fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
            lineNumber: 2256,
            columnNumber: 22
          }, this) : null,
          directorView ? /* @__PURE__ */ jsxDEV("div", { className: "about-editor-director-controls", children: [
            /* @__PURE__ */ jsxDEV("strong", { children: "Director View" }, void 0, false, {
              fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
              lineNumber: 2257,
              columnNumber: 71
            }, this),
            /* @__PURE__ */ jsxDEV("button", { type: "button", onClick: () => runtimeRef.current?.nudgeDirector?.({ yaw: -0.08 }), children: "←" }, void 0, false, {
              fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
              lineNumber: 2257,
              columnNumber: 101
            }, this),
            /* @__PURE__ */ jsxDEV("button", { type: "button", onClick: () => runtimeRef.current?.nudgeDirector?.({ pitch: 0.08 }), children: "↑" }, void 0, false, {
              fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
              lineNumber: 2257,
              columnNumber: 201
            }, this),
            /* @__PURE__ */ jsxDEV("button", { type: "button", onClick: () => runtimeRef.current?.nudgeDirector?.({ pitch: -0.08 }), children: "↓" }, void 0, false, {
              fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
              lineNumber: 2257,
              columnNumber: 302
            }, this),
            /* @__PURE__ */ jsxDEV("button", { type: "button", onClick: () => runtimeRef.current?.nudgeDirector?.({ yaw: 0.08 }), children: "→" }, void 0, false, {
              fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
              lineNumber: 2257,
              columnNumber: 404
            }, this),
            /* @__PURE__ */ jsxDEV("button", { type: "button", onClick: () => runtimeRef.current?.nudgeDirector?.({ distance: -0.2 }), children: "＋" }, void 0, false, {
              fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
              lineNumber: 2257,
              columnNumber: 503
            }, this),
            /* @__PURE__ */ jsxDEV("button", { type: "button", onClick: () => runtimeRef.current?.nudgeDirector?.({ distance: 0.2 }), children: "−" }, void 0, false, {
              fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
              lineNumber: 2257,
              columnNumber: 607
            }, this),
            /* @__PURE__ */ jsxDEV("button", { type: "button", onClick: () => runtimeRef.current?.resetDirector?.(), children: "Reset" }, void 0, false, {
              fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
              lineNumber: 2257,
              columnNumber: 710
            }, this),
            /* @__PURE__ */ jsxDEV("small", { children: "Temporary inspection only. Published Camera keys are unchanged." }, void 0, false, {
              fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
              lineNumber: 2257,
              columnNumber: 800
            }, this)
          ] }, void 0, true, {
            fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
            lineNumber: 2257,
            columnNumber: 23
          }, this) : null,
          /* @__PURE__ */ jsxDEV(Inspector, { store, snapshot, timelineOpen, runtimeMetrics, clipboard, setClipboard }, void 0, false, {
            fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
            lineNumber: 2259,
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
                  lineNumber: 2267,
                  columnNumber: 25
                }, this) : /* @__PURE__ */ jsxDEV(ChevronUp, { "aria-hidden": "true" }, void 0, false, {
                  fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
                  lineNumber: 2267,
                  columnNumber: 62
                }, this),
                /* @__PURE__ */ jsxDEV("span", { children: timelineOpen ? "Hide timeline" : "Show timeline" }, void 0, false, {
                  fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
                  lineNumber: 2267,
                  columnNumber: 95
                }, this)
              ]
            },
            void 0,
            true,
            {
              fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
              lineNumber: 2260,
              columnNumber: 7
            },
            this
          ),
          /* @__PURE__ */ jsxDEV("div", { id: "about-editor-timeline-panel", className: "about-editor-bottom", "aria-hidden": !timelineOpen, children: [
            /* @__PURE__ */ jsxDEV("div", { className: "about-editor-contextbar", children: [
              /* @__PURE__ */ jsxDEV("span", { children: [
                /* @__PURE__ */ jsxDEV("strong", { children: selected?.label || "Sequence" }, void 0, false, {
                  fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
                  lineNumber: 2270,
                  columnNumber: 17
                }, this),
                " ",
                selected ? `${selected.type} · ${formatWU(Math.max(0, selectedExtent - 1))} scroll · ${formatWU(selectedExtent)} total${resolvedExtent > selectedExtent + 1e-3 ? ` · ${formatWU(resolvedExtent)} resolved` : ""}` : ""
              ] }, void 0, true, {
                fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
                lineNumber: 2270,
                columnNumber: 11
              }, this),
              selectedCueCount > 1 ? /* @__PURE__ */ jsxDEV("span", { className: "about-editor-selection-count", children: [
                selectedCueCount,
                " titles selected"
              ] }, void 0, true, {
                fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
                lineNumber: 2271,
                columnNumber: 35
              }, this) : null,
              /* @__PURE__ */ jsxDEV("span", { children: snapshot.autoKey ? "Auto-key armed" : "Auto-key off" }, void 0, false, {
                fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
                lineNumber: 2272,
                columnNumber: 11
              }, this),
              /* @__PURE__ */ jsxDEV("button", { type: "button", className: snapshot.autoKey ? "is-active" : "", onClick: () => store.setAutoKey(!snapshot.autoKey), children: "◆ Auto-key" }, void 0, false, {
                fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
                lineNumber: 2273,
                columnNumber: 11
              }, this),
              /* @__PURE__ */ jsxDEV("button", { type: "button", className: loopActive ? "is-active" : "", disabled: !selected, onClick: toggleLoop, children: loopActive ? "Stop audition" : "Loop Section" }, void 0, false, {
                fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
                lineNumber: 2274,
                columnNumber: 11
              }, this),
              /* @__PURE__ */ jsxDEV("button", { type: "button", onClick: fitSequence, children: "Fit sequence" }, void 0, false, {
                fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
                lineNumber: 2275,
                columnNumber: 11
              }, this),
              /* @__PURE__ */ jsxDEV("button", { type: "button", disabled: !compiledSelected, onClick: fitSection, children: "Fit Section" }, void 0, false, {
                fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
                lineNumber: 2276,
                columnNumber: 11
              }, this),
              ["camera", "world", "text"].map((track) => /* @__PURE__ */ jsxDEV("button", { type: "button", className: snapshot.transport.soloTrack === track ? "is-active" : "", onClick: () => toggleSolo(track), children: [
                "Solo ",
                track
              ] }, track, true, {
                fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
                lineNumber: 2277,
                columnNumber: 55
              }, this)),
              timelineDeletion ? /* @__PURE__ */ jsxDEV("button", { type: "button", className: "about-editor-delete-key", disabled: timelineDeletion.disabled, title: timelineDeletion.message || `${timelineDeletion.label} · Delete/Backspace`, onClick: () => deleteTimelineSelection(store, snapshot), children: [
                /* @__PURE__ */ jsxDEV(Trash2, { "aria-hidden": "true" }, void 0, false, {
                  fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
                  lineNumber: 2278,
                  columnNumber: 266
                }, this),
                timelineDeletion.label
              ] }, void 0, true, {
                fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
                lineNumber: 2278,
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
                lineNumber: 2279,
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
                  lineNumber: 2280,
                  columnNumber: 369
                }, this),
                checkpoints.map((item) => /* @__PURE__ */ jsxDEV("option", { value: item.id, children: item.name }, item.id, false, {
                  fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
                  lineNumber: 2280,
                  columnNumber: 456
                }, this))
              ] }, void 0, true, {
                fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
                lineNumber: 2280,
                columnNumber: 33
              }, this) : null
            ] }, void 0, true, {
              fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
              lineNumber: 2269,
              columnNumber: 9
            }, this),
            /* @__PURE__ */ jsxDEV(
              Timeline,
              {
                store,
                snapshot,
                onOpenGlobal: (selection) => {
                  store.setSelection(selection);
                  setMobilePane("inspect");
                }
              },
              void 0,
              false,
              {
                fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
                lineNumber: 2282,
                columnNumber: 9
              },
              this
            )
          ] }, void 0, true, {
            fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
            lineNumber: 2268,
            columnNumber: 7
          }, this),
          /* @__PURE__ */ jsxDEV("nav", { className: "about-editor-mobile-tabs", "aria-label": "Editor panel", children: [
            /* @__PURE__ */ jsxDEV("button", { type: "button", className: mobilePane === "sequence" ? "is-active" : "", onClick: () => setMobilePane("sequence"), children: "Sequence" }, void 0, false, {
              fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
              lineNumber: 2291,
              columnNumber: 75
            }, this),
            /* @__PURE__ */ jsxDEV("button", { type: "button", className: mobilePane === "inspect" ? "is-active" : "", onClick: () => setMobilePane("inspect"), children: "Inspect" }, void 0, false, {
              fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
              lineNumber: 2291,
              columnNumber: 213
            }, this),
            /* @__PURE__ */ jsxDEV("button", { type: "button", className: mobilePane === "preview" ? "is-active" : "", onClick: () => setMobilePane("preview"), children: "Preview" }, void 0, false, {
              fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
              lineNumber: 2291,
              columnNumber: 348
            }, this)
          ] }, void 0, true, {
            fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
            lineNumber: 2291,
            columnNumber: 7
          }, this)
        ]
      },
      void 0,
      true,
      {
        fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
        lineNumber: 2215,
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

//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJtYXBwaW5ncyI6IkFBcVZNLFNBc3pCRixVQXR6QkU7O0FBclZOLFNBQVNBLFdBQVdDLFFBQVFDLFVBQVVDLDRCQUE0QjtBQUNsRSxTQUFTQyxvQkFBb0I7QUFDN0I7QUFBQSxFQUNFQztBQUFBQSxFQUNBQztBQUFBQSxFQUNBQztBQUFBQSxFQUNBQztBQUFBQSxFQUNBQztBQUFBQSxFQUNBQztBQUFBQSxFQUNBQztBQUFBQSxFQUNBQztBQUFBQSxFQUNBQztBQUFBQSxFQUNBQztBQUFBQSxFQUNBQztBQUFBQSxFQUNBQztBQUFBQSxFQUNBQztBQUFBQSxFQUNBQztBQUFBQSxPQUNLO0FBQ1A7QUFBQSxFQUNFQztBQUFBQSxFQUNBQztBQUFBQSxFQUNBQztBQUFBQSxFQUNBQztBQUFBQSxFQUNBQztBQUFBQSxFQUNBQztBQUFBQSxPQUNLO0FBQ1A7QUFBQSxFQUNFQztBQUFBQSxFQUNBQztBQUFBQSxFQUNBQztBQUFBQSxFQUNBQztBQUFBQSxFQUNBQztBQUFBQSxFQUNBQztBQUFBQSxFQUNBQztBQUFBQSxFQUNBQztBQUFBQSxPQUNLO0FBQ1A7QUFBQSxFQUNFQztBQUFBQSxFQUNBQztBQUFBQSxPQUNLO0FBQ1A7QUFBQSxFQUNFQztBQUFBQSxFQUNBQztBQUFBQSxFQUNBQztBQUFBQSxFQUNBQztBQUFBQSxPQUNLO0FBQ1A7QUFBQSxFQUNFQztBQUFBQSxFQUNBQztBQUFBQSxFQUNBQztBQUFBQSxFQUNBQztBQUFBQSxFQUNBQztBQUFBQSxFQUNBQztBQUFBQSxFQUNBQztBQUFBQSxFQUNBQztBQUFBQSxFQUNBQztBQUFBQSxFQUNBQztBQUFBQSxFQUNBQztBQUFBQSxFQUNBQztBQUFBQSxFQUNBQztBQUFBQSxFQUNBQztBQUFBQSxFQUNBQztBQUFBQSxFQUNBQztBQUFBQSxFQUNBQztBQUFBQSxFQUNBQztBQUFBQSxFQUNBQztBQUFBQSxFQUNBQztBQUFBQSxFQUNBQztBQUFBQSxPQUNLO0FBQ1AsT0FBTztBQUVQLE1BQU1DLFVBQVVBLENBQUNDLFVBQVVDLEtBQUtDLElBQUksR0FBR0QsS0FBS0UsSUFBSSxHQUFHSCxLQUFLLENBQUM7QUFDekQsTUFBTUksb0NBQW9DO0FBQzFDLE1BQU1DLHVCQUF1QjtBQUM3QixNQUFNQyxxQkFBcUI7QUFDM0IsTUFBTUMscUJBQXFCLG9CQUFJQyxJQUFJLENBQUMsVUFBVSxnQkFBZ0IsT0FBTyxNQUFNLENBQUM7QUFDNUUsTUFBTUMsd0JBQXdCakQsMkNBQzNCa0QsS0FBSyxDQUFDQyxZQUFZQSxRQUFRQyxPQUFPLEtBQUssR0FBR1QsT0FBTztBQUNuRCxNQUFNVSxpQ0FBaUNDLE9BQU9DLE9BQU87QUFBQSxFQUNuRCxHQUFHO0FBQUEsRUFDSCxHQUFHO0FBQUEsRUFDSCxHQUFHO0FBQUEsRUFDSCxHQUFHO0FBQUEsRUFDSCxHQUFHO0FBQUEsRUFDSCxHQUFHO0FBQ0wsQ0FBQztBQUNELE1BQU1DLHlCQUF5QkYsT0FBT0M7QUFBQUEsRUFBTztBQUFBLElBQzNDRCxPQUFPQyxPQUFPLEVBQUVFLE1BQU0sV0FBV0MsT0FBTyxZQUFZQyxVQUFVTCxPQUFPQyxPQUFPLENBQUMsVUFBVSxDQUFDLEVBQUUsQ0FBQztBQUFBLElBQzNGRCxPQUFPQyxPQUFPLEVBQUVFLE1BQU0sVUFBVUMsT0FBTyxVQUFVQyxVQUFVTCxPQUFPQyxPQUFPLENBQUMsUUFBUSxDQUFDLEVBQUUsQ0FBQztBQUFBLElBQ3RGRCxPQUFPQyxPQUFPLEVBQUVFLE1BQU0sU0FBU0MsT0FBTyxTQUFTQyxVQUFVTCxPQUFPQyxPQUFPLENBQUMsWUFBWSxpQkFBaUIsQ0FBQyxFQUFFLENBQUM7QUFBQSxJQUN6R0QsT0FBT0MsT0FBTyxFQUFFRSxNQUFNLFFBQVFDLE9BQU8sUUFBUUMsVUFBVUwsT0FBT0MsT0FBTyxDQUFDLFlBQVksQ0FBQyxFQUFFLENBQUM7QUFBQSxJQUN0RkQsT0FBT0MsT0FBTyxFQUFFRSxNQUFNLGVBQWVDLE9BQU8sZUFBZUMsVUFBVUwsT0FBT0MsT0FBTyxFQUFFLEVBQUUsQ0FBQztBQUFBLEVBQUM7QUFDMUY7QUFFRCxTQUFTSyxrQkFBa0JDLE1BQU1DLElBQUk7QUFDbkMsTUFBSSxDQUFDRCxRQUFRLENBQUNDLEdBQUksUUFBTztBQUN6QixTQUFPLENBQUMsVUFBVSxjQUFjLEVBQUVDO0FBQUFBLElBQUssQ0FBQ0MsVUFDdENILEtBQUtHLEtBQUssRUFBRUQsS0FBSyxDQUFDdkIsT0FBT3lCLFVBQVV4QixLQUFLeUIsSUFBSTFCLFFBQVFzQixHQUFHRSxLQUFLLEVBQUVDLEtBQUssQ0FBQyxJQUFJLElBQU07QUFBQSxFQUMvRSxLQUFLeEIsS0FBS3lCLElBQUlMLEtBQUtNLE1BQU1MLEdBQUdLLEdBQUcsSUFBSSxRQUFVMUIsS0FBS3lCLElBQUlMLEtBQUtPLE9BQU9OLEdBQUdNLElBQUksSUFBSTtBQUNoRjtBQUVBLFNBQVNDLGVBQWVDLFFBQVFDLFFBQVE7QUFDdENELFNBQU9FLFNBQVMsQ0FBQyxHQUFHRCxPQUFPQyxNQUFNO0FBQ2pDRixTQUFPRyxlQUFlLENBQUMsR0FBR0YsT0FBT0UsWUFBWTtBQUM3Q0gsU0FBT0gsTUFBTUksT0FBT0o7QUFDcEJHLFNBQU9GLE9BQU9HLE9BQU9IO0FBQ3ZCO0FBRUEsU0FBU00sbUJBQW1CQyxXQUFVQyxjQUFjQyxVQUFVO0FBQzVELFFBQU1DLFVBQVVILFVBQVNJLFNBQVNILFlBQVk7QUFDOUMsUUFBTUksTUFBTUYsU0FBU0csT0FBT0MsS0FBS0wsUUFBUTtBQUN6QyxNQUFJLENBQUNHLElBQUs7QUFDVixNQUFJSCxhQUFhLEtBQUtELGVBQWUsR0FBRztBQUN0Q1AsbUJBQWVNLFVBQVNJLFNBQVNILGVBQWUsQ0FBQyxFQUFFSyxPQUFPQyxLQUFLQyxHQUFHLEVBQUUsR0FBR0gsR0FBRztBQUFBLEVBQzVFO0FBQ0EsTUFBSUgsYUFBYUMsUUFBUUcsT0FBT0MsS0FBS0UsU0FBUyxLQUFLUixlQUFlRCxVQUFTSSxTQUFTSyxTQUFTLEdBQUc7QUFDOUZmLG1CQUFlTSxVQUFTSSxTQUFTSCxlQUFlLENBQUMsRUFBRUssT0FBT0MsS0FBSyxDQUFDLEdBQUdGLEdBQUc7QUFBQSxFQUN4RTtBQUNGO0FBRUEsU0FBU0ssb0JBQW9CVixXQUFVQyxjQUFjO0FBQ25ELFFBQU1FLFVBQVVILFVBQVNJLFNBQVNILFlBQVk7QUFDOUMsTUFBSSxDQUFDRSxTQUFTRyxPQUFPQyxLQUFLRSxPQUFRO0FBQ2xDLE1BQUlSLGVBQWUsRUFBR1AsZ0JBQWVTLFFBQVFHLE9BQU9DLEtBQUssQ0FBQyxHQUFHUCxVQUFTSSxTQUFTSCxlQUFlLENBQUMsRUFBRUssT0FBT0MsS0FBS0MsR0FBRyxFQUFFLENBQUM7QUFDbkgsTUFBSVAsZUFBZUQsVUFBU0ksU0FBU0ssU0FBUyxFQUFHZixnQkFBZVMsUUFBUUcsT0FBT0MsS0FBS0MsR0FBRyxFQUFFLEdBQUdSLFVBQVNJLFNBQVNILGVBQWUsQ0FBQyxFQUFFSyxPQUFPQyxLQUFLLENBQUMsQ0FBQztBQUNoSjtBQUVBLFNBQVNJLDJCQUEyQkMsV0FBV0MsY0FBYztBQUMzRCxRQUFNQyxTQUFTRixVQUFVRyxRQUFRLGVBQWU7QUFDaEQsUUFBTUMsU0FBU0YsU0FBU0csaUJBQWlCSCxNQUFNLElBQUk7QUFDbkQsUUFBTUksZUFBZUMsT0FBT0MsV0FBV0osUUFBUUssaUJBQWlCLHVCQUF1QixDQUFDLEtBQUs7QUFDN0YsUUFBTUMsaUJBQWlCVCxlQUNuQk0sT0FBT0MsV0FBV0osUUFBUUssaUJBQWlCLHlCQUF5QixDQUFDLEtBQUssTUFDMUU7QUFDSixRQUFNRSxlQUFldkIsU0FBU3dCLGNBQWMsbUJBQW1CLEdBQUdDLHNCQUFzQixFQUFFQyxPQUNyRkMsT0FBT0M7QUFDWixTQUFPO0FBQUEsSUFDTEMsUUFBUVgsZUFBZS9DO0FBQUFBLElBQ3ZCMkQsWUFBWWpCLGVBQWVjLE9BQU9DLGNBQWNOLGlCQUFpQkMsZ0JBQWdCcEQ7QUFBQUEsRUFDbkY7QUFDRjtBQUVBLFNBQVM0RCx1QkFBdUJuQixXQUFXb0IsVUFBVW5CLGNBQWM7QUFDakUsUUFBTSxFQUFFZ0IsUUFBUUMsVUFBVSxJQUFJbkIsMkJBQTJCQyxXQUFXQyxZQUFZO0FBQ2hGLFFBQU1vQixXQUFXbkUsS0FBS0UsSUFBSSxLQUFLMkQsT0FBT08sYUFBYy9ELHFCQUFxQixDQUFFO0FBQzNFLFFBQU1nRSxRQUFRckUsS0FBS0MsSUFBSWlFLFNBQVNHLE9BQU9GLFFBQVE7QUFDL0MsUUFBTUcsa0JBQWtCdEUsS0FBS0UsSUFBSSxLQUFLOEQsWUFBWUQsTUFBTTtBQUN4RCxRQUFNUSxTQUFTdkUsS0FBS0MsSUFBSWlFLFNBQVNLLFFBQVFELGVBQWU7QUFDeEQsUUFBTUUsVUFBVXhFLEtBQUtFLElBQUlHLG9CQUFvQndELE9BQU9PLGFBQWFDLFFBQVFoRSxrQkFBa0I7QUFDM0YsUUFBTW9FLFNBQVN6RSxLQUFLRSxJQUFJNkQsUUFBUUMsWUFBWU8sTUFBTTtBQUNsRCxTQUFPO0FBQUEsSUFDTEcsTUFBTTFFLEtBQUtDLElBQUl1RSxTQUFTeEUsS0FBS0UsSUFBSUcsb0JBQW9CNkQsU0FBU1EsSUFBSSxDQUFDO0FBQUEsSUFDbkVkLEtBQUs1RCxLQUFLQyxJQUFJd0UsUUFBUXpFLEtBQUtFLElBQUk2RCxRQUFRRyxTQUFTTixHQUFHLENBQUM7QUFBQSxJQUNwRFM7QUFBQUEsSUFDQUU7QUFBQUEsRUFDRjtBQUNGO0FBRUEsU0FBU0ksZ0JBQWdCekMsV0FBVTBDLFdBQVc7QUFDNUMsU0FBTzFDLFVBQVNJLFNBQVN1QyxVQUFVLENBQUN4QyxZQUFZQSxRQUFRMUIsT0FBT2lFLFNBQVM7QUFDMUU7QUFFQSxTQUFTRSxXQUFXNUMsV0FBVTZDLFdBQVc7QUFDdkMsUUFBTUgsWUFBWUcsVUFBVUgsYUFBYTFDLFVBQVNJLFNBQVMsQ0FBQyxHQUFHM0I7QUFDL0QsU0FBT3VCLFVBQVNJLFNBQVM3QixLQUFLLENBQUM0QixZQUFZQSxRQUFRMUIsT0FBT2lFLFNBQVMsS0FBSzFDLFVBQVNJLFNBQVMsQ0FBQztBQUM3RjtBQUVBLFNBQVMwQyxpQkFBaUJDLE1BQU01QyxTQUFTNkMsU0FBUztBQUNoRCxRQUFNQyxXQUFXRixNQUFNM0MsVUFBVTdCLEtBQUssQ0FBQzJFLFNBQVNBLEtBQUt6RSxPQUFPMEIsUUFBUTFCLEVBQUU7QUFDdEUsU0FBT3dFLFdBQVdyRixTQUFTb0YsVUFBVUMsU0FBU0UsV0FBV0YsU0FBU0csUUFBUSxJQUFJO0FBQ2hGO0FBRUEsU0FBU0MsU0FBU3hGLE9BQU87QUFDdkIsU0FBTyxHQUFHc0QsT0FBT3RELFNBQVMsQ0FBQyxFQUFFeUYsUUFBUSxDQUFDLENBQUM7QUFDekM7QUFFQSxTQUFTQyxvQkFBb0IxRixPQUFPO0FBQ2xDLFNBQU8sR0FBR3NELFFBQVFBLE9BQU90RCxLQUFLLElBQUksS0FBS3lGLFFBQVEsQ0FBQyxDQUFDLENBQUM7QUFDcEQ7QUFFQSxTQUFTRSxvQkFBb0I3RCxRQUFRO0FBQ25DLFNBQU9BLGtCQUFrQjhELGdCQUNuQjlELE9BQU8rRCxRQUFRLHlCQUF5QixLQUFLL0QsT0FBT2dFO0FBQzVEO0FBRUEsU0FBU0MscUJBQXFCQyxVQUFVO0FBQ3RDLFFBQU1kLE9BQU9jLFNBQVNDO0FBQ3RCLE1BQUksQ0FBQ2YsTUFBTTNDLFVBQVVLLE9BQVEsUUFBTztBQUNwQyxRQUFNc0QsU0FBUztBQUNmaEIsT0FBSzNDLFNBQVM0RCxRQUFRLENBQUNmLFVBQVVoRCxpQkFBaUI7QUFDaEQsVUFBTUUsVUFBVTBELFNBQVM3RCxTQUFTSSxTQUFTSCxZQUFZO0FBQ3ZELFVBQU1nRSxZQUFZQSxDQUFDekQsT0FBT3lDLFNBQVNFLFVBQVdoQyxPQUFPWCxNQUFNLENBQUMsSUFBSXlDLFNBQVNHO0FBQ3pFakQsWUFBUUcsT0FBT0MsS0FBS3lELFFBQVEsQ0FBQzNELEtBQUtILGFBQWE7QUFDN0MsVUFBSUcsSUFBSUcsT0FBTyxLQUFLSCxJQUFJRyxPQUFPLEVBQUc7QUFDbEN1RCxhQUFPRyxLQUFLO0FBQUEsUUFDVmxCLFNBQVNpQixVQUFVNUQsSUFBSUcsRUFBRTtBQUFBLFFBQ3pCMkQsVUFBVTtBQUFBLFFBQ1Z0QixXQUFXLEVBQUV1QixNQUFNLGNBQWMxQixXQUFXdkMsUUFBUTFCLElBQUl5QixTQUFTO0FBQUEsTUFDbkUsQ0FBQztBQUFBLElBQ0gsQ0FBQztBQUNELFFBQUlDLFFBQVFrRSxNQUFNQyxTQUFTLFNBQVNuRSxRQUFRa0UsTUFBTUUsYUFBYUgsU0FBUyxPQUFPO0FBQzdFLE9BQUMsU0FBUyxLQUFLLEVBQUVKLFFBQVEsQ0FBQ1EsTUFBTUMsY0FBY1YsT0FBT0csS0FBSztBQUFBLFFBQ3hEbEIsU0FBU2lCLFVBQVU5RCxRQUFRa0UsTUFBTUUsYUFBYUMsSUFBSSxDQUFDO0FBQUEsUUFDbkRMLFVBQVUsS0FBS007QUFBQUEsUUFDZjVCLFdBQVcsRUFBRXVCLE1BQU0sU0FBUzFCLFdBQVd2QyxRQUFRMUIsSUFBSWlHLFNBQVMsY0FBY0YsSUFBSSxHQUFHO0FBQUEsTUFDbkYsQ0FBQyxDQUFDO0FBQUEsSUFDSjtBQUNBLEtBQUNyRSxRQUFRd0UsS0FBS0MsUUFBUSxJQUFJWixRQUFRLENBQUNhLEtBQUtDLGFBQWE7QUFDbkRmLGFBQU9HLEtBQUs7QUFBQSxRQUNWbEIsU0FBU2lCLFVBQVVZLElBQUlFLElBQUk7QUFBQSxRQUMzQlosVUFBVSxLQUFLVztBQUFBQSxRQUNmakMsV0FBVyxFQUFFdUIsTUFBTSxPQUFPMUIsV0FBV3ZDLFFBQVExQixJQUFJdUcsT0FBT0gsSUFBSXBHLElBQUlpRyxTQUFTLFFBQVE7QUFBQSxNQUNuRixDQUFDO0FBQUEsSUFDSCxDQUFDO0FBQ0QsUUFBSXZFLFFBQVF3RSxLQUFLTSxrQkFBa0I7QUFDakNsQixhQUFPRyxLQUFLO0FBQUEsUUFDVmxCLFNBQVNpQixVQUFVOUQsUUFBUXdFLEtBQUtNLGlCQUFpQkMsS0FBSztBQUFBLFFBQ3REZixVQUFVO0FBQUEsUUFDVnRCLFdBQVcsRUFBRXVCLE1BQU0scUJBQXFCMUIsV0FBV3ZDLFFBQVExQixHQUFHO0FBQUEsTUFDaEUsQ0FBQztBQUFBLElBQ0g7QUFDQSxRQUFJMEIsUUFBUWdGLGFBQWFmLFNBQVMsVUFBVWpELE9BQU9pRSxTQUFTakYsUUFBUWdGLFlBQVlFLGVBQWUsR0FBRztBQUNoR3RCLGFBQU9HLEtBQUs7QUFBQSxRQUNWbEIsU0FBU2lCLFVBQVU5RCxRQUFRZ0YsWUFBWUUsZUFBZTtBQUFBLFFBQ3REbEIsVUFBVTtBQUFBLFFBQ1Z0QixXQUFXLEVBQUV1QixNQUFNLGVBQWUxQixXQUFXdkMsUUFBUTFCLElBQUlpRyxTQUFTLGFBQWE7QUFBQSxNQUNqRixDQUFDO0FBQUEsSUFDSDtBQUFBLEVBQ0YsQ0FBQztBQUNELFNBQU9YLE9BQU91QixLQUFLLENBQUNDLEdBQUdDLE1BQU9ELEVBQUV2QyxVQUFVd0MsRUFBRXhDLFdBQWF1QyxFQUFFcEIsV0FBV3FCLEVBQUVyQixRQUFTO0FBQ25GO0FBRUEsU0FBU3NCLG9CQUFvQjVCLFVBQVU7QUFDckMsUUFBTSxFQUFFaEIsV0FBVzdDLG9CQUFTLElBQUk2RDtBQUNoQyxRQUFNNUQsZUFBZXdDLGdCQUFnQnpDLFdBQVU2QyxVQUFVSCxTQUFTO0FBQ2xFLFFBQU12QyxVQUFVSCxVQUFTSSxTQUFTSCxZQUFZO0FBQzlDLE1BQUksQ0FBQ0UsUUFBUyxRQUFPO0FBQ3JCLE1BQUkwQyxVQUFVdUIsU0FBUyxjQUFjO0FBQ25DLFVBQU0vRCxNQUFNRixRQUFRRyxPQUFPQyxLQUFLc0MsVUFBVTNDLFFBQVE7QUFDbEQsUUFBSSxDQUFDRyxJQUFLLFFBQU87QUFDakIsVUFBTXFGLFdBQVdyRixJQUFJRyxPQUFPLEtBQUtILElBQUlHLE9BQU87QUFDNUMsV0FBTztBQUFBLE1BQ0x6QixPQUFPMkcsV0FBVyx3QkFBd0I7QUFBQSxNQUMxQ0MsVUFBVUQ7QUFBQUEsTUFDVkUsU0FBU0YsV0FBVyxxRkFBcUY7QUFBQSxNQUN6R0csU0FBU0EsQ0FBQ0MsVUFBVUEsTUFBTUMsT0FBTyxxQkFBcUIsQ0FBQ0MsVUFBVTtBQUMvREEsY0FBTTVGLFNBQVNILFlBQVksRUFBRUssT0FBT0MsS0FBSzBGLE9BQU9wRCxVQUFVM0MsVUFBVSxDQUFDO0FBQUEsTUFDdkUsR0FBRyxFQUFFMkMsV0FBVyxFQUFFdUIsTUFBTSxXQUFXMUIsV0FBV3ZDLFFBQVExQixHQUFHLEVBQUUsQ0FBQztBQUFBLElBQzlEO0FBQUEsRUFDRjtBQUNBLE1BQUlvRSxVQUFVdUIsU0FBUyxXQUFXdkIsVUFBVTZCLFNBQVN3QixXQUFXLGFBQWEsR0FBRztBQUM5RSxXQUFPO0FBQUEsTUFDTG5ILE9BQU87QUFBQSxNQUNQNEcsVUFBVTtBQUFBLE1BQ1ZDLFNBQVM7QUFBQSxNQUNUQyxTQUFTQSxDQUFDQyxVQUFVQSxNQUFNQyxPQUFPLDJCQUEyQixDQUFDQyxVQUFVO0FBQ3JFLGNBQU1HLGFBQWFILE1BQU01RixTQUFTSCxZQUFZLEVBQUVvRSxNQUFNRTtBQUN0RDRCLG1CQUFXakIsUUFBUTtBQUNuQmlCLG1CQUFXQyxNQUFNO0FBQ2pCRCxtQkFBVy9CLE9BQU87QUFBQSxNQUNwQixHQUFHLEVBQUV2QixXQUFXLEVBQUV1QixNQUFNLFNBQVMxQixXQUFXdkMsUUFBUTFCLEdBQUcsRUFBRSxDQUFDO0FBQUEsSUFDNUQ7QUFBQSxFQUNGO0FBQ0EsTUFBSW9FLFVBQVV1QixTQUFTLGlCQUFpQnZCLFVBQVU2QixZQUFZLGNBQWM7QUFDMUUsV0FBTztBQUFBLE1BQ0wzRixPQUFPO0FBQUEsTUFDUDRHLFVBQVU7QUFBQSxNQUNWQyxTQUFTO0FBQUEsTUFDVEMsU0FBU0EsQ0FBQ0MsVUFBVUEsTUFBTUMsT0FBTywwQkFBMEIsQ0FBQ0MsVUFBVTtBQUNwRUEsY0FBTTVGLFNBQVNILFlBQVksRUFBRWtGLGNBQWMsRUFBRWYsTUFBTSxPQUFPO0FBQUEsTUFDNUQsR0FBRyxFQUFFdkIsV0FBVyxFQUFFdUIsTUFBTSxXQUFXMUIsV0FBV3ZDLFFBQVExQixHQUFHLEVBQUUsQ0FBQztBQUFBLElBQzlEO0FBQUEsRUFDRjtBQUNBLFNBQU87QUFDVDtBQUVBLFNBQVM0SCx3QkFBd0JQLE9BQU9qQyxVQUFVO0FBQ2hELFFBQU15QyxXQUFXYixvQkFBb0I1QixRQUFRO0FBQzdDLE1BQUksQ0FBQ3lDLFNBQVUsUUFBTztBQUN0QixNQUFJQSxTQUFTWCxVQUFVO0FBQ3JCRyxVQUFNUyxhQUFhLEVBQUVYLFNBQVNVLFNBQVNWLFFBQVEsQ0FBQztBQUNoRCxXQUFPO0FBQUEsRUFDVDtBQUNBVSxXQUFTVCxRQUFRQyxLQUFLO0FBQ3RCLFNBQU87QUFDVDtBQUVBLFNBQVNVLHFCQUFxQlYsT0FBT1csT0FBTztBQUMxQyxNQUFJLENBQUNBLE1BQU87QUFDWlgsUUFBTVksYUFBYUQsTUFBTTVELFNBQVM7QUFDbENpRCxRQUFNYSxhQUFhLEVBQUVDLE9BQU8sWUFBWUMsU0FBUyxPQUFPN0QsU0FBU3lELE1BQU16RCxRQUFRLENBQUM7QUFDbEY7QUFFQSxTQUFTOEQscUJBQXFCaEIsT0FBT2pDLFVBQVVrRCxXQUFXO0FBQ3hELFFBQU1oRCxTQUFTSCxxQkFBcUJDLFFBQVE7QUFDNUMsUUFBTW1ELFlBQVluRCxTQUFTb0QsVUFBVWpFO0FBQ3JDLFFBQU1rRSxpQkFBaUJILFlBQVksSUFDL0JoRCxPQUFPeEYsS0FBSyxDQUFDa0ksV0FBVUEsT0FBTXpELFVBQVVnRSxZQUFZOUksb0JBQW9CLEdBQUc4RSxVQUMxRSxDQUFDLEdBQUdlLE1BQU0sRUFBRW9ELFFBQVEsRUFBRTVJLEtBQUssQ0FBQ2tJLFdBQVVBLE9BQU16RCxVQUFVZ0UsWUFBWTlJLG9CQUFvQixHQUFHOEU7QUFDN0YsUUFBTXlELFFBQVF0RixPQUFPaUUsU0FBUzhCLGNBQWMsSUFDeENuRCxPQUFPeEYsS0FBSyxDQUFDMkUsU0FBU3BGLEtBQUt5QixJQUFJMkQsS0FBS0YsVUFBVWtFLGNBQWMsSUFBSWhKLG9CQUFvQixJQUNwRjtBQUNKc0ksdUJBQXFCVixPQUFPVyxLQUFLO0FBQ25DO0FBRUEsU0FBU1csU0FBU3ZKLE9BQU87QUFDdkIsU0FBT0EsTUFBTXdKLFlBQVksRUFBRUMsUUFBUSxlQUFlLEdBQUcsRUFBRUEsUUFBUSxVQUFVLEVBQUUsS0FBSztBQUNsRjtBQUVBLFNBQVNDLE9BQU92SCxXQUFVd0gsTUFBTTtBQUM5QixRQUFNQyxPQUFPLElBQUlwSixJQUFJMkIsVUFBU0ksU0FBU3NIO0FBQUFBLElBQVEsQ0FBQ3ZILFlBQVk7QUFBQSxNQUMxREEsUUFBUTFCO0FBQUFBLE1BQ1IsSUFBSTBCLFFBQVF3RSxLQUFLQyxRQUFRLElBQUkrQyxJQUFJLENBQUM5QyxRQUFRQSxJQUFJcEcsRUFBRTtBQUFBLE1BQ2hELElBQUkwQixRQUFRd0UsS0FBS2lELFVBQVUsSUFBSUQsSUFBSSxDQUFDRSxVQUFVQSxNQUFNcEosRUFBRTtBQUFBLE1BQ3RELEdBQUkwQixRQUFRd0UsS0FBS00sbUJBQW1CLENBQUM5RSxRQUFRd0UsS0FBS00saUJBQWlCeEcsRUFBRSxJQUFJO0FBQUEsSUFBRztBQUFBLEVBQzdFLENBQUM7QUFDRixNQUFJQSxLQUFLMkksU0FBU0ksSUFBSTtBQUN0QixNQUFJTSxTQUFTO0FBQ2IsU0FBT0wsS0FBS00sSUFBSXRKLEVBQUUsR0FBRztBQUNuQkEsU0FBSyxHQUFHMkksU0FBU0ksSUFBSSxDQUFDLElBQUlNLE1BQU07QUFDaENBLGNBQVU7QUFBQSxFQUNaO0FBQ0EsU0FBT3JKO0FBQ1Q7QUFFQSxTQUFTdUoscUJBQXFCaEMsT0FBT2lDLGNBQWM7QUFDakR0SixTQUFPNEIsS0FBS3lGLEtBQUssRUFBRWhDLFFBQVEsQ0FBQzNELFFBQVEsT0FBTzJGLE1BQU0zRixHQUFHLENBQUM7QUFDckQxQixTQUFPdUosT0FBT2xDLE9BQU85Siw0QkFBNEIrTCxZQUFZLENBQUM7QUFDaEU7QUFFQSxTQUFTRSxjQUFjbkMsT0FBT29DLE9BQU87QUFDbkNBLFFBQU1wRSxRQUFRLENBQUNxRSxTQUFTO0FBQ3RCLFVBQU1sSSxVQUFVNkYsTUFBTTVGLFNBQVM3QixLQUFLLENBQUMyRSxTQUFTQSxLQUFLekUsT0FBTzRKLEtBQUszRixTQUFTO0FBQ3hFLFVBQU1tQyxNQUFNMUUsU0FBU3dFLE1BQU1DLE1BQU1yRyxLQUFLLENBQUMyRSxTQUFTQSxLQUFLekUsT0FBTzRKLEtBQUtyRCxLQUFLO0FBQ3RFLFFBQUlILElBQUtsRyxRQUFPdUosT0FBT3JELEtBQUssRUFBRXlELE9BQU9ELEtBQUtDLE9BQU92RCxNQUFNc0QsS0FBS3RELE1BQU13RCxNQUFNRixLQUFLRSxLQUFLLENBQUM7QUFBQSxFQUNyRixDQUFDO0FBQ0g7QUFFQSxTQUFTQyxTQUFTLEVBQUV6SixPQUFPMEosVUFBVUMsT0FBTyxHQUFHLEdBQUc7QUFDaEQsU0FDRSx1QkFBQyxXQUFNLFdBQVUseUJBQ2Y7QUFBQSwyQkFBQyxVQUFNM0osbUJBQVA7QUFBQTtBQUFBO0FBQUE7QUFBQSxXQUFhO0FBQUEsSUFDWjBKO0FBQUFBLElBQ0FDLE9BQU8sdUJBQUMsV0FBT0Esa0JBQVI7QUFBQTtBQUFBO0FBQUE7QUFBQSxXQUFhLElBQVc7QUFBQSxPQUhsQztBQUFBO0FBQUE7QUFBQTtBQUFBLFNBSUE7QUFFSjtBQUFDQyxLQVJRSDtBQVVULFNBQVNJLGVBQWUsRUFBRTdKLE9BQU9sQixPQUFPRSxLQUFLQyxLQUFLNkssTUFBTUMsVUFBVUMsT0FBTyxJQUFJcEQsV0FBVyxNQUFNLEdBQUc7QUFDL0YsU0FDRSx1QkFBQyxZQUFTLE9BQ1IsaUNBQUMsU0FBSSxXQUFVLHVCQUNiO0FBQUE7QUFBQSxNQUFDO0FBQUE7QUFBQSxRQUNDLE1BQUs7QUFBQSxRQUNMO0FBQUEsUUFDQTtBQUFBLFFBQ0E7QUFBQSxRQUNBO0FBQUEsUUFDQTtBQUFBLFFBQ0EsVUFBVSxDQUFDYyxVQUFVcUMsU0FBUzNILE9BQU9zRixNQUFNOUcsT0FBTzlCLEtBQUssQ0FBQztBQUFBO0FBQUEsTUFQMUQ7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBLElBTzREO0FBQUEsSUFFNUQ7QUFBQSxNQUFDO0FBQUE7QUFBQSxRQUNDLE1BQUs7QUFBQSxRQUNMO0FBQUEsUUFDQTtBQUFBLFFBQ0E7QUFBQSxRQUNBO0FBQUEsUUFDQTtBQUFBLFFBQ0EsVUFBVSxDQUFDNEksVUFBVXFDLFNBQVMzSCxPQUFPc0YsTUFBTTlHLE9BQU85QixLQUFLLENBQUM7QUFBQTtBQUFBLE1BUDFEO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQSxJQU80RDtBQUFBLElBRTNEa0wsT0FBTyx1QkFBQyxRQUFJQSxrQkFBTDtBQUFBO0FBQUE7QUFBQTtBQUFBLFdBQVUsSUFBUTtBQUFBLE9BbkI1QjtBQUFBO0FBQUE7QUFBQTtBQUFBLFNBb0JBLEtBckJGO0FBQUE7QUFBQTtBQUFBO0FBQUEsU0FzQkE7QUFFSjtBQUFDQyxNQTFCUUo7QUE0QlQsU0FBU0ssY0FBYyxFQUFFbEssT0FBT21HLE9BQU9rQixLQUFLckksS0FBS0MsS0FBSzZLLE1BQU1LLGVBQWVDLGFBQWFULE9BQU8sR0FBRyxHQUFHO0FBQ25HLFFBQU1VLGdCQUFpQmxFLFFBQVFuSCxPQUFPRCxLQUFLRSxJQUFJLE1BQVNBLE1BQU1ELEdBQUcsSUFBSztBQUN0RSxRQUFNc0wsY0FBZWpELE1BQU1ySSxPQUFPRCxLQUFLRSxJQUFJLE1BQVNBLE1BQU1ELEdBQUcsSUFBSztBQUNsRSxRQUFNdUwsaUJBQWlCVCxPQUFPO0FBQzlCLFFBQU1VLFdBQVdBLENBQUMxTCxVQUFVcUwsY0FBY3BMLEtBQUtDLElBQUlxSSxNQUFNeUMsTUFBTS9LLEtBQUtFLElBQUlELEtBQUtvRCxPQUFPdEQsS0FBSyxLQUFLLENBQUMsQ0FBQyxDQUFDO0FBQ2pHLFFBQU0yTCxTQUFTQSxDQUFDM0wsVUFBVXNMLFlBQVlyTCxLQUFLRSxJQUFJa0gsUUFBUTJELE1BQU0vSyxLQUFLQyxJQUFJQyxLQUFLbUQsT0FBT3RELEtBQUssS0FBSyxDQUFDLENBQUMsQ0FBQztBQUMvRixTQUNFO0FBQUEsSUFBQztBQUFBO0FBQUEsTUFDQyxXQUFVO0FBQUEsTUFDVix1QkFBb0I7QUFBQSxNQUNwQixPQUFPLEVBQUUsdUJBQXVCLEdBQUd1TCxZQUFZLEtBQUsscUJBQXFCLEdBQUdDLFVBQVUsSUFBSTtBQUFBLE1BRTFGO0FBQUEsK0JBQUMsWUFBUXRLLG1CQUFUO0FBQUE7QUFBQTtBQUFBO0FBQUEsZUFBZTtBQUFBLFFBQ2YsdUJBQUMsU0FBSSxXQUFVLDJCQUNiO0FBQUEsaUNBQUMsVUFBSyxlQUFZLFVBQWxCO0FBQUE7QUFBQTtBQUFBO0FBQUEsaUJBQXdCO0FBQUEsVUFDeEIsdUJBQUMsV0FBTSxNQUFLLFNBQVEsY0FBWSxHQUFHQSxLQUFLLFVBQVUsS0FBVSxLQUFLcUgsTUFBTXlDLE1BQU0sTUFBWSxPQUFPM0QsT0FBTyxVQUFVLENBQUN1QixVQUFVOEMsU0FBUzlDLE1BQU05RyxPQUFPOUIsS0FBSyxLQUF2SjtBQUFBO0FBQUE7QUFBQTtBQUFBLGlCQUF5SjtBQUFBLFVBQ3pKLHVCQUFDLFdBQU0sTUFBSyxTQUFRLGNBQVksR0FBR2tCLEtBQUssUUFBUSxLQUFLbUcsUUFBUTJELE1BQU0sS0FBVSxNQUFZLE9BQU96QyxLQUFLLFVBQVUsQ0FBQ0ssVUFBVStDLE9BQU8vQyxNQUFNOUcsT0FBTzlCLEtBQUssS0FBbko7QUFBQTtBQUFBO0FBQUE7QUFBQSxpQkFBcUo7QUFBQSxhQUh2SjtBQUFBO0FBQUE7QUFBQTtBQUFBLGVBSUE7QUFBQSxRQUNBLHVCQUFDLFNBQUksV0FBVSw2QkFDYjtBQUFBLGlDQUFDLFdBQU07QUFBQSxtQ0FBQyxVQUFLLHNCQUFOO0FBQUE7QUFBQTtBQUFBO0FBQUEsbUJBQVk7QUFBQSxZQUFPLHVCQUFDLFdBQU0sTUFBSyxVQUFTLEtBQUtFLE1BQU0sS0FBSyxNQUFNcUksTUFBTXlDLFFBQVEsS0FBSyxNQUFNUyxnQkFBZ0IsT0FBT3hMLEtBQUsyTCxNQUFNdkUsUUFBUSxHQUFHLEdBQUcsVUFBVSxDQUFDdUIsVUFBVThDLFNBQVNwSSxPQUFPc0YsTUFBTTlHLE9BQU85QixLQUFLLElBQUksR0FBRyxLQUFsTDtBQUFBO0FBQUE7QUFBQTtBQUFBLG1CQUFvTDtBQUFBLFlBQUcsdUJBQUMsUUFBRyxpQkFBSjtBQUFBO0FBQUE7QUFBQTtBQUFBLG1CQUFLO0FBQUEsZUFBdE47QUFBQTtBQUFBO0FBQUE7QUFBQSxpQkFBMk47QUFBQSxVQUMzTix1QkFBQyxPQUFFLGVBQVksUUFBTyxpQkFBdEI7QUFBQTtBQUFBO0FBQUE7QUFBQSxpQkFBdUI7QUFBQSxVQUN2Qix1QkFBQyxXQUFNO0FBQUEsbUNBQUMsVUFBSyxvQkFBTjtBQUFBO0FBQUE7QUFBQTtBQUFBLG1CQUFVO0FBQUEsWUFBTyx1QkFBQyxXQUFNLE1BQUssVUFBUyxNQUFNcUgsUUFBUTJELFFBQVEsS0FBSyxLQUFLN0ssTUFBTSxLQUFLLE1BQU1zTCxnQkFBZ0IsT0FBT3hMLEtBQUsyTCxNQUFNckQsTUFBTSxHQUFHLEdBQUcsVUFBVSxDQUFDSyxVQUFVK0MsT0FBT3JJLE9BQU9zRixNQUFNOUcsT0FBTzlCLEtBQUssSUFBSSxHQUFHLEtBQWhMO0FBQUE7QUFBQTtBQUFBO0FBQUEsbUJBQWtMO0FBQUEsWUFBRyx1QkFBQyxRQUFHLGlCQUFKO0FBQUE7QUFBQTtBQUFBO0FBQUEsbUJBQUs7QUFBQSxlQUFsTjtBQUFBO0FBQUE7QUFBQTtBQUFBLGlCQUF1TjtBQUFBLGFBSHpOO0FBQUE7QUFBQTtBQUFBO0FBQUEsZUFJQTtBQUFBLFFBQ0M2SyxPQUFPLHVCQUFDLFdBQU9BLGtCQUFSO0FBQUE7QUFBQTtBQUFBO0FBQUEsZUFBYSxJQUFXO0FBQUE7QUFBQTtBQUFBLElBaEJsQztBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUEsRUFpQkE7QUFFSjtBQUFDZ0IsTUExQlFUO0FBNEJULFNBQVNVLFVBQVUsRUFBRTdELE9BQU9qQyxTQUFTLEdBQUc7QUFDdEMsUUFBTSxFQUFFb0QsV0FBV25ELGFBQWEsSUFBSUQ7QUFDcEMsUUFBTStGLFFBQVE5RixjQUFjK0YsY0FBYztBQUMxQyxRQUFNQyxPQUFPQSxNQUFNaEUsTUFBTWEsYUFBYTtBQUFBLElBQ3BDQyxPQUFPSyxVQUFVSixVQUFVLGFBQWE7QUFBQSxJQUN4Q0EsU0FBUyxDQUFDSSxVQUFVSjtBQUFBQSxJQUNwQjdELFNBQVNpRSxVQUFVakU7QUFBQUEsRUFDckIsQ0FBQztBQUNELFFBQU0rRyxPQUFPQSxDQUFDL0csWUFBWThDLE1BQU1hLGFBQWEsRUFBRUMsT0FBTyxZQUFZQyxTQUFTLE9BQU83RCxRQUFRLENBQUM7QUFDM0YsUUFBTWdILFdBQVduRyxTQUFTaEIsVUFBVXVCLFNBQVMsYUFDekMsT0FDQXhCLFdBQVdpQixTQUFTN0QsVUFBVTZELFNBQVNoQixTQUFTO0FBQ3BELFFBQU01QyxlQUFld0MsZ0JBQWdCb0IsU0FBUzdELFVBQVVnSyxTQUFTdkwsRUFBRTtBQUNuRSxRQUFNd0wsY0FBY0EsQ0FBQ2xELGNBQWM7QUFDakMsVUFBTW1ELE9BQU9yRyxTQUFTQyxhQUFhMUQsU0FBU3RDLEtBQUtFLElBQUksR0FBR0YsS0FBS0MsSUFBSThGLFNBQVNDLGFBQWExRCxTQUFTSyxTQUFTLEdBQUdSLGVBQWU4RyxTQUFTLENBQUMsQ0FBQztBQUN0SSxRQUFJbUQsS0FBTUgsTUFBS0csS0FBSy9HLE9BQU87QUFBQSxFQUM3QjtBQUNBLFNBQ0UsdUJBQUMsU0FBSSxXQUFVLDBCQUNiO0FBQUEsMkJBQUMsWUFBTyxNQUFLLFVBQVMsT0FBTSxvQkFBbUIsY0FBVyxvQkFBbUIsU0FBUyxNQUFNOEcsWUFBWSxFQUFFLEdBQUcsaUNBQUMsWUFBUyxlQUFZLFVBQXRCO0FBQUE7QUFBQTtBQUFBO0FBQUEsV0FBNEIsS0FBekk7QUFBQTtBQUFBO0FBQUE7QUFBQSxXQUE0STtBQUFBLElBQzVJLHVCQUFDLFlBQU8sTUFBSyxVQUFTLE9BQU0sa0NBQWlDLGNBQVcscUJBQW9CLFNBQVMsTUFBTW5ELHFCQUFxQmhCLE9BQU9qQyxVQUFVLEVBQUUsR0FBRyxpQ0FBQyxlQUFZLGVBQVksVUFBekI7QUFBQTtBQUFBO0FBQUE7QUFBQSxXQUErQixLQUFyTDtBQUFBO0FBQUE7QUFBQTtBQUFBLFdBQXdMO0FBQUEsSUFDeEwsdUJBQUMsWUFBTyxNQUFLLFVBQVMsV0FBVSxjQUFhLE9BQU9vRCxVQUFVSixVQUFVLFVBQVUsUUFBUSxjQUFZSSxVQUFVSixVQUFVLFVBQVUsUUFBUSxTQUFTaUQsTUFDbEo3QyxvQkFBVUosVUFBVSx1QkFBQyxTQUFNLGVBQVksVUFBbkI7QUFBQTtBQUFBO0FBQUE7QUFBQSxXQUF5QixJQUFNLHVCQUFDLFFBQUssZUFBWSxVQUFsQjtBQUFBO0FBQUE7QUFBQTtBQUFBLFdBQXdCLEtBRDlFO0FBQUE7QUFBQTtBQUFBO0FBQUEsV0FFQTtBQUFBLElBQ0EsdUJBQUMsWUFBTyxNQUFLLFVBQVMsT0FBTSxnQkFBZSxjQUFXLGdCQUFlLFNBQVMsTUFBTW9ELFlBQVksQ0FBQyxHQUFHLGlDQUFDLGVBQVksZUFBWSxVQUF6QjtBQUFBO0FBQUE7QUFBQTtBQUFBLFdBQStCLEtBQW5JO0FBQUE7QUFBQTtBQUFBO0FBQUEsV0FBc0k7QUFBQSxJQUN0SSx1QkFBQyxZQUFPLE1BQUssVUFBUyxPQUFNLCtCQUE4QixjQUFXLGlCQUFnQixTQUFTLE1BQU1uRCxxQkFBcUJoQixPQUFPakMsVUFBVSxDQUFDLEdBQUcsaUNBQUMsZ0JBQWEsZUFBWSxVQUExQjtBQUFBO0FBQUE7QUFBQTtBQUFBLFdBQWdDLEtBQTlLO0FBQUE7QUFBQTtBQUFBO0FBQUEsV0FBaUw7QUFBQSxJQUNqTCx1QkFBQyxZQUFRUixtQkFBUzRELFVBQVVqRSxPQUFPLEtBQW5DO0FBQUE7QUFBQTtBQUFBO0FBQUEsV0FBcUM7QUFBQSxJQUNyQztBQUFBLE1BQUM7QUFBQTtBQUFBLFFBQ0MsY0FBVztBQUFBLFFBQ1gsTUFBSztBQUFBLFFBQ0wsS0FBSTtBQUFBLFFBQ0osS0FBSzRHO0FBQUFBLFFBQ0wsTUFBSztBQUFBLFFBQ0wsT0FBTzlMLEtBQUtDLElBQUk2TCxPQUFPM0MsVUFBVWpFLE9BQU87QUFBQSxRQUN4QyxVQUFVLENBQUN5RCxVQUFVc0QsS0FBSzVJLE9BQU9zRixNQUFNOUcsT0FBTzlCLEtBQUssQ0FBQztBQUFBO0FBQUEsTUFQdEQ7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBLElBT3dEO0FBQUEsSUFFeEQ7QUFBQSxNQUFDO0FBQUE7QUFBQSxRQUNDLE1BQUs7QUFBQSxRQUNMLFdBQVdvSixVQUFVTCxVQUFVLFdBQVcsY0FBYztBQUFBLFFBQ3hELFNBQVMsTUFBTWQsTUFBTWEsYUFBYSxFQUFFQyxPQUFPLFVBQVVDLFNBQVMsTUFBTSxDQUFDO0FBQUEsUUFBRTtBQUFBO0FBQUEsTUFIekU7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBLElBSWM7QUFBQSxJQUNkO0FBQUEsTUFBQztBQUFBO0FBQUEsUUFDQyxNQUFLO0FBQUEsUUFDTCxXQUFXSSxVQUFVa0QsY0FBYyxjQUFjO0FBQUEsUUFDakQsU0FBUyxNQUFNckUsTUFBTWEsYUFBYSxFQUFFd0QsYUFBYSxDQUFDbEQsVUFBVWtELFlBQVksQ0FBQztBQUFBLFFBQUU7QUFBQTtBQUFBLE1BSDdFO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQSxJQUlhO0FBQUEsSUFDYjtBQUFBLE1BQUM7QUFBQTtBQUFBLFFBQ0MsY0FBVztBQUFBLFFBQ1gsT0FBT3RHLFNBQVN1RztBQUFBQSxRQUNoQixVQUFVLENBQUMzRCxVQUFVWCxNQUFNdUUsa0JBQWtCNUQsTUFBTTlHLE9BQU85QixLQUFLO0FBQUEsUUFFL0Q7QUFBQSxpQ0FBQyxZQUFPLE9BQU0sV0FBVSx1QkFBeEI7QUFBQTtBQUFBO0FBQUE7QUFBQSxpQkFBK0I7QUFBQSxVQUMvQix1QkFBQyxZQUFPLE9BQU0sVUFBUyxzQkFBdkI7QUFBQTtBQUFBO0FBQUE7QUFBQSxpQkFBNkI7QUFBQSxVQUM3Qix1QkFBQyxZQUFPLE9BQU0sa0JBQWlCLDhCQUEvQjtBQUFBO0FBQUE7QUFBQTtBQUFBLGlCQUE2QztBQUFBO0FBQUE7QUFBQSxNQVAvQztBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUEsSUFRQTtBQUFBLE9BcENGO0FBQUE7QUFBQTtBQUFBO0FBQUEsU0FxQ0E7QUFFSjtBQUFDeU0sTUF6RFFYO0FBMkRULFNBQVNZLFNBQVMsRUFBRXpFLE9BQU9qQyxVQUFVMkcsYUFBYSxHQUFHO0FBQUFDLEtBQUE7QUFDbkQsUUFBTSxFQUFFeksscUJBQVU4RCxjQUFjakIsV0FBV29FLFVBQVUsSUFBSXBEO0FBQ3pELFFBQU02RyxxQkFBcUIzTixrQ0FBa0M4RixTQUFTO0FBQ3RFLFFBQU0rRyxRQUFROUwsS0FBS0UsSUFBSSxNQUFPOEYsY0FBYytGLGNBQWM3SixVQUFTSSxTQUFTdUssT0FBTyxDQUFDQyxLQUFLekssWUFBWXlLLE1BQU16SyxRQUFRMEssVUFBVSxDQUFDLENBQUM7QUFDL0gsUUFBTUMsV0FBVyxHQUFJN0QsVUFBVWpFLFVBQVU0RyxRQUFTLEdBQUc7QUFDckQsUUFBTW1CLFdBQVc5USxPQUFPLElBQUk7QUFDNUIsUUFBTStRLGdCQUFnQi9RLE9BQU8sSUFBSTtBQUNqQyxRQUFNZ1Isa0JBQWtCaFIsT0FBTyxJQUFJO0FBQ25DLFFBQU1pUixvQkFBb0JqUixPQUFPLElBQUk7QUFDckMsUUFBTWtSLHFCQUFxQmxSLE9BQU8sSUFBSTtBQUN0QyxRQUFNLENBQUNtUixtQkFBbUJDLG9CQUFvQixJQUFJblIsU0FBUyxJQUFJO0FBQy9ELFFBQU0sQ0FBQ29SLHNCQUFzQkMsdUJBQXVCLElBQUlyUixTQUFTLElBQUk7QUFDckUsUUFBTSxDQUFDc1IsU0FBU0MsVUFBVSxJQUFJdlIsU0FBUyxJQUFJO0FBRTNDLFFBQU13UixvQkFBb0JBLENBQUNDLGFBQWE7QUFDdENULHNCQUFrQlUsVUFBVUQ7QUFDNUIsUUFBSVYsZ0JBQWdCVyxRQUFTO0FBQzdCWCxvQkFBZ0JXLFVBQVVDLHNCQUFzQixNQUFNO0FBQ3BEWixzQkFBZ0JXLFVBQVU7QUFDMUIsWUFBTUUsVUFBVVosa0JBQWtCVTtBQUNsQ1Ysd0JBQWtCVSxVQUFVO0FBQzVCRSxnQkFBVTtBQUFBLElBQ1osQ0FBQztBQUFBLEVBQ0g7QUFDQSxRQUFNQyxvQkFBb0JBLE1BQU07QUFDOUIsUUFBSWQsZ0JBQWdCVyxRQUFTSSxzQkFBcUJmLGdCQUFnQlcsT0FBTztBQUN6RVgsb0JBQWdCVyxVQUFVO0FBQzFCLFVBQU1FLFVBQVVaLGtCQUFrQlU7QUFDbENWLHNCQUFrQlUsVUFBVTtBQUM1QkUsY0FBVTtBQUFBLEVBQ1o7QUFFQSxRQUFNRyxlQUFlQSxDQUFDeEYsVUFBVTtBQUM5QixRQUFJLENBQUNBLE1BQU15RixXQUFXLENBQUN6RixNQUFNMEYsUUFBUztBQUN0QzFGLFVBQU0yRixlQUFlO0FBQ3JCLFVBQU1DLFFBQVF0QixTQUFTYTtBQUN2QixRQUFJLENBQUNTLE1BQU87QUFDWixVQUFNQyxPQUFPRCxNQUFNNUssc0JBQXNCO0FBQ3pDLFVBQU04SyxXQUFXek8sS0FBS0MsSUFBSXVPLEtBQUtuSyxPQUFPckUsS0FBS0UsSUFBSSxHQUFHeUksTUFBTStGLFVBQVVGLEtBQUs5SixJQUFJLENBQUM7QUFDNUUsVUFBTWlLLGNBQWNKLE1BQU1LLGFBQWFILFlBQVl6TyxLQUFLRSxJQUFJLEdBQUdxTyxNQUFNTSxXQUFXO0FBQ2hGLFVBQU1DLGNBQWM5TyxLQUFLRSxJQUFJLEdBQUdtRCxPQUFPOEYsVUFBVTRGLElBQUksS0FBSyxDQUFDO0FBQzNELFVBQU1DLFdBQVdoUCxLQUFLQyxJQUFJLEdBQUdELEtBQUtFLElBQUksR0FBRzRPLGNBQWM5TyxLQUFLaVAsSUFBSSxDQUFDdEcsTUFBTXVHLFNBQVMsS0FBTSxDQUFDLENBQUM7QUFDeEZsSCxVQUFNYSxhQUFhLEVBQUVrRyxNQUFNMUwsT0FBTzJMLFNBQVN4SixRQUFRLENBQUMsQ0FBQyxFQUFFLENBQUM7QUFDeER1SSwwQkFBc0IsTUFBTTtBQUMxQlEsWUFBTUssYUFBY0QsYUFBYUosTUFBTU0sY0FBZUo7QUFBQUEsSUFDeEQsQ0FBQztBQUFBLEVBQ0g7QUFFQXZTLFlBQVUsTUFBTSxNQUFNO0FBQ3BCLFFBQUlpUixnQkFBZ0JXLFFBQVNJLHNCQUFxQmYsZ0JBQWdCVyxPQUFPO0FBQUEsRUFDM0UsR0FBRyxFQUFFO0FBRUwsUUFBTXFCLDZCQUE2QkEsQ0FBQ1QsWUFBWTtBQUM5QyxVQUFNSCxRQUFRdEIsU0FBU2E7QUFDdkIsVUFBTUEsVUFBVTlGLE1BQU1vSCxZQUFZO0FBQ2xDLFFBQUksQ0FBQ2IsTUFBTyxRQUFPLEVBQUVjLE9BQU8sT0FBT0MsUUFBUSxvQ0FBb0M7QUFDL0UsVUFBTWQsT0FBT0QsTUFBTTVLLHNCQUFzQjtBQUN6QyxVQUFNNEwsV0FBV3ZQLEtBQUtDO0FBQUFBLE1BQ3BCc08sTUFBTU07QUFBQUEsTUFDTjdPLEtBQUtFLElBQUksR0FBR3dPLFVBQVVGLEtBQUs5SixPQUFPNkosTUFBTUssVUFBVTtBQUFBLElBQ3BEO0FBQ0EsVUFBTTFKLFVBQVdxSyxXQUFXdlAsS0FBS0UsSUFBSSxHQUFHcU8sTUFBTU0sV0FBVyxJQUNyRDdPLEtBQUtFLElBQUksTUFBTzROLFFBQVE5SCxjQUFjK0YsY0FBY0QsS0FBSztBQUM3RCxVQUFNMEQsT0FBT3RDLGNBQWNZO0FBQzNCLFVBQU0yQixPQUFPclEsbUNBQW1DO0FBQUEsTUFDOUM4QyxVQUFVNEwsUUFBUTVMO0FBQUFBLE1BQ2xCK0MsTUFBTTZJLFFBQVE5SDtBQUFBQSxNQUNkMEosb0JBQW9CRixNQUFNck47QUFBQUEsTUFDMUJ3TixnQkFBZ0JILE1BQU1wTjtBQUFBQSxNQUN0QjhDO0FBQUFBLElBQ0YsQ0FBQztBQUNELFdBQU8sRUFBRSxHQUFHdUssTUFBTUYsU0FBUztBQUFBLEVBQzdCO0FBRUEsUUFBTUssa0JBQWtCQSxDQUFDakgsT0FBTzZHLFNBQVM7QUFDdkMsUUFBSUEsS0FBS0ssVUFBVWxILE1BQU1tSCxXQUFXLEVBQUc7QUFDdkMsVUFBTUMsT0FBT3BILE1BQU1xSCxjQUFjQztBQUNqQyxVQUFNekIsT0FBT3VCLE1BQU1wTSxzQkFBc0I7QUFDekMsUUFBSSxDQUFDNkssTUFBTW5LLE1BQU87QUFDbEJzRSxVQUFNMkYsZUFBZTtBQUNyQjNGLFVBQU11SCxnQkFBZ0I7QUFDdEJ2SCxVQUFNcUgsY0FBY0csb0JBQW9CeEgsTUFBTXlILFNBQVM7QUFDdkQsUUFBSUMsZ0JBQWdCYixLQUFLeks7QUFDekIsUUFBSXlLLEtBQUtsSixTQUFTLE9BQU87QUFDdkIsWUFBTWdLLG1CQUFtQnRJLE1BQU1vSCxZQUFZLEVBQUVySztBQUM3QyxZQUFNd0wsaUJBQWlCdFIsa0NBQWtDcVIsZ0JBQWdCO0FBQ3pFLFlBQU1FLGtCQUFrQkQsZUFBZWpQO0FBQUFBLFFBQUssQ0FBQ21QLFdBQzNDQSxPQUFPN0wsY0FBYzRLLEtBQUt6SyxVQUFVSCxhQUFhNkwsT0FBT3ZKLFVBQVVzSSxLQUFLekssVUFBVW1DO0FBQUFBLE1BQ2xGO0FBQ0RtSixzQkFBZ0IxSCxNQUFNK0gsV0FDbEI5USxpQ0FBaUMwUSxrQkFBa0JkLEtBQUt6SyxTQUFTLElBQ2pFeUwsbUJBQW1CRCxlQUFlNU4sU0FBUyxJQUN6QyxFQUFFLEdBQUc2TSxLQUFLekssV0FBVzRMLFNBQVNKLGVBQWUsSUFDN0NmLEtBQUt6SztBQUNYaUQsWUFBTTRJLGFBQWEsZ0JBQWdCO0FBQUEsSUFDckM7QUFDQTFELGtCQUFjWSxVQUFVO0FBQUEsTUFDdEIsR0FBRzBCO0FBQUFBLE1BQ0h6SyxXQUFXc0w7QUFBQUEsTUFDWE0sU0FBU25CLEtBQUtsSixTQUFTLFFBQVFySCxrQ0FBa0NvUixhQUFhLElBQUk7QUFBQSxNQUNsRlEsZUFBZXJCLEtBQUtsSixTQUFTLFFBQVFsSSw0QkFBNEI0SixNQUFNb0gsWUFBWSxFQUFFbE4sUUFBUSxJQUFJO0FBQUEsTUFDakc0TyxXQUFXdEIsS0FBS2xKLFNBQVMsUUFBUTBCLE1BQU1vSCxZQUFZLEVBQUVwSixlQUFlO0FBQUEsTUFDcEVvSyxXQUFXekgsTUFBTXlIO0FBQUFBLE1BQ2pCNUI7QUFBQUEsTUFDQXVDLFFBQVFwSSxNQUFNK0Y7QUFBQUEsTUFDZHNDLE9BQU87QUFBQSxNQUNQQyxRQUFRekIsS0FBSzlNO0FBQUFBLE1BQ2J3TyxVQUFVO0FBQUEsSUFDWjtBQUNBbEosVUFBTVksYUFBYXlILGFBQWE7QUFDaENySSxVQUFNYSxhQUFhLEVBQUVDLE9BQU8sWUFBWUMsU0FBUyxPQUFPN0QsU0FBU3NLLEtBQUt0SyxRQUFRLENBQUM7QUFBQSxFQUNqRjtBQUVBLFFBQU1pTSxpQkFBaUJBLENBQUN4SSxVQUFVO0FBQ2hDLFVBQU02RyxPQUFPdEMsY0FBY1k7QUFDM0IsUUFBSSxDQUFDMEIsUUFBUUEsS0FBS1ksY0FBY3pILE1BQU15SCxVQUFXO0FBQ2pELFFBQUksQ0FBQ1osS0FBS3dCLFNBQVNoUixLQUFLeUIsSUFBSWtILE1BQU0rRixVQUFVYyxLQUFLdUIsTUFBTSxJQUFJLEVBQUc7QUFDOUR2QixTQUFLd0IsUUFBUTtBQUNiLFFBQUl4QixLQUFLbEosU0FBUyxVQUFVO0FBQzFCLFlBQU1tSixPQUFPTiwyQkFBMkJ4RyxNQUFNK0YsT0FBTztBQUNyRGMsV0FBSzBCLFdBQVd6QjtBQUNoQmxDLDJCQUFxQixFQUFFLEdBQUdrQyxNQUFNMkIsT0FBTzVCLEtBQUs0QixNQUFNLENBQUM7QUFDbkQsVUFBSTNCLEtBQUtKLE9BQU87QUFDZHJILGNBQU1hLGFBQWEsRUFBRUMsT0FBTyxZQUFZQyxTQUFTLE9BQU83RCxTQUFTdUssS0FBS3ZLLFFBQVEsQ0FBQztBQUFBLE1BQ2pGO0FBQ0E7QUFBQSxJQUNGO0FBQ0EsUUFBSXNLLEtBQUtsSixTQUFTLHFCQUFxQjtBQUNyQyxZQUFNK0ssYUFBYTFJLE1BQU0rRixVQUFVYyxLQUFLdUIsVUFBVXZCLEtBQUtoQixLQUFLbks7QUFDNUQsWUFBTWlOLFNBQVN0UixLQUFLQyxJQUFJdVAsS0FBS3RQLEtBQUtGLEtBQUtFO0FBQUFBLFFBQ3JDc1AsS0FBS3ZQO0FBQUFBLFFBQ0xQLGdDQUFnQzhQLEtBQUs5TSxLQUFLMk8sU0FBUztBQUFBLE1BQ3JELENBQUM7QUFDRCxVQUFJclIsS0FBS3lCLElBQUk2UCxTQUFTOUIsS0FBS3lCLE1BQU0sSUFBSSxLQUFVO0FBQy9DLFlBQU1NLFFBQVFELFNBQVM5QixLQUFLeUI7QUFDNUJqSixZQUFNQyxPQUFPLDBCQUEwQixDQUFDQyxVQUFVO0FBQ2hELGNBQU1zSixTQUFTdEosTUFBTTVGLFNBQVNrTixLQUFLck4sWUFBWSxFQUFFMEUsS0FBS007QUFDdEQsWUFBSSxDQUFDcUssT0FBUTtBQUNiQSxlQUFPcEssU0FBU21LO0FBQ2hCQyxlQUFPbEosT0FBT2lKO0FBQUFBLE1BQ2hCLEdBQUcsRUFBRUUsYUFBYWpDLEtBQUtpQyxhQUFhMU0sV0FBV3lLLEtBQUt6SyxVQUFVLENBQUM7QUFDL0R5SyxXQUFLeUIsU0FBU0s7QUFDZHRKLFlBQU1hLGFBQWE7QUFBQSxRQUNqQkMsT0FBTztBQUFBLFFBQ1BDLFNBQVM7QUFBQSxRQUNUN0QsU0FBU3NLLEtBQUtrQyxpQkFBa0JKLFNBQVM5QixLQUFLbEs7QUFBQUEsTUFDaEQsQ0FBQztBQUNEO0FBQUEsSUFDRjtBQUNBLFVBQU1xTSxjQUFjaEosTUFBTStGLFVBQVVjLEtBQUt1QixVQUFVdkIsS0FBS2hCLEtBQUtuSztBQUM3RCxVQUFNdU4sV0FBV3JTLGtDQUFrQztBQUFBLE1BQ2pEMkMsVUFBVXNOLEtBQUtxQjtBQUFBQSxNQUNmNUwsTUFBTXVLLEtBQUtzQjtBQUFBQSxNQUNYSCxTQUFTbkIsS0FBS21CO0FBQUFBLE1BQ2RrQixTQUFTckMsS0FBS3pLO0FBQUFBLE1BQ2Q0TTtBQUFBQSxJQUNGLENBQUM7QUFDRCxRQUFJLENBQUNDLFNBQVN2QyxTQUFTclAsS0FBS3lCLElBQUltUSxTQUFTRSxXQUFXdEMsS0FBS3VDLGVBQWUsRUFBRSxJQUFJLEtBQVU7QUFDeEZ2QyxTQUFLdUMsY0FBY0gsU0FBU0U7QUFDNUJsRSxzQkFBa0IsTUFBTTtBQUN0QjVGLFlBQU1nSyxjQUFjLENBQUM5SixVQUFVO0FBQzdCMEosaUJBQVN0SCxNQUFNcEUsUUFBUSxDQUFDcUUsU0FBUztBQUMvQixnQkFBTXhELE1BQU1tQixNQUFNNUYsU0FBU2lJLEtBQUtwSSxZQUFZLEdBQUcwRSxNQUFNQyxNQUFNckcsS0FBSyxDQUFDMkUsU0FBU0EsS0FBS3pFLE9BQU80SixLQUFLckQsS0FBSztBQUNoRyxjQUFJSCxJQUFLbEcsUUFBT3VKLE9BQU9yRCxLQUFLLEVBQUV5RCxPQUFPRCxLQUFLQyxPQUFPdkQsTUFBTXNELEtBQUt0RCxNQUFNd0QsTUFBTUYsS0FBS0UsS0FBSyxDQUFDO0FBQUEsUUFDckYsQ0FBQztBQUFBLE1BQ0gsR0FBRztBQUFBLFFBQ0QzQixPQUFPO0FBQUEsUUFDUEMsU0FBUztBQUFBLFFBQ1Q3RCxTQUFTc0ssS0FBS3RLLFVBQVUwTSxTQUFTRTtBQUFBQSxNQUNuQyxDQUFDO0FBQUEsSUFDSCxDQUFDO0FBQUEsRUFDSDtBQUVBLFFBQU1HLGdCQUFnQkEsQ0FBQ3RKLFVBQVU7QUFDL0IsVUFBTTZHLE9BQU90QyxjQUFjWTtBQUMzQixRQUFJLENBQUMwQixRQUFRQSxLQUFLWSxjQUFjekgsTUFBTXlILFVBQVc7QUFDakQsUUFBSXpILE1BQU1xSCxjQUFja0Msb0JBQW9CdkosTUFBTXlILFNBQVMsRUFBR3pILE9BQU1xSCxjQUFjbUMsc0JBQXNCeEosTUFBTXlILFNBQVM7QUFDdkgsUUFBSVosS0FBS2xKLFNBQVMsT0FBTztBQUN2QjJILHdCQUFrQjtBQUNsQixVQUFJdEYsTUFBTXJDLFNBQVMsbUJBQW1CLENBQUNrSixLQUFLd0IsTUFBT2hKLE9BQU1vSyxjQUFjO0FBQUE7QUFDbEVwSyxjQUFNcUssY0FBYzdDLEtBQUt6SyxTQUFTO0FBQUEsSUFDekM7QUFDQSxRQUFJeUssS0FBS2xKLFNBQVMsWUFBWWtKLEtBQUt3QixTQUFTckksTUFBTXJDLFNBQVMsaUJBQWlCO0FBQzFFLFlBQU1tSixPQUFPRCxLQUFLMEIsWUFBWS9CLDJCQUEyQnhHLE1BQU0rRixPQUFPO0FBQ3RFLFVBQUllLEtBQUtKLE9BQU87QUFDZHJILGNBQU1DLE9BQU8sbUJBQW1CLENBQUNDLFVBQVU7QUFDekMsZ0JBQU1vSyxhQUFhcEssTUFBTTVGLFNBQVNrTixLQUFLck4sWUFBWSxHQUFHSyxPQUFPQztBQUM3RCxnQkFBTSxDQUFDOFAsUUFBUSxJQUFJRCxZQUFZbkssT0FBT3FILEtBQUtwTixVQUFVLENBQUMsS0FBSztBQUMzRCxjQUFJLENBQUNtUSxTQUFVO0FBQ2ZBLG1CQUFTN1AsS0FBSytNLEtBQUsvTTtBQUNuQixnQkFBTThQLGtCQUFrQnRLLE1BQU01RixTQUFTbU4sS0FBS3ROLFlBQVksRUFBRUssT0FBT0M7QUFDakUrUCwwQkFBZ0JwTSxLQUFLbU0sUUFBUTtBQUM3QkMsMEJBQWdCaEwsS0FBSyxDQUFDQyxHQUFHQyxNQUFNRCxFQUFFL0UsS0FBS2dGLEVBQUVoRixFQUFFO0FBQUEsUUFDNUMsR0FBRztBQUFBLFVBQ0RxQyxXQUFXLEVBQUV1QixNQUFNLGNBQWMxQixXQUFXNkssS0FBSzdLLFdBQVd4QyxVQUFVcU4sS0FBS3JOLFNBQVM7QUFBQSxRQUN0RixDQUFDO0FBQ0Q0RixjQUFNYSxhQUFhLEVBQUVDLE9BQU8sWUFBWUMsU0FBUyxPQUFPN0QsU0FBU3VLLEtBQUt2SyxRQUFRLENBQUM7QUFBQSxNQUNqRixPQUFPO0FBQ0w4QyxjQUFNUyxhQUFhLEVBQUVYLFNBQVMySCxLQUFLSCxVQUFVLHlDQUF5QyxDQUFDO0FBQUEsTUFDekY7QUFBQSxJQUNGO0FBQ0EsUUFBSUUsS0FBS3dCLE9BQU87QUFDZDNELHlCQUFtQlMsVUFBVTBCLEtBQUs0QjtBQUNsQ3ZOLGFBQU80TyxXQUFXLE1BQU07QUFDdEIsWUFBSXBGLG1CQUFtQlMsWUFBWTBCLEtBQUs0QixNQUFPL0Qsb0JBQW1CUyxVQUFVO0FBQUEsTUFDOUUsR0FBRyxDQUFDO0FBQUEsSUFDTjtBQUNBUCx5QkFBcUIsSUFBSTtBQUN6Qkwsa0JBQWNZLFVBQVU7QUFBQSxFQUMxQjtBQUVBLFFBQU00RSxvQkFBb0JBLENBQUN0QixPQUFPdUIsV0FBVztBQUMzQyxRQUFJdEYsbUJBQW1CUyxZQUFZc0QsT0FBTztBQUN4Qy9ELHlCQUFtQlMsVUFBVTtBQUM3QjtBQUFBLElBQ0Y7QUFDQTZFLFdBQU87QUFBQSxFQUNUO0FBRUEsUUFBTUMscUJBQXFCQSxDQUFDakssT0FBT2tLLFNBQVM7QUFDMUMsUUFBSUEsS0FBS2hELFVBQVVsSCxNQUFNbUgsV0FBVyxFQUFHO0FBQ3ZDbkgsVUFBTTJGLGVBQWU7QUFDckIzRixVQUFNdUgsZ0JBQWdCO0FBQ3RCdkgsVUFBTXFILGNBQWNHLG9CQUFvQnhILE1BQU15SCxTQUFTO0FBQ3ZELFVBQU10QyxVQUFVOUYsTUFBTW9ILFlBQVk7QUFDbEMsVUFBTTdOLFFBQVF2Qyw2QkFBNkI4TyxRQUFReEIsY0FBYztBQUNqRXRFLFVBQU00SSxhQUFhLFVBQVVpQyxLQUFLQyxZQUFZLEVBQUU7QUFDaEQ5SyxVQUFNWSxhQUFhLEVBQUV0QyxNQUFNLFdBQVcxQixXQUFXaU8sS0FBS2pPLFVBQVUsQ0FBQztBQUNqRXNJLGtCQUFjWSxVQUFVO0FBQUEsTUFDdEJ4SCxNQUFNO0FBQUEsTUFDTjhLLE9BQU8sa0JBQWtCeUIsS0FBS2pPLFNBQVM7QUFBQSxNQUN2Q3dMLFdBQVd6SCxNQUFNeUg7QUFBQUEsTUFDakJXLFFBQVFwSSxNQUFNK0Y7QUFBQUEsTUFDZHNDLE9BQU87QUFBQSxNQUNQcE0sV0FBV2lPLEtBQUtqTztBQUFBQSxNQUNoQnpDLGNBQWMwUSxLQUFLMVE7QUFBQUEsTUFDbkIyUSxjQUFjRCxLQUFLQztBQUFBQSxNQUNuQnZSO0FBQUFBLE1BQ0F3UixhQUFhMVAsT0FBT3lLLFFBQVE1TCxTQUFTSSxTQUFTdVEsS0FBSzFRLFlBQVksRUFBRVosS0FBSyxDQUFDO0FBQUEsTUFDdkV5UixZQUFZaFQsS0FBS0UsSUFBSSxNQUFPNE4sUUFBUTlILGNBQWMrRixjQUFjRCxLQUFLO0FBQUEsTUFDckVtSCxrQkFBa0JqVCxLQUFLRSxJQUFJLEdBQUcrTSxTQUFTYSxTQUFTZSxlQUFlLENBQUM7QUFBQSxNQUNoRXFFLGlCQUFpQnpVLHFDQUFxQztBQUFBLFFBQ3BEd0csTUFBTTZJLFFBQVE5SDtBQUFBQSxRQUNkZCxTQUFTNEksUUFBUTNFLFVBQVVqRTtBQUFBQSxRQUMzQmlPLGtCQUFrQk4sS0FBS2pPO0FBQUFBLE1BQ3pCLENBQUM7QUFBQSxNQUNERyxXQUFXLEVBQUV1QixNQUFNLFdBQVcxQixXQUFXaU8sS0FBS2pPLFVBQVU7QUFBQSxJQUMxRDtBQUNBNkksNEJBQXdCLEVBQUU3SSxXQUFXaU8sS0FBS2pPLFdBQVd3TyxRQUFRL1AsT0FBT3lLLFFBQVE1TCxTQUFTSSxTQUFTdVEsS0FBSzFRLFlBQVksRUFBRVosS0FBSyxDQUFDLEVBQUUsQ0FBQztBQUFBLEVBQzVIO0FBRUEsUUFBTThSLG9CQUFvQkEsQ0FBQzFLLFVBQVU7QUFDbkMsVUFBTTZHLE9BQU90QyxjQUFjWTtBQUMzQixRQUFJMEIsTUFBTWxKLFNBQVMsb0JBQW9Ca0osS0FBS1ksY0FBY3pILE1BQU15SCxVQUFXO0FBQzNFLFFBQUksQ0FBQ1osS0FBS3dCLFNBQVNoUixLQUFLeUIsSUFBSWtILE1BQU0rRixVQUFVYyxLQUFLdUIsTUFBTSxJQUFJLEVBQUc7QUFDOUR2QixTQUFLd0IsUUFBUTtBQUNiLFVBQU1zQyxZQUFZOUQsS0FBS3VELGVBQWlCcEssTUFBTStGLFVBQVVjLEtBQUt1QixVQUFVdkIsS0FBS3lELG1CQUFvQnpELEtBQUt3RDtBQUNyRyxVQUFNakksT0FBT3BDLE1BQU00SyxTQUFTLE9BQU81SyxNQUFNK0gsV0FBVyxPQUFPO0FBQzNELFVBQU0wQyxTQUFTcFQsS0FBS0MsSUFBSSxHQUFHRCxLQUFLRSxJQUFJLEdBQUdGLEtBQUsyTCxNQUFNMkgsWUFBWXZJLElBQUksSUFBSUEsSUFBSSxDQUFDO0FBQzNFLFFBQUkvSyxLQUFLeUIsSUFBSTJSLFVBQVU1RCxLQUFLZ0UsY0FBY2hFLEtBQUt1RCxZQUFZLElBQUksS0FBVTtBQUN6RXZELFNBQUtnRSxhQUFhblEsT0FBTytQLE9BQU81TixRQUFRLENBQUMsQ0FBQztBQUMxQ2lJLDRCQUF3QixFQUFFN0ksV0FBVzRLLEtBQUs1SyxXQUFXd08sUUFBUTVELEtBQUtnRSxXQUFXLENBQUM7QUFDOUU1RixzQkFBa0IsTUFBTTtBQUN0QjVGLFlBQU1nSyxjQUFjLENBQUM5SixVQUFVO0FBQzdCQSxjQUFNNUYsU0FBU2tOLEtBQUtyTixZQUFZLEVBQUVxTixLQUFLak8sS0FBSyxJQUFJaU8sS0FBS2dFO0FBQUFBLE1BQ3ZELENBQUM7QUFDRHhMLFlBQU1hLGFBQWE7QUFBQSxRQUNqQkMsT0FBTztBQUFBLFFBQ1BDLFNBQVM7QUFBQSxRQUNUN0QsU0FBUy9GLG1DQUFtQ3FRLEtBQUswRCxpQkFBaUJsTCxNQUFNb0gsWUFBWSxFQUFFcEosWUFBWTtBQUFBLE1BQ3BHLENBQUM7QUFBQSxJQUNILENBQUM7QUFBQSxFQUNIO0FBRUEsUUFBTXlOLG1CQUFtQkEsQ0FBQzlLLFVBQVU7QUFDbEMsVUFBTTZHLE9BQU90QyxjQUFjWTtBQUMzQixRQUFJMEIsTUFBTWxKLFNBQVMsb0JBQW9Ca0osS0FBS1ksY0FBY3pILE1BQU15SCxVQUFXO0FBQzNFLFFBQUl6SCxNQUFNcUgsY0FBY2tDLG9CQUFvQnZKLE1BQU15SCxTQUFTLEVBQUd6SCxPQUFNcUgsY0FBY21DLHNCQUFzQnhKLE1BQU15SCxTQUFTO0FBQ3ZIbkMsc0JBQWtCO0FBQ2xCLFFBQUl0RixNQUFNckMsU0FBUyxtQkFBbUIsQ0FBQ2tKLEtBQUt3QixNQUFPaEosT0FBTW9LLGNBQWM7QUFBQTtBQUNsRXBLLFlBQU1xSyxjQUFjN0MsS0FBS3pLLFNBQVM7QUFDdkNtSSxrQkFBY1ksVUFBVTtBQUN4QkwsNEJBQXdCLElBQUk7QUFBQSxFQUM5QjtBQUVBLFFBQU1pRyxxQkFBcUJBLENBQUM5TyxXQUFXekMsaUJBQWlCO0FBQ3RELFVBQU0yTCxVQUFVOUYsTUFBTW9ILFlBQVk7QUFDbEMsVUFBTTdOLFFBQVF2Qyw2QkFBNkI4TyxRQUFReEIsY0FBYztBQUNqRSxVQUFNcUgsa0JBQWtCN0YsUUFBUThGLGlCQUFpQnRSLFNBQVM3QixLQUFLLENBQUMyRSxTQUFTQSxLQUFLekUsT0FBT2lFLFNBQVM7QUFDOUYsUUFBSSxDQUFDK08sbUJBQW1CQSxnQkFBZ0JwUyxLQUFLLE1BQU11TSxRQUFRNUwsU0FBU0ksU0FBU0gsWUFBWSxFQUFFWixLQUFLLEVBQUc7QUFDbkcsVUFBTXNTLFVBQVVwVixxQ0FBcUM7QUFBQSxNQUNuRHdHLE1BQU02SSxRQUFROUg7QUFBQUEsTUFDZGQsU0FBUzRJLFFBQVEzRSxVQUFVakU7QUFBQUEsTUFDM0JpTyxrQkFBa0J2TztBQUFBQSxJQUNwQixDQUFDO0FBQ0RvRCxVQUFNNEksYUFBYSw4QkFBOEI7QUFDakQ1SSxVQUFNZ0ssY0FBYyxDQUFDOUosVUFBVTtBQUFFQSxZQUFNNUYsU0FBU0gsWUFBWSxFQUFFWixLQUFLLElBQUlvUyxnQkFBZ0JwUyxLQUFLO0FBQUEsSUFBRyxDQUFDO0FBQ2hHeUcsVUFBTWEsYUFBYSxFQUFFM0QsU0FBUy9GLG1DQUFtQzBVLFNBQVM3TCxNQUFNb0gsWUFBWSxFQUFFcEosWUFBWSxFQUFFLENBQUM7QUFDN0dnQyxVQUFNcUssY0FBYyxFQUFFL0wsTUFBTSxXQUFXMUIsVUFBVSxDQUFDO0FBQUEsRUFDcEQ7QUFFQSxRQUFNa1AsZUFBZUEsQ0FBQ25MLFVBQVU7QUFDOUIsUUFBSUEsTUFBTW1ILFdBQVcsS0FBS25ILE1BQU05RyxXQUFXOEcsTUFBTXFILGNBQWU7QUFDaEUsVUFBTStELFNBQVM5RyxTQUFTYSxTQUFTcEssY0FBYywrQkFBK0I7QUFDOUUsUUFBSSxDQUFDcVEsT0FBUTtBQUNicEwsVUFBTTJGLGVBQWU7QUFDckIzRixVQUFNcUgsY0FBY0csb0JBQW9CeEgsTUFBTXlILFNBQVM7QUFDdkQsVUFBTTVCLE9BQU91RixPQUFPcFEsc0JBQXNCO0FBQzFDdUosa0JBQWNZLFVBQVU7QUFBQSxNQUN0QnhILE1BQU07QUFBQSxNQUNOOEosV0FBV3pILE1BQU15SDtBQUFBQSxNQUNqQjRELGNBQWNyTCxNQUFNK0Y7QUFBQUEsTUFDcEJ1RixjQUFjdEwsTUFBTXVMO0FBQUFBLE1BQ3BCQyxZQUFZM0Y7QUFBQUEsTUFDWjRGLFVBQVV6TCxNQUFNK0g7QUFBQUEsSUFDbEI7QUFDQS9DLGVBQVcsRUFBRWpKLE1BQU1pRSxNQUFNK0YsVUFBVUYsS0FBSzlKLE1BQU1kLEtBQUsrRSxNQUFNdUwsVUFBVTFGLEtBQUs1SyxLQUFLUyxPQUFPLEdBQUdFLFFBQVEsRUFBRSxDQUFDO0FBQUEsRUFDcEc7QUFFQSxRQUFNOFAsY0FBY0EsQ0FBQzFMLFVBQVU7QUFDN0IsVUFBTTZHLE9BQU90QyxjQUFjWTtBQUMzQixRQUFJMEIsTUFBTWxKLFNBQVMsYUFBYWtKLEtBQUtZLGNBQWN6SCxNQUFNeUgsVUFBVztBQUNwRSxVQUFNMUwsT0FBTzFFLEtBQUtDLElBQUl1UCxLQUFLd0UsY0FBY3JMLE1BQU0rRixPQUFPLElBQUljLEtBQUsyRSxXQUFXelA7QUFDMUUsVUFBTWQsTUFBTTVELEtBQUtDLElBQUl1UCxLQUFLeUUsY0FBY3RMLE1BQU11TCxPQUFPLElBQUkxRSxLQUFLMkUsV0FBV3ZRO0FBQ3pFK0osZUFBVztBQUFBLE1BQ1RqSjtBQUFBQSxNQUNBZDtBQUFBQSxNQUNBUyxPQUFPckUsS0FBS3lCLElBQUlrSCxNQUFNK0YsVUFBVWMsS0FBS3dFLFlBQVk7QUFBQSxNQUNqRHpQLFFBQVF2RSxLQUFLeUIsSUFBSWtILE1BQU11TCxVQUFVMUUsS0FBS3lFLFlBQVk7QUFBQSxJQUNwRCxDQUFDO0FBQUEsRUFDSDtBQUVBLFFBQU1LLGFBQWFBLENBQUMzTCxVQUFVO0FBQzVCLFVBQU02RyxPQUFPdEMsY0FBY1k7QUFDM0IsUUFBSTBCLE1BQU1sSixTQUFTLGFBQWFrSixLQUFLWSxjQUFjekgsTUFBTXlILFVBQVc7QUFDcEUsUUFBSXpILE1BQU1xSCxjQUFja0Msb0JBQW9CdkosTUFBTXlILFNBQVMsRUFBR3pILE9BQU1xSCxjQUFjbUMsc0JBQXNCeEosTUFBTXlILFNBQVM7QUFDdkgsUUFBSXpILE1BQU1yQyxTQUFTLGlCQUFpQjtBQUNsQyxZQUFNaU8sZ0JBQWdCO0FBQUEsUUFDcEI3UCxNQUFNMUUsS0FBS0MsSUFBSXVQLEtBQUt3RSxjQUFjckwsTUFBTStGLE9BQU87QUFBQSxRQUMvQzhGLE9BQU94VSxLQUFLRSxJQUFJc1AsS0FBS3dFLGNBQWNyTCxNQUFNK0YsT0FBTztBQUFBLFFBQ2hEOUssS0FBSzVELEtBQUtDLElBQUl1UCxLQUFLeUUsY0FBY3RMLE1BQU11TCxPQUFPO0FBQUEsUUFDOUNPLFFBQVF6VSxLQUFLRSxJQUFJc1AsS0FBS3lFLGNBQWN0TCxNQUFNdUwsT0FBTztBQUFBLE1BQ25EO0FBQ0EsWUFBTVEsV0FBV3pILFNBQVNhLFNBQVNuSyxzQkFBc0I7QUFDekQsWUFBTWdSLE9BQU8sQ0FBQyxHQUFJMUgsU0FBU2EsU0FBUzhHLGlCQUFpQixnQ0FBZ0MsS0FBSyxFQUFHLEVBQzFGQyxPQUFPLENBQUNDLFNBQVM7QUFDaEIsY0FBTXRHLE9BQU9zRyxLQUFLblIsc0JBQXNCO0FBQ3hDLGNBQU1vUixVQUFVTCxZQUFZbEcsS0FBS2dHLFNBQVNFLFNBQVNoUSxRQUFROEosS0FBSzlKLFFBQVFnUSxTQUFTRjtBQUNqRixlQUFPTyxXQUFXdkcsS0FBS2dHLFNBQVNELGNBQWM3UCxRQUFROEosS0FBSzlKLFFBQVE2UCxjQUFjQyxTQUM1RWhHLEtBQUtpRyxVQUFVRixjQUFjM1EsT0FBTzRLLEtBQUs1SyxPQUFPMlEsY0FBY0U7QUFBQUEsTUFDckUsQ0FBQyxFQUNBNUssSUFBSSxDQUFDaUwsVUFBVSxFQUFFeE8sTUFBTSxPQUFPMUIsV0FBV2tRLEtBQUtFLFFBQVFwUSxXQUFXc0MsT0FBTzROLEtBQUtFLFFBQVE5TixPQUFPTixTQUFTLFFBQVEsRUFBRTtBQUNsSCxVQUFJK04sS0FBS2hTLFFBQVE7QUFDZixZQUFJME4sZ0JBQWdCYixLQUFLNEUsV0FBV3BNLE1BQU1vSCxZQUFZLEVBQUVySyxZQUFZNFAsS0FBSyxDQUFDO0FBQzFFQSxhQUFLTSxNQUFNekYsS0FBSzRFLFdBQVcsSUFBSSxDQUFDLEVBQUVsTyxRQUFRLENBQUNnUCxRQUFRO0FBQ2pEN0UsMEJBQWdCelEsaUNBQWlDeVEsZUFBZTZFLEdBQUc7QUFBQSxRQUNyRSxDQUFDO0FBQ0RsTixjQUFNWSxhQUFheUgsYUFBYTtBQUFBLE1BQ2xDO0FBQUEsSUFDRjtBQUNBbkQsa0JBQWNZLFVBQVU7QUFDeEJILGVBQVcsSUFBSTtBQUFBLEVBQ2pCO0FBRUEsU0FDRSx1QkFBQyxTQUFJLFdBQVUseUJBQ2I7QUFBQSwyQkFBQyxTQUFJLFdBQVUsNEJBQTJCLGNBQVcsbUJBQ2xENU0saUNBQXVCOEk7QUFBQUEsTUFBSSxDQUFDc0wsVUFDM0JBLE1BQU1qVSxTQUFTeUIsU0FDYjtBQUFBLFFBQUM7QUFBQTtBQUFBLFVBQ0MsTUFBSztBQUFBLFVBRUwsV0FBV29DLFVBQVV1QixTQUFTLGNBQWN2QixVQUFVb1EsVUFBVUEsTUFBTW5VLE9BQU8sY0FBYztBQUFBLFVBQzNGLHFCQUFtQm1VLE1BQU1uVTtBQUFBQSxVQUN6QixjQUFZLGVBQWVtVSxNQUFNbFUsS0FBSztBQUFBLFVBQ3RDLGdCQUFjOEQsVUFBVXVCLFNBQVMsY0FBY3ZCLFVBQVVvUSxVQUFVQSxNQUFNblU7QUFBQUEsVUFDekUsU0FBUyxNQUFNMEwsZUFBZSxFQUFFcEcsTUFBTSxZQUFZNk8sT0FBT0EsTUFBTW5VLE1BQU1vVSxZQUFZRCxNQUFNbFUsT0FBT0MsVUFBVWlVLE1BQU1qVSxTQUFTLENBQUM7QUFBQSxVQUN4SGlVLGdCQUFNbFU7QUFBQUE7QUFBQUEsUUFORGtVLE1BQU1uVTtBQUFBQSxRQUZiO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUEsTUFRYyxJQUNaLHVCQUFDLFVBQXVCbVUsZ0JBQU1sVSxTQUFuQmtVLE1BQU1uVSxNQUFqQjtBQUFBO0FBQUE7QUFBQTtBQUFBLGFBQW9DO0FBQUEsSUFDekMsS0FiSDtBQUFBO0FBQUE7QUFBQTtBQUFBLFdBY0E7QUFBQSxJQUNBLHVCQUFDLFNBQUksS0FBS2lNLFVBQVUsV0FBVSxzQkFBcUIsbUJBQWlCOUQsVUFBVWtNLGFBQWEsSUFBSSxTQUFTbEgsY0FDdEcsaUNBQUMsU0FBSSxXQUFVLGdDQUErQixPQUFPLEVBQUUsMkJBQTJCbkIsVUFBVSxnQ0FBZ0NoTixLQUFLRSxJQUFJLEdBQUdtRCxPQUFPOEYsVUFBVTRGLElBQUksS0FBSyxDQUFDLEVBQUUsR0FDbks7QUFBQSw2QkFBQyxTQUFJLFdBQVUsMkJBQWY7QUFBQTtBQUFBO0FBQUE7QUFBQSxhQUFzQztBQUFBLE1BQ3JDckIsVUFBVSx1QkFBQyxTQUFJLFdBQVUsd0JBQXVCLE9BQU9BLFNBQVMsZUFBWSxVQUFsRTtBQUFBO0FBQUE7QUFBQTtBQUFBLGFBQXdFLElBQU07QUFBQSxNQUN4Rkosb0JBQ0Q7QUFBQSxRQUFDO0FBQUE7QUFBQSxVQUNDLFdBQVcsaUNBQWlDQSxrQkFBa0IrQixRQUFRLEtBQUssYUFBYTtBQUFBLFVBQ3hGLE9BQU8sRUFBRTNLLE1BQU0sR0FBRzRJLGtCQUFrQmlDLFFBQVEsS0FBSztBQUFBLFVBQ2pELGVBQVk7QUFBQSxVQUVaO0FBQUEsbUNBQUMsU0FBRDtBQUFBO0FBQUE7QUFBQTtBQUFBLG1CQUFFO0FBQUEsWUFDRix1QkFBQyxVQUFNakMsNEJBQWtCK0IsUUFBUSxHQUFHL0Isa0JBQWtCd0YsWUFBWSxNQUFNck4sb0JBQW9CNkgsa0JBQWtCNUssRUFBRSxDQUFDLEtBQUs0SyxrQkFBa0JnQyxVQUF4STtBQUFBO0FBQUE7QUFBQTtBQUFBLG1CQUErSTtBQUFBO0FBQUE7QUFBQSxRQU5qSjtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUEsTUFPQSxJQUNJO0FBQUEsTUFDSCxDQUFDLFdBQVcsVUFBVSxTQUFTLFFBQVEsYUFBYSxFQUFFekY7QUFBQUEsUUFBSSxDQUFDN0ksU0FDNUQsdUJBQUMsU0FBSSxXQUFXLHdDQUF3Q0EsSUFBSSxJQUN6RGtCLG9CQUFTSSxTQUFTdUgsSUFBSSxDQUFDeEgsU0FBU0YsaUJBQWlCO0FBQ2hELGdCQUFNZ0QsV0FBV2EsY0FBYzFELFdBQVdILFlBQVk7QUFDdEQsZ0JBQU1rRCxVQUFVckYsS0FBS0MsSUFBSTZMLE9BQU8zRyxVQUFVRSxXQUFXLENBQUM7QUFDdEQsZ0JBQU1pUSxjQUFjdFYsS0FBS0MsSUFBSTZMLE9BQU85RixjQUFjMUQsV0FBV0gsZUFBZSxDQUFDLEdBQUdrRCxXQUFXeUcsS0FBSztBQUNoRyxnQkFBTXlKLFNBQVN2VixLQUFLRSxJQUFJLE1BQU9vVixjQUFjalEsT0FBTztBQUNwRCxnQkFBTWhCLFFBQVEsR0FBSWtSLFNBQVN6SixRQUFTLEdBQUc7QUFDdkMsZ0JBQU0wSixvQkFBb0J6USxVQUFVSCxjQUFjdkMsUUFBUTFCO0FBQzFELGdCQUFNOFUsZUFBZUEsQ0FBQy9TLE9BQU8xQyxLQUFLQyxJQUFJLEtBQU1vRCxPQUFPWCxNQUFNLENBQUMsS0FBS3lDLFVBQVVHLFlBQVlpUSxVQUFVQSxTQUFVLEdBQUc7QUFDNUcsZ0JBQU1HLGdCQUFnQkEsQ0FBQ2hULE9BQU8sR0FBRytTLGFBQWEvUyxFQUFFLENBQUM7QUFDakQsZ0JBQU1pVCx3QkFBd0JBLENBQUNqVCxPQUFPLEdBQUlXLE9BQU9YLE1BQU0sQ0FBQyxLQUFLeUMsVUFBVUcsWUFBWWlRLFVBQVVBLFNBQVUsR0FBRztBQUMxRyxnQkFBTUsscUJBQXFCQSxDQUFDeFUsTUFBTUMsT0FBTyxHQUFHckIsS0FBS0UsSUFBSSxPQUFPbUQsT0FBT2hDLEVBQUUsSUFBSWdDLE9BQU9qQyxJQUFJLE1BQU0rRCxVQUFVRyxZQUFZaVEsVUFBVUEsU0FBUyxHQUFHLENBQUM7QUFDdkksZ0JBQU1NLGVBQWVBLENBQUNuVCxPQUFPLEdBQUc1QyxRQUFRdUQsT0FBT1gsTUFBTSxDQUFDLENBQUMsSUFBSSxHQUFHO0FBQzlELGdCQUFNb1QsV0FBV0EsQ0FBQ3pGLGVBQWUzTixLQUFLLE1BQU07QUFDMUNzRixrQkFBTVksYUFBYSxFQUFFaEUsV0FBV3ZDLFFBQVExQixJQUFJLEdBQUcwUCxjQUFjLENBQUM7QUFDOURySSxrQkFBTWEsYUFBYTtBQUFBLGNBQ2pCQyxPQUFPO0FBQUEsY0FDUEMsU0FBUztBQUFBLGNBQ1Q3RCxTQUFTRyxVQUFXaEMsT0FBT1gsTUFBTSxDQUFDLEtBQUt5QyxVQUFVRyxZQUFZO0FBQUEsWUFDL0QsQ0FBQztBQUFBLFVBQ0g7QUFDQSxjQUFJdEUsU0FBUyxXQUFXO0FBQ3RCLGtCQUFNK1UsY0FBYVAscUJBQXFCelEsVUFBVXVCLFNBQVM7QUFDM0Qsa0JBQU0wUCxlQUFleEksc0JBQXNCNUksY0FBY3ZDLFFBQVExQixLQUM3RDZNLHFCQUFxQjRGLFNBQ3JCL1AsT0FBT2hCLFFBQVFyRCw2QkFBNkIrRyxTQUFTdUcsY0FBYyxDQUFDLENBQUM7QUFDekUsbUJBQ0U7QUFBQSxjQUFDO0FBQUE7QUFBQSxnQkFFQyxXQUFXLDRCQUE0QnlKLGNBQWEsaUJBQWlCLEVBQUUsR0FBR1Asb0JBQW9CLGdCQUFnQixFQUFFO0FBQUEsZ0JBQ2hILE9BQU8sRUFBRW5SLE1BQU07QUFBQSxnQkFDZixPQUFPLEdBQUdoQyxRQUFRcEIsS0FBSyxNQUFNc0UsU0FBU0osVUFBVThRLG9CQUFvQjVULFFBQVEwSyxRQUFRLENBQUM7QUFBQSxnQkFFckY7QUFBQSx5Q0FBQyxZQUFPLE1BQUssVUFBUyxnQkFBY2dKLGFBQVksU0FBUyxNQUFNRCxTQUFTLEVBQUV4UCxNQUFNLFVBQVUsQ0FBQyxHQUN6RjtBQUFBLDJDQUFDLFVBQU00UCxpQkFBTy9ULGVBQWUsQ0FBQyxFQUFFZ1UsU0FBUyxHQUFHLEdBQUcsS0FBL0M7QUFBQTtBQUFBO0FBQUE7QUFBQSwyQkFBaUQ7QUFBQSxvQkFBUTlULFFBQVFwQjtBQUFBQSx1QkFEbkU7QUFBQTtBQUFBO0FBQUE7QUFBQSx5QkFFQTtBQUFBLGtCQUNDdU0sc0JBQXNCNUksY0FBY3ZDLFFBQVExQixLQUFLLHVCQUFDLFlBQVE0RTtBQUFBQSw2QkFBU3ZGLEtBQUtFLElBQUksR0FBRzhWLGVBQWUsQ0FBQyxDQUFDO0FBQUEsb0JBQUU7QUFBQSxvQkFBV3pRLFNBQVN5USxZQUFZO0FBQUEsb0JBQUU7QUFBQSx1QkFBbkY7QUFBQTtBQUFBO0FBQUE7QUFBQSx5QkFBeUYsSUFBWTtBQUFBLGtCQUN2SjtBQUFBLG9CQUFDO0FBQUE7QUFBQSxzQkFDQyxNQUFLO0FBQUEsc0JBQ0wsV0FBVTtBQUFBLHNCQUNWLFVBQVUzVCxRQUFRd047QUFBQUEsc0JBQ2xCLGNBQVksVUFBVXhOLFFBQVFwQixLQUFLO0FBQUEsc0JBQ25DLE9BQU9vQixRQUFRd04sU0FBUywrQ0FBK0Msa0JBQWtCOUosU0FBU3VHLG1CQUFtQixXQUFXLFdBQVcsU0FBUztBQUFBLHNCQUNwSixlQUFlLENBQUMzRCxVQUFVO0FBQUVBLDhCQUFNMkYsZUFBZTtBQUFHM0YsOEJBQU11SCxnQkFBZ0I7QUFBR3dELDJDQUFtQnJSLFFBQVExQixJQUFJd0IsWUFBWTtBQUFBLHNCQUFHO0FBQUEsc0JBQzNILGVBQWUsQ0FBQ3dHLFVBQVVpSyxtQkFBbUJqSyxPQUFPLEVBQUUvRCxXQUFXdkMsUUFBUTFCLElBQUl3QixjQUFjMlEsY0FBY3pRLFFBQVFwQixPQUFPNE8sUUFBUXhOLFFBQVF3TixPQUFPLENBQUM7QUFBQSxzQkFDaEosZUFBZXdEO0FBQUFBLHNCQUNmLGFBQWFJO0FBQUFBLHNCQUNiLGlCQUFpQkE7QUFBQUE7QUFBQUEsb0JBVm5CO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQSxrQkFVb0M7QUFBQTtBQUFBO0FBQUEsY0FuQi9CcFIsUUFBUTFCO0FBQUFBLGNBRGY7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQSxZQXNCQTtBQUFBLFVBRUo7QUFDQSxjQUFJSyxTQUFTLFVBQVU7QUFDckIsbUJBQ0UsdUJBQUMsU0FBSSxXQUFVLHFCQUFxQyxPQUFPLEVBQUVxRCxNQUFNLEdBQ2pFO0FBQUEscUNBQUMsU0FBSSxXQUFVLDRCQUEyQixlQUFZLFFBQ25EaEMsa0JBQVFHLE9BQU9DLEtBQUt3UyxNQUFNLENBQUMsRUFBRXBMLElBQUksQ0FBQ3RILEtBQUtILGFBQWE7QUFDbkQsc0JBQU1nVSxVQUFVL1QsUUFBUUcsT0FBT0MsS0FBS0wsUUFBUTtBQUM1QyxzQkFBTXNDLE9BQU8rUSxhQUFhVyxRQUFRMVQsRUFBRTtBQUNwQyxzQkFBTThSLFFBQVFpQixhQUFhbFQsSUFBSUcsRUFBRTtBQUNqQyx1QkFDRTtBQUFBLGtCQUFDO0FBQUE7QUFBQSxvQkFDQyxXQUFXdkIsa0JBQWtCaVYsU0FBUzdULEdBQUcsSUFBSSx1QkFBdUI7QUFBQSxvQkFFcEUsT0FBTyxFQUFFbUMsTUFBTSxHQUFHQSxJQUFJLEtBQUtMLE9BQU8sR0FBR3JFLEtBQUtFLElBQUksS0FBS3NVLFFBQVE5UCxJQUFJLENBQUMsSUFBSTtBQUFBO0FBQUEsa0JBRC9ELEdBQUdyQyxRQUFRMUIsRUFBRSxnQkFBZ0J5QixRQUFRO0FBQUEsa0JBRjVDO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUEsZ0JBR3dFO0FBQUEsY0FHNUUsQ0FBQyxLQVpIO0FBQUE7QUFBQTtBQUFBO0FBQUEscUJBYUE7QUFBQSxjQUNDQyxRQUFRRyxPQUFPQyxLQUFLb0gsSUFBSSxDQUFDdEgsS0FBS0gsYUFBYTtBQUMxQyxzQkFBTWlVLGVBQWV2WCx1Q0FBdUN1RCxRQUFRRyxPQUFPQyxNQUFNTCxRQUFRO0FBQ3pGLHNCQUFNZ1AsUUFBUSxVQUFVL08sUUFBUTFCLEVBQUUsSUFBSXlCLFFBQVE7QUFDOUMsc0JBQU1rVSxlQUFlLEVBQUVoUSxNQUFNLGNBQWMxQixXQUFXdkMsUUFBUTFCLElBQUl5QixTQUFTO0FBQzNFLHNCQUFNMlQsY0FBYVAscUJBQXFCelEsVUFBVXVCLFNBQVMsZ0JBQWdCdkIsVUFBVTNDLGFBQWFBO0FBQ2xHLHNCQUFNd0YsV0FBV3lPLGFBQWF4RztBQUM5Qix1QkFDRTtBQUFBLGtCQUFDO0FBQUE7QUFBQSxvQkFDQyxNQUFLO0FBQUEsb0JBRUwsV0FBVyxtQkFBbUJqSSxXQUFXLGlCQUFpQixlQUFlLEdBQUdtTyxjQUFhLGlCQUFpQixFQUFFLEdBQUd6SSxtQkFBbUI4RCxVQUFVQSxRQUFRLG9CQUFvQixFQUFFO0FBQUEsb0JBQzFLLE9BQU8sRUFBRTFNLE1BQU1nUixjQUFjblQsSUFBSUcsRUFBRSxFQUFFO0FBQUEsb0JBQ3JDLE9BQU9rRixXQUNILDJCQUEyQm5DLG9CQUFvQmxELElBQUlHLEVBQUUsQ0FBQyx5QkFDdEQsaUJBQWlCK0Msb0JBQW9CbEQsSUFBSUcsRUFBRSxDQUFDO0FBQUEsb0JBQ2hELGNBQVksR0FBR2tGLFdBQVcsZUFBZSxFQUFFLGlCQUFpQm5DLG9CQUFvQmxELElBQUlHLEVBQUUsQ0FBQyxZQUFZTCxRQUFRcEIsS0FBSztBQUFBLG9CQUNoSCxnQkFBYzhVO0FBQUFBLG9CQUNkLGVBQWVuTyxXQUFXMk8sU0FBWSxDQUFDNU4sVUFBVWlILGdCQUFnQmpILE9BQU87QUFBQSxzQkFDdEVyQyxNQUFNO0FBQUEsc0JBQ044SztBQUFBQSxzQkFDQXZCLFFBQVE7QUFBQSxzQkFDUm5OLElBQUlILElBQUlHO0FBQUFBLHNCQUNSUDtBQUFBQSxzQkFDQUM7QUFBQUEsc0JBQ0FzUCxnQkFBZ0JyTTtBQUFBQSxzQkFDaEJrUTtBQUFBQSxzQkFDQWpRLFVBQVVILFVBQVVHLFlBQVlpUTtBQUFBQSxzQkFDaENyUSxTQUFTRyxVQUFXaEMsT0FBT2QsSUFBSUcsRUFBRSxLQUFLeUMsVUFBVUcsWUFBWTtBQUFBLHNCQUM1RFAsV0FBV3VSO0FBQUFBLHNCQUNYN0UsYUFBYSxZQUFZTCxLQUFLO0FBQUEsb0JBQ2hDLENBQUM7QUFBQSxvQkFDRCxlQUFleEosV0FBVzJPLFNBQVlwRjtBQUFBQSxvQkFDdEMsYUFBYXZKLFdBQVcyTyxTQUFZdEU7QUFBQUEsb0JBQ3BDLGlCQUFpQnJLLFdBQVcyTyxTQUFZdEU7QUFBQUEsb0JBQ3hDLFNBQVMsTUFBTVMsa0JBQWtCdEIsT0FBTyxNQUFNMEUsU0FBUyxFQUFFeFAsTUFBTSxjQUFjbEUsU0FBUyxHQUFHRyxJQUFJRyxFQUFFLENBQUM7QUFBQTtBQUFBLGtCQXpCM0YwTztBQUFBQSxrQkFGUDtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBLGdCQTJCb0c7QUFBQSxjQUd4RyxDQUFDO0FBQUEsaUJBcERxQy9PLFFBQVExQixJQUFoRDtBQUFBO0FBQUE7QUFBQTtBQUFBLG1CQXFEQTtBQUFBLFVBRUo7QUFDQSxjQUFJSyxTQUFTLFNBQVM7QUFDcEIsa0JBQU0rVSxjQUFhUCxxQkFBcUJ6USxVQUFVdUIsU0FBUztBQUMzRCxrQkFBTStCLGFBQWFoRyxRQUFRa0UsTUFBTUMsU0FBUyxTQUFTbkUsUUFBUWtFLE1BQU1FLGFBQWFILFNBQVMsUUFDbkZqRSxRQUFRa0UsTUFBTUUsZUFDZDtBQUNKLG1CQUNFLHVCQUFDLFNBQUksV0FBVyxvQkFBb0JzUCxjQUFhLGlCQUFpQixFQUFFLElBQXFCLE9BQU8sRUFBRTFSLE1BQU0sR0FDdEc7QUFBQTtBQUFBLGdCQUFDO0FBQUE7QUFBQSxrQkFDQyxNQUFLO0FBQUEsa0JBQ0wsV0FBVywyQkFBMkJoQyxRQUFRa0UsTUFBTUMsU0FBUyxRQUFRLGNBQWMsRUFBRSxHQUFHdVAsY0FBYSxpQkFBaUIsRUFBRTtBQUFBLGtCQUN4SCxnQkFBY0E7QUFBQUEsa0JBQ2QsU0FBUyxNQUFNRCxTQUFTLEVBQUV4UCxNQUFNLFFBQVEsR0FBRytCLGFBQWFBLFdBQVdDLE1BQU0sQ0FBQztBQUFBLGtCQUMxRWpHLGtCQUFRa0UsTUFBTUMsU0FBUyxRQUFRbkUsUUFBUWtFLE1BQU1pUSxRQUFRaE4sUUFBUSxPQUFPLEVBQUUsSUFBSTtBQUFBO0FBQUEsZ0JBTDVFO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQSxjQUt1RjtBQUFBLGNBQ3RGbkIsYUFBYSxDQUFDLFNBQVMsS0FBSyxFQUFFd0I7QUFBQUEsZ0JBQUksQ0FBQ25ELFNBQ2xDO0FBQUEsa0JBQUM7QUFBQTtBQUFBLG9CQUNDLE1BQUs7QUFBQSxvQkFFTCxXQUFXLG1DQUFtQ3FQLGVBQWNoUixVQUFVNkIsWUFBWSxjQUFjRixJQUFJLEtBQUssaUJBQWlCLEVBQUU7QUFBQSxvQkFDNUgsT0FBTyxFQUFFaEMsTUFBTWlSLHNCQUFzQnROLFdBQVczQixJQUFJLENBQUMsRUFBRTtBQUFBLG9CQUN2RCxPQUFPLG9CQUFvQkEsSUFBSTtBQUFBLG9CQUMvQixjQUFZLEdBQUdyRSxRQUFRcEIsS0FBSyxxQkFBcUJ5RixJQUFJO0FBQUEsb0JBQ3JELFNBQVMsTUFBTW9QLFNBQVMsRUFBRXhQLE1BQU0sU0FBU00sU0FBUyxjQUFjRixJQUFJLEdBQUcsR0FBRzJCLFdBQVczQixJQUFJLENBQUM7QUFBQTtBQUFBLGtCQUxyRkE7QUFBQUEsa0JBRlA7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQSxnQkFPOEY7QUFBQSxjQUUvRixJQUFJO0FBQUEsaUJBakJzRXJFLFFBQVExQixJQUFyRjtBQUFBO0FBQUE7QUFBQTtBQUFBLG1CQWtCQTtBQUFBLFVBRUo7QUFDQSxjQUFJSyxTQUFTLFFBQVE7QUFDbkIsbUJBQ0U7QUFBQSxjQUFDO0FBQUE7QUFBQSxnQkFDQyxXQUFXLG9CQUFvQnFCLFFBQVF3RSxLQUFLTSxtQkFBbUIsNkJBQTZCLEVBQUU7QUFBQSxnQkFFOUYsT0FBTyxFQUFFOUMsTUFBTTtBQUFBLGdCQUNmLGVBQWV5UDtBQUFBQSxnQkFDZixlQUFlTztBQUFBQSxnQkFDZixhQUFhQztBQUFBQSxnQkFDYixpQkFBaUJBO0FBQUFBLGdCQUVmalM7QUFBQUEsMkJBQVF3RSxLQUFLQyxRQUFRLElBQUkrQyxJQUFJLENBQUM5QyxRQUFRO0FBQ3RDLDBCQUFNZ1AsY0FBYW5KLG1CQUFtQnRMLEtBQUssQ0FBQ21QLFdBQVdBLE9BQU83TCxjQUFjdkMsUUFBUTFCLE1BQU04UCxPQUFPdkosVUFBVUgsSUFBSXBHLEVBQUU7QUFDakgsMEJBQU04VixZQUFZMVIsVUFBVXVCLFNBQVMsU0FBU3ZCLFVBQVVILGNBQWN2QyxRQUFRMUIsTUFBTW9FLFVBQVVtQyxVQUFVSCxJQUFJcEc7QUFDNUcsMEJBQU1pUixXQUFXdlQsNkJBQTZCMEksR0FBRztBQUNqRCwwQkFBTTJQLGlCQUFpQjlFLGFBQWEsWUFDaEN0VCxtQ0FBbUN5SSxLQUFLN0UsVUFBU3lVLFFBQVFDLFVBQVUsSUFDbkU7QUFDSiwwQkFBTUMsYUFBYUgsaUJBQWlCMVcsS0FBS0UsSUFBSSxNQUFTd1csZUFBZXBPLE1BQU1vTyxlQUFldFAsS0FBSyxJQUFJO0FBQ25HLDBCQUFNMFAsV0FBV0osaUJBQWlCO0FBQUEsc0JBQ2hDaFMsTUFBTW1SLGFBQWFhLGVBQWV0UCxLQUFLO0FBQUEsc0JBQ3ZDL0MsT0FBTyxHQUFHckUsS0FBS0UsSUFBSSxLQUFLMlcsYUFBYSxHQUFHLENBQUM7QUFBQSxvQkFDM0MsSUFBSSxFQUFFblMsTUFBTW1SLGFBQWE5TyxJQUFJRSxJQUFJLEVBQUU7QUFDbkMsMEJBQU04UCxnQkFBZ0JMLGlCQUNsQixJQUFLM1AsSUFBSUUsT0FBT3lQLGVBQWV0UCxTQUFTeVAsYUFBYyxHQUFHLE1BQ3pEO0FBQ0osMEJBQU1SLGVBQWV0WCxpQ0FBaUNnSSxHQUFHO0FBQ3pELDBCQUFNcUssUUFBUSxPQUFPL08sUUFBUTFCLEVBQUUsSUFBSW9HLElBQUlwRyxFQUFFO0FBQ3pDLDBCQUFNcVcsZUFBZSxFQUFFMVEsTUFBTSxPQUFPMUIsV0FBV3ZDLFFBQVExQixJQUFJdUcsT0FBT0gsSUFBSXBHLElBQUlpRyxTQUFTLFFBQVE7QUFDM0YsMkJBQ0U7QUFBQSxzQkFBQztBQUFBO0FBQUEsd0JBQ0MsTUFBSztBQUFBLHdCQUNMLFdBQVcsdUJBQXVCZ0wsUUFBUSxHQUFHeUUsYUFBYXBXLFFBQVFvVyxhQUFhblcsTUFBTSxpQkFBaUIsZUFBZSxHQUFHNlYsY0FBYSxpQkFBaUIsRUFBRSxHQUFHVSxZQUFZLDBCQUEwQixFQUFFO0FBQUEsd0JBRW5NLG1CQUFpQnBVLFFBQVExQjtBQUFBQSx3QkFDekIsZUFBYW9HLElBQUlwRztBQUFBQSx3QkFDakIsT0FBT21XO0FBQUFBLHdCQUNQLGNBQVksR0FBR2xGLGFBQWEsYUFBYSxhQUFhLFNBQVMsWUFBWTVSLEtBQUsyTCxNQUFNNUUsSUFBSUUsT0FBTyxHQUFHLENBQUMsSUFBSXlQLGlCQUFpQixjQUFjMVcsS0FBSzJMLE1BQU0rSyxlQUFldFAsUUFBUSxHQUFHLENBQUMsSUFBSXBILEtBQUsyTCxNQUFNK0ssZUFBZXBPLE1BQU0sR0FBRyxDQUFDLE1BQU0sRUFBRSxNQUFNdkIsSUFBSUYsSUFBSTtBQUFBLHdCQUM1TyxnQkFBY2tQO0FBQUFBLHdCQUNkLE9BQU8sR0FBR25FLGFBQWEsYUFBYSxhQUFhLFNBQVMscURBQXFEN0ssSUFBSUYsSUFBSTtBQUFBLHdCQUN2SCxlQUFlLENBQUM4QixVQUFVaUgsZ0JBQWdCakgsT0FBTztBQUFBLDBCQUMvQ3JDLE1BQU07QUFBQSwwQkFDTjhLO0FBQUFBLDBCQUNBdkIsUUFBUXdHLGFBQWFwVyxRQUFRb1csYUFBYW5XO0FBQUFBLDBCQUMxQ0QsS0FBS29XLGFBQWFwVztBQUFBQSwwQkFDbEJDLEtBQUttVyxhQUFhblc7QUFBQUEsMEJBQ2xCd0MsSUFBSXFFLElBQUlFO0FBQUFBLDBCQUNSOUU7QUFBQUEsMEJBQ0ErRSxPQUFPSCxJQUFJcEc7QUFBQUEsMEJBQ1grUSxnQkFBZ0JyTTtBQUFBQSwwQkFDaEJrUTtBQUFBQSwwQkFDQWpRLFVBQVVILFVBQVVHLFlBQVlpUTtBQUFBQSwwQkFDaENyUSxTQUFTRyxVQUFXaEMsT0FBTzBELElBQUlFLElBQUksS0FBSzlCLFVBQVVHLFlBQVk7QUFBQSwwQkFDOURQLFdBQVdpUztBQUFBQSwwQkFDWHZGLGFBQWEsWUFBWUwsS0FBSztBQUFBLHdCQUNoQyxDQUFDO0FBQUEsd0JBQ0QsZUFBZUQ7QUFBQUEsd0JBQ2YsYUFBYWM7QUFBQUEsd0JBQ2IsaUJBQWlCQTtBQUFBQSx3QkFDakIsV0FBVyxDQUFDdEosVUFBVTtBQUNwQiw4QkFBSUEsTUFBTStILFlBQVkvSCxNQUFNc08sU0FBUyxTQUFTO0FBQzVDdE8sa0NBQU0yRixlQUFlO0FBQ3JCLGtDQUFNK0IsZ0JBQWdCelEsaUNBQWlDb0ksTUFBTW9ILFlBQVksRUFBRXJLLFdBQVdpUyxZQUFZO0FBQ2xHaFAsa0NBQU1ZLGFBQWF5SCxhQUFhO0FBQ2hDckksa0NBQU1hLGFBQWEsRUFBRUMsT0FBTyxZQUFZQyxTQUFTLE9BQU83RCxTQUFTRyxVQUFXaEMsT0FBTzBELElBQUlFLElBQUksS0FBSzlCLFVBQVVHLFlBQVksR0FBSSxDQUFDO0FBQUEsMEJBQzdIO0FBQUEsd0JBQ0Y7QUFBQSx3QkFDQSxTQUFTLE1BQU1vTixrQkFBa0J0QixPQUFPLE1BQU07QUFDNUNwSixnQ0FBTWEsYUFBYSxFQUFFQyxPQUFPLFlBQVlDLFNBQVMsT0FBTzdELFNBQVNHLFVBQVdoQyxPQUFPMEQsSUFBSUUsSUFBSSxLQUFLOUIsVUFBVUcsWUFBWSxHQUFJLENBQUM7QUFBQSx3QkFDN0gsQ0FBQztBQUFBLHdCQUNGLGlDQUFDLFVBQUssV0FBVSwwQkFBeUIsT0FBTyxFQUFFWixNQUFNcVMsY0FBYyxHQUFHLGVBQVksVUFBckY7QUFBQTtBQUFBO0FBQUE7QUFBQSwrQkFBMkY7QUFBQTtBQUFBLHNCQXJDckZoUSxJQUFJcEc7QUFBQUEsc0JBSFg7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQSxvQkF3QytGO0FBQUEsa0JBRW5HLENBQUM7QUFBQSxrQkFDQTBCLFFBQVF3RSxLQUFLTSxvQkFBb0IsTUFBTTtBQUN0QywwQkFBTXFLLFNBQVNuUCxRQUFRd0UsS0FBS007QUFDNUIsMEJBQU0rUCxXQUFXMUYsT0FBT2xKLE1BQU1rSixPQUFPcEs7QUFDckMsMEJBQU0rUCxTQUFTM0YsT0FBT3BLLFFBQVM4UCxXQUFXO0FBQzFDLDBCQUFNbkIsY0FBYVAscUJBQXFCelEsVUFBVXVCLFNBQVM7QUFDM0QsMEJBQU04SyxRQUFRLHFCQUFxQi9PLFFBQVExQixFQUFFLElBQUk2USxPQUFPN1EsRUFBRTtBQUMxRCwwQkFBTXlXLGtCQUFrQixFQUFFOVEsTUFBTSxxQkFBcUIxQixXQUFXdkMsUUFBUTFCLEdBQUc7QUFDM0UsMkJBQ0U7QUFBQSxzQkFBQztBQUFBO0FBQUEsd0JBQ0MsTUFBSztBQUFBLHdCQUNMLFdBQVcsOENBQThDb1YsY0FBYSxpQkFBaUIsRUFBRTtBQUFBLHdCQUN6RixPQUFPLEVBQUVyUixNQUFNaVIsc0JBQXNCbkUsT0FBT3BLLEtBQUssR0FBRy9DLE9BQU91UixtQkFBbUJwRSxPQUFPcEssT0FBT29LLE9BQU9sSixHQUFHLEVBQUU7QUFBQSx3QkFDeEcsY0FBWSwwQkFBMEJ0SSxLQUFLMkwsTUFBTTZGLE9BQU9wSyxRQUFRLEdBQUcsQ0FBQyxRQUFRcEgsS0FBSzJMLE1BQU02RixPQUFPbEosTUFBTSxHQUFHLENBQUM7QUFBQSx3QkFDeEcsZ0JBQWN5TjtBQUFBQSx3QkFDZCxPQUFNO0FBQUEsd0JBQ04sZUFBZSxDQUFDcE4sVUFBVWlILGdCQUFnQmpILE9BQU87QUFBQSwwQkFDL0NyQyxNQUFNO0FBQUEsMEJBQ044SztBQUFBQSwwQkFDQXZCLFFBQVE7QUFBQSwwQkFDUjVQLEtBQUtpWCxXQUFXO0FBQUEsMEJBQ2hCaFgsS0FBS00sd0JBQXlCMFcsV0FBVztBQUFBLDBCQUN6Q3hVLElBQUl5VTtBQUFBQSwwQkFDSmhWO0FBQUFBLDBCQUNBdVAsZ0JBQWdCck07QUFBQUEsMEJBQ2hCa1E7QUFBQUEsMEJBQ0FqUSxVQUFVSCxVQUFVRyxZQUFZaVE7QUFBQUEsMEJBQ2hDclEsU0FBU0csVUFBVzhSLFVBQVVoUyxVQUFVRyxZQUFZO0FBQUEsMEJBQ3BEUCxXQUFXcVM7QUFBQUEsMEJBQ1gzRixhQUFhLFlBQVlMLEtBQUs7QUFBQSx3QkFDaEMsQ0FBQztBQUFBLHdCQUNELGVBQWVEO0FBQUFBLHdCQUNmLGFBQWFjO0FBQUFBLHdCQUNiLGlCQUFpQkE7QUFBQUEsd0JBQ2pCLFNBQVMsTUFBTVMsa0JBQWtCdEIsT0FBTyxNQUFNMEUsU0FBUyxFQUFFeFAsTUFBTSxvQkFBb0IsR0FBR2tMLE9BQU9wSyxLQUFLLENBQUM7QUFBQSx3QkFBRTtBQUFBO0FBQUEsc0JBekJ2RztBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUEsb0JBMEJrQjtBQUFBLGtCQUV0QixHQUFHLElBQUk7QUFBQSxtQkFDTC9FLFFBQVF3RSxLQUFLaUQsVUFBVSxJQUFJbkgsU0FDM0IsdUJBQUMsWUFBTyxNQUFLLFVBQVMsV0FBVyw4QkFBOEI2UyxxQkFBcUJ6USxVQUFVdUIsU0FBUyxZQUFZLGlCQUFpQixFQUFFLElBQUksU0FBUyxNQUFNd1AsU0FBUyxFQUFFeFAsTUFBTSxVQUFVLENBQUMsR0FBRTtBQUFBO0FBQUEsb0JBQ3pLakUsUUFBUXdFLEtBQUtpRCxPQUFPbkg7QUFBQUEsb0JBQU87QUFBQSx1QkFEekM7QUFBQTtBQUFBO0FBQUE7QUFBQSx5QkFFQSxJQUNFO0FBQUE7QUFBQTtBQUFBLGNBOUdDTixRQUFRMUI7QUFBQUEsY0FGZjtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBLFlBaUhBO0FBQUEsVUFFSjtBQUNBLGdCQUFNb1YsYUFBYVAscUJBQXFCelEsVUFBVXVCLFNBQVM7QUFDM0QsZ0JBQU0rUSxhQUFhaFYsUUFBUWdGLGFBQWFmLFNBQVMsU0FBU2pFLFFBQVFnRixZQUFZRSxrQkFBa0I7QUFDaEcsaUJBQ0UsdUJBQUMsU0FBSSxXQUFXLG9CQUFvQndPLGFBQWEsaUJBQWlCLEVBQUUsSUFBcUIsT0FBTyxFQUFFMVIsTUFBTSxHQUN0RztBQUFBO0FBQUEsY0FBQztBQUFBO0FBQUEsZ0JBQ0MsTUFBSztBQUFBLGdCQUNMLFdBQVcsaUNBQWlDaEMsUUFBUWdGLGFBQWFmLFNBQVMsU0FBUyxvQkFBb0IsRUFBRSxHQUFHeVAsYUFBYSxpQkFBaUIsRUFBRTtBQUFBLGdCQUM1SSxnQkFBY0E7QUFBQUEsZ0JBQ2QsU0FBUyxNQUFNRCxTQUFTLEVBQUV4UCxNQUFNLGNBQWMsR0FBRytRLGNBQWMsQ0FBQztBQUFBLGdCQUNoRWhWLGtCQUFRZ0YsYUFBYWYsU0FBUyxTQUFTakUsUUFBUWdGLFlBQVlmLE9BQU87QUFBQTtBQUFBLGNBTHBFO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQSxZQUt1RTtBQUFBLFlBQ3RFakQsT0FBT2lFLFNBQVMrUCxVQUFVLElBQ3pCO0FBQUEsY0FBQztBQUFBO0FBQUEsZ0JBQ0MsTUFBSztBQUFBLGdCQUNMLFdBQVcseUNBQXlDdEIsY0FBY2hSLFVBQVU2QixZQUFZLGVBQWUsaUJBQWlCLEVBQUU7QUFBQSxnQkFDMUgsT0FBTyxFQUFFbEMsTUFBTWdSLGNBQWMyQixVQUFVLEVBQUU7QUFBQSxnQkFDekMsT0FBTTtBQUFBLGdCQUNOLGNBQVksR0FBR2hWLFFBQVFwQixLQUFLO0FBQUEsZ0JBQzVCLFNBQVMsTUFBTTZVLFNBQVMsRUFBRXhQLE1BQU0sZUFBZU0sU0FBUyxhQUFhLEdBQUd5USxVQUFVO0FBQUE7QUFBQSxjQU5wRjtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUEsWUFNc0YsSUFFcEY7QUFBQSxlQWhCdUVoVixRQUFRMUIsSUFBckY7QUFBQTtBQUFBO0FBQUE7QUFBQSxpQkFpQkE7QUFBQSxRQUVKLENBQUMsS0FyUmtFSyxNQUFyRTtBQUFBO0FBQUE7QUFBQTtBQUFBLGVBc1JBO0FBQUEsTUFDQztBQUFBLFNBclNIO0FBQUE7QUFBQTtBQUFBO0FBQUEsV0FzU0EsS0F2U0Y7QUFBQTtBQUFBO0FBQUE7QUFBQSxXQXdTQTtBQUFBLE9BeFRGO0FBQUE7QUFBQTtBQUFBO0FBQUEsU0F5VEE7QUFFSjtBQUFDMkwsR0F4cUJRRixVQUFRO0FBQUEsTUFBUkE7QUEwcUJULFNBQVM2SyxrQkFBa0IsRUFBRXRQLE9BQU9qQyxTQUFTLEdBQUc7QUFDOUMsUUFBTXdSLGVBQWVBLENBQUNDLE9BQU9qVixLQUFLeEMsVUFBVWlJLE1BQU1DLE9BQU8sVUFBVTFGLEdBQUcsSUFBSSxDQUFDMkYsVUFBVTtBQUNuRixRQUFJc1AsVUFBVSxXQUFZdFAsT0FBTXlPLFFBQVFwVSxHQUFHLElBQUl4QztBQUFBQSxTQUMxQztBQUNILFlBQU0wWCxZQUFZRCxVQUFVLGFBQWEsa0JBQWtCQTtBQUMzRHRQLFlBQU15TyxRQUFRYyxTQUFTLEVBQUVsVixHQUFHLElBQUl4QztBQUFBQSxJQUNsQztBQUFBLEVBQ0YsR0FBRyxFQUFFMFIsYUFBYSxVQUFVK0YsS0FBSyxJQUFJalYsR0FBRyxHQUFHLENBQUM7QUFDNUMsUUFBTW1WLG9CQUFvQjNSLFNBQVNoQixVQUFVdUIsU0FBUyxhQUNsRFAsU0FBU2hCLFVBQVU3RCxZQUFZLEtBQy9CO0FBQ0osUUFBTXlXLFNBQVNELGtCQUFrQi9VLFNBQzdCdEYsZ0NBQWdDd1gsT0FBTyxDQUFDMkMsVUFBVUUsa0JBQWtCRSxTQUFTSixNQUFNN1csRUFBRSxDQUFDLElBQ3RGdEQ7QUFDSixRQUFNd2EsVUFBVTlSLFNBQVNoQixVQUFVcVEsYUFDL0IsR0FBR3JQLFNBQVNoQixVQUFVcVEsVUFBVSxXQUNoQztBQUNKLFNBQ0UsbUNBQ0U7QUFBQSwyQkFBQyxZQUFPO0FBQUEsNkJBQUMsVUFBTXlDLHFCQUFQO0FBQUE7QUFBQTtBQUFBO0FBQUEsYUFBZTtBQUFBLE1BQU8sdUJBQUMsWUFBTywrQkFBUjtBQUFBO0FBQUE7QUFBQTtBQUFBLGFBQXVCO0FBQUEsU0FBckQ7QUFBQTtBQUFBO0FBQUE7QUFBQSxXQUE4RDtBQUFBLElBQzdERixPQUFPOU47QUFBQUEsTUFBSSxDQUFDMk4sVUFDWCx1QkFBQyxhQUFRLE1BQUksTUFBZ0IscUJBQW1CQSxNQUFNN1csSUFDcEQ7QUFBQSwrQkFBQyxhQUFTNlcsZ0JBQU12VyxTQUFoQjtBQUFBO0FBQUE7QUFBQTtBQUFBLGVBQXNCO0FBQUEsUUFDckJ1VyxNQUFNN1csT0FBTyxlQUFlLHVCQUFDLE9BQUUsV0FBVSxxQkFBb0IsZ01BQWpDO0FBQUE7QUFBQTtBQUFBO0FBQUEsZUFBaU4sSUFBTztBQUFBLFFBQ3BQNlcsTUFBTTdXLE9BQU8sb0JBQW9CLHVCQUFDLE9BQUUsV0FBVSxxQkFBb0IsZ0xBQWpDO0FBQUE7QUFBQTtBQUFBO0FBQUEsZUFBaU0sSUFBTztBQUFBLFFBQ3pPNlcsTUFBTU0sU0FBU2pPLElBQUksQ0FBQ25KLFlBQVk7QUFDL0IsZ0JBQU1tQixTQUFTMlYsTUFBTTdXLE9BQU8sYUFDeEJvRixTQUFTN0QsU0FBU3lVLFVBQ2xCNVEsU0FBUzdELFNBQVN5VSxRQUFRYSxNQUFNN1csT0FBTyxhQUFhLGtCQUFrQjZXLE1BQU03VyxFQUFFO0FBQ2xGLGNBQUk2VyxNQUFNN1csT0FBTyxnQkFBZ0JELFFBQVFDLE9BQU8sY0FBZSxRQUFPO0FBQ3RFLGNBQUk2VyxNQUFNN1csT0FBTyxnQkFBZ0JELFFBQVFDLE9BQU8saUJBQWlCO0FBQy9ELG1CQUNFO0FBQUEsY0FBQztBQUFBO0FBQUEsZ0JBRUMsT0FBTTtBQUFBLGdCQUNOLE9BQU9rQixPQUFPa1c7QUFBQUEsZ0JBQ2QsS0FBS2xXLE9BQU9tVztBQUFBQSxnQkFDWixLQUFLdFgsUUFBUVQ7QUFBQUEsZ0JBQ2IsS0FBS1MsUUFBUVI7QUFBQUEsZ0JBQ2IsTUFBTVEsUUFBUXFLO0FBQUFBLGdCQUNkLGVBQWUsQ0FBQ2hMLFVBQVV3WCxhQUFhQyxNQUFNN1csSUFBSSxpQkFBaUJaLEtBQUs7QUFBQSxnQkFDdkUsYUFBYSxDQUFDQSxVQUFVd1gsYUFBYUMsTUFBTTdXLElBQUksZUFBZVosS0FBSztBQUFBLGdCQUNuRSxNQUFLO0FBQUE7QUFBQSxjQVREO0FBQUEsY0FETjtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBLFlBVXlIO0FBQUEsVUFHN0g7QUFDQSxpQkFDRTtBQUFBLFlBQUM7QUFBQTtBQUFBLGNBRUMsT0FBT1csUUFBUU87QUFBQUEsY0FDZixPQUFPWSxPQUFPbkIsUUFBUUMsRUFBRTtBQUFBLGNBQ3hCLEtBQUtELFFBQVFUO0FBQUFBLGNBQ2IsS0FBS1MsUUFBUVI7QUFBQUEsY0FDYixNQUFNUSxRQUFRcUs7QUFBQUEsY0FDZCxNQUFNckssUUFBUXVLO0FBQUFBLGNBQ2QsVUFBVSxDQUFDbEwsVUFBVXdYLGFBQWFDLE1BQU03VyxJQUFJRCxRQUFRQyxJQUFJWixLQUFLO0FBQUE7QUFBQSxZQVB4RFcsUUFBUUM7QUFBQUEsWUFEZjtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBLFVBUWlFO0FBQUEsUUFHckUsQ0FBQztBQUFBLFFBQ0E2VyxNQUFNN1csT0FBTyxlQUFlLHVCQUFDLE9BQUUsV0FBVSw2Q0FBNEM7QUFBQSxpQ0FBQyxZQUFPLDBDQUFSO0FBQUE7QUFBQTtBQUFBO0FBQUEsaUJBQWtDO0FBQUEsVUFBUztBQUFBLGFBQXBHO0FBQUE7QUFBQTtBQUFBO0FBQUEsZUFBcVMsSUFBTztBQUFBLFdBdEN4VDZXLE1BQU03VyxJQUF6QjtBQUFBO0FBQUE7QUFBQTtBQUFBLGFBdUNBO0FBQUEsSUFDRDtBQUFBLE9BM0NIO0FBQUE7QUFBQTtBQUFBO0FBQUEsU0E0Q0E7QUFFSjtBQUFDc1gsTUFoRVFYO0FBa0VULFNBQVNZLGlCQUFpQixFQUFFbFEsT0FBT2pDLFVBQVUxRCxRQUFRLEdBQUc7QUFDdEQsUUFBTUYsZUFBZXdDLGdCQUFnQm9CLFNBQVM3RCxVQUFVRyxRQUFRMUIsRUFBRTtBQUNsRSxRQUFNd1gsa0JBQWtCcFMsU0FBU0MsY0FBYzFELFdBQVdILFlBQVk7QUFDdEUsUUFBTWlXLG9CQUFvQnJTLFNBQVN1RyxtQkFBbUIsV0FBVyxtQkFBbUI7QUFDcEYsUUFBTStMLGVBQWVoVixPQUFPaEIsUUFBUStWLGlCQUFpQixDQUFDO0FBQ3RELFFBQU1FLGlCQUFpQmpWLE9BQU84VSxpQkFBaUJsQyxvQkFBb0JvQyxZQUFZO0FBQy9FLFFBQU1FLHVCQUF1QkQsaUJBQWlCRCxlQUFlO0FBQzdELFFBQU0xRSxrQkFBa0I1TixTQUFTNk4saUJBQWlCdFIsU0FBUzdCLEtBQUssQ0FBQzJFLFNBQVNBLEtBQUt6RSxPQUFPMEIsUUFBUTFCLEVBQUU7QUFDaEcsUUFBTTZYLFNBQVNBLENBQUN2WCxPQUFPd1gsUUFBUWhILGNBQWMsU0FBU3pKLE1BQU1DLE9BQU9oSCxPQUFPLENBQUNpSCxVQUFVO0FBQ25GdVEsV0FBT3ZRLE1BQU01RixTQUFTSCxZQUFZLENBQUM7QUFBQSxFQUNyQyxHQUFHLEVBQUVzUCxhQUFhMU0sV0FBV2dCLFNBQVNoQixVQUFVLENBQUM7QUFDakQsUUFBTXdGLE9BQU9BLENBQUN0QixjQUFjakIsTUFBTUMsT0FBTyxtQkFBbUIsQ0FBQ0MsVUFBVTtBQUNyRSxVQUFNd1EsVUFBVXZXLGVBQWU4RztBQUMvQixRQUFJeVAsVUFBVSxLQUFLQSxXQUFXeFEsTUFBTTVGLFNBQVNLLE9BQVE7QUFDckQsVUFBTSxDQUFDcU8sS0FBSyxJQUFJOUksTUFBTTVGLFNBQVM2RixPQUFPaEcsY0FBYyxDQUFDO0FBQ3JEK0YsVUFBTTVGLFNBQVM2RixPQUFPdVEsU0FBUyxHQUFHMUgsS0FBSztBQUN2QzlHLHlCQUFxQmhDLE9BQU92SSxxQ0FBcUN1SSxLQUFLLENBQUM7QUFBQSxFQUN6RSxHQUFHLEVBQUVuRCxXQUFXLEVBQUV1QixNQUFNLFdBQVcxQixXQUFXdkMsUUFBUTFCLEdBQUcsRUFBRSxDQUFDO0FBQzVELFFBQU1nWSxZQUFZQSxNQUFNO0FBQ3RCLFVBQU1DLFNBQVMvWiwrQkFBK0IsRUFBRXFELFVBQVU2RCxTQUFTN0QsVUFBVTBDLFdBQVd2QyxRQUFRMUIsR0FBRyxDQUFDO0FBQ3BHLFFBQUksQ0FBQ2lZLE9BQU92SixPQUFPO0FBQ2pCckgsWUFBTVMsYUFBYSxFQUFFWCxTQUFTOFEsT0FBT3RKLFVBQVUscUNBQXFDLENBQUM7QUFDckY7QUFBQSxJQUNGO0FBQ0F0SCxVQUFNQyxPQUFPLHFCQUFxQixDQUFDQyxVQUFVZ0MscUJBQXFCaEMsT0FBTzBRLE9BQU8xVyxRQUFRLEdBQUc7QUFBQSxNQUN6RjZDLFdBQVc2VCxPQUFPN1Q7QUFBQUEsSUFDcEIsQ0FBQztBQUFBLEVBQ0g7QUFFQSxTQUNFLG1DQUNFO0FBQUEsMkJBQUMsWUFBTztBQUFBLDZCQUFDLFVBQUs7QUFBQTtBQUFBLFFBQVNtUixPQUFPL1QsZUFBZSxDQUFDLEVBQUVnVSxTQUFTLEdBQUcsR0FBRztBQUFBLFdBQXZEO0FBQUE7QUFBQTtBQUFBO0FBQUEsYUFBeUQ7QUFBQSxNQUFPLHVCQUFDLFlBQVE5VCxrQkFBUXBCLFNBQWpCO0FBQUE7QUFBQTtBQUFBO0FBQUEsYUFBdUI7QUFBQSxTQUEvRjtBQUFBO0FBQUE7QUFBQTtBQUFBLFdBQXdHO0FBQUEsSUFDdkdvQixRQUFRd04sU0FBUyx1QkFBQyxTQUFJLFdBQVUscUJBQW9CO0FBQUEsNkJBQUMsZUFBWSxlQUFZLFVBQXpCO0FBQUE7QUFBQTtBQUFBO0FBQUEsYUFBK0I7QUFBQSxNQUFHLHVCQUFDLFVBQUssbUdBQU47QUFBQTtBQUFBO0FBQUE7QUFBQSxhQUF5RjtBQUFBLE1BQU8sdUJBQUMsWUFBTyxNQUFLLFVBQVMsU0FBUyxNQUFNMkksT0FBTyw0QkFBNEIsQ0FBQ3RRLFVBQVU7QUFBRUEsY0FBTTJILFNBQVM7QUFBQSxNQUFPLENBQUMsR0FBRywrQkFBL0c7QUFBQTtBQUFBO0FBQUE7QUFBQSxhQUE4SDtBQUFBLFNBQW5TO0FBQUE7QUFBQTtBQUFBO0FBQUEsV0FBNFMsSUFBUztBQUFBLElBQ3ZVLHVCQUFDLFNBQUksV0FBVSwrQkFDYjtBQUFBLDZCQUFDLFlBQU8sTUFBSyxVQUFTLFVBQVV4TixRQUFRd04sVUFBVTFOLGlCQUFpQixHQUFHLFNBQVMsTUFBTW9JLEtBQUssRUFBRSxHQUFHLDRCQUEvRjtBQUFBO0FBQUE7QUFBQTtBQUFBLGFBQTJHO0FBQUEsTUFDM0csdUJBQUMsWUFBTyxNQUFLLFVBQVMsVUFBVWxJLFFBQVF3TixVQUFVMU4saUJBQWlCNEQsU0FBUzdELFNBQVNJLFNBQVNLLFNBQVMsR0FBRyxTQUFTLE1BQU00SCxLQUFLLENBQUMsR0FBRywwQkFBbEk7QUFBQTtBQUFBO0FBQUE7QUFBQSxhQUE0STtBQUFBLE1BQzVJLHVCQUFDLFlBQU8sTUFBSyxVQUFTLFVBQVVsSSxRQUFRd04sVUFBVXhOLFFBQVFpRSxTQUFTLFVBQVUsU0FBU3FTLFdBQVcseUJBQWpHO0FBQUE7QUFBQTtBQUFBO0FBQUEsYUFBMEc7QUFBQSxTQUg1RztBQUFBO0FBQUE7QUFBQTtBQUFBLFdBSUE7QUFBQSxJQUNBLHVCQUFDLFlBQVMsT0FBTSxnQkFBZSxpQ0FBQyxXQUFNLE9BQU90VyxRQUFRcEIsT0FBTyxVQUFVLENBQUMwSCxVQUFVNlAsT0FBTyxrQkFBa0IsQ0FBQ3RRLFVBQVU7QUFBRUEsWUFBTWpILFFBQVEwSCxNQUFNOUcsT0FBTzlCO0FBQUFBLElBQU8sR0FBRyxXQUFXc0MsUUFBUTFCLEVBQUUsUUFBUSxLQUExSjtBQUFBO0FBQUE7QUFBQTtBQUFBLFdBQTRKLEtBQTNMO0FBQUE7QUFBQTtBQUFBO0FBQUEsV0FBOEw7QUFBQSxJQUM5TCx1QkFBQyxZQUFTLE9BQU0sYUFBWTtBQUFBLDZCQUFDLFdBQU0sT0FBTzBCLFFBQVExQixJQUFJLFVBQVEsUUFBbEM7QUFBQTtBQUFBO0FBQUE7QUFBQSxhQUFrQztBQUFBLE1BQUcsdUJBQUMsV0FBTSxnRkFBUDtBQUFBO0FBQUE7QUFBQTtBQUFBLGFBQXVFO0FBQUEsU0FBeEk7QUFBQTtBQUFBO0FBQUE7QUFBQSxXQUFnSjtBQUFBLElBQ2hKLHVCQUFDLFlBQVMsT0FBTSxRQUNkLGlDQUFDLFlBQU8sT0FBTzBCLFFBQVFpRSxNQUFNLFVBQVVqRSxRQUFRaUUsU0FBUyxVQUFVLFVBQVUsQ0FBQ3FDLFVBQVU2UCxPQUFPLHVCQUF1QixDQUFDdFEsVUFBVTtBQUFFQSxZQUFNNUIsT0FBT3FDLE1BQU05RyxPQUFPOUI7QUFBQUEsSUFBTyxDQUFDLEdBQ2xLO0FBQUEsNkJBQUMsWUFBTyxPQUFNLFdBQVUsdUJBQXhCO0FBQUE7QUFBQTtBQUFBO0FBQUEsYUFBK0I7QUFBQSxNQUFTLHVCQUFDLFlBQU8sT0FBTSxhQUFZLHlCQUExQjtBQUFBO0FBQUE7QUFBQTtBQUFBLGFBQW1DO0FBQUEsTUFBUyx1QkFBQyxZQUFPLE9BQU0sVUFBUyxzQkFBdkI7QUFBQTtBQUFBO0FBQUE7QUFBQSxhQUE2QjtBQUFBLFNBRG5IO0FBQUE7QUFBQTtBQUFBO0FBQUEsV0FFQSxLQUhGO0FBQUE7QUFBQTtBQUFBO0FBQUEsV0FJQTtBQUFBLElBQ0EsdUJBQUMsYUFBUSxNQUFJLE1BQ1g7QUFBQSw2QkFBQyxhQUFRLDhCQUFUO0FBQUE7QUFBQTtBQUFBO0FBQUEsYUFBdUI7QUFBQSxNQUN2Qix1QkFBQyxZQUFTLE9BQU0saUJBQWdCLGlDQUFDLFlBQU8sV0FBVSx3QkFBd0J3RixtQkFBU3ZGLEtBQUtFLElBQUksR0FBR21ZLGVBQWUsQ0FBQyxDQUFDLEtBQWhGO0FBQUE7QUFBQTtBQUFBO0FBQUEsYUFBa0YsS0FBbEg7QUFBQTtBQUFBO0FBQUE7QUFBQSxhQUEySDtBQUFBLE1BQzNILHVCQUFDLFlBQVMsT0FBTSxnQkFBZSxpQ0FBQyxZQUFPLFdBQVUsd0JBQXdCOVMsbUJBQVM4UyxZQUFZLEtBQS9EO0FBQUE7QUFBQTtBQUFBO0FBQUEsYUFBaUUsS0FBaEc7QUFBQTtBQUFBO0FBQUE7QUFBQSxhQUF5RztBQUFBLE1BQ3pHLHVCQUFDLGtCQUFlLE9BQU0sa0JBQWlCLE9BQU9oVyxRQUFRMEssVUFBVSxLQUFLLEdBQUcsS0FBSyxHQUFHLE1BQU0sTUFBTSxNQUFLLE1BQUssVUFBVSxDQUFDaE4sVUFBVXlZLE9BQU8saUNBQWlDLENBQUN0USxVQUFVO0FBQUVBLGNBQU02RSxXQUFXaE47QUFBQUEsTUFBTyxHQUFHLFdBQVdzQyxRQUFRMUIsRUFBRSxTQUFTLEtBQXpPO0FBQUE7QUFBQTtBQUFBO0FBQUEsYUFBMk87QUFBQSxNQUMzTyx1QkFBQyxrQkFBZSxPQUFNLGlCQUFnQixPQUFPMEIsUUFBUXdXLGdCQUFnQixLQUFLLEdBQUcsS0FBSyxHQUFHLE1BQU0sTUFBTSxNQUFLLE1BQUssVUFBVSxDQUFDOVksVUFBVXlZLE9BQU8sZ0NBQWdDLENBQUN0USxVQUFVO0FBQUVBLGNBQU0yUSxpQkFBaUI5WTtBQUFBQSxNQUFPLEdBQUcsV0FBV3NDLFFBQVExQixFQUFFLFNBQVMsS0FBblA7QUFBQTtBQUFBO0FBQUE7QUFBQSxhQUFxUDtBQUFBLE1BQ3JQLHVCQUFDLFlBQVMsT0FBTSxtQkFBa0IsaUNBQUMsWUFBTyxXQUFVLHdCQUF3QjRFLG1CQUFTK1MsY0FBYyxLQUFqRTtBQUFBO0FBQUE7QUFBQTtBQUFBLGFBQW1FLEtBQXJHO0FBQUE7QUFBQTtBQUFBO0FBQUEsYUFBOEc7QUFBQSxNQUM3R0MsdUJBQXVCLHVCQUFDLE9BQUUsV0FBVSwrQkFBOEI7QUFBQTtBQUFBLFFBQW9EaFQsU0FBUytTLGNBQWM7QUFBQSxRQUFFO0FBQUEsV0FBeEg7QUFBQTtBQUFBO0FBQUE7QUFBQSxhQUF5SSxJQUFPO0FBQUEsTUFDeEs7QUFBQSxRQUFDO0FBQUE7QUFBQSxVQUNDLE1BQUs7QUFBQSxVQUNMLFdBQVU7QUFBQSxVQUNWLFVBQVUsQ0FBQzNFLG1CQUFtQkEsZ0JBQWdCeUUsaUJBQWlCLE1BQU0vVixRQUFRK1YsaUJBQWlCO0FBQUEsVUFDOUYsU0FBUyxNQUFNSSxPQUFPLGdDQUFnQyxDQUFDdFEsVUFBVTtBQUFFQSxrQkFBTWtRLGlCQUFpQixJQUFJekUsZ0JBQWdCeUUsaUJBQWlCO0FBQUEsVUFBRyxDQUFDO0FBQUEsVUFBRTtBQUFBO0FBQUEsWUFDL0hyUyxTQUFTdUcsbUJBQW1CLFdBQVcsV0FBVztBQUFBLFlBQVU7QUFBQTtBQUFBO0FBQUEsUUFMcEU7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBLE1BSzJFO0FBQUEsU0FiN0U7QUFBQTtBQUFBO0FBQUE7QUFBQSxXQWNBO0FBQUEsSUFDQ2pLLFFBQVFpRSxTQUFTLGNBQWMsdUJBQUMsbUJBQWdCLE9BQWMsVUFBb0IsV0FBbkQ7QUFBQTtBQUFBO0FBQUE7QUFBQSxXQUFvRSxJQUFNO0FBQUEsSUFDekdqRSxRQUFRaUUsU0FBUyxjQUNoQjtBQUFBLE1BQUM7QUFBQTtBQUFBLFFBQ0MsTUFBSztBQUFBLFFBQ0wsV0FBVTtBQUFBLFFBQ1YsU0FBUyxNQUFNO0FBQ2IsZ0JBQU13UyxRQUFROVQsaUJBQWlCZSxTQUFTQyxjQUFjM0QsU0FBUzBELFNBQVNvRCxVQUFVakUsT0FBTztBQUN6RixnQkFBTXZFLEtBQUs4SSxPQUFPMUQsU0FBUzdELFVBQVUsR0FBR0csUUFBUTFCLEVBQUUsWUFBWTtBQUM5RCxnQkFBTW9ZLFFBQVEvWSxLQUFLQyxJQUFJLE1BQU1ELEtBQUtFLElBQUksTUFBTVIsZ0NBQWdDb1osS0FBSyxDQUFDLENBQUM7QUFDbkZOLGlCQUFPLGdCQUFnQixDQUFDdFEsVUFBVTtBQUNoQ0Esa0JBQU1yQixLQUFLQyxTQUFTO0FBQ3BCb0Isa0JBQU1yQixLQUFLQyxLQUFLVixLQUFLLEVBQUV6RixJQUFJa0csTUFBTSw0QkFBNEIyRCxPQUFPdU8sUUFBUSxNQUFNOVIsTUFBTThSLE9BQU90TyxNQUFNc08sUUFBUSxNQUFNQyxRQUFRLHVCQUF1QkMsUUFBUSxFQUFFelMsTUFBTSxVQUFVLEVBQUUsQ0FBQztBQUMvSzBCLGtCQUFNckIsS0FBS0MsS0FBS1UsS0FBSyxDQUFDQyxHQUFHQyxNQUFNRCxFQUFFUixPQUFPUyxFQUFFVCxJQUFJO0FBQUEsVUFDaEQsQ0FBQztBQUNEZSxnQkFBTVksYUFBYSxFQUFFdEMsTUFBTSxPQUFPMUIsV0FBV3ZDLFFBQVExQixJQUFJdUcsT0FBT3ZHLElBQUlpRyxTQUFTLFFBQVEsQ0FBQztBQUFBLFFBQ3hGO0FBQUEsUUFBRTtBQUFBO0FBQUEsTUFiSjtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUEsSUFjeUIsSUFDdkI7QUFBQSxPQS9DTjtBQUFBO0FBQUE7QUFBQTtBQUFBLFNBZ0RBO0FBRUo7QUFBQ3NTLE1BaEZRaEI7QUFrRlQsU0FBU2lCLGdCQUFnQixFQUFFblIsT0FBT2pDLFVBQVUxRCxRQUFRLEdBQUc7QUFDckQsUUFBTUYsZUFBZXdDLGdCQUFnQm9CLFNBQVM3RCxVQUFVRyxRQUFRMUIsRUFBRTtBQUNsRSxRQUFNeVksY0FBY0EsQ0FBQ0MsWUFBWTlYLE9BQU94QixVQUFVaUksTUFBTUMsT0FBTyx1QkFBdUIsQ0FBQ0MsVUFBVTtBQUMvRkEsVUFBTTVGLFNBQVNILFlBQVksRUFBRTBFLEtBQUtpRCxPQUFPdVAsVUFBVSxFQUFFOVgsS0FBSyxJQUFJeEI7QUFBQUEsRUFDaEUsR0FBRyxFQUFFMFIsYUFBYSxTQUFTcFAsUUFBUTFCLEVBQUUsSUFBSTBZLFVBQVUsSUFBSTlYLEtBQUssSUFBSXdELFdBQVdnQixTQUFTaEIsVUFBVSxDQUFDO0FBQy9GLFFBQU11VSxpQkFBaUJBLENBQUNELFlBQVlFLGVBQWVoWSxPQUFPeEIsVUFBVWlJLE1BQU1DLE9BQU8sNEJBQTRCLENBQUNDLFVBQVU7QUFDdEhBLFVBQU01RixTQUFTSCxZQUFZLEVBQUUwRSxLQUFLaUQsT0FBT3VQLFVBQVUsRUFBRUcsU0FBU0QsYUFBYSxFQUFFaFksS0FBSyxJQUFJeEI7QUFBQUEsRUFDeEYsR0FBRyxFQUFFMFIsYUFBYSxTQUFTcFAsUUFBUTFCLEVBQUUsSUFBSTBZLFVBQVUsYUFBYUUsYUFBYSxJQUFJaFksS0FBSyxJQUFJd0QsV0FBV2dCLFNBQVNoQixVQUFVLENBQUM7QUFDekgsUUFBTTBVLGNBQWNBLENBQUNKLGVBQWVyUixNQUFNQyxPQUFPLDJCQUEyQixDQUFDQyxVQUFVO0FBQ3JGLFVBQU02QixRQUFRN0IsTUFBTTVGLFNBQVNILFlBQVksRUFBRTBFLEtBQUtpRCxPQUFPdVAsVUFBVTtBQUNqRXRQLFVBQU15UCxhQUFhO0FBQ25CelAsVUFBTXlQLFNBQVNwVCxLQUFLLEVBQUVTLE1BQU1rRCxNQUFNbEQsS0FBSzZTLEtBQUssRUFBRUMsTUFBTSxLQUFLLEVBQUUxRSxNQUFNLEdBQUcsQ0FBQyxFQUFFMkUsS0FBSyxHQUFHLEdBQUdDLE1BQU0sT0FBTyxDQUFDO0FBQUEsRUFDbEcsR0FBRyxFQUFFOVUsV0FBV2dCLFNBQVNoQixVQUFVLENBQUM7QUFDcEMsUUFBTStVLGlCQUFpQkEsQ0FBQ1QsWUFBWUUsa0JBQWtCdlIsTUFBTUMsT0FBTyw4QkFBOEIsQ0FBQ0MsVUFBVTtBQUMxR0EsVUFBTTVGLFNBQVNILFlBQVksRUFBRTBFLEtBQUtpRCxPQUFPdVAsVUFBVSxFQUFFRyxTQUFTclIsT0FBT29SLGVBQWUsQ0FBQztBQUFBLEVBQ3ZGLEdBQUcsRUFBRXhVLFdBQVdnQixTQUFTaEIsVUFBVSxDQUFDO0FBQ3BDLFNBQ0UsdUJBQUMsYUFBUSxNQUFJLE1BQ1g7QUFBQSwyQkFBQyxhQUFRLGlDQUFUO0FBQUE7QUFBQTtBQUFBO0FBQUEsV0FBMEI7QUFBQSxLQUN4QjFDLFFBQVF3RSxLQUFLaUQsVUFBVSxJQUFJRDtBQUFBQSxNQUFJLENBQUNFLE9BQU9zUCxlQUN2Qyx1QkFBQyxTQUFJLFdBQVUsc0JBQ2I7QUFBQSwrQkFBQyxTQUFJO0FBQUEsaUNBQUMsVUFBTXRQLGdCQUFNZ1EsUUFBYjtBQUFBO0FBQUE7QUFBQTtBQUFBLGlCQUFrQjtBQUFBLFVBQU8sdUJBQUMsVUFBTWhRLGdCQUFNcEosTUFBYjtBQUFBO0FBQUE7QUFBQTtBQUFBLGlCQUFnQjtBQUFBLGFBQTlDO0FBQUE7QUFBQTtBQUFBO0FBQUEsZUFBcUQ7QUFBQSxRQUNwRG9KLE1BQU05SSxTQUFTLE9BQU8sdUJBQUMsWUFBUyxPQUFNLFNBQVEsaUNBQUMsV0FBTSxPQUFPOEksTUFBTTlJLE9BQU8sVUFBVSxDQUFDMEgsVUFBVXlRLFlBQVlDLFlBQVksU0FBUzFRLE1BQU05RyxPQUFPOUIsS0FBSyxLQUFuRztBQUFBO0FBQUE7QUFBQTtBQUFBLGVBQXFHLEtBQTdIO0FBQUE7QUFBQTtBQUFBO0FBQUEsZUFBZ0ksSUFBYztBQUFBLFFBQ3BLZ0ssTUFBTWxELFFBQVEsT0FBTyx1QkFBQyxZQUFTLE9BQU0sUUFBTyxpQ0FBQyxjQUFTLE1BQUssS0FBSSxPQUFPa0QsTUFBTWxELE1BQU0sVUFBVSxDQUFDOEIsVUFBVXlRLFlBQVlDLFlBQVksUUFBUTFRLE1BQU05RyxPQUFPOUIsS0FBSyxLQUE3RztBQUFBO0FBQUE7QUFBQTtBQUFBLGVBQStHLEtBQXRJO0FBQUE7QUFBQTtBQUFBO0FBQUEsZUFBeUksSUFBYztBQUFBLFFBQzVLZ0ssTUFBTWdRLFNBQVMsVUFBVSx1QkFBQyxZQUFTLE9BQU0sd0JBQXVCLGlDQUFDLFdBQU0sTUFBSyxZQUFXLFNBQVNoUSxNQUFNaVEsbUJBQW1CLE1BQU0sVUFBVSxDQUFDclIsVUFBVXlRLFlBQVlDLFlBQVksa0JBQWtCMVEsTUFBTTlHLE9BQU9vWSxPQUFPLEtBQWxKO0FBQUE7QUFBQTtBQUFBO0FBQUEsZUFBb0osS0FBM0w7QUFBQTtBQUFBO0FBQUE7QUFBQSxlQUE4TCxJQUFjO0FBQUEsUUFDck9sUSxNQUFNbEQsUUFBUSxPQUNiLHVCQUFDLFNBQUksV0FBVSxrQ0FDYjtBQUFBLGlDQUFDLFVBQUssaUNBQU47QUFBQTtBQUFBO0FBQUE7QUFBQSxpQkFBdUI7QUFBQSxXQUNyQmtELE1BQU15UCxZQUFZLElBQUkzUDtBQUFBQSxZQUFJLENBQUN6RSxNQUFNbVUsa0JBQ2pDLHVCQUFDLFNBQUksV0FBVSw2QkFDYjtBQUFBLHFDQUFDLFdBQU0sY0FBVyxzQkFBcUIsT0FBT25VLEtBQUt5QixNQUFNLFVBQVUsQ0FBQzhCLFVBQVUyUSxlQUFlRCxZQUFZRSxlQUFlLFFBQVE1USxNQUFNOUcsT0FBTzlCLEtBQUssS0FBbEo7QUFBQTtBQUFBO0FBQUE7QUFBQSxxQkFBb0o7QUFBQSxjQUNwSix1QkFBQyxZQUFPLGNBQVcsb0JBQW1CLE9BQU9xRixLQUFLeVUsTUFBTSxVQUFVLENBQUNsUixVQUFVMlEsZUFBZUQsWUFBWUUsZUFBZSxRQUFRNVEsTUFBTTlHLE9BQU85QixLQUFLLEdBQzlJdkMseUNBQStCcU0sSUFBSSxDQUFDZ1EsU0FBUyx1QkFBQyxZQUFPLE9BQU9BLE1BQWtCQSxrQkFBUEEsTUFBMUI7QUFBQTtBQUFBO0FBQUE7QUFBQSxxQkFBc0MsQ0FBUyxLQUQvRjtBQUFBO0FBQUE7QUFBQTtBQUFBLHFCQUVBO0FBQUEsY0FDQSx1QkFBQyxZQUFPLE1BQUssVUFBUyxjQUFZLFVBQVV6VSxLQUFLeUIsUUFBUSxPQUFPLGNBQWMsU0FBUyxNQUFNaVQsZUFBZVQsWUFBWUUsYUFBYSxHQUFHLGlCQUF4STtBQUFBO0FBQUE7QUFBQTtBQUFBLHFCQUF5STtBQUFBLGlCQUwzRixHQUFHeFAsTUFBTXBKLEVBQUUsYUFBYTRZLGFBQWEsSUFBckY7QUFBQTtBQUFBO0FBQUE7QUFBQSxtQkFNQTtBQUFBLFVBQ0Q7QUFBQSxVQUNELHVCQUFDLFlBQU8sTUFBSyxVQUFTLFNBQVMsTUFBTUUsWUFBWUosVUFBVSxHQUFHLDZCQUE5RDtBQUFBO0FBQUE7QUFBQTtBQUFBLGlCQUEyRTtBQUFBLGFBWDdFO0FBQUE7QUFBQTtBQUFBO0FBQUEsZUFZQSxJQUNFO0FBQUEsUUFDSHRQLE1BQU1tUSxRQUFRLHVCQUFDLFlBQVMsT0FBTSxTQUFRLGlDQUFDLGNBQVMsTUFBSyxLQUFJLE9BQU9uUSxNQUFNbVEsTUFBTU4sS0FBSyxJQUFJLEdBQUcsVUFBVSxDQUFDalIsVUFBVXlRLFlBQVlDLFlBQVksU0FBUzFRLE1BQU05RyxPQUFPOUIsTUFBTTRaLE1BQU0sSUFBSSxFQUFFOUUsT0FBT3NGLE9BQU8sQ0FBQyxLQUF0SjtBQUFBO0FBQUE7QUFBQTtBQUFBLGVBQXdKLEtBQWhMO0FBQUE7QUFBQTtBQUFBO0FBQUEsZUFBbUwsSUFBYztBQUFBLFdBcEJ6S3BRLE1BQU1wSixJQUEvQztBQUFBO0FBQUE7QUFBQTtBQUFBLGFBcUJBO0FBQUEsSUFDRDtBQUFBLElBQ0QsdUJBQUMsWUFBTyxNQUFLLFVBQVMsV0FBVSw0QkFBMkIsU0FBUyxNQUFNcUgsTUFBTUMsT0FBTyx1QkFBdUIsQ0FBQ0MsVUFBVTtBQUN2SEEsWUFBTTVGLFNBQVNILFlBQVksRUFBRTBFLEtBQUtpRCxPQUFPMUQsS0FBSyxFQUFFekYsSUFBSThJLE9BQU92QixPQUFPLEdBQUc3RixRQUFRMUIsRUFBRSxRQUFRLEdBQUdvWixNQUFNLFNBQVNsVCxNQUFNLDJCQUEyQixDQUFDO0FBQUEsSUFDN0ksQ0FBQyxHQUFHLCtCQUZKO0FBQUE7QUFBQTtBQUFBO0FBQUEsV0FFbUI7QUFBQSxPQTVCckI7QUFBQTtBQUFBO0FBQUE7QUFBQSxTQTZCQTtBQUVKO0FBQUN1VCxNQWhEUWpCO0FBa0RULFNBQVNrQixrQkFBa0IsRUFBRXJTLE9BQU9qQyxVQUFVdVUsV0FBV0MsYUFBYSxHQUFHO0FBQUFDLE1BQUE7QUFDdkUsUUFBTTdKLFVBQVUxUixrQ0FBa0M4RyxTQUFTaEIsU0FBUztBQUNwRSxRQUFNLENBQUMwVixPQUFPQyxRQUFRLElBQUl0ZSxTQUFTLElBQUk7QUFDdkMsUUFBTSxDQUFDdWUsUUFBUUMsU0FBUyxJQUFJeGUsU0FBUyxTQUFTO0FBQzlDLFFBQU0sQ0FBQ3llLFNBQVNDLFVBQVUsSUFBSTFlLFNBQVMsSUFBSTtBQUMzQyxRQUFNLENBQUMwTCxTQUFTaVQsVUFBVSxJQUFJM2UsU0FBUyxFQUFFO0FBRXpDLFFBQU00ZSxlQUFlQSxDQUFDL1osT0FBTzJYLFdBQVc7QUFDdEMsUUFBSSxDQUFDQSxPQUFPdkosT0FBTztBQUNqQixVQUFJdEosU0FBU2tWLFNBQVVqVCxPQUFNa1QsVUFBVTtBQUN2Q0osaUJBQVdsQyxNQUFNO0FBQ2pCbUMsaUJBQVduQyxPQUFPdEosVUFBVSxzREFBc0Q7QUFDbEY7QUFBQSxJQUNGO0FBQ0EsUUFBSXZKLFNBQVNrVixTQUFValQsT0FBTWtULFVBQVU7QUFDdkNsVCxVQUFNbVQsU0FBU2xhLE9BQU8sQ0FBQ2lILFVBQVVtQyxjQUFjbkMsT0FBTzBRLE9BQU90TyxLQUFLLENBQUM7QUFDbkV3USxlQUFXLEVBQUUsR0FBR2xDLFFBQVEzWCxNQUFNLENBQUM7QUFDL0I4WixlQUFXLEVBQUU7QUFBQSxFQUNmO0FBQ0EsUUFBTTNJLGdCQUFnQkEsTUFBTTtBQUMxQixRQUFJck0sU0FBU2tWLFNBQVVqVCxPQUFNa1QsVUFBVTtBQUN2Q0osZUFBVyxJQUFJO0FBQ2ZDLGVBQVcsRUFBRTtBQUFBLEVBQ2Y7QUFDQSxRQUFNSyxlQUFlQSxNQUFNO0FBQ3pCLFFBQUksQ0FBQ1AsU0FBU3hMLFNBQVMsQ0FBQ3RKLFNBQVNrVixTQUFVO0FBQzNDalQsVUFBTXFULFNBQVM7QUFDZlAsZUFBVyxJQUFJO0FBQ2ZDLGVBQVcsRUFBRTtBQUFBLEVBQ2Y7QUFDQSxRQUFNTyxrQkFBa0JBLENBQUNyYSxPQUFPMlgsV0FBVztBQUN6QyxRQUFJLENBQUNBLFFBQVF2SixTQUFTLENBQUN1SixPQUFPMVcsVUFBVTtBQUN0QzZZLGlCQUFXbkMsUUFBUXRKLFVBQVUsK0NBQStDO0FBQzVFO0FBQUEsSUFDRjtBQUNBdEgsVUFBTUMsT0FBT2hILE9BQU8sQ0FBQ2lILFVBQVVnQyxxQkFBcUJoQyxPQUFPMFEsT0FBTzFXLFFBQVEsR0FBRztBQUFBLE1BQzNFNkMsV0FBVzZULE9BQU83VCxhQUFhZ0IsU0FBU2hCO0FBQUFBLElBQzFDLENBQUM7QUFDRGdXLGVBQVcsRUFBRTtBQUFBLEVBQ2Y7QUFFQSxRQUFNUSxhQUFhQSxNQUFNUCxhQUFhLDJCQUEyQjNiLHFDQUFxQztBQUFBLElBQ3BHNkMsVUFBVTZELFNBQVM3RDtBQUFBQSxJQUNuQitDLE1BQU1jLFNBQVNDO0FBQUFBLElBQ2YySztBQUFBQSxJQUNBa0IsU0FBUzlMLFNBQVNoQjtBQUFBQSxFQUNwQixDQUFDLENBQUM7QUFDRixRQUFNeVcsV0FBV0EsTUFBTVIsYUFBYSx1QkFBdUIxYixpQ0FBaUM7QUFBQSxJQUMxRjRDLFVBQVU2RCxTQUFTN0Q7QUFBQUEsSUFDbkIrQyxNQUFNYyxTQUFTQztBQUFBQSxJQUNmMks7QUFBQUEsSUFDQWtCLFNBQVM5TCxTQUFTaEI7QUFBQUEsSUFDbEIwVjtBQUFBQSxJQUNBRTtBQUFBQSxFQUNGLENBQUMsQ0FBQztBQUNGLFFBQU1jLGVBQWVBLE1BQU1ULGFBQWEsNEJBQTRCeGIsbUNBQW1DO0FBQUEsSUFDckcwQyxVQUFVNkQsU0FBUzdEO0FBQUFBLElBQ25CK0MsTUFBTWMsU0FBU0M7QUFBQUEsSUFDZjJLO0FBQUFBLElBQ0FrQixTQUFTOUwsU0FBU2hCO0FBQUFBLElBQ2xCMlcsWUFBWTNWLFNBQVNvRCxVQUFVakU7QUFBQUEsRUFDakMsQ0FBQyxDQUFDO0FBQ0YsUUFBTXlULFlBQVlBLE1BQU0yQyxnQkFBZ0Isd0JBQXdCMWMsZ0NBQWdDO0FBQUEsSUFDOUZzRCxVQUFVNkQsU0FBUzdEO0FBQUFBLElBQ25CeU87QUFBQUEsSUFDQWtCLFNBQVM5TCxTQUFTaEI7QUFBQUEsRUFDcEIsQ0FBQyxDQUFDO0FBQ0YsUUFBTTRXLE9BQU9BLE1BQU07QUFDakIsVUFBTS9DLFNBQVNsYSx3Q0FBd0M7QUFBQSxNQUNyRHdELFVBQVU2RCxTQUFTN0Q7QUFBQUEsTUFDbkIrQyxNQUFNYyxTQUFTQztBQUFBQSxNQUNmMks7QUFBQUEsTUFDQWtCLFNBQVM5TCxTQUFTaEI7QUFBQUEsSUFDcEIsQ0FBQztBQUNELFVBQU02VyxVQUFVaEQsUUFBUWdELFdBQVdoRDtBQUNuQyxVQUFNaUQsYUFBYWhjLDBDQUEwQytiLE9BQU87QUFDcEUsUUFBSWhELFFBQVF2SixVQUFVLFNBQVN3TSxZQUFZeE0sVUFBVSxPQUFPO0FBQzFEMEwsaUJBQVduQyxRQUFRdEosVUFBVXVNLFlBQVl2TSxVQUFVLGdDQUFnQztBQUNuRjtBQUFBLElBQ0Y7QUFDQWlMLGlCQUFhcUIsT0FBTztBQUNwQmIsZUFBVyxHQUFHcEssUUFBUWhPLE1BQU0sU0FBU2dPLFFBQVFoTyxXQUFXLElBQUksS0FBSyxHQUFHLGtDQUFrQztBQUFBLEVBQ3hHO0FBQ0EsUUFBTW1aLFFBQVFBLE1BQU1SLGdCQUFnQixvQkFBb0I3YixtQ0FBbUM7QUFBQSxJQUN6RnlDLFVBQVU2RCxTQUFTN0Q7QUFBQUEsSUFDbkIrQyxNQUFNYyxTQUFTQztBQUFBQSxJQUNmNFYsU0FBU3RCO0FBQUFBLElBQ1R5QixzQkFBc0JoVyxTQUFTaEIsVUFBVUg7QUFBQUEsSUFDekM4VyxZQUFZM1YsU0FBU29ELFVBQVVqRTtBQUFBQSxFQUNqQyxDQUFDLENBQUM7QUFFRixRQUFNOFcsYUFBYW5CLFNBQVN4TCxRQUFRd0wsUUFBUXZRLFFBQVE7QUFDcEQsUUFBTXdCLFFBQVE5TCxLQUFLRSxJQUFJLE1BQU82RixTQUFTQyxjQUFjK0YsY0FBYyxDQUFDO0FBQ3BFLFNBQ0UsdUJBQUMsYUFBUSxXQUFVLHVCQUFzQixNQUFNNEUsUUFBUWhPLFNBQVMsR0FDOUQ7QUFBQSwyQkFBQyxhQUFRLGdDQUFUO0FBQUE7QUFBQTtBQUFBO0FBQUEsV0FBeUI7QUFBQSxJQUN4QmdPLFFBQVFoTyxTQUFTLElBQ2hCLG1DQUNFO0FBQUEsNkJBQUMsU0FBSSxXQUFVLCtCQUNiO0FBQUEsK0JBQUMsWUFBTyxNQUFLLFVBQVMsU0FBUzRZLFlBQVksaUNBQTNDO0FBQUE7QUFBQTtBQUFBO0FBQUEsZUFBNEQ7QUFBQSxRQUM1RCx1QkFBQyxZQUFPLE1BQUssVUFBUyxTQUFTRSxjQUFjLHlDQUE3QztBQUFBO0FBQUE7QUFBQTtBQUFBLGVBQXNFO0FBQUEsV0FGeEU7QUFBQTtBQUFBO0FBQUE7QUFBQSxhQUdBO0FBQUEsTUFDQSx1QkFBQyxTQUFJLFdBQVUsMkJBQ2I7QUFBQSwrQkFBQyxZQUFTLE9BQU0sYUFBWSxpQ0FBQyxXQUFNLE1BQUssVUFBUyxLQUFJLEtBQUksS0FBSSxLQUFJLE1BQUssUUFBTyxPQUFPaEIsT0FBTyxVQUFVLENBQUM5UixVQUFVK1IsU0FBUzFhLEtBQUtFLElBQUksR0FBR21ELE9BQU9zRixNQUFNOUcsT0FBTzlCLEtBQUssS0FBSyxDQUFDLENBQUMsS0FBekk7QUFBQTtBQUFBO0FBQUE7QUFBQSxlQUEySSxLQUF2SztBQUFBO0FBQUE7QUFBQTtBQUFBLGVBQTBLO0FBQUEsUUFDMUssdUJBQUMsWUFBUyxPQUFNLFVBQVMsaUNBQUMsWUFBTyxPQUFPNGEsUUFBUSxVQUFVLENBQUNoUyxVQUFVaVMsVUFBVWpTLE1BQU05RyxPQUFPOUIsS0FBSyxHQUFHO0FBQUEsaUNBQUMsWUFBTyxPQUFNLFdBQVUsdUJBQXhCO0FBQUE7QUFBQTtBQUFBO0FBQUEsaUJBQStCO0FBQUEsVUFBUyx1QkFBQyxZQUFPLE9BQU0sU0FBUSxxQkFBdEI7QUFBQTtBQUFBO0FBQUE7QUFBQSxpQkFBMkI7QUFBQSxVQUFTLHVCQUFDLFlBQU8sT0FBTSxRQUFPLG9CQUFyQjtBQUFBO0FBQUE7QUFBQTtBQUFBLGlCQUF5QjtBQUFBLGFBQWhMO0FBQUE7QUFBQTtBQUFBO0FBQUEsZUFBeUwsS0FBbE47QUFBQTtBQUFBO0FBQUE7QUFBQSxlQUEyTjtBQUFBLFFBQzNOLHVCQUFDLFlBQU8sTUFBSyxVQUFTLFNBQVN5YixVQUFVLGlDQUF6QztBQUFBO0FBQUE7QUFBQTtBQUFBLGVBQTBEO0FBQUEsV0FINUQ7QUFBQTtBQUFBO0FBQUE7QUFBQSxhQUlBO0FBQUEsU0FURjtBQUFBO0FBQUE7QUFBQTtBQUFBLFdBVUEsSUFDRTtBQUFBLElBQ0hRLFdBQVdyWixTQUNWLHVCQUFDLFNBQUksV0FBVSwrQkFBOEIsY0FBVyx5QkFDckRxWixxQkFBV25TLElBQUksQ0FBQ1UsU0FBUztBQUN4QixZQUFNcEYsV0FBV1ksU0FBU0MsYUFBYTFELFNBQVM3QixLQUFLLENBQUMyRSxTQUFTQSxLQUFLekUsT0FBTzRKLEtBQUszRixTQUFTO0FBQ3pGLFlBQU1NLFVBQVU3QixPQUFPOEIsVUFBVUUsV0FBVyxDQUFDLElBQUtrRixLQUFLdEQsT0FBTzVELE9BQU84QixVQUFVRyxZQUFZLENBQUM7QUFDNUYsYUFBTyx1QkFBQyxPQUEwQyxPQUFPLEVBQUVaLE1BQU0sR0FBSVEsVUFBVTRHLFFBQVMsR0FBRyxJQUFJLEdBQUcsT0FBTyxHQUFHdkIsS0FBS3JELEtBQUssTUFBTTNCLFNBQVNMLE9BQU8sQ0FBQyxNQUE5SCxHQUFHcUYsS0FBSzNGLFNBQVMsSUFBSTJGLEtBQUtyRCxLQUFLLElBQXZDO0FBQUE7QUFBQTtBQUFBO0FBQUEsYUFBeUk7QUFBQSxJQUNsSixDQUFDLEtBTEg7QUFBQTtBQUFBO0FBQUE7QUFBQSxXQU1BLElBQ0U7QUFBQSxJQUNIWSxVQUFVLHVCQUFDLE9BQUUsV0FBVyw4QkFBOEIrUyxXQUFXLENBQUNBLFFBQVF4TCxRQUFRLGNBQWMsRUFBRSxJQUFLdkgscUJBQTdGO0FBQUE7QUFBQTtBQUFBO0FBQUEsV0FBcUcsSUFBTztBQUFBLElBQ3RIK1MsU0FBU3hMLFNBQVN0SixTQUFTa1YsV0FBVyx1QkFBQyxTQUFJLFdBQVUsb0JBQW1CO0FBQUEsNkJBQUMsVUFBSztBQUFBO0FBQUEsUUFBWUosUUFBUTVaO0FBQUFBLFdBQTFCO0FBQUE7QUFBQTtBQUFBO0FBQUEsYUFBZ0M7QUFBQSxNQUFPLHVCQUFDLFlBQU8sTUFBSyxVQUFTLFNBQVNtUixlQUFlLHNCQUE5QztBQUFBO0FBQUE7QUFBQTtBQUFBLGFBQW9EO0FBQUEsTUFBUyx1QkFBQyxZQUFPLE1BQUssVUFBUyxXQUFVLGNBQWEsU0FBU2dKLGNBQWMscUJBQXBFO0FBQUE7QUFBQTtBQUFBO0FBQUEsYUFBeUU7QUFBQSxTQUEvTTtBQUFBO0FBQUE7QUFBQTtBQUFBLFdBQXdOLElBQVM7QUFBQSxJQUN4USx1QkFBQyxTQUFJLFdBQVUsK0JBQ2I7QUFBQSw2QkFBQyxZQUFPLE1BQUssVUFBUyxTQUFTekMsV0FBVztBQUFBO0FBQUEsUUFBV2hJLFFBQVFoTyxTQUFTLElBQUksY0FBYztBQUFBLFdBQXhGO0FBQUE7QUFBQTtBQUFBO0FBQUEsYUFBZ0c7QUFBQSxNQUNoRyx1QkFBQyxZQUFPLE1BQUssVUFBUyxTQUFTZ1osTUFBTSxvQkFBckM7QUFBQTtBQUFBO0FBQUE7QUFBQSxhQUF5QztBQUFBLE1BQ3pDLHVCQUFDLFlBQU8sTUFBSyxVQUFTLFVBQVUsQ0FBQ3JCLFdBQVcsU0FBU3dCLE9BQU8saUNBQTVEO0FBQUE7QUFBQTtBQUFBO0FBQUEsYUFBNkU7QUFBQSxTQUgvRTtBQUFBO0FBQUE7QUFBQTtBQUFBLFdBSUE7QUFBQSxPQTlCRjtBQUFBO0FBQUE7QUFBQTtBQUFBLFNBK0JBO0FBRUo7QUFBQ3RCLElBL0hRSCxtQkFBaUI7QUFBQSxNQUFqQkE7QUFpSVQsU0FBUzRCLGFBQWEsRUFBRWpVLE9BQU9qQyxVQUFVMUQsU0FBU2lZLFdBQVdDLGFBQWEsR0FBRztBQUMzRSxRQUFNMkIsa0JBQWtCamQsa0NBQWtDOEcsU0FBU2hCLFNBQVM7QUFDNUUsUUFBTTVDLGVBQWV3QyxnQkFBZ0JvQixTQUFTN0QsVUFBVUcsUUFBUTFCLEVBQUU7QUFDbEUsUUFBTXFHLFdBQVczRSxRQUFRd0UsS0FBS0MsS0FBS2pDLFVBQVUsQ0FBQ2tDLFNBQVFBLEtBQUlwRyxPQUFPb0YsU0FBU2hCLFVBQVVtQyxLQUFLO0FBQ3pGLFFBQU1ILE1BQU0xRSxRQUFRd0UsS0FBS0MsS0FBS0UsUUFBUTtBQUN0QyxNQUFJLENBQUNELElBQUssUUFBTyx1QkFBQyxvQkFBaUIsT0FBYyxVQUFvQixXQUFwRDtBQUFBO0FBQUE7QUFBQTtBQUFBLFNBQXFFO0FBQ3RGLFFBQU15UixTQUFTQSxDQUFDalgsT0FBT3hCLFVBQVVpSSxNQUFNQyxPQUFPLFlBQVkxRyxLQUFLLElBQUksQ0FBQzJHLFVBQVU7QUFDNUVBLFVBQU01RixTQUFTSCxZQUFZLEVBQUUwRSxLQUFLQyxLQUFLRSxRQUFRLEVBQUV6RixLQUFLLElBQUl4QjtBQUFBQSxFQUM1RCxHQUFHLEVBQUUwUixhQUFhLE9BQU8xSyxJQUFJcEcsRUFBRSxJQUFJWSxLQUFLLElBQUl3RCxXQUFXZ0IsU0FBU2hCLFVBQVUsQ0FBQztBQUMzRSxRQUFNb1gsU0FBU0EsTUFBTW5VLE1BQU1DLE9BQU8sbUJBQW1CLENBQUNDLFVBQVU7QUFDOURBLFVBQU01RixTQUFTSCxZQUFZLEVBQUUwRSxLQUFLQyxLQUFLcUIsT0FBT25CLFVBQVUsQ0FBQztBQUFBLEVBQzNELEdBQUcsRUFBRWpDLFdBQVcsRUFBRXVCLE1BQU0sV0FBVzFCLFdBQVd2QyxRQUFRMUIsR0FBRyxFQUFFLENBQUM7QUFDNUQsUUFBTTBWLGVBQWV0WCxpQ0FBaUNnSSxHQUFHO0FBQ3pELFFBQU0yUCxpQkFBaUJwWSxtQ0FBbUN5SSxLQUFLaEIsU0FBUzdELFNBQVN5VSxRQUFRQyxVQUFVO0FBQ25HLFFBQU1oRixXQUFXdlQsNkJBQTZCMEksR0FBRztBQUNqRCxRQUFNcVYsVUFBVUEsQ0FBQ0MsWUFBWXJVLE1BQU1DLE9BQU8saUJBQWlCLENBQUNDLFVBQVU7QUFDcEUsVUFBTXJHLFNBQVNxRyxNQUFNNUYsU0FBU0gsWUFBWSxFQUFFMEUsS0FBS0MsS0FBS0UsUUFBUTtBQUM5RG5HLFdBQU91SixPQUFPdkksUUFBUTNDLDRCQUE0QjJDLFFBQVF3YSxVQUFVLEdBQUcsQ0FBQztBQUFBLEVBQzFFLEdBQUcsRUFBRTVLLGFBQWEsT0FBTzFLLElBQUlwRyxFQUFFLFdBQVdvRSxXQUFXLEVBQUUsR0FBR2dCLFNBQVNoQixXQUFXNkIsU0FBUyxRQUFRLEVBQUUsQ0FBQztBQUNsRyxRQUFNMFYsaUJBQWlCQSxDQUFDOVYsU0FBU3dCLE1BQU1DLE9BQU8sd0JBQXdCLENBQUNDLFVBQVU7QUFDL0UsVUFBTXJHLFNBQVNxRyxNQUFNNUYsU0FBU0gsWUFBWSxFQUFFMEUsS0FBS0MsS0FBS0UsUUFBUTtBQUM5RG5GLFdBQU9vWCxTQUFTLEVBQUUsR0FBR3BYLE9BQU9vWCxRQUFRelMsS0FBSztBQUFBLEVBQzNDLEdBQUcsRUFBRXpCLFdBQVdnQixTQUFTaEIsVUFBVSxDQUFDO0FBQ3BDLFNBQ0UsbUNBQ0U7QUFBQSwyQkFBQyxZQUFPO0FBQUEsNkJBQUMsVUFBSyx3QkFBTjtBQUFBO0FBQUE7QUFBQTtBQUFBLGFBQWM7QUFBQSxNQUFPLHVCQUFDLFlBQVFnQyxjQUFJcEcsTUFBYjtBQUFBO0FBQUE7QUFBQTtBQUFBLGFBQWdCO0FBQUEsU0FBN0M7QUFBQTtBQUFBO0FBQUE7QUFBQSxXQUFzRDtBQUFBLElBQ3JEdWIsZ0JBQWdCdlosU0FBUyxJQUN4Qix1QkFBQyxTQUFJLFdBQVUsOEJBQ2I7QUFBQSw2QkFBQyxZQUFRdVo7QUFBQUEsd0JBQWdCdlo7QUFBQUEsUUFBTztBQUFBLFdBQWhDO0FBQUE7QUFBQTtBQUFBO0FBQUEsYUFBZ0Q7QUFBQSxNQUNoRCx1QkFBQyxRQUFJdVosMEJBQWdCclMsSUFBSSxDQUFDNEcsV0FBVztBQUNuQyxjQUFNOEwsZ0JBQWdCeFcsU0FBUzdELFNBQVNJLFNBQVM3QixLQUFLLENBQUMyRSxTQUFTQSxLQUFLekUsT0FBTzhQLE9BQU83TCxTQUFTO0FBQzVGLGNBQU00WCxZQUFZRCxlQUFlMVYsTUFBTUMsTUFBTXJHLEtBQUssQ0FBQzJFLFNBQVNBLEtBQUt6RSxPQUFPOFAsT0FBT3ZKLEtBQUs7QUFDcEYsZUFBTyx1QkFBQyxRQUErQztBQUFBLGlDQUFDLFVBQU1xVix5QkFBZXRiLFNBQXRCO0FBQUE7QUFBQTtBQUFBO0FBQUEsaUJBQTRCO0FBQUEsVUFBUXViLFdBQVczVjtBQUFBQSxhQUF0RixHQUFHNEosT0FBTzdMLFNBQVMsSUFBSTZMLE9BQU92SixLQUFLLElBQTVDO0FBQUE7QUFBQTtBQUFBO0FBQUEsZUFBb0c7QUFBQSxNQUM3RyxDQUFDLEtBSkQ7QUFBQTtBQUFBO0FBQUE7QUFBQSxhQUlHO0FBQUEsTUFDSCx1QkFBQyxZQUFPLE1BQUssVUFBUyxTQUFTLE1BQU1jLE1BQU1ZLGFBQWEsRUFBRXRDLE1BQU0sT0FBTzFCLFdBQVd2QyxRQUFRMUIsSUFBSXVHLE9BQU9ILElBQUlwRyxJQUFJaUcsU0FBUyxRQUFRLENBQUMsR0FBRyxpQ0FBbEk7QUFBQTtBQUFBO0FBQUE7QUFBQSxhQUFtSjtBQUFBLFNBUHJKO0FBQUE7QUFBQTtBQUFBO0FBQUEsV0FRQSxJQUNFO0FBQUEsSUFDSix1QkFBQyxPQUFFLFdBQVUscUJBQW9CLDhOQUFqQztBQUFBO0FBQUE7QUFBQTtBQUFBLFdBQStPO0FBQUEsSUFDL08sdUJBQUMsWUFBUyxPQUFNLGFBQVksaUNBQUMsY0FBUyxNQUFLLEtBQUksT0FBT0csSUFBSUYsTUFBTSxVQUFVLENBQUM4QixVQUFVNlAsT0FBTyxRQUFRN1AsTUFBTTlHLE9BQU85QixLQUFLLEtBQTFGO0FBQUE7QUFBQTtBQUFBO0FBQUEsV0FBNEYsS0FBeEg7QUFBQTtBQUFBO0FBQUE7QUFBQSxXQUEySDtBQUFBLElBQzNILHVCQUFDLFlBQVMsT0FBTSxZQUFXLGlDQUFDLFlBQU8sT0FBTzZSLFVBQVUsVUFBVSxDQUFDakosVUFBVTJULGVBQWUzVCxNQUFNOUcsT0FBTzlCLEtBQUssR0FBRztBQUFBLDZCQUFDLFlBQU8sT0FBTSxXQUFVLDhCQUF4QjtBQUFBO0FBQUE7QUFBQTtBQUFBLGFBQXNDO0FBQUEsTUFBUyx1QkFBQyxZQUFPLE9BQU0sWUFBVywrQkFBekI7QUFBQTtBQUFBO0FBQUE7QUFBQSxhQUF3QztBQUFBLFNBQXpLO0FBQUE7QUFBQTtBQUFBO0FBQUEsV0FBa0wsS0FBN007QUFBQTtBQUFBO0FBQUE7QUFBQSxXQUFzTjtBQUFBLElBQ3ROO0FBQUEsTUFBQztBQUFBO0FBQUEsUUFDQyxPQUFNO0FBQUEsUUFDTixPQUFPc0QsUUFBUTBELElBQUlFLE9BQU8sS0FBS3pCLFFBQVEsQ0FBQyxDQUFDO0FBQUEsUUFDekMsS0FBS25DLFFBQVFnVCxhQUFhcFcsTUFBTSxLQUFLdUYsUUFBUSxDQUFDLENBQUM7QUFBQSxRQUMvQyxLQUFLbkMsUUFBUWdULGFBQWFuVyxNQUFNLEtBQUtzRixRQUFRLENBQUMsQ0FBQztBQUFBLFFBQy9DLE1BQU07QUFBQSxRQUNOLE1BQUs7QUFBQSxRQUNMLFVBQVU2USxhQUFhcFcsUUFBUW9XLGFBQWFuVztBQUFBQSxRQUM1QyxVQUFVa2M7QUFBQUE7QUFBQUEsTUFSWjtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUEsSUFRb0I7QUFBQSxJQUVuQnhLLGFBQWEsWUFDWixtQ0FDRTtBQUFBLDZCQUFDLFlBQVMsT0FBTSxlQUFjLGlDQUFDLFlBQU8sV0FBVSx3QkFBd0I1UjtBQUFBQSxhQUFLMkwsTUFBTStLLGVBQWV0UCxRQUFRLEdBQUc7QUFBQSxRQUFFO0FBQUEsUUFBRXBILEtBQUsyTCxNQUFNK0ssZUFBZXBPLE1BQU0sR0FBRztBQUFBLFFBQUU7QUFBQSxXQUF4SDtBQUFBO0FBQUE7QUFBQTtBQUFBLGFBQXlILEtBQXZKO0FBQUE7QUFBQTtBQUFBO0FBQUEsYUFBZ0s7QUFBQSxNQUNoSyx1QkFBQyxZQUFTLE9BQU0saUJBQWdCLGlDQUFDLFlBQU8sT0FBT3ZCLElBQUlpUyxRQUFRLFVBQVUsQ0FBQ3JRLFVBQVU2UCxPQUFPLFVBQVU3UCxNQUFNOUcsT0FBTzlCLEtBQUssR0FBRztBQUFBLCtCQUFDLFlBQU8sT0FBTSx1QkFBc0IsZ0NBQXBDO0FBQUE7QUFBQTtBQUFBO0FBQUEsZUFBb0Q7QUFBQSxRQUFTLHVCQUFDLFlBQU8sT0FBTSxhQUFZLHNCQUExQjtBQUFBO0FBQUE7QUFBQTtBQUFBLGVBQWdDO0FBQUEsUUFBUyx1QkFBQyxZQUFPLE9BQU0sYUFBWSxzQkFBMUI7QUFBQTtBQUFBO0FBQUE7QUFBQSxlQUFnQztBQUFBLFdBQTVOO0FBQUE7QUFBQTtBQUFBO0FBQUEsYUFBcU8sS0FBclE7QUFBQTtBQUFBO0FBQUE7QUFBQSxhQUE4UTtBQUFBLFNBRmhSO0FBQUE7QUFBQTtBQUFBO0FBQUEsV0FHQSxJQUNFLHVCQUFDLFlBQVMsT0FBTSxVQUFTLGlDQUFDLFlBQU8sV0FBVSx3QkFBdUIseUNBQXpDO0FBQUE7QUFBQTtBQUFBO0FBQUEsV0FBa0UsS0FBM0Y7QUFBQTtBQUFBO0FBQUE7QUFBQSxXQUFvRztBQUFBLElBQ3hHLHVCQUFDLHFCQUFrQixPQUFjLFVBQW9CLFdBQXNCLGdCQUEzRTtBQUFBO0FBQUE7QUFBQTtBQUFBLFdBQXNHO0FBQUEsSUFDdEcsdUJBQUMsWUFBTyxNQUFLLFVBQVMsV0FBVSx1QkFBc0IsVUFBVXNDLFFBQVFpRSxTQUFTLFVBQVUsU0FBUzZWLFFBQVEsMEJBQTVHO0FBQUE7QUFBQTtBQUFBO0FBQUEsV0FBc0g7QUFBQSxPQWpDeEg7QUFBQTtBQUFBO0FBQUE7QUFBQSxTQWtDQTtBQUVKO0FBQUNNLE1BNURRUjtBQThEVCxTQUFTUywwQkFBMEIsRUFBRTFVLE9BQU9qQyxVQUFVMUQsUUFBUSxHQUFHO0FBQy9ELFFBQU1GLGVBQWV3QyxnQkFBZ0JvQixTQUFTN0QsVUFBVUcsUUFBUTFCLEVBQUU7QUFDbEUsUUFBTTZRLFNBQVNuUCxRQUFRd0UsS0FBS007QUFDNUIsTUFBSSxDQUFDcUssT0FBUSxRQUFPLHVCQUFDLG9CQUFpQixPQUFjLFVBQW9CLFdBQXBEO0FBQUE7QUFBQTtBQUFBO0FBQUEsU0FBcUU7QUFDekYsUUFBTWdILFNBQVNBLENBQUN2WCxPQUFPd1gsUUFBUWhILGNBQWMsU0FBU3pKLE1BQU1DLE9BQU9oSCxPQUFPLENBQUNpSCxVQUFVO0FBQ25GdVEsV0FBT3ZRLE1BQU01RixTQUFTSCxZQUFZLEVBQUUwRSxLQUFLTSxnQkFBZ0I7QUFBQSxFQUMzRCxHQUFHLEVBQUVzSyxhQUFhMU0sV0FBV2dCLFNBQVNoQixVQUFVLENBQUM7QUFDakQsUUFBTTRYLFlBQWFuTCxPQUFPMEksTUFBTXZYLFNBQVMsS0FBSzZPLE9BQU9vTCxVQUFXcEwsT0FBT3FMLGdCQUFnQnJMLE9BQU92SztBQUM5RixRQUFNNlYsWUFBWUEsQ0FBQ3BjLFlBQVk7QUFDN0IsUUFBSUEsUUFBUUMsT0FBTyxRQUFTLFFBQU8sRUFBRVYsS0FBS1MsUUFBUVQsS0FBS0MsS0FBS0YsS0FBS0UsSUFBSVEsUUFBUVQsS0FBS3VSLE9BQU9sSixNQUFNcVUsUUFBUSxFQUFFO0FBQ3pHLFFBQUlqYyxRQUFRQyxPQUFPLE1BQU8sUUFBTyxFQUFFVixLQUFLRCxLQUFLQyxJQUFJUyxRQUFRUixLQUFLc1IsT0FBT3BLLFFBQVF1VixRQUFRLEdBQUd6YyxLQUFLUSxRQUFRUixJQUFJO0FBQ3pHLFFBQUlRLFFBQVFDLE9BQU8sVUFBVyxRQUFPO0FBQUEsTUFDbkNWLEtBQUtTLFFBQVFUO0FBQUFBLE1BQ2JDLEtBQUtGLEtBQUtFLElBQUlRLFFBQVFULE1BQU11UixPQUFPbEosTUFBTWtKLE9BQU9wSyxRQUFRb0ssT0FBT3FMLGdCQUFnQnJMLE9BQU92SyxRQUFRakgsS0FBS0UsSUFBSSxHQUFHc1IsT0FBTzBJLE1BQU12WCxTQUFTLENBQUMsQ0FBQztBQUFBLElBQ3BJO0FBQ0EsUUFBSWpDLFFBQVFDLE9BQU8sZ0JBQWlCLFFBQU87QUFBQSxNQUN6Q1YsS0FBS1MsUUFBUVQ7QUFBQUEsTUFDYkMsS0FBS0YsS0FBS0UsSUFBSVEsUUFBUVQsS0FBS3VSLE9BQU9sSixNQUFNa0osT0FBT3BLLFNBQVVvSyxPQUFPMEksTUFBTXZYLFNBQVMsS0FBSzZPLE9BQU9vTCxVQUFXcEwsT0FBT3ZLLElBQUk7QUFBQSxJQUNuSDtBQUNBLFFBQUl2RyxRQUFRQyxPQUFPLE9BQVEsUUFBTztBQUFBLE1BQ2hDVixLQUFLUyxRQUFRVDtBQUFBQSxNQUNiQyxLQUFLRixLQUFLRSxJQUFJUSxRQUFRVCxLQUFLdVIsT0FBT2xKLE1BQU1rSixPQUFPcEssU0FBVW9LLE9BQU8wSSxNQUFNdlgsU0FBUyxLQUFLNk8sT0FBT29MLFVBQVdwTCxPQUFPcUwsYUFBYTtBQUFBLElBQzVIO0FBQ0EsV0FBTyxFQUFFNWMsS0FBS1MsUUFBUVQsS0FBS0MsS0FBS1EsUUFBUVIsSUFBSTtBQUFBLEVBQzlDO0FBQ0EsU0FDRSxtQ0FDRTtBQUFBLDJCQUFDLFlBQU87QUFBQSw2QkFBQyxVQUFLLDZCQUFOO0FBQUE7QUFBQTtBQUFBO0FBQUEsYUFBbUI7QUFBQSxNQUFPLHVCQUFDLFlBQU8saUNBQVI7QUFBQTtBQUFBO0FBQUE7QUFBQSxhQUF5QjtBQUFBLFNBQTNEO0FBQUE7QUFBQTtBQUFBO0FBQUEsV0FBb0U7QUFBQSxJQUNwRSx1QkFBQyxPQUFFLFdBQVUscUJBQW9CLHlJQUFqQztBQUFBO0FBQUE7QUFBQTtBQUFBLFdBQTBKO0FBQUEsSUFDMUosdUJBQUMsYUFBUSxNQUFJLE1BQUM7QUFBQSw2QkFBQyxhQUFRLG1DQUFUO0FBQUE7QUFBQTtBQUFBO0FBQUEsYUFBNEI7QUFBQSxNQUN2QzNDLDJDQUEyQ3NNLElBQUksQ0FBQ25KLFlBQVk7QUFDM0QsY0FBTXFjLFNBQVNELFVBQVVwYyxPQUFPO0FBQ2hDLGVBQ0U7QUFBQSxVQUFDO0FBQUE7QUFBQSxZQUVDLE9BQU9BLFFBQVFPO0FBQUFBLFlBQ2YsT0FBT3VRLE9BQU85USxRQUFRQyxFQUFFO0FBQUEsWUFDeEIsS0FBS29jLE9BQU85YztBQUFBQSxZQUNaLEtBQUs4YyxPQUFPN2M7QUFBQUEsWUFDWixNQUFNUSxRQUFRcUs7QUFBQUEsWUFDZCxNQUFNckssUUFBUXVLO0FBQUFBLFlBQ2QsVUFBVSxDQUFDbEwsVUFBVXlZLE9BQU8sVUFBVTlYLFFBQVFPLEtBQUssSUFBSSxDQUFDaUgsVUFBVTtBQUFFQSxvQkFBTXhILFFBQVFDLEVBQUUsSUFBSVo7QUFBQUEsWUFBTyxHQUFHLHFCQUFxQnNDLFFBQVExQixFQUFFLElBQUlELFFBQVFDLEVBQUUsRUFBRTtBQUFBO0FBQUEsVUFQNUlELFFBQVFDO0FBQUFBLFVBRGY7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQSxRQVFxSjtBQUFBLE1BR3pKLENBQUM7QUFBQSxTQWZIO0FBQUE7QUFBQTtBQUFBO0FBQUEsV0FnQkE7QUFBQSxJQUNBLHVCQUFDLGFBQVEsTUFBSSxNQUFDO0FBQUEsNkJBQUMsYUFBUSx1Q0FBVDtBQUFBO0FBQUE7QUFBQTtBQUFBLGFBQWdDO0FBQUEsTUFDNUMsdUJBQUMsU0FBSSxXQUFVLGlDQUNaNlEsaUJBQU8wSSxNQUFNclE7QUFBQUEsUUFBSSxDQUFDekUsTUFBTTRYLGNBQ3ZCLHVCQUFDLFNBQUksV0FBVSxnQ0FDYjtBQUFBLGlDQUFDLFVBQU05RyxpQkFBTzhHLFlBQVksQ0FBQyxFQUFFN0csU0FBUyxHQUFHLEdBQUcsS0FBNUM7QUFBQTtBQUFBO0FBQUE7QUFBQSxpQkFBOEM7QUFBQSxVQUM5Qyx1QkFBQyxXQUFNLE9BQU8vUSxLQUFLbkUsT0FBTyxjQUFZLGNBQWMrYixZQUFZLENBQUMsVUFBVSxVQUFVLENBQUNyVSxVQUFVNlAsT0FBTyx5QkFBeUIsQ0FBQ3RRLFVBQVU7QUFBRUEsa0JBQU1nUyxNQUFNOEMsU0FBUyxFQUFFL2IsUUFBUTBILE1BQU05RyxPQUFPOUI7QUFBQUEsVUFBTyxHQUFHLHFCQUFxQnNDLFFBQVExQixFQUFFLFNBQVN5RSxLQUFLb1MsS0FBSyxRQUFRLEtBQTdQO0FBQUE7QUFBQTtBQUFBO0FBQUEsaUJBQStQO0FBQUEsVUFDL1AsdUJBQUMsU0FBSSxXQUFVLG1DQUFrQyxPQUFPLEdBQUdwUyxLQUFLbkUsS0FBSyw2QkFBNkJMLCtCQUErQndFLEtBQUtvUyxLQUFLLENBQUMsSUFDMUk7QUFBQSxtQ0FBQyxPQUFFLE9BQU8sRUFBRXlGLFlBQVksT0FBT3JjLCtCQUErQndFLEtBQUtvUyxLQUFLLENBQUMsSUFBSSxLQUE3RTtBQUFBO0FBQUE7QUFBQTtBQUFBLG1CQUErRTtBQUFBLFlBQy9FLHVCQUFDLFVBQU01Vyx5Q0FBK0J3RSxLQUFLb1MsS0FBSyxLQUFoRDtBQUFBO0FBQUE7QUFBQTtBQUFBLG1CQUFrRDtBQUFBLGVBRnBEO0FBQUE7QUFBQTtBQUFBO0FBQUEsaUJBR0E7QUFBQSxVQUNBLHVCQUFDLFVBQ0M7QUFBQSxtQ0FBQyxZQUFPLE1BQUssVUFBUyxVQUFVd0YsY0FBYyxHQUFHLGNBQVksVUFBVTVYLEtBQUtuRSxLQUFLLFlBQVksU0FBUyxNQUFNdVgsT0FBTyw2QkFBNkIsQ0FBQ3RRLFVBQVU7QUFBRSxvQkFBTSxDQUFDOEksS0FBSyxJQUFJOUksTUFBTWdTLE1BQU0vUixPQUFPNlUsV0FBVyxDQUFDO0FBQUc5VSxvQkFBTWdTLE1BQU0vUixPQUFPNlUsWUFBWSxHQUFHLEdBQUdoTSxLQUFLO0FBQUEsWUFBRyxDQUFDLEdBQUcsaUJBQWhRO0FBQUE7QUFBQTtBQUFBO0FBQUEsbUJBQWlRO0FBQUEsWUFDalEsdUJBQUMsWUFBTyxNQUFLLFVBQVMsVUFBVWdNLGNBQWN4TCxPQUFPMEksTUFBTXZYLFNBQVMsR0FBRyxjQUFZLFVBQVV5QyxLQUFLbkUsS0FBSyxVQUFVLFNBQVMsTUFBTXVYLE9BQU8sNkJBQTZCLENBQUN0USxVQUFVO0FBQUUsb0JBQU0sQ0FBQzhJLEtBQUssSUFBSTlJLE1BQU1nUyxNQUFNL1IsT0FBTzZVLFdBQVcsQ0FBQztBQUFHOVUsb0JBQU1nUyxNQUFNL1IsT0FBTzZVLFlBQVksR0FBRyxHQUFHaE0sS0FBSztBQUFBLFlBQUcsQ0FBQyxHQUFHLGlCQUFwUjtBQUFBO0FBQUE7QUFBQTtBQUFBLG1CQUFxUjtBQUFBLGVBRnZSO0FBQUE7QUFBQTtBQUFBO0FBQUEsaUJBR0E7QUFBQSxhQVZpRDVMLEtBQUtvUyxPQUF4RDtBQUFBO0FBQUE7QUFBQTtBQUFBLGVBV0E7QUFBQSxNQUNELEtBZEg7QUFBQTtBQUFBO0FBQUE7QUFBQSxhQWVBO0FBQUEsU0FoQkY7QUFBQTtBQUFBO0FBQUE7QUFBQSxXQWlCQTtBQUFBLElBQ0EsdUJBQUMsT0FBRSxXQUFVLHFCQUFvQix1S0FBakM7QUFBQTtBQUFBO0FBQUE7QUFBQSxXQUF3TDtBQUFBLE9BdEMxTDtBQUFBO0FBQUE7QUFBQTtBQUFBLFNBdUNBO0FBRUo7QUFBQzBGLE1BbkVRUjtBQXFFVCxTQUFTUyxnQkFBZ0IsRUFBRW5WLE9BQU9qQyxVQUFVMUQsUUFBUSxHQUFHO0FBQ3JELFFBQU1GLGVBQWV3QyxnQkFBZ0JvQixTQUFTN0QsVUFBVUcsUUFBUTFCLEVBQUU7QUFDbEUsUUFBTXlCLFdBQVcyRCxTQUFTaEIsVUFBVTNDO0FBQ3BDLFFBQU1nYixjQUFjL2EsUUFBUUcsT0FBT0MsS0FBS0wsUUFBUTtBQUNoRCxRQUFNRyxNQUFNNmEsZUFBZUEsWUFBWTFhLEtBQUssS0FBSzBhLFlBQVkxYSxLQUFLLElBQUkwYSxjQUFjO0FBQ3BGLFFBQU10RSxRQUFROVQsaUJBQWlCZSxTQUFTQyxjQUFjM0QsU0FBUzBELFNBQVNvRCxVQUFVakUsT0FBTztBQUN6RixRQUFNbVksV0FBV3JkLEtBQUtDLElBQUksT0FBT0QsS0FBS0UsSUFBSSxNQUFPUixnQ0FBZ0NvWixLQUFLLENBQUMsQ0FBQztBQUN4RixRQUFNd0UsY0FBY0EsQ0FBQ3RFLFdBQVdoUixNQUFNQyxPQUFPLFNBQVMrUSxNQUFNLGtCQUFrQixDQUFDOVEsVUFBVTtBQUN2RixVQUFNcVYsV0FBVTtBQUFBLE1BQ2RDLE1BQU07QUFBQSxRQUNKLEVBQUU5YSxJQUFJLEdBQUdYLFFBQVEsQ0FBQyxHQUFHLEdBQUcsQ0FBQyxHQUFHQyxjQUFjLENBQUMsR0FBRyxHQUFHLEVBQUUsR0FBR04sS0FBSyxJQUFJQyxNQUFNLEdBQUc4YixRQUFRLGFBQWE7QUFBQSxRQUM3RixFQUFFL2EsSUFBSSxHQUFHWCxRQUFRLENBQUMsR0FBRyxHQUFHLElBQUksR0FBR0MsY0FBYyxDQUFDLEdBQUcsR0FBRyxFQUFFLEdBQUdOLEtBQUssSUFBSUMsTUFBTSxHQUFHOGIsUUFBUSxhQUFhO0FBQUEsTUFBQztBQUFBLE1BRW5HQyxPQUFPO0FBQUEsUUFDTCxFQUFFaGIsSUFBSSxHQUFHWCxRQUFRLENBQUMsTUFBTSxHQUFHLENBQUMsR0FBR0MsY0FBYyxDQUFDLEtBQUssR0FBRyxFQUFFLEdBQUdOLEtBQUssSUFBSUMsTUFBTSxHQUFHOGIsUUFBUSxhQUFhO0FBQUEsUUFDbEcsRUFBRS9hLElBQUksR0FBR1gsUUFBUSxDQUFDLEtBQUssR0FBRyxDQUFDLEdBQUdDLGNBQWMsQ0FBQyxNQUFNLEdBQUcsRUFBRSxHQUFHTixLQUFLLElBQUlDLE1BQU0sR0FBRzhiLFFBQVEsYUFBYTtBQUFBLE1BQUM7QUFBQSxNQUVyR0UsT0FBTztBQUFBLFFBQ0wsRUFBRWpiLElBQUksR0FBR1gsUUFBUSxDQUFDLE1BQU0sR0FBRyxDQUFDLEdBQUdDLGNBQWMsQ0FBQyxLQUFLLEdBQUcsRUFBRSxHQUFHTixLQUFLLElBQUlDLE1BQU0sT0FBTzhiLFFBQVEsYUFBYTtBQUFBLFFBQ3RHLEVBQUUvYSxJQUFJLEtBQUtYLFFBQVEsQ0FBQyxLQUFLLE1BQU0sQ0FBQyxHQUFHQyxjQUFjLENBQUMsTUFBTSxNQUFNLEVBQUUsR0FBR04sS0FBSyxJQUFJQyxNQUFNLE1BQU04YixRQUFRLGFBQWE7QUFBQSxRQUM3RyxFQUFFL2EsSUFBSSxHQUFHWCxRQUFRLENBQUMsR0FBRyxHQUFHLENBQUMsR0FBR0MsY0FBYyxDQUFDLEdBQUcsR0FBRyxFQUFFLEdBQUdOLEtBQUssSUFBSUMsTUFBTSxHQUFHOGIsUUFBUSxhQUFhO0FBQUEsTUFBQztBQUFBLE1BRWhHRyxRQUFRO0FBQUEsUUFDTixFQUFFbGIsSUFBSSxHQUFHWCxRQUFRLENBQUMsR0FBRyxPQUFPLEdBQUcsR0FBR0MsY0FBYyxDQUFDLEdBQUcsS0FBSyxFQUFFLEdBQUdOLEtBQUssSUFBSUMsTUFBTSxHQUFHOGIsUUFBUSxhQUFhO0FBQUEsUUFDckcsRUFBRS9hLElBQUksR0FBR1gsUUFBUSxDQUFDLEdBQUcsR0FBRyxDQUFDLEdBQUdDLGNBQWMsQ0FBQyxHQUFHLEdBQUcsRUFBRSxHQUFHTixLQUFLLElBQUlDLE1BQU0sR0FBRzhiLFFBQVEsYUFBYTtBQUFBLE1BQUM7QUFBQSxNQUVoR0ksU0FBUztBQUFBLFFBQ1AsRUFBRW5iLElBQUksR0FBR1gsUUFBUSxDQUFDLEtBQUssS0FBSyxDQUFDLEdBQUdDLGNBQWMsQ0FBQyxNQUFNLE1BQU0sRUFBRSxHQUFHTixLQUFLLElBQUlDLE1BQU0sTUFBTThiLFFBQVEsYUFBYTtBQUFBLFFBQzFHLEVBQUUvYSxJQUFJLEdBQUdYLFFBQVEsQ0FBQyxHQUFHLEdBQUcsQ0FBQyxHQUFHQyxjQUFjLENBQUMsR0FBRyxHQUFHLEVBQUUsR0FBR04sS0FBSyxJQUFJQyxNQUFNLEdBQUc4YixRQUFRLGFBQWE7QUFBQSxNQUFDO0FBQUEsSUFFbEc7QUFDQXZWLFVBQU01RixTQUFTSCxZQUFZLEVBQUVLLE9BQU9DLE9BQU84YSxTQUFRdkUsTUFBTTtBQUN6RHBXLHdCQUFvQnNGLE9BQU8vRixZQUFZO0FBQUEsRUFDekMsR0FBRyxFQUFFNEMsV0FBVyxFQUFFdUIsTUFBTSxXQUFXMUIsV0FBV3ZDLFFBQVExQixHQUFHLEVBQUUsQ0FBQztBQUM1RCxRQUFNbWQsd0JBQXdCemIsUUFBUUcsT0FBT0MsS0FBS29DO0FBQUFBLElBQVUsQ0FBQ08sU0FDM0RBLEtBQUsxQyxLQUFLLEtBQUswQyxLQUFLMUMsS0FBSyxLQUFLMUMsS0FBS3lCLElBQUkyRCxLQUFLMUMsS0FBSzJhLFFBQVEsSUFBSTtBQUFBLEVBQzlEO0FBQ0QsUUFBTVUsU0FBU0EsTUFBTTtBQUNuQixRQUFJRCx5QkFBeUIsR0FBRztBQUM5QjlWLFlBQU1ZLGFBQWEsRUFBRXRDLE1BQU0sY0FBYzFCLFdBQVd2QyxRQUFRMUIsSUFBSXlCLFVBQVUwYixzQkFBc0IsQ0FBQztBQUNqRztBQUFBLElBQ0Y7QUFDQSxVQUFNRSxpQkFBaUIzYixRQUFRRyxPQUFPQyxLQUFLb0MsVUFBVSxDQUFDTyxTQUFTQSxLQUFLMUMsS0FBSzJhLFFBQVE7QUFDakYsVUFBTVksbUJBQW1CRCxpQkFBaUIsSUFBSTNiLFFBQVFHLE9BQU9DLEtBQUtFLFNBQVNxYjtBQUMzRSxVQUFNRSxVQUFVMWYseUJBQXlCdUgsU0FBU0MsY0FBY0QsU0FBU29ELFVBQVVqRSxPQUFPO0FBQzFGLFVBQU1pWixRQUFRcFksU0FBUzdELFNBQVN5VSxRQUFRblUsT0FBTzRiLFNBQVVyWSxTQUFTb0QsVUFBVWpFLFVBQVVnWixRQUFRMWIsT0FBTzZiO0FBQ3JHLFVBQU1DLFNBQVM7QUFBQSxNQUNiNWIsSUFBSTJhO0FBQUFBLE1BQ0p0YixRQUFRLENBQUNtYyxRQUFRMWIsT0FBTzBCLFNBQVMsQ0FBQyxHQUFHZ2EsUUFBUTFiLE9BQU8wQixTQUFTLENBQUMsR0FBR2dhLFFBQVExYixPQUFPMEIsU0FBUyxDQUFDLElBQUlpYSxLQUFLO0FBQUEsTUFDbkduYyxjQUFja2MsUUFBUTFiLE9BQU9YLE9BQU9nSSxJQUFJLENBQUM5SixPQUFPd2UsU0FBU3hlLFFBQVFtZSxRQUFRMWIsT0FBTzBCLFNBQVNxYSxJQUFJLENBQUM7QUFBQSxNQUM5RjdjLEtBQUt3YyxRQUFRMWIsT0FBT2Q7QUFBQUEsTUFDcEJDLE1BQU11YyxRQUFRMWIsT0FBT2I7QUFBQUEsTUFDckI4YixRQUFRO0FBQUEsSUFDVjtBQUNBelYsVUFBTUMsT0FBTyxrQkFBa0IsQ0FBQ0MsVUFBVTtBQUN4Q0EsWUFBTTVGLFNBQVNILFlBQVksRUFBRUssT0FBT0MsS0FBSzJELEtBQUtrWSxNQUFNO0FBQ3BEcFcsWUFBTTVGLFNBQVNILFlBQVksRUFBRUssT0FBT0MsS0FBSytFLEtBQUssQ0FBQ0MsR0FBR0MsTUFBTUQsRUFBRS9FLEtBQUtnRixFQUFFaEYsRUFBRTtBQUFBLElBQ3JFLEdBQUcsRUFBRXFDLFdBQVcsRUFBRXVCLE1BQU0sY0FBYzFCLFdBQVd2QyxRQUFRMUIsSUFBSXlCLFVBQVU2YixpQkFBaUIsRUFBRSxDQUFDO0FBQUEsRUFDN0Y7QUFDQSxRQUFNVixVQUFVLHVCQUFDLFNBQUksV0FBVSwrQkFBK0IsV0FBQyxRQUFRLFNBQVMsU0FBUyxVQUFVLFNBQVMsRUFBRTFULElBQUksQ0FBQzJVLFNBQVMsdUJBQUMsWUFBTyxNQUFLLFVBQW9CLFNBQVMsTUFBTWxCLFlBQVlrQixJQUFJLEdBQUlBLGtCQUF6Q0EsTUFBM0I7QUFBQTtBQUFBO0FBQUE7QUFBQSxTQUF5RSxDQUFTLEtBQTlMO0FBQUE7QUFBQTtBQUFBO0FBQUEsU0FBZ007QUFDaE4sTUFBSSxDQUFDamMsS0FBSztBQUNSLFdBQU8sbUNBQUU7QUFBQSw2QkFBQyxZQUFPO0FBQUEsK0JBQUMsVUFBSyw0QkFBTjtBQUFBO0FBQUE7QUFBQTtBQUFBLGVBQWtCO0FBQUEsUUFBTyx1QkFBQyxZQUFPLG9DQUFSO0FBQUE7QUFBQTtBQUFBO0FBQUEsZUFBNEI7QUFBQSxXQUE3RDtBQUFBO0FBQUE7QUFBQTtBQUFBLGFBQXNFO0FBQUEsTUFBUyx1QkFBQyxPQUFFLFdBQVUscUJBQW9CLG9KQUFqQztBQUFBO0FBQUE7QUFBQTtBQUFBLGFBQXFLO0FBQUEsTUFBS2diO0FBQUFBLE1BQVEsdUJBQUMsWUFBTyxNQUFLLFVBQVMsV0FBVSw0QkFBMkIsU0FBU1EsUUFBUTtBQUFBO0FBQUEsUUFBbUJ0WSxvQkFBb0I0WCxRQUFRO0FBQUEsV0FBM0g7QUFBQTtBQUFBO0FBQUE7QUFBQSxhQUE2SDtBQUFBLFNBQWhZO0FBQUE7QUFBQTtBQUFBO0FBQUEsV0FBeVk7QUFBQSxFQUNsWjtBQUNBLFFBQU03RSxTQUFTQSxDQUFDalgsT0FBT3hCLFVBQVVpSSxNQUFNQyxPQUFPLGVBQWUxRyxLQUFLLElBQUksQ0FBQzJHLFVBQVU7QUFDL0VBLFVBQU01RixTQUFTSCxZQUFZLEVBQUVLLE9BQU9DLEtBQUtMLFFBQVEsRUFBRWIsS0FBSyxJQUFJa2QsTUFBTUMsUUFBUTNlLEtBQUssSUFBSSxDQUFDLEdBQUdBLEtBQUssSUFBSUE7QUFDaEcsUUFBSU8sbUJBQW1CMkosSUFBSTFJLEtBQUssRUFBR1Usb0JBQW1CaUcsT0FBTy9GLGNBQWNDLFFBQVE7QUFBQSxFQUNyRixHQUFHLEVBQUVxUCxhQUFhLFVBQVVwUCxRQUFRMUIsRUFBRSxJQUFJeUIsUUFBUSxJQUFJYixLQUFLLElBQUl3RCxXQUFXZ0IsU0FBU2hCLFVBQVUsQ0FBQztBQUM5RixRQUFNNFosZUFBZUEsQ0FBQ3BkLE9BQU9nZCxNQUFNeGUsVUFBVTtBQUMzQyxVQUFNcU0sT0FBTyxDQUFDLEdBQUc3SixJQUFJaEIsS0FBSyxDQUFDO0FBQzNCNkssU0FBS21TLElBQUksSUFBSXhlO0FBQ2J5WSxXQUFPalgsT0FBTzZLLElBQUk7QUFBQSxFQUNwQjtBQUNBLFFBQU1pSyxlQUFldlgsdUNBQXVDdUQsUUFBUUcsT0FBT0MsTUFBTUwsUUFBUTtBQUN6RixRQUFNd2MsY0FBYzdZLFNBQVN1RyxtQkFBbUIsV0FBVyxtQkFBbUI7QUFDOUUsUUFBTXVTLGNBQWM5WSxTQUFTdUcsbUJBQW1CLFdBQVcsa0JBQWtCO0FBQzdFLFFBQU13UyxlQUFlQSxDQUFDL2UsVUFBVWlJLE1BQU1DLE9BQU8seUJBQXlCLENBQUNDLFVBQVU7QUFDL0VBLFVBQU01RixTQUFTSCxZQUFZLEVBQUV5YyxXQUFXLElBQUk3ZTtBQUFBQSxFQUM5QyxHQUFHLEVBQUUwUixhQUFhLFdBQVdwUCxRQUFRMUIsRUFBRSxJQUFJaWUsV0FBVyxJQUFJN1osV0FBV2dCLFNBQVNoQixVQUFVLENBQUM7QUFDekYsU0FDRSxtQ0FDRTtBQUFBLDJCQUFDLFlBQU87QUFBQSw2QkFBQyxVQUFLLDBCQUFOO0FBQUE7QUFBQTtBQUFBO0FBQUEsYUFBZ0I7QUFBQSxNQUFPLHVCQUFDLFlBQVFVO0FBQUFBLDRCQUFvQmxELElBQUlHLEVBQUU7QUFBQSxRQUFFO0FBQUEsUUFBVUwsUUFBUXBCO0FBQUFBLFdBQXZEO0FBQUE7QUFBQTtBQUFBO0FBQUEsYUFBNkQ7QUFBQSxTQUE1RjtBQUFBO0FBQUE7QUFBQTtBQUFBLFdBQXFHO0FBQUEsSUFDcEdzYztBQUFBQSxJQUNEO0FBQUEsTUFBQztBQUFBO0FBQUEsUUFDQyxPQUFNO0FBQUEsUUFDTixPQUFPbGEsUUFBUWQsSUFBSUcsS0FBSyxLQUFLOEMsUUFBUSxDQUFDLENBQUM7QUFBQSxRQUN2QyxLQUFLbkMsUUFBUWdULGFBQWFwVyxNQUFNLEtBQUt1RixRQUFRLENBQUMsQ0FBQztBQUFBLFFBQy9DLEtBQUtuQyxRQUFRZ1QsYUFBYW5XLE1BQU0sS0FBS3NGLFFBQVEsQ0FBQyxDQUFDO0FBQUEsUUFDL0MsTUFBTTtBQUFBLFFBQ04sTUFBSztBQUFBLFFBQ0wsVUFBVSxDQUFDekYsVUFBVXlZLE9BQU8sTUFBTXhZLEtBQUtDLElBQUlvVyxhQUFhblcsS0FBS0YsS0FBS0UsSUFBSW1XLGFBQWFwVyxLQUFLUCxnQ0FBZ0NLLFFBQVEsR0FBRyxDQUFDLENBQUMsQ0FBQztBQUFBO0FBQUEsTUFQeEk7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBLElBTzBJO0FBQUEsSUFFMUksdUJBQUMsa0JBQWUsT0FBTzhlLGFBQWEsT0FBT3hjLFFBQVF1YyxXQUFXLEdBQUcsS0FBSyxHQUFHLEtBQUssR0FBRyxNQUFNLE1BQU0sTUFBSyxNQUFLLFVBQVVFLGdCQUFqSDtBQUFBO0FBQUE7QUFBQTtBQUFBLFdBQThIO0FBQUEsSUFDN0gsQ0FBQyxZQUFZLFlBQVksZ0JBQWdCLEVBQUVqVixJQUFJLENBQUM1SSxPQUFPc2QsU0FBUyx1QkFBQyxrQkFBMkIsT0FBYyxPQUFPaGMsSUFBSVIsT0FBT3djLElBQUksR0FBRyxLQUFLLElBQUksS0FBSyxHQUFHLE1BQU0sTUFBTSxNQUFLLE1BQUssVUFBVSxDQUFDeGUsVUFBVTRlLGFBQWEsVUFBVUosTUFBTXhlLEtBQUssS0FBNUlrQixPQUFyQjtBQUFBO0FBQUE7QUFBQTtBQUFBLFdBQW1LLENBQUc7QUFBQSxJQUN0TyxDQUFDLFNBQVMsU0FBUyxXQUFXLEVBQUU0SSxJQUFJLENBQUM1SSxPQUFPc2QsU0FBUyx1QkFBQyxrQkFBMkIsT0FBYyxPQUFPaGMsSUFBSVAsYUFBYXVjLElBQUksR0FBRyxLQUFLLElBQUksS0FBSyxHQUFHLE1BQU0sTUFBTSxNQUFLLE1BQUssVUFBVSxDQUFDeGUsVUFBVTRlLGFBQWEsZ0JBQWdCSixNQUFNeGUsS0FBSyxLQUF4SmtCLE9BQXJCO0FBQUE7QUFBQTtBQUFBO0FBQUEsV0FBK0ssQ0FBRztBQUFBLElBQ3hPLHVCQUFDLGtCQUFlLE9BQU0saUJBQWdCLE9BQU9zQixJQUFJYixLQUFLLEtBQUssSUFBSSxLQUFLLElBQUksTUFBTSxHQUFHLE1BQUssS0FBSSxVQUFVLENBQUMzQixVQUFVeVksT0FBTyxPQUFPelksS0FBSyxLQUFsSTtBQUFBO0FBQUE7QUFBQTtBQUFBLFdBQW9JO0FBQUEsSUFDcEksdUJBQUMsa0JBQWUsT0FBTSxRQUFPLE9BQU93QyxJQUFJWixNQUFNLEtBQUssTUFBTSxLQUFLLEtBQUssTUFBTSxNQUFNLE1BQUssT0FBTSxVQUFVLENBQUM1QixVQUFVeVksT0FBTyxRQUFRelksS0FBSyxLQUFuSTtBQUFBO0FBQUE7QUFBQTtBQUFBLFdBQXFJO0FBQUEsSUFDckksdUJBQUMsWUFBUyxPQUFNLFVBQVMsaUNBQUMsWUFBTyxPQUFPd0MsSUFBSWtiLFFBQVEsVUFBVSxDQUFDOVUsVUFBVTZQLE9BQU8sVUFBVTdQLE1BQU05RyxPQUFPOUIsS0FBSyxHQUFHO0FBQUEsNkJBQUMsWUFBTyxPQUFNLGNBQWEsMEJBQTNCO0FBQUE7QUFBQTtBQUFBO0FBQUEsYUFBcUM7QUFBQSxNQUFTLHVCQUFDLFlBQU8sT0FBTSxlQUFjLDJCQUE1QjtBQUFBO0FBQUE7QUFBQTtBQUFBLGFBQXVDO0FBQUEsU0FBM0s7QUFBQTtBQUFBO0FBQUE7QUFBQSxXQUFvTCxLQUE3TTtBQUFBO0FBQUE7QUFBQTtBQUFBLFdBQXNOO0FBQUEsSUFDdE4sdUJBQUMsWUFBTyxNQUFLLFVBQVMsV0FBVSw0QkFBMkIsVUFBVStkLHlCQUF5QixHQUFHLFNBQVNDLFFBQVNELG1DQUF5QixJQUFJLHlCQUF5QnJZLG9CQUFvQjRYLFFBQVEsQ0FBQyxLQUFLLHNCQUFzQjVYLG9CQUFvQjRYLFFBQVEsQ0FBQyxNQUE5UDtBQUFBO0FBQUE7QUFBQTtBQUFBLFdBQWlRO0FBQUEsSUFDalEsdUJBQUMsWUFBTyxNQUFLLFVBQVMsV0FBVSx1QkFBc0IsU0FBUyxNQUFNclYsTUFBTUMsT0FBTyxxQkFBcUIsQ0FBQ0MsVUFBVTtBQUFFQSxZQUFNNUYsU0FBU0gsWUFBWSxFQUFFSyxPQUFPQyxLQUFLMEYsT0FBTy9GLFVBQVUsQ0FBQztBQUFBLElBQUcsR0FBRyxFQUFFMkMsV0FBVyxFQUFFdUIsTUFBTSxXQUFXMUIsV0FBV3ZDLFFBQVExQixHQUFHLEVBQUUsQ0FBQyxHQUFHLDBCQUFqUDtBQUFBO0FBQUE7QUFBQTtBQUFBLFdBQTJQO0FBQUEsT0FuQjdQO0FBQUE7QUFBQTtBQUFBO0FBQUEsU0FvQkE7QUFFSjtBQUFDb2UsT0FyR1E1QjtBQXVHVCxNQUFNNkIsd0JBQXdCbmUsT0FBT0MsT0FBTztBQUFBLEVBQzFDLFlBQVk7QUFBQSxFQUNaLGVBQWU7QUFBQSxFQUNmLHNCQUFzQjtBQUFBLEVBQ3RCLGVBQWU7QUFDakIsQ0FBQztBQUVELFNBQVNtZSxlQUFlLEVBQUVqWCxPQUFPakMsVUFBVTFELFNBQVM2YyxlQUFlLEdBQUc7QUFDcEUsUUFBTS9jLGVBQWV3QyxnQkFBZ0JvQixTQUFTN0QsVUFBVUcsUUFBUTFCLEVBQUU7QUFDbEUsTUFBSTBCLFFBQVFrRSxNQUFNQyxTQUFTLE9BQU87QUFDaEMsV0FBTyxtQ0FBRTtBQUFBLDZCQUFDLFlBQU87QUFBQSwrQkFBQyxVQUFLLDJCQUFOO0FBQUE7QUFBQTtBQUFBO0FBQUEsZUFBaUI7QUFBQSxRQUFPLHVCQUFDLFlBQU8sK0JBQVI7QUFBQTtBQUFBO0FBQUE7QUFBQSxlQUF1QjtBQUFBLFdBQXZEO0FBQUE7QUFBQTtBQUFBO0FBQUEsYUFBZ0U7QUFBQSxNQUFTLHVCQUFDLE9BQUUsV0FBVSxxQkFBb0IseUhBQWpDO0FBQUE7QUFBQTtBQUFBO0FBQUEsYUFBMEk7QUFBQSxNQUFJLHVCQUFDLFlBQU8sTUFBSyxVQUFTLFdBQVUsNEJBQTJCLFNBQVMsTUFBTXdCLE1BQU1DLE9BQU8scUJBQXFCLENBQUNDLFVBQVU7QUFDclZBLGNBQU01RixTQUFTSCxZQUFZLEVBQUVvRSxRQUFRbkksNEJBQTRCOEosTUFBTTVGLFNBQVMyUyxNQUFNLEdBQUc5UyxZQUFZLEVBQUVrSCxRQUFRLEVBQUU1SSxLQUFLLENBQUMyRSxTQUFTQSxLQUFLbUIsTUFBTUMsU0FBUyxLQUFLLEdBQUdELFNBQVMyQixNQUFNNUYsU0FBUyxDQUFDLEVBQUVpRSxLQUFLO0FBQUEsTUFDOUwsQ0FBQyxHQUFHLGlDQUY0TjtBQUFBO0FBQUE7QUFBQTtBQUFBLGFBRTNNO0FBQUEsU0FGZDtBQUFBO0FBQUE7QUFBQTtBQUFBLFdBRXVCO0FBQUEsRUFDaEM7QUFDQSxRQUFNQSxRQUFRbEUsUUFBUWtFO0FBQ3RCLFFBQU00WSxRQUFRemhCLGtDQUFrQzZJLE1BQU1pUSxPQUFPO0FBQzdELFFBQU00SSxrQkFBa0I3Z0Isc0NBQXNDd0gsU0FBU0MsY0FBYzdELFlBQVk7QUFDakcsUUFBTWtkLGdCQUFnQnJmLEtBQUtFLElBQUlrZixpQkFBaUI3WSxNQUFNRSxhQUFhNkIsS0FBSyxDQUFDO0FBQ3pFLFFBQU1nWCxvQkFBb0IvWSxNQUFNRSxhQUFhSCxTQUFTO0FBQ3RELFFBQU1pWix3QkFBd0IsQ0FBQyxTQUFTLGdCQUFnQixFQUFFM0gsU0FBU3JSLE1BQU1FLGFBQWFILElBQUk7QUFDMUYsUUFBTWtaLHVCQUF1QnpaLFNBQVM3RCxTQUFTSSxTQUM1QzJTLE1BQU0sR0FBRzlTLFlBQVksRUFDckJrSCxRQUFRLEVBQ1I1SSxLQUFLLENBQUMyRSxTQUFTQSxLQUFLbUIsTUFBTUMsU0FBUyxLQUFLO0FBQzNDLFFBQU1pWixjQUFjL2hCLGtDQUFrQzhoQixzQkFBc0JqWixNQUFNaVEsV0FBV2pRLE1BQU1pUSxPQUFPO0FBQzFHLFFBQU1rSixXQUFXUixnQkFBZ0JTLGtCQUFrQi9ILFNBQVN2VixRQUFRMUIsRUFBRTtBQUN0RSxRQUFNaWYsdUJBQXVCVixnQkFBZ0JXLGdDQUFnQyxXQUN6RSxXQUNBWCxnQkFBZ0JXLGdDQUFnQyxZQUM5QyxjQUNBSCxXQUNFUixnQkFBZ0JZLDBCQUEwQlosZ0JBQWdCYSw0QkFBNEIxZCxRQUFRMUIsS0FDNUYsc0JBQ0EsVUFDRjtBQUNSLFFBQU02WCxTQUFTQSxDQUFDdlgsT0FBT3dYLFFBQVFoSCxjQUFjLFNBQVN6SixNQUFNQyxPQUFPaEgsT0FBTyxDQUFDaUgsVUFBVXVRLE9BQU92USxNQUFNNUYsU0FBU0gsWUFBWSxFQUFFb0UsS0FBSyxHQUFHLEVBQUVrTCxhQUFhMU0sV0FBV2dCLFNBQVNoQixVQUFVLENBQUM7QUFDL0ssUUFBTWliLFdBQVdBLENBQUN4SixZQUFZeE8sTUFBTW1ULFNBQVMsc0JBQXNCemQsa0NBQWtDOFksT0FBTyxFQUFFdlYsS0FBSyxJQUFJLENBQUNpSCxVQUFVO0FBQ2hJLFVBQU1yRyxTQUFTcUcsTUFBTTVGLFNBQVNILFlBQVksRUFBRW9FO0FBQzVDMUUsV0FBTzJVLFVBQVVBO0FBQ2pCM1UsV0FBT29lLGtCQUFrQnBmLE9BQU9xZixZQUFZeGlCLGtDQUFrQzhZLE9BQU8sRUFBRTJKLFdBQVd0VyxJQUFJLENBQUNuSixZQUFZLENBQUNBLFFBQVFDLElBQUlELFFBQVFDLE9BQU8sWUFBWSxLQUFLRCxRQUFRVCxNQUFNUyxRQUFRUixPQUFPLENBQUMsQ0FBQyxDQUFDO0FBQUEsRUFDbE0sQ0FBQztBQUNELFNBQ0UsbUNBQ0U7QUFBQSwyQkFBQyxZQUFPO0FBQUEsNkJBQUMsVUFBSywwQkFBTjtBQUFBO0FBQUE7QUFBQTtBQUFBLGFBQWdCO0FBQUEsTUFBTyx1QkFBQyxZQUFRaWYsaUJBQU9sZSxTQUFTc0YsTUFBTWlRLFdBQS9CO0FBQUE7QUFBQTtBQUFBO0FBQUEsYUFBdUM7QUFBQSxTQUF0RTtBQUFBO0FBQUE7QUFBQTtBQUFBLFdBQStFO0FBQUEsSUFDL0UsdUJBQUMsU0FBSSxXQUFVLDhCQUNaM1YsaUJBQU91ZixPQUFPMWlCLGlDQUFpQyxFQUFFbU07QUFBQUEsTUFBSSxDQUFDekUsU0FDckQsdUJBQUMsWUFBTyxNQUFLLFVBQXVCLFVBQVUvQyxRQUFRd04sUUFBUSxXQUFXekssS0FBS3pFLE9BQU80RixNQUFNaVEsVUFBVSxnQkFBZ0IsSUFBSSxTQUFTLE1BQU13SixTQUFTNWEsS0FBS3pFLEVBQUUsR0FDdEo7QUFBQSwrQkFBQyxTQUFEO0FBQUE7QUFBQTtBQUFBO0FBQUEsZUFBRTtBQUFBLFFBQUcsdUJBQUMsVUFBSztBQUFBLGlDQUFDLFlBQVF5RSxlQUFLbkUsU0FBZDtBQUFBO0FBQUE7QUFBQTtBQUFBLGlCQUFvQjtBQUFBLFVBQVMsdUJBQUMsV0FBTTtBQUFBO0FBQUEsWUFBTW1FLEtBQUtpYjtBQUFBQSxZQUFLO0FBQUEsZUFBdkI7QUFBQTtBQUFBO0FBQUE7QUFBQSxpQkFBcUM7QUFBQSxhQUF4RTtBQUFBO0FBQUE7QUFBQTtBQUFBLGVBQWdGO0FBQUEsV0FENURqYixLQUFLekUsSUFBaEM7QUFBQTtBQUFBO0FBQUE7QUFBQSxhQUVBO0FBQUEsSUFDRCxLQUxIO0FBQUE7QUFBQTtBQUFBO0FBQUEsV0FNQTtBQUFBLElBQ0NvRixTQUFTa1YsV0FBVyx1QkFBQyxTQUFJLFdBQVUsb0JBQW1CO0FBQUEsNkJBQUMsVUFBSztBQUFBO0FBQUEsUUFBUWxWLFNBQVNrVixTQUFTaGE7QUFBQUEsV0FBaEM7QUFBQTtBQUFBO0FBQUE7QUFBQSxhQUFzQztBQUFBLE1BQU8sdUJBQUMsWUFBTyxNQUFLLFVBQVMsU0FBUyxNQUFNK0csTUFBTWtULFVBQVUsR0FBRyxzQkFBeEQ7QUFBQTtBQUFBO0FBQUE7QUFBQSxhQUE4RDtBQUFBLE1BQVMsdUJBQUMsWUFBTyxNQUFLLFVBQVMsV0FBVSxjQUFhLFNBQVMsTUFBTWxULE1BQU1xVCxTQUFTLEdBQUcscUJBQTlFO0FBQUE7QUFBQTtBQUFBO0FBQUEsYUFBbUY7QUFBQSxTQUF6TztBQUFBO0FBQUE7QUFBQTtBQUFBLFdBQWtQLElBQVM7QUFBQSxJQUNoUix1QkFBQyxhQUFRLE1BQUksTUFBQztBQUFBLDZCQUFDLGFBQVEsZ0NBQVQ7QUFBQTtBQUFBO0FBQUE7QUFBQSxhQUF5QjtBQUFBLE9BQ25DOEQsT0FBT2dCLGNBQWMsSUFBSXRXLElBQUksQ0FBQ25KLFlBQVksdUJBQUMsa0JBQWdDLE9BQU9BLFFBQVFPLE9BQU8sT0FBT3NGLE1BQU0wWixnQkFBZ0J2ZixRQUFRQyxFQUFFLEdBQUcsS0FBS0QsUUFBUVQsS0FBSyxLQUFLUyxRQUFRUixLQUFLLE1BQU1RLFFBQVFxSyxNQUFNLE1BQU1ySyxRQUFRdUssTUFBTSxVQUFVLENBQUNsTCxVQUFVeVksT0FBTyxVQUFVOVgsUUFBUU8sS0FBSyxJQUFJLENBQUNpSCxVQUFVO0FBQUVBLGNBQU0rWCxnQkFBZ0J2ZixRQUFRQyxFQUFFLElBQUlaO0FBQUFBLE1BQU8sR0FBRyxTQUFTc0MsUUFBUTFCLEVBQUUsSUFBSUQsUUFBUUMsRUFBRSxFQUFFLEtBQTdTRCxRQUFRQyxJQUE3QjtBQUFBO0FBQUE7QUFBQTtBQUFBLGFBQW9VLENBQUc7QUFBQSxNQUNuWCx1QkFBQyxTQUFJLFdBQVUsK0JBQThCO0FBQUEsK0JBQUMsWUFBTyxNQUFLLFVBQVMsU0FBUyxNQUFNNlgsT0FBTyxnQkFBZ0IsQ0FBQ3RRLFVBQVU7QUFBRUEsZ0JBQU1vWSxPQUFPdGdCLEtBQUt1Z0IsTUFBTXZnQixLQUFLd2dCLE9BQU8sSUFBSSxVQUFVO0FBQUEsUUFBRyxDQUFDLEdBQUcsc0JBQWxJO0FBQUE7QUFBQTtBQUFBO0FBQUEsZUFBd0k7QUFBQSxRQUFTLHVCQUFDLFVBQU1qYSxnQkFBTStaLFFBQWI7QUFBQTtBQUFBO0FBQUE7QUFBQSxlQUFrQjtBQUFBLFdBQWhOO0FBQUE7QUFBQTtBQUFBO0FBQUEsYUFBdU47QUFBQSxTQUZ6TjtBQUFBO0FBQUE7QUFBQTtBQUFBLFdBR0E7QUFBQSxJQUNBLHVCQUFDLGFBQVEsTUFBSSxNQUFDO0FBQUEsNkJBQUMsYUFBUSx5QkFBVDtBQUFBO0FBQUE7QUFBQTtBQUFBLGFBQWtCO0FBQUEsTUFDOUIsdUJBQUMsa0JBQWUsT0FBTSxxQkFBb0IsT0FBTy9aLE1BQU1rYSxpQkFBaUIsS0FBSyxLQUFLLEtBQUssSUFBSSxNQUFNLE1BQU0sTUFBSyxNQUFLLFVBQVUsQ0FBQzFnQixVQUFVeVksT0FBTyxjQUFjLENBQUN0USxVQUFVO0FBQUVBLGNBQU11WSxrQkFBa0IxZ0I7QUFBQUEsTUFBTyxHQUFHLFNBQVNzQyxRQUFRMUIsRUFBRSxXQUFXLEtBQXhPO0FBQUE7QUFBQTtBQUFBO0FBQUEsYUFBME87QUFBQSxNQUMxTyx1QkFBQyxrQkFBZSxPQUFNLFNBQVEsT0FBTzRGLE1BQU1tYSxVQUFVQyxPQUFPLEtBQUssS0FBSyxLQUFLLEdBQUcsTUFBTSxNQUFNLFVBQVUsQ0FBQzVnQixVQUFVeVksT0FBTyxlQUFlLENBQUN0USxVQUFVO0FBQUVBLGNBQU13WSxVQUFVQyxRQUFRNWdCO0FBQUFBLE1BQU8sR0FBRyxTQUFTc0MsUUFBUTFCLEVBQUUsUUFBUSxLQUEvTTtBQUFBO0FBQUE7QUFBQTtBQUFBLGFBQWlOO0FBQUEsU0FGbk47QUFBQTtBQUFBO0FBQUE7QUFBQSxXQUdBO0FBQUEsSUFDQSx1QkFBQyxhQUFRLE1BQUksTUFBQztBQUFBLDZCQUFDLGFBQVEsNkJBQVQ7QUFBQTtBQUFBO0FBQUE7QUFBQSxhQUFzQjtBQUFBLE1BQ2pDMmUsb0JBQW9CLG1DQUNuQjtBQUFBLCtCQUFDLE9BQUUsV0FBVSxxQkFBb0I7QUFBQTtBQUFBLFVBQXFJRixnQkFBZ0I1WixRQUFRLENBQUM7QUFBQSxVQUFFO0FBQUEsYUFBak07QUFBQTtBQUFBO0FBQUE7QUFBQSxlQUFrTTtBQUFBLFFBQ2xNLHVCQUFDLGtCQUFlLE9BQU0sU0FBUSxPQUFPZSxNQUFNRSxhQUFhVyxPQUFPLEtBQUssR0FBRyxLQUFLaVksZUFBZSxNQUFNLE1BQU8sTUFBSyxhQUFZLFVBQVUsQ0FBQ3RmLFVBQVV5WSxPQUFPLDJCQUEyQixDQUFDdFEsVUFBVTtBQUFFQSxnQkFBTXpCLGFBQWFXLFFBQVFwSCxLQUFLQyxJQUFJRixPQUFPbUksTUFBTXpCLGFBQWE2QixHQUFHO0FBQUEsUUFBRyxDQUFDLEtBQWxRO0FBQUE7QUFBQTtBQUFBO0FBQUEsZUFBb1E7QUFBQSxRQUNwUSx1QkFBQyxrQkFBZSxPQUFNLE9BQU0sT0FBTy9CLE1BQU1FLGFBQWE2QixLQUFLLEtBQUssR0FBRyxLQUFLK1csZUFBZSxNQUFNLE1BQU8sTUFBSyxhQUFZLFVBQVUsQ0FBQ3RmLFVBQVV5WSxPQUFPLHlCQUF5QixDQUFDdFEsVUFBVTtBQUFFQSxnQkFBTXpCLGFBQWE2QixNQUFNdEksS0FBS0UsSUFBSUgsT0FBT21JLE1BQU16QixhQUFhVyxLQUFLO0FBQUEsUUFBRyxDQUFDLEtBQTVQO0FBQUE7QUFBQTtBQUFBO0FBQUEsZUFBOFA7QUFBQSxRQUM5UCx1QkFBQyxZQUFTLE9BQU0sUUFBTyxpQ0FBQyxZQUFPLE9BQU9iLE1BQU1FLGFBQWFILE1BQU0sVUFBVSxDQUFDcUMsVUFBVTZQLE9BQU8sMEJBQTBCLENBQUN0USxVQUFVO0FBQUVBLGdCQUFNekIsYUFBYUgsT0FBT3FDLE1BQU05RyxPQUFPOUI7QUFBQUEsUUFBTyxDQUFDLEdBQUc7QUFBQSxpQ0FBQyxZQUFPLE9BQU0sU0FBUSxxQkFBdEI7QUFBQTtBQUFBO0FBQUE7QUFBQSxpQkFBMkI7QUFBQSxVQUFTLHVCQUFDLFlBQU8sT0FBTSxrQkFBaUIsOEJBQS9CO0FBQUE7QUFBQTtBQUFBO0FBQUEsaUJBQTZDO0FBQUEsVUFBUyx1QkFBQyxZQUFPLE9BQU0sYUFBWSx5QkFBMUI7QUFBQTtBQUFBO0FBQUE7QUFBQSxpQkFBbUM7QUFBQSxVQUFTLHVCQUFDLFlBQU8sT0FBTSxRQUFPLG9CQUFyQjtBQUFBO0FBQUE7QUFBQTtBQUFBLGlCQUF5QjtBQUFBLGFBQTVUO0FBQUE7QUFBQTtBQUFBO0FBQUEsZUFBcVUsS0FBNVY7QUFBQTtBQUFBO0FBQUE7QUFBQSxlQUFxVztBQUFBLFFBQ3JXLHVCQUFDLFlBQVMsT0FBTSxVQUFTLGlDQUFDLFlBQU8sT0FBT3dHLE1BQU1FLGFBQWFnWCxRQUFRLFVBQVUsQ0FBQzlVLFVBQVU2UCxPQUFPLDRCQUE0QixDQUFDdFEsVUFBVTtBQUFFQSxnQkFBTXpCLGFBQWFnWCxTQUFTOVUsTUFBTTlHLE9BQU85QjtBQUFBQSxRQUFPLENBQUMsR0FBRztBQUFBLGlDQUFDLFlBQU8sT0FBTSxVQUFTLHNCQUF2QjtBQUFBO0FBQUE7QUFBQTtBQUFBLGlCQUE2QjtBQUFBLFVBQVMsdUJBQUMsWUFBTyxPQUFNLGNBQWEsMEJBQTNCO0FBQUE7QUFBQTtBQUFBO0FBQUEsaUJBQXFDO0FBQUEsVUFBUyx1QkFBQyxZQUFPLE9BQU0sV0FBVSx1QkFBeEI7QUFBQTtBQUFBO0FBQUE7QUFBQSxpQkFBK0I7QUFBQSxVQUFTLHVCQUFDLFlBQU8sT0FBTSxZQUFXLHdCQUF6QjtBQUFBO0FBQUE7QUFBQTtBQUFBLGlCQUFpQztBQUFBLFVBQVMsdUJBQUMsWUFBTyxPQUFNLGVBQWMsMkJBQTVCO0FBQUE7QUFBQTtBQUFBO0FBQUEsaUJBQXVDO0FBQUEsVUFBUyx1QkFBQyxZQUFPLE9BQU0sUUFBTyxvQkFBckI7QUFBQTtBQUFBO0FBQUE7QUFBQSxpQkFBeUI7QUFBQSxhQUFsWjtBQUFBO0FBQUE7QUFBQTtBQUFBLGVBQTJaLEtBQXBiO0FBQUE7QUFBQTtBQUFBO0FBQUEsZUFBNmI7QUFBQSxRQUM3Yix1QkFBQyxPQUFFLFdBQVUscUJBQW9CO0FBQUE7QUFBQSxVQUFNMGYsYUFBYXhlLFNBQVM7QUFBQSxVQUFpQjtBQUFBLFVBQUlrZSxPQUFPbGUsU0FBU3NGLE1BQU1pUTtBQUFBQSxVQUFRO0FBQUEsYUFBaEg7QUFBQTtBQUFBO0FBQUE7QUFBQSxlQUFpSDtBQUFBLFFBQ2pILHVCQUFDLFlBQVMsT0FBTSxrQkFBaUIsaUNBQUMsWUFBTyxjQUFXLGtCQUFpQixPQUFPalEsTUFBTUUsYUFBYW1hLGdCQUFnQixVQUFVLENBQUNyQix1QkFBdUIsT0FBT0Esd0JBQXdCLDREQUE0RCxtRUFBbUUsVUFBVSxDQUFDNVcsVUFBVTZQLE9BQU8seUJBQXlCLENBQUN0USxVQUFVO0FBQUVBLGdCQUFNekIsYUFBYW1hLGlCQUFpQmpZLE1BQU05RyxPQUFPOUI7QUFBQUEsUUFBTyxDQUFDLEdBQUl6QywrQ0FBcUN1TSxJQUFJLENBQUNyRCxTQUFTLHVCQUFDLFlBQU8sT0FBT0EsTUFBa0J3WSxnQ0FBc0J4WSxJQUFJLEtBQUtBLFFBQXRDQSxNQUExQjtBQUFBO0FBQUE7QUFBQTtBQUFBLGVBQXFFLENBQVMsS0FBOWdCO0FBQUE7QUFBQTtBQUFBO0FBQUEsZUFBZ2hCLEtBQWpqQjtBQUFBO0FBQUE7QUFBQTtBQUFBLGVBQTBqQjtBQUFBLFFBQzFqQix1QkFBQyxPQUFFLFdBQVUscUJBQW9CLE1BQUssVUFBUyxhQUFVLFVBQVM7QUFBQTtBQUFBLFVBQWlCb1o7QUFBQUEsVUFBc0JGLFlBQVlSLGdCQUFnQmEsNEJBQTRCMWQsUUFBUTFCLE1BQU0wQyxPQUFPaUUsU0FBUzRYLGdCQUFnQjJCLHlCQUF5QixJQUFJLE1BQU03Z0IsS0FBSzJMLE1BQU11VCxlQUFlMkIsNEJBQTRCLEdBQUcsQ0FBQyxzQkFBc0I7QUFBQSxVQUFHO0FBQUEsYUFBclU7QUFBQTtBQUFBO0FBQUE7QUFBQSxlQUFzVTtBQUFBLFFBQ3RVLHVCQUFDLFlBQU8sTUFBSyxVQUFTLFdBQVUsdUJBQXNCLFNBQVMsTUFBTTdZLE1BQU1DLE9BQU8sMkJBQTJCLENBQUNDLFVBQVU7QUFDdEgsZ0JBQU1HLGFBQWFILE1BQU01RixTQUFTSCxZQUFZLEVBQUVvRSxNQUFNRTtBQUN0RDRCLHFCQUFXakIsUUFBUTtBQUNuQmlCLHFCQUFXQyxNQUFNO0FBQ2pCRCxxQkFBVy9CLE9BQU87QUFBQSxRQUNwQixHQUFHLEVBQUV2QixXQUFXLEVBQUV1QixNQUFNLFNBQVMxQixXQUFXdkMsUUFBUTFCLEdBQUcsRUFBRSxDQUFDLEdBQUcsMkNBTDdEO0FBQUE7QUFBQTtBQUFBO0FBQUEsZUFLd0Y7QUFBQSxXQWRyRTtBQUFBO0FBQUE7QUFBQTtBQUFBLGFBZXJCLElBQU0sbUNBQ0o7QUFBQSwrQkFBQyxPQUFFLFdBQVUscUJBQW9CLDJGQUFqQztBQUFBO0FBQUE7QUFBQTtBQUFBLGVBQTRHO0FBQUEsUUFDNUcsdUJBQUMsWUFBTyxNQUFLLFVBQVMsV0FBVSw0QkFBMkIsU0FBUyxNQUFNcUgsTUFBTUMsT0FBTyx3QkFBd0IsQ0FBQ0MsVUFBVTtBQUN4SCxnQkFBTUcsYUFBYUgsTUFBTTVGLFNBQVNILFlBQVksRUFBRW9FLE1BQU1FO0FBQ3RENEIscUJBQVdqQixRQUFRcEgsS0FBS0MsSUFBSSxNQUFNbWYsZUFBZTtBQUNqRC9XLHFCQUFXQyxNQUFNdEksS0FBS0MsSUFBSSxNQUFNbWYsZUFBZTtBQUMvQy9XLHFCQUFXL0IsT0FBTztBQUFBLFFBQ3BCLEdBQUcsRUFBRXZCLFdBQVcsRUFBRXVCLE1BQU0sU0FBUzFCLFdBQVd2QyxRQUFRMUIsR0FBRyxFQUFFLENBQUMsR0FBRyx3Q0FMN0Q7QUFBQTtBQUFBO0FBQUE7QUFBQSxlQUtxRjtBQUFBLFdBUGpGO0FBQUE7QUFBQTtBQUFBO0FBQUEsYUFRTjtBQUFBLFNBeEJGO0FBQUE7QUFBQTtBQUFBO0FBQUEsV0F5QkE7QUFBQSxJQUNBLHVCQUFDLGFBQVEsTUFBSSxNQUFDO0FBQUEsNkJBQUMsYUFBUSw4QkFBVDtBQUFBO0FBQUE7QUFBQTtBQUFBLGFBQXVCO0FBQUEsTUFDbEM0RixNQUFNdWEsVUFBVWpYLElBQUksQ0FBQ3pFLE1BQU0yYixrQkFBa0I7QUFDNUMsY0FBTUMsYUFBYXZqQixxQ0FBcUMySCxLQUFLekUsRUFBRTtBQUMvRCxjQUFNc2dCLGVBQWVBLENBQUNoWSxjQUFjdVAsT0FBTyxvQkFBb0IsQ0FBQ3RRLFVBQVU7QUFDeEUsZ0JBQU1nWixZQUFZSCxnQkFBZ0I5WDtBQUNsQyxjQUFJaVksWUFBWSxLQUFLQSxhQUFhaFosTUFBTTRZLFVBQVVuZSxPQUFRO0FBQzFELGdCQUFNLENBQUNxTyxLQUFLLElBQUk5SSxNQUFNNFksVUFBVTNZLE9BQU80WSxlQUFlLENBQUM7QUFDdkQ3WSxnQkFBTTRZLFVBQVUzWSxPQUFPK1ksV0FBVyxHQUFHbFEsS0FBSztBQUFBLFFBQzVDLENBQUM7QUFDRCxlQUFPLHVCQUFDLFNBQUksV0FBVSx5QkFBNEQ7QUFBQSxpQ0FBQyxTQUFJO0FBQUEsbUNBQUMsV0FBTTtBQUFBLHFDQUFDLFdBQU0sTUFBSyxZQUFXLFNBQVM1TCxLQUFLK2IsU0FBUyxVQUFVLENBQUN4WSxVQUFVNlAsT0FBTyxVQUFVd0ksWUFBWS9mLEtBQUssSUFBSSxDQUFDaUgsVUFBVTtBQUFFQSxzQkFBTTRZLFVBQVVDLGFBQWEsRUFBRUksVUFBVXhZLE1BQU05RyxPQUFPb1k7QUFBQUEsY0FBUyxDQUFDLEtBQXRMO0FBQUE7QUFBQTtBQUFBO0FBQUEscUJBQXdMO0FBQUEsY0FBSStHLFlBQVkvZixTQUFTbUUsS0FBS3pFO0FBQUFBLGlCQUE3TjtBQUFBO0FBQUE7QUFBQTtBQUFBLG1CQUFnTztBQUFBLFlBQVEsdUJBQUMsVUFBSztBQUFBLHFDQUFDLFlBQU8sTUFBSyxVQUFTLFVBQVVvZ0Isa0JBQWtCLEdBQUcsU0FBUyxNQUFNRSxhQUFhLEVBQUUsR0FBRyxjQUFXLG9CQUFtQixpQkFBcEg7QUFBQTtBQUFBO0FBQUE7QUFBQSxxQkFBcUg7QUFBQSxjQUFTLHVCQUFDLFlBQU8sTUFBSyxVQUFTLFVBQVVGLGtCQUFrQnhhLE1BQU11YSxVQUFVbmUsU0FBUyxHQUFHLFNBQVMsTUFBTXNlLGFBQWEsQ0FBQyxHQUFHLGNBQVcsc0JBQXFCLGlCQUE5STtBQUFBO0FBQUE7QUFBQTtBQUFBLHFCQUErSTtBQUFBLGNBQVM7QUFBQSxjQUFPRCxZQUFZWCxRQUFRO0FBQUEsaUJBQXZUO0FBQUE7QUFBQTtBQUFBO0FBQUEsbUJBQTJUO0FBQUEsZUFBeGlCO0FBQUE7QUFBQTtBQUFBO0FBQUEsaUJBQStpQjtBQUFBLFdBQVFXLFlBQVliLGNBQWMsSUFBSXRXLElBQUksQ0FBQ25KLFlBQVlBLFFBQVE0RixTQUFTLFVBQVUsdUJBQUMsa0JBQWdDLE9BQU81RixRQUFRTyxPQUFPLE9BQU9tRSxLQUFLK2EsV0FBV3pmLFFBQVFDLEVBQUUsR0FBRyxLQUFLRCxRQUFRVCxLQUFLLEtBQUtTLFFBQVFSLEtBQUssTUFBTVEsUUFBUXFLLE1BQU0sTUFBTXJLLFFBQVF1SyxNQUFNLFVBQVUsQ0FBQ2xMLFVBQVV5WSxPQUFPLFVBQVU5WCxRQUFRTyxLQUFLLElBQUksQ0FBQ2lILFVBQVU7QUFBRUEsa0JBQU00WSxVQUFVQyxhQUFhLEVBQUVaLFdBQVd6ZixRQUFRQyxFQUFFLElBQUlaO0FBQUFBLFVBQU8sR0FBRyxZQUFZc0MsUUFBUTFCLEVBQUUsSUFBSW9nQixhQUFhLElBQUlyZ0IsUUFBUUMsRUFBRSxFQUFFLEtBQS9VRCxRQUFRQyxJQUE3QjtBQUFBO0FBQUE7QUFBQTtBQUFBLGlCQUFzVyxJQUFNLHVCQUFDLFlBQTBCLE9BQU9ELFFBQVFPLE9BQU8saUNBQUMsWUFBTyxPQUFPbUUsS0FBSythLFdBQVd6ZixRQUFRQyxFQUFFLEdBQUcsVUFBVSxDQUFDZ0ksVUFBVTZQLE9BQU8sVUFBVTlYLFFBQVFPLEtBQUssSUFBSSxDQUFDaUgsVUFBVTtBQUFFQSxrQkFBTTRZLFVBQVVDLGFBQWEsRUFBRVosV0FBV3pmLFFBQVFDLEVBQUUsSUFBSWdJLE1BQU05RyxPQUFPOUI7QUFBQUEsVUFBTyxDQUFDLEdBQUlXLGtCQUFRMGdCLFFBQVF2WCxJQUFJLENBQUN3WCxXQUFXLHVCQUFDLFlBQXFCQSxvQkFBVEEsUUFBYjtBQUFBO0FBQUE7QUFBQTtBQUFBLGlCQUE2QixDQUFTLEtBQXZRO0FBQUE7QUFBQTtBQUFBO0FBQUEsaUJBQXlRLEtBQTNTM2dCLFFBQVFDLElBQXZCO0FBQUE7QUFBQTtBQUFBO0FBQUEsaUJBQW1VLENBQVc7QUFBQSxhQUExMUMsR0FBR3lFLEtBQUt6RSxFQUFFLElBQUlvZ0IsYUFBYSxJQUF2RTtBQUFBO0FBQUE7QUFBQTtBQUFBLGVBQXc0QztBQUFBLE1BQ2o1QyxDQUFDO0FBQUEsU0FWSDtBQUFBO0FBQUE7QUFBQTtBQUFBLFdBV0E7QUFBQSxPQXZERjtBQUFBO0FBQUE7QUFBQTtBQUFBLFNBd0RBO0FBRUo7QUFBQ08sT0E3RlFyQztBQStGVCxTQUFTc0MsWUFBWSxFQUFFQyxZQUFZLEdBQUc7QUFDcEMsTUFBSSxDQUFDQSxZQUFZN2UsT0FBUSxRQUFPLHVCQUFDLFNBQUksV0FBVSxxQ0FBb0M7QUFBQSwyQkFBQyxTQUFNLGVBQVksVUFBbkI7QUFBQTtBQUFBO0FBQUE7QUFBQSxXQUF5QjtBQUFBLElBQUc7QUFBQSxPQUEvRTtBQUFBO0FBQUE7QUFBQTtBQUFBLFNBQThGO0FBQzlILFNBQU8sdUJBQUMsU0FBSSxXQUFVLDRCQUE0QjZlLHNCQUFZM1gsSUFBSSxDQUFDekUsTUFBTTVELFVBQVU7QUFDakYsVUFBTWlnQixpQkFBaUJyYyxLQUFLc2MsVUFBVSxVQUFVOWtCLGNBQWNFO0FBQzlELFdBQU8sdUJBQUMsU0FBK0MsV0FBVyxNQUFNc0ksS0FBS3NjLEtBQUssSUFBSTtBQUFBLDZCQUFDLGtCQUFlLGVBQVksVUFBNUI7QUFBQTtBQUFBO0FBQUE7QUFBQSxhQUFrQztBQUFBLE1BQUcsdUJBQUMsVUFBSztBQUFBLCtCQUFDLFlBQVF0YyxlQUFLMEMsV0FBZDtBQUFBO0FBQUE7QUFBQTtBQUFBLGVBQXNCO0FBQUEsUUFBUyx1QkFBQyxXQUFPMUMsZUFBS3VjLFFBQWI7QUFBQTtBQUFBO0FBQUE7QUFBQSxlQUFrQjtBQUFBLFdBQXZEO0FBQUE7QUFBQTtBQUFBO0FBQUEsYUFBK0Q7QUFBQSxTQUF6SyxHQUFHdmMsS0FBSzZSLElBQUksSUFBSTdSLEtBQUt1YyxJQUFJLElBQUluZ0IsS0FBSyxJQUE1QztBQUFBO0FBQUE7QUFBQTtBQUFBLFdBQTBMO0FBQUEsRUFDbk0sQ0FBQyxLQUhNO0FBQUE7QUFBQTtBQUFBO0FBQUEsU0FHSjtBQUNMO0FBQUNvZ0IsT0FOUUw7QUFRVCxTQUFTTSxpQkFBaUIsRUFBRTdaLE9BQU9qQyxTQUFTLEdBQUc7QUFBQStiLE1BQUE7QUFDN0MsUUFBTSxDQUFDQyxXQUFXQyxZQUFZLElBQUk1bEIsU0FBUyxJQUFJO0FBQy9DLFFBQU0sQ0FBQzZsQixZQUFZQyxhQUFhLElBQUk5bEIsU0FBUyxJQUFJO0FBQ2pELFFBQU11VSxVQUFVMVIsa0NBQWtDOEcsU0FBU2hCLFNBQVM7QUFDcEUsUUFBTWpELFNBQVNpRSxTQUFTaEIsVUFBVXVCLFNBQVMsUUFDdkMsRUFBRUEsTUFBTSxhQUFhMUIsV0FBV21CLFNBQVNoQixVQUFVSCxXQUFXK0wsU0FBU2tCLFNBQVM5TCxTQUFTaEIsVUFBVSxJQUNuRyxDQUFDLFdBQVcsU0FBUyxZQUFZLEVBQUU2UyxTQUFTN1IsU0FBU2hCLFVBQVV1QixJQUFJLElBQ2pFUCxTQUFTaEIsWUFDVDtBQUNOLE1BQUksQ0FBQ2pELE9BQVEsUUFBTztBQUNwQixRQUFNcWdCLFFBQVF4akIsOEJBQThCO0FBQUEsSUFDMUN1RCxVQUFVNkQsU0FBUzdEO0FBQUFBLElBQ25CK0MsTUFBTWMsU0FBU0M7QUFBQUEsSUFDZmxFO0FBQUFBLElBQ0FpZ0I7QUFBQUEsSUFDQUU7QUFBQUEsRUFDRixDQUFDO0FBQ0QsUUFBTUcsU0FBU0QsTUFBTTlTLFNBQ2hCdEosU0FBU29ELFVBQVVrWixNQUFNQyxlQUFlSCxNQUFNRyxjQUM5Q3ZjLFNBQVNvRCxVQUFVa1osTUFBTUUsYUFBYUosTUFBTUk7QUFDakQsUUFBTUMsU0FBU0EsTUFBTTtBQUNuQixRQUFJSixRQUFRO0FBQ1ZwYSxZQUFNYSxhQUFhLEVBQUVDLE9BQU8sWUFBWUMsU0FBUyxPQUFPc1osTUFBTSxLQUFLLENBQUM7QUFDcEU7QUFBQSxJQUNGO0FBQ0EsUUFBSSxDQUFDRixNQUFNOVMsTUFBTztBQUNsQnJILFVBQU1hLGFBQWE7QUFBQSxNQUNqQkMsT0FBTztBQUFBLE1BQ1BDLFNBQVM7QUFBQSxNQUNUc0QsYUFBYTtBQUFBLE1BQ2JuSCxTQUFTaWQsTUFBTTljO0FBQUFBLE1BQ2ZnZCxNQUFNRjtBQUFBQSxJQUNSLENBQUM7QUFBQSxFQUNIO0FBQ0EsU0FDRSx1QkFBQyxhQUFRLFdBQVUseUJBQ2pCO0FBQUEsMkJBQUMsYUFBUSxpQ0FBVDtBQUFBO0FBQUE7QUFBQTtBQUFBLFdBQTBCO0FBQUEsSUFDMUIsdUJBQUMsU0FBSSxXQUFVLCtCQUNiO0FBQUEsNkJBQUMsWUFBUyxPQUFNLFlBQVcsaUNBQUMsV0FBTSxNQUFLLFVBQVMsS0FBSSxLQUFJLEtBQUksS0FBSSxNQUFLLFFBQU8sT0FBT0osV0FBVyxVQUFVLENBQUNwWixVQUFVcVosYUFBYWhpQixLQUFLRSxJQUFJLEdBQUdtRCxPQUFPc0YsTUFBTTlHLE9BQU85QixLQUFLLEtBQUssQ0FBQyxDQUFDLEtBQWpKO0FBQUE7QUFBQTtBQUFBO0FBQUEsYUFBbUosS0FBOUs7QUFBQTtBQUFBO0FBQUE7QUFBQSxhQUFpTDtBQUFBLE1BQ2pMLHVCQUFDLFlBQVMsT0FBTSxhQUFZLGlDQUFDLFdBQU0sTUFBSyxVQUFTLEtBQUksS0FBSSxLQUFJLEtBQUksTUFBSyxRQUFPLE9BQU9raUIsWUFBWSxVQUFVLENBQUN0WixVQUFVdVosY0FBY2xpQixLQUFLRSxJQUFJLEdBQUdtRCxPQUFPc0YsTUFBTTlHLE9BQU85QixLQUFLLEtBQUssQ0FBQyxDQUFDLEtBQW5KO0FBQUE7QUFBQTtBQUFBO0FBQUEsYUFBcUosS0FBakw7QUFBQTtBQUFBO0FBQUE7QUFBQSxhQUFvTDtBQUFBLFNBRnRMO0FBQUE7QUFBQTtBQUFBO0FBQUEsV0FHQTtBQUFBLElBQ0NvaUIsTUFBTTlTLFFBQVEsdUJBQUMsT0FBRSxXQUFVLHFCQUFxQjlKO0FBQUFBLGVBQVM0YyxNQUFNOWMsT0FBTztBQUFBLE1BQUU7QUFBQSxNQUFJRSxTQUFTNGMsTUFBTU0sS0FBSztBQUFBLE1BQUU7QUFBQSxTQUFwRjtBQUFBO0FBQUE7QUFBQTtBQUFBLFdBQXNJLElBQU8sdUJBQUMsT0FBRSxXQUFVLHdDQUF3Q04sZ0JBQU03UyxVQUEzRDtBQUFBO0FBQUE7QUFBQTtBQUFBLFdBQWtFO0FBQUEsSUFDOU4sdUJBQUMsWUFBTyxNQUFLLFVBQVMsV0FBVzhTLFNBQVMsdUNBQXVDLDRCQUE0QixVQUFVLENBQUNELE1BQU05UyxPQUFPLFNBQVNtVCxRQUFTSixtQkFBUyxrQkFBa0IseUJBQWxMO0FBQUE7QUFBQTtBQUFBO0FBQUEsV0FBd007QUFBQSxPQVAxTTtBQUFBO0FBQUE7QUFBQTtBQUFBLFNBUUE7QUFFSjtBQUFDTixJQTdDUUQsa0JBQWdCO0FBQUEsT0FBaEJBO0FBK0NULFNBQVNhLFVBQVUsRUFBRTFhLE9BQU9qQyxVQUFVaEQsY0FBY21jLGdCQUFnQjVFLFdBQVdDLGFBQWEsR0FBRztBQUFBb0ksTUFBQTtBQUM3RixRQUFNQyxlQUFlem1CLE9BQU8sSUFBSTtBQUNoQyxRQUFNMG1CLFVBQVUxbUIsT0FBTyxJQUFJO0FBQzNCLFFBQU0ybUIscUJBQXFCM21CLE9BQU8sSUFBSTtBQUN0QyxRQUFNLENBQUMrSCxVQUFVNmUsV0FBVyxJQUFJM21CLFNBQVMsSUFBSTtBQUM3QyxRQUFNLENBQUM0bUIsVUFBVUMsV0FBVyxJQUFJN21CLFNBQVMsS0FBSztBQUM5QyxRQUFNaUcsVUFBVXlDLFdBQVdpQixTQUFTN0QsVUFBVTZELFNBQVNoQixTQUFTO0FBQ2hFLE1BQUltZSxVQUFVLHVCQUFDLG9CQUFpQixPQUFjLFVBQW9CLFdBQXBEO0FBQUE7QUFBQTtBQUFBO0FBQUEsU0FBcUU7QUFDbkYsTUFBSW5kLFNBQVNoQixVQUFVdUIsU0FBUyxXQUFZNGMsV0FBVSx1QkFBQyxxQkFBa0IsT0FBYyxZQUFqQztBQUFBO0FBQUE7QUFBQTtBQUFBLFNBQW9EO0FBQzFHLE1BQUluZCxTQUFTaEIsVUFBVXVCLFNBQVMsTUFBTzRjLFdBQVUsdUJBQUMsZ0JBQWEsT0FBYyxVQUFvQixTQUFrQixXQUFzQixnQkFBeEY7QUFBQTtBQUFBO0FBQUE7QUFBQSxTQUFtSDtBQUNwSyxNQUFJbmQsU0FBU2hCLFVBQVV1QixTQUFTLG9CQUFxQjRjLFdBQVUsdUJBQUMsNkJBQTBCLE9BQWMsVUFBb0IsV0FBN0Q7QUFBQTtBQUFBO0FBQUE7QUFBQSxTQUE4RTtBQUM3SSxNQUFJbmQsU0FBU2hCLFVBQVV1QixTQUFTLGFBQWM0YyxXQUFVLHVCQUFDLG1CQUFnQixPQUFjLFVBQW9CLFdBQW5EO0FBQUE7QUFBQTtBQUFBO0FBQUEsU0FBb0U7QUFDNUgsTUFBSW5kLFNBQVNoQixVQUFVdUIsU0FBUyxRQUFTNGMsV0FBVSx1QkFBQyxrQkFBZSxPQUFjLFVBQW9CLFNBQWtCLGtCQUFwRTtBQUFBO0FBQUE7QUFBQTtBQUFBLFNBQW1HO0FBQ3RKLE1BQUluZCxTQUFTaEIsVUFBVXVCLFNBQVMsY0FBZTRjLFdBQVUsdUJBQUMsb0JBQWlCLE9BQWMsVUFBb0IsV0FBcEQ7QUFBQTtBQUFBO0FBQUE7QUFBQSxTQUFxRTtBQUU5SGhuQixZQUFVLE1BQU07QUFDZCxVQUFNaW5CLGVBQWVBLE1BQU07QUFDekIsVUFBSXRmLE9BQU9PLGFBQWEsS0FBSztBQUMzQjJlLG9CQUFZLElBQUk7QUFDaEI7QUFBQSxNQUNGO0FBQ0FBO0FBQUFBLFFBQVksQ0FBQ2pWLFlBQ1hBLFdBQVc4VSxhQUFhOVUsVUFDcEI3Six1QkFBdUIyZSxhQUFhOVUsU0FBU0EsU0FBUy9LLFlBQVksSUFDbEUrSztBQUFBQSxNQUNMO0FBQUEsSUFDSDtBQUNBcVYsaUJBQWE7QUFDYnRmLFdBQU91ZixpQkFBaUIsVUFBVUQsWUFBWTtBQUM5QyxXQUFPLE1BQU10ZixPQUFPd2Ysb0JBQW9CLFVBQVVGLFlBQVk7QUFBQSxFQUNoRSxHQUFHLENBQUNwZ0IsWUFBWSxDQUFDO0FBRWpCLFFBQU11Z0IsWUFBWUEsQ0FBQzNhLFVBQVU7QUFDM0IsUUFBSUEsTUFBTW1ILFdBQVcsS0FBS2pNLE9BQU9PLGFBQWEsT0FBTyxDQUFDdUUsTUFBTTlHLE9BQU9vQixRQUFRLFFBQVEsRUFBRztBQUN0RixVQUFNSCxZQUFZOGYsYUFBYTlVO0FBQy9CLFFBQUksQ0FBQ2hMLFVBQVc7QUFDaEIsVUFBTTBMLE9BQU8xTCxVQUFVYSxzQkFBc0I7QUFDN0MsVUFBTSxFQUFFSSxRQUFRQyxVQUFVLElBQUluQiwyQkFBMkJDLFdBQVdDLFlBQVk7QUFDaEYsVUFBTXVCLGtCQUFrQk4sWUFBWUQ7QUFDcEMsVUFBTXdmLGlCQUFpQnZqQixLQUFLQyxJQUFJdU8sS0FBS2pLLFFBQVEsS0FBS3ZFLEtBQUtFLElBQUksS0FBS29FLGtCQUFrQixJQUFJLENBQUM7QUFDdkYsVUFBTThDLFFBQVFuRCx1QkFBdUJuQixXQUFXO0FBQUEsTUFDOUM0QixNQUFNOEosS0FBSzlKO0FBQUFBLE1BQ1hkLEtBQUs0SyxLQUFLNUs7QUFBQUEsTUFDVlMsT0FBT21LLEtBQUtuSztBQUFBQSxNQUNaRSxRQUFRZ2Y7QUFBQUEsSUFDVixHQUFHeGdCLFlBQVk7QUFDZjhmLFlBQVEvVSxVQUFVO0FBQUEsTUFDaEJzQyxXQUFXekgsTUFBTXlIO0FBQUFBLE1BQ2pCb1QsU0FBUzdhLE1BQU0rRjtBQUFBQSxNQUNmK1UsU0FBUzlhLE1BQU11TDtBQUFBQSxNQUNmOU07QUFBQUEsTUFDQTRKLE9BQU87QUFBQSxJQUNUO0FBQ0FsTyxjQUFVcU4sa0JBQWtCeEgsTUFBTXlILFNBQVM7QUFBQSxFQUM3QztBQUVBLFFBQU1zVCxXQUFXQSxDQUFDL2EsVUFBVTtBQUMxQixVQUFNNkcsT0FBT3FULFFBQVEvVTtBQUNyQixVQUFNaEwsWUFBWThmLGFBQWE5VTtBQUMvQixRQUFJLENBQUMwQixRQUFRLENBQUMxTSxhQUFhME0sS0FBS1ksY0FBY3pILE1BQU15SCxVQUFXO0FBQy9ELFVBQU11VCxTQUFTaGIsTUFBTStGLFVBQVVjLEtBQUtnVTtBQUNwQyxVQUFNdFUsU0FBU3ZHLE1BQU11TCxVQUFVMUUsS0FBS2lVO0FBQ3BDLFFBQUksQ0FBQ2pVLEtBQUt3QixTQUFTaFIsS0FBSzRqQixNQUFNRCxRQUFRelUsTUFBTSxJQUFJLEVBQUc7QUFDbkRNLFNBQUt3QixRQUFRO0FBQ2JpUyxnQkFBWSxJQUFJO0FBQ2hCRixnQkFBWTllLHVCQUF1Qm5CLFdBQVc7QUFBQSxNQUM1QyxHQUFHME0sS0FBS3BJO0FBQUFBLE1BQ1IxQyxNQUFNOEssS0FBS3BJLE1BQU0xQyxPQUFPaWY7QUFBQUEsTUFDeEIvZixLQUFLNEwsS0FBS3BJLE1BQU14RCxNQUFNc0w7QUFBQUEsSUFDeEIsR0FBR25NLFlBQVksQ0FBQztBQUFBLEVBQ2xCO0FBRUEsUUFBTThnQixVQUFVQSxDQUFDbGIsVUFBVTtBQUN6QixVQUFNNkcsT0FBT3FULFFBQVEvVTtBQUNyQixRQUFJMEIsTUFBTVksY0FBY3pILE1BQU15SCxVQUFXO0FBQ3pDLFFBQUksQ0FBQ1osS0FBS3dCLE9BQU87QUFDZixZQUFNOFMsTUFBTUMsWUFBWUQsSUFBSTtBQUM1QixZQUFNRSxXQUFXbEIsbUJBQW1CaFY7QUFDcEMsVUFBSWtXLFlBQVlGLE1BQU1FLFNBQVNDLE9BQU8sT0FDakNqa0IsS0FBSzRqQixNQUFNamIsTUFBTStGLFVBQVVzVixTQUFTRSxHQUFHdmIsTUFBTXVMLFVBQVU4UCxTQUFTRyxDQUFDLElBQUksR0FBRztBQUMzRXBCLG9CQUFZLElBQUk7QUFDaEJELDJCQUFtQmhWLFVBQVU7QUFBQSxNQUMvQixPQUFPO0FBQ0xnViwyQkFBbUJoVixVQUFVLEVBQUVtVyxNQUFNSCxLQUFLSSxHQUFHdmIsTUFBTStGLFNBQVN5VixHQUFHeGIsTUFBTXVMLFFBQVE7QUFBQSxNQUMvRTtBQUFBLElBQ0Y7QUFDQTJPLFlBQVEvVSxVQUFVO0FBQ2xCbVYsZ0JBQVksS0FBSztBQUNqQixRQUFJTCxhQUFhOVUsU0FBU29FLGtCQUFrQnZKLE1BQU15SCxTQUFTLEdBQUc7QUFDNUR3UyxtQkFBYTlVLFFBQVFxRSxzQkFBc0J4SixNQUFNeUgsU0FBUztBQUFBLElBQzVEO0FBQUEsRUFDRjtBQUVBLFFBQU1nVSxnQkFBZ0JBLE1BQU1yQixZQUFZLElBQUk7QUFFNUMsU0FDRTtBQUFBLElBQUM7QUFBQTtBQUFBLE1BQ0MsS0FBS0g7QUFBQUEsTUFDTCxXQUFXLHlCQUF5QkksV0FBVyxpQkFBaUIsRUFBRTtBQUFBLE1BQ2xFLGlCQUFlOWUsV0FBVyxTQUFTO0FBQUEsTUFDbkMsT0FBT0EsV0FBVztBQUFBLFFBQ2hCUSxNQUFNUixTQUFTUTtBQUFBQSxRQUNmZCxLQUFLTSxTQUFTTjtBQUFBQSxRQUNkNFEsT0FBTztBQUFBLFFBQ1BDLFFBQVE7QUFBQSxRQUNScFEsT0FBT0gsU0FBU0c7QUFBQUEsUUFDaEJFLFFBQVFMLFNBQVNLO0FBQUFBLE1BQ25CLElBQUlnUztBQUFBQSxNQUNKLGVBQWUrTTtBQUFBQSxNQUNmLGVBQWVJO0FBQUFBLE1BQ2YsYUFBYUc7QUFBQUEsTUFDYixpQkFBaUJBO0FBQUFBLE1BQ2pCLGVBQWVPO0FBQUFBLE1BQ2hCLGlDQUFDLFNBQUksV0FBVSxpQ0FBaUNsQjtBQUFBQTtBQUFBQSxRQUFRLHVCQUFDLG9CQUFpQixPQUFjLFlBQWhDO0FBQUE7QUFBQTtBQUFBO0FBQUEsZUFBbUQ7QUFBQSxRQUFHLHVCQUFDLGVBQVksYUFBYW5kLFNBQVN5YixlQUFuQztBQUFBO0FBQUE7QUFBQTtBQUFBLGVBQStDO0FBQUEsV0FBN0o7QUFBQTtBQUFBO0FBQUE7QUFBQSxhQUFnSztBQUFBO0FBQUEsSUFqQmpLO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQSxFQWlCdUs7QUFFM0s7QUFBQ21CLElBbkhRRCxXQUFTO0FBQUEsT0FBVEE7QUFxSFQsU0FBUzJCLGtCQUFrQixFQUFFdGUsU0FBUyxHQUFHO0FBQ3ZDLFFBQU16RCxXQUFXeUQsU0FBU0MsY0FBYzFELFlBQVk7QUFDcEQsUUFBTWdpQixRQUFRdmUsU0FBU0MsY0FBYytGLGNBQWM7QUFDbkQsU0FDRSx1QkFBQyxTQUFJLFdBQVUsNkJBQTRCLGNBQVcsdUJBQ3BEO0FBQUEsMkJBQUMsU0FBSTtBQUFBLDZCQUFDLFlBQU8sdUNBQVI7QUFBQTtBQUFBO0FBQUE7QUFBQSxhQUErQjtBQUFBLE1BQVMsdUJBQUMsVUFBTXhHO0FBQUFBLGlCQUFTUSxTQUFTb0QsVUFBVWpFLE9BQU87QUFBQSxRQUFFO0FBQUEsUUFBSUssU0FBUytlLEtBQUs7QUFBQSxXQUE5RDtBQUFBO0FBQUE7QUFBQTtBQUFBLGFBQWdFO0FBQUEsU0FBN0c7QUFBQTtBQUFBO0FBQUE7QUFBQSxXQUFvSDtBQUFBLElBQ3BILHVCQUFDLFNBQUksU0FBUSxlQUFjLE1BQUssT0FBTSxjQUFXLGdEQUMvQztBQUFBLDZCQUFDLFVBQUssR0FBRSxpQkFBUjtBQUFBO0FBQUE7QUFBQTtBQUFBLGFBQXFCO0FBQUEsTUFDcEJoaUIsU0FBU3VILElBQUksQ0FBQ3hILFlBQVk7QUFDekIsY0FBTTZoQixJQUFJLEtBQU83aEIsUUFBUWdELFVBQVVpZixRQUFTO0FBQzVDLGVBQU8sdUJBQUMsT0FBbUIsV0FBVyxhQUFhSixDQUFDLFFBQVE7QUFBQSxpQ0FBQyxVQUFLLElBQUcsT0FBTSxJQUFHLFFBQWxCO0FBQUE7QUFBQTtBQUFBO0FBQUEsaUJBQXNCO0FBQUEsVUFBRyx1QkFBQyxZQUFPLEdBQUc3aEIsUUFBUWtpQixZQUFZQyxlQUFlLElBQUksS0FBbEQ7QUFBQTtBQUFBO0FBQUE7QUFBQSxpQkFBb0Q7QUFBQSxVQUFHLHVCQUFDLFdBQU9uaUI7QUFBQUEsb0JBQVFwQjtBQUFBQSxZQUFPb0IsUUFBUWtpQixZQUFZQyxlQUFlLE1BQU1uaUIsUUFBUWtpQixXQUFXRSxZQUFZak8sT0FBTyxLQUFLO0FBQUEsZUFBM0c7QUFBQTtBQUFBO0FBQUE7QUFBQSxpQkFBOEc7QUFBQSxhQUEzT25VLFFBQVExQixJQUFoQjtBQUFBO0FBQUE7QUFBQTtBQUFBLGVBQTJQO0FBQUEsTUFDcFEsQ0FBQztBQUFBLE1BQ0QsdUJBQUMsT0FBRSxXQUFVLGVBQWMsV0FBVyxhQUFhLEtBQU9vRixTQUFTb0QsVUFBVWpFLFVBQVVvZixRQUFTLEdBQUksUUFBUTtBQUFBLCtCQUFDLFVBQUssR0FBRSx5QkFBUjtBQUFBO0FBQUE7QUFBQTtBQUFBLGVBQTZCO0FBQUEsUUFBRyx1QkFBQyxVQUFLLElBQUcsT0FBTSxJQUFHLFFBQWxCO0FBQUE7QUFBQTtBQUFBO0FBQUEsZUFBc0I7QUFBQSxXQUFsSztBQUFBO0FBQUE7QUFBQTtBQUFBLGFBQXFLO0FBQUEsU0FOdks7QUFBQTtBQUFBO0FBQUE7QUFBQSxXQU9BO0FBQUEsSUFDQSx1QkFBQyxXQUFNLG9IQUFQO0FBQUE7QUFBQTtBQUFBO0FBQUEsV0FBMkc7QUFBQSxPQVY3RztBQUFBO0FBQUE7QUFBQTtBQUFBLFNBV0E7QUFFSjtBQUFDSSxPQWpCUUw7QUFtQlQsd0JBQXdCTSxxQkFBcUIsRUFBRTNjLE9BQU80YyxZQUFZQyxRQUFRLEdBQUc7QUFBQUMsTUFBQTtBQUMzRSxRQUFNL2UsV0FBVzFKLHFCQUFxQjJMLE1BQU0rYyxXQUFXL2MsTUFBTW9ILFdBQVc7QUFDeEUsUUFBTSxDQUFDNFYsYUFBYUMsY0FBYyxJQUFJN29CLFNBQVMsTUFBTTBCLDhCQUE4QixDQUFDO0FBQ3BGLFFBQU0sQ0FBQ3djLFdBQVdDLFlBQVksSUFBSW5lLFNBQVMsSUFBSTtBQUMvQyxRQUFNLENBQUM4aUIsZ0JBQWdCZ0csaUJBQWlCLElBQUk5b0IsU0FBUyxJQUFJO0FBQ3pELFFBQU0sQ0FBQytvQixhQUFhQyxjQUFjLElBQUlocEIsU0FBUyxLQUFLO0FBQ3BELFFBQU0sQ0FBQ2lwQixjQUFjQyxlQUFlLElBQUlscEIsU0FBUyxLQUFLO0FBQ3RELFFBQU0sQ0FBQ21wQixZQUFZQyxhQUFhLElBQUlwcEIsU0FBUyxVQUFVO0FBQ3ZELFFBQU0sQ0FBQzJHLGNBQWMwaUIsZUFBZSxJQUFJcnBCO0FBQUFBLElBQVMsTUFDL0N5SCxPQUFPNmhCLGFBQWFDLFFBQVF4bEIsaUNBQWlDLE1BQU07QUFBQSxFQUNwRTtBQUNELFFBQU15bEIsWUFBWXpwQixPQUFPLElBQUk7QUFDN0IsUUFBTTBwQixjQUFjMXBCLE9BQU80SixRQUFRO0FBQ25DLFFBQU0rZixrQkFBa0IvZixTQUFTaEI7QUFFakM3SSxZQUFVLE1BQU07QUFDZDJwQixnQkFBWS9YLFVBQVUvSDtBQUFBQSxFQUN4QixHQUFHLENBQUNBLFFBQVEsQ0FBQztBQUViN0osWUFBVSxNQUFNO0FBQ2QySCxXQUFPNmhCLGFBQWFLLFFBQVE1bEIsbUNBQW1DNEMsZUFBZSxTQUFTLFFBQVE7QUFBQSxFQUNqRyxHQUFHLENBQUNBLFlBQVksQ0FBQztBQUVqQjdHLFlBQVUsTUFBTTtBQUNkLFVBQU04cEIsT0FBT25CLFFBQVEvVztBQUNyQixVQUFNbVksVUFBVXJCLFdBQVc5VztBQUMzQmtZLFVBQU1FLGFBQWEsc0JBQXNCLE1BQU07QUFDL0Nyb0IsNkJBQXlCLEVBQUVzb0IsS0FBSyxDQUFDLEVBQUVqa0IscUJBQVVra0IsS0FBSyxNQUFNO0FBQ3RELFlBQU10WSxVQUFVOUYsTUFBTW9ILFlBQVk7QUFDbEMsVUFBSSxDQUFDdEIsUUFBUXVZLE1BQU9yZSxPQUFNc2UsZ0JBQWdCLDRCQUE0QnBrQixTQUFRO0FBQzlFOEYsWUFBTXVlLFlBQVlya0IsV0FBVWtrQixJQUFJO0FBQ2hDLFlBQU1JLFdBQVd6b0IsZ0NBQWdDO0FBQ2pELFVBQUl5b0IsWUFBWUEsU0FBU0MsWUFBWUMsS0FBSzVDLElBQUksSUFBSyxLQUFLLE9BQVc7QUFDakU5YixjQUFNMmUsaUJBQWlCLEVBQUVDLFdBQVcsTUFBTTFlLE9BQU9zZSxVQUFVSyxPQUFPLEdBQUcsQ0FBQztBQUFBLE1BQ3hFO0FBQUEsSUFDRixDQUFDLEVBQUVDLE1BQU0sQ0FBQ0QsVUFBVTdlLE1BQU1TLGFBQWEsRUFBRXNlLFFBQVEsVUFBVWpmLFNBQVMrZSxNQUFNL2UsUUFBUSxDQUFDLENBQUM7QUFDcEYsV0FBTyxNQUFNO0FBQ1hrZSxZQUFNZ0IsZ0JBQWdCLG9CQUFvQjtBQUMxQ2YsZUFBU1gsa0JBQWtCLEtBQUs7QUFBQSxJQUNsQztBQUFBLEVBQ0YsR0FBRyxDQUFDVCxTQUFTRCxZQUFZNWMsS0FBSyxDQUFDO0FBRS9COUwsWUFBVSxNQUFNO0FBQ2QsVUFBTThwQixPQUFPbkIsUUFBUS9XO0FBQ3JCLFFBQUksQ0FBQ2tZLEtBQU0sUUFBT3pQO0FBQ2xCeVAsU0FBS3BSLGlCQUFpQixxQkFBcUIsRUFBRTFPLFFBQVEsQ0FBQzRPLFNBQVNBLEtBQUttUyxVQUFVOUssT0FBTyxvQkFBb0IsQ0FBQztBQUMxR2xkLHNDQUFrQzZtQixlQUFlLEVBQUU1ZixRQUFRLENBQUN1SyxXQUFXO0FBQ3JFdVYsV0FBS3RpQixjQUFjLG1CQUFtQndqQixJQUFJQyxPQUFPMVcsT0FBT3ZKLEtBQUssQ0FBQyxJQUFJLEdBQUcrZixVQUFVRyxJQUFJLG9CQUFvQjtBQUFBLElBQ3pHLENBQUM7QUFDRHBCLFNBQUtoUixRQUFRcVMsc0JBQXNCdkIsZ0JBQWdCeGYsUUFBUTtBQUMzRCxXQUFPLE1BQU07QUFDWDBmLFdBQUtwUixpQkFBaUIscUJBQXFCLEVBQUUxTyxRQUFRLENBQUM0TyxTQUFTQSxLQUFLbVMsVUFBVTlLLE9BQU8sb0JBQW9CLENBQUM7QUFDMUcsYUFBTzZKLEtBQUtoUixRQUFRcVM7QUFBQUEsSUFDdEI7QUFBQSxFQUNGLEdBQUcsQ0FBQ3ZCLGlCQUFpQmpCLE9BQU8sQ0FBQztBQUU3QjNvQixZQUFVLE1BQU07QUFDZCxVQUFNb3JCLFdBQVd6akIsT0FBTzBqQixZQUFZLE1BQU1yQyxrQkFBa0JOLFdBQVc5VyxTQUFTMFosYUFBYSxLQUFLLElBQUksR0FBRyxHQUFHO0FBQzVHLFdBQU8sTUFBTTNqQixPQUFPNGpCLGNBQWNILFFBQVE7QUFBQSxFQUM1QyxHQUFHLENBQUMxQyxVQUFVLENBQUM7QUFFZjFvQixZQUFVLE1BQU07QUFDZCxRQUFJLENBQUM2SixTQUFTc2dCLE1BQU8sUUFBTzlQO0FBQzVCLFVBQU1tUixRQUFRN2pCLE9BQU80TyxXQUFXLE1BQU07QUFDcEMsVUFBSTtBQUNGdlUseUNBQWlDNkgsU0FBUzdELFVBQVU2RCxTQUFTNGhCLFlBQVk7QUFBQSxNQUMzRSxTQUFTZCxPQUFPO0FBQ2Q3ZSxjQUFNMmUsaUJBQWlCLEVBQUVFLE9BQU8seUJBQXlCQSxNQUFNL2UsT0FBTyxHQUFHLENBQUM7QUFBQSxNQUM1RTtBQUFBLElBQ0YsR0FBRyxHQUFHO0FBQ04sV0FBTyxNQUFNakUsT0FBTytqQixhQUFhRixLQUFLO0FBQUEsRUFDeEMsR0FBRyxDQUFDM2hCLFNBQVM0aEIsY0FBYzVoQixTQUFTc2dCLE9BQU90Z0IsU0FBUzdELFVBQVU4RixLQUFLLENBQUM7QUFFcEU5TCxZQUFVLE1BQU07QUFDZCxVQUFNMnJCLFdBQVdBLE1BQU07QUFDckIsWUFBTS9aLFVBQVUrWCxZQUFZL1g7QUFDNUIsVUFBSUEsUUFBUXVZLE9BQU87QUFDakIsWUFBSTtBQUFFbm9CLDJDQUFpQzRQLFFBQVE1TCxVQUFVNEwsUUFBUTZaLFlBQVk7QUFBQSxRQUFHLFFBQVE7QUFBQSxRQUFFO0FBQUEsTUFDNUY7QUFBQSxJQUNGO0FBQ0EsVUFBTUcsVUFBVUEsQ0FBQ25mLFVBQVU7QUFDekIsV0FBS0EsTUFBTTBGLFdBQVcxRixNQUFNeUYsWUFBWXpGLE1BQU1wRyxJQUFJZ0gsWUFBWSxNQUFNLEtBQUs7QUFDdkVaLGNBQU0yRixlQUFlO0FBQ3JCcE0saUJBQVN3QixjQUFjLDBCQUEwQixHQUFHcWtCLE1BQU07QUFBQSxNQUM1RDtBQUNBLFdBQUtwZixNQUFNMEYsV0FBVzFGLE1BQU15RixZQUFZekYsTUFBTXBHLElBQUlnSCxZQUFZLE1BQU0sS0FBSztBQUN2RVosY0FBTTJGLGVBQWU7QUFDckIzRixjQUFNK0gsV0FBVzFJLE1BQU1nZ0IsS0FBSyxJQUFJaGdCLE1BQU1pZ0IsS0FBSztBQUFBLE1BQzdDO0FBQ0EsVUFBSSxDQUFDdGYsTUFBTTBGLFdBQVcsQ0FBQzFGLE1BQU15RixXQUFXLENBQUN6RixNQUFNNEssVUFBVSxDQUFDNUssTUFBTStILFlBQzNELENBQUNoTCxvQkFBb0JpRCxNQUFNOUcsTUFBTSxLQUFLLENBQUMsYUFBYSxZQUFZLEVBQUUrVixTQUFTalAsTUFBTXBHLEdBQUcsR0FBRztBQUMxRm9HLGNBQU0yRixlQUFlO0FBQ3JCdEYsNkJBQXFCaEIsT0FBT0EsTUFBTW9ILFlBQVksR0FBR3pHLE1BQU1wRyxRQUFRLGVBQWUsSUFBSSxFQUFFO0FBQUEsTUFDdEY7QUFDQSxVQUFJLENBQUNvRyxNQUFNMEYsV0FBVyxDQUFDMUYsTUFBTXlGLFdBQVcsQ0FBQ3pGLE1BQU00SyxVQUMxQyxDQUFDN04sb0JBQW9CaUQsTUFBTTlHLE1BQU0sS0FBSyxDQUFDLGFBQWEsUUFBUSxFQUFFK1YsU0FBU2pQLE1BQU1wRyxHQUFHLEtBQ2hGZ0csd0JBQXdCUCxPQUFPQSxNQUFNb0gsWUFBWSxDQUFDLEdBQUc7QUFDeER6RyxjQUFNMkYsZUFBZTtBQUFBLE1BQ3ZCO0FBQ0EsVUFBSTNGLE1BQU1wRyxRQUFRLFVBQVU7QUFDMUIsY0FBTXVMLFVBQVU5RixNQUFNb0gsWUFBWTtBQUNsQyxZQUFJdEIsUUFBUW9hLGFBQWNsZ0IsT0FBTW9LLGNBQWM7QUFBQSxpQkFDckN0RSxRQUFRbU4sU0FBVWpULE9BQU1rVCxVQUFVO0FBQUEsaUJBQ2xDamMsa0NBQWtDNk8sUUFBUS9JLFNBQVMsRUFBRXBDLFNBQVMsR0FBRztBQUN4RXFGLGdCQUFNWSxhQUFhO0FBQUEsWUFDakJ0QyxNQUFNO0FBQUEsWUFDTjFCLFdBQVdrSixRQUFRL0ksVUFBVUg7QUFBQUEsWUFDN0JzQyxPQUFPNEcsUUFBUS9JLFVBQVVtQztBQUFBQSxZQUN6Qk4sU0FBU2tILFFBQVEvSSxVQUFVNkIsV0FBVztBQUFBLFVBQ3hDLENBQUM7QUFBQSxRQUNILFdBQ1NrSCxRQUFRL0ksVUFBVXVCLFNBQVMsVUFBVzBCLE9BQU1ZLGFBQWEsRUFBRXRDLE1BQU0sV0FBVzFCLFdBQVdrSixRQUFRL0ksVUFBVUgsVUFBVSxDQUFDO0FBQUE7QUFDeEhvRCxnQkFBTVksYUFBYSxFQUFFdEMsTUFBTSxXQUFXLENBQUM7QUFBQSxNQUM5QztBQUFBLElBQ0Y7QUFDQXpDLFdBQU91ZixpQkFBaUIsWUFBWXlFLFFBQVE7QUFDNUNoa0IsV0FBT3VmLGlCQUFpQixXQUFXMEUsT0FBTztBQUMxQyxXQUFPLE1BQU07QUFBRWprQixhQUFPd2Ysb0JBQW9CLFlBQVl3RSxRQUFRO0FBQUdoa0IsYUFBT3dmLG9CQUFvQixXQUFXeUUsT0FBTztBQUFBLElBQUc7QUFBQSxFQUNuSCxHQUFHLENBQUM5ZixLQUFLLENBQUM7QUFFVixRQUFNbWdCLE9BQU8sWUFBWTtBQUN2QixVQUFNQyxZQUFZLElBQUlDLElBQUl4a0IsT0FBT3lrQixTQUFTQyxJQUFJO0FBQzlDSCxjQUFVSSxhQUFhQyxJQUFJLFFBQVEsR0FBRztBQUN0QzVrQixXQUFPNmtCLFFBQVFDLGFBQWE5a0IsT0FBTzZrQixRQUFRRSxPQUFPLElBQUksR0FBR1IsVUFBVVMsUUFBUSxHQUFHVCxVQUFVVSxNQUFNLEdBQUdWLFVBQVVoQyxJQUFJLEVBQUU7QUFDakgsVUFBTTJDLE9BQU8zcUIsNEJBQTRCMkgsU0FBUzdELFFBQVE7QUFDMUQsUUFBSTZELFNBQVN5YixZQUFZbGdCLEtBQUssQ0FBQzhELFNBQVNBLEtBQUtzYyxVQUFVLE9BQU8sR0FBRztBQUMvRDFaLFlBQU1TLGFBQWEsRUFBRXNlLFFBQVEsVUFBVWpmLFNBQVMsMkNBQTJDLENBQUM7QUFDNUY7QUFBQSxJQUNGO0FBQ0FFLFVBQU1TLGFBQWEsRUFBRXNlLFFBQVEsVUFBVWpmLFNBQVMsR0FBRyxDQUFDO0FBQ3BELFFBQUk7QUFDRixZQUFNOFEsU0FBUyxNQUFNNWEseUJBQXlCK3FCLE1BQU1oakIsU0FBUzRoQixZQUFZO0FBQ3pFM2YsWUFBTWdoQixVQUFVRCxNQUFNblEsT0FBT3dOLElBQUk7QUFDakN6b0IsdUNBQWlDO0FBQUEsSUFDbkMsU0FBU2twQixPQUFPO0FBQ2Q3ZSxZQUFNUyxhQUFhLEVBQUVzZSxRQUFRRixNQUFNRSxXQUFXLE1BQU0sYUFBYSxVQUFVamYsU0FBUytlLE1BQU0vZSxRQUFRLENBQUM7QUFBQSxJQUNyRztBQUFBLEVBQ0Y7QUFFQSxRQUFNbWhCLGdCQUFnQkEsTUFBTTtBQUMxQixVQUFNQyxhQUFhO0FBQUEsTUFDakJ2b0IsSUFBSXdvQixPQUFPQyxXQUFXO0FBQUEsTUFDdEI1SyxNQUFNLGVBQWMsb0JBQUlrSSxLQUFLLEdBQUUyQyxtQkFBbUIsSUFBSSxFQUFFQyxNQUFNLFdBQVdDLFFBQVEsVUFBVSxDQUFDLENBQUM7QUFBQSxNQUM3RjlDLFdBQVdDLEtBQUs1QyxJQUFJO0FBQUEsTUFDcEI1ZSxTQUFTYSxTQUFTb0QsVUFBVWpFO0FBQUFBLE1BQzVCc2tCLGdCQUFnQnpqQixTQUFTNGhCO0FBQUFBLE1BQ3pCemxCLFVBQVU2RCxTQUFTN0Q7QUFBQUEsSUFDckI7QUFDQStpQixtQkFBZWhuQiw4QkFBOEJpckIsVUFBVSxDQUFDO0FBQUEsRUFDMUQ7QUFDQSxRQUFNTyxjQUFjMWpCLFNBQVMyakIsVUFBVTNDLFdBQVcsV0FBVyxZQUN6RGhoQixTQUFTMmpCLFVBQVUzQyxXQUFXLGFBQWEsbUJBQ3pDaGhCLFNBQVMyakIsVUFBVTNDLFdBQVcsV0FBVyxnQkFDdkNoaEIsU0FBU3NnQixRQUFRLFVBQVU7QUFDbkMsUUFBTW5hLFdBQVdwSCxXQUFXaUIsU0FBUzdELFVBQVU2RCxTQUFTaEIsU0FBUztBQUNqRSxRQUFNNGtCLG1CQUFtQjVqQixTQUFTQyxjQUFjMUQsU0FBUzdCLEtBQUssQ0FBQzRCLFlBQVlBLFFBQVExQixPQUFPdUwsVUFBVXZMLEVBQUU7QUFDdEcsUUFBTTJYLGlCQUFpQnFSLGtCQUFrQjFULG9CQUFvQi9KLFVBQVVhLFlBQVk7QUFDbkYsUUFBTTZjLGlCQUFpQjFkLFdBQ25CN0ksT0FBTzBDLFNBQVN1RyxtQkFBbUIsV0FBV0osU0FBUzJNLGlCQUFpQjNNLFNBQVNhLFFBQVEsSUFDekY7QUFDSixRQUFNOGMsbUJBQW1CNXFCLGtDQUFrQzhHLFNBQVNoQixTQUFTLEVBQUVwQztBQUMvRSxRQUFNbW5CLGFBQWEzUCxRQUFRcFUsU0FBU29ELFVBQVVrWixJQUFJO0FBQ2xELFFBQU0wSCxtQkFBbUJwaUIsb0JBQW9CNUIsUUFBUTtBQUNyRCxRQUFNaWtCLGFBQWFBLE1BQU07QUFDdkIsUUFBSUYsWUFBWTtBQUNkOWhCLFlBQU1hLGFBQWEsRUFBRUMsT0FBTyxZQUFZQyxTQUFTLE9BQU9zWixNQUFNLEtBQUssQ0FBQztBQUNwRTtBQUFBLElBQ0Y7QUFDQSxVQUFNRixRQUFReGpCLDhCQUE4QjtBQUFBLE1BQzFDdUQsVUFBVTZELFNBQVM3RDtBQUFBQSxNQUNuQitDLE1BQU1jLFNBQVNDO0FBQUFBLE1BQ2ZsRSxRQUFRb0ssV0FBVyxFQUFFNUYsTUFBTSxXQUFXMUIsV0FBV3NILFNBQVN2TCxHQUFHLElBQUk7QUFBQSxJQUNuRSxDQUFDO0FBQ0QsUUFBSXdoQixNQUFNOVMsTUFBT3JILE9BQU1hLGFBQWEsRUFBRXdaLE1BQU1GLE1BQU0sQ0FBQztBQUFBLEVBQ3JEO0FBQ0EsUUFBTThILGFBQWFBLENBQUM5VSxVQUFVbk4sTUFBTWEsYUFBYTtBQUFBLElBQy9Dd00sV0FBV3RQLFNBQVNvRCxVQUFVa00sY0FBY0YsUUFBUSxPQUFPQTtBQUFBQSxFQUM3RCxDQUFDO0FBQ0QsUUFBTStVLGNBQWNBLE1BQU07QUFDeEJsaUIsVUFBTWEsYUFBYSxFQUFFa0csTUFBTSxFQUFFLENBQUM7QUFDOUJoQiwwQkFBc0IsTUFBTTtBQUMxQixZQUFNUSxRQUFRck0sU0FBU3dCLGNBQWMscUJBQXFCO0FBQzFELFVBQUk2SyxNQUFPQSxPQUFNSyxhQUFhO0FBQUEsSUFDaEMsQ0FBQztBQUFBLEVBQ0g7QUFDQSxRQUFNdWIsYUFBYUEsTUFBTTtBQUN2QixRQUFJLENBQUNSLG9CQUFvQixDQUFDNWpCLFNBQVNDLGNBQWMrRixXQUFZO0FBQzdELFVBQU1xZSxjQUFjcHFCLEtBQUtFLElBQUksTUFBT3lwQixpQkFBaUIxVCxnQkFBZ0I7QUFDckUsVUFBTWxILE9BQU8vTyxLQUFLQyxJQUFJLEdBQUdELEtBQUtFLElBQUksR0FBSTZGLFNBQVNDLGFBQWErRixhQUFhcWUsY0FBZSxJQUFJLENBQUM7QUFDN0ZwaUIsVUFBTWEsYUFBYSxFQUFFa0csTUFBTTFMLE9BQU8wTCxLQUFLdkosUUFBUSxDQUFDLENBQUMsRUFBRSxDQUFDO0FBQ3BEdUksMEJBQXNCLE1BQU07QUFDMUIsWUFBTVEsUUFBUXJNLFNBQVN3QixjQUFjLHFCQUFxQjtBQUMxRCxVQUFJLENBQUM2SyxNQUFPO0FBQ1osWUFBTThiLGFBQWFWLGlCQUFpQnRrQixVQUFVVSxTQUFTQyxhQUFhK0Y7QUFDcEV3QyxZQUFNSyxhQUFhNU8sS0FBS0UsSUFBSSxHQUFJbXFCLGFBQWE5YixNQUFNTSxjQUFnQk4sTUFBTStiLGNBQWMsSUFBSztBQUFBLElBQzlGLENBQUM7QUFBQSxFQUNIO0FBQ0EsUUFBTUMsaUJBQWlCQSxNQUFNO0FBQzNCLFVBQU1uZSxPQUFPLENBQUNpWjtBQUNkQyxvQkFBZ0JsWixJQUFJO0FBQ3BCd1ksZUFBVzlXLFNBQVN3WCxrQkFBa0JsWixJQUFJO0FBQUEsRUFDNUM7QUFDQSxRQUFNb2UsZUFBZUEsTUFBTTtBQUN6QixRQUFJemtCLFNBQVNrVixVQUFVaGEsVUFBVSx3QkFBd0I7QUFDdkQrRyxZQUFNa1QsVUFBVTtBQUNoQjtBQUFBLElBQ0Y7QUFDQSxRQUFJblYsU0FBU2tWLFNBQVU7QUFDdkJqVCxVQUFNbVQsU0FBUyx3QkFBd0IsQ0FBQ2pULFVBQVU7QUFDaERySCxhQUFPNEIsS0FBS3lGLEtBQUssRUFBRWhDLFFBQVEsQ0FBQzNELFFBQVEsT0FBTzJGLE1BQU0zRixHQUFHLENBQUM7QUFDckQxQixhQUFPdUosT0FBT2xDLE9BQU85Siw0QkFBNEIySCxTQUFTNk4sZ0JBQWdCLENBQUM7QUFBQSxJQUM3RSxDQUFDO0FBQUEsRUFDSDtBQUVBLFNBQU90WDtBQUFBQSxJQUNMO0FBQUEsTUFBQztBQUFBO0FBQUEsUUFDQyxXQUFVO0FBQUEsUUFDVixvQkFBa0JpcEI7QUFBQUEsUUFDbEIsc0JBQW9CeGlCLGVBQWUsU0FBUztBQUFBLFFBQzVDLE1BQUs7QUFBQSxRQUNMLGNBQVc7QUFBQSxRQUVYO0FBQUEsaUNBQUMsWUFBTyxXQUFVLHVCQUNoQjtBQUFBLG1DQUFDLFlBQU8sTUFBSyxVQUFTLFdBQVUsc0JBQXFCLFNBQVMsTUFBTWlGLE1BQU1ZLGFBQWEsRUFBRXRDLE1BQU0sV0FBVyxDQUFDLEdBQUc7QUFBQSxxQ0FBQyxXQUFRLGVBQVksVUFBckI7QUFBQTtBQUFBO0FBQUE7QUFBQSxxQkFBMkI7QUFBQSxjQUFHLHVCQUFDLFVBQUssK0JBQU47QUFBQTtBQUFBO0FBQUE7QUFBQSxxQkFBcUI7QUFBQSxjQUFPLHVCQUFDLFdBQU0sZ0NBQVA7QUFBQTtBQUFBO0FBQUE7QUFBQSxxQkFBdUI7QUFBQSxpQkFBL0w7QUFBQTtBQUFBO0FBQUE7QUFBQSxtQkFBdU07QUFBQSxZQUN2TSx1QkFBQyxhQUFVLE9BQWMsWUFBekI7QUFBQTtBQUFBO0FBQUE7QUFBQSxtQkFBNEM7QUFBQSxZQUM1Qyx1QkFBQyxTQUFJLFdBQVUsd0JBQ2I7QUFBQSxxQ0FBQyxZQUFPLE1BQUssVUFBUyxVQUFVLENBQUNQLFNBQVMyaUIsUUFBUStCLFNBQVMsT0FBTzFrQixTQUFTMmlCLFFBQVFnQyxhQUFhLFFBQVEsY0FBVyxRQUFPLFNBQVMsTUFBTTFpQixNQUFNaWdCLEtBQUssR0FBRyxpQ0FBQyxVQUFLLGVBQVksUUFBTyxpQkFBekI7QUFBQTtBQUFBO0FBQUE7QUFBQSxxQkFBMEIsS0FBakw7QUFBQTtBQUFBO0FBQUE7QUFBQSxxQkFBd0w7QUFBQSxjQUN4TCx1QkFBQyxZQUFPLE1BQUssVUFBUyxVQUFVLENBQUNsaUIsU0FBUzJpQixRQUFRaUMsU0FBUyxPQUFPNWtCLFNBQVMyaUIsUUFBUWtDLGFBQWEsUUFBUSxjQUFXLFFBQU8sU0FBUyxNQUFNNWlCLE1BQU1nZ0IsS0FBSyxHQUFHLGlDQUFDLFVBQUssZUFBWSxRQUFPLGlCQUF6QjtBQUFBO0FBQUE7QUFBQTtBQUFBLHFCQUEwQixLQUFqTDtBQUFBO0FBQUE7QUFBQTtBQUFBLHFCQUF3TDtBQUFBLGNBQ3hMLHVCQUFDLFlBQU8sTUFBSyxVQUFTLFdBQVc3QyxjQUFjLGNBQWMsSUFBSSxTQUFTLE1BQU1DLGVBQWUsQ0FBQ0QsV0FBVyxHQUFHLG9CQUE5RztBQUFBO0FBQUE7QUFBQTtBQUFBLHFCQUFrSDtBQUFBLGNBQ2xILHVCQUFDLFlBQU8sTUFBSyxVQUFTLFdBQVdFLGVBQWUsY0FBYyxJQUFJLFNBQVNrRixnQkFBaUJsRix5QkFBZSxhQUFhLFlBQXhIO0FBQUE7QUFBQTtBQUFBO0FBQUEscUJBQWlJO0FBQUEsY0FDakksdUJBQUMsWUFBTyxNQUFLLFVBQVMsV0FBV3RmLFNBQVNrVixVQUFVaGEsVUFBVSx5QkFBeUIsY0FBYyxJQUFJLFVBQVU4RSxTQUFTa1YsWUFBWWxWLFNBQVNrVixTQUFTaGEsVUFBVSx3QkFBd0IsU0FBU3VwQixjQUFlemtCLG1CQUFTa1YsVUFBVWhhLFVBQVUseUJBQXlCLFdBQVcsV0FBclI7QUFBQTtBQUFBO0FBQUE7QUFBQSxxQkFBNlI7QUFBQSxjQUM3Uix1QkFBQyxhQUFRLFdBQVUscUJBQ2pCO0FBQUEsdUNBQUMsYUFBUSxvQkFBVDtBQUFBO0FBQUE7QUFBQTtBQUFBLHVCQUFhO0FBQUEsZ0JBQ2IsdUJBQUMsU0FDQztBQUFBLHlDQUFDLFlBQU8sTUFBSyxVQUFTLFNBQVNnb0IsZUFBZSwwQkFBOUM7QUFBQTtBQUFBO0FBQUE7QUFBQSx5QkFBd0Q7QUFBQSxrQkFDeEQsdUJBQUMsWUFBTyxNQUFLLFVBQVMsU0FBUyxNQUFNcnJCLDZCQUE2Qm1JLFNBQVM3RCxRQUFRLEdBQUcsMkJBQXRGO0FBQUE7QUFBQTtBQUFBO0FBQUEseUJBQWlHO0FBQUEsa0JBQ2pHLHVCQUFDLFlBQU8sTUFBSyxVQUFTLFNBQVMsTUFBTTBqQixVQUFVOVgsU0FBU2lhLE1BQU0sR0FBRywyQkFBakU7QUFBQTtBQUFBO0FBQUE7QUFBQSx5QkFBNEU7QUFBQSxxQkFIOUU7QUFBQTtBQUFBO0FBQUE7QUFBQSx1QkFJQTtBQUFBLG1CQU5GO0FBQUE7QUFBQTtBQUFBO0FBQUEscUJBT0E7QUFBQSxjQUNBLHVCQUFDLFdBQU0sS0FBS25DLFdBQVcsUUFBTSxNQUFDLE1BQUssUUFBTyxRQUFPLG9CQUFtQixVQUFVLE9BQU9qZCxVQUFVO0FBQzdGLHNCQUFNa2lCLE9BQU9saUIsTUFBTTlHLE9BQU9pcEIsUUFBUSxDQUFDO0FBQ25DLG9CQUFJLENBQUNELEtBQU07QUFDWCxvQkFBSTtBQUNGLHdCQUFNRSxXQUFXQyxLQUFLQyxNQUFNLE1BQU1KLEtBQUtoa0IsS0FBSyxDQUFDO0FBQzdDMUksb0RBQWtDNHNCLFFBQVE7QUFDMUMvaUIsd0JBQU1zZSxnQkFBZ0IsbUJBQW1CeUUsUUFBUTtBQUFBLGdCQUNuRCxTQUFTbEUsT0FBTztBQUFFN2Usd0JBQU1TLGFBQWEsRUFBRXNlLFFBQVEsVUFBVWpmLFNBQVMrZSxNQUFNL2UsUUFBUSxDQUFDO0FBQUEsZ0JBQUc7QUFDcEZhLHNCQUFNOUcsT0FBTzlCLFFBQVE7QUFBQSxjQUN2QixLQVRBO0FBQUE7QUFBQTtBQUFBO0FBQUEscUJBU0U7QUFBQSxjQUNGLHVCQUFDLFlBQU8sTUFBSyxVQUFTLDBCQUFzQixNQUFDLFdBQVUsV0FBVSxVQUFVZ0csU0FBUzJqQixVQUFVM0MsV0FBVyxVQUFVLFNBQVNvQixNQUFNO0FBQUEsdUNBQUMsVUFBTXNCLHlCQUFQO0FBQUE7QUFBQTtBQUFBO0FBQUEsdUJBQW1CO0FBQUEsZ0JBQU8sdUJBQUMsU0FBSSxrQkFBTDtBQUFBO0FBQUE7QUFBQTtBQUFBLHVCQUFPO0FBQUEsbUJBQW5LO0FBQUE7QUFBQTtBQUFBO0FBQUEscUJBQXlLO0FBQUEsaUJBeEIzSztBQUFBO0FBQUE7QUFBQTtBQUFBLG1CQXlCQTtBQUFBLGVBNUJGO0FBQUE7QUFBQTtBQUFBO0FBQUEsaUJBNkJBO0FBQUEsVUFFQzFqQixTQUFTbWxCLGNBQWN0RSxZQUFZLHVCQUFDLFNBQUksV0FBVSx5QkFBd0I7QUFBQSxtQ0FBQyxVQUFLO0FBQUE7QUFBQSxjQUF1QixJQUFJRixLQUFLM2dCLFNBQVNtbEIsY0FBY2hqQixNQUFNdWUsU0FBUyxFQUFFMEUsZUFBZTtBQUFBLGNBQUU7QUFBQSxpQkFBL0Y7QUFBQTtBQUFBO0FBQUE7QUFBQSxtQkFBNkc7QUFBQSxZQUFPLHVCQUFDLFlBQU8sTUFBSyxVQUFTLFNBQVMsTUFBTTtBQUFFbmpCLG9CQUFNc2UsZ0JBQWdCLGlCQUFpQnZnQixTQUFTbWxCLGNBQWNoakIsTUFBTWhHLFFBQVE7QUFBRzhGLG9CQUFNMmUsaUJBQWlCLEVBQUVDLFdBQVcsTUFBTSxDQUFDO0FBQUEsWUFBRyxHQUFHLHVDQUF2SztBQUFBO0FBQUE7QUFBQTtBQUFBLG1CQUE4TDtBQUFBLFlBQVMsdUJBQUMsWUFBTyxNQUFLLFVBQVMsU0FBUyxNQUFNO0FBQUVocEIsMkNBQTZCbUksU0FBU21sQixjQUFjaGpCLE1BQU1oRyxVQUFVLCtCQUErQjtBQUFBLFlBQUcsR0FBRyxzQkFBaEo7QUFBQTtBQUFBO0FBQUE7QUFBQSxtQkFBc0o7QUFBQSxZQUFTLHVCQUFDLFlBQU8sTUFBSyxVQUFTLFNBQVMsTUFBTTtBQUFFdkUsK0NBQWlDO0FBQUdxSyxvQkFBTTJlLGlCQUFpQixFQUFFQyxXQUFXLE1BQU0sQ0FBQztBQUFBLFlBQUcsR0FBRyx1QkFBNUg7QUFBQTtBQUFBO0FBQUE7QUFBQSxtQkFBbUk7QUFBQSxlQUFwb0I7QUFBQTtBQUFBO0FBQUE7QUFBQSxpQkFBNm9CLElBQVM7QUFBQSxVQUN6ckI3Z0IsU0FBUzJqQixVQUFVNWhCLFVBQVUsdUJBQUMsU0FBSSxXQUFXLGdDQUFnQy9CLFNBQVMyakIsVUFBVTNDLE1BQU0sSUFBS2hoQjtBQUFBQSxxQkFBUzJqQixVQUFVNWhCO0FBQUFBLFlBQVEsdUJBQUMsWUFBTyxNQUFLLFVBQVMsY0FBVyxtQkFBa0IsU0FBUyxNQUFNRSxNQUFNUyxhQUFhLEVBQUVYLFNBQVMsR0FBRyxDQUFDLEdBQUcsaUJBQXZHO0FBQUE7QUFBQTtBQUFBO0FBQUEsbUJBQXdHO0FBQUEsZUFBak47QUFBQTtBQUFBO0FBQUE7QUFBQSxpQkFBME4sSUFBUztBQUFBLFVBRWhRcWQsY0FBYyx1QkFBQyxxQkFBa0IsWUFBbkI7QUFBQTtBQUFBO0FBQUE7QUFBQSxpQkFBc0MsSUFBTTtBQUFBLFVBQzFERSxlQUFlLHVCQUFDLFNBQUksV0FBVSxrQ0FBaUM7QUFBQSxtQ0FBQyxZQUFPLDZCQUFSO0FBQUE7QUFBQTtBQUFBO0FBQUEsbUJBQXFCO0FBQUEsWUFBUyx1QkFBQyxZQUFPLE1BQUssVUFBUyxTQUFTLE1BQU1ULFdBQVc5VyxTQUFTc2QsZ0JBQWdCLEVBQUVDLEtBQUssTUFBTSxDQUFDLEdBQUcsaUJBQTFGO0FBQUE7QUFBQTtBQUFBO0FBQUEsbUJBQTJGO0FBQUEsWUFBUyx1QkFBQyxZQUFPLE1BQUssVUFBUyxTQUFTLE1BQU16RyxXQUFXOVcsU0FBU3NkLGdCQUFnQixFQUFFRSxPQUFPLEtBQUssQ0FBQyxHQUFHLGlCQUEzRjtBQUFBO0FBQUE7QUFBQTtBQUFBLG1CQUE0RjtBQUFBLFlBQVMsdUJBQUMsWUFBTyxNQUFLLFVBQVMsU0FBUyxNQUFNMUcsV0FBVzlXLFNBQVNzZCxnQkFBZ0IsRUFBRUUsT0FBTyxNQUFNLENBQUMsR0FBRyxpQkFBNUY7QUFBQTtBQUFBO0FBQUE7QUFBQSxtQkFBNkY7QUFBQSxZQUFTLHVCQUFDLFlBQU8sTUFBSyxVQUFTLFNBQVMsTUFBTTFHLFdBQVc5VyxTQUFTc2QsZ0JBQWdCLEVBQUVDLEtBQUssS0FBSyxDQUFDLEdBQUcsaUJBQXpGO0FBQUE7QUFBQTtBQUFBO0FBQUEsbUJBQTBGO0FBQUEsWUFBUyx1QkFBQyxZQUFPLE1BQUssVUFBUyxTQUFTLE1BQU16RyxXQUFXOVcsU0FBU3NkLGdCQUFnQixFQUFFRyxVQUFVLEtBQUssQ0FBQyxHQUFHLGlCQUE5RjtBQUFBO0FBQUE7QUFBQTtBQUFBLG1CQUErRjtBQUFBLFlBQVMsdUJBQUMsWUFBTyxNQUFLLFVBQVMsU0FBUyxNQUFNM0csV0FBVzlXLFNBQVNzZCxnQkFBZ0IsRUFBRUcsVUFBVSxJQUFJLENBQUMsR0FBRyxpQkFBN0Y7QUFBQTtBQUFBO0FBQUE7QUFBQSxtQkFBOEY7QUFBQSxZQUFTLHVCQUFDLFlBQU8sTUFBSyxVQUFTLFNBQVMsTUFBTTNHLFdBQVc5VyxTQUFTMGQsZ0JBQWdCLEdBQUcscUJBQTVFO0FBQUE7QUFBQTtBQUFBO0FBQUEsbUJBQWlGO0FBQUEsWUFBUyx1QkFBQyxXQUFNLCtFQUFQO0FBQUE7QUFBQTtBQUFBO0FBQUEsbUJBQXNFO0FBQUEsZUFBLzBCO0FBQUE7QUFBQTtBQUFBO0FBQUEsaUJBQXUxQixJQUFTO0FBQUEsVUFFaDNCLHVCQUFDLGFBQVUsT0FBYyxVQUFvQixjQUE0QixnQkFBZ0MsV0FBc0IsZ0JBQS9IO0FBQUE7QUFBQTtBQUFBO0FBQUEsaUJBQTBKO0FBQUEsVUFDMUo7QUFBQSxZQUFDO0FBQUE7QUFBQSxjQUNDLE1BQUs7QUFBQSxjQUNMLFdBQVU7QUFBQSxjQUNWLGlCQUFjO0FBQUEsY0FDZCxpQkFBZXpvQjtBQUFBQSxjQUNmLE9BQU9BLGVBQWUsa0JBQWtCO0FBQUEsY0FDeEMsU0FBUyxNQUFNMGlCLGdCQUFnQixDQUFDZ0csU0FBUyxDQUFDQSxJQUFJO0FBQUEsY0FDOUMxb0I7QUFBQUEsK0JBQWUsdUJBQUMsZUFBWSxlQUFZLFVBQXpCO0FBQUE7QUFBQTtBQUFBO0FBQUEsdUJBQStCLElBQU0sdUJBQUMsYUFBVSxlQUFZLFVBQXZCO0FBQUE7QUFBQTtBQUFBO0FBQUEsdUJBQTZCO0FBQUEsZ0JBQUksdUJBQUMsVUFBTUEseUJBQWUsa0JBQWtCLG1CQUF4QztBQUFBO0FBQUE7QUFBQTtBQUFBLHVCQUF3RDtBQUFBO0FBQUE7QUFBQSxZQVAvSTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUEsVUFPc0o7QUFBQSxVQUN0Six1QkFBQyxTQUFJLElBQUcsK0JBQThCLFdBQVUsdUJBQXNCLGVBQWEsQ0FBQ0EsY0FDbEY7QUFBQSxtQ0FBQyxTQUFJLFdBQVUsMkJBQ2I7QUFBQSxxQ0FBQyxVQUFLO0FBQUEsdUNBQUMsWUFBUW1KLG9CQUFVakwsU0FBUyxjQUE1QjtBQUFBO0FBQUE7QUFBQTtBQUFBLHVCQUF1QztBQUFBLGdCQUFTO0FBQUEsZ0JBQUVpTCxXQUFXLEdBQUdBLFNBQVM1RixJQUFJLE1BQU1mLFNBQVN2RixLQUFLRSxJQUFJLEdBQUcwcEIsaUJBQWlCLENBQUMsQ0FBQyxDQUFDLGFBQWFya0IsU0FBU3FrQixjQUFjLENBQUMsU0FBU3RSLGlCQUFpQnNSLGlCQUFpQixPQUFRLE1BQU1ya0IsU0FBUytTLGNBQWMsQ0FBQyxjQUFjLEVBQUUsS0FBSztBQUFBLG1CQUE3UTtBQUFBO0FBQUE7QUFBQTtBQUFBLHFCQUFnUjtBQUFBLGNBQy9RdVIsbUJBQW1CLElBQUksdUJBQUMsVUFBSyxXQUFVLGdDQUFnQ0E7QUFBQUE7QUFBQUEsZ0JBQWlCO0FBQUEsbUJBQWpFO0FBQUE7QUFBQTtBQUFBO0FBQUEscUJBQWlGLElBQVU7QUFBQSxjQUNuSCx1QkFBQyxVQUFNOWpCLG1CQUFTMmxCLFVBQVUsbUJBQW1CLGtCQUE3QztBQUFBO0FBQUE7QUFBQTtBQUFBLHFCQUE0RDtBQUFBLGNBQzVELHVCQUFDLFlBQU8sTUFBSyxVQUFTLFdBQVczbEIsU0FBUzJsQixVQUFVLGNBQWMsSUFBSSxTQUFTLE1BQU0xakIsTUFBTTJqQixXQUFXLENBQUM1bEIsU0FBUzJsQixPQUFPLEdBQUcsMEJBQTFIO0FBQUE7QUFBQTtBQUFBO0FBQUEscUJBQW9JO0FBQUEsY0FDcEksdUJBQUMsWUFBTyxNQUFLLFVBQVMsV0FBVzVCLGFBQWEsY0FBYyxJQUFJLFVBQVUsQ0FBQzVkLFVBQVUsU0FBUzhkLFlBQWFGLHVCQUFhLGtCQUFrQixrQkFBMUk7QUFBQTtBQUFBO0FBQUE7QUFBQSxxQkFBeUo7QUFBQSxjQUN6Six1QkFBQyxZQUFPLE1BQUssVUFBUyxTQUFTSSxhQUFhLDRCQUE1QztBQUFBO0FBQUE7QUFBQTtBQUFBLHFCQUF3RDtBQUFBLGNBQ3hELHVCQUFDLFlBQU8sTUFBSyxVQUFTLFVBQVUsQ0FBQ1Asa0JBQWtCLFNBQVNRLFlBQVksMkJBQXhFO0FBQUE7QUFBQTtBQUFBO0FBQUEscUJBQW1GO0FBQUEsY0FDbEYsQ0FBQyxVQUFVLFNBQVMsTUFBTSxFQUFFdGdCLElBQUksQ0FBQ3NMLFVBQVUsdUJBQUMsWUFBTyxNQUFLLFVBQXFCLFdBQVdwUCxTQUFTb0QsVUFBVWtNLGNBQWNGLFFBQVEsY0FBYyxJQUFJLFNBQVMsTUFBTThVLFdBQVc5VSxLQUFLLEdBQUc7QUFBQTtBQUFBLGdCQUFNQTtBQUFBQSxtQkFBckhBLE9BQTNCO0FBQUE7QUFBQTtBQUFBO0FBQUEscUJBQXNKLENBQVM7QUFBQSxjQUMxTTRVLG1CQUFtQix1QkFBQyxZQUFPLE1BQUssVUFBUyxXQUFVLDJCQUEwQixVQUFVQSxpQkFBaUJsaUIsVUFBVSxPQUFPa2lCLGlCQUFpQmppQixXQUFXLEdBQUdpaUIsaUJBQWlCOW9CLEtBQUssdUJBQXVCLFNBQVMsTUFBTXNILHdCQUF3QlAsT0FBT2pDLFFBQVEsR0FBRztBQUFBLHVDQUFDLFVBQU8sZUFBWSxVQUFwQjtBQUFBO0FBQUE7QUFBQTtBQUFBLHVCQUEwQjtBQUFBLGdCQUFJZ2tCLGlCQUFpQjlvQjtBQUFBQSxtQkFBMVI7QUFBQTtBQUFBO0FBQUE7QUFBQSxxQkFBZ1MsSUFBWTtBQUFBLGNBQy9UaWUsaUJBQWlCLHVCQUFDLFVBQUssV0FBVSxvQkFBb0JBO0FBQUFBLCtCQUFlME0sWUFBWXBtQixRQUFRLENBQUM7QUFBQSxnQkFBRTtBQUFBLGdCQUFNMFosZUFBZTJNO0FBQUFBLGdCQUFVO0FBQUEsZ0JBQVMzTSxlQUFlNE0sV0FBV1gsZUFBZTtBQUFBLGdCQUFFO0FBQUEsZ0JBQVFqTSxlQUFlNk07QUFBQUEsZ0JBQWdCO0FBQUEsZ0JBQWM3TSxlQUFlOE07QUFBQUEsZ0JBQWU7QUFBQSxtQkFBaFA7QUFBQTtBQUFBO0FBQUE7QUFBQSxxQkFBeVAsSUFBVTtBQUFBLGNBQ3BSaEgsWUFBWXJpQixTQUFTLHVCQUFDLFlBQU8sY0FBVyxzQkFBcUIsY0FBYSxJQUFHLFVBQVUsQ0FBQ2dHLFVBQVU7QUFBRSxzQkFBTXNqQixRQUFRakgsWUFBWXZrQixLQUFLLENBQUMyRSxTQUFTQSxLQUFLekUsT0FBT2dJLE1BQU05RyxPQUFPOUIsS0FBSztBQUFHLG9CQUFJa3NCLE9BQU87QUFBRWprQix3QkFBTXNlLGdCQUFnQixXQUFXMkYsTUFBTXpOLElBQUksSUFBSXlOLE1BQU0vcEIsUUFBUTtBQUFHOEYsd0JBQU1hLGFBQWEsRUFBRUMsT0FBTyxZQUFZNUQsU0FBUyttQixNQUFNL21CLFNBQVM2RCxTQUFTLE1BQU0sQ0FBQztBQUFBLGdCQUFHO0FBQUVKLHNCQUFNOUcsT0FBTzlCLFFBQVE7QUFBQSxjQUFJLEdBQUc7QUFBQSx1Q0FBQyxZQUFPLE9BQU0sSUFBRztBQUFBO0FBQUEsa0JBQWNpbEIsWUFBWXJpQjtBQUFBQSxrQkFBTztBQUFBLHFCQUFsRDtBQUFBO0FBQUE7QUFBQTtBQUFBLHVCQUFtRDtBQUFBLGdCQUFVcWlCLFlBQVluYixJQUFJLENBQUN6RSxTQUFTLHVCQUFDLFlBQU8sT0FBT0EsS0FBS3pFLElBQW1CeUUsZUFBS29aLFFBQWZwWixLQUFLekUsSUFBbEM7QUFBQTtBQUFBO0FBQUE7QUFBQSx1QkFBaUQsQ0FBUztBQUFBLG1CQUF4ZTtBQUFBO0FBQUE7QUFBQTtBQUFBLHFCQUEwZSxJQUFZO0FBQUEsaUJBWDlnQjtBQUFBO0FBQUE7QUFBQTtBQUFBLG1CQVlBO0FBQUEsWUFDQTtBQUFBLGNBQUM7QUFBQTtBQUFBLGdCQUNDO0FBQUEsZ0JBQ0E7QUFBQSxnQkFDQSxjQUFjLENBQUNvRSxjQUFjO0FBQzNCaUQsd0JBQU1ZLGFBQWE3RCxTQUFTO0FBQzVCeWdCLGdDQUFjLFNBQVM7QUFBQSxnQkFDekI7QUFBQTtBQUFBLGNBTkY7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBLFlBTUk7QUFBQSxlQXBCTjtBQUFBO0FBQUE7QUFBQTtBQUFBLGlCQXNCQTtBQUFBLFVBQ0EsdUJBQUMsU0FBSSxXQUFVLDRCQUEyQixjQUFXLGdCQUFlO0FBQUEsbUNBQUMsWUFBTyxNQUFLLFVBQVMsV0FBV0QsZUFBZSxhQUFhLGNBQWMsSUFBSSxTQUFTLE1BQU1DLGNBQWMsVUFBVSxHQUFHLHdCQUF6SDtBQUFBO0FBQUE7QUFBQTtBQUFBLG1CQUFpSTtBQUFBLFlBQVMsdUJBQUMsWUFBTyxNQUFLLFVBQVMsV0FBV0QsZUFBZSxZQUFZLGNBQWMsSUFBSSxTQUFTLE1BQU1DLGNBQWMsU0FBUyxHQUFHLHVCQUF2SDtBQUFBO0FBQUE7QUFBQTtBQUFBLG1CQUE4SDtBQUFBLFlBQVMsdUJBQUMsWUFBTyxNQUFLLFVBQVMsV0FBV0QsZUFBZSxZQUFZLGNBQWMsSUFBSSxTQUFTLE1BQU1DLGNBQWMsU0FBUyxHQUFHLHVCQUF2SDtBQUFBO0FBQUE7QUFBQTtBQUFBLG1CQUE4SDtBQUFBLGVBQW5kO0FBQUE7QUFBQTtBQUFBO0FBQUEsaUJBQTRkO0FBQUE7QUFBQTtBQUFBLE1BNUU5ZDtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUEsSUE2RUE7QUFBQSxJQUNDdGpCLFNBQVNncUI7QUFBQUEsRUFBSTtBQUNsQjtBQUFDcEgsSUF0U3VCSCxzQkFBb0I7QUFBQSxPQUFwQkE7QUFBb0IsSUFBQTlaLElBQUFLLEtBQUFVLEtBQUFZLEtBQUEyZixLQUFBbFUsS0FBQWlCLEtBQUFrQixLQUFBZ1MsS0FBQTNQLEtBQUFTLEtBQUE2QixNQUFBdUMsTUFBQU0sTUFBQXlLLE1BQUFDLE1BQUE1SCxNQUFBNkg7QUFBQSxhQUFBMWhCLElBQUE7QUFBQSxhQUFBSyxLQUFBO0FBQUEsYUFBQVUsS0FBQTtBQUFBLGFBQUFZLEtBQUE7QUFBQSxhQUFBMmYsS0FBQTtBQUFBLGFBQUFsVSxLQUFBO0FBQUEsYUFBQWlCLEtBQUE7QUFBQSxhQUFBa0IsS0FBQTtBQUFBLGFBQUFnUyxLQUFBO0FBQUEsYUFBQTNQLEtBQUE7QUFBQSxhQUFBUyxLQUFBO0FBQUEsYUFBQTZCLE1BQUE7QUFBQSxhQUFBdUMsTUFBQTtBQUFBLGFBQUFNLE1BQUE7QUFBQSxhQUFBeUssTUFBQTtBQUFBLGFBQUFDLE1BQUE7QUFBQSxhQUFBNUgsTUFBQTtBQUFBLGFBQUE2SCxNQUFBIiwibmFtZXMiOlsidXNlRWZmZWN0IiwidXNlUmVmIiwidXNlU3RhdGUiLCJ1c2VTeW5jRXh0ZXJuYWxTdG9yZSIsImNyZWF0ZVBvcnRhbCIsIkNoZWNrIiwiQ2hldnJvbkRvd24iLCJDaGV2cm9uTGVmdCIsIkNoZXZyb25SaWdodCIsIkNoZXZyb25VcCIsIkNpcmNsZUFsZXJ0IiwiRGlhbW9uZCIsIkluZm8iLCJMb2NrS2V5aG9sZSIsIlBhdXNlIiwiUGxheSIsIlNraXBCYWNrIiwiU2tpcEZvcndhcmQiLCJUcmFzaDIiLCJBQk9VVF9OQVJSQVRJVkVfR0xPQkFMX0NPTlRST0xTIiwiQUJPVVRfTkFSUkFUSVZFX0NPUlJFU1BPTkRFTkNFX01PREVTIiwiQUJPVVRfTkFSUkFUSVZFX0RJU0NJUExJTkVfUkVWRUFMX0NPTlRST0xTIiwiQUJPVVRfTkFSUkFUSVZFX0VNUEhBU0lTX1RPTkVTIiwiQUJPVVRfTkFSUkFUSVZFX01PRElGSUVSX0RFRklOSVRJT05TIiwiQUJPVVRfTkFSUkFUSVZFX1NIQVBFX0RFRklOSVRJT05TIiwiY2xlYXJBYm91dE5hcnJhdGl2ZVJlY292ZXJ5RHJhZnQiLCJleHBvcnRBYm91dE5hcnJhdGl2ZURvY3VtZW50IiwibG9hZEFib3V0TmFycmF0aXZlU291cmNlIiwicmVhZEFib3V0TmFycmF0aXZlQ2hlY2twb2ludHMiLCJyZWFkQWJvdXROYXJyYXRpdmVSZWNvdmVyeURyYWZ0Iiwic2F2ZUFib3V0TmFycmF0aXZlU291cmNlIiwid3JpdGVBYm91dE5hcnJhdGl2ZUNoZWNrcG9pbnQiLCJ3cml0ZUFib3V0TmFycmF0aXZlUmVjb3ZlcnlEcmFmdCIsImFzc2VydFZhbGlkQWJvdXROYXJyYXRpdmVEb2N1bWVudCIsImNsb25lQWJvdXROYXJyYXRpdmVEb2N1bWVudCIsImdldEFib3V0TmFycmF0aXZlQ3VlTW92ZW1lbnQiLCJnZXRBYm91dE5hcnJhdGl2ZUN1ZU1vdGlvbkludGVydmFsIiwiZ2V0QWJvdXROYXJyYXRpdmVXb3JsZFRyYW5zaXRpb25MaW1pdCIsInNhbXBsZUFib3V0TmFycmF0aXZlUGxhbiIsImNhcHR1cmVBYm91dE5hcnJhdGl2ZVBsYXloZWFkQ29udGV4dCIsImNyZWF0ZUFib3V0TmFycmF0aXZlQ3VlQ2xpcGJvYXJkUGF5bG9hZCIsImRlcml2ZUFib3V0TmFycmF0aXZlTG9vcFJhbmdlIiwiZHVwbGljYXRlQWJvdXROYXJyYXRpdmVDdWVHcm91cCIsImR1cGxpY2F0ZUFib3V0TmFycmF0aXZlU2VjdGlvbiIsImdldEFib3V0TmFycmF0aXZlQ2FtZXJhS2V5VGltaW5nQm91bmRzIiwiZ2V0QWJvdXROYXJyYXRpdmVDdWVUaW1pbmdCb3VuZHMiLCJnZXRBYm91dE5hcnJhdGl2ZUV4dGVudEZpZWxkIiwiZ2V0QWJvdXROYXJyYXRpdmVTZWxlY3Rpb25NZW1iZXJzIiwibW92ZUFib3V0TmFycmF0aXZlQ3VlVGltaW5nIiwicmVtYXBBYm91dE5hcnJhdGl2ZVBsYXloZWFkQ29udGV4dCIsInJlc29sdmVBYm91dE5hcnJhdGl2ZUNhbWVyYUtleURyb3AiLCJyZXNvbHZlQWJvdXROYXJyYXRpdmVDdWVEaXN0cmlidXRpb24iLCJyZXNvbHZlQWJvdXROYXJyYXRpdmVDdWVFeGFjdEdhcCIsInJlc29sdmVBYm91dE5hcnJhdGl2ZUN1ZUdyb3VwTW92ZSIsInJlc29sdmVBYm91dE5hcnJhdGl2ZUN1ZUdyb3VwQWxpZ24iLCJyZXNvbHZlQWJvdXROYXJyYXRpdmVDdWVHcm91cFBhc3RlIiwic25hcEFib3V0TmFycmF0aXZlVGltZWxpbmVWYWx1ZSIsInN0aXRjaEFib3V0TmFycmF0aXZlQ2FtZXJhQm91bmRhcmllcyIsInRvZ2dsZUFib3V0TmFycmF0aXZlQ3VlU2VsZWN0aW9uIiwidmFsaWRhdGVBYm91dE5hcnJhdGl2ZUN1ZUNsaXBib2FyZFBheWxvYWQiLCJjbGFtcDAxIiwidmFsdWUiLCJNYXRoIiwibWluIiwibWF4IiwiQUJPVVRfRURJVE9SX1RJTUVMSU5FX1NUT1JBR0VfS0VZIiwiVElNRUxJTkVfS0VZX0VQU0lMT04iLCJJTlNQRUNUT1JfRURHRV9HQVAiLCJDQU1FUkFfUE9TRV9GSUVMRFMiLCJTZXQiLCJESVNDSVBMSU5FX1JFVkVBTF9NQVgiLCJmaW5kIiwiY29udHJvbCIsImlkIiwiRElTQ0lQTElORV9CQUxMX1RPS0VOX0JZX0dST1VQIiwiT2JqZWN0IiwiZnJlZXplIiwiVElNRUxJTkVfR0xPQkFMX1RSQUNLUyIsImxhbmUiLCJsYWJlbCIsImdyb3VwSWRzIiwiY2FtZXJhUG9zZUNoYW5nZXMiLCJmcm9tIiwidG8iLCJzb21lIiwiZmllbGQiLCJpbmRleCIsImFicyIsImZvdiIsInJvbGwiLCJjb3B5Q2FtZXJhUG9zZSIsInRhcmdldCIsInNvdXJjZSIsIm9mZnNldCIsImxvb2tBdE9mZnNldCIsImxpbmtDYW1lcmFCb3VuZGFyeSIsImRvY3VtZW50Iiwic2VjdGlvbkluZGV4Iiwia2V5SW5kZXgiLCJzZWN0aW9uIiwic2VjdGlvbnMiLCJrZXkiLCJjYW1lcmEiLCJrZXlzIiwiYXQiLCJsZW5ndGgiLCJicmlkZ2VDYW1lcmFTZWN0aW9uIiwiZ2V0SW5zcGVjdG9yVmVydGljYWxCb3VuZHMiLCJpbnNwZWN0b3IiLCJ0aW1lbGluZU9wZW4iLCJlZGl0b3IiLCJjbG9zZXN0Iiwic3R5bGVzIiwiZ2V0Q29tcHV0ZWRTdHlsZSIsInRvcGJhckhlaWdodCIsIk51bWJlciIsInBhcnNlRmxvYXQiLCJnZXRQcm9wZXJ0eVZhbHVlIiwidGltZWxpbmVIZWlnaHQiLCJidXR0b25CYXJUb3AiLCJxdWVyeVNlbGVjdG9yIiwiZ2V0Qm91bmRpbmdDbGllbnRSZWN0IiwidG9wIiwid2luZG93IiwiaW5uZXJIZWlnaHQiLCJtaW5Ub3AiLCJtYXhCb3R0b20iLCJjbGFtcEluc3BlY3RvclBvc2l0aW9uIiwicG9zaXRpb24iLCJtYXhXaWR0aCIsImlubmVyV2lkdGgiLCJ3aWR0aCIsImF2YWlsYWJsZUhlaWdodCIsImhlaWdodCIsIm1heExlZnQiLCJtYXhUb3AiLCJsZWZ0IiwiZ2V0U2VjdGlvbkluZGV4Iiwic2VjdGlvbklkIiwiZmluZEluZGV4IiwiZ2V0U2VjdGlvbiIsInNlbGVjdGlvbiIsImdldExvY2FsUHJvZ3Jlc3MiLCJwbGFuIiwic3RvcnlXVSIsImNvbXBpbGVkIiwiaXRlbSIsInN0YXJ0V1UiLCJ0cmF2ZWxXVSIsImZvcm1hdFdVIiwidG9GaXhlZCIsImZvcm1hdENhbWVyYVBlcmNlbnQiLCJpc1RleHRFZGl0aW5nVGFyZ2V0IiwiSFRNTEVsZW1lbnQiLCJtYXRjaGVzIiwiaXNDb250ZW50RWRpdGFibGUiLCJnZXRUaW1lbGluZUtleWZyYW1lcyIsInNuYXBzaG90IiwiY29tcGlsZWRQbGFuIiwiZXZlbnRzIiwiZm9yRWFjaCIsInRvU3RvcnlXVSIsInB1c2giLCJwcmlvcml0eSIsInR5cGUiLCJ3b3JsZCIsIm1vZGUiLCJ0cmFuc2l0aW9uSW4iLCJwYXJ0IiwicGFydEluZGV4Iiwia2V5UGFydCIsInRleHQiLCJjdWVzIiwiY3VlIiwiY3VlSW5kZXgiLCJob2xkIiwiY3VlSWQiLCJkaXNjaXBsaW5lUmV2ZWFsIiwic3RhcnQiLCJpbnRlcmFjdGlvbiIsImlzRmluaXRlIiwiYWN0aXZhdGlvblN0YXJ0Iiwic29ydCIsImEiLCJiIiwiZ2V0VGltZWxpbmVEZWxldGlvbiIsInJlcXVpcmVkIiwiZGlzYWJsZWQiLCJtZXNzYWdlIiwiZXhlY3V0ZSIsInN0b3JlIiwiY29tbWl0IiwiZHJhZnQiLCJzcGxpY2UiLCJzdGFydHNXaXRoIiwidHJhbnNpdGlvbiIsImVuZCIsImRlbGV0ZVRpbWVsaW5lU2VsZWN0aW9uIiwiZGVsZXRpb24iLCJzZXRTYXZlU3RhdGUiLCJzZWVrVGltZWxpbmVLZXlmcmFtZSIsImV2ZW50Iiwic2V0U2VsZWN0aW9uIiwic2V0VHJhbnNwb3J0Iiwib3duZXIiLCJwbGF5aW5nIiwianVtcFRpbWVsaW5lS2V5ZnJhbWUiLCJkaXJlY3Rpb24iLCJjdXJyZW50V1UiLCJ0cmFuc3BvcnQiLCJ0YXJnZXRQb3NpdGlvbiIsInJldmVyc2UiLCJtYWtlU2x1ZyIsInRvTG93ZXJDYXNlIiwicmVwbGFjZSIsIm5leHRJZCIsImJhc2UiLCJ1c2VkIiwiZmxhdE1hcCIsIm1hcCIsImJsb2NrcyIsImJsb2NrIiwic3VmZml4IiwiaGFzIiwicmVwbGFjZURyYWZ0RG9jdW1lbnQiLCJuZXh0RG9jdW1lbnQiLCJhc3NpZ24iLCJhcHBseUN1ZU1vdmVzIiwibW92ZXMiLCJtb3ZlIiwiZW50ZXIiLCJleGl0IiwiUHJvcGVydHkiLCJjaGlsZHJlbiIsImhpbnQiLCJfYyIsIk51bWJlclByb3BlcnR5Iiwic3RlcCIsIm9uQ2hhbmdlIiwidW5pdCIsIl9jMiIsIlJhbmdlUHJvcGVydHkiLCJvblN0YXJ0Q2hhbmdlIiwib25FbmRDaGFuZ2UiLCJzdGFydFBlcmNlbnQiLCJlbmRQZXJjZW50IiwicGVyY2VudGFnZVN0ZXAiLCJzZXRTdGFydCIsInNldEVuZCIsInJvdW5kIiwiX2MzIiwiVHJhbnNwb3J0IiwibWF4V1UiLCJtYXhTdG9yeVdVIiwicGxheSIsInNlZWsiLCJzZWxlY3RlZCIsImp1bXBTZWN0aW9uIiwibmV4dCIsImxpdmVBbWJpZW50IiwicHJldmlld1Byb2ZpbGUiLCJzZXRQcmV2aWV3UHJvZmlsZSIsIl9jNCIsIlRpbWVsaW5lIiwib25PcGVuR2xvYmFsIiwiX3MiLCJzZWxlY3RlZEN1ZU1lbWJlcnMiLCJyZWR1Y2UiLCJzdW0iLCJleHRlbnRXVSIsInBsYXloZWFkIiwibGFuZXNSZWYiLCJ0aW1pbmdEcmFnUmVmIiwicHJldmlld0ZyYW1lUmVmIiwicGVuZGluZ1ByZXZpZXdSZWYiLCJzdXBwcmVzc2VkQ2xpY2tSZWYiLCJjYW1lcmFEcmFnUHJldmlldyIsInNldENhbWVyYURyYWdQcmV2aWV3Iiwic2VjdGlvblJlc2l6ZVByZXZpZXciLCJzZXRTZWN0aW9uUmVzaXplUHJldmlldyIsIm1hcnF1ZWUiLCJzZXRNYXJxdWVlIiwicXVldWVQcmV2aWV3RnJhbWUiLCJjYWxsYmFjayIsImN1cnJlbnQiLCJyZXF1ZXN0QW5pbWF0aW9uRnJhbWUiLCJwZW5kaW5nIiwiZmx1c2hQcmV2aWV3RnJhbWUiLCJjYW5jZWxBbmltYXRpb25GcmFtZSIsInpvb21UaW1lbGluZSIsImN0cmxLZXkiLCJtZXRhS2V5IiwicHJldmVudERlZmF1bHQiLCJsYW5lcyIsInJlY3QiLCJwb2ludGVyWCIsImNsaWVudFgiLCJzdG9yeVJhdGlvIiwic2Nyb2xsTGVmdCIsInNjcm9sbFdpZHRoIiwiY3VycmVudFpvb20iLCJ6b29tIiwibmV4dFpvb20iLCJleHAiLCJkZWx0YVkiLCJyZXNvbHZlQ2FtZXJhRHJvcEF0Q2xpZW50WCIsImdldFNuYXBzaG90IiwidmFsaWQiLCJyZWFzb24iLCJjb250ZW50WCIsImRyYWciLCJkcm9wIiwic291cmNlU2VjdGlvbkluZGV4Iiwic291cmNlS2V5SW5kZXgiLCJiZWdpblRpbWluZ0RyYWciLCJsb2NrZWQiLCJidXR0b24iLCJjbGlwIiwiY3VycmVudFRhcmdldCIsInBhcmVudEVsZW1lbnQiLCJzdG9wUHJvcGFnYXRpb24iLCJzZXRQb2ludGVyQ2FwdHVyZSIsInBvaW50ZXJJZCIsIm5leHRTZWxlY3Rpb24iLCJjdXJyZW50U2VsZWN0aW9uIiwiY3VycmVudE1lbWJlcnMiLCJhbHJlYWR5U2VsZWN0ZWQiLCJtZW1iZXIiLCJzaGlmdEtleSIsIm1lbWJlcnMiLCJiZWdpblByZXZpZXciLCJzdGFydERvY3VtZW50Iiwic3RhcnRQbGFuIiwic3RhcnRYIiwibW92ZWQiLCJsYXN0QXQiLCJsYXN0RHJvcCIsIm1vdmVUaW1pbmdEcmFnIiwidG9rZW4iLCJkZWx0YUxhbmUiLCJuZXh0QXQiLCJkZWx0YSIsInJldmVhbCIsImNvYWxlc2NlS2V5Iiwic2VjdGlvblN0YXJ0V1UiLCJsb2NhbERlbHRhIiwibW92ZW1lbnQiLCJwcmltYXJ5IiwiZGVsdGFXVSIsImxhc3REZWx0YVdVIiwidXBkYXRlUHJldmlldyIsImVuZFRpbWluZ0RyYWciLCJoYXNQb2ludGVyQ2FwdHVyZSIsInJlbGVhc2VQb2ludGVyQ2FwdHVyZSIsImNhbmNlbFByZXZpZXciLCJjb21taXRQcmV2aWV3Iiwic291cmNlS2V5cyIsIm1vdmVkS2V5IiwiZGVzdGluYXRpb25LZXlzIiwic2V0VGltZW91dCIsImhhbmRsZVRpbWluZ0NsaWNrIiwiYWN0aW9uIiwiYmVnaW5TZWN0aW9uUmVzaXplIiwiZGF0YSIsInNlY3Rpb25MYWJlbCIsInN0YXJ0RXh0ZW50Iiwic3RhcnRNYXhXVSIsInN0YXJ0U2Nyb2xsV2lkdGgiLCJwbGF5aGVhZENvbnRleHQiLCJyZXNpemVkU2VjdGlvbklkIiwiZXh0ZW50IiwibW92ZVNlY3Rpb25SZXNpemUiLCJyYXdFeHRlbnQiLCJhbHRLZXkiLCJsYXN0RXh0ZW50IiwiZW5kU2VjdGlvblJlc2l6ZSIsInJlc2V0U2VjdGlvbkV4dGVudCIsImJhc2VsaW5lU2VjdGlvbiIsImJhc2VsaW5lRG9jdW1lbnQiLCJjb250ZXh0IiwiYmVnaW5NYXJxdWVlIiwiY2FudmFzIiwic3RhcnRDbGllbnRYIiwic3RhcnRDbGllbnRZIiwiY2xpZW50WSIsImNhbnZhc1JlY3QiLCJhZGRpdGl2ZSIsIm1vdmVNYXJxdWVlIiwiZW5kTWFycXVlZSIsInNlbGVjdGlvblJlY3QiLCJyaWdodCIsImJvdHRvbSIsImxhbmVSZWN0IiwiaGl0cyIsInF1ZXJ5U2VsZWN0b3JBbGwiLCJmaWx0ZXIiLCJub2RlIiwidmlzaWJsZSIsImRhdGFzZXQiLCJzbGljZSIsImhpdCIsInRyYWNrIiwidHJhY2tMYWJlbCIsInNvbG9UcmFjayIsIm5leHRTdGFydFdVIiwic3BhbldVIiwiaW5TZWxlY3RlZFNlY3Rpb24iLCJsb2NhbFBlcmNlbnQiLCJsb2NhbFBvc2l0aW9uIiwiZXh0ZW5kZWRMb2NhbFBvc2l0aW9uIiwiZXh0ZW5kZWRMb2NhbFdpZHRoIiwidGV4dFBvc2l0aW9uIiwic2VsZWN0QXQiLCJpc1NlbGVjdGVkIiwicmVzaXplRXh0ZW50IiwicmVzb2x2ZWRFeHRlbnRXVSIsIlN0cmluZyIsInBhZFN0YXJ0IiwiZnJvbUtleSIsInRpbWluZ0JvdW5kcyIsImtleVNlbGVjdGlvbiIsInVuZGVmaW5lZCIsInNoYXBlSWQiLCJpc1ByaW1hcnkiLCJtb3Rpb25JbnRlcnZhbCIsImdsb2JhbHMiLCJ0ZXh0TW90aW9uIiwibW90aW9uU3BhbiIsImN1ZVN0eWxlIiwiZm9jdXNQb3NpdGlvbiIsImN1ZVNlbGVjdGlvbiIsImNvZGUiLCJkdXJhdGlvbiIsImNlbnRyZSIsInJldmVhbFNlbGVjdGlvbiIsImFjdGl2YXRpb24iLCJTZXF1ZW5jZUluc3BlY3RvciIsImNvbW1pdEdsb2JhbCIsImdyb3VwIiwidGFyZ2V0S2V5IiwicmVxdWVzdGVkR3JvdXBJZHMiLCJncm91cHMiLCJpbmNsdWRlcyIsImhlYWRpbmciLCJjb250cm9scyIsInJlYWRhYmxlU3RhcnQiLCJyZWFkYWJsZUVuZCIsIl9jNiIsIlNlY3Rpb25JbnNwZWN0b3IiLCJjb21waWxlZFNlY3Rpb24iLCJhY3RpdmVFeHRlbnRGaWVsZCIsImFjdGl2ZUV4dGVudCIsInJlc29sdmVkRXh0ZW50IiwiY29udGVudE1pbmltdW1BY3RpdmUiLCJ1cGRhdGUiLCJtdXRhdGUiLCJ0b0luZGV4IiwiZHVwbGljYXRlIiwicmVzdWx0IiwibW9iaWxlRXh0ZW50V1UiLCJsb2NhbCIsImZvY3VzIiwicHJlc2V0IiwibW90aW9uIiwiX2M3IiwiRWRpdG9yaWFsQmxvY2tzIiwidXBkYXRlQmxvY2siLCJibG9ja0luZGV4IiwidXBkYXRlRW1waGFzaXMiLCJlbXBoYXNpc0luZGV4IiwiZW1waGFzaXMiLCJhZGRFbXBoYXNpcyIsInRyaW0iLCJzcGxpdCIsImpvaW4iLCJ0b25lIiwicmVtb3ZlRW1waGFzaXMiLCJraW5kIiwid29ybGRJbmZsdWVuY2UiLCJjaGVja2VkIiwiaXRlbXMiLCJCb29sZWFuIiwiX2M4IiwiQ3VlUmh5dGhtQW5kUmV1c2UiLCJjbGlwYm9hcmQiLCJzZXRDbGlwYm9hcmQiLCJfczIiLCJnYXBXVSIsInNldEdhcFdVIiwiYW5jaG9yIiwic2V0QW5jaG9yIiwicHJldmlldyIsInNldFByZXZpZXciLCJzZXRNZXNzYWdlIiwicHJldmlld01vdmVzIiwidHJ5U3RhdGUiLCJjYW5jZWxUcnkiLCJiZWdpblRyeSIsImFwcGx5UHJldmlldyIsImFwcGx5VHJ5IiwiY29tbWl0Q2FuZGlkYXRlIiwiZGlzdHJpYnV0ZSIsImV4YWN0R2FwIiwiYWxpZ25QcmltYXJ5IiwicGxheWhlYWRXVSIsImNvcHkiLCJwYXlsb2FkIiwidmFsaWRhdGlvbiIsInBhc3RlIiwiZGVzdGluYXRpb25TZWN0aW9uSWQiLCJnaG9zdE1vdmVzIiwiQ3VlSW5zcGVjdG9yIiwic2VsZWN0ZWRNZW1iZXJzIiwicmVtb3ZlIiwibW92ZUN1ZSIsInBlcmNlbnQiLCJ1cGRhdGVNb3ZlbWVudCIsIm1lbWJlclNlY3Rpb24iLCJtZW1iZXJDdWUiLCJfYzAiLCJEaXNjaXBsaW5lUmV2ZWFsSW5zcGVjdG9yIiwib2NjdXBpZWQiLCJzdGFnZ2VyIiwibGFiZWxEdXJhdGlvbiIsImxpbWl0c0ZvciIsImxpbWl0cyIsIml0ZW1JbmRleCIsImJhY2tncm91bmQiLCJfYzEiLCJDYW1lcmFJbnNwZWN0b3IiLCJzZWxlY3RlZEtleSIsInRhcmdldEF0IiwiYXBwbHlQcmVzZXQiLCJyZWNpcGVzIiwiUHVzaCIsImVhc2luZyIsIkdsaWRlIiwiT3JiaXQiLCJSZXZlYWwiLCJSZXNvbHZlIiwiZXhpc3RpbmdLZXlBdFBsYXloZWFkIiwic2V0S2V5IiwiaW5zZXJ0aW9uSW5kZXgiLCJzZWxlY3RlZEtleUluZGV4Iiwic2FtcGxlZCIsImJhc2VaIiwic3RhcnRaIiwiY2FkZW5jZSIsIm5ld0tleSIsImF4aXMiLCJuYW1lIiwiQXJyYXkiLCJpc0FycmF5IiwidXBkYXRlVmVjdG9yIiwiZXh0ZW50RmllbGQiLCJleHRlbnRMYWJlbCIsInVwZGF0ZUV4dGVudCIsIl9jMTAiLCJDT1JSRVNQT05ERU5DRV9MQUJFTFMiLCJXb3JsZEluc3BlY3RvciIsInJ1bnRpbWVNZXRyaWNzIiwic2hhcGUiLCJ0cmFuc2l0aW9uTGltaXQiLCJ0cmFuc2l0aW9uTWF4IiwidHJhbnNpdGlvbkVuYWJsZWQiLCJjb3JyZXNwb25kZW5jZUVuYWJsZWQiLCJwcmV2aW91c1dvcmxkU2VjdGlvbiIsInNvdXJjZVNoYXBlIiwicHJlcGFyZWQiLCJwcmVwYXJlZFdvcmxkSWRzIiwiY29ycmVzcG9uZGVuY2VTdGF0dXMiLCJjb3JyZXNwb25kZW5jZVNlcXVlbmNlU3RhdGUiLCJjb3JyZXNwb25kZW5jZUZhbGxiYWNrIiwiY29ycmVzcG9uZGVuY2VUb1dvcmxkSWQiLCJ0cnlTaGFwZSIsInNoYXBlUGFyYW1ldGVycyIsImZyb21FbnRyaWVzIiwicGFyYW1ldGVycyIsInZhbHVlcyIsImNvc3QiLCJzZWVkIiwiZmxvb3IiLCJyYW5kb20iLCJlbnRyeURpc3RhbmNlV1UiLCJ0cmFuc2Zvcm0iLCJzY2FsZSIsImNvcnJlc3BvbmRlbmNlIiwiY29ycmVzcG9uZGVuY2VJbXByb3ZlbWVudCIsIm1vZGlmaWVycyIsIm1vZGlmaWVySW5kZXgiLCJkZWZpbml0aW9uIiwibW92ZU1vZGlmaWVyIiwibmV4dEluZGV4IiwiZW5hYmxlZCIsIm9wdGlvbnMiLCJvcHRpb24iLCJfYzExIiwiRGlhZ25vc3RpY3MiLCJkaWFnbm9zdGljcyIsIkRpYWdub3N0aWNJY29uIiwibGV2ZWwiLCJwYXRoIiwiX2MxMiIsIkF1ZGl0aW9uQ29udHJvbHMiLCJfczMiLCJwcmVSb2xsV1UiLCJzZXRQcmVSb2xsV1UiLCJwb3N0Um9sbFdVIiwic2V0UG9zdFJvbGxXVSIsInJhbmdlIiwiYWN0aXZlIiwibG9vcCIsInNvdXJjZVR5cGUiLCJzb3VyY2VJZCIsInRvZ2dsZSIsImVuZFdVIiwiSW5zcGVjdG9yIiwiX3M0IiwiaW5zcGVjdG9yUmVmIiwiZHJhZ1JlZiIsImxhc3RIZWFkZXJDbGlja1JlZiIsInNldFBvc2l0aW9uIiwiZHJhZ2dpbmciLCJzZXREcmFnZ2luZyIsImNvbnRlbnQiLCJrZWVwSW5Cb3VuZHMiLCJhZGRFdmVudExpc3RlbmVyIiwicmVtb3ZlRXZlbnRMaXN0ZW5lciIsImJlZ2luRHJhZyIsImZsb2F0aW5nSGVpZ2h0Iiwib3JpZ2luWCIsIm9yaWdpblkiLCJtb3ZlRHJhZyIsImRlbHRhWCIsImh5cG90IiwiZW5kRHJhZyIsIm5vdyIsInBlcmZvcm1hbmNlIiwicHJldmlvdXMiLCJ0aW1lIiwieCIsInkiLCJyZXNldFBvc2l0aW9uIiwiQ2FtZXJhUGF0aE92ZXJsYXkiLCJ0b3RhbCIsIndvcmxkU3RhdGUiLCJjaGFuZ2VzV29ybGQiLCJhY3RpdmVXb3JsZCIsIl9jMTUiLCJBYm91dE5hcnJhdGl2ZUVkaXRvciIsInJ1bnRpbWVSZWYiLCJyb290UmVmIiwiX3M1Iiwic3Vic2NyaWJlIiwiY2hlY2twb2ludHMiLCJzZXRDaGVja3BvaW50cyIsInNldFJ1bnRpbWVNZXRyaWNzIiwicGF0aFZpc2libGUiLCJzZXRQYXRoVmlzaWJsZSIsImRpcmVjdG9yVmlldyIsInNldERpcmVjdG9yVmlldyIsIm1vYmlsZVBhbmUiLCJzZXRNb2JpbGVQYW5lIiwic2V0VGltZWxpbmVPcGVuIiwibG9jYWxTdG9yYWdlIiwiZ2V0SXRlbSIsImltcG9ydFJlZiIsInNuYXBzaG90UmVmIiwiYWN0aXZlU2VsZWN0aW9uIiwic2V0SXRlbSIsInJvb3QiLCJydW50aW1lIiwic2V0QXR0cmlidXRlIiwidGhlbiIsImhhc2giLCJkaXJ0eSIsInJlcGxhY2VEb2N1bWVudCIsInNldEJhc2VsaW5lIiwicmVjb3ZlcnkiLCJ0aW1lc3RhbXAiLCJEYXRlIiwic2V0UmVjb3ZlcnlTdGF0ZSIsImF2YWlsYWJsZSIsImVycm9yIiwiY2F0Y2giLCJzdGF0dXMiLCJyZW1vdmVBdHRyaWJ1dGUiLCJjbGFzc0xpc3QiLCJDU1MiLCJlc2NhcGUiLCJhZGQiLCJlZGl0b3JTZWxlY3Rpb25UeXBlIiwiaW50ZXJ2YWwiLCJzZXRJbnRlcnZhbCIsImdldE1ldHJpY3MiLCJjbGVhckludGVydmFsIiwidGltZXIiLCJiYXNlbGluZUhhc2giLCJjbGVhclRpbWVvdXQiLCJwYWdlaGlkZSIsImtleWRvd24iLCJjbGljayIsInJlZG8iLCJ1bmRvIiwicHJldmlld1N0YXRlIiwic2F2ZSIsImVkaXRvclVybCIsIlVSTCIsImxvY2F0aW9uIiwiaHJlZiIsInNlYXJjaFBhcmFtcyIsInNldCIsImhpc3RvcnkiLCJyZXBsYWNlU3RhdGUiLCJzdGF0ZSIsInBhdGhuYW1lIiwic2VhcmNoIiwic2VudCIsIm1hcmtTYXZlZCIsImFkZENoZWNrcG9pbnQiLCJjaGVja3BvaW50IiwiY3J5cHRvIiwicmFuZG9tVVVJRCIsInRvTG9jYWxlVGltZVN0cmluZyIsImhvdXIiLCJtaW51dGUiLCJiYXNlU291cmNlSGFzaCIsInN0YXR1c0xhYmVsIiwic2F2ZVN0YXRlIiwiY29tcGlsZWRTZWxlY3RlZCIsInNlbGVjdGVkRXh0ZW50Iiwic2VsZWN0ZWRDdWVDb3VudCIsImxvb3BBY3RpdmUiLCJ0aW1lbGluZURlbGV0aW9uIiwidG9nZ2xlTG9vcCIsInRvZ2dsZVNvbG8iLCJmaXRTZXF1ZW5jZSIsImZpdFNlY3Rpb24iLCJzZWN0aW9uU3BhbiIsInN0YXJ0UmF0aW8iLCJjbGllbnRXaWR0aCIsInRvZ2dsZURpcmVjdG9yIiwidG9nZ2xlQmVmb3JlIiwiY2FuVW5kbyIsInVuZG9MYWJlbCIsImNhblJlZG8iLCJyZWRvTGFiZWwiLCJmaWxlIiwiZmlsZXMiLCJpbXBvcnRlZCIsIkpTT04iLCJwYXJzZSIsInJlY292ZXJ5U3RhdGUiLCJ0b0xvY2FsZVN0cmluZyIsIm51ZGdlRGlyZWN0b3IiLCJ5YXciLCJwaXRjaCIsImRpc3RhbmNlIiwicmVzZXREaXJlY3RvciIsIm9wZW4iLCJhdXRvS2V5Iiwic2V0QXV0b0tleSIsImZyYW1lVGltZU1zIiwiZHJhd0NhbGxzIiwicG9pbnRDb3VudCIsImFjdGl2ZU1vZGlmaWVycyIsImJ1ZmZlclJlYnVpbGRzIiwiZm91bmQiLCJib2R5IiwiX2M1IiwiX2M5IiwiX2MxMyIsIl9jMTQiLCJfYzE2Il0sImlnbm9yZUxpc3QiOltdLCJzb3VyY2VzIjpbIkFib3V0TmFycmF0aXZlRWRpdG9yLmpzeCJdLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgeyB1c2VFZmZlY3QsIHVzZVJlZiwgdXNlU3RhdGUsIHVzZVN5bmNFeHRlcm5hbFN0b3JlIH0gZnJvbSAncmVhY3QnO1xuaW1wb3J0IHsgY3JlYXRlUG9ydGFsIH0gZnJvbSAncmVhY3QtZG9tJztcbmltcG9ydCB7XG4gIENoZWNrLFxuICBDaGV2cm9uRG93bixcbiAgQ2hldnJvbkxlZnQsXG4gIENoZXZyb25SaWdodCxcbiAgQ2hldnJvblVwLFxuICBDaXJjbGVBbGVydCxcbiAgRGlhbW9uZCxcbiAgSW5mbyxcbiAgTG9ja0tleWhvbGUsXG4gIFBhdXNlLFxuICBQbGF5LFxuICBTa2lwQmFjayxcbiAgU2tpcEZvcndhcmQsXG4gIFRyYXNoMixcbn0gZnJvbSAnbHVjaWRlLXJlYWN0JztcbmltcG9ydCB7XG4gIEFCT1VUX05BUlJBVElWRV9HTE9CQUxfQ09OVFJPTFMsXG4gIEFCT1VUX05BUlJBVElWRV9DT1JSRVNQT05ERU5DRV9NT0RFUyxcbiAgQUJPVVRfTkFSUkFUSVZFX0RJU0NJUExJTkVfUkVWRUFMX0NPTlRST0xTLFxuICBBQk9VVF9OQVJSQVRJVkVfRU1QSEFTSVNfVE9ORVMsXG4gIEFCT1VUX05BUlJBVElWRV9NT0RJRklFUl9ERUZJTklUSU9OUyxcbiAgQUJPVVRfTkFSUkFUSVZFX1NIQVBFX0RFRklOSVRJT05TLFxufSBmcm9tICcuL2Fib3V0TmFycmF0aXZlRGVmaW5pdGlvbnMuanMnO1xuaW1wb3J0IHtcbiAgY2xlYXJBYm91dE5hcnJhdGl2ZVJlY292ZXJ5RHJhZnQsXG4gIGV4cG9ydEFib3V0TmFycmF0aXZlRG9jdW1lbnQsXG4gIGxvYWRBYm91dE5hcnJhdGl2ZVNvdXJjZSxcbiAgcmVhZEFib3V0TmFycmF0aXZlQ2hlY2twb2ludHMsXG4gIHJlYWRBYm91dE5hcnJhdGl2ZVJlY292ZXJ5RHJhZnQsXG4gIHNhdmVBYm91dE5hcnJhdGl2ZVNvdXJjZSxcbiAgd3JpdGVBYm91dE5hcnJhdGl2ZUNoZWNrcG9pbnQsXG4gIHdyaXRlQWJvdXROYXJyYXRpdmVSZWNvdmVyeURyYWZ0LFxufSBmcm9tICcuL2Fib3V0TmFycmF0aXZlUGVyc2lzdGVuY2UuanMnO1xuaW1wb3J0IHtcbiAgYXNzZXJ0VmFsaWRBYm91dE5hcnJhdGl2ZURvY3VtZW50LFxuICBjbG9uZUFib3V0TmFycmF0aXZlRG9jdW1lbnQsXG59IGZyb20gJy4vYWJvdXROYXJyYXRpdmVTY2hlbWEuanMnO1xuaW1wb3J0IHtcbiAgZ2V0QWJvdXROYXJyYXRpdmVDdWVNb3ZlbWVudCxcbiAgZ2V0QWJvdXROYXJyYXRpdmVDdWVNb3Rpb25JbnRlcnZhbCxcbiAgZ2V0QWJvdXROYXJyYXRpdmVXb3JsZFRyYW5zaXRpb25MaW1pdCxcbiAgc2FtcGxlQWJvdXROYXJyYXRpdmVQbGFuLFxufSBmcm9tICcuL2Fib3V0TmFycmF0aXZlQ29tcGlsZXIuanMnO1xuaW1wb3J0IHtcbiAgY2FwdHVyZUFib3V0TmFycmF0aXZlUGxheWhlYWRDb250ZXh0LFxuICBjcmVhdGVBYm91dE5hcnJhdGl2ZUN1ZUNsaXBib2FyZFBheWxvYWQsXG4gIGRlcml2ZUFib3V0TmFycmF0aXZlTG9vcFJhbmdlLFxuICBkdXBsaWNhdGVBYm91dE5hcnJhdGl2ZUN1ZUdyb3VwLFxuICBkdXBsaWNhdGVBYm91dE5hcnJhdGl2ZVNlY3Rpb24sXG4gIGdldEFib3V0TmFycmF0aXZlQ2FtZXJhS2V5VGltaW5nQm91bmRzLFxuICBnZXRBYm91dE5hcnJhdGl2ZUN1ZVRpbWluZ0JvdW5kcyxcbiAgZ2V0QWJvdXROYXJyYXRpdmVFeHRlbnRGaWVsZCxcbiAgZ2V0QWJvdXROYXJyYXRpdmVTZWxlY3Rpb25NZW1iZXJzLFxuICBtb3ZlQWJvdXROYXJyYXRpdmVDdWVUaW1pbmcsXG4gIHJlbWFwQWJvdXROYXJyYXRpdmVQbGF5aGVhZENvbnRleHQsXG4gIHJlc29sdmVBYm91dE5hcnJhdGl2ZUNhbWVyYUtleURyb3AsXG4gIHJlc29sdmVBYm91dE5hcnJhdGl2ZUN1ZURpc3RyaWJ1dGlvbixcbiAgcmVzb2x2ZUFib3V0TmFycmF0aXZlQ3VlRXhhY3RHYXAsXG4gIHJlc29sdmVBYm91dE5hcnJhdGl2ZUN1ZUdyb3VwTW92ZSxcbiAgcmVzb2x2ZUFib3V0TmFycmF0aXZlQ3VlR3JvdXBBbGlnbixcbiAgcmVzb2x2ZUFib3V0TmFycmF0aXZlQ3VlR3JvdXBQYXN0ZSxcbiAgc25hcEFib3V0TmFycmF0aXZlVGltZWxpbmVWYWx1ZSxcbiAgc3RpdGNoQWJvdXROYXJyYXRpdmVDYW1lcmFCb3VuZGFyaWVzLFxuICB0b2dnbGVBYm91dE5hcnJhdGl2ZUN1ZVNlbGVjdGlvbixcbiAgdmFsaWRhdGVBYm91dE5hcnJhdGl2ZUN1ZUNsaXBib2FyZFBheWxvYWQsXG59IGZyb20gJy4vYWJvdXROYXJyYXRpdmVUaW1lbGluZS5qcyc7XG5pbXBvcnQgJy4vYWJvdXQtbmFycmF0aXZlLWVkaXRvci5jc3MnO1xuXG5jb25zdCBjbGFtcDAxID0gKHZhbHVlKSA9PiBNYXRoLm1pbigxLCBNYXRoLm1heCgwLCB2YWx1ZSkpO1xuY29uc3QgQUJPVVRfRURJVE9SX1RJTUVMSU5FX1NUT1JBR0VfS0VZID0gJ2FiczphYm91dC1uYXJyYXRpdmU6dGltZWxpbmUtb3Blbjp2MSc7XG5jb25zdCBUSU1FTElORV9LRVlfRVBTSUxPTiA9IDAuMDA0O1xuY29uc3QgSU5TUEVDVE9SX0VER0VfR0FQID0gODtcbmNvbnN0IENBTUVSQV9QT1NFX0ZJRUxEUyA9IG5ldyBTZXQoWydvZmZzZXQnLCAnbG9va0F0T2Zmc2V0JywgJ2ZvdicsICdyb2xsJ10pO1xuY29uc3QgRElTQ0lQTElORV9SRVZFQUxfTUFYID0gQUJPVVRfTkFSUkFUSVZFX0RJU0NJUExJTkVfUkVWRUFMX0NPTlRST0xTXG4gIC5maW5kKChjb250cm9sKSA9PiBjb250cm9sLmlkID09PSAnZW5kJyk/Lm1heCB8fCA0O1xuY29uc3QgRElTQ0lQTElORV9CQUxMX1RPS0VOX0JZX0dST1VQID0gT2JqZWN0LmZyZWV6ZSh7XG4gIDE6ICctLWJhbGwtMScsXG4gIDI6ICctLWJhbGwtNCcsXG4gIDM6ICctLWJhbGwtMycsXG4gIDQ6ICctLWJhbGwtNycsXG4gIDU6ICctLWJhbGwtOCcsXG4gIDY6ICctLWJhbGwtNicsXG59KTtcbmNvbnN0IFRJTUVMSU5FX0dMT0JBTF9UUkFDS1MgPSBPYmplY3QuZnJlZXplKFtcbiAgT2JqZWN0LmZyZWV6ZSh7IGxhbmU6ICdzZWN0aW9uJywgbGFiZWw6ICdTZWN0aW9ucycsIGdyb3VwSWRzOiBPYmplY3QuZnJlZXplKFsnc2VxdWVuY2UnXSkgfSksXG4gIE9iamVjdC5mcmVlemUoeyBsYW5lOiAnY2FtZXJhJywgbGFiZWw6ICdDYW1lcmEnLCBncm91cElkczogT2JqZWN0LmZyZWV6ZShbJ2NhbWVyYSddKSB9KSxcbiAgT2JqZWN0LmZyZWV6ZSh7IGxhbmU6ICd3b3JsZCcsIGxhYmVsOiAnV29ybGQnLCBncm91cElkczogT2JqZWN0LmZyZWV6ZShbJ21hdGVyaWFsJywgJ3N3YXJtVHVyYnVsZW5jZSddKSB9KSxcbiAgT2JqZWN0LmZyZWV6ZSh7IGxhbmU6ICd0ZXh0JywgbGFiZWw6ICdUZXh0JywgZ3JvdXBJZHM6IE9iamVjdC5mcmVlemUoWyd0ZXh0TW90aW9uJ10pIH0pLFxuICBPYmplY3QuZnJlZXplKHsgbGFuZTogJ2ludGVyYWN0aW9uJywgbGFiZWw6ICdJbnRlcmFjdGlvbicsIGdyb3VwSWRzOiBPYmplY3QuZnJlZXplKFtdKSB9KSxcbl0pO1xuXG5mdW5jdGlvbiBjYW1lcmFQb3NlQ2hhbmdlcyhmcm9tLCB0bykge1xuICBpZiAoIWZyb20gfHwgIXRvKSByZXR1cm4gZmFsc2U7XG4gIHJldHVybiBbJ29mZnNldCcsICdsb29rQXRPZmZzZXQnXS5zb21lKChmaWVsZCkgPT4gKFxuICAgIGZyb21bZmllbGRdLnNvbWUoKHZhbHVlLCBpbmRleCkgPT4gTWF0aC5hYnModmFsdWUgLSB0b1tmaWVsZF1baW5kZXhdKSA+IDAuMDAwMSlcbiAgKSkgfHwgTWF0aC5hYnMoZnJvbS5mb3YgLSB0by5mb3YpID4gMC4wMDAxIHx8IE1hdGguYWJzKGZyb20ucm9sbCAtIHRvLnJvbGwpID4gMC4wMDAxO1xufVxuXG5mdW5jdGlvbiBjb3B5Q2FtZXJhUG9zZSh0YXJnZXQsIHNvdXJjZSkge1xuICB0YXJnZXQub2Zmc2V0ID0gWy4uLnNvdXJjZS5vZmZzZXRdO1xuICB0YXJnZXQubG9va0F0T2Zmc2V0ID0gWy4uLnNvdXJjZS5sb29rQXRPZmZzZXRdO1xuICB0YXJnZXQuZm92ID0gc291cmNlLmZvdjtcbiAgdGFyZ2V0LnJvbGwgPSBzb3VyY2Uucm9sbDtcbn1cblxuZnVuY3Rpb24gbGlua0NhbWVyYUJvdW5kYXJ5KGRvY3VtZW50LCBzZWN0aW9uSW5kZXgsIGtleUluZGV4KSB7XG4gIGNvbnN0IHNlY3Rpb24gPSBkb2N1bWVudC5zZWN0aW9uc1tzZWN0aW9uSW5kZXhdO1xuICBjb25zdCBrZXkgPSBzZWN0aW9uPy5jYW1lcmEua2V5c1trZXlJbmRleF07XG4gIGlmICgha2V5KSByZXR1cm47XG4gIGlmIChrZXlJbmRleCA9PT0gMCAmJiBzZWN0aW9uSW5kZXggPiAwKSB7XG4gICAgY29weUNhbWVyYVBvc2UoZG9jdW1lbnQuc2VjdGlvbnNbc2VjdGlvbkluZGV4IC0gMV0uY2FtZXJhLmtleXMuYXQoLTEpLCBrZXkpO1xuICB9XG4gIGlmIChrZXlJbmRleCA9PT0gc2VjdGlvbi5jYW1lcmEua2V5cy5sZW5ndGggLSAxICYmIHNlY3Rpb25JbmRleCA8IGRvY3VtZW50LnNlY3Rpb25zLmxlbmd0aCAtIDEpIHtcbiAgICBjb3B5Q2FtZXJhUG9zZShkb2N1bWVudC5zZWN0aW9uc1tzZWN0aW9uSW5kZXggKyAxXS5jYW1lcmEua2V5c1swXSwga2V5KTtcbiAgfVxufVxuXG5mdW5jdGlvbiBicmlkZ2VDYW1lcmFTZWN0aW9uKGRvY3VtZW50LCBzZWN0aW9uSW5kZXgpIHtcbiAgY29uc3Qgc2VjdGlvbiA9IGRvY3VtZW50LnNlY3Rpb25zW3NlY3Rpb25JbmRleF07XG4gIGlmICghc2VjdGlvbj8uY2FtZXJhLmtleXMubGVuZ3RoKSByZXR1cm47XG4gIGlmIChzZWN0aW9uSW5kZXggPiAwKSBjb3B5Q2FtZXJhUG9zZShzZWN0aW9uLmNhbWVyYS5rZXlzWzBdLCBkb2N1bWVudC5zZWN0aW9uc1tzZWN0aW9uSW5kZXggLSAxXS5jYW1lcmEua2V5cy5hdCgtMSkpO1xuICBpZiAoc2VjdGlvbkluZGV4IDwgZG9jdW1lbnQuc2VjdGlvbnMubGVuZ3RoIC0gMSkgY29weUNhbWVyYVBvc2Uoc2VjdGlvbi5jYW1lcmEua2V5cy5hdCgtMSksIGRvY3VtZW50LnNlY3Rpb25zW3NlY3Rpb25JbmRleCArIDFdLmNhbWVyYS5rZXlzWzBdKTtcbn1cblxuZnVuY3Rpb24gZ2V0SW5zcGVjdG9yVmVydGljYWxCb3VuZHMoaW5zcGVjdG9yLCB0aW1lbGluZU9wZW4pIHtcbiAgY29uc3QgZWRpdG9yID0gaW5zcGVjdG9yLmNsb3Nlc3QoJy5hYm91dC1lZGl0b3InKTtcbiAgY29uc3Qgc3R5bGVzID0gZWRpdG9yID8gZ2V0Q29tcHV0ZWRTdHlsZShlZGl0b3IpIDogbnVsbDtcbiAgY29uc3QgdG9wYmFySGVpZ2h0ID0gTnVtYmVyLnBhcnNlRmxvYXQoc3R5bGVzPy5nZXRQcm9wZXJ0eVZhbHVlKCctLWFib3V0LWVkaXRvci10b3BiYXInKSkgfHwgNDQ7XG4gIGNvbnN0IHRpbWVsaW5lSGVpZ2h0ID0gdGltZWxpbmVPcGVuXG4gICAgPyBOdW1iZXIucGFyc2VGbG9hdChzdHlsZXM/LmdldFByb3BlcnR5VmFsdWUoJy0tYWJvdXQtZWRpdG9yLXRpbWVsaW5lJykpIHx8IDE4OFxuICAgIDogMDtcbiAgY29uc3QgYnV0dG9uQmFyVG9wID0gZG9jdW1lbnQucXVlcnlTZWxlY3RvcignW2RhdGEtYnV0dG9uLWJhcl0nKT8uZ2V0Qm91bmRpbmdDbGllbnRSZWN0KCkudG9wXG4gICAgPz8gd2luZG93LmlubmVySGVpZ2h0O1xuICByZXR1cm4ge1xuICAgIG1pblRvcDogdG9wYmFySGVpZ2h0ICsgSU5TUEVDVE9SX0VER0VfR0FQLFxuICAgIG1heEJvdHRvbTogKHRpbWVsaW5lT3BlbiA/IHdpbmRvdy5pbm5lckhlaWdodCAtIHRpbWVsaW5lSGVpZ2h0IDogYnV0dG9uQmFyVG9wKSAtIElOU1BFQ1RPUl9FREdFX0dBUCxcbiAgfTtcbn1cblxuZnVuY3Rpb24gY2xhbXBJbnNwZWN0b3JQb3NpdGlvbihpbnNwZWN0b3IsIHBvc2l0aW9uLCB0aW1lbGluZU9wZW4pIHtcbiAgY29uc3QgeyBtaW5Ub3AsIG1heEJvdHRvbSB9ID0gZ2V0SW5zcGVjdG9yVmVydGljYWxCb3VuZHMoaW5zcGVjdG9yLCB0aW1lbGluZU9wZW4pO1xuICBjb25zdCBtYXhXaWR0aCA9IE1hdGgubWF4KDI0MCwgd2luZG93LmlubmVyV2lkdGggLSAoSU5TUEVDVE9SX0VER0VfR0FQICogMikpO1xuICBjb25zdCB3aWR0aCA9IE1hdGgubWluKHBvc2l0aW9uLndpZHRoLCBtYXhXaWR0aCk7XG4gIGNvbnN0IGF2YWlsYWJsZUhlaWdodCA9IE1hdGgubWF4KDI0MCwgbWF4Qm90dG9tIC0gbWluVG9wKTtcbiAgY29uc3QgaGVpZ2h0ID0gTWF0aC5taW4ocG9zaXRpb24uaGVpZ2h0LCBhdmFpbGFibGVIZWlnaHQpO1xuICBjb25zdCBtYXhMZWZ0ID0gTWF0aC5tYXgoSU5TUEVDVE9SX0VER0VfR0FQLCB3aW5kb3cuaW5uZXJXaWR0aCAtIHdpZHRoIC0gSU5TUEVDVE9SX0VER0VfR0FQKTtcbiAgY29uc3QgbWF4VG9wID0gTWF0aC5tYXgobWluVG9wLCBtYXhCb3R0b20gLSBoZWlnaHQpO1xuICByZXR1cm4ge1xuICAgIGxlZnQ6IE1hdGgubWluKG1heExlZnQsIE1hdGgubWF4KElOU1BFQ1RPUl9FREdFX0dBUCwgcG9zaXRpb24ubGVmdCkpLFxuICAgIHRvcDogTWF0aC5taW4obWF4VG9wLCBNYXRoLm1heChtaW5Ub3AsIHBvc2l0aW9uLnRvcCkpLFxuICAgIHdpZHRoLFxuICAgIGhlaWdodCxcbiAgfTtcbn1cblxuZnVuY3Rpb24gZ2V0U2VjdGlvbkluZGV4KGRvY3VtZW50LCBzZWN0aW9uSWQpIHtcbiAgcmV0dXJuIGRvY3VtZW50LnNlY3Rpb25zLmZpbmRJbmRleCgoc2VjdGlvbikgPT4gc2VjdGlvbi5pZCA9PT0gc2VjdGlvbklkKTtcbn1cblxuZnVuY3Rpb24gZ2V0U2VjdGlvbihkb2N1bWVudCwgc2VsZWN0aW9uKSB7XG4gIGNvbnN0IHNlY3Rpb25JZCA9IHNlbGVjdGlvbi5zZWN0aW9uSWQgfHwgZG9jdW1lbnQuc2VjdGlvbnNbMF0/LmlkO1xuICByZXR1cm4gZG9jdW1lbnQuc2VjdGlvbnMuZmluZCgoc2VjdGlvbikgPT4gc2VjdGlvbi5pZCA9PT0gc2VjdGlvbklkKSB8fCBkb2N1bWVudC5zZWN0aW9uc1swXTtcbn1cblxuZnVuY3Rpb24gZ2V0TG9jYWxQcm9ncmVzcyhwbGFuLCBzZWN0aW9uLCBzdG9yeVdVKSB7XG4gIGNvbnN0IGNvbXBpbGVkID0gcGxhbj8uc2VjdGlvbnM/LmZpbmQoKGl0ZW0pID0+IGl0ZW0uaWQgPT09IHNlY3Rpb24uaWQpO1xuICByZXR1cm4gY29tcGlsZWQgPyBjbGFtcDAxKChzdG9yeVdVIC0gY29tcGlsZWQuc3RhcnRXVSkgLyBjb21waWxlZC50cmF2ZWxXVSkgOiAwO1xufVxuXG5mdW5jdGlvbiBmb3JtYXRXVSh2YWx1ZSkge1xuICByZXR1cm4gYCR7TnVtYmVyKHZhbHVlIHx8IDApLnRvRml4ZWQoMil9IFdVYDtcbn1cblxuZnVuY3Rpb24gZm9ybWF0Q2FtZXJhUGVyY2VudCh2YWx1ZSkge1xuICByZXR1cm4gYCR7TnVtYmVyKChOdW1iZXIodmFsdWUpICogMTAwKS50b0ZpeGVkKDEpKX0lYDtcbn1cblxuZnVuY3Rpb24gaXNUZXh0RWRpdGluZ1RhcmdldCh0YXJnZXQpIHtcbiAgcmV0dXJuIHRhcmdldCBpbnN0YW5jZW9mIEhUTUxFbGVtZW50XG4gICAgJiYgKHRhcmdldC5tYXRjaGVzKCdpbnB1dCwgdGV4dGFyZWEsIHNlbGVjdCcpIHx8IHRhcmdldC5pc0NvbnRlbnRFZGl0YWJsZSk7XG59XG5cbmZ1bmN0aW9uIGdldFRpbWVsaW5lS2V5ZnJhbWVzKHNuYXBzaG90KSB7XG4gIGNvbnN0IHBsYW4gPSBzbmFwc2hvdC5jb21waWxlZFBsYW47XG4gIGlmICghcGxhbj8uc2VjdGlvbnM/Lmxlbmd0aCkgcmV0dXJuIFtdO1xuICBjb25zdCBldmVudHMgPSBbXTtcbiAgcGxhbi5zZWN0aW9ucy5mb3JFYWNoKChjb21waWxlZCwgc2VjdGlvbkluZGV4KSA9PiB7XG4gICAgY29uc3Qgc2VjdGlvbiA9IHNuYXBzaG90LmRvY3VtZW50LnNlY3Rpb25zW3NlY3Rpb25JbmRleF07XG4gICAgY29uc3QgdG9TdG9yeVdVID0gKGF0KSA9PiBjb21waWxlZC5zdGFydFdVICsgKE51bWJlcihhdCB8fCAwKSAqIGNvbXBpbGVkLnRyYXZlbFdVKTtcbiAgICBzZWN0aW9uLmNhbWVyYS5rZXlzLmZvckVhY2goKGtleSwga2V5SW5kZXgpID0+IHtcbiAgICAgIGlmIChrZXkuYXQgPT09IDAgfHwga2V5LmF0ID09PSAxKSByZXR1cm47XG4gICAgICBldmVudHMucHVzaCh7XG4gICAgICAgIHN0b3J5V1U6IHRvU3RvcnlXVShrZXkuYXQpLFxuICAgICAgICBwcmlvcml0eTogMCxcbiAgICAgICAgc2VsZWN0aW9uOiB7IHR5cGU6ICdjYW1lcmEta2V5Jywgc2VjdGlvbklkOiBzZWN0aW9uLmlkLCBrZXlJbmRleCB9LFxuICAgICAgfSk7XG4gICAgfSk7XG4gICAgaWYgKHNlY3Rpb24ud29ybGQubW9kZSA9PT0gJ3NldCcgJiYgc2VjdGlvbi53b3JsZC50cmFuc2l0aW9uSW4udHlwZSAhPT0gJ2N1dCcpIHtcbiAgICAgIFsnc3RhcnQnLCAnZW5kJ10uZm9yRWFjaCgocGFydCwgcGFydEluZGV4KSA9PiBldmVudHMucHVzaCh7XG4gICAgICAgIHN0b3J5V1U6IHRvU3RvcnlXVShzZWN0aW9uLndvcmxkLnRyYW5zaXRpb25JbltwYXJ0XSksXG4gICAgICAgIHByaW9yaXR5OiAxMCArIHBhcnRJbmRleCxcbiAgICAgICAgc2VsZWN0aW9uOiB7IHR5cGU6ICd3b3JsZCcsIHNlY3Rpb25JZDogc2VjdGlvbi5pZCwga2V5UGFydDogYHRyYW5zaXRpb24tJHtwYXJ0fWAgfSxcbiAgICAgIH0pKTtcbiAgICB9XG4gICAgKHNlY3Rpb24udGV4dC5jdWVzIHx8IFtdKS5mb3JFYWNoKChjdWUsIGN1ZUluZGV4KSA9PiB7XG4gICAgICBldmVudHMucHVzaCh7XG4gICAgICAgIHN0b3J5V1U6IHRvU3RvcnlXVShjdWUuaG9sZCksXG4gICAgICAgIHByaW9yaXR5OiAyMCArIGN1ZUluZGV4LFxuICAgICAgICBzZWxlY3Rpb246IHsgdHlwZTogJ2N1ZScsIHNlY3Rpb25JZDogc2VjdGlvbi5pZCwgY3VlSWQ6IGN1ZS5pZCwga2V5UGFydDogJ2ZvY3VzJyB9LFxuICAgICAgfSk7XG4gICAgfSk7XG4gICAgaWYgKHNlY3Rpb24udGV4dC5kaXNjaXBsaW5lUmV2ZWFsKSB7XG4gICAgICBldmVudHMucHVzaCh7XG4gICAgICAgIHN0b3J5V1U6IHRvU3RvcnlXVShzZWN0aW9uLnRleHQuZGlzY2lwbGluZVJldmVhbC5zdGFydCksXG4gICAgICAgIHByaW9yaXR5OiAyOCxcbiAgICAgICAgc2VsZWN0aW9uOiB7IHR5cGU6ICdkaXNjaXBsaW5lLXJldmVhbCcsIHNlY3Rpb25JZDogc2VjdGlvbi5pZCB9LFxuICAgICAgfSk7XG4gICAgfVxuICAgIGlmIChzZWN0aW9uLmludGVyYWN0aW9uPy50eXBlICE9PSAnbm9uZScgJiYgTnVtYmVyLmlzRmluaXRlKHNlY3Rpb24uaW50ZXJhY3Rpb24uYWN0aXZhdGlvblN0YXJ0KSkge1xuICAgICAgZXZlbnRzLnB1c2goe1xuICAgICAgICBzdG9yeVdVOiB0b1N0b3J5V1Uoc2VjdGlvbi5pbnRlcmFjdGlvbi5hY3RpdmF0aW9uU3RhcnQpLFxuICAgICAgICBwcmlvcml0eTogMzAsXG4gICAgICAgIHNlbGVjdGlvbjogeyB0eXBlOiAnaW50ZXJhY3Rpb24nLCBzZWN0aW9uSWQ6IHNlY3Rpb24uaWQsIGtleVBhcnQ6ICdhY3RpdmF0aW9uJyB9LFxuICAgICAgfSk7XG4gICAgfVxuICB9KTtcbiAgcmV0dXJuIGV2ZW50cy5zb3J0KChhLCBiKSA9PiAoYS5zdG9yeVdVIC0gYi5zdG9yeVdVKSB8fCAoYS5wcmlvcml0eSAtIGIucHJpb3JpdHkpKTtcbn1cblxuZnVuY3Rpb24gZ2V0VGltZWxpbmVEZWxldGlvbihzbmFwc2hvdCkge1xuICBjb25zdCB7IHNlbGVjdGlvbiwgZG9jdW1lbnQgfSA9IHNuYXBzaG90O1xuICBjb25zdCBzZWN0aW9uSW5kZXggPSBnZXRTZWN0aW9uSW5kZXgoZG9jdW1lbnQsIHNlbGVjdGlvbi5zZWN0aW9uSWQpO1xuICBjb25zdCBzZWN0aW9uID0gZG9jdW1lbnQuc2VjdGlvbnNbc2VjdGlvbkluZGV4XTtcbiAgaWYgKCFzZWN0aW9uKSByZXR1cm4gbnVsbDtcbiAgaWYgKHNlbGVjdGlvbi50eXBlID09PSAnY2FtZXJhLWtleScpIHtcbiAgICBjb25zdCBrZXkgPSBzZWN0aW9uLmNhbWVyYS5rZXlzW3NlbGVjdGlvbi5rZXlJbmRleF07XG4gICAgaWYgKCFrZXkpIHJldHVybiBudWxsO1xuICAgIGNvbnN0IHJlcXVpcmVkID0ga2V5LmF0ID09PSAwIHx8IGtleS5hdCA9PT0gMTtcbiAgICByZXR1cm4ge1xuICAgICAgbGFiZWw6IHJlcXVpcmVkID8gJ1JlcXVpcmVkIGNhbWVyYSBrZXknIDogJ0RlbGV0ZSBjYW1lcmEga2V5JyxcbiAgICAgIGRpc2FibGVkOiByZXF1aXJlZCxcbiAgICAgIG1lc3NhZ2U6IHJlcXVpcmVkID8gJ1RoZSBzdGFydCBhbmQgZW5kIENhbWVyYSBrZXlzIHByZXNlcnZlIFNlY3Rpb24gY29udGludWl0eSBhbmQgY2Fubm90IGJlIHJlbW92ZWQuJyA6ICcnLFxuICAgICAgZXhlY3V0ZTogKHN0b3JlKSA9PiBzdG9yZS5jb21taXQoJ0RlbGV0ZSBjYW1lcmEga2V5JywgKGRyYWZ0KSA9PiB7XG4gICAgICAgIGRyYWZ0LnNlY3Rpb25zW3NlY3Rpb25JbmRleF0uY2FtZXJhLmtleXMuc3BsaWNlKHNlbGVjdGlvbi5rZXlJbmRleCwgMSk7XG4gICAgICB9LCB7IHNlbGVjdGlvbjogeyB0eXBlOiAnc2VjdGlvbicsIHNlY3Rpb25JZDogc2VjdGlvbi5pZCB9IH0pLFxuICAgIH07XG4gIH1cbiAgaWYgKHNlbGVjdGlvbi50eXBlID09PSAnd29ybGQnICYmIHNlbGVjdGlvbi5rZXlQYXJ0Py5zdGFydHNXaXRoKCd0cmFuc2l0aW9uLScpKSB7XG4gICAgcmV0dXJuIHtcbiAgICAgIGxhYmVsOiAnUmVtb3ZlIHRyYW5zaXRpb24nLFxuICAgICAgZGlzYWJsZWQ6IGZhbHNlLFxuICAgICAgbWVzc2FnZTogJycsXG4gICAgICBleGVjdXRlOiAoc3RvcmUpID0+IHN0b3JlLmNvbW1pdCgnUmVtb3ZlIFdvcmxkIHRyYW5zaXRpb24nLCAoZHJhZnQpID0+IHtcbiAgICAgICAgY29uc3QgdHJhbnNpdGlvbiA9IGRyYWZ0LnNlY3Rpb25zW3NlY3Rpb25JbmRleF0ud29ybGQudHJhbnNpdGlvbkluO1xuICAgICAgICB0cmFuc2l0aW9uLnN0YXJ0ID0gMDtcbiAgICAgICAgdHJhbnNpdGlvbi5lbmQgPSAwO1xuICAgICAgICB0cmFuc2l0aW9uLnR5cGUgPSAnY3V0JztcbiAgICAgIH0sIHsgc2VsZWN0aW9uOiB7IHR5cGU6ICd3b3JsZCcsIHNlY3Rpb25JZDogc2VjdGlvbi5pZCB9IH0pLFxuICAgIH07XG4gIH1cbiAgaWYgKHNlbGVjdGlvbi50eXBlID09PSAnaW50ZXJhY3Rpb24nICYmIHNlbGVjdGlvbi5rZXlQYXJ0ID09PSAnYWN0aXZhdGlvbicpIHtcbiAgICByZXR1cm4ge1xuICAgICAgbGFiZWw6ICdSZW1vdmUgaW50ZXJhY3Rpb24ga2V5JyxcbiAgICAgIGRpc2FibGVkOiBmYWxzZSxcbiAgICAgIG1lc3NhZ2U6ICcnLFxuICAgICAgZXhlY3V0ZTogKHN0b3JlKSA9PiBzdG9yZS5jb21taXQoJ1JlbW92ZSBpbnRlcmFjdGlvbiBrZXknLCAoZHJhZnQpID0+IHtcbiAgICAgICAgZHJhZnQuc2VjdGlvbnNbc2VjdGlvbkluZGV4XS5pbnRlcmFjdGlvbiA9IHsgdHlwZTogJ25vbmUnIH07XG4gICAgICB9LCB7IHNlbGVjdGlvbjogeyB0eXBlOiAnc2VjdGlvbicsIHNlY3Rpb25JZDogc2VjdGlvbi5pZCB9IH0pLFxuICAgIH07XG4gIH1cbiAgcmV0dXJuIG51bGw7XG59XG5cbmZ1bmN0aW9uIGRlbGV0ZVRpbWVsaW5lU2VsZWN0aW9uKHN0b3JlLCBzbmFwc2hvdCkge1xuICBjb25zdCBkZWxldGlvbiA9IGdldFRpbWVsaW5lRGVsZXRpb24oc25hcHNob3QpO1xuICBpZiAoIWRlbGV0aW9uKSByZXR1cm4gZmFsc2U7XG4gIGlmIChkZWxldGlvbi5kaXNhYmxlZCkge1xuICAgIHN0b3JlLnNldFNhdmVTdGF0ZSh7IG1lc3NhZ2U6IGRlbGV0aW9uLm1lc3NhZ2UgfSk7XG4gICAgcmV0dXJuIHRydWU7XG4gIH1cbiAgZGVsZXRpb24uZXhlY3V0ZShzdG9yZSk7XG4gIHJldHVybiB0cnVlO1xufVxuXG5mdW5jdGlvbiBzZWVrVGltZWxpbmVLZXlmcmFtZShzdG9yZSwgZXZlbnQpIHtcbiAgaWYgKCFldmVudCkgcmV0dXJuO1xuICBzdG9yZS5zZXRTZWxlY3Rpb24oZXZlbnQuc2VsZWN0aW9uKTtcbiAgc3RvcmUuc2V0VHJhbnNwb3J0KHsgb3duZXI6ICd0aW1lbGluZScsIHBsYXlpbmc6IGZhbHNlLCBzdG9yeVdVOiBldmVudC5zdG9yeVdVIH0pO1xufVxuXG5mdW5jdGlvbiBqdW1wVGltZWxpbmVLZXlmcmFtZShzdG9yZSwgc25hcHNob3QsIGRpcmVjdGlvbikge1xuICBjb25zdCBldmVudHMgPSBnZXRUaW1lbGluZUtleWZyYW1lcyhzbmFwc2hvdCk7XG4gIGNvbnN0IGN1cnJlbnRXVSA9IHNuYXBzaG90LnRyYW5zcG9ydC5zdG9yeVdVO1xuICBjb25zdCB0YXJnZXRQb3NpdGlvbiA9IGRpcmVjdGlvbiA+IDBcbiAgICA/IGV2ZW50cy5maW5kKChldmVudCkgPT4gZXZlbnQuc3RvcnlXVSA+IGN1cnJlbnRXVSArIFRJTUVMSU5FX0tFWV9FUFNJTE9OKT8uc3RvcnlXVVxuICAgIDogWy4uLmV2ZW50c10ucmV2ZXJzZSgpLmZpbmQoKGV2ZW50KSA9PiBldmVudC5zdG9yeVdVIDwgY3VycmVudFdVIC0gVElNRUxJTkVfS0VZX0VQU0lMT04pPy5zdG9yeVdVO1xuICBjb25zdCBldmVudCA9IE51bWJlci5pc0Zpbml0ZSh0YXJnZXRQb3NpdGlvbilcbiAgICA/IGV2ZW50cy5maW5kKChpdGVtKSA9PiBNYXRoLmFicyhpdGVtLnN0b3J5V1UgLSB0YXJnZXRQb3NpdGlvbikgPCBUSU1FTElORV9LRVlfRVBTSUxPTilcbiAgICA6IG51bGw7XG4gIHNlZWtUaW1lbGluZUtleWZyYW1lKHN0b3JlLCBldmVudCk7XG59XG5cbmZ1bmN0aW9uIG1ha2VTbHVnKHZhbHVlKSB7XG4gIHJldHVybiB2YWx1ZS50b0xvd2VyQ2FzZSgpLnJlcGxhY2UoL1teYS16MC05XSsvZywgJy0nKS5yZXBsYWNlKC9eLXwtJC9nLCAnJykgfHwgJ2l0ZW0nO1xufVxuXG5mdW5jdGlvbiBuZXh0SWQoZG9jdW1lbnQsIGJhc2UpIHtcbiAgY29uc3QgdXNlZCA9IG5ldyBTZXQoZG9jdW1lbnQuc2VjdGlvbnMuZmxhdE1hcCgoc2VjdGlvbikgPT4gW1xuICAgIHNlY3Rpb24uaWQsXG4gICAgLi4uKHNlY3Rpb24udGV4dC5jdWVzIHx8IFtdKS5tYXAoKGN1ZSkgPT4gY3VlLmlkKSxcbiAgICAuLi4oc2VjdGlvbi50ZXh0LmJsb2NrcyB8fCBbXSkubWFwKChibG9jaykgPT4gYmxvY2suaWQpLFxuICAgIC4uLihzZWN0aW9uLnRleHQuZGlzY2lwbGluZVJldmVhbCA/IFtzZWN0aW9uLnRleHQuZGlzY2lwbGluZVJldmVhbC5pZF0gOiBbXSksXG4gIF0pKTtcbiAgbGV0IGlkID0gbWFrZVNsdWcoYmFzZSk7XG4gIGxldCBzdWZmaXggPSAyO1xuICB3aGlsZSAodXNlZC5oYXMoaWQpKSB7XG4gICAgaWQgPSBgJHttYWtlU2x1ZyhiYXNlKX0tJHtzdWZmaXh9YDtcbiAgICBzdWZmaXggKz0gMTtcbiAgfVxuICByZXR1cm4gaWQ7XG59XG5cbmZ1bmN0aW9uIHJlcGxhY2VEcmFmdERvY3VtZW50KGRyYWZ0LCBuZXh0RG9jdW1lbnQpIHtcbiAgT2JqZWN0LmtleXMoZHJhZnQpLmZvckVhY2goKGtleSkgPT4gZGVsZXRlIGRyYWZ0W2tleV0pO1xuICBPYmplY3QuYXNzaWduKGRyYWZ0LCBjbG9uZUFib3V0TmFycmF0aXZlRG9jdW1lbnQobmV4dERvY3VtZW50KSk7XG59XG5cbmZ1bmN0aW9uIGFwcGx5Q3VlTW92ZXMoZHJhZnQsIG1vdmVzKSB7XG4gIG1vdmVzLmZvckVhY2goKG1vdmUpID0+IHtcbiAgICBjb25zdCBzZWN0aW9uID0gZHJhZnQuc2VjdGlvbnMuZmluZCgoaXRlbSkgPT4gaXRlbS5pZCA9PT0gbW92ZS5zZWN0aW9uSWQpO1xuICAgIGNvbnN0IGN1ZSA9IHNlY3Rpb24/LnRleHQ/LmN1ZXM/LmZpbmQoKGl0ZW0pID0+IGl0ZW0uaWQgPT09IG1vdmUuY3VlSWQpO1xuICAgIGlmIChjdWUpIE9iamVjdC5hc3NpZ24oY3VlLCB7IGVudGVyOiBtb3ZlLmVudGVyLCBob2xkOiBtb3ZlLmhvbGQsIGV4aXQ6IG1vdmUuZXhpdCB9KTtcbiAgfSk7XG59XG5cbmZ1bmN0aW9uIFByb3BlcnR5KHsgbGFiZWwsIGNoaWxkcmVuLCBoaW50ID0gJycgfSkge1xuICByZXR1cm4gKFxuICAgIDxsYWJlbCBjbGFzc05hbWU9XCJhYm91dC1lZGl0b3ItcHJvcGVydHlcIj5cbiAgICAgIDxzcGFuPntsYWJlbH08L3NwYW4+XG4gICAgICB7Y2hpbGRyZW59XG4gICAgICB7aGludCA/IDxzbWFsbD57aGludH08L3NtYWxsPiA6IG51bGx9XG4gICAgPC9sYWJlbD5cbiAgKTtcbn1cblxuZnVuY3Rpb24gTnVtYmVyUHJvcGVydHkoeyBsYWJlbCwgdmFsdWUsIG1pbiwgbWF4LCBzdGVwLCBvbkNoYW5nZSwgdW5pdCA9ICcnLCBkaXNhYmxlZCA9IGZhbHNlIH0pIHtcbiAgcmV0dXJuIChcbiAgICA8UHJvcGVydHkgbGFiZWw9e2xhYmVsfT5cbiAgICAgIDxkaXYgY2xhc3NOYW1lPVwiYWJvdXQtZWRpdG9yLW51bWJlclwiPlxuICAgICAgICA8aW5wdXRcbiAgICAgICAgICB0eXBlPVwicmFuZ2VcIlxuICAgICAgICAgIHZhbHVlPXt2YWx1ZX1cbiAgICAgICAgICBtaW49e21pbn1cbiAgICAgICAgICBtYXg9e21heH1cbiAgICAgICAgICBzdGVwPXtzdGVwfVxuICAgICAgICAgIGRpc2FibGVkPXtkaXNhYmxlZH1cbiAgICAgICAgICBvbkNoYW5nZT17KGV2ZW50KSA9PiBvbkNoYW5nZShOdW1iZXIoZXZlbnQudGFyZ2V0LnZhbHVlKSl9XG4gICAgICAgIC8+XG4gICAgICAgIDxpbnB1dFxuICAgICAgICAgIHR5cGU9XCJudW1iZXJcIlxuICAgICAgICAgIHZhbHVlPXt2YWx1ZX1cbiAgICAgICAgICBtaW49e21pbn1cbiAgICAgICAgICBtYXg9e21heH1cbiAgICAgICAgICBzdGVwPXtzdGVwfVxuICAgICAgICAgIGRpc2FibGVkPXtkaXNhYmxlZH1cbiAgICAgICAgICBvbkNoYW5nZT17KGV2ZW50KSA9PiBvbkNoYW5nZShOdW1iZXIoZXZlbnQudGFyZ2V0LnZhbHVlKSl9XG4gICAgICAgIC8+XG4gICAgICAgIHt1bml0ID8gPGVtPnt1bml0fTwvZW0+IDogbnVsbH1cbiAgICAgIDwvZGl2PlxuICAgIDwvUHJvcGVydHk+XG4gICk7XG59XG5cbmZ1bmN0aW9uIFJhbmdlUHJvcGVydHkoeyBsYWJlbCwgc3RhcnQsIGVuZCwgbWluLCBtYXgsIHN0ZXAsIG9uU3RhcnRDaGFuZ2UsIG9uRW5kQ2hhbmdlLCBoaW50ID0gJycgfSkge1xuICBjb25zdCBzdGFydFBlcmNlbnQgPSAoKHN0YXJ0IC0gbWluKSAvIE1hdGgubWF4KDAuMDAwMDEsIG1heCAtIG1pbikpICogMTAwO1xuICBjb25zdCBlbmRQZXJjZW50ID0gKChlbmQgLSBtaW4pIC8gTWF0aC5tYXgoMC4wMDAwMSwgbWF4IC0gbWluKSkgKiAxMDA7XG4gIGNvbnN0IHBlcmNlbnRhZ2VTdGVwID0gc3RlcCAqIDEwMDtcbiAgY29uc3Qgc2V0U3RhcnQgPSAodmFsdWUpID0+IG9uU3RhcnRDaGFuZ2UoTWF0aC5taW4oZW5kIC0gc3RlcCwgTWF0aC5tYXgobWluLCBOdW1iZXIodmFsdWUpIHx8IDApKSk7XG4gIGNvbnN0IHNldEVuZCA9ICh2YWx1ZSkgPT4gb25FbmRDaGFuZ2UoTWF0aC5tYXgoc3RhcnQgKyBzdGVwLCBNYXRoLm1pbihtYXgsIE51bWJlcih2YWx1ZSkgfHwgMCkpKTtcbiAgcmV0dXJuIChcbiAgICA8ZmllbGRzZXRcbiAgICAgIGNsYXNzTmFtZT1cImFib3V0LWVkaXRvci1yYW5nZS1wcm9wZXJ0eVwiXG4gICAgICBkYXRhLWdsb2JhbC1jb250cm9sPVwiY2xlYXJXaW5kb3dcIlxuICAgICAgc3R5bGU9e3sgJy0tYWJvdXQtcmFuZ2Utc3RhcnQnOiBgJHtzdGFydFBlcmNlbnR9JWAsICctLWFib3V0LXJhbmdlLWVuZCc6IGAke2VuZFBlcmNlbnR9JWAgfX1cbiAgICA+XG4gICAgICA8bGVnZW5kPntsYWJlbH08L2xlZ2VuZD5cbiAgICAgIDxkaXYgY2xhc3NOYW1lPVwiYWJvdXQtZWRpdG9yLWR1YWwtcmFuZ2VcIj5cbiAgICAgICAgPHNwYW4gYXJpYS1oaWRkZW49XCJ0cnVlXCIgLz5cbiAgICAgICAgPGlucHV0IHR5cGU9XCJyYW5nZVwiIGFyaWEtbGFiZWw9e2Ake2xhYmVsfSBzdGFydGB9IG1pbj17bWlufSBtYXg9e2VuZCAtIHN0ZXB9IHN0ZXA9e3N0ZXB9IHZhbHVlPXtzdGFydH0gb25DaGFuZ2U9eyhldmVudCkgPT4gc2V0U3RhcnQoZXZlbnQudGFyZ2V0LnZhbHVlKX0gLz5cbiAgICAgICAgPGlucHV0IHR5cGU9XCJyYW5nZVwiIGFyaWEtbGFiZWw9e2Ake2xhYmVsfSBlbmRgfSBtaW49e3N0YXJ0ICsgc3RlcH0gbWF4PXttYXh9IHN0ZXA9e3N0ZXB9IHZhbHVlPXtlbmR9IG9uQ2hhbmdlPXsoZXZlbnQpID0+IHNldEVuZChldmVudC50YXJnZXQudmFsdWUpfSAvPlxuICAgICAgPC9kaXY+XG4gICAgICA8ZGl2IGNsYXNzTmFtZT1cImFib3V0LWVkaXRvci1yYW5nZS12YWx1ZXNcIj5cbiAgICAgICAgPGxhYmVsPjxzcGFuPlN0YXJ0czwvc3Bhbj48aW5wdXQgdHlwZT1cIm51bWJlclwiIG1pbj17bWluICogMTAwfSBtYXg9eyhlbmQgLSBzdGVwKSAqIDEwMH0gc3RlcD17cGVyY2VudGFnZVN0ZXB9IHZhbHVlPXtNYXRoLnJvdW5kKHN0YXJ0ICogMTAwKX0gb25DaGFuZ2U9eyhldmVudCkgPT4gc2V0U3RhcnQoTnVtYmVyKGV2ZW50LnRhcmdldC52YWx1ZSkgLyAxMDApfSAvPjxlbT4lPC9lbT48L2xhYmVsPlxuICAgICAgICA8aSBhcmlhLWhpZGRlbj1cInRydWVcIj7ihpI8L2k+XG4gICAgICAgIDxsYWJlbD48c3Bhbj5FbmRzPC9zcGFuPjxpbnB1dCB0eXBlPVwibnVtYmVyXCIgbWluPXsoc3RhcnQgKyBzdGVwKSAqIDEwMH0gbWF4PXttYXggKiAxMDB9IHN0ZXA9e3BlcmNlbnRhZ2VTdGVwfSB2YWx1ZT17TWF0aC5yb3VuZChlbmQgKiAxMDApfSBvbkNoYW5nZT17KGV2ZW50KSA9PiBzZXRFbmQoTnVtYmVyKGV2ZW50LnRhcmdldC52YWx1ZSkgLyAxMDApfSAvPjxlbT4lPC9lbT48L2xhYmVsPlxuICAgICAgPC9kaXY+XG4gICAgICB7aGludCA/IDxzbWFsbD57aGludH08L3NtYWxsPiA6IG51bGx9XG4gICAgPC9maWVsZHNldD5cbiAgKTtcbn1cblxuZnVuY3Rpb24gVHJhbnNwb3J0KHsgc3RvcmUsIHNuYXBzaG90IH0pIHtcbiAgY29uc3QgeyB0cmFuc3BvcnQsIGNvbXBpbGVkUGxhbiB9ID0gc25hcHNob3Q7XG4gIGNvbnN0IG1heFdVID0gY29tcGlsZWRQbGFuPy5tYXhTdG9yeVdVIHx8IDE7XG4gIGNvbnN0IHBsYXkgPSAoKSA9PiBzdG9yZS5zZXRUcmFuc3BvcnQoe1xuICAgIG93bmVyOiB0cmFuc3BvcnQucGxheWluZyA/ICd0aW1lbGluZScgOiAncGxheWJhY2snLFxuICAgIHBsYXlpbmc6ICF0cmFuc3BvcnQucGxheWluZyxcbiAgICBzdG9yeVdVOiB0cmFuc3BvcnQuc3RvcnlXVSxcbiAgfSk7XG4gIGNvbnN0IHNlZWsgPSAoc3RvcnlXVSkgPT4gc3RvcmUuc2V0VHJhbnNwb3J0KHsgb3duZXI6ICd0aW1lbGluZScsIHBsYXlpbmc6IGZhbHNlLCBzdG9yeVdVIH0pO1xuICBjb25zdCBzZWxlY3RlZCA9IHNuYXBzaG90LnNlbGVjdGlvbi50eXBlID09PSAnc2VxdWVuY2UnXG4gICAgPyBudWxsXG4gICAgOiBnZXRTZWN0aW9uKHNuYXBzaG90LmRvY3VtZW50LCBzbmFwc2hvdC5zZWxlY3Rpb24pO1xuICBjb25zdCBzZWN0aW9uSW5kZXggPSBnZXRTZWN0aW9uSW5kZXgoc25hcHNob3QuZG9jdW1lbnQsIHNlbGVjdGVkLmlkKTtcbiAgY29uc3QganVtcFNlY3Rpb24gPSAoZGlyZWN0aW9uKSA9PiB7XG4gICAgY29uc3QgbmV4dCA9IHNuYXBzaG90LmNvbXBpbGVkUGxhbi5zZWN0aW9uc1tNYXRoLm1heCgwLCBNYXRoLm1pbihzbmFwc2hvdC5jb21waWxlZFBsYW4uc2VjdGlvbnMubGVuZ3RoIC0gMSwgc2VjdGlvbkluZGV4ICsgZGlyZWN0aW9uKSldO1xuICAgIGlmIChuZXh0KSBzZWVrKG5leHQuc3RhcnRXVSk7XG4gIH07XG4gIHJldHVybiAoXG4gICAgPGRpdiBjbGFzc05hbWU9XCJhYm91dC1lZGl0b3ItdHJhbnNwb3J0XCI+XG4gICAgICA8YnV0dG9uIHR5cGU9XCJidXR0b25cIiB0aXRsZT1cIlByZXZpb3VzIFNlY3Rpb25cIiBhcmlhLWxhYmVsPVwiUHJldmlvdXMgU2VjdGlvblwiIG9uQ2xpY2s9eygpID0+IGp1bXBTZWN0aW9uKC0xKX0+PFNraXBCYWNrIGFyaWEtaGlkZGVuPVwidHJ1ZVwiIC8+PC9idXR0b24+XG4gICAgICA8YnV0dG9uIHR5cGU9XCJidXR0b25cIiB0aXRsZT1cIlByZXZpb3VzIGtleWZyYW1lIMK3IExlZnQgYXJyb3dcIiBhcmlhLWxhYmVsPVwiUHJldmlvdXMga2V5ZnJhbWVcIiBvbkNsaWNrPXsoKSA9PiBqdW1wVGltZWxpbmVLZXlmcmFtZShzdG9yZSwgc25hcHNob3QsIC0xKX0+PENoZXZyb25MZWZ0IGFyaWEtaGlkZGVuPVwidHJ1ZVwiIC8+PC9idXR0b24+XG4gICAgICA8YnV0dG9uIHR5cGU9XCJidXR0b25cIiBjbGFzc05hbWU9XCJpcy1wcmltYXJ5XCIgdGl0bGU9e3RyYW5zcG9ydC5wbGF5aW5nID8gJ1BhdXNlJyA6ICdQbGF5J30gYXJpYS1sYWJlbD17dHJhbnNwb3J0LnBsYXlpbmcgPyAnUGF1c2UnIDogJ1BsYXknfSBvbkNsaWNrPXtwbGF5fT5cbiAgICAgICAge3RyYW5zcG9ydC5wbGF5aW5nID8gPFBhdXNlIGFyaWEtaGlkZGVuPVwidHJ1ZVwiIC8+IDogPFBsYXkgYXJpYS1oaWRkZW49XCJ0cnVlXCIgLz59XG4gICAgICA8L2J1dHRvbj5cbiAgICAgIDxidXR0b24gdHlwZT1cImJ1dHRvblwiIHRpdGxlPVwiTmV4dCBTZWN0aW9uXCIgYXJpYS1sYWJlbD1cIk5leHQgU2VjdGlvblwiIG9uQ2xpY2s9eygpID0+IGp1bXBTZWN0aW9uKDEpfT48U2tpcEZvcndhcmQgYXJpYS1oaWRkZW49XCJ0cnVlXCIgLz48L2J1dHRvbj5cbiAgICAgIDxidXR0b24gdHlwZT1cImJ1dHRvblwiIHRpdGxlPVwiTmV4dCBrZXlmcmFtZSDCtyBSaWdodCBhcnJvd1wiIGFyaWEtbGFiZWw9XCJOZXh0IGtleWZyYW1lXCIgb25DbGljaz17KCkgPT4ganVtcFRpbWVsaW5lS2V5ZnJhbWUoc3RvcmUsIHNuYXBzaG90LCAxKX0+PENoZXZyb25SaWdodCBhcmlhLWhpZGRlbj1cInRydWVcIiAvPjwvYnV0dG9uPlxuICAgICAgPG91dHB1dD57Zm9ybWF0V1UodHJhbnNwb3J0LnN0b3J5V1UpfTwvb3V0cHV0PlxuICAgICAgPGlucHV0XG4gICAgICAgIGFyaWEtbGFiZWw9XCJHbG9iYWwgbmFycmF0aXZlIHBsYXloZWFkXCJcbiAgICAgICAgdHlwZT1cInJhbmdlXCJcbiAgICAgICAgbWluPVwiMFwiXG4gICAgICAgIG1heD17bWF4V1V9XG4gICAgICAgIHN0ZXA9XCIwLjAwMlwiXG4gICAgICAgIHZhbHVlPXtNYXRoLm1pbihtYXhXVSwgdHJhbnNwb3J0LnN0b3J5V1UpfVxuICAgICAgICBvbkNoYW5nZT17KGV2ZW50KSA9PiBzZWVrKE51bWJlcihldmVudC50YXJnZXQudmFsdWUpKX1cbiAgICAgIC8+XG4gICAgICA8YnV0dG9uXG4gICAgICAgIHR5cGU9XCJidXR0b25cIlxuICAgICAgICBjbGFzc05hbWU9e3RyYW5zcG9ydC5vd25lciA9PT0gJ3Njcm9sbCcgPyAnaXMtYWN0aXZlJyA6ICcnfVxuICAgICAgICBvbkNsaWNrPXsoKSA9PiBzdG9yZS5zZXRUcmFuc3BvcnQoeyBvd25lcjogJ3Njcm9sbCcsIHBsYXlpbmc6IGZhbHNlIH0pfVxuICAgICAgPkZvbGxvdyBzY3JvbGw8L2J1dHRvbj5cbiAgICAgIDxidXR0b25cbiAgICAgICAgdHlwZT1cImJ1dHRvblwiXG4gICAgICAgIGNsYXNzTmFtZT17dHJhbnNwb3J0LmxpdmVBbWJpZW50ID8gJ2lzLWFjdGl2ZScgOiAnJ31cbiAgICAgICAgb25DbGljaz17KCkgPT4gc3RvcmUuc2V0VHJhbnNwb3J0KHsgbGl2ZUFtYmllbnQ6ICF0cmFuc3BvcnQubGl2ZUFtYmllbnQgfSl9XG4gICAgICA+TGl2ZSBhbWJpZW50PC9idXR0b24+XG4gICAgICA8c2VsZWN0XG4gICAgICAgIGFyaWEtbGFiZWw9XCJQcmV2aWV3IHByb2ZpbGVcIlxuICAgICAgICB2YWx1ZT17c25hcHNob3QucHJldmlld1Byb2ZpbGV9XG4gICAgICAgIG9uQ2hhbmdlPXsoZXZlbnQpID0+IHN0b3JlLnNldFByZXZpZXdQcm9maWxlKGV2ZW50LnRhcmdldC52YWx1ZSl9XG4gICAgICA+XG4gICAgICAgIDxvcHRpb24gdmFsdWU9XCJkZXNrdG9wXCI+RGVza3RvcDwvb3B0aW9uPlxuICAgICAgICA8b3B0aW9uIHZhbHVlPVwibW9iaWxlXCI+TW9iaWxlPC9vcHRpb24+XG4gICAgICAgIDxvcHRpb24gdmFsdWU9XCJyZWR1Y2VkLW1vdGlvblwiPlJlZHVjZWQgbW90aW9uPC9vcHRpb24+XG4gICAgICA8L3NlbGVjdD5cbiAgICA8L2Rpdj5cbiAgKTtcbn1cblxuZnVuY3Rpb24gVGltZWxpbmUoeyBzdG9yZSwgc25hcHNob3QsIG9uT3Blbkdsb2JhbCB9KSB7XG4gIGNvbnN0IHsgZG9jdW1lbnQsIGNvbXBpbGVkUGxhbiwgc2VsZWN0aW9uLCB0cmFuc3BvcnQgfSA9IHNuYXBzaG90O1xuICBjb25zdCBzZWxlY3RlZEN1ZU1lbWJlcnMgPSBnZXRBYm91dE5hcnJhdGl2ZVNlbGVjdGlvbk1lbWJlcnMoc2VsZWN0aW9uKTtcbiAgY29uc3QgbWF4V1UgPSBNYXRoLm1heCgwLjAwMSwgY29tcGlsZWRQbGFuPy5tYXhTdG9yeVdVIHx8IGRvY3VtZW50LnNlY3Rpb25zLnJlZHVjZSgoc3VtLCBzZWN0aW9uKSA9PiBzdW0gKyBzZWN0aW9uLmV4dGVudFdVLCAwKSk7XG4gIGNvbnN0IHBsYXloZWFkID0gYCR7KHRyYW5zcG9ydC5zdG9yeVdVIC8gbWF4V1UpICogMTAwfSVgO1xuICBjb25zdCBsYW5lc1JlZiA9IHVzZVJlZihudWxsKTtcbiAgY29uc3QgdGltaW5nRHJhZ1JlZiA9IHVzZVJlZihudWxsKTtcbiAgY29uc3QgcHJldmlld0ZyYW1lUmVmID0gdXNlUmVmKG51bGwpO1xuICBjb25zdCBwZW5kaW5nUHJldmlld1JlZiA9IHVzZVJlZihudWxsKTtcbiAgY29uc3Qgc3VwcHJlc3NlZENsaWNrUmVmID0gdXNlUmVmKG51bGwpO1xuICBjb25zdCBbY2FtZXJhRHJhZ1ByZXZpZXcsIHNldENhbWVyYURyYWdQcmV2aWV3XSA9IHVzZVN0YXRlKG51bGwpO1xuICBjb25zdCBbc2VjdGlvblJlc2l6ZVByZXZpZXcsIHNldFNlY3Rpb25SZXNpemVQcmV2aWV3XSA9IHVzZVN0YXRlKG51bGwpO1xuICBjb25zdCBbbWFycXVlZSwgc2V0TWFycXVlZV0gPSB1c2VTdGF0ZShudWxsKTtcblxuICBjb25zdCBxdWV1ZVByZXZpZXdGcmFtZSA9IChjYWxsYmFjaykgPT4ge1xuICAgIHBlbmRpbmdQcmV2aWV3UmVmLmN1cnJlbnQgPSBjYWxsYmFjaztcbiAgICBpZiAocHJldmlld0ZyYW1lUmVmLmN1cnJlbnQpIHJldHVybjtcbiAgICBwcmV2aWV3RnJhbWVSZWYuY3VycmVudCA9IHJlcXVlc3RBbmltYXRpb25GcmFtZSgoKSA9PiB7XG4gICAgICBwcmV2aWV3RnJhbWVSZWYuY3VycmVudCA9IG51bGw7XG4gICAgICBjb25zdCBwZW5kaW5nID0gcGVuZGluZ1ByZXZpZXdSZWYuY3VycmVudDtcbiAgICAgIHBlbmRpbmdQcmV2aWV3UmVmLmN1cnJlbnQgPSBudWxsO1xuICAgICAgcGVuZGluZz8uKCk7XG4gICAgfSk7XG4gIH07XG4gIGNvbnN0IGZsdXNoUHJldmlld0ZyYW1lID0gKCkgPT4ge1xuICAgIGlmIChwcmV2aWV3RnJhbWVSZWYuY3VycmVudCkgY2FuY2VsQW5pbWF0aW9uRnJhbWUocHJldmlld0ZyYW1lUmVmLmN1cnJlbnQpO1xuICAgIHByZXZpZXdGcmFtZVJlZi5jdXJyZW50ID0gbnVsbDtcbiAgICBjb25zdCBwZW5kaW5nID0gcGVuZGluZ1ByZXZpZXdSZWYuY3VycmVudDtcbiAgICBwZW5kaW5nUHJldmlld1JlZi5jdXJyZW50ID0gbnVsbDtcbiAgICBwZW5kaW5nPy4oKTtcbiAgfTtcblxuICBjb25zdCB6b29tVGltZWxpbmUgPSAoZXZlbnQpID0+IHtcbiAgICBpZiAoIWV2ZW50LmN0cmxLZXkgJiYgIWV2ZW50Lm1ldGFLZXkpIHJldHVybjtcbiAgICBldmVudC5wcmV2ZW50RGVmYXVsdCgpO1xuICAgIGNvbnN0IGxhbmVzID0gbGFuZXNSZWYuY3VycmVudDtcbiAgICBpZiAoIWxhbmVzKSByZXR1cm47XG4gICAgY29uc3QgcmVjdCA9IGxhbmVzLmdldEJvdW5kaW5nQ2xpZW50UmVjdCgpO1xuICAgIGNvbnN0IHBvaW50ZXJYID0gTWF0aC5taW4ocmVjdC53aWR0aCwgTWF0aC5tYXgoMCwgZXZlbnQuY2xpZW50WCAtIHJlY3QubGVmdCkpO1xuICAgIGNvbnN0IHN0b3J5UmF0aW8gPSAobGFuZXMuc2Nyb2xsTGVmdCArIHBvaW50ZXJYKSAvIE1hdGgubWF4KDEsIGxhbmVzLnNjcm9sbFdpZHRoKTtcbiAgICBjb25zdCBjdXJyZW50Wm9vbSA9IE1hdGgubWF4KDEsIE51bWJlcih0cmFuc3BvcnQuem9vbSkgfHwgMSk7XG4gICAgY29uc3QgbmV4dFpvb20gPSBNYXRoLm1pbig4LCBNYXRoLm1heCgxLCBjdXJyZW50Wm9vbSAqIE1hdGguZXhwKC1ldmVudC5kZWx0YVkgKiAwLjAwMjUpKSk7XG4gICAgc3RvcmUuc2V0VHJhbnNwb3J0KHsgem9vbTogTnVtYmVyKG5leHRab29tLnRvRml4ZWQoMykpIH0pO1xuICAgIHJlcXVlc3RBbmltYXRpb25GcmFtZSgoKSA9PiB7XG4gICAgICBsYW5lcy5zY3JvbGxMZWZ0ID0gKHN0b3J5UmF0aW8gKiBsYW5lcy5zY3JvbGxXaWR0aCkgLSBwb2ludGVyWDtcbiAgICB9KTtcbiAgfTtcblxuICB1c2VFZmZlY3QoKCkgPT4gKCkgPT4ge1xuICAgIGlmIChwcmV2aWV3RnJhbWVSZWYuY3VycmVudCkgY2FuY2VsQW5pbWF0aW9uRnJhbWUocHJldmlld0ZyYW1lUmVmLmN1cnJlbnQpO1xuICB9LCBbXSk7XG5cbiAgY29uc3QgcmVzb2x2ZUNhbWVyYURyb3BBdENsaWVudFggPSAoY2xpZW50WCkgPT4ge1xuICAgIGNvbnN0IGxhbmVzID0gbGFuZXNSZWYuY3VycmVudDtcbiAgICBjb25zdCBjdXJyZW50ID0gc3RvcmUuZ2V0U25hcHNob3QoKTtcbiAgICBpZiAoIWxhbmVzKSByZXR1cm4geyB2YWxpZDogZmFsc2UsIHJlYXNvbjogJ1RoZSBjYW1lcmEgdGltZWxpbmUgaXMgbm90IHJlYWR5LicgfTtcbiAgICBjb25zdCByZWN0ID0gbGFuZXMuZ2V0Qm91bmRpbmdDbGllbnRSZWN0KCk7XG4gICAgY29uc3QgY29udGVudFggPSBNYXRoLm1pbihcbiAgICAgIGxhbmVzLnNjcm9sbFdpZHRoLFxuICAgICAgTWF0aC5tYXgoMCwgY2xpZW50WCAtIHJlY3QubGVmdCArIGxhbmVzLnNjcm9sbExlZnQpLFxuICAgICk7XG4gICAgY29uc3Qgc3RvcnlXVSA9IChjb250ZW50WCAvIE1hdGgubWF4KDEsIGxhbmVzLnNjcm9sbFdpZHRoKSlcbiAgICAgICogTWF0aC5tYXgoMC4wMDEsIGN1cnJlbnQuY29tcGlsZWRQbGFuPy5tYXhTdG9yeVdVIHx8IG1heFdVKTtcbiAgICBjb25zdCBkcmFnID0gdGltaW5nRHJhZ1JlZi5jdXJyZW50O1xuICAgIGNvbnN0IGRyb3AgPSByZXNvbHZlQWJvdXROYXJyYXRpdmVDYW1lcmFLZXlEcm9wKHtcbiAgICAgIGRvY3VtZW50OiBjdXJyZW50LmRvY3VtZW50LFxuICAgICAgcGxhbjogY3VycmVudC5jb21waWxlZFBsYW4sXG4gICAgICBzb3VyY2VTZWN0aW9uSW5kZXg6IGRyYWc/LnNlY3Rpb25JbmRleCxcbiAgICAgIHNvdXJjZUtleUluZGV4OiBkcmFnPy5rZXlJbmRleCxcbiAgICAgIHN0b3J5V1UsXG4gICAgfSk7XG4gICAgcmV0dXJuIHsgLi4uZHJvcCwgY29udGVudFggfTtcbiAgfTtcblxuICBjb25zdCBiZWdpblRpbWluZ0RyYWcgPSAoZXZlbnQsIGRyYWcpID0+IHtcbiAgICBpZiAoZHJhZy5sb2NrZWQgfHwgZXZlbnQuYnV0dG9uICE9PSAwKSByZXR1cm47XG4gICAgY29uc3QgY2xpcCA9IGV2ZW50LmN1cnJlbnRUYXJnZXQucGFyZW50RWxlbWVudDtcbiAgICBjb25zdCByZWN0ID0gY2xpcD8uZ2V0Qm91bmRpbmdDbGllbnRSZWN0KCk7XG4gICAgaWYgKCFyZWN0Py53aWR0aCkgcmV0dXJuO1xuICAgIGV2ZW50LnByZXZlbnREZWZhdWx0KCk7XG4gICAgZXZlbnQuc3RvcFByb3BhZ2F0aW9uKCk7XG4gICAgZXZlbnQuY3VycmVudFRhcmdldC5zZXRQb2ludGVyQ2FwdHVyZT8uKGV2ZW50LnBvaW50ZXJJZCk7XG4gICAgbGV0IG5leHRTZWxlY3Rpb24gPSBkcmFnLnNlbGVjdGlvbjtcbiAgICBpZiAoZHJhZy50eXBlID09PSAnY3VlJykge1xuICAgICAgY29uc3QgY3VycmVudFNlbGVjdGlvbiA9IHN0b3JlLmdldFNuYXBzaG90KCkuc2VsZWN0aW9uO1xuICAgICAgY29uc3QgY3VycmVudE1lbWJlcnMgPSBnZXRBYm91dE5hcnJhdGl2ZVNlbGVjdGlvbk1lbWJlcnMoY3VycmVudFNlbGVjdGlvbik7XG4gICAgICBjb25zdCBhbHJlYWR5U2VsZWN0ZWQgPSBjdXJyZW50TWVtYmVycy5zb21lKChtZW1iZXIpID0+IChcbiAgICAgICAgbWVtYmVyLnNlY3Rpb25JZCA9PT0gZHJhZy5zZWxlY3Rpb24uc2VjdGlvbklkICYmIG1lbWJlci5jdWVJZCA9PT0gZHJhZy5zZWxlY3Rpb24uY3VlSWRcbiAgICAgICkpO1xuICAgICAgbmV4dFNlbGVjdGlvbiA9IGV2ZW50LnNoaWZ0S2V5XG4gICAgICAgID8gdG9nZ2xlQWJvdXROYXJyYXRpdmVDdWVTZWxlY3Rpb24oY3VycmVudFNlbGVjdGlvbiwgZHJhZy5zZWxlY3Rpb24pXG4gICAgICAgIDogYWxyZWFkeVNlbGVjdGVkICYmIGN1cnJlbnRNZW1iZXJzLmxlbmd0aCA+IDFcbiAgICAgICAgICA/IHsgLi4uZHJhZy5zZWxlY3Rpb24sIG1lbWJlcnM6IGN1cnJlbnRNZW1iZXJzIH1cbiAgICAgICAgICA6IGRyYWcuc2VsZWN0aW9uO1xuICAgICAgc3RvcmUuYmVnaW5QcmV2aWV3KCdNb3ZlIHRleHQgQ3VlcycpO1xuICAgIH1cbiAgICB0aW1pbmdEcmFnUmVmLmN1cnJlbnQgPSB7XG4gICAgICAuLi5kcmFnLFxuICAgICAgc2VsZWN0aW9uOiBuZXh0U2VsZWN0aW9uLFxuICAgICAgbWVtYmVyczogZHJhZy50eXBlID09PSAnY3VlJyA/IGdldEFib3V0TmFycmF0aXZlU2VsZWN0aW9uTWVtYmVycyhuZXh0U2VsZWN0aW9uKSA6IG51bGwsXG4gICAgICBzdGFydERvY3VtZW50OiBkcmFnLnR5cGUgPT09ICdjdWUnID8gY2xvbmVBYm91dE5hcnJhdGl2ZURvY3VtZW50KHN0b3JlLmdldFNuYXBzaG90KCkuZG9jdW1lbnQpIDogbnVsbCxcbiAgICAgIHN0YXJ0UGxhbjogZHJhZy50eXBlID09PSAnY3VlJyA/IHN0b3JlLmdldFNuYXBzaG90KCkuY29tcGlsZWRQbGFuIDogbnVsbCxcbiAgICAgIHBvaW50ZXJJZDogZXZlbnQucG9pbnRlcklkLFxuICAgICAgcmVjdCxcbiAgICAgIHN0YXJ0WDogZXZlbnQuY2xpZW50WCxcbiAgICAgIG1vdmVkOiBmYWxzZSxcbiAgICAgIGxhc3RBdDogZHJhZy5hdCxcbiAgICAgIGxhc3REcm9wOiBudWxsLFxuICAgIH07XG4gICAgc3RvcmUuc2V0U2VsZWN0aW9uKG5leHRTZWxlY3Rpb24pO1xuICAgIHN0b3JlLnNldFRyYW5zcG9ydCh7IG93bmVyOiAndGltZWxpbmUnLCBwbGF5aW5nOiBmYWxzZSwgc3RvcnlXVTogZHJhZy5zdG9yeVdVIH0pO1xuICB9O1xuXG4gIGNvbnN0IG1vdmVUaW1pbmdEcmFnID0gKGV2ZW50KSA9PiB7XG4gICAgY29uc3QgZHJhZyA9IHRpbWluZ0RyYWdSZWYuY3VycmVudDtcbiAgICBpZiAoIWRyYWcgfHwgZHJhZy5wb2ludGVySWQgIT09IGV2ZW50LnBvaW50ZXJJZCkgcmV0dXJuO1xuICAgIGlmICghZHJhZy5tb3ZlZCAmJiBNYXRoLmFicyhldmVudC5jbGllbnRYIC0gZHJhZy5zdGFydFgpIDwgMykgcmV0dXJuO1xuICAgIGRyYWcubW92ZWQgPSB0cnVlO1xuICAgIGlmIChkcmFnLnR5cGUgPT09ICdjYW1lcmEnKSB7XG4gICAgICBjb25zdCBkcm9wID0gcmVzb2x2ZUNhbWVyYURyb3BBdENsaWVudFgoZXZlbnQuY2xpZW50WCk7XG4gICAgICBkcmFnLmxhc3REcm9wID0gZHJvcDtcbiAgICAgIHNldENhbWVyYURyYWdQcmV2aWV3KHsgLi4uZHJvcCwgdG9rZW46IGRyYWcudG9rZW4gfSk7XG4gICAgICBpZiAoZHJvcC52YWxpZCkge1xuICAgICAgICBzdG9yZS5zZXRUcmFuc3BvcnQoeyBvd25lcjogJ3RpbWVsaW5lJywgcGxheWluZzogZmFsc2UsIHN0b3J5V1U6IGRyb3Auc3RvcnlXVSB9KTtcbiAgICAgIH1cbiAgICAgIHJldHVybjtcbiAgICB9XG4gICAgaWYgKGRyYWcudHlwZSA9PT0gJ2Rpc2NpcGxpbmUtcmV2ZWFsJykge1xuICAgICAgY29uc3QgZGVsdGFMYW5lID0gKGV2ZW50LmNsaWVudFggLSBkcmFnLnN0YXJ0WCkgLyBkcmFnLnJlY3Qud2lkdGg7XG4gICAgICBjb25zdCBuZXh0QXQgPSBNYXRoLm1pbihkcmFnLm1heCwgTWF0aC5tYXgoXG4gICAgICAgIGRyYWcubWluLFxuICAgICAgICBzbmFwQWJvdXROYXJyYXRpdmVUaW1lbGluZVZhbHVlKGRyYWcuYXQgKyBkZWx0YUxhbmUpLFxuICAgICAgKSk7XG4gICAgICBpZiAoTWF0aC5hYnMobmV4dEF0IC0gZHJhZy5sYXN0QXQpIDwgMC4wMDAwMDEpIHJldHVybjtcbiAgICAgIGNvbnN0IGRlbHRhID0gbmV4dEF0IC0gZHJhZy5sYXN0QXQ7XG4gICAgICBzdG9yZS5jb21taXQoJ01vdmUgRGlzY2lwbGluZSByZXZlYWwnLCAoZHJhZnQpID0+IHtcbiAgICAgICAgY29uc3QgcmV2ZWFsID0gZHJhZnQuc2VjdGlvbnNbZHJhZy5zZWN0aW9uSW5kZXhdLnRleHQuZGlzY2lwbGluZVJldmVhbDtcbiAgICAgICAgaWYgKCFyZXZlYWwpIHJldHVybjtcbiAgICAgICAgcmV2ZWFsLnN0YXJ0ICs9IGRlbHRhO1xuICAgICAgICByZXZlYWwuZW5kICs9IGRlbHRhO1xuICAgICAgfSwgeyBjb2FsZXNjZUtleTogZHJhZy5jb2FsZXNjZUtleSwgc2VsZWN0aW9uOiBkcmFnLnNlbGVjdGlvbiB9KTtcbiAgICAgIGRyYWcubGFzdEF0ID0gbmV4dEF0O1xuICAgICAgc3RvcmUuc2V0VHJhbnNwb3J0KHtcbiAgICAgICAgb3duZXI6ICd0aW1lbGluZScsXG4gICAgICAgIHBsYXlpbmc6IGZhbHNlLFxuICAgICAgICBzdG9yeVdVOiBkcmFnLnNlY3Rpb25TdGFydFdVICsgKG5leHRBdCAqIGRyYWcudHJhdmVsV1UpLFxuICAgICAgfSk7XG4gICAgICByZXR1cm47XG4gICAgfVxuICAgIGNvbnN0IGxvY2FsRGVsdGEgPSAoZXZlbnQuY2xpZW50WCAtIGRyYWcuc3RhcnRYKSAvIGRyYWcucmVjdC53aWR0aDtcbiAgICBjb25zdCBtb3ZlbWVudCA9IHJlc29sdmVBYm91dE5hcnJhdGl2ZUN1ZUdyb3VwTW92ZSh7XG4gICAgICBkb2N1bWVudDogZHJhZy5zdGFydERvY3VtZW50LFxuICAgICAgcGxhbjogZHJhZy5zdGFydFBsYW4sXG4gICAgICBtZW1iZXJzOiBkcmFnLm1lbWJlcnMsXG4gICAgICBwcmltYXJ5OiBkcmFnLnNlbGVjdGlvbixcbiAgICAgIGxvY2FsRGVsdGEsXG4gICAgfSk7XG4gICAgaWYgKCFtb3ZlbWVudC52YWxpZCB8fCBNYXRoLmFicyhtb3ZlbWVudC5kZWx0YVdVIC0gKGRyYWcubGFzdERlbHRhV1UgfHwgMCkpIDwgMC4wMDAwMDEpIHJldHVybjtcbiAgICBkcmFnLmxhc3REZWx0YVdVID0gbW92ZW1lbnQuZGVsdGFXVTtcbiAgICBxdWV1ZVByZXZpZXdGcmFtZSgoKSA9PiB7XG4gICAgICBzdG9yZS51cGRhdGVQcmV2aWV3KChkcmFmdCkgPT4ge1xuICAgICAgICBtb3ZlbWVudC5tb3Zlcy5mb3JFYWNoKChtb3ZlKSA9PiB7XG4gICAgICAgICAgY29uc3QgY3VlID0gZHJhZnQuc2VjdGlvbnNbbW92ZS5zZWN0aW9uSW5kZXhdPy50ZXh0Py5jdWVzPy5maW5kKChpdGVtKSA9PiBpdGVtLmlkID09PSBtb3ZlLmN1ZUlkKTtcbiAgICAgICAgICBpZiAoY3VlKSBPYmplY3QuYXNzaWduKGN1ZSwgeyBlbnRlcjogbW92ZS5lbnRlciwgaG9sZDogbW92ZS5ob2xkLCBleGl0OiBtb3ZlLmV4aXQgfSk7XG4gICAgICAgIH0pO1xuICAgICAgfSwge1xuICAgICAgICBvd25lcjogJ3RpbWVsaW5lJyxcbiAgICAgICAgcGxheWluZzogZmFsc2UsXG4gICAgICAgIHN0b3J5V1U6IGRyYWcuc3RvcnlXVSArIG1vdmVtZW50LmRlbHRhV1UsXG4gICAgICB9KTtcbiAgICB9KTtcbiAgfTtcblxuICBjb25zdCBlbmRUaW1pbmdEcmFnID0gKGV2ZW50KSA9PiB7XG4gICAgY29uc3QgZHJhZyA9IHRpbWluZ0RyYWdSZWYuY3VycmVudDtcbiAgICBpZiAoIWRyYWcgfHwgZHJhZy5wb2ludGVySWQgIT09IGV2ZW50LnBvaW50ZXJJZCkgcmV0dXJuO1xuICAgIGlmIChldmVudC5jdXJyZW50VGFyZ2V0Lmhhc1BvaW50ZXJDYXB0dXJlPy4oZXZlbnQucG9pbnRlcklkKSkgZXZlbnQuY3VycmVudFRhcmdldC5yZWxlYXNlUG9pbnRlckNhcHR1cmUoZXZlbnQucG9pbnRlcklkKTtcbiAgICBpZiAoZHJhZy50eXBlID09PSAnY3VlJykge1xuICAgICAgZmx1c2hQcmV2aWV3RnJhbWUoKTtcbiAgICAgIGlmIChldmVudC50eXBlID09PSAncG9pbnRlcmNhbmNlbCcgfHwgIWRyYWcubW92ZWQpIHN0b3JlLmNhbmNlbFByZXZpZXcoKTtcbiAgICAgIGVsc2Ugc3RvcmUuY29tbWl0UHJldmlldyhkcmFnLnNlbGVjdGlvbik7XG4gICAgfVxuICAgIGlmIChkcmFnLnR5cGUgPT09ICdjYW1lcmEnICYmIGRyYWcubW92ZWQgJiYgZXZlbnQudHlwZSAhPT0gJ3BvaW50ZXJjYW5jZWwnKSB7XG4gICAgICBjb25zdCBkcm9wID0gZHJhZy5sYXN0RHJvcCB8fCByZXNvbHZlQ2FtZXJhRHJvcEF0Q2xpZW50WChldmVudC5jbGllbnRYKTtcbiAgICAgIGlmIChkcm9wLnZhbGlkKSB7XG4gICAgICAgIHN0b3JlLmNvbW1pdCgnTW92ZSBjYW1lcmEga2V5JywgKGRyYWZ0KSA9PiB7XG4gICAgICAgICAgY29uc3Qgc291cmNlS2V5cyA9IGRyYWZ0LnNlY3Rpb25zW2RyYWcuc2VjdGlvbkluZGV4XT8uY2FtZXJhLmtleXM7XG4gICAgICAgICAgY29uc3QgW21vdmVkS2V5XSA9IHNvdXJjZUtleXM/LnNwbGljZShkcmFnLmtleUluZGV4LCAxKSB8fCBbXTtcbiAgICAgICAgICBpZiAoIW1vdmVkS2V5KSByZXR1cm47XG4gICAgICAgICAgbW92ZWRLZXkuYXQgPSBkcm9wLmF0O1xuICAgICAgICAgIGNvbnN0IGRlc3RpbmF0aW9uS2V5cyA9IGRyYWZ0LnNlY3Rpb25zW2Ryb3Auc2VjdGlvbkluZGV4XS5jYW1lcmEua2V5cztcbiAgICAgICAgICBkZXN0aW5hdGlvbktleXMucHVzaChtb3ZlZEtleSk7XG4gICAgICAgICAgZGVzdGluYXRpb25LZXlzLnNvcnQoKGEsIGIpID0+IGEuYXQgLSBiLmF0KTtcbiAgICAgICAgfSwge1xuICAgICAgICAgIHNlbGVjdGlvbjogeyB0eXBlOiAnY2FtZXJhLWtleScsIHNlY3Rpb25JZDogZHJvcC5zZWN0aW9uSWQsIGtleUluZGV4OiBkcm9wLmtleUluZGV4IH0sXG4gICAgICAgIH0pO1xuICAgICAgICBzdG9yZS5zZXRUcmFuc3BvcnQoeyBvd25lcjogJ3RpbWVsaW5lJywgcGxheWluZzogZmFsc2UsIHN0b3J5V1U6IGRyb3Auc3RvcnlXVSB9KTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHN0b3JlLnNldFNhdmVTdGF0ZSh7IG1lc3NhZ2U6IGRyb3AucmVhc29uIHx8ICdUaGF0IGNhbWVyYSBrZXkgY2Fubm90IGJlIHBsYWNlZCBoZXJlLicgfSk7XG4gICAgICB9XG4gICAgfVxuICAgIGlmIChkcmFnLm1vdmVkKSB7XG4gICAgICBzdXBwcmVzc2VkQ2xpY2tSZWYuY3VycmVudCA9IGRyYWcudG9rZW47XG4gICAgICB3aW5kb3cuc2V0VGltZW91dCgoKSA9PiB7XG4gICAgICAgIGlmIChzdXBwcmVzc2VkQ2xpY2tSZWYuY3VycmVudCA9PT0gZHJhZy50b2tlbikgc3VwcHJlc3NlZENsaWNrUmVmLmN1cnJlbnQgPSBudWxsO1xuICAgICAgfSwgMCk7XG4gICAgfVxuICAgIHNldENhbWVyYURyYWdQcmV2aWV3KG51bGwpO1xuICAgIHRpbWluZ0RyYWdSZWYuY3VycmVudCA9IG51bGw7XG4gIH07XG5cbiAgY29uc3QgaGFuZGxlVGltaW5nQ2xpY2sgPSAodG9rZW4sIGFjdGlvbikgPT4ge1xuICAgIGlmIChzdXBwcmVzc2VkQ2xpY2tSZWYuY3VycmVudCA9PT0gdG9rZW4pIHtcbiAgICAgIHN1cHByZXNzZWRDbGlja1JlZi5jdXJyZW50ID0gbnVsbDtcbiAgICAgIHJldHVybjtcbiAgICB9XG4gICAgYWN0aW9uKCk7XG4gIH07XG5cbiAgY29uc3QgYmVnaW5TZWN0aW9uUmVzaXplID0gKGV2ZW50LCBkYXRhKSA9PiB7XG4gICAgaWYgKGRhdGEubG9ja2VkIHx8IGV2ZW50LmJ1dHRvbiAhPT0gMCkgcmV0dXJuO1xuICAgIGV2ZW50LnByZXZlbnREZWZhdWx0KCk7XG4gICAgZXZlbnQuc3RvcFByb3BhZ2F0aW9uKCk7XG4gICAgZXZlbnQuY3VycmVudFRhcmdldC5zZXRQb2ludGVyQ2FwdHVyZT8uKGV2ZW50LnBvaW50ZXJJZCk7XG4gICAgY29uc3QgY3VycmVudCA9IHN0b3JlLmdldFNuYXBzaG90KCk7XG4gICAgY29uc3QgZmllbGQgPSBnZXRBYm91dE5hcnJhdGl2ZUV4dGVudEZpZWxkKGN1cnJlbnQucHJldmlld1Byb2ZpbGUpO1xuICAgIHN0b3JlLmJlZ2luUHJldmlldyhgUmVzaXplICR7ZGF0YS5zZWN0aW9uTGFiZWx9YCk7XG4gICAgc3RvcmUuc2V0U2VsZWN0aW9uKHsgdHlwZTogJ3NlY3Rpb24nLCBzZWN0aW9uSWQ6IGRhdGEuc2VjdGlvbklkIH0pO1xuICAgIHRpbWluZ0RyYWdSZWYuY3VycmVudCA9IHtcbiAgICAgIHR5cGU6ICdzZWN0aW9uLXJlc2l6ZScsXG4gICAgICB0b2tlbjogYHNlY3Rpb24tcmVzaXplOiR7ZGF0YS5zZWN0aW9uSWR9YCxcbiAgICAgIHBvaW50ZXJJZDogZXZlbnQucG9pbnRlcklkLFxuICAgICAgc3RhcnRYOiBldmVudC5jbGllbnRYLFxuICAgICAgbW92ZWQ6IGZhbHNlLFxuICAgICAgc2VjdGlvbklkOiBkYXRhLnNlY3Rpb25JZCxcbiAgICAgIHNlY3Rpb25JbmRleDogZGF0YS5zZWN0aW9uSW5kZXgsXG4gICAgICBzZWN0aW9uTGFiZWw6IGRhdGEuc2VjdGlvbkxhYmVsLFxuICAgICAgZmllbGQsXG4gICAgICBzdGFydEV4dGVudDogTnVtYmVyKGN1cnJlbnQuZG9jdW1lbnQuc2VjdGlvbnNbZGF0YS5zZWN0aW9uSW5kZXhdW2ZpZWxkXSksXG4gICAgICBzdGFydE1heFdVOiBNYXRoLm1heCgwLjAwMSwgY3VycmVudC5jb21waWxlZFBsYW4/Lm1heFN0b3J5V1UgfHwgbWF4V1UpLFxuICAgICAgc3RhcnRTY3JvbGxXaWR0aDogTWF0aC5tYXgoMSwgbGFuZXNSZWYuY3VycmVudD8uc2Nyb2xsV2lkdGggfHwgMSksXG4gICAgICBwbGF5aGVhZENvbnRleHQ6IGNhcHR1cmVBYm91dE5hcnJhdGl2ZVBsYXloZWFkQ29udGV4dCh7XG4gICAgICAgIHBsYW46IGN1cnJlbnQuY29tcGlsZWRQbGFuLFxuICAgICAgICBzdG9yeVdVOiBjdXJyZW50LnRyYW5zcG9ydC5zdG9yeVdVLFxuICAgICAgICByZXNpemVkU2VjdGlvbklkOiBkYXRhLnNlY3Rpb25JZCxcbiAgICAgIH0pLFxuICAgICAgc2VsZWN0aW9uOiB7IHR5cGU6ICdzZWN0aW9uJywgc2VjdGlvbklkOiBkYXRhLnNlY3Rpb25JZCB9LFxuICAgIH07XG4gICAgc2V0U2VjdGlvblJlc2l6ZVByZXZpZXcoeyBzZWN0aW9uSWQ6IGRhdGEuc2VjdGlvbklkLCBleHRlbnQ6IE51bWJlcihjdXJyZW50LmRvY3VtZW50LnNlY3Rpb25zW2RhdGEuc2VjdGlvbkluZGV4XVtmaWVsZF0pIH0pO1xuICB9O1xuXG4gIGNvbnN0IG1vdmVTZWN0aW9uUmVzaXplID0gKGV2ZW50KSA9PiB7XG4gICAgY29uc3QgZHJhZyA9IHRpbWluZ0RyYWdSZWYuY3VycmVudDtcbiAgICBpZiAoZHJhZz8udHlwZSAhPT0gJ3NlY3Rpb24tcmVzaXplJyB8fCBkcmFnLnBvaW50ZXJJZCAhPT0gZXZlbnQucG9pbnRlcklkKSByZXR1cm47XG4gICAgaWYgKCFkcmFnLm1vdmVkICYmIE1hdGguYWJzKGV2ZW50LmNsaWVudFggLSBkcmFnLnN0YXJ0WCkgPCAzKSByZXR1cm47XG4gICAgZHJhZy5tb3ZlZCA9IHRydWU7XG4gICAgY29uc3QgcmF3RXh0ZW50ID0gZHJhZy5zdGFydEV4dGVudCArICgoKGV2ZW50LmNsaWVudFggLSBkcmFnLnN0YXJ0WCkgLyBkcmFnLnN0YXJ0U2Nyb2xsV2lkdGgpICogZHJhZy5zdGFydE1heFdVKTtcbiAgICBjb25zdCBzdGVwID0gZXZlbnQuYWx0S2V5ID8gMC4wMSA6IGV2ZW50LnNoaWZ0S2V5ID8gMC4yNSA6IDAuMDU7XG4gICAgY29uc3QgZXh0ZW50ID0gTWF0aC5taW4oOCwgTWF0aC5tYXgoMSwgTWF0aC5yb3VuZChyYXdFeHRlbnQgLyBzdGVwKSAqIHN0ZXApKTtcbiAgICBpZiAoTWF0aC5hYnMoZXh0ZW50IC0gKGRyYWcubGFzdEV4dGVudCA/PyBkcmFnLnN0YXJ0RXh0ZW50KSkgPCAwLjAwMDAwMSkgcmV0dXJuO1xuICAgIGRyYWcubGFzdEV4dGVudCA9IE51bWJlcihleHRlbnQudG9GaXhlZCgyKSk7XG4gICAgc2V0U2VjdGlvblJlc2l6ZVByZXZpZXcoeyBzZWN0aW9uSWQ6IGRyYWcuc2VjdGlvbklkLCBleHRlbnQ6IGRyYWcubGFzdEV4dGVudCB9KTtcbiAgICBxdWV1ZVByZXZpZXdGcmFtZSgoKSA9PiB7XG4gICAgICBzdG9yZS51cGRhdGVQcmV2aWV3KChkcmFmdCkgPT4ge1xuICAgICAgICBkcmFmdC5zZWN0aW9uc1tkcmFnLnNlY3Rpb25JbmRleF1bZHJhZy5maWVsZF0gPSBkcmFnLmxhc3RFeHRlbnQ7XG4gICAgICB9KTtcbiAgICAgIHN0b3JlLnNldFRyYW5zcG9ydCh7XG4gICAgICAgIG93bmVyOiAndGltZWxpbmUnLFxuICAgICAgICBwbGF5aW5nOiBmYWxzZSxcbiAgICAgICAgc3RvcnlXVTogcmVtYXBBYm91dE5hcnJhdGl2ZVBsYXloZWFkQ29udGV4dChkcmFnLnBsYXloZWFkQ29udGV4dCwgc3RvcmUuZ2V0U25hcHNob3QoKS5jb21waWxlZFBsYW4pLFxuICAgICAgfSk7XG4gICAgfSk7XG4gIH07XG5cbiAgY29uc3QgZW5kU2VjdGlvblJlc2l6ZSA9IChldmVudCkgPT4ge1xuICAgIGNvbnN0IGRyYWcgPSB0aW1pbmdEcmFnUmVmLmN1cnJlbnQ7XG4gICAgaWYgKGRyYWc/LnR5cGUgIT09ICdzZWN0aW9uLXJlc2l6ZScgfHwgZHJhZy5wb2ludGVySWQgIT09IGV2ZW50LnBvaW50ZXJJZCkgcmV0dXJuO1xuICAgIGlmIChldmVudC5jdXJyZW50VGFyZ2V0Lmhhc1BvaW50ZXJDYXB0dXJlPy4oZXZlbnQucG9pbnRlcklkKSkgZXZlbnQuY3VycmVudFRhcmdldC5yZWxlYXNlUG9pbnRlckNhcHR1cmUoZXZlbnQucG9pbnRlcklkKTtcbiAgICBmbHVzaFByZXZpZXdGcmFtZSgpO1xuICAgIGlmIChldmVudC50eXBlID09PSAncG9pbnRlcmNhbmNlbCcgfHwgIWRyYWcubW92ZWQpIHN0b3JlLmNhbmNlbFByZXZpZXcoKTtcbiAgICBlbHNlIHN0b3JlLmNvbW1pdFByZXZpZXcoZHJhZy5zZWxlY3Rpb24pO1xuICAgIHRpbWluZ0RyYWdSZWYuY3VycmVudCA9IG51bGw7XG4gICAgc2V0U2VjdGlvblJlc2l6ZVByZXZpZXcobnVsbCk7XG4gIH07XG5cbiAgY29uc3QgcmVzZXRTZWN0aW9uRXh0ZW50ID0gKHNlY3Rpb25JZCwgc2VjdGlvbkluZGV4KSA9PiB7XG4gICAgY29uc3QgY3VycmVudCA9IHN0b3JlLmdldFNuYXBzaG90KCk7XG4gICAgY29uc3QgZmllbGQgPSBnZXRBYm91dE5hcnJhdGl2ZUV4dGVudEZpZWxkKGN1cnJlbnQucHJldmlld1Byb2ZpbGUpO1xuICAgIGNvbnN0IGJhc2VsaW5lU2VjdGlvbiA9IGN1cnJlbnQuYmFzZWxpbmVEb2N1bWVudC5zZWN0aW9ucy5maW5kKChpdGVtKSA9PiBpdGVtLmlkID09PSBzZWN0aW9uSWQpO1xuICAgIGlmICghYmFzZWxpbmVTZWN0aW9uIHx8IGJhc2VsaW5lU2VjdGlvbltmaWVsZF0gPT09IGN1cnJlbnQuZG9jdW1lbnQuc2VjdGlvbnNbc2VjdGlvbkluZGV4XVtmaWVsZF0pIHJldHVybjtcbiAgICBjb25zdCBjb250ZXh0ID0gY2FwdHVyZUFib3V0TmFycmF0aXZlUGxheWhlYWRDb250ZXh0KHtcbiAgICAgIHBsYW46IGN1cnJlbnQuY29tcGlsZWRQbGFuLFxuICAgICAgc3RvcnlXVTogY3VycmVudC50cmFuc3BvcnQuc3RvcnlXVSxcbiAgICAgIHJlc2l6ZWRTZWN0aW9uSWQ6IHNlY3Rpb25JZCxcbiAgICB9KTtcbiAgICBzdG9yZS5iZWdpblByZXZpZXcoJ1Jlc3RvcmUgc2F2ZWQgU2VjdGlvbiBsZW5ndGgnKTtcbiAgICBzdG9yZS51cGRhdGVQcmV2aWV3KChkcmFmdCkgPT4geyBkcmFmdC5zZWN0aW9uc1tzZWN0aW9uSW5kZXhdW2ZpZWxkXSA9IGJhc2VsaW5lU2VjdGlvbltmaWVsZF07IH0pO1xuICAgIHN0b3JlLnNldFRyYW5zcG9ydCh7IHN0b3J5V1U6IHJlbWFwQWJvdXROYXJyYXRpdmVQbGF5aGVhZENvbnRleHQoY29udGV4dCwgc3RvcmUuZ2V0U25hcHNob3QoKS5jb21waWxlZFBsYW4pIH0pO1xuICAgIHN0b3JlLmNvbW1pdFByZXZpZXcoeyB0eXBlOiAnc2VjdGlvbicsIHNlY3Rpb25JZCB9KTtcbiAgfTtcblxuICBjb25zdCBiZWdpbk1hcnF1ZWUgPSAoZXZlbnQpID0+IHtcbiAgICBpZiAoZXZlbnQuYnV0dG9uICE9PSAwIHx8IGV2ZW50LnRhcmdldCAhPT0gZXZlbnQuY3VycmVudFRhcmdldCkgcmV0dXJuO1xuICAgIGNvbnN0IGNhbnZhcyA9IGxhbmVzUmVmLmN1cnJlbnQ/LnF1ZXJ5U2VsZWN0b3IoJy5hYm91dC1lZGl0b3ItdGltZWxpbmUtY2FudmFzJyk7XG4gICAgaWYgKCFjYW52YXMpIHJldHVybjtcbiAgICBldmVudC5wcmV2ZW50RGVmYXVsdCgpO1xuICAgIGV2ZW50LmN1cnJlbnRUYXJnZXQuc2V0UG9pbnRlckNhcHR1cmU/LihldmVudC5wb2ludGVySWQpO1xuICAgIGNvbnN0IHJlY3QgPSBjYW52YXMuZ2V0Qm91bmRpbmdDbGllbnRSZWN0KCk7XG4gICAgdGltaW5nRHJhZ1JlZi5jdXJyZW50ID0ge1xuICAgICAgdHlwZTogJ21hcnF1ZWUnLFxuICAgICAgcG9pbnRlcklkOiBldmVudC5wb2ludGVySWQsXG4gICAgICBzdGFydENsaWVudFg6IGV2ZW50LmNsaWVudFgsXG4gICAgICBzdGFydENsaWVudFk6IGV2ZW50LmNsaWVudFksXG4gICAgICBjYW52YXNSZWN0OiByZWN0LFxuICAgICAgYWRkaXRpdmU6IGV2ZW50LnNoaWZ0S2V5LFxuICAgIH07XG4gICAgc2V0TWFycXVlZSh7IGxlZnQ6IGV2ZW50LmNsaWVudFggLSByZWN0LmxlZnQsIHRvcDogZXZlbnQuY2xpZW50WSAtIHJlY3QudG9wLCB3aWR0aDogMCwgaGVpZ2h0OiAwIH0pO1xuICB9O1xuXG4gIGNvbnN0IG1vdmVNYXJxdWVlID0gKGV2ZW50KSA9PiB7XG4gICAgY29uc3QgZHJhZyA9IHRpbWluZ0RyYWdSZWYuY3VycmVudDtcbiAgICBpZiAoZHJhZz8udHlwZSAhPT0gJ21hcnF1ZWUnIHx8IGRyYWcucG9pbnRlcklkICE9PSBldmVudC5wb2ludGVySWQpIHJldHVybjtcbiAgICBjb25zdCBsZWZ0ID0gTWF0aC5taW4oZHJhZy5zdGFydENsaWVudFgsIGV2ZW50LmNsaWVudFgpIC0gZHJhZy5jYW52YXNSZWN0LmxlZnQ7XG4gICAgY29uc3QgdG9wID0gTWF0aC5taW4oZHJhZy5zdGFydENsaWVudFksIGV2ZW50LmNsaWVudFkpIC0gZHJhZy5jYW52YXNSZWN0LnRvcDtcbiAgICBzZXRNYXJxdWVlKHtcbiAgICAgIGxlZnQsXG4gICAgICB0b3AsXG4gICAgICB3aWR0aDogTWF0aC5hYnMoZXZlbnQuY2xpZW50WCAtIGRyYWcuc3RhcnRDbGllbnRYKSxcbiAgICAgIGhlaWdodDogTWF0aC5hYnMoZXZlbnQuY2xpZW50WSAtIGRyYWcuc3RhcnRDbGllbnRZKSxcbiAgICB9KTtcbiAgfTtcblxuICBjb25zdCBlbmRNYXJxdWVlID0gKGV2ZW50KSA9PiB7XG4gICAgY29uc3QgZHJhZyA9IHRpbWluZ0RyYWdSZWYuY3VycmVudDtcbiAgICBpZiAoZHJhZz8udHlwZSAhPT0gJ21hcnF1ZWUnIHx8IGRyYWcucG9pbnRlcklkICE9PSBldmVudC5wb2ludGVySWQpIHJldHVybjtcbiAgICBpZiAoZXZlbnQuY3VycmVudFRhcmdldC5oYXNQb2ludGVyQ2FwdHVyZT8uKGV2ZW50LnBvaW50ZXJJZCkpIGV2ZW50LmN1cnJlbnRUYXJnZXQucmVsZWFzZVBvaW50ZXJDYXB0dXJlKGV2ZW50LnBvaW50ZXJJZCk7XG4gICAgaWYgKGV2ZW50LnR5cGUgIT09ICdwb2ludGVyY2FuY2VsJykge1xuICAgICAgY29uc3Qgc2VsZWN0aW9uUmVjdCA9IHtcbiAgICAgICAgbGVmdDogTWF0aC5taW4oZHJhZy5zdGFydENsaWVudFgsIGV2ZW50LmNsaWVudFgpLFxuICAgICAgICByaWdodDogTWF0aC5tYXgoZHJhZy5zdGFydENsaWVudFgsIGV2ZW50LmNsaWVudFgpLFxuICAgICAgICB0b3A6IE1hdGgubWluKGRyYWcuc3RhcnRDbGllbnRZLCBldmVudC5jbGllbnRZKSxcbiAgICAgICAgYm90dG9tOiBNYXRoLm1heChkcmFnLnN0YXJ0Q2xpZW50WSwgZXZlbnQuY2xpZW50WSksXG4gICAgICB9O1xuICAgICAgY29uc3QgbGFuZVJlY3QgPSBsYW5lc1JlZi5jdXJyZW50Py5nZXRCb3VuZGluZ0NsaWVudFJlY3QoKTtcbiAgICAgIGNvbnN0IGhpdHMgPSBbLi4uKGxhbmVzUmVmLmN1cnJlbnQ/LnF1ZXJ5U2VsZWN0b3JBbGwoJy5hYm91dC1lZGl0b3ItY3VlW2RhdGEtY3VlLWlkXScpIHx8IFtdKV1cbiAgICAgICAgLmZpbHRlcigobm9kZSkgPT4ge1xuICAgICAgICAgIGNvbnN0IHJlY3QgPSBub2RlLmdldEJvdW5kaW5nQ2xpZW50UmVjdCgpO1xuICAgICAgICAgIGNvbnN0IHZpc2libGUgPSBsYW5lUmVjdCAmJiByZWN0LnJpZ2h0ID49IGxhbmVSZWN0LmxlZnQgJiYgcmVjdC5sZWZ0IDw9IGxhbmVSZWN0LnJpZ2h0O1xuICAgICAgICAgIHJldHVybiB2aXNpYmxlICYmIHJlY3QucmlnaHQgPj0gc2VsZWN0aW9uUmVjdC5sZWZ0ICYmIHJlY3QubGVmdCA8PSBzZWxlY3Rpb25SZWN0LnJpZ2h0XG4gICAgICAgICAgICAmJiByZWN0LmJvdHRvbSA+PSBzZWxlY3Rpb25SZWN0LnRvcCAmJiByZWN0LnRvcCA8PSBzZWxlY3Rpb25SZWN0LmJvdHRvbTtcbiAgICAgICAgfSlcbiAgICAgICAgLm1hcCgobm9kZSkgPT4gKHsgdHlwZTogJ2N1ZScsIHNlY3Rpb25JZDogbm9kZS5kYXRhc2V0LnNlY3Rpb25JZCwgY3VlSWQ6IG5vZGUuZGF0YXNldC5jdWVJZCwga2V5UGFydDogJ2ZvY3VzJyB9KSk7XG4gICAgICBpZiAoaGl0cy5sZW5ndGgpIHtcbiAgICAgICAgbGV0IG5leHRTZWxlY3Rpb24gPSBkcmFnLmFkZGl0aXZlID8gc3RvcmUuZ2V0U25hcHNob3QoKS5zZWxlY3Rpb24gOiBoaXRzWzBdO1xuICAgICAgICBoaXRzLnNsaWNlKGRyYWcuYWRkaXRpdmUgPyAwIDogMSkuZm9yRWFjaCgoaGl0KSA9PiB7XG4gICAgICAgICAgbmV4dFNlbGVjdGlvbiA9IHRvZ2dsZUFib3V0TmFycmF0aXZlQ3VlU2VsZWN0aW9uKG5leHRTZWxlY3Rpb24sIGhpdCk7XG4gICAgICAgIH0pO1xuICAgICAgICBzdG9yZS5zZXRTZWxlY3Rpb24obmV4dFNlbGVjdGlvbik7XG4gICAgICB9XG4gICAgfVxuICAgIHRpbWluZ0RyYWdSZWYuY3VycmVudCA9IG51bGw7XG4gICAgc2V0TWFycXVlZShudWxsKTtcbiAgfTtcblxuICByZXR1cm4gKFxuICAgIDxkaXYgY2xhc3NOYW1lPVwiYWJvdXQtZWRpdG9yLXRpbWVsaW5lXCI+XG4gICAgICA8ZGl2IGNsYXNzTmFtZT1cImFib3V0LWVkaXRvci1sYW5lLWxhYmVsc1wiIGFyaWEtbGFiZWw9XCJUaW1lbGluZSB0cmFja3NcIj5cbiAgICAgICAge1RJTUVMSU5FX0dMT0JBTF9UUkFDS1MubWFwKCh0cmFjaykgPT4gKFxuICAgICAgICAgIHRyYWNrLmdyb3VwSWRzLmxlbmd0aCA/IChcbiAgICAgICAgICAgIDxidXR0b25cbiAgICAgICAgICAgICAgdHlwZT1cImJ1dHRvblwiXG4gICAgICAgICAgICAgIGtleT17dHJhY2subGFuZX1cbiAgICAgICAgICAgICAgY2xhc3NOYW1lPXtzZWxlY3Rpb24udHlwZSA9PT0gJ3NlcXVlbmNlJyAmJiBzZWxlY3Rpb24udHJhY2sgPT09IHRyYWNrLmxhbmUgPyAnaXMtYWN0aXZlJyA6ICcnfVxuICAgICAgICAgICAgICBkYXRhLWdsb2JhbC10cmFjaz17dHJhY2subGFuZX1cbiAgICAgICAgICAgICAgYXJpYS1sYWJlbD17YE9wZW4gZ2xvYmFsICR7dHJhY2subGFiZWx9IGNvbnRyb2xzYH1cbiAgICAgICAgICAgICAgYXJpYS1wcmVzc2VkPXtzZWxlY3Rpb24udHlwZSA9PT0gJ3NlcXVlbmNlJyAmJiBzZWxlY3Rpb24udHJhY2sgPT09IHRyYWNrLmxhbmV9XG4gICAgICAgICAgICAgIG9uQ2xpY2s9eygpID0+IG9uT3Blbkdsb2JhbD8uKHsgdHlwZTogJ3NlcXVlbmNlJywgdHJhY2s6IHRyYWNrLmxhbmUsIHRyYWNrTGFiZWw6IHRyYWNrLmxhYmVsLCBncm91cElkczogdHJhY2suZ3JvdXBJZHMgfSl9XG4gICAgICAgICAgICA+e3RyYWNrLmxhYmVsfTwvYnV0dG9uPlxuICAgICAgICAgICkgOiA8c3BhbiBrZXk9e3RyYWNrLmxhbmV9Pnt0cmFjay5sYWJlbH08L3NwYW4+XG4gICAgICAgICkpfVxuICAgICAgPC9kaXY+XG4gICAgICA8ZGl2IHJlZj17bGFuZXNSZWZ9IGNsYXNzTmFtZT1cImFib3V0LWVkaXRvci1sYW5lc1wiIGRhdGEtc29sby10cmFjaz17dHJhbnNwb3J0LnNvbG9UcmFjayB8fCAnJ30gb25XaGVlbD17em9vbVRpbWVsaW5lfT5cbiAgICAgICAgPGRpdiBjbGFzc05hbWU9XCJhYm91dC1lZGl0b3ItdGltZWxpbmUtY2FudmFzXCIgc3R5bGU9e3sgJy0tYWJvdXQtZWRpdG9yLXBsYXloZWFkJzogcGxheWhlYWQsICctLWFib3V0LWVkaXRvci10aW1lbGluZS16b29tJzogTWF0aC5tYXgoMSwgTnVtYmVyKHRyYW5zcG9ydC56b29tKSB8fCAxKSB9fT5cbiAgICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cImFib3V0LWVkaXRvci1wbGF5aGVhZFwiIC8+XG4gICAgICAgICAge21hcnF1ZWUgPyA8ZGl2IGNsYXNzTmFtZT1cImFib3V0LWVkaXRvci1tYXJxdWVlXCIgc3R5bGU9e21hcnF1ZWV9IGFyaWEtaGlkZGVuPVwidHJ1ZVwiIC8+IDogbnVsbH1cbiAgICAgICAgICB7Y2FtZXJhRHJhZ1ByZXZpZXcgPyAoXG4gICAgICAgICAgPGRpdlxuICAgICAgICAgICAgY2xhc3NOYW1lPXtgYWJvdXQtZWRpdG9yLWNhbWVyYS1kcmFnLWdob3N0JHtjYW1lcmFEcmFnUHJldmlldy52YWxpZCA/ICcnIDogJyBpcy1pbnZhbGlkJ31gfVxuICAgICAgICAgICAgc3R5bGU9e3sgbGVmdDogYCR7Y2FtZXJhRHJhZ1ByZXZpZXcuY29udGVudFh9cHhgIH19XG4gICAgICAgICAgICBhcmlhLWhpZGRlbj1cInRydWVcIlxuICAgICAgICAgID5cbiAgICAgICAgICAgIDxpIC8+XG4gICAgICAgICAgICA8c3Bhbj57Y2FtZXJhRHJhZ1ByZXZpZXcudmFsaWQgPyBgJHtjYW1lcmFEcmFnUHJldmlldy5zZWN0aW9uTGFiZWx9IMK3ICR7Zm9ybWF0Q2FtZXJhUGVyY2VudChjYW1lcmFEcmFnUHJldmlldy5hdCl9YCA6IGNhbWVyYURyYWdQcmV2aWV3LnJlYXNvbn08L3NwYW4+XG4gICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgKSA6IG51bGx9XG4gICAgICAgICAge1snc2VjdGlvbicsICdjYW1lcmEnLCAnd29ybGQnLCAndGV4dCcsICdpbnRlcmFjdGlvbiddLm1hcCgobGFuZSkgPT4gKFxuICAgICAgICAgIDxkaXYgY2xhc3NOYW1lPXtgYWJvdXQtZWRpdG9yLWxhbmUgYWJvdXQtZWRpdG9yLWxhbmUtLSR7bGFuZX1gfSBrZXk9e2xhbmV9PlxuICAgICAgICAgICAge2RvY3VtZW50LnNlY3Rpb25zLm1hcCgoc2VjdGlvbiwgc2VjdGlvbkluZGV4KSA9PiB7XG4gICAgICAgICAgICAgIGNvbnN0IGNvbXBpbGVkID0gY29tcGlsZWRQbGFuPy5zZWN0aW9ucz8uW3NlY3Rpb25JbmRleF07XG4gICAgICAgICAgICAgIGNvbnN0IHN0YXJ0V1UgPSBNYXRoLm1pbihtYXhXVSwgY29tcGlsZWQ/LnN0YXJ0V1UgfHwgMCk7XG4gICAgICAgICAgICAgIGNvbnN0IG5leHRTdGFydFdVID0gTWF0aC5taW4obWF4V1UsIGNvbXBpbGVkUGxhbj8uc2VjdGlvbnM/LltzZWN0aW9uSW5kZXggKyAxXT8uc3RhcnRXVSA/PyBtYXhXVSk7XG4gICAgICAgICAgICAgIGNvbnN0IHNwYW5XVSA9IE1hdGgubWF4KDAuMDAxLCBuZXh0U3RhcnRXVSAtIHN0YXJ0V1UpO1xuICAgICAgICAgICAgICBjb25zdCB3aWR0aCA9IGAkeyhzcGFuV1UgLyBtYXhXVSkgKiAxMDB9JWA7XG4gICAgICAgICAgICAgIGNvbnN0IGluU2VsZWN0ZWRTZWN0aW9uID0gc2VsZWN0aW9uLnNlY3Rpb25JZCA9PT0gc2VjdGlvbi5pZDtcbiAgICAgICAgICAgICAgY29uc3QgbG9jYWxQZXJjZW50ID0gKGF0KSA9PiBNYXRoLm1pbigxMDAsIChOdW1iZXIoYXQgfHwgMCkgKiAoY29tcGlsZWQ/LnRyYXZlbFdVIHx8IHNwYW5XVSkgLyBzcGFuV1UpICogMTAwKTtcbiAgICAgICAgICAgICAgY29uc3QgbG9jYWxQb3NpdGlvbiA9IChhdCkgPT4gYCR7bG9jYWxQZXJjZW50KGF0KX0lYDtcbiAgICAgICAgICAgICAgY29uc3QgZXh0ZW5kZWRMb2NhbFBvc2l0aW9uID0gKGF0KSA9PiBgJHsoTnVtYmVyKGF0IHx8IDApICogKGNvbXBpbGVkPy50cmF2ZWxXVSB8fCBzcGFuV1UpIC8gc3BhbldVKSAqIDEwMH0lYDtcbiAgICAgICAgICAgICAgY29uc3QgZXh0ZW5kZWRMb2NhbFdpZHRoID0gKGZyb20sIHRvKSA9PiBgJHtNYXRoLm1heCgwLjM1LCAoTnVtYmVyKHRvKSAtIE51bWJlcihmcm9tKSkgKiAoY29tcGlsZWQ/LnRyYXZlbFdVIHx8IHNwYW5XVSkgLyBzcGFuV1UgKiAxMDApfSVgO1xuICAgICAgICAgICAgICBjb25zdCB0ZXh0UG9zaXRpb24gPSAoYXQpID0+IGAke2NsYW1wMDEoTnVtYmVyKGF0IHx8IDApKSAqIDEwMH0lYDtcbiAgICAgICAgICAgICAgY29uc3Qgc2VsZWN0QXQgPSAobmV4dFNlbGVjdGlvbiwgYXQgPSAwKSA9PiB7XG4gICAgICAgICAgICAgICAgc3RvcmUuc2V0U2VsZWN0aW9uKHsgc2VjdGlvbklkOiBzZWN0aW9uLmlkLCAuLi5uZXh0U2VsZWN0aW9uIH0pO1xuICAgICAgICAgICAgICAgIHN0b3JlLnNldFRyYW5zcG9ydCh7XG4gICAgICAgICAgICAgICAgICBvd25lcjogJ3RpbWVsaW5lJyxcbiAgICAgICAgICAgICAgICAgIHBsYXlpbmc6IGZhbHNlLFxuICAgICAgICAgICAgICAgICAgc3RvcnlXVTogc3RhcnRXVSArIChOdW1iZXIoYXQgfHwgMCkgKiAoY29tcGlsZWQ/LnRyYXZlbFdVIHx8IDApKSxcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgICAgaWYgKGxhbmUgPT09ICdzZWN0aW9uJykge1xuICAgICAgICAgICAgICAgIGNvbnN0IGlzU2VsZWN0ZWQgPSBpblNlbGVjdGVkU2VjdGlvbiAmJiBzZWxlY3Rpb24udHlwZSA9PT0gJ3NlY3Rpb24nO1xuICAgICAgICAgICAgICAgIGNvbnN0IHJlc2l6ZUV4dGVudCA9IHNlY3Rpb25SZXNpemVQcmV2aWV3Py5zZWN0aW9uSWQgPT09IHNlY3Rpb24uaWRcbiAgICAgICAgICAgICAgICAgID8gc2VjdGlvblJlc2l6ZVByZXZpZXcuZXh0ZW50XG4gICAgICAgICAgICAgICAgICA6IE51bWJlcihzZWN0aW9uW2dldEFib3V0TmFycmF0aXZlRXh0ZW50RmllbGQoc25hcHNob3QucHJldmlld1Byb2ZpbGUpXSk7XG4gICAgICAgICAgICAgICAgcmV0dXJuIChcbiAgICAgICAgICAgICAgICAgIDxkaXZcbiAgICAgICAgICAgICAgICAgICAga2V5PXtzZWN0aW9uLmlkfVxuICAgICAgICAgICAgICAgICAgICBjbGFzc05hbWU9e2BhYm91dC1lZGl0b3Itc2VjdGlvbi1jbGlwJHtpc1NlbGVjdGVkID8gJyBpcy1zZWxlY3RlZCcgOiAnJ30ke2luU2VsZWN0ZWRTZWN0aW9uID8gJyBpcy1jb250ZXh0JyA6ICcnfWB9XG4gICAgICAgICAgICAgICAgICAgIHN0eWxlPXt7IHdpZHRoIH19XG4gICAgICAgICAgICAgICAgICAgIHRpdGxlPXtgJHtzZWN0aW9uLmxhYmVsfSDCtyAke2Zvcm1hdFdVKGNvbXBpbGVkPy5yZXNvbHZlZEV4dGVudFdVIHx8IHNlY3Rpb24uZXh0ZW50V1UpfWB9XG4gICAgICAgICAgICAgICAgICA+XG4gICAgICAgICAgICAgICAgICAgIDxidXR0b24gdHlwZT1cImJ1dHRvblwiIGFyaWEtcHJlc3NlZD17aXNTZWxlY3RlZH0gb25DbGljaz17KCkgPT4gc2VsZWN0QXQoeyB0eXBlOiAnc2VjdGlvbicgfSl9PlxuICAgICAgICAgICAgICAgICAgICAgIDxzcGFuPntTdHJpbmcoc2VjdGlvbkluZGV4ICsgMSkucGFkU3RhcnQoMiwgJzAnKX08L3NwYW4+e3NlY3Rpb24ubGFiZWx9XG4gICAgICAgICAgICAgICAgICAgIDwvYnV0dG9uPlxuICAgICAgICAgICAgICAgICAgICB7c2VjdGlvblJlc2l6ZVByZXZpZXc/LnNlY3Rpb25JZCA9PT0gc2VjdGlvbi5pZCA/IDxvdXRwdXQ+e2Zvcm1hdFdVKE1hdGgubWF4KDAsIHJlc2l6ZUV4dGVudCAtIDEpKX0gc2Nyb2xsIMK3IHtmb3JtYXRXVShyZXNpemVFeHRlbnQpfSB0b3RhbDwvb3V0cHV0PiA6IG51bGx9XG4gICAgICAgICAgICAgICAgICAgIDxidXR0b25cbiAgICAgICAgICAgICAgICAgICAgICB0eXBlPVwiYnV0dG9uXCJcbiAgICAgICAgICAgICAgICAgICAgICBjbGFzc05hbWU9XCJhYm91dC1lZGl0b3Itc2VjdGlvbi1yZXNpemVcIlxuICAgICAgICAgICAgICAgICAgICAgIGRpc2FibGVkPXtzZWN0aW9uLmxvY2tlZH1cbiAgICAgICAgICAgICAgICAgICAgICBhcmlhLWxhYmVsPXtgUmVzaXplICR7c2VjdGlvbi5sYWJlbH1gfVxuICAgICAgICAgICAgICAgICAgICAgIHRpdGxlPXtzZWN0aW9uLmxvY2tlZCA/ICdVbmxvY2sgdGhpcyBwcm90ZWN0ZWQgU2VjdGlvbiB0byByZXNpemUgaXQnIDogYERyYWcgdG8gY2hhbmdlICR7c25hcHNob3QucHJldmlld1Byb2ZpbGUgPT09ICdtb2JpbGUnID8gJ21vYmlsZScgOiAnZGVza3RvcCd9IHNjcm9sbCBsZW5ndGggwrcgZG91YmxlLWNsaWNrIHRvIHJlc3RvcmUgc2F2ZWQgbGVuZ3RoYH1cbiAgICAgICAgICAgICAgICAgICAgICBvbkRvdWJsZUNsaWNrPXsoZXZlbnQpID0+IHsgZXZlbnQucHJldmVudERlZmF1bHQoKTsgZXZlbnQuc3RvcFByb3BhZ2F0aW9uKCk7IHJlc2V0U2VjdGlvbkV4dGVudChzZWN0aW9uLmlkLCBzZWN0aW9uSW5kZXgpOyB9fVxuICAgICAgICAgICAgICAgICAgICAgIG9uUG9pbnRlckRvd249eyhldmVudCkgPT4gYmVnaW5TZWN0aW9uUmVzaXplKGV2ZW50LCB7IHNlY3Rpb25JZDogc2VjdGlvbi5pZCwgc2VjdGlvbkluZGV4LCBzZWN0aW9uTGFiZWw6IHNlY3Rpb24ubGFiZWwsIGxvY2tlZDogc2VjdGlvbi5sb2NrZWQgfSl9XG4gICAgICAgICAgICAgICAgICAgICAgb25Qb2ludGVyTW92ZT17bW92ZVNlY3Rpb25SZXNpemV9XG4gICAgICAgICAgICAgICAgICAgICAgb25Qb2ludGVyVXA9e2VuZFNlY3Rpb25SZXNpemV9XG4gICAgICAgICAgICAgICAgICAgICAgb25Qb2ludGVyQ2FuY2VsPXtlbmRTZWN0aW9uUmVzaXplfVxuICAgICAgICAgICAgICAgICAgICAvPlxuICAgICAgICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgICAgICAgKTtcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICBpZiAobGFuZSA9PT0gJ2NhbWVyYScpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gKFxuICAgICAgICAgICAgICAgICAgPGRpdiBjbGFzc05hbWU9XCJhYm91dC1lZGl0b3ItY2xpcFwiIGtleT17c2VjdGlvbi5pZH0gc3R5bGU9e3sgd2lkdGggfX0+XG4gICAgICAgICAgICAgICAgICAgIDxkaXYgY2xhc3NOYW1lPVwiYWJvdXQtZWRpdG9yLWNhbWVyYS1yYWlsXCIgYXJpYS1oaWRkZW49XCJ0cnVlXCI+XG4gICAgICAgICAgICAgICAgICAgICAge3NlY3Rpb24uY2FtZXJhLmtleXMuc2xpY2UoMSkubWFwKChrZXksIGtleUluZGV4KSA9PiB7XG4gICAgICAgICAgICAgICAgICAgICAgICBjb25zdCBmcm9tS2V5ID0gc2VjdGlvbi5jYW1lcmEua2V5c1trZXlJbmRleF07XG4gICAgICAgICAgICAgICAgICAgICAgICBjb25zdCBsZWZ0ID0gbG9jYWxQZXJjZW50KGZyb21LZXkuYXQpO1xuICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgcmlnaHQgPSBsb2NhbFBlcmNlbnQoa2V5LmF0KTtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiAoXG4gICAgICAgICAgICAgICAgICAgICAgICAgIDxzcGFuXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY2xhc3NOYW1lPXtjYW1lcmFQb3NlQ2hhbmdlcyhmcm9tS2V5LCBrZXkpID8gJ2lzLWF1dGhvcmVkLW1vdGlvbicgOiAnaXMtYmFzZS1kb2xseSd9XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAga2V5PXtgJHtzZWN0aW9uLmlkfTpjYW1lcmEtc3Bhbjoke2tleUluZGV4fWB9XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgc3R5bGU9e3sgbGVmdDogYCR7bGVmdH0lYCwgd2lkdGg6IGAke01hdGgubWF4KDAuNSwgcmlnaHQgLSBsZWZ0KX0lYCB9fVxuICAgICAgICAgICAgICAgICAgICAgICAgICAvPlxuICAgICAgICAgICAgICAgICAgICAgICAgKTtcbiAgICAgICAgICAgICAgICAgICAgICB9KX1cbiAgICAgICAgICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgICAgICAgICAgIHtzZWN0aW9uLmNhbWVyYS5rZXlzLm1hcCgoa2V5LCBrZXlJbmRleCkgPT4ge1xuICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IHRpbWluZ0JvdW5kcyA9IGdldEFib3V0TmFycmF0aXZlQ2FtZXJhS2V5VGltaW5nQm91bmRzKHNlY3Rpb24uY2FtZXJhLmtleXMsIGtleUluZGV4KTtcbiAgICAgICAgICAgICAgICAgICAgICBjb25zdCB0b2tlbiA9IGBjYW1lcmE6JHtzZWN0aW9uLmlkfToke2tleUluZGV4fWA7XG4gICAgICAgICAgICAgICAgICAgICAgY29uc3Qga2V5U2VsZWN0aW9uID0geyB0eXBlOiAnY2FtZXJhLWtleScsIHNlY3Rpb25JZDogc2VjdGlvbi5pZCwga2V5SW5kZXggfTtcbiAgICAgICAgICAgICAgICAgICAgICBjb25zdCBpc1NlbGVjdGVkID0gaW5TZWxlY3RlZFNlY3Rpb24gJiYgc2VsZWN0aW9uLnR5cGUgPT09ICdjYW1lcmEta2V5JyAmJiBzZWxlY3Rpb24ua2V5SW5kZXggPT09IGtleUluZGV4O1xuICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IHJlcXVpcmVkID0gdGltaW5nQm91bmRzLmxvY2tlZDtcbiAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gKFxuICAgICAgICAgICAgICAgICAgICAgICAgPGJ1dHRvblxuICAgICAgICAgICAgICAgICAgICAgICAgICB0eXBlPVwiYnV0dG9uXCJcbiAgICAgICAgICAgICAgICAgICAgICAgICAga2V5PXt0b2tlbn1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgY2xhc3NOYW1lPXtgYWJvdXQtZWRpdG9yLWtleSR7cmVxdWlyZWQgPyAnIGlzLWJvdW5kYXJ5JyA6ICcgaXMtZHJhZ2dhYmxlJ30ke2lzU2VsZWN0ZWQgPyAnIGlzLXNlbGVjdGVkJyA6ICcnfSR7Y2FtZXJhRHJhZ1ByZXZpZXc/LnRva2VuID09PSB0b2tlbiA/ICcgaXMtZHJhZy1zb3VyY2UnIDogJyd9YH1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgc3R5bGU9e3sgbGVmdDogbG9jYWxQb3NpdGlvbihrZXkuYXQpIH19XG4gICAgICAgICAgICAgICAgICAgICAgICAgIHRpdGxlPXtyZXF1aXJlZFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgID8gYFByb3RlY3RlZCBDYW1lcmEga2V5IGF0ICR7Zm9ybWF0Q2FtZXJhUGVyY2VudChrZXkuYXQpfSDCtyBzZWxlY3QgdG8gaW5zcGVjdGBcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICA6IGBDYW1lcmEga2V5IGF0ICR7Zm9ybWF0Q2FtZXJhUGVyY2VudChrZXkuYXQpfSDCtyBkcmFnIGFueXdoZXJlIG9uIHRoZSBDYW1lcmEgdHJhY2tgfVxuICAgICAgICAgICAgICAgICAgICAgICAgICBhcmlhLWxhYmVsPXtgJHtyZXF1aXJlZCA/ICdQcm90ZWN0ZWQgJyA6ICcnfUNhbWVyYSBrZXkgYXQgJHtmb3JtYXRDYW1lcmFQZXJjZW50KGtleS5hdCl9IHRocm91Z2ggJHtzZWN0aW9uLmxhYmVsfWB9XG4gICAgICAgICAgICAgICAgICAgICAgICAgIGFyaWEtcHJlc3NlZD17aXNTZWxlY3RlZH1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgb25Qb2ludGVyRG93bj17cmVxdWlyZWQgPyB1bmRlZmluZWQgOiAoZXZlbnQpID0+IGJlZ2luVGltaW5nRHJhZyhldmVudCwge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHR5cGU6ICdjYW1lcmEnLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRva2VuLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGxvY2tlZDogZmFsc2UsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgYXQ6IGtleS5hdCxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBzZWN0aW9uSW5kZXgsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAga2V5SW5kZXgsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgc2VjdGlvblN0YXJ0V1U6IHN0YXJ0V1UsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgc3BhbldVLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRyYXZlbFdVOiBjb21waWxlZD8udHJhdmVsV1UgfHwgc3BhbldVLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHN0b3J5V1U6IHN0YXJ0V1UgKyAoTnVtYmVyKGtleS5hdCkgKiAoY29tcGlsZWQ/LnRyYXZlbFdVIHx8IDApKSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBzZWxlY3Rpb246IGtleVNlbGVjdGlvbixcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb2FsZXNjZUtleTogYHRpbWVsaW5lOiR7dG9rZW59YCxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgfSl9XG4gICAgICAgICAgICAgICAgICAgICAgICAgIG9uUG9pbnRlck1vdmU9e3JlcXVpcmVkID8gdW5kZWZpbmVkIDogbW92ZVRpbWluZ0RyYWd9XG4gICAgICAgICAgICAgICAgICAgICAgICAgIG9uUG9pbnRlclVwPXtyZXF1aXJlZCA/IHVuZGVmaW5lZCA6IGVuZFRpbWluZ0RyYWd9XG4gICAgICAgICAgICAgICAgICAgICAgICAgIG9uUG9pbnRlckNhbmNlbD17cmVxdWlyZWQgPyB1bmRlZmluZWQgOiBlbmRUaW1pbmdEcmFnfVxuICAgICAgICAgICAgICAgICAgICAgICAgICBvbkNsaWNrPXsoKSA9PiBoYW5kbGVUaW1pbmdDbGljayh0b2tlbiwgKCkgPT4gc2VsZWN0QXQoeyB0eXBlOiAnY2FtZXJhLWtleScsIGtleUluZGV4IH0sIGtleS5hdCkpfVxuICAgICAgICAgICAgICAgICAgICAgICAgLz5cbiAgICAgICAgICAgICAgICAgICAgICApO1xuICAgICAgICAgICAgICAgICAgICB9KX1cbiAgICAgICAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgICAgICk7XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgaWYgKGxhbmUgPT09ICd3b3JsZCcpIHtcbiAgICAgICAgICAgICAgICBjb25zdCBpc1NlbGVjdGVkID0gaW5TZWxlY3RlZFNlY3Rpb24gJiYgc2VsZWN0aW9uLnR5cGUgPT09ICd3b3JsZCc7XG4gICAgICAgICAgICAgICAgY29uc3QgdHJhbnNpdGlvbiA9IHNlY3Rpb24ud29ybGQubW9kZSA9PT0gJ3NldCcgJiYgc2VjdGlvbi53b3JsZC50cmFuc2l0aW9uSW4udHlwZSAhPT0gJ2N1dCdcbiAgICAgICAgICAgICAgICAgID8gc2VjdGlvbi53b3JsZC50cmFuc2l0aW9uSW5cbiAgICAgICAgICAgICAgICAgIDogbnVsbDtcbiAgICAgICAgICAgICAgICByZXR1cm4gKFxuICAgICAgICAgICAgICAgICAgPGRpdiBjbGFzc05hbWU9e2BhYm91dC1lZGl0b3ItY2xpcCR7aXNTZWxlY3RlZCA/ICcgaXMtc2VsZWN0ZWQnIDogJyd9YH0ga2V5PXtzZWN0aW9uLmlkfSBzdHlsZT17eyB3aWR0aCB9fT5cbiAgICAgICAgICAgICAgICAgICAgPGJ1dHRvblxuICAgICAgICAgICAgICAgICAgICAgIHR5cGU9XCJidXR0b25cIlxuICAgICAgICAgICAgICAgICAgICAgIGNsYXNzTmFtZT17YGFib3V0LWVkaXRvci13b3JsZC1jbGlwICR7c2VjdGlvbi53b3JsZC5tb2RlID09PSAnc2V0JyA/ICdoYXMtd29ybGQnIDogJyd9JHtpc1NlbGVjdGVkID8gJyBpcy1zZWxlY3RlZCcgOiAnJ31gfVxuICAgICAgICAgICAgICAgICAgICAgIGFyaWEtcHJlc3NlZD17aXNTZWxlY3RlZH1cbiAgICAgICAgICAgICAgICAgICAgICBvbkNsaWNrPXsoKSA9PiBzZWxlY3RBdCh7IHR5cGU6ICd3b3JsZCcgfSwgdHJhbnNpdGlvbiA/IHRyYW5zaXRpb24uZW5kIDogMCl9XG4gICAgICAgICAgICAgICAgICAgID57c2VjdGlvbi53b3JsZC5tb2RlID09PSAnc2V0JyA/IHNlY3Rpb24ud29ybGQuc2hhcGVJZC5yZXBsYWNlKCctdjEnLCAnJykgOiAnY29udGludWUnfTwvYnV0dG9uPlxuICAgICAgICAgICAgICAgICAgICB7dHJhbnNpdGlvbiA/IFsnc3RhcnQnLCAnZW5kJ10ubWFwKChwYXJ0KSA9PiAoXG4gICAgICAgICAgICAgICAgICAgICAgPGJ1dHRvblxuICAgICAgICAgICAgICAgICAgICAgICAgdHlwZT1cImJ1dHRvblwiXG4gICAgICAgICAgICAgICAgICAgICAgICBrZXk9e3BhcnR9XG4gICAgICAgICAgICAgICAgICAgICAgICBjbGFzc05hbWU9e2BhYm91dC1lZGl0b3ItdGltaW5nLWtleSBpcy13b3JsZCR7aXNTZWxlY3RlZCAmJiBzZWxlY3Rpb24ua2V5UGFydCA9PT0gYHRyYW5zaXRpb24tJHtwYXJ0fWAgPyAnIGlzLXNlbGVjdGVkJyA6ICcnfWB9XG4gICAgICAgICAgICAgICAgICAgICAgICBzdHlsZT17eyBsZWZ0OiBleHRlbmRlZExvY2FsUG9zaXRpb24odHJhbnNpdGlvbltwYXJ0XSkgfX1cbiAgICAgICAgICAgICAgICAgICAgICAgIHRpdGxlPXtgV29ybGQgdHJhbnNpdGlvbiAke3BhcnR9YH1cbiAgICAgICAgICAgICAgICAgICAgICAgIGFyaWEtbGFiZWw9e2Ake3NlY3Rpb24ubGFiZWx9IFdvcmxkIHRyYW5zaXRpb24gJHtwYXJ0fWB9XG4gICAgICAgICAgICAgICAgICAgICAgICBvbkNsaWNrPXsoKSA9PiBzZWxlY3RBdCh7IHR5cGU6ICd3b3JsZCcsIGtleVBhcnQ6IGB0cmFuc2l0aW9uLSR7cGFydH1gIH0sIHRyYW5zaXRpb25bcGFydF0pfVxuICAgICAgICAgICAgICAgICAgICAgIC8+XG4gICAgICAgICAgICAgICAgICAgICkpIDogbnVsbH1cbiAgICAgICAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgICAgICk7XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgaWYgKGxhbmUgPT09ICd0ZXh0Jykge1xuICAgICAgICAgICAgICAgIHJldHVybiAoXG4gICAgICAgICAgICAgICAgICA8ZGl2XG4gICAgICAgICAgICAgICAgICAgIGNsYXNzTmFtZT17YGFib3V0LWVkaXRvci1jbGlwJHtzZWN0aW9uLnRleHQuZGlzY2lwbGluZVJldmVhbCA/ICcgaGFzLWV4dGVuZGVkLWRpc2NpcGxpbmUnIDogJyd9YH1cbiAgICAgICAgICAgICAgICAgICAga2V5PXtzZWN0aW9uLmlkfVxuICAgICAgICAgICAgICAgICAgICBzdHlsZT17eyB3aWR0aCB9fVxuICAgICAgICAgICAgICAgICAgICBvblBvaW50ZXJEb3duPXtiZWdpbk1hcnF1ZWV9XG4gICAgICAgICAgICAgICAgICAgIG9uUG9pbnRlck1vdmU9e21vdmVNYXJxdWVlfVxuICAgICAgICAgICAgICAgICAgICBvblBvaW50ZXJVcD17ZW5kTWFycXVlZX1cbiAgICAgICAgICAgICAgICAgICAgb25Qb2ludGVyQ2FuY2VsPXtlbmRNYXJxdWVlfVxuICAgICAgICAgICAgICAgICAgPlxuICAgICAgICAgICAgICAgICAgICB7KHNlY3Rpb24udGV4dC5jdWVzIHx8IFtdKS5tYXAoKGN1ZSkgPT4ge1xuICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IGlzU2VsZWN0ZWQgPSBzZWxlY3RlZEN1ZU1lbWJlcnMuc29tZSgobWVtYmVyKSA9PiBtZW1iZXIuc2VjdGlvbklkID09PSBzZWN0aW9uLmlkICYmIG1lbWJlci5jdWVJZCA9PT0gY3VlLmlkKTtcbiAgICAgICAgICAgICAgICAgICAgICBjb25zdCBpc1ByaW1hcnkgPSBzZWxlY3Rpb24udHlwZSA9PT0gJ2N1ZScgJiYgc2VsZWN0aW9uLnNlY3Rpb25JZCA9PT0gc2VjdGlvbi5pZCAmJiBzZWxlY3Rpb24uY3VlSWQgPT09IGN1ZS5pZDtcbiAgICAgICAgICAgICAgICAgICAgICBjb25zdCBtb3ZlbWVudCA9IGdldEFib3V0TmFycmF0aXZlQ3VlTW92ZW1lbnQoY3VlKTtcbiAgICAgICAgICAgICAgICAgICAgICBjb25zdCBtb3Rpb25JbnRlcnZhbCA9IG1vdmVtZW50ID09PSAnc3BhdGlhbCdcbiAgICAgICAgICAgICAgICAgICAgICAgID8gZ2V0QWJvdXROYXJyYXRpdmVDdWVNb3Rpb25JbnRlcnZhbChjdWUsIGRvY3VtZW50Lmdsb2JhbHMudGV4dE1vdGlvbilcbiAgICAgICAgICAgICAgICAgICAgICAgIDogbnVsbDtcbiAgICAgICAgICAgICAgICAgICAgICBjb25zdCBtb3Rpb25TcGFuID0gbW90aW9uSW50ZXJ2YWwgPyBNYXRoLm1heCgwLjAwMDAxLCBtb3Rpb25JbnRlcnZhbC5lbmQgLSBtb3Rpb25JbnRlcnZhbC5zdGFydCkgOiAwO1xuICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IGN1ZVN0eWxlID0gbW90aW9uSW50ZXJ2YWwgPyB7XG4gICAgICAgICAgICAgICAgICAgICAgICBsZWZ0OiB0ZXh0UG9zaXRpb24obW90aW9uSW50ZXJ2YWwuc3RhcnQpLFxuICAgICAgICAgICAgICAgICAgICAgICAgd2lkdGg6IGAke01hdGgubWF4KDAuNSwgbW90aW9uU3BhbiAqIDEwMCl9JWAsXG4gICAgICAgICAgICAgICAgICAgICAgfSA6IHsgbGVmdDogdGV4dFBvc2l0aW9uKGN1ZS5ob2xkKSB9O1xuICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IGZvY3VzUG9zaXRpb24gPSBtb3Rpb25JbnRlcnZhbFxuICAgICAgICAgICAgICAgICAgICAgICAgPyBgJHsoKGN1ZS5ob2xkIC0gbW90aW9uSW50ZXJ2YWwuc3RhcnQpIC8gbW90aW9uU3BhbikgKiAxMDB9JWBcbiAgICAgICAgICAgICAgICAgICAgICAgIDogJzUwJSc7XG4gICAgICAgICAgICAgICAgICAgICAgY29uc3QgdGltaW5nQm91bmRzID0gZ2V0QWJvdXROYXJyYXRpdmVDdWVUaW1pbmdCb3VuZHMoY3VlKTtcbiAgICAgICAgICAgICAgICAgICAgICBjb25zdCB0b2tlbiA9IGBjdWU6JHtzZWN0aW9uLmlkfToke2N1ZS5pZH1gO1xuICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IGN1ZVNlbGVjdGlvbiA9IHsgdHlwZTogJ2N1ZScsIHNlY3Rpb25JZDogc2VjdGlvbi5pZCwgY3VlSWQ6IGN1ZS5pZCwga2V5UGFydDogJ2ZvY3VzJyB9O1xuICAgICAgICAgICAgICAgICAgICAgIHJldHVybiAoXG4gICAgICAgICAgICAgICAgICAgICAgICA8YnV0dG9uXG4gICAgICAgICAgICAgICAgICAgICAgICAgIHR5cGU9XCJidXR0b25cIlxuICAgICAgICAgICAgICAgICAgICAgICAgICBjbGFzc05hbWU9e2BhYm91dC1lZGl0b3ItY3VlIGlzLSR7bW92ZW1lbnR9JHt0aW1pbmdCb3VuZHMubWluID09PSB0aW1pbmdCb3VuZHMubWF4ID8gJyBpcy1ib3VuZGFyeScgOiAnIGlzLWRyYWdnYWJsZSd9JHtpc1NlbGVjdGVkID8gJyBpcy1zZWxlY3RlZCcgOiAnJ30ke2lzUHJpbWFyeSA/ICcgaXMtcHJpbWFyeS1zZWxlY3Rpb24nIDogJyd9YH1cbiAgICAgICAgICAgICAgICAgICAgICAgICAga2V5PXtjdWUuaWR9XG4gICAgICAgICAgICAgICAgICAgICAgICAgIGRhdGEtc2VjdGlvbi1pZD17c2VjdGlvbi5pZH1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgZGF0YS1jdWUtaWQ9e2N1ZS5pZH1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgc3R5bGU9e2N1ZVN0eWxlfVxuICAgICAgICAgICAgICAgICAgICAgICAgICBhcmlhLWxhYmVsPXtgJHttb3ZlbWVudCA9PT0gJ3ZlcnRpY2FsJyA/ICdWZXJ0aWNhbCcgOiAnU3BhdGlhbCd9IHRleHQgYXQgJHtNYXRoLnJvdW5kKGN1ZS5ob2xkICogMTAwKX0lJHttb3Rpb25JbnRlcnZhbCA/IGAgwrcgdHJhdmVscyAke01hdGgucm91bmQobW90aW9uSW50ZXJ2YWwuc3RhcnQgKiAxMDApfeKAkyR7TWF0aC5yb3VuZChtb3Rpb25JbnRlcnZhbC5lbmQgKiAxMDApfSVgIDogJyd9IMK3ICR7Y3VlLnRleHR9YH1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgYXJpYS1wcmVzc2VkPXtpc1NlbGVjdGVkfVxuICAgICAgICAgICAgICAgICAgICAgICAgICB0aXRsZT17YCR7bW92ZW1lbnQgPT09ICd2ZXJ0aWNhbCcgPyAnVmVydGljYWwnIDogJ1NwYXRpYWwnfSB0aXRsZSDCtyBkcmFnIHRvIG1vdmUgaXQ7IGR1cmF0aW9uIHN0YXlzIGdsb2JhbCDCtyAke2N1ZS50ZXh0fWB9XG4gICAgICAgICAgICAgICAgICAgICAgICAgIG9uUG9pbnRlckRvd249eyhldmVudCkgPT4gYmVnaW5UaW1pbmdEcmFnKGV2ZW50LCB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdHlwZTogJ2N1ZScsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdG9rZW4sXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgbG9ja2VkOiB0aW1pbmdCb3VuZHMubWluID09PSB0aW1pbmdCb3VuZHMubWF4LFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIG1pbjogdGltaW5nQm91bmRzLm1pbixcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBtYXg6IHRpbWluZ0JvdW5kcy5tYXgsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgYXQ6IGN1ZS5ob2xkLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHNlY3Rpb25JbmRleCxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjdWVJZDogY3VlLmlkLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHNlY3Rpb25TdGFydFdVOiBzdGFydFdVLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHNwYW5XVSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0cmF2ZWxXVTogY29tcGlsZWQ/LnRyYXZlbFdVIHx8IHNwYW5XVSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBzdG9yeVdVOiBzdGFydFdVICsgKE51bWJlcihjdWUuaG9sZCkgKiAoY29tcGlsZWQ/LnRyYXZlbFdVIHx8IDApKSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBzZWxlY3Rpb246IGN1ZVNlbGVjdGlvbixcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb2FsZXNjZUtleTogYHRpbWVsaW5lOiR7dG9rZW59YCxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgfSl9XG4gICAgICAgICAgICAgICAgICAgICAgICAgIG9uUG9pbnRlck1vdmU9e21vdmVUaW1pbmdEcmFnfVxuICAgICAgICAgICAgICAgICAgICAgICAgICBvblBvaW50ZXJVcD17ZW5kVGltaW5nRHJhZ31cbiAgICAgICAgICAgICAgICAgICAgICAgICAgb25Qb2ludGVyQ2FuY2VsPXtlbmRUaW1pbmdEcmFnfVxuICAgICAgICAgICAgICAgICAgICAgICAgICBvbktleURvd249eyhldmVudCkgPT4ge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChldmVudC5zaGlmdEtleSAmJiBldmVudC5jb2RlID09PSAnU3BhY2UnKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICBldmVudC5wcmV2ZW50RGVmYXVsdCgpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgbmV4dFNlbGVjdGlvbiA9IHRvZ2dsZUFib3V0TmFycmF0aXZlQ3VlU2VsZWN0aW9uKHN0b3JlLmdldFNuYXBzaG90KCkuc2VsZWN0aW9uLCBjdWVTZWxlY3Rpb24pO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgc3RvcmUuc2V0U2VsZWN0aW9uKG5leHRTZWxlY3Rpb24pO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgc3RvcmUuc2V0VHJhbnNwb3J0KHsgb3duZXI6ICd0aW1lbGluZScsIHBsYXlpbmc6IGZhbHNlLCBzdG9yeVdVOiBzdGFydFdVICsgKE51bWJlcihjdWUuaG9sZCkgKiAoY29tcGlsZWQ/LnRyYXZlbFdVIHx8IDApKSB9KTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICAgIH19XG4gICAgICAgICAgICAgICAgICAgICAgICAgIG9uQ2xpY2s9eygpID0+IGhhbmRsZVRpbWluZ0NsaWNrKHRva2VuLCAoKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgc3RvcmUuc2V0VHJhbnNwb3J0KHsgb3duZXI6ICd0aW1lbGluZScsIHBsYXlpbmc6IGZhbHNlLCBzdG9yeVdVOiBzdGFydFdVICsgKE51bWJlcihjdWUuaG9sZCkgKiAoY29tcGlsZWQ/LnRyYXZlbFdVIHx8IDApKSB9KTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgfSl9XG4gICAgICAgICAgICAgICAgICAgICAgICA+PHNwYW4gY2xhc3NOYW1lPVwiYWJvdXQtZWRpdG9yLWN1ZS1mb2N1c1wiIHN0eWxlPXt7IGxlZnQ6IGZvY3VzUG9zaXRpb24gfX0gYXJpYS1oaWRkZW49XCJ0cnVlXCIgLz48L2J1dHRvbj5cbiAgICAgICAgICAgICAgICAgICAgICApO1xuICAgICAgICAgICAgICAgICAgICB9KX1cbiAgICAgICAgICAgICAgICAgICAge3NlY3Rpb24udGV4dC5kaXNjaXBsaW5lUmV2ZWFsID8gKCgpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgICBjb25zdCByZXZlYWwgPSBzZWN0aW9uLnRleHQuZGlzY2lwbGluZVJldmVhbDtcbiAgICAgICAgICAgICAgICAgICAgICBjb25zdCBkdXJhdGlvbiA9IHJldmVhbC5lbmQgLSByZXZlYWwuc3RhcnQ7XG4gICAgICAgICAgICAgICAgICAgICAgY29uc3QgY2VudHJlID0gcmV2ZWFsLnN0YXJ0ICsgKGR1cmF0aW9uICogMC41KTtcbiAgICAgICAgICAgICAgICAgICAgICBjb25zdCBpc1NlbGVjdGVkID0gaW5TZWxlY3RlZFNlY3Rpb24gJiYgc2VsZWN0aW9uLnR5cGUgPT09ICdkaXNjaXBsaW5lLXJldmVhbCc7XG4gICAgICAgICAgICAgICAgICAgICAgY29uc3QgdG9rZW4gPSBgZGlzY2lwbGluZS1yZXZlYWw6JHtzZWN0aW9uLmlkfToke3JldmVhbC5pZH1gO1xuICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IHJldmVhbFNlbGVjdGlvbiA9IHsgdHlwZTogJ2Rpc2NpcGxpbmUtcmV2ZWFsJywgc2VjdGlvbklkOiBzZWN0aW9uLmlkIH07XG4gICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIChcbiAgICAgICAgICAgICAgICAgICAgICAgIDxidXR0b25cbiAgICAgICAgICAgICAgICAgICAgICAgICAgdHlwZT1cImJ1dHRvblwiXG4gICAgICAgICAgICAgICAgICAgICAgICAgIGNsYXNzTmFtZT17YGFib3V0LWVkaXRvci1kaXNjaXBsaW5lLXJldmVhbCBpcy1kcmFnZ2FibGUke2lzU2VsZWN0ZWQgPyAnIGlzLXNlbGVjdGVkJyA6ICcnfWB9XG4gICAgICAgICAgICAgICAgICAgICAgICAgIHN0eWxlPXt7IGxlZnQ6IGV4dGVuZGVkTG9jYWxQb3NpdGlvbihyZXZlYWwuc3RhcnQpLCB3aWR0aDogZXh0ZW5kZWRMb2NhbFdpZHRoKHJldmVhbC5zdGFydCwgcmV2ZWFsLmVuZCkgfX1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgYXJpYS1sYWJlbD17YERpc2NpcGxpbmUgcmV2ZWFsIGZyb20gJHtNYXRoLnJvdW5kKHJldmVhbC5zdGFydCAqIDEwMCl9JSB0byAke01hdGgucm91bmQocmV2ZWFsLmVuZCAqIDEwMCl9JWB9XG4gICAgICAgICAgICAgICAgICAgICAgICAgIGFyaWEtcHJlc3NlZD17aXNTZWxlY3RlZH1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgdGl0bGU9XCJEaXNjaXBsaW5lIHJldmVhbCDCtyBkcmFnIHRoZSBjb21wbGV0ZSBjbGlwIHRvIHJldGltZVwiXG4gICAgICAgICAgICAgICAgICAgICAgICAgIG9uUG9pbnRlckRvd249eyhldmVudCkgPT4gYmVnaW5UaW1pbmdEcmFnKGV2ZW50LCB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdHlwZTogJ2Rpc2NpcGxpbmUtcmV2ZWFsJyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0b2tlbixcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBsb2NrZWQ6IGZhbHNlLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIG1pbjogZHVyYXRpb24gKiAwLjUsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgbWF4OiBESVNDSVBMSU5FX1JFVkVBTF9NQVggLSAoZHVyYXRpb24gKiAwLjUpLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGF0OiBjZW50cmUsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgc2VjdGlvbkluZGV4LFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHNlY3Rpb25TdGFydFdVOiBzdGFydFdVLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHNwYW5XVSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0cmF2ZWxXVTogY29tcGlsZWQ/LnRyYXZlbFdVIHx8IHNwYW5XVSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBzdG9yeVdVOiBzdGFydFdVICsgKGNlbnRyZSAqIChjb21waWxlZD8udHJhdmVsV1UgfHwgMCkpLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHNlbGVjdGlvbjogcmV2ZWFsU2VsZWN0aW9uLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvYWxlc2NlS2V5OiBgdGltZWxpbmU6JHt0b2tlbn1gLFxuICAgICAgICAgICAgICAgICAgICAgICAgICB9KX1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgb25Qb2ludGVyTW92ZT17bW92ZVRpbWluZ0RyYWd9XG4gICAgICAgICAgICAgICAgICAgICAgICAgIG9uUG9pbnRlclVwPXtlbmRUaW1pbmdEcmFnfVxuICAgICAgICAgICAgICAgICAgICAgICAgICBvblBvaW50ZXJDYW5jZWw9e2VuZFRpbWluZ0RyYWd9XG4gICAgICAgICAgICAgICAgICAgICAgICAgIG9uQ2xpY2s9eygpID0+IGhhbmRsZVRpbWluZ0NsaWNrKHRva2VuLCAoKSA9PiBzZWxlY3RBdCh7IHR5cGU6ICdkaXNjaXBsaW5lLXJldmVhbCcgfSwgcmV2ZWFsLnN0YXJ0KSl9XG4gICAgICAgICAgICAgICAgICAgICAgICA+RGlzY2lwbGluZSByZXZlYWw8L2J1dHRvbj5cbiAgICAgICAgICAgICAgICAgICAgICApO1xuICAgICAgICAgICAgICAgICAgICB9KSgpIDogbnVsbH1cbiAgICAgICAgICAgICAgICAgICAgeyhzZWN0aW9uLnRleHQuYmxvY2tzIHx8IFtdKS5sZW5ndGggPyAoXG4gICAgICAgICAgICAgICAgICAgICAgPGJ1dHRvbiB0eXBlPVwiYnV0dG9uXCIgY2xhc3NOYW1lPXtgYWJvdXQtZWRpdG9yLWVkaXRvcmlhbC1jbGlwJHtpblNlbGVjdGVkU2VjdGlvbiAmJiBzZWxlY3Rpb24udHlwZSA9PT0gJ3NlY3Rpb24nID8gJyBpcy1zZWxlY3RlZCcgOiAnJ31gfSBvbkNsaWNrPXsoKSA9PiBzZWxlY3RBdCh7IHR5cGU6ICdzZWN0aW9uJyB9KX0+XG4gICAgICAgICAgICAgICAgICAgICAgICBWZXJ0aWNhbCDCtyB7c2VjdGlvbi50ZXh0LmJsb2Nrcy5sZW5ndGh9IGJsb2Nrc1xuICAgICAgICAgICAgICAgICAgICAgIDwvYnV0dG9uPlxuICAgICAgICAgICAgICAgICAgICApIDogbnVsbH1cbiAgICAgICAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgICAgICk7XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgY29uc3QgaXNTZWxlY3RlZCA9IGluU2VsZWN0ZWRTZWN0aW9uICYmIHNlbGVjdGlvbi50eXBlID09PSAnaW50ZXJhY3Rpb24nO1xuICAgICAgICAgICAgICBjb25zdCBhY3RpdmF0aW9uID0gc2VjdGlvbi5pbnRlcmFjdGlvbj8udHlwZSAhPT0gJ25vbmUnID8gc2VjdGlvbi5pbnRlcmFjdGlvbi5hY3RpdmF0aW9uU3RhcnQgOiBudWxsO1xuICAgICAgICAgICAgICByZXR1cm4gKFxuICAgICAgICAgICAgICAgIDxkaXYgY2xhc3NOYW1lPXtgYWJvdXQtZWRpdG9yLWNsaXAke2lzU2VsZWN0ZWQgPyAnIGlzLXNlbGVjdGVkJyA6ICcnfWB9IGtleT17c2VjdGlvbi5pZH0gc3R5bGU9e3sgd2lkdGggfX0+XG4gICAgICAgICAgICAgICAgICA8YnV0dG9uXG4gICAgICAgICAgICAgICAgICAgIHR5cGU9XCJidXR0b25cIlxuICAgICAgICAgICAgICAgICAgICBjbGFzc05hbWU9e2BhYm91dC1lZGl0b3ItaW50ZXJhY3Rpb24tY2xpcCAke3NlY3Rpb24uaW50ZXJhY3Rpb24/LnR5cGUgIT09ICdub25lJyA/ICdoYXMtaW50ZXJhY3Rpb24nIDogJyd9JHtpc1NlbGVjdGVkID8gJyBpcy1zZWxlY3RlZCcgOiAnJ31gfVxuICAgICAgICAgICAgICAgICAgICBhcmlhLXByZXNzZWQ9e2lzU2VsZWN0ZWR9XG4gICAgICAgICAgICAgICAgICAgIG9uQ2xpY2s9eygpID0+IHNlbGVjdEF0KHsgdHlwZTogJ2ludGVyYWN0aW9uJyB9LCBhY3RpdmF0aW9uIHx8IDApfVxuICAgICAgICAgICAgICAgICAgPntzZWN0aW9uLmludGVyYWN0aW9uPy50eXBlICE9PSAnbm9uZScgPyBzZWN0aW9uLmludGVyYWN0aW9uLnR5cGUgOiAnJ308L2J1dHRvbj5cbiAgICAgICAgICAgICAgICAgIHtOdW1iZXIuaXNGaW5pdGUoYWN0aXZhdGlvbikgPyAoXG4gICAgICAgICAgICAgICAgICAgIDxidXR0b25cbiAgICAgICAgICAgICAgICAgICAgICB0eXBlPVwiYnV0dG9uXCJcbiAgICAgICAgICAgICAgICAgICAgICBjbGFzc05hbWU9e2BhYm91dC1lZGl0b3ItdGltaW5nLWtleSBpcy1pbnRlcmFjdGlvbiR7aXNTZWxlY3RlZCAmJiBzZWxlY3Rpb24ua2V5UGFydCA9PT0gJ2FjdGl2YXRpb24nID8gJyBpcy1zZWxlY3RlZCcgOiAnJ31gfVxuICAgICAgICAgICAgICAgICAgICAgIHN0eWxlPXt7IGxlZnQ6IGxvY2FsUG9zaXRpb24oYWN0aXZhdGlvbikgfX1cbiAgICAgICAgICAgICAgICAgICAgICB0aXRsZT1cIkludGVyYWN0aW9uIGFjdGl2YXRpb25cIlxuICAgICAgICAgICAgICAgICAgICAgIGFyaWEtbGFiZWw9e2Ake3NlY3Rpb24ubGFiZWx9IGludGVyYWN0aW9uIGFjdGl2YXRpb24ga2V5ZnJhbWVgfVxuICAgICAgICAgICAgICAgICAgICAgIG9uQ2xpY2s9eygpID0+IHNlbGVjdEF0KHsgdHlwZTogJ2ludGVyYWN0aW9uJywga2V5UGFydDogJ2FjdGl2YXRpb24nIH0sIGFjdGl2YXRpb24pfVxuICAgICAgICAgICAgICAgICAgICAvPlxuICAgICAgICAgICAgICAgICAgKSA6IG51bGx9XG4gICAgICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgICAgICk7XG4gICAgICAgICAgICB9KX1cbiAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICApKX1cbiAgICAgICAgPC9kaXY+XG4gICAgICA8L2Rpdj5cbiAgICA8L2Rpdj5cbiAgKTtcbn1cblxuZnVuY3Rpb24gU2VxdWVuY2VJbnNwZWN0b3IoeyBzdG9yZSwgc25hcHNob3QgfSkge1xuICBjb25zdCBjb21taXRHbG9iYWwgPSAoZ3JvdXAsIGtleSwgdmFsdWUpID0+IHN0b3JlLmNvbW1pdChgQ2hhbmdlICR7a2V5fWAsIChkcmFmdCkgPT4ge1xuICAgIGlmIChncm91cCA9PT0gJ3NlcXVlbmNlJykgZHJhZnQuZ2xvYmFsc1trZXldID0gdmFsdWU7XG4gICAgZWxzZSB7XG4gICAgICBjb25zdCB0YXJnZXRLZXkgPSBncm91cCA9PT0gJ21hdGVyaWFsJyA/ICdwb2ludE1hdGVyaWFsJyA6IGdyb3VwO1xuICAgICAgZHJhZnQuZ2xvYmFsc1t0YXJnZXRLZXldW2tleV0gPSB2YWx1ZTtcbiAgICB9XG4gIH0sIHsgY29hbGVzY2VLZXk6IGBnbG9iYWw6JHtncm91cH06JHtrZXl9YCB9KTtcbiAgY29uc3QgcmVxdWVzdGVkR3JvdXBJZHMgPSBzbmFwc2hvdC5zZWxlY3Rpb24udHlwZSA9PT0gJ3NlcXVlbmNlJ1xuICAgID8gc25hcHNob3Quc2VsZWN0aW9uLmdyb3VwSWRzIHx8IFtdXG4gICAgOiBbXTtcbiAgY29uc3QgZ3JvdXBzID0gcmVxdWVzdGVkR3JvdXBJZHMubGVuZ3RoXG4gICAgPyBBQk9VVF9OQVJSQVRJVkVfR0xPQkFMX0NPTlRST0xTLmZpbHRlcigoZ3JvdXApID0+IHJlcXVlc3RlZEdyb3VwSWRzLmluY2x1ZGVzKGdyb3VwLmlkKSlcbiAgICA6IEFCT1VUX05BUlJBVElWRV9HTE9CQUxfQ09OVFJPTFM7XG4gIGNvbnN0IGhlYWRpbmcgPSBzbmFwc2hvdC5zZWxlY3Rpb24udHJhY2tMYWJlbFxuICAgID8gYCR7c25hcHNob3Quc2VsZWN0aW9uLnRyYWNrTGFiZWx9IHRyYWNrYFxuICAgIDogJ1NlcXVlbmNlJztcbiAgcmV0dXJuIChcbiAgICA8PlxuICAgICAgPGhlYWRlcj48c3Bhbj57aGVhZGluZ308L3NwYW4+PHN0cm9uZz5HbG9iYWwgY29udHJvbHM8L3N0cm9uZz48L2hlYWRlcj5cbiAgICAgIHtncm91cHMubWFwKChncm91cCkgPT4gKFxuICAgICAgICA8ZGV0YWlscyBvcGVuIGtleT17Z3JvdXAuaWR9IGRhdGEtZ2xvYmFsLWdyb3VwPXtncm91cC5pZH0+XG4gICAgICAgICAgPHN1bW1hcnk+e2dyb3VwLmxhYmVsfTwvc3VtbWFyeT5cbiAgICAgICAgICB7Z3JvdXAuaWQgPT09ICd0ZXh0TW90aW9uJyA/IDxwIGNsYXNzTmFtZT1cImFib3V0LWVkaXRvci1oZWxwXCI+RXZlcnkgdGl0bGUgZm9sbG93cyBvbmUgY29udGludW91cyBZIGFuZCBaIHBhdGguIE5lZ2F0aXZlIFkgaXMgaGlnaGVyOyBwb3NpdGl2ZSBZIGlzIGxvd2VyLiBUcmF2ZWwgZHVyYXRpb24gY2hhbmdlcyB0aGUgd2lkdGggb2YgZXZlcnkgU3BhdGlhbCB0aXRsZSBibG9jayBpbiB0aGUgVGV4dCB0aW1lbGluZS48L3A+IDogbnVsbH1cbiAgICAgICAgICB7Z3JvdXAuaWQgPT09ICdzd2FybVR1cmJ1bGVuY2UnID8gPHAgY2xhc3NOYW1lPVwiYWJvdXQtZWRpdG9yLWhlbHBcIj5PbmUgYW1iaWVudCBtb3Rpb24gcHJvZmlsZSBkcml2ZXMgYm90aCB0aGUgY2x1c3RlciBhbmQgdHVyYnVsZW50IGZpZWxkLiBFYWNoIFdvcmxkIG9ubHkgc2NhbGVzIGl0cyBzdHJlbmd0aCwgc28gdGhlIG1vdGlvbiBzdGF5cyBjb250aW51b3VzIHdoaWxlIFNoYXBlcyBjaGFuZ2UuPC9wPiA6IG51bGx9XG4gICAgICAgICAge2dyb3VwLmNvbnRyb2xzLm1hcCgoY29udHJvbCkgPT4ge1xuICAgICAgICAgICAgY29uc3QgdGFyZ2V0ID0gZ3JvdXAuaWQgPT09ICdzZXF1ZW5jZSdcbiAgICAgICAgICAgICAgPyBzbmFwc2hvdC5kb2N1bWVudC5nbG9iYWxzXG4gICAgICAgICAgICAgIDogc25hcHNob3QuZG9jdW1lbnQuZ2xvYmFsc1tncm91cC5pZCA9PT0gJ21hdGVyaWFsJyA/ICdwb2ludE1hdGVyaWFsJyA6IGdyb3VwLmlkXTtcbiAgICAgICAgICAgIGlmIChncm91cC5pZCA9PT0gJ3RleHRNb3Rpb24nICYmIGNvbnRyb2wuaWQgPT09ICdyZWFkYWJsZUVuZCcpIHJldHVybiBudWxsO1xuICAgICAgICAgICAgaWYgKGdyb3VwLmlkID09PSAndGV4dE1vdGlvbicgJiYgY29udHJvbC5pZCA9PT0gJ3JlYWRhYmxlU3RhcnQnKSB7XG4gICAgICAgICAgICAgIHJldHVybiAoXG4gICAgICAgICAgICAgICAgPFJhbmdlUHJvcGVydHlcbiAgICAgICAgICAgICAgICAgIGtleT1cImNsZWFyV2luZG93XCJcbiAgICAgICAgICAgICAgICAgIGxhYmVsPVwiQ2xlYXIgd2luZG93XCJcbiAgICAgICAgICAgICAgICAgIHN0YXJ0PXt0YXJnZXQucmVhZGFibGVTdGFydH1cbiAgICAgICAgICAgICAgICAgIGVuZD17dGFyZ2V0LnJlYWRhYmxlRW5kfVxuICAgICAgICAgICAgICAgICAgbWluPXtjb250cm9sLm1pbn1cbiAgICAgICAgICAgICAgICAgIG1heD17Y29udHJvbC5tYXh9XG4gICAgICAgICAgICAgICAgICBzdGVwPXtjb250cm9sLnN0ZXB9XG4gICAgICAgICAgICAgICAgICBvblN0YXJ0Q2hhbmdlPXsodmFsdWUpID0+IGNvbW1pdEdsb2JhbChncm91cC5pZCwgJ3JlYWRhYmxlU3RhcnQnLCB2YWx1ZSl9XG4gICAgICAgICAgICAgICAgICBvbkVuZENoYW5nZT17KHZhbHVlKSA9PiBjb21taXRHbG9iYWwoZ3JvdXAuaWQsICdyZWFkYWJsZUVuZCcsIHZhbHVlKX1cbiAgICAgICAgICAgICAgICAgIGhpbnQ9XCJUaGUgdGl0bGUgaXMgZnVsbHkgY2xlYXIgaW5zaWRlIHRoaXMgcGFydCBvZiBpdHMgb3duIHRyYXZlbC4gT3V0c2lkZSBpdCwgYmx1ciBhbmQgb3BhY2l0eSBidWlsZCB0b3dhcmQgdGhlIGVuZHMuXCJcbiAgICAgICAgICAgICAgICAvPlxuICAgICAgICAgICAgICApO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcmV0dXJuIChcbiAgICAgICAgICAgICAgPE51bWJlclByb3BlcnR5XG4gICAgICAgICAgICAgICAga2V5PXtjb250cm9sLmlkfVxuICAgICAgICAgICAgICAgIGxhYmVsPXtjb250cm9sLmxhYmVsfVxuICAgICAgICAgICAgICAgIHZhbHVlPXt0YXJnZXRbY29udHJvbC5pZF19XG4gICAgICAgICAgICAgICAgbWluPXtjb250cm9sLm1pbn1cbiAgICAgICAgICAgICAgICBtYXg9e2NvbnRyb2wubWF4fVxuICAgICAgICAgICAgICAgIHN0ZXA9e2NvbnRyb2wuc3RlcH1cbiAgICAgICAgICAgICAgICB1bml0PXtjb250cm9sLnVuaXR9XG4gICAgICAgICAgICAgICAgb25DaGFuZ2U9eyh2YWx1ZSkgPT4gY29tbWl0R2xvYmFsKGdyb3VwLmlkLCBjb250cm9sLmlkLCB2YWx1ZSl9XG4gICAgICAgICAgICAgIC8+XG4gICAgICAgICAgICApO1xuICAgICAgICAgIH0pfVxuICAgICAgICAgIHtncm91cC5pZCA9PT0gJ3RleHRNb3Rpb24nID8gPHAgY2xhc3NOYW1lPVwiYWJvdXQtZWRpdG9yLWhlbHAgYWJvdXQtZWRpdG9yLWRlcHRoLWhlbHBcIj48c3Ryb25nPkRlcHRoIG1vdmVzOyBibHVyIHNvZnRlbnMuPC9zdHJvbmc+IEVudHJ5IGRlcHRoIHN0YXJ0cyBiZWhpbmQgdGhlIHNjcmVlbiBvbiDiiJJaIGFuZCBFeGl0IGRlcHRoIGZpbmlzaGVzIHRvd2FyZCB5b3Ugb24gK1ouIFBlcnNwZWN0aXZlIGNvbnRyb2xzIGhvdyBzdHJvbmdseSB0aGF0IFogdHJhdmVsIGNoYW5nZXMgYXBwYXJlbnQgc2l6ZTsgTWF4aW11bSBibHVyIG9ubHkgY2hhbmdlcyBzaGFycG5lc3MuPC9wPiA6IG51bGx9XG4gICAgICAgIDwvZGV0YWlscz5cbiAgICAgICkpfVxuICAgIDwvPlxuICApO1xufVxuXG5mdW5jdGlvbiBTZWN0aW9uSW5zcGVjdG9yKHsgc3RvcmUsIHNuYXBzaG90LCBzZWN0aW9uIH0pIHtcbiAgY29uc3Qgc2VjdGlvbkluZGV4ID0gZ2V0U2VjdGlvbkluZGV4KHNuYXBzaG90LmRvY3VtZW50LCBzZWN0aW9uLmlkKTtcbiAgY29uc3QgY29tcGlsZWRTZWN0aW9uID0gc25hcHNob3QuY29tcGlsZWRQbGFuPy5zZWN0aW9ucz8uW3NlY3Rpb25JbmRleF07XG4gIGNvbnN0IGFjdGl2ZUV4dGVudEZpZWxkID0gc25hcHNob3QucHJldmlld1Byb2ZpbGUgPT09ICdtb2JpbGUnID8gJ21vYmlsZUV4dGVudFdVJyA6ICdleHRlbnRXVSc7XG4gIGNvbnN0IGFjdGl2ZUV4dGVudCA9IE51bWJlcihzZWN0aW9uW2FjdGl2ZUV4dGVudEZpZWxkXSk7XG4gIGNvbnN0IHJlc29sdmVkRXh0ZW50ID0gTnVtYmVyKGNvbXBpbGVkU2VjdGlvbj8ucmVzb2x2ZWRFeHRlbnRXVSA/PyBhY3RpdmVFeHRlbnQpO1xuICBjb25zdCBjb250ZW50TWluaW11bUFjdGl2ZSA9IHJlc29sdmVkRXh0ZW50ID4gYWN0aXZlRXh0ZW50ICsgMC4wMDE7XG4gIGNvbnN0IGJhc2VsaW5lU2VjdGlvbiA9IHNuYXBzaG90LmJhc2VsaW5lRG9jdW1lbnQuc2VjdGlvbnMuZmluZCgoaXRlbSkgPT4gaXRlbS5pZCA9PT0gc2VjdGlvbi5pZCk7XG4gIGNvbnN0IHVwZGF0ZSA9IChsYWJlbCwgbXV0YXRlLCBjb2FsZXNjZUtleSA9IG51bGwpID0+IHN0b3JlLmNvbW1pdChsYWJlbCwgKGRyYWZ0KSA9PiB7XG4gICAgbXV0YXRlKGRyYWZ0LnNlY3Rpb25zW3NlY3Rpb25JbmRleF0pO1xuICB9LCB7IGNvYWxlc2NlS2V5LCBzZWxlY3Rpb246IHNuYXBzaG90LnNlbGVjdGlvbiB9KTtcbiAgY29uc3QgbW92ZSA9IChkaXJlY3Rpb24pID0+IHN0b3JlLmNvbW1pdCgnUmVvcmRlciBTZWN0aW9uJywgKGRyYWZ0KSA9PiB7XG4gICAgY29uc3QgdG9JbmRleCA9IHNlY3Rpb25JbmRleCArIGRpcmVjdGlvbjtcbiAgICBpZiAodG9JbmRleCA8IDAgfHwgdG9JbmRleCA+PSBkcmFmdC5zZWN0aW9ucy5sZW5ndGgpIHJldHVybjtcbiAgICBjb25zdCBbbW92ZWRdID0gZHJhZnQuc2VjdGlvbnMuc3BsaWNlKHNlY3Rpb25JbmRleCwgMSk7XG4gICAgZHJhZnQuc2VjdGlvbnMuc3BsaWNlKHRvSW5kZXgsIDAsIG1vdmVkKTtcbiAgICByZXBsYWNlRHJhZnREb2N1bWVudChkcmFmdCwgc3RpdGNoQWJvdXROYXJyYXRpdmVDYW1lcmFCb3VuZGFyaWVzKGRyYWZ0KSk7XG4gIH0sIHsgc2VsZWN0aW9uOiB7IHR5cGU6ICdzZWN0aW9uJywgc2VjdGlvbklkOiBzZWN0aW9uLmlkIH0gfSk7XG4gIGNvbnN0IGR1cGxpY2F0ZSA9ICgpID0+IHtcbiAgICBjb25zdCByZXN1bHQgPSBkdXBsaWNhdGVBYm91dE5hcnJhdGl2ZVNlY3Rpb24oeyBkb2N1bWVudDogc25hcHNob3QuZG9jdW1lbnQsIHNlY3Rpb25JZDogc2VjdGlvbi5pZCB9KTtcbiAgICBpZiAoIXJlc3VsdC52YWxpZCkge1xuICAgICAgc3RvcmUuc2V0U2F2ZVN0YXRlKHsgbWVzc2FnZTogcmVzdWx0LnJlYXNvbiB8fCAnVGhpcyBTZWN0aW9uIGNhbm5vdCBiZSBkdXBsaWNhdGVkLicgfSk7XG4gICAgICByZXR1cm47XG4gICAgfVxuICAgIHN0b3JlLmNvbW1pdCgnRHVwbGljYXRlIFNlY3Rpb24nLCAoZHJhZnQpID0+IHJlcGxhY2VEcmFmdERvY3VtZW50KGRyYWZ0LCByZXN1bHQuZG9jdW1lbnQpLCB7XG4gICAgICBzZWxlY3Rpb246IHJlc3VsdC5zZWxlY3Rpb24sXG4gICAgfSk7XG4gIH07XG5cbiAgcmV0dXJuIChcbiAgICA8PlxuICAgICAgPGhlYWRlcj48c3Bhbj5TZWN0aW9uIHtTdHJpbmcoc2VjdGlvbkluZGV4ICsgMSkucGFkU3RhcnQoMiwgJzAnKX08L3NwYW4+PHN0cm9uZz57c2VjdGlvbi5sYWJlbH08L3N0cm9uZz48L2hlYWRlcj5cbiAgICAgIHtzZWN0aW9uLmxvY2tlZCA/IDxkaXYgY2xhc3NOYW1lPVwiYWJvdXQtZWRpdG9yLWxvY2tcIj48TG9ja0tleWhvbGUgYXJpYS1oaWRkZW49XCJ0cnVlXCIgLz48c3Bhbj5UaGlzIHByb3RlY3RlZCBTZWN0aW9uIGNhbm5vdCBiZSByZW9yZGVyZWQgb3IgaGF2ZSBpdHMgV29ybGQgcmVwbGFjZWQgYWNjaWRlbnRhbGx5Ljwvc3Bhbj48YnV0dG9uIHR5cGU9XCJidXR0b25cIiBvbkNsaWNrPXsoKSA9PiB1cGRhdGUoJ1VubG9jayBwcm90ZWN0ZWQgU2VjdGlvbicsIChkcmFmdCkgPT4geyBkcmFmdC5sb2NrZWQgPSBmYWxzZTsgfSl9PlVubG9jayBhZHZhbmNlZDwvYnV0dG9uPjwvZGl2PiA6IG51bGx9XG4gICAgICA8ZGl2IGNsYXNzTmFtZT1cImFib3V0LWVkaXRvci1pbmxpbmUtYWN0aW9uc1wiPlxuICAgICAgICA8YnV0dG9uIHR5cGU9XCJidXR0b25cIiBkaXNhYmxlZD17c2VjdGlvbi5sb2NrZWQgfHwgc2VjdGlvbkluZGV4ID09PSAwfSBvbkNsaWNrPXsoKSA9PiBtb3ZlKC0xKX0+TW92ZSBlYXJsaWVyPC9idXR0b24+XG4gICAgICAgIDxidXR0b24gdHlwZT1cImJ1dHRvblwiIGRpc2FibGVkPXtzZWN0aW9uLmxvY2tlZCB8fCBzZWN0aW9uSW5kZXggPT09IHNuYXBzaG90LmRvY3VtZW50LnNlY3Rpb25zLmxlbmd0aCAtIDF9IG9uQ2xpY2s9eygpID0+IG1vdmUoMSl9Pk1vdmUgbGF0ZXI8L2J1dHRvbj5cbiAgICAgICAgPGJ1dHRvbiB0eXBlPVwiYnV0dG9uXCIgZGlzYWJsZWQ9e3NlY3Rpb24ubG9ja2VkIHx8IHNlY3Rpb24udHlwZSA9PT0gJ2ZpbmFsZSd9IG9uQ2xpY2s9e2R1cGxpY2F0ZX0+RHVwbGljYXRlPC9idXR0b24+XG4gICAgICA8L2Rpdj5cbiAgICAgIDxQcm9wZXJ0eSBsYWJlbD1cIlNlY3Rpb24gbmFtZVwiPjxpbnB1dCB2YWx1ZT17c2VjdGlvbi5sYWJlbH0gb25DaGFuZ2U9eyhldmVudCkgPT4gdXBkYXRlKCdSZW5hbWUgU2VjdGlvbicsIChkcmFmdCkgPT4geyBkcmFmdC5sYWJlbCA9IGV2ZW50LnRhcmdldC52YWx1ZTsgfSwgYHNlY3Rpb246JHtzZWN0aW9uLmlkfTpsYWJlbGApfSAvPjwvUHJvcGVydHk+XG4gICAgICA8UHJvcGVydHkgbGFiZWw9XCJTdGFibGUgSURcIj48aW5wdXQgdmFsdWU9e3NlY3Rpb24uaWR9IHJlYWRPbmx5IC8+PHNtYWxsPlJlZmVyZW5jZXMgdGhpcyBTZWN0aW9uIHdpdGhvdXQgdHlpbmcgaXQgdG8gaXRzIGN1cnJlbnQgbWVhbmluZy48L3NtYWxsPjwvUHJvcGVydHk+XG4gICAgICA8UHJvcGVydHkgbGFiZWw9XCJUeXBlXCI+XG4gICAgICAgIDxzZWxlY3QgdmFsdWU9e3NlY3Rpb24udHlwZX0gZGlzYWJsZWQ9e3NlY3Rpb24udHlwZSA9PT0gJ2ZpbmFsZSd9IG9uQ2hhbmdlPXsoZXZlbnQpID0+IHVwZGF0ZSgnQ2hhbmdlIFNlY3Rpb24gdHlwZScsIChkcmFmdCkgPT4geyBkcmFmdC50eXBlID0gZXZlbnQudGFyZ2V0LnZhbHVlOyB9KX0+XG4gICAgICAgICAgPG9wdGlvbiB2YWx1ZT1cInNwYXRpYWxcIj5TcGF0aWFsPC9vcHRpb24+PG9wdGlvbiB2YWx1ZT1cImVkaXRvcmlhbFwiPkVkaXRvcmlhbDwvb3B0aW9uPjxvcHRpb24gdmFsdWU9XCJmaW5hbGVcIj5GaW5hbGU8L29wdGlvbj5cbiAgICAgICAgPC9zZWxlY3Q+XG4gICAgICA8L1Byb3BlcnR5PlxuICAgICAgPGRldGFpbHMgb3Blbj5cbiAgICAgICAgPHN1bW1hcnk+U2VjdGlvbiB0aW1pbmc8L3N1bW1hcnk+XG4gICAgICAgIDxQcm9wZXJ0eSBsYWJlbD1cIlNjcm9sbCB0cmF2ZWxcIj48b3V0cHV0IGNsYXNzTmFtZT1cImFib3V0LWVkaXRvci1yZWFkb3V0XCI+e2Zvcm1hdFdVKE1hdGgubWF4KDAsIGFjdGl2ZUV4dGVudCAtIDEpKX08L291dHB1dD48L1Byb3BlcnR5PlxuICAgICAgICA8UHJvcGVydHkgbGFiZWw9XCJUb3RhbCBoZWlnaHRcIj48b3V0cHV0IGNsYXNzTmFtZT1cImFib3V0LWVkaXRvci1yZWFkb3V0XCI+e2Zvcm1hdFdVKGFjdGl2ZUV4dGVudCl9PC9vdXRwdXQ+PC9Qcm9wZXJ0eT5cbiAgICAgICAgPE51bWJlclByb3BlcnR5IGxhYmVsPVwiRGVza3RvcCBsZW5ndGhcIiB2YWx1ZT17c2VjdGlvbi5leHRlbnRXVX0gbWluPXsxfSBtYXg9ezh9IHN0ZXA9ezAuMDV9IHVuaXQ9XCJXVVwiIG9uQ2hhbmdlPXsodmFsdWUpID0+IHVwZGF0ZSgnQ2hhbmdlIGRlc2t0b3AgU2VjdGlvbiBsZW5ndGgnLCAoZHJhZnQpID0+IHsgZHJhZnQuZXh0ZW50V1UgPSB2YWx1ZTsgfSwgYHNlY3Rpb246JHtzZWN0aW9uLmlkfTpleHRlbnRgKX0gLz5cbiAgICAgICAgPE51bWJlclByb3BlcnR5IGxhYmVsPVwiTW9iaWxlIGxlbmd0aFwiIHZhbHVlPXtzZWN0aW9uLm1vYmlsZUV4dGVudFdVfSBtaW49ezF9IG1heD17OH0gc3RlcD17MC4wNX0gdW5pdD1cIldVXCIgb25DaGFuZ2U9eyh2YWx1ZSkgPT4gdXBkYXRlKCdDaGFuZ2UgbW9iaWxlIFNlY3Rpb24gbGVuZ3RoJywgKGRyYWZ0KSA9PiB7IGRyYWZ0Lm1vYmlsZUV4dGVudFdVID0gdmFsdWU7IH0sIGBzZWN0aW9uOiR7c2VjdGlvbi5pZH06bW9iaWxlYCl9IC8+XG4gICAgICAgIDxQcm9wZXJ0eSBsYWJlbD1cIlJlc29sdmVkIGhlaWdodFwiPjxvdXRwdXQgY2xhc3NOYW1lPVwiYWJvdXQtZWRpdG9yLXJlYWRvdXRcIj57Zm9ybWF0V1UocmVzb2x2ZWRFeHRlbnQpfTwvb3V0cHV0PjwvUHJvcGVydHk+XG4gICAgICAgIHtjb250ZW50TWluaW11bUFjdGl2ZSA/IDxwIGNsYXNzTmFtZT1cImFib3V0LWVkaXRvci10aW1pbmctd2FybmluZ1wiPkNvbnRlbnQgbWluaW11bSBpbiBlZmZlY3QuIFRoZSByZW5kZXJlZCBjb3B5IG5lZWRzIHtmb3JtYXRXVShyZXNvbHZlZEV4dGVudCl9IGluIHRoaXMgcHJvZmlsZS48L3A+IDogbnVsbH1cbiAgICAgICAgPGJ1dHRvblxuICAgICAgICAgIHR5cGU9XCJidXR0b25cIlxuICAgICAgICAgIGNsYXNzTmFtZT1cImFib3V0LWVkaXRvci13aWRlLWFjdGlvblwiXG4gICAgICAgICAgZGlzYWJsZWQ9eyFiYXNlbGluZVNlY3Rpb24gfHwgYmFzZWxpbmVTZWN0aW9uW2FjdGl2ZUV4dGVudEZpZWxkXSA9PT0gc2VjdGlvblthY3RpdmVFeHRlbnRGaWVsZF19XG4gICAgICAgICAgb25DbGljaz17KCkgPT4gdXBkYXRlKCdSZXN0b3JlIHNhdmVkIFNlY3Rpb24gbGVuZ3RoJywgKGRyYWZ0KSA9PiB7IGRyYWZ0W2FjdGl2ZUV4dGVudEZpZWxkXSA9IGJhc2VsaW5lU2VjdGlvblthY3RpdmVFeHRlbnRGaWVsZF07IH0pfVxuICAgICAgICA+UmVzZXQge3NuYXBzaG90LnByZXZpZXdQcm9maWxlID09PSAnbW9iaWxlJyA/ICdtb2JpbGUnIDogJ2Rlc2t0b3AnfSBsZW5ndGg8L2J1dHRvbj5cbiAgICAgIDwvZGV0YWlscz5cbiAgICAgIHtzZWN0aW9uLnR5cGUgPT09ICdlZGl0b3JpYWwnID8gPEVkaXRvcmlhbEJsb2NrcyBzdG9yZT17c3RvcmV9IHNuYXBzaG90PXtzbmFwc2hvdH0gc2VjdGlvbj17c2VjdGlvbn0gLz4gOiBudWxsfVxuICAgICAge3NlY3Rpb24udHlwZSAhPT0gJ2VkaXRvcmlhbCcgPyAoXG4gICAgICAgIDxidXR0b25cbiAgICAgICAgICB0eXBlPVwiYnV0dG9uXCJcbiAgICAgICAgICBjbGFzc05hbWU9XCJhYm91dC1lZGl0b3Itd2lkZS1hY3Rpb25cIlxuICAgICAgICAgIG9uQ2xpY2s9eygpID0+IHtcbiAgICAgICAgICAgIGNvbnN0IGxvY2FsID0gZ2V0TG9jYWxQcm9ncmVzcyhzbmFwc2hvdC5jb21waWxlZFBsYW4sIHNlY3Rpb24sIHNuYXBzaG90LnRyYW5zcG9ydC5zdG9yeVdVKTtcbiAgICAgICAgICAgIGNvbnN0IGlkID0gbmV4dElkKHNuYXBzaG90LmRvY3VtZW50LCBgJHtzZWN0aW9uLmlkfS1zdGF0ZW1lbnRgKTtcbiAgICAgICAgICAgIGNvbnN0IGZvY3VzID0gTWF0aC5taW4oMC45MiwgTWF0aC5tYXgoMC4wOCwgc25hcEFib3V0TmFycmF0aXZlVGltZWxpbmVWYWx1ZShsb2NhbCkpKTtcbiAgICAgICAgICAgIHVwZGF0ZSgnQWRkIHRleHQgQ3VlJywgKGRyYWZ0KSA9PiB7XG4gICAgICAgICAgICAgIGRyYWZ0LnRleHQuY3VlcyB8fD0gW107XG4gICAgICAgICAgICAgIGRyYWZ0LnRleHQuY3Vlcy5wdXNoKHsgaWQsIHRleHQ6ICdOZXcgdHJhdmVsbGluZyBzdGF0ZW1lbnQnLCBlbnRlcjogZm9jdXMgLSAwLjA4LCBob2xkOiBmb2N1cywgZXhpdDogZm9jdXMgKyAwLjA4LCBwcmVzZXQ6ICd0cmF2ZWxsaW5nLXRpdGxlLXYxJywgbW90aW9uOiB7IG1vZGU6ICdzcGF0aWFsJyB9IH0pO1xuICAgICAgICAgICAgICBkcmFmdC50ZXh0LmN1ZXMuc29ydCgoYSwgYikgPT4gYS5ob2xkIC0gYi5ob2xkKTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgc3RvcmUuc2V0U2VsZWN0aW9uKHsgdHlwZTogJ2N1ZScsIHNlY3Rpb25JZDogc2VjdGlvbi5pZCwgY3VlSWQ6IGlkLCBrZXlQYXJ0OiAnZm9jdXMnIH0pO1xuICAgICAgICAgIH19XG4gICAgICAgID5BZGQgdGV4dCBjdWUgYXQgcGxheWhlYWQ8L2J1dHRvbj5cbiAgICAgICkgOiBudWxsfVxuICAgIDwvPlxuICApO1xufVxuXG5mdW5jdGlvbiBFZGl0b3JpYWxCbG9ja3MoeyBzdG9yZSwgc25hcHNob3QsIHNlY3Rpb24gfSkge1xuICBjb25zdCBzZWN0aW9uSW5kZXggPSBnZXRTZWN0aW9uSW5kZXgoc25hcHNob3QuZG9jdW1lbnQsIHNlY3Rpb24uaWQpO1xuICBjb25zdCB1cGRhdGVCbG9jayA9IChibG9ja0luZGV4LCBmaWVsZCwgdmFsdWUpID0+IHN0b3JlLmNvbW1pdCgnRWRpdCBlZGl0b3JpYWwgY29weScsIChkcmFmdCkgPT4ge1xuICAgIGRyYWZ0LnNlY3Rpb25zW3NlY3Rpb25JbmRleF0udGV4dC5ibG9ja3NbYmxvY2tJbmRleF1bZmllbGRdID0gdmFsdWU7XG4gIH0sIHsgY29hbGVzY2VLZXk6IGBibG9jazoke3NlY3Rpb24uaWR9OiR7YmxvY2tJbmRleH06JHtmaWVsZH1gLCBzZWxlY3Rpb246IHNuYXBzaG90LnNlbGVjdGlvbiB9KTtcbiAgY29uc3QgdXBkYXRlRW1waGFzaXMgPSAoYmxvY2tJbmRleCwgZW1waGFzaXNJbmRleCwgZmllbGQsIHZhbHVlKSA9PiBzdG9yZS5jb21taXQoJ0VkaXQgZWRpdG9yaWFsIGhpZ2hsaWdodCcsIChkcmFmdCkgPT4ge1xuICAgIGRyYWZ0LnNlY3Rpb25zW3NlY3Rpb25JbmRleF0udGV4dC5ibG9ja3NbYmxvY2tJbmRleF0uZW1waGFzaXNbZW1waGFzaXNJbmRleF1bZmllbGRdID0gdmFsdWU7XG4gIH0sIHsgY29hbGVzY2VLZXk6IGBibG9jazoke3NlY3Rpb24uaWR9OiR7YmxvY2tJbmRleH06ZW1waGFzaXM6JHtlbXBoYXNpc0luZGV4fToke2ZpZWxkfWAsIHNlbGVjdGlvbjogc25hcHNob3Quc2VsZWN0aW9uIH0pO1xuICBjb25zdCBhZGRFbXBoYXNpcyA9IChibG9ja0luZGV4KSA9PiBzdG9yZS5jb21taXQoJ0FkZCBlZGl0b3JpYWwgaGlnaGxpZ2h0JywgKGRyYWZ0KSA9PiB7XG4gICAgY29uc3QgYmxvY2sgPSBkcmFmdC5zZWN0aW9uc1tzZWN0aW9uSW5kZXhdLnRleHQuYmxvY2tzW2Jsb2NrSW5kZXhdO1xuICAgIGJsb2NrLmVtcGhhc2lzIHx8PSBbXTtcbiAgICBibG9jay5lbXBoYXNpcy5wdXNoKHsgdGV4dDogYmxvY2sudGV4dC50cmltKCkuc3BsaXQoL1xccysvKS5zbGljZSgwLCAyKS5qb2luKCcgJyksIHRvbmU6ICdibHVlJyB9KTtcbiAgfSwgeyBzZWxlY3Rpb246IHNuYXBzaG90LnNlbGVjdGlvbiB9KTtcbiAgY29uc3QgcmVtb3ZlRW1waGFzaXMgPSAoYmxvY2tJbmRleCwgZW1waGFzaXNJbmRleCkgPT4gc3RvcmUuY29tbWl0KCdSZW1vdmUgZWRpdG9yaWFsIGhpZ2hsaWdodCcsIChkcmFmdCkgPT4ge1xuICAgIGRyYWZ0LnNlY3Rpb25zW3NlY3Rpb25JbmRleF0udGV4dC5ibG9ja3NbYmxvY2tJbmRleF0uZW1waGFzaXMuc3BsaWNlKGVtcGhhc2lzSW5kZXgsIDEpO1xuICB9LCB7IHNlbGVjdGlvbjogc25hcHNob3Quc2VsZWN0aW9uIH0pO1xuICByZXR1cm4gKFxuICAgIDxkZXRhaWxzIG9wZW4+XG4gICAgICA8c3VtbWFyeT5FZGl0b3JpYWwgY29udGVudDwvc3VtbWFyeT5cbiAgICAgIHsoc2VjdGlvbi50ZXh0LmJsb2NrcyB8fCBbXSkubWFwKChibG9jaywgYmxvY2tJbmRleCkgPT4gKFxuICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cImFib3V0LWVkaXRvci1ibG9ja1wiIGtleT17YmxvY2suaWR9PlxuICAgICAgICAgIDxkaXY+PGNvZGU+e2Jsb2NrLmtpbmR9PC9jb2RlPjxzcGFuPntibG9jay5pZH08L3NwYW4+PC9kaXY+XG4gICAgICAgICAge2Jsb2NrLmxhYmVsICE9IG51bGwgPyA8UHJvcGVydHkgbGFiZWw9XCJMYWJlbFwiPjxpbnB1dCB2YWx1ZT17YmxvY2subGFiZWx9IG9uQ2hhbmdlPXsoZXZlbnQpID0+IHVwZGF0ZUJsb2NrKGJsb2NrSW5kZXgsICdsYWJlbCcsIGV2ZW50LnRhcmdldC52YWx1ZSl9IC8+PC9Qcm9wZXJ0eT4gOiBudWxsfVxuICAgICAgICAgIHtibG9jay50ZXh0ICE9IG51bGwgPyA8UHJvcGVydHkgbGFiZWw9XCJDb3B5XCI+PHRleHRhcmVhIHJvd3M9XCI1XCIgdmFsdWU9e2Jsb2NrLnRleHR9IG9uQ2hhbmdlPXsoZXZlbnQpID0+IHVwZGF0ZUJsb2NrKGJsb2NrSW5kZXgsICd0ZXh0JywgZXZlbnQudGFyZ2V0LnZhbHVlKX0gLz48L1Byb3BlcnR5PiA6IG51bGx9XG4gICAgICAgICAge2Jsb2NrLmtpbmQgPT09ICdwcm9zZScgPyA8UHJvcGVydHkgbGFiZWw9XCJSZWNvbm5lY3QgcG9pbnQgZ3JpZFwiPjxpbnB1dCB0eXBlPVwiY2hlY2tib3hcIiBjaGVja2VkPXtibG9jay53b3JsZEluZmx1ZW5jZSA9PT0gdHJ1ZX0gb25DaGFuZ2U9eyhldmVudCkgPT4gdXBkYXRlQmxvY2soYmxvY2tJbmRleCwgJ3dvcmxkSW5mbHVlbmNlJywgZXZlbnQudGFyZ2V0LmNoZWNrZWQpfSAvPjwvUHJvcGVydHk+IDogbnVsbH1cbiAgICAgICAgICB7YmxvY2sudGV4dCAhPSBudWxsID8gKFxuICAgICAgICAgICAgPGRpdiBjbGFzc05hbWU9XCJhYm91dC1lZGl0b3ItZW1waGFzaXMtY29udHJvbHNcIj5cbiAgICAgICAgICAgICAgPHNwYW4+SGlnaGxpZ2h0ZWQgd29yZHM8L3NwYW4+XG4gICAgICAgICAgICAgIHsoYmxvY2suZW1waGFzaXMgfHwgW10pLm1hcCgoaXRlbSwgZW1waGFzaXNJbmRleCkgPT4gKFxuICAgICAgICAgICAgICAgIDxkaXYgY2xhc3NOYW1lPVwiYWJvdXQtZWRpdG9yLWVtcGhhc2lzLXJvd1wiIGtleT17YCR7YmxvY2suaWR9LWVtcGhhc2lzLSR7ZW1waGFzaXNJbmRleH1gfT5cbiAgICAgICAgICAgICAgICAgIDxpbnB1dCBhcmlhLWxhYmVsPVwiSGlnaGxpZ2h0ZWQgcGhyYXNlXCIgdmFsdWU9e2l0ZW0udGV4dH0gb25DaGFuZ2U9eyhldmVudCkgPT4gdXBkYXRlRW1waGFzaXMoYmxvY2tJbmRleCwgZW1waGFzaXNJbmRleCwgJ3RleHQnLCBldmVudC50YXJnZXQudmFsdWUpfSAvPlxuICAgICAgICAgICAgICAgICAgPHNlbGVjdCBhcmlhLWxhYmVsPVwiSGlnaGxpZ2h0IGNvbG91clwiIHZhbHVlPXtpdGVtLnRvbmV9IG9uQ2hhbmdlPXsoZXZlbnQpID0+IHVwZGF0ZUVtcGhhc2lzKGJsb2NrSW5kZXgsIGVtcGhhc2lzSW5kZXgsICd0b25lJywgZXZlbnQudGFyZ2V0LnZhbHVlKX0+XG4gICAgICAgICAgICAgICAgICAgIHtBQk9VVF9OQVJSQVRJVkVfRU1QSEFTSVNfVE9ORVMubWFwKCh0b25lKSA9PiA8b3B0aW9uIHZhbHVlPXt0b25lfSBrZXk9e3RvbmV9Pnt0b25lfTwvb3B0aW9uPil9XG4gICAgICAgICAgICAgICAgICA8L3NlbGVjdD5cbiAgICAgICAgICAgICAgICAgIDxidXR0b24gdHlwZT1cImJ1dHRvblwiIGFyaWEtbGFiZWw9e2BSZW1vdmUgJHtpdGVtLnRleHQgfHwgJ2VtcHR5J30gaGlnaGxpZ2h0YH0gb25DbGljaz17KCkgPT4gcmVtb3ZlRW1waGFzaXMoYmxvY2tJbmRleCwgZW1waGFzaXNJbmRleCl9PsOXPC9idXR0b24+XG4gICAgICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgICAgICkpfVxuICAgICAgICAgICAgICA8YnV0dG9uIHR5cGU9XCJidXR0b25cIiBvbkNsaWNrPXsoKSA9PiBhZGRFbXBoYXNpcyhibG9ja0luZGV4KX0+QWRkIGhpZ2hsaWdodDwvYnV0dG9uPlxuICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgKSA6IG51bGx9XG4gICAgICAgICAge2Jsb2NrLml0ZW1zID8gPFByb3BlcnR5IGxhYmVsPVwiSXRlbXNcIj48dGV4dGFyZWEgcm93cz1cIjZcIiB2YWx1ZT17YmxvY2suaXRlbXMuam9pbignXFxuJyl9IG9uQ2hhbmdlPXsoZXZlbnQpID0+IHVwZGF0ZUJsb2NrKGJsb2NrSW5kZXgsICdpdGVtcycsIGV2ZW50LnRhcmdldC52YWx1ZS5zcGxpdCgnXFxuJykuZmlsdGVyKEJvb2xlYW4pKX0gLz48L1Byb3BlcnR5PiA6IG51bGx9XG4gICAgICAgIDwvZGl2PlxuICAgICAgKSl9XG4gICAgICA8YnV0dG9uIHR5cGU9XCJidXR0b25cIiBjbGFzc05hbWU9XCJhYm91dC1lZGl0b3Itd2lkZS1hY3Rpb25cIiBvbkNsaWNrPXsoKSA9PiBzdG9yZS5jb21taXQoJ0FkZCBlZGl0b3JpYWwgYmxvY2snLCAoZHJhZnQpID0+IHtcbiAgICAgICAgZHJhZnQuc2VjdGlvbnNbc2VjdGlvbkluZGV4XS50ZXh0LmJsb2Nrcy5wdXNoKHsgaWQ6IG5leHRJZChkcmFmdCwgYCR7c2VjdGlvbi5pZH0tcHJvc2VgKSwga2luZDogJ3Byb3NlJywgdGV4dDogJ05ldyBlZGl0b3JpYWwgcGFyYWdyYXBoLicgfSk7XG4gICAgICB9KX0+QWRkIHByb3NlIGJsb2NrPC9idXR0b24+XG4gICAgPC9kZXRhaWxzPlxuICApO1xufVxuXG5mdW5jdGlvbiBDdWVSaHl0aG1BbmRSZXVzZSh7IHN0b3JlLCBzbmFwc2hvdCwgY2xpcGJvYXJkLCBzZXRDbGlwYm9hcmQgfSkge1xuICBjb25zdCBtZW1iZXJzID0gZ2V0QWJvdXROYXJyYXRpdmVTZWxlY3Rpb25NZW1iZXJzKHNuYXBzaG90LnNlbGVjdGlvbik7XG4gIGNvbnN0IFtnYXBXVSwgc2V0R2FwV1VdID0gdXNlU3RhdGUoMC4zNSk7XG4gIGNvbnN0IFthbmNob3IsIHNldEFuY2hvcl0gPSB1c2VTdGF0ZSgncHJpbWFyeScpO1xuICBjb25zdCBbcHJldmlldywgc2V0UHJldmlld10gPSB1c2VTdGF0ZShudWxsKTtcbiAgY29uc3QgW21lc3NhZ2UsIHNldE1lc3NhZ2VdID0gdXNlU3RhdGUoJycpO1xuXG4gIGNvbnN0IHByZXZpZXdNb3ZlcyA9IChsYWJlbCwgcmVzdWx0KSA9PiB7XG4gICAgaWYgKCFyZXN1bHQudmFsaWQpIHtcbiAgICAgIGlmIChzbmFwc2hvdC50cnlTdGF0ZSkgc3RvcmUuY2FuY2VsVHJ5KCk7XG4gICAgICBzZXRQcmV2aWV3KHJlc3VsdCk7XG4gICAgICBzZXRNZXNzYWdlKHJlc3VsdC5yZWFzb24gfHwgJ1RoaXMgYXJyYW5nZW1lbnQgZG9lcyBub3QgZml0IHRoZSBzZWxlY3RlZCBTZWN0aW9ucy4nKTtcbiAgICAgIHJldHVybjtcbiAgICB9XG4gICAgaWYgKHNuYXBzaG90LnRyeVN0YXRlKSBzdG9yZS5jYW5jZWxUcnkoKTtcbiAgICBzdG9yZS5iZWdpblRyeShsYWJlbCwgKGRyYWZ0KSA9PiBhcHBseUN1ZU1vdmVzKGRyYWZ0LCByZXN1bHQubW92ZXMpKTtcbiAgICBzZXRQcmV2aWV3KHsgLi4ucmVzdWx0LCBsYWJlbCB9KTtcbiAgICBzZXRNZXNzYWdlKCcnKTtcbiAgfTtcbiAgY29uc3QgY2FuY2VsUHJldmlldyA9ICgpID0+IHtcbiAgICBpZiAoc25hcHNob3QudHJ5U3RhdGUpIHN0b3JlLmNhbmNlbFRyeSgpO1xuICAgIHNldFByZXZpZXcobnVsbCk7XG4gICAgc2V0TWVzc2FnZSgnJyk7XG4gIH07XG4gIGNvbnN0IGFwcGx5UHJldmlldyA9ICgpID0+IHtcbiAgICBpZiAoIXByZXZpZXc/LnZhbGlkIHx8ICFzbmFwc2hvdC50cnlTdGF0ZSkgcmV0dXJuO1xuICAgIHN0b3JlLmFwcGx5VHJ5KCk7XG4gICAgc2V0UHJldmlldyhudWxsKTtcbiAgICBzZXRNZXNzYWdlKCcnKTtcbiAgfTtcbiAgY29uc3QgY29tbWl0Q2FuZGlkYXRlID0gKGxhYmVsLCByZXN1bHQpID0+IHtcbiAgICBpZiAoIXJlc3VsdD8udmFsaWQgfHwgIXJlc3VsdC5kb2N1bWVudCkge1xuICAgICAgc2V0TWVzc2FnZShyZXN1bHQ/LnJlYXNvbiB8fCAnVGhpcyBvcGVyYXRpb24gY291bGQgbm90IGJlIGNvbXBsZXRlZCBzYWZlbHkuJyk7XG4gICAgICByZXR1cm47XG4gICAgfVxuICAgIHN0b3JlLmNvbW1pdChsYWJlbCwgKGRyYWZ0KSA9PiByZXBsYWNlRHJhZnREb2N1bWVudChkcmFmdCwgcmVzdWx0LmRvY3VtZW50KSwge1xuICAgICAgc2VsZWN0aW9uOiByZXN1bHQuc2VsZWN0aW9uIHx8IHNuYXBzaG90LnNlbGVjdGlvbixcbiAgICB9KTtcbiAgICBzZXRNZXNzYWdlKCcnKTtcbiAgfTtcblxuICBjb25zdCBkaXN0cmlidXRlID0gKCkgPT4gcHJldmlld01vdmVzKCdEaXN0cmlidXRlIHRpdGxlIHJoeXRobScsIHJlc29sdmVBYm91dE5hcnJhdGl2ZUN1ZURpc3RyaWJ1dGlvbih7XG4gICAgZG9jdW1lbnQ6IHNuYXBzaG90LmRvY3VtZW50LFxuICAgIHBsYW46IHNuYXBzaG90LmNvbXBpbGVkUGxhbixcbiAgICBtZW1iZXJzLFxuICAgIHByaW1hcnk6IHNuYXBzaG90LnNlbGVjdGlvbixcbiAgfSkpO1xuICBjb25zdCBleGFjdEdhcCA9ICgpID0+IHByZXZpZXdNb3ZlcygnU2V0IGV4YWN0IHRpdGxlIGdhcCcsIHJlc29sdmVBYm91dE5hcnJhdGl2ZUN1ZUV4YWN0R2FwKHtcbiAgICBkb2N1bWVudDogc25hcHNob3QuZG9jdW1lbnQsXG4gICAgcGxhbjogc25hcHNob3QuY29tcGlsZWRQbGFuLFxuICAgIG1lbWJlcnMsXG4gICAgcHJpbWFyeTogc25hcHNob3Quc2VsZWN0aW9uLFxuICAgIGdhcFdVLFxuICAgIGFuY2hvcixcbiAgfSkpO1xuICBjb25zdCBhbGlnblByaW1hcnkgPSAoKSA9PiBwcmV2aWV3TW92ZXMoJ0FsaWduIHRpdGxlcyB0byBwbGF5aGVhZCcsIHJlc29sdmVBYm91dE5hcnJhdGl2ZUN1ZUdyb3VwQWxpZ24oe1xuICAgIGRvY3VtZW50OiBzbmFwc2hvdC5kb2N1bWVudCxcbiAgICBwbGFuOiBzbmFwc2hvdC5jb21waWxlZFBsYW4sXG4gICAgbWVtYmVycyxcbiAgICBwcmltYXJ5OiBzbmFwc2hvdC5zZWxlY3Rpb24sXG4gICAgcGxheWhlYWRXVTogc25hcHNob3QudHJhbnNwb3J0LnN0b3J5V1UsXG4gIH0pKTtcbiAgY29uc3QgZHVwbGljYXRlID0gKCkgPT4gY29tbWl0Q2FuZGlkYXRlKCdEdXBsaWNhdGUgdGl0bGUgQ3VlcycsIGR1cGxpY2F0ZUFib3V0TmFycmF0aXZlQ3VlR3JvdXAoe1xuICAgIGRvY3VtZW50OiBzbmFwc2hvdC5kb2N1bWVudCxcbiAgICBtZW1iZXJzLFxuICAgIHByaW1hcnk6IHNuYXBzaG90LnNlbGVjdGlvbixcbiAgfSkpO1xuICBjb25zdCBjb3B5ID0gKCkgPT4ge1xuICAgIGNvbnN0IHJlc3VsdCA9IGNyZWF0ZUFib3V0TmFycmF0aXZlQ3VlQ2xpcGJvYXJkUGF5bG9hZCh7XG4gICAgICBkb2N1bWVudDogc25hcHNob3QuZG9jdW1lbnQsXG4gICAgICBwbGFuOiBzbmFwc2hvdC5jb21waWxlZFBsYW4sXG4gICAgICBtZW1iZXJzLFxuICAgICAgcHJpbWFyeTogc25hcHNob3Quc2VsZWN0aW9uLFxuICAgIH0pO1xuICAgIGNvbnN0IHBheWxvYWQgPSByZXN1bHQ/LnBheWxvYWQgfHwgcmVzdWx0O1xuICAgIGNvbnN0IHZhbGlkYXRpb24gPSB2YWxpZGF0ZUFib3V0TmFycmF0aXZlQ3VlQ2xpcGJvYXJkUGF5bG9hZChwYXlsb2FkKTtcbiAgICBpZiAocmVzdWx0Py52YWxpZCA9PT0gZmFsc2UgfHwgdmFsaWRhdGlvbj8udmFsaWQgPT09IGZhbHNlKSB7XG4gICAgICBzZXRNZXNzYWdlKHJlc3VsdD8ucmVhc29uIHx8IHZhbGlkYXRpb24/LnJlYXNvbiB8fCAnVGhlc2UgdGl0bGVzIGNhbm5vdCBiZSBjb3BpZWQuJyk7XG4gICAgICByZXR1cm47XG4gICAgfVxuICAgIHNldENsaXBib2FyZChwYXlsb2FkKTtcbiAgICBzZXRNZXNzYWdlKGAke21lbWJlcnMubGVuZ3RofSB0aXRsZSR7bWVtYmVycy5sZW5ndGggPT09IDEgPyAnJyA6ICdzJ30gY29waWVkIGZvciB0aGlzIGVkaXRvciBzZXNzaW9uLmApO1xuICB9O1xuICBjb25zdCBwYXN0ZSA9ICgpID0+IGNvbW1pdENhbmRpZGF0ZSgnUGFzdGUgdGl0bGUgQ3VlcycsIHJlc29sdmVBYm91dE5hcnJhdGl2ZUN1ZUdyb3VwUGFzdGUoe1xuICAgIGRvY3VtZW50OiBzbmFwc2hvdC5kb2N1bWVudCxcbiAgICBwbGFuOiBzbmFwc2hvdC5jb21waWxlZFBsYW4sXG4gICAgcGF5bG9hZDogY2xpcGJvYXJkLFxuICAgIGRlc3RpbmF0aW9uU2VjdGlvbklkOiBzbmFwc2hvdC5zZWxlY3Rpb24uc2VjdGlvbklkLFxuICAgIHBsYXloZWFkV1U6IHNuYXBzaG90LnRyYW5zcG9ydC5zdG9yeVdVLFxuICB9KSk7XG5cbiAgY29uc3QgZ2hvc3RNb3ZlcyA9IHByZXZpZXc/LnZhbGlkID8gcHJldmlldy5tb3ZlcyA6IFtdO1xuICBjb25zdCBtYXhXVSA9IE1hdGgubWF4KDAuMDAxLCBzbmFwc2hvdC5jb21waWxlZFBsYW4/Lm1heFN0b3J5V1UgfHwgMSk7XG4gIHJldHVybiAoXG4gICAgPGRldGFpbHMgY2xhc3NOYW1lPVwiYWJvdXQtZWRpdG9yLXJoeXRobVwiIG9wZW49e21lbWJlcnMubGVuZ3RoID4gMX0+XG4gICAgICA8c3VtbWFyeT5SaHl0aG0gYW5kIHJldXNlPC9zdW1tYXJ5PlxuICAgICAge21lbWJlcnMubGVuZ3RoID4gMSA/IChcbiAgICAgICAgPD5cbiAgICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cImFib3V0LWVkaXRvci1yaHl0aG0tYWN0aW9uc1wiPlxuICAgICAgICAgICAgPGJ1dHRvbiB0eXBlPVwiYnV0dG9uXCIgb25DbGljaz17ZGlzdHJpYnV0ZX0+RGlzdHJpYnV0ZSBldmVubHk8L2J1dHRvbj5cbiAgICAgICAgICAgIDxidXR0b24gdHlwZT1cImJ1dHRvblwiIG9uQ2xpY2s9e2FsaWduUHJpbWFyeX0+QWxpZ24gcHJpbWFyeSB0byBwbGF5aGVhZDwvYnV0dG9uPlxuICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgIDxkaXYgY2xhc3NOYW1lPVwiYWJvdXQtZWRpdG9yLXJoeXRobS1nYXBcIj5cbiAgICAgICAgICAgIDxQcm9wZXJ0eSBsYWJlbD1cIkV4YWN0IGdhcFwiPjxpbnB1dCB0eXBlPVwibnVtYmVyXCIgbWluPVwiMFwiIG1heD1cIjhcIiBzdGVwPVwiMC4wNVwiIHZhbHVlPXtnYXBXVX0gb25DaGFuZ2U9eyhldmVudCkgPT4gc2V0R2FwV1UoTWF0aC5tYXgoMCwgTnVtYmVyKGV2ZW50LnRhcmdldC52YWx1ZSkgfHwgMCkpfSAvPjwvUHJvcGVydHk+XG4gICAgICAgICAgICA8UHJvcGVydHkgbGFiZWw9XCJBbmNob3JcIj48c2VsZWN0IHZhbHVlPXthbmNob3J9IG9uQ2hhbmdlPXsoZXZlbnQpID0+IHNldEFuY2hvcihldmVudC50YXJnZXQudmFsdWUpfT48b3B0aW9uIHZhbHVlPVwicHJpbWFyeVwiPlByaW1hcnk8L29wdGlvbj48b3B0aW9uIHZhbHVlPVwiZmlyc3RcIj5GaXJzdDwvb3B0aW9uPjxvcHRpb24gdmFsdWU9XCJsYXN0XCI+TGFzdDwvb3B0aW9uPjwvc2VsZWN0PjwvUHJvcGVydHk+XG4gICAgICAgICAgICA8YnV0dG9uIHR5cGU9XCJidXR0b25cIiBvbkNsaWNrPXtleGFjdEdhcH0+UHJldmlldyBleGFjdCBnYXA8L2J1dHRvbj5cbiAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgPC8+XG4gICAgICApIDogbnVsbH1cbiAgICAgIHtnaG9zdE1vdmVzLmxlbmd0aCA/IChcbiAgICAgICAgPGRpdiBjbGFzc05hbWU9XCJhYm91dC1lZGl0b3Itcmh5dGhtLXByZXZpZXdcIiBhcmlhLWxhYmVsPVwiUHJvcG9zZWQgdGl0bGUgcmh5dGhtXCI+XG4gICAgICAgICAge2dob3N0TW92ZXMubWFwKChtb3ZlKSA9PiB7XG4gICAgICAgICAgICBjb25zdCBjb21waWxlZCA9IHNuYXBzaG90LmNvbXBpbGVkUGxhbi5zZWN0aW9ucy5maW5kKChpdGVtKSA9PiBpdGVtLmlkID09PSBtb3ZlLnNlY3Rpb25JZCk7XG4gICAgICAgICAgICBjb25zdCBzdG9yeVdVID0gTnVtYmVyKGNvbXBpbGVkPy5zdGFydFdVIHx8IDApICsgKG1vdmUuaG9sZCAqIE51bWJlcihjb21waWxlZD8udHJhdmVsV1UgfHwgMCkpO1xuICAgICAgICAgICAgcmV0dXJuIDxpIGtleT17YCR7bW92ZS5zZWN0aW9uSWR9OiR7bW92ZS5jdWVJZH1gfSBzdHlsZT17eyBsZWZ0OiBgJHsoc3RvcnlXVSAvIG1heFdVKSAqIDEwMH0lYCB9fSB0aXRsZT17YCR7bW92ZS5jdWVJZH0gwrcgJHtmb3JtYXRXVShzdG9yeVdVKX1gfSAvPjtcbiAgICAgICAgICB9KX1cbiAgICAgICAgPC9kaXY+XG4gICAgICApIDogbnVsbH1cbiAgICAgIHttZXNzYWdlID8gPHAgY2xhc3NOYW1lPXtgYWJvdXQtZWRpdG9yLXJoeXRobS1tZXNzYWdlJHtwcmV2aWV3ICYmICFwcmV2aWV3LnZhbGlkID8gJyBpcy1lcnJvcicgOiAnJ31gfT57bWVzc2FnZX08L3A+IDogbnVsbH1cbiAgICAgIHtwcmV2aWV3Py52YWxpZCAmJiBzbmFwc2hvdC50cnlTdGF0ZSA/IDxkaXYgY2xhc3NOYW1lPVwiYWJvdXQtZWRpdG9yLXRyeVwiPjxzcGFuPlByZXZpZXdpbmcge3ByZXZpZXcubGFiZWx9PC9zcGFuPjxidXR0b24gdHlwZT1cImJ1dHRvblwiIG9uQ2xpY2s9e2NhbmNlbFByZXZpZXd9PkNhbmNlbDwvYnV0dG9uPjxidXR0b24gdHlwZT1cImJ1dHRvblwiIGNsYXNzTmFtZT1cImlzLXByaW1hcnlcIiBvbkNsaWNrPXthcHBseVByZXZpZXd9PkFwcGx5PC9idXR0b24+PC9kaXY+IDogbnVsbH1cbiAgICAgIDxkaXYgY2xhc3NOYW1lPVwiYWJvdXQtZWRpdG9yLXJoeXRobS1hY3Rpb25zXCI+XG4gICAgICAgIDxidXR0b24gdHlwZT1cImJ1dHRvblwiIG9uQ2xpY2s9e2R1cGxpY2F0ZX0+RHVwbGljYXRlIHttZW1iZXJzLmxlbmd0aCA+IDEgPyAnc2VsZWN0aW9uJyA6ICd0aXRsZSd9PC9idXR0b24+XG4gICAgICAgIDxidXR0b24gdHlwZT1cImJ1dHRvblwiIG9uQ2xpY2s9e2NvcHl9PkNvcHk8L2J1dHRvbj5cbiAgICAgICAgPGJ1dHRvbiB0eXBlPVwiYnV0dG9uXCIgZGlzYWJsZWQ9eyFjbGlwYm9hcmR9IG9uQ2xpY2s9e3Bhc3RlfT5QYXN0ZSBhdCBwbGF5aGVhZDwvYnV0dG9uPlxuICAgICAgPC9kaXY+XG4gICAgPC9kZXRhaWxzPlxuICApO1xufVxuXG5mdW5jdGlvbiBDdWVJbnNwZWN0b3IoeyBzdG9yZSwgc25hcHNob3QsIHNlY3Rpb24sIGNsaXBib2FyZCwgc2V0Q2xpcGJvYXJkIH0pIHtcbiAgY29uc3Qgc2VsZWN0ZWRNZW1iZXJzID0gZ2V0QWJvdXROYXJyYXRpdmVTZWxlY3Rpb25NZW1iZXJzKHNuYXBzaG90LnNlbGVjdGlvbik7XG4gIGNvbnN0IHNlY3Rpb25JbmRleCA9IGdldFNlY3Rpb25JbmRleChzbmFwc2hvdC5kb2N1bWVudCwgc2VjdGlvbi5pZCk7XG4gIGNvbnN0IGN1ZUluZGV4ID0gc2VjdGlvbi50ZXh0LmN1ZXMuZmluZEluZGV4KChjdWUpID0+IGN1ZS5pZCA9PT0gc25hcHNob3Quc2VsZWN0aW9uLmN1ZUlkKTtcbiAgY29uc3QgY3VlID0gc2VjdGlvbi50ZXh0LmN1ZXNbY3VlSW5kZXhdO1xuICBpZiAoIWN1ZSkgcmV0dXJuIDxTZWN0aW9uSW5zcGVjdG9yIHN0b3JlPXtzdG9yZX0gc25hcHNob3Q9e3NuYXBzaG90fSBzZWN0aW9uPXtzZWN0aW9ufSAvPjtcbiAgY29uc3QgdXBkYXRlID0gKGZpZWxkLCB2YWx1ZSkgPT4gc3RvcmUuY29tbWl0KGBFZGl0IEN1ZSAke2ZpZWxkfWAsIChkcmFmdCkgPT4ge1xuICAgIGRyYWZ0LnNlY3Rpb25zW3NlY3Rpb25JbmRleF0udGV4dC5jdWVzW2N1ZUluZGV4XVtmaWVsZF0gPSB2YWx1ZTtcbiAgfSwgeyBjb2FsZXNjZUtleTogYGN1ZToke2N1ZS5pZH06JHtmaWVsZH1gLCBzZWxlY3Rpb246IHNuYXBzaG90LnNlbGVjdGlvbiB9KTtcbiAgY29uc3QgcmVtb3ZlID0gKCkgPT4gc3RvcmUuY29tbWl0KCdEZWxldGUgdGV4dCBDdWUnLCAoZHJhZnQpID0+IHtcbiAgICBkcmFmdC5zZWN0aW9uc1tzZWN0aW9uSW5kZXhdLnRleHQuY3Vlcy5zcGxpY2UoY3VlSW5kZXgsIDEpO1xuICB9LCB7IHNlbGVjdGlvbjogeyB0eXBlOiAnc2VjdGlvbicsIHNlY3Rpb25JZDogc2VjdGlvbi5pZCB9IH0pO1xuICBjb25zdCB0aW1pbmdCb3VuZHMgPSBnZXRBYm91dE5hcnJhdGl2ZUN1ZVRpbWluZ0JvdW5kcyhjdWUpO1xuICBjb25zdCBtb3Rpb25JbnRlcnZhbCA9IGdldEFib3V0TmFycmF0aXZlQ3VlTW90aW9uSW50ZXJ2YWwoY3VlLCBzbmFwc2hvdC5kb2N1bWVudC5nbG9iYWxzLnRleHRNb3Rpb24pO1xuICBjb25zdCBtb3ZlbWVudCA9IGdldEFib3V0TmFycmF0aXZlQ3VlTW92ZW1lbnQoY3VlKTtcbiAgY29uc3QgbW92ZUN1ZSA9IChwZXJjZW50KSA9PiBzdG9yZS5jb21taXQoJ01vdmUgdGV4dCBDdWUnLCAoZHJhZnQpID0+IHtcbiAgICBjb25zdCB0YXJnZXQgPSBkcmFmdC5zZWN0aW9uc1tzZWN0aW9uSW5kZXhdLnRleHQuY3Vlc1tjdWVJbmRleF07XG4gICAgT2JqZWN0LmFzc2lnbih0YXJnZXQsIG1vdmVBYm91dE5hcnJhdGl2ZUN1ZVRpbWluZyh0YXJnZXQsIHBlcmNlbnQgLyAxMDApKTtcbiAgfSwgeyBjb2FsZXNjZUtleTogYGN1ZToke2N1ZS5pZH06dGltaW5nYCwgc2VsZWN0aW9uOiB7IC4uLnNuYXBzaG90LnNlbGVjdGlvbiwga2V5UGFydDogJ2ZvY3VzJyB9IH0pO1xuICBjb25zdCB1cGRhdGVNb3ZlbWVudCA9IChtb2RlKSA9PiBzdG9yZS5jb21taXQoJ0NoYW5nZSB0ZXh0IG1vdmVtZW50JywgKGRyYWZ0KSA9PiB7XG4gICAgY29uc3QgdGFyZ2V0ID0gZHJhZnQuc2VjdGlvbnNbc2VjdGlvbkluZGV4XS50ZXh0LmN1ZXNbY3VlSW5kZXhdO1xuICAgIHRhcmdldC5tb3Rpb24gPSB7IC4uLnRhcmdldC5tb3Rpb24sIG1vZGUgfTtcbiAgfSwgeyBzZWxlY3Rpb246IHNuYXBzaG90LnNlbGVjdGlvbiB9KTtcbiAgcmV0dXJuIChcbiAgICA8PlxuICAgICAgPGhlYWRlcj48c3Bhbj5UZXh0IEN1ZTwvc3Bhbj48c3Ryb25nPntjdWUuaWR9PC9zdHJvbmc+PC9oZWFkZXI+XG4gICAgICB7c2VsZWN0ZWRNZW1iZXJzLmxlbmd0aCA+IDEgPyAoXG4gICAgICAgIDxkaXYgY2xhc3NOYW1lPVwiYWJvdXQtZWRpdG9yLWdyb3VwLXN1bW1hcnlcIj5cbiAgICAgICAgICA8c3Ryb25nPntzZWxlY3RlZE1lbWJlcnMubGVuZ3RofSB0aXRsZXMgc2VsZWN0ZWQ8L3N0cm9uZz5cbiAgICAgICAgICA8b2w+e3NlbGVjdGVkTWVtYmVycy5tYXAoKG1lbWJlcikgPT4ge1xuICAgICAgICAgICAgY29uc3QgbWVtYmVyU2VjdGlvbiA9IHNuYXBzaG90LmRvY3VtZW50LnNlY3Rpb25zLmZpbmQoKGl0ZW0pID0+IGl0ZW0uaWQgPT09IG1lbWJlci5zZWN0aW9uSWQpO1xuICAgICAgICAgICAgY29uc3QgbWVtYmVyQ3VlID0gbWVtYmVyU2VjdGlvbj8udGV4dD8uY3Vlcz8uZmluZCgoaXRlbSkgPT4gaXRlbS5pZCA9PT0gbWVtYmVyLmN1ZUlkKTtcbiAgICAgICAgICAgIHJldHVybiA8bGkga2V5PXtgJHttZW1iZXIuc2VjdGlvbklkfToke21lbWJlci5jdWVJZH1gfT48c3Bhbj57bWVtYmVyU2VjdGlvbj8ubGFiZWx9PC9zcGFuPnttZW1iZXJDdWU/LnRleHR9PC9saT47XG4gICAgICAgICAgfSl9PC9vbD5cbiAgICAgICAgICA8YnV0dG9uIHR5cGU9XCJidXR0b25cIiBvbkNsaWNrPXsoKSA9PiBzdG9yZS5zZXRTZWxlY3Rpb24oeyB0eXBlOiAnY3VlJywgc2VjdGlvbklkOiBzZWN0aW9uLmlkLCBjdWVJZDogY3VlLmlkLCBrZXlQYXJ0OiAnZm9jdXMnIH0pfT5LZWVwIHByaW1hcnkgb25seTwvYnV0dG9uPlxuICAgICAgICA8L2Rpdj5cbiAgICAgICkgOiBudWxsfVxuICAgICAgPHAgY2xhc3NOYW1lPVwiYWJvdXQtZWRpdG9yLWhlbHBcIj5EcmFnIHRoZSBwaW5rIHRpbWluZyBtYXJrZXIgYW55d2hlcmUgZnJvbSAw4oCTMTAwJSBvZiBpdHMgU2VjdGlvbi4gVGhpcyBtb3ZlcyB0aGUgdGl0bGUncyBmb2N1cyB0aW1lIG9ubHkuIEl0cyB0cmF2ZWwgZHVyYXRpb24sIHNwZWVkLCBibHVyLCBhbmQgaW4vb3V0IGNhZGVuY2UgcmVtYWluIGNvbnRyb2xsZWQgZ2xvYmFsbHkgdW5kZXIgU3BhdGlhbCB0aXRsZXMuPC9wPlxuICAgICAgPFByb3BlcnR5IGxhYmVsPVwiU3RhdGVtZW50XCI+PHRleHRhcmVhIHJvd3M9XCI3XCIgdmFsdWU9e2N1ZS50ZXh0fSBvbkNoYW5nZT17KGV2ZW50KSA9PiB1cGRhdGUoJ3RleHQnLCBldmVudC50YXJnZXQudmFsdWUpfSAvPjwvUHJvcGVydHk+XG4gICAgICA8UHJvcGVydHkgbGFiZWw9XCJNb3ZlbWVudFwiPjxzZWxlY3QgdmFsdWU9e21vdmVtZW50fSBvbkNoYW5nZT17KGV2ZW50KSA9PiB1cGRhdGVNb3ZlbWVudChldmVudC50YXJnZXQudmFsdWUpfT48b3B0aW9uIHZhbHVlPVwic3BhdGlhbFwiPlNwYXRpYWwgdHJhdmVsPC9vcHRpb24+PG9wdGlvbiB2YWx1ZT1cInZlcnRpY2FsXCI+VmVydGljYWwgc2Nyb2xsPC9vcHRpb24+PC9zZWxlY3Q+PC9Qcm9wZXJ0eT5cbiAgICAgIDxOdW1iZXJQcm9wZXJ0eVxuICAgICAgICBsYWJlbD1cIlBvc2l0aW9uXCJcbiAgICAgICAgdmFsdWU9e051bWJlcigoY3VlLmhvbGQgKiAxMDApLnRvRml4ZWQoMSkpfVxuICAgICAgICBtaW49e051bWJlcigodGltaW5nQm91bmRzLm1pbiAqIDEwMCkudG9GaXhlZCgxKSl9XG4gICAgICAgIG1heD17TnVtYmVyKCh0aW1pbmdCb3VuZHMubWF4ICogMTAwKS50b0ZpeGVkKDEpKX1cbiAgICAgICAgc3RlcD17MC41fVxuICAgICAgICB1bml0PVwiJVwiXG4gICAgICAgIGRpc2FibGVkPXt0aW1pbmdCb3VuZHMubWluID09PSB0aW1pbmdCb3VuZHMubWF4fVxuICAgICAgICBvbkNoYW5nZT17bW92ZUN1ZX1cbiAgICAgIC8+XG4gICAgICB7bW92ZW1lbnQgPT09ICdzcGF0aWFsJyA/IChcbiAgICAgICAgPD5cbiAgICAgICAgICA8UHJvcGVydHkgbGFiZWw9XCJBdXRvIHRyYXZlbFwiPjxvdXRwdXQgY2xhc3NOYW1lPVwiYWJvdXQtZWRpdG9yLXJlYWRvdXRcIj57TWF0aC5yb3VuZChtb3Rpb25JbnRlcnZhbC5zdGFydCAqIDEwMCl94oCTe01hdGgucm91bmQobW90aW9uSW50ZXJ2YWwuZW5kICogMTAwKX0lPC9vdXRwdXQ+PC9Qcm9wZXJ0eT5cbiAgICAgICAgICA8UHJvcGVydHkgbGFiZWw9XCJNb3Rpb24gcHJlc2V0XCI+PHNlbGVjdCB2YWx1ZT17Y3VlLnByZXNldH0gb25DaGFuZ2U9eyhldmVudCkgPT4gdXBkYXRlKCdwcmVzZXQnLCBldmVudC50YXJnZXQudmFsdWUpfT48b3B0aW9uIHZhbHVlPVwidHJhdmVsbGluZy10aXRsZS12MVwiPlRyYXZlbGxpbmcgdGl0bGU8L29wdGlvbj48b3B0aW9uIHZhbHVlPVwib3BlbmVyLXYxXCI+T3BlbmVyPC9vcHRpb24+PG9wdGlvbiB2YWx1ZT1cImZpbmFsZS12MVwiPkZpbmFsZTwvb3B0aW9uPjwvc2VsZWN0PjwvUHJvcGVydHk+XG4gICAgICAgIDwvPlxuICAgICAgKSA6IDxQcm9wZXJ0eSBsYWJlbD1cIlJldmVhbFwiPjxvdXRwdXQgY2xhc3NOYW1lPVwiYWJvdXQtZWRpdG9yLXJlYWRvdXRcIj5FZGl0b3JpYWwgdmVydGljYWwgc2Nyb2xsPC9vdXRwdXQ+PC9Qcm9wZXJ0eT59XG4gICAgICA8Q3VlUmh5dGhtQW5kUmV1c2Ugc3RvcmU9e3N0b3JlfSBzbmFwc2hvdD17c25hcHNob3R9IGNsaXBib2FyZD17Y2xpcGJvYXJkfSBzZXRDbGlwYm9hcmQ9e3NldENsaXBib2FyZH0gLz5cbiAgICAgIDxidXR0b24gdHlwZT1cImJ1dHRvblwiIGNsYXNzTmFtZT1cImFib3V0LWVkaXRvci1kYW5nZXJcIiBkaXNhYmxlZD17c2VjdGlvbi50eXBlID09PSAnZmluYWxlJ30gb25DbGljaz17cmVtb3ZlfT5EZWxldGUgQ3VlPC9idXR0b24+XG4gICAgPC8+XG4gICk7XG59XG5cbmZ1bmN0aW9uIERpc2NpcGxpbmVSZXZlYWxJbnNwZWN0b3IoeyBzdG9yZSwgc25hcHNob3QsIHNlY3Rpb24gfSkge1xuICBjb25zdCBzZWN0aW9uSW5kZXggPSBnZXRTZWN0aW9uSW5kZXgoc25hcHNob3QuZG9jdW1lbnQsIHNlY3Rpb24uaWQpO1xuICBjb25zdCByZXZlYWwgPSBzZWN0aW9uLnRleHQuZGlzY2lwbGluZVJldmVhbDtcbiAgaWYgKCFyZXZlYWwpIHJldHVybiA8U2VjdGlvbkluc3BlY3RvciBzdG9yZT17c3RvcmV9IHNuYXBzaG90PXtzbmFwc2hvdH0gc2VjdGlvbj17c2VjdGlvbn0gLz47XG4gIGNvbnN0IHVwZGF0ZSA9IChsYWJlbCwgbXV0YXRlLCBjb2FsZXNjZUtleSA9IG51bGwpID0+IHN0b3JlLmNvbW1pdChsYWJlbCwgKGRyYWZ0KSA9PiB7XG4gICAgbXV0YXRlKGRyYWZ0LnNlY3Rpb25zW3NlY3Rpb25JbmRleF0udGV4dC5kaXNjaXBsaW5lUmV2ZWFsKTtcbiAgfSwgeyBjb2FsZXNjZUtleSwgc2VsZWN0aW9uOiBzbmFwc2hvdC5zZWxlY3Rpb24gfSk7XG4gIGNvbnN0IG9jY3VwaWVkID0gKChyZXZlYWwuaXRlbXMubGVuZ3RoIC0gMSkgKiByZXZlYWwuc3RhZ2dlcikgKyByZXZlYWwubGFiZWxEdXJhdGlvbiArIHJldmVhbC5ob2xkO1xuICBjb25zdCBsaW1pdHNGb3IgPSAoY29udHJvbCkgPT4ge1xuICAgIGlmIChjb250cm9sLmlkID09PSAnc3RhcnQnKSByZXR1cm4geyBtaW46IGNvbnRyb2wubWluLCBtYXg6IE1hdGgubWF4KGNvbnRyb2wubWluLCByZXZlYWwuZW5kIC0gb2NjdXBpZWQpIH07XG4gICAgaWYgKGNvbnRyb2wuaWQgPT09ICdlbmQnKSByZXR1cm4geyBtaW46IE1hdGgubWluKGNvbnRyb2wubWF4LCByZXZlYWwuc3RhcnQgKyBvY2N1cGllZCksIG1heDogY29udHJvbC5tYXggfTtcbiAgICBpZiAoY29udHJvbC5pZCA9PT0gJ3N0YWdnZXInKSByZXR1cm4ge1xuICAgICAgbWluOiBjb250cm9sLm1pbixcbiAgICAgIG1heDogTWF0aC5tYXgoY29udHJvbC5taW4sIChyZXZlYWwuZW5kIC0gcmV2ZWFsLnN0YXJ0IC0gcmV2ZWFsLmxhYmVsRHVyYXRpb24gLSByZXZlYWwuaG9sZCkgLyBNYXRoLm1heCgxLCByZXZlYWwuaXRlbXMubGVuZ3RoIC0gMSkpLFxuICAgIH07XG4gICAgaWYgKGNvbnRyb2wuaWQgPT09ICdsYWJlbER1cmF0aW9uJykgcmV0dXJuIHtcbiAgICAgIG1pbjogY29udHJvbC5taW4sXG4gICAgICBtYXg6IE1hdGgubWF4KGNvbnRyb2wubWluLCByZXZlYWwuZW5kIC0gcmV2ZWFsLnN0YXJ0IC0gKChyZXZlYWwuaXRlbXMubGVuZ3RoIC0gMSkgKiByZXZlYWwuc3RhZ2dlcikgLSByZXZlYWwuaG9sZCksXG4gICAgfTtcbiAgICBpZiAoY29udHJvbC5pZCA9PT0gJ2hvbGQnKSByZXR1cm4ge1xuICAgICAgbWluOiBjb250cm9sLm1pbixcbiAgICAgIG1heDogTWF0aC5tYXgoY29udHJvbC5taW4sIHJldmVhbC5lbmQgLSByZXZlYWwuc3RhcnQgLSAoKHJldmVhbC5pdGVtcy5sZW5ndGggLSAxKSAqIHJldmVhbC5zdGFnZ2VyKSAtIHJldmVhbC5sYWJlbER1cmF0aW9uKSxcbiAgICB9O1xuICAgIHJldHVybiB7IG1pbjogY29udHJvbC5taW4sIG1heDogY29udHJvbC5tYXggfTtcbiAgfTtcbiAgcmV0dXJuIChcbiAgICA8PlxuICAgICAgPGhlYWRlcj48c3Bhbj5UZXh0IHNlcXVlbmNlPC9zcGFuPjxzdHJvbmc+RGlzY2lwbGluZSByZXZlYWw8L3N0cm9uZz48L2hlYWRlcj5cbiAgICAgIDxwIGNsYXNzTmFtZT1cImFib3V0LWVkaXRvci1oZWxwXCI+T25lIGNsaXAgY29udHJvbHMgdGhlIGNvbXBsZXRlIHNpeC1wb2ludCBzZXF1ZW5jZS4gRHJhZyBpdHMgc3RyaXBlZCBibG9jayBpbiB0aGUgVGV4dCBsYW5lIHRvIG1vdmUgZXZlcnkgcmV2ZWFsIHRvZ2V0aGVyLjwvcD5cbiAgICAgIDxkZXRhaWxzIG9wZW4+PHN1bW1hcnk+UmV2ZWFsIGNob3Jlb2dyYXBoeTwvc3VtbWFyeT5cbiAgICAgICAge0FCT1VUX05BUlJBVElWRV9ESVNDSVBMSU5FX1JFVkVBTF9DT05UUk9MUy5tYXAoKGNvbnRyb2wpID0+IHtcbiAgICAgICAgICBjb25zdCBsaW1pdHMgPSBsaW1pdHNGb3IoY29udHJvbCk7XG4gICAgICAgICAgcmV0dXJuIChcbiAgICAgICAgICAgIDxOdW1iZXJQcm9wZXJ0eVxuICAgICAgICAgICAgICBrZXk9e2NvbnRyb2wuaWR9XG4gICAgICAgICAgICAgIGxhYmVsPXtjb250cm9sLmxhYmVsfVxuICAgICAgICAgICAgICB2YWx1ZT17cmV2ZWFsW2NvbnRyb2wuaWRdfVxuICAgICAgICAgICAgICBtaW49e2xpbWl0cy5taW59XG4gICAgICAgICAgICAgIG1heD17bGltaXRzLm1heH1cbiAgICAgICAgICAgICAgc3RlcD17Y29udHJvbC5zdGVwfVxuICAgICAgICAgICAgICB1bml0PXtjb250cm9sLnVuaXR9XG4gICAgICAgICAgICAgIG9uQ2hhbmdlPXsodmFsdWUpID0+IHVwZGF0ZShgQ2hhbmdlICR7Y29udHJvbC5sYWJlbH1gLCAoZHJhZnQpID0+IHsgZHJhZnRbY29udHJvbC5pZF0gPSB2YWx1ZTsgfSwgYGRpc2NpcGxpbmUtcmV2ZWFsOiR7c2VjdGlvbi5pZH06JHtjb250cm9sLmlkfWApfVxuICAgICAgICAgICAgLz5cbiAgICAgICAgICApO1xuICAgICAgICB9KX1cbiAgICAgIDwvZGV0YWlscz5cbiAgICAgIDxkZXRhaWxzIG9wZW4+PHN1bW1hcnk+UmV2ZWFsIG9yZGVyIGFuZCBsYWJlbHM8L3N1bW1hcnk+XG4gICAgICAgIDxkaXYgY2xhc3NOYW1lPVwiYWJvdXQtZWRpdG9yLWRpc2NpcGxpbmUtaXRlbXNcIj5cbiAgICAgICAgICB7cmV2ZWFsLml0ZW1zLm1hcCgoaXRlbSwgaXRlbUluZGV4KSA9PiAoXG4gICAgICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cImFib3V0LWVkaXRvci1kaXNjaXBsaW5lLWl0ZW1cIiBrZXk9e2l0ZW0uZ3JvdXB9PlxuICAgICAgICAgICAgICA8Y29kZT57U3RyaW5nKGl0ZW1JbmRleCArIDEpLnBhZFN0YXJ0KDIsICcwJyl9PC9jb2RlPlxuICAgICAgICAgICAgICA8aW5wdXQgdmFsdWU9e2l0ZW0ubGFiZWx9IGFyaWEtbGFiZWw9e2BEaXNjaXBsaW5lICR7aXRlbUluZGV4ICsgMX0gbGFiZWxgfSBvbkNoYW5nZT17KGV2ZW50KSA9PiB1cGRhdGUoJ0VkaXQgZGlzY2lwbGluZSBsYWJlbCcsIChkcmFmdCkgPT4geyBkcmFmdC5pdGVtc1tpdGVtSW5kZXhdLmxhYmVsID0gZXZlbnQudGFyZ2V0LnZhbHVlOyB9LCBgZGlzY2lwbGluZS1yZXZlYWw6JHtzZWN0aW9uLmlkfTppdGVtOiR7aXRlbS5ncm91cH06bGFiZWxgKX0gLz5cbiAgICAgICAgICAgICAgPGRpdiBjbGFzc05hbWU9XCJhYm91dC1lZGl0b3ItZGlzY2lwbGluZS1wYWxldHRlXCIgdGl0bGU9e2Ake2l0ZW0ubGFiZWx9IHVzZXMgdGhlIEhvbWUgc2ltdWxhdGlvbiAke0RJU0NJUExJTkVfQkFMTF9UT0tFTl9CWV9HUk9VUFtpdGVtLmdyb3VwXX1gfT5cbiAgICAgICAgICAgICAgICA8aSBzdHlsZT17eyBiYWNrZ3JvdW5kOiBgdmFyKCR7RElTQ0lQTElORV9CQUxMX1RPS0VOX0JZX0dST1VQW2l0ZW0uZ3JvdXBdfSlgIH19IC8+XG4gICAgICAgICAgICAgICAgPGNvZGU+e0RJU0NJUExJTkVfQkFMTF9UT0tFTl9CWV9HUk9VUFtpdGVtLmdyb3VwXX08L2NvZGU+XG4gICAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgICA8c3Bhbj5cbiAgICAgICAgICAgICAgICA8YnV0dG9uIHR5cGU9XCJidXR0b25cIiBkaXNhYmxlZD17aXRlbUluZGV4ID09PSAwfSBhcmlhLWxhYmVsPXtgUmV2ZWFsICR7aXRlbS5sYWJlbH0gZWFybGllcmB9IG9uQ2xpY2s9eygpID0+IHVwZGF0ZSgnUmVvcmRlciBkaXNjaXBsaW5lIHJldmVhbCcsIChkcmFmdCkgPT4geyBjb25zdCBbbW92ZWRdID0gZHJhZnQuaXRlbXMuc3BsaWNlKGl0ZW1JbmRleCwgMSk7IGRyYWZ0Lml0ZW1zLnNwbGljZShpdGVtSW5kZXggLSAxLCAwLCBtb3ZlZCk7IH0pfT7ihpE8L2J1dHRvbj5cbiAgICAgICAgICAgICAgICA8YnV0dG9uIHR5cGU9XCJidXR0b25cIiBkaXNhYmxlZD17aXRlbUluZGV4ID09PSByZXZlYWwuaXRlbXMubGVuZ3RoIC0gMX0gYXJpYS1sYWJlbD17YFJldmVhbCAke2l0ZW0ubGFiZWx9IGxhdGVyYH0gb25DbGljaz17KCkgPT4gdXBkYXRlKCdSZW9yZGVyIGRpc2NpcGxpbmUgcmV2ZWFsJywgKGRyYWZ0KSA9PiB7IGNvbnN0IFttb3ZlZF0gPSBkcmFmdC5pdGVtcy5zcGxpY2UoaXRlbUluZGV4LCAxKTsgZHJhZnQuaXRlbXMuc3BsaWNlKGl0ZW1JbmRleCArIDEsIDAsIG1vdmVkKTsgfSl9PuKGkzwvYnV0dG9uPlxuICAgICAgICAgICAgICA8L3NwYW4+XG4gICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICApKX1cbiAgICAgICAgPC9kaXY+XG4gICAgICA8L2RldGFpbHM+XG4gICAgICA8cCBjbGFzc05hbWU9XCJhYm91dC1lZGl0b3ItaGVscFwiPlRoZSBzaXggcG9pbnRzIHBlcnNpc3QgYWZ0ZXIgdGhlIGxhYmVscyBsZWF2ZS4gQW4gZWRpdG9yaWFsIGJsb2NrIG1hcmtlZCDigJxSZWNvbm5lY3QgcG9pbnQgZ3JpZOKAnSByZXN0b3JlcyB0aGUgc3Vycm91bmRpbmcgZ3JpZCBhcyB0aGF0IHBhcmFncmFwaCBlbnRlcnMuPC9wPlxuICAgIDwvPlxuICApO1xufVxuXG5mdW5jdGlvbiBDYW1lcmFJbnNwZWN0b3IoeyBzdG9yZSwgc25hcHNob3QsIHNlY3Rpb24gfSkge1xuICBjb25zdCBzZWN0aW9uSW5kZXggPSBnZXRTZWN0aW9uSW5kZXgoc25hcHNob3QuZG9jdW1lbnQsIHNlY3Rpb24uaWQpO1xuICBjb25zdCBrZXlJbmRleCA9IHNuYXBzaG90LnNlbGVjdGlvbi5rZXlJbmRleDtcbiAgY29uc3Qgc2VsZWN0ZWRLZXkgPSBzZWN0aW9uLmNhbWVyYS5rZXlzW2tleUluZGV4XTtcbiAgY29uc3Qga2V5ID0gc2VsZWN0ZWRLZXkgJiYgc2VsZWN0ZWRLZXkuYXQgPiAwICYmIHNlbGVjdGVkS2V5LmF0IDwgMSA/IHNlbGVjdGVkS2V5IDogbnVsbDtcbiAgY29uc3QgbG9jYWwgPSBnZXRMb2NhbFByb2dyZXNzKHNuYXBzaG90LmNvbXBpbGVkUGxhbiwgc2VjdGlvbiwgc25hcHNob3QudHJhbnNwb3J0LnN0b3J5V1UpO1xuICBjb25zdCB0YXJnZXRBdCA9IE1hdGgubWluKDAuOTk1LCBNYXRoLm1heCgwLjAwNSwgc25hcEFib3V0TmFycmF0aXZlVGltZWxpbmVWYWx1ZShsb2NhbCkpKTtcbiAgY29uc3QgYXBwbHlQcmVzZXQgPSAocHJlc2V0KSA9PiBzdG9yZS5jb21taXQoYEFwcGx5ICR7cHJlc2V0fSBjYW1lcmEgcmVjaXBlYCwgKGRyYWZ0KSA9PiB7XG4gICAgY29uc3QgcmVjaXBlcyA9IHtcbiAgICAgIFB1c2g6IFtcbiAgICAgICAgeyBhdDogMCwgb2Zmc2V0OiBbMCwgMCwgMF0sIGxvb2tBdE9mZnNldDogWzAsIDAsIC0xXSwgZm92OiA0OCwgcm9sbDogMCwgZWFzaW5nOiAnc21vb3Roc3RlcCcgfSxcbiAgICAgICAgeyBhdDogMSwgb2Zmc2V0OiBbMCwgMCwgLTEuMl0sIGxvb2tBdE9mZnNldDogWzAsIDAsIC0xXSwgZm92OiA0NSwgcm9sbDogMCwgZWFzaW5nOiAnc21vb3Roc3RlcCcgfSxcbiAgICAgIF0sXG4gICAgICBHbGlkZTogW1xuICAgICAgICB7IGF0OiAwLCBvZmZzZXQ6IFstMC44LCAwLCAwXSwgbG9va0F0T2Zmc2V0OiBbMC40LCAwLCAtMV0sIGZvdjogNDgsIHJvbGw6IDAsIGVhc2luZzogJ3Ntb290aHN0ZXAnIH0sXG4gICAgICAgIHsgYXQ6IDEsIG9mZnNldDogWzAuOCwgMCwgMF0sIGxvb2tBdE9mZnNldDogWy0wLjQsIDAsIC0xXSwgZm92OiA0OCwgcm9sbDogMCwgZWFzaW5nOiAnc21vb3Roc3RlcCcgfSxcbiAgICAgIF0sXG4gICAgICBPcmJpdDogW1xuICAgICAgICB7IGF0OiAwLCBvZmZzZXQ6IFstMC43LCAwLCAwXSwgbG9va0F0T2Zmc2V0OiBbMC43LCAwLCAtMV0sIGZvdjogNDgsIHJvbGw6IC0wLjA4LCBlYXNpbmc6ICdzbW9vdGhzdGVwJyB9LFxuICAgICAgICB7IGF0OiAwLjUsIG9mZnNldDogWzAuNywgMC4yNSwgMF0sIGxvb2tBdE9mZnNldDogWy0wLjcsIC0wLjEsIC0xXSwgZm92OiA0OCwgcm9sbDogMC4wOCwgZWFzaW5nOiAnc21vb3Roc3RlcCcgfSxcbiAgICAgICAgeyBhdDogMSwgb2Zmc2V0OiBbMCwgMCwgMF0sIGxvb2tBdE9mZnNldDogWzAsIDAsIC0xXSwgZm92OiA0OCwgcm9sbDogMCwgZWFzaW5nOiAnc21vb3Roc3RlcCcgfSxcbiAgICAgIF0sXG4gICAgICBSZXZlYWw6IFtcbiAgICAgICAgeyBhdDogMCwgb2Zmc2V0OiBbMCwgLTAuNDUsIDAuNV0sIGxvb2tBdE9mZnNldDogWzAsIDAuMywgLTFdLCBmb3Y6IDU2LCByb2xsOiAwLCBlYXNpbmc6ICdzbW9vdGhzdGVwJyB9LFxuICAgICAgICB7IGF0OiAxLCBvZmZzZXQ6IFswLCAwLCAwXSwgbG9va0F0T2Zmc2V0OiBbMCwgMCwgLTFdLCBmb3Y6IDQ2LCByb2xsOiAwLCBlYXNpbmc6ICdzbW9vdGhzdGVwJyB9LFxuICAgICAgXSxcbiAgICAgIFJlc29sdmU6IFtcbiAgICAgICAgeyBhdDogMCwgb2Zmc2V0OiBbMC4zLCAwLjIsIDBdLCBsb29rQXRPZmZzZXQ6IFstMC4zLCAtMC4yLCAtMV0sIGZvdjogNTIsIHJvbGw6IDAuMTQsIGVhc2luZzogJ3Ntb290aHN0ZXAnIH0sXG4gICAgICAgIHsgYXQ6IDEsIG9mZnNldDogWzAsIDAsIDBdLCBsb29rQXRPZmZzZXQ6IFswLCAwLCAtMV0sIGZvdjogNDgsIHJvbGw6IDAsIGVhc2luZzogJ3Ntb290aHN0ZXAnIH0sXG4gICAgICBdLFxuICAgIH07XG4gICAgZHJhZnQuc2VjdGlvbnNbc2VjdGlvbkluZGV4XS5jYW1lcmEua2V5cyA9IHJlY2lwZXNbcHJlc2V0XTtcbiAgICBicmlkZ2VDYW1lcmFTZWN0aW9uKGRyYWZ0LCBzZWN0aW9uSW5kZXgpO1xuICB9LCB7IHNlbGVjdGlvbjogeyB0eXBlOiAnc2VjdGlvbicsIHNlY3Rpb25JZDogc2VjdGlvbi5pZCB9IH0pO1xuICBjb25zdCBleGlzdGluZ0tleUF0UGxheWhlYWQgPSBzZWN0aW9uLmNhbWVyYS5rZXlzLmZpbmRJbmRleCgoaXRlbSkgPT4gKFxuICAgIGl0ZW0uYXQgPiAwICYmIGl0ZW0uYXQgPCAxICYmIE1hdGguYWJzKGl0ZW0uYXQgLSB0YXJnZXRBdCkgPCAwLjAwMjVcbiAgKSk7XG4gIGNvbnN0IHNldEtleSA9ICgpID0+IHtcbiAgICBpZiAoZXhpc3RpbmdLZXlBdFBsYXloZWFkID49IDApIHtcbiAgICAgIHN0b3JlLnNldFNlbGVjdGlvbih7IHR5cGU6ICdjYW1lcmEta2V5Jywgc2VjdGlvbklkOiBzZWN0aW9uLmlkLCBrZXlJbmRleDogZXhpc3RpbmdLZXlBdFBsYXloZWFkIH0pO1xuICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICBjb25zdCBpbnNlcnRpb25JbmRleCA9IHNlY3Rpb24uY2FtZXJhLmtleXMuZmluZEluZGV4KChpdGVtKSA9PiBpdGVtLmF0ID4gdGFyZ2V0QXQpO1xuICAgIGNvbnN0IHNlbGVjdGVkS2V5SW5kZXggPSBpbnNlcnRpb25JbmRleCA8IDAgPyBzZWN0aW9uLmNhbWVyYS5rZXlzLmxlbmd0aCA6IGluc2VydGlvbkluZGV4O1xuICAgIGNvbnN0IHNhbXBsZWQgPSBzYW1wbGVBYm91dE5hcnJhdGl2ZVBsYW4oc25hcHNob3QuY29tcGlsZWRQbGFuLCBzbmFwc2hvdC50cmFuc3BvcnQuc3RvcnlXVSk7XG4gICAgY29uc3QgYmFzZVogPSBzbmFwc2hvdC5kb2N1bWVudC5nbG9iYWxzLmNhbWVyYS5zdGFydFogLSAoc25hcHNob3QudHJhbnNwb3J0LnN0b3J5V1UgKiBzYW1wbGVkLmNhbWVyYS5jYWRlbmNlKTtcbiAgICBjb25zdCBuZXdLZXkgPSB7XG4gICAgICBhdDogdGFyZ2V0QXQsXG4gICAgICBvZmZzZXQ6IFtzYW1wbGVkLmNhbWVyYS5wb3NpdGlvblswXSwgc2FtcGxlZC5jYW1lcmEucG9zaXRpb25bMV0sIHNhbXBsZWQuY2FtZXJhLnBvc2l0aW9uWzJdIC0gYmFzZVpdLFxuICAgICAgbG9va0F0T2Zmc2V0OiBzYW1wbGVkLmNhbWVyYS50YXJnZXQubWFwKCh2YWx1ZSwgYXhpcykgPT4gdmFsdWUgLSBzYW1wbGVkLmNhbWVyYS5wb3NpdGlvbltheGlzXSksXG4gICAgICBmb3Y6IHNhbXBsZWQuY2FtZXJhLmZvdixcbiAgICAgIHJvbGw6IHNhbXBsZWQuY2FtZXJhLnJvbGwsXG4gICAgICBlYXNpbmc6ICdzbW9vdGhzdGVwJyxcbiAgICB9O1xuICAgIHN0b3JlLmNvbW1pdCgnU2V0IGNhbWVyYSBrZXknLCAoZHJhZnQpID0+IHtcbiAgICAgIGRyYWZ0LnNlY3Rpb25zW3NlY3Rpb25JbmRleF0uY2FtZXJhLmtleXMucHVzaChuZXdLZXkpO1xuICAgICAgZHJhZnQuc2VjdGlvbnNbc2VjdGlvbkluZGV4XS5jYW1lcmEua2V5cy5zb3J0KChhLCBiKSA9PiBhLmF0IC0gYi5hdCk7XG4gICAgfSwgeyBzZWxlY3Rpb246IHsgdHlwZTogJ2NhbWVyYS1rZXknLCBzZWN0aW9uSWQ6IHNlY3Rpb24uaWQsIGtleUluZGV4OiBzZWxlY3RlZEtleUluZGV4IH0gfSk7XG4gIH07XG4gIGNvbnN0IHJlY2lwZXMgPSA8ZGl2IGNsYXNzTmFtZT1cImFib3V0LWVkaXRvci1jYW1lcmEtcmVjaXBlc1wiPntbJ1B1c2gnLCAnR2xpZGUnLCAnT3JiaXQnLCAnUmV2ZWFsJywgJ1Jlc29sdmUnXS5tYXAoKG5hbWUpID0+IDxidXR0b24gdHlwZT1cImJ1dHRvblwiIGtleT17bmFtZX0gb25DbGljaz17KCkgPT4gYXBwbHlQcmVzZXQobmFtZSl9PntuYW1lfTwvYnV0dG9uPil9PC9kaXY+O1xuICBpZiAoIWtleSkge1xuICAgIHJldHVybiA8PjxoZWFkZXI+PHNwYW4+Q2FtZXJhIHRyYWNrPC9zcGFuPjxzdHJvbmc+RWRpdGluZyBTZWN0aW9uIGJhc2U8L3N0cm9uZz48L2hlYWRlcj48cCBjbGFzc05hbWU9XCJhYm91dC1lZGl0b3ItaGVscFwiPlRoZSBkb2xseSBhbmQgU2VjdGlvbiBqb2lucyBhcmUgY29udGludW91cyBhdXRvbWF0aWNhbGx5LiBBZGQgdmlzaWJsZSBrZXlzIG9ubHkgd2hlcmUgdGhlIGZyYW1pbmcsIGFpbSwgcm9sbCwgb3IgbGVucyBzaG91bGQgY2hhbmdlLjwvcD57cmVjaXBlc308YnV0dG9uIHR5cGU9XCJidXR0b25cIiBjbGFzc05hbWU9XCJhYm91dC1lZGl0b3Itd2lkZS1hY3Rpb25cIiBvbkNsaWNrPXtzZXRLZXl9PlNldCBjYW1lcmEga2V5IGF0IHtmb3JtYXRDYW1lcmFQZXJjZW50KHRhcmdldEF0KX08L2J1dHRvbj48Lz47XG4gIH1cbiAgY29uc3QgdXBkYXRlID0gKGZpZWxkLCB2YWx1ZSkgPT4gc3RvcmUuY29tbWl0KGBFZGl0IGNhbWVyYSAke2ZpZWxkfWAsIChkcmFmdCkgPT4ge1xuICAgIGRyYWZ0LnNlY3Rpb25zW3NlY3Rpb25JbmRleF0uY2FtZXJhLmtleXNba2V5SW5kZXhdW2ZpZWxkXSA9IEFycmF5LmlzQXJyYXkodmFsdWUpID8gWy4uLnZhbHVlXSA6IHZhbHVlO1xuICAgIGlmIChDQU1FUkFfUE9TRV9GSUVMRFMuaGFzKGZpZWxkKSkgbGlua0NhbWVyYUJvdW5kYXJ5KGRyYWZ0LCBzZWN0aW9uSW5kZXgsIGtleUluZGV4KTtcbiAgfSwgeyBjb2FsZXNjZUtleTogYGNhbWVyYToke3NlY3Rpb24uaWR9OiR7a2V5SW5kZXh9OiR7ZmllbGR9YCwgc2VsZWN0aW9uOiBzbmFwc2hvdC5zZWxlY3Rpb24gfSk7XG4gIGNvbnN0IHVwZGF0ZVZlY3RvciA9IChmaWVsZCwgYXhpcywgdmFsdWUpID0+IHtcbiAgICBjb25zdCBuZXh0ID0gWy4uLmtleVtmaWVsZF1dO1xuICAgIG5leHRbYXhpc10gPSB2YWx1ZTtcbiAgICB1cGRhdGUoZmllbGQsIG5leHQpO1xuICB9O1xuICBjb25zdCB0aW1pbmdCb3VuZHMgPSBnZXRBYm91dE5hcnJhdGl2ZUNhbWVyYUtleVRpbWluZ0JvdW5kcyhzZWN0aW9uLmNhbWVyYS5rZXlzLCBrZXlJbmRleCk7XG4gIGNvbnN0IGV4dGVudEZpZWxkID0gc25hcHNob3QucHJldmlld1Byb2ZpbGUgPT09ICdtb2JpbGUnID8gJ21vYmlsZUV4dGVudFdVJyA6ICdleHRlbnRXVSc7XG4gIGNvbnN0IGV4dGVudExhYmVsID0gc25hcHNob3QucHJldmlld1Byb2ZpbGUgPT09ICdtb2JpbGUnID8gJ01vYmlsZSBsZW5ndGgnIDogJ1NlY3Rpb24gbGVuZ3RoJztcbiAgY29uc3QgdXBkYXRlRXh0ZW50ID0gKHZhbHVlKSA9PiBzdG9yZS5jb21taXQoJ0NoYW5nZSBTZWN0aW9uIGV4dGVudCcsIChkcmFmdCkgPT4ge1xuICAgIGRyYWZ0LnNlY3Rpb25zW3NlY3Rpb25JbmRleF1bZXh0ZW50RmllbGRdID0gdmFsdWU7XG4gIH0sIHsgY29hbGVzY2VLZXk6IGBzZWN0aW9uOiR7c2VjdGlvbi5pZH06JHtleHRlbnRGaWVsZH1gLCBzZWxlY3Rpb246IHNuYXBzaG90LnNlbGVjdGlvbiB9KTtcbiAgcmV0dXJuIChcbiAgICA8PlxuICAgICAgPGhlYWRlcj48c3Bhbj5DYW1lcmEga2V5PC9zcGFuPjxzdHJvbmc+e2Zvcm1hdENhbWVyYVBlcmNlbnQoa2V5LmF0KX0gdGhyb3VnaCB7c2VjdGlvbi5sYWJlbH08L3N0cm9uZz48L2hlYWRlcj5cbiAgICAgIHtyZWNpcGVzfVxuICAgICAgPE51bWJlclByb3BlcnR5XG4gICAgICAgIGxhYmVsPVwiUG9zaXRpb25cIlxuICAgICAgICB2YWx1ZT17TnVtYmVyKChrZXkuYXQgKiAxMDApLnRvRml4ZWQoMSkpfVxuICAgICAgICBtaW49e051bWJlcigodGltaW5nQm91bmRzLm1pbiAqIDEwMCkudG9GaXhlZCgxKSl9XG4gICAgICAgIG1heD17TnVtYmVyKCh0aW1pbmdCb3VuZHMubWF4ICogMTAwKS50b0ZpeGVkKDEpKX1cbiAgICAgICAgc3RlcD17MC41fVxuICAgICAgICB1bml0PVwiJVwiXG4gICAgICAgIG9uQ2hhbmdlPXsodmFsdWUpID0+IHVwZGF0ZSgnYXQnLCBNYXRoLm1pbih0aW1pbmdCb3VuZHMubWF4LCBNYXRoLm1heCh0aW1pbmdCb3VuZHMubWluLCBzbmFwQWJvdXROYXJyYXRpdmVUaW1lbGluZVZhbHVlKHZhbHVlIC8gMTAwKSkpKX1cbiAgICAgIC8+XG4gICAgICA8TnVtYmVyUHJvcGVydHkgbGFiZWw9e2V4dGVudExhYmVsfSB2YWx1ZT17c2VjdGlvbltleHRlbnRGaWVsZF19IG1pbj17MX0gbWF4PXs4fSBzdGVwPXswLjA1fSB1bml0PVwiV1VcIiBvbkNoYW5nZT17dXBkYXRlRXh0ZW50fSAvPlxuICAgICAge1snWCBvZmZzZXQnLCAnWSBvZmZzZXQnLCAnRm9yd2FyZCBvZmZzZXQnXS5tYXAoKGxhYmVsLCBheGlzKSA9PiA8TnVtYmVyUHJvcGVydHkga2V5PXtsYWJlbH0gbGFiZWw9e2xhYmVsfSB2YWx1ZT17a2V5Lm9mZnNldFtheGlzXX0gbWluPXstOH0gbWF4PXs4fSBzdGVwPXswLjAyfSB1bml0PVwiV1VcIiBvbkNoYW5nZT17KHZhbHVlKSA9PiB1cGRhdGVWZWN0b3IoJ29mZnNldCcsIGF4aXMsIHZhbHVlKX0gLz4pfVxuICAgICAge1snQWltIFgnLCAnQWltIFknLCAnQWltIGRlcHRoJ10ubWFwKChsYWJlbCwgYXhpcykgPT4gPE51bWJlclByb3BlcnR5IGtleT17bGFiZWx9IGxhYmVsPXtsYWJlbH0gdmFsdWU9e2tleS5sb29rQXRPZmZzZXRbYXhpc119IG1pbj17LTh9IG1heD17OH0gc3RlcD17MC4wMn0gdW5pdD1cIldVXCIgb25DaGFuZ2U9eyh2YWx1ZSkgPT4gdXBkYXRlVmVjdG9yKCdsb29rQXRPZmZzZXQnLCBheGlzLCB2YWx1ZSl9IC8+KX1cbiAgICAgIDxOdW1iZXJQcm9wZXJ0eSBsYWJlbD1cIkZpZWxkIG9mIHZpZXdcIiB2YWx1ZT17a2V5LmZvdn0gbWluPXsyMH0gbWF4PXs5MH0gc3RlcD17MX0gdW5pdD1cIsKwXCIgb25DaGFuZ2U9eyh2YWx1ZSkgPT4gdXBkYXRlKCdmb3YnLCB2YWx1ZSl9IC8+XG4gICAgICA8TnVtYmVyUHJvcGVydHkgbGFiZWw9XCJSb2xsXCIgdmFsdWU9e2tleS5yb2xsfSBtaW49ey0xLjJ9IG1heD17MS4yfSBzdGVwPXswLjAxfSB1bml0PVwicmFkXCIgb25DaGFuZ2U9eyh2YWx1ZSkgPT4gdXBkYXRlKCdyb2xsJywgdmFsdWUpfSAvPlxuICAgICAgPFByb3BlcnR5IGxhYmVsPVwiRWFzaW5nXCI+PHNlbGVjdCB2YWx1ZT17a2V5LmVhc2luZ30gb25DaGFuZ2U9eyhldmVudCkgPT4gdXBkYXRlKCdlYXNpbmcnLCBldmVudC50YXJnZXQudmFsdWUpfT48b3B0aW9uIHZhbHVlPVwic21vb3Roc3RlcFwiPlNtb290aHN0ZXA8L29wdGlvbj48b3B0aW9uIHZhbHVlPVwiZWFzZS1pbi1vdXRcIj5FYXNlIGluIG91dDwvb3B0aW9uPjwvc2VsZWN0PjwvUHJvcGVydHk+XG4gICAgICA8YnV0dG9uIHR5cGU9XCJidXR0b25cIiBjbGFzc05hbWU9XCJhYm91dC1lZGl0b3Itd2lkZS1hY3Rpb25cIiBkaXNhYmxlZD17ZXhpc3RpbmdLZXlBdFBsYXloZWFkID49IDB9IG9uQ2xpY2s9e3NldEtleX0+e2V4aXN0aW5nS2V5QXRQbGF5aGVhZCA+PSAwID8gYENhbWVyYSBrZXkgYWxyZWFkeSBhdCAke2Zvcm1hdENhbWVyYVBlcmNlbnQodGFyZ2V0QXQpfWAgOiBgU2V0IGFub3RoZXIga2V5IGF0ICR7Zm9ybWF0Q2FtZXJhUGVyY2VudCh0YXJnZXRBdCl9YH08L2J1dHRvbj5cbiAgICAgIDxidXR0b24gdHlwZT1cImJ1dHRvblwiIGNsYXNzTmFtZT1cImFib3V0LWVkaXRvci1kYW5nZXJcIiBvbkNsaWNrPXsoKSA9PiBzdG9yZS5jb21taXQoJ0RlbGV0ZSBjYW1lcmEga2V5JywgKGRyYWZ0KSA9PiB7IGRyYWZ0LnNlY3Rpb25zW3NlY3Rpb25JbmRleF0uY2FtZXJhLmtleXMuc3BsaWNlKGtleUluZGV4LCAxKTsgfSwgeyBzZWxlY3Rpb246IHsgdHlwZTogJ3NlY3Rpb24nLCBzZWN0aW9uSWQ6IHNlY3Rpb24uaWQgfSB9KX0+RGVsZXRlIGtleTwvYnV0dG9uPlxuICAgIDwvPlxuICApO1xufVxuXG5jb25zdCBDT1JSRVNQT05ERU5DRV9MQUJFTFMgPSBPYmplY3QuZnJlZXplKHtcbiAgJ2luZGV4LXYxJzogJ0luZGV4IG9yZGVyJyxcbiAgJ3N0YWJsZS1zZWVkJzogJ1N0YWJsZSBzZWVkJyxcbiAgJ3NwYXRpYWwtbmVhcmVzdC12MSc6ICdMb2NhbCB0cmF2ZWwgKGFwcHJveC4pJyxcbiAgJ2dyb3VwLWF3YXJlJzogJ0dyb3VwIGF3YXJlJyxcbn0pO1xuXG5mdW5jdGlvbiBXb3JsZEluc3BlY3Rvcih7IHN0b3JlLCBzbmFwc2hvdCwgc2VjdGlvbiwgcnVudGltZU1ldHJpY3MgfSkge1xuICBjb25zdCBzZWN0aW9uSW5kZXggPSBnZXRTZWN0aW9uSW5kZXgoc25hcHNob3QuZG9jdW1lbnQsIHNlY3Rpb24uaWQpO1xuICBpZiAoc2VjdGlvbi53b3JsZC5tb2RlICE9PSAnc2V0Jykge1xuICAgIHJldHVybiA8PjxoZWFkZXI+PHNwYW4+V29ybGQgdHJhY2s8L3NwYW4+PHN0cm9uZz5Jbmhlcml0ZWQgV29ybGQ8L3N0cm9uZz48L2hlYWRlcj48cCBjbGFzc05hbWU9XCJhYm91dC1lZGl0b3ItaGVscFwiPlRoaXMgU2VjdGlvbiBrZWVwcyB0aGUgcHJldmlvdXMgV29ybGQuIENob29zZSDigJxDcmVhdGUgV29ybGQgY2xpcOKAnSBvbmx5IHdoZW4gdGhlIHNoYXBlIHNob3VsZCBjaGFuZ2UgaGVyZS48L3A+PGJ1dHRvbiB0eXBlPVwiYnV0dG9uXCIgY2xhc3NOYW1lPVwiYWJvdXQtZWRpdG9yLXdpZGUtYWN0aW9uXCIgb25DbGljaz17KCkgPT4gc3RvcmUuY29tbWl0KCdDcmVhdGUgV29ybGQgY2xpcCcsIChkcmFmdCkgPT4ge1xuICAgICAgZHJhZnQuc2VjdGlvbnNbc2VjdGlvbkluZGV4XS53b3JsZCA9IGNsb25lQWJvdXROYXJyYXRpdmVEb2N1bWVudChkcmFmdC5zZWN0aW9ucy5zbGljZSgwLCBzZWN0aW9uSW5kZXgpLnJldmVyc2UoKS5maW5kKChpdGVtKSA9PiBpdGVtLndvcmxkLm1vZGUgPT09ICdzZXQnKT8ud29ybGQgfHwgZHJhZnQuc2VjdGlvbnNbMF0ud29ybGQpO1xuICAgIH0pfT5DcmVhdGUgV29ybGQgY2xpcDwvYnV0dG9uPjwvPjtcbiAgfVxuICBjb25zdCB3b3JsZCA9IHNlY3Rpb24ud29ybGQ7XG4gIGNvbnN0IHNoYXBlID0gQUJPVVRfTkFSUkFUSVZFX1NIQVBFX0RFRklOSVRJT05TW3dvcmxkLnNoYXBlSWRdO1xuICBjb25zdCB0cmFuc2l0aW9uTGltaXQgPSBnZXRBYm91dE5hcnJhdGl2ZVdvcmxkVHJhbnNpdGlvbkxpbWl0KHNuYXBzaG90LmNvbXBpbGVkUGxhbiwgc2VjdGlvbkluZGV4KTtcbiAgY29uc3QgdHJhbnNpdGlvbk1heCA9IE1hdGgubWF4KHRyYW5zaXRpb25MaW1pdCwgd29ybGQudHJhbnNpdGlvbkluLmVuZCwgMSk7XG4gIGNvbnN0IHRyYW5zaXRpb25FbmFibGVkID0gd29ybGQudHJhbnNpdGlvbkluLnR5cGUgIT09ICdjdXQnO1xuICBjb25zdCBjb3JyZXNwb25kZW5jZUVuYWJsZWQgPSBbJ21vcnBoJywgJ2Rpc3NvbHZlLW1vcnBoJ10uaW5jbHVkZXMod29ybGQudHJhbnNpdGlvbkluLnR5cGUpO1xuICBjb25zdCBwcmV2aW91c1dvcmxkU2VjdGlvbiA9IHNuYXBzaG90LmRvY3VtZW50LnNlY3Rpb25zXG4gICAgLnNsaWNlKDAsIHNlY3Rpb25JbmRleClcbiAgICAucmV2ZXJzZSgpXG4gICAgLmZpbmQoKGl0ZW0pID0+IGl0ZW0ud29ybGQubW9kZSA9PT0gJ3NldCcpO1xuICBjb25zdCBzb3VyY2VTaGFwZSA9IEFCT1VUX05BUlJBVElWRV9TSEFQRV9ERUZJTklUSU9OU1twcmV2aW91c1dvcmxkU2VjdGlvbj8ud29ybGQuc2hhcGVJZCB8fCB3b3JsZC5zaGFwZUlkXTtcbiAgY29uc3QgcHJlcGFyZWQgPSBydW50aW1lTWV0cmljcz8ucHJlcGFyZWRXb3JsZElkcz8uaW5jbHVkZXMoc2VjdGlvbi5pZCk7XG4gIGNvbnN0IGNvcnJlc3BvbmRlbmNlU3RhdHVzID0gcnVudGltZU1ldHJpY3M/LmNvcnJlc3BvbmRlbmNlU2VxdWVuY2VTdGF0ZSA9PT0gJ2ZhaWxlZCdcbiAgICA/ICdGYWlsZWQnXG4gICAgOiBydW50aW1lTWV0cmljcz8uY29ycmVzcG9uZGVuY2VTZXF1ZW5jZVN0YXRlID09PSAnbG9hZGluZydcbiAgICAgID8gJ1ByZXBhcmluZydcbiAgICAgIDogcHJlcGFyZWRcbiAgICAgICAgPyBydW50aW1lTWV0cmljcz8uY29ycmVzcG9uZGVuY2VGYWxsYmFjayAmJiBydW50aW1lTWV0cmljcz8uY29ycmVzcG9uZGVuY2VUb1dvcmxkSWQgPT09IHNlY3Rpb24uaWRcbiAgICAgICAgICA/ICdCYXNlbGluZSBmYWxsYmFjaydcbiAgICAgICAgICA6ICdSZWFkeSdcbiAgICAgICAgOiAnUHJlcGFyaW5nJztcbiAgY29uc3QgdXBkYXRlID0gKGxhYmVsLCBtdXRhdGUsIGNvYWxlc2NlS2V5ID0gbnVsbCkgPT4gc3RvcmUuY29tbWl0KGxhYmVsLCAoZHJhZnQpID0+IG11dGF0ZShkcmFmdC5zZWN0aW9uc1tzZWN0aW9uSW5kZXhdLndvcmxkKSwgeyBjb2FsZXNjZUtleSwgc2VsZWN0aW9uOiBzbmFwc2hvdC5zZWxlY3Rpb24gfSk7XG4gIGNvbnN0IHRyeVNoYXBlID0gKHNoYXBlSWQpID0+IHN0b3JlLmJlZ2luVHJ5KGBSZXBsYWNlIFNoYXBlIHdpdGggJHtBQk9VVF9OQVJSQVRJVkVfU0hBUEVfREVGSU5JVElPTlNbc2hhcGVJZF0ubGFiZWx9YCwgKGRyYWZ0KSA9PiB7XG4gICAgY29uc3QgdGFyZ2V0ID0gZHJhZnQuc2VjdGlvbnNbc2VjdGlvbkluZGV4XS53b3JsZDtcbiAgICB0YXJnZXQuc2hhcGVJZCA9IHNoYXBlSWQ7XG4gICAgdGFyZ2V0LnNoYXBlUGFyYW1ldGVycyA9IE9iamVjdC5mcm9tRW50cmllcyhBQk9VVF9OQVJSQVRJVkVfU0hBUEVfREVGSU5JVElPTlNbc2hhcGVJZF0ucGFyYW1ldGVycy5tYXAoKGNvbnRyb2wpID0+IFtjb250cm9sLmlkLCBjb250cm9sLmlkID09PSAnZGVuc2l0eScgPyAxIDogKGNvbnRyb2wubWluICsgY29udHJvbC5tYXgpIC8gMl0pKTtcbiAgfSk7XG4gIHJldHVybiAoXG4gICAgPD5cbiAgICAgIDxoZWFkZXI+PHNwYW4+V29ybGQgY2xpcDwvc3Bhbj48c3Ryb25nPntzaGFwZT8ubGFiZWwgfHwgd29ybGQuc2hhcGVJZH08L3N0cm9uZz48L2hlYWRlcj5cbiAgICAgIDxkaXYgY2xhc3NOYW1lPVwiYWJvdXQtZWRpdG9yLXNoYXBlLWNhdGFsb2dcIj5cbiAgICAgICAge09iamVjdC52YWx1ZXMoQUJPVVRfTkFSUkFUSVZFX1NIQVBFX0RFRklOSVRJT05TKS5tYXAoKGl0ZW0pID0+IChcbiAgICAgICAgICA8YnV0dG9uIHR5cGU9XCJidXR0b25cIiBrZXk9e2l0ZW0uaWR9IGRpc2FibGVkPXtzZWN0aW9uLmxvY2tlZH0gY2xhc3NOYW1lPXtpdGVtLmlkID09PSB3b3JsZC5zaGFwZUlkID8gJ2lzLXNlbGVjdGVkJyA6ICcnfSBvbkNsaWNrPXsoKSA9PiB0cnlTaGFwZShpdGVtLmlkKX0+XG4gICAgICAgICAgICA8aSAvPjxzcGFuPjxzdHJvbmc+e2l0ZW0ubGFiZWx9PC9zdHJvbmc+PHNtYWxsPkNvc3Qge2l0ZW0uY29zdH0gwrcgUG9pbnQgZmllbGQ8L3NtYWxsPjwvc3Bhbj5cbiAgICAgICAgICA8L2J1dHRvbj5cbiAgICAgICAgKSl9XG4gICAgICA8L2Rpdj5cbiAgICAgIHtzbmFwc2hvdC50cnlTdGF0ZSA/IDxkaXYgY2xhc3NOYW1lPVwiYWJvdXQtZWRpdG9yLXRyeVwiPjxzcGFuPlRyeWluZyB7c25hcHNob3QudHJ5U3RhdGUubGFiZWx9PC9zcGFuPjxidXR0b24gdHlwZT1cImJ1dHRvblwiIG9uQ2xpY2s9eygpID0+IHN0b3JlLmNhbmNlbFRyeSgpfT5DYW5jZWw8L2J1dHRvbj48YnV0dG9uIHR5cGU9XCJidXR0b25cIiBjbGFzc05hbWU9XCJpcy1wcmltYXJ5XCIgb25DbGljaz17KCkgPT4gc3RvcmUuYXBwbHlUcnkoKX0+QXBwbHk8L2J1dHRvbj48L2Rpdj4gOiBudWxsfVxuICAgICAgPGRldGFpbHMgb3Blbj48c3VtbWFyeT5TaGFwZSBwYXJhbWV0ZXJzPC9zdW1tYXJ5PlxuICAgICAgICB7KHNoYXBlPy5wYXJhbWV0ZXJzIHx8IFtdKS5tYXAoKGNvbnRyb2wpID0+IDxOdW1iZXJQcm9wZXJ0eSBrZXk9e2NvbnRyb2wuaWR9IGxhYmVsPXtjb250cm9sLmxhYmVsfSB2YWx1ZT17d29ybGQuc2hhcGVQYXJhbWV0ZXJzW2NvbnRyb2wuaWRdfSBtaW49e2NvbnRyb2wubWlufSBtYXg9e2NvbnRyb2wubWF4fSBzdGVwPXtjb250cm9sLnN0ZXB9IHVuaXQ9e2NvbnRyb2wudW5pdH0gb25DaGFuZ2U9eyh2YWx1ZSkgPT4gdXBkYXRlKGBDaGFuZ2UgJHtjb250cm9sLmxhYmVsfWAsIChkcmFmdCkgPT4geyBkcmFmdC5zaGFwZVBhcmFtZXRlcnNbY29udHJvbC5pZF0gPSB2YWx1ZTsgfSwgYHdvcmxkOiR7c2VjdGlvbi5pZH06JHtjb250cm9sLmlkfWApfSAvPil9XG4gICAgICAgIDxkaXYgY2xhc3NOYW1lPVwiYWJvdXQtZWRpdG9yLWlubGluZS1hY3Rpb25zXCI+PGJ1dHRvbiB0eXBlPVwiYnV0dG9uXCIgb25DbGljaz17KCkgPT4gdXBkYXRlKCdSZXNlZWQgU2hhcGUnLCAoZHJhZnQpID0+IHsgZHJhZnQuc2VlZCA9IE1hdGguZmxvb3IoTWF0aC5yYW5kb20oKSAqIDB4ZmZmZmZmZmYpOyB9KX0+UmVzZWVkPC9idXR0b24+PGNvZGU+e3dvcmxkLnNlZWR9PC9jb2RlPjwvZGl2PlxuICAgICAgPC9kZXRhaWxzPlxuICAgICAgPGRldGFpbHMgb3Blbj48c3VtbWFyeT5QbGFjZW1lbnQ8L3N1bW1hcnk+XG4gICAgICAgIDxOdW1iZXJQcm9wZXJ0eSBsYWJlbD1cIkRpc3RhbmNlIGF0IGVudHJ5XCIgdmFsdWU9e3dvcmxkLmVudHJ5RGlzdGFuY2VXVX0gbWluPXswLjJ9IG1heD17MTZ9IHN0ZXA9ezAuMDV9IHVuaXQ9XCJXVVwiIG9uQ2hhbmdlPXsodmFsdWUpID0+IHVwZGF0ZSgnTW92ZSBXb3JsZCcsIChkcmFmdCkgPT4geyBkcmFmdC5lbnRyeURpc3RhbmNlV1UgPSB2YWx1ZTsgfSwgYHdvcmxkOiR7c2VjdGlvbi5pZH06ZGlzdGFuY2VgKX0gLz5cbiAgICAgICAgPE51bWJlclByb3BlcnR5IGxhYmVsPVwiU2NhbGVcIiB2YWx1ZT17d29ybGQudHJhbnNmb3JtLnNjYWxlfSBtaW49ezAuMX0gbWF4PXszfSBzdGVwPXswLjAxfSBvbkNoYW5nZT17KHZhbHVlKSA9PiB1cGRhdGUoJ1NjYWxlIFdvcmxkJywgKGRyYWZ0KSA9PiB7IGRyYWZ0LnRyYW5zZm9ybS5zY2FsZSA9IHZhbHVlOyB9LCBgd29ybGQ6JHtzZWN0aW9uLmlkfTpzY2FsZWApfSAvPlxuICAgICAgPC9kZXRhaWxzPlxuICAgICAgPGRldGFpbHMgb3Blbj48c3VtbWFyeT5UcmFuc2l0aW9uIGluPC9zdW1tYXJ5PlxuICAgICAgICB7dHJhbnNpdGlvbkVuYWJsZWQgPyA8PlxuICAgICAgICAgIDxwIGNsYXNzTmFtZT1cImFib3V0LWVkaXRvci1oZWxwXCI+VGltaW5nIGlzIHJlbGF0aXZlIHRvIHRoaXMgU2VjdGlvbjogMSBpcyBpdHMgZW5kOyB2YWx1ZXMgYWJvdmUgMSBjb250aW51ZSBhY3Jvc3MgaW5oZXJpdGVkIFdvcmxkIFNlY3Rpb25zLiBUaGUgbmV4dCBXb3JsZCBiZWdpbnMgYXQge3RyYW5zaXRpb25MaW1pdC50b0ZpeGVkKDMpfS48L3A+XG4gICAgICAgICAgPE51bWJlclByb3BlcnR5IGxhYmVsPVwiU3RhcnRcIiB2YWx1ZT17d29ybGQudHJhbnNpdGlvbkluLnN0YXJ0fSBtaW49ezB9IG1heD17dHJhbnNpdGlvbk1heH0gc3RlcD17MC4wMDV9IHVuaXQ9XCLDlyBzZWN0aW9uXCIgb25DaGFuZ2U9eyh2YWx1ZSkgPT4gdXBkYXRlKCdDaGFuZ2UgdHJhbnNpdGlvbiBzdGFydCcsIChkcmFmdCkgPT4geyBkcmFmdC50cmFuc2l0aW9uSW4uc3RhcnQgPSBNYXRoLm1pbih2YWx1ZSwgZHJhZnQudHJhbnNpdGlvbkluLmVuZCk7IH0pfSAvPlxuICAgICAgICAgIDxOdW1iZXJQcm9wZXJ0eSBsYWJlbD1cIkVuZFwiIHZhbHVlPXt3b3JsZC50cmFuc2l0aW9uSW4uZW5kfSBtaW49ezB9IG1heD17dHJhbnNpdGlvbk1heH0gc3RlcD17MC4wMDV9IHVuaXQ9XCLDlyBzZWN0aW9uXCIgb25DaGFuZ2U9eyh2YWx1ZSkgPT4gdXBkYXRlKCdDaGFuZ2UgdHJhbnNpdGlvbiBlbmQnLCAoZHJhZnQpID0+IHsgZHJhZnQudHJhbnNpdGlvbkluLmVuZCA9IE1hdGgubWF4KHZhbHVlLCBkcmFmdC50cmFuc2l0aW9uSW4uc3RhcnQpOyB9KX0gLz5cbiAgICAgICAgICA8UHJvcGVydHkgbGFiZWw9XCJUeXBlXCI+PHNlbGVjdCB2YWx1ZT17d29ybGQudHJhbnNpdGlvbkluLnR5cGV9IG9uQ2hhbmdlPXsoZXZlbnQpID0+IHVwZGF0ZSgnQ2hhbmdlIHRyYW5zaXRpb24gdHlwZScsIChkcmFmdCkgPT4geyBkcmFmdC50cmFuc2l0aW9uSW4udHlwZSA9IGV2ZW50LnRhcmdldC52YWx1ZTsgfSl9PjxvcHRpb24gdmFsdWU9XCJtb3JwaFwiPk1vcnBoPC9vcHRpb24+PG9wdGlvbiB2YWx1ZT1cImRpc3NvbHZlLW1vcnBoXCI+RGlzc29sdmUgbW9ycGg8L29wdGlvbj48b3B0aW9uIHZhbHVlPVwiY3Jvc3NmYWRlXCI+Q3Jvc3NmYWRlPC9vcHRpb24+PG9wdGlvbiB2YWx1ZT1cImhvbGRcIj5Ib2xkPC9vcHRpb24+PC9zZWxlY3Q+PC9Qcm9wZXJ0eT5cbiAgICAgICAgICA8UHJvcGVydHkgbGFiZWw9XCJFYXNpbmdcIj48c2VsZWN0IHZhbHVlPXt3b3JsZC50cmFuc2l0aW9uSW4uZWFzaW5nfSBvbkNoYW5nZT17KGV2ZW50KSA9PiB1cGRhdGUoJ0NoYW5nZSB0cmFuc2l0aW9uIGVhc2luZycsIChkcmFmdCkgPT4geyBkcmFmdC50cmFuc2l0aW9uSW4uZWFzaW5nID0gZXZlbnQudGFyZ2V0LnZhbHVlOyB9KX0+PG9wdGlvbiB2YWx1ZT1cImxpbmVhclwiPkxpbmVhcjwvb3B0aW9uPjxvcHRpb24gdmFsdWU9XCJzbW9vdGhzdGVwXCI+U21vb3Roc3RlcDwvb3B0aW9uPjxvcHRpb24gdmFsdWU9XCJlYXNlLWluXCI+RWFzZSBpbjwvb3B0aW9uPjxvcHRpb24gdmFsdWU9XCJlYXNlLW91dFwiPkVhc2Ugb3V0PC9vcHRpb24+PG9wdGlvbiB2YWx1ZT1cImVhc2UtaW4tb3V0XCI+RWFzZSBpbiBvdXQ8L29wdGlvbj48b3B0aW9uIHZhbHVlPVwiaG9sZFwiPkhvbGQ8L29wdGlvbj48L3NlbGVjdD48L1Byb3BlcnR5PlxuICAgICAgICAgIDxwIGNsYXNzTmFtZT1cImFib3V0LWVkaXRvci1oZWxwXCI+TWFwcyB7c291cmNlU2hhcGU/LmxhYmVsIHx8ICdwcmV2aW91cyBTaGFwZSd9IOKGkiB7c2hhcGU/LmxhYmVsIHx8IHdvcmxkLnNoYXBlSWR9LjwvcD5cbiAgICAgICAgICA8UHJvcGVydHkgbGFiZWw9XCJDb3JyZXNwb25kZW5jZVwiPjxzZWxlY3QgYXJpYS1sYWJlbD1cIkNvcnJlc3BvbmRlbmNlXCIgdmFsdWU9e3dvcmxkLnRyYW5zaXRpb25Jbi5jb3JyZXNwb25kZW5jZX0gZGlzYWJsZWQ9eyFjb3JyZXNwb25kZW5jZUVuYWJsZWR9IHRpdGxlPXtjb3JyZXNwb25kZW5jZUVuYWJsZWQgPyAnQ2hvb3NlIGhvdyBzb3VyY2UgcG9pbnRzIGFyZSBhc3NpZ25lZCB0byB0YXJnZXQgcG9pbnRzLicgOiAnQ29ycmVzcG9uZGVuY2UgYXBwbGllcyB0byBNb3JwaCBhbmQgRGlzc29sdmUgbW9ycGggdHJhbnNpdGlvbnMuJ30gb25DaGFuZ2U9eyhldmVudCkgPT4gdXBkYXRlKCdDaGFuZ2UgY29ycmVzcG9uZGVuY2UnLCAoZHJhZnQpID0+IHsgZHJhZnQudHJhbnNpdGlvbkluLmNvcnJlc3BvbmRlbmNlID0gZXZlbnQudGFyZ2V0LnZhbHVlOyB9KX0+e0FCT1VUX05BUlJBVElWRV9DT1JSRVNQT05ERU5DRV9NT0RFUy5tYXAoKG1vZGUpID0+IDxvcHRpb24gdmFsdWU9e21vZGV9IGtleT17bW9kZX0+e0NPUlJFU1BPTkRFTkNFX0xBQkVMU1ttb2RlXSB8fCBtb2RlfTwvb3B0aW9uPil9PC9zZWxlY3Q+PC9Qcm9wZXJ0eT5cbiAgICAgICAgICA8cCBjbGFzc05hbWU9XCJhYm91dC1lZGl0b3ItaGVscFwiIHJvbGU9XCJzdGF0dXNcIiBhcmlhLWxpdmU9XCJwb2xpdGVcIj5Db3JyZXNwb25kZW5jZToge2NvcnJlc3BvbmRlbmNlU3RhdHVzfXtwcmVwYXJlZCAmJiBydW50aW1lTWV0cmljcz8uY29ycmVzcG9uZGVuY2VUb1dvcmxkSWQgPT09IHNlY3Rpb24uaWQgJiYgTnVtYmVyLmlzRmluaXRlKHJ1bnRpbWVNZXRyaWNzPy5jb3JyZXNwb25kZW5jZUltcHJvdmVtZW50KSA/IGAgwrcgJHtNYXRoLnJvdW5kKHJ1bnRpbWVNZXRyaWNzLmNvcnJlc3BvbmRlbmNlSW1wcm92ZW1lbnQgKiAxMDApfSUgUk1TIGltcHJvdmVtZW50YCA6ICcnfS48L3A+XG4gICAgICAgICAgPGJ1dHRvbiB0eXBlPVwiYnV0dG9uXCIgY2xhc3NOYW1lPVwiYWJvdXQtZWRpdG9yLWRhbmdlclwiIG9uQ2xpY2s9eygpID0+IHN0b3JlLmNvbW1pdCgnUmVtb3ZlIFdvcmxkIHRyYW5zaXRpb24nLCAoZHJhZnQpID0+IHtcbiAgICAgICAgICAgIGNvbnN0IHRyYW5zaXRpb24gPSBkcmFmdC5zZWN0aW9uc1tzZWN0aW9uSW5kZXhdLndvcmxkLnRyYW5zaXRpb25JbjtcbiAgICAgICAgICAgIHRyYW5zaXRpb24uc3RhcnQgPSAwO1xuICAgICAgICAgICAgdHJhbnNpdGlvbi5lbmQgPSAwO1xuICAgICAgICAgICAgdHJhbnNpdGlvbi50eXBlID0gJ2N1dCc7XG4gICAgICAgICAgfSwgeyBzZWxlY3Rpb246IHsgdHlwZTogJ3dvcmxkJywgc2VjdGlvbklkOiBzZWN0aW9uLmlkIH0gfSl9PlJlbW92ZSB0cmFuc2l0aW9uIGtleWZyYW1lczwvYnV0dG9uPlxuICAgICAgICA8Lz4gOiA8PlxuICAgICAgICAgIDxwIGNsYXNzTmFtZT1cImFib3V0LWVkaXRvci1oZWxwXCI+VGhpcyBXb3JsZCBjdXRzIGluIGF0IHRoZSBTZWN0aW9uIGJvdW5kYXJ5IGFuZCBoYXMgbm8gdHJhbnNpdGlvbiBrZXlmcmFtZXMuPC9wPlxuICAgICAgICAgIDxidXR0b24gdHlwZT1cImJ1dHRvblwiIGNsYXNzTmFtZT1cImFib3V0LWVkaXRvci13aWRlLWFjdGlvblwiIG9uQ2xpY2s9eygpID0+IHN0b3JlLmNvbW1pdCgnQWRkIFdvcmxkIHRyYW5zaXRpb24nLCAoZHJhZnQpID0+IHtcbiAgICAgICAgICAgIGNvbnN0IHRyYW5zaXRpb24gPSBkcmFmdC5zZWN0aW9uc1tzZWN0aW9uSW5kZXhdLndvcmxkLnRyYW5zaXRpb25JbjtcbiAgICAgICAgICAgIHRyYW5zaXRpb24uc3RhcnQgPSBNYXRoLm1pbigwLjA4LCB0cmFuc2l0aW9uTGltaXQpO1xuICAgICAgICAgICAgdHJhbnNpdGlvbi5lbmQgPSBNYXRoLm1pbigwLjY4LCB0cmFuc2l0aW9uTGltaXQpO1xuICAgICAgICAgICAgdHJhbnNpdGlvbi50eXBlID0gJ21vcnBoJztcbiAgICAgICAgICB9LCB7IHNlbGVjdGlvbjogeyB0eXBlOiAnd29ybGQnLCBzZWN0aW9uSWQ6IHNlY3Rpb24uaWQgfSB9KX0+QWRkIHRyYW5zaXRpb24ga2V5ZnJhbWVzPC9idXR0b24+XG4gICAgICAgIDwvPn1cbiAgICAgIDwvZGV0YWlscz5cbiAgICAgIDxkZXRhaWxzIG9wZW4+PHN1bW1hcnk+TW9kaWZpZXIgc3RhY2s8L3N1bW1hcnk+XG4gICAgICAgIHt3b3JsZC5tb2RpZmllcnMubWFwKChpdGVtLCBtb2RpZmllckluZGV4KSA9PiB7XG4gICAgICAgICAgY29uc3QgZGVmaW5pdGlvbiA9IEFCT1VUX05BUlJBVElWRV9NT0RJRklFUl9ERUZJTklUSU9OU1tpdGVtLmlkXTtcbiAgICAgICAgICBjb25zdCBtb3ZlTW9kaWZpZXIgPSAoZGlyZWN0aW9uKSA9PiB1cGRhdGUoJ1Jlb3JkZXIgbW9kaWZpZXInLCAoZHJhZnQpID0+IHtcbiAgICAgICAgICAgIGNvbnN0IG5leHRJbmRleCA9IG1vZGlmaWVySW5kZXggKyBkaXJlY3Rpb247XG4gICAgICAgICAgICBpZiAobmV4dEluZGV4IDwgMCB8fCBuZXh0SW5kZXggPj0gZHJhZnQubW9kaWZpZXJzLmxlbmd0aCkgcmV0dXJuO1xuICAgICAgICAgICAgY29uc3QgW21vdmVkXSA9IGRyYWZ0Lm1vZGlmaWVycy5zcGxpY2UobW9kaWZpZXJJbmRleCwgMSk7XG4gICAgICAgICAgICBkcmFmdC5tb2RpZmllcnMuc3BsaWNlKG5leHRJbmRleCwgMCwgbW92ZWQpO1xuICAgICAgICAgIH0pO1xuICAgICAgICAgIHJldHVybiA8ZGl2IGNsYXNzTmFtZT1cImFib3V0LWVkaXRvci1tb2RpZmllclwiIGtleT17YCR7aXRlbS5pZH0tJHttb2RpZmllckluZGV4fWB9PjxkaXY+PGxhYmVsPjxpbnB1dCB0eXBlPVwiY2hlY2tib3hcIiBjaGVja2VkPXtpdGVtLmVuYWJsZWR9IG9uQ2hhbmdlPXsoZXZlbnQpID0+IHVwZGF0ZShgVG9nZ2xlICR7ZGVmaW5pdGlvbj8ubGFiZWx9YCwgKGRyYWZ0KSA9PiB7IGRyYWZ0Lm1vZGlmaWVyc1ttb2RpZmllckluZGV4XS5lbmFibGVkID0gZXZlbnQudGFyZ2V0LmNoZWNrZWQ7IH0pfSAvPntkZWZpbml0aW9uPy5sYWJlbCB8fCBpdGVtLmlkfTwvbGFiZWw+PHNwYW4+PGJ1dHRvbiB0eXBlPVwiYnV0dG9uXCIgZGlzYWJsZWQ9e21vZGlmaWVySW5kZXggPT09IDB9IG9uQ2xpY2s9eygpID0+IG1vdmVNb2RpZmllcigtMSl9IGFyaWEtbGFiZWw9XCJNb3ZlIG1vZGlmaWVyIHVwXCI+4oaRPC9idXR0b24+PGJ1dHRvbiB0eXBlPVwiYnV0dG9uXCIgZGlzYWJsZWQ9e21vZGlmaWVySW5kZXggPT09IHdvcmxkLm1vZGlmaWVycy5sZW5ndGggLSAxfSBvbkNsaWNrPXsoKSA9PiBtb3ZlTW9kaWZpZXIoMSl9IGFyaWEtbGFiZWw9XCJNb3ZlIG1vZGlmaWVyIGRvd25cIj7ihpM8L2J1dHRvbj4gQ29zdCB7ZGVmaW5pdGlvbj8uY29zdCB8fCAnPyd9PC9zcGFuPjwvZGl2PnsoZGVmaW5pdGlvbj8ucGFyYW1ldGVycyB8fCBbXSkubWFwKChjb250cm9sKSA9PiBjb250cm9sLnR5cGUgPT09ICdyYW5nZScgPyA8TnVtYmVyUHJvcGVydHkga2V5PXtjb250cm9sLmlkfSBsYWJlbD17Y29udHJvbC5sYWJlbH0gdmFsdWU9e2l0ZW0ucGFyYW1ldGVyc1tjb250cm9sLmlkXX0gbWluPXtjb250cm9sLm1pbn0gbWF4PXtjb250cm9sLm1heH0gc3RlcD17Y29udHJvbC5zdGVwfSB1bml0PXtjb250cm9sLnVuaXR9IG9uQ2hhbmdlPXsodmFsdWUpID0+IHVwZGF0ZShgQ2hhbmdlICR7Y29udHJvbC5sYWJlbH1gLCAoZHJhZnQpID0+IHsgZHJhZnQubW9kaWZpZXJzW21vZGlmaWVySW5kZXhdLnBhcmFtZXRlcnNbY29udHJvbC5pZF0gPSB2YWx1ZTsgfSwgYG1vZGlmaWVyOiR7c2VjdGlvbi5pZH06JHttb2RpZmllckluZGV4fToke2NvbnRyb2wuaWR9YCl9IC8+IDogPFByb3BlcnR5IGtleT17Y29udHJvbC5pZH0gbGFiZWw9e2NvbnRyb2wubGFiZWx9PjxzZWxlY3QgdmFsdWU9e2l0ZW0ucGFyYW1ldGVyc1tjb250cm9sLmlkXX0gb25DaGFuZ2U9eyhldmVudCkgPT4gdXBkYXRlKGBDaGFuZ2UgJHtjb250cm9sLmxhYmVsfWAsIChkcmFmdCkgPT4geyBkcmFmdC5tb2RpZmllcnNbbW9kaWZpZXJJbmRleF0ucGFyYW1ldGVyc1tjb250cm9sLmlkXSA9IGV2ZW50LnRhcmdldC52YWx1ZTsgfSl9Pntjb250cm9sLm9wdGlvbnMubWFwKChvcHRpb24pID0+IDxvcHRpb24ga2V5PXtvcHRpb259PntvcHRpb259PC9vcHRpb24+KX08L3NlbGVjdD48L1Byb3BlcnR5Pil9PC9kaXY+O1xuICAgICAgICB9KX1cbiAgICAgIDwvZGV0YWlscz5cbiAgICA8Lz5cbiAgKTtcbn1cblxuZnVuY3Rpb24gRGlhZ25vc3RpY3MoeyBkaWFnbm9zdGljcyB9KSB7XG4gIGlmICghZGlhZ25vc3RpY3MubGVuZ3RoKSByZXR1cm4gPGRpdiBjbGFzc05hbWU9XCJhYm91dC1lZGl0b3ItZGlhZ25vc3RpY3MgaXMtY2xlYXJcIj48Q2hlY2sgYXJpYS1oaWRkZW49XCJ0cnVlXCIgLz4gTm8gZGlhZ25vc3RpY3M8L2Rpdj47XG4gIHJldHVybiA8ZGl2IGNsYXNzTmFtZT1cImFib3V0LWVkaXRvci1kaWFnbm9zdGljc1wiPntkaWFnbm9zdGljcy5tYXAoKGl0ZW0sIGluZGV4KSA9PiB7XG4gICAgY29uc3QgRGlhZ25vc3RpY0ljb24gPSBpdGVtLmxldmVsID09PSAnZXJyb3InID8gQ2lyY2xlQWxlcnQgOiBJbmZvO1xuICAgIHJldHVybiA8ZGl2IGtleT17YCR7aXRlbS5jb2RlfS0ke2l0ZW0ucGF0aH0tJHtpbmRleH1gfSBjbGFzc05hbWU9e2Bpcy0ke2l0ZW0ubGV2ZWx9YH0+PERpYWdub3N0aWNJY29uIGFyaWEtaGlkZGVuPVwidHJ1ZVwiIC8+PHNwYW4+PHN0cm9uZz57aXRlbS5tZXNzYWdlfTwvc3Ryb25nPjxzbWFsbD57aXRlbS5wYXRofTwvc21hbGw+PC9zcGFuPjwvZGl2PjtcbiAgfSl9PC9kaXY+O1xufVxuXG5mdW5jdGlvbiBBdWRpdGlvbkNvbnRyb2xzKHsgc3RvcmUsIHNuYXBzaG90IH0pIHtcbiAgY29uc3QgW3ByZVJvbGxXVSwgc2V0UHJlUm9sbFdVXSA9IHVzZVN0YXRlKDAuMTgpO1xuICBjb25zdCBbcG9zdFJvbGxXVSwgc2V0UG9zdFJvbGxXVV0gPSB1c2VTdGF0ZSgwLjE4KTtcbiAgY29uc3QgbWVtYmVycyA9IGdldEFib3V0TmFycmF0aXZlU2VsZWN0aW9uTWVtYmVycyhzbmFwc2hvdC5zZWxlY3Rpb24pO1xuICBjb25zdCBzb3VyY2UgPSBzbmFwc2hvdC5zZWxlY3Rpb24udHlwZSA9PT0gJ2N1ZSdcbiAgICA/IHsgdHlwZTogJ2N1ZS1ncm91cCcsIHNlY3Rpb25JZDogc25hcHNob3Quc2VsZWN0aW9uLnNlY3Rpb25JZCwgbWVtYmVycywgcHJpbWFyeTogc25hcHNob3Quc2VsZWN0aW9uIH1cbiAgICA6IFsnc2VjdGlvbicsICd3b3JsZCcsICdjYW1lcmEta2V5J10uaW5jbHVkZXMoc25hcHNob3Quc2VsZWN0aW9uLnR5cGUpXG4gICAgICA/IHNuYXBzaG90LnNlbGVjdGlvblxuICAgICAgOiBudWxsO1xuICBpZiAoIXNvdXJjZSkgcmV0dXJuIG51bGw7XG4gIGNvbnN0IHJhbmdlID0gZGVyaXZlQWJvdXROYXJyYXRpdmVMb29wUmFuZ2Uoe1xuICAgIGRvY3VtZW50OiBzbmFwc2hvdC5kb2N1bWVudCxcbiAgICBwbGFuOiBzbmFwc2hvdC5jb21waWxlZFBsYW4sXG4gICAgc291cmNlLFxuICAgIHByZVJvbGxXVSxcbiAgICBwb3N0Um9sbFdVLFxuICB9KTtcbiAgY29uc3QgYWN0aXZlID0gcmFuZ2UudmFsaWRcbiAgICAmJiBzbmFwc2hvdC50cmFuc3BvcnQubG9vcD8uc291cmNlVHlwZSA9PT0gcmFuZ2Uuc291cmNlVHlwZVxuICAgICYmIHNuYXBzaG90LnRyYW5zcG9ydC5sb29wPy5zb3VyY2VJZCA9PT0gcmFuZ2Uuc291cmNlSWQ7XG4gIGNvbnN0IHRvZ2dsZSA9ICgpID0+IHtcbiAgICBpZiAoYWN0aXZlKSB7XG4gICAgICBzdG9yZS5zZXRUcmFuc3BvcnQoeyBvd25lcjogJ3RpbWVsaW5lJywgcGxheWluZzogZmFsc2UsIGxvb3A6IG51bGwgfSk7XG4gICAgICByZXR1cm47XG4gICAgfVxuICAgIGlmICghcmFuZ2UudmFsaWQpIHJldHVybjtcbiAgICBzdG9yZS5zZXRUcmFuc3BvcnQoe1xuICAgICAgb3duZXI6ICdwbGF5YmFjaycsXG4gICAgICBwbGF5aW5nOiB0cnVlLFxuICAgICAgbGl2ZUFtYmllbnQ6IGZhbHNlLFxuICAgICAgc3RvcnlXVTogcmFuZ2Uuc3RhcnRXVSxcbiAgICAgIGxvb3A6IHJhbmdlLFxuICAgIH0pO1xuICB9O1xuICByZXR1cm4gKFxuICAgIDxkZXRhaWxzIGNsYXNzTmFtZT1cImFib3V0LWVkaXRvci1hdWRpdGlvblwiPlxuICAgICAgPHN1bW1hcnk+Qm91bmRhcnkgYXVkaXRpb248L3N1bW1hcnk+XG4gICAgICA8ZGl2IGNsYXNzTmFtZT1cImFib3V0LWVkaXRvci1hdWRpdGlvbi1yYW5nZVwiPlxuICAgICAgICA8UHJvcGVydHkgbGFiZWw9XCJQcmUtcm9sbFwiPjxpbnB1dCB0eXBlPVwibnVtYmVyXCIgbWluPVwiMFwiIG1heD1cIjJcIiBzdGVwPVwiMC4wNVwiIHZhbHVlPXtwcmVSb2xsV1V9IG9uQ2hhbmdlPXsoZXZlbnQpID0+IHNldFByZVJvbGxXVShNYXRoLm1heCgwLCBOdW1iZXIoZXZlbnQudGFyZ2V0LnZhbHVlKSB8fCAwKSl9IC8+PC9Qcm9wZXJ0eT5cbiAgICAgICAgPFByb3BlcnR5IGxhYmVsPVwiUG9zdC1yb2xsXCI+PGlucHV0IHR5cGU9XCJudW1iZXJcIiBtaW49XCIwXCIgbWF4PVwiMlwiIHN0ZXA9XCIwLjA1XCIgdmFsdWU9e3Bvc3RSb2xsV1V9IG9uQ2hhbmdlPXsoZXZlbnQpID0+IHNldFBvc3RSb2xsV1UoTWF0aC5tYXgoMCwgTnVtYmVyKGV2ZW50LnRhcmdldC52YWx1ZSkgfHwgMCkpfSAvPjwvUHJvcGVydHk+XG4gICAgICA8L2Rpdj5cbiAgICAgIHtyYW5nZS52YWxpZCA/IDxwIGNsYXNzTmFtZT1cImFib3V0LWVkaXRvci1oZWxwXCI+e2Zvcm1hdFdVKHJhbmdlLnN0YXJ0V1UpfSDihpIge2Zvcm1hdFdVKHJhbmdlLmVuZFdVKX0gwrcgYW1iaWVudCBtb3Rpb24gZnJlZXplcyBmb3IgYSByZXBlYXRhYmxlIHJldmlldy48L3A+IDogPHAgY2xhc3NOYW1lPVwiYWJvdXQtZWRpdG9yLXJoeXRobS1tZXNzYWdlIGlzLWVycm9yXCI+e3JhbmdlLnJlYXNvbn08L3A+fVxuICAgICAgPGJ1dHRvbiB0eXBlPVwiYnV0dG9uXCIgY2xhc3NOYW1lPXthY3RpdmUgPyAnaXMtYWN0aXZlIGFib3V0LWVkaXRvci13aWRlLWFjdGlvbicgOiAnYWJvdXQtZWRpdG9yLXdpZGUtYWN0aW9uJ30gZGlzYWJsZWQ9eyFyYW5nZS52YWxpZH0gb25DbGljaz17dG9nZ2xlfT57YWN0aXZlID8gJ1N0b3AgYXVkaXRpb24nIDogJ0xvb3AgdGhpcyBzZWxlY3Rpb24nfTwvYnV0dG9uPlxuICAgIDwvZGV0YWlscz5cbiAgKTtcbn1cblxuZnVuY3Rpb24gSW5zcGVjdG9yKHsgc3RvcmUsIHNuYXBzaG90LCB0aW1lbGluZU9wZW4sIHJ1bnRpbWVNZXRyaWNzLCBjbGlwYm9hcmQsIHNldENsaXBib2FyZCB9KSB7XG4gIGNvbnN0IGluc3BlY3RvclJlZiA9IHVzZVJlZihudWxsKTtcbiAgY29uc3QgZHJhZ1JlZiA9IHVzZVJlZihudWxsKTtcbiAgY29uc3QgbGFzdEhlYWRlckNsaWNrUmVmID0gdXNlUmVmKG51bGwpO1xuICBjb25zdCBbcG9zaXRpb24sIHNldFBvc2l0aW9uXSA9IHVzZVN0YXRlKG51bGwpO1xuICBjb25zdCBbZHJhZ2dpbmcsIHNldERyYWdnaW5nXSA9IHVzZVN0YXRlKGZhbHNlKTtcbiAgY29uc3Qgc2VjdGlvbiA9IGdldFNlY3Rpb24oc25hcHNob3QuZG9jdW1lbnQsIHNuYXBzaG90LnNlbGVjdGlvbik7XG4gIGxldCBjb250ZW50ID0gPFNlY3Rpb25JbnNwZWN0b3Igc3RvcmU9e3N0b3JlfSBzbmFwc2hvdD17c25hcHNob3R9IHNlY3Rpb249e3NlY3Rpb259IC8+O1xuICBpZiAoc25hcHNob3Quc2VsZWN0aW9uLnR5cGUgPT09ICdzZXF1ZW5jZScpIGNvbnRlbnQgPSA8U2VxdWVuY2VJbnNwZWN0b3Igc3RvcmU9e3N0b3JlfSBzbmFwc2hvdD17c25hcHNob3R9IC8+O1xuICBpZiAoc25hcHNob3Quc2VsZWN0aW9uLnR5cGUgPT09ICdjdWUnKSBjb250ZW50ID0gPEN1ZUluc3BlY3RvciBzdG9yZT17c3RvcmV9IHNuYXBzaG90PXtzbmFwc2hvdH0gc2VjdGlvbj17c2VjdGlvbn0gY2xpcGJvYXJkPXtjbGlwYm9hcmR9IHNldENsaXBib2FyZD17c2V0Q2xpcGJvYXJkfSAvPjtcbiAgaWYgKHNuYXBzaG90LnNlbGVjdGlvbi50eXBlID09PSAnZGlzY2lwbGluZS1yZXZlYWwnKSBjb250ZW50ID0gPERpc2NpcGxpbmVSZXZlYWxJbnNwZWN0b3Igc3RvcmU9e3N0b3JlfSBzbmFwc2hvdD17c25hcHNob3R9IHNlY3Rpb249e3NlY3Rpb259IC8+O1xuICBpZiAoc25hcHNob3Quc2VsZWN0aW9uLnR5cGUgPT09ICdjYW1lcmEta2V5JykgY29udGVudCA9IDxDYW1lcmFJbnNwZWN0b3Igc3RvcmU9e3N0b3JlfSBzbmFwc2hvdD17c25hcHNob3R9IHNlY3Rpb249e3NlY3Rpb259IC8+O1xuICBpZiAoc25hcHNob3Quc2VsZWN0aW9uLnR5cGUgPT09ICd3b3JsZCcpIGNvbnRlbnQgPSA8V29ybGRJbnNwZWN0b3Igc3RvcmU9e3N0b3JlfSBzbmFwc2hvdD17c25hcHNob3R9IHNlY3Rpb249e3NlY3Rpb259IHJ1bnRpbWVNZXRyaWNzPXtydW50aW1lTWV0cmljc30gLz47XG4gIGlmIChzbmFwc2hvdC5zZWxlY3Rpb24udHlwZSA9PT0gJ2ludGVyYWN0aW9uJykgY29udGVudCA9IDxTZWN0aW9uSW5zcGVjdG9yIHN0b3JlPXtzdG9yZX0gc25hcHNob3Q9e3NuYXBzaG90fSBzZWN0aW9uPXtzZWN0aW9ufSAvPjtcblxuICB1c2VFZmZlY3QoKCkgPT4ge1xuICAgIGNvbnN0IGtlZXBJbkJvdW5kcyA9ICgpID0+IHtcbiAgICAgIGlmICh3aW5kb3cuaW5uZXJXaWR0aCA8IDc2MCkge1xuICAgICAgICBzZXRQb3NpdGlvbihudWxsKTtcbiAgICAgICAgcmV0dXJuO1xuICAgICAgfVxuICAgICAgc2V0UG9zaXRpb24oKGN1cnJlbnQpID0+IChcbiAgICAgICAgY3VycmVudCAmJiBpbnNwZWN0b3JSZWYuY3VycmVudFxuICAgICAgICAgID8gY2xhbXBJbnNwZWN0b3JQb3NpdGlvbihpbnNwZWN0b3JSZWYuY3VycmVudCwgY3VycmVudCwgdGltZWxpbmVPcGVuKVxuICAgICAgICAgIDogY3VycmVudFxuICAgICAgKSk7XG4gICAgfTtcbiAgICBrZWVwSW5Cb3VuZHMoKTtcbiAgICB3aW5kb3cuYWRkRXZlbnRMaXN0ZW5lcigncmVzaXplJywga2VlcEluQm91bmRzKTtcbiAgICByZXR1cm4gKCkgPT4gd2luZG93LnJlbW92ZUV2ZW50TGlzdGVuZXIoJ3Jlc2l6ZScsIGtlZXBJbkJvdW5kcyk7XG4gIH0sIFt0aW1lbGluZU9wZW5dKTtcblxuICBjb25zdCBiZWdpbkRyYWcgPSAoZXZlbnQpID0+IHtcbiAgICBpZiAoZXZlbnQuYnV0dG9uICE9PSAwIHx8IHdpbmRvdy5pbm5lcldpZHRoIDwgNzYwIHx8ICFldmVudC50YXJnZXQuY2xvc2VzdCgnaGVhZGVyJykpIHJldHVybjtcbiAgICBjb25zdCBpbnNwZWN0b3IgPSBpbnNwZWN0b3JSZWYuY3VycmVudDtcbiAgICBpZiAoIWluc3BlY3RvcikgcmV0dXJuO1xuICAgIGNvbnN0IHJlY3QgPSBpbnNwZWN0b3IuZ2V0Qm91bmRpbmdDbGllbnRSZWN0KCk7XG4gICAgY29uc3QgeyBtaW5Ub3AsIG1heEJvdHRvbSB9ID0gZ2V0SW5zcGVjdG9yVmVydGljYWxCb3VuZHMoaW5zcGVjdG9yLCB0aW1lbGluZU9wZW4pO1xuICAgIGNvbnN0IGF2YWlsYWJsZUhlaWdodCA9IG1heEJvdHRvbSAtIG1pblRvcDtcbiAgICBjb25zdCBmbG9hdGluZ0hlaWdodCA9IE1hdGgubWluKHJlY3QuaGVpZ2h0LCA1NjAsIE1hdGgubWF4KDI0MCwgYXZhaWxhYmxlSGVpZ2h0ICogMC43MikpO1xuICAgIGNvbnN0IHN0YXJ0ID0gY2xhbXBJbnNwZWN0b3JQb3NpdGlvbihpbnNwZWN0b3IsIHtcbiAgICAgIGxlZnQ6IHJlY3QubGVmdCxcbiAgICAgIHRvcDogcmVjdC50b3AsXG4gICAgICB3aWR0aDogcmVjdC53aWR0aCxcbiAgICAgIGhlaWdodDogZmxvYXRpbmdIZWlnaHQsXG4gICAgfSwgdGltZWxpbmVPcGVuKTtcbiAgICBkcmFnUmVmLmN1cnJlbnQgPSB7XG4gICAgICBwb2ludGVySWQ6IGV2ZW50LnBvaW50ZXJJZCxcbiAgICAgIG9yaWdpblg6IGV2ZW50LmNsaWVudFgsXG4gICAgICBvcmlnaW5ZOiBldmVudC5jbGllbnRZLFxuICAgICAgc3RhcnQsXG4gICAgICBtb3ZlZDogZmFsc2UsXG4gICAgfTtcbiAgICBpbnNwZWN0b3Iuc2V0UG9pbnRlckNhcHR1cmUoZXZlbnQucG9pbnRlcklkKTtcbiAgfTtcblxuICBjb25zdCBtb3ZlRHJhZyA9IChldmVudCkgPT4ge1xuICAgIGNvbnN0IGRyYWcgPSBkcmFnUmVmLmN1cnJlbnQ7XG4gICAgY29uc3QgaW5zcGVjdG9yID0gaW5zcGVjdG9yUmVmLmN1cnJlbnQ7XG4gICAgaWYgKCFkcmFnIHx8ICFpbnNwZWN0b3IgfHwgZHJhZy5wb2ludGVySWQgIT09IGV2ZW50LnBvaW50ZXJJZCkgcmV0dXJuO1xuICAgIGNvbnN0IGRlbHRhWCA9IGV2ZW50LmNsaWVudFggLSBkcmFnLm9yaWdpblg7XG4gICAgY29uc3QgZGVsdGFZID0gZXZlbnQuY2xpZW50WSAtIGRyYWcub3JpZ2luWTtcbiAgICBpZiAoIWRyYWcubW92ZWQgJiYgTWF0aC5oeXBvdChkZWx0YVgsIGRlbHRhWSkgPCAzKSByZXR1cm47XG4gICAgZHJhZy5tb3ZlZCA9IHRydWU7XG4gICAgc2V0RHJhZ2dpbmcodHJ1ZSk7XG4gICAgc2V0UG9zaXRpb24oY2xhbXBJbnNwZWN0b3JQb3NpdGlvbihpbnNwZWN0b3IsIHtcbiAgICAgIC4uLmRyYWcuc3RhcnQsXG4gICAgICBsZWZ0OiBkcmFnLnN0YXJ0LmxlZnQgKyBkZWx0YVgsXG4gICAgICB0b3A6IGRyYWcuc3RhcnQudG9wICsgZGVsdGFZLFxuICAgIH0sIHRpbWVsaW5lT3BlbikpO1xuICB9O1xuXG4gIGNvbnN0IGVuZERyYWcgPSAoZXZlbnQpID0+IHtcbiAgICBjb25zdCBkcmFnID0gZHJhZ1JlZi5jdXJyZW50O1xuICAgIGlmIChkcmFnPy5wb2ludGVySWQgIT09IGV2ZW50LnBvaW50ZXJJZCkgcmV0dXJuO1xuICAgIGlmICghZHJhZy5tb3ZlZCkge1xuICAgICAgY29uc3Qgbm93ID0gcGVyZm9ybWFuY2Uubm93KCk7XG4gICAgICBjb25zdCBwcmV2aW91cyA9IGxhc3RIZWFkZXJDbGlja1JlZi5jdXJyZW50O1xuICAgICAgaWYgKHByZXZpb3VzICYmIG5vdyAtIHByZXZpb3VzLnRpbWUgPCAzNjBcbiAgICAgICAgJiYgTWF0aC5oeXBvdChldmVudC5jbGllbnRYIC0gcHJldmlvdXMueCwgZXZlbnQuY2xpZW50WSAtIHByZXZpb3VzLnkpIDwgNikge1xuICAgICAgICBzZXRQb3NpdGlvbihudWxsKTtcbiAgICAgICAgbGFzdEhlYWRlckNsaWNrUmVmLmN1cnJlbnQgPSBudWxsO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgbGFzdEhlYWRlckNsaWNrUmVmLmN1cnJlbnQgPSB7IHRpbWU6IG5vdywgeDogZXZlbnQuY2xpZW50WCwgeTogZXZlbnQuY2xpZW50WSB9O1xuICAgICAgfVxuICAgIH1cbiAgICBkcmFnUmVmLmN1cnJlbnQgPSBudWxsO1xuICAgIHNldERyYWdnaW5nKGZhbHNlKTtcbiAgICBpZiAoaW5zcGVjdG9yUmVmLmN1cnJlbnQ/Lmhhc1BvaW50ZXJDYXB0dXJlKGV2ZW50LnBvaW50ZXJJZCkpIHtcbiAgICAgIGluc3BlY3RvclJlZi5jdXJyZW50LnJlbGVhc2VQb2ludGVyQ2FwdHVyZShldmVudC5wb2ludGVySWQpO1xuICAgIH1cbiAgfTtcblxuICBjb25zdCByZXNldFBvc2l0aW9uID0gKCkgPT4gc2V0UG9zaXRpb24obnVsbCk7XG5cbiAgcmV0dXJuIChcbiAgICA8YXNpZGVcbiAgICAgIHJlZj17aW5zcGVjdG9yUmVmfVxuICAgICAgY2xhc3NOYW1lPXtgYWJvdXQtZWRpdG9yLWluc3BlY3RvciR7ZHJhZ2dpbmcgPyAnIGlzLWRyYWdnaW5nJyA6ICcnfWB9XG4gICAgICBkYXRhLWZsb2F0aW5nPXtwb3NpdGlvbiA/ICd0cnVlJyA6ICdmYWxzZSd9XG4gICAgICBzdHlsZT17cG9zaXRpb24gPyB7XG4gICAgICAgIGxlZnQ6IHBvc2l0aW9uLmxlZnQsXG4gICAgICAgIHRvcDogcG9zaXRpb24udG9wLFxuICAgICAgICByaWdodDogJ2F1dG8nLFxuICAgICAgICBib3R0b206ICdhdXRvJyxcbiAgICAgICAgd2lkdGg6IHBvc2l0aW9uLndpZHRoLFxuICAgICAgICBoZWlnaHQ6IHBvc2l0aW9uLmhlaWdodCxcbiAgICAgIH0gOiB1bmRlZmluZWR9XG4gICAgICBvblBvaW50ZXJEb3duPXtiZWdpbkRyYWd9XG4gICAgICBvblBvaW50ZXJNb3ZlPXttb3ZlRHJhZ31cbiAgICAgIG9uUG9pbnRlclVwPXtlbmREcmFnfVxuICAgICAgb25Qb2ludGVyQ2FuY2VsPXtlbmREcmFnfVxuICAgICAgb25Eb3VibGVDbGljaz17cmVzZXRQb3NpdGlvbn1cbiAgICA+PGRpdiBjbGFzc05hbWU9XCJhYm91dC1lZGl0b3ItaW5zcGVjdG9yLXNjcm9sbFwiPntjb250ZW50fTxBdWRpdGlvbkNvbnRyb2xzIHN0b3JlPXtzdG9yZX0gc25hcHNob3Q9e3NuYXBzaG90fSAvPjxEaWFnbm9zdGljcyBkaWFnbm9zdGljcz17c25hcHNob3QuZGlhZ25vc3RpY3N9IC8+PC9kaXY+PC9hc2lkZT5cbiAgKTtcbn1cblxuZnVuY3Rpb24gQ2FtZXJhUGF0aE92ZXJsYXkoeyBzbmFwc2hvdCB9KSB7XG4gIGNvbnN0IHNlY3Rpb25zID0gc25hcHNob3QuY29tcGlsZWRQbGFuPy5zZWN0aW9ucyB8fCBbXTtcbiAgY29uc3QgdG90YWwgPSBzbmFwc2hvdC5jb21waWxlZFBsYW4/Lm1heFN0b3J5V1UgfHwgMTtcbiAgcmV0dXJuIChcbiAgICA8ZGl2IGNsYXNzTmFtZT1cImFib3V0LWVkaXRvci1wYXRoLW92ZXJsYXlcIiBhcmlhLWxhYmVsPVwiQ2FtZXJhIHBhdGggb3ZlcmxheVwiPlxuICAgICAgPGRpdj48c3Ryb25nPlBhdGggwrcgY29uc3RhbnQgY2FkZW5jZTwvc3Ryb25nPjxzcGFuPntmb3JtYXRXVShzbmFwc2hvdC50cmFuc3BvcnQuc3RvcnlXVSl9IC8ge2Zvcm1hdFdVKHRvdGFsKX08L3NwYW4+PC9kaXY+XG4gICAgICA8c3ZnIHZpZXdCb3g9XCIwIDAgMjQwIDExMlwiIHJvbGU9XCJpbWdcIiBhcmlhLWxhYmVsPVwiQ2FtZXJhIGFuZCBXb3JsZCBhbmNob3JzIG92ZXIgc3RvcnkgZGlzdGFuY2VcIj5cbiAgICAgICAgPHBhdGggZD1cIk0xOCA1NiBIMjIyXCIgLz5cbiAgICAgICAge3NlY3Rpb25zLm1hcCgoc2VjdGlvbikgPT4ge1xuICAgICAgICAgIGNvbnN0IHggPSAxOCArICgoc2VjdGlvbi5zdGFydFdVIC8gdG90YWwpICogMjA0KTtcbiAgICAgICAgICByZXR1cm4gPGcga2V5PXtzZWN0aW9uLmlkfSB0cmFuc2Zvcm09e2B0cmFuc2xhdGUoJHt4fSA1NilgfT48bGluZSB5MT1cIi0xMlwiIHkyPVwiMTJcIiAvPjxjaXJjbGUgcj17c2VjdGlvbi53b3JsZFN0YXRlPy5jaGFuZ2VzV29ybGQgPyA0IDogMn0gLz48dGl0bGU+e3NlY3Rpb24ubGFiZWx9e3NlY3Rpb24ud29ybGRTdGF0ZT8uY2hhbmdlc1dvcmxkID8gYCDCtyAke3NlY3Rpb24ud29ybGRTdGF0ZS5hY3RpdmVXb3JsZC5zaGFwZUlkfWAgOiAnJ308L3RpdGxlPjwvZz47XG4gICAgICAgIH0pfVxuICAgICAgICA8ZyBjbGFzc05hbWU9XCJpcy1wbGF5aGVhZFwiIHRyYW5zZm9ybT17YHRyYW5zbGF0ZSgkezE4ICsgKChzbmFwc2hvdC50cmFuc3BvcnQuc3RvcnlXVSAvIHRvdGFsKSAqIDIwNCl9IDU2KWB9PjxwYXRoIGQ9XCJNMCAtMjIgTDUgLTE1IEgtNSBaXCIgLz48bGluZSB5MT1cIi0xNVwiIHkyPVwiMjJcIiAvPjwvZz5cbiAgICAgIDwvc3ZnPlxuICAgICAgPHNtYWxsPkRvdHMgYXJlIFNlY3Rpb24gYm91bmRhcmllcy4gTGFyZ2UgZG90cyBhcmUgZml4ZWQgV29ybGQgYW5jaG9ycy4gVGhlIG1hcmtlciBpcyB0aGUgcHVibGlzaGVkIGNhbWVyYS48L3NtYWxsPlxuICAgIDwvZGl2PlxuICApO1xufVxuXG5leHBvcnQgZGVmYXVsdCBmdW5jdGlvbiBBYm91dE5hcnJhdGl2ZUVkaXRvcih7IHN0b3JlLCBydW50aW1lUmVmLCByb290UmVmIH0pIHtcbiAgY29uc3Qgc25hcHNob3QgPSB1c2VTeW5jRXh0ZXJuYWxTdG9yZShzdG9yZS5zdWJzY3JpYmUsIHN0b3JlLmdldFNuYXBzaG90KTtcbiAgY29uc3QgW2NoZWNrcG9pbnRzLCBzZXRDaGVja3BvaW50c10gPSB1c2VTdGF0ZSgoKSA9PiByZWFkQWJvdXROYXJyYXRpdmVDaGVja3BvaW50cygpKTtcbiAgY29uc3QgW2NsaXBib2FyZCwgc2V0Q2xpcGJvYXJkXSA9IHVzZVN0YXRlKG51bGwpO1xuICBjb25zdCBbcnVudGltZU1ldHJpY3MsIHNldFJ1bnRpbWVNZXRyaWNzXSA9IHVzZVN0YXRlKG51bGwpO1xuICBjb25zdCBbcGF0aFZpc2libGUsIHNldFBhdGhWaXNpYmxlXSA9IHVzZVN0YXRlKGZhbHNlKTtcbiAgY29uc3QgW2RpcmVjdG9yVmlldywgc2V0RGlyZWN0b3JWaWV3XSA9IHVzZVN0YXRlKGZhbHNlKTtcbiAgY29uc3QgW21vYmlsZVBhbmUsIHNldE1vYmlsZVBhbmVdID0gdXNlU3RhdGUoJ3NlcXVlbmNlJyk7XG4gIGNvbnN0IFt0aW1lbGluZU9wZW4sIHNldFRpbWVsaW5lT3Blbl0gPSB1c2VTdGF0ZSgoKSA9PiAoXG4gICAgd2luZG93LmxvY2FsU3RvcmFnZS5nZXRJdGVtKEFCT1VUX0VESVRPUl9USU1FTElORV9TVE9SQUdFX0tFWSkgIT09ICdjbG9zZWQnXG4gICkpO1xuICBjb25zdCBpbXBvcnRSZWYgPSB1c2VSZWYobnVsbCk7XG4gIGNvbnN0IHNuYXBzaG90UmVmID0gdXNlUmVmKHNuYXBzaG90KTtcbiAgY29uc3QgYWN0aXZlU2VsZWN0aW9uID0gc25hcHNob3Quc2VsZWN0aW9uO1xuXG4gIHVzZUVmZmVjdCgoKSA9PiB7XG4gICAgc25hcHNob3RSZWYuY3VycmVudCA9IHNuYXBzaG90O1xuICB9LCBbc25hcHNob3RdKTtcblxuICB1c2VFZmZlY3QoKCkgPT4ge1xuICAgIHdpbmRvdy5sb2NhbFN0b3JhZ2Uuc2V0SXRlbShBQk9VVF9FRElUT1JfVElNRUxJTkVfU1RPUkFHRV9LRVksIHRpbWVsaW5lT3BlbiA/ICdvcGVuJyA6ICdjbG9zZWQnKTtcbiAgfSwgW3RpbWVsaW5lT3Blbl0pO1xuXG4gIHVzZUVmZmVjdCgoKSA9PiB7XG4gICAgY29uc3Qgcm9vdCA9IHJvb3RSZWYuY3VycmVudDtcbiAgICBjb25zdCBydW50aW1lID0gcnVudGltZVJlZi5jdXJyZW50O1xuICAgIHJvb3Q/LnNldEF0dHJpYnV0ZSgnZGF0YS1lZGl0b3ItYWN0aXZlJywgJ3RydWUnKTtcbiAgICBsb2FkQWJvdXROYXJyYXRpdmVTb3VyY2UoKS50aGVuKCh7IGRvY3VtZW50LCBoYXNoIH0pID0+IHtcbiAgICAgIGNvbnN0IGN1cnJlbnQgPSBzdG9yZS5nZXRTbmFwc2hvdCgpO1xuICAgICAgaWYgKCFjdXJyZW50LmRpcnR5KSBzdG9yZS5yZXBsYWNlRG9jdW1lbnQoJ1JlZnJlc2ggY2Fub25pY2FsIHNvdXJjZScsIGRvY3VtZW50KTtcbiAgICAgIHN0b3JlLnNldEJhc2VsaW5lKGRvY3VtZW50LCBoYXNoKTtcbiAgICAgIGNvbnN0IHJlY292ZXJ5ID0gcmVhZEFib3V0TmFycmF0aXZlUmVjb3ZlcnlEcmFmdCgpO1xuICAgICAgaWYgKHJlY292ZXJ5ICYmIHJlY292ZXJ5LnRpbWVzdGFtcCA+IERhdGUubm93KCkgLSAoMTQgKiA4NjQwMDAwMCkpIHtcbiAgICAgICAgc3RvcmUuc2V0UmVjb3ZlcnlTdGF0ZSh7IGF2YWlsYWJsZTogdHJ1ZSwgZHJhZnQ6IHJlY292ZXJ5LCBlcnJvcjogJycgfSk7XG4gICAgICB9XG4gICAgfSkuY2F0Y2goKGVycm9yKSA9PiBzdG9yZS5zZXRTYXZlU3RhdGUoeyBzdGF0dXM6ICdmYWlsZWQnLCBtZXNzYWdlOiBlcnJvci5tZXNzYWdlIH0pKTtcbiAgICByZXR1cm4gKCkgPT4ge1xuICAgICAgcm9vdD8ucmVtb3ZlQXR0cmlidXRlKCdkYXRhLWVkaXRvci1hY3RpdmUnKTtcbiAgICAgIHJ1bnRpbWU/LnNldERpcmVjdG9yVmlldz8uKGZhbHNlKTtcbiAgICB9O1xuICB9LCBbcm9vdFJlZiwgcnVudGltZVJlZiwgc3RvcmVdKTtcblxuICB1c2VFZmZlY3QoKCkgPT4ge1xuICAgIGNvbnN0IHJvb3QgPSByb290UmVmLmN1cnJlbnQ7XG4gICAgaWYgKCFyb290KSByZXR1cm4gdW5kZWZpbmVkO1xuICAgIHJvb3QucXVlcnlTZWxlY3RvckFsbCgnLmlzLWVkaXRvci1zZWxlY3RlZCcpLmZvckVhY2goKG5vZGUpID0+IG5vZGUuY2xhc3NMaXN0LnJlbW92ZSgnaXMtZWRpdG9yLXNlbGVjdGVkJykpO1xuICAgIGdldEFib3V0TmFycmF0aXZlU2VsZWN0aW9uTWVtYmVycyhhY3RpdmVTZWxlY3Rpb24pLmZvckVhY2goKG1lbWJlcikgPT4ge1xuICAgICAgcm9vdC5xdWVyeVNlbGVjdG9yKGBbZGF0YS10ZXh0LWN1ZT1cIiR7Q1NTLmVzY2FwZShtZW1iZXIuY3VlSWQpfVwiXWApPy5jbGFzc0xpc3QuYWRkKCdpcy1lZGl0b3Itc2VsZWN0ZWQnKTtcbiAgICB9KTtcbiAgICByb290LmRhdGFzZXQuZWRpdG9yU2VsZWN0aW9uVHlwZSA9IGFjdGl2ZVNlbGVjdGlvbi50eXBlIHx8ICcnO1xuICAgIHJldHVybiAoKSA9PiB7XG4gICAgICByb290LnF1ZXJ5U2VsZWN0b3JBbGwoJy5pcy1lZGl0b3Itc2VsZWN0ZWQnKS5mb3JFYWNoKChub2RlKSA9PiBub2RlLmNsYXNzTGlzdC5yZW1vdmUoJ2lzLWVkaXRvci1zZWxlY3RlZCcpKTtcbiAgICAgIGRlbGV0ZSByb290LmRhdGFzZXQuZWRpdG9yU2VsZWN0aW9uVHlwZTtcbiAgICB9O1xuICB9LCBbYWN0aXZlU2VsZWN0aW9uLCByb290UmVmXSk7XG5cbiAgdXNlRWZmZWN0KCgpID0+IHtcbiAgICBjb25zdCBpbnRlcnZhbCA9IHdpbmRvdy5zZXRJbnRlcnZhbCgoKSA9PiBzZXRSdW50aW1lTWV0cmljcyhydW50aW1lUmVmLmN1cnJlbnQ/LmdldE1ldHJpY3M/LigpIHx8IG51bGwpLCA1MDApO1xuICAgIHJldHVybiAoKSA9PiB3aW5kb3cuY2xlYXJJbnRlcnZhbChpbnRlcnZhbCk7XG4gIH0sIFtydW50aW1lUmVmXSk7XG5cbiAgdXNlRWZmZWN0KCgpID0+IHtcbiAgICBpZiAoIXNuYXBzaG90LmRpcnR5KSByZXR1cm4gdW5kZWZpbmVkO1xuICAgIGNvbnN0IHRpbWVyID0gd2luZG93LnNldFRpbWVvdXQoKCkgPT4ge1xuICAgICAgdHJ5IHtcbiAgICAgICAgd3JpdGVBYm91dE5hcnJhdGl2ZVJlY292ZXJ5RHJhZnQoc25hcHNob3QuZG9jdW1lbnQsIHNuYXBzaG90LmJhc2VsaW5lSGFzaCk7XG4gICAgICB9IGNhdGNoIChlcnJvcikge1xuICAgICAgICBzdG9yZS5zZXRSZWNvdmVyeVN0YXRlKHsgZXJyb3I6IGBEcmFmdCBzdG9yYWdlIGZhaWxlZDogJHtlcnJvci5tZXNzYWdlfWAgfSk7XG4gICAgICB9XG4gICAgfSwgOTAwKTtcbiAgICByZXR1cm4gKCkgPT4gd2luZG93LmNsZWFyVGltZW91dCh0aW1lcik7XG4gIH0sIFtzbmFwc2hvdC5iYXNlbGluZUhhc2gsIHNuYXBzaG90LmRpcnR5LCBzbmFwc2hvdC5kb2N1bWVudCwgc3RvcmVdKTtcblxuICB1c2VFZmZlY3QoKCkgPT4ge1xuICAgIGNvbnN0IHBhZ2VoaWRlID0gKCkgPT4ge1xuICAgICAgY29uc3QgY3VycmVudCA9IHNuYXBzaG90UmVmLmN1cnJlbnQ7XG4gICAgICBpZiAoY3VycmVudC5kaXJ0eSkge1xuICAgICAgICB0cnkgeyB3cml0ZUFib3V0TmFycmF0aXZlUmVjb3ZlcnlEcmFmdChjdXJyZW50LmRvY3VtZW50LCBjdXJyZW50LmJhc2VsaW5lSGFzaCk7IH0gY2F0Y2ggeyAvKiBzdXJmYWNlZCBieSBub3JtYWwgYXV0b3NhdmUgKi8gfVxuICAgICAgfVxuICAgIH07XG4gICAgY29uc3Qga2V5ZG93biA9IChldmVudCkgPT4ge1xuICAgICAgaWYgKChldmVudC5tZXRhS2V5IHx8IGV2ZW50LmN0cmxLZXkpICYmIGV2ZW50LmtleS50b0xvd2VyQ2FzZSgpID09PSAncycpIHtcbiAgICAgICAgZXZlbnQucHJldmVudERlZmF1bHQoKTtcbiAgICAgICAgZG9jdW1lbnQucXVlcnlTZWxlY3RvcignW2RhdGEtYWJvdXQtZWRpdG9yLXNhdmVdJyk/LmNsaWNrKCk7XG4gICAgICB9XG4gICAgICBpZiAoKGV2ZW50Lm1ldGFLZXkgfHwgZXZlbnQuY3RybEtleSkgJiYgZXZlbnQua2V5LnRvTG93ZXJDYXNlKCkgPT09ICd6Jykge1xuICAgICAgICBldmVudC5wcmV2ZW50RGVmYXVsdCgpO1xuICAgICAgICBldmVudC5zaGlmdEtleSA/IHN0b3JlLnJlZG8oKSA6IHN0b3JlLnVuZG8oKTtcbiAgICAgIH1cbiAgICAgIGlmICghZXZlbnQubWV0YUtleSAmJiAhZXZlbnQuY3RybEtleSAmJiAhZXZlbnQuYWx0S2V5ICYmICFldmVudC5zaGlmdEtleVxuICAgICAgICAmJiAhaXNUZXh0RWRpdGluZ1RhcmdldChldmVudC50YXJnZXQpICYmIFsnQXJyb3dMZWZ0JywgJ0Fycm93UmlnaHQnXS5pbmNsdWRlcyhldmVudC5rZXkpKSB7XG4gICAgICAgIGV2ZW50LnByZXZlbnREZWZhdWx0KCk7XG4gICAgICAgIGp1bXBUaW1lbGluZUtleWZyYW1lKHN0b3JlLCBzdG9yZS5nZXRTbmFwc2hvdCgpLCBldmVudC5rZXkgPT09ICdBcnJvd1JpZ2h0JyA/IDEgOiAtMSk7XG4gICAgICB9XG4gICAgICBpZiAoIWV2ZW50Lm1ldGFLZXkgJiYgIWV2ZW50LmN0cmxLZXkgJiYgIWV2ZW50LmFsdEtleVxuICAgICAgICAmJiAhaXNUZXh0RWRpdGluZ1RhcmdldChldmVudC50YXJnZXQpICYmIFsnQmFja3NwYWNlJywgJ0RlbGV0ZSddLmluY2x1ZGVzKGV2ZW50LmtleSlcbiAgICAgICAgJiYgZGVsZXRlVGltZWxpbmVTZWxlY3Rpb24oc3RvcmUsIHN0b3JlLmdldFNuYXBzaG90KCkpKSB7XG4gICAgICAgIGV2ZW50LnByZXZlbnREZWZhdWx0KCk7XG4gICAgICB9XG4gICAgICBpZiAoZXZlbnQua2V5ID09PSAnRXNjYXBlJykge1xuICAgICAgICBjb25zdCBjdXJyZW50ID0gc3RvcmUuZ2V0U25hcHNob3QoKTtcbiAgICAgICAgaWYgKGN1cnJlbnQucHJldmlld1N0YXRlKSBzdG9yZS5jYW5jZWxQcmV2aWV3KCk7XG4gICAgICAgIGVsc2UgaWYgKGN1cnJlbnQudHJ5U3RhdGUpIHN0b3JlLmNhbmNlbFRyeSgpO1xuICAgICAgICBlbHNlIGlmIChnZXRBYm91dE5hcnJhdGl2ZVNlbGVjdGlvbk1lbWJlcnMoY3VycmVudC5zZWxlY3Rpb24pLmxlbmd0aCA+IDEpIHtcbiAgICAgICAgICBzdG9yZS5zZXRTZWxlY3Rpb24oe1xuICAgICAgICAgICAgdHlwZTogJ2N1ZScsXG4gICAgICAgICAgICBzZWN0aW9uSWQ6IGN1cnJlbnQuc2VsZWN0aW9uLnNlY3Rpb25JZCxcbiAgICAgICAgICAgIGN1ZUlkOiBjdXJyZW50LnNlbGVjdGlvbi5jdWVJZCxcbiAgICAgICAgICAgIGtleVBhcnQ6IGN1cnJlbnQuc2VsZWN0aW9uLmtleVBhcnQgfHwgJ2ZvY3VzJyxcbiAgICAgICAgICB9KTtcbiAgICAgICAgfVxuICAgICAgICBlbHNlIGlmIChjdXJyZW50LnNlbGVjdGlvbi50eXBlICE9PSAnc2VjdGlvbicpIHN0b3JlLnNldFNlbGVjdGlvbih7IHR5cGU6ICdzZWN0aW9uJywgc2VjdGlvbklkOiBjdXJyZW50LnNlbGVjdGlvbi5zZWN0aW9uSWQgfSk7XG4gICAgICAgIGVsc2Ugc3RvcmUuc2V0U2VsZWN0aW9uKHsgdHlwZTogJ3NlcXVlbmNlJyB9KTtcbiAgICAgIH1cbiAgICB9O1xuICAgIHdpbmRvdy5hZGRFdmVudExpc3RlbmVyKCdwYWdlaGlkZScsIHBhZ2VoaWRlKTtcbiAgICB3aW5kb3cuYWRkRXZlbnRMaXN0ZW5lcigna2V5ZG93bicsIGtleWRvd24pO1xuICAgIHJldHVybiAoKSA9PiB7IHdpbmRvdy5yZW1vdmVFdmVudExpc3RlbmVyKCdwYWdlaGlkZScsIHBhZ2VoaWRlKTsgd2luZG93LnJlbW92ZUV2ZW50TGlzdGVuZXIoJ2tleWRvd24nLCBrZXlkb3duKTsgfTtcbiAgfSwgW3N0b3JlXSk7XG5cbiAgY29uc3Qgc2F2ZSA9IGFzeW5jICgpID0+IHtcbiAgICBjb25zdCBlZGl0b3JVcmwgPSBuZXcgVVJMKHdpbmRvdy5sb2NhdGlvbi5ocmVmKTtcbiAgICBlZGl0b3JVcmwuc2VhcmNoUGFyYW1zLnNldCgnZWRpdCcsICcxJyk7XG4gICAgd2luZG93Lmhpc3RvcnkucmVwbGFjZVN0YXRlKHdpbmRvdy5oaXN0b3J5LnN0YXRlLCAnJywgYCR7ZWRpdG9yVXJsLnBhdGhuYW1lfSR7ZWRpdG9yVXJsLnNlYXJjaH0ke2VkaXRvclVybC5oYXNofWApO1xuICAgIGNvbnN0IHNlbnQgPSBjbG9uZUFib3V0TmFycmF0aXZlRG9jdW1lbnQoc25hcHNob3QuZG9jdW1lbnQpO1xuICAgIGlmIChzbmFwc2hvdC5kaWFnbm9zdGljcy5zb21lKChpdGVtKSA9PiBpdGVtLmxldmVsID09PSAnZXJyb3InKSkge1xuICAgICAgc3RvcmUuc2V0U2F2ZVN0YXRlKHsgc3RhdHVzOiAnZmFpbGVkJywgbWVzc2FnZTogJ1Jlc29sdmUgdmFsaWRhdGlvbiBlcnJvcnMgYmVmb3JlIHNhdmluZy4nIH0pO1xuICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICBzdG9yZS5zZXRTYXZlU3RhdGUoeyBzdGF0dXM6ICdzYXZpbmcnLCBtZXNzYWdlOiAnJyB9KTtcbiAgICB0cnkge1xuICAgICAgY29uc3QgcmVzdWx0ID0gYXdhaXQgc2F2ZUFib3V0TmFycmF0aXZlU291cmNlKHNlbnQsIHNuYXBzaG90LmJhc2VsaW5lSGFzaCk7XG4gICAgICBzdG9yZS5tYXJrU2F2ZWQoc2VudCwgcmVzdWx0Lmhhc2gpO1xuICAgICAgY2xlYXJBYm91dE5hcnJhdGl2ZVJlY292ZXJ5RHJhZnQoKTtcbiAgICB9IGNhdGNoIChlcnJvcikge1xuICAgICAgc3RvcmUuc2V0U2F2ZVN0YXRlKHsgc3RhdHVzOiBlcnJvci5zdGF0dXMgPT09IDQwOSA/ICdjb25mbGljdCcgOiAnZmFpbGVkJywgbWVzc2FnZTogZXJyb3IubWVzc2FnZSB9KTtcbiAgICB9XG4gIH07XG5cbiAgY29uc3QgYWRkQ2hlY2twb2ludCA9ICgpID0+IHtcbiAgICBjb25zdCBjaGVja3BvaW50ID0ge1xuICAgICAgaWQ6IGNyeXB0by5yYW5kb21VVUlEKCksXG4gICAgICBuYW1lOiBgQ2hlY2twb2ludCAke25ldyBEYXRlKCkudG9Mb2NhbGVUaW1lU3RyaW5nKFtdLCB7IGhvdXI6ICcyLWRpZ2l0JywgbWludXRlOiAnMi1kaWdpdCcgfSl9YCxcbiAgICAgIHRpbWVzdGFtcDogRGF0ZS5ub3coKSxcbiAgICAgIHN0b3J5V1U6IHNuYXBzaG90LnRyYW5zcG9ydC5zdG9yeVdVLFxuICAgICAgYmFzZVNvdXJjZUhhc2g6IHNuYXBzaG90LmJhc2VsaW5lSGFzaCxcbiAgICAgIGRvY3VtZW50OiBzbmFwc2hvdC5kb2N1bWVudCxcbiAgICB9O1xuICAgIHNldENoZWNrcG9pbnRzKHdyaXRlQWJvdXROYXJyYXRpdmVDaGVja3BvaW50KGNoZWNrcG9pbnQpKTtcbiAgfTtcbiAgY29uc3Qgc3RhdHVzTGFiZWwgPSBzbmFwc2hvdC5zYXZlU3RhdGUuc3RhdHVzID09PSAnc2F2aW5nJyA/ICdTYXZpbmfigKYnXG4gICAgOiBzbmFwc2hvdC5zYXZlU3RhdGUuc3RhdHVzID09PSAnY29uZmxpY3QnID8gJ1NvdXJjZSBjaGFuZ2VkJ1xuICAgICAgOiBzbmFwc2hvdC5zYXZlU3RhdGUuc3RhdHVzID09PSAnZmFpbGVkJyA/ICdTYXZlIGZhaWxlZCdcbiAgICAgICAgOiBzbmFwc2hvdC5kaXJ0eSA/ICdEcmFmdCcgOiAnU2F2ZWQnO1xuICBjb25zdCBzZWxlY3RlZCA9IGdldFNlY3Rpb24oc25hcHNob3QuZG9jdW1lbnQsIHNuYXBzaG90LnNlbGVjdGlvbik7XG4gIGNvbnN0IGNvbXBpbGVkU2VsZWN0ZWQgPSBzbmFwc2hvdC5jb21waWxlZFBsYW4/LnNlY3Rpb25zLmZpbmQoKHNlY3Rpb24pID0+IHNlY3Rpb24uaWQgPT09IHNlbGVjdGVkPy5pZCk7XG4gIGNvbnN0IHJlc29sdmVkRXh0ZW50ID0gY29tcGlsZWRTZWxlY3RlZD8ucmVzb2x2ZWRFeHRlbnRXVSB8fCBzZWxlY3RlZD8uZXh0ZW50V1UgfHwgMDtcbiAgY29uc3Qgc2VsZWN0ZWRFeHRlbnQgPSBzZWxlY3RlZFxuICAgID8gTnVtYmVyKHNuYXBzaG90LnByZXZpZXdQcm9maWxlID09PSAnbW9iaWxlJyA/IHNlbGVjdGVkLm1vYmlsZUV4dGVudFdVIDogc2VsZWN0ZWQuZXh0ZW50V1UpXG4gICAgOiAwO1xuICBjb25zdCBzZWxlY3RlZEN1ZUNvdW50ID0gZ2V0QWJvdXROYXJyYXRpdmVTZWxlY3Rpb25NZW1iZXJzKHNuYXBzaG90LnNlbGVjdGlvbikubGVuZ3RoO1xuICBjb25zdCBsb29wQWN0aXZlID0gQm9vbGVhbihzbmFwc2hvdC50cmFuc3BvcnQubG9vcCk7XG4gIGNvbnN0IHRpbWVsaW5lRGVsZXRpb24gPSBnZXRUaW1lbGluZURlbGV0aW9uKHNuYXBzaG90KTtcbiAgY29uc3QgdG9nZ2xlTG9vcCA9ICgpID0+IHtcbiAgICBpZiAobG9vcEFjdGl2ZSkge1xuICAgICAgc3RvcmUuc2V0VHJhbnNwb3J0KHsgb3duZXI6ICd0aW1lbGluZScsIHBsYXlpbmc6IGZhbHNlLCBsb29wOiBudWxsIH0pO1xuICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICBjb25zdCByYW5nZSA9IGRlcml2ZUFib3V0TmFycmF0aXZlTG9vcFJhbmdlKHtcbiAgICAgIGRvY3VtZW50OiBzbmFwc2hvdC5kb2N1bWVudCxcbiAgICAgIHBsYW46IHNuYXBzaG90LmNvbXBpbGVkUGxhbixcbiAgICAgIHNvdXJjZTogc2VsZWN0ZWQgPyB7IHR5cGU6ICdzZWN0aW9uJywgc2VjdGlvbklkOiBzZWxlY3RlZC5pZCB9IDogbnVsbCxcbiAgICB9KTtcbiAgICBpZiAocmFuZ2UudmFsaWQpIHN0b3JlLnNldFRyYW5zcG9ydCh7IGxvb3A6IHJhbmdlIH0pO1xuICB9O1xuICBjb25zdCB0b2dnbGVTb2xvID0gKHRyYWNrKSA9PiBzdG9yZS5zZXRUcmFuc3BvcnQoe1xuICAgIHNvbG9UcmFjazogc25hcHNob3QudHJhbnNwb3J0LnNvbG9UcmFjayA9PT0gdHJhY2sgPyBudWxsIDogdHJhY2ssXG4gIH0pO1xuICBjb25zdCBmaXRTZXF1ZW5jZSA9ICgpID0+IHtcbiAgICBzdG9yZS5zZXRUcmFuc3BvcnQoeyB6b29tOiAxIH0pO1xuICAgIHJlcXVlc3RBbmltYXRpb25GcmFtZSgoKSA9PiB7XG4gICAgICBjb25zdCBsYW5lcyA9IGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3IoJy5hYm91dC1lZGl0b3ItbGFuZXMnKTtcbiAgICAgIGlmIChsYW5lcykgbGFuZXMuc2Nyb2xsTGVmdCA9IDA7XG4gICAgfSk7XG4gIH07XG4gIGNvbnN0IGZpdFNlY3Rpb24gPSAoKSA9PiB7XG4gICAgaWYgKCFjb21waWxlZFNlbGVjdGVkIHx8ICFzbmFwc2hvdC5jb21waWxlZFBsYW4/Lm1heFN0b3J5V1UpIHJldHVybjtcbiAgICBjb25zdCBzZWN0aW9uU3BhbiA9IE1hdGgubWF4KDAuMDAxLCBjb21waWxlZFNlbGVjdGVkLnJlc29sdmVkRXh0ZW50V1UpO1xuICAgIGNvbnN0IHpvb20gPSBNYXRoLm1pbig4LCBNYXRoLm1heCgxLCAoc25hcHNob3QuY29tcGlsZWRQbGFuLm1heFN0b3J5V1UgLyBzZWN0aW9uU3BhbikgKiAwLjgyKSk7XG4gICAgc3RvcmUuc2V0VHJhbnNwb3J0KHsgem9vbTogTnVtYmVyKHpvb20udG9GaXhlZCgzKSkgfSk7XG4gICAgcmVxdWVzdEFuaW1hdGlvbkZyYW1lKCgpID0+IHtcbiAgICAgIGNvbnN0IGxhbmVzID0gZG9jdW1lbnQucXVlcnlTZWxlY3RvcignLmFib3V0LWVkaXRvci1sYW5lcycpO1xuICAgICAgaWYgKCFsYW5lcykgcmV0dXJuO1xuICAgICAgY29uc3Qgc3RhcnRSYXRpbyA9IGNvbXBpbGVkU2VsZWN0ZWQuc3RhcnRXVSAvIHNuYXBzaG90LmNvbXBpbGVkUGxhbi5tYXhTdG9yeVdVO1xuICAgICAgbGFuZXMuc2Nyb2xsTGVmdCA9IE1hdGgubWF4KDAsIChzdGFydFJhdGlvICogbGFuZXMuc2Nyb2xsV2lkdGgpIC0gKGxhbmVzLmNsaWVudFdpZHRoICogMC4wOCkpO1xuICAgIH0pO1xuICB9O1xuICBjb25zdCB0b2dnbGVEaXJlY3RvciA9ICgpID0+IHtcbiAgICBjb25zdCBuZXh0ID0gIWRpcmVjdG9yVmlldztcbiAgICBzZXREaXJlY3RvclZpZXcobmV4dCk7XG4gICAgcnVudGltZVJlZi5jdXJyZW50Py5zZXREaXJlY3RvclZpZXc/LihuZXh0KTtcbiAgfTtcbiAgY29uc3QgdG9nZ2xlQmVmb3JlID0gKCkgPT4ge1xuICAgIGlmIChzbmFwc2hvdC50cnlTdGF0ZT8ubGFiZWwgPT09ICdDb21wYXJlIHNhdmVkIHNvdXJjZScpIHtcbiAgICAgIHN0b3JlLmNhbmNlbFRyeSgpO1xuICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICBpZiAoc25hcHNob3QudHJ5U3RhdGUpIHJldHVybjtcbiAgICBzdG9yZS5iZWdpblRyeSgnQ29tcGFyZSBzYXZlZCBzb3VyY2UnLCAoZHJhZnQpID0+IHtcbiAgICAgIE9iamVjdC5rZXlzKGRyYWZ0KS5mb3JFYWNoKChrZXkpID0+IGRlbGV0ZSBkcmFmdFtrZXldKTtcbiAgICAgIE9iamVjdC5hc3NpZ24oZHJhZnQsIGNsb25lQWJvdXROYXJyYXRpdmVEb2N1bWVudChzbmFwc2hvdC5iYXNlbGluZURvY3VtZW50KSk7XG4gICAgfSk7XG4gIH07XG5cbiAgcmV0dXJuIGNyZWF0ZVBvcnRhbCgoXG4gICAgPGRpdlxuICAgICAgY2xhc3NOYW1lPVwiYWJvdXQtZWRpdG9yXCJcbiAgICAgIGRhdGEtbW9iaWxlLXBhbmU9e21vYmlsZVBhbmV9XG4gICAgICBkYXRhLXRpbWVsaW5lLW9wZW49e3RpbWVsaW5lT3BlbiA/ICd0cnVlJyA6ICdmYWxzZSd9XG4gICAgICByb2xlPVwicmVnaW9uXCJcbiAgICAgIGFyaWEtbGFiZWw9XCJBYm91dCBOYXJyYXRpdmUgY3JlYXRpdmUgdG9vbGtpdFwiXG4gICAgPlxuICAgICAgPGhlYWRlciBjbGFzc05hbWU9XCJhYm91dC1lZGl0b3ItdG9wYmFyXCI+XG4gICAgICAgIDxidXR0b24gdHlwZT1cImJ1dHRvblwiIGNsYXNzTmFtZT1cImFib3V0LWVkaXRvci1icmFuZFwiIG9uQ2xpY2s9eygpID0+IHN0b3JlLnNldFNlbGVjdGlvbih7IHR5cGU6ICdzZXF1ZW5jZScgfSl9PjxEaWFtb25kIGFyaWEtaGlkZGVuPVwidHJ1ZVwiIC8+PHNwYW4+QWJvdXQgTmFycmF0aXZlPC9zcGFuPjxzbWFsbD5DcmVhdGl2ZSB0b29sa2l0PC9zbWFsbD48L2J1dHRvbj5cbiAgICAgICAgPFRyYW5zcG9ydCBzdG9yZT17c3RvcmV9IHNuYXBzaG90PXtzbmFwc2hvdH0gLz5cbiAgICAgICAgPGRpdiBjbGFzc05hbWU9XCJhYm91dC1lZGl0b3ItYWN0aW9uc1wiPlxuICAgICAgICAgIDxidXR0b24gdHlwZT1cImJ1dHRvblwiIGRpc2FibGVkPXshc25hcHNob3QuaGlzdG9yeS5jYW5VbmRvfSB0aXRsZT17c25hcHNob3QuaGlzdG9yeS51bmRvTGFiZWwgfHwgJ1VuZG8nfSBhcmlhLWxhYmVsPVwiVW5kb1wiIG9uQ2xpY2s9eygpID0+IHN0b3JlLnVuZG8oKX0+PHNwYW4gYXJpYS1oaWRkZW49XCJ0cnVlXCI+4oa2PC9zcGFuPjwvYnV0dG9uPlxuICAgICAgICAgIDxidXR0b24gdHlwZT1cImJ1dHRvblwiIGRpc2FibGVkPXshc25hcHNob3QuaGlzdG9yeS5jYW5SZWRvfSB0aXRsZT17c25hcHNob3QuaGlzdG9yeS5yZWRvTGFiZWwgfHwgJ1JlZG8nfSBhcmlhLWxhYmVsPVwiUmVkb1wiIG9uQ2xpY2s9eygpID0+IHN0b3JlLnJlZG8oKX0+PHNwYW4gYXJpYS1oaWRkZW49XCJ0cnVlXCI+4oa3PC9zcGFuPjwvYnV0dG9uPlxuICAgICAgICAgIDxidXR0b24gdHlwZT1cImJ1dHRvblwiIGNsYXNzTmFtZT17cGF0aFZpc2libGUgPyAnaXMtYWN0aXZlJyA6ICcnfSBvbkNsaWNrPXsoKSA9PiBzZXRQYXRoVmlzaWJsZSghcGF0aFZpc2libGUpfT5QYXRoPC9idXR0b24+XG4gICAgICAgICAgPGJ1dHRvbiB0eXBlPVwiYnV0dG9uXCIgY2xhc3NOYW1lPXtkaXJlY3RvclZpZXcgPyAnaXMtYWN0aXZlJyA6ICcnfSBvbkNsaWNrPXt0b2dnbGVEaXJlY3Rvcn0+e2RpcmVjdG9yVmlldyA/ICdEaXJlY3RvcicgOiAnQ2FtZXJhJ308L2J1dHRvbj5cbiAgICAgICAgICA8YnV0dG9uIHR5cGU9XCJidXR0b25cIiBjbGFzc05hbWU9e3NuYXBzaG90LnRyeVN0YXRlPy5sYWJlbCA9PT0gJ0NvbXBhcmUgc2F2ZWQgc291cmNlJyA/ICdpcy1hY3RpdmUnIDogJyd9IGRpc2FibGVkPXtzbmFwc2hvdC50cnlTdGF0ZSAmJiBzbmFwc2hvdC50cnlTdGF0ZS5sYWJlbCAhPT0gJ0NvbXBhcmUgc2F2ZWQgc291cmNlJ30gb25DbGljaz17dG9nZ2xlQmVmb3JlfT57c25hcHNob3QudHJ5U3RhdGU/LmxhYmVsID09PSAnQ29tcGFyZSBzYXZlZCBzb3VyY2UnID8gJ0JlZm9yZScgOiAnQWZ0ZXInfTwvYnV0dG9uPlxuICAgICAgICAgIDxkZXRhaWxzIGNsYXNzTmFtZT1cImFib3V0LWVkaXRvci1tb3JlXCI+XG4gICAgICAgICAgICA8c3VtbWFyeT5Nb3JlPC9zdW1tYXJ5PlxuICAgICAgICAgICAgPGRpdj5cbiAgICAgICAgICAgICAgPGJ1dHRvbiB0eXBlPVwiYnV0dG9uXCIgb25DbGljaz17YWRkQ2hlY2twb2ludH0+Q2hlY2twb2ludDwvYnV0dG9uPlxuICAgICAgICAgICAgICA8YnV0dG9uIHR5cGU9XCJidXR0b25cIiBvbkNsaWNrPXsoKSA9PiBleHBvcnRBYm91dE5hcnJhdGl2ZURvY3VtZW50KHNuYXBzaG90LmRvY3VtZW50KX0+RXhwb3J0IEpTT048L2J1dHRvbj5cbiAgICAgICAgICAgICAgPGJ1dHRvbiB0eXBlPVwiYnV0dG9uXCIgb25DbGljaz17KCkgPT4gaW1wb3J0UmVmLmN1cnJlbnQ/LmNsaWNrKCl9PkltcG9ydCBKU09OPC9idXR0b24+XG4gICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICA8L2RldGFpbHM+XG4gICAgICAgICAgPGlucHV0IHJlZj17aW1wb3J0UmVmfSBoaWRkZW4gdHlwZT1cImZpbGVcIiBhY2NlcHQ9XCJhcHBsaWNhdGlvbi9qc29uXCIgb25DaGFuZ2U9e2FzeW5jIChldmVudCkgPT4ge1xuICAgICAgICAgICAgY29uc3QgZmlsZSA9IGV2ZW50LnRhcmdldC5maWxlcz8uWzBdO1xuICAgICAgICAgICAgaWYgKCFmaWxlKSByZXR1cm47XG4gICAgICAgICAgICB0cnkge1xuICAgICAgICAgICAgICBjb25zdCBpbXBvcnRlZCA9IEpTT04ucGFyc2UoYXdhaXQgZmlsZS50ZXh0KCkpO1xuICAgICAgICAgICAgICBhc3NlcnRWYWxpZEFib3V0TmFycmF0aXZlRG9jdW1lbnQoaW1wb3J0ZWQpO1xuICAgICAgICAgICAgICBzdG9yZS5yZXBsYWNlRG9jdW1lbnQoJ0ltcG9ydCBkb2N1bWVudCcsIGltcG9ydGVkKTtcbiAgICAgICAgICAgIH0gY2F0Y2ggKGVycm9yKSB7IHN0b3JlLnNldFNhdmVTdGF0ZSh7IHN0YXR1czogJ2ZhaWxlZCcsIG1lc3NhZ2U6IGVycm9yLm1lc3NhZ2UgfSk7IH1cbiAgICAgICAgICAgIGV2ZW50LnRhcmdldC52YWx1ZSA9ICcnO1xuICAgICAgICAgIH19IC8+XG4gICAgICAgICAgPGJ1dHRvbiB0eXBlPVwiYnV0dG9uXCIgZGF0YS1hYm91dC1lZGl0b3Itc2F2ZSBjbGFzc05hbWU9XCJpcy1zYXZlXCIgZGlzYWJsZWQ9e3NuYXBzaG90LnNhdmVTdGF0ZS5zdGF0dXMgPT09ICdzYXZpbmcnfSBvbkNsaWNrPXtzYXZlfT48c3Bhbj57c3RhdHVzTGFiZWx9PC9zcGFuPjxrYmQ+4oyYUzwva2JkPjwvYnV0dG9uPlxuICAgICAgICA8L2Rpdj5cbiAgICAgIDwvaGVhZGVyPlxuXG4gICAgICB7c25hcHNob3QucmVjb3ZlcnlTdGF0ZS5hdmFpbGFibGUgPyA8ZGl2IGNsYXNzTmFtZT1cImFib3V0LWVkaXRvci1yZWNvdmVyeVwiPjxzcGFuPkFuIHVuc2F2ZWQgZHJhZnQgZnJvbSB7bmV3IERhdGUoc25hcHNob3QucmVjb3ZlcnlTdGF0ZS5kcmFmdC50aW1lc3RhbXApLnRvTG9jYWxlU3RyaW5nKCl9IGlzIGF2YWlsYWJsZS48L3NwYW4+PGJ1dHRvbiB0eXBlPVwiYnV0dG9uXCIgb25DbGljaz17KCkgPT4geyBzdG9yZS5yZXBsYWNlRG9jdW1lbnQoJ1JlY292ZXIgZHJhZnQnLCBzbmFwc2hvdC5yZWNvdmVyeVN0YXRlLmRyYWZ0LmRvY3VtZW50KTsgc3RvcmUuc2V0UmVjb3ZlcnlTdGF0ZSh7IGF2YWlsYWJsZTogZmFsc2UgfSk7IH19PlJlY292ZXIgYXMgdW5zYXZlZCBjb3B5PC9idXR0b24+PGJ1dHRvbiB0eXBlPVwiYnV0dG9uXCIgb25DbGljaz17KCkgPT4geyBleHBvcnRBYm91dE5hcnJhdGl2ZURvY3VtZW50KHNuYXBzaG90LnJlY292ZXJ5U3RhdGUuZHJhZnQuZG9jdW1lbnQsICdjb250ZW50cy1hYm91dC1yZWNvdmVyZWQuanNvbicpOyB9fT5FeHBvcnQ8L2J1dHRvbj48YnV0dG9uIHR5cGU9XCJidXR0b25cIiBvbkNsaWNrPXsoKSA9PiB7IGNsZWFyQWJvdXROYXJyYXRpdmVSZWNvdmVyeURyYWZ0KCk7IHN0b3JlLnNldFJlY292ZXJ5U3RhdGUoeyBhdmFpbGFibGU6IGZhbHNlIH0pOyB9fT5EaXNjYXJkPC9idXR0b24+PC9kaXY+IDogbnVsbH1cbiAgICAgIHtzbmFwc2hvdC5zYXZlU3RhdGUubWVzc2FnZSA/IDxkaXYgY2xhc3NOYW1lPXtgYWJvdXQtZWRpdG9yLXNhdmUtbWVzc2FnZSBpcy0ke3NuYXBzaG90LnNhdmVTdGF0ZS5zdGF0dXN9YH0+e3NuYXBzaG90LnNhdmVTdGF0ZS5tZXNzYWdlfTxidXR0b24gdHlwZT1cImJ1dHRvblwiIGFyaWEtbGFiZWw9XCJEaXNtaXNzIG1lc3NhZ2VcIiBvbkNsaWNrPXsoKSA9PiBzdG9yZS5zZXRTYXZlU3RhdGUoeyBtZXNzYWdlOiAnJyB9KX0+w5c8L2J1dHRvbj48L2Rpdj4gOiBudWxsfVxuXG4gICAgICB7cGF0aFZpc2libGUgPyA8Q2FtZXJhUGF0aE92ZXJsYXkgc25hcHNob3Q9e3NuYXBzaG90fSAvPiA6IG51bGx9XG4gICAgICB7ZGlyZWN0b3JWaWV3ID8gPGRpdiBjbGFzc05hbWU9XCJhYm91dC1lZGl0b3ItZGlyZWN0b3ItY29udHJvbHNcIj48c3Ryb25nPkRpcmVjdG9yIFZpZXc8L3N0cm9uZz48YnV0dG9uIHR5cGU9XCJidXR0b25cIiBvbkNsaWNrPXsoKSA9PiBydW50aW1lUmVmLmN1cnJlbnQ/Lm51ZGdlRGlyZWN0b3I/Lih7IHlhdzogLTAuMDggfSl9PuKGkDwvYnV0dG9uPjxidXR0b24gdHlwZT1cImJ1dHRvblwiIG9uQ2xpY2s9eygpID0+IHJ1bnRpbWVSZWYuY3VycmVudD8ubnVkZ2VEaXJlY3Rvcj8uKHsgcGl0Y2g6IDAuMDggfSl9PuKGkTwvYnV0dG9uPjxidXR0b24gdHlwZT1cImJ1dHRvblwiIG9uQ2xpY2s9eygpID0+IHJ1bnRpbWVSZWYuY3VycmVudD8ubnVkZ2VEaXJlY3Rvcj8uKHsgcGl0Y2g6IC0wLjA4IH0pfT7ihpM8L2J1dHRvbj48YnV0dG9uIHR5cGU9XCJidXR0b25cIiBvbkNsaWNrPXsoKSA9PiBydW50aW1lUmVmLmN1cnJlbnQ/Lm51ZGdlRGlyZWN0b3I/Lih7IHlhdzogMC4wOCB9KX0+4oaSPC9idXR0b24+PGJ1dHRvbiB0eXBlPVwiYnV0dG9uXCIgb25DbGljaz17KCkgPT4gcnVudGltZVJlZi5jdXJyZW50Py5udWRnZURpcmVjdG9yPy4oeyBkaXN0YW5jZTogLTAuMiB9KX0+77yLPC9idXR0b24+PGJ1dHRvbiB0eXBlPVwiYnV0dG9uXCIgb25DbGljaz17KCkgPT4gcnVudGltZVJlZi5jdXJyZW50Py5udWRnZURpcmVjdG9yPy4oeyBkaXN0YW5jZTogMC4yIH0pfT7iiJI8L2J1dHRvbj48YnV0dG9uIHR5cGU9XCJidXR0b25cIiBvbkNsaWNrPXsoKSA9PiBydW50aW1lUmVmLmN1cnJlbnQ/LnJlc2V0RGlyZWN0b3I/LigpfT5SZXNldDwvYnV0dG9uPjxzbWFsbD5UZW1wb3JhcnkgaW5zcGVjdGlvbiBvbmx5LiBQdWJsaXNoZWQgQ2FtZXJhIGtleXMgYXJlIHVuY2hhbmdlZC48L3NtYWxsPjwvZGl2PiA6IG51bGx9XG5cbiAgICAgIDxJbnNwZWN0b3Igc3RvcmU9e3N0b3JlfSBzbmFwc2hvdD17c25hcHNob3R9IHRpbWVsaW5lT3Blbj17dGltZWxpbmVPcGVufSBydW50aW1lTWV0cmljcz17cnVudGltZU1ldHJpY3N9IGNsaXBib2FyZD17Y2xpcGJvYXJkfSBzZXRDbGlwYm9hcmQ9e3NldENsaXBib2FyZH0gLz5cbiAgICAgIDxidXR0b25cbiAgICAgICAgdHlwZT1cImJ1dHRvblwiXG4gICAgICAgIGNsYXNzTmFtZT1cImFib3V0LWVkaXRvci10aW1lbGluZS10b2dnbGVcIlxuICAgICAgICBhcmlhLWNvbnRyb2xzPVwiYWJvdXQtZWRpdG9yLXRpbWVsaW5lLXBhbmVsXCJcbiAgICAgICAgYXJpYS1leHBhbmRlZD17dGltZWxpbmVPcGVufVxuICAgICAgICB0aXRsZT17dGltZWxpbmVPcGVuID8gJ0hpZGUgdGltZWxpbmUnIDogJ1Nob3cgdGltZWxpbmUnfVxuICAgICAgICBvbkNsaWNrPXsoKSA9PiBzZXRUaW1lbGluZU9wZW4oKG9wZW4pID0+ICFvcGVuKX1cbiAgICAgID57dGltZWxpbmVPcGVuID8gPENoZXZyb25Eb3duIGFyaWEtaGlkZGVuPVwidHJ1ZVwiIC8+IDogPENoZXZyb25VcCBhcmlhLWhpZGRlbj1cInRydWVcIiAvPn08c3Bhbj57dGltZWxpbmVPcGVuID8gJ0hpZGUgdGltZWxpbmUnIDogJ1Nob3cgdGltZWxpbmUnfTwvc3Bhbj48L2J1dHRvbj5cbiAgICAgIDxkaXYgaWQ9XCJhYm91dC1lZGl0b3ItdGltZWxpbmUtcGFuZWxcIiBjbGFzc05hbWU9XCJhYm91dC1lZGl0b3ItYm90dG9tXCIgYXJpYS1oaWRkZW49eyF0aW1lbGluZU9wZW59PlxuICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cImFib3V0LWVkaXRvci1jb250ZXh0YmFyXCI+XG4gICAgICAgICAgPHNwYW4+PHN0cm9uZz57c2VsZWN0ZWQ/LmxhYmVsIHx8ICdTZXF1ZW5jZSd9PC9zdHJvbmc+IHtzZWxlY3RlZCA/IGAke3NlbGVjdGVkLnR5cGV9IMK3ICR7Zm9ybWF0V1UoTWF0aC5tYXgoMCwgc2VsZWN0ZWRFeHRlbnQgLSAxKSl9IHNjcm9sbCDCtyAke2Zvcm1hdFdVKHNlbGVjdGVkRXh0ZW50KX0gdG90YWwke3Jlc29sdmVkRXh0ZW50ID4gc2VsZWN0ZWRFeHRlbnQgKyAwLjAwMSA/IGAgwrcgJHtmb3JtYXRXVShyZXNvbHZlZEV4dGVudCl9IHJlc29sdmVkYCA6ICcnfWAgOiAnJ308L3NwYW4+XG4gICAgICAgICAge3NlbGVjdGVkQ3VlQ291bnQgPiAxID8gPHNwYW4gY2xhc3NOYW1lPVwiYWJvdXQtZWRpdG9yLXNlbGVjdGlvbi1jb3VudFwiPntzZWxlY3RlZEN1ZUNvdW50fSB0aXRsZXMgc2VsZWN0ZWQ8L3NwYW4+IDogbnVsbH1cbiAgICAgICAgICA8c3Bhbj57c25hcHNob3QuYXV0b0tleSA/ICdBdXRvLWtleSBhcm1lZCcgOiAnQXV0by1rZXkgb2ZmJ308L3NwYW4+XG4gICAgICAgICAgPGJ1dHRvbiB0eXBlPVwiYnV0dG9uXCIgY2xhc3NOYW1lPXtzbmFwc2hvdC5hdXRvS2V5ID8gJ2lzLWFjdGl2ZScgOiAnJ30gb25DbGljaz17KCkgPT4gc3RvcmUuc2V0QXV0b0tleSghc25hcHNob3QuYXV0b0tleSl9PuKXhiBBdXRvLWtleTwvYnV0dG9uPlxuICAgICAgICAgIDxidXR0b24gdHlwZT1cImJ1dHRvblwiIGNsYXNzTmFtZT17bG9vcEFjdGl2ZSA/ICdpcy1hY3RpdmUnIDogJyd9IGRpc2FibGVkPXshc2VsZWN0ZWR9IG9uQ2xpY2s9e3RvZ2dsZUxvb3B9Pntsb29wQWN0aXZlID8gJ1N0b3AgYXVkaXRpb24nIDogJ0xvb3AgU2VjdGlvbid9PC9idXR0b24+XG4gICAgICAgICAgPGJ1dHRvbiB0eXBlPVwiYnV0dG9uXCIgb25DbGljaz17Zml0U2VxdWVuY2V9PkZpdCBzZXF1ZW5jZTwvYnV0dG9uPlxuICAgICAgICAgIDxidXR0b24gdHlwZT1cImJ1dHRvblwiIGRpc2FibGVkPXshY29tcGlsZWRTZWxlY3RlZH0gb25DbGljaz17Zml0U2VjdGlvbn0+Rml0IFNlY3Rpb248L2J1dHRvbj5cbiAgICAgICAgICB7WydjYW1lcmEnLCAnd29ybGQnLCAndGV4dCddLm1hcCgodHJhY2spID0+IDxidXR0b24gdHlwZT1cImJ1dHRvblwiIGtleT17dHJhY2t9IGNsYXNzTmFtZT17c25hcHNob3QudHJhbnNwb3J0LnNvbG9UcmFjayA9PT0gdHJhY2sgPyAnaXMtYWN0aXZlJyA6ICcnfSBvbkNsaWNrPXsoKSA9PiB0b2dnbGVTb2xvKHRyYWNrKX0+U29sbyB7dHJhY2t9PC9idXR0b24+KX1cbiAgICAgICAgICB7dGltZWxpbmVEZWxldGlvbiA/IDxidXR0b24gdHlwZT1cImJ1dHRvblwiIGNsYXNzTmFtZT1cImFib3V0LWVkaXRvci1kZWxldGUta2V5XCIgZGlzYWJsZWQ9e3RpbWVsaW5lRGVsZXRpb24uZGlzYWJsZWR9IHRpdGxlPXt0aW1lbGluZURlbGV0aW9uLm1lc3NhZ2UgfHwgYCR7dGltZWxpbmVEZWxldGlvbi5sYWJlbH0gwrcgRGVsZXRlL0JhY2tzcGFjZWB9IG9uQ2xpY2s9eygpID0+IGRlbGV0ZVRpbWVsaW5lU2VsZWN0aW9uKHN0b3JlLCBzbmFwc2hvdCl9PjxUcmFzaDIgYXJpYS1oaWRkZW49XCJ0cnVlXCIgLz57dGltZWxpbmVEZWxldGlvbi5sYWJlbH08L2J1dHRvbj4gOiBudWxsfVxuICAgICAgICAgIHtydW50aW1lTWV0cmljcyA/IDxzcGFuIGNsYXNzTmFtZT1cImFib3V0LWVkaXRvci1odWRcIj57cnVudGltZU1ldHJpY3MuZnJhbWVUaW1lTXMudG9GaXhlZCgyKX1tcyDCtyB7cnVudGltZU1ldHJpY3MuZHJhd0NhbGxzfSBkcmF3IMK3IHtydW50aW1lTWV0cmljcy5wb2ludENvdW50LnRvTG9jYWxlU3RyaW5nKCl9IHB0cyDCtyB7cnVudGltZU1ldHJpY3MuYWN0aXZlTW9kaWZpZXJzfSBtb2RpZmllcnMgwrcge3J1bnRpbWVNZXRyaWNzLmJ1ZmZlclJlYnVpbGRzfSByZWJ1aWxkczwvc3Bhbj4gOiBudWxsfVxuICAgICAgICAgIHtjaGVja3BvaW50cy5sZW5ndGggPyA8c2VsZWN0IGFyaWEtbGFiZWw9XCJSZXN0b3JlIGNoZWNrcG9pbnRcIiBkZWZhdWx0VmFsdWU9XCJcIiBvbkNoYW5nZT17KGV2ZW50KSA9PiB7IGNvbnN0IGZvdW5kID0gY2hlY2twb2ludHMuZmluZCgoaXRlbSkgPT4gaXRlbS5pZCA9PT0gZXZlbnQudGFyZ2V0LnZhbHVlKTsgaWYgKGZvdW5kKSB7IHN0b3JlLnJlcGxhY2VEb2N1bWVudChgUmVzdG9yZSAke2ZvdW5kLm5hbWV9YCwgZm91bmQuZG9jdW1lbnQpOyBzdG9yZS5zZXRUcmFuc3BvcnQoeyBvd25lcjogJ3RpbWVsaW5lJywgc3RvcnlXVTogZm91bmQuc3RvcnlXVSwgcGxheWluZzogZmFsc2UgfSk7IH0gZXZlbnQudGFyZ2V0LnZhbHVlID0gJyc7IH19PjxvcHRpb24gdmFsdWU9XCJcIj5DaGVja3BvaW50cyAoe2NoZWNrcG9pbnRzLmxlbmd0aH0pPC9vcHRpb24+e2NoZWNrcG9pbnRzLm1hcCgoaXRlbSkgPT4gPG9wdGlvbiB2YWx1ZT17aXRlbS5pZH0ga2V5PXtpdGVtLmlkfT57aXRlbS5uYW1lfTwvb3B0aW9uPil9PC9zZWxlY3Q+IDogbnVsbH1cbiAgICAgICAgPC9kaXY+XG4gICAgICAgIDxUaW1lbGluZVxuICAgICAgICAgIHN0b3JlPXtzdG9yZX1cbiAgICAgICAgICBzbmFwc2hvdD17c25hcHNob3R9XG4gICAgICAgICAgb25PcGVuR2xvYmFsPXsoc2VsZWN0aW9uKSA9PiB7XG4gICAgICAgICAgICBzdG9yZS5zZXRTZWxlY3Rpb24oc2VsZWN0aW9uKTtcbiAgICAgICAgICAgIHNldE1vYmlsZVBhbmUoJ2luc3BlY3QnKTtcbiAgICAgICAgICB9fVxuICAgICAgICAvPlxuICAgICAgPC9kaXY+XG4gICAgICA8bmF2IGNsYXNzTmFtZT1cImFib3V0LWVkaXRvci1tb2JpbGUtdGFic1wiIGFyaWEtbGFiZWw9XCJFZGl0b3IgcGFuZWxcIj48YnV0dG9uIHR5cGU9XCJidXR0b25cIiBjbGFzc05hbWU9e21vYmlsZVBhbmUgPT09ICdzZXF1ZW5jZScgPyAnaXMtYWN0aXZlJyA6ICcnfSBvbkNsaWNrPXsoKSA9PiBzZXRNb2JpbGVQYW5lKCdzZXF1ZW5jZScpfT5TZXF1ZW5jZTwvYnV0dG9uPjxidXR0b24gdHlwZT1cImJ1dHRvblwiIGNsYXNzTmFtZT17bW9iaWxlUGFuZSA9PT0gJ2luc3BlY3QnID8gJ2lzLWFjdGl2ZScgOiAnJ30gb25DbGljaz17KCkgPT4gc2V0TW9iaWxlUGFuZSgnaW5zcGVjdCcpfT5JbnNwZWN0PC9idXR0b24+PGJ1dHRvbiB0eXBlPVwiYnV0dG9uXCIgY2xhc3NOYW1lPXttb2JpbGVQYW5lID09PSAncHJldmlldycgPyAnaXMtYWN0aXZlJyA6ICcnfSBvbkNsaWNrPXsoKSA9PiBzZXRNb2JpbGVQYW5lKCdwcmV2aWV3Jyl9PlByZXZpZXc8L2J1dHRvbj48L25hdj5cbiAgICA8L2Rpdj5cbiAgKSwgZG9jdW1lbnQuYm9keSk7XG59XG4iXSwiZmlsZSI6Ii9Vc2Vycy9hbGV4YW5kZXJiZWNrL1Byb2plY3RzLWNvZGUvQWxleGFuZGVyIEJlY2sgU3R1ZGlvIFdlYnNpdGUvcmVhY3QtYXBwL2FwcC9zcmMvcm91dGVzL2Fib3V0LW5hcnJhdGl2ZS1sYWIvQWJvdXROYXJyYXRpdmVFZGl0b3IuanN4In0=