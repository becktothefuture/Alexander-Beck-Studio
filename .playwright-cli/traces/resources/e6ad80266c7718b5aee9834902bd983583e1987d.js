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
                lineNumber: 2221,
                columnNumber: 119
              }, this),
              /* @__PURE__ */ jsxDEV("span", { children: "About Narrative" }, void 0, false, {
                fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
                lineNumber: 2221,
                columnNumber: 149
              }, this),
              /* @__PURE__ */ jsxDEV("small", { children: "Creative toolkit" }, void 0, false, {
                fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
                lineNumber: 2221,
                columnNumber: 177
              }, this)
            ] }, void 0, true, {
              fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
              lineNumber: 2221,
              columnNumber: 9
            }, this),
            /* @__PURE__ */ jsxDEV(Transport, { store, snapshot }, void 0, false, {
              fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
              lineNumber: 2222,
              columnNumber: 9
            }, this),
            /* @__PURE__ */ jsxDEV("div", { className: "about-editor-actions", children: [
              /* @__PURE__ */ jsxDEV("button", { type: "button", disabled: !snapshot.history.canUndo, title: snapshot.history.undoLabel || "Undo", "aria-label": "Undo", onClick: () => store.undo(), children: /* @__PURE__ */ jsxDEV("span", { "aria-hidden": "true", children: "↶" }, void 0, false, {
                fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
                lineNumber: 2224,
                columnNumber: 162
              }, this) }, void 0, false, {
                fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
                lineNumber: 2224,
                columnNumber: 11
              }, this),
              /* @__PURE__ */ jsxDEV("button", { type: "button", disabled: !snapshot.history.canRedo, title: snapshot.history.redoLabel || "Redo", "aria-label": "Redo", onClick: () => store.redo(), children: /* @__PURE__ */ jsxDEV("span", { "aria-hidden": "true", children: "↷" }, void 0, false, {
                fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
                lineNumber: 2225,
                columnNumber: 162
              }, this) }, void 0, false, {
                fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
                lineNumber: 2225,
                columnNumber: 11
              }, this),
              /* @__PURE__ */ jsxDEV("button", { type: "button", className: pathVisible ? "is-active" : "", onClick: () => setPathVisible(!pathVisible), children: "Path" }, void 0, false, {
                fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
                lineNumber: 2226,
                columnNumber: 11
              }, this),
              /* @__PURE__ */ jsxDEV("button", { type: "button", className: directorView ? "is-active" : "", onClick: toggleDirector, children: directorView ? "Director" : "Camera" }, void 0, false, {
                fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
                lineNumber: 2227,
                columnNumber: 11
              }, this),
              /* @__PURE__ */ jsxDEV("button", { type: "button", className: snapshot.tryState?.label === "Compare saved source" ? "is-active" : "", disabled: snapshot.tryState && snapshot.tryState.label !== "Compare saved source", onClick: toggleBefore, children: snapshot.tryState?.label === "Compare saved source" ? "Before" : "After" }, void 0, false, {
                fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
                lineNumber: 2228,
                columnNumber: 11
              }, this),
              /* @__PURE__ */ jsxDEV("details", { className: "about-editor-more", children: [
                /* @__PURE__ */ jsxDEV("summary", { children: "More" }, void 0, false, {
                  fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
                  lineNumber: 2230,
                  columnNumber: 13
                }, this),
                /* @__PURE__ */ jsxDEV("div", { children: [
                  /* @__PURE__ */ jsxDEV("button", { type: "button", onClick: addCheckpoint, children: "Checkpoint" }, void 0, false, {
                    fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
                    lineNumber: 2232,
                    columnNumber: 15
                  }, this),
                  /* @__PURE__ */ jsxDEV("button", { type: "button", onClick: () => exportAboutNarrativeDocument(snapshot.document), children: "Export JSON" }, void 0, false, {
                    fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
                    lineNumber: 2233,
                    columnNumber: 15
                  }, this),
                  /* @__PURE__ */ jsxDEV("button", { type: "button", onClick: () => importRef.current?.click(), children: "Import JSON" }, void 0, false, {
                    fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
                    lineNumber: 2234,
                    columnNumber: 15
                  }, this)
                ] }, void 0, true, {
                  fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
                  lineNumber: 2231,
                  columnNumber: 13
                }, this)
              ] }, void 0, true, {
                fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
                lineNumber: 2229,
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
                lineNumber: 2237,
                columnNumber: 11
              }, this),
              /* @__PURE__ */ jsxDEV("button", { type: "button", "data-about-editor-save": true, className: "is-save", disabled: snapshot.saveState.status === "saving", onClick: save, children: [
                /* @__PURE__ */ jsxDEV("span", { children: statusLabel }, void 0, false, {
                  fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
                  lineNumber: 2247,
                  columnNumber: 141
                }, this),
                /* @__PURE__ */ jsxDEV("kbd", { children: "⌘S" }, void 0, false, {
                  fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
                  lineNumber: 2247,
                  columnNumber: 167
                }, this)
              ] }, void 0, true, {
                fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
                lineNumber: 2247,
                columnNumber: 11
              }, this)
            ] }, void 0, true, {
              fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
              lineNumber: 2223,
              columnNumber: 9
            }, this)
          ] }, void 0, true, {
            fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
            lineNumber: 2220,
            columnNumber: 7
          }, this),
          snapshot.recoveryState.available ? /* @__PURE__ */ jsxDEV("div", { className: "about-editor-recovery", children: [
            /* @__PURE__ */ jsxDEV("span", { children: [
              "An unsaved draft from ",
              new Date(snapshot.recoveryState.draft.timestamp).toLocaleString(),
              " is available."
            ] }, void 0, true, {
              fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
              lineNumber: 2251,
              columnNumber: 82
            }, this),
            /* @__PURE__ */ jsxDEV("button", { type: "button", onClick: () => {
              store.replaceDocument("Recover draft", snapshot.recoveryState.draft.document);
              store.setRecoveryState({ available: false });
            }, children: "Recover as unsaved copy" }, void 0, false, {
              fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
              lineNumber: 2251,
              columnNumber: 198
            }, this),
            /* @__PURE__ */ jsxDEV("button", { type: "button", onClick: () => {
              exportAboutNarrativeDocument(snapshot.recoveryState.draft.document, "contents-about-recovered.json");
            }, children: "Export" }, void 0, false, {
              fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
              lineNumber: 2251,
              columnNumber: 394
            }, this),
            /* @__PURE__ */ jsxDEV("button", { type: "button", onClick: () => {
              clearAboutNarrativeRecoveryDraft();
              store.setRecoveryState({ available: false });
            }, children: "Discard" }, void 0, false, {
              fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
              lineNumber: 2251,
              columnNumber: 551
            }, this)
          ] }, void 0, true, {
            fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
            lineNumber: 2251,
            columnNumber: 43
          }, this) : null,
          snapshot.saveState.message ? /* @__PURE__ */ jsxDEV("div", { className: `about-editor-save-message is-${snapshot.saveState.status}`, children: [
            snapshot.saveState.message,
            /* @__PURE__ */ jsxDEV("button", { type: "button", "aria-label": "Dismiss message", onClick: () => store.setSaveState({ message: "" }), children: "×" }, void 0, false, {
              fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
              lineNumber: 2252,
              columnNumber: 142
            }, this)
          ] }, void 0, true, {
            fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
            lineNumber: 2252,
            columnNumber: 37
          }, this) : null,
          pathVisible ? /* @__PURE__ */ jsxDEV(CameraPathOverlay, { snapshot }, void 0, false, {
            fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
            lineNumber: 2254,
            columnNumber: 22
          }, this) : null,
          directorView ? /* @__PURE__ */ jsxDEV("div", { className: "about-editor-director-controls", children: [
            /* @__PURE__ */ jsxDEV("strong", { children: "Director View" }, void 0, false, {
              fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
              lineNumber: 2255,
              columnNumber: 71
            }, this),
            /* @__PURE__ */ jsxDEV("button", { type: "button", onClick: () => runtimeRef.current?.nudgeDirector?.({ yaw: -0.08 }), children: "←" }, void 0, false, {
              fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
              lineNumber: 2255,
              columnNumber: 101
            }, this),
            /* @__PURE__ */ jsxDEV("button", { type: "button", onClick: () => runtimeRef.current?.nudgeDirector?.({ pitch: 0.08 }), children: "↑" }, void 0, false, {
              fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
              lineNumber: 2255,
              columnNumber: 201
            }, this),
            /* @__PURE__ */ jsxDEV("button", { type: "button", onClick: () => runtimeRef.current?.nudgeDirector?.({ pitch: -0.08 }), children: "↓" }, void 0, false, {
              fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
              lineNumber: 2255,
              columnNumber: 302
            }, this),
            /* @__PURE__ */ jsxDEV("button", { type: "button", onClick: () => runtimeRef.current?.nudgeDirector?.({ yaw: 0.08 }), children: "→" }, void 0, false, {
              fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
              lineNumber: 2255,
              columnNumber: 404
            }, this),
            /* @__PURE__ */ jsxDEV("button", { type: "button", onClick: () => runtimeRef.current?.nudgeDirector?.({ distance: -0.2 }), children: "＋" }, void 0, false, {
              fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
              lineNumber: 2255,
              columnNumber: 503
            }, this),
            /* @__PURE__ */ jsxDEV("button", { type: "button", onClick: () => runtimeRef.current?.nudgeDirector?.({ distance: 0.2 }), children: "−" }, void 0, false, {
              fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
              lineNumber: 2255,
              columnNumber: 607
            }, this),
            /* @__PURE__ */ jsxDEV("button", { type: "button", onClick: () => runtimeRef.current?.resetDirector?.(), children: "Reset" }, void 0, false, {
              fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
              lineNumber: 2255,
              columnNumber: 710
            }, this),
            /* @__PURE__ */ jsxDEV("small", { children: "Temporary inspection only. Published Camera keys are unchanged." }, void 0, false, {
              fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
              lineNumber: 2255,
              columnNumber: 800
            }, this)
          ] }, void 0, true, {
            fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
            lineNumber: 2255,
            columnNumber: 23
          }, this) : null,
          /* @__PURE__ */ jsxDEV(Inspector, { store, snapshot, timelineOpen, runtimeMetrics, clipboard, setClipboard }, void 0, false, {
            fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
            lineNumber: 2257,
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
                  lineNumber: 2265,
                  columnNumber: 25
                }, this) : /* @__PURE__ */ jsxDEV(ChevronUp, { "aria-hidden": "true" }, void 0, false, {
                  fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
                  lineNumber: 2265,
                  columnNumber: 62
                }, this),
                /* @__PURE__ */ jsxDEV("span", { children: timelineOpen ? "Hide timeline" : "Show timeline" }, void 0, false, {
                  fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
                  lineNumber: 2265,
                  columnNumber: 95
                }, this)
              ]
            },
            void 0,
            true,
            {
              fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
              lineNumber: 2258,
              columnNumber: 7
            },
            this
          ),
          /* @__PURE__ */ jsxDEV("div", { id: "about-editor-timeline-panel", className: "about-editor-bottom", "aria-hidden": !timelineOpen, children: [
            /* @__PURE__ */ jsxDEV("div", { className: "about-editor-contextbar", children: [
              /* @__PURE__ */ jsxDEV("span", { children: [
                /* @__PURE__ */ jsxDEV("strong", { children: selected?.label || "Sequence" }, void 0, false, {
                  fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
                  lineNumber: 2268,
                  columnNumber: 17
                }, this),
                " ",
                selected ? `${selected.type} · ${formatWU(Math.max(0, selectedExtent - 1))} scroll · ${formatWU(selectedExtent)} total${resolvedExtent > selectedExtent + 1e-3 ? ` · ${formatWU(resolvedExtent)} resolved` : ""}` : ""
              ] }, void 0, true, {
                fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
                lineNumber: 2268,
                columnNumber: 11
              }, this),
              selectedCueCount > 1 ? /* @__PURE__ */ jsxDEV("span", { className: "about-editor-selection-count", children: [
                selectedCueCount,
                " titles selected"
              ] }, void 0, true, {
                fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
                lineNumber: 2269,
                columnNumber: 35
              }, this) : null,
              /* @__PURE__ */ jsxDEV("span", { children: snapshot.autoKey ? "Auto-key armed" : "Auto-key off" }, void 0, false, {
                fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
                lineNumber: 2270,
                columnNumber: 11
              }, this),
              /* @__PURE__ */ jsxDEV("button", { type: "button", className: snapshot.autoKey ? "is-active" : "", onClick: () => store.setAutoKey(!snapshot.autoKey), children: "◆ Auto-key" }, void 0, false, {
                fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
                lineNumber: 2271,
                columnNumber: 11
              }, this),
              /* @__PURE__ */ jsxDEV("button", { type: "button", className: loopActive ? "is-active" : "", onClick: toggleLoop, children: loopActive ? "Stop audition" : "Loop Section" }, void 0, false, {
                fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
                lineNumber: 2272,
                columnNumber: 11
              }, this),
              /* @__PURE__ */ jsxDEV("button", { type: "button", onClick: fitSequence, children: "Fit sequence" }, void 0, false, {
                fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
                lineNumber: 2273,
                columnNumber: 11
              }, this),
              /* @__PURE__ */ jsxDEV("button", { type: "button", disabled: !compiledSelected, onClick: fitSection, children: "Fit Section" }, void 0, false, {
                fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
                lineNumber: 2274,
                columnNumber: 11
              }, this),
              ["camera", "world", "text"].map((track) => /* @__PURE__ */ jsxDEV("button", { type: "button", className: snapshot.transport.soloTrack === track ? "is-active" : "", onClick: () => toggleSolo(track), children: [
                "Solo ",
                track
              ] }, track, true, {
                fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
                lineNumber: 2275,
                columnNumber: 55
              }, this)),
              timelineDeletion ? /* @__PURE__ */ jsxDEV("button", { type: "button", className: "about-editor-delete-key", disabled: timelineDeletion.disabled, title: timelineDeletion.message || `${timelineDeletion.label} · Delete/Backspace`, onClick: () => deleteTimelineSelection(store, snapshot), children: [
                /* @__PURE__ */ jsxDEV(Trash2, { "aria-hidden": "true" }, void 0, false, {
                  fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
                  lineNumber: 2276,
                  columnNumber: 266
                }, this),
                timelineDeletion.label
              ] }, void 0, true, {
                fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
                lineNumber: 2276,
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
                lineNumber: 2277,
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
                  lineNumber: 2278,
                  columnNumber: 369
                }, this),
                checkpoints.map((item) => /* @__PURE__ */ jsxDEV("option", { value: item.id, children: item.name }, item.id, false, {
                  fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
                  lineNumber: 2278,
                  columnNumber: 456
                }, this))
              ] }, void 0, true, {
                fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
                lineNumber: 2278,
                columnNumber: 33
              }, this) : null
            ] }, void 0, true, {
              fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
              lineNumber: 2267,
              columnNumber: 9
            }, this),
            /* @__PURE__ */ jsxDEV(Timeline, { store, snapshot }, void 0, false, {
              fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
              lineNumber: 2280,
              columnNumber: 9
            }, this)
          ] }, void 0, true, {
            fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
            lineNumber: 2266,
            columnNumber: 7
          }, this),
          /* @__PURE__ */ jsxDEV("nav", { className: "about-editor-mobile-tabs", "aria-label": "Editor panel", children: [
            /* @__PURE__ */ jsxDEV("button", { type: "button", className: mobilePane === "sequence" ? "is-active" : "", onClick: () => setMobilePane("sequence"), children: "Sequence" }, void 0, false, {
              fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
              lineNumber: 2282,
              columnNumber: 75
            }, this),
            /* @__PURE__ */ jsxDEV("button", { type: "button", className: mobilePane === "inspect" ? "is-active" : "", onClick: () => setMobilePane("inspect"), children: "Inspect" }, void 0, false, {
              fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
              lineNumber: 2282,
              columnNumber: 213
            }, this),
            /* @__PURE__ */ jsxDEV("button", { type: "button", className: mobilePane === "preview" ? "is-active" : "", onClick: () => setMobilePane("preview"), children: "Preview" }, void 0, false, {
              fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
              lineNumber: 2282,
              columnNumber: 348
            }, this)
          ] }, void 0, true, {
            fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
            lineNumber: 2282,
            columnNumber: 7
          }, this)
        ]
      },
      void 0,
      true,
      {
        fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
        lineNumber: 2213,
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

//# sourceMappingURL=data:application/json;base64,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QTZCLE1BQUF1QyxNQUFBTSxNQUFBeUssTUFBQUMsTUFBQTVILE1BQUE2SDtBQUFBLGFBQUExaEIsSUFBQTtBQUFBLGFBQUFLLEtBQUE7QUFBQSxhQUFBVSxLQUFBO0FBQUEsYUFBQVksS0FBQTtBQUFBLGFBQUEyZixLQUFBO0FBQUEsYUFBQWxVLEtBQUE7QUFBQSxhQUFBaUIsS0FBQTtBQUFBLGFBQUFrQixLQUFBO0FBQUEsYUFBQWdTLEtBQUE7QUFBQSxhQUFBM1AsS0FBQTtBQUFBLGFBQUFTLEtBQUE7QUFBQSxhQUFBNkIsTUFBQTtBQUFBLGFBQUF1QyxNQUFBO0FBQUEsYUFBQU0sTUFBQTtBQUFBLGFBQUF5SyxNQUFBO0FBQUEsYUFBQUMsTUFBQTtBQUFBLGFBQUE1SCxNQUFBO0FBQUEsYUFBQTZILE1BQUEiLCJuYW1lcyI6WyJ1c2VFZmZlY3QiLCJ1c2VSZWYiLCJ1c2VTdGF0ZSIsInVzZVN5bmNFeHRlcm5hbFN0b3JlIiwiY3JlYXRlUG9ydGFsIiwiQ2hlY2siLCJDaGV2cm9uRG93biIsIkNoZXZyb25MZWZ0IiwiQ2hldnJvblJpZ2h0IiwiQ2hldnJvblVwIiwiQ2lyY2xlQWxlcnQiLCJEaWFtb25kIiwiSW5mbyIsIkxvY2tLZXlob2xlIiwiUGF1c2UiLCJQbGF5IiwiU2tpcEJhY2siLCJTa2lwRm9yd2FyZCIsIlRyYXNoMiIsIkFCT1VUX05BUlJBVElWRV9HTE9CQUxfQ09OVFJPTFMiLCJBQk9VVF9OQVJSQVRJVkVfQ09SUkVTUE9OREVOQ0VfTU9ERVMiLCJBQk9VVF9OQVJSQVRJVkVfRElTQ0lQTElORV9SRVZFQUxfQ09OVFJPTFMiLCJBQk9VVF9OQVJSQVRJVkVfRU1QSEFTSVNfVE9ORVMiLCJBQk9VVF9OQVJSQVRJVkVfTU9ESUZJRVJfREVGSU5JVElPTlMiLCJBQk9VVF9OQVJSQVRJVkVfU0hBUEVfREVGSU5JVElPTlMiLCJjbGVhckFib3V0TmFycmF0aXZlUmVjb3ZlcnlEcmFmdCIsImV4cG9ydEFib3V0TmFycmF0aXZlRG9jdW1lbnQiLCJsb2FkQWJvdXROYXJyYXRpdmVTb3VyY2UiLCJyZWFkQWJvdXROYXJyYXRpdmVDaGVja3BvaW50cyIsInJlYWRBYm91dE5hcnJhdGl2ZVJlY292ZXJ5RHJhZnQiLCJzYXZlQWJvdXROYXJyYXRpdmVTb3VyY2UiLCJ3cml0ZUFib3V0TmFycmF0aXZlQ2hlY2twb2ludCIsIndyaXRlQWJvdXROYXJyYXRpdmVSZWNvdmVyeURyYWZ0IiwiYXNzZXJ0VmFsaWRBYm91dE5hcnJhdGl2ZURvY3VtZW50IiwiY2xvbmVBYm91dE5hcnJhdGl2ZURvY3VtZW50IiwiZ2V0QWJvdXROYXJyYXRpdmVDdWVNb3ZlbWVudCIsImdldEFib3V0TmFycmF0aXZlQ3VlTW90aW9uSW50ZXJ2YWwiLCJnZXRBYm91dE5hcnJhdGl2ZVdvcmxkVHJhbnNpdGlvbkxpbWl0Iiwic2FtcGxlQWJvdXROYXJyYXRpdmVQbGFuIiwiY2FwdHVyZUFib3V0TmFycmF0aXZlUGxheWhlYWRDb250ZXh0IiwiY3JlYXRlQWJvdXROYXJyYXRpdmVDdWVDbGlwYm9hcmRQYXlsb2FkIiwiZGVyaXZlQWJvdXROYXJyYXRpdmVMb29wUmFuZ2UiLCJkdXBsaWNhdGVBYm91dE5hcnJhdGl2ZUN1ZUdyb3VwIiwiZHVwbGljYXRlQWJvdXROYXJyYXRpdmVTZWN0aW9uIiwiZ2V0QWJvdXROYXJyYXRpdmVDYW1lcmFLZXlUaW1pbmdCb3VuZHMiLCJnZXRBYm91dE5hcnJhdGl2ZUN1ZVRpbWluZ0JvdW5kcyIsImdldEFib3V0TmFycmF0aXZlRXh0ZW50RmllbGQiLCJnZXRBYm91dE5hcnJhdGl2ZVNlbGVjdGlvbk1lbWJlcnMiLCJtb3ZlQWJvdXROYXJyYXRpdmVDdWVUaW1pbmciLCJyZW1hcEFib3V0TmFycmF0aXZlUGxheWhlYWRDb250ZXh0IiwicmVzb2x2ZUFib3V0TmFycmF0aXZlQ2FtZXJhS2V5RHJvcCIsInJlc29sdmVBYm91dE5hcnJhdGl2ZUN1ZURpc3RyaWJ1dGlvbiIsInJlc29sdmVBYm91dE5hcnJhdGl2ZUN1ZUV4YWN0R2FwIiwicmVzb2x2ZUFib3V0TmFycmF0aXZlQ3VlR3JvdXBNb3ZlIiwicmVzb2x2ZUFib3V0TmFycmF0aXZlQ3VlR3JvdXBBbGlnbiIsInJlc29sdmVBYm91dE5hcnJhdGl2ZUN1ZUdyb3VwUGFzdGUiLCJzbmFwQWJvdXROYXJyYXRpdmVUaW1lbGluZVZhbHVlIiwic3RpdGNoQWJvdXROYXJyYXRpdmVDYW1lcmFCb3VuZGFyaWVzIiwidG9nZ2xlQWJvdXROYXJyYXRpdmVDdWVTZWxlY3Rpb24iLCJ2YWxpZGF0ZUFib3V0TmFycmF0aXZlQ3VlQ2xpcGJvYXJkUGF5bG9hZCIsImNsYW1wMDEiLCJ2YWx1ZSIsIk1hdGgiLCJtaW4iLCJtYXgiLCJBQk9VVF9FRElUT1JfVElNRUxJTkVfU1RPUkFHRV9LRVkiLCJUSU1FTElORV9LRVlfRVBTSUxPTiIsIklOU1BFQ1RPUl9FREdFX0dBUCIsIkNBTUVSQV9QT1NFX0ZJRUxEUyIsIlNldCIsIkRJU0NJUExJTkVfUkVWRUFMX01BWCIsImZpbmQiLCJjb250cm9sIiwiaWQiLCJESVNDSVBMSU5FX0JBTExfVE9LRU5fQllfR1JPVVAiLCJPYmplY3QiLCJmcmVlemUiLCJUSU1FTElORV9HTE9CQUxfVFJBQ0tTIiwibGFuZSIsImxhYmVsIiwiZ3JvdXBJZHMiLCJjYW1lcmFQb3NlQ2hhbmdlcyIsImZyb20iLCJ0byIsInNvbWUiLCJmaWVsZCIsImluZGV4IiwiYWJzIiwiZm92Iiwicm9sbCIsImNvcHlDYW1lcmFQb3NlIiwidGFyZ2V0Iiwic291cmNlIiwib2Zmc2V0IiwibG9va0F0T2Zmc2V0IiwibGlua0NhbWVyYUJvdW5kYXJ5IiwiZG9jdW1lbnQiLCJzZWN0aW9uSW5kZXgiLCJrZXlJbmRleCIsInNlY3Rpb24iLCJzZWN0aW9ucyIsImtleSIsImNhbWVyYSIsImtleXMiLCJhdCIsImxlbmd0aCIsImJyaWRnZUNhbWVyYVNlY3Rpb24iLCJnZXRJbnNwZWN0b3JWZXJ0aWNhbEJvdW5kcyIsImluc3BlY3RvciIsInRpbWVsaW5lT3BlbiIsImVkaXRvciIsImNsb3Nlc3QiLCJzdHlsZXMiLCJnZXRDb21wdXRlZFN0eWxlIiwidG9wYmFySGVpZ2h0IiwiTnVtYmVyIiwicGFyc2VGbG9hdCIsImdldFByb3BlcnR5VmFsdWUiLCJ0aW1lbGluZUhlaWdodCIsImJ1dHRvbkJhclRvcCIsInF1ZXJ5U2VsZWN0b3IiLCJnZXRCb3VuZGluZ0NsaWVudFJlY3QiLCJ0b3AiLCJ3aW5kb3ciLCJpbm5lckhlaWdodCIsIm1pblRvcCIsIm1heEJvdHRvbSIsImNsYW1wSW5zcGVjdG9yUG9zaXRpb24iLCJwb3NpdGlvbiIsIm1heFdpZHRoIiwiaW5uZXJXaWR0aCIsIndpZHRoIiwiYXZhaWxhYmxlSGVpZ2h0IiwiaGVpZ2h0IiwibWF4TGVmdCIsIm1heFRvcCIsImxlZnQiLCJnZXRTZWN0aW9uSW5kZXgiLCJzZWN0aW9uSWQiLCJmaW5kSW5kZXgiLCJnZXRTZWN0aW9uIiwic2VsZWN0aW9uIiwiZ2V0TG9jYWxQcm9ncmVzcyIsInBsYW4iLCJzdG9yeVdVIiwiY29tcGlsZWQiLCJpdGVtIiwic3RhcnRXVSIsInRyYXZlbFdVIiwiZm9ybWF0V1UiLCJ0b0ZpeGVkIiwiZm9ybWF0Q2FtZXJhUGVyY2VudCIsImlzVGV4dEVkaXRpbmdUYXJnZXQiLCJIVE1MRWxlbWVudCIsIm1hdGNoZXMiLCJpc0NvbnRlbnRFZGl0YWJsZSIsImdldFRpbWVsaW5lS2V5ZnJhbWVzIiwic25hcHNob3QiLCJjb21waWxlZFBsYW4iLCJldmVudHMiLCJmb3JFYWNoIiwidG9TdG9yeVdVIiwicHVzaCIsInByaW9yaXR5IiwidHlwZSIsIndvcmxkIiwibW9kZSIsInRyYW5zaXRpb25JbiIsInBhcnQiLCJwYXJ0SW5kZXgiLCJrZXlQYXJ0IiwidGV4dCIsImN1ZXMiLCJjdWUiLCJjdWVJbmRleCIsImhvbGQiLCJjdWVJZCIsImRpc2NpcGxpbmVSZXZlYWwiLCJzdGFydCIsImludGVyYWN0aW9uIiwiaXNGaW5pdGUiLCJhY3RpdmF0aW9uU3RhcnQiLCJzb3J0IiwiYSIsImIiLCJnZXRUaW1lbGluZURlbGV0aW9uIiwicmVxdWlyZWQiLCJkaXNhYmxlZCIsIm1lc3NhZ2UiLCJleGVjdXRlIiwic3RvcmUiLCJjb21taXQiLCJkcmFmdCIsInNwbGljZSIsInN0YXJ0c1dpdGgiLCJ0cmFuc2l0aW9uIiwiZW5kIiwiZGVsZXRlVGltZWxpbmVTZWxlY3Rpb24iLCJkZWxldGlvbiIsInNldFNhdmVTdGF0ZSIsInNlZWtUaW1lbGluZUtleWZyYW1lIiwiZXZlbnQiLCJzZXRTZWxlY3Rpb24iLCJzZXRUcmFuc3BvcnQiLCJvd25lciIsInBsYXlpbmciLCJqdW1wVGltZWxpbmVLZXlmcmFtZSIsImRpcmVjdGlvbiIsImN1cnJlbnRXVSIsInRyYW5zcG9ydCIsInRhcmdldFBvc2l0aW9uIiwicmV2ZXJzZSIsIm1ha2VTbHVnIiwidG9Mb3dlckNhc2UiLCJyZXBsYWNlIiwibmV4dElkIiwiYmFzZSIsInVzZWQiLCJmbGF0TWFwIiwibWFwIiwiYmxvY2tzIiwiYmxvY2siLCJzdWZmaXgiLCJoYXMiLCJyZXBsYWNlRHJhZnREb2N1bWVudCIsIm5leHREb2N1bWVudCIsImFzc2lnbiIsImFwcGx5Q3VlTW92ZXMiLCJtb3ZlcyIsIm1vdmUiLCJlbnRlciIsImV4aXQiLCJQcm9wZXJ0eSIsImNoaWxkcmVuIiwiaGludCIsIl9jIiwiTnVtYmVyUHJvcGVydHkiLCJzdGVwIiwib25DaGFuZ2UiLCJ1bml0IiwiX2MyIiwiUmFuZ2VQcm9wZXJ0eSIsIm9uU3RhcnRDaGFuZ2UiLCJvbkVuZENoYW5nZSIsInN0YXJ0UGVyY2VudCIsImVuZFBlcmNlbnQiLCJwZXJjZW50YWdlU3RlcCIsInNldFN0YXJ0Iiwic2V0RW5kIiwicm91bmQiLCJfYzMiLCJUcmFuc3BvcnQiLCJtYXhXVSIsIm1heFN0b3J5V1UiLCJwbGF5Iiwic2VlayIsInNlbGVjdGVkIiwianVtcFNlY3Rpb24iLCJuZXh0IiwibGl2ZUFtYmllbnQiLCJwcmV2aWV3UHJvZmlsZSIsInNldFByZXZpZXdQcm9maWxlIiwiX2M0IiwiVGltZWxpbmUiLCJvbk9wZW5HbG9iYWwiLCJfcyIsInNlbGVjdGVkQ3VlTWVtYmVycyIsInJlZHVjZSIsInN1bSIsImV4dGVudFdVIiwicGxheWhlYWQiLCJsYW5lc1JlZiIsInRpbWluZ0RyYWdSZWYiLCJwcmV2aWV3RnJhbWVSZWYiLCJwZW5kaW5nUHJldmlld1JlZiIsInN1cHByZXNzZWRDbGlja1JlZiIsImNhbWVyYURyYWdQcmV2aWV3Iiwic2V0Q2FtZXJhRHJhZ1ByZXZpZXciLCJzZWN0aW9uUmVzaXplUHJldmlldyIsInNldFNlY3Rpb25SZXNpemVQcmV2aWV3IiwibWFycXVlZSIsInNldE1hcnF1ZWUiLCJxdWV1ZVByZXZpZXdGcmFtZSIsImNhbGxiYWNrIiwiY3VycmVudCIsInJlcXVlc3RBbmltYXRpb25GcmFtZSIsInBlbmRpbmciLCJmbHVzaFByZXZpZXdGcmFtZSIsImNhbmNlbEFuaW1hdGlvbkZyYW1lIiwiem9vbVRpbWVsaW5lIiwiY3RybEtleSIsIm1ldGFLZXkiLCJwcmV2ZW50RGVmYXVsdCIsImxhbmVzIiwicmVjdCIsInBvaW50ZXJYIiwiY2xpZW50WCIsInN0b3J5UmF0aW8iLCJzY3JvbGxMZWZ0Iiwic2Nyb2xsV2lkdGgiLCJjdXJyZW50Wm9vbSIsInpvb20iLCJuZXh0Wm9vbSIsImV4cCIsImRlbHRhWSIsInJlc29sdmVDYW1lcmFEcm9wQXRDbGllbnRYIiwiZ2V0U25hcHNob3QiLCJ2YWxpZCIsInJlYXNvbiIsImNvbnRlbnRYIiwiZHJhZyIsImRyb3AiLCJzb3VyY2VTZWN0aW9uSW5kZXgiLCJzb3VyY2VLZXlJbmRleCIsImJlZ2luVGltaW5nRHJhZyIsImxvY2tlZCIsImJ1dHRvbiIsImNsaXAiLCJjdXJyZW50VGFyZ2V0IiwicGFyZW50RWxlbWVudCIsInN0b3BQcm9wYWdhdGlvbiIsInNldFBvaW50ZXJDYXB0dXJlIiwicG9pbnRlcklkIiwibmV4dFNlbGVjdGlvbiIsImN1cnJlbnRTZWxlY3Rpb24iLCJjdXJyZW50TWVtYmVycyIsImFscmVhZHlTZWxlY3RlZCIsIm1lbWJlciIsInNoaWZ0S2V5IiwibWVtYmVycyIsImJlZ2luUHJldmlldyIsInN0YXJ0RG9jdW1lbnQiLCJzdGFydFBsYW4iLCJzdGFydFgiLCJtb3ZlZCIsImxhc3RBdCIsImxhc3REcm9wIiwibW92ZVRpbWluZ0RyYWciLCJ0b2tlbiIsImRlbHRhTGFuZSIsIm5leHRBdCIsImRlbHRhIiwicmV2ZWFsIiwiY29hbGVzY2VLZXkiLCJzZWN0aW9uU3RhcnRXVSIsImxvY2FsRGVsdGEiLCJtb3ZlbWVudCIsInByaW1hcnkiLCJkZWx0YVdVIiwibGFzdERlbHRhV1UiLCJ1cGRhdGVQcmV2aWV3IiwiZW5kVGltaW5nRHJhZyIsImhhc1BvaW50ZXJDYXB0dXJlIiwicmVsZWFzZVBvaW50ZXJDYXB0dXJlIiwiY2FuY2VsUHJldmlldyIsImNvbW1pdFByZXZpZXciLCJzb3VyY2VLZXlzIiwibW92ZWRLZXkiLCJkZXN0aW5hdGlvbktleXMiLCJzZXRUaW1lb3V0IiwiaGFuZGxlVGltaW5nQ2xpY2siLCJhY3Rpb24iLCJiZWdpblNlY3Rpb25SZXNpemUiLCJkYXRhIiwic2VjdGlvbkxhYmVsIiwic3RhcnRFeHRlbnQiLCJzdGFydE1heFdVIiwic3RhcnRTY3JvbGxXaWR0aCIsInBsYXloZWFkQ29udGV4dCIsInJlc2l6ZWRTZWN0aW9uSWQiLCJleHRlbnQiLCJtb3ZlU2VjdGlvblJlc2l6ZSIsInJhd0V4dGVudCIsImFsdEtleSIsImxhc3RFeHRlbnQiLCJlbmRTZWN0aW9uUmVzaXplIiwicmVzZXRTZWN0aW9uRXh0ZW50IiwiYmFzZWxpbmVTZWN0aW9uIiwiYmFzZWxpbmVEb2N1bWVudCIsImNvbnRleHQiLCJiZWdpbk1hcnF1ZWUiLCJjYW52YXMiLCJzdGFydENsaWVudFgiLCJzdGFydENsaWVudFkiLCJjbGllbnRZIiwiY2FudmFzUmVjdCIsImFkZGl0aXZlIiwibW92ZU1hcnF1ZWUiLCJlbmRNYXJxdWVlIiwic2VsZWN0aW9uUmVjdCIsInJpZ2h0IiwiYm90dG9tIiwibGFuZVJlY3QiLCJoaXRzIiwicXVlcnlTZWxlY3RvckFsbCIsImZpbHRlciIsIm5vZGUiLCJ2aXNpYmxlIiwiZGF0YXNldCIsInNsaWNlIiwiaGl0IiwidHJhY2siLCJ0cmFja0xhYmVsIiwic29sb1RyYWNrIiwibmV4dFN0YXJ0V1UiLCJzcGFuV1UiLCJpblNlbGVjdGVkU2VjdGlvbiIsImxvY2FsUGVyY2VudCIsImxvY2FsUG9zaXRpb24iLCJleHRlbmRlZExvY2FsUG9zaXRpb24iLCJleHRlbmRlZExvY2FsV2lkdGgiLCJ0ZXh0UG9zaXRpb24iLCJzZWxlY3RBdCIsImlzU2VsZWN0ZWQiLCJyZXNpemVFeHRlbnQiLCJyZXNvbHZlZEV4dGVudFdVIiwiU3RyaW5nIiwicGFkU3RhcnQiLCJmcm9tS2V5IiwidGltaW5nQm91bmRzIiwia2V5U2VsZWN0aW9uIiwidW5kZWZpbmVkIiwic2hhcGVJZCIsImlzUHJpbWFyeSIsIm1vdGlvbkludGVydmFsIiwiZ2xvYmFscyIsInRleHRNb3Rpb24iLCJtb3Rpb25TcGFuIiwiY3VlU3R5bGUiLCJmb2N1c1Bvc2l0aW9uIiwiY3VlU2VsZWN0aW9uIiwiY29kZSIsImR1cmF0aW9uIiwiY2VudHJlIiwicmV2ZWFsU2VsZWN0aW9uIiwiYWN0aXZhdGlvbiIsIlNlcXVlbmNlSW5zcGVjdG9yIiwiY29tbWl0R2xvYmFsIiwiZ3JvdXAiLCJ0YXJnZXRLZXkiLCJyZXF1ZXN0ZWRHcm91cElkcyIsImdyb3VwcyIsImluY2x1ZGVzIiwiaGVhZGluZyIsImNvbnRyb2xzIiwicmVhZGFibGVTdGFydCIsInJlYWRhYmxlRW5kIiwiX2M2IiwiU2VjdGlvbkluc3BlY3RvciIsImNvbXBpbGVkU2VjdGlvbiIsImFjdGl2ZUV4dGVudEZpZWxkIiwiYWN0aXZlRXh0ZW50IiwicmVzb2x2ZWRFeHRlbnQiLCJjb250ZW50TWluaW11bUFjdGl2ZSIsInVwZGF0ZSIsIm11dGF0ZSIsInRvSW5kZXgiLCJkdXBsaWNhdGUiLCJyZXN1bHQiLCJtb2JpbGVFeHRlbnRXVSIsImxvY2FsIiwiZm9jdXMiLCJwcmVzZXQiLCJtb3Rpb24iLCJfYzciLCJFZGl0b3JpYWxCbG9ja3MiLCJ1cGRhdGVCbG9jayIsImJsb2NrSW5kZXgiLCJ1cGRhdGVFbXBoYXNpcyIsImVtcGhhc2lzSW5kZXgiLCJlbXBoYXNpcyIsImFkZEVtcGhhc2lzIiwidHJpbSIsInNwbGl0Iiwiam9pbiIsInRvbmUiLCJyZW1vdmVFbXBoYXNpcyIsImtpbmQiLCJ3b3JsZEluZmx1ZW5jZSIsImNoZWNrZWQiLCJpdGVtcyIsIkJvb2xlYW4iLCJfYzgiLCJDdWVSaHl0aG1BbmRSZXVzZSIsImNsaXBib2FyZCIsInNldENsaXBib2FyZCIsIl9zMiIsImdhcFdVIiwic2V0R2FwV1UiLCJhbmNob3IiLCJzZXRBbmNob3IiLCJwcmV2aWV3Iiwic2V0UHJldmlldyIsInNldE1lc3NhZ2UiLCJwcmV2aWV3TW92ZXMiLCJ0cnlTdGF0ZSIsImNhbmNlbFRyeSIsImJlZ2luVHJ5IiwiYXBwbHlQcmV2aWV3IiwiYXBwbHlUcnkiLCJjb21taXRDYW5kaWRhdGUiLCJkaXN0cmlidXRlIiwiZXhhY3RHYXAiLCJhbGlnblByaW1hcnkiLCJwbGF5aGVhZFdVIiwiY29weSIsInBheWxvYWQiLCJ2YWxpZGF0aW9uIiwicGFzdGUiLCJkZXN0aW5hdGlvblNlY3Rpb25JZCIsImdob3N0TW92ZXMiLCJDdWVJbnNwZWN0b3IiLCJzZWxlY3RlZE1lbWJlcnMiLCJyZW1vdmUiLCJtb3ZlQ3VlIiwicGVyY2VudCIsInVwZGF0ZU1vdmVtZW50IiwibWVtYmVyU2VjdGlvbiIsIm1lbWJlckN1ZSIsIl9jMCIsIkRpc2NpcGxpbmVSZXZlYWxJbnNwZWN0b3IiLCJvY2N1cGllZCIsInN0YWdnZXIiLCJsYWJlbER1cmF0aW9uIiwibGltaXRzRm9yIiwibGltaXRzIiwiaXRlbUluZGV4IiwiYmFja2dyb3VuZCIsIl9jMSIsIkNhbWVyYUluc3BlY3RvciIsInNlbGVjdGVkS2V5IiwidGFyZ2V0QXQiLCJhcHBseVByZXNldCIsInJlY2lwZXMiLCJQdXNoIiwiZWFzaW5nIiwiR2xpZGUiLCJPcmJpdCIsIlJldmVhbCIsIlJlc29sdmUiLCJleGlzdGluZ0tleUF0UGxheWhlYWQiLCJzZXRLZXkiLCJpbnNlcnRpb25JbmRleCIsInNlbGVjdGVkS2V5SW5kZXgiLCJzYW1wbGVkIiwiYmFzZVoiLCJzdGFydFoiLCJjYWRlbmNlIiwibmV3S2V5IiwiYXhpcyIsIm5hbWUiLCJBcnJheSIsImlzQXJyYXkiLCJ1cGRhdGVWZWN0b3IiLCJleHRlbnRGaWVsZCIsImV4dGVudExhYmVsIiwidXBkYXRlRXh0ZW50IiwiX2MxMCIsIkNPUlJFU1BPTkRFTkNFX0xBQkVMUyIsIldvcmxkSW5zcGVjdG9yIiwicnVudGltZU1ldHJpY3MiLCJzaGFwZSIsInRyYW5zaXRpb25MaW1pdCIsInRyYW5zaXRpb25NYXgiLCJ0cmFuc2l0aW9uRW5hYmxlZCIsImNvcnJlc3BvbmRlbmNlRW5hYmxlZCIsInByZXZpb3VzV29ybGRTZWN0aW9uIiwic291cmNlU2hhcGUiLCJwcmVwYXJlZCIsInByZXBhcmVkV29ybGRJZHMiLCJjb3JyZXNwb25kZW5jZVN0YXR1cyIsImNvcnJlc3BvbmRlbmNlU2VxdWVuY2VTdGF0ZSIsImNvcnJlc3BvbmRlbmNlRmFsbGJhY2siLCJjb3JyZXNwb25kZW5jZVRvV29ybGRJZCIsInRyeVNoYXBlIiwic2hhcGVQYXJhbWV0ZXJzIiwiZnJvbUVudHJpZXMiLCJwYXJhbWV0ZXJzIiwidmFsdWVzIiwiY29zdCIsInNlZWQiLCJmbG9vciIsInJhbmRvbSIsImVudHJ5RGlzdGFuY2VXVSIsInRyYW5zZm9ybSIsInNjYWxlIiwiY29ycmVzcG9uZGVuY2UiLCJjb3JyZXNwb25kZW5jZUltcHJvdmVtZW50IiwibW9kaWZpZXJzIiwibW9kaWZpZXJJbmRleCIsImRlZmluaXRpb24iLCJtb3ZlTW9kaWZpZXIiLCJuZXh0SW5kZXgiLCJlbmFibGVkIiwib3B0aW9ucyIsIm9wdGlvbiIsIl9jMTEiLCJEaWFnbm9zdGljcyIsImRpYWdub3N0aWNzIiwiRGlhZ25vc3RpY0ljb24iLCJsZXZlbCIsInBhdGgiLCJfYzEyIiwiQXVkaXRpb25Db250cm9scyIsIl9zMyIsInByZVJvbGxXVSIsInNldFByZVJvbGxXVSIsInBvc3RSb2xsV1UiLCJzZXRQb3N0Um9sbFdVIiwicmFuZ2UiLCJhY3RpdmUiLCJsb29wIiwic291cmNlVHlwZSIsInNvdXJjZUlkIiwidG9nZ2xlIiwiZW5kV1UiLCJJbnNwZWN0b3IiLCJfczQiLCJpbnNwZWN0b3JSZWYiLCJkcmFnUmVmIiwibGFzdEhlYWRlckNsaWNrUmVmIiwic2V0UG9zaXRpb24iLCJkcmFnZ2luZyIsInNldERyYWdnaW5nIiwiY29udGVudCIsImtlZXBJbkJvdW5kcyIsImFkZEV2ZW50TGlzdGVuZXIiLCJyZW1vdmVFdmVudExpc3RlbmVyIiwiYmVnaW5EcmFnIiwiZmxvYXRpbmdIZWlnaHQiLCJvcmlnaW5YIiwib3JpZ2luWSIsIm1vdmVEcmFnIiwiZGVsdGFYIiwiaHlwb3QiLCJlbmREcmFnIiwibm93IiwicGVyZm9ybWFuY2UiLCJwcmV2aW91cyIsInRpbWUiLCJ4IiwieSIsInJlc2V0UG9zaXRpb24iLCJDYW1lcmFQYXRoT3ZlcmxheSIsInRvdGFsIiwid29ybGRTdGF0ZSIsImNoYW5nZXNXb3JsZCIsImFjdGl2ZVdvcmxkIiwiX2MxNSIsIkFib3V0TmFycmF0aXZlRWRpdG9yIiwicnVudGltZVJlZiIsInJvb3RSZWYiLCJfczUiLCJzdWJzY3JpYmUiLCJjaGVja3BvaW50cyIsInNldENoZWNrcG9pbnRzIiwic2V0UnVudGltZU1ldHJpY3MiLCJwYXRoVmlzaWJsZSIsInNldFBhdGhWaXNpYmxlIiwiZGlyZWN0b3JWaWV3Iiwic2V0RGlyZWN0b3JWaWV3IiwibW9iaWxlUGFuZSIsInNldE1vYmlsZVBhbmUiLCJzZXRUaW1lbGluZU9wZW4iLCJsb2NhbFN0b3JhZ2UiLCJnZXRJdGVtIiwiaW1wb3J0UmVmIiwic25hcHNob3RSZWYiLCJhY3RpdmVTZWxlY3Rpb24iLCJzZXRJdGVtIiwicm9vdCIsInJ1bnRpbWUiLCJzZXRBdHRyaWJ1dGUiLCJ0aGVuIiwiaGFzaCIsImRpcnR5IiwicmVwbGFjZURvY3VtZW50Iiwic2V0QmFzZWxpbmUiLCJyZWNvdmVyeSIsInRpbWVzdGFtcCIsIkRhdGUiLCJzZXRSZWNvdmVyeVN0YXRlIiwiYXZhaWxhYmxlIiwiZXJyb3IiLCJjYXRjaCIsInN0YXR1cyIsInJlbW92ZUF0dHJpYnV0ZSIsImNsYXNzTGlzdCIsIkNTUyIsImVzY2FwZSIsImFkZCIsImVkaXRvclNlbGVjdGlvblR5cGUiLCJpbnRlcnZhbCIsInNldEludGVydmFsIiwiZ2V0TWV0cmljcyIsImNsZWFySW50ZXJ2YWwiLCJ0aW1lciIsImJhc2VsaW5lSGFzaCIsImNsZWFyVGltZW91dCIsInBhZ2VoaWRlIiwia2V5ZG93biIsImNsaWNrIiwicmVkbyIsInVuZG8iLCJwcmV2aWV3U3RhdGUiLCJzYXZlIiwiZWRpdG9yVXJsIiwiVVJMIiwibG9jYXRpb24iLCJocmVmIiwic2VhcmNoUGFyYW1zIiwic2V0IiwiaGlzdG9yeSIsInJlcGxhY2VTdGF0ZSIsInN0YXRlIiwicGF0aG5hbWUiLCJzZWFyY2giLCJzZW50IiwibWFya1NhdmVkIiwiYWRkQ2hlY2twb2ludCIsImNoZWNrcG9pbnQiLCJjcnlwdG8iLCJyYW5kb21VVUlEIiwidG9Mb2NhbGVUaW1lU3RyaW5nIiwiaG91ciIsIm1pbnV0ZSIsImJhc2VTb3VyY2VIYXNoIiwic3RhdHVzTGFiZWwiLCJzYXZlU3RhdGUiLCJjb21waWxlZFNlbGVjdGVkIiwic2VsZWN0ZWRFeHRlbnQiLCJzZWxlY3RlZEN1ZUNvdW50IiwibG9vcEFjdGl2ZSIsInRpbWVsaW5lRGVsZXRpb24iLCJ0b2dnbGVMb29wIiwidG9nZ2xlU29sbyIsImZpdFNlcXVlbmNlIiwiZml0U2VjdGlvbiIsInNlY3Rpb25TcGFuIiwic3RhcnRSYXRpbyIsImNsaWVudFdpZHRoIiwidG9nZ2xlRGlyZWN0b3IiLCJ0b2dnbGVCZWZvcmUiLCJjYW5VbmRvIiwidW5kb0xhYmVsIiwiY2FuUmVkbyIsInJlZG9MYWJlbCIsImZpbGUiLCJmaWxlcyIsImltcG9ydGVkIiwiSlNPTiIsInBhcnNlIiwicmVjb3ZlcnlTdGF0ZSIsInRvTG9jYWxlU3RyaW5nIiwibnVkZ2VEaXJlY3RvciIsInlhdyIsInBpdGNoIiwiZGlzdGFuY2UiLCJyZXNldERpcmVjdG9yIiwib3BlbiIsImF1dG9LZXkiLCJzZXRBdXRvS2V5IiwiZnJhbWVUaW1lTXMiLCJkcmF3Q2FsbHMiLCJwb2ludENvdW50IiwiYWN0aXZlTW9kaWZpZXJzIiwiYnVmZmVyUmVidWlsZHMiLCJmb3VuZCIsImJvZHkiLCJfYzUiLCJfYzkiLCJfYzEzIiwiX2MxNCIsIl9jMTYiXSwiaWdub3JlTGlzdCI6W10sInNvdXJjZXMiOlsiQWJvdXROYXJyYXRpdmVFZGl0b3IuanN4Il0sInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7IHVzZUVmZmVjdCwgdXNlUmVmLCB1c2VTdGF0ZSwgdXNlU3luY0V4dGVybmFsU3RvcmUgfSBmcm9tICdyZWFjdCc7XG5pbXBvcnQgeyBjcmVhdGVQb3J0YWwgfSBmcm9tICdyZWFjdC1kb20nO1xuaW1wb3J0IHtcbiAgQ2hlY2ssXG4gIENoZXZyb25Eb3duLFxuICBDaGV2cm9uTGVmdCxcbiAgQ2hldnJvblJpZ2h0LFxuICBDaGV2cm9uVXAsXG4gIENpcmNsZUFsZXJ0LFxuICBEaWFtb25kLFxuICBJbmZvLFxuICBMb2NrS2V5aG9sZSxcbiAgUGF1c2UsXG4gIFBsYXksXG4gIFNraXBCYWNrLFxuICBTa2lwRm9yd2FyZCxcbiAgVHJhc2gyLFxufSBmcm9tICdsdWNpZGUtcmVhY3QnO1xuaW1wb3J0IHtcbiAgQUJPVVRfTkFSUkFUSVZFX0dMT0JBTF9DT05UUk9MUyxcbiAgQUJPVVRfTkFSUkFUSVZFX0NPUlJFU1BPTkRFTkNFX01PREVTLFxuICBBQk9VVF9OQVJSQVRJVkVfRElTQ0lQTElORV9SRVZFQUxfQ09OVFJPTFMsXG4gIEFCT1VUX05BUlJBVElWRV9FTVBIQVNJU19UT05FUyxcbiAgQUJPVVRfTkFSUkFUSVZFX01PRElGSUVSX0RFRklOSVRJT05TLFxuICBBQk9VVF9OQVJSQVRJVkVfU0hBUEVfREVGSU5JVElPTlMsXG59IGZyb20gJy4vYWJvdXROYXJyYXRpdmVEZWZpbml0aW9ucy5qcyc7XG5pbXBvcnQge1xuICBjbGVhckFib3V0TmFycmF0aXZlUmVjb3ZlcnlEcmFmdCxcbiAgZXhwb3J0QWJvdXROYXJyYXRpdmVEb2N1bWVudCxcbiAgbG9hZEFib3V0TmFycmF0aXZlU291cmNlLFxuICByZWFkQWJvdXROYXJyYXRpdmVDaGVja3BvaW50cyxcbiAgcmVhZEFib3V0TmFycmF0aXZlUmVjb3ZlcnlEcmFmdCxcbiAgc2F2ZUFib3V0TmFycmF0aXZlU291cmNlLFxuICB3cml0ZUFib3V0TmFycmF0aXZlQ2hlY2twb2ludCxcbiAgd3JpdGVBYm91dE5hcnJhdGl2ZVJlY292ZXJ5RHJhZnQsXG59IGZyb20gJy4vYWJvdXROYXJyYXRpdmVQZXJzaXN0ZW5jZS5qcyc7XG5pbXBvcnQge1xuICBhc3NlcnRWYWxpZEFib3V0TmFycmF0aXZlRG9jdW1lbnQsXG4gIGNsb25lQWJvdXROYXJyYXRpdmVEb2N1bWVudCxcbn0gZnJvbSAnLi9hYm91dE5hcnJhdGl2ZVNjaGVtYS5qcyc7XG5pbXBvcnQge1xuICBnZXRBYm91dE5hcnJhdGl2ZUN1ZU1vdmVtZW50LFxuICBnZXRBYm91dE5hcnJhdGl2ZUN1ZU1vdGlvbkludGVydmFsLFxuICBnZXRBYm91dE5hcnJhdGl2ZVdvcmxkVHJhbnNpdGlvbkxpbWl0LFxuICBzYW1wbGVBYm91dE5hcnJhdGl2ZVBsYW4sXG59IGZyb20gJy4vYWJvdXROYXJyYXRpdmVDb21waWxlci5qcyc7XG5pbXBvcnQge1xuICBjYXB0dXJlQWJvdXROYXJyYXRpdmVQbGF5aGVhZENvbnRleHQsXG4gIGNyZWF0ZUFib3V0TmFycmF0aXZlQ3VlQ2xpcGJvYXJkUGF5bG9hZCxcbiAgZGVyaXZlQWJvdXROYXJyYXRpdmVMb29wUmFuZ2UsXG4gIGR1cGxpY2F0ZUFib3V0TmFycmF0aXZlQ3VlR3JvdXAsXG4gIGR1cGxpY2F0ZUFib3V0TmFycmF0aXZlU2VjdGlvbixcbiAgZ2V0QWJvdXROYXJyYXRpdmVDYW1lcmFLZXlUaW1pbmdCb3VuZHMsXG4gIGdldEFib3V0TmFycmF0aXZlQ3VlVGltaW5nQm91bmRzLFxuICBnZXRBYm91dE5hcnJhdGl2ZUV4dGVudEZpZWxkLFxuICBnZXRBYm91dE5hcnJhdGl2ZVNlbGVjdGlvbk1lbWJlcnMsXG4gIG1vdmVBYm91dE5hcnJhdGl2ZUN1ZVRpbWluZyxcbiAgcmVtYXBBYm91dE5hcnJhdGl2ZVBsYXloZWFkQ29udGV4dCxcbiAgcmVzb2x2ZUFib3V0TmFycmF0aXZlQ2FtZXJhS2V5RHJvcCxcbiAgcmVzb2x2ZUFib3V0TmFycmF0aXZlQ3VlRGlzdHJpYnV0aW9uLFxuICByZXNvbHZlQWJvdXROYXJyYXRpdmVDdWVFeGFjdEdhcCxcbiAgcmVzb2x2ZUFib3V0TmFycmF0aXZlQ3VlR3JvdXBNb3ZlLFxuICByZXNvbHZlQWJvdXROYXJyYXRpdmVDdWVHcm91cEFsaWduLFxuICByZXNvbHZlQWJvdXROYXJyYXRpdmVDdWVHcm91cFBhc3RlLFxuICBzbmFwQWJvdXROYXJyYXRpdmVUaW1lbGluZVZhbHVlLFxuICBzdGl0Y2hBYm91dE5hcnJhdGl2ZUNhbWVyYUJvdW5kYXJpZXMsXG4gIHRvZ2dsZUFib3V0TmFycmF0aXZlQ3VlU2VsZWN0aW9uLFxuICB2YWxpZGF0ZUFib3V0TmFycmF0aXZlQ3VlQ2xpcGJvYXJkUGF5bG9hZCxcbn0gZnJvbSAnLi9hYm91dE5hcnJhdGl2ZVRpbWVsaW5lLmpzJztcbmltcG9ydCAnLi9hYm91dC1uYXJyYXRpdmUtZWRpdG9yLmNzcyc7XG5cbmNvbnN0IGNsYW1wMDEgPSAodmFsdWUpID0+IE1hdGgubWluKDEsIE1hdGgubWF4KDAsIHZhbHVlKSk7XG5jb25zdCBBQk9VVF9FRElUT1JfVElNRUxJTkVfU1RPUkFHRV9LRVkgPSAnYWJzOmFib3V0LW5hcnJhdGl2ZTp0aW1lbGluZS1vcGVuOnYxJztcbmNvbnN0IFRJTUVMSU5FX0tFWV9FUFNJTE9OID0gMC4wMDQ7XG5jb25zdCBJTlNQRUNUT1JfRURHRV9HQVAgPSA4O1xuY29uc3QgQ0FNRVJBX1BPU0VfRklFTERTID0gbmV3IFNldChbJ29mZnNldCcsICdsb29rQXRPZmZzZXQnLCAnZm92JywgJ3JvbGwnXSk7XG5jb25zdCBESVNDSVBMSU5FX1JFVkVBTF9NQVggPSBBQk9VVF9OQVJSQVRJVkVfRElTQ0lQTElORV9SRVZFQUxfQ09OVFJPTFNcbiAgLmZpbmQoKGNvbnRyb2wpID0+IGNvbnRyb2wuaWQgPT09ICdlbmQnKT8ubWF4IHx8IDQ7XG5jb25zdCBESVNDSVBMSU5FX0JBTExfVE9LRU5fQllfR1JPVVAgPSBPYmplY3QuZnJlZXplKHtcbiAgMTogJy0tYmFsbC0xJyxcbiAgMjogJy0tYmFsbC00JyxcbiAgMzogJy0tYmFsbC0zJyxcbiAgNDogJy0tYmFsbC03JyxcbiAgNTogJy0tYmFsbC04JyxcbiAgNjogJy0tYmFsbC02Jyxcbn0pO1xuY29uc3QgVElNRUxJTkVfR0xPQkFMX1RSQUNLUyA9IE9iamVjdC5mcmVlemUoW1xuICBPYmplY3QuZnJlZXplKHsgbGFuZTogJ3NlY3Rpb24nLCBsYWJlbDogJ1NlY3Rpb25zJywgZ3JvdXBJZHM6IE9iamVjdC5mcmVlemUoWydzZXF1ZW5jZSddKSB9KSxcbiAgT2JqZWN0LmZyZWV6ZSh7IGxhbmU6ICdjYW1lcmEnLCBsYWJlbDogJ0NhbWVyYScsIGdyb3VwSWRzOiBPYmplY3QuZnJlZXplKFsnY2FtZXJhJ10pIH0pLFxuICBPYmplY3QuZnJlZXplKHsgbGFuZTogJ3dvcmxkJywgbGFiZWw6ICdXb3JsZCcsIGdyb3VwSWRzOiBPYmplY3QuZnJlZXplKFsnbWF0ZXJpYWwnLCAnc3dhcm1UdXJidWxlbmNlJ10pIH0pLFxuICBPYmplY3QuZnJlZXplKHsgbGFuZTogJ3RleHQnLCBsYWJlbDogJ1RleHQnLCBncm91cElkczogT2JqZWN0LmZyZWV6ZShbJ3RleHRNb3Rpb24nXSkgfSksXG4gIE9iamVjdC5mcmVlemUoeyBsYW5lOiAnaW50ZXJhY3Rpb24nLCBsYWJlbDogJ0ludGVyYWN0aW9uJywgZ3JvdXBJZHM6IE9iamVjdC5mcmVlemUoW10pIH0pLFxuXSk7XG5cbmZ1bmN0aW9uIGNhbWVyYVBvc2VDaGFuZ2VzKGZyb20sIHRvKSB7XG4gIGlmICghZnJvbSB8fCAhdG8pIHJldHVybiBmYWxzZTtcbiAgcmV0dXJuIFsnb2Zmc2V0JywgJ2xvb2tBdE9mZnNldCddLnNvbWUoKGZpZWxkKSA9PiAoXG4gICAgZnJvbVtmaWVsZF0uc29tZSgodmFsdWUsIGluZGV4KSA9PiBNYXRoLmFicyh2YWx1ZSAtIHRvW2ZpZWxkXVtpbmRleF0pID4gMC4wMDAxKVxuICApKSB8fCBNYXRoLmFicyhmcm9tLmZvdiAtIHRvLmZvdikgPiAwLjAwMDEgfHwgTWF0aC5hYnMoZnJvbS5yb2xsIC0gdG8ucm9sbCkgPiAwLjAwMDE7XG59XG5cbmZ1bmN0aW9uIGNvcHlDYW1lcmFQb3NlKHRhcmdldCwgc291cmNlKSB7XG4gIHRhcmdldC5vZmZzZXQgPSBbLi4uc291cmNlLm9mZnNldF07XG4gIHRhcmdldC5sb29rQXRPZmZzZXQgPSBbLi4uc291cmNlLmxvb2tBdE9mZnNldF07XG4gIHRhcmdldC5mb3YgPSBzb3VyY2UuZm92O1xuICB0YXJnZXQucm9sbCA9IHNvdXJjZS5yb2xsO1xufVxuXG5mdW5jdGlvbiBsaW5rQ2FtZXJhQm91bmRhcnkoZG9jdW1lbnQsIHNlY3Rpb25JbmRleCwga2V5SW5kZXgpIHtcbiAgY29uc3Qgc2VjdGlvbiA9IGRvY3VtZW50LnNlY3Rpb25zW3NlY3Rpb25JbmRleF07XG4gIGNvbnN0IGtleSA9IHNlY3Rpb24/LmNhbWVyYS5rZXlzW2tleUluZGV4XTtcbiAgaWYgKCFrZXkpIHJldHVybjtcbiAgaWYgKGtleUluZGV4ID09PSAwICYmIHNlY3Rpb25JbmRleCA+IDApIHtcbiAgICBjb3B5Q2FtZXJhUG9zZShkb2N1bWVudC5zZWN0aW9uc1tzZWN0aW9uSW5kZXggLSAxXS5jYW1lcmEua2V5cy5hdCgtMSksIGtleSk7XG4gIH1cbiAgaWYgKGtleUluZGV4ID09PSBzZWN0aW9uLmNhbWVyYS5rZXlzLmxlbmd0aCAtIDEgJiYgc2VjdGlvbkluZGV4IDwgZG9jdW1lbnQuc2VjdGlvbnMubGVuZ3RoIC0gMSkge1xuICAgIGNvcHlDYW1lcmFQb3NlKGRvY3VtZW50LnNlY3Rpb25zW3NlY3Rpb25JbmRleCArIDFdLmNhbWVyYS5rZXlzWzBdLCBrZXkpO1xuICB9XG59XG5cbmZ1bmN0aW9uIGJyaWRnZUNhbWVyYVNlY3Rpb24oZG9jdW1lbnQsIHNlY3Rpb25JbmRleCkge1xuICBjb25zdCBzZWN0aW9uID0gZG9jdW1lbnQuc2VjdGlvbnNbc2VjdGlvbkluZGV4XTtcbiAgaWYgKCFzZWN0aW9uPy5jYW1lcmEua2V5cy5sZW5ndGgpIHJldHVybjtcbiAgaWYgKHNlY3Rpb25JbmRleCA+IDApIGNvcHlDYW1lcmFQb3NlKHNlY3Rpb24uY2FtZXJhLmtleXNbMF0sIGRvY3VtZW50LnNlY3Rpb25zW3NlY3Rpb25JbmRleCAtIDFdLmNhbWVyYS5rZXlzLmF0KC0xKSk7XG4gIGlmIChzZWN0aW9uSW5kZXggPCBkb2N1bWVudC5zZWN0aW9ucy5sZW5ndGggLSAxKSBjb3B5Q2FtZXJhUG9zZShzZWN0aW9uLmNhbWVyYS5rZXlzLmF0KC0xKSwgZG9jdW1lbnQuc2VjdGlvbnNbc2VjdGlvbkluZGV4ICsgMV0uY2FtZXJhLmtleXNbMF0pO1xufVxuXG5mdW5jdGlvbiBnZXRJbnNwZWN0b3JWZXJ0aWNhbEJvdW5kcyhpbnNwZWN0b3IsIHRpbWVsaW5lT3Blbikge1xuICBjb25zdCBlZGl0b3IgPSBpbnNwZWN0b3IuY2xvc2VzdCgnLmFib3V0LWVkaXRvcicpO1xuICBjb25zdCBzdHlsZXMgPSBlZGl0b3IgPyBnZXRDb21wdXRlZFN0eWxlKGVkaXRvcikgOiBudWxsO1xuICBjb25zdCB0b3BiYXJIZWlnaHQgPSBOdW1iZXIucGFyc2VGbG9hdChzdHlsZXM/LmdldFByb3BlcnR5VmFsdWUoJy0tYWJvdXQtZWRpdG9yLXRvcGJhcicpKSB8fCA0NDtcbiAgY29uc3QgdGltZWxpbmVIZWlnaHQgPSB0aW1lbGluZU9wZW5cbiAgICA/IE51bWJlci5wYXJzZUZsb2F0KHN0eWxlcz8uZ2V0UHJvcGVydHlWYWx1ZSgnLS1hYm91dC1lZGl0b3ItdGltZWxpbmUnKSkgfHwgMTg4XG4gICAgOiAwO1xuICBjb25zdCBidXR0b25CYXJUb3AgPSBkb2N1bWVudC5xdWVyeVNlbGVjdG9yKCdbZGF0YS1idXR0b24tYmFyXScpPy5nZXRCb3VuZGluZ0NsaWVudFJlY3QoKS50b3BcbiAgICA/PyB3aW5kb3cuaW5uZXJIZWlnaHQ7XG4gIHJldHVybiB7XG4gICAgbWluVG9wOiB0b3BiYXJIZWlnaHQgKyBJTlNQRUNUT1JfRURHRV9HQVAsXG4gICAgbWF4Qm90dG9tOiAodGltZWxpbmVPcGVuID8gd2luZG93LmlubmVySGVpZ2h0IC0gdGltZWxpbmVIZWlnaHQgOiBidXR0b25CYXJUb3ApIC0gSU5TUEVDVE9SX0VER0VfR0FQLFxuICB9O1xufVxuXG5mdW5jdGlvbiBjbGFtcEluc3BlY3RvclBvc2l0aW9uKGluc3BlY3RvciwgcG9zaXRpb24sIHRpbWVsaW5lT3Blbikge1xuICBjb25zdCB7IG1pblRvcCwgbWF4Qm90dG9tIH0gPSBnZXRJbnNwZWN0b3JWZXJ0aWNhbEJvdW5kcyhpbnNwZWN0b3IsIHRpbWVsaW5lT3Blbik7XG4gIGNvbnN0IG1heFdpZHRoID0gTWF0aC5tYXgoMjQwLCB3aW5kb3cuaW5uZXJXaWR0aCAtIChJTlNQRUNUT1JfRURHRV9HQVAgKiAyKSk7XG4gIGNvbnN0IHdpZHRoID0gTWF0aC5taW4ocG9zaXRpb24ud2lkdGgsIG1heFdpZHRoKTtcbiAgY29uc3QgYXZhaWxhYmxlSGVpZ2h0ID0gTWF0aC5tYXgoMjQwLCBtYXhCb3R0b20gLSBtaW5Ub3ApO1xuICBjb25zdCBoZWlnaHQgPSBNYXRoLm1pbihwb3NpdGlvbi5oZWlnaHQsIGF2YWlsYWJsZUhlaWdodCk7XG4gIGNvbnN0IG1heExlZnQgPSBNYXRoLm1heChJTlNQRUNUT1JfRURHRV9HQVAsIHdpbmRvdy5pbm5lcldpZHRoIC0gd2lkdGggLSBJTlNQRUNUT1JfRURHRV9HQVApO1xuICBjb25zdCBtYXhUb3AgPSBNYXRoLm1heChtaW5Ub3AsIG1heEJvdHRvbSAtIGhlaWdodCk7XG4gIHJldHVybiB7XG4gICAgbGVmdDogTWF0aC5taW4obWF4TGVmdCwgTWF0aC5tYXgoSU5TUEVDVE9SX0VER0VfR0FQLCBwb3NpdGlvbi5sZWZ0KSksXG4gICAgdG9wOiBNYXRoLm1pbihtYXhUb3AsIE1hdGgubWF4KG1pblRvcCwgcG9zaXRpb24udG9wKSksXG4gICAgd2lkdGgsXG4gICAgaGVpZ2h0LFxuICB9O1xufVxuXG5mdW5jdGlvbiBnZXRTZWN0aW9uSW5kZXgoZG9jdW1lbnQsIHNlY3Rpb25JZCkge1xuICByZXR1cm4gZG9jdW1lbnQuc2VjdGlvbnMuZmluZEluZGV4KChzZWN0aW9uKSA9PiBzZWN0aW9uLmlkID09PSBzZWN0aW9uSWQpO1xufVxuXG5mdW5jdGlvbiBnZXRTZWN0aW9uKGRvY3VtZW50LCBzZWxlY3Rpb24pIHtcbiAgY29uc3Qgc2VjdGlvbklkID0gc2VsZWN0aW9uLnNlY3Rpb25JZCB8fCBkb2N1bWVudC5zZWN0aW9uc1swXT8uaWQ7XG4gIHJldHVybiBkb2N1bWVudC5zZWN0aW9ucy5maW5kKChzZWN0aW9uKSA9PiBzZWN0aW9uLmlkID09PSBzZWN0aW9uSWQpIHx8IGRvY3VtZW50LnNlY3Rpb25zWzBdO1xufVxuXG5mdW5jdGlvbiBnZXRMb2NhbFByb2dyZXNzKHBsYW4sIHNlY3Rpb24sIHN0b3J5V1UpIHtcbiAgY29uc3QgY29tcGlsZWQgPSBwbGFuPy5zZWN0aW9ucz8uZmluZCgoaXRlbSkgPT4gaXRlbS5pZCA9PT0gc2VjdGlvbi5pZCk7XG4gIHJldHVybiBjb21waWxlZCA/IGNsYW1wMDEoKHN0b3J5V1UgLSBjb21waWxlZC5zdGFydFdVKSAvIGNvbXBpbGVkLnRyYXZlbFdVKSA6IDA7XG59XG5cbmZ1bmN0aW9uIGZvcm1hdFdVKHZhbHVlKSB7XG4gIHJldHVybiBgJHtOdW1iZXIodmFsdWUgfHwgMCkudG9GaXhlZCgyKX0gV1VgO1xufVxuXG5mdW5jdGlvbiBmb3JtYXRDYW1lcmFQZXJjZW50KHZhbHVlKSB7XG4gIHJldHVybiBgJHtOdW1iZXIoKE51bWJlcih2YWx1ZSkgKiAxMDApLnRvRml4ZWQoMSkpfSVgO1xufVxuXG5mdW5jdGlvbiBpc1RleHRFZGl0aW5nVGFyZ2V0KHRhcmdldCkge1xuICByZXR1cm4gdGFyZ2V0IGluc3RhbmNlb2YgSFRNTEVsZW1lbnRcbiAgICAmJiAodGFyZ2V0Lm1hdGNoZXMoJ2lucHV0LCB0ZXh0YXJlYSwgc2VsZWN0JykgfHwgdGFyZ2V0LmlzQ29udGVudEVkaXRhYmxlKTtcbn1cblxuZnVuY3Rpb24gZ2V0VGltZWxpbmVLZXlmcmFtZXMoc25hcHNob3QpIHtcbiAgY29uc3QgcGxhbiA9IHNuYXBzaG90LmNvbXBpbGVkUGxhbjtcbiAgaWYgKCFwbGFuPy5zZWN0aW9ucz8ubGVuZ3RoKSByZXR1cm4gW107XG4gIGNvbnN0IGV2ZW50cyA9IFtdO1xuICBwbGFuLnNlY3Rpb25zLmZvckVhY2goKGNvbXBpbGVkLCBzZWN0aW9uSW5kZXgpID0+IHtcbiAgICBjb25zdCBzZWN0aW9uID0gc25hcHNob3QuZG9jdW1lbnQuc2VjdGlvbnNbc2VjdGlvbkluZGV4XTtcbiAgICBjb25zdCB0b1N0b3J5V1UgPSAoYXQpID0+IGNvbXBpbGVkLnN0YXJ0V1UgKyAoTnVtYmVyKGF0IHx8IDApICogY29tcGlsZWQudHJhdmVsV1UpO1xuICAgIHNlY3Rpb24uY2FtZXJhLmtleXMuZm9yRWFjaCgoa2V5LCBrZXlJbmRleCkgPT4ge1xuICAgICAgaWYgKGtleS5hdCA9PT0gMCB8fCBrZXkuYXQgPT09IDEpIHJldHVybjtcbiAgICAgIGV2ZW50cy5wdXNoKHtcbiAgICAgICAgc3RvcnlXVTogdG9TdG9yeVdVKGtleS5hdCksXG4gICAgICAgIHByaW9yaXR5OiAwLFxuICAgICAgICBzZWxlY3Rpb246IHsgdHlwZTogJ2NhbWVyYS1rZXknLCBzZWN0aW9uSWQ6IHNlY3Rpb24uaWQsIGtleUluZGV4IH0sXG4gICAgICB9KTtcbiAgICB9KTtcbiAgICBpZiAoc2VjdGlvbi53b3JsZC5tb2RlID09PSAnc2V0JyAmJiBzZWN0aW9uLndvcmxkLnRyYW5zaXRpb25Jbi50eXBlICE9PSAnY3V0Jykge1xuICAgICAgWydzdGFydCcsICdlbmQnXS5mb3JFYWNoKChwYXJ0LCBwYXJ0SW5kZXgpID0+IGV2ZW50cy5wdXNoKHtcbiAgICAgICAgc3RvcnlXVTogdG9TdG9yeVdVKHNlY3Rpb24ud29ybGQudHJhbnNpdGlvbkluW3BhcnRdKSxcbiAgICAgICAgcHJpb3JpdHk6IDEwICsgcGFydEluZGV4LFxuICAgICAgICBzZWxlY3Rpb246IHsgdHlwZTogJ3dvcmxkJywgc2VjdGlvbklkOiBzZWN0aW9uLmlkLCBrZXlQYXJ0OiBgdHJhbnNpdGlvbi0ke3BhcnR9YCB9LFxuICAgICAgfSkpO1xuICAgIH1cbiAgICAoc2VjdGlvbi50ZXh0LmN1ZXMgfHwgW10pLmZvckVhY2goKGN1ZSwgY3VlSW5kZXgpID0+IHtcbiAgICAgIGV2ZW50cy5wdXNoKHtcbiAgICAgICAgc3RvcnlXVTogdG9TdG9yeVdVKGN1ZS5ob2xkKSxcbiAgICAgICAgcHJpb3JpdHk6IDIwICsgY3VlSW5kZXgsXG4gICAgICAgIHNlbGVjdGlvbjogeyB0eXBlOiAnY3VlJywgc2VjdGlvbklkOiBzZWN0aW9uLmlkLCBjdWVJZDogY3VlLmlkLCBrZXlQYXJ0OiAnZm9jdXMnIH0sXG4gICAgICB9KTtcbiAgICB9KTtcbiAgICBpZiAoc2VjdGlvbi50ZXh0LmRpc2NpcGxpbmVSZXZlYWwpIHtcbiAgICAgIGV2ZW50cy5wdXNoKHtcbiAgICAgICAgc3RvcnlXVTogdG9TdG9yeVdVKHNlY3Rpb24udGV4dC5kaXNjaXBsaW5lUmV2ZWFsLnN0YXJ0KSxcbiAgICAgICAgcHJpb3JpdHk6IDI4LFxuICAgICAgICBzZWxlY3Rpb246IHsgdHlwZTogJ2Rpc2NpcGxpbmUtcmV2ZWFsJywgc2VjdGlvbklkOiBzZWN0aW9uLmlkIH0sXG4gICAgICB9KTtcbiAgICB9XG4gICAgaWYgKHNlY3Rpb24uaW50ZXJhY3Rpb24/LnR5cGUgIT09ICdub25lJyAmJiBOdW1iZXIuaXNGaW5pdGUoc2VjdGlvbi5pbnRlcmFjdGlvbi5hY3RpdmF0aW9uU3RhcnQpKSB7XG4gICAgICBldmVudHMucHVzaCh7XG4gICAgICAgIHN0b3J5V1U6IHRvU3RvcnlXVShzZWN0aW9uLmludGVyYWN0aW9uLmFjdGl2YXRpb25TdGFydCksXG4gICAgICAgIHByaW9yaXR5OiAzMCxcbiAgICAgICAgc2VsZWN0aW9uOiB7IHR5cGU6ICdpbnRlcmFjdGlvbicsIHNlY3Rpb25JZDogc2VjdGlvbi5pZCwga2V5UGFydDogJ2FjdGl2YXRpb24nIH0sXG4gICAgICB9KTtcbiAgICB9XG4gIH0pO1xuICByZXR1cm4gZXZlbnRzLnNvcnQoKGEsIGIpID0+IChhLnN0b3J5V1UgLSBiLnN0b3J5V1UpIHx8IChhLnByaW9yaXR5IC0gYi5wcmlvcml0eSkpO1xufVxuXG5mdW5jdGlvbiBnZXRUaW1lbGluZURlbGV0aW9uKHNuYXBzaG90KSB7XG4gIGNvbnN0IHsgc2VsZWN0aW9uLCBkb2N1bWVudCB9ID0gc25hcHNob3Q7XG4gIGNvbnN0IHNlY3Rpb25JbmRleCA9IGdldFNlY3Rpb25JbmRleChkb2N1bWVudCwgc2VsZWN0aW9uLnNlY3Rpb25JZCk7XG4gIGNvbnN0IHNlY3Rpb24gPSBkb2N1bWVudC5zZWN0aW9uc1tzZWN0aW9uSW5kZXhdO1xuICBpZiAoIXNlY3Rpb24pIHJldHVybiBudWxsO1xuICBpZiAoc2VsZWN0aW9uLnR5cGUgPT09ICdjYW1lcmEta2V5Jykge1xuICAgIGNvbnN0IGtleSA9IHNlY3Rpb24uY2FtZXJhLmtleXNbc2VsZWN0aW9uLmtleUluZGV4XTtcbiAgICBpZiAoIWtleSkgcmV0dXJuIG51bGw7XG4gICAgY29uc3QgcmVxdWlyZWQgPSBrZXkuYXQgPT09IDAgfHwga2V5LmF0ID09PSAxO1xuICAgIHJldHVybiB7XG4gICAgICBsYWJlbDogcmVxdWlyZWQgPyAnUmVxdWlyZWQgY2FtZXJhIGtleScgOiAnRGVsZXRlIGNhbWVyYSBrZXknLFxuICAgICAgZGlzYWJsZWQ6IHJlcXVpcmVkLFxuICAgICAgbWVzc2FnZTogcmVxdWlyZWQgPyAnVGhlIHN0YXJ0IGFuZCBlbmQgQ2FtZXJhIGtleXMgcHJlc2VydmUgU2VjdGlvbiBjb250aW51aXR5IGFuZCBjYW5ub3QgYmUgcmVtb3ZlZC4nIDogJycsXG4gICAgICBleGVjdXRlOiAoc3RvcmUpID0+IHN0b3JlLmNvbW1pdCgnRGVsZXRlIGNhbWVyYSBrZXknLCAoZHJhZnQpID0+IHtcbiAgICAgICAgZHJhZnQuc2VjdGlvbnNbc2VjdGlvbkluZGV4XS5jYW1lcmEua2V5cy5zcGxpY2Uoc2VsZWN0aW9uLmtleUluZGV4LCAxKTtcbiAgICAgIH0sIHsgc2VsZWN0aW9uOiB7IHR5cGU6ICdzZWN0aW9uJywgc2VjdGlvbklkOiBzZWN0aW9uLmlkIH0gfSksXG4gICAgfTtcbiAgfVxuICBpZiAoc2VsZWN0aW9uLnR5cGUgPT09ICd3b3JsZCcgJiYgc2VsZWN0aW9uLmtleVBhcnQ/LnN0YXJ0c1dpdGgoJ3RyYW5zaXRpb24tJykpIHtcbiAgICByZXR1cm4ge1xuICAgICAgbGFiZWw6ICdSZW1vdmUgdHJhbnNpdGlvbicsXG4gICAgICBkaXNhYmxlZDogZmFsc2UsXG4gICAgICBtZXNzYWdlOiAnJyxcbiAgICAgIGV4ZWN1dGU6IChzdG9yZSkgPT4gc3RvcmUuY29tbWl0KCdSZW1vdmUgV29ybGQgdHJhbnNpdGlvbicsIChkcmFmdCkgPT4ge1xuICAgICAgICBjb25zdCB0cmFuc2l0aW9uID0gZHJhZnQuc2VjdGlvbnNbc2VjdGlvbkluZGV4XS53b3JsZC50cmFuc2l0aW9uSW47XG4gICAgICAgIHRyYW5zaXRpb24uc3RhcnQgPSAwO1xuICAgICAgICB0cmFuc2l0aW9uLmVuZCA9IDA7XG4gICAgICAgIHRyYW5zaXRpb24udHlwZSA9ICdjdXQnO1xuICAgICAgfSwgeyBzZWxlY3Rpb246IHsgdHlwZTogJ3dvcmxkJywgc2VjdGlvbklkOiBzZWN0aW9uLmlkIH0gfSksXG4gICAgfTtcbiAgfVxuICBpZiAoc2VsZWN0aW9uLnR5cGUgPT09ICdpbnRlcmFjdGlvbicgJiYgc2VsZWN0aW9uLmtleVBhcnQgPT09ICdhY3RpdmF0aW9uJykge1xuICAgIHJldHVybiB7XG4gICAgICBsYWJlbDogJ1JlbW92ZSBpbnRlcmFjdGlvbiBrZXknLFxuICAgICAgZGlzYWJsZWQ6IGZhbHNlLFxuICAgICAgbWVzc2FnZTogJycsXG4gICAgICBleGVjdXRlOiAoc3RvcmUpID0+IHN0b3JlLmNvbW1pdCgnUmVtb3ZlIGludGVyYWN0aW9uIGtleScsIChkcmFmdCkgPT4ge1xuICAgICAgICBkcmFmdC5zZWN0aW9uc1tzZWN0aW9uSW5kZXhdLmludGVyYWN0aW9uID0geyB0eXBlOiAnbm9uZScgfTtcbiAgICAgIH0sIHsgc2VsZWN0aW9uOiB7IHR5cGU6ICdzZWN0aW9uJywgc2VjdGlvbklkOiBzZWN0aW9uLmlkIH0gfSksXG4gICAgfTtcbiAgfVxuICByZXR1cm4gbnVsbDtcbn1cblxuZnVuY3Rpb24gZGVsZXRlVGltZWxpbmVTZWxlY3Rpb24oc3RvcmUsIHNuYXBzaG90KSB7XG4gIGNvbnN0IGRlbGV0aW9uID0gZ2V0VGltZWxpbmVEZWxldGlvbihzbmFwc2hvdCk7XG4gIGlmICghZGVsZXRpb24pIHJldHVybiBmYWxzZTtcbiAgaWYgKGRlbGV0aW9uLmRpc2FibGVkKSB7XG4gICAgc3RvcmUuc2V0U2F2ZVN0YXRlKHsgbWVzc2FnZTogZGVsZXRpb24ubWVzc2FnZSB9KTtcbiAgICByZXR1cm4gdHJ1ZTtcbiAgfVxuICBkZWxldGlvbi5leGVjdXRlKHN0b3JlKTtcbiAgcmV0dXJuIHRydWU7XG59XG5cbmZ1bmN0aW9uIHNlZWtUaW1lbGluZUtleWZyYW1lKHN0b3JlLCBldmVudCkge1xuICBpZiAoIWV2ZW50KSByZXR1cm47XG4gIHN0b3JlLnNldFNlbGVjdGlvbihldmVudC5zZWxlY3Rpb24pO1xuICBzdG9yZS5zZXRUcmFuc3BvcnQoeyBvd25lcjogJ3RpbWVsaW5lJywgcGxheWluZzogZmFsc2UsIHN0b3J5V1U6IGV2ZW50LnN0b3J5V1UgfSk7XG59XG5cbmZ1bmN0aW9uIGp1bXBUaW1lbGluZUtleWZyYW1lKHN0b3JlLCBzbmFwc2hvdCwgZGlyZWN0aW9uKSB7XG4gIGNvbnN0IGV2ZW50cyA9IGdldFRpbWVsaW5lS2V5ZnJhbWVzKHNuYXBzaG90KTtcbiAgY29uc3QgY3VycmVudFdVID0gc25hcHNob3QudHJhbnNwb3J0LnN0b3J5V1U7XG4gIGNvbnN0IHRhcmdldFBvc2l0aW9uID0gZGlyZWN0aW9uID4gMFxuICAgID8gZXZlbnRzLmZpbmQoKGV2ZW50KSA9PiBldmVudC5zdG9yeVdVID4gY3VycmVudFdVICsgVElNRUxJTkVfS0VZX0VQU0lMT04pPy5zdG9yeVdVXG4gICAgOiBbLi4uZXZlbnRzXS5yZXZlcnNlKCkuZmluZCgoZXZlbnQpID0+IGV2ZW50LnN0b3J5V1UgPCBjdXJyZW50V1UgLSBUSU1FTElORV9LRVlfRVBTSUxPTik/LnN0b3J5V1U7XG4gIGNvbnN0IGV2ZW50ID0gTnVtYmVyLmlzRmluaXRlKHRhcmdldFBvc2l0aW9uKVxuICAgID8gZXZlbnRzLmZpbmQoKGl0ZW0pID0+IE1hdGguYWJzKGl0ZW0uc3RvcnlXVSAtIHRhcmdldFBvc2l0aW9uKSA8IFRJTUVMSU5FX0tFWV9FUFNJTE9OKVxuICAgIDogbnVsbDtcbiAgc2Vla1RpbWVsaW5lS2V5ZnJhbWUoc3RvcmUsIGV2ZW50KTtcbn1cblxuZnVuY3Rpb24gbWFrZVNsdWcodmFsdWUpIHtcbiAgcmV0dXJuIHZhbHVlLnRvTG93ZXJDYXNlKCkucmVwbGFjZSgvW15hLXowLTldKy9nLCAnLScpLnJlcGxhY2UoL14tfC0kL2csICcnKSB8fCAnaXRlbSc7XG59XG5cbmZ1bmN0aW9uIG5leHRJZChkb2N1bWVudCwgYmFzZSkge1xuICBjb25zdCB1c2VkID0gbmV3IFNldChkb2N1bWVudC5zZWN0aW9ucy5mbGF0TWFwKChzZWN0aW9uKSA9PiBbXG4gICAgc2VjdGlvbi5pZCxcbiAgICAuLi4oc2VjdGlvbi50ZXh0LmN1ZXMgfHwgW10pLm1hcCgoY3VlKSA9PiBjdWUuaWQpLFxuICAgIC4uLihzZWN0aW9uLnRleHQuYmxvY2tzIHx8IFtdKS5tYXAoKGJsb2NrKSA9PiBibG9jay5pZCksXG4gICAgLi4uKHNlY3Rpb24udGV4dC5kaXNjaXBsaW5lUmV2ZWFsID8gW3NlY3Rpb24udGV4dC5kaXNjaXBsaW5lUmV2ZWFsLmlkXSA6IFtdKSxcbiAgXSkpO1xuICBsZXQgaWQgPSBtYWtlU2x1ZyhiYXNlKTtcbiAgbGV0IHN1ZmZpeCA9IDI7XG4gIHdoaWxlICh1c2VkLmhhcyhpZCkpIHtcbiAgICBpZCA9IGAke21ha2VTbHVnKGJhc2UpfS0ke3N1ZmZpeH1gO1xuICAgIHN1ZmZpeCArPSAxO1xuICB9XG4gIHJldHVybiBpZDtcbn1cblxuZnVuY3Rpb24gcmVwbGFjZURyYWZ0RG9jdW1lbnQoZHJhZnQsIG5leHREb2N1bWVudCkge1xuICBPYmplY3Qua2V5cyhkcmFmdCkuZm9yRWFjaCgoa2V5KSA9PiBkZWxldGUgZHJhZnRba2V5XSk7XG4gIE9iamVjdC5hc3NpZ24oZHJhZnQsIGNsb25lQWJvdXROYXJyYXRpdmVEb2N1bWVudChuZXh0RG9jdW1lbnQpKTtcbn1cblxuZnVuY3Rpb24gYXBwbHlDdWVNb3ZlcyhkcmFmdCwgbW92ZXMpIHtcbiAgbW92ZXMuZm9yRWFjaCgobW92ZSkgPT4ge1xuICAgIGNvbnN0IHNlY3Rpb24gPSBkcmFmdC5zZWN0aW9ucy5maW5kKChpdGVtKSA9PiBpdGVtLmlkID09PSBtb3ZlLnNlY3Rpb25JZCk7XG4gICAgY29uc3QgY3VlID0gc2VjdGlvbj8udGV4dD8uY3Vlcz8uZmluZCgoaXRlbSkgPT4gaXRlbS5pZCA9PT0gbW92ZS5jdWVJZCk7XG4gICAgaWYgKGN1ZSkgT2JqZWN0LmFzc2lnbihjdWUsIHsgZW50ZXI6IG1vdmUuZW50ZXIsIGhvbGQ6IG1vdmUuaG9sZCwgZXhpdDogbW92ZS5leGl0IH0pO1xuICB9KTtcbn1cblxuZnVuY3Rpb24gUHJvcGVydHkoeyBsYWJlbCwgY2hpbGRyZW4sIGhpbnQgPSAnJyB9KSB7XG4gIHJldHVybiAoXG4gICAgPGxhYmVsIGNsYXNzTmFtZT1cImFib3V0LWVkaXRvci1wcm9wZXJ0eVwiPlxuICAgICAgPHNwYW4+e2xhYmVsfTwvc3Bhbj5cbiAgICAgIHtjaGlsZHJlbn1cbiAgICAgIHtoaW50ID8gPHNtYWxsPntoaW50fTwvc21hbGw+IDogbnVsbH1cbiAgICA8L2xhYmVsPlxuICApO1xufVxuXG5mdW5jdGlvbiBOdW1iZXJQcm9wZXJ0eSh7IGxhYmVsLCB2YWx1ZSwgbWluLCBtYXgsIHN0ZXAsIG9uQ2hhbmdlLCB1bml0ID0gJycsIGRpc2FibGVkID0gZmFsc2UgfSkge1xuICByZXR1cm4gKFxuICAgIDxQcm9wZXJ0eSBsYWJlbD17bGFiZWx9PlxuICAgICAgPGRpdiBjbGFzc05hbWU9XCJhYm91dC1lZGl0b3ItbnVtYmVyXCI+XG4gICAgICAgIDxpbnB1dFxuICAgICAgICAgIHR5cGU9XCJyYW5nZVwiXG4gICAgICAgICAgdmFsdWU9e3ZhbHVlfVxuICAgICAgICAgIG1pbj17bWlufVxuICAgICAgICAgIG1heD17bWF4fVxuICAgICAgICAgIHN0ZXA9e3N0ZXB9XG4gICAgICAgICAgZGlzYWJsZWQ9e2Rpc2FibGVkfVxuICAgICAgICAgIG9uQ2hhbmdlPXsoZXZlbnQpID0+IG9uQ2hhbmdlKE51bWJlcihldmVudC50YXJnZXQudmFsdWUpKX1cbiAgICAgICAgLz5cbiAgICAgICAgPGlucHV0XG4gICAgICAgICAgdHlwZT1cIm51bWJlclwiXG4gICAgICAgICAgdmFsdWU9e3ZhbHVlfVxuICAgICAgICAgIG1pbj17bWlufVxuICAgICAgICAgIG1heD17bWF4fVxuICAgICAgICAgIHN0ZXA9e3N0ZXB9XG4gICAgICAgICAgZGlzYWJsZWQ9e2Rpc2FibGVkfVxuICAgICAgICAgIG9uQ2hhbmdlPXsoZXZlbnQpID0+IG9uQ2hhbmdlKE51bWJlcihldmVudC50YXJnZXQudmFsdWUpKX1cbiAgICAgICAgLz5cbiAgICAgICAge3VuaXQgPyA8ZW0+e3VuaXR9PC9lbT4gOiBudWxsfVxuICAgICAgPC9kaXY+XG4gICAgPC9Qcm9wZXJ0eT5cbiAgKTtcbn1cblxuZnVuY3Rpb24gUmFuZ2VQcm9wZXJ0eSh7IGxhYmVsLCBzdGFydCwgZW5kLCBtaW4sIG1heCwgc3RlcCwgb25TdGFydENoYW5nZSwgb25FbmRDaGFuZ2UsIGhpbnQgPSAnJyB9KSB7XG4gIGNvbnN0IHN0YXJ0UGVyY2VudCA9ICgoc3RhcnQgLSBtaW4pIC8gTWF0aC5tYXgoMC4wMDAwMSwgbWF4IC0gbWluKSkgKiAxMDA7XG4gIGNvbnN0IGVuZFBlcmNlbnQgPSAoKGVuZCAtIG1pbikgLyBNYXRoLm1heCgwLjAwMDAxLCBtYXggLSBtaW4pKSAqIDEwMDtcbiAgY29uc3QgcGVyY2VudGFnZVN0ZXAgPSBzdGVwICogMTAwO1xuICBjb25zdCBzZXRTdGFydCA9ICh2YWx1ZSkgPT4gb25TdGFydENoYW5nZShNYXRoLm1pbihlbmQgLSBzdGVwLCBNYXRoLm1heChtaW4sIE51bWJlcih2YWx1ZSkgfHwgMCkpKTtcbiAgY29uc3Qgc2V0RW5kID0gKHZhbHVlKSA9PiBvbkVuZENoYW5nZShNYXRoLm1heChzdGFydCArIHN0ZXAsIE1hdGgubWluKG1heCwgTnVtYmVyKHZhbHVlKSB8fCAwKSkpO1xuICByZXR1cm4gKFxuICAgIDxmaWVsZHNldFxuICAgICAgY2xhc3NOYW1lPVwiYWJvdXQtZWRpdG9yLXJhbmdlLXByb3BlcnR5XCJcbiAgICAgIGRhdGEtZ2xvYmFsLWNvbnRyb2w9XCJjbGVhcldpbmRvd1wiXG4gICAgICBzdHlsZT17eyAnLS1hYm91dC1yYW5nZS1zdGFydCc6IGAke3N0YXJ0UGVyY2VudH0lYCwgJy0tYWJvdXQtcmFuZ2UtZW5kJzogYCR7ZW5kUGVyY2VudH0lYCB9fVxuICAgID5cbiAgICAgIDxsZWdlbmQ+e2xhYmVsfTwvbGVnZW5kPlxuICAgICAgPGRpdiBjbGFzc05hbWU9XCJhYm91dC1lZGl0b3ItZHVhbC1yYW5nZVwiPlxuICAgICAgICA8c3BhbiBhcmlhLWhpZGRlbj1cInRydWVcIiAvPlxuICAgICAgICA8aW5wdXQgdHlwZT1cInJhbmdlXCIgYXJpYS1sYWJlbD17YCR7bGFiZWx9IHN0YXJ0YH0gbWluPXttaW59IG1heD17ZW5kIC0gc3RlcH0gc3RlcD17c3RlcH0gdmFsdWU9e3N0YXJ0fSBvbkNoYW5nZT17KGV2ZW50KSA9PiBzZXRTdGFydChldmVudC50YXJnZXQudmFsdWUpfSAvPlxuICAgICAgICA8aW5wdXQgdHlwZT1cInJhbmdlXCIgYXJpYS1sYWJlbD17YCR7bGFiZWx9IGVuZGB9IG1pbj17c3RhcnQgKyBzdGVwfSBtYXg9e21heH0gc3RlcD17c3RlcH0gdmFsdWU9e2VuZH0gb25DaGFuZ2U9eyhldmVudCkgPT4gc2V0RW5kKGV2ZW50LnRhcmdldC52YWx1ZSl9IC8+XG4gICAgICA8L2Rpdj5cbiAgICAgIDxkaXYgY2xhc3NOYW1lPVwiYWJvdXQtZWRpdG9yLXJhbmdlLXZhbHVlc1wiPlxuICAgICAgICA8bGFiZWw+PHNwYW4+U3RhcnRzPC9zcGFuPjxpbnB1dCB0eXBlPVwibnVtYmVyXCIgbWluPXttaW4gKiAxMDB9IG1heD17KGVuZCAtIHN0ZXApICogMTAwfSBzdGVwPXtwZXJjZW50YWdlU3RlcH0gdmFsdWU9e01hdGgucm91bmQoc3RhcnQgKiAxMDApfSBvbkNoYW5nZT17KGV2ZW50KSA9PiBzZXRTdGFydChOdW1iZXIoZXZlbnQudGFyZ2V0LnZhbHVlKSAvIDEwMCl9IC8+PGVtPiU8L2VtPjwvbGFiZWw+XG4gICAgICAgIDxpIGFyaWEtaGlkZGVuPVwidHJ1ZVwiPuKGkjwvaT5cbiAgICAgICAgPGxhYmVsPjxzcGFuPkVuZHM8L3NwYW4+PGlucHV0IHR5cGU9XCJudW1iZXJcIiBtaW49eyhzdGFydCArIHN0ZXApICogMTAwfSBtYXg9e21heCAqIDEwMH0gc3RlcD17cGVyY2VudGFnZVN0ZXB9IHZhbHVlPXtNYXRoLnJvdW5kKGVuZCAqIDEwMCl9IG9uQ2hhbmdlPXsoZXZlbnQpID0+IHNldEVuZChOdW1iZXIoZXZlbnQudGFyZ2V0LnZhbHVlKSAvIDEwMCl9IC8+PGVtPiU8L2VtPjwvbGFiZWw+XG4gICAgICA8L2Rpdj5cbiAgICAgIHtoaW50ID8gPHNtYWxsPntoaW50fTwvc21hbGw+IDogbnVsbH1cbiAgICA8L2ZpZWxkc2V0PlxuICApO1xufVxuXG5mdW5jdGlvbiBUcmFuc3BvcnQoeyBzdG9yZSwgc25hcHNob3QgfSkge1xuICBjb25zdCB7IHRyYW5zcG9ydCwgY29tcGlsZWRQbGFuIH0gPSBzbmFwc2hvdDtcbiAgY29uc3QgbWF4V1UgPSBjb21waWxlZFBsYW4/Lm1heFN0b3J5V1UgfHwgMTtcbiAgY29uc3QgcGxheSA9ICgpID0+IHN0b3JlLnNldFRyYW5zcG9ydCh7XG4gICAgb3duZXI6IHRyYW5zcG9ydC5wbGF5aW5nID8gJ3RpbWVsaW5lJyA6ICdwbGF5YmFjaycsXG4gICAgcGxheWluZzogIXRyYW5zcG9ydC5wbGF5aW5nLFxuICAgIHN0b3J5V1U6IHRyYW5zcG9ydC5zdG9yeVdVLFxuICB9KTtcbiAgY29uc3Qgc2VlayA9IChzdG9yeVdVKSA9PiBzdG9yZS5zZXRUcmFuc3BvcnQoeyBvd25lcjogJ3RpbWVsaW5lJywgcGxheWluZzogZmFsc2UsIHN0b3J5V1UgfSk7XG4gIGNvbnN0IHNlbGVjdGVkID0gZ2V0U2VjdGlvbihzbmFwc2hvdC5kb2N1bWVudCwgc25hcHNob3Quc2VsZWN0aW9uKTtcbiAgY29uc3Qgc2VjdGlvbkluZGV4ID0gZ2V0U2VjdGlvbkluZGV4KHNuYXBzaG90LmRvY3VtZW50LCBzZWxlY3RlZC5pZCk7XG4gIGNvbnN0IGp1bXBTZWN0aW9uID0gKGRpcmVjdGlvbikgPT4ge1xuICAgIGNvbnN0IG5leHQgPSBzbmFwc2hvdC5jb21waWxlZFBsYW4uc2VjdGlvbnNbTWF0aC5tYXgoMCwgTWF0aC5taW4oc25hcHNob3QuY29tcGlsZWRQbGFuLnNlY3Rpb25zLmxlbmd0aCAtIDEsIHNlY3Rpb25JbmRleCArIGRpcmVjdGlvbikpXTtcbiAgICBpZiAobmV4dCkgc2VlayhuZXh0LnN0YXJ0V1UpO1xuICB9O1xuICByZXR1cm4gKFxuICAgIDxkaXYgY2xhc3NOYW1lPVwiYWJvdXQtZWRpdG9yLXRyYW5zcG9ydFwiPlxuICAgICAgPGJ1dHRvbiB0eXBlPVwiYnV0dG9uXCIgdGl0bGU9XCJQcmV2aW91cyBTZWN0aW9uXCIgYXJpYS1sYWJlbD1cIlByZXZpb3VzIFNlY3Rpb25cIiBvbkNsaWNrPXsoKSA9PiBqdW1wU2VjdGlvbigtMSl9PjxTa2lwQmFjayBhcmlhLWhpZGRlbj1cInRydWVcIiAvPjwvYnV0dG9uPlxuICAgICAgPGJ1dHRvbiB0eXBlPVwiYnV0dG9uXCIgdGl0bGU9XCJQcmV2aW91cyBrZXlmcmFtZSDCtyBMZWZ0IGFycm93XCIgYXJpYS1sYWJlbD1cIlByZXZpb3VzIGtleWZyYW1lXCIgb25DbGljaz17KCkgPT4ganVtcFRpbWVsaW5lS2V5ZnJhbWUoc3RvcmUsIHNuYXBzaG90LCAtMSl9PjxDaGV2cm9uTGVmdCBhcmlhLWhpZGRlbj1cInRydWVcIiAvPjwvYnV0dG9uPlxuICAgICAgPGJ1dHRvbiB0eXBlPVwiYnV0dG9uXCIgY2xhc3NOYW1lPVwiaXMtcHJpbWFyeVwiIHRpdGxlPXt0cmFuc3BvcnQucGxheWluZyA/ICdQYXVzZScgOiAnUGxheSd9IGFyaWEtbGFiZWw9e3RyYW5zcG9ydC5wbGF5aW5nID8gJ1BhdXNlJyA6ICdQbGF5J30gb25DbGljaz17cGxheX0+XG4gICAgICAgIHt0cmFuc3BvcnQucGxheWluZyA/IDxQYXVzZSBhcmlhLWhpZGRlbj1cInRydWVcIiAvPiA6IDxQbGF5IGFyaWEtaGlkZGVuPVwidHJ1ZVwiIC8+fVxuICAgICAgPC9idXR0b24+XG4gICAgICA8YnV0dG9uIHR5cGU9XCJidXR0b25cIiB0aXRsZT1cIk5leHQgU2VjdGlvblwiIGFyaWEtbGFiZWw9XCJOZXh0IFNlY3Rpb25cIiBvbkNsaWNrPXsoKSA9PiBqdW1wU2VjdGlvbigxKX0+PFNraXBGb3J3YXJkIGFyaWEtaGlkZGVuPVwidHJ1ZVwiIC8+PC9idXR0b24+XG4gICAgICA8YnV0dG9uIHR5cGU9XCJidXR0b25cIiB0aXRsZT1cIk5leHQga2V5ZnJhbWUgwrcgUmlnaHQgYXJyb3dcIiBhcmlhLWxhYmVsPVwiTmV4dCBrZXlmcmFtZVwiIG9uQ2xpY2s9eygpID0+IGp1bXBUaW1lbGluZUtleWZyYW1lKHN0b3JlLCBzbmFwc2hvdCwgMSl9PjxDaGV2cm9uUmlnaHQgYXJpYS1oaWRkZW49XCJ0cnVlXCIgLz48L2J1dHRvbj5cbiAgICAgIDxvdXRwdXQ+e2Zvcm1hdFdVKHRyYW5zcG9ydC5zdG9yeVdVKX08L291dHB1dD5cbiAgICAgIDxpbnB1dFxuICAgICAgICBhcmlhLWxhYmVsPVwiR2xvYmFsIG5hcnJhdGl2ZSBwbGF5aGVhZFwiXG4gICAgICAgIHR5cGU9XCJyYW5nZVwiXG4gICAgICAgIG1pbj1cIjBcIlxuICAgICAgICBtYXg9e21heFdVfVxuICAgICAgICBzdGVwPVwiMC4wMDJcIlxuICAgICAgICB2YWx1ZT17TWF0aC5taW4obWF4V1UsIHRyYW5zcG9ydC5zdG9yeVdVKX1cbiAgICAgICAgb25DaGFuZ2U9eyhldmVudCkgPT4gc2VlayhOdW1iZXIoZXZlbnQudGFyZ2V0LnZhbHVlKSl9XG4gICAgICAvPlxuICAgICAgPGJ1dHRvblxuICAgICAgICB0eXBlPVwiYnV0dG9uXCJcbiAgICAgICAgY2xhc3NOYW1lPXt0cmFuc3BvcnQub3duZXIgPT09ICdzY3JvbGwnID8gJ2lzLWFjdGl2ZScgOiAnJ31cbiAgICAgICAgb25DbGljaz17KCkgPT4gc3RvcmUuc2V0VHJhbnNwb3J0KHsgb3duZXI6ICdzY3JvbGwnLCBwbGF5aW5nOiBmYWxzZSB9KX1cbiAgICAgID5Gb2xsb3cgc2Nyb2xsPC9idXR0b24+XG4gICAgICA8YnV0dG9uXG4gICAgICAgIHR5cGU9XCJidXR0b25cIlxuICAgICAgICBjbGFzc05hbWU9e3RyYW5zcG9ydC5saXZlQW1iaWVudCA/ICdpcy1hY3RpdmUnIDogJyd9XG4gICAgICAgIG9uQ2xpY2s9eygpID0+IHN0b3JlLnNldFRyYW5zcG9ydCh7IGxpdmVBbWJpZW50OiAhdHJhbnNwb3J0LmxpdmVBbWJpZW50IH0pfVxuICAgICAgPkxpdmUgYW1iaWVudDwvYnV0dG9uPlxuICAgICAgPHNlbGVjdFxuICAgICAgICBhcmlhLWxhYmVsPVwiUHJldmlldyBwcm9maWxlXCJcbiAgICAgICAgdmFsdWU9e3NuYXBzaG90LnByZXZpZXdQcm9maWxlfVxuICAgICAgICBvbkNoYW5nZT17KGV2ZW50KSA9PiBzdG9yZS5zZXRQcmV2aWV3UHJvZmlsZShldmVudC50YXJnZXQudmFsdWUpfVxuICAgICAgPlxuICAgICAgICA8b3B0aW9uIHZhbHVlPVwiZGVza3RvcFwiPkRlc2t0b3A8L29wdGlvbj5cbiAgICAgICAgPG9wdGlvbiB2YWx1ZT1cIm1vYmlsZVwiPk1vYmlsZTwvb3B0aW9uPlxuICAgICAgICA8b3B0aW9uIHZhbHVlPVwicmVkdWNlZC1tb3Rpb25cIj5SZWR1Y2VkIG1vdGlvbjwvb3B0aW9uPlxuICAgICAgPC9zZWxlY3Q+XG4gICAgPC9kaXY+XG4gICk7XG59XG5cbmZ1bmN0aW9uIFRpbWVsaW5lKHsgc3RvcmUsIHNuYXBzaG90LCBvbk9wZW5HbG9iYWwgfSkge1xuICBjb25zdCB7IGRvY3VtZW50LCBjb21waWxlZFBsYW4sIHNlbGVjdGlvbiwgdHJhbnNwb3J0IH0gPSBzbmFwc2hvdDtcbiAgY29uc3Qgc2VsZWN0ZWRDdWVNZW1iZXJzID0gZ2V0QWJvdXROYXJyYXRpdmVTZWxlY3Rpb25NZW1iZXJzKHNlbGVjdGlvbik7XG4gIGNvbnN0IG1heFdVID0gTWF0aC5tYXgoMC4wMDEsIGNvbXBpbGVkUGxhbj8ubWF4U3RvcnlXVSB8fCBkb2N1bWVudC5zZWN0aW9ucy5yZWR1Y2UoKHN1bSwgc2VjdGlvbikgPT4gc3VtICsgc2VjdGlvbi5leHRlbnRXVSwgMCkpO1xuICBjb25zdCBwbGF5aGVhZCA9IGAkeyh0cmFuc3BvcnQuc3RvcnlXVSAvIG1heFdVKSAqIDEwMH0lYDtcbiAgY29uc3QgbGFuZXNSZWYgPSB1c2VSZWYobnVsbCk7XG4gIGNvbnN0IHRpbWluZ0RyYWdSZWYgPSB1c2VSZWYobnVsbCk7XG4gIGNvbnN0IHByZXZpZXdGcmFtZVJlZiA9IHVzZVJlZihudWxsKTtcbiAgY29uc3QgcGVuZGluZ1ByZXZpZXdSZWYgPSB1c2VSZWYobnVsbCk7XG4gIGNvbnN0IHN1cHByZXNzZWRDbGlja1JlZiA9IHVzZVJlZihudWxsKTtcbiAgY29uc3QgW2NhbWVyYURyYWdQcmV2aWV3LCBzZXRDYW1lcmFEcmFnUHJldmlld10gPSB1c2VTdGF0ZShudWxsKTtcbiAgY29uc3QgW3NlY3Rpb25SZXNpemVQcmV2aWV3LCBzZXRTZWN0aW9uUmVzaXplUHJldmlld10gPSB1c2VTdGF0ZShudWxsKTtcbiAgY29uc3QgW21hcnF1ZWUsIHNldE1hcnF1ZWVdID0gdXNlU3RhdGUobnVsbCk7XG5cbiAgY29uc3QgcXVldWVQcmV2aWV3RnJhbWUgPSAoY2FsbGJhY2spID0+IHtcbiAgICBwZW5kaW5nUHJldmlld1JlZi5jdXJyZW50ID0gY2FsbGJhY2s7XG4gICAgaWYgKHByZXZpZXdGcmFtZVJlZi5jdXJyZW50KSByZXR1cm47XG4gICAgcHJldmlld0ZyYW1lUmVmLmN1cnJlbnQgPSByZXF1ZXN0QW5pbWF0aW9uRnJhbWUoKCkgPT4ge1xuICAgICAgcHJldmlld0ZyYW1lUmVmLmN1cnJlbnQgPSBudWxsO1xuICAgICAgY29uc3QgcGVuZGluZyA9IHBlbmRpbmdQcmV2aWV3UmVmLmN1cnJlbnQ7XG4gICAgICBwZW5kaW5nUHJldmlld1JlZi5jdXJyZW50ID0gbnVsbDtcbiAgICAgIHBlbmRpbmc/LigpO1xuICAgIH0pO1xuICB9O1xuICBjb25zdCBmbHVzaFByZXZpZXdGcmFtZSA9ICgpID0+IHtcbiAgICBpZiAocHJldmlld0ZyYW1lUmVmLmN1cnJlbnQpIGNhbmNlbEFuaW1hdGlvbkZyYW1lKHByZXZpZXdGcmFtZVJlZi5jdXJyZW50KTtcbiAgICBwcmV2aWV3RnJhbWVSZWYuY3VycmVudCA9IG51bGw7XG4gICAgY29uc3QgcGVuZGluZyA9IHBlbmRpbmdQcmV2aWV3UmVmLmN1cnJlbnQ7XG4gICAgcGVuZGluZ1ByZXZpZXdSZWYuY3VycmVudCA9IG51bGw7XG4gICAgcGVuZGluZz8uKCk7XG4gIH07XG5cbiAgY29uc3Qgem9vbVRpbWVsaW5lID0gKGV2ZW50KSA9PiB7XG4gICAgaWYgKCFldmVudC5jdHJsS2V5ICYmICFldmVudC5tZXRhS2V5KSByZXR1cm47XG4gICAgZXZlbnQucHJldmVudERlZmF1bHQoKTtcbiAgICBjb25zdCBsYW5lcyA9IGxhbmVzUmVmLmN1cnJlbnQ7XG4gICAgaWYgKCFsYW5lcykgcmV0dXJuO1xuICAgIGNvbnN0IHJlY3QgPSBsYW5lcy5nZXRCb3VuZGluZ0NsaWVudFJlY3QoKTtcbiAgICBjb25zdCBwb2ludGVyWCA9IE1hdGgubWluKHJlY3Qud2lkdGgsIE1hdGgubWF4KDAsIGV2ZW50LmNsaWVudFggLSByZWN0LmxlZnQpKTtcbiAgICBjb25zdCBzdG9yeVJhdGlvID0gKGxhbmVzLnNjcm9sbExlZnQgKyBwb2ludGVyWCkgLyBNYXRoLm1heCgxLCBsYW5lcy5zY3JvbGxXaWR0aCk7XG4gICAgY29uc3QgY3VycmVudFpvb20gPSBNYXRoLm1heCgxLCBOdW1iZXIodHJhbnNwb3J0Lnpvb20pIHx8IDEpO1xuICAgIGNvbnN0IG5leHRab29tID0gTWF0aC5taW4oOCwgTWF0aC5tYXgoMSwgY3VycmVudFpvb20gKiBNYXRoLmV4cCgtZXZlbnQuZGVsdGFZICogMC4wMDI1KSkpO1xuICAgIHN0b3JlLnNldFRyYW5zcG9ydCh7IHpvb206IE51bWJlcihuZXh0Wm9vbS50b0ZpeGVkKDMpKSB9KTtcbiAgICByZXF1ZXN0QW5pbWF0aW9uRnJhbWUoKCkgPT4ge1xuICAgICAgbGFuZXMuc2Nyb2xsTGVmdCA9IChzdG9yeVJhdGlvICogbGFuZXMuc2Nyb2xsV2lkdGgpIC0gcG9pbnRlclg7XG4gICAgfSk7XG4gIH07XG5cbiAgdXNlRWZmZWN0KCgpID0+ICgpID0+IHtcbiAgICBpZiAocHJldmlld0ZyYW1lUmVmLmN1cnJlbnQpIGNhbmNlbEFuaW1hdGlvbkZyYW1lKHByZXZpZXdGcmFtZVJlZi5jdXJyZW50KTtcbiAgfSwgW10pO1xuXG4gIGNvbnN0IHJlc29sdmVDYW1lcmFEcm9wQXRDbGllbnRYID0gKGNsaWVudFgpID0+IHtcbiAgICBjb25zdCBsYW5lcyA9IGxhbmVzUmVmLmN1cnJlbnQ7XG4gICAgY29uc3QgY3VycmVudCA9IHN0b3JlLmdldFNuYXBzaG90KCk7XG4gICAgaWYgKCFsYW5lcykgcmV0dXJuIHsgdmFsaWQ6IGZhbHNlLCByZWFzb246ICdUaGUgY2FtZXJhIHRpbWVsaW5lIGlzIG5vdCByZWFkeS4nIH07XG4gICAgY29uc3QgcmVjdCA9IGxhbmVzLmdldEJvdW5kaW5nQ2xpZW50UmVjdCgpO1xuICAgIGNvbnN0IGNvbnRlbnRYID0gTWF0aC5taW4oXG4gICAgICBsYW5lcy5zY3JvbGxXaWR0aCxcbiAgICAgIE1hdGgubWF4KDAsIGNsaWVudFggLSByZWN0LmxlZnQgKyBsYW5lcy5zY3JvbGxMZWZ0KSxcbiAgICApO1xuICAgIGNvbnN0IHN0b3J5V1UgPSAoY29udGVudFggLyBNYXRoLm1heCgxLCBsYW5lcy5zY3JvbGxXaWR0aCkpXG4gICAgICAqIE1hdGgubWF4KDAuMDAxLCBjdXJyZW50LmNvbXBpbGVkUGxhbj8ubWF4U3RvcnlXVSB8fCBtYXhXVSk7XG4gICAgY29uc3QgZHJhZyA9IHRpbWluZ0RyYWdSZWYuY3VycmVudDtcbiAgICBjb25zdCBkcm9wID0gcmVzb2x2ZUFib3V0TmFycmF0aXZlQ2FtZXJhS2V5RHJvcCh7XG4gICAgICBkb2N1bWVudDogY3VycmVudC5kb2N1bWVudCxcbiAgICAgIHBsYW46IGN1cnJlbnQuY29tcGlsZWRQbGFuLFxuICAgICAgc291cmNlU2VjdGlvbkluZGV4OiBkcmFnPy5zZWN0aW9uSW5kZXgsXG4gICAgICBzb3VyY2VLZXlJbmRleDogZHJhZz8ua2V5SW5kZXgsXG4gICAgICBzdG9yeVdVLFxuICAgIH0pO1xuICAgIHJldHVybiB7IC4uLmRyb3AsIGNvbnRlbnRYIH07XG4gIH07XG5cbiAgY29uc3QgYmVnaW5UaW1pbmdEcmFnID0gKGV2ZW50LCBkcmFnKSA9PiB7XG4gICAgaWYgKGRyYWcubG9ja2VkIHx8IGV2ZW50LmJ1dHRvbiAhPT0gMCkgcmV0dXJuO1xuICAgIGNvbnN0IGNsaXAgPSBldmVudC5jdXJyZW50VGFyZ2V0LnBhcmVudEVsZW1lbnQ7XG4gICAgY29uc3QgcmVjdCA9IGNsaXA/LmdldEJvdW5kaW5nQ2xpZW50UmVjdCgpO1xuICAgIGlmICghcmVjdD8ud2lkdGgpIHJldHVybjtcbiAgICBldmVudC5wcmV2ZW50RGVmYXVsdCgpO1xuICAgIGV2ZW50LnN0b3BQcm9wYWdhdGlvbigpO1xuICAgIGV2ZW50LmN1cnJlbnRUYXJnZXQuc2V0UG9pbnRlckNhcHR1cmU/LihldmVudC5wb2ludGVySWQpO1xuICAgIGxldCBuZXh0U2VsZWN0aW9uID0gZHJhZy5zZWxlY3Rpb247XG4gICAgaWYgKGRyYWcudHlwZSA9PT0gJ2N1ZScpIHtcbiAgICAgIGNvbnN0IGN1cnJlbnRTZWxlY3Rpb24gPSBzdG9yZS5nZXRTbmFwc2hvdCgpLnNlbGVjdGlvbjtcbiAgICAgIGNvbnN0IGN1cnJlbnRNZW1iZXJzID0gZ2V0QWJvdXROYXJyYXRpdmVTZWxlY3Rpb25NZW1iZXJzKGN1cnJlbnRTZWxlY3Rpb24pO1xuICAgICAgY29uc3QgYWxyZWFkeVNlbGVjdGVkID0gY3VycmVudE1lbWJlcnMuc29tZSgobWVtYmVyKSA9PiAoXG4gICAgICAgIG1lbWJlci5zZWN0aW9uSWQgPT09IGRyYWcuc2VsZWN0aW9uLnNlY3Rpb25JZCAmJiBtZW1iZXIuY3VlSWQgPT09IGRyYWcuc2VsZWN0aW9uLmN1ZUlkXG4gICAgICApKTtcbiAgICAgIG5leHRTZWxlY3Rpb24gPSBldmVudC5zaGlmdEtleVxuICAgICAgICA/IHRvZ2dsZUFib3V0TmFycmF0aXZlQ3VlU2VsZWN0aW9uKGN1cnJlbnRTZWxlY3Rpb24sIGRyYWcuc2VsZWN0aW9uKVxuICAgICAgICA6IGFscmVhZHlTZWxlY3RlZCAmJiBjdXJyZW50TWVtYmVycy5sZW5ndGggPiAxXG4gICAgICAgICAgPyB7IC4uLmRyYWcuc2VsZWN0aW9uLCBtZW1iZXJzOiBjdXJyZW50TWVtYmVycyB9XG4gICAgICAgICAgOiBkcmFnLnNlbGVjdGlvbjtcbiAgICAgIHN0b3JlLmJlZ2luUHJldmlldygnTW92ZSB0ZXh0IEN1ZXMnKTtcbiAgICB9XG4gICAgdGltaW5nRHJhZ1JlZi5jdXJyZW50ID0ge1xuICAgICAgLi4uZHJhZyxcbiAgICAgIHNlbGVjdGlvbjogbmV4dFNlbGVjdGlvbixcbiAgICAgIG1lbWJlcnM6IGRyYWcudHlwZSA9PT0gJ2N1ZScgPyBnZXRBYm91dE5hcnJhdGl2ZVNlbGVjdGlvbk1lbWJlcnMobmV4dFNlbGVjdGlvbikgOiBudWxsLFxuICAgICAgc3RhcnREb2N1bWVudDogZHJhZy50eXBlID09PSAnY3VlJyA/IGNsb25lQWJvdXROYXJyYXRpdmVEb2N1bWVudChzdG9yZS5nZXRTbmFwc2hvdCgpLmRvY3VtZW50KSA6IG51bGwsXG4gICAgICBzdGFydFBsYW46IGRyYWcudHlwZSA9PT0gJ2N1ZScgPyBzdG9yZS5nZXRTbmFwc2hvdCgpLmNvbXBpbGVkUGxhbiA6IG51bGwsXG4gICAgICBwb2ludGVySWQ6IGV2ZW50LnBvaW50ZXJJZCxcbiAgICAgIHJlY3QsXG4gICAgICBzdGFydFg6IGV2ZW50LmNsaWVudFgsXG4gICAgICBtb3ZlZDogZmFsc2UsXG4gICAgICBsYXN0QXQ6IGRyYWcuYXQsXG4gICAgICBsYXN0RHJvcDogbnVsbCxcbiAgICB9O1xuICAgIHN0b3JlLnNldFNlbGVjdGlvbihuZXh0U2VsZWN0aW9uKTtcbiAgICBzdG9yZS5zZXRUcmFuc3BvcnQoeyBvd25lcjogJ3RpbWVsaW5lJywgcGxheWluZzogZmFsc2UsIHN0b3J5V1U6IGRyYWcuc3RvcnlXVSB9KTtcbiAgfTtcblxuICBjb25zdCBtb3ZlVGltaW5nRHJhZyA9IChldmVudCkgPT4ge1xuICAgIGNvbnN0IGRyYWcgPSB0aW1pbmdEcmFnUmVmLmN1cnJlbnQ7XG4gICAgaWYgKCFkcmFnIHx8IGRyYWcucG9pbnRlcklkICE9PSBldmVudC5wb2ludGVySWQpIHJldHVybjtcbiAgICBpZiAoIWRyYWcubW92ZWQgJiYgTWF0aC5hYnMoZXZlbnQuY2xpZW50WCAtIGRyYWcuc3RhcnRYKSA8IDMpIHJldHVybjtcbiAgICBkcmFnLm1vdmVkID0gdHJ1ZTtcbiAgICBpZiAoZHJhZy50eXBlID09PSAnY2FtZXJhJykge1xuICAgICAgY29uc3QgZHJvcCA9IHJlc29sdmVDYW1lcmFEcm9wQXRDbGllbnRYKGV2ZW50LmNsaWVudFgpO1xuICAgICAgZHJhZy5sYXN0RHJvcCA9IGRyb3A7XG4gICAgICBzZXRDYW1lcmFEcmFnUHJldmlldyh7IC4uLmRyb3AsIHRva2VuOiBkcmFnLnRva2VuIH0pO1xuICAgICAgaWYgKGRyb3AudmFsaWQpIHtcbiAgICAgICAgc3RvcmUuc2V0VHJhbnNwb3J0KHsgb3duZXI6ICd0aW1lbGluZScsIHBsYXlpbmc6IGZhbHNlLCBzdG9yeVdVOiBkcm9wLnN0b3J5V1UgfSk7XG4gICAgICB9XG4gICAgICByZXR1cm47XG4gICAgfVxuICAgIGlmIChkcmFnLnR5cGUgPT09ICdkaXNjaXBsaW5lLXJldmVhbCcpIHtcbiAgICAgIGNvbnN0IGRlbHRhTGFuZSA9IChldmVudC5jbGllbnRYIC0gZHJhZy5zdGFydFgpIC8gZHJhZy5yZWN0LndpZHRoO1xuICAgICAgY29uc3QgbmV4dEF0ID0gTWF0aC5taW4oZHJhZy5tYXgsIE1hdGgubWF4KFxuICAgICAgICBkcmFnLm1pbixcbiAgICAgICAgc25hcEFib3V0TmFycmF0aXZlVGltZWxpbmVWYWx1ZShkcmFnLmF0ICsgZGVsdGFMYW5lKSxcbiAgICAgICkpO1xuICAgICAgaWYgKE1hdGguYWJzKG5leHRBdCAtIGRyYWcubGFzdEF0KSA8IDAuMDAwMDAxKSByZXR1cm47XG4gICAgICBjb25zdCBkZWx0YSA9IG5leHRBdCAtIGRyYWcubGFzdEF0O1xuICAgICAgc3RvcmUuY29tbWl0KCdNb3ZlIERpc2NpcGxpbmUgcmV2ZWFsJywgKGRyYWZ0KSA9PiB7XG4gICAgICAgIGNvbnN0IHJldmVhbCA9IGRyYWZ0LnNlY3Rpb25zW2RyYWcuc2VjdGlvbkluZGV4XS50ZXh0LmRpc2NpcGxpbmVSZXZlYWw7XG4gICAgICAgIGlmICghcmV2ZWFsKSByZXR1cm47XG4gICAgICAgIHJldmVhbC5zdGFydCArPSBkZWx0YTtcbiAgICAgICAgcmV2ZWFsLmVuZCArPSBkZWx0YTtcbiAgICAgIH0sIHsgY29hbGVzY2VLZXk6IGRyYWcuY29hbGVzY2VLZXksIHNlbGVjdGlvbjogZHJhZy5zZWxlY3Rpb24gfSk7XG4gICAgICBkcmFnLmxhc3RBdCA9IG5leHRBdDtcbiAgICAgIHN0b3JlLnNldFRyYW5zcG9ydCh7XG4gICAgICAgIG93bmVyOiAndGltZWxpbmUnLFxuICAgICAgICBwbGF5aW5nOiBmYWxzZSxcbiAgICAgICAgc3RvcnlXVTogZHJhZy5zZWN0aW9uU3RhcnRXVSArIChuZXh0QXQgKiBkcmFnLnRyYXZlbFdVKSxcbiAgICAgIH0pO1xuICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICBjb25zdCBsb2NhbERlbHRhID0gKGV2ZW50LmNsaWVudFggLSBkcmFnLnN0YXJ0WCkgLyBkcmFnLnJlY3Qud2lkdGg7XG4gICAgY29uc3QgbW92ZW1lbnQgPSByZXNvbHZlQWJvdXROYXJyYXRpdmVDdWVHcm91cE1vdmUoe1xuICAgICAgZG9jdW1lbnQ6IGRyYWcuc3RhcnREb2N1bWVudCxcbiAgICAgIHBsYW46IGRyYWcuc3RhcnRQbGFuLFxuICAgICAgbWVtYmVyczogZHJhZy5tZW1iZXJzLFxuICAgICAgcHJpbWFyeTogZHJhZy5zZWxlY3Rpb24sXG4gICAgICBsb2NhbERlbHRhLFxuICAgIH0pO1xuICAgIGlmICghbW92ZW1lbnQudmFsaWQgfHwgTWF0aC5hYnMobW92ZW1lbnQuZGVsdGFXVSAtIChkcmFnLmxhc3REZWx0YVdVIHx8IDApKSA8IDAuMDAwMDAxKSByZXR1cm47XG4gICAgZHJhZy5sYXN0RGVsdGFXVSA9IG1vdmVtZW50LmRlbHRhV1U7XG4gICAgcXVldWVQcmV2aWV3RnJhbWUoKCkgPT4ge1xuICAgICAgc3RvcmUudXBkYXRlUHJldmlldygoZHJhZnQpID0+IHtcbiAgICAgICAgbW92ZW1lbnQubW92ZXMuZm9yRWFjaCgobW92ZSkgPT4ge1xuICAgICAgICAgIGNvbnN0IGN1ZSA9IGRyYWZ0LnNlY3Rpb25zW21vdmUuc2VjdGlvbkluZGV4XT8udGV4dD8uY3Vlcz8uZmluZCgoaXRlbSkgPT4gaXRlbS5pZCA9PT0gbW92ZS5jdWVJZCk7XG4gICAgICAgICAgaWYgKGN1ZSkgT2JqZWN0LmFzc2lnbihjdWUsIHsgZW50ZXI6IG1vdmUuZW50ZXIsIGhvbGQ6IG1vdmUuaG9sZCwgZXhpdDogbW92ZS5leGl0IH0pO1xuICAgICAgICB9KTtcbiAgICAgIH0sIHtcbiAgICAgICAgb3duZXI6ICd0aW1lbGluZScsXG4gICAgICAgIHBsYXlpbmc6IGZhbHNlLFxuICAgICAgICBzdG9yeVdVOiBkcmFnLnN0b3J5V1UgKyBtb3ZlbWVudC5kZWx0YVdVLFxuICAgICAgfSk7XG4gICAgfSk7XG4gIH07XG5cbiAgY29uc3QgZW5kVGltaW5nRHJhZyA9IChldmVudCkgPT4ge1xuICAgIGNvbnN0IGRyYWcgPSB0aW1pbmdEcmFnUmVmLmN1cnJlbnQ7XG4gICAgaWYgKCFkcmFnIHx8IGRyYWcucG9pbnRlcklkICE9PSBldmVudC5wb2ludGVySWQpIHJldHVybjtcbiAgICBpZiAoZXZlbnQuY3VycmVudFRhcmdldC5oYXNQb2ludGVyQ2FwdHVyZT8uKGV2ZW50LnBvaW50ZXJJZCkpIGV2ZW50LmN1cnJlbnRUYXJnZXQucmVsZWFzZVBvaW50ZXJDYXB0dXJlKGV2ZW50LnBvaW50ZXJJZCk7XG4gICAgaWYgKGRyYWcudHlwZSA9PT0gJ2N1ZScpIHtcbiAgICAgIGZsdXNoUHJldmlld0ZyYW1lKCk7XG4gICAgICBpZiAoZXZlbnQudHlwZSA9PT0gJ3BvaW50ZXJjYW5jZWwnIHx8ICFkcmFnLm1vdmVkKSBzdG9yZS5jYW5jZWxQcmV2aWV3KCk7XG4gICAgICBlbHNlIHN0b3JlLmNvbW1pdFByZXZpZXcoZHJhZy5zZWxlY3Rpb24pO1xuICAgIH1cbiAgICBpZiAoZHJhZy50eXBlID09PSAnY2FtZXJhJyAmJiBkcmFnLm1vdmVkICYmIGV2ZW50LnR5cGUgIT09ICdwb2ludGVyY2FuY2VsJykge1xuICAgICAgY29uc3QgZHJvcCA9IGRyYWcubGFzdERyb3AgfHwgcmVzb2x2ZUNhbWVyYURyb3BBdENsaWVudFgoZXZlbnQuY2xpZW50WCk7XG4gICAgICBpZiAoZHJvcC52YWxpZCkge1xuICAgICAgICBzdG9yZS5jb21taXQoJ01vdmUgY2FtZXJhIGtleScsIChkcmFmdCkgPT4ge1xuICAgICAgICAgIGNvbnN0IHNvdXJjZUtleXMgPSBkcmFmdC5zZWN0aW9uc1tkcmFnLnNlY3Rpb25JbmRleF0/LmNhbWVyYS5rZXlzO1xuICAgICAgICAgIGNvbnN0IFttb3ZlZEtleV0gPSBzb3VyY2VLZXlzPy5zcGxpY2UoZHJhZy5rZXlJbmRleCwgMSkgfHwgW107XG4gICAgICAgICAgaWYgKCFtb3ZlZEtleSkgcmV0dXJuO1xuICAgICAgICAgIG1vdmVkS2V5LmF0ID0gZHJvcC5hdDtcbiAgICAgICAgICBjb25zdCBkZXN0aW5hdGlvbktleXMgPSBkcmFmdC5zZWN0aW9uc1tkcm9wLnNlY3Rpb25JbmRleF0uY2FtZXJhLmtleXM7XG4gICAgICAgICAgZGVzdGluYXRpb25LZXlzLnB1c2gobW92ZWRLZXkpO1xuICAgICAgICAgIGRlc3RpbmF0aW9uS2V5cy5zb3J0KChhLCBiKSA9PiBhLmF0IC0gYi5hdCk7XG4gICAgICAgIH0sIHtcbiAgICAgICAgICBzZWxlY3Rpb246IHsgdHlwZTogJ2NhbWVyYS1rZXknLCBzZWN0aW9uSWQ6IGRyb3Auc2VjdGlvbklkLCBrZXlJbmRleDogZHJvcC5rZXlJbmRleCB9LFxuICAgICAgICB9KTtcbiAgICAgICAgc3RvcmUuc2V0VHJhbnNwb3J0KHsgb3duZXI6ICd0aW1lbGluZScsIHBsYXlpbmc6IGZhbHNlLCBzdG9yeVdVOiBkcm9wLnN0b3J5V1UgfSk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBzdG9yZS5zZXRTYXZlU3RhdGUoeyBtZXNzYWdlOiBkcm9wLnJlYXNvbiB8fCAnVGhhdCBjYW1lcmEga2V5IGNhbm5vdCBiZSBwbGFjZWQgaGVyZS4nIH0pO1xuICAgICAgfVxuICAgIH1cbiAgICBpZiAoZHJhZy5tb3ZlZCkge1xuICAgICAgc3VwcHJlc3NlZENsaWNrUmVmLmN1cnJlbnQgPSBkcmFnLnRva2VuO1xuICAgICAgd2luZG93LnNldFRpbWVvdXQoKCkgPT4ge1xuICAgICAgICBpZiAoc3VwcHJlc3NlZENsaWNrUmVmLmN1cnJlbnQgPT09IGRyYWcudG9rZW4pIHN1cHByZXNzZWRDbGlja1JlZi5jdXJyZW50ID0gbnVsbDtcbiAgICAgIH0sIDApO1xuICAgIH1cbiAgICBzZXRDYW1lcmFEcmFnUHJldmlldyhudWxsKTtcbiAgICB0aW1pbmdEcmFnUmVmLmN1cnJlbnQgPSBudWxsO1xuICB9O1xuXG4gIGNvbnN0IGhhbmRsZVRpbWluZ0NsaWNrID0gKHRva2VuLCBhY3Rpb24pID0+IHtcbiAgICBpZiAoc3VwcHJlc3NlZENsaWNrUmVmLmN1cnJlbnQgPT09IHRva2VuKSB7XG4gICAgICBzdXBwcmVzc2VkQ2xpY2tSZWYuY3VycmVudCA9IG51bGw7XG4gICAgICByZXR1cm47XG4gICAgfVxuICAgIGFjdGlvbigpO1xuICB9O1xuXG4gIGNvbnN0IGJlZ2luU2VjdGlvblJlc2l6ZSA9IChldmVudCwgZGF0YSkgPT4ge1xuICAgIGlmIChkYXRhLmxvY2tlZCB8fCBldmVudC5idXR0b24gIT09IDApIHJldHVybjtcbiAgICBldmVudC5wcmV2ZW50RGVmYXVsdCgpO1xuICAgIGV2ZW50LnN0b3BQcm9wYWdhdGlvbigpO1xuICAgIGV2ZW50LmN1cnJlbnRUYXJnZXQuc2V0UG9pbnRlckNhcHR1cmU/LihldmVudC5wb2ludGVySWQpO1xuICAgIGNvbnN0IGN1cnJlbnQgPSBzdG9yZS5nZXRTbmFwc2hvdCgpO1xuICAgIGNvbnN0IGZpZWxkID0gZ2V0QWJvdXROYXJyYXRpdmVFeHRlbnRGaWVsZChjdXJyZW50LnByZXZpZXdQcm9maWxlKTtcbiAgICBzdG9yZS5iZWdpblByZXZpZXcoYFJlc2l6ZSAke2RhdGEuc2VjdGlvbkxhYmVsfWApO1xuICAgIHN0b3JlLnNldFNlbGVjdGlvbih7IHR5cGU6ICdzZWN0aW9uJywgc2VjdGlvbklkOiBkYXRhLnNlY3Rpb25JZCB9KTtcbiAgICB0aW1pbmdEcmFnUmVmLmN1cnJlbnQgPSB7XG4gICAgICB0eXBlOiAnc2VjdGlvbi1yZXNpemUnLFxuICAgICAgdG9rZW46IGBzZWN0aW9uLXJlc2l6ZToke2RhdGEuc2VjdGlvbklkfWAsXG4gICAgICBwb2ludGVySWQ6IGV2ZW50LnBvaW50ZXJJZCxcbiAgICAgIHN0YXJ0WDogZXZlbnQuY2xpZW50WCxcbiAgICAgIG1vdmVkOiBmYWxzZSxcbiAgICAgIHNlY3Rpb25JZDogZGF0YS5zZWN0aW9uSWQsXG4gICAgICBzZWN0aW9uSW5kZXg6IGRhdGEuc2VjdGlvbkluZGV4LFxuICAgICAgc2VjdGlvbkxhYmVsOiBkYXRhLnNlY3Rpb25MYWJlbCxcbiAgICAgIGZpZWxkLFxuICAgICAgc3RhcnRFeHRlbnQ6IE51bWJlcihjdXJyZW50LmRvY3VtZW50LnNlY3Rpb25zW2RhdGEuc2VjdGlvbkluZGV4XVtmaWVsZF0pLFxuICAgICAgc3RhcnRNYXhXVTogTWF0aC5tYXgoMC4wMDEsIGN1cnJlbnQuY29tcGlsZWRQbGFuPy5tYXhTdG9yeVdVIHx8IG1heFdVKSxcbiAgICAgIHN0YXJ0U2Nyb2xsV2lkdGg6IE1hdGgubWF4KDEsIGxhbmVzUmVmLmN1cnJlbnQ/LnNjcm9sbFdpZHRoIHx8IDEpLFxuICAgICAgcGxheWhlYWRDb250ZXh0OiBjYXB0dXJlQWJvdXROYXJyYXRpdmVQbGF5aGVhZENvbnRleHQoe1xuICAgICAgICBwbGFuOiBjdXJyZW50LmNvbXBpbGVkUGxhbixcbiAgICAgICAgc3RvcnlXVTogY3VycmVudC50cmFuc3BvcnQuc3RvcnlXVSxcbiAgICAgICAgcmVzaXplZFNlY3Rpb25JZDogZGF0YS5zZWN0aW9uSWQsXG4gICAgICB9KSxcbiAgICAgIHNlbGVjdGlvbjogeyB0eXBlOiAnc2VjdGlvbicsIHNlY3Rpb25JZDogZGF0YS5zZWN0aW9uSWQgfSxcbiAgICB9O1xuICAgIHNldFNlY3Rpb25SZXNpemVQcmV2aWV3KHsgc2VjdGlvbklkOiBkYXRhLnNlY3Rpb25JZCwgZXh0ZW50OiBOdW1iZXIoY3VycmVudC5kb2N1bWVudC5zZWN0aW9uc1tkYXRhLnNlY3Rpb25JbmRleF1bZmllbGRdKSB9KTtcbiAgfTtcblxuICBjb25zdCBtb3ZlU2VjdGlvblJlc2l6ZSA9IChldmVudCkgPT4ge1xuICAgIGNvbnN0IGRyYWcgPSB0aW1pbmdEcmFnUmVmLmN1cnJlbnQ7XG4gICAgaWYgKGRyYWc/LnR5cGUgIT09ICdzZWN0aW9uLXJlc2l6ZScgfHwgZHJhZy5wb2ludGVySWQgIT09IGV2ZW50LnBvaW50ZXJJZCkgcmV0dXJuO1xuICAgIGlmICghZHJhZy5tb3ZlZCAmJiBNYXRoLmFicyhldmVudC5jbGllbnRYIC0gZHJhZy5zdGFydFgpIDwgMykgcmV0dXJuO1xuICAgIGRyYWcubW92ZWQgPSB0cnVlO1xuICAgIGNvbnN0IHJhd0V4dGVudCA9IGRyYWcuc3RhcnRFeHRlbnQgKyAoKChldmVudC5jbGllbnRYIC0gZHJhZy5zdGFydFgpIC8gZHJhZy5zdGFydFNjcm9sbFdpZHRoKSAqIGRyYWcuc3RhcnRNYXhXVSk7XG4gICAgY29uc3Qgc3RlcCA9IGV2ZW50LmFsdEtleSA/IDAuMDEgOiBldmVudC5zaGlmdEtleSA/IDAuMjUgOiAwLjA1O1xuICAgIGNvbnN0IGV4dGVudCA9IE1hdGgubWluKDgsIE1hdGgubWF4KDEsIE1hdGgucm91bmQocmF3RXh0ZW50IC8gc3RlcCkgKiBzdGVwKSk7XG4gICAgaWYgKE1hdGguYWJzKGV4dGVudCAtIChkcmFnLmxhc3RFeHRlbnQgPz8gZHJhZy5zdGFydEV4dGVudCkpIDwgMC4wMDAwMDEpIHJldHVybjtcbiAgICBkcmFnLmxhc3RFeHRlbnQgPSBOdW1iZXIoZXh0ZW50LnRvRml4ZWQoMikpO1xuICAgIHNldFNlY3Rpb25SZXNpemVQcmV2aWV3KHsgc2VjdGlvbklkOiBkcmFnLnNlY3Rpb25JZCwgZXh0ZW50OiBkcmFnLmxhc3RFeHRlbnQgfSk7XG4gICAgcXVldWVQcmV2aWV3RnJhbWUoKCkgPT4ge1xuICAgICAgc3RvcmUudXBkYXRlUHJldmlldygoZHJhZnQpID0+IHtcbiAgICAgICAgZHJhZnQuc2VjdGlvbnNbZHJhZy5zZWN0aW9uSW5kZXhdW2RyYWcuZmllbGRdID0gZHJhZy5sYXN0RXh0ZW50O1xuICAgICAgfSk7XG4gICAgICBzdG9yZS5zZXRUcmFuc3BvcnQoe1xuICAgICAgICBvd25lcjogJ3RpbWVsaW5lJyxcbiAgICAgICAgcGxheWluZzogZmFsc2UsXG4gICAgICAgIHN0b3J5V1U6IHJlbWFwQWJvdXROYXJyYXRpdmVQbGF5aGVhZENvbnRleHQoZHJhZy5wbGF5aGVhZENvbnRleHQsIHN0b3JlLmdldFNuYXBzaG90KCkuY29tcGlsZWRQbGFuKSxcbiAgICAgIH0pO1xuICAgIH0pO1xuICB9O1xuXG4gIGNvbnN0IGVuZFNlY3Rpb25SZXNpemUgPSAoZXZlbnQpID0+IHtcbiAgICBjb25zdCBkcmFnID0gdGltaW5nRHJhZ1JlZi5jdXJyZW50O1xuICAgIGlmIChkcmFnPy50eXBlICE9PSAnc2VjdGlvbi1yZXNpemUnIHx8IGRyYWcucG9pbnRlcklkICE9PSBldmVudC5wb2ludGVySWQpIHJldHVybjtcbiAgICBpZiAoZXZlbnQuY3VycmVudFRhcmdldC5oYXNQb2ludGVyQ2FwdHVyZT8uKGV2ZW50LnBvaW50ZXJJZCkpIGV2ZW50LmN1cnJlbnRUYXJnZXQucmVsZWFzZVBvaW50ZXJDYXB0dXJlKGV2ZW50LnBvaW50ZXJJZCk7XG4gICAgZmx1c2hQcmV2aWV3RnJhbWUoKTtcbiAgICBpZiAoZXZlbnQudHlwZSA9PT0gJ3BvaW50ZXJjYW5jZWwnIHx8ICFkcmFnLm1vdmVkKSBzdG9yZS5jYW5jZWxQcmV2aWV3KCk7XG4gICAgZWxzZSBzdG9yZS5jb21taXRQcmV2aWV3KGRyYWcuc2VsZWN0aW9uKTtcbiAgICB0aW1pbmdEcmFnUmVmLmN1cnJlbnQgPSBudWxsO1xuICAgIHNldFNlY3Rpb25SZXNpemVQcmV2aWV3KG51bGwpO1xuICB9O1xuXG4gIGNvbnN0IHJlc2V0U2VjdGlvbkV4dGVudCA9IChzZWN0aW9uSWQsIHNlY3Rpb25JbmRleCkgPT4ge1xuICAgIGNvbnN0IGN1cnJlbnQgPSBzdG9yZS5nZXRTbmFwc2hvdCgpO1xuICAgIGNvbnN0IGZpZWxkID0gZ2V0QWJvdXROYXJyYXRpdmVFeHRlbnRGaWVsZChjdXJyZW50LnByZXZpZXdQcm9maWxlKTtcbiAgICBjb25zdCBiYXNlbGluZVNlY3Rpb24gPSBjdXJyZW50LmJhc2VsaW5lRG9jdW1lbnQuc2VjdGlvbnMuZmluZCgoaXRlbSkgPT4gaXRlbS5pZCA9PT0gc2VjdGlvbklkKTtcbiAgICBpZiAoIWJhc2VsaW5lU2VjdGlvbiB8fCBiYXNlbGluZVNlY3Rpb25bZmllbGRdID09PSBjdXJyZW50LmRvY3VtZW50LnNlY3Rpb25zW3NlY3Rpb25JbmRleF1bZmllbGRdKSByZXR1cm47XG4gICAgY29uc3QgY29udGV4dCA9IGNhcHR1cmVBYm91dE5hcnJhdGl2ZVBsYXloZWFkQ29udGV4dCh7XG4gICAgICBwbGFuOiBjdXJyZW50LmNvbXBpbGVkUGxhbixcbiAgICAgIHN0b3J5V1U6IGN1cnJlbnQudHJhbnNwb3J0LnN0b3J5V1UsXG4gICAgICByZXNpemVkU2VjdGlvbklkOiBzZWN0aW9uSWQsXG4gICAgfSk7XG4gICAgc3RvcmUuYmVnaW5QcmV2aWV3KCdSZXN0b3JlIHNhdmVkIFNlY3Rpb24gbGVuZ3RoJyk7XG4gICAgc3RvcmUudXBkYXRlUHJldmlldygoZHJhZnQpID0+IHsgZHJhZnQuc2VjdGlvbnNbc2VjdGlvbkluZGV4XVtmaWVsZF0gPSBiYXNlbGluZVNlY3Rpb25bZmllbGRdOyB9KTtcbiAgICBzdG9yZS5zZXRUcmFuc3BvcnQoeyBzdG9yeVdVOiByZW1hcEFib3V0TmFycmF0aXZlUGxheWhlYWRDb250ZXh0KGNvbnRleHQsIHN0b3JlLmdldFNuYXBzaG90KCkuY29tcGlsZWRQbGFuKSB9KTtcbiAgICBzdG9yZS5jb21taXRQcmV2aWV3KHsgdHlwZTogJ3NlY3Rpb24nLCBzZWN0aW9uSWQgfSk7XG4gIH07XG5cbiAgY29uc3QgYmVnaW5NYXJxdWVlID0gKGV2ZW50KSA9PiB7XG4gICAgaWYgKGV2ZW50LmJ1dHRvbiAhPT0gMCB8fCBldmVudC50YXJnZXQgIT09IGV2ZW50LmN1cnJlbnRUYXJnZXQpIHJldHVybjtcbiAgICBjb25zdCBjYW52YXMgPSBsYW5lc1JlZi5jdXJyZW50Py5xdWVyeVNlbGVjdG9yKCcuYWJvdXQtZWRpdG9yLXRpbWVsaW5lLWNhbnZhcycpO1xuICAgIGlmICghY2FudmFzKSByZXR1cm47XG4gICAgZXZlbnQucHJldmVudERlZmF1bHQoKTtcbiAgICBldmVudC5jdXJyZW50VGFyZ2V0LnNldFBvaW50ZXJDYXB0dXJlPy4oZXZlbnQucG9pbnRlcklkKTtcbiAgICBjb25zdCByZWN0ID0gY2FudmFzLmdldEJvdW5kaW5nQ2xpZW50UmVjdCgpO1xuICAgIHRpbWluZ0RyYWdSZWYuY3VycmVudCA9IHtcbiAgICAgIHR5cGU6ICdtYXJxdWVlJyxcbiAgICAgIHBvaW50ZXJJZDogZXZlbnQucG9pbnRlcklkLFxuICAgICAgc3RhcnRDbGllbnRYOiBldmVudC5jbGllbnRYLFxuICAgICAgc3RhcnRDbGllbnRZOiBldmVudC5jbGllbnRZLFxuICAgICAgY2FudmFzUmVjdDogcmVjdCxcbiAgICAgIGFkZGl0aXZlOiBldmVudC5zaGlmdEtleSxcbiAgICB9O1xuICAgIHNldE1hcnF1ZWUoeyBsZWZ0OiBldmVudC5jbGllbnRYIC0gcmVjdC5sZWZ0LCB0b3A6IGV2ZW50LmNsaWVudFkgLSByZWN0LnRvcCwgd2lkdGg6IDAsIGhlaWdodDogMCB9KTtcbiAgfTtcblxuICBjb25zdCBtb3ZlTWFycXVlZSA9IChldmVudCkgPT4ge1xuICAgIGNvbnN0IGRyYWcgPSB0aW1pbmdEcmFnUmVmLmN1cnJlbnQ7XG4gICAgaWYgKGRyYWc/LnR5cGUgIT09ICdtYXJxdWVlJyB8fCBkcmFnLnBvaW50ZXJJZCAhPT0gZXZlbnQucG9pbnRlcklkKSByZXR1cm47XG4gICAgY29uc3QgbGVmdCA9IE1hdGgubWluKGRyYWcuc3RhcnRDbGllbnRYLCBldmVudC5jbGllbnRYKSAtIGRyYWcuY2FudmFzUmVjdC5sZWZ0O1xuICAgIGNvbnN0IHRvcCA9IE1hdGgubWluKGRyYWcuc3RhcnRDbGllbnRZLCBldmVudC5jbGllbnRZKSAtIGRyYWcuY2FudmFzUmVjdC50b3A7XG4gICAgc2V0TWFycXVlZSh7XG4gICAgICBsZWZ0LFxuICAgICAgdG9wLFxuICAgICAgd2lkdGg6IE1hdGguYWJzKGV2ZW50LmNsaWVudFggLSBkcmFnLnN0YXJ0Q2xpZW50WCksXG4gICAgICBoZWlnaHQ6IE1hdGguYWJzKGV2ZW50LmNsaWVudFkgLSBkcmFnLnN0YXJ0Q2xpZW50WSksXG4gICAgfSk7XG4gIH07XG5cbiAgY29uc3QgZW5kTWFycXVlZSA9IChldmVudCkgPT4ge1xuICAgIGNvbnN0IGRyYWcgPSB0aW1pbmdEcmFnUmVmLmN1cnJlbnQ7XG4gICAgaWYgKGRyYWc/LnR5cGUgIT09ICdtYXJxdWVlJyB8fCBkcmFnLnBvaW50ZXJJZCAhPT0gZXZlbnQucG9pbnRlcklkKSByZXR1cm47XG4gICAgaWYgKGV2ZW50LmN1cnJlbnRUYXJnZXQuaGFzUG9pbnRlckNhcHR1cmU/LihldmVudC5wb2ludGVySWQpKSBldmVudC5jdXJyZW50VGFyZ2V0LnJlbGVhc2VQb2ludGVyQ2FwdHVyZShldmVudC5wb2ludGVySWQpO1xuICAgIGlmIChldmVudC50eXBlICE9PSAncG9pbnRlcmNhbmNlbCcpIHtcbiAgICAgIGNvbnN0IHNlbGVjdGlvblJlY3QgPSB7XG4gICAgICAgIGxlZnQ6IE1hdGgubWluKGRyYWcuc3RhcnRDbGllbnRYLCBldmVudC5jbGllbnRYKSxcbiAgICAgICAgcmlnaHQ6IE1hdGgubWF4KGRyYWcuc3RhcnRDbGllbnRYLCBldmVudC5jbGllbnRYKSxcbiAgICAgICAgdG9wOiBNYXRoLm1pbihkcmFnLnN0YXJ0Q2xpZW50WSwgZXZlbnQuY2xpZW50WSksXG4gICAgICAgIGJvdHRvbTogTWF0aC5tYXgoZHJhZy5zdGFydENsaWVudFksIGV2ZW50LmNsaWVudFkpLFxuICAgICAgfTtcbiAgICAgIGNvbnN0IGxhbmVSZWN0ID0gbGFuZXNSZWYuY3VycmVudD8uZ2V0Qm91bmRpbmdDbGllbnRSZWN0KCk7XG4gICAgICBjb25zdCBoaXRzID0gWy4uLihsYW5lc1JlZi5jdXJyZW50Py5xdWVyeVNlbGVjdG9yQWxsKCcuYWJvdXQtZWRpdG9yLWN1ZVtkYXRhLWN1ZS1pZF0nKSB8fCBbXSldXG4gICAgICAgIC5maWx0ZXIoKG5vZGUpID0+IHtcbiAgICAgICAgICBjb25zdCByZWN0ID0gbm9kZS5nZXRCb3VuZGluZ0NsaWVudFJlY3QoKTtcbiAgICAgICAgICBjb25zdCB2aXNpYmxlID0gbGFuZVJlY3QgJiYgcmVjdC5yaWdodCA+PSBsYW5lUmVjdC5sZWZ0ICYmIHJlY3QubGVmdCA8PSBsYW5lUmVjdC5yaWdodDtcbiAgICAgICAgICByZXR1cm4gdmlzaWJsZSAmJiByZWN0LnJpZ2h0ID49IHNlbGVjdGlvblJlY3QubGVmdCAmJiByZWN0LmxlZnQgPD0gc2VsZWN0aW9uUmVjdC5yaWdodFxuICAgICAgICAgICAgJiYgcmVjdC5ib3R0b20gPj0gc2VsZWN0aW9uUmVjdC50b3AgJiYgcmVjdC50b3AgPD0gc2VsZWN0aW9uUmVjdC5ib3R0b207XG4gICAgICAgIH0pXG4gICAgICAgIC5tYXAoKG5vZGUpID0+ICh7IHR5cGU6ICdjdWUnLCBzZWN0aW9uSWQ6IG5vZGUuZGF0YXNldC5zZWN0aW9uSWQsIGN1ZUlkOiBub2RlLmRhdGFzZXQuY3VlSWQsIGtleVBhcnQ6ICdmb2N1cycgfSkpO1xuICAgICAgaWYgKGhpdHMubGVuZ3RoKSB7XG4gICAgICAgIGxldCBuZXh0U2VsZWN0aW9uID0gZHJhZy5hZGRpdGl2ZSA/IHN0b3JlLmdldFNuYXBzaG90KCkuc2VsZWN0aW9uIDogaGl0c1swXTtcbiAgICAgICAgaGl0cy5zbGljZShkcmFnLmFkZGl0aXZlID8gMCA6IDEpLmZvckVhY2goKGhpdCkgPT4ge1xuICAgICAgICAgIG5leHRTZWxlY3Rpb24gPSB0b2dnbGVBYm91dE5hcnJhdGl2ZUN1ZVNlbGVjdGlvbihuZXh0U2VsZWN0aW9uLCBoaXQpO1xuICAgICAgICB9KTtcbiAgICAgICAgc3RvcmUuc2V0U2VsZWN0aW9uKG5leHRTZWxlY3Rpb24pO1xuICAgICAgfVxuICAgIH1cbiAgICB0aW1pbmdEcmFnUmVmLmN1cnJlbnQgPSBudWxsO1xuICAgIHNldE1hcnF1ZWUobnVsbCk7XG4gIH07XG5cbiAgcmV0dXJuIChcbiAgICA8ZGl2IGNsYXNzTmFtZT1cImFib3V0LWVkaXRvci10aW1lbGluZVwiPlxuICAgICAgPGRpdiBjbGFzc05hbWU9XCJhYm91dC1lZGl0b3ItbGFuZS1sYWJlbHNcIiBhcmlhLWxhYmVsPVwiVGltZWxpbmUgdHJhY2tzXCI+XG4gICAgICAgIHtUSU1FTElORV9HTE9CQUxfVFJBQ0tTLm1hcCgodHJhY2spID0+IChcbiAgICAgICAgICB0cmFjay5ncm91cElkcy5sZW5ndGggPyAoXG4gICAgICAgICAgICA8YnV0dG9uXG4gICAgICAgICAgICAgIHR5cGU9XCJidXR0b25cIlxuICAgICAgICAgICAgICBrZXk9e3RyYWNrLmxhbmV9XG4gICAgICAgICAgICAgIGNsYXNzTmFtZT17c2VsZWN0aW9uLnR5cGUgPT09ICdzZXF1ZW5jZScgJiYgc2VsZWN0aW9uLnRyYWNrID09PSB0cmFjay5sYW5lID8gJ2lzLWFjdGl2ZScgOiAnJ31cbiAgICAgICAgICAgICAgZGF0YS1nbG9iYWwtdHJhY2s9e3RyYWNrLmxhbmV9XG4gICAgICAgICAgICAgIGFyaWEtbGFiZWw9e2BPcGVuIGdsb2JhbCAke3RyYWNrLmxhYmVsfSBjb250cm9sc2B9XG4gICAgICAgICAgICAgIGFyaWEtcHJlc3NlZD17c2VsZWN0aW9uLnR5cGUgPT09ICdzZXF1ZW5jZScgJiYgc2VsZWN0aW9uLnRyYWNrID09PSB0cmFjay5sYW5lfVxuICAgICAgICAgICAgICBvbkNsaWNrPXsoKSA9PiBvbk9wZW5HbG9iYWw/Lih7IHR5cGU6ICdzZXF1ZW5jZScsIHRyYWNrOiB0cmFjay5sYW5lLCB0cmFja0xhYmVsOiB0cmFjay5sYWJlbCwgZ3JvdXBJZHM6IHRyYWNrLmdyb3VwSWRzIH0pfVxuICAgICAgICAgICAgPnt0cmFjay5sYWJlbH08L2J1dHRvbj5cbiAgICAgICAgICApIDogPHNwYW4ga2V5PXt0cmFjay5sYW5lfT57dHJhY2subGFiZWx9PC9zcGFuPlxuICAgICAgICApKX1cbiAgICAgIDwvZGl2PlxuICAgICAgPGRpdiByZWY9e2xhbmVzUmVmfSBjbGFzc05hbWU9XCJhYm91dC1lZGl0b3ItbGFuZXNcIiBkYXRhLXNvbG8tdHJhY2s9e3RyYW5zcG9ydC5zb2xvVHJhY2sgfHwgJyd9IG9uV2hlZWw9e3pvb21UaW1lbGluZX0+XG4gICAgICAgIDxkaXYgY2xhc3NOYW1lPVwiYWJvdXQtZWRpdG9yLXRpbWVsaW5lLWNhbnZhc1wiIHN0eWxlPXt7ICctLWFib3V0LWVkaXRvci1wbGF5aGVhZCc6IHBsYXloZWFkLCAnLS1hYm91dC1lZGl0b3ItdGltZWxpbmUtem9vbSc6IE1hdGgubWF4KDEsIE51bWJlcih0cmFuc3BvcnQuem9vbSkgfHwgMSkgfX0+XG4gICAgICAgICAgPGRpdiBjbGFzc05hbWU9XCJhYm91dC1lZGl0b3ItcGxheWhlYWRcIiAvPlxuICAgICAgICAgIHttYXJxdWVlID8gPGRpdiBjbGFzc05hbWU9XCJhYm91dC1lZGl0b3ItbWFycXVlZVwiIHN0eWxlPXttYXJxdWVlfSBhcmlhLWhpZGRlbj1cInRydWVcIiAvPiA6IG51bGx9XG4gICAgICAgICAge2NhbWVyYURyYWdQcmV2aWV3ID8gKFxuICAgICAgICAgIDxkaXZcbiAgICAgICAgICAgIGNsYXNzTmFtZT17YGFib3V0LWVkaXRvci1jYW1lcmEtZHJhZy1naG9zdCR7Y2FtZXJhRHJhZ1ByZXZpZXcudmFsaWQgPyAnJyA6ICcgaXMtaW52YWxpZCd9YH1cbiAgICAgICAgICAgIHN0eWxlPXt7IGxlZnQ6IGAke2NhbWVyYURyYWdQcmV2aWV3LmNvbnRlbnRYfXB4YCB9fVxuICAgICAgICAgICAgYXJpYS1oaWRkZW49XCJ0cnVlXCJcbiAgICAgICAgICA+XG4gICAgICAgICAgICA8aSAvPlxuICAgICAgICAgICAgPHNwYW4+e2NhbWVyYURyYWdQcmV2aWV3LnZhbGlkID8gYCR7Y2FtZXJhRHJhZ1ByZXZpZXcuc2VjdGlvbkxhYmVsfSDCtyAke2Zvcm1hdENhbWVyYVBlcmNlbnQoY2FtZXJhRHJhZ1ByZXZpZXcuYXQpfWAgOiBjYW1lcmFEcmFnUHJldmlldy5yZWFzb259PC9zcGFuPlxuICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICkgOiBudWxsfVxuICAgICAgICAgIHtbJ3NlY3Rpb24nLCAnY2FtZXJhJywgJ3dvcmxkJywgJ3RleHQnLCAnaW50ZXJhY3Rpb24nXS5tYXAoKGxhbmUpID0+IChcbiAgICAgICAgICA8ZGl2IGNsYXNzTmFtZT17YGFib3V0LWVkaXRvci1sYW5lIGFib3V0LWVkaXRvci1sYW5lLS0ke2xhbmV9YH0ga2V5PXtsYW5lfT5cbiAgICAgICAgICAgIHtkb2N1bWVudC5zZWN0aW9ucy5tYXAoKHNlY3Rpb24sIHNlY3Rpb25JbmRleCkgPT4ge1xuICAgICAgICAgICAgICBjb25zdCBjb21waWxlZCA9IGNvbXBpbGVkUGxhbj8uc2VjdGlvbnM/LltzZWN0aW9uSW5kZXhdO1xuICAgICAgICAgICAgICBjb25zdCBzdGFydFdVID0gTWF0aC5taW4obWF4V1UsIGNvbXBpbGVkPy5zdGFydFdVIHx8IDApO1xuICAgICAgICAgICAgICBjb25zdCBuZXh0U3RhcnRXVSA9IE1hdGgubWluKG1heFdVLCBjb21waWxlZFBsYW4/LnNlY3Rpb25zPy5bc2VjdGlvbkluZGV4ICsgMV0/LnN0YXJ0V1UgPz8gbWF4V1UpO1xuICAgICAgICAgICAgICBjb25zdCBzcGFuV1UgPSBNYXRoLm1heCgwLjAwMSwgbmV4dFN0YXJ0V1UgLSBzdGFydFdVKTtcbiAgICAgICAgICAgICAgY29uc3Qgd2lkdGggPSBgJHsoc3BhbldVIC8gbWF4V1UpICogMTAwfSVgO1xuICAgICAgICAgICAgICBjb25zdCBpblNlbGVjdGVkU2VjdGlvbiA9IHNlbGVjdGlvbi5zZWN0aW9uSWQgPT09IHNlY3Rpb24uaWQ7XG4gICAgICAgICAgICAgIGNvbnN0IGxvY2FsUGVyY2VudCA9IChhdCkgPT4gTWF0aC5taW4oMTAwLCAoTnVtYmVyKGF0IHx8IDApICogKGNvbXBpbGVkPy50cmF2ZWxXVSB8fCBzcGFuV1UpIC8gc3BhbldVKSAqIDEwMCk7XG4gICAgICAgICAgICAgIGNvbnN0IGxvY2FsUG9zaXRpb24gPSAoYXQpID0+IGAke2xvY2FsUGVyY2VudChhdCl9JWA7XG4gICAgICAgICAgICAgIGNvbnN0IGV4dGVuZGVkTG9jYWxQb3NpdGlvbiA9IChhdCkgPT4gYCR7KE51bWJlcihhdCB8fCAwKSAqIChjb21waWxlZD8udHJhdmVsV1UgfHwgc3BhbldVKSAvIHNwYW5XVSkgKiAxMDB9JWA7XG4gICAgICAgICAgICAgIGNvbnN0IGV4dGVuZGVkTG9jYWxXaWR0aCA9IChmcm9tLCB0bykgPT4gYCR7TWF0aC5tYXgoMC4zNSwgKE51bWJlcih0bykgLSBOdW1iZXIoZnJvbSkpICogKGNvbXBpbGVkPy50cmF2ZWxXVSB8fCBzcGFuV1UpIC8gc3BhbldVICogMTAwKX0lYDtcbiAgICAgICAgICAgICAgY29uc3QgdGV4dFBvc2l0aW9uID0gKGF0KSA9PiBgJHtjbGFtcDAxKE51bWJlcihhdCB8fCAwKSkgKiAxMDB9JWA7XG4gICAgICAgICAgICAgIGNvbnN0IHNlbGVjdEF0ID0gKG5leHRTZWxlY3Rpb24sIGF0ID0gMCkgPT4ge1xuICAgICAgICAgICAgICAgIHN0b3JlLnNldFNlbGVjdGlvbih7IHNlY3Rpb25JZDogc2VjdGlvbi5pZCwgLi4ubmV4dFNlbGVjdGlvbiB9KTtcbiAgICAgICAgICAgICAgICBzdG9yZS5zZXRUcmFuc3BvcnQoe1xuICAgICAgICAgICAgICAgICAgb3duZXI6ICd0aW1lbGluZScsXG4gICAgICAgICAgICAgICAgICBwbGF5aW5nOiBmYWxzZSxcbiAgICAgICAgICAgICAgICAgIHN0b3J5V1U6IHN0YXJ0V1UgKyAoTnVtYmVyKGF0IHx8IDApICogKGNvbXBpbGVkPy50cmF2ZWxXVSB8fCAwKSksXG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgIH07XG4gICAgICAgICAgICAgIGlmIChsYW5lID09PSAnc2VjdGlvbicpIHtcbiAgICAgICAgICAgICAgICBjb25zdCBpc1NlbGVjdGVkID0gaW5TZWxlY3RlZFNlY3Rpb24gJiYgc2VsZWN0aW9uLnR5cGUgPT09ICdzZWN0aW9uJztcbiAgICAgICAgICAgICAgICBjb25zdCByZXNpemVFeHRlbnQgPSBzZWN0aW9uUmVzaXplUHJldmlldz8uc2VjdGlvbklkID09PSBzZWN0aW9uLmlkXG4gICAgICAgICAgICAgICAgICA/IHNlY3Rpb25SZXNpemVQcmV2aWV3LmV4dGVudFxuICAgICAgICAgICAgICAgICAgOiBOdW1iZXIoc2VjdGlvbltnZXRBYm91dE5hcnJhdGl2ZUV4dGVudEZpZWxkKHNuYXBzaG90LnByZXZpZXdQcm9maWxlKV0pO1xuICAgICAgICAgICAgICAgIHJldHVybiAoXG4gICAgICAgICAgICAgICAgICA8ZGl2XG4gICAgICAgICAgICAgICAgICAgIGtleT17c2VjdGlvbi5pZH1cbiAgICAgICAgICAgICAgICAgICAgY2xhc3NOYW1lPXtgYWJvdXQtZWRpdG9yLXNlY3Rpb24tY2xpcCR7aXNTZWxlY3RlZCA/ICcgaXMtc2VsZWN0ZWQnIDogJyd9JHtpblNlbGVjdGVkU2VjdGlvbiA/ICcgaXMtY29udGV4dCcgOiAnJ31gfVxuICAgICAgICAgICAgICAgICAgICBzdHlsZT17eyB3aWR0aCB9fVxuICAgICAgICAgICAgICAgICAgICB0aXRsZT17YCR7c2VjdGlvbi5sYWJlbH0gwrcgJHtmb3JtYXRXVShjb21waWxlZD8ucmVzb2x2ZWRFeHRlbnRXVSB8fCBzZWN0aW9uLmV4dGVudFdVKX1gfVxuICAgICAgICAgICAgICAgICAgPlxuICAgICAgICAgICAgICAgICAgICA8YnV0dG9uIHR5cGU9XCJidXR0b25cIiBhcmlhLXByZXNzZWQ9e2lzU2VsZWN0ZWR9IG9uQ2xpY2s9eygpID0+IHNlbGVjdEF0KHsgdHlwZTogJ3NlY3Rpb24nIH0pfT5cbiAgICAgICAgICAgICAgICAgICAgICA8c3Bhbj57U3RyaW5nKHNlY3Rpb25JbmRleCArIDEpLnBhZFN0YXJ0KDIsICcwJyl9PC9zcGFuPntzZWN0aW9uLmxhYmVsfVxuICAgICAgICAgICAgICAgICAgICA8L2J1dHRvbj5cbiAgICAgICAgICAgICAgICAgICAge3NlY3Rpb25SZXNpemVQcmV2aWV3Py5zZWN0aW9uSWQgPT09IHNlY3Rpb24uaWQgPyA8b3V0cHV0Pntmb3JtYXRXVShNYXRoLm1heCgwLCByZXNpemVFeHRlbnQgLSAxKSl9IHNjcm9sbCDCtyB7Zm9ybWF0V1UocmVzaXplRXh0ZW50KX0gdG90YWw8L291dHB1dD4gOiBudWxsfVxuICAgICAgICAgICAgICAgICAgICA8YnV0dG9uXG4gICAgICAgICAgICAgICAgICAgICAgdHlwZT1cImJ1dHRvblwiXG4gICAgICAgICAgICAgICAgICAgICAgY2xhc3NOYW1lPVwiYWJvdXQtZWRpdG9yLXNlY3Rpb24tcmVzaXplXCJcbiAgICAgICAgICAgICAgICAgICAgICBkaXNhYmxlZD17c2VjdGlvbi5sb2NrZWR9XG4gICAgICAgICAgICAgICAgICAgICAgYXJpYS1sYWJlbD17YFJlc2l6ZSAke3NlY3Rpb24ubGFiZWx9YH1cbiAgICAgICAgICAgICAgICAgICAgICB0aXRsZT17c2VjdGlvbi5sb2NrZWQgPyAnVW5sb2NrIHRoaXMgcHJvdGVjdGVkIFNlY3Rpb24gdG8gcmVzaXplIGl0JyA6IGBEcmFnIHRvIGNoYW5nZSAke3NuYXBzaG90LnByZXZpZXdQcm9maWxlID09PSAnbW9iaWxlJyA/ICdtb2JpbGUnIDogJ2Rlc2t0b3AnfSBzY3JvbGwgbGVuZ3RoIMK3IGRvdWJsZS1jbGljayB0byByZXN0b3JlIHNhdmVkIGxlbmd0aGB9XG4gICAgICAgICAgICAgICAgICAgICAgb25Eb3VibGVDbGljaz17KGV2ZW50KSA9PiB7IGV2ZW50LnByZXZlbnREZWZhdWx0KCk7IGV2ZW50LnN0b3BQcm9wYWdhdGlvbigpOyByZXNldFNlY3Rpb25FeHRlbnQoc2VjdGlvbi5pZCwgc2VjdGlvbkluZGV4KTsgfX1cbiAgICAgICAgICAgICAgICAgICAgICBvblBvaW50ZXJEb3duPXsoZXZlbnQpID0+IGJlZ2luU2VjdGlvblJlc2l6ZShldmVudCwgeyBzZWN0aW9uSWQ6IHNlY3Rpb24uaWQsIHNlY3Rpb25JbmRleCwgc2VjdGlvbkxhYmVsOiBzZWN0aW9uLmxhYmVsLCBsb2NrZWQ6IHNlY3Rpb24ubG9ja2VkIH0pfVxuICAgICAgICAgICAgICAgICAgICAgIG9uUG9pbnRlck1vdmU9e21vdmVTZWN0aW9uUmVzaXplfVxuICAgICAgICAgICAgICAgICAgICAgIG9uUG9pbnRlclVwPXtlbmRTZWN0aW9uUmVzaXplfVxuICAgICAgICAgICAgICAgICAgICAgIG9uUG9pbnRlckNhbmNlbD17ZW5kU2VjdGlvblJlc2l6ZX1cbiAgICAgICAgICAgICAgICAgICAgLz5cbiAgICAgICAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgICAgICk7XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgaWYgKGxhbmUgPT09ICdjYW1lcmEnKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIChcbiAgICAgICAgICAgICAgICAgIDxkaXYgY2xhc3NOYW1lPVwiYWJvdXQtZWRpdG9yLWNsaXBcIiBrZXk9e3NlY3Rpb24uaWR9IHN0eWxlPXt7IHdpZHRoIH19PlxuICAgICAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cImFib3V0LWVkaXRvci1jYW1lcmEtcmFpbFwiIGFyaWEtaGlkZGVuPVwidHJ1ZVwiPlxuICAgICAgICAgICAgICAgICAgICAgIHtzZWN0aW9uLmNhbWVyYS5rZXlzLnNsaWNlKDEpLm1hcCgoa2V5LCBrZXlJbmRleCkgPT4ge1xuICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgZnJvbUtleSA9IHNlY3Rpb24uY2FtZXJhLmtleXNba2V5SW5kZXhdO1xuICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgbGVmdCA9IGxvY2FsUGVyY2VudChmcm9tS2V5LmF0KTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IHJpZ2h0ID0gbG9jYWxQZXJjZW50KGtleS5hdCk7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gKFxuICAgICAgICAgICAgICAgICAgICAgICAgICA8c3BhblxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNsYXNzTmFtZT17Y2FtZXJhUG9zZUNoYW5nZXMoZnJvbUtleSwga2V5KSA/ICdpcy1hdXRob3JlZC1tb3Rpb24nIDogJ2lzLWJhc2UtZG9sbHknfVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGtleT17YCR7c2VjdGlvbi5pZH06Y2FtZXJhLXNwYW46JHtrZXlJbmRleH1gfVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHN0eWxlPXt7IGxlZnQ6IGAke2xlZnR9JWAsIHdpZHRoOiBgJHtNYXRoLm1heCgwLjUsIHJpZ2h0IC0gbGVmdCl9JWAgfX1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgLz5cbiAgICAgICAgICAgICAgICAgICAgICAgICk7XG4gICAgICAgICAgICAgICAgICAgICAgfSl9XG4gICAgICAgICAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgICAgICAgICB7c2VjdGlvbi5jYW1lcmEua2V5cy5tYXAoKGtleSwga2V5SW5kZXgpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgICBjb25zdCB0aW1pbmdCb3VuZHMgPSBnZXRBYm91dE5hcnJhdGl2ZUNhbWVyYUtleVRpbWluZ0JvdW5kcyhzZWN0aW9uLmNhbWVyYS5rZXlzLCBrZXlJbmRleCk7XG4gICAgICAgICAgICAgICAgICAgICAgY29uc3QgdG9rZW4gPSBgY2FtZXJhOiR7c2VjdGlvbi5pZH06JHtrZXlJbmRleH1gO1xuICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IGtleVNlbGVjdGlvbiA9IHsgdHlwZTogJ2NhbWVyYS1rZXknLCBzZWN0aW9uSWQ6IHNlY3Rpb24uaWQsIGtleUluZGV4IH07XG4gICAgICAgICAgICAgICAgICAgICAgY29uc3QgaXNTZWxlY3RlZCA9IGluU2VsZWN0ZWRTZWN0aW9uICYmIHNlbGVjdGlvbi50eXBlID09PSAnY2FtZXJhLWtleScgJiYgc2VsZWN0aW9uLmtleUluZGV4ID09PSBrZXlJbmRleDtcbiAgICAgICAgICAgICAgICAgICAgICBjb25zdCByZXF1aXJlZCA9IHRpbWluZ0JvdW5kcy5sb2NrZWQ7XG4gICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIChcbiAgICAgICAgICAgICAgICAgICAgICAgIDxidXR0b25cbiAgICAgICAgICAgICAgICAgICAgICAgICAgdHlwZT1cImJ1dHRvblwiXG4gICAgICAgICAgICAgICAgICAgICAgICAgIGtleT17dG9rZW59XG4gICAgICAgICAgICAgICAgICAgICAgICAgIGNsYXNzTmFtZT17YGFib3V0LWVkaXRvci1rZXkke3JlcXVpcmVkID8gJyBpcy1ib3VuZGFyeScgOiAnIGlzLWRyYWdnYWJsZSd9JHtpc1NlbGVjdGVkID8gJyBpcy1zZWxlY3RlZCcgOiAnJ30ke2NhbWVyYURyYWdQcmV2aWV3Py50b2tlbiA9PT0gdG9rZW4gPyAnIGlzLWRyYWctc291cmNlJyA6ICcnfWB9XG4gICAgICAgICAgICAgICAgICAgICAgICAgIHN0eWxlPXt7IGxlZnQ6IGxvY2FsUG9zaXRpb24oa2V5LmF0KSB9fVxuICAgICAgICAgICAgICAgICAgICAgICAgICB0aXRsZT17cmVxdWlyZWRcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICA/IGBQcm90ZWN0ZWQgQ2FtZXJhIGtleSBhdCAke2Zvcm1hdENhbWVyYVBlcmNlbnQoa2V5LmF0KX0gwrcgc2VsZWN0IHRvIGluc3BlY3RgXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgOiBgQ2FtZXJhIGtleSBhdCAke2Zvcm1hdENhbWVyYVBlcmNlbnQoa2V5LmF0KX0gwrcgZHJhZyBhbnl3aGVyZSBvbiB0aGUgQ2FtZXJhIHRyYWNrYH1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgYXJpYS1sYWJlbD17YCR7cmVxdWlyZWQgPyAnUHJvdGVjdGVkICcgOiAnJ31DYW1lcmEga2V5IGF0ICR7Zm9ybWF0Q2FtZXJhUGVyY2VudChrZXkuYXQpfSB0aHJvdWdoICR7c2VjdGlvbi5sYWJlbH1gfVxuICAgICAgICAgICAgICAgICAgICAgICAgICBhcmlhLXByZXNzZWQ9e2lzU2VsZWN0ZWR9XG4gICAgICAgICAgICAgICAgICAgICAgICAgIG9uUG9pbnRlckRvd249e3JlcXVpcmVkID8gdW5kZWZpbmVkIDogKGV2ZW50KSA9PiBiZWdpblRpbWluZ0RyYWcoZXZlbnQsIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0eXBlOiAnY2FtZXJhJyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0b2tlbixcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBsb2NrZWQ6IGZhbHNlLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGF0OiBrZXkuYXQsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgc2VjdGlvbkluZGV4LFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGtleUluZGV4LFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHNlY3Rpb25TdGFydFdVOiBzdGFydFdVLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHNwYW5XVSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0cmF2ZWxXVTogY29tcGlsZWQ/LnRyYXZlbFdVIHx8IHNwYW5XVSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBzdG9yeVdVOiBzdGFydFdVICsgKE51bWJlcihrZXkuYXQpICogKGNvbXBpbGVkPy50cmF2ZWxXVSB8fCAwKSksXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgc2VsZWN0aW9uOiBrZXlTZWxlY3Rpb24sXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY29hbGVzY2VLZXk6IGB0aW1lbGluZToke3Rva2VufWAsXG4gICAgICAgICAgICAgICAgICAgICAgICAgIH0pfVxuICAgICAgICAgICAgICAgICAgICAgICAgICBvblBvaW50ZXJNb3ZlPXtyZXF1aXJlZCA/IHVuZGVmaW5lZCA6IG1vdmVUaW1pbmdEcmFnfVxuICAgICAgICAgICAgICAgICAgICAgICAgICBvblBvaW50ZXJVcD17cmVxdWlyZWQgPyB1bmRlZmluZWQgOiBlbmRUaW1pbmdEcmFnfVxuICAgICAgICAgICAgICAgICAgICAgICAgICBvblBvaW50ZXJDYW5jZWw9e3JlcXVpcmVkID8gdW5kZWZpbmVkIDogZW5kVGltaW5nRHJhZ31cbiAgICAgICAgICAgICAgICAgICAgICAgICAgb25DbGljaz17KCkgPT4gaGFuZGxlVGltaW5nQ2xpY2sodG9rZW4sICgpID0+IHNlbGVjdEF0KHsgdHlwZTogJ2NhbWVyYS1rZXknLCBrZXlJbmRleCB9LCBrZXkuYXQpKX1cbiAgICAgICAgICAgICAgICAgICAgICAgIC8+XG4gICAgICAgICAgICAgICAgICAgICAgKTtcbiAgICAgICAgICAgICAgICAgICAgfSl9XG4gICAgICAgICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgICAgICApO1xuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgIGlmIChsYW5lID09PSAnd29ybGQnKSB7XG4gICAgICAgICAgICAgICAgY29uc3QgaXNTZWxlY3RlZCA9IGluU2VsZWN0ZWRTZWN0aW9uICYmIHNlbGVjdGlvbi50eXBlID09PSAnd29ybGQnO1xuICAgICAgICAgICAgICAgIGNvbnN0IHRyYW5zaXRpb24gPSBzZWN0aW9uLndvcmxkLm1vZGUgPT09ICdzZXQnICYmIHNlY3Rpb24ud29ybGQudHJhbnNpdGlvbkluLnR5cGUgIT09ICdjdXQnXG4gICAgICAgICAgICAgICAgICA/IHNlY3Rpb24ud29ybGQudHJhbnNpdGlvbkluXG4gICAgICAgICAgICAgICAgICA6IG51bGw7XG4gICAgICAgICAgICAgICAgcmV0dXJuIChcbiAgICAgICAgICAgICAgICAgIDxkaXYgY2xhc3NOYW1lPXtgYWJvdXQtZWRpdG9yLWNsaXAke2lzU2VsZWN0ZWQgPyAnIGlzLXNlbGVjdGVkJyA6ICcnfWB9IGtleT17c2VjdGlvbi5pZH0gc3R5bGU9e3sgd2lkdGggfX0+XG4gICAgICAgICAgICAgICAgICAgIDxidXR0b25cbiAgICAgICAgICAgICAgICAgICAgICB0eXBlPVwiYnV0dG9uXCJcbiAgICAgICAgICAgICAgICAgICAgICBjbGFzc05hbWU9e2BhYm91dC1lZGl0b3Itd29ybGQtY2xpcCAke3NlY3Rpb24ud29ybGQubW9kZSA9PT0gJ3NldCcgPyAnaGFzLXdvcmxkJyA6ICcnfSR7aXNTZWxlY3RlZCA/ICcgaXMtc2VsZWN0ZWQnIDogJyd9YH1cbiAgICAgICAgICAgICAgICAgICAgICBhcmlhLXByZXNzZWQ9e2lzU2VsZWN0ZWR9XG4gICAgICAgICAgICAgICAgICAgICAgb25DbGljaz17KCkgPT4gc2VsZWN0QXQoeyB0eXBlOiAnd29ybGQnIH0sIHRyYW5zaXRpb24gPyB0cmFuc2l0aW9uLmVuZCA6IDApfVxuICAgICAgICAgICAgICAgICAgICA+e3NlY3Rpb24ud29ybGQubW9kZSA9PT0gJ3NldCcgPyBzZWN0aW9uLndvcmxkLnNoYXBlSWQucmVwbGFjZSgnLXYxJywgJycpIDogJ2NvbnRpbnVlJ308L2J1dHRvbj5cbiAgICAgICAgICAgICAgICAgICAge3RyYW5zaXRpb24gPyBbJ3N0YXJ0JywgJ2VuZCddLm1hcCgocGFydCkgPT4gKFxuICAgICAgICAgICAgICAgICAgICAgIDxidXR0b25cbiAgICAgICAgICAgICAgICAgICAgICAgIHR5cGU9XCJidXR0b25cIlxuICAgICAgICAgICAgICAgICAgICAgICAga2V5PXtwYXJ0fVxuICAgICAgICAgICAgICAgICAgICAgICAgY2xhc3NOYW1lPXtgYWJvdXQtZWRpdG9yLXRpbWluZy1rZXkgaXMtd29ybGQke2lzU2VsZWN0ZWQgJiYgc2VsZWN0aW9uLmtleVBhcnQgPT09IGB0cmFuc2l0aW9uLSR7cGFydH1gID8gJyBpcy1zZWxlY3RlZCcgOiAnJ31gfVxuICAgICAgICAgICAgICAgICAgICAgICAgc3R5bGU9e3sgbGVmdDogZXh0ZW5kZWRMb2NhbFBvc2l0aW9uKHRyYW5zaXRpb25bcGFydF0pIH19XG4gICAgICAgICAgICAgICAgICAgICAgICB0aXRsZT17YFdvcmxkIHRyYW5zaXRpb24gJHtwYXJ0fWB9XG4gICAgICAgICAgICAgICAgICAgICAgICBhcmlhLWxhYmVsPXtgJHtzZWN0aW9uLmxhYmVsfSBXb3JsZCB0cmFuc2l0aW9uICR7cGFydH1gfVxuICAgICAgICAgICAgICAgICAgICAgICAgb25DbGljaz17KCkgPT4gc2VsZWN0QXQoeyB0eXBlOiAnd29ybGQnLCBrZXlQYXJ0OiBgdHJhbnNpdGlvbi0ke3BhcnR9YCB9LCB0cmFuc2l0aW9uW3BhcnRdKX1cbiAgICAgICAgICAgICAgICAgICAgICAvPlxuICAgICAgICAgICAgICAgICAgICApKSA6IG51bGx9XG4gICAgICAgICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgICAgICApO1xuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgIGlmIChsYW5lID09PSAndGV4dCcpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gKFxuICAgICAgICAgICAgICAgICAgPGRpdlxuICAgICAgICAgICAgICAgICAgICBjbGFzc05hbWU9e2BhYm91dC1lZGl0b3ItY2xpcCR7c2VjdGlvbi50ZXh0LmRpc2NpcGxpbmVSZXZlYWwgPyAnIGhhcy1leHRlbmRlZC1kaXNjaXBsaW5lJyA6ICcnfWB9XG4gICAgICAgICAgICAgICAgICAgIGtleT17c2VjdGlvbi5pZH1cbiAgICAgICAgICAgICAgICAgICAgc3R5bGU9e3sgd2lkdGggfX1cbiAgICAgICAgICAgICAgICAgICAgb25Qb2ludGVyRG93bj17YmVnaW5NYXJxdWVlfVxuICAgICAgICAgICAgICAgICAgICBvblBvaW50ZXJNb3ZlPXttb3ZlTWFycXVlZX1cbiAgICAgICAgICAgICAgICAgICAgb25Qb2ludGVyVXA9e2VuZE1hcnF1ZWV9XG4gICAgICAgICAgICAgICAgICAgIG9uUG9pbnRlckNhbmNlbD17ZW5kTWFycXVlZX1cbiAgICAgICAgICAgICAgICAgID5cbiAgICAgICAgICAgICAgICAgICAgeyhzZWN0aW9uLnRleHQuY3VlcyB8fCBbXSkubWFwKChjdWUpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgICBjb25zdCBpc1NlbGVjdGVkID0gc2VsZWN0ZWRDdWVNZW1iZXJzLnNvbWUoKG1lbWJlcikgPT4gbWVtYmVyLnNlY3Rpb25JZCA9PT0gc2VjdGlvbi5pZCAmJiBtZW1iZXIuY3VlSWQgPT09IGN1ZS5pZCk7XG4gICAgICAgICAgICAgICAgICAgICAgY29uc3QgaXNQcmltYXJ5ID0gc2VsZWN0aW9uLnR5cGUgPT09ICdjdWUnICYmIHNlbGVjdGlvbi5zZWN0aW9uSWQgPT09IHNlY3Rpb24uaWQgJiYgc2VsZWN0aW9uLmN1ZUlkID09PSBjdWUuaWQ7XG4gICAgICAgICAgICAgICAgICAgICAgY29uc3QgbW92ZW1lbnQgPSBnZXRBYm91dE5hcnJhdGl2ZUN1ZU1vdmVtZW50KGN1ZSk7XG4gICAgICAgICAgICAgICAgICAgICAgY29uc3QgbW90aW9uSW50ZXJ2YWwgPSBtb3ZlbWVudCA9PT0gJ3NwYXRpYWwnXG4gICAgICAgICAgICAgICAgICAgICAgICA/IGdldEFib3V0TmFycmF0aXZlQ3VlTW90aW9uSW50ZXJ2YWwoY3VlLCBkb2N1bWVudC5nbG9iYWxzLnRleHRNb3Rpb24pXG4gICAgICAgICAgICAgICAgICAgICAgICA6IG51bGw7XG4gICAgICAgICAgICAgICAgICAgICAgY29uc3QgbW90aW9uU3BhbiA9IG1vdGlvbkludGVydmFsID8gTWF0aC5tYXgoMC4wMDAwMSwgbW90aW9uSW50ZXJ2YWwuZW5kIC0gbW90aW9uSW50ZXJ2YWwuc3RhcnQpIDogMDtcbiAgICAgICAgICAgICAgICAgICAgICBjb25zdCBjdWVTdHlsZSA9IG1vdGlvbkludGVydmFsID8ge1xuICAgICAgICAgICAgICAgICAgICAgICAgbGVmdDogdGV4dFBvc2l0aW9uKG1vdGlvbkludGVydmFsLnN0YXJ0KSxcbiAgICAgICAgICAgICAgICAgICAgICAgIHdpZHRoOiBgJHtNYXRoLm1heCgwLjUsIG1vdGlvblNwYW4gKiAxMDApfSVgLFxuICAgICAgICAgICAgICAgICAgICAgIH0gOiB7IGxlZnQ6IHRleHRQb3NpdGlvbihjdWUuaG9sZCkgfTtcbiAgICAgICAgICAgICAgICAgICAgICBjb25zdCBmb2N1c1Bvc2l0aW9uID0gbW90aW9uSW50ZXJ2YWxcbiAgICAgICAgICAgICAgICAgICAgICAgID8gYCR7KChjdWUuaG9sZCAtIG1vdGlvbkludGVydmFsLnN0YXJ0KSAvIG1vdGlvblNwYW4pICogMTAwfSVgXG4gICAgICAgICAgICAgICAgICAgICAgICA6ICc1MCUnO1xuICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IHRpbWluZ0JvdW5kcyA9IGdldEFib3V0TmFycmF0aXZlQ3VlVGltaW5nQm91bmRzKGN1ZSk7XG4gICAgICAgICAgICAgICAgICAgICAgY29uc3QgdG9rZW4gPSBgY3VlOiR7c2VjdGlvbi5pZH06JHtjdWUuaWR9YDtcbiAgICAgICAgICAgICAgICAgICAgICBjb25zdCBjdWVTZWxlY3Rpb24gPSB7IHR5cGU6ICdjdWUnLCBzZWN0aW9uSWQ6IHNlY3Rpb24uaWQsIGN1ZUlkOiBjdWUuaWQsIGtleVBhcnQ6ICdmb2N1cycgfTtcbiAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gKFxuICAgICAgICAgICAgICAgICAgICAgICAgPGJ1dHRvblxuICAgICAgICAgICAgICAgICAgICAgICAgICB0eXBlPVwiYnV0dG9uXCJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgY2xhc3NOYW1lPXtgYWJvdXQtZWRpdG9yLWN1ZSBpcy0ke21vdmVtZW50fSR7dGltaW5nQm91bmRzLm1pbiA9PT0gdGltaW5nQm91bmRzLm1heCA/ICcgaXMtYm91bmRhcnknIDogJyBpcy1kcmFnZ2FibGUnfSR7aXNTZWxlY3RlZCA/ICcgaXMtc2VsZWN0ZWQnIDogJyd9JHtpc1ByaW1hcnkgPyAnIGlzLXByaW1hcnktc2VsZWN0aW9uJyA6ICcnfWB9XG4gICAgICAgICAgICAgICAgICAgICAgICAgIGtleT17Y3VlLmlkfVxuICAgICAgICAgICAgICAgICAgICAgICAgICBkYXRhLXNlY3Rpb24taWQ9e3NlY3Rpb24uaWR9XG4gICAgICAgICAgICAgICAgICAgICAgICAgIGRhdGEtY3VlLWlkPXtjdWUuaWR9XG4gICAgICAgICAgICAgICAgICAgICAgICAgIHN0eWxlPXtjdWVTdHlsZX1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgYXJpYS1sYWJlbD17YCR7bW92ZW1lbnQgPT09ICd2ZXJ0aWNhbCcgPyAnVmVydGljYWwnIDogJ1NwYXRpYWwnfSB0ZXh0IGF0ICR7TWF0aC5yb3VuZChjdWUuaG9sZCAqIDEwMCl9JSR7bW90aW9uSW50ZXJ2YWwgPyBgIMK3IHRyYXZlbHMgJHtNYXRoLnJvdW5kKG1vdGlvbkludGVydmFsLnN0YXJ0ICogMTAwKX3igJMke01hdGgucm91bmQobW90aW9uSW50ZXJ2YWwuZW5kICogMTAwKX0lYCA6ICcnfSDCtyAke2N1ZS50ZXh0fWB9XG4gICAgICAgICAgICAgICAgICAgICAgICAgIGFyaWEtcHJlc3NlZD17aXNTZWxlY3RlZH1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgdGl0bGU9e2Ake21vdmVtZW50ID09PSAndmVydGljYWwnID8gJ1ZlcnRpY2FsJyA6ICdTcGF0aWFsJ30gdGl0bGUgwrcgZHJhZyB0byBtb3ZlIGl0OyBkdXJhdGlvbiBzdGF5cyBnbG9iYWwgwrcgJHtjdWUudGV4dH1gfVxuICAgICAgICAgICAgICAgICAgICAgICAgICBvblBvaW50ZXJEb3duPXsoZXZlbnQpID0+IGJlZ2luVGltaW5nRHJhZyhldmVudCwge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHR5cGU6ICdjdWUnLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRva2VuLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGxvY2tlZDogdGltaW5nQm91bmRzLm1pbiA9PT0gdGltaW5nQm91bmRzLm1heCxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBtaW46IHRpbWluZ0JvdW5kcy5taW4sXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgbWF4OiB0aW1pbmdCb3VuZHMubWF4LFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGF0OiBjdWUuaG9sZCxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBzZWN0aW9uSW5kZXgsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY3VlSWQ6IGN1ZS5pZCxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBzZWN0aW9uU3RhcnRXVTogc3RhcnRXVSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBzcGFuV1UsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdHJhdmVsV1U6IGNvbXBpbGVkPy50cmF2ZWxXVSB8fCBzcGFuV1UsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgc3RvcnlXVTogc3RhcnRXVSArIChOdW1iZXIoY3VlLmhvbGQpICogKGNvbXBpbGVkPy50cmF2ZWxXVSB8fCAwKSksXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgc2VsZWN0aW9uOiBjdWVTZWxlY3Rpb24sXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY29hbGVzY2VLZXk6IGB0aW1lbGluZToke3Rva2VufWAsXG4gICAgICAgICAgICAgICAgICAgICAgICAgIH0pfVxuICAgICAgICAgICAgICAgICAgICAgICAgICBvblBvaW50ZXJNb3ZlPXttb3ZlVGltaW5nRHJhZ31cbiAgICAgICAgICAgICAgICAgICAgICAgICAgb25Qb2ludGVyVXA9e2VuZFRpbWluZ0RyYWd9XG4gICAgICAgICAgICAgICAgICAgICAgICAgIG9uUG9pbnRlckNhbmNlbD17ZW5kVGltaW5nRHJhZ31cbiAgICAgICAgICAgICAgICAgICAgICAgICAgb25LZXlEb3duPXsoZXZlbnQpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoZXZlbnQuc2hpZnRLZXkgJiYgZXZlbnQuY29kZSA9PT0gJ1NwYWNlJykge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZXZlbnQucHJldmVudERlZmF1bHQoKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IG5leHRTZWxlY3Rpb24gPSB0b2dnbGVBYm91dE5hcnJhdGl2ZUN1ZVNlbGVjdGlvbihzdG9yZS5nZXRTbmFwc2hvdCgpLnNlbGVjdGlvbiwgY3VlU2VsZWN0aW9uKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHN0b3JlLnNldFNlbGVjdGlvbihuZXh0U2VsZWN0aW9uKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHN0b3JlLnNldFRyYW5zcG9ydCh7IG93bmVyOiAndGltZWxpbmUnLCBwbGF5aW5nOiBmYWxzZSwgc3RvcnlXVTogc3RhcnRXVSArIChOdW1iZXIoY3VlLmhvbGQpICogKGNvbXBpbGVkPy50cmF2ZWxXVSB8fCAwKSkgfSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgICB9fVxuICAgICAgICAgICAgICAgICAgICAgICAgICBvbkNsaWNrPXsoKSA9PiBoYW5kbGVUaW1pbmdDbGljayh0b2tlbiwgKCkgPT4ge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHN0b3JlLnNldFRyYW5zcG9ydCh7IG93bmVyOiAndGltZWxpbmUnLCBwbGF5aW5nOiBmYWxzZSwgc3RvcnlXVTogc3RhcnRXVSArIChOdW1iZXIoY3VlLmhvbGQpICogKGNvbXBpbGVkPy50cmF2ZWxXVSB8fCAwKSkgfSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgIH0pfVxuICAgICAgICAgICAgICAgICAgICAgICAgPjxzcGFuIGNsYXNzTmFtZT1cImFib3V0LWVkaXRvci1jdWUtZm9jdXNcIiBzdHlsZT17eyBsZWZ0OiBmb2N1c1Bvc2l0aW9uIH19IGFyaWEtaGlkZGVuPVwidHJ1ZVwiIC8+PC9idXR0b24+XG4gICAgICAgICAgICAgICAgICAgICAgKTtcbiAgICAgICAgICAgICAgICAgICAgfSl9XG4gICAgICAgICAgICAgICAgICAgIHtzZWN0aW9uLnRleHQuZGlzY2lwbGluZVJldmVhbCA/ICgoKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgICAgY29uc3QgcmV2ZWFsID0gc2VjdGlvbi50ZXh0LmRpc2NpcGxpbmVSZXZlYWw7XG4gICAgICAgICAgICAgICAgICAgICAgY29uc3QgZHVyYXRpb24gPSByZXZlYWwuZW5kIC0gcmV2ZWFsLnN0YXJ0O1xuICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IGNlbnRyZSA9IHJldmVhbC5zdGFydCArIChkdXJhdGlvbiAqIDAuNSk7XG4gICAgICAgICAgICAgICAgICAgICAgY29uc3QgaXNTZWxlY3RlZCA9IGluU2VsZWN0ZWRTZWN0aW9uICYmIHNlbGVjdGlvbi50eXBlID09PSAnZGlzY2lwbGluZS1yZXZlYWwnO1xuICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IHRva2VuID0gYGRpc2NpcGxpbmUtcmV2ZWFsOiR7c2VjdGlvbi5pZH06JHtyZXZlYWwuaWR9YDtcbiAgICAgICAgICAgICAgICAgICAgICBjb25zdCByZXZlYWxTZWxlY3Rpb24gPSB7IHR5cGU6ICdkaXNjaXBsaW5lLXJldmVhbCcsIHNlY3Rpb25JZDogc2VjdGlvbi5pZCB9O1xuICAgICAgICAgICAgICAgICAgICAgIHJldHVybiAoXG4gICAgICAgICAgICAgICAgICAgICAgICA8YnV0dG9uXG4gICAgICAgICAgICAgICAgICAgICAgICAgIHR5cGU9XCJidXR0b25cIlxuICAgICAgICAgICAgICAgICAgICAgICAgICBjbGFzc05hbWU9e2BhYm91dC1lZGl0b3ItZGlzY2lwbGluZS1yZXZlYWwgaXMtZHJhZ2dhYmxlJHtpc1NlbGVjdGVkID8gJyBpcy1zZWxlY3RlZCcgOiAnJ31gfVxuICAgICAgICAgICAgICAgICAgICAgICAgICBzdHlsZT17eyBsZWZ0OiBleHRlbmRlZExvY2FsUG9zaXRpb24ocmV2ZWFsLnN0YXJ0KSwgd2lkdGg6IGV4dGVuZGVkTG9jYWxXaWR0aChyZXZlYWwuc3RhcnQsIHJldmVhbC5lbmQpIH19XG4gICAgICAgICAgICAgICAgICAgICAgICAgIGFyaWEtbGFiZWw9e2BEaXNjaXBsaW5lIHJldmVhbCBmcm9tICR7TWF0aC5yb3VuZChyZXZlYWwuc3RhcnQgKiAxMDApfSUgdG8gJHtNYXRoLnJvdW5kKHJldmVhbC5lbmQgKiAxMDApfSVgfVxuICAgICAgICAgICAgICAgICAgICAgICAgICBhcmlhLXByZXNzZWQ9e2lzU2VsZWN0ZWR9XG4gICAgICAgICAgICAgICAgICAgICAgICAgIHRpdGxlPVwiRGlzY2lwbGluZSByZXZlYWwgwrcgZHJhZyB0aGUgY29tcGxldGUgY2xpcCB0byByZXRpbWVcIlxuICAgICAgICAgICAgICAgICAgICAgICAgICBvblBvaW50ZXJEb3duPXsoZXZlbnQpID0+IGJlZ2luVGltaW5nRHJhZyhldmVudCwge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHR5cGU6ICdkaXNjaXBsaW5lLXJldmVhbCcsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdG9rZW4sXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgbG9ja2VkOiBmYWxzZSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBtaW46IGR1cmF0aW9uICogMC41LFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIG1heDogRElTQ0lQTElORV9SRVZFQUxfTUFYIC0gKGR1cmF0aW9uICogMC41KSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBhdDogY2VudHJlLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHNlY3Rpb25JbmRleCxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBzZWN0aW9uU3RhcnRXVTogc3RhcnRXVSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBzcGFuV1UsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdHJhdmVsV1U6IGNvbXBpbGVkPy50cmF2ZWxXVSB8fCBzcGFuV1UsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgc3RvcnlXVTogc3RhcnRXVSArIChjZW50cmUgKiAoY29tcGlsZWQ/LnRyYXZlbFdVIHx8IDApKSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBzZWxlY3Rpb246IHJldmVhbFNlbGVjdGlvbixcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb2FsZXNjZUtleTogYHRpbWVsaW5lOiR7dG9rZW59YCxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgfSl9XG4gICAgICAgICAgICAgICAgICAgICAgICAgIG9uUG9pbnRlck1vdmU9e21vdmVUaW1pbmdEcmFnfVxuICAgICAgICAgICAgICAgICAgICAgICAgICBvblBvaW50ZXJVcD17ZW5kVGltaW5nRHJhZ31cbiAgICAgICAgICAgICAgICAgICAgICAgICAgb25Qb2ludGVyQ2FuY2VsPXtlbmRUaW1pbmdEcmFnfVxuICAgICAgICAgICAgICAgICAgICAgICAgICBvbkNsaWNrPXsoKSA9PiBoYW5kbGVUaW1pbmdDbGljayh0b2tlbiwgKCkgPT4gc2VsZWN0QXQoeyB0eXBlOiAnZGlzY2lwbGluZS1yZXZlYWwnIH0sIHJldmVhbC5zdGFydCkpfVxuICAgICAgICAgICAgICAgICAgICAgICAgPkRpc2NpcGxpbmUgcmV2ZWFsPC9idXR0b24+XG4gICAgICAgICAgICAgICAgICAgICAgKTtcbiAgICAgICAgICAgICAgICAgICAgfSkoKSA6IG51bGx9XG4gICAgICAgICAgICAgICAgICAgIHsoc2VjdGlvbi50ZXh0LmJsb2NrcyB8fCBbXSkubGVuZ3RoID8gKFxuICAgICAgICAgICAgICAgICAgICAgIDxidXR0b24gdHlwZT1cImJ1dHRvblwiIGNsYXNzTmFtZT17YGFib3V0LWVkaXRvci1lZGl0b3JpYWwtY2xpcCR7aW5TZWxlY3RlZFNlY3Rpb24gJiYgc2VsZWN0aW9uLnR5cGUgPT09ICdzZWN0aW9uJyA/ICcgaXMtc2VsZWN0ZWQnIDogJyd9YH0gb25DbGljaz17KCkgPT4gc2VsZWN0QXQoeyB0eXBlOiAnc2VjdGlvbicgfSl9PlxuICAgICAgICAgICAgICAgICAgICAgICAgVmVydGljYWwgwrcge3NlY3Rpb24udGV4dC5ibG9ja3MubGVuZ3RofSBibG9ja3NcbiAgICAgICAgICAgICAgICAgICAgICA8L2J1dHRvbj5cbiAgICAgICAgICAgICAgICAgICAgKSA6IG51bGx9XG4gICAgICAgICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgICAgICApO1xuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgIGNvbnN0IGlzU2VsZWN0ZWQgPSBpblNlbGVjdGVkU2VjdGlvbiAmJiBzZWxlY3Rpb24udHlwZSA9PT0gJ2ludGVyYWN0aW9uJztcbiAgICAgICAgICAgICAgY29uc3QgYWN0aXZhdGlvbiA9IHNlY3Rpb24uaW50ZXJhY3Rpb24/LnR5cGUgIT09ICdub25lJyA/IHNlY3Rpb24uaW50ZXJhY3Rpb24uYWN0aXZhdGlvblN0YXJ0IDogbnVsbDtcbiAgICAgICAgICAgICAgcmV0dXJuIChcbiAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzTmFtZT17YGFib3V0LWVkaXRvci1jbGlwJHtpc1NlbGVjdGVkID8gJyBpcy1zZWxlY3RlZCcgOiAnJ31gfSBrZXk9e3NlY3Rpb24uaWR9IHN0eWxlPXt7IHdpZHRoIH19PlxuICAgICAgICAgICAgICAgICAgPGJ1dHRvblxuICAgICAgICAgICAgICAgICAgICB0eXBlPVwiYnV0dG9uXCJcbiAgICAgICAgICAgICAgICAgICAgY2xhc3NOYW1lPXtgYWJvdXQtZWRpdG9yLWludGVyYWN0aW9uLWNsaXAgJHtzZWN0aW9uLmludGVyYWN0aW9uPy50eXBlICE9PSAnbm9uZScgPyAnaGFzLWludGVyYWN0aW9uJyA6ICcnfSR7aXNTZWxlY3RlZCA/ICcgaXMtc2VsZWN0ZWQnIDogJyd9YH1cbiAgICAgICAgICAgICAgICAgICAgYXJpYS1wcmVzc2VkPXtpc1NlbGVjdGVkfVxuICAgICAgICAgICAgICAgICAgICBvbkNsaWNrPXsoKSA9PiBzZWxlY3RBdCh7IHR5cGU6ICdpbnRlcmFjdGlvbicgfSwgYWN0aXZhdGlvbiB8fCAwKX1cbiAgICAgICAgICAgICAgICAgID57c2VjdGlvbi5pbnRlcmFjdGlvbj8udHlwZSAhPT0gJ25vbmUnID8gc2VjdGlvbi5pbnRlcmFjdGlvbi50eXBlIDogJyd9PC9idXR0b24+XG4gICAgICAgICAgICAgICAgICB7TnVtYmVyLmlzRmluaXRlKGFjdGl2YXRpb24pID8gKFxuICAgICAgICAgICAgICAgICAgICA8YnV0dG9uXG4gICAgICAgICAgICAgICAgICAgICAgdHlwZT1cImJ1dHRvblwiXG4gICAgICAgICAgICAgICAgICAgICAgY2xhc3NOYW1lPXtgYWJvdXQtZWRpdG9yLXRpbWluZy1rZXkgaXMtaW50ZXJhY3Rpb24ke2lzU2VsZWN0ZWQgJiYgc2VsZWN0aW9uLmtleVBhcnQgPT09ICdhY3RpdmF0aW9uJyA/ICcgaXMtc2VsZWN0ZWQnIDogJyd9YH1cbiAgICAgICAgICAgICAgICAgICAgICBzdHlsZT17eyBsZWZ0OiBsb2NhbFBvc2l0aW9uKGFjdGl2YXRpb24pIH19XG4gICAgICAgICAgICAgICAgICAgICAgdGl0bGU9XCJJbnRlcmFjdGlvbiBhY3RpdmF0aW9uXCJcbiAgICAgICAgICAgICAgICAgICAgICBhcmlhLWxhYmVsPXtgJHtzZWN0aW9uLmxhYmVsfSBpbnRlcmFjdGlvbiBhY3RpdmF0aW9uIGtleWZyYW1lYH1cbiAgICAgICAgICAgICAgICAgICAgICBvbkNsaWNrPXsoKSA9PiBzZWxlY3RBdCh7IHR5cGU6ICdpbnRlcmFjdGlvbicsIGtleVBhcnQ6ICdhY3RpdmF0aW9uJyB9LCBhY3RpdmF0aW9uKX1cbiAgICAgICAgICAgICAgICAgICAgLz5cbiAgICAgICAgICAgICAgICAgICkgOiBudWxsfVxuICAgICAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgICApO1xuICAgICAgICAgICAgfSl9XG4gICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgKSl9XG4gICAgICAgIDwvZGl2PlxuICAgICAgPC9kaXY+XG4gICAgPC9kaXY+XG4gICk7XG59XG5cbmZ1bmN0aW9uIFNlcXVlbmNlSW5zcGVjdG9yKHsgc3RvcmUsIHNuYXBzaG90IH0pIHtcbiAgY29uc3QgY29tbWl0R2xvYmFsID0gKGdyb3VwLCBrZXksIHZhbHVlKSA9PiBzdG9yZS5jb21taXQoYENoYW5nZSAke2tleX1gLCAoZHJhZnQpID0+IHtcbiAgICBpZiAoZ3JvdXAgPT09ICdzZXF1ZW5jZScpIGRyYWZ0Lmdsb2JhbHNba2V5XSA9IHZhbHVlO1xuICAgIGVsc2Uge1xuICAgICAgY29uc3QgdGFyZ2V0S2V5ID0gZ3JvdXAgPT09ICdtYXRlcmlhbCcgPyAncG9pbnRNYXRlcmlhbCcgOiBncm91cDtcbiAgICAgIGRyYWZ0Lmdsb2JhbHNbdGFyZ2V0S2V5XVtrZXldID0gdmFsdWU7XG4gICAgfVxuICB9LCB7IGNvYWxlc2NlS2V5OiBgZ2xvYmFsOiR7Z3JvdXB9OiR7a2V5fWAgfSk7XG4gIGNvbnN0IHJlcXVlc3RlZEdyb3VwSWRzID0gc25hcHNob3Quc2VsZWN0aW9uLnR5cGUgPT09ICdzZXF1ZW5jZSdcbiAgICA/IHNuYXBzaG90LnNlbGVjdGlvbi5ncm91cElkcyB8fCBbXVxuICAgIDogW107XG4gIGNvbnN0IGdyb3VwcyA9IHJlcXVlc3RlZEdyb3VwSWRzLmxlbmd0aFxuICAgID8gQUJPVVRfTkFSUkFUSVZFX0dMT0JBTF9DT05UUk9MUy5maWx0ZXIoKGdyb3VwKSA9PiByZXF1ZXN0ZWRHcm91cElkcy5pbmNsdWRlcyhncm91cC5pZCkpXG4gICAgOiBBQk9VVF9OQVJSQVRJVkVfR0xPQkFMX0NPTlRST0xTO1xuICBjb25zdCBoZWFkaW5nID0gc25hcHNob3Quc2VsZWN0aW9uLnRyYWNrTGFiZWxcbiAgICA/IGAke3NuYXBzaG90LnNlbGVjdGlvbi50cmFja0xhYmVsfSB0cmFja2BcbiAgICA6ICdTZXF1ZW5jZSc7XG4gIHJldHVybiAoXG4gICAgPD5cbiAgICAgIDxoZWFkZXI+PHNwYW4+e2hlYWRpbmd9PC9zcGFuPjxzdHJvbmc+R2xvYmFsIGNvbnRyb2xzPC9zdHJvbmc+PC9oZWFkZXI+XG4gICAgICB7Z3JvdXBzLm1hcCgoZ3JvdXApID0+IChcbiAgICAgICAgPGRldGFpbHMgb3BlbiBrZXk9e2dyb3VwLmlkfSBkYXRhLWdsb2JhbC1ncm91cD17Z3JvdXAuaWR9PlxuICAgICAgICAgIDxzdW1tYXJ5Pntncm91cC5sYWJlbH08L3N1bW1hcnk+XG4gICAgICAgICAge2dyb3VwLmlkID09PSAndGV4dE1vdGlvbicgPyA8cCBjbGFzc05hbWU9XCJhYm91dC1lZGl0b3ItaGVscFwiPkV2ZXJ5IHRpdGxlIGZvbGxvd3Mgb25lIGNvbnRpbnVvdXMgWSBhbmQgWiBwYXRoLiBOZWdhdGl2ZSBZIGlzIGhpZ2hlcjsgcG9zaXRpdmUgWSBpcyBsb3dlci4gVHJhdmVsIGR1cmF0aW9uIGNoYW5nZXMgdGhlIHdpZHRoIG9mIGV2ZXJ5IFNwYXRpYWwgdGl0bGUgYmxvY2sgaW4gdGhlIFRleHQgdGltZWxpbmUuPC9wPiA6IG51bGx9XG4gICAgICAgICAge2dyb3VwLmlkID09PSAnc3dhcm1UdXJidWxlbmNlJyA/IDxwIGNsYXNzTmFtZT1cImFib3V0LWVkaXRvci1oZWxwXCI+T25lIGFtYmllbnQgbW90aW9uIHByb2ZpbGUgZHJpdmVzIGJvdGggdGhlIGNsdXN0ZXIgYW5kIHR1cmJ1bGVudCBmaWVsZC4gRWFjaCBXb3JsZCBvbmx5IHNjYWxlcyBpdHMgc3RyZW5ndGgsIHNvIHRoZSBtb3Rpb24gc3RheXMgY29udGludW91cyB3aGlsZSBTaGFwZXMgY2hhbmdlLjwvcD4gOiBudWxsfVxuICAgICAgICAgIHtncm91cC5jb250cm9scy5tYXAoKGNvbnRyb2wpID0+IHtcbiAgICAgICAgICAgIGNvbnN0IHRhcmdldCA9IGdyb3VwLmlkID09PSAnc2VxdWVuY2UnXG4gICAgICAgICAgICAgID8gc25hcHNob3QuZG9jdW1lbnQuZ2xvYmFsc1xuICAgICAgICAgICAgICA6IHNuYXBzaG90LmRvY3VtZW50Lmdsb2JhbHNbZ3JvdXAuaWQgPT09ICdtYXRlcmlhbCcgPyAncG9pbnRNYXRlcmlhbCcgOiBncm91cC5pZF07XG4gICAgICAgICAgICBpZiAoZ3JvdXAuaWQgPT09ICd0ZXh0TW90aW9uJyAmJiBjb250cm9sLmlkID09PSAncmVhZGFibGVFbmQnKSByZXR1cm4gbnVsbDtcbiAgICAgICAgICAgIGlmIChncm91cC5pZCA9PT0gJ3RleHRNb3Rpb24nICYmIGNvbnRyb2wuaWQgPT09ICdyZWFkYWJsZVN0YXJ0Jykge1xuICAgICAgICAgICAgICByZXR1cm4gKFxuICAgICAgICAgICAgICAgIDxSYW5nZVByb3BlcnR5XG4gICAgICAgICAgICAgICAgICBrZXk9XCJjbGVhcldpbmRvd1wiXG4gICAgICAgICAgICAgICAgICBsYWJlbD1cIkNsZWFyIHdpbmRvd1wiXG4gICAgICAgICAgICAgICAgICBzdGFydD17dGFyZ2V0LnJlYWRhYmxlU3RhcnR9XG4gICAgICAgICAgICAgICAgICBlbmQ9e3RhcmdldC5yZWFkYWJsZUVuZH1cbiAgICAgICAgICAgICAgICAgIG1pbj17Y29udHJvbC5taW59XG4gICAgICAgICAgICAgICAgICBtYXg9e2NvbnRyb2wubWF4fVxuICAgICAgICAgICAgICAgICAgc3RlcD17Y29udHJvbC5zdGVwfVxuICAgICAgICAgICAgICAgICAgb25TdGFydENoYW5nZT17KHZhbHVlKSA9PiBjb21taXRHbG9iYWwoZ3JvdXAuaWQsICdyZWFkYWJsZVN0YXJ0JywgdmFsdWUpfVxuICAgICAgICAgICAgICAgICAgb25FbmRDaGFuZ2U9eyh2YWx1ZSkgPT4gY29tbWl0R2xvYmFsKGdyb3VwLmlkLCAncmVhZGFibGVFbmQnLCB2YWx1ZSl9XG4gICAgICAgICAgICAgICAgICBoaW50PVwiVGhlIHRpdGxlIGlzIGZ1bGx5IGNsZWFyIGluc2lkZSB0aGlzIHBhcnQgb2YgaXRzIG93biB0cmF2ZWwuIE91dHNpZGUgaXQsIGJsdXIgYW5kIG9wYWNpdHkgYnVpbGQgdG93YXJkIHRoZSBlbmRzLlwiXG4gICAgICAgICAgICAgICAgLz5cbiAgICAgICAgICAgICAgKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHJldHVybiAoXG4gICAgICAgICAgICAgIDxOdW1iZXJQcm9wZXJ0eVxuICAgICAgICAgICAgICAgIGtleT17Y29udHJvbC5pZH1cbiAgICAgICAgICAgICAgICBsYWJlbD17Y29udHJvbC5sYWJlbH1cbiAgICAgICAgICAgICAgICB2YWx1ZT17dGFyZ2V0W2NvbnRyb2wuaWRdfVxuICAgICAgICAgICAgICAgIG1pbj17Y29udHJvbC5taW59XG4gICAgICAgICAgICAgICAgbWF4PXtjb250cm9sLm1heH1cbiAgICAgICAgICAgICAgICBzdGVwPXtjb250cm9sLnN0ZXB9XG4gICAgICAgICAgICAgICAgdW5pdD17Y29udHJvbC51bml0fVxuICAgICAgICAgICAgICAgIG9uQ2hhbmdlPXsodmFsdWUpID0+IGNvbW1pdEdsb2JhbChncm91cC5pZCwgY29udHJvbC5pZCwgdmFsdWUpfVxuICAgICAgICAgICAgICAvPlxuICAgICAgICAgICAgKTtcbiAgICAgICAgICB9KX1cbiAgICAgICAgICB7Z3JvdXAuaWQgPT09ICd0ZXh0TW90aW9uJyA/IDxwIGNsYXNzTmFtZT1cImFib3V0LWVkaXRvci1oZWxwIGFib3V0LWVkaXRvci1kZXB0aC1oZWxwXCI+PHN0cm9uZz5EZXB0aCBtb3ZlczsgYmx1ciBzb2Z0ZW5zLjwvc3Ryb25nPiBFbnRyeSBkZXB0aCBzdGFydHMgYmVoaW5kIHRoZSBzY3JlZW4gb24g4oiSWiBhbmQgRXhpdCBkZXB0aCBmaW5pc2hlcyB0b3dhcmQgeW91IG9uICtaLiBQZXJzcGVjdGl2ZSBjb250cm9scyBob3cgc3Ryb25nbHkgdGhhdCBaIHRyYXZlbCBjaGFuZ2VzIGFwcGFyZW50IHNpemU7IE1heGltdW0gYmx1ciBvbmx5IGNoYW5nZXMgc2hhcnBuZXNzLjwvcD4gOiBudWxsfVxuICAgICAgICA8L2RldGFpbHM+XG4gICAgICApKX1cbiAgICA8Lz5cbiAgKTtcbn1cblxuZnVuY3Rpb24gU2VjdGlvbkluc3BlY3Rvcih7IHN0b3JlLCBzbmFwc2hvdCwgc2VjdGlvbiB9KSB7XG4gIGNvbnN0IHNlY3Rpb25JbmRleCA9IGdldFNlY3Rpb25JbmRleChzbmFwc2hvdC5kb2N1bWVudCwgc2VjdGlvbi5pZCk7XG4gIGNvbnN0IGNvbXBpbGVkU2VjdGlvbiA9IHNuYXBzaG90LmNvbXBpbGVkUGxhbj8uc2VjdGlvbnM/LltzZWN0aW9uSW5kZXhdO1xuICBjb25zdCBhY3RpdmVFeHRlbnRGaWVsZCA9IHNuYXBzaG90LnByZXZpZXdQcm9maWxlID09PSAnbW9iaWxlJyA/ICdtb2JpbGVFeHRlbnRXVScgOiAnZXh0ZW50V1UnO1xuICBjb25zdCBhY3RpdmVFeHRlbnQgPSBOdW1iZXIoc2VjdGlvblthY3RpdmVFeHRlbnRGaWVsZF0pO1xuICBjb25zdCByZXNvbHZlZEV4dGVudCA9IE51bWJlcihjb21waWxlZFNlY3Rpb24/LnJlc29sdmVkRXh0ZW50V1UgPz8gYWN0aXZlRXh0ZW50KTtcbiAgY29uc3QgY29udGVudE1pbmltdW1BY3RpdmUgPSByZXNvbHZlZEV4dGVudCA+IGFjdGl2ZUV4dGVudCArIDAuMDAxO1xuICBjb25zdCBiYXNlbGluZVNlY3Rpb24gPSBzbmFwc2hvdC5iYXNlbGluZURvY3VtZW50LnNlY3Rpb25zLmZpbmQoKGl0ZW0pID0+IGl0ZW0uaWQgPT09IHNlY3Rpb24uaWQpO1xuICBjb25zdCB1cGRhdGUgPSAobGFiZWwsIG11dGF0ZSwgY29hbGVzY2VLZXkgPSBudWxsKSA9PiBzdG9yZS5jb21taXQobGFiZWwsIChkcmFmdCkgPT4ge1xuICAgIG11dGF0ZShkcmFmdC5zZWN0aW9uc1tzZWN0aW9uSW5kZXhdKTtcbiAgfSwgeyBjb2FsZXNjZUtleSwgc2VsZWN0aW9uOiBzbmFwc2hvdC5zZWxlY3Rpb24gfSk7XG4gIGNvbnN0IG1vdmUgPSAoZGlyZWN0aW9uKSA9PiBzdG9yZS5jb21taXQoJ1Jlb3JkZXIgU2VjdGlvbicsIChkcmFmdCkgPT4ge1xuICAgIGNvbnN0IHRvSW5kZXggPSBzZWN0aW9uSW5kZXggKyBkaXJlY3Rpb247XG4gICAgaWYgKHRvSW5kZXggPCAwIHx8IHRvSW5kZXggPj0gZHJhZnQuc2VjdGlvbnMubGVuZ3RoKSByZXR1cm47XG4gICAgY29uc3QgW21vdmVkXSA9IGRyYWZ0LnNlY3Rpb25zLnNwbGljZShzZWN0aW9uSW5kZXgsIDEpO1xuICAgIGRyYWZ0LnNlY3Rpb25zLnNwbGljZSh0b0luZGV4LCAwLCBtb3ZlZCk7XG4gICAgcmVwbGFjZURyYWZ0RG9jdW1lbnQoZHJhZnQsIHN0aXRjaEFib3V0TmFycmF0aXZlQ2FtZXJhQm91bmRhcmllcyhkcmFmdCkpO1xuICB9LCB7IHNlbGVjdGlvbjogeyB0eXBlOiAnc2VjdGlvbicsIHNlY3Rpb25JZDogc2VjdGlvbi5pZCB9IH0pO1xuICBjb25zdCBkdXBsaWNhdGUgPSAoKSA9PiB7XG4gICAgY29uc3QgcmVzdWx0ID0gZHVwbGljYXRlQWJvdXROYXJyYXRpdmVTZWN0aW9uKHsgZG9jdW1lbnQ6IHNuYXBzaG90LmRvY3VtZW50LCBzZWN0aW9uSWQ6IHNlY3Rpb24uaWQgfSk7XG4gICAgaWYgKCFyZXN1bHQudmFsaWQpIHtcbiAgICAgIHN0b3JlLnNldFNhdmVTdGF0ZSh7IG1lc3NhZ2U6IHJlc3VsdC5yZWFzb24gfHwgJ1RoaXMgU2VjdGlvbiBjYW5ub3QgYmUgZHVwbGljYXRlZC4nIH0pO1xuICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICBzdG9yZS5jb21taXQoJ0R1cGxpY2F0ZSBTZWN0aW9uJywgKGRyYWZ0KSA9PiByZXBsYWNlRHJhZnREb2N1bWVudChkcmFmdCwgcmVzdWx0LmRvY3VtZW50KSwge1xuICAgICAgc2VsZWN0aW9uOiByZXN1bHQuc2VsZWN0aW9uLFxuICAgIH0pO1xuICB9O1xuXG4gIHJldHVybiAoXG4gICAgPD5cbiAgICAgIDxoZWFkZXI+PHNwYW4+U2VjdGlvbiB7U3RyaW5nKHNlY3Rpb25JbmRleCArIDEpLnBhZFN0YXJ0KDIsICcwJyl9PC9zcGFuPjxzdHJvbmc+e3NlY3Rpb24ubGFiZWx9PC9zdHJvbmc+PC9oZWFkZXI+XG4gICAgICB7c2VjdGlvbi5sb2NrZWQgPyA8ZGl2IGNsYXNzTmFtZT1cImFib3V0LWVkaXRvci1sb2NrXCI+PExvY2tLZXlob2xlIGFyaWEtaGlkZGVuPVwidHJ1ZVwiIC8+PHNwYW4+VGhpcyBwcm90ZWN0ZWQgU2VjdGlvbiBjYW5ub3QgYmUgcmVvcmRlcmVkIG9yIGhhdmUgaXRzIFdvcmxkIHJlcGxhY2VkIGFjY2lkZW50YWxseS48L3NwYW4+PGJ1dHRvbiB0eXBlPVwiYnV0dG9uXCIgb25DbGljaz17KCkgPT4gdXBkYXRlKCdVbmxvY2sgcHJvdGVjdGVkIFNlY3Rpb24nLCAoZHJhZnQpID0+IHsgZHJhZnQubG9ja2VkID0gZmFsc2U7IH0pfT5VbmxvY2sgYWR2YW5jZWQ8L2J1dHRvbj48L2Rpdj4gOiBudWxsfVxuICAgICAgPGRpdiBjbGFzc05hbWU9XCJhYm91dC1lZGl0b3ItaW5saW5lLWFjdGlvbnNcIj5cbiAgICAgICAgPGJ1dHRvbiB0eXBlPVwiYnV0dG9uXCIgZGlzYWJsZWQ9e3NlY3Rpb24ubG9ja2VkIHx8IHNlY3Rpb25JbmRleCA9PT0gMH0gb25DbGljaz17KCkgPT4gbW92ZSgtMSl9Pk1vdmUgZWFybGllcjwvYnV0dG9uPlxuICAgICAgICA8YnV0dG9uIHR5cGU9XCJidXR0b25cIiBkaXNhYmxlZD17c2VjdGlvbi5sb2NrZWQgfHwgc2VjdGlvbkluZGV4ID09PSBzbmFwc2hvdC5kb2N1bWVudC5zZWN0aW9ucy5sZW5ndGggLSAxfSBvbkNsaWNrPXsoKSA9PiBtb3ZlKDEpfT5Nb3ZlIGxhdGVyPC9idXR0b24+XG4gICAgICAgIDxidXR0b24gdHlwZT1cImJ1dHRvblwiIGRpc2FibGVkPXtzZWN0aW9uLmxvY2tlZCB8fCBzZWN0aW9uLnR5cGUgPT09ICdmaW5hbGUnfSBvbkNsaWNrPXtkdXBsaWNhdGV9PkR1cGxpY2F0ZTwvYnV0dG9uPlxuICAgICAgPC9kaXY+XG4gICAgICA8UHJvcGVydHkgbGFiZWw9XCJTZWN0aW9uIG5hbWVcIj48aW5wdXQgdmFsdWU9e3NlY3Rpb24ubGFiZWx9IG9uQ2hhbmdlPXsoZXZlbnQpID0+IHVwZGF0ZSgnUmVuYW1lIFNlY3Rpb24nLCAoZHJhZnQpID0+IHsgZHJhZnQubGFiZWwgPSBldmVudC50YXJnZXQudmFsdWU7IH0sIGBzZWN0aW9uOiR7c2VjdGlvbi5pZH06bGFiZWxgKX0gLz48L1Byb3BlcnR5PlxuICAgICAgPFByb3BlcnR5IGxhYmVsPVwiU3RhYmxlIElEXCI+PGlucHV0IHZhbHVlPXtzZWN0aW9uLmlkfSByZWFkT25seSAvPjxzbWFsbD5SZWZlcmVuY2VzIHRoaXMgU2VjdGlvbiB3aXRob3V0IHR5aW5nIGl0IHRvIGl0cyBjdXJyZW50IG1lYW5pbmcuPC9zbWFsbD48L1Byb3BlcnR5PlxuICAgICAgPFByb3BlcnR5IGxhYmVsPVwiVHlwZVwiPlxuICAgICAgICA8c2VsZWN0IHZhbHVlPXtzZWN0aW9uLnR5cGV9IGRpc2FibGVkPXtzZWN0aW9uLnR5cGUgPT09ICdmaW5hbGUnfSBvbkNoYW5nZT17KGV2ZW50KSA9PiB1cGRhdGUoJ0NoYW5nZSBTZWN0aW9uIHR5cGUnLCAoZHJhZnQpID0+IHsgZHJhZnQudHlwZSA9IGV2ZW50LnRhcmdldC52YWx1ZTsgfSl9PlxuICAgICAgICAgIDxvcHRpb24gdmFsdWU9XCJzcGF0aWFsXCI+U3BhdGlhbDwvb3B0aW9uPjxvcHRpb24gdmFsdWU9XCJlZGl0b3JpYWxcIj5FZGl0b3JpYWw8L29wdGlvbj48b3B0aW9uIHZhbHVlPVwiZmluYWxlXCI+RmluYWxlPC9vcHRpb24+XG4gICAgICAgIDwvc2VsZWN0PlxuICAgICAgPC9Qcm9wZXJ0eT5cbiAgICAgIDxkZXRhaWxzIG9wZW4+XG4gICAgICAgIDxzdW1tYXJ5PlNlY3Rpb24gdGltaW5nPC9zdW1tYXJ5PlxuICAgICAgICA8UHJvcGVydHkgbGFiZWw9XCJTY3JvbGwgdHJhdmVsXCI+PG91dHB1dCBjbGFzc05hbWU9XCJhYm91dC1lZGl0b3ItcmVhZG91dFwiPntmb3JtYXRXVShNYXRoLm1heCgwLCBhY3RpdmVFeHRlbnQgLSAxKSl9PC9vdXRwdXQ+PC9Qcm9wZXJ0eT5cbiAgICAgICAgPFByb3BlcnR5IGxhYmVsPVwiVG90YWwgaGVpZ2h0XCI+PG91dHB1dCBjbGFzc05hbWU9XCJhYm91dC1lZGl0b3ItcmVhZG91dFwiPntmb3JtYXRXVShhY3RpdmVFeHRlbnQpfTwvb3V0cHV0PjwvUHJvcGVydHk+XG4gICAgICAgIDxOdW1iZXJQcm9wZXJ0eSBsYWJlbD1cIkRlc2t0b3AgbGVuZ3RoXCIgdmFsdWU9e3NlY3Rpb24uZXh0ZW50V1V9IG1pbj17MX0gbWF4PXs4fSBzdGVwPXswLjA1fSB1bml0PVwiV1VcIiBvbkNoYW5nZT17KHZhbHVlKSA9PiB1cGRhdGUoJ0NoYW5nZSBkZXNrdG9wIFNlY3Rpb24gbGVuZ3RoJywgKGRyYWZ0KSA9PiB7IGRyYWZ0LmV4dGVudFdVID0gdmFsdWU7IH0sIGBzZWN0aW9uOiR7c2VjdGlvbi5pZH06ZXh0ZW50YCl9IC8+XG4gICAgICAgIDxOdW1iZXJQcm9wZXJ0eSBsYWJlbD1cIk1vYmlsZSBsZW5ndGhcIiB2YWx1ZT17c2VjdGlvbi5tb2JpbGVFeHRlbnRXVX0gbWluPXsxfSBtYXg9ezh9IHN0ZXA9ezAuMDV9IHVuaXQ9XCJXVVwiIG9uQ2hhbmdlPXsodmFsdWUpID0+IHVwZGF0ZSgnQ2hhbmdlIG1vYmlsZSBTZWN0aW9uIGxlbmd0aCcsIChkcmFmdCkgPT4geyBkcmFmdC5tb2JpbGVFeHRlbnRXVSA9IHZhbHVlOyB9LCBgc2VjdGlvbjoke3NlY3Rpb24uaWR9Om1vYmlsZWApfSAvPlxuICAgICAgICA8UHJvcGVydHkgbGFiZWw9XCJSZXNvbHZlZCBoZWlnaHRcIj48b3V0cHV0IGNsYXNzTmFtZT1cImFib3V0LWVkaXRvci1yZWFkb3V0XCI+e2Zvcm1hdFdVKHJlc29sdmVkRXh0ZW50KX08L291dHB1dD48L1Byb3BlcnR5PlxuICAgICAgICB7Y29udGVudE1pbmltdW1BY3RpdmUgPyA8cCBjbGFzc05hbWU9XCJhYm91dC1lZGl0b3ItdGltaW5nLXdhcm5pbmdcIj5Db250ZW50IG1pbmltdW0gaW4gZWZmZWN0LiBUaGUgcmVuZGVyZWQgY29weSBuZWVkcyB7Zm9ybWF0V1UocmVzb2x2ZWRFeHRlbnQpfSBpbiB0aGlzIHByb2ZpbGUuPC9wPiA6IG51bGx9XG4gICAgICAgIDxidXR0b25cbiAgICAgICAgICB0eXBlPVwiYnV0dG9uXCJcbiAgICAgICAgICBjbGFzc05hbWU9XCJhYm91dC1lZGl0b3Itd2lkZS1hY3Rpb25cIlxuICAgICAgICAgIGRpc2FibGVkPXshYmFzZWxpbmVTZWN0aW9uIHx8IGJhc2VsaW5lU2VjdGlvblthY3RpdmVFeHRlbnRGaWVsZF0gPT09IHNlY3Rpb25bYWN0aXZlRXh0ZW50RmllbGRdfVxuICAgICAgICAgIG9uQ2xpY2s9eygpID0+IHVwZGF0ZSgnUmVzdG9yZSBzYXZlZCBTZWN0aW9uIGxlbmd0aCcsIChkcmFmdCkgPT4geyBkcmFmdFthY3RpdmVFeHRlbnRGaWVsZF0gPSBiYXNlbGluZVNlY3Rpb25bYWN0aXZlRXh0ZW50RmllbGRdOyB9KX1cbiAgICAgICAgPlJlc2V0IHtzbmFwc2hvdC5wcmV2aWV3UHJvZmlsZSA9PT0gJ21vYmlsZScgPyAnbW9iaWxlJyA6ICdkZXNrdG9wJ30gbGVuZ3RoPC9idXR0b24+XG4gICAgICA8L2RldGFpbHM+XG4gICAgICB7c2VjdGlvbi50eXBlID09PSAnZWRpdG9yaWFsJyA/IDxFZGl0b3JpYWxCbG9ja3Mgc3RvcmU9e3N0b3JlfSBzbmFwc2hvdD17c25hcHNob3R9IHNlY3Rpb249e3NlY3Rpb259IC8+IDogbnVsbH1cbiAgICAgIHtzZWN0aW9uLnR5cGUgIT09ICdlZGl0b3JpYWwnID8gKFxuICAgICAgICA8YnV0dG9uXG4gICAgICAgICAgdHlwZT1cImJ1dHRvblwiXG4gICAgICAgICAgY2xhc3NOYW1lPVwiYWJvdXQtZWRpdG9yLXdpZGUtYWN0aW9uXCJcbiAgICAgICAgICBvbkNsaWNrPXsoKSA9PiB7XG4gICAgICAgICAgICBjb25zdCBsb2NhbCA9IGdldExvY2FsUHJvZ3Jlc3Moc25hcHNob3QuY29tcGlsZWRQbGFuLCBzZWN0aW9uLCBzbmFwc2hvdC50cmFuc3BvcnQuc3RvcnlXVSk7XG4gICAgICAgICAgICBjb25zdCBpZCA9IG5leHRJZChzbmFwc2hvdC5kb2N1bWVudCwgYCR7c2VjdGlvbi5pZH0tc3RhdGVtZW50YCk7XG4gICAgICAgICAgICBjb25zdCBmb2N1cyA9IE1hdGgubWluKDAuOTIsIE1hdGgubWF4KDAuMDgsIHNuYXBBYm91dE5hcnJhdGl2ZVRpbWVsaW5lVmFsdWUobG9jYWwpKSk7XG4gICAgICAgICAgICB1cGRhdGUoJ0FkZCB0ZXh0IEN1ZScsIChkcmFmdCkgPT4ge1xuICAgICAgICAgICAgICBkcmFmdC50ZXh0LmN1ZXMgfHw9IFtdO1xuICAgICAgICAgICAgICBkcmFmdC50ZXh0LmN1ZXMucHVzaCh7IGlkLCB0ZXh0OiAnTmV3IHRyYXZlbGxpbmcgc3RhdGVtZW50JywgZW50ZXI6IGZvY3VzIC0gMC4wOCwgaG9sZDogZm9jdXMsIGV4aXQ6IGZvY3VzICsgMC4wOCwgcHJlc2V0OiAndHJhdmVsbGluZy10aXRsZS12MScsIG1vdGlvbjogeyBtb2RlOiAnc3BhdGlhbCcgfSB9KTtcbiAgICAgICAgICAgICAgZHJhZnQudGV4dC5jdWVzLnNvcnQoKGEsIGIpID0+IGEuaG9sZCAtIGIuaG9sZCk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIHN0b3JlLnNldFNlbGVjdGlvbih7IHR5cGU6ICdjdWUnLCBzZWN0aW9uSWQ6IHNlY3Rpb24uaWQsIGN1ZUlkOiBpZCwga2V5UGFydDogJ2ZvY3VzJyB9KTtcbiAgICAgICAgICB9fVxuICAgICAgICA+QWRkIHRleHQgY3VlIGF0IHBsYXloZWFkPC9idXR0b24+XG4gICAgICApIDogbnVsbH1cbiAgICA8Lz5cbiAgKTtcbn1cblxuZnVuY3Rpb24gRWRpdG9yaWFsQmxvY2tzKHsgc3RvcmUsIHNuYXBzaG90LCBzZWN0aW9uIH0pIHtcbiAgY29uc3Qgc2VjdGlvbkluZGV4ID0gZ2V0U2VjdGlvbkluZGV4KHNuYXBzaG90LmRvY3VtZW50LCBzZWN0aW9uLmlkKTtcbiAgY29uc3QgdXBkYXRlQmxvY2sgPSAoYmxvY2tJbmRleCwgZmllbGQsIHZhbHVlKSA9PiBzdG9yZS5jb21taXQoJ0VkaXQgZWRpdG9yaWFsIGNvcHknLCAoZHJhZnQpID0+IHtcbiAgICBkcmFmdC5zZWN0aW9uc1tzZWN0aW9uSW5kZXhdLnRleHQuYmxvY2tzW2Jsb2NrSW5kZXhdW2ZpZWxkXSA9IHZhbHVlO1xuICB9LCB7IGNvYWxlc2NlS2V5OiBgYmxvY2s6JHtzZWN0aW9uLmlkfToke2Jsb2NrSW5kZXh9OiR7ZmllbGR9YCwgc2VsZWN0aW9uOiBzbmFwc2hvdC5zZWxlY3Rpb24gfSk7XG4gIGNvbnN0IHVwZGF0ZUVtcGhhc2lzID0gKGJsb2NrSW5kZXgsIGVtcGhhc2lzSW5kZXgsIGZpZWxkLCB2YWx1ZSkgPT4gc3RvcmUuY29tbWl0KCdFZGl0IGVkaXRvcmlhbCBoaWdobGlnaHQnLCAoZHJhZnQpID0+IHtcbiAgICBkcmFmdC5zZWN0aW9uc1tzZWN0aW9uSW5kZXhdLnRleHQuYmxvY2tzW2Jsb2NrSW5kZXhdLmVtcGhhc2lzW2VtcGhhc2lzSW5kZXhdW2ZpZWxkXSA9IHZhbHVlO1xuICB9LCB7IGNvYWxlc2NlS2V5OiBgYmxvY2s6JHtzZWN0aW9uLmlkfToke2Jsb2NrSW5kZXh9OmVtcGhhc2lzOiR7ZW1waGFzaXNJbmRleH06JHtmaWVsZH1gLCBzZWxlY3Rpb246IHNuYXBzaG90LnNlbGVjdGlvbiB9KTtcbiAgY29uc3QgYWRkRW1waGFzaXMgPSAoYmxvY2tJbmRleCkgPT4gc3RvcmUuY29tbWl0KCdBZGQgZWRpdG9yaWFsIGhpZ2hsaWdodCcsIChkcmFmdCkgPT4ge1xuICAgIGNvbnN0IGJsb2NrID0gZHJhZnQuc2VjdGlvbnNbc2VjdGlvbkluZGV4XS50ZXh0LmJsb2Nrc1tibG9ja0luZGV4XTtcbiAgICBibG9jay5lbXBoYXNpcyB8fD0gW107XG4gICAgYmxvY2suZW1waGFzaXMucHVzaCh7IHRleHQ6IGJsb2NrLnRleHQudHJpbSgpLnNwbGl0KC9cXHMrLykuc2xpY2UoMCwgMikuam9pbignICcpLCB0b25lOiAnYmx1ZScgfSk7XG4gIH0sIHsgc2VsZWN0aW9uOiBzbmFwc2hvdC5zZWxlY3Rpb24gfSk7XG4gIGNvbnN0IHJlbW92ZUVtcGhhc2lzID0gKGJsb2NrSW5kZXgsIGVtcGhhc2lzSW5kZXgpID0+IHN0b3JlLmNvbW1pdCgnUmVtb3ZlIGVkaXRvcmlhbCBoaWdobGlnaHQnLCAoZHJhZnQpID0+IHtcbiAgICBkcmFmdC5zZWN0aW9uc1tzZWN0aW9uSW5kZXhdLnRleHQuYmxvY2tzW2Jsb2NrSW5kZXhdLmVtcGhhc2lzLnNwbGljZShlbXBoYXNpc0luZGV4LCAxKTtcbiAgfSwgeyBzZWxlY3Rpb246IHNuYXBzaG90LnNlbGVjdGlvbiB9KTtcbiAgcmV0dXJuIChcbiAgICA8ZGV0YWlscyBvcGVuPlxuICAgICAgPHN1bW1hcnk+RWRpdG9yaWFsIGNvbnRlbnQ8L3N1bW1hcnk+XG4gICAgICB7KHNlY3Rpb24udGV4dC5ibG9ja3MgfHwgW10pLm1hcCgoYmxvY2ssIGJsb2NrSW5kZXgpID0+IChcbiAgICAgICAgPGRpdiBjbGFzc05hbWU9XCJhYm91dC1lZGl0b3ItYmxvY2tcIiBrZXk9e2Jsb2NrLmlkfT5cbiAgICAgICAgICA8ZGl2Pjxjb2RlPntibG9jay5raW5kfTwvY29kZT48c3Bhbj57YmxvY2suaWR9PC9zcGFuPjwvZGl2PlxuICAgICAgICAgIHtibG9jay5sYWJlbCAhPSBudWxsID8gPFByb3BlcnR5IGxhYmVsPVwiTGFiZWxcIj48aW5wdXQgdmFsdWU9e2Jsb2NrLmxhYmVsfSBvbkNoYW5nZT17KGV2ZW50KSA9PiB1cGRhdGVCbG9jayhibG9ja0luZGV4LCAnbGFiZWwnLCBldmVudC50YXJnZXQudmFsdWUpfSAvPjwvUHJvcGVydHk+IDogbnVsbH1cbiAgICAgICAgICB7YmxvY2sudGV4dCAhPSBudWxsID8gPFByb3BlcnR5IGxhYmVsPVwiQ29weVwiPjx0ZXh0YXJlYSByb3dzPVwiNVwiIHZhbHVlPXtibG9jay50ZXh0fSBvbkNoYW5nZT17KGV2ZW50KSA9PiB1cGRhdGVCbG9jayhibG9ja0luZGV4LCAndGV4dCcsIGV2ZW50LnRhcmdldC52YWx1ZSl9IC8+PC9Qcm9wZXJ0eT4gOiBudWxsfVxuICAgICAgICAgIHtibG9jay5raW5kID09PSAncHJvc2UnID8gPFByb3BlcnR5IGxhYmVsPVwiUmVjb25uZWN0IHBvaW50IGdyaWRcIj48aW5wdXQgdHlwZT1cImNoZWNrYm94XCIgY2hlY2tlZD17YmxvY2sud29ybGRJbmZsdWVuY2UgPT09IHRydWV9IG9uQ2hhbmdlPXsoZXZlbnQpID0+IHVwZGF0ZUJsb2NrKGJsb2NrSW5kZXgsICd3b3JsZEluZmx1ZW5jZScsIGV2ZW50LnRhcmdldC5jaGVja2VkKX0gLz48L1Byb3BlcnR5PiA6IG51bGx9XG4gICAgICAgICAge2Jsb2NrLnRleHQgIT0gbnVsbCA/IChcbiAgICAgICAgICAgIDxkaXYgY2xhc3NOYW1lPVwiYWJvdXQtZWRpdG9yLWVtcGhhc2lzLWNvbnRyb2xzXCI+XG4gICAgICAgICAgICAgIDxzcGFuPkhpZ2hsaWdodGVkIHdvcmRzPC9zcGFuPlxuICAgICAgICAgICAgICB7KGJsb2NrLmVtcGhhc2lzIHx8IFtdKS5tYXAoKGl0ZW0sIGVtcGhhc2lzSW5kZXgpID0+IChcbiAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cImFib3V0LWVkaXRvci1lbXBoYXNpcy1yb3dcIiBrZXk9e2Ake2Jsb2NrLmlkfS1lbXBoYXNpcy0ke2VtcGhhc2lzSW5kZXh9YH0+XG4gICAgICAgICAgICAgICAgICA8aW5wdXQgYXJpYS1sYWJlbD1cIkhpZ2hsaWdodGVkIHBocmFzZVwiIHZhbHVlPXtpdGVtLnRleHR9IG9uQ2hhbmdlPXsoZXZlbnQpID0+IHVwZGF0ZUVtcGhhc2lzKGJsb2NrSW5kZXgsIGVtcGhhc2lzSW5kZXgsICd0ZXh0JywgZXZlbnQudGFyZ2V0LnZhbHVlKX0gLz5cbiAgICAgICAgICAgICAgICAgIDxzZWxlY3QgYXJpYS1sYWJlbD1cIkhpZ2hsaWdodCBjb2xvdXJcIiB2YWx1ZT17aXRlbS50b25lfSBvbkNoYW5nZT17KGV2ZW50KSA9PiB1cGRhdGVFbXBoYXNpcyhibG9ja0luZGV4LCBlbXBoYXNpc0luZGV4LCAndG9uZScsIGV2ZW50LnRhcmdldC52YWx1ZSl9PlxuICAgICAgICAgICAgICAgICAgICB7QUJPVVRfTkFSUkFUSVZFX0VNUEhBU0lTX1RPTkVTLm1hcCgodG9uZSkgPT4gPG9wdGlvbiB2YWx1ZT17dG9uZX0ga2V5PXt0b25lfT57dG9uZX08L29wdGlvbj4pfVxuICAgICAgICAgICAgICAgICAgPC9zZWxlY3Q+XG4gICAgICAgICAgICAgICAgICA8YnV0dG9uIHR5cGU9XCJidXR0b25cIiBhcmlhLWxhYmVsPXtgUmVtb3ZlICR7aXRlbS50ZXh0IHx8ICdlbXB0eSd9IGhpZ2hsaWdodGB9IG9uQ2xpY2s9eygpID0+IHJlbW92ZUVtcGhhc2lzKGJsb2NrSW5kZXgsIGVtcGhhc2lzSW5kZXgpfT7DlzwvYnV0dG9uPlxuICAgICAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgICApKX1cbiAgICAgICAgICAgICAgPGJ1dHRvbiB0eXBlPVwiYnV0dG9uXCIgb25DbGljaz17KCkgPT4gYWRkRW1waGFzaXMoYmxvY2tJbmRleCl9PkFkZCBoaWdobGlnaHQ8L2J1dHRvbj5cbiAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICkgOiBudWxsfVxuICAgICAgICAgIHtibG9jay5pdGVtcyA/IDxQcm9wZXJ0eSBsYWJlbD1cIkl0ZW1zXCI+PHRleHRhcmVhIHJvd3M9XCI2XCIgdmFsdWU9e2Jsb2NrLml0ZW1zLmpvaW4oJ1xcbicpfSBvbkNoYW5nZT17KGV2ZW50KSA9PiB1cGRhdGVCbG9jayhibG9ja0luZGV4LCAnaXRlbXMnLCBldmVudC50YXJnZXQudmFsdWUuc3BsaXQoJ1xcbicpLmZpbHRlcihCb29sZWFuKSl9IC8+PC9Qcm9wZXJ0eT4gOiBudWxsfVxuICAgICAgICA8L2Rpdj5cbiAgICAgICkpfVxuICAgICAgPGJ1dHRvbiB0eXBlPVwiYnV0dG9uXCIgY2xhc3NOYW1lPVwiYWJvdXQtZWRpdG9yLXdpZGUtYWN0aW9uXCIgb25DbGljaz17KCkgPT4gc3RvcmUuY29tbWl0KCdBZGQgZWRpdG9yaWFsIGJsb2NrJywgKGRyYWZ0KSA9PiB7XG4gICAgICAgIGRyYWZ0LnNlY3Rpb25zW3NlY3Rpb25JbmRleF0udGV4dC5ibG9ja3MucHVzaCh7IGlkOiBuZXh0SWQoZHJhZnQsIGAke3NlY3Rpb24uaWR9LXByb3NlYCksIGtpbmQ6ICdwcm9zZScsIHRleHQ6ICdOZXcgZWRpdG9yaWFsIHBhcmFncmFwaC4nIH0pO1xuICAgICAgfSl9PkFkZCBwcm9zZSBibG9jazwvYnV0dG9uPlxuICAgIDwvZGV0YWlscz5cbiAgKTtcbn1cblxuZnVuY3Rpb24gQ3VlUmh5dGhtQW5kUmV1c2UoeyBzdG9yZSwgc25hcHNob3QsIGNsaXBib2FyZCwgc2V0Q2xpcGJvYXJkIH0pIHtcbiAgY29uc3QgbWVtYmVycyA9IGdldEFib3V0TmFycmF0aXZlU2VsZWN0aW9uTWVtYmVycyhzbmFwc2hvdC5zZWxlY3Rpb24pO1xuICBjb25zdCBbZ2FwV1UsIHNldEdhcFdVXSA9IHVzZVN0YXRlKDAuMzUpO1xuICBjb25zdCBbYW5jaG9yLCBzZXRBbmNob3JdID0gdXNlU3RhdGUoJ3ByaW1hcnknKTtcbiAgY29uc3QgW3ByZXZpZXcsIHNldFByZXZpZXddID0gdXNlU3RhdGUobnVsbCk7XG4gIGNvbnN0IFttZXNzYWdlLCBzZXRNZXNzYWdlXSA9IHVzZVN0YXRlKCcnKTtcblxuICBjb25zdCBwcmV2aWV3TW92ZXMgPSAobGFiZWwsIHJlc3VsdCkgPT4ge1xuICAgIGlmICghcmVzdWx0LnZhbGlkKSB7XG4gICAgICBpZiAoc25hcHNob3QudHJ5U3RhdGUpIHN0b3JlLmNhbmNlbFRyeSgpO1xuICAgICAgc2V0UHJldmlldyhyZXN1bHQpO1xuICAgICAgc2V0TWVzc2FnZShyZXN1bHQucmVhc29uIHx8ICdUaGlzIGFycmFuZ2VtZW50IGRvZXMgbm90IGZpdCB0aGUgc2VsZWN0ZWQgU2VjdGlvbnMuJyk7XG4gICAgICByZXR1cm47XG4gICAgfVxuICAgIGlmIChzbmFwc2hvdC50cnlTdGF0ZSkgc3RvcmUuY2FuY2VsVHJ5KCk7XG4gICAgc3RvcmUuYmVnaW5UcnkobGFiZWwsIChkcmFmdCkgPT4gYXBwbHlDdWVNb3ZlcyhkcmFmdCwgcmVzdWx0Lm1vdmVzKSk7XG4gICAgc2V0UHJldmlldyh7IC4uLnJlc3VsdCwgbGFiZWwgfSk7XG4gICAgc2V0TWVzc2FnZSgnJyk7XG4gIH07XG4gIGNvbnN0IGNhbmNlbFByZXZpZXcgPSAoKSA9PiB7XG4gICAgaWYgKHNuYXBzaG90LnRyeVN0YXRlKSBzdG9yZS5jYW5jZWxUcnkoKTtcbiAgICBzZXRQcmV2aWV3KG51bGwpO1xuICAgIHNldE1lc3NhZ2UoJycpO1xuICB9O1xuICBjb25zdCBhcHBseVByZXZpZXcgPSAoKSA9PiB7XG4gICAgaWYgKCFwcmV2aWV3Py52YWxpZCB8fCAhc25hcHNob3QudHJ5U3RhdGUpIHJldHVybjtcbiAgICBzdG9yZS5hcHBseVRyeSgpO1xuICAgIHNldFByZXZpZXcobnVsbCk7XG4gICAgc2V0TWVzc2FnZSgnJyk7XG4gIH07XG4gIGNvbnN0IGNvbW1pdENhbmRpZGF0ZSA9IChsYWJlbCwgcmVzdWx0KSA9PiB7XG4gICAgaWYgKCFyZXN1bHQ/LnZhbGlkIHx8ICFyZXN1bHQuZG9jdW1lbnQpIHtcbiAgICAgIHNldE1lc3NhZ2UocmVzdWx0Py5yZWFzb24gfHwgJ1RoaXMgb3BlcmF0aW9uIGNvdWxkIG5vdCBiZSBjb21wbGV0ZWQgc2FmZWx5LicpO1xuICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICBzdG9yZS5jb21taXQobGFiZWwsIChkcmFmdCkgPT4gcmVwbGFjZURyYWZ0RG9jdW1lbnQoZHJhZnQsIHJlc3VsdC5kb2N1bWVudCksIHtcbiAgICAgIHNlbGVjdGlvbjogcmVzdWx0LnNlbGVjdGlvbiB8fCBzbmFwc2hvdC5zZWxlY3Rpb24sXG4gICAgfSk7XG4gICAgc2V0TWVzc2FnZSgnJyk7XG4gIH07XG5cbiAgY29uc3QgZGlzdHJpYnV0ZSA9ICgpID0+IHByZXZpZXdNb3ZlcygnRGlzdHJpYnV0ZSB0aXRsZSByaHl0aG0nLCByZXNvbHZlQWJvdXROYXJyYXRpdmVDdWVEaXN0cmlidXRpb24oe1xuICAgIGRvY3VtZW50OiBzbmFwc2hvdC5kb2N1bWVudCxcbiAgICBwbGFuOiBzbmFwc2hvdC5jb21waWxlZFBsYW4sXG4gICAgbWVtYmVycyxcbiAgICBwcmltYXJ5OiBzbmFwc2hvdC5zZWxlY3Rpb24sXG4gIH0pKTtcbiAgY29uc3QgZXhhY3RHYXAgPSAoKSA9PiBwcmV2aWV3TW92ZXMoJ1NldCBleGFjdCB0aXRsZSBnYXAnLCByZXNvbHZlQWJvdXROYXJyYXRpdmVDdWVFeGFjdEdhcCh7XG4gICAgZG9jdW1lbnQ6IHNuYXBzaG90LmRvY3VtZW50LFxuICAgIHBsYW46IHNuYXBzaG90LmNvbXBpbGVkUGxhbixcbiAgICBtZW1iZXJzLFxuICAgIHByaW1hcnk6IHNuYXBzaG90LnNlbGVjdGlvbixcbiAgICBnYXBXVSxcbiAgICBhbmNob3IsXG4gIH0pKTtcbiAgY29uc3QgYWxpZ25QcmltYXJ5ID0gKCkgPT4gcHJldmlld01vdmVzKCdBbGlnbiB0aXRsZXMgdG8gcGxheWhlYWQnLCByZXNvbHZlQWJvdXROYXJyYXRpdmVDdWVHcm91cEFsaWduKHtcbiAgICBkb2N1bWVudDogc25hcHNob3QuZG9jdW1lbnQsXG4gICAgcGxhbjogc25hcHNob3QuY29tcGlsZWRQbGFuLFxuICAgIG1lbWJlcnMsXG4gICAgcHJpbWFyeTogc25hcHNob3Quc2VsZWN0aW9uLFxuICAgIHBsYXloZWFkV1U6IHNuYXBzaG90LnRyYW5zcG9ydC5zdG9yeVdVLFxuICB9KSk7XG4gIGNvbnN0IGR1cGxpY2F0ZSA9ICgpID0+IGNvbW1pdENhbmRpZGF0ZSgnRHVwbGljYXRlIHRpdGxlIEN1ZXMnLCBkdXBsaWNhdGVBYm91dE5hcnJhdGl2ZUN1ZUdyb3VwKHtcbiAgICBkb2N1bWVudDogc25hcHNob3QuZG9jdW1lbnQsXG4gICAgbWVtYmVycyxcbiAgICBwcmltYXJ5OiBzbmFwc2hvdC5zZWxlY3Rpb24sXG4gIH0pKTtcbiAgY29uc3QgY29weSA9ICgpID0+IHtcbiAgICBjb25zdCByZXN1bHQgPSBjcmVhdGVBYm91dE5hcnJhdGl2ZUN1ZUNsaXBib2FyZFBheWxvYWQoe1xuICAgICAgZG9jdW1lbnQ6IHNuYXBzaG90LmRvY3VtZW50LFxuICAgICAgcGxhbjogc25hcHNob3QuY29tcGlsZWRQbGFuLFxuICAgICAgbWVtYmVycyxcbiAgICAgIHByaW1hcnk6IHNuYXBzaG90LnNlbGVjdGlvbixcbiAgICB9KTtcbiAgICBjb25zdCBwYXlsb2FkID0gcmVzdWx0Py5wYXlsb2FkIHx8IHJlc3VsdDtcbiAgICBjb25zdCB2YWxpZGF0aW9uID0gdmFsaWRhdGVBYm91dE5hcnJhdGl2ZUN1ZUNsaXBib2FyZFBheWxvYWQocGF5bG9hZCk7XG4gICAgaWYgKHJlc3VsdD8udmFsaWQgPT09IGZhbHNlIHx8IHZhbGlkYXRpb24/LnZhbGlkID09PSBmYWxzZSkge1xuICAgICAgc2V0TWVzc2FnZShyZXN1bHQ/LnJlYXNvbiB8fCB2YWxpZGF0aW9uPy5yZWFzb24gfHwgJ1RoZXNlIHRpdGxlcyBjYW5ub3QgYmUgY29waWVkLicpO1xuICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICBzZXRDbGlwYm9hcmQocGF5bG9hZCk7XG4gICAgc2V0TWVzc2FnZShgJHttZW1iZXJzLmxlbmd0aH0gdGl0bGUke21lbWJlcnMubGVuZ3RoID09PSAxID8gJycgOiAncyd9IGNvcGllZCBmb3IgdGhpcyBlZGl0b3Igc2Vzc2lvbi5gKTtcbiAgfTtcbiAgY29uc3QgcGFzdGUgPSAoKSA9PiBjb21taXRDYW5kaWRhdGUoJ1Bhc3RlIHRpdGxlIEN1ZXMnLCByZXNvbHZlQWJvdXROYXJyYXRpdmVDdWVHcm91cFBhc3RlKHtcbiAgICBkb2N1bWVudDogc25hcHNob3QuZG9jdW1lbnQsXG4gICAgcGxhbjogc25hcHNob3QuY29tcGlsZWRQbGFuLFxuICAgIHBheWxvYWQ6IGNsaXBib2FyZCxcbiAgICBkZXN0aW5hdGlvblNlY3Rpb25JZDogc25hcHNob3Quc2VsZWN0aW9uLnNlY3Rpb25JZCxcbiAgICBwbGF5aGVhZFdVOiBzbmFwc2hvdC50cmFuc3BvcnQuc3RvcnlXVSxcbiAgfSkpO1xuXG4gIGNvbnN0IGdob3N0TW92ZXMgPSBwcmV2aWV3Py52YWxpZCA/IHByZXZpZXcubW92ZXMgOiBbXTtcbiAgY29uc3QgbWF4V1UgPSBNYXRoLm1heCgwLjAwMSwgc25hcHNob3QuY29tcGlsZWRQbGFuPy5tYXhTdG9yeVdVIHx8IDEpO1xuICByZXR1cm4gKFxuICAgIDxkZXRhaWxzIGNsYXNzTmFtZT1cImFib3V0LWVkaXRvci1yaHl0aG1cIiBvcGVuPXttZW1iZXJzLmxlbmd0aCA+IDF9PlxuICAgICAgPHN1bW1hcnk+Umh5dGhtIGFuZCByZXVzZTwvc3VtbWFyeT5cbiAgICAgIHttZW1iZXJzLmxlbmd0aCA+IDEgPyAoXG4gICAgICAgIDw+XG4gICAgICAgICAgPGRpdiBjbGFzc05hbWU9XCJhYm91dC1lZGl0b3Itcmh5dGhtLWFjdGlvbnNcIj5cbiAgICAgICAgICAgIDxidXR0b24gdHlwZT1cImJ1dHRvblwiIG9uQ2xpY2s9e2Rpc3RyaWJ1dGV9PkRpc3RyaWJ1dGUgZXZlbmx5PC9idXR0b24+XG4gICAgICAgICAgICA8YnV0dG9uIHR5cGU9XCJidXR0b25cIiBvbkNsaWNrPXthbGlnblByaW1hcnl9PkFsaWduIHByaW1hcnkgdG8gcGxheWhlYWQ8L2J1dHRvbj5cbiAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cImFib3V0LWVkaXRvci1yaHl0aG0tZ2FwXCI+XG4gICAgICAgICAgICA8UHJvcGVydHkgbGFiZWw9XCJFeGFjdCBnYXBcIj48aW5wdXQgdHlwZT1cIm51bWJlclwiIG1pbj1cIjBcIiBtYXg9XCI4XCIgc3RlcD1cIjAuMDVcIiB2YWx1ZT17Z2FwV1V9IG9uQ2hhbmdlPXsoZXZlbnQpID0+IHNldEdhcFdVKE1hdGgubWF4KDAsIE51bWJlcihldmVudC50YXJnZXQudmFsdWUpIHx8IDApKX0gLz48L1Byb3BlcnR5PlxuICAgICAgICAgICAgPFByb3BlcnR5IGxhYmVsPVwiQW5jaG9yXCI+PHNlbGVjdCB2YWx1ZT17YW5jaG9yfSBvbkNoYW5nZT17KGV2ZW50KSA9PiBzZXRBbmNob3IoZXZlbnQudGFyZ2V0LnZhbHVlKX0+PG9wdGlvbiB2YWx1ZT1cInByaW1hcnlcIj5QcmltYXJ5PC9vcHRpb24+PG9wdGlvbiB2YWx1ZT1cImZpcnN0XCI+Rmlyc3Q8L29wdGlvbj48b3B0aW9uIHZhbHVlPVwibGFzdFwiPkxhc3Q8L29wdGlvbj48L3NlbGVjdD48L1Byb3BlcnR5PlxuICAgICAgICAgICAgPGJ1dHRvbiB0eXBlPVwiYnV0dG9uXCIgb25DbGljaz17ZXhhY3RHYXB9PlByZXZpZXcgZXhhY3QgZ2FwPC9idXR0b24+XG4gICAgICAgICAgPC9kaXY+XG4gICAgICAgIDwvPlxuICAgICAgKSA6IG51bGx9XG4gICAgICB7Z2hvc3RNb3Zlcy5sZW5ndGggPyAoXG4gICAgICAgIDxkaXYgY2xhc3NOYW1lPVwiYWJvdXQtZWRpdG9yLXJoeXRobS1wcmV2aWV3XCIgYXJpYS1sYWJlbD1cIlByb3Bvc2VkIHRpdGxlIHJoeXRobVwiPlxuICAgICAgICAgIHtnaG9zdE1vdmVzLm1hcCgobW92ZSkgPT4ge1xuICAgICAgICAgICAgY29uc3QgY29tcGlsZWQgPSBzbmFwc2hvdC5jb21waWxlZFBsYW4uc2VjdGlvbnMuZmluZCgoaXRlbSkgPT4gaXRlbS5pZCA9PT0gbW92ZS5zZWN0aW9uSWQpO1xuICAgICAgICAgICAgY29uc3Qgc3RvcnlXVSA9IE51bWJlcihjb21waWxlZD8uc3RhcnRXVSB8fCAwKSArIChtb3ZlLmhvbGQgKiBOdW1iZXIoY29tcGlsZWQ/LnRyYXZlbFdVIHx8IDApKTtcbiAgICAgICAgICAgIHJldHVybiA8aSBrZXk9e2Ake21vdmUuc2VjdGlvbklkfToke21vdmUuY3VlSWR9YH0gc3R5bGU9e3sgbGVmdDogYCR7KHN0b3J5V1UgLyBtYXhXVSkgKiAxMDB9JWAgfX0gdGl0bGU9e2Ake21vdmUuY3VlSWR9IMK3ICR7Zm9ybWF0V1Uoc3RvcnlXVSl9YH0gLz47XG4gICAgICAgICAgfSl9XG4gICAgICAgIDwvZGl2PlxuICAgICAgKSA6IG51bGx9XG4gICAgICB7bWVzc2FnZSA/IDxwIGNsYXNzTmFtZT17YGFib3V0LWVkaXRvci1yaHl0aG0tbWVzc2FnZSR7cHJldmlldyAmJiAhcHJldmlldy52YWxpZCA/ICcgaXMtZXJyb3InIDogJyd9YH0+e21lc3NhZ2V9PC9wPiA6IG51bGx9XG4gICAgICB7cHJldmlldz8udmFsaWQgJiYgc25hcHNob3QudHJ5U3RhdGUgPyA8ZGl2IGNsYXNzTmFtZT1cImFib3V0LWVkaXRvci10cnlcIj48c3Bhbj5QcmV2aWV3aW5nIHtwcmV2aWV3LmxhYmVsfTwvc3Bhbj48YnV0dG9uIHR5cGU9XCJidXR0b25cIiBvbkNsaWNrPXtjYW5jZWxQcmV2aWV3fT5DYW5jZWw8L2J1dHRvbj48YnV0dG9uIHR5cGU9XCJidXR0b25cIiBjbGFzc05hbWU9XCJpcy1wcmltYXJ5XCIgb25DbGljaz17YXBwbHlQcmV2aWV3fT5BcHBseTwvYnV0dG9uPjwvZGl2PiA6IG51bGx9XG4gICAgICA8ZGl2IGNsYXNzTmFtZT1cImFib3V0LWVkaXRvci1yaHl0aG0tYWN0aW9uc1wiPlxuICAgICAgICA8YnV0dG9uIHR5cGU9XCJidXR0b25cIiBvbkNsaWNrPXtkdXBsaWNhdGV9PkR1cGxpY2F0ZSB7bWVtYmVycy5sZW5ndGggPiAxID8gJ3NlbGVjdGlvbicgOiAndGl0bGUnfTwvYnV0dG9uPlxuICAgICAgICA8YnV0dG9uIHR5cGU9XCJidXR0b25cIiBvbkNsaWNrPXtjb3B5fT5Db3B5PC9idXR0b24+XG4gICAgICAgIDxidXR0b24gdHlwZT1cImJ1dHRvblwiIGRpc2FibGVkPXshY2xpcGJvYXJkfSBvbkNsaWNrPXtwYXN0ZX0+UGFzdGUgYXQgcGxheWhlYWQ8L2J1dHRvbj5cbiAgICAgIDwvZGl2PlxuICAgIDwvZGV0YWlscz5cbiAgKTtcbn1cblxuZnVuY3Rpb24gQ3VlSW5zcGVjdG9yKHsgc3RvcmUsIHNuYXBzaG90LCBzZWN0aW9uLCBjbGlwYm9hcmQsIHNldENsaXBib2FyZCB9KSB7XG4gIGNvbnN0IHNlbGVjdGVkTWVtYmVycyA9IGdldEFib3V0TmFycmF0aXZlU2VsZWN0aW9uTWVtYmVycyhzbmFwc2hvdC5zZWxlY3Rpb24pO1xuICBjb25zdCBzZWN0aW9uSW5kZXggPSBnZXRTZWN0aW9uSW5kZXgoc25hcHNob3QuZG9jdW1lbnQsIHNlY3Rpb24uaWQpO1xuICBjb25zdCBjdWVJbmRleCA9IHNlY3Rpb24udGV4dC5jdWVzLmZpbmRJbmRleCgoY3VlKSA9PiBjdWUuaWQgPT09IHNuYXBzaG90LnNlbGVjdGlvbi5jdWVJZCk7XG4gIGNvbnN0IGN1ZSA9IHNlY3Rpb24udGV4dC5jdWVzW2N1ZUluZGV4XTtcbiAgaWYgKCFjdWUpIHJldHVybiA8U2VjdGlvbkluc3BlY3RvciBzdG9yZT17c3RvcmV9IHNuYXBzaG90PXtzbmFwc2hvdH0gc2VjdGlvbj17c2VjdGlvbn0gLz47XG4gIGNvbnN0IHVwZGF0ZSA9IChmaWVsZCwgdmFsdWUpID0+IHN0b3JlLmNvbW1pdChgRWRpdCBDdWUgJHtmaWVsZH1gLCAoZHJhZnQpID0+IHtcbiAgICBkcmFmdC5zZWN0aW9uc1tzZWN0aW9uSW5kZXhdLnRleHQuY3Vlc1tjdWVJbmRleF1bZmllbGRdID0gdmFsdWU7XG4gIH0sIHsgY29hbGVzY2VLZXk6IGBjdWU6JHtjdWUuaWR9OiR7ZmllbGR9YCwgc2VsZWN0aW9uOiBzbmFwc2hvdC5zZWxlY3Rpb24gfSk7XG4gIGNvbnN0IHJlbW92ZSA9ICgpID0+IHN0b3JlLmNvbW1pdCgnRGVsZXRlIHRleHQgQ3VlJywgKGRyYWZ0KSA9PiB7XG4gICAgZHJhZnQuc2VjdGlvbnNbc2VjdGlvbkluZGV4XS50ZXh0LmN1ZXMuc3BsaWNlKGN1ZUluZGV4LCAxKTtcbiAgfSwgeyBzZWxlY3Rpb246IHsgdHlwZTogJ3NlY3Rpb24nLCBzZWN0aW9uSWQ6IHNlY3Rpb24uaWQgfSB9KTtcbiAgY29uc3QgdGltaW5nQm91bmRzID0gZ2V0QWJvdXROYXJyYXRpdmVDdWVUaW1pbmdCb3VuZHMoY3VlKTtcbiAgY29uc3QgbW90aW9uSW50ZXJ2YWwgPSBnZXRBYm91dE5hcnJhdGl2ZUN1ZU1vdGlvbkludGVydmFsKGN1ZSwgc25hcHNob3QuZG9jdW1lbnQuZ2xvYmFscy50ZXh0TW90aW9uKTtcbiAgY29uc3QgbW92ZW1lbnQgPSBnZXRBYm91dE5hcnJhdGl2ZUN1ZU1vdmVtZW50KGN1ZSk7XG4gIGNvbnN0IG1vdmVDdWUgPSAocGVyY2VudCkgPT4gc3RvcmUuY29tbWl0KCdNb3ZlIHRleHQgQ3VlJywgKGRyYWZ0KSA9PiB7XG4gICAgY29uc3QgdGFyZ2V0ID0gZHJhZnQuc2VjdGlvbnNbc2VjdGlvbkluZGV4XS50ZXh0LmN1ZXNbY3VlSW5kZXhdO1xuICAgIE9iamVjdC5hc3NpZ24odGFyZ2V0LCBtb3ZlQWJvdXROYXJyYXRpdmVDdWVUaW1pbmcodGFyZ2V0LCBwZXJjZW50IC8gMTAwKSk7XG4gIH0sIHsgY29hbGVzY2VLZXk6IGBjdWU6JHtjdWUuaWR9OnRpbWluZ2AsIHNlbGVjdGlvbjogeyAuLi5zbmFwc2hvdC5zZWxlY3Rpb24sIGtleVBhcnQ6ICdmb2N1cycgfSB9KTtcbiAgY29uc3QgdXBkYXRlTW92ZW1lbnQgPSAobW9kZSkgPT4gc3RvcmUuY29tbWl0KCdDaGFuZ2UgdGV4dCBtb3ZlbWVudCcsIChkcmFmdCkgPT4ge1xuICAgIGNvbnN0IHRhcmdldCA9IGRyYWZ0LnNlY3Rpb25zW3NlY3Rpb25JbmRleF0udGV4dC5jdWVzW2N1ZUluZGV4XTtcbiAgICB0YXJnZXQubW90aW9uID0geyAuLi50YXJnZXQubW90aW9uLCBtb2RlIH07XG4gIH0sIHsgc2VsZWN0aW9uOiBzbmFwc2hvdC5zZWxlY3Rpb24gfSk7XG4gIHJldHVybiAoXG4gICAgPD5cbiAgICAgIDxoZWFkZXI+PHNwYW4+VGV4dCBDdWU8L3NwYW4+PHN0cm9uZz57Y3VlLmlkfTwvc3Ryb25nPjwvaGVhZGVyPlxuICAgICAge3NlbGVjdGVkTWVtYmVycy5sZW5ndGggPiAxID8gKFxuICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cImFib3V0LWVkaXRvci1ncm91cC1zdW1tYXJ5XCI+XG4gICAgICAgICAgPHN0cm9uZz57c2VsZWN0ZWRNZW1iZXJzLmxlbmd0aH0gdGl0bGVzIHNlbGVjdGVkPC9zdHJvbmc+XG4gICAgICAgICAgPG9sPntzZWxlY3RlZE1lbWJlcnMubWFwKChtZW1iZXIpID0+IHtcbiAgICAgICAgICAgIGNvbnN0IG1lbWJlclNlY3Rpb24gPSBzbmFwc2hvdC5kb2N1bWVudC5zZWN0aW9ucy5maW5kKChpdGVtKSA9PiBpdGVtLmlkID09PSBtZW1iZXIuc2VjdGlvbklkKTtcbiAgICAgICAgICAgIGNvbnN0IG1lbWJlckN1ZSA9IG1lbWJlclNlY3Rpb24/LnRleHQ/LmN1ZXM/LmZpbmQoKGl0ZW0pID0+IGl0ZW0uaWQgPT09IG1lbWJlci5jdWVJZCk7XG4gICAgICAgICAgICByZXR1cm4gPGxpIGtleT17YCR7bWVtYmVyLnNlY3Rpb25JZH06JHttZW1iZXIuY3VlSWR9YH0+PHNwYW4+e21lbWJlclNlY3Rpb24/LmxhYmVsfTwvc3Bhbj57bWVtYmVyQ3VlPy50ZXh0fTwvbGk+O1xuICAgICAgICAgIH0pfTwvb2w+XG4gICAgICAgICAgPGJ1dHRvbiB0eXBlPVwiYnV0dG9uXCIgb25DbGljaz17KCkgPT4gc3RvcmUuc2V0U2VsZWN0aW9uKHsgdHlwZTogJ2N1ZScsIHNlY3Rpb25JZDogc2VjdGlvbi5pZCwgY3VlSWQ6IGN1ZS5pZCwga2V5UGFydDogJ2ZvY3VzJyB9KX0+S2VlcCBwcmltYXJ5IG9ubHk8L2J1dHRvbj5cbiAgICAgICAgPC9kaXY+XG4gICAgICApIDogbnVsbH1cbiAgICAgIDxwIGNsYXNzTmFtZT1cImFib3V0LWVkaXRvci1oZWxwXCI+RHJhZyB0aGUgcGluayB0aW1pbmcgbWFya2VyIGFueXdoZXJlIGZyb20gMOKAkzEwMCUgb2YgaXRzIFNlY3Rpb24uIFRoaXMgbW92ZXMgdGhlIHRpdGxlJ3MgZm9jdXMgdGltZSBvbmx5LiBJdHMgdHJhdmVsIGR1cmF0aW9uLCBzcGVlZCwgYmx1ciwgYW5kIGluL291dCBjYWRlbmNlIHJlbWFpbiBjb250cm9sbGVkIGdsb2JhbGx5IHVuZGVyIFNwYXRpYWwgdGl0bGVzLjwvcD5cbiAgICAgIDxQcm9wZXJ0eSBsYWJlbD1cIlN0YXRlbWVudFwiPjx0ZXh0YXJlYSByb3dzPVwiN1wiIHZhbHVlPXtjdWUudGV4dH0gb25DaGFuZ2U9eyhldmVudCkgPT4gdXBkYXRlKCd0ZXh0JywgZXZlbnQudGFyZ2V0LnZhbHVlKX0gLz48L1Byb3BlcnR5PlxuICAgICAgPFByb3BlcnR5IGxhYmVsPVwiTW92ZW1lbnRcIj48c2VsZWN0IHZhbHVlPXttb3ZlbWVudH0gb25DaGFuZ2U9eyhldmVudCkgPT4gdXBkYXRlTW92ZW1lbnQoZXZlbnQudGFyZ2V0LnZhbHVlKX0+PG9wdGlvbiB2YWx1ZT1cInNwYXRpYWxcIj5TcGF0aWFsIHRyYXZlbDwvb3B0aW9uPjxvcHRpb24gdmFsdWU9XCJ2ZXJ0aWNhbFwiPlZlcnRpY2FsIHNjcm9sbDwvb3B0aW9uPjwvc2VsZWN0PjwvUHJvcGVydHk+XG4gICAgICA8TnVtYmVyUHJvcGVydHlcbiAgICAgICAgbGFiZWw9XCJQb3NpdGlvblwiXG4gICAgICAgIHZhbHVlPXtOdW1iZXIoKGN1ZS5ob2xkICogMTAwKS50b0ZpeGVkKDEpKX1cbiAgICAgICAgbWluPXtOdW1iZXIoKHRpbWluZ0JvdW5kcy5taW4gKiAxMDApLnRvRml4ZWQoMSkpfVxuICAgICAgICBtYXg9e051bWJlcigodGltaW5nQm91bmRzLm1heCAqIDEwMCkudG9GaXhlZCgxKSl9XG4gICAgICAgIHN0ZXA9ezAuNX1cbiAgICAgICAgdW5pdD1cIiVcIlxuICAgICAgICBkaXNhYmxlZD17dGltaW5nQm91bmRzLm1pbiA9PT0gdGltaW5nQm91bmRzLm1heH1cbiAgICAgICAgb25DaGFuZ2U9e21vdmVDdWV9XG4gICAgICAvPlxuICAgICAge21vdmVtZW50ID09PSAnc3BhdGlhbCcgPyAoXG4gICAgICAgIDw+XG4gICAgICAgICAgPFByb3BlcnR5IGxhYmVsPVwiQXV0byB0cmF2ZWxcIj48b3V0cHV0IGNsYXNzTmFtZT1cImFib3V0LWVkaXRvci1yZWFkb3V0XCI+e01hdGgucm91bmQobW90aW9uSW50ZXJ2YWwuc3RhcnQgKiAxMDApfeKAk3tNYXRoLnJvdW5kKG1vdGlvbkludGVydmFsLmVuZCAqIDEwMCl9JTwvb3V0cHV0PjwvUHJvcGVydHk+XG4gICAgICAgICAgPFByb3BlcnR5IGxhYmVsPVwiTW90aW9uIHByZXNldFwiPjxzZWxlY3QgdmFsdWU9e2N1ZS5wcmVzZXR9IG9uQ2hhbmdlPXsoZXZlbnQpID0+IHVwZGF0ZSgncHJlc2V0JywgZXZlbnQudGFyZ2V0LnZhbHVlKX0+PG9wdGlvbiB2YWx1ZT1cInRyYXZlbGxpbmctdGl0bGUtdjFcIj5UcmF2ZWxsaW5nIHRpdGxlPC9vcHRpb24+PG9wdGlvbiB2YWx1ZT1cIm9wZW5lci12MVwiPk9wZW5lcjwvb3B0aW9uPjxvcHRpb24gdmFsdWU9XCJmaW5hbGUtdjFcIj5GaW5hbGU8L29wdGlvbj48L3NlbGVjdD48L1Byb3BlcnR5PlxuICAgICAgICA8Lz5cbiAgICAgICkgOiA8UHJvcGVydHkgbGFiZWw9XCJSZXZlYWxcIj48b3V0cHV0IGNsYXNzTmFtZT1cImFib3V0LWVkaXRvci1yZWFkb3V0XCI+RWRpdG9yaWFsIHZlcnRpY2FsIHNjcm9sbDwvb3V0cHV0PjwvUHJvcGVydHk+fVxuICAgICAgPEN1ZVJoeXRobUFuZFJldXNlIHN0b3JlPXtzdG9yZX0gc25hcHNob3Q9e3NuYXBzaG90fSBjbGlwYm9hcmQ9e2NsaXBib2FyZH0gc2V0Q2xpcGJvYXJkPXtzZXRDbGlwYm9hcmR9IC8+XG4gICAgICA8YnV0dG9uIHR5cGU9XCJidXR0b25cIiBjbGFzc05hbWU9XCJhYm91dC1lZGl0b3ItZGFuZ2VyXCIgZGlzYWJsZWQ9e3NlY3Rpb24udHlwZSA9PT0gJ2ZpbmFsZSd9IG9uQ2xpY2s9e3JlbW92ZX0+RGVsZXRlIEN1ZTwvYnV0dG9uPlxuICAgIDwvPlxuICApO1xufVxuXG5mdW5jdGlvbiBEaXNjaXBsaW5lUmV2ZWFsSW5zcGVjdG9yKHsgc3RvcmUsIHNuYXBzaG90LCBzZWN0aW9uIH0pIHtcbiAgY29uc3Qgc2VjdGlvbkluZGV4ID0gZ2V0U2VjdGlvbkluZGV4KHNuYXBzaG90LmRvY3VtZW50LCBzZWN0aW9uLmlkKTtcbiAgY29uc3QgcmV2ZWFsID0gc2VjdGlvbi50ZXh0LmRpc2NpcGxpbmVSZXZlYWw7XG4gIGlmICghcmV2ZWFsKSByZXR1cm4gPFNlY3Rpb25JbnNwZWN0b3Igc3RvcmU9e3N0b3JlfSBzbmFwc2hvdD17c25hcHNob3R9IHNlY3Rpb249e3NlY3Rpb259IC8+O1xuICBjb25zdCB1cGRhdGUgPSAobGFiZWwsIG11dGF0ZSwgY29hbGVzY2VLZXkgPSBudWxsKSA9PiBzdG9yZS5jb21taXQobGFiZWwsIChkcmFmdCkgPT4ge1xuICAgIG11dGF0ZShkcmFmdC5zZWN0aW9uc1tzZWN0aW9uSW5kZXhdLnRleHQuZGlzY2lwbGluZVJldmVhbCk7XG4gIH0sIHsgY29hbGVzY2VLZXksIHNlbGVjdGlvbjogc25hcHNob3Quc2VsZWN0aW9uIH0pO1xuICBjb25zdCBvY2N1cGllZCA9ICgocmV2ZWFsLml0ZW1zLmxlbmd0aCAtIDEpICogcmV2ZWFsLnN0YWdnZXIpICsgcmV2ZWFsLmxhYmVsRHVyYXRpb24gKyByZXZlYWwuaG9sZDtcbiAgY29uc3QgbGltaXRzRm9yID0gKGNvbnRyb2wpID0+IHtcbiAgICBpZiAoY29udHJvbC5pZCA9PT0gJ3N0YXJ0JykgcmV0dXJuIHsgbWluOiBjb250cm9sLm1pbiwgbWF4OiBNYXRoLm1heChjb250cm9sLm1pbiwgcmV2ZWFsLmVuZCAtIG9jY3VwaWVkKSB9O1xuICAgIGlmIChjb250cm9sLmlkID09PSAnZW5kJykgcmV0dXJuIHsgbWluOiBNYXRoLm1pbihjb250cm9sLm1heCwgcmV2ZWFsLnN0YXJ0ICsgb2NjdXBpZWQpLCBtYXg6IGNvbnRyb2wubWF4IH07XG4gICAgaWYgKGNvbnRyb2wuaWQgPT09ICdzdGFnZ2VyJykgcmV0dXJuIHtcbiAgICAgIG1pbjogY29udHJvbC5taW4sXG4gICAgICBtYXg6IE1hdGgubWF4KGNvbnRyb2wubWluLCAocmV2ZWFsLmVuZCAtIHJldmVhbC5zdGFydCAtIHJldmVhbC5sYWJlbER1cmF0aW9uIC0gcmV2ZWFsLmhvbGQpIC8gTWF0aC5tYXgoMSwgcmV2ZWFsLml0ZW1zLmxlbmd0aCAtIDEpKSxcbiAgICB9O1xuICAgIGlmIChjb250cm9sLmlkID09PSAnbGFiZWxEdXJhdGlvbicpIHJldHVybiB7XG4gICAgICBtaW46IGNvbnRyb2wubWluLFxuICAgICAgbWF4OiBNYXRoLm1heChjb250cm9sLm1pbiwgcmV2ZWFsLmVuZCAtIHJldmVhbC5zdGFydCAtICgocmV2ZWFsLml0ZW1zLmxlbmd0aCAtIDEpICogcmV2ZWFsLnN0YWdnZXIpIC0gcmV2ZWFsLmhvbGQpLFxuICAgIH07XG4gICAgaWYgKGNvbnRyb2wuaWQgPT09ICdob2xkJykgcmV0dXJuIHtcbiAgICAgIG1pbjogY29udHJvbC5taW4sXG4gICAgICBtYXg6IE1hdGgubWF4KGNvbnRyb2wubWluLCByZXZlYWwuZW5kIC0gcmV2ZWFsLnN0YXJ0IC0gKChyZXZlYWwuaXRlbXMubGVuZ3RoIC0gMSkgKiByZXZlYWwuc3RhZ2dlcikgLSByZXZlYWwubGFiZWxEdXJhdGlvbiksXG4gICAgfTtcbiAgICByZXR1cm4geyBtaW46IGNvbnRyb2wubWluLCBtYXg6IGNvbnRyb2wubWF4IH07XG4gIH07XG4gIHJldHVybiAoXG4gICAgPD5cbiAgICAgIDxoZWFkZXI+PHNwYW4+VGV4dCBzZXF1ZW5jZTwvc3Bhbj48c3Ryb25nPkRpc2NpcGxpbmUgcmV2ZWFsPC9zdHJvbmc+PC9oZWFkZXI+XG4gICAgICA8cCBjbGFzc05hbWU9XCJhYm91dC1lZGl0b3ItaGVscFwiPk9uZSBjbGlwIGNvbnRyb2xzIHRoZSBjb21wbGV0ZSBzaXgtcG9pbnQgc2VxdWVuY2UuIERyYWcgaXRzIHN0cmlwZWQgYmxvY2sgaW4gdGhlIFRleHQgbGFuZSB0byBtb3ZlIGV2ZXJ5IHJldmVhbCB0b2dldGhlci48L3A+XG4gICAgICA8ZGV0YWlscyBvcGVuPjxzdW1tYXJ5PlJldmVhbCBjaG9yZW9ncmFwaHk8L3N1bW1hcnk+XG4gICAgICAgIHtBQk9VVF9OQVJSQVRJVkVfRElTQ0lQTElORV9SRVZFQUxfQ09OVFJPTFMubWFwKChjb250cm9sKSA9PiB7XG4gICAgICAgICAgY29uc3QgbGltaXRzID0gbGltaXRzRm9yKGNvbnRyb2wpO1xuICAgICAgICAgIHJldHVybiAoXG4gICAgICAgICAgICA8TnVtYmVyUHJvcGVydHlcbiAgICAgICAgICAgICAga2V5PXtjb250cm9sLmlkfVxuICAgICAgICAgICAgICBsYWJlbD17Y29udHJvbC5sYWJlbH1cbiAgICAgICAgICAgICAgdmFsdWU9e3JldmVhbFtjb250cm9sLmlkXX1cbiAgICAgICAgICAgICAgbWluPXtsaW1pdHMubWlufVxuICAgICAgICAgICAgICBtYXg9e2xpbWl0cy5tYXh9XG4gICAgICAgICAgICAgIHN0ZXA9e2NvbnRyb2wuc3RlcH1cbiAgICAgICAgICAgICAgdW5pdD17Y29udHJvbC51bml0fVxuICAgICAgICAgICAgICBvbkNoYW5nZT17KHZhbHVlKSA9PiB1cGRhdGUoYENoYW5nZSAke2NvbnRyb2wubGFiZWx9YCwgKGRyYWZ0KSA9PiB7IGRyYWZ0W2NvbnRyb2wuaWRdID0gdmFsdWU7IH0sIGBkaXNjaXBsaW5lLXJldmVhbDoke3NlY3Rpb24uaWR9OiR7Y29udHJvbC5pZH1gKX1cbiAgICAgICAgICAgIC8+XG4gICAgICAgICAgKTtcbiAgICAgICAgfSl9XG4gICAgICA8L2RldGFpbHM+XG4gICAgICA8ZGV0YWlscyBvcGVuPjxzdW1tYXJ5PlJldmVhbCBvcmRlciBhbmQgbGFiZWxzPC9zdW1tYXJ5PlxuICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cImFib3V0LWVkaXRvci1kaXNjaXBsaW5lLWl0ZW1zXCI+XG4gICAgICAgICAge3JldmVhbC5pdGVtcy5tYXAoKGl0ZW0sIGl0ZW1JbmRleCkgPT4gKFxuICAgICAgICAgICAgPGRpdiBjbGFzc05hbWU9XCJhYm91dC1lZGl0b3ItZGlzY2lwbGluZS1pdGVtXCIga2V5PXtpdGVtLmdyb3VwfT5cbiAgICAgICAgICAgICAgPGNvZGU+e1N0cmluZyhpdGVtSW5kZXggKyAxKS5wYWRTdGFydCgyLCAnMCcpfTwvY29kZT5cbiAgICAgICAgICAgICAgPGlucHV0IHZhbHVlPXtpdGVtLmxhYmVsfSBhcmlhLWxhYmVsPXtgRGlzY2lwbGluZSAke2l0ZW1JbmRleCArIDF9IGxhYmVsYH0gb25DaGFuZ2U9eyhldmVudCkgPT4gdXBkYXRlKCdFZGl0IGRpc2NpcGxpbmUgbGFiZWwnLCAoZHJhZnQpID0+IHsgZHJhZnQuaXRlbXNbaXRlbUluZGV4XS5sYWJlbCA9IGV2ZW50LnRhcmdldC52YWx1ZTsgfSwgYGRpc2NpcGxpbmUtcmV2ZWFsOiR7c2VjdGlvbi5pZH06aXRlbToke2l0ZW0uZ3JvdXB9OmxhYmVsYCl9IC8+XG4gICAgICAgICAgICAgIDxkaXYgY2xhc3NOYW1lPVwiYWJvdXQtZWRpdG9yLWRpc2NpcGxpbmUtcGFsZXR0ZVwiIHRpdGxlPXtgJHtpdGVtLmxhYmVsfSB1c2VzIHRoZSBIb21lIHNpbXVsYXRpb24gJHtESVNDSVBMSU5FX0JBTExfVE9LRU5fQllfR1JPVVBbaXRlbS5ncm91cF19YH0+XG4gICAgICAgICAgICAgICAgPGkgc3R5bGU9e3sgYmFja2dyb3VuZDogYHZhcigke0RJU0NJUExJTkVfQkFMTF9UT0tFTl9CWV9HUk9VUFtpdGVtLmdyb3VwXX0pYCB9fSAvPlxuICAgICAgICAgICAgICAgIDxjb2RlPntESVNDSVBMSU5FX0JBTExfVE9LRU5fQllfR1JPVVBbaXRlbS5ncm91cF19PC9jb2RlPlxuICAgICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgICAgPHNwYW4+XG4gICAgICAgICAgICAgICAgPGJ1dHRvbiB0eXBlPVwiYnV0dG9uXCIgZGlzYWJsZWQ9e2l0ZW1JbmRleCA9PT0gMH0gYXJpYS1sYWJlbD17YFJldmVhbCAke2l0ZW0ubGFiZWx9IGVhcmxpZXJgfSBvbkNsaWNrPXsoKSA9PiB1cGRhdGUoJ1Jlb3JkZXIgZGlzY2lwbGluZSByZXZlYWwnLCAoZHJhZnQpID0+IHsgY29uc3QgW21vdmVkXSA9IGRyYWZ0Lml0ZW1zLnNwbGljZShpdGVtSW5kZXgsIDEpOyBkcmFmdC5pdGVtcy5zcGxpY2UoaXRlbUluZGV4IC0gMSwgMCwgbW92ZWQpOyB9KX0+4oaRPC9idXR0b24+XG4gICAgICAgICAgICAgICAgPGJ1dHRvbiB0eXBlPVwiYnV0dG9uXCIgZGlzYWJsZWQ9e2l0ZW1JbmRleCA9PT0gcmV2ZWFsLml0ZW1zLmxlbmd0aCAtIDF9IGFyaWEtbGFiZWw9e2BSZXZlYWwgJHtpdGVtLmxhYmVsfSBsYXRlcmB9IG9uQ2xpY2s9eygpID0+IHVwZGF0ZSgnUmVvcmRlciBkaXNjaXBsaW5lIHJldmVhbCcsIChkcmFmdCkgPT4geyBjb25zdCBbbW92ZWRdID0gZHJhZnQuaXRlbXMuc3BsaWNlKGl0ZW1JbmRleCwgMSk7IGRyYWZ0Lml0ZW1zLnNwbGljZShpdGVtSW5kZXggKyAxLCAwLCBtb3ZlZCk7IH0pfT7ihpM8L2J1dHRvbj5cbiAgICAgICAgICAgICAgPC9zcGFuPlxuICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgKSl9XG4gICAgICAgIDwvZGl2PlxuICAgICAgPC9kZXRhaWxzPlxuICAgICAgPHAgY2xhc3NOYW1lPVwiYWJvdXQtZWRpdG9yLWhlbHBcIj5UaGUgc2l4IHBvaW50cyBwZXJzaXN0IGFmdGVyIHRoZSBsYWJlbHMgbGVhdmUuIEFuIGVkaXRvcmlhbCBibG9jayBtYXJrZWQg4oCcUmVjb25uZWN0IHBvaW50IGdyaWTigJ0gcmVzdG9yZXMgdGhlIHN1cnJvdW5kaW5nIGdyaWQgYXMgdGhhdCBwYXJhZ3JhcGggZW50ZXJzLjwvcD5cbiAgICA8Lz5cbiAgKTtcbn1cblxuZnVuY3Rpb24gQ2FtZXJhSW5zcGVjdG9yKHsgc3RvcmUsIHNuYXBzaG90LCBzZWN0aW9uIH0pIHtcbiAgY29uc3Qgc2VjdGlvbkluZGV4ID0gZ2V0U2VjdGlvbkluZGV4KHNuYXBzaG90LmRvY3VtZW50LCBzZWN0aW9uLmlkKTtcbiAgY29uc3Qga2V5SW5kZXggPSBzbmFwc2hvdC5zZWxlY3Rpb24ua2V5SW5kZXg7XG4gIGNvbnN0IHNlbGVjdGVkS2V5ID0gc2VjdGlvbi5jYW1lcmEua2V5c1trZXlJbmRleF07XG4gIGNvbnN0IGtleSA9IHNlbGVjdGVkS2V5ICYmIHNlbGVjdGVkS2V5LmF0ID4gMCAmJiBzZWxlY3RlZEtleS5hdCA8IDEgPyBzZWxlY3RlZEtleSA6IG51bGw7XG4gIGNvbnN0IGxvY2FsID0gZ2V0TG9jYWxQcm9ncmVzcyhzbmFwc2hvdC5jb21waWxlZFBsYW4sIHNlY3Rpb24sIHNuYXBzaG90LnRyYW5zcG9ydC5zdG9yeVdVKTtcbiAgY29uc3QgdGFyZ2V0QXQgPSBNYXRoLm1pbigwLjk5NSwgTWF0aC5tYXgoMC4wMDUsIHNuYXBBYm91dE5hcnJhdGl2ZVRpbWVsaW5lVmFsdWUobG9jYWwpKSk7XG4gIGNvbnN0IGFwcGx5UHJlc2V0ID0gKHByZXNldCkgPT4gc3RvcmUuY29tbWl0KGBBcHBseSAke3ByZXNldH0gY2FtZXJhIHJlY2lwZWAsIChkcmFmdCkgPT4ge1xuICAgIGNvbnN0IHJlY2lwZXMgPSB7XG4gICAgICBQdXNoOiBbXG4gICAgICAgIHsgYXQ6IDAsIG9mZnNldDogWzAsIDAsIDBdLCBsb29rQXRPZmZzZXQ6IFswLCAwLCAtMV0sIGZvdjogNDgsIHJvbGw6IDAsIGVhc2luZzogJ3Ntb290aHN0ZXAnIH0sXG4gICAgICAgIHsgYXQ6IDEsIG9mZnNldDogWzAsIDAsIC0xLjJdLCBsb29rQXRPZmZzZXQ6IFswLCAwLCAtMV0sIGZvdjogNDUsIHJvbGw6IDAsIGVhc2luZzogJ3Ntb290aHN0ZXAnIH0sXG4gICAgICBdLFxuICAgICAgR2xpZGU6IFtcbiAgICAgICAgeyBhdDogMCwgb2Zmc2V0OiBbLTAuOCwgMCwgMF0sIGxvb2tBdE9mZnNldDogWzAuNCwgMCwgLTFdLCBmb3Y6IDQ4LCByb2xsOiAwLCBlYXNpbmc6ICdzbW9vdGhzdGVwJyB9LFxuICAgICAgICB7IGF0OiAxLCBvZmZzZXQ6IFswLjgsIDAsIDBdLCBsb29rQXRPZmZzZXQ6IFstMC40LCAwLCAtMV0sIGZvdjogNDgsIHJvbGw6IDAsIGVhc2luZzogJ3Ntb290aHN0ZXAnIH0sXG4gICAgICBdLFxuICAgICAgT3JiaXQ6IFtcbiAgICAgICAgeyBhdDogMCwgb2Zmc2V0OiBbLTAuNywgMCwgMF0sIGxvb2tBdE9mZnNldDogWzAuNywgMCwgLTFdLCBmb3Y6IDQ4LCByb2xsOiAtMC4wOCwgZWFzaW5nOiAnc21vb3Roc3RlcCcgfSxcbiAgICAgICAgeyBhdDogMC41LCBvZmZzZXQ6IFswLjcsIDAuMjUsIDBdLCBsb29rQXRPZmZzZXQ6IFstMC43LCAtMC4xLCAtMV0sIGZvdjogNDgsIHJvbGw6IDAuMDgsIGVhc2luZzogJ3Ntb290aHN0ZXAnIH0sXG4gICAgICAgIHsgYXQ6IDEsIG9mZnNldDogWzAsIDAsIDBdLCBsb29rQXRPZmZzZXQ6IFswLCAwLCAtMV0sIGZvdjogNDgsIHJvbGw6IDAsIGVhc2luZzogJ3Ntb290aHN0ZXAnIH0sXG4gICAgICBdLFxuICAgICAgUmV2ZWFsOiBbXG4gICAgICAgIHsgYXQ6IDAsIG9mZnNldDogWzAsIC0wLjQ1LCAwLjVdLCBsb29rQXRPZmZzZXQ6IFswLCAwLjMsIC0xXSwgZm92OiA1Niwgcm9sbDogMCwgZWFzaW5nOiAnc21vb3Roc3RlcCcgfSxcbiAgICAgICAgeyBhdDogMSwgb2Zmc2V0OiBbMCwgMCwgMF0sIGxvb2tBdE9mZnNldDogWzAsIDAsIC0xXSwgZm92OiA0Niwgcm9sbDogMCwgZWFzaW5nOiAnc21vb3Roc3RlcCcgfSxcbiAgICAgIF0sXG4gICAgICBSZXNvbHZlOiBbXG4gICAgICAgIHsgYXQ6IDAsIG9mZnNldDogWzAuMywgMC4yLCAwXSwgbG9va0F0T2Zmc2V0OiBbLTAuMywgLTAuMiwgLTFdLCBmb3Y6IDUyLCByb2xsOiAwLjE0LCBlYXNpbmc6ICdzbW9vdGhzdGVwJyB9LFxuICAgICAgICB7IGF0OiAxLCBvZmZzZXQ6IFswLCAwLCAwXSwgbG9va0F0T2Zmc2V0OiBbMCwgMCwgLTFdLCBmb3Y6IDQ4LCByb2xsOiAwLCBlYXNpbmc6ICdzbW9vdGhzdGVwJyB9LFxuICAgICAgXSxcbiAgICB9O1xuICAgIGRyYWZ0LnNlY3Rpb25zW3NlY3Rpb25JbmRleF0uY2FtZXJhLmtleXMgPSByZWNpcGVzW3ByZXNldF07XG4gICAgYnJpZGdlQ2FtZXJhU2VjdGlvbihkcmFmdCwgc2VjdGlvbkluZGV4KTtcbiAgfSwgeyBzZWxlY3Rpb246IHsgdHlwZTogJ3NlY3Rpb24nLCBzZWN0aW9uSWQ6IHNlY3Rpb24uaWQgfSB9KTtcbiAgY29uc3QgZXhpc3RpbmdLZXlBdFBsYXloZWFkID0gc2VjdGlvbi5jYW1lcmEua2V5cy5maW5kSW5kZXgoKGl0ZW0pID0+IChcbiAgICBpdGVtLmF0ID4gMCAmJiBpdGVtLmF0IDwgMSAmJiBNYXRoLmFicyhpdGVtLmF0IC0gdGFyZ2V0QXQpIDwgMC4wMDI1XG4gICkpO1xuICBjb25zdCBzZXRLZXkgPSAoKSA9PiB7XG4gICAgaWYgKGV4aXN0aW5nS2V5QXRQbGF5aGVhZCA+PSAwKSB7XG4gICAgICBzdG9yZS5zZXRTZWxlY3Rpb24oeyB0eXBlOiAnY2FtZXJhLWtleScsIHNlY3Rpb25JZDogc2VjdGlvbi5pZCwga2V5SW5kZXg6IGV4aXN0aW5nS2V5QXRQbGF5aGVhZCB9KTtcbiAgICAgIHJldHVybjtcbiAgICB9XG4gICAgY29uc3QgaW5zZXJ0aW9uSW5kZXggPSBzZWN0aW9uLmNhbWVyYS5rZXlzLmZpbmRJbmRleCgoaXRlbSkgPT4gaXRlbS5hdCA+IHRhcmdldEF0KTtcbiAgICBjb25zdCBzZWxlY3RlZEtleUluZGV4ID0gaW5zZXJ0aW9uSW5kZXggPCAwID8gc2VjdGlvbi5jYW1lcmEua2V5cy5sZW5ndGggOiBpbnNlcnRpb25JbmRleDtcbiAgICBjb25zdCBzYW1wbGVkID0gc2FtcGxlQWJvdXROYXJyYXRpdmVQbGFuKHNuYXBzaG90LmNvbXBpbGVkUGxhbiwgc25hcHNob3QudHJhbnNwb3J0LnN0b3J5V1UpO1xuICAgIGNvbnN0IGJhc2VaID0gc25hcHNob3QuZG9jdW1lbnQuZ2xvYmFscy5jYW1lcmEuc3RhcnRaIC0gKHNuYXBzaG90LnRyYW5zcG9ydC5zdG9yeVdVICogc2FtcGxlZC5jYW1lcmEuY2FkZW5jZSk7XG4gICAgY29uc3QgbmV3S2V5ID0ge1xuICAgICAgYXQ6IHRhcmdldEF0LFxuICAgICAgb2Zmc2V0OiBbc2FtcGxlZC5jYW1lcmEucG9zaXRpb25bMF0sIHNhbXBsZWQuY2FtZXJhLnBvc2l0aW9uWzFdLCBzYW1wbGVkLmNhbWVyYS5wb3NpdGlvblsyXSAtIGJhc2VaXSxcbiAgICAgIGxvb2tBdE9mZnNldDogc2FtcGxlZC5jYW1lcmEudGFyZ2V0Lm1hcCgodmFsdWUsIGF4aXMpID0+IHZhbHVlIC0gc2FtcGxlZC5jYW1lcmEucG9zaXRpb25bYXhpc10pLFxuICAgICAgZm92OiBzYW1wbGVkLmNhbWVyYS5mb3YsXG4gICAgICByb2xsOiBzYW1wbGVkLmNhbWVyYS5yb2xsLFxuICAgICAgZWFzaW5nOiAnc21vb3Roc3RlcCcsXG4gICAgfTtcbiAgICBzdG9yZS5jb21taXQoJ1NldCBjYW1lcmEga2V5JywgKGRyYWZ0KSA9PiB7XG4gICAgICBkcmFmdC5zZWN0aW9uc1tzZWN0aW9uSW5kZXhdLmNhbWVyYS5rZXlzLnB1c2gobmV3S2V5KTtcbiAgICAgIGRyYWZ0LnNlY3Rpb25zW3NlY3Rpb25JbmRleF0uY2FtZXJhLmtleXMuc29ydCgoYSwgYikgPT4gYS5hdCAtIGIuYXQpO1xuICAgIH0sIHsgc2VsZWN0aW9uOiB7IHR5cGU6ICdjYW1lcmEta2V5Jywgc2VjdGlvbklkOiBzZWN0aW9uLmlkLCBrZXlJbmRleDogc2VsZWN0ZWRLZXlJbmRleCB9IH0pO1xuICB9O1xuICBjb25zdCByZWNpcGVzID0gPGRpdiBjbGFzc05hbWU9XCJhYm91dC1lZGl0b3ItY2FtZXJhLXJlY2lwZXNcIj57WydQdXNoJywgJ0dsaWRlJywgJ09yYml0JywgJ1JldmVhbCcsICdSZXNvbHZlJ10ubWFwKChuYW1lKSA9PiA8YnV0dG9uIHR5cGU9XCJidXR0b25cIiBrZXk9e25hbWV9IG9uQ2xpY2s9eygpID0+IGFwcGx5UHJlc2V0KG5hbWUpfT57bmFtZX08L2J1dHRvbj4pfTwvZGl2PjtcbiAgaWYgKCFrZXkpIHtcbiAgICByZXR1cm4gPD48aGVhZGVyPjxzcGFuPkNhbWVyYSB0cmFjazwvc3Bhbj48c3Ryb25nPkVkaXRpbmcgU2VjdGlvbiBiYXNlPC9zdHJvbmc+PC9oZWFkZXI+PHAgY2xhc3NOYW1lPVwiYWJvdXQtZWRpdG9yLWhlbHBcIj5UaGUgZG9sbHkgYW5kIFNlY3Rpb24gam9pbnMgYXJlIGNvbnRpbnVvdXMgYXV0b21hdGljYWxseS4gQWRkIHZpc2libGUga2V5cyBvbmx5IHdoZXJlIHRoZSBmcmFtaW5nLCBhaW0sIHJvbGwsIG9yIGxlbnMgc2hvdWxkIGNoYW5nZS48L3A+e3JlY2lwZXN9PGJ1dHRvbiB0eXBlPVwiYnV0dG9uXCIgY2xhc3NOYW1lPVwiYWJvdXQtZWRpdG9yLXdpZGUtYWN0aW9uXCIgb25DbGljaz17c2V0S2V5fT5TZXQgY2FtZXJhIGtleSBhdCB7Zm9ybWF0Q2FtZXJhUGVyY2VudCh0YXJnZXRBdCl9PC9idXR0b24+PC8+O1xuICB9XG4gIGNvbnN0IHVwZGF0ZSA9IChmaWVsZCwgdmFsdWUpID0+IHN0b3JlLmNvbW1pdChgRWRpdCBjYW1lcmEgJHtmaWVsZH1gLCAoZHJhZnQpID0+IHtcbiAgICBkcmFmdC5zZWN0aW9uc1tzZWN0aW9uSW5kZXhdLmNhbWVyYS5rZXlzW2tleUluZGV4XVtmaWVsZF0gPSBBcnJheS5pc0FycmF5KHZhbHVlKSA/IFsuLi52YWx1ZV0gOiB2YWx1ZTtcbiAgICBpZiAoQ0FNRVJBX1BPU0VfRklFTERTLmhhcyhmaWVsZCkpIGxpbmtDYW1lcmFCb3VuZGFyeShkcmFmdCwgc2VjdGlvbkluZGV4LCBrZXlJbmRleCk7XG4gIH0sIHsgY29hbGVzY2VLZXk6IGBjYW1lcmE6JHtzZWN0aW9uLmlkfToke2tleUluZGV4fToke2ZpZWxkfWAsIHNlbGVjdGlvbjogc25hcHNob3Quc2VsZWN0aW9uIH0pO1xuICBjb25zdCB1cGRhdGVWZWN0b3IgPSAoZmllbGQsIGF4aXMsIHZhbHVlKSA9PiB7XG4gICAgY29uc3QgbmV4dCA9IFsuLi5rZXlbZmllbGRdXTtcbiAgICBuZXh0W2F4aXNdID0gdmFsdWU7XG4gICAgdXBkYXRlKGZpZWxkLCBuZXh0KTtcbiAgfTtcbiAgY29uc3QgdGltaW5nQm91bmRzID0gZ2V0QWJvdXROYXJyYXRpdmVDYW1lcmFLZXlUaW1pbmdCb3VuZHMoc2VjdGlvbi5jYW1lcmEua2V5cywga2V5SW5kZXgpO1xuICBjb25zdCBleHRlbnRGaWVsZCA9IHNuYXBzaG90LnByZXZpZXdQcm9maWxlID09PSAnbW9iaWxlJyA/ICdtb2JpbGVFeHRlbnRXVScgOiAnZXh0ZW50V1UnO1xuICBjb25zdCBleHRlbnRMYWJlbCA9IHNuYXBzaG90LnByZXZpZXdQcm9maWxlID09PSAnbW9iaWxlJyA/ICdNb2JpbGUgbGVuZ3RoJyA6ICdTZWN0aW9uIGxlbmd0aCc7XG4gIGNvbnN0IHVwZGF0ZUV4dGVudCA9ICh2YWx1ZSkgPT4gc3RvcmUuY29tbWl0KCdDaGFuZ2UgU2VjdGlvbiBleHRlbnQnLCAoZHJhZnQpID0+IHtcbiAgICBkcmFmdC5zZWN0aW9uc1tzZWN0aW9uSW5kZXhdW2V4dGVudEZpZWxkXSA9IHZhbHVlO1xuICB9LCB7IGNvYWxlc2NlS2V5OiBgc2VjdGlvbjoke3NlY3Rpb24uaWR9OiR7ZXh0ZW50RmllbGR9YCwgc2VsZWN0aW9uOiBzbmFwc2hvdC5zZWxlY3Rpb24gfSk7XG4gIHJldHVybiAoXG4gICAgPD5cbiAgICAgIDxoZWFkZXI+PHNwYW4+Q2FtZXJhIGtleTwvc3Bhbj48c3Ryb25nPntmb3JtYXRDYW1lcmFQZXJjZW50KGtleS5hdCl9IHRocm91Z2gge3NlY3Rpb24ubGFiZWx9PC9zdHJvbmc+PC9oZWFkZXI+XG4gICAgICB7cmVjaXBlc31cbiAgICAgIDxOdW1iZXJQcm9wZXJ0eVxuICAgICAgICBsYWJlbD1cIlBvc2l0aW9uXCJcbiAgICAgICAgdmFsdWU9e051bWJlcigoa2V5LmF0ICogMTAwKS50b0ZpeGVkKDEpKX1cbiAgICAgICAgbWluPXtOdW1iZXIoKHRpbWluZ0JvdW5kcy5taW4gKiAxMDApLnRvRml4ZWQoMSkpfVxuICAgICAgICBtYXg9e051bWJlcigodGltaW5nQm91bmRzLm1heCAqIDEwMCkudG9GaXhlZCgxKSl9XG4gICAgICAgIHN0ZXA9ezAuNX1cbiAgICAgICAgdW5pdD1cIiVcIlxuICAgICAgICBvbkNoYW5nZT17KHZhbHVlKSA9PiB1cGRhdGUoJ2F0JywgTWF0aC5taW4odGltaW5nQm91bmRzLm1heCwgTWF0aC5tYXgodGltaW5nQm91bmRzLm1pbiwgc25hcEFib3V0TmFycmF0aXZlVGltZWxpbmVWYWx1ZSh2YWx1ZSAvIDEwMCkpKSl9XG4gICAgICAvPlxuICAgICAgPE51bWJlclByb3BlcnR5IGxhYmVsPXtleHRlbnRMYWJlbH0gdmFsdWU9e3NlY3Rpb25bZXh0ZW50RmllbGRdfSBtaW49ezF9IG1heD17OH0gc3RlcD17MC4wNX0gdW5pdD1cIldVXCIgb25DaGFuZ2U9e3VwZGF0ZUV4dGVudH0gLz5cbiAgICAgIHtbJ1ggb2Zmc2V0JywgJ1kgb2Zmc2V0JywgJ0ZvcndhcmQgb2Zmc2V0J10ubWFwKChsYWJlbCwgYXhpcykgPT4gPE51bWJlclByb3BlcnR5IGtleT17bGFiZWx9IGxhYmVsPXtsYWJlbH0gdmFsdWU9e2tleS5vZmZzZXRbYXhpc119IG1pbj17LTh9IG1heD17OH0gc3RlcD17MC4wMn0gdW5pdD1cIldVXCIgb25DaGFuZ2U9eyh2YWx1ZSkgPT4gdXBkYXRlVmVjdG9yKCdvZmZzZXQnLCBheGlzLCB2YWx1ZSl9IC8+KX1cbiAgICAgIHtbJ0FpbSBYJywgJ0FpbSBZJywgJ0FpbSBkZXB0aCddLm1hcCgobGFiZWwsIGF4aXMpID0+IDxOdW1iZXJQcm9wZXJ0eSBrZXk9e2xhYmVsfSBsYWJlbD17bGFiZWx9IHZhbHVlPXtrZXkubG9va0F0T2Zmc2V0W2F4aXNdfSBtaW49ey04fSBtYXg9ezh9IHN0ZXA9ezAuMDJ9IHVuaXQ9XCJXVVwiIG9uQ2hhbmdlPXsodmFsdWUpID0+IHVwZGF0ZVZlY3RvcignbG9va0F0T2Zmc2V0JywgYXhpcywgdmFsdWUpfSAvPil9XG4gICAgICA8TnVtYmVyUHJvcGVydHkgbGFiZWw9XCJGaWVsZCBvZiB2aWV3XCIgdmFsdWU9e2tleS5mb3Z9IG1pbj17MjB9IG1heD17OTB9IHN0ZXA9ezF9IHVuaXQ9XCLCsFwiIG9uQ2hhbmdlPXsodmFsdWUpID0+IHVwZGF0ZSgnZm92JywgdmFsdWUpfSAvPlxuICAgICAgPE51bWJlclByb3BlcnR5IGxhYmVsPVwiUm9sbFwiIHZhbHVlPXtrZXkucm9sbH0gbWluPXstMS4yfSBtYXg9ezEuMn0gc3RlcD17MC4wMX0gdW5pdD1cInJhZFwiIG9uQ2hhbmdlPXsodmFsdWUpID0+IHVwZGF0ZSgncm9sbCcsIHZhbHVlKX0gLz5cbiAgICAgIDxQcm9wZXJ0eSBsYWJlbD1cIkVhc2luZ1wiPjxzZWxlY3QgdmFsdWU9e2tleS5lYXNpbmd9IG9uQ2hhbmdlPXsoZXZlbnQpID0+IHVwZGF0ZSgnZWFzaW5nJywgZXZlbnQudGFyZ2V0LnZhbHVlKX0+PG9wdGlvbiB2YWx1ZT1cInNtb290aHN0ZXBcIj5TbW9vdGhzdGVwPC9vcHRpb24+PG9wdGlvbiB2YWx1ZT1cImVhc2UtaW4tb3V0XCI+RWFzZSBpbiBvdXQ8L29wdGlvbj48L3NlbGVjdD48L1Byb3BlcnR5PlxuICAgICAgPGJ1dHRvbiB0eXBlPVwiYnV0dG9uXCIgY2xhc3NOYW1lPVwiYWJvdXQtZWRpdG9yLXdpZGUtYWN0aW9uXCIgZGlzYWJsZWQ9e2V4aXN0aW5nS2V5QXRQbGF5aGVhZCA+PSAwfSBvbkNsaWNrPXtzZXRLZXl9PntleGlzdGluZ0tleUF0UGxheWhlYWQgPj0gMCA/IGBDYW1lcmEga2V5IGFscmVhZHkgYXQgJHtmb3JtYXRDYW1lcmFQZXJjZW50KHRhcmdldEF0KX1gIDogYFNldCBhbm90aGVyIGtleSBhdCAke2Zvcm1hdENhbWVyYVBlcmNlbnQodGFyZ2V0QXQpfWB9PC9idXR0b24+XG4gICAgICA8YnV0dG9uIHR5cGU9XCJidXR0b25cIiBjbGFzc05hbWU9XCJhYm91dC1lZGl0b3ItZGFuZ2VyXCIgb25DbGljaz17KCkgPT4gc3RvcmUuY29tbWl0KCdEZWxldGUgY2FtZXJhIGtleScsIChkcmFmdCkgPT4geyBkcmFmdC5zZWN0aW9uc1tzZWN0aW9uSW5kZXhdLmNhbWVyYS5rZXlzLnNwbGljZShrZXlJbmRleCwgMSk7IH0sIHsgc2VsZWN0aW9uOiB7IHR5cGU6ICdzZWN0aW9uJywgc2VjdGlvbklkOiBzZWN0aW9uLmlkIH0gfSl9PkRlbGV0ZSBrZXk8L2J1dHRvbj5cbiAgICA8Lz5cbiAgKTtcbn1cblxuY29uc3QgQ09SUkVTUE9OREVOQ0VfTEFCRUxTID0gT2JqZWN0LmZyZWV6ZSh7XG4gICdpbmRleC12MSc6ICdJbmRleCBvcmRlcicsXG4gICdzdGFibGUtc2VlZCc6ICdTdGFibGUgc2VlZCcsXG4gICdzcGF0aWFsLW5lYXJlc3QtdjEnOiAnTG9jYWwgdHJhdmVsIChhcHByb3guKScsXG4gICdncm91cC1hd2FyZSc6ICdHcm91cCBhd2FyZScsXG59KTtcblxuZnVuY3Rpb24gV29ybGRJbnNwZWN0b3IoeyBzdG9yZSwgc25hcHNob3QsIHNlY3Rpb24sIHJ1bnRpbWVNZXRyaWNzIH0pIHtcbiAgY29uc3Qgc2VjdGlvbkluZGV4ID0gZ2V0U2VjdGlvbkluZGV4KHNuYXBzaG90LmRvY3VtZW50LCBzZWN0aW9uLmlkKTtcbiAgaWYgKHNlY3Rpb24ud29ybGQubW9kZSAhPT0gJ3NldCcpIHtcbiAgICByZXR1cm4gPD48aGVhZGVyPjxzcGFuPldvcmxkIHRyYWNrPC9zcGFuPjxzdHJvbmc+SW5oZXJpdGVkIFdvcmxkPC9zdHJvbmc+PC9oZWFkZXI+PHAgY2xhc3NOYW1lPVwiYWJvdXQtZWRpdG9yLWhlbHBcIj5UaGlzIFNlY3Rpb24ga2VlcHMgdGhlIHByZXZpb3VzIFdvcmxkLiBDaG9vc2Ug4oCcQ3JlYXRlIFdvcmxkIGNsaXDigJ0gb25seSB3aGVuIHRoZSBzaGFwZSBzaG91bGQgY2hhbmdlIGhlcmUuPC9wPjxidXR0b24gdHlwZT1cImJ1dHRvblwiIGNsYXNzTmFtZT1cImFib3V0LWVkaXRvci13aWRlLWFjdGlvblwiIG9uQ2xpY2s9eygpID0+IHN0b3JlLmNvbW1pdCgnQ3JlYXRlIFdvcmxkIGNsaXAnLCAoZHJhZnQpID0+IHtcbiAgICAgIGRyYWZ0LnNlY3Rpb25zW3NlY3Rpb25JbmRleF0ud29ybGQgPSBjbG9uZUFib3V0TmFycmF0aXZlRG9jdW1lbnQoZHJhZnQuc2VjdGlvbnMuc2xpY2UoMCwgc2VjdGlvbkluZGV4KS5yZXZlcnNlKCkuZmluZCgoaXRlbSkgPT4gaXRlbS53b3JsZC5tb2RlID09PSAnc2V0Jyk/LndvcmxkIHx8IGRyYWZ0LnNlY3Rpb25zWzBdLndvcmxkKTtcbiAgICB9KX0+Q3JlYXRlIFdvcmxkIGNsaXA8L2J1dHRvbj48Lz47XG4gIH1cbiAgY29uc3Qgd29ybGQgPSBzZWN0aW9uLndvcmxkO1xuICBjb25zdCBzaGFwZSA9IEFCT1VUX05BUlJBVElWRV9TSEFQRV9ERUZJTklUSU9OU1t3b3JsZC5zaGFwZUlkXTtcbiAgY29uc3QgdHJhbnNpdGlvbkxpbWl0ID0gZ2V0QWJvdXROYXJyYXRpdmVXb3JsZFRyYW5zaXRpb25MaW1pdChzbmFwc2hvdC5jb21waWxlZFBsYW4sIHNlY3Rpb25JbmRleCk7XG4gIGNvbnN0IHRyYW5zaXRpb25NYXggPSBNYXRoLm1heCh0cmFuc2l0aW9uTGltaXQsIHdvcmxkLnRyYW5zaXRpb25Jbi5lbmQsIDEpO1xuICBjb25zdCB0cmFuc2l0aW9uRW5hYmxlZCA9IHdvcmxkLnRyYW5zaXRpb25Jbi50eXBlICE9PSAnY3V0JztcbiAgY29uc3QgY29ycmVzcG9uZGVuY2VFbmFibGVkID0gWydtb3JwaCcsICdkaXNzb2x2ZS1tb3JwaCddLmluY2x1ZGVzKHdvcmxkLnRyYW5zaXRpb25Jbi50eXBlKTtcbiAgY29uc3QgcHJldmlvdXNXb3JsZFNlY3Rpb24gPSBzbmFwc2hvdC5kb2N1bWVudC5zZWN0aW9uc1xuICAgIC5zbGljZSgwLCBzZWN0aW9uSW5kZXgpXG4gICAgLnJldmVyc2UoKVxuICAgIC5maW5kKChpdGVtKSA9PiBpdGVtLndvcmxkLm1vZGUgPT09ICdzZXQnKTtcbiAgY29uc3Qgc291cmNlU2hhcGUgPSBBQk9VVF9OQVJSQVRJVkVfU0hBUEVfREVGSU5JVElPTlNbcHJldmlvdXNXb3JsZFNlY3Rpb24/LndvcmxkLnNoYXBlSWQgfHwgd29ybGQuc2hhcGVJZF07XG4gIGNvbnN0IHByZXBhcmVkID0gcnVudGltZU1ldHJpY3M/LnByZXBhcmVkV29ybGRJZHM/LmluY2x1ZGVzKHNlY3Rpb24uaWQpO1xuICBjb25zdCBjb3JyZXNwb25kZW5jZVN0YXR1cyA9IHJ1bnRpbWVNZXRyaWNzPy5jb3JyZXNwb25kZW5jZVNlcXVlbmNlU3RhdGUgPT09ICdmYWlsZWQnXG4gICAgPyAnRmFpbGVkJ1xuICAgIDogcnVudGltZU1ldHJpY3M/LmNvcnJlc3BvbmRlbmNlU2VxdWVuY2VTdGF0ZSA9PT0gJ2xvYWRpbmcnXG4gICAgICA/ICdQcmVwYXJpbmcnXG4gICAgICA6IHByZXBhcmVkXG4gICAgICAgID8gcnVudGltZU1ldHJpY3M/LmNvcnJlc3BvbmRlbmNlRmFsbGJhY2sgJiYgcnVudGltZU1ldHJpY3M/LmNvcnJlc3BvbmRlbmNlVG9Xb3JsZElkID09PSBzZWN0aW9uLmlkXG4gICAgICAgICAgPyAnQmFzZWxpbmUgZmFsbGJhY2snXG4gICAgICAgICAgOiAnUmVhZHknXG4gICAgICAgIDogJ1ByZXBhcmluZyc7XG4gIGNvbnN0IHVwZGF0ZSA9IChsYWJlbCwgbXV0YXRlLCBjb2FsZXNjZUtleSA9IG51bGwpID0+IHN0b3JlLmNvbW1pdChsYWJlbCwgKGRyYWZ0KSA9PiBtdXRhdGUoZHJhZnQuc2VjdGlvbnNbc2VjdGlvbkluZGV4XS53b3JsZCksIHsgY29hbGVzY2VLZXksIHNlbGVjdGlvbjogc25hcHNob3Quc2VsZWN0aW9uIH0pO1xuICBjb25zdCB0cnlTaGFwZSA9IChzaGFwZUlkKSA9PiBzdG9yZS5iZWdpblRyeShgUmVwbGFjZSBTaGFwZSB3aXRoICR7QUJPVVRfTkFSUkFUSVZFX1NIQVBFX0RFRklOSVRJT05TW3NoYXBlSWRdLmxhYmVsfWAsIChkcmFmdCkgPT4ge1xuICAgIGNvbnN0IHRhcmdldCA9IGRyYWZ0LnNlY3Rpb25zW3NlY3Rpb25JbmRleF0ud29ybGQ7XG4gICAgdGFyZ2V0LnNoYXBlSWQgPSBzaGFwZUlkO1xuICAgIHRhcmdldC5zaGFwZVBhcmFtZXRlcnMgPSBPYmplY3QuZnJvbUVudHJpZXMoQUJPVVRfTkFSUkFUSVZFX1NIQVBFX0RFRklOSVRJT05TW3NoYXBlSWRdLnBhcmFtZXRlcnMubWFwKChjb250cm9sKSA9PiBbY29udHJvbC5pZCwgY29udHJvbC5pZCA9PT0gJ2RlbnNpdHknID8gMSA6IChjb250cm9sLm1pbiArIGNvbnRyb2wubWF4KSAvIDJdKSk7XG4gIH0pO1xuICByZXR1cm4gKFxuICAgIDw+XG4gICAgICA8aGVhZGVyPjxzcGFuPldvcmxkIGNsaXA8L3NwYW4+PHN0cm9uZz57c2hhcGU/LmxhYmVsIHx8IHdvcmxkLnNoYXBlSWR9PC9zdHJvbmc+PC9oZWFkZXI+XG4gICAgICA8ZGl2IGNsYXNzTmFtZT1cImFib3V0LWVkaXRvci1zaGFwZS1jYXRhbG9nXCI+XG4gICAgICAgIHtPYmplY3QudmFsdWVzKEFCT1VUX05BUlJBVElWRV9TSEFQRV9ERUZJTklUSU9OUykubWFwKChpdGVtKSA9PiAoXG4gICAgICAgICAgPGJ1dHRvbiB0eXBlPVwiYnV0dG9uXCIga2V5PXtpdGVtLmlkfSBkaXNhYmxlZD17c2VjdGlvbi5sb2NrZWR9IGNsYXNzTmFtZT17aXRlbS5pZCA9PT0gd29ybGQuc2hhcGVJZCA/ICdpcy1zZWxlY3RlZCcgOiAnJ30gb25DbGljaz17KCkgPT4gdHJ5U2hhcGUoaXRlbS5pZCl9PlxuICAgICAgICAgICAgPGkgLz48c3Bhbj48c3Ryb25nPntpdGVtLmxhYmVsfTwvc3Ryb25nPjxzbWFsbD5Db3N0IHtpdGVtLmNvc3R9IMK3IFBvaW50IGZpZWxkPC9zbWFsbD48L3NwYW4+XG4gICAgICAgICAgPC9idXR0b24+XG4gICAgICAgICkpfVxuICAgICAgPC9kaXY+XG4gICAgICB7c25hcHNob3QudHJ5U3RhdGUgPyA8ZGl2IGNsYXNzTmFtZT1cImFib3V0LWVkaXRvci10cnlcIj48c3Bhbj5Ucnlpbmcge3NuYXBzaG90LnRyeVN0YXRlLmxhYmVsfTwvc3Bhbj48YnV0dG9uIHR5cGU9XCJidXR0b25cIiBvbkNsaWNrPXsoKSA9PiBzdG9yZS5jYW5jZWxUcnkoKX0+Q2FuY2VsPC9idXR0b24+PGJ1dHRvbiB0eXBlPVwiYnV0dG9uXCIgY2xhc3NOYW1lPVwiaXMtcHJpbWFyeVwiIG9uQ2xpY2s9eygpID0+IHN0b3JlLmFwcGx5VHJ5KCl9PkFwcGx5PC9idXR0b24+PC9kaXY+IDogbnVsbH1cbiAgICAgIDxkZXRhaWxzIG9wZW4+PHN1bW1hcnk+U2hhcGUgcGFyYW1ldGVyczwvc3VtbWFyeT5cbiAgICAgICAgeyhzaGFwZT8ucGFyYW1ldGVycyB8fCBbXSkubWFwKChjb250cm9sKSA9PiA8TnVtYmVyUHJvcGVydHkga2V5PXtjb250cm9sLmlkfSBsYWJlbD17Y29udHJvbC5sYWJlbH0gdmFsdWU9e3dvcmxkLnNoYXBlUGFyYW1ldGVyc1tjb250cm9sLmlkXX0gbWluPXtjb250cm9sLm1pbn0gbWF4PXtjb250cm9sLm1heH0gc3RlcD17Y29udHJvbC5zdGVwfSB1bml0PXtjb250cm9sLnVuaXR9IG9uQ2hhbmdlPXsodmFsdWUpID0+IHVwZGF0ZShgQ2hhbmdlICR7Y29udHJvbC5sYWJlbH1gLCAoZHJhZnQpID0+IHsgZHJhZnQuc2hhcGVQYXJhbWV0ZXJzW2NvbnRyb2wuaWRdID0gdmFsdWU7IH0sIGB3b3JsZDoke3NlY3Rpb24uaWR9OiR7Y29udHJvbC5pZH1gKX0gLz4pfVxuICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cImFib3V0LWVkaXRvci1pbmxpbmUtYWN0aW9uc1wiPjxidXR0b24gdHlwZT1cImJ1dHRvblwiIG9uQ2xpY2s9eygpID0+IHVwZGF0ZSgnUmVzZWVkIFNoYXBlJywgKGRyYWZ0KSA9PiB7IGRyYWZ0LnNlZWQgPSBNYXRoLmZsb29yKE1hdGgucmFuZG9tKCkgKiAweGZmZmZmZmZmKTsgfSl9PlJlc2VlZDwvYnV0dG9uPjxjb2RlPnt3b3JsZC5zZWVkfTwvY29kZT48L2Rpdj5cbiAgICAgIDwvZGV0YWlscz5cbiAgICAgIDxkZXRhaWxzIG9wZW4+PHN1bW1hcnk+UGxhY2VtZW50PC9zdW1tYXJ5PlxuICAgICAgICA8TnVtYmVyUHJvcGVydHkgbGFiZWw9XCJEaXN0YW5jZSBhdCBlbnRyeVwiIHZhbHVlPXt3b3JsZC5lbnRyeURpc3RhbmNlV1V9IG1pbj17MC4yfSBtYXg9ezE2fSBzdGVwPXswLjA1fSB1bml0PVwiV1VcIiBvbkNoYW5nZT17KHZhbHVlKSA9PiB1cGRhdGUoJ01vdmUgV29ybGQnLCAoZHJhZnQpID0+IHsgZHJhZnQuZW50cnlEaXN0YW5jZVdVID0gdmFsdWU7IH0sIGB3b3JsZDoke3NlY3Rpb24uaWR9OmRpc3RhbmNlYCl9IC8+XG4gICAgICAgIDxOdW1iZXJQcm9wZXJ0eSBsYWJlbD1cIlNjYWxlXCIgdmFsdWU9e3dvcmxkLnRyYW5zZm9ybS5zY2FsZX0gbWluPXswLjF9IG1heD17M30gc3RlcD17MC4wMX0gb25DaGFuZ2U9eyh2YWx1ZSkgPT4gdXBkYXRlKCdTY2FsZSBXb3JsZCcsIChkcmFmdCkgPT4geyBkcmFmdC50cmFuc2Zvcm0uc2NhbGUgPSB2YWx1ZTsgfSwgYHdvcmxkOiR7c2VjdGlvbi5pZH06c2NhbGVgKX0gLz5cbiAgICAgIDwvZGV0YWlscz5cbiAgICAgIDxkZXRhaWxzIG9wZW4+PHN1bW1hcnk+VHJhbnNpdGlvbiBpbjwvc3VtbWFyeT5cbiAgICAgICAge3RyYW5zaXRpb25FbmFibGVkID8gPD5cbiAgICAgICAgICA8cCBjbGFzc05hbWU9XCJhYm91dC1lZGl0b3ItaGVscFwiPlRpbWluZyBpcyByZWxhdGl2ZSB0byB0aGlzIFNlY3Rpb246IDEgaXMgaXRzIGVuZDsgdmFsdWVzIGFib3ZlIDEgY29udGludWUgYWNyb3NzIGluaGVyaXRlZCBXb3JsZCBTZWN0aW9ucy4gVGhlIG5leHQgV29ybGQgYmVnaW5zIGF0IHt0cmFuc2l0aW9uTGltaXQudG9GaXhlZCgzKX0uPC9wPlxuICAgICAgICAgIDxOdW1iZXJQcm9wZXJ0eSBsYWJlbD1cIlN0YXJ0XCIgdmFsdWU9e3dvcmxkLnRyYW5zaXRpb25Jbi5zdGFydH0gbWluPXswfSBtYXg9e3RyYW5zaXRpb25NYXh9IHN0ZXA9ezAuMDA1fSB1bml0PVwiw5cgc2VjdGlvblwiIG9uQ2hhbmdlPXsodmFsdWUpID0+IHVwZGF0ZSgnQ2hhbmdlIHRyYW5zaXRpb24gc3RhcnQnLCAoZHJhZnQpID0+IHsgZHJhZnQudHJhbnNpdGlvbkluLnN0YXJ0ID0gTWF0aC5taW4odmFsdWUsIGRyYWZ0LnRyYW5zaXRpb25Jbi5lbmQpOyB9KX0gLz5cbiAgICAgICAgICA8TnVtYmVyUHJvcGVydHkgbGFiZWw9XCJFbmRcIiB2YWx1ZT17d29ybGQudHJhbnNpdGlvbkluLmVuZH0gbWluPXswfSBtYXg9e3RyYW5zaXRpb25NYXh9IHN0ZXA9ezAuMDA1fSB1bml0PVwiw5cgc2VjdGlvblwiIG9uQ2hhbmdlPXsodmFsdWUpID0+IHVwZGF0ZSgnQ2hhbmdlIHRyYW5zaXRpb24gZW5kJywgKGRyYWZ0KSA9PiB7IGRyYWZ0LnRyYW5zaXRpb25Jbi5lbmQgPSBNYXRoLm1heCh2YWx1ZSwgZHJhZnQudHJhbnNpdGlvbkluLnN0YXJ0KTsgfSl9IC8+XG4gICAgICAgICAgPFByb3BlcnR5IGxhYmVsPVwiVHlwZVwiPjxzZWxlY3QgdmFsdWU9e3dvcmxkLnRyYW5zaXRpb25Jbi50eXBlfSBvbkNoYW5nZT17KGV2ZW50KSA9PiB1cGRhdGUoJ0NoYW5nZSB0cmFuc2l0aW9uIHR5cGUnLCAoZHJhZnQpID0+IHsgZHJhZnQudHJhbnNpdGlvbkluLnR5cGUgPSBldmVudC50YXJnZXQudmFsdWU7IH0pfT48b3B0aW9uIHZhbHVlPVwibW9ycGhcIj5Nb3JwaDwvb3B0aW9uPjxvcHRpb24gdmFsdWU9XCJkaXNzb2x2ZS1tb3JwaFwiPkRpc3NvbHZlIG1vcnBoPC9vcHRpb24+PG9wdGlvbiB2YWx1ZT1cImNyb3NzZmFkZVwiPkNyb3NzZmFkZTwvb3B0aW9uPjxvcHRpb24gdmFsdWU9XCJob2xkXCI+SG9sZDwvb3B0aW9uPjwvc2VsZWN0PjwvUHJvcGVydHk+XG4gICAgICAgICAgPFByb3BlcnR5IGxhYmVsPVwiRWFzaW5nXCI+PHNlbGVjdCB2YWx1ZT17d29ybGQudHJhbnNpdGlvbkluLmVhc2luZ30gb25DaGFuZ2U9eyhldmVudCkgPT4gdXBkYXRlKCdDaGFuZ2UgdHJhbnNpdGlvbiBlYXNpbmcnLCAoZHJhZnQpID0+IHsgZHJhZnQudHJhbnNpdGlvbkluLmVhc2luZyA9IGV2ZW50LnRhcmdldC52YWx1ZTsgfSl9PjxvcHRpb24gdmFsdWU9XCJsaW5lYXJcIj5MaW5lYXI8L29wdGlvbj48b3B0aW9uIHZhbHVlPVwic21vb3Roc3RlcFwiPlNtb290aHN0ZXA8L29wdGlvbj48b3B0aW9uIHZhbHVlPVwiZWFzZS1pblwiPkVhc2UgaW48L29wdGlvbj48b3B0aW9uIHZhbHVlPVwiZWFzZS1vdXRcIj5FYXNlIG91dDwvb3B0aW9uPjxvcHRpb24gdmFsdWU9XCJlYXNlLWluLW91dFwiPkVhc2UgaW4gb3V0PC9vcHRpb24+PG9wdGlvbiB2YWx1ZT1cImhvbGRcIj5Ib2xkPC9vcHRpb24+PC9zZWxlY3Q+PC9Qcm9wZXJ0eT5cbiAgICAgICAgICA8cCBjbGFzc05hbWU9XCJhYm91dC1lZGl0b3ItaGVscFwiPk1hcHMge3NvdXJjZVNoYXBlPy5sYWJlbCB8fCAncHJldmlvdXMgU2hhcGUnfSDihpIge3NoYXBlPy5sYWJlbCB8fCB3b3JsZC5zaGFwZUlkfS48L3A+XG4gICAgICAgICAgPFByb3BlcnR5IGxhYmVsPVwiQ29ycmVzcG9uZGVuY2VcIj48c2VsZWN0IGFyaWEtbGFiZWw9XCJDb3JyZXNwb25kZW5jZVwiIHZhbHVlPXt3b3JsZC50cmFuc2l0aW9uSW4uY29ycmVzcG9uZGVuY2V9IGRpc2FibGVkPXshY29ycmVzcG9uZGVuY2VFbmFibGVkfSB0aXRsZT17Y29ycmVzcG9uZGVuY2VFbmFibGVkID8gJ0Nob29zZSBob3cgc291cmNlIHBvaW50cyBhcmUgYXNzaWduZWQgdG8gdGFyZ2V0IHBvaW50cy4nIDogJ0NvcnJlc3BvbmRlbmNlIGFwcGxpZXMgdG8gTW9ycGggYW5kIERpc3NvbHZlIG1vcnBoIHRyYW5zaXRpb25zLid9IG9uQ2hhbmdlPXsoZXZlbnQpID0+IHVwZGF0ZSgnQ2hhbmdlIGNvcnJlc3BvbmRlbmNlJywgKGRyYWZ0KSA9PiB7IGRyYWZ0LnRyYW5zaXRpb25Jbi5jb3JyZXNwb25kZW5jZSA9IGV2ZW50LnRhcmdldC52YWx1ZTsgfSl9PntBQk9VVF9OQVJSQVRJVkVfQ09SUkVTUE9OREVOQ0VfTU9ERVMubWFwKChtb2RlKSA9PiA8b3B0aW9uIHZhbHVlPXttb2RlfSBrZXk9e21vZGV9PntDT1JSRVNQT05ERU5DRV9MQUJFTFNbbW9kZV0gfHwgbW9kZX08L29wdGlvbj4pfTwvc2VsZWN0PjwvUHJvcGVydHk+XG4gICAgICAgICAgPHAgY2xhc3NOYW1lPVwiYWJvdXQtZWRpdG9yLWhlbHBcIiByb2xlPVwic3RhdHVzXCIgYXJpYS1saXZlPVwicG9saXRlXCI+Q29ycmVzcG9uZGVuY2U6IHtjb3JyZXNwb25kZW5jZVN0YXR1c317cHJlcGFyZWQgJiYgcnVudGltZU1ldHJpY3M/LmNvcnJlc3BvbmRlbmNlVG9Xb3JsZElkID09PSBzZWN0aW9uLmlkICYmIE51bWJlci5pc0Zpbml0ZShydW50aW1lTWV0cmljcz8uY29ycmVzcG9uZGVuY2VJbXByb3ZlbWVudCkgPyBgIMK3ICR7TWF0aC5yb3VuZChydW50aW1lTWV0cmljcy5jb3JyZXNwb25kZW5jZUltcHJvdmVtZW50ICogMTAwKX0lIFJNUyBpbXByb3ZlbWVudGAgOiAnJ30uPC9wPlxuICAgICAgICAgIDxidXR0b24gdHlwZT1cImJ1dHRvblwiIGNsYXNzTmFtZT1cImFib3V0LWVkaXRvci1kYW5nZXJcIiBvbkNsaWNrPXsoKSA9PiBzdG9yZS5jb21taXQoJ1JlbW92ZSBXb3JsZCB0cmFuc2l0aW9uJywgKGRyYWZ0KSA9PiB7XG4gICAgICAgICAgICBjb25zdCB0cmFuc2l0aW9uID0gZHJhZnQuc2VjdGlvbnNbc2VjdGlvbkluZGV4XS53b3JsZC50cmFuc2l0aW9uSW47XG4gICAgICAgICAgICB0cmFuc2l0aW9uLnN0YXJ0ID0gMDtcbiAgICAgICAgICAgIHRyYW5zaXRpb24uZW5kID0gMDtcbiAgICAgICAgICAgIHRyYW5zaXRpb24udHlwZSA9ICdjdXQnO1xuICAgICAgICAgIH0sIHsgc2VsZWN0aW9uOiB7IHR5cGU6ICd3b3JsZCcsIHNlY3Rpb25JZDogc2VjdGlvbi5pZCB9IH0pfT5SZW1vdmUgdHJhbnNpdGlvbiBrZXlmcmFtZXM8L2J1dHRvbj5cbiAgICAgICAgPC8+IDogPD5cbiAgICAgICAgICA8cCBjbGFzc05hbWU9XCJhYm91dC1lZGl0b3ItaGVscFwiPlRoaXMgV29ybGQgY3V0cyBpbiBhdCB0aGUgU2VjdGlvbiBib3VuZGFyeSBhbmQgaGFzIG5vIHRyYW5zaXRpb24ga2V5ZnJhbWVzLjwvcD5cbiAgICAgICAgICA8YnV0dG9uIHR5cGU9XCJidXR0b25cIiBjbGFzc05hbWU9XCJhYm91dC1lZGl0b3Itd2lkZS1hY3Rpb25cIiBvbkNsaWNrPXsoKSA9PiBzdG9yZS5jb21taXQoJ0FkZCBXb3JsZCB0cmFuc2l0aW9uJywgKGRyYWZ0KSA9PiB7XG4gICAgICAgICAgICBjb25zdCB0cmFuc2l0aW9uID0gZHJhZnQuc2VjdGlvbnNbc2VjdGlvbkluZGV4XS53b3JsZC50cmFuc2l0aW9uSW47XG4gICAgICAgICAgICB0cmFuc2l0aW9uLnN0YXJ0ID0gTWF0aC5taW4oMC4wOCwgdHJhbnNpdGlvbkxpbWl0KTtcbiAgICAgICAgICAgIHRyYW5zaXRpb24uZW5kID0gTWF0aC5taW4oMC42OCwgdHJhbnNpdGlvbkxpbWl0KTtcbiAgICAgICAgICAgIHRyYW5zaXRpb24udHlwZSA9ICdtb3JwaCc7XG4gICAgICAgICAgfSwgeyBzZWxlY3Rpb246IHsgdHlwZTogJ3dvcmxkJywgc2VjdGlvbklkOiBzZWN0aW9uLmlkIH0gfSl9PkFkZCB0cmFuc2l0aW9uIGtleWZyYW1lczwvYnV0dG9uPlxuICAgICAgICA8Lz59XG4gICAgICA8L2RldGFpbHM+XG4gICAgICA8ZGV0YWlscyBvcGVuPjxzdW1tYXJ5Pk1vZGlmaWVyIHN0YWNrPC9zdW1tYXJ5PlxuICAgICAgICB7d29ybGQubW9kaWZpZXJzLm1hcCgoaXRlbSwgbW9kaWZpZXJJbmRleCkgPT4ge1xuICAgICAgICAgIGNvbnN0IGRlZmluaXRpb24gPSBBQk9VVF9OQVJSQVRJVkVfTU9ESUZJRVJfREVGSU5JVElPTlNbaXRlbS5pZF07XG4gICAgICAgICAgY29uc3QgbW92ZU1vZGlmaWVyID0gKGRpcmVjdGlvbikgPT4gdXBkYXRlKCdSZW9yZGVyIG1vZGlmaWVyJywgKGRyYWZ0KSA9PiB7XG4gICAgICAgICAgICBjb25zdCBuZXh0SW5kZXggPSBtb2RpZmllckluZGV4ICsgZGlyZWN0aW9uO1xuICAgICAgICAgICAgaWYgKG5leHRJbmRleCA8IDAgfHwgbmV4dEluZGV4ID49IGRyYWZ0Lm1vZGlmaWVycy5sZW5ndGgpIHJldHVybjtcbiAgICAgICAgICAgIGNvbnN0IFttb3ZlZF0gPSBkcmFmdC5tb2RpZmllcnMuc3BsaWNlKG1vZGlmaWVySW5kZXgsIDEpO1xuICAgICAgICAgICAgZHJhZnQubW9kaWZpZXJzLnNwbGljZShuZXh0SW5kZXgsIDAsIG1vdmVkKTtcbiAgICAgICAgICB9KTtcbiAgICAgICAgICByZXR1cm4gPGRpdiBjbGFzc05hbWU9XCJhYm91dC1lZGl0b3ItbW9kaWZpZXJcIiBrZXk9e2Ake2l0ZW0uaWR9LSR7bW9kaWZpZXJJbmRleH1gfT48ZGl2PjxsYWJlbD48aW5wdXQgdHlwZT1cImNoZWNrYm94XCIgY2hlY2tlZD17aXRlbS5lbmFibGVkfSBvbkNoYW5nZT17KGV2ZW50KSA9PiB1cGRhdGUoYFRvZ2dsZSAke2RlZmluaXRpb24/LmxhYmVsfWAsIChkcmFmdCkgPT4geyBkcmFmdC5tb2RpZmllcnNbbW9kaWZpZXJJbmRleF0uZW5hYmxlZCA9IGV2ZW50LnRhcmdldC5jaGVja2VkOyB9KX0gLz57ZGVmaW5pdGlvbj8ubGFiZWwgfHwgaXRlbS5pZH08L2xhYmVsPjxzcGFuPjxidXR0b24gdHlwZT1cImJ1dHRvblwiIGRpc2FibGVkPXttb2RpZmllckluZGV4ID09PSAwfSBvbkNsaWNrPXsoKSA9PiBtb3ZlTW9kaWZpZXIoLTEpfSBhcmlhLWxhYmVsPVwiTW92ZSBtb2RpZmllciB1cFwiPuKGkTwvYnV0dG9uPjxidXR0b24gdHlwZT1cImJ1dHRvblwiIGRpc2FibGVkPXttb2RpZmllckluZGV4ID09PSB3b3JsZC5tb2RpZmllcnMubGVuZ3RoIC0gMX0gb25DbGljaz17KCkgPT4gbW92ZU1vZGlmaWVyKDEpfSBhcmlhLWxhYmVsPVwiTW92ZSBtb2RpZmllciBkb3duXCI+4oaTPC9idXR0b24+IENvc3Qge2RlZmluaXRpb24/LmNvc3QgfHwgJz8nfTwvc3Bhbj48L2Rpdj57KGRlZmluaXRpb24/LnBhcmFtZXRlcnMgfHwgW10pLm1hcCgoY29udHJvbCkgPT4gY29udHJvbC50eXBlID09PSAncmFuZ2UnID8gPE51bWJlclByb3BlcnR5IGtleT17Y29udHJvbC5pZH0gbGFiZWw9e2NvbnRyb2wubGFiZWx9IHZhbHVlPXtpdGVtLnBhcmFtZXRlcnNbY29udHJvbC5pZF19IG1pbj17Y29udHJvbC5taW59IG1heD17Y29udHJvbC5tYXh9IHN0ZXA9e2NvbnRyb2wuc3RlcH0gdW5pdD17Y29udHJvbC51bml0fSBvbkNoYW5nZT17KHZhbHVlKSA9PiB1cGRhdGUoYENoYW5nZSAke2NvbnRyb2wubGFiZWx9YCwgKGRyYWZ0KSA9PiB7IGRyYWZ0Lm1vZGlmaWVyc1ttb2RpZmllckluZGV4XS5wYXJhbWV0ZXJzW2NvbnRyb2wuaWRdID0gdmFsdWU7IH0sIGBtb2RpZmllcjoke3NlY3Rpb24uaWR9OiR7bW9kaWZpZXJJbmRleH06JHtjb250cm9sLmlkfWApfSAvPiA6IDxQcm9wZXJ0eSBrZXk9e2NvbnRyb2wuaWR9IGxhYmVsPXtjb250cm9sLmxhYmVsfT48c2VsZWN0IHZhbHVlPXtpdGVtLnBhcmFtZXRlcnNbY29udHJvbC5pZF19IG9uQ2hhbmdlPXsoZXZlbnQpID0+IHVwZGF0ZShgQ2hhbmdlICR7Y29udHJvbC5sYWJlbH1gLCAoZHJhZnQpID0+IHsgZHJhZnQubW9kaWZpZXJzW21vZGlmaWVySW5kZXhdLnBhcmFtZXRlcnNbY29udHJvbC5pZF0gPSBldmVudC50YXJnZXQudmFsdWU7IH0pfT57Y29udHJvbC5vcHRpb25zLm1hcCgob3B0aW9uKSA9PiA8b3B0aW9uIGtleT17b3B0aW9ufT57b3B0aW9ufTwvb3B0aW9uPil9PC9zZWxlY3Q+PC9Qcm9wZXJ0eT4pfTwvZGl2PjtcbiAgICAgICAgfSl9XG4gICAgICA8L2RldGFpbHM+XG4gICAgPC8+XG4gICk7XG59XG5cbmZ1bmN0aW9uIERpYWdub3N0aWNzKHsgZGlhZ25vc3RpY3MgfSkge1xuICBpZiAoIWRpYWdub3N0aWNzLmxlbmd0aCkgcmV0dXJuIDxkaXYgY2xhc3NOYW1lPVwiYWJvdXQtZWRpdG9yLWRpYWdub3N0aWNzIGlzLWNsZWFyXCI+PENoZWNrIGFyaWEtaGlkZGVuPVwidHJ1ZVwiIC8+IE5vIGRpYWdub3N0aWNzPC9kaXY+O1xuICByZXR1cm4gPGRpdiBjbGFzc05hbWU9XCJhYm91dC1lZGl0b3ItZGlhZ25vc3RpY3NcIj57ZGlhZ25vc3RpY3MubWFwKChpdGVtLCBpbmRleCkgPT4ge1xuICAgIGNvbnN0IERpYWdub3N0aWNJY29uID0gaXRlbS5sZXZlbCA9PT0gJ2Vycm9yJyA/IENpcmNsZUFsZXJ0IDogSW5mbztcbiAgICByZXR1cm4gPGRpdiBrZXk9e2Ake2l0ZW0uY29kZX0tJHtpdGVtLnBhdGh9LSR7aW5kZXh9YH0gY2xhc3NOYW1lPXtgaXMtJHtpdGVtLmxldmVsfWB9PjxEaWFnbm9zdGljSWNvbiBhcmlhLWhpZGRlbj1cInRydWVcIiAvPjxzcGFuPjxzdHJvbmc+e2l0ZW0ubWVzc2FnZX08L3N0cm9uZz48c21hbGw+e2l0ZW0ucGF0aH08L3NtYWxsPjwvc3Bhbj48L2Rpdj47XG4gIH0pfTwvZGl2Pjtcbn1cblxuZnVuY3Rpb24gQXVkaXRpb25Db250cm9scyh7IHN0b3JlLCBzbmFwc2hvdCB9KSB7XG4gIGNvbnN0IFtwcmVSb2xsV1UsIHNldFByZVJvbGxXVV0gPSB1c2VTdGF0ZSgwLjE4KTtcbiAgY29uc3QgW3Bvc3RSb2xsV1UsIHNldFBvc3RSb2xsV1VdID0gdXNlU3RhdGUoMC4xOCk7XG4gIGNvbnN0IG1lbWJlcnMgPSBnZXRBYm91dE5hcnJhdGl2ZVNlbGVjdGlvbk1lbWJlcnMoc25hcHNob3Quc2VsZWN0aW9uKTtcbiAgY29uc3Qgc291cmNlID0gc25hcHNob3Quc2VsZWN0aW9uLnR5cGUgPT09ICdjdWUnXG4gICAgPyB7IHR5cGU6ICdjdWUtZ3JvdXAnLCBzZWN0aW9uSWQ6IHNuYXBzaG90LnNlbGVjdGlvbi5zZWN0aW9uSWQsIG1lbWJlcnMsIHByaW1hcnk6IHNuYXBzaG90LnNlbGVjdGlvbiB9XG4gICAgOiBbJ3NlY3Rpb24nLCAnd29ybGQnLCAnY2FtZXJhLWtleSddLmluY2x1ZGVzKHNuYXBzaG90LnNlbGVjdGlvbi50eXBlKVxuICAgICAgPyBzbmFwc2hvdC5zZWxlY3Rpb25cbiAgICAgIDogbnVsbDtcbiAgaWYgKCFzb3VyY2UpIHJldHVybiBudWxsO1xuICBjb25zdCByYW5nZSA9IGRlcml2ZUFib3V0TmFycmF0aXZlTG9vcFJhbmdlKHtcbiAgICBkb2N1bWVudDogc25hcHNob3QuZG9jdW1lbnQsXG4gICAgcGxhbjogc25hcHNob3QuY29tcGlsZWRQbGFuLFxuICAgIHNvdXJjZSxcbiAgICBwcmVSb2xsV1UsXG4gICAgcG9zdFJvbGxXVSxcbiAgfSk7XG4gIGNvbnN0IGFjdGl2ZSA9IHJhbmdlLnZhbGlkXG4gICAgJiYgc25hcHNob3QudHJhbnNwb3J0Lmxvb3A/LnNvdXJjZVR5cGUgPT09IHJhbmdlLnNvdXJjZVR5cGVcbiAgICAmJiBzbmFwc2hvdC50cmFuc3BvcnQubG9vcD8uc291cmNlSWQgPT09IHJhbmdlLnNvdXJjZUlkO1xuICBjb25zdCB0b2dnbGUgPSAoKSA9PiB7XG4gICAgaWYgKGFjdGl2ZSkge1xuICAgICAgc3RvcmUuc2V0VHJhbnNwb3J0KHsgb3duZXI6ICd0aW1lbGluZScsIHBsYXlpbmc6IGZhbHNlLCBsb29wOiBudWxsIH0pO1xuICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICBpZiAoIXJhbmdlLnZhbGlkKSByZXR1cm47XG4gICAgc3RvcmUuc2V0VHJhbnNwb3J0KHtcbiAgICAgIG93bmVyOiAncGxheWJhY2snLFxuICAgICAgcGxheWluZzogdHJ1ZSxcbiAgICAgIGxpdmVBbWJpZW50OiBmYWxzZSxcbiAgICAgIHN0b3J5V1U6IHJhbmdlLnN0YXJ0V1UsXG4gICAgICBsb29wOiByYW5nZSxcbiAgICB9KTtcbiAgfTtcbiAgcmV0dXJuIChcbiAgICA8ZGV0YWlscyBjbGFzc05hbWU9XCJhYm91dC1lZGl0b3ItYXVkaXRpb25cIj5cbiAgICAgIDxzdW1tYXJ5PkJvdW5kYXJ5IGF1ZGl0aW9uPC9zdW1tYXJ5PlxuICAgICAgPGRpdiBjbGFzc05hbWU9XCJhYm91dC1lZGl0b3ItYXVkaXRpb24tcmFuZ2VcIj5cbiAgICAgICAgPFByb3BlcnR5IGxhYmVsPVwiUHJlLXJvbGxcIj48aW5wdXQgdHlwZT1cIm51bWJlclwiIG1pbj1cIjBcIiBtYXg9XCIyXCIgc3RlcD1cIjAuMDVcIiB2YWx1ZT17cHJlUm9sbFdVfSBvbkNoYW5nZT17KGV2ZW50KSA9PiBzZXRQcmVSb2xsV1UoTWF0aC5tYXgoMCwgTnVtYmVyKGV2ZW50LnRhcmdldC52YWx1ZSkgfHwgMCkpfSAvPjwvUHJvcGVydHk+XG4gICAgICAgIDxQcm9wZXJ0eSBsYWJlbD1cIlBvc3Qtcm9sbFwiPjxpbnB1dCB0eXBlPVwibnVtYmVyXCIgbWluPVwiMFwiIG1heD1cIjJcIiBzdGVwPVwiMC4wNVwiIHZhbHVlPXtwb3N0Um9sbFdVfSBvbkNoYW5nZT17KGV2ZW50KSA9PiBzZXRQb3N0Um9sbFdVKE1hdGgubWF4KDAsIE51bWJlcihldmVudC50YXJnZXQudmFsdWUpIHx8IDApKX0gLz48L1Byb3BlcnR5PlxuICAgICAgPC9kaXY+XG4gICAgICB7cmFuZ2UudmFsaWQgPyA8cCBjbGFzc05hbWU9XCJhYm91dC1lZGl0b3ItaGVscFwiPntmb3JtYXRXVShyYW5nZS5zdGFydFdVKX0g4oaSIHtmb3JtYXRXVShyYW5nZS5lbmRXVSl9IMK3IGFtYmllbnQgbW90aW9uIGZyZWV6ZXMgZm9yIGEgcmVwZWF0YWJsZSByZXZpZXcuPC9wPiA6IDxwIGNsYXNzTmFtZT1cImFib3V0LWVkaXRvci1yaHl0aG0tbWVzc2FnZSBpcy1lcnJvclwiPntyYW5nZS5yZWFzb259PC9wPn1cbiAgICAgIDxidXR0b24gdHlwZT1cImJ1dHRvblwiIGNsYXNzTmFtZT17YWN0aXZlID8gJ2lzLWFjdGl2ZSBhYm91dC1lZGl0b3Itd2lkZS1hY3Rpb24nIDogJ2Fib3V0LWVkaXRvci13aWRlLWFjdGlvbid9IGRpc2FibGVkPXshcmFuZ2UudmFsaWR9IG9uQ2xpY2s9e3RvZ2dsZX0+e2FjdGl2ZSA/ICdTdG9wIGF1ZGl0aW9uJyA6ICdMb29wIHRoaXMgc2VsZWN0aW9uJ308L2J1dHRvbj5cbiAgICA8L2RldGFpbHM+XG4gICk7XG59XG5cbmZ1bmN0aW9uIEluc3BlY3Rvcih7IHN0b3JlLCBzbmFwc2hvdCwgdGltZWxpbmVPcGVuLCBydW50aW1lTWV0cmljcywgY2xpcGJvYXJkLCBzZXRDbGlwYm9hcmQgfSkge1xuICBjb25zdCBpbnNwZWN0b3JSZWYgPSB1c2VSZWYobnVsbCk7XG4gIGNvbnN0IGRyYWdSZWYgPSB1c2VSZWYobnVsbCk7XG4gIGNvbnN0IGxhc3RIZWFkZXJDbGlja1JlZiA9IHVzZVJlZihudWxsKTtcbiAgY29uc3QgW3Bvc2l0aW9uLCBzZXRQb3NpdGlvbl0gPSB1c2VTdGF0ZShudWxsKTtcbiAgY29uc3QgW2RyYWdnaW5nLCBzZXREcmFnZ2luZ10gPSB1c2VTdGF0ZShmYWxzZSk7XG4gIGNvbnN0IHNlY3Rpb24gPSBnZXRTZWN0aW9uKHNuYXBzaG90LmRvY3VtZW50LCBzbmFwc2hvdC5zZWxlY3Rpb24pO1xuICBsZXQgY29udGVudCA9IDxTZWN0aW9uSW5zcGVjdG9yIHN0b3JlPXtzdG9yZX0gc25hcHNob3Q9e3NuYXBzaG90fSBzZWN0aW9uPXtzZWN0aW9ufSAvPjtcbiAgaWYgKHNuYXBzaG90LnNlbGVjdGlvbi50eXBlID09PSAnc2VxdWVuY2UnKSBjb250ZW50ID0gPFNlcXVlbmNlSW5zcGVjdG9yIHN0b3JlPXtzdG9yZX0gc25hcHNob3Q9e3NuYXBzaG90fSAvPjtcbiAgaWYgKHNuYXBzaG90LnNlbGVjdGlvbi50eXBlID09PSAnY3VlJykgY29udGVudCA9IDxDdWVJbnNwZWN0b3Igc3RvcmU9e3N0b3JlfSBzbmFwc2hvdD17c25hcHNob3R9IHNlY3Rpb249e3NlY3Rpb259IGNsaXBib2FyZD17Y2xpcGJvYXJkfSBzZXRDbGlwYm9hcmQ9e3NldENsaXBib2FyZH0gLz47XG4gIGlmIChzbmFwc2hvdC5zZWxlY3Rpb24udHlwZSA9PT0gJ2Rpc2NpcGxpbmUtcmV2ZWFsJykgY29udGVudCA9IDxEaXNjaXBsaW5lUmV2ZWFsSW5zcGVjdG9yIHN0b3JlPXtzdG9yZX0gc25hcHNob3Q9e3NuYXBzaG90fSBzZWN0aW9uPXtzZWN0aW9ufSAvPjtcbiAgaWYgKHNuYXBzaG90LnNlbGVjdGlvbi50eXBlID09PSAnY2FtZXJhLWtleScpIGNvbnRlbnQgPSA8Q2FtZXJhSW5zcGVjdG9yIHN0b3JlPXtzdG9yZX0gc25hcHNob3Q9e3NuYXBzaG90fSBzZWN0aW9uPXtzZWN0aW9ufSAvPjtcbiAgaWYgKHNuYXBzaG90LnNlbGVjdGlvbi50eXBlID09PSAnd29ybGQnKSBjb250ZW50ID0gPFdvcmxkSW5zcGVjdG9yIHN0b3JlPXtzdG9yZX0gc25hcHNob3Q9e3NuYXBzaG90fSBzZWN0aW9uPXtzZWN0aW9ufSBydW50aW1lTWV0cmljcz17cnVudGltZU1ldHJpY3N9IC8+O1xuICBpZiAoc25hcHNob3Quc2VsZWN0aW9uLnR5cGUgPT09ICdpbnRlcmFjdGlvbicpIGNvbnRlbnQgPSA8U2VjdGlvbkluc3BlY3RvciBzdG9yZT17c3RvcmV9IHNuYXBzaG90PXtzbmFwc2hvdH0gc2VjdGlvbj17c2VjdGlvbn0gLz47XG5cbiAgdXNlRWZmZWN0KCgpID0+IHtcbiAgICBjb25zdCBrZWVwSW5Cb3VuZHMgPSAoKSA9PiB7XG4gICAgICBpZiAod2luZG93LmlubmVyV2lkdGggPCA3NjApIHtcbiAgICAgICAgc2V0UG9zaXRpb24obnVsbCk7XG4gICAgICAgIHJldHVybjtcbiAgICAgIH1cbiAgICAgIHNldFBvc2l0aW9uKChjdXJyZW50KSA9PiAoXG4gICAgICAgIGN1cnJlbnQgJiYgaW5zcGVjdG9yUmVmLmN1cnJlbnRcbiAgICAgICAgICA/IGNsYW1wSW5zcGVjdG9yUG9zaXRpb24oaW5zcGVjdG9yUmVmLmN1cnJlbnQsIGN1cnJlbnQsIHRpbWVsaW5lT3BlbilcbiAgICAgICAgICA6IGN1cnJlbnRcbiAgICAgICkpO1xuICAgIH07XG4gICAga2VlcEluQm91bmRzKCk7XG4gICAgd2luZG93LmFkZEV2ZW50TGlzdGVuZXIoJ3Jlc2l6ZScsIGtlZXBJbkJvdW5kcyk7XG4gICAgcmV0dXJuICgpID0+IHdpbmRvdy5yZW1vdmVFdmVudExpc3RlbmVyKCdyZXNpemUnLCBrZWVwSW5Cb3VuZHMpO1xuICB9LCBbdGltZWxpbmVPcGVuXSk7XG5cbiAgY29uc3QgYmVnaW5EcmFnID0gKGV2ZW50KSA9PiB7XG4gICAgaWYgKGV2ZW50LmJ1dHRvbiAhPT0gMCB8fCB3aW5kb3cuaW5uZXJXaWR0aCA8IDc2MCB8fCAhZXZlbnQudGFyZ2V0LmNsb3Nlc3QoJ2hlYWRlcicpKSByZXR1cm47XG4gICAgY29uc3QgaW5zcGVjdG9yID0gaW5zcGVjdG9yUmVmLmN1cnJlbnQ7XG4gICAgaWYgKCFpbnNwZWN0b3IpIHJldHVybjtcbiAgICBjb25zdCByZWN0ID0gaW5zcGVjdG9yLmdldEJvdW5kaW5nQ2xpZW50UmVjdCgpO1xuICAgIGNvbnN0IHsgbWluVG9wLCBtYXhCb3R0b20gfSA9IGdldEluc3BlY3RvclZlcnRpY2FsQm91bmRzKGluc3BlY3RvciwgdGltZWxpbmVPcGVuKTtcbiAgICBjb25zdCBhdmFpbGFibGVIZWlnaHQgPSBtYXhCb3R0b20gLSBtaW5Ub3A7XG4gICAgY29uc3QgZmxvYXRpbmdIZWlnaHQgPSBNYXRoLm1pbihyZWN0LmhlaWdodCwgNTYwLCBNYXRoLm1heCgyNDAsIGF2YWlsYWJsZUhlaWdodCAqIDAuNzIpKTtcbiAgICBjb25zdCBzdGFydCA9IGNsYW1wSW5zcGVjdG9yUG9zaXRpb24oaW5zcGVjdG9yLCB7XG4gICAgICBsZWZ0OiByZWN0LmxlZnQsXG4gICAgICB0b3A6IHJlY3QudG9wLFxuICAgICAgd2lkdGg6IHJlY3Qud2lkdGgsXG4gICAgICBoZWlnaHQ6IGZsb2F0aW5nSGVpZ2h0LFxuICAgIH0sIHRpbWVsaW5lT3Blbik7XG4gICAgZHJhZ1JlZi5jdXJyZW50ID0ge1xuICAgICAgcG9pbnRlcklkOiBldmVudC5wb2ludGVySWQsXG4gICAgICBvcmlnaW5YOiBldmVudC5jbGllbnRYLFxuICAgICAgb3JpZ2luWTogZXZlbnQuY2xpZW50WSxcbiAgICAgIHN0YXJ0LFxuICAgICAgbW92ZWQ6IGZhbHNlLFxuICAgIH07XG4gICAgaW5zcGVjdG9yLnNldFBvaW50ZXJDYXB0dXJlKGV2ZW50LnBvaW50ZXJJZCk7XG4gIH07XG5cbiAgY29uc3QgbW92ZURyYWcgPSAoZXZlbnQpID0+IHtcbiAgICBjb25zdCBkcmFnID0gZHJhZ1JlZi5jdXJyZW50O1xuICAgIGNvbnN0IGluc3BlY3RvciA9IGluc3BlY3RvclJlZi5jdXJyZW50O1xuICAgIGlmICghZHJhZyB8fCAhaW5zcGVjdG9yIHx8IGRyYWcucG9pbnRlcklkICE9PSBldmVudC5wb2ludGVySWQpIHJldHVybjtcbiAgICBjb25zdCBkZWx0YVggPSBldmVudC5jbGllbnRYIC0gZHJhZy5vcmlnaW5YO1xuICAgIGNvbnN0IGRlbHRhWSA9IGV2ZW50LmNsaWVudFkgLSBkcmFnLm9yaWdpblk7XG4gICAgaWYgKCFkcmFnLm1vdmVkICYmIE1hdGguaHlwb3QoZGVsdGFYLCBkZWx0YVkpIDwgMykgcmV0dXJuO1xuICAgIGRyYWcubW92ZWQgPSB0cnVlO1xuICAgIHNldERyYWdnaW5nKHRydWUpO1xuICAgIHNldFBvc2l0aW9uKGNsYW1wSW5zcGVjdG9yUG9zaXRpb24oaW5zcGVjdG9yLCB7XG4gICAgICAuLi5kcmFnLnN0YXJ0LFxuICAgICAgbGVmdDogZHJhZy5zdGFydC5sZWZ0ICsgZGVsdGFYLFxuICAgICAgdG9wOiBkcmFnLnN0YXJ0LnRvcCArIGRlbHRhWSxcbiAgICB9LCB0aW1lbGluZU9wZW4pKTtcbiAgfTtcblxuICBjb25zdCBlbmREcmFnID0gKGV2ZW50KSA9PiB7XG4gICAgY29uc3QgZHJhZyA9IGRyYWdSZWYuY3VycmVudDtcbiAgICBpZiAoZHJhZz8ucG9pbnRlcklkICE9PSBldmVudC5wb2ludGVySWQpIHJldHVybjtcbiAgICBpZiAoIWRyYWcubW92ZWQpIHtcbiAgICAgIGNvbnN0IG5vdyA9IHBlcmZvcm1hbmNlLm5vdygpO1xuICAgICAgY29uc3QgcHJldmlvdXMgPSBsYXN0SGVhZGVyQ2xpY2tSZWYuY3VycmVudDtcbiAgICAgIGlmIChwcmV2aW91cyAmJiBub3cgLSBwcmV2aW91cy50aW1lIDwgMzYwXG4gICAgICAgICYmIE1hdGguaHlwb3QoZXZlbnQuY2xpZW50WCAtIHByZXZpb3VzLngsIGV2ZW50LmNsaWVudFkgLSBwcmV2aW91cy55KSA8IDYpIHtcbiAgICAgICAgc2V0UG9zaXRpb24obnVsbCk7XG4gICAgICAgIGxhc3RIZWFkZXJDbGlja1JlZi5jdXJyZW50ID0gbnVsbDtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGxhc3RIZWFkZXJDbGlja1JlZi5jdXJyZW50ID0geyB0aW1lOiBub3csIHg6IGV2ZW50LmNsaWVudFgsIHk6IGV2ZW50LmNsaWVudFkgfTtcbiAgICAgIH1cbiAgICB9XG4gICAgZHJhZ1JlZi5jdXJyZW50ID0gbnVsbDtcbiAgICBzZXREcmFnZ2luZyhmYWxzZSk7XG4gICAgaWYgKGluc3BlY3RvclJlZi5jdXJyZW50Py5oYXNQb2ludGVyQ2FwdHVyZShldmVudC5wb2ludGVySWQpKSB7XG4gICAgICBpbnNwZWN0b3JSZWYuY3VycmVudC5yZWxlYXNlUG9pbnRlckNhcHR1cmUoZXZlbnQucG9pbnRlcklkKTtcbiAgICB9XG4gIH07XG5cbiAgY29uc3QgcmVzZXRQb3NpdGlvbiA9ICgpID0+IHNldFBvc2l0aW9uKG51bGwpO1xuXG4gIHJldHVybiAoXG4gICAgPGFzaWRlXG4gICAgICByZWY9e2luc3BlY3RvclJlZn1cbiAgICAgIGNsYXNzTmFtZT17YGFib3V0LWVkaXRvci1pbnNwZWN0b3Ike2RyYWdnaW5nID8gJyBpcy1kcmFnZ2luZycgOiAnJ31gfVxuICAgICAgZGF0YS1mbG9hdGluZz17cG9zaXRpb24gPyAndHJ1ZScgOiAnZmFsc2UnfVxuICAgICAgc3R5bGU9e3Bvc2l0aW9uID8ge1xuICAgICAgICBsZWZ0OiBwb3NpdGlvbi5sZWZ0LFxuICAgICAgICB0b3A6IHBvc2l0aW9uLnRvcCxcbiAgICAgICAgcmlnaHQ6ICdhdXRvJyxcbiAgICAgICAgYm90dG9tOiAnYXV0bycsXG4gICAgICAgIHdpZHRoOiBwb3NpdGlvbi53aWR0aCxcbiAgICAgICAgaGVpZ2h0OiBwb3NpdGlvbi5oZWlnaHQsXG4gICAgICB9IDogdW5kZWZpbmVkfVxuICAgICAgb25Qb2ludGVyRG93bj17YmVnaW5EcmFnfVxuICAgICAgb25Qb2ludGVyTW92ZT17bW92ZURyYWd9XG4gICAgICBvblBvaW50ZXJVcD17ZW5kRHJhZ31cbiAgICAgIG9uUG9pbnRlckNhbmNlbD17ZW5kRHJhZ31cbiAgICAgIG9uRG91YmxlQ2xpY2s9e3Jlc2V0UG9zaXRpb259XG4gICAgPjxkaXYgY2xhc3NOYW1lPVwiYWJvdXQtZWRpdG9yLWluc3BlY3Rvci1zY3JvbGxcIj57Y29udGVudH08QXVkaXRpb25Db250cm9scyBzdG9yZT17c3RvcmV9IHNuYXBzaG90PXtzbmFwc2hvdH0gLz48RGlhZ25vc3RpY3MgZGlhZ25vc3RpY3M9e3NuYXBzaG90LmRpYWdub3N0aWNzfSAvPjwvZGl2PjwvYXNpZGU+XG4gICk7XG59XG5cbmZ1bmN0aW9uIENhbWVyYVBhdGhPdmVybGF5KHsgc25hcHNob3QgfSkge1xuICBjb25zdCBzZWN0aW9ucyA9IHNuYXBzaG90LmNvbXBpbGVkUGxhbj8uc2VjdGlvbnMgfHwgW107XG4gIGNvbnN0IHRvdGFsID0gc25hcHNob3QuY29tcGlsZWRQbGFuPy5tYXhTdG9yeVdVIHx8IDE7XG4gIHJldHVybiAoXG4gICAgPGRpdiBjbGFzc05hbWU9XCJhYm91dC1lZGl0b3ItcGF0aC1vdmVybGF5XCIgYXJpYS1sYWJlbD1cIkNhbWVyYSBwYXRoIG92ZXJsYXlcIj5cbiAgICAgIDxkaXY+PHN0cm9uZz5QYXRoIMK3IGNvbnN0YW50IGNhZGVuY2U8L3N0cm9uZz48c3Bhbj57Zm9ybWF0V1Uoc25hcHNob3QudHJhbnNwb3J0LnN0b3J5V1UpfSAvIHtmb3JtYXRXVSh0b3RhbCl9PC9zcGFuPjwvZGl2PlxuICAgICAgPHN2ZyB2aWV3Qm94PVwiMCAwIDI0MCAxMTJcIiByb2xlPVwiaW1nXCIgYXJpYS1sYWJlbD1cIkNhbWVyYSBhbmQgV29ybGQgYW5jaG9ycyBvdmVyIHN0b3J5IGRpc3RhbmNlXCI+XG4gICAgICAgIDxwYXRoIGQ9XCJNMTggNTYgSDIyMlwiIC8+XG4gICAgICAgIHtzZWN0aW9ucy5tYXAoKHNlY3Rpb24pID0+IHtcbiAgICAgICAgICBjb25zdCB4ID0gMTggKyAoKHNlY3Rpb24uc3RhcnRXVSAvIHRvdGFsKSAqIDIwNCk7XG4gICAgICAgICAgcmV0dXJuIDxnIGtleT17c2VjdGlvbi5pZH0gdHJhbnNmb3JtPXtgdHJhbnNsYXRlKCR7eH0gNTYpYH0+PGxpbmUgeTE9XCItMTJcIiB5Mj1cIjEyXCIgLz48Y2lyY2xlIHI9e3NlY3Rpb24ud29ybGRTdGF0ZT8uY2hhbmdlc1dvcmxkID8gNCA6IDJ9IC8+PHRpdGxlPntzZWN0aW9uLmxhYmVsfXtzZWN0aW9uLndvcmxkU3RhdGU/LmNoYW5nZXNXb3JsZCA/IGAgwrcgJHtzZWN0aW9uLndvcmxkU3RhdGUuYWN0aXZlV29ybGQuc2hhcGVJZH1gIDogJyd9PC90aXRsZT48L2c+O1xuICAgICAgICB9KX1cbiAgICAgICAgPGcgY2xhc3NOYW1lPVwiaXMtcGxheWhlYWRcIiB0cmFuc2Zvcm09e2B0cmFuc2xhdGUoJHsxOCArICgoc25hcHNob3QudHJhbnNwb3J0LnN0b3J5V1UgLyB0b3RhbCkgKiAyMDQpfSA1NilgfT48cGF0aCBkPVwiTTAgLTIyIEw1IC0xNSBILTUgWlwiIC8+PGxpbmUgeTE9XCItMTVcIiB5Mj1cIjIyXCIgLz48L2c+XG4gICAgICA8L3N2Zz5cbiAgICAgIDxzbWFsbD5Eb3RzIGFyZSBTZWN0aW9uIGJvdW5kYXJpZXMuIExhcmdlIGRvdHMgYXJlIGZpeGVkIFdvcmxkIGFuY2hvcnMuIFRoZSBtYXJrZXIgaXMgdGhlIHB1Ymxpc2hlZCBjYW1lcmEuPC9zbWFsbD5cbiAgICA8L2Rpdj5cbiAgKTtcbn1cblxuZXhwb3J0IGRlZmF1bHQgZnVuY3Rpb24gQWJvdXROYXJyYXRpdmVFZGl0b3IoeyBzdG9yZSwgcnVudGltZVJlZiwgcm9vdFJlZiB9KSB7XG4gIGNvbnN0IHNuYXBzaG90ID0gdXNlU3luY0V4dGVybmFsU3RvcmUoc3RvcmUuc3Vic2NyaWJlLCBzdG9yZS5nZXRTbmFwc2hvdCk7XG4gIGNvbnN0IFtjaGVja3BvaW50cywgc2V0Q2hlY2twb2ludHNdID0gdXNlU3RhdGUoKCkgPT4gcmVhZEFib3V0TmFycmF0aXZlQ2hlY2twb2ludHMoKSk7XG4gIGNvbnN0IFtjbGlwYm9hcmQsIHNldENsaXBib2FyZF0gPSB1c2VTdGF0ZShudWxsKTtcbiAgY29uc3QgW3J1bnRpbWVNZXRyaWNzLCBzZXRSdW50aW1lTWV0cmljc10gPSB1c2VTdGF0ZShudWxsKTtcbiAgY29uc3QgW3BhdGhWaXNpYmxlLCBzZXRQYXRoVmlzaWJsZV0gPSB1c2VTdGF0ZShmYWxzZSk7XG4gIGNvbnN0IFtkaXJlY3RvclZpZXcsIHNldERpcmVjdG9yVmlld10gPSB1c2VTdGF0ZShmYWxzZSk7XG4gIGNvbnN0IFttb2JpbGVQYW5lLCBzZXRNb2JpbGVQYW5lXSA9IHVzZVN0YXRlKCdzZXF1ZW5jZScpO1xuICBjb25zdCBbdGltZWxpbmVPcGVuLCBzZXRUaW1lbGluZU9wZW5dID0gdXNlU3RhdGUoKCkgPT4gKFxuICAgIHdpbmRvdy5sb2NhbFN0b3JhZ2UuZ2V0SXRlbShBQk9VVF9FRElUT1JfVElNRUxJTkVfU1RPUkFHRV9LRVkpICE9PSAnY2xvc2VkJ1xuICApKTtcbiAgY29uc3QgaW1wb3J0UmVmID0gdXNlUmVmKG51bGwpO1xuICBjb25zdCBzbmFwc2hvdFJlZiA9IHVzZVJlZihzbmFwc2hvdCk7XG4gIGNvbnN0IGFjdGl2ZVNlbGVjdGlvbiA9IHNuYXBzaG90LnNlbGVjdGlvbjtcblxuICB1c2VFZmZlY3QoKCkgPT4ge1xuICAgIHNuYXBzaG90UmVmLmN1cnJlbnQgPSBzbmFwc2hvdDtcbiAgfSwgW3NuYXBzaG90XSk7XG5cbiAgdXNlRWZmZWN0KCgpID0+IHtcbiAgICB3aW5kb3cubG9jYWxTdG9yYWdlLnNldEl0ZW0oQUJPVVRfRURJVE9SX1RJTUVMSU5FX1NUT1JBR0VfS0VZLCB0aW1lbGluZU9wZW4gPyAnb3BlbicgOiAnY2xvc2VkJyk7XG4gIH0sIFt0aW1lbGluZU9wZW5dKTtcblxuICB1c2VFZmZlY3QoKCkgPT4ge1xuICAgIGNvbnN0IHJvb3QgPSByb290UmVmLmN1cnJlbnQ7XG4gICAgY29uc3QgcnVudGltZSA9IHJ1bnRpbWVSZWYuY3VycmVudDtcbiAgICByb290Py5zZXRBdHRyaWJ1dGUoJ2RhdGEtZWRpdG9yLWFjdGl2ZScsICd0cnVlJyk7XG4gICAgbG9hZEFib3V0TmFycmF0aXZlU291cmNlKCkudGhlbigoeyBkb2N1bWVudCwgaGFzaCB9KSA9PiB7XG4gICAgICBjb25zdCBjdXJyZW50ID0gc3RvcmUuZ2V0U25hcHNob3QoKTtcbiAgICAgIGlmICghY3VycmVudC5kaXJ0eSkgc3RvcmUucmVwbGFjZURvY3VtZW50KCdSZWZyZXNoIGNhbm9uaWNhbCBzb3VyY2UnLCBkb2N1bWVudCk7XG4gICAgICBzdG9yZS5zZXRCYXNlbGluZShkb2N1bWVudCwgaGFzaCk7XG4gICAgICBjb25zdCByZWNvdmVyeSA9IHJlYWRBYm91dE5hcnJhdGl2ZVJlY292ZXJ5RHJhZnQoKTtcbiAgICAgIGlmIChyZWNvdmVyeSAmJiByZWNvdmVyeS50aW1lc3RhbXAgPiBEYXRlLm5vdygpIC0gKDE0ICogODY0MDAwMDApKSB7XG4gICAgICAgIHN0b3JlLnNldFJlY292ZXJ5U3RhdGUoeyBhdmFpbGFibGU6IHRydWUsIGRyYWZ0OiByZWNvdmVyeSwgZXJyb3I6ICcnIH0pO1xuICAgICAgfVxuICAgIH0pLmNhdGNoKChlcnJvcikgPT4gc3RvcmUuc2V0U2F2ZVN0YXRlKHsgc3RhdHVzOiAnZmFpbGVkJywgbWVzc2FnZTogZXJyb3IubWVzc2FnZSB9KSk7XG4gICAgcmV0dXJuICgpID0+IHtcbiAgICAgIHJvb3Q/LnJlbW92ZUF0dHJpYnV0ZSgnZGF0YS1lZGl0b3ItYWN0aXZlJyk7XG4gICAgICBydW50aW1lPy5zZXREaXJlY3RvclZpZXc/LihmYWxzZSk7XG4gICAgfTtcbiAgfSwgW3Jvb3RSZWYsIHJ1bnRpbWVSZWYsIHN0b3JlXSk7XG5cbiAgdXNlRWZmZWN0KCgpID0+IHtcbiAgICBjb25zdCByb290ID0gcm9vdFJlZi5jdXJyZW50O1xuICAgIGlmICghcm9vdCkgcmV0dXJuIHVuZGVmaW5lZDtcbiAgICByb290LnF1ZXJ5U2VsZWN0b3JBbGwoJy5pcy1lZGl0b3Itc2VsZWN0ZWQnKS5mb3JFYWNoKChub2RlKSA9PiBub2RlLmNsYXNzTGlzdC5yZW1vdmUoJ2lzLWVkaXRvci1zZWxlY3RlZCcpKTtcbiAgICBnZXRBYm91dE5hcnJhdGl2ZVNlbGVjdGlvbk1lbWJlcnMoYWN0aXZlU2VsZWN0aW9uKS5mb3JFYWNoKChtZW1iZXIpID0+IHtcbiAgICAgIHJvb3QucXVlcnlTZWxlY3RvcihgW2RhdGEtdGV4dC1jdWU9XCIke0NTUy5lc2NhcGUobWVtYmVyLmN1ZUlkKX1cIl1gKT8uY2xhc3NMaXN0LmFkZCgnaXMtZWRpdG9yLXNlbGVjdGVkJyk7XG4gICAgfSk7XG4gICAgcm9vdC5kYXRhc2V0LmVkaXRvclNlbGVjdGlvblR5cGUgPSBhY3RpdmVTZWxlY3Rpb24udHlwZSB8fCAnJztcbiAgICByZXR1cm4gKCkgPT4ge1xuICAgICAgcm9vdC5xdWVyeVNlbGVjdG9yQWxsKCcuaXMtZWRpdG9yLXNlbGVjdGVkJykuZm9yRWFjaCgobm9kZSkgPT4gbm9kZS5jbGFzc0xpc3QucmVtb3ZlKCdpcy1lZGl0b3Itc2VsZWN0ZWQnKSk7XG4gICAgICBkZWxldGUgcm9vdC5kYXRhc2V0LmVkaXRvclNlbGVjdGlvblR5cGU7XG4gICAgfTtcbiAgfSwgW2FjdGl2ZVNlbGVjdGlvbiwgcm9vdFJlZl0pO1xuXG4gIHVzZUVmZmVjdCgoKSA9PiB7XG4gICAgY29uc3QgaW50ZXJ2YWwgPSB3aW5kb3cuc2V0SW50ZXJ2YWwoKCkgPT4gc2V0UnVudGltZU1ldHJpY3MocnVudGltZVJlZi5jdXJyZW50Py5nZXRNZXRyaWNzPy4oKSB8fCBudWxsKSwgNTAwKTtcbiAgICByZXR1cm4gKCkgPT4gd2luZG93LmNsZWFySW50ZXJ2YWwoaW50ZXJ2YWwpO1xuICB9LCBbcnVudGltZVJlZl0pO1xuXG4gIHVzZUVmZmVjdCgoKSA9PiB7XG4gICAgaWYgKCFzbmFwc2hvdC5kaXJ0eSkgcmV0dXJuIHVuZGVmaW5lZDtcbiAgICBjb25zdCB0aW1lciA9IHdpbmRvdy5zZXRUaW1lb3V0KCgpID0+IHtcbiAgICAgIHRyeSB7XG4gICAgICAgIHdyaXRlQWJvdXROYXJyYXRpdmVSZWNvdmVyeURyYWZ0KHNuYXBzaG90LmRvY3VtZW50LCBzbmFwc2hvdC5iYXNlbGluZUhhc2gpO1xuICAgICAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICAgICAgc3RvcmUuc2V0UmVjb3ZlcnlTdGF0ZSh7IGVycm9yOiBgRHJhZnQgc3RvcmFnZSBmYWlsZWQ6ICR7ZXJyb3IubWVzc2FnZX1gIH0pO1xuICAgICAgfVxuICAgIH0sIDkwMCk7XG4gICAgcmV0dXJuICgpID0+IHdpbmRvdy5jbGVhclRpbWVvdXQodGltZXIpO1xuICB9LCBbc25hcHNob3QuYmFzZWxpbmVIYXNoLCBzbmFwc2hvdC5kaXJ0eSwgc25hcHNob3QuZG9jdW1lbnQsIHN0b3JlXSk7XG5cbiAgdXNlRWZmZWN0KCgpID0+IHtcbiAgICBjb25zdCBwYWdlaGlkZSA9ICgpID0+IHtcbiAgICAgIGNvbnN0IGN1cnJlbnQgPSBzbmFwc2hvdFJlZi5jdXJyZW50O1xuICAgICAgaWYgKGN1cnJlbnQuZGlydHkpIHtcbiAgICAgICAgdHJ5IHsgd3JpdGVBYm91dE5hcnJhdGl2ZVJlY292ZXJ5RHJhZnQoY3VycmVudC5kb2N1bWVudCwgY3VycmVudC5iYXNlbGluZUhhc2gpOyB9IGNhdGNoIHsgLyogc3VyZmFjZWQgYnkgbm9ybWFsIGF1dG9zYXZlICovIH1cbiAgICAgIH1cbiAgICB9O1xuICAgIGNvbnN0IGtleWRvd24gPSAoZXZlbnQpID0+IHtcbiAgICAgIGlmICgoZXZlbnQubWV0YUtleSB8fCBldmVudC5jdHJsS2V5KSAmJiBldmVudC5rZXkudG9Mb3dlckNhc2UoKSA9PT0gJ3MnKSB7XG4gICAgICAgIGV2ZW50LnByZXZlbnREZWZhdWx0KCk7XG4gICAgICAgIGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3IoJ1tkYXRhLWFib3V0LWVkaXRvci1zYXZlXScpPy5jbGljaygpO1xuICAgICAgfVxuICAgICAgaWYgKChldmVudC5tZXRhS2V5IHx8IGV2ZW50LmN0cmxLZXkpICYmIGV2ZW50LmtleS50b0xvd2VyQ2FzZSgpID09PSAneicpIHtcbiAgICAgICAgZXZlbnQucHJldmVudERlZmF1bHQoKTtcbiAgICAgICAgZXZlbnQuc2hpZnRLZXkgPyBzdG9yZS5yZWRvKCkgOiBzdG9yZS51bmRvKCk7XG4gICAgICB9XG4gICAgICBpZiAoIWV2ZW50Lm1ldGFLZXkgJiYgIWV2ZW50LmN0cmxLZXkgJiYgIWV2ZW50LmFsdEtleSAmJiAhZXZlbnQuc2hpZnRLZXlcbiAgICAgICAgJiYgIWlzVGV4dEVkaXRpbmdUYXJnZXQoZXZlbnQudGFyZ2V0KSAmJiBbJ0Fycm93TGVmdCcsICdBcnJvd1JpZ2h0J10uaW5jbHVkZXMoZXZlbnQua2V5KSkge1xuICAgICAgICBldmVudC5wcmV2ZW50RGVmYXVsdCgpO1xuICAgICAgICBqdW1wVGltZWxpbmVLZXlmcmFtZShzdG9yZSwgc3RvcmUuZ2V0U25hcHNob3QoKSwgZXZlbnQua2V5ID09PSAnQXJyb3dSaWdodCcgPyAxIDogLTEpO1xuICAgICAgfVxuICAgICAgaWYgKCFldmVudC5tZXRhS2V5ICYmICFldmVudC5jdHJsS2V5ICYmICFldmVudC5hbHRLZXlcbiAgICAgICAgJiYgIWlzVGV4dEVkaXRpbmdUYXJnZXQoZXZlbnQudGFyZ2V0KSAmJiBbJ0JhY2tzcGFjZScsICdEZWxldGUnXS5pbmNsdWRlcyhldmVudC5rZXkpXG4gICAgICAgICYmIGRlbGV0ZVRpbWVsaW5lU2VsZWN0aW9uKHN0b3JlLCBzdG9yZS5nZXRTbmFwc2hvdCgpKSkge1xuICAgICAgICBldmVudC5wcmV2ZW50RGVmYXVsdCgpO1xuICAgICAgfVxuICAgICAgaWYgKGV2ZW50LmtleSA9PT0gJ0VzY2FwZScpIHtcbiAgICAgICAgY29uc3QgY3VycmVudCA9IHN0b3JlLmdldFNuYXBzaG90KCk7XG4gICAgICAgIGlmIChjdXJyZW50LnByZXZpZXdTdGF0ZSkgc3RvcmUuY2FuY2VsUHJldmlldygpO1xuICAgICAgICBlbHNlIGlmIChjdXJyZW50LnRyeVN0YXRlKSBzdG9yZS5jYW5jZWxUcnkoKTtcbiAgICAgICAgZWxzZSBpZiAoZ2V0QWJvdXROYXJyYXRpdmVTZWxlY3Rpb25NZW1iZXJzKGN1cnJlbnQuc2VsZWN0aW9uKS5sZW5ndGggPiAxKSB7XG4gICAgICAgICAgc3RvcmUuc2V0U2VsZWN0aW9uKHtcbiAgICAgICAgICAgIHR5cGU6ICdjdWUnLFxuICAgICAgICAgICAgc2VjdGlvbklkOiBjdXJyZW50LnNlbGVjdGlvbi5zZWN0aW9uSWQsXG4gICAgICAgICAgICBjdWVJZDogY3VycmVudC5zZWxlY3Rpb24uY3VlSWQsXG4gICAgICAgICAgICBrZXlQYXJ0OiBjdXJyZW50LnNlbGVjdGlvbi5rZXlQYXJ0IHx8ICdmb2N1cycsXG4gICAgICAgICAgfSk7XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSBpZiAoY3VycmVudC5zZWxlY3Rpb24udHlwZSAhPT0gJ3NlY3Rpb24nKSBzdG9yZS5zZXRTZWxlY3Rpb24oeyB0eXBlOiAnc2VjdGlvbicsIHNlY3Rpb25JZDogY3VycmVudC5zZWxlY3Rpb24uc2VjdGlvbklkIH0pO1xuICAgICAgICBlbHNlIHN0b3JlLnNldFNlbGVjdGlvbih7IHR5cGU6ICdzZXF1ZW5jZScgfSk7XG4gICAgICB9XG4gICAgfTtcbiAgICB3aW5kb3cuYWRkRXZlbnRMaXN0ZW5lcigncGFnZWhpZGUnLCBwYWdlaGlkZSk7XG4gICAgd2luZG93LmFkZEV2ZW50TGlzdGVuZXIoJ2tleWRvd24nLCBrZXlkb3duKTtcbiAgICByZXR1cm4gKCkgPT4geyB3aW5kb3cucmVtb3ZlRXZlbnRMaXN0ZW5lcigncGFnZWhpZGUnLCBwYWdlaGlkZSk7IHdpbmRvdy5yZW1vdmVFdmVudExpc3RlbmVyKCdrZXlkb3duJywga2V5ZG93bik7IH07XG4gIH0sIFtzdG9yZV0pO1xuXG4gIGNvbnN0IHNhdmUgPSBhc3luYyAoKSA9PiB7XG4gICAgY29uc3QgZWRpdG9yVXJsID0gbmV3IFVSTCh3aW5kb3cubG9jYXRpb24uaHJlZik7XG4gICAgZWRpdG9yVXJsLnNlYXJjaFBhcmFtcy5zZXQoJ2VkaXQnLCAnMScpO1xuICAgIHdpbmRvdy5oaXN0b3J5LnJlcGxhY2VTdGF0ZSh3aW5kb3cuaGlzdG9yeS5zdGF0ZSwgJycsIGAke2VkaXRvclVybC5wYXRobmFtZX0ke2VkaXRvclVybC5zZWFyY2h9JHtlZGl0b3JVcmwuaGFzaH1gKTtcbiAgICBjb25zdCBzZW50ID0gY2xvbmVBYm91dE5hcnJhdGl2ZURvY3VtZW50KHNuYXBzaG90LmRvY3VtZW50KTtcbiAgICBpZiAoc25hcHNob3QuZGlhZ25vc3RpY3Muc29tZSgoaXRlbSkgPT4gaXRlbS5sZXZlbCA9PT0gJ2Vycm9yJykpIHtcbiAgICAgIHN0b3JlLnNldFNhdmVTdGF0ZSh7IHN0YXR1czogJ2ZhaWxlZCcsIG1lc3NhZ2U6ICdSZXNvbHZlIHZhbGlkYXRpb24gZXJyb3JzIGJlZm9yZSBzYXZpbmcuJyB9KTtcbiAgICAgIHJldHVybjtcbiAgICB9XG4gICAgc3RvcmUuc2V0U2F2ZVN0YXRlKHsgc3RhdHVzOiAnc2F2aW5nJywgbWVzc2FnZTogJycgfSk7XG4gICAgdHJ5IHtcbiAgICAgIGNvbnN0IHJlc3VsdCA9IGF3YWl0IHNhdmVBYm91dE5hcnJhdGl2ZVNvdXJjZShzZW50LCBzbmFwc2hvdC5iYXNlbGluZUhhc2gpO1xuICAgICAgc3RvcmUubWFya1NhdmVkKHNlbnQsIHJlc3VsdC5oYXNoKTtcbiAgICAgIGNsZWFyQWJvdXROYXJyYXRpdmVSZWNvdmVyeURyYWZ0KCk7XG4gICAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICAgIHN0b3JlLnNldFNhdmVTdGF0ZSh7IHN0YXR1czogZXJyb3Iuc3RhdHVzID09PSA0MDkgPyAnY29uZmxpY3QnIDogJ2ZhaWxlZCcsIG1lc3NhZ2U6IGVycm9yLm1lc3NhZ2UgfSk7XG4gICAgfVxuICB9O1xuXG4gIGNvbnN0IGFkZENoZWNrcG9pbnQgPSAoKSA9PiB7XG4gICAgY29uc3QgY2hlY2twb2ludCA9IHtcbiAgICAgIGlkOiBjcnlwdG8ucmFuZG9tVVVJRCgpLFxuICAgICAgbmFtZTogYENoZWNrcG9pbnQgJHtuZXcgRGF0ZSgpLnRvTG9jYWxlVGltZVN0cmluZyhbXSwgeyBob3VyOiAnMi1kaWdpdCcsIG1pbnV0ZTogJzItZGlnaXQnIH0pfWAsXG4gICAgICB0aW1lc3RhbXA6IERhdGUubm93KCksXG4gICAgICBzdG9yeVdVOiBzbmFwc2hvdC50cmFuc3BvcnQuc3RvcnlXVSxcbiAgICAgIGJhc2VTb3VyY2VIYXNoOiBzbmFwc2hvdC5iYXNlbGluZUhhc2gsXG4gICAgICBkb2N1bWVudDogc25hcHNob3QuZG9jdW1lbnQsXG4gICAgfTtcbiAgICBzZXRDaGVja3BvaW50cyh3cml0ZUFib3V0TmFycmF0aXZlQ2hlY2twb2ludChjaGVja3BvaW50KSk7XG4gIH07XG4gIGNvbnN0IHN0YXR1c0xhYmVsID0gc25hcHNob3Quc2F2ZVN0YXRlLnN0YXR1cyA9PT0gJ3NhdmluZycgPyAnU2F2aW5n4oCmJ1xuICAgIDogc25hcHNob3Quc2F2ZVN0YXRlLnN0YXR1cyA9PT0gJ2NvbmZsaWN0JyA/ICdTb3VyY2UgY2hhbmdlZCdcbiAgICAgIDogc25hcHNob3Quc2F2ZVN0YXRlLnN0YXR1cyA9PT0gJ2ZhaWxlZCcgPyAnU2F2ZSBmYWlsZWQnXG4gICAgICAgIDogc25hcHNob3QuZGlydHkgPyAnRHJhZnQnIDogJ1NhdmVkJztcbiAgY29uc3Qgc2VsZWN0ZWQgPSBnZXRTZWN0aW9uKHNuYXBzaG90LmRvY3VtZW50LCBzbmFwc2hvdC5zZWxlY3Rpb24pO1xuICBjb25zdCBjb21waWxlZFNlbGVjdGVkID0gc25hcHNob3QuY29tcGlsZWRQbGFuPy5zZWN0aW9ucy5maW5kKChzZWN0aW9uKSA9PiBzZWN0aW9uLmlkID09PSBzZWxlY3RlZD8uaWQpO1xuICBjb25zdCByZXNvbHZlZEV4dGVudCA9IGNvbXBpbGVkU2VsZWN0ZWQ/LnJlc29sdmVkRXh0ZW50V1UgfHwgc2VsZWN0ZWQ/LmV4dGVudFdVIHx8IDA7XG4gIGNvbnN0IHNlbGVjdGVkRXh0ZW50ID0gc2VsZWN0ZWRcbiAgICA/IE51bWJlcihzbmFwc2hvdC5wcmV2aWV3UHJvZmlsZSA9PT0gJ21vYmlsZScgPyBzZWxlY3RlZC5tb2JpbGVFeHRlbnRXVSA6IHNlbGVjdGVkLmV4dGVudFdVKVxuICAgIDogMDtcbiAgY29uc3Qgc2VsZWN0ZWRDdWVDb3VudCA9IGdldEFib3V0TmFycmF0aXZlU2VsZWN0aW9uTWVtYmVycyhzbmFwc2hvdC5zZWxlY3Rpb24pLmxlbmd0aDtcbiAgY29uc3QgbG9vcEFjdGl2ZSA9IEJvb2xlYW4oc25hcHNob3QudHJhbnNwb3J0Lmxvb3ApO1xuICBjb25zdCB0aW1lbGluZURlbGV0aW9uID0gZ2V0VGltZWxpbmVEZWxldGlvbihzbmFwc2hvdCk7XG4gIGNvbnN0IHRvZ2dsZUxvb3AgPSAoKSA9PiB7XG4gICAgaWYgKGxvb3BBY3RpdmUpIHtcbiAgICAgIHN0b3JlLnNldFRyYW5zcG9ydCh7IG93bmVyOiAndGltZWxpbmUnLCBwbGF5aW5nOiBmYWxzZSwgbG9vcDogbnVsbCB9KTtcbiAgICAgIHJldHVybjtcbiAgICB9XG4gICAgY29uc3QgcmFuZ2UgPSBkZXJpdmVBYm91dE5hcnJhdGl2ZUxvb3BSYW5nZSh7XG4gICAgICBkb2N1bWVudDogc25hcHNob3QuZG9jdW1lbnQsXG4gICAgICBwbGFuOiBzbmFwc2hvdC5jb21waWxlZFBsYW4sXG4gICAgICBzb3VyY2U6IHNlbGVjdGVkID8geyB0eXBlOiAnc2VjdGlvbicsIHNlY3Rpb25JZDogc2VsZWN0ZWQuaWQgfSA6IG51bGwsXG4gICAgfSk7XG4gICAgaWYgKHJhbmdlLnZhbGlkKSBzdG9yZS5zZXRUcmFuc3BvcnQoeyBsb29wOiByYW5nZSB9KTtcbiAgfTtcbiAgY29uc3QgdG9nZ2xlU29sbyA9ICh0cmFjaykgPT4gc3RvcmUuc2V0VHJhbnNwb3J0KHtcbiAgICBzb2xvVHJhY2s6IHNuYXBzaG90LnRyYW5zcG9ydC5zb2xvVHJhY2sgPT09IHRyYWNrID8gbnVsbCA6IHRyYWNrLFxuICB9KTtcbiAgY29uc3QgZml0U2VxdWVuY2UgPSAoKSA9PiB7XG4gICAgc3RvcmUuc2V0VHJhbnNwb3J0KHsgem9vbTogMSB9KTtcbiAgICByZXF1ZXN0QW5pbWF0aW9uRnJhbWUoKCkgPT4ge1xuICAgICAgY29uc3QgbGFuZXMgPSBkb2N1bWVudC5xdWVyeVNlbGVjdG9yKCcuYWJvdXQtZWRpdG9yLWxhbmVzJyk7XG4gICAgICBpZiAobGFuZXMpIGxhbmVzLnNjcm9sbExlZnQgPSAwO1xuICAgIH0pO1xuICB9O1xuICBjb25zdCBmaXRTZWN0aW9uID0gKCkgPT4ge1xuICAgIGlmICghY29tcGlsZWRTZWxlY3RlZCB8fCAhc25hcHNob3QuY29tcGlsZWRQbGFuPy5tYXhTdG9yeVdVKSByZXR1cm47XG4gICAgY29uc3Qgc2VjdGlvblNwYW4gPSBNYXRoLm1heCgwLjAwMSwgY29tcGlsZWRTZWxlY3RlZC5yZXNvbHZlZEV4dGVudFdVKTtcbiAgICBjb25zdCB6b29tID0gTWF0aC5taW4oOCwgTWF0aC5tYXgoMSwgKHNuYXBzaG90LmNvbXBpbGVkUGxhbi5tYXhTdG9yeVdVIC8gc2VjdGlvblNwYW4pICogMC44MikpO1xuICAgIHN0b3JlLnNldFRyYW5zcG9ydCh7IHpvb206IE51bWJlcih6b29tLnRvRml4ZWQoMykpIH0pO1xuICAgIHJlcXVlc3RBbmltYXRpb25GcmFtZSgoKSA9PiB7XG4gICAgICBjb25zdCBsYW5lcyA9IGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3IoJy5hYm91dC1lZGl0b3ItbGFuZXMnKTtcbiAgICAgIGlmICghbGFuZXMpIHJldHVybjtcbiAgICAgIGNvbnN0IHN0YXJ0UmF0aW8gPSBjb21waWxlZFNlbGVjdGVkLnN0YXJ0V1UgLyBzbmFwc2hvdC5jb21waWxlZFBsYW4ubWF4U3RvcnlXVTtcbiAgICAgIGxhbmVzLnNjcm9sbExlZnQgPSBNYXRoLm1heCgwLCAoc3RhcnRSYXRpbyAqIGxhbmVzLnNjcm9sbFdpZHRoKSAtIChsYW5lcy5jbGllbnRXaWR0aCAqIDAuMDgpKTtcbiAgICB9KTtcbiAgfTtcbiAgY29uc3QgdG9nZ2xlRGlyZWN0b3IgPSAoKSA9PiB7XG4gICAgY29uc3QgbmV4dCA9ICFkaXJlY3RvclZpZXc7XG4gICAgc2V0RGlyZWN0b3JWaWV3KG5leHQpO1xuICAgIHJ1bnRpbWVSZWYuY3VycmVudD8uc2V0RGlyZWN0b3JWaWV3Py4obmV4dCk7XG4gIH07XG4gIGNvbnN0IHRvZ2dsZUJlZm9yZSA9ICgpID0+IHtcbiAgICBpZiAoc25hcHNob3QudHJ5U3RhdGU/LmxhYmVsID09PSAnQ29tcGFyZSBzYXZlZCBzb3VyY2UnKSB7XG4gICAgICBzdG9yZS5jYW5jZWxUcnkoKTtcbiAgICAgIHJldHVybjtcbiAgICB9XG4gICAgaWYgKHNuYXBzaG90LnRyeVN0YXRlKSByZXR1cm47XG4gICAgc3RvcmUuYmVnaW5UcnkoJ0NvbXBhcmUgc2F2ZWQgc291cmNlJywgKGRyYWZ0KSA9PiB7XG4gICAgICBPYmplY3Qua2V5cyhkcmFmdCkuZm9yRWFjaCgoa2V5KSA9PiBkZWxldGUgZHJhZnRba2V5XSk7XG4gICAgICBPYmplY3QuYXNzaWduKGRyYWZ0LCBjbG9uZUFib3V0TmFycmF0aXZlRG9jdW1lbnQoc25hcHNob3QuYmFzZWxpbmVEb2N1bWVudCkpO1xuICAgIH0pO1xuICB9O1xuXG4gIHJldHVybiBjcmVhdGVQb3J0YWwoKFxuICAgIDxkaXZcbiAgICAgIGNsYXNzTmFtZT1cImFib3V0LWVkaXRvclwiXG4gICAgICBkYXRhLW1vYmlsZS1wYW5lPXttb2JpbGVQYW5lfVxuICAgICAgZGF0YS10aW1lbGluZS1vcGVuPXt0aW1lbGluZU9wZW4gPyAndHJ1ZScgOiAnZmFsc2UnfVxuICAgICAgcm9sZT1cInJlZ2lvblwiXG4gICAgICBhcmlhLWxhYmVsPVwiQWJvdXQgTmFycmF0aXZlIGNyZWF0aXZlIHRvb2xraXRcIlxuICAgID5cbiAgICAgIDxoZWFkZXIgY2xhc3NOYW1lPVwiYWJvdXQtZWRpdG9yLXRvcGJhclwiPlxuICAgICAgICA8YnV0dG9uIHR5cGU9XCJidXR0b25cIiBjbGFzc05hbWU9XCJhYm91dC1lZGl0b3ItYnJhbmRcIiBvbkNsaWNrPXsoKSA9PiBzdG9yZS5zZXRTZWxlY3Rpb24oeyB0eXBlOiAnc2VxdWVuY2UnIH0pfT48RGlhbW9uZCBhcmlhLWhpZGRlbj1cInRydWVcIiAvPjxzcGFuPkFib3V0IE5hcnJhdGl2ZTwvc3Bhbj48c21hbGw+Q3JlYXRpdmUgdG9vbGtpdDwvc21hbGw+PC9idXR0b24+XG4gICAgICAgIDxUcmFuc3BvcnQgc3RvcmU9e3N0b3JlfSBzbmFwc2hvdD17c25hcHNob3R9IC8+XG4gICAgICAgIDxkaXYgY2xhc3NOYW1lPVwiYWJvdXQtZWRpdG9yLWFjdGlvbnNcIj5cbiAgICAgICAgICA8YnV0dG9uIHR5cGU9XCJidXR0b25cIiBkaXNhYmxlZD17IXNuYXBzaG90Lmhpc3RvcnkuY2FuVW5kb30gdGl0bGU9e3NuYXBzaG90Lmhpc3RvcnkudW5kb0xhYmVsIHx8ICdVbmRvJ30gYXJpYS1sYWJlbD1cIlVuZG9cIiBvbkNsaWNrPXsoKSA9PiBzdG9yZS51bmRvKCl9PjxzcGFuIGFyaWEtaGlkZGVuPVwidHJ1ZVwiPuKGtjwvc3Bhbj48L2J1dHRvbj5cbiAgICAgICAgICA8YnV0dG9uIHR5cGU9XCJidXR0b25cIiBkaXNhYmxlZD17IXNuYXBzaG90Lmhpc3RvcnkuY2FuUmVkb30gdGl0bGU9e3NuYXBzaG90Lmhpc3RvcnkucmVkb0xhYmVsIHx8ICdSZWRvJ30gYXJpYS1sYWJlbD1cIlJlZG9cIiBvbkNsaWNrPXsoKSA9PiBzdG9yZS5yZWRvKCl9PjxzcGFuIGFyaWEtaGlkZGVuPVwidHJ1ZVwiPuKGtzwvc3Bhbj48L2J1dHRvbj5cbiAgICAgICAgICA8YnV0dG9uIHR5cGU9XCJidXR0b25cIiBjbGFzc05hbWU9e3BhdGhWaXNpYmxlID8gJ2lzLWFjdGl2ZScgOiAnJ30gb25DbGljaz17KCkgPT4gc2V0UGF0aFZpc2libGUoIXBhdGhWaXNpYmxlKX0+UGF0aDwvYnV0dG9uPlxuICAgICAgICAgIDxidXR0b24gdHlwZT1cImJ1dHRvblwiIGNsYXNzTmFtZT17ZGlyZWN0b3JWaWV3ID8gJ2lzLWFjdGl2ZScgOiAnJ30gb25DbGljaz17dG9nZ2xlRGlyZWN0b3J9PntkaXJlY3RvclZpZXcgPyAnRGlyZWN0b3InIDogJ0NhbWVyYSd9PC9idXR0b24+XG4gICAgICAgICAgPGJ1dHRvbiB0eXBlPVwiYnV0dG9uXCIgY2xhc3NOYW1lPXtzbmFwc2hvdC50cnlTdGF0ZT8ubGFiZWwgPT09ICdDb21wYXJlIHNhdmVkIHNvdXJjZScgPyAnaXMtYWN0aXZlJyA6ICcnfSBkaXNhYmxlZD17c25hcHNob3QudHJ5U3RhdGUgJiYgc25hcHNob3QudHJ5U3RhdGUubGFiZWwgIT09ICdDb21wYXJlIHNhdmVkIHNvdXJjZSd9IG9uQ2xpY2s9e3RvZ2dsZUJlZm9yZX0+e3NuYXBzaG90LnRyeVN0YXRlPy5sYWJlbCA9PT0gJ0NvbXBhcmUgc2F2ZWQgc291cmNlJyA/ICdCZWZvcmUnIDogJ0FmdGVyJ308L2J1dHRvbj5cbiAgICAgICAgICA8ZGV0YWlscyBjbGFzc05hbWU9XCJhYm91dC1lZGl0b3ItbW9yZVwiPlxuICAgICAgICAgICAgPHN1bW1hcnk+TW9yZTwvc3VtbWFyeT5cbiAgICAgICAgICAgIDxkaXY+XG4gICAgICAgICAgICAgIDxidXR0b24gdHlwZT1cImJ1dHRvblwiIG9uQ2xpY2s9e2FkZENoZWNrcG9pbnR9PkNoZWNrcG9pbnQ8L2J1dHRvbj5cbiAgICAgICAgICAgICAgPGJ1dHRvbiB0eXBlPVwiYnV0dG9uXCIgb25DbGljaz17KCkgPT4gZXhwb3J0QWJvdXROYXJyYXRpdmVEb2N1bWVudChzbmFwc2hvdC5kb2N1bWVudCl9PkV4cG9ydCBKU09OPC9idXR0b24+XG4gICAgICAgICAgICAgIDxidXR0b24gdHlwZT1cImJ1dHRvblwiIG9uQ2xpY2s9eygpID0+IGltcG9ydFJlZi5jdXJyZW50Py5jbGljaygpfT5JbXBvcnQgSlNPTjwvYnV0dG9uPlxuICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgPC9kZXRhaWxzPlxuICAgICAgICAgIDxpbnB1dCByZWY9e2ltcG9ydFJlZn0gaGlkZGVuIHR5cGU9XCJmaWxlXCIgYWNjZXB0PVwiYXBwbGljYXRpb24vanNvblwiIG9uQ2hhbmdlPXthc3luYyAoZXZlbnQpID0+IHtcbiAgICAgICAgICAgIGNvbnN0IGZpbGUgPSBldmVudC50YXJnZXQuZmlsZXM/LlswXTtcbiAgICAgICAgICAgIGlmICghZmlsZSkgcmV0dXJuO1xuICAgICAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgICAgY29uc3QgaW1wb3J0ZWQgPSBKU09OLnBhcnNlKGF3YWl0IGZpbGUudGV4dCgpKTtcbiAgICAgICAgICAgICAgYXNzZXJ0VmFsaWRBYm91dE5hcnJhdGl2ZURvY3VtZW50KGltcG9ydGVkKTtcbiAgICAgICAgICAgICAgc3RvcmUucmVwbGFjZURvY3VtZW50KCdJbXBvcnQgZG9jdW1lbnQnLCBpbXBvcnRlZCk7XG4gICAgICAgICAgICB9IGNhdGNoIChlcnJvcikgeyBzdG9yZS5zZXRTYXZlU3RhdGUoeyBzdGF0dXM6ICdmYWlsZWQnLCBtZXNzYWdlOiBlcnJvci5tZXNzYWdlIH0pOyB9XG4gICAgICAgICAgICBldmVudC50YXJnZXQudmFsdWUgPSAnJztcbiAgICAgICAgICB9fSAvPlxuICAgICAgICAgIDxidXR0b24gdHlwZT1cImJ1dHRvblwiIGRhdGEtYWJvdXQtZWRpdG9yLXNhdmUgY2xhc3NOYW1lPVwiaXMtc2F2ZVwiIGRpc2FibGVkPXtzbmFwc2hvdC5zYXZlU3RhdGUuc3RhdHVzID09PSAnc2F2aW5nJ30gb25DbGljaz17c2F2ZX0+PHNwYW4+e3N0YXR1c0xhYmVsfTwvc3Bhbj48a2JkPuKMmFM8L2tiZD48L2J1dHRvbj5cbiAgICAgICAgPC9kaXY+XG4gICAgICA8L2hlYWRlcj5cblxuICAgICAge3NuYXBzaG90LnJlY292ZXJ5U3RhdGUuYXZhaWxhYmxlID8gPGRpdiBjbGFzc05hbWU9XCJhYm91dC1lZGl0b3ItcmVjb3ZlcnlcIj48c3Bhbj5BbiB1bnNhdmVkIGRyYWZ0IGZyb20ge25ldyBEYXRlKHNuYXBzaG90LnJlY292ZXJ5U3RhdGUuZHJhZnQudGltZXN0YW1wKS50b0xvY2FsZVN0cmluZygpfSBpcyBhdmFpbGFibGUuPC9zcGFuPjxidXR0b24gdHlwZT1cImJ1dHRvblwiIG9uQ2xpY2s9eygpID0+IHsgc3RvcmUucmVwbGFjZURvY3VtZW50KCdSZWNvdmVyIGRyYWZ0Jywgc25hcHNob3QucmVjb3ZlcnlTdGF0ZS5kcmFmdC5kb2N1bWVudCk7IHN0b3JlLnNldFJlY292ZXJ5U3RhdGUoeyBhdmFpbGFibGU6IGZhbHNlIH0pOyB9fT5SZWNvdmVyIGFzIHVuc2F2ZWQgY29weTwvYnV0dG9uPjxidXR0b24gdHlwZT1cImJ1dHRvblwiIG9uQ2xpY2s9eygpID0+IHsgZXhwb3J0QWJvdXROYXJyYXRpdmVEb2N1bWVudChzbmFwc2hvdC5yZWNvdmVyeVN0YXRlLmRyYWZ0LmRvY3VtZW50LCAnY29udGVudHMtYWJvdXQtcmVjb3ZlcmVkLmpzb24nKTsgfX0+RXhwb3J0PC9idXR0b24+PGJ1dHRvbiB0eXBlPVwiYnV0dG9uXCIgb25DbGljaz17KCkgPT4geyBjbGVhckFib3V0TmFycmF0aXZlUmVjb3ZlcnlEcmFmdCgpOyBzdG9yZS5zZXRSZWNvdmVyeVN0YXRlKHsgYXZhaWxhYmxlOiBmYWxzZSB9KTsgfX0+RGlzY2FyZDwvYnV0dG9uPjwvZGl2PiA6IG51bGx9XG4gICAgICB7c25hcHNob3Quc2F2ZVN0YXRlLm1lc3NhZ2UgPyA8ZGl2IGNsYXNzTmFtZT17YGFib3V0LWVkaXRvci1zYXZlLW1lc3NhZ2UgaXMtJHtzbmFwc2hvdC5zYXZlU3RhdGUuc3RhdHVzfWB9PntzbmFwc2hvdC5zYXZlU3RhdGUubWVzc2FnZX08YnV0dG9uIHR5cGU9XCJidXR0b25cIiBhcmlhLWxhYmVsPVwiRGlzbWlzcyBtZXNzYWdlXCIgb25DbGljaz17KCkgPT4gc3RvcmUuc2V0U2F2ZVN0YXRlKHsgbWVzc2FnZTogJycgfSl9PsOXPC9idXR0b24+PC9kaXY+IDogbnVsbH1cblxuICAgICAge3BhdGhWaXNpYmxlID8gPENhbWVyYVBhdGhPdmVybGF5IHNuYXBzaG90PXtzbmFwc2hvdH0gLz4gOiBudWxsfVxuICAgICAge2RpcmVjdG9yVmlldyA/IDxkaXYgY2xhc3NOYW1lPVwiYWJvdXQtZWRpdG9yLWRpcmVjdG9yLWNvbnRyb2xzXCI+PHN0cm9uZz5EaXJlY3RvciBWaWV3PC9zdHJvbmc+PGJ1dHRvbiB0eXBlPVwiYnV0dG9uXCIgb25DbGljaz17KCkgPT4gcnVudGltZVJlZi5jdXJyZW50Py5udWRnZURpcmVjdG9yPy4oeyB5YXc6IC0wLjA4IH0pfT7ihpA8L2J1dHRvbj48YnV0dG9uIHR5cGU9XCJidXR0b25cIiBvbkNsaWNrPXsoKSA9PiBydW50aW1lUmVmLmN1cnJlbnQ/Lm51ZGdlRGlyZWN0b3I/Lih7IHBpdGNoOiAwLjA4IH0pfT7ihpE8L2J1dHRvbj48YnV0dG9uIHR5cGU9XCJidXR0b25cIiBvbkNsaWNrPXsoKSA9PiBydW50aW1lUmVmLmN1cnJlbnQ/Lm51ZGdlRGlyZWN0b3I/Lih7IHBpdGNoOiAtMC4wOCB9KX0+4oaTPC9idXR0b24+PGJ1dHRvbiB0eXBlPVwiYnV0dG9uXCIgb25DbGljaz17KCkgPT4gcnVudGltZVJlZi5jdXJyZW50Py5udWRnZURpcmVjdG9yPy4oeyB5YXc6IDAuMDggfSl9PuKGkjwvYnV0dG9uPjxidXR0b24gdHlwZT1cImJ1dHRvblwiIG9uQ2xpY2s9eygpID0+IHJ1bnRpbWVSZWYuY3VycmVudD8ubnVkZ2VEaXJlY3Rvcj8uKHsgZGlzdGFuY2U6IC0wLjIgfSl9Pu+8izwvYnV0dG9uPjxidXR0b24gdHlwZT1cImJ1dHRvblwiIG9uQ2xpY2s9eygpID0+IHJ1bnRpbWVSZWYuY3VycmVudD8ubnVkZ2VEaXJlY3Rvcj8uKHsgZGlzdGFuY2U6IDAuMiB9KX0+4oiSPC9idXR0b24+PGJ1dHRvbiB0eXBlPVwiYnV0dG9uXCIgb25DbGljaz17KCkgPT4gcnVudGltZVJlZi5jdXJyZW50Py5yZXNldERpcmVjdG9yPy4oKX0+UmVzZXQ8L2J1dHRvbj48c21hbGw+VGVtcG9yYXJ5IGluc3BlY3Rpb24gb25seS4gUHVibGlzaGVkIENhbWVyYSBrZXlzIGFyZSB1bmNoYW5nZWQuPC9zbWFsbD48L2Rpdj4gOiBudWxsfVxuXG4gICAgICA8SW5zcGVjdG9yIHN0b3JlPXtzdG9yZX0gc25hcHNob3Q9e3NuYXBzaG90fSB0aW1lbGluZU9wZW49e3RpbWVsaW5lT3Blbn0gcnVudGltZU1ldHJpY3M9e3J1bnRpbWVNZXRyaWNzfSBjbGlwYm9hcmQ9e2NsaXBib2FyZH0gc2V0Q2xpcGJvYXJkPXtzZXRDbGlwYm9hcmR9IC8+XG4gICAgICA8YnV0dG9uXG4gICAgICAgIHR5cGU9XCJidXR0b25cIlxuICAgICAgICBjbGFzc05hbWU9XCJhYm91dC1lZGl0b3ItdGltZWxpbmUtdG9nZ2xlXCJcbiAgICAgICAgYXJpYS1jb250cm9scz1cImFib3V0LWVkaXRvci10aW1lbGluZS1wYW5lbFwiXG4gICAgICAgIGFyaWEtZXhwYW5kZWQ9e3RpbWVsaW5lT3Blbn1cbiAgICAgICAgdGl0bGU9e3RpbWVsaW5lT3BlbiA/ICdIaWRlIHRpbWVsaW5lJyA6ICdTaG93IHRpbWVsaW5lJ31cbiAgICAgICAgb25DbGljaz17KCkgPT4gc2V0VGltZWxpbmVPcGVuKChvcGVuKSA9PiAhb3Blbil9XG4gICAgICA+e3RpbWVsaW5lT3BlbiA/IDxDaGV2cm9uRG93biBhcmlhLWhpZGRlbj1cInRydWVcIiAvPiA6IDxDaGV2cm9uVXAgYXJpYS1oaWRkZW49XCJ0cnVlXCIgLz59PHNwYW4+e3RpbWVsaW5lT3BlbiA/ICdIaWRlIHRpbWVsaW5lJyA6ICdTaG93IHRpbWVsaW5lJ308L3NwYW4+PC9idXR0b24+XG4gICAgICA8ZGl2IGlkPVwiYWJvdXQtZWRpdG9yLXRpbWVsaW5lLXBhbmVsXCIgY2xhc3NOYW1lPVwiYWJvdXQtZWRpdG9yLWJvdHRvbVwiIGFyaWEtaGlkZGVuPXshdGltZWxpbmVPcGVufT5cbiAgICAgICAgPGRpdiBjbGFzc05hbWU9XCJhYm91dC1lZGl0b3ItY29udGV4dGJhclwiPlxuICAgICAgICAgIDxzcGFuPjxzdHJvbmc+e3NlbGVjdGVkPy5sYWJlbCB8fCAnU2VxdWVuY2UnfTwvc3Ryb25nPiB7c2VsZWN0ZWQgPyBgJHtzZWxlY3RlZC50eXBlfSDCtyAke2Zvcm1hdFdVKE1hdGgubWF4KDAsIHNlbGVjdGVkRXh0ZW50IC0gMSkpfSBzY3JvbGwgwrcgJHtmb3JtYXRXVShzZWxlY3RlZEV4dGVudCl9IHRvdGFsJHtyZXNvbHZlZEV4dGVudCA+IHNlbGVjdGVkRXh0ZW50ICsgMC4wMDEgPyBgIMK3ICR7Zm9ybWF0V1UocmVzb2x2ZWRFeHRlbnQpfSByZXNvbHZlZGAgOiAnJ31gIDogJyd9PC9zcGFuPlxuICAgICAgICAgIHtzZWxlY3RlZEN1ZUNvdW50ID4gMSA/IDxzcGFuIGNsYXNzTmFtZT1cImFib3V0LWVkaXRvci1zZWxlY3Rpb24tY291bnRcIj57c2VsZWN0ZWRDdWVDb3VudH0gdGl0bGVzIHNlbGVjdGVkPC9zcGFuPiA6IG51bGx9XG4gICAgICAgICAgPHNwYW4+e3NuYXBzaG90LmF1dG9LZXkgPyAnQXV0by1rZXkgYXJtZWQnIDogJ0F1dG8ta2V5IG9mZid9PC9zcGFuPlxuICAgICAgICAgIDxidXR0b24gdHlwZT1cImJ1dHRvblwiIGNsYXNzTmFtZT17c25hcHNob3QuYXV0b0tleSA/ICdpcy1hY3RpdmUnIDogJyd9IG9uQ2xpY2s9eygpID0+IHN0b3JlLnNldEF1dG9LZXkoIXNuYXBzaG90LmF1dG9LZXkpfT7il4YgQXV0by1rZXk8L2J1dHRvbj5cbiAgICAgICAgICA8YnV0dG9uIHR5cGU9XCJidXR0b25cIiBjbGFzc05hbWU9e2xvb3BBY3RpdmUgPyAnaXMtYWN0aXZlJyA6ICcnfSBvbkNsaWNrPXt0b2dnbGVMb29wfT57bG9vcEFjdGl2ZSA/ICdTdG9wIGF1ZGl0aW9uJyA6ICdMb29wIFNlY3Rpb24nfTwvYnV0dG9uPlxuICAgICAgICAgIDxidXR0b24gdHlwZT1cImJ1dHRvblwiIG9uQ2xpY2s9e2ZpdFNlcXVlbmNlfT5GaXQgc2VxdWVuY2U8L2J1dHRvbj5cbiAgICAgICAgICA8YnV0dG9uIHR5cGU9XCJidXR0b25cIiBkaXNhYmxlZD17IWNvbXBpbGVkU2VsZWN0ZWR9IG9uQ2xpY2s9e2ZpdFNlY3Rpb259PkZpdCBTZWN0aW9uPC9idXR0b24+XG4gICAgICAgICAge1snY2FtZXJhJywgJ3dvcmxkJywgJ3RleHQnXS5tYXAoKHRyYWNrKSA9PiA8YnV0dG9uIHR5cGU9XCJidXR0b25cIiBrZXk9e3RyYWNrfSBjbGFzc05hbWU9e3NuYXBzaG90LnRyYW5zcG9ydC5zb2xvVHJhY2sgPT09IHRyYWNrID8gJ2lzLWFjdGl2ZScgOiAnJ30gb25DbGljaz17KCkgPT4gdG9nZ2xlU29sbyh0cmFjayl9PlNvbG8ge3RyYWNrfTwvYnV0dG9uPil9XG4gICAgICAgICAge3RpbWVsaW5lRGVsZXRpb24gPyA8YnV0dG9uIHR5cGU9XCJidXR0b25cIiBjbGFzc05hbWU9XCJhYm91dC1lZGl0b3ItZGVsZXRlLWtleVwiIGRpc2FibGVkPXt0aW1lbGluZURlbGV0aW9uLmRpc2FibGVkfSB0aXRsZT17dGltZWxpbmVEZWxldGlvbi5tZXNzYWdlIHx8IGAke3RpbWVsaW5lRGVsZXRpb24ubGFiZWx9IMK3IERlbGV0ZS9CYWNrc3BhY2VgfSBvbkNsaWNrPXsoKSA9PiBkZWxldGVUaW1lbGluZVNlbGVjdGlvbihzdG9yZSwgc25hcHNob3QpfT48VHJhc2gyIGFyaWEtaGlkZGVuPVwidHJ1ZVwiIC8+e3RpbWVsaW5lRGVsZXRpb24ubGFiZWx9PC9idXR0b24+IDogbnVsbH1cbiAgICAgICAgICB7cnVudGltZU1ldHJpY3MgPyA8c3BhbiBjbGFzc05hbWU9XCJhYm91dC1lZGl0b3ItaHVkXCI+e3J1bnRpbWVNZXRyaWNzLmZyYW1lVGltZU1zLnRvRml4ZWQoMil9bXMgwrcge3J1bnRpbWVNZXRyaWNzLmRyYXdDYWxsc30gZHJhdyDCtyB7cnVudGltZU1ldHJpY3MucG9pbnRDb3VudC50b0xvY2FsZVN0cmluZygpfSBwdHMgwrcge3J1bnRpbWVNZXRyaWNzLmFjdGl2ZU1vZGlmaWVyc30gbW9kaWZpZXJzIMK3IHtydW50aW1lTWV0cmljcy5idWZmZXJSZWJ1aWxkc30gcmVidWlsZHM8L3NwYW4+IDogbnVsbH1cbiAgICAgICAgICB7Y2hlY2twb2ludHMubGVuZ3RoID8gPHNlbGVjdCBhcmlhLWxhYmVsPVwiUmVzdG9yZSBjaGVja3BvaW50XCIgZGVmYXVsdFZhbHVlPVwiXCIgb25DaGFuZ2U9eyhldmVudCkgPT4geyBjb25zdCBmb3VuZCA9IGNoZWNrcG9pbnRzLmZpbmQoKGl0ZW0pID0+IGl0ZW0uaWQgPT09IGV2ZW50LnRhcmdldC52YWx1ZSk7IGlmIChmb3VuZCkgeyBzdG9yZS5yZXBsYWNlRG9jdW1lbnQoYFJlc3RvcmUgJHtmb3VuZC5uYW1lfWAsIGZvdW5kLmRvY3VtZW50KTsgc3RvcmUuc2V0VHJhbnNwb3J0KHsgb3duZXI6ICd0aW1lbGluZScsIHN0b3J5V1U6IGZvdW5kLnN0b3J5V1UsIHBsYXlpbmc6IGZhbHNlIH0pOyB9IGV2ZW50LnRhcmdldC52YWx1ZSA9ICcnOyB9fT48b3B0aW9uIHZhbHVlPVwiXCI+Q2hlY2twb2ludHMgKHtjaGVja3BvaW50cy5sZW5ndGh9KTwvb3B0aW9uPntjaGVja3BvaW50cy5tYXAoKGl0ZW0pID0+IDxvcHRpb24gdmFsdWU9e2l0ZW0uaWR9IGtleT17aXRlbS5pZH0+e2l0ZW0ubmFtZX08L29wdGlvbj4pfTwvc2VsZWN0PiA6IG51bGx9XG4gICAgICAgIDwvZGl2PlxuICAgICAgICA8VGltZWxpbmUgc3RvcmU9e3N0b3JlfSBzbmFwc2hvdD17c25hcHNob3R9IC8+XG4gICAgICA8L2Rpdj5cbiAgICAgIDxuYXYgY2xhc3NOYW1lPVwiYWJvdXQtZWRpdG9yLW1vYmlsZS10YWJzXCIgYXJpYS1sYWJlbD1cIkVkaXRvciBwYW5lbFwiPjxidXR0b24gdHlwZT1cImJ1dHRvblwiIGNsYXNzTmFtZT17bW9iaWxlUGFuZSA9PT0gJ3NlcXVlbmNlJyA/ICdpcy1hY3RpdmUnIDogJyd9IG9uQ2xpY2s9eygpID0+IHNldE1vYmlsZVBhbmUoJ3NlcXVlbmNlJyl9PlNlcXVlbmNlPC9idXR0b24+PGJ1dHRvbiB0eXBlPVwiYnV0dG9uXCIgY2xhc3NOYW1lPXttb2JpbGVQYW5lID09PSAnaW5zcGVjdCcgPyAnaXMtYWN0aXZlJyA6ICcnfSBvbkNsaWNrPXsoKSA9PiBzZXRNb2JpbGVQYW5lKCdpbnNwZWN0Jyl9Pkluc3BlY3Q8L2J1dHRvbj48YnV0dG9uIHR5cGU9XCJidXR0b25cIiBjbGFzc05hbWU9e21vYmlsZVBhbmUgPT09ICdwcmV2aWV3JyA/ICdpcy1hY3RpdmUnIDogJyd9IG9uQ2xpY2s9eygpID0+IHNldE1vYmlsZVBhbmUoJ3ByZXZpZXcnKX0+UHJldmlldzwvYnV0dG9uPjwvbmF2PlxuICAgIDwvZGl2PlxuICApLCBkb2N1bWVudC5ib2R5KTtcbn1cbiJdLCJmaWxlIjoiL1VzZXJzL2FsZXhhbmRlcmJlY2svUHJvamVjdHMtY29kZS9BbGV4YW5kZXIgQmVjayBTdHVkaW8gV2Vic2l0ZS9yZWFjdC1hcHAvYXBwL3NyYy9yb3V0ZXMvYWJvdXQtbmFycmF0aXZlLWxhYi9BYm91dE5hcnJhdGl2ZUVkaXRvci5qc3gifQ==