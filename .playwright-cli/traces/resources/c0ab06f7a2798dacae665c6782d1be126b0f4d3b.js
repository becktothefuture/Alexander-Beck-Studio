import { createHotContext as __vite__createHotContext } from "/@vite/client";import.meta.hot = __vite__createHotContext("/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx");import __vite__cjsImport0_react_jsxDevRuntime from "/node_modules/.vite/deps/react_jsx-dev-runtime.js?v=6e8fde4d"; const Fragment = __vite__cjsImport0_react_jsxDevRuntime["Fragment"]; const jsxDEV = __vite__cjsImport0_react_jsxDevRuntime["jsxDEV"];
var _s = $RefreshSig$(), _s2 = $RefreshSig$(), _s3 = $RefreshSig$();
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
} from "/src/routes/about-narrative-lab/aboutNarrativeTimeline.js?t=1784283184264";
import "/src/routes/about-narrative-lab/about-narrative-editor.css?t=1784281895563";
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
function stitchCameraBoundaries(document2) {
  for (let sectionIndex = 1; sectionIndex < document2.sections.length; sectionIndex += 1) {
    copyCameraPose(document2.sections[sectionIndex].camera.keys[0], document2.sections[sectionIndex - 1].camera.keys.at(-1));
  }
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
      lineNumber: 341,
      columnNumber: 7
    }, this),
    children,
    hint ? /* @__PURE__ */ jsxDEV("small", { children: hint }, void 0, false, {
      fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
      lineNumber: 343,
      columnNumber: 15
    }, this) : null
  ] }, void 0, true, {
    fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
    lineNumber: 340,
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
        lineNumber: 352,
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
        lineNumber: 361,
        columnNumber: 9
      },
      this
    ),
    unit ? /* @__PURE__ */ jsxDEV("em", { children: unit }, void 0, false, {
      fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
      lineNumber: 370,
      columnNumber: 17
    }, this) : null
  ] }, void 0, true, {
    fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
    lineNumber: 351,
    columnNumber: 7
  }, this) }, void 0, false, {
    fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
    lineNumber: 350,
    columnNumber: 5
  }, this);
}
_c2 = NumberProperty;
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
      lineNumber: 393,
      columnNumber: 116
    }, this) }, void 0, false, {
      fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
      lineNumber: 393,
      columnNumber: 7
    }, this),
    /* @__PURE__ */ jsxDEV("button", { type: "button", title: "Previous keyframe · Left arrow", "aria-label": "Previous keyframe", onClick: () => jumpTimelineKeyframe(store, snapshot, -1), children: /* @__PURE__ */ jsxDEV(ChevronLeft, { "aria-hidden": "true" }, void 0, false, {
      fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
      lineNumber: 394,
      columnNumber: 157
    }, this) }, void 0, false, {
      fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
      lineNumber: 394,
      columnNumber: 7
    }, this),
    /* @__PURE__ */ jsxDEV("button", { type: "button", className: "is-primary", title: transport.playing ? "Pause" : "Play", "aria-label": transport.playing ? "Pause" : "Play", onClick: play, children: transport.playing ? /* @__PURE__ */ jsxDEV(Pause, { "aria-hidden": "true" }, void 0, false, {
      fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
      lineNumber: 396,
      columnNumber: 30
    }, this) : /* @__PURE__ */ jsxDEV(Play, { "aria-hidden": "true" }, void 0, false, {
      fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
      lineNumber: 396,
      columnNumber: 61
    }, this) }, void 0, false, {
      fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
      lineNumber: 395,
      columnNumber: 7
    }, this),
    /* @__PURE__ */ jsxDEV("button", { type: "button", title: "Next Section", "aria-label": "Next Section", onClick: () => jumpSection(1), children: /* @__PURE__ */ jsxDEV(SkipForward, { "aria-hidden": "true" }, void 0, false, {
      fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
      lineNumber: 398,
      columnNumber: 107
    }, this) }, void 0, false, {
      fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
      lineNumber: 398,
      columnNumber: 7
    }, this),
    /* @__PURE__ */ jsxDEV("button", { type: "button", title: "Next keyframe · Right arrow", "aria-label": "Next keyframe", onClick: () => jumpTimelineKeyframe(store, snapshot, 1), children: /* @__PURE__ */ jsxDEV(ChevronRight, { "aria-hidden": "true" }, void 0, false, {
      fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
      lineNumber: 399,
      columnNumber: 149
    }, this) }, void 0, false, {
      fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
      lineNumber: 399,
      columnNumber: 7
    }, this),
    /* @__PURE__ */ jsxDEV("output", { children: formatWU(transport.storyWU) }, void 0, false, {
      fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
      lineNumber: 400,
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
        lineNumber: 401,
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
        lineNumber: 410,
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
        lineNumber: 415,
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
            lineNumber: 425,
            columnNumber: 9
          }, this),
          /* @__PURE__ */ jsxDEV("option", { value: "mobile", children: "Mobile" }, void 0, false, {
            fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
            lineNumber: 426,
            columnNumber: 9
          }, this),
          /* @__PURE__ */ jsxDEV("option", { value: "reduced-motion", children: "Reduced motion" }, void 0, false, {
            fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
            lineNumber: 427,
            columnNumber: 9
          }, this)
        ]
      },
      void 0,
      true,
      {
        fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
        lineNumber: 420,
        columnNumber: 7
      },
      this
    )
  ] }, void 0, true, {
    fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
    lineNumber: 392,
    columnNumber: 5
  }, this);
}
_c3 = Transport;
function Timeline({ store, snapshot }) {
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
    /* @__PURE__ */ jsxDEV("div", { className: "about-editor-lane-labels", "aria-hidden": "true", children: [
      /* @__PURE__ */ jsxDEV("span", { children: "Sections" }, void 0, false, {
        fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
        lineNumber: 800,
        columnNumber: 9
      }, this),
      /* @__PURE__ */ jsxDEV("span", { children: "Camera" }, void 0, false, {
        fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
        lineNumber: 800,
        columnNumber: 30
      }, this),
      /* @__PURE__ */ jsxDEV("span", { children: "World" }, void 0, false, {
        fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
        lineNumber: 800,
        columnNumber: 49
      }, this),
      /* @__PURE__ */ jsxDEV("span", { children: "Text" }, void 0, false, {
        fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
        lineNumber: 800,
        columnNumber: 67
      }, this),
      /* @__PURE__ */ jsxDEV("span", { children: "Interaction" }, void 0, false, {
        fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
        lineNumber: 800,
        columnNumber: 84
      }, this)
    ] }, void 0, true, {
      fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
      lineNumber: 799,
      columnNumber: 7
    }, this),
    /* @__PURE__ */ jsxDEV("div", { ref: lanesRef, className: "about-editor-lanes", "data-solo-track": transport.soloTrack || "", onWheel: zoomTimeline, children: /* @__PURE__ */ jsxDEV("div", { className: "about-editor-timeline-canvas", style: { "--about-editor-playhead": playhead, "--about-editor-timeline-zoom": Math.max(1, Number(transport.zoom) || 1) }, children: [
      /* @__PURE__ */ jsxDEV("div", { className: "about-editor-playhead" }, void 0, false, {
        fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
        lineNumber: 804,
        columnNumber: 11
      }, this),
      marquee ? /* @__PURE__ */ jsxDEV("div", { className: "about-editor-marquee", style: marquee, "aria-hidden": "true" }, void 0, false, {
        fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
        lineNumber: 805,
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
              lineNumber: 812,
              columnNumber: 13
            }, this),
            /* @__PURE__ */ jsxDEV("span", { children: cameraDragPreview.valid ? `${cameraDragPreview.sectionLabel} · ${formatCameraPercent(cameraDragPreview.at)}` : cameraDragPreview.reason }, void 0, false, {
              fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
              lineNumber: 813,
              columnNumber: 13
            }, this)
          ]
        },
        void 0,
        true,
        {
          fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
          lineNumber: 807,
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
                      lineNumber: 851,
                      columnNumber: 23
                    }, this),
                    section.label
                  ] }, void 0, true, {
                    fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
                    lineNumber: 850,
                    columnNumber: 21
                  }, this),
                  sectionResizePreview?.sectionId === section.id ? /* @__PURE__ */ jsxDEV("output", { children: [
                    formatWU(Math.max(0, resizeExtent - 1)),
                    " scroll · ",
                    formatWU(resizeExtent),
                    " total"
                  ] }, void 0, true, {
                    fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
                    lineNumber: 853,
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
                      lineNumber: 854,
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
                lineNumber: 844,
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
                    lineNumber: 878,
                    columnNumber: 27
                  },
                  this
                );
              }) }, void 0, false, {
                fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
                lineNumber: 872,
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
                    lineNumber: 893,
                    columnNumber: 25
                  },
                  this
                );
              })
            ] }, section.id, true, {
              fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
              lineNumber: 871,
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
                  lineNumber: 934,
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
                    lineNumber: 941,
                    columnNumber: 21
                  },
                  this
                )
              ) : null
            ] }, section.id, true, {
              fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
              lineNumber: 933,
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
                        style: { left: textPosition(cue.hold) },
                        "aria-label": `${movement === "vertical" ? "Vertical" : "Spatial"} text at ${Math.round(cue.hold * 100)}% · ${cue.text}`,
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
                        })
                      },
                      cue.id,
                      false,
                      {
                        fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
                        lineNumber: 973,
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
                        lineNumber: 1024,
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
                    lineNumber: 1054,
                    columnNumber: 21
                  }, this) : null
                ]
              },
              section.id,
              true,
              {
                fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
                lineNumber: 956,
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
                lineNumber: 1065,
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
                lineNumber: 1072,
                columnNumber: 19
              },
              this
            ) : null
          ] }, section.id, true, {
            fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
            lineNumber: 1064,
            columnNumber: 17
          }, this);
        }) }, lane, false, {
          fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
          lineNumber: 817,
          columnNumber: 11
        }, this)
      )
    ] }, void 0, true, {
      fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
      lineNumber: 803,
      columnNumber: 9
    }, this) }, void 0, false, {
      fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
      lineNumber: 802,
      columnNumber: 7
    }, this)
  ] }, void 0, true, {
    fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
    lineNumber: 798,
    columnNumber: 5
  }, this);
}
_s(Timeline, "V8B8QgS1RFfl00PqY9/a7lD+sxE=");
_c4 = Timeline;
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
        lineNumber: 1102,
        columnNumber: 15
      }, this),
      /* @__PURE__ */ jsxDEV("strong", { children: "Global controls" }, void 0, false, {
        fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
        lineNumber: 1102,
        columnNumber: 36
      }, this)
    ] }, void 0, true, {
      fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
      lineNumber: 1102,
      columnNumber: 7
    }, this),
    ABOUT_NARRATIVE_GLOBAL_CONTROLS.map(
      (group) => /* @__PURE__ */ jsxDEV("details", { open: true, children: [
        /* @__PURE__ */ jsxDEV("summary", { children: group.label }, void 0, false, {
          fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
          lineNumber: 1105,
          columnNumber: 11
        }, this),
        group.id === "textMotion" ? /* @__PURE__ */ jsxDEV("p", { className: "about-editor-help", children: "Every title follows this path continuously. Negative Y is higher, positive Y is lower. The opener starts sharp at its own Y position; Clear from and Clear until set the sharp window for later titles." }, void 0, false, {
          fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
          lineNumber: 1106,
          columnNumber: 40
        }, this) : null,
        group.id === "swarmTurbulence" ? /* @__PURE__ */ jsxDEV("p", { className: "about-editor-help", children: "One ambient motion profile drives both the cluster and turbulent field. Each World only scales its strength, so the motion stays continuous while Shapes change." }, void 0, false, {
          fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
          lineNumber: 1107,
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
              lineNumber: 1113,
              columnNumber: 13
            },
            this
          );
        })
      ] }, group.id, true, {
        fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
        lineNumber: 1104,
        columnNumber: 7
      }, this)
    )
  ] }, void 0, true, {
    fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
    lineNumber: 1101,
    columnNumber: 5
  }, this);
}
_c5 = SequenceInspector;
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
    stitchCameraBoundaries(draft);
  }, { selection: { type: "section", sectionId: section.id } });
  return /* @__PURE__ */ jsxDEV(Fragment, { children: [
    /* @__PURE__ */ jsxDEV("header", { children: [
      /* @__PURE__ */ jsxDEV("span", { children: [
        "Section ",
        String(sectionIndex + 1).padStart(2, "0")
      ] }, void 0, true, {
        fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
        lineNumber: 1152,
        columnNumber: 15
      }, this),
      /* @__PURE__ */ jsxDEV("strong", { children: section.label }, void 0, false, {
        fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
        lineNumber: 1152,
        columnNumber: 79
      }, this)
    ] }, void 0, true, {
      fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
      lineNumber: 1152,
      columnNumber: 7
    }, this),
    section.locked ? /* @__PURE__ */ jsxDEV("div", { className: "about-editor-lock", children: [
      /* @__PURE__ */ jsxDEV(LockKeyhole, { "aria-hidden": "true" }, void 0, false, {
        fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
        lineNumber: 1153,
        columnNumber: 60
      }, this),
      /* @__PURE__ */ jsxDEV("span", { children: "This protected Section cannot be reordered or have its World replaced accidentally." }, void 0, false, {
        fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
        lineNumber: 1153,
        columnNumber: 94
      }, this),
      /* @__PURE__ */ jsxDEV("button", { type: "button", onClick: () => update("Unlock protected Section", (draft) => {
        draft.locked = false;
      }), children: "Unlock advanced" }, void 0, false, {
        fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
        lineNumber: 1153,
        columnNumber: 190
      }, this)
    ] }, void 0, true, {
      fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
      lineNumber: 1153,
      columnNumber: 25
    }, this) : null,
    /* @__PURE__ */ jsxDEV("div", { className: "about-editor-inline-actions", children: [
      /* @__PURE__ */ jsxDEV("button", { type: "button", disabled: section.locked || sectionIndex === 0, onClick: () => move(-1), children: "Move earlier" }, void 0, false, {
        fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
        lineNumber: 1155,
        columnNumber: 9
      }, this),
      /* @__PURE__ */ jsxDEV("button", { type: "button", disabled: section.locked || sectionIndex === snapshot.document.sections.length - 1, onClick: () => move(1), children: "Move later" }, void 0, false, {
        fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
        lineNumber: 1156,
        columnNumber: 9
      }, this)
    ] }, void 0, true, {
      fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
      lineNumber: 1154,
      columnNumber: 7
    }, this),
    /* @__PURE__ */ jsxDEV(Property, { label: "Section name", children: /* @__PURE__ */ jsxDEV("input", { value: section.label, onChange: (event) => update("Rename Section", (draft) => {
      draft.label = event.target.value;
    }, `section:${section.id}:label`) }, void 0, false, {
      fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
      lineNumber: 1158,
      columnNumber: 38
    }, this) }, void 0, false, {
      fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
      lineNumber: 1158,
      columnNumber: 7
    }, this),
    /* @__PURE__ */ jsxDEV(Property, { label: "Stable ID", children: [
      /* @__PURE__ */ jsxDEV("input", { value: section.id, readOnly: true }, void 0, false, {
        fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
        lineNumber: 1159,
        columnNumber: 35
      }, this),
      /* @__PURE__ */ jsxDEV("small", { children: "References this Section without tying it to its current meaning." }, void 0, false, {
        fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
        lineNumber: 1159,
        columnNumber: 72
      }, this)
    ] }, void 0, true, {
      fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
      lineNumber: 1159,
      columnNumber: 7
    }, this),
    /* @__PURE__ */ jsxDEV(Property, { label: "Type", children: /* @__PURE__ */ jsxDEV("select", { value: section.type, disabled: section.type === "finale", onChange: (event) => update("Change Section type", (draft) => {
      draft.type = event.target.value;
    }), children: [
      /* @__PURE__ */ jsxDEV("option", { value: "spatial", children: "Spatial" }, void 0, false, {
        fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
        lineNumber: 1162,
        columnNumber: 11
      }, this),
      /* @__PURE__ */ jsxDEV("option", { value: "editorial", children: "Editorial" }, void 0, false, {
        fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
        lineNumber: 1162,
        columnNumber: 51
      }, this),
      /* @__PURE__ */ jsxDEV("option", { value: "finale", children: "Finale" }, void 0, false, {
        fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
        lineNumber: 1162,
        columnNumber: 95
      }, this)
    ] }, void 0, true, {
      fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
      lineNumber: 1161,
      columnNumber: 9
    }, this) }, void 0, false, {
      fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
      lineNumber: 1160,
      columnNumber: 7
    }, this),
    /* @__PURE__ */ jsxDEV("details", { open: true, children: [
      /* @__PURE__ */ jsxDEV("summary", { children: "Section timing" }, void 0, false, {
        fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
        lineNumber: 1166,
        columnNumber: 9
      }, this),
      /* @__PURE__ */ jsxDEV(Property, { label: "Scroll travel", children: /* @__PURE__ */ jsxDEV("output", { className: "about-editor-readout", children: formatWU(Math.max(0, activeExtent - 1)) }, void 0, false, {
        fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
        lineNumber: 1167,
        columnNumber: 41
      }, this) }, void 0, false, {
        fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
        lineNumber: 1167,
        columnNumber: 9
      }, this),
      /* @__PURE__ */ jsxDEV(Property, { label: "Total height", children: /* @__PURE__ */ jsxDEV("output", { className: "about-editor-readout", children: formatWU(activeExtent) }, void 0, false, {
        fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
        lineNumber: 1168,
        columnNumber: 40
      }, this) }, void 0, false, {
        fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
        lineNumber: 1168,
        columnNumber: 9
      }, this),
      /* @__PURE__ */ jsxDEV(NumberProperty, { label: "Desktop length", value: section.extentWU, min: 1, max: 8, step: 0.05, unit: "WU", onChange: (value) => update("Change desktop Section length", (draft) => {
        draft.extentWU = value;
      }, `section:${section.id}:extent`) }, void 0, false, {
        fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
        lineNumber: 1169,
        columnNumber: 9
      }, this),
      /* @__PURE__ */ jsxDEV(NumberProperty, { label: "Mobile length", value: section.mobileExtentWU, min: 1, max: 8, step: 0.05, unit: "WU", onChange: (value) => update("Change mobile Section length", (draft) => {
        draft.mobileExtentWU = value;
      }, `section:${section.id}:mobile`) }, void 0, false, {
        fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
        lineNumber: 1170,
        columnNumber: 9
      }, this),
      /* @__PURE__ */ jsxDEV(Property, { label: "Resolved height", children: /* @__PURE__ */ jsxDEV("output", { className: "about-editor-readout", children: formatWU(resolvedExtent) }, void 0, false, {
        fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
        lineNumber: 1171,
        columnNumber: 43
      }, this) }, void 0, false, {
        fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
        lineNumber: 1171,
        columnNumber: 9
      }, this),
      contentMinimumActive ? /* @__PURE__ */ jsxDEV("p", { className: "about-editor-timing-warning", children: [
        "Content minimum in effect. The rendered copy needs ",
        formatWU(resolvedExtent),
        " in this profile."
      ] }, void 0, true, {
        fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
        lineNumber: 1172,
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
          lineNumber: 1173,
          columnNumber: 9
        },
        this
      )
    ] }, void 0, true, {
      fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
      lineNumber: 1165,
      columnNumber: 7
    }, this),
    section.type === "editorial" ? /* @__PURE__ */ jsxDEV(EditorialBlocks, { store, snapshot, section }, void 0, false, {
      fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
      lineNumber: 1180,
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
        lineNumber: 1182,
        columnNumber: 7
      },
      this
    ) : null
  ] }, void 0, true, {
    fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
    lineNumber: 1151,
    columnNumber: 5
  }, this);
}
_c6 = SectionInspector;
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
      lineNumber: 1220,
      columnNumber: 7
    }, this),
    (section.text.blocks || []).map(
      (block, blockIndex) => /* @__PURE__ */ jsxDEV("div", { className: "about-editor-block", children: [
        /* @__PURE__ */ jsxDEV("div", { children: [
          /* @__PURE__ */ jsxDEV("code", { children: block.kind }, void 0, false, {
            fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
            lineNumber: 1223,
            columnNumber: 16
          }, this),
          /* @__PURE__ */ jsxDEV("span", { children: block.id }, void 0, false, {
            fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
            lineNumber: 1223,
            columnNumber: 41
          }, this)
        ] }, void 0, true, {
          fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
          lineNumber: 1223,
          columnNumber: 11
        }, this),
        block.label != null ? /* @__PURE__ */ jsxDEV(Property, { label: "Label", children: /* @__PURE__ */ jsxDEV("input", { value: block.label, onChange: (event) => updateBlock(blockIndex, "label", event.target.value) }, void 0, false, {
          fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
          lineNumber: 1224,
          columnNumber: 58
        }, this) }, void 0, false, {
          fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
          lineNumber: 1224,
          columnNumber: 34
        }, this) : null,
        block.text != null ? /* @__PURE__ */ jsxDEV(Property, { label: "Copy", children: /* @__PURE__ */ jsxDEV("textarea", { rows: "5", value: block.text, onChange: (event) => updateBlock(blockIndex, "text", event.target.value) }, void 0, false, {
          fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
          lineNumber: 1225,
          columnNumber: 56
        }, this) }, void 0, false, {
          fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
          lineNumber: 1225,
          columnNumber: 33
        }, this) : null,
        block.kind === "prose" ? /* @__PURE__ */ jsxDEV(Property, { label: "Reconnect point grid", children: /* @__PURE__ */ jsxDEV("input", { type: "checkbox", checked: block.worldInfluence === true, onChange: (event) => updateBlock(blockIndex, "worldInfluence", event.target.checked) }, void 0, false, {
          fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
          lineNumber: 1226,
          columnNumber: 76
        }, this) }, void 0, false, {
          fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
          lineNumber: 1226,
          columnNumber: 37
        }, this) : null,
        block.text != null ? /* @__PURE__ */ jsxDEV("div", { className: "about-editor-emphasis-controls", children: [
          /* @__PURE__ */ jsxDEV("span", { children: "Highlighted words" }, void 0, false, {
            fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
            lineNumber: 1229,
            columnNumber: 15
          }, this),
          (block.emphasis || []).map(
            (item, emphasisIndex) => /* @__PURE__ */ jsxDEV("div", { className: "about-editor-emphasis-row", children: [
              /* @__PURE__ */ jsxDEV("input", { "aria-label": "Highlighted phrase", value: item.text, onChange: (event) => updateEmphasis(blockIndex, emphasisIndex, "text", event.target.value) }, void 0, false, {
                fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
                lineNumber: 1232,
                columnNumber: 19
              }, this),
              /* @__PURE__ */ jsxDEV("select", { "aria-label": "Highlight colour", value: item.tone, onChange: (event) => updateEmphasis(blockIndex, emphasisIndex, "tone", event.target.value), children: ABOUT_NARRATIVE_EMPHASIS_TONES.map((tone) => /* @__PURE__ */ jsxDEV("option", { value: tone, children: tone }, tone, false, {
                fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
                lineNumber: 1234,
                columnNumber: 67
              }, this)) }, void 0, false, {
                fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
                lineNumber: 1233,
                columnNumber: 19
              }, this),
              /* @__PURE__ */ jsxDEV("button", { type: "button", "aria-label": `Remove ${item.text || "empty"} highlight`, onClick: () => removeEmphasis(blockIndex, emphasisIndex), children: "×" }, void 0, false, {
                fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
                lineNumber: 1236,
                columnNumber: 19
              }, this)
            ] }, `${block.id}-emphasis-${emphasisIndex}`, true, {
              fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
              lineNumber: 1231,
              columnNumber: 11
            }, this)
          ),
          /* @__PURE__ */ jsxDEV("button", { type: "button", onClick: () => addEmphasis(blockIndex), children: "Add highlight" }, void 0, false, {
            fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
            lineNumber: 1239,
            columnNumber: 15
          }, this)
        ] }, void 0, true, {
          fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
          lineNumber: 1228,
          columnNumber: 9
        }, this) : null,
        block.items ? /* @__PURE__ */ jsxDEV(Property, { label: "Items", children: /* @__PURE__ */ jsxDEV("textarea", { rows: "6", value: block.items.join("\n"), onChange: (event) => updateBlock(blockIndex, "items", event.target.value.split("\n").filter(Boolean)) }, void 0, false, {
          fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
          lineNumber: 1242,
          columnNumber: 50
        }, this) }, void 0, false, {
          fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
          lineNumber: 1242,
          columnNumber: 26
        }, this) : null
      ] }, block.id, true, {
        fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
        lineNumber: 1222,
        columnNumber: 7
      }, this)
    ),
    /* @__PURE__ */ jsxDEV("button", { type: "button", className: "about-editor-wide-action", onClick: () => store.commit("Add editorial block", (draft) => {
      draft.sections[sectionIndex].text.blocks.push({ id: nextId(draft, `${section.id}-prose`), kind: "prose", text: "New editorial paragraph." });
    }), children: "Add prose block" }, void 0, false, {
      fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
      lineNumber: 1245,
      columnNumber: 7
    }, this)
  ] }, void 0, true, {
    fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
    lineNumber: 1219,
    columnNumber: 5
  }, this);
}
_c7 = EditorialBlocks;
function CueInspector({ store, snapshot, section }) {
  const selectedMembers = getAboutNarrativeSelectionMembers(snapshot.selection);
  const sectionIndex = getSectionIndex(snapshot.document, section.id);
  const cueIndex = section.text.cues.findIndex((cue2) => cue2.id === snapshot.selection.cueId);
  const cue = section.text.cues[cueIndex];
  if (!cue) return /* @__PURE__ */ jsxDEV(SectionInspector, { store, snapshot, section }, void 0, false, {
    fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
    lineNumber: 1257,
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
        lineNumber: 1277,
        columnNumber: 15
      }, this),
      /* @__PURE__ */ jsxDEV("strong", { children: cue.id }, void 0, false, {
        fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
        lineNumber: 1277,
        columnNumber: 36
      }, this)
    ] }, void 0, true, {
      fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
      lineNumber: 1277,
      columnNumber: 7
    }, this),
    selectedMembers.length > 1 ? /* @__PURE__ */ jsxDEV("div", { className: "about-editor-group-summary", children: [
      /* @__PURE__ */ jsxDEV("strong", { children: [
        selectedMembers.length,
        " titles selected"
      ] }, void 0, true, {
        fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
        lineNumber: 1280,
        columnNumber: 11
      }, this),
      /* @__PURE__ */ jsxDEV("ol", { children: selectedMembers.map((member) => {
        const memberSection = snapshot.document.sections.find((item) => item.id === member.sectionId);
        const memberCue = memberSection?.text?.cues?.find((item) => item.id === member.cueId);
        return /* @__PURE__ */ jsxDEV("li", { children: [
          /* @__PURE__ */ jsxDEV("span", { children: memberSection?.label }, void 0, false, {
            fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
            lineNumber: 1284,
            columnNumber: 68
          }, this),
          memberCue?.text
        ] }, `${member.sectionId}:${member.cueId}`, true, {
          fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
          lineNumber: 1284,
          columnNumber: 20
        }, this);
      }) }, void 0, false, {
        fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
        lineNumber: 1281,
        columnNumber: 11
      }, this),
      /* @__PURE__ */ jsxDEV("button", { type: "button", onClick: () => store.setSelection({ type: "cue", sectionId: section.id, cueId: cue.id, keyPart: "focus" }), children: "Keep primary only" }, void 0, false, {
        fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
        lineNumber: 1286,
        columnNumber: 11
      }, this)
    ] }, void 0, true, {
      fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
      lineNumber: 1279,
      columnNumber: 7
    }, this) : null,
    /* @__PURE__ */ jsxDEV("p", { className: "about-editor-help", children: "Drag the pink timing marker anywhere from 0–100% of its Section. This moves the title's focus time only. Its travel duration, speed, blur, and in/out cadence remain controlled globally under Spatial titles." }, void 0, false, {
      fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
      lineNumber: 1289,
      columnNumber: 7
    }, this),
    /* @__PURE__ */ jsxDEV(Property, { label: "Statement", children: /* @__PURE__ */ jsxDEV("textarea", { rows: "7", value: cue.text, onChange: (event) => update("text", event.target.value) }, void 0, false, {
      fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
      lineNumber: 1290,
      columnNumber: 35
    }, this) }, void 0, false, {
      fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
      lineNumber: 1290,
      columnNumber: 7
    }, this),
    /* @__PURE__ */ jsxDEV(Property, { label: "Movement", children: /* @__PURE__ */ jsxDEV("select", { value: movement, onChange: (event) => updateMovement(event.target.value), children: [
      /* @__PURE__ */ jsxDEV("option", { value: "spatial", children: "Spatial travel" }, void 0, false, {
        fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
        lineNumber: 1291,
        columnNumber: 116
      }, this),
      /* @__PURE__ */ jsxDEV("option", { value: "vertical", children: "Vertical scroll" }, void 0, false, {
        fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
        lineNumber: 1291,
        columnNumber: 163
      }, this)
    ] }, void 0, true, {
      fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
      lineNumber: 1291,
      columnNumber: 34
    }, this) }, void 0, false, {
      fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
      lineNumber: 1291,
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
        lineNumber: 1292,
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
        lineNumber: 1304,
        columnNumber: 41
      }, this) }, void 0, false, {
        fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
        lineNumber: 1304,
        columnNumber: 11
      }, this),
      /* @__PURE__ */ jsxDEV(Property, { label: "Motion preset", children: /* @__PURE__ */ jsxDEV("select", { value: cue.preset, onChange: (event) => update("preset", event.target.value), children: [
        /* @__PURE__ */ jsxDEV("option", { value: "travelling-title-v1", children: "Travelling title" }, void 0, false, {
          fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
          lineNumber: 1305,
          columnNumber: 129
        }, this),
        /* @__PURE__ */ jsxDEV("option", { value: "opener-v1", children: "Opener" }, void 0, false, {
          fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
          lineNumber: 1305,
          columnNumber: 190
        }, this),
        /* @__PURE__ */ jsxDEV("option", { value: "finale-v1", children: "Finale" }, void 0, false, {
          fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
          lineNumber: 1305,
          columnNumber: 231
        }, this)
      ] }, void 0, true, {
        fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
        lineNumber: 1305,
        columnNumber: 43
      }, this) }, void 0, false, {
        fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
        lineNumber: 1305,
        columnNumber: 11
      }, this)
    ] }, void 0, true, {
      fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
      lineNumber: 1303,
      columnNumber: 7
    }, this) : /* @__PURE__ */ jsxDEV(Property, { label: "Reveal", children: /* @__PURE__ */ jsxDEV("output", { className: "about-editor-readout", children: "Editorial vertical scroll" }, void 0, false, {
      fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
      lineNumber: 1307,
      columnNumber: 32
    }, this) }, void 0, false, {
      fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
      lineNumber: 1307,
      columnNumber: 7
    }, this),
    /* @__PURE__ */ jsxDEV("button", { type: "button", className: "about-editor-danger", disabled: section.type === "finale", onClick: remove, children: "Delete Cue" }, void 0, false, {
      fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
      lineNumber: 1308,
      columnNumber: 7
    }, this)
  ] }, void 0, true, {
    fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
    lineNumber: 1276,
    columnNumber: 5
  }, this);
}
_c8 = CueInspector;
function DisciplineRevealInspector({ store, snapshot, section }) {
  const sectionIndex = getSectionIndex(snapshot.document, section.id);
  const reveal = section.text.disciplineReveal;
  if (!reveal) return /* @__PURE__ */ jsxDEV(SectionInspector, { store, snapshot, section }, void 0, false, {
    fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
    lineNumber: 1316,
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
        lineNumber: 1340,
        columnNumber: 15
      }, this),
      /* @__PURE__ */ jsxDEV("strong", { children: "Discipline reveal" }, void 0, false, {
        fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
        lineNumber: 1340,
        columnNumber: 41
      }, this)
    ] }, void 0, true, {
      fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
      lineNumber: 1340,
      columnNumber: 7
    }, this),
    /* @__PURE__ */ jsxDEV("p", { className: "about-editor-help", children: "One clip controls the complete six-point sequence. Drag its striped block in the Text lane to move every reveal together." }, void 0, false, {
      fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
      lineNumber: 1341,
      columnNumber: 7
    }, this),
    /* @__PURE__ */ jsxDEV("details", { open: true, children: [
      /* @__PURE__ */ jsxDEV("summary", { children: "Reveal choreography" }, void 0, false, {
        fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
        lineNumber: 1342,
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
            lineNumber: 1346,
            columnNumber: 13
          },
          this
        );
      })
    ] }, void 0, true, {
      fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
      lineNumber: 1342,
      columnNumber: 7
    }, this),
    /* @__PURE__ */ jsxDEV("details", { open: true, children: [
      /* @__PURE__ */ jsxDEV("summary", { children: "Reveal order and labels" }, void 0, false, {
        fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
        lineNumber: 1359,
        columnNumber: 21
      }, this),
      /* @__PURE__ */ jsxDEV("div", { className: "about-editor-discipline-items", children: reveal.items.map(
        (item, itemIndex) => /* @__PURE__ */ jsxDEV("div", { className: "about-editor-discipline-item", children: [
          /* @__PURE__ */ jsxDEV("code", { children: String(itemIndex + 1).padStart(2, "0") }, void 0, false, {
            fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
            lineNumber: 1363,
            columnNumber: 15
          }, this),
          /* @__PURE__ */ jsxDEV("input", { value: item.label, "aria-label": `Discipline ${itemIndex + 1} label`, onChange: (event) => update("Edit discipline label", (draft) => {
            draft.items[itemIndex].label = event.target.value;
          }, `discipline-reveal:${section.id}:item:${item.group}:label`) }, void 0, false, {
            fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
            lineNumber: 1364,
            columnNumber: 15
          }, this),
          /* @__PURE__ */ jsxDEV("div", { className: "about-editor-discipline-palette", title: `${item.label} uses the Home simulation ${DISCIPLINE_BALL_TOKEN_BY_GROUP[item.group]}`, children: [
            /* @__PURE__ */ jsxDEV("i", { style: { background: `var(${DISCIPLINE_BALL_TOKEN_BY_GROUP[item.group]})` } }, void 0, false, {
              fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
              lineNumber: 1366,
              columnNumber: 17
            }, this),
            /* @__PURE__ */ jsxDEV("code", { children: DISCIPLINE_BALL_TOKEN_BY_GROUP[item.group] }, void 0, false, {
              fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
              lineNumber: 1367,
              columnNumber: 17
            }, this)
          ] }, void 0, true, {
            fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
            lineNumber: 1365,
            columnNumber: 15
          }, this),
          /* @__PURE__ */ jsxDEV("span", { children: [
            /* @__PURE__ */ jsxDEV("button", { type: "button", disabled: itemIndex === 0, "aria-label": `Reveal ${item.label} earlier`, onClick: () => update("Reorder discipline reveal", (draft) => {
              const [moved] = draft.items.splice(itemIndex, 1);
              draft.items.splice(itemIndex - 1, 0, moved);
            }), children: "↑" }, void 0, false, {
              fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
              lineNumber: 1370,
              columnNumber: 17
            }, this),
            /* @__PURE__ */ jsxDEV("button", { type: "button", disabled: itemIndex === reveal.items.length - 1, "aria-label": `Reveal ${item.label} later`, onClick: () => update("Reorder discipline reveal", (draft) => {
              const [moved] = draft.items.splice(itemIndex, 1);
              draft.items.splice(itemIndex + 1, 0, moved);
            }), children: "↓" }, void 0, false, {
              fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
              lineNumber: 1371,
              columnNumber: 17
            }, this)
          ] }, void 0, true, {
            fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
            lineNumber: 1369,
            columnNumber: 15
          }, this)
        ] }, item.group, true, {
          fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
          lineNumber: 1362,
          columnNumber: 11
        }, this)
      ) }, void 0, false, {
        fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
        lineNumber: 1360,
        columnNumber: 9
      }, this)
    ] }, void 0, true, {
      fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
      lineNumber: 1359,
      columnNumber: 7
    }, this),
    /* @__PURE__ */ jsxDEV("p", { className: "about-editor-help", children: "The six points persist after the labels leave. An editorial block marked “Reconnect point grid” restores the surrounding grid as that paragraph enters." }, void 0, false, {
      fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
      lineNumber: 1377,
      columnNumber: 7
    }, this)
  ] }, void 0, true, {
    fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
    lineNumber: 1339,
    columnNumber: 5
  }, this);
}
_c9 = DisciplineRevealInspector;
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
    lineNumber: 1441,
    columnNumber: 127
  }, this)) }, void 0, false, {
    fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
    lineNumber: 1441,
    columnNumber: 19
  }, this);
  if (!key) {
    return /* @__PURE__ */ jsxDEV(Fragment, { children: [
      /* @__PURE__ */ jsxDEV("header", { children: [
        /* @__PURE__ */ jsxDEV("span", { children: "Camera track" }, void 0, false, {
          fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
          lineNumber: 1443,
          columnNumber: 22
        }, this),
        /* @__PURE__ */ jsxDEV("strong", { children: "Editing Section base" }, void 0, false, {
          fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
          lineNumber: 1443,
          columnNumber: 47
        }, this)
      ] }, void 0, true, {
        fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
        lineNumber: 1443,
        columnNumber: 14
      }, this),
      /* @__PURE__ */ jsxDEV("p", { className: "about-editor-help", children: "The dolly and Section joins are continuous automatically. Add visible keys only where the framing, aim, roll, or lens should change." }, void 0, false, {
        fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
        lineNumber: 1443,
        columnNumber: 93
      }, this),
      recipes,
      /* @__PURE__ */ jsxDEV("button", { type: "button", className: "about-editor-wide-action", onClick: setKey, children: [
        "Set camera key at ",
        formatCameraPercent(targetAt)
      ] }, void 0, true, {
        fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
        lineNumber: 1443,
        columnNumber: 271
      }, this)
    ] }, void 0, true, {
      fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
      lineNumber: 1443,
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
        lineNumber: 1462,
        columnNumber: 15
      }, this),
      /* @__PURE__ */ jsxDEV("strong", { children: [
        formatCameraPercent(key.at),
        " through ",
        section.label
      ] }, void 0, true, {
        fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
        lineNumber: 1462,
        columnNumber: 38
      }, this)
    ] }, void 0, true, {
      fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
      lineNumber: 1462,
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
        lineNumber: 1464,
        columnNumber: 7
      },
      this
    ),
    /* @__PURE__ */ jsxDEV(NumberProperty, { label: extentLabel, value: section[extentField], min: 1, max: 8, step: 0.05, unit: "WU", onChange: updateExtent }, void 0, false, {
      fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
      lineNumber: 1473,
      columnNumber: 7
    }, this),
    ["X offset", "Y offset", "Forward offset"].map((label, axis) => /* @__PURE__ */ jsxDEV(NumberProperty, { label, value: key.offset[axis], min: -8, max: 8, step: 0.02, unit: "WU", onChange: (value) => updateVector("offset", axis, value) }, label, false, {
      fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
      lineNumber: 1474,
      columnNumber: 72
    }, this)),
    ["Aim X", "Aim Y", "Aim depth"].map((label, axis) => /* @__PURE__ */ jsxDEV(NumberProperty, { label, value: key.lookAtOffset[axis], min: -8, max: 8, step: 0.02, unit: "WU", onChange: (value) => updateVector("lookAtOffset", axis, value) }, label, false, {
      fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
      lineNumber: 1475,
      columnNumber: 61
    }, this)),
    /* @__PURE__ */ jsxDEV(NumberProperty, { label: "Field of view", value: key.fov, min: 20, max: 90, step: 1, unit: "°", onChange: (value) => update("fov", value) }, void 0, false, {
      fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
      lineNumber: 1476,
      columnNumber: 7
    }, this),
    /* @__PURE__ */ jsxDEV(NumberProperty, { label: "Roll", value: key.roll, min: -1.2, max: 1.2, step: 0.01, unit: "rad", onChange: (value) => update("roll", value) }, void 0, false, {
      fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
      lineNumber: 1477,
      columnNumber: 7
    }, this),
    /* @__PURE__ */ jsxDEV(Property, { label: "Easing", children: /* @__PURE__ */ jsxDEV("select", { value: key.easing, onChange: (event) => update("easing", event.target.value), children: [
      /* @__PURE__ */ jsxDEV("option", { value: "smoothstep", children: "Smoothstep" }, void 0, false, {
        fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
        lineNumber: 1478,
        columnNumber: 118
      }, this),
      /* @__PURE__ */ jsxDEV("option", { value: "ease-in-out", children: "Ease in out" }, void 0, false, {
        fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
        lineNumber: 1478,
        columnNumber: 164
      }, this)
    ] }, void 0, true, {
      fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
      lineNumber: 1478,
      columnNumber: 32
    }, this) }, void 0, false, {
      fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
      lineNumber: 1478,
      columnNumber: 7
    }, this),
    /* @__PURE__ */ jsxDEV("button", { type: "button", className: "about-editor-wide-action", disabled: existingKeyAtPlayhead >= 0, onClick: setKey, children: existingKeyAtPlayhead >= 0 ? `Camera key already at ${formatCameraPercent(targetAt)}` : `Set another key at ${formatCameraPercent(targetAt)}` }, void 0, false, {
      fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
      lineNumber: 1479,
      columnNumber: 7
    }, this),
    /* @__PURE__ */ jsxDEV("button", { type: "button", className: "about-editor-danger", onClick: () => store.commit("Delete camera key", (draft) => {
      draft.sections[sectionIndex].camera.keys.splice(keyIndex, 1);
    }, { selection: { type: "section", sectionId: section.id } }), children: "Delete key" }, void 0, false, {
      fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
      lineNumber: 1480,
      columnNumber: 7
    }, this)
  ] }, void 0, true, {
    fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
    lineNumber: 1461,
    columnNumber: 5
  }, this);
}
_c0 = CameraInspector;
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
          lineNumber: 1495,
          columnNumber: 22
        }, this),
        /* @__PURE__ */ jsxDEV("strong", { children: "Inherited World" }, void 0, false, {
          fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
          lineNumber: 1495,
          columnNumber: 46
        }, this)
      ] }, void 0, true, {
        fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
        lineNumber: 1495,
        columnNumber: 14
      }, this),
      /* @__PURE__ */ jsxDEV("p", { className: "about-editor-help", children: "This Section keeps the previous World. Choose “Create World clip” only when the shape should change here." }, void 0, false, {
        fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
        lineNumber: 1495,
        columnNumber: 87
      }, this),
      /* @__PURE__ */ jsxDEV("button", { type: "button", className: "about-editor-wide-action", onClick: () => store.commit("Create World clip", (draft) => {
        draft.sections[sectionIndex].world = cloneAboutNarrativeDocument(draft.sections.slice(0, sectionIndex).reverse().find((item) => item.world.mode === "set")?.world || draft.sections[0].world);
      }), children: "Create World clip" }, void 0, false, {
        fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
        lineNumber: 1495,
        columnNumber: 229
      }, this)
    ] }, void 0, true, {
      fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
      lineNumber: 1495,
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
        lineNumber: 1528,
        columnNumber: 15
      }, this),
      /* @__PURE__ */ jsxDEV("strong", { children: shape?.label || world.shapeId }, void 0, false, {
        fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
        lineNumber: 1528,
        columnNumber: 38
      }, this)
    ] }, void 0, true, {
      fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
      lineNumber: 1528,
      columnNumber: 7
    }, this),
    /* @__PURE__ */ jsxDEV("div", { className: "about-editor-shape-catalog", children: Object.values(ABOUT_NARRATIVE_SHAPE_DEFINITIONS).map(
      (item) => /* @__PURE__ */ jsxDEV("button", { type: "button", disabled: section.locked, className: item.id === world.shapeId ? "is-selected" : "", onClick: () => tryShape(item.id), children: [
        /* @__PURE__ */ jsxDEV("i", {}, void 0, false, {
          fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
          lineNumber: 1532,
          columnNumber: 13
        }, this),
        /* @__PURE__ */ jsxDEV("span", { children: [
          /* @__PURE__ */ jsxDEV("strong", { children: item.label }, void 0, false, {
            fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
            lineNumber: 1532,
            columnNumber: 24
          }, this),
          /* @__PURE__ */ jsxDEV("small", { children: [
            "Cost ",
            item.cost,
            " · Point field"
          ] }, void 0, true, {
            fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
            lineNumber: 1532,
            columnNumber: 53
          }, this)
        ] }, void 0, true, {
          fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
          lineNumber: 1532,
          columnNumber: 18
        }, this)
      ] }, item.id, true, {
        fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
        lineNumber: 1531,
        columnNumber: 9
      }, this)
    ) }, void 0, false, {
      fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
      lineNumber: 1529,
      columnNumber: 7
    }, this),
    snapshot.tryState ? /* @__PURE__ */ jsxDEV("div", { className: "about-editor-try", children: [
      /* @__PURE__ */ jsxDEV("span", { children: [
        "Trying ",
        snapshot.tryState.label
      ] }, void 0, true, {
        fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
        lineNumber: 1536,
        columnNumber: 62
      }, this),
      /* @__PURE__ */ jsxDEV("button", { type: "button", onClick: () => store.cancelTry(), children: "Cancel" }, void 0, false, {
        fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
        lineNumber: 1536,
        columnNumber: 107
      }, this),
      /* @__PURE__ */ jsxDEV("button", { type: "button", className: "is-primary", onClick: () => store.applyTry(), children: "Apply" }, void 0, false, {
        fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
        lineNumber: 1536,
        columnNumber: 178
      }, this)
    ] }, void 0, true, {
      fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
      lineNumber: 1536,
      columnNumber: 28
    }, this) : null,
    /* @__PURE__ */ jsxDEV("details", { open: true, children: [
      /* @__PURE__ */ jsxDEV("summary", { children: "Shape parameters" }, void 0, false, {
        fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
        lineNumber: 1537,
        columnNumber: 21
      }, this),
      (shape?.parameters || []).map((control) => /* @__PURE__ */ jsxDEV(NumberProperty, { label: control.label, value: world.shapeParameters[control.id], min: control.min, max: control.max, step: control.step, unit: control.unit, onChange: (value) => update(`Change ${control.label}`, (draft) => {
        draft.shapeParameters[control.id] = value;
      }, `world:${section.id}:${control.id}`) }, control.id, false, {
        fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
        lineNumber: 1538,
        columnNumber: 53
      }, this)),
      /* @__PURE__ */ jsxDEV("div", { className: "about-editor-inline-actions", children: [
        /* @__PURE__ */ jsxDEV("button", { type: "button", onClick: () => update("Reseed Shape", (draft) => {
          draft.seed = Math.floor(Math.random() * 4294967295);
        }), children: "Reseed" }, void 0, false, {
          fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
          lineNumber: 1539,
          columnNumber: 54
        }, this),
        /* @__PURE__ */ jsxDEV("code", { children: world.seed }, void 0, false, {
          fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
          lineNumber: 1539,
          columnNumber: 197
        }, this)
      ] }, void 0, true, {
        fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
        lineNumber: 1539,
        columnNumber: 9
      }, this)
    ] }, void 0, true, {
      fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
      lineNumber: 1537,
      columnNumber: 7
    }, this),
    /* @__PURE__ */ jsxDEV("details", { open: true, children: [
      /* @__PURE__ */ jsxDEV("summary", { children: "Placement" }, void 0, false, {
        fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
        lineNumber: 1541,
        columnNumber: 21
      }, this),
      /* @__PURE__ */ jsxDEV(NumberProperty, { label: "Distance at entry", value: world.entryDistanceWU, min: 0.2, max: 16, step: 0.05, unit: "WU", onChange: (value) => update("Move World", (draft) => {
        draft.entryDistanceWU = value;
      }, `world:${section.id}:distance`) }, void 0, false, {
        fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
        lineNumber: 1542,
        columnNumber: 9
      }, this),
      /* @__PURE__ */ jsxDEV(NumberProperty, { label: "Scale", value: world.transform.scale, min: 0.1, max: 3, step: 0.01, onChange: (value) => update("Scale World", (draft) => {
        draft.transform.scale = value;
      }, `world:${section.id}:scale`) }, void 0, false, {
        fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
        lineNumber: 1543,
        columnNumber: 9
      }, this)
    ] }, void 0, true, {
      fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
      lineNumber: 1541,
      columnNumber: 7
    }, this),
    /* @__PURE__ */ jsxDEV("details", { open: true, children: [
      /* @__PURE__ */ jsxDEV("summary", { children: "Transition in" }, void 0, false, {
        fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
        lineNumber: 1545,
        columnNumber: 21
      }, this),
      transitionEnabled ? /* @__PURE__ */ jsxDEV(Fragment, { children: [
        /* @__PURE__ */ jsxDEV("p", { className: "about-editor-help", children: [
          "Timing is relative to this Section: 1 is its end; values above 1 continue across inherited World Sections. The next World begins at ",
          transitionLimit.toFixed(3),
          "."
        ] }, void 0, true, {
          fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
          lineNumber: 1547,
          columnNumber: 11
        }, this),
        /* @__PURE__ */ jsxDEV(NumberProperty, { label: "Start", value: world.transitionIn.start, min: 0, max: transitionMax, step: 5e-3, unit: "× section", onChange: (value) => update("Change transition start", (draft) => {
          draft.transitionIn.start = Math.min(value, draft.transitionIn.end);
        }) }, void 0, false, {
          fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
          lineNumber: 1548,
          columnNumber: 11
        }, this),
        /* @__PURE__ */ jsxDEV(NumberProperty, { label: "End", value: world.transitionIn.end, min: 0, max: transitionMax, step: 5e-3, unit: "× section", onChange: (value) => update("Change transition end", (draft) => {
          draft.transitionIn.end = Math.max(value, draft.transitionIn.start);
        }) }, void 0, false, {
          fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
          lineNumber: 1549,
          columnNumber: 11
        }, this),
        /* @__PURE__ */ jsxDEV(Property, { label: "Type", children: /* @__PURE__ */ jsxDEV("select", { value: world.transitionIn.type, onChange: (event) => update("Change transition type", (draft) => {
          draft.transitionIn.type = event.target.value;
        }), children: [
          /* @__PURE__ */ jsxDEV("option", { value: "morph", children: "Morph" }, void 0, false, {
            fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
            lineNumber: 1550,
            columnNumber: 189
          }, this),
          /* @__PURE__ */ jsxDEV("option", { value: "dissolve-morph", children: "Dissolve morph" }, void 0, false, {
            fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
            lineNumber: 1550,
            columnNumber: 225
          }, this),
          /* @__PURE__ */ jsxDEV("option", { value: "crossfade", children: "Crossfade" }, void 0, false, {
            fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
            lineNumber: 1550,
            columnNumber: 279
          }, this),
          /* @__PURE__ */ jsxDEV("option", { value: "hold", children: "Hold" }, void 0, false, {
            fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
            lineNumber: 1550,
            columnNumber: 323
          }, this)
        ] }, void 0, true, {
          fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
          lineNumber: 1550,
          columnNumber: 34
        }, this) }, void 0, false, {
          fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
          lineNumber: 1550,
          columnNumber: 11
        }, this),
        /* @__PURE__ */ jsxDEV(Property, { label: "Easing", children: /* @__PURE__ */ jsxDEV("select", { value: world.transitionIn.easing, onChange: (event) => update("Change transition easing", (draft) => {
          draft.transitionIn.easing = event.target.value;
        }), children: [
          /* @__PURE__ */ jsxDEV("option", { value: "linear", children: "Linear" }, void 0, false, {
            fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
            lineNumber: 1551,
            columnNumber: 197
          }, this),
          /* @__PURE__ */ jsxDEV("option", { value: "smoothstep", children: "Smoothstep" }, void 0, false, {
            fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
            lineNumber: 1551,
            columnNumber: 235
          }, this),
          /* @__PURE__ */ jsxDEV("option", { value: "ease-in", children: "Ease in" }, void 0, false, {
            fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
            lineNumber: 1551,
            columnNumber: 281
          }, this),
          /* @__PURE__ */ jsxDEV("option", { value: "ease-out", children: "Ease out" }, void 0, false, {
            fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
            lineNumber: 1551,
            columnNumber: 321
          }, this),
          /* @__PURE__ */ jsxDEV("option", { value: "ease-in-out", children: "Ease in out" }, void 0, false, {
            fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
            lineNumber: 1551,
            columnNumber: 363
          }, this),
          /* @__PURE__ */ jsxDEV("option", { value: "hold", children: "Hold" }, void 0, false, {
            fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
            lineNumber: 1551,
            columnNumber: 411
          }, this)
        ] }, void 0, true, {
          fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
          lineNumber: 1551,
          columnNumber: 36
        }, this) }, void 0, false, {
          fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
          lineNumber: 1551,
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
          lineNumber: 1552,
          columnNumber: 11
        }, this),
        /* @__PURE__ */ jsxDEV(Property, { label: "Correspondence", children: /* @__PURE__ */ jsxDEV("select", { "aria-label": "Correspondence", value: world.transitionIn.correspondence, disabled: !correspondenceEnabled, title: correspondenceEnabled ? "Choose how source points are assigned to target points." : "Correspondence applies to Morph and Dissolve morph transitions.", onChange: (event) => update("Change correspondence", (draft) => {
          draft.transitionIn.correspondence = event.target.value;
        }), children: ABOUT_NARRATIVE_CORRESPONDENCE_MODES.map((mode) => /* @__PURE__ */ jsxDEV("option", { value: mode, children: CORRESPONDENCE_LABELS[mode] || mode }, mode, false, {
          fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
          lineNumber: 1553,
          columnNumber: 490
        }, this)) }, void 0, false, {
          fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
          lineNumber: 1553,
          columnNumber: 44
        }, this) }, void 0, false, {
          fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
          lineNumber: 1553,
          columnNumber: 11
        }, this),
        /* @__PURE__ */ jsxDEV("p", { className: "about-editor-help", role: "status", "aria-live": "polite", children: [
          "Correspondence: ",
          correspondenceStatus,
          prepared && runtimeMetrics?.correspondenceToWorldId === section.id && Number.isFinite(runtimeMetrics?.correspondenceImprovement) ? ` · ${Math.round(runtimeMetrics.correspondenceImprovement * 100)}% RMS improvement` : "",
          "."
        ] }, void 0, true, {
          fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
          lineNumber: 1554,
          columnNumber: 11
        }, this),
        /* @__PURE__ */ jsxDEV("button", { type: "button", className: "about-editor-danger", onClick: () => store.commit("Remove World transition", (draft) => {
          const transition = draft.sections[sectionIndex].world.transitionIn;
          transition.start = 0;
          transition.end = 0;
          transition.type = "cut";
        }, { selection: { type: "world", sectionId: section.id } }), children: "Remove transition keyframes" }, void 0, false, {
          fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
          lineNumber: 1555,
          columnNumber: 11
        }, this)
      ] }, void 0, true, {
        fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
        lineNumber: 1546,
        columnNumber: 30
      }, this) : /* @__PURE__ */ jsxDEV(Fragment, { children: [
        /* @__PURE__ */ jsxDEV("p", { className: "about-editor-help", children: "This World cuts in at the Section boundary and has no transition keyframes." }, void 0, false, {
          fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
          lineNumber: 1562,
          columnNumber: 11
        }, this),
        /* @__PURE__ */ jsxDEV("button", { type: "button", className: "about-editor-wide-action", onClick: () => store.commit("Add World transition", (draft) => {
          const transition = draft.sections[sectionIndex].world.transitionIn;
          transition.start = Math.min(0.08, transitionLimit);
          transition.end = Math.min(0.68, transitionLimit);
          transition.type = "morph";
        }, { selection: { type: "world", sectionId: section.id } }), children: "Add transition keyframes" }, void 0, false, {
          fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
          lineNumber: 1563,
          columnNumber: 11
        }, this)
      ] }, void 0, true, {
        fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
        lineNumber: 1561,
        columnNumber: 15
      }, this)
    ] }, void 0, true, {
      fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
      lineNumber: 1545,
      columnNumber: 7
    }, this),
    /* @__PURE__ */ jsxDEV("details", { open: true, children: [
      /* @__PURE__ */ jsxDEV("summary", { children: "Modifier stack" }, void 0, false, {
        fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
        lineNumber: 1571,
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
                lineNumber: 1580,
                columnNumber: 105
              }, this),
              definition?.label || item.id
            ] }, void 0, true, {
              fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
              lineNumber: 1580,
              columnNumber: 98
            }, this),
            /* @__PURE__ */ jsxDEV("span", { children: [
              /* @__PURE__ */ jsxDEV("button", { type: "button", disabled: modifierIndex === 0, onClick: () => moveModifier(-1), "aria-label": "Move modifier up", children: "↑" }, void 0, false, {
                fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
                lineNumber: 1580,
                columnNumber: 334
              }, this),
              /* @__PURE__ */ jsxDEV("button", { type: "button", disabled: modifierIndex === world.modifiers.length - 1, onClick: () => moveModifier(1), "aria-label": "Move modifier down", children: "↓" }, void 0, false, {
                fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
                lineNumber: 1580,
                columnNumber: 460
              }, this),
              " Cost ",
              definition?.cost || "?"
            ] }, void 0, true, {
              fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
              lineNumber: 1580,
              columnNumber: 328
            }, this)
          ] }, void 0, true, {
            fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
            lineNumber: 1580,
            columnNumber: 93
          }, this),
          (definition?.parameters || []).map((control) => control.type === "range" ? /* @__PURE__ */ jsxDEV(NumberProperty, { label: control.label, value: item.parameters[control.id], min: control.min, max: control.max, step: control.step, unit: control.unit, onChange: (value) => update(`Change ${control.label}`, (draft) => {
            draft.modifiers[modifierIndex].parameters[control.id] = value;
          }, `modifier:${section.id}:${modifierIndex}:${control.id}`) }, control.id, false, {
            fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
            lineNumber: 1580,
            columnNumber: 732
          }, this) : /* @__PURE__ */ jsxDEV(Property, { label: control.label, children: /* @__PURE__ */ jsxDEV("select", { value: item.parameters[control.id], onChange: (event) => update(`Change ${control.label}`, (draft) => {
            draft.modifiers[modifierIndex].parameters[control.id] = event.target.value;
          }), children: control.options.map((option) => /* @__PURE__ */ jsxDEV("option", { children: option }, option, false, {
            fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
            lineNumber: 1580,
            columnNumber: 1366
          }, this)) }, void 0, false, {
            fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
            lineNumber: 1580,
            columnNumber: 1143
          }, this) }, control.id, false, {
            fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
            lineNumber: 1580,
            columnNumber: 1094
          }, this))
        ] }, `${item.id}-${modifierIndex}`, true, {
          fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
          lineNumber: 1580,
          columnNumber: 18
        }, this);
      })
    ] }, void 0, true, {
      fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
      lineNumber: 1571,
      columnNumber: 7
    }, this)
  ] }, void 0, true, {
    fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
    lineNumber: 1527,
    columnNumber: 5
  }, this);
}
_c1 = WorldInspector;
function Diagnostics({ diagnostics }) {
  if (!diagnostics.length) return /* @__PURE__ */ jsxDEV("div", { className: "about-editor-diagnostics is-clear", children: [
    /* @__PURE__ */ jsxDEV(Check, { "aria-hidden": "true" }, void 0, false, {
      fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
      lineNumber: 1588,
      columnNumber: 86
    }, this),
    " No diagnostics"
  ] }, void 0, true, {
    fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
    lineNumber: 1588,
    columnNumber: 35
  }, this);
  return /* @__PURE__ */ jsxDEV("div", { className: "about-editor-diagnostics", children: diagnostics.map((item, index) => {
    const DiagnosticIcon = item.level === "error" ? CircleAlert : Info;
    return /* @__PURE__ */ jsxDEV("div", { className: `is-${item.level}`, children: [
      /* @__PURE__ */ jsxDEV(DiagnosticIcon, { "aria-hidden": "true" }, void 0, false, {
        fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
        lineNumber: 1591,
        columnNumber: 93
      }, this),
      /* @__PURE__ */ jsxDEV("span", { children: [
        /* @__PURE__ */ jsxDEV("strong", { children: item.message }, void 0, false, {
          fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
          lineNumber: 1591,
          columnNumber: 136
        }, this),
        /* @__PURE__ */ jsxDEV("small", { children: item.path }, void 0, false, {
          fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
          lineNumber: 1591,
          columnNumber: 167
        }, this)
      ] }, void 0, true, {
        fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
        lineNumber: 1591,
        columnNumber: 130
      }, this)
    ] }, `${item.code}-${item.path}-${index}`, true, {
      fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
      lineNumber: 1591,
      columnNumber: 14
    }, this);
  }) }, void 0, false, {
    fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
    lineNumber: 1589,
    columnNumber: 10
  }, this);
}
_c10 = Diagnostics;
function Inspector({ store, snapshot, timelineOpen, runtimeMetrics }) {
  _s2();
  const inspectorRef = useRef(null);
  const dragRef = useRef(null);
  const lastHeaderClickRef = useRef(null);
  const [position, setPosition] = useState(null);
  const [dragging, setDragging] = useState(false);
  const section = getSection(snapshot.document, snapshot.selection);
  let content = /* @__PURE__ */ jsxDEV(SectionInspector, { store, snapshot, section }, void 0, false, {
    fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
    lineNumber: 1602,
    columnNumber: 17
  }, this);
  if (snapshot.selection.type === "sequence") content = /* @__PURE__ */ jsxDEV(SequenceInspector, { store, snapshot }, void 0, false, {
    fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
    lineNumber: 1603,
    columnNumber: 57
  }, this);
  if (snapshot.selection.type === "cue") content = /* @__PURE__ */ jsxDEV(CueInspector, { store, snapshot, section }, void 0, false, {
    fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
    lineNumber: 1604,
    columnNumber: 52
  }, this);
  if (snapshot.selection.type === "discipline-reveal") content = /* @__PURE__ */ jsxDEV(DisciplineRevealInspector, { store, snapshot, section }, void 0, false, {
    fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
    lineNumber: 1605,
    columnNumber: 66
  }, this);
  if (snapshot.selection.type === "camera-key") content = /* @__PURE__ */ jsxDEV(CameraInspector, { store, snapshot, section }, void 0, false, {
    fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
    lineNumber: 1606,
    columnNumber: 59
  }, this);
  if (snapshot.selection.type === "world") content = /* @__PURE__ */ jsxDEV(WorldInspector, { store, snapshot, section, runtimeMetrics }, void 0, false, {
    fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
    lineNumber: 1607,
    columnNumber: 54
  }, this);
  if (snapshot.selection.type === "interaction") content = /* @__PURE__ */ jsxDEV(SectionInspector, { store, snapshot, section }, void 0, false, {
    fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
    lineNumber: 1608,
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
        /* @__PURE__ */ jsxDEV(Diagnostics, { diagnostics: snapshot.diagnostics }, void 0, false, {
          fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
          lineNumber: 1708,
          columnNumber: 63
        }, this)
      ] }, void 0, true, {
        fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
        lineNumber: 1708,
        columnNumber: 7
      }, this)
    },
    void 0,
    false,
    {
      fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
      lineNumber: 1691,
      columnNumber: 5
    },
    this
  );
}
_s2(Inspector, "+h4TZ3OOjdefApVkJJ1n/C7j/fg=");
_c11 = Inspector;
function CameraPathOverlay({ snapshot }) {
  const sections = snapshot.compiledPlan?.sections || [];
  const total = snapshot.compiledPlan?.maxStoryWU || 1;
  return /* @__PURE__ */ jsxDEV("div", { className: "about-editor-path-overlay", "aria-label": "Camera path overlay", children: [
    /* @__PURE__ */ jsxDEV("div", { children: [
      /* @__PURE__ */ jsxDEV("strong", { children: "Path · constant cadence" }, void 0, false, {
        fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
        lineNumber: 1717,
        columnNumber: 12
      }, this),
      /* @__PURE__ */ jsxDEV("span", { children: [
        formatWU(snapshot.transport.storyWU),
        " / ",
        formatWU(total)
      ] }, void 0, true, {
        fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
        lineNumber: 1717,
        columnNumber: 52
      }, this)
    ] }, void 0, true, {
      fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
      lineNumber: 1717,
      columnNumber: 7
    }, this),
    /* @__PURE__ */ jsxDEV("svg", { viewBox: "0 0 240 112", role: "img", "aria-label": "Camera and World anchors over story distance", children: [
      /* @__PURE__ */ jsxDEV("path", { d: "M18 56 H222" }, void 0, false, {
        fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
        lineNumber: 1719,
        columnNumber: 9
      }, this),
      sections.map((section) => {
        const x = 18 + section.startWU / total * 204;
        return /* @__PURE__ */ jsxDEV("g", { transform: `translate(${x} 56)`, children: [
          /* @__PURE__ */ jsxDEV("line", { y1: "-12", y2: "12" }, void 0, false, {
            fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
            lineNumber: 1722,
            columnNumber: 71
          }, this),
          /* @__PURE__ */ jsxDEV("circle", { r: section.worldState?.changesWorld ? 4 : 2 }, void 0, false, {
            fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
            lineNumber: 1722,
            columnNumber: 96
          }, this),
          /* @__PURE__ */ jsxDEV("title", { children: [
            section.label,
            section.worldState?.changesWorld ? ` · ${section.worldState.activeWorld.shapeId}` : ""
          ] }, void 0, true, {
            fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
            lineNumber: 1722,
            columnNumber: 151
          }, this)
        ] }, section.id, true, {
          fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
          lineNumber: 1722,
          columnNumber: 18
        }, this);
      }),
      /* @__PURE__ */ jsxDEV("g", { className: "is-playhead", transform: `translate(${18 + snapshot.transport.storyWU / total * 204} 56)`, children: [
        /* @__PURE__ */ jsxDEV("path", { d: "M0 -22 L5 -15 H-5 Z" }, void 0, false, {
          fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
          lineNumber: 1724,
          columnNumber: 113
        }, this),
        /* @__PURE__ */ jsxDEV("line", { y1: "-15", y2: "22" }, void 0, false, {
          fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
          lineNumber: 1724,
          columnNumber: 145
        }, this)
      ] }, void 0, true, {
        fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
        lineNumber: 1724,
        columnNumber: 9
      }, this)
    ] }, void 0, true, {
      fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
      lineNumber: 1718,
      columnNumber: 7
    }, this),
    /* @__PURE__ */ jsxDEV("small", { children: "Dots are Section boundaries. Large dots are fixed World anchors. The marker is the published camera." }, void 0, false, {
      fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
      lineNumber: 1726,
      columnNumber: 7
    }, this)
  ] }, void 0, true, {
    fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
    lineNumber: 1716,
    columnNumber: 5
  }, this);
}
_c12 = CameraPathOverlay;
export default function AboutNarrativeEditor({ store, runtimeRef, rootRef }) {
  _s3();
  const snapshot = useSyncExternalStore(store.subscribe, store.getSnapshot);
  const [checkpoints, setCheckpoints] = useState(() => readAboutNarrativeCheckpoints());
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
  const loopActive = Boolean(snapshot.transport.loop?.sectionId === selected?.id);
  const timelineDeletion = getTimelineDeletion(snapshot);
  const toggleLoop = () => store.setTransport({
    loop: loopActive || !compiledSelected ? null : {
      sectionId: selected.id,
      startWU: compiledSelected.startWU,
      endWU: compiledSelected.startWU + compiledSelected.travelWU
    }
  });
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
                lineNumber: 1948,
                columnNumber: 119
              }, this),
              /* @__PURE__ */ jsxDEV("span", { children: "About Narrative" }, void 0, false, {
                fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
                lineNumber: 1948,
                columnNumber: 149
              }, this),
              /* @__PURE__ */ jsxDEV("small", { children: "Creative toolkit" }, void 0, false, {
                fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
                lineNumber: 1948,
                columnNumber: 177
              }, this)
            ] }, void 0, true, {
              fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
              lineNumber: 1948,
              columnNumber: 9
            }, this),
            /* @__PURE__ */ jsxDEV(Transport, { store, snapshot }, void 0, false, {
              fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
              lineNumber: 1949,
              columnNumber: 9
            }, this),
            /* @__PURE__ */ jsxDEV("div", { className: "about-editor-actions", children: [
              /* @__PURE__ */ jsxDEV("button", { type: "button", disabled: !snapshot.history.canUndo, title: snapshot.history.undoLabel || "Undo", "aria-label": "Undo", onClick: () => store.undo(), children: /* @__PURE__ */ jsxDEV("span", { "aria-hidden": "true", children: "↶" }, void 0, false, {
                fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
                lineNumber: 1951,
                columnNumber: 162
              }, this) }, void 0, false, {
                fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
                lineNumber: 1951,
                columnNumber: 11
              }, this),
              /* @__PURE__ */ jsxDEV("button", { type: "button", disabled: !snapshot.history.canRedo, title: snapshot.history.redoLabel || "Redo", "aria-label": "Redo", onClick: () => store.redo(), children: /* @__PURE__ */ jsxDEV("span", { "aria-hidden": "true", children: "↷" }, void 0, false, {
                fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
                lineNumber: 1952,
                columnNumber: 162
              }, this) }, void 0, false, {
                fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
                lineNumber: 1952,
                columnNumber: 11
              }, this),
              /* @__PURE__ */ jsxDEV("button", { type: "button", className: pathVisible ? "is-active" : "", onClick: () => setPathVisible(!pathVisible), children: "Path" }, void 0, false, {
                fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
                lineNumber: 1953,
                columnNumber: 11
              }, this),
              /* @__PURE__ */ jsxDEV("button", { type: "button", className: directorView ? "is-active" : "", onClick: toggleDirector, children: directorView ? "Director" : "Camera" }, void 0, false, {
                fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
                lineNumber: 1954,
                columnNumber: 11
              }, this),
              /* @__PURE__ */ jsxDEV("button", { type: "button", className: snapshot.tryState?.label === "Compare saved source" ? "is-active" : "", disabled: snapshot.tryState && snapshot.tryState.label !== "Compare saved source", onClick: toggleBefore, children: snapshot.tryState?.label === "Compare saved source" ? "Before" : "After" }, void 0, false, {
                fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
                lineNumber: 1955,
                columnNumber: 11
              }, this),
              /* @__PURE__ */ jsxDEV("details", { className: "about-editor-more", children: [
                /* @__PURE__ */ jsxDEV("summary", { children: "More" }, void 0, false, {
                  fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
                  lineNumber: 1957,
                  columnNumber: 13
                }, this),
                /* @__PURE__ */ jsxDEV("div", { children: [
                  /* @__PURE__ */ jsxDEV("button", { type: "button", onClick: addCheckpoint, children: "Checkpoint" }, void 0, false, {
                    fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
                    lineNumber: 1959,
                    columnNumber: 15
                  }, this),
                  /* @__PURE__ */ jsxDEV("button", { type: "button", onClick: () => exportAboutNarrativeDocument(snapshot.document), children: "Export JSON" }, void 0, false, {
                    fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
                    lineNumber: 1960,
                    columnNumber: 15
                  }, this),
                  /* @__PURE__ */ jsxDEV("button", { type: "button", onClick: () => importRef.current?.click(), children: "Import JSON" }, void 0, false, {
                    fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
                    lineNumber: 1961,
                    columnNumber: 15
                  }, this)
                ] }, void 0, true, {
                  fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
                  lineNumber: 1958,
                  columnNumber: 13
                }, this)
              ] }, void 0, true, {
                fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
                lineNumber: 1956,
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
                lineNumber: 1964,
                columnNumber: 11
              }, this),
              /* @__PURE__ */ jsxDEV("button", { type: "button", "data-about-editor-save": true, className: "is-save", disabled: snapshot.saveState.status === "saving", onClick: save, children: [
                /* @__PURE__ */ jsxDEV("span", { children: statusLabel }, void 0, false, {
                  fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
                  lineNumber: 1974,
                  columnNumber: 141
                }, this),
                /* @__PURE__ */ jsxDEV("kbd", { children: "⌘S" }, void 0, false, {
                  fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
                  lineNumber: 1974,
                  columnNumber: 167
                }, this)
              ] }, void 0, true, {
                fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
                lineNumber: 1974,
                columnNumber: 11
              }, this)
            ] }, void 0, true, {
              fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
              lineNumber: 1950,
              columnNumber: 9
            }, this)
          ] }, void 0, true, {
            fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
            lineNumber: 1947,
            columnNumber: 7
          }, this),
          snapshot.recoveryState.available ? /* @__PURE__ */ jsxDEV("div", { className: "about-editor-recovery", children: [
            /* @__PURE__ */ jsxDEV("span", { children: [
              "An unsaved draft from ",
              new Date(snapshot.recoveryState.draft.timestamp).toLocaleString(),
              " is available."
            ] }, void 0, true, {
              fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
              lineNumber: 1978,
              columnNumber: 82
            }, this),
            /* @__PURE__ */ jsxDEV("button", { type: "button", onClick: () => {
              store.replaceDocument("Recover draft", snapshot.recoveryState.draft.document);
              store.setRecoveryState({ available: false });
            }, children: "Recover as unsaved copy" }, void 0, false, {
              fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
              lineNumber: 1978,
              columnNumber: 198
            }, this),
            /* @__PURE__ */ jsxDEV("button", { type: "button", onClick: () => {
              exportAboutNarrativeDocument(snapshot.recoveryState.draft.document, "contents-about-recovered.json");
            }, children: "Export" }, void 0, false, {
              fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
              lineNumber: 1978,
              columnNumber: 394
            }, this),
            /* @__PURE__ */ jsxDEV("button", { type: "button", onClick: () => {
              clearAboutNarrativeRecoveryDraft();
              store.setRecoveryState({ available: false });
            }, children: "Discard" }, void 0, false, {
              fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
              lineNumber: 1978,
              columnNumber: 551
            }, this)
          ] }, void 0, true, {
            fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
            lineNumber: 1978,
            columnNumber: 43
          }, this) : null,
          snapshot.saveState.message ? /* @__PURE__ */ jsxDEV("div", { className: `about-editor-save-message is-${snapshot.saveState.status}`, children: [
            snapshot.saveState.message,
            /* @__PURE__ */ jsxDEV("button", { type: "button", "aria-label": "Dismiss message", onClick: () => store.setSaveState({ message: "" }), children: "×" }, void 0, false, {
              fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
              lineNumber: 1979,
              columnNumber: 142
            }, this)
          ] }, void 0, true, {
            fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
            lineNumber: 1979,
            columnNumber: 37
          }, this) : null,
          pathVisible ? /* @__PURE__ */ jsxDEV(CameraPathOverlay, { snapshot }, void 0, false, {
            fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
            lineNumber: 1981,
            columnNumber: 22
          }, this) : null,
          directorView ? /* @__PURE__ */ jsxDEV("div", { className: "about-editor-director-controls", children: [
            /* @__PURE__ */ jsxDEV("strong", { children: "Director View" }, void 0, false, {
              fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
              lineNumber: 1982,
              columnNumber: 71
            }, this),
            /* @__PURE__ */ jsxDEV("button", { type: "button", onClick: () => runtimeRef.current?.nudgeDirector?.({ yaw: -0.08 }), children: "←" }, void 0, false, {
              fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
              lineNumber: 1982,
              columnNumber: 101
            }, this),
            /* @__PURE__ */ jsxDEV("button", { type: "button", onClick: () => runtimeRef.current?.nudgeDirector?.({ pitch: 0.08 }), children: "↑" }, void 0, false, {
              fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
              lineNumber: 1982,
              columnNumber: 201
            }, this),
            /* @__PURE__ */ jsxDEV("button", { type: "button", onClick: () => runtimeRef.current?.nudgeDirector?.({ pitch: -0.08 }), children: "↓" }, void 0, false, {
              fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
              lineNumber: 1982,
              columnNumber: 302
            }, this),
            /* @__PURE__ */ jsxDEV("button", { type: "button", onClick: () => runtimeRef.current?.nudgeDirector?.({ yaw: 0.08 }), children: "→" }, void 0, false, {
              fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
              lineNumber: 1982,
              columnNumber: 404
            }, this),
            /* @__PURE__ */ jsxDEV("button", { type: "button", onClick: () => runtimeRef.current?.nudgeDirector?.({ distance: -0.2 }), children: "＋" }, void 0, false, {
              fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
              lineNumber: 1982,
              columnNumber: 503
            }, this),
            /* @__PURE__ */ jsxDEV("button", { type: "button", onClick: () => runtimeRef.current?.nudgeDirector?.({ distance: 0.2 }), children: "−" }, void 0, false, {
              fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
              lineNumber: 1982,
              columnNumber: 607
            }, this),
            /* @__PURE__ */ jsxDEV("button", { type: "button", onClick: () => runtimeRef.current?.resetDirector?.(), children: "Reset" }, void 0, false, {
              fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
              lineNumber: 1982,
              columnNumber: 710
            }, this),
            /* @__PURE__ */ jsxDEV("small", { children: "Temporary inspection only. Published Camera keys are unchanged." }, void 0, false, {
              fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
              lineNumber: 1982,
              columnNumber: 800
            }, this)
          ] }, void 0, true, {
            fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
            lineNumber: 1982,
            columnNumber: 23
          }, this) : null,
          /* @__PURE__ */ jsxDEV(Inspector, { store, snapshot, timelineOpen, runtimeMetrics }, void 0, false, {
            fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
            lineNumber: 1984,
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
                  lineNumber: 1992,
                  columnNumber: 25
                }, this) : /* @__PURE__ */ jsxDEV(ChevronUp, { "aria-hidden": "true" }, void 0, false, {
                  fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
                  lineNumber: 1992,
                  columnNumber: 62
                }, this),
                /* @__PURE__ */ jsxDEV("span", { children: timelineOpen ? "Hide timeline" : "Show timeline" }, void 0, false, {
                  fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
                  lineNumber: 1992,
                  columnNumber: 95
                }, this)
              ]
            },
            void 0,
            true,
            {
              fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
              lineNumber: 1985,
              columnNumber: 7
            },
            this
          ),
          /* @__PURE__ */ jsxDEV("div", { id: "about-editor-timeline-panel", className: "about-editor-bottom", "aria-hidden": !timelineOpen, children: [
            /* @__PURE__ */ jsxDEV("div", { className: "about-editor-contextbar", children: [
              /* @__PURE__ */ jsxDEV("span", { children: [
                /* @__PURE__ */ jsxDEV("strong", { children: selected?.label || "Sequence" }, void 0, false, {
                  fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
                  lineNumber: 1995,
                  columnNumber: 17
                }, this),
                " ",
                selected ? `${selected.type} · ${formatWU(Math.max(0, selectedExtent - 1))} scroll · ${formatWU(selectedExtent)} total${resolvedExtent > selectedExtent + 1e-3 ? ` · ${formatWU(resolvedExtent)} resolved` : ""}` : ""
              ] }, void 0, true, {
                fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
                lineNumber: 1995,
                columnNumber: 11
              }, this),
              selectedCueCount > 1 ? /* @__PURE__ */ jsxDEV("span", { className: "about-editor-selection-count", children: [
                selectedCueCount,
                " titles selected"
              ] }, void 0, true, {
                fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
                lineNumber: 1996,
                columnNumber: 35
              }, this) : null,
              /* @__PURE__ */ jsxDEV("span", { children: snapshot.autoKey ? "Auto-key armed" : "Auto-key off" }, void 0, false, {
                fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
                lineNumber: 1997,
                columnNumber: 11
              }, this),
              /* @__PURE__ */ jsxDEV("button", { type: "button", className: snapshot.autoKey ? "is-active" : "", onClick: () => store.setAutoKey(!snapshot.autoKey), children: "◆ Auto-key" }, void 0, false, {
                fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
                lineNumber: 1998,
                columnNumber: 11
              }, this),
              /* @__PURE__ */ jsxDEV("button", { type: "button", className: loopActive ? "is-active" : "", onClick: toggleLoop, children: "Loop Section" }, void 0, false, {
                fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
                lineNumber: 1999,
                columnNumber: 11
              }, this),
              /* @__PURE__ */ jsxDEV("button", { type: "button", onClick: fitSequence, children: "Fit sequence" }, void 0, false, {
                fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
                lineNumber: 2e3,
                columnNumber: 11
              }, this),
              /* @__PURE__ */ jsxDEV("button", { type: "button", disabled: !compiledSelected, onClick: fitSection, children: "Fit Section" }, void 0, false, {
                fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
                lineNumber: 2001,
                columnNumber: 11
              }, this),
              ["camera", "world", "text"].map((track) => /* @__PURE__ */ jsxDEV("button", { type: "button", className: snapshot.transport.soloTrack === track ? "is-active" : "", onClick: () => toggleSolo(track), children: [
                "Solo ",
                track
              ] }, track, true, {
                fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
                lineNumber: 2002,
                columnNumber: 55
              }, this)),
              timelineDeletion ? /* @__PURE__ */ jsxDEV("button", { type: "button", className: "about-editor-delete-key", disabled: timelineDeletion.disabled, title: timelineDeletion.message || `${timelineDeletion.label} · Delete/Backspace`, onClick: () => deleteTimelineSelection(store, snapshot), children: [
                /* @__PURE__ */ jsxDEV(Trash2, { "aria-hidden": "true" }, void 0, false, {
                  fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
                  lineNumber: 2003,
                  columnNumber: 266
                }, this),
                timelineDeletion.label
              ] }, void 0, true, {
                fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
                lineNumber: 2003,
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
                lineNumber: 2004,
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
                  lineNumber: 2005,
                  columnNumber: 369
                }, this),
                checkpoints.map((item) => /* @__PURE__ */ jsxDEV("option", { value: item.id, children: item.name }, item.id, false, {
                  fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
                  lineNumber: 2005,
                  columnNumber: 456
                }, this))
              ] }, void 0, true, {
                fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
                lineNumber: 2005,
                columnNumber: 33
              }, this) : null
            ] }, void 0, true, {
              fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
              lineNumber: 1994,
              columnNumber: 9
            }, this),
            /* @__PURE__ */ jsxDEV(Timeline, { store, snapshot }, void 0, false, {
              fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
              lineNumber: 2007,
              columnNumber: 9
            }, this)
          ] }, void 0, true, {
            fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
            lineNumber: 1993,
            columnNumber: 7
          }, this),
          /* @__PURE__ */ jsxDEV("nav", { className: "about-editor-mobile-tabs", "aria-label": "Editor panel", children: [
            /* @__PURE__ */ jsxDEV("button", { type: "button", className: mobilePane === "sequence" ? "is-active" : "", onClick: () => setMobilePane("sequence"), children: "Sequence" }, void 0, false, {
              fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
              lineNumber: 2009,
              columnNumber: 75
            }, this),
            /* @__PURE__ */ jsxDEV("button", { type: "button", className: mobilePane === "inspect" ? "is-active" : "", onClick: () => setMobilePane("inspect"), children: "Inspect" }, void 0, false, {
              fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
              lineNumber: 2009,
              columnNumber: 213
            }, this),
            /* @__PURE__ */ jsxDEV("button", { type: "button", className: mobilePane === "preview" ? "is-active" : "", onClick: () => setMobilePane("preview"), children: "Preview" }, void 0, false, {
              fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
              lineNumber: 2009,
              columnNumber: 348
            }, this)
          ] }, void 0, true, {
            fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
            lineNumber: 2009,
            columnNumber: 7
          }, this)
        ]
      },
      void 0,
      true,
      {
        fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
        lineNumber: 1940,
        columnNumber: 5
      },
      this
    ),
    document.body
  );
}
_s3(AboutNarrativeEditor, "moa2etstN8Q/qz93C6D3MdwA6SA=");
_c13 = AboutNarrativeEditor;
var _c, _c2, _c3, _c4, _c5, _c6, _c7, _c8, _c9, _c0, _c1, _c10, _c11, _c12, _c13;
$RefreshReg$(_c, "Property");
$RefreshReg$(_c2, "NumberProperty");
$RefreshReg$(_c3, "Transport");
$RefreshReg$(_c4, "Timeline");
$RefreshReg$(_c5, "SequenceInspector");
$RefreshReg$(_c6, "SectionInspector");
$RefreshReg$(_c7, "EditorialBlocks");
$RefreshReg$(_c8, "CueInspector");
$RefreshReg$(_c9, "DisciplineRevealInspector");
$RefreshReg$(_c0, "CameraInspector");
$RefreshReg$(_c1, "WorldInspector");
$RefreshReg$(_c10, "Diagnostics");
$RefreshReg$(_c11, "Inspector");
$RefreshReg$(_c12, "CameraPathOverlay");
$RefreshReg$(_c13, "AboutNarrativeEditor");
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

//# sourceMappingURL=data:application/json;base64,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ZDtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUEsSUFzRUE7QUFBQSxJQUNDOWYsU0FBUzRtQjtBQUFBQSxFQUFJO0FBQ2xCO0FBQUN4SCxJQXpSdUJILHNCQUFvQjtBQUFBLE9BQXBCQTtBQUFvQixJQUFBcFcsSUFBQUssS0FBQVksS0FBQStjLEtBQUFsUyxLQUFBZSxLQUFBa0IsS0FBQVcsS0FBQVMsS0FBQTZCLEtBQUE0QyxLQUFBTSxNQUFBK0osTUFBQTlILE1BQUErSDtBQUFBLGFBQUFsZSxJQUFBO0FBQUEsYUFBQUssS0FBQTtBQUFBLGFBQUFZLEtBQUE7QUFBQSxhQUFBK2MsS0FBQTtBQUFBLGFBQUFsUyxLQUFBO0FBQUEsYUFBQWUsS0FBQTtBQUFBLGFBQUFrQixLQUFBO0FBQUEsYUFBQVcsS0FBQTtBQUFBLGFBQUFTLEtBQUE7QUFBQSxhQUFBNkIsS0FBQTtBQUFBLGFBQUE0QyxLQUFBO0FBQUEsYUFBQU0sTUFBQTtBQUFBLGFBQUErSixNQUFBO0FBQUEsYUFBQTlILE1BQUE7QUFBQSxhQUFBK0gsTUFBQSIsIm5hbWVzIjpbInVzZUVmZmVjdCIsInVzZVJlZiIsInVzZVN0YXRlIiwidXNlU3luY0V4dGVybmFsU3RvcmUiLCJjcmVhdGVQb3J0YWwiLCJDaGVjayIsIkNoZXZyb25Eb3duIiwiQ2hldnJvbkxlZnQiLCJDaGV2cm9uUmlnaHQiLCJDaGV2cm9uVXAiLCJDaXJjbGVBbGVydCIsIkRpYW1vbmQiLCJJbmZvIiwiTG9ja0tleWhvbGUiLCJQYXVzZSIsIlBsYXkiLCJTa2lwQmFjayIsIlNraXBGb3J3YXJkIiwiVHJhc2gyIiwiQUJPVVRfTkFSUkFUSVZFX0dMT0JBTF9DT05UUk9MUyIsIkFCT1VUX05BUlJBVElWRV9DT1JSRVNQT05ERU5DRV9NT0RFUyIsIkFCT1VUX05BUlJBVElWRV9ESVNDSVBMSU5FX1JFVkVBTF9DT05UUk9MUyIsIkFCT1VUX05BUlJBVElWRV9FTVBIQVNJU19UT05FUyIsIkFCT1VUX05BUlJBVElWRV9NT0RJRklFUl9ERUZJTklUSU9OUyIsIkFCT1VUX05BUlJBVElWRV9TSEFQRV9ERUZJTklUSU9OUyIsImNsZWFyQWJvdXROYXJyYXRpdmVSZWNvdmVyeURyYWZ0IiwiZXhwb3J0QWJvdXROYXJyYXRpdmVEb2N1bWVudCIsImxvYWRBYm91dE5hcnJhdGl2ZVNvdXJjZSIsInJlYWRBYm91dE5hcnJhdGl2ZUNoZWNrcG9pbnRzIiwicmVhZEFib3V0TmFycmF0aXZlUmVjb3ZlcnlEcmFmdCIsInNhdmVBYm91dE5hcnJhdGl2ZVNvdXJjZSIsIndyaXRlQWJvdXROYXJyYXRpdmVDaGVja3BvaW50Iiwid3JpdGVBYm91dE5hcnJhdGl2ZVJlY292ZXJ5RHJhZnQiLCJhc3NlcnRWYWxpZEFib3V0TmFycmF0aXZlRG9jdW1lbnQiLCJjbG9uZUFib3V0TmFycmF0aXZlRG9jdW1lbnQiLCJnZXRBYm91dE5hcnJhdGl2ZUN1ZU1vdmVtZW50IiwiZ2V0QWJvdXROYXJyYXRpdmVDdWVNb3Rpb25JbnRlcnZhbCIsImdldEFib3V0TmFycmF0aXZlV29ybGRUcmFuc2l0aW9uTGltaXQiLCJzYW1wbGVBYm91dE5hcnJhdGl2ZVBsYW4iLCJjYXB0dXJlQWJvdXROYXJyYXRpdmVQbGF5aGVhZENvbnRleHQiLCJjcmVhdGVBYm91dE5hcnJhdGl2ZUN1ZUNsaXBib2FyZFBheWxvYWQiLCJkZXJpdmVBYm91dE5hcnJhdGl2ZUxvb3BSYW5nZSIsImR1cGxpY2F0ZUFib3V0TmFycmF0aXZlQ3VlR3JvdXAiLCJkdXBsaWNhdGVBYm91dE5hcnJhdGl2ZVNlY3Rpb24iLCJnZXRBYm91dE5hcnJhdGl2ZUNhbWVyYUtleVRpbWluZ0JvdW5kcyIsImdldEFib3V0TmFycmF0aXZlQ3VlVGltaW5nQm91bmRzIiwiZ2V0QWJvdXROYXJyYXRpdmVFeHRlbnRGaWVsZCIsImdldEFib3V0TmFycmF0aXZlU2VsZWN0aW9uTWVtYmVycyIsIm1vdmVBYm91dE5hcnJhdGl2ZUN1ZVRpbWluZyIsInJlbWFwQWJvdXROYXJyYXRpdmVQbGF5aGVhZENvbnRleHQiLCJyZXNvbHZlQWJvdXROYXJyYXRpdmVDYW1lcmFLZXlEcm9wIiwicmVzb2x2ZUFib3V0TmFycmF0aXZlQ3VlRGlzdHJpYnV0aW9uIiwicmVzb2x2ZUFib3V0TmFycmF0aXZlQ3VlRXhhY3RHYXAiLCJyZXNvbHZlQWJvdXROYXJyYXRpdmVDdWVHcm91cE1vdmUiLCJyZXNvbHZlQWJvdXROYXJyYXRpdmVDdWVHcm91cEFsaWduIiwicmVzb2x2ZUFib3V0TmFycmF0aXZlQ3VlR3JvdXBQYXN0ZSIsInNuYXBBYm91dE5hcnJhdGl2ZVRpbWVsaW5lVmFsdWUiLCJzdGl0Y2hBYm91dE5hcnJhdGl2ZUNhbWVyYUJvdW5kYXJpZXMiLCJ0b2dnbGVBYm91dE5hcnJhdGl2ZUN1ZVNlbGVjdGlvbiIsInZhbGlkYXRlQWJvdXROYXJyYXRpdmVDdWVDbGlwYm9hcmRQYXlsb2FkIiwiY2xhbXAwMSIsInZhbHVlIiwiTWF0aCIsIm1pbiIsIm1heCIsIkFCT1VUX0VESVRPUl9USU1FTElORV9TVE9SQUdFX0tFWSIsIlRJTUVMSU5FX0tFWV9FUFNJTE9OIiwiSU5TUEVDVE9SX0VER0VfR0FQIiwiQ0FNRVJBX1BPU0VfRklFTERTIiwiU2V0IiwiRElTQ0lQTElORV9SRVZFQUxfTUFYIiwiZmluZCIsImNvbnRyb2wiLCJpZCIsIkRJU0NJUExJTkVfQkFMTF9UT0tFTl9CWV9HUk9VUCIsIk9iamVjdCIsImZyZWV6ZSIsImNhbWVyYVBvc2VDaGFuZ2VzIiwiZnJvbSIsInRvIiwic29tZSIsImZpZWxkIiwiaW5kZXgiLCJhYnMiLCJmb3YiLCJyb2xsIiwiY29weUNhbWVyYVBvc2UiLCJ0YXJnZXQiLCJzb3VyY2UiLCJvZmZzZXQiLCJsb29rQXRPZmZzZXQiLCJsaW5rQ2FtZXJhQm91bmRhcnkiLCJkb2N1bWVudCIsInNlY3Rpb25JbmRleCIsImtleUluZGV4Iiwic2VjdGlvbiIsInNlY3Rpb25zIiwia2V5IiwiY2FtZXJhIiwia2V5cyIsImF0IiwibGVuZ3RoIiwiYnJpZGdlQ2FtZXJhU2VjdGlvbiIsInN0aXRjaENhbWVyYUJvdW5kYXJpZXMiLCJnZXRJbnNwZWN0b3JWZXJ0aWNhbEJvdW5kcyIsImluc3BlY3RvciIsInRpbWVsaW5lT3BlbiIsImVkaXRvciIsImNsb3Nlc3QiLCJzdHlsZXMiLCJnZXRDb21wdXRlZFN0eWxlIiwidG9wYmFySGVpZ2h0IiwiTnVtYmVyIiwicGFyc2VGbG9hdCIsImdldFByb3BlcnR5VmFsdWUiLCJ0aW1lbGluZUhlaWdodCIsImJ1dHRvbkJhclRvcCIsInF1ZXJ5U2VsZWN0b3IiLCJnZXRCb3VuZGluZ0NsaWVudFJlY3QiLCJ0b3AiLCJ3aW5kb3ciLCJpbm5lckhlaWdodCIsIm1pblRvcCIsIm1heEJvdHRvbSIsImNsYW1wSW5zcGVjdG9yUG9zaXRpb24iLCJwb3NpdGlvbiIsIm1heFdpZHRoIiwiaW5uZXJXaWR0aCIsIndpZHRoIiwiYXZhaWxhYmxlSGVpZ2h0IiwiaGVpZ2h0IiwibWF4TGVmdCIsIm1heFRvcCIsImxlZnQiLCJnZXRTZWN0aW9uSW5kZXgiLCJzZWN0aW9uSWQiLCJmaW5kSW5kZXgiLCJnZXRTZWN0aW9uIiwic2VsZWN0aW9uIiwiZ2V0TG9jYWxQcm9ncmVzcyIsInBsYW4iLCJzdG9yeVdVIiwiY29tcGlsZWQiLCJpdGVtIiwic3RhcnRXVSIsInRyYXZlbFdVIiwiZm9ybWF0V1UiLCJ0b0ZpeGVkIiwiZm9ybWF0Q2FtZXJhUGVyY2VudCIsImlzVGV4dEVkaXRpbmdUYXJnZXQiLCJIVE1MRWxlbWVudCIsIm1hdGNoZXMiLCJpc0NvbnRlbnRFZGl0YWJsZSIsImdldFRpbWVsaW5lS2V5ZnJhbWVzIiwic25hcHNob3QiLCJjb21waWxlZFBsYW4iLCJldmVudHMiLCJmb3JFYWNoIiwidG9TdG9yeVdVIiwicHVzaCIsInByaW9yaXR5IiwidHlwZSIsIndvcmxkIiwibW9kZSIsInRyYW5zaXRpb25JbiIsInBhcnQiLCJwYXJ0SW5kZXgiLCJrZXlQYXJ0IiwidGV4dCIsImN1ZXMiLCJjdWUiLCJjdWVJbmRleCIsImhvbGQiLCJjdWVJZCIsImRpc2NpcGxpbmVSZXZlYWwiLCJzdGFydCIsImludGVyYWN0aW9uIiwiaXNGaW5pdGUiLCJhY3RpdmF0aW9uU3RhcnQiLCJzb3J0IiwiYSIsImIiLCJnZXRUaW1lbGluZURlbGV0aW9uIiwicmVxdWlyZWQiLCJsYWJlbCIsImRpc2FibGVkIiwibWVzc2FnZSIsImV4ZWN1dGUiLCJzdG9yZSIsImNvbW1pdCIsImRyYWZ0Iiwic3BsaWNlIiwic3RhcnRzV2l0aCIsInRyYW5zaXRpb24iLCJlbmQiLCJkZWxldGVUaW1lbGluZVNlbGVjdGlvbiIsImRlbGV0aW9uIiwic2V0U2F2ZVN0YXRlIiwic2Vla1RpbWVsaW5lS2V5ZnJhbWUiLCJldmVudCIsInNldFNlbGVjdGlvbiIsInNldFRyYW5zcG9ydCIsIm93bmVyIiwicGxheWluZyIsImp1bXBUaW1lbGluZUtleWZyYW1lIiwiZGlyZWN0aW9uIiwiY3VycmVudFdVIiwidHJhbnNwb3J0IiwidGFyZ2V0UG9zaXRpb24iLCJyZXZlcnNlIiwibWFrZVNsdWciLCJ0b0xvd2VyQ2FzZSIsInJlcGxhY2UiLCJuZXh0SWQiLCJiYXNlIiwidXNlZCIsImZsYXRNYXAiLCJtYXAiLCJibG9ja3MiLCJibG9jayIsInN1ZmZpeCIsImhhcyIsInJlcGxhY2VEcmFmdERvY3VtZW50IiwibmV4dERvY3VtZW50IiwiYXNzaWduIiwiYXBwbHlDdWVNb3ZlcyIsIm1vdmVzIiwibW92ZSIsImVudGVyIiwiZXhpdCIsIlByb3BlcnR5IiwiY2hpbGRyZW4iLCJoaW50IiwiX2MiLCJOdW1iZXJQcm9wZXJ0eSIsInN0ZXAiLCJvbkNoYW5nZSIsInVuaXQiLCJfYzIiLCJUcmFuc3BvcnQiLCJtYXhXVSIsIm1heFN0b3J5V1UiLCJwbGF5Iiwic2VlayIsInNlbGVjdGVkIiwianVtcFNlY3Rpb24iLCJuZXh0IiwibGl2ZUFtYmllbnQiLCJwcmV2aWV3UHJvZmlsZSIsInNldFByZXZpZXdQcm9maWxlIiwiX2MzIiwiVGltZWxpbmUiLCJfcyIsInNlbGVjdGVkQ3VlTWVtYmVycyIsInJlZHVjZSIsInN1bSIsImV4dGVudFdVIiwicGxheWhlYWQiLCJsYW5lc1JlZiIsInRpbWluZ0RyYWdSZWYiLCJwcmV2aWV3RnJhbWVSZWYiLCJwZW5kaW5nUHJldmlld1JlZiIsInN1cHByZXNzZWRDbGlja1JlZiIsImNhbWVyYURyYWdQcmV2aWV3Iiwic2V0Q2FtZXJhRHJhZ1ByZXZpZXciLCJzZWN0aW9uUmVzaXplUHJldmlldyIsInNldFNlY3Rpb25SZXNpemVQcmV2aWV3IiwibWFycXVlZSIsInNldE1hcnF1ZWUiLCJxdWV1ZVByZXZpZXdGcmFtZSIsImNhbGxiYWNrIiwiY3VycmVudCIsInJlcXVlc3RBbmltYXRpb25GcmFtZSIsInBlbmRpbmciLCJmbHVzaFByZXZpZXdGcmFtZSIsImNhbmNlbEFuaW1hdGlvbkZyYW1lIiwiem9vbVRpbWVsaW5lIiwiY3RybEtleSIsIm1ldGFLZXkiLCJwcmV2ZW50RGVmYXVsdCIsImxhbmVzIiwicmVjdCIsInBvaW50ZXJYIiwiY2xpZW50WCIsInN0b3J5UmF0aW8iLCJzY3JvbGxMZWZ0Iiwic2Nyb2xsV2lkdGgiLCJjdXJyZW50Wm9vbSIsInpvb20iLCJuZXh0Wm9vbSIsImV4cCIsImRlbHRhWSIsInJlc29sdmVDYW1lcmFEcm9wQXRDbGllbnRYIiwiZ2V0U25hcHNob3QiLCJ2YWxpZCIsInJlYXNvbiIsImNvbnRlbnRYIiwiZHJhZyIsImRyb3AiLCJzb3VyY2VTZWN0aW9uSW5kZXgiLCJzb3VyY2VLZXlJbmRleCIsImJlZ2luVGltaW5nRHJhZyIsImxvY2tlZCIsImJ1dHRvbiIsImNsaXAiLCJjdXJyZW50VGFyZ2V0IiwicGFyZW50RWxlbWVudCIsInN0b3BQcm9wYWdhdGlvbiIsInNldFBvaW50ZXJDYXB0dXJlIiwicG9pbnRlcklkIiwibmV4dFNlbGVjdGlvbiIsImN1cnJlbnRTZWxlY3Rpb24iLCJjdXJyZW50TWVtYmVycyIsImFscmVhZHlTZWxlY3RlZCIsIm1lbWJlciIsInNoaWZ0S2V5IiwibWVtYmVycyIsImJlZ2luUHJldmlldyIsInN0YXJ0RG9jdW1lbnQiLCJzdGFydFBsYW4iLCJzdGFydFgiLCJtb3ZlZCIsImxhc3RBdCIsImxhc3REcm9wIiwibW92ZVRpbWluZ0RyYWciLCJ0b2tlbiIsImRlbHRhTGFuZSIsIm5leHRBdCIsImRlbHRhIiwicmV2ZWFsIiwiY29hbGVzY2VLZXkiLCJzZWN0aW9uU3RhcnRXVSIsImxvY2FsRGVsdGEiLCJtb3ZlbWVudCIsInByaW1hcnkiLCJkZWx0YVdVIiwibGFzdERlbHRhV1UiLCJ1cGRhdGVQcmV2aWV3IiwiZW5kVGltaW5nRHJhZyIsImhhc1BvaW50ZXJDYXB0dXJlIiwicmVsZWFzZVBvaW50ZXJDYXB0dXJlIiwiY2FuY2VsUHJldmlldyIsImNvbW1pdFByZXZpZXciLCJzb3VyY2VLZXlzIiwibW92ZWRLZXkiLCJkZXN0aW5hdGlvbktleXMiLCJzZXRUaW1lb3V0IiwiaGFuZGxlVGltaW5nQ2xpY2siLCJhY3Rpb24iLCJiZWdpblNlY3Rpb25SZXNpemUiLCJkYXRhIiwic2VjdGlvbkxhYmVsIiwic3RhcnRFeHRlbnQiLCJzdGFydE1heFdVIiwic3RhcnRTY3JvbGxXaWR0aCIsInBsYXloZWFkQ29udGV4dCIsInJlc2l6ZWRTZWN0aW9uSWQiLCJleHRlbnQiLCJtb3ZlU2VjdGlvblJlc2l6ZSIsInJhd0V4dGVudCIsImFsdEtleSIsInJvdW5kIiwibGFzdEV4dGVudCIsImVuZFNlY3Rpb25SZXNpemUiLCJyZXNldFNlY3Rpb25FeHRlbnQiLCJiYXNlbGluZVNlY3Rpb24iLCJiYXNlbGluZURvY3VtZW50IiwiY29udGV4dCIsImJlZ2luTWFycXVlZSIsImNhbnZhcyIsInN0YXJ0Q2xpZW50WCIsInN0YXJ0Q2xpZW50WSIsImNsaWVudFkiLCJjYW52YXNSZWN0IiwiYWRkaXRpdmUiLCJtb3ZlTWFycXVlZSIsImVuZE1hcnF1ZWUiLCJzZWxlY3Rpb25SZWN0IiwicmlnaHQiLCJib3R0b20iLCJsYW5lUmVjdCIsImhpdHMiLCJxdWVyeVNlbGVjdG9yQWxsIiwiZmlsdGVyIiwibm9kZSIsInZpc2libGUiLCJkYXRhc2V0Iiwic2xpY2UiLCJoaXQiLCJzb2xvVHJhY2siLCJsYW5lIiwibmV4dFN0YXJ0V1UiLCJzcGFuV1UiLCJpblNlbGVjdGVkU2VjdGlvbiIsImxvY2FsUGVyY2VudCIsImxvY2FsUG9zaXRpb24iLCJleHRlbmRlZExvY2FsUG9zaXRpb24iLCJleHRlbmRlZExvY2FsV2lkdGgiLCJ0ZXh0UG9zaXRpb24iLCJzZWxlY3RBdCIsImlzU2VsZWN0ZWQiLCJyZXNpemVFeHRlbnQiLCJyZXNvbHZlZEV4dGVudFdVIiwiU3RyaW5nIiwicGFkU3RhcnQiLCJmcm9tS2V5IiwidGltaW5nQm91bmRzIiwia2V5U2VsZWN0aW9uIiwidW5kZWZpbmVkIiwic2hhcGVJZCIsImlzUHJpbWFyeSIsImN1ZVNlbGVjdGlvbiIsImNvZGUiLCJkdXJhdGlvbiIsImNlbnRyZSIsInJldmVhbFNlbGVjdGlvbiIsImFjdGl2YXRpb24iLCJTZXF1ZW5jZUluc3BlY3RvciIsImNvbW1pdEdsb2JhbCIsImdyb3VwIiwiZ2xvYmFscyIsInRhcmdldEtleSIsImNvbnRyb2xzIiwiX2M1IiwiU2VjdGlvbkluc3BlY3RvciIsImNvbXBpbGVkU2VjdGlvbiIsImFjdGl2ZUV4dGVudEZpZWxkIiwiYWN0aXZlRXh0ZW50IiwicmVzb2x2ZWRFeHRlbnQiLCJjb250ZW50TWluaW11bUFjdGl2ZSIsInVwZGF0ZSIsIm11dGF0ZSIsInRvSW5kZXgiLCJtb2JpbGVFeHRlbnRXVSIsImxvY2FsIiwiZm9jdXMiLCJwcmVzZXQiLCJtb3Rpb24iLCJfYzYiLCJFZGl0b3JpYWxCbG9ja3MiLCJ1cGRhdGVCbG9jayIsImJsb2NrSW5kZXgiLCJ1cGRhdGVFbXBoYXNpcyIsImVtcGhhc2lzSW5kZXgiLCJlbXBoYXNpcyIsImFkZEVtcGhhc2lzIiwidHJpbSIsInNwbGl0Iiwiam9pbiIsInRvbmUiLCJyZW1vdmVFbXBoYXNpcyIsImtpbmQiLCJ3b3JsZEluZmx1ZW5jZSIsImNoZWNrZWQiLCJpdGVtcyIsIkJvb2xlYW4iLCJfYzciLCJDdWVJbnNwZWN0b3IiLCJzZWxlY3RlZE1lbWJlcnMiLCJyZW1vdmUiLCJtb3Rpb25JbnRlcnZhbCIsInRleHRNb3Rpb24iLCJtb3ZlQ3VlIiwicGVyY2VudCIsInVwZGF0ZU1vdmVtZW50IiwibWVtYmVyU2VjdGlvbiIsIm1lbWJlckN1ZSIsIl9jOCIsIkRpc2NpcGxpbmVSZXZlYWxJbnNwZWN0b3IiLCJvY2N1cGllZCIsInN0YWdnZXIiLCJsYWJlbER1cmF0aW9uIiwibGltaXRzRm9yIiwibGltaXRzIiwiaXRlbUluZGV4IiwiYmFja2dyb3VuZCIsIl9jOSIsIkNhbWVyYUluc3BlY3RvciIsInNlbGVjdGVkS2V5IiwidGFyZ2V0QXQiLCJhcHBseVByZXNldCIsInJlY2lwZXMiLCJQdXNoIiwiZWFzaW5nIiwiR2xpZGUiLCJPcmJpdCIsIlJldmVhbCIsIlJlc29sdmUiLCJleGlzdGluZ0tleUF0UGxheWhlYWQiLCJzZXRLZXkiLCJpbnNlcnRpb25JbmRleCIsInNlbGVjdGVkS2V5SW5kZXgiLCJzYW1wbGVkIiwiYmFzZVoiLCJzdGFydFoiLCJjYWRlbmNlIiwibmV3S2V5IiwiYXhpcyIsIm5hbWUiLCJBcnJheSIsImlzQXJyYXkiLCJ1cGRhdGVWZWN0b3IiLCJleHRlbnRGaWVsZCIsImV4dGVudExhYmVsIiwidXBkYXRlRXh0ZW50IiwiX2MwIiwiQ09SUkVTUE9OREVOQ0VfTEFCRUxTIiwiV29ybGRJbnNwZWN0b3IiLCJydW50aW1lTWV0cmljcyIsInNoYXBlIiwidHJhbnNpdGlvbkxpbWl0IiwidHJhbnNpdGlvbk1heCIsInRyYW5zaXRpb25FbmFibGVkIiwiY29ycmVzcG9uZGVuY2VFbmFibGVkIiwiaW5jbHVkZXMiLCJwcmV2aW91c1dvcmxkU2VjdGlvbiIsInNvdXJjZVNoYXBlIiwicHJlcGFyZWQiLCJwcmVwYXJlZFdvcmxkSWRzIiwiY29ycmVzcG9uZGVuY2VTdGF0dXMiLCJjb3JyZXNwb25kZW5jZVNlcXVlbmNlU3RhdGUiLCJjb3JyZXNwb25kZW5jZUZhbGxiYWNrIiwiY29ycmVzcG9uZGVuY2VUb1dvcmxkSWQiLCJ0cnlTaGFwZSIsImJlZ2luVHJ5Iiwic2hhcGVQYXJhbWV0ZXJzIiwiZnJvbUVudHJpZXMiLCJwYXJhbWV0ZXJzIiwidmFsdWVzIiwiY29zdCIsInRyeVN0YXRlIiwiY2FuY2VsVHJ5IiwiYXBwbHlUcnkiLCJzZWVkIiwiZmxvb3IiLCJyYW5kb20iLCJlbnRyeURpc3RhbmNlV1UiLCJ0cmFuc2Zvcm0iLCJzY2FsZSIsImNvcnJlc3BvbmRlbmNlIiwiY29ycmVzcG9uZGVuY2VJbXByb3ZlbWVudCIsIm1vZGlmaWVycyIsIm1vZGlmaWVySW5kZXgiLCJkZWZpbml0aW9uIiwibW92ZU1vZGlmaWVyIiwibmV4dEluZGV4IiwiZW5hYmxlZCIsIm9wdGlvbnMiLCJvcHRpb24iLCJfYzEiLCJEaWFnbm9zdGljcyIsImRpYWdub3N0aWNzIiwiRGlhZ25vc3RpY0ljb24iLCJsZXZlbCIsInBhdGgiLCJfYzEwIiwiSW5zcGVjdG9yIiwiX3MyIiwiaW5zcGVjdG9yUmVmIiwiZHJhZ1JlZiIsImxhc3RIZWFkZXJDbGlja1JlZiIsInNldFBvc2l0aW9uIiwiZHJhZ2dpbmciLCJzZXREcmFnZ2luZyIsImNvbnRlbnQiLCJrZWVwSW5Cb3VuZHMiLCJhZGRFdmVudExpc3RlbmVyIiwicmVtb3ZlRXZlbnRMaXN0ZW5lciIsImJlZ2luRHJhZyIsImZsb2F0aW5nSGVpZ2h0Iiwib3JpZ2luWCIsIm9yaWdpblkiLCJtb3ZlRHJhZyIsImRlbHRhWCIsImh5cG90IiwiZW5kRHJhZyIsIm5vdyIsInBlcmZvcm1hbmNlIiwicHJldmlvdXMiLCJ0aW1lIiwieCIsInkiLCJyZXNldFBvc2l0aW9uIiwiQ2FtZXJhUGF0aE92ZXJsYXkiLCJ0b3RhbCIsIndvcmxkU3RhdGUiLCJjaGFuZ2VzV29ybGQiLCJhY3RpdmVXb3JsZCIsIl9jMTIiLCJBYm91dE5hcnJhdGl2ZUVkaXRvciIsInJ1bnRpbWVSZWYiLCJyb290UmVmIiwiX3MzIiwic3Vic2NyaWJlIiwiY2hlY2twb2ludHMiLCJzZXRDaGVja3BvaW50cyIsInNldFJ1bnRpbWVNZXRyaWNzIiwicGF0aFZpc2libGUiLCJzZXRQYXRoVmlzaWJsZSIsImRpcmVjdG9yVmlldyIsInNldERpcmVjdG9yVmlldyIsIm1vYmlsZVBhbmUiLCJzZXRNb2JpbGVQYW5lIiwic2V0VGltZWxpbmVPcGVuIiwibG9jYWxTdG9yYWdlIiwiZ2V0SXRlbSIsImltcG9ydFJlZiIsInNuYXBzaG90UmVmIiwiYWN0aXZlU2VsZWN0aW9uIiwic2V0SXRlbSIsInJvb3QiLCJydW50aW1lIiwic2V0QXR0cmlidXRlIiwidGhlbiIsImhhc2giLCJkaXJ0eSIsInJlcGxhY2VEb2N1bWVudCIsInNldEJhc2VsaW5lIiwicmVjb3ZlcnkiLCJ0aW1lc3RhbXAiLCJEYXRlIiwic2V0UmVjb3ZlcnlTdGF0ZSIsImF2YWlsYWJsZSIsImVycm9yIiwiY2F0Y2giLCJzdGF0dXMiLCJyZW1vdmVBdHRyaWJ1dGUiLCJjbGFzc0xpc3QiLCJDU1MiLCJlc2NhcGUiLCJhZGQiLCJlZGl0b3JTZWxlY3Rpb25UeXBlIiwiaW50ZXJ2YWwiLCJzZXRJbnRlcnZhbCIsImdldE1ldHJpY3MiLCJjbGVhckludGVydmFsIiwidGltZXIiLCJiYXNlbGluZUhhc2giLCJjbGVhclRpbWVvdXQiLCJwYWdlaGlkZSIsImtleWRvd24iLCJjbGljayIsInJlZG8iLCJ1bmRvIiwicHJldmlld1N0YXRlIiwic2F2ZSIsImVkaXRvclVybCIsIlVSTCIsImxvY2F0aW9uIiwiaHJlZiIsInNlYXJjaFBhcmFtcyIsInNldCIsImhpc3RvcnkiLCJyZXBsYWNlU3RhdGUiLCJzdGF0ZSIsInBhdGhuYW1lIiwic2VhcmNoIiwic2VudCIsInJlc3VsdCIsIm1hcmtTYXZlZCIsImFkZENoZWNrcG9pbnQiLCJjaGVja3BvaW50IiwiY3J5cHRvIiwicmFuZG9tVVVJRCIsInRvTG9jYWxlVGltZVN0cmluZyIsImhvdXIiLCJtaW51dGUiLCJiYXNlU291cmNlSGFzaCIsInN0YXR1c0xhYmVsIiwic2F2ZVN0YXRlIiwiY29tcGlsZWRTZWxlY3RlZCIsInNlbGVjdGVkRXh0ZW50Iiwic2VsZWN0ZWRDdWVDb3VudCIsImxvb3BBY3RpdmUiLCJsb29wIiwidGltZWxpbmVEZWxldGlvbiIsInRvZ2dsZUxvb3AiLCJlbmRXVSIsInRvZ2dsZVNvbG8iLCJ0cmFjayIsImZpdFNlcXVlbmNlIiwiZml0U2VjdGlvbiIsInNlY3Rpb25TcGFuIiwic3RhcnRSYXRpbyIsImNsaWVudFdpZHRoIiwidG9nZ2xlRGlyZWN0b3IiLCJ0b2dnbGVCZWZvcmUiLCJjYW5VbmRvIiwidW5kb0xhYmVsIiwiY2FuUmVkbyIsInJlZG9MYWJlbCIsImZpbGUiLCJmaWxlcyIsImltcG9ydGVkIiwiSlNPTiIsInBhcnNlIiwicmVjb3ZlcnlTdGF0ZSIsInRvTG9jYWxlU3RyaW5nIiwibnVkZ2VEaXJlY3RvciIsInlhdyIsInBpdGNoIiwiZGlzdGFuY2UiLCJyZXNldERpcmVjdG9yIiwib3BlbiIsImF1dG9LZXkiLCJzZXRBdXRvS2V5IiwiZnJhbWVUaW1lTXMiLCJkcmF3Q2FsbHMiLCJwb2ludENvdW50IiwiYWN0aXZlTW9kaWZpZXJzIiwiYnVmZmVyUmVidWlsZHMiLCJmb3VuZCIsImJvZHkiLCJfYzQiLCJfYzExIiwiX2MxMyJdLCJpZ25vcmVMaXN0IjpbXSwic291cmNlcyI6WyJBYm91dE5hcnJhdGl2ZUVkaXRvci5qc3giXSwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHsgdXNlRWZmZWN0LCB1c2VSZWYsIHVzZVN0YXRlLCB1c2VTeW5jRXh0ZXJuYWxTdG9yZSB9IGZyb20gJ3JlYWN0JztcbmltcG9ydCB7IGNyZWF0ZVBvcnRhbCB9IGZyb20gJ3JlYWN0LWRvbSc7XG5pbXBvcnQge1xuICBDaGVjayxcbiAgQ2hldnJvbkRvd24sXG4gIENoZXZyb25MZWZ0LFxuICBDaGV2cm9uUmlnaHQsXG4gIENoZXZyb25VcCxcbiAgQ2lyY2xlQWxlcnQsXG4gIERpYW1vbmQsXG4gIEluZm8sXG4gIExvY2tLZXlob2xlLFxuICBQYXVzZSxcbiAgUGxheSxcbiAgU2tpcEJhY2ssXG4gIFNraXBGb3J3YXJkLFxuICBUcmFzaDIsXG59IGZyb20gJ2x1Y2lkZS1yZWFjdCc7XG5pbXBvcnQge1xuICBBQk9VVF9OQVJSQVRJVkVfR0xPQkFMX0NPTlRST0xTLFxuICBBQk9VVF9OQVJSQVRJVkVfQ09SUkVTUE9OREVOQ0VfTU9ERVMsXG4gIEFCT1VUX05BUlJBVElWRV9ESVNDSVBMSU5FX1JFVkVBTF9DT05UUk9MUyxcbiAgQUJPVVRfTkFSUkFUSVZFX0VNUEhBU0lTX1RPTkVTLFxuICBBQk9VVF9OQVJSQVRJVkVfTU9ESUZJRVJfREVGSU5JVElPTlMsXG4gIEFCT1VUX05BUlJBVElWRV9TSEFQRV9ERUZJTklUSU9OUyxcbn0gZnJvbSAnLi9hYm91dE5hcnJhdGl2ZURlZmluaXRpb25zLmpzJztcbmltcG9ydCB7XG4gIGNsZWFyQWJvdXROYXJyYXRpdmVSZWNvdmVyeURyYWZ0LFxuICBleHBvcnRBYm91dE5hcnJhdGl2ZURvY3VtZW50LFxuICBsb2FkQWJvdXROYXJyYXRpdmVTb3VyY2UsXG4gIHJlYWRBYm91dE5hcnJhdGl2ZUNoZWNrcG9pbnRzLFxuICByZWFkQWJvdXROYXJyYXRpdmVSZWNvdmVyeURyYWZ0LFxuICBzYXZlQWJvdXROYXJyYXRpdmVTb3VyY2UsXG4gIHdyaXRlQWJvdXROYXJyYXRpdmVDaGVja3BvaW50LFxuICB3cml0ZUFib3V0TmFycmF0aXZlUmVjb3ZlcnlEcmFmdCxcbn0gZnJvbSAnLi9hYm91dE5hcnJhdGl2ZVBlcnNpc3RlbmNlLmpzJztcbmltcG9ydCB7XG4gIGFzc2VydFZhbGlkQWJvdXROYXJyYXRpdmVEb2N1bWVudCxcbiAgY2xvbmVBYm91dE5hcnJhdGl2ZURvY3VtZW50LFxufSBmcm9tICcuL2Fib3V0TmFycmF0aXZlU2NoZW1hLmpzJztcbmltcG9ydCB7XG4gIGdldEFib3V0TmFycmF0aXZlQ3VlTW92ZW1lbnQsXG4gIGdldEFib3V0TmFycmF0aXZlQ3VlTW90aW9uSW50ZXJ2YWwsXG4gIGdldEFib3V0TmFycmF0aXZlV29ybGRUcmFuc2l0aW9uTGltaXQsXG4gIHNhbXBsZUFib3V0TmFycmF0aXZlUGxhbixcbn0gZnJvbSAnLi9hYm91dE5hcnJhdGl2ZUNvbXBpbGVyLmpzJztcbmltcG9ydCB7XG4gIGNhcHR1cmVBYm91dE5hcnJhdGl2ZVBsYXloZWFkQ29udGV4dCxcbiAgY3JlYXRlQWJvdXROYXJyYXRpdmVDdWVDbGlwYm9hcmRQYXlsb2FkLFxuICBkZXJpdmVBYm91dE5hcnJhdGl2ZUxvb3BSYW5nZSxcbiAgZHVwbGljYXRlQWJvdXROYXJyYXRpdmVDdWVHcm91cCxcbiAgZHVwbGljYXRlQWJvdXROYXJyYXRpdmVTZWN0aW9uLFxuICBnZXRBYm91dE5hcnJhdGl2ZUNhbWVyYUtleVRpbWluZ0JvdW5kcyxcbiAgZ2V0QWJvdXROYXJyYXRpdmVDdWVUaW1pbmdCb3VuZHMsXG4gIGdldEFib3V0TmFycmF0aXZlRXh0ZW50RmllbGQsXG4gIGdldEFib3V0TmFycmF0aXZlU2VsZWN0aW9uTWVtYmVycyxcbiAgbW92ZUFib3V0TmFycmF0aXZlQ3VlVGltaW5nLFxuICByZW1hcEFib3V0TmFycmF0aXZlUGxheWhlYWRDb250ZXh0LFxuICByZXNvbHZlQWJvdXROYXJyYXRpdmVDYW1lcmFLZXlEcm9wLFxuICByZXNvbHZlQWJvdXROYXJyYXRpdmVDdWVEaXN0cmlidXRpb24sXG4gIHJlc29sdmVBYm91dE5hcnJhdGl2ZUN1ZUV4YWN0R2FwLFxuICByZXNvbHZlQWJvdXROYXJyYXRpdmVDdWVHcm91cE1vdmUsXG4gIHJlc29sdmVBYm91dE5hcnJhdGl2ZUN1ZUdyb3VwQWxpZ24sXG4gIHJlc29sdmVBYm91dE5hcnJhdGl2ZUN1ZUdyb3VwUGFzdGUsXG4gIHNuYXBBYm91dE5hcnJhdGl2ZVRpbWVsaW5lVmFsdWUsXG4gIHN0aXRjaEFib3V0TmFycmF0aXZlQ2FtZXJhQm91bmRhcmllcyxcbiAgdG9nZ2xlQWJvdXROYXJyYXRpdmVDdWVTZWxlY3Rpb24sXG4gIHZhbGlkYXRlQWJvdXROYXJyYXRpdmVDdWVDbGlwYm9hcmRQYXlsb2FkLFxufSBmcm9tICcuL2Fib3V0TmFycmF0aXZlVGltZWxpbmUuanMnO1xuaW1wb3J0ICcuL2Fib3V0LW5hcnJhdGl2ZS1lZGl0b3IuY3NzJztcblxuY29uc3QgY2xhbXAwMSA9ICh2YWx1ZSkgPT4gTWF0aC5taW4oMSwgTWF0aC5tYXgoMCwgdmFsdWUpKTtcbmNvbnN0IEFCT1VUX0VESVRPUl9USU1FTElORV9TVE9SQUdFX0tFWSA9ICdhYnM6YWJvdXQtbmFycmF0aXZlOnRpbWVsaW5lLW9wZW46djEnO1xuY29uc3QgVElNRUxJTkVfS0VZX0VQU0lMT04gPSAwLjAwNDtcbmNvbnN0IElOU1BFQ1RPUl9FREdFX0dBUCA9IDg7XG5jb25zdCBDQU1FUkFfUE9TRV9GSUVMRFMgPSBuZXcgU2V0KFsnb2Zmc2V0JywgJ2xvb2tBdE9mZnNldCcsICdmb3YnLCAncm9sbCddKTtcbmNvbnN0IERJU0NJUExJTkVfUkVWRUFMX01BWCA9IEFCT1VUX05BUlJBVElWRV9ESVNDSVBMSU5FX1JFVkVBTF9DT05UUk9MU1xuICAuZmluZCgoY29udHJvbCkgPT4gY29udHJvbC5pZCA9PT0gJ2VuZCcpPy5tYXggfHwgNDtcbmNvbnN0IERJU0NJUExJTkVfQkFMTF9UT0tFTl9CWV9HUk9VUCA9IE9iamVjdC5mcmVlemUoe1xuICAxOiAnLS1iYWxsLTEnLFxuICAyOiAnLS1iYWxsLTQnLFxuICAzOiAnLS1iYWxsLTMnLFxuICA0OiAnLS1iYWxsLTcnLFxuICA1OiAnLS1iYWxsLTgnLFxuICA2OiAnLS1iYWxsLTYnLFxufSk7XG5cbmZ1bmN0aW9uIGNhbWVyYVBvc2VDaGFuZ2VzKGZyb20sIHRvKSB7XG4gIGlmICghZnJvbSB8fCAhdG8pIHJldHVybiBmYWxzZTtcbiAgcmV0dXJuIFsnb2Zmc2V0JywgJ2xvb2tBdE9mZnNldCddLnNvbWUoKGZpZWxkKSA9PiAoXG4gICAgZnJvbVtmaWVsZF0uc29tZSgodmFsdWUsIGluZGV4KSA9PiBNYXRoLmFicyh2YWx1ZSAtIHRvW2ZpZWxkXVtpbmRleF0pID4gMC4wMDAxKVxuICApKSB8fCBNYXRoLmFicyhmcm9tLmZvdiAtIHRvLmZvdikgPiAwLjAwMDEgfHwgTWF0aC5hYnMoZnJvbS5yb2xsIC0gdG8ucm9sbCkgPiAwLjAwMDE7XG59XG5cbmZ1bmN0aW9uIGNvcHlDYW1lcmFQb3NlKHRhcmdldCwgc291cmNlKSB7XG4gIHRhcmdldC5vZmZzZXQgPSBbLi4uc291cmNlLm9mZnNldF07XG4gIHRhcmdldC5sb29rQXRPZmZzZXQgPSBbLi4uc291cmNlLmxvb2tBdE9mZnNldF07XG4gIHRhcmdldC5mb3YgPSBzb3VyY2UuZm92O1xuICB0YXJnZXQucm9sbCA9IHNvdXJjZS5yb2xsO1xufVxuXG5mdW5jdGlvbiBsaW5rQ2FtZXJhQm91bmRhcnkoZG9jdW1lbnQsIHNlY3Rpb25JbmRleCwga2V5SW5kZXgpIHtcbiAgY29uc3Qgc2VjdGlvbiA9IGRvY3VtZW50LnNlY3Rpb25zW3NlY3Rpb25JbmRleF07XG4gIGNvbnN0IGtleSA9IHNlY3Rpb24/LmNhbWVyYS5rZXlzW2tleUluZGV4XTtcbiAgaWYgKCFrZXkpIHJldHVybjtcbiAgaWYgKGtleUluZGV4ID09PSAwICYmIHNlY3Rpb25JbmRleCA+IDApIHtcbiAgICBjb3B5Q2FtZXJhUG9zZShkb2N1bWVudC5zZWN0aW9uc1tzZWN0aW9uSW5kZXggLSAxXS5jYW1lcmEua2V5cy5hdCgtMSksIGtleSk7XG4gIH1cbiAgaWYgKGtleUluZGV4ID09PSBzZWN0aW9uLmNhbWVyYS5rZXlzLmxlbmd0aCAtIDEgJiYgc2VjdGlvbkluZGV4IDwgZG9jdW1lbnQuc2VjdGlvbnMubGVuZ3RoIC0gMSkge1xuICAgIGNvcHlDYW1lcmFQb3NlKGRvY3VtZW50LnNlY3Rpb25zW3NlY3Rpb25JbmRleCArIDFdLmNhbWVyYS5rZXlzWzBdLCBrZXkpO1xuICB9XG59XG5cbmZ1bmN0aW9uIGJyaWRnZUNhbWVyYVNlY3Rpb24oZG9jdW1lbnQsIHNlY3Rpb25JbmRleCkge1xuICBjb25zdCBzZWN0aW9uID0gZG9jdW1lbnQuc2VjdGlvbnNbc2VjdGlvbkluZGV4XTtcbiAgaWYgKCFzZWN0aW9uPy5jYW1lcmEua2V5cy5sZW5ndGgpIHJldHVybjtcbiAgaWYgKHNlY3Rpb25JbmRleCA+IDApIGNvcHlDYW1lcmFQb3NlKHNlY3Rpb24uY2FtZXJhLmtleXNbMF0sIGRvY3VtZW50LnNlY3Rpb25zW3NlY3Rpb25JbmRleCAtIDFdLmNhbWVyYS5rZXlzLmF0KC0xKSk7XG4gIGlmIChzZWN0aW9uSW5kZXggPCBkb2N1bWVudC5zZWN0aW9ucy5sZW5ndGggLSAxKSBjb3B5Q2FtZXJhUG9zZShzZWN0aW9uLmNhbWVyYS5rZXlzLmF0KC0xKSwgZG9jdW1lbnQuc2VjdGlvbnNbc2VjdGlvbkluZGV4ICsgMV0uY2FtZXJhLmtleXNbMF0pO1xufVxuXG5mdW5jdGlvbiBzdGl0Y2hDYW1lcmFCb3VuZGFyaWVzKGRvY3VtZW50KSB7XG4gIGZvciAobGV0IHNlY3Rpb25JbmRleCA9IDE7IHNlY3Rpb25JbmRleCA8IGRvY3VtZW50LnNlY3Rpb25zLmxlbmd0aDsgc2VjdGlvbkluZGV4ICs9IDEpIHtcbiAgICBjb3B5Q2FtZXJhUG9zZShkb2N1bWVudC5zZWN0aW9uc1tzZWN0aW9uSW5kZXhdLmNhbWVyYS5rZXlzWzBdLCBkb2N1bWVudC5zZWN0aW9uc1tzZWN0aW9uSW5kZXggLSAxXS5jYW1lcmEua2V5cy5hdCgtMSkpO1xuICB9XG59XG5cbmZ1bmN0aW9uIGdldEluc3BlY3RvclZlcnRpY2FsQm91bmRzKGluc3BlY3RvciwgdGltZWxpbmVPcGVuKSB7XG4gIGNvbnN0IGVkaXRvciA9IGluc3BlY3Rvci5jbG9zZXN0KCcuYWJvdXQtZWRpdG9yJyk7XG4gIGNvbnN0IHN0eWxlcyA9IGVkaXRvciA/IGdldENvbXB1dGVkU3R5bGUoZWRpdG9yKSA6IG51bGw7XG4gIGNvbnN0IHRvcGJhckhlaWdodCA9IE51bWJlci5wYXJzZUZsb2F0KHN0eWxlcz8uZ2V0UHJvcGVydHlWYWx1ZSgnLS1hYm91dC1lZGl0b3ItdG9wYmFyJykpIHx8IDQ0O1xuICBjb25zdCB0aW1lbGluZUhlaWdodCA9IHRpbWVsaW5lT3BlblxuICAgID8gTnVtYmVyLnBhcnNlRmxvYXQoc3R5bGVzPy5nZXRQcm9wZXJ0eVZhbHVlKCctLWFib3V0LWVkaXRvci10aW1lbGluZScpKSB8fCAxODhcbiAgICA6IDA7XG4gIGNvbnN0IGJ1dHRvbkJhclRvcCA9IGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3IoJ1tkYXRhLWJ1dHRvbi1iYXJdJyk/LmdldEJvdW5kaW5nQ2xpZW50UmVjdCgpLnRvcFxuICAgID8/IHdpbmRvdy5pbm5lckhlaWdodDtcbiAgcmV0dXJuIHtcbiAgICBtaW5Ub3A6IHRvcGJhckhlaWdodCArIElOU1BFQ1RPUl9FREdFX0dBUCxcbiAgICBtYXhCb3R0b206ICh0aW1lbGluZU9wZW4gPyB3aW5kb3cuaW5uZXJIZWlnaHQgLSB0aW1lbGluZUhlaWdodCA6IGJ1dHRvbkJhclRvcCkgLSBJTlNQRUNUT1JfRURHRV9HQVAsXG4gIH07XG59XG5cbmZ1bmN0aW9uIGNsYW1wSW5zcGVjdG9yUG9zaXRpb24oaW5zcGVjdG9yLCBwb3NpdGlvbiwgdGltZWxpbmVPcGVuKSB7XG4gIGNvbnN0IHsgbWluVG9wLCBtYXhCb3R0b20gfSA9IGdldEluc3BlY3RvclZlcnRpY2FsQm91bmRzKGluc3BlY3RvciwgdGltZWxpbmVPcGVuKTtcbiAgY29uc3QgbWF4V2lkdGggPSBNYXRoLm1heCgyNDAsIHdpbmRvdy5pbm5lcldpZHRoIC0gKElOU1BFQ1RPUl9FREdFX0dBUCAqIDIpKTtcbiAgY29uc3Qgd2lkdGggPSBNYXRoLm1pbihwb3NpdGlvbi53aWR0aCwgbWF4V2lkdGgpO1xuICBjb25zdCBhdmFpbGFibGVIZWlnaHQgPSBNYXRoLm1heCgyNDAsIG1heEJvdHRvbSAtIG1pblRvcCk7XG4gIGNvbnN0IGhlaWdodCA9IE1hdGgubWluKHBvc2l0aW9uLmhlaWdodCwgYXZhaWxhYmxlSGVpZ2h0KTtcbiAgY29uc3QgbWF4TGVmdCA9IE1hdGgubWF4KElOU1BFQ1RPUl9FREdFX0dBUCwgd2luZG93LmlubmVyV2lkdGggLSB3aWR0aCAtIElOU1BFQ1RPUl9FREdFX0dBUCk7XG4gIGNvbnN0IG1heFRvcCA9IE1hdGgubWF4KG1pblRvcCwgbWF4Qm90dG9tIC0gaGVpZ2h0KTtcbiAgcmV0dXJuIHtcbiAgICBsZWZ0OiBNYXRoLm1pbihtYXhMZWZ0LCBNYXRoLm1heChJTlNQRUNUT1JfRURHRV9HQVAsIHBvc2l0aW9uLmxlZnQpKSxcbiAgICB0b3A6IE1hdGgubWluKG1heFRvcCwgTWF0aC5tYXgobWluVG9wLCBwb3NpdGlvbi50b3ApKSxcbiAgICB3aWR0aCxcbiAgICBoZWlnaHQsXG4gIH07XG59XG5cbmZ1bmN0aW9uIGdldFNlY3Rpb25JbmRleChkb2N1bWVudCwgc2VjdGlvbklkKSB7XG4gIHJldHVybiBkb2N1bWVudC5zZWN0aW9ucy5maW5kSW5kZXgoKHNlY3Rpb24pID0+IHNlY3Rpb24uaWQgPT09IHNlY3Rpb25JZCk7XG59XG5cbmZ1bmN0aW9uIGdldFNlY3Rpb24oZG9jdW1lbnQsIHNlbGVjdGlvbikge1xuICBjb25zdCBzZWN0aW9uSWQgPSBzZWxlY3Rpb24uc2VjdGlvbklkIHx8IGRvY3VtZW50LnNlY3Rpb25zWzBdPy5pZDtcbiAgcmV0dXJuIGRvY3VtZW50LnNlY3Rpb25zLmZpbmQoKHNlY3Rpb24pID0+IHNlY3Rpb24uaWQgPT09IHNlY3Rpb25JZCkgfHwgZG9jdW1lbnQuc2VjdGlvbnNbMF07XG59XG5cbmZ1bmN0aW9uIGdldExvY2FsUHJvZ3Jlc3MocGxhbiwgc2VjdGlvbiwgc3RvcnlXVSkge1xuICBjb25zdCBjb21waWxlZCA9IHBsYW4/LnNlY3Rpb25zPy5maW5kKChpdGVtKSA9PiBpdGVtLmlkID09PSBzZWN0aW9uLmlkKTtcbiAgcmV0dXJuIGNvbXBpbGVkID8gY2xhbXAwMSgoc3RvcnlXVSAtIGNvbXBpbGVkLnN0YXJ0V1UpIC8gY29tcGlsZWQudHJhdmVsV1UpIDogMDtcbn1cblxuZnVuY3Rpb24gZm9ybWF0V1UodmFsdWUpIHtcbiAgcmV0dXJuIGAke051bWJlcih2YWx1ZSB8fCAwKS50b0ZpeGVkKDIpfSBXVWA7XG59XG5cbmZ1bmN0aW9uIGZvcm1hdENhbWVyYVBlcmNlbnQodmFsdWUpIHtcbiAgcmV0dXJuIGAke051bWJlcigoTnVtYmVyKHZhbHVlKSAqIDEwMCkudG9GaXhlZCgxKSl9JWA7XG59XG5cbmZ1bmN0aW9uIGlzVGV4dEVkaXRpbmdUYXJnZXQodGFyZ2V0KSB7XG4gIHJldHVybiB0YXJnZXQgaW5zdGFuY2VvZiBIVE1MRWxlbWVudFxuICAgICYmICh0YXJnZXQubWF0Y2hlcygnaW5wdXQsIHRleHRhcmVhLCBzZWxlY3QnKSB8fCB0YXJnZXQuaXNDb250ZW50RWRpdGFibGUpO1xufVxuXG5mdW5jdGlvbiBnZXRUaW1lbGluZUtleWZyYW1lcyhzbmFwc2hvdCkge1xuICBjb25zdCBwbGFuID0gc25hcHNob3QuY29tcGlsZWRQbGFuO1xuICBpZiAoIXBsYW4/LnNlY3Rpb25zPy5sZW5ndGgpIHJldHVybiBbXTtcbiAgY29uc3QgZXZlbnRzID0gW107XG4gIHBsYW4uc2VjdGlvbnMuZm9yRWFjaCgoY29tcGlsZWQsIHNlY3Rpb25JbmRleCkgPT4ge1xuICAgIGNvbnN0IHNlY3Rpb24gPSBzbmFwc2hvdC5kb2N1bWVudC5zZWN0aW9uc1tzZWN0aW9uSW5kZXhdO1xuICAgIGNvbnN0IHRvU3RvcnlXVSA9IChhdCkgPT4gY29tcGlsZWQuc3RhcnRXVSArIChOdW1iZXIoYXQgfHwgMCkgKiBjb21waWxlZC50cmF2ZWxXVSk7XG4gICAgc2VjdGlvbi5jYW1lcmEua2V5cy5mb3JFYWNoKChrZXksIGtleUluZGV4KSA9PiB7XG4gICAgICBpZiAoa2V5LmF0ID09PSAwIHx8IGtleS5hdCA9PT0gMSkgcmV0dXJuO1xuICAgICAgZXZlbnRzLnB1c2goe1xuICAgICAgICBzdG9yeVdVOiB0b1N0b3J5V1Uoa2V5LmF0KSxcbiAgICAgICAgcHJpb3JpdHk6IDAsXG4gICAgICAgIHNlbGVjdGlvbjogeyB0eXBlOiAnY2FtZXJhLWtleScsIHNlY3Rpb25JZDogc2VjdGlvbi5pZCwga2V5SW5kZXggfSxcbiAgICAgIH0pO1xuICAgIH0pO1xuICAgIGlmIChzZWN0aW9uLndvcmxkLm1vZGUgPT09ICdzZXQnICYmIHNlY3Rpb24ud29ybGQudHJhbnNpdGlvbkluLnR5cGUgIT09ICdjdXQnKSB7XG4gICAgICBbJ3N0YXJ0JywgJ2VuZCddLmZvckVhY2goKHBhcnQsIHBhcnRJbmRleCkgPT4gZXZlbnRzLnB1c2goe1xuICAgICAgICBzdG9yeVdVOiB0b1N0b3J5V1Uoc2VjdGlvbi53b3JsZC50cmFuc2l0aW9uSW5bcGFydF0pLFxuICAgICAgICBwcmlvcml0eTogMTAgKyBwYXJ0SW5kZXgsXG4gICAgICAgIHNlbGVjdGlvbjogeyB0eXBlOiAnd29ybGQnLCBzZWN0aW9uSWQ6IHNlY3Rpb24uaWQsIGtleVBhcnQ6IGB0cmFuc2l0aW9uLSR7cGFydH1gIH0sXG4gICAgICB9KSk7XG4gICAgfVxuICAgIChzZWN0aW9uLnRleHQuY3VlcyB8fCBbXSkuZm9yRWFjaCgoY3VlLCBjdWVJbmRleCkgPT4ge1xuICAgICAgZXZlbnRzLnB1c2goe1xuICAgICAgICBzdG9yeVdVOiB0b1N0b3J5V1UoY3VlLmhvbGQpLFxuICAgICAgICBwcmlvcml0eTogMjAgKyBjdWVJbmRleCxcbiAgICAgICAgc2VsZWN0aW9uOiB7IHR5cGU6ICdjdWUnLCBzZWN0aW9uSWQ6IHNlY3Rpb24uaWQsIGN1ZUlkOiBjdWUuaWQsIGtleVBhcnQ6ICdmb2N1cycgfSxcbiAgICAgIH0pO1xuICAgIH0pO1xuICAgIGlmIChzZWN0aW9uLnRleHQuZGlzY2lwbGluZVJldmVhbCkge1xuICAgICAgZXZlbnRzLnB1c2goe1xuICAgICAgICBzdG9yeVdVOiB0b1N0b3J5V1Uoc2VjdGlvbi50ZXh0LmRpc2NpcGxpbmVSZXZlYWwuc3RhcnQpLFxuICAgICAgICBwcmlvcml0eTogMjgsXG4gICAgICAgIHNlbGVjdGlvbjogeyB0eXBlOiAnZGlzY2lwbGluZS1yZXZlYWwnLCBzZWN0aW9uSWQ6IHNlY3Rpb24uaWQgfSxcbiAgICAgIH0pO1xuICAgIH1cbiAgICBpZiAoc2VjdGlvbi5pbnRlcmFjdGlvbj8udHlwZSAhPT0gJ25vbmUnICYmIE51bWJlci5pc0Zpbml0ZShzZWN0aW9uLmludGVyYWN0aW9uLmFjdGl2YXRpb25TdGFydCkpIHtcbiAgICAgIGV2ZW50cy5wdXNoKHtcbiAgICAgICAgc3RvcnlXVTogdG9TdG9yeVdVKHNlY3Rpb24uaW50ZXJhY3Rpb24uYWN0aXZhdGlvblN0YXJ0KSxcbiAgICAgICAgcHJpb3JpdHk6IDMwLFxuICAgICAgICBzZWxlY3Rpb246IHsgdHlwZTogJ2ludGVyYWN0aW9uJywgc2VjdGlvbklkOiBzZWN0aW9uLmlkLCBrZXlQYXJ0OiAnYWN0aXZhdGlvbicgfSxcbiAgICAgIH0pO1xuICAgIH1cbiAgfSk7XG4gIHJldHVybiBldmVudHMuc29ydCgoYSwgYikgPT4gKGEuc3RvcnlXVSAtIGIuc3RvcnlXVSkgfHwgKGEucHJpb3JpdHkgLSBiLnByaW9yaXR5KSk7XG59XG5cbmZ1bmN0aW9uIGdldFRpbWVsaW5lRGVsZXRpb24oc25hcHNob3QpIHtcbiAgY29uc3QgeyBzZWxlY3Rpb24sIGRvY3VtZW50IH0gPSBzbmFwc2hvdDtcbiAgY29uc3Qgc2VjdGlvbkluZGV4ID0gZ2V0U2VjdGlvbkluZGV4KGRvY3VtZW50LCBzZWxlY3Rpb24uc2VjdGlvbklkKTtcbiAgY29uc3Qgc2VjdGlvbiA9IGRvY3VtZW50LnNlY3Rpb25zW3NlY3Rpb25JbmRleF07XG4gIGlmICghc2VjdGlvbikgcmV0dXJuIG51bGw7XG4gIGlmIChzZWxlY3Rpb24udHlwZSA9PT0gJ2NhbWVyYS1rZXknKSB7XG4gICAgY29uc3Qga2V5ID0gc2VjdGlvbi5jYW1lcmEua2V5c1tzZWxlY3Rpb24ua2V5SW5kZXhdO1xuICAgIGlmICgha2V5KSByZXR1cm4gbnVsbDtcbiAgICBjb25zdCByZXF1aXJlZCA9IGtleS5hdCA9PT0gMCB8fCBrZXkuYXQgPT09IDE7XG4gICAgcmV0dXJuIHtcbiAgICAgIGxhYmVsOiByZXF1aXJlZCA/ICdSZXF1aXJlZCBjYW1lcmEga2V5JyA6ICdEZWxldGUgY2FtZXJhIGtleScsXG4gICAgICBkaXNhYmxlZDogcmVxdWlyZWQsXG4gICAgICBtZXNzYWdlOiByZXF1aXJlZCA/ICdUaGUgc3RhcnQgYW5kIGVuZCBDYW1lcmEga2V5cyBwcmVzZXJ2ZSBTZWN0aW9uIGNvbnRpbnVpdHkgYW5kIGNhbm5vdCBiZSByZW1vdmVkLicgOiAnJyxcbiAgICAgIGV4ZWN1dGU6IChzdG9yZSkgPT4gc3RvcmUuY29tbWl0KCdEZWxldGUgY2FtZXJhIGtleScsIChkcmFmdCkgPT4ge1xuICAgICAgICBkcmFmdC5zZWN0aW9uc1tzZWN0aW9uSW5kZXhdLmNhbWVyYS5rZXlzLnNwbGljZShzZWxlY3Rpb24ua2V5SW5kZXgsIDEpO1xuICAgICAgfSwgeyBzZWxlY3Rpb246IHsgdHlwZTogJ3NlY3Rpb24nLCBzZWN0aW9uSWQ6IHNlY3Rpb24uaWQgfSB9KSxcbiAgICB9O1xuICB9XG4gIGlmIChzZWxlY3Rpb24udHlwZSA9PT0gJ3dvcmxkJyAmJiBzZWxlY3Rpb24ua2V5UGFydD8uc3RhcnRzV2l0aCgndHJhbnNpdGlvbi0nKSkge1xuICAgIHJldHVybiB7XG4gICAgICBsYWJlbDogJ1JlbW92ZSB0cmFuc2l0aW9uJyxcbiAgICAgIGRpc2FibGVkOiBmYWxzZSxcbiAgICAgIG1lc3NhZ2U6ICcnLFxuICAgICAgZXhlY3V0ZTogKHN0b3JlKSA9PiBzdG9yZS5jb21taXQoJ1JlbW92ZSBXb3JsZCB0cmFuc2l0aW9uJywgKGRyYWZ0KSA9PiB7XG4gICAgICAgIGNvbnN0IHRyYW5zaXRpb24gPSBkcmFmdC5zZWN0aW9uc1tzZWN0aW9uSW5kZXhdLndvcmxkLnRyYW5zaXRpb25JbjtcbiAgICAgICAgdHJhbnNpdGlvbi5zdGFydCA9IDA7XG4gICAgICAgIHRyYW5zaXRpb24uZW5kID0gMDtcbiAgICAgICAgdHJhbnNpdGlvbi50eXBlID0gJ2N1dCc7XG4gICAgICB9LCB7IHNlbGVjdGlvbjogeyB0eXBlOiAnd29ybGQnLCBzZWN0aW9uSWQ6IHNlY3Rpb24uaWQgfSB9KSxcbiAgICB9O1xuICB9XG4gIGlmIChzZWxlY3Rpb24udHlwZSA9PT0gJ2ludGVyYWN0aW9uJyAmJiBzZWxlY3Rpb24ua2V5UGFydCA9PT0gJ2FjdGl2YXRpb24nKSB7XG4gICAgcmV0dXJuIHtcbiAgICAgIGxhYmVsOiAnUmVtb3ZlIGludGVyYWN0aW9uIGtleScsXG4gICAgICBkaXNhYmxlZDogZmFsc2UsXG4gICAgICBtZXNzYWdlOiAnJyxcbiAgICAgIGV4ZWN1dGU6IChzdG9yZSkgPT4gc3RvcmUuY29tbWl0KCdSZW1vdmUgaW50ZXJhY3Rpb24ga2V5JywgKGRyYWZ0KSA9PiB7XG4gICAgICAgIGRyYWZ0LnNlY3Rpb25zW3NlY3Rpb25JbmRleF0uaW50ZXJhY3Rpb24gPSB7IHR5cGU6ICdub25lJyB9O1xuICAgICAgfSwgeyBzZWxlY3Rpb246IHsgdHlwZTogJ3NlY3Rpb24nLCBzZWN0aW9uSWQ6IHNlY3Rpb24uaWQgfSB9KSxcbiAgICB9O1xuICB9XG4gIHJldHVybiBudWxsO1xufVxuXG5mdW5jdGlvbiBkZWxldGVUaW1lbGluZVNlbGVjdGlvbihzdG9yZSwgc25hcHNob3QpIHtcbiAgY29uc3QgZGVsZXRpb24gPSBnZXRUaW1lbGluZURlbGV0aW9uKHNuYXBzaG90KTtcbiAgaWYgKCFkZWxldGlvbikgcmV0dXJuIGZhbHNlO1xuICBpZiAoZGVsZXRpb24uZGlzYWJsZWQpIHtcbiAgICBzdG9yZS5zZXRTYXZlU3RhdGUoeyBtZXNzYWdlOiBkZWxldGlvbi5tZXNzYWdlIH0pO1xuICAgIHJldHVybiB0cnVlO1xuICB9XG4gIGRlbGV0aW9uLmV4ZWN1dGUoc3RvcmUpO1xuICByZXR1cm4gdHJ1ZTtcbn1cblxuZnVuY3Rpb24gc2Vla1RpbWVsaW5lS2V5ZnJhbWUoc3RvcmUsIGV2ZW50KSB7XG4gIGlmICghZXZlbnQpIHJldHVybjtcbiAgc3RvcmUuc2V0U2VsZWN0aW9uKGV2ZW50LnNlbGVjdGlvbik7XG4gIHN0b3JlLnNldFRyYW5zcG9ydCh7IG93bmVyOiAndGltZWxpbmUnLCBwbGF5aW5nOiBmYWxzZSwgc3RvcnlXVTogZXZlbnQuc3RvcnlXVSB9KTtcbn1cblxuZnVuY3Rpb24ganVtcFRpbWVsaW5lS2V5ZnJhbWUoc3RvcmUsIHNuYXBzaG90LCBkaXJlY3Rpb24pIHtcbiAgY29uc3QgZXZlbnRzID0gZ2V0VGltZWxpbmVLZXlmcmFtZXMoc25hcHNob3QpO1xuICBjb25zdCBjdXJyZW50V1UgPSBzbmFwc2hvdC50cmFuc3BvcnQuc3RvcnlXVTtcbiAgY29uc3QgdGFyZ2V0UG9zaXRpb24gPSBkaXJlY3Rpb24gPiAwXG4gICAgPyBldmVudHMuZmluZCgoZXZlbnQpID0+IGV2ZW50LnN0b3J5V1UgPiBjdXJyZW50V1UgKyBUSU1FTElORV9LRVlfRVBTSUxPTik/LnN0b3J5V1VcbiAgICA6IFsuLi5ldmVudHNdLnJldmVyc2UoKS5maW5kKChldmVudCkgPT4gZXZlbnQuc3RvcnlXVSA8IGN1cnJlbnRXVSAtIFRJTUVMSU5FX0tFWV9FUFNJTE9OKT8uc3RvcnlXVTtcbiAgY29uc3QgZXZlbnQgPSBOdW1iZXIuaXNGaW5pdGUodGFyZ2V0UG9zaXRpb24pXG4gICAgPyBldmVudHMuZmluZCgoaXRlbSkgPT4gTWF0aC5hYnMoaXRlbS5zdG9yeVdVIC0gdGFyZ2V0UG9zaXRpb24pIDwgVElNRUxJTkVfS0VZX0VQU0lMT04pXG4gICAgOiBudWxsO1xuICBzZWVrVGltZWxpbmVLZXlmcmFtZShzdG9yZSwgZXZlbnQpO1xufVxuXG5mdW5jdGlvbiBtYWtlU2x1Zyh2YWx1ZSkge1xuICByZXR1cm4gdmFsdWUudG9Mb3dlckNhc2UoKS5yZXBsYWNlKC9bXmEtejAtOV0rL2csICctJykucmVwbGFjZSgvXi18LSQvZywgJycpIHx8ICdpdGVtJztcbn1cblxuZnVuY3Rpb24gbmV4dElkKGRvY3VtZW50LCBiYXNlKSB7XG4gIGNvbnN0IHVzZWQgPSBuZXcgU2V0KGRvY3VtZW50LnNlY3Rpb25zLmZsYXRNYXAoKHNlY3Rpb24pID0+IFtcbiAgICBzZWN0aW9uLmlkLFxuICAgIC4uLihzZWN0aW9uLnRleHQuY3VlcyB8fCBbXSkubWFwKChjdWUpID0+IGN1ZS5pZCksXG4gICAgLi4uKHNlY3Rpb24udGV4dC5ibG9ja3MgfHwgW10pLm1hcCgoYmxvY2spID0+IGJsb2NrLmlkKSxcbiAgICAuLi4oc2VjdGlvbi50ZXh0LmRpc2NpcGxpbmVSZXZlYWwgPyBbc2VjdGlvbi50ZXh0LmRpc2NpcGxpbmVSZXZlYWwuaWRdIDogW10pLFxuICBdKSk7XG4gIGxldCBpZCA9IG1ha2VTbHVnKGJhc2UpO1xuICBsZXQgc3VmZml4ID0gMjtcbiAgd2hpbGUgKHVzZWQuaGFzKGlkKSkge1xuICAgIGlkID0gYCR7bWFrZVNsdWcoYmFzZSl9LSR7c3VmZml4fWA7XG4gICAgc3VmZml4ICs9IDE7XG4gIH1cbiAgcmV0dXJuIGlkO1xufVxuXG5mdW5jdGlvbiByZXBsYWNlRHJhZnREb2N1bWVudChkcmFmdCwgbmV4dERvY3VtZW50KSB7XG4gIE9iamVjdC5rZXlzKGRyYWZ0KS5mb3JFYWNoKChrZXkpID0+IGRlbGV0ZSBkcmFmdFtrZXldKTtcbiAgT2JqZWN0LmFzc2lnbihkcmFmdCwgY2xvbmVBYm91dE5hcnJhdGl2ZURvY3VtZW50KG5leHREb2N1bWVudCkpO1xufVxuXG5mdW5jdGlvbiBhcHBseUN1ZU1vdmVzKGRyYWZ0LCBtb3Zlcykge1xuICBtb3Zlcy5mb3JFYWNoKChtb3ZlKSA9PiB7XG4gICAgY29uc3Qgc2VjdGlvbiA9IGRyYWZ0LnNlY3Rpb25zLmZpbmQoKGl0ZW0pID0+IGl0ZW0uaWQgPT09IG1vdmUuc2VjdGlvbklkKTtcbiAgICBjb25zdCBjdWUgPSBzZWN0aW9uPy50ZXh0Py5jdWVzPy5maW5kKChpdGVtKSA9PiBpdGVtLmlkID09PSBtb3ZlLmN1ZUlkKTtcbiAgICBpZiAoY3VlKSBPYmplY3QuYXNzaWduKGN1ZSwgeyBlbnRlcjogbW92ZS5lbnRlciwgaG9sZDogbW92ZS5ob2xkLCBleGl0OiBtb3ZlLmV4aXQgfSk7XG4gIH0pO1xufVxuXG5mdW5jdGlvbiBQcm9wZXJ0eSh7IGxhYmVsLCBjaGlsZHJlbiwgaGludCA9ICcnIH0pIHtcbiAgcmV0dXJuIChcbiAgICA8bGFiZWwgY2xhc3NOYW1lPVwiYWJvdXQtZWRpdG9yLXByb3BlcnR5XCI+XG4gICAgICA8c3Bhbj57bGFiZWx9PC9zcGFuPlxuICAgICAge2NoaWxkcmVufVxuICAgICAge2hpbnQgPyA8c21hbGw+e2hpbnR9PC9zbWFsbD4gOiBudWxsfVxuICAgIDwvbGFiZWw+XG4gICk7XG59XG5cbmZ1bmN0aW9uIE51bWJlclByb3BlcnR5KHsgbGFiZWwsIHZhbHVlLCBtaW4sIG1heCwgc3RlcCwgb25DaGFuZ2UsIHVuaXQgPSAnJywgZGlzYWJsZWQgPSBmYWxzZSB9KSB7XG4gIHJldHVybiAoXG4gICAgPFByb3BlcnR5IGxhYmVsPXtsYWJlbH0+XG4gICAgICA8ZGl2IGNsYXNzTmFtZT1cImFib3V0LWVkaXRvci1udW1iZXJcIj5cbiAgICAgICAgPGlucHV0XG4gICAgICAgICAgdHlwZT1cInJhbmdlXCJcbiAgICAgICAgICB2YWx1ZT17dmFsdWV9XG4gICAgICAgICAgbWluPXttaW59XG4gICAgICAgICAgbWF4PXttYXh9XG4gICAgICAgICAgc3RlcD17c3RlcH1cbiAgICAgICAgICBkaXNhYmxlZD17ZGlzYWJsZWR9XG4gICAgICAgICAgb25DaGFuZ2U9eyhldmVudCkgPT4gb25DaGFuZ2UoTnVtYmVyKGV2ZW50LnRhcmdldC52YWx1ZSkpfVxuICAgICAgICAvPlxuICAgICAgICA8aW5wdXRcbiAgICAgICAgICB0eXBlPVwibnVtYmVyXCJcbiAgICAgICAgICB2YWx1ZT17dmFsdWV9XG4gICAgICAgICAgbWluPXttaW59XG4gICAgICAgICAgbWF4PXttYXh9XG4gICAgICAgICAgc3RlcD17c3RlcH1cbiAgICAgICAgICBkaXNhYmxlZD17ZGlzYWJsZWR9XG4gICAgICAgICAgb25DaGFuZ2U9eyhldmVudCkgPT4gb25DaGFuZ2UoTnVtYmVyKGV2ZW50LnRhcmdldC52YWx1ZSkpfVxuICAgICAgICAvPlxuICAgICAgICB7dW5pdCA/IDxlbT57dW5pdH08L2VtPiA6IG51bGx9XG4gICAgICA8L2Rpdj5cbiAgICA8L1Byb3BlcnR5PlxuICApO1xufVxuXG5mdW5jdGlvbiBUcmFuc3BvcnQoeyBzdG9yZSwgc25hcHNob3QgfSkge1xuICBjb25zdCB7IHRyYW5zcG9ydCwgY29tcGlsZWRQbGFuIH0gPSBzbmFwc2hvdDtcbiAgY29uc3QgbWF4V1UgPSBjb21waWxlZFBsYW4/Lm1heFN0b3J5V1UgfHwgMTtcbiAgY29uc3QgcGxheSA9ICgpID0+IHN0b3JlLnNldFRyYW5zcG9ydCh7XG4gICAgb3duZXI6IHRyYW5zcG9ydC5wbGF5aW5nID8gJ3RpbWVsaW5lJyA6ICdwbGF5YmFjaycsXG4gICAgcGxheWluZzogIXRyYW5zcG9ydC5wbGF5aW5nLFxuICAgIHN0b3J5V1U6IHRyYW5zcG9ydC5zdG9yeVdVLFxuICB9KTtcbiAgY29uc3Qgc2VlayA9IChzdG9yeVdVKSA9PiBzdG9yZS5zZXRUcmFuc3BvcnQoeyBvd25lcjogJ3RpbWVsaW5lJywgcGxheWluZzogZmFsc2UsIHN0b3J5V1UgfSk7XG4gIGNvbnN0IHNlbGVjdGVkID0gZ2V0U2VjdGlvbihzbmFwc2hvdC5kb2N1bWVudCwgc25hcHNob3Quc2VsZWN0aW9uKTtcbiAgY29uc3Qgc2VjdGlvbkluZGV4ID0gZ2V0U2VjdGlvbkluZGV4KHNuYXBzaG90LmRvY3VtZW50LCBzZWxlY3RlZC5pZCk7XG4gIGNvbnN0IGp1bXBTZWN0aW9uID0gKGRpcmVjdGlvbikgPT4ge1xuICAgIGNvbnN0IG5leHQgPSBzbmFwc2hvdC5jb21waWxlZFBsYW4uc2VjdGlvbnNbTWF0aC5tYXgoMCwgTWF0aC5taW4oc25hcHNob3QuY29tcGlsZWRQbGFuLnNlY3Rpb25zLmxlbmd0aCAtIDEsIHNlY3Rpb25JbmRleCArIGRpcmVjdGlvbikpXTtcbiAgICBpZiAobmV4dCkgc2VlayhuZXh0LnN0YXJ0V1UpO1xuICB9O1xuICByZXR1cm4gKFxuICAgIDxkaXYgY2xhc3NOYW1lPVwiYWJvdXQtZWRpdG9yLXRyYW5zcG9ydFwiPlxuICAgICAgPGJ1dHRvbiB0eXBlPVwiYnV0dG9uXCIgdGl0bGU9XCJQcmV2aW91cyBTZWN0aW9uXCIgYXJpYS1sYWJlbD1cIlByZXZpb3VzIFNlY3Rpb25cIiBvbkNsaWNrPXsoKSA9PiBqdW1wU2VjdGlvbigtMSl9PjxTa2lwQmFjayBhcmlhLWhpZGRlbj1cInRydWVcIiAvPjwvYnV0dG9uPlxuICAgICAgPGJ1dHRvbiB0eXBlPVwiYnV0dG9uXCIgdGl0bGU9XCJQcmV2aW91cyBrZXlmcmFtZSDCtyBMZWZ0IGFycm93XCIgYXJpYS1sYWJlbD1cIlByZXZpb3VzIGtleWZyYW1lXCIgb25DbGljaz17KCkgPT4ganVtcFRpbWVsaW5lS2V5ZnJhbWUoc3RvcmUsIHNuYXBzaG90LCAtMSl9PjxDaGV2cm9uTGVmdCBhcmlhLWhpZGRlbj1cInRydWVcIiAvPjwvYnV0dG9uPlxuICAgICAgPGJ1dHRvbiB0eXBlPVwiYnV0dG9uXCIgY2xhc3NOYW1lPVwiaXMtcHJpbWFyeVwiIHRpdGxlPXt0cmFuc3BvcnQucGxheWluZyA/ICdQYXVzZScgOiAnUGxheSd9IGFyaWEtbGFiZWw9e3RyYW5zcG9ydC5wbGF5aW5nID8gJ1BhdXNlJyA6ICdQbGF5J30gb25DbGljaz17cGxheX0+XG4gICAgICAgIHt0cmFuc3BvcnQucGxheWluZyA/IDxQYXVzZSBhcmlhLWhpZGRlbj1cInRydWVcIiAvPiA6IDxQbGF5IGFyaWEtaGlkZGVuPVwidHJ1ZVwiIC8+fVxuICAgICAgPC9idXR0b24+XG4gICAgICA8YnV0dG9uIHR5cGU9XCJidXR0b25cIiB0aXRsZT1cIk5leHQgU2VjdGlvblwiIGFyaWEtbGFiZWw9XCJOZXh0IFNlY3Rpb25cIiBvbkNsaWNrPXsoKSA9PiBqdW1wU2VjdGlvbigxKX0+PFNraXBGb3J3YXJkIGFyaWEtaGlkZGVuPVwidHJ1ZVwiIC8+PC9idXR0b24+XG4gICAgICA8YnV0dG9uIHR5cGU9XCJidXR0b25cIiB0aXRsZT1cIk5leHQga2V5ZnJhbWUgwrcgUmlnaHQgYXJyb3dcIiBhcmlhLWxhYmVsPVwiTmV4dCBrZXlmcmFtZVwiIG9uQ2xpY2s9eygpID0+IGp1bXBUaW1lbGluZUtleWZyYW1lKHN0b3JlLCBzbmFwc2hvdCwgMSl9PjxDaGV2cm9uUmlnaHQgYXJpYS1oaWRkZW49XCJ0cnVlXCIgLz48L2J1dHRvbj5cbiAgICAgIDxvdXRwdXQ+e2Zvcm1hdFdVKHRyYW5zcG9ydC5zdG9yeVdVKX08L291dHB1dD5cbiAgICAgIDxpbnB1dFxuICAgICAgICBhcmlhLWxhYmVsPVwiR2xvYmFsIG5hcnJhdGl2ZSBwbGF5aGVhZFwiXG4gICAgICAgIHR5cGU9XCJyYW5nZVwiXG4gICAgICAgIG1pbj1cIjBcIlxuICAgICAgICBtYXg9e21heFdVfVxuICAgICAgICBzdGVwPVwiMC4wMDJcIlxuICAgICAgICB2YWx1ZT17TWF0aC5taW4obWF4V1UsIHRyYW5zcG9ydC5zdG9yeVdVKX1cbiAgICAgICAgb25DaGFuZ2U9eyhldmVudCkgPT4gc2VlayhOdW1iZXIoZXZlbnQudGFyZ2V0LnZhbHVlKSl9XG4gICAgICAvPlxuICAgICAgPGJ1dHRvblxuICAgICAgICB0eXBlPVwiYnV0dG9uXCJcbiAgICAgICAgY2xhc3NOYW1lPXt0cmFuc3BvcnQub3duZXIgPT09ICdzY3JvbGwnID8gJ2lzLWFjdGl2ZScgOiAnJ31cbiAgICAgICAgb25DbGljaz17KCkgPT4gc3RvcmUuc2V0VHJhbnNwb3J0KHsgb3duZXI6ICdzY3JvbGwnLCBwbGF5aW5nOiBmYWxzZSB9KX1cbiAgICAgID5Gb2xsb3cgc2Nyb2xsPC9idXR0b24+XG4gICAgICA8YnV0dG9uXG4gICAgICAgIHR5cGU9XCJidXR0b25cIlxuICAgICAgICBjbGFzc05hbWU9e3RyYW5zcG9ydC5saXZlQW1iaWVudCA/ICdpcy1hY3RpdmUnIDogJyd9XG4gICAgICAgIG9uQ2xpY2s9eygpID0+IHN0b3JlLnNldFRyYW5zcG9ydCh7IGxpdmVBbWJpZW50OiAhdHJhbnNwb3J0LmxpdmVBbWJpZW50IH0pfVxuICAgICAgPkxpdmUgYW1iaWVudDwvYnV0dG9uPlxuICAgICAgPHNlbGVjdFxuICAgICAgICBhcmlhLWxhYmVsPVwiUHJldmlldyBwcm9maWxlXCJcbiAgICAgICAgdmFsdWU9e3NuYXBzaG90LnByZXZpZXdQcm9maWxlfVxuICAgICAgICBvbkNoYW5nZT17KGV2ZW50KSA9PiBzdG9yZS5zZXRQcmV2aWV3UHJvZmlsZShldmVudC50YXJnZXQudmFsdWUpfVxuICAgICAgPlxuICAgICAgICA8b3B0aW9uIHZhbHVlPVwiZGVza3RvcFwiPkRlc2t0b3A8L29wdGlvbj5cbiAgICAgICAgPG9wdGlvbiB2YWx1ZT1cIm1vYmlsZVwiPk1vYmlsZTwvb3B0aW9uPlxuICAgICAgICA8b3B0aW9uIHZhbHVlPVwicmVkdWNlZC1tb3Rpb25cIj5SZWR1Y2VkIG1vdGlvbjwvb3B0aW9uPlxuICAgICAgPC9zZWxlY3Q+XG4gICAgPC9kaXY+XG4gICk7XG59XG5cbmZ1bmN0aW9uIFRpbWVsaW5lKHsgc3RvcmUsIHNuYXBzaG90IH0pIHtcbiAgY29uc3QgeyBkb2N1bWVudCwgY29tcGlsZWRQbGFuLCBzZWxlY3Rpb24sIHRyYW5zcG9ydCB9ID0gc25hcHNob3Q7XG4gIGNvbnN0IHNlbGVjdGVkQ3VlTWVtYmVycyA9IGdldEFib3V0TmFycmF0aXZlU2VsZWN0aW9uTWVtYmVycyhzZWxlY3Rpb24pO1xuICBjb25zdCBtYXhXVSA9IE1hdGgubWF4KDAuMDAxLCBjb21waWxlZFBsYW4/Lm1heFN0b3J5V1UgfHwgZG9jdW1lbnQuc2VjdGlvbnMucmVkdWNlKChzdW0sIHNlY3Rpb24pID0+IHN1bSArIHNlY3Rpb24uZXh0ZW50V1UsIDApKTtcbiAgY29uc3QgcGxheWhlYWQgPSBgJHsodHJhbnNwb3J0LnN0b3J5V1UgLyBtYXhXVSkgKiAxMDB9JWA7XG4gIGNvbnN0IGxhbmVzUmVmID0gdXNlUmVmKG51bGwpO1xuICBjb25zdCB0aW1pbmdEcmFnUmVmID0gdXNlUmVmKG51bGwpO1xuICBjb25zdCBwcmV2aWV3RnJhbWVSZWYgPSB1c2VSZWYobnVsbCk7XG4gIGNvbnN0IHBlbmRpbmdQcmV2aWV3UmVmID0gdXNlUmVmKG51bGwpO1xuICBjb25zdCBzdXBwcmVzc2VkQ2xpY2tSZWYgPSB1c2VSZWYobnVsbCk7XG4gIGNvbnN0IFtjYW1lcmFEcmFnUHJldmlldywgc2V0Q2FtZXJhRHJhZ1ByZXZpZXddID0gdXNlU3RhdGUobnVsbCk7XG4gIGNvbnN0IFtzZWN0aW9uUmVzaXplUHJldmlldywgc2V0U2VjdGlvblJlc2l6ZVByZXZpZXddID0gdXNlU3RhdGUobnVsbCk7XG4gIGNvbnN0IFttYXJxdWVlLCBzZXRNYXJxdWVlXSA9IHVzZVN0YXRlKG51bGwpO1xuXG4gIGNvbnN0IHF1ZXVlUHJldmlld0ZyYW1lID0gKGNhbGxiYWNrKSA9PiB7XG4gICAgcGVuZGluZ1ByZXZpZXdSZWYuY3VycmVudCA9IGNhbGxiYWNrO1xuICAgIGlmIChwcmV2aWV3RnJhbWVSZWYuY3VycmVudCkgcmV0dXJuO1xuICAgIHByZXZpZXdGcmFtZVJlZi5jdXJyZW50ID0gcmVxdWVzdEFuaW1hdGlvbkZyYW1lKCgpID0+IHtcbiAgICAgIHByZXZpZXdGcmFtZVJlZi5jdXJyZW50ID0gbnVsbDtcbiAgICAgIGNvbnN0IHBlbmRpbmcgPSBwZW5kaW5nUHJldmlld1JlZi5jdXJyZW50O1xuICAgICAgcGVuZGluZ1ByZXZpZXdSZWYuY3VycmVudCA9IG51bGw7XG4gICAgICBwZW5kaW5nPy4oKTtcbiAgICB9KTtcbiAgfTtcbiAgY29uc3QgZmx1c2hQcmV2aWV3RnJhbWUgPSAoKSA9PiB7XG4gICAgaWYgKHByZXZpZXdGcmFtZVJlZi5jdXJyZW50KSBjYW5jZWxBbmltYXRpb25GcmFtZShwcmV2aWV3RnJhbWVSZWYuY3VycmVudCk7XG4gICAgcHJldmlld0ZyYW1lUmVmLmN1cnJlbnQgPSBudWxsO1xuICAgIGNvbnN0IHBlbmRpbmcgPSBwZW5kaW5nUHJldmlld1JlZi5jdXJyZW50O1xuICAgIHBlbmRpbmdQcmV2aWV3UmVmLmN1cnJlbnQgPSBudWxsO1xuICAgIHBlbmRpbmc/LigpO1xuICB9O1xuXG4gIGNvbnN0IHpvb21UaW1lbGluZSA9IChldmVudCkgPT4ge1xuICAgIGlmICghZXZlbnQuY3RybEtleSAmJiAhZXZlbnQubWV0YUtleSkgcmV0dXJuO1xuICAgIGV2ZW50LnByZXZlbnREZWZhdWx0KCk7XG4gICAgY29uc3QgbGFuZXMgPSBsYW5lc1JlZi5jdXJyZW50O1xuICAgIGlmICghbGFuZXMpIHJldHVybjtcbiAgICBjb25zdCByZWN0ID0gbGFuZXMuZ2V0Qm91bmRpbmdDbGllbnRSZWN0KCk7XG4gICAgY29uc3QgcG9pbnRlclggPSBNYXRoLm1pbihyZWN0LndpZHRoLCBNYXRoLm1heCgwLCBldmVudC5jbGllbnRYIC0gcmVjdC5sZWZ0KSk7XG4gICAgY29uc3Qgc3RvcnlSYXRpbyA9IChsYW5lcy5zY3JvbGxMZWZ0ICsgcG9pbnRlclgpIC8gTWF0aC5tYXgoMSwgbGFuZXMuc2Nyb2xsV2lkdGgpO1xuICAgIGNvbnN0IGN1cnJlbnRab29tID0gTWF0aC5tYXgoMSwgTnVtYmVyKHRyYW5zcG9ydC56b29tKSB8fCAxKTtcbiAgICBjb25zdCBuZXh0Wm9vbSA9IE1hdGgubWluKDgsIE1hdGgubWF4KDEsIGN1cnJlbnRab29tICogTWF0aC5leHAoLWV2ZW50LmRlbHRhWSAqIDAuMDAyNSkpKTtcbiAgICBzdG9yZS5zZXRUcmFuc3BvcnQoeyB6b29tOiBOdW1iZXIobmV4dFpvb20udG9GaXhlZCgzKSkgfSk7XG4gICAgcmVxdWVzdEFuaW1hdGlvbkZyYW1lKCgpID0+IHtcbiAgICAgIGxhbmVzLnNjcm9sbExlZnQgPSAoc3RvcnlSYXRpbyAqIGxhbmVzLnNjcm9sbFdpZHRoKSAtIHBvaW50ZXJYO1xuICAgIH0pO1xuICB9O1xuXG4gIHVzZUVmZmVjdCgoKSA9PiAoKSA9PiB7XG4gICAgaWYgKHByZXZpZXdGcmFtZVJlZi5jdXJyZW50KSBjYW5jZWxBbmltYXRpb25GcmFtZShwcmV2aWV3RnJhbWVSZWYuY3VycmVudCk7XG4gIH0sIFtdKTtcblxuICBjb25zdCByZXNvbHZlQ2FtZXJhRHJvcEF0Q2xpZW50WCA9IChjbGllbnRYKSA9PiB7XG4gICAgY29uc3QgbGFuZXMgPSBsYW5lc1JlZi5jdXJyZW50O1xuICAgIGNvbnN0IGN1cnJlbnQgPSBzdG9yZS5nZXRTbmFwc2hvdCgpO1xuICAgIGlmICghbGFuZXMpIHJldHVybiB7IHZhbGlkOiBmYWxzZSwgcmVhc29uOiAnVGhlIGNhbWVyYSB0aW1lbGluZSBpcyBub3QgcmVhZHkuJyB9O1xuICAgIGNvbnN0IHJlY3QgPSBsYW5lcy5nZXRCb3VuZGluZ0NsaWVudFJlY3QoKTtcbiAgICBjb25zdCBjb250ZW50WCA9IE1hdGgubWluKFxuICAgICAgbGFuZXMuc2Nyb2xsV2lkdGgsXG4gICAgICBNYXRoLm1heCgwLCBjbGllbnRYIC0gcmVjdC5sZWZ0ICsgbGFuZXMuc2Nyb2xsTGVmdCksXG4gICAgKTtcbiAgICBjb25zdCBzdG9yeVdVID0gKGNvbnRlbnRYIC8gTWF0aC5tYXgoMSwgbGFuZXMuc2Nyb2xsV2lkdGgpKVxuICAgICAgKiBNYXRoLm1heCgwLjAwMSwgY3VycmVudC5jb21waWxlZFBsYW4/Lm1heFN0b3J5V1UgfHwgbWF4V1UpO1xuICAgIGNvbnN0IGRyYWcgPSB0aW1pbmdEcmFnUmVmLmN1cnJlbnQ7XG4gICAgY29uc3QgZHJvcCA9IHJlc29sdmVBYm91dE5hcnJhdGl2ZUNhbWVyYUtleURyb3Aoe1xuICAgICAgZG9jdW1lbnQ6IGN1cnJlbnQuZG9jdW1lbnQsXG4gICAgICBwbGFuOiBjdXJyZW50LmNvbXBpbGVkUGxhbixcbiAgICAgIHNvdXJjZVNlY3Rpb25JbmRleDogZHJhZz8uc2VjdGlvbkluZGV4LFxuICAgICAgc291cmNlS2V5SW5kZXg6IGRyYWc/LmtleUluZGV4LFxuICAgICAgc3RvcnlXVSxcbiAgICB9KTtcbiAgICByZXR1cm4geyAuLi5kcm9wLCBjb250ZW50WCB9O1xuICB9O1xuXG4gIGNvbnN0IGJlZ2luVGltaW5nRHJhZyA9IChldmVudCwgZHJhZykgPT4ge1xuICAgIGlmIChkcmFnLmxvY2tlZCB8fCBldmVudC5idXR0b24gIT09IDApIHJldHVybjtcbiAgICBjb25zdCBjbGlwID0gZXZlbnQuY3VycmVudFRhcmdldC5wYXJlbnRFbGVtZW50O1xuICAgIGNvbnN0IHJlY3QgPSBjbGlwPy5nZXRCb3VuZGluZ0NsaWVudFJlY3QoKTtcbiAgICBpZiAoIXJlY3Q/LndpZHRoKSByZXR1cm47XG4gICAgZXZlbnQucHJldmVudERlZmF1bHQoKTtcbiAgICBldmVudC5zdG9wUHJvcGFnYXRpb24oKTtcbiAgICBldmVudC5jdXJyZW50VGFyZ2V0LnNldFBvaW50ZXJDYXB0dXJlPy4oZXZlbnQucG9pbnRlcklkKTtcbiAgICBsZXQgbmV4dFNlbGVjdGlvbiA9IGRyYWcuc2VsZWN0aW9uO1xuICAgIGlmIChkcmFnLnR5cGUgPT09ICdjdWUnKSB7XG4gICAgICBjb25zdCBjdXJyZW50U2VsZWN0aW9uID0gc3RvcmUuZ2V0U25hcHNob3QoKS5zZWxlY3Rpb247XG4gICAgICBjb25zdCBjdXJyZW50TWVtYmVycyA9IGdldEFib3V0TmFycmF0aXZlU2VsZWN0aW9uTWVtYmVycyhjdXJyZW50U2VsZWN0aW9uKTtcbiAgICAgIGNvbnN0IGFscmVhZHlTZWxlY3RlZCA9IGN1cnJlbnRNZW1iZXJzLnNvbWUoKG1lbWJlcikgPT4gKFxuICAgICAgICBtZW1iZXIuc2VjdGlvbklkID09PSBkcmFnLnNlbGVjdGlvbi5zZWN0aW9uSWQgJiYgbWVtYmVyLmN1ZUlkID09PSBkcmFnLnNlbGVjdGlvbi5jdWVJZFxuICAgICAgKSk7XG4gICAgICBuZXh0U2VsZWN0aW9uID0gZXZlbnQuc2hpZnRLZXlcbiAgICAgICAgPyB0b2dnbGVBYm91dE5hcnJhdGl2ZUN1ZVNlbGVjdGlvbihjdXJyZW50U2VsZWN0aW9uLCBkcmFnLnNlbGVjdGlvbilcbiAgICAgICAgOiBhbHJlYWR5U2VsZWN0ZWQgJiYgY3VycmVudE1lbWJlcnMubGVuZ3RoID4gMVxuICAgICAgICAgID8geyAuLi5kcmFnLnNlbGVjdGlvbiwgbWVtYmVyczogY3VycmVudE1lbWJlcnMgfVxuICAgICAgICAgIDogZHJhZy5zZWxlY3Rpb247XG4gICAgICBzdG9yZS5iZWdpblByZXZpZXcoJ01vdmUgdGV4dCBDdWVzJyk7XG4gICAgfVxuICAgIHRpbWluZ0RyYWdSZWYuY3VycmVudCA9IHtcbiAgICAgIC4uLmRyYWcsXG4gICAgICBzZWxlY3Rpb246IG5leHRTZWxlY3Rpb24sXG4gICAgICBtZW1iZXJzOiBkcmFnLnR5cGUgPT09ICdjdWUnID8gZ2V0QWJvdXROYXJyYXRpdmVTZWxlY3Rpb25NZW1iZXJzKG5leHRTZWxlY3Rpb24pIDogbnVsbCxcbiAgICAgIHN0YXJ0RG9jdW1lbnQ6IGRyYWcudHlwZSA9PT0gJ2N1ZScgPyBjbG9uZUFib3V0TmFycmF0aXZlRG9jdW1lbnQoc3RvcmUuZ2V0U25hcHNob3QoKS5kb2N1bWVudCkgOiBudWxsLFxuICAgICAgc3RhcnRQbGFuOiBkcmFnLnR5cGUgPT09ICdjdWUnID8gc3RvcmUuZ2V0U25hcHNob3QoKS5jb21waWxlZFBsYW4gOiBudWxsLFxuICAgICAgcG9pbnRlcklkOiBldmVudC5wb2ludGVySWQsXG4gICAgICByZWN0LFxuICAgICAgc3RhcnRYOiBldmVudC5jbGllbnRYLFxuICAgICAgbW92ZWQ6IGZhbHNlLFxuICAgICAgbGFzdEF0OiBkcmFnLmF0LFxuICAgICAgbGFzdERyb3A6IG51bGwsXG4gICAgfTtcbiAgICBzdG9yZS5zZXRTZWxlY3Rpb24obmV4dFNlbGVjdGlvbik7XG4gICAgc3RvcmUuc2V0VHJhbnNwb3J0KHsgb3duZXI6ICd0aW1lbGluZScsIHBsYXlpbmc6IGZhbHNlLCBzdG9yeVdVOiBkcmFnLnN0b3J5V1UgfSk7XG4gIH07XG5cbiAgY29uc3QgbW92ZVRpbWluZ0RyYWcgPSAoZXZlbnQpID0+IHtcbiAgICBjb25zdCBkcmFnID0gdGltaW5nRHJhZ1JlZi5jdXJyZW50O1xuICAgIGlmICghZHJhZyB8fCBkcmFnLnBvaW50ZXJJZCAhPT0gZXZlbnQucG9pbnRlcklkKSByZXR1cm47XG4gICAgaWYgKCFkcmFnLm1vdmVkICYmIE1hdGguYWJzKGV2ZW50LmNsaWVudFggLSBkcmFnLnN0YXJ0WCkgPCAzKSByZXR1cm47XG4gICAgZHJhZy5tb3ZlZCA9IHRydWU7XG4gICAgaWYgKGRyYWcudHlwZSA9PT0gJ2NhbWVyYScpIHtcbiAgICAgIGNvbnN0IGRyb3AgPSByZXNvbHZlQ2FtZXJhRHJvcEF0Q2xpZW50WChldmVudC5jbGllbnRYKTtcbiAgICAgIGRyYWcubGFzdERyb3AgPSBkcm9wO1xuICAgICAgc2V0Q2FtZXJhRHJhZ1ByZXZpZXcoeyAuLi5kcm9wLCB0b2tlbjogZHJhZy50b2tlbiB9KTtcbiAgICAgIGlmIChkcm9wLnZhbGlkKSB7XG4gICAgICAgIHN0b3JlLnNldFRyYW5zcG9ydCh7IG93bmVyOiAndGltZWxpbmUnLCBwbGF5aW5nOiBmYWxzZSwgc3RvcnlXVTogZHJvcC5zdG9yeVdVIH0pO1xuICAgICAgfVxuICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICBpZiAoZHJhZy50eXBlID09PSAnZGlzY2lwbGluZS1yZXZlYWwnKSB7XG4gICAgICBjb25zdCBkZWx0YUxhbmUgPSAoZXZlbnQuY2xpZW50WCAtIGRyYWcuc3RhcnRYKSAvIGRyYWcucmVjdC53aWR0aDtcbiAgICAgIGNvbnN0IG5leHRBdCA9IE1hdGgubWluKGRyYWcubWF4LCBNYXRoLm1heChcbiAgICAgICAgZHJhZy5taW4sXG4gICAgICAgIHNuYXBBYm91dE5hcnJhdGl2ZVRpbWVsaW5lVmFsdWUoZHJhZy5hdCArIGRlbHRhTGFuZSksXG4gICAgICApKTtcbiAgICAgIGlmIChNYXRoLmFicyhuZXh0QXQgLSBkcmFnLmxhc3RBdCkgPCAwLjAwMDAwMSkgcmV0dXJuO1xuICAgICAgY29uc3QgZGVsdGEgPSBuZXh0QXQgLSBkcmFnLmxhc3RBdDtcbiAgICAgIHN0b3JlLmNvbW1pdCgnTW92ZSBEaXNjaXBsaW5lIHJldmVhbCcsIChkcmFmdCkgPT4ge1xuICAgICAgICBjb25zdCByZXZlYWwgPSBkcmFmdC5zZWN0aW9uc1tkcmFnLnNlY3Rpb25JbmRleF0udGV4dC5kaXNjaXBsaW5lUmV2ZWFsO1xuICAgICAgICBpZiAoIXJldmVhbCkgcmV0dXJuO1xuICAgICAgICByZXZlYWwuc3RhcnQgKz0gZGVsdGE7XG4gICAgICAgIHJldmVhbC5lbmQgKz0gZGVsdGE7XG4gICAgICB9LCB7IGNvYWxlc2NlS2V5OiBkcmFnLmNvYWxlc2NlS2V5LCBzZWxlY3Rpb246IGRyYWcuc2VsZWN0aW9uIH0pO1xuICAgICAgZHJhZy5sYXN0QXQgPSBuZXh0QXQ7XG4gICAgICBzdG9yZS5zZXRUcmFuc3BvcnQoe1xuICAgICAgICBvd25lcjogJ3RpbWVsaW5lJyxcbiAgICAgICAgcGxheWluZzogZmFsc2UsXG4gICAgICAgIHN0b3J5V1U6IGRyYWcuc2VjdGlvblN0YXJ0V1UgKyAobmV4dEF0ICogZHJhZy50cmF2ZWxXVSksXG4gICAgICB9KTtcbiAgICAgIHJldHVybjtcbiAgICB9XG4gICAgY29uc3QgbG9jYWxEZWx0YSA9IChldmVudC5jbGllbnRYIC0gZHJhZy5zdGFydFgpIC8gZHJhZy5yZWN0LndpZHRoO1xuICAgIGNvbnN0IG1vdmVtZW50ID0gcmVzb2x2ZUFib3V0TmFycmF0aXZlQ3VlR3JvdXBNb3ZlKHtcbiAgICAgIGRvY3VtZW50OiBkcmFnLnN0YXJ0RG9jdW1lbnQsXG4gICAgICBwbGFuOiBkcmFnLnN0YXJ0UGxhbixcbiAgICAgIG1lbWJlcnM6IGRyYWcubWVtYmVycyxcbiAgICAgIHByaW1hcnk6IGRyYWcuc2VsZWN0aW9uLFxuICAgICAgbG9jYWxEZWx0YSxcbiAgICB9KTtcbiAgICBpZiAoIW1vdmVtZW50LnZhbGlkIHx8IE1hdGguYWJzKG1vdmVtZW50LmRlbHRhV1UgLSAoZHJhZy5sYXN0RGVsdGFXVSB8fCAwKSkgPCAwLjAwMDAwMSkgcmV0dXJuO1xuICAgIGRyYWcubGFzdERlbHRhV1UgPSBtb3ZlbWVudC5kZWx0YVdVO1xuICAgIHF1ZXVlUHJldmlld0ZyYW1lKCgpID0+IHtcbiAgICAgIHN0b3JlLnVwZGF0ZVByZXZpZXcoKGRyYWZ0KSA9PiB7XG4gICAgICAgIG1vdmVtZW50Lm1vdmVzLmZvckVhY2goKG1vdmUpID0+IHtcbiAgICAgICAgICBjb25zdCBjdWUgPSBkcmFmdC5zZWN0aW9uc1ttb3ZlLnNlY3Rpb25JbmRleF0/LnRleHQ/LmN1ZXM/LmZpbmQoKGl0ZW0pID0+IGl0ZW0uaWQgPT09IG1vdmUuY3VlSWQpO1xuICAgICAgICAgIGlmIChjdWUpIE9iamVjdC5hc3NpZ24oY3VlLCB7IGVudGVyOiBtb3ZlLmVudGVyLCBob2xkOiBtb3ZlLmhvbGQsIGV4aXQ6IG1vdmUuZXhpdCB9KTtcbiAgICAgICAgfSk7XG4gICAgICB9LCB7XG4gICAgICAgIG93bmVyOiAndGltZWxpbmUnLFxuICAgICAgICBwbGF5aW5nOiBmYWxzZSxcbiAgICAgICAgc3RvcnlXVTogZHJhZy5zdG9yeVdVICsgbW92ZW1lbnQuZGVsdGFXVSxcbiAgICAgIH0pO1xuICAgIH0pO1xuICB9O1xuXG4gIGNvbnN0IGVuZFRpbWluZ0RyYWcgPSAoZXZlbnQpID0+IHtcbiAgICBjb25zdCBkcmFnID0gdGltaW5nRHJhZ1JlZi5jdXJyZW50O1xuICAgIGlmICghZHJhZyB8fCBkcmFnLnBvaW50ZXJJZCAhPT0gZXZlbnQucG9pbnRlcklkKSByZXR1cm47XG4gICAgaWYgKGV2ZW50LmN1cnJlbnRUYXJnZXQuaGFzUG9pbnRlckNhcHR1cmU/LihldmVudC5wb2ludGVySWQpKSBldmVudC5jdXJyZW50VGFyZ2V0LnJlbGVhc2VQb2ludGVyQ2FwdHVyZShldmVudC5wb2ludGVySWQpO1xuICAgIGlmIChkcmFnLnR5cGUgPT09ICdjdWUnKSB7XG4gICAgICBmbHVzaFByZXZpZXdGcmFtZSgpO1xuICAgICAgaWYgKGV2ZW50LnR5cGUgPT09ICdwb2ludGVyY2FuY2VsJyB8fCAhZHJhZy5tb3ZlZCkgc3RvcmUuY2FuY2VsUHJldmlldygpO1xuICAgICAgZWxzZSBzdG9yZS5jb21taXRQcmV2aWV3KGRyYWcuc2VsZWN0aW9uKTtcbiAgICB9XG4gICAgaWYgKGRyYWcudHlwZSA9PT0gJ2NhbWVyYScgJiYgZHJhZy5tb3ZlZCAmJiBldmVudC50eXBlICE9PSAncG9pbnRlcmNhbmNlbCcpIHtcbiAgICAgIGNvbnN0IGRyb3AgPSBkcmFnLmxhc3REcm9wIHx8IHJlc29sdmVDYW1lcmFEcm9wQXRDbGllbnRYKGV2ZW50LmNsaWVudFgpO1xuICAgICAgaWYgKGRyb3AudmFsaWQpIHtcbiAgICAgICAgc3RvcmUuY29tbWl0KCdNb3ZlIGNhbWVyYSBrZXknLCAoZHJhZnQpID0+IHtcbiAgICAgICAgICBjb25zdCBzb3VyY2VLZXlzID0gZHJhZnQuc2VjdGlvbnNbZHJhZy5zZWN0aW9uSW5kZXhdPy5jYW1lcmEua2V5cztcbiAgICAgICAgICBjb25zdCBbbW92ZWRLZXldID0gc291cmNlS2V5cz8uc3BsaWNlKGRyYWcua2V5SW5kZXgsIDEpIHx8IFtdO1xuICAgICAgICAgIGlmICghbW92ZWRLZXkpIHJldHVybjtcbiAgICAgICAgICBtb3ZlZEtleS5hdCA9IGRyb3AuYXQ7XG4gICAgICAgICAgY29uc3QgZGVzdGluYXRpb25LZXlzID0gZHJhZnQuc2VjdGlvbnNbZHJvcC5zZWN0aW9uSW5kZXhdLmNhbWVyYS5rZXlzO1xuICAgICAgICAgIGRlc3RpbmF0aW9uS2V5cy5wdXNoKG1vdmVkS2V5KTtcbiAgICAgICAgICBkZXN0aW5hdGlvbktleXMuc29ydCgoYSwgYikgPT4gYS5hdCAtIGIuYXQpO1xuICAgICAgICB9LCB7XG4gICAgICAgICAgc2VsZWN0aW9uOiB7IHR5cGU6ICdjYW1lcmEta2V5Jywgc2VjdGlvbklkOiBkcm9wLnNlY3Rpb25JZCwga2V5SW5kZXg6IGRyb3Aua2V5SW5kZXggfSxcbiAgICAgICAgfSk7XG4gICAgICAgIHN0b3JlLnNldFRyYW5zcG9ydCh7IG93bmVyOiAndGltZWxpbmUnLCBwbGF5aW5nOiBmYWxzZSwgc3RvcnlXVTogZHJvcC5zdG9yeVdVIH0pO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgc3RvcmUuc2V0U2F2ZVN0YXRlKHsgbWVzc2FnZTogZHJvcC5yZWFzb24gfHwgJ1RoYXQgY2FtZXJhIGtleSBjYW5ub3QgYmUgcGxhY2VkIGhlcmUuJyB9KTtcbiAgICAgIH1cbiAgICB9XG4gICAgaWYgKGRyYWcubW92ZWQpIHtcbiAgICAgIHN1cHByZXNzZWRDbGlja1JlZi5jdXJyZW50ID0gZHJhZy50b2tlbjtcbiAgICAgIHdpbmRvdy5zZXRUaW1lb3V0KCgpID0+IHtcbiAgICAgICAgaWYgKHN1cHByZXNzZWRDbGlja1JlZi5jdXJyZW50ID09PSBkcmFnLnRva2VuKSBzdXBwcmVzc2VkQ2xpY2tSZWYuY3VycmVudCA9IG51bGw7XG4gICAgICB9LCAwKTtcbiAgICB9XG4gICAgc2V0Q2FtZXJhRHJhZ1ByZXZpZXcobnVsbCk7XG4gICAgdGltaW5nRHJhZ1JlZi5jdXJyZW50ID0gbnVsbDtcbiAgfTtcblxuICBjb25zdCBoYW5kbGVUaW1pbmdDbGljayA9ICh0b2tlbiwgYWN0aW9uKSA9PiB7XG4gICAgaWYgKHN1cHByZXNzZWRDbGlja1JlZi5jdXJyZW50ID09PSB0b2tlbikge1xuICAgICAgc3VwcHJlc3NlZENsaWNrUmVmLmN1cnJlbnQgPSBudWxsO1xuICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICBhY3Rpb24oKTtcbiAgfTtcblxuICBjb25zdCBiZWdpblNlY3Rpb25SZXNpemUgPSAoZXZlbnQsIGRhdGEpID0+IHtcbiAgICBpZiAoZGF0YS5sb2NrZWQgfHwgZXZlbnQuYnV0dG9uICE9PSAwKSByZXR1cm47XG4gICAgZXZlbnQucHJldmVudERlZmF1bHQoKTtcbiAgICBldmVudC5zdG9wUHJvcGFnYXRpb24oKTtcbiAgICBldmVudC5jdXJyZW50VGFyZ2V0LnNldFBvaW50ZXJDYXB0dXJlPy4oZXZlbnQucG9pbnRlcklkKTtcbiAgICBjb25zdCBjdXJyZW50ID0gc3RvcmUuZ2V0U25hcHNob3QoKTtcbiAgICBjb25zdCBmaWVsZCA9IGdldEFib3V0TmFycmF0aXZlRXh0ZW50RmllbGQoY3VycmVudC5wcmV2aWV3UHJvZmlsZSk7XG4gICAgc3RvcmUuYmVnaW5QcmV2aWV3KGBSZXNpemUgJHtkYXRhLnNlY3Rpb25MYWJlbH1gKTtcbiAgICBzdG9yZS5zZXRTZWxlY3Rpb24oeyB0eXBlOiAnc2VjdGlvbicsIHNlY3Rpb25JZDogZGF0YS5zZWN0aW9uSWQgfSk7XG4gICAgdGltaW5nRHJhZ1JlZi5jdXJyZW50ID0ge1xuICAgICAgdHlwZTogJ3NlY3Rpb24tcmVzaXplJyxcbiAgICAgIHRva2VuOiBgc2VjdGlvbi1yZXNpemU6JHtkYXRhLnNlY3Rpb25JZH1gLFxuICAgICAgcG9pbnRlcklkOiBldmVudC5wb2ludGVySWQsXG4gICAgICBzdGFydFg6IGV2ZW50LmNsaWVudFgsXG4gICAgICBtb3ZlZDogZmFsc2UsXG4gICAgICBzZWN0aW9uSWQ6IGRhdGEuc2VjdGlvbklkLFxuICAgICAgc2VjdGlvbkluZGV4OiBkYXRhLnNlY3Rpb25JbmRleCxcbiAgICAgIHNlY3Rpb25MYWJlbDogZGF0YS5zZWN0aW9uTGFiZWwsXG4gICAgICBmaWVsZCxcbiAgICAgIHN0YXJ0RXh0ZW50OiBOdW1iZXIoY3VycmVudC5kb2N1bWVudC5zZWN0aW9uc1tkYXRhLnNlY3Rpb25JbmRleF1bZmllbGRdKSxcbiAgICAgIHN0YXJ0TWF4V1U6IE1hdGgubWF4KDAuMDAxLCBjdXJyZW50LmNvbXBpbGVkUGxhbj8ubWF4U3RvcnlXVSB8fCBtYXhXVSksXG4gICAgICBzdGFydFNjcm9sbFdpZHRoOiBNYXRoLm1heCgxLCBsYW5lc1JlZi5jdXJyZW50Py5zY3JvbGxXaWR0aCB8fCAxKSxcbiAgICAgIHBsYXloZWFkQ29udGV4dDogY2FwdHVyZUFib3V0TmFycmF0aXZlUGxheWhlYWRDb250ZXh0KHtcbiAgICAgICAgcGxhbjogY3VycmVudC5jb21waWxlZFBsYW4sXG4gICAgICAgIHN0b3J5V1U6IGN1cnJlbnQudHJhbnNwb3J0LnN0b3J5V1UsXG4gICAgICAgIHJlc2l6ZWRTZWN0aW9uSWQ6IGRhdGEuc2VjdGlvbklkLFxuICAgICAgfSksXG4gICAgICBzZWxlY3Rpb246IHsgdHlwZTogJ3NlY3Rpb24nLCBzZWN0aW9uSWQ6IGRhdGEuc2VjdGlvbklkIH0sXG4gICAgfTtcbiAgICBzZXRTZWN0aW9uUmVzaXplUHJldmlldyh7IHNlY3Rpb25JZDogZGF0YS5zZWN0aW9uSWQsIGV4dGVudDogTnVtYmVyKGN1cnJlbnQuZG9jdW1lbnQuc2VjdGlvbnNbZGF0YS5zZWN0aW9uSW5kZXhdW2ZpZWxkXSkgfSk7XG4gIH07XG5cbiAgY29uc3QgbW92ZVNlY3Rpb25SZXNpemUgPSAoZXZlbnQpID0+IHtcbiAgICBjb25zdCBkcmFnID0gdGltaW5nRHJhZ1JlZi5jdXJyZW50O1xuICAgIGlmIChkcmFnPy50eXBlICE9PSAnc2VjdGlvbi1yZXNpemUnIHx8IGRyYWcucG9pbnRlcklkICE9PSBldmVudC5wb2ludGVySWQpIHJldHVybjtcbiAgICBpZiAoIWRyYWcubW92ZWQgJiYgTWF0aC5hYnMoZXZlbnQuY2xpZW50WCAtIGRyYWcuc3RhcnRYKSA8IDMpIHJldHVybjtcbiAgICBkcmFnLm1vdmVkID0gdHJ1ZTtcbiAgICBjb25zdCByYXdFeHRlbnQgPSBkcmFnLnN0YXJ0RXh0ZW50ICsgKCgoZXZlbnQuY2xpZW50WCAtIGRyYWcuc3RhcnRYKSAvIGRyYWcuc3RhcnRTY3JvbGxXaWR0aCkgKiBkcmFnLnN0YXJ0TWF4V1UpO1xuICAgIGNvbnN0IHN0ZXAgPSBldmVudC5hbHRLZXkgPyAwLjAxIDogZXZlbnQuc2hpZnRLZXkgPyAwLjI1IDogMC4wNTtcbiAgICBjb25zdCBleHRlbnQgPSBNYXRoLm1pbig4LCBNYXRoLm1heCgxLCBNYXRoLnJvdW5kKHJhd0V4dGVudCAvIHN0ZXApICogc3RlcCkpO1xuICAgIGlmIChNYXRoLmFicyhleHRlbnQgLSAoZHJhZy5sYXN0RXh0ZW50ID8/IGRyYWcuc3RhcnRFeHRlbnQpKSA8IDAuMDAwMDAxKSByZXR1cm47XG4gICAgZHJhZy5sYXN0RXh0ZW50ID0gTnVtYmVyKGV4dGVudC50b0ZpeGVkKDIpKTtcbiAgICBzZXRTZWN0aW9uUmVzaXplUHJldmlldyh7IHNlY3Rpb25JZDogZHJhZy5zZWN0aW9uSWQsIGV4dGVudDogZHJhZy5sYXN0RXh0ZW50IH0pO1xuICAgIHF1ZXVlUHJldmlld0ZyYW1lKCgpID0+IHtcbiAgICAgIHN0b3JlLnVwZGF0ZVByZXZpZXcoKGRyYWZ0KSA9PiB7XG4gICAgICAgIGRyYWZ0LnNlY3Rpb25zW2RyYWcuc2VjdGlvbkluZGV4XVtkcmFnLmZpZWxkXSA9IGRyYWcubGFzdEV4dGVudDtcbiAgICAgIH0pO1xuICAgICAgc3RvcmUuc2V0VHJhbnNwb3J0KHtcbiAgICAgICAgb3duZXI6ICd0aW1lbGluZScsXG4gICAgICAgIHBsYXlpbmc6IGZhbHNlLFxuICAgICAgICBzdG9yeVdVOiByZW1hcEFib3V0TmFycmF0aXZlUGxheWhlYWRDb250ZXh0KGRyYWcucGxheWhlYWRDb250ZXh0LCBzdG9yZS5nZXRTbmFwc2hvdCgpLmNvbXBpbGVkUGxhbiksXG4gICAgICB9KTtcbiAgICB9KTtcbiAgfTtcblxuICBjb25zdCBlbmRTZWN0aW9uUmVzaXplID0gKGV2ZW50KSA9PiB7XG4gICAgY29uc3QgZHJhZyA9IHRpbWluZ0RyYWdSZWYuY3VycmVudDtcbiAgICBpZiAoZHJhZz8udHlwZSAhPT0gJ3NlY3Rpb24tcmVzaXplJyB8fCBkcmFnLnBvaW50ZXJJZCAhPT0gZXZlbnQucG9pbnRlcklkKSByZXR1cm47XG4gICAgaWYgKGV2ZW50LmN1cnJlbnRUYXJnZXQuaGFzUG9pbnRlckNhcHR1cmU/LihldmVudC5wb2ludGVySWQpKSBldmVudC5jdXJyZW50VGFyZ2V0LnJlbGVhc2VQb2ludGVyQ2FwdHVyZShldmVudC5wb2ludGVySWQpO1xuICAgIGZsdXNoUHJldmlld0ZyYW1lKCk7XG4gICAgaWYgKGV2ZW50LnR5cGUgPT09ICdwb2ludGVyY2FuY2VsJyB8fCAhZHJhZy5tb3ZlZCkgc3RvcmUuY2FuY2VsUHJldmlldygpO1xuICAgIGVsc2Ugc3RvcmUuY29tbWl0UHJldmlldyhkcmFnLnNlbGVjdGlvbik7XG4gICAgdGltaW5nRHJhZ1JlZi5jdXJyZW50ID0gbnVsbDtcbiAgICBzZXRTZWN0aW9uUmVzaXplUHJldmlldyhudWxsKTtcbiAgfTtcblxuICBjb25zdCByZXNldFNlY3Rpb25FeHRlbnQgPSAoc2VjdGlvbklkLCBzZWN0aW9uSW5kZXgpID0+IHtcbiAgICBjb25zdCBjdXJyZW50ID0gc3RvcmUuZ2V0U25hcHNob3QoKTtcbiAgICBjb25zdCBmaWVsZCA9IGdldEFib3V0TmFycmF0aXZlRXh0ZW50RmllbGQoY3VycmVudC5wcmV2aWV3UHJvZmlsZSk7XG4gICAgY29uc3QgYmFzZWxpbmVTZWN0aW9uID0gY3VycmVudC5iYXNlbGluZURvY3VtZW50LnNlY3Rpb25zLmZpbmQoKGl0ZW0pID0+IGl0ZW0uaWQgPT09IHNlY3Rpb25JZCk7XG4gICAgaWYgKCFiYXNlbGluZVNlY3Rpb24gfHwgYmFzZWxpbmVTZWN0aW9uW2ZpZWxkXSA9PT0gY3VycmVudC5kb2N1bWVudC5zZWN0aW9uc1tzZWN0aW9uSW5kZXhdW2ZpZWxkXSkgcmV0dXJuO1xuICAgIGNvbnN0IGNvbnRleHQgPSBjYXB0dXJlQWJvdXROYXJyYXRpdmVQbGF5aGVhZENvbnRleHQoe1xuICAgICAgcGxhbjogY3VycmVudC5jb21waWxlZFBsYW4sXG4gICAgICBzdG9yeVdVOiBjdXJyZW50LnRyYW5zcG9ydC5zdG9yeVdVLFxuICAgICAgcmVzaXplZFNlY3Rpb25JZDogc2VjdGlvbklkLFxuICAgIH0pO1xuICAgIHN0b3JlLmJlZ2luUHJldmlldygnUmVzdG9yZSBzYXZlZCBTZWN0aW9uIGxlbmd0aCcpO1xuICAgIHN0b3JlLnVwZGF0ZVByZXZpZXcoKGRyYWZ0KSA9PiB7IGRyYWZ0LnNlY3Rpb25zW3NlY3Rpb25JbmRleF1bZmllbGRdID0gYmFzZWxpbmVTZWN0aW9uW2ZpZWxkXTsgfSk7XG4gICAgc3RvcmUuc2V0VHJhbnNwb3J0KHsgc3RvcnlXVTogcmVtYXBBYm91dE5hcnJhdGl2ZVBsYXloZWFkQ29udGV4dChjb250ZXh0LCBzdG9yZS5nZXRTbmFwc2hvdCgpLmNvbXBpbGVkUGxhbikgfSk7XG4gICAgc3RvcmUuY29tbWl0UHJldmlldyh7IHR5cGU6ICdzZWN0aW9uJywgc2VjdGlvbklkIH0pO1xuICB9O1xuXG4gIGNvbnN0IGJlZ2luTWFycXVlZSA9IChldmVudCkgPT4ge1xuICAgIGlmIChldmVudC5idXR0b24gIT09IDAgfHwgZXZlbnQudGFyZ2V0ICE9PSBldmVudC5jdXJyZW50VGFyZ2V0KSByZXR1cm47XG4gICAgY29uc3QgY2FudmFzID0gbGFuZXNSZWYuY3VycmVudD8ucXVlcnlTZWxlY3RvcignLmFib3V0LWVkaXRvci10aW1lbGluZS1jYW52YXMnKTtcbiAgICBpZiAoIWNhbnZhcykgcmV0dXJuO1xuICAgIGV2ZW50LnByZXZlbnREZWZhdWx0KCk7XG4gICAgZXZlbnQuY3VycmVudFRhcmdldC5zZXRQb2ludGVyQ2FwdHVyZT8uKGV2ZW50LnBvaW50ZXJJZCk7XG4gICAgY29uc3QgcmVjdCA9IGNhbnZhcy5nZXRCb3VuZGluZ0NsaWVudFJlY3QoKTtcbiAgICB0aW1pbmdEcmFnUmVmLmN1cnJlbnQgPSB7XG4gICAgICB0eXBlOiAnbWFycXVlZScsXG4gICAgICBwb2ludGVySWQ6IGV2ZW50LnBvaW50ZXJJZCxcbiAgICAgIHN0YXJ0Q2xpZW50WDogZXZlbnQuY2xpZW50WCxcbiAgICAgIHN0YXJ0Q2xpZW50WTogZXZlbnQuY2xpZW50WSxcbiAgICAgIGNhbnZhc1JlY3Q6IHJlY3QsXG4gICAgICBhZGRpdGl2ZTogZXZlbnQuc2hpZnRLZXksXG4gICAgfTtcbiAgICBzZXRNYXJxdWVlKHsgbGVmdDogZXZlbnQuY2xpZW50WCAtIHJlY3QubGVmdCwgdG9wOiBldmVudC5jbGllbnRZIC0gcmVjdC50b3AsIHdpZHRoOiAwLCBoZWlnaHQ6IDAgfSk7XG4gIH07XG5cbiAgY29uc3QgbW92ZU1hcnF1ZWUgPSAoZXZlbnQpID0+IHtcbiAgICBjb25zdCBkcmFnID0gdGltaW5nRHJhZ1JlZi5jdXJyZW50O1xuICAgIGlmIChkcmFnPy50eXBlICE9PSAnbWFycXVlZScgfHwgZHJhZy5wb2ludGVySWQgIT09IGV2ZW50LnBvaW50ZXJJZCkgcmV0dXJuO1xuICAgIGNvbnN0IGxlZnQgPSBNYXRoLm1pbihkcmFnLnN0YXJ0Q2xpZW50WCwgZXZlbnQuY2xpZW50WCkgLSBkcmFnLmNhbnZhc1JlY3QubGVmdDtcbiAgICBjb25zdCB0b3AgPSBNYXRoLm1pbihkcmFnLnN0YXJ0Q2xpZW50WSwgZXZlbnQuY2xpZW50WSkgLSBkcmFnLmNhbnZhc1JlY3QudG9wO1xuICAgIHNldE1hcnF1ZWUoe1xuICAgICAgbGVmdCxcbiAgICAgIHRvcCxcbiAgICAgIHdpZHRoOiBNYXRoLmFicyhldmVudC5jbGllbnRYIC0gZHJhZy5zdGFydENsaWVudFgpLFxuICAgICAgaGVpZ2h0OiBNYXRoLmFicyhldmVudC5jbGllbnRZIC0gZHJhZy5zdGFydENsaWVudFkpLFxuICAgIH0pO1xuICB9O1xuXG4gIGNvbnN0IGVuZE1hcnF1ZWUgPSAoZXZlbnQpID0+IHtcbiAgICBjb25zdCBkcmFnID0gdGltaW5nRHJhZ1JlZi5jdXJyZW50O1xuICAgIGlmIChkcmFnPy50eXBlICE9PSAnbWFycXVlZScgfHwgZHJhZy5wb2ludGVySWQgIT09IGV2ZW50LnBvaW50ZXJJZCkgcmV0dXJuO1xuICAgIGlmIChldmVudC5jdXJyZW50VGFyZ2V0Lmhhc1BvaW50ZXJDYXB0dXJlPy4oZXZlbnQucG9pbnRlcklkKSkgZXZlbnQuY3VycmVudFRhcmdldC5yZWxlYXNlUG9pbnRlckNhcHR1cmUoZXZlbnQucG9pbnRlcklkKTtcbiAgICBpZiAoZXZlbnQudHlwZSAhPT0gJ3BvaW50ZXJjYW5jZWwnKSB7XG4gICAgICBjb25zdCBzZWxlY3Rpb25SZWN0ID0ge1xuICAgICAgICBsZWZ0OiBNYXRoLm1pbihkcmFnLnN0YXJ0Q2xpZW50WCwgZXZlbnQuY2xpZW50WCksXG4gICAgICAgIHJpZ2h0OiBNYXRoLm1heChkcmFnLnN0YXJ0Q2xpZW50WCwgZXZlbnQuY2xpZW50WCksXG4gICAgICAgIHRvcDogTWF0aC5taW4oZHJhZy5zdGFydENsaWVudFksIGV2ZW50LmNsaWVudFkpLFxuICAgICAgICBib3R0b206IE1hdGgubWF4KGRyYWcuc3RhcnRDbGllbnRZLCBldmVudC5jbGllbnRZKSxcbiAgICAgIH07XG4gICAgICBjb25zdCBsYW5lUmVjdCA9IGxhbmVzUmVmLmN1cnJlbnQ/LmdldEJvdW5kaW5nQ2xpZW50UmVjdCgpO1xuICAgICAgY29uc3QgaGl0cyA9IFsuLi4obGFuZXNSZWYuY3VycmVudD8ucXVlcnlTZWxlY3RvckFsbCgnLmFib3V0LWVkaXRvci1jdWVbZGF0YS1jdWUtaWRdJykgfHwgW10pXVxuICAgICAgICAuZmlsdGVyKChub2RlKSA9PiB7XG4gICAgICAgICAgY29uc3QgcmVjdCA9IG5vZGUuZ2V0Qm91bmRpbmdDbGllbnRSZWN0KCk7XG4gICAgICAgICAgY29uc3QgdmlzaWJsZSA9IGxhbmVSZWN0ICYmIHJlY3QucmlnaHQgPj0gbGFuZVJlY3QubGVmdCAmJiByZWN0LmxlZnQgPD0gbGFuZVJlY3QucmlnaHQ7XG4gICAgICAgICAgcmV0dXJuIHZpc2libGUgJiYgcmVjdC5yaWdodCA+PSBzZWxlY3Rpb25SZWN0LmxlZnQgJiYgcmVjdC5sZWZ0IDw9IHNlbGVjdGlvblJlY3QucmlnaHRcbiAgICAgICAgICAgICYmIHJlY3QuYm90dG9tID49IHNlbGVjdGlvblJlY3QudG9wICYmIHJlY3QudG9wIDw9IHNlbGVjdGlvblJlY3QuYm90dG9tO1xuICAgICAgICB9KVxuICAgICAgICAubWFwKChub2RlKSA9PiAoeyB0eXBlOiAnY3VlJywgc2VjdGlvbklkOiBub2RlLmRhdGFzZXQuc2VjdGlvbklkLCBjdWVJZDogbm9kZS5kYXRhc2V0LmN1ZUlkLCBrZXlQYXJ0OiAnZm9jdXMnIH0pKTtcbiAgICAgIGlmIChoaXRzLmxlbmd0aCkge1xuICAgICAgICBsZXQgbmV4dFNlbGVjdGlvbiA9IGRyYWcuYWRkaXRpdmUgPyBzdG9yZS5nZXRTbmFwc2hvdCgpLnNlbGVjdGlvbiA6IGhpdHNbMF07XG4gICAgICAgIGhpdHMuc2xpY2UoZHJhZy5hZGRpdGl2ZSA/IDAgOiAxKS5mb3JFYWNoKChoaXQpID0+IHtcbiAgICAgICAgICBuZXh0U2VsZWN0aW9uID0gdG9nZ2xlQWJvdXROYXJyYXRpdmVDdWVTZWxlY3Rpb24obmV4dFNlbGVjdGlvbiwgaGl0KTtcbiAgICAgICAgfSk7XG4gICAgICAgIHN0b3JlLnNldFNlbGVjdGlvbihuZXh0U2VsZWN0aW9uKTtcbiAgICAgIH1cbiAgICB9XG4gICAgdGltaW5nRHJhZ1JlZi5jdXJyZW50ID0gbnVsbDtcbiAgICBzZXRNYXJxdWVlKG51bGwpO1xuICB9O1xuXG4gIHJldHVybiAoXG4gICAgPGRpdiBjbGFzc05hbWU9XCJhYm91dC1lZGl0b3ItdGltZWxpbmVcIj5cbiAgICAgIDxkaXYgY2xhc3NOYW1lPVwiYWJvdXQtZWRpdG9yLWxhbmUtbGFiZWxzXCIgYXJpYS1oaWRkZW49XCJ0cnVlXCI+XG4gICAgICAgIDxzcGFuPlNlY3Rpb25zPC9zcGFuPjxzcGFuPkNhbWVyYTwvc3Bhbj48c3Bhbj5Xb3JsZDwvc3Bhbj48c3Bhbj5UZXh0PC9zcGFuPjxzcGFuPkludGVyYWN0aW9uPC9zcGFuPlxuICAgICAgPC9kaXY+XG4gICAgICA8ZGl2IHJlZj17bGFuZXNSZWZ9IGNsYXNzTmFtZT1cImFib3V0LWVkaXRvci1sYW5lc1wiIGRhdGEtc29sby10cmFjaz17dHJhbnNwb3J0LnNvbG9UcmFjayB8fCAnJ30gb25XaGVlbD17em9vbVRpbWVsaW5lfT5cbiAgICAgICAgPGRpdiBjbGFzc05hbWU9XCJhYm91dC1lZGl0b3ItdGltZWxpbmUtY2FudmFzXCIgc3R5bGU9e3sgJy0tYWJvdXQtZWRpdG9yLXBsYXloZWFkJzogcGxheWhlYWQsICctLWFib3V0LWVkaXRvci10aW1lbGluZS16b29tJzogTWF0aC5tYXgoMSwgTnVtYmVyKHRyYW5zcG9ydC56b29tKSB8fCAxKSB9fT5cbiAgICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cImFib3V0LWVkaXRvci1wbGF5aGVhZFwiIC8+XG4gICAgICAgICAge21hcnF1ZWUgPyA8ZGl2IGNsYXNzTmFtZT1cImFib3V0LWVkaXRvci1tYXJxdWVlXCIgc3R5bGU9e21hcnF1ZWV9IGFyaWEtaGlkZGVuPVwidHJ1ZVwiIC8+IDogbnVsbH1cbiAgICAgICAgICB7Y2FtZXJhRHJhZ1ByZXZpZXcgPyAoXG4gICAgICAgICAgPGRpdlxuICAgICAgICAgICAgY2xhc3NOYW1lPXtgYWJvdXQtZWRpdG9yLWNhbWVyYS1kcmFnLWdob3N0JHtjYW1lcmFEcmFnUHJldmlldy52YWxpZCA/ICcnIDogJyBpcy1pbnZhbGlkJ31gfVxuICAgICAgICAgICAgc3R5bGU9e3sgbGVmdDogYCR7Y2FtZXJhRHJhZ1ByZXZpZXcuY29udGVudFh9cHhgIH19XG4gICAgICAgICAgICBhcmlhLWhpZGRlbj1cInRydWVcIlxuICAgICAgICAgID5cbiAgICAgICAgICAgIDxpIC8+XG4gICAgICAgICAgICA8c3Bhbj57Y2FtZXJhRHJhZ1ByZXZpZXcudmFsaWQgPyBgJHtjYW1lcmFEcmFnUHJldmlldy5zZWN0aW9uTGFiZWx9IMK3ICR7Zm9ybWF0Q2FtZXJhUGVyY2VudChjYW1lcmFEcmFnUHJldmlldy5hdCl9YCA6IGNhbWVyYURyYWdQcmV2aWV3LnJlYXNvbn08L3NwYW4+XG4gICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgKSA6IG51bGx9XG4gICAgICAgICAge1snc2VjdGlvbicsICdjYW1lcmEnLCAnd29ybGQnLCAndGV4dCcsICdpbnRlcmFjdGlvbiddLm1hcCgobGFuZSkgPT4gKFxuICAgICAgICAgIDxkaXYgY2xhc3NOYW1lPXtgYWJvdXQtZWRpdG9yLWxhbmUgYWJvdXQtZWRpdG9yLWxhbmUtLSR7bGFuZX1gfSBrZXk9e2xhbmV9PlxuICAgICAgICAgICAge2RvY3VtZW50LnNlY3Rpb25zLm1hcCgoc2VjdGlvbiwgc2VjdGlvbkluZGV4KSA9PiB7XG4gICAgICAgICAgICAgIGNvbnN0IGNvbXBpbGVkID0gY29tcGlsZWRQbGFuPy5zZWN0aW9ucz8uW3NlY3Rpb25JbmRleF07XG4gICAgICAgICAgICAgIGNvbnN0IHN0YXJ0V1UgPSBNYXRoLm1pbihtYXhXVSwgY29tcGlsZWQ/LnN0YXJ0V1UgfHwgMCk7XG4gICAgICAgICAgICAgIGNvbnN0IG5leHRTdGFydFdVID0gTWF0aC5taW4obWF4V1UsIGNvbXBpbGVkUGxhbj8uc2VjdGlvbnM/LltzZWN0aW9uSW5kZXggKyAxXT8uc3RhcnRXVSA/PyBtYXhXVSk7XG4gICAgICAgICAgICAgIGNvbnN0IHNwYW5XVSA9IE1hdGgubWF4KDAuMDAxLCBuZXh0U3RhcnRXVSAtIHN0YXJ0V1UpO1xuICAgICAgICAgICAgICBjb25zdCB3aWR0aCA9IGAkeyhzcGFuV1UgLyBtYXhXVSkgKiAxMDB9JWA7XG4gICAgICAgICAgICAgIGNvbnN0IGluU2VsZWN0ZWRTZWN0aW9uID0gc2VsZWN0aW9uLnNlY3Rpb25JZCA9PT0gc2VjdGlvbi5pZDtcbiAgICAgICAgICAgICAgY29uc3QgbG9jYWxQZXJjZW50ID0gKGF0KSA9PiBNYXRoLm1pbigxMDAsIChOdW1iZXIoYXQgfHwgMCkgKiAoY29tcGlsZWQ/LnRyYXZlbFdVIHx8IHNwYW5XVSkgLyBzcGFuV1UpICogMTAwKTtcbiAgICAgICAgICAgICAgY29uc3QgbG9jYWxQb3NpdGlvbiA9IChhdCkgPT4gYCR7bG9jYWxQZXJjZW50KGF0KX0lYDtcbiAgICAgICAgICAgICAgY29uc3QgZXh0ZW5kZWRMb2NhbFBvc2l0aW9uID0gKGF0KSA9PiBgJHsoTnVtYmVyKGF0IHx8IDApICogKGNvbXBpbGVkPy50cmF2ZWxXVSB8fCBzcGFuV1UpIC8gc3BhbldVKSAqIDEwMH0lYDtcbiAgICAgICAgICAgICAgY29uc3QgZXh0ZW5kZWRMb2NhbFdpZHRoID0gKGZyb20sIHRvKSA9PiBgJHtNYXRoLm1heCgwLjM1LCAoTnVtYmVyKHRvKSAtIE51bWJlcihmcm9tKSkgKiAoY29tcGlsZWQ/LnRyYXZlbFdVIHx8IHNwYW5XVSkgLyBzcGFuV1UgKiAxMDApfSVgO1xuICAgICAgICAgICAgICBjb25zdCB0ZXh0UG9zaXRpb24gPSAoYXQpID0+IGAke2NsYW1wMDEoTnVtYmVyKGF0IHx8IDApKSAqIDEwMH0lYDtcbiAgICAgICAgICAgICAgY29uc3Qgc2VsZWN0QXQgPSAobmV4dFNlbGVjdGlvbiwgYXQgPSAwKSA9PiB7XG4gICAgICAgICAgICAgICAgc3RvcmUuc2V0U2VsZWN0aW9uKHsgc2VjdGlvbklkOiBzZWN0aW9uLmlkLCAuLi5uZXh0U2VsZWN0aW9uIH0pO1xuICAgICAgICAgICAgICAgIHN0b3JlLnNldFRyYW5zcG9ydCh7XG4gICAgICAgICAgICAgICAgICBvd25lcjogJ3RpbWVsaW5lJyxcbiAgICAgICAgICAgICAgICAgIHBsYXlpbmc6IGZhbHNlLFxuICAgICAgICAgICAgICAgICAgc3RvcnlXVTogc3RhcnRXVSArIChOdW1iZXIoYXQgfHwgMCkgKiAoY29tcGlsZWQ/LnRyYXZlbFdVIHx8IDApKSxcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgICAgaWYgKGxhbmUgPT09ICdzZWN0aW9uJykge1xuICAgICAgICAgICAgICAgIGNvbnN0IGlzU2VsZWN0ZWQgPSBpblNlbGVjdGVkU2VjdGlvbiAmJiBzZWxlY3Rpb24udHlwZSA9PT0gJ3NlY3Rpb24nO1xuICAgICAgICAgICAgICAgIGNvbnN0IHJlc2l6ZUV4dGVudCA9IHNlY3Rpb25SZXNpemVQcmV2aWV3Py5zZWN0aW9uSWQgPT09IHNlY3Rpb24uaWRcbiAgICAgICAgICAgICAgICAgID8gc2VjdGlvblJlc2l6ZVByZXZpZXcuZXh0ZW50XG4gICAgICAgICAgICAgICAgICA6IE51bWJlcihzZWN0aW9uW2dldEFib3V0TmFycmF0aXZlRXh0ZW50RmllbGQoc25hcHNob3QucHJldmlld1Byb2ZpbGUpXSk7XG4gICAgICAgICAgICAgICAgcmV0dXJuIChcbiAgICAgICAgICAgICAgICAgIDxkaXZcbiAgICAgICAgICAgICAgICAgICAga2V5PXtzZWN0aW9uLmlkfVxuICAgICAgICAgICAgICAgICAgICBjbGFzc05hbWU9e2BhYm91dC1lZGl0b3Itc2VjdGlvbi1jbGlwJHtpc1NlbGVjdGVkID8gJyBpcy1zZWxlY3RlZCcgOiAnJ30ke2luU2VsZWN0ZWRTZWN0aW9uID8gJyBpcy1jb250ZXh0JyA6ICcnfWB9XG4gICAgICAgICAgICAgICAgICAgIHN0eWxlPXt7IHdpZHRoIH19XG4gICAgICAgICAgICAgICAgICAgIHRpdGxlPXtgJHtzZWN0aW9uLmxhYmVsfSDCtyAke2Zvcm1hdFdVKGNvbXBpbGVkPy5yZXNvbHZlZEV4dGVudFdVIHx8IHNlY3Rpb24uZXh0ZW50V1UpfWB9XG4gICAgICAgICAgICAgICAgICA+XG4gICAgICAgICAgICAgICAgICAgIDxidXR0b24gdHlwZT1cImJ1dHRvblwiIGFyaWEtcHJlc3NlZD17aXNTZWxlY3RlZH0gb25DbGljaz17KCkgPT4gc2VsZWN0QXQoeyB0eXBlOiAnc2VjdGlvbicgfSl9PlxuICAgICAgICAgICAgICAgICAgICAgIDxzcGFuPntTdHJpbmcoc2VjdGlvbkluZGV4ICsgMSkucGFkU3RhcnQoMiwgJzAnKX08L3NwYW4+e3NlY3Rpb24ubGFiZWx9XG4gICAgICAgICAgICAgICAgICAgIDwvYnV0dG9uPlxuICAgICAgICAgICAgICAgICAgICB7c2VjdGlvblJlc2l6ZVByZXZpZXc/LnNlY3Rpb25JZCA9PT0gc2VjdGlvbi5pZCA/IDxvdXRwdXQ+e2Zvcm1hdFdVKE1hdGgubWF4KDAsIHJlc2l6ZUV4dGVudCAtIDEpKX0gc2Nyb2xsIMK3IHtmb3JtYXRXVShyZXNpemVFeHRlbnQpfSB0b3RhbDwvb3V0cHV0PiA6IG51bGx9XG4gICAgICAgICAgICAgICAgICAgIDxidXR0b25cbiAgICAgICAgICAgICAgICAgICAgICB0eXBlPVwiYnV0dG9uXCJcbiAgICAgICAgICAgICAgICAgICAgICBjbGFzc05hbWU9XCJhYm91dC1lZGl0b3Itc2VjdGlvbi1yZXNpemVcIlxuICAgICAgICAgICAgICAgICAgICAgIGRpc2FibGVkPXtzZWN0aW9uLmxvY2tlZH1cbiAgICAgICAgICAgICAgICAgICAgICBhcmlhLWxhYmVsPXtgUmVzaXplICR7c2VjdGlvbi5sYWJlbH1gfVxuICAgICAgICAgICAgICAgICAgICAgIHRpdGxlPXtzZWN0aW9uLmxvY2tlZCA/ICdVbmxvY2sgdGhpcyBwcm90ZWN0ZWQgU2VjdGlvbiB0byByZXNpemUgaXQnIDogYERyYWcgdG8gY2hhbmdlICR7c25hcHNob3QucHJldmlld1Byb2ZpbGUgPT09ICdtb2JpbGUnID8gJ21vYmlsZScgOiAnZGVza3RvcCd9IHNjcm9sbCBsZW5ndGggwrcgZG91YmxlLWNsaWNrIHRvIHJlc3RvcmUgc2F2ZWQgbGVuZ3RoYH1cbiAgICAgICAgICAgICAgICAgICAgICBvbkRvdWJsZUNsaWNrPXsoZXZlbnQpID0+IHsgZXZlbnQucHJldmVudERlZmF1bHQoKTsgZXZlbnQuc3RvcFByb3BhZ2F0aW9uKCk7IHJlc2V0U2VjdGlvbkV4dGVudChzZWN0aW9uLmlkLCBzZWN0aW9uSW5kZXgpOyB9fVxuICAgICAgICAgICAgICAgICAgICAgIG9uUG9pbnRlckRvd249eyhldmVudCkgPT4gYmVnaW5TZWN0aW9uUmVzaXplKGV2ZW50LCB7IHNlY3Rpb25JZDogc2VjdGlvbi5pZCwgc2VjdGlvbkluZGV4LCBzZWN0aW9uTGFiZWw6IHNlY3Rpb24ubGFiZWwsIGxvY2tlZDogc2VjdGlvbi5sb2NrZWQgfSl9XG4gICAgICAgICAgICAgICAgICAgICAgb25Qb2ludGVyTW92ZT17bW92ZVNlY3Rpb25SZXNpemV9XG4gICAgICAgICAgICAgICAgICAgICAgb25Qb2ludGVyVXA9e2VuZFNlY3Rpb25SZXNpemV9XG4gICAgICAgICAgICAgICAgICAgICAgb25Qb2ludGVyQ2FuY2VsPXtlbmRTZWN0aW9uUmVzaXplfVxuICAgICAgICAgICAgICAgICAgICAvPlxuICAgICAgICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgICAgICAgKTtcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICBpZiAobGFuZSA9PT0gJ2NhbWVyYScpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gKFxuICAgICAgICAgICAgICAgICAgPGRpdiBjbGFzc05hbWU9XCJhYm91dC1lZGl0b3ItY2xpcFwiIGtleT17c2VjdGlvbi5pZH0gc3R5bGU9e3sgd2lkdGggfX0+XG4gICAgICAgICAgICAgICAgICAgIDxkaXYgY2xhc3NOYW1lPVwiYWJvdXQtZWRpdG9yLWNhbWVyYS1yYWlsXCIgYXJpYS1oaWRkZW49XCJ0cnVlXCI+XG4gICAgICAgICAgICAgICAgICAgICAge3NlY3Rpb24uY2FtZXJhLmtleXMuc2xpY2UoMSkubWFwKChrZXksIGtleUluZGV4KSA9PiB7XG4gICAgICAgICAgICAgICAgICAgICAgICBjb25zdCBmcm9tS2V5ID0gc2VjdGlvbi5jYW1lcmEua2V5c1trZXlJbmRleF07XG4gICAgICAgICAgICAgICAgICAgICAgICBjb25zdCBsZWZ0ID0gbG9jYWxQZXJjZW50KGZyb21LZXkuYXQpO1xuICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgcmlnaHQgPSBsb2NhbFBlcmNlbnQoa2V5LmF0KTtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiAoXG4gICAgICAgICAgICAgICAgICAgICAgICAgIDxzcGFuXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY2xhc3NOYW1lPXtjYW1lcmFQb3NlQ2hhbmdlcyhmcm9tS2V5LCBrZXkpID8gJ2lzLWF1dGhvcmVkLW1vdGlvbicgOiAnaXMtYmFzZS1kb2xseSd9XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAga2V5PXtgJHtzZWN0aW9uLmlkfTpjYW1lcmEtc3Bhbjoke2tleUluZGV4fWB9XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgc3R5bGU9e3sgbGVmdDogYCR7bGVmdH0lYCwgd2lkdGg6IGAke01hdGgubWF4KDAuNSwgcmlnaHQgLSBsZWZ0KX0lYCB9fVxuICAgICAgICAgICAgICAgICAgICAgICAgICAvPlxuICAgICAgICAgICAgICAgICAgICAgICAgKTtcbiAgICAgICAgICAgICAgICAgICAgICB9KX1cbiAgICAgICAgICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgICAgICAgICAgIHtzZWN0aW9uLmNhbWVyYS5rZXlzLm1hcCgoa2V5LCBrZXlJbmRleCkgPT4ge1xuICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IHRpbWluZ0JvdW5kcyA9IGdldEFib3V0TmFycmF0aXZlQ2FtZXJhS2V5VGltaW5nQm91bmRzKHNlY3Rpb24uY2FtZXJhLmtleXMsIGtleUluZGV4KTtcbiAgICAgICAgICAgICAgICAgICAgICBjb25zdCB0b2tlbiA9IGBjYW1lcmE6JHtzZWN0aW9uLmlkfToke2tleUluZGV4fWA7XG4gICAgICAgICAgICAgICAgICAgICAgY29uc3Qga2V5U2VsZWN0aW9uID0geyB0eXBlOiAnY2FtZXJhLWtleScsIHNlY3Rpb25JZDogc2VjdGlvbi5pZCwga2V5SW5kZXggfTtcbiAgICAgICAgICAgICAgICAgICAgICBjb25zdCBpc1NlbGVjdGVkID0gaW5TZWxlY3RlZFNlY3Rpb24gJiYgc2VsZWN0aW9uLnR5cGUgPT09ICdjYW1lcmEta2V5JyAmJiBzZWxlY3Rpb24ua2V5SW5kZXggPT09IGtleUluZGV4O1xuICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IHJlcXVpcmVkID0gdGltaW5nQm91bmRzLmxvY2tlZDtcbiAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gKFxuICAgICAgICAgICAgICAgICAgICAgICAgPGJ1dHRvblxuICAgICAgICAgICAgICAgICAgICAgICAgICB0eXBlPVwiYnV0dG9uXCJcbiAgICAgICAgICAgICAgICAgICAgICAgICAga2V5PXt0b2tlbn1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgY2xhc3NOYW1lPXtgYWJvdXQtZWRpdG9yLWtleSR7cmVxdWlyZWQgPyAnIGlzLWJvdW5kYXJ5JyA6ICcgaXMtZHJhZ2dhYmxlJ30ke2lzU2VsZWN0ZWQgPyAnIGlzLXNlbGVjdGVkJyA6ICcnfSR7Y2FtZXJhRHJhZ1ByZXZpZXc/LnRva2VuID09PSB0b2tlbiA/ICcgaXMtZHJhZy1zb3VyY2UnIDogJyd9YH1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgc3R5bGU9e3sgbGVmdDogbG9jYWxQb3NpdGlvbihrZXkuYXQpIH19XG4gICAgICAgICAgICAgICAgICAgICAgICAgIHRpdGxlPXtyZXF1aXJlZFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgID8gYFByb3RlY3RlZCBDYW1lcmEga2V5IGF0ICR7Zm9ybWF0Q2FtZXJhUGVyY2VudChrZXkuYXQpfSDCtyBzZWxlY3QgdG8gaW5zcGVjdGBcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICA6IGBDYW1lcmEga2V5IGF0ICR7Zm9ybWF0Q2FtZXJhUGVyY2VudChrZXkuYXQpfSDCtyBkcmFnIGFueXdoZXJlIG9uIHRoZSBDYW1lcmEgdHJhY2tgfVxuICAgICAgICAgICAgICAgICAgICAgICAgICBhcmlhLWxhYmVsPXtgJHtyZXF1aXJlZCA/ICdQcm90ZWN0ZWQgJyA6ICcnfUNhbWVyYSBrZXkgYXQgJHtmb3JtYXRDYW1lcmFQZXJjZW50KGtleS5hdCl9IHRocm91Z2ggJHtzZWN0aW9uLmxhYmVsfWB9XG4gICAgICAgICAgICAgICAgICAgICAgICAgIGFyaWEtcHJlc3NlZD17aXNTZWxlY3RlZH1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgb25Qb2ludGVyRG93bj17cmVxdWlyZWQgPyB1bmRlZmluZWQgOiAoZXZlbnQpID0+IGJlZ2luVGltaW5nRHJhZyhldmVudCwge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHR5cGU6ICdjYW1lcmEnLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRva2VuLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGxvY2tlZDogZmFsc2UsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgYXQ6IGtleS5hdCxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBzZWN0aW9uSW5kZXgsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAga2V5SW5kZXgsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgc2VjdGlvblN0YXJ0V1U6IHN0YXJ0V1UsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgc3BhbldVLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRyYXZlbFdVOiBjb21waWxlZD8udHJhdmVsV1UgfHwgc3BhbldVLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHN0b3J5V1U6IHN0YXJ0V1UgKyAoTnVtYmVyKGtleS5hdCkgKiAoY29tcGlsZWQ/LnRyYXZlbFdVIHx8IDApKSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBzZWxlY3Rpb246IGtleVNlbGVjdGlvbixcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb2FsZXNjZUtleTogYHRpbWVsaW5lOiR7dG9rZW59YCxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgfSl9XG4gICAgICAgICAgICAgICAgICAgICAgICAgIG9uUG9pbnRlck1vdmU9e3JlcXVpcmVkID8gdW5kZWZpbmVkIDogbW92ZVRpbWluZ0RyYWd9XG4gICAgICAgICAgICAgICAgICAgICAgICAgIG9uUG9pbnRlclVwPXtyZXF1aXJlZCA/IHVuZGVmaW5lZCA6IGVuZFRpbWluZ0RyYWd9XG4gICAgICAgICAgICAgICAgICAgICAgICAgIG9uUG9pbnRlckNhbmNlbD17cmVxdWlyZWQgPyB1bmRlZmluZWQgOiBlbmRUaW1pbmdEcmFnfVxuICAgICAgICAgICAgICAgICAgICAgICAgICBvbkNsaWNrPXsoKSA9PiBoYW5kbGVUaW1pbmdDbGljayh0b2tlbiwgKCkgPT4gc2VsZWN0QXQoeyB0eXBlOiAnY2FtZXJhLWtleScsIGtleUluZGV4IH0sIGtleS5hdCkpfVxuICAgICAgICAgICAgICAgICAgICAgICAgLz5cbiAgICAgICAgICAgICAgICAgICAgICApO1xuICAgICAgICAgICAgICAgICAgICB9KX1cbiAgICAgICAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgICAgICk7XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgaWYgKGxhbmUgPT09ICd3b3JsZCcpIHtcbiAgICAgICAgICAgICAgICBjb25zdCBpc1NlbGVjdGVkID0gaW5TZWxlY3RlZFNlY3Rpb24gJiYgc2VsZWN0aW9uLnR5cGUgPT09ICd3b3JsZCc7XG4gICAgICAgICAgICAgICAgY29uc3QgdHJhbnNpdGlvbiA9IHNlY3Rpb24ud29ybGQubW9kZSA9PT0gJ3NldCcgJiYgc2VjdGlvbi53b3JsZC50cmFuc2l0aW9uSW4udHlwZSAhPT0gJ2N1dCdcbiAgICAgICAgICAgICAgICAgID8gc2VjdGlvbi53b3JsZC50cmFuc2l0aW9uSW5cbiAgICAgICAgICAgICAgICAgIDogbnVsbDtcbiAgICAgICAgICAgICAgICByZXR1cm4gKFxuICAgICAgICAgICAgICAgICAgPGRpdiBjbGFzc05hbWU9e2BhYm91dC1lZGl0b3ItY2xpcCR7aXNTZWxlY3RlZCA/ICcgaXMtc2VsZWN0ZWQnIDogJyd9YH0ga2V5PXtzZWN0aW9uLmlkfSBzdHlsZT17eyB3aWR0aCB9fT5cbiAgICAgICAgICAgICAgICAgICAgPGJ1dHRvblxuICAgICAgICAgICAgICAgICAgICAgIHR5cGU9XCJidXR0b25cIlxuICAgICAgICAgICAgICAgICAgICAgIGNsYXNzTmFtZT17YGFib3V0LWVkaXRvci13b3JsZC1jbGlwICR7c2VjdGlvbi53b3JsZC5tb2RlID09PSAnc2V0JyA/ICdoYXMtd29ybGQnIDogJyd9JHtpc1NlbGVjdGVkID8gJyBpcy1zZWxlY3RlZCcgOiAnJ31gfVxuICAgICAgICAgICAgICAgICAgICAgIGFyaWEtcHJlc3NlZD17aXNTZWxlY3RlZH1cbiAgICAgICAgICAgICAgICAgICAgICBvbkNsaWNrPXsoKSA9PiBzZWxlY3RBdCh7IHR5cGU6ICd3b3JsZCcgfSwgdHJhbnNpdGlvbiA/IHRyYW5zaXRpb24uZW5kIDogMCl9XG4gICAgICAgICAgICAgICAgICAgID57c2VjdGlvbi53b3JsZC5tb2RlID09PSAnc2V0JyA/IHNlY3Rpb24ud29ybGQuc2hhcGVJZC5yZXBsYWNlKCctdjEnLCAnJykgOiAnY29udGludWUnfTwvYnV0dG9uPlxuICAgICAgICAgICAgICAgICAgICB7dHJhbnNpdGlvbiA/IFsnc3RhcnQnLCAnZW5kJ10ubWFwKChwYXJ0KSA9PiAoXG4gICAgICAgICAgICAgICAgICAgICAgPGJ1dHRvblxuICAgICAgICAgICAgICAgICAgICAgICAgdHlwZT1cImJ1dHRvblwiXG4gICAgICAgICAgICAgICAgICAgICAgICBrZXk9e3BhcnR9XG4gICAgICAgICAgICAgICAgICAgICAgICBjbGFzc05hbWU9e2BhYm91dC1lZGl0b3ItdGltaW5nLWtleSBpcy13b3JsZCR7aXNTZWxlY3RlZCAmJiBzZWxlY3Rpb24ua2V5UGFydCA9PT0gYHRyYW5zaXRpb24tJHtwYXJ0fWAgPyAnIGlzLXNlbGVjdGVkJyA6ICcnfWB9XG4gICAgICAgICAgICAgICAgICAgICAgICBzdHlsZT17eyBsZWZ0OiBleHRlbmRlZExvY2FsUG9zaXRpb24odHJhbnNpdGlvbltwYXJ0XSkgfX1cbiAgICAgICAgICAgICAgICAgICAgICAgIHRpdGxlPXtgV29ybGQgdHJhbnNpdGlvbiAke3BhcnR9YH1cbiAgICAgICAgICAgICAgICAgICAgICAgIGFyaWEtbGFiZWw9e2Ake3NlY3Rpb24ubGFiZWx9IFdvcmxkIHRyYW5zaXRpb24gJHtwYXJ0fWB9XG4gICAgICAgICAgICAgICAgICAgICAgICBvbkNsaWNrPXsoKSA9PiBzZWxlY3RBdCh7IHR5cGU6ICd3b3JsZCcsIGtleVBhcnQ6IGB0cmFuc2l0aW9uLSR7cGFydH1gIH0sIHRyYW5zaXRpb25bcGFydF0pfVxuICAgICAgICAgICAgICAgICAgICAgIC8+XG4gICAgICAgICAgICAgICAgICAgICkpIDogbnVsbH1cbiAgICAgICAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgICAgICk7XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgaWYgKGxhbmUgPT09ICd0ZXh0Jykge1xuICAgICAgICAgICAgICAgIHJldHVybiAoXG4gICAgICAgICAgICAgICAgICA8ZGl2XG4gICAgICAgICAgICAgICAgICAgIGNsYXNzTmFtZT17YGFib3V0LWVkaXRvci1jbGlwJHtzZWN0aW9uLnRleHQuZGlzY2lwbGluZVJldmVhbCA/ICcgaGFzLWV4dGVuZGVkLWRpc2NpcGxpbmUnIDogJyd9YH1cbiAgICAgICAgICAgICAgICAgICAga2V5PXtzZWN0aW9uLmlkfVxuICAgICAgICAgICAgICAgICAgICBzdHlsZT17eyB3aWR0aCB9fVxuICAgICAgICAgICAgICAgICAgICBvblBvaW50ZXJEb3duPXtiZWdpbk1hcnF1ZWV9XG4gICAgICAgICAgICAgICAgICAgIG9uUG9pbnRlck1vdmU9e21vdmVNYXJxdWVlfVxuICAgICAgICAgICAgICAgICAgICBvblBvaW50ZXJVcD17ZW5kTWFycXVlZX1cbiAgICAgICAgICAgICAgICAgICAgb25Qb2ludGVyQ2FuY2VsPXtlbmRNYXJxdWVlfVxuICAgICAgICAgICAgICAgICAgPlxuICAgICAgICAgICAgICAgICAgICB7KHNlY3Rpb24udGV4dC5jdWVzIHx8IFtdKS5tYXAoKGN1ZSkgPT4ge1xuICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IGlzU2VsZWN0ZWQgPSBzZWxlY3RlZEN1ZU1lbWJlcnMuc29tZSgobWVtYmVyKSA9PiBtZW1iZXIuc2VjdGlvbklkID09PSBzZWN0aW9uLmlkICYmIG1lbWJlci5jdWVJZCA9PT0gY3VlLmlkKTtcbiAgICAgICAgICAgICAgICAgICAgICBjb25zdCBpc1ByaW1hcnkgPSBzZWxlY3Rpb24udHlwZSA9PT0gJ2N1ZScgJiYgc2VsZWN0aW9uLnNlY3Rpb25JZCA9PT0gc2VjdGlvbi5pZCAmJiBzZWxlY3Rpb24uY3VlSWQgPT09IGN1ZS5pZDtcbiAgICAgICAgICAgICAgICAgICAgICBjb25zdCBtb3ZlbWVudCA9IGdldEFib3V0TmFycmF0aXZlQ3VlTW92ZW1lbnQoY3VlKTtcbiAgICAgICAgICAgICAgICAgICAgICBjb25zdCB0aW1pbmdCb3VuZHMgPSBnZXRBYm91dE5hcnJhdGl2ZUN1ZVRpbWluZ0JvdW5kcyhjdWUpO1xuICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IHRva2VuID0gYGN1ZToke3NlY3Rpb24uaWR9OiR7Y3VlLmlkfWA7XG4gICAgICAgICAgICAgICAgICAgICAgY29uc3QgY3VlU2VsZWN0aW9uID0geyB0eXBlOiAnY3VlJywgc2VjdGlvbklkOiBzZWN0aW9uLmlkLCBjdWVJZDogY3VlLmlkLCBrZXlQYXJ0OiAnZm9jdXMnIH07XG4gICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIChcbiAgICAgICAgICAgICAgICAgICAgICAgIDxidXR0b25cbiAgICAgICAgICAgICAgICAgICAgICAgICAgdHlwZT1cImJ1dHRvblwiXG4gICAgICAgICAgICAgICAgICAgICAgICAgIGNsYXNzTmFtZT17YGFib3V0LWVkaXRvci1jdWUgaXMtJHttb3ZlbWVudH0ke3RpbWluZ0JvdW5kcy5taW4gPT09IHRpbWluZ0JvdW5kcy5tYXggPyAnIGlzLWJvdW5kYXJ5JyA6ICcgaXMtZHJhZ2dhYmxlJ30ke2lzU2VsZWN0ZWQgPyAnIGlzLXNlbGVjdGVkJyA6ICcnfSR7aXNQcmltYXJ5ID8gJyBpcy1wcmltYXJ5LXNlbGVjdGlvbicgOiAnJ31gfVxuICAgICAgICAgICAgICAgICAgICAgICAgICBrZXk9e2N1ZS5pZH1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgZGF0YS1zZWN0aW9uLWlkPXtzZWN0aW9uLmlkfVxuICAgICAgICAgICAgICAgICAgICAgICAgICBkYXRhLWN1ZS1pZD17Y3VlLmlkfVxuICAgICAgICAgICAgICAgICAgICAgICAgICBzdHlsZT17eyBsZWZ0OiB0ZXh0UG9zaXRpb24oY3VlLmhvbGQpIH19XG4gICAgICAgICAgICAgICAgICAgICAgICAgIGFyaWEtbGFiZWw9e2Ake21vdmVtZW50ID09PSAndmVydGljYWwnID8gJ1ZlcnRpY2FsJyA6ICdTcGF0aWFsJ30gdGV4dCBhdCAke01hdGgucm91bmQoY3VlLmhvbGQgKiAxMDApfSUgwrcgJHtjdWUudGV4dH1gfVxuICAgICAgICAgICAgICAgICAgICAgICAgICBhcmlhLXByZXNzZWQ9e2lzU2VsZWN0ZWR9XG4gICAgICAgICAgICAgICAgICAgICAgICAgIHRpdGxlPXtgJHttb3ZlbWVudCA9PT0gJ3ZlcnRpY2FsJyA/ICdWZXJ0aWNhbCcgOiAnU3BhdGlhbCd9IHRpdGxlIMK3IGRyYWcgdG8gbW92ZSBpdDsgZHVyYXRpb24gc3RheXMgZ2xvYmFsIMK3ICR7Y3VlLnRleHR9YH1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgb25Qb2ludGVyRG93bj17KGV2ZW50KSA9PiBiZWdpblRpbWluZ0RyYWcoZXZlbnQsIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0eXBlOiAnY3VlJyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0b2tlbixcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBsb2NrZWQ6IHRpbWluZ0JvdW5kcy5taW4gPT09IHRpbWluZ0JvdW5kcy5tYXgsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgbWluOiB0aW1pbmdCb3VuZHMubWluLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIG1heDogdGltaW5nQm91bmRzLm1heCxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBhdDogY3VlLmhvbGQsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgc2VjdGlvbkluZGV4LFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGN1ZUlkOiBjdWUuaWQsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgc2VjdGlvblN0YXJ0V1U6IHN0YXJ0V1UsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgc3BhbldVLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRyYXZlbFdVOiBjb21waWxlZD8udHJhdmVsV1UgfHwgc3BhbldVLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHN0b3J5V1U6IHN0YXJ0V1UgKyAoTnVtYmVyKGN1ZS5ob2xkKSAqIChjb21waWxlZD8udHJhdmVsV1UgfHwgMCkpLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHNlbGVjdGlvbjogY3VlU2VsZWN0aW9uLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvYWxlc2NlS2V5OiBgdGltZWxpbmU6JHt0b2tlbn1gLFxuICAgICAgICAgICAgICAgICAgICAgICAgICB9KX1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgb25Qb2ludGVyTW92ZT17bW92ZVRpbWluZ0RyYWd9XG4gICAgICAgICAgICAgICAgICAgICAgICAgIG9uUG9pbnRlclVwPXtlbmRUaW1pbmdEcmFnfVxuICAgICAgICAgICAgICAgICAgICAgICAgICBvblBvaW50ZXJDYW5jZWw9e2VuZFRpbWluZ0RyYWd9XG4gICAgICAgICAgICAgICAgICAgICAgICAgIG9uS2V5RG93bj17KGV2ZW50KSA9PiB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGV2ZW50LnNoaWZ0S2V5ICYmIGV2ZW50LmNvZGUgPT09ICdTcGFjZScpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGV2ZW50LnByZXZlbnREZWZhdWx0KCk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zdCBuZXh0U2VsZWN0aW9uID0gdG9nZ2xlQWJvdXROYXJyYXRpdmVDdWVTZWxlY3Rpb24oc3RvcmUuZ2V0U25hcHNob3QoKS5zZWxlY3Rpb24sIGN1ZVNlbGVjdGlvbik7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICBzdG9yZS5zZXRTZWxlY3Rpb24obmV4dFNlbGVjdGlvbik7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICBzdG9yZS5zZXRUcmFuc3BvcnQoeyBvd25lcjogJ3RpbWVsaW5lJywgcGxheWluZzogZmFsc2UsIHN0b3J5V1U6IHN0YXJ0V1UgKyAoTnVtYmVyKGN1ZS5ob2xkKSAqIChjb21waWxlZD8udHJhdmVsV1UgfHwgMCkpIH0pO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgfX1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgb25DbGljaz17KCkgPT4gaGFuZGxlVGltaW5nQ2xpY2sodG9rZW4sICgpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBzdG9yZS5zZXRUcmFuc3BvcnQoeyBvd25lcjogJ3RpbWVsaW5lJywgcGxheWluZzogZmFsc2UsIHN0b3J5V1U6IHN0YXJ0V1UgKyAoTnVtYmVyKGN1ZS5ob2xkKSAqIChjb21waWxlZD8udHJhdmVsV1UgfHwgMCkpIH0pO1xuICAgICAgICAgICAgICAgICAgICAgICAgICB9KX1cbiAgICAgICAgICAgICAgICAgICAgICAgIC8+XG4gICAgICAgICAgICAgICAgICAgICAgKTtcbiAgICAgICAgICAgICAgICAgICAgfSl9XG4gICAgICAgICAgICAgICAgICAgIHtzZWN0aW9uLnRleHQuZGlzY2lwbGluZVJldmVhbCA/ICgoKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgICAgY29uc3QgcmV2ZWFsID0gc2VjdGlvbi50ZXh0LmRpc2NpcGxpbmVSZXZlYWw7XG4gICAgICAgICAgICAgICAgICAgICAgY29uc3QgZHVyYXRpb24gPSByZXZlYWwuZW5kIC0gcmV2ZWFsLnN0YXJ0O1xuICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IGNlbnRyZSA9IHJldmVhbC5zdGFydCArIChkdXJhdGlvbiAqIDAuNSk7XG4gICAgICAgICAgICAgICAgICAgICAgY29uc3QgaXNTZWxlY3RlZCA9IGluU2VsZWN0ZWRTZWN0aW9uICYmIHNlbGVjdGlvbi50eXBlID09PSAnZGlzY2lwbGluZS1yZXZlYWwnO1xuICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IHRva2VuID0gYGRpc2NpcGxpbmUtcmV2ZWFsOiR7c2VjdGlvbi5pZH06JHtyZXZlYWwuaWR9YDtcbiAgICAgICAgICAgICAgICAgICAgICBjb25zdCByZXZlYWxTZWxlY3Rpb24gPSB7IHR5cGU6ICdkaXNjaXBsaW5lLXJldmVhbCcsIHNlY3Rpb25JZDogc2VjdGlvbi5pZCB9O1xuICAgICAgICAgICAgICAgICAgICAgIHJldHVybiAoXG4gICAgICAgICAgICAgICAgICAgICAgICA8YnV0dG9uXG4gICAgICAgICAgICAgICAgICAgICAgICAgIHR5cGU9XCJidXR0b25cIlxuICAgICAgICAgICAgICAgICAgICAgICAgICBjbGFzc05hbWU9e2BhYm91dC1lZGl0b3ItZGlzY2lwbGluZS1yZXZlYWwgaXMtZHJhZ2dhYmxlJHtpc1NlbGVjdGVkID8gJyBpcy1zZWxlY3RlZCcgOiAnJ31gfVxuICAgICAgICAgICAgICAgICAgICAgICAgICBzdHlsZT17eyBsZWZ0OiBleHRlbmRlZExvY2FsUG9zaXRpb24ocmV2ZWFsLnN0YXJ0KSwgd2lkdGg6IGV4dGVuZGVkTG9jYWxXaWR0aChyZXZlYWwuc3RhcnQsIHJldmVhbC5lbmQpIH19XG4gICAgICAgICAgICAgICAgICAgICAgICAgIGFyaWEtbGFiZWw9e2BEaXNjaXBsaW5lIHJldmVhbCBmcm9tICR7TWF0aC5yb3VuZChyZXZlYWwuc3RhcnQgKiAxMDApfSUgdG8gJHtNYXRoLnJvdW5kKHJldmVhbC5lbmQgKiAxMDApfSVgfVxuICAgICAgICAgICAgICAgICAgICAgICAgICBhcmlhLXByZXNzZWQ9e2lzU2VsZWN0ZWR9XG4gICAgICAgICAgICAgICAgICAgICAgICAgIHRpdGxlPVwiRGlzY2lwbGluZSByZXZlYWwgwrcgZHJhZyB0aGUgY29tcGxldGUgY2xpcCB0byByZXRpbWVcIlxuICAgICAgICAgICAgICAgICAgICAgICAgICBvblBvaW50ZXJEb3duPXsoZXZlbnQpID0+IGJlZ2luVGltaW5nRHJhZyhldmVudCwge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHR5cGU6ICdkaXNjaXBsaW5lLXJldmVhbCcsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdG9rZW4sXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgbG9ja2VkOiBmYWxzZSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBtaW46IGR1cmF0aW9uICogMC41LFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIG1heDogRElTQ0lQTElORV9SRVZFQUxfTUFYIC0gKGR1cmF0aW9uICogMC41KSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBhdDogY2VudHJlLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHNlY3Rpb25JbmRleCxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBzZWN0aW9uU3RhcnRXVTogc3RhcnRXVSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBzcGFuV1UsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdHJhdmVsV1U6IGNvbXBpbGVkPy50cmF2ZWxXVSB8fCBzcGFuV1UsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgc3RvcnlXVTogc3RhcnRXVSArIChjZW50cmUgKiAoY29tcGlsZWQ/LnRyYXZlbFdVIHx8IDApKSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBzZWxlY3Rpb246IHJldmVhbFNlbGVjdGlvbixcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb2FsZXNjZUtleTogYHRpbWVsaW5lOiR7dG9rZW59YCxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgfSl9XG4gICAgICAgICAgICAgICAgICAgICAgICAgIG9uUG9pbnRlck1vdmU9e21vdmVUaW1pbmdEcmFnfVxuICAgICAgICAgICAgICAgICAgICAgICAgICBvblBvaW50ZXJVcD17ZW5kVGltaW5nRHJhZ31cbiAgICAgICAgICAgICAgICAgICAgICAgICAgb25Qb2ludGVyQ2FuY2VsPXtlbmRUaW1pbmdEcmFnfVxuICAgICAgICAgICAgICAgICAgICAgICAgICBvbkNsaWNrPXsoKSA9PiBoYW5kbGVUaW1pbmdDbGljayh0b2tlbiwgKCkgPT4gc2VsZWN0QXQoeyB0eXBlOiAnZGlzY2lwbGluZS1yZXZlYWwnIH0sIHJldmVhbC5zdGFydCkpfVxuICAgICAgICAgICAgICAgICAgICAgICAgPkRpc2NpcGxpbmUgcmV2ZWFsPC9idXR0b24+XG4gICAgICAgICAgICAgICAgICAgICAgKTtcbiAgICAgICAgICAgICAgICAgICAgfSkoKSA6IG51bGx9XG4gICAgICAgICAgICAgICAgICAgIHsoc2VjdGlvbi50ZXh0LmJsb2NrcyB8fCBbXSkubGVuZ3RoID8gKFxuICAgICAgICAgICAgICAgICAgICAgIDxidXR0b24gdHlwZT1cImJ1dHRvblwiIGNsYXNzTmFtZT17YGFib3V0LWVkaXRvci1lZGl0b3JpYWwtY2xpcCR7aW5TZWxlY3RlZFNlY3Rpb24gJiYgc2VsZWN0aW9uLnR5cGUgPT09ICdzZWN0aW9uJyA/ICcgaXMtc2VsZWN0ZWQnIDogJyd9YH0gb25DbGljaz17KCkgPT4gc2VsZWN0QXQoeyB0eXBlOiAnc2VjdGlvbicgfSl9PlxuICAgICAgICAgICAgICAgICAgICAgICAgVmVydGljYWwgwrcge3NlY3Rpb24udGV4dC5ibG9ja3MubGVuZ3RofSBibG9ja3NcbiAgICAgICAgICAgICAgICAgICAgICA8L2J1dHRvbj5cbiAgICAgICAgICAgICAgICAgICAgKSA6IG51bGx9XG4gICAgICAgICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgICAgICApO1xuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgIGNvbnN0IGlzU2VsZWN0ZWQgPSBpblNlbGVjdGVkU2VjdGlvbiAmJiBzZWxlY3Rpb24udHlwZSA9PT0gJ2ludGVyYWN0aW9uJztcbiAgICAgICAgICAgICAgY29uc3QgYWN0aXZhdGlvbiA9IHNlY3Rpb24uaW50ZXJhY3Rpb24/LnR5cGUgIT09ICdub25lJyA/IHNlY3Rpb24uaW50ZXJhY3Rpb24uYWN0aXZhdGlvblN0YXJ0IDogbnVsbDtcbiAgICAgICAgICAgICAgcmV0dXJuIChcbiAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzTmFtZT17YGFib3V0LWVkaXRvci1jbGlwJHtpc1NlbGVjdGVkID8gJyBpcy1zZWxlY3RlZCcgOiAnJ31gfSBrZXk9e3NlY3Rpb24uaWR9IHN0eWxlPXt7IHdpZHRoIH19PlxuICAgICAgICAgICAgICAgICAgPGJ1dHRvblxuICAgICAgICAgICAgICAgICAgICB0eXBlPVwiYnV0dG9uXCJcbiAgICAgICAgICAgICAgICAgICAgY2xhc3NOYW1lPXtgYWJvdXQtZWRpdG9yLWludGVyYWN0aW9uLWNsaXAgJHtzZWN0aW9uLmludGVyYWN0aW9uPy50eXBlICE9PSAnbm9uZScgPyAnaGFzLWludGVyYWN0aW9uJyA6ICcnfSR7aXNTZWxlY3RlZCA/ICcgaXMtc2VsZWN0ZWQnIDogJyd9YH1cbiAgICAgICAgICAgICAgICAgICAgYXJpYS1wcmVzc2VkPXtpc1NlbGVjdGVkfVxuICAgICAgICAgICAgICAgICAgICBvbkNsaWNrPXsoKSA9PiBzZWxlY3RBdCh7IHR5cGU6ICdpbnRlcmFjdGlvbicgfSwgYWN0aXZhdGlvbiB8fCAwKX1cbiAgICAgICAgICAgICAgICAgID57c2VjdGlvbi5pbnRlcmFjdGlvbj8udHlwZSAhPT0gJ25vbmUnID8gc2VjdGlvbi5pbnRlcmFjdGlvbi50eXBlIDogJyd9PC9idXR0b24+XG4gICAgICAgICAgICAgICAgICB7TnVtYmVyLmlzRmluaXRlKGFjdGl2YXRpb24pID8gKFxuICAgICAgICAgICAgICAgICAgICA8YnV0dG9uXG4gICAgICAgICAgICAgICAgICAgICAgdHlwZT1cImJ1dHRvblwiXG4gICAgICAgICAgICAgICAgICAgICAgY2xhc3NOYW1lPXtgYWJvdXQtZWRpdG9yLXRpbWluZy1rZXkgaXMtaW50ZXJhY3Rpb24ke2lzU2VsZWN0ZWQgJiYgc2VsZWN0aW9uLmtleVBhcnQgPT09ICdhY3RpdmF0aW9uJyA/ICcgaXMtc2VsZWN0ZWQnIDogJyd9YH1cbiAgICAgICAgICAgICAgICAgICAgICBzdHlsZT17eyBsZWZ0OiBsb2NhbFBvc2l0aW9uKGFjdGl2YXRpb24pIH19XG4gICAgICAgICAgICAgICAgICAgICAgdGl0bGU9XCJJbnRlcmFjdGlvbiBhY3RpdmF0aW9uXCJcbiAgICAgICAgICAgICAgICAgICAgICBhcmlhLWxhYmVsPXtgJHtzZWN0aW9uLmxhYmVsfSBpbnRlcmFjdGlvbiBhY3RpdmF0aW9uIGtleWZyYW1lYH1cbiAgICAgICAgICAgICAgICAgICAgICBvbkNsaWNrPXsoKSA9PiBzZWxlY3RBdCh7IHR5cGU6ICdpbnRlcmFjdGlvbicsIGtleVBhcnQ6ICdhY3RpdmF0aW9uJyB9LCBhY3RpdmF0aW9uKX1cbiAgICAgICAgICAgICAgICAgICAgLz5cbiAgICAgICAgICAgICAgICAgICkgOiBudWxsfVxuICAgICAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgICApO1xuICAgICAgICAgICAgfSl9XG4gICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgKSl9XG4gICAgICAgIDwvZGl2PlxuICAgICAgPC9kaXY+XG4gICAgPC9kaXY+XG4gICk7XG59XG5cbmZ1bmN0aW9uIFNlcXVlbmNlSW5zcGVjdG9yKHsgc3RvcmUsIHNuYXBzaG90IH0pIHtcbiAgY29uc3QgY29tbWl0R2xvYmFsID0gKGdyb3VwLCBrZXksIHZhbHVlKSA9PiBzdG9yZS5jb21taXQoYENoYW5nZSAke2tleX1gLCAoZHJhZnQpID0+IHtcbiAgICBpZiAoZ3JvdXAgPT09ICdzZXF1ZW5jZScpIGRyYWZ0Lmdsb2JhbHNba2V5XSA9IHZhbHVlO1xuICAgIGVsc2Uge1xuICAgICAgY29uc3QgdGFyZ2V0S2V5ID0gZ3JvdXAgPT09ICdtYXRlcmlhbCcgPyAncG9pbnRNYXRlcmlhbCcgOiBncm91cDtcbiAgICAgIGRyYWZ0Lmdsb2JhbHNbdGFyZ2V0S2V5XVtrZXldID0gdmFsdWU7XG4gICAgfVxuICB9LCB7IGNvYWxlc2NlS2V5OiBgZ2xvYmFsOiR7Z3JvdXB9OiR7a2V5fWAgfSk7XG4gIHJldHVybiAoXG4gICAgPD5cbiAgICAgIDxoZWFkZXI+PHNwYW4+U2VxdWVuY2U8L3NwYW4+PHN0cm9uZz5HbG9iYWwgY29udHJvbHM8L3N0cm9uZz48L2hlYWRlcj5cbiAgICAgIHtBQk9VVF9OQVJSQVRJVkVfR0xPQkFMX0NPTlRST0xTLm1hcCgoZ3JvdXApID0+IChcbiAgICAgICAgPGRldGFpbHMgb3BlbiBrZXk9e2dyb3VwLmlkfT5cbiAgICAgICAgICA8c3VtbWFyeT57Z3JvdXAubGFiZWx9PC9zdW1tYXJ5PlxuICAgICAgICAgIHtncm91cC5pZCA9PT0gJ3RleHRNb3Rpb24nID8gPHAgY2xhc3NOYW1lPVwiYWJvdXQtZWRpdG9yLWhlbHBcIj5FdmVyeSB0aXRsZSBmb2xsb3dzIHRoaXMgcGF0aCBjb250aW51b3VzbHkuIE5lZ2F0aXZlIFkgaXMgaGlnaGVyLCBwb3NpdGl2ZSBZIGlzIGxvd2VyLiBUaGUgb3BlbmVyIHN0YXJ0cyBzaGFycCBhdCBpdHMgb3duIFkgcG9zaXRpb247IENsZWFyIGZyb20gYW5kIENsZWFyIHVudGlsIHNldCB0aGUgc2hhcnAgd2luZG93IGZvciBsYXRlciB0aXRsZXMuPC9wPiA6IG51bGx9XG4gICAgICAgICAge2dyb3VwLmlkID09PSAnc3dhcm1UdXJidWxlbmNlJyA/IDxwIGNsYXNzTmFtZT1cImFib3V0LWVkaXRvci1oZWxwXCI+T25lIGFtYmllbnQgbW90aW9uIHByb2ZpbGUgZHJpdmVzIGJvdGggdGhlIGNsdXN0ZXIgYW5kIHR1cmJ1bGVudCBmaWVsZC4gRWFjaCBXb3JsZCBvbmx5IHNjYWxlcyBpdHMgc3RyZW5ndGgsIHNvIHRoZSBtb3Rpb24gc3RheXMgY29udGludW91cyB3aGlsZSBTaGFwZXMgY2hhbmdlLjwvcD4gOiBudWxsfVxuICAgICAgICAgIHtncm91cC5jb250cm9scy5tYXAoKGNvbnRyb2wpID0+IHtcbiAgICAgICAgICAgIGNvbnN0IHRhcmdldCA9IGdyb3VwLmlkID09PSAnc2VxdWVuY2UnXG4gICAgICAgICAgICAgID8gc25hcHNob3QuZG9jdW1lbnQuZ2xvYmFsc1xuICAgICAgICAgICAgICA6IHNuYXBzaG90LmRvY3VtZW50Lmdsb2JhbHNbZ3JvdXAuaWQgPT09ICdtYXRlcmlhbCcgPyAncG9pbnRNYXRlcmlhbCcgOiBncm91cC5pZF07XG4gICAgICAgICAgICByZXR1cm4gKFxuICAgICAgICAgICAgICA8TnVtYmVyUHJvcGVydHlcbiAgICAgICAgICAgICAgICBrZXk9e2NvbnRyb2wuaWR9XG4gICAgICAgICAgICAgICAgbGFiZWw9e2NvbnRyb2wubGFiZWx9XG4gICAgICAgICAgICAgICAgdmFsdWU9e3RhcmdldFtjb250cm9sLmlkXX1cbiAgICAgICAgICAgICAgICBtaW49e2NvbnRyb2wubWlufVxuICAgICAgICAgICAgICAgIG1heD17Y29udHJvbC5tYXh9XG4gICAgICAgICAgICAgICAgc3RlcD17Y29udHJvbC5zdGVwfVxuICAgICAgICAgICAgICAgIHVuaXQ9e2NvbnRyb2wudW5pdH1cbiAgICAgICAgICAgICAgICBvbkNoYW5nZT17KHZhbHVlKSA9PiBjb21taXRHbG9iYWwoZ3JvdXAuaWQsIGNvbnRyb2wuaWQsIHZhbHVlKX1cbiAgICAgICAgICAgICAgLz5cbiAgICAgICAgICAgICk7XG4gICAgICAgICAgfSl9XG4gICAgICAgIDwvZGV0YWlscz5cbiAgICAgICkpfVxuICAgIDwvPlxuICApO1xufVxuXG5mdW5jdGlvbiBTZWN0aW9uSW5zcGVjdG9yKHsgc3RvcmUsIHNuYXBzaG90LCBzZWN0aW9uIH0pIHtcbiAgY29uc3Qgc2VjdGlvbkluZGV4ID0gZ2V0U2VjdGlvbkluZGV4KHNuYXBzaG90LmRvY3VtZW50LCBzZWN0aW9uLmlkKTtcbiAgY29uc3QgY29tcGlsZWRTZWN0aW9uID0gc25hcHNob3QuY29tcGlsZWRQbGFuPy5zZWN0aW9ucz8uW3NlY3Rpb25JbmRleF07XG4gIGNvbnN0IGFjdGl2ZUV4dGVudEZpZWxkID0gc25hcHNob3QucHJldmlld1Byb2ZpbGUgPT09ICdtb2JpbGUnID8gJ21vYmlsZUV4dGVudFdVJyA6ICdleHRlbnRXVSc7XG4gIGNvbnN0IGFjdGl2ZUV4dGVudCA9IE51bWJlcihzZWN0aW9uW2FjdGl2ZUV4dGVudEZpZWxkXSk7XG4gIGNvbnN0IHJlc29sdmVkRXh0ZW50ID0gTnVtYmVyKGNvbXBpbGVkU2VjdGlvbj8ucmVzb2x2ZWRFeHRlbnRXVSA/PyBhY3RpdmVFeHRlbnQpO1xuICBjb25zdCBjb250ZW50TWluaW11bUFjdGl2ZSA9IHJlc29sdmVkRXh0ZW50ID4gYWN0aXZlRXh0ZW50ICsgMC4wMDE7XG4gIGNvbnN0IGJhc2VsaW5lU2VjdGlvbiA9IHNuYXBzaG90LmJhc2VsaW5lRG9jdW1lbnQuc2VjdGlvbnMuZmluZCgoaXRlbSkgPT4gaXRlbS5pZCA9PT0gc2VjdGlvbi5pZCk7XG4gIGNvbnN0IHVwZGF0ZSA9IChsYWJlbCwgbXV0YXRlLCBjb2FsZXNjZUtleSA9IG51bGwpID0+IHN0b3JlLmNvbW1pdChsYWJlbCwgKGRyYWZ0KSA9PiB7XG4gICAgbXV0YXRlKGRyYWZ0LnNlY3Rpb25zW3NlY3Rpb25JbmRleF0pO1xuICB9LCB7IGNvYWxlc2NlS2V5LCBzZWxlY3Rpb246IHNuYXBzaG90LnNlbGVjdGlvbiB9KTtcbiAgY29uc3QgbW92ZSA9IChkaXJlY3Rpb24pID0+IHN0b3JlLmNvbW1pdCgnUmVvcmRlciBTZWN0aW9uJywgKGRyYWZ0KSA9PiB7XG4gICAgY29uc3QgdG9JbmRleCA9IHNlY3Rpb25JbmRleCArIGRpcmVjdGlvbjtcbiAgICBpZiAodG9JbmRleCA8IDAgfHwgdG9JbmRleCA+PSBkcmFmdC5zZWN0aW9ucy5sZW5ndGgpIHJldHVybjtcbiAgICBjb25zdCBbbW92ZWRdID0gZHJhZnQuc2VjdGlvbnMuc3BsaWNlKHNlY3Rpb25JbmRleCwgMSk7XG4gICAgZHJhZnQuc2VjdGlvbnMuc3BsaWNlKHRvSW5kZXgsIDAsIG1vdmVkKTtcbiAgICBzdGl0Y2hDYW1lcmFCb3VuZGFyaWVzKGRyYWZ0KTtcbiAgfSwgeyBzZWxlY3Rpb246IHsgdHlwZTogJ3NlY3Rpb24nLCBzZWN0aW9uSWQ6IHNlY3Rpb24uaWQgfSB9KTtcblxuICByZXR1cm4gKFxuICAgIDw+XG4gICAgICA8aGVhZGVyPjxzcGFuPlNlY3Rpb24ge1N0cmluZyhzZWN0aW9uSW5kZXggKyAxKS5wYWRTdGFydCgyLCAnMCcpfTwvc3Bhbj48c3Ryb25nPntzZWN0aW9uLmxhYmVsfTwvc3Ryb25nPjwvaGVhZGVyPlxuICAgICAge3NlY3Rpb24ubG9ja2VkID8gPGRpdiBjbGFzc05hbWU9XCJhYm91dC1lZGl0b3ItbG9ja1wiPjxMb2NrS2V5aG9sZSBhcmlhLWhpZGRlbj1cInRydWVcIiAvPjxzcGFuPlRoaXMgcHJvdGVjdGVkIFNlY3Rpb24gY2Fubm90IGJlIHJlb3JkZXJlZCBvciBoYXZlIGl0cyBXb3JsZCByZXBsYWNlZCBhY2NpZGVudGFsbHkuPC9zcGFuPjxidXR0b24gdHlwZT1cImJ1dHRvblwiIG9uQ2xpY2s9eygpID0+IHVwZGF0ZSgnVW5sb2NrIHByb3RlY3RlZCBTZWN0aW9uJywgKGRyYWZ0KSA9PiB7IGRyYWZ0LmxvY2tlZCA9IGZhbHNlOyB9KX0+VW5sb2NrIGFkdmFuY2VkPC9idXR0b24+PC9kaXY+IDogbnVsbH1cbiAgICAgIDxkaXYgY2xhc3NOYW1lPVwiYWJvdXQtZWRpdG9yLWlubGluZS1hY3Rpb25zXCI+XG4gICAgICAgIDxidXR0b24gdHlwZT1cImJ1dHRvblwiIGRpc2FibGVkPXtzZWN0aW9uLmxvY2tlZCB8fCBzZWN0aW9uSW5kZXggPT09IDB9IG9uQ2xpY2s9eygpID0+IG1vdmUoLTEpfT5Nb3ZlIGVhcmxpZXI8L2J1dHRvbj5cbiAgICAgICAgPGJ1dHRvbiB0eXBlPVwiYnV0dG9uXCIgZGlzYWJsZWQ9e3NlY3Rpb24ubG9ja2VkIHx8IHNlY3Rpb25JbmRleCA9PT0gc25hcHNob3QuZG9jdW1lbnQuc2VjdGlvbnMubGVuZ3RoIC0gMX0gb25DbGljaz17KCkgPT4gbW92ZSgxKX0+TW92ZSBsYXRlcjwvYnV0dG9uPlxuICAgICAgPC9kaXY+XG4gICAgICA8UHJvcGVydHkgbGFiZWw9XCJTZWN0aW9uIG5hbWVcIj48aW5wdXQgdmFsdWU9e3NlY3Rpb24ubGFiZWx9IG9uQ2hhbmdlPXsoZXZlbnQpID0+IHVwZGF0ZSgnUmVuYW1lIFNlY3Rpb24nLCAoZHJhZnQpID0+IHsgZHJhZnQubGFiZWwgPSBldmVudC50YXJnZXQudmFsdWU7IH0sIGBzZWN0aW9uOiR7c2VjdGlvbi5pZH06bGFiZWxgKX0gLz48L1Byb3BlcnR5PlxuICAgICAgPFByb3BlcnR5IGxhYmVsPVwiU3RhYmxlIElEXCI+PGlucHV0IHZhbHVlPXtzZWN0aW9uLmlkfSByZWFkT25seSAvPjxzbWFsbD5SZWZlcmVuY2VzIHRoaXMgU2VjdGlvbiB3aXRob3V0IHR5aW5nIGl0IHRvIGl0cyBjdXJyZW50IG1lYW5pbmcuPC9zbWFsbD48L1Byb3BlcnR5PlxuICAgICAgPFByb3BlcnR5IGxhYmVsPVwiVHlwZVwiPlxuICAgICAgICA8c2VsZWN0IHZhbHVlPXtzZWN0aW9uLnR5cGV9IGRpc2FibGVkPXtzZWN0aW9uLnR5cGUgPT09ICdmaW5hbGUnfSBvbkNoYW5nZT17KGV2ZW50KSA9PiB1cGRhdGUoJ0NoYW5nZSBTZWN0aW9uIHR5cGUnLCAoZHJhZnQpID0+IHsgZHJhZnQudHlwZSA9IGV2ZW50LnRhcmdldC52YWx1ZTsgfSl9PlxuICAgICAgICAgIDxvcHRpb24gdmFsdWU9XCJzcGF0aWFsXCI+U3BhdGlhbDwvb3B0aW9uPjxvcHRpb24gdmFsdWU9XCJlZGl0b3JpYWxcIj5FZGl0b3JpYWw8L29wdGlvbj48b3B0aW9uIHZhbHVlPVwiZmluYWxlXCI+RmluYWxlPC9vcHRpb24+XG4gICAgICAgIDwvc2VsZWN0PlxuICAgICAgPC9Qcm9wZXJ0eT5cbiAgICAgIDxkZXRhaWxzIG9wZW4+XG4gICAgICAgIDxzdW1tYXJ5PlNlY3Rpb24gdGltaW5nPC9zdW1tYXJ5PlxuICAgICAgICA8UHJvcGVydHkgbGFiZWw9XCJTY3JvbGwgdHJhdmVsXCI+PG91dHB1dCBjbGFzc05hbWU9XCJhYm91dC1lZGl0b3ItcmVhZG91dFwiPntmb3JtYXRXVShNYXRoLm1heCgwLCBhY3RpdmVFeHRlbnQgLSAxKSl9PC9vdXRwdXQ+PC9Qcm9wZXJ0eT5cbiAgICAgICAgPFByb3BlcnR5IGxhYmVsPVwiVG90YWwgaGVpZ2h0XCI+PG91dHB1dCBjbGFzc05hbWU9XCJhYm91dC1lZGl0b3ItcmVhZG91dFwiPntmb3JtYXRXVShhY3RpdmVFeHRlbnQpfTwvb3V0cHV0PjwvUHJvcGVydHk+XG4gICAgICAgIDxOdW1iZXJQcm9wZXJ0eSBsYWJlbD1cIkRlc2t0b3AgbGVuZ3RoXCIgdmFsdWU9e3NlY3Rpb24uZXh0ZW50V1V9IG1pbj17MX0gbWF4PXs4fSBzdGVwPXswLjA1fSB1bml0PVwiV1VcIiBvbkNoYW5nZT17KHZhbHVlKSA9PiB1cGRhdGUoJ0NoYW5nZSBkZXNrdG9wIFNlY3Rpb24gbGVuZ3RoJywgKGRyYWZ0KSA9PiB7IGRyYWZ0LmV4dGVudFdVID0gdmFsdWU7IH0sIGBzZWN0aW9uOiR7c2VjdGlvbi5pZH06ZXh0ZW50YCl9IC8+XG4gICAgICAgIDxOdW1iZXJQcm9wZXJ0eSBsYWJlbD1cIk1vYmlsZSBsZW5ndGhcIiB2YWx1ZT17c2VjdGlvbi5tb2JpbGVFeHRlbnRXVX0gbWluPXsxfSBtYXg9ezh9IHN0ZXA9ezAuMDV9IHVuaXQ9XCJXVVwiIG9uQ2hhbmdlPXsodmFsdWUpID0+IHVwZGF0ZSgnQ2hhbmdlIG1vYmlsZSBTZWN0aW9uIGxlbmd0aCcsIChkcmFmdCkgPT4geyBkcmFmdC5tb2JpbGVFeHRlbnRXVSA9IHZhbHVlOyB9LCBgc2VjdGlvbjoke3NlY3Rpb24uaWR9Om1vYmlsZWApfSAvPlxuICAgICAgICA8UHJvcGVydHkgbGFiZWw9XCJSZXNvbHZlZCBoZWlnaHRcIj48b3V0cHV0IGNsYXNzTmFtZT1cImFib3V0LWVkaXRvci1yZWFkb3V0XCI+e2Zvcm1hdFdVKHJlc29sdmVkRXh0ZW50KX08L291dHB1dD48L1Byb3BlcnR5PlxuICAgICAgICB7Y29udGVudE1pbmltdW1BY3RpdmUgPyA8cCBjbGFzc05hbWU9XCJhYm91dC1lZGl0b3ItdGltaW5nLXdhcm5pbmdcIj5Db250ZW50IG1pbmltdW0gaW4gZWZmZWN0LiBUaGUgcmVuZGVyZWQgY29weSBuZWVkcyB7Zm9ybWF0V1UocmVzb2x2ZWRFeHRlbnQpfSBpbiB0aGlzIHByb2ZpbGUuPC9wPiA6IG51bGx9XG4gICAgICAgIDxidXR0b25cbiAgICAgICAgICB0eXBlPVwiYnV0dG9uXCJcbiAgICAgICAgICBjbGFzc05hbWU9XCJhYm91dC1lZGl0b3Itd2lkZS1hY3Rpb25cIlxuICAgICAgICAgIGRpc2FibGVkPXshYmFzZWxpbmVTZWN0aW9uIHx8IGJhc2VsaW5lU2VjdGlvblthY3RpdmVFeHRlbnRGaWVsZF0gPT09IHNlY3Rpb25bYWN0aXZlRXh0ZW50RmllbGRdfVxuICAgICAgICAgIG9uQ2xpY2s9eygpID0+IHVwZGF0ZSgnUmVzdG9yZSBzYXZlZCBTZWN0aW9uIGxlbmd0aCcsIChkcmFmdCkgPT4geyBkcmFmdFthY3RpdmVFeHRlbnRGaWVsZF0gPSBiYXNlbGluZVNlY3Rpb25bYWN0aXZlRXh0ZW50RmllbGRdOyB9KX1cbiAgICAgICAgPlJlc2V0IHtzbmFwc2hvdC5wcmV2aWV3UHJvZmlsZSA9PT0gJ21vYmlsZScgPyAnbW9iaWxlJyA6ICdkZXNrdG9wJ30gbGVuZ3RoPC9idXR0b24+XG4gICAgICA8L2RldGFpbHM+XG4gICAgICB7c2VjdGlvbi50eXBlID09PSAnZWRpdG9yaWFsJyA/IDxFZGl0b3JpYWxCbG9ja3Mgc3RvcmU9e3N0b3JlfSBzbmFwc2hvdD17c25hcHNob3R9IHNlY3Rpb249e3NlY3Rpb259IC8+IDogbnVsbH1cbiAgICAgIHtzZWN0aW9uLnR5cGUgIT09ICdlZGl0b3JpYWwnID8gKFxuICAgICAgICA8YnV0dG9uXG4gICAgICAgICAgdHlwZT1cImJ1dHRvblwiXG4gICAgICAgICAgY2xhc3NOYW1lPVwiYWJvdXQtZWRpdG9yLXdpZGUtYWN0aW9uXCJcbiAgICAgICAgICBvbkNsaWNrPXsoKSA9PiB7XG4gICAgICAgICAgICBjb25zdCBsb2NhbCA9IGdldExvY2FsUHJvZ3Jlc3Moc25hcHNob3QuY29tcGlsZWRQbGFuLCBzZWN0aW9uLCBzbmFwc2hvdC50cmFuc3BvcnQuc3RvcnlXVSk7XG4gICAgICAgICAgICBjb25zdCBpZCA9IG5leHRJZChzbmFwc2hvdC5kb2N1bWVudCwgYCR7c2VjdGlvbi5pZH0tc3RhdGVtZW50YCk7XG4gICAgICAgICAgICBjb25zdCBmb2N1cyA9IE1hdGgubWluKDAuOTIsIE1hdGgubWF4KDAuMDgsIHNuYXBBYm91dE5hcnJhdGl2ZVRpbWVsaW5lVmFsdWUobG9jYWwpKSk7XG4gICAgICAgICAgICB1cGRhdGUoJ0FkZCB0ZXh0IEN1ZScsIChkcmFmdCkgPT4ge1xuICAgICAgICAgICAgICBkcmFmdC50ZXh0LmN1ZXMgfHw9IFtdO1xuICAgICAgICAgICAgICBkcmFmdC50ZXh0LmN1ZXMucHVzaCh7IGlkLCB0ZXh0OiAnTmV3IHRyYXZlbGxpbmcgc3RhdGVtZW50JywgZW50ZXI6IGZvY3VzIC0gMC4wOCwgaG9sZDogZm9jdXMsIGV4aXQ6IGZvY3VzICsgMC4wOCwgcHJlc2V0OiAndHJhdmVsbGluZy10aXRsZS12MScsIG1vdGlvbjogeyBtb2RlOiAnc3BhdGlhbCcgfSB9KTtcbiAgICAgICAgICAgICAgZHJhZnQudGV4dC5jdWVzLnNvcnQoKGEsIGIpID0+IGEuaG9sZCAtIGIuaG9sZCk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIHN0b3JlLnNldFNlbGVjdGlvbih7IHR5cGU6ICdjdWUnLCBzZWN0aW9uSWQ6IHNlY3Rpb24uaWQsIGN1ZUlkOiBpZCwga2V5UGFydDogJ2ZvY3VzJyB9KTtcbiAgICAgICAgICB9fVxuICAgICAgICA+QWRkIHRleHQgY3VlIGF0IHBsYXloZWFkPC9idXR0b24+XG4gICAgICApIDogbnVsbH1cbiAgICA8Lz5cbiAgKTtcbn1cblxuZnVuY3Rpb24gRWRpdG9yaWFsQmxvY2tzKHsgc3RvcmUsIHNuYXBzaG90LCBzZWN0aW9uIH0pIHtcbiAgY29uc3Qgc2VjdGlvbkluZGV4ID0gZ2V0U2VjdGlvbkluZGV4KHNuYXBzaG90LmRvY3VtZW50LCBzZWN0aW9uLmlkKTtcbiAgY29uc3QgdXBkYXRlQmxvY2sgPSAoYmxvY2tJbmRleCwgZmllbGQsIHZhbHVlKSA9PiBzdG9yZS5jb21taXQoJ0VkaXQgZWRpdG9yaWFsIGNvcHknLCAoZHJhZnQpID0+IHtcbiAgICBkcmFmdC5zZWN0aW9uc1tzZWN0aW9uSW5kZXhdLnRleHQuYmxvY2tzW2Jsb2NrSW5kZXhdW2ZpZWxkXSA9IHZhbHVlO1xuICB9LCB7IGNvYWxlc2NlS2V5OiBgYmxvY2s6JHtzZWN0aW9uLmlkfToke2Jsb2NrSW5kZXh9OiR7ZmllbGR9YCwgc2VsZWN0aW9uOiBzbmFwc2hvdC5zZWxlY3Rpb24gfSk7XG4gIGNvbnN0IHVwZGF0ZUVtcGhhc2lzID0gKGJsb2NrSW5kZXgsIGVtcGhhc2lzSW5kZXgsIGZpZWxkLCB2YWx1ZSkgPT4gc3RvcmUuY29tbWl0KCdFZGl0IGVkaXRvcmlhbCBoaWdobGlnaHQnLCAoZHJhZnQpID0+IHtcbiAgICBkcmFmdC5zZWN0aW9uc1tzZWN0aW9uSW5kZXhdLnRleHQuYmxvY2tzW2Jsb2NrSW5kZXhdLmVtcGhhc2lzW2VtcGhhc2lzSW5kZXhdW2ZpZWxkXSA9IHZhbHVlO1xuICB9LCB7IGNvYWxlc2NlS2V5OiBgYmxvY2s6JHtzZWN0aW9uLmlkfToke2Jsb2NrSW5kZXh9OmVtcGhhc2lzOiR7ZW1waGFzaXNJbmRleH06JHtmaWVsZH1gLCBzZWxlY3Rpb246IHNuYXBzaG90LnNlbGVjdGlvbiB9KTtcbiAgY29uc3QgYWRkRW1waGFzaXMgPSAoYmxvY2tJbmRleCkgPT4gc3RvcmUuY29tbWl0KCdBZGQgZWRpdG9yaWFsIGhpZ2hsaWdodCcsIChkcmFmdCkgPT4ge1xuICAgIGNvbnN0IGJsb2NrID0gZHJhZnQuc2VjdGlvbnNbc2VjdGlvbkluZGV4XS50ZXh0LmJsb2Nrc1tibG9ja0luZGV4XTtcbiAgICBibG9jay5lbXBoYXNpcyB8fD0gW107XG4gICAgYmxvY2suZW1waGFzaXMucHVzaCh7IHRleHQ6IGJsb2NrLnRleHQudHJpbSgpLnNwbGl0KC9cXHMrLykuc2xpY2UoMCwgMikuam9pbignICcpLCB0b25lOiAnYmx1ZScgfSk7XG4gIH0sIHsgc2VsZWN0aW9uOiBzbmFwc2hvdC5zZWxlY3Rpb24gfSk7XG4gIGNvbnN0IHJlbW92ZUVtcGhhc2lzID0gKGJsb2NrSW5kZXgsIGVtcGhhc2lzSW5kZXgpID0+IHN0b3JlLmNvbW1pdCgnUmVtb3ZlIGVkaXRvcmlhbCBoaWdobGlnaHQnLCAoZHJhZnQpID0+IHtcbiAgICBkcmFmdC5zZWN0aW9uc1tzZWN0aW9uSW5kZXhdLnRleHQuYmxvY2tzW2Jsb2NrSW5kZXhdLmVtcGhhc2lzLnNwbGljZShlbXBoYXNpc0luZGV4LCAxKTtcbiAgfSwgeyBzZWxlY3Rpb246IHNuYXBzaG90LnNlbGVjdGlvbiB9KTtcbiAgcmV0dXJuIChcbiAgICA8ZGV0YWlscyBvcGVuPlxuICAgICAgPHN1bW1hcnk+RWRpdG9yaWFsIGNvbnRlbnQ8L3N1bW1hcnk+XG4gICAgICB7KHNlY3Rpb24udGV4dC5ibG9ja3MgfHwgW10pLm1hcCgoYmxvY2ssIGJsb2NrSW5kZXgpID0+IChcbiAgICAgICAgPGRpdiBjbGFzc05hbWU9XCJhYm91dC1lZGl0b3ItYmxvY2tcIiBrZXk9e2Jsb2NrLmlkfT5cbiAgICAgICAgICA8ZGl2Pjxjb2RlPntibG9jay5raW5kfTwvY29kZT48c3Bhbj57YmxvY2suaWR9PC9zcGFuPjwvZGl2PlxuICAgICAgICAgIHtibG9jay5sYWJlbCAhPSBudWxsID8gPFByb3BlcnR5IGxhYmVsPVwiTGFiZWxcIj48aW5wdXQgdmFsdWU9e2Jsb2NrLmxhYmVsfSBvbkNoYW5nZT17KGV2ZW50KSA9PiB1cGRhdGVCbG9jayhibG9ja0luZGV4LCAnbGFiZWwnLCBldmVudC50YXJnZXQudmFsdWUpfSAvPjwvUHJvcGVydHk+IDogbnVsbH1cbiAgICAgICAgICB7YmxvY2sudGV4dCAhPSBudWxsID8gPFByb3BlcnR5IGxhYmVsPVwiQ29weVwiPjx0ZXh0YXJlYSByb3dzPVwiNVwiIHZhbHVlPXtibG9jay50ZXh0fSBvbkNoYW5nZT17KGV2ZW50KSA9PiB1cGRhdGVCbG9jayhibG9ja0luZGV4LCAndGV4dCcsIGV2ZW50LnRhcmdldC52YWx1ZSl9IC8+PC9Qcm9wZXJ0eT4gOiBudWxsfVxuICAgICAgICAgIHtibG9jay5raW5kID09PSAncHJvc2UnID8gPFByb3BlcnR5IGxhYmVsPVwiUmVjb25uZWN0IHBvaW50IGdyaWRcIj48aW5wdXQgdHlwZT1cImNoZWNrYm94XCIgY2hlY2tlZD17YmxvY2sud29ybGRJbmZsdWVuY2UgPT09IHRydWV9IG9uQ2hhbmdlPXsoZXZlbnQpID0+IHVwZGF0ZUJsb2NrKGJsb2NrSW5kZXgsICd3b3JsZEluZmx1ZW5jZScsIGV2ZW50LnRhcmdldC5jaGVja2VkKX0gLz48L1Byb3BlcnR5PiA6IG51bGx9XG4gICAgICAgICAge2Jsb2NrLnRleHQgIT0gbnVsbCA/IChcbiAgICAgICAgICAgIDxkaXYgY2xhc3NOYW1lPVwiYWJvdXQtZWRpdG9yLWVtcGhhc2lzLWNvbnRyb2xzXCI+XG4gICAgICAgICAgICAgIDxzcGFuPkhpZ2hsaWdodGVkIHdvcmRzPC9zcGFuPlxuICAgICAgICAgICAgICB7KGJsb2NrLmVtcGhhc2lzIHx8IFtdKS5tYXAoKGl0ZW0sIGVtcGhhc2lzSW5kZXgpID0+IChcbiAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cImFib3V0LWVkaXRvci1lbXBoYXNpcy1yb3dcIiBrZXk9e2Ake2Jsb2NrLmlkfS1lbXBoYXNpcy0ke2VtcGhhc2lzSW5kZXh9YH0+XG4gICAgICAgICAgICAgICAgICA8aW5wdXQgYXJpYS1sYWJlbD1cIkhpZ2hsaWdodGVkIHBocmFzZVwiIHZhbHVlPXtpdGVtLnRleHR9IG9uQ2hhbmdlPXsoZXZlbnQpID0+IHVwZGF0ZUVtcGhhc2lzKGJsb2NrSW5kZXgsIGVtcGhhc2lzSW5kZXgsICd0ZXh0JywgZXZlbnQudGFyZ2V0LnZhbHVlKX0gLz5cbiAgICAgICAgICAgICAgICAgIDxzZWxlY3QgYXJpYS1sYWJlbD1cIkhpZ2hsaWdodCBjb2xvdXJcIiB2YWx1ZT17aXRlbS50b25lfSBvbkNoYW5nZT17KGV2ZW50KSA9PiB1cGRhdGVFbXBoYXNpcyhibG9ja0luZGV4LCBlbXBoYXNpc0luZGV4LCAndG9uZScsIGV2ZW50LnRhcmdldC52YWx1ZSl9PlxuICAgICAgICAgICAgICAgICAgICB7QUJPVVRfTkFSUkFUSVZFX0VNUEhBU0lTX1RPTkVTLm1hcCgodG9uZSkgPT4gPG9wdGlvbiB2YWx1ZT17dG9uZX0ga2V5PXt0b25lfT57dG9uZX08L29wdGlvbj4pfVxuICAgICAgICAgICAgICAgICAgPC9zZWxlY3Q+XG4gICAgICAgICAgICAgICAgICA8YnV0dG9uIHR5cGU9XCJidXR0b25cIiBhcmlhLWxhYmVsPXtgUmVtb3ZlICR7aXRlbS50ZXh0IHx8ICdlbXB0eSd9IGhpZ2hsaWdodGB9IG9uQ2xpY2s9eygpID0+IHJlbW92ZUVtcGhhc2lzKGJsb2NrSW5kZXgsIGVtcGhhc2lzSW5kZXgpfT7DlzwvYnV0dG9uPlxuICAgICAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgICApKX1cbiAgICAgICAgICAgICAgPGJ1dHRvbiB0eXBlPVwiYnV0dG9uXCIgb25DbGljaz17KCkgPT4gYWRkRW1waGFzaXMoYmxvY2tJbmRleCl9PkFkZCBoaWdobGlnaHQ8L2J1dHRvbj5cbiAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICkgOiBudWxsfVxuICAgICAgICAgIHtibG9jay5pdGVtcyA/IDxQcm9wZXJ0eSBsYWJlbD1cIkl0ZW1zXCI+PHRleHRhcmVhIHJvd3M9XCI2XCIgdmFsdWU9e2Jsb2NrLml0ZW1zLmpvaW4oJ1xcbicpfSBvbkNoYW5nZT17KGV2ZW50KSA9PiB1cGRhdGVCbG9jayhibG9ja0luZGV4LCAnaXRlbXMnLCBldmVudC50YXJnZXQudmFsdWUuc3BsaXQoJ1xcbicpLmZpbHRlcihCb29sZWFuKSl9IC8+PC9Qcm9wZXJ0eT4gOiBudWxsfVxuICAgICAgICA8L2Rpdj5cbiAgICAgICkpfVxuICAgICAgPGJ1dHRvbiB0eXBlPVwiYnV0dG9uXCIgY2xhc3NOYW1lPVwiYWJvdXQtZWRpdG9yLXdpZGUtYWN0aW9uXCIgb25DbGljaz17KCkgPT4gc3RvcmUuY29tbWl0KCdBZGQgZWRpdG9yaWFsIGJsb2NrJywgKGRyYWZ0KSA9PiB7XG4gICAgICAgIGRyYWZ0LnNlY3Rpb25zW3NlY3Rpb25JbmRleF0udGV4dC5ibG9ja3MucHVzaCh7IGlkOiBuZXh0SWQoZHJhZnQsIGAke3NlY3Rpb24uaWR9LXByb3NlYCksIGtpbmQ6ICdwcm9zZScsIHRleHQ6ICdOZXcgZWRpdG9yaWFsIHBhcmFncmFwaC4nIH0pO1xuICAgICAgfSl9PkFkZCBwcm9zZSBibG9jazwvYnV0dG9uPlxuICAgIDwvZGV0YWlscz5cbiAgKTtcbn1cblxuZnVuY3Rpb24gQ3VlSW5zcGVjdG9yKHsgc3RvcmUsIHNuYXBzaG90LCBzZWN0aW9uIH0pIHtcbiAgY29uc3Qgc2VsZWN0ZWRNZW1iZXJzID0gZ2V0QWJvdXROYXJyYXRpdmVTZWxlY3Rpb25NZW1iZXJzKHNuYXBzaG90LnNlbGVjdGlvbik7XG4gIGNvbnN0IHNlY3Rpb25JbmRleCA9IGdldFNlY3Rpb25JbmRleChzbmFwc2hvdC5kb2N1bWVudCwgc2VjdGlvbi5pZCk7XG4gIGNvbnN0IGN1ZUluZGV4ID0gc2VjdGlvbi50ZXh0LmN1ZXMuZmluZEluZGV4KChjdWUpID0+IGN1ZS5pZCA9PT0gc25hcHNob3Quc2VsZWN0aW9uLmN1ZUlkKTtcbiAgY29uc3QgY3VlID0gc2VjdGlvbi50ZXh0LmN1ZXNbY3VlSW5kZXhdO1xuICBpZiAoIWN1ZSkgcmV0dXJuIDxTZWN0aW9uSW5zcGVjdG9yIHN0b3JlPXtzdG9yZX0gc25hcHNob3Q9e3NuYXBzaG90fSBzZWN0aW9uPXtzZWN0aW9ufSAvPjtcbiAgY29uc3QgdXBkYXRlID0gKGZpZWxkLCB2YWx1ZSkgPT4gc3RvcmUuY29tbWl0KGBFZGl0IEN1ZSAke2ZpZWxkfWAsIChkcmFmdCkgPT4ge1xuICAgIGRyYWZ0LnNlY3Rpb25zW3NlY3Rpb25JbmRleF0udGV4dC5jdWVzW2N1ZUluZGV4XVtmaWVsZF0gPSB2YWx1ZTtcbiAgfSwgeyBjb2FsZXNjZUtleTogYGN1ZToke2N1ZS5pZH06JHtmaWVsZH1gLCBzZWxlY3Rpb246IHNuYXBzaG90LnNlbGVjdGlvbiB9KTtcbiAgY29uc3QgcmVtb3ZlID0gKCkgPT4gc3RvcmUuY29tbWl0KCdEZWxldGUgdGV4dCBDdWUnLCAoZHJhZnQpID0+IHtcbiAgICBkcmFmdC5zZWN0aW9uc1tzZWN0aW9uSW5kZXhdLnRleHQuY3Vlcy5zcGxpY2UoY3VlSW5kZXgsIDEpO1xuICB9LCB7IHNlbGVjdGlvbjogeyB0eXBlOiAnc2VjdGlvbicsIHNlY3Rpb25JZDogc2VjdGlvbi5pZCB9IH0pO1xuICBjb25zdCB0aW1pbmdCb3VuZHMgPSBnZXRBYm91dE5hcnJhdGl2ZUN1ZVRpbWluZ0JvdW5kcyhjdWUpO1xuICBjb25zdCBtb3Rpb25JbnRlcnZhbCA9IGdldEFib3V0TmFycmF0aXZlQ3VlTW90aW9uSW50ZXJ2YWwoY3VlLCBzbmFwc2hvdC5kb2N1bWVudC5nbG9iYWxzLnRleHRNb3Rpb24pO1xuICBjb25zdCBtb3ZlbWVudCA9IGdldEFib3V0TmFycmF0aXZlQ3VlTW92ZW1lbnQoY3VlKTtcbiAgY29uc3QgbW92ZUN1ZSA9IChwZXJjZW50KSA9PiBzdG9yZS5jb21taXQoJ01vdmUgdGV4dCBDdWUnLCAoZHJhZnQpID0+IHtcbiAgICBjb25zdCB0YXJnZXQgPSBkcmFmdC5zZWN0aW9uc1tzZWN0aW9uSW5kZXhdLnRleHQuY3Vlc1tjdWVJbmRleF07XG4gICAgT2JqZWN0LmFzc2lnbih0YXJnZXQsIG1vdmVBYm91dE5hcnJhdGl2ZUN1ZVRpbWluZyh0YXJnZXQsIHBlcmNlbnQgLyAxMDApKTtcbiAgfSwgeyBjb2FsZXNjZUtleTogYGN1ZToke2N1ZS5pZH06dGltaW5nYCwgc2VsZWN0aW9uOiB7IC4uLnNuYXBzaG90LnNlbGVjdGlvbiwga2V5UGFydDogJ2ZvY3VzJyB9IH0pO1xuICBjb25zdCB1cGRhdGVNb3ZlbWVudCA9IChtb2RlKSA9PiBzdG9yZS5jb21taXQoJ0NoYW5nZSB0ZXh0IG1vdmVtZW50JywgKGRyYWZ0KSA9PiB7XG4gICAgY29uc3QgdGFyZ2V0ID0gZHJhZnQuc2VjdGlvbnNbc2VjdGlvbkluZGV4XS50ZXh0LmN1ZXNbY3VlSW5kZXhdO1xuICAgIHRhcmdldC5tb3Rpb24gPSB7IC4uLnRhcmdldC5tb3Rpb24sIG1vZGUgfTtcbiAgfSwgeyBzZWxlY3Rpb246IHNuYXBzaG90LnNlbGVjdGlvbiB9KTtcbiAgcmV0dXJuIChcbiAgICA8PlxuICAgICAgPGhlYWRlcj48c3Bhbj5UZXh0IEN1ZTwvc3Bhbj48c3Ryb25nPntjdWUuaWR9PC9zdHJvbmc+PC9oZWFkZXI+XG4gICAgICB7c2VsZWN0ZWRNZW1iZXJzLmxlbmd0aCA+IDEgPyAoXG4gICAgICAgIDxkaXYgY2xhc3NOYW1lPVwiYWJvdXQtZWRpdG9yLWdyb3VwLXN1bW1hcnlcIj5cbiAgICAgICAgICA8c3Ryb25nPntzZWxlY3RlZE1lbWJlcnMubGVuZ3RofSB0aXRsZXMgc2VsZWN0ZWQ8L3N0cm9uZz5cbiAgICAgICAgICA8b2w+e3NlbGVjdGVkTWVtYmVycy5tYXAoKG1lbWJlcikgPT4ge1xuICAgICAgICAgICAgY29uc3QgbWVtYmVyU2VjdGlvbiA9IHNuYXBzaG90LmRvY3VtZW50LnNlY3Rpb25zLmZpbmQoKGl0ZW0pID0+IGl0ZW0uaWQgPT09IG1lbWJlci5zZWN0aW9uSWQpO1xuICAgICAgICAgICAgY29uc3QgbWVtYmVyQ3VlID0gbWVtYmVyU2VjdGlvbj8udGV4dD8uY3Vlcz8uZmluZCgoaXRlbSkgPT4gaXRlbS5pZCA9PT0gbWVtYmVyLmN1ZUlkKTtcbiAgICAgICAgICAgIHJldHVybiA8bGkga2V5PXtgJHttZW1iZXIuc2VjdGlvbklkfToke21lbWJlci5jdWVJZH1gfT48c3Bhbj57bWVtYmVyU2VjdGlvbj8ubGFiZWx9PC9zcGFuPnttZW1iZXJDdWU/LnRleHR9PC9saT47XG4gICAgICAgICAgfSl9PC9vbD5cbiAgICAgICAgICA8YnV0dG9uIHR5cGU9XCJidXR0b25cIiBvbkNsaWNrPXsoKSA9PiBzdG9yZS5zZXRTZWxlY3Rpb24oeyB0eXBlOiAnY3VlJywgc2VjdGlvbklkOiBzZWN0aW9uLmlkLCBjdWVJZDogY3VlLmlkLCBrZXlQYXJ0OiAnZm9jdXMnIH0pfT5LZWVwIHByaW1hcnkgb25seTwvYnV0dG9uPlxuICAgICAgICA8L2Rpdj5cbiAgICAgICkgOiBudWxsfVxuICAgICAgPHAgY2xhc3NOYW1lPVwiYWJvdXQtZWRpdG9yLWhlbHBcIj5EcmFnIHRoZSBwaW5rIHRpbWluZyBtYXJrZXIgYW55d2hlcmUgZnJvbSAw4oCTMTAwJSBvZiBpdHMgU2VjdGlvbi4gVGhpcyBtb3ZlcyB0aGUgdGl0bGUncyBmb2N1cyB0aW1lIG9ubHkuIEl0cyB0cmF2ZWwgZHVyYXRpb24sIHNwZWVkLCBibHVyLCBhbmQgaW4vb3V0IGNhZGVuY2UgcmVtYWluIGNvbnRyb2xsZWQgZ2xvYmFsbHkgdW5kZXIgU3BhdGlhbCB0aXRsZXMuPC9wPlxuICAgICAgPFByb3BlcnR5IGxhYmVsPVwiU3RhdGVtZW50XCI+PHRleHRhcmVhIHJvd3M9XCI3XCIgdmFsdWU9e2N1ZS50ZXh0fSBvbkNoYW5nZT17KGV2ZW50KSA9PiB1cGRhdGUoJ3RleHQnLCBldmVudC50YXJnZXQudmFsdWUpfSAvPjwvUHJvcGVydHk+XG4gICAgICA8UHJvcGVydHkgbGFiZWw9XCJNb3ZlbWVudFwiPjxzZWxlY3QgdmFsdWU9e21vdmVtZW50fSBvbkNoYW5nZT17KGV2ZW50KSA9PiB1cGRhdGVNb3ZlbWVudChldmVudC50YXJnZXQudmFsdWUpfT48b3B0aW9uIHZhbHVlPVwic3BhdGlhbFwiPlNwYXRpYWwgdHJhdmVsPC9vcHRpb24+PG9wdGlvbiB2YWx1ZT1cInZlcnRpY2FsXCI+VmVydGljYWwgc2Nyb2xsPC9vcHRpb24+PC9zZWxlY3Q+PC9Qcm9wZXJ0eT5cbiAgICAgIDxOdW1iZXJQcm9wZXJ0eVxuICAgICAgICBsYWJlbD1cIlBvc2l0aW9uXCJcbiAgICAgICAgdmFsdWU9e051bWJlcigoY3VlLmhvbGQgKiAxMDApLnRvRml4ZWQoMSkpfVxuICAgICAgICBtaW49e051bWJlcigodGltaW5nQm91bmRzLm1pbiAqIDEwMCkudG9GaXhlZCgxKSl9XG4gICAgICAgIG1heD17TnVtYmVyKCh0aW1pbmdCb3VuZHMubWF4ICogMTAwKS50b0ZpeGVkKDEpKX1cbiAgICAgICAgc3RlcD17MC41fVxuICAgICAgICB1bml0PVwiJVwiXG4gICAgICAgIGRpc2FibGVkPXt0aW1pbmdCb3VuZHMubWluID09PSB0aW1pbmdCb3VuZHMubWF4fVxuICAgICAgICBvbkNoYW5nZT17bW92ZUN1ZX1cbiAgICAgIC8+XG4gICAgICB7bW92ZW1lbnQgPT09ICdzcGF0aWFsJyA/IChcbiAgICAgICAgPD5cbiAgICAgICAgICA8UHJvcGVydHkgbGFiZWw9XCJBdXRvIHRyYXZlbFwiPjxvdXRwdXQgY2xhc3NOYW1lPVwiYWJvdXQtZWRpdG9yLXJlYWRvdXRcIj57TWF0aC5yb3VuZChtb3Rpb25JbnRlcnZhbC5zdGFydCAqIDEwMCl94oCTe01hdGgucm91bmQobW90aW9uSW50ZXJ2YWwuZW5kICogMTAwKX0lPC9vdXRwdXQ+PC9Qcm9wZXJ0eT5cbiAgICAgICAgICA8UHJvcGVydHkgbGFiZWw9XCJNb3Rpb24gcHJlc2V0XCI+PHNlbGVjdCB2YWx1ZT17Y3VlLnByZXNldH0gb25DaGFuZ2U9eyhldmVudCkgPT4gdXBkYXRlKCdwcmVzZXQnLCBldmVudC50YXJnZXQudmFsdWUpfT48b3B0aW9uIHZhbHVlPVwidHJhdmVsbGluZy10aXRsZS12MVwiPlRyYXZlbGxpbmcgdGl0bGU8L29wdGlvbj48b3B0aW9uIHZhbHVlPVwib3BlbmVyLXYxXCI+T3BlbmVyPC9vcHRpb24+PG9wdGlvbiB2YWx1ZT1cImZpbmFsZS12MVwiPkZpbmFsZTwvb3B0aW9uPjwvc2VsZWN0PjwvUHJvcGVydHk+XG4gICAgICAgIDwvPlxuICAgICAgKSA6IDxQcm9wZXJ0eSBsYWJlbD1cIlJldmVhbFwiPjxvdXRwdXQgY2xhc3NOYW1lPVwiYWJvdXQtZWRpdG9yLXJlYWRvdXRcIj5FZGl0b3JpYWwgdmVydGljYWwgc2Nyb2xsPC9vdXRwdXQ+PC9Qcm9wZXJ0eT59XG4gICAgICA8YnV0dG9uIHR5cGU9XCJidXR0b25cIiBjbGFzc05hbWU9XCJhYm91dC1lZGl0b3ItZGFuZ2VyXCIgZGlzYWJsZWQ9e3NlY3Rpb24udHlwZSA9PT0gJ2ZpbmFsZSd9IG9uQ2xpY2s9e3JlbW92ZX0+RGVsZXRlIEN1ZTwvYnV0dG9uPlxuICAgIDwvPlxuICApO1xufVxuXG5mdW5jdGlvbiBEaXNjaXBsaW5lUmV2ZWFsSW5zcGVjdG9yKHsgc3RvcmUsIHNuYXBzaG90LCBzZWN0aW9uIH0pIHtcbiAgY29uc3Qgc2VjdGlvbkluZGV4ID0gZ2V0U2VjdGlvbkluZGV4KHNuYXBzaG90LmRvY3VtZW50LCBzZWN0aW9uLmlkKTtcbiAgY29uc3QgcmV2ZWFsID0gc2VjdGlvbi50ZXh0LmRpc2NpcGxpbmVSZXZlYWw7XG4gIGlmICghcmV2ZWFsKSByZXR1cm4gPFNlY3Rpb25JbnNwZWN0b3Igc3RvcmU9e3N0b3JlfSBzbmFwc2hvdD17c25hcHNob3R9IHNlY3Rpb249e3NlY3Rpb259IC8+O1xuICBjb25zdCB1cGRhdGUgPSAobGFiZWwsIG11dGF0ZSwgY29hbGVzY2VLZXkgPSBudWxsKSA9PiBzdG9yZS5jb21taXQobGFiZWwsIChkcmFmdCkgPT4ge1xuICAgIG11dGF0ZShkcmFmdC5zZWN0aW9uc1tzZWN0aW9uSW5kZXhdLnRleHQuZGlzY2lwbGluZVJldmVhbCk7XG4gIH0sIHsgY29hbGVzY2VLZXksIHNlbGVjdGlvbjogc25hcHNob3Quc2VsZWN0aW9uIH0pO1xuICBjb25zdCBvY2N1cGllZCA9ICgocmV2ZWFsLml0ZW1zLmxlbmd0aCAtIDEpICogcmV2ZWFsLnN0YWdnZXIpICsgcmV2ZWFsLmxhYmVsRHVyYXRpb24gKyByZXZlYWwuaG9sZDtcbiAgY29uc3QgbGltaXRzRm9yID0gKGNvbnRyb2wpID0+IHtcbiAgICBpZiAoY29udHJvbC5pZCA9PT0gJ3N0YXJ0JykgcmV0dXJuIHsgbWluOiBjb250cm9sLm1pbiwgbWF4OiBNYXRoLm1heChjb250cm9sLm1pbiwgcmV2ZWFsLmVuZCAtIG9jY3VwaWVkKSB9O1xuICAgIGlmIChjb250cm9sLmlkID09PSAnZW5kJykgcmV0dXJuIHsgbWluOiBNYXRoLm1pbihjb250cm9sLm1heCwgcmV2ZWFsLnN0YXJ0ICsgb2NjdXBpZWQpLCBtYXg6IGNvbnRyb2wubWF4IH07XG4gICAgaWYgKGNvbnRyb2wuaWQgPT09ICdzdGFnZ2VyJykgcmV0dXJuIHtcbiAgICAgIG1pbjogY29udHJvbC5taW4sXG4gICAgICBtYXg6IE1hdGgubWF4KGNvbnRyb2wubWluLCAocmV2ZWFsLmVuZCAtIHJldmVhbC5zdGFydCAtIHJldmVhbC5sYWJlbER1cmF0aW9uIC0gcmV2ZWFsLmhvbGQpIC8gTWF0aC5tYXgoMSwgcmV2ZWFsLml0ZW1zLmxlbmd0aCAtIDEpKSxcbiAgICB9O1xuICAgIGlmIChjb250cm9sLmlkID09PSAnbGFiZWxEdXJhdGlvbicpIHJldHVybiB7XG4gICAgICBtaW46IGNvbnRyb2wubWluLFxuICAgICAgbWF4OiBNYXRoLm1heChjb250cm9sLm1pbiwgcmV2ZWFsLmVuZCAtIHJldmVhbC5zdGFydCAtICgocmV2ZWFsLml0ZW1zLmxlbmd0aCAtIDEpICogcmV2ZWFsLnN0YWdnZXIpIC0gcmV2ZWFsLmhvbGQpLFxuICAgIH07XG4gICAgaWYgKGNvbnRyb2wuaWQgPT09ICdob2xkJykgcmV0dXJuIHtcbiAgICAgIG1pbjogY29udHJvbC5taW4sXG4gICAgICBtYXg6IE1hdGgubWF4KGNvbnRyb2wubWluLCByZXZlYWwuZW5kIC0gcmV2ZWFsLnN0YXJ0IC0gKChyZXZlYWwuaXRlbXMubGVuZ3RoIC0gMSkgKiByZXZlYWwuc3RhZ2dlcikgLSByZXZlYWwubGFiZWxEdXJhdGlvbiksXG4gICAgfTtcbiAgICByZXR1cm4geyBtaW46IGNvbnRyb2wubWluLCBtYXg6IGNvbnRyb2wubWF4IH07XG4gIH07XG4gIHJldHVybiAoXG4gICAgPD5cbiAgICAgIDxoZWFkZXI+PHNwYW4+VGV4dCBzZXF1ZW5jZTwvc3Bhbj48c3Ryb25nPkRpc2NpcGxpbmUgcmV2ZWFsPC9zdHJvbmc+PC9oZWFkZXI+XG4gICAgICA8cCBjbGFzc05hbWU9XCJhYm91dC1lZGl0b3ItaGVscFwiPk9uZSBjbGlwIGNvbnRyb2xzIHRoZSBjb21wbGV0ZSBzaXgtcG9pbnQgc2VxdWVuY2UuIERyYWcgaXRzIHN0cmlwZWQgYmxvY2sgaW4gdGhlIFRleHQgbGFuZSB0byBtb3ZlIGV2ZXJ5IHJldmVhbCB0b2dldGhlci48L3A+XG4gICAgICA8ZGV0YWlscyBvcGVuPjxzdW1tYXJ5PlJldmVhbCBjaG9yZW9ncmFwaHk8L3N1bW1hcnk+XG4gICAgICAgIHtBQk9VVF9OQVJSQVRJVkVfRElTQ0lQTElORV9SRVZFQUxfQ09OVFJPTFMubWFwKChjb250cm9sKSA9PiB7XG4gICAgICAgICAgY29uc3QgbGltaXRzID0gbGltaXRzRm9yKGNvbnRyb2wpO1xuICAgICAgICAgIHJldHVybiAoXG4gICAgICAgICAgICA8TnVtYmVyUHJvcGVydHlcbiAgICAgICAgICAgICAga2V5PXtjb250cm9sLmlkfVxuICAgICAgICAgICAgICBsYWJlbD17Y29udHJvbC5sYWJlbH1cbiAgICAgICAgICAgICAgdmFsdWU9e3JldmVhbFtjb250cm9sLmlkXX1cbiAgICAgICAgICAgICAgbWluPXtsaW1pdHMubWlufVxuICAgICAgICAgICAgICBtYXg9e2xpbWl0cy5tYXh9XG4gICAgICAgICAgICAgIHN0ZXA9e2NvbnRyb2wuc3RlcH1cbiAgICAgICAgICAgICAgdW5pdD17Y29udHJvbC51bml0fVxuICAgICAgICAgICAgICBvbkNoYW5nZT17KHZhbHVlKSA9PiB1cGRhdGUoYENoYW5nZSAke2NvbnRyb2wubGFiZWx9YCwgKGRyYWZ0KSA9PiB7IGRyYWZ0W2NvbnRyb2wuaWRdID0gdmFsdWU7IH0sIGBkaXNjaXBsaW5lLXJldmVhbDoke3NlY3Rpb24uaWR9OiR7Y29udHJvbC5pZH1gKX1cbiAgICAgICAgICAgIC8+XG4gICAgICAgICAgKTtcbiAgICAgICAgfSl9XG4gICAgICA8L2RldGFpbHM+XG4gICAgICA8ZGV0YWlscyBvcGVuPjxzdW1tYXJ5PlJldmVhbCBvcmRlciBhbmQgbGFiZWxzPC9zdW1tYXJ5PlxuICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cImFib3V0LWVkaXRvci1kaXNjaXBsaW5lLWl0ZW1zXCI+XG4gICAgICAgICAge3JldmVhbC5pdGVtcy5tYXAoKGl0ZW0sIGl0ZW1JbmRleCkgPT4gKFxuICAgICAgICAgICAgPGRpdiBjbGFzc05hbWU9XCJhYm91dC1lZGl0b3ItZGlzY2lwbGluZS1pdGVtXCIga2V5PXtpdGVtLmdyb3VwfT5cbiAgICAgICAgICAgICAgPGNvZGU+e1N0cmluZyhpdGVtSW5kZXggKyAxKS5wYWRTdGFydCgyLCAnMCcpfTwvY29kZT5cbiAgICAgICAgICAgICAgPGlucHV0IHZhbHVlPXtpdGVtLmxhYmVsfSBhcmlhLWxhYmVsPXtgRGlzY2lwbGluZSAke2l0ZW1JbmRleCArIDF9IGxhYmVsYH0gb25DaGFuZ2U9eyhldmVudCkgPT4gdXBkYXRlKCdFZGl0IGRpc2NpcGxpbmUgbGFiZWwnLCAoZHJhZnQpID0+IHsgZHJhZnQuaXRlbXNbaXRlbUluZGV4XS5sYWJlbCA9IGV2ZW50LnRhcmdldC52YWx1ZTsgfSwgYGRpc2NpcGxpbmUtcmV2ZWFsOiR7c2VjdGlvbi5pZH06aXRlbToke2l0ZW0uZ3JvdXB9OmxhYmVsYCl9IC8+XG4gICAgICAgICAgICAgIDxkaXYgY2xhc3NOYW1lPVwiYWJvdXQtZWRpdG9yLWRpc2NpcGxpbmUtcGFsZXR0ZVwiIHRpdGxlPXtgJHtpdGVtLmxhYmVsfSB1c2VzIHRoZSBIb21lIHNpbXVsYXRpb24gJHtESVNDSVBMSU5FX0JBTExfVE9LRU5fQllfR1JPVVBbaXRlbS5ncm91cF19YH0+XG4gICAgICAgICAgICAgICAgPGkgc3R5bGU9e3sgYmFja2dyb3VuZDogYHZhcigke0RJU0NJUExJTkVfQkFMTF9UT0tFTl9CWV9HUk9VUFtpdGVtLmdyb3VwXX0pYCB9fSAvPlxuICAgICAgICAgICAgICAgIDxjb2RlPntESVNDSVBMSU5FX0JBTExfVE9LRU5fQllfR1JPVVBbaXRlbS5ncm91cF19PC9jb2RlPlxuICAgICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgICAgPHNwYW4+XG4gICAgICAgICAgICAgICAgPGJ1dHRvbiB0eXBlPVwiYnV0dG9uXCIgZGlzYWJsZWQ9e2l0ZW1JbmRleCA9PT0gMH0gYXJpYS1sYWJlbD17YFJldmVhbCAke2l0ZW0ubGFiZWx9IGVhcmxpZXJgfSBvbkNsaWNrPXsoKSA9PiB1cGRhdGUoJ1Jlb3JkZXIgZGlzY2lwbGluZSByZXZlYWwnLCAoZHJhZnQpID0+IHsgY29uc3QgW21vdmVkXSA9IGRyYWZ0Lml0ZW1zLnNwbGljZShpdGVtSW5kZXgsIDEpOyBkcmFmdC5pdGVtcy5zcGxpY2UoaXRlbUluZGV4IC0gMSwgMCwgbW92ZWQpOyB9KX0+4oaRPC9idXR0b24+XG4gICAgICAgICAgICAgICAgPGJ1dHRvbiB0eXBlPVwiYnV0dG9uXCIgZGlzYWJsZWQ9e2l0ZW1JbmRleCA9PT0gcmV2ZWFsLml0ZW1zLmxlbmd0aCAtIDF9IGFyaWEtbGFiZWw9e2BSZXZlYWwgJHtpdGVtLmxhYmVsfSBsYXRlcmB9IG9uQ2xpY2s9eygpID0+IHVwZGF0ZSgnUmVvcmRlciBkaXNjaXBsaW5lIHJldmVhbCcsIChkcmFmdCkgPT4geyBjb25zdCBbbW92ZWRdID0gZHJhZnQuaXRlbXMuc3BsaWNlKGl0ZW1JbmRleCwgMSk7IGRyYWZ0Lml0ZW1zLnNwbGljZShpdGVtSW5kZXggKyAxLCAwLCBtb3ZlZCk7IH0pfT7ihpM8L2J1dHRvbj5cbiAgICAgICAgICAgICAgPC9zcGFuPlxuICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgKSl9XG4gICAgICAgIDwvZGl2PlxuICAgICAgPC9kZXRhaWxzPlxuICAgICAgPHAgY2xhc3NOYW1lPVwiYWJvdXQtZWRpdG9yLWhlbHBcIj5UaGUgc2l4IHBvaW50cyBwZXJzaXN0IGFmdGVyIHRoZSBsYWJlbHMgbGVhdmUuIEFuIGVkaXRvcmlhbCBibG9jayBtYXJrZWQg4oCcUmVjb25uZWN0IHBvaW50IGdyaWTigJ0gcmVzdG9yZXMgdGhlIHN1cnJvdW5kaW5nIGdyaWQgYXMgdGhhdCBwYXJhZ3JhcGggZW50ZXJzLjwvcD5cbiAgICA8Lz5cbiAgKTtcbn1cblxuZnVuY3Rpb24gQ2FtZXJhSW5zcGVjdG9yKHsgc3RvcmUsIHNuYXBzaG90LCBzZWN0aW9uIH0pIHtcbiAgY29uc3Qgc2VjdGlvbkluZGV4ID0gZ2V0U2VjdGlvbkluZGV4KHNuYXBzaG90LmRvY3VtZW50LCBzZWN0aW9uLmlkKTtcbiAgY29uc3Qga2V5SW5kZXggPSBzbmFwc2hvdC5zZWxlY3Rpb24ua2V5SW5kZXg7XG4gIGNvbnN0IHNlbGVjdGVkS2V5ID0gc2VjdGlvbi5jYW1lcmEua2V5c1trZXlJbmRleF07XG4gIGNvbnN0IGtleSA9IHNlbGVjdGVkS2V5ICYmIHNlbGVjdGVkS2V5LmF0ID4gMCAmJiBzZWxlY3RlZEtleS5hdCA8IDEgPyBzZWxlY3RlZEtleSA6IG51bGw7XG4gIGNvbnN0IGxvY2FsID0gZ2V0TG9jYWxQcm9ncmVzcyhzbmFwc2hvdC5jb21waWxlZFBsYW4sIHNlY3Rpb24sIHNuYXBzaG90LnRyYW5zcG9ydC5zdG9yeVdVKTtcbiAgY29uc3QgdGFyZ2V0QXQgPSBNYXRoLm1pbigwLjk5NSwgTWF0aC5tYXgoMC4wMDUsIHNuYXBBYm91dE5hcnJhdGl2ZVRpbWVsaW5lVmFsdWUobG9jYWwpKSk7XG4gIGNvbnN0IGFwcGx5UHJlc2V0ID0gKHByZXNldCkgPT4gc3RvcmUuY29tbWl0KGBBcHBseSAke3ByZXNldH0gY2FtZXJhIHJlY2lwZWAsIChkcmFmdCkgPT4ge1xuICAgIGNvbnN0IHJlY2lwZXMgPSB7XG4gICAgICBQdXNoOiBbXG4gICAgICAgIHsgYXQ6IDAsIG9mZnNldDogWzAsIDAsIDBdLCBsb29rQXRPZmZzZXQ6IFswLCAwLCAtMV0sIGZvdjogNDgsIHJvbGw6IDAsIGVhc2luZzogJ3Ntb290aHN0ZXAnIH0sXG4gICAgICAgIHsgYXQ6IDEsIG9mZnNldDogWzAsIDAsIC0xLjJdLCBsb29rQXRPZmZzZXQ6IFswLCAwLCAtMV0sIGZvdjogNDUsIHJvbGw6IDAsIGVhc2luZzogJ3Ntb290aHN0ZXAnIH0sXG4gICAgICBdLFxuICAgICAgR2xpZGU6IFtcbiAgICAgICAgeyBhdDogMCwgb2Zmc2V0OiBbLTAuOCwgMCwgMF0sIGxvb2tBdE9mZnNldDogWzAuNCwgMCwgLTFdLCBmb3Y6IDQ4LCByb2xsOiAwLCBlYXNpbmc6ICdzbW9vdGhzdGVwJyB9LFxuICAgICAgICB7IGF0OiAxLCBvZmZzZXQ6IFswLjgsIDAsIDBdLCBsb29rQXRPZmZzZXQ6IFstMC40LCAwLCAtMV0sIGZvdjogNDgsIHJvbGw6IDAsIGVhc2luZzogJ3Ntb290aHN0ZXAnIH0sXG4gICAgICBdLFxuICAgICAgT3JiaXQ6IFtcbiAgICAgICAgeyBhdDogMCwgb2Zmc2V0OiBbLTAuNywgMCwgMF0sIGxvb2tBdE9mZnNldDogWzAuNywgMCwgLTFdLCBmb3Y6IDQ4LCByb2xsOiAtMC4wOCwgZWFzaW5nOiAnc21vb3Roc3RlcCcgfSxcbiAgICAgICAgeyBhdDogMC41LCBvZmZzZXQ6IFswLjcsIDAuMjUsIDBdLCBsb29rQXRPZmZzZXQ6IFstMC43LCAtMC4xLCAtMV0sIGZvdjogNDgsIHJvbGw6IDAuMDgsIGVhc2luZzogJ3Ntb290aHN0ZXAnIH0sXG4gICAgICAgIHsgYXQ6IDEsIG9mZnNldDogWzAsIDAsIDBdLCBsb29rQXRPZmZzZXQ6IFswLCAwLCAtMV0sIGZvdjogNDgsIHJvbGw6IDAsIGVhc2luZzogJ3Ntb290aHN0ZXAnIH0sXG4gICAgICBdLFxuICAgICAgUmV2ZWFsOiBbXG4gICAgICAgIHsgYXQ6IDAsIG9mZnNldDogWzAsIC0wLjQ1LCAwLjVdLCBsb29rQXRPZmZzZXQ6IFswLCAwLjMsIC0xXSwgZm92OiA1Niwgcm9sbDogMCwgZWFzaW5nOiAnc21vb3Roc3RlcCcgfSxcbiAgICAgICAgeyBhdDogMSwgb2Zmc2V0OiBbMCwgMCwgMF0sIGxvb2tBdE9mZnNldDogWzAsIDAsIC0xXSwgZm92OiA0Niwgcm9sbDogMCwgZWFzaW5nOiAnc21vb3Roc3RlcCcgfSxcbiAgICAgIF0sXG4gICAgICBSZXNvbHZlOiBbXG4gICAgICAgIHsgYXQ6IDAsIG9mZnNldDogWzAuMywgMC4yLCAwXSwgbG9va0F0T2Zmc2V0OiBbLTAuMywgLTAuMiwgLTFdLCBmb3Y6IDUyLCByb2xsOiAwLjE0LCBlYXNpbmc6ICdzbW9vdGhzdGVwJyB9LFxuICAgICAgICB7IGF0OiAxLCBvZmZzZXQ6IFswLCAwLCAwXSwgbG9va0F0T2Zmc2V0OiBbMCwgMCwgLTFdLCBmb3Y6IDQ4LCByb2xsOiAwLCBlYXNpbmc6ICdzbW9vdGhzdGVwJyB9LFxuICAgICAgXSxcbiAgICB9O1xuICAgIGRyYWZ0LnNlY3Rpb25zW3NlY3Rpb25JbmRleF0uY2FtZXJhLmtleXMgPSByZWNpcGVzW3ByZXNldF07XG4gICAgYnJpZGdlQ2FtZXJhU2VjdGlvbihkcmFmdCwgc2VjdGlvbkluZGV4KTtcbiAgfSwgeyBzZWxlY3Rpb246IHsgdHlwZTogJ3NlY3Rpb24nLCBzZWN0aW9uSWQ6IHNlY3Rpb24uaWQgfSB9KTtcbiAgY29uc3QgZXhpc3RpbmdLZXlBdFBsYXloZWFkID0gc2VjdGlvbi5jYW1lcmEua2V5cy5maW5kSW5kZXgoKGl0ZW0pID0+IChcbiAgICBpdGVtLmF0ID4gMCAmJiBpdGVtLmF0IDwgMSAmJiBNYXRoLmFicyhpdGVtLmF0IC0gdGFyZ2V0QXQpIDwgMC4wMDI1XG4gICkpO1xuICBjb25zdCBzZXRLZXkgPSAoKSA9PiB7XG4gICAgaWYgKGV4aXN0aW5nS2V5QXRQbGF5aGVhZCA+PSAwKSB7XG4gICAgICBzdG9yZS5zZXRTZWxlY3Rpb24oeyB0eXBlOiAnY2FtZXJhLWtleScsIHNlY3Rpb25JZDogc2VjdGlvbi5pZCwga2V5SW5kZXg6IGV4aXN0aW5nS2V5QXRQbGF5aGVhZCB9KTtcbiAgICAgIHJldHVybjtcbiAgICB9XG4gICAgY29uc3QgaW5zZXJ0aW9uSW5kZXggPSBzZWN0aW9uLmNhbWVyYS5rZXlzLmZpbmRJbmRleCgoaXRlbSkgPT4gaXRlbS5hdCA+IHRhcmdldEF0KTtcbiAgICBjb25zdCBzZWxlY3RlZEtleUluZGV4ID0gaW5zZXJ0aW9uSW5kZXggPCAwID8gc2VjdGlvbi5jYW1lcmEua2V5cy5sZW5ndGggOiBpbnNlcnRpb25JbmRleDtcbiAgICBjb25zdCBzYW1wbGVkID0gc2FtcGxlQWJvdXROYXJyYXRpdmVQbGFuKHNuYXBzaG90LmNvbXBpbGVkUGxhbiwgc25hcHNob3QudHJhbnNwb3J0LnN0b3J5V1UpO1xuICAgIGNvbnN0IGJhc2VaID0gc25hcHNob3QuZG9jdW1lbnQuZ2xvYmFscy5jYW1lcmEuc3RhcnRaIC0gKHNuYXBzaG90LnRyYW5zcG9ydC5zdG9yeVdVICogc2FtcGxlZC5jYW1lcmEuY2FkZW5jZSk7XG4gICAgY29uc3QgbmV3S2V5ID0ge1xuICAgICAgYXQ6IHRhcmdldEF0LFxuICAgICAgb2Zmc2V0OiBbc2FtcGxlZC5jYW1lcmEucG9zaXRpb25bMF0sIHNhbXBsZWQuY2FtZXJhLnBvc2l0aW9uWzFdLCBzYW1wbGVkLmNhbWVyYS5wb3NpdGlvblsyXSAtIGJhc2VaXSxcbiAgICAgIGxvb2tBdE9mZnNldDogc2FtcGxlZC5jYW1lcmEudGFyZ2V0Lm1hcCgodmFsdWUsIGF4aXMpID0+IHZhbHVlIC0gc2FtcGxlZC5jYW1lcmEucG9zaXRpb25bYXhpc10pLFxuICAgICAgZm92OiBzYW1wbGVkLmNhbWVyYS5mb3YsXG4gICAgICByb2xsOiBzYW1wbGVkLmNhbWVyYS5yb2xsLFxuICAgICAgZWFzaW5nOiAnc21vb3Roc3RlcCcsXG4gICAgfTtcbiAgICBzdG9yZS5jb21taXQoJ1NldCBjYW1lcmEga2V5JywgKGRyYWZ0KSA9PiB7XG4gICAgICBkcmFmdC5zZWN0aW9uc1tzZWN0aW9uSW5kZXhdLmNhbWVyYS5rZXlzLnB1c2gobmV3S2V5KTtcbiAgICAgIGRyYWZ0LnNlY3Rpb25zW3NlY3Rpb25JbmRleF0uY2FtZXJhLmtleXMuc29ydCgoYSwgYikgPT4gYS5hdCAtIGIuYXQpO1xuICAgIH0sIHsgc2VsZWN0aW9uOiB7IHR5cGU6ICdjYW1lcmEta2V5Jywgc2VjdGlvbklkOiBzZWN0aW9uLmlkLCBrZXlJbmRleDogc2VsZWN0ZWRLZXlJbmRleCB9IH0pO1xuICB9O1xuICBjb25zdCByZWNpcGVzID0gPGRpdiBjbGFzc05hbWU9XCJhYm91dC1lZGl0b3ItY2FtZXJhLXJlY2lwZXNcIj57WydQdXNoJywgJ0dsaWRlJywgJ09yYml0JywgJ1JldmVhbCcsICdSZXNvbHZlJ10ubWFwKChuYW1lKSA9PiA8YnV0dG9uIHR5cGU9XCJidXR0b25cIiBrZXk9e25hbWV9IG9uQ2xpY2s9eygpID0+IGFwcGx5UHJlc2V0KG5hbWUpfT57bmFtZX08L2J1dHRvbj4pfTwvZGl2PjtcbiAgaWYgKCFrZXkpIHtcbiAgICByZXR1cm4gPD48aGVhZGVyPjxzcGFuPkNhbWVyYSB0cmFjazwvc3Bhbj48c3Ryb25nPkVkaXRpbmcgU2VjdGlvbiBiYXNlPC9zdHJvbmc+PC9oZWFkZXI+PHAgY2xhc3NOYW1lPVwiYWJvdXQtZWRpdG9yLWhlbHBcIj5UaGUgZG9sbHkgYW5kIFNlY3Rpb24gam9pbnMgYXJlIGNvbnRpbnVvdXMgYXV0b21hdGljYWxseS4gQWRkIHZpc2libGUga2V5cyBvbmx5IHdoZXJlIHRoZSBmcmFtaW5nLCBhaW0sIHJvbGwsIG9yIGxlbnMgc2hvdWxkIGNoYW5nZS48L3A+e3JlY2lwZXN9PGJ1dHRvbiB0eXBlPVwiYnV0dG9uXCIgY2xhc3NOYW1lPVwiYWJvdXQtZWRpdG9yLXdpZGUtYWN0aW9uXCIgb25DbGljaz17c2V0S2V5fT5TZXQgY2FtZXJhIGtleSBhdCB7Zm9ybWF0Q2FtZXJhUGVyY2VudCh0YXJnZXRBdCl9PC9idXR0b24+PC8+O1xuICB9XG4gIGNvbnN0IHVwZGF0ZSA9IChmaWVsZCwgdmFsdWUpID0+IHN0b3JlLmNvbW1pdChgRWRpdCBjYW1lcmEgJHtmaWVsZH1gLCAoZHJhZnQpID0+IHtcbiAgICBkcmFmdC5zZWN0aW9uc1tzZWN0aW9uSW5kZXhdLmNhbWVyYS5rZXlzW2tleUluZGV4XVtmaWVsZF0gPSBBcnJheS5pc0FycmF5KHZhbHVlKSA/IFsuLi52YWx1ZV0gOiB2YWx1ZTtcbiAgICBpZiAoQ0FNRVJBX1BPU0VfRklFTERTLmhhcyhmaWVsZCkpIGxpbmtDYW1lcmFCb3VuZGFyeShkcmFmdCwgc2VjdGlvbkluZGV4LCBrZXlJbmRleCk7XG4gIH0sIHsgY29hbGVzY2VLZXk6IGBjYW1lcmE6JHtzZWN0aW9uLmlkfToke2tleUluZGV4fToke2ZpZWxkfWAsIHNlbGVjdGlvbjogc25hcHNob3Quc2VsZWN0aW9uIH0pO1xuICBjb25zdCB1cGRhdGVWZWN0b3IgPSAoZmllbGQsIGF4aXMsIHZhbHVlKSA9PiB7XG4gICAgY29uc3QgbmV4dCA9IFsuLi5rZXlbZmllbGRdXTtcbiAgICBuZXh0W2F4aXNdID0gdmFsdWU7XG4gICAgdXBkYXRlKGZpZWxkLCBuZXh0KTtcbiAgfTtcbiAgY29uc3QgdGltaW5nQm91bmRzID0gZ2V0QWJvdXROYXJyYXRpdmVDYW1lcmFLZXlUaW1pbmdCb3VuZHMoc2VjdGlvbi5jYW1lcmEua2V5cywga2V5SW5kZXgpO1xuICBjb25zdCBleHRlbnRGaWVsZCA9IHNuYXBzaG90LnByZXZpZXdQcm9maWxlID09PSAnbW9iaWxlJyA/ICdtb2JpbGVFeHRlbnRXVScgOiAnZXh0ZW50V1UnO1xuICBjb25zdCBleHRlbnRMYWJlbCA9IHNuYXBzaG90LnByZXZpZXdQcm9maWxlID09PSAnbW9iaWxlJyA/ICdNb2JpbGUgbGVuZ3RoJyA6ICdTZWN0aW9uIGxlbmd0aCc7XG4gIGNvbnN0IHVwZGF0ZUV4dGVudCA9ICh2YWx1ZSkgPT4gc3RvcmUuY29tbWl0KCdDaGFuZ2UgU2VjdGlvbiBleHRlbnQnLCAoZHJhZnQpID0+IHtcbiAgICBkcmFmdC5zZWN0aW9uc1tzZWN0aW9uSW5kZXhdW2V4dGVudEZpZWxkXSA9IHZhbHVlO1xuICB9LCB7IGNvYWxlc2NlS2V5OiBgc2VjdGlvbjoke3NlY3Rpb24uaWR9OiR7ZXh0ZW50RmllbGR9YCwgc2VsZWN0aW9uOiBzbmFwc2hvdC5zZWxlY3Rpb24gfSk7XG4gIHJldHVybiAoXG4gICAgPD5cbiAgICAgIDxoZWFkZXI+PHNwYW4+Q2FtZXJhIGtleTwvc3Bhbj48c3Ryb25nPntmb3JtYXRDYW1lcmFQZXJjZW50KGtleS5hdCl9IHRocm91Z2gge3NlY3Rpb24ubGFiZWx9PC9zdHJvbmc+PC9oZWFkZXI+XG4gICAgICB7cmVjaXBlc31cbiAgICAgIDxOdW1iZXJQcm9wZXJ0eVxuICAgICAgICBsYWJlbD1cIlBvc2l0aW9uXCJcbiAgICAgICAgdmFsdWU9e051bWJlcigoa2V5LmF0ICogMTAwKS50b0ZpeGVkKDEpKX1cbiAgICAgICAgbWluPXtOdW1iZXIoKHRpbWluZ0JvdW5kcy5taW4gKiAxMDApLnRvRml4ZWQoMSkpfVxuICAgICAgICBtYXg9e051bWJlcigodGltaW5nQm91bmRzLm1heCAqIDEwMCkudG9GaXhlZCgxKSl9XG4gICAgICAgIHN0ZXA9ezAuNX1cbiAgICAgICAgdW5pdD1cIiVcIlxuICAgICAgICBvbkNoYW5nZT17KHZhbHVlKSA9PiB1cGRhdGUoJ2F0JywgTWF0aC5taW4odGltaW5nQm91bmRzLm1heCwgTWF0aC5tYXgodGltaW5nQm91bmRzLm1pbiwgc25hcEFib3V0TmFycmF0aXZlVGltZWxpbmVWYWx1ZSh2YWx1ZSAvIDEwMCkpKSl9XG4gICAgICAvPlxuICAgICAgPE51bWJlclByb3BlcnR5IGxhYmVsPXtleHRlbnRMYWJlbH0gdmFsdWU9e3NlY3Rpb25bZXh0ZW50RmllbGRdfSBtaW49ezF9IG1heD17OH0gc3RlcD17MC4wNX0gdW5pdD1cIldVXCIgb25DaGFuZ2U9e3VwZGF0ZUV4dGVudH0gLz5cbiAgICAgIHtbJ1ggb2Zmc2V0JywgJ1kgb2Zmc2V0JywgJ0ZvcndhcmQgb2Zmc2V0J10ubWFwKChsYWJlbCwgYXhpcykgPT4gPE51bWJlclByb3BlcnR5IGtleT17bGFiZWx9IGxhYmVsPXtsYWJlbH0gdmFsdWU9e2tleS5vZmZzZXRbYXhpc119IG1pbj17LTh9IG1heD17OH0gc3RlcD17MC4wMn0gdW5pdD1cIldVXCIgb25DaGFuZ2U9eyh2YWx1ZSkgPT4gdXBkYXRlVmVjdG9yKCdvZmZzZXQnLCBheGlzLCB2YWx1ZSl9IC8+KX1cbiAgICAgIHtbJ0FpbSBYJywgJ0FpbSBZJywgJ0FpbSBkZXB0aCddLm1hcCgobGFiZWwsIGF4aXMpID0+IDxOdW1iZXJQcm9wZXJ0eSBrZXk9e2xhYmVsfSBsYWJlbD17bGFiZWx9IHZhbHVlPXtrZXkubG9va0F0T2Zmc2V0W2F4aXNdfSBtaW49ey04fSBtYXg9ezh9IHN0ZXA9ezAuMDJ9IHVuaXQ9XCJXVVwiIG9uQ2hhbmdlPXsodmFsdWUpID0+IHVwZGF0ZVZlY3RvcignbG9va0F0T2Zmc2V0JywgYXhpcywgdmFsdWUpfSAvPil9XG4gICAgICA8TnVtYmVyUHJvcGVydHkgbGFiZWw9XCJGaWVsZCBvZiB2aWV3XCIgdmFsdWU9e2tleS5mb3Z9IG1pbj17MjB9IG1heD17OTB9IHN0ZXA9ezF9IHVuaXQ9XCLCsFwiIG9uQ2hhbmdlPXsodmFsdWUpID0+IHVwZGF0ZSgnZm92JywgdmFsdWUpfSAvPlxuICAgICAgPE51bWJlclByb3BlcnR5IGxhYmVsPVwiUm9sbFwiIHZhbHVlPXtrZXkucm9sbH0gbWluPXstMS4yfSBtYXg9ezEuMn0gc3RlcD17MC4wMX0gdW5pdD1cInJhZFwiIG9uQ2hhbmdlPXsodmFsdWUpID0+IHVwZGF0ZSgncm9sbCcsIHZhbHVlKX0gLz5cbiAgICAgIDxQcm9wZXJ0eSBsYWJlbD1cIkVhc2luZ1wiPjxzZWxlY3QgdmFsdWU9e2tleS5lYXNpbmd9IG9uQ2hhbmdlPXsoZXZlbnQpID0+IHVwZGF0ZSgnZWFzaW5nJywgZXZlbnQudGFyZ2V0LnZhbHVlKX0+PG9wdGlvbiB2YWx1ZT1cInNtb290aHN0ZXBcIj5TbW9vdGhzdGVwPC9vcHRpb24+PG9wdGlvbiB2YWx1ZT1cImVhc2UtaW4tb3V0XCI+RWFzZSBpbiBvdXQ8L29wdGlvbj48L3NlbGVjdD48L1Byb3BlcnR5PlxuICAgICAgPGJ1dHRvbiB0eXBlPVwiYnV0dG9uXCIgY2xhc3NOYW1lPVwiYWJvdXQtZWRpdG9yLXdpZGUtYWN0aW9uXCIgZGlzYWJsZWQ9e2V4aXN0aW5nS2V5QXRQbGF5aGVhZCA+PSAwfSBvbkNsaWNrPXtzZXRLZXl9PntleGlzdGluZ0tleUF0UGxheWhlYWQgPj0gMCA/IGBDYW1lcmEga2V5IGFscmVhZHkgYXQgJHtmb3JtYXRDYW1lcmFQZXJjZW50KHRhcmdldEF0KX1gIDogYFNldCBhbm90aGVyIGtleSBhdCAke2Zvcm1hdENhbWVyYVBlcmNlbnQodGFyZ2V0QXQpfWB9PC9idXR0b24+XG4gICAgICA8YnV0dG9uIHR5cGU9XCJidXR0b25cIiBjbGFzc05hbWU9XCJhYm91dC1lZGl0b3ItZGFuZ2VyXCIgb25DbGljaz17KCkgPT4gc3RvcmUuY29tbWl0KCdEZWxldGUgY2FtZXJhIGtleScsIChkcmFmdCkgPT4geyBkcmFmdC5zZWN0aW9uc1tzZWN0aW9uSW5kZXhdLmNhbWVyYS5rZXlzLnNwbGljZShrZXlJbmRleCwgMSk7IH0sIHsgc2VsZWN0aW9uOiB7IHR5cGU6ICdzZWN0aW9uJywgc2VjdGlvbklkOiBzZWN0aW9uLmlkIH0gfSl9PkRlbGV0ZSBrZXk8L2J1dHRvbj5cbiAgICA8Lz5cbiAgKTtcbn1cblxuY29uc3QgQ09SUkVTUE9OREVOQ0VfTEFCRUxTID0gT2JqZWN0LmZyZWV6ZSh7XG4gICdpbmRleC12MSc6ICdJbmRleCBvcmRlcicsXG4gICdzdGFibGUtc2VlZCc6ICdTdGFibGUgc2VlZCcsXG4gICdzcGF0aWFsLW5lYXJlc3QtdjEnOiAnTG9jYWwgdHJhdmVsIChhcHByb3guKScsXG4gICdncm91cC1hd2FyZSc6ICdHcm91cCBhd2FyZScsXG59KTtcblxuZnVuY3Rpb24gV29ybGRJbnNwZWN0b3IoeyBzdG9yZSwgc25hcHNob3QsIHNlY3Rpb24sIHJ1bnRpbWVNZXRyaWNzIH0pIHtcbiAgY29uc3Qgc2VjdGlvbkluZGV4ID0gZ2V0U2VjdGlvbkluZGV4KHNuYXBzaG90LmRvY3VtZW50LCBzZWN0aW9uLmlkKTtcbiAgaWYgKHNlY3Rpb24ud29ybGQubW9kZSAhPT0gJ3NldCcpIHtcbiAgICByZXR1cm4gPD48aGVhZGVyPjxzcGFuPldvcmxkIHRyYWNrPC9zcGFuPjxzdHJvbmc+SW5oZXJpdGVkIFdvcmxkPC9zdHJvbmc+PC9oZWFkZXI+PHAgY2xhc3NOYW1lPVwiYWJvdXQtZWRpdG9yLWhlbHBcIj5UaGlzIFNlY3Rpb24ga2VlcHMgdGhlIHByZXZpb3VzIFdvcmxkLiBDaG9vc2Ug4oCcQ3JlYXRlIFdvcmxkIGNsaXDigJ0gb25seSB3aGVuIHRoZSBzaGFwZSBzaG91bGQgY2hhbmdlIGhlcmUuPC9wPjxidXR0b24gdHlwZT1cImJ1dHRvblwiIGNsYXNzTmFtZT1cImFib3V0LWVkaXRvci13aWRlLWFjdGlvblwiIG9uQ2xpY2s9eygpID0+IHN0b3JlLmNvbW1pdCgnQ3JlYXRlIFdvcmxkIGNsaXAnLCAoZHJhZnQpID0+IHtcbiAgICAgIGRyYWZ0LnNlY3Rpb25zW3NlY3Rpb25JbmRleF0ud29ybGQgPSBjbG9uZUFib3V0TmFycmF0aXZlRG9jdW1lbnQoZHJhZnQuc2VjdGlvbnMuc2xpY2UoMCwgc2VjdGlvbkluZGV4KS5yZXZlcnNlKCkuZmluZCgoaXRlbSkgPT4gaXRlbS53b3JsZC5tb2RlID09PSAnc2V0Jyk/LndvcmxkIHx8IGRyYWZ0LnNlY3Rpb25zWzBdLndvcmxkKTtcbiAgICB9KX0+Q3JlYXRlIFdvcmxkIGNsaXA8L2J1dHRvbj48Lz47XG4gIH1cbiAgY29uc3Qgd29ybGQgPSBzZWN0aW9uLndvcmxkO1xuICBjb25zdCBzaGFwZSA9IEFCT1VUX05BUlJBVElWRV9TSEFQRV9ERUZJTklUSU9OU1t3b3JsZC5zaGFwZUlkXTtcbiAgY29uc3QgdHJhbnNpdGlvbkxpbWl0ID0gZ2V0QWJvdXROYXJyYXRpdmVXb3JsZFRyYW5zaXRpb25MaW1pdChzbmFwc2hvdC5jb21waWxlZFBsYW4sIHNlY3Rpb25JbmRleCk7XG4gIGNvbnN0IHRyYW5zaXRpb25NYXggPSBNYXRoLm1heCh0cmFuc2l0aW9uTGltaXQsIHdvcmxkLnRyYW5zaXRpb25Jbi5lbmQsIDEpO1xuICBjb25zdCB0cmFuc2l0aW9uRW5hYmxlZCA9IHdvcmxkLnRyYW5zaXRpb25Jbi50eXBlICE9PSAnY3V0JztcbiAgY29uc3QgY29ycmVzcG9uZGVuY2VFbmFibGVkID0gWydtb3JwaCcsICdkaXNzb2x2ZS1tb3JwaCddLmluY2x1ZGVzKHdvcmxkLnRyYW5zaXRpb25Jbi50eXBlKTtcbiAgY29uc3QgcHJldmlvdXNXb3JsZFNlY3Rpb24gPSBzbmFwc2hvdC5kb2N1bWVudC5zZWN0aW9uc1xuICAgIC5zbGljZSgwLCBzZWN0aW9uSW5kZXgpXG4gICAgLnJldmVyc2UoKVxuICAgIC5maW5kKChpdGVtKSA9PiBpdGVtLndvcmxkLm1vZGUgPT09ICdzZXQnKTtcbiAgY29uc3Qgc291cmNlU2hhcGUgPSBBQk9VVF9OQVJSQVRJVkVfU0hBUEVfREVGSU5JVElPTlNbcHJldmlvdXNXb3JsZFNlY3Rpb24/LndvcmxkLnNoYXBlSWQgfHwgd29ybGQuc2hhcGVJZF07XG4gIGNvbnN0IHByZXBhcmVkID0gcnVudGltZU1ldHJpY3M/LnByZXBhcmVkV29ybGRJZHM/LmluY2x1ZGVzKHNlY3Rpb24uaWQpO1xuICBjb25zdCBjb3JyZXNwb25kZW5jZVN0YXR1cyA9IHJ1bnRpbWVNZXRyaWNzPy5jb3JyZXNwb25kZW5jZVNlcXVlbmNlU3RhdGUgPT09ICdmYWlsZWQnXG4gICAgPyAnRmFpbGVkJ1xuICAgIDogcnVudGltZU1ldHJpY3M/LmNvcnJlc3BvbmRlbmNlU2VxdWVuY2VTdGF0ZSA9PT0gJ2xvYWRpbmcnXG4gICAgICA/ICdQcmVwYXJpbmcnXG4gICAgICA6IHByZXBhcmVkXG4gICAgICAgID8gcnVudGltZU1ldHJpY3M/LmNvcnJlc3BvbmRlbmNlRmFsbGJhY2sgJiYgcnVudGltZU1ldHJpY3M/LmNvcnJlc3BvbmRlbmNlVG9Xb3JsZElkID09PSBzZWN0aW9uLmlkXG4gICAgICAgICAgPyAnQmFzZWxpbmUgZmFsbGJhY2snXG4gICAgICAgICAgOiAnUmVhZHknXG4gICAgICAgIDogJ1ByZXBhcmluZyc7XG4gIGNvbnN0IHVwZGF0ZSA9IChsYWJlbCwgbXV0YXRlLCBjb2FsZXNjZUtleSA9IG51bGwpID0+IHN0b3JlLmNvbW1pdChsYWJlbCwgKGRyYWZ0KSA9PiBtdXRhdGUoZHJhZnQuc2VjdGlvbnNbc2VjdGlvbkluZGV4XS53b3JsZCksIHsgY29hbGVzY2VLZXksIHNlbGVjdGlvbjogc25hcHNob3Quc2VsZWN0aW9uIH0pO1xuICBjb25zdCB0cnlTaGFwZSA9IChzaGFwZUlkKSA9PiBzdG9yZS5iZWdpblRyeShgUmVwbGFjZSBTaGFwZSB3aXRoICR7QUJPVVRfTkFSUkFUSVZFX1NIQVBFX0RFRklOSVRJT05TW3NoYXBlSWRdLmxhYmVsfWAsIChkcmFmdCkgPT4ge1xuICAgIGNvbnN0IHRhcmdldCA9IGRyYWZ0LnNlY3Rpb25zW3NlY3Rpb25JbmRleF0ud29ybGQ7XG4gICAgdGFyZ2V0LnNoYXBlSWQgPSBzaGFwZUlkO1xuICAgIHRhcmdldC5zaGFwZVBhcmFtZXRlcnMgPSBPYmplY3QuZnJvbUVudHJpZXMoQUJPVVRfTkFSUkFUSVZFX1NIQVBFX0RFRklOSVRJT05TW3NoYXBlSWRdLnBhcmFtZXRlcnMubWFwKChjb250cm9sKSA9PiBbY29udHJvbC5pZCwgY29udHJvbC5pZCA9PT0gJ2RlbnNpdHknID8gMSA6IChjb250cm9sLm1pbiArIGNvbnRyb2wubWF4KSAvIDJdKSk7XG4gIH0pO1xuICByZXR1cm4gKFxuICAgIDw+XG4gICAgICA8aGVhZGVyPjxzcGFuPldvcmxkIGNsaXA8L3NwYW4+PHN0cm9uZz57c2hhcGU/LmxhYmVsIHx8IHdvcmxkLnNoYXBlSWR9PC9zdHJvbmc+PC9oZWFkZXI+XG4gICAgICA8ZGl2IGNsYXNzTmFtZT1cImFib3V0LWVkaXRvci1zaGFwZS1jYXRhbG9nXCI+XG4gICAgICAgIHtPYmplY3QudmFsdWVzKEFCT1VUX05BUlJBVElWRV9TSEFQRV9ERUZJTklUSU9OUykubWFwKChpdGVtKSA9PiAoXG4gICAgICAgICAgPGJ1dHRvbiB0eXBlPVwiYnV0dG9uXCIga2V5PXtpdGVtLmlkfSBkaXNhYmxlZD17c2VjdGlvbi5sb2NrZWR9IGNsYXNzTmFtZT17aXRlbS5pZCA9PT0gd29ybGQuc2hhcGVJZCA/ICdpcy1zZWxlY3RlZCcgOiAnJ30gb25DbGljaz17KCkgPT4gdHJ5U2hhcGUoaXRlbS5pZCl9PlxuICAgICAgICAgICAgPGkgLz48c3Bhbj48c3Ryb25nPntpdGVtLmxhYmVsfTwvc3Ryb25nPjxzbWFsbD5Db3N0IHtpdGVtLmNvc3R9IMK3IFBvaW50IGZpZWxkPC9zbWFsbD48L3NwYW4+XG4gICAgICAgICAgPC9idXR0b24+XG4gICAgICAgICkpfVxuICAgICAgPC9kaXY+XG4gICAgICB7c25hcHNob3QudHJ5U3RhdGUgPyA8ZGl2IGNsYXNzTmFtZT1cImFib3V0LWVkaXRvci10cnlcIj48c3Bhbj5Ucnlpbmcge3NuYXBzaG90LnRyeVN0YXRlLmxhYmVsfTwvc3Bhbj48YnV0dG9uIHR5cGU9XCJidXR0b25cIiBvbkNsaWNrPXsoKSA9PiBzdG9yZS5jYW5jZWxUcnkoKX0+Q2FuY2VsPC9idXR0b24+PGJ1dHRvbiB0eXBlPVwiYnV0dG9uXCIgY2xhc3NOYW1lPVwiaXMtcHJpbWFyeVwiIG9uQ2xpY2s9eygpID0+IHN0b3JlLmFwcGx5VHJ5KCl9PkFwcGx5PC9idXR0b24+PC9kaXY+IDogbnVsbH1cbiAgICAgIDxkZXRhaWxzIG9wZW4+PHN1bW1hcnk+U2hhcGUgcGFyYW1ldGVyczwvc3VtbWFyeT5cbiAgICAgICAgeyhzaGFwZT8ucGFyYW1ldGVycyB8fCBbXSkubWFwKChjb250cm9sKSA9PiA8TnVtYmVyUHJvcGVydHkga2V5PXtjb250cm9sLmlkfSBsYWJlbD17Y29udHJvbC5sYWJlbH0gdmFsdWU9e3dvcmxkLnNoYXBlUGFyYW1ldGVyc1tjb250cm9sLmlkXX0gbWluPXtjb250cm9sLm1pbn0gbWF4PXtjb250cm9sLm1heH0gc3RlcD17Y29udHJvbC5zdGVwfSB1bml0PXtjb250cm9sLnVuaXR9IG9uQ2hhbmdlPXsodmFsdWUpID0+IHVwZGF0ZShgQ2hhbmdlICR7Y29udHJvbC5sYWJlbH1gLCAoZHJhZnQpID0+IHsgZHJhZnQuc2hhcGVQYXJhbWV0ZXJzW2NvbnRyb2wuaWRdID0gdmFsdWU7IH0sIGB3b3JsZDoke3NlY3Rpb24uaWR9OiR7Y29udHJvbC5pZH1gKX0gLz4pfVxuICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cImFib3V0LWVkaXRvci1pbmxpbmUtYWN0aW9uc1wiPjxidXR0b24gdHlwZT1cImJ1dHRvblwiIG9uQ2xpY2s9eygpID0+IHVwZGF0ZSgnUmVzZWVkIFNoYXBlJywgKGRyYWZ0KSA9PiB7IGRyYWZ0LnNlZWQgPSBNYXRoLmZsb29yKE1hdGgucmFuZG9tKCkgKiAweGZmZmZmZmZmKTsgfSl9PlJlc2VlZDwvYnV0dG9uPjxjb2RlPnt3b3JsZC5zZWVkfTwvY29kZT48L2Rpdj5cbiAgICAgIDwvZGV0YWlscz5cbiAgICAgIDxkZXRhaWxzIG9wZW4+PHN1bW1hcnk+UGxhY2VtZW50PC9zdW1tYXJ5PlxuICAgICAgICA8TnVtYmVyUHJvcGVydHkgbGFiZWw9XCJEaXN0YW5jZSBhdCBlbnRyeVwiIHZhbHVlPXt3b3JsZC5lbnRyeURpc3RhbmNlV1V9IG1pbj17MC4yfSBtYXg9ezE2fSBzdGVwPXswLjA1fSB1bml0PVwiV1VcIiBvbkNoYW5nZT17KHZhbHVlKSA9PiB1cGRhdGUoJ01vdmUgV29ybGQnLCAoZHJhZnQpID0+IHsgZHJhZnQuZW50cnlEaXN0YW5jZVdVID0gdmFsdWU7IH0sIGB3b3JsZDoke3NlY3Rpb24uaWR9OmRpc3RhbmNlYCl9IC8+XG4gICAgICAgIDxOdW1iZXJQcm9wZXJ0eSBsYWJlbD1cIlNjYWxlXCIgdmFsdWU9e3dvcmxkLnRyYW5zZm9ybS5zY2FsZX0gbWluPXswLjF9IG1heD17M30gc3RlcD17MC4wMX0gb25DaGFuZ2U9eyh2YWx1ZSkgPT4gdXBkYXRlKCdTY2FsZSBXb3JsZCcsIChkcmFmdCkgPT4geyBkcmFmdC50cmFuc2Zvcm0uc2NhbGUgPSB2YWx1ZTsgfSwgYHdvcmxkOiR7c2VjdGlvbi5pZH06c2NhbGVgKX0gLz5cbiAgICAgIDwvZGV0YWlscz5cbiAgICAgIDxkZXRhaWxzIG9wZW4+PHN1bW1hcnk+VHJhbnNpdGlvbiBpbjwvc3VtbWFyeT5cbiAgICAgICAge3RyYW5zaXRpb25FbmFibGVkID8gPD5cbiAgICAgICAgICA8cCBjbGFzc05hbWU9XCJhYm91dC1lZGl0b3ItaGVscFwiPlRpbWluZyBpcyByZWxhdGl2ZSB0byB0aGlzIFNlY3Rpb246IDEgaXMgaXRzIGVuZDsgdmFsdWVzIGFib3ZlIDEgY29udGludWUgYWNyb3NzIGluaGVyaXRlZCBXb3JsZCBTZWN0aW9ucy4gVGhlIG5leHQgV29ybGQgYmVnaW5zIGF0IHt0cmFuc2l0aW9uTGltaXQudG9GaXhlZCgzKX0uPC9wPlxuICAgICAgICAgIDxOdW1iZXJQcm9wZXJ0eSBsYWJlbD1cIlN0YXJ0XCIgdmFsdWU9e3dvcmxkLnRyYW5zaXRpb25Jbi5zdGFydH0gbWluPXswfSBtYXg9e3RyYW5zaXRpb25NYXh9IHN0ZXA9ezAuMDA1fSB1bml0PVwiw5cgc2VjdGlvblwiIG9uQ2hhbmdlPXsodmFsdWUpID0+IHVwZGF0ZSgnQ2hhbmdlIHRyYW5zaXRpb24gc3RhcnQnLCAoZHJhZnQpID0+IHsgZHJhZnQudHJhbnNpdGlvbkluLnN0YXJ0ID0gTWF0aC5taW4odmFsdWUsIGRyYWZ0LnRyYW5zaXRpb25Jbi5lbmQpOyB9KX0gLz5cbiAgICAgICAgICA8TnVtYmVyUHJvcGVydHkgbGFiZWw9XCJFbmRcIiB2YWx1ZT17d29ybGQudHJhbnNpdGlvbkluLmVuZH0gbWluPXswfSBtYXg9e3RyYW5zaXRpb25NYXh9IHN0ZXA9ezAuMDA1fSB1bml0PVwiw5cgc2VjdGlvblwiIG9uQ2hhbmdlPXsodmFsdWUpID0+IHVwZGF0ZSgnQ2hhbmdlIHRyYW5zaXRpb24gZW5kJywgKGRyYWZ0KSA9PiB7IGRyYWZ0LnRyYW5zaXRpb25Jbi5lbmQgPSBNYXRoLm1heCh2YWx1ZSwgZHJhZnQudHJhbnNpdGlvbkluLnN0YXJ0KTsgfSl9IC8+XG4gICAgICAgICAgPFByb3BlcnR5IGxhYmVsPVwiVHlwZVwiPjxzZWxlY3QgdmFsdWU9e3dvcmxkLnRyYW5zaXRpb25Jbi50eXBlfSBvbkNoYW5nZT17KGV2ZW50KSA9PiB1cGRhdGUoJ0NoYW5nZSB0cmFuc2l0aW9uIHR5cGUnLCAoZHJhZnQpID0+IHsgZHJhZnQudHJhbnNpdGlvbkluLnR5cGUgPSBldmVudC50YXJnZXQudmFsdWU7IH0pfT48b3B0aW9uIHZhbHVlPVwibW9ycGhcIj5Nb3JwaDwvb3B0aW9uPjxvcHRpb24gdmFsdWU9XCJkaXNzb2x2ZS1tb3JwaFwiPkRpc3NvbHZlIG1vcnBoPC9vcHRpb24+PG9wdGlvbiB2YWx1ZT1cImNyb3NzZmFkZVwiPkNyb3NzZmFkZTwvb3B0aW9uPjxvcHRpb24gdmFsdWU9XCJob2xkXCI+SG9sZDwvb3B0aW9uPjwvc2VsZWN0PjwvUHJvcGVydHk+XG4gICAgICAgICAgPFByb3BlcnR5IGxhYmVsPVwiRWFzaW5nXCI+PHNlbGVjdCB2YWx1ZT17d29ybGQudHJhbnNpdGlvbkluLmVhc2luZ30gb25DaGFuZ2U9eyhldmVudCkgPT4gdXBkYXRlKCdDaGFuZ2UgdHJhbnNpdGlvbiBlYXNpbmcnLCAoZHJhZnQpID0+IHsgZHJhZnQudHJhbnNpdGlvbkluLmVhc2luZyA9IGV2ZW50LnRhcmdldC52YWx1ZTsgfSl9PjxvcHRpb24gdmFsdWU9XCJsaW5lYXJcIj5MaW5lYXI8L29wdGlvbj48b3B0aW9uIHZhbHVlPVwic21vb3Roc3RlcFwiPlNtb290aHN0ZXA8L29wdGlvbj48b3B0aW9uIHZhbHVlPVwiZWFzZS1pblwiPkVhc2UgaW48L29wdGlvbj48b3B0aW9uIHZhbHVlPVwiZWFzZS1vdXRcIj5FYXNlIG91dDwvb3B0aW9uPjxvcHRpb24gdmFsdWU9XCJlYXNlLWluLW91dFwiPkVhc2UgaW4gb3V0PC9vcHRpb24+PG9wdGlvbiB2YWx1ZT1cImhvbGRcIj5Ib2xkPC9vcHRpb24+PC9zZWxlY3Q+PC9Qcm9wZXJ0eT5cbiAgICAgICAgICA8cCBjbGFzc05hbWU9XCJhYm91dC1lZGl0b3ItaGVscFwiPk1hcHMge3NvdXJjZVNoYXBlPy5sYWJlbCB8fCAncHJldmlvdXMgU2hhcGUnfSDihpIge3NoYXBlPy5sYWJlbCB8fCB3b3JsZC5zaGFwZUlkfS48L3A+XG4gICAgICAgICAgPFByb3BlcnR5IGxhYmVsPVwiQ29ycmVzcG9uZGVuY2VcIj48c2VsZWN0IGFyaWEtbGFiZWw9XCJDb3JyZXNwb25kZW5jZVwiIHZhbHVlPXt3b3JsZC50cmFuc2l0aW9uSW4uY29ycmVzcG9uZGVuY2V9IGRpc2FibGVkPXshY29ycmVzcG9uZGVuY2VFbmFibGVkfSB0aXRsZT17Y29ycmVzcG9uZGVuY2VFbmFibGVkID8gJ0Nob29zZSBob3cgc291cmNlIHBvaW50cyBhcmUgYXNzaWduZWQgdG8gdGFyZ2V0IHBvaW50cy4nIDogJ0NvcnJlc3BvbmRlbmNlIGFwcGxpZXMgdG8gTW9ycGggYW5kIERpc3NvbHZlIG1vcnBoIHRyYW5zaXRpb25zLid9IG9uQ2hhbmdlPXsoZXZlbnQpID0+IHVwZGF0ZSgnQ2hhbmdlIGNvcnJlc3BvbmRlbmNlJywgKGRyYWZ0KSA9PiB7IGRyYWZ0LnRyYW5zaXRpb25Jbi5jb3JyZXNwb25kZW5jZSA9IGV2ZW50LnRhcmdldC52YWx1ZTsgfSl9PntBQk9VVF9OQVJSQVRJVkVfQ09SUkVTUE9OREVOQ0VfTU9ERVMubWFwKChtb2RlKSA9PiA8b3B0aW9uIHZhbHVlPXttb2RlfSBrZXk9e21vZGV9PntDT1JSRVNQT05ERU5DRV9MQUJFTFNbbW9kZV0gfHwgbW9kZX08L29wdGlvbj4pfTwvc2VsZWN0PjwvUHJvcGVydHk+XG4gICAgICAgICAgPHAgY2xhc3NOYW1lPVwiYWJvdXQtZWRpdG9yLWhlbHBcIiByb2xlPVwic3RhdHVzXCIgYXJpYS1saXZlPVwicG9saXRlXCI+Q29ycmVzcG9uZGVuY2U6IHtjb3JyZXNwb25kZW5jZVN0YXR1c317cHJlcGFyZWQgJiYgcnVudGltZU1ldHJpY3M/LmNvcnJlc3BvbmRlbmNlVG9Xb3JsZElkID09PSBzZWN0aW9uLmlkICYmIE51bWJlci5pc0Zpbml0ZShydW50aW1lTWV0cmljcz8uY29ycmVzcG9uZGVuY2VJbXByb3ZlbWVudCkgPyBgIMK3ICR7TWF0aC5yb3VuZChydW50aW1lTWV0cmljcy5jb3JyZXNwb25kZW5jZUltcHJvdmVtZW50ICogMTAwKX0lIFJNUyBpbXByb3ZlbWVudGAgOiAnJ30uPC9wPlxuICAgICAgICAgIDxidXR0b24gdHlwZT1cImJ1dHRvblwiIGNsYXNzTmFtZT1cImFib3V0LWVkaXRvci1kYW5nZXJcIiBvbkNsaWNrPXsoKSA9PiBzdG9yZS5jb21taXQoJ1JlbW92ZSBXb3JsZCB0cmFuc2l0aW9uJywgKGRyYWZ0KSA9PiB7XG4gICAgICAgICAgICBjb25zdCB0cmFuc2l0aW9uID0gZHJhZnQuc2VjdGlvbnNbc2VjdGlvbkluZGV4XS53b3JsZC50cmFuc2l0aW9uSW47XG4gICAgICAgICAgICB0cmFuc2l0aW9uLnN0YXJ0ID0gMDtcbiAgICAgICAgICAgIHRyYW5zaXRpb24uZW5kID0gMDtcbiAgICAgICAgICAgIHRyYW5zaXRpb24udHlwZSA9ICdjdXQnO1xuICAgICAgICAgIH0sIHsgc2VsZWN0aW9uOiB7IHR5cGU6ICd3b3JsZCcsIHNlY3Rpb25JZDogc2VjdGlvbi5pZCB9IH0pfT5SZW1vdmUgdHJhbnNpdGlvbiBrZXlmcmFtZXM8L2J1dHRvbj5cbiAgICAgICAgPC8+IDogPD5cbiAgICAgICAgICA8cCBjbGFzc05hbWU9XCJhYm91dC1lZGl0b3ItaGVscFwiPlRoaXMgV29ybGQgY3V0cyBpbiBhdCB0aGUgU2VjdGlvbiBib3VuZGFyeSBhbmQgaGFzIG5vIHRyYW5zaXRpb24ga2V5ZnJhbWVzLjwvcD5cbiAgICAgICAgICA8YnV0dG9uIHR5cGU9XCJidXR0b25cIiBjbGFzc05hbWU9XCJhYm91dC1lZGl0b3Itd2lkZS1hY3Rpb25cIiBvbkNsaWNrPXsoKSA9PiBzdG9yZS5jb21taXQoJ0FkZCBXb3JsZCB0cmFuc2l0aW9uJywgKGRyYWZ0KSA9PiB7XG4gICAgICAgICAgICBjb25zdCB0cmFuc2l0aW9uID0gZHJhZnQuc2VjdGlvbnNbc2VjdGlvbkluZGV4XS53b3JsZC50cmFuc2l0aW9uSW47XG4gICAgICAgICAgICB0cmFuc2l0aW9uLnN0YXJ0ID0gTWF0aC5taW4oMC4wOCwgdHJhbnNpdGlvbkxpbWl0KTtcbiAgICAgICAgICAgIHRyYW5zaXRpb24uZW5kID0gTWF0aC5taW4oMC42OCwgdHJhbnNpdGlvbkxpbWl0KTtcbiAgICAgICAgICAgIHRyYW5zaXRpb24udHlwZSA9ICdtb3JwaCc7XG4gICAgICAgICAgfSwgeyBzZWxlY3Rpb246IHsgdHlwZTogJ3dvcmxkJywgc2VjdGlvbklkOiBzZWN0aW9uLmlkIH0gfSl9PkFkZCB0cmFuc2l0aW9uIGtleWZyYW1lczwvYnV0dG9uPlxuICAgICAgICA8Lz59XG4gICAgICA8L2RldGFpbHM+XG4gICAgICA8ZGV0YWlscyBvcGVuPjxzdW1tYXJ5Pk1vZGlmaWVyIHN0YWNrPC9zdW1tYXJ5PlxuICAgICAgICB7d29ybGQubW9kaWZpZXJzLm1hcCgoaXRlbSwgbW9kaWZpZXJJbmRleCkgPT4ge1xuICAgICAgICAgIGNvbnN0IGRlZmluaXRpb24gPSBBQk9VVF9OQVJSQVRJVkVfTU9ESUZJRVJfREVGSU5JVElPTlNbaXRlbS5pZF07XG4gICAgICAgICAgY29uc3QgbW92ZU1vZGlmaWVyID0gKGRpcmVjdGlvbikgPT4gdXBkYXRlKCdSZW9yZGVyIG1vZGlmaWVyJywgKGRyYWZ0KSA9PiB7XG4gICAgICAgICAgICBjb25zdCBuZXh0SW5kZXggPSBtb2RpZmllckluZGV4ICsgZGlyZWN0aW9uO1xuICAgICAgICAgICAgaWYgKG5leHRJbmRleCA8IDAgfHwgbmV4dEluZGV4ID49IGRyYWZ0Lm1vZGlmaWVycy5sZW5ndGgpIHJldHVybjtcbiAgICAgICAgICAgIGNvbnN0IFttb3ZlZF0gPSBkcmFmdC5tb2RpZmllcnMuc3BsaWNlKG1vZGlmaWVySW5kZXgsIDEpO1xuICAgICAgICAgICAgZHJhZnQubW9kaWZpZXJzLnNwbGljZShuZXh0SW5kZXgsIDAsIG1vdmVkKTtcbiAgICAgICAgICB9KTtcbiAgICAgICAgICByZXR1cm4gPGRpdiBjbGFzc05hbWU9XCJhYm91dC1lZGl0b3ItbW9kaWZpZXJcIiBrZXk9e2Ake2l0ZW0uaWR9LSR7bW9kaWZpZXJJbmRleH1gfT48ZGl2PjxsYWJlbD48aW5wdXQgdHlwZT1cImNoZWNrYm94XCIgY2hlY2tlZD17aXRlbS5lbmFibGVkfSBvbkNoYW5nZT17KGV2ZW50KSA9PiB1cGRhdGUoYFRvZ2dsZSAke2RlZmluaXRpb24/LmxhYmVsfWAsIChkcmFmdCkgPT4geyBkcmFmdC5tb2RpZmllcnNbbW9kaWZpZXJJbmRleF0uZW5hYmxlZCA9IGV2ZW50LnRhcmdldC5jaGVja2VkOyB9KX0gLz57ZGVmaW5pdGlvbj8ubGFiZWwgfHwgaXRlbS5pZH08L2xhYmVsPjxzcGFuPjxidXR0b24gdHlwZT1cImJ1dHRvblwiIGRpc2FibGVkPXttb2RpZmllckluZGV4ID09PSAwfSBvbkNsaWNrPXsoKSA9PiBtb3ZlTW9kaWZpZXIoLTEpfSBhcmlhLWxhYmVsPVwiTW92ZSBtb2RpZmllciB1cFwiPuKGkTwvYnV0dG9uPjxidXR0b24gdHlwZT1cImJ1dHRvblwiIGRpc2FibGVkPXttb2RpZmllckluZGV4ID09PSB3b3JsZC5tb2RpZmllcnMubGVuZ3RoIC0gMX0gb25DbGljaz17KCkgPT4gbW92ZU1vZGlmaWVyKDEpfSBhcmlhLWxhYmVsPVwiTW92ZSBtb2RpZmllciBkb3duXCI+4oaTPC9idXR0b24+IENvc3Qge2RlZmluaXRpb24/LmNvc3QgfHwgJz8nfTwvc3Bhbj48L2Rpdj57KGRlZmluaXRpb24/LnBhcmFtZXRlcnMgfHwgW10pLm1hcCgoY29udHJvbCkgPT4gY29udHJvbC50eXBlID09PSAncmFuZ2UnID8gPE51bWJlclByb3BlcnR5IGtleT17Y29udHJvbC5pZH0gbGFiZWw9e2NvbnRyb2wubGFiZWx9IHZhbHVlPXtpdGVtLnBhcmFtZXRlcnNbY29udHJvbC5pZF19IG1pbj17Y29udHJvbC5taW59IG1heD17Y29udHJvbC5tYXh9IHN0ZXA9e2NvbnRyb2wuc3RlcH0gdW5pdD17Y29udHJvbC51bml0fSBvbkNoYW5nZT17KHZhbHVlKSA9PiB1cGRhdGUoYENoYW5nZSAke2NvbnRyb2wubGFiZWx9YCwgKGRyYWZ0KSA9PiB7IGRyYWZ0Lm1vZGlmaWVyc1ttb2RpZmllckluZGV4XS5wYXJhbWV0ZXJzW2NvbnRyb2wuaWRdID0gdmFsdWU7IH0sIGBtb2RpZmllcjoke3NlY3Rpb24uaWR9OiR7bW9kaWZpZXJJbmRleH06JHtjb250cm9sLmlkfWApfSAvPiA6IDxQcm9wZXJ0eSBrZXk9e2NvbnRyb2wuaWR9IGxhYmVsPXtjb250cm9sLmxhYmVsfT48c2VsZWN0IHZhbHVlPXtpdGVtLnBhcmFtZXRlcnNbY29udHJvbC5pZF19IG9uQ2hhbmdlPXsoZXZlbnQpID0+IHVwZGF0ZShgQ2hhbmdlICR7Y29udHJvbC5sYWJlbH1gLCAoZHJhZnQpID0+IHsgZHJhZnQubW9kaWZpZXJzW21vZGlmaWVySW5kZXhdLnBhcmFtZXRlcnNbY29udHJvbC5pZF0gPSBldmVudC50YXJnZXQudmFsdWU7IH0pfT57Y29udHJvbC5vcHRpb25zLm1hcCgob3B0aW9uKSA9PiA8b3B0aW9uIGtleT17b3B0aW9ufT57b3B0aW9ufTwvb3B0aW9uPil9PC9zZWxlY3Q+PC9Qcm9wZXJ0eT4pfTwvZGl2PjtcbiAgICAgICAgfSl9XG4gICAgICA8L2RldGFpbHM+XG4gICAgPC8+XG4gICk7XG59XG5cbmZ1bmN0aW9uIERpYWdub3N0aWNzKHsgZGlhZ25vc3RpY3MgfSkge1xuICBpZiAoIWRpYWdub3N0aWNzLmxlbmd0aCkgcmV0dXJuIDxkaXYgY2xhc3NOYW1lPVwiYWJvdXQtZWRpdG9yLWRpYWdub3N0aWNzIGlzLWNsZWFyXCI+PENoZWNrIGFyaWEtaGlkZGVuPVwidHJ1ZVwiIC8+IE5vIGRpYWdub3N0aWNzPC9kaXY+O1xuICByZXR1cm4gPGRpdiBjbGFzc05hbWU9XCJhYm91dC1lZGl0b3ItZGlhZ25vc3RpY3NcIj57ZGlhZ25vc3RpY3MubWFwKChpdGVtLCBpbmRleCkgPT4ge1xuICAgIGNvbnN0IERpYWdub3N0aWNJY29uID0gaXRlbS5sZXZlbCA9PT0gJ2Vycm9yJyA/IENpcmNsZUFsZXJ0IDogSW5mbztcbiAgICByZXR1cm4gPGRpdiBrZXk9e2Ake2l0ZW0uY29kZX0tJHtpdGVtLnBhdGh9LSR7aW5kZXh9YH0gY2xhc3NOYW1lPXtgaXMtJHtpdGVtLmxldmVsfWB9PjxEaWFnbm9zdGljSWNvbiBhcmlhLWhpZGRlbj1cInRydWVcIiAvPjxzcGFuPjxzdHJvbmc+e2l0ZW0ubWVzc2FnZX08L3N0cm9uZz48c21hbGw+e2l0ZW0ucGF0aH08L3NtYWxsPjwvc3Bhbj48L2Rpdj47XG4gIH0pfTwvZGl2Pjtcbn1cblxuZnVuY3Rpb24gSW5zcGVjdG9yKHsgc3RvcmUsIHNuYXBzaG90LCB0aW1lbGluZU9wZW4sIHJ1bnRpbWVNZXRyaWNzIH0pIHtcbiAgY29uc3QgaW5zcGVjdG9yUmVmID0gdXNlUmVmKG51bGwpO1xuICBjb25zdCBkcmFnUmVmID0gdXNlUmVmKG51bGwpO1xuICBjb25zdCBsYXN0SGVhZGVyQ2xpY2tSZWYgPSB1c2VSZWYobnVsbCk7XG4gIGNvbnN0IFtwb3NpdGlvbiwgc2V0UG9zaXRpb25dID0gdXNlU3RhdGUobnVsbCk7XG4gIGNvbnN0IFtkcmFnZ2luZywgc2V0RHJhZ2dpbmddID0gdXNlU3RhdGUoZmFsc2UpO1xuICBjb25zdCBzZWN0aW9uID0gZ2V0U2VjdGlvbihzbmFwc2hvdC5kb2N1bWVudCwgc25hcHNob3Quc2VsZWN0aW9uKTtcbiAgbGV0IGNvbnRlbnQgPSA8U2VjdGlvbkluc3BlY3RvciBzdG9yZT17c3RvcmV9IHNuYXBzaG90PXtzbmFwc2hvdH0gc2VjdGlvbj17c2VjdGlvbn0gLz47XG4gIGlmIChzbmFwc2hvdC5zZWxlY3Rpb24udHlwZSA9PT0gJ3NlcXVlbmNlJykgY29udGVudCA9IDxTZXF1ZW5jZUluc3BlY3RvciBzdG9yZT17c3RvcmV9IHNuYXBzaG90PXtzbmFwc2hvdH0gLz47XG4gIGlmIChzbmFwc2hvdC5zZWxlY3Rpb24udHlwZSA9PT0gJ2N1ZScpIGNvbnRlbnQgPSA8Q3VlSW5zcGVjdG9yIHN0b3JlPXtzdG9yZX0gc25hcHNob3Q9e3NuYXBzaG90fSBzZWN0aW9uPXtzZWN0aW9ufSAvPjtcbiAgaWYgKHNuYXBzaG90LnNlbGVjdGlvbi50eXBlID09PSAnZGlzY2lwbGluZS1yZXZlYWwnKSBjb250ZW50ID0gPERpc2NpcGxpbmVSZXZlYWxJbnNwZWN0b3Igc3RvcmU9e3N0b3JlfSBzbmFwc2hvdD17c25hcHNob3R9IHNlY3Rpb249e3NlY3Rpb259IC8+O1xuICBpZiAoc25hcHNob3Quc2VsZWN0aW9uLnR5cGUgPT09ICdjYW1lcmEta2V5JykgY29udGVudCA9IDxDYW1lcmFJbnNwZWN0b3Igc3RvcmU9e3N0b3JlfSBzbmFwc2hvdD17c25hcHNob3R9IHNlY3Rpb249e3NlY3Rpb259IC8+O1xuICBpZiAoc25hcHNob3Quc2VsZWN0aW9uLnR5cGUgPT09ICd3b3JsZCcpIGNvbnRlbnQgPSA8V29ybGRJbnNwZWN0b3Igc3RvcmU9e3N0b3JlfSBzbmFwc2hvdD17c25hcHNob3R9IHNlY3Rpb249e3NlY3Rpb259IHJ1bnRpbWVNZXRyaWNzPXtydW50aW1lTWV0cmljc30gLz47XG4gIGlmIChzbmFwc2hvdC5zZWxlY3Rpb24udHlwZSA9PT0gJ2ludGVyYWN0aW9uJykgY29udGVudCA9IDxTZWN0aW9uSW5zcGVjdG9yIHN0b3JlPXtzdG9yZX0gc25hcHNob3Q9e3NuYXBzaG90fSBzZWN0aW9uPXtzZWN0aW9ufSAvPjtcblxuICB1c2VFZmZlY3QoKCkgPT4ge1xuICAgIGNvbnN0IGtlZXBJbkJvdW5kcyA9ICgpID0+IHtcbiAgICAgIGlmICh3aW5kb3cuaW5uZXJXaWR0aCA8IDc2MCkge1xuICAgICAgICBzZXRQb3NpdGlvbihudWxsKTtcbiAgICAgICAgcmV0dXJuO1xuICAgICAgfVxuICAgICAgc2V0UG9zaXRpb24oKGN1cnJlbnQpID0+IChcbiAgICAgICAgY3VycmVudCAmJiBpbnNwZWN0b3JSZWYuY3VycmVudFxuICAgICAgICAgID8gY2xhbXBJbnNwZWN0b3JQb3NpdGlvbihpbnNwZWN0b3JSZWYuY3VycmVudCwgY3VycmVudCwgdGltZWxpbmVPcGVuKVxuICAgICAgICAgIDogY3VycmVudFxuICAgICAgKSk7XG4gICAgfTtcbiAgICBrZWVwSW5Cb3VuZHMoKTtcbiAgICB3aW5kb3cuYWRkRXZlbnRMaXN0ZW5lcigncmVzaXplJywga2VlcEluQm91bmRzKTtcbiAgICByZXR1cm4gKCkgPT4gd2luZG93LnJlbW92ZUV2ZW50TGlzdGVuZXIoJ3Jlc2l6ZScsIGtlZXBJbkJvdW5kcyk7XG4gIH0sIFt0aW1lbGluZU9wZW5dKTtcblxuICBjb25zdCBiZWdpbkRyYWcgPSAoZXZlbnQpID0+IHtcbiAgICBpZiAoZXZlbnQuYnV0dG9uICE9PSAwIHx8IHdpbmRvdy5pbm5lcldpZHRoIDwgNzYwIHx8ICFldmVudC50YXJnZXQuY2xvc2VzdCgnaGVhZGVyJykpIHJldHVybjtcbiAgICBjb25zdCBpbnNwZWN0b3IgPSBpbnNwZWN0b3JSZWYuY3VycmVudDtcbiAgICBpZiAoIWluc3BlY3RvcikgcmV0dXJuO1xuICAgIGNvbnN0IHJlY3QgPSBpbnNwZWN0b3IuZ2V0Qm91bmRpbmdDbGllbnRSZWN0KCk7XG4gICAgY29uc3QgeyBtaW5Ub3AsIG1heEJvdHRvbSB9ID0gZ2V0SW5zcGVjdG9yVmVydGljYWxCb3VuZHMoaW5zcGVjdG9yLCB0aW1lbGluZU9wZW4pO1xuICAgIGNvbnN0IGF2YWlsYWJsZUhlaWdodCA9IG1heEJvdHRvbSAtIG1pblRvcDtcbiAgICBjb25zdCBmbG9hdGluZ0hlaWdodCA9IE1hdGgubWluKHJlY3QuaGVpZ2h0LCA1NjAsIE1hdGgubWF4KDI0MCwgYXZhaWxhYmxlSGVpZ2h0ICogMC43MikpO1xuICAgIGNvbnN0IHN0YXJ0ID0gY2xhbXBJbnNwZWN0b3JQb3NpdGlvbihpbnNwZWN0b3IsIHtcbiAgICAgIGxlZnQ6IHJlY3QubGVmdCxcbiAgICAgIHRvcDogcmVjdC50b3AsXG4gICAgICB3aWR0aDogcmVjdC53aWR0aCxcbiAgICAgIGhlaWdodDogZmxvYXRpbmdIZWlnaHQsXG4gICAgfSwgdGltZWxpbmVPcGVuKTtcbiAgICBkcmFnUmVmLmN1cnJlbnQgPSB7XG4gICAgICBwb2ludGVySWQ6IGV2ZW50LnBvaW50ZXJJZCxcbiAgICAgIG9yaWdpblg6IGV2ZW50LmNsaWVudFgsXG4gICAgICBvcmlnaW5ZOiBldmVudC5jbGllbnRZLFxuICAgICAgc3RhcnQsXG4gICAgICBtb3ZlZDogZmFsc2UsXG4gICAgfTtcbiAgICBpbnNwZWN0b3Iuc2V0UG9pbnRlckNhcHR1cmUoZXZlbnQucG9pbnRlcklkKTtcbiAgfTtcblxuICBjb25zdCBtb3ZlRHJhZyA9IChldmVudCkgPT4ge1xuICAgIGNvbnN0IGRyYWcgPSBkcmFnUmVmLmN1cnJlbnQ7XG4gICAgY29uc3QgaW5zcGVjdG9yID0gaW5zcGVjdG9yUmVmLmN1cnJlbnQ7XG4gICAgaWYgKCFkcmFnIHx8ICFpbnNwZWN0b3IgfHwgZHJhZy5wb2ludGVySWQgIT09IGV2ZW50LnBvaW50ZXJJZCkgcmV0dXJuO1xuICAgIGNvbnN0IGRlbHRhWCA9IGV2ZW50LmNsaWVudFggLSBkcmFnLm9yaWdpblg7XG4gICAgY29uc3QgZGVsdGFZID0gZXZlbnQuY2xpZW50WSAtIGRyYWcub3JpZ2luWTtcbiAgICBpZiAoIWRyYWcubW92ZWQgJiYgTWF0aC5oeXBvdChkZWx0YVgsIGRlbHRhWSkgPCAzKSByZXR1cm47XG4gICAgZHJhZy5tb3ZlZCA9IHRydWU7XG4gICAgc2V0RHJhZ2dpbmcodHJ1ZSk7XG4gICAgc2V0UG9zaXRpb24oY2xhbXBJbnNwZWN0b3JQb3NpdGlvbihpbnNwZWN0b3IsIHtcbiAgICAgIC4uLmRyYWcuc3RhcnQsXG4gICAgICBsZWZ0OiBkcmFnLnN0YXJ0LmxlZnQgKyBkZWx0YVgsXG4gICAgICB0b3A6IGRyYWcuc3RhcnQudG9wICsgZGVsdGFZLFxuICAgIH0sIHRpbWVsaW5lT3BlbikpO1xuICB9O1xuXG4gIGNvbnN0IGVuZERyYWcgPSAoZXZlbnQpID0+IHtcbiAgICBjb25zdCBkcmFnID0gZHJhZ1JlZi5jdXJyZW50O1xuICAgIGlmIChkcmFnPy5wb2ludGVySWQgIT09IGV2ZW50LnBvaW50ZXJJZCkgcmV0dXJuO1xuICAgIGlmICghZHJhZy5tb3ZlZCkge1xuICAgICAgY29uc3Qgbm93ID0gcGVyZm9ybWFuY2Uubm93KCk7XG4gICAgICBjb25zdCBwcmV2aW91cyA9IGxhc3RIZWFkZXJDbGlja1JlZi5jdXJyZW50O1xuICAgICAgaWYgKHByZXZpb3VzICYmIG5vdyAtIHByZXZpb3VzLnRpbWUgPCAzNjBcbiAgICAgICAgJiYgTWF0aC5oeXBvdChldmVudC5jbGllbnRYIC0gcHJldmlvdXMueCwgZXZlbnQuY2xpZW50WSAtIHByZXZpb3VzLnkpIDwgNikge1xuICAgICAgICBzZXRQb3NpdGlvbihudWxsKTtcbiAgICAgICAgbGFzdEhlYWRlckNsaWNrUmVmLmN1cnJlbnQgPSBudWxsO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgbGFzdEhlYWRlckNsaWNrUmVmLmN1cnJlbnQgPSB7IHRpbWU6IG5vdywgeDogZXZlbnQuY2xpZW50WCwgeTogZXZlbnQuY2xpZW50WSB9O1xuICAgICAgfVxuICAgIH1cbiAgICBkcmFnUmVmLmN1cnJlbnQgPSBudWxsO1xuICAgIHNldERyYWdnaW5nKGZhbHNlKTtcbiAgICBpZiAoaW5zcGVjdG9yUmVmLmN1cnJlbnQ/Lmhhc1BvaW50ZXJDYXB0dXJlKGV2ZW50LnBvaW50ZXJJZCkpIHtcbiAgICAgIGluc3BlY3RvclJlZi5jdXJyZW50LnJlbGVhc2VQb2ludGVyQ2FwdHVyZShldmVudC5wb2ludGVySWQpO1xuICAgIH1cbiAgfTtcblxuICBjb25zdCByZXNldFBvc2l0aW9uID0gKCkgPT4gc2V0UG9zaXRpb24obnVsbCk7XG5cbiAgcmV0dXJuIChcbiAgICA8YXNpZGVcbiAgICAgIHJlZj17aW5zcGVjdG9yUmVmfVxuICAgICAgY2xhc3NOYW1lPXtgYWJvdXQtZWRpdG9yLWluc3BlY3RvciR7ZHJhZ2dpbmcgPyAnIGlzLWRyYWdnaW5nJyA6ICcnfWB9XG4gICAgICBkYXRhLWZsb2F0aW5nPXtwb3NpdGlvbiA/ICd0cnVlJyA6ICdmYWxzZSd9XG4gICAgICBzdHlsZT17cG9zaXRpb24gPyB7XG4gICAgICAgIGxlZnQ6IHBvc2l0aW9uLmxlZnQsXG4gICAgICAgIHRvcDogcG9zaXRpb24udG9wLFxuICAgICAgICByaWdodDogJ2F1dG8nLFxuICAgICAgICBib3R0b206ICdhdXRvJyxcbiAgICAgICAgd2lkdGg6IHBvc2l0aW9uLndpZHRoLFxuICAgICAgICBoZWlnaHQ6IHBvc2l0aW9uLmhlaWdodCxcbiAgICAgIH0gOiB1bmRlZmluZWR9XG4gICAgICBvblBvaW50ZXJEb3duPXtiZWdpbkRyYWd9XG4gICAgICBvblBvaW50ZXJNb3ZlPXttb3ZlRHJhZ31cbiAgICAgIG9uUG9pbnRlclVwPXtlbmREcmFnfVxuICAgICAgb25Qb2ludGVyQ2FuY2VsPXtlbmREcmFnfVxuICAgICAgb25Eb3VibGVDbGljaz17cmVzZXRQb3NpdGlvbn1cbiAgICA+PGRpdiBjbGFzc05hbWU9XCJhYm91dC1lZGl0b3ItaW5zcGVjdG9yLXNjcm9sbFwiPntjb250ZW50fTxEaWFnbm9zdGljcyBkaWFnbm9zdGljcz17c25hcHNob3QuZGlhZ25vc3RpY3N9IC8+PC9kaXY+PC9hc2lkZT5cbiAgKTtcbn1cblxuZnVuY3Rpb24gQ2FtZXJhUGF0aE92ZXJsYXkoeyBzbmFwc2hvdCB9KSB7XG4gIGNvbnN0IHNlY3Rpb25zID0gc25hcHNob3QuY29tcGlsZWRQbGFuPy5zZWN0aW9ucyB8fCBbXTtcbiAgY29uc3QgdG90YWwgPSBzbmFwc2hvdC5jb21waWxlZFBsYW4/Lm1heFN0b3J5V1UgfHwgMTtcbiAgcmV0dXJuIChcbiAgICA8ZGl2IGNsYXNzTmFtZT1cImFib3V0LWVkaXRvci1wYXRoLW92ZXJsYXlcIiBhcmlhLWxhYmVsPVwiQ2FtZXJhIHBhdGggb3ZlcmxheVwiPlxuICAgICAgPGRpdj48c3Ryb25nPlBhdGggwrcgY29uc3RhbnQgY2FkZW5jZTwvc3Ryb25nPjxzcGFuPntmb3JtYXRXVShzbmFwc2hvdC50cmFuc3BvcnQuc3RvcnlXVSl9IC8ge2Zvcm1hdFdVKHRvdGFsKX08L3NwYW4+PC9kaXY+XG4gICAgICA8c3ZnIHZpZXdCb3g9XCIwIDAgMjQwIDExMlwiIHJvbGU9XCJpbWdcIiBhcmlhLWxhYmVsPVwiQ2FtZXJhIGFuZCBXb3JsZCBhbmNob3JzIG92ZXIgc3RvcnkgZGlzdGFuY2VcIj5cbiAgICAgICAgPHBhdGggZD1cIk0xOCA1NiBIMjIyXCIgLz5cbiAgICAgICAge3NlY3Rpb25zLm1hcCgoc2VjdGlvbikgPT4ge1xuICAgICAgICAgIGNvbnN0IHggPSAxOCArICgoc2VjdGlvbi5zdGFydFdVIC8gdG90YWwpICogMjA0KTtcbiAgICAgICAgICByZXR1cm4gPGcga2V5PXtzZWN0aW9uLmlkfSB0cmFuc2Zvcm09e2B0cmFuc2xhdGUoJHt4fSA1NilgfT48bGluZSB5MT1cIi0xMlwiIHkyPVwiMTJcIiAvPjxjaXJjbGUgcj17c2VjdGlvbi53b3JsZFN0YXRlPy5jaGFuZ2VzV29ybGQgPyA0IDogMn0gLz48dGl0bGU+e3NlY3Rpb24ubGFiZWx9e3NlY3Rpb24ud29ybGRTdGF0ZT8uY2hhbmdlc1dvcmxkID8gYCDCtyAke3NlY3Rpb24ud29ybGRTdGF0ZS5hY3RpdmVXb3JsZC5zaGFwZUlkfWAgOiAnJ308L3RpdGxlPjwvZz47XG4gICAgICAgIH0pfVxuICAgICAgICA8ZyBjbGFzc05hbWU9XCJpcy1wbGF5aGVhZFwiIHRyYW5zZm9ybT17YHRyYW5zbGF0ZSgkezE4ICsgKChzbmFwc2hvdC50cmFuc3BvcnQuc3RvcnlXVSAvIHRvdGFsKSAqIDIwNCl9IDU2KWB9PjxwYXRoIGQ9XCJNMCAtMjIgTDUgLTE1IEgtNSBaXCIgLz48bGluZSB5MT1cIi0xNVwiIHkyPVwiMjJcIiAvPjwvZz5cbiAgICAgIDwvc3ZnPlxuICAgICAgPHNtYWxsPkRvdHMgYXJlIFNlY3Rpb24gYm91bmRhcmllcy4gTGFyZ2UgZG90cyBhcmUgZml4ZWQgV29ybGQgYW5jaG9ycy4gVGhlIG1hcmtlciBpcyB0aGUgcHVibGlzaGVkIGNhbWVyYS48L3NtYWxsPlxuICAgIDwvZGl2PlxuICApO1xufVxuXG5leHBvcnQgZGVmYXVsdCBmdW5jdGlvbiBBYm91dE5hcnJhdGl2ZUVkaXRvcih7IHN0b3JlLCBydW50aW1lUmVmLCByb290UmVmIH0pIHtcbiAgY29uc3Qgc25hcHNob3QgPSB1c2VTeW5jRXh0ZXJuYWxTdG9yZShzdG9yZS5zdWJzY3JpYmUsIHN0b3JlLmdldFNuYXBzaG90KTtcbiAgY29uc3QgW2NoZWNrcG9pbnRzLCBzZXRDaGVja3BvaW50c10gPSB1c2VTdGF0ZSgoKSA9PiByZWFkQWJvdXROYXJyYXRpdmVDaGVja3BvaW50cygpKTtcbiAgY29uc3QgW3J1bnRpbWVNZXRyaWNzLCBzZXRSdW50aW1lTWV0cmljc10gPSB1c2VTdGF0ZShudWxsKTtcbiAgY29uc3QgW3BhdGhWaXNpYmxlLCBzZXRQYXRoVmlzaWJsZV0gPSB1c2VTdGF0ZShmYWxzZSk7XG4gIGNvbnN0IFtkaXJlY3RvclZpZXcsIHNldERpcmVjdG9yVmlld10gPSB1c2VTdGF0ZShmYWxzZSk7XG4gIGNvbnN0IFttb2JpbGVQYW5lLCBzZXRNb2JpbGVQYW5lXSA9IHVzZVN0YXRlKCdzZXF1ZW5jZScpO1xuICBjb25zdCBbdGltZWxpbmVPcGVuLCBzZXRUaW1lbGluZU9wZW5dID0gdXNlU3RhdGUoKCkgPT4gKFxuICAgIHdpbmRvdy5sb2NhbFN0b3JhZ2UuZ2V0SXRlbShBQk9VVF9FRElUT1JfVElNRUxJTkVfU1RPUkFHRV9LRVkpICE9PSAnY2xvc2VkJ1xuICApKTtcbiAgY29uc3QgaW1wb3J0UmVmID0gdXNlUmVmKG51bGwpO1xuICBjb25zdCBzbmFwc2hvdFJlZiA9IHVzZVJlZihzbmFwc2hvdCk7XG4gIGNvbnN0IGFjdGl2ZVNlbGVjdGlvbiA9IHNuYXBzaG90LnNlbGVjdGlvbjtcblxuICB1c2VFZmZlY3QoKCkgPT4ge1xuICAgIHNuYXBzaG90UmVmLmN1cnJlbnQgPSBzbmFwc2hvdDtcbiAgfSwgW3NuYXBzaG90XSk7XG5cbiAgdXNlRWZmZWN0KCgpID0+IHtcbiAgICB3aW5kb3cubG9jYWxTdG9yYWdlLnNldEl0ZW0oQUJPVVRfRURJVE9SX1RJTUVMSU5FX1NUT1JBR0VfS0VZLCB0aW1lbGluZU9wZW4gPyAnb3BlbicgOiAnY2xvc2VkJyk7XG4gIH0sIFt0aW1lbGluZU9wZW5dKTtcblxuICB1c2VFZmZlY3QoKCkgPT4ge1xuICAgIGNvbnN0IHJvb3QgPSByb290UmVmLmN1cnJlbnQ7XG4gICAgY29uc3QgcnVudGltZSA9IHJ1bnRpbWVSZWYuY3VycmVudDtcbiAgICByb290Py5zZXRBdHRyaWJ1dGUoJ2RhdGEtZWRpdG9yLWFjdGl2ZScsICd0cnVlJyk7XG4gICAgbG9hZEFib3V0TmFycmF0aXZlU291cmNlKCkudGhlbigoeyBkb2N1bWVudCwgaGFzaCB9KSA9PiB7XG4gICAgICBjb25zdCBjdXJyZW50ID0gc3RvcmUuZ2V0U25hcHNob3QoKTtcbiAgICAgIGlmICghY3VycmVudC5kaXJ0eSkgc3RvcmUucmVwbGFjZURvY3VtZW50KCdSZWZyZXNoIGNhbm9uaWNhbCBzb3VyY2UnLCBkb2N1bWVudCk7XG4gICAgICBzdG9yZS5zZXRCYXNlbGluZShkb2N1bWVudCwgaGFzaCk7XG4gICAgICBjb25zdCByZWNvdmVyeSA9IHJlYWRBYm91dE5hcnJhdGl2ZVJlY292ZXJ5RHJhZnQoKTtcbiAgICAgIGlmIChyZWNvdmVyeSAmJiByZWNvdmVyeS50aW1lc3RhbXAgPiBEYXRlLm5vdygpIC0gKDE0ICogODY0MDAwMDApKSB7XG4gICAgICAgIHN0b3JlLnNldFJlY292ZXJ5U3RhdGUoeyBhdmFpbGFibGU6IHRydWUsIGRyYWZ0OiByZWNvdmVyeSwgZXJyb3I6ICcnIH0pO1xuICAgICAgfVxuICAgIH0pLmNhdGNoKChlcnJvcikgPT4gc3RvcmUuc2V0U2F2ZVN0YXRlKHsgc3RhdHVzOiAnZmFpbGVkJywgbWVzc2FnZTogZXJyb3IubWVzc2FnZSB9KSk7XG4gICAgcmV0dXJuICgpID0+IHtcbiAgICAgIHJvb3Q/LnJlbW92ZUF0dHJpYnV0ZSgnZGF0YS1lZGl0b3ItYWN0aXZlJyk7XG4gICAgICBydW50aW1lPy5zZXREaXJlY3RvclZpZXc/LihmYWxzZSk7XG4gICAgfTtcbiAgfSwgW3Jvb3RSZWYsIHJ1bnRpbWVSZWYsIHN0b3JlXSk7XG5cbiAgdXNlRWZmZWN0KCgpID0+IHtcbiAgICBjb25zdCByb290ID0gcm9vdFJlZi5jdXJyZW50O1xuICAgIGlmICghcm9vdCkgcmV0dXJuIHVuZGVmaW5lZDtcbiAgICByb290LnF1ZXJ5U2VsZWN0b3JBbGwoJy5pcy1lZGl0b3Itc2VsZWN0ZWQnKS5mb3JFYWNoKChub2RlKSA9PiBub2RlLmNsYXNzTGlzdC5yZW1vdmUoJ2lzLWVkaXRvci1zZWxlY3RlZCcpKTtcbiAgICBnZXRBYm91dE5hcnJhdGl2ZVNlbGVjdGlvbk1lbWJlcnMoYWN0aXZlU2VsZWN0aW9uKS5mb3JFYWNoKChtZW1iZXIpID0+IHtcbiAgICAgIHJvb3QucXVlcnlTZWxlY3RvcihgW2RhdGEtdGV4dC1jdWU9XCIke0NTUy5lc2NhcGUobWVtYmVyLmN1ZUlkKX1cIl1gKT8uY2xhc3NMaXN0LmFkZCgnaXMtZWRpdG9yLXNlbGVjdGVkJyk7XG4gICAgfSk7XG4gICAgcm9vdC5kYXRhc2V0LmVkaXRvclNlbGVjdGlvblR5cGUgPSBhY3RpdmVTZWxlY3Rpb24udHlwZSB8fCAnJztcbiAgICByZXR1cm4gKCkgPT4ge1xuICAgICAgcm9vdC5xdWVyeVNlbGVjdG9yQWxsKCcuaXMtZWRpdG9yLXNlbGVjdGVkJykuZm9yRWFjaCgobm9kZSkgPT4gbm9kZS5jbGFzc0xpc3QucmVtb3ZlKCdpcy1lZGl0b3Itc2VsZWN0ZWQnKSk7XG4gICAgICBkZWxldGUgcm9vdC5kYXRhc2V0LmVkaXRvclNlbGVjdGlvblR5cGU7XG4gICAgfTtcbiAgfSwgW2FjdGl2ZVNlbGVjdGlvbiwgcm9vdFJlZl0pO1xuXG4gIHVzZUVmZmVjdCgoKSA9PiB7XG4gICAgY29uc3QgaW50ZXJ2YWwgPSB3aW5kb3cuc2V0SW50ZXJ2YWwoKCkgPT4gc2V0UnVudGltZU1ldHJpY3MocnVudGltZVJlZi5jdXJyZW50Py5nZXRNZXRyaWNzPy4oKSB8fCBudWxsKSwgNTAwKTtcbiAgICByZXR1cm4gKCkgPT4gd2luZG93LmNsZWFySW50ZXJ2YWwoaW50ZXJ2YWwpO1xuICB9LCBbcnVudGltZVJlZl0pO1xuXG4gIHVzZUVmZmVjdCgoKSA9PiB7XG4gICAgaWYgKCFzbmFwc2hvdC5kaXJ0eSkgcmV0dXJuIHVuZGVmaW5lZDtcbiAgICBjb25zdCB0aW1lciA9IHdpbmRvdy5zZXRUaW1lb3V0KCgpID0+IHtcbiAgICAgIHRyeSB7XG4gICAgICAgIHdyaXRlQWJvdXROYXJyYXRpdmVSZWNvdmVyeURyYWZ0KHNuYXBzaG90LmRvY3VtZW50LCBzbmFwc2hvdC5iYXNlbGluZUhhc2gpO1xuICAgICAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICAgICAgc3RvcmUuc2V0UmVjb3ZlcnlTdGF0ZSh7IGVycm9yOiBgRHJhZnQgc3RvcmFnZSBmYWlsZWQ6ICR7ZXJyb3IubWVzc2FnZX1gIH0pO1xuICAgICAgfVxuICAgIH0sIDkwMCk7XG4gICAgcmV0dXJuICgpID0+IHdpbmRvdy5jbGVhclRpbWVvdXQodGltZXIpO1xuICB9LCBbc25hcHNob3QuYmFzZWxpbmVIYXNoLCBzbmFwc2hvdC5kaXJ0eSwgc25hcHNob3QuZG9jdW1lbnQsIHN0b3JlXSk7XG5cbiAgdXNlRWZmZWN0KCgpID0+IHtcbiAgICBjb25zdCBwYWdlaGlkZSA9ICgpID0+IHtcbiAgICAgIGNvbnN0IGN1cnJlbnQgPSBzbmFwc2hvdFJlZi5jdXJyZW50O1xuICAgICAgaWYgKGN1cnJlbnQuZGlydHkpIHtcbiAgICAgICAgdHJ5IHsgd3JpdGVBYm91dE5hcnJhdGl2ZVJlY292ZXJ5RHJhZnQoY3VycmVudC5kb2N1bWVudCwgY3VycmVudC5iYXNlbGluZUhhc2gpOyB9IGNhdGNoIHsgLyogc3VyZmFjZWQgYnkgbm9ybWFsIGF1dG9zYXZlICovIH1cbiAgICAgIH1cbiAgICB9O1xuICAgIGNvbnN0IGtleWRvd24gPSAoZXZlbnQpID0+IHtcbiAgICAgIGlmICgoZXZlbnQubWV0YUtleSB8fCBldmVudC5jdHJsS2V5KSAmJiBldmVudC5rZXkudG9Mb3dlckNhc2UoKSA9PT0gJ3MnKSB7XG4gICAgICAgIGV2ZW50LnByZXZlbnREZWZhdWx0KCk7XG4gICAgICAgIGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3IoJ1tkYXRhLWFib3V0LWVkaXRvci1zYXZlXScpPy5jbGljaygpO1xuICAgICAgfVxuICAgICAgaWYgKChldmVudC5tZXRhS2V5IHx8IGV2ZW50LmN0cmxLZXkpICYmIGV2ZW50LmtleS50b0xvd2VyQ2FzZSgpID09PSAneicpIHtcbiAgICAgICAgZXZlbnQucHJldmVudERlZmF1bHQoKTtcbiAgICAgICAgZXZlbnQuc2hpZnRLZXkgPyBzdG9yZS5yZWRvKCkgOiBzdG9yZS51bmRvKCk7XG4gICAgICB9XG4gICAgICBpZiAoIWV2ZW50Lm1ldGFLZXkgJiYgIWV2ZW50LmN0cmxLZXkgJiYgIWV2ZW50LmFsdEtleSAmJiAhZXZlbnQuc2hpZnRLZXlcbiAgICAgICAgJiYgIWlzVGV4dEVkaXRpbmdUYXJnZXQoZXZlbnQudGFyZ2V0KSAmJiBbJ0Fycm93TGVmdCcsICdBcnJvd1JpZ2h0J10uaW5jbHVkZXMoZXZlbnQua2V5KSkge1xuICAgICAgICBldmVudC5wcmV2ZW50RGVmYXVsdCgpO1xuICAgICAgICBqdW1wVGltZWxpbmVLZXlmcmFtZShzdG9yZSwgc3RvcmUuZ2V0U25hcHNob3QoKSwgZXZlbnQua2V5ID09PSAnQXJyb3dSaWdodCcgPyAxIDogLTEpO1xuICAgICAgfVxuICAgICAgaWYgKCFldmVudC5tZXRhS2V5ICYmICFldmVudC5jdHJsS2V5ICYmICFldmVudC5hbHRLZXlcbiAgICAgICAgJiYgIWlzVGV4dEVkaXRpbmdUYXJnZXQoZXZlbnQudGFyZ2V0KSAmJiBbJ0JhY2tzcGFjZScsICdEZWxldGUnXS5pbmNsdWRlcyhldmVudC5rZXkpXG4gICAgICAgICYmIGRlbGV0ZVRpbWVsaW5lU2VsZWN0aW9uKHN0b3JlLCBzdG9yZS5nZXRTbmFwc2hvdCgpKSkge1xuICAgICAgICBldmVudC5wcmV2ZW50RGVmYXVsdCgpO1xuICAgICAgfVxuICAgICAgaWYgKGV2ZW50LmtleSA9PT0gJ0VzY2FwZScpIHtcbiAgICAgICAgY29uc3QgY3VycmVudCA9IHN0b3JlLmdldFNuYXBzaG90KCk7XG4gICAgICAgIGlmIChjdXJyZW50LnByZXZpZXdTdGF0ZSkgc3RvcmUuY2FuY2VsUHJldmlldygpO1xuICAgICAgICBlbHNlIGlmIChjdXJyZW50LnRyeVN0YXRlKSBzdG9yZS5jYW5jZWxUcnkoKTtcbiAgICAgICAgZWxzZSBpZiAoZ2V0QWJvdXROYXJyYXRpdmVTZWxlY3Rpb25NZW1iZXJzKGN1cnJlbnQuc2VsZWN0aW9uKS5sZW5ndGggPiAxKSB7XG4gICAgICAgICAgc3RvcmUuc2V0U2VsZWN0aW9uKHtcbiAgICAgICAgICAgIHR5cGU6ICdjdWUnLFxuICAgICAgICAgICAgc2VjdGlvbklkOiBjdXJyZW50LnNlbGVjdGlvbi5zZWN0aW9uSWQsXG4gICAgICAgICAgICBjdWVJZDogY3VycmVudC5zZWxlY3Rpb24uY3VlSWQsXG4gICAgICAgICAgICBrZXlQYXJ0OiBjdXJyZW50LnNlbGVjdGlvbi5rZXlQYXJ0IHx8ICdmb2N1cycsXG4gICAgICAgICAgfSk7XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSBpZiAoY3VycmVudC5zZWxlY3Rpb24udHlwZSAhPT0gJ3NlY3Rpb24nKSBzdG9yZS5zZXRTZWxlY3Rpb24oeyB0eXBlOiAnc2VjdGlvbicsIHNlY3Rpb25JZDogY3VycmVudC5zZWxlY3Rpb24uc2VjdGlvbklkIH0pO1xuICAgICAgICBlbHNlIHN0b3JlLnNldFNlbGVjdGlvbih7IHR5cGU6ICdzZXF1ZW5jZScgfSk7XG4gICAgICB9XG4gICAgfTtcbiAgICB3aW5kb3cuYWRkRXZlbnRMaXN0ZW5lcigncGFnZWhpZGUnLCBwYWdlaGlkZSk7XG4gICAgd2luZG93LmFkZEV2ZW50TGlzdGVuZXIoJ2tleWRvd24nLCBrZXlkb3duKTtcbiAgICByZXR1cm4gKCkgPT4geyB3aW5kb3cucmVtb3ZlRXZlbnRMaXN0ZW5lcigncGFnZWhpZGUnLCBwYWdlaGlkZSk7IHdpbmRvdy5yZW1vdmVFdmVudExpc3RlbmVyKCdrZXlkb3duJywga2V5ZG93bik7IH07XG4gIH0sIFtzdG9yZV0pO1xuXG4gIGNvbnN0IHNhdmUgPSBhc3luYyAoKSA9PiB7XG4gICAgY29uc3QgZWRpdG9yVXJsID0gbmV3IFVSTCh3aW5kb3cubG9jYXRpb24uaHJlZik7XG4gICAgZWRpdG9yVXJsLnNlYXJjaFBhcmFtcy5zZXQoJ2VkaXQnLCAnMScpO1xuICAgIHdpbmRvdy5oaXN0b3J5LnJlcGxhY2VTdGF0ZSh3aW5kb3cuaGlzdG9yeS5zdGF0ZSwgJycsIGAke2VkaXRvclVybC5wYXRobmFtZX0ke2VkaXRvclVybC5zZWFyY2h9JHtlZGl0b3JVcmwuaGFzaH1gKTtcbiAgICBjb25zdCBzZW50ID0gY2xvbmVBYm91dE5hcnJhdGl2ZURvY3VtZW50KHNuYXBzaG90LmRvY3VtZW50KTtcbiAgICBpZiAoc25hcHNob3QuZGlhZ25vc3RpY3Muc29tZSgoaXRlbSkgPT4gaXRlbS5sZXZlbCA9PT0gJ2Vycm9yJykpIHtcbiAgICAgIHN0b3JlLnNldFNhdmVTdGF0ZSh7IHN0YXR1czogJ2ZhaWxlZCcsIG1lc3NhZ2U6ICdSZXNvbHZlIHZhbGlkYXRpb24gZXJyb3JzIGJlZm9yZSBzYXZpbmcuJyB9KTtcbiAgICAgIHJldHVybjtcbiAgICB9XG4gICAgc3RvcmUuc2V0U2F2ZVN0YXRlKHsgc3RhdHVzOiAnc2F2aW5nJywgbWVzc2FnZTogJycgfSk7XG4gICAgdHJ5IHtcbiAgICAgIGNvbnN0IHJlc3VsdCA9IGF3YWl0IHNhdmVBYm91dE5hcnJhdGl2ZVNvdXJjZShzZW50LCBzbmFwc2hvdC5iYXNlbGluZUhhc2gpO1xuICAgICAgc3RvcmUubWFya1NhdmVkKHNlbnQsIHJlc3VsdC5oYXNoKTtcbiAgICAgIGNsZWFyQWJvdXROYXJyYXRpdmVSZWNvdmVyeURyYWZ0KCk7XG4gICAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICAgIHN0b3JlLnNldFNhdmVTdGF0ZSh7IHN0YXR1czogZXJyb3Iuc3RhdHVzID09PSA0MDkgPyAnY29uZmxpY3QnIDogJ2ZhaWxlZCcsIG1lc3NhZ2U6IGVycm9yLm1lc3NhZ2UgfSk7XG4gICAgfVxuICB9O1xuXG4gIGNvbnN0IGFkZENoZWNrcG9pbnQgPSAoKSA9PiB7XG4gICAgY29uc3QgY2hlY2twb2ludCA9IHtcbiAgICAgIGlkOiBjcnlwdG8ucmFuZG9tVVVJRCgpLFxuICAgICAgbmFtZTogYENoZWNrcG9pbnQgJHtuZXcgRGF0ZSgpLnRvTG9jYWxlVGltZVN0cmluZyhbXSwgeyBob3VyOiAnMi1kaWdpdCcsIG1pbnV0ZTogJzItZGlnaXQnIH0pfWAsXG4gICAgICB0aW1lc3RhbXA6IERhdGUubm93KCksXG4gICAgICBzdG9yeVdVOiBzbmFwc2hvdC50cmFuc3BvcnQuc3RvcnlXVSxcbiAgICAgIGJhc2VTb3VyY2VIYXNoOiBzbmFwc2hvdC5iYXNlbGluZUhhc2gsXG4gICAgICBkb2N1bWVudDogc25hcHNob3QuZG9jdW1lbnQsXG4gICAgfTtcbiAgICBzZXRDaGVja3BvaW50cyh3cml0ZUFib3V0TmFycmF0aXZlQ2hlY2twb2ludChjaGVja3BvaW50KSk7XG4gIH07XG4gIGNvbnN0IHN0YXR1c0xhYmVsID0gc25hcHNob3Quc2F2ZVN0YXRlLnN0YXR1cyA9PT0gJ3NhdmluZycgPyAnU2F2aW5n4oCmJ1xuICAgIDogc25hcHNob3Quc2F2ZVN0YXRlLnN0YXR1cyA9PT0gJ2NvbmZsaWN0JyA/ICdTb3VyY2UgY2hhbmdlZCdcbiAgICAgIDogc25hcHNob3Quc2F2ZVN0YXRlLnN0YXR1cyA9PT0gJ2ZhaWxlZCcgPyAnU2F2ZSBmYWlsZWQnXG4gICAgICAgIDogc25hcHNob3QuZGlydHkgPyAnRHJhZnQnIDogJ1NhdmVkJztcbiAgY29uc3Qgc2VsZWN0ZWQgPSBnZXRTZWN0aW9uKHNuYXBzaG90LmRvY3VtZW50LCBzbmFwc2hvdC5zZWxlY3Rpb24pO1xuICBjb25zdCBjb21waWxlZFNlbGVjdGVkID0gc25hcHNob3QuY29tcGlsZWRQbGFuPy5zZWN0aW9ucy5maW5kKChzZWN0aW9uKSA9PiBzZWN0aW9uLmlkID09PSBzZWxlY3RlZD8uaWQpO1xuICBjb25zdCByZXNvbHZlZEV4dGVudCA9IGNvbXBpbGVkU2VsZWN0ZWQ/LnJlc29sdmVkRXh0ZW50V1UgfHwgc2VsZWN0ZWQ/LmV4dGVudFdVIHx8IDA7XG4gIGNvbnN0IHNlbGVjdGVkRXh0ZW50ID0gc2VsZWN0ZWRcbiAgICA/IE51bWJlcihzbmFwc2hvdC5wcmV2aWV3UHJvZmlsZSA9PT0gJ21vYmlsZScgPyBzZWxlY3RlZC5tb2JpbGVFeHRlbnRXVSA6IHNlbGVjdGVkLmV4dGVudFdVKVxuICAgIDogMDtcbiAgY29uc3Qgc2VsZWN0ZWRDdWVDb3VudCA9IGdldEFib3V0TmFycmF0aXZlU2VsZWN0aW9uTWVtYmVycyhzbmFwc2hvdC5zZWxlY3Rpb24pLmxlbmd0aDtcbiAgY29uc3QgbG9vcEFjdGl2ZSA9IEJvb2xlYW4oc25hcHNob3QudHJhbnNwb3J0Lmxvb3A/LnNlY3Rpb25JZCA9PT0gc2VsZWN0ZWQ/LmlkKTtcbiAgY29uc3QgdGltZWxpbmVEZWxldGlvbiA9IGdldFRpbWVsaW5lRGVsZXRpb24oc25hcHNob3QpO1xuICBjb25zdCB0b2dnbGVMb29wID0gKCkgPT4gc3RvcmUuc2V0VHJhbnNwb3J0KHtcbiAgICBsb29wOiBsb29wQWN0aXZlIHx8ICFjb21waWxlZFNlbGVjdGVkID8gbnVsbCA6IHtcbiAgICAgIHNlY3Rpb25JZDogc2VsZWN0ZWQuaWQsXG4gICAgICBzdGFydFdVOiBjb21waWxlZFNlbGVjdGVkLnN0YXJ0V1UsXG4gICAgICBlbmRXVTogY29tcGlsZWRTZWxlY3RlZC5zdGFydFdVICsgY29tcGlsZWRTZWxlY3RlZC50cmF2ZWxXVSxcbiAgICB9LFxuICB9KTtcbiAgY29uc3QgdG9nZ2xlU29sbyA9ICh0cmFjaykgPT4gc3RvcmUuc2V0VHJhbnNwb3J0KHtcbiAgICBzb2xvVHJhY2s6IHNuYXBzaG90LnRyYW5zcG9ydC5zb2xvVHJhY2sgPT09IHRyYWNrID8gbnVsbCA6IHRyYWNrLFxuICB9KTtcbiAgY29uc3QgZml0U2VxdWVuY2UgPSAoKSA9PiB7XG4gICAgc3RvcmUuc2V0VHJhbnNwb3J0KHsgem9vbTogMSB9KTtcbiAgICByZXF1ZXN0QW5pbWF0aW9uRnJhbWUoKCkgPT4ge1xuICAgICAgY29uc3QgbGFuZXMgPSBkb2N1bWVudC5xdWVyeVNlbGVjdG9yKCcuYWJvdXQtZWRpdG9yLWxhbmVzJyk7XG4gICAgICBpZiAobGFuZXMpIGxhbmVzLnNjcm9sbExlZnQgPSAwO1xuICAgIH0pO1xuICB9O1xuICBjb25zdCBmaXRTZWN0aW9uID0gKCkgPT4ge1xuICAgIGlmICghY29tcGlsZWRTZWxlY3RlZCB8fCAhc25hcHNob3QuY29tcGlsZWRQbGFuPy5tYXhTdG9yeVdVKSByZXR1cm47XG4gICAgY29uc3Qgc2VjdGlvblNwYW4gPSBNYXRoLm1heCgwLjAwMSwgY29tcGlsZWRTZWxlY3RlZC5yZXNvbHZlZEV4dGVudFdVKTtcbiAgICBjb25zdCB6b29tID0gTWF0aC5taW4oOCwgTWF0aC5tYXgoMSwgKHNuYXBzaG90LmNvbXBpbGVkUGxhbi5tYXhTdG9yeVdVIC8gc2VjdGlvblNwYW4pICogMC44MikpO1xuICAgIHN0b3JlLnNldFRyYW5zcG9ydCh7IHpvb206IE51bWJlcih6b29tLnRvRml4ZWQoMykpIH0pO1xuICAgIHJlcXVlc3RBbmltYXRpb25GcmFtZSgoKSA9PiB7XG4gICAgICBjb25zdCBsYW5lcyA9IGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3IoJy5hYm91dC1lZGl0b3ItbGFuZXMnKTtcbiAgICAgIGlmICghbGFuZXMpIHJldHVybjtcbiAgICAgIGNvbnN0IHN0YXJ0UmF0aW8gPSBjb21waWxlZFNlbGVjdGVkLnN0YXJ0V1UgLyBzbmFwc2hvdC5jb21waWxlZFBsYW4ubWF4U3RvcnlXVTtcbiAgICAgIGxhbmVzLnNjcm9sbExlZnQgPSBNYXRoLm1heCgwLCAoc3RhcnRSYXRpbyAqIGxhbmVzLnNjcm9sbFdpZHRoKSAtIChsYW5lcy5jbGllbnRXaWR0aCAqIDAuMDgpKTtcbiAgICB9KTtcbiAgfTtcbiAgY29uc3QgdG9nZ2xlRGlyZWN0b3IgPSAoKSA9PiB7XG4gICAgY29uc3QgbmV4dCA9ICFkaXJlY3RvclZpZXc7XG4gICAgc2V0RGlyZWN0b3JWaWV3KG5leHQpO1xuICAgIHJ1bnRpbWVSZWYuY3VycmVudD8uc2V0RGlyZWN0b3JWaWV3Py4obmV4dCk7XG4gIH07XG4gIGNvbnN0IHRvZ2dsZUJlZm9yZSA9ICgpID0+IHtcbiAgICBpZiAoc25hcHNob3QudHJ5U3RhdGU/LmxhYmVsID09PSAnQ29tcGFyZSBzYXZlZCBzb3VyY2UnKSB7XG4gICAgICBzdG9yZS5jYW5jZWxUcnkoKTtcbiAgICAgIHJldHVybjtcbiAgICB9XG4gICAgaWYgKHNuYXBzaG90LnRyeVN0YXRlKSByZXR1cm47XG4gICAgc3RvcmUuYmVnaW5UcnkoJ0NvbXBhcmUgc2F2ZWQgc291cmNlJywgKGRyYWZ0KSA9PiB7XG4gICAgICBPYmplY3Qua2V5cyhkcmFmdCkuZm9yRWFjaCgoa2V5KSA9PiBkZWxldGUgZHJhZnRba2V5XSk7XG4gICAgICBPYmplY3QuYXNzaWduKGRyYWZ0LCBjbG9uZUFib3V0TmFycmF0aXZlRG9jdW1lbnQoc25hcHNob3QuYmFzZWxpbmVEb2N1bWVudCkpO1xuICAgIH0pO1xuICB9O1xuXG4gIHJldHVybiBjcmVhdGVQb3J0YWwoKFxuICAgIDxkaXZcbiAgICAgIGNsYXNzTmFtZT1cImFib3V0LWVkaXRvclwiXG4gICAgICBkYXRhLW1vYmlsZS1wYW5lPXttb2JpbGVQYW5lfVxuICAgICAgZGF0YS10aW1lbGluZS1vcGVuPXt0aW1lbGluZU9wZW4gPyAndHJ1ZScgOiAnZmFsc2UnfVxuICAgICAgcm9sZT1cInJlZ2lvblwiXG4gICAgICBhcmlhLWxhYmVsPVwiQWJvdXQgTmFycmF0aXZlIGNyZWF0aXZlIHRvb2xraXRcIlxuICAgID5cbiAgICAgIDxoZWFkZXIgY2xhc3NOYW1lPVwiYWJvdXQtZWRpdG9yLXRvcGJhclwiPlxuICAgICAgICA8YnV0dG9uIHR5cGU9XCJidXR0b25cIiBjbGFzc05hbWU9XCJhYm91dC1lZGl0b3ItYnJhbmRcIiBvbkNsaWNrPXsoKSA9PiBzdG9yZS5zZXRTZWxlY3Rpb24oeyB0eXBlOiAnc2VxdWVuY2UnIH0pfT48RGlhbW9uZCBhcmlhLWhpZGRlbj1cInRydWVcIiAvPjxzcGFuPkFib3V0IE5hcnJhdGl2ZTwvc3Bhbj48c21hbGw+Q3JlYXRpdmUgdG9vbGtpdDwvc21hbGw+PC9idXR0b24+XG4gICAgICAgIDxUcmFuc3BvcnQgc3RvcmU9e3N0b3JlfSBzbmFwc2hvdD17c25hcHNob3R9IC8+XG4gICAgICAgIDxkaXYgY2xhc3NOYW1lPVwiYWJvdXQtZWRpdG9yLWFjdGlvbnNcIj5cbiAgICAgICAgICA8YnV0dG9uIHR5cGU9XCJidXR0b25cIiBkaXNhYmxlZD17IXNuYXBzaG90Lmhpc3RvcnkuY2FuVW5kb30gdGl0bGU9e3NuYXBzaG90Lmhpc3RvcnkudW5kb0xhYmVsIHx8ICdVbmRvJ30gYXJpYS1sYWJlbD1cIlVuZG9cIiBvbkNsaWNrPXsoKSA9PiBzdG9yZS51bmRvKCl9PjxzcGFuIGFyaWEtaGlkZGVuPVwidHJ1ZVwiPuKGtjwvc3Bhbj48L2J1dHRvbj5cbiAgICAgICAgICA8YnV0dG9uIHR5cGU9XCJidXR0b25cIiBkaXNhYmxlZD17IXNuYXBzaG90Lmhpc3RvcnkuY2FuUmVkb30gdGl0bGU9e3NuYXBzaG90Lmhpc3RvcnkucmVkb0xhYmVsIHx8ICdSZWRvJ30gYXJpYS1sYWJlbD1cIlJlZG9cIiBvbkNsaWNrPXsoKSA9PiBzdG9yZS5yZWRvKCl9PjxzcGFuIGFyaWEtaGlkZGVuPVwidHJ1ZVwiPuKGtzwvc3Bhbj48L2J1dHRvbj5cbiAgICAgICAgICA8YnV0dG9uIHR5cGU9XCJidXR0b25cIiBjbGFzc05hbWU9e3BhdGhWaXNpYmxlID8gJ2lzLWFjdGl2ZScgOiAnJ30gb25DbGljaz17KCkgPT4gc2V0UGF0aFZpc2libGUoIXBhdGhWaXNpYmxlKX0+UGF0aDwvYnV0dG9uPlxuICAgICAgICAgIDxidXR0b24gdHlwZT1cImJ1dHRvblwiIGNsYXNzTmFtZT17ZGlyZWN0b3JWaWV3ID8gJ2lzLWFjdGl2ZScgOiAnJ30gb25DbGljaz17dG9nZ2xlRGlyZWN0b3J9PntkaXJlY3RvclZpZXcgPyAnRGlyZWN0b3InIDogJ0NhbWVyYSd9PC9idXR0b24+XG4gICAgICAgICAgPGJ1dHRvbiB0eXBlPVwiYnV0dG9uXCIgY2xhc3NOYW1lPXtzbmFwc2hvdC50cnlTdGF0ZT8ubGFiZWwgPT09ICdDb21wYXJlIHNhdmVkIHNvdXJjZScgPyAnaXMtYWN0aXZlJyA6ICcnfSBkaXNhYmxlZD17c25hcHNob3QudHJ5U3RhdGUgJiYgc25hcHNob3QudHJ5U3RhdGUubGFiZWwgIT09ICdDb21wYXJlIHNhdmVkIHNvdXJjZSd9IG9uQ2xpY2s9e3RvZ2dsZUJlZm9yZX0+e3NuYXBzaG90LnRyeVN0YXRlPy5sYWJlbCA9PT0gJ0NvbXBhcmUgc2F2ZWQgc291cmNlJyA/ICdCZWZvcmUnIDogJ0FmdGVyJ308L2J1dHRvbj5cbiAgICAgICAgICA8ZGV0YWlscyBjbGFzc05hbWU9XCJhYm91dC1lZGl0b3ItbW9yZVwiPlxuICAgICAgICAgICAgPHN1bW1hcnk+TW9yZTwvc3VtbWFyeT5cbiAgICAgICAgICAgIDxkaXY+XG4gICAgICAgICAgICAgIDxidXR0b24gdHlwZT1cImJ1dHRvblwiIG9uQ2xpY2s9e2FkZENoZWNrcG9pbnR9PkNoZWNrcG9pbnQ8L2J1dHRvbj5cbiAgICAgICAgICAgICAgPGJ1dHRvbiB0eXBlPVwiYnV0dG9uXCIgb25DbGljaz17KCkgPT4gZXhwb3J0QWJvdXROYXJyYXRpdmVEb2N1bWVudChzbmFwc2hvdC5kb2N1bWVudCl9PkV4cG9ydCBKU09OPC9idXR0b24+XG4gICAgICAgICAgICAgIDxidXR0b24gdHlwZT1cImJ1dHRvblwiIG9uQ2xpY2s9eygpID0+IGltcG9ydFJlZi5jdXJyZW50Py5jbGljaygpfT5JbXBvcnQgSlNPTjwvYnV0dG9uPlxuICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgPC9kZXRhaWxzPlxuICAgICAgICAgIDxpbnB1dCByZWY9e2ltcG9ydFJlZn0gaGlkZGVuIHR5cGU9XCJmaWxlXCIgYWNjZXB0PVwiYXBwbGljYXRpb24vanNvblwiIG9uQ2hhbmdlPXthc3luYyAoZXZlbnQpID0+IHtcbiAgICAgICAgICAgIGNvbnN0IGZpbGUgPSBldmVudC50YXJnZXQuZmlsZXM/LlswXTtcbiAgICAgICAgICAgIGlmICghZmlsZSkgcmV0dXJuO1xuICAgICAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgICAgY29uc3QgaW1wb3J0ZWQgPSBKU09OLnBhcnNlKGF3YWl0IGZpbGUudGV4dCgpKTtcbiAgICAgICAgICAgICAgYXNzZXJ0VmFsaWRBYm91dE5hcnJhdGl2ZURvY3VtZW50KGltcG9ydGVkKTtcbiAgICAgICAgICAgICAgc3RvcmUucmVwbGFjZURvY3VtZW50KCdJbXBvcnQgZG9jdW1lbnQnLCBpbXBvcnRlZCk7XG4gICAgICAgICAgICB9IGNhdGNoIChlcnJvcikgeyBzdG9yZS5zZXRTYXZlU3RhdGUoeyBzdGF0dXM6ICdmYWlsZWQnLCBtZXNzYWdlOiBlcnJvci5tZXNzYWdlIH0pOyB9XG4gICAgICAgICAgICBldmVudC50YXJnZXQudmFsdWUgPSAnJztcbiAgICAgICAgICB9fSAvPlxuICAgICAgICAgIDxidXR0b24gdHlwZT1cImJ1dHRvblwiIGRhdGEtYWJvdXQtZWRpdG9yLXNhdmUgY2xhc3NOYW1lPVwiaXMtc2F2ZVwiIGRpc2FibGVkPXtzbmFwc2hvdC5zYXZlU3RhdGUuc3RhdHVzID09PSAnc2F2aW5nJ30gb25DbGljaz17c2F2ZX0+PHNwYW4+e3N0YXR1c0xhYmVsfTwvc3Bhbj48a2JkPuKMmFM8L2tiZD48L2J1dHRvbj5cbiAgICAgICAgPC9kaXY+XG4gICAgICA8L2hlYWRlcj5cblxuICAgICAge3NuYXBzaG90LnJlY292ZXJ5U3RhdGUuYXZhaWxhYmxlID8gPGRpdiBjbGFzc05hbWU9XCJhYm91dC1lZGl0b3ItcmVjb3ZlcnlcIj48c3Bhbj5BbiB1bnNhdmVkIGRyYWZ0IGZyb20ge25ldyBEYXRlKHNuYXBzaG90LnJlY292ZXJ5U3RhdGUuZHJhZnQudGltZXN0YW1wKS50b0xvY2FsZVN0cmluZygpfSBpcyBhdmFpbGFibGUuPC9zcGFuPjxidXR0b24gdHlwZT1cImJ1dHRvblwiIG9uQ2xpY2s9eygpID0+IHsgc3RvcmUucmVwbGFjZURvY3VtZW50KCdSZWNvdmVyIGRyYWZ0Jywgc25hcHNob3QucmVjb3ZlcnlTdGF0ZS5kcmFmdC5kb2N1bWVudCk7IHN0b3JlLnNldFJlY292ZXJ5U3RhdGUoeyBhdmFpbGFibGU6IGZhbHNlIH0pOyB9fT5SZWNvdmVyIGFzIHVuc2F2ZWQgY29weTwvYnV0dG9uPjxidXR0b24gdHlwZT1cImJ1dHRvblwiIG9uQ2xpY2s9eygpID0+IHsgZXhwb3J0QWJvdXROYXJyYXRpdmVEb2N1bWVudChzbmFwc2hvdC5yZWNvdmVyeVN0YXRlLmRyYWZ0LmRvY3VtZW50LCAnY29udGVudHMtYWJvdXQtcmVjb3ZlcmVkLmpzb24nKTsgfX0+RXhwb3J0PC9idXR0b24+PGJ1dHRvbiB0eXBlPVwiYnV0dG9uXCIgb25DbGljaz17KCkgPT4geyBjbGVhckFib3V0TmFycmF0aXZlUmVjb3ZlcnlEcmFmdCgpOyBzdG9yZS5zZXRSZWNvdmVyeVN0YXRlKHsgYXZhaWxhYmxlOiBmYWxzZSB9KTsgfX0+RGlzY2FyZDwvYnV0dG9uPjwvZGl2PiA6IG51bGx9XG4gICAgICB7c25hcHNob3Quc2F2ZVN0YXRlLm1lc3NhZ2UgPyA8ZGl2IGNsYXNzTmFtZT17YGFib3V0LWVkaXRvci1zYXZlLW1lc3NhZ2UgaXMtJHtzbmFwc2hvdC5zYXZlU3RhdGUuc3RhdHVzfWB9PntzbmFwc2hvdC5zYXZlU3RhdGUubWVzc2FnZX08YnV0dG9uIHR5cGU9XCJidXR0b25cIiBhcmlhLWxhYmVsPVwiRGlzbWlzcyBtZXNzYWdlXCIgb25DbGljaz17KCkgPT4gc3RvcmUuc2V0U2F2ZVN0YXRlKHsgbWVzc2FnZTogJycgfSl9PsOXPC9idXR0b24+PC9kaXY+IDogbnVsbH1cblxuICAgICAge3BhdGhWaXNpYmxlID8gPENhbWVyYVBhdGhPdmVybGF5IHNuYXBzaG90PXtzbmFwc2hvdH0gLz4gOiBudWxsfVxuICAgICAge2RpcmVjdG9yVmlldyA/IDxkaXYgY2xhc3NOYW1lPVwiYWJvdXQtZWRpdG9yLWRpcmVjdG9yLWNvbnRyb2xzXCI+PHN0cm9uZz5EaXJlY3RvciBWaWV3PC9zdHJvbmc+PGJ1dHRvbiB0eXBlPVwiYnV0dG9uXCIgb25DbGljaz17KCkgPT4gcnVudGltZVJlZi5jdXJyZW50Py5udWRnZURpcmVjdG9yPy4oeyB5YXc6IC0wLjA4IH0pfT7ihpA8L2J1dHRvbj48YnV0dG9uIHR5cGU9XCJidXR0b25cIiBvbkNsaWNrPXsoKSA9PiBydW50aW1lUmVmLmN1cnJlbnQ/Lm51ZGdlRGlyZWN0b3I/Lih7IHBpdGNoOiAwLjA4IH0pfT7ihpE8L2J1dHRvbj48YnV0dG9uIHR5cGU9XCJidXR0b25cIiBvbkNsaWNrPXsoKSA9PiBydW50aW1lUmVmLmN1cnJlbnQ/Lm51ZGdlRGlyZWN0b3I/Lih7IHBpdGNoOiAtMC4wOCB9KX0+4oaTPC9idXR0b24+PGJ1dHRvbiB0eXBlPVwiYnV0dG9uXCIgb25DbGljaz17KCkgPT4gcnVudGltZVJlZi5jdXJyZW50Py5udWRnZURpcmVjdG9yPy4oeyB5YXc6IDAuMDggfSl9PuKGkjwvYnV0dG9uPjxidXR0b24gdHlwZT1cImJ1dHRvblwiIG9uQ2xpY2s9eygpID0+IHJ1bnRpbWVSZWYuY3VycmVudD8ubnVkZ2VEaXJlY3Rvcj8uKHsgZGlzdGFuY2U6IC0wLjIgfSl9Pu+8izwvYnV0dG9uPjxidXR0b24gdHlwZT1cImJ1dHRvblwiIG9uQ2xpY2s9eygpID0+IHJ1bnRpbWVSZWYuY3VycmVudD8ubnVkZ2VEaXJlY3Rvcj8uKHsgZGlzdGFuY2U6IDAuMiB9KX0+4oiSPC9idXR0b24+PGJ1dHRvbiB0eXBlPVwiYnV0dG9uXCIgb25DbGljaz17KCkgPT4gcnVudGltZVJlZi5jdXJyZW50Py5yZXNldERpcmVjdG9yPy4oKX0+UmVzZXQ8L2J1dHRvbj48c21hbGw+VGVtcG9yYXJ5IGluc3BlY3Rpb24gb25seS4gUHVibGlzaGVkIENhbWVyYSBrZXlzIGFyZSB1bmNoYW5nZWQuPC9zbWFsbD48L2Rpdj4gOiBudWxsfVxuXG4gICAgICA8SW5zcGVjdG9yIHN0b3JlPXtzdG9yZX0gc25hcHNob3Q9e3NuYXBzaG90fSB0aW1lbGluZU9wZW49e3RpbWVsaW5lT3Blbn0gcnVudGltZU1ldHJpY3M9e3J1bnRpbWVNZXRyaWNzfSAvPlxuICAgICAgPGJ1dHRvblxuICAgICAgICB0eXBlPVwiYnV0dG9uXCJcbiAgICAgICAgY2xhc3NOYW1lPVwiYWJvdXQtZWRpdG9yLXRpbWVsaW5lLXRvZ2dsZVwiXG4gICAgICAgIGFyaWEtY29udHJvbHM9XCJhYm91dC1lZGl0b3ItdGltZWxpbmUtcGFuZWxcIlxuICAgICAgICBhcmlhLWV4cGFuZGVkPXt0aW1lbGluZU9wZW59XG4gICAgICAgIHRpdGxlPXt0aW1lbGluZU9wZW4gPyAnSGlkZSB0aW1lbGluZScgOiAnU2hvdyB0aW1lbGluZSd9XG4gICAgICAgIG9uQ2xpY2s9eygpID0+IHNldFRpbWVsaW5lT3Blbigob3BlbikgPT4gIW9wZW4pfVxuICAgICAgPnt0aW1lbGluZU9wZW4gPyA8Q2hldnJvbkRvd24gYXJpYS1oaWRkZW49XCJ0cnVlXCIgLz4gOiA8Q2hldnJvblVwIGFyaWEtaGlkZGVuPVwidHJ1ZVwiIC8+fTxzcGFuPnt0aW1lbGluZU9wZW4gPyAnSGlkZSB0aW1lbGluZScgOiAnU2hvdyB0aW1lbGluZSd9PC9zcGFuPjwvYnV0dG9uPlxuICAgICAgPGRpdiBpZD1cImFib3V0LWVkaXRvci10aW1lbGluZS1wYW5lbFwiIGNsYXNzTmFtZT1cImFib3V0LWVkaXRvci1ib3R0b21cIiBhcmlhLWhpZGRlbj17IXRpbWVsaW5lT3Blbn0+XG4gICAgICAgIDxkaXYgY2xhc3NOYW1lPVwiYWJvdXQtZWRpdG9yLWNvbnRleHRiYXJcIj5cbiAgICAgICAgICA8c3Bhbj48c3Ryb25nPntzZWxlY3RlZD8ubGFiZWwgfHwgJ1NlcXVlbmNlJ308L3N0cm9uZz4ge3NlbGVjdGVkID8gYCR7c2VsZWN0ZWQudHlwZX0gwrcgJHtmb3JtYXRXVShNYXRoLm1heCgwLCBzZWxlY3RlZEV4dGVudCAtIDEpKX0gc2Nyb2xsIMK3ICR7Zm9ybWF0V1Uoc2VsZWN0ZWRFeHRlbnQpfSB0b3RhbCR7cmVzb2x2ZWRFeHRlbnQgPiBzZWxlY3RlZEV4dGVudCArIDAuMDAxID8gYCDCtyAke2Zvcm1hdFdVKHJlc29sdmVkRXh0ZW50KX0gcmVzb2x2ZWRgIDogJyd9YCA6ICcnfTwvc3Bhbj5cbiAgICAgICAgICB7c2VsZWN0ZWRDdWVDb3VudCA+IDEgPyA8c3BhbiBjbGFzc05hbWU9XCJhYm91dC1lZGl0b3Itc2VsZWN0aW9uLWNvdW50XCI+e3NlbGVjdGVkQ3VlQ291bnR9IHRpdGxlcyBzZWxlY3RlZDwvc3Bhbj4gOiBudWxsfVxuICAgICAgICAgIDxzcGFuPntzbmFwc2hvdC5hdXRvS2V5ID8gJ0F1dG8ta2V5IGFybWVkJyA6ICdBdXRvLWtleSBvZmYnfTwvc3Bhbj5cbiAgICAgICAgICA8YnV0dG9uIHR5cGU9XCJidXR0b25cIiBjbGFzc05hbWU9e3NuYXBzaG90LmF1dG9LZXkgPyAnaXMtYWN0aXZlJyA6ICcnfSBvbkNsaWNrPXsoKSA9PiBzdG9yZS5zZXRBdXRvS2V5KCFzbmFwc2hvdC5hdXRvS2V5KX0+4peGIEF1dG8ta2V5PC9idXR0b24+XG4gICAgICAgICAgPGJ1dHRvbiB0eXBlPVwiYnV0dG9uXCIgY2xhc3NOYW1lPXtsb29wQWN0aXZlID8gJ2lzLWFjdGl2ZScgOiAnJ30gb25DbGljaz17dG9nZ2xlTG9vcH0+TG9vcCBTZWN0aW9uPC9idXR0b24+XG4gICAgICAgICAgPGJ1dHRvbiB0eXBlPVwiYnV0dG9uXCIgb25DbGljaz17Zml0U2VxdWVuY2V9PkZpdCBzZXF1ZW5jZTwvYnV0dG9uPlxuICAgICAgICAgIDxidXR0b24gdHlwZT1cImJ1dHRvblwiIGRpc2FibGVkPXshY29tcGlsZWRTZWxlY3RlZH0gb25DbGljaz17Zml0U2VjdGlvbn0+Rml0IFNlY3Rpb248L2J1dHRvbj5cbiAgICAgICAgICB7WydjYW1lcmEnLCAnd29ybGQnLCAndGV4dCddLm1hcCgodHJhY2spID0+IDxidXR0b24gdHlwZT1cImJ1dHRvblwiIGtleT17dHJhY2t9IGNsYXNzTmFtZT17c25hcHNob3QudHJhbnNwb3J0LnNvbG9UcmFjayA9PT0gdHJhY2sgPyAnaXMtYWN0aXZlJyA6ICcnfSBvbkNsaWNrPXsoKSA9PiB0b2dnbGVTb2xvKHRyYWNrKX0+U29sbyB7dHJhY2t9PC9idXR0b24+KX1cbiAgICAgICAgICB7dGltZWxpbmVEZWxldGlvbiA/IDxidXR0b24gdHlwZT1cImJ1dHRvblwiIGNsYXNzTmFtZT1cImFib3V0LWVkaXRvci1kZWxldGUta2V5XCIgZGlzYWJsZWQ9e3RpbWVsaW5lRGVsZXRpb24uZGlzYWJsZWR9IHRpdGxlPXt0aW1lbGluZURlbGV0aW9uLm1lc3NhZ2UgfHwgYCR7dGltZWxpbmVEZWxldGlvbi5sYWJlbH0gwrcgRGVsZXRlL0JhY2tzcGFjZWB9IG9uQ2xpY2s9eygpID0+IGRlbGV0ZVRpbWVsaW5lU2VsZWN0aW9uKHN0b3JlLCBzbmFwc2hvdCl9PjxUcmFzaDIgYXJpYS1oaWRkZW49XCJ0cnVlXCIgLz57dGltZWxpbmVEZWxldGlvbi5sYWJlbH08L2J1dHRvbj4gOiBudWxsfVxuICAgICAgICAgIHtydW50aW1lTWV0cmljcyA/IDxzcGFuIGNsYXNzTmFtZT1cImFib3V0LWVkaXRvci1odWRcIj57cnVudGltZU1ldHJpY3MuZnJhbWVUaW1lTXMudG9GaXhlZCgyKX1tcyDCtyB7cnVudGltZU1ldHJpY3MuZHJhd0NhbGxzfSBkcmF3IMK3IHtydW50aW1lTWV0cmljcy5wb2ludENvdW50LnRvTG9jYWxlU3RyaW5nKCl9IHB0cyDCtyB7cnVudGltZU1ldHJpY3MuYWN0aXZlTW9kaWZpZXJzfSBtb2RpZmllcnMgwrcge3J1bnRpbWVNZXRyaWNzLmJ1ZmZlclJlYnVpbGRzfSByZWJ1aWxkczwvc3Bhbj4gOiBudWxsfVxuICAgICAgICAgIHtjaGVja3BvaW50cy5sZW5ndGggPyA8c2VsZWN0IGFyaWEtbGFiZWw9XCJSZXN0b3JlIGNoZWNrcG9pbnRcIiBkZWZhdWx0VmFsdWU9XCJcIiBvbkNoYW5nZT17KGV2ZW50KSA9PiB7IGNvbnN0IGZvdW5kID0gY2hlY2twb2ludHMuZmluZCgoaXRlbSkgPT4gaXRlbS5pZCA9PT0gZXZlbnQudGFyZ2V0LnZhbHVlKTsgaWYgKGZvdW5kKSB7IHN0b3JlLnJlcGxhY2VEb2N1bWVudChgUmVzdG9yZSAke2ZvdW5kLm5hbWV9YCwgZm91bmQuZG9jdW1lbnQpOyBzdG9yZS5zZXRUcmFuc3BvcnQoeyBvd25lcjogJ3RpbWVsaW5lJywgc3RvcnlXVTogZm91bmQuc3RvcnlXVSwgcGxheWluZzogZmFsc2UgfSk7IH0gZXZlbnQudGFyZ2V0LnZhbHVlID0gJyc7IH19PjxvcHRpb24gdmFsdWU9XCJcIj5DaGVja3BvaW50cyAoe2NoZWNrcG9pbnRzLmxlbmd0aH0pPC9vcHRpb24+e2NoZWNrcG9pbnRzLm1hcCgoaXRlbSkgPT4gPG9wdGlvbiB2YWx1ZT17aXRlbS5pZH0ga2V5PXtpdGVtLmlkfT57aXRlbS5uYW1lfTwvb3B0aW9uPil9PC9zZWxlY3Q+IDogbnVsbH1cbiAgICAgICAgPC9kaXY+XG4gICAgICAgIDxUaW1lbGluZSBzdG9yZT17c3RvcmV9IHNuYXBzaG90PXtzbmFwc2hvdH0gLz5cbiAgICAgIDwvZGl2PlxuICAgICAgPG5hdiBjbGFzc05hbWU9XCJhYm91dC1lZGl0b3ItbW9iaWxlLXRhYnNcIiBhcmlhLWxhYmVsPVwiRWRpdG9yIHBhbmVsXCI+PGJ1dHRvbiB0eXBlPVwiYnV0dG9uXCIgY2xhc3NOYW1lPXttb2JpbGVQYW5lID09PSAnc2VxdWVuY2UnID8gJ2lzLWFjdGl2ZScgOiAnJ30gb25DbGljaz17KCkgPT4gc2V0TW9iaWxlUGFuZSgnc2VxdWVuY2UnKX0+U2VxdWVuY2U8L2J1dHRvbj48YnV0dG9uIHR5cGU9XCJidXR0b25cIiBjbGFzc05hbWU9e21vYmlsZVBhbmUgPT09ICdpbnNwZWN0JyA/ICdpcy1hY3RpdmUnIDogJyd9IG9uQ2xpY2s9eygpID0+IHNldE1vYmlsZVBhbmUoJ2luc3BlY3QnKX0+SW5zcGVjdDwvYnV0dG9uPjxidXR0b24gdHlwZT1cImJ1dHRvblwiIGNsYXNzTmFtZT17bW9iaWxlUGFuZSA9PT0gJ3ByZXZpZXcnID8gJ2lzLWFjdGl2ZScgOiAnJ30gb25DbGljaz17KCkgPT4gc2V0TW9iaWxlUGFuZSgncHJldmlldycpfT5QcmV2aWV3PC9idXR0b24+PC9uYXY+XG4gICAgPC9kaXY+XG4gICksIGRvY3VtZW50LmJvZHkpO1xufVxuIl0sImZpbGUiOiIvVXNlcnMvYWxleGFuZGVyYmVjay9Qcm9qZWN0cy1jb2RlL0FsZXhhbmRlciBCZWNrIFN0dWRpbyBXZWJzaXRlL3JlYWN0LWFwcC9hcHAvc3JjL3JvdXRlcy9hYm91dC1uYXJyYXRpdmUtbGFiL0Fib3V0TmFycmF0aXZlRWRpdG9yLmpzeCJ9