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
  const requestedGroupIds = snapshot.selection.type === "sequence" ? snapshot.selection.groupIds || [] : [];
  const groups = requestedGroupIds.length ? ABOUT_NARRATIVE_GLOBAL_CONTROLS.filter((group) => requestedGroupIds.includes(group.id)) : ABOUT_NARRATIVE_GLOBAL_CONTROLS;
  const heading = snapshot.selection.trackLabel ? `${snapshot.selection.trackLabel} track` : "Sequence";
  return /* @__PURE__ */ jsxDEV(Fragment, { children: [
    /* @__PURE__ */ jsxDEV("header", { children: [
      /* @__PURE__ */ jsxDEV("span", { children: heading }, void 0, false, {
        fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
        lineNumber: 1163,
        columnNumber: 15
      }, this),
      /* @__PURE__ */ jsxDEV("strong", { children: "Global controls" }, void 0, false, {
        fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
        lineNumber: 1163,
        columnNumber: 37
      }, this)
    ] }, void 0, true, {
      fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
      lineNumber: 1163,
      columnNumber: 7
    }, this),
    groups.map(
      (group) => /* @__PURE__ */ jsxDEV("details", { open: true, "data-global-group": group.id, children: [
        /* @__PURE__ */ jsxDEV("summary", { children: group.label }, void 0, false, {
          fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
          lineNumber: 1166,
          columnNumber: 11
        }, this),
        group.id === "textMotion" ? /* @__PURE__ */ jsxDEV("p", { className: "about-editor-help", children: "Every title follows one continuous Y and Z path. Negative Y is higher; positive Y is lower. Travel duration changes the width of every Spatial title block in the Text timeline." }, void 0, false, {
          fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
          lineNumber: 1167,
          columnNumber: 40
        }, this) : null,
        group.id === "swarmTurbulence" ? /* @__PURE__ */ jsxDEV("p", { className: "about-editor-help", children: "One ambient motion profile drives both the cluster and turbulent field. Each World only scales its strength, so the motion stays continuous while Shapes change." }, void 0, false, {
          fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
          lineNumber: 1168,
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
                lineNumber: 1176,
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
              lineNumber: 1191,
              columnNumber: 13
            },
            this
          );
        }),
        group.id === "textMotion" ? /* @__PURE__ */ jsxDEV("p", { className: "about-editor-help about-editor-depth-help", children: [
          /* @__PURE__ */ jsxDEV("strong", { children: "Depth moves; blur softens." }, void 0, false, {
            fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
            lineNumber: 1203,
            columnNumber: 97
          }, this),
          " Entry depth starts behind the screen on −Z and Exit depth finishes toward you on +Z. Perspective controls how strongly that Z travel changes apparent size; Maximum blur only changes sharpness."
        ] }, void 0, true, {
          fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
          lineNumber: 1203,
          columnNumber: 40
        }, this) : null
      ] }, group.id, true, {
        fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
        lineNumber: 1165,
        columnNumber: 7
      }, this)
    )
  ] }, void 0, true, {
    fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
    lineNumber: 1162,
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
        lineNumber: 1241,
        columnNumber: 15
      }, this),
      /* @__PURE__ */ jsxDEV("strong", { children: section.label }, void 0, false, {
        fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
        lineNumber: 1241,
        columnNumber: 79
      }, this)
    ] }, void 0, true, {
      fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
      lineNumber: 1241,
      columnNumber: 7
    }, this),
    section.locked ? /* @__PURE__ */ jsxDEV("div", { className: "about-editor-lock", children: [
      /* @__PURE__ */ jsxDEV(LockKeyhole, { "aria-hidden": "true" }, void 0, false, {
        fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
        lineNumber: 1242,
        columnNumber: 60
      }, this),
      /* @__PURE__ */ jsxDEV("span", { children: "This protected Section cannot be reordered or have its World replaced accidentally." }, void 0, false, {
        fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
        lineNumber: 1242,
        columnNumber: 94
      }, this),
      /* @__PURE__ */ jsxDEV("button", { type: "button", onClick: () => update("Unlock protected Section", (draft) => {
        draft.locked = false;
      }), children: "Unlock advanced" }, void 0, false, {
        fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
        lineNumber: 1242,
        columnNumber: 190
      }, this)
    ] }, void 0, true, {
      fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
      lineNumber: 1242,
      columnNumber: 25
    }, this) : null,
    /* @__PURE__ */ jsxDEV("div", { className: "about-editor-inline-actions", children: [
      /* @__PURE__ */ jsxDEV("button", { type: "button", disabled: section.locked || sectionIndex === 0, onClick: () => move(-1), children: "Move earlier" }, void 0, false, {
        fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
        lineNumber: 1244,
        columnNumber: 9
      }, this),
      /* @__PURE__ */ jsxDEV("button", { type: "button", disabled: section.locked || sectionIndex === snapshot.document.sections.length - 1, onClick: () => move(1), children: "Move later" }, void 0, false, {
        fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
        lineNumber: 1245,
        columnNumber: 9
      }, this),
      /* @__PURE__ */ jsxDEV("button", { type: "button", disabled: section.locked || section.type === "finale", onClick: duplicate, children: "Duplicate" }, void 0, false, {
        fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
        lineNumber: 1246,
        columnNumber: 9
      }, this)
    ] }, void 0, true, {
      fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
      lineNumber: 1243,
      columnNumber: 7
    }, this),
    /* @__PURE__ */ jsxDEV(Property, { label: "Section name", children: /* @__PURE__ */ jsxDEV("input", { value: section.label, onChange: (event) => update("Rename Section", (draft) => {
      draft.label = event.target.value;
    }, `section:${section.id}:label`) }, void 0, false, {
      fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
      lineNumber: 1248,
      columnNumber: 38
    }, this) }, void 0, false, {
      fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
      lineNumber: 1248,
      columnNumber: 7
    }, this),
    /* @__PURE__ */ jsxDEV(Property, { label: "Stable ID", children: [
      /* @__PURE__ */ jsxDEV("input", { value: section.id, readOnly: true }, void 0, false, {
        fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
        lineNumber: 1249,
        columnNumber: 35
      }, this),
      /* @__PURE__ */ jsxDEV("small", { children: "References this Section without tying it to its current meaning." }, void 0, false, {
        fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
        lineNumber: 1249,
        columnNumber: 72
      }, this)
    ] }, void 0, true, {
      fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
      lineNumber: 1249,
      columnNumber: 7
    }, this),
    /* @__PURE__ */ jsxDEV(Property, { label: "Type", children: /* @__PURE__ */ jsxDEV("select", { value: section.type, disabled: section.type === "finale", onChange: (event) => update("Change Section type", (draft) => {
      draft.type = event.target.value;
    }), children: [
      /* @__PURE__ */ jsxDEV("option", { value: "spatial", children: "Spatial" }, void 0, false, {
        fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
        lineNumber: 1252,
        columnNumber: 11
      }, this),
      /* @__PURE__ */ jsxDEV("option", { value: "editorial", children: "Editorial" }, void 0, false, {
        fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
        lineNumber: 1252,
        columnNumber: 51
      }, this),
      /* @__PURE__ */ jsxDEV("option", { value: "finale", children: "Finale" }, void 0, false, {
        fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
        lineNumber: 1252,
        columnNumber: 95
      }, this)
    ] }, void 0, true, {
      fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
      lineNumber: 1251,
      columnNumber: 9
    }, this) }, void 0, false, {
      fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
      lineNumber: 1250,
      columnNumber: 7
    }, this),
    /* @__PURE__ */ jsxDEV("details", { open: true, children: [
      /* @__PURE__ */ jsxDEV("summary", { children: "Section timing" }, void 0, false, {
        fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
        lineNumber: 1256,
        columnNumber: 9
      }, this),
      /* @__PURE__ */ jsxDEV(Property, { label: "Scroll travel", children: /* @__PURE__ */ jsxDEV("output", { className: "about-editor-readout", children: formatWU(Math.max(0, activeExtent - 1)) }, void 0, false, {
        fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
        lineNumber: 1257,
        columnNumber: 41
      }, this) }, void 0, false, {
        fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
        lineNumber: 1257,
        columnNumber: 9
      }, this),
      /* @__PURE__ */ jsxDEV(Property, { label: "Total height", children: /* @__PURE__ */ jsxDEV("output", { className: "about-editor-readout", children: formatWU(activeExtent) }, void 0, false, {
        fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
        lineNumber: 1258,
        columnNumber: 40
      }, this) }, void 0, false, {
        fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
        lineNumber: 1258,
        columnNumber: 9
      }, this),
      /* @__PURE__ */ jsxDEV(NumberProperty, { label: "Desktop length", value: section.extentWU, min: 1, max: 8, step: 0.05, unit: "WU", onChange: (value) => update("Change desktop Section length", (draft) => {
        draft.extentWU = value;
      }, `section:${section.id}:extent`) }, void 0, false, {
        fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
        lineNumber: 1259,
        columnNumber: 9
      }, this),
      /* @__PURE__ */ jsxDEV(NumberProperty, { label: "Mobile length", value: section.mobileExtentWU, min: 1, max: 8, step: 0.05, unit: "WU", onChange: (value) => update("Change mobile Section length", (draft) => {
        draft.mobileExtentWU = value;
      }, `section:${section.id}:mobile`) }, void 0, false, {
        fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
        lineNumber: 1260,
        columnNumber: 9
      }, this),
      /* @__PURE__ */ jsxDEV(Property, { label: "Resolved height", children: /* @__PURE__ */ jsxDEV("output", { className: "about-editor-readout", children: formatWU(resolvedExtent) }, void 0, false, {
        fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
        lineNumber: 1261,
        columnNumber: 43
      }, this) }, void 0, false, {
        fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
        lineNumber: 1261,
        columnNumber: 9
      }, this),
      contentMinimumActive ? /* @__PURE__ */ jsxDEV("p", { className: "about-editor-timing-warning", children: [
        "Content minimum in effect. The rendered copy needs ",
        formatWU(resolvedExtent),
        " in this profile."
      ] }, void 0, true, {
        fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
        lineNumber: 1262,
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
          lineNumber: 1263,
          columnNumber: 9
        },
        this
      )
    ] }, void 0, true, {
      fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
      lineNumber: 1255,
      columnNumber: 7
    }, this),
    section.type === "editorial" ? /* @__PURE__ */ jsxDEV(EditorialBlocks, { store, snapshot, section }, void 0, false, {
      fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
      lineNumber: 1270,
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
        lineNumber: 1272,
        columnNumber: 7
      },
      this
    ) : null
  ] }, void 0, true, {
    fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
    lineNumber: 1240,
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
      lineNumber: 1310,
      columnNumber: 7
    }, this),
    (section.text.blocks || []).map(
      (block, blockIndex) => /* @__PURE__ */ jsxDEV("div", { className: "about-editor-block", children: [
        /* @__PURE__ */ jsxDEV("div", { children: [
          /* @__PURE__ */ jsxDEV("code", { children: block.kind }, void 0, false, {
            fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
            lineNumber: 1313,
            columnNumber: 16
          }, this),
          /* @__PURE__ */ jsxDEV("span", { children: block.id }, void 0, false, {
            fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
            lineNumber: 1313,
            columnNumber: 41
          }, this)
        ] }, void 0, true, {
          fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
          lineNumber: 1313,
          columnNumber: 11
        }, this),
        block.label != null ? /* @__PURE__ */ jsxDEV(Property, { label: "Label", children: /* @__PURE__ */ jsxDEV("input", { value: block.label, onChange: (event) => updateBlock(blockIndex, "label", event.target.value) }, void 0, false, {
          fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
          lineNumber: 1314,
          columnNumber: 58
        }, this) }, void 0, false, {
          fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
          lineNumber: 1314,
          columnNumber: 34
        }, this) : null,
        block.text != null ? /* @__PURE__ */ jsxDEV(Property, { label: "Copy", children: /* @__PURE__ */ jsxDEV("textarea", { rows: "5", value: block.text, onChange: (event) => updateBlock(blockIndex, "text", event.target.value) }, void 0, false, {
          fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
          lineNumber: 1315,
          columnNumber: 56
        }, this) }, void 0, false, {
          fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
          lineNumber: 1315,
          columnNumber: 33
        }, this) : null,
        block.kind === "prose" ? /* @__PURE__ */ jsxDEV(Property, { label: "Reconnect point grid", children: /* @__PURE__ */ jsxDEV("input", { type: "checkbox", checked: block.worldInfluence === true, onChange: (event) => updateBlock(blockIndex, "worldInfluence", event.target.checked) }, void 0, false, {
          fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
          lineNumber: 1316,
          columnNumber: 76
        }, this) }, void 0, false, {
          fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
          lineNumber: 1316,
          columnNumber: 37
        }, this) : null,
        block.text != null ? /* @__PURE__ */ jsxDEV("div", { className: "about-editor-emphasis-controls", children: [
          /* @__PURE__ */ jsxDEV("span", { children: "Highlighted words" }, void 0, false, {
            fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
            lineNumber: 1319,
            columnNumber: 15
          }, this),
          (block.emphasis || []).map(
            (item, emphasisIndex) => /* @__PURE__ */ jsxDEV("div", { className: "about-editor-emphasis-row", children: [
              /* @__PURE__ */ jsxDEV("input", { "aria-label": "Highlighted phrase", value: item.text, onChange: (event) => updateEmphasis(blockIndex, emphasisIndex, "text", event.target.value) }, void 0, false, {
                fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
                lineNumber: 1322,
                columnNumber: 19
              }, this),
              /* @__PURE__ */ jsxDEV("select", { "aria-label": "Highlight colour", value: item.tone, onChange: (event) => updateEmphasis(blockIndex, emphasisIndex, "tone", event.target.value), children: ABOUT_NARRATIVE_EMPHASIS_TONES.map((tone) => /* @__PURE__ */ jsxDEV("option", { value: tone, children: tone }, tone, false, {
                fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
                lineNumber: 1324,
                columnNumber: 67
              }, this)) }, void 0, false, {
                fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
                lineNumber: 1323,
                columnNumber: 19
              }, this),
              /* @__PURE__ */ jsxDEV("button", { type: "button", "aria-label": `Remove ${item.text || "empty"} highlight`, onClick: () => removeEmphasis(blockIndex, emphasisIndex), children: "×" }, void 0, false, {
                fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
                lineNumber: 1326,
                columnNumber: 19
              }, this)
            ] }, `${block.id}-emphasis-${emphasisIndex}`, true, {
              fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
              lineNumber: 1321,
              columnNumber: 11
            }, this)
          ),
          /* @__PURE__ */ jsxDEV("button", { type: "button", onClick: () => addEmphasis(blockIndex), children: "Add highlight" }, void 0, false, {
            fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
            lineNumber: 1329,
            columnNumber: 15
          }, this)
        ] }, void 0, true, {
          fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
          lineNumber: 1318,
          columnNumber: 9
        }, this) : null,
        block.items ? /* @__PURE__ */ jsxDEV(Property, { label: "Items", children: /* @__PURE__ */ jsxDEV("textarea", { rows: "6", value: block.items.join("\n"), onChange: (event) => updateBlock(blockIndex, "items", event.target.value.split("\n").filter(Boolean)) }, void 0, false, {
          fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
          lineNumber: 1332,
          columnNumber: 50
        }, this) }, void 0, false, {
          fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
          lineNumber: 1332,
          columnNumber: 26
        }, this) : null
      ] }, block.id, true, {
        fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
        lineNumber: 1312,
        columnNumber: 7
      }, this)
    ),
    /* @__PURE__ */ jsxDEV("button", { type: "button", className: "about-editor-wide-action", onClick: () => store.commit("Add editorial block", (draft) => {
      draft.sections[sectionIndex].text.blocks.push({ id: nextId(draft, `${section.id}-prose`), kind: "prose", text: "New editorial paragraph." });
    }), children: "Add prose block" }, void 0, false, {
      fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
      lineNumber: 1335,
      columnNumber: 7
    }, this)
  ] }, void 0, true, {
    fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
    lineNumber: 1309,
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
      lineNumber: 1437,
      columnNumber: 7
    }, this),
    members.length > 1 ? /* @__PURE__ */ jsxDEV(Fragment, { children: [
      /* @__PURE__ */ jsxDEV("div", { className: "about-editor-rhythm-actions", children: [
        /* @__PURE__ */ jsxDEV("button", { type: "button", onClick: distribute, children: "Distribute evenly" }, void 0, false, {
          fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
          lineNumber: 1441,
          columnNumber: 13
        }, this),
        /* @__PURE__ */ jsxDEV("button", { type: "button", onClick: alignPrimary, children: "Align primary to playhead" }, void 0, false, {
          fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
          lineNumber: 1442,
          columnNumber: 13
        }, this)
      ] }, void 0, true, {
        fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
        lineNumber: 1440,
        columnNumber: 11
      }, this),
      /* @__PURE__ */ jsxDEV("div", { className: "about-editor-rhythm-gap", children: [
        /* @__PURE__ */ jsxDEV(Property, { label: "Exact gap", children: /* @__PURE__ */ jsxDEV("input", { type: "number", min: "0", max: "8", step: "0.05", value: gapWU, onChange: (event) => setGapWU(Math.max(0, Number(event.target.value) || 0)) }, void 0, false, {
          fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
          lineNumber: 1445,
          columnNumber: 41
        }, this) }, void 0, false, {
          fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
          lineNumber: 1445,
          columnNumber: 13
        }, this),
        /* @__PURE__ */ jsxDEV(Property, { label: "Anchor", children: /* @__PURE__ */ jsxDEV("select", { value: anchor, onChange: (event) => setAnchor(event.target.value), children: [
          /* @__PURE__ */ jsxDEV("option", { value: "primary", children: "Primary" }, void 0, false, {
            fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
            lineNumber: 1446,
            columnNumber: 113
          }, this),
          /* @__PURE__ */ jsxDEV("option", { value: "first", children: "First" }, void 0, false, {
            fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
            lineNumber: 1446,
            columnNumber: 153
          }, this),
          /* @__PURE__ */ jsxDEV("option", { value: "last", children: "Last" }, void 0, false, {
            fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
            lineNumber: 1446,
            columnNumber: 189
          }, this)
        ] }, void 0, true, {
          fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
          lineNumber: 1446,
          columnNumber: 38
        }, this) }, void 0, false, {
          fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
          lineNumber: 1446,
          columnNumber: 13
        }, this),
        /* @__PURE__ */ jsxDEV("button", { type: "button", onClick: exactGap, children: "Preview exact gap" }, void 0, false, {
          fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
          lineNumber: 1447,
          columnNumber: 13
        }, this)
      ] }, void 0, true, {
        fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
        lineNumber: 1444,
        columnNumber: 11
      }, this)
    ] }, void 0, true, {
      fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
      lineNumber: 1439,
      columnNumber: 7
    }, this) : null,
    ghostMoves.length ? /* @__PURE__ */ jsxDEV("div", { className: "about-editor-rhythm-preview", "aria-label": "Proposed title rhythm", children: ghostMoves.map((move) => {
      const compiled = snapshot.compiledPlan.sections.find((item) => item.id === move.sectionId);
      const storyWU = Number(compiled?.startWU || 0) + move.hold * Number(compiled?.travelWU || 0);
      return /* @__PURE__ */ jsxDEV("i", { style: { left: `${storyWU / maxWU * 100}%` }, title: `${move.cueId} · ${formatWU(storyWU)}` }, `${move.sectionId}:${move.cueId}`, false, {
        fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
        lineNumber: 1456,
        columnNumber: 18
      }, this);
    }) }, void 0, false, {
      fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
      lineNumber: 1452,
      columnNumber: 7
    }, this) : null,
    message ? /* @__PURE__ */ jsxDEV("p", { className: `about-editor-rhythm-message${preview && !preview.valid ? " is-error" : ""}`, children: message }, void 0, false, {
      fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
      lineNumber: 1460,
      columnNumber: 18
    }, this) : null,
    preview?.valid && snapshot.tryState ? /* @__PURE__ */ jsxDEV("div", { className: "about-editor-try", children: [
      /* @__PURE__ */ jsxDEV("span", { children: [
        "Previewing ",
        preview.label
      ] }, void 0, true, {
        fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
        lineNumber: 1461,
        columnNumber: 80
      }, this),
      /* @__PURE__ */ jsxDEV("button", { type: "button", onClick: cancelPreview, children: "Cancel" }, void 0, false, {
        fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
        lineNumber: 1461,
        columnNumber: 119
      }, this),
      /* @__PURE__ */ jsxDEV("button", { type: "button", className: "is-primary", onClick: applyPreview, children: "Apply" }, void 0, false, {
        fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
        lineNumber: 1461,
        columnNumber: 180
      }, this)
    ] }, void 0, true, {
      fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
      lineNumber: 1461,
      columnNumber: 46
    }, this) : null,
    /* @__PURE__ */ jsxDEV("div", { className: "about-editor-rhythm-actions", children: [
      /* @__PURE__ */ jsxDEV("button", { type: "button", onClick: duplicate, children: [
        "Duplicate ",
        members.length > 1 ? "selection" : "title"
      ] }, void 0, true, {
        fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
        lineNumber: 1463,
        columnNumber: 9
      }, this),
      /* @__PURE__ */ jsxDEV("button", { type: "button", onClick: copy, children: "Copy" }, void 0, false, {
        fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
        lineNumber: 1464,
        columnNumber: 9
      }, this),
      /* @__PURE__ */ jsxDEV("button", { type: "button", disabled: !clipboard, onClick: paste, children: "Paste at playhead" }, void 0, false, {
        fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
        lineNumber: 1465,
        columnNumber: 9
      }, this)
    ] }, void 0, true, {
      fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
      lineNumber: 1462,
      columnNumber: 7
    }, this)
  ] }, void 0, true, {
    fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
    lineNumber: 1436,
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
    lineNumber: 1476,
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
        lineNumber: 1496,
        columnNumber: 15
      }, this),
      /* @__PURE__ */ jsxDEV("strong", { children: cue.id }, void 0, false, {
        fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
        lineNumber: 1496,
        columnNumber: 36
      }, this)
    ] }, void 0, true, {
      fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
      lineNumber: 1496,
      columnNumber: 7
    }, this),
    selectedMembers.length > 1 ? /* @__PURE__ */ jsxDEV("div", { className: "about-editor-group-summary", children: [
      /* @__PURE__ */ jsxDEV("strong", { children: [
        selectedMembers.length,
        " titles selected"
      ] }, void 0, true, {
        fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
        lineNumber: 1499,
        columnNumber: 11
      }, this),
      /* @__PURE__ */ jsxDEV("ol", { children: selectedMembers.map((member) => {
        const memberSection = snapshot.document.sections.find((item) => item.id === member.sectionId);
        const memberCue = memberSection?.text?.cues?.find((item) => item.id === member.cueId);
        return /* @__PURE__ */ jsxDEV("li", { children: [
          /* @__PURE__ */ jsxDEV("span", { children: memberSection?.label }, void 0, false, {
            fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
            lineNumber: 1503,
            columnNumber: 68
          }, this),
          memberCue?.text
        ] }, `${member.sectionId}:${member.cueId}`, true, {
          fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
          lineNumber: 1503,
          columnNumber: 20
        }, this);
      }) }, void 0, false, {
        fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
        lineNumber: 1500,
        columnNumber: 11
      }, this),
      /* @__PURE__ */ jsxDEV("button", { type: "button", onClick: () => store.setSelection({ type: "cue", sectionId: section.id, cueId: cue.id, keyPart: "focus" }), children: "Keep primary only" }, void 0, false, {
        fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
        lineNumber: 1505,
        columnNumber: 11
      }, this)
    ] }, void 0, true, {
      fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
      lineNumber: 1498,
      columnNumber: 7
    }, this) : null,
    /* @__PURE__ */ jsxDEV("p", { className: "about-editor-help", children: "Drag the pink timing marker anywhere from 0–100% of its Section. This moves the title's focus time only. Its travel duration, speed, blur, and in/out cadence remain controlled globally under Spatial titles." }, void 0, false, {
      fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
      lineNumber: 1508,
      columnNumber: 7
    }, this),
    /* @__PURE__ */ jsxDEV(Property, { label: "Statement", children: /* @__PURE__ */ jsxDEV("textarea", { rows: "7", value: cue.text, onChange: (event) => update("text", event.target.value) }, void 0, false, {
      fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
      lineNumber: 1509,
      columnNumber: 35
    }, this) }, void 0, false, {
      fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
      lineNumber: 1509,
      columnNumber: 7
    }, this),
    /* @__PURE__ */ jsxDEV(Property, { label: "Movement", children: /* @__PURE__ */ jsxDEV("select", { value: movement, onChange: (event) => updateMovement(event.target.value), children: [
      /* @__PURE__ */ jsxDEV("option", { value: "spatial", children: "Spatial travel" }, void 0, false, {
        fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
        lineNumber: 1510,
        columnNumber: 116
      }, this),
      /* @__PURE__ */ jsxDEV("option", { value: "vertical", children: "Vertical scroll" }, void 0, false, {
        fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
        lineNumber: 1510,
        columnNumber: 163
      }, this)
    ] }, void 0, true, {
      fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
      lineNumber: 1510,
      columnNumber: 34
    }, this) }, void 0, false, {
      fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
      lineNumber: 1510,
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
        lineNumber: 1511,
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
        lineNumber: 1523,
        columnNumber: 41
      }, this) }, void 0, false, {
        fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
        lineNumber: 1523,
        columnNumber: 11
      }, this),
      /* @__PURE__ */ jsxDEV(Property, { label: "Motion preset", children: /* @__PURE__ */ jsxDEV("select", { value: cue.preset, onChange: (event) => update("preset", event.target.value), children: [
        /* @__PURE__ */ jsxDEV("option", { value: "travelling-title-v1", children: "Travelling title" }, void 0, false, {
          fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
          lineNumber: 1524,
          columnNumber: 129
        }, this),
        /* @__PURE__ */ jsxDEV("option", { value: "opener-v1", children: "Opener" }, void 0, false, {
          fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
          lineNumber: 1524,
          columnNumber: 190
        }, this),
        /* @__PURE__ */ jsxDEV("option", { value: "finale-v1", children: "Finale" }, void 0, false, {
          fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
          lineNumber: 1524,
          columnNumber: 231
        }, this)
      ] }, void 0, true, {
        fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
        lineNumber: 1524,
        columnNumber: 43
      }, this) }, void 0, false, {
        fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
        lineNumber: 1524,
        columnNumber: 11
      }, this)
    ] }, void 0, true, {
      fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
      lineNumber: 1522,
      columnNumber: 7
    }, this) : /* @__PURE__ */ jsxDEV(Property, { label: "Reveal", children: /* @__PURE__ */ jsxDEV("output", { className: "about-editor-readout", children: "Editorial vertical scroll" }, void 0, false, {
      fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
      lineNumber: 1526,
      columnNumber: 32
    }, this) }, void 0, false, {
      fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
      lineNumber: 1526,
      columnNumber: 7
    }, this),
    /* @__PURE__ */ jsxDEV(CueRhythmAndReuse, { store, snapshot, clipboard, setClipboard }, void 0, false, {
      fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
      lineNumber: 1527,
      columnNumber: 7
    }, this),
    /* @__PURE__ */ jsxDEV("button", { type: "button", className: "about-editor-danger", disabled: section.type === "finale", onClick: remove, children: "Delete Cue" }, void 0, false, {
      fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
      lineNumber: 1528,
      columnNumber: 7
    }, this)
  ] }, void 0, true, {
    fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
    lineNumber: 1495,
    columnNumber: 5
  }, this);
}
_c0 = CueInspector;
function DisciplineRevealInspector({ store, snapshot, section }) {
  const sectionIndex = getSectionIndex(snapshot.document, section.id);
  const reveal = section.text.disciplineReveal;
  if (!reveal) return /* @__PURE__ */ jsxDEV(SectionInspector, { store, snapshot, section }, void 0, false, {
    fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
    lineNumber: 1536,
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
        lineNumber: 1560,
        columnNumber: 15
      }, this),
      /* @__PURE__ */ jsxDEV("strong", { children: "Discipline reveal" }, void 0, false, {
        fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
        lineNumber: 1560,
        columnNumber: 41
      }, this)
    ] }, void 0, true, {
      fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
      lineNumber: 1560,
      columnNumber: 7
    }, this),
    /* @__PURE__ */ jsxDEV("p", { className: "about-editor-help", children: "One clip controls the complete six-point sequence. Drag its striped block in the Text lane to move every reveal together." }, void 0, false, {
      fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
      lineNumber: 1561,
      columnNumber: 7
    }, this),
    /* @__PURE__ */ jsxDEV("details", { open: true, children: [
      /* @__PURE__ */ jsxDEV("summary", { children: "Reveal choreography" }, void 0, false, {
        fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
        lineNumber: 1562,
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
            lineNumber: 1566,
            columnNumber: 13
          },
          this
        );
      })
    ] }, void 0, true, {
      fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
      lineNumber: 1562,
      columnNumber: 7
    }, this),
    /* @__PURE__ */ jsxDEV("details", { open: true, children: [
      /* @__PURE__ */ jsxDEV("summary", { children: "Reveal order and labels" }, void 0, false, {
        fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
        lineNumber: 1579,
        columnNumber: 21
      }, this),
      /* @__PURE__ */ jsxDEV("div", { className: "about-editor-discipline-items", children: reveal.items.map(
        (item, itemIndex) => /* @__PURE__ */ jsxDEV("div", { className: "about-editor-discipline-item", children: [
          /* @__PURE__ */ jsxDEV("code", { children: String(itemIndex + 1).padStart(2, "0") }, void 0, false, {
            fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
            lineNumber: 1583,
            columnNumber: 15
          }, this),
          /* @__PURE__ */ jsxDEV("input", { value: item.label, "aria-label": `Discipline ${itemIndex + 1} label`, onChange: (event) => update("Edit discipline label", (draft) => {
            draft.items[itemIndex].label = event.target.value;
          }, `discipline-reveal:${section.id}:item:${item.group}:label`) }, void 0, false, {
            fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
            lineNumber: 1584,
            columnNumber: 15
          }, this),
          /* @__PURE__ */ jsxDEV("div", { className: "about-editor-discipline-palette", title: `${item.label} uses the Home simulation ${DISCIPLINE_BALL_TOKEN_BY_GROUP[item.group]}`, children: [
            /* @__PURE__ */ jsxDEV("i", { style: { background: `var(${DISCIPLINE_BALL_TOKEN_BY_GROUP[item.group]})` } }, void 0, false, {
              fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
              lineNumber: 1586,
              columnNumber: 17
            }, this),
            /* @__PURE__ */ jsxDEV("code", { children: DISCIPLINE_BALL_TOKEN_BY_GROUP[item.group] }, void 0, false, {
              fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
              lineNumber: 1587,
              columnNumber: 17
            }, this)
          ] }, void 0, true, {
            fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
            lineNumber: 1585,
            columnNumber: 15
          }, this),
          /* @__PURE__ */ jsxDEV("span", { children: [
            /* @__PURE__ */ jsxDEV("button", { type: "button", disabled: itemIndex === 0, "aria-label": `Reveal ${item.label} earlier`, onClick: () => update("Reorder discipline reveal", (draft) => {
              const [moved] = draft.items.splice(itemIndex, 1);
              draft.items.splice(itemIndex - 1, 0, moved);
            }), children: "↑" }, void 0, false, {
              fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
              lineNumber: 1590,
              columnNumber: 17
            }, this),
            /* @__PURE__ */ jsxDEV("button", { type: "button", disabled: itemIndex === reveal.items.length - 1, "aria-label": `Reveal ${item.label} later`, onClick: () => update("Reorder discipline reveal", (draft) => {
              const [moved] = draft.items.splice(itemIndex, 1);
              draft.items.splice(itemIndex + 1, 0, moved);
            }), children: "↓" }, void 0, false, {
              fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
              lineNumber: 1591,
              columnNumber: 17
            }, this)
          ] }, void 0, true, {
            fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
            lineNumber: 1589,
            columnNumber: 15
          }, this)
        ] }, item.group, true, {
          fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
          lineNumber: 1582,
          columnNumber: 11
        }, this)
      ) }, void 0, false, {
        fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
        lineNumber: 1580,
        columnNumber: 9
      }, this)
    ] }, void 0, true, {
      fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
      lineNumber: 1579,
      columnNumber: 7
    }, this),
    /* @__PURE__ */ jsxDEV("p", { className: "about-editor-help", children: "The six points persist after the labels leave. An editorial block marked “Reconnect point grid” restores the surrounding grid as that paragraph enters." }, void 0, false, {
      fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
      lineNumber: 1597,
      columnNumber: 7
    }, this)
  ] }, void 0, true, {
    fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
    lineNumber: 1559,
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
    lineNumber: 1661,
    columnNumber: 127
  }, this)) }, void 0, false, {
    fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
    lineNumber: 1661,
    columnNumber: 19
  }, this);
  if (!key) {
    return /* @__PURE__ */ jsxDEV(Fragment, { children: [
      /* @__PURE__ */ jsxDEV("header", { children: [
        /* @__PURE__ */ jsxDEV("span", { children: "Camera track" }, void 0, false, {
          fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
          lineNumber: 1663,
          columnNumber: 22
        }, this),
        /* @__PURE__ */ jsxDEV("strong", { children: "Editing Section base" }, void 0, false, {
          fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
          lineNumber: 1663,
          columnNumber: 47
        }, this)
      ] }, void 0, true, {
        fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
        lineNumber: 1663,
        columnNumber: 14
      }, this),
      /* @__PURE__ */ jsxDEV("p", { className: "about-editor-help", children: "The dolly and Section joins are continuous automatically. Add visible keys only where the framing, aim, roll, or lens should change." }, void 0, false, {
        fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
        lineNumber: 1663,
        columnNumber: 93
      }, this),
      recipes,
      /* @__PURE__ */ jsxDEV("button", { type: "button", className: "about-editor-wide-action", onClick: setKey, children: [
        "Set camera key at ",
        formatCameraPercent(targetAt)
      ] }, void 0, true, {
        fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
        lineNumber: 1663,
        columnNumber: 271
      }, this)
    ] }, void 0, true, {
      fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
      lineNumber: 1663,
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
        lineNumber: 1682,
        columnNumber: 15
      }, this),
      /* @__PURE__ */ jsxDEV("strong", { children: [
        formatCameraPercent(key.at),
        " through ",
        section.label
      ] }, void 0, true, {
        fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
        lineNumber: 1682,
        columnNumber: 38
      }, this)
    ] }, void 0, true, {
      fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
      lineNumber: 1682,
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
        lineNumber: 1684,
        columnNumber: 7
      },
      this
    ),
    /* @__PURE__ */ jsxDEV(NumberProperty, { label: extentLabel, value: section[extentField], min: 1, max: 8, step: 0.05, unit: "WU", onChange: updateExtent }, void 0, false, {
      fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
      lineNumber: 1693,
      columnNumber: 7
    }, this),
    ["X offset", "Y offset", "Forward offset"].map((label, axis) => /* @__PURE__ */ jsxDEV(NumberProperty, { label, value: key.offset[axis], min: -8, max: 8, step: 0.02, unit: "WU", onChange: (value) => updateVector("offset", axis, value) }, label, false, {
      fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
      lineNumber: 1694,
      columnNumber: 72
    }, this)),
    ["Aim X", "Aim Y", "Aim depth"].map((label, axis) => /* @__PURE__ */ jsxDEV(NumberProperty, { label, value: key.lookAtOffset[axis], min: -8, max: 8, step: 0.02, unit: "WU", onChange: (value) => updateVector("lookAtOffset", axis, value) }, label, false, {
      fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
      lineNumber: 1695,
      columnNumber: 61
    }, this)),
    /* @__PURE__ */ jsxDEV(NumberProperty, { label: "Field of view", value: key.fov, min: 20, max: 90, step: 1, unit: "°", onChange: (value) => update("fov", value) }, void 0, false, {
      fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
      lineNumber: 1696,
      columnNumber: 7
    }, this),
    /* @__PURE__ */ jsxDEV(NumberProperty, { label: "Roll", value: key.roll, min: -1.2, max: 1.2, step: 0.01, unit: "rad", onChange: (value) => update("roll", value) }, void 0, false, {
      fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
      lineNumber: 1697,
      columnNumber: 7
    }, this),
    /* @__PURE__ */ jsxDEV(Property, { label: "Easing", children: /* @__PURE__ */ jsxDEV("select", { value: key.easing, onChange: (event) => update("easing", event.target.value), children: [
      /* @__PURE__ */ jsxDEV("option", { value: "smoothstep", children: "Smoothstep" }, void 0, false, {
        fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
        lineNumber: 1698,
        columnNumber: 118
      }, this),
      /* @__PURE__ */ jsxDEV("option", { value: "ease-in-out", children: "Ease in out" }, void 0, false, {
        fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
        lineNumber: 1698,
        columnNumber: 164
      }, this)
    ] }, void 0, true, {
      fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
      lineNumber: 1698,
      columnNumber: 32
    }, this) }, void 0, false, {
      fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
      lineNumber: 1698,
      columnNumber: 7
    }, this),
    /* @__PURE__ */ jsxDEV("button", { type: "button", className: "about-editor-wide-action", disabled: existingKeyAtPlayhead >= 0, onClick: setKey, children: existingKeyAtPlayhead >= 0 ? `Camera key already at ${formatCameraPercent(targetAt)}` : `Set another key at ${formatCameraPercent(targetAt)}` }, void 0, false, {
      fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
      lineNumber: 1699,
      columnNumber: 7
    }, this),
    /* @__PURE__ */ jsxDEV("button", { type: "button", className: "about-editor-danger", onClick: () => store.commit("Delete camera key", (draft) => {
      draft.sections[sectionIndex].camera.keys.splice(keyIndex, 1);
    }, { selection: { type: "section", sectionId: section.id } }), children: "Delete key" }, void 0, false, {
      fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
      lineNumber: 1700,
      columnNumber: 7
    }, this)
  ] }, void 0, true, {
    fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
    lineNumber: 1681,
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
          lineNumber: 1715,
          columnNumber: 22
        }, this),
        /* @__PURE__ */ jsxDEV("strong", { children: "Inherited World" }, void 0, false, {
          fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
          lineNumber: 1715,
          columnNumber: 46
        }, this)
      ] }, void 0, true, {
        fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
        lineNumber: 1715,
        columnNumber: 14
      }, this),
      /* @__PURE__ */ jsxDEV("p", { className: "about-editor-help", children: "This Section keeps the previous World. Choose “Create World clip” only when the shape should change here." }, void 0, false, {
        fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
        lineNumber: 1715,
        columnNumber: 87
      }, this),
      /* @__PURE__ */ jsxDEV("button", { type: "button", className: "about-editor-wide-action", onClick: () => store.commit("Create World clip", (draft) => {
        draft.sections[sectionIndex].world = cloneAboutNarrativeDocument(draft.sections.slice(0, sectionIndex).reverse().find((item) => item.world.mode === "set")?.world || draft.sections[0].world);
      }), children: "Create World clip" }, void 0, false, {
        fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
        lineNumber: 1715,
        columnNumber: 229
      }, this)
    ] }, void 0, true, {
      fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
      lineNumber: 1715,
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
        lineNumber: 1748,
        columnNumber: 15
      }, this),
      /* @__PURE__ */ jsxDEV("strong", { children: shape?.label || world.shapeId }, void 0, false, {
        fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
        lineNumber: 1748,
        columnNumber: 38
      }, this)
    ] }, void 0, true, {
      fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
      lineNumber: 1748,
      columnNumber: 7
    }, this),
    /* @__PURE__ */ jsxDEV("div", { className: "about-editor-shape-catalog", children: Object.values(ABOUT_NARRATIVE_SHAPE_DEFINITIONS).map(
      (item) => /* @__PURE__ */ jsxDEV("button", { type: "button", disabled: section.locked, className: item.id === world.shapeId ? "is-selected" : "", onClick: () => tryShape(item.id), children: [
        /* @__PURE__ */ jsxDEV("i", {}, void 0, false, {
          fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
          lineNumber: 1752,
          columnNumber: 13
        }, this),
        /* @__PURE__ */ jsxDEV("span", { children: [
          /* @__PURE__ */ jsxDEV("strong", { children: item.label }, void 0, false, {
            fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
            lineNumber: 1752,
            columnNumber: 24
          }, this),
          /* @__PURE__ */ jsxDEV("small", { children: [
            "Cost ",
            item.cost,
            " · Point field"
          ] }, void 0, true, {
            fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
            lineNumber: 1752,
            columnNumber: 53
          }, this)
        ] }, void 0, true, {
          fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
          lineNumber: 1752,
          columnNumber: 18
        }, this)
      ] }, item.id, true, {
        fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
        lineNumber: 1751,
        columnNumber: 9
      }, this)
    ) }, void 0, false, {
      fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
      lineNumber: 1749,
      columnNumber: 7
    }, this),
    snapshot.tryState ? /* @__PURE__ */ jsxDEV("div", { className: "about-editor-try", children: [
      /* @__PURE__ */ jsxDEV("span", { children: [
        "Trying ",
        snapshot.tryState.label
      ] }, void 0, true, {
        fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
        lineNumber: 1756,
        columnNumber: 62
      }, this),
      /* @__PURE__ */ jsxDEV("button", { type: "button", onClick: () => store.cancelTry(), children: "Cancel" }, void 0, false, {
        fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
        lineNumber: 1756,
        columnNumber: 107
      }, this),
      /* @__PURE__ */ jsxDEV("button", { type: "button", className: "is-primary", onClick: () => store.applyTry(), children: "Apply" }, void 0, false, {
        fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
        lineNumber: 1756,
        columnNumber: 178
      }, this)
    ] }, void 0, true, {
      fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
      lineNumber: 1756,
      columnNumber: 28
    }, this) : null,
    /* @__PURE__ */ jsxDEV("details", { open: true, children: [
      /* @__PURE__ */ jsxDEV("summary", { children: "Shape parameters" }, void 0, false, {
        fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
        lineNumber: 1757,
        columnNumber: 21
      }, this),
      (shape?.parameters || []).map((control) => /* @__PURE__ */ jsxDEV(NumberProperty, { label: control.label, value: world.shapeParameters[control.id], min: control.min, max: control.max, step: control.step, unit: control.unit, onChange: (value) => update(`Change ${control.label}`, (draft) => {
        draft.shapeParameters[control.id] = value;
      }, `world:${section.id}:${control.id}`) }, control.id, false, {
        fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
        lineNumber: 1758,
        columnNumber: 53
      }, this)),
      /* @__PURE__ */ jsxDEV("div", { className: "about-editor-inline-actions", children: [
        /* @__PURE__ */ jsxDEV("button", { type: "button", onClick: () => update("Reseed Shape", (draft) => {
          draft.seed = Math.floor(Math.random() * 4294967295);
        }), children: "Reseed" }, void 0, false, {
          fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
          lineNumber: 1759,
          columnNumber: 54
        }, this),
        /* @__PURE__ */ jsxDEV("code", { children: world.seed }, void 0, false, {
          fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
          lineNumber: 1759,
          columnNumber: 197
        }, this)
      ] }, void 0, true, {
        fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
        lineNumber: 1759,
        columnNumber: 9
      }, this)
    ] }, void 0, true, {
      fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
      lineNumber: 1757,
      columnNumber: 7
    }, this),
    /* @__PURE__ */ jsxDEV("details", { open: true, children: [
      /* @__PURE__ */ jsxDEV("summary", { children: "Placement" }, void 0, false, {
        fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
        lineNumber: 1761,
        columnNumber: 21
      }, this),
      /* @__PURE__ */ jsxDEV(NumberProperty, { label: "Distance at entry", value: world.entryDistanceWU, min: 0.2, max: 16, step: 0.05, unit: "WU", onChange: (value) => update("Move World", (draft) => {
        draft.entryDistanceWU = value;
      }, `world:${section.id}:distance`) }, void 0, false, {
        fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
        lineNumber: 1762,
        columnNumber: 9
      }, this),
      /* @__PURE__ */ jsxDEV(NumberProperty, { label: "Scale", value: world.transform.scale, min: 0.1, max: 3, step: 0.01, onChange: (value) => update("Scale World", (draft) => {
        draft.transform.scale = value;
      }, `world:${section.id}:scale`) }, void 0, false, {
        fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
        lineNumber: 1763,
        columnNumber: 9
      }, this)
    ] }, void 0, true, {
      fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
      lineNumber: 1761,
      columnNumber: 7
    }, this),
    /* @__PURE__ */ jsxDEV("details", { open: true, children: [
      /* @__PURE__ */ jsxDEV("summary", { children: "Transition in" }, void 0, false, {
        fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
        lineNumber: 1765,
        columnNumber: 21
      }, this),
      transitionEnabled ? /* @__PURE__ */ jsxDEV(Fragment, { children: [
        /* @__PURE__ */ jsxDEV("p", { className: "about-editor-help", children: [
          "Timing is relative to this Section: 1 is its end; values above 1 continue across inherited World Sections. The next World begins at ",
          transitionLimit.toFixed(3),
          "."
        ] }, void 0, true, {
          fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
          lineNumber: 1767,
          columnNumber: 11
        }, this),
        /* @__PURE__ */ jsxDEV(NumberProperty, { label: "Start", value: world.transitionIn.start, min: 0, max: transitionMax, step: 5e-3, unit: "× section", onChange: (value) => update("Change transition start", (draft) => {
          draft.transitionIn.start = Math.min(value, draft.transitionIn.end);
        }) }, void 0, false, {
          fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
          lineNumber: 1768,
          columnNumber: 11
        }, this),
        /* @__PURE__ */ jsxDEV(NumberProperty, { label: "End", value: world.transitionIn.end, min: 0, max: transitionMax, step: 5e-3, unit: "× section", onChange: (value) => update("Change transition end", (draft) => {
          draft.transitionIn.end = Math.max(value, draft.transitionIn.start);
        }) }, void 0, false, {
          fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
          lineNumber: 1769,
          columnNumber: 11
        }, this),
        /* @__PURE__ */ jsxDEV(Property, { label: "Type", children: /* @__PURE__ */ jsxDEV("select", { value: world.transitionIn.type, onChange: (event) => update("Change transition type", (draft) => {
          draft.transitionIn.type = event.target.value;
        }), children: [
          /* @__PURE__ */ jsxDEV("option", { value: "morph", children: "Morph" }, void 0, false, {
            fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
            lineNumber: 1770,
            columnNumber: 189
          }, this),
          /* @__PURE__ */ jsxDEV("option", { value: "dissolve-morph", children: "Dissolve morph" }, void 0, false, {
            fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
            lineNumber: 1770,
            columnNumber: 225
          }, this),
          /* @__PURE__ */ jsxDEV("option", { value: "crossfade", children: "Crossfade" }, void 0, false, {
            fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
            lineNumber: 1770,
            columnNumber: 279
          }, this),
          /* @__PURE__ */ jsxDEV("option", { value: "hold", children: "Hold" }, void 0, false, {
            fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
            lineNumber: 1770,
            columnNumber: 323
          }, this)
        ] }, void 0, true, {
          fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
          lineNumber: 1770,
          columnNumber: 34
        }, this) }, void 0, false, {
          fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
          lineNumber: 1770,
          columnNumber: 11
        }, this),
        /* @__PURE__ */ jsxDEV(Property, { label: "Easing", children: /* @__PURE__ */ jsxDEV("select", { value: world.transitionIn.easing, onChange: (event) => update("Change transition easing", (draft) => {
          draft.transitionIn.easing = event.target.value;
        }), children: [
          /* @__PURE__ */ jsxDEV("option", { value: "linear", children: "Linear" }, void 0, false, {
            fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
            lineNumber: 1771,
            columnNumber: 197
          }, this),
          /* @__PURE__ */ jsxDEV("option", { value: "smoothstep", children: "Smoothstep" }, void 0, false, {
            fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
            lineNumber: 1771,
            columnNumber: 235
          }, this),
          /* @__PURE__ */ jsxDEV("option", { value: "ease-in", children: "Ease in" }, void 0, false, {
            fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
            lineNumber: 1771,
            columnNumber: 281
          }, this),
          /* @__PURE__ */ jsxDEV("option", { value: "ease-out", children: "Ease out" }, void 0, false, {
            fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
            lineNumber: 1771,
            columnNumber: 321
          }, this),
          /* @__PURE__ */ jsxDEV("option", { value: "ease-in-out", children: "Ease in out" }, void 0, false, {
            fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
            lineNumber: 1771,
            columnNumber: 363
          }, this),
          /* @__PURE__ */ jsxDEV("option", { value: "hold", children: "Hold" }, void 0, false, {
            fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
            lineNumber: 1771,
            columnNumber: 411
          }, this)
        ] }, void 0, true, {
          fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
          lineNumber: 1771,
          columnNumber: 36
        }, this) }, void 0, false, {
          fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
          lineNumber: 1771,
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
          lineNumber: 1772,
          columnNumber: 11
        }, this),
        /* @__PURE__ */ jsxDEV(Property, { label: "Correspondence", children: /* @__PURE__ */ jsxDEV("select", { "aria-label": "Correspondence", value: world.transitionIn.correspondence, disabled: !correspondenceEnabled, title: correspondenceEnabled ? "Choose how source points are assigned to target points." : "Correspondence applies to Morph and Dissolve morph transitions.", onChange: (event) => update("Change correspondence", (draft) => {
          draft.transitionIn.correspondence = event.target.value;
        }), children: ABOUT_NARRATIVE_CORRESPONDENCE_MODES.map((mode) => /* @__PURE__ */ jsxDEV("option", { value: mode, children: CORRESPONDENCE_LABELS[mode] || mode }, mode, false, {
          fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
          lineNumber: 1773,
          columnNumber: 490
        }, this)) }, void 0, false, {
          fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
          lineNumber: 1773,
          columnNumber: 44
        }, this) }, void 0, false, {
          fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
          lineNumber: 1773,
          columnNumber: 11
        }, this),
        /* @__PURE__ */ jsxDEV("p", { className: "about-editor-help", role: "status", "aria-live": "polite", children: [
          "Correspondence: ",
          correspondenceStatus,
          prepared && runtimeMetrics?.correspondenceToWorldId === section.id && Number.isFinite(runtimeMetrics?.correspondenceImprovement) ? ` · ${Math.round(runtimeMetrics.correspondenceImprovement * 100)}% RMS improvement` : "",
          "."
        ] }, void 0, true, {
          fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
          lineNumber: 1774,
          columnNumber: 11
        }, this),
        /* @__PURE__ */ jsxDEV("button", { type: "button", className: "about-editor-danger", onClick: () => store.commit("Remove World transition", (draft) => {
          const transition = draft.sections[sectionIndex].world.transitionIn;
          transition.start = 0;
          transition.end = 0;
          transition.type = "cut";
        }, { selection: { type: "world", sectionId: section.id } }), children: "Remove transition keyframes" }, void 0, false, {
          fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
          lineNumber: 1775,
          columnNumber: 11
        }, this)
      ] }, void 0, true, {
        fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
        lineNumber: 1766,
        columnNumber: 30
      }, this) : /* @__PURE__ */ jsxDEV(Fragment, { children: [
        /* @__PURE__ */ jsxDEV("p", { className: "about-editor-help", children: "This World cuts in at the Section boundary and has no transition keyframes." }, void 0, false, {
          fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
          lineNumber: 1782,
          columnNumber: 11
        }, this),
        /* @__PURE__ */ jsxDEV("button", { type: "button", className: "about-editor-wide-action", onClick: () => store.commit("Add World transition", (draft) => {
          const transition = draft.sections[sectionIndex].world.transitionIn;
          transition.start = Math.min(0.08, transitionLimit);
          transition.end = Math.min(0.68, transitionLimit);
          transition.type = "morph";
        }, { selection: { type: "world", sectionId: section.id } }), children: "Add transition keyframes" }, void 0, false, {
          fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
          lineNumber: 1783,
          columnNumber: 11
        }, this)
      ] }, void 0, true, {
        fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
        lineNumber: 1781,
        columnNumber: 15
      }, this)
    ] }, void 0, true, {
      fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
      lineNumber: 1765,
      columnNumber: 7
    }, this),
    /* @__PURE__ */ jsxDEV("details", { open: true, children: [
      /* @__PURE__ */ jsxDEV("summary", { children: "Modifier stack" }, void 0, false, {
        fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
        lineNumber: 1791,
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
                lineNumber: 1800,
                columnNumber: 105
              }, this),
              definition?.label || item.id
            ] }, void 0, true, {
              fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
              lineNumber: 1800,
              columnNumber: 98
            }, this),
            /* @__PURE__ */ jsxDEV("span", { children: [
              /* @__PURE__ */ jsxDEV("button", { type: "button", disabled: modifierIndex === 0, onClick: () => moveModifier(-1), "aria-label": "Move modifier up", children: "↑" }, void 0, false, {
                fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
                lineNumber: 1800,
                columnNumber: 334
              }, this),
              /* @__PURE__ */ jsxDEV("button", { type: "button", disabled: modifierIndex === world.modifiers.length - 1, onClick: () => moveModifier(1), "aria-label": "Move modifier down", children: "↓" }, void 0, false, {
                fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
                lineNumber: 1800,
                columnNumber: 460
              }, this),
              " Cost ",
              definition?.cost || "?"
            ] }, void 0, true, {
              fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
              lineNumber: 1800,
              columnNumber: 328
            }, this)
          ] }, void 0, true, {
            fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
            lineNumber: 1800,
            columnNumber: 93
          }, this),
          (definition?.parameters || []).map((control) => control.type === "range" ? /* @__PURE__ */ jsxDEV(NumberProperty, { label: control.label, value: item.parameters[control.id], min: control.min, max: control.max, step: control.step, unit: control.unit, onChange: (value) => update(`Change ${control.label}`, (draft) => {
            draft.modifiers[modifierIndex].parameters[control.id] = value;
          }, `modifier:${section.id}:${modifierIndex}:${control.id}`) }, control.id, false, {
            fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
            lineNumber: 1800,
            columnNumber: 732
          }, this) : /* @__PURE__ */ jsxDEV(Property, { label: control.label, children: /* @__PURE__ */ jsxDEV("select", { value: item.parameters[control.id], onChange: (event) => update(`Change ${control.label}`, (draft) => {
            draft.modifiers[modifierIndex].parameters[control.id] = event.target.value;
          }), children: control.options.map((option) => /* @__PURE__ */ jsxDEV("option", { children: option }, option, false, {
            fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
            lineNumber: 1800,
            columnNumber: 1366
          }, this)) }, void 0, false, {
            fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
            lineNumber: 1800,
            columnNumber: 1143
          }, this) }, control.id, false, {
            fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
            lineNumber: 1800,
            columnNumber: 1094
          }, this))
        ] }, `${item.id}-${modifierIndex}`, true, {
          fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
          lineNumber: 1800,
          columnNumber: 18
        }, this);
      })
    ] }, void 0, true, {
      fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
      lineNumber: 1791,
      columnNumber: 7
    }, this)
  ] }, void 0, true, {
    fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
    lineNumber: 1747,
    columnNumber: 5
  }, this);
}
_c11 = WorldInspector;
function Diagnostics({ diagnostics }) {
  if (!diagnostics.length) return /* @__PURE__ */ jsxDEV("div", { className: "about-editor-diagnostics is-clear", children: [
    /* @__PURE__ */ jsxDEV(Check, { "aria-hidden": "true" }, void 0, false, {
      fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
      lineNumber: 1808,
      columnNumber: 86
    }, this),
    " No diagnostics"
  ] }, void 0, true, {
    fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
    lineNumber: 1808,
    columnNumber: 35
  }, this);
  return /* @__PURE__ */ jsxDEV("div", { className: "about-editor-diagnostics", children: diagnostics.map((item, index) => {
    const DiagnosticIcon = item.level === "error" ? CircleAlert : Info;
    return /* @__PURE__ */ jsxDEV("div", { className: `is-${item.level}`, children: [
      /* @__PURE__ */ jsxDEV(DiagnosticIcon, { "aria-hidden": "true" }, void 0, false, {
        fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
        lineNumber: 1811,
        columnNumber: 93
      }, this),
      /* @__PURE__ */ jsxDEV("span", { children: [
        /* @__PURE__ */ jsxDEV("strong", { children: item.message }, void 0, false, {
          fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
          lineNumber: 1811,
          columnNumber: 136
        }, this),
        /* @__PURE__ */ jsxDEV("small", { children: item.path }, void 0, false, {
          fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
          lineNumber: 1811,
          columnNumber: 167
        }, this)
      ] }, void 0, true, {
        fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
        lineNumber: 1811,
        columnNumber: 130
      }, this)
    ] }, `${item.code}-${item.path}-${index}`, true, {
      fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
      lineNumber: 1811,
      columnNumber: 14
    }, this);
  }) }, void 0, false, {
    fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
    lineNumber: 1809,
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
      lineNumber: 1851,
      columnNumber: 7
    }, this),
    /* @__PURE__ */ jsxDEV("div", { className: "about-editor-audition-range", children: [
      /* @__PURE__ */ jsxDEV(Property, { label: "Pre-roll", children: /* @__PURE__ */ jsxDEV("input", { type: "number", min: "0", max: "2", step: "0.05", value: preRollWU, onChange: (event) => setPreRollWU(Math.max(0, Number(event.target.value) || 0)) }, void 0, false, {
        fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
        lineNumber: 1853,
        columnNumber: 36
      }, this) }, void 0, false, {
        fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
        lineNumber: 1853,
        columnNumber: 9
      }, this),
      /* @__PURE__ */ jsxDEV(Property, { label: "Post-roll", children: /* @__PURE__ */ jsxDEV("input", { type: "number", min: "0", max: "2", step: "0.05", value: postRollWU, onChange: (event) => setPostRollWU(Math.max(0, Number(event.target.value) || 0)) }, void 0, false, {
        fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
        lineNumber: 1854,
        columnNumber: 37
      }, this) }, void 0, false, {
        fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
        lineNumber: 1854,
        columnNumber: 9
      }, this)
    ] }, void 0, true, {
      fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
      lineNumber: 1852,
      columnNumber: 7
    }, this),
    range.valid ? /* @__PURE__ */ jsxDEV("p", { className: "about-editor-help", children: [
      formatWU(range.startWU),
      " → ",
      formatWU(range.endWU),
      " · ambient motion freezes for a repeatable review."
    ] }, void 0, true, {
      fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
      lineNumber: 1856,
      columnNumber: 22
    }, this) : /* @__PURE__ */ jsxDEV("p", { className: "about-editor-rhythm-message is-error", children: range.reason }, void 0, false, {
      fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
      lineNumber: 1856,
      columnNumber: 163
    }, this),
    /* @__PURE__ */ jsxDEV("button", { type: "button", className: active ? "is-active about-editor-wide-action" : "about-editor-wide-action", disabled: !range.valid, onClick: toggle, children: active ? "Stop audition" : "Loop this selection" }, void 0, false, {
      fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
      lineNumber: 1857,
      columnNumber: 7
    }, this)
  ] }, void 0, true, {
    fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
    lineNumber: 1850,
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
    lineNumber: 1869,
    columnNumber: 17
  }, this);
  if (snapshot.selection.type === "sequence") content = /* @__PURE__ */ jsxDEV(SequenceInspector, { store, snapshot }, void 0, false, {
    fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
    lineNumber: 1870,
    columnNumber: 57
  }, this);
  if (snapshot.selection.type === "cue") content = /* @__PURE__ */ jsxDEV(CueInspector, { store, snapshot, section, clipboard, setClipboard }, void 0, false, {
    fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
    lineNumber: 1871,
    columnNumber: 52
  }, this);
  if (snapshot.selection.type === "discipline-reveal") content = /* @__PURE__ */ jsxDEV(DisciplineRevealInspector, { store, snapshot, section }, void 0, false, {
    fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
    lineNumber: 1872,
    columnNumber: 66
  }, this);
  if (snapshot.selection.type === "camera-key") content = /* @__PURE__ */ jsxDEV(CameraInspector, { store, snapshot, section }, void 0, false, {
    fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
    lineNumber: 1873,
    columnNumber: 59
  }, this);
  if (snapshot.selection.type === "world") content = /* @__PURE__ */ jsxDEV(WorldInspector, { store, snapshot, section, runtimeMetrics }, void 0, false, {
    fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
    lineNumber: 1874,
    columnNumber: 54
  }, this);
  if (snapshot.selection.type === "interaction") content = /* @__PURE__ */ jsxDEV(SectionInspector, { store, snapshot, section }, void 0, false, {
    fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
    lineNumber: 1875,
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
          lineNumber: 1975,
          columnNumber: 63
        }, this),
        /* @__PURE__ */ jsxDEV(Diagnostics, { diagnostics: snapshot.diagnostics }, void 0, false, {
          fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
          lineNumber: 1975,
          columnNumber: 117
        }, this)
      ] }, void 0, true, {
        fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
        lineNumber: 1975,
        columnNumber: 7
      }, this)
    },
    void 0,
    false,
    {
      fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
      lineNumber: 1958,
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
        lineNumber: 1984,
        columnNumber: 12
      }, this),
      /* @__PURE__ */ jsxDEV("span", { children: [
        formatWU(snapshot.transport.storyWU),
        " / ",
        formatWU(total)
      ] }, void 0, true, {
        fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
        lineNumber: 1984,
        columnNumber: 52
      }, this)
    ] }, void 0, true, {
      fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
      lineNumber: 1984,
      columnNumber: 7
    }, this),
    /* @__PURE__ */ jsxDEV("svg", { viewBox: "0 0 240 112", role: "img", "aria-label": "Camera and World anchors over story distance", children: [
      /* @__PURE__ */ jsxDEV("path", { d: "M18 56 H222" }, void 0, false, {
        fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
        lineNumber: 1986,
        columnNumber: 9
      }, this),
      sections.map((section) => {
        const x = 18 + section.startWU / total * 204;
        return /* @__PURE__ */ jsxDEV("g", { transform: `translate(${x} 56)`, children: [
          /* @__PURE__ */ jsxDEV("line", { y1: "-12", y2: "12" }, void 0, false, {
            fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
            lineNumber: 1989,
            columnNumber: 71
          }, this),
          /* @__PURE__ */ jsxDEV("circle", { r: section.worldState?.changesWorld ? 4 : 2 }, void 0, false, {
            fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
            lineNumber: 1989,
            columnNumber: 96
          }, this),
          /* @__PURE__ */ jsxDEV("title", { children: [
            section.label,
            section.worldState?.changesWorld ? ` · ${section.worldState.activeWorld.shapeId}` : ""
          ] }, void 0, true, {
            fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
            lineNumber: 1989,
            columnNumber: 151
          }, this)
        ] }, section.id, true, {
          fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
          lineNumber: 1989,
          columnNumber: 18
        }, this);
      }),
      /* @__PURE__ */ jsxDEV("g", { className: "is-playhead", transform: `translate(${18 + snapshot.transport.storyWU / total * 204} 56)`, children: [
        /* @__PURE__ */ jsxDEV("path", { d: "M0 -22 L5 -15 H-5 Z" }, void 0, false, {
          fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
          lineNumber: 1991,
          columnNumber: 113
        }, this),
        /* @__PURE__ */ jsxDEV("line", { y1: "-15", y2: "22" }, void 0, false, {
          fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
          lineNumber: 1991,
          columnNumber: 145
        }, this)
      ] }, void 0, true, {
        fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
        lineNumber: 1991,
        columnNumber: 9
      }, this)
    ] }, void 0, true, {
      fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
      lineNumber: 1985,
      columnNumber: 7
    }, this),
    /* @__PURE__ */ jsxDEV("small", { children: "Dots are Section boundaries. Large dots are fixed World anchors. The marker is the published camera." }, void 0, false, {
      fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
      lineNumber: 1993,
      columnNumber: 7
    }, this)
  ] }, void 0, true, {
    fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
    lineNumber: 1983,
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
  const selected = snapshot.selection.type === "sequence" ? null : getSection(snapshot.document, snapshot.selection);
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

//# sourceMappingURL=data:application/json;base64,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QUFBO0FBQUE7QUFBQTtBQUFBO0FBQUEsSUE2RUE7QUFBQSxJQUNDdGpCLFNBQVNncUI7QUFBQUEsRUFBSTtBQUNsQjtBQUFDcEgsSUF4U3VCSCxzQkFBb0I7QUFBQSxPQUFwQkE7QUFBb0IsSUFBQTlaLElBQUFLLEtBQUFVLEtBQUFZLEtBQUEyZixLQUFBbFUsS0FBQWlCLEtBQUFrQixLQUFBZ1MsS0FBQTNQLEtBQUFTLEtBQUE2QixNQUFBdUMsTUFBQU0sTUFBQXlLLE1BQUFDLE1BQUE1SCxNQUFBNkg7QUFBQSxhQUFBMWhCLElBQUE7QUFBQSxhQUFBSyxLQUFBO0FBQUEsYUFBQVUsS0FBQTtBQUFBLGFBQUFZLEtBQUE7QUFBQSxhQUFBMmYsS0FBQTtBQUFBLGFBQUFsVSxLQUFBO0FBQUEsYUFBQWlCLEtBQUE7QUFBQSxhQUFBa0IsS0FBQTtBQUFBLGFBQUFnUyxLQUFBO0FBQUEsYUFBQTNQLEtBQUE7QUFBQSxhQUFBUyxLQUFBO0FBQUEsYUFBQTZCLE1BQUE7QUFBQSxhQUFBdUMsTUFBQTtBQUFBLGFBQUFNLE1BQUE7QUFBQSxhQUFBeUssTUFBQTtBQUFBLGFBQUFDLE1BQUE7QUFBQSxhQUFBNUgsTUFBQTtBQUFBLGFBQUE2SCxNQUFBIiwibmFtZXMiOlsidXNlRWZmZWN0IiwidXNlUmVmIiwidXNlU3RhdGUiLCJ1c2VTeW5jRXh0ZXJuYWxTdG9yZSIsImNyZWF0ZVBvcnRhbCIsIkNoZWNrIiwiQ2hldnJvbkRvd24iLCJDaGV2cm9uTGVmdCIsIkNoZXZyb25SaWdodCIsIkNoZXZyb25VcCIsIkNpcmNsZUFsZXJ0IiwiRGlhbW9uZCIsIkluZm8iLCJMb2NrS2V5aG9sZSIsIlBhdXNlIiwiUGxheSIsIlNraXBCYWNrIiwiU2tpcEZvcndhcmQiLCJUcmFzaDIiLCJBQk9VVF9OQVJSQVRJVkVfR0xPQkFMX0NPTlRST0xTIiwiQUJPVVRfTkFSUkFUSVZFX0NPUlJFU1BPTkRFTkNFX01PREVTIiwiQUJPVVRfTkFSUkFUSVZFX0RJU0NJUExJTkVfUkVWRUFMX0NPTlRST0xTIiwiQUJPVVRfTkFSUkFUSVZFX0VNUEhBU0lTX1RPTkVTIiwiQUJPVVRfTkFSUkFUSVZFX01PRElGSUVSX0RFRklOSVRJT05TIiwiQUJPVVRfTkFSUkFUSVZFX1NIQVBFX0RFRklOSVRJT05TIiwiY2xlYXJBYm91dE5hcnJhdGl2ZVJlY292ZXJ5RHJhZnQiLCJleHBvcnRBYm91dE5hcnJhdGl2ZURvY3VtZW50IiwibG9hZEFib3V0TmFycmF0aXZlU291cmNlIiwicmVhZEFib3V0TmFycmF0aXZlQ2hlY2twb2ludHMiLCJyZWFkQWJvdXROYXJyYXRpdmVSZWNvdmVyeURyYWZ0Iiwic2F2ZUFib3V0TmFycmF0aXZlU291cmNlIiwid3JpdGVBYm91dE5hcnJhdGl2ZUNoZWNrcG9pbnQiLCJ3cml0ZUFib3V0TmFycmF0aXZlUmVjb3ZlcnlEcmFmdCIsImFzc2VydFZhbGlkQWJvdXROYXJyYXRpdmVEb2N1bWVudCIsImNsb25lQWJvdXROYXJyYXRpdmVEb2N1bWVudCIsImdldEFib3V0TmFycmF0aXZlQ3VlTW92ZW1lbnQiLCJnZXRBYm91dE5hcnJhdGl2ZUN1ZU1vdGlvbkludGVydmFsIiwiZ2V0QWJvdXROYXJyYXRpdmVXb3JsZFRyYW5zaXRpb25MaW1pdCIsInNhbXBsZUFib3V0TmFycmF0aXZlUGxhbiIsImNhcHR1cmVBYm91dE5hcnJhdGl2ZVBsYXloZWFkQ29udGV4dCIsImNyZWF0ZUFib3V0TmFycmF0aXZlQ3VlQ2xpcGJvYXJkUGF5bG9hZCIsImRlcml2ZUFib3V0TmFycmF0aXZlTG9vcFJhbmdlIiwiZHVwbGljYXRlQWJvdXROYXJyYXRpdmVDdWVHcm91cCIsImR1cGxpY2F0ZUFib3V0TmFycmF0aXZlU2VjdGlvbiIsImdldEFib3V0TmFycmF0aXZlQ2FtZXJhS2V5VGltaW5nQm91bmRzIiwiZ2V0QWJvdXROYXJyYXRpdmVDdWVUaW1pbmdCb3VuZHMiLCJnZXRBYm91dE5hcnJhdGl2ZUV4dGVudEZpZWxkIiwiZ2V0QWJvdXROYXJyYXRpdmVTZWxlY3Rpb25NZW1iZXJzIiwibW92ZUFib3V0TmFycmF0aXZlQ3VlVGltaW5nIiwicmVtYXBBYm91dE5hcnJhdGl2ZVBsYXloZWFkQ29udGV4dCIsInJlc29sdmVBYm91dE5hcnJhdGl2ZUNhbWVyYUtleURyb3AiLCJyZXNvbHZlQWJvdXROYXJyYXRpdmVDdWVEaXN0cmlidXRpb24iLCJyZXNvbHZlQWJvdXROYXJyYXRpdmVDdWVFeGFjdEdhcCIsInJlc29sdmVBYm91dE5hcnJhdGl2ZUN1ZUdyb3VwTW92ZSIsInJlc29sdmVBYm91dE5hcnJhdGl2ZUN1ZUdyb3VwQWxpZ24iLCJyZXNvbHZlQWJvdXROYXJyYXRpdmVDdWVHcm91cFBhc3RlIiwic25hcEFib3V0TmFycmF0aXZlVGltZWxpbmVWYWx1ZSIsInN0aXRjaEFib3V0TmFycmF0aXZlQ2FtZXJhQm91bmRhcmllcyIsInRvZ2dsZUFib3V0TmFycmF0aXZlQ3VlU2VsZWN0aW9uIiwidmFsaWRhdGVBYm91dE5hcnJhdGl2ZUN1ZUNsaXBib2FyZFBheWxvYWQiLCJjbGFtcDAxIiwidmFsdWUiLCJNYXRoIiwibWluIiwibWF4IiwiQUJPVVRfRURJVE9SX1RJTUVMSU5FX1NUT1JBR0VfS0VZIiwiVElNRUxJTkVfS0VZX0VQU0lMT04iLCJJTlNQRUNUT1JfRURHRV9HQVAiLCJDQU1FUkFfUE9TRV9GSUVMRFMiLCJTZXQiLCJESVNDSVBMSU5FX1JFVkVBTF9NQVgiLCJmaW5kIiwiY29udHJvbCIsImlkIiwiRElTQ0lQTElORV9CQUxMX1RPS0VOX0JZX0dST1VQIiwiT2JqZWN0IiwiZnJlZXplIiwiVElNRUxJTkVfR0xPQkFMX1RSQUNLUyIsImxhbmUiLCJsYWJlbCIsImdyb3VwSWRzIiwiY2FtZXJhUG9zZUNoYW5nZXMiLCJmcm9tIiwidG8iLCJzb21lIiwiZmllbGQiLCJpbmRleCIsImFicyIsImZvdiIsInJvbGwiLCJjb3B5Q2FtZXJhUG9zZSIsInRhcmdldCIsInNvdXJjZSIsIm9mZnNldCIsImxvb2tBdE9mZnNldCIsImxpbmtDYW1lcmFCb3VuZGFyeSIsImRvY3VtZW50Iiwic2VjdGlvbkluZGV4Iiwia2V5SW5kZXgiLCJzZWN0aW9uIiwic2VjdGlvbnMiLCJrZXkiLCJjYW1lcmEiLCJrZXlzIiwiYXQiLCJsZW5ndGgiLCJicmlkZ2VDYW1lcmFTZWN0aW9uIiwiZ2V0SW5zcGVjdG9yVmVydGljYWxCb3VuZHMiLCJpbnNwZWN0b3IiLCJ0aW1lbGluZU9wZW4iLCJlZGl0b3IiLCJjbG9zZXN0Iiwic3R5bGVzIiwiZ2V0Q29tcHV0ZWRTdHlsZSIsInRvcGJhckhlaWdodCIsIk51bWJlciIsInBhcnNlRmxvYXQiLCJnZXRQcm9wZXJ0eVZhbHVlIiwidGltZWxpbmVIZWlnaHQiLCJidXR0b25CYXJUb3AiLCJxdWVyeVNlbGVjdG9yIiwiZ2V0Qm91bmRpbmdDbGllbnRSZWN0IiwidG9wIiwid2luZG93IiwiaW5uZXJIZWlnaHQiLCJtaW5Ub3AiLCJtYXhCb3R0b20iLCJjbGFtcEluc3BlY3RvclBvc2l0aW9uIiwicG9zaXRpb24iLCJtYXhXaWR0aCIsImlubmVyV2lkdGgiLCJ3aWR0aCIsImF2YWlsYWJsZUhlaWdodCIsImhlaWdodCIsIm1heExlZnQiLCJtYXhUb3AiLCJsZWZ0IiwiZ2V0U2VjdGlvbkluZGV4Iiwic2VjdGlvbklkIiwiZmluZEluZGV4IiwiZ2V0U2VjdGlvbiIsInNlbGVjdGlvbiIsImdldExvY2FsUHJvZ3Jlc3MiLCJwbGFuIiwic3RvcnlXVSIsImNvbXBpbGVkIiwiaXRlbSIsInN0YXJ0V1UiLCJ0cmF2ZWxXVSIsImZvcm1hdFdVIiwidG9GaXhlZCIsImZvcm1hdENhbWVyYVBlcmNlbnQiLCJpc1RleHRFZGl0aW5nVGFyZ2V0IiwiSFRNTEVsZW1lbnQiLCJtYXRjaGVzIiwiaXNDb250ZW50RWRpdGFibGUiLCJnZXRUaW1lbGluZUtleWZyYW1lcyIsInNuYXBzaG90IiwiY29tcGlsZWRQbGFuIiwiZXZlbnRzIiwiZm9yRWFjaCIsInRvU3RvcnlXVSIsInB1c2giLCJwcmlvcml0eSIsInR5cGUiLCJ3b3JsZCIsIm1vZGUiLCJ0cmFuc2l0aW9uSW4iLCJwYXJ0IiwicGFydEluZGV4Iiwia2V5UGFydCIsInRleHQiLCJjdWVzIiwiY3VlIiwiY3VlSW5kZXgiLCJob2xkIiwiY3VlSWQiLCJkaXNjaXBsaW5lUmV2ZWFsIiwic3RhcnQiLCJpbnRlcmFjdGlvbiIsImlzRmluaXRlIiwiYWN0aXZhdGlvblN0YXJ0Iiwic29ydCIsImEiLCJiIiwiZ2V0VGltZWxpbmVEZWxldGlvbiIsInJlcXVpcmVkIiwiZGlzYWJsZWQiLCJtZXNzYWdlIiwiZXhlY3V0ZSIsInN0b3JlIiwiY29tbWl0IiwiZHJhZnQiLCJzcGxpY2UiLCJzdGFydHNXaXRoIiwidHJhbnNpdGlvbiIsImVuZCIsImRlbGV0ZVRpbWVsaW5lU2VsZWN0aW9uIiwiZGVsZXRpb24iLCJzZXRTYXZlU3RhdGUiLCJzZWVrVGltZWxpbmVLZXlmcmFtZSIsImV2ZW50Iiwic2V0U2VsZWN0aW9uIiwic2V0VHJhbnNwb3J0Iiwib3duZXIiLCJwbGF5aW5nIiwianVtcFRpbWVsaW5lS2V5ZnJhbWUiLCJkaXJlY3Rpb24iLCJjdXJyZW50V1UiLCJ0cmFuc3BvcnQiLCJ0YXJnZXRQb3NpdGlvbiIsInJldmVyc2UiLCJtYWtlU2x1ZyIsInRvTG93ZXJDYXNlIiwicmVwbGFjZSIsIm5leHRJZCIsImJhc2UiLCJ1c2VkIiwiZmxhdE1hcCIsIm1hcCIsImJsb2NrcyIsImJsb2NrIiwic3VmZml4IiwiaGFzIiwicmVwbGFjZURyYWZ0RG9jdW1lbnQiLCJuZXh0RG9jdW1lbnQiLCJhc3NpZ24iLCJhcHBseUN1ZU1vdmVzIiwibW92ZXMiLCJtb3ZlIiwiZW50ZXIiLCJleGl0IiwiUHJvcGVydHkiLCJjaGlsZHJlbiIsImhpbnQiLCJfYyIsIk51bWJlclByb3BlcnR5Iiwic3RlcCIsIm9uQ2hhbmdlIiwidW5pdCIsIl9jMiIsIlJhbmdlUHJvcGVydHkiLCJvblN0YXJ0Q2hhbmdlIiwib25FbmRDaGFuZ2UiLCJzdGFydFBlcmNlbnQiLCJlbmRQZXJjZW50IiwicGVyY2VudGFnZVN0ZXAiLCJzZXRTdGFydCIsInNldEVuZCIsInJvdW5kIiwiX2MzIiwiVHJhbnNwb3J0IiwibWF4V1UiLCJtYXhTdG9yeVdVIiwicGxheSIsInNlZWsiLCJzZWxlY3RlZCIsImp1bXBTZWN0aW9uIiwibmV4dCIsImxpdmVBbWJpZW50IiwicHJldmlld1Byb2ZpbGUiLCJzZXRQcmV2aWV3UHJvZmlsZSIsIl9jNCIsIlRpbWVsaW5lIiwib25PcGVuR2xvYmFsIiwiX3MiLCJzZWxlY3RlZEN1ZU1lbWJlcnMiLCJyZWR1Y2UiLCJzdW0iLCJleHRlbnRXVSIsInBsYXloZWFkIiwibGFuZXNSZWYiLCJ0aW1pbmdEcmFnUmVmIiwicHJldmlld0ZyYW1lUmVmIiwicGVuZGluZ1ByZXZpZXdSZWYiLCJzdXBwcmVzc2VkQ2xpY2tSZWYiLCJjYW1lcmFEcmFnUHJldmlldyIsInNldENhbWVyYURyYWdQcmV2aWV3Iiwic2VjdGlvblJlc2l6ZVByZXZpZXciLCJzZXRTZWN0aW9uUmVzaXplUHJldmlldyIsIm1hcnF1ZWUiLCJzZXRNYXJxdWVlIiwicXVldWVQcmV2aWV3RnJhbWUiLCJjYWxsYmFjayIsImN1cnJlbnQiLCJyZXF1ZXN0QW5pbWF0aW9uRnJhbWUiLCJwZW5kaW5nIiwiZmx1c2hQcmV2aWV3RnJhbWUiLCJjYW5jZWxBbmltYXRpb25GcmFtZSIsInpvb21UaW1lbGluZSIsImN0cmxLZXkiLCJtZXRhS2V5IiwicHJldmVudERlZmF1bHQiLCJsYW5lcyIsInJlY3QiLCJwb2ludGVyWCIsImNsaWVudFgiLCJzdG9yeVJhdGlvIiwic2Nyb2xsTGVmdCIsInNjcm9sbFdpZHRoIiwiY3VycmVudFpvb20iLCJ6b29tIiwibmV4dFpvb20iLCJleHAiLCJkZWx0YVkiLCJyZXNvbHZlQ2FtZXJhRHJvcEF0Q2xpZW50WCIsImdldFNuYXBzaG90IiwidmFsaWQiLCJyZWFzb24iLCJjb250ZW50WCIsImRyYWciLCJkcm9wIiwic291cmNlU2VjdGlvbkluZGV4Iiwic291cmNlS2V5SW5kZXgiLCJiZWdpblRpbWluZ0RyYWciLCJsb2NrZWQiLCJidXR0b24iLCJjbGlwIiwiY3VycmVudFRhcmdldCIsInBhcmVudEVsZW1lbnQiLCJzdG9wUHJvcGFnYXRpb24iLCJzZXRQb2ludGVyQ2FwdHVyZSIsInBvaW50ZXJJZCIsIm5leHRTZWxlY3Rpb24iLCJjdXJyZW50U2VsZWN0aW9uIiwiY3VycmVudE1lbWJlcnMiLCJhbHJlYWR5U2VsZWN0ZWQiLCJtZW1iZXIiLCJzaGlmdEtleSIsIm1lbWJlcnMiLCJiZWdpblByZXZpZXciLCJzdGFydERvY3VtZW50Iiwic3RhcnRQbGFuIiwic3RhcnRYIiwibW92ZWQiLCJsYXN0QXQiLCJsYXN0RHJvcCIsIm1vdmVUaW1pbmdEcmFnIiwidG9rZW4iLCJkZWx0YUxhbmUiLCJuZXh0QXQiLCJkZWx0YSIsInJldmVhbCIsImNvYWxlc2NlS2V5Iiwic2VjdGlvblN0YXJ0V1UiLCJsb2NhbERlbHRhIiwibW92ZW1lbnQiLCJwcmltYXJ5IiwiZGVsdGFXVSIsImxhc3REZWx0YVdVIiwidXBkYXRlUHJldmlldyIsImVuZFRpbWluZ0RyYWciLCJoYXNQb2ludGVyQ2FwdHVyZSIsInJlbGVhc2VQb2ludGVyQ2FwdHVyZSIsImNhbmNlbFByZXZpZXciLCJjb21taXRQcmV2aWV3Iiwic291cmNlS2V5cyIsIm1vdmVkS2V5IiwiZGVzdGluYXRpb25LZXlzIiwic2V0VGltZW91dCIsImhhbmRsZVRpbWluZ0NsaWNrIiwiYWN0aW9uIiwiYmVnaW5TZWN0aW9uUmVzaXplIiwiZGF0YSIsInNlY3Rpb25MYWJlbCIsInN0YXJ0RXh0ZW50Iiwic3RhcnRNYXhXVSIsInN0YXJ0U2Nyb2xsV2lkdGgiLCJwbGF5aGVhZENvbnRleHQiLCJyZXNpemVkU2VjdGlvbklkIiwiZXh0ZW50IiwibW92ZVNlY3Rpb25SZXNpemUiLCJyYXdFeHRlbnQiLCJhbHRLZXkiLCJsYXN0RXh0ZW50IiwiZW5kU2VjdGlvblJlc2l6ZSIsInJlc2V0U2VjdGlvbkV4dGVudCIsImJhc2VsaW5lU2VjdGlvbiIsImJhc2VsaW5lRG9jdW1lbnQiLCJjb250ZXh0IiwiYmVnaW5NYXJxdWVlIiwiY2FudmFzIiwic3RhcnRDbGllbnRYIiwic3RhcnRDbGllbnRZIiwiY2xpZW50WSIsImNhbnZhc1JlY3QiLCJhZGRpdGl2ZSIsIm1vdmVNYXJxdWVlIiwiZW5kTWFycXVlZSIsInNlbGVjdGlvblJlY3QiLCJyaWdodCIsImJvdHRvbSIsImxhbmVSZWN0IiwiaGl0cyIsInF1ZXJ5U2VsZWN0b3JBbGwiLCJmaWx0ZXIiLCJub2RlIiwidmlzaWJsZSIsImRhdGFzZXQiLCJzbGljZSIsImhpdCIsInRyYWNrIiwidHJhY2tMYWJlbCIsInNvbG9UcmFjayIsIm5leHRTdGFydFdVIiwic3BhbldVIiwiaW5TZWxlY3RlZFNlY3Rpb24iLCJsb2NhbFBlcmNlbnQiLCJsb2NhbFBvc2l0aW9uIiwiZXh0ZW5kZWRMb2NhbFBvc2l0aW9uIiwiZXh0ZW5kZWRMb2NhbFdpZHRoIiwidGV4dFBvc2l0aW9uIiwic2VsZWN0QXQiLCJpc1NlbGVjdGVkIiwicmVzaXplRXh0ZW50IiwicmVzb2x2ZWRFeHRlbnRXVSIsIlN0cmluZyIsInBhZFN0YXJ0IiwiZnJvbUtleSIsInRpbWluZ0JvdW5kcyIsImtleVNlbGVjdGlvbiIsInVuZGVmaW5lZCIsInNoYXBlSWQiLCJpc1ByaW1hcnkiLCJtb3Rpb25JbnRlcnZhbCIsImdsb2JhbHMiLCJ0ZXh0TW90aW9uIiwibW90aW9uU3BhbiIsImN1ZVN0eWxlIiwiZm9jdXNQb3NpdGlvbiIsImN1ZVNlbGVjdGlvbiIsImNvZGUiLCJkdXJhdGlvbiIsImNlbnRyZSIsInJldmVhbFNlbGVjdGlvbiIsImFjdGl2YXRpb24iLCJTZXF1ZW5jZUluc3BlY3RvciIsImNvbW1pdEdsb2JhbCIsImdyb3VwIiwidGFyZ2V0S2V5IiwicmVxdWVzdGVkR3JvdXBJZHMiLCJncm91cHMiLCJpbmNsdWRlcyIsImhlYWRpbmciLCJjb250cm9scyIsInJlYWRhYmxlU3RhcnQiLCJyZWFkYWJsZUVuZCIsIl9jNiIsIlNlY3Rpb25JbnNwZWN0b3IiLCJjb21waWxlZFNlY3Rpb24iLCJhY3RpdmVFeHRlbnRGaWVsZCIsImFjdGl2ZUV4dGVudCIsInJlc29sdmVkRXh0ZW50IiwiY29udGVudE1pbmltdW1BY3RpdmUiLCJ1cGRhdGUiLCJtdXRhdGUiLCJ0b0luZGV4IiwiZHVwbGljYXRlIiwicmVzdWx0IiwibW9iaWxlRXh0ZW50V1UiLCJsb2NhbCIsImZvY3VzIiwicHJlc2V0IiwibW90aW9uIiwiX2M3IiwiRWRpdG9yaWFsQmxvY2tzIiwidXBkYXRlQmxvY2siLCJibG9ja0luZGV4IiwidXBkYXRlRW1waGFzaXMiLCJlbXBoYXNpc0luZGV4IiwiZW1waGFzaXMiLCJhZGRFbXBoYXNpcyIsInRyaW0iLCJzcGxpdCIsImpvaW4iLCJ0b25lIiwicmVtb3ZlRW1waGFzaXMiLCJraW5kIiwid29ybGRJbmZsdWVuY2UiLCJjaGVja2VkIiwiaXRlbXMiLCJCb29sZWFuIiwiX2M4IiwiQ3VlUmh5dGhtQW5kUmV1c2UiLCJjbGlwYm9hcmQiLCJzZXRDbGlwYm9hcmQiLCJfczIiLCJnYXBXVSIsInNldEdhcFdVIiwiYW5jaG9yIiwic2V0QW5jaG9yIiwicHJldmlldyIsInNldFByZXZpZXciLCJzZXRNZXNzYWdlIiwicHJldmlld01vdmVzIiwidHJ5U3RhdGUiLCJjYW5jZWxUcnkiLCJiZWdpblRyeSIsImFwcGx5UHJldmlldyIsImFwcGx5VHJ5IiwiY29tbWl0Q2FuZGlkYXRlIiwiZGlzdHJpYnV0ZSIsImV4YWN0R2FwIiwiYWxpZ25QcmltYXJ5IiwicGxheWhlYWRXVSIsImNvcHkiLCJwYXlsb2FkIiwidmFsaWRhdGlvbiIsInBhc3RlIiwiZGVzdGluYXRpb25TZWN0aW9uSWQiLCJnaG9zdE1vdmVzIiwiQ3VlSW5zcGVjdG9yIiwic2VsZWN0ZWRNZW1iZXJzIiwicmVtb3ZlIiwibW92ZUN1ZSIsInBlcmNlbnQiLCJ1cGRhdGVNb3ZlbWVudCIsIm1lbWJlclNlY3Rpb24iLCJtZW1iZXJDdWUiLCJfYzAiLCJEaXNjaXBsaW5lUmV2ZWFsSW5zcGVjdG9yIiwib2NjdXBpZWQiLCJzdGFnZ2VyIiwibGFiZWxEdXJhdGlvbiIsImxpbWl0c0ZvciIsImxpbWl0cyIsIml0ZW1JbmRleCIsImJhY2tncm91bmQiLCJfYzEiLCJDYW1lcmFJbnNwZWN0b3IiLCJzZWxlY3RlZEtleSIsInRhcmdldEF0IiwiYXBwbHlQcmVzZXQiLCJyZWNpcGVzIiwiUHVzaCIsImVhc2luZyIsIkdsaWRlIiwiT3JiaXQiLCJSZXZlYWwiLCJSZXNvbHZlIiwiZXhpc3RpbmdLZXlBdFBsYXloZWFkIiwic2V0S2V5IiwiaW5zZXJ0aW9uSW5kZXgiLCJzZWxlY3RlZEtleUluZGV4Iiwic2FtcGxlZCIsImJhc2VaIiwic3RhcnRaIiwiY2FkZW5jZSIsIm5ld0tleSIsImF4aXMiLCJuYW1lIiwiQXJyYXkiLCJpc0FycmF5IiwidXBkYXRlVmVjdG9yIiwiZXh0ZW50RmllbGQiLCJleHRlbnRMYWJlbCIsInVwZGF0ZUV4dGVudCIsIl9jMTAiLCJDT1JSRVNQT05ERU5DRV9MQUJFTFMiLCJXb3JsZEluc3BlY3RvciIsInJ1bnRpbWVNZXRyaWNzIiwic2hhcGUiLCJ0cmFuc2l0aW9uTGltaXQiLCJ0cmFuc2l0aW9uTWF4IiwidHJhbnNpdGlvbkVuYWJsZWQiLCJjb3JyZXNwb25kZW5jZUVuYWJsZWQiLCJwcmV2aW91c1dvcmxkU2VjdGlvbiIsInNvdXJjZVNoYXBlIiwicHJlcGFyZWQiLCJwcmVwYXJlZFdvcmxkSWRzIiwiY29ycmVzcG9uZGVuY2VTdGF0dXMiLCJjb3JyZXNwb25kZW5jZVNlcXVlbmNlU3RhdGUiLCJjb3JyZXNwb25kZW5jZUZhbGxiYWNrIiwiY29ycmVzcG9uZGVuY2VUb1dvcmxkSWQiLCJ0cnlTaGFwZSIsInNoYXBlUGFyYW1ldGVycyIsImZyb21FbnRyaWVzIiwicGFyYW1ldGVycyIsInZhbHVlcyIsImNvc3QiLCJzZWVkIiwiZmxvb3IiLCJyYW5kb20iLCJlbnRyeURpc3RhbmNlV1UiLCJ0cmFuc2Zvcm0iLCJzY2FsZSIsImNvcnJlc3BvbmRlbmNlIiwiY29ycmVzcG9uZGVuY2VJbXByb3ZlbWVudCIsIm1vZGlmaWVycyIsIm1vZGlmaWVySW5kZXgiLCJkZWZpbml0aW9uIiwibW92ZU1vZGlmaWVyIiwibmV4dEluZGV4IiwiZW5hYmxlZCIsIm9wdGlvbnMiLCJvcHRpb24iLCJfYzExIiwiRGlhZ25vc3RpY3MiLCJkaWFnbm9zdGljcyIsIkRpYWdub3N0aWNJY29uIiwibGV2ZWwiLCJwYXRoIiwiX2MxMiIsIkF1ZGl0aW9uQ29udHJvbHMiLCJfczMiLCJwcmVSb2xsV1UiLCJzZXRQcmVSb2xsV1UiLCJwb3N0Um9sbFdVIiwic2V0UG9zdFJvbGxXVSIsInJhbmdlIiwiYWN0aXZlIiwibG9vcCIsInNvdXJjZVR5cGUiLCJzb3VyY2VJZCIsInRvZ2dsZSIsImVuZFdVIiwiSW5zcGVjdG9yIiwiX3M0IiwiaW5zcGVjdG9yUmVmIiwiZHJhZ1JlZiIsImxhc3RIZWFkZXJDbGlja1JlZiIsInNldFBvc2l0aW9uIiwiZHJhZ2dpbmciLCJzZXREcmFnZ2luZyIsImNvbnRlbnQiLCJrZWVwSW5Cb3VuZHMiLCJhZGRFdmVudExpc3RlbmVyIiwicmVtb3ZlRXZlbnRMaXN0ZW5lciIsImJlZ2luRHJhZyIsImZsb2F0aW5nSGVpZ2h0Iiwib3JpZ2luWCIsIm9yaWdpblkiLCJtb3ZlRHJhZyIsImRlbHRhWCIsImh5cG90IiwiZW5kRHJhZyIsIm5vdyIsInBlcmZvcm1hbmNlIiwicHJldmlvdXMiLCJ0aW1lIiwieCIsInkiLCJyZXNldFBvc2l0aW9uIiwiQ2FtZXJhUGF0aE92ZXJsYXkiLCJ0b3RhbCIsIndvcmxkU3RhdGUiLCJjaGFuZ2VzV29ybGQiLCJhY3RpdmVXb3JsZCIsIl9jMTUiLCJBYm91dE5hcnJhdGl2ZUVkaXRvciIsInJ1bnRpbWVSZWYiLCJyb290UmVmIiwiX3M1Iiwic3Vic2NyaWJlIiwiY2hlY2twb2ludHMiLCJzZXRDaGVja3BvaW50cyIsInNldFJ1bnRpbWVNZXRyaWNzIiwicGF0aFZpc2libGUiLCJzZXRQYXRoVmlzaWJsZSIsImRpcmVjdG9yVmlldyIsInNldERpcmVjdG9yVmlldyIsIm1vYmlsZVBhbmUiLCJzZXRNb2JpbGVQYW5lIiwic2V0VGltZWxpbmVPcGVuIiwibG9jYWxTdG9yYWdlIiwiZ2V0SXRlbSIsImltcG9ydFJlZiIsInNuYXBzaG90UmVmIiwiYWN0aXZlU2VsZWN0aW9uIiwic2V0SXRlbSIsInJvb3QiLCJydW50aW1lIiwic2V0QXR0cmlidXRlIiwidGhlbiIsImhhc2giLCJkaXJ0eSIsInJlcGxhY2VEb2N1bWVudCIsInNldEJhc2VsaW5lIiwicmVjb3ZlcnkiLCJ0aW1lc3RhbXAiLCJEYXRlIiwic2V0UmVjb3ZlcnlTdGF0ZSIsImF2YWlsYWJsZSIsImVycm9yIiwiY2F0Y2giLCJzdGF0dXMiLCJyZW1vdmVBdHRyaWJ1dGUiLCJjbGFzc0xpc3QiLCJDU1MiLCJlc2NhcGUiLCJhZGQiLCJlZGl0b3JTZWxlY3Rpb25UeXBlIiwiaW50ZXJ2YWwiLCJzZXRJbnRlcnZhbCIsImdldE1ldHJpY3MiLCJjbGVhckludGVydmFsIiwidGltZXIiLCJiYXNlbGluZUhhc2giLCJjbGVhclRpbWVvdXQiLCJwYWdlaGlkZSIsImtleWRvd24iLCJjbGljayIsInJlZG8iLCJ1bmRvIiwicHJldmlld1N0YXRlIiwic2F2ZSIsImVkaXRvclVybCIsIlVSTCIsImxvY2F0aW9uIiwiaHJlZiIsInNlYXJjaFBhcmFtcyIsInNldCIsImhpc3RvcnkiLCJyZXBsYWNlU3RhdGUiLCJzdGF0ZSIsInBhdGhuYW1lIiwic2VhcmNoIiwic2VudCIsIm1hcmtTYXZlZCIsImFkZENoZWNrcG9pbnQiLCJjaGVja3BvaW50IiwiY3J5cHRvIiwicmFuZG9tVVVJRCIsInRvTG9jYWxlVGltZVN0cmluZyIsImhvdXIiLCJtaW51dGUiLCJiYXNlU291cmNlSGFzaCIsInN0YXR1c0xhYmVsIiwic2F2ZVN0YXRlIiwiY29tcGlsZWRTZWxlY3RlZCIsInNlbGVjdGVkRXh0ZW50Iiwic2VsZWN0ZWRDdWVDb3VudCIsImxvb3BBY3RpdmUiLCJ0aW1lbGluZURlbGV0aW9uIiwidG9nZ2xlTG9vcCIsInRvZ2dsZVNvbG8iLCJmaXRTZXF1ZW5jZSIsImZpdFNlY3Rpb24iLCJzZWN0aW9uU3BhbiIsInN0YXJ0UmF0aW8iLCJjbGllbnRXaWR0aCIsInRvZ2dsZURpcmVjdG9yIiwidG9nZ2xlQmVmb3JlIiwiY2FuVW5kbyIsInVuZG9MYWJlbCIsImNhblJlZG8iLCJyZWRvTGFiZWwiLCJmaWxlIiwiZmlsZXMiLCJpbXBvcnRlZCIsIkpTT04iLCJwYXJzZSIsInJlY292ZXJ5U3RhdGUiLCJ0b0xvY2FsZVN0cmluZyIsIm51ZGdlRGlyZWN0b3IiLCJ5YXciLCJwaXRjaCIsImRpc3RhbmNlIiwicmVzZXREaXJlY3RvciIsIm9wZW4iLCJhdXRvS2V5Iiwic2V0QXV0b0tleSIsImZyYW1lVGltZU1zIiwiZHJhd0NhbGxzIiwicG9pbnRDb3VudCIsImFjdGl2ZU1vZGlmaWVycyIsImJ1ZmZlclJlYnVpbGRzIiwiZm91bmQiLCJib2R5IiwiX2M1IiwiX2M5IiwiX2MxMyIsIl9jMTQiLCJfYzE2Il0sImlnbm9yZUxpc3QiOltdLCJzb3VyY2VzIjpbIkFib3V0TmFycmF0aXZlRWRpdG9yLmpzeCJdLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgeyB1c2VFZmZlY3QsIHVzZVJlZiwgdXNlU3RhdGUsIHVzZVN5bmNFeHRlcm5hbFN0b3JlIH0gZnJvbSAncmVhY3QnO1xuaW1wb3J0IHsgY3JlYXRlUG9ydGFsIH0gZnJvbSAncmVhY3QtZG9tJztcbmltcG9ydCB7XG4gIENoZWNrLFxuICBDaGV2cm9uRG93bixcbiAgQ2hldnJvbkxlZnQsXG4gIENoZXZyb25SaWdodCxcbiAgQ2hldnJvblVwLFxuICBDaXJjbGVBbGVydCxcbiAgRGlhbW9uZCxcbiAgSW5mbyxcbiAgTG9ja0tleWhvbGUsXG4gIFBhdXNlLFxuICBQbGF5LFxuICBTa2lwQmFjayxcbiAgU2tpcEZvcndhcmQsXG4gIFRyYXNoMixcbn0gZnJvbSAnbHVjaWRlLXJlYWN0JztcbmltcG9ydCB7XG4gIEFCT1VUX05BUlJBVElWRV9HTE9CQUxfQ09OVFJPTFMsXG4gIEFCT1VUX05BUlJBVElWRV9DT1JSRVNQT05ERU5DRV9NT0RFUyxcbiAgQUJPVVRfTkFSUkFUSVZFX0RJU0NJUExJTkVfUkVWRUFMX0NPTlRST0xTLFxuICBBQk9VVF9OQVJSQVRJVkVfRU1QSEFTSVNfVE9ORVMsXG4gIEFCT1VUX05BUlJBVElWRV9NT0RJRklFUl9ERUZJTklUSU9OUyxcbiAgQUJPVVRfTkFSUkFUSVZFX1NIQVBFX0RFRklOSVRJT05TLFxufSBmcm9tICcuL2Fib3V0TmFycmF0aXZlRGVmaW5pdGlvbnMuanMnO1xuaW1wb3J0IHtcbiAgY2xlYXJBYm91dE5hcnJhdGl2ZVJlY292ZXJ5RHJhZnQsXG4gIGV4cG9ydEFib3V0TmFycmF0aXZlRG9jdW1lbnQsXG4gIGxvYWRBYm91dE5hcnJhdGl2ZVNvdXJjZSxcbiAgcmVhZEFib3V0TmFycmF0aXZlQ2hlY2twb2ludHMsXG4gIHJlYWRBYm91dE5hcnJhdGl2ZVJlY292ZXJ5RHJhZnQsXG4gIHNhdmVBYm91dE5hcnJhdGl2ZVNvdXJjZSxcbiAgd3JpdGVBYm91dE5hcnJhdGl2ZUNoZWNrcG9pbnQsXG4gIHdyaXRlQWJvdXROYXJyYXRpdmVSZWNvdmVyeURyYWZ0LFxufSBmcm9tICcuL2Fib3V0TmFycmF0aXZlUGVyc2lzdGVuY2UuanMnO1xuaW1wb3J0IHtcbiAgYXNzZXJ0VmFsaWRBYm91dE5hcnJhdGl2ZURvY3VtZW50LFxuICBjbG9uZUFib3V0TmFycmF0aXZlRG9jdW1lbnQsXG59IGZyb20gJy4vYWJvdXROYXJyYXRpdmVTY2hlbWEuanMnO1xuaW1wb3J0IHtcbiAgZ2V0QWJvdXROYXJyYXRpdmVDdWVNb3ZlbWVudCxcbiAgZ2V0QWJvdXROYXJyYXRpdmVDdWVNb3Rpb25JbnRlcnZhbCxcbiAgZ2V0QWJvdXROYXJyYXRpdmVXb3JsZFRyYW5zaXRpb25MaW1pdCxcbiAgc2FtcGxlQWJvdXROYXJyYXRpdmVQbGFuLFxufSBmcm9tICcuL2Fib3V0TmFycmF0aXZlQ29tcGlsZXIuanMnO1xuaW1wb3J0IHtcbiAgY2FwdHVyZUFib3V0TmFycmF0aXZlUGxheWhlYWRDb250ZXh0LFxuICBjcmVhdGVBYm91dE5hcnJhdGl2ZUN1ZUNsaXBib2FyZFBheWxvYWQsXG4gIGRlcml2ZUFib3V0TmFycmF0aXZlTG9vcFJhbmdlLFxuICBkdXBsaWNhdGVBYm91dE5hcnJhdGl2ZUN1ZUdyb3VwLFxuICBkdXBsaWNhdGVBYm91dE5hcnJhdGl2ZVNlY3Rpb24sXG4gIGdldEFib3V0TmFycmF0aXZlQ2FtZXJhS2V5VGltaW5nQm91bmRzLFxuICBnZXRBYm91dE5hcnJhdGl2ZUN1ZVRpbWluZ0JvdW5kcyxcbiAgZ2V0QWJvdXROYXJyYXRpdmVFeHRlbnRGaWVsZCxcbiAgZ2V0QWJvdXROYXJyYXRpdmVTZWxlY3Rpb25NZW1iZXJzLFxuICBtb3ZlQWJvdXROYXJyYXRpdmVDdWVUaW1pbmcsXG4gIHJlbWFwQWJvdXROYXJyYXRpdmVQbGF5aGVhZENvbnRleHQsXG4gIHJlc29sdmVBYm91dE5hcnJhdGl2ZUNhbWVyYUtleURyb3AsXG4gIHJlc29sdmVBYm91dE5hcnJhdGl2ZUN1ZURpc3RyaWJ1dGlvbixcbiAgcmVzb2x2ZUFib3V0TmFycmF0aXZlQ3VlRXhhY3RHYXAsXG4gIHJlc29sdmVBYm91dE5hcnJhdGl2ZUN1ZUdyb3VwTW92ZSxcbiAgcmVzb2x2ZUFib3V0TmFycmF0aXZlQ3VlR3JvdXBBbGlnbixcbiAgcmVzb2x2ZUFib3V0TmFycmF0aXZlQ3VlR3JvdXBQYXN0ZSxcbiAgc25hcEFib3V0TmFycmF0aXZlVGltZWxpbmVWYWx1ZSxcbiAgc3RpdGNoQWJvdXROYXJyYXRpdmVDYW1lcmFCb3VuZGFyaWVzLFxuICB0b2dnbGVBYm91dE5hcnJhdGl2ZUN1ZVNlbGVjdGlvbixcbiAgdmFsaWRhdGVBYm91dE5hcnJhdGl2ZUN1ZUNsaXBib2FyZFBheWxvYWQsXG59IGZyb20gJy4vYWJvdXROYXJyYXRpdmVUaW1lbGluZS5qcyc7XG5pbXBvcnQgJy4vYWJvdXQtbmFycmF0aXZlLWVkaXRvci5jc3MnO1xuXG5jb25zdCBjbGFtcDAxID0gKHZhbHVlKSA9PiBNYXRoLm1pbigxLCBNYXRoLm1heCgwLCB2YWx1ZSkpO1xuY29uc3QgQUJPVVRfRURJVE9SX1RJTUVMSU5FX1NUT1JBR0VfS0VZID0gJ2FiczphYm91dC1uYXJyYXRpdmU6dGltZWxpbmUtb3Blbjp2MSc7XG5jb25zdCBUSU1FTElORV9LRVlfRVBTSUxPTiA9IDAuMDA0O1xuY29uc3QgSU5TUEVDVE9SX0VER0VfR0FQID0gODtcbmNvbnN0IENBTUVSQV9QT1NFX0ZJRUxEUyA9IG5ldyBTZXQoWydvZmZzZXQnLCAnbG9va0F0T2Zmc2V0JywgJ2ZvdicsICdyb2xsJ10pO1xuY29uc3QgRElTQ0lQTElORV9SRVZFQUxfTUFYID0gQUJPVVRfTkFSUkFUSVZFX0RJU0NJUExJTkVfUkVWRUFMX0NPTlRST0xTXG4gIC5maW5kKChjb250cm9sKSA9PiBjb250cm9sLmlkID09PSAnZW5kJyk/Lm1heCB8fCA0O1xuY29uc3QgRElTQ0lQTElORV9CQUxMX1RPS0VOX0JZX0dST1VQID0gT2JqZWN0LmZyZWV6ZSh7XG4gIDE6ICctLWJhbGwtMScsXG4gIDI6ICctLWJhbGwtNCcsXG4gIDM6ICctLWJhbGwtMycsXG4gIDQ6ICctLWJhbGwtNycsXG4gIDU6ICctLWJhbGwtOCcsXG4gIDY6ICctLWJhbGwtNicsXG59KTtcbmNvbnN0IFRJTUVMSU5FX0dMT0JBTF9UUkFDS1MgPSBPYmplY3QuZnJlZXplKFtcbiAgT2JqZWN0LmZyZWV6ZSh7IGxhbmU6ICdzZWN0aW9uJywgbGFiZWw6ICdTZWN0aW9ucycsIGdyb3VwSWRzOiBPYmplY3QuZnJlZXplKFsnc2VxdWVuY2UnXSkgfSksXG4gIE9iamVjdC5mcmVlemUoeyBsYW5lOiAnY2FtZXJhJywgbGFiZWw6ICdDYW1lcmEnLCBncm91cElkczogT2JqZWN0LmZyZWV6ZShbJ2NhbWVyYSddKSB9KSxcbiAgT2JqZWN0LmZyZWV6ZSh7IGxhbmU6ICd3b3JsZCcsIGxhYmVsOiAnV29ybGQnLCBncm91cElkczogT2JqZWN0LmZyZWV6ZShbJ21hdGVyaWFsJywgJ3N3YXJtVHVyYnVsZW5jZSddKSB9KSxcbiAgT2JqZWN0LmZyZWV6ZSh7IGxhbmU6ICd0ZXh0JywgbGFiZWw6ICdUZXh0JywgZ3JvdXBJZHM6IE9iamVjdC5mcmVlemUoWyd0ZXh0TW90aW9uJ10pIH0pLFxuICBPYmplY3QuZnJlZXplKHsgbGFuZTogJ2ludGVyYWN0aW9uJywgbGFiZWw6ICdJbnRlcmFjdGlvbicsIGdyb3VwSWRzOiBPYmplY3QuZnJlZXplKFtdKSB9KSxcbl0pO1xuXG5mdW5jdGlvbiBjYW1lcmFQb3NlQ2hhbmdlcyhmcm9tLCB0bykge1xuICBpZiAoIWZyb20gfHwgIXRvKSByZXR1cm4gZmFsc2U7XG4gIHJldHVybiBbJ29mZnNldCcsICdsb29rQXRPZmZzZXQnXS5zb21lKChmaWVsZCkgPT4gKFxuICAgIGZyb21bZmllbGRdLnNvbWUoKHZhbHVlLCBpbmRleCkgPT4gTWF0aC5hYnModmFsdWUgLSB0b1tmaWVsZF1baW5kZXhdKSA+IDAuMDAwMSlcbiAgKSkgfHwgTWF0aC5hYnMoZnJvbS5mb3YgLSB0by5mb3YpID4gMC4wMDAxIHx8IE1hdGguYWJzKGZyb20ucm9sbCAtIHRvLnJvbGwpID4gMC4wMDAxO1xufVxuXG5mdW5jdGlvbiBjb3B5Q2FtZXJhUG9zZSh0YXJnZXQsIHNvdXJjZSkge1xuICB0YXJnZXQub2Zmc2V0ID0gWy4uLnNvdXJjZS5vZmZzZXRdO1xuICB0YXJnZXQubG9va0F0T2Zmc2V0ID0gWy4uLnNvdXJjZS5sb29rQXRPZmZzZXRdO1xuICB0YXJnZXQuZm92ID0gc291cmNlLmZvdjtcbiAgdGFyZ2V0LnJvbGwgPSBzb3VyY2Uucm9sbDtcbn1cblxuZnVuY3Rpb24gbGlua0NhbWVyYUJvdW5kYXJ5KGRvY3VtZW50LCBzZWN0aW9uSW5kZXgsIGtleUluZGV4KSB7XG4gIGNvbnN0IHNlY3Rpb24gPSBkb2N1bWVudC5zZWN0aW9uc1tzZWN0aW9uSW5kZXhdO1xuICBjb25zdCBrZXkgPSBzZWN0aW9uPy5jYW1lcmEua2V5c1trZXlJbmRleF07XG4gIGlmICgha2V5KSByZXR1cm47XG4gIGlmIChrZXlJbmRleCA9PT0gMCAmJiBzZWN0aW9uSW5kZXggPiAwKSB7XG4gICAgY29weUNhbWVyYVBvc2UoZG9jdW1lbnQuc2VjdGlvbnNbc2VjdGlvbkluZGV4IC0gMV0uY2FtZXJhLmtleXMuYXQoLTEpLCBrZXkpO1xuICB9XG4gIGlmIChrZXlJbmRleCA9PT0gc2VjdGlvbi5jYW1lcmEua2V5cy5sZW5ndGggLSAxICYmIHNlY3Rpb25JbmRleCA8IGRvY3VtZW50LnNlY3Rpb25zLmxlbmd0aCAtIDEpIHtcbiAgICBjb3B5Q2FtZXJhUG9zZShkb2N1bWVudC5zZWN0aW9uc1tzZWN0aW9uSW5kZXggKyAxXS5jYW1lcmEua2V5c1swXSwga2V5KTtcbiAgfVxufVxuXG5mdW5jdGlvbiBicmlkZ2VDYW1lcmFTZWN0aW9uKGRvY3VtZW50LCBzZWN0aW9uSW5kZXgpIHtcbiAgY29uc3Qgc2VjdGlvbiA9IGRvY3VtZW50LnNlY3Rpb25zW3NlY3Rpb25JbmRleF07XG4gIGlmICghc2VjdGlvbj8uY2FtZXJhLmtleXMubGVuZ3RoKSByZXR1cm47XG4gIGlmIChzZWN0aW9uSW5kZXggPiAwKSBjb3B5Q2FtZXJhUG9zZShzZWN0aW9uLmNhbWVyYS5rZXlzWzBdLCBkb2N1bWVudC5zZWN0aW9uc1tzZWN0aW9uSW5kZXggLSAxXS5jYW1lcmEua2V5cy5hdCgtMSkpO1xuICBpZiAoc2VjdGlvbkluZGV4IDwgZG9jdW1lbnQuc2VjdGlvbnMubGVuZ3RoIC0gMSkgY29weUNhbWVyYVBvc2Uoc2VjdGlvbi5jYW1lcmEua2V5cy5hdCgtMSksIGRvY3VtZW50LnNlY3Rpb25zW3NlY3Rpb25JbmRleCArIDFdLmNhbWVyYS5rZXlzWzBdKTtcbn1cblxuZnVuY3Rpb24gZ2V0SW5zcGVjdG9yVmVydGljYWxCb3VuZHMoaW5zcGVjdG9yLCB0aW1lbGluZU9wZW4pIHtcbiAgY29uc3QgZWRpdG9yID0gaW5zcGVjdG9yLmNsb3Nlc3QoJy5hYm91dC1lZGl0b3InKTtcbiAgY29uc3Qgc3R5bGVzID0gZWRpdG9yID8gZ2V0Q29tcHV0ZWRTdHlsZShlZGl0b3IpIDogbnVsbDtcbiAgY29uc3QgdG9wYmFySGVpZ2h0ID0gTnVtYmVyLnBhcnNlRmxvYXQoc3R5bGVzPy5nZXRQcm9wZXJ0eVZhbHVlKCctLWFib3V0LWVkaXRvci10b3BiYXInKSkgfHwgNDQ7XG4gIGNvbnN0IHRpbWVsaW5lSGVpZ2h0ID0gdGltZWxpbmVPcGVuXG4gICAgPyBOdW1iZXIucGFyc2VGbG9hdChzdHlsZXM/LmdldFByb3BlcnR5VmFsdWUoJy0tYWJvdXQtZWRpdG9yLXRpbWVsaW5lJykpIHx8IDE4OFxuICAgIDogMDtcbiAgY29uc3QgYnV0dG9uQmFyVG9wID0gZG9jdW1lbnQucXVlcnlTZWxlY3RvcignW2RhdGEtYnV0dG9uLWJhcl0nKT8uZ2V0Qm91bmRpbmdDbGllbnRSZWN0KCkudG9wXG4gICAgPz8gd2luZG93LmlubmVySGVpZ2h0O1xuICByZXR1cm4ge1xuICAgIG1pblRvcDogdG9wYmFySGVpZ2h0ICsgSU5TUEVDVE9SX0VER0VfR0FQLFxuICAgIG1heEJvdHRvbTogKHRpbWVsaW5lT3BlbiA/IHdpbmRvdy5pbm5lckhlaWdodCAtIHRpbWVsaW5lSGVpZ2h0IDogYnV0dG9uQmFyVG9wKSAtIElOU1BFQ1RPUl9FREdFX0dBUCxcbiAgfTtcbn1cblxuZnVuY3Rpb24gY2xhbXBJbnNwZWN0b3JQb3NpdGlvbihpbnNwZWN0b3IsIHBvc2l0aW9uLCB0aW1lbGluZU9wZW4pIHtcbiAgY29uc3QgeyBtaW5Ub3AsIG1heEJvdHRvbSB9ID0gZ2V0SW5zcGVjdG9yVmVydGljYWxCb3VuZHMoaW5zcGVjdG9yLCB0aW1lbGluZU9wZW4pO1xuICBjb25zdCBtYXhXaWR0aCA9IE1hdGgubWF4KDI0MCwgd2luZG93LmlubmVyV2lkdGggLSAoSU5TUEVDVE9SX0VER0VfR0FQICogMikpO1xuICBjb25zdCB3aWR0aCA9IE1hdGgubWluKHBvc2l0aW9uLndpZHRoLCBtYXhXaWR0aCk7XG4gIGNvbnN0IGF2YWlsYWJsZUhlaWdodCA9IE1hdGgubWF4KDI0MCwgbWF4Qm90dG9tIC0gbWluVG9wKTtcbiAgY29uc3QgaGVpZ2h0ID0gTWF0aC5taW4ocG9zaXRpb24uaGVpZ2h0LCBhdmFpbGFibGVIZWlnaHQpO1xuICBjb25zdCBtYXhMZWZ0ID0gTWF0aC5tYXgoSU5TUEVDVE9SX0VER0VfR0FQLCB3aW5kb3cuaW5uZXJXaWR0aCAtIHdpZHRoIC0gSU5TUEVDVE9SX0VER0VfR0FQKTtcbiAgY29uc3QgbWF4VG9wID0gTWF0aC5tYXgobWluVG9wLCBtYXhCb3R0b20gLSBoZWlnaHQpO1xuICByZXR1cm4ge1xuICAgIGxlZnQ6IE1hdGgubWluKG1heExlZnQsIE1hdGgubWF4KElOU1BFQ1RPUl9FREdFX0dBUCwgcG9zaXRpb24ubGVmdCkpLFxuICAgIHRvcDogTWF0aC5taW4obWF4VG9wLCBNYXRoLm1heChtaW5Ub3AsIHBvc2l0aW9uLnRvcCkpLFxuICAgIHdpZHRoLFxuICAgIGhlaWdodCxcbiAgfTtcbn1cblxuZnVuY3Rpb24gZ2V0U2VjdGlvbkluZGV4KGRvY3VtZW50LCBzZWN0aW9uSWQpIHtcbiAgcmV0dXJuIGRvY3VtZW50LnNlY3Rpb25zLmZpbmRJbmRleCgoc2VjdGlvbikgPT4gc2VjdGlvbi5pZCA9PT0gc2VjdGlvbklkKTtcbn1cblxuZnVuY3Rpb24gZ2V0U2VjdGlvbihkb2N1bWVudCwgc2VsZWN0aW9uKSB7XG4gIGNvbnN0IHNlY3Rpb25JZCA9IHNlbGVjdGlvbi5zZWN0aW9uSWQgfHwgZG9jdW1lbnQuc2VjdGlvbnNbMF0/LmlkO1xuICByZXR1cm4gZG9jdW1lbnQuc2VjdGlvbnMuZmluZCgoc2VjdGlvbikgPT4gc2VjdGlvbi5pZCA9PT0gc2VjdGlvbklkKSB8fCBkb2N1bWVudC5zZWN0aW9uc1swXTtcbn1cblxuZnVuY3Rpb24gZ2V0TG9jYWxQcm9ncmVzcyhwbGFuLCBzZWN0aW9uLCBzdG9yeVdVKSB7XG4gIGNvbnN0IGNvbXBpbGVkID0gcGxhbj8uc2VjdGlvbnM/LmZpbmQoKGl0ZW0pID0+IGl0ZW0uaWQgPT09IHNlY3Rpb24uaWQpO1xuICByZXR1cm4gY29tcGlsZWQgPyBjbGFtcDAxKChzdG9yeVdVIC0gY29tcGlsZWQuc3RhcnRXVSkgLyBjb21waWxlZC50cmF2ZWxXVSkgOiAwO1xufVxuXG5mdW5jdGlvbiBmb3JtYXRXVSh2YWx1ZSkge1xuICByZXR1cm4gYCR7TnVtYmVyKHZhbHVlIHx8IDApLnRvRml4ZWQoMil9IFdVYDtcbn1cblxuZnVuY3Rpb24gZm9ybWF0Q2FtZXJhUGVyY2VudCh2YWx1ZSkge1xuICByZXR1cm4gYCR7TnVtYmVyKChOdW1iZXIodmFsdWUpICogMTAwKS50b0ZpeGVkKDEpKX0lYDtcbn1cblxuZnVuY3Rpb24gaXNUZXh0RWRpdGluZ1RhcmdldCh0YXJnZXQpIHtcbiAgcmV0dXJuIHRhcmdldCBpbnN0YW5jZW9mIEhUTUxFbGVtZW50XG4gICAgJiYgKHRhcmdldC5tYXRjaGVzKCdpbnB1dCwgdGV4dGFyZWEsIHNlbGVjdCcpIHx8IHRhcmdldC5pc0NvbnRlbnRFZGl0YWJsZSk7XG59XG5cbmZ1bmN0aW9uIGdldFRpbWVsaW5lS2V5ZnJhbWVzKHNuYXBzaG90KSB7XG4gIGNvbnN0IHBsYW4gPSBzbmFwc2hvdC5jb21waWxlZFBsYW47XG4gIGlmICghcGxhbj8uc2VjdGlvbnM/Lmxlbmd0aCkgcmV0dXJuIFtdO1xuICBjb25zdCBldmVudHMgPSBbXTtcbiAgcGxhbi5zZWN0aW9ucy5mb3JFYWNoKChjb21waWxlZCwgc2VjdGlvbkluZGV4KSA9PiB7XG4gICAgY29uc3Qgc2VjdGlvbiA9IHNuYXBzaG90LmRvY3VtZW50LnNlY3Rpb25zW3NlY3Rpb25JbmRleF07XG4gICAgY29uc3QgdG9TdG9yeVdVID0gKGF0KSA9PiBjb21waWxlZC5zdGFydFdVICsgKE51bWJlcihhdCB8fCAwKSAqIGNvbXBpbGVkLnRyYXZlbFdVKTtcbiAgICBzZWN0aW9uLmNhbWVyYS5rZXlzLmZvckVhY2goKGtleSwga2V5SW5kZXgpID0+IHtcbiAgICAgIGlmIChrZXkuYXQgPT09IDAgfHwga2V5LmF0ID09PSAxKSByZXR1cm47XG4gICAgICBldmVudHMucHVzaCh7XG4gICAgICAgIHN0b3J5V1U6IHRvU3RvcnlXVShrZXkuYXQpLFxuICAgICAgICBwcmlvcml0eTogMCxcbiAgICAgICAgc2VsZWN0aW9uOiB7IHR5cGU6ICdjYW1lcmEta2V5Jywgc2VjdGlvbklkOiBzZWN0aW9uLmlkLCBrZXlJbmRleCB9LFxuICAgICAgfSk7XG4gICAgfSk7XG4gICAgaWYgKHNlY3Rpb24ud29ybGQubW9kZSA9PT0gJ3NldCcgJiYgc2VjdGlvbi53b3JsZC50cmFuc2l0aW9uSW4udHlwZSAhPT0gJ2N1dCcpIHtcbiAgICAgIFsnc3RhcnQnLCAnZW5kJ10uZm9yRWFjaCgocGFydCwgcGFydEluZGV4KSA9PiBldmVudHMucHVzaCh7XG4gICAgICAgIHN0b3J5V1U6IHRvU3RvcnlXVShzZWN0aW9uLndvcmxkLnRyYW5zaXRpb25JbltwYXJ0XSksXG4gICAgICAgIHByaW9yaXR5OiAxMCArIHBhcnRJbmRleCxcbiAgICAgICAgc2VsZWN0aW9uOiB7IHR5cGU6ICd3b3JsZCcsIHNlY3Rpb25JZDogc2VjdGlvbi5pZCwga2V5UGFydDogYHRyYW5zaXRpb24tJHtwYXJ0fWAgfSxcbiAgICAgIH0pKTtcbiAgICB9XG4gICAgKHNlY3Rpb24udGV4dC5jdWVzIHx8IFtdKS5mb3JFYWNoKChjdWUsIGN1ZUluZGV4KSA9PiB7XG4gICAgICBldmVudHMucHVzaCh7XG4gICAgICAgIHN0b3J5V1U6IHRvU3RvcnlXVShjdWUuaG9sZCksXG4gICAgICAgIHByaW9yaXR5OiAyMCArIGN1ZUluZGV4LFxuICAgICAgICBzZWxlY3Rpb246IHsgdHlwZTogJ2N1ZScsIHNlY3Rpb25JZDogc2VjdGlvbi5pZCwgY3VlSWQ6IGN1ZS5pZCwga2V5UGFydDogJ2ZvY3VzJyB9LFxuICAgICAgfSk7XG4gICAgfSk7XG4gICAgaWYgKHNlY3Rpb24udGV4dC5kaXNjaXBsaW5lUmV2ZWFsKSB7XG4gICAgICBldmVudHMucHVzaCh7XG4gICAgICAgIHN0b3J5V1U6IHRvU3RvcnlXVShzZWN0aW9uLnRleHQuZGlzY2lwbGluZVJldmVhbC5zdGFydCksXG4gICAgICAgIHByaW9yaXR5OiAyOCxcbiAgICAgICAgc2VsZWN0aW9uOiB7IHR5cGU6ICdkaXNjaXBsaW5lLXJldmVhbCcsIHNlY3Rpb25JZDogc2VjdGlvbi5pZCB9LFxuICAgICAgfSk7XG4gICAgfVxuICAgIGlmIChzZWN0aW9uLmludGVyYWN0aW9uPy50eXBlICE9PSAnbm9uZScgJiYgTnVtYmVyLmlzRmluaXRlKHNlY3Rpb24uaW50ZXJhY3Rpb24uYWN0aXZhdGlvblN0YXJ0KSkge1xuICAgICAgZXZlbnRzLnB1c2goe1xuICAgICAgICBzdG9yeVdVOiB0b1N0b3J5V1Uoc2VjdGlvbi5pbnRlcmFjdGlvbi5hY3RpdmF0aW9uU3RhcnQpLFxuICAgICAgICBwcmlvcml0eTogMzAsXG4gICAgICAgIHNlbGVjdGlvbjogeyB0eXBlOiAnaW50ZXJhY3Rpb24nLCBzZWN0aW9uSWQ6IHNlY3Rpb24uaWQsIGtleVBhcnQ6ICdhY3RpdmF0aW9uJyB9LFxuICAgICAgfSk7XG4gICAgfVxuICB9KTtcbiAgcmV0dXJuIGV2ZW50cy5zb3J0KChhLCBiKSA9PiAoYS5zdG9yeVdVIC0gYi5zdG9yeVdVKSB8fCAoYS5wcmlvcml0eSAtIGIucHJpb3JpdHkpKTtcbn1cblxuZnVuY3Rpb24gZ2V0VGltZWxpbmVEZWxldGlvbihzbmFwc2hvdCkge1xuICBjb25zdCB7IHNlbGVjdGlvbiwgZG9jdW1lbnQgfSA9IHNuYXBzaG90O1xuICBjb25zdCBzZWN0aW9uSW5kZXggPSBnZXRTZWN0aW9uSW5kZXgoZG9jdW1lbnQsIHNlbGVjdGlvbi5zZWN0aW9uSWQpO1xuICBjb25zdCBzZWN0aW9uID0gZG9jdW1lbnQuc2VjdGlvbnNbc2VjdGlvbkluZGV4XTtcbiAgaWYgKCFzZWN0aW9uKSByZXR1cm4gbnVsbDtcbiAgaWYgKHNlbGVjdGlvbi50eXBlID09PSAnY2FtZXJhLWtleScpIHtcbiAgICBjb25zdCBrZXkgPSBzZWN0aW9uLmNhbWVyYS5rZXlzW3NlbGVjdGlvbi5rZXlJbmRleF07XG4gICAgaWYgKCFrZXkpIHJldHVybiBudWxsO1xuICAgIGNvbnN0IHJlcXVpcmVkID0ga2V5LmF0ID09PSAwIHx8IGtleS5hdCA9PT0gMTtcbiAgICByZXR1cm4ge1xuICAgICAgbGFiZWw6IHJlcXVpcmVkID8gJ1JlcXVpcmVkIGNhbWVyYSBrZXknIDogJ0RlbGV0ZSBjYW1lcmEga2V5JyxcbiAgICAgIGRpc2FibGVkOiByZXF1aXJlZCxcbiAgICAgIG1lc3NhZ2U6IHJlcXVpcmVkID8gJ1RoZSBzdGFydCBhbmQgZW5kIENhbWVyYSBrZXlzIHByZXNlcnZlIFNlY3Rpb24gY29udGludWl0eSBhbmQgY2Fubm90IGJlIHJlbW92ZWQuJyA6ICcnLFxuICAgICAgZXhlY3V0ZTogKHN0b3JlKSA9PiBzdG9yZS5jb21taXQoJ0RlbGV0ZSBjYW1lcmEga2V5JywgKGRyYWZ0KSA9PiB7XG4gICAgICAgIGRyYWZ0LnNlY3Rpb25zW3NlY3Rpb25JbmRleF0uY2FtZXJhLmtleXMuc3BsaWNlKHNlbGVjdGlvbi5rZXlJbmRleCwgMSk7XG4gICAgICB9LCB7IHNlbGVjdGlvbjogeyB0eXBlOiAnc2VjdGlvbicsIHNlY3Rpb25JZDogc2VjdGlvbi5pZCB9IH0pLFxuICAgIH07XG4gIH1cbiAgaWYgKHNlbGVjdGlvbi50eXBlID09PSAnd29ybGQnICYmIHNlbGVjdGlvbi5rZXlQYXJ0Py5zdGFydHNXaXRoKCd0cmFuc2l0aW9uLScpKSB7XG4gICAgcmV0dXJuIHtcbiAgICAgIGxhYmVsOiAnUmVtb3ZlIHRyYW5zaXRpb24nLFxuICAgICAgZGlzYWJsZWQ6IGZhbHNlLFxuICAgICAgbWVzc2FnZTogJycsXG4gICAgICBleGVjdXRlOiAoc3RvcmUpID0+IHN0b3JlLmNvbW1pdCgnUmVtb3ZlIFdvcmxkIHRyYW5zaXRpb24nLCAoZHJhZnQpID0+IHtcbiAgICAgICAgY29uc3QgdHJhbnNpdGlvbiA9IGRyYWZ0LnNlY3Rpb25zW3NlY3Rpb25JbmRleF0ud29ybGQudHJhbnNpdGlvbkluO1xuICAgICAgICB0cmFuc2l0aW9uLnN0YXJ0ID0gMDtcbiAgICAgICAgdHJhbnNpdGlvbi5lbmQgPSAwO1xuICAgICAgICB0cmFuc2l0aW9uLnR5cGUgPSAnY3V0JztcbiAgICAgIH0sIHsgc2VsZWN0aW9uOiB7IHR5cGU6ICd3b3JsZCcsIHNlY3Rpb25JZDogc2VjdGlvbi5pZCB9IH0pLFxuICAgIH07XG4gIH1cbiAgaWYgKHNlbGVjdGlvbi50eXBlID09PSAnaW50ZXJhY3Rpb24nICYmIHNlbGVjdGlvbi5rZXlQYXJ0ID09PSAnYWN0aXZhdGlvbicpIHtcbiAgICByZXR1cm4ge1xuICAgICAgbGFiZWw6ICdSZW1vdmUgaW50ZXJhY3Rpb24ga2V5JyxcbiAgICAgIGRpc2FibGVkOiBmYWxzZSxcbiAgICAgIG1lc3NhZ2U6ICcnLFxuICAgICAgZXhlY3V0ZTogKHN0b3JlKSA9PiBzdG9yZS5jb21taXQoJ1JlbW92ZSBpbnRlcmFjdGlvbiBrZXknLCAoZHJhZnQpID0+IHtcbiAgICAgICAgZHJhZnQuc2VjdGlvbnNbc2VjdGlvbkluZGV4XS5pbnRlcmFjdGlvbiA9IHsgdHlwZTogJ25vbmUnIH07XG4gICAgICB9LCB7IHNlbGVjdGlvbjogeyB0eXBlOiAnc2VjdGlvbicsIHNlY3Rpb25JZDogc2VjdGlvbi5pZCB9IH0pLFxuICAgIH07XG4gIH1cbiAgcmV0dXJuIG51bGw7XG59XG5cbmZ1bmN0aW9uIGRlbGV0ZVRpbWVsaW5lU2VsZWN0aW9uKHN0b3JlLCBzbmFwc2hvdCkge1xuICBjb25zdCBkZWxldGlvbiA9IGdldFRpbWVsaW5lRGVsZXRpb24oc25hcHNob3QpO1xuICBpZiAoIWRlbGV0aW9uKSByZXR1cm4gZmFsc2U7XG4gIGlmIChkZWxldGlvbi5kaXNhYmxlZCkge1xuICAgIHN0b3JlLnNldFNhdmVTdGF0ZSh7IG1lc3NhZ2U6IGRlbGV0aW9uLm1lc3NhZ2UgfSk7XG4gICAgcmV0dXJuIHRydWU7XG4gIH1cbiAgZGVsZXRpb24uZXhlY3V0ZShzdG9yZSk7XG4gIHJldHVybiB0cnVlO1xufVxuXG5mdW5jdGlvbiBzZWVrVGltZWxpbmVLZXlmcmFtZShzdG9yZSwgZXZlbnQpIHtcbiAgaWYgKCFldmVudCkgcmV0dXJuO1xuICBzdG9yZS5zZXRTZWxlY3Rpb24oZXZlbnQuc2VsZWN0aW9uKTtcbiAgc3RvcmUuc2V0VHJhbnNwb3J0KHsgb3duZXI6ICd0aW1lbGluZScsIHBsYXlpbmc6IGZhbHNlLCBzdG9yeVdVOiBldmVudC5zdG9yeVdVIH0pO1xufVxuXG5mdW5jdGlvbiBqdW1wVGltZWxpbmVLZXlmcmFtZShzdG9yZSwgc25hcHNob3QsIGRpcmVjdGlvbikge1xuICBjb25zdCBldmVudHMgPSBnZXRUaW1lbGluZUtleWZyYW1lcyhzbmFwc2hvdCk7XG4gIGNvbnN0IGN1cnJlbnRXVSA9IHNuYXBzaG90LnRyYW5zcG9ydC5zdG9yeVdVO1xuICBjb25zdCB0YXJnZXRQb3NpdGlvbiA9IGRpcmVjdGlvbiA+IDBcbiAgICA/IGV2ZW50cy5maW5kKChldmVudCkgPT4gZXZlbnQuc3RvcnlXVSA+IGN1cnJlbnRXVSArIFRJTUVMSU5FX0tFWV9FUFNJTE9OKT8uc3RvcnlXVVxuICAgIDogWy4uLmV2ZW50c10ucmV2ZXJzZSgpLmZpbmQoKGV2ZW50KSA9PiBldmVudC5zdG9yeVdVIDwgY3VycmVudFdVIC0gVElNRUxJTkVfS0VZX0VQU0lMT04pPy5zdG9yeVdVO1xuICBjb25zdCBldmVudCA9IE51bWJlci5pc0Zpbml0ZSh0YXJnZXRQb3NpdGlvbilcbiAgICA/IGV2ZW50cy5maW5kKChpdGVtKSA9PiBNYXRoLmFicyhpdGVtLnN0b3J5V1UgLSB0YXJnZXRQb3NpdGlvbikgPCBUSU1FTElORV9LRVlfRVBTSUxPTilcbiAgICA6IG51bGw7XG4gIHNlZWtUaW1lbGluZUtleWZyYW1lKHN0b3JlLCBldmVudCk7XG59XG5cbmZ1bmN0aW9uIG1ha2VTbHVnKHZhbHVlKSB7XG4gIHJldHVybiB2YWx1ZS50b0xvd2VyQ2FzZSgpLnJlcGxhY2UoL1teYS16MC05XSsvZywgJy0nKS5yZXBsYWNlKC9eLXwtJC9nLCAnJykgfHwgJ2l0ZW0nO1xufVxuXG5mdW5jdGlvbiBuZXh0SWQoZG9jdW1lbnQsIGJhc2UpIHtcbiAgY29uc3QgdXNlZCA9IG5ldyBTZXQoZG9jdW1lbnQuc2VjdGlvbnMuZmxhdE1hcCgoc2VjdGlvbikgPT4gW1xuICAgIHNlY3Rpb24uaWQsXG4gICAgLi4uKHNlY3Rpb24udGV4dC5jdWVzIHx8IFtdKS5tYXAoKGN1ZSkgPT4gY3VlLmlkKSxcbiAgICAuLi4oc2VjdGlvbi50ZXh0LmJsb2NrcyB8fCBbXSkubWFwKChibG9jaykgPT4gYmxvY2suaWQpLFxuICAgIC4uLihzZWN0aW9uLnRleHQuZGlzY2lwbGluZVJldmVhbCA/IFtzZWN0aW9uLnRleHQuZGlzY2lwbGluZVJldmVhbC5pZF0gOiBbXSksXG4gIF0pKTtcbiAgbGV0IGlkID0gbWFrZVNsdWcoYmFzZSk7XG4gIGxldCBzdWZmaXggPSAyO1xuICB3aGlsZSAodXNlZC5oYXMoaWQpKSB7XG4gICAgaWQgPSBgJHttYWtlU2x1ZyhiYXNlKX0tJHtzdWZmaXh9YDtcbiAgICBzdWZmaXggKz0gMTtcbiAgfVxuICByZXR1cm4gaWQ7XG59XG5cbmZ1bmN0aW9uIHJlcGxhY2VEcmFmdERvY3VtZW50KGRyYWZ0LCBuZXh0RG9jdW1lbnQpIHtcbiAgT2JqZWN0LmtleXMoZHJhZnQpLmZvckVhY2goKGtleSkgPT4gZGVsZXRlIGRyYWZ0W2tleV0pO1xuICBPYmplY3QuYXNzaWduKGRyYWZ0LCBjbG9uZUFib3V0TmFycmF0aXZlRG9jdW1lbnQobmV4dERvY3VtZW50KSk7XG59XG5cbmZ1bmN0aW9uIGFwcGx5Q3VlTW92ZXMoZHJhZnQsIG1vdmVzKSB7XG4gIG1vdmVzLmZvckVhY2goKG1vdmUpID0+IHtcbiAgICBjb25zdCBzZWN0aW9uID0gZHJhZnQuc2VjdGlvbnMuZmluZCgoaXRlbSkgPT4gaXRlbS5pZCA9PT0gbW92ZS5zZWN0aW9uSWQpO1xuICAgIGNvbnN0IGN1ZSA9IHNlY3Rpb24/LnRleHQ/LmN1ZXM/LmZpbmQoKGl0ZW0pID0+IGl0ZW0uaWQgPT09IG1vdmUuY3VlSWQpO1xuICAgIGlmIChjdWUpIE9iamVjdC5hc3NpZ24oY3VlLCB7IGVudGVyOiBtb3ZlLmVudGVyLCBob2xkOiBtb3ZlLmhvbGQsIGV4aXQ6IG1vdmUuZXhpdCB9KTtcbiAgfSk7XG59XG5cbmZ1bmN0aW9uIFByb3BlcnR5KHsgbGFiZWwsIGNoaWxkcmVuLCBoaW50ID0gJycgfSkge1xuICByZXR1cm4gKFxuICAgIDxsYWJlbCBjbGFzc05hbWU9XCJhYm91dC1lZGl0b3ItcHJvcGVydHlcIj5cbiAgICAgIDxzcGFuPntsYWJlbH08L3NwYW4+XG4gICAgICB7Y2hpbGRyZW59XG4gICAgICB7aGludCA/IDxzbWFsbD57aGludH08L3NtYWxsPiA6IG51bGx9XG4gICAgPC9sYWJlbD5cbiAgKTtcbn1cblxuZnVuY3Rpb24gTnVtYmVyUHJvcGVydHkoeyBsYWJlbCwgdmFsdWUsIG1pbiwgbWF4LCBzdGVwLCBvbkNoYW5nZSwgdW5pdCA9ICcnLCBkaXNhYmxlZCA9IGZhbHNlIH0pIHtcbiAgcmV0dXJuIChcbiAgICA8UHJvcGVydHkgbGFiZWw9e2xhYmVsfT5cbiAgICAgIDxkaXYgY2xhc3NOYW1lPVwiYWJvdXQtZWRpdG9yLW51bWJlclwiPlxuICAgICAgICA8aW5wdXRcbiAgICAgICAgICB0eXBlPVwicmFuZ2VcIlxuICAgICAgICAgIHZhbHVlPXt2YWx1ZX1cbiAgICAgICAgICBtaW49e21pbn1cbiAgICAgICAgICBtYXg9e21heH1cbiAgICAgICAgICBzdGVwPXtzdGVwfVxuICAgICAgICAgIGRpc2FibGVkPXtkaXNhYmxlZH1cbiAgICAgICAgICBvbkNoYW5nZT17KGV2ZW50KSA9PiBvbkNoYW5nZShOdW1iZXIoZXZlbnQudGFyZ2V0LnZhbHVlKSl9XG4gICAgICAgIC8+XG4gICAgICAgIDxpbnB1dFxuICAgICAgICAgIHR5cGU9XCJudW1iZXJcIlxuICAgICAgICAgIHZhbHVlPXt2YWx1ZX1cbiAgICAgICAgICBtaW49e21pbn1cbiAgICAgICAgICBtYXg9e21heH1cbiAgICAgICAgICBzdGVwPXtzdGVwfVxuICAgICAgICAgIGRpc2FibGVkPXtkaXNhYmxlZH1cbiAgICAgICAgICBvbkNoYW5nZT17KGV2ZW50KSA9PiBvbkNoYW5nZShOdW1iZXIoZXZlbnQudGFyZ2V0LnZhbHVlKSl9XG4gICAgICAgIC8+XG4gICAgICAgIHt1bml0ID8gPGVtPnt1bml0fTwvZW0+IDogbnVsbH1cbiAgICAgIDwvZGl2PlxuICAgIDwvUHJvcGVydHk+XG4gICk7XG59XG5cbmZ1bmN0aW9uIFJhbmdlUHJvcGVydHkoeyBsYWJlbCwgc3RhcnQsIGVuZCwgbWluLCBtYXgsIHN0ZXAsIG9uU3RhcnRDaGFuZ2UsIG9uRW5kQ2hhbmdlLCBoaW50ID0gJycgfSkge1xuICBjb25zdCBzdGFydFBlcmNlbnQgPSAoKHN0YXJ0IC0gbWluKSAvIE1hdGgubWF4KDAuMDAwMDEsIG1heCAtIG1pbikpICogMTAwO1xuICBjb25zdCBlbmRQZXJjZW50ID0gKChlbmQgLSBtaW4pIC8gTWF0aC5tYXgoMC4wMDAwMSwgbWF4IC0gbWluKSkgKiAxMDA7XG4gIGNvbnN0IHBlcmNlbnRhZ2VTdGVwID0gc3RlcCAqIDEwMDtcbiAgY29uc3Qgc2V0U3RhcnQgPSAodmFsdWUpID0+IG9uU3RhcnRDaGFuZ2UoTWF0aC5taW4oZW5kIC0gc3RlcCwgTWF0aC5tYXgobWluLCBOdW1iZXIodmFsdWUpIHx8IDApKSk7XG4gIGNvbnN0IHNldEVuZCA9ICh2YWx1ZSkgPT4gb25FbmRDaGFuZ2UoTWF0aC5tYXgoc3RhcnQgKyBzdGVwLCBNYXRoLm1pbihtYXgsIE51bWJlcih2YWx1ZSkgfHwgMCkpKTtcbiAgcmV0dXJuIChcbiAgICA8ZmllbGRzZXRcbiAgICAgIGNsYXNzTmFtZT1cImFib3V0LWVkaXRvci1yYW5nZS1wcm9wZXJ0eVwiXG4gICAgICBkYXRhLWdsb2JhbC1jb250cm9sPVwiY2xlYXJXaW5kb3dcIlxuICAgICAgc3R5bGU9e3sgJy0tYWJvdXQtcmFuZ2Utc3RhcnQnOiBgJHtzdGFydFBlcmNlbnR9JWAsICctLWFib3V0LXJhbmdlLWVuZCc6IGAke2VuZFBlcmNlbnR9JWAgfX1cbiAgICA+XG4gICAgICA8bGVnZW5kPntsYWJlbH08L2xlZ2VuZD5cbiAgICAgIDxkaXYgY2xhc3NOYW1lPVwiYWJvdXQtZWRpdG9yLWR1YWwtcmFuZ2VcIj5cbiAgICAgICAgPHNwYW4gYXJpYS1oaWRkZW49XCJ0cnVlXCIgLz5cbiAgICAgICAgPGlucHV0IHR5cGU9XCJyYW5nZVwiIGFyaWEtbGFiZWw9e2Ake2xhYmVsfSBzdGFydGB9IG1pbj17bWlufSBtYXg9e2VuZCAtIHN0ZXB9IHN0ZXA9e3N0ZXB9IHZhbHVlPXtzdGFydH0gb25DaGFuZ2U9eyhldmVudCkgPT4gc2V0U3RhcnQoZXZlbnQudGFyZ2V0LnZhbHVlKX0gLz5cbiAgICAgICAgPGlucHV0IHR5cGU9XCJyYW5nZVwiIGFyaWEtbGFiZWw9e2Ake2xhYmVsfSBlbmRgfSBtaW49e3N0YXJ0ICsgc3RlcH0gbWF4PXttYXh9IHN0ZXA9e3N0ZXB9IHZhbHVlPXtlbmR9IG9uQ2hhbmdlPXsoZXZlbnQpID0+IHNldEVuZChldmVudC50YXJnZXQudmFsdWUpfSAvPlxuICAgICAgPC9kaXY+XG4gICAgICA8ZGl2IGNsYXNzTmFtZT1cImFib3V0LWVkaXRvci1yYW5nZS12YWx1ZXNcIj5cbiAgICAgICAgPGxhYmVsPjxzcGFuPlN0YXJ0czwvc3Bhbj48aW5wdXQgdHlwZT1cIm51bWJlclwiIG1pbj17bWluICogMTAwfSBtYXg9eyhlbmQgLSBzdGVwKSAqIDEwMH0gc3RlcD17cGVyY2VudGFnZVN0ZXB9IHZhbHVlPXtNYXRoLnJvdW5kKHN0YXJ0ICogMTAwKX0gb25DaGFuZ2U9eyhldmVudCkgPT4gc2V0U3RhcnQoTnVtYmVyKGV2ZW50LnRhcmdldC52YWx1ZSkgLyAxMDApfSAvPjxlbT4lPC9lbT48L2xhYmVsPlxuICAgICAgICA8aSBhcmlhLWhpZGRlbj1cInRydWVcIj7ihpI8L2k+XG4gICAgICAgIDxsYWJlbD48c3Bhbj5FbmRzPC9zcGFuPjxpbnB1dCB0eXBlPVwibnVtYmVyXCIgbWluPXsoc3RhcnQgKyBzdGVwKSAqIDEwMH0gbWF4PXttYXggKiAxMDB9IHN0ZXA9e3BlcmNlbnRhZ2VTdGVwfSB2YWx1ZT17TWF0aC5yb3VuZChlbmQgKiAxMDApfSBvbkNoYW5nZT17KGV2ZW50KSA9PiBzZXRFbmQoTnVtYmVyKGV2ZW50LnRhcmdldC52YWx1ZSkgLyAxMDApfSAvPjxlbT4lPC9lbT48L2xhYmVsPlxuICAgICAgPC9kaXY+XG4gICAgICB7aGludCA/IDxzbWFsbD57aGludH08L3NtYWxsPiA6IG51bGx9XG4gICAgPC9maWVsZHNldD5cbiAgKTtcbn1cblxuZnVuY3Rpb24gVHJhbnNwb3J0KHsgc3RvcmUsIHNuYXBzaG90IH0pIHtcbiAgY29uc3QgeyB0cmFuc3BvcnQsIGNvbXBpbGVkUGxhbiB9ID0gc25hcHNob3Q7XG4gIGNvbnN0IG1heFdVID0gY29tcGlsZWRQbGFuPy5tYXhTdG9yeVdVIHx8IDE7XG4gIGNvbnN0IHBsYXkgPSAoKSA9PiBzdG9yZS5zZXRUcmFuc3BvcnQoe1xuICAgIG93bmVyOiB0cmFuc3BvcnQucGxheWluZyA/ICd0aW1lbGluZScgOiAncGxheWJhY2snLFxuICAgIHBsYXlpbmc6ICF0cmFuc3BvcnQucGxheWluZyxcbiAgICBzdG9yeVdVOiB0cmFuc3BvcnQuc3RvcnlXVSxcbiAgfSk7XG4gIGNvbnN0IHNlZWsgPSAoc3RvcnlXVSkgPT4gc3RvcmUuc2V0VHJhbnNwb3J0KHsgb3duZXI6ICd0aW1lbGluZScsIHBsYXlpbmc6IGZhbHNlLCBzdG9yeVdVIH0pO1xuICBjb25zdCBzZWxlY3RlZCA9IGdldFNlY3Rpb24oc25hcHNob3QuZG9jdW1lbnQsIHNuYXBzaG90LnNlbGVjdGlvbik7XG4gIGNvbnN0IHNlY3Rpb25JbmRleCA9IGdldFNlY3Rpb25JbmRleChzbmFwc2hvdC5kb2N1bWVudCwgc2VsZWN0ZWQuaWQpO1xuICBjb25zdCBqdW1wU2VjdGlvbiA9IChkaXJlY3Rpb24pID0+IHtcbiAgICBjb25zdCBuZXh0ID0gc25hcHNob3QuY29tcGlsZWRQbGFuLnNlY3Rpb25zW01hdGgubWF4KDAsIE1hdGgubWluKHNuYXBzaG90LmNvbXBpbGVkUGxhbi5zZWN0aW9ucy5sZW5ndGggLSAxLCBzZWN0aW9uSW5kZXggKyBkaXJlY3Rpb24pKV07XG4gICAgaWYgKG5leHQpIHNlZWsobmV4dC5zdGFydFdVKTtcbiAgfTtcbiAgcmV0dXJuIChcbiAgICA8ZGl2IGNsYXNzTmFtZT1cImFib3V0LWVkaXRvci10cmFuc3BvcnRcIj5cbiAgICAgIDxidXR0b24gdHlwZT1cImJ1dHRvblwiIHRpdGxlPVwiUHJldmlvdXMgU2VjdGlvblwiIGFyaWEtbGFiZWw9XCJQcmV2aW91cyBTZWN0aW9uXCIgb25DbGljaz17KCkgPT4ganVtcFNlY3Rpb24oLTEpfT48U2tpcEJhY2sgYXJpYS1oaWRkZW49XCJ0cnVlXCIgLz48L2J1dHRvbj5cbiAgICAgIDxidXR0b24gdHlwZT1cImJ1dHRvblwiIHRpdGxlPVwiUHJldmlvdXMga2V5ZnJhbWUgwrcgTGVmdCBhcnJvd1wiIGFyaWEtbGFiZWw9XCJQcmV2aW91cyBrZXlmcmFtZVwiIG9uQ2xpY2s9eygpID0+IGp1bXBUaW1lbGluZUtleWZyYW1lKHN0b3JlLCBzbmFwc2hvdCwgLTEpfT48Q2hldnJvbkxlZnQgYXJpYS1oaWRkZW49XCJ0cnVlXCIgLz48L2J1dHRvbj5cbiAgICAgIDxidXR0b24gdHlwZT1cImJ1dHRvblwiIGNsYXNzTmFtZT1cImlzLXByaW1hcnlcIiB0aXRsZT17dHJhbnNwb3J0LnBsYXlpbmcgPyAnUGF1c2UnIDogJ1BsYXknfSBhcmlhLWxhYmVsPXt0cmFuc3BvcnQucGxheWluZyA/ICdQYXVzZScgOiAnUGxheSd9IG9uQ2xpY2s9e3BsYXl9PlxuICAgICAgICB7dHJhbnNwb3J0LnBsYXlpbmcgPyA8UGF1c2UgYXJpYS1oaWRkZW49XCJ0cnVlXCIgLz4gOiA8UGxheSBhcmlhLWhpZGRlbj1cInRydWVcIiAvPn1cbiAgICAgIDwvYnV0dG9uPlxuICAgICAgPGJ1dHRvbiB0eXBlPVwiYnV0dG9uXCIgdGl0bGU9XCJOZXh0IFNlY3Rpb25cIiBhcmlhLWxhYmVsPVwiTmV4dCBTZWN0aW9uXCIgb25DbGljaz17KCkgPT4ganVtcFNlY3Rpb24oMSl9PjxTa2lwRm9yd2FyZCBhcmlhLWhpZGRlbj1cInRydWVcIiAvPjwvYnV0dG9uPlxuICAgICAgPGJ1dHRvbiB0eXBlPVwiYnV0dG9uXCIgdGl0bGU9XCJOZXh0IGtleWZyYW1lIMK3IFJpZ2h0IGFycm93XCIgYXJpYS1sYWJlbD1cIk5leHQga2V5ZnJhbWVcIiBvbkNsaWNrPXsoKSA9PiBqdW1wVGltZWxpbmVLZXlmcmFtZShzdG9yZSwgc25hcHNob3QsIDEpfT48Q2hldnJvblJpZ2h0IGFyaWEtaGlkZGVuPVwidHJ1ZVwiIC8+PC9idXR0b24+XG4gICAgICA8b3V0cHV0Pntmb3JtYXRXVSh0cmFuc3BvcnQuc3RvcnlXVSl9PC9vdXRwdXQ+XG4gICAgICA8aW5wdXRcbiAgICAgICAgYXJpYS1sYWJlbD1cIkdsb2JhbCBuYXJyYXRpdmUgcGxheWhlYWRcIlxuICAgICAgICB0eXBlPVwicmFuZ2VcIlxuICAgICAgICBtaW49XCIwXCJcbiAgICAgICAgbWF4PXttYXhXVX1cbiAgICAgICAgc3RlcD1cIjAuMDAyXCJcbiAgICAgICAgdmFsdWU9e01hdGgubWluKG1heFdVLCB0cmFuc3BvcnQuc3RvcnlXVSl9XG4gICAgICAgIG9uQ2hhbmdlPXsoZXZlbnQpID0+IHNlZWsoTnVtYmVyKGV2ZW50LnRhcmdldC52YWx1ZSkpfVxuICAgICAgLz5cbiAgICAgIDxidXR0b25cbiAgICAgICAgdHlwZT1cImJ1dHRvblwiXG4gICAgICAgIGNsYXNzTmFtZT17dHJhbnNwb3J0Lm93bmVyID09PSAnc2Nyb2xsJyA/ICdpcy1hY3RpdmUnIDogJyd9XG4gICAgICAgIG9uQ2xpY2s9eygpID0+IHN0b3JlLnNldFRyYW5zcG9ydCh7IG93bmVyOiAnc2Nyb2xsJywgcGxheWluZzogZmFsc2UgfSl9XG4gICAgICA+Rm9sbG93IHNjcm9sbDwvYnV0dG9uPlxuICAgICAgPGJ1dHRvblxuICAgICAgICB0eXBlPVwiYnV0dG9uXCJcbiAgICAgICAgY2xhc3NOYW1lPXt0cmFuc3BvcnQubGl2ZUFtYmllbnQgPyAnaXMtYWN0aXZlJyA6ICcnfVxuICAgICAgICBvbkNsaWNrPXsoKSA9PiBzdG9yZS5zZXRUcmFuc3BvcnQoeyBsaXZlQW1iaWVudDogIXRyYW5zcG9ydC5saXZlQW1iaWVudCB9KX1cbiAgICAgID5MaXZlIGFtYmllbnQ8L2J1dHRvbj5cbiAgICAgIDxzZWxlY3RcbiAgICAgICAgYXJpYS1sYWJlbD1cIlByZXZpZXcgcHJvZmlsZVwiXG4gICAgICAgIHZhbHVlPXtzbmFwc2hvdC5wcmV2aWV3UHJvZmlsZX1cbiAgICAgICAgb25DaGFuZ2U9eyhldmVudCkgPT4gc3RvcmUuc2V0UHJldmlld1Byb2ZpbGUoZXZlbnQudGFyZ2V0LnZhbHVlKX1cbiAgICAgID5cbiAgICAgICAgPG9wdGlvbiB2YWx1ZT1cImRlc2t0b3BcIj5EZXNrdG9wPC9vcHRpb24+XG4gICAgICAgIDxvcHRpb24gdmFsdWU9XCJtb2JpbGVcIj5Nb2JpbGU8L29wdGlvbj5cbiAgICAgICAgPG9wdGlvbiB2YWx1ZT1cInJlZHVjZWQtbW90aW9uXCI+UmVkdWNlZCBtb3Rpb248L29wdGlvbj5cbiAgICAgIDwvc2VsZWN0PlxuICAgIDwvZGl2PlxuICApO1xufVxuXG5mdW5jdGlvbiBUaW1lbGluZSh7IHN0b3JlLCBzbmFwc2hvdCwgb25PcGVuR2xvYmFsIH0pIHtcbiAgY29uc3QgeyBkb2N1bWVudCwgY29tcGlsZWRQbGFuLCBzZWxlY3Rpb24sIHRyYW5zcG9ydCB9ID0gc25hcHNob3Q7XG4gIGNvbnN0IHNlbGVjdGVkQ3VlTWVtYmVycyA9IGdldEFib3V0TmFycmF0aXZlU2VsZWN0aW9uTWVtYmVycyhzZWxlY3Rpb24pO1xuICBjb25zdCBtYXhXVSA9IE1hdGgubWF4KDAuMDAxLCBjb21waWxlZFBsYW4/Lm1heFN0b3J5V1UgfHwgZG9jdW1lbnQuc2VjdGlvbnMucmVkdWNlKChzdW0sIHNlY3Rpb24pID0+IHN1bSArIHNlY3Rpb24uZXh0ZW50V1UsIDApKTtcbiAgY29uc3QgcGxheWhlYWQgPSBgJHsodHJhbnNwb3J0LnN0b3J5V1UgLyBtYXhXVSkgKiAxMDB9JWA7XG4gIGNvbnN0IGxhbmVzUmVmID0gdXNlUmVmKG51bGwpO1xuICBjb25zdCB0aW1pbmdEcmFnUmVmID0gdXNlUmVmKG51bGwpO1xuICBjb25zdCBwcmV2aWV3RnJhbWVSZWYgPSB1c2VSZWYobnVsbCk7XG4gIGNvbnN0IHBlbmRpbmdQcmV2aWV3UmVmID0gdXNlUmVmKG51bGwpO1xuICBjb25zdCBzdXBwcmVzc2VkQ2xpY2tSZWYgPSB1c2VSZWYobnVsbCk7XG4gIGNvbnN0IFtjYW1lcmFEcmFnUHJldmlldywgc2V0Q2FtZXJhRHJhZ1ByZXZpZXddID0gdXNlU3RhdGUobnVsbCk7XG4gIGNvbnN0IFtzZWN0aW9uUmVzaXplUHJldmlldywgc2V0U2VjdGlvblJlc2l6ZVByZXZpZXddID0gdXNlU3RhdGUobnVsbCk7XG4gIGNvbnN0IFttYXJxdWVlLCBzZXRNYXJxdWVlXSA9IHVzZVN0YXRlKG51bGwpO1xuXG4gIGNvbnN0IHF1ZXVlUHJldmlld0ZyYW1lID0gKGNhbGxiYWNrKSA9PiB7XG4gICAgcGVuZGluZ1ByZXZpZXdSZWYuY3VycmVudCA9IGNhbGxiYWNrO1xuICAgIGlmIChwcmV2aWV3RnJhbWVSZWYuY3VycmVudCkgcmV0dXJuO1xuICAgIHByZXZpZXdGcmFtZVJlZi5jdXJyZW50ID0gcmVxdWVzdEFuaW1hdGlvbkZyYW1lKCgpID0+IHtcbiAgICAgIHByZXZpZXdGcmFtZVJlZi5jdXJyZW50ID0gbnVsbDtcbiAgICAgIGNvbnN0IHBlbmRpbmcgPSBwZW5kaW5nUHJldmlld1JlZi5jdXJyZW50O1xuICAgICAgcGVuZGluZ1ByZXZpZXdSZWYuY3VycmVudCA9IG51bGw7XG4gICAgICBwZW5kaW5nPy4oKTtcbiAgICB9KTtcbiAgfTtcbiAgY29uc3QgZmx1c2hQcmV2aWV3RnJhbWUgPSAoKSA9PiB7XG4gICAgaWYgKHByZXZpZXdGcmFtZVJlZi5jdXJyZW50KSBjYW5jZWxBbmltYXRpb25GcmFtZShwcmV2aWV3RnJhbWVSZWYuY3VycmVudCk7XG4gICAgcHJldmlld0ZyYW1lUmVmLmN1cnJlbnQgPSBudWxsO1xuICAgIGNvbnN0IHBlbmRpbmcgPSBwZW5kaW5nUHJldmlld1JlZi5jdXJyZW50O1xuICAgIHBlbmRpbmdQcmV2aWV3UmVmLmN1cnJlbnQgPSBudWxsO1xuICAgIHBlbmRpbmc/LigpO1xuICB9O1xuXG4gIGNvbnN0IHpvb21UaW1lbGluZSA9IChldmVudCkgPT4ge1xuICAgIGlmICghZXZlbnQuY3RybEtleSAmJiAhZXZlbnQubWV0YUtleSkgcmV0dXJuO1xuICAgIGV2ZW50LnByZXZlbnREZWZhdWx0KCk7XG4gICAgY29uc3QgbGFuZXMgPSBsYW5lc1JlZi5jdXJyZW50O1xuICAgIGlmICghbGFuZXMpIHJldHVybjtcbiAgICBjb25zdCByZWN0ID0gbGFuZXMuZ2V0Qm91bmRpbmdDbGllbnRSZWN0KCk7XG4gICAgY29uc3QgcG9pbnRlclggPSBNYXRoLm1pbihyZWN0LndpZHRoLCBNYXRoLm1heCgwLCBldmVudC5jbGllbnRYIC0gcmVjdC5sZWZ0KSk7XG4gICAgY29uc3Qgc3RvcnlSYXRpbyA9IChsYW5lcy5zY3JvbGxMZWZ0ICsgcG9pbnRlclgpIC8gTWF0aC5tYXgoMSwgbGFuZXMuc2Nyb2xsV2lkdGgpO1xuICAgIGNvbnN0IGN1cnJlbnRab29tID0gTWF0aC5tYXgoMSwgTnVtYmVyKHRyYW5zcG9ydC56b29tKSB8fCAxKTtcbiAgICBjb25zdCBuZXh0Wm9vbSA9IE1hdGgubWluKDgsIE1hdGgubWF4KDEsIGN1cnJlbnRab29tICogTWF0aC5leHAoLWV2ZW50LmRlbHRhWSAqIDAuMDAyNSkpKTtcbiAgICBzdG9yZS5zZXRUcmFuc3BvcnQoeyB6b29tOiBOdW1iZXIobmV4dFpvb20udG9GaXhlZCgzKSkgfSk7XG4gICAgcmVxdWVzdEFuaW1hdGlvbkZyYW1lKCgpID0+IHtcbiAgICAgIGxhbmVzLnNjcm9sbExlZnQgPSAoc3RvcnlSYXRpbyAqIGxhbmVzLnNjcm9sbFdpZHRoKSAtIHBvaW50ZXJYO1xuICAgIH0pO1xuICB9O1xuXG4gIHVzZUVmZmVjdCgoKSA9PiAoKSA9PiB7XG4gICAgaWYgKHByZXZpZXdGcmFtZVJlZi5jdXJyZW50KSBjYW5jZWxBbmltYXRpb25GcmFtZShwcmV2aWV3RnJhbWVSZWYuY3VycmVudCk7XG4gIH0sIFtdKTtcblxuICBjb25zdCByZXNvbHZlQ2FtZXJhRHJvcEF0Q2xpZW50WCA9IChjbGllbnRYKSA9PiB7XG4gICAgY29uc3QgbGFuZXMgPSBsYW5lc1JlZi5jdXJyZW50O1xuICAgIGNvbnN0IGN1cnJlbnQgPSBzdG9yZS5nZXRTbmFwc2hvdCgpO1xuICAgIGlmICghbGFuZXMpIHJldHVybiB7IHZhbGlkOiBmYWxzZSwgcmVhc29uOiAnVGhlIGNhbWVyYSB0aW1lbGluZSBpcyBub3QgcmVhZHkuJyB9O1xuICAgIGNvbnN0IHJlY3QgPSBsYW5lcy5nZXRCb3VuZGluZ0NsaWVudFJlY3QoKTtcbiAgICBjb25zdCBjb250ZW50WCA9IE1hdGgubWluKFxuICAgICAgbGFuZXMuc2Nyb2xsV2lkdGgsXG4gICAgICBNYXRoLm1heCgwLCBjbGllbnRYIC0gcmVjdC5sZWZ0ICsgbGFuZXMuc2Nyb2xsTGVmdCksXG4gICAgKTtcbiAgICBjb25zdCBzdG9yeVdVID0gKGNvbnRlbnRYIC8gTWF0aC5tYXgoMSwgbGFuZXMuc2Nyb2xsV2lkdGgpKVxuICAgICAgKiBNYXRoLm1heCgwLjAwMSwgY3VycmVudC5jb21waWxlZFBsYW4/Lm1heFN0b3J5V1UgfHwgbWF4V1UpO1xuICAgIGNvbnN0IGRyYWcgPSB0aW1pbmdEcmFnUmVmLmN1cnJlbnQ7XG4gICAgY29uc3QgZHJvcCA9IHJlc29sdmVBYm91dE5hcnJhdGl2ZUNhbWVyYUtleURyb3Aoe1xuICAgICAgZG9jdW1lbnQ6IGN1cnJlbnQuZG9jdW1lbnQsXG4gICAgICBwbGFuOiBjdXJyZW50LmNvbXBpbGVkUGxhbixcbiAgICAgIHNvdXJjZVNlY3Rpb25JbmRleDogZHJhZz8uc2VjdGlvbkluZGV4LFxuICAgICAgc291cmNlS2V5SW5kZXg6IGRyYWc/LmtleUluZGV4LFxuICAgICAgc3RvcnlXVSxcbiAgICB9KTtcbiAgICByZXR1cm4geyAuLi5kcm9wLCBjb250ZW50WCB9O1xuICB9O1xuXG4gIGNvbnN0IGJlZ2luVGltaW5nRHJhZyA9IChldmVudCwgZHJhZykgPT4ge1xuICAgIGlmIChkcmFnLmxvY2tlZCB8fCBldmVudC5idXR0b24gIT09IDApIHJldHVybjtcbiAgICBjb25zdCBjbGlwID0gZXZlbnQuY3VycmVudFRhcmdldC5wYXJlbnRFbGVtZW50O1xuICAgIGNvbnN0IHJlY3QgPSBjbGlwPy5nZXRCb3VuZGluZ0NsaWVudFJlY3QoKTtcbiAgICBpZiAoIXJlY3Q/LndpZHRoKSByZXR1cm47XG4gICAgZXZlbnQucHJldmVudERlZmF1bHQoKTtcbiAgICBldmVudC5zdG9wUHJvcGFnYXRpb24oKTtcbiAgICBldmVudC5jdXJyZW50VGFyZ2V0LnNldFBvaW50ZXJDYXB0dXJlPy4oZXZlbnQucG9pbnRlcklkKTtcbiAgICBsZXQgbmV4dFNlbGVjdGlvbiA9IGRyYWcuc2VsZWN0aW9uO1xuICAgIGlmIChkcmFnLnR5cGUgPT09ICdjdWUnKSB7XG4gICAgICBjb25zdCBjdXJyZW50U2VsZWN0aW9uID0gc3RvcmUuZ2V0U25hcHNob3QoKS5zZWxlY3Rpb247XG4gICAgICBjb25zdCBjdXJyZW50TWVtYmVycyA9IGdldEFib3V0TmFycmF0aXZlU2VsZWN0aW9uTWVtYmVycyhjdXJyZW50U2VsZWN0aW9uKTtcbiAgICAgIGNvbnN0IGFscmVhZHlTZWxlY3RlZCA9IGN1cnJlbnRNZW1iZXJzLnNvbWUoKG1lbWJlcikgPT4gKFxuICAgICAgICBtZW1iZXIuc2VjdGlvbklkID09PSBkcmFnLnNlbGVjdGlvbi5zZWN0aW9uSWQgJiYgbWVtYmVyLmN1ZUlkID09PSBkcmFnLnNlbGVjdGlvbi5jdWVJZFxuICAgICAgKSk7XG4gICAgICBuZXh0U2VsZWN0aW9uID0gZXZlbnQuc2hpZnRLZXlcbiAgICAgICAgPyB0b2dnbGVBYm91dE5hcnJhdGl2ZUN1ZVNlbGVjdGlvbihjdXJyZW50U2VsZWN0aW9uLCBkcmFnLnNlbGVjdGlvbilcbiAgICAgICAgOiBhbHJlYWR5U2VsZWN0ZWQgJiYgY3VycmVudE1lbWJlcnMubGVuZ3RoID4gMVxuICAgICAgICAgID8geyAuLi5kcmFnLnNlbGVjdGlvbiwgbWVtYmVyczogY3VycmVudE1lbWJlcnMgfVxuICAgICAgICAgIDogZHJhZy5zZWxlY3Rpb247XG4gICAgICBzdG9yZS5iZWdpblByZXZpZXcoJ01vdmUgdGV4dCBDdWVzJyk7XG4gICAgfVxuICAgIHRpbWluZ0RyYWdSZWYuY3VycmVudCA9IHtcbiAgICAgIC4uLmRyYWcsXG4gICAgICBzZWxlY3Rpb246IG5leHRTZWxlY3Rpb24sXG4gICAgICBtZW1iZXJzOiBkcmFnLnR5cGUgPT09ICdjdWUnID8gZ2V0QWJvdXROYXJyYXRpdmVTZWxlY3Rpb25NZW1iZXJzKG5leHRTZWxlY3Rpb24pIDogbnVsbCxcbiAgICAgIHN0YXJ0RG9jdW1lbnQ6IGRyYWcudHlwZSA9PT0gJ2N1ZScgPyBjbG9uZUFib3V0TmFycmF0aXZlRG9jdW1lbnQoc3RvcmUuZ2V0U25hcHNob3QoKS5kb2N1bWVudCkgOiBudWxsLFxuICAgICAgc3RhcnRQbGFuOiBkcmFnLnR5cGUgPT09ICdjdWUnID8gc3RvcmUuZ2V0U25hcHNob3QoKS5jb21waWxlZFBsYW4gOiBudWxsLFxuICAgICAgcG9pbnRlcklkOiBldmVudC5wb2ludGVySWQsXG4gICAgICByZWN0LFxuICAgICAgc3RhcnRYOiBldmVudC5jbGllbnRYLFxuICAgICAgbW92ZWQ6IGZhbHNlLFxuICAgICAgbGFzdEF0OiBkcmFnLmF0LFxuICAgICAgbGFzdERyb3A6IG51bGwsXG4gICAgfTtcbiAgICBzdG9yZS5zZXRTZWxlY3Rpb24obmV4dFNlbGVjdGlvbik7XG4gICAgc3RvcmUuc2V0VHJhbnNwb3J0KHsgb3duZXI6ICd0aW1lbGluZScsIHBsYXlpbmc6IGZhbHNlLCBzdG9yeVdVOiBkcmFnLnN0b3J5V1UgfSk7XG4gIH07XG5cbiAgY29uc3QgbW92ZVRpbWluZ0RyYWcgPSAoZXZlbnQpID0+IHtcbiAgICBjb25zdCBkcmFnID0gdGltaW5nRHJhZ1JlZi5jdXJyZW50O1xuICAgIGlmICghZHJhZyB8fCBkcmFnLnBvaW50ZXJJZCAhPT0gZXZlbnQucG9pbnRlcklkKSByZXR1cm47XG4gICAgaWYgKCFkcmFnLm1vdmVkICYmIE1hdGguYWJzKGV2ZW50LmNsaWVudFggLSBkcmFnLnN0YXJ0WCkgPCAzKSByZXR1cm47XG4gICAgZHJhZy5tb3ZlZCA9IHRydWU7XG4gICAgaWYgKGRyYWcudHlwZSA9PT0gJ2NhbWVyYScpIHtcbiAgICAgIGNvbnN0IGRyb3AgPSByZXNvbHZlQ2FtZXJhRHJvcEF0Q2xpZW50WChldmVudC5jbGllbnRYKTtcbiAgICAgIGRyYWcubGFzdERyb3AgPSBkcm9wO1xuICAgICAgc2V0Q2FtZXJhRHJhZ1ByZXZpZXcoeyAuLi5kcm9wLCB0b2tlbjogZHJhZy50b2tlbiB9KTtcbiAgICAgIGlmIChkcm9wLnZhbGlkKSB7XG4gICAgICAgIHN0b3JlLnNldFRyYW5zcG9ydCh7IG93bmVyOiAndGltZWxpbmUnLCBwbGF5aW5nOiBmYWxzZSwgc3RvcnlXVTogZHJvcC5zdG9yeVdVIH0pO1xuICAgICAgfVxuICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICBpZiAoZHJhZy50eXBlID09PSAnZGlzY2lwbGluZS1yZXZlYWwnKSB7XG4gICAgICBjb25zdCBkZWx0YUxhbmUgPSAoZXZlbnQuY2xpZW50WCAtIGRyYWcuc3RhcnRYKSAvIGRyYWcucmVjdC53aWR0aDtcbiAgICAgIGNvbnN0IG5leHRBdCA9IE1hdGgubWluKGRyYWcubWF4LCBNYXRoLm1heChcbiAgICAgICAgZHJhZy5taW4sXG4gICAgICAgIHNuYXBBYm91dE5hcnJhdGl2ZVRpbWVsaW5lVmFsdWUoZHJhZy5hdCArIGRlbHRhTGFuZSksXG4gICAgICApKTtcbiAgICAgIGlmIChNYXRoLmFicyhuZXh0QXQgLSBkcmFnLmxhc3RBdCkgPCAwLjAwMDAwMSkgcmV0dXJuO1xuICAgICAgY29uc3QgZGVsdGEgPSBuZXh0QXQgLSBkcmFnLmxhc3RBdDtcbiAgICAgIHN0b3JlLmNvbW1pdCgnTW92ZSBEaXNjaXBsaW5lIHJldmVhbCcsIChkcmFmdCkgPT4ge1xuICAgICAgICBjb25zdCByZXZlYWwgPSBkcmFmdC5zZWN0aW9uc1tkcmFnLnNlY3Rpb25JbmRleF0udGV4dC5kaXNjaXBsaW5lUmV2ZWFsO1xuICAgICAgICBpZiAoIXJldmVhbCkgcmV0dXJuO1xuICAgICAgICByZXZlYWwuc3RhcnQgKz0gZGVsdGE7XG4gICAgICAgIHJldmVhbC5lbmQgKz0gZGVsdGE7XG4gICAgICB9LCB7IGNvYWxlc2NlS2V5OiBkcmFnLmNvYWxlc2NlS2V5LCBzZWxlY3Rpb246IGRyYWcuc2VsZWN0aW9uIH0pO1xuICAgICAgZHJhZy5sYXN0QXQgPSBuZXh0QXQ7XG4gICAgICBzdG9yZS5zZXRUcmFuc3BvcnQoe1xuICAgICAgICBvd25lcjogJ3RpbWVsaW5lJyxcbiAgICAgICAgcGxheWluZzogZmFsc2UsXG4gICAgICAgIHN0b3J5V1U6IGRyYWcuc2VjdGlvblN0YXJ0V1UgKyAobmV4dEF0ICogZHJhZy50cmF2ZWxXVSksXG4gICAgICB9KTtcbiAgICAgIHJldHVybjtcbiAgICB9XG4gICAgY29uc3QgbG9jYWxEZWx0YSA9IChldmVudC5jbGllbnRYIC0gZHJhZy5zdGFydFgpIC8gZHJhZy5yZWN0LndpZHRoO1xuICAgIGNvbnN0IG1vdmVtZW50ID0gcmVzb2x2ZUFib3V0TmFycmF0aXZlQ3VlR3JvdXBNb3ZlKHtcbiAgICAgIGRvY3VtZW50OiBkcmFnLnN0YXJ0RG9jdW1lbnQsXG4gICAgICBwbGFuOiBkcmFnLnN0YXJ0UGxhbixcbiAgICAgIG1lbWJlcnM6IGRyYWcubWVtYmVycyxcbiAgICAgIHByaW1hcnk6IGRyYWcuc2VsZWN0aW9uLFxuICAgICAgbG9jYWxEZWx0YSxcbiAgICB9KTtcbiAgICBpZiAoIW1vdmVtZW50LnZhbGlkIHx8IE1hdGguYWJzKG1vdmVtZW50LmRlbHRhV1UgLSAoZHJhZy5sYXN0RGVsdGFXVSB8fCAwKSkgPCAwLjAwMDAwMSkgcmV0dXJuO1xuICAgIGRyYWcubGFzdERlbHRhV1UgPSBtb3ZlbWVudC5kZWx0YVdVO1xuICAgIHF1ZXVlUHJldmlld0ZyYW1lKCgpID0+IHtcbiAgICAgIHN0b3JlLnVwZGF0ZVByZXZpZXcoKGRyYWZ0KSA9PiB7XG4gICAgICAgIG1vdmVtZW50Lm1vdmVzLmZvckVhY2goKG1vdmUpID0+IHtcbiAgICAgICAgICBjb25zdCBjdWUgPSBkcmFmdC5zZWN0aW9uc1ttb3ZlLnNlY3Rpb25JbmRleF0/LnRleHQ/LmN1ZXM/LmZpbmQoKGl0ZW0pID0+IGl0ZW0uaWQgPT09IG1vdmUuY3VlSWQpO1xuICAgICAgICAgIGlmIChjdWUpIE9iamVjdC5hc3NpZ24oY3VlLCB7IGVudGVyOiBtb3ZlLmVudGVyLCBob2xkOiBtb3ZlLmhvbGQsIGV4aXQ6IG1vdmUuZXhpdCB9KTtcbiAgICAgICAgfSk7XG4gICAgICB9LCB7XG4gICAgICAgIG93bmVyOiAndGltZWxpbmUnLFxuICAgICAgICBwbGF5aW5nOiBmYWxzZSxcbiAgICAgICAgc3RvcnlXVTogZHJhZy5zdG9yeVdVICsgbW92ZW1lbnQuZGVsdGFXVSxcbiAgICAgIH0pO1xuICAgIH0pO1xuICB9O1xuXG4gIGNvbnN0IGVuZFRpbWluZ0RyYWcgPSAoZXZlbnQpID0+IHtcbiAgICBjb25zdCBkcmFnID0gdGltaW5nRHJhZ1JlZi5jdXJyZW50O1xuICAgIGlmICghZHJhZyB8fCBkcmFnLnBvaW50ZXJJZCAhPT0gZXZlbnQucG9pbnRlcklkKSByZXR1cm47XG4gICAgaWYgKGV2ZW50LmN1cnJlbnRUYXJnZXQuaGFzUG9pbnRlckNhcHR1cmU/LihldmVudC5wb2ludGVySWQpKSBldmVudC5jdXJyZW50VGFyZ2V0LnJlbGVhc2VQb2ludGVyQ2FwdHVyZShldmVudC5wb2ludGVySWQpO1xuICAgIGlmIChkcmFnLnR5cGUgPT09ICdjdWUnKSB7XG4gICAgICBmbHVzaFByZXZpZXdGcmFtZSgpO1xuICAgICAgaWYgKGV2ZW50LnR5cGUgPT09ICdwb2ludGVyY2FuY2VsJyB8fCAhZHJhZy5tb3ZlZCkgc3RvcmUuY2FuY2VsUHJldmlldygpO1xuICAgICAgZWxzZSBzdG9yZS5jb21taXRQcmV2aWV3KGRyYWcuc2VsZWN0aW9uKTtcbiAgICB9XG4gICAgaWYgKGRyYWcudHlwZSA9PT0gJ2NhbWVyYScgJiYgZHJhZy5tb3ZlZCAmJiBldmVudC50eXBlICE9PSAncG9pbnRlcmNhbmNlbCcpIHtcbiAgICAgIGNvbnN0IGRyb3AgPSBkcmFnLmxhc3REcm9wIHx8IHJlc29sdmVDYW1lcmFEcm9wQXRDbGllbnRYKGV2ZW50LmNsaWVudFgpO1xuICAgICAgaWYgKGRyb3AudmFsaWQpIHtcbiAgICAgICAgc3RvcmUuY29tbWl0KCdNb3ZlIGNhbWVyYSBrZXknLCAoZHJhZnQpID0+IHtcbiAgICAgICAgICBjb25zdCBzb3VyY2VLZXlzID0gZHJhZnQuc2VjdGlvbnNbZHJhZy5zZWN0aW9uSW5kZXhdPy5jYW1lcmEua2V5cztcbiAgICAgICAgICBjb25zdCBbbW92ZWRLZXldID0gc291cmNlS2V5cz8uc3BsaWNlKGRyYWcua2V5SW5kZXgsIDEpIHx8IFtdO1xuICAgICAgICAgIGlmICghbW92ZWRLZXkpIHJldHVybjtcbiAgICAgICAgICBtb3ZlZEtleS5hdCA9IGRyb3AuYXQ7XG4gICAgICAgICAgY29uc3QgZGVzdGluYXRpb25LZXlzID0gZHJhZnQuc2VjdGlvbnNbZHJvcC5zZWN0aW9uSW5kZXhdLmNhbWVyYS5rZXlzO1xuICAgICAgICAgIGRlc3RpbmF0aW9uS2V5cy5wdXNoKG1vdmVkS2V5KTtcbiAgICAgICAgICBkZXN0aW5hdGlvbktleXMuc29ydCgoYSwgYikgPT4gYS5hdCAtIGIuYXQpO1xuICAgICAgICB9LCB7XG4gICAgICAgICAgc2VsZWN0aW9uOiB7IHR5cGU6ICdjYW1lcmEta2V5Jywgc2VjdGlvbklkOiBkcm9wLnNlY3Rpb25JZCwga2V5SW5kZXg6IGRyb3Aua2V5SW5kZXggfSxcbiAgICAgICAgfSk7XG4gICAgICAgIHN0b3JlLnNldFRyYW5zcG9ydCh7IG93bmVyOiAndGltZWxpbmUnLCBwbGF5aW5nOiBmYWxzZSwgc3RvcnlXVTogZHJvcC5zdG9yeVdVIH0pO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgc3RvcmUuc2V0U2F2ZVN0YXRlKHsgbWVzc2FnZTogZHJvcC5yZWFzb24gfHwgJ1RoYXQgY2FtZXJhIGtleSBjYW5ub3QgYmUgcGxhY2VkIGhlcmUuJyB9KTtcbiAgICAgIH1cbiAgICB9XG4gICAgaWYgKGRyYWcubW92ZWQpIHtcbiAgICAgIHN1cHByZXNzZWRDbGlja1JlZi5jdXJyZW50ID0gZHJhZy50b2tlbjtcbiAgICAgIHdpbmRvdy5zZXRUaW1lb3V0KCgpID0+IHtcbiAgICAgICAgaWYgKHN1cHByZXNzZWRDbGlja1JlZi5jdXJyZW50ID09PSBkcmFnLnRva2VuKSBzdXBwcmVzc2VkQ2xpY2tSZWYuY3VycmVudCA9IG51bGw7XG4gICAgICB9LCAwKTtcbiAgICB9XG4gICAgc2V0Q2FtZXJhRHJhZ1ByZXZpZXcobnVsbCk7XG4gICAgdGltaW5nRHJhZ1JlZi5jdXJyZW50ID0gbnVsbDtcbiAgfTtcblxuICBjb25zdCBoYW5kbGVUaW1pbmdDbGljayA9ICh0b2tlbiwgYWN0aW9uKSA9PiB7XG4gICAgaWYgKHN1cHByZXNzZWRDbGlja1JlZi5jdXJyZW50ID09PSB0b2tlbikge1xuICAgICAgc3VwcHJlc3NlZENsaWNrUmVmLmN1cnJlbnQgPSBudWxsO1xuICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICBhY3Rpb24oKTtcbiAgfTtcblxuICBjb25zdCBiZWdpblNlY3Rpb25SZXNpemUgPSAoZXZlbnQsIGRhdGEpID0+IHtcbiAgICBpZiAoZGF0YS5sb2NrZWQgfHwgZXZlbnQuYnV0dG9uICE9PSAwKSByZXR1cm47XG4gICAgZXZlbnQucHJldmVudERlZmF1bHQoKTtcbiAgICBldmVudC5zdG9wUHJvcGFnYXRpb24oKTtcbiAgICBldmVudC5jdXJyZW50VGFyZ2V0LnNldFBvaW50ZXJDYXB0dXJlPy4oZXZlbnQucG9pbnRlcklkKTtcbiAgICBjb25zdCBjdXJyZW50ID0gc3RvcmUuZ2V0U25hcHNob3QoKTtcbiAgICBjb25zdCBmaWVsZCA9IGdldEFib3V0TmFycmF0aXZlRXh0ZW50RmllbGQoY3VycmVudC5wcmV2aWV3UHJvZmlsZSk7XG4gICAgc3RvcmUuYmVnaW5QcmV2aWV3KGBSZXNpemUgJHtkYXRhLnNlY3Rpb25MYWJlbH1gKTtcbiAgICBzdG9yZS5zZXRTZWxlY3Rpb24oeyB0eXBlOiAnc2VjdGlvbicsIHNlY3Rpb25JZDogZGF0YS5zZWN0aW9uSWQgfSk7XG4gICAgdGltaW5nRHJhZ1JlZi5jdXJyZW50ID0ge1xuICAgICAgdHlwZTogJ3NlY3Rpb24tcmVzaXplJyxcbiAgICAgIHRva2VuOiBgc2VjdGlvbi1yZXNpemU6JHtkYXRhLnNlY3Rpb25JZH1gLFxuICAgICAgcG9pbnRlcklkOiBldmVudC5wb2ludGVySWQsXG4gICAgICBzdGFydFg6IGV2ZW50LmNsaWVudFgsXG4gICAgICBtb3ZlZDogZmFsc2UsXG4gICAgICBzZWN0aW9uSWQ6IGRhdGEuc2VjdGlvbklkLFxuICAgICAgc2VjdGlvbkluZGV4OiBkYXRhLnNlY3Rpb25JbmRleCxcbiAgICAgIHNlY3Rpb25MYWJlbDogZGF0YS5zZWN0aW9uTGFiZWwsXG4gICAgICBmaWVsZCxcbiAgICAgIHN0YXJ0RXh0ZW50OiBOdW1iZXIoY3VycmVudC5kb2N1bWVudC5zZWN0aW9uc1tkYXRhLnNlY3Rpb25JbmRleF1bZmllbGRdKSxcbiAgICAgIHN0YXJ0TWF4V1U6IE1hdGgubWF4KDAuMDAxLCBjdXJyZW50LmNvbXBpbGVkUGxhbj8ubWF4U3RvcnlXVSB8fCBtYXhXVSksXG4gICAgICBzdGFydFNjcm9sbFdpZHRoOiBNYXRoLm1heCgxLCBsYW5lc1JlZi5jdXJyZW50Py5zY3JvbGxXaWR0aCB8fCAxKSxcbiAgICAgIHBsYXloZWFkQ29udGV4dDogY2FwdHVyZUFib3V0TmFycmF0aXZlUGxheWhlYWRDb250ZXh0KHtcbiAgICAgICAgcGxhbjogY3VycmVudC5jb21waWxlZFBsYW4sXG4gICAgICAgIHN0b3J5V1U6IGN1cnJlbnQudHJhbnNwb3J0LnN0b3J5V1UsXG4gICAgICAgIHJlc2l6ZWRTZWN0aW9uSWQ6IGRhdGEuc2VjdGlvbklkLFxuICAgICAgfSksXG4gICAgICBzZWxlY3Rpb246IHsgdHlwZTogJ3NlY3Rpb24nLCBzZWN0aW9uSWQ6IGRhdGEuc2VjdGlvbklkIH0sXG4gICAgfTtcbiAgICBzZXRTZWN0aW9uUmVzaXplUHJldmlldyh7IHNlY3Rpb25JZDogZGF0YS5zZWN0aW9uSWQsIGV4dGVudDogTnVtYmVyKGN1cnJlbnQuZG9jdW1lbnQuc2VjdGlvbnNbZGF0YS5zZWN0aW9uSW5kZXhdW2ZpZWxkXSkgfSk7XG4gIH07XG5cbiAgY29uc3QgbW92ZVNlY3Rpb25SZXNpemUgPSAoZXZlbnQpID0+IHtcbiAgICBjb25zdCBkcmFnID0gdGltaW5nRHJhZ1JlZi5jdXJyZW50O1xuICAgIGlmIChkcmFnPy50eXBlICE9PSAnc2VjdGlvbi1yZXNpemUnIHx8IGRyYWcucG9pbnRlcklkICE9PSBldmVudC5wb2ludGVySWQpIHJldHVybjtcbiAgICBpZiAoIWRyYWcubW92ZWQgJiYgTWF0aC5hYnMoZXZlbnQuY2xpZW50WCAtIGRyYWcuc3RhcnRYKSA8IDMpIHJldHVybjtcbiAgICBkcmFnLm1vdmVkID0gdHJ1ZTtcbiAgICBjb25zdCByYXdFeHRlbnQgPSBkcmFnLnN0YXJ0RXh0ZW50ICsgKCgoZXZlbnQuY2xpZW50WCAtIGRyYWcuc3RhcnRYKSAvIGRyYWcuc3RhcnRTY3JvbGxXaWR0aCkgKiBkcmFnLnN0YXJ0TWF4V1UpO1xuICAgIGNvbnN0IHN0ZXAgPSBldmVudC5hbHRLZXkgPyAwLjAxIDogZXZlbnQuc2hpZnRLZXkgPyAwLjI1IDogMC4wNTtcbiAgICBjb25zdCBleHRlbnQgPSBNYXRoLm1pbig4LCBNYXRoLm1heCgxLCBNYXRoLnJvdW5kKHJhd0V4dGVudCAvIHN0ZXApICogc3RlcCkpO1xuICAgIGlmIChNYXRoLmFicyhleHRlbnQgLSAoZHJhZy5sYXN0RXh0ZW50ID8/IGRyYWcuc3RhcnRFeHRlbnQpKSA8IDAuMDAwMDAxKSByZXR1cm47XG4gICAgZHJhZy5sYXN0RXh0ZW50ID0gTnVtYmVyKGV4dGVudC50b0ZpeGVkKDIpKTtcbiAgICBzZXRTZWN0aW9uUmVzaXplUHJldmlldyh7IHNlY3Rpb25JZDogZHJhZy5zZWN0aW9uSWQsIGV4dGVudDogZHJhZy5sYXN0RXh0ZW50IH0pO1xuICAgIHF1ZXVlUHJldmlld0ZyYW1lKCgpID0+IHtcbiAgICAgIHN0b3JlLnVwZGF0ZVByZXZpZXcoKGRyYWZ0KSA9PiB7XG4gICAgICAgIGRyYWZ0LnNlY3Rpb25zW2RyYWcuc2VjdGlvbkluZGV4XVtkcmFnLmZpZWxkXSA9IGRyYWcubGFzdEV4dGVudDtcbiAgICAgIH0pO1xuICAgICAgc3RvcmUuc2V0VHJhbnNwb3J0KHtcbiAgICAgICAgb3duZXI6ICd0aW1lbGluZScsXG4gICAgICAgIHBsYXlpbmc6IGZhbHNlLFxuICAgICAgICBzdG9yeVdVOiByZW1hcEFib3V0TmFycmF0aXZlUGxheWhlYWRDb250ZXh0KGRyYWcucGxheWhlYWRDb250ZXh0LCBzdG9yZS5nZXRTbmFwc2hvdCgpLmNvbXBpbGVkUGxhbiksXG4gICAgICB9KTtcbiAgICB9KTtcbiAgfTtcblxuICBjb25zdCBlbmRTZWN0aW9uUmVzaXplID0gKGV2ZW50KSA9PiB7XG4gICAgY29uc3QgZHJhZyA9IHRpbWluZ0RyYWdSZWYuY3VycmVudDtcbiAgICBpZiAoZHJhZz8udHlwZSAhPT0gJ3NlY3Rpb24tcmVzaXplJyB8fCBkcmFnLnBvaW50ZXJJZCAhPT0gZXZlbnQucG9pbnRlcklkKSByZXR1cm47XG4gICAgaWYgKGV2ZW50LmN1cnJlbnRUYXJnZXQuaGFzUG9pbnRlckNhcHR1cmU/LihldmVudC5wb2ludGVySWQpKSBldmVudC5jdXJyZW50VGFyZ2V0LnJlbGVhc2VQb2ludGVyQ2FwdHVyZShldmVudC5wb2ludGVySWQpO1xuICAgIGZsdXNoUHJldmlld0ZyYW1lKCk7XG4gICAgaWYgKGV2ZW50LnR5cGUgPT09ICdwb2ludGVyY2FuY2VsJyB8fCAhZHJhZy5tb3ZlZCkgc3RvcmUuY2FuY2VsUHJldmlldygpO1xuICAgIGVsc2Ugc3RvcmUuY29tbWl0UHJldmlldyhkcmFnLnNlbGVjdGlvbik7XG4gICAgdGltaW5nRHJhZ1JlZi5jdXJyZW50ID0gbnVsbDtcbiAgICBzZXRTZWN0aW9uUmVzaXplUHJldmlldyhudWxsKTtcbiAgfTtcblxuICBjb25zdCByZXNldFNlY3Rpb25FeHRlbnQgPSAoc2VjdGlvbklkLCBzZWN0aW9uSW5kZXgpID0+IHtcbiAgICBjb25zdCBjdXJyZW50ID0gc3RvcmUuZ2V0U25hcHNob3QoKTtcbiAgICBjb25zdCBmaWVsZCA9IGdldEFib3V0TmFycmF0aXZlRXh0ZW50RmllbGQoY3VycmVudC5wcmV2aWV3UHJvZmlsZSk7XG4gICAgY29uc3QgYmFzZWxpbmVTZWN0aW9uID0gY3VycmVudC5iYXNlbGluZURvY3VtZW50LnNlY3Rpb25zLmZpbmQoKGl0ZW0pID0+IGl0ZW0uaWQgPT09IHNlY3Rpb25JZCk7XG4gICAgaWYgKCFiYXNlbGluZVNlY3Rpb24gfHwgYmFzZWxpbmVTZWN0aW9uW2ZpZWxkXSA9PT0gY3VycmVudC5kb2N1bWVudC5zZWN0aW9uc1tzZWN0aW9uSW5kZXhdW2ZpZWxkXSkgcmV0dXJuO1xuICAgIGNvbnN0IGNvbnRleHQgPSBjYXB0dXJlQWJvdXROYXJyYXRpdmVQbGF5aGVhZENvbnRleHQoe1xuICAgICAgcGxhbjogY3VycmVudC5jb21waWxlZFBsYW4sXG4gICAgICBzdG9yeVdVOiBjdXJyZW50LnRyYW5zcG9ydC5zdG9yeVdVLFxuICAgICAgcmVzaXplZFNlY3Rpb25JZDogc2VjdGlvbklkLFxuICAgIH0pO1xuICAgIHN0b3JlLmJlZ2luUHJldmlldygnUmVzdG9yZSBzYXZlZCBTZWN0aW9uIGxlbmd0aCcpO1xuICAgIHN0b3JlLnVwZGF0ZVByZXZpZXcoKGRyYWZ0KSA9PiB7IGRyYWZ0LnNlY3Rpb25zW3NlY3Rpb25JbmRleF1bZmllbGRdID0gYmFzZWxpbmVTZWN0aW9uW2ZpZWxkXTsgfSk7XG4gICAgc3RvcmUuc2V0VHJhbnNwb3J0KHsgc3RvcnlXVTogcmVtYXBBYm91dE5hcnJhdGl2ZVBsYXloZWFkQ29udGV4dChjb250ZXh0LCBzdG9yZS5nZXRTbmFwc2hvdCgpLmNvbXBpbGVkUGxhbikgfSk7XG4gICAgc3RvcmUuY29tbWl0UHJldmlldyh7IHR5cGU6ICdzZWN0aW9uJywgc2VjdGlvbklkIH0pO1xuICB9O1xuXG4gIGNvbnN0IGJlZ2luTWFycXVlZSA9IChldmVudCkgPT4ge1xuICAgIGlmIChldmVudC5idXR0b24gIT09IDAgfHwgZXZlbnQudGFyZ2V0ICE9PSBldmVudC5jdXJyZW50VGFyZ2V0KSByZXR1cm47XG4gICAgY29uc3QgY2FudmFzID0gbGFuZXNSZWYuY3VycmVudD8ucXVlcnlTZWxlY3RvcignLmFib3V0LWVkaXRvci10aW1lbGluZS1jYW52YXMnKTtcbiAgICBpZiAoIWNhbnZhcykgcmV0dXJuO1xuICAgIGV2ZW50LnByZXZlbnREZWZhdWx0KCk7XG4gICAgZXZlbnQuY3VycmVudFRhcmdldC5zZXRQb2ludGVyQ2FwdHVyZT8uKGV2ZW50LnBvaW50ZXJJZCk7XG4gICAgY29uc3QgcmVjdCA9IGNhbnZhcy5nZXRCb3VuZGluZ0NsaWVudFJlY3QoKTtcbiAgICB0aW1pbmdEcmFnUmVmLmN1cnJlbnQgPSB7XG4gICAgICB0eXBlOiAnbWFycXVlZScsXG4gICAgICBwb2ludGVySWQ6IGV2ZW50LnBvaW50ZXJJZCxcbiAgICAgIHN0YXJ0Q2xpZW50WDogZXZlbnQuY2xpZW50WCxcbiAgICAgIHN0YXJ0Q2xpZW50WTogZXZlbnQuY2xpZW50WSxcbiAgICAgIGNhbnZhc1JlY3Q6IHJlY3QsXG4gICAgICBhZGRpdGl2ZTogZXZlbnQuc2hpZnRLZXksXG4gICAgfTtcbiAgICBzZXRNYXJxdWVlKHsgbGVmdDogZXZlbnQuY2xpZW50WCAtIHJlY3QubGVmdCwgdG9wOiBldmVudC5jbGllbnRZIC0gcmVjdC50b3AsIHdpZHRoOiAwLCBoZWlnaHQ6IDAgfSk7XG4gIH07XG5cbiAgY29uc3QgbW92ZU1hcnF1ZWUgPSAoZXZlbnQpID0+IHtcbiAgICBjb25zdCBkcmFnID0gdGltaW5nRHJhZ1JlZi5jdXJyZW50O1xuICAgIGlmIChkcmFnPy50eXBlICE9PSAnbWFycXVlZScgfHwgZHJhZy5wb2ludGVySWQgIT09IGV2ZW50LnBvaW50ZXJJZCkgcmV0dXJuO1xuICAgIGNvbnN0IGxlZnQgPSBNYXRoLm1pbihkcmFnLnN0YXJ0Q2xpZW50WCwgZXZlbnQuY2xpZW50WCkgLSBkcmFnLmNhbnZhc1JlY3QubGVmdDtcbiAgICBjb25zdCB0b3AgPSBNYXRoLm1pbihkcmFnLnN0YXJ0Q2xpZW50WSwgZXZlbnQuY2xpZW50WSkgLSBkcmFnLmNhbnZhc1JlY3QudG9wO1xuICAgIHNldE1hcnF1ZWUoe1xuICAgICAgbGVmdCxcbiAgICAgIHRvcCxcbiAgICAgIHdpZHRoOiBNYXRoLmFicyhldmVudC5jbGllbnRYIC0gZHJhZy5zdGFydENsaWVudFgpLFxuICAgICAgaGVpZ2h0OiBNYXRoLmFicyhldmVudC5jbGllbnRZIC0gZHJhZy5zdGFydENsaWVudFkpLFxuICAgIH0pO1xuICB9O1xuXG4gIGNvbnN0IGVuZE1hcnF1ZWUgPSAoZXZlbnQpID0+IHtcbiAgICBjb25zdCBkcmFnID0gdGltaW5nRHJhZ1JlZi5jdXJyZW50O1xuICAgIGlmIChkcmFnPy50eXBlICE9PSAnbWFycXVlZScgfHwgZHJhZy5wb2ludGVySWQgIT09IGV2ZW50LnBvaW50ZXJJZCkgcmV0dXJuO1xuICAgIGlmIChldmVudC5jdXJyZW50VGFyZ2V0Lmhhc1BvaW50ZXJDYXB0dXJlPy4oZXZlbnQucG9pbnRlcklkKSkgZXZlbnQuY3VycmVudFRhcmdldC5yZWxlYXNlUG9pbnRlckNhcHR1cmUoZXZlbnQucG9pbnRlcklkKTtcbiAgICBpZiAoZXZlbnQudHlwZSAhPT0gJ3BvaW50ZXJjYW5jZWwnKSB7XG4gICAgICBjb25zdCBzZWxlY3Rpb25SZWN0ID0ge1xuICAgICAgICBsZWZ0OiBNYXRoLm1pbihkcmFnLnN0YXJ0Q2xpZW50WCwgZXZlbnQuY2xpZW50WCksXG4gICAgICAgIHJpZ2h0OiBNYXRoLm1heChkcmFnLnN0YXJ0Q2xpZW50WCwgZXZlbnQuY2xpZW50WCksXG4gICAgICAgIHRvcDogTWF0aC5taW4oZHJhZy5zdGFydENsaWVudFksIGV2ZW50LmNsaWVudFkpLFxuICAgICAgICBib3R0b206IE1hdGgubWF4KGRyYWcuc3RhcnRDbGllbnRZLCBldmVudC5jbGllbnRZKSxcbiAgICAgIH07XG4gICAgICBjb25zdCBsYW5lUmVjdCA9IGxhbmVzUmVmLmN1cnJlbnQ/LmdldEJvdW5kaW5nQ2xpZW50UmVjdCgpO1xuICAgICAgY29uc3QgaGl0cyA9IFsuLi4obGFuZXNSZWYuY3VycmVudD8ucXVlcnlTZWxlY3RvckFsbCgnLmFib3V0LWVkaXRvci1jdWVbZGF0YS1jdWUtaWRdJykgfHwgW10pXVxuICAgICAgICAuZmlsdGVyKChub2RlKSA9PiB7XG4gICAgICAgICAgY29uc3QgcmVjdCA9IG5vZGUuZ2V0Qm91bmRpbmdDbGllbnRSZWN0KCk7XG4gICAgICAgICAgY29uc3QgdmlzaWJsZSA9IGxhbmVSZWN0ICYmIHJlY3QucmlnaHQgPj0gbGFuZVJlY3QubGVmdCAmJiByZWN0LmxlZnQgPD0gbGFuZVJlY3QucmlnaHQ7XG4gICAgICAgICAgcmV0dXJuIHZpc2libGUgJiYgcmVjdC5yaWdodCA+PSBzZWxlY3Rpb25SZWN0LmxlZnQgJiYgcmVjdC5sZWZ0IDw9IHNlbGVjdGlvblJlY3QucmlnaHRcbiAgICAgICAgICAgICYmIHJlY3QuYm90dG9tID49IHNlbGVjdGlvblJlY3QudG9wICYmIHJlY3QudG9wIDw9IHNlbGVjdGlvblJlY3QuYm90dG9tO1xuICAgICAgICB9KVxuICAgICAgICAubWFwKChub2RlKSA9PiAoeyB0eXBlOiAnY3VlJywgc2VjdGlvbklkOiBub2RlLmRhdGFzZXQuc2VjdGlvbklkLCBjdWVJZDogbm9kZS5kYXRhc2V0LmN1ZUlkLCBrZXlQYXJ0OiAnZm9jdXMnIH0pKTtcbiAgICAgIGlmIChoaXRzLmxlbmd0aCkge1xuICAgICAgICBsZXQgbmV4dFNlbGVjdGlvbiA9IGRyYWcuYWRkaXRpdmUgPyBzdG9yZS5nZXRTbmFwc2hvdCgpLnNlbGVjdGlvbiA6IGhpdHNbMF07XG4gICAgICAgIGhpdHMuc2xpY2UoZHJhZy5hZGRpdGl2ZSA/IDAgOiAxKS5mb3JFYWNoKChoaXQpID0+IHtcbiAgICAgICAgICBuZXh0U2VsZWN0aW9uID0gdG9nZ2xlQWJvdXROYXJyYXRpdmVDdWVTZWxlY3Rpb24obmV4dFNlbGVjdGlvbiwgaGl0KTtcbiAgICAgICAgfSk7XG4gICAgICAgIHN0b3JlLnNldFNlbGVjdGlvbihuZXh0U2VsZWN0aW9uKTtcbiAgICAgIH1cbiAgICB9XG4gICAgdGltaW5nRHJhZ1JlZi5jdXJyZW50ID0gbnVsbDtcbiAgICBzZXRNYXJxdWVlKG51bGwpO1xuICB9O1xuXG4gIHJldHVybiAoXG4gICAgPGRpdiBjbGFzc05hbWU9XCJhYm91dC1lZGl0b3ItdGltZWxpbmVcIj5cbiAgICAgIDxkaXYgY2xhc3NOYW1lPVwiYWJvdXQtZWRpdG9yLWxhbmUtbGFiZWxzXCIgYXJpYS1sYWJlbD1cIlRpbWVsaW5lIHRyYWNrc1wiPlxuICAgICAgICB7VElNRUxJTkVfR0xPQkFMX1RSQUNLUy5tYXAoKHRyYWNrKSA9PiAoXG4gICAgICAgICAgdHJhY2suZ3JvdXBJZHMubGVuZ3RoID8gKFxuICAgICAgICAgICAgPGJ1dHRvblxuICAgICAgICAgICAgICB0eXBlPVwiYnV0dG9uXCJcbiAgICAgICAgICAgICAga2V5PXt0cmFjay5sYW5lfVxuICAgICAgICAgICAgICBjbGFzc05hbWU9e3NlbGVjdGlvbi50eXBlID09PSAnc2VxdWVuY2UnICYmIHNlbGVjdGlvbi50cmFjayA9PT0gdHJhY2subGFuZSA/ICdpcy1hY3RpdmUnIDogJyd9XG4gICAgICAgICAgICAgIGRhdGEtZ2xvYmFsLXRyYWNrPXt0cmFjay5sYW5lfVxuICAgICAgICAgICAgICBhcmlhLWxhYmVsPXtgT3BlbiBnbG9iYWwgJHt0cmFjay5sYWJlbH0gY29udHJvbHNgfVxuICAgICAgICAgICAgICBhcmlhLXByZXNzZWQ9e3NlbGVjdGlvbi50eXBlID09PSAnc2VxdWVuY2UnICYmIHNlbGVjdGlvbi50cmFjayA9PT0gdHJhY2subGFuZX1cbiAgICAgICAgICAgICAgb25DbGljaz17KCkgPT4gb25PcGVuR2xvYmFsPy4oeyB0eXBlOiAnc2VxdWVuY2UnLCB0cmFjazogdHJhY2subGFuZSwgdHJhY2tMYWJlbDogdHJhY2subGFiZWwsIGdyb3VwSWRzOiB0cmFjay5ncm91cElkcyB9KX1cbiAgICAgICAgICAgID57dHJhY2subGFiZWx9PC9idXR0b24+XG4gICAgICAgICAgKSA6IDxzcGFuIGtleT17dHJhY2subGFuZX0+e3RyYWNrLmxhYmVsfTwvc3Bhbj5cbiAgICAgICAgKSl9XG4gICAgICA8L2Rpdj5cbiAgICAgIDxkaXYgcmVmPXtsYW5lc1JlZn0gY2xhc3NOYW1lPVwiYWJvdXQtZWRpdG9yLWxhbmVzXCIgZGF0YS1zb2xvLXRyYWNrPXt0cmFuc3BvcnQuc29sb1RyYWNrIHx8ICcnfSBvbldoZWVsPXt6b29tVGltZWxpbmV9PlxuICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cImFib3V0LWVkaXRvci10aW1lbGluZS1jYW52YXNcIiBzdHlsZT17eyAnLS1hYm91dC1lZGl0b3ItcGxheWhlYWQnOiBwbGF5aGVhZCwgJy0tYWJvdXQtZWRpdG9yLXRpbWVsaW5lLXpvb20nOiBNYXRoLm1heCgxLCBOdW1iZXIodHJhbnNwb3J0Lnpvb20pIHx8IDEpIH19PlxuICAgICAgICAgIDxkaXYgY2xhc3NOYW1lPVwiYWJvdXQtZWRpdG9yLXBsYXloZWFkXCIgLz5cbiAgICAgICAgICB7bWFycXVlZSA/IDxkaXYgY2xhc3NOYW1lPVwiYWJvdXQtZWRpdG9yLW1hcnF1ZWVcIiBzdHlsZT17bWFycXVlZX0gYXJpYS1oaWRkZW49XCJ0cnVlXCIgLz4gOiBudWxsfVxuICAgICAgICAgIHtjYW1lcmFEcmFnUHJldmlldyA/IChcbiAgICAgICAgICA8ZGl2XG4gICAgICAgICAgICBjbGFzc05hbWU9e2BhYm91dC1lZGl0b3ItY2FtZXJhLWRyYWctZ2hvc3Qke2NhbWVyYURyYWdQcmV2aWV3LnZhbGlkID8gJycgOiAnIGlzLWludmFsaWQnfWB9XG4gICAgICAgICAgICBzdHlsZT17eyBsZWZ0OiBgJHtjYW1lcmFEcmFnUHJldmlldy5jb250ZW50WH1weGAgfX1cbiAgICAgICAgICAgIGFyaWEtaGlkZGVuPVwidHJ1ZVwiXG4gICAgICAgICAgPlxuICAgICAgICAgICAgPGkgLz5cbiAgICAgICAgICAgIDxzcGFuPntjYW1lcmFEcmFnUHJldmlldy52YWxpZCA/IGAke2NhbWVyYURyYWdQcmV2aWV3LnNlY3Rpb25MYWJlbH0gwrcgJHtmb3JtYXRDYW1lcmFQZXJjZW50KGNhbWVyYURyYWdQcmV2aWV3LmF0KX1gIDogY2FtZXJhRHJhZ1ByZXZpZXcucmVhc29ufTwvc3Bhbj5cbiAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICApIDogbnVsbH1cbiAgICAgICAgICB7WydzZWN0aW9uJywgJ2NhbWVyYScsICd3b3JsZCcsICd0ZXh0JywgJ2ludGVyYWN0aW9uJ10ubWFwKChsYW5lKSA9PiAoXG4gICAgICAgICAgPGRpdiBjbGFzc05hbWU9e2BhYm91dC1lZGl0b3ItbGFuZSBhYm91dC1lZGl0b3ItbGFuZS0tJHtsYW5lfWB9IGtleT17bGFuZX0+XG4gICAgICAgICAgICB7ZG9jdW1lbnQuc2VjdGlvbnMubWFwKChzZWN0aW9uLCBzZWN0aW9uSW5kZXgpID0+IHtcbiAgICAgICAgICAgICAgY29uc3QgY29tcGlsZWQgPSBjb21waWxlZFBsYW4/LnNlY3Rpb25zPy5bc2VjdGlvbkluZGV4XTtcbiAgICAgICAgICAgICAgY29uc3Qgc3RhcnRXVSA9IE1hdGgubWluKG1heFdVLCBjb21waWxlZD8uc3RhcnRXVSB8fCAwKTtcbiAgICAgICAgICAgICAgY29uc3QgbmV4dFN0YXJ0V1UgPSBNYXRoLm1pbihtYXhXVSwgY29tcGlsZWRQbGFuPy5zZWN0aW9ucz8uW3NlY3Rpb25JbmRleCArIDFdPy5zdGFydFdVID8/IG1heFdVKTtcbiAgICAgICAgICAgICAgY29uc3Qgc3BhbldVID0gTWF0aC5tYXgoMC4wMDEsIG5leHRTdGFydFdVIC0gc3RhcnRXVSk7XG4gICAgICAgICAgICAgIGNvbnN0IHdpZHRoID0gYCR7KHNwYW5XVSAvIG1heFdVKSAqIDEwMH0lYDtcbiAgICAgICAgICAgICAgY29uc3QgaW5TZWxlY3RlZFNlY3Rpb24gPSBzZWxlY3Rpb24uc2VjdGlvbklkID09PSBzZWN0aW9uLmlkO1xuICAgICAgICAgICAgICBjb25zdCBsb2NhbFBlcmNlbnQgPSAoYXQpID0+IE1hdGgubWluKDEwMCwgKE51bWJlcihhdCB8fCAwKSAqIChjb21waWxlZD8udHJhdmVsV1UgfHwgc3BhbldVKSAvIHNwYW5XVSkgKiAxMDApO1xuICAgICAgICAgICAgICBjb25zdCBsb2NhbFBvc2l0aW9uID0gKGF0KSA9PiBgJHtsb2NhbFBlcmNlbnQoYXQpfSVgO1xuICAgICAgICAgICAgICBjb25zdCBleHRlbmRlZExvY2FsUG9zaXRpb24gPSAoYXQpID0+IGAkeyhOdW1iZXIoYXQgfHwgMCkgKiAoY29tcGlsZWQ/LnRyYXZlbFdVIHx8IHNwYW5XVSkgLyBzcGFuV1UpICogMTAwfSVgO1xuICAgICAgICAgICAgICBjb25zdCBleHRlbmRlZExvY2FsV2lkdGggPSAoZnJvbSwgdG8pID0+IGAke01hdGgubWF4KDAuMzUsIChOdW1iZXIodG8pIC0gTnVtYmVyKGZyb20pKSAqIChjb21waWxlZD8udHJhdmVsV1UgfHwgc3BhbldVKSAvIHNwYW5XVSAqIDEwMCl9JWA7XG4gICAgICAgICAgICAgIGNvbnN0IHRleHRQb3NpdGlvbiA9IChhdCkgPT4gYCR7Y2xhbXAwMShOdW1iZXIoYXQgfHwgMCkpICogMTAwfSVgO1xuICAgICAgICAgICAgICBjb25zdCBzZWxlY3RBdCA9IChuZXh0U2VsZWN0aW9uLCBhdCA9IDApID0+IHtcbiAgICAgICAgICAgICAgICBzdG9yZS5zZXRTZWxlY3Rpb24oeyBzZWN0aW9uSWQ6IHNlY3Rpb24uaWQsIC4uLm5leHRTZWxlY3Rpb24gfSk7XG4gICAgICAgICAgICAgICAgc3RvcmUuc2V0VHJhbnNwb3J0KHtcbiAgICAgICAgICAgICAgICAgIG93bmVyOiAndGltZWxpbmUnLFxuICAgICAgICAgICAgICAgICAgcGxheWluZzogZmFsc2UsXG4gICAgICAgICAgICAgICAgICBzdG9yeVdVOiBzdGFydFdVICsgKE51bWJlcihhdCB8fCAwKSAqIChjb21waWxlZD8udHJhdmVsV1UgfHwgMCkpLFxuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgICBpZiAobGFuZSA9PT0gJ3NlY3Rpb24nKSB7XG4gICAgICAgICAgICAgICAgY29uc3QgaXNTZWxlY3RlZCA9IGluU2VsZWN0ZWRTZWN0aW9uICYmIHNlbGVjdGlvbi50eXBlID09PSAnc2VjdGlvbic7XG4gICAgICAgICAgICAgICAgY29uc3QgcmVzaXplRXh0ZW50ID0gc2VjdGlvblJlc2l6ZVByZXZpZXc/LnNlY3Rpb25JZCA9PT0gc2VjdGlvbi5pZFxuICAgICAgICAgICAgICAgICAgPyBzZWN0aW9uUmVzaXplUHJldmlldy5leHRlbnRcbiAgICAgICAgICAgICAgICAgIDogTnVtYmVyKHNlY3Rpb25bZ2V0QWJvdXROYXJyYXRpdmVFeHRlbnRGaWVsZChzbmFwc2hvdC5wcmV2aWV3UHJvZmlsZSldKTtcbiAgICAgICAgICAgICAgICByZXR1cm4gKFxuICAgICAgICAgICAgICAgICAgPGRpdlxuICAgICAgICAgICAgICAgICAgICBrZXk9e3NlY3Rpb24uaWR9XG4gICAgICAgICAgICAgICAgICAgIGNsYXNzTmFtZT17YGFib3V0LWVkaXRvci1zZWN0aW9uLWNsaXAke2lzU2VsZWN0ZWQgPyAnIGlzLXNlbGVjdGVkJyA6ICcnfSR7aW5TZWxlY3RlZFNlY3Rpb24gPyAnIGlzLWNvbnRleHQnIDogJyd9YH1cbiAgICAgICAgICAgICAgICAgICAgc3R5bGU9e3sgd2lkdGggfX1cbiAgICAgICAgICAgICAgICAgICAgdGl0bGU9e2Ake3NlY3Rpb24ubGFiZWx9IMK3ICR7Zm9ybWF0V1UoY29tcGlsZWQ/LnJlc29sdmVkRXh0ZW50V1UgfHwgc2VjdGlvbi5leHRlbnRXVSl9YH1cbiAgICAgICAgICAgICAgICAgID5cbiAgICAgICAgICAgICAgICAgICAgPGJ1dHRvbiB0eXBlPVwiYnV0dG9uXCIgYXJpYS1wcmVzc2VkPXtpc1NlbGVjdGVkfSBvbkNsaWNrPXsoKSA9PiBzZWxlY3RBdCh7IHR5cGU6ICdzZWN0aW9uJyB9KX0+XG4gICAgICAgICAgICAgICAgICAgICAgPHNwYW4+e1N0cmluZyhzZWN0aW9uSW5kZXggKyAxKS5wYWRTdGFydCgyLCAnMCcpfTwvc3Bhbj57c2VjdGlvbi5sYWJlbH1cbiAgICAgICAgICAgICAgICAgICAgPC9idXR0b24+XG4gICAgICAgICAgICAgICAgICAgIHtzZWN0aW9uUmVzaXplUHJldmlldz8uc2VjdGlvbklkID09PSBzZWN0aW9uLmlkID8gPG91dHB1dD57Zm9ybWF0V1UoTWF0aC5tYXgoMCwgcmVzaXplRXh0ZW50IC0gMSkpfSBzY3JvbGwgwrcge2Zvcm1hdFdVKHJlc2l6ZUV4dGVudCl9IHRvdGFsPC9vdXRwdXQ+IDogbnVsbH1cbiAgICAgICAgICAgICAgICAgICAgPGJ1dHRvblxuICAgICAgICAgICAgICAgICAgICAgIHR5cGU9XCJidXR0b25cIlxuICAgICAgICAgICAgICAgICAgICAgIGNsYXNzTmFtZT1cImFib3V0LWVkaXRvci1zZWN0aW9uLXJlc2l6ZVwiXG4gICAgICAgICAgICAgICAgICAgICAgZGlzYWJsZWQ9e3NlY3Rpb24ubG9ja2VkfVxuICAgICAgICAgICAgICAgICAgICAgIGFyaWEtbGFiZWw9e2BSZXNpemUgJHtzZWN0aW9uLmxhYmVsfWB9XG4gICAgICAgICAgICAgICAgICAgICAgdGl0bGU9e3NlY3Rpb24ubG9ja2VkID8gJ1VubG9jayB0aGlzIHByb3RlY3RlZCBTZWN0aW9uIHRvIHJlc2l6ZSBpdCcgOiBgRHJhZyB0byBjaGFuZ2UgJHtzbmFwc2hvdC5wcmV2aWV3UHJvZmlsZSA9PT0gJ21vYmlsZScgPyAnbW9iaWxlJyA6ICdkZXNrdG9wJ30gc2Nyb2xsIGxlbmd0aCDCtyBkb3VibGUtY2xpY2sgdG8gcmVzdG9yZSBzYXZlZCBsZW5ndGhgfVxuICAgICAgICAgICAgICAgICAgICAgIG9uRG91YmxlQ2xpY2s9eyhldmVudCkgPT4geyBldmVudC5wcmV2ZW50RGVmYXVsdCgpOyBldmVudC5zdG9wUHJvcGFnYXRpb24oKTsgcmVzZXRTZWN0aW9uRXh0ZW50KHNlY3Rpb24uaWQsIHNlY3Rpb25JbmRleCk7IH19XG4gICAgICAgICAgICAgICAgICAgICAgb25Qb2ludGVyRG93bj17KGV2ZW50KSA9PiBiZWdpblNlY3Rpb25SZXNpemUoZXZlbnQsIHsgc2VjdGlvbklkOiBzZWN0aW9uLmlkLCBzZWN0aW9uSW5kZXgsIHNlY3Rpb25MYWJlbDogc2VjdGlvbi5sYWJlbCwgbG9ja2VkOiBzZWN0aW9uLmxvY2tlZCB9KX1cbiAgICAgICAgICAgICAgICAgICAgICBvblBvaW50ZXJNb3ZlPXttb3ZlU2VjdGlvblJlc2l6ZX1cbiAgICAgICAgICAgICAgICAgICAgICBvblBvaW50ZXJVcD17ZW5kU2VjdGlvblJlc2l6ZX1cbiAgICAgICAgICAgICAgICAgICAgICBvblBvaW50ZXJDYW5jZWw9e2VuZFNlY3Rpb25SZXNpemV9XG4gICAgICAgICAgICAgICAgICAgIC8+XG4gICAgICAgICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgICAgICApO1xuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgIGlmIChsYW5lID09PSAnY2FtZXJhJykge1xuICAgICAgICAgICAgICAgIHJldHVybiAoXG4gICAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cImFib3V0LWVkaXRvci1jbGlwXCIga2V5PXtzZWN0aW9uLmlkfSBzdHlsZT17eyB3aWR0aCB9fT5cbiAgICAgICAgICAgICAgICAgICAgPGRpdiBjbGFzc05hbWU9XCJhYm91dC1lZGl0b3ItY2FtZXJhLXJhaWxcIiBhcmlhLWhpZGRlbj1cInRydWVcIj5cbiAgICAgICAgICAgICAgICAgICAgICB7c2VjdGlvbi5jYW1lcmEua2V5cy5zbGljZSgxKS5tYXAoKGtleSwga2V5SW5kZXgpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IGZyb21LZXkgPSBzZWN0aW9uLmNhbWVyYS5rZXlzW2tleUluZGV4XTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IGxlZnQgPSBsb2NhbFBlcmNlbnQoZnJvbUtleS5hdCk7XG4gICAgICAgICAgICAgICAgICAgICAgICBjb25zdCByaWdodCA9IGxvY2FsUGVyY2VudChrZXkuYXQpO1xuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIChcbiAgICAgICAgICAgICAgICAgICAgICAgICAgPHNwYW5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjbGFzc05hbWU9e2NhbWVyYVBvc2VDaGFuZ2VzKGZyb21LZXksIGtleSkgPyAnaXMtYXV0aG9yZWQtbW90aW9uJyA6ICdpcy1iYXNlLWRvbGx5J31cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBrZXk9e2Ake3NlY3Rpb24uaWR9OmNhbWVyYS1zcGFuOiR7a2V5SW5kZXh9YH1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBzdHlsZT17eyBsZWZ0OiBgJHtsZWZ0fSVgLCB3aWR0aDogYCR7TWF0aC5tYXgoMC41LCByaWdodCAtIGxlZnQpfSVgIH19XG4gICAgICAgICAgICAgICAgICAgICAgICAgIC8+XG4gICAgICAgICAgICAgICAgICAgICAgICApO1xuICAgICAgICAgICAgICAgICAgICAgIH0pfVxuICAgICAgICAgICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgICAgICAgICAge3NlY3Rpb24uY2FtZXJhLmtleXMubWFwKChrZXksIGtleUluZGV4KSA9PiB7XG4gICAgICAgICAgICAgICAgICAgICAgY29uc3QgdGltaW5nQm91bmRzID0gZ2V0QWJvdXROYXJyYXRpdmVDYW1lcmFLZXlUaW1pbmdCb3VuZHMoc2VjdGlvbi5jYW1lcmEua2V5cywga2V5SW5kZXgpO1xuICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IHRva2VuID0gYGNhbWVyYToke3NlY3Rpb24uaWR9OiR7a2V5SW5kZXh9YDtcbiAgICAgICAgICAgICAgICAgICAgICBjb25zdCBrZXlTZWxlY3Rpb24gPSB7IHR5cGU6ICdjYW1lcmEta2V5Jywgc2VjdGlvbklkOiBzZWN0aW9uLmlkLCBrZXlJbmRleCB9O1xuICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IGlzU2VsZWN0ZWQgPSBpblNlbGVjdGVkU2VjdGlvbiAmJiBzZWxlY3Rpb24udHlwZSA9PT0gJ2NhbWVyYS1rZXknICYmIHNlbGVjdGlvbi5rZXlJbmRleCA9PT0ga2V5SW5kZXg7XG4gICAgICAgICAgICAgICAgICAgICAgY29uc3QgcmVxdWlyZWQgPSB0aW1pbmdCb3VuZHMubG9ja2VkO1xuICAgICAgICAgICAgICAgICAgICAgIHJldHVybiAoXG4gICAgICAgICAgICAgICAgICAgICAgICA8YnV0dG9uXG4gICAgICAgICAgICAgICAgICAgICAgICAgIHR5cGU9XCJidXR0b25cIlxuICAgICAgICAgICAgICAgICAgICAgICAgICBrZXk9e3Rva2VufVxuICAgICAgICAgICAgICAgICAgICAgICAgICBjbGFzc05hbWU9e2BhYm91dC1lZGl0b3Ita2V5JHtyZXF1aXJlZCA/ICcgaXMtYm91bmRhcnknIDogJyBpcy1kcmFnZ2FibGUnfSR7aXNTZWxlY3RlZCA/ICcgaXMtc2VsZWN0ZWQnIDogJyd9JHtjYW1lcmFEcmFnUHJldmlldz8udG9rZW4gPT09IHRva2VuID8gJyBpcy1kcmFnLXNvdXJjZScgOiAnJ31gfVxuICAgICAgICAgICAgICAgICAgICAgICAgICBzdHlsZT17eyBsZWZ0OiBsb2NhbFBvc2l0aW9uKGtleS5hdCkgfX1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgdGl0bGU9e3JlcXVpcmVkXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgPyBgUHJvdGVjdGVkIENhbWVyYSBrZXkgYXQgJHtmb3JtYXRDYW1lcmFQZXJjZW50KGtleS5hdCl9IMK3IHNlbGVjdCB0byBpbnNwZWN0YFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIDogYENhbWVyYSBrZXkgYXQgJHtmb3JtYXRDYW1lcmFQZXJjZW50KGtleS5hdCl9IMK3IGRyYWcgYW55d2hlcmUgb24gdGhlIENhbWVyYSB0cmFja2B9XG4gICAgICAgICAgICAgICAgICAgICAgICAgIGFyaWEtbGFiZWw9e2Ake3JlcXVpcmVkID8gJ1Byb3RlY3RlZCAnIDogJyd9Q2FtZXJhIGtleSBhdCAke2Zvcm1hdENhbWVyYVBlcmNlbnQoa2V5LmF0KX0gdGhyb3VnaCAke3NlY3Rpb24ubGFiZWx9YH1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgYXJpYS1wcmVzc2VkPXtpc1NlbGVjdGVkfVxuICAgICAgICAgICAgICAgICAgICAgICAgICBvblBvaW50ZXJEb3duPXtyZXF1aXJlZCA/IHVuZGVmaW5lZCA6IChldmVudCkgPT4gYmVnaW5UaW1pbmdEcmFnKGV2ZW50LCB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdHlwZTogJ2NhbWVyYScsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdG9rZW4sXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgbG9ja2VkOiBmYWxzZSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBhdDoga2V5LmF0LFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHNlY3Rpb25JbmRleCxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBrZXlJbmRleCxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBzZWN0aW9uU3RhcnRXVTogc3RhcnRXVSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBzcGFuV1UsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdHJhdmVsV1U6IGNvbXBpbGVkPy50cmF2ZWxXVSB8fCBzcGFuV1UsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgc3RvcnlXVTogc3RhcnRXVSArIChOdW1iZXIoa2V5LmF0KSAqIChjb21waWxlZD8udHJhdmVsV1UgfHwgMCkpLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHNlbGVjdGlvbjoga2V5U2VsZWN0aW9uLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvYWxlc2NlS2V5OiBgdGltZWxpbmU6JHt0b2tlbn1gLFxuICAgICAgICAgICAgICAgICAgICAgICAgICB9KX1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgb25Qb2ludGVyTW92ZT17cmVxdWlyZWQgPyB1bmRlZmluZWQgOiBtb3ZlVGltaW5nRHJhZ31cbiAgICAgICAgICAgICAgICAgICAgICAgICAgb25Qb2ludGVyVXA9e3JlcXVpcmVkID8gdW5kZWZpbmVkIDogZW5kVGltaW5nRHJhZ31cbiAgICAgICAgICAgICAgICAgICAgICAgICAgb25Qb2ludGVyQ2FuY2VsPXtyZXF1aXJlZCA/IHVuZGVmaW5lZCA6IGVuZFRpbWluZ0RyYWd9XG4gICAgICAgICAgICAgICAgICAgICAgICAgIG9uQ2xpY2s9eygpID0+IGhhbmRsZVRpbWluZ0NsaWNrKHRva2VuLCAoKSA9PiBzZWxlY3RBdCh7IHR5cGU6ICdjYW1lcmEta2V5Jywga2V5SW5kZXggfSwga2V5LmF0KSl9XG4gICAgICAgICAgICAgICAgICAgICAgICAvPlxuICAgICAgICAgICAgICAgICAgICAgICk7XG4gICAgICAgICAgICAgICAgICAgIH0pfVxuICAgICAgICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgICAgICAgKTtcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICBpZiAobGFuZSA9PT0gJ3dvcmxkJykge1xuICAgICAgICAgICAgICAgIGNvbnN0IGlzU2VsZWN0ZWQgPSBpblNlbGVjdGVkU2VjdGlvbiAmJiBzZWxlY3Rpb24udHlwZSA9PT0gJ3dvcmxkJztcbiAgICAgICAgICAgICAgICBjb25zdCB0cmFuc2l0aW9uID0gc2VjdGlvbi53b3JsZC5tb2RlID09PSAnc2V0JyAmJiBzZWN0aW9uLndvcmxkLnRyYW5zaXRpb25Jbi50eXBlICE9PSAnY3V0J1xuICAgICAgICAgICAgICAgICAgPyBzZWN0aW9uLndvcmxkLnRyYW5zaXRpb25JblxuICAgICAgICAgICAgICAgICAgOiBudWxsO1xuICAgICAgICAgICAgICAgIHJldHVybiAoXG4gICAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzTmFtZT17YGFib3V0LWVkaXRvci1jbGlwJHtpc1NlbGVjdGVkID8gJyBpcy1zZWxlY3RlZCcgOiAnJ31gfSBrZXk9e3NlY3Rpb24uaWR9IHN0eWxlPXt7IHdpZHRoIH19PlxuICAgICAgICAgICAgICAgICAgICA8YnV0dG9uXG4gICAgICAgICAgICAgICAgICAgICAgdHlwZT1cImJ1dHRvblwiXG4gICAgICAgICAgICAgICAgICAgICAgY2xhc3NOYW1lPXtgYWJvdXQtZWRpdG9yLXdvcmxkLWNsaXAgJHtzZWN0aW9uLndvcmxkLm1vZGUgPT09ICdzZXQnID8gJ2hhcy13b3JsZCcgOiAnJ30ke2lzU2VsZWN0ZWQgPyAnIGlzLXNlbGVjdGVkJyA6ICcnfWB9XG4gICAgICAgICAgICAgICAgICAgICAgYXJpYS1wcmVzc2VkPXtpc1NlbGVjdGVkfVxuICAgICAgICAgICAgICAgICAgICAgIG9uQ2xpY2s9eygpID0+IHNlbGVjdEF0KHsgdHlwZTogJ3dvcmxkJyB9LCB0cmFuc2l0aW9uID8gdHJhbnNpdGlvbi5lbmQgOiAwKX1cbiAgICAgICAgICAgICAgICAgICAgPntzZWN0aW9uLndvcmxkLm1vZGUgPT09ICdzZXQnID8gc2VjdGlvbi53b3JsZC5zaGFwZUlkLnJlcGxhY2UoJy12MScsICcnKSA6ICdjb250aW51ZSd9PC9idXR0b24+XG4gICAgICAgICAgICAgICAgICAgIHt0cmFuc2l0aW9uID8gWydzdGFydCcsICdlbmQnXS5tYXAoKHBhcnQpID0+IChcbiAgICAgICAgICAgICAgICAgICAgICA8YnV0dG9uXG4gICAgICAgICAgICAgICAgICAgICAgICB0eXBlPVwiYnV0dG9uXCJcbiAgICAgICAgICAgICAgICAgICAgICAgIGtleT17cGFydH1cbiAgICAgICAgICAgICAgICAgICAgICAgIGNsYXNzTmFtZT17YGFib3V0LWVkaXRvci10aW1pbmcta2V5IGlzLXdvcmxkJHtpc1NlbGVjdGVkICYmIHNlbGVjdGlvbi5rZXlQYXJ0ID09PSBgdHJhbnNpdGlvbi0ke3BhcnR9YCA/ICcgaXMtc2VsZWN0ZWQnIDogJyd9YH1cbiAgICAgICAgICAgICAgICAgICAgICAgIHN0eWxlPXt7IGxlZnQ6IGV4dGVuZGVkTG9jYWxQb3NpdGlvbih0cmFuc2l0aW9uW3BhcnRdKSB9fVxuICAgICAgICAgICAgICAgICAgICAgICAgdGl0bGU9e2BXb3JsZCB0cmFuc2l0aW9uICR7cGFydH1gfVxuICAgICAgICAgICAgICAgICAgICAgICAgYXJpYS1sYWJlbD17YCR7c2VjdGlvbi5sYWJlbH0gV29ybGQgdHJhbnNpdGlvbiAke3BhcnR9YH1cbiAgICAgICAgICAgICAgICAgICAgICAgIG9uQ2xpY2s9eygpID0+IHNlbGVjdEF0KHsgdHlwZTogJ3dvcmxkJywga2V5UGFydDogYHRyYW5zaXRpb24tJHtwYXJ0fWAgfSwgdHJhbnNpdGlvbltwYXJ0XSl9XG4gICAgICAgICAgICAgICAgICAgICAgLz5cbiAgICAgICAgICAgICAgICAgICAgKSkgOiBudWxsfVxuICAgICAgICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgICAgICAgKTtcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICBpZiAobGFuZSA9PT0gJ3RleHQnKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIChcbiAgICAgICAgICAgICAgICAgIDxkaXZcbiAgICAgICAgICAgICAgICAgICAgY2xhc3NOYW1lPXtgYWJvdXQtZWRpdG9yLWNsaXAke3NlY3Rpb24udGV4dC5kaXNjaXBsaW5lUmV2ZWFsID8gJyBoYXMtZXh0ZW5kZWQtZGlzY2lwbGluZScgOiAnJ31gfVxuICAgICAgICAgICAgICAgICAgICBrZXk9e3NlY3Rpb24uaWR9XG4gICAgICAgICAgICAgICAgICAgIHN0eWxlPXt7IHdpZHRoIH19XG4gICAgICAgICAgICAgICAgICAgIG9uUG9pbnRlckRvd249e2JlZ2luTWFycXVlZX1cbiAgICAgICAgICAgICAgICAgICAgb25Qb2ludGVyTW92ZT17bW92ZU1hcnF1ZWV9XG4gICAgICAgICAgICAgICAgICAgIG9uUG9pbnRlclVwPXtlbmRNYXJxdWVlfVxuICAgICAgICAgICAgICAgICAgICBvblBvaW50ZXJDYW5jZWw9e2VuZE1hcnF1ZWV9XG4gICAgICAgICAgICAgICAgICA+XG4gICAgICAgICAgICAgICAgICAgIHsoc2VjdGlvbi50ZXh0LmN1ZXMgfHwgW10pLm1hcCgoY3VlKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgICAgY29uc3QgaXNTZWxlY3RlZCA9IHNlbGVjdGVkQ3VlTWVtYmVycy5zb21lKChtZW1iZXIpID0+IG1lbWJlci5zZWN0aW9uSWQgPT09IHNlY3Rpb24uaWQgJiYgbWVtYmVyLmN1ZUlkID09PSBjdWUuaWQpO1xuICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IGlzUHJpbWFyeSA9IHNlbGVjdGlvbi50eXBlID09PSAnY3VlJyAmJiBzZWxlY3Rpb24uc2VjdGlvbklkID09PSBzZWN0aW9uLmlkICYmIHNlbGVjdGlvbi5jdWVJZCA9PT0gY3VlLmlkO1xuICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IG1vdmVtZW50ID0gZ2V0QWJvdXROYXJyYXRpdmVDdWVNb3ZlbWVudChjdWUpO1xuICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IG1vdGlvbkludGVydmFsID0gbW92ZW1lbnQgPT09ICdzcGF0aWFsJ1xuICAgICAgICAgICAgICAgICAgICAgICAgPyBnZXRBYm91dE5hcnJhdGl2ZUN1ZU1vdGlvbkludGVydmFsKGN1ZSwgZG9jdW1lbnQuZ2xvYmFscy50ZXh0TW90aW9uKVxuICAgICAgICAgICAgICAgICAgICAgICAgOiBudWxsO1xuICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IG1vdGlvblNwYW4gPSBtb3Rpb25JbnRlcnZhbCA/IE1hdGgubWF4KDAuMDAwMDEsIG1vdGlvbkludGVydmFsLmVuZCAtIG1vdGlvbkludGVydmFsLnN0YXJ0KSA6IDA7XG4gICAgICAgICAgICAgICAgICAgICAgY29uc3QgY3VlU3R5bGUgPSBtb3Rpb25JbnRlcnZhbCA/IHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGxlZnQ6IHRleHRQb3NpdGlvbihtb3Rpb25JbnRlcnZhbC5zdGFydCksXG4gICAgICAgICAgICAgICAgICAgICAgICB3aWR0aDogYCR7TWF0aC5tYXgoMC41LCBtb3Rpb25TcGFuICogMTAwKX0lYCxcbiAgICAgICAgICAgICAgICAgICAgICB9IDogeyBsZWZ0OiB0ZXh0UG9zaXRpb24oY3VlLmhvbGQpIH07XG4gICAgICAgICAgICAgICAgICAgICAgY29uc3QgZm9jdXNQb3NpdGlvbiA9IG1vdGlvbkludGVydmFsXG4gICAgICAgICAgICAgICAgICAgICAgICA/IGAkeygoY3VlLmhvbGQgLSBtb3Rpb25JbnRlcnZhbC5zdGFydCkgLyBtb3Rpb25TcGFuKSAqIDEwMH0lYFxuICAgICAgICAgICAgICAgICAgICAgICAgOiAnNTAlJztcbiAgICAgICAgICAgICAgICAgICAgICBjb25zdCB0aW1pbmdCb3VuZHMgPSBnZXRBYm91dE5hcnJhdGl2ZUN1ZVRpbWluZ0JvdW5kcyhjdWUpO1xuICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IHRva2VuID0gYGN1ZToke3NlY3Rpb24uaWR9OiR7Y3VlLmlkfWA7XG4gICAgICAgICAgICAgICAgICAgICAgY29uc3QgY3VlU2VsZWN0aW9uID0geyB0eXBlOiAnY3VlJywgc2VjdGlvbklkOiBzZWN0aW9uLmlkLCBjdWVJZDogY3VlLmlkLCBrZXlQYXJ0OiAnZm9jdXMnIH07XG4gICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIChcbiAgICAgICAgICAgICAgICAgICAgICAgIDxidXR0b25cbiAgICAgICAgICAgICAgICAgICAgICAgICAgdHlwZT1cImJ1dHRvblwiXG4gICAgICAgICAgICAgICAgICAgICAgICAgIGNsYXNzTmFtZT17YGFib3V0LWVkaXRvci1jdWUgaXMtJHttb3ZlbWVudH0ke3RpbWluZ0JvdW5kcy5taW4gPT09IHRpbWluZ0JvdW5kcy5tYXggPyAnIGlzLWJvdW5kYXJ5JyA6ICcgaXMtZHJhZ2dhYmxlJ30ke2lzU2VsZWN0ZWQgPyAnIGlzLXNlbGVjdGVkJyA6ICcnfSR7aXNQcmltYXJ5ID8gJyBpcy1wcmltYXJ5LXNlbGVjdGlvbicgOiAnJ31gfVxuICAgICAgICAgICAgICAgICAgICAgICAgICBrZXk9e2N1ZS5pZH1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgZGF0YS1zZWN0aW9uLWlkPXtzZWN0aW9uLmlkfVxuICAgICAgICAgICAgICAgICAgICAgICAgICBkYXRhLWN1ZS1pZD17Y3VlLmlkfVxuICAgICAgICAgICAgICAgICAgICAgICAgICBzdHlsZT17Y3VlU3R5bGV9XG4gICAgICAgICAgICAgICAgICAgICAgICAgIGFyaWEtbGFiZWw9e2Ake21vdmVtZW50ID09PSAndmVydGljYWwnID8gJ1ZlcnRpY2FsJyA6ICdTcGF0aWFsJ30gdGV4dCBhdCAke01hdGgucm91bmQoY3VlLmhvbGQgKiAxMDApfSUke21vdGlvbkludGVydmFsID8gYCDCtyB0cmF2ZWxzICR7TWF0aC5yb3VuZChtb3Rpb25JbnRlcnZhbC5zdGFydCAqIDEwMCl94oCTJHtNYXRoLnJvdW5kKG1vdGlvbkludGVydmFsLmVuZCAqIDEwMCl9JWAgOiAnJ30gwrcgJHtjdWUudGV4dH1gfVxuICAgICAgICAgICAgICAgICAgICAgICAgICBhcmlhLXByZXNzZWQ9e2lzU2VsZWN0ZWR9XG4gICAgICAgICAgICAgICAgICAgICAgICAgIHRpdGxlPXtgJHttb3ZlbWVudCA9PT0gJ3ZlcnRpY2FsJyA/ICdWZXJ0aWNhbCcgOiAnU3BhdGlhbCd9IHRpdGxlIMK3IGRyYWcgdG8gbW92ZSBpdDsgZHVyYXRpb24gc3RheXMgZ2xvYmFsIMK3ICR7Y3VlLnRleHR9YH1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgb25Qb2ludGVyRG93bj17KGV2ZW50KSA9PiBiZWdpblRpbWluZ0RyYWcoZXZlbnQsIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0eXBlOiAnY3VlJyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0b2tlbixcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBsb2NrZWQ6IHRpbWluZ0JvdW5kcy5taW4gPT09IHRpbWluZ0JvdW5kcy5tYXgsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgbWluOiB0aW1pbmdCb3VuZHMubWluLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIG1heDogdGltaW5nQm91bmRzLm1heCxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBhdDogY3VlLmhvbGQsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgc2VjdGlvbkluZGV4LFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGN1ZUlkOiBjdWUuaWQsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgc2VjdGlvblN0YXJ0V1U6IHN0YXJ0V1UsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgc3BhbldVLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRyYXZlbFdVOiBjb21waWxlZD8udHJhdmVsV1UgfHwgc3BhbldVLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHN0b3J5V1U6IHN0YXJ0V1UgKyAoTnVtYmVyKGN1ZS5ob2xkKSAqIChjb21waWxlZD8udHJhdmVsV1UgfHwgMCkpLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHNlbGVjdGlvbjogY3VlU2VsZWN0aW9uLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvYWxlc2NlS2V5OiBgdGltZWxpbmU6JHt0b2tlbn1gLFxuICAgICAgICAgICAgICAgICAgICAgICAgICB9KX1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgb25Qb2ludGVyTW92ZT17bW92ZVRpbWluZ0RyYWd9XG4gICAgICAgICAgICAgICAgICAgICAgICAgIG9uUG9pbnRlclVwPXtlbmRUaW1pbmdEcmFnfVxuICAgICAgICAgICAgICAgICAgICAgICAgICBvblBvaW50ZXJDYW5jZWw9e2VuZFRpbWluZ0RyYWd9XG4gICAgICAgICAgICAgICAgICAgICAgICAgIG9uS2V5RG93bj17KGV2ZW50KSA9PiB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGV2ZW50LnNoaWZ0S2V5ICYmIGV2ZW50LmNvZGUgPT09ICdTcGFjZScpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGV2ZW50LnByZXZlbnREZWZhdWx0KCk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zdCBuZXh0U2VsZWN0aW9uID0gdG9nZ2xlQWJvdXROYXJyYXRpdmVDdWVTZWxlY3Rpb24oc3RvcmUuZ2V0U25hcHNob3QoKS5zZWxlY3Rpb24sIGN1ZVNlbGVjdGlvbik7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICBzdG9yZS5zZXRTZWxlY3Rpb24obmV4dFNlbGVjdGlvbik7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICBzdG9yZS5zZXRUcmFuc3BvcnQoeyBvd25lcjogJ3RpbWVsaW5lJywgcGxheWluZzogZmFsc2UsIHN0b3J5V1U6IHN0YXJ0V1UgKyAoTnVtYmVyKGN1ZS5ob2xkKSAqIChjb21waWxlZD8udHJhdmVsV1UgfHwgMCkpIH0pO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgfX1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgb25DbGljaz17KCkgPT4gaGFuZGxlVGltaW5nQ2xpY2sodG9rZW4sICgpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBzdG9yZS5zZXRUcmFuc3BvcnQoeyBvd25lcjogJ3RpbWVsaW5lJywgcGxheWluZzogZmFsc2UsIHN0b3J5V1U6IHN0YXJ0V1UgKyAoTnVtYmVyKGN1ZS5ob2xkKSAqIChjb21waWxlZD8udHJhdmVsV1UgfHwgMCkpIH0pO1xuICAgICAgICAgICAgICAgICAgICAgICAgICB9KX1cbiAgICAgICAgICAgICAgICAgICAgICAgID48c3BhbiBjbGFzc05hbWU9XCJhYm91dC1lZGl0b3ItY3VlLWZvY3VzXCIgc3R5bGU9e3sgbGVmdDogZm9jdXNQb3NpdGlvbiB9fSBhcmlhLWhpZGRlbj1cInRydWVcIiAvPjwvYnV0dG9uPlxuICAgICAgICAgICAgICAgICAgICAgICk7XG4gICAgICAgICAgICAgICAgICAgIH0pfVxuICAgICAgICAgICAgICAgICAgICB7c2VjdGlvbi50ZXh0LmRpc2NpcGxpbmVSZXZlYWwgPyAoKCkgPT4ge1xuICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IHJldmVhbCA9IHNlY3Rpb24udGV4dC5kaXNjaXBsaW5lUmV2ZWFsO1xuICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IGR1cmF0aW9uID0gcmV2ZWFsLmVuZCAtIHJldmVhbC5zdGFydDtcbiAgICAgICAgICAgICAgICAgICAgICBjb25zdCBjZW50cmUgPSByZXZlYWwuc3RhcnQgKyAoZHVyYXRpb24gKiAwLjUpO1xuICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IGlzU2VsZWN0ZWQgPSBpblNlbGVjdGVkU2VjdGlvbiAmJiBzZWxlY3Rpb24udHlwZSA9PT0gJ2Rpc2NpcGxpbmUtcmV2ZWFsJztcbiAgICAgICAgICAgICAgICAgICAgICBjb25zdCB0b2tlbiA9IGBkaXNjaXBsaW5lLXJldmVhbDoke3NlY3Rpb24uaWR9OiR7cmV2ZWFsLmlkfWA7XG4gICAgICAgICAgICAgICAgICAgICAgY29uc3QgcmV2ZWFsU2VsZWN0aW9uID0geyB0eXBlOiAnZGlzY2lwbGluZS1yZXZlYWwnLCBzZWN0aW9uSWQ6IHNlY3Rpb24uaWQgfTtcbiAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gKFxuICAgICAgICAgICAgICAgICAgICAgICAgPGJ1dHRvblxuICAgICAgICAgICAgICAgICAgICAgICAgICB0eXBlPVwiYnV0dG9uXCJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgY2xhc3NOYW1lPXtgYWJvdXQtZWRpdG9yLWRpc2NpcGxpbmUtcmV2ZWFsIGlzLWRyYWdnYWJsZSR7aXNTZWxlY3RlZCA/ICcgaXMtc2VsZWN0ZWQnIDogJyd9YH1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgc3R5bGU9e3sgbGVmdDogZXh0ZW5kZWRMb2NhbFBvc2l0aW9uKHJldmVhbC5zdGFydCksIHdpZHRoOiBleHRlbmRlZExvY2FsV2lkdGgocmV2ZWFsLnN0YXJ0LCByZXZlYWwuZW5kKSB9fVxuICAgICAgICAgICAgICAgICAgICAgICAgICBhcmlhLWxhYmVsPXtgRGlzY2lwbGluZSByZXZlYWwgZnJvbSAke01hdGgucm91bmQocmV2ZWFsLnN0YXJ0ICogMTAwKX0lIHRvICR7TWF0aC5yb3VuZChyZXZlYWwuZW5kICogMTAwKX0lYH1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgYXJpYS1wcmVzc2VkPXtpc1NlbGVjdGVkfVxuICAgICAgICAgICAgICAgICAgICAgICAgICB0aXRsZT1cIkRpc2NpcGxpbmUgcmV2ZWFsIMK3IGRyYWcgdGhlIGNvbXBsZXRlIGNsaXAgdG8gcmV0aW1lXCJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgb25Qb2ludGVyRG93bj17KGV2ZW50KSA9PiBiZWdpblRpbWluZ0RyYWcoZXZlbnQsIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0eXBlOiAnZGlzY2lwbGluZS1yZXZlYWwnLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRva2VuLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGxvY2tlZDogZmFsc2UsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgbWluOiBkdXJhdGlvbiAqIDAuNSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBtYXg6IERJU0NJUExJTkVfUkVWRUFMX01BWCAtIChkdXJhdGlvbiAqIDAuNSksXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgYXQ6IGNlbnRyZSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBzZWN0aW9uSW5kZXgsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgc2VjdGlvblN0YXJ0V1U6IHN0YXJ0V1UsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgc3BhbldVLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRyYXZlbFdVOiBjb21waWxlZD8udHJhdmVsV1UgfHwgc3BhbldVLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHN0b3J5V1U6IHN0YXJ0V1UgKyAoY2VudHJlICogKGNvbXBpbGVkPy50cmF2ZWxXVSB8fCAwKSksXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgc2VsZWN0aW9uOiByZXZlYWxTZWxlY3Rpb24sXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY29hbGVzY2VLZXk6IGB0aW1lbGluZToke3Rva2VufWAsXG4gICAgICAgICAgICAgICAgICAgICAgICAgIH0pfVxuICAgICAgICAgICAgICAgICAgICAgICAgICBvblBvaW50ZXJNb3ZlPXttb3ZlVGltaW5nRHJhZ31cbiAgICAgICAgICAgICAgICAgICAgICAgICAgb25Qb2ludGVyVXA9e2VuZFRpbWluZ0RyYWd9XG4gICAgICAgICAgICAgICAgICAgICAgICAgIG9uUG9pbnRlckNhbmNlbD17ZW5kVGltaW5nRHJhZ31cbiAgICAgICAgICAgICAgICAgICAgICAgICAgb25DbGljaz17KCkgPT4gaGFuZGxlVGltaW5nQ2xpY2sodG9rZW4sICgpID0+IHNlbGVjdEF0KHsgdHlwZTogJ2Rpc2NpcGxpbmUtcmV2ZWFsJyB9LCByZXZlYWwuc3RhcnQpKX1cbiAgICAgICAgICAgICAgICAgICAgICAgID5EaXNjaXBsaW5lIHJldmVhbDwvYnV0dG9uPlxuICAgICAgICAgICAgICAgICAgICAgICk7XG4gICAgICAgICAgICAgICAgICAgIH0pKCkgOiBudWxsfVxuICAgICAgICAgICAgICAgICAgICB7KHNlY3Rpb24udGV4dC5ibG9ja3MgfHwgW10pLmxlbmd0aCA/IChcbiAgICAgICAgICAgICAgICAgICAgICA8YnV0dG9uIHR5cGU9XCJidXR0b25cIiBjbGFzc05hbWU9e2BhYm91dC1lZGl0b3ItZWRpdG9yaWFsLWNsaXAke2luU2VsZWN0ZWRTZWN0aW9uICYmIHNlbGVjdGlvbi50eXBlID09PSAnc2VjdGlvbicgPyAnIGlzLXNlbGVjdGVkJyA6ICcnfWB9IG9uQ2xpY2s9eygpID0+IHNlbGVjdEF0KHsgdHlwZTogJ3NlY3Rpb24nIH0pfT5cbiAgICAgICAgICAgICAgICAgICAgICAgIFZlcnRpY2FsIMK3IHtzZWN0aW9uLnRleHQuYmxvY2tzLmxlbmd0aH0gYmxvY2tzXG4gICAgICAgICAgICAgICAgICAgICAgPC9idXR0b24+XG4gICAgICAgICAgICAgICAgICAgICkgOiBudWxsfVxuICAgICAgICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgICAgICAgKTtcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICBjb25zdCBpc1NlbGVjdGVkID0gaW5TZWxlY3RlZFNlY3Rpb24gJiYgc2VsZWN0aW9uLnR5cGUgPT09ICdpbnRlcmFjdGlvbic7XG4gICAgICAgICAgICAgIGNvbnN0IGFjdGl2YXRpb24gPSBzZWN0aW9uLmludGVyYWN0aW9uPy50eXBlICE9PSAnbm9uZScgPyBzZWN0aW9uLmludGVyYWN0aW9uLmFjdGl2YXRpb25TdGFydCA6IG51bGw7XG4gICAgICAgICAgICAgIHJldHVybiAoXG4gICAgICAgICAgICAgICAgPGRpdiBjbGFzc05hbWU9e2BhYm91dC1lZGl0b3ItY2xpcCR7aXNTZWxlY3RlZCA/ICcgaXMtc2VsZWN0ZWQnIDogJyd9YH0ga2V5PXtzZWN0aW9uLmlkfSBzdHlsZT17eyB3aWR0aCB9fT5cbiAgICAgICAgICAgICAgICAgIDxidXR0b25cbiAgICAgICAgICAgICAgICAgICAgdHlwZT1cImJ1dHRvblwiXG4gICAgICAgICAgICAgICAgICAgIGNsYXNzTmFtZT17YGFib3V0LWVkaXRvci1pbnRlcmFjdGlvbi1jbGlwICR7c2VjdGlvbi5pbnRlcmFjdGlvbj8udHlwZSAhPT0gJ25vbmUnID8gJ2hhcy1pbnRlcmFjdGlvbicgOiAnJ30ke2lzU2VsZWN0ZWQgPyAnIGlzLXNlbGVjdGVkJyA6ICcnfWB9XG4gICAgICAgICAgICAgICAgICAgIGFyaWEtcHJlc3NlZD17aXNTZWxlY3RlZH1cbiAgICAgICAgICAgICAgICAgICAgb25DbGljaz17KCkgPT4gc2VsZWN0QXQoeyB0eXBlOiAnaW50ZXJhY3Rpb24nIH0sIGFjdGl2YXRpb24gfHwgMCl9XG4gICAgICAgICAgICAgICAgICA+e3NlY3Rpb24uaW50ZXJhY3Rpb24/LnR5cGUgIT09ICdub25lJyA/IHNlY3Rpb24uaW50ZXJhY3Rpb24udHlwZSA6ICcnfTwvYnV0dG9uPlxuICAgICAgICAgICAgICAgICAge051bWJlci5pc0Zpbml0ZShhY3RpdmF0aW9uKSA/IChcbiAgICAgICAgICAgICAgICAgICAgPGJ1dHRvblxuICAgICAgICAgICAgICAgICAgICAgIHR5cGU9XCJidXR0b25cIlxuICAgICAgICAgICAgICAgICAgICAgIGNsYXNzTmFtZT17YGFib3V0LWVkaXRvci10aW1pbmcta2V5IGlzLWludGVyYWN0aW9uJHtpc1NlbGVjdGVkICYmIHNlbGVjdGlvbi5rZXlQYXJ0ID09PSAnYWN0aXZhdGlvbicgPyAnIGlzLXNlbGVjdGVkJyA6ICcnfWB9XG4gICAgICAgICAgICAgICAgICAgICAgc3R5bGU9e3sgbGVmdDogbG9jYWxQb3NpdGlvbihhY3RpdmF0aW9uKSB9fVxuICAgICAgICAgICAgICAgICAgICAgIHRpdGxlPVwiSW50ZXJhY3Rpb24gYWN0aXZhdGlvblwiXG4gICAgICAgICAgICAgICAgICAgICAgYXJpYS1sYWJlbD17YCR7c2VjdGlvbi5sYWJlbH0gaW50ZXJhY3Rpb24gYWN0aXZhdGlvbiBrZXlmcmFtZWB9XG4gICAgICAgICAgICAgICAgICAgICAgb25DbGljaz17KCkgPT4gc2VsZWN0QXQoeyB0eXBlOiAnaW50ZXJhY3Rpb24nLCBrZXlQYXJ0OiAnYWN0aXZhdGlvbicgfSwgYWN0aXZhdGlvbil9XG4gICAgICAgICAgICAgICAgICAgIC8+XG4gICAgICAgICAgICAgICAgICApIDogbnVsbH1cbiAgICAgICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgICAgKTtcbiAgICAgICAgICAgIH0pfVxuICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICkpfVxuICAgICAgICA8L2Rpdj5cbiAgICAgIDwvZGl2PlxuICAgIDwvZGl2PlxuICApO1xufVxuXG5mdW5jdGlvbiBTZXF1ZW5jZUluc3BlY3Rvcih7IHN0b3JlLCBzbmFwc2hvdCB9KSB7XG4gIGNvbnN0IGNvbW1pdEdsb2JhbCA9IChncm91cCwga2V5LCB2YWx1ZSkgPT4gc3RvcmUuY29tbWl0KGBDaGFuZ2UgJHtrZXl9YCwgKGRyYWZ0KSA9PiB7XG4gICAgaWYgKGdyb3VwID09PSAnc2VxdWVuY2UnKSBkcmFmdC5nbG9iYWxzW2tleV0gPSB2YWx1ZTtcbiAgICBlbHNlIHtcbiAgICAgIGNvbnN0IHRhcmdldEtleSA9IGdyb3VwID09PSAnbWF0ZXJpYWwnID8gJ3BvaW50TWF0ZXJpYWwnIDogZ3JvdXA7XG4gICAgICBkcmFmdC5nbG9iYWxzW3RhcmdldEtleV1ba2V5XSA9IHZhbHVlO1xuICAgIH1cbiAgfSwgeyBjb2FsZXNjZUtleTogYGdsb2JhbDoke2dyb3VwfToke2tleX1gIH0pO1xuICBjb25zdCByZXF1ZXN0ZWRHcm91cElkcyA9IHNuYXBzaG90LnNlbGVjdGlvbi50eXBlID09PSAnc2VxdWVuY2UnXG4gICAgPyBzbmFwc2hvdC5zZWxlY3Rpb24uZ3JvdXBJZHMgfHwgW11cbiAgICA6IFtdO1xuICBjb25zdCBncm91cHMgPSByZXF1ZXN0ZWRHcm91cElkcy5sZW5ndGhcbiAgICA/IEFCT1VUX05BUlJBVElWRV9HTE9CQUxfQ09OVFJPTFMuZmlsdGVyKChncm91cCkgPT4gcmVxdWVzdGVkR3JvdXBJZHMuaW5jbHVkZXMoZ3JvdXAuaWQpKVxuICAgIDogQUJPVVRfTkFSUkFUSVZFX0dMT0JBTF9DT05UUk9MUztcbiAgY29uc3QgaGVhZGluZyA9IHNuYXBzaG90LnNlbGVjdGlvbi50cmFja0xhYmVsXG4gICAgPyBgJHtzbmFwc2hvdC5zZWxlY3Rpb24udHJhY2tMYWJlbH0gdHJhY2tgXG4gICAgOiAnU2VxdWVuY2UnO1xuICByZXR1cm4gKFxuICAgIDw+XG4gICAgICA8aGVhZGVyPjxzcGFuPntoZWFkaW5nfTwvc3Bhbj48c3Ryb25nPkdsb2JhbCBjb250cm9sczwvc3Ryb25nPjwvaGVhZGVyPlxuICAgICAge2dyb3Vwcy5tYXAoKGdyb3VwKSA9PiAoXG4gICAgICAgIDxkZXRhaWxzIG9wZW4ga2V5PXtncm91cC5pZH0gZGF0YS1nbG9iYWwtZ3JvdXA9e2dyb3VwLmlkfT5cbiAgICAgICAgICA8c3VtbWFyeT57Z3JvdXAubGFiZWx9PC9zdW1tYXJ5PlxuICAgICAgICAgIHtncm91cC5pZCA9PT0gJ3RleHRNb3Rpb24nID8gPHAgY2xhc3NOYW1lPVwiYWJvdXQtZWRpdG9yLWhlbHBcIj5FdmVyeSB0aXRsZSBmb2xsb3dzIG9uZSBjb250aW51b3VzIFkgYW5kIFogcGF0aC4gTmVnYXRpdmUgWSBpcyBoaWdoZXI7IHBvc2l0aXZlIFkgaXMgbG93ZXIuIFRyYXZlbCBkdXJhdGlvbiBjaGFuZ2VzIHRoZSB3aWR0aCBvZiBldmVyeSBTcGF0aWFsIHRpdGxlIGJsb2NrIGluIHRoZSBUZXh0IHRpbWVsaW5lLjwvcD4gOiBudWxsfVxuICAgICAgICAgIHtncm91cC5pZCA9PT0gJ3N3YXJtVHVyYnVsZW5jZScgPyA8cCBjbGFzc05hbWU9XCJhYm91dC1lZGl0b3ItaGVscFwiPk9uZSBhbWJpZW50IG1vdGlvbiBwcm9maWxlIGRyaXZlcyBib3RoIHRoZSBjbHVzdGVyIGFuZCB0dXJidWxlbnQgZmllbGQuIEVhY2ggV29ybGQgb25seSBzY2FsZXMgaXRzIHN0cmVuZ3RoLCBzbyB0aGUgbW90aW9uIHN0YXlzIGNvbnRpbnVvdXMgd2hpbGUgU2hhcGVzIGNoYW5nZS48L3A+IDogbnVsbH1cbiAgICAgICAgICB7Z3JvdXAuY29udHJvbHMubWFwKChjb250cm9sKSA9PiB7XG4gICAgICAgICAgICBjb25zdCB0YXJnZXQgPSBncm91cC5pZCA9PT0gJ3NlcXVlbmNlJ1xuICAgICAgICAgICAgICA/IHNuYXBzaG90LmRvY3VtZW50Lmdsb2JhbHNcbiAgICAgICAgICAgICAgOiBzbmFwc2hvdC5kb2N1bWVudC5nbG9iYWxzW2dyb3VwLmlkID09PSAnbWF0ZXJpYWwnID8gJ3BvaW50TWF0ZXJpYWwnIDogZ3JvdXAuaWRdO1xuICAgICAgICAgICAgaWYgKGdyb3VwLmlkID09PSAndGV4dE1vdGlvbicgJiYgY29udHJvbC5pZCA9PT0gJ3JlYWRhYmxlRW5kJykgcmV0dXJuIG51bGw7XG4gICAgICAgICAgICBpZiAoZ3JvdXAuaWQgPT09ICd0ZXh0TW90aW9uJyAmJiBjb250cm9sLmlkID09PSAncmVhZGFibGVTdGFydCcpIHtcbiAgICAgICAgICAgICAgcmV0dXJuIChcbiAgICAgICAgICAgICAgICA8UmFuZ2VQcm9wZXJ0eVxuICAgICAgICAgICAgICAgICAga2V5PVwiY2xlYXJXaW5kb3dcIlxuICAgICAgICAgICAgICAgICAgbGFiZWw9XCJDbGVhciB3aW5kb3dcIlxuICAgICAgICAgICAgICAgICAgc3RhcnQ9e3RhcmdldC5yZWFkYWJsZVN0YXJ0fVxuICAgICAgICAgICAgICAgICAgZW5kPXt0YXJnZXQucmVhZGFibGVFbmR9XG4gICAgICAgICAgICAgICAgICBtaW49e2NvbnRyb2wubWlufVxuICAgICAgICAgICAgICAgICAgbWF4PXtjb250cm9sLm1heH1cbiAgICAgICAgICAgICAgICAgIHN0ZXA9e2NvbnRyb2wuc3RlcH1cbiAgICAgICAgICAgICAgICAgIG9uU3RhcnRDaGFuZ2U9eyh2YWx1ZSkgPT4gY29tbWl0R2xvYmFsKGdyb3VwLmlkLCAncmVhZGFibGVTdGFydCcsIHZhbHVlKX1cbiAgICAgICAgICAgICAgICAgIG9uRW5kQ2hhbmdlPXsodmFsdWUpID0+IGNvbW1pdEdsb2JhbChncm91cC5pZCwgJ3JlYWRhYmxlRW5kJywgdmFsdWUpfVxuICAgICAgICAgICAgICAgICAgaGludD1cIlRoZSB0aXRsZSBpcyBmdWxseSBjbGVhciBpbnNpZGUgdGhpcyBwYXJ0IG9mIGl0cyBvd24gdHJhdmVsLiBPdXRzaWRlIGl0LCBibHVyIGFuZCBvcGFjaXR5IGJ1aWxkIHRvd2FyZCB0aGUgZW5kcy5cIlxuICAgICAgICAgICAgICAgIC8+XG4gICAgICAgICAgICAgICk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICByZXR1cm4gKFxuICAgICAgICAgICAgICA8TnVtYmVyUHJvcGVydHlcbiAgICAgICAgICAgICAgICBrZXk9e2NvbnRyb2wuaWR9XG4gICAgICAgICAgICAgICAgbGFiZWw9e2NvbnRyb2wubGFiZWx9XG4gICAgICAgICAgICAgICAgdmFsdWU9e3RhcmdldFtjb250cm9sLmlkXX1cbiAgICAgICAgICAgICAgICBtaW49e2NvbnRyb2wubWlufVxuICAgICAgICAgICAgICAgIG1heD17Y29udHJvbC5tYXh9XG4gICAgICAgICAgICAgICAgc3RlcD17Y29udHJvbC5zdGVwfVxuICAgICAgICAgICAgICAgIHVuaXQ9e2NvbnRyb2wudW5pdH1cbiAgICAgICAgICAgICAgICBvbkNoYW5nZT17KHZhbHVlKSA9PiBjb21taXRHbG9iYWwoZ3JvdXAuaWQsIGNvbnRyb2wuaWQsIHZhbHVlKX1cbiAgICAgICAgICAgICAgLz5cbiAgICAgICAgICAgICk7XG4gICAgICAgICAgfSl9XG4gICAgICAgICAge2dyb3VwLmlkID09PSAndGV4dE1vdGlvbicgPyA8cCBjbGFzc05hbWU9XCJhYm91dC1lZGl0b3ItaGVscCBhYm91dC1lZGl0b3ItZGVwdGgtaGVscFwiPjxzdHJvbmc+RGVwdGggbW92ZXM7IGJsdXIgc29mdGVucy48L3N0cm9uZz4gRW50cnkgZGVwdGggc3RhcnRzIGJlaGluZCB0aGUgc2NyZWVuIG9uIOKIklogYW5kIEV4aXQgZGVwdGggZmluaXNoZXMgdG93YXJkIHlvdSBvbiArWi4gUGVyc3BlY3RpdmUgY29udHJvbHMgaG93IHN0cm9uZ2x5IHRoYXQgWiB0cmF2ZWwgY2hhbmdlcyBhcHBhcmVudCBzaXplOyBNYXhpbXVtIGJsdXIgb25seSBjaGFuZ2VzIHNoYXJwbmVzcy48L3A+IDogbnVsbH1cbiAgICAgICAgPC9kZXRhaWxzPlxuICAgICAgKSl9XG4gICAgPC8+XG4gICk7XG59XG5cbmZ1bmN0aW9uIFNlY3Rpb25JbnNwZWN0b3IoeyBzdG9yZSwgc25hcHNob3QsIHNlY3Rpb24gfSkge1xuICBjb25zdCBzZWN0aW9uSW5kZXggPSBnZXRTZWN0aW9uSW5kZXgoc25hcHNob3QuZG9jdW1lbnQsIHNlY3Rpb24uaWQpO1xuICBjb25zdCBjb21waWxlZFNlY3Rpb24gPSBzbmFwc2hvdC5jb21waWxlZFBsYW4/LnNlY3Rpb25zPy5bc2VjdGlvbkluZGV4XTtcbiAgY29uc3QgYWN0aXZlRXh0ZW50RmllbGQgPSBzbmFwc2hvdC5wcmV2aWV3UHJvZmlsZSA9PT0gJ21vYmlsZScgPyAnbW9iaWxlRXh0ZW50V1UnIDogJ2V4dGVudFdVJztcbiAgY29uc3QgYWN0aXZlRXh0ZW50ID0gTnVtYmVyKHNlY3Rpb25bYWN0aXZlRXh0ZW50RmllbGRdKTtcbiAgY29uc3QgcmVzb2x2ZWRFeHRlbnQgPSBOdW1iZXIoY29tcGlsZWRTZWN0aW9uPy5yZXNvbHZlZEV4dGVudFdVID8/IGFjdGl2ZUV4dGVudCk7XG4gIGNvbnN0IGNvbnRlbnRNaW5pbXVtQWN0aXZlID0gcmVzb2x2ZWRFeHRlbnQgPiBhY3RpdmVFeHRlbnQgKyAwLjAwMTtcbiAgY29uc3QgYmFzZWxpbmVTZWN0aW9uID0gc25hcHNob3QuYmFzZWxpbmVEb2N1bWVudC5zZWN0aW9ucy5maW5kKChpdGVtKSA9PiBpdGVtLmlkID09PSBzZWN0aW9uLmlkKTtcbiAgY29uc3QgdXBkYXRlID0gKGxhYmVsLCBtdXRhdGUsIGNvYWxlc2NlS2V5ID0gbnVsbCkgPT4gc3RvcmUuY29tbWl0KGxhYmVsLCAoZHJhZnQpID0+IHtcbiAgICBtdXRhdGUoZHJhZnQuc2VjdGlvbnNbc2VjdGlvbkluZGV4XSk7XG4gIH0sIHsgY29hbGVzY2VLZXksIHNlbGVjdGlvbjogc25hcHNob3Quc2VsZWN0aW9uIH0pO1xuICBjb25zdCBtb3ZlID0gKGRpcmVjdGlvbikgPT4gc3RvcmUuY29tbWl0KCdSZW9yZGVyIFNlY3Rpb24nLCAoZHJhZnQpID0+IHtcbiAgICBjb25zdCB0b0luZGV4ID0gc2VjdGlvbkluZGV4ICsgZGlyZWN0aW9uO1xuICAgIGlmICh0b0luZGV4IDwgMCB8fCB0b0luZGV4ID49IGRyYWZ0LnNlY3Rpb25zLmxlbmd0aCkgcmV0dXJuO1xuICAgIGNvbnN0IFttb3ZlZF0gPSBkcmFmdC5zZWN0aW9ucy5zcGxpY2Uoc2VjdGlvbkluZGV4LCAxKTtcbiAgICBkcmFmdC5zZWN0aW9ucy5zcGxpY2UodG9JbmRleCwgMCwgbW92ZWQpO1xuICAgIHJlcGxhY2VEcmFmdERvY3VtZW50KGRyYWZ0LCBzdGl0Y2hBYm91dE5hcnJhdGl2ZUNhbWVyYUJvdW5kYXJpZXMoZHJhZnQpKTtcbiAgfSwgeyBzZWxlY3Rpb246IHsgdHlwZTogJ3NlY3Rpb24nLCBzZWN0aW9uSWQ6IHNlY3Rpb24uaWQgfSB9KTtcbiAgY29uc3QgZHVwbGljYXRlID0gKCkgPT4ge1xuICAgIGNvbnN0IHJlc3VsdCA9IGR1cGxpY2F0ZUFib3V0TmFycmF0aXZlU2VjdGlvbih7IGRvY3VtZW50OiBzbmFwc2hvdC5kb2N1bWVudCwgc2VjdGlvbklkOiBzZWN0aW9uLmlkIH0pO1xuICAgIGlmICghcmVzdWx0LnZhbGlkKSB7XG4gICAgICBzdG9yZS5zZXRTYXZlU3RhdGUoeyBtZXNzYWdlOiByZXN1bHQucmVhc29uIHx8ICdUaGlzIFNlY3Rpb24gY2Fubm90IGJlIGR1cGxpY2F0ZWQuJyB9KTtcbiAgICAgIHJldHVybjtcbiAgICB9XG4gICAgc3RvcmUuY29tbWl0KCdEdXBsaWNhdGUgU2VjdGlvbicsIChkcmFmdCkgPT4gcmVwbGFjZURyYWZ0RG9jdW1lbnQoZHJhZnQsIHJlc3VsdC5kb2N1bWVudCksIHtcbiAgICAgIHNlbGVjdGlvbjogcmVzdWx0LnNlbGVjdGlvbixcbiAgICB9KTtcbiAgfTtcblxuICByZXR1cm4gKFxuICAgIDw+XG4gICAgICA8aGVhZGVyPjxzcGFuPlNlY3Rpb24ge1N0cmluZyhzZWN0aW9uSW5kZXggKyAxKS5wYWRTdGFydCgyLCAnMCcpfTwvc3Bhbj48c3Ryb25nPntzZWN0aW9uLmxhYmVsfTwvc3Ryb25nPjwvaGVhZGVyPlxuICAgICAge3NlY3Rpb24ubG9ja2VkID8gPGRpdiBjbGFzc05hbWU9XCJhYm91dC1lZGl0b3ItbG9ja1wiPjxMb2NrS2V5aG9sZSBhcmlhLWhpZGRlbj1cInRydWVcIiAvPjxzcGFuPlRoaXMgcHJvdGVjdGVkIFNlY3Rpb24gY2Fubm90IGJlIHJlb3JkZXJlZCBvciBoYXZlIGl0cyBXb3JsZCByZXBsYWNlZCBhY2NpZGVudGFsbHkuPC9zcGFuPjxidXR0b24gdHlwZT1cImJ1dHRvblwiIG9uQ2xpY2s9eygpID0+IHVwZGF0ZSgnVW5sb2NrIHByb3RlY3RlZCBTZWN0aW9uJywgKGRyYWZ0KSA9PiB7IGRyYWZ0LmxvY2tlZCA9IGZhbHNlOyB9KX0+VW5sb2NrIGFkdmFuY2VkPC9idXR0b24+PC9kaXY+IDogbnVsbH1cbiAgICAgIDxkaXYgY2xhc3NOYW1lPVwiYWJvdXQtZWRpdG9yLWlubGluZS1hY3Rpb25zXCI+XG4gICAgICAgIDxidXR0b24gdHlwZT1cImJ1dHRvblwiIGRpc2FibGVkPXtzZWN0aW9uLmxvY2tlZCB8fCBzZWN0aW9uSW5kZXggPT09IDB9IG9uQ2xpY2s9eygpID0+IG1vdmUoLTEpfT5Nb3ZlIGVhcmxpZXI8L2J1dHRvbj5cbiAgICAgICAgPGJ1dHRvbiB0eXBlPVwiYnV0dG9uXCIgZGlzYWJsZWQ9e3NlY3Rpb24ubG9ja2VkIHx8IHNlY3Rpb25JbmRleCA9PT0gc25hcHNob3QuZG9jdW1lbnQuc2VjdGlvbnMubGVuZ3RoIC0gMX0gb25DbGljaz17KCkgPT4gbW92ZSgxKX0+TW92ZSBsYXRlcjwvYnV0dG9uPlxuICAgICAgICA8YnV0dG9uIHR5cGU9XCJidXR0b25cIiBkaXNhYmxlZD17c2VjdGlvbi5sb2NrZWQgfHwgc2VjdGlvbi50eXBlID09PSAnZmluYWxlJ30gb25DbGljaz17ZHVwbGljYXRlfT5EdXBsaWNhdGU8L2J1dHRvbj5cbiAgICAgIDwvZGl2PlxuICAgICAgPFByb3BlcnR5IGxhYmVsPVwiU2VjdGlvbiBuYW1lXCI+PGlucHV0IHZhbHVlPXtzZWN0aW9uLmxhYmVsfSBvbkNoYW5nZT17KGV2ZW50KSA9PiB1cGRhdGUoJ1JlbmFtZSBTZWN0aW9uJywgKGRyYWZ0KSA9PiB7IGRyYWZ0LmxhYmVsID0gZXZlbnQudGFyZ2V0LnZhbHVlOyB9LCBgc2VjdGlvbjoke3NlY3Rpb24uaWR9OmxhYmVsYCl9IC8+PC9Qcm9wZXJ0eT5cbiAgICAgIDxQcm9wZXJ0eSBsYWJlbD1cIlN0YWJsZSBJRFwiPjxpbnB1dCB2YWx1ZT17c2VjdGlvbi5pZH0gcmVhZE9ubHkgLz48c21hbGw+UmVmZXJlbmNlcyB0aGlzIFNlY3Rpb24gd2l0aG91dCB0eWluZyBpdCB0byBpdHMgY3VycmVudCBtZWFuaW5nLjwvc21hbGw+PC9Qcm9wZXJ0eT5cbiAgICAgIDxQcm9wZXJ0eSBsYWJlbD1cIlR5cGVcIj5cbiAgICAgICAgPHNlbGVjdCB2YWx1ZT17c2VjdGlvbi50eXBlfSBkaXNhYmxlZD17c2VjdGlvbi50eXBlID09PSAnZmluYWxlJ30gb25DaGFuZ2U9eyhldmVudCkgPT4gdXBkYXRlKCdDaGFuZ2UgU2VjdGlvbiB0eXBlJywgKGRyYWZ0KSA9PiB7IGRyYWZ0LnR5cGUgPSBldmVudC50YXJnZXQudmFsdWU7IH0pfT5cbiAgICAgICAgICA8b3B0aW9uIHZhbHVlPVwic3BhdGlhbFwiPlNwYXRpYWw8L29wdGlvbj48b3B0aW9uIHZhbHVlPVwiZWRpdG9yaWFsXCI+RWRpdG9yaWFsPC9vcHRpb24+PG9wdGlvbiB2YWx1ZT1cImZpbmFsZVwiPkZpbmFsZTwvb3B0aW9uPlxuICAgICAgICA8L3NlbGVjdD5cbiAgICAgIDwvUHJvcGVydHk+XG4gICAgICA8ZGV0YWlscyBvcGVuPlxuICAgICAgICA8c3VtbWFyeT5TZWN0aW9uIHRpbWluZzwvc3VtbWFyeT5cbiAgICAgICAgPFByb3BlcnR5IGxhYmVsPVwiU2Nyb2xsIHRyYXZlbFwiPjxvdXRwdXQgY2xhc3NOYW1lPVwiYWJvdXQtZWRpdG9yLXJlYWRvdXRcIj57Zm9ybWF0V1UoTWF0aC5tYXgoMCwgYWN0aXZlRXh0ZW50IC0gMSkpfTwvb3V0cHV0PjwvUHJvcGVydHk+XG4gICAgICAgIDxQcm9wZXJ0eSBsYWJlbD1cIlRvdGFsIGhlaWdodFwiPjxvdXRwdXQgY2xhc3NOYW1lPVwiYWJvdXQtZWRpdG9yLXJlYWRvdXRcIj57Zm9ybWF0V1UoYWN0aXZlRXh0ZW50KX08L291dHB1dD48L1Byb3BlcnR5PlxuICAgICAgICA8TnVtYmVyUHJvcGVydHkgbGFiZWw9XCJEZXNrdG9wIGxlbmd0aFwiIHZhbHVlPXtzZWN0aW9uLmV4dGVudFdVfSBtaW49ezF9IG1heD17OH0gc3RlcD17MC4wNX0gdW5pdD1cIldVXCIgb25DaGFuZ2U9eyh2YWx1ZSkgPT4gdXBkYXRlKCdDaGFuZ2UgZGVza3RvcCBTZWN0aW9uIGxlbmd0aCcsIChkcmFmdCkgPT4geyBkcmFmdC5leHRlbnRXVSA9IHZhbHVlOyB9LCBgc2VjdGlvbjoke3NlY3Rpb24uaWR9OmV4dGVudGApfSAvPlxuICAgICAgICA8TnVtYmVyUHJvcGVydHkgbGFiZWw9XCJNb2JpbGUgbGVuZ3RoXCIgdmFsdWU9e3NlY3Rpb24ubW9iaWxlRXh0ZW50V1V9IG1pbj17MX0gbWF4PXs4fSBzdGVwPXswLjA1fSB1bml0PVwiV1VcIiBvbkNoYW5nZT17KHZhbHVlKSA9PiB1cGRhdGUoJ0NoYW5nZSBtb2JpbGUgU2VjdGlvbiBsZW5ndGgnLCAoZHJhZnQpID0+IHsgZHJhZnQubW9iaWxlRXh0ZW50V1UgPSB2YWx1ZTsgfSwgYHNlY3Rpb246JHtzZWN0aW9uLmlkfTptb2JpbGVgKX0gLz5cbiAgICAgICAgPFByb3BlcnR5IGxhYmVsPVwiUmVzb2x2ZWQgaGVpZ2h0XCI+PG91dHB1dCBjbGFzc05hbWU9XCJhYm91dC1lZGl0b3ItcmVhZG91dFwiPntmb3JtYXRXVShyZXNvbHZlZEV4dGVudCl9PC9vdXRwdXQ+PC9Qcm9wZXJ0eT5cbiAgICAgICAge2NvbnRlbnRNaW5pbXVtQWN0aXZlID8gPHAgY2xhc3NOYW1lPVwiYWJvdXQtZWRpdG9yLXRpbWluZy13YXJuaW5nXCI+Q29udGVudCBtaW5pbXVtIGluIGVmZmVjdC4gVGhlIHJlbmRlcmVkIGNvcHkgbmVlZHMge2Zvcm1hdFdVKHJlc29sdmVkRXh0ZW50KX0gaW4gdGhpcyBwcm9maWxlLjwvcD4gOiBudWxsfVxuICAgICAgICA8YnV0dG9uXG4gICAgICAgICAgdHlwZT1cImJ1dHRvblwiXG4gICAgICAgICAgY2xhc3NOYW1lPVwiYWJvdXQtZWRpdG9yLXdpZGUtYWN0aW9uXCJcbiAgICAgICAgICBkaXNhYmxlZD17IWJhc2VsaW5lU2VjdGlvbiB8fCBiYXNlbGluZVNlY3Rpb25bYWN0aXZlRXh0ZW50RmllbGRdID09PSBzZWN0aW9uW2FjdGl2ZUV4dGVudEZpZWxkXX1cbiAgICAgICAgICBvbkNsaWNrPXsoKSA9PiB1cGRhdGUoJ1Jlc3RvcmUgc2F2ZWQgU2VjdGlvbiBsZW5ndGgnLCAoZHJhZnQpID0+IHsgZHJhZnRbYWN0aXZlRXh0ZW50RmllbGRdID0gYmFzZWxpbmVTZWN0aW9uW2FjdGl2ZUV4dGVudEZpZWxkXTsgfSl9XG4gICAgICAgID5SZXNldCB7c25hcHNob3QucHJldmlld1Byb2ZpbGUgPT09ICdtb2JpbGUnID8gJ21vYmlsZScgOiAnZGVza3RvcCd9IGxlbmd0aDwvYnV0dG9uPlxuICAgICAgPC9kZXRhaWxzPlxuICAgICAge3NlY3Rpb24udHlwZSA9PT0gJ2VkaXRvcmlhbCcgPyA8RWRpdG9yaWFsQmxvY2tzIHN0b3JlPXtzdG9yZX0gc25hcHNob3Q9e3NuYXBzaG90fSBzZWN0aW9uPXtzZWN0aW9ufSAvPiA6IG51bGx9XG4gICAgICB7c2VjdGlvbi50eXBlICE9PSAnZWRpdG9yaWFsJyA/IChcbiAgICAgICAgPGJ1dHRvblxuICAgICAgICAgIHR5cGU9XCJidXR0b25cIlxuICAgICAgICAgIGNsYXNzTmFtZT1cImFib3V0LWVkaXRvci13aWRlLWFjdGlvblwiXG4gICAgICAgICAgb25DbGljaz17KCkgPT4ge1xuICAgICAgICAgICAgY29uc3QgbG9jYWwgPSBnZXRMb2NhbFByb2dyZXNzKHNuYXBzaG90LmNvbXBpbGVkUGxhbiwgc2VjdGlvbiwgc25hcHNob3QudHJhbnNwb3J0LnN0b3J5V1UpO1xuICAgICAgICAgICAgY29uc3QgaWQgPSBuZXh0SWQoc25hcHNob3QuZG9jdW1lbnQsIGAke3NlY3Rpb24uaWR9LXN0YXRlbWVudGApO1xuICAgICAgICAgICAgY29uc3QgZm9jdXMgPSBNYXRoLm1pbigwLjkyLCBNYXRoLm1heCgwLjA4LCBzbmFwQWJvdXROYXJyYXRpdmVUaW1lbGluZVZhbHVlKGxvY2FsKSkpO1xuICAgICAgICAgICAgdXBkYXRlKCdBZGQgdGV4dCBDdWUnLCAoZHJhZnQpID0+IHtcbiAgICAgICAgICAgICAgZHJhZnQudGV4dC5jdWVzIHx8PSBbXTtcbiAgICAgICAgICAgICAgZHJhZnQudGV4dC5jdWVzLnB1c2goeyBpZCwgdGV4dDogJ05ldyB0cmF2ZWxsaW5nIHN0YXRlbWVudCcsIGVudGVyOiBmb2N1cyAtIDAuMDgsIGhvbGQ6IGZvY3VzLCBleGl0OiBmb2N1cyArIDAuMDgsIHByZXNldDogJ3RyYXZlbGxpbmctdGl0bGUtdjEnLCBtb3Rpb246IHsgbW9kZTogJ3NwYXRpYWwnIH0gfSk7XG4gICAgICAgICAgICAgIGRyYWZ0LnRleHQuY3Vlcy5zb3J0KChhLCBiKSA9PiBhLmhvbGQgLSBiLmhvbGQpO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICBzdG9yZS5zZXRTZWxlY3Rpb24oeyB0eXBlOiAnY3VlJywgc2VjdGlvbklkOiBzZWN0aW9uLmlkLCBjdWVJZDogaWQsIGtleVBhcnQ6ICdmb2N1cycgfSk7XG4gICAgICAgICAgfX1cbiAgICAgICAgPkFkZCB0ZXh0IGN1ZSBhdCBwbGF5aGVhZDwvYnV0dG9uPlxuICAgICAgKSA6IG51bGx9XG4gICAgPC8+XG4gICk7XG59XG5cbmZ1bmN0aW9uIEVkaXRvcmlhbEJsb2Nrcyh7IHN0b3JlLCBzbmFwc2hvdCwgc2VjdGlvbiB9KSB7XG4gIGNvbnN0IHNlY3Rpb25JbmRleCA9IGdldFNlY3Rpb25JbmRleChzbmFwc2hvdC5kb2N1bWVudCwgc2VjdGlvbi5pZCk7XG4gIGNvbnN0IHVwZGF0ZUJsb2NrID0gKGJsb2NrSW5kZXgsIGZpZWxkLCB2YWx1ZSkgPT4gc3RvcmUuY29tbWl0KCdFZGl0IGVkaXRvcmlhbCBjb3B5JywgKGRyYWZ0KSA9PiB7XG4gICAgZHJhZnQuc2VjdGlvbnNbc2VjdGlvbkluZGV4XS50ZXh0LmJsb2Nrc1tibG9ja0luZGV4XVtmaWVsZF0gPSB2YWx1ZTtcbiAgfSwgeyBjb2FsZXNjZUtleTogYGJsb2NrOiR7c2VjdGlvbi5pZH06JHtibG9ja0luZGV4fToke2ZpZWxkfWAsIHNlbGVjdGlvbjogc25hcHNob3Quc2VsZWN0aW9uIH0pO1xuICBjb25zdCB1cGRhdGVFbXBoYXNpcyA9IChibG9ja0luZGV4LCBlbXBoYXNpc0luZGV4LCBmaWVsZCwgdmFsdWUpID0+IHN0b3JlLmNvbW1pdCgnRWRpdCBlZGl0b3JpYWwgaGlnaGxpZ2h0JywgKGRyYWZ0KSA9PiB7XG4gICAgZHJhZnQuc2VjdGlvbnNbc2VjdGlvbkluZGV4XS50ZXh0LmJsb2Nrc1tibG9ja0luZGV4XS5lbXBoYXNpc1tlbXBoYXNpc0luZGV4XVtmaWVsZF0gPSB2YWx1ZTtcbiAgfSwgeyBjb2FsZXNjZUtleTogYGJsb2NrOiR7c2VjdGlvbi5pZH06JHtibG9ja0luZGV4fTplbXBoYXNpczoke2VtcGhhc2lzSW5kZXh9OiR7ZmllbGR9YCwgc2VsZWN0aW9uOiBzbmFwc2hvdC5zZWxlY3Rpb24gfSk7XG4gIGNvbnN0IGFkZEVtcGhhc2lzID0gKGJsb2NrSW5kZXgpID0+IHN0b3JlLmNvbW1pdCgnQWRkIGVkaXRvcmlhbCBoaWdobGlnaHQnLCAoZHJhZnQpID0+IHtcbiAgICBjb25zdCBibG9jayA9IGRyYWZ0LnNlY3Rpb25zW3NlY3Rpb25JbmRleF0udGV4dC5ibG9ja3NbYmxvY2tJbmRleF07XG4gICAgYmxvY2suZW1waGFzaXMgfHw9IFtdO1xuICAgIGJsb2NrLmVtcGhhc2lzLnB1c2goeyB0ZXh0OiBibG9jay50ZXh0LnRyaW0oKS5zcGxpdCgvXFxzKy8pLnNsaWNlKDAsIDIpLmpvaW4oJyAnKSwgdG9uZTogJ2JsdWUnIH0pO1xuICB9LCB7IHNlbGVjdGlvbjogc25hcHNob3Quc2VsZWN0aW9uIH0pO1xuICBjb25zdCByZW1vdmVFbXBoYXNpcyA9IChibG9ja0luZGV4LCBlbXBoYXNpc0luZGV4KSA9PiBzdG9yZS5jb21taXQoJ1JlbW92ZSBlZGl0b3JpYWwgaGlnaGxpZ2h0JywgKGRyYWZ0KSA9PiB7XG4gICAgZHJhZnQuc2VjdGlvbnNbc2VjdGlvbkluZGV4XS50ZXh0LmJsb2Nrc1tibG9ja0luZGV4XS5lbXBoYXNpcy5zcGxpY2UoZW1waGFzaXNJbmRleCwgMSk7XG4gIH0sIHsgc2VsZWN0aW9uOiBzbmFwc2hvdC5zZWxlY3Rpb24gfSk7XG4gIHJldHVybiAoXG4gICAgPGRldGFpbHMgb3Blbj5cbiAgICAgIDxzdW1tYXJ5PkVkaXRvcmlhbCBjb250ZW50PC9zdW1tYXJ5PlxuICAgICAgeyhzZWN0aW9uLnRleHQuYmxvY2tzIHx8IFtdKS5tYXAoKGJsb2NrLCBibG9ja0luZGV4KSA9PiAoXG4gICAgICAgIDxkaXYgY2xhc3NOYW1lPVwiYWJvdXQtZWRpdG9yLWJsb2NrXCIga2V5PXtibG9jay5pZH0+XG4gICAgICAgICAgPGRpdj48Y29kZT57YmxvY2sua2luZH08L2NvZGU+PHNwYW4+e2Jsb2NrLmlkfTwvc3Bhbj48L2Rpdj5cbiAgICAgICAgICB7YmxvY2subGFiZWwgIT0gbnVsbCA/IDxQcm9wZXJ0eSBsYWJlbD1cIkxhYmVsXCI+PGlucHV0IHZhbHVlPXtibG9jay5sYWJlbH0gb25DaGFuZ2U9eyhldmVudCkgPT4gdXBkYXRlQmxvY2soYmxvY2tJbmRleCwgJ2xhYmVsJywgZXZlbnQudGFyZ2V0LnZhbHVlKX0gLz48L1Byb3BlcnR5PiA6IG51bGx9XG4gICAgICAgICAge2Jsb2NrLnRleHQgIT0gbnVsbCA/IDxQcm9wZXJ0eSBsYWJlbD1cIkNvcHlcIj48dGV4dGFyZWEgcm93cz1cIjVcIiB2YWx1ZT17YmxvY2sudGV4dH0gb25DaGFuZ2U9eyhldmVudCkgPT4gdXBkYXRlQmxvY2soYmxvY2tJbmRleCwgJ3RleHQnLCBldmVudC50YXJnZXQudmFsdWUpfSAvPjwvUHJvcGVydHk+IDogbnVsbH1cbiAgICAgICAgICB7YmxvY2sua2luZCA9PT0gJ3Byb3NlJyA/IDxQcm9wZXJ0eSBsYWJlbD1cIlJlY29ubmVjdCBwb2ludCBncmlkXCI+PGlucHV0IHR5cGU9XCJjaGVja2JveFwiIGNoZWNrZWQ9e2Jsb2NrLndvcmxkSW5mbHVlbmNlID09PSB0cnVlfSBvbkNoYW5nZT17KGV2ZW50KSA9PiB1cGRhdGVCbG9jayhibG9ja0luZGV4LCAnd29ybGRJbmZsdWVuY2UnLCBldmVudC50YXJnZXQuY2hlY2tlZCl9IC8+PC9Qcm9wZXJ0eT4gOiBudWxsfVxuICAgICAgICAgIHtibG9jay50ZXh0ICE9IG51bGwgPyAoXG4gICAgICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cImFib3V0LWVkaXRvci1lbXBoYXNpcy1jb250cm9sc1wiPlxuICAgICAgICAgICAgICA8c3Bhbj5IaWdobGlnaHRlZCB3b3Jkczwvc3Bhbj5cbiAgICAgICAgICAgICAgeyhibG9jay5lbXBoYXNpcyB8fCBbXSkubWFwKChpdGVtLCBlbXBoYXNpc0luZGV4KSA9PiAoXG4gICAgICAgICAgICAgICAgPGRpdiBjbGFzc05hbWU9XCJhYm91dC1lZGl0b3ItZW1waGFzaXMtcm93XCIga2V5PXtgJHtibG9jay5pZH0tZW1waGFzaXMtJHtlbXBoYXNpc0luZGV4fWB9PlxuICAgICAgICAgICAgICAgICAgPGlucHV0IGFyaWEtbGFiZWw9XCJIaWdobGlnaHRlZCBwaHJhc2VcIiB2YWx1ZT17aXRlbS50ZXh0fSBvbkNoYW5nZT17KGV2ZW50KSA9PiB1cGRhdGVFbXBoYXNpcyhibG9ja0luZGV4LCBlbXBoYXNpc0luZGV4LCAndGV4dCcsIGV2ZW50LnRhcmdldC52YWx1ZSl9IC8+XG4gICAgICAgICAgICAgICAgICA8c2VsZWN0IGFyaWEtbGFiZWw9XCJIaWdobGlnaHQgY29sb3VyXCIgdmFsdWU9e2l0ZW0udG9uZX0gb25DaGFuZ2U9eyhldmVudCkgPT4gdXBkYXRlRW1waGFzaXMoYmxvY2tJbmRleCwgZW1waGFzaXNJbmRleCwgJ3RvbmUnLCBldmVudC50YXJnZXQudmFsdWUpfT5cbiAgICAgICAgICAgICAgICAgICAge0FCT1VUX05BUlJBVElWRV9FTVBIQVNJU19UT05FUy5tYXAoKHRvbmUpID0+IDxvcHRpb24gdmFsdWU9e3RvbmV9IGtleT17dG9uZX0+e3RvbmV9PC9vcHRpb24+KX1cbiAgICAgICAgICAgICAgICAgIDwvc2VsZWN0PlxuICAgICAgICAgICAgICAgICAgPGJ1dHRvbiB0eXBlPVwiYnV0dG9uXCIgYXJpYS1sYWJlbD17YFJlbW92ZSAke2l0ZW0udGV4dCB8fCAnZW1wdHknfSBoaWdobGlnaHRgfSBvbkNsaWNrPXsoKSA9PiByZW1vdmVFbXBoYXNpcyhibG9ja0luZGV4LCBlbXBoYXNpc0luZGV4KX0+w5c8L2J1dHRvbj5cbiAgICAgICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgICAgKSl9XG4gICAgICAgICAgICAgIDxidXR0b24gdHlwZT1cImJ1dHRvblwiIG9uQ2xpY2s9eygpID0+IGFkZEVtcGhhc2lzKGJsb2NrSW5kZXgpfT5BZGQgaGlnaGxpZ2h0PC9idXR0b24+XG4gICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICApIDogbnVsbH1cbiAgICAgICAgICB7YmxvY2suaXRlbXMgPyA8UHJvcGVydHkgbGFiZWw9XCJJdGVtc1wiPjx0ZXh0YXJlYSByb3dzPVwiNlwiIHZhbHVlPXtibG9jay5pdGVtcy5qb2luKCdcXG4nKX0gb25DaGFuZ2U9eyhldmVudCkgPT4gdXBkYXRlQmxvY2soYmxvY2tJbmRleCwgJ2l0ZW1zJywgZXZlbnQudGFyZ2V0LnZhbHVlLnNwbGl0KCdcXG4nKS5maWx0ZXIoQm9vbGVhbikpfSAvPjwvUHJvcGVydHk+IDogbnVsbH1cbiAgICAgICAgPC9kaXY+XG4gICAgICApKX1cbiAgICAgIDxidXR0b24gdHlwZT1cImJ1dHRvblwiIGNsYXNzTmFtZT1cImFib3V0LWVkaXRvci13aWRlLWFjdGlvblwiIG9uQ2xpY2s9eygpID0+IHN0b3JlLmNvbW1pdCgnQWRkIGVkaXRvcmlhbCBibG9jaycsIChkcmFmdCkgPT4ge1xuICAgICAgICBkcmFmdC5zZWN0aW9uc1tzZWN0aW9uSW5kZXhdLnRleHQuYmxvY2tzLnB1c2goeyBpZDogbmV4dElkKGRyYWZ0LCBgJHtzZWN0aW9uLmlkfS1wcm9zZWApLCBraW5kOiAncHJvc2UnLCB0ZXh0OiAnTmV3IGVkaXRvcmlhbCBwYXJhZ3JhcGguJyB9KTtcbiAgICAgIH0pfT5BZGQgcHJvc2UgYmxvY2s8L2J1dHRvbj5cbiAgICA8L2RldGFpbHM+XG4gICk7XG59XG5cbmZ1bmN0aW9uIEN1ZVJoeXRobUFuZFJldXNlKHsgc3RvcmUsIHNuYXBzaG90LCBjbGlwYm9hcmQsIHNldENsaXBib2FyZCB9KSB7XG4gIGNvbnN0IG1lbWJlcnMgPSBnZXRBYm91dE5hcnJhdGl2ZVNlbGVjdGlvbk1lbWJlcnMoc25hcHNob3Quc2VsZWN0aW9uKTtcbiAgY29uc3QgW2dhcFdVLCBzZXRHYXBXVV0gPSB1c2VTdGF0ZSgwLjM1KTtcbiAgY29uc3QgW2FuY2hvciwgc2V0QW5jaG9yXSA9IHVzZVN0YXRlKCdwcmltYXJ5Jyk7XG4gIGNvbnN0IFtwcmV2aWV3LCBzZXRQcmV2aWV3XSA9IHVzZVN0YXRlKG51bGwpO1xuICBjb25zdCBbbWVzc2FnZSwgc2V0TWVzc2FnZV0gPSB1c2VTdGF0ZSgnJyk7XG5cbiAgY29uc3QgcHJldmlld01vdmVzID0gKGxhYmVsLCByZXN1bHQpID0+IHtcbiAgICBpZiAoIXJlc3VsdC52YWxpZCkge1xuICAgICAgaWYgKHNuYXBzaG90LnRyeVN0YXRlKSBzdG9yZS5jYW5jZWxUcnkoKTtcbiAgICAgIHNldFByZXZpZXcocmVzdWx0KTtcbiAgICAgIHNldE1lc3NhZ2UocmVzdWx0LnJlYXNvbiB8fCAnVGhpcyBhcnJhbmdlbWVudCBkb2VzIG5vdCBmaXQgdGhlIHNlbGVjdGVkIFNlY3Rpb25zLicpO1xuICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICBpZiAoc25hcHNob3QudHJ5U3RhdGUpIHN0b3JlLmNhbmNlbFRyeSgpO1xuICAgIHN0b3JlLmJlZ2luVHJ5KGxhYmVsLCAoZHJhZnQpID0+IGFwcGx5Q3VlTW92ZXMoZHJhZnQsIHJlc3VsdC5tb3ZlcykpO1xuICAgIHNldFByZXZpZXcoeyAuLi5yZXN1bHQsIGxhYmVsIH0pO1xuICAgIHNldE1lc3NhZ2UoJycpO1xuICB9O1xuICBjb25zdCBjYW5jZWxQcmV2aWV3ID0gKCkgPT4ge1xuICAgIGlmIChzbmFwc2hvdC50cnlTdGF0ZSkgc3RvcmUuY2FuY2VsVHJ5KCk7XG4gICAgc2V0UHJldmlldyhudWxsKTtcbiAgICBzZXRNZXNzYWdlKCcnKTtcbiAgfTtcbiAgY29uc3QgYXBwbHlQcmV2aWV3ID0gKCkgPT4ge1xuICAgIGlmICghcHJldmlldz8udmFsaWQgfHwgIXNuYXBzaG90LnRyeVN0YXRlKSByZXR1cm47XG4gICAgc3RvcmUuYXBwbHlUcnkoKTtcbiAgICBzZXRQcmV2aWV3KG51bGwpO1xuICAgIHNldE1lc3NhZ2UoJycpO1xuICB9O1xuICBjb25zdCBjb21taXRDYW5kaWRhdGUgPSAobGFiZWwsIHJlc3VsdCkgPT4ge1xuICAgIGlmICghcmVzdWx0Py52YWxpZCB8fCAhcmVzdWx0LmRvY3VtZW50KSB7XG4gICAgICBzZXRNZXNzYWdlKHJlc3VsdD8ucmVhc29uIHx8ICdUaGlzIG9wZXJhdGlvbiBjb3VsZCBub3QgYmUgY29tcGxldGVkIHNhZmVseS4nKTtcbiAgICAgIHJldHVybjtcbiAgICB9XG4gICAgc3RvcmUuY29tbWl0KGxhYmVsLCAoZHJhZnQpID0+IHJlcGxhY2VEcmFmdERvY3VtZW50KGRyYWZ0LCByZXN1bHQuZG9jdW1lbnQpLCB7XG4gICAgICBzZWxlY3Rpb246IHJlc3VsdC5zZWxlY3Rpb24gfHwgc25hcHNob3Quc2VsZWN0aW9uLFxuICAgIH0pO1xuICAgIHNldE1lc3NhZ2UoJycpO1xuICB9O1xuXG4gIGNvbnN0IGRpc3RyaWJ1dGUgPSAoKSA9PiBwcmV2aWV3TW92ZXMoJ0Rpc3RyaWJ1dGUgdGl0bGUgcmh5dGhtJywgcmVzb2x2ZUFib3V0TmFycmF0aXZlQ3VlRGlzdHJpYnV0aW9uKHtcbiAgICBkb2N1bWVudDogc25hcHNob3QuZG9jdW1lbnQsXG4gICAgcGxhbjogc25hcHNob3QuY29tcGlsZWRQbGFuLFxuICAgIG1lbWJlcnMsXG4gICAgcHJpbWFyeTogc25hcHNob3Quc2VsZWN0aW9uLFxuICB9KSk7XG4gIGNvbnN0IGV4YWN0R2FwID0gKCkgPT4gcHJldmlld01vdmVzKCdTZXQgZXhhY3QgdGl0bGUgZ2FwJywgcmVzb2x2ZUFib3V0TmFycmF0aXZlQ3VlRXhhY3RHYXAoe1xuICAgIGRvY3VtZW50OiBzbmFwc2hvdC5kb2N1bWVudCxcbiAgICBwbGFuOiBzbmFwc2hvdC5jb21waWxlZFBsYW4sXG4gICAgbWVtYmVycyxcbiAgICBwcmltYXJ5OiBzbmFwc2hvdC5zZWxlY3Rpb24sXG4gICAgZ2FwV1UsXG4gICAgYW5jaG9yLFxuICB9KSk7XG4gIGNvbnN0IGFsaWduUHJpbWFyeSA9ICgpID0+IHByZXZpZXdNb3ZlcygnQWxpZ24gdGl0bGVzIHRvIHBsYXloZWFkJywgcmVzb2x2ZUFib3V0TmFycmF0aXZlQ3VlR3JvdXBBbGlnbih7XG4gICAgZG9jdW1lbnQ6IHNuYXBzaG90LmRvY3VtZW50LFxuICAgIHBsYW46IHNuYXBzaG90LmNvbXBpbGVkUGxhbixcbiAgICBtZW1iZXJzLFxuICAgIHByaW1hcnk6IHNuYXBzaG90LnNlbGVjdGlvbixcbiAgICBwbGF5aGVhZFdVOiBzbmFwc2hvdC50cmFuc3BvcnQuc3RvcnlXVSxcbiAgfSkpO1xuICBjb25zdCBkdXBsaWNhdGUgPSAoKSA9PiBjb21taXRDYW5kaWRhdGUoJ0R1cGxpY2F0ZSB0aXRsZSBDdWVzJywgZHVwbGljYXRlQWJvdXROYXJyYXRpdmVDdWVHcm91cCh7XG4gICAgZG9jdW1lbnQ6IHNuYXBzaG90LmRvY3VtZW50LFxuICAgIG1lbWJlcnMsXG4gICAgcHJpbWFyeTogc25hcHNob3Quc2VsZWN0aW9uLFxuICB9KSk7XG4gIGNvbnN0IGNvcHkgPSAoKSA9PiB7XG4gICAgY29uc3QgcmVzdWx0ID0gY3JlYXRlQWJvdXROYXJyYXRpdmVDdWVDbGlwYm9hcmRQYXlsb2FkKHtcbiAgICAgIGRvY3VtZW50OiBzbmFwc2hvdC5kb2N1bWVudCxcbiAgICAgIHBsYW46IHNuYXBzaG90LmNvbXBpbGVkUGxhbixcbiAgICAgIG1lbWJlcnMsXG4gICAgICBwcmltYXJ5OiBzbmFwc2hvdC5zZWxlY3Rpb24sXG4gICAgfSk7XG4gICAgY29uc3QgcGF5bG9hZCA9IHJlc3VsdD8ucGF5bG9hZCB8fCByZXN1bHQ7XG4gICAgY29uc3QgdmFsaWRhdGlvbiA9IHZhbGlkYXRlQWJvdXROYXJyYXRpdmVDdWVDbGlwYm9hcmRQYXlsb2FkKHBheWxvYWQpO1xuICAgIGlmIChyZXN1bHQ/LnZhbGlkID09PSBmYWxzZSB8fCB2YWxpZGF0aW9uPy52YWxpZCA9PT0gZmFsc2UpIHtcbiAgICAgIHNldE1lc3NhZ2UocmVzdWx0Py5yZWFzb24gfHwgdmFsaWRhdGlvbj8ucmVhc29uIHx8ICdUaGVzZSB0aXRsZXMgY2Fubm90IGJlIGNvcGllZC4nKTtcbiAgICAgIHJldHVybjtcbiAgICB9XG4gICAgc2V0Q2xpcGJvYXJkKHBheWxvYWQpO1xuICAgIHNldE1lc3NhZ2UoYCR7bWVtYmVycy5sZW5ndGh9IHRpdGxlJHttZW1iZXJzLmxlbmd0aCA9PT0gMSA/ICcnIDogJ3MnfSBjb3BpZWQgZm9yIHRoaXMgZWRpdG9yIHNlc3Npb24uYCk7XG4gIH07XG4gIGNvbnN0IHBhc3RlID0gKCkgPT4gY29tbWl0Q2FuZGlkYXRlKCdQYXN0ZSB0aXRsZSBDdWVzJywgcmVzb2x2ZUFib3V0TmFycmF0aXZlQ3VlR3JvdXBQYXN0ZSh7XG4gICAgZG9jdW1lbnQ6IHNuYXBzaG90LmRvY3VtZW50LFxuICAgIHBsYW46IHNuYXBzaG90LmNvbXBpbGVkUGxhbixcbiAgICBwYXlsb2FkOiBjbGlwYm9hcmQsXG4gICAgZGVzdGluYXRpb25TZWN0aW9uSWQ6IHNuYXBzaG90LnNlbGVjdGlvbi5zZWN0aW9uSWQsXG4gICAgcGxheWhlYWRXVTogc25hcHNob3QudHJhbnNwb3J0LnN0b3J5V1UsXG4gIH0pKTtcblxuICBjb25zdCBnaG9zdE1vdmVzID0gcHJldmlldz8udmFsaWQgPyBwcmV2aWV3Lm1vdmVzIDogW107XG4gIGNvbnN0IG1heFdVID0gTWF0aC5tYXgoMC4wMDEsIHNuYXBzaG90LmNvbXBpbGVkUGxhbj8ubWF4U3RvcnlXVSB8fCAxKTtcbiAgcmV0dXJuIChcbiAgICA8ZGV0YWlscyBjbGFzc05hbWU9XCJhYm91dC1lZGl0b3Itcmh5dGhtXCIgb3Blbj17bWVtYmVycy5sZW5ndGggPiAxfT5cbiAgICAgIDxzdW1tYXJ5PlJoeXRobSBhbmQgcmV1c2U8L3N1bW1hcnk+XG4gICAgICB7bWVtYmVycy5sZW5ndGggPiAxID8gKFxuICAgICAgICA8PlxuICAgICAgICAgIDxkaXYgY2xhc3NOYW1lPVwiYWJvdXQtZWRpdG9yLXJoeXRobS1hY3Rpb25zXCI+XG4gICAgICAgICAgICA8YnV0dG9uIHR5cGU9XCJidXR0b25cIiBvbkNsaWNrPXtkaXN0cmlidXRlfT5EaXN0cmlidXRlIGV2ZW5seTwvYnV0dG9uPlxuICAgICAgICAgICAgPGJ1dHRvbiB0eXBlPVwiYnV0dG9uXCIgb25DbGljaz17YWxpZ25QcmltYXJ5fT5BbGlnbiBwcmltYXJ5IHRvIHBsYXloZWFkPC9idXR0b24+XG4gICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgPGRpdiBjbGFzc05hbWU9XCJhYm91dC1lZGl0b3Itcmh5dGhtLWdhcFwiPlxuICAgICAgICAgICAgPFByb3BlcnR5IGxhYmVsPVwiRXhhY3QgZ2FwXCI+PGlucHV0IHR5cGU9XCJudW1iZXJcIiBtaW49XCIwXCIgbWF4PVwiOFwiIHN0ZXA9XCIwLjA1XCIgdmFsdWU9e2dhcFdVfSBvbkNoYW5nZT17KGV2ZW50KSA9PiBzZXRHYXBXVShNYXRoLm1heCgwLCBOdW1iZXIoZXZlbnQudGFyZ2V0LnZhbHVlKSB8fCAwKSl9IC8+PC9Qcm9wZXJ0eT5cbiAgICAgICAgICAgIDxQcm9wZXJ0eSBsYWJlbD1cIkFuY2hvclwiPjxzZWxlY3QgdmFsdWU9e2FuY2hvcn0gb25DaGFuZ2U9eyhldmVudCkgPT4gc2V0QW5jaG9yKGV2ZW50LnRhcmdldC52YWx1ZSl9PjxvcHRpb24gdmFsdWU9XCJwcmltYXJ5XCI+UHJpbWFyeTwvb3B0aW9uPjxvcHRpb24gdmFsdWU9XCJmaXJzdFwiPkZpcnN0PC9vcHRpb24+PG9wdGlvbiB2YWx1ZT1cImxhc3RcIj5MYXN0PC9vcHRpb24+PC9zZWxlY3Q+PC9Qcm9wZXJ0eT5cbiAgICAgICAgICAgIDxidXR0b24gdHlwZT1cImJ1dHRvblwiIG9uQ2xpY2s9e2V4YWN0R2FwfT5QcmV2aWV3IGV4YWN0IGdhcDwvYnV0dG9uPlxuICAgICAgICAgIDwvZGl2PlxuICAgICAgICA8Lz5cbiAgICAgICkgOiBudWxsfVxuICAgICAge2dob3N0TW92ZXMubGVuZ3RoID8gKFxuICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cImFib3V0LWVkaXRvci1yaHl0aG0tcHJldmlld1wiIGFyaWEtbGFiZWw9XCJQcm9wb3NlZCB0aXRsZSByaHl0aG1cIj5cbiAgICAgICAgICB7Z2hvc3RNb3Zlcy5tYXAoKG1vdmUpID0+IHtcbiAgICAgICAgICAgIGNvbnN0IGNvbXBpbGVkID0gc25hcHNob3QuY29tcGlsZWRQbGFuLnNlY3Rpb25zLmZpbmQoKGl0ZW0pID0+IGl0ZW0uaWQgPT09IG1vdmUuc2VjdGlvbklkKTtcbiAgICAgICAgICAgIGNvbnN0IHN0b3J5V1UgPSBOdW1iZXIoY29tcGlsZWQ/LnN0YXJ0V1UgfHwgMCkgKyAobW92ZS5ob2xkICogTnVtYmVyKGNvbXBpbGVkPy50cmF2ZWxXVSB8fCAwKSk7XG4gICAgICAgICAgICByZXR1cm4gPGkga2V5PXtgJHttb3ZlLnNlY3Rpb25JZH06JHttb3ZlLmN1ZUlkfWB9IHN0eWxlPXt7IGxlZnQ6IGAkeyhzdG9yeVdVIC8gbWF4V1UpICogMTAwfSVgIH19IHRpdGxlPXtgJHttb3ZlLmN1ZUlkfSDCtyAke2Zvcm1hdFdVKHN0b3J5V1UpfWB9IC8+O1xuICAgICAgICAgIH0pfVxuICAgICAgICA8L2Rpdj5cbiAgICAgICkgOiBudWxsfVxuICAgICAge21lc3NhZ2UgPyA8cCBjbGFzc05hbWU9e2BhYm91dC1lZGl0b3Itcmh5dGhtLW1lc3NhZ2Uke3ByZXZpZXcgJiYgIXByZXZpZXcudmFsaWQgPyAnIGlzLWVycm9yJyA6ICcnfWB9PnttZXNzYWdlfTwvcD4gOiBudWxsfVxuICAgICAge3ByZXZpZXc/LnZhbGlkICYmIHNuYXBzaG90LnRyeVN0YXRlID8gPGRpdiBjbGFzc05hbWU9XCJhYm91dC1lZGl0b3ItdHJ5XCI+PHNwYW4+UHJldmlld2luZyB7cHJldmlldy5sYWJlbH08L3NwYW4+PGJ1dHRvbiB0eXBlPVwiYnV0dG9uXCIgb25DbGljaz17Y2FuY2VsUHJldmlld30+Q2FuY2VsPC9idXR0b24+PGJ1dHRvbiB0eXBlPVwiYnV0dG9uXCIgY2xhc3NOYW1lPVwiaXMtcHJpbWFyeVwiIG9uQ2xpY2s9e2FwcGx5UHJldmlld30+QXBwbHk8L2J1dHRvbj48L2Rpdj4gOiBudWxsfVxuICAgICAgPGRpdiBjbGFzc05hbWU9XCJhYm91dC1lZGl0b3Itcmh5dGhtLWFjdGlvbnNcIj5cbiAgICAgICAgPGJ1dHRvbiB0eXBlPVwiYnV0dG9uXCIgb25DbGljaz17ZHVwbGljYXRlfT5EdXBsaWNhdGUge21lbWJlcnMubGVuZ3RoID4gMSA/ICdzZWxlY3Rpb24nIDogJ3RpdGxlJ308L2J1dHRvbj5cbiAgICAgICAgPGJ1dHRvbiB0eXBlPVwiYnV0dG9uXCIgb25DbGljaz17Y29weX0+Q29weTwvYnV0dG9uPlxuICAgICAgICA8YnV0dG9uIHR5cGU9XCJidXR0b25cIiBkaXNhYmxlZD17IWNsaXBib2FyZH0gb25DbGljaz17cGFzdGV9PlBhc3RlIGF0IHBsYXloZWFkPC9idXR0b24+XG4gICAgICA8L2Rpdj5cbiAgICA8L2RldGFpbHM+XG4gICk7XG59XG5cbmZ1bmN0aW9uIEN1ZUluc3BlY3Rvcih7IHN0b3JlLCBzbmFwc2hvdCwgc2VjdGlvbiwgY2xpcGJvYXJkLCBzZXRDbGlwYm9hcmQgfSkge1xuICBjb25zdCBzZWxlY3RlZE1lbWJlcnMgPSBnZXRBYm91dE5hcnJhdGl2ZVNlbGVjdGlvbk1lbWJlcnMoc25hcHNob3Quc2VsZWN0aW9uKTtcbiAgY29uc3Qgc2VjdGlvbkluZGV4ID0gZ2V0U2VjdGlvbkluZGV4KHNuYXBzaG90LmRvY3VtZW50LCBzZWN0aW9uLmlkKTtcbiAgY29uc3QgY3VlSW5kZXggPSBzZWN0aW9uLnRleHQuY3Vlcy5maW5kSW5kZXgoKGN1ZSkgPT4gY3VlLmlkID09PSBzbmFwc2hvdC5zZWxlY3Rpb24uY3VlSWQpO1xuICBjb25zdCBjdWUgPSBzZWN0aW9uLnRleHQuY3Vlc1tjdWVJbmRleF07XG4gIGlmICghY3VlKSByZXR1cm4gPFNlY3Rpb25JbnNwZWN0b3Igc3RvcmU9e3N0b3JlfSBzbmFwc2hvdD17c25hcHNob3R9IHNlY3Rpb249e3NlY3Rpb259IC8+O1xuICBjb25zdCB1cGRhdGUgPSAoZmllbGQsIHZhbHVlKSA9PiBzdG9yZS5jb21taXQoYEVkaXQgQ3VlICR7ZmllbGR9YCwgKGRyYWZ0KSA9PiB7XG4gICAgZHJhZnQuc2VjdGlvbnNbc2VjdGlvbkluZGV4XS50ZXh0LmN1ZXNbY3VlSW5kZXhdW2ZpZWxkXSA9IHZhbHVlO1xuICB9LCB7IGNvYWxlc2NlS2V5OiBgY3VlOiR7Y3VlLmlkfToke2ZpZWxkfWAsIHNlbGVjdGlvbjogc25hcHNob3Quc2VsZWN0aW9uIH0pO1xuICBjb25zdCByZW1vdmUgPSAoKSA9PiBzdG9yZS5jb21taXQoJ0RlbGV0ZSB0ZXh0IEN1ZScsIChkcmFmdCkgPT4ge1xuICAgIGRyYWZ0LnNlY3Rpb25zW3NlY3Rpb25JbmRleF0udGV4dC5jdWVzLnNwbGljZShjdWVJbmRleCwgMSk7XG4gIH0sIHsgc2VsZWN0aW9uOiB7IHR5cGU6ICdzZWN0aW9uJywgc2VjdGlvbklkOiBzZWN0aW9uLmlkIH0gfSk7XG4gIGNvbnN0IHRpbWluZ0JvdW5kcyA9IGdldEFib3V0TmFycmF0aXZlQ3VlVGltaW5nQm91bmRzKGN1ZSk7XG4gIGNvbnN0IG1vdGlvbkludGVydmFsID0gZ2V0QWJvdXROYXJyYXRpdmVDdWVNb3Rpb25JbnRlcnZhbChjdWUsIHNuYXBzaG90LmRvY3VtZW50Lmdsb2JhbHMudGV4dE1vdGlvbik7XG4gIGNvbnN0IG1vdmVtZW50ID0gZ2V0QWJvdXROYXJyYXRpdmVDdWVNb3ZlbWVudChjdWUpO1xuICBjb25zdCBtb3ZlQ3VlID0gKHBlcmNlbnQpID0+IHN0b3JlLmNvbW1pdCgnTW92ZSB0ZXh0IEN1ZScsIChkcmFmdCkgPT4ge1xuICAgIGNvbnN0IHRhcmdldCA9IGRyYWZ0LnNlY3Rpb25zW3NlY3Rpb25JbmRleF0udGV4dC5jdWVzW2N1ZUluZGV4XTtcbiAgICBPYmplY3QuYXNzaWduKHRhcmdldCwgbW92ZUFib3V0TmFycmF0aXZlQ3VlVGltaW5nKHRhcmdldCwgcGVyY2VudCAvIDEwMCkpO1xuICB9LCB7IGNvYWxlc2NlS2V5OiBgY3VlOiR7Y3VlLmlkfTp0aW1pbmdgLCBzZWxlY3Rpb246IHsgLi4uc25hcHNob3Quc2VsZWN0aW9uLCBrZXlQYXJ0OiAnZm9jdXMnIH0gfSk7XG4gIGNvbnN0IHVwZGF0ZU1vdmVtZW50ID0gKG1vZGUpID0+IHN0b3JlLmNvbW1pdCgnQ2hhbmdlIHRleHQgbW92ZW1lbnQnLCAoZHJhZnQpID0+IHtcbiAgICBjb25zdCB0YXJnZXQgPSBkcmFmdC5zZWN0aW9uc1tzZWN0aW9uSW5kZXhdLnRleHQuY3Vlc1tjdWVJbmRleF07XG4gICAgdGFyZ2V0Lm1vdGlvbiA9IHsgLi4udGFyZ2V0Lm1vdGlvbiwgbW9kZSB9O1xuICB9LCB7IHNlbGVjdGlvbjogc25hcHNob3Quc2VsZWN0aW9uIH0pO1xuICByZXR1cm4gKFxuICAgIDw+XG4gICAgICA8aGVhZGVyPjxzcGFuPlRleHQgQ3VlPC9zcGFuPjxzdHJvbmc+e2N1ZS5pZH08L3N0cm9uZz48L2hlYWRlcj5cbiAgICAgIHtzZWxlY3RlZE1lbWJlcnMubGVuZ3RoID4gMSA/IChcbiAgICAgICAgPGRpdiBjbGFzc05hbWU9XCJhYm91dC1lZGl0b3ItZ3JvdXAtc3VtbWFyeVwiPlxuICAgICAgICAgIDxzdHJvbmc+e3NlbGVjdGVkTWVtYmVycy5sZW5ndGh9IHRpdGxlcyBzZWxlY3RlZDwvc3Ryb25nPlxuICAgICAgICAgIDxvbD57c2VsZWN0ZWRNZW1iZXJzLm1hcCgobWVtYmVyKSA9PiB7XG4gICAgICAgICAgICBjb25zdCBtZW1iZXJTZWN0aW9uID0gc25hcHNob3QuZG9jdW1lbnQuc2VjdGlvbnMuZmluZCgoaXRlbSkgPT4gaXRlbS5pZCA9PT0gbWVtYmVyLnNlY3Rpb25JZCk7XG4gICAgICAgICAgICBjb25zdCBtZW1iZXJDdWUgPSBtZW1iZXJTZWN0aW9uPy50ZXh0Py5jdWVzPy5maW5kKChpdGVtKSA9PiBpdGVtLmlkID09PSBtZW1iZXIuY3VlSWQpO1xuICAgICAgICAgICAgcmV0dXJuIDxsaSBrZXk9e2Ake21lbWJlci5zZWN0aW9uSWR9OiR7bWVtYmVyLmN1ZUlkfWB9PjxzcGFuPnttZW1iZXJTZWN0aW9uPy5sYWJlbH08L3NwYW4+e21lbWJlckN1ZT8udGV4dH08L2xpPjtcbiAgICAgICAgICB9KX08L29sPlxuICAgICAgICAgIDxidXR0b24gdHlwZT1cImJ1dHRvblwiIG9uQ2xpY2s9eygpID0+IHN0b3JlLnNldFNlbGVjdGlvbih7IHR5cGU6ICdjdWUnLCBzZWN0aW9uSWQ6IHNlY3Rpb24uaWQsIGN1ZUlkOiBjdWUuaWQsIGtleVBhcnQ6ICdmb2N1cycgfSl9PktlZXAgcHJpbWFyeSBvbmx5PC9idXR0b24+XG4gICAgICAgIDwvZGl2PlxuICAgICAgKSA6IG51bGx9XG4gICAgICA8cCBjbGFzc05hbWU9XCJhYm91dC1lZGl0b3ItaGVscFwiPkRyYWcgdGhlIHBpbmsgdGltaW5nIG1hcmtlciBhbnl3aGVyZSBmcm9tIDDigJMxMDAlIG9mIGl0cyBTZWN0aW9uLiBUaGlzIG1vdmVzIHRoZSB0aXRsZSdzIGZvY3VzIHRpbWUgb25seS4gSXRzIHRyYXZlbCBkdXJhdGlvbiwgc3BlZWQsIGJsdXIsIGFuZCBpbi9vdXQgY2FkZW5jZSByZW1haW4gY29udHJvbGxlZCBnbG9iYWxseSB1bmRlciBTcGF0aWFsIHRpdGxlcy48L3A+XG4gICAgICA8UHJvcGVydHkgbGFiZWw9XCJTdGF0ZW1lbnRcIj48dGV4dGFyZWEgcm93cz1cIjdcIiB2YWx1ZT17Y3VlLnRleHR9IG9uQ2hhbmdlPXsoZXZlbnQpID0+IHVwZGF0ZSgndGV4dCcsIGV2ZW50LnRhcmdldC52YWx1ZSl9IC8+PC9Qcm9wZXJ0eT5cbiAgICAgIDxQcm9wZXJ0eSBsYWJlbD1cIk1vdmVtZW50XCI+PHNlbGVjdCB2YWx1ZT17bW92ZW1lbnR9IG9uQ2hhbmdlPXsoZXZlbnQpID0+IHVwZGF0ZU1vdmVtZW50KGV2ZW50LnRhcmdldC52YWx1ZSl9PjxvcHRpb24gdmFsdWU9XCJzcGF0aWFsXCI+U3BhdGlhbCB0cmF2ZWw8L29wdGlvbj48b3B0aW9uIHZhbHVlPVwidmVydGljYWxcIj5WZXJ0aWNhbCBzY3JvbGw8L29wdGlvbj48L3NlbGVjdD48L1Byb3BlcnR5PlxuICAgICAgPE51bWJlclByb3BlcnR5XG4gICAgICAgIGxhYmVsPVwiUG9zaXRpb25cIlxuICAgICAgICB2YWx1ZT17TnVtYmVyKChjdWUuaG9sZCAqIDEwMCkudG9GaXhlZCgxKSl9XG4gICAgICAgIG1pbj17TnVtYmVyKCh0aW1pbmdCb3VuZHMubWluICogMTAwKS50b0ZpeGVkKDEpKX1cbiAgICAgICAgbWF4PXtOdW1iZXIoKHRpbWluZ0JvdW5kcy5tYXggKiAxMDApLnRvRml4ZWQoMSkpfVxuICAgICAgICBzdGVwPXswLjV9XG4gICAgICAgIHVuaXQ9XCIlXCJcbiAgICAgICAgZGlzYWJsZWQ9e3RpbWluZ0JvdW5kcy5taW4gPT09IHRpbWluZ0JvdW5kcy5tYXh9XG4gICAgICAgIG9uQ2hhbmdlPXttb3ZlQ3VlfVxuICAgICAgLz5cbiAgICAgIHttb3ZlbWVudCA9PT0gJ3NwYXRpYWwnID8gKFxuICAgICAgICA8PlxuICAgICAgICAgIDxQcm9wZXJ0eSBsYWJlbD1cIkF1dG8gdHJhdmVsXCI+PG91dHB1dCBjbGFzc05hbWU9XCJhYm91dC1lZGl0b3ItcmVhZG91dFwiPntNYXRoLnJvdW5kKG1vdGlvbkludGVydmFsLnN0YXJ0ICogMTAwKX3igJN7TWF0aC5yb3VuZChtb3Rpb25JbnRlcnZhbC5lbmQgKiAxMDApfSU8L291dHB1dD48L1Byb3BlcnR5PlxuICAgICAgICAgIDxQcm9wZXJ0eSBsYWJlbD1cIk1vdGlvbiBwcmVzZXRcIj48c2VsZWN0IHZhbHVlPXtjdWUucHJlc2V0fSBvbkNoYW5nZT17KGV2ZW50KSA9PiB1cGRhdGUoJ3ByZXNldCcsIGV2ZW50LnRhcmdldC52YWx1ZSl9PjxvcHRpb24gdmFsdWU9XCJ0cmF2ZWxsaW5nLXRpdGxlLXYxXCI+VHJhdmVsbGluZyB0aXRsZTwvb3B0aW9uPjxvcHRpb24gdmFsdWU9XCJvcGVuZXItdjFcIj5PcGVuZXI8L29wdGlvbj48b3B0aW9uIHZhbHVlPVwiZmluYWxlLXYxXCI+RmluYWxlPC9vcHRpb24+PC9zZWxlY3Q+PC9Qcm9wZXJ0eT5cbiAgICAgICAgPC8+XG4gICAgICApIDogPFByb3BlcnR5IGxhYmVsPVwiUmV2ZWFsXCI+PG91dHB1dCBjbGFzc05hbWU9XCJhYm91dC1lZGl0b3ItcmVhZG91dFwiPkVkaXRvcmlhbCB2ZXJ0aWNhbCBzY3JvbGw8L291dHB1dD48L1Byb3BlcnR5Pn1cbiAgICAgIDxDdWVSaHl0aG1BbmRSZXVzZSBzdG9yZT17c3RvcmV9IHNuYXBzaG90PXtzbmFwc2hvdH0gY2xpcGJvYXJkPXtjbGlwYm9hcmR9IHNldENsaXBib2FyZD17c2V0Q2xpcGJvYXJkfSAvPlxuICAgICAgPGJ1dHRvbiB0eXBlPVwiYnV0dG9uXCIgY2xhc3NOYW1lPVwiYWJvdXQtZWRpdG9yLWRhbmdlclwiIGRpc2FibGVkPXtzZWN0aW9uLnR5cGUgPT09ICdmaW5hbGUnfSBvbkNsaWNrPXtyZW1vdmV9PkRlbGV0ZSBDdWU8L2J1dHRvbj5cbiAgICA8Lz5cbiAgKTtcbn1cblxuZnVuY3Rpb24gRGlzY2lwbGluZVJldmVhbEluc3BlY3Rvcih7IHN0b3JlLCBzbmFwc2hvdCwgc2VjdGlvbiB9KSB7XG4gIGNvbnN0IHNlY3Rpb25JbmRleCA9IGdldFNlY3Rpb25JbmRleChzbmFwc2hvdC5kb2N1bWVudCwgc2VjdGlvbi5pZCk7XG4gIGNvbnN0IHJldmVhbCA9IHNlY3Rpb24udGV4dC5kaXNjaXBsaW5lUmV2ZWFsO1xuICBpZiAoIXJldmVhbCkgcmV0dXJuIDxTZWN0aW9uSW5zcGVjdG9yIHN0b3JlPXtzdG9yZX0gc25hcHNob3Q9e3NuYXBzaG90fSBzZWN0aW9uPXtzZWN0aW9ufSAvPjtcbiAgY29uc3QgdXBkYXRlID0gKGxhYmVsLCBtdXRhdGUsIGNvYWxlc2NlS2V5ID0gbnVsbCkgPT4gc3RvcmUuY29tbWl0KGxhYmVsLCAoZHJhZnQpID0+IHtcbiAgICBtdXRhdGUoZHJhZnQuc2VjdGlvbnNbc2VjdGlvbkluZGV4XS50ZXh0LmRpc2NpcGxpbmVSZXZlYWwpO1xuICB9LCB7IGNvYWxlc2NlS2V5LCBzZWxlY3Rpb246IHNuYXBzaG90LnNlbGVjdGlvbiB9KTtcbiAgY29uc3Qgb2NjdXBpZWQgPSAoKHJldmVhbC5pdGVtcy5sZW5ndGggLSAxKSAqIHJldmVhbC5zdGFnZ2VyKSArIHJldmVhbC5sYWJlbER1cmF0aW9uICsgcmV2ZWFsLmhvbGQ7XG4gIGNvbnN0IGxpbWl0c0ZvciA9IChjb250cm9sKSA9PiB7XG4gICAgaWYgKGNvbnRyb2wuaWQgPT09ICdzdGFydCcpIHJldHVybiB7IG1pbjogY29udHJvbC5taW4sIG1heDogTWF0aC5tYXgoY29udHJvbC5taW4sIHJldmVhbC5lbmQgLSBvY2N1cGllZCkgfTtcbiAgICBpZiAoY29udHJvbC5pZCA9PT0gJ2VuZCcpIHJldHVybiB7IG1pbjogTWF0aC5taW4oY29udHJvbC5tYXgsIHJldmVhbC5zdGFydCArIG9jY3VwaWVkKSwgbWF4OiBjb250cm9sLm1heCB9O1xuICAgIGlmIChjb250cm9sLmlkID09PSAnc3RhZ2dlcicpIHJldHVybiB7XG4gICAgICBtaW46IGNvbnRyb2wubWluLFxuICAgICAgbWF4OiBNYXRoLm1heChjb250cm9sLm1pbiwgKHJldmVhbC5lbmQgLSByZXZlYWwuc3RhcnQgLSByZXZlYWwubGFiZWxEdXJhdGlvbiAtIHJldmVhbC5ob2xkKSAvIE1hdGgubWF4KDEsIHJldmVhbC5pdGVtcy5sZW5ndGggLSAxKSksXG4gICAgfTtcbiAgICBpZiAoY29udHJvbC5pZCA9PT0gJ2xhYmVsRHVyYXRpb24nKSByZXR1cm4ge1xuICAgICAgbWluOiBjb250cm9sLm1pbixcbiAgICAgIG1heDogTWF0aC5tYXgoY29udHJvbC5taW4sIHJldmVhbC5lbmQgLSByZXZlYWwuc3RhcnQgLSAoKHJldmVhbC5pdGVtcy5sZW5ndGggLSAxKSAqIHJldmVhbC5zdGFnZ2VyKSAtIHJldmVhbC5ob2xkKSxcbiAgICB9O1xuICAgIGlmIChjb250cm9sLmlkID09PSAnaG9sZCcpIHJldHVybiB7XG4gICAgICBtaW46IGNvbnRyb2wubWluLFxuICAgICAgbWF4OiBNYXRoLm1heChjb250cm9sLm1pbiwgcmV2ZWFsLmVuZCAtIHJldmVhbC5zdGFydCAtICgocmV2ZWFsLml0ZW1zLmxlbmd0aCAtIDEpICogcmV2ZWFsLnN0YWdnZXIpIC0gcmV2ZWFsLmxhYmVsRHVyYXRpb24pLFxuICAgIH07XG4gICAgcmV0dXJuIHsgbWluOiBjb250cm9sLm1pbiwgbWF4OiBjb250cm9sLm1heCB9O1xuICB9O1xuICByZXR1cm4gKFxuICAgIDw+XG4gICAgICA8aGVhZGVyPjxzcGFuPlRleHQgc2VxdWVuY2U8L3NwYW4+PHN0cm9uZz5EaXNjaXBsaW5lIHJldmVhbDwvc3Ryb25nPjwvaGVhZGVyPlxuICAgICAgPHAgY2xhc3NOYW1lPVwiYWJvdXQtZWRpdG9yLWhlbHBcIj5PbmUgY2xpcCBjb250cm9scyB0aGUgY29tcGxldGUgc2l4LXBvaW50IHNlcXVlbmNlLiBEcmFnIGl0cyBzdHJpcGVkIGJsb2NrIGluIHRoZSBUZXh0IGxhbmUgdG8gbW92ZSBldmVyeSByZXZlYWwgdG9nZXRoZXIuPC9wPlxuICAgICAgPGRldGFpbHMgb3Blbj48c3VtbWFyeT5SZXZlYWwgY2hvcmVvZ3JhcGh5PC9zdW1tYXJ5PlxuICAgICAgICB7QUJPVVRfTkFSUkFUSVZFX0RJU0NJUExJTkVfUkVWRUFMX0NPTlRST0xTLm1hcCgoY29udHJvbCkgPT4ge1xuICAgICAgICAgIGNvbnN0IGxpbWl0cyA9IGxpbWl0c0Zvcihjb250cm9sKTtcbiAgICAgICAgICByZXR1cm4gKFxuICAgICAgICAgICAgPE51bWJlclByb3BlcnR5XG4gICAgICAgICAgICAgIGtleT17Y29udHJvbC5pZH1cbiAgICAgICAgICAgICAgbGFiZWw9e2NvbnRyb2wubGFiZWx9XG4gICAgICAgICAgICAgIHZhbHVlPXtyZXZlYWxbY29udHJvbC5pZF19XG4gICAgICAgICAgICAgIG1pbj17bGltaXRzLm1pbn1cbiAgICAgICAgICAgICAgbWF4PXtsaW1pdHMubWF4fVxuICAgICAgICAgICAgICBzdGVwPXtjb250cm9sLnN0ZXB9XG4gICAgICAgICAgICAgIHVuaXQ9e2NvbnRyb2wudW5pdH1cbiAgICAgICAgICAgICAgb25DaGFuZ2U9eyh2YWx1ZSkgPT4gdXBkYXRlKGBDaGFuZ2UgJHtjb250cm9sLmxhYmVsfWAsIChkcmFmdCkgPT4geyBkcmFmdFtjb250cm9sLmlkXSA9IHZhbHVlOyB9LCBgZGlzY2lwbGluZS1yZXZlYWw6JHtzZWN0aW9uLmlkfToke2NvbnRyb2wuaWR9YCl9XG4gICAgICAgICAgICAvPlxuICAgICAgICAgICk7XG4gICAgICAgIH0pfVxuICAgICAgPC9kZXRhaWxzPlxuICAgICAgPGRldGFpbHMgb3Blbj48c3VtbWFyeT5SZXZlYWwgb3JkZXIgYW5kIGxhYmVsczwvc3VtbWFyeT5cbiAgICAgICAgPGRpdiBjbGFzc05hbWU9XCJhYm91dC1lZGl0b3ItZGlzY2lwbGluZS1pdGVtc1wiPlxuICAgICAgICAgIHtyZXZlYWwuaXRlbXMubWFwKChpdGVtLCBpdGVtSW5kZXgpID0+IChcbiAgICAgICAgICAgIDxkaXYgY2xhc3NOYW1lPVwiYWJvdXQtZWRpdG9yLWRpc2NpcGxpbmUtaXRlbVwiIGtleT17aXRlbS5ncm91cH0+XG4gICAgICAgICAgICAgIDxjb2RlPntTdHJpbmcoaXRlbUluZGV4ICsgMSkucGFkU3RhcnQoMiwgJzAnKX08L2NvZGU+XG4gICAgICAgICAgICAgIDxpbnB1dCB2YWx1ZT17aXRlbS5sYWJlbH0gYXJpYS1sYWJlbD17YERpc2NpcGxpbmUgJHtpdGVtSW5kZXggKyAxfSBsYWJlbGB9IG9uQ2hhbmdlPXsoZXZlbnQpID0+IHVwZGF0ZSgnRWRpdCBkaXNjaXBsaW5lIGxhYmVsJywgKGRyYWZ0KSA9PiB7IGRyYWZ0Lml0ZW1zW2l0ZW1JbmRleF0ubGFiZWwgPSBldmVudC50YXJnZXQudmFsdWU7IH0sIGBkaXNjaXBsaW5lLXJldmVhbDoke3NlY3Rpb24uaWR9Oml0ZW06JHtpdGVtLmdyb3VwfTpsYWJlbGApfSAvPlxuICAgICAgICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cImFib3V0LWVkaXRvci1kaXNjaXBsaW5lLXBhbGV0dGVcIiB0aXRsZT17YCR7aXRlbS5sYWJlbH0gdXNlcyB0aGUgSG9tZSBzaW11bGF0aW9uICR7RElTQ0lQTElORV9CQUxMX1RPS0VOX0JZX0dST1VQW2l0ZW0uZ3JvdXBdfWB9PlxuICAgICAgICAgICAgICAgIDxpIHN0eWxlPXt7IGJhY2tncm91bmQ6IGB2YXIoJHtESVNDSVBMSU5FX0JBTExfVE9LRU5fQllfR1JPVVBbaXRlbS5ncm91cF19KWAgfX0gLz5cbiAgICAgICAgICAgICAgICA8Y29kZT57RElTQ0lQTElORV9CQUxMX1RPS0VOX0JZX0dST1VQW2l0ZW0uZ3JvdXBdfTwvY29kZT5cbiAgICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgICAgIDxzcGFuPlxuICAgICAgICAgICAgICAgIDxidXR0b24gdHlwZT1cImJ1dHRvblwiIGRpc2FibGVkPXtpdGVtSW5kZXggPT09IDB9IGFyaWEtbGFiZWw9e2BSZXZlYWwgJHtpdGVtLmxhYmVsfSBlYXJsaWVyYH0gb25DbGljaz17KCkgPT4gdXBkYXRlKCdSZW9yZGVyIGRpc2NpcGxpbmUgcmV2ZWFsJywgKGRyYWZ0KSA9PiB7IGNvbnN0IFttb3ZlZF0gPSBkcmFmdC5pdGVtcy5zcGxpY2UoaXRlbUluZGV4LCAxKTsgZHJhZnQuaXRlbXMuc3BsaWNlKGl0ZW1JbmRleCAtIDEsIDAsIG1vdmVkKTsgfSl9PuKGkTwvYnV0dG9uPlxuICAgICAgICAgICAgICAgIDxidXR0b24gdHlwZT1cImJ1dHRvblwiIGRpc2FibGVkPXtpdGVtSW5kZXggPT09IHJldmVhbC5pdGVtcy5sZW5ndGggLSAxfSBhcmlhLWxhYmVsPXtgUmV2ZWFsICR7aXRlbS5sYWJlbH0gbGF0ZXJgfSBvbkNsaWNrPXsoKSA9PiB1cGRhdGUoJ1Jlb3JkZXIgZGlzY2lwbGluZSByZXZlYWwnLCAoZHJhZnQpID0+IHsgY29uc3QgW21vdmVkXSA9IGRyYWZ0Lml0ZW1zLnNwbGljZShpdGVtSW5kZXgsIDEpOyBkcmFmdC5pdGVtcy5zcGxpY2UoaXRlbUluZGV4ICsgMSwgMCwgbW92ZWQpOyB9KX0+4oaTPC9idXR0b24+XG4gICAgICAgICAgICAgIDwvc3Bhbj5cbiAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICkpfVxuICAgICAgICA8L2Rpdj5cbiAgICAgIDwvZGV0YWlscz5cbiAgICAgIDxwIGNsYXNzTmFtZT1cImFib3V0LWVkaXRvci1oZWxwXCI+VGhlIHNpeCBwb2ludHMgcGVyc2lzdCBhZnRlciB0aGUgbGFiZWxzIGxlYXZlLiBBbiBlZGl0b3JpYWwgYmxvY2sgbWFya2VkIOKAnFJlY29ubmVjdCBwb2ludCBncmlk4oCdIHJlc3RvcmVzIHRoZSBzdXJyb3VuZGluZyBncmlkIGFzIHRoYXQgcGFyYWdyYXBoIGVudGVycy48L3A+XG4gICAgPC8+XG4gICk7XG59XG5cbmZ1bmN0aW9uIENhbWVyYUluc3BlY3Rvcih7IHN0b3JlLCBzbmFwc2hvdCwgc2VjdGlvbiB9KSB7XG4gIGNvbnN0IHNlY3Rpb25JbmRleCA9IGdldFNlY3Rpb25JbmRleChzbmFwc2hvdC5kb2N1bWVudCwgc2VjdGlvbi5pZCk7XG4gIGNvbnN0IGtleUluZGV4ID0gc25hcHNob3Quc2VsZWN0aW9uLmtleUluZGV4O1xuICBjb25zdCBzZWxlY3RlZEtleSA9IHNlY3Rpb24uY2FtZXJhLmtleXNba2V5SW5kZXhdO1xuICBjb25zdCBrZXkgPSBzZWxlY3RlZEtleSAmJiBzZWxlY3RlZEtleS5hdCA+IDAgJiYgc2VsZWN0ZWRLZXkuYXQgPCAxID8gc2VsZWN0ZWRLZXkgOiBudWxsO1xuICBjb25zdCBsb2NhbCA9IGdldExvY2FsUHJvZ3Jlc3Moc25hcHNob3QuY29tcGlsZWRQbGFuLCBzZWN0aW9uLCBzbmFwc2hvdC50cmFuc3BvcnQuc3RvcnlXVSk7XG4gIGNvbnN0IHRhcmdldEF0ID0gTWF0aC5taW4oMC45OTUsIE1hdGgubWF4KDAuMDA1LCBzbmFwQWJvdXROYXJyYXRpdmVUaW1lbGluZVZhbHVlKGxvY2FsKSkpO1xuICBjb25zdCBhcHBseVByZXNldCA9IChwcmVzZXQpID0+IHN0b3JlLmNvbW1pdChgQXBwbHkgJHtwcmVzZXR9IGNhbWVyYSByZWNpcGVgLCAoZHJhZnQpID0+IHtcbiAgICBjb25zdCByZWNpcGVzID0ge1xuICAgICAgUHVzaDogW1xuICAgICAgICB7IGF0OiAwLCBvZmZzZXQ6IFswLCAwLCAwXSwgbG9va0F0T2Zmc2V0OiBbMCwgMCwgLTFdLCBmb3Y6IDQ4LCByb2xsOiAwLCBlYXNpbmc6ICdzbW9vdGhzdGVwJyB9LFxuICAgICAgICB7IGF0OiAxLCBvZmZzZXQ6IFswLCAwLCAtMS4yXSwgbG9va0F0T2Zmc2V0OiBbMCwgMCwgLTFdLCBmb3Y6IDQ1LCByb2xsOiAwLCBlYXNpbmc6ICdzbW9vdGhzdGVwJyB9LFxuICAgICAgXSxcbiAgICAgIEdsaWRlOiBbXG4gICAgICAgIHsgYXQ6IDAsIG9mZnNldDogWy0wLjgsIDAsIDBdLCBsb29rQXRPZmZzZXQ6IFswLjQsIDAsIC0xXSwgZm92OiA0OCwgcm9sbDogMCwgZWFzaW5nOiAnc21vb3Roc3RlcCcgfSxcbiAgICAgICAgeyBhdDogMSwgb2Zmc2V0OiBbMC44LCAwLCAwXSwgbG9va0F0T2Zmc2V0OiBbLTAuNCwgMCwgLTFdLCBmb3Y6IDQ4LCByb2xsOiAwLCBlYXNpbmc6ICdzbW9vdGhzdGVwJyB9LFxuICAgICAgXSxcbiAgICAgIE9yYml0OiBbXG4gICAgICAgIHsgYXQ6IDAsIG9mZnNldDogWy0wLjcsIDAsIDBdLCBsb29rQXRPZmZzZXQ6IFswLjcsIDAsIC0xXSwgZm92OiA0OCwgcm9sbDogLTAuMDgsIGVhc2luZzogJ3Ntb290aHN0ZXAnIH0sXG4gICAgICAgIHsgYXQ6IDAuNSwgb2Zmc2V0OiBbMC43LCAwLjI1LCAwXSwgbG9va0F0T2Zmc2V0OiBbLTAuNywgLTAuMSwgLTFdLCBmb3Y6IDQ4LCByb2xsOiAwLjA4LCBlYXNpbmc6ICdzbW9vdGhzdGVwJyB9LFxuICAgICAgICB7IGF0OiAxLCBvZmZzZXQ6IFswLCAwLCAwXSwgbG9va0F0T2Zmc2V0OiBbMCwgMCwgLTFdLCBmb3Y6IDQ4LCByb2xsOiAwLCBlYXNpbmc6ICdzbW9vdGhzdGVwJyB9LFxuICAgICAgXSxcbiAgICAgIFJldmVhbDogW1xuICAgICAgICB7IGF0OiAwLCBvZmZzZXQ6IFswLCAtMC40NSwgMC41XSwgbG9va0F0T2Zmc2V0OiBbMCwgMC4zLCAtMV0sIGZvdjogNTYsIHJvbGw6IDAsIGVhc2luZzogJ3Ntb290aHN0ZXAnIH0sXG4gICAgICAgIHsgYXQ6IDEsIG9mZnNldDogWzAsIDAsIDBdLCBsb29rQXRPZmZzZXQ6IFswLCAwLCAtMV0sIGZvdjogNDYsIHJvbGw6IDAsIGVhc2luZzogJ3Ntb290aHN0ZXAnIH0sXG4gICAgICBdLFxuICAgICAgUmVzb2x2ZTogW1xuICAgICAgICB7IGF0OiAwLCBvZmZzZXQ6IFswLjMsIDAuMiwgMF0sIGxvb2tBdE9mZnNldDogWy0wLjMsIC0wLjIsIC0xXSwgZm92OiA1Miwgcm9sbDogMC4xNCwgZWFzaW5nOiAnc21vb3Roc3RlcCcgfSxcbiAgICAgICAgeyBhdDogMSwgb2Zmc2V0OiBbMCwgMCwgMF0sIGxvb2tBdE9mZnNldDogWzAsIDAsIC0xXSwgZm92OiA0OCwgcm9sbDogMCwgZWFzaW5nOiAnc21vb3Roc3RlcCcgfSxcbiAgICAgIF0sXG4gICAgfTtcbiAgICBkcmFmdC5zZWN0aW9uc1tzZWN0aW9uSW5kZXhdLmNhbWVyYS5rZXlzID0gcmVjaXBlc1twcmVzZXRdO1xuICAgIGJyaWRnZUNhbWVyYVNlY3Rpb24oZHJhZnQsIHNlY3Rpb25JbmRleCk7XG4gIH0sIHsgc2VsZWN0aW9uOiB7IHR5cGU6ICdzZWN0aW9uJywgc2VjdGlvbklkOiBzZWN0aW9uLmlkIH0gfSk7XG4gIGNvbnN0IGV4aXN0aW5nS2V5QXRQbGF5aGVhZCA9IHNlY3Rpb24uY2FtZXJhLmtleXMuZmluZEluZGV4KChpdGVtKSA9PiAoXG4gICAgaXRlbS5hdCA+IDAgJiYgaXRlbS5hdCA8IDEgJiYgTWF0aC5hYnMoaXRlbS5hdCAtIHRhcmdldEF0KSA8IDAuMDAyNVxuICApKTtcbiAgY29uc3Qgc2V0S2V5ID0gKCkgPT4ge1xuICAgIGlmIChleGlzdGluZ0tleUF0UGxheWhlYWQgPj0gMCkge1xuICAgICAgc3RvcmUuc2V0U2VsZWN0aW9uKHsgdHlwZTogJ2NhbWVyYS1rZXknLCBzZWN0aW9uSWQ6IHNlY3Rpb24uaWQsIGtleUluZGV4OiBleGlzdGluZ0tleUF0UGxheWhlYWQgfSk7XG4gICAgICByZXR1cm47XG4gICAgfVxuICAgIGNvbnN0IGluc2VydGlvbkluZGV4ID0gc2VjdGlvbi5jYW1lcmEua2V5cy5maW5kSW5kZXgoKGl0ZW0pID0+IGl0ZW0uYXQgPiB0YXJnZXRBdCk7XG4gICAgY29uc3Qgc2VsZWN0ZWRLZXlJbmRleCA9IGluc2VydGlvbkluZGV4IDwgMCA/IHNlY3Rpb24uY2FtZXJhLmtleXMubGVuZ3RoIDogaW5zZXJ0aW9uSW5kZXg7XG4gICAgY29uc3Qgc2FtcGxlZCA9IHNhbXBsZUFib3V0TmFycmF0aXZlUGxhbihzbmFwc2hvdC5jb21waWxlZFBsYW4sIHNuYXBzaG90LnRyYW5zcG9ydC5zdG9yeVdVKTtcbiAgICBjb25zdCBiYXNlWiA9IHNuYXBzaG90LmRvY3VtZW50Lmdsb2JhbHMuY2FtZXJhLnN0YXJ0WiAtIChzbmFwc2hvdC50cmFuc3BvcnQuc3RvcnlXVSAqIHNhbXBsZWQuY2FtZXJhLmNhZGVuY2UpO1xuICAgIGNvbnN0IG5ld0tleSA9IHtcbiAgICAgIGF0OiB0YXJnZXRBdCxcbiAgICAgIG9mZnNldDogW3NhbXBsZWQuY2FtZXJhLnBvc2l0aW9uWzBdLCBzYW1wbGVkLmNhbWVyYS5wb3NpdGlvblsxXSwgc2FtcGxlZC5jYW1lcmEucG9zaXRpb25bMl0gLSBiYXNlWl0sXG4gICAgICBsb29rQXRPZmZzZXQ6IHNhbXBsZWQuY2FtZXJhLnRhcmdldC5tYXAoKHZhbHVlLCBheGlzKSA9PiB2YWx1ZSAtIHNhbXBsZWQuY2FtZXJhLnBvc2l0aW9uW2F4aXNdKSxcbiAgICAgIGZvdjogc2FtcGxlZC5jYW1lcmEuZm92LFxuICAgICAgcm9sbDogc2FtcGxlZC5jYW1lcmEucm9sbCxcbiAgICAgIGVhc2luZzogJ3Ntb290aHN0ZXAnLFxuICAgIH07XG4gICAgc3RvcmUuY29tbWl0KCdTZXQgY2FtZXJhIGtleScsIChkcmFmdCkgPT4ge1xuICAgICAgZHJhZnQuc2VjdGlvbnNbc2VjdGlvbkluZGV4XS5jYW1lcmEua2V5cy5wdXNoKG5ld0tleSk7XG4gICAgICBkcmFmdC5zZWN0aW9uc1tzZWN0aW9uSW5kZXhdLmNhbWVyYS5rZXlzLnNvcnQoKGEsIGIpID0+IGEuYXQgLSBiLmF0KTtcbiAgICB9LCB7IHNlbGVjdGlvbjogeyB0eXBlOiAnY2FtZXJhLWtleScsIHNlY3Rpb25JZDogc2VjdGlvbi5pZCwga2V5SW5kZXg6IHNlbGVjdGVkS2V5SW5kZXggfSB9KTtcbiAgfTtcbiAgY29uc3QgcmVjaXBlcyA9IDxkaXYgY2xhc3NOYW1lPVwiYWJvdXQtZWRpdG9yLWNhbWVyYS1yZWNpcGVzXCI+e1snUHVzaCcsICdHbGlkZScsICdPcmJpdCcsICdSZXZlYWwnLCAnUmVzb2x2ZSddLm1hcCgobmFtZSkgPT4gPGJ1dHRvbiB0eXBlPVwiYnV0dG9uXCIga2V5PXtuYW1lfSBvbkNsaWNrPXsoKSA9PiBhcHBseVByZXNldChuYW1lKX0+e25hbWV9PC9idXR0b24+KX08L2Rpdj47XG4gIGlmICgha2V5KSB7XG4gICAgcmV0dXJuIDw+PGhlYWRlcj48c3Bhbj5DYW1lcmEgdHJhY2s8L3NwYW4+PHN0cm9uZz5FZGl0aW5nIFNlY3Rpb24gYmFzZTwvc3Ryb25nPjwvaGVhZGVyPjxwIGNsYXNzTmFtZT1cImFib3V0LWVkaXRvci1oZWxwXCI+VGhlIGRvbGx5IGFuZCBTZWN0aW9uIGpvaW5zIGFyZSBjb250aW51b3VzIGF1dG9tYXRpY2FsbHkuIEFkZCB2aXNpYmxlIGtleXMgb25seSB3aGVyZSB0aGUgZnJhbWluZywgYWltLCByb2xsLCBvciBsZW5zIHNob3VsZCBjaGFuZ2UuPC9wPntyZWNpcGVzfTxidXR0b24gdHlwZT1cImJ1dHRvblwiIGNsYXNzTmFtZT1cImFib3V0LWVkaXRvci13aWRlLWFjdGlvblwiIG9uQ2xpY2s9e3NldEtleX0+U2V0IGNhbWVyYSBrZXkgYXQge2Zvcm1hdENhbWVyYVBlcmNlbnQodGFyZ2V0QXQpfTwvYnV0dG9uPjwvPjtcbiAgfVxuICBjb25zdCB1cGRhdGUgPSAoZmllbGQsIHZhbHVlKSA9PiBzdG9yZS5jb21taXQoYEVkaXQgY2FtZXJhICR7ZmllbGR9YCwgKGRyYWZ0KSA9PiB7XG4gICAgZHJhZnQuc2VjdGlvbnNbc2VjdGlvbkluZGV4XS5jYW1lcmEua2V5c1trZXlJbmRleF1bZmllbGRdID0gQXJyYXkuaXNBcnJheSh2YWx1ZSkgPyBbLi4udmFsdWVdIDogdmFsdWU7XG4gICAgaWYgKENBTUVSQV9QT1NFX0ZJRUxEUy5oYXMoZmllbGQpKSBsaW5rQ2FtZXJhQm91bmRhcnkoZHJhZnQsIHNlY3Rpb25JbmRleCwga2V5SW5kZXgpO1xuICB9LCB7IGNvYWxlc2NlS2V5OiBgY2FtZXJhOiR7c2VjdGlvbi5pZH06JHtrZXlJbmRleH06JHtmaWVsZH1gLCBzZWxlY3Rpb246IHNuYXBzaG90LnNlbGVjdGlvbiB9KTtcbiAgY29uc3QgdXBkYXRlVmVjdG9yID0gKGZpZWxkLCBheGlzLCB2YWx1ZSkgPT4ge1xuICAgIGNvbnN0IG5leHQgPSBbLi4ua2V5W2ZpZWxkXV07XG4gICAgbmV4dFtheGlzXSA9IHZhbHVlO1xuICAgIHVwZGF0ZShmaWVsZCwgbmV4dCk7XG4gIH07XG4gIGNvbnN0IHRpbWluZ0JvdW5kcyA9IGdldEFib3V0TmFycmF0aXZlQ2FtZXJhS2V5VGltaW5nQm91bmRzKHNlY3Rpb24uY2FtZXJhLmtleXMsIGtleUluZGV4KTtcbiAgY29uc3QgZXh0ZW50RmllbGQgPSBzbmFwc2hvdC5wcmV2aWV3UHJvZmlsZSA9PT0gJ21vYmlsZScgPyAnbW9iaWxlRXh0ZW50V1UnIDogJ2V4dGVudFdVJztcbiAgY29uc3QgZXh0ZW50TGFiZWwgPSBzbmFwc2hvdC5wcmV2aWV3UHJvZmlsZSA9PT0gJ21vYmlsZScgPyAnTW9iaWxlIGxlbmd0aCcgOiAnU2VjdGlvbiBsZW5ndGgnO1xuICBjb25zdCB1cGRhdGVFeHRlbnQgPSAodmFsdWUpID0+IHN0b3JlLmNvbW1pdCgnQ2hhbmdlIFNlY3Rpb24gZXh0ZW50JywgKGRyYWZ0KSA9PiB7XG4gICAgZHJhZnQuc2VjdGlvbnNbc2VjdGlvbkluZGV4XVtleHRlbnRGaWVsZF0gPSB2YWx1ZTtcbiAgfSwgeyBjb2FsZXNjZUtleTogYHNlY3Rpb246JHtzZWN0aW9uLmlkfToke2V4dGVudEZpZWxkfWAsIHNlbGVjdGlvbjogc25hcHNob3Quc2VsZWN0aW9uIH0pO1xuICByZXR1cm4gKFxuICAgIDw+XG4gICAgICA8aGVhZGVyPjxzcGFuPkNhbWVyYSBrZXk8L3NwYW4+PHN0cm9uZz57Zm9ybWF0Q2FtZXJhUGVyY2VudChrZXkuYXQpfSB0aHJvdWdoIHtzZWN0aW9uLmxhYmVsfTwvc3Ryb25nPjwvaGVhZGVyPlxuICAgICAge3JlY2lwZXN9XG4gICAgICA8TnVtYmVyUHJvcGVydHlcbiAgICAgICAgbGFiZWw9XCJQb3NpdGlvblwiXG4gICAgICAgIHZhbHVlPXtOdW1iZXIoKGtleS5hdCAqIDEwMCkudG9GaXhlZCgxKSl9XG4gICAgICAgIG1pbj17TnVtYmVyKCh0aW1pbmdCb3VuZHMubWluICogMTAwKS50b0ZpeGVkKDEpKX1cbiAgICAgICAgbWF4PXtOdW1iZXIoKHRpbWluZ0JvdW5kcy5tYXggKiAxMDApLnRvRml4ZWQoMSkpfVxuICAgICAgICBzdGVwPXswLjV9XG4gICAgICAgIHVuaXQ9XCIlXCJcbiAgICAgICAgb25DaGFuZ2U9eyh2YWx1ZSkgPT4gdXBkYXRlKCdhdCcsIE1hdGgubWluKHRpbWluZ0JvdW5kcy5tYXgsIE1hdGgubWF4KHRpbWluZ0JvdW5kcy5taW4sIHNuYXBBYm91dE5hcnJhdGl2ZVRpbWVsaW5lVmFsdWUodmFsdWUgLyAxMDApKSkpfVxuICAgICAgLz5cbiAgICAgIDxOdW1iZXJQcm9wZXJ0eSBsYWJlbD17ZXh0ZW50TGFiZWx9IHZhbHVlPXtzZWN0aW9uW2V4dGVudEZpZWxkXX0gbWluPXsxfSBtYXg9ezh9IHN0ZXA9ezAuMDV9IHVuaXQ9XCJXVVwiIG9uQ2hhbmdlPXt1cGRhdGVFeHRlbnR9IC8+XG4gICAgICB7WydYIG9mZnNldCcsICdZIG9mZnNldCcsICdGb3J3YXJkIG9mZnNldCddLm1hcCgobGFiZWwsIGF4aXMpID0+IDxOdW1iZXJQcm9wZXJ0eSBrZXk9e2xhYmVsfSBsYWJlbD17bGFiZWx9IHZhbHVlPXtrZXkub2Zmc2V0W2F4aXNdfSBtaW49ey04fSBtYXg9ezh9IHN0ZXA9ezAuMDJ9IHVuaXQ9XCJXVVwiIG9uQ2hhbmdlPXsodmFsdWUpID0+IHVwZGF0ZVZlY3Rvcignb2Zmc2V0JywgYXhpcywgdmFsdWUpfSAvPil9XG4gICAgICB7WydBaW0gWCcsICdBaW0gWScsICdBaW0gZGVwdGgnXS5tYXAoKGxhYmVsLCBheGlzKSA9PiA8TnVtYmVyUHJvcGVydHkga2V5PXtsYWJlbH0gbGFiZWw9e2xhYmVsfSB2YWx1ZT17a2V5Lmxvb2tBdE9mZnNldFtheGlzXX0gbWluPXstOH0gbWF4PXs4fSBzdGVwPXswLjAyfSB1bml0PVwiV1VcIiBvbkNoYW5nZT17KHZhbHVlKSA9PiB1cGRhdGVWZWN0b3IoJ2xvb2tBdE9mZnNldCcsIGF4aXMsIHZhbHVlKX0gLz4pfVxuICAgICAgPE51bWJlclByb3BlcnR5IGxhYmVsPVwiRmllbGQgb2Ygdmlld1wiIHZhbHVlPXtrZXkuZm92fSBtaW49ezIwfSBtYXg9ezkwfSBzdGVwPXsxfSB1bml0PVwiwrBcIiBvbkNoYW5nZT17KHZhbHVlKSA9PiB1cGRhdGUoJ2ZvdicsIHZhbHVlKX0gLz5cbiAgICAgIDxOdW1iZXJQcm9wZXJ0eSBsYWJlbD1cIlJvbGxcIiB2YWx1ZT17a2V5LnJvbGx9IG1pbj17LTEuMn0gbWF4PXsxLjJ9IHN0ZXA9ezAuMDF9IHVuaXQ9XCJyYWRcIiBvbkNoYW5nZT17KHZhbHVlKSA9PiB1cGRhdGUoJ3JvbGwnLCB2YWx1ZSl9IC8+XG4gICAgICA8UHJvcGVydHkgbGFiZWw9XCJFYXNpbmdcIj48c2VsZWN0IHZhbHVlPXtrZXkuZWFzaW5nfSBvbkNoYW5nZT17KGV2ZW50KSA9PiB1cGRhdGUoJ2Vhc2luZycsIGV2ZW50LnRhcmdldC52YWx1ZSl9PjxvcHRpb24gdmFsdWU9XCJzbW9vdGhzdGVwXCI+U21vb3Roc3RlcDwvb3B0aW9uPjxvcHRpb24gdmFsdWU9XCJlYXNlLWluLW91dFwiPkVhc2UgaW4gb3V0PC9vcHRpb24+PC9zZWxlY3Q+PC9Qcm9wZXJ0eT5cbiAgICAgIDxidXR0b24gdHlwZT1cImJ1dHRvblwiIGNsYXNzTmFtZT1cImFib3V0LWVkaXRvci13aWRlLWFjdGlvblwiIGRpc2FibGVkPXtleGlzdGluZ0tleUF0UGxheWhlYWQgPj0gMH0gb25DbGljaz17c2V0S2V5fT57ZXhpc3RpbmdLZXlBdFBsYXloZWFkID49IDAgPyBgQ2FtZXJhIGtleSBhbHJlYWR5IGF0ICR7Zm9ybWF0Q2FtZXJhUGVyY2VudCh0YXJnZXRBdCl9YCA6IGBTZXQgYW5vdGhlciBrZXkgYXQgJHtmb3JtYXRDYW1lcmFQZXJjZW50KHRhcmdldEF0KX1gfTwvYnV0dG9uPlxuICAgICAgPGJ1dHRvbiB0eXBlPVwiYnV0dG9uXCIgY2xhc3NOYW1lPVwiYWJvdXQtZWRpdG9yLWRhbmdlclwiIG9uQ2xpY2s9eygpID0+IHN0b3JlLmNvbW1pdCgnRGVsZXRlIGNhbWVyYSBrZXknLCAoZHJhZnQpID0+IHsgZHJhZnQuc2VjdGlvbnNbc2VjdGlvbkluZGV4XS5jYW1lcmEua2V5cy5zcGxpY2Uoa2V5SW5kZXgsIDEpOyB9LCB7IHNlbGVjdGlvbjogeyB0eXBlOiAnc2VjdGlvbicsIHNlY3Rpb25JZDogc2VjdGlvbi5pZCB9IH0pfT5EZWxldGUga2V5PC9idXR0b24+XG4gICAgPC8+XG4gICk7XG59XG5cbmNvbnN0IENPUlJFU1BPTkRFTkNFX0xBQkVMUyA9IE9iamVjdC5mcmVlemUoe1xuICAnaW5kZXgtdjEnOiAnSW5kZXggb3JkZXInLFxuICAnc3RhYmxlLXNlZWQnOiAnU3RhYmxlIHNlZWQnLFxuICAnc3BhdGlhbC1uZWFyZXN0LXYxJzogJ0xvY2FsIHRyYXZlbCAoYXBwcm94LiknLFxuICAnZ3JvdXAtYXdhcmUnOiAnR3JvdXAgYXdhcmUnLFxufSk7XG5cbmZ1bmN0aW9uIFdvcmxkSW5zcGVjdG9yKHsgc3RvcmUsIHNuYXBzaG90LCBzZWN0aW9uLCBydW50aW1lTWV0cmljcyB9KSB7XG4gIGNvbnN0IHNlY3Rpb25JbmRleCA9IGdldFNlY3Rpb25JbmRleChzbmFwc2hvdC5kb2N1bWVudCwgc2VjdGlvbi5pZCk7XG4gIGlmIChzZWN0aW9uLndvcmxkLm1vZGUgIT09ICdzZXQnKSB7XG4gICAgcmV0dXJuIDw+PGhlYWRlcj48c3Bhbj5Xb3JsZCB0cmFjazwvc3Bhbj48c3Ryb25nPkluaGVyaXRlZCBXb3JsZDwvc3Ryb25nPjwvaGVhZGVyPjxwIGNsYXNzTmFtZT1cImFib3V0LWVkaXRvci1oZWxwXCI+VGhpcyBTZWN0aW9uIGtlZXBzIHRoZSBwcmV2aW91cyBXb3JsZC4gQ2hvb3NlIOKAnENyZWF0ZSBXb3JsZCBjbGlw4oCdIG9ubHkgd2hlbiB0aGUgc2hhcGUgc2hvdWxkIGNoYW5nZSBoZXJlLjwvcD48YnV0dG9uIHR5cGU9XCJidXR0b25cIiBjbGFzc05hbWU9XCJhYm91dC1lZGl0b3Itd2lkZS1hY3Rpb25cIiBvbkNsaWNrPXsoKSA9PiBzdG9yZS5jb21taXQoJ0NyZWF0ZSBXb3JsZCBjbGlwJywgKGRyYWZ0KSA9PiB7XG4gICAgICBkcmFmdC5zZWN0aW9uc1tzZWN0aW9uSW5kZXhdLndvcmxkID0gY2xvbmVBYm91dE5hcnJhdGl2ZURvY3VtZW50KGRyYWZ0LnNlY3Rpb25zLnNsaWNlKDAsIHNlY3Rpb25JbmRleCkucmV2ZXJzZSgpLmZpbmQoKGl0ZW0pID0+IGl0ZW0ud29ybGQubW9kZSA9PT0gJ3NldCcpPy53b3JsZCB8fCBkcmFmdC5zZWN0aW9uc1swXS53b3JsZCk7XG4gICAgfSl9PkNyZWF0ZSBXb3JsZCBjbGlwPC9idXR0b24+PC8+O1xuICB9XG4gIGNvbnN0IHdvcmxkID0gc2VjdGlvbi53b3JsZDtcbiAgY29uc3Qgc2hhcGUgPSBBQk9VVF9OQVJSQVRJVkVfU0hBUEVfREVGSU5JVElPTlNbd29ybGQuc2hhcGVJZF07XG4gIGNvbnN0IHRyYW5zaXRpb25MaW1pdCA9IGdldEFib3V0TmFycmF0aXZlV29ybGRUcmFuc2l0aW9uTGltaXQoc25hcHNob3QuY29tcGlsZWRQbGFuLCBzZWN0aW9uSW5kZXgpO1xuICBjb25zdCB0cmFuc2l0aW9uTWF4ID0gTWF0aC5tYXgodHJhbnNpdGlvbkxpbWl0LCB3b3JsZC50cmFuc2l0aW9uSW4uZW5kLCAxKTtcbiAgY29uc3QgdHJhbnNpdGlvbkVuYWJsZWQgPSB3b3JsZC50cmFuc2l0aW9uSW4udHlwZSAhPT0gJ2N1dCc7XG4gIGNvbnN0IGNvcnJlc3BvbmRlbmNlRW5hYmxlZCA9IFsnbW9ycGgnLCAnZGlzc29sdmUtbW9ycGgnXS5pbmNsdWRlcyh3b3JsZC50cmFuc2l0aW9uSW4udHlwZSk7XG4gIGNvbnN0IHByZXZpb3VzV29ybGRTZWN0aW9uID0gc25hcHNob3QuZG9jdW1lbnQuc2VjdGlvbnNcbiAgICAuc2xpY2UoMCwgc2VjdGlvbkluZGV4KVxuICAgIC5yZXZlcnNlKClcbiAgICAuZmluZCgoaXRlbSkgPT4gaXRlbS53b3JsZC5tb2RlID09PSAnc2V0Jyk7XG4gIGNvbnN0IHNvdXJjZVNoYXBlID0gQUJPVVRfTkFSUkFUSVZFX1NIQVBFX0RFRklOSVRJT05TW3ByZXZpb3VzV29ybGRTZWN0aW9uPy53b3JsZC5zaGFwZUlkIHx8IHdvcmxkLnNoYXBlSWRdO1xuICBjb25zdCBwcmVwYXJlZCA9IHJ1bnRpbWVNZXRyaWNzPy5wcmVwYXJlZFdvcmxkSWRzPy5pbmNsdWRlcyhzZWN0aW9uLmlkKTtcbiAgY29uc3QgY29ycmVzcG9uZGVuY2VTdGF0dXMgPSBydW50aW1lTWV0cmljcz8uY29ycmVzcG9uZGVuY2VTZXF1ZW5jZVN0YXRlID09PSAnZmFpbGVkJ1xuICAgID8gJ0ZhaWxlZCdcbiAgICA6IHJ1bnRpbWVNZXRyaWNzPy5jb3JyZXNwb25kZW5jZVNlcXVlbmNlU3RhdGUgPT09ICdsb2FkaW5nJ1xuICAgICAgPyAnUHJlcGFyaW5nJ1xuICAgICAgOiBwcmVwYXJlZFxuICAgICAgICA/IHJ1bnRpbWVNZXRyaWNzPy5jb3JyZXNwb25kZW5jZUZhbGxiYWNrICYmIHJ1bnRpbWVNZXRyaWNzPy5jb3JyZXNwb25kZW5jZVRvV29ybGRJZCA9PT0gc2VjdGlvbi5pZFxuICAgICAgICAgID8gJ0Jhc2VsaW5lIGZhbGxiYWNrJ1xuICAgICAgICAgIDogJ1JlYWR5J1xuICAgICAgICA6ICdQcmVwYXJpbmcnO1xuICBjb25zdCB1cGRhdGUgPSAobGFiZWwsIG11dGF0ZSwgY29hbGVzY2VLZXkgPSBudWxsKSA9PiBzdG9yZS5jb21taXQobGFiZWwsIChkcmFmdCkgPT4gbXV0YXRlKGRyYWZ0LnNlY3Rpb25zW3NlY3Rpb25JbmRleF0ud29ybGQpLCB7IGNvYWxlc2NlS2V5LCBzZWxlY3Rpb246IHNuYXBzaG90LnNlbGVjdGlvbiB9KTtcbiAgY29uc3QgdHJ5U2hhcGUgPSAoc2hhcGVJZCkgPT4gc3RvcmUuYmVnaW5UcnkoYFJlcGxhY2UgU2hhcGUgd2l0aCAke0FCT1VUX05BUlJBVElWRV9TSEFQRV9ERUZJTklUSU9OU1tzaGFwZUlkXS5sYWJlbH1gLCAoZHJhZnQpID0+IHtcbiAgICBjb25zdCB0YXJnZXQgPSBkcmFmdC5zZWN0aW9uc1tzZWN0aW9uSW5kZXhdLndvcmxkO1xuICAgIHRhcmdldC5zaGFwZUlkID0gc2hhcGVJZDtcbiAgICB0YXJnZXQuc2hhcGVQYXJhbWV0ZXJzID0gT2JqZWN0LmZyb21FbnRyaWVzKEFCT1VUX05BUlJBVElWRV9TSEFQRV9ERUZJTklUSU9OU1tzaGFwZUlkXS5wYXJhbWV0ZXJzLm1hcCgoY29udHJvbCkgPT4gW2NvbnRyb2wuaWQsIGNvbnRyb2wuaWQgPT09ICdkZW5zaXR5JyA/IDEgOiAoY29udHJvbC5taW4gKyBjb250cm9sLm1heCkgLyAyXSkpO1xuICB9KTtcbiAgcmV0dXJuIChcbiAgICA8PlxuICAgICAgPGhlYWRlcj48c3Bhbj5Xb3JsZCBjbGlwPC9zcGFuPjxzdHJvbmc+e3NoYXBlPy5sYWJlbCB8fCB3b3JsZC5zaGFwZUlkfTwvc3Ryb25nPjwvaGVhZGVyPlxuICAgICAgPGRpdiBjbGFzc05hbWU9XCJhYm91dC1lZGl0b3Itc2hhcGUtY2F0YWxvZ1wiPlxuICAgICAgICB7T2JqZWN0LnZhbHVlcyhBQk9VVF9OQVJSQVRJVkVfU0hBUEVfREVGSU5JVElPTlMpLm1hcCgoaXRlbSkgPT4gKFxuICAgICAgICAgIDxidXR0b24gdHlwZT1cImJ1dHRvblwiIGtleT17aXRlbS5pZH0gZGlzYWJsZWQ9e3NlY3Rpb24ubG9ja2VkfSBjbGFzc05hbWU9e2l0ZW0uaWQgPT09IHdvcmxkLnNoYXBlSWQgPyAnaXMtc2VsZWN0ZWQnIDogJyd9IG9uQ2xpY2s9eygpID0+IHRyeVNoYXBlKGl0ZW0uaWQpfT5cbiAgICAgICAgICAgIDxpIC8+PHNwYW4+PHN0cm9uZz57aXRlbS5sYWJlbH08L3N0cm9uZz48c21hbGw+Q29zdCB7aXRlbS5jb3N0fSDCtyBQb2ludCBmaWVsZDwvc21hbGw+PC9zcGFuPlxuICAgICAgICAgIDwvYnV0dG9uPlxuICAgICAgICApKX1cbiAgICAgIDwvZGl2PlxuICAgICAge3NuYXBzaG90LnRyeVN0YXRlID8gPGRpdiBjbGFzc05hbWU9XCJhYm91dC1lZGl0b3ItdHJ5XCI+PHNwYW4+VHJ5aW5nIHtzbmFwc2hvdC50cnlTdGF0ZS5sYWJlbH08L3NwYW4+PGJ1dHRvbiB0eXBlPVwiYnV0dG9uXCIgb25DbGljaz17KCkgPT4gc3RvcmUuY2FuY2VsVHJ5KCl9PkNhbmNlbDwvYnV0dG9uPjxidXR0b24gdHlwZT1cImJ1dHRvblwiIGNsYXNzTmFtZT1cImlzLXByaW1hcnlcIiBvbkNsaWNrPXsoKSA9PiBzdG9yZS5hcHBseVRyeSgpfT5BcHBseTwvYnV0dG9uPjwvZGl2PiA6IG51bGx9XG4gICAgICA8ZGV0YWlscyBvcGVuPjxzdW1tYXJ5PlNoYXBlIHBhcmFtZXRlcnM8L3N1bW1hcnk+XG4gICAgICAgIHsoc2hhcGU/LnBhcmFtZXRlcnMgfHwgW10pLm1hcCgoY29udHJvbCkgPT4gPE51bWJlclByb3BlcnR5IGtleT17Y29udHJvbC5pZH0gbGFiZWw9e2NvbnRyb2wubGFiZWx9IHZhbHVlPXt3b3JsZC5zaGFwZVBhcmFtZXRlcnNbY29udHJvbC5pZF19IG1pbj17Y29udHJvbC5taW59IG1heD17Y29udHJvbC5tYXh9IHN0ZXA9e2NvbnRyb2wuc3RlcH0gdW5pdD17Y29udHJvbC51bml0fSBvbkNoYW5nZT17KHZhbHVlKSA9PiB1cGRhdGUoYENoYW5nZSAke2NvbnRyb2wubGFiZWx9YCwgKGRyYWZ0KSA9PiB7IGRyYWZ0LnNoYXBlUGFyYW1ldGVyc1tjb250cm9sLmlkXSA9IHZhbHVlOyB9LCBgd29ybGQ6JHtzZWN0aW9uLmlkfToke2NvbnRyb2wuaWR9YCl9IC8+KX1cbiAgICAgICAgPGRpdiBjbGFzc05hbWU9XCJhYm91dC1lZGl0b3ItaW5saW5lLWFjdGlvbnNcIj48YnV0dG9uIHR5cGU9XCJidXR0b25cIiBvbkNsaWNrPXsoKSA9PiB1cGRhdGUoJ1Jlc2VlZCBTaGFwZScsIChkcmFmdCkgPT4geyBkcmFmdC5zZWVkID0gTWF0aC5mbG9vcihNYXRoLnJhbmRvbSgpICogMHhmZmZmZmZmZik7IH0pfT5SZXNlZWQ8L2J1dHRvbj48Y29kZT57d29ybGQuc2VlZH08L2NvZGU+PC9kaXY+XG4gICAgICA8L2RldGFpbHM+XG4gICAgICA8ZGV0YWlscyBvcGVuPjxzdW1tYXJ5PlBsYWNlbWVudDwvc3VtbWFyeT5cbiAgICAgICAgPE51bWJlclByb3BlcnR5IGxhYmVsPVwiRGlzdGFuY2UgYXQgZW50cnlcIiB2YWx1ZT17d29ybGQuZW50cnlEaXN0YW5jZVdVfSBtaW49ezAuMn0gbWF4PXsxNn0gc3RlcD17MC4wNX0gdW5pdD1cIldVXCIgb25DaGFuZ2U9eyh2YWx1ZSkgPT4gdXBkYXRlKCdNb3ZlIFdvcmxkJywgKGRyYWZ0KSA9PiB7IGRyYWZ0LmVudHJ5RGlzdGFuY2VXVSA9IHZhbHVlOyB9LCBgd29ybGQ6JHtzZWN0aW9uLmlkfTpkaXN0YW5jZWApfSAvPlxuICAgICAgICA8TnVtYmVyUHJvcGVydHkgbGFiZWw9XCJTY2FsZVwiIHZhbHVlPXt3b3JsZC50cmFuc2Zvcm0uc2NhbGV9IG1pbj17MC4xfSBtYXg9ezN9IHN0ZXA9ezAuMDF9IG9uQ2hhbmdlPXsodmFsdWUpID0+IHVwZGF0ZSgnU2NhbGUgV29ybGQnLCAoZHJhZnQpID0+IHsgZHJhZnQudHJhbnNmb3JtLnNjYWxlID0gdmFsdWU7IH0sIGB3b3JsZDoke3NlY3Rpb24uaWR9OnNjYWxlYCl9IC8+XG4gICAgICA8L2RldGFpbHM+XG4gICAgICA8ZGV0YWlscyBvcGVuPjxzdW1tYXJ5PlRyYW5zaXRpb24gaW48L3N1bW1hcnk+XG4gICAgICAgIHt0cmFuc2l0aW9uRW5hYmxlZCA/IDw+XG4gICAgICAgICAgPHAgY2xhc3NOYW1lPVwiYWJvdXQtZWRpdG9yLWhlbHBcIj5UaW1pbmcgaXMgcmVsYXRpdmUgdG8gdGhpcyBTZWN0aW9uOiAxIGlzIGl0cyBlbmQ7IHZhbHVlcyBhYm92ZSAxIGNvbnRpbnVlIGFjcm9zcyBpbmhlcml0ZWQgV29ybGQgU2VjdGlvbnMuIFRoZSBuZXh0IFdvcmxkIGJlZ2lucyBhdCB7dHJhbnNpdGlvbkxpbWl0LnRvRml4ZWQoMyl9LjwvcD5cbiAgICAgICAgICA8TnVtYmVyUHJvcGVydHkgbGFiZWw9XCJTdGFydFwiIHZhbHVlPXt3b3JsZC50cmFuc2l0aW9uSW4uc3RhcnR9IG1pbj17MH0gbWF4PXt0cmFuc2l0aW9uTWF4fSBzdGVwPXswLjAwNX0gdW5pdD1cIsOXIHNlY3Rpb25cIiBvbkNoYW5nZT17KHZhbHVlKSA9PiB1cGRhdGUoJ0NoYW5nZSB0cmFuc2l0aW9uIHN0YXJ0JywgKGRyYWZ0KSA9PiB7IGRyYWZ0LnRyYW5zaXRpb25Jbi5zdGFydCA9IE1hdGgubWluKHZhbHVlLCBkcmFmdC50cmFuc2l0aW9uSW4uZW5kKTsgfSl9IC8+XG4gICAgICAgICAgPE51bWJlclByb3BlcnR5IGxhYmVsPVwiRW5kXCIgdmFsdWU9e3dvcmxkLnRyYW5zaXRpb25Jbi5lbmR9IG1pbj17MH0gbWF4PXt0cmFuc2l0aW9uTWF4fSBzdGVwPXswLjAwNX0gdW5pdD1cIsOXIHNlY3Rpb25cIiBvbkNoYW5nZT17KHZhbHVlKSA9PiB1cGRhdGUoJ0NoYW5nZSB0cmFuc2l0aW9uIGVuZCcsIChkcmFmdCkgPT4geyBkcmFmdC50cmFuc2l0aW9uSW4uZW5kID0gTWF0aC5tYXgodmFsdWUsIGRyYWZ0LnRyYW5zaXRpb25Jbi5zdGFydCk7IH0pfSAvPlxuICAgICAgICAgIDxQcm9wZXJ0eSBsYWJlbD1cIlR5cGVcIj48c2VsZWN0IHZhbHVlPXt3b3JsZC50cmFuc2l0aW9uSW4udHlwZX0gb25DaGFuZ2U9eyhldmVudCkgPT4gdXBkYXRlKCdDaGFuZ2UgdHJhbnNpdGlvbiB0eXBlJywgKGRyYWZ0KSA9PiB7IGRyYWZ0LnRyYW5zaXRpb25Jbi50eXBlID0gZXZlbnQudGFyZ2V0LnZhbHVlOyB9KX0+PG9wdGlvbiB2YWx1ZT1cIm1vcnBoXCI+TW9ycGg8L29wdGlvbj48b3B0aW9uIHZhbHVlPVwiZGlzc29sdmUtbW9ycGhcIj5EaXNzb2x2ZSBtb3JwaDwvb3B0aW9uPjxvcHRpb24gdmFsdWU9XCJjcm9zc2ZhZGVcIj5Dcm9zc2ZhZGU8L29wdGlvbj48b3B0aW9uIHZhbHVlPVwiaG9sZFwiPkhvbGQ8L29wdGlvbj48L3NlbGVjdD48L1Byb3BlcnR5PlxuICAgICAgICAgIDxQcm9wZXJ0eSBsYWJlbD1cIkVhc2luZ1wiPjxzZWxlY3QgdmFsdWU9e3dvcmxkLnRyYW5zaXRpb25Jbi5lYXNpbmd9IG9uQ2hhbmdlPXsoZXZlbnQpID0+IHVwZGF0ZSgnQ2hhbmdlIHRyYW5zaXRpb24gZWFzaW5nJywgKGRyYWZ0KSA9PiB7IGRyYWZ0LnRyYW5zaXRpb25Jbi5lYXNpbmcgPSBldmVudC50YXJnZXQudmFsdWU7IH0pfT48b3B0aW9uIHZhbHVlPVwibGluZWFyXCI+TGluZWFyPC9vcHRpb24+PG9wdGlvbiB2YWx1ZT1cInNtb290aHN0ZXBcIj5TbW9vdGhzdGVwPC9vcHRpb24+PG9wdGlvbiB2YWx1ZT1cImVhc2UtaW5cIj5FYXNlIGluPC9vcHRpb24+PG9wdGlvbiB2YWx1ZT1cImVhc2Utb3V0XCI+RWFzZSBvdXQ8L29wdGlvbj48b3B0aW9uIHZhbHVlPVwiZWFzZS1pbi1vdXRcIj5FYXNlIGluIG91dDwvb3B0aW9uPjxvcHRpb24gdmFsdWU9XCJob2xkXCI+SG9sZDwvb3B0aW9uPjwvc2VsZWN0PjwvUHJvcGVydHk+XG4gICAgICAgICAgPHAgY2xhc3NOYW1lPVwiYWJvdXQtZWRpdG9yLWhlbHBcIj5NYXBzIHtzb3VyY2VTaGFwZT8ubGFiZWwgfHwgJ3ByZXZpb3VzIFNoYXBlJ30g4oaSIHtzaGFwZT8ubGFiZWwgfHwgd29ybGQuc2hhcGVJZH0uPC9wPlxuICAgICAgICAgIDxQcm9wZXJ0eSBsYWJlbD1cIkNvcnJlc3BvbmRlbmNlXCI+PHNlbGVjdCBhcmlhLWxhYmVsPVwiQ29ycmVzcG9uZGVuY2VcIiB2YWx1ZT17d29ybGQudHJhbnNpdGlvbkluLmNvcnJlc3BvbmRlbmNlfSBkaXNhYmxlZD17IWNvcnJlc3BvbmRlbmNlRW5hYmxlZH0gdGl0bGU9e2NvcnJlc3BvbmRlbmNlRW5hYmxlZCA/ICdDaG9vc2UgaG93IHNvdXJjZSBwb2ludHMgYXJlIGFzc2lnbmVkIHRvIHRhcmdldCBwb2ludHMuJyA6ICdDb3JyZXNwb25kZW5jZSBhcHBsaWVzIHRvIE1vcnBoIGFuZCBEaXNzb2x2ZSBtb3JwaCB0cmFuc2l0aW9ucy4nfSBvbkNoYW5nZT17KGV2ZW50KSA9PiB1cGRhdGUoJ0NoYW5nZSBjb3JyZXNwb25kZW5jZScsIChkcmFmdCkgPT4geyBkcmFmdC50cmFuc2l0aW9uSW4uY29ycmVzcG9uZGVuY2UgPSBldmVudC50YXJnZXQudmFsdWU7IH0pfT57QUJPVVRfTkFSUkFUSVZFX0NPUlJFU1BPTkRFTkNFX01PREVTLm1hcCgobW9kZSkgPT4gPG9wdGlvbiB2YWx1ZT17bW9kZX0ga2V5PXttb2RlfT57Q09SUkVTUE9OREVOQ0VfTEFCRUxTW21vZGVdIHx8IG1vZGV9PC9vcHRpb24+KX08L3NlbGVjdD48L1Byb3BlcnR5PlxuICAgICAgICAgIDxwIGNsYXNzTmFtZT1cImFib3V0LWVkaXRvci1oZWxwXCIgcm9sZT1cInN0YXR1c1wiIGFyaWEtbGl2ZT1cInBvbGl0ZVwiPkNvcnJlc3BvbmRlbmNlOiB7Y29ycmVzcG9uZGVuY2VTdGF0dXN9e3ByZXBhcmVkICYmIHJ1bnRpbWVNZXRyaWNzPy5jb3JyZXNwb25kZW5jZVRvV29ybGRJZCA9PT0gc2VjdGlvbi5pZCAmJiBOdW1iZXIuaXNGaW5pdGUocnVudGltZU1ldHJpY3M/LmNvcnJlc3BvbmRlbmNlSW1wcm92ZW1lbnQpID8gYCDCtyAke01hdGgucm91bmQocnVudGltZU1ldHJpY3MuY29ycmVzcG9uZGVuY2VJbXByb3ZlbWVudCAqIDEwMCl9JSBSTVMgaW1wcm92ZW1lbnRgIDogJyd9LjwvcD5cbiAgICAgICAgICA8YnV0dG9uIHR5cGU9XCJidXR0b25cIiBjbGFzc05hbWU9XCJhYm91dC1lZGl0b3ItZGFuZ2VyXCIgb25DbGljaz17KCkgPT4gc3RvcmUuY29tbWl0KCdSZW1vdmUgV29ybGQgdHJhbnNpdGlvbicsIChkcmFmdCkgPT4ge1xuICAgICAgICAgICAgY29uc3QgdHJhbnNpdGlvbiA9IGRyYWZ0LnNlY3Rpb25zW3NlY3Rpb25JbmRleF0ud29ybGQudHJhbnNpdGlvbkluO1xuICAgICAgICAgICAgdHJhbnNpdGlvbi5zdGFydCA9IDA7XG4gICAgICAgICAgICB0cmFuc2l0aW9uLmVuZCA9IDA7XG4gICAgICAgICAgICB0cmFuc2l0aW9uLnR5cGUgPSAnY3V0JztcbiAgICAgICAgICB9LCB7IHNlbGVjdGlvbjogeyB0eXBlOiAnd29ybGQnLCBzZWN0aW9uSWQ6IHNlY3Rpb24uaWQgfSB9KX0+UmVtb3ZlIHRyYW5zaXRpb24ga2V5ZnJhbWVzPC9idXR0b24+XG4gICAgICAgIDwvPiA6IDw+XG4gICAgICAgICAgPHAgY2xhc3NOYW1lPVwiYWJvdXQtZWRpdG9yLWhlbHBcIj5UaGlzIFdvcmxkIGN1dHMgaW4gYXQgdGhlIFNlY3Rpb24gYm91bmRhcnkgYW5kIGhhcyBubyB0cmFuc2l0aW9uIGtleWZyYW1lcy48L3A+XG4gICAgICAgICAgPGJ1dHRvbiB0eXBlPVwiYnV0dG9uXCIgY2xhc3NOYW1lPVwiYWJvdXQtZWRpdG9yLXdpZGUtYWN0aW9uXCIgb25DbGljaz17KCkgPT4gc3RvcmUuY29tbWl0KCdBZGQgV29ybGQgdHJhbnNpdGlvbicsIChkcmFmdCkgPT4ge1xuICAgICAgICAgICAgY29uc3QgdHJhbnNpdGlvbiA9IGRyYWZ0LnNlY3Rpb25zW3NlY3Rpb25JbmRleF0ud29ybGQudHJhbnNpdGlvbkluO1xuICAgICAgICAgICAgdHJhbnNpdGlvbi5zdGFydCA9IE1hdGgubWluKDAuMDgsIHRyYW5zaXRpb25MaW1pdCk7XG4gICAgICAgICAgICB0cmFuc2l0aW9uLmVuZCA9IE1hdGgubWluKDAuNjgsIHRyYW5zaXRpb25MaW1pdCk7XG4gICAgICAgICAgICB0cmFuc2l0aW9uLnR5cGUgPSAnbW9ycGgnO1xuICAgICAgICAgIH0sIHsgc2VsZWN0aW9uOiB7IHR5cGU6ICd3b3JsZCcsIHNlY3Rpb25JZDogc2VjdGlvbi5pZCB9IH0pfT5BZGQgdHJhbnNpdGlvbiBrZXlmcmFtZXM8L2J1dHRvbj5cbiAgICAgICAgPC8+fVxuICAgICAgPC9kZXRhaWxzPlxuICAgICAgPGRldGFpbHMgb3Blbj48c3VtbWFyeT5Nb2RpZmllciBzdGFjazwvc3VtbWFyeT5cbiAgICAgICAge3dvcmxkLm1vZGlmaWVycy5tYXAoKGl0ZW0sIG1vZGlmaWVySW5kZXgpID0+IHtcbiAgICAgICAgICBjb25zdCBkZWZpbml0aW9uID0gQUJPVVRfTkFSUkFUSVZFX01PRElGSUVSX0RFRklOSVRJT05TW2l0ZW0uaWRdO1xuICAgICAgICAgIGNvbnN0IG1vdmVNb2RpZmllciA9IChkaXJlY3Rpb24pID0+IHVwZGF0ZSgnUmVvcmRlciBtb2RpZmllcicsIChkcmFmdCkgPT4ge1xuICAgICAgICAgICAgY29uc3QgbmV4dEluZGV4ID0gbW9kaWZpZXJJbmRleCArIGRpcmVjdGlvbjtcbiAgICAgICAgICAgIGlmIChuZXh0SW5kZXggPCAwIHx8IG5leHRJbmRleCA+PSBkcmFmdC5tb2RpZmllcnMubGVuZ3RoKSByZXR1cm47XG4gICAgICAgICAgICBjb25zdCBbbW92ZWRdID0gZHJhZnQubW9kaWZpZXJzLnNwbGljZShtb2RpZmllckluZGV4LCAxKTtcbiAgICAgICAgICAgIGRyYWZ0Lm1vZGlmaWVycy5zcGxpY2UobmV4dEluZGV4LCAwLCBtb3ZlZCk7XG4gICAgICAgICAgfSk7XG4gICAgICAgICAgcmV0dXJuIDxkaXYgY2xhc3NOYW1lPVwiYWJvdXQtZWRpdG9yLW1vZGlmaWVyXCIga2V5PXtgJHtpdGVtLmlkfS0ke21vZGlmaWVySW5kZXh9YH0+PGRpdj48bGFiZWw+PGlucHV0IHR5cGU9XCJjaGVja2JveFwiIGNoZWNrZWQ9e2l0ZW0uZW5hYmxlZH0gb25DaGFuZ2U9eyhldmVudCkgPT4gdXBkYXRlKGBUb2dnbGUgJHtkZWZpbml0aW9uPy5sYWJlbH1gLCAoZHJhZnQpID0+IHsgZHJhZnQubW9kaWZpZXJzW21vZGlmaWVySW5kZXhdLmVuYWJsZWQgPSBldmVudC50YXJnZXQuY2hlY2tlZDsgfSl9IC8+e2RlZmluaXRpb24/LmxhYmVsIHx8IGl0ZW0uaWR9PC9sYWJlbD48c3Bhbj48YnV0dG9uIHR5cGU9XCJidXR0b25cIiBkaXNhYmxlZD17bW9kaWZpZXJJbmRleCA9PT0gMH0gb25DbGljaz17KCkgPT4gbW92ZU1vZGlmaWVyKC0xKX0gYXJpYS1sYWJlbD1cIk1vdmUgbW9kaWZpZXIgdXBcIj7ihpE8L2J1dHRvbj48YnV0dG9uIHR5cGU9XCJidXR0b25cIiBkaXNhYmxlZD17bW9kaWZpZXJJbmRleCA9PT0gd29ybGQubW9kaWZpZXJzLmxlbmd0aCAtIDF9IG9uQ2xpY2s9eygpID0+IG1vdmVNb2RpZmllcigxKX0gYXJpYS1sYWJlbD1cIk1vdmUgbW9kaWZpZXIgZG93blwiPuKGkzwvYnV0dG9uPiBDb3N0IHtkZWZpbml0aW9uPy5jb3N0IHx8ICc/J308L3NwYW4+PC9kaXY+eyhkZWZpbml0aW9uPy5wYXJhbWV0ZXJzIHx8IFtdKS5tYXAoKGNvbnRyb2wpID0+IGNvbnRyb2wudHlwZSA9PT0gJ3JhbmdlJyA/IDxOdW1iZXJQcm9wZXJ0eSBrZXk9e2NvbnRyb2wuaWR9IGxhYmVsPXtjb250cm9sLmxhYmVsfSB2YWx1ZT17aXRlbS5wYXJhbWV0ZXJzW2NvbnRyb2wuaWRdfSBtaW49e2NvbnRyb2wubWlufSBtYXg9e2NvbnRyb2wubWF4fSBzdGVwPXtjb250cm9sLnN0ZXB9IHVuaXQ9e2NvbnRyb2wudW5pdH0gb25DaGFuZ2U9eyh2YWx1ZSkgPT4gdXBkYXRlKGBDaGFuZ2UgJHtjb250cm9sLmxhYmVsfWAsIChkcmFmdCkgPT4geyBkcmFmdC5tb2RpZmllcnNbbW9kaWZpZXJJbmRleF0ucGFyYW1ldGVyc1tjb250cm9sLmlkXSA9IHZhbHVlOyB9LCBgbW9kaWZpZXI6JHtzZWN0aW9uLmlkfToke21vZGlmaWVySW5kZXh9OiR7Y29udHJvbC5pZH1gKX0gLz4gOiA8UHJvcGVydHkga2V5PXtjb250cm9sLmlkfSBsYWJlbD17Y29udHJvbC5sYWJlbH0+PHNlbGVjdCB2YWx1ZT17aXRlbS5wYXJhbWV0ZXJzW2NvbnRyb2wuaWRdfSBvbkNoYW5nZT17KGV2ZW50KSA9PiB1cGRhdGUoYENoYW5nZSAke2NvbnRyb2wubGFiZWx9YCwgKGRyYWZ0KSA9PiB7IGRyYWZ0Lm1vZGlmaWVyc1ttb2RpZmllckluZGV4XS5wYXJhbWV0ZXJzW2NvbnRyb2wuaWRdID0gZXZlbnQudGFyZ2V0LnZhbHVlOyB9KX0+e2NvbnRyb2wub3B0aW9ucy5tYXAoKG9wdGlvbikgPT4gPG9wdGlvbiBrZXk9e29wdGlvbn0+e29wdGlvbn08L29wdGlvbj4pfTwvc2VsZWN0PjwvUHJvcGVydHk+KX08L2Rpdj47XG4gICAgICAgIH0pfVxuICAgICAgPC9kZXRhaWxzPlxuICAgIDwvPlxuICApO1xufVxuXG5mdW5jdGlvbiBEaWFnbm9zdGljcyh7IGRpYWdub3N0aWNzIH0pIHtcbiAgaWYgKCFkaWFnbm9zdGljcy5sZW5ndGgpIHJldHVybiA8ZGl2IGNsYXNzTmFtZT1cImFib3V0LWVkaXRvci1kaWFnbm9zdGljcyBpcy1jbGVhclwiPjxDaGVjayBhcmlhLWhpZGRlbj1cInRydWVcIiAvPiBObyBkaWFnbm9zdGljczwvZGl2PjtcbiAgcmV0dXJuIDxkaXYgY2xhc3NOYW1lPVwiYWJvdXQtZWRpdG9yLWRpYWdub3N0aWNzXCI+e2RpYWdub3N0aWNzLm1hcCgoaXRlbSwgaW5kZXgpID0+IHtcbiAgICBjb25zdCBEaWFnbm9zdGljSWNvbiA9IGl0ZW0ubGV2ZWwgPT09ICdlcnJvcicgPyBDaXJjbGVBbGVydCA6IEluZm87XG4gICAgcmV0dXJuIDxkaXYga2V5PXtgJHtpdGVtLmNvZGV9LSR7aXRlbS5wYXRofS0ke2luZGV4fWB9IGNsYXNzTmFtZT17YGlzLSR7aXRlbS5sZXZlbH1gfT48RGlhZ25vc3RpY0ljb24gYXJpYS1oaWRkZW49XCJ0cnVlXCIgLz48c3Bhbj48c3Ryb25nPntpdGVtLm1lc3NhZ2V9PC9zdHJvbmc+PHNtYWxsPntpdGVtLnBhdGh9PC9zbWFsbD48L3NwYW4+PC9kaXY+O1xuICB9KX08L2Rpdj47XG59XG5cbmZ1bmN0aW9uIEF1ZGl0aW9uQ29udHJvbHMoeyBzdG9yZSwgc25hcHNob3QgfSkge1xuICBjb25zdCBbcHJlUm9sbFdVLCBzZXRQcmVSb2xsV1VdID0gdXNlU3RhdGUoMC4xOCk7XG4gIGNvbnN0IFtwb3N0Um9sbFdVLCBzZXRQb3N0Um9sbFdVXSA9IHVzZVN0YXRlKDAuMTgpO1xuICBjb25zdCBtZW1iZXJzID0gZ2V0QWJvdXROYXJyYXRpdmVTZWxlY3Rpb25NZW1iZXJzKHNuYXBzaG90LnNlbGVjdGlvbik7XG4gIGNvbnN0IHNvdXJjZSA9IHNuYXBzaG90LnNlbGVjdGlvbi50eXBlID09PSAnY3VlJ1xuICAgID8geyB0eXBlOiAnY3VlLWdyb3VwJywgc2VjdGlvbklkOiBzbmFwc2hvdC5zZWxlY3Rpb24uc2VjdGlvbklkLCBtZW1iZXJzLCBwcmltYXJ5OiBzbmFwc2hvdC5zZWxlY3Rpb24gfVxuICAgIDogWydzZWN0aW9uJywgJ3dvcmxkJywgJ2NhbWVyYS1rZXknXS5pbmNsdWRlcyhzbmFwc2hvdC5zZWxlY3Rpb24udHlwZSlcbiAgICAgID8gc25hcHNob3Quc2VsZWN0aW9uXG4gICAgICA6IG51bGw7XG4gIGlmICghc291cmNlKSByZXR1cm4gbnVsbDtcbiAgY29uc3QgcmFuZ2UgPSBkZXJpdmVBYm91dE5hcnJhdGl2ZUxvb3BSYW5nZSh7XG4gICAgZG9jdW1lbnQ6IHNuYXBzaG90LmRvY3VtZW50LFxuICAgIHBsYW46IHNuYXBzaG90LmNvbXBpbGVkUGxhbixcbiAgICBzb3VyY2UsXG4gICAgcHJlUm9sbFdVLFxuICAgIHBvc3RSb2xsV1UsXG4gIH0pO1xuICBjb25zdCBhY3RpdmUgPSByYW5nZS52YWxpZFxuICAgICYmIHNuYXBzaG90LnRyYW5zcG9ydC5sb29wPy5zb3VyY2VUeXBlID09PSByYW5nZS5zb3VyY2VUeXBlXG4gICAgJiYgc25hcHNob3QudHJhbnNwb3J0Lmxvb3A/LnNvdXJjZUlkID09PSByYW5nZS5zb3VyY2VJZDtcbiAgY29uc3QgdG9nZ2xlID0gKCkgPT4ge1xuICAgIGlmIChhY3RpdmUpIHtcbiAgICAgIHN0b3JlLnNldFRyYW5zcG9ydCh7IG93bmVyOiAndGltZWxpbmUnLCBwbGF5aW5nOiBmYWxzZSwgbG9vcDogbnVsbCB9KTtcbiAgICAgIHJldHVybjtcbiAgICB9XG4gICAgaWYgKCFyYW5nZS52YWxpZCkgcmV0dXJuO1xuICAgIHN0b3JlLnNldFRyYW5zcG9ydCh7XG4gICAgICBvd25lcjogJ3BsYXliYWNrJyxcbiAgICAgIHBsYXlpbmc6IHRydWUsXG4gICAgICBsaXZlQW1iaWVudDogZmFsc2UsXG4gICAgICBzdG9yeVdVOiByYW5nZS5zdGFydFdVLFxuICAgICAgbG9vcDogcmFuZ2UsXG4gICAgfSk7XG4gIH07XG4gIHJldHVybiAoXG4gICAgPGRldGFpbHMgY2xhc3NOYW1lPVwiYWJvdXQtZWRpdG9yLWF1ZGl0aW9uXCI+XG4gICAgICA8c3VtbWFyeT5Cb3VuZGFyeSBhdWRpdGlvbjwvc3VtbWFyeT5cbiAgICAgIDxkaXYgY2xhc3NOYW1lPVwiYWJvdXQtZWRpdG9yLWF1ZGl0aW9uLXJhbmdlXCI+XG4gICAgICAgIDxQcm9wZXJ0eSBsYWJlbD1cIlByZS1yb2xsXCI+PGlucHV0IHR5cGU9XCJudW1iZXJcIiBtaW49XCIwXCIgbWF4PVwiMlwiIHN0ZXA9XCIwLjA1XCIgdmFsdWU9e3ByZVJvbGxXVX0gb25DaGFuZ2U9eyhldmVudCkgPT4gc2V0UHJlUm9sbFdVKE1hdGgubWF4KDAsIE51bWJlcihldmVudC50YXJnZXQudmFsdWUpIHx8IDApKX0gLz48L1Byb3BlcnR5PlxuICAgICAgICA8UHJvcGVydHkgbGFiZWw9XCJQb3N0LXJvbGxcIj48aW5wdXQgdHlwZT1cIm51bWJlclwiIG1pbj1cIjBcIiBtYXg9XCIyXCIgc3RlcD1cIjAuMDVcIiB2YWx1ZT17cG9zdFJvbGxXVX0gb25DaGFuZ2U9eyhldmVudCkgPT4gc2V0UG9zdFJvbGxXVShNYXRoLm1heCgwLCBOdW1iZXIoZXZlbnQudGFyZ2V0LnZhbHVlKSB8fCAwKSl9IC8+PC9Qcm9wZXJ0eT5cbiAgICAgIDwvZGl2PlxuICAgICAge3JhbmdlLnZhbGlkID8gPHAgY2xhc3NOYW1lPVwiYWJvdXQtZWRpdG9yLWhlbHBcIj57Zm9ybWF0V1UocmFuZ2Uuc3RhcnRXVSl9IOKGkiB7Zm9ybWF0V1UocmFuZ2UuZW5kV1UpfSDCtyBhbWJpZW50IG1vdGlvbiBmcmVlemVzIGZvciBhIHJlcGVhdGFibGUgcmV2aWV3LjwvcD4gOiA8cCBjbGFzc05hbWU9XCJhYm91dC1lZGl0b3Itcmh5dGhtLW1lc3NhZ2UgaXMtZXJyb3JcIj57cmFuZ2UucmVhc29ufTwvcD59XG4gICAgICA8YnV0dG9uIHR5cGU9XCJidXR0b25cIiBjbGFzc05hbWU9e2FjdGl2ZSA/ICdpcy1hY3RpdmUgYWJvdXQtZWRpdG9yLXdpZGUtYWN0aW9uJyA6ICdhYm91dC1lZGl0b3Itd2lkZS1hY3Rpb24nfSBkaXNhYmxlZD17IXJhbmdlLnZhbGlkfSBvbkNsaWNrPXt0b2dnbGV9PnthY3RpdmUgPyAnU3RvcCBhdWRpdGlvbicgOiAnTG9vcCB0aGlzIHNlbGVjdGlvbid9PC9idXR0b24+XG4gICAgPC9kZXRhaWxzPlxuICApO1xufVxuXG5mdW5jdGlvbiBJbnNwZWN0b3IoeyBzdG9yZSwgc25hcHNob3QsIHRpbWVsaW5lT3BlbiwgcnVudGltZU1ldHJpY3MsIGNsaXBib2FyZCwgc2V0Q2xpcGJvYXJkIH0pIHtcbiAgY29uc3QgaW5zcGVjdG9yUmVmID0gdXNlUmVmKG51bGwpO1xuICBjb25zdCBkcmFnUmVmID0gdXNlUmVmKG51bGwpO1xuICBjb25zdCBsYXN0SGVhZGVyQ2xpY2tSZWYgPSB1c2VSZWYobnVsbCk7XG4gIGNvbnN0IFtwb3NpdGlvbiwgc2V0UG9zaXRpb25dID0gdXNlU3RhdGUobnVsbCk7XG4gIGNvbnN0IFtkcmFnZ2luZywgc2V0RHJhZ2dpbmddID0gdXNlU3RhdGUoZmFsc2UpO1xuICBjb25zdCBzZWN0aW9uID0gZ2V0U2VjdGlvbihzbmFwc2hvdC5kb2N1bWVudCwgc25hcHNob3Quc2VsZWN0aW9uKTtcbiAgbGV0IGNvbnRlbnQgPSA8U2VjdGlvbkluc3BlY3RvciBzdG9yZT17c3RvcmV9IHNuYXBzaG90PXtzbmFwc2hvdH0gc2VjdGlvbj17c2VjdGlvbn0gLz47XG4gIGlmIChzbmFwc2hvdC5zZWxlY3Rpb24udHlwZSA9PT0gJ3NlcXVlbmNlJykgY29udGVudCA9IDxTZXF1ZW5jZUluc3BlY3RvciBzdG9yZT17c3RvcmV9IHNuYXBzaG90PXtzbmFwc2hvdH0gLz47XG4gIGlmIChzbmFwc2hvdC5zZWxlY3Rpb24udHlwZSA9PT0gJ2N1ZScpIGNvbnRlbnQgPSA8Q3VlSW5zcGVjdG9yIHN0b3JlPXtzdG9yZX0gc25hcHNob3Q9e3NuYXBzaG90fSBzZWN0aW9uPXtzZWN0aW9ufSBjbGlwYm9hcmQ9e2NsaXBib2FyZH0gc2V0Q2xpcGJvYXJkPXtzZXRDbGlwYm9hcmR9IC8+O1xuICBpZiAoc25hcHNob3Quc2VsZWN0aW9uLnR5cGUgPT09ICdkaXNjaXBsaW5lLXJldmVhbCcpIGNvbnRlbnQgPSA8RGlzY2lwbGluZVJldmVhbEluc3BlY3RvciBzdG9yZT17c3RvcmV9IHNuYXBzaG90PXtzbmFwc2hvdH0gc2VjdGlvbj17c2VjdGlvbn0gLz47XG4gIGlmIChzbmFwc2hvdC5zZWxlY3Rpb24udHlwZSA9PT0gJ2NhbWVyYS1rZXknKSBjb250ZW50ID0gPENhbWVyYUluc3BlY3RvciBzdG9yZT17c3RvcmV9IHNuYXBzaG90PXtzbmFwc2hvdH0gc2VjdGlvbj17c2VjdGlvbn0gLz47XG4gIGlmIChzbmFwc2hvdC5zZWxlY3Rpb24udHlwZSA9PT0gJ3dvcmxkJykgY29udGVudCA9IDxXb3JsZEluc3BlY3RvciBzdG9yZT17c3RvcmV9IHNuYXBzaG90PXtzbmFwc2hvdH0gc2VjdGlvbj17c2VjdGlvbn0gcnVudGltZU1ldHJpY3M9e3J1bnRpbWVNZXRyaWNzfSAvPjtcbiAgaWYgKHNuYXBzaG90LnNlbGVjdGlvbi50eXBlID09PSAnaW50ZXJhY3Rpb24nKSBjb250ZW50ID0gPFNlY3Rpb25JbnNwZWN0b3Igc3RvcmU9e3N0b3JlfSBzbmFwc2hvdD17c25hcHNob3R9IHNlY3Rpb249e3NlY3Rpb259IC8+O1xuXG4gIHVzZUVmZmVjdCgoKSA9PiB7XG4gICAgY29uc3Qga2VlcEluQm91bmRzID0gKCkgPT4ge1xuICAgICAgaWYgKHdpbmRvdy5pbm5lcldpZHRoIDwgNzYwKSB7XG4gICAgICAgIHNldFBvc2l0aW9uKG51bGwpO1xuICAgICAgICByZXR1cm47XG4gICAgICB9XG4gICAgICBzZXRQb3NpdGlvbigoY3VycmVudCkgPT4gKFxuICAgICAgICBjdXJyZW50ICYmIGluc3BlY3RvclJlZi5jdXJyZW50XG4gICAgICAgICAgPyBjbGFtcEluc3BlY3RvclBvc2l0aW9uKGluc3BlY3RvclJlZi5jdXJyZW50LCBjdXJyZW50LCB0aW1lbGluZU9wZW4pXG4gICAgICAgICAgOiBjdXJyZW50XG4gICAgICApKTtcbiAgICB9O1xuICAgIGtlZXBJbkJvdW5kcygpO1xuICAgIHdpbmRvdy5hZGRFdmVudExpc3RlbmVyKCdyZXNpemUnLCBrZWVwSW5Cb3VuZHMpO1xuICAgIHJldHVybiAoKSA9PiB3aW5kb3cucmVtb3ZlRXZlbnRMaXN0ZW5lcigncmVzaXplJywga2VlcEluQm91bmRzKTtcbiAgfSwgW3RpbWVsaW5lT3Blbl0pO1xuXG4gIGNvbnN0IGJlZ2luRHJhZyA9IChldmVudCkgPT4ge1xuICAgIGlmIChldmVudC5idXR0b24gIT09IDAgfHwgd2luZG93LmlubmVyV2lkdGggPCA3NjAgfHwgIWV2ZW50LnRhcmdldC5jbG9zZXN0KCdoZWFkZXInKSkgcmV0dXJuO1xuICAgIGNvbnN0IGluc3BlY3RvciA9IGluc3BlY3RvclJlZi5jdXJyZW50O1xuICAgIGlmICghaW5zcGVjdG9yKSByZXR1cm47XG4gICAgY29uc3QgcmVjdCA9IGluc3BlY3Rvci5nZXRCb3VuZGluZ0NsaWVudFJlY3QoKTtcbiAgICBjb25zdCB7IG1pblRvcCwgbWF4Qm90dG9tIH0gPSBnZXRJbnNwZWN0b3JWZXJ0aWNhbEJvdW5kcyhpbnNwZWN0b3IsIHRpbWVsaW5lT3Blbik7XG4gICAgY29uc3QgYXZhaWxhYmxlSGVpZ2h0ID0gbWF4Qm90dG9tIC0gbWluVG9wO1xuICAgIGNvbnN0IGZsb2F0aW5nSGVpZ2h0ID0gTWF0aC5taW4ocmVjdC5oZWlnaHQsIDU2MCwgTWF0aC5tYXgoMjQwLCBhdmFpbGFibGVIZWlnaHQgKiAwLjcyKSk7XG4gICAgY29uc3Qgc3RhcnQgPSBjbGFtcEluc3BlY3RvclBvc2l0aW9uKGluc3BlY3Rvciwge1xuICAgICAgbGVmdDogcmVjdC5sZWZ0LFxuICAgICAgdG9wOiByZWN0LnRvcCxcbiAgICAgIHdpZHRoOiByZWN0LndpZHRoLFxuICAgICAgaGVpZ2h0OiBmbG9hdGluZ0hlaWdodCxcbiAgICB9LCB0aW1lbGluZU9wZW4pO1xuICAgIGRyYWdSZWYuY3VycmVudCA9IHtcbiAgICAgIHBvaW50ZXJJZDogZXZlbnQucG9pbnRlcklkLFxuICAgICAgb3JpZ2luWDogZXZlbnQuY2xpZW50WCxcbiAgICAgIG9yaWdpblk6IGV2ZW50LmNsaWVudFksXG4gICAgICBzdGFydCxcbiAgICAgIG1vdmVkOiBmYWxzZSxcbiAgICB9O1xuICAgIGluc3BlY3Rvci5zZXRQb2ludGVyQ2FwdHVyZShldmVudC5wb2ludGVySWQpO1xuICB9O1xuXG4gIGNvbnN0IG1vdmVEcmFnID0gKGV2ZW50KSA9PiB7XG4gICAgY29uc3QgZHJhZyA9IGRyYWdSZWYuY3VycmVudDtcbiAgICBjb25zdCBpbnNwZWN0b3IgPSBpbnNwZWN0b3JSZWYuY3VycmVudDtcbiAgICBpZiAoIWRyYWcgfHwgIWluc3BlY3RvciB8fCBkcmFnLnBvaW50ZXJJZCAhPT0gZXZlbnQucG9pbnRlcklkKSByZXR1cm47XG4gICAgY29uc3QgZGVsdGFYID0gZXZlbnQuY2xpZW50WCAtIGRyYWcub3JpZ2luWDtcbiAgICBjb25zdCBkZWx0YVkgPSBldmVudC5jbGllbnRZIC0gZHJhZy5vcmlnaW5ZO1xuICAgIGlmICghZHJhZy5tb3ZlZCAmJiBNYXRoLmh5cG90KGRlbHRhWCwgZGVsdGFZKSA8IDMpIHJldHVybjtcbiAgICBkcmFnLm1vdmVkID0gdHJ1ZTtcbiAgICBzZXREcmFnZ2luZyh0cnVlKTtcbiAgICBzZXRQb3NpdGlvbihjbGFtcEluc3BlY3RvclBvc2l0aW9uKGluc3BlY3Rvciwge1xuICAgICAgLi4uZHJhZy5zdGFydCxcbiAgICAgIGxlZnQ6IGRyYWcuc3RhcnQubGVmdCArIGRlbHRhWCxcbiAgICAgIHRvcDogZHJhZy5zdGFydC50b3AgKyBkZWx0YVksXG4gICAgfSwgdGltZWxpbmVPcGVuKSk7XG4gIH07XG5cbiAgY29uc3QgZW5kRHJhZyA9IChldmVudCkgPT4ge1xuICAgIGNvbnN0IGRyYWcgPSBkcmFnUmVmLmN1cnJlbnQ7XG4gICAgaWYgKGRyYWc/LnBvaW50ZXJJZCAhPT0gZXZlbnQucG9pbnRlcklkKSByZXR1cm47XG4gICAgaWYgKCFkcmFnLm1vdmVkKSB7XG4gICAgICBjb25zdCBub3cgPSBwZXJmb3JtYW5jZS5ub3coKTtcbiAgICAgIGNvbnN0IHByZXZpb3VzID0gbGFzdEhlYWRlckNsaWNrUmVmLmN1cnJlbnQ7XG4gICAgICBpZiAocHJldmlvdXMgJiYgbm93IC0gcHJldmlvdXMudGltZSA8IDM2MFxuICAgICAgICAmJiBNYXRoLmh5cG90KGV2ZW50LmNsaWVudFggLSBwcmV2aW91cy54LCBldmVudC5jbGllbnRZIC0gcHJldmlvdXMueSkgPCA2KSB7XG4gICAgICAgIHNldFBvc2l0aW9uKG51bGwpO1xuICAgICAgICBsYXN0SGVhZGVyQ2xpY2tSZWYuY3VycmVudCA9IG51bGw7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBsYXN0SGVhZGVyQ2xpY2tSZWYuY3VycmVudCA9IHsgdGltZTogbm93LCB4OiBldmVudC5jbGllbnRYLCB5OiBldmVudC5jbGllbnRZIH07XG4gICAgICB9XG4gICAgfVxuICAgIGRyYWdSZWYuY3VycmVudCA9IG51bGw7XG4gICAgc2V0RHJhZ2dpbmcoZmFsc2UpO1xuICAgIGlmIChpbnNwZWN0b3JSZWYuY3VycmVudD8uaGFzUG9pbnRlckNhcHR1cmUoZXZlbnQucG9pbnRlcklkKSkge1xuICAgICAgaW5zcGVjdG9yUmVmLmN1cnJlbnQucmVsZWFzZVBvaW50ZXJDYXB0dXJlKGV2ZW50LnBvaW50ZXJJZCk7XG4gICAgfVxuICB9O1xuXG4gIGNvbnN0IHJlc2V0UG9zaXRpb24gPSAoKSA9PiBzZXRQb3NpdGlvbihudWxsKTtcblxuICByZXR1cm4gKFxuICAgIDxhc2lkZVxuICAgICAgcmVmPXtpbnNwZWN0b3JSZWZ9XG4gICAgICBjbGFzc05hbWU9e2BhYm91dC1lZGl0b3ItaW5zcGVjdG9yJHtkcmFnZ2luZyA/ICcgaXMtZHJhZ2dpbmcnIDogJyd9YH1cbiAgICAgIGRhdGEtZmxvYXRpbmc9e3Bvc2l0aW9uID8gJ3RydWUnIDogJ2ZhbHNlJ31cbiAgICAgIHN0eWxlPXtwb3NpdGlvbiA/IHtcbiAgICAgICAgbGVmdDogcG9zaXRpb24ubGVmdCxcbiAgICAgICAgdG9wOiBwb3NpdGlvbi50b3AsXG4gICAgICAgIHJpZ2h0OiAnYXV0bycsXG4gICAgICAgIGJvdHRvbTogJ2F1dG8nLFxuICAgICAgICB3aWR0aDogcG9zaXRpb24ud2lkdGgsXG4gICAgICAgIGhlaWdodDogcG9zaXRpb24uaGVpZ2h0LFxuICAgICAgfSA6IHVuZGVmaW5lZH1cbiAgICAgIG9uUG9pbnRlckRvd249e2JlZ2luRHJhZ31cbiAgICAgIG9uUG9pbnRlck1vdmU9e21vdmVEcmFnfVxuICAgICAgb25Qb2ludGVyVXA9e2VuZERyYWd9XG4gICAgICBvblBvaW50ZXJDYW5jZWw9e2VuZERyYWd9XG4gICAgICBvbkRvdWJsZUNsaWNrPXtyZXNldFBvc2l0aW9ufVxuICAgID48ZGl2IGNsYXNzTmFtZT1cImFib3V0LWVkaXRvci1pbnNwZWN0b3Itc2Nyb2xsXCI+e2NvbnRlbnR9PEF1ZGl0aW9uQ29udHJvbHMgc3RvcmU9e3N0b3JlfSBzbmFwc2hvdD17c25hcHNob3R9IC8+PERpYWdub3N0aWNzIGRpYWdub3N0aWNzPXtzbmFwc2hvdC5kaWFnbm9zdGljc30gLz48L2Rpdj48L2FzaWRlPlxuICApO1xufVxuXG5mdW5jdGlvbiBDYW1lcmFQYXRoT3ZlcmxheSh7IHNuYXBzaG90IH0pIHtcbiAgY29uc3Qgc2VjdGlvbnMgPSBzbmFwc2hvdC5jb21waWxlZFBsYW4/LnNlY3Rpb25zIHx8IFtdO1xuICBjb25zdCB0b3RhbCA9IHNuYXBzaG90LmNvbXBpbGVkUGxhbj8ubWF4U3RvcnlXVSB8fCAxO1xuICByZXR1cm4gKFxuICAgIDxkaXYgY2xhc3NOYW1lPVwiYWJvdXQtZWRpdG9yLXBhdGgtb3ZlcmxheVwiIGFyaWEtbGFiZWw9XCJDYW1lcmEgcGF0aCBvdmVybGF5XCI+XG4gICAgICA8ZGl2PjxzdHJvbmc+UGF0aCDCtyBjb25zdGFudCBjYWRlbmNlPC9zdHJvbmc+PHNwYW4+e2Zvcm1hdFdVKHNuYXBzaG90LnRyYW5zcG9ydC5zdG9yeVdVKX0gLyB7Zm9ybWF0V1UodG90YWwpfTwvc3Bhbj48L2Rpdj5cbiAgICAgIDxzdmcgdmlld0JveD1cIjAgMCAyNDAgMTEyXCIgcm9sZT1cImltZ1wiIGFyaWEtbGFiZWw9XCJDYW1lcmEgYW5kIFdvcmxkIGFuY2hvcnMgb3ZlciBzdG9yeSBkaXN0YW5jZVwiPlxuICAgICAgICA8cGF0aCBkPVwiTTE4IDU2IEgyMjJcIiAvPlxuICAgICAgICB7c2VjdGlvbnMubWFwKChzZWN0aW9uKSA9PiB7XG4gICAgICAgICAgY29uc3QgeCA9IDE4ICsgKChzZWN0aW9uLnN0YXJ0V1UgLyB0b3RhbCkgKiAyMDQpO1xuICAgICAgICAgIHJldHVybiA8ZyBrZXk9e3NlY3Rpb24uaWR9IHRyYW5zZm9ybT17YHRyYW5zbGF0ZSgke3h9IDU2KWB9PjxsaW5lIHkxPVwiLTEyXCIgeTI9XCIxMlwiIC8+PGNpcmNsZSByPXtzZWN0aW9uLndvcmxkU3RhdGU/LmNoYW5nZXNXb3JsZCA/IDQgOiAyfSAvPjx0aXRsZT57c2VjdGlvbi5sYWJlbH17c2VjdGlvbi53b3JsZFN0YXRlPy5jaGFuZ2VzV29ybGQgPyBgIMK3ICR7c2VjdGlvbi53b3JsZFN0YXRlLmFjdGl2ZVdvcmxkLnNoYXBlSWR9YCA6ICcnfTwvdGl0bGU+PC9nPjtcbiAgICAgICAgfSl9XG4gICAgICAgIDxnIGNsYXNzTmFtZT1cImlzLXBsYXloZWFkXCIgdHJhbnNmb3JtPXtgdHJhbnNsYXRlKCR7MTggKyAoKHNuYXBzaG90LnRyYW5zcG9ydC5zdG9yeVdVIC8gdG90YWwpICogMjA0KX0gNTYpYH0+PHBhdGggZD1cIk0wIC0yMiBMNSAtMTUgSC01IFpcIiAvPjxsaW5lIHkxPVwiLTE1XCIgeTI9XCIyMlwiIC8+PC9nPlxuICAgICAgPC9zdmc+XG4gICAgICA8c21hbGw+RG90cyBhcmUgU2VjdGlvbiBib3VuZGFyaWVzLiBMYXJnZSBkb3RzIGFyZSBmaXhlZCBXb3JsZCBhbmNob3JzLiBUaGUgbWFya2VyIGlzIHRoZSBwdWJsaXNoZWQgY2FtZXJhLjwvc21hbGw+XG4gICAgPC9kaXY+XG4gICk7XG59XG5cbmV4cG9ydCBkZWZhdWx0IGZ1bmN0aW9uIEFib3V0TmFycmF0aXZlRWRpdG9yKHsgc3RvcmUsIHJ1bnRpbWVSZWYsIHJvb3RSZWYgfSkge1xuICBjb25zdCBzbmFwc2hvdCA9IHVzZVN5bmNFeHRlcm5hbFN0b3JlKHN0b3JlLnN1YnNjcmliZSwgc3RvcmUuZ2V0U25hcHNob3QpO1xuICBjb25zdCBbY2hlY2twb2ludHMsIHNldENoZWNrcG9pbnRzXSA9IHVzZVN0YXRlKCgpID0+IHJlYWRBYm91dE5hcnJhdGl2ZUNoZWNrcG9pbnRzKCkpO1xuICBjb25zdCBbY2xpcGJvYXJkLCBzZXRDbGlwYm9hcmRdID0gdXNlU3RhdGUobnVsbCk7XG4gIGNvbnN0IFtydW50aW1lTWV0cmljcywgc2V0UnVudGltZU1ldHJpY3NdID0gdXNlU3RhdGUobnVsbCk7XG4gIGNvbnN0IFtwYXRoVmlzaWJsZSwgc2V0UGF0aFZpc2libGVdID0gdXNlU3RhdGUoZmFsc2UpO1xuICBjb25zdCBbZGlyZWN0b3JWaWV3LCBzZXREaXJlY3RvclZpZXddID0gdXNlU3RhdGUoZmFsc2UpO1xuICBjb25zdCBbbW9iaWxlUGFuZSwgc2V0TW9iaWxlUGFuZV0gPSB1c2VTdGF0ZSgnc2VxdWVuY2UnKTtcbiAgY29uc3QgW3RpbWVsaW5lT3Blbiwgc2V0VGltZWxpbmVPcGVuXSA9IHVzZVN0YXRlKCgpID0+IChcbiAgICB3aW5kb3cubG9jYWxTdG9yYWdlLmdldEl0ZW0oQUJPVVRfRURJVE9SX1RJTUVMSU5FX1NUT1JBR0VfS0VZKSAhPT0gJ2Nsb3NlZCdcbiAgKSk7XG4gIGNvbnN0IGltcG9ydFJlZiA9IHVzZVJlZihudWxsKTtcbiAgY29uc3Qgc25hcHNob3RSZWYgPSB1c2VSZWYoc25hcHNob3QpO1xuICBjb25zdCBhY3RpdmVTZWxlY3Rpb24gPSBzbmFwc2hvdC5zZWxlY3Rpb247XG5cbiAgdXNlRWZmZWN0KCgpID0+IHtcbiAgICBzbmFwc2hvdFJlZi5jdXJyZW50ID0gc25hcHNob3Q7XG4gIH0sIFtzbmFwc2hvdF0pO1xuXG4gIHVzZUVmZmVjdCgoKSA9PiB7XG4gICAgd2luZG93LmxvY2FsU3RvcmFnZS5zZXRJdGVtKEFCT1VUX0VESVRPUl9USU1FTElORV9TVE9SQUdFX0tFWSwgdGltZWxpbmVPcGVuID8gJ29wZW4nIDogJ2Nsb3NlZCcpO1xuICB9LCBbdGltZWxpbmVPcGVuXSk7XG5cbiAgdXNlRWZmZWN0KCgpID0+IHtcbiAgICBjb25zdCByb290ID0gcm9vdFJlZi5jdXJyZW50O1xuICAgIGNvbnN0IHJ1bnRpbWUgPSBydW50aW1lUmVmLmN1cnJlbnQ7XG4gICAgcm9vdD8uc2V0QXR0cmlidXRlKCdkYXRhLWVkaXRvci1hY3RpdmUnLCAndHJ1ZScpO1xuICAgIGxvYWRBYm91dE5hcnJhdGl2ZVNvdXJjZSgpLnRoZW4oKHsgZG9jdW1lbnQsIGhhc2ggfSkgPT4ge1xuICAgICAgY29uc3QgY3VycmVudCA9IHN0b3JlLmdldFNuYXBzaG90KCk7XG4gICAgICBpZiAoIWN1cnJlbnQuZGlydHkpIHN0b3JlLnJlcGxhY2VEb2N1bWVudCgnUmVmcmVzaCBjYW5vbmljYWwgc291cmNlJywgZG9jdW1lbnQpO1xuICAgICAgc3RvcmUuc2V0QmFzZWxpbmUoZG9jdW1lbnQsIGhhc2gpO1xuICAgICAgY29uc3QgcmVjb3ZlcnkgPSByZWFkQWJvdXROYXJyYXRpdmVSZWNvdmVyeURyYWZ0KCk7XG4gICAgICBpZiAocmVjb3ZlcnkgJiYgcmVjb3ZlcnkudGltZXN0YW1wID4gRGF0ZS5ub3coKSAtICgxNCAqIDg2NDAwMDAwKSkge1xuICAgICAgICBzdG9yZS5zZXRSZWNvdmVyeVN0YXRlKHsgYXZhaWxhYmxlOiB0cnVlLCBkcmFmdDogcmVjb3ZlcnksIGVycm9yOiAnJyB9KTtcbiAgICAgIH1cbiAgICB9KS5jYXRjaCgoZXJyb3IpID0+IHN0b3JlLnNldFNhdmVTdGF0ZSh7IHN0YXR1czogJ2ZhaWxlZCcsIG1lc3NhZ2U6IGVycm9yLm1lc3NhZ2UgfSkpO1xuICAgIHJldHVybiAoKSA9PiB7XG4gICAgICByb290Py5yZW1vdmVBdHRyaWJ1dGUoJ2RhdGEtZWRpdG9yLWFjdGl2ZScpO1xuICAgICAgcnVudGltZT8uc2V0RGlyZWN0b3JWaWV3Py4oZmFsc2UpO1xuICAgIH07XG4gIH0sIFtyb290UmVmLCBydW50aW1lUmVmLCBzdG9yZV0pO1xuXG4gIHVzZUVmZmVjdCgoKSA9PiB7XG4gICAgY29uc3Qgcm9vdCA9IHJvb3RSZWYuY3VycmVudDtcbiAgICBpZiAoIXJvb3QpIHJldHVybiB1bmRlZmluZWQ7XG4gICAgcm9vdC5xdWVyeVNlbGVjdG9yQWxsKCcuaXMtZWRpdG9yLXNlbGVjdGVkJykuZm9yRWFjaCgobm9kZSkgPT4gbm9kZS5jbGFzc0xpc3QucmVtb3ZlKCdpcy1lZGl0b3Itc2VsZWN0ZWQnKSk7XG4gICAgZ2V0QWJvdXROYXJyYXRpdmVTZWxlY3Rpb25NZW1iZXJzKGFjdGl2ZVNlbGVjdGlvbikuZm9yRWFjaCgobWVtYmVyKSA9PiB7XG4gICAgICByb290LnF1ZXJ5U2VsZWN0b3IoYFtkYXRhLXRleHQtY3VlPVwiJHtDU1MuZXNjYXBlKG1lbWJlci5jdWVJZCl9XCJdYCk/LmNsYXNzTGlzdC5hZGQoJ2lzLWVkaXRvci1zZWxlY3RlZCcpO1xuICAgIH0pO1xuICAgIHJvb3QuZGF0YXNldC5lZGl0b3JTZWxlY3Rpb25UeXBlID0gYWN0aXZlU2VsZWN0aW9uLnR5cGUgfHwgJyc7XG4gICAgcmV0dXJuICgpID0+IHtcbiAgICAgIHJvb3QucXVlcnlTZWxlY3RvckFsbCgnLmlzLWVkaXRvci1zZWxlY3RlZCcpLmZvckVhY2goKG5vZGUpID0+IG5vZGUuY2xhc3NMaXN0LnJlbW92ZSgnaXMtZWRpdG9yLXNlbGVjdGVkJykpO1xuICAgICAgZGVsZXRlIHJvb3QuZGF0YXNldC5lZGl0b3JTZWxlY3Rpb25UeXBlO1xuICAgIH07XG4gIH0sIFthY3RpdmVTZWxlY3Rpb24sIHJvb3RSZWZdKTtcblxuICB1c2VFZmZlY3QoKCkgPT4ge1xuICAgIGNvbnN0IGludGVydmFsID0gd2luZG93LnNldEludGVydmFsKCgpID0+IHNldFJ1bnRpbWVNZXRyaWNzKHJ1bnRpbWVSZWYuY3VycmVudD8uZ2V0TWV0cmljcz8uKCkgfHwgbnVsbCksIDUwMCk7XG4gICAgcmV0dXJuICgpID0+IHdpbmRvdy5jbGVhckludGVydmFsKGludGVydmFsKTtcbiAgfSwgW3J1bnRpbWVSZWZdKTtcblxuICB1c2VFZmZlY3QoKCkgPT4ge1xuICAgIGlmICghc25hcHNob3QuZGlydHkpIHJldHVybiB1bmRlZmluZWQ7XG4gICAgY29uc3QgdGltZXIgPSB3aW5kb3cuc2V0VGltZW91dCgoKSA9PiB7XG4gICAgICB0cnkge1xuICAgICAgICB3cml0ZUFib3V0TmFycmF0aXZlUmVjb3ZlcnlEcmFmdChzbmFwc2hvdC5kb2N1bWVudCwgc25hcHNob3QuYmFzZWxpbmVIYXNoKTtcbiAgICAgIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgICAgIHN0b3JlLnNldFJlY292ZXJ5U3RhdGUoeyBlcnJvcjogYERyYWZ0IHN0b3JhZ2UgZmFpbGVkOiAke2Vycm9yLm1lc3NhZ2V9YCB9KTtcbiAgICAgIH1cbiAgICB9LCA5MDApO1xuICAgIHJldHVybiAoKSA9PiB3aW5kb3cuY2xlYXJUaW1lb3V0KHRpbWVyKTtcbiAgfSwgW3NuYXBzaG90LmJhc2VsaW5lSGFzaCwgc25hcHNob3QuZGlydHksIHNuYXBzaG90LmRvY3VtZW50LCBzdG9yZV0pO1xuXG4gIHVzZUVmZmVjdCgoKSA9PiB7XG4gICAgY29uc3QgcGFnZWhpZGUgPSAoKSA9PiB7XG4gICAgICBjb25zdCBjdXJyZW50ID0gc25hcHNob3RSZWYuY3VycmVudDtcbiAgICAgIGlmIChjdXJyZW50LmRpcnR5KSB7XG4gICAgICAgIHRyeSB7IHdyaXRlQWJvdXROYXJyYXRpdmVSZWNvdmVyeURyYWZ0KGN1cnJlbnQuZG9jdW1lbnQsIGN1cnJlbnQuYmFzZWxpbmVIYXNoKTsgfSBjYXRjaCB7IC8qIHN1cmZhY2VkIGJ5IG5vcm1hbCBhdXRvc2F2ZSAqLyB9XG4gICAgICB9XG4gICAgfTtcbiAgICBjb25zdCBrZXlkb3duID0gKGV2ZW50KSA9PiB7XG4gICAgICBpZiAoKGV2ZW50Lm1ldGFLZXkgfHwgZXZlbnQuY3RybEtleSkgJiYgZXZlbnQua2V5LnRvTG93ZXJDYXNlKCkgPT09ICdzJykge1xuICAgICAgICBldmVudC5wcmV2ZW50RGVmYXVsdCgpO1xuICAgICAgICBkb2N1bWVudC5xdWVyeVNlbGVjdG9yKCdbZGF0YS1hYm91dC1lZGl0b3Itc2F2ZV0nKT8uY2xpY2soKTtcbiAgICAgIH1cbiAgICAgIGlmICgoZXZlbnQubWV0YUtleSB8fCBldmVudC5jdHJsS2V5KSAmJiBldmVudC5rZXkudG9Mb3dlckNhc2UoKSA9PT0gJ3onKSB7XG4gICAgICAgIGV2ZW50LnByZXZlbnREZWZhdWx0KCk7XG4gICAgICAgIGV2ZW50LnNoaWZ0S2V5ID8gc3RvcmUucmVkbygpIDogc3RvcmUudW5kbygpO1xuICAgICAgfVxuICAgICAgaWYgKCFldmVudC5tZXRhS2V5ICYmICFldmVudC5jdHJsS2V5ICYmICFldmVudC5hbHRLZXkgJiYgIWV2ZW50LnNoaWZ0S2V5XG4gICAgICAgICYmICFpc1RleHRFZGl0aW5nVGFyZ2V0KGV2ZW50LnRhcmdldCkgJiYgWydBcnJvd0xlZnQnLCAnQXJyb3dSaWdodCddLmluY2x1ZGVzKGV2ZW50LmtleSkpIHtcbiAgICAgICAgZXZlbnQucHJldmVudERlZmF1bHQoKTtcbiAgICAgICAganVtcFRpbWVsaW5lS2V5ZnJhbWUoc3RvcmUsIHN0b3JlLmdldFNuYXBzaG90KCksIGV2ZW50LmtleSA9PT0gJ0Fycm93UmlnaHQnID8gMSA6IC0xKTtcbiAgICAgIH1cbiAgICAgIGlmICghZXZlbnQubWV0YUtleSAmJiAhZXZlbnQuY3RybEtleSAmJiAhZXZlbnQuYWx0S2V5XG4gICAgICAgICYmICFpc1RleHRFZGl0aW5nVGFyZ2V0KGV2ZW50LnRhcmdldCkgJiYgWydCYWNrc3BhY2UnLCAnRGVsZXRlJ10uaW5jbHVkZXMoZXZlbnQua2V5KVxuICAgICAgICAmJiBkZWxldGVUaW1lbGluZVNlbGVjdGlvbihzdG9yZSwgc3RvcmUuZ2V0U25hcHNob3QoKSkpIHtcbiAgICAgICAgZXZlbnQucHJldmVudERlZmF1bHQoKTtcbiAgICAgIH1cbiAgICAgIGlmIChldmVudC5rZXkgPT09ICdFc2NhcGUnKSB7XG4gICAgICAgIGNvbnN0IGN1cnJlbnQgPSBzdG9yZS5nZXRTbmFwc2hvdCgpO1xuICAgICAgICBpZiAoY3VycmVudC5wcmV2aWV3U3RhdGUpIHN0b3JlLmNhbmNlbFByZXZpZXcoKTtcbiAgICAgICAgZWxzZSBpZiAoY3VycmVudC50cnlTdGF0ZSkgc3RvcmUuY2FuY2VsVHJ5KCk7XG4gICAgICAgIGVsc2UgaWYgKGdldEFib3V0TmFycmF0aXZlU2VsZWN0aW9uTWVtYmVycyhjdXJyZW50LnNlbGVjdGlvbikubGVuZ3RoID4gMSkge1xuICAgICAgICAgIHN0b3JlLnNldFNlbGVjdGlvbih7XG4gICAgICAgICAgICB0eXBlOiAnY3VlJyxcbiAgICAgICAgICAgIHNlY3Rpb25JZDogY3VycmVudC5zZWxlY3Rpb24uc2VjdGlvbklkLFxuICAgICAgICAgICAgY3VlSWQ6IGN1cnJlbnQuc2VsZWN0aW9uLmN1ZUlkLFxuICAgICAgICAgICAga2V5UGFydDogY3VycmVudC5zZWxlY3Rpb24ua2V5UGFydCB8fCAnZm9jdXMnLFxuICAgICAgICAgIH0pO1xuICAgICAgICB9XG4gICAgICAgIGVsc2UgaWYgKGN1cnJlbnQuc2VsZWN0aW9uLnR5cGUgIT09ICdzZWN0aW9uJykgc3RvcmUuc2V0U2VsZWN0aW9uKHsgdHlwZTogJ3NlY3Rpb24nLCBzZWN0aW9uSWQ6IGN1cnJlbnQuc2VsZWN0aW9uLnNlY3Rpb25JZCB9KTtcbiAgICAgICAgZWxzZSBzdG9yZS5zZXRTZWxlY3Rpb24oeyB0eXBlOiAnc2VxdWVuY2UnIH0pO1xuICAgICAgfVxuICAgIH07XG4gICAgd2luZG93LmFkZEV2ZW50TGlzdGVuZXIoJ3BhZ2VoaWRlJywgcGFnZWhpZGUpO1xuICAgIHdpbmRvdy5hZGRFdmVudExpc3RlbmVyKCdrZXlkb3duJywga2V5ZG93bik7XG4gICAgcmV0dXJuICgpID0+IHsgd2luZG93LnJlbW92ZUV2ZW50TGlzdGVuZXIoJ3BhZ2VoaWRlJywgcGFnZWhpZGUpOyB3aW5kb3cucmVtb3ZlRXZlbnRMaXN0ZW5lcigna2V5ZG93bicsIGtleWRvd24pOyB9O1xuICB9LCBbc3RvcmVdKTtcblxuICBjb25zdCBzYXZlID0gYXN5bmMgKCkgPT4ge1xuICAgIGNvbnN0IGVkaXRvclVybCA9IG5ldyBVUkwod2luZG93LmxvY2F0aW9uLmhyZWYpO1xuICAgIGVkaXRvclVybC5zZWFyY2hQYXJhbXMuc2V0KCdlZGl0JywgJzEnKTtcbiAgICB3aW5kb3cuaGlzdG9yeS5yZXBsYWNlU3RhdGUod2luZG93Lmhpc3Rvcnkuc3RhdGUsICcnLCBgJHtlZGl0b3JVcmwucGF0aG5hbWV9JHtlZGl0b3JVcmwuc2VhcmNofSR7ZWRpdG9yVXJsLmhhc2h9YCk7XG4gICAgY29uc3Qgc2VudCA9IGNsb25lQWJvdXROYXJyYXRpdmVEb2N1bWVudChzbmFwc2hvdC5kb2N1bWVudCk7XG4gICAgaWYgKHNuYXBzaG90LmRpYWdub3N0aWNzLnNvbWUoKGl0ZW0pID0+IGl0ZW0ubGV2ZWwgPT09ICdlcnJvcicpKSB7XG4gICAgICBzdG9yZS5zZXRTYXZlU3RhdGUoeyBzdGF0dXM6ICdmYWlsZWQnLCBtZXNzYWdlOiAnUmVzb2x2ZSB2YWxpZGF0aW9uIGVycm9ycyBiZWZvcmUgc2F2aW5nLicgfSk7XG4gICAgICByZXR1cm47XG4gICAgfVxuICAgIHN0b3JlLnNldFNhdmVTdGF0ZSh7IHN0YXR1czogJ3NhdmluZycsIG1lc3NhZ2U6ICcnIH0pO1xuICAgIHRyeSB7XG4gICAgICBjb25zdCByZXN1bHQgPSBhd2FpdCBzYXZlQWJvdXROYXJyYXRpdmVTb3VyY2Uoc2VudCwgc25hcHNob3QuYmFzZWxpbmVIYXNoKTtcbiAgICAgIHN0b3JlLm1hcmtTYXZlZChzZW50LCByZXN1bHQuaGFzaCk7XG4gICAgICBjbGVhckFib3V0TmFycmF0aXZlUmVjb3ZlcnlEcmFmdCgpO1xuICAgIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgICBzdG9yZS5zZXRTYXZlU3RhdGUoeyBzdGF0dXM6IGVycm9yLnN0YXR1cyA9PT0gNDA5ID8gJ2NvbmZsaWN0JyA6ICdmYWlsZWQnLCBtZXNzYWdlOiBlcnJvci5tZXNzYWdlIH0pO1xuICAgIH1cbiAgfTtcblxuICBjb25zdCBhZGRDaGVja3BvaW50ID0gKCkgPT4ge1xuICAgIGNvbnN0IGNoZWNrcG9pbnQgPSB7XG4gICAgICBpZDogY3J5cHRvLnJhbmRvbVVVSUQoKSxcbiAgICAgIG5hbWU6IGBDaGVja3BvaW50ICR7bmV3IERhdGUoKS50b0xvY2FsZVRpbWVTdHJpbmcoW10sIHsgaG91cjogJzItZGlnaXQnLCBtaW51dGU6ICcyLWRpZ2l0JyB9KX1gLFxuICAgICAgdGltZXN0YW1wOiBEYXRlLm5vdygpLFxuICAgICAgc3RvcnlXVTogc25hcHNob3QudHJhbnNwb3J0LnN0b3J5V1UsXG4gICAgICBiYXNlU291cmNlSGFzaDogc25hcHNob3QuYmFzZWxpbmVIYXNoLFxuICAgICAgZG9jdW1lbnQ6IHNuYXBzaG90LmRvY3VtZW50LFxuICAgIH07XG4gICAgc2V0Q2hlY2twb2ludHMod3JpdGVBYm91dE5hcnJhdGl2ZUNoZWNrcG9pbnQoY2hlY2twb2ludCkpO1xuICB9O1xuICBjb25zdCBzdGF0dXNMYWJlbCA9IHNuYXBzaG90LnNhdmVTdGF0ZS5zdGF0dXMgPT09ICdzYXZpbmcnID8gJ1NhdmluZ+KApidcbiAgICA6IHNuYXBzaG90LnNhdmVTdGF0ZS5zdGF0dXMgPT09ICdjb25mbGljdCcgPyAnU291cmNlIGNoYW5nZWQnXG4gICAgICA6IHNuYXBzaG90LnNhdmVTdGF0ZS5zdGF0dXMgPT09ICdmYWlsZWQnID8gJ1NhdmUgZmFpbGVkJ1xuICAgICAgICA6IHNuYXBzaG90LmRpcnR5ID8gJ0RyYWZ0JyA6ICdTYXZlZCc7XG4gIGNvbnN0IHNlbGVjdGVkID0gc25hcHNob3Quc2VsZWN0aW9uLnR5cGUgPT09ICdzZXF1ZW5jZSdcbiAgICA/IG51bGxcbiAgICA6IGdldFNlY3Rpb24oc25hcHNob3QuZG9jdW1lbnQsIHNuYXBzaG90LnNlbGVjdGlvbik7XG4gIGNvbnN0IGNvbXBpbGVkU2VsZWN0ZWQgPSBzbmFwc2hvdC5jb21waWxlZFBsYW4/LnNlY3Rpb25zLmZpbmQoKHNlY3Rpb24pID0+IHNlY3Rpb24uaWQgPT09IHNlbGVjdGVkPy5pZCk7XG4gIGNvbnN0IHJlc29sdmVkRXh0ZW50ID0gY29tcGlsZWRTZWxlY3RlZD8ucmVzb2x2ZWRFeHRlbnRXVSB8fCBzZWxlY3RlZD8uZXh0ZW50V1UgfHwgMDtcbiAgY29uc3Qgc2VsZWN0ZWRFeHRlbnQgPSBzZWxlY3RlZFxuICAgID8gTnVtYmVyKHNuYXBzaG90LnByZXZpZXdQcm9maWxlID09PSAnbW9iaWxlJyA/IHNlbGVjdGVkLm1vYmlsZUV4dGVudFdVIDogc2VsZWN0ZWQuZXh0ZW50V1UpXG4gICAgOiAwO1xuICBjb25zdCBzZWxlY3RlZEN1ZUNvdW50ID0gZ2V0QWJvdXROYXJyYXRpdmVTZWxlY3Rpb25NZW1iZXJzKHNuYXBzaG90LnNlbGVjdGlvbikubGVuZ3RoO1xuICBjb25zdCBsb29wQWN0aXZlID0gQm9vbGVhbihzbmFwc2hvdC50cmFuc3BvcnQubG9vcCk7XG4gIGNvbnN0IHRpbWVsaW5lRGVsZXRpb24gPSBnZXRUaW1lbGluZURlbGV0aW9uKHNuYXBzaG90KTtcbiAgY29uc3QgdG9nZ2xlTG9vcCA9ICgpID0+IHtcbiAgICBpZiAobG9vcEFjdGl2ZSkge1xuICAgICAgc3RvcmUuc2V0VHJhbnNwb3J0KHsgb3duZXI6ICd0aW1lbGluZScsIHBsYXlpbmc6IGZhbHNlLCBsb29wOiBudWxsIH0pO1xuICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICBjb25zdCByYW5nZSA9IGRlcml2ZUFib3V0TmFycmF0aXZlTG9vcFJhbmdlKHtcbiAgICAgIGRvY3VtZW50OiBzbmFwc2hvdC5kb2N1bWVudCxcbiAgICAgIHBsYW46IHNuYXBzaG90LmNvbXBpbGVkUGxhbixcbiAgICAgIHNvdXJjZTogc2VsZWN0ZWQgPyB7IHR5cGU6ICdzZWN0aW9uJywgc2VjdGlvbklkOiBzZWxlY3RlZC5pZCB9IDogbnVsbCxcbiAgICB9KTtcbiAgICBpZiAocmFuZ2UudmFsaWQpIHN0b3JlLnNldFRyYW5zcG9ydCh7IGxvb3A6IHJhbmdlIH0pO1xuICB9O1xuICBjb25zdCB0b2dnbGVTb2xvID0gKHRyYWNrKSA9PiBzdG9yZS5zZXRUcmFuc3BvcnQoe1xuICAgIHNvbG9UcmFjazogc25hcHNob3QudHJhbnNwb3J0LnNvbG9UcmFjayA9PT0gdHJhY2sgPyBudWxsIDogdHJhY2ssXG4gIH0pO1xuICBjb25zdCBmaXRTZXF1ZW5jZSA9ICgpID0+IHtcbiAgICBzdG9yZS5zZXRUcmFuc3BvcnQoeyB6b29tOiAxIH0pO1xuICAgIHJlcXVlc3RBbmltYXRpb25GcmFtZSgoKSA9PiB7XG4gICAgICBjb25zdCBsYW5lcyA9IGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3IoJy5hYm91dC1lZGl0b3ItbGFuZXMnKTtcbiAgICAgIGlmIChsYW5lcykgbGFuZXMuc2Nyb2xsTGVmdCA9IDA7XG4gICAgfSk7XG4gIH07XG4gIGNvbnN0IGZpdFNlY3Rpb24gPSAoKSA9PiB7XG4gICAgaWYgKCFjb21waWxlZFNlbGVjdGVkIHx8ICFzbmFwc2hvdC5jb21waWxlZFBsYW4/Lm1heFN0b3J5V1UpIHJldHVybjtcbiAgICBjb25zdCBzZWN0aW9uU3BhbiA9IE1hdGgubWF4KDAuMDAxLCBjb21waWxlZFNlbGVjdGVkLnJlc29sdmVkRXh0ZW50V1UpO1xuICAgIGNvbnN0IHpvb20gPSBNYXRoLm1pbig4LCBNYXRoLm1heCgxLCAoc25hcHNob3QuY29tcGlsZWRQbGFuLm1heFN0b3J5V1UgLyBzZWN0aW9uU3BhbikgKiAwLjgyKSk7XG4gICAgc3RvcmUuc2V0VHJhbnNwb3J0KHsgem9vbTogTnVtYmVyKHpvb20udG9GaXhlZCgzKSkgfSk7XG4gICAgcmVxdWVzdEFuaW1hdGlvbkZyYW1lKCgpID0+IHtcbiAgICAgIGNvbnN0IGxhbmVzID0gZG9jdW1lbnQucXVlcnlTZWxlY3RvcignLmFib3V0LWVkaXRvci1sYW5lcycpO1xuICAgICAgaWYgKCFsYW5lcykgcmV0dXJuO1xuICAgICAgY29uc3Qgc3RhcnRSYXRpbyA9IGNvbXBpbGVkU2VsZWN0ZWQuc3RhcnRXVSAvIHNuYXBzaG90LmNvbXBpbGVkUGxhbi5tYXhTdG9yeVdVO1xuICAgICAgbGFuZXMuc2Nyb2xsTGVmdCA9IE1hdGgubWF4KDAsIChzdGFydFJhdGlvICogbGFuZXMuc2Nyb2xsV2lkdGgpIC0gKGxhbmVzLmNsaWVudFdpZHRoICogMC4wOCkpO1xuICAgIH0pO1xuICB9O1xuICBjb25zdCB0b2dnbGVEaXJlY3RvciA9ICgpID0+IHtcbiAgICBjb25zdCBuZXh0ID0gIWRpcmVjdG9yVmlldztcbiAgICBzZXREaXJlY3RvclZpZXcobmV4dCk7XG4gICAgcnVudGltZVJlZi5jdXJyZW50Py5zZXREaXJlY3RvclZpZXc/LihuZXh0KTtcbiAgfTtcbiAgY29uc3QgdG9nZ2xlQmVmb3JlID0gKCkgPT4ge1xuICAgIGlmIChzbmFwc2hvdC50cnlTdGF0ZT8ubGFiZWwgPT09ICdDb21wYXJlIHNhdmVkIHNvdXJjZScpIHtcbiAgICAgIHN0b3JlLmNhbmNlbFRyeSgpO1xuICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICBpZiAoc25hcHNob3QudHJ5U3RhdGUpIHJldHVybjtcbiAgICBzdG9yZS5iZWdpblRyeSgnQ29tcGFyZSBzYXZlZCBzb3VyY2UnLCAoZHJhZnQpID0+IHtcbiAgICAgIE9iamVjdC5rZXlzKGRyYWZ0KS5mb3JFYWNoKChrZXkpID0+IGRlbGV0ZSBkcmFmdFtrZXldKTtcbiAgICAgIE9iamVjdC5hc3NpZ24oZHJhZnQsIGNsb25lQWJvdXROYXJyYXRpdmVEb2N1bWVudChzbmFwc2hvdC5iYXNlbGluZURvY3VtZW50KSk7XG4gICAgfSk7XG4gIH07XG5cbiAgcmV0dXJuIGNyZWF0ZVBvcnRhbCgoXG4gICAgPGRpdlxuICAgICAgY2xhc3NOYW1lPVwiYWJvdXQtZWRpdG9yXCJcbiAgICAgIGRhdGEtbW9iaWxlLXBhbmU9e21vYmlsZVBhbmV9XG4gICAgICBkYXRhLXRpbWVsaW5lLW9wZW49e3RpbWVsaW5lT3BlbiA/ICd0cnVlJyA6ICdmYWxzZSd9XG4gICAgICByb2xlPVwicmVnaW9uXCJcbiAgICAgIGFyaWEtbGFiZWw9XCJBYm91dCBOYXJyYXRpdmUgY3JlYXRpdmUgdG9vbGtpdFwiXG4gICAgPlxuICAgICAgPGhlYWRlciBjbGFzc05hbWU9XCJhYm91dC1lZGl0b3ItdG9wYmFyXCI+XG4gICAgICAgIDxidXR0b24gdHlwZT1cImJ1dHRvblwiIGNsYXNzTmFtZT1cImFib3V0LWVkaXRvci1icmFuZFwiIG9uQ2xpY2s9eygpID0+IHN0b3JlLnNldFNlbGVjdGlvbih7IHR5cGU6ICdzZXF1ZW5jZScgfSl9PjxEaWFtb25kIGFyaWEtaGlkZGVuPVwidHJ1ZVwiIC8+PHNwYW4+QWJvdXQgTmFycmF0aXZlPC9zcGFuPjxzbWFsbD5DcmVhdGl2ZSB0b29sa2l0PC9zbWFsbD48L2J1dHRvbj5cbiAgICAgICAgPFRyYW5zcG9ydCBzdG9yZT17c3RvcmV9IHNuYXBzaG90PXtzbmFwc2hvdH0gLz5cbiAgICAgICAgPGRpdiBjbGFzc05hbWU9XCJhYm91dC1lZGl0b3ItYWN0aW9uc1wiPlxuICAgICAgICAgIDxidXR0b24gdHlwZT1cImJ1dHRvblwiIGRpc2FibGVkPXshc25hcHNob3QuaGlzdG9yeS5jYW5VbmRvfSB0aXRsZT17c25hcHNob3QuaGlzdG9yeS51bmRvTGFiZWwgfHwgJ1VuZG8nfSBhcmlhLWxhYmVsPVwiVW5kb1wiIG9uQ2xpY2s9eygpID0+IHN0b3JlLnVuZG8oKX0+PHNwYW4gYXJpYS1oaWRkZW49XCJ0cnVlXCI+4oa2PC9zcGFuPjwvYnV0dG9uPlxuICAgICAgICAgIDxidXR0b24gdHlwZT1cImJ1dHRvblwiIGRpc2FibGVkPXshc25hcHNob3QuaGlzdG9yeS5jYW5SZWRvfSB0aXRsZT17c25hcHNob3QuaGlzdG9yeS5yZWRvTGFiZWwgfHwgJ1JlZG8nfSBhcmlhLWxhYmVsPVwiUmVkb1wiIG9uQ2xpY2s9eygpID0+IHN0b3JlLnJlZG8oKX0+PHNwYW4gYXJpYS1oaWRkZW49XCJ0cnVlXCI+4oa3PC9zcGFuPjwvYnV0dG9uPlxuICAgICAgICAgIDxidXR0b24gdHlwZT1cImJ1dHRvblwiIGNsYXNzTmFtZT17cGF0aFZpc2libGUgPyAnaXMtYWN0aXZlJyA6ICcnfSBvbkNsaWNrPXsoKSA9PiBzZXRQYXRoVmlzaWJsZSghcGF0aFZpc2libGUpfT5QYXRoPC9idXR0b24+XG4gICAgICAgICAgPGJ1dHRvbiB0eXBlPVwiYnV0dG9uXCIgY2xhc3NOYW1lPXtkaXJlY3RvclZpZXcgPyAnaXMtYWN0aXZlJyA6ICcnfSBvbkNsaWNrPXt0b2dnbGVEaXJlY3Rvcn0+e2RpcmVjdG9yVmlldyA/ICdEaXJlY3RvcicgOiAnQ2FtZXJhJ308L2J1dHRvbj5cbiAgICAgICAgICA8YnV0dG9uIHR5cGU9XCJidXR0b25cIiBjbGFzc05hbWU9e3NuYXBzaG90LnRyeVN0YXRlPy5sYWJlbCA9PT0gJ0NvbXBhcmUgc2F2ZWQgc291cmNlJyA/ICdpcy1hY3RpdmUnIDogJyd9IGRpc2FibGVkPXtzbmFwc2hvdC50cnlTdGF0ZSAmJiBzbmFwc2hvdC50cnlTdGF0ZS5sYWJlbCAhPT0gJ0NvbXBhcmUgc2F2ZWQgc291cmNlJ30gb25DbGljaz17dG9nZ2xlQmVmb3JlfT57c25hcHNob3QudHJ5U3RhdGU/LmxhYmVsID09PSAnQ29tcGFyZSBzYXZlZCBzb3VyY2UnID8gJ0JlZm9yZScgOiAnQWZ0ZXInfTwvYnV0dG9uPlxuICAgICAgICAgIDxkZXRhaWxzIGNsYXNzTmFtZT1cImFib3V0LWVkaXRvci1tb3JlXCI+XG4gICAgICAgICAgICA8c3VtbWFyeT5Nb3JlPC9zdW1tYXJ5PlxuICAgICAgICAgICAgPGRpdj5cbiAgICAgICAgICAgICAgPGJ1dHRvbiB0eXBlPVwiYnV0dG9uXCIgb25DbGljaz17YWRkQ2hlY2twb2ludH0+Q2hlY2twb2ludDwvYnV0dG9uPlxuICAgICAgICAgICAgICA8YnV0dG9uIHR5cGU9XCJidXR0b25cIiBvbkNsaWNrPXsoKSA9PiBleHBvcnRBYm91dE5hcnJhdGl2ZURvY3VtZW50KHNuYXBzaG90LmRvY3VtZW50KX0+RXhwb3J0IEpTT048L2J1dHRvbj5cbiAgICAgICAgICAgICAgPGJ1dHRvbiB0eXBlPVwiYnV0dG9uXCIgb25DbGljaz17KCkgPT4gaW1wb3J0UmVmLmN1cnJlbnQ/LmNsaWNrKCl9PkltcG9ydCBKU09OPC9idXR0b24+XG4gICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICA8L2RldGFpbHM+XG4gICAgICAgICAgPGlucHV0IHJlZj17aW1wb3J0UmVmfSBoaWRkZW4gdHlwZT1cImZpbGVcIiBhY2NlcHQ9XCJhcHBsaWNhdGlvbi9qc29uXCIgb25DaGFuZ2U9e2FzeW5jIChldmVudCkgPT4ge1xuICAgICAgICAgICAgY29uc3QgZmlsZSA9IGV2ZW50LnRhcmdldC5maWxlcz8uWzBdO1xuICAgICAgICAgICAgaWYgKCFmaWxlKSByZXR1cm47XG4gICAgICAgICAgICB0cnkge1xuICAgICAgICAgICAgICBjb25zdCBpbXBvcnRlZCA9IEpTT04ucGFyc2UoYXdhaXQgZmlsZS50ZXh0KCkpO1xuICAgICAgICAgICAgICBhc3NlcnRWYWxpZEFib3V0TmFycmF0aXZlRG9jdW1lbnQoaW1wb3J0ZWQpO1xuICAgICAgICAgICAgICBzdG9yZS5yZXBsYWNlRG9jdW1lbnQoJ0ltcG9ydCBkb2N1bWVudCcsIGltcG9ydGVkKTtcbiAgICAgICAgICAgIH0gY2F0Y2ggKGVycm9yKSB7IHN0b3JlLnNldFNhdmVTdGF0ZSh7IHN0YXR1czogJ2ZhaWxlZCcsIG1lc3NhZ2U6IGVycm9yLm1lc3NhZ2UgfSk7IH1cbiAgICAgICAgICAgIGV2ZW50LnRhcmdldC52YWx1ZSA9ICcnO1xuICAgICAgICAgIH19IC8+XG4gICAgICAgICAgPGJ1dHRvbiB0eXBlPVwiYnV0dG9uXCIgZGF0YS1hYm91dC1lZGl0b3Itc2F2ZSBjbGFzc05hbWU9XCJpcy1zYXZlXCIgZGlzYWJsZWQ9e3NuYXBzaG90LnNhdmVTdGF0ZS5zdGF0dXMgPT09ICdzYXZpbmcnfSBvbkNsaWNrPXtzYXZlfT48c3Bhbj57c3RhdHVzTGFiZWx9PC9zcGFuPjxrYmQ+4oyYUzwva2JkPjwvYnV0dG9uPlxuICAgICAgICA8L2Rpdj5cbiAgICAgIDwvaGVhZGVyPlxuXG4gICAgICB7c25hcHNob3QucmVjb3ZlcnlTdGF0ZS5hdmFpbGFibGUgPyA8ZGl2IGNsYXNzTmFtZT1cImFib3V0LWVkaXRvci1yZWNvdmVyeVwiPjxzcGFuPkFuIHVuc2F2ZWQgZHJhZnQgZnJvbSB7bmV3IERhdGUoc25hcHNob3QucmVjb3ZlcnlTdGF0ZS5kcmFmdC50aW1lc3RhbXApLnRvTG9jYWxlU3RyaW5nKCl9IGlzIGF2YWlsYWJsZS48L3NwYW4+PGJ1dHRvbiB0eXBlPVwiYnV0dG9uXCIgb25DbGljaz17KCkgPT4geyBzdG9yZS5yZXBsYWNlRG9jdW1lbnQoJ1JlY292ZXIgZHJhZnQnLCBzbmFwc2hvdC5yZWNvdmVyeVN0YXRlLmRyYWZ0LmRvY3VtZW50KTsgc3RvcmUuc2V0UmVjb3ZlcnlTdGF0ZSh7IGF2YWlsYWJsZTogZmFsc2UgfSk7IH19PlJlY292ZXIgYXMgdW5zYXZlZCBjb3B5PC9idXR0b24+PGJ1dHRvbiB0eXBlPVwiYnV0dG9uXCIgb25DbGljaz17KCkgPT4geyBleHBvcnRBYm91dE5hcnJhdGl2ZURvY3VtZW50KHNuYXBzaG90LnJlY292ZXJ5U3RhdGUuZHJhZnQuZG9jdW1lbnQsICdjb250ZW50cy1hYm91dC1yZWNvdmVyZWQuanNvbicpOyB9fT5FeHBvcnQ8L2J1dHRvbj48YnV0dG9uIHR5cGU9XCJidXR0b25cIiBvbkNsaWNrPXsoKSA9PiB7IGNsZWFyQWJvdXROYXJyYXRpdmVSZWNvdmVyeURyYWZ0KCk7IHN0b3JlLnNldFJlY292ZXJ5U3RhdGUoeyBhdmFpbGFibGU6IGZhbHNlIH0pOyB9fT5EaXNjYXJkPC9idXR0b24+PC9kaXY+IDogbnVsbH1cbiAgICAgIHtzbmFwc2hvdC5zYXZlU3RhdGUubWVzc2FnZSA/IDxkaXYgY2xhc3NOYW1lPXtgYWJvdXQtZWRpdG9yLXNhdmUtbWVzc2FnZSBpcy0ke3NuYXBzaG90LnNhdmVTdGF0ZS5zdGF0dXN9YH0+e3NuYXBzaG90LnNhdmVTdGF0ZS5tZXNzYWdlfTxidXR0b24gdHlwZT1cImJ1dHRvblwiIGFyaWEtbGFiZWw9XCJEaXNtaXNzIG1lc3NhZ2VcIiBvbkNsaWNrPXsoKSA9PiBzdG9yZS5zZXRTYXZlU3RhdGUoeyBtZXNzYWdlOiAnJyB9KX0+w5c8L2J1dHRvbj48L2Rpdj4gOiBudWxsfVxuXG4gICAgICB7cGF0aFZpc2libGUgPyA8Q2FtZXJhUGF0aE92ZXJsYXkgc25hcHNob3Q9e3NuYXBzaG90fSAvPiA6IG51bGx9XG4gICAgICB7ZGlyZWN0b3JWaWV3ID8gPGRpdiBjbGFzc05hbWU9XCJhYm91dC1lZGl0b3ItZGlyZWN0b3ItY29udHJvbHNcIj48c3Ryb25nPkRpcmVjdG9yIFZpZXc8L3N0cm9uZz48YnV0dG9uIHR5cGU9XCJidXR0b25cIiBvbkNsaWNrPXsoKSA9PiBydW50aW1lUmVmLmN1cnJlbnQ/Lm51ZGdlRGlyZWN0b3I/Lih7IHlhdzogLTAuMDggfSl9PuKGkDwvYnV0dG9uPjxidXR0b24gdHlwZT1cImJ1dHRvblwiIG9uQ2xpY2s9eygpID0+IHJ1bnRpbWVSZWYuY3VycmVudD8ubnVkZ2VEaXJlY3Rvcj8uKHsgcGl0Y2g6IDAuMDggfSl9PuKGkTwvYnV0dG9uPjxidXR0b24gdHlwZT1cImJ1dHRvblwiIG9uQ2xpY2s9eygpID0+IHJ1bnRpbWVSZWYuY3VycmVudD8ubnVkZ2VEaXJlY3Rvcj8uKHsgcGl0Y2g6IC0wLjA4IH0pfT7ihpM8L2J1dHRvbj48YnV0dG9uIHR5cGU9XCJidXR0b25cIiBvbkNsaWNrPXsoKSA9PiBydW50aW1lUmVmLmN1cnJlbnQ/Lm51ZGdlRGlyZWN0b3I/Lih7IHlhdzogMC4wOCB9KX0+4oaSPC9idXR0b24+PGJ1dHRvbiB0eXBlPVwiYnV0dG9uXCIgb25DbGljaz17KCkgPT4gcnVudGltZVJlZi5jdXJyZW50Py5udWRnZURpcmVjdG9yPy4oeyBkaXN0YW5jZTogLTAuMiB9KX0+77yLPC9idXR0b24+PGJ1dHRvbiB0eXBlPVwiYnV0dG9uXCIgb25DbGljaz17KCkgPT4gcnVudGltZVJlZi5jdXJyZW50Py5udWRnZURpcmVjdG9yPy4oeyBkaXN0YW5jZTogMC4yIH0pfT7iiJI8L2J1dHRvbj48YnV0dG9uIHR5cGU9XCJidXR0b25cIiBvbkNsaWNrPXsoKSA9PiBydW50aW1lUmVmLmN1cnJlbnQ/LnJlc2V0RGlyZWN0b3I/LigpfT5SZXNldDwvYnV0dG9uPjxzbWFsbD5UZW1wb3JhcnkgaW5zcGVjdGlvbiBvbmx5LiBQdWJsaXNoZWQgQ2FtZXJhIGtleXMgYXJlIHVuY2hhbmdlZC48L3NtYWxsPjwvZGl2PiA6IG51bGx9XG5cbiAgICAgIDxJbnNwZWN0b3Igc3RvcmU9e3N0b3JlfSBzbmFwc2hvdD17c25hcHNob3R9IHRpbWVsaW5lT3Blbj17dGltZWxpbmVPcGVufSBydW50aW1lTWV0cmljcz17cnVudGltZU1ldHJpY3N9IGNsaXBib2FyZD17Y2xpcGJvYXJkfSBzZXRDbGlwYm9hcmQ9e3NldENsaXBib2FyZH0gLz5cbiAgICAgIDxidXR0b25cbiAgICAgICAgdHlwZT1cImJ1dHRvblwiXG4gICAgICAgIGNsYXNzTmFtZT1cImFib3V0LWVkaXRvci10aW1lbGluZS10b2dnbGVcIlxuICAgICAgICBhcmlhLWNvbnRyb2xzPVwiYWJvdXQtZWRpdG9yLXRpbWVsaW5lLXBhbmVsXCJcbiAgICAgICAgYXJpYS1leHBhbmRlZD17dGltZWxpbmVPcGVufVxuICAgICAgICB0aXRsZT17dGltZWxpbmVPcGVuID8gJ0hpZGUgdGltZWxpbmUnIDogJ1Nob3cgdGltZWxpbmUnfVxuICAgICAgICBvbkNsaWNrPXsoKSA9PiBzZXRUaW1lbGluZU9wZW4oKG9wZW4pID0+ICFvcGVuKX1cbiAgICAgID57dGltZWxpbmVPcGVuID8gPENoZXZyb25Eb3duIGFyaWEtaGlkZGVuPVwidHJ1ZVwiIC8+IDogPENoZXZyb25VcCBhcmlhLWhpZGRlbj1cInRydWVcIiAvPn08c3Bhbj57dGltZWxpbmVPcGVuID8gJ0hpZGUgdGltZWxpbmUnIDogJ1Nob3cgdGltZWxpbmUnfTwvc3Bhbj48L2J1dHRvbj5cbiAgICAgIDxkaXYgaWQ9XCJhYm91dC1lZGl0b3ItdGltZWxpbmUtcGFuZWxcIiBjbGFzc05hbWU9XCJhYm91dC1lZGl0b3ItYm90dG9tXCIgYXJpYS1oaWRkZW49eyF0aW1lbGluZU9wZW59PlxuICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cImFib3V0LWVkaXRvci1jb250ZXh0YmFyXCI+XG4gICAgICAgICAgPHNwYW4+PHN0cm9uZz57c2VsZWN0ZWQ/LmxhYmVsIHx8ICdTZXF1ZW5jZSd9PC9zdHJvbmc+IHtzZWxlY3RlZCA/IGAke3NlbGVjdGVkLnR5cGV9IMK3ICR7Zm9ybWF0V1UoTWF0aC5tYXgoMCwgc2VsZWN0ZWRFeHRlbnQgLSAxKSl9IHNjcm9sbCDCtyAke2Zvcm1hdFdVKHNlbGVjdGVkRXh0ZW50KX0gdG90YWwke3Jlc29sdmVkRXh0ZW50ID4gc2VsZWN0ZWRFeHRlbnQgKyAwLjAwMSA/IGAgwrcgJHtmb3JtYXRXVShyZXNvbHZlZEV4dGVudCl9IHJlc29sdmVkYCA6ICcnfWAgOiAnJ308L3NwYW4+XG4gICAgICAgICAge3NlbGVjdGVkQ3VlQ291bnQgPiAxID8gPHNwYW4gY2xhc3NOYW1lPVwiYWJvdXQtZWRpdG9yLXNlbGVjdGlvbi1jb3VudFwiPntzZWxlY3RlZEN1ZUNvdW50fSB0aXRsZXMgc2VsZWN0ZWQ8L3NwYW4+IDogbnVsbH1cbiAgICAgICAgICA8c3Bhbj57c25hcHNob3QuYXV0b0tleSA/ICdBdXRvLWtleSBhcm1lZCcgOiAnQXV0by1rZXkgb2ZmJ308L3NwYW4+XG4gICAgICAgICAgPGJ1dHRvbiB0eXBlPVwiYnV0dG9uXCIgY2xhc3NOYW1lPXtzbmFwc2hvdC5hdXRvS2V5ID8gJ2lzLWFjdGl2ZScgOiAnJ30gb25DbGljaz17KCkgPT4gc3RvcmUuc2V0QXV0b0tleSghc25hcHNob3QuYXV0b0tleSl9PuKXhiBBdXRvLWtleTwvYnV0dG9uPlxuICAgICAgICAgIDxidXR0b24gdHlwZT1cImJ1dHRvblwiIGNsYXNzTmFtZT17bG9vcEFjdGl2ZSA/ICdpcy1hY3RpdmUnIDogJyd9IGRpc2FibGVkPXshc2VsZWN0ZWR9IG9uQ2xpY2s9e3RvZ2dsZUxvb3B9Pntsb29wQWN0aXZlID8gJ1N0b3AgYXVkaXRpb24nIDogJ0xvb3AgU2VjdGlvbid9PC9idXR0b24+XG4gICAgICAgICAgPGJ1dHRvbiB0eXBlPVwiYnV0dG9uXCIgb25DbGljaz17Zml0U2VxdWVuY2V9PkZpdCBzZXF1ZW5jZTwvYnV0dG9uPlxuICAgICAgICAgIDxidXR0b24gdHlwZT1cImJ1dHRvblwiIGRpc2FibGVkPXshY29tcGlsZWRTZWxlY3RlZH0gb25DbGljaz17Zml0U2VjdGlvbn0+Rml0IFNlY3Rpb248L2J1dHRvbj5cbiAgICAgICAgICB7WydjYW1lcmEnLCAnd29ybGQnLCAndGV4dCddLm1hcCgodHJhY2spID0+IDxidXR0b24gdHlwZT1cImJ1dHRvblwiIGtleT17dHJhY2t9IGNsYXNzTmFtZT17c25hcHNob3QudHJhbnNwb3J0LnNvbG9UcmFjayA9PT0gdHJhY2sgPyAnaXMtYWN0aXZlJyA6ICcnfSBvbkNsaWNrPXsoKSA9PiB0b2dnbGVTb2xvKHRyYWNrKX0+U29sbyB7dHJhY2t9PC9idXR0b24+KX1cbiAgICAgICAgICB7dGltZWxpbmVEZWxldGlvbiA/IDxidXR0b24gdHlwZT1cImJ1dHRvblwiIGNsYXNzTmFtZT1cImFib3V0LWVkaXRvci1kZWxldGUta2V5XCIgZGlzYWJsZWQ9e3RpbWVsaW5lRGVsZXRpb24uZGlzYWJsZWR9IHRpdGxlPXt0aW1lbGluZURlbGV0aW9uLm1lc3NhZ2UgfHwgYCR7dGltZWxpbmVEZWxldGlvbi5sYWJlbH0gwrcgRGVsZXRlL0JhY2tzcGFjZWB9IG9uQ2xpY2s9eygpID0+IGRlbGV0ZVRpbWVsaW5lU2VsZWN0aW9uKHN0b3JlLCBzbmFwc2hvdCl9PjxUcmFzaDIgYXJpYS1oaWRkZW49XCJ0cnVlXCIgLz57dGltZWxpbmVEZWxldGlvbi5sYWJlbH08L2J1dHRvbj4gOiBudWxsfVxuICAgICAgICAgIHtydW50aW1lTWV0cmljcyA/IDxzcGFuIGNsYXNzTmFtZT1cImFib3V0LWVkaXRvci1odWRcIj57cnVudGltZU1ldHJpY3MuZnJhbWVUaW1lTXMudG9GaXhlZCgyKX1tcyDCtyB7cnVudGltZU1ldHJpY3MuZHJhd0NhbGxzfSBkcmF3IMK3IHtydW50aW1lTWV0cmljcy5wb2ludENvdW50LnRvTG9jYWxlU3RyaW5nKCl9IHB0cyDCtyB7cnVudGltZU1ldHJpY3MuYWN0aXZlTW9kaWZpZXJzfSBtb2RpZmllcnMgwrcge3J1bnRpbWVNZXRyaWNzLmJ1ZmZlclJlYnVpbGRzfSByZWJ1aWxkczwvc3Bhbj4gOiBudWxsfVxuICAgICAgICAgIHtjaGVja3BvaW50cy5sZW5ndGggPyA8c2VsZWN0IGFyaWEtbGFiZWw9XCJSZXN0b3JlIGNoZWNrcG9pbnRcIiBkZWZhdWx0VmFsdWU9XCJcIiBvbkNoYW5nZT17KGV2ZW50KSA9PiB7IGNvbnN0IGZvdW5kID0gY2hlY2twb2ludHMuZmluZCgoaXRlbSkgPT4gaXRlbS5pZCA9PT0gZXZlbnQudGFyZ2V0LnZhbHVlKTsgaWYgKGZvdW5kKSB7IHN0b3JlLnJlcGxhY2VEb2N1bWVudChgUmVzdG9yZSAke2ZvdW5kLm5hbWV9YCwgZm91bmQuZG9jdW1lbnQpOyBzdG9yZS5zZXRUcmFuc3BvcnQoeyBvd25lcjogJ3RpbWVsaW5lJywgc3RvcnlXVTogZm91bmQuc3RvcnlXVSwgcGxheWluZzogZmFsc2UgfSk7IH0gZXZlbnQudGFyZ2V0LnZhbHVlID0gJyc7IH19PjxvcHRpb24gdmFsdWU9XCJcIj5DaGVja3BvaW50cyAoe2NoZWNrcG9pbnRzLmxlbmd0aH0pPC9vcHRpb24+e2NoZWNrcG9pbnRzLm1hcCgoaXRlbSkgPT4gPG9wdGlvbiB2YWx1ZT17aXRlbS5pZH0ga2V5PXtpdGVtLmlkfT57aXRlbS5uYW1lfTwvb3B0aW9uPil9PC9zZWxlY3Q+IDogbnVsbH1cbiAgICAgICAgPC9kaXY+XG4gICAgICAgIDxUaW1lbGluZVxuICAgICAgICAgIHN0b3JlPXtzdG9yZX1cbiAgICAgICAgICBzbmFwc2hvdD17c25hcHNob3R9XG4gICAgICAgICAgb25PcGVuR2xvYmFsPXsoc2VsZWN0aW9uKSA9PiB7XG4gICAgICAgICAgICBzdG9yZS5zZXRTZWxlY3Rpb24oc2VsZWN0aW9uKTtcbiAgICAgICAgICAgIHNldE1vYmlsZVBhbmUoJ2luc3BlY3QnKTtcbiAgICAgICAgICB9fVxuICAgICAgICAvPlxuICAgICAgPC9kaXY+XG4gICAgICA8bmF2IGNsYXNzTmFtZT1cImFib3V0LWVkaXRvci1tb2JpbGUtdGFic1wiIGFyaWEtbGFiZWw9XCJFZGl0b3IgcGFuZWxcIj48YnV0dG9uIHR5cGU9XCJidXR0b25cIiBjbGFzc05hbWU9e21vYmlsZVBhbmUgPT09ICdzZXF1ZW5jZScgPyAnaXMtYWN0aXZlJyA6ICcnfSBvbkNsaWNrPXsoKSA9PiBzZXRNb2JpbGVQYW5lKCdzZXF1ZW5jZScpfT5TZXF1ZW5jZTwvYnV0dG9uPjxidXR0b24gdHlwZT1cImJ1dHRvblwiIGNsYXNzTmFtZT17bW9iaWxlUGFuZSA9PT0gJ2luc3BlY3QnID8gJ2lzLWFjdGl2ZScgOiAnJ30gb25DbGljaz17KCkgPT4gc2V0TW9iaWxlUGFuZSgnaW5zcGVjdCcpfT5JbnNwZWN0PC9idXR0b24+PGJ1dHRvbiB0eXBlPVwiYnV0dG9uXCIgY2xhc3NOYW1lPXttb2JpbGVQYW5lID09PSAncHJldmlldycgPyAnaXMtYWN0aXZlJyA6ICcnfSBvbkNsaWNrPXsoKSA9PiBzZXRNb2JpbGVQYW5lKCdwcmV2aWV3Jyl9PlByZXZpZXc8L2J1dHRvbj48L25hdj5cbiAgICA8L2Rpdj5cbiAgKSwgZG9jdW1lbnQuYm9keSk7XG59XG4iXSwiZmlsZSI6Ii9Vc2Vycy9hbGV4YW5kZXJiZWNrL1Byb2plY3RzLWNvZGUvQWxleGFuZGVyIEJlY2sgU3R1ZGlvIFdlYnNpdGUvcmVhY3QtYXBwL2FwcC9zcmMvcm91dGVzL2Fib3V0LW5hcnJhdGl2ZS1sYWIvQWJvdXROYXJyYXRpdmVFZGl0b3IuanN4In0=