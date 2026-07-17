import { createHotContext as __vite__createHotContext } from "/@vite/client";import.meta.hot = __vite__createHotContext("/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx");import __vite__cjsImport0_react_jsxDevRuntime from "/node_modules/.vite/deps/react_jsx-dev-runtime.js?v=6e8fde4d"; const Fragment = __vite__cjsImport0_react_jsxDevRuntime["Fragment"]; const jsxDEV = __vite__cjsImport0_react_jsxDevRuntime["jsxDEV"];
var _s = $RefreshSig$(), _s2 = $RefreshSig$(), _s3 = $RefreshSig$(), _s4 = $RefreshSig$();
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
} from "/src/routes/about-narrative-lab/aboutNarrativeTimeline.js?t=1784283232750";
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
        lineNumber: 1162,
        columnNumber: 15
      }, this),
      /* @__PURE__ */ jsxDEV("strong", { children: section.label }, void 0, false, {
        fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
        lineNumber: 1162,
        columnNumber: 79
      }, this)
    ] }, void 0, true, {
      fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
      lineNumber: 1162,
      columnNumber: 7
    }, this),
    section.locked ? /* @__PURE__ */ jsxDEV("div", { className: "about-editor-lock", children: [
      /* @__PURE__ */ jsxDEV(LockKeyhole, { "aria-hidden": "true" }, void 0, false, {
        fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
        lineNumber: 1163,
        columnNumber: 60
      }, this),
      /* @__PURE__ */ jsxDEV("span", { children: "This protected Section cannot be reordered or have its World replaced accidentally." }, void 0, false, {
        fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
        lineNumber: 1163,
        columnNumber: 94
      }, this),
      /* @__PURE__ */ jsxDEV("button", { type: "button", onClick: () => update("Unlock protected Section", (draft) => {
        draft.locked = false;
      }), children: "Unlock advanced" }, void 0, false, {
        fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
        lineNumber: 1163,
        columnNumber: 190
      }, this)
    ] }, void 0, true, {
      fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
      lineNumber: 1163,
      columnNumber: 25
    }, this) : null,
    /* @__PURE__ */ jsxDEV("div", { className: "about-editor-inline-actions", children: [
      /* @__PURE__ */ jsxDEV("button", { type: "button", disabled: section.locked || sectionIndex === 0, onClick: () => move(-1), children: "Move earlier" }, void 0, false, {
        fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
        lineNumber: 1165,
        columnNumber: 9
      }, this),
      /* @__PURE__ */ jsxDEV("button", { type: "button", disabled: section.locked || sectionIndex === snapshot.document.sections.length - 1, onClick: () => move(1), children: "Move later" }, void 0, false, {
        fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
        lineNumber: 1166,
        columnNumber: 9
      }, this),
      /* @__PURE__ */ jsxDEV("button", { type: "button", disabled: section.locked || section.type === "finale", onClick: duplicate, children: "Duplicate" }, void 0, false, {
        fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
        lineNumber: 1167,
        columnNumber: 9
      }, this)
    ] }, void 0, true, {
      fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
      lineNumber: 1164,
      columnNumber: 7
    }, this),
    /* @__PURE__ */ jsxDEV(Property, { label: "Section name", children: /* @__PURE__ */ jsxDEV("input", { value: section.label, onChange: (event) => update("Rename Section", (draft) => {
      draft.label = event.target.value;
    }, `section:${section.id}:label`) }, void 0, false, {
      fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
      lineNumber: 1169,
      columnNumber: 38
    }, this) }, void 0, false, {
      fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
      lineNumber: 1169,
      columnNumber: 7
    }, this),
    /* @__PURE__ */ jsxDEV(Property, { label: "Stable ID", children: [
      /* @__PURE__ */ jsxDEV("input", { value: section.id, readOnly: true }, void 0, false, {
        fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
        lineNumber: 1170,
        columnNumber: 35
      }, this),
      /* @__PURE__ */ jsxDEV("small", { children: "References this Section without tying it to its current meaning." }, void 0, false, {
        fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
        lineNumber: 1170,
        columnNumber: 72
      }, this)
    ] }, void 0, true, {
      fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
      lineNumber: 1170,
      columnNumber: 7
    }, this),
    /* @__PURE__ */ jsxDEV(Property, { label: "Type", children: /* @__PURE__ */ jsxDEV("select", { value: section.type, disabled: section.type === "finale", onChange: (event) => update("Change Section type", (draft) => {
      draft.type = event.target.value;
    }), children: [
      /* @__PURE__ */ jsxDEV("option", { value: "spatial", children: "Spatial" }, void 0, false, {
        fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
        lineNumber: 1173,
        columnNumber: 11
      }, this),
      /* @__PURE__ */ jsxDEV("option", { value: "editorial", children: "Editorial" }, void 0, false, {
        fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
        lineNumber: 1173,
        columnNumber: 51
      }, this),
      /* @__PURE__ */ jsxDEV("option", { value: "finale", children: "Finale" }, void 0, false, {
        fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
        lineNumber: 1173,
        columnNumber: 95
      }, this)
    ] }, void 0, true, {
      fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
      lineNumber: 1172,
      columnNumber: 9
    }, this) }, void 0, false, {
      fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
      lineNumber: 1171,
      columnNumber: 7
    }, this),
    /* @__PURE__ */ jsxDEV("details", { open: true, children: [
      /* @__PURE__ */ jsxDEV("summary", { children: "Section timing" }, void 0, false, {
        fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
        lineNumber: 1177,
        columnNumber: 9
      }, this),
      /* @__PURE__ */ jsxDEV(Property, { label: "Scroll travel", children: /* @__PURE__ */ jsxDEV("output", { className: "about-editor-readout", children: formatWU(Math.max(0, activeExtent - 1)) }, void 0, false, {
        fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
        lineNumber: 1178,
        columnNumber: 41
      }, this) }, void 0, false, {
        fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
        lineNumber: 1178,
        columnNumber: 9
      }, this),
      /* @__PURE__ */ jsxDEV(Property, { label: "Total height", children: /* @__PURE__ */ jsxDEV("output", { className: "about-editor-readout", children: formatWU(activeExtent) }, void 0, false, {
        fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
        lineNumber: 1179,
        columnNumber: 40
      }, this) }, void 0, false, {
        fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
        lineNumber: 1179,
        columnNumber: 9
      }, this),
      /* @__PURE__ */ jsxDEV(NumberProperty, { label: "Desktop length", value: section.extentWU, min: 1, max: 8, step: 0.05, unit: "WU", onChange: (value) => update("Change desktop Section length", (draft) => {
        draft.extentWU = value;
      }, `section:${section.id}:extent`) }, void 0, false, {
        fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
        lineNumber: 1180,
        columnNumber: 9
      }, this),
      /* @__PURE__ */ jsxDEV(NumberProperty, { label: "Mobile length", value: section.mobileExtentWU, min: 1, max: 8, step: 0.05, unit: "WU", onChange: (value) => update("Change mobile Section length", (draft) => {
        draft.mobileExtentWU = value;
      }, `section:${section.id}:mobile`) }, void 0, false, {
        fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
        lineNumber: 1181,
        columnNumber: 9
      }, this),
      /* @__PURE__ */ jsxDEV(Property, { label: "Resolved height", children: /* @__PURE__ */ jsxDEV("output", { className: "about-editor-readout", children: formatWU(resolvedExtent) }, void 0, false, {
        fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
        lineNumber: 1182,
        columnNumber: 43
      }, this) }, void 0, false, {
        fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
        lineNumber: 1182,
        columnNumber: 9
      }, this),
      contentMinimumActive ? /* @__PURE__ */ jsxDEV("p", { className: "about-editor-timing-warning", children: [
        "Content minimum in effect. The rendered copy needs ",
        formatWU(resolvedExtent),
        " in this profile."
      ] }, void 0, true, {
        fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
        lineNumber: 1183,
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
          lineNumber: 1184,
          columnNumber: 9
        },
        this
      )
    ] }, void 0, true, {
      fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
      lineNumber: 1176,
      columnNumber: 7
    }, this),
    section.type === "editorial" ? /* @__PURE__ */ jsxDEV(EditorialBlocks, { store, snapshot, section }, void 0, false, {
      fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
      lineNumber: 1191,
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
        lineNumber: 1193,
        columnNumber: 7
      },
      this
    ) : null
  ] }, void 0, true, {
    fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
    lineNumber: 1161,
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
      lineNumber: 1231,
      columnNumber: 7
    }, this),
    (section.text.blocks || []).map(
      (block, blockIndex) => /* @__PURE__ */ jsxDEV("div", { className: "about-editor-block", children: [
        /* @__PURE__ */ jsxDEV("div", { children: [
          /* @__PURE__ */ jsxDEV("code", { children: block.kind }, void 0, false, {
            fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
            lineNumber: 1234,
            columnNumber: 16
          }, this),
          /* @__PURE__ */ jsxDEV("span", { children: block.id }, void 0, false, {
            fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
            lineNumber: 1234,
            columnNumber: 41
          }, this)
        ] }, void 0, true, {
          fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
          lineNumber: 1234,
          columnNumber: 11
        }, this),
        block.label != null ? /* @__PURE__ */ jsxDEV(Property, { label: "Label", children: /* @__PURE__ */ jsxDEV("input", { value: block.label, onChange: (event) => updateBlock(blockIndex, "label", event.target.value) }, void 0, false, {
          fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
          lineNumber: 1235,
          columnNumber: 58
        }, this) }, void 0, false, {
          fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
          lineNumber: 1235,
          columnNumber: 34
        }, this) : null,
        block.text != null ? /* @__PURE__ */ jsxDEV(Property, { label: "Copy", children: /* @__PURE__ */ jsxDEV("textarea", { rows: "5", value: block.text, onChange: (event) => updateBlock(blockIndex, "text", event.target.value) }, void 0, false, {
          fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
          lineNumber: 1236,
          columnNumber: 56
        }, this) }, void 0, false, {
          fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
          lineNumber: 1236,
          columnNumber: 33
        }, this) : null,
        block.kind === "prose" ? /* @__PURE__ */ jsxDEV(Property, { label: "Reconnect point grid", children: /* @__PURE__ */ jsxDEV("input", { type: "checkbox", checked: block.worldInfluence === true, onChange: (event) => updateBlock(blockIndex, "worldInfluence", event.target.checked) }, void 0, false, {
          fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
          lineNumber: 1237,
          columnNumber: 76
        }, this) }, void 0, false, {
          fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
          lineNumber: 1237,
          columnNumber: 37
        }, this) : null,
        block.text != null ? /* @__PURE__ */ jsxDEV("div", { className: "about-editor-emphasis-controls", children: [
          /* @__PURE__ */ jsxDEV("span", { children: "Highlighted words" }, void 0, false, {
            fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
            lineNumber: 1240,
            columnNumber: 15
          }, this),
          (block.emphasis || []).map(
            (item, emphasisIndex) => /* @__PURE__ */ jsxDEV("div", { className: "about-editor-emphasis-row", children: [
              /* @__PURE__ */ jsxDEV("input", { "aria-label": "Highlighted phrase", value: item.text, onChange: (event) => updateEmphasis(blockIndex, emphasisIndex, "text", event.target.value) }, void 0, false, {
                fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
                lineNumber: 1243,
                columnNumber: 19
              }, this),
              /* @__PURE__ */ jsxDEV("select", { "aria-label": "Highlight colour", value: item.tone, onChange: (event) => updateEmphasis(blockIndex, emphasisIndex, "tone", event.target.value), children: ABOUT_NARRATIVE_EMPHASIS_TONES.map((tone) => /* @__PURE__ */ jsxDEV("option", { value: tone, children: tone }, tone, false, {
                fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
                lineNumber: 1245,
                columnNumber: 67
              }, this)) }, void 0, false, {
                fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
                lineNumber: 1244,
                columnNumber: 19
              }, this),
              /* @__PURE__ */ jsxDEV("button", { type: "button", "aria-label": `Remove ${item.text || "empty"} highlight`, onClick: () => removeEmphasis(blockIndex, emphasisIndex), children: "×" }, void 0, false, {
                fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
                lineNumber: 1247,
                columnNumber: 19
              }, this)
            ] }, `${block.id}-emphasis-${emphasisIndex}`, true, {
              fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
              lineNumber: 1242,
              columnNumber: 11
            }, this)
          ),
          /* @__PURE__ */ jsxDEV("button", { type: "button", onClick: () => addEmphasis(blockIndex), children: "Add highlight" }, void 0, false, {
            fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
            lineNumber: 1250,
            columnNumber: 15
          }, this)
        ] }, void 0, true, {
          fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
          lineNumber: 1239,
          columnNumber: 9
        }, this) : null,
        block.items ? /* @__PURE__ */ jsxDEV(Property, { label: "Items", children: /* @__PURE__ */ jsxDEV("textarea", { rows: "6", value: block.items.join("\n"), onChange: (event) => updateBlock(blockIndex, "items", event.target.value.split("\n").filter(Boolean)) }, void 0, false, {
          fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
          lineNumber: 1253,
          columnNumber: 50
        }, this) }, void 0, false, {
          fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
          lineNumber: 1253,
          columnNumber: 26
        }, this) : null
      ] }, block.id, true, {
        fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
        lineNumber: 1233,
        columnNumber: 7
      }, this)
    ),
    /* @__PURE__ */ jsxDEV("button", { type: "button", className: "about-editor-wide-action", onClick: () => store.commit("Add editorial block", (draft) => {
      draft.sections[sectionIndex].text.blocks.push({ id: nextId(draft, `${section.id}-prose`), kind: "prose", text: "New editorial paragraph." });
    }), children: "Add prose block" }, void 0, false, {
      fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
      lineNumber: 1256,
      columnNumber: 7
    }, this)
  ] }, void 0, true, {
    fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
    lineNumber: 1230,
    columnNumber: 5
  }, this);
}
_c7 = EditorialBlocks;
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
      lineNumber: 1358,
      columnNumber: 7
    }, this),
    members.length > 1 ? /* @__PURE__ */ jsxDEV(Fragment, { children: [
      /* @__PURE__ */ jsxDEV("div", { className: "about-editor-rhythm-actions", children: [
        /* @__PURE__ */ jsxDEV("button", { type: "button", onClick: distribute, children: "Distribute evenly" }, void 0, false, {
          fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
          lineNumber: 1362,
          columnNumber: 13
        }, this),
        /* @__PURE__ */ jsxDEV("button", { type: "button", onClick: alignPrimary, children: "Align primary to playhead" }, void 0, false, {
          fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
          lineNumber: 1363,
          columnNumber: 13
        }, this)
      ] }, void 0, true, {
        fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
        lineNumber: 1361,
        columnNumber: 11
      }, this),
      /* @__PURE__ */ jsxDEV("div", { className: "about-editor-rhythm-gap", children: [
        /* @__PURE__ */ jsxDEV(Property, { label: "Exact gap", children: /* @__PURE__ */ jsxDEV("input", { type: "number", min: "0", max: "8", step: "0.05", value: gapWU, onChange: (event) => setGapWU(Math.max(0, Number(event.target.value) || 0)) }, void 0, false, {
          fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
          lineNumber: 1366,
          columnNumber: 41
        }, this) }, void 0, false, {
          fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
          lineNumber: 1366,
          columnNumber: 13
        }, this),
        /* @__PURE__ */ jsxDEV(Property, { label: "Anchor", children: /* @__PURE__ */ jsxDEV("select", { value: anchor, onChange: (event) => setAnchor(event.target.value), children: [
          /* @__PURE__ */ jsxDEV("option", { value: "primary", children: "Primary" }, void 0, false, {
            fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
            lineNumber: 1367,
            columnNumber: 113
          }, this),
          /* @__PURE__ */ jsxDEV("option", { value: "first", children: "First" }, void 0, false, {
            fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
            lineNumber: 1367,
            columnNumber: 153
          }, this),
          /* @__PURE__ */ jsxDEV("option", { value: "last", children: "Last" }, void 0, false, {
            fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
            lineNumber: 1367,
            columnNumber: 189
          }, this)
        ] }, void 0, true, {
          fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
          lineNumber: 1367,
          columnNumber: 38
        }, this) }, void 0, false, {
          fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
          lineNumber: 1367,
          columnNumber: 13
        }, this),
        /* @__PURE__ */ jsxDEV("button", { type: "button", onClick: exactGap, children: "Preview exact gap" }, void 0, false, {
          fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
          lineNumber: 1368,
          columnNumber: 13
        }, this)
      ] }, void 0, true, {
        fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
        lineNumber: 1365,
        columnNumber: 11
      }, this)
    ] }, void 0, true, {
      fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
      lineNumber: 1360,
      columnNumber: 7
    }, this) : null,
    ghostMoves.length ? /* @__PURE__ */ jsxDEV("div", { className: "about-editor-rhythm-preview", "aria-label": "Proposed title rhythm", children: ghostMoves.map((move) => {
      const compiled = snapshot.compiledPlan.sections.find((item) => item.id === move.sectionId);
      const storyWU = Number(compiled?.startWU || 0) + move.hold * Number(compiled?.travelWU || 0);
      return /* @__PURE__ */ jsxDEV("i", { style: { left: `${storyWU / maxWU * 100}%` }, title: `${move.cueId} · ${formatWU(storyWU)}` }, `${move.sectionId}:${move.cueId}`, false, {
        fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
        lineNumber: 1377,
        columnNumber: 18
      }, this);
    }) }, void 0, false, {
      fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
      lineNumber: 1373,
      columnNumber: 7
    }, this) : null,
    message ? /* @__PURE__ */ jsxDEV("p", { className: `about-editor-rhythm-message${preview && !preview.valid ? " is-error" : ""}`, children: message }, void 0, false, {
      fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
      lineNumber: 1381,
      columnNumber: 18
    }, this) : null,
    preview?.valid && snapshot.tryState ? /* @__PURE__ */ jsxDEV("div", { className: "about-editor-try", children: [
      /* @__PURE__ */ jsxDEV("span", { children: [
        "Previewing ",
        preview.label
      ] }, void 0, true, {
        fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
        lineNumber: 1382,
        columnNumber: 80
      }, this),
      /* @__PURE__ */ jsxDEV("button", { type: "button", onClick: cancelPreview, children: "Cancel" }, void 0, false, {
        fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
        lineNumber: 1382,
        columnNumber: 119
      }, this),
      /* @__PURE__ */ jsxDEV("button", { type: "button", className: "is-primary", onClick: applyPreview, children: "Apply" }, void 0, false, {
        fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
        lineNumber: 1382,
        columnNumber: 180
      }, this)
    ] }, void 0, true, {
      fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
      lineNumber: 1382,
      columnNumber: 46
    }, this) : null,
    /* @__PURE__ */ jsxDEV("div", { className: "about-editor-rhythm-actions", children: [
      /* @__PURE__ */ jsxDEV("button", { type: "button", onClick: duplicate, children: [
        "Duplicate ",
        members.length > 1 ? "selection" : "title"
      ] }, void 0, true, {
        fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
        lineNumber: 1384,
        columnNumber: 9
      }, this),
      /* @__PURE__ */ jsxDEV("button", { type: "button", onClick: copy, children: "Copy" }, void 0, false, {
        fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
        lineNumber: 1385,
        columnNumber: 9
      }, this),
      /* @__PURE__ */ jsxDEV("button", { type: "button", disabled: !clipboard, onClick: paste, children: "Paste at playhead" }, void 0, false, {
        fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
        lineNumber: 1386,
        columnNumber: 9
      }, this)
    ] }, void 0, true, {
      fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
      lineNumber: 1383,
      columnNumber: 7
    }, this)
  ] }, void 0, true, {
    fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
    lineNumber: 1357,
    columnNumber: 5
  }, this);
}
_s2(CueRhythmAndReuse, "FBEF/iZFu/d8cqsKz3ZKkoCj4nU=");
_c8 = CueRhythmAndReuse;
function CueInspector({ store, snapshot, section, clipboard, setClipboard }) {
  const selectedMembers = getAboutNarrativeSelectionMembers(snapshot.selection);
  const sectionIndex = getSectionIndex(snapshot.document, section.id);
  const cueIndex = section.text.cues.findIndex((cue2) => cue2.id === snapshot.selection.cueId);
  const cue = section.text.cues[cueIndex];
  if (!cue) return /* @__PURE__ */ jsxDEV(SectionInspector, { store, snapshot, section }, void 0, false, {
    fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
    lineNumber: 1397,
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
        lineNumber: 1417,
        columnNumber: 15
      }, this),
      /* @__PURE__ */ jsxDEV("strong", { children: cue.id }, void 0, false, {
        fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
        lineNumber: 1417,
        columnNumber: 36
      }, this)
    ] }, void 0, true, {
      fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
      lineNumber: 1417,
      columnNumber: 7
    }, this),
    selectedMembers.length > 1 ? /* @__PURE__ */ jsxDEV("div", { className: "about-editor-group-summary", children: [
      /* @__PURE__ */ jsxDEV("strong", { children: [
        selectedMembers.length,
        " titles selected"
      ] }, void 0, true, {
        fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
        lineNumber: 1420,
        columnNumber: 11
      }, this),
      /* @__PURE__ */ jsxDEV("ol", { children: selectedMembers.map((member) => {
        const memberSection = snapshot.document.sections.find((item) => item.id === member.sectionId);
        const memberCue = memberSection?.text?.cues?.find((item) => item.id === member.cueId);
        return /* @__PURE__ */ jsxDEV("li", { children: [
          /* @__PURE__ */ jsxDEV("span", { children: memberSection?.label }, void 0, false, {
            fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
            lineNumber: 1424,
            columnNumber: 68
          }, this),
          memberCue?.text
        ] }, `${member.sectionId}:${member.cueId}`, true, {
          fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
          lineNumber: 1424,
          columnNumber: 20
        }, this);
      }) }, void 0, false, {
        fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
        lineNumber: 1421,
        columnNumber: 11
      }, this),
      /* @__PURE__ */ jsxDEV("button", { type: "button", onClick: () => store.setSelection({ type: "cue", sectionId: section.id, cueId: cue.id, keyPart: "focus" }), children: "Keep primary only" }, void 0, false, {
        fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
        lineNumber: 1426,
        columnNumber: 11
      }, this)
    ] }, void 0, true, {
      fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
      lineNumber: 1419,
      columnNumber: 7
    }, this) : null,
    /* @__PURE__ */ jsxDEV("p", { className: "about-editor-help", children: "Drag the pink timing marker anywhere from 0–100% of its Section. This moves the title's focus time only. Its travel duration, speed, blur, and in/out cadence remain controlled globally under Spatial titles." }, void 0, false, {
      fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
      lineNumber: 1429,
      columnNumber: 7
    }, this),
    /* @__PURE__ */ jsxDEV(Property, { label: "Statement", children: /* @__PURE__ */ jsxDEV("textarea", { rows: "7", value: cue.text, onChange: (event) => update("text", event.target.value) }, void 0, false, {
      fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
      lineNumber: 1430,
      columnNumber: 35
    }, this) }, void 0, false, {
      fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
      lineNumber: 1430,
      columnNumber: 7
    }, this),
    /* @__PURE__ */ jsxDEV(Property, { label: "Movement", children: /* @__PURE__ */ jsxDEV("select", { value: movement, onChange: (event) => updateMovement(event.target.value), children: [
      /* @__PURE__ */ jsxDEV("option", { value: "spatial", children: "Spatial travel" }, void 0, false, {
        fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
        lineNumber: 1431,
        columnNumber: 116
      }, this),
      /* @__PURE__ */ jsxDEV("option", { value: "vertical", children: "Vertical scroll" }, void 0, false, {
        fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
        lineNumber: 1431,
        columnNumber: 163
      }, this)
    ] }, void 0, true, {
      fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
      lineNumber: 1431,
      columnNumber: 34
    }, this) }, void 0, false, {
      fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
      lineNumber: 1431,
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
        lineNumber: 1432,
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
        lineNumber: 1444,
        columnNumber: 41
      }, this) }, void 0, false, {
        fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
        lineNumber: 1444,
        columnNumber: 11
      }, this),
      /* @__PURE__ */ jsxDEV(Property, { label: "Motion preset", children: /* @__PURE__ */ jsxDEV("select", { value: cue.preset, onChange: (event) => update("preset", event.target.value), children: [
        /* @__PURE__ */ jsxDEV("option", { value: "travelling-title-v1", children: "Travelling title" }, void 0, false, {
          fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
          lineNumber: 1445,
          columnNumber: 129
        }, this),
        /* @__PURE__ */ jsxDEV("option", { value: "opener-v1", children: "Opener" }, void 0, false, {
          fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
          lineNumber: 1445,
          columnNumber: 190
        }, this),
        /* @__PURE__ */ jsxDEV("option", { value: "finale-v1", children: "Finale" }, void 0, false, {
          fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
          lineNumber: 1445,
          columnNumber: 231
        }, this)
      ] }, void 0, true, {
        fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
        lineNumber: 1445,
        columnNumber: 43
      }, this) }, void 0, false, {
        fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
        lineNumber: 1445,
        columnNumber: 11
      }, this)
    ] }, void 0, true, {
      fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
      lineNumber: 1443,
      columnNumber: 7
    }, this) : /* @__PURE__ */ jsxDEV(Property, { label: "Reveal", children: /* @__PURE__ */ jsxDEV("output", { className: "about-editor-readout", children: "Editorial vertical scroll" }, void 0, false, {
      fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
      lineNumber: 1447,
      columnNumber: 32
    }, this) }, void 0, false, {
      fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
      lineNumber: 1447,
      columnNumber: 7
    }, this),
    /* @__PURE__ */ jsxDEV(CueRhythmAndReuse, { store, snapshot, clipboard, setClipboard }, void 0, false, {
      fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
      lineNumber: 1448,
      columnNumber: 7
    }, this),
    /* @__PURE__ */ jsxDEV("button", { type: "button", className: "about-editor-danger", disabled: section.type === "finale", onClick: remove, children: "Delete Cue" }, void 0, false, {
      fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
      lineNumber: 1449,
      columnNumber: 7
    }, this)
  ] }, void 0, true, {
    fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
    lineNumber: 1416,
    columnNumber: 5
  }, this);
}
_c9 = CueInspector;
function DisciplineRevealInspector({ store, snapshot, section }) {
  const sectionIndex = getSectionIndex(snapshot.document, section.id);
  const reveal = section.text.disciplineReveal;
  if (!reveal) return /* @__PURE__ */ jsxDEV(SectionInspector, { store, snapshot, section }, void 0, false, {
    fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
    lineNumber: 1457,
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
        lineNumber: 1481,
        columnNumber: 15
      }, this),
      /* @__PURE__ */ jsxDEV("strong", { children: "Discipline reveal" }, void 0, false, {
        fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
        lineNumber: 1481,
        columnNumber: 41
      }, this)
    ] }, void 0, true, {
      fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
      lineNumber: 1481,
      columnNumber: 7
    }, this),
    /* @__PURE__ */ jsxDEV("p", { className: "about-editor-help", children: "One clip controls the complete six-point sequence. Drag its striped block in the Text lane to move every reveal together." }, void 0, false, {
      fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
      lineNumber: 1482,
      columnNumber: 7
    }, this),
    /* @__PURE__ */ jsxDEV("details", { open: true, children: [
      /* @__PURE__ */ jsxDEV("summary", { children: "Reveal choreography" }, void 0, false, {
        fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
        lineNumber: 1483,
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
            lineNumber: 1487,
            columnNumber: 13
          },
          this
        );
      })
    ] }, void 0, true, {
      fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
      lineNumber: 1483,
      columnNumber: 7
    }, this),
    /* @__PURE__ */ jsxDEV("details", { open: true, children: [
      /* @__PURE__ */ jsxDEV("summary", { children: "Reveal order and labels" }, void 0, false, {
        fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
        lineNumber: 1500,
        columnNumber: 21
      }, this),
      /* @__PURE__ */ jsxDEV("div", { className: "about-editor-discipline-items", children: reveal.items.map(
        (item, itemIndex) => /* @__PURE__ */ jsxDEV("div", { className: "about-editor-discipline-item", children: [
          /* @__PURE__ */ jsxDEV("code", { children: String(itemIndex + 1).padStart(2, "0") }, void 0, false, {
            fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
            lineNumber: 1504,
            columnNumber: 15
          }, this),
          /* @__PURE__ */ jsxDEV("input", { value: item.label, "aria-label": `Discipline ${itemIndex + 1} label`, onChange: (event) => update("Edit discipline label", (draft) => {
            draft.items[itemIndex].label = event.target.value;
          }, `discipline-reveal:${section.id}:item:${item.group}:label`) }, void 0, false, {
            fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
            lineNumber: 1505,
            columnNumber: 15
          }, this),
          /* @__PURE__ */ jsxDEV("div", { className: "about-editor-discipline-palette", title: `${item.label} uses the Home simulation ${DISCIPLINE_BALL_TOKEN_BY_GROUP[item.group]}`, children: [
            /* @__PURE__ */ jsxDEV("i", { style: { background: `var(${DISCIPLINE_BALL_TOKEN_BY_GROUP[item.group]})` } }, void 0, false, {
              fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
              lineNumber: 1507,
              columnNumber: 17
            }, this),
            /* @__PURE__ */ jsxDEV("code", { children: DISCIPLINE_BALL_TOKEN_BY_GROUP[item.group] }, void 0, false, {
              fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
              lineNumber: 1508,
              columnNumber: 17
            }, this)
          ] }, void 0, true, {
            fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
            lineNumber: 1506,
            columnNumber: 15
          }, this),
          /* @__PURE__ */ jsxDEV("span", { children: [
            /* @__PURE__ */ jsxDEV("button", { type: "button", disabled: itemIndex === 0, "aria-label": `Reveal ${item.label} earlier`, onClick: () => update("Reorder discipline reveal", (draft) => {
              const [moved] = draft.items.splice(itemIndex, 1);
              draft.items.splice(itemIndex - 1, 0, moved);
            }), children: "↑" }, void 0, false, {
              fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
              lineNumber: 1511,
              columnNumber: 17
            }, this),
            /* @__PURE__ */ jsxDEV("button", { type: "button", disabled: itemIndex === reveal.items.length - 1, "aria-label": `Reveal ${item.label} later`, onClick: () => update("Reorder discipline reveal", (draft) => {
              const [moved] = draft.items.splice(itemIndex, 1);
              draft.items.splice(itemIndex + 1, 0, moved);
            }), children: "↓" }, void 0, false, {
              fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
              lineNumber: 1512,
              columnNumber: 17
            }, this)
          ] }, void 0, true, {
            fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
            lineNumber: 1510,
            columnNumber: 15
          }, this)
        ] }, item.group, true, {
          fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
          lineNumber: 1503,
          columnNumber: 11
        }, this)
      ) }, void 0, false, {
        fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
        lineNumber: 1501,
        columnNumber: 9
      }, this)
    ] }, void 0, true, {
      fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
      lineNumber: 1500,
      columnNumber: 7
    }, this),
    /* @__PURE__ */ jsxDEV("p", { className: "about-editor-help", children: "The six points persist after the labels leave. An editorial block marked “Reconnect point grid” restores the surrounding grid as that paragraph enters." }, void 0, false, {
      fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
      lineNumber: 1518,
      columnNumber: 7
    }, this)
  ] }, void 0, true, {
    fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
    lineNumber: 1480,
    columnNumber: 5
  }, this);
}
_c0 = DisciplineRevealInspector;
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
    lineNumber: 1582,
    columnNumber: 127
  }, this)) }, void 0, false, {
    fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
    lineNumber: 1582,
    columnNumber: 19
  }, this);
  if (!key) {
    return /* @__PURE__ */ jsxDEV(Fragment, { children: [
      /* @__PURE__ */ jsxDEV("header", { children: [
        /* @__PURE__ */ jsxDEV("span", { children: "Camera track" }, void 0, false, {
          fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
          lineNumber: 1584,
          columnNumber: 22
        }, this),
        /* @__PURE__ */ jsxDEV("strong", { children: "Editing Section base" }, void 0, false, {
          fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
          lineNumber: 1584,
          columnNumber: 47
        }, this)
      ] }, void 0, true, {
        fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
        lineNumber: 1584,
        columnNumber: 14
      }, this),
      /* @__PURE__ */ jsxDEV("p", { className: "about-editor-help", children: "The dolly and Section joins are continuous automatically. Add visible keys only where the framing, aim, roll, or lens should change." }, void 0, false, {
        fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
        lineNumber: 1584,
        columnNumber: 93
      }, this),
      recipes,
      /* @__PURE__ */ jsxDEV("button", { type: "button", className: "about-editor-wide-action", onClick: setKey, children: [
        "Set camera key at ",
        formatCameraPercent(targetAt)
      ] }, void 0, true, {
        fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
        lineNumber: 1584,
        columnNumber: 271
      }, this)
    ] }, void 0, true, {
      fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
      lineNumber: 1584,
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
        lineNumber: 1603,
        columnNumber: 15
      }, this),
      /* @__PURE__ */ jsxDEV("strong", { children: [
        formatCameraPercent(key.at),
        " through ",
        section.label
      ] }, void 0, true, {
        fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
        lineNumber: 1603,
        columnNumber: 38
      }, this)
    ] }, void 0, true, {
      fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
      lineNumber: 1603,
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
        lineNumber: 1605,
        columnNumber: 7
      },
      this
    ),
    /* @__PURE__ */ jsxDEV(NumberProperty, { label: extentLabel, value: section[extentField], min: 1, max: 8, step: 0.05, unit: "WU", onChange: updateExtent }, void 0, false, {
      fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
      lineNumber: 1614,
      columnNumber: 7
    }, this),
    ["X offset", "Y offset", "Forward offset"].map((label, axis) => /* @__PURE__ */ jsxDEV(NumberProperty, { label, value: key.offset[axis], min: -8, max: 8, step: 0.02, unit: "WU", onChange: (value) => updateVector("offset", axis, value) }, label, false, {
      fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
      lineNumber: 1615,
      columnNumber: 72
    }, this)),
    ["Aim X", "Aim Y", "Aim depth"].map((label, axis) => /* @__PURE__ */ jsxDEV(NumberProperty, { label, value: key.lookAtOffset[axis], min: -8, max: 8, step: 0.02, unit: "WU", onChange: (value) => updateVector("lookAtOffset", axis, value) }, label, false, {
      fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
      lineNumber: 1616,
      columnNumber: 61
    }, this)),
    /* @__PURE__ */ jsxDEV(NumberProperty, { label: "Field of view", value: key.fov, min: 20, max: 90, step: 1, unit: "°", onChange: (value) => update("fov", value) }, void 0, false, {
      fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
      lineNumber: 1617,
      columnNumber: 7
    }, this),
    /* @__PURE__ */ jsxDEV(NumberProperty, { label: "Roll", value: key.roll, min: -1.2, max: 1.2, step: 0.01, unit: "rad", onChange: (value) => update("roll", value) }, void 0, false, {
      fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
      lineNumber: 1618,
      columnNumber: 7
    }, this),
    /* @__PURE__ */ jsxDEV(Property, { label: "Easing", children: /* @__PURE__ */ jsxDEV("select", { value: key.easing, onChange: (event) => update("easing", event.target.value), children: [
      /* @__PURE__ */ jsxDEV("option", { value: "smoothstep", children: "Smoothstep" }, void 0, false, {
        fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
        lineNumber: 1619,
        columnNumber: 118
      }, this),
      /* @__PURE__ */ jsxDEV("option", { value: "ease-in-out", children: "Ease in out" }, void 0, false, {
        fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
        lineNumber: 1619,
        columnNumber: 164
      }, this)
    ] }, void 0, true, {
      fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
      lineNumber: 1619,
      columnNumber: 32
    }, this) }, void 0, false, {
      fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
      lineNumber: 1619,
      columnNumber: 7
    }, this),
    /* @__PURE__ */ jsxDEV("button", { type: "button", className: "about-editor-wide-action", disabled: existingKeyAtPlayhead >= 0, onClick: setKey, children: existingKeyAtPlayhead >= 0 ? `Camera key already at ${formatCameraPercent(targetAt)}` : `Set another key at ${formatCameraPercent(targetAt)}` }, void 0, false, {
      fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
      lineNumber: 1620,
      columnNumber: 7
    }, this),
    /* @__PURE__ */ jsxDEV("button", { type: "button", className: "about-editor-danger", onClick: () => store.commit("Delete camera key", (draft) => {
      draft.sections[sectionIndex].camera.keys.splice(keyIndex, 1);
    }, { selection: { type: "section", sectionId: section.id } }), children: "Delete key" }, void 0, false, {
      fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
      lineNumber: 1621,
      columnNumber: 7
    }, this)
  ] }, void 0, true, {
    fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
    lineNumber: 1602,
    columnNumber: 5
  }, this);
}
_c1 = CameraInspector;
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
          lineNumber: 1636,
          columnNumber: 22
        }, this),
        /* @__PURE__ */ jsxDEV("strong", { children: "Inherited World" }, void 0, false, {
          fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
          lineNumber: 1636,
          columnNumber: 46
        }, this)
      ] }, void 0, true, {
        fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
        lineNumber: 1636,
        columnNumber: 14
      }, this),
      /* @__PURE__ */ jsxDEV("p", { className: "about-editor-help", children: "This Section keeps the previous World. Choose “Create World clip” only when the shape should change here." }, void 0, false, {
        fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
        lineNumber: 1636,
        columnNumber: 87
      }, this),
      /* @__PURE__ */ jsxDEV("button", { type: "button", className: "about-editor-wide-action", onClick: () => store.commit("Create World clip", (draft) => {
        draft.sections[sectionIndex].world = cloneAboutNarrativeDocument(draft.sections.slice(0, sectionIndex).reverse().find((item) => item.world.mode === "set")?.world || draft.sections[0].world);
      }), children: "Create World clip" }, void 0, false, {
        fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
        lineNumber: 1636,
        columnNumber: 229
      }, this)
    ] }, void 0, true, {
      fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
      lineNumber: 1636,
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
        lineNumber: 1669,
        columnNumber: 15
      }, this),
      /* @__PURE__ */ jsxDEV("strong", { children: shape?.label || world.shapeId }, void 0, false, {
        fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
        lineNumber: 1669,
        columnNumber: 38
      }, this)
    ] }, void 0, true, {
      fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
      lineNumber: 1669,
      columnNumber: 7
    }, this),
    /* @__PURE__ */ jsxDEV("div", { className: "about-editor-shape-catalog", children: Object.values(ABOUT_NARRATIVE_SHAPE_DEFINITIONS).map(
      (item) => /* @__PURE__ */ jsxDEV("button", { type: "button", disabled: section.locked, className: item.id === world.shapeId ? "is-selected" : "", onClick: () => tryShape(item.id), children: [
        /* @__PURE__ */ jsxDEV("i", {}, void 0, false, {
          fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
          lineNumber: 1673,
          columnNumber: 13
        }, this),
        /* @__PURE__ */ jsxDEV("span", { children: [
          /* @__PURE__ */ jsxDEV("strong", { children: item.label }, void 0, false, {
            fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
            lineNumber: 1673,
            columnNumber: 24
          }, this),
          /* @__PURE__ */ jsxDEV("small", { children: [
            "Cost ",
            item.cost,
            " · Point field"
          ] }, void 0, true, {
            fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
            lineNumber: 1673,
            columnNumber: 53
          }, this)
        ] }, void 0, true, {
          fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
          lineNumber: 1673,
          columnNumber: 18
        }, this)
      ] }, item.id, true, {
        fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
        lineNumber: 1672,
        columnNumber: 9
      }, this)
    ) }, void 0, false, {
      fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
      lineNumber: 1670,
      columnNumber: 7
    }, this),
    snapshot.tryState ? /* @__PURE__ */ jsxDEV("div", { className: "about-editor-try", children: [
      /* @__PURE__ */ jsxDEV("span", { children: [
        "Trying ",
        snapshot.tryState.label
      ] }, void 0, true, {
        fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
        lineNumber: 1677,
        columnNumber: 62
      }, this),
      /* @__PURE__ */ jsxDEV("button", { type: "button", onClick: () => store.cancelTry(), children: "Cancel" }, void 0, false, {
        fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
        lineNumber: 1677,
        columnNumber: 107
      }, this),
      /* @__PURE__ */ jsxDEV("button", { type: "button", className: "is-primary", onClick: () => store.applyTry(), children: "Apply" }, void 0, false, {
        fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
        lineNumber: 1677,
        columnNumber: 178
      }, this)
    ] }, void 0, true, {
      fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
      lineNumber: 1677,
      columnNumber: 28
    }, this) : null,
    /* @__PURE__ */ jsxDEV("details", { open: true, children: [
      /* @__PURE__ */ jsxDEV("summary", { children: "Shape parameters" }, void 0, false, {
        fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
        lineNumber: 1678,
        columnNumber: 21
      }, this),
      (shape?.parameters || []).map((control) => /* @__PURE__ */ jsxDEV(NumberProperty, { label: control.label, value: world.shapeParameters[control.id], min: control.min, max: control.max, step: control.step, unit: control.unit, onChange: (value) => update(`Change ${control.label}`, (draft) => {
        draft.shapeParameters[control.id] = value;
      }, `world:${section.id}:${control.id}`) }, control.id, false, {
        fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
        lineNumber: 1679,
        columnNumber: 53
      }, this)),
      /* @__PURE__ */ jsxDEV("div", { className: "about-editor-inline-actions", children: [
        /* @__PURE__ */ jsxDEV("button", { type: "button", onClick: () => update("Reseed Shape", (draft) => {
          draft.seed = Math.floor(Math.random() * 4294967295);
        }), children: "Reseed" }, void 0, false, {
          fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
          lineNumber: 1680,
          columnNumber: 54
        }, this),
        /* @__PURE__ */ jsxDEV("code", { children: world.seed }, void 0, false, {
          fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
          lineNumber: 1680,
          columnNumber: 197
        }, this)
      ] }, void 0, true, {
        fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
        lineNumber: 1680,
        columnNumber: 9
      }, this)
    ] }, void 0, true, {
      fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
      lineNumber: 1678,
      columnNumber: 7
    }, this),
    /* @__PURE__ */ jsxDEV("details", { open: true, children: [
      /* @__PURE__ */ jsxDEV("summary", { children: "Placement" }, void 0, false, {
        fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
        lineNumber: 1682,
        columnNumber: 21
      }, this),
      /* @__PURE__ */ jsxDEV(NumberProperty, { label: "Distance at entry", value: world.entryDistanceWU, min: 0.2, max: 16, step: 0.05, unit: "WU", onChange: (value) => update("Move World", (draft) => {
        draft.entryDistanceWU = value;
      }, `world:${section.id}:distance`) }, void 0, false, {
        fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
        lineNumber: 1683,
        columnNumber: 9
      }, this),
      /* @__PURE__ */ jsxDEV(NumberProperty, { label: "Scale", value: world.transform.scale, min: 0.1, max: 3, step: 0.01, onChange: (value) => update("Scale World", (draft) => {
        draft.transform.scale = value;
      }, `world:${section.id}:scale`) }, void 0, false, {
        fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
        lineNumber: 1684,
        columnNumber: 9
      }, this)
    ] }, void 0, true, {
      fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
      lineNumber: 1682,
      columnNumber: 7
    }, this),
    /* @__PURE__ */ jsxDEV("details", { open: true, children: [
      /* @__PURE__ */ jsxDEV("summary", { children: "Transition in" }, void 0, false, {
        fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
        lineNumber: 1686,
        columnNumber: 21
      }, this),
      transitionEnabled ? /* @__PURE__ */ jsxDEV(Fragment, { children: [
        /* @__PURE__ */ jsxDEV("p", { className: "about-editor-help", children: [
          "Timing is relative to this Section: 1 is its end; values above 1 continue across inherited World Sections. The next World begins at ",
          transitionLimit.toFixed(3),
          "."
        ] }, void 0, true, {
          fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
          lineNumber: 1688,
          columnNumber: 11
        }, this),
        /* @__PURE__ */ jsxDEV(NumberProperty, { label: "Start", value: world.transitionIn.start, min: 0, max: transitionMax, step: 5e-3, unit: "× section", onChange: (value) => update("Change transition start", (draft) => {
          draft.transitionIn.start = Math.min(value, draft.transitionIn.end);
        }) }, void 0, false, {
          fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
          lineNumber: 1689,
          columnNumber: 11
        }, this),
        /* @__PURE__ */ jsxDEV(NumberProperty, { label: "End", value: world.transitionIn.end, min: 0, max: transitionMax, step: 5e-3, unit: "× section", onChange: (value) => update("Change transition end", (draft) => {
          draft.transitionIn.end = Math.max(value, draft.transitionIn.start);
        }) }, void 0, false, {
          fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
          lineNumber: 1690,
          columnNumber: 11
        }, this),
        /* @__PURE__ */ jsxDEV(Property, { label: "Type", children: /* @__PURE__ */ jsxDEV("select", { value: world.transitionIn.type, onChange: (event) => update("Change transition type", (draft) => {
          draft.transitionIn.type = event.target.value;
        }), children: [
          /* @__PURE__ */ jsxDEV("option", { value: "morph", children: "Morph" }, void 0, false, {
            fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
            lineNumber: 1691,
            columnNumber: 189
          }, this),
          /* @__PURE__ */ jsxDEV("option", { value: "dissolve-morph", children: "Dissolve morph" }, void 0, false, {
            fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
            lineNumber: 1691,
            columnNumber: 225
          }, this),
          /* @__PURE__ */ jsxDEV("option", { value: "crossfade", children: "Crossfade" }, void 0, false, {
            fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
            lineNumber: 1691,
            columnNumber: 279
          }, this),
          /* @__PURE__ */ jsxDEV("option", { value: "hold", children: "Hold" }, void 0, false, {
            fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
            lineNumber: 1691,
            columnNumber: 323
          }, this)
        ] }, void 0, true, {
          fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
          lineNumber: 1691,
          columnNumber: 34
        }, this) }, void 0, false, {
          fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
          lineNumber: 1691,
          columnNumber: 11
        }, this),
        /* @__PURE__ */ jsxDEV(Property, { label: "Easing", children: /* @__PURE__ */ jsxDEV("select", { value: world.transitionIn.easing, onChange: (event) => update("Change transition easing", (draft) => {
          draft.transitionIn.easing = event.target.value;
        }), children: [
          /* @__PURE__ */ jsxDEV("option", { value: "linear", children: "Linear" }, void 0, false, {
            fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
            lineNumber: 1692,
            columnNumber: 197
          }, this),
          /* @__PURE__ */ jsxDEV("option", { value: "smoothstep", children: "Smoothstep" }, void 0, false, {
            fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
            lineNumber: 1692,
            columnNumber: 235
          }, this),
          /* @__PURE__ */ jsxDEV("option", { value: "ease-in", children: "Ease in" }, void 0, false, {
            fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
            lineNumber: 1692,
            columnNumber: 281
          }, this),
          /* @__PURE__ */ jsxDEV("option", { value: "ease-out", children: "Ease out" }, void 0, false, {
            fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
            lineNumber: 1692,
            columnNumber: 321
          }, this),
          /* @__PURE__ */ jsxDEV("option", { value: "ease-in-out", children: "Ease in out" }, void 0, false, {
            fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
            lineNumber: 1692,
            columnNumber: 363
          }, this),
          /* @__PURE__ */ jsxDEV("option", { value: "hold", children: "Hold" }, void 0, false, {
            fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
            lineNumber: 1692,
            columnNumber: 411
          }, this)
        ] }, void 0, true, {
          fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
          lineNumber: 1692,
          columnNumber: 36
        }, this) }, void 0, false, {
          fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
          lineNumber: 1692,
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
          lineNumber: 1693,
          columnNumber: 11
        }, this),
        /* @__PURE__ */ jsxDEV(Property, { label: "Correspondence", children: /* @__PURE__ */ jsxDEV("select", { "aria-label": "Correspondence", value: world.transitionIn.correspondence, disabled: !correspondenceEnabled, title: correspondenceEnabled ? "Choose how source points are assigned to target points." : "Correspondence applies to Morph and Dissolve morph transitions.", onChange: (event) => update("Change correspondence", (draft) => {
          draft.transitionIn.correspondence = event.target.value;
        }), children: ABOUT_NARRATIVE_CORRESPONDENCE_MODES.map((mode) => /* @__PURE__ */ jsxDEV("option", { value: mode, children: CORRESPONDENCE_LABELS[mode] || mode }, mode, false, {
          fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
          lineNumber: 1694,
          columnNumber: 490
        }, this)) }, void 0, false, {
          fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
          lineNumber: 1694,
          columnNumber: 44
        }, this) }, void 0, false, {
          fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
          lineNumber: 1694,
          columnNumber: 11
        }, this),
        /* @__PURE__ */ jsxDEV("p", { className: "about-editor-help", role: "status", "aria-live": "polite", children: [
          "Correspondence: ",
          correspondenceStatus,
          prepared && runtimeMetrics?.correspondenceToWorldId === section.id && Number.isFinite(runtimeMetrics?.correspondenceImprovement) ? ` · ${Math.round(runtimeMetrics.correspondenceImprovement * 100)}% RMS improvement` : "",
          "."
        ] }, void 0, true, {
          fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
          lineNumber: 1695,
          columnNumber: 11
        }, this),
        /* @__PURE__ */ jsxDEV("button", { type: "button", className: "about-editor-danger", onClick: () => store.commit("Remove World transition", (draft) => {
          const transition = draft.sections[sectionIndex].world.transitionIn;
          transition.start = 0;
          transition.end = 0;
          transition.type = "cut";
        }, { selection: { type: "world", sectionId: section.id } }), children: "Remove transition keyframes" }, void 0, false, {
          fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
          lineNumber: 1696,
          columnNumber: 11
        }, this)
      ] }, void 0, true, {
        fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
        lineNumber: 1687,
        columnNumber: 30
      }, this) : /* @__PURE__ */ jsxDEV(Fragment, { children: [
        /* @__PURE__ */ jsxDEV("p", { className: "about-editor-help", children: "This World cuts in at the Section boundary and has no transition keyframes." }, void 0, false, {
          fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
          lineNumber: 1703,
          columnNumber: 11
        }, this),
        /* @__PURE__ */ jsxDEV("button", { type: "button", className: "about-editor-wide-action", onClick: () => store.commit("Add World transition", (draft) => {
          const transition = draft.sections[sectionIndex].world.transitionIn;
          transition.start = Math.min(0.08, transitionLimit);
          transition.end = Math.min(0.68, transitionLimit);
          transition.type = "morph";
        }, { selection: { type: "world", sectionId: section.id } }), children: "Add transition keyframes" }, void 0, false, {
          fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
          lineNumber: 1704,
          columnNumber: 11
        }, this)
      ] }, void 0, true, {
        fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
        lineNumber: 1702,
        columnNumber: 15
      }, this)
    ] }, void 0, true, {
      fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
      lineNumber: 1686,
      columnNumber: 7
    }, this),
    /* @__PURE__ */ jsxDEV("details", { open: true, children: [
      /* @__PURE__ */ jsxDEV("summary", { children: "Modifier stack" }, void 0, false, {
        fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
        lineNumber: 1712,
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
                lineNumber: 1721,
                columnNumber: 105
              }, this),
              definition?.label || item.id
            ] }, void 0, true, {
              fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
              lineNumber: 1721,
              columnNumber: 98
            }, this),
            /* @__PURE__ */ jsxDEV("span", { children: [
              /* @__PURE__ */ jsxDEV("button", { type: "button", disabled: modifierIndex === 0, onClick: () => moveModifier(-1), "aria-label": "Move modifier up", children: "↑" }, void 0, false, {
                fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
                lineNumber: 1721,
                columnNumber: 334
              }, this),
              /* @__PURE__ */ jsxDEV("button", { type: "button", disabled: modifierIndex === world.modifiers.length - 1, onClick: () => moveModifier(1), "aria-label": "Move modifier down", children: "↓" }, void 0, false, {
                fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
                lineNumber: 1721,
                columnNumber: 460
              }, this),
              " Cost ",
              definition?.cost || "?"
            ] }, void 0, true, {
              fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
              lineNumber: 1721,
              columnNumber: 328
            }, this)
          ] }, void 0, true, {
            fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
            lineNumber: 1721,
            columnNumber: 93
          }, this),
          (definition?.parameters || []).map((control) => control.type === "range" ? /* @__PURE__ */ jsxDEV(NumberProperty, { label: control.label, value: item.parameters[control.id], min: control.min, max: control.max, step: control.step, unit: control.unit, onChange: (value) => update(`Change ${control.label}`, (draft) => {
            draft.modifiers[modifierIndex].parameters[control.id] = value;
          }, `modifier:${section.id}:${modifierIndex}:${control.id}`) }, control.id, false, {
            fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
            lineNumber: 1721,
            columnNumber: 732
          }, this) : /* @__PURE__ */ jsxDEV(Property, { label: control.label, children: /* @__PURE__ */ jsxDEV("select", { value: item.parameters[control.id], onChange: (event) => update(`Change ${control.label}`, (draft) => {
            draft.modifiers[modifierIndex].parameters[control.id] = event.target.value;
          }), children: control.options.map((option) => /* @__PURE__ */ jsxDEV("option", { children: option }, option, false, {
            fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
            lineNumber: 1721,
            columnNumber: 1366
          }, this)) }, void 0, false, {
            fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
            lineNumber: 1721,
            columnNumber: 1143
          }, this) }, control.id, false, {
            fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
            lineNumber: 1721,
            columnNumber: 1094
          }, this))
        ] }, `${item.id}-${modifierIndex}`, true, {
          fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
          lineNumber: 1721,
          columnNumber: 18
        }, this);
      })
    ] }, void 0, true, {
      fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
      lineNumber: 1712,
      columnNumber: 7
    }, this)
  ] }, void 0, true, {
    fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
    lineNumber: 1668,
    columnNumber: 5
  }, this);
}
_c10 = WorldInspector;
function Diagnostics({ diagnostics }) {
  if (!diagnostics.length) return /* @__PURE__ */ jsxDEV("div", { className: "about-editor-diagnostics is-clear", children: [
    /* @__PURE__ */ jsxDEV(Check, { "aria-hidden": "true" }, void 0, false, {
      fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
      lineNumber: 1729,
      columnNumber: 86
    }, this),
    " No diagnostics"
  ] }, void 0, true, {
    fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
    lineNumber: 1729,
    columnNumber: 35
  }, this);
  return /* @__PURE__ */ jsxDEV("div", { className: "about-editor-diagnostics", children: diagnostics.map((item, index) => {
    const DiagnosticIcon = item.level === "error" ? CircleAlert : Info;
    return /* @__PURE__ */ jsxDEV("div", { className: `is-${item.level}`, children: [
      /* @__PURE__ */ jsxDEV(DiagnosticIcon, { "aria-hidden": "true" }, void 0, false, {
        fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
        lineNumber: 1732,
        columnNumber: 93
      }, this),
      /* @__PURE__ */ jsxDEV("span", { children: [
        /* @__PURE__ */ jsxDEV("strong", { children: item.message }, void 0, false, {
          fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
          lineNumber: 1732,
          columnNumber: 136
        }, this),
        /* @__PURE__ */ jsxDEV("small", { children: item.path }, void 0, false, {
          fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
          lineNumber: 1732,
          columnNumber: 167
        }, this)
      ] }, void 0, true, {
        fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
        lineNumber: 1732,
        columnNumber: 130
      }, this)
    ] }, `${item.code}-${item.path}-${index}`, true, {
      fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
      lineNumber: 1732,
      columnNumber: 14
    }, this);
  }) }, void 0, false, {
    fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
    lineNumber: 1730,
    columnNumber: 10
  }, this);
}
_c11 = Diagnostics;
function Inspector({ store, snapshot, timelineOpen, runtimeMetrics }) {
  _s3();
  const inspectorRef = useRef(null);
  const dragRef = useRef(null);
  const lastHeaderClickRef = useRef(null);
  const [position, setPosition] = useState(null);
  const [dragging, setDragging] = useState(false);
  const section = getSection(snapshot.document, snapshot.selection);
  let content = /* @__PURE__ */ jsxDEV(SectionInspector, { store, snapshot, section }, void 0, false, {
    fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
    lineNumber: 1743,
    columnNumber: 17
  }, this);
  if (snapshot.selection.type === "sequence") content = /* @__PURE__ */ jsxDEV(SequenceInspector, { store, snapshot }, void 0, false, {
    fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
    lineNumber: 1744,
    columnNumber: 57
  }, this);
  if (snapshot.selection.type === "cue") content = /* @__PURE__ */ jsxDEV(CueInspector, { store, snapshot, section }, void 0, false, {
    fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
    lineNumber: 1745,
    columnNumber: 52
  }, this);
  if (snapshot.selection.type === "discipline-reveal") content = /* @__PURE__ */ jsxDEV(DisciplineRevealInspector, { store, snapshot, section }, void 0, false, {
    fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
    lineNumber: 1746,
    columnNumber: 66
  }, this);
  if (snapshot.selection.type === "camera-key") content = /* @__PURE__ */ jsxDEV(CameraInspector, { store, snapshot, section }, void 0, false, {
    fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
    lineNumber: 1747,
    columnNumber: 59
  }, this);
  if (snapshot.selection.type === "world") content = /* @__PURE__ */ jsxDEV(WorldInspector, { store, snapshot, section, runtimeMetrics }, void 0, false, {
    fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
    lineNumber: 1748,
    columnNumber: 54
  }, this);
  if (snapshot.selection.type === "interaction") content = /* @__PURE__ */ jsxDEV(SectionInspector, { store, snapshot, section }, void 0, false, {
    fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
    lineNumber: 1749,
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
          lineNumber: 1849,
          columnNumber: 63
        }, this)
      ] }, void 0, true, {
        fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
        lineNumber: 1849,
        columnNumber: 7
      }, this)
    },
    void 0,
    false,
    {
      fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
      lineNumber: 1832,
      columnNumber: 5
    },
    this
  );
}
_s3(Inspector, "+h4TZ3OOjdefApVkJJ1n/C7j/fg=");
_c12 = Inspector;
function CameraPathOverlay({ snapshot }) {
  const sections = snapshot.compiledPlan?.sections || [];
  const total = snapshot.compiledPlan?.maxStoryWU || 1;
  return /* @__PURE__ */ jsxDEV("div", { className: "about-editor-path-overlay", "aria-label": "Camera path overlay", children: [
    /* @__PURE__ */ jsxDEV("div", { children: [
      /* @__PURE__ */ jsxDEV("strong", { children: "Path · constant cadence" }, void 0, false, {
        fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
        lineNumber: 1858,
        columnNumber: 12
      }, this),
      /* @__PURE__ */ jsxDEV("span", { children: [
        formatWU(snapshot.transport.storyWU),
        " / ",
        formatWU(total)
      ] }, void 0, true, {
        fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
        lineNumber: 1858,
        columnNumber: 52
      }, this)
    ] }, void 0, true, {
      fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
      lineNumber: 1858,
      columnNumber: 7
    }, this),
    /* @__PURE__ */ jsxDEV("svg", { viewBox: "0 0 240 112", role: "img", "aria-label": "Camera and World anchors over story distance", children: [
      /* @__PURE__ */ jsxDEV("path", { d: "M18 56 H222" }, void 0, false, {
        fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
        lineNumber: 1860,
        columnNumber: 9
      }, this),
      sections.map((section) => {
        const x = 18 + section.startWU / total * 204;
        return /* @__PURE__ */ jsxDEV("g", { transform: `translate(${x} 56)`, children: [
          /* @__PURE__ */ jsxDEV("line", { y1: "-12", y2: "12" }, void 0, false, {
            fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
            lineNumber: 1863,
            columnNumber: 71
          }, this),
          /* @__PURE__ */ jsxDEV("circle", { r: section.worldState?.changesWorld ? 4 : 2 }, void 0, false, {
            fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
            lineNumber: 1863,
            columnNumber: 96
          }, this),
          /* @__PURE__ */ jsxDEV("title", { children: [
            section.label,
            section.worldState?.changesWorld ? ` · ${section.worldState.activeWorld.shapeId}` : ""
          ] }, void 0, true, {
            fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
            lineNumber: 1863,
            columnNumber: 151
          }, this)
        ] }, section.id, true, {
          fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
          lineNumber: 1863,
          columnNumber: 18
        }, this);
      }),
      /* @__PURE__ */ jsxDEV("g", { className: "is-playhead", transform: `translate(${18 + snapshot.transport.storyWU / total * 204} 56)`, children: [
        /* @__PURE__ */ jsxDEV("path", { d: "M0 -22 L5 -15 H-5 Z" }, void 0, false, {
          fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
          lineNumber: 1865,
          columnNumber: 113
        }, this),
        /* @__PURE__ */ jsxDEV("line", { y1: "-15", y2: "22" }, void 0, false, {
          fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
          lineNumber: 1865,
          columnNumber: 145
        }, this)
      ] }, void 0, true, {
        fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
        lineNumber: 1865,
        columnNumber: 9
      }, this)
    ] }, void 0, true, {
      fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
      lineNumber: 1859,
      columnNumber: 7
    }, this),
    /* @__PURE__ */ jsxDEV("small", { children: "Dots are Section boundaries. Large dots are fixed World anchors. The marker is the published camera." }, void 0, false, {
      fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
      lineNumber: 1867,
      columnNumber: 7
    }, this)
  ] }, void 0, true, {
    fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
    lineNumber: 1857,
    columnNumber: 5
  }, this);
}
_c13 = CameraPathOverlay;
export default function AboutNarrativeEditor({ store, runtimeRef, rootRef }) {
  _s4();
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
                lineNumber: 2089,
                columnNumber: 119
              }, this),
              /* @__PURE__ */ jsxDEV("span", { children: "About Narrative" }, void 0, false, {
                fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
                lineNumber: 2089,
                columnNumber: 149
              }, this),
              /* @__PURE__ */ jsxDEV("small", { children: "Creative toolkit" }, void 0, false, {
                fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
                lineNumber: 2089,
                columnNumber: 177
              }, this)
            ] }, void 0, true, {
              fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
              lineNumber: 2089,
              columnNumber: 9
            }, this),
            /* @__PURE__ */ jsxDEV(Transport, { store, snapshot }, void 0, false, {
              fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
              lineNumber: 2090,
              columnNumber: 9
            }, this),
            /* @__PURE__ */ jsxDEV("div", { className: "about-editor-actions", children: [
              /* @__PURE__ */ jsxDEV("button", { type: "button", disabled: !snapshot.history.canUndo, title: snapshot.history.undoLabel || "Undo", "aria-label": "Undo", onClick: () => store.undo(), children: /* @__PURE__ */ jsxDEV("span", { "aria-hidden": "true", children: "↶" }, void 0, false, {
                fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
                lineNumber: 2092,
                columnNumber: 162
              }, this) }, void 0, false, {
                fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
                lineNumber: 2092,
                columnNumber: 11
              }, this),
              /* @__PURE__ */ jsxDEV("button", { type: "button", disabled: !snapshot.history.canRedo, title: snapshot.history.redoLabel || "Redo", "aria-label": "Redo", onClick: () => store.redo(), children: /* @__PURE__ */ jsxDEV("span", { "aria-hidden": "true", children: "↷" }, void 0, false, {
                fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
                lineNumber: 2093,
                columnNumber: 162
              }, this) }, void 0, false, {
                fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
                lineNumber: 2093,
                columnNumber: 11
              }, this),
              /* @__PURE__ */ jsxDEV("button", { type: "button", className: pathVisible ? "is-active" : "", onClick: () => setPathVisible(!pathVisible), children: "Path" }, void 0, false, {
                fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
                lineNumber: 2094,
                columnNumber: 11
              }, this),
              /* @__PURE__ */ jsxDEV("button", { type: "button", className: directorView ? "is-active" : "", onClick: toggleDirector, children: directorView ? "Director" : "Camera" }, void 0, false, {
                fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
                lineNumber: 2095,
                columnNumber: 11
              }, this),
              /* @__PURE__ */ jsxDEV("button", { type: "button", className: snapshot.tryState?.label === "Compare saved source" ? "is-active" : "", disabled: snapshot.tryState && snapshot.tryState.label !== "Compare saved source", onClick: toggleBefore, children: snapshot.tryState?.label === "Compare saved source" ? "Before" : "After" }, void 0, false, {
                fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
                lineNumber: 2096,
                columnNumber: 11
              }, this),
              /* @__PURE__ */ jsxDEV("details", { className: "about-editor-more", children: [
                /* @__PURE__ */ jsxDEV("summary", { children: "More" }, void 0, false, {
                  fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
                  lineNumber: 2098,
                  columnNumber: 13
                }, this),
                /* @__PURE__ */ jsxDEV("div", { children: [
                  /* @__PURE__ */ jsxDEV("button", { type: "button", onClick: addCheckpoint, children: "Checkpoint" }, void 0, false, {
                    fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
                    lineNumber: 2100,
                    columnNumber: 15
                  }, this),
                  /* @__PURE__ */ jsxDEV("button", { type: "button", onClick: () => exportAboutNarrativeDocument(snapshot.document), children: "Export JSON" }, void 0, false, {
                    fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
                    lineNumber: 2101,
                    columnNumber: 15
                  }, this),
                  /* @__PURE__ */ jsxDEV("button", { type: "button", onClick: () => importRef.current?.click(), children: "Import JSON" }, void 0, false, {
                    fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
                    lineNumber: 2102,
                    columnNumber: 15
                  }, this)
                ] }, void 0, true, {
                  fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
                  lineNumber: 2099,
                  columnNumber: 13
                }, this)
              ] }, void 0, true, {
                fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
                lineNumber: 2097,
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
                lineNumber: 2105,
                columnNumber: 11
              }, this),
              /* @__PURE__ */ jsxDEV("button", { type: "button", "data-about-editor-save": true, className: "is-save", disabled: snapshot.saveState.status === "saving", onClick: save, children: [
                /* @__PURE__ */ jsxDEV("span", { children: statusLabel }, void 0, false, {
                  fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
                  lineNumber: 2115,
                  columnNumber: 141
                }, this),
                /* @__PURE__ */ jsxDEV("kbd", { children: "⌘S" }, void 0, false, {
                  fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
                  lineNumber: 2115,
                  columnNumber: 167
                }, this)
              ] }, void 0, true, {
                fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
                lineNumber: 2115,
                columnNumber: 11
              }, this)
            ] }, void 0, true, {
              fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
              lineNumber: 2091,
              columnNumber: 9
            }, this)
          ] }, void 0, true, {
            fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
            lineNumber: 2088,
            columnNumber: 7
          }, this),
          snapshot.recoveryState.available ? /* @__PURE__ */ jsxDEV("div", { className: "about-editor-recovery", children: [
            /* @__PURE__ */ jsxDEV("span", { children: [
              "An unsaved draft from ",
              new Date(snapshot.recoveryState.draft.timestamp).toLocaleString(),
              " is available."
            ] }, void 0, true, {
              fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
              lineNumber: 2119,
              columnNumber: 82
            }, this),
            /* @__PURE__ */ jsxDEV("button", { type: "button", onClick: () => {
              store.replaceDocument("Recover draft", snapshot.recoveryState.draft.document);
              store.setRecoveryState({ available: false });
            }, children: "Recover as unsaved copy" }, void 0, false, {
              fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
              lineNumber: 2119,
              columnNumber: 198
            }, this),
            /* @__PURE__ */ jsxDEV("button", { type: "button", onClick: () => {
              exportAboutNarrativeDocument(snapshot.recoveryState.draft.document, "contents-about-recovered.json");
            }, children: "Export" }, void 0, false, {
              fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
              lineNumber: 2119,
              columnNumber: 394
            }, this),
            /* @__PURE__ */ jsxDEV("button", { type: "button", onClick: () => {
              clearAboutNarrativeRecoveryDraft();
              store.setRecoveryState({ available: false });
            }, children: "Discard" }, void 0, false, {
              fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
              lineNumber: 2119,
              columnNumber: 551
            }, this)
          ] }, void 0, true, {
            fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
            lineNumber: 2119,
            columnNumber: 43
          }, this) : null,
          snapshot.saveState.message ? /* @__PURE__ */ jsxDEV("div", { className: `about-editor-save-message is-${snapshot.saveState.status}`, children: [
            snapshot.saveState.message,
            /* @__PURE__ */ jsxDEV("button", { type: "button", "aria-label": "Dismiss message", onClick: () => store.setSaveState({ message: "" }), children: "×" }, void 0, false, {
              fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
              lineNumber: 2120,
              columnNumber: 142
            }, this)
          ] }, void 0, true, {
            fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
            lineNumber: 2120,
            columnNumber: 37
          }, this) : null,
          pathVisible ? /* @__PURE__ */ jsxDEV(CameraPathOverlay, { snapshot }, void 0, false, {
            fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
            lineNumber: 2122,
            columnNumber: 22
          }, this) : null,
          directorView ? /* @__PURE__ */ jsxDEV("div", { className: "about-editor-director-controls", children: [
            /* @__PURE__ */ jsxDEV("strong", { children: "Director View" }, void 0, false, {
              fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
              lineNumber: 2123,
              columnNumber: 71
            }, this),
            /* @__PURE__ */ jsxDEV("button", { type: "button", onClick: () => runtimeRef.current?.nudgeDirector?.({ yaw: -0.08 }), children: "←" }, void 0, false, {
              fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
              lineNumber: 2123,
              columnNumber: 101
            }, this),
            /* @__PURE__ */ jsxDEV("button", { type: "button", onClick: () => runtimeRef.current?.nudgeDirector?.({ pitch: 0.08 }), children: "↑" }, void 0, false, {
              fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
              lineNumber: 2123,
              columnNumber: 201
            }, this),
            /* @__PURE__ */ jsxDEV("button", { type: "button", onClick: () => runtimeRef.current?.nudgeDirector?.({ pitch: -0.08 }), children: "↓" }, void 0, false, {
              fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
              lineNumber: 2123,
              columnNumber: 302
            }, this),
            /* @__PURE__ */ jsxDEV("button", { type: "button", onClick: () => runtimeRef.current?.nudgeDirector?.({ yaw: 0.08 }), children: "→" }, void 0, false, {
              fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
              lineNumber: 2123,
              columnNumber: 404
            }, this),
            /* @__PURE__ */ jsxDEV("button", { type: "button", onClick: () => runtimeRef.current?.nudgeDirector?.({ distance: -0.2 }), children: "＋" }, void 0, false, {
              fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
              lineNumber: 2123,
              columnNumber: 503
            }, this),
            /* @__PURE__ */ jsxDEV("button", { type: "button", onClick: () => runtimeRef.current?.nudgeDirector?.({ distance: 0.2 }), children: "−" }, void 0, false, {
              fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
              lineNumber: 2123,
              columnNumber: 607
            }, this),
            /* @__PURE__ */ jsxDEV("button", { type: "button", onClick: () => runtimeRef.current?.resetDirector?.(), children: "Reset" }, void 0, false, {
              fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
              lineNumber: 2123,
              columnNumber: 710
            }, this),
            /* @__PURE__ */ jsxDEV("small", { children: "Temporary inspection only. Published Camera keys are unchanged." }, void 0, false, {
              fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
              lineNumber: 2123,
              columnNumber: 800
            }, this)
          ] }, void 0, true, {
            fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
            lineNumber: 2123,
            columnNumber: 23
          }, this) : null,
          /* @__PURE__ */ jsxDEV(Inspector, { store, snapshot, timelineOpen, runtimeMetrics }, void 0, false, {
            fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
            lineNumber: 2125,
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
                  lineNumber: 2133,
                  columnNumber: 25
                }, this) : /* @__PURE__ */ jsxDEV(ChevronUp, { "aria-hidden": "true" }, void 0, false, {
                  fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
                  lineNumber: 2133,
                  columnNumber: 62
                }, this),
                /* @__PURE__ */ jsxDEV("span", { children: timelineOpen ? "Hide timeline" : "Show timeline" }, void 0, false, {
                  fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
                  lineNumber: 2133,
                  columnNumber: 95
                }, this)
              ]
            },
            void 0,
            true,
            {
              fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
              lineNumber: 2126,
              columnNumber: 7
            },
            this
          ),
          /* @__PURE__ */ jsxDEV("div", { id: "about-editor-timeline-panel", className: "about-editor-bottom", "aria-hidden": !timelineOpen, children: [
            /* @__PURE__ */ jsxDEV("div", { className: "about-editor-contextbar", children: [
              /* @__PURE__ */ jsxDEV("span", { children: [
                /* @__PURE__ */ jsxDEV("strong", { children: selected?.label || "Sequence" }, void 0, false, {
                  fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
                  lineNumber: 2136,
                  columnNumber: 17
                }, this),
                " ",
                selected ? `${selected.type} · ${formatWU(Math.max(0, selectedExtent - 1))} scroll · ${formatWU(selectedExtent)} total${resolvedExtent > selectedExtent + 1e-3 ? ` · ${formatWU(resolvedExtent)} resolved` : ""}` : ""
              ] }, void 0, true, {
                fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
                lineNumber: 2136,
                columnNumber: 11
              }, this),
              selectedCueCount > 1 ? /* @__PURE__ */ jsxDEV("span", { className: "about-editor-selection-count", children: [
                selectedCueCount,
                " titles selected"
              ] }, void 0, true, {
                fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
                lineNumber: 2137,
                columnNumber: 35
              }, this) : null,
              /* @__PURE__ */ jsxDEV("span", { children: snapshot.autoKey ? "Auto-key armed" : "Auto-key off" }, void 0, false, {
                fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
                lineNumber: 2138,
                columnNumber: 11
              }, this),
              /* @__PURE__ */ jsxDEV("button", { type: "button", className: snapshot.autoKey ? "is-active" : "", onClick: () => store.setAutoKey(!snapshot.autoKey), children: "◆ Auto-key" }, void 0, false, {
                fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
                lineNumber: 2139,
                columnNumber: 11
              }, this),
              /* @__PURE__ */ jsxDEV("button", { type: "button", className: loopActive ? "is-active" : "", onClick: toggleLoop, children: "Loop Section" }, void 0, false, {
                fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
                lineNumber: 2140,
                columnNumber: 11
              }, this),
              /* @__PURE__ */ jsxDEV("button", { type: "button", onClick: fitSequence, children: "Fit sequence" }, void 0, false, {
                fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
                lineNumber: 2141,
                columnNumber: 11
              }, this),
              /* @__PURE__ */ jsxDEV("button", { type: "button", disabled: !compiledSelected, onClick: fitSection, children: "Fit Section" }, void 0, false, {
                fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
                lineNumber: 2142,
                columnNumber: 11
              }, this),
              ["camera", "world", "text"].map((track) => /* @__PURE__ */ jsxDEV("button", { type: "button", className: snapshot.transport.soloTrack === track ? "is-active" : "", onClick: () => toggleSolo(track), children: [
                "Solo ",
                track
              ] }, track, true, {
                fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
                lineNumber: 2143,
                columnNumber: 55
              }, this)),
              timelineDeletion ? /* @__PURE__ */ jsxDEV("button", { type: "button", className: "about-editor-delete-key", disabled: timelineDeletion.disabled, title: timelineDeletion.message || `${timelineDeletion.label} · Delete/Backspace`, onClick: () => deleteTimelineSelection(store, snapshot), children: [
                /* @__PURE__ */ jsxDEV(Trash2, { "aria-hidden": "true" }, void 0, false, {
                  fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
                  lineNumber: 2144,
                  columnNumber: 266
                }, this),
                timelineDeletion.label
              ] }, void 0, true, {
                fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
                lineNumber: 2144,
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
                lineNumber: 2145,
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
                  lineNumber: 2146,
                  columnNumber: 369
                }, this),
                checkpoints.map((item) => /* @__PURE__ */ jsxDEV("option", { value: item.id, children: item.name }, item.id, false, {
                  fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
                  lineNumber: 2146,
                  columnNumber: 456
                }, this))
              ] }, void 0, true, {
                fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
                lineNumber: 2146,
                columnNumber: 33
              }, this) : null
            ] }, void 0, true, {
              fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
              lineNumber: 2135,
              columnNumber: 9
            }, this),
            /* @__PURE__ */ jsxDEV(Timeline, { store, snapshot }, void 0, false, {
              fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
              lineNumber: 2148,
              columnNumber: 9
            }, this)
          ] }, void 0, true, {
            fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
            lineNumber: 2134,
            columnNumber: 7
          }, this),
          /* @__PURE__ */ jsxDEV("nav", { className: "about-editor-mobile-tabs", "aria-label": "Editor panel", children: [
            /* @__PURE__ */ jsxDEV("button", { type: "button", className: mobilePane === "sequence" ? "is-active" : "", onClick: () => setMobilePane("sequence"), children: "Sequence" }, void 0, false, {
              fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
              lineNumber: 2150,
              columnNumber: 75
            }, this),
            /* @__PURE__ */ jsxDEV("button", { type: "button", className: mobilePane === "inspect" ? "is-active" : "", onClick: () => setMobilePane("inspect"), children: "Inspect" }, void 0, false, {
              fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
              lineNumber: 2150,
              columnNumber: 213
            }, this),
            /* @__PURE__ */ jsxDEV("button", { type: "button", className: mobilePane === "preview" ? "is-active" : "", onClick: () => setMobilePane("preview"), children: "Preview" }, void 0, false, {
              fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
              lineNumber: 2150,
              columnNumber: 348
            }, this)
          ] }, void 0, true, {
            fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
            lineNumber: 2150,
            columnNumber: 7
          }, this)
        ]
      },
      void 0,
      true,
      {
        fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
        lineNumber: 2081,
        columnNumber: 5
      },
      this
    ),
    document.body
  );
}
_s4(AboutNarrativeEditor, "moa2etstN8Q/qz93C6D3MdwA6SA=");
_c14 = AboutNarrativeEditor;
var _c, _c2, _c3, _c4, _c5, _c6, _c7, _c8, _c9, _c0, _c1, _c10, _c11, _c12, _c13, _c14;
$RefreshReg$(_c, "Property");
$RefreshReg$(_c2, "NumberProperty");
$RefreshReg$(_c3, "Transport");
$RefreshReg$(_c4, "Timeline");
$RefreshReg$(_c5, "SequenceInspector");
$RefreshReg$(_c6, "SectionInspector");
$RefreshReg$(_c7, "EditorialBlocks");
$RefreshReg$(_c8, "CueRhythmAndReuse");
$RefreshReg$(_c9, "CueInspector");
$RefreshReg$(_c0, "DisciplineRevealInspector");
$RefreshReg$(_c1, "CameraInspector");
$RefreshReg$(_c10, "WorldInspector");
$RefreshReg$(_c11, "Diagnostics");
$RefreshReg$(_c12, "Inspector");
$RefreshReg$(_c13, "CameraPathOverlay");
$RefreshReg$(_c14, "AboutNarrativeEditor");
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

//# sourceMappingURL=data:application/json;base64,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Y0V4dGVybmFsU3RvcmUiLCJjcmVhdGVQb3J0YWwiLCJDaGVjayIsIkNoZXZyb25Eb3duIiwiQ2hldnJvbkxlZnQiLCJDaGV2cm9uUmlnaHQiLCJDaGV2cm9uVXAiLCJDaXJjbGVBbGVydCIsIkRpYW1vbmQiLCJJbmZvIiwiTG9ja0tleWhvbGUiLCJQYXVzZSIsIlBsYXkiLCJTa2lwQmFjayIsIlNraXBGb3J3YXJkIiwiVHJhc2gyIiwiQUJPVVRfTkFSUkFUSVZFX0dMT0JBTF9DT05UUk9MUyIsIkFCT1VUX05BUlJBVElWRV9DT1JSRVNQT05ERU5DRV9NT0RFUyIsIkFCT1VUX05BUlJBVElWRV9ESVNDSVBMSU5FX1JFVkVBTF9DT05UUk9MUyIsIkFCT1VUX05BUlJBVElWRV9FTVBIQVNJU19UT05FUyIsIkFCT1VUX05BUlJBVElWRV9NT0RJRklFUl9ERUZJTklUSU9OUyIsIkFCT1VUX05BUlJBVElWRV9TSEFQRV9ERUZJTklUSU9OUyIsImNsZWFyQWJvdXROYXJyYXRpdmVSZWNvdmVyeURyYWZ0IiwiZXhwb3J0QWJvdXROYXJyYXRpdmVEb2N1bWVudCIsImxvYWRBYm91dE5hcnJhdGl2ZVNvdXJjZSIsInJlYWRBYm91dE5hcnJhdGl2ZUNoZWNrcG9pbnRzIiwicmVhZEFib3V0TmFycmF0aXZlUmVjb3ZlcnlEcmFmdCIsInNhdmVBYm91dE5hcnJhdGl2ZVNvdXJjZSIsIndyaXRlQWJvdXROYXJyYXRpdmVDaGVja3BvaW50Iiwid3JpdGVBYm91dE5hcnJhdGl2ZVJlY292ZXJ5RHJhZnQiLCJhc3NlcnRWYWxpZEFib3V0TmFycmF0aXZlRG9jdW1lbnQiLCJjbG9uZUFib3V0TmFycmF0aXZlRG9jdW1lbnQiLCJnZXRBYm91dE5hcnJhdGl2ZUN1ZU1vdmVtZW50IiwiZ2V0QWJvdXROYXJyYXRpdmVDdWVNb3Rpb25JbnRlcnZhbCIsImdldEFib3V0TmFycmF0aXZlV29ybGRUcmFuc2l0aW9uTGltaXQiLCJzYW1wbGVBYm91dE5hcnJhdGl2ZVBsYW4iLCJjYXB0dXJlQWJvdXROYXJyYXRpdmVQbGF5aGVhZENvbnRleHQiLCJjcmVhdGVBYm91dE5hcnJhdGl2ZUN1ZUNsaXBib2FyZFBheWxvYWQiLCJkZXJpdmVBYm91dE5hcnJhdGl2ZUxvb3BSYW5nZSIsImR1cGxpY2F0ZUFib3V0TmFycmF0aXZlQ3VlR3JvdXAiLCJkdXBsaWNhdGVBYm91dE5hcnJhdGl2ZVNlY3Rpb24iLCJnZXRBYm91dE5hcnJhdGl2ZUNhbWVyYUtleVRpbWluZ0JvdW5kcyIsImdldEFib3V0TmFycmF0aXZlQ3VlVGltaW5nQm91bmRzIiwiZ2V0QWJvdXROYXJyYXRpdmVFeHRlbnRGaWVsZCIsImdldEFib3V0TmFycmF0aXZlU2VsZWN0aW9uTWVtYmVycyIsIm1vdmVBYm91dE5hcnJhdGl2ZUN1ZVRpbWluZyIsInJlbWFwQWJvdXROYXJyYXRpdmVQbGF5aGVhZENvbnRleHQiLCJyZXNvbHZlQWJvdXROYXJyYXRpdmVDYW1lcmFLZXlEcm9wIiwicmVzb2x2ZUFib3V0TmFycmF0aXZlQ3VlRGlzdHJpYnV0aW9uIiwicmVzb2x2ZUFib3V0TmFycmF0aXZlQ3VlRXhhY3RHYXAiLCJyZXNvbHZlQWJvdXROYXJyYXRpdmVDdWVHcm91cE1vdmUiLCJyZXNvbHZlQWJvdXROYXJyYXRpdmVDdWVHcm91cEFsaWduIiwicmVzb2x2ZUFib3V0TmFycmF0aXZlQ3VlR3JvdXBQYXN0ZSIsInNuYXBBYm91dE5hcnJhdGl2ZVRpbWVsaW5lVmFsdWUiLCJzdGl0Y2hBYm91dE5hcnJhdGl2ZUNhbWVyYUJvdW5kYXJpZXMiLCJ0b2dnbGVBYm91dE5hcnJhdGl2ZUN1ZVNlbGVjdGlvbiIsInZhbGlkYXRlQWJvdXROYXJyYXRpdmVDdWVDbGlwYm9hcmRQYXlsb2FkIiwiY2xhbXAwMSIsInZhbHVlIiwiTWF0aCIsIm1pbiIsIm1heCIsIkFCT1VUX0VESVRPUl9USU1FTElORV9TVE9SQUdFX0tFWSIsIlRJTUVMSU5FX0tFWV9FUFNJTE9OIiwiSU5TUEVDVE9SX0VER0VfR0FQIiwiQ0FNRVJBX1BPU0VfRklFTERTIiwiU2V0IiwiRElTQ0lQTElORV9SRVZFQUxfTUFYIiwiZmluZCIsImNvbnRyb2wiLCJpZCIsIkRJU0NJUExJTkVfQkFMTF9UT0tFTl9CWV9HUk9VUCIsIk9iamVjdCIsImZyZWV6ZSIsImNhbWVyYVBvc2VDaGFuZ2VzIiwiZnJvbSIsInRvIiwic29tZSIsImZpZWxkIiwiaW5kZXgiLCJhYnMiLCJmb3YiLCJyb2xsIiwiY29weUNhbWVyYVBvc2UiLCJ0YXJnZXQiLCJzb3VyY2UiLCJvZmZzZXQiLCJsb29rQXRPZmZzZXQiLCJsaW5rQ2FtZXJhQm91bmRhcnkiLCJkb2N1bWVudCIsInNlY3Rpb25JbmRleCIsImtleUluZGV4Iiwic2VjdGlvbiIsInNlY3Rpb25zIiwia2V5IiwiY2FtZXJhIiwia2V5cyIsImF0IiwibGVuZ3RoIiwiYnJpZGdlQ2FtZXJhU2VjdGlvbiIsInN0aXRjaENhbWVyYUJvdW5kYXJpZXMiLCJnZXRJbnNwZWN0b3JWZXJ0aWNhbEJvdW5kcyIsImluc3BlY3RvciIsInRpbWVsaW5lT3BlbiIsImVkaXRvciIsImNsb3Nlc3QiLCJzdHlsZXMiLCJnZXRDb21wdXRlZFN0eWxlIiwidG9wYmFySGVpZ2h0IiwiTnVtYmVyIiwicGFyc2VGbG9hdCIsImdldFByb3BlcnR5VmFsdWUiLCJ0aW1lbGluZUhlaWdodCIsImJ1dHRvbkJhclRvcCIsInF1ZXJ5U2VsZWN0b3IiLCJnZXRCb3VuZGluZ0NsaWVudFJlY3QiLCJ0b3AiLCJ3aW5kb3ciLCJpbm5lckhlaWdodCIsIm1pblRvcCIsIm1heEJvdHRvbSIsImNsYW1wSW5zcGVjdG9yUG9zaXRpb24iLCJwb3NpdGlvbiIsIm1heFdpZHRoIiwiaW5uZXJXaWR0aCIsIndpZHRoIiwiYXZhaWxhYmxlSGVpZ2h0IiwiaGVpZ2h0IiwibWF4TGVmdCIsIm1heFRvcCIsImxlZnQiLCJnZXRTZWN0aW9uSW5kZXgiLCJzZWN0aW9uSWQiLCJmaW5kSW5kZXgiLCJnZXRTZWN0aW9uIiwic2VsZWN0aW9uIiwiZ2V0TG9jYWxQcm9ncmVzcyIsInBsYW4iLCJzdG9yeVdVIiwiY29tcGlsZWQiLCJpdGVtIiwic3RhcnRXVSIsInRyYXZlbFdVIiwiZm9ybWF0V1UiLCJ0b0ZpeGVkIiwiZm9ybWF0Q2FtZXJhUGVyY2VudCIsImlzVGV4dEVkaXRpbmdUYXJnZXQiLCJIVE1MRWxlbWVudCIsIm1hdGNoZXMiLCJpc0NvbnRlbnRFZGl0YWJsZSIsImdldFRpbWVsaW5lS2V5ZnJhbWVzIiwic25hcHNob3QiLCJjb21waWxlZFBsYW4iLCJldmVudHMiLCJmb3JFYWNoIiwidG9TdG9yeVdVIiwicHVzaCIsInByaW9yaXR5IiwidHlwZSIsIndvcmxkIiwibW9kZSIsInRyYW5zaXRpb25JbiIsInBhcnQiLCJwYXJ0SW5kZXgiLCJrZXlQYXJ0IiwidGV4dCIsImN1ZXMiLCJjdWUiLCJjdWVJbmRleCIsImhvbGQiLCJjdWVJZCIsImRpc2NpcGxpbmVSZXZlYWwiLCJzdGFydCIsImludGVyYWN0aW9uIiwiaXNGaW5pdGUiLCJhY3RpdmF0aW9uU3RhcnQiLCJzb3J0IiwiYSIsImIiLCJnZXRUaW1lbGluZURlbGV0aW9uIiwicmVxdWlyZWQiLCJsYWJlbCIsImRpc2FibGVkIiwibWVzc2FnZSIsImV4ZWN1dGUiLCJzdG9yZSIsImNvbW1pdCIsImRyYWZ0Iiwic3BsaWNlIiwic3RhcnRzV2l0aCIsInRyYW5zaXRpb24iLCJlbmQiLCJkZWxldGVUaW1lbGluZVNlbGVjdGlvbiIsImRlbGV0aW9uIiwic2V0U2F2ZVN0YXRlIiwic2Vla1RpbWVsaW5lS2V5ZnJhbWUiLCJldmVudCIsInNldFNlbGVjdGlvbiIsInNldFRyYW5zcG9ydCIsIm93bmVyIiwicGxheWluZyIsImp1bXBUaW1lbGluZUtleWZyYW1lIiwiZGlyZWN0aW9uIiwiY3VycmVudFdVIiwidHJhbnNwb3J0IiwidGFyZ2V0UG9zaXRpb24iLCJyZXZlcnNlIiwibWFrZVNsdWciLCJ0b0xvd2VyQ2FzZSIsInJlcGxhY2UiLCJuZXh0SWQiLCJiYXNlIiwidXNlZCIsImZsYXRNYXAiLCJtYXAiLCJibG9ja3MiLCJibG9jayIsInN1ZmZpeCIsImhhcyIsInJlcGxhY2VEcmFmdERvY3VtZW50IiwibmV4dERvY3VtZW50IiwiYXNzaWduIiwiYXBwbHlDdWVNb3ZlcyIsIm1vdmVzIiwibW92ZSIsImVudGVyIiwiZXhpdCIsIlByb3BlcnR5IiwiY2hpbGRyZW4iLCJoaW50IiwiX2MiLCJOdW1iZXJQcm9wZXJ0eSIsInN0ZXAiLCJvbkNoYW5nZSIsInVuaXQiLCJfYzIiLCJUcmFuc3BvcnQiLCJtYXhXVSIsIm1heFN0b3J5V1UiLCJwbGF5Iiwic2VlayIsInNlbGVjdGVkIiwianVtcFNlY3Rpb24iLCJuZXh0IiwibGl2ZUFtYmllbnQiLCJwcmV2aWV3UHJvZmlsZSIsInNldFByZXZpZXdQcm9maWxlIiwiX2MzIiwiVGltZWxpbmUiLCJfcyIsInNlbGVjdGVkQ3VlTWVtYmVycyIsInJlZHVjZSIsInN1bSIsImV4dGVudFdVIiwicGxheWhlYWQiLCJsYW5lc1JlZiIsInRpbWluZ0RyYWdSZWYiLCJwcmV2aWV3RnJhbWVSZWYiLCJwZW5kaW5nUHJldmlld1JlZiIsInN1cHByZXNzZWRDbGlja1JlZiIsImNhbWVyYURyYWdQcmV2aWV3Iiwic2V0Q2FtZXJhRHJhZ1ByZXZpZXciLCJzZWN0aW9uUmVzaXplUHJldmlldyIsInNldFNlY3Rpb25SZXNpemVQcmV2aWV3IiwibWFycXVlZSIsInNldE1hcnF1ZWUiLCJxdWV1ZVByZXZpZXdGcmFtZSIsImNhbGxiYWNrIiwiY3VycmVudCIsInJlcXVlc3RBbmltYXRpb25GcmFtZSIsInBlbmRpbmciLCJmbHVzaFByZXZpZXdGcmFtZSIsImNhbmNlbEFuaW1hdGlvbkZyYW1lIiwiem9vbVRpbWVsaW5lIiwiY3RybEtleSIsIm1ldGFLZXkiLCJwcmV2ZW50RGVmYXVsdCIsImxhbmVzIiwicmVjdCIsInBvaW50ZXJYIiwiY2xpZW50WCIsInN0b3J5UmF0aW8iLCJzY3JvbGxMZWZ0Iiwic2Nyb2xsV2lkdGgiLCJjdXJyZW50Wm9vbSIsInpvb20iLCJuZXh0Wm9vbSIsImV4cCIsImRlbHRhWSIsInJlc29sdmVDYW1lcmFEcm9wQXRDbGllbnRYIiwiZ2V0U25hcHNob3QiLCJ2YWxpZCIsInJlYXNvbiIsImNvbnRlbnRYIiwiZHJhZyIsImRyb3AiLCJzb3VyY2VTZWN0aW9uSW5kZXgiLCJzb3VyY2VLZXlJbmRleCIsImJlZ2luVGltaW5nRHJhZyIsImxvY2tlZCIsImJ1dHRvbiIsImNsaXAiLCJjdXJyZW50VGFyZ2V0IiwicGFyZW50RWxlbWVudCIsInN0b3BQcm9wYWdhdGlvbiIsInNldFBvaW50ZXJDYXB0dXJlIiwicG9pbnRlcklkIiwibmV4dFNlbGVjdGlvbiIsImN1cnJlbnRTZWxlY3Rpb24iLCJjdXJyZW50TWVtYmVycyIsImFscmVhZHlTZWxlY3RlZCIsIm1lbWJlciIsInNoaWZ0S2V5IiwibWVtYmVycyIsImJlZ2luUHJldmlldyIsInN0YXJ0RG9jdW1lbnQiLCJzdGFydFBsYW4iLCJzdGFydFgiLCJtb3ZlZCIsImxhc3RBdCIsImxhc3REcm9wIiwibW92ZVRpbWluZ0RyYWciLCJ0b2tlbiIsImRlbHRhTGFuZSIsIm5leHRBdCIsImRlbHRhIiwicmV2ZWFsIiwiY29hbGVzY2VLZXkiLCJzZWN0aW9uU3RhcnRXVSIsImxvY2FsRGVsdGEiLCJtb3ZlbWVudCIsInByaW1hcnkiLCJkZWx0YVdVIiwibGFzdERlbHRhV1UiLCJ1cGRhdGVQcmV2aWV3IiwiZW5kVGltaW5nRHJhZyIsImhhc1BvaW50ZXJDYXB0dXJlIiwicmVsZWFzZVBvaW50ZXJDYXB0dXJlIiwiY2FuY2VsUHJldmlldyIsImNvbW1pdFByZXZpZXciLCJzb3VyY2VLZXlzIiwibW92ZWRLZXkiLCJkZXN0aW5hdGlvbktleXMiLCJzZXRUaW1lb3V0IiwiaGFuZGxlVGltaW5nQ2xpY2siLCJhY3Rpb24iLCJiZWdpblNlY3Rpb25SZXNpemUiLCJkYXRhIiwic2VjdGlvbkxhYmVsIiwic3RhcnRFeHRlbnQiLCJzdGFydE1heFdVIiwic3RhcnRTY3JvbGxXaWR0aCIsInBsYXloZWFkQ29udGV4dCIsInJlc2l6ZWRTZWN0aW9uSWQiLCJleHRlbnQiLCJtb3ZlU2VjdGlvblJlc2l6ZSIsInJhd0V4dGVudCIsImFsdEtleSIsInJvdW5kIiwibGFzdEV4dGVudCIsImVuZFNlY3Rpb25SZXNpemUiLCJyZXNldFNlY3Rpb25FeHRlbnQiLCJiYXNlbGluZVNlY3Rpb24iLCJiYXNlbGluZURvY3VtZW50IiwiY29udGV4dCIsImJlZ2luTWFycXVlZSIsImNhbnZhcyIsInN0YXJ0Q2xpZW50WCIsInN0YXJ0Q2xpZW50WSIsImNsaWVudFkiLCJjYW52YXNSZWN0IiwiYWRkaXRpdmUiLCJtb3ZlTWFycXVlZSIsImVuZE1hcnF1ZWUiLCJzZWxlY3Rpb25SZWN0IiwicmlnaHQiLCJib3R0b20iLCJsYW5lUmVjdCIsImhpdHMiLCJxdWVyeVNlbGVjdG9yQWxsIiwiZmlsdGVyIiwibm9kZSIsInZpc2libGUiLCJkYXRhc2V0Iiwic2xpY2UiLCJoaXQiLCJzb2xvVHJhY2siLCJsYW5lIiwibmV4dFN0YXJ0V1UiLCJzcGFuV1UiLCJpblNlbGVjdGVkU2VjdGlvbiIsImxvY2FsUGVyY2VudCIsImxvY2FsUG9zaXRpb24iLCJleHRlbmRlZExvY2FsUG9zaXRpb24iLCJleHRlbmRlZExvY2FsV2lkdGgiLCJ0ZXh0UG9zaXRpb24iLCJzZWxlY3RBdCIsImlzU2VsZWN0ZWQiLCJyZXNpemVFeHRlbnQiLCJyZXNvbHZlZEV4dGVudFdVIiwiU3RyaW5nIiwicGFkU3RhcnQiLCJmcm9tS2V5IiwidGltaW5nQm91bmRzIiwia2V5U2VsZWN0aW9uIiwidW5kZWZpbmVkIiwic2hhcGVJZCIsImlzUHJpbWFyeSIsImN1ZVNlbGVjdGlvbiIsImNvZGUiLCJkdXJhdGlvbiIsImNlbnRyZSIsInJldmVhbFNlbGVjdGlvbiIsImFjdGl2YXRpb24iLCJTZXF1ZW5jZUluc3BlY3RvciIsImNvbW1pdEdsb2JhbCIsImdyb3VwIiwiZ2xvYmFscyIsInRhcmdldEtleSIsImNvbnRyb2xzIiwiX2M1IiwiU2VjdGlvbkluc3BlY3RvciIsImNvbXBpbGVkU2VjdGlvbiIsImFjdGl2ZUV4dGVudEZpZWxkIiwiYWN0aXZlRXh0ZW50IiwicmVzb2x2ZWRFeHRlbnQiLCJjb250ZW50TWluaW11bUFjdGl2ZSIsInVwZGF0ZSIsIm11dGF0ZSIsInRvSW5kZXgiLCJkdXBsaWNhdGUiLCJyZXN1bHQiLCJtb2JpbGVFeHRlbnRXVSIsImxvY2FsIiwiZm9jdXMiLCJwcmVzZXQiLCJtb3Rpb24iLCJfYzYiLCJFZGl0b3JpYWxCbG9ja3MiLCJ1cGRhdGVCbG9jayIsImJsb2NrSW5kZXgiLCJ1cGRhdGVFbXBoYXNpcyIsImVtcGhhc2lzSW5kZXgiLCJlbXBoYXNpcyIsImFkZEVtcGhhc2lzIiwidHJpbSIsInNwbGl0Iiwiam9pbiIsInRvbmUiLCJyZW1vdmVFbXBoYXNpcyIsImtpbmQiLCJ3b3JsZEluZmx1ZW5jZSIsImNoZWNrZWQiLCJpdGVtcyIsIkJvb2xlYW4iLCJfYzciLCJDdWVSaHl0aG1BbmRSZXVzZSIsImNsaXBib2FyZCIsInNldENsaXBib2FyZCIsIl9zMiIsImdhcFdVIiwic2V0R2FwV1UiLCJhbmNob3IiLCJzZXRBbmNob3IiLCJwcmV2aWV3Iiwic2V0UHJldmlldyIsInNldE1lc3NhZ2UiLCJwcmV2aWV3TW92ZXMiLCJ0cnlTdGF0ZSIsImNhbmNlbFRyeSIsImJlZ2luVHJ5IiwiYXBwbHlQcmV2aWV3IiwiYXBwbHlUcnkiLCJjb21taXRDYW5kaWRhdGUiLCJkaXN0cmlidXRlIiwiZXhhY3RHYXAiLCJhbGlnblByaW1hcnkiLCJwbGF5aGVhZFdVIiwiY29weSIsInBheWxvYWQiLCJ2YWxpZGF0aW9uIiwicGFzdGUiLCJkZXN0aW5hdGlvblNlY3Rpb25JZCIsImdob3N0TW92ZXMiLCJDdWVJbnNwZWN0b3IiLCJzZWxlY3RlZE1lbWJlcnMiLCJyZW1vdmUiLCJtb3Rpb25JbnRlcnZhbCIsInRleHRNb3Rpb24iLCJtb3ZlQ3VlIiwicGVyY2VudCIsInVwZGF0ZU1vdmVtZW50IiwibWVtYmVyU2VjdGlvbiIsIm1lbWJlckN1ZSIsIl9jOSIsIkRpc2NpcGxpbmVSZXZlYWxJbnNwZWN0b3IiLCJvY2N1cGllZCIsInN0YWdnZXIiLCJsYWJlbER1cmF0aW9uIiwibGltaXRzRm9yIiwibGltaXRzIiwiaXRlbUluZGV4IiwiYmFja2dyb3VuZCIsIl9jMCIsIkNhbWVyYUluc3BlY3RvciIsInNlbGVjdGVkS2V5IiwidGFyZ2V0QXQiLCJhcHBseVByZXNldCIsInJlY2lwZXMiLCJQdXNoIiwiZWFzaW5nIiwiR2xpZGUiLCJPcmJpdCIsIlJldmVhbCIsIlJlc29sdmUiLCJleGlzdGluZ0tleUF0UGxheWhlYWQiLCJzZXRLZXkiLCJpbnNlcnRpb25JbmRleCIsInNlbGVjdGVkS2V5SW5kZXgiLCJzYW1wbGVkIiwiYmFzZVoiLCJzdGFydFoiLCJjYWRlbmNlIiwibmV3S2V5IiwiYXhpcyIsIm5hbWUiLCJBcnJheSIsImlzQXJyYXkiLCJ1cGRhdGVWZWN0b3IiLCJleHRlbnRGaWVsZCIsImV4dGVudExhYmVsIiwidXBkYXRlRXh0ZW50IiwiX2MxIiwiQ09SUkVTUE9OREVOQ0VfTEFCRUxTIiwiV29ybGRJbnNwZWN0b3IiLCJydW50aW1lTWV0cmljcyIsInNoYXBlIiwidHJhbnNpdGlvbkxpbWl0IiwidHJhbnNpdGlvbk1heCIsInRyYW5zaXRpb25FbmFibGVkIiwiY29ycmVzcG9uZGVuY2VFbmFibGVkIiwiaW5jbHVkZXMiLCJwcmV2aW91c1dvcmxkU2VjdGlvbiIsInNvdXJjZVNoYXBlIiwicHJlcGFyZWQiLCJwcmVwYXJlZFdvcmxkSWRzIiwiY29ycmVzcG9uZGVuY2VTdGF0dXMiLCJjb3JyZXNwb25kZW5jZVNlcXVlbmNlU3RhdGUiLCJjb3JyZXNwb25kZW5jZUZhbGxiYWNrIiwiY29ycmVzcG9uZGVuY2VUb1dvcmxkSWQiLCJ0cnlTaGFwZSIsInNoYXBlUGFyYW1ldGVycyIsImZyb21FbnRyaWVzIiwicGFyYW1ldGVycyIsInZhbHVlcyIsImNvc3QiLCJzZWVkIiwiZmxvb3IiLCJyYW5kb20iLCJlbnRyeURpc3RhbmNlV1UiLCJ0cmFuc2Zvcm0iLCJzY2FsZSIsImNvcnJlc3BvbmRlbmNlIiwiY29ycmVzcG9uZGVuY2VJbXByb3ZlbWVudCIsIm1vZGlmaWVycyIsIm1vZGlmaWVySW5kZXgiLCJkZWZpbml0aW9uIiwibW92ZU1vZGlmaWVyIiwibmV4dEluZGV4IiwiZW5hYmxlZCIsIm9wdGlvbnMiLCJvcHRpb24iLCJfYzEwIiwiRGlhZ25vc3RpY3MiLCJkaWFnbm9zdGljcyIsIkRpYWdub3N0aWNJY29uIiwibGV2ZWwiLCJwYXRoIiwiX2MxMSIsIkluc3BlY3RvciIsIl9zMyIsImluc3BlY3RvclJlZiIsImRyYWdSZWYiLCJsYXN0SGVhZGVyQ2xpY2tSZWYiLCJzZXRQb3NpdGlvbiIsImRyYWdnaW5nIiwic2V0RHJhZ2dpbmciLCJjb250ZW50Iiwia2VlcEluQm91bmRzIiwiYWRkRXZlbnRMaXN0ZW5lciIsInJlbW92ZUV2ZW50TGlzdGVuZXIiLCJiZWdpbkRyYWciLCJmbG9hdGluZ0hlaWdodCIsIm9yaWdpblgiLCJvcmlnaW5ZIiwibW92ZURyYWciLCJkZWx0YVgiLCJoeXBvdCIsImVuZERyYWciLCJub3ciLCJwZXJmb3JtYW5jZSIsInByZXZpb3VzIiwidGltZSIsIngiLCJ5IiwicmVzZXRQb3NpdGlvbiIsIkNhbWVyYVBhdGhPdmVybGF5IiwidG90YWwiLCJ3b3JsZFN0YXRlIiwiY2hhbmdlc1dvcmxkIiwiYWN0aXZlV29ybGQiLCJfYzEzIiwiQWJvdXROYXJyYXRpdmVFZGl0b3IiLCJydW50aW1lUmVmIiwicm9vdFJlZiIsIl9zNCIsInN1YnNjcmliZSIsImNoZWNrcG9pbnRzIiwic2V0Q2hlY2twb2ludHMiLCJzZXRSdW50aW1lTWV0cmljcyIsInBhdGhWaXNpYmxlIiwic2V0UGF0aFZpc2libGUiLCJkaXJlY3RvclZpZXciLCJzZXREaXJlY3RvclZpZXciLCJtb2JpbGVQYW5lIiwic2V0TW9iaWxlUGFuZSIsInNldFRpbWVsaW5lT3BlbiIsImxvY2FsU3RvcmFnZSIsImdldEl0ZW0iLCJpbXBvcnRSZWYiLCJzbmFwc2hvdFJlZiIsImFjdGl2ZVNlbGVjdGlvbiIsInNldEl0ZW0iLCJyb290IiwicnVudGltZSIsInNldEF0dHJpYnV0ZSIsInRoZW4iLCJoYXNoIiwiZGlydHkiLCJyZXBsYWNlRG9jdW1lbnQiLCJzZXRCYXNlbGluZSIsInJlY292ZXJ5IiwidGltZXN0YW1wIiwiRGF0ZSIsInNldFJlY292ZXJ5U3RhdGUiLCJhdmFpbGFibGUiLCJlcnJvciIsImNhdGNoIiwic3RhdHVzIiwicmVtb3ZlQXR0cmlidXRlIiwiY2xhc3NMaXN0IiwiQ1NTIiwiZXNjYXBlIiwiYWRkIiwiZWRpdG9yU2VsZWN0aW9uVHlwZSIsImludGVydmFsIiwic2V0SW50ZXJ2YWwiLCJnZXRNZXRyaWNzIiwiY2xlYXJJbnRlcnZhbCIsInRpbWVyIiwiYmFzZWxpbmVIYXNoIiwiY2xlYXJUaW1lb3V0IiwicGFnZWhpZGUiLCJrZXlkb3duIiwiY2xpY2siLCJyZWRvIiwidW5kbyIsInByZXZpZXdTdGF0ZSIsInNhdmUiLCJlZGl0b3JVcmwiLCJVUkwiLCJsb2NhdGlvbiIsImhyZWYiLCJzZWFyY2hQYXJhbXMiLCJzZXQiLCJoaXN0b3J5IiwicmVwbGFjZVN0YXRlIiwic3RhdGUiLCJwYXRobmFtZSIsInNlYXJjaCIsInNlbnQiLCJtYXJrU2F2ZWQiLCJhZGRDaGVja3BvaW50IiwiY2hlY2twb2ludCIsImNyeXB0byIsInJhbmRvbVVVSUQiLCJ0b0xvY2FsZVRpbWVTdHJpbmciLCJob3VyIiwibWludXRlIiwiYmFzZVNvdXJjZUhhc2giLCJzdGF0dXNMYWJlbCIsInNhdmVTdGF0ZSIsImNvbXBpbGVkU2VsZWN0ZWQiLCJzZWxlY3RlZEV4dGVudCIsInNlbGVjdGVkQ3VlQ291bnQiLCJsb29wQWN0aXZlIiwibG9vcCIsInRpbWVsaW5lRGVsZXRpb24iLCJ0b2dnbGVMb29wIiwiZW5kV1UiLCJ0b2dnbGVTb2xvIiwidHJhY2siLCJmaXRTZXF1ZW5jZSIsImZpdFNlY3Rpb24iLCJzZWN0aW9uU3BhbiIsInN0YXJ0UmF0aW8iLCJjbGllbnRXaWR0aCIsInRvZ2dsZURpcmVjdG9yIiwidG9nZ2xlQmVmb3JlIiwiY2FuVW5kbyIsInVuZG9MYWJlbCIsImNhblJlZG8iLCJyZWRvTGFiZWwiLCJmaWxlIiwiZmlsZXMiLCJpbXBvcnRlZCIsIkpTT04iLCJwYXJzZSIsInJlY292ZXJ5U3RhdGUiLCJ0b0xvY2FsZVN0cmluZyIsIm51ZGdlRGlyZWN0b3IiLCJ5YXciLCJwaXRjaCIsImRpc3RhbmNlIiwicmVzZXREaXJlY3RvciIsIm9wZW4iLCJhdXRvS2V5Iiwic2V0QXV0b0tleSIsImZyYW1lVGltZU1zIiwiZHJhd0NhbGxzIiwicG9pbnRDb3VudCIsImFjdGl2ZU1vZGlmaWVycyIsImJ1ZmZlclJlYnVpbGRzIiwiZm91bmQiLCJib2R5IiwiX2M0IiwiX2M4IiwiX2MxMiIsIl9jMTQiXSwiaWdub3JlTGlzdCI6W10sInNvdXJjZXMiOlsiQWJvdXROYXJyYXRpdmVFZGl0b3IuanN4Il0sInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7IHVzZUVmZmVjdCwgdXNlUmVmLCB1c2VTdGF0ZSwgdXNlU3luY0V4dGVybmFsU3RvcmUgfSBmcm9tICdyZWFjdCc7XG5pbXBvcnQgeyBjcmVhdGVQb3J0YWwgfSBmcm9tICdyZWFjdC1kb20nO1xuaW1wb3J0IHtcbiAgQ2hlY2ssXG4gIENoZXZyb25Eb3duLFxuICBDaGV2cm9uTGVmdCxcbiAgQ2hldnJvblJpZ2h0LFxuICBDaGV2cm9uVXAsXG4gIENpcmNsZUFsZXJ0LFxuICBEaWFtb25kLFxuICBJbmZvLFxuICBMb2NrS2V5aG9sZSxcbiAgUGF1c2UsXG4gIFBsYXksXG4gIFNraXBCYWNrLFxuICBTa2lwRm9yd2FyZCxcbiAgVHJhc2gyLFxufSBmcm9tICdsdWNpZGUtcmVhY3QnO1xuaW1wb3J0IHtcbiAgQUJPVVRfTkFSUkFUSVZFX0dMT0JBTF9DT05UUk9MUyxcbiAgQUJPVVRfTkFSUkFUSVZFX0NPUlJFU1BPTkRFTkNFX01PREVTLFxuICBBQk9VVF9OQVJSQVRJVkVfRElTQ0lQTElORV9SRVZFQUxfQ09OVFJPTFMsXG4gIEFCT1VUX05BUlJBVElWRV9FTVBIQVNJU19UT05FUyxcbiAgQUJPVVRfTkFSUkFUSVZFX01PRElGSUVSX0RFRklOSVRJT05TLFxuICBBQk9VVF9OQVJSQVRJVkVfU0hBUEVfREVGSU5JVElPTlMsXG59IGZyb20gJy4vYWJvdXROYXJyYXRpdmVEZWZpbml0aW9ucy5qcyc7XG5pbXBvcnQge1xuICBjbGVhckFib3V0TmFycmF0aXZlUmVjb3ZlcnlEcmFmdCxcbiAgZXhwb3J0QWJvdXROYXJyYXRpdmVEb2N1bWVudCxcbiAgbG9hZEFib3V0TmFycmF0aXZlU291cmNlLFxuICByZWFkQWJvdXROYXJyYXRpdmVDaGVja3BvaW50cyxcbiAgcmVhZEFib3V0TmFycmF0aXZlUmVjb3ZlcnlEcmFmdCxcbiAgc2F2ZUFib3V0TmFycmF0aXZlU291cmNlLFxuICB3cml0ZUFib3V0TmFycmF0aXZlQ2hlY2twb2ludCxcbiAgd3JpdGVBYm91dE5hcnJhdGl2ZVJlY292ZXJ5RHJhZnQsXG59IGZyb20gJy4vYWJvdXROYXJyYXRpdmVQZXJzaXN0ZW5jZS5qcyc7XG5pbXBvcnQge1xuICBhc3NlcnRWYWxpZEFib3V0TmFycmF0aXZlRG9jdW1lbnQsXG4gIGNsb25lQWJvdXROYXJyYXRpdmVEb2N1bWVudCxcbn0gZnJvbSAnLi9hYm91dE5hcnJhdGl2ZVNjaGVtYS5qcyc7XG5pbXBvcnQge1xuICBnZXRBYm91dE5hcnJhdGl2ZUN1ZU1vdmVtZW50LFxuICBnZXRBYm91dE5hcnJhdGl2ZUN1ZU1vdGlvbkludGVydmFsLFxuICBnZXRBYm91dE5hcnJhdGl2ZVdvcmxkVHJhbnNpdGlvbkxpbWl0LFxuICBzYW1wbGVBYm91dE5hcnJhdGl2ZVBsYW4sXG59IGZyb20gJy4vYWJvdXROYXJyYXRpdmVDb21waWxlci5qcyc7XG5pbXBvcnQge1xuICBjYXB0dXJlQWJvdXROYXJyYXRpdmVQbGF5aGVhZENvbnRleHQsXG4gIGNyZWF0ZUFib3V0TmFycmF0aXZlQ3VlQ2xpcGJvYXJkUGF5bG9hZCxcbiAgZGVyaXZlQWJvdXROYXJyYXRpdmVMb29wUmFuZ2UsXG4gIGR1cGxpY2F0ZUFib3V0TmFycmF0aXZlQ3VlR3JvdXAsXG4gIGR1cGxpY2F0ZUFib3V0TmFycmF0aXZlU2VjdGlvbixcbiAgZ2V0QWJvdXROYXJyYXRpdmVDYW1lcmFLZXlUaW1pbmdCb3VuZHMsXG4gIGdldEFib3V0TmFycmF0aXZlQ3VlVGltaW5nQm91bmRzLFxuICBnZXRBYm91dE5hcnJhdGl2ZUV4dGVudEZpZWxkLFxuICBnZXRBYm91dE5hcnJhdGl2ZVNlbGVjdGlvbk1lbWJlcnMsXG4gIG1vdmVBYm91dE5hcnJhdGl2ZUN1ZVRpbWluZyxcbiAgcmVtYXBBYm91dE5hcnJhdGl2ZVBsYXloZWFkQ29udGV4dCxcbiAgcmVzb2x2ZUFib3V0TmFycmF0aXZlQ2FtZXJhS2V5RHJvcCxcbiAgcmVzb2x2ZUFib3V0TmFycmF0aXZlQ3VlRGlzdHJpYnV0aW9uLFxuICByZXNvbHZlQWJvdXROYXJyYXRpdmVDdWVFeGFjdEdhcCxcbiAgcmVzb2x2ZUFib3V0TmFycmF0aXZlQ3VlR3JvdXBNb3ZlLFxuICByZXNvbHZlQWJvdXROYXJyYXRpdmVDdWVHcm91cEFsaWduLFxuICByZXNvbHZlQWJvdXROYXJyYXRpdmVDdWVHcm91cFBhc3RlLFxuICBzbmFwQWJvdXROYXJyYXRpdmVUaW1lbGluZVZhbHVlLFxuICBzdGl0Y2hBYm91dE5hcnJhdGl2ZUNhbWVyYUJvdW5kYXJpZXMsXG4gIHRvZ2dsZUFib3V0TmFycmF0aXZlQ3VlU2VsZWN0aW9uLFxuICB2YWxpZGF0ZUFib3V0TmFycmF0aXZlQ3VlQ2xpcGJvYXJkUGF5bG9hZCxcbn0gZnJvbSAnLi9hYm91dE5hcnJhdGl2ZVRpbWVsaW5lLmpzJztcbmltcG9ydCAnLi9hYm91dC1uYXJyYXRpdmUtZWRpdG9yLmNzcyc7XG5cbmNvbnN0IGNsYW1wMDEgPSAodmFsdWUpID0+IE1hdGgubWluKDEsIE1hdGgubWF4KDAsIHZhbHVlKSk7XG5jb25zdCBBQk9VVF9FRElUT1JfVElNRUxJTkVfU1RPUkFHRV9LRVkgPSAnYWJzOmFib3V0LW5hcnJhdGl2ZTp0aW1lbGluZS1vcGVuOnYxJztcbmNvbnN0IFRJTUVMSU5FX0tFWV9FUFNJTE9OID0gMC4wMDQ7XG5jb25zdCBJTlNQRUNUT1JfRURHRV9HQVAgPSA4O1xuY29uc3QgQ0FNRVJBX1BPU0VfRklFTERTID0gbmV3IFNldChbJ29mZnNldCcsICdsb29rQXRPZmZzZXQnLCAnZm92JywgJ3JvbGwnXSk7XG5jb25zdCBESVNDSVBMSU5FX1JFVkVBTF9NQVggPSBBQk9VVF9OQVJSQVRJVkVfRElTQ0lQTElORV9SRVZFQUxfQ09OVFJPTFNcbiAgLmZpbmQoKGNvbnRyb2wpID0+IGNvbnRyb2wuaWQgPT09ICdlbmQnKT8ubWF4IHx8IDQ7XG5jb25zdCBESVNDSVBMSU5FX0JBTExfVE9LRU5fQllfR1JPVVAgPSBPYmplY3QuZnJlZXplKHtcbiAgMTogJy0tYmFsbC0xJyxcbiAgMjogJy0tYmFsbC00JyxcbiAgMzogJy0tYmFsbC0zJyxcbiAgNDogJy0tYmFsbC03JyxcbiAgNTogJy0tYmFsbC04JyxcbiAgNjogJy0tYmFsbC02Jyxcbn0pO1xuXG5mdW5jdGlvbiBjYW1lcmFQb3NlQ2hhbmdlcyhmcm9tLCB0bykge1xuICBpZiAoIWZyb20gfHwgIXRvKSByZXR1cm4gZmFsc2U7XG4gIHJldHVybiBbJ29mZnNldCcsICdsb29rQXRPZmZzZXQnXS5zb21lKChmaWVsZCkgPT4gKFxuICAgIGZyb21bZmllbGRdLnNvbWUoKHZhbHVlLCBpbmRleCkgPT4gTWF0aC5hYnModmFsdWUgLSB0b1tmaWVsZF1baW5kZXhdKSA+IDAuMDAwMSlcbiAgKSkgfHwgTWF0aC5hYnMoZnJvbS5mb3YgLSB0by5mb3YpID4gMC4wMDAxIHx8IE1hdGguYWJzKGZyb20ucm9sbCAtIHRvLnJvbGwpID4gMC4wMDAxO1xufVxuXG5mdW5jdGlvbiBjb3B5Q2FtZXJhUG9zZSh0YXJnZXQsIHNvdXJjZSkge1xuICB0YXJnZXQub2Zmc2V0ID0gWy4uLnNvdXJjZS5vZmZzZXRdO1xuICB0YXJnZXQubG9va0F0T2Zmc2V0ID0gWy4uLnNvdXJjZS5sb29rQXRPZmZzZXRdO1xuICB0YXJnZXQuZm92ID0gc291cmNlLmZvdjtcbiAgdGFyZ2V0LnJvbGwgPSBzb3VyY2Uucm9sbDtcbn1cblxuZnVuY3Rpb24gbGlua0NhbWVyYUJvdW5kYXJ5KGRvY3VtZW50LCBzZWN0aW9uSW5kZXgsIGtleUluZGV4KSB7XG4gIGNvbnN0IHNlY3Rpb24gPSBkb2N1bWVudC5zZWN0aW9uc1tzZWN0aW9uSW5kZXhdO1xuICBjb25zdCBrZXkgPSBzZWN0aW9uPy5jYW1lcmEua2V5c1trZXlJbmRleF07XG4gIGlmICgha2V5KSByZXR1cm47XG4gIGlmIChrZXlJbmRleCA9PT0gMCAmJiBzZWN0aW9uSW5kZXggPiAwKSB7XG4gICAgY29weUNhbWVyYVBvc2UoZG9jdW1lbnQuc2VjdGlvbnNbc2VjdGlvbkluZGV4IC0gMV0uY2FtZXJhLmtleXMuYXQoLTEpLCBrZXkpO1xuICB9XG4gIGlmIChrZXlJbmRleCA9PT0gc2VjdGlvbi5jYW1lcmEua2V5cy5sZW5ndGggLSAxICYmIHNlY3Rpb25JbmRleCA8IGRvY3VtZW50LnNlY3Rpb25zLmxlbmd0aCAtIDEpIHtcbiAgICBjb3B5Q2FtZXJhUG9zZShkb2N1bWVudC5zZWN0aW9uc1tzZWN0aW9uSW5kZXggKyAxXS5jYW1lcmEua2V5c1swXSwga2V5KTtcbiAgfVxufVxuXG5mdW5jdGlvbiBicmlkZ2VDYW1lcmFTZWN0aW9uKGRvY3VtZW50LCBzZWN0aW9uSW5kZXgpIHtcbiAgY29uc3Qgc2VjdGlvbiA9IGRvY3VtZW50LnNlY3Rpb25zW3NlY3Rpb25JbmRleF07XG4gIGlmICghc2VjdGlvbj8uY2FtZXJhLmtleXMubGVuZ3RoKSByZXR1cm47XG4gIGlmIChzZWN0aW9uSW5kZXggPiAwKSBjb3B5Q2FtZXJhUG9zZShzZWN0aW9uLmNhbWVyYS5rZXlzWzBdLCBkb2N1bWVudC5zZWN0aW9uc1tzZWN0aW9uSW5kZXggLSAxXS5jYW1lcmEua2V5cy5hdCgtMSkpO1xuICBpZiAoc2VjdGlvbkluZGV4IDwgZG9jdW1lbnQuc2VjdGlvbnMubGVuZ3RoIC0gMSkgY29weUNhbWVyYVBvc2Uoc2VjdGlvbi5jYW1lcmEua2V5cy5hdCgtMSksIGRvY3VtZW50LnNlY3Rpb25zW3NlY3Rpb25JbmRleCArIDFdLmNhbWVyYS5rZXlzWzBdKTtcbn1cblxuZnVuY3Rpb24gc3RpdGNoQ2FtZXJhQm91bmRhcmllcyhkb2N1bWVudCkge1xuICBmb3IgKGxldCBzZWN0aW9uSW5kZXggPSAxOyBzZWN0aW9uSW5kZXggPCBkb2N1bWVudC5zZWN0aW9ucy5sZW5ndGg7IHNlY3Rpb25JbmRleCArPSAxKSB7XG4gICAgY29weUNhbWVyYVBvc2UoZG9jdW1lbnQuc2VjdGlvbnNbc2VjdGlvbkluZGV4XS5jYW1lcmEua2V5c1swXSwgZG9jdW1lbnQuc2VjdGlvbnNbc2VjdGlvbkluZGV4IC0gMV0uY2FtZXJhLmtleXMuYXQoLTEpKTtcbiAgfVxufVxuXG5mdW5jdGlvbiBnZXRJbnNwZWN0b3JWZXJ0aWNhbEJvdW5kcyhpbnNwZWN0b3IsIHRpbWVsaW5lT3Blbikge1xuICBjb25zdCBlZGl0b3IgPSBpbnNwZWN0b3IuY2xvc2VzdCgnLmFib3V0LWVkaXRvcicpO1xuICBjb25zdCBzdHlsZXMgPSBlZGl0b3IgPyBnZXRDb21wdXRlZFN0eWxlKGVkaXRvcikgOiBudWxsO1xuICBjb25zdCB0b3BiYXJIZWlnaHQgPSBOdW1iZXIucGFyc2VGbG9hdChzdHlsZXM/LmdldFByb3BlcnR5VmFsdWUoJy0tYWJvdXQtZWRpdG9yLXRvcGJhcicpKSB8fCA0NDtcbiAgY29uc3QgdGltZWxpbmVIZWlnaHQgPSB0aW1lbGluZU9wZW5cbiAgICA/IE51bWJlci5wYXJzZUZsb2F0KHN0eWxlcz8uZ2V0UHJvcGVydHlWYWx1ZSgnLS1hYm91dC1lZGl0b3ItdGltZWxpbmUnKSkgfHwgMTg4XG4gICAgOiAwO1xuICBjb25zdCBidXR0b25CYXJUb3AgPSBkb2N1bWVudC5xdWVyeVNlbGVjdG9yKCdbZGF0YS1idXR0b24tYmFyXScpPy5nZXRCb3VuZGluZ0NsaWVudFJlY3QoKS50b3BcbiAgICA/PyB3aW5kb3cuaW5uZXJIZWlnaHQ7XG4gIHJldHVybiB7XG4gICAgbWluVG9wOiB0b3BiYXJIZWlnaHQgKyBJTlNQRUNUT1JfRURHRV9HQVAsXG4gICAgbWF4Qm90dG9tOiAodGltZWxpbmVPcGVuID8gd2luZG93LmlubmVySGVpZ2h0IC0gdGltZWxpbmVIZWlnaHQgOiBidXR0b25CYXJUb3ApIC0gSU5TUEVDVE9SX0VER0VfR0FQLFxuICB9O1xufVxuXG5mdW5jdGlvbiBjbGFtcEluc3BlY3RvclBvc2l0aW9uKGluc3BlY3RvciwgcG9zaXRpb24sIHRpbWVsaW5lT3Blbikge1xuICBjb25zdCB7IG1pblRvcCwgbWF4Qm90dG9tIH0gPSBnZXRJbnNwZWN0b3JWZXJ0aWNhbEJvdW5kcyhpbnNwZWN0b3IsIHRpbWVsaW5lT3Blbik7XG4gIGNvbnN0IG1heFdpZHRoID0gTWF0aC5tYXgoMjQwLCB3aW5kb3cuaW5uZXJXaWR0aCAtIChJTlNQRUNUT1JfRURHRV9HQVAgKiAyKSk7XG4gIGNvbnN0IHdpZHRoID0gTWF0aC5taW4ocG9zaXRpb24ud2lkdGgsIG1heFdpZHRoKTtcbiAgY29uc3QgYXZhaWxhYmxlSGVpZ2h0ID0gTWF0aC5tYXgoMjQwLCBtYXhCb3R0b20gLSBtaW5Ub3ApO1xuICBjb25zdCBoZWlnaHQgPSBNYXRoLm1pbihwb3NpdGlvbi5oZWlnaHQsIGF2YWlsYWJsZUhlaWdodCk7XG4gIGNvbnN0IG1heExlZnQgPSBNYXRoLm1heChJTlNQRUNUT1JfRURHRV9HQVAsIHdpbmRvdy5pbm5lcldpZHRoIC0gd2lkdGggLSBJTlNQRUNUT1JfRURHRV9HQVApO1xuICBjb25zdCBtYXhUb3AgPSBNYXRoLm1heChtaW5Ub3AsIG1heEJvdHRvbSAtIGhlaWdodCk7XG4gIHJldHVybiB7XG4gICAgbGVmdDogTWF0aC5taW4obWF4TGVmdCwgTWF0aC5tYXgoSU5TUEVDVE9SX0VER0VfR0FQLCBwb3NpdGlvbi5sZWZ0KSksXG4gICAgdG9wOiBNYXRoLm1pbihtYXhUb3AsIE1hdGgubWF4KG1pblRvcCwgcG9zaXRpb24udG9wKSksXG4gICAgd2lkdGgsXG4gICAgaGVpZ2h0LFxuICB9O1xufVxuXG5mdW5jdGlvbiBnZXRTZWN0aW9uSW5kZXgoZG9jdW1lbnQsIHNlY3Rpb25JZCkge1xuICByZXR1cm4gZG9jdW1lbnQuc2VjdGlvbnMuZmluZEluZGV4KChzZWN0aW9uKSA9PiBzZWN0aW9uLmlkID09PSBzZWN0aW9uSWQpO1xufVxuXG5mdW5jdGlvbiBnZXRTZWN0aW9uKGRvY3VtZW50LCBzZWxlY3Rpb24pIHtcbiAgY29uc3Qgc2VjdGlvbklkID0gc2VsZWN0aW9uLnNlY3Rpb25JZCB8fCBkb2N1bWVudC5zZWN0aW9uc1swXT8uaWQ7XG4gIHJldHVybiBkb2N1bWVudC5zZWN0aW9ucy5maW5kKChzZWN0aW9uKSA9PiBzZWN0aW9uLmlkID09PSBzZWN0aW9uSWQpIHx8IGRvY3VtZW50LnNlY3Rpb25zWzBdO1xufVxuXG5mdW5jdGlvbiBnZXRMb2NhbFByb2dyZXNzKHBsYW4sIHNlY3Rpb24sIHN0b3J5V1UpIHtcbiAgY29uc3QgY29tcGlsZWQgPSBwbGFuPy5zZWN0aW9ucz8uZmluZCgoaXRlbSkgPT4gaXRlbS5pZCA9PT0gc2VjdGlvbi5pZCk7XG4gIHJldHVybiBjb21waWxlZCA/IGNsYW1wMDEoKHN0b3J5V1UgLSBjb21waWxlZC5zdGFydFdVKSAvIGNvbXBpbGVkLnRyYXZlbFdVKSA6IDA7XG59XG5cbmZ1bmN0aW9uIGZvcm1hdFdVKHZhbHVlKSB7XG4gIHJldHVybiBgJHtOdW1iZXIodmFsdWUgfHwgMCkudG9GaXhlZCgyKX0gV1VgO1xufVxuXG5mdW5jdGlvbiBmb3JtYXRDYW1lcmFQZXJjZW50KHZhbHVlKSB7XG4gIHJldHVybiBgJHtOdW1iZXIoKE51bWJlcih2YWx1ZSkgKiAxMDApLnRvRml4ZWQoMSkpfSVgO1xufVxuXG5mdW5jdGlvbiBpc1RleHRFZGl0aW5nVGFyZ2V0KHRhcmdldCkge1xuICByZXR1cm4gdGFyZ2V0IGluc3RhbmNlb2YgSFRNTEVsZW1lbnRcbiAgICAmJiAodGFyZ2V0Lm1hdGNoZXMoJ2lucHV0LCB0ZXh0YXJlYSwgc2VsZWN0JykgfHwgdGFyZ2V0LmlzQ29udGVudEVkaXRhYmxlKTtcbn1cblxuZnVuY3Rpb24gZ2V0VGltZWxpbmVLZXlmcmFtZXMoc25hcHNob3QpIHtcbiAgY29uc3QgcGxhbiA9IHNuYXBzaG90LmNvbXBpbGVkUGxhbjtcbiAgaWYgKCFwbGFuPy5zZWN0aW9ucz8ubGVuZ3RoKSByZXR1cm4gW107XG4gIGNvbnN0IGV2ZW50cyA9IFtdO1xuICBwbGFuLnNlY3Rpb25zLmZvckVhY2goKGNvbXBpbGVkLCBzZWN0aW9uSW5kZXgpID0+IHtcbiAgICBjb25zdCBzZWN0aW9uID0gc25hcHNob3QuZG9jdW1lbnQuc2VjdGlvbnNbc2VjdGlvbkluZGV4XTtcbiAgICBjb25zdCB0b1N0b3J5V1UgPSAoYXQpID0+IGNvbXBpbGVkLnN0YXJ0V1UgKyAoTnVtYmVyKGF0IHx8IDApICogY29tcGlsZWQudHJhdmVsV1UpO1xuICAgIHNlY3Rpb24uY2FtZXJhLmtleXMuZm9yRWFjaCgoa2V5LCBrZXlJbmRleCkgPT4ge1xuICAgICAgaWYgKGtleS5hdCA9PT0gMCB8fCBrZXkuYXQgPT09IDEpIHJldHVybjtcbiAgICAgIGV2ZW50cy5wdXNoKHtcbiAgICAgICAgc3RvcnlXVTogdG9TdG9yeVdVKGtleS5hdCksXG4gICAgICAgIHByaW9yaXR5OiAwLFxuICAgICAgICBzZWxlY3Rpb246IHsgdHlwZTogJ2NhbWVyYS1rZXknLCBzZWN0aW9uSWQ6IHNlY3Rpb24uaWQsIGtleUluZGV4IH0sXG4gICAgICB9KTtcbiAgICB9KTtcbiAgICBpZiAoc2VjdGlvbi53b3JsZC5tb2RlID09PSAnc2V0JyAmJiBzZWN0aW9uLndvcmxkLnRyYW5zaXRpb25Jbi50eXBlICE9PSAnY3V0Jykge1xuICAgICAgWydzdGFydCcsICdlbmQnXS5mb3JFYWNoKChwYXJ0LCBwYXJ0SW5kZXgpID0+IGV2ZW50cy5wdXNoKHtcbiAgICAgICAgc3RvcnlXVTogdG9TdG9yeVdVKHNlY3Rpb24ud29ybGQudHJhbnNpdGlvbkluW3BhcnRdKSxcbiAgICAgICAgcHJpb3JpdHk6IDEwICsgcGFydEluZGV4LFxuICAgICAgICBzZWxlY3Rpb246IHsgdHlwZTogJ3dvcmxkJywgc2VjdGlvbklkOiBzZWN0aW9uLmlkLCBrZXlQYXJ0OiBgdHJhbnNpdGlvbi0ke3BhcnR9YCB9LFxuICAgICAgfSkpO1xuICAgIH1cbiAgICAoc2VjdGlvbi50ZXh0LmN1ZXMgfHwgW10pLmZvckVhY2goKGN1ZSwgY3VlSW5kZXgpID0+IHtcbiAgICAgIGV2ZW50cy5wdXNoKHtcbiAgICAgICAgc3RvcnlXVTogdG9TdG9yeVdVKGN1ZS5ob2xkKSxcbiAgICAgICAgcHJpb3JpdHk6IDIwICsgY3VlSW5kZXgsXG4gICAgICAgIHNlbGVjdGlvbjogeyB0eXBlOiAnY3VlJywgc2VjdGlvbklkOiBzZWN0aW9uLmlkLCBjdWVJZDogY3VlLmlkLCBrZXlQYXJ0OiAnZm9jdXMnIH0sXG4gICAgICB9KTtcbiAgICB9KTtcbiAgICBpZiAoc2VjdGlvbi50ZXh0LmRpc2NpcGxpbmVSZXZlYWwpIHtcbiAgICAgIGV2ZW50cy5wdXNoKHtcbiAgICAgICAgc3RvcnlXVTogdG9TdG9yeVdVKHNlY3Rpb24udGV4dC5kaXNjaXBsaW5lUmV2ZWFsLnN0YXJ0KSxcbiAgICAgICAgcHJpb3JpdHk6IDI4LFxuICAgICAgICBzZWxlY3Rpb246IHsgdHlwZTogJ2Rpc2NpcGxpbmUtcmV2ZWFsJywgc2VjdGlvbklkOiBzZWN0aW9uLmlkIH0sXG4gICAgICB9KTtcbiAgICB9XG4gICAgaWYgKHNlY3Rpb24uaW50ZXJhY3Rpb24/LnR5cGUgIT09ICdub25lJyAmJiBOdW1iZXIuaXNGaW5pdGUoc2VjdGlvbi5pbnRlcmFjdGlvbi5hY3RpdmF0aW9uU3RhcnQpKSB7XG4gICAgICBldmVudHMucHVzaCh7XG4gICAgICAgIHN0b3J5V1U6IHRvU3RvcnlXVShzZWN0aW9uLmludGVyYWN0aW9uLmFjdGl2YXRpb25TdGFydCksXG4gICAgICAgIHByaW9yaXR5OiAzMCxcbiAgICAgICAgc2VsZWN0aW9uOiB7IHR5cGU6ICdpbnRlcmFjdGlvbicsIHNlY3Rpb25JZDogc2VjdGlvbi5pZCwga2V5UGFydDogJ2FjdGl2YXRpb24nIH0sXG4gICAgICB9KTtcbiAgICB9XG4gIH0pO1xuICByZXR1cm4gZXZlbnRzLnNvcnQoKGEsIGIpID0+IChhLnN0b3J5V1UgLSBiLnN0b3J5V1UpIHx8IChhLnByaW9yaXR5IC0gYi5wcmlvcml0eSkpO1xufVxuXG5mdW5jdGlvbiBnZXRUaW1lbGluZURlbGV0aW9uKHNuYXBzaG90KSB7XG4gIGNvbnN0IHsgc2VsZWN0aW9uLCBkb2N1bWVudCB9ID0gc25hcHNob3Q7XG4gIGNvbnN0IHNlY3Rpb25JbmRleCA9IGdldFNlY3Rpb25JbmRleChkb2N1bWVudCwgc2VsZWN0aW9uLnNlY3Rpb25JZCk7XG4gIGNvbnN0IHNlY3Rpb24gPSBkb2N1bWVudC5zZWN0aW9uc1tzZWN0aW9uSW5kZXhdO1xuICBpZiAoIXNlY3Rpb24pIHJldHVybiBudWxsO1xuICBpZiAoc2VsZWN0aW9uLnR5cGUgPT09ICdjYW1lcmEta2V5Jykge1xuICAgIGNvbnN0IGtleSA9IHNlY3Rpb24uY2FtZXJhLmtleXNbc2VsZWN0aW9uLmtleUluZGV4XTtcbiAgICBpZiAoIWtleSkgcmV0dXJuIG51bGw7XG4gICAgY29uc3QgcmVxdWlyZWQgPSBrZXkuYXQgPT09IDAgfHwga2V5LmF0ID09PSAxO1xuICAgIHJldHVybiB7XG4gICAgICBsYWJlbDogcmVxdWlyZWQgPyAnUmVxdWlyZWQgY2FtZXJhIGtleScgOiAnRGVsZXRlIGNhbWVyYSBrZXknLFxuICAgICAgZGlzYWJsZWQ6IHJlcXVpcmVkLFxuICAgICAgbWVzc2FnZTogcmVxdWlyZWQgPyAnVGhlIHN0YXJ0IGFuZCBlbmQgQ2FtZXJhIGtleXMgcHJlc2VydmUgU2VjdGlvbiBjb250aW51aXR5IGFuZCBjYW5ub3QgYmUgcmVtb3ZlZC4nIDogJycsXG4gICAgICBleGVjdXRlOiAoc3RvcmUpID0+IHN0b3JlLmNvbW1pdCgnRGVsZXRlIGNhbWVyYSBrZXknLCAoZHJhZnQpID0+IHtcbiAgICAgICAgZHJhZnQuc2VjdGlvbnNbc2VjdGlvbkluZGV4XS5jYW1lcmEua2V5cy5zcGxpY2Uoc2VsZWN0aW9uLmtleUluZGV4LCAxKTtcbiAgICAgIH0sIHsgc2VsZWN0aW9uOiB7IHR5cGU6ICdzZWN0aW9uJywgc2VjdGlvbklkOiBzZWN0aW9uLmlkIH0gfSksXG4gICAgfTtcbiAgfVxuICBpZiAoc2VsZWN0aW9uLnR5cGUgPT09ICd3b3JsZCcgJiYgc2VsZWN0aW9uLmtleVBhcnQ/LnN0YXJ0c1dpdGgoJ3RyYW5zaXRpb24tJykpIHtcbiAgICByZXR1cm4ge1xuICAgICAgbGFiZWw6ICdSZW1vdmUgdHJhbnNpdGlvbicsXG4gICAgICBkaXNhYmxlZDogZmFsc2UsXG4gICAgICBtZXNzYWdlOiAnJyxcbiAgICAgIGV4ZWN1dGU6IChzdG9yZSkgPT4gc3RvcmUuY29tbWl0KCdSZW1vdmUgV29ybGQgdHJhbnNpdGlvbicsIChkcmFmdCkgPT4ge1xuICAgICAgICBjb25zdCB0cmFuc2l0aW9uID0gZHJhZnQuc2VjdGlvbnNbc2VjdGlvbkluZGV4XS53b3JsZC50cmFuc2l0aW9uSW47XG4gICAgICAgIHRyYW5zaXRpb24uc3RhcnQgPSAwO1xuICAgICAgICB0cmFuc2l0aW9uLmVuZCA9IDA7XG4gICAgICAgIHRyYW5zaXRpb24udHlwZSA9ICdjdXQnO1xuICAgICAgfSwgeyBzZWxlY3Rpb246IHsgdHlwZTogJ3dvcmxkJywgc2VjdGlvbklkOiBzZWN0aW9uLmlkIH0gfSksXG4gICAgfTtcbiAgfVxuICBpZiAoc2VsZWN0aW9uLnR5cGUgPT09ICdpbnRlcmFjdGlvbicgJiYgc2VsZWN0aW9uLmtleVBhcnQgPT09ICdhY3RpdmF0aW9uJykge1xuICAgIHJldHVybiB7XG4gICAgICBsYWJlbDogJ1JlbW92ZSBpbnRlcmFjdGlvbiBrZXknLFxuICAgICAgZGlzYWJsZWQ6IGZhbHNlLFxuICAgICAgbWVzc2FnZTogJycsXG4gICAgICBleGVjdXRlOiAoc3RvcmUpID0+IHN0b3JlLmNvbW1pdCgnUmVtb3ZlIGludGVyYWN0aW9uIGtleScsIChkcmFmdCkgPT4ge1xuICAgICAgICBkcmFmdC5zZWN0aW9uc1tzZWN0aW9uSW5kZXhdLmludGVyYWN0aW9uID0geyB0eXBlOiAnbm9uZScgfTtcbiAgICAgIH0sIHsgc2VsZWN0aW9uOiB7IHR5cGU6ICdzZWN0aW9uJywgc2VjdGlvbklkOiBzZWN0aW9uLmlkIH0gfSksXG4gICAgfTtcbiAgfVxuICByZXR1cm4gbnVsbDtcbn1cblxuZnVuY3Rpb24gZGVsZXRlVGltZWxpbmVTZWxlY3Rpb24oc3RvcmUsIHNuYXBzaG90KSB7XG4gIGNvbnN0IGRlbGV0aW9uID0gZ2V0VGltZWxpbmVEZWxldGlvbihzbmFwc2hvdCk7XG4gIGlmICghZGVsZXRpb24pIHJldHVybiBmYWxzZTtcbiAgaWYgKGRlbGV0aW9uLmRpc2FibGVkKSB7XG4gICAgc3RvcmUuc2V0U2F2ZVN0YXRlKHsgbWVzc2FnZTogZGVsZXRpb24ubWVzc2FnZSB9KTtcbiAgICByZXR1cm4gdHJ1ZTtcbiAgfVxuICBkZWxldGlvbi5leGVjdXRlKHN0b3JlKTtcbiAgcmV0dXJuIHRydWU7XG59XG5cbmZ1bmN0aW9uIHNlZWtUaW1lbGluZUtleWZyYW1lKHN0b3JlLCBldmVudCkge1xuICBpZiAoIWV2ZW50KSByZXR1cm47XG4gIHN0b3JlLnNldFNlbGVjdGlvbihldmVudC5zZWxlY3Rpb24pO1xuICBzdG9yZS5zZXRUcmFuc3BvcnQoeyBvd25lcjogJ3RpbWVsaW5lJywgcGxheWluZzogZmFsc2UsIHN0b3J5V1U6IGV2ZW50LnN0b3J5V1UgfSk7XG59XG5cbmZ1bmN0aW9uIGp1bXBUaW1lbGluZUtleWZyYW1lKHN0b3JlLCBzbmFwc2hvdCwgZGlyZWN0aW9uKSB7XG4gIGNvbnN0IGV2ZW50cyA9IGdldFRpbWVsaW5lS2V5ZnJhbWVzKHNuYXBzaG90KTtcbiAgY29uc3QgY3VycmVudFdVID0gc25hcHNob3QudHJhbnNwb3J0LnN0b3J5V1U7XG4gIGNvbnN0IHRhcmdldFBvc2l0aW9uID0gZGlyZWN0aW9uID4gMFxuICAgID8gZXZlbnRzLmZpbmQoKGV2ZW50KSA9PiBldmVudC5zdG9yeVdVID4gY3VycmVudFdVICsgVElNRUxJTkVfS0VZX0VQU0lMT04pPy5zdG9yeVdVXG4gICAgOiBbLi4uZXZlbnRzXS5yZXZlcnNlKCkuZmluZCgoZXZlbnQpID0+IGV2ZW50LnN0b3J5V1UgPCBjdXJyZW50V1UgLSBUSU1FTElORV9LRVlfRVBTSUxPTik/LnN0b3J5V1U7XG4gIGNvbnN0IGV2ZW50ID0gTnVtYmVyLmlzRmluaXRlKHRhcmdldFBvc2l0aW9uKVxuICAgID8gZXZlbnRzLmZpbmQoKGl0ZW0pID0+IE1hdGguYWJzKGl0ZW0uc3RvcnlXVSAtIHRhcmdldFBvc2l0aW9uKSA8IFRJTUVMSU5FX0tFWV9FUFNJTE9OKVxuICAgIDogbnVsbDtcbiAgc2Vla1RpbWVsaW5lS2V5ZnJhbWUoc3RvcmUsIGV2ZW50KTtcbn1cblxuZnVuY3Rpb24gbWFrZVNsdWcodmFsdWUpIHtcbiAgcmV0dXJuIHZhbHVlLnRvTG93ZXJDYXNlKCkucmVwbGFjZSgvW15hLXowLTldKy9nLCAnLScpLnJlcGxhY2UoL14tfC0kL2csICcnKSB8fCAnaXRlbSc7XG59XG5cbmZ1bmN0aW9uIG5leHRJZChkb2N1bWVudCwgYmFzZSkge1xuICBjb25zdCB1c2VkID0gbmV3IFNldChkb2N1bWVudC5zZWN0aW9ucy5mbGF0TWFwKChzZWN0aW9uKSA9PiBbXG4gICAgc2VjdGlvbi5pZCxcbiAgICAuLi4oc2VjdGlvbi50ZXh0LmN1ZXMgfHwgW10pLm1hcCgoY3VlKSA9PiBjdWUuaWQpLFxuICAgIC4uLihzZWN0aW9uLnRleHQuYmxvY2tzIHx8IFtdKS5tYXAoKGJsb2NrKSA9PiBibG9jay5pZCksXG4gICAgLi4uKHNlY3Rpb24udGV4dC5kaXNjaXBsaW5lUmV2ZWFsID8gW3NlY3Rpb24udGV4dC5kaXNjaXBsaW5lUmV2ZWFsLmlkXSA6IFtdKSxcbiAgXSkpO1xuICBsZXQgaWQgPSBtYWtlU2x1ZyhiYXNlKTtcbiAgbGV0IHN1ZmZpeCA9IDI7XG4gIHdoaWxlICh1c2VkLmhhcyhpZCkpIHtcbiAgICBpZCA9IGAke21ha2VTbHVnKGJhc2UpfS0ke3N1ZmZpeH1gO1xuICAgIHN1ZmZpeCArPSAxO1xuICB9XG4gIHJldHVybiBpZDtcbn1cblxuZnVuY3Rpb24gcmVwbGFjZURyYWZ0RG9jdW1lbnQoZHJhZnQsIG5leHREb2N1bWVudCkge1xuICBPYmplY3Qua2V5cyhkcmFmdCkuZm9yRWFjaCgoa2V5KSA9PiBkZWxldGUgZHJhZnRba2V5XSk7XG4gIE9iamVjdC5hc3NpZ24oZHJhZnQsIGNsb25lQWJvdXROYXJyYXRpdmVEb2N1bWVudChuZXh0RG9jdW1lbnQpKTtcbn1cblxuZnVuY3Rpb24gYXBwbHlDdWVNb3ZlcyhkcmFmdCwgbW92ZXMpIHtcbiAgbW92ZXMuZm9yRWFjaCgobW92ZSkgPT4ge1xuICAgIGNvbnN0IHNlY3Rpb24gPSBkcmFmdC5zZWN0aW9ucy5maW5kKChpdGVtKSA9PiBpdGVtLmlkID09PSBtb3ZlLnNlY3Rpb25JZCk7XG4gICAgY29uc3QgY3VlID0gc2VjdGlvbj8udGV4dD8uY3Vlcz8uZmluZCgoaXRlbSkgPT4gaXRlbS5pZCA9PT0gbW92ZS5jdWVJZCk7XG4gICAgaWYgKGN1ZSkgT2JqZWN0LmFzc2lnbihjdWUsIHsgZW50ZXI6IG1vdmUuZW50ZXIsIGhvbGQ6IG1vdmUuaG9sZCwgZXhpdDogbW92ZS5leGl0IH0pO1xuICB9KTtcbn1cblxuZnVuY3Rpb24gUHJvcGVydHkoeyBsYWJlbCwgY2hpbGRyZW4sIGhpbnQgPSAnJyB9KSB7XG4gIHJldHVybiAoXG4gICAgPGxhYmVsIGNsYXNzTmFtZT1cImFib3V0LWVkaXRvci1wcm9wZXJ0eVwiPlxuICAgICAgPHNwYW4+e2xhYmVsfTwvc3Bhbj5cbiAgICAgIHtjaGlsZHJlbn1cbiAgICAgIHtoaW50ID8gPHNtYWxsPntoaW50fTwvc21hbGw+IDogbnVsbH1cbiAgICA8L2xhYmVsPlxuICApO1xufVxuXG5mdW5jdGlvbiBOdW1iZXJQcm9wZXJ0eSh7IGxhYmVsLCB2YWx1ZSwgbWluLCBtYXgsIHN0ZXAsIG9uQ2hhbmdlLCB1bml0ID0gJycsIGRpc2FibGVkID0gZmFsc2UgfSkge1xuICByZXR1cm4gKFxuICAgIDxQcm9wZXJ0eSBsYWJlbD17bGFiZWx9PlxuICAgICAgPGRpdiBjbGFzc05hbWU9XCJhYm91dC1lZGl0b3ItbnVtYmVyXCI+XG4gICAgICAgIDxpbnB1dFxuICAgICAgICAgIHR5cGU9XCJyYW5nZVwiXG4gICAgICAgICAgdmFsdWU9e3ZhbHVlfVxuICAgICAgICAgIG1pbj17bWlufVxuICAgICAgICAgIG1heD17bWF4fVxuICAgICAgICAgIHN0ZXA9e3N0ZXB9XG4gICAgICAgICAgZGlzYWJsZWQ9e2Rpc2FibGVkfVxuICAgICAgICAgIG9uQ2hhbmdlPXsoZXZlbnQpID0+IG9uQ2hhbmdlKE51bWJlcihldmVudC50YXJnZXQudmFsdWUpKX1cbiAgICAgICAgLz5cbiAgICAgICAgPGlucHV0XG4gICAgICAgICAgdHlwZT1cIm51bWJlclwiXG4gICAgICAgICAgdmFsdWU9e3ZhbHVlfVxuICAgICAgICAgIG1pbj17bWlufVxuICAgICAgICAgIG1heD17bWF4fVxuICAgICAgICAgIHN0ZXA9e3N0ZXB9XG4gICAgICAgICAgZGlzYWJsZWQ9e2Rpc2FibGVkfVxuICAgICAgICAgIG9uQ2hhbmdlPXsoZXZlbnQpID0+IG9uQ2hhbmdlKE51bWJlcihldmVudC50YXJnZXQudmFsdWUpKX1cbiAgICAgICAgLz5cbiAgICAgICAge3VuaXQgPyA8ZW0+e3VuaXR9PC9lbT4gOiBudWxsfVxuICAgICAgPC9kaXY+XG4gICAgPC9Qcm9wZXJ0eT5cbiAgKTtcbn1cblxuZnVuY3Rpb24gVHJhbnNwb3J0KHsgc3RvcmUsIHNuYXBzaG90IH0pIHtcbiAgY29uc3QgeyB0cmFuc3BvcnQsIGNvbXBpbGVkUGxhbiB9ID0gc25hcHNob3Q7XG4gIGNvbnN0IG1heFdVID0gY29tcGlsZWRQbGFuPy5tYXhTdG9yeVdVIHx8IDE7XG4gIGNvbnN0IHBsYXkgPSAoKSA9PiBzdG9yZS5zZXRUcmFuc3BvcnQoe1xuICAgIG93bmVyOiB0cmFuc3BvcnQucGxheWluZyA/ICd0aW1lbGluZScgOiAncGxheWJhY2snLFxuICAgIHBsYXlpbmc6ICF0cmFuc3BvcnQucGxheWluZyxcbiAgICBzdG9yeVdVOiB0cmFuc3BvcnQuc3RvcnlXVSxcbiAgfSk7XG4gIGNvbnN0IHNlZWsgPSAoc3RvcnlXVSkgPT4gc3RvcmUuc2V0VHJhbnNwb3J0KHsgb3duZXI6ICd0aW1lbGluZScsIHBsYXlpbmc6IGZhbHNlLCBzdG9yeVdVIH0pO1xuICBjb25zdCBzZWxlY3RlZCA9IGdldFNlY3Rpb24oc25hcHNob3QuZG9jdW1lbnQsIHNuYXBzaG90LnNlbGVjdGlvbik7XG4gIGNvbnN0IHNlY3Rpb25JbmRleCA9IGdldFNlY3Rpb25JbmRleChzbmFwc2hvdC5kb2N1bWVudCwgc2VsZWN0ZWQuaWQpO1xuICBjb25zdCBqdW1wU2VjdGlvbiA9IChkaXJlY3Rpb24pID0+IHtcbiAgICBjb25zdCBuZXh0ID0gc25hcHNob3QuY29tcGlsZWRQbGFuLnNlY3Rpb25zW01hdGgubWF4KDAsIE1hdGgubWluKHNuYXBzaG90LmNvbXBpbGVkUGxhbi5zZWN0aW9ucy5sZW5ndGggLSAxLCBzZWN0aW9uSW5kZXggKyBkaXJlY3Rpb24pKV07XG4gICAgaWYgKG5leHQpIHNlZWsobmV4dC5zdGFydFdVKTtcbiAgfTtcbiAgcmV0dXJuIChcbiAgICA8ZGl2IGNsYXNzTmFtZT1cImFib3V0LWVkaXRvci10cmFuc3BvcnRcIj5cbiAgICAgIDxidXR0b24gdHlwZT1cImJ1dHRvblwiIHRpdGxlPVwiUHJldmlvdXMgU2VjdGlvblwiIGFyaWEtbGFiZWw9XCJQcmV2aW91cyBTZWN0aW9uXCIgb25DbGljaz17KCkgPT4ganVtcFNlY3Rpb24oLTEpfT48U2tpcEJhY2sgYXJpYS1oaWRkZW49XCJ0cnVlXCIgLz48L2J1dHRvbj5cbiAgICAgIDxidXR0b24gdHlwZT1cImJ1dHRvblwiIHRpdGxlPVwiUHJldmlvdXMga2V5ZnJhbWUgwrcgTGVmdCBhcnJvd1wiIGFyaWEtbGFiZWw9XCJQcmV2aW91cyBrZXlmcmFtZVwiIG9uQ2xpY2s9eygpID0+IGp1bXBUaW1lbGluZUtleWZyYW1lKHN0b3JlLCBzbmFwc2hvdCwgLTEpfT48Q2hldnJvbkxlZnQgYXJpYS1oaWRkZW49XCJ0cnVlXCIgLz48L2J1dHRvbj5cbiAgICAgIDxidXR0b24gdHlwZT1cImJ1dHRvblwiIGNsYXNzTmFtZT1cImlzLXByaW1hcnlcIiB0aXRsZT17dHJhbnNwb3J0LnBsYXlpbmcgPyAnUGF1c2UnIDogJ1BsYXknfSBhcmlhLWxhYmVsPXt0cmFuc3BvcnQucGxheWluZyA/ICdQYXVzZScgOiAnUGxheSd9IG9uQ2xpY2s9e3BsYXl9PlxuICAgICAgICB7dHJhbnNwb3J0LnBsYXlpbmcgPyA8UGF1c2UgYXJpYS1oaWRkZW49XCJ0cnVlXCIgLz4gOiA8UGxheSBhcmlhLWhpZGRlbj1cInRydWVcIiAvPn1cbiAgICAgIDwvYnV0dG9uPlxuICAgICAgPGJ1dHRvbiB0eXBlPVwiYnV0dG9uXCIgdGl0bGU9XCJOZXh0IFNlY3Rpb25cIiBhcmlhLWxhYmVsPVwiTmV4dCBTZWN0aW9uXCIgb25DbGljaz17KCkgPT4ganVtcFNlY3Rpb24oMSl9PjxTa2lwRm9yd2FyZCBhcmlhLWhpZGRlbj1cInRydWVcIiAvPjwvYnV0dG9uPlxuICAgICAgPGJ1dHRvbiB0eXBlPVwiYnV0dG9uXCIgdGl0bGU9XCJOZXh0IGtleWZyYW1lIMK3IFJpZ2h0IGFycm93XCIgYXJpYS1sYWJlbD1cIk5leHQga2V5ZnJhbWVcIiBvbkNsaWNrPXsoKSA9PiBqdW1wVGltZWxpbmVLZXlmcmFtZShzdG9yZSwgc25hcHNob3QsIDEpfT48Q2hldnJvblJpZ2h0IGFyaWEtaGlkZGVuPVwidHJ1ZVwiIC8+PC9idXR0b24+XG4gICAgICA8b3V0cHV0Pntmb3JtYXRXVSh0cmFuc3BvcnQuc3RvcnlXVSl9PC9vdXRwdXQ+XG4gICAgICA8aW5wdXRcbiAgICAgICAgYXJpYS1sYWJlbD1cIkdsb2JhbCBuYXJyYXRpdmUgcGxheWhlYWRcIlxuICAgICAgICB0eXBlPVwicmFuZ2VcIlxuICAgICAgICBtaW49XCIwXCJcbiAgICAgICAgbWF4PXttYXhXVX1cbiAgICAgICAgc3RlcD1cIjAuMDAyXCJcbiAgICAgICAgdmFsdWU9e01hdGgubWluKG1heFdVLCB0cmFuc3BvcnQuc3RvcnlXVSl9XG4gICAgICAgIG9uQ2hhbmdlPXsoZXZlbnQpID0+IHNlZWsoTnVtYmVyKGV2ZW50LnRhcmdldC52YWx1ZSkpfVxuICAgICAgLz5cbiAgICAgIDxidXR0b25cbiAgICAgICAgdHlwZT1cImJ1dHRvblwiXG4gICAgICAgIGNsYXNzTmFtZT17dHJhbnNwb3J0Lm93bmVyID09PSAnc2Nyb2xsJyA/ICdpcy1hY3RpdmUnIDogJyd9XG4gICAgICAgIG9uQ2xpY2s9eygpID0+IHN0b3JlLnNldFRyYW5zcG9ydCh7IG93bmVyOiAnc2Nyb2xsJywgcGxheWluZzogZmFsc2UgfSl9XG4gICAgICA+Rm9sbG93IHNjcm9sbDwvYnV0dG9uPlxuICAgICAgPGJ1dHRvblxuICAgICAgICB0eXBlPVwiYnV0dG9uXCJcbiAgICAgICAgY2xhc3NOYW1lPXt0cmFuc3BvcnQubGl2ZUFtYmllbnQgPyAnaXMtYWN0aXZlJyA6ICcnfVxuICAgICAgICBvbkNsaWNrPXsoKSA9PiBzdG9yZS5zZXRUcmFuc3BvcnQoeyBsaXZlQW1iaWVudDogIXRyYW5zcG9ydC5saXZlQW1iaWVudCB9KX1cbiAgICAgID5MaXZlIGFtYmllbnQ8L2J1dHRvbj5cbiAgICAgIDxzZWxlY3RcbiAgICAgICAgYXJpYS1sYWJlbD1cIlByZXZpZXcgcHJvZmlsZVwiXG4gICAgICAgIHZhbHVlPXtzbmFwc2hvdC5wcmV2aWV3UHJvZmlsZX1cbiAgICAgICAgb25DaGFuZ2U9eyhldmVudCkgPT4gc3RvcmUuc2V0UHJldmlld1Byb2ZpbGUoZXZlbnQudGFyZ2V0LnZhbHVlKX1cbiAgICAgID5cbiAgICAgICAgPG9wdGlvbiB2YWx1ZT1cImRlc2t0b3BcIj5EZXNrdG9wPC9vcHRpb24+XG4gICAgICAgIDxvcHRpb24gdmFsdWU9XCJtb2JpbGVcIj5Nb2JpbGU8L29wdGlvbj5cbiAgICAgICAgPG9wdGlvbiB2YWx1ZT1cInJlZHVjZWQtbW90aW9uXCI+UmVkdWNlZCBtb3Rpb248L29wdGlvbj5cbiAgICAgIDwvc2VsZWN0PlxuICAgIDwvZGl2PlxuICApO1xufVxuXG5mdW5jdGlvbiBUaW1lbGluZSh7IHN0b3JlLCBzbmFwc2hvdCB9KSB7XG4gIGNvbnN0IHsgZG9jdW1lbnQsIGNvbXBpbGVkUGxhbiwgc2VsZWN0aW9uLCB0cmFuc3BvcnQgfSA9IHNuYXBzaG90O1xuICBjb25zdCBzZWxlY3RlZEN1ZU1lbWJlcnMgPSBnZXRBYm91dE5hcnJhdGl2ZVNlbGVjdGlvbk1lbWJlcnMoc2VsZWN0aW9uKTtcbiAgY29uc3QgbWF4V1UgPSBNYXRoLm1heCgwLjAwMSwgY29tcGlsZWRQbGFuPy5tYXhTdG9yeVdVIHx8IGRvY3VtZW50LnNlY3Rpb25zLnJlZHVjZSgoc3VtLCBzZWN0aW9uKSA9PiBzdW0gKyBzZWN0aW9uLmV4dGVudFdVLCAwKSk7XG4gIGNvbnN0IHBsYXloZWFkID0gYCR7KHRyYW5zcG9ydC5zdG9yeVdVIC8gbWF4V1UpICogMTAwfSVgO1xuICBjb25zdCBsYW5lc1JlZiA9IHVzZVJlZihudWxsKTtcbiAgY29uc3QgdGltaW5nRHJhZ1JlZiA9IHVzZVJlZihudWxsKTtcbiAgY29uc3QgcHJldmlld0ZyYW1lUmVmID0gdXNlUmVmKG51bGwpO1xuICBjb25zdCBwZW5kaW5nUHJldmlld1JlZiA9IHVzZVJlZihudWxsKTtcbiAgY29uc3Qgc3VwcHJlc3NlZENsaWNrUmVmID0gdXNlUmVmKG51bGwpO1xuICBjb25zdCBbY2FtZXJhRHJhZ1ByZXZpZXcsIHNldENhbWVyYURyYWdQcmV2aWV3XSA9IHVzZVN0YXRlKG51bGwpO1xuICBjb25zdCBbc2VjdGlvblJlc2l6ZVByZXZpZXcsIHNldFNlY3Rpb25SZXNpemVQcmV2aWV3XSA9IHVzZVN0YXRlKG51bGwpO1xuICBjb25zdCBbbWFycXVlZSwgc2V0TWFycXVlZV0gPSB1c2VTdGF0ZShudWxsKTtcblxuICBjb25zdCBxdWV1ZVByZXZpZXdGcmFtZSA9IChjYWxsYmFjaykgPT4ge1xuICAgIHBlbmRpbmdQcmV2aWV3UmVmLmN1cnJlbnQgPSBjYWxsYmFjaztcbiAgICBpZiAocHJldmlld0ZyYW1lUmVmLmN1cnJlbnQpIHJldHVybjtcbiAgICBwcmV2aWV3RnJhbWVSZWYuY3VycmVudCA9IHJlcXVlc3RBbmltYXRpb25GcmFtZSgoKSA9PiB7XG4gICAgICBwcmV2aWV3RnJhbWVSZWYuY3VycmVudCA9IG51bGw7XG4gICAgICBjb25zdCBwZW5kaW5nID0gcGVuZGluZ1ByZXZpZXdSZWYuY3VycmVudDtcbiAgICAgIHBlbmRpbmdQcmV2aWV3UmVmLmN1cnJlbnQgPSBudWxsO1xuICAgICAgcGVuZGluZz8uKCk7XG4gICAgfSk7XG4gIH07XG4gIGNvbnN0IGZsdXNoUHJldmlld0ZyYW1lID0gKCkgPT4ge1xuICAgIGlmIChwcmV2aWV3RnJhbWVSZWYuY3VycmVudCkgY2FuY2VsQW5pbWF0aW9uRnJhbWUocHJldmlld0ZyYW1lUmVmLmN1cnJlbnQpO1xuICAgIHByZXZpZXdGcmFtZVJlZi5jdXJyZW50ID0gbnVsbDtcbiAgICBjb25zdCBwZW5kaW5nID0gcGVuZGluZ1ByZXZpZXdSZWYuY3VycmVudDtcbiAgICBwZW5kaW5nUHJldmlld1JlZi5jdXJyZW50ID0gbnVsbDtcbiAgICBwZW5kaW5nPy4oKTtcbiAgfTtcblxuICBjb25zdCB6b29tVGltZWxpbmUgPSAoZXZlbnQpID0+IHtcbiAgICBpZiAoIWV2ZW50LmN0cmxLZXkgJiYgIWV2ZW50Lm1ldGFLZXkpIHJldHVybjtcbiAgICBldmVudC5wcmV2ZW50RGVmYXVsdCgpO1xuICAgIGNvbnN0IGxhbmVzID0gbGFuZXNSZWYuY3VycmVudDtcbiAgICBpZiAoIWxhbmVzKSByZXR1cm47XG4gICAgY29uc3QgcmVjdCA9IGxhbmVzLmdldEJvdW5kaW5nQ2xpZW50UmVjdCgpO1xuICAgIGNvbnN0IHBvaW50ZXJYID0gTWF0aC5taW4ocmVjdC53aWR0aCwgTWF0aC5tYXgoMCwgZXZlbnQuY2xpZW50WCAtIHJlY3QubGVmdCkpO1xuICAgIGNvbnN0IHN0b3J5UmF0aW8gPSAobGFuZXMuc2Nyb2xsTGVmdCArIHBvaW50ZXJYKSAvIE1hdGgubWF4KDEsIGxhbmVzLnNjcm9sbFdpZHRoKTtcbiAgICBjb25zdCBjdXJyZW50Wm9vbSA9IE1hdGgubWF4KDEsIE51bWJlcih0cmFuc3BvcnQuem9vbSkgfHwgMSk7XG4gICAgY29uc3QgbmV4dFpvb20gPSBNYXRoLm1pbig4LCBNYXRoLm1heCgxLCBjdXJyZW50Wm9vbSAqIE1hdGguZXhwKC1ldmVudC5kZWx0YVkgKiAwLjAwMjUpKSk7XG4gICAgc3RvcmUuc2V0VHJhbnNwb3J0KHsgem9vbTogTnVtYmVyKG5leHRab29tLnRvRml4ZWQoMykpIH0pO1xuICAgIHJlcXVlc3RBbmltYXRpb25GcmFtZSgoKSA9PiB7XG4gICAgICBsYW5lcy5zY3JvbGxMZWZ0ID0gKHN0b3J5UmF0aW8gKiBsYW5lcy5zY3JvbGxXaWR0aCkgLSBwb2ludGVyWDtcbiAgICB9KTtcbiAgfTtcblxuICB1c2VFZmZlY3QoKCkgPT4gKCkgPT4ge1xuICAgIGlmIChwcmV2aWV3RnJhbWVSZWYuY3VycmVudCkgY2FuY2VsQW5pbWF0aW9uRnJhbWUocHJldmlld0ZyYW1lUmVmLmN1cnJlbnQpO1xuICB9LCBbXSk7XG5cbiAgY29uc3QgcmVzb2x2ZUNhbWVyYURyb3BBdENsaWVudFggPSAoY2xpZW50WCkgPT4ge1xuICAgIGNvbnN0IGxhbmVzID0gbGFuZXNSZWYuY3VycmVudDtcbiAgICBjb25zdCBjdXJyZW50ID0gc3RvcmUuZ2V0U25hcHNob3QoKTtcbiAgICBpZiAoIWxhbmVzKSByZXR1cm4geyB2YWxpZDogZmFsc2UsIHJlYXNvbjogJ1RoZSBjYW1lcmEgdGltZWxpbmUgaXMgbm90IHJlYWR5LicgfTtcbiAgICBjb25zdCByZWN0ID0gbGFuZXMuZ2V0Qm91bmRpbmdDbGllbnRSZWN0KCk7XG4gICAgY29uc3QgY29udGVudFggPSBNYXRoLm1pbihcbiAgICAgIGxhbmVzLnNjcm9sbFdpZHRoLFxuICAgICAgTWF0aC5tYXgoMCwgY2xpZW50WCAtIHJlY3QubGVmdCArIGxhbmVzLnNjcm9sbExlZnQpLFxuICAgICk7XG4gICAgY29uc3Qgc3RvcnlXVSA9IChjb250ZW50WCAvIE1hdGgubWF4KDEsIGxhbmVzLnNjcm9sbFdpZHRoKSlcbiAgICAgICogTWF0aC5tYXgoMC4wMDEsIGN1cnJlbnQuY29tcGlsZWRQbGFuPy5tYXhTdG9yeVdVIHx8IG1heFdVKTtcbiAgICBjb25zdCBkcmFnID0gdGltaW5nRHJhZ1JlZi5jdXJyZW50O1xuICAgIGNvbnN0IGRyb3AgPSByZXNvbHZlQWJvdXROYXJyYXRpdmVDYW1lcmFLZXlEcm9wKHtcbiAgICAgIGRvY3VtZW50OiBjdXJyZW50LmRvY3VtZW50LFxuICAgICAgcGxhbjogY3VycmVudC5jb21waWxlZFBsYW4sXG4gICAgICBzb3VyY2VTZWN0aW9uSW5kZXg6IGRyYWc/LnNlY3Rpb25JbmRleCxcbiAgICAgIHNvdXJjZUtleUluZGV4OiBkcmFnPy5rZXlJbmRleCxcbiAgICAgIHN0b3J5V1UsXG4gICAgfSk7XG4gICAgcmV0dXJuIHsgLi4uZHJvcCwgY29udGVudFggfTtcbiAgfTtcblxuICBjb25zdCBiZWdpblRpbWluZ0RyYWcgPSAoZXZlbnQsIGRyYWcpID0+IHtcbiAgICBpZiAoZHJhZy5sb2NrZWQgfHwgZXZlbnQuYnV0dG9uICE9PSAwKSByZXR1cm47XG4gICAgY29uc3QgY2xpcCA9IGV2ZW50LmN1cnJlbnRUYXJnZXQucGFyZW50RWxlbWVudDtcbiAgICBjb25zdCByZWN0ID0gY2xpcD8uZ2V0Qm91bmRpbmdDbGllbnRSZWN0KCk7XG4gICAgaWYgKCFyZWN0Py53aWR0aCkgcmV0dXJuO1xuICAgIGV2ZW50LnByZXZlbnREZWZhdWx0KCk7XG4gICAgZXZlbnQuc3RvcFByb3BhZ2F0aW9uKCk7XG4gICAgZXZlbnQuY3VycmVudFRhcmdldC5zZXRQb2ludGVyQ2FwdHVyZT8uKGV2ZW50LnBvaW50ZXJJZCk7XG4gICAgbGV0IG5leHRTZWxlY3Rpb24gPSBkcmFnLnNlbGVjdGlvbjtcbiAgICBpZiAoZHJhZy50eXBlID09PSAnY3VlJykge1xuICAgICAgY29uc3QgY3VycmVudFNlbGVjdGlvbiA9IHN0b3JlLmdldFNuYXBzaG90KCkuc2VsZWN0aW9uO1xuICAgICAgY29uc3QgY3VycmVudE1lbWJlcnMgPSBnZXRBYm91dE5hcnJhdGl2ZVNlbGVjdGlvbk1lbWJlcnMoY3VycmVudFNlbGVjdGlvbik7XG4gICAgICBjb25zdCBhbHJlYWR5U2VsZWN0ZWQgPSBjdXJyZW50TWVtYmVycy5zb21lKChtZW1iZXIpID0+IChcbiAgICAgICAgbWVtYmVyLnNlY3Rpb25JZCA9PT0gZHJhZy5zZWxlY3Rpb24uc2VjdGlvbklkICYmIG1lbWJlci5jdWVJZCA9PT0gZHJhZy5zZWxlY3Rpb24uY3VlSWRcbiAgICAgICkpO1xuICAgICAgbmV4dFNlbGVjdGlvbiA9IGV2ZW50LnNoaWZ0S2V5XG4gICAgICAgID8gdG9nZ2xlQWJvdXROYXJyYXRpdmVDdWVTZWxlY3Rpb24oY3VycmVudFNlbGVjdGlvbiwgZHJhZy5zZWxlY3Rpb24pXG4gICAgICAgIDogYWxyZWFkeVNlbGVjdGVkICYmIGN1cnJlbnRNZW1iZXJzLmxlbmd0aCA+IDFcbiAgICAgICAgICA/IHsgLi4uZHJhZy5zZWxlY3Rpb24sIG1lbWJlcnM6IGN1cnJlbnRNZW1iZXJzIH1cbiAgICAgICAgICA6IGRyYWcuc2VsZWN0aW9uO1xuICAgICAgc3RvcmUuYmVnaW5QcmV2aWV3KCdNb3ZlIHRleHQgQ3VlcycpO1xuICAgIH1cbiAgICB0aW1pbmdEcmFnUmVmLmN1cnJlbnQgPSB7XG4gICAgICAuLi5kcmFnLFxuICAgICAgc2VsZWN0aW9uOiBuZXh0U2VsZWN0aW9uLFxuICAgICAgbWVtYmVyczogZHJhZy50eXBlID09PSAnY3VlJyA/IGdldEFib3V0TmFycmF0aXZlU2VsZWN0aW9uTWVtYmVycyhuZXh0U2VsZWN0aW9uKSA6IG51bGwsXG4gICAgICBzdGFydERvY3VtZW50OiBkcmFnLnR5cGUgPT09ICdjdWUnID8gY2xvbmVBYm91dE5hcnJhdGl2ZURvY3VtZW50KHN0b3JlLmdldFNuYXBzaG90KCkuZG9jdW1lbnQpIDogbnVsbCxcbiAgICAgIHN0YXJ0UGxhbjogZHJhZy50eXBlID09PSAnY3VlJyA/IHN0b3JlLmdldFNuYXBzaG90KCkuY29tcGlsZWRQbGFuIDogbnVsbCxcbiAgICAgIHBvaW50ZXJJZDogZXZlbnQucG9pbnRlcklkLFxuICAgICAgcmVjdCxcbiAgICAgIHN0YXJ0WDogZXZlbnQuY2xpZW50WCxcbiAgICAgIG1vdmVkOiBmYWxzZSxcbiAgICAgIGxhc3RBdDogZHJhZy5hdCxcbiAgICAgIGxhc3REcm9wOiBudWxsLFxuICAgIH07XG4gICAgc3RvcmUuc2V0U2VsZWN0aW9uKG5leHRTZWxlY3Rpb24pO1xuICAgIHN0b3JlLnNldFRyYW5zcG9ydCh7IG93bmVyOiAndGltZWxpbmUnLCBwbGF5aW5nOiBmYWxzZSwgc3RvcnlXVTogZHJhZy5zdG9yeVdVIH0pO1xuICB9O1xuXG4gIGNvbnN0IG1vdmVUaW1pbmdEcmFnID0gKGV2ZW50KSA9PiB7XG4gICAgY29uc3QgZHJhZyA9IHRpbWluZ0RyYWdSZWYuY3VycmVudDtcbiAgICBpZiAoIWRyYWcgfHwgZHJhZy5wb2ludGVySWQgIT09IGV2ZW50LnBvaW50ZXJJZCkgcmV0dXJuO1xuICAgIGlmICghZHJhZy5tb3ZlZCAmJiBNYXRoLmFicyhldmVudC5jbGllbnRYIC0gZHJhZy5zdGFydFgpIDwgMykgcmV0dXJuO1xuICAgIGRyYWcubW92ZWQgPSB0cnVlO1xuICAgIGlmIChkcmFnLnR5cGUgPT09ICdjYW1lcmEnKSB7XG4gICAgICBjb25zdCBkcm9wID0gcmVzb2x2ZUNhbWVyYURyb3BBdENsaWVudFgoZXZlbnQuY2xpZW50WCk7XG4gICAgICBkcmFnLmxhc3REcm9wID0gZHJvcDtcbiAgICAgIHNldENhbWVyYURyYWdQcmV2aWV3KHsgLi4uZHJvcCwgdG9rZW46IGRyYWcudG9rZW4gfSk7XG4gICAgICBpZiAoZHJvcC52YWxpZCkge1xuICAgICAgICBzdG9yZS5zZXRUcmFuc3BvcnQoeyBvd25lcjogJ3RpbWVsaW5lJywgcGxheWluZzogZmFsc2UsIHN0b3J5V1U6IGRyb3Auc3RvcnlXVSB9KTtcbiAgICAgIH1cbiAgICAgIHJldHVybjtcbiAgICB9XG4gICAgaWYgKGRyYWcudHlwZSA9PT0gJ2Rpc2NpcGxpbmUtcmV2ZWFsJykge1xuICAgICAgY29uc3QgZGVsdGFMYW5lID0gKGV2ZW50LmNsaWVudFggLSBkcmFnLnN0YXJ0WCkgLyBkcmFnLnJlY3Qud2lkdGg7XG4gICAgICBjb25zdCBuZXh0QXQgPSBNYXRoLm1pbihkcmFnLm1heCwgTWF0aC5tYXgoXG4gICAgICAgIGRyYWcubWluLFxuICAgICAgICBzbmFwQWJvdXROYXJyYXRpdmVUaW1lbGluZVZhbHVlKGRyYWcuYXQgKyBkZWx0YUxhbmUpLFxuICAgICAgKSk7XG4gICAgICBpZiAoTWF0aC5hYnMobmV4dEF0IC0gZHJhZy5sYXN0QXQpIDwgMC4wMDAwMDEpIHJldHVybjtcbiAgICAgIGNvbnN0IGRlbHRhID0gbmV4dEF0IC0gZHJhZy5sYXN0QXQ7XG4gICAgICBzdG9yZS5jb21taXQoJ01vdmUgRGlzY2lwbGluZSByZXZlYWwnLCAoZHJhZnQpID0+IHtcbiAgICAgICAgY29uc3QgcmV2ZWFsID0gZHJhZnQuc2VjdGlvbnNbZHJhZy5zZWN0aW9uSW5kZXhdLnRleHQuZGlzY2lwbGluZVJldmVhbDtcbiAgICAgICAgaWYgKCFyZXZlYWwpIHJldHVybjtcbiAgICAgICAgcmV2ZWFsLnN0YXJ0ICs9IGRlbHRhO1xuICAgICAgICByZXZlYWwuZW5kICs9IGRlbHRhO1xuICAgICAgfSwgeyBjb2FsZXNjZUtleTogZHJhZy5jb2FsZXNjZUtleSwgc2VsZWN0aW9uOiBkcmFnLnNlbGVjdGlvbiB9KTtcbiAgICAgIGRyYWcubGFzdEF0ID0gbmV4dEF0O1xuICAgICAgc3RvcmUuc2V0VHJhbnNwb3J0KHtcbiAgICAgICAgb3duZXI6ICd0aW1lbGluZScsXG4gICAgICAgIHBsYXlpbmc6IGZhbHNlLFxuICAgICAgICBzdG9yeVdVOiBkcmFnLnNlY3Rpb25TdGFydFdVICsgKG5leHRBdCAqIGRyYWcudHJhdmVsV1UpLFxuICAgICAgfSk7XG4gICAgICByZXR1cm47XG4gICAgfVxuICAgIGNvbnN0IGxvY2FsRGVsdGEgPSAoZXZlbnQuY2xpZW50WCAtIGRyYWcuc3RhcnRYKSAvIGRyYWcucmVjdC53aWR0aDtcbiAgICBjb25zdCBtb3ZlbWVudCA9IHJlc29sdmVBYm91dE5hcnJhdGl2ZUN1ZUdyb3VwTW92ZSh7XG4gICAgICBkb2N1bWVudDogZHJhZy5zdGFydERvY3VtZW50LFxuICAgICAgcGxhbjogZHJhZy5zdGFydFBsYW4sXG4gICAgICBtZW1iZXJzOiBkcmFnLm1lbWJlcnMsXG4gICAgICBwcmltYXJ5OiBkcmFnLnNlbGVjdGlvbixcbiAgICAgIGxvY2FsRGVsdGEsXG4gICAgfSk7XG4gICAgaWYgKCFtb3ZlbWVudC52YWxpZCB8fCBNYXRoLmFicyhtb3ZlbWVudC5kZWx0YVdVIC0gKGRyYWcubGFzdERlbHRhV1UgfHwgMCkpIDwgMC4wMDAwMDEpIHJldHVybjtcbiAgICBkcmFnLmxhc3REZWx0YVdVID0gbW92ZW1lbnQuZGVsdGFXVTtcbiAgICBxdWV1ZVByZXZpZXdGcmFtZSgoKSA9PiB7XG4gICAgICBzdG9yZS51cGRhdGVQcmV2aWV3KChkcmFmdCkgPT4ge1xuICAgICAgICBtb3ZlbWVudC5tb3Zlcy5mb3JFYWNoKChtb3ZlKSA9PiB7XG4gICAgICAgICAgY29uc3QgY3VlID0gZHJhZnQuc2VjdGlvbnNbbW92ZS5zZWN0aW9uSW5kZXhdPy50ZXh0Py5jdWVzPy5maW5kKChpdGVtKSA9PiBpdGVtLmlkID09PSBtb3ZlLmN1ZUlkKTtcbiAgICAgICAgICBpZiAoY3VlKSBPYmplY3QuYXNzaWduKGN1ZSwgeyBlbnRlcjogbW92ZS5lbnRlciwgaG9sZDogbW92ZS5ob2xkLCBleGl0OiBtb3ZlLmV4aXQgfSk7XG4gICAgICAgIH0pO1xuICAgICAgfSwge1xuICAgICAgICBvd25lcjogJ3RpbWVsaW5lJyxcbiAgICAgICAgcGxheWluZzogZmFsc2UsXG4gICAgICAgIHN0b3J5V1U6IGRyYWcuc3RvcnlXVSArIG1vdmVtZW50LmRlbHRhV1UsXG4gICAgICB9KTtcbiAgICB9KTtcbiAgfTtcblxuICBjb25zdCBlbmRUaW1pbmdEcmFnID0gKGV2ZW50KSA9PiB7XG4gICAgY29uc3QgZHJhZyA9IHRpbWluZ0RyYWdSZWYuY3VycmVudDtcbiAgICBpZiAoIWRyYWcgfHwgZHJhZy5wb2ludGVySWQgIT09IGV2ZW50LnBvaW50ZXJJZCkgcmV0dXJuO1xuICAgIGlmIChldmVudC5jdXJyZW50VGFyZ2V0Lmhhc1BvaW50ZXJDYXB0dXJlPy4oZXZlbnQucG9pbnRlcklkKSkgZXZlbnQuY3VycmVudFRhcmdldC5yZWxlYXNlUG9pbnRlckNhcHR1cmUoZXZlbnQucG9pbnRlcklkKTtcbiAgICBpZiAoZHJhZy50eXBlID09PSAnY3VlJykge1xuICAgICAgZmx1c2hQcmV2aWV3RnJhbWUoKTtcbiAgICAgIGlmIChldmVudC50eXBlID09PSAncG9pbnRlcmNhbmNlbCcgfHwgIWRyYWcubW92ZWQpIHN0b3JlLmNhbmNlbFByZXZpZXcoKTtcbiAgICAgIGVsc2Ugc3RvcmUuY29tbWl0UHJldmlldyhkcmFnLnNlbGVjdGlvbik7XG4gICAgfVxuICAgIGlmIChkcmFnLnR5cGUgPT09ICdjYW1lcmEnICYmIGRyYWcubW92ZWQgJiYgZXZlbnQudHlwZSAhPT0gJ3BvaW50ZXJjYW5jZWwnKSB7XG4gICAgICBjb25zdCBkcm9wID0gZHJhZy5sYXN0RHJvcCB8fCByZXNvbHZlQ2FtZXJhRHJvcEF0Q2xpZW50WChldmVudC5jbGllbnRYKTtcbiAgICAgIGlmIChkcm9wLnZhbGlkKSB7XG4gICAgICAgIHN0b3JlLmNvbW1pdCgnTW92ZSBjYW1lcmEga2V5JywgKGRyYWZ0KSA9PiB7XG4gICAgICAgICAgY29uc3Qgc291cmNlS2V5cyA9IGRyYWZ0LnNlY3Rpb25zW2RyYWcuc2VjdGlvbkluZGV4XT8uY2FtZXJhLmtleXM7XG4gICAgICAgICAgY29uc3QgW21vdmVkS2V5XSA9IHNvdXJjZUtleXM/LnNwbGljZShkcmFnLmtleUluZGV4LCAxKSB8fCBbXTtcbiAgICAgICAgICBpZiAoIW1vdmVkS2V5KSByZXR1cm47XG4gICAgICAgICAgbW92ZWRLZXkuYXQgPSBkcm9wLmF0O1xuICAgICAgICAgIGNvbnN0IGRlc3RpbmF0aW9uS2V5cyA9IGRyYWZ0LnNlY3Rpb25zW2Ryb3Auc2VjdGlvbkluZGV4XS5jYW1lcmEua2V5cztcbiAgICAgICAgICBkZXN0aW5hdGlvbktleXMucHVzaChtb3ZlZEtleSk7XG4gICAgICAgICAgZGVzdGluYXRpb25LZXlzLnNvcnQoKGEsIGIpID0+IGEuYXQgLSBiLmF0KTtcbiAgICAgICAgfSwge1xuICAgICAgICAgIHNlbGVjdGlvbjogeyB0eXBlOiAnY2FtZXJhLWtleScsIHNlY3Rpb25JZDogZHJvcC5zZWN0aW9uSWQsIGtleUluZGV4OiBkcm9wLmtleUluZGV4IH0sXG4gICAgICAgIH0pO1xuICAgICAgICBzdG9yZS5zZXRUcmFuc3BvcnQoeyBvd25lcjogJ3RpbWVsaW5lJywgcGxheWluZzogZmFsc2UsIHN0b3J5V1U6IGRyb3Auc3RvcnlXVSB9KTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHN0b3JlLnNldFNhdmVTdGF0ZSh7IG1lc3NhZ2U6IGRyb3AucmVhc29uIHx8ICdUaGF0IGNhbWVyYSBrZXkgY2Fubm90IGJlIHBsYWNlZCBoZXJlLicgfSk7XG4gICAgICB9XG4gICAgfVxuICAgIGlmIChkcmFnLm1vdmVkKSB7XG4gICAgICBzdXBwcmVzc2VkQ2xpY2tSZWYuY3VycmVudCA9IGRyYWcudG9rZW47XG4gICAgICB3aW5kb3cuc2V0VGltZW91dCgoKSA9PiB7XG4gICAgICAgIGlmIChzdXBwcmVzc2VkQ2xpY2tSZWYuY3VycmVudCA9PT0gZHJhZy50b2tlbikgc3VwcHJlc3NlZENsaWNrUmVmLmN1cnJlbnQgPSBudWxsO1xuICAgICAgfSwgMCk7XG4gICAgfVxuICAgIHNldENhbWVyYURyYWdQcmV2aWV3KG51bGwpO1xuICAgIHRpbWluZ0RyYWdSZWYuY3VycmVudCA9IG51bGw7XG4gIH07XG5cbiAgY29uc3QgaGFuZGxlVGltaW5nQ2xpY2sgPSAodG9rZW4sIGFjdGlvbikgPT4ge1xuICAgIGlmIChzdXBwcmVzc2VkQ2xpY2tSZWYuY3VycmVudCA9PT0gdG9rZW4pIHtcbiAgICAgIHN1cHByZXNzZWRDbGlja1JlZi5jdXJyZW50ID0gbnVsbDtcbiAgICAgIHJldHVybjtcbiAgICB9XG4gICAgYWN0aW9uKCk7XG4gIH07XG5cbiAgY29uc3QgYmVnaW5TZWN0aW9uUmVzaXplID0gKGV2ZW50LCBkYXRhKSA9PiB7XG4gICAgaWYgKGRhdGEubG9ja2VkIHx8IGV2ZW50LmJ1dHRvbiAhPT0gMCkgcmV0dXJuO1xuICAgIGV2ZW50LnByZXZlbnREZWZhdWx0KCk7XG4gICAgZXZlbnQuc3RvcFByb3BhZ2F0aW9uKCk7XG4gICAgZXZlbnQuY3VycmVudFRhcmdldC5zZXRQb2ludGVyQ2FwdHVyZT8uKGV2ZW50LnBvaW50ZXJJZCk7XG4gICAgY29uc3QgY3VycmVudCA9IHN0b3JlLmdldFNuYXBzaG90KCk7XG4gICAgY29uc3QgZmllbGQgPSBnZXRBYm91dE5hcnJhdGl2ZUV4dGVudEZpZWxkKGN1cnJlbnQucHJldmlld1Byb2ZpbGUpO1xuICAgIHN0b3JlLmJlZ2luUHJldmlldyhgUmVzaXplICR7ZGF0YS5zZWN0aW9uTGFiZWx9YCk7XG4gICAgc3RvcmUuc2V0U2VsZWN0aW9uKHsgdHlwZTogJ3NlY3Rpb24nLCBzZWN0aW9uSWQ6IGRhdGEuc2VjdGlvbklkIH0pO1xuICAgIHRpbWluZ0RyYWdSZWYuY3VycmVudCA9IHtcbiAgICAgIHR5cGU6ICdzZWN0aW9uLXJlc2l6ZScsXG4gICAgICB0b2tlbjogYHNlY3Rpb24tcmVzaXplOiR7ZGF0YS5zZWN0aW9uSWR9YCxcbiAgICAgIHBvaW50ZXJJZDogZXZlbnQucG9pbnRlcklkLFxuICAgICAgc3RhcnRYOiBldmVudC5jbGllbnRYLFxuICAgICAgbW92ZWQ6IGZhbHNlLFxuICAgICAgc2VjdGlvbklkOiBkYXRhLnNlY3Rpb25JZCxcbiAgICAgIHNlY3Rpb25JbmRleDogZGF0YS5zZWN0aW9uSW5kZXgsXG4gICAgICBzZWN0aW9uTGFiZWw6IGRhdGEuc2VjdGlvbkxhYmVsLFxuICAgICAgZmllbGQsXG4gICAgICBzdGFydEV4dGVudDogTnVtYmVyKGN1cnJlbnQuZG9jdW1lbnQuc2VjdGlvbnNbZGF0YS5zZWN0aW9uSW5kZXhdW2ZpZWxkXSksXG4gICAgICBzdGFydE1heFdVOiBNYXRoLm1heCgwLjAwMSwgY3VycmVudC5jb21waWxlZFBsYW4/Lm1heFN0b3J5V1UgfHwgbWF4V1UpLFxuICAgICAgc3RhcnRTY3JvbGxXaWR0aDogTWF0aC5tYXgoMSwgbGFuZXNSZWYuY3VycmVudD8uc2Nyb2xsV2lkdGggfHwgMSksXG4gICAgICBwbGF5aGVhZENvbnRleHQ6IGNhcHR1cmVBYm91dE5hcnJhdGl2ZVBsYXloZWFkQ29udGV4dCh7XG4gICAgICAgIHBsYW46IGN1cnJlbnQuY29tcGlsZWRQbGFuLFxuICAgICAgICBzdG9yeVdVOiBjdXJyZW50LnRyYW5zcG9ydC5zdG9yeVdVLFxuICAgICAgICByZXNpemVkU2VjdGlvbklkOiBkYXRhLnNlY3Rpb25JZCxcbiAgICAgIH0pLFxuICAgICAgc2VsZWN0aW9uOiB7IHR5cGU6ICdzZWN0aW9uJywgc2VjdGlvbklkOiBkYXRhLnNlY3Rpb25JZCB9LFxuICAgIH07XG4gICAgc2V0U2VjdGlvblJlc2l6ZVByZXZpZXcoeyBzZWN0aW9uSWQ6IGRhdGEuc2VjdGlvbklkLCBleHRlbnQ6IE51bWJlcihjdXJyZW50LmRvY3VtZW50LnNlY3Rpb25zW2RhdGEuc2VjdGlvbkluZGV4XVtmaWVsZF0pIH0pO1xuICB9O1xuXG4gIGNvbnN0IG1vdmVTZWN0aW9uUmVzaXplID0gKGV2ZW50KSA9PiB7XG4gICAgY29uc3QgZHJhZyA9IHRpbWluZ0RyYWdSZWYuY3VycmVudDtcbiAgICBpZiAoZHJhZz8udHlwZSAhPT0gJ3NlY3Rpb24tcmVzaXplJyB8fCBkcmFnLnBvaW50ZXJJZCAhPT0gZXZlbnQucG9pbnRlcklkKSByZXR1cm47XG4gICAgaWYgKCFkcmFnLm1vdmVkICYmIE1hdGguYWJzKGV2ZW50LmNsaWVudFggLSBkcmFnLnN0YXJ0WCkgPCAzKSByZXR1cm47XG4gICAgZHJhZy5tb3ZlZCA9IHRydWU7XG4gICAgY29uc3QgcmF3RXh0ZW50ID0gZHJhZy5zdGFydEV4dGVudCArICgoKGV2ZW50LmNsaWVudFggLSBkcmFnLnN0YXJ0WCkgLyBkcmFnLnN0YXJ0U2Nyb2xsV2lkdGgpICogZHJhZy5zdGFydE1heFdVKTtcbiAgICBjb25zdCBzdGVwID0gZXZlbnQuYWx0S2V5ID8gMC4wMSA6IGV2ZW50LnNoaWZ0S2V5ID8gMC4yNSA6IDAuMDU7XG4gICAgY29uc3QgZXh0ZW50ID0gTWF0aC5taW4oOCwgTWF0aC5tYXgoMSwgTWF0aC5yb3VuZChyYXdFeHRlbnQgLyBzdGVwKSAqIHN0ZXApKTtcbiAgICBpZiAoTWF0aC5hYnMoZXh0ZW50IC0gKGRyYWcubGFzdEV4dGVudCA/PyBkcmFnLnN0YXJ0RXh0ZW50KSkgPCAwLjAwMDAwMSkgcmV0dXJuO1xuICAgIGRyYWcubGFzdEV4dGVudCA9IE51bWJlcihleHRlbnQudG9GaXhlZCgyKSk7XG4gICAgc2V0U2VjdGlvblJlc2l6ZVByZXZpZXcoeyBzZWN0aW9uSWQ6IGRyYWcuc2VjdGlvbklkLCBleHRlbnQ6IGRyYWcubGFzdEV4dGVudCB9KTtcbiAgICBxdWV1ZVByZXZpZXdGcmFtZSgoKSA9PiB7XG4gICAgICBzdG9yZS51cGRhdGVQcmV2aWV3KChkcmFmdCkgPT4ge1xuICAgICAgICBkcmFmdC5zZWN0aW9uc1tkcmFnLnNlY3Rpb25JbmRleF1bZHJhZy5maWVsZF0gPSBkcmFnLmxhc3RFeHRlbnQ7XG4gICAgICB9KTtcbiAgICAgIHN0b3JlLnNldFRyYW5zcG9ydCh7XG4gICAgICAgIG93bmVyOiAndGltZWxpbmUnLFxuICAgICAgICBwbGF5aW5nOiBmYWxzZSxcbiAgICAgICAgc3RvcnlXVTogcmVtYXBBYm91dE5hcnJhdGl2ZVBsYXloZWFkQ29udGV4dChkcmFnLnBsYXloZWFkQ29udGV4dCwgc3RvcmUuZ2V0U25hcHNob3QoKS5jb21waWxlZFBsYW4pLFxuICAgICAgfSk7XG4gICAgfSk7XG4gIH07XG5cbiAgY29uc3QgZW5kU2VjdGlvblJlc2l6ZSA9IChldmVudCkgPT4ge1xuICAgIGNvbnN0IGRyYWcgPSB0aW1pbmdEcmFnUmVmLmN1cnJlbnQ7XG4gICAgaWYgKGRyYWc/LnR5cGUgIT09ICdzZWN0aW9uLXJlc2l6ZScgfHwgZHJhZy5wb2ludGVySWQgIT09IGV2ZW50LnBvaW50ZXJJZCkgcmV0dXJuO1xuICAgIGlmIChldmVudC5jdXJyZW50VGFyZ2V0Lmhhc1BvaW50ZXJDYXB0dXJlPy4oZXZlbnQucG9pbnRlcklkKSkgZXZlbnQuY3VycmVudFRhcmdldC5yZWxlYXNlUG9pbnRlckNhcHR1cmUoZXZlbnQucG9pbnRlcklkKTtcbiAgICBmbHVzaFByZXZpZXdGcmFtZSgpO1xuICAgIGlmIChldmVudC50eXBlID09PSAncG9pbnRlcmNhbmNlbCcgfHwgIWRyYWcubW92ZWQpIHN0b3JlLmNhbmNlbFByZXZpZXcoKTtcbiAgICBlbHNlIHN0b3JlLmNvbW1pdFByZXZpZXcoZHJhZy5zZWxlY3Rpb24pO1xuICAgIHRpbWluZ0RyYWdSZWYuY3VycmVudCA9IG51bGw7XG4gICAgc2V0U2VjdGlvblJlc2l6ZVByZXZpZXcobnVsbCk7XG4gIH07XG5cbiAgY29uc3QgcmVzZXRTZWN0aW9uRXh0ZW50ID0gKHNlY3Rpb25JZCwgc2VjdGlvbkluZGV4KSA9PiB7XG4gICAgY29uc3QgY3VycmVudCA9IHN0b3JlLmdldFNuYXBzaG90KCk7XG4gICAgY29uc3QgZmllbGQgPSBnZXRBYm91dE5hcnJhdGl2ZUV4dGVudEZpZWxkKGN1cnJlbnQucHJldmlld1Byb2ZpbGUpO1xuICAgIGNvbnN0IGJhc2VsaW5lU2VjdGlvbiA9IGN1cnJlbnQuYmFzZWxpbmVEb2N1bWVudC5zZWN0aW9ucy5maW5kKChpdGVtKSA9PiBpdGVtLmlkID09PSBzZWN0aW9uSWQpO1xuICAgIGlmICghYmFzZWxpbmVTZWN0aW9uIHx8IGJhc2VsaW5lU2VjdGlvbltmaWVsZF0gPT09IGN1cnJlbnQuZG9jdW1lbnQuc2VjdGlvbnNbc2VjdGlvbkluZGV4XVtmaWVsZF0pIHJldHVybjtcbiAgICBjb25zdCBjb250ZXh0ID0gY2FwdHVyZUFib3V0TmFycmF0aXZlUGxheWhlYWRDb250ZXh0KHtcbiAgICAgIHBsYW46IGN1cnJlbnQuY29tcGlsZWRQbGFuLFxuICAgICAgc3RvcnlXVTogY3VycmVudC50cmFuc3BvcnQuc3RvcnlXVSxcbiAgICAgIHJlc2l6ZWRTZWN0aW9uSWQ6IHNlY3Rpb25JZCxcbiAgICB9KTtcbiAgICBzdG9yZS5iZWdpblByZXZpZXcoJ1Jlc3RvcmUgc2F2ZWQgU2VjdGlvbiBsZW5ndGgnKTtcbiAgICBzdG9yZS51cGRhdGVQcmV2aWV3KChkcmFmdCkgPT4geyBkcmFmdC5zZWN0aW9uc1tzZWN0aW9uSW5kZXhdW2ZpZWxkXSA9IGJhc2VsaW5lU2VjdGlvbltmaWVsZF07IH0pO1xuICAgIHN0b3JlLnNldFRyYW5zcG9ydCh7IHN0b3J5V1U6IHJlbWFwQWJvdXROYXJyYXRpdmVQbGF5aGVhZENvbnRleHQoY29udGV4dCwgc3RvcmUuZ2V0U25hcHNob3QoKS5jb21waWxlZFBsYW4pIH0pO1xuICAgIHN0b3JlLmNvbW1pdFByZXZpZXcoeyB0eXBlOiAnc2VjdGlvbicsIHNlY3Rpb25JZCB9KTtcbiAgfTtcblxuICBjb25zdCBiZWdpbk1hcnF1ZWUgPSAoZXZlbnQpID0+IHtcbiAgICBpZiAoZXZlbnQuYnV0dG9uICE9PSAwIHx8IGV2ZW50LnRhcmdldCAhPT0gZXZlbnQuY3VycmVudFRhcmdldCkgcmV0dXJuO1xuICAgIGNvbnN0IGNhbnZhcyA9IGxhbmVzUmVmLmN1cnJlbnQ/LnF1ZXJ5U2VsZWN0b3IoJy5hYm91dC1lZGl0b3ItdGltZWxpbmUtY2FudmFzJyk7XG4gICAgaWYgKCFjYW52YXMpIHJldHVybjtcbiAgICBldmVudC5wcmV2ZW50RGVmYXVsdCgpO1xuICAgIGV2ZW50LmN1cnJlbnRUYXJnZXQuc2V0UG9pbnRlckNhcHR1cmU/LihldmVudC5wb2ludGVySWQpO1xuICAgIGNvbnN0IHJlY3QgPSBjYW52YXMuZ2V0Qm91bmRpbmdDbGllbnRSZWN0KCk7XG4gICAgdGltaW5nRHJhZ1JlZi5jdXJyZW50ID0ge1xuICAgICAgdHlwZTogJ21hcnF1ZWUnLFxuICAgICAgcG9pbnRlcklkOiBldmVudC5wb2ludGVySWQsXG4gICAgICBzdGFydENsaWVudFg6IGV2ZW50LmNsaWVudFgsXG4gICAgICBzdGFydENsaWVudFk6IGV2ZW50LmNsaWVudFksXG4gICAgICBjYW52YXNSZWN0OiByZWN0LFxuICAgICAgYWRkaXRpdmU6IGV2ZW50LnNoaWZ0S2V5LFxuICAgIH07XG4gICAgc2V0TWFycXVlZSh7IGxlZnQ6IGV2ZW50LmNsaWVudFggLSByZWN0LmxlZnQsIHRvcDogZXZlbnQuY2xpZW50WSAtIHJlY3QudG9wLCB3aWR0aDogMCwgaGVpZ2h0OiAwIH0pO1xuICB9O1xuXG4gIGNvbnN0IG1vdmVNYXJxdWVlID0gKGV2ZW50KSA9PiB7XG4gICAgY29uc3QgZHJhZyA9IHRpbWluZ0RyYWdSZWYuY3VycmVudDtcbiAgICBpZiAoZHJhZz8udHlwZSAhPT0gJ21hcnF1ZWUnIHx8IGRyYWcucG9pbnRlcklkICE9PSBldmVudC5wb2ludGVySWQpIHJldHVybjtcbiAgICBjb25zdCBsZWZ0ID0gTWF0aC5taW4oZHJhZy5zdGFydENsaWVudFgsIGV2ZW50LmNsaWVudFgpIC0gZHJhZy5jYW52YXNSZWN0LmxlZnQ7XG4gICAgY29uc3QgdG9wID0gTWF0aC5taW4oZHJhZy5zdGFydENsaWVudFksIGV2ZW50LmNsaWVudFkpIC0gZHJhZy5jYW52YXNSZWN0LnRvcDtcbiAgICBzZXRNYXJxdWVlKHtcbiAgICAgIGxlZnQsXG4gICAgICB0b3AsXG4gICAgICB3aWR0aDogTWF0aC5hYnMoZXZlbnQuY2xpZW50WCAtIGRyYWcuc3RhcnRDbGllbnRYKSxcbiAgICAgIGhlaWdodDogTWF0aC5hYnMoZXZlbnQuY2xpZW50WSAtIGRyYWcuc3RhcnRDbGllbnRZKSxcbiAgICB9KTtcbiAgfTtcblxuICBjb25zdCBlbmRNYXJxdWVlID0gKGV2ZW50KSA9PiB7XG4gICAgY29uc3QgZHJhZyA9IHRpbWluZ0RyYWdSZWYuY3VycmVudDtcbiAgICBpZiAoZHJhZz8udHlwZSAhPT0gJ21hcnF1ZWUnIHx8IGRyYWcucG9pbnRlcklkICE9PSBldmVudC5wb2ludGVySWQpIHJldHVybjtcbiAgICBpZiAoZXZlbnQuY3VycmVudFRhcmdldC5oYXNQb2ludGVyQ2FwdHVyZT8uKGV2ZW50LnBvaW50ZXJJZCkpIGV2ZW50LmN1cnJlbnRUYXJnZXQucmVsZWFzZVBvaW50ZXJDYXB0dXJlKGV2ZW50LnBvaW50ZXJJZCk7XG4gICAgaWYgKGV2ZW50LnR5cGUgIT09ICdwb2ludGVyY2FuY2VsJykge1xuICAgICAgY29uc3Qgc2VsZWN0aW9uUmVjdCA9IHtcbiAgICAgICAgbGVmdDogTWF0aC5taW4oZHJhZy5zdGFydENsaWVudFgsIGV2ZW50LmNsaWVudFgpLFxuICAgICAgICByaWdodDogTWF0aC5tYXgoZHJhZy5zdGFydENsaWVudFgsIGV2ZW50LmNsaWVudFgpLFxuICAgICAgICB0b3A6IE1hdGgubWluKGRyYWcuc3RhcnRDbGllbnRZLCBldmVudC5jbGllbnRZKSxcbiAgICAgICAgYm90dG9tOiBNYXRoLm1heChkcmFnLnN0YXJ0Q2xpZW50WSwgZXZlbnQuY2xpZW50WSksXG4gICAgICB9O1xuICAgICAgY29uc3QgbGFuZVJlY3QgPSBsYW5lc1JlZi5jdXJyZW50Py5nZXRCb3VuZGluZ0NsaWVudFJlY3QoKTtcbiAgICAgIGNvbnN0IGhpdHMgPSBbLi4uKGxhbmVzUmVmLmN1cnJlbnQ/LnF1ZXJ5U2VsZWN0b3JBbGwoJy5hYm91dC1lZGl0b3ItY3VlW2RhdGEtY3VlLWlkXScpIHx8IFtdKV1cbiAgICAgICAgLmZpbHRlcigobm9kZSkgPT4ge1xuICAgICAgICAgIGNvbnN0IHJlY3QgPSBub2RlLmdldEJvdW5kaW5nQ2xpZW50UmVjdCgpO1xuICAgICAgICAgIGNvbnN0IHZpc2libGUgPSBsYW5lUmVjdCAmJiByZWN0LnJpZ2h0ID49IGxhbmVSZWN0LmxlZnQgJiYgcmVjdC5sZWZ0IDw9IGxhbmVSZWN0LnJpZ2h0O1xuICAgICAgICAgIHJldHVybiB2aXNpYmxlICYmIHJlY3QucmlnaHQgPj0gc2VsZWN0aW9uUmVjdC5sZWZ0ICYmIHJlY3QubGVmdCA8PSBzZWxlY3Rpb25SZWN0LnJpZ2h0XG4gICAgICAgICAgICAmJiByZWN0LmJvdHRvbSA+PSBzZWxlY3Rpb25SZWN0LnRvcCAmJiByZWN0LnRvcCA8PSBzZWxlY3Rpb25SZWN0LmJvdHRvbTtcbiAgICAgICAgfSlcbiAgICAgICAgLm1hcCgobm9kZSkgPT4gKHsgdHlwZTogJ2N1ZScsIHNlY3Rpb25JZDogbm9kZS5kYXRhc2V0LnNlY3Rpb25JZCwgY3VlSWQ6IG5vZGUuZGF0YXNldC5jdWVJZCwga2V5UGFydDogJ2ZvY3VzJyB9KSk7XG4gICAgICBpZiAoaGl0cy5sZW5ndGgpIHtcbiAgICAgICAgbGV0IG5leHRTZWxlY3Rpb24gPSBkcmFnLmFkZGl0aXZlID8gc3RvcmUuZ2V0U25hcHNob3QoKS5zZWxlY3Rpb24gOiBoaXRzWzBdO1xuICAgICAgICBoaXRzLnNsaWNlKGRyYWcuYWRkaXRpdmUgPyAwIDogMSkuZm9yRWFjaCgoaGl0KSA9PiB7XG4gICAgICAgICAgbmV4dFNlbGVjdGlvbiA9IHRvZ2dsZUFib3V0TmFycmF0aXZlQ3VlU2VsZWN0aW9uKG5leHRTZWxlY3Rpb24sIGhpdCk7XG4gICAgICAgIH0pO1xuICAgICAgICBzdG9yZS5zZXRTZWxlY3Rpb24obmV4dFNlbGVjdGlvbik7XG4gICAgICB9XG4gICAgfVxuICAgIHRpbWluZ0RyYWdSZWYuY3VycmVudCA9IG51bGw7XG4gICAgc2V0TWFycXVlZShudWxsKTtcbiAgfTtcblxuICByZXR1cm4gKFxuICAgIDxkaXYgY2xhc3NOYW1lPVwiYWJvdXQtZWRpdG9yLXRpbWVsaW5lXCI+XG4gICAgICA8ZGl2IGNsYXNzTmFtZT1cImFib3V0LWVkaXRvci1sYW5lLWxhYmVsc1wiIGFyaWEtaGlkZGVuPVwidHJ1ZVwiPlxuICAgICAgICA8c3Bhbj5TZWN0aW9uczwvc3Bhbj48c3Bhbj5DYW1lcmE8L3NwYW4+PHNwYW4+V29ybGQ8L3NwYW4+PHNwYW4+VGV4dDwvc3Bhbj48c3Bhbj5JbnRlcmFjdGlvbjwvc3Bhbj5cbiAgICAgIDwvZGl2PlxuICAgICAgPGRpdiByZWY9e2xhbmVzUmVmfSBjbGFzc05hbWU9XCJhYm91dC1lZGl0b3ItbGFuZXNcIiBkYXRhLXNvbG8tdHJhY2s9e3RyYW5zcG9ydC5zb2xvVHJhY2sgfHwgJyd9IG9uV2hlZWw9e3pvb21UaW1lbGluZX0+XG4gICAgICAgIDxkaXYgY2xhc3NOYW1lPVwiYWJvdXQtZWRpdG9yLXRpbWVsaW5lLWNhbnZhc1wiIHN0eWxlPXt7ICctLWFib3V0LWVkaXRvci1wbGF5aGVhZCc6IHBsYXloZWFkLCAnLS1hYm91dC1lZGl0b3ItdGltZWxpbmUtem9vbSc6IE1hdGgubWF4KDEsIE51bWJlcih0cmFuc3BvcnQuem9vbSkgfHwgMSkgfX0+XG4gICAgICAgICAgPGRpdiBjbGFzc05hbWU9XCJhYm91dC1lZGl0b3ItcGxheWhlYWRcIiAvPlxuICAgICAgICAgIHttYXJxdWVlID8gPGRpdiBjbGFzc05hbWU9XCJhYm91dC1lZGl0b3ItbWFycXVlZVwiIHN0eWxlPXttYXJxdWVlfSBhcmlhLWhpZGRlbj1cInRydWVcIiAvPiA6IG51bGx9XG4gICAgICAgICAge2NhbWVyYURyYWdQcmV2aWV3ID8gKFxuICAgICAgICAgIDxkaXZcbiAgICAgICAgICAgIGNsYXNzTmFtZT17YGFib3V0LWVkaXRvci1jYW1lcmEtZHJhZy1naG9zdCR7Y2FtZXJhRHJhZ1ByZXZpZXcudmFsaWQgPyAnJyA6ICcgaXMtaW52YWxpZCd9YH1cbiAgICAgICAgICAgIHN0eWxlPXt7IGxlZnQ6IGAke2NhbWVyYURyYWdQcmV2aWV3LmNvbnRlbnRYfXB4YCB9fVxuICAgICAgICAgICAgYXJpYS1oaWRkZW49XCJ0cnVlXCJcbiAgICAgICAgICA+XG4gICAgICAgICAgICA8aSAvPlxuICAgICAgICAgICAgPHNwYW4+e2NhbWVyYURyYWdQcmV2aWV3LnZhbGlkID8gYCR7Y2FtZXJhRHJhZ1ByZXZpZXcuc2VjdGlvbkxhYmVsfSDCtyAke2Zvcm1hdENhbWVyYVBlcmNlbnQoY2FtZXJhRHJhZ1ByZXZpZXcuYXQpfWAgOiBjYW1lcmFEcmFnUHJldmlldy5yZWFzb259PC9zcGFuPlxuICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICkgOiBudWxsfVxuICAgICAgICAgIHtbJ3NlY3Rpb24nLCAnY2FtZXJhJywgJ3dvcmxkJywgJ3RleHQnLCAnaW50ZXJhY3Rpb24nXS5tYXAoKGxhbmUpID0+IChcbiAgICAgICAgICA8ZGl2IGNsYXNzTmFtZT17YGFib3V0LWVkaXRvci1sYW5lIGFib3V0LWVkaXRvci1sYW5lLS0ke2xhbmV9YH0ga2V5PXtsYW5lfT5cbiAgICAgICAgICAgIHtkb2N1bWVudC5zZWN0aW9ucy5tYXAoKHNlY3Rpb24sIHNlY3Rpb25JbmRleCkgPT4ge1xuICAgICAgICAgICAgICBjb25zdCBjb21waWxlZCA9IGNvbXBpbGVkUGxhbj8uc2VjdGlvbnM/LltzZWN0aW9uSW5kZXhdO1xuICAgICAgICAgICAgICBjb25zdCBzdGFydFdVID0gTWF0aC5taW4obWF4V1UsIGNvbXBpbGVkPy5zdGFydFdVIHx8IDApO1xuICAgICAgICAgICAgICBjb25zdCBuZXh0U3RhcnRXVSA9IE1hdGgubWluKG1heFdVLCBjb21waWxlZFBsYW4/LnNlY3Rpb25zPy5bc2VjdGlvbkluZGV4ICsgMV0/LnN0YXJ0V1UgPz8gbWF4V1UpO1xuICAgICAgICAgICAgICBjb25zdCBzcGFuV1UgPSBNYXRoLm1heCgwLjAwMSwgbmV4dFN0YXJ0V1UgLSBzdGFydFdVKTtcbiAgICAgICAgICAgICAgY29uc3Qgd2lkdGggPSBgJHsoc3BhbldVIC8gbWF4V1UpICogMTAwfSVgO1xuICAgICAgICAgICAgICBjb25zdCBpblNlbGVjdGVkU2VjdGlvbiA9IHNlbGVjdGlvbi5zZWN0aW9uSWQgPT09IHNlY3Rpb24uaWQ7XG4gICAgICAgICAgICAgIGNvbnN0IGxvY2FsUGVyY2VudCA9IChhdCkgPT4gTWF0aC5taW4oMTAwLCAoTnVtYmVyKGF0IHx8IDApICogKGNvbXBpbGVkPy50cmF2ZWxXVSB8fCBzcGFuV1UpIC8gc3BhbldVKSAqIDEwMCk7XG4gICAgICAgICAgICAgIGNvbnN0IGxvY2FsUG9zaXRpb24gPSAoYXQpID0+IGAke2xvY2FsUGVyY2VudChhdCl9JWA7XG4gICAgICAgICAgICAgIGNvbnN0IGV4dGVuZGVkTG9jYWxQb3NpdGlvbiA9IChhdCkgPT4gYCR7KE51bWJlcihhdCB8fCAwKSAqIChjb21waWxlZD8udHJhdmVsV1UgfHwgc3BhbldVKSAvIHNwYW5XVSkgKiAxMDB9JWA7XG4gICAgICAgICAgICAgIGNvbnN0IGV4dGVuZGVkTG9jYWxXaWR0aCA9IChmcm9tLCB0bykgPT4gYCR7TWF0aC5tYXgoMC4zNSwgKE51bWJlcih0bykgLSBOdW1iZXIoZnJvbSkpICogKGNvbXBpbGVkPy50cmF2ZWxXVSB8fCBzcGFuV1UpIC8gc3BhbldVICogMTAwKX0lYDtcbiAgICAgICAgICAgICAgY29uc3QgdGV4dFBvc2l0aW9uID0gKGF0KSA9PiBgJHtjbGFtcDAxKE51bWJlcihhdCB8fCAwKSkgKiAxMDB9JWA7XG4gICAgICAgICAgICAgIGNvbnN0IHNlbGVjdEF0ID0gKG5leHRTZWxlY3Rpb24sIGF0ID0gMCkgPT4ge1xuICAgICAgICAgICAgICAgIHN0b3JlLnNldFNlbGVjdGlvbih7IHNlY3Rpb25JZDogc2VjdGlvbi5pZCwgLi4ubmV4dFNlbGVjdGlvbiB9KTtcbiAgICAgICAgICAgICAgICBzdG9yZS5zZXRUcmFuc3BvcnQoe1xuICAgICAgICAgICAgICAgICAgb3duZXI6ICd0aW1lbGluZScsXG4gICAgICAgICAgICAgICAgICBwbGF5aW5nOiBmYWxzZSxcbiAgICAgICAgICAgICAgICAgIHN0b3J5V1U6IHN0YXJ0V1UgKyAoTnVtYmVyKGF0IHx8IDApICogKGNvbXBpbGVkPy50cmF2ZWxXVSB8fCAwKSksXG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgIH07XG4gICAgICAgICAgICAgIGlmIChsYW5lID09PSAnc2VjdGlvbicpIHtcbiAgICAgICAgICAgICAgICBjb25zdCBpc1NlbGVjdGVkID0gaW5TZWxlY3RlZFNlY3Rpb24gJiYgc2VsZWN0aW9uLnR5cGUgPT09ICdzZWN0aW9uJztcbiAgICAgICAgICAgICAgICBjb25zdCByZXNpemVFeHRlbnQgPSBzZWN0aW9uUmVzaXplUHJldmlldz8uc2VjdGlvbklkID09PSBzZWN0aW9uLmlkXG4gICAgICAgICAgICAgICAgICA/IHNlY3Rpb25SZXNpemVQcmV2aWV3LmV4dGVudFxuICAgICAgICAgICAgICAgICAgOiBOdW1iZXIoc2VjdGlvbltnZXRBYm91dE5hcnJhdGl2ZUV4dGVudEZpZWxkKHNuYXBzaG90LnByZXZpZXdQcm9maWxlKV0pO1xuICAgICAgICAgICAgICAgIHJldHVybiAoXG4gICAgICAgICAgICAgICAgICA8ZGl2XG4gICAgICAgICAgICAgICAgICAgIGtleT17c2VjdGlvbi5pZH1cbiAgICAgICAgICAgICAgICAgICAgY2xhc3NOYW1lPXtgYWJvdXQtZWRpdG9yLXNlY3Rpb24tY2xpcCR7aXNTZWxlY3RlZCA/ICcgaXMtc2VsZWN0ZWQnIDogJyd9JHtpblNlbGVjdGVkU2VjdGlvbiA/ICcgaXMtY29udGV4dCcgOiAnJ31gfVxuICAgICAgICAgICAgICAgICAgICBzdHlsZT17eyB3aWR0aCB9fVxuICAgICAgICAgICAgICAgICAgICB0aXRsZT17YCR7c2VjdGlvbi5sYWJlbH0gwrcgJHtmb3JtYXRXVShjb21waWxlZD8ucmVzb2x2ZWRFeHRlbnRXVSB8fCBzZWN0aW9uLmV4dGVudFdVKX1gfVxuICAgICAgICAgICAgICAgICAgPlxuICAgICAgICAgICAgICAgICAgICA8YnV0dG9uIHR5cGU9XCJidXR0b25cIiBhcmlhLXByZXNzZWQ9e2lzU2VsZWN0ZWR9IG9uQ2xpY2s9eygpID0+IHNlbGVjdEF0KHsgdHlwZTogJ3NlY3Rpb24nIH0pfT5cbiAgICAgICAgICAgICAgICAgICAgICA8c3Bhbj57U3RyaW5nKHNlY3Rpb25JbmRleCArIDEpLnBhZFN0YXJ0KDIsICcwJyl9PC9zcGFuPntzZWN0aW9uLmxhYmVsfVxuICAgICAgICAgICAgICAgICAgICA8L2J1dHRvbj5cbiAgICAgICAgICAgICAgICAgICAge3NlY3Rpb25SZXNpemVQcmV2aWV3Py5zZWN0aW9uSWQgPT09IHNlY3Rpb24uaWQgPyA8b3V0cHV0Pntmb3JtYXRXVShNYXRoLm1heCgwLCByZXNpemVFeHRlbnQgLSAxKSl9IHNjcm9sbCDCtyB7Zm9ybWF0V1UocmVzaXplRXh0ZW50KX0gdG90YWw8L291dHB1dD4gOiBudWxsfVxuICAgICAgICAgICAgICAgICAgICA8YnV0dG9uXG4gICAgICAgICAgICAgICAgICAgICAgdHlwZT1cImJ1dHRvblwiXG4gICAgICAgICAgICAgICAgICAgICAgY2xhc3NOYW1lPVwiYWJvdXQtZWRpdG9yLXNlY3Rpb24tcmVzaXplXCJcbiAgICAgICAgICAgICAgICAgICAgICBkaXNhYmxlZD17c2VjdGlvbi5sb2NrZWR9XG4gICAgICAgICAgICAgICAgICAgICAgYXJpYS1sYWJlbD17YFJlc2l6ZSAke3NlY3Rpb24ubGFiZWx9YH1cbiAgICAgICAgICAgICAgICAgICAgICB0aXRsZT17c2VjdGlvbi5sb2NrZWQgPyAnVW5sb2NrIHRoaXMgcHJvdGVjdGVkIFNlY3Rpb24gdG8gcmVzaXplIGl0JyA6IGBEcmFnIHRvIGNoYW5nZSAke3NuYXBzaG90LnByZXZpZXdQcm9maWxlID09PSAnbW9iaWxlJyA/ICdtb2JpbGUnIDogJ2Rlc2t0b3AnfSBzY3JvbGwgbGVuZ3RoIMK3IGRvdWJsZS1jbGljayB0byByZXN0b3JlIHNhdmVkIGxlbmd0aGB9XG4gICAgICAgICAgICAgICAgICAgICAgb25Eb3VibGVDbGljaz17KGV2ZW50KSA9PiB7IGV2ZW50LnByZXZlbnREZWZhdWx0KCk7IGV2ZW50LnN0b3BQcm9wYWdhdGlvbigpOyByZXNldFNlY3Rpb25FeHRlbnQoc2VjdGlvbi5pZCwgc2VjdGlvbkluZGV4KTsgfX1cbiAgICAgICAgICAgICAgICAgICAgICBvblBvaW50ZXJEb3duPXsoZXZlbnQpID0+IGJlZ2luU2VjdGlvblJlc2l6ZShldmVudCwgeyBzZWN0aW9uSWQ6IHNlY3Rpb24uaWQsIHNlY3Rpb25JbmRleCwgc2VjdGlvbkxhYmVsOiBzZWN0aW9uLmxhYmVsLCBsb2NrZWQ6IHNlY3Rpb24ubG9ja2VkIH0pfVxuICAgICAgICAgICAgICAgICAgICAgIG9uUG9pbnRlck1vdmU9e21vdmVTZWN0aW9uUmVzaXplfVxuICAgICAgICAgICAgICAgICAgICAgIG9uUG9pbnRlclVwPXtlbmRTZWN0aW9uUmVzaXplfVxuICAgICAgICAgICAgICAgICAgICAgIG9uUG9pbnRlckNhbmNlbD17ZW5kU2VjdGlvblJlc2l6ZX1cbiAgICAgICAgICAgICAgICAgICAgLz5cbiAgICAgICAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgICAgICk7XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgaWYgKGxhbmUgPT09ICdjYW1lcmEnKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIChcbiAgICAgICAgICAgICAgICAgIDxkaXYgY2xhc3NOYW1lPVwiYWJvdXQtZWRpdG9yLWNsaXBcIiBrZXk9e3NlY3Rpb24uaWR9IHN0eWxlPXt7IHdpZHRoIH19PlxuICAgICAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cImFib3V0LWVkaXRvci1jYW1lcmEtcmFpbFwiIGFyaWEtaGlkZGVuPVwidHJ1ZVwiPlxuICAgICAgICAgICAgICAgICAgICAgIHtzZWN0aW9uLmNhbWVyYS5rZXlzLnNsaWNlKDEpLm1hcCgoa2V5LCBrZXlJbmRleCkgPT4ge1xuICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgZnJvbUtleSA9IHNlY3Rpb24uY2FtZXJhLmtleXNba2V5SW5kZXhdO1xuICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgbGVmdCA9IGxvY2FsUGVyY2VudChmcm9tS2V5LmF0KTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IHJpZ2h0ID0gbG9jYWxQZXJjZW50KGtleS5hdCk7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gKFxuICAgICAgICAgICAgICAgICAgICAgICAgICA8c3BhblxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNsYXNzTmFtZT17Y2FtZXJhUG9zZUNoYW5nZXMoZnJvbUtleSwga2V5KSA/ICdpcy1hdXRob3JlZC1tb3Rpb24nIDogJ2lzLWJhc2UtZG9sbHknfVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGtleT17YCR7c2VjdGlvbi5pZH06Y2FtZXJhLXNwYW46JHtrZXlJbmRleH1gfVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHN0eWxlPXt7IGxlZnQ6IGAke2xlZnR9JWAsIHdpZHRoOiBgJHtNYXRoLm1heCgwLjUsIHJpZ2h0IC0gbGVmdCl9JWAgfX1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgLz5cbiAgICAgICAgICAgICAgICAgICAgICAgICk7XG4gICAgICAgICAgICAgICAgICAgICAgfSl9XG4gICAgICAgICAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgICAgICAgICB7c2VjdGlvbi5jYW1lcmEua2V5cy5tYXAoKGtleSwga2V5SW5kZXgpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgICBjb25zdCB0aW1pbmdCb3VuZHMgPSBnZXRBYm91dE5hcnJhdGl2ZUNhbWVyYUtleVRpbWluZ0JvdW5kcyhzZWN0aW9uLmNhbWVyYS5rZXlzLCBrZXlJbmRleCk7XG4gICAgICAgICAgICAgICAgICAgICAgY29uc3QgdG9rZW4gPSBgY2FtZXJhOiR7c2VjdGlvbi5pZH06JHtrZXlJbmRleH1gO1xuICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IGtleVNlbGVjdGlvbiA9IHsgdHlwZTogJ2NhbWVyYS1rZXknLCBzZWN0aW9uSWQ6IHNlY3Rpb24uaWQsIGtleUluZGV4IH07XG4gICAgICAgICAgICAgICAgICAgICAgY29uc3QgaXNTZWxlY3RlZCA9IGluU2VsZWN0ZWRTZWN0aW9uICYmIHNlbGVjdGlvbi50eXBlID09PSAnY2FtZXJhLWtleScgJiYgc2VsZWN0aW9uLmtleUluZGV4ID09PSBrZXlJbmRleDtcbiAgICAgICAgICAgICAgICAgICAgICBjb25zdCByZXF1aXJlZCA9IHRpbWluZ0JvdW5kcy5sb2NrZWQ7XG4gICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIChcbiAgICAgICAgICAgICAgICAgICAgICAgIDxidXR0b25cbiAgICAgICAgICAgICAgICAgICAgICAgICAgdHlwZT1cImJ1dHRvblwiXG4gICAgICAgICAgICAgICAgICAgICAgICAgIGtleT17dG9rZW59XG4gICAgICAgICAgICAgICAgICAgICAgICAgIGNsYXNzTmFtZT17YGFib3V0LWVkaXRvci1rZXkke3JlcXVpcmVkID8gJyBpcy1ib3VuZGFyeScgOiAnIGlzLWRyYWdnYWJsZSd9JHtpc1NlbGVjdGVkID8gJyBpcy1zZWxlY3RlZCcgOiAnJ30ke2NhbWVyYURyYWdQcmV2aWV3Py50b2tlbiA9PT0gdG9rZW4gPyAnIGlzLWRyYWctc291cmNlJyA6ICcnfWB9XG4gICAgICAgICAgICAgICAgICAgICAgICAgIHN0eWxlPXt7IGxlZnQ6IGxvY2FsUG9zaXRpb24oa2V5LmF0KSB9fVxuICAgICAgICAgICAgICAgICAgICAgICAgICB0aXRsZT17cmVxdWlyZWRcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICA/IGBQcm90ZWN0ZWQgQ2FtZXJhIGtleSBhdCAke2Zvcm1hdENhbWVyYVBlcmNlbnQoa2V5LmF0KX0gwrcgc2VsZWN0IHRvIGluc3BlY3RgXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgOiBgQ2FtZXJhIGtleSBhdCAke2Zvcm1hdENhbWVyYVBlcmNlbnQoa2V5LmF0KX0gwrcgZHJhZyBhbnl3aGVyZSBvbiB0aGUgQ2FtZXJhIHRyYWNrYH1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgYXJpYS1sYWJlbD17YCR7cmVxdWlyZWQgPyAnUHJvdGVjdGVkICcgOiAnJ31DYW1lcmEga2V5IGF0ICR7Zm9ybWF0Q2FtZXJhUGVyY2VudChrZXkuYXQpfSB0aHJvdWdoICR7c2VjdGlvbi5sYWJlbH1gfVxuICAgICAgICAgICAgICAgICAgICAgICAgICBhcmlhLXByZXNzZWQ9e2lzU2VsZWN0ZWR9XG4gICAgICAgICAgICAgICAgICAgICAgICAgIG9uUG9pbnRlckRvd249e3JlcXVpcmVkID8gdW5kZWZpbmVkIDogKGV2ZW50KSA9PiBiZWdpblRpbWluZ0RyYWcoZXZlbnQsIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0eXBlOiAnY2FtZXJhJyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0b2tlbixcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBsb2NrZWQ6IGZhbHNlLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGF0OiBrZXkuYXQsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgc2VjdGlvbkluZGV4LFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGtleUluZGV4LFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHNlY3Rpb25TdGFydFdVOiBzdGFydFdVLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHNwYW5XVSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0cmF2ZWxXVTogY29tcGlsZWQ/LnRyYXZlbFdVIHx8IHNwYW5XVSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBzdG9yeVdVOiBzdGFydFdVICsgKE51bWJlcihrZXkuYXQpICogKGNvbXBpbGVkPy50cmF2ZWxXVSB8fCAwKSksXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgc2VsZWN0aW9uOiBrZXlTZWxlY3Rpb24sXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY29hbGVzY2VLZXk6IGB0aW1lbGluZToke3Rva2VufWAsXG4gICAgICAgICAgICAgICAgICAgICAgICAgIH0pfVxuICAgICAgICAgICAgICAgICAgICAgICAgICBvblBvaW50ZXJNb3ZlPXtyZXF1aXJlZCA/IHVuZGVmaW5lZCA6IG1vdmVUaW1pbmdEcmFnfVxuICAgICAgICAgICAgICAgICAgICAgICAgICBvblBvaW50ZXJVcD17cmVxdWlyZWQgPyB1bmRlZmluZWQgOiBlbmRUaW1pbmdEcmFnfVxuICAgICAgICAgICAgICAgICAgICAgICAgICBvblBvaW50ZXJDYW5jZWw9e3JlcXVpcmVkID8gdW5kZWZpbmVkIDogZW5kVGltaW5nRHJhZ31cbiAgICAgICAgICAgICAgICAgICAgICAgICAgb25DbGljaz17KCkgPT4gaGFuZGxlVGltaW5nQ2xpY2sodG9rZW4sICgpID0+IHNlbGVjdEF0KHsgdHlwZTogJ2NhbWVyYS1rZXknLCBrZXlJbmRleCB9LCBrZXkuYXQpKX1cbiAgICAgICAgICAgICAgICAgICAgICAgIC8+XG4gICAgICAgICAgICAgICAgICAgICAgKTtcbiAgICAgICAgICAgICAgICAgICAgfSl9XG4gICAgICAgICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgICAgICApO1xuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgIGlmIChsYW5lID09PSAnd29ybGQnKSB7XG4gICAgICAgICAgICAgICAgY29uc3QgaXNTZWxlY3RlZCA9IGluU2VsZWN0ZWRTZWN0aW9uICYmIHNlbGVjdGlvbi50eXBlID09PSAnd29ybGQnO1xuICAgICAgICAgICAgICAgIGNvbnN0IHRyYW5zaXRpb24gPSBzZWN0aW9uLndvcmxkLm1vZGUgPT09ICdzZXQnICYmIHNlY3Rpb24ud29ybGQudHJhbnNpdGlvbkluLnR5cGUgIT09ICdjdXQnXG4gICAgICAgICAgICAgICAgICA/IHNlY3Rpb24ud29ybGQudHJhbnNpdGlvbkluXG4gICAgICAgICAgICAgICAgICA6IG51bGw7XG4gICAgICAgICAgICAgICAgcmV0dXJuIChcbiAgICAgICAgICAgICAgICAgIDxkaXYgY2xhc3NOYW1lPXtgYWJvdXQtZWRpdG9yLWNsaXAke2lzU2VsZWN0ZWQgPyAnIGlzLXNlbGVjdGVkJyA6ICcnfWB9IGtleT17c2VjdGlvbi5pZH0gc3R5bGU9e3sgd2lkdGggfX0+XG4gICAgICAgICAgICAgICAgICAgIDxidXR0b25cbiAgICAgICAgICAgICAgICAgICAgICB0eXBlPVwiYnV0dG9uXCJcbiAgICAgICAgICAgICAgICAgICAgICBjbGFzc05hbWU9e2BhYm91dC1lZGl0b3Itd29ybGQtY2xpcCAke3NlY3Rpb24ud29ybGQubW9kZSA9PT0gJ3NldCcgPyAnaGFzLXdvcmxkJyA6ICcnfSR7aXNTZWxlY3RlZCA/ICcgaXMtc2VsZWN0ZWQnIDogJyd9YH1cbiAgICAgICAgICAgICAgICAgICAgICBhcmlhLXByZXNzZWQ9e2lzU2VsZWN0ZWR9XG4gICAgICAgICAgICAgICAgICAgICAgb25DbGljaz17KCkgPT4gc2VsZWN0QXQoeyB0eXBlOiAnd29ybGQnIH0sIHRyYW5zaXRpb24gPyB0cmFuc2l0aW9uLmVuZCA6IDApfVxuICAgICAgICAgICAgICAgICAgICA+e3NlY3Rpb24ud29ybGQubW9kZSA9PT0gJ3NldCcgPyBzZWN0aW9uLndvcmxkLnNoYXBlSWQucmVwbGFjZSgnLXYxJywgJycpIDogJ2NvbnRpbnVlJ308L2J1dHRvbj5cbiAgICAgICAgICAgICAgICAgICAge3RyYW5zaXRpb24gPyBbJ3N0YXJ0JywgJ2VuZCddLm1hcCgocGFydCkgPT4gKFxuICAgICAgICAgICAgICAgICAgICAgIDxidXR0b25cbiAgICAgICAgICAgICAgICAgICAgICAgIHR5cGU9XCJidXR0b25cIlxuICAgICAgICAgICAgICAgICAgICAgICAga2V5PXtwYXJ0fVxuICAgICAgICAgICAgICAgICAgICAgICAgY2xhc3NOYW1lPXtgYWJvdXQtZWRpdG9yLXRpbWluZy1rZXkgaXMtd29ybGQke2lzU2VsZWN0ZWQgJiYgc2VsZWN0aW9uLmtleVBhcnQgPT09IGB0cmFuc2l0aW9uLSR7cGFydH1gID8gJyBpcy1zZWxlY3RlZCcgOiAnJ31gfVxuICAgICAgICAgICAgICAgICAgICAgICAgc3R5bGU9e3sgbGVmdDogZXh0ZW5kZWRMb2NhbFBvc2l0aW9uKHRyYW5zaXRpb25bcGFydF0pIH19XG4gICAgICAgICAgICAgICAgICAgICAgICB0aXRsZT17YFdvcmxkIHRyYW5zaXRpb24gJHtwYXJ0fWB9XG4gICAgICAgICAgICAgICAgICAgICAgICBhcmlhLWxhYmVsPXtgJHtzZWN0aW9uLmxhYmVsfSBXb3JsZCB0cmFuc2l0aW9uICR7cGFydH1gfVxuICAgICAgICAgICAgICAgICAgICAgICAgb25DbGljaz17KCkgPT4gc2VsZWN0QXQoeyB0eXBlOiAnd29ybGQnLCBrZXlQYXJ0OiBgdHJhbnNpdGlvbi0ke3BhcnR9YCB9LCB0cmFuc2l0aW9uW3BhcnRdKX1cbiAgICAgICAgICAgICAgICAgICAgICAvPlxuICAgICAgICAgICAgICAgICAgICApKSA6IG51bGx9XG4gICAgICAgICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgICAgICApO1xuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgIGlmIChsYW5lID09PSAndGV4dCcpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gKFxuICAgICAgICAgICAgICAgICAgPGRpdlxuICAgICAgICAgICAgICAgICAgICBjbGFzc05hbWU9e2BhYm91dC1lZGl0b3ItY2xpcCR7c2VjdGlvbi50ZXh0LmRpc2NpcGxpbmVSZXZlYWwgPyAnIGhhcy1leHRlbmRlZC1kaXNjaXBsaW5lJyA6ICcnfWB9XG4gICAgICAgICAgICAgICAgICAgIGtleT17c2VjdGlvbi5pZH1cbiAgICAgICAgICAgICAgICAgICAgc3R5bGU9e3sgd2lkdGggfX1cbiAgICAgICAgICAgICAgICAgICAgb25Qb2ludGVyRG93bj17YmVnaW5NYXJxdWVlfVxuICAgICAgICAgICAgICAgICAgICBvblBvaW50ZXJNb3ZlPXttb3ZlTWFycXVlZX1cbiAgICAgICAgICAgICAgICAgICAgb25Qb2ludGVyVXA9e2VuZE1hcnF1ZWV9XG4gICAgICAgICAgICAgICAgICAgIG9uUG9pbnRlckNhbmNlbD17ZW5kTWFycXVlZX1cbiAgICAgICAgICAgICAgICAgID5cbiAgICAgICAgICAgICAgICAgICAgeyhzZWN0aW9uLnRleHQuY3VlcyB8fCBbXSkubWFwKChjdWUpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgICBjb25zdCBpc1NlbGVjdGVkID0gc2VsZWN0ZWRDdWVNZW1iZXJzLnNvbWUoKG1lbWJlcikgPT4gbWVtYmVyLnNlY3Rpb25JZCA9PT0gc2VjdGlvbi5pZCAmJiBtZW1iZXIuY3VlSWQgPT09IGN1ZS5pZCk7XG4gICAgICAgICAgICAgICAgICAgICAgY29uc3QgaXNQcmltYXJ5ID0gc2VsZWN0aW9uLnR5cGUgPT09ICdjdWUnICYmIHNlbGVjdGlvbi5zZWN0aW9uSWQgPT09IHNlY3Rpb24uaWQgJiYgc2VsZWN0aW9uLmN1ZUlkID09PSBjdWUuaWQ7XG4gICAgICAgICAgICAgICAgICAgICAgY29uc3QgbW92ZW1lbnQgPSBnZXRBYm91dE5hcnJhdGl2ZUN1ZU1vdmVtZW50KGN1ZSk7XG4gICAgICAgICAgICAgICAgICAgICAgY29uc3QgdGltaW5nQm91bmRzID0gZ2V0QWJvdXROYXJyYXRpdmVDdWVUaW1pbmdCb3VuZHMoY3VlKTtcbiAgICAgICAgICAgICAgICAgICAgICBjb25zdCB0b2tlbiA9IGBjdWU6JHtzZWN0aW9uLmlkfToke2N1ZS5pZH1gO1xuICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IGN1ZVNlbGVjdGlvbiA9IHsgdHlwZTogJ2N1ZScsIHNlY3Rpb25JZDogc2VjdGlvbi5pZCwgY3VlSWQ6IGN1ZS5pZCwga2V5UGFydDogJ2ZvY3VzJyB9O1xuICAgICAgICAgICAgICAgICAgICAgIHJldHVybiAoXG4gICAgICAgICAgICAgICAgICAgICAgICA8YnV0dG9uXG4gICAgICAgICAgICAgICAgICAgICAgICAgIHR5cGU9XCJidXR0b25cIlxuICAgICAgICAgICAgICAgICAgICAgICAgICBjbGFzc05hbWU9e2BhYm91dC1lZGl0b3ItY3VlIGlzLSR7bW92ZW1lbnR9JHt0aW1pbmdCb3VuZHMubWluID09PSB0aW1pbmdCb3VuZHMubWF4ID8gJyBpcy1ib3VuZGFyeScgOiAnIGlzLWRyYWdnYWJsZSd9JHtpc1NlbGVjdGVkID8gJyBpcy1zZWxlY3RlZCcgOiAnJ30ke2lzUHJpbWFyeSA/ICcgaXMtcHJpbWFyeS1zZWxlY3Rpb24nIDogJyd9YH1cbiAgICAgICAgICAgICAgICAgICAgICAgICAga2V5PXtjdWUuaWR9XG4gICAgICAgICAgICAgICAgICAgICAgICAgIGRhdGEtc2VjdGlvbi1pZD17c2VjdGlvbi5pZH1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgZGF0YS1jdWUtaWQ9e2N1ZS5pZH1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgc3R5bGU9e3sgbGVmdDogdGV4dFBvc2l0aW9uKGN1ZS5ob2xkKSB9fVxuICAgICAgICAgICAgICAgICAgICAgICAgICBhcmlhLWxhYmVsPXtgJHttb3ZlbWVudCA9PT0gJ3ZlcnRpY2FsJyA/ICdWZXJ0aWNhbCcgOiAnU3BhdGlhbCd9IHRleHQgYXQgJHtNYXRoLnJvdW5kKGN1ZS5ob2xkICogMTAwKX0lIMK3ICR7Y3VlLnRleHR9YH1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgYXJpYS1wcmVzc2VkPXtpc1NlbGVjdGVkfVxuICAgICAgICAgICAgICAgICAgICAgICAgICB0aXRsZT17YCR7bW92ZW1lbnQgPT09ICd2ZXJ0aWNhbCcgPyAnVmVydGljYWwnIDogJ1NwYXRpYWwnfSB0aXRsZSDCtyBkcmFnIHRvIG1vdmUgaXQ7IGR1cmF0aW9uIHN0YXlzIGdsb2JhbCDCtyAke2N1ZS50ZXh0fWB9XG4gICAgICAgICAgICAgICAgICAgICAgICAgIG9uUG9pbnRlckRvd249eyhldmVudCkgPT4gYmVnaW5UaW1pbmdEcmFnKGV2ZW50LCB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdHlwZTogJ2N1ZScsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdG9rZW4sXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgbG9ja2VkOiB0aW1pbmdCb3VuZHMubWluID09PSB0aW1pbmdCb3VuZHMubWF4LFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIG1pbjogdGltaW5nQm91bmRzLm1pbixcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBtYXg6IHRpbWluZ0JvdW5kcy5tYXgsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgYXQ6IGN1ZS5ob2xkLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHNlY3Rpb25JbmRleCxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjdWVJZDogY3VlLmlkLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHNlY3Rpb25TdGFydFdVOiBzdGFydFdVLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHNwYW5XVSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0cmF2ZWxXVTogY29tcGlsZWQ/LnRyYXZlbFdVIHx8IHNwYW5XVSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBzdG9yeVdVOiBzdGFydFdVICsgKE51bWJlcihjdWUuaG9sZCkgKiAoY29tcGlsZWQ/LnRyYXZlbFdVIHx8IDApKSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBzZWxlY3Rpb246IGN1ZVNlbGVjdGlvbixcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb2FsZXNjZUtleTogYHRpbWVsaW5lOiR7dG9rZW59YCxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgfSl9XG4gICAgICAgICAgICAgICAgICAgICAgICAgIG9uUG9pbnRlck1vdmU9e21vdmVUaW1pbmdEcmFnfVxuICAgICAgICAgICAgICAgICAgICAgICAgICBvblBvaW50ZXJVcD17ZW5kVGltaW5nRHJhZ31cbiAgICAgICAgICAgICAgICAgICAgICAgICAgb25Qb2ludGVyQ2FuY2VsPXtlbmRUaW1pbmdEcmFnfVxuICAgICAgICAgICAgICAgICAgICAgICAgICBvbktleURvd249eyhldmVudCkgPT4ge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChldmVudC5zaGlmdEtleSAmJiBldmVudC5jb2RlID09PSAnU3BhY2UnKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICBldmVudC5wcmV2ZW50RGVmYXVsdCgpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgbmV4dFNlbGVjdGlvbiA9IHRvZ2dsZUFib3V0TmFycmF0aXZlQ3VlU2VsZWN0aW9uKHN0b3JlLmdldFNuYXBzaG90KCkuc2VsZWN0aW9uLCBjdWVTZWxlY3Rpb24pO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgc3RvcmUuc2V0U2VsZWN0aW9uKG5leHRTZWxlY3Rpb24pO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgc3RvcmUuc2V0VHJhbnNwb3J0KHsgb3duZXI6ICd0aW1lbGluZScsIHBsYXlpbmc6IGZhbHNlLCBzdG9yeVdVOiBzdGFydFdVICsgKE51bWJlcihjdWUuaG9sZCkgKiAoY29tcGlsZWQ/LnRyYXZlbFdVIHx8IDApKSB9KTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICAgIH19XG4gICAgICAgICAgICAgICAgICAgICAgICAgIG9uQ2xpY2s9eygpID0+IGhhbmRsZVRpbWluZ0NsaWNrKHRva2VuLCAoKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgc3RvcmUuc2V0VHJhbnNwb3J0KHsgb3duZXI6ICd0aW1lbGluZScsIHBsYXlpbmc6IGZhbHNlLCBzdG9yeVdVOiBzdGFydFdVICsgKE51bWJlcihjdWUuaG9sZCkgKiAoY29tcGlsZWQ/LnRyYXZlbFdVIHx8IDApKSB9KTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgfSl9XG4gICAgICAgICAgICAgICAgICAgICAgICAvPlxuICAgICAgICAgICAgICAgICAgICAgICk7XG4gICAgICAgICAgICAgICAgICAgIH0pfVxuICAgICAgICAgICAgICAgICAgICB7c2VjdGlvbi50ZXh0LmRpc2NpcGxpbmVSZXZlYWwgPyAoKCkgPT4ge1xuICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IHJldmVhbCA9IHNlY3Rpb24udGV4dC5kaXNjaXBsaW5lUmV2ZWFsO1xuICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IGR1cmF0aW9uID0gcmV2ZWFsLmVuZCAtIHJldmVhbC5zdGFydDtcbiAgICAgICAgICAgICAgICAgICAgICBjb25zdCBjZW50cmUgPSByZXZlYWwuc3RhcnQgKyAoZHVyYXRpb24gKiAwLjUpO1xuICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IGlzU2VsZWN0ZWQgPSBpblNlbGVjdGVkU2VjdGlvbiAmJiBzZWxlY3Rpb24udHlwZSA9PT0gJ2Rpc2NpcGxpbmUtcmV2ZWFsJztcbiAgICAgICAgICAgICAgICAgICAgICBjb25zdCB0b2tlbiA9IGBkaXNjaXBsaW5lLXJldmVhbDoke3NlY3Rpb24uaWR9OiR7cmV2ZWFsLmlkfWA7XG4gICAgICAgICAgICAgICAgICAgICAgY29uc3QgcmV2ZWFsU2VsZWN0aW9uID0geyB0eXBlOiAnZGlzY2lwbGluZS1yZXZlYWwnLCBzZWN0aW9uSWQ6IHNlY3Rpb24uaWQgfTtcbiAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gKFxuICAgICAgICAgICAgICAgICAgICAgICAgPGJ1dHRvblxuICAgICAgICAgICAgICAgICAgICAgICAgICB0eXBlPVwiYnV0dG9uXCJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgY2xhc3NOYW1lPXtgYWJvdXQtZWRpdG9yLWRpc2NpcGxpbmUtcmV2ZWFsIGlzLWRyYWdnYWJsZSR7aXNTZWxlY3RlZCA/ICcgaXMtc2VsZWN0ZWQnIDogJyd9YH1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgc3R5bGU9e3sgbGVmdDogZXh0ZW5kZWRMb2NhbFBvc2l0aW9uKHJldmVhbC5zdGFydCksIHdpZHRoOiBleHRlbmRlZExvY2FsV2lkdGgocmV2ZWFsLnN0YXJ0LCByZXZlYWwuZW5kKSB9fVxuICAgICAgICAgICAgICAgICAgICAgICAgICBhcmlhLWxhYmVsPXtgRGlzY2lwbGluZSByZXZlYWwgZnJvbSAke01hdGgucm91bmQocmV2ZWFsLnN0YXJ0ICogMTAwKX0lIHRvICR7TWF0aC5yb3VuZChyZXZlYWwuZW5kICogMTAwKX0lYH1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgYXJpYS1wcmVzc2VkPXtpc1NlbGVjdGVkfVxuICAgICAgICAgICAgICAgICAgICAgICAgICB0aXRsZT1cIkRpc2NpcGxpbmUgcmV2ZWFsIMK3IGRyYWcgdGhlIGNvbXBsZXRlIGNsaXAgdG8gcmV0aW1lXCJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgb25Qb2ludGVyRG93bj17KGV2ZW50KSA9PiBiZWdpblRpbWluZ0RyYWcoZXZlbnQsIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0eXBlOiAnZGlzY2lwbGluZS1yZXZlYWwnLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRva2VuLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGxvY2tlZDogZmFsc2UsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgbWluOiBkdXJhdGlvbiAqIDAuNSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBtYXg6IERJU0NJUExJTkVfUkVWRUFMX01BWCAtIChkdXJhdGlvbiAqIDAuNSksXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgYXQ6IGNlbnRyZSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBzZWN0aW9uSW5kZXgsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgc2VjdGlvblN0YXJ0V1U6IHN0YXJ0V1UsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgc3BhbldVLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRyYXZlbFdVOiBjb21waWxlZD8udHJhdmVsV1UgfHwgc3BhbldVLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHN0b3J5V1U6IHN0YXJ0V1UgKyAoY2VudHJlICogKGNvbXBpbGVkPy50cmF2ZWxXVSB8fCAwKSksXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgc2VsZWN0aW9uOiByZXZlYWxTZWxlY3Rpb24sXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY29hbGVzY2VLZXk6IGB0aW1lbGluZToke3Rva2VufWAsXG4gICAgICAgICAgICAgICAgICAgICAgICAgIH0pfVxuICAgICAgICAgICAgICAgICAgICAgICAgICBvblBvaW50ZXJNb3ZlPXttb3ZlVGltaW5nRHJhZ31cbiAgICAgICAgICAgICAgICAgICAgICAgICAgb25Qb2ludGVyVXA9e2VuZFRpbWluZ0RyYWd9XG4gICAgICAgICAgICAgICAgICAgICAgICAgIG9uUG9pbnRlckNhbmNlbD17ZW5kVGltaW5nRHJhZ31cbiAgICAgICAgICAgICAgICAgICAgICAgICAgb25DbGljaz17KCkgPT4gaGFuZGxlVGltaW5nQ2xpY2sodG9rZW4sICgpID0+IHNlbGVjdEF0KHsgdHlwZTogJ2Rpc2NpcGxpbmUtcmV2ZWFsJyB9LCByZXZlYWwuc3RhcnQpKX1cbiAgICAgICAgICAgICAgICAgICAgICAgID5EaXNjaXBsaW5lIHJldmVhbDwvYnV0dG9uPlxuICAgICAgICAgICAgICAgICAgICAgICk7XG4gICAgICAgICAgICAgICAgICAgIH0pKCkgOiBudWxsfVxuICAgICAgICAgICAgICAgICAgICB7KHNlY3Rpb24udGV4dC5ibG9ja3MgfHwgW10pLmxlbmd0aCA/IChcbiAgICAgICAgICAgICAgICAgICAgICA8YnV0dG9uIHR5cGU9XCJidXR0b25cIiBjbGFzc05hbWU9e2BhYm91dC1lZGl0b3ItZWRpdG9yaWFsLWNsaXAke2luU2VsZWN0ZWRTZWN0aW9uICYmIHNlbGVjdGlvbi50eXBlID09PSAnc2VjdGlvbicgPyAnIGlzLXNlbGVjdGVkJyA6ICcnfWB9IG9uQ2xpY2s9eygpID0+IHNlbGVjdEF0KHsgdHlwZTogJ3NlY3Rpb24nIH0pfT5cbiAgICAgICAgICAgICAgICAgICAgICAgIFZlcnRpY2FsIMK3IHtzZWN0aW9uLnRleHQuYmxvY2tzLmxlbmd0aH0gYmxvY2tzXG4gICAgICAgICAgICAgICAgICAgICAgPC9idXR0b24+XG4gICAgICAgICAgICAgICAgICAgICkgOiBudWxsfVxuICAgICAgICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgICAgICAgKTtcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICBjb25zdCBpc1NlbGVjdGVkID0gaW5TZWxlY3RlZFNlY3Rpb24gJiYgc2VsZWN0aW9uLnR5cGUgPT09ICdpbnRlcmFjdGlvbic7XG4gICAgICAgICAgICAgIGNvbnN0IGFjdGl2YXRpb24gPSBzZWN0aW9uLmludGVyYWN0aW9uPy50eXBlICE9PSAnbm9uZScgPyBzZWN0aW9uLmludGVyYWN0aW9uLmFjdGl2YXRpb25TdGFydCA6IG51bGw7XG4gICAgICAgICAgICAgIHJldHVybiAoXG4gICAgICAgICAgICAgICAgPGRpdiBjbGFzc05hbWU9e2BhYm91dC1lZGl0b3ItY2xpcCR7aXNTZWxlY3RlZCA/ICcgaXMtc2VsZWN0ZWQnIDogJyd9YH0ga2V5PXtzZWN0aW9uLmlkfSBzdHlsZT17eyB3aWR0aCB9fT5cbiAgICAgICAgICAgICAgICAgIDxidXR0b25cbiAgICAgICAgICAgICAgICAgICAgdHlwZT1cImJ1dHRvblwiXG4gICAgICAgICAgICAgICAgICAgIGNsYXNzTmFtZT17YGFib3V0LWVkaXRvci1pbnRlcmFjdGlvbi1jbGlwICR7c2VjdGlvbi5pbnRlcmFjdGlvbj8udHlwZSAhPT0gJ25vbmUnID8gJ2hhcy1pbnRlcmFjdGlvbicgOiAnJ30ke2lzU2VsZWN0ZWQgPyAnIGlzLXNlbGVjdGVkJyA6ICcnfWB9XG4gICAgICAgICAgICAgICAgICAgIGFyaWEtcHJlc3NlZD17aXNTZWxlY3RlZH1cbiAgICAgICAgICAgICAgICAgICAgb25DbGljaz17KCkgPT4gc2VsZWN0QXQoeyB0eXBlOiAnaW50ZXJhY3Rpb24nIH0sIGFjdGl2YXRpb24gfHwgMCl9XG4gICAgICAgICAgICAgICAgICA+e3NlY3Rpb24uaW50ZXJhY3Rpb24/LnR5cGUgIT09ICdub25lJyA/IHNlY3Rpb24uaW50ZXJhY3Rpb24udHlwZSA6ICcnfTwvYnV0dG9uPlxuICAgICAgICAgICAgICAgICAge051bWJlci5pc0Zpbml0ZShhY3RpdmF0aW9uKSA/IChcbiAgICAgICAgICAgICAgICAgICAgPGJ1dHRvblxuICAgICAgICAgICAgICAgICAgICAgIHR5cGU9XCJidXR0b25cIlxuICAgICAgICAgICAgICAgICAgICAgIGNsYXNzTmFtZT17YGFib3V0LWVkaXRvci10aW1pbmcta2V5IGlzLWludGVyYWN0aW9uJHtpc1NlbGVjdGVkICYmIHNlbGVjdGlvbi5rZXlQYXJ0ID09PSAnYWN0aXZhdGlvbicgPyAnIGlzLXNlbGVjdGVkJyA6ICcnfWB9XG4gICAgICAgICAgICAgICAgICAgICAgc3R5bGU9e3sgbGVmdDogbG9jYWxQb3NpdGlvbihhY3RpdmF0aW9uKSB9fVxuICAgICAgICAgICAgICAgICAgICAgIHRpdGxlPVwiSW50ZXJhY3Rpb24gYWN0aXZhdGlvblwiXG4gICAgICAgICAgICAgICAgICAgICAgYXJpYS1sYWJlbD17YCR7c2VjdGlvbi5sYWJlbH0gaW50ZXJhY3Rpb24gYWN0aXZhdGlvbiBrZXlmcmFtZWB9XG4gICAgICAgICAgICAgICAgICAgICAgb25DbGljaz17KCkgPT4gc2VsZWN0QXQoeyB0eXBlOiAnaW50ZXJhY3Rpb24nLCBrZXlQYXJ0OiAnYWN0aXZhdGlvbicgfSwgYWN0aXZhdGlvbil9XG4gICAgICAgICAgICAgICAgICAgIC8+XG4gICAgICAgICAgICAgICAgICApIDogbnVsbH1cbiAgICAgICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgICAgKTtcbiAgICAgICAgICAgIH0pfVxuICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICkpfVxuICAgICAgICA8L2Rpdj5cbiAgICAgIDwvZGl2PlxuICAgIDwvZGl2PlxuICApO1xufVxuXG5mdW5jdGlvbiBTZXF1ZW5jZUluc3BlY3Rvcih7IHN0b3JlLCBzbmFwc2hvdCB9KSB7XG4gIGNvbnN0IGNvbW1pdEdsb2JhbCA9IChncm91cCwga2V5LCB2YWx1ZSkgPT4gc3RvcmUuY29tbWl0KGBDaGFuZ2UgJHtrZXl9YCwgKGRyYWZ0KSA9PiB7XG4gICAgaWYgKGdyb3VwID09PSAnc2VxdWVuY2UnKSBkcmFmdC5nbG9iYWxzW2tleV0gPSB2YWx1ZTtcbiAgICBlbHNlIHtcbiAgICAgIGNvbnN0IHRhcmdldEtleSA9IGdyb3VwID09PSAnbWF0ZXJpYWwnID8gJ3BvaW50TWF0ZXJpYWwnIDogZ3JvdXA7XG4gICAgICBkcmFmdC5nbG9iYWxzW3RhcmdldEtleV1ba2V5XSA9IHZhbHVlO1xuICAgIH1cbiAgfSwgeyBjb2FsZXNjZUtleTogYGdsb2JhbDoke2dyb3VwfToke2tleX1gIH0pO1xuICByZXR1cm4gKFxuICAgIDw+XG4gICAgICA8aGVhZGVyPjxzcGFuPlNlcXVlbmNlPC9zcGFuPjxzdHJvbmc+R2xvYmFsIGNvbnRyb2xzPC9zdHJvbmc+PC9oZWFkZXI+XG4gICAgICB7QUJPVVRfTkFSUkFUSVZFX0dMT0JBTF9DT05UUk9MUy5tYXAoKGdyb3VwKSA9PiAoXG4gICAgICAgIDxkZXRhaWxzIG9wZW4ga2V5PXtncm91cC5pZH0+XG4gICAgICAgICAgPHN1bW1hcnk+e2dyb3VwLmxhYmVsfTwvc3VtbWFyeT5cbiAgICAgICAgICB7Z3JvdXAuaWQgPT09ICd0ZXh0TW90aW9uJyA/IDxwIGNsYXNzTmFtZT1cImFib3V0LWVkaXRvci1oZWxwXCI+RXZlcnkgdGl0bGUgZm9sbG93cyB0aGlzIHBhdGggY29udGludW91c2x5LiBOZWdhdGl2ZSBZIGlzIGhpZ2hlciwgcG9zaXRpdmUgWSBpcyBsb3dlci4gVGhlIG9wZW5lciBzdGFydHMgc2hhcnAgYXQgaXRzIG93biBZIHBvc2l0aW9uOyBDbGVhciBmcm9tIGFuZCBDbGVhciB1bnRpbCBzZXQgdGhlIHNoYXJwIHdpbmRvdyBmb3IgbGF0ZXIgdGl0bGVzLjwvcD4gOiBudWxsfVxuICAgICAgICAgIHtncm91cC5pZCA9PT0gJ3N3YXJtVHVyYnVsZW5jZScgPyA8cCBjbGFzc05hbWU9XCJhYm91dC1lZGl0b3ItaGVscFwiPk9uZSBhbWJpZW50IG1vdGlvbiBwcm9maWxlIGRyaXZlcyBib3RoIHRoZSBjbHVzdGVyIGFuZCB0dXJidWxlbnQgZmllbGQuIEVhY2ggV29ybGQgb25seSBzY2FsZXMgaXRzIHN0cmVuZ3RoLCBzbyB0aGUgbW90aW9uIHN0YXlzIGNvbnRpbnVvdXMgd2hpbGUgU2hhcGVzIGNoYW5nZS48L3A+IDogbnVsbH1cbiAgICAgICAgICB7Z3JvdXAuY29udHJvbHMubWFwKChjb250cm9sKSA9PiB7XG4gICAgICAgICAgICBjb25zdCB0YXJnZXQgPSBncm91cC5pZCA9PT0gJ3NlcXVlbmNlJ1xuICAgICAgICAgICAgICA/IHNuYXBzaG90LmRvY3VtZW50Lmdsb2JhbHNcbiAgICAgICAgICAgICAgOiBzbmFwc2hvdC5kb2N1bWVudC5nbG9iYWxzW2dyb3VwLmlkID09PSAnbWF0ZXJpYWwnID8gJ3BvaW50TWF0ZXJpYWwnIDogZ3JvdXAuaWRdO1xuICAgICAgICAgICAgcmV0dXJuIChcbiAgICAgICAgICAgICAgPE51bWJlclByb3BlcnR5XG4gICAgICAgICAgICAgICAga2V5PXtjb250cm9sLmlkfVxuICAgICAgICAgICAgICAgIGxhYmVsPXtjb250cm9sLmxhYmVsfVxuICAgICAgICAgICAgICAgIHZhbHVlPXt0YXJnZXRbY29udHJvbC5pZF19XG4gICAgICAgICAgICAgICAgbWluPXtjb250cm9sLm1pbn1cbiAgICAgICAgICAgICAgICBtYXg9e2NvbnRyb2wubWF4fVxuICAgICAgICAgICAgICAgIHN0ZXA9e2NvbnRyb2wuc3RlcH1cbiAgICAgICAgICAgICAgICB1bml0PXtjb250cm9sLnVuaXR9XG4gICAgICAgICAgICAgICAgb25DaGFuZ2U9eyh2YWx1ZSkgPT4gY29tbWl0R2xvYmFsKGdyb3VwLmlkLCBjb250cm9sLmlkLCB2YWx1ZSl9XG4gICAgICAgICAgICAgIC8+XG4gICAgICAgICAgICApO1xuICAgICAgICAgIH0pfVxuICAgICAgICA8L2RldGFpbHM+XG4gICAgICApKX1cbiAgICA8Lz5cbiAgKTtcbn1cblxuZnVuY3Rpb24gU2VjdGlvbkluc3BlY3Rvcih7IHN0b3JlLCBzbmFwc2hvdCwgc2VjdGlvbiB9KSB7XG4gIGNvbnN0IHNlY3Rpb25JbmRleCA9IGdldFNlY3Rpb25JbmRleChzbmFwc2hvdC5kb2N1bWVudCwgc2VjdGlvbi5pZCk7XG4gIGNvbnN0IGNvbXBpbGVkU2VjdGlvbiA9IHNuYXBzaG90LmNvbXBpbGVkUGxhbj8uc2VjdGlvbnM/LltzZWN0aW9uSW5kZXhdO1xuICBjb25zdCBhY3RpdmVFeHRlbnRGaWVsZCA9IHNuYXBzaG90LnByZXZpZXdQcm9maWxlID09PSAnbW9iaWxlJyA/ICdtb2JpbGVFeHRlbnRXVScgOiAnZXh0ZW50V1UnO1xuICBjb25zdCBhY3RpdmVFeHRlbnQgPSBOdW1iZXIoc2VjdGlvblthY3RpdmVFeHRlbnRGaWVsZF0pO1xuICBjb25zdCByZXNvbHZlZEV4dGVudCA9IE51bWJlcihjb21waWxlZFNlY3Rpb24/LnJlc29sdmVkRXh0ZW50V1UgPz8gYWN0aXZlRXh0ZW50KTtcbiAgY29uc3QgY29udGVudE1pbmltdW1BY3RpdmUgPSByZXNvbHZlZEV4dGVudCA+IGFjdGl2ZUV4dGVudCArIDAuMDAxO1xuICBjb25zdCBiYXNlbGluZVNlY3Rpb24gPSBzbmFwc2hvdC5iYXNlbGluZURvY3VtZW50LnNlY3Rpb25zLmZpbmQoKGl0ZW0pID0+IGl0ZW0uaWQgPT09IHNlY3Rpb24uaWQpO1xuICBjb25zdCB1cGRhdGUgPSAobGFiZWwsIG11dGF0ZSwgY29hbGVzY2VLZXkgPSBudWxsKSA9PiBzdG9yZS5jb21taXQobGFiZWwsIChkcmFmdCkgPT4ge1xuICAgIG11dGF0ZShkcmFmdC5zZWN0aW9uc1tzZWN0aW9uSW5kZXhdKTtcbiAgfSwgeyBjb2FsZXNjZUtleSwgc2VsZWN0aW9uOiBzbmFwc2hvdC5zZWxlY3Rpb24gfSk7XG4gIGNvbnN0IG1vdmUgPSAoZGlyZWN0aW9uKSA9PiBzdG9yZS5jb21taXQoJ1Jlb3JkZXIgU2VjdGlvbicsIChkcmFmdCkgPT4ge1xuICAgIGNvbnN0IHRvSW5kZXggPSBzZWN0aW9uSW5kZXggKyBkaXJlY3Rpb247XG4gICAgaWYgKHRvSW5kZXggPCAwIHx8IHRvSW5kZXggPj0gZHJhZnQuc2VjdGlvbnMubGVuZ3RoKSByZXR1cm47XG4gICAgY29uc3QgW21vdmVkXSA9IGRyYWZ0LnNlY3Rpb25zLnNwbGljZShzZWN0aW9uSW5kZXgsIDEpO1xuICAgIGRyYWZ0LnNlY3Rpb25zLnNwbGljZSh0b0luZGV4LCAwLCBtb3ZlZCk7XG4gICAgcmVwbGFjZURyYWZ0RG9jdW1lbnQoZHJhZnQsIHN0aXRjaEFib3V0TmFycmF0aXZlQ2FtZXJhQm91bmRhcmllcyhkcmFmdCkpO1xuICB9LCB7IHNlbGVjdGlvbjogeyB0eXBlOiAnc2VjdGlvbicsIHNlY3Rpb25JZDogc2VjdGlvbi5pZCB9IH0pO1xuICBjb25zdCBkdXBsaWNhdGUgPSAoKSA9PiB7XG4gICAgY29uc3QgcmVzdWx0ID0gZHVwbGljYXRlQWJvdXROYXJyYXRpdmVTZWN0aW9uKHsgZG9jdW1lbnQ6IHNuYXBzaG90LmRvY3VtZW50LCBzZWN0aW9uSWQ6IHNlY3Rpb24uaWQgfSk7XG4gICAgaWYgKCFyZXN1bHQudmFsaWQpIHtcbiAgICAgIHN0b3JlLnNldFNhdmVTdGF0ZSh7IG1lc3NhZ2U6IHJlc3VsdC5yZWFzb24gfHwgJ1RoaXMgU2VjdGlvbiBjYW5ub3QgYmUgZHVwbGljYXRlZC4nIH0pO1xuICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICBzdG9yZS5jb21taXQoJ0R1cGxpY2F0ZSBTZWN0aW9uJywgKGRyYWZ0KSA9PiByZXBsYWNlRHJhZnREb2N1bWVudChkcmFmdCwgcmVzdWx0LmRvY3VtZW50KSwge1xuICAgICAgc2VsZWN0aW9uOiByZXN1bHQuc2VsZWN0aW9uLFxuICAgIH0pO1xuICB9O1xuXG4gIHJldHVybiAoXG4gICAgPD5cbiAgICAgIDxoZWFkZXI+PHNwYW4+U2VjdGlvbiB7U3RyaW5nKHNlY3Rpb25JbmRleCArIDEpLnBhZFN0YXJ0KDIsICcwJyl9PC9zcGFuPjxzdHJvbmc+e3NlY3Rpb24ubGFiZWx9PC9zdHJvbmc+PC9oZWFkZXI+XG4gICAgICB7c2VjdGlvbi5sb2NrZWQgPyA8ZGl2IGNsYXNzTmFtZT1cImFib3V0LWVkaXRvci1sb2NrXCI+PExvY2tLZXlob2xlIGFyaWEtaGlkZGVuPVwidHJ1ZVwiIC8+PHNwYW4+VGhpcyBwcm90ZWN0ZWQgU2VjdGlvbiBjYW5ub3QgYmUgcmVvcmRlcmVkIG9yIGhhdmUgaXRzIFdvcmxkIHJlcGxhY2VkIGFjY2lkZW50YWxseS48L3NwYW4+PGJ1dHRvbiB0eXBlPVwiYnV0dG9uXCIgb25DbGljaz17KCkgPT4gdXBkYXRlKCdVbmxvY2sgcHJvdGVjdGVkIFNlY3Rpb24nLCAoZHJhZnQpID0+IHsgZHJhZnQubG9ja2VkID0gZmFsc2U7IH0pfT5VbmxvY2sgYWR2YW5jZWQ8L2J1dHRvbj48L2Rpdj4gOiBudWxsfVxuICAgICAgPGRpdiBjbGFzc05hbWU9XCJhYm91dC1lZGl0b3ItaW5saW5lLWFjdGlvbnNcIj5cbiAgICAgICAgPGJ1dHRvbiB0eXBlPVwiYnV0dG9uXCIgZGlzYWJsZWQ9e3NlY3Rpb24ubG9ja2VkIHx8IHNlY3Rpb25JbmRleCA9PT0gMH0gb25DbGljaz17KCkgPT4gbW92ZSgtMSl9Pk1vdmUgZWFybGllcjwvYnV0dG9uPlxuICAgICAgICA8YnV0dG9uIHR5cGU9XCJidXR0b25cIiBkaXNhYmxlZD17c2VjdGlvbi5sb2NrZWQgfHwgc2VjdGlvbkluZGV4ID09PSBzbmFwc2hvdC5kb2N1bWVudC5zZWN0aW9ucy5sZW5ndGggLSAxfSBvbkNsaWNrPXsoKSA9PiBtb3ZlKDEpfT5Nb3ZlIGxhdGVyPC9idXR0b24+XG4gICAgICAgIDxidXR0b24gdHlwZT1cImJ1dHRvblwiIGRpc2FibGVkPXtzZWN0aW9uLmxvY2tlZCB8fCBzZWN0aW9uLnR5cGUgPT09ICdmaW5hbGUnfSBvbkNsaWNrPXtkdXBsaWNhdGV9PkR1cGxpY2F0ZTwvYnV0dG9uPlxuICAgICAgPC9kaXY+XG4gICAgICA8UHJvcGVydHkgbGFiZWw9XCJTZWN0aW9uIG5hbWVcIj48aW5wdXQgdmFsdWU9e3NlY3Rpb24ubGFiZWx9IG9uQ2hhbmdlPXsoZXZlbnQpID0+IHVwZGF0ZSgnUmVuYW1lIFNlY3Rpb24nLCAoZHJhZnQpID0+IHsgZHJhZnQubGFiZWwgPSBldmVudC50YXJnZXQudmFsdWU7IH0sIGBzZWN0aW9uOiR7c2VjdGlvbi5pZH06bGFiZWxgKX0gLz48L1Byb3BlcnR5PlxuICAgICAgPFByb3BlcnR5IGxhYmVsPVwiU3RhYmxlIElEXCI+PGlucHV0IHZhbHVlPXtzZWN0aW9uLmlkfSByZWFkT25seSAvPjxzbWFsbD5SZWZlcmVuY2VzIHRoaXMgU2VjdGlvbiB3aXRob3V0IHR5aW5nIGl0IHRvIGl0cyBjdXJyZW50IG1lYW5pbmcuPC9zbWFsbD48L1Byb3BlcnR5PlxuICAgICAgPFByb3BlcnR5IGxhYmVsPVwiVHlwZVwiPlxuICAgICAgICA8c2VsZWN0IHZhbHVlPXtzZWN0aW9uLnR5cGV9IGRpc2FibGVkPXtzZWN0aW9uLnR5cGUgPT09ICdmaW5hbGUnfSBvbkNoYW5nZT17KGV2ZW50KSA9PiB1cGRhdGUoJ0NoYW5nZSBTZWN0aW9uIHR5cGUnLCAoZHJhZnQpID0+IHsgZHJhZnQudHlwZSA9IGV2ZW50LnRhcmdldC52YWx1ZTsgfSl9PlxuICAgICAgICAgIDxvcHRpb24gdmFsdWU9XCJzcGF0aWFsXCI+U3BhdGlhbDwvb3B0aW9uPjxvcHRpb24gdmFsdWU9XCJlZGl0b3JpYWxcIj5FZGl0b3JpYWw8L29wdGlvbj48b3B0aW9uIHZhbHVlPVwiZmluYWxlXCI+RmluYWxlPC9vcHRpb24+XG4gICAgICAgIDwvc2VsZWN0PlxuICAgICAgPC9Qcm9wZXJ0eT5cbiAgICAgIDxkZXRhaWxzIG9wZW4+XG4gICAgICAgIDxzdW1tYXJ5PlNlY3Rpb24gdGltaW5nPC9zdW1tYXJ5PlxuICAgICAgICA8UHJvcGVydHkgbGFiZWw9XCJTY3JvbGwgdHJhdmVsXCI+PG91dHB1dCBjbGFzc05hbWU9XCJhYm91dC1lZGl0b3ItcmVhZG91dFwiPntmb3JtYXRXVShNYXRoLm1heCgwLCBhY3RpdmVFeHRlbnQgLSAxKSl9PC9vdXRwdXQ+PC9Qcm9wZXJ0eT5cbiAgICAgICAgPFByb3BlcnR5IGxhYmVsPVwiVG90YWwgaGVpZ2h0XCI+PG91dHB1dCBjbGFzc05hbWU9XCJhYm91dC1lZGl0b3ItcmVhZG91dFwiPntmb3JtYXRXVShhY3RpdmVFeHRlbnQpfTwvb3V0cHV0PjwvUHJvcGVydHk+XG4gICAgICAgIDxOdW1iZXJQcm9wZXJ0eSBsYWJlbD1cIkRlc2t0b3AgbGVuZ3RoXCIgdmFsdWU9e3NlY3Rpb24uZXh0ZW50V1V9IG1pbj17MX0gbWF4PXs4fSBzdGVwPXswLjA1fSB1bml0PVwiV1VcIiBvbkNoYW5nZT17KHZhbHVlKSA9PiB1cGRhdGUoJ0NoYW5nZSBkZXNrdG9wIFNlY3Rpb24gbGVuZ3RoJywgKGRyYWZ0KSA9PiB7IGRyYWZ0LmV4dGVudFdVID0gdmFsdWU7IH0sIGBzZWN0aW9uOiR7c2VjdGlvbi5pZH06ZXh0ZW50YCl9IC8+XG4gICAgICAgIDxOdW1iZXJQcm9wZXJ0eSBsYWJlbD1cIk1vYmlsZSBsZW5ndGhcIiB2YWx1ZT17c2VjdGlvbi5tb2JpbGVFeHRlbnRXVX0gbWluPXsxfSBtYXg9ezh9IHN0ZXA9ezAuMDV9IHVuaXQ9XCJXVVwiIG9uQ2hhbmdlPXsodmFsdWUpID0+IHVwZGF0ZSgnQ2hhbmdlIG1vYmlsZSBTZWN0aW9uIGxlbmd0aCcsIChkcmFmdCkgPT4geyBkcmFmdC5tb2JpbGVFeHRlbnRXVSA9IHZhbHVlOyB9LCBgc2VjdGlvbjoke3NlY3Rpb24uaWR9Om1vYmlsZWApfSAvPlxuICAgICAgICA8UHJvcGVydHkgbGFiZWw9XCJSZXNvbHZlZCBoZWlnaHRcIj48b3V0cHV0IGNsYXNzTmFtZT1cImFib3V0LWVkaXRvci1yZWFkb3V0XCI+e2Zvcm1hdFdVKHJlc29sdmVkRXh0ZW50KX08L291dHB1dD48L1Byb3BlcnR5PlxuICAgICAgICB7Y29udGVudE1pbmltdW1BY3RpdmUgPyA8cCBjbGFzc05hbWU9XCJhYm91dC1lZGl0b3ItdGltaW5nLXdhcm5pbmdcIj5Db250ZW50IG1pbmltdW0gaW4gZWZmZWN0LiBUaGUgcmVuZGVyZWQgY29weSBuZWVkcyB7Zm9ybWF0V1UocmVzb2x2ZWRFeHRlbnQpfSBpbiB0aGlzIHByb2ZpbGUuPC9wPiA6IG51bGx9XG4gICAgICAgIDxidXR0b25cbiAgICAgICAgICB0eXBlPVwiYnV0dG9uXCJcbiAgICAgICAgICBjbGFzc05hbWU9XCJhYm91dC1lZGl0b3Itd2lkZS1hY3Rpb25cIlxuICAgICAgICAgIGRpc2FibGVkPXshYmFzZWxpbmVTZWN0aW9uIHx8IGJhc2VsaW5lU2VjdGlvblthY3RpdmVFeHRlbnRGaWVsZF0gPT09IHNlY3Rpb25bYWN0aXZlRXh0ZW50RmllbGRdfVxuICAgICAgICAgIG9uQ2xpY2s9eygpID0+IHVwZGF0ZSgnUmVzdG9yZSBzYXZlZCBTZWN0aW9uIGxlbmd0aCcsIChkcmFmdCkgPT4geyBkcmFmdFthY3RpdmVFeHRlbnRGaWVsZF0gPSBiYXNlbGluZVNlY3Rpb25bYWN0aXZlRXh0ZW50RmllbGRdOyB9KX1cbiAgICAgICAgPlJlc2V0IHtzbmFwc2hvdC5wcmV2aWV3UHJvZmlsZSA9PT0gJ21vYmlsZScgPyAnbW9iaWxlJyA6ICdkZXNrdG9wJ30gbGVuZ3RoPC9idXR0b24+XG4gICAgICA8L2RldGFpbHM+XG4gICAgICB7c2VjdGlvbi50eXBlID09PSAnZWRpdG9yaWFsJyA/IDxFZGl0b3JpYWxCbG9ja3Mgc3RvcmU9e3N0b3JlfSBzbmFwc2hvdD17c25hcHNob3R9IHNlY3Rpb249e3NlY3Rpb259IC8+IDogbnVsbH1cbiAgICAgIHtzZWN0aW9uLnR5cGUgIT09ICdlZGl0b3JpYWwnID8gKFxuICAgICAgICA8YnV0dG9uXG4gICAgICAgICAgdHlwZT1cImJ1dHRvblwiXG4gICAgICAgICAgY2xhc3NOYW1lPVwiYWJvdXQtZWRpdG9yLXdpZGUtYWN0aW9uXCJcbiAgICAgICAgICBvbkNsaWNrPXsoKSA9PiB7XG4gICAgICAgICAgICBjb25zdCBsb2NhbCA9IGdldExvY2FsUHJvZ3Jlc3Moc25hcHNob3QuY29tcGlsZWRQbGFuLCBzZWN0aW9uLCBzbmFwc2hvdC50cmFuc3BvcnQuc3RvcnlXVSk7XG4gICAgICAgICAgICBjb25zdCBpZCA9IG5leHRJZChzbmFwc2hvdC5kb2N1bWVudCwgYCR7c2VjdGlvbi5pZH0tc3RhdGVtZW50YCk7XG4gICAgICAgICAgICBjb25zdCBmb2N1cyA9IE1hdGgubWluKDAuOTIsIE1hdGgubWF4KDAuMDgsIHNuYXBBYm91dE5hcnJhdGl2ZVRpbWVsaW5lVmFsdWUobG9jYWwpKSk7XG4gICAgICAgICAgICB1cGRhdGUoJ0FkZCB0ZXh0IEN1ZScsIChkcmFmdCkgPT4ge1xuICAgICAgICAgICAgICBkcmFmdC50ZXh0LmN1ZXMgfHw9IFtdO1xuICAgICAgICAgICAgICBkcmFmdC50ZXh0LmN1ZXMucHVzaCh7IGlkLCB0ZXh0OiAnTmV3IHRyYXZlbGxpbmcgc3RhdGVtZW50JywgZW50ZXI6IGZvY3VzIC0gMC4wOCwgaG9sZDogZm9jdXMsIGV4aXQ6IGZvY3VzICsgMC4wOCwgcHJlc2V0OiAndHJhdmVsbGluZy10aXRsZS12MScsIG1vdGlvbjogeyBtb2RlOiAnc3BhdGlhbCcgfSB9KTtcbiAgICAgICAgICAgICAgZHJhZnQudGV4dC5jdWVzLnNvcnQoKGEsIGIpID0+IGEuaG9sZCAtIGIuaG9sZCk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIHN0b3JlLnNldFNlbGVjdGlvbih7IHR5cGU6ICdjdWUnLCBzZWN0aW9uSWQ6IHNlY3Rpb24uaWQsIGN1ZUlkOiBpZCwga2V5UGFydDogJ2ZvY3VzJyB9KTtcbiAgICAgICAgICB9fVxuICAgICAgICA+QWRkIHRleHQgY3VlIGF0IHBsYXloZWFkPC9idXR0b24+XG4gICAgICApIDogbnVsbH1cbiAgICA8Lz5cbiAgKTtcbn1cblxuZnVuY3Rpb24gRWRpdG9yaWFsQmxvY2tzKHsgc3RvcmUsIHNuYXBzaG90LCBzZWN0aW9uIH0pIHtcbiAgY29uc3Qgc2VjdGlvbkluZGV4ID0gZ2V0U2VjdGlvbkluZGV4KHNuYXBzaG90LmRvY3VtZW50LCBzZWN0aW9uLmlkKTtcbiAgY29uc3QgdXBkYXRlQmxvY2sgPSAoYmxvY2tJbmRleCwgZmllbGQsIHZhbHVlKSA9PiBzdG9yZS5jb21taXQoJ0VkaXQgZWRpdG9yaWFsIGNvcHknLCAoZHJhZnQpID0+IHtcbiAgICBkcmFmdC5zZWN0aW9uc1tzZWN0aW9uSW5kZXhdLnRleHQuYmxvY2tzW2Jsb2NrSW5kZXhdW2ZpZWxkXSA9IHZhbHVlO1xuICB9LCB7IGNvYWxlc2NlS2V5OiBgYmxvY2s6JHtzZWN0aW9uLmlkfToke2Jsb2NrSW5kZXh9OiR7ZmllbGR9YCwgc2VsZWN0aW9uOiBzbmFwc2hvdC5zZWxlY3Rpb24gfSk7XG4gIGNvbnN0IHVwZGF0ZUVtcGhhc2lzID0gKGJsb2NrSW5kZXgsIGVtcGhhc2lzSW5kZXgsIGZpZWxkLCB2YWx1ZSkgPT4gc3RvcmUuY29tbWl0KCdFZGl0IGVkaXRvcmlhbCBoaWdobGlnaHQnLCAoZHJhZnQpID0+IHtcbiAgICBkcmFmdC5zZWN0aW9uc1tzZWN0aW9uSW5kZXhdLnRleHQuYmxvY2tzW2Jsb2NrSW5kZXhdLmVtcGhhc2lzW2VtcGhhc2lzSW5kZXhdW2ZpZWxkXSA9IHZhbHVlO1xuICB9LCB7IGNvYWxlc2NlS2V5OiBgYmxvY2s6JHtzZWN0aW9uLmlkfToke2Jsb2NrSW5kZXh9OmVtcGhhc2lzOiR7ZW1waGFzaXNJbmRleH06JHtmaWVsZH1gLCBzZWxlY3Rpb246IHNuYXBzaG90LnNlbGVjdGlvbiB9KTtcbiAgY29uc3QgYWRkRW1waGFzaXMgPSAoYmxvY2tJbmRleCkgPT4gc3RvcmUuY29tbWl0KCdBZGQgZWRpdG9yaWFsIGhpZ2hsaWdodCcsIChkcmFmdCkgPT4ge1xuICAgIGNvbnN0IGJsb2NrID0gZHJhZnQuc2VjdGlvbnNbc2VjdGlvbkluZGV4XS50ZXh0LmJsb2Nrc1tibG9ja0luZGV4XTtcbiAgICBibG9jay5lbXBoYXNpcyB8fD0gW107XG4gICAgYmxvY2suZW1waGFzaXMucHVzaCh7IHRleHQ6IGJsb2NrLnRleHQudHJpbSgpLnNwbGl0KC9cXHMrLykuc2xpY2UoMCwgMikuam9pbignICcpLCB0b25lOiAnYmx1ZScgfSk7XG4gIH0sIHsgc2VsZWN0aW9uOiBzbmFwc2hvdC5zZWxlY3Rpb24gfSk7XG4gIGNvbnN0IHJlbW92ZUVtcGhhc2lzID0gKGJsb2NrSW5kZXgsIGVtcGhhc2lzSW5kZXgpID0+IHN0b3JlLmNvbW1pdCgnUmVtb3ZlIGVkaXRvcmlhbCBoaWdobGlnaHQnLCAoZHJhZnQpID0+IHtcbiAgICBkcmFmdC5zZWN0aW9uc1tzZWN0aW9uSW5kZXhdLnRleHQuYmxvY2tzW2Jsb2NrSW5kZXhdLmVtcGhhc2lzLnNwbGljZShlbXBoYXNpc0luZGV4LCAxKTtcbiAgfSwgeyBzZWxlY3Rpb246IHNuYXBzaG90LnNlbGVjdGlvbiB9KTtcbiAgcmV0dXJuIChcbiAgICA8ZGV0YWlscyBvcGVuPlxuICAgICAgPHN1bW1hcnk+RWRpdG9yaWFsIGNvbnRlbnQ8L3N1bW1hcnk+XG4gICAgICB7KHNlY3Rpb24udGV4dC5ibG9ja3MgfHwgW10pLm1hcCgoYmxvY2ssIGJsb2NrSW5kZXgpID0+IChcbiAgICAgICAgPGRpdiBjbGFzc05hbWU9XCJhYm91dC1lZGl0b3ItYmxvY2tcIiBrZXk9e2Jsb2NrLmlkfT5cbiAgICAgICAgICA8ZGl2Pjxjb2RlPntibG9jay5raW5kfTwvY29kZT48c3Bhbj57YmxvY2suaWR9PC9zcGFuPjwvZGl2PlxuICAgICAgICAgIHtibG9jay5sYWJlbCAhPSBudWxsID8gPFByb3BlcnR5IGxhYmVsPVwiTGFiZWxcIj48aW5wdXQgdmFsdWU9e2Jsb2NrLmxhYmVsfSBvbkNoYW5nZT17KGV2ZW50KSA9PiB1cGRhdGVCbG9jayhibG9ja0luZGV4LCAnbGFiZWwnLCBldmVudC50YXJnZXQudmFsdWUpfSAvPjwvUHJvcGVydHk+IDogbnVsbH1cbiAgICAgICAgICB7YmxvY2sudGV4dCAhPSBudWxsID8gPFByb3BlcnR5IGxhYmVsPVwiQ29weVwiPjx0ZXh0YXJlYSByb3dzPVwiNVwiIHZhbHVlPXtibG9jay50ZXh0fSBvbkNoYW5nZT17KGV2ZW50KSA9PiB1cGRhdGVCbG9jayhibG9ja0luZGV4LCAndGV4dCcsIGV2ZW50LnRhcmdldC52YWx1ZSl9IC8+PC9Qcm9wZXJ0eT4gOiBudWxsfVxuICAgICAgICAgIHtibG9jay5raW5kID09PSAncHJvc2UnID8gPFByb3BlcnR5IGxhYmVsPVwiUmVjb25uZWN0IHBvaW50IGdyaWRcIj48aW5wdXQgdHlwZT1cImNoZWNrYm94XCIgY2hlY2tlZD17YmxvY2sud29ybGRJbmZsdWVuY2UgPT09IHRydWV9IG9uQ2hhbmdlPXsoZXZlbnQpID0+IHVwZGF0ZUJsb2NrKGJsb2NrSW5kZXgsICd3b3JsZEluZmx1ZW5jZScsIGV2ZW50LnRhcmdldC5jaGVja2VkKX0gLz48L1Byb3BlcnR5PiA6IG51bGx9XG4gICAgICAgICAge2Jsb2NrLnRleHQgIT0gbnVsbCA/IChcbiAgICAgICAgICAgIDxkaXYgY2xhc3NOYW1lPVwiYWJvdXQtZWRpdG9yLWVtcGhhc2lzLWNvbnRyb2xzXCI+XG4gICAgICAgICAgICAgIDxzcGFuPkhpZ2hsaWdodGVkIHdvcmRzPC9zcGFuPlxuICAgICAgICAgICAgICB7KGJsb2NrLmVtcGhhc2lzIHx8IFtdKS5tYXAoKGl0ZW0sIGVtcGhhc2lzSW5kZXgpID0+IChcbiAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cImFib3V0LWVkaXRvci1lbXBoYXNpcy1yb3dcIiBrZXk9e2Ake2Jsb2NrLmlkfS1lbXBoYXNpcy0ke2VtcGhhc2lzSW5kZXh9YH0+XG4gICAgICAgICAgICAgICAgICA8aW5wdXQgYXJpYS1sYWJlbD1cIkhpZ2hsaWdodGVkIHBocmFzZVwiIHZhbHVlPXtpdGVtLnRleHR9IG9uQ2hhbmdlPXsoZXZlbnQpID0+IHVwZGF0ZUVtcGhhc2lzKGJsb2NrSW5kZXgsIGVtcGhhc2lzSW5kZXgsICd0ZXh0JywgZXZlbnQudGFyZ2V0LnZhbHVlKX0gLz5cbiAgICAgICAgICAgICAgICAgIDxzZWxlY3QgYXJpYS1sYWJlbD1cIkhpZ2hsaWdodCBjb2xvdXJcIiB2YWx1ZT17aXRlbS50b25lfSBvbkNoYW5nZT17KGV2ZW50KSA9PiB1cGRhdGVFbXBoYXNpcyhibG9ja0luZGV4LCBlbXBoYXNpc0luZGV4LCAndG9uZScsIGV2ZW50LnRhcmdldC52YWx1ZSl9PlxuICAgICAgICAgICAgICAgICAgICB7QUJPVVRfTkFSUkFUSVZFX0VNUEhBU0lTX1RPTkVTLm1hcCgodG9uZSkgPT4gPG9wdGlvbiB2YWx1ZT17dG9uZX0ga2V5PXt0b25lfT57dG9uZX08L29wdGlvbj4pfVxuICAgICAgICAgICAgICAgICAgPC9zZWxlY3Q+XG4gICAgICAgICAgICAgICAgICA8YnV0dG9uIHR5cGU9XCJidXR0b25cIiBhcmlhLWxhYmVsPXtgUmVtb3ZlICR7aXRlbS50ZXh0IHx8ICdlbXB0eSd9IGhpZ2hsaWdodGB9IG9uQ2xpY2s9eygpID0+IHJlbW92ZUVtcGhhc2lzKGJsb2NrSW5kZXgsIGVtcGhhc2lzSW5kZXgpfT7DlzwvYnV0dG9uPlxuICAgICAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgICApKX1cbiAgICAgICAgICAgICAgPGJ1dHRvbiB0eXBlPVwiYnV0dG9uXCIgb25DbGljaz17KCkgPT4gYWRkRW1waGFzaXMoYmxvY2tJbmRleCl9PkFkZCBoaWdobGlnaHQ8L2J1dHRvbj5cbiAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICkgOiBudWxsfVxuICAgICAgICAgIHtibG9jay5pdGVtcyA/IDxQcm9wZXJ0eSBsYWJlbD1cIkl0ZW1zXCI+PHRleHRhcmVhIHJvd3M9XCI2XCIgdmFsdWU9e2Jsb2NrLml0ZW1zLmpvaW4oJ1xcbicpfSBvbkNoYW5nZT17KGV2ZW50KSA9PiB1cGRhdGVCbG9jayhibG9ja0luZGV4LCAnaXRlbXMnLCBldmVudC50YXJnZXQudmFsdWUuc3BsaXQoJ1xcbicpLmZpbHRlcihCb29sZWFuKSl9IC8+PC9Qcm9wZXJ0eT4gOiBudWxsfVxuICAgICAgICA8L2Rpdj5cbiAgICAgICkpfVxuICAgICAgPGJ1dHRvbiB0eXBlPVwiYnV0dG9uXCIgY2xhc3NOYW1lPVwiYWJvdXQtZWRpdG9yLXdpZGUtYWN0aW9uXCIgb25DbGljaz17KCkgPT4gc3RvcmUuY29tbWl0KCdBZGQgZWRpdG9yaWFsIGJsb2NrJywgKGRyYWZ0KSA9PiB7XG4gICAgICAgIGRyYWZ0LnNlY3Rpb25zW3NlY3Rpb25JbmRleF0udGV4dC5ibG9ja3MucHVzaCh7IGlkOiBuZXh0SWQoZHJhZnQsIGAke3NlY3Rpb24uaWR9LXByb3NlYCksIGtpbmQ6ICdwcm9zZScsIHRleHQ6ICdOZXcgZWRpdG9yaWFsIHBhcmFncmFwaC4nIH0pO1xuICAgICAgfSl9PkFkZCBwcm9zZSBibG9jazwvYnV0dG9uPlxuICAgIDwvZGV0YWlscz5cbiAgKTtcbn1cblxuZnVuY3Rpb24gQ3VlUmh5dGhtQW5kUmV1c2UoeyBzdG9yZSwgc25hcHNob3QsIGNsaXBib2FyZCwgc2V0Q2xpcGJvYXJkIH0pIHtcbiAgY29uc3QgbWVtYmVycyA9IGdldEFib3V0TmFycmF0aXZlU2VsZWN0aW9uTWVtYmVycyhzbmFwc2hvdC5zZWxlY3Rpb24pO1xuICBjb25zdCBbZ2FwV1UsIHNldEdhcFdVXSA9IHVzZVN0YXRlKDAuMzUpO1xuICBjb25zdCBbYW5jaG9yLCBzZXRBbmNob3JdID0gdXNlU3RhdGUoJ3ByaW1hcnknKTtcbiAgY29uc3QgW3ByZXZpZXcsIHNldFByZXZpZXddID0gdXNlU3RhdGUobnVsbCk7XG4gIGNvbnN0IFttZXNzYWdlLCBzZXRNZXNzYWdlXSA9IHVzZVN0YXRlKCcnKTtcblxuICBjb25zdCBwcmV2aWV3TW92ZXMgPSAobGFiZWwsIHJlc3VsdCkgPT4ge1xuICAgIGlmICghcmVzdWx0LnZhbGlkKSB7XG4gICAgICBpZiAoc25hcHNob3QudHJ5U3RhdGUpIHN0b3JlLmNhbmNlbFRyeSgpO1xuICAgICAgc2V0UHJldmlldyhyZXN1bHQpO1xuICAgICAgc2V0TWVzc2FnZShyZXN1bHQucmVhc29uIHx8ICdUaGlzIGFycmFuZ2VtZW50IGRvZXMgbm90IGZpdCB0aGUgc2VsZWN0ZWQgU2VjdGlvbnMuJyk7XG4gICAgICByZXR1cm47XG4gICAgfVxuICAgIGlmIChzbmFwc2hvdC50cnlTdGF0ZSkgc3RvcmUuY2FuY2VsVHJ5KCk7XG4gICAgc3RvcmUuYmVnaW5UcnkobGFiZWwsIChkcmFmdCkgPT4gYXBwbHlDdWVNb3ZlcyhkcmFmdCwgcmVzdWx0Lm1vdmVzKSk7XG4gICAgc2V0UHJldmlldyh7IC4uLnJlc3VsdCwgbGFiZWwgfSk7XG4gICAgc2V0TWVzc2FnZSgnJyk7XG4gIH07XG4gIGNvbnN0IGNhbmNlbFByZXZpZXcgPSAoKSA9PiB7XG4gICAgaWYgKHNuYXBzaG90LnRyeVN0YXRlKSBzdG9yZS5jYW5jZWxUcnkoKTtcbiAgICBzZXRQcmV2aWV3KG51bGwpO1xuICAgIHNldE1lc3NhZ2UoJycpO1xuICB9O1xuICBjb25zdCBhcHBseVByZXZpZXcgPSAoKSA9PiB7XG4gICAgaWYgKCFwcmV2aWV3Py52YWxpZCB8fCAhc25hcHNob3QudHJ5U3RhdGUpIHJldHVybjtcbiAgICBzdG9yZS5hcHBseVRyeSgpO1xuICAgIHNldFByZXZpZXcobnVsbCk7XG4gICAgc2V0TWVzc2FnZSgnJyk7XG4gIH07XG4gIGNvbnN0IGNvbW1pdENhbmRpZGF0ZSA9IChsYWJlbCwgcmVzdWx0KSA9PiB7XG4gICAgaWYgKCFyZXN1bHQ/LnZhbGlkIHx8ICFyZXN1bHQuZG9jdW1lbnQpIHtcbiAgICAgIHNldE1lc3NhZ2UocmVzdWx0Py5yZWFzb24gfHwgJ1RoaXMgb3BlcmF0aW9uIGNvdWxkIG5vdCBiZSBjb21wbGV0ZWQgc2FmZWx5LicpO1xuICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICBzdG9yZS5jb21taXQobGFiZWwsIChkcmFmdCkgPT4gcmVwbGFjZURyYWZ0RG9jdW1lbnQoZHJhZnQsIHJlc3VsdC5kb2N1bWVudCksIHtcbiAgICAgIHNlbGVjdGlvbjogcmVzdWx0LnNlbGVjdGlvbiB8fCBzbmFwc2hvdC5zZWxlY3Rpb24sXG4gICAgfSk7XG4gICAgc2V0TWVzc2FnZSgnJyk7XG4gIH07XG5cbiAgY29uc3QgZGlzdHJpYnV0ZSA9ICgpID0+IHByZXZpZXdNb3ZlcygnRGlzdHJpYnV0ZSB0aXRsZSByaHl0aG0nLCByZXNvbHZlQWJvdXROYXJyYXRpdmVDdWVEaXN0cmlidXRpb24oe1xuICAgIGRvY3VtZW50OiBzbmFwc2hvdC5kb2N1bWVudCxcbiAgICBwbGFuOiBzbmFwc2hvdC5jb21waWxlZFBsYW4sXG4gICAgbWVtYmVycyxcbiAgICBwcmltYXJ5OiBzbmFwc2hvdC5zZWxlY3Rpb24sXG4gIH0pKTtcbiAgY29uc3QgZXhhY3RHYXAgPSAoKSA9PiBwcmV2aWV3TW92ZXMoJ1NldCBleGFjdCB0aXRsZSBnYXAnLCByZXNvbHZlQWJvdXROYXJyYXRpdmVDdWVFeGFjdEdhcCh7XG4gICAgZG9jdW1lbnQ6IHNuYXBzaG90LmRvY3VtZW50LFxuICAgIHBsYW46IHNuYXBzaG90LmNvbXBpbGVkUGxhbixcbiAgICBtZW1iZXJzLFxuICAgIHByaW1hcnk6IHNuYXBzaG90LnNlbGVjdGlvbixcbiAgICBnYXBXVSxcbiAgICBhbmNob3IsXG4gIH0pKTtcbiAgY29uc3QgYWxpZ25QcmltYXJ5ID0gKCkgPT4gcHJldmlld01vdmVzKCdBbGlnbiB0aXRsZXMgdG8gcGxheWhlYWQnLCByZXNvbHZlQWJvdXROYXJyYXRpdmVDdWVHcm91cEFsaWduKHtcbiAgICBkb2N1bWVudDogc25hcHNob3QuZG9jdW1lbnQsXG4gICAgcGxhbjogc25hcHNob3QuY29tcGlsZWRQbGFuLFxuICAgIG1lbWJlcnMsXG4gICAgcHJpbWFyeTogc25hcHNob3Quc2VsZWN0aW9uLFxuICAgIHBsYXloZWFkV1U6IHNuYXBzaG90LnRyYW5zcG9ydC5zdG9yeVdVLFxuICB9KSk7XG4gIGNvbnN0IGR1cGxpY2F0ZSA9ICgpID0+IGNvbW1pdENhbmRpZGF0ZSgnRHVwbGljYXRlIHRpdGxlIEN1ZXMnLCBkdXBsaWNhdGVBYm91dE5hcnJhdGl2ZUN1ZUdyb3VwKHtcbiAgICBkb2N1bWVudDogc25hcHNob3QuZG9jdW1lbnQsXG4gICAgbWVtYmVycyxcbiAgICBwcmltYXJ5OiBzbmFwc2hvdC5zZWxlY3Rpb24sXG4gIH0pKTtcbiAgY29uc3QgY29weSA9ICgpID0+IHtcbiAgICBjb25zdCByZXN1bHQgPSBjcmVhdGVBYm91dE5hcnJhdGl2ZUN1ZUNsaXBib2FyZFBheWxvYWQoe1xuICAgICAgZG9jdW1lbnQ6IHNuYXBzaG90LmRvY3VtZW50LFxuICAgICAgcGxhbjogc25hcHNob3QuY29tcGlsZWRQbGFuLFxuICAgICAgbWVtYmVycyxcbiAgICAgIHByaW1hcnk6IHNuYXBzaG90LnNlbGVjdGlvbixcbiAgICB9KTtcbiAgICBjb25zdCBwYXlsb2FkID0gcmVzdWx0Py5wYXlsb2FkIHx8IHJlc3VsdDtcbiAgICBjb25zdCB2YWxpZGF0aW9uID0gdmFsaWRhdGVBYm91dE5hcnJhdGl2ZUN1ZUNsaXBib2FyZFBheWxvYWQocGF5bG9hZCk7XG4gICAgaWYgKHJlc3VsdD8udmFsaWQgPT09IGZhbHNlIHx8IHZhbGlkYXRpb24/LnZhbGlkID09PSBmYWxzZSkge1xuICAgICAgc2V0TWVzc2FnZShyZXN1bHQ/LnJlYXNvbiB8fCB2YWxpZGF0aW9uPy5yZWFzb24gfHwgJ1RoZXNlIHRpdGxlcyBjYW5ub3QgYmUgY29waWVkLicpO1xuICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICBzZXRDbGlwYm9hcmQocGF5bG9hZCk7XG4gICAgc2V0TWVzc2FnZShgJHttZW1iZXJzLmxlbmd0aH0gdGl0bGUke21lbWJlcnMubGVuZ3RoID09PSAxID8gJycgOiAncyd9IGNvcGllZCBmb3IgdGhpcyBlZGl0b3Igc2Vzc2lvbi5gKTtcbiAgfTtcbiAgY29uc3QgcGFzdGUgPSAoKSA9PiBjb21taXRDYW5kaWRhdGUoJ1Bhc3RlIHRpdGxlIEN1ZXMnLCByZXNvbHZlQWJvdXROYXJyYXRpdmVDdWVHcm91cFBhc3RlKHtcbiAgICBkb2N1bWVudDogc25hcHNob3QuZG9jdW1lbnQsXG4gICAgcGxhbjogc25hcHNob3QuY29tcGlsZWRQbGFuLFxuICAgIHBheWxvYWQ6IGNsaXBib2FyZCxcbiAgICBkZXN0aW5hdGlvblNlY3Rpb25JZDogc25hcHNob3Quc2VsZWN0aW9uLnNlY3Rpb25JZCxcbiAgICBwbGF5aGVhZFdVOiBzbmFwc2hvdC50cmFuc3BvcnQuc3RvcnlXVSxcbiAgfSkpO1xuXG4gIGNvbnN0IGdob3N0TW92ZXMgPSBwcmV2aWV3Py52YWxpZCA/IHByZXZpZXcubW92ZXMgOiBbXTtcbiAgY29uc3QgbWF4V1UgPSBNYXRoLm1heCgwLjAwMSwgc25hcHNob3QuY29tcGlsZWRQbGFuPy5tYXhTdG9yeVdVIHx8IDEpO1xuICByZXR1cm4gKFxuICAgIDxkZXRhaWxzIGNsYXNzTmFtZT1cImFib3V0LWVkaXRvci1yaHl0aG1cIiBvcGVuPXttZW1iZXJzLmxlbmd0aCA+IDF9PlxuICAgICAgPHN1bW1hcnk+Umh5dGhtIGFuZCByZXVzZTwvc3VtbWFyeT5cbiAgICAgIHttZW1iZXJzLmxlbmd0aCA+IDEgPyAoXG4gICAgICAgIDw+XG4gICAgICAgICAgPGRpdiBjbGFzc05hbWU9XCJhYm91dC1lZGl0b3Itcmh5dGhtLWFjdGlvbnNcIj5cbiAgICAgICAgICAgIDxidXR0b24gdHlwZT1cImJ1dHRvblwiIG9uQ2xpY2s9e2Rpc3RyaWJ1dGV9PkRpc3RyaWJ1dGUgZXZlbmx5PC9idXR0b24+XG4gICAgICAgICAgICA8YnV0dG9uIHR5cGU9XCJidXR0b25cIiBvbkNsaWNrPXthbGlnblByaW1hcnl9PkFsaWduIHByaW1hcnkgdG8gcGxheWhlYWQ8L2J1dHRvbj5cbiAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cImFib3V0LWVkaXRvci1yaHl0aG0tZ2FwXCI+XG4gICAgICAgICAgICA8UHJvcGVydHkgbGFiZWw9XCJFeGFjdCBnYXBcIj48aW5wdXQgdHlwZT1cIm51bWJlclwiIG1pbj1cIjBcIiBtYXg9XCI4XCIgc3RlcD1cIjAuMDVcIiB2YWx1ZT17Z2FwV1V9IG9uQ2hhbmdlPXsoZXZlbnQpID0+IHNldEdhcFdVKE1hdGgubWF4KDAsIE51bWJlcihldmVudC50YXJnZXQudmFsdWUpIHx8IDApKX0gLz48L1Byb3BlcnR5PlxuICAgICAgICAgICAgPFByb3BlcnR5IGxhYmVsPVwiQW5jaG9yXCI+PHNlbGVjdCB2YWx1ZT17YW5jaG9yfSBvbkNoYW5nZT17KGV2ZW50KSA9PiBzZXRBbmNob3IoZXZlbnQudGFyZ2V0LnZhbHVlKX0+PG9wdGlvbiB2YWx1ZT1cInByaW1hcnlcIj5QcmltYXJ5PC9vcHRpb24+PG9wdGlvbiB2YWx1ZT1cImZpcnN0XCI+Rmlyc3Q8L29wdGlvbj48b3B0aW9uIHZhbHVlPVwibGFzdFwiPkxhc3Q8L29wdGlvbj48L3NlbGVjdD48L1Byb3BlcnR5PlxuICAgICAgICAgICAgPGJ1dHRvbiB0eXBlPVwiYnV0dG9uXCIgb25DbGljaz17ZXhhY3RHYXB9PlByZXZpZXcgZXhhY3QgZ2FwPC9idXR0b24+XG4gICAgICAgICAgPC9kaXY+XG4gICAgICAgIDwvPlxuICAgICAgKSA6IG51bGx9XG4gICAgICB7Z2hvc3RNb3Zlcy5sZW5ndGggPyAoXG4gICAgICAgIDxkaXYgY2xhc3NOYW1lPVwiYWJvdXQtZWRpdG9yLXJoeXRobS1wcmV2aWV3XCIgYXJpYS1sYWJlbD1cIlByb3Bvc2VkIHRpdGxlIHJoeXRobVwiPlxuICAgICAgICAgIHtnaG9zdE1vdmVzLm1hcCgobW92ZSkgPT4ge1xuICAgICAgICAgICAgY29uc3QgY29tcGlsZWQgPSBzbmFwc2hvdC5jb21waWxlZFBsYW4uc2VjdGlvbnMuZmluZCgoaXRlbSkgPT4gaXRlbS5pZCA9PT0gbW92ZS5zZWN0aW9uSWQpO1xuICAgICAgICAgICAgY29uc3Qgc3RvcnlXVSA9IE51bWJlcihjb21waWxlZD8uc3RhcnRXVSB8fCAwKSArIChtb3ZlLmhvbGQgKiBOdW1iZXIoY29tcGlsZWQ/LnRyYXZlbFdVIHx8IDApKTtcbiAgICAgICAgICAgIHJldHVybiA8aSBrZXk9e2Ake21vdmUuc2VjdGlvbklkfToke21vdmUuY3VlSWR9YH0gc3R5bGU9e3sgbGVmdDogYCR7KHN0b3J5V1UgLyBtYXhXVSkgKiAxMDB9JWAgfX0gdGl0bGU9e2Ake21vdmUuY3VlSWR9IMK3ICR7Zm9ybWF0V1Uoc3RvcnlXVSl9YH0gLz47XG4gICAgICAgICAgfSl9XG4gICAgICAgIDwvZGl2PlxuICAgICAgKSA6IG51bGx9XG4gICAgICB7bWVzc2FnZSA/IDxwIGNsYXNzTmFtZT17YGFib3V0LWVkaXRvci1yaHl0aG0tbWVzc2FnZSR7cHJldmlldyAmJiAhcHJldmlldy52YWxpZCA/ICcgaXMtZXJyb3InIDogJyd9YH0+e21lc3NhZ2V9PC9wPiA6IG51bGx9XG4gICAgICB7cHJldmlldz8udmFsaWQgJiYgc25hcHNob3QudHJ5U3RhdGUgPyA8ZGl2IGNsYXNzTmFtZT1cImFib3V0LWVkaXRvci10cnlcIj48c3Bhbj5QcmV2aWV3aW5nIHtwcmV2aWV3LmxhYmVsfTwvc3Bhbj48YnV0dG9uIHR5cGU9XCJidXR0b25cIiBvbkNsaWNrPXtjYW5jZWxQcmV2aWV3fT5DYW5jZWw8L2J1dHRvbj48YnV0dG9uIHR5cGU9XCJidXR0b25cIiBjbGFzc05hbWU9XCJpcy1wcmltYXJ5XCIgb25DbGljaz17YXBwbHlQcmV2aWV3fT5BcHBseTwvYnV0dG9uPjwvZGl2PiA6IG51bGx9XG4gICAgICA8ZGl2IGNsYXNzTmFtZT1cImFib3V0LWVkaXRvci1yaHl0aG0tYWN0aW9uc1wiPlxuICAgICAgICA8YnV0dG9uIHR5cGU9XCJidXR0b25cIiBvbkNsaWNrPXtkdXBsaWNhdGV9PkR1cGxpY2F0ZSB7bWVtYmVycy5sZW5ndGggPiAxID8gJ3NlbGVjdGlvbicgOiAndGl0bGUnfTwvYnV0dG9uPlxuICAgICAgICA8YnV0dG9uIHR5cGU9XCJidXR0b25cIiBvbkNsaWNrPXtjb3B5fT5Db3B5PC9idXR0b24+XG4gICAgICAgIDxidXR0b24gdHlwZT1cImJ1dHRvblwiIGRpc2FibGVkPXshY2xpcGJvYXJkfSBvbkNsaWNrPXtwYXN0ZX0+UGFzdGUgYXQgcGxheWhlYWQ8L2J1dHRvbj5cbiAgICAgIDwvZGl2PlxuICAgIDwvZGV0YWlscz5cbiAgKTtcbn1cblxuZnVuY3Rpb24gQ3VlSW5zcGVjdG9yKHsgc3RvcmUsIHNuYXBzaG90LCBzZWN0aW9uLCBjbGlwYm9hcmQsIHNldENsaXBib2FyZCB9KSB7XG4gIGNvbnN0IHNlbGVjdGVkTWVtYmVycyA9IGdldEFib3V0TmFycmF0aXZlU2VsZWN0aW9uTWVtYmVycyhzbmFwc2hvdC5zZWxlY3Rpb24pO1xuICBjb25zdCBzZWN0aW9uSW5kZXggPSBnZXRTZWN0aW9uSW5kZXgoc25hcHNob3QuZG9jdW1lbnQsIHNlY3Rpb24uaWQpO1xuICBjb25zdCBjdWVJbmRleCA9IHNlY3Rpb24udGV4dC5jdWVzLmZpbmRJbmRleCgoY3VlKSA9PiBjdWUuaWQgPT09IHNuYXBzaG90LnNlbGVjdGlvbi5jdWVJZCk7XG4gIGNvbnN0IGN1ZSA9IHNlY3Rpb24udGV4dC5jdWVzW2N1ZUluZGV4XTtcbiAgaWYgKCFjdWUpIHJldHVybiA8U2VjdGlvbkluc3BlY3RvciBzdG9yZT17c3RvcmV9IHNuYXBzaG90PXtzbmFwc2hvdH0gc2VjdGlvbj17c2VjdGlvbn0gLz47XG4gIGNvbnN0IHVwZGF0ZSA9IChmaWVsZCwgdmFsdWUpID0+IHN0b3JlLmNvbW1pdChgRWRpdCBDdWUgJHtmaWVsZH1gLCAoZHJhZnQpID0+IHtcbiAgICBkcmFmdC5zZWN0aW9uc1tzZWN0aW9uSW5kZXhdLnRleHQuY3Vlc1tjdWVJbmRleF1bZmllbGRdID0gdmFsdWU7XG4gIH0sIHsgY29hbGVzY2VLZXk6IGBjdWU6JHtjdWUuaWR9OiR7ZmllbGR9YCwgc2VsZWN0aW9uOiBzbmFwc2hvdC5zZWxlY3Rpb24gfSk7XG4gIGNvbnN0IHJlbW92ZSA9ICgpID0+IHN0b3JlLmNvbW1pdCgnRGVsZXRlIHRleHQgQ3VlJywgKGRyYWZ0KSA9PiB7XG4gICAgZHJhZnQuc2VjdGlvbnNbc2VjdGlvbkluZGV4XS50ZXh0LmN1ZXMuc3BsaWNlKGN1ZUluZGV4LCAxKTtcbiAgfSwgeyBzZWxlY3Rpb246IHsgdHlwZTogJ3NlY3Rpb24nLCBzZWN0aW9uSWQ6IHNlY3Rpb24uaWQgfSB9KTtcbiAgY29uc3QgdGltaW5nQm91bmRzID0gZ2V0QWJvdXROYXJyYXRpdmVDdWVUaW1pbmdCb3VuZHMoY3VlKTtcbiAgY29uc3QgbW90aW9uSW50ZXJ2YWwgPSBnZXRBYm91dE5hcnJhdGl2ZUN1ZU1vdGlvbkludGVydmFsKGN1ZSwgc25hcHNob3QuZG9jdW1lbnQuZ2xvYmFscy50ZXh0TW90aW9uKTtcbiAgY29uc3QgbW92ZW1lbnQgPSBnZXRBYm91dE5hcnJhdGl2ZUN1ZU1vdmVtZW50KGN1ZSk7XG4gIGNvbnN0IG1vdmVDdWUgPSAocGVyY2VudCkgPT4gc3RvcmUuY29tbWl0KCdNb3ZlIHRleHQgQ3VlJywgKGRyYWZ0KSA9PiB7XG4gICAgY29uc3QgdGFyZ2V0ID0gZHJhZnQuc2VjdGlvbnNbc2VjdGlvbkluZGV4XS50ZXh0LmN1ZXNbY3VlSW5kZXhdO1xuICAgIE9iamVjdC5hc3NpZ24odGFyZ2V0LCBtb3ZlQWJvdXROYXJyYXRpdmVDdWVUaW1pbmcodGFyZ2V0LCBwZXJjZW50IC8gMTAwKSk7XG4gIH0sIHsgY29hbGVzY2VLZXk6IGBjdWU6JHtjdWUuaWR9OnRpbWluZ2AsIHNlbGVjdGlvbjogeyAuLi5zbmFwc2hvdC5zZWxlY3Rpb24sIGtleVBhcnQ6ICdmb2N1cycgfSB9KTtcbiAgY29uc3QgdXBkYXRlTW92ZW1lbnQgPSAobW9kZSkgPT4gc3RvcmUuY29tbWl0KCdDaGFuZ2UgdGV4dCBtb3ZlbWVudCcsIChkcmFmdCkgPT4ge1xuICAgIGNvbnN0IHRhcmdldCA9IGRyYWZ0LnNlY3Rpb25zW3NlY3Rpb25JbmRleF0udGV4dC5jdWVzW2N1ZUluZGV4XTtcbiAgICB0YXJnZXQubW90aW9uID0geyAuLi50YXJnZXQubW90aW9uLCBtb2RlIH07XG4gIH0sIHsgc2VsZWN0aW9uOiBzbmFwc2hvdC5zZWxlY3Rpb24gfSk7XG4gIHJldHVybiAoXG4gICAgPD5cbiAgICAgIDxoZWFkZXI+PHNwYW4+VGV4dCBDdWU8L3NwYW4+PHN0cm9uZz57Y3VlLmlkfTwvc3Ryb25nPjwvaGVhZGVyPlxuICAgICAge3NlbGVjdGVkTWVtYmVycy5sZW5ndGggPiAxID8gKFxuICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cImFib3V0LWVkaXRvci1ncm91cC1zdW1tYXJ5XCI+XG4gICAgICAgICAgPHN0cm9uZz57c2VsZWN0ZWRNZW1iZXJzLmxlbmd0aH0gdGl0bGVzIHNlbGVjdGVkPC9zdHJvbmc+XG4gICAgICAgICAgPG9sPntzZWxlY3RlZE1lbWJlcnMubWFwKChtZW1iZXIpID0+IHtcbiAgICAgICAgICAgIGNvbnN0IG1lbWJlclNlY3Rpb24gPSBzbmFwc2hvdC5kb2N1bWVudC5zZWN0aW9ucy5maW5kKChpdGVtKSA9PiBpdGVtLmlkID09PSBtZW1iZXIuc2VjdGlvbklkKTtcbiAgICAgICAgICAgIGNvbnN0IG1lbWJlckN1ZSA9IG1lbWJlclNlY3Rpb24/LnRleHQ/LmN1ZXM/LmZpbmQoKGl0ZW0pID0+IGl0ZW0uaWQgPT09IG1lbWJlci5jdWVJZCk7XG4gICAgICAgICAgICByZXR1cm4gPGxpIGtleT17YCR7bWVtYmVyLnNlY3Rpb25JZH06JHttZW1iZXIuY3VlSWR9YH0+PHNwYW4+e21lbWJlclNlY3Rpb24/LmxhYmVsfTwvc3Bhbj57bWVtYmVyQ3VlPy50ZXh0fTwvbGk+O1xuICAgICAgICAgIH0pfTwvb2w+XG4gICAgICAgICAgPGJ1dHRvbiB0eXBlPVwiYnV0dG9uXCIgb25DbGljaz17KCkgPT4gc3RvcmUuc2V0U2VsZWN0aW9uKHsgdHlwZTogJ2N1ZScsIHNlY3Rpb25JZDogc2VjdGlvbi5pZCwgY3VlSWQ6IGN1ZS5pZCwga2V5UGFydDogJ2ZvY3VzJyB9KX0+S2VlcCBwcmltYXJ5IG9ubHk8L2J1dHRvbj5cbiAgICAgICAgPC9kaXY+XG4gICAgICApIDogbnVsbH1cbiAgICAgIDxwIGNsYXNzTmFtZT1cImFib3V0LWVkaXRvci1oZWxwXCI+RHJhZyB0aGUgcGluayB0aW1pbmcgbWFya2VyIGFueXdoZXJlIGZyb20gMOKAkzEwMCUgb2YgaXRzIFNlY3Rpb24uIFRoaXMgbW92ZXMgdGhlIHRpdGxlJ3MgZm9jdXMgdGltZSBvbmx5LiBJdHMgdHJhdmVsIGR1cmF0aW9uLCBzcGVlZCwgYmx1ciwgYW5kIGluL291dCBjYWRlbmNlIHJlbWFpbiBjb250cm9sbGVkIGdsb2JhbGx5IHVuZGVyIFNwYXRpYWwgdGl0bGVzLjwvcD5cbiAgICAgIDxQcm9wZXJ0eSBsYWJlbD1cIlN0YXRlbWVudFwiPjx0ZXh0YXJlYSByb3dzPVwiN1wiIHZhbHVlPXtjdWUudGV4dH0gb25DaGFuZ2U9eyhldmVudCkgPT4gdXBkYXRlKCd0ZXh0JywgZXZlbnQudGFyZ2V0LnZhbHVlKX0gLz48L1Byb3BlcnR5PlxuICAgICAgPFByb3BlcnR5IGxhYmVsPVwiTW92ZW1lbnRcIj48c2VsZWN0IHZhbHVlPXttb3ZlbWVudH0gb25DaGFuZ2U9eyhldmVudCkgPT4gdXBkYXRlTW92ZW1lbnQoZXZlbnQudGFyZ2V0LnZhbHVlKX0+PG9wdGlvbiB2YWx1ZT1cInNwYXRpYWxcIj5TcGF0aWFsIHRyYXZlbDwvb3B0aW9uPjxvcHRpb24gdmFsdWU9XCJ2ZXJ0aWNhbFwiPlZlcnRpY2FsIHNjcm9sbDwvb3B0aW9uPjwvc2VsZWN0PjwvUHJvcGVydHk+XG4gICAgICA8TnVtYmVyUHJvcGVydHlcbiAgICAgICAgbGFiZWw9XCJQb3NpdGlvblwiXG4gICAgICAgIHZhbHVlPXtOdW1iZXIoKGN1ZS5ob2xkICogMTAwKS50b0ZpeGVkKDEpKX1cbiAgICAgICAgbWluPXtOdW1iZXIoKHRpbWluZ0JvdW5kcy5taW4gKiAxMDApLnRvRml4ZWQoMSkpfVxuICAgICAgICBtYXg9e051bWJlcigodGltaW5nQm91bmRzLm1heCAqIDEwMCkudG9GaXhlZCgxKSl9XG4gICAgICAgIHN0ZXA9ezAuNX1cbiAgICAgICAgdW5pdD1cIiVcIlxuICAgICAgICBkaXNhYmxlZD17dGltaW5nQm91bmRzLm1pbiA9PT0gdGltaW5nQm91bmRzLm1heH1cbiAgICAgICAgb25DaGFuZ2U9e21vdmVDdWV9XG4gICAgICAvPlxuICAgICAge21vdmVtZW50ID09PSAnc3BhdGlhbCcgPyAoXG4gICAgICAgIDw+XG4gICAgICAgICAgPFByb3BlcnR5IGxhYmVsPVwiQXV0byB0cmF2ZWxcIj48b3V0cHV0IGNsYXNzTmFtZT1cImFib3V0LWVkaXRvci1yZWFkb3V0XCI+e01hdGgucm91bmQobW90aW9uSW50ZXJ2YWwuc3RhcnQgKiAxMDApfeKAk3tNYXRoLnJvdW5kKG1vdGlvbkludGVydmFsLmVuZCAqIDEwMCl9JTwvb3V0cHV0PjwvUHJvcGVydHk+XG4gICAgICAgICAgPFByb3BlcnR5IGxhYmVsPVwiTW90aW9uIHByZXNldFwiPjxzZWxlY3QgdmFsdWU9e2N1ZS5wcmVzZXR9IG9uQ2hhbmdlPXsoZXZlbnQpID0+IHVwZGF0ZSgncHJlc2V0JywgZXZlbnQudGFyZ2V0LnZhbHVlKX0+PG9wdGlvbiB2YWx1ZT1cInRyYXZlbGxpbmctdGl0bGUtdjFcIj5UcmF2ZWxsaW5nIHRpdGxlPC9vcHRpb24+PG9wdGlvbiB2YWx1ZT1cIm9wZW5lci12MVwiPk9wZW5lcjwvb3B0aW9uPjxvcHRpb24gdmFsdWU9XCJmaW5hbGUtdjFcIj5GaW5hbGU8L29wdGlvbj48L3NlbGVjdD48L1Byb3BlcnR5PlxuICAgICAgICA8Lz5cbiAgICAgICkgOiA8UHJvcGVydHkgbGFiZWw9XCJSZXZlYWxcIj48b3V0cHV0IGNsYXNzTmFtZT1cImFib3V0LWVkaXRvci1yZWFkb3V0XCI+RWRpdG9yaWFsIHZlcnRpY2FsIHNjcm9sbDwvb3V0cHV0PjwvUHJvcGVydHk+fVxuICAgICAgPEN1ZVJoeXRobUFuZFJldXNlIHN0b3JlPXtzdG9yZX0gc25hcHNob3Q9e3NuYXBzaG90fSBjbGlwYm9hcmQ9e2NsaXBib2FyZH0gc2V0Q2xpcGJvYXJkPXtzZXRDbGlwYm9hcmR9IC8+XG4gICAgICA8YnV0dG9uIHR5cGU9XCJidXR0b25cIiBjbGFzc05hbWU9XCJhYm91dC1lZGl0b3ItZGFuZ2VyXCIgZGlzYWJsZWQ9e3NlY3Rpb24udHlwZSA9PT0gJ2ZpbmFsZSd9IG9uQ2xpY2s9e3JlbW92ZX0+RGVsZXRlIEN1ZTwvYnV0dG9uPlxuICAgIDwvPlxuICApO1xufVxuXG5mdW5jdGlvbiBEaXNjaXBsaW5lUmV2ZWFsSW5zcGVjdG9yKHsgc3RvcmUsIHNuYXBzaG90LCBzZWN0aW9uIH0pIHtcbiAgY29uc3Qgc2VjdGlvbkluZGV4ID0gZ2V0U2VjdGlvbkluZGV4KHNuYXBzaG90LmRvY3VtZW50LCBzZWN0aW9uLmlkKTtcbiAgY29uc3QgcmV2ZWFsID0gc2VjdGlvbi50ZXh0LmRpc2NpcGxpbmVSZXZlYWw7XG4gIGlmICghcmV2ZWFsKSByZXR1cm4gPFNlY3Rpb25JbnNwZWN0b3Igc3RvcmU9e3N0b3JlfSBzbmFwc2hvdD17c25hcHNob3R9IHNlY3Rpb249e3NlY3Rpb259IC8+O1xuICBjb25zdCB1cGRhdGUgPSAobGFiZWwsIG11dGF0ZSwgY29hbGVzY2VLZXkgPSBudWxsKSA9PiBzdG9yZS5jb21taXQobGFiZWwsIChkcmFmdCkgPT4ge1xuICAgIG11dGF0ZShkcmFmdC5zZWN0aW9uc1tzZWN0aW9uSW5kZXhdLnRleHQuZGlzY2lwbGluZVJldmVhbCk7XG4gIH0sIHsgY29hbGVzY2VLZXksIHNlbGVjdGlvbjogc25hcHNob3Quc2VsZWN0aW9uIH0pO1xuICBjb25zdCBvY2N1cGllZCA9ICgocmV2ZWFsLml0ZW1zLmxlbmd0aCAtIDEpICogcmV2ZWFsLnN0YWdnZXIpICsgcmV2ZWFsLmxhYmVsRHVyYXRpb24gKyByZXZlYWwuaG9sZDtcbiAgY29uc3QgbGltaXRzRm9yID0gKGNvbnRyb2wpID0+IHtcbiAgICBpZiAoY29udHJvbC5pZCA9PT0gJ3N0YXJ0JykgcmV0dXJuIHsgbWluOiBjb250cm9sLm1pbiwgbWF4OiBNYXRoLm1heChjb250cm9sLm1pbiwgcmV2ZWFsLmVuZCAtIG9jY3VwaWVkKSB9O1xuICAgIGlmIChjb250cm9sLmlkID09PSAnZW5kJykgcmV0dXJuIHsgbWluOiBNYXRoLm1pbihjb250cm9sLm1heCwgcmV2ZWFsLnN0YXJ0ICsgb2NjdXBpZWQpLCBtYXg6IGNvbnRyb2wubWF4IH07XG4gICAgaWYgKGNvbnRyb2wuaWQgPT09ICdzdGFnZ2VyJykgcmV0dXJuIHtcbiAgICAgIG1pbjogY29udHJvbC5taW4sXG4gICAgICBtYXg6IE1hdGgubWF4KGNvbnRyb2wubWluLCAocmV2ZWFsLmVuZCAtIHJldmVhbC5zdGFydCAtIHJldmVhbC5sYWJlbER1cmF0aW9uIC0gcmV2ZWFsLmhvbGQpIC8gTWF0aC5tYXgoMSwgcmV2ZWFsLml0ZW1zLmxlbmd0aCAtIDEpKSxcbiAgICB9O1xuICAgIGlmIChjb250cm9sLmlkID09PSAnbGFiZWxEdXJhdGlvbicpIHJldHVybiB7XG4gICAgICBtaW46IGNvbnRyb2wubWluLFxuICAgICAgbWF4OiBNYXRoLm1heChjb250cm9sLm1pbiwgcmV2ZWFsLmVuZCAtIHJldmVhbC5zdGFydCAtICgocmV2ZWFsLml0ZW1zLmxlbmd0aCAtIDEpICogcmV2ZWFsLnN0YWdnZXIpIC0gcmV2ZWFsLmhvbGQpLFxuICAgIH07XG4gICAgaWYgKGNvbnRyb2wuaWQgPT09ICdob2xkJykgcmV0dXJuIHtcbiAgICAgIG1pbjogY29udHJvbC5taW4sXG4gICAgICBtYXg6IE1hdGgubWF4KGNvbnRyb2wubWluLCByZXZlYWwuZW5kIC0gcmV2ZWFsLnN0YXJ0IC0gKChyZXZlYWwuaXRlbXMubGVuZ3RoIC0gMSkgKiByZXZlYWwuc3RhZ2dlcikgLSByZXZlYWwubGFiZWxEdXJhdGlvbiksXG4gICAgfTtcbiAgICByZXR1cm4geyBtaW46IGNvbnRyb2wubWluLCBtYXg6IGNvbnRyb2wubWF4IH07XG4gIH07XG4gIHJldHVybiAoXG4gICAgPD5cbiAgICAgIDxoZWFkZXI+PHNwYW4+VGV4dCBzZXF1ZW5jZTwvc3Bhbj48c3Ryb25nPkRpc2NpcGxpbmUgcmV2ZWFsPC9zdHJvbmc+PC9oZWFkZXI+XG4gICAgICA8cCBjbGFzc05hbWU9XCJhYm91dC1lZGl0b3ItaGVscFwiPk9uZSBjbGlwIGNvbnRyb2xzIHRoZSBjb21wbGV0ZSBzaXgtcG9pbnQgc2VxdWVuY2UuIERyYWcgaXRzIHN0cmlwZWQgYmxvY2sgaW4gdGhlIFRleHQgbGFuZSB0byBtb3ZlIGV2ZXJ5IHJldmVhbCB0b2dldGhlci48L3A+XG4gICAgICA8ZGV0YWlscyBvcGVuPjxzdW1tYXJ5PlJldmVhbCBjaG9yZW9ncmFwaHk8L3N1bW1hcnk+XG4gICAgICAgIHtBQk9VVF9OQVJSQVRJVkVfRElTQ0lQTElORV9SRVZFQUxfQ09OVFJPTFMubWFwKChjb250cm9sKSA9PiB7XG4gICAgICAgICAgY29uc3QgbGltaXRzID0gbGltaXRzRm9yKGNvbnRyb2wpO1xuICAgICAgICAgIHJldHVybiAoXG4gICAgICAgICAgICA8TnVtYmVyUHJvcGVydHlcbiAgICAgICAgICAgICAga2V5PXtjb250cm9sLmlkfVxuICAgICAgICAgICAgICBsYWJlbD17Y29udHJvbC5sYWJlbH1cbiAgICAgICAgICAgICAgdmFsdWU9e3JldmVhbFtjb250cm9sLmlkXX1cbiAgICAgICAgICAgICAgbWluPXtsaW1pdHMubWlufVxuICAgICAgICAgICAgICBtYXg9e2xpbWl0cy5tYXh9XG4gICAgICAgICAgICAgIHN0ZXA9e2NvbnRyb2wuc3RlcH1cbiAgICAgICAgICAgICAgdW5pdD17Y29udHJvbC51bml0fVxuICAgICAgICAgICAgICBvbkNoYW5nZT17KHZhbHVlKSA9PiB1cGRhdGUoYENoYW5nZSAke2NvbnRyb2wubGFiZWx9YCwgKGRyYWZ0KSA9PiB7IGRyYWZ0W2NvbnRyb2wuaWRdID0gdmFsdWU7IH0sIGBkaXNjaXBsaW5lLXJldmVhbDoke3NlY3Rpb24uaWR9OiR7Y29udHJvbC5pZH1gKX1cbiAgICAgICAgICAgIC8+XG4gICAgICAgICAgKTtcbiAgICAgICAgfSl9XG4gICAgICA8L2RldGFpbHM+XG4gICAgICA8ZGV0YWlscyBvcGVuPjxzdW1tYXJ5PlJldmVhbCBvcmRlciBhbmQgbGFiZWxzPC9zdW1tYXJ5PlxuICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cImFib3V0LWVkaXRvci1kaXNjaXBsaW5lLWl0ZW1zXCI+XG4gICAgICAgICAge3JldmVhbC5pdGVtcy5tYXAoKGl0ZW0sIGl0ZW1JbmRleCkgPT4gKFxuICAgICAgICAgICAgPGRpdiBjbGFzc05hbWU9XCJhYm91dC1lZGl0b3ItZGlzY2lwbGluZS1pdGVtXCIga2V5PXtpdGVtLmdyb3VwfT5cbiAgICAgICAgICAgICAgPGNvZGU+e1N0cmluZyhpdGVtSW5kZXggKyAxKS5wYWRTdGFydCgyLCAnMCcpfTwvY29kZT5cbiAgICAgICAgICAgICAgPGlucHV0IHZhbHVlPXtpdGVtLmxhYmVsfSBhcmlhLWxhYmVsPXtgRGlzY2lwbGluZSAke2l0ZW1JbmRleCArIDF9IGxhYmVsYH0gb25DaGFuZ2U9eyhldmVudCkgPT4gdXBkYXRlKCdFZGl0IGRpc2NpcGxpbmUgbGFiZWwnLCAoZHJhZnQpID0+IHsgZHJhZnQuaXRlbXNbaXRlbUluZGV4XS5sYWJlbCA9IGV2ZW50LnRhcmdldC52YWx1ZTsgfSwgYGRpc2NpcGxpbmUtcmV2ZWFsOiR7c2VjdGlvbi5pZH06aXRlbToke2l0ZW0uZ3JvdXB9OmxhYmVsYCl9IC8+XG4gICAgICAgICAgICAgIDxkaXYgY2xhc3NOYW1lPVwiYWJvdXQtZWRpdG9yLWRpc2NpcGxpbmUtcGFsZXR0ZVwiIHRpdGxlPXtgJHtpdGVtLmxhYmVsfSB1c2VzIHRoZSBIb21lIHNpbXVsYXRpb24gJHtESVNDSVBMSU5FX0JBTExfVE9LRU5fQllfR1JPVVBbaXRlbS5ncm91cF19YH0+XG4gICAgICAgICAgICAgICAgPGkgc3R5bGU9e3sgYmFja2dyb3VuZDogYHZhcigke0RJU0NJUExJTkVfQkFMTF9UT0tFTl9CWV9HUk9VUFtpdGVtLmdyb3VwXX0pYCB9fSAvPlxuICAgICAgICAgICAgICAgIDxjb2RlPntESVNDSVBMSU5FX0JBTExfVE9LRU5fQllfR1JPVVBbaXRlbS5ncm91cF19PC9jb2RlPlxuICAgICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgICAgPHNwYW4+XG4gICAgICAgICAgICAgICAgPGJ1dHRvbiB0eXBlPVwiYnV0dG9uXCIgZGlzYWJsZWQ9e2l0ZW1JbmRleCA9PT0gMH0gYXJpYS1sYWJlbD17YFJldmVhbCAke2l0ZW0ubGFiZWx9IGVhcmxpZXJgfSBvbkNsaWNrPXsoKSA9PiB1cGRhdGUoJ1Jlb3JkZXIgZGlzY2lwbGluZSByZXZlYWwnLCAoZHJhZnQpID0+IHsgY29uc3QgW21vdmVkXSA9IGRyYWZ0Lml0ZW1zLnNwbGljZShpdGVtSW5kZXgsIDEpOyBkcmFmdC5pdGVtcy5zcGxpY2UoaXRlbUluZGV4IC0gMSwgMCwgbW92ZWQpOyB9KX0+4oaRPC9idXR0b24+XG4gICAgICAgICAgICAgICAgPGJ1dHRvbiB0eXBlPVwiYnV0dG9uXCIgZGlzYWJsZWQ9e2l0ZW1JbmRleCA9PT0gcmV2ZWFsLml0ZW1zLmxlbmd0aCAtIDF9IGFyaWEtbGFiZWw9e2BSZXZlYWwgJHtpdGVtLmxhYmVsfSBsYXRlcmB9IG9uQ2xpY2s9eygpID0+IHVwZGF0ZSgnUmVvcmRlciBkaXNjaXBsaW5lIHJldmVhbCcsIChkcmFmdCkgPT4geyBjb25zdCBbbW92ZWRdID0gZHJhZnQuaXRlbXMuc3BsaWNlKGl0ZW1JbmRleCwgMSk7IGRyYWZ0Lml0ZW1zLnNwbGljZShpdGVtSW5kZXggKyAxLCAwLCBtb3ZlZCk7IH0pfT7ihpM8L2J1dHRvbj5cbiAgICAgICAgICAgICAgPC9zcGFuPlxuICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgKSl9XG4gICAgICAgIDwvZGl2PlxuICAgICAgPC9kZXRhaWxzPlxuICAgICAgPHAgY2xhc3NOYW1lPVwiYWJvdXQtZWRpdG9yLWhlbHBcIj5UaGUgc2l4IHBvaW50cyBwZXJzaXN0IGFmdGVyIHRoZSBsYWJlbHMgbGVhdmUuIEFuIGVkaXRvcmlhbCBibG9jayBtYXJrZWQg4oCcUmVjb25uZWN0IHBvaW50IGdyaWTigJ0gcmVzdG9yZXMgdGhlIHN1cnJvdW5kaW5nIGdyaWQgYXMgdGhhdCBwYXJhZ3JhcGggZW50ZXJzLjwvcD5cbiAgICA8Lz5cbiAgKTtcbn1cblxuZnVuY3Rpb24gQ2FtZXJhSW5zcGVjdG9yKHsgc3RvcmUsIHNuYXBzaG90LCBzZWN0aW9uIH0pIHtcbiAgY29uc3Qgc2VjdGlvbkluZGV4ID0gZ2V0U2VjdGlvbkluZGV4KHNuYXBzaG90LmRvY3VtZW50LCBzZWN0aW9uLmlkKTtcbiAgY29uc3Qga2V5SW5kZXggPSBzbmFwc2hvdC5zZWxlY3Rpb24ua2V5SW5kZXg7XG4gIGNvbnN0IHNlbGVjdGVkS2V5ID0gc2VjdGlvbi5jYW1lcmEua2V5c1trZXlJbmRleF07XG4gIGNvbnN0IGtleSA9IHNlbGVjdGVkS2V5ICYmIHNlbGVjdGVkS2V5LmF0ID4gMCAmJiBzZWxlY3RlZEtleS5hdCA8IDEgPyBzZWxlY3RlZEtleSA6IG51bGw7XG4gIGNvbnN0IGxvY2FsID0gZ2V0TG9jYWxQcm9ncmVzcyhzbmFwc2hvdC5jb21waWxlZFBsYW4sIHNlY3Rpb24sIHNuYXBzaG90LnRyYW5zcG9ydC5zdG9yeVdVKTtcbiAgY29uc3QgdGFyZ2V0QXQgPSBNYXRoLm1pbigwLjk5NSwgTWF0aC5tYXgoMC4wMDUsIHNuYXBBYm91dE5hcnJhdGl2ZVRpbWVsaW5lVmFsdWUobG9jYWwpKSk7XG4gIGNvbnN0IGFwcGx5UHJlc2V0ID0gKHByZXNldCkgPT4gc3RvcmUuY29tbWl0KGBBcHBseSAke3ByZXNldH0gY2FtZXJhIHJlY2lwZWAsIChkcmFmdCkgPT4ge1xuICAgIGNvbnN0IHJlY2lwZXMgPSB7XG4gICAgICBQdXNoOiBbXG4gICAgICAgIHsgYXQ6IDAsIG9mZnNldDogWzAsIDAsIDBdLCBsb29rQXRPZmZzZXQ6IFswLCAwLCAtMV0sIGZvdjogNDgsIHJvbGw6IDAsIGVhc2luZzogJ3Ntb290aHN0ZXAnIH0sXG4gICAgICAgIHsgYXQ6IDEsIG9mZnNldDogWzAsIDAsIC0xLjJdLCBsb29rQXRPZmZzZXQ6IFswLCAwLCAtMV0sIGZvdjogNDUsIHJvbGw6IDAsIGVhc2luZzogJ3Ntb290aHN0ZXAnIH0sXG4gICAgICBdLFxuICAgICAgR2xpZGU6IFtcbiAgICAgICAgeyBhdDogMCwgb2Zmc2V0OiBbLTAuOCwgMCwgMF0sIGxvb2tBdE9mZnNldDogWzAuNCwgMCwgLTFdLCBmb3Y6IDQ4LCByb2xsOiAwLCBlYXNpbmc6ICdzbW9vdGhzdGVwJyB9LFxuICAgICAgICB7IGF0OiAxLCBvZmZzZXQ6IFswLjgsIDAsIDBdLCBsb29rQXRPZmZzZXQ6IFstMC40LCAwLCAtMV0sIGZvdjogNDgsIHJvbGw6IDAsIGVhc2luZzogJ3Ntb290aHN0ZXAnIH0sXG4gICAgICBdLFxuICAgICAgT3JiaXQ6IFtcbiAgICAgICAgeyBhdDogMCwgb2Zmc2V0OiBbLTAuNywgMCwgMF0sIGxvb2tBdE9mZnNldDogWzAuNywgMCwgLTFdLCBmb3Y6IDQ4LCByb2xsOiAtMC4wOCwgZWFzaW5nOiAnc21vb3Roc3RlcCcgfSxcbiAgICAgICAgeyBhdDogMC41LCBvZmZzZXQ6IFswLjcsIDAuMjUsIDBdLCBsb29rQXRPZmZzZXQ6IFstMC43LCAtMC4xLCAtMV0sIGZvdjogNDgsIHJvbGw6IDAuMDgsIGVhc2luZzogJ3Ntb290aHN0ZXAnIH0sXG4gICAgICAgIHsgYXQ6IDEsIG9mZnNldDogWzAsIDAsIDBdLCBsb29rQXRPZmZzZXQ6IFswLCAwLCAtMV0sIGZvdjogNDgsIHJvbGw6IDAsIGVhc2luZzogJ3Ntb290aHN0ZXAnIH0sXG4gICAgICBdLFxuICAgICAgUmV2ZWFsOiBbXG4gICAgICAgIHsgYXQ6IDAsIG9mZnNldDogWzAsIC0wLjQ1LCAwLjVdLCBsb29rQXRPZmZzZXQ6IFswLCAwLjMsIC0xXSwgZm92OiA1Niwgcm9sbDogMCwgZWFzaW5nOiAnc21vb3Roc3RlcCcgfSxcbiAgICAgICAgeyBhdDogMSwgb2Zmc2V0OiBbMCwgMCwgMF0sIGxvb2tBdE9mZnNldDogWzAsIDAsIC0xXSwgZm92OiA0Niwgcm9sbDogMCwgZWFzaW5nOiAnc21vb3Roc3RlcCcgfSxcbiAgICAgIF0sXG4gICAgICBSZXNvbHZlOiBbXG4gICAgICAgIHsgYXQ6IDAsIG9mZnNldDogWzAuMywgMC4yLCAwXSwgbG9va0F0T2Zmc2V0OiBbLTAuMywgLTAuMiwgLTFdLCBmb3Y6IDUyLCByb2xsOiAwLjE0LCBlYXNpbmc6ICdzbW9vdGhzdGVwJyB9LFxuICAgICAgICB7IGF0OiAxLCBvZmZzZXQ6IFswLCAwLCAwXSwgbG9va0F0T2Zmc2V0OiBbMCwgMCwgLTFdLCBmb3Y6IDQ4LCByb2xsOiAwLCBlYXNpbmc6ICdzbW9vdGhzdGVwJyB9LFxuICAgICAgXSxcbiAgICB9O1xuICAgIGRyYWZ0LnNlY3Rpb25zW3NlY3Rpb25JbmRleF0uY2FtZXJhLmtleXMgPSByZWNpcGVzW3ByZXNldF07XG4gICAgYnJpZGdlQ2FtZXJhU2VjdGlvbihkcmFmdCwgc2VjdGlvbkluZGV4KTtcbiAgfSwgeyBzZWxlY3Rpb246IHsgdHlwZTogJ3NlY3Rpb24nLCBzZWN0aW9uSWQ6IHNlY3Rpb24uaWQgfSB9KTtcbiAgY29uc3QgZXhpc3RpbmdLZXlBdFBsYXloZWFkID0gc2VjdGlvbi5jYW1lcmEua2V5cy5maW5kSW5kZXgoKGl0ZW0pID0+IChcbiAgICBpdGVtLmF0ID4gMCAmJiBpdGVtLmF0IDwgMSAmJiBNYXRoLmFicyhpdGVtLmF0IC0gdGFyZ2V0QXQpIDwgMC4wMDI1XG4gICkpO1xuICBjb25zdCBzZXRLZXkgPSAoKSA9PiB7XG4gICAgaWYgKGV4aXN0aW5nS2V5QXRQbGF5aGVhZCA+PSAwKSB7XG4gICAgICBzdG9yZS5zZXRTZWxlY3Rpb24oeyB0eXBlOiAnY2FtZXJhLWtleScsIHNlY3Rpb25JZDogc2VjdGlvbi5pZCwga2V5SW5kZXg6IGV4aXN0aW5nS2V5QXRQbGF5aGVhZCB9KTtcbiAgICAgIHJldHVybjtcbiAgICB9XG4gICAgY29uc3QgaW5zZXJ0aW9uSW5kZXggPSBzZWN0aW9uLmNhbWVyYS5rZXlzLmZpbmRJbmRleCgoaXRlbSkgPT4gaXRlbS5hdCA+IHRhcmdldEF0KTtcbiAgICBjb25zdCBzZWxlY3RlZEtleUluZGV4ID0gaW5zZXJ0aW9uSW5kZXggPCAwID8gc2VjdGlvbi5jYW1lcmEua2V5cy5sZW5ndGggOiBpbnNlcnRpb25JbmRleDtcbiAgICBjb25zdCBzYW1wbGVkID0gc2FtcGxlQWJvdXROYXJyYXRpdmVQbGFuKHNuYXBzaG90LmNvbXBpbGVkUGxhbiwgc25hcHNob3QudHJhbnNwb3J0LnN0b3J5V1UpO1xuICAgIGNvbnN0IGJhc2VaID0gc25hcHNob3QuZG9jdW1lbnQuZ2xvYmFscy5jYW1lcmEuc3RhcnRaIC0gKHNuYXBzaG90LnRyYW5zcG9ydC5zdG9yeVdVICogc2FtcGxlZC5jYW1lcmEuY2FkZW5jZSk7XG4gICAgY29uc3QgbmV3S2V5ID0ge1xuICAgICAgYXQ6IHRhcmdldEF0LFxuICAgICAgb2Zmc2V0OiBbc2FtcGxlZC5jYW1lcmEucG9zaXRpb25bMF0sIHNhbXBsZWQuY2FtZXJhLnBvc2l0aW9uWzFdLCBzYW1wbGVkLmNhbWVyYS5wb3NpdGlvblsyXSAtIGJhc2VaXSxcbiAgICAgIGxvb2tBdE9mZnNldDogc2FtcGxlZC5jYW1lcmEudGFyZ2V0Lm1hcCgodmFsdWUsIGF4aXMpID0+IHZhbHVlIC0gc2FtcGxlZC5jYW1lcmEucG9zaXRpb25bYXhpc10pLFxuICAgICAgZm92OiBzYW1wbGVkLmNhbWVyYS5mb3YsXG4gICAgICByb2xsOiBzYW1wbGVkLmNhbWVyYS5yb2xsLFxuICAgICAgZWFzaW5nOiAnc21vb3Roc3RlcCcsXG4gICAgfTtcbiAgICBzdG9yZS5jb21taXQoJ1NldCBjYW1lcmEga2V5JywgKGRyYWZ0KSA9PiB7XG4gICAgICBkcmFmdC5zZWN0aW9uc1tzZWN0aW9uSW5kZXhdLmNhbWVyYS5rZXlzLnB1c2gobmV3S2V5KTtcbiAgICAgIGRyYWZ0LnNlY3Rpb25zW3NlY3Rpb25JbmRleF0uY2FtZXJhLmtleXMuc29ydCgoYSwgYikgPT4gYS5hdCAtIGIuYXQpO1xuICAgIH0sIHsgc2VsZWN0aW9uOiB7IHR5cGU6ICdjYW1lcmEta2V5Jywgc2VjdGlvbklkOiBzZWN0aW9uLmlkLCBrZXlJbmRleDogc2VsZWN0ZWRLZXlJbmRleCB9IH0pO1xuICB9O1xuICBjb25zdCByZWNpcGVzID0gPGRpdiBjbGFzc05hbWU9XCJhYm91dC1lZGl0b3ItY2FtZXJhLXJlY2lwZXNcIj57WydQdXNoJywgJ0dsaWRlJywgJ09yYml0JywgJ1JldmVhbCcsICdSZXNvbHZlJ10ubWFwKChuYW1lKSA9PiA8YnV0dG9uIHR5cGU9XCJidXR0b25cIiBrZXk9e25hbWV9IG9uQ2xpY2s9eygpID0+IGFwcGx5UHJlc2V0KG5hbWUpfT57bmFtZX08L2J1dHRvbj4pfTwvZGl2PjtcbiAgaWYgKCFrZXkpIHtcbiAgICByZXR1cm4gPD48aGVhZGVyPjxzcGFuPkNhbWVyYSB0cmFjazwvc3Bhbj48c3Ryb25nPkVkaXRpbmcgU2VjdGlvbiBiYXNlPC9zdHJvbmc+PC9oZWFkZXI+PHAgY2xhc3NOYW1lPVwiYWJvdXQtZWRpdG9yLWhlbHBcIj5UaGUgZG9sbHkgYW5kIFNlY3Rpb24gam9pbnMgYXJlIGNvbnRpbnVvdXMgYXV0b21hdGljYWxseS4gQWRkIHZpc2libGUga2V5cyBvbmx5IHdoZXJlIHRoZSBmcmFtaW5nLCBhaW0sIHJvbGwsIG9yIGxlbnMgc2hvdWxkIGNoYW5nZS48L3A+e3JlY2lwZXN9PGJ1dHRvbiB0eXBlPVwiYnV0dG9uXCIgY2xhc3NOYW1lPVwiYWJvdXQtZWRpdG9yLXdpZGUtYWN0aW9uXCIgb25DbGljaz17c2V0S2V5fT5TZXQgY2FtZXJhIGtleSBhdCB7Zm9ybWF0Q2FtZXJhUGVyY2VudCh0YXJnZXRBdCl9PC9idXR0b24+PC8+O1xuICB9XG4gIGNvbnN0IHVwZGF0ZSA9IChmaWVsZCwgdmFsdWUpID0+IHN0b3JlLmNvbW1pdChgRWRpdCBjYW1lcmEgJHtmaWVsZH1gLCAoZHJhZnQpID0+IHtcbiAgICBkcmFmdC5zZWN0aW9uc1tzZWN0aW9uSW5kZXhdLmNhbWVyYS5rZXlzW2tleUluZGV4XVtmaWVsZF0gPSBBcnJheS5pc0FycmF5KHZhbHVlKSA/IFsuLi52YWx1ZV0gOiB2YWx1ZTtcbiAgICBpZiAoQ0FNRVJBX1BPU0VfRklFTERTLmhhcyhmaWVsZCkpIGxpbmtDYW1lcmFCb3VuZGFyeShkcmFmdCwgc2VjdGlvbkluZGV4LCBrZXlJbmRleCk7XG4gIH0sIHsgY29hbGVzY2VLZXk6IGBjYW1lcmE6JHtzZWN0aW9uLmlkfToke2tleUluZGV4fToke2ZpZWxkfWAsIHNlbGVjdGlvbjogc25hcHNob3Quc2VsZWN0aW9uIH0pO1xuICBjb25zdCB1cGRhdGVWZWN0b3IgPSAoZmllbGQsIGF4aXMsIHZhbHVlKSA9PiB7XG4gICAgY29uc3QgbmV4dCA9IFsuLi5rZXlbZmllbGRdXTtcbiAgICBuZXh0W2F4aXNdID0gdmFsdWU7XG4gICAgdXBkYXRlKGZpZWxkLCBuZXh0KTtcbiAgfTtcbiAgY29uc3QgdGltaW5nQm91bmRzID0gZ2V0QWJvdXROYXJyYXRpdmVDYW1lcmFLZXlUaW1pbmdCb3VuZHMoc2VjdGlvbi5jYW1lcmEua2V5cywga2V5SW5kZXgpO1xuICBjb25zdCBleHRlbnRGaWVsZCA9IHNuYXBzaG90LnByZXZpZXdQcm9maWxlID09PSAnbW9iaWxlJyA/ICdtb2JpbGVFeHRlbnRXVScgOiAnZXh0ZW50V1UnO1xuICBjb25zdCBleHRlbnRMYWJlbCA9IHNuYXBzaG90LnByZXZpZXdQcm9maWxlID09PSAnbW9iaWxlJyA/ICdNb2JpbGUgbGVuZ3RoJyA6ICdTZWN0aW9uIGxlbmd0aCc7XG4gIGNvbnN0IHVwZGF0ZUV4dGVudCA9ICh2YWx1ZSkgPT4gc3RvcmUuY29tbWl0KCdDaGFuZ2UgU2VjdGlvbiBleHRlbnQnLCAoZHJhZnQpID0+IHtcbiAgICBkcmFmdC5zZWN0aW9uc1tzZWN0aW9uSW5kZXhdW2V4dGVudEZpZWxkXSA9IHZhbHVlO1xuICB9LCB7IGNvYWxlc2NlS2V5OiBgc2VjdGlvbjoke3NlY3Rpb24uaWR9OiR7ZXh0ZW50RmllbGR9YCwgc2VsZWN0aW9uOiBzbmFwc2hvdC5zZWxlY3Rpb24gfSk7XG4gIHJldHVybiAoXG4gICAgPD5cbiAgICAgIDxoZWFkZXI+PHNwYW4+Q2FtZXJhIGtleTwvc3Bhbj48c3Ryb25nPntmb3JtYXRDYW1lcmFQZXJjZW50KGtleS5hdCl9IHRocm91Z2gge3NlY3Rpb24ubGFiZWx9PC9zdHJvbmc+PC9oZWFkZXI+XG4gICAgICB7cmVjaXBlc31cbiAgICAgIDxOdW1iZXJQcm9wZXJ0eVxuICAgICAgICBsYWJlbD1cIlBvc2l0aW9uXCJcbiAgICAgICAgdmFsdWU9e051bWJlcigoa2V5LmF0ICogMTAwKS50b0ZpeGVkKDEpKX1cbiAgICAgICAgbWluPXtOdW1iZXIoKHRpbWluZ0JvdW5kcy5taW4gKiAxMDApLnRvRml4ZWQoMSkpfVxuICAgICAgICBtYXg9e051bWJlcigodGltaW5nQm91bmRzLm1heCAqIDEwMCkudG9GaXhlZCgxKSl9XG4gICAgICAgIHN0ZXA9ezAuNX1cbiAgICAgICAgdW5pdD1cIiVcIlxuICAgICAgICBvbkNoYW5nZT17KHZhbHVlKSA9PiB1cGRhdGUoJ2F0JywgTWF0aC5taW4odGltaW5nQm91bmRzLm1heCwgTWF0aC5tYXgodGltaW5nQm91bmRzLm1pbiwgc25hcEFib3V0TmFycmF0aXZlVGltZWxpbmVWYWx1ZSh2YWx1ZSAvIDEwMCkpKSl9XG4gICAgICAvPlxuICAgICAgPE51bWJlclByb3BlcnR5IGxhYmVsPXtleHRlbnRMYWJlbH0gdmFsdWU9e3NlY3Rpb25bZXh0ZW50RmllbGRdfSBtaW49ezF9IG1heD17OH0gc3RlcD17MC4wNX0gdW5pdD1cIldVXCIgb25DaGFuZ2U9e3VwZGF0ZUV4dGVudH0gLz5cbiAgICAgIHtbJ1ggb2Zmc2V0JywgJ1kgb2Zmc2V0JywgJ0ZvcndhcmQgb2Zmc2V0J10ubWFwKChsYWJlbCwgYXhpcykgPT4gPE51bWJlclByb3BlcnR5IGtleT17bGFiZWx9IGxhYmVsPXtsYWJlbH0gdmFsdWU9e2tleS5vZmZzZXRbYXhpc119IG1pbj17LTh9IG1heD17OH0gc3RlcD17MC4wMn0gdW5pdD1cIldVXCIgb25DaGFuZ2U9eyh2YWx1ZSkgPT4gdXBkYXRlVmVjdG9yKCdvZmZzZXQnLCBheGlzLCB2YWx1ZSl9IC8+KX1cbiAgICAgIHtbJ0FpbSBYJywgJ0FpbSBZJywgJ0FpbSBkZXB0aCddLm1hcCgobGFiZWwsIGF4aXMpID0+IDxOdW1iZXJQcm9wZXJ0eSBrZXk9e2xhYmVsfSBsYWJlbD17bGFiZWx9IHZhbHVlPXtrZXkubG9va0F0T2Zmc2V0W2F4aXNdfSBtaW49ey04fSBtYXg9ezh9IHN0ZXA9ezAuMDJ9IHVuaXQ9XCJXVVwiIG9uQ2hhbmdlPXsodmFsdWUpID0+IHVwZGF0ZVZlY3RvcignbG9va0F0T2Zmc2V0JywgYXhpcywgdmFsdWUpfSAvPil9XG4gICAgICA8TnVtYmVyUHJvcGVydHkgbGFiZWw9XCJGaWVsZCBvZiB2aWV3XCIgdmFsdWU9e2tleS5mb3Z9IG1pbj17MjB9IG1heD17OTB9IHN0ZXA9ezF9IHVuaXQ9XCLCsFwiIG9uQ2hhbmdlPXsodmFsdWUpID0+IHVwZGF0ZSgnZm92JywgdmFsdWUpfSAvPlxuICAgICAgPE51bWJlclByb3BlcnR5IGxhYmVsPVwiUm9sbFwiIHZhbHVlPXtrZXkucm9sbH0gbWluPXstMS4yfSBtYXg9ezEuMn0gc3RlcD17MC4wMX0gdW5pdD1cInJhZFwiIG9uQ2hhbmdlPXsodmFsdWUpID0+IHVwZGF0ZSgncm9sbCcsIHZhbHVlKX0gLz5cbiAgICAgIDxQcm9wZXJ0eSBsYWJlbD1cIkVhc2luZ1wiPjxzZWxlY3QgdmFsdWU9e2tleS5lYXNpbmd9IG9uQ2hhbmdlPXsoZXZlbnQpID0+IHVwZGF0ZSgnZWFzaW5nJywgZXZlbnQudGFyZ2V0LnZhbHVlKX0+PG9wdGlvbiB2YWx1ZT1cInNtb290aHN0ZXBcIj5TbW9vdGhzdGVwPC9vcHRpb24+PG9wdGlvbiB2YWx1ZT1cImVhc2UtaW4tb3V0XCI+RWFzZSBpbiBvdXQ8L29wdGlvbj48L3NlbGVjdD48L1Byb3BlcnR5PlxuICAgICAgPGJ1dHRvbiB0eXBlPVwiYnV0dG9uXCIgY2xhc3NOYW1lPVwiYWJvdXQtZWRpdG9yLXdpZGUtYWN0aW9uXCIgZGlzYWJsZWQ9e2V4aXN0aW5nS2V5QXRQbGF5aGVhZCA+PSAwfSBvbkNsaWNrPXtzZXRLZXl9PntleGlzdGluZ0tleUF0UGxheWhlYWQgPj0gMCA/IGBDYW1lcmEga2V5IGFscmVhZHkgYXQgJHtmb3JtYXRDYW1lcmFQZXJjZW50KHRhcmdldEF0KX1gIDogYFNldCBhbm90aGVyIGtleSBhdCAke2Zvcm1hdENhbWVyYVBlcmNlbnQodGFyZ2V0QXQpfWB9PC9idXR0b24+XG4gICAgICA8YnV0dG9uIHR5cGU9XCJidXR0b25cIiBjbGFzc05hbWU9XCJhYm91dC1lZGl0b3ItZGFuZ2VyXCIgb25DbGljaz17KCkgPT4gc3RvcmUuY29tbWl0KCdEZWxldGUgY2FtZXJhIGtleScsIChkcmFmdCkgPT4geyBkcmFmdC5zZWN0aW9uc1tzZWN0aW9uSW5kZXhdLmNhbWVyYS5rZXlzLnNwbGljZShrZXlJbmRleCwgMSk7IH0sIHsgc2VsZWN0aW9uOiB7IHR5cGU6ICdzZWN0aW9uJywgc2VjdGlvbklkOiBzZWN0aW9uLmlkIH0gfSl9PkRlbGV0ZSBrZXk8L2J1dHRvbj5cbiAgICA8Lz5cbiAgKTtcbn1cblxuY29uc3QgQ09SUkVTUE9OREVOQ0VfTEFCRUxTID0gT2JqZWN0LmZyZWV6ZSh7XG4gICdpbmRleC12MSc6ICdJbmRleCBvcmRlcicsXG4gICdzdGFibGUtc2VlZCc6ICdTdGFibGUgc2VlZCcsXG4gICdzcGF0aWFsLW5lYXJlc3QtdjEnOiAnTG9jYWwgdHJhdmVsIChhcHByb3guKScsXG4gICdncm91cC1hd2FyZSc6ICdHcm91cCBhd2FyZScsXG59KTtcblxuZnVuY3Rpb24gV29ybGRJbnNwZWN0b3IoeyBzdG9yZSwgc25hcHNob3QsIHNlY3Rpb24sIHJ1bnRpbWVNZXRyaWNzIH0pIHtcbiAgY29uc3Qgc2VjdGlvbkluZGV4ID0gZ2V0U2VjdGlvbkluZGV4KHNuYXBzaG90LmRvY3VtZW50LCBzZWN0aW9uLmlkKTtcbiAgaWYgKHNlY3Rpb24ud29ybGQubW9kZSAhPT0gJ3NldCcpIHtcbiAgICByZXR1cm4gPD48aGVhZGVyPjxzcGFuPldvcmxkIHRyYWNrPC9zcGFuPjxzdHJvbmc+SW5oZXJpdGVkIFdvcmxkPC9zdHJvbmc+PC9oZWFkZXI+PHAgY2xhc3NOYW1lPVwiYWJvdXQtZWRpdG9yLWhlbHBcIj5UaGlzIFNlY3Rpb24ga2VlcHMgdGhlIHByZXZpb3VzIFdvcmxkLiBDaG9vc2Ug4oCcQ3JlYXRlIFdvcmxkIGNsaXDigJ0gb25seSB3aGVuIHRoZSBzaGFwZSBzaG91bGQgY2hhbmdlIGhlcmUuPC9wPjxidXR0b24gdHlwZT1cImJ1dHRvblwiIGNsYXNzTmFtZT1cImFib3V0LWVkaXRvci13aWRlLWFjdGlvblwiIG9uQ2xpY2s9eygpID0+IHN0b3JlLmNvbW1pdCgnQ3JlYXRlIFdvcmxkIGNsaXAnLCAoZHJhZnQpID0+IHtcbiAgICAgIGRyYWZ0LnNlY3Rpb25zW3NlY3Rpb25JbmRleF0ud29ybGQgPSBjbG9uZUFib3V0TmFycmF0aXZlRG9jdW1lbnQoZHJhZnQuc2VjdGlvbnMuc2xpY2UoMCwgc2VjdGlvbkluZGV4KS5yZXZlcnNlKCkuZmluZCgoaXRlbSkgPT4gaXRlbS53b3JsZC5tb2RlID09PSAnc2V0Jyk/LndvcmxkIHx8IGRyYWZ0LnNlY3Rpb25zWzBdLndvcmxkKTtcbiAgICB9KX0+Q3JlYXRlIFdvcmxkIGNsaXA8L2J1dHRvbj48Lz47XG4gIH1cbiAgY29uc3Qgd29ybGQgPSBzZWN0aW9uLndvcmxkO1xuICBjb25zdCBzaGFwZSA9IEFCT1VUX05BUlJBVElWRV9TSEFQRV9ERUZJTklUSU9OU1t3b3JsZC5zaGFwZUlkXTtcbiAgY29uc3QgdHJhbnNpdGlvbkxpbWl0ID0gZ2V0QWJvdXROYXJyYXRpdmVXb3JsZFRyYW5zaXRpb25MaW1pdChzbmFwc2hvdC5jb21waWxlZFBsYW4sIHNlY3Rpb25JbmRleCk7XG4gIGNvbnN0IHRyYW5zaXRpb25NYXggPSBNYXRoLm1heCh0cmFuc2l0aW9uTGltaXQsIHdvcmxkLnRyYW5zaXRpb25Jbi5lbmQsIDEpO1xuICBjb25zdCB0cmFuc2l0aW9uRW5hYmxlZCA9IHdvcmxkLnRyYW5zaXRpb25Jbi50eXBlICE9PSAnY3V0JztcbiAgY29uc3QgY29ycmVzcG9uZGVuY2VFbmFibGVkID0gWydtb3JwaCcsICdkaXNzb2x2ZS1tb3JwaCddLmluY2x1ZGVzKHdvcmxkLnRyYW5zaXRpb25Jbi50eXBlKTtcbiAgY29uc3QgcHJldmlvdXNXb3JsZFNlY3Rpb24gPSBzbmFwc2hvdC5kb2N1bWVudC5zZWN0aW9uc1xuICAgIC5zbGljZSgwLCBzZWN0aW9uSW5kZXgpXG4gICAgLnJldmVyc2UoKVxuICAgIC5maW5kKChpdGVtKSA9PiBpdGVtLndvcmxkLm1vZGUgPT09ICdzZXQnKTtcbiAgY29uc3Qgc291cmNlU2hhcGUgPSBBQk9VVF9OQVJSQVRJVkVfU0hBUEVfREVGSU5JVElPTlNbcHJldmlvdXNXb3JsZFNlY3Rpb24/LndvcmxkLnNoYXBlSWQgfHwgd29ybGQuc2hhcGVJZF07XG4gIGNvbnN0IHByZXBhcmVkID0gcnVudGltZU1ldHJpY3M/LnByZXBhcmVkV29ybGRJZHM/LmluY2x1ZGVzKHNlY3Rpb24uaWQpO1xuICBjb25zdCBjb3JyZXNwb25kZW5jZVN0YXR1cyA9IHJ1bnRpbWVNZXRyaWNzPy5jb3JyZXNwb25kZW5jZVNlcXVlbmNlU3RhdGUgPT09ICdmYWlsZWQnXG4gICAgPyAnRmFpbGVkJ1xuICAgIDogcnVudGltZU1ldHJpY3M/LmNvcnJlc3BvbmRlbmNlU2VxdWVuY2VTdGF0ZSA9PT0gJ2xvYWRpbmcnXG4gICAgICA/ICdQcmVwYXJpbmcnXG4gICAgICA6IHByZXBhcmVkXG4gICAgICAgID8gcnVudGltZU1ldHJpY3M/LmNvcnJlc3BvbmRlbmNlRmFsbGJhY2sgJiYgcnVudGltZU1ldHJpY3M/LmNvcnJlc3BvbmRlbmNlVG9Xb3JsZElkID09PSBzZWN0aW9uLmlkXG4gICAgICAgICAgPyAnQmFzZWxpbmUgZmFsbGJhY2snXG4gICAgICAgICAgOiAnUmVhZHknXG4gICAgICAgIDogJ1ByZXBhcmluZyc7XG4gIGNvbnN0IHVwZGF0ZSA9IChsYWJlbCwgbXV0YXRlLCBjb2FsZXNjZUtleSA9IG51bGwpID0+IHN0b3JlLmNvbW1pdChsYWJlbCwgKGRyYWZ0KSA9PiBtdXRhdGUoZHJhZnQuc2VjdGlvbnNbc2VjdGlvbkluZGV4XS53b3JsZCksIHsgY29hbGVzY2VLZXksIHNlbGVjdGlvbjogc25hcHNob3Quc2VsZWN0aW9uIH0pO1xuICBjb25zdCB0cnlTaGFwZSA9IChzaGFwZUlkKSA9PiBzdG9yZS5iZWdpblRyeShgUmVwbGFjZSBTaGFwZSB3aXRoICR7QUJPVVRfTkFSUkFUSVZFX1NIQVBFX0RFRklOSVRJT05TW3NoYXBlSWRdLmxhYmVsfWAsIChkcmFmdCkgPT4ge1xuICAgIGNvbnN0IHRhcmdldCA9IGRyYWZ0LnNlY3Rpb25zW3NlY3Rpb25JbmRleF0ud29ybGQ7XG4gICAgdGFyZ2V0LnNoYXBlSWQgPSBzaGFwZUlkO1xuICAgIHRhcmdldC5zaGFwZVBhcmFtZXRlcnMgPSBPYmplY3QuZnJvbUVudHJpZXMoQUJPVVRfTkFSUkFUSVZFX1NIQVBFX0RFRklOSVRJT05TW3NoYXBlSWRdLnBhcmFtZXRlcnMubWFwKChjb250cm9sKSA9PiBbY29udHJvbC5pZCwgY29udHJvbC5pZCA9PT0gJ2RlbnNpdHknID8gMSA6IChjb250cm9sLm1pbiArIGNvbnRyb2wubWF4KSAvIDJdKSk7XG4gIH0pO1xuICByZXR1cm4gKFxuICAgIDw+XG4gICAgICA8aGVhZGVyPjxzcGFuPldvcmxkIGNsaXA8L3NwYW4+PHN0cm9uZz57c2hhcGU/LmxhYmVsIHx8IHdvcmxkLnNoYXBlSWR9PC9zdHJvbmc+PC9oZWFkZXI+XG4gICAgICA8ZGl2IGNsYXNzTmFtZT1cImFib3V0LWVkaXRvci1zaGFwZS1jYXRhbG9nXCI+XG4gICAgICAgIHtPYmplY3QudmFsdWVzKEFCT1VUX05BUlJBVElWRV9TSEFQRV9ERUZJTklUSU9OUykubWFwKChpdGVtKSA9PiAoXG4gICAgICAgICAgPGJ1dHRvbiB0eXBlPVwiYnV0dG9uXCIga2V5PXtpdGVtLmlkfSBkaXNhYmxlZD17c2VjdGlvbi5sb2NrZWR9IGNsYXNzTmFtZT17aXRlbS5pZCA9PT0gd29ybGQuc2hhcGVJZCA/ICdpcy1zZWxlY3RlZCcgOiAnJ30gb25DbGljaz17KCkgPT4gdHJ5U2hhcGUoaXRlbS5pZCl9PlxuICAgICAgICAgICAgPGkgLz48c3Bhbj48c3Ryb25nPntpdGVtLmxhYmVsfTwvc3Ryb25nPjxzbWFsbD5Db3N0IHtpdGVtLmNvc3R9IMK3IFBvaW50IGZpZWxkPC9zbWFsbD48L3NwYW4+XG4gICAgICAgICAgPC9idXR0b24+XG4gICAgICAgICkpfVxuICAgICAgPC9kaXY+XG4gICAgICB7c25hcHNob3QudHJ5U3RhdGUgPyA8ZGl2IGNsYXNzTmFtZT1cImFib3V0LWVkaXRvci10cnlcIj48c3Bhbj5Ucnlpbmcge3NuYXBzaG90LnRyeVN0YXRlLmxhYmVsfTwvc3Bhbj48YnV0dG9uIHR5cGU9XCJidXR0b25cIiBvbkNsaWNrPXsoKSA9PiBzdG9yZS5jYW5jZWxUcnkoKX0+Q2FuY2VsPC9idXR0b24+PGJ1dHRvbiB0eXBlPVwiYnV0dG9uXCIgY2xhc3NOYW1lPVwiaXMtcHJpbWFyeVwiIG9uQ2xpY2s9eygpID0+IHN0b3JlLmFwcGx5VHJ5KCl9PkFwcGx5PC9idXR0b24+PC9kaXY+IDogbnVsbH1cbiAgICAgIDxkZXRhaWxzIG9wZW4+PHN1bW1hcnk+U2hhcGUgcGFyYW1ldGVyczwvc3VtbWFyeT5cbiAgICAgICAgeyhzaGFwZT8ucGFyYW1ldGVycyB8fCBbXSkubWFwKChjb250cm9sKSA9PiA8TnVtYmVyUHJvcGVydHkga2V5PXtjb250cm9sLmlkfSBsYWJlbD17Y29udHJvbC5sYWJlbH0gdmFsdWU9e3dvcmxkLnNoYXBlUGFyYW1ldGVyc1tjb250cm9sLmlkXX0gbWluPXtjb250cm9sLm1pbn0gbWF4PXtjb250cm9sLm1heH0gc3RlcD17Y29udHJvbC5zdGVwfSB1bml0PXtjb250cm9sLnVuaXR9IG9uQ2hhbmdlPXsodmFsdWUpID0+IHVwZGF0ZShgQ2hhbmdlICR7Y29udHJvbC5sYWJlbH1gLCAoZHJhZnQpID0+IHsgZHJhZnQuc2hhcGVQYXJhbWV0ZXJzW2NvbnRyb2wuaWRdID0gdmFsdWU7IH0sIGB3b3JsZDoke3NlY3Rpb24uaWR9OiR7Y29udHJvbC5pZH1gKX0gLz4pfVxuICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cImFib3V0LWVkaXRvci1pbmxpbmUtYWN0aW9uc1wiPjxidXR0b24gdHlwZT1cImJ1dHRvblwiIG9uQ2xpY2s9eygpID0+IHVwZGF0ZSgnUmVzZWVkIFNoYXBlJywgKGRyYWZ0KSA9PiB7IGRyYWZ0LnNlZWQgPSBNYXRoLmZsb29yKE1hdGgucmFuZG9tKCkgKiAweGZmZmZmZmZmKTsgfSl9PlJlc2VlZDwvYnV0dG9uPjxjb2RlPnt3b3JsZC5zZWVkfTwvY29kZT48L2Rpdj5cbiAgICAgIDwvZGV0YWlscz5cbiAgICAgIDxkZXRhaWxzIG9wZW4+PHN1bW1hcnk+UGxhY2VtZW50PC9zdW1tYXJ5PlxuICAgICAgICA8TnVtYmVyUHJvcGVydHkgbGFiZWw9XCJEaXN0YW5jZSBhdCBlbnRyeVwiIHZhbHVlPXt3b3JsZC5lbnRyeURpc3RhbmNlV1V9IG1pbj17MC4yfSBtYXg9ezE2fSBzdGVwPXswLjA1fSB1bml0PVwiV1VcIiBvbkNoYW5nZT17KHZhbHVlKSA9PiB1cGRhdGUoJ01vdmUgV29ybGQnLCAoZHJhZnQpID0+IHsgZHJhZnQuZW50cnlEaXN0YW5jZVdVID0gdmFsdWU7IH0sIGB3b3JsZDoke3NlY3Rpb24uaWR9OmRpc3RhbmNlYCl9IC8+XG4gICAgICAgIDxOdW1iZXJQcm9wZXJ0eSBsYWJlbD1cIlNjYWxlXCIgdmFsdWU9e3dvcmxkLnRyYW5zZm9ybS5zY2FsZX0gbWluPXswLjF9IG1heD17M30gc3RlcD17MC4wMX0gb25DaGFuZ2U9eyh2YWx1ZSkgPT4gdXBkYXRlKCdTY2FsZSBXb3JsZCcsIChkcmFmdCkgPT4geyBkcmFmdC50cmFuc2Zvcm0uc2NhbGUgPSB2YWx1ZTsgfSwgYHdvcmxkOiR7c2VjdGlvbi5pZH06c2NhbGVgKX0gLz5cbiAgICAgIDwvZGV0YWlscz5cbiAgICAgIDxkZXRhaWxzIG9wZW4+PHN1bW1hcnk+VHJhbnNpdGlvbiBpbjwvc3VtbWFyeT5cbiAgICAgICAge3RyYW5zaXRpb25FbmFibGVkID8gPD5cbiAgICAgICAgICA8cCBjbGFzc05hbWU9XCJhYm91dC1lZGl0b3ItaGVscFwiPlRpbWluZyBpcyByZWxhdGl2ZSB0byB0aGlzIFNlY3Rpb246IDEgaXMgaXRzIGVuZDsgdmFsdWVzIGFib3ZlIDEgY29udGludWUgYWNyb3NzIGluaGVyaXRlZCBXb3JsZCBTZWN0aW9ucy4gVGhlIG5leHQgV29ybGQgYmVnaW5zIGF0IHt0cmFuc2l0aW9uTGltaXQudG9GaXhlZCgzKX0uPC9wPlxuICAgICAgICAgIDxOdW1iZXJQcm9wZXJ0eSBsYWJlbD1cIlN0YXJ0XCIgdmFsdWU9e3dvcmxkLnRyYW5zaXRpb25Jbi5zdGFydH0gbWluPXswfSBtYXg9e3RyYW5zaXRpb25NYXh9IHN0ZXA9ezAuMDA1fSB1bml0PVwiw5cgc2VjdGlvblwiIG9uQ2hhbmdlPXsodmFsdWUpID0+IHVwZGF0ZSgnQ2hhbmdlIHRyYW5zaXRpb24gc3RhcnQnLCAoZHJhZnQpID0+IHsgZHJhZnQudHJhbnNpdGlvbkluLnN0YXJ0ID0gTWF0aC5taW4odmFsdWUsIGRyYWZ0LnRyYW5zaXRpb25Jbi5lbmQpOyB9KX0gLz5cbiAgICAgICAgICA8TnVtYmVyUHJvcGVydHkgbGFiZWw9XCJFbmRcIiB2YWx1ZT17d29ybGQudHJhbnNpdGlvbkluLmVuZH0gbWluPXswfSBtYXg9e3RyYW5zaXRpb25NYXh9IHN0ZXA9ezAuMDA1fSB1bml0PVwiw5cgc2VjdGlvblwiIG9uQ2hhbmdlPXsodmFsdWUpID0+IHVwZGF0ZSgnQ2hhbmdlIHRyYW5zaXRpb24gZW5kJywgKGRyYWZ0KSA9PiB7IGRyYWZ0LnRyYW5zaXRpb25Jbi5lbmQgPSBNYXRoLm1heCh2YWx1ZSwgZHJhZnQudHJhbnNpdGlvbkluLnN0YXJ0KTsgfSl9IC8+XG4gICAgICAgICAgPFByb3BlcnR5IGxhYmVsPVwiVHlwZVwiPjxzZWxlY3QgdmFsdWU9e3dvcmxkLnRyYW5zaXRpb25Jbi50eXBlfSBvbkNoYW5nZT17KGV2ZW50KSA9PiB1cGRhdGUoJ0NoYW5nZSB0cmFuc2l0aW9uIHR5cGUnLCAoZHJhZnQpID0+IHsgZHJhZnQudHJhbnNpdGlvbkluLnR5cGUgPSBldmVudC50YXJnZXQudmFsdWU7IH0pfT48b3B0aW9uIHZhbHVlPVwibW9ycGhcIj5Nb3JwaDwvb3B0aW9uPjxvcHRpb24gdmFsdWU9XCJkaXNzb2x2ZS1tb3JwaFwiPkRpc3NvbHZlIG1vcnBoPC9vcHRpb24+PG9wdGlvbiB2YWx1ZT1cImNyb3NzZmFkZVwiPkNyb3NzZmFkZTwvb3B0aW9uPjxvcHRpb24gdmFsdWU9XCJob2xkXCI+SG9sZDwvb3B0aW9uPjwvc2VsZWN0PjwvUHJvcGVydHk+XG4gICAgICAgICAgPFByb3BlcnR5IGxhYmVsPVwiRWFzaW5nXCI+PHNlbGVjdCB2YWx1ZT17d29ybGQudHJhbnNpdGlvbkluLmVhc2luZ30gb25DaGFuZ2U9eyhldmVudCkgPT4gdXBkYXRlKCdDaGFuZ2UgdHJhbnNpdGlvbiBlYXNpbmcnLCAoZHJhZnQpID0+IHsgZHJhZnQudHJhbnNpdGlvbkluLmVhc2luZyA9IGV2ZW50LnRhcmdldC52YWx1ZTsgfSl9PjxvcHRpb24gdmFsdWU9XCJsaW5lYXJcIj5MaW5lYXI8L29wdGlvbj48b3B0aW9uIHZhbHVlPVwic21vb3Roc3RlcFwiPlNtb290aHN0ZXA8L29wdGlvbj48b3B0aW9uIHZhbHVlPVwiZWFzZS1pblwiPkVhc2UgaW48L29wdGlvbj48b3B0aW9uIHZhbHVlPVwiZWFzZS1vdXRcIj5FYXNlIG91dDwvb3B0aW9uPjxvcHRpb24gdmFsdWU9XCJlYXNlLWluLW91dFwiPkVhc2UgaW4gb3V0PC9vcHRpb24+PG9wdGlvbiB2YWx1ZT1cImhvbGRcIj5Ib2xkPC9vcHRpb24+PC9zZWxlY3Q+PC9Qcm9wZXJ0eT5cbiAgICAgICAgICA8cCBjbGFzc05hbWU9XCJhYm91dC1lZGl0b3ItaGVscFwiPk1hcHMge3NvdXJjZVNoYXBlPy5sYWJlbCB8fCAncHJldmlvdXMgU2hhcGUnfSDihpIge3NoYXBlPy5sYWJlbCB8fCB3b3JsZC5zaGFwZUlkfS48L3A+XG4gICAgICAgICAgPFByb3BlcnR5IGxhYmVsPVwiQ29ycmVzcG9uZGVuY2VcIj48c2VsZWN0IGFyaWEtbGFiZWw9XCJDb3JyZXNwb25kZW5jZVwiIHZhbHVlPXt3b3JsZC50cmFuc2l0aW9uSW4uY29ycmVzcG9uZGVuY2V9IGRpc2FibGVkPXshY29ycmVzcG9uZGVuY2VFbmFibGVkfSB0aXRsZT17Y29ycmVzcG9uZGVuY2VFbmFibGVkID8gJ0Nob29zZSBob3cgc291cmNlIHBvaW50cyBhcmUgYXNzaWduZWQgdG8gdGFyZ2V0IHBvaW50cy4nIDogJ0NvcnJlc3BvbmRlbmNlIGFwcGxpZXMgdG8gTW9ycGggYW5kIERpc3NvbHZlIG1vcnBoIHRyYW5zaXRpb25zLid9IG9uQ2hhbmdlPXsoZXZlbnQpID0+IHVwZGF0ZSgnQ2hhbmdlIGNvcnJlc3BvbmRlbmNlJywgKGRyYWZ0KSA9PiB7IGRyYWZ0LnRyYW5zaXRpb25Jbi5jb3JyZXNwb25kZW5jZSA9IGV2ZW50LnRhcmdldC52YWx1ZTsgfSl9PntBQk9VVF9OQVJSQVRJVkVfQ09SUkVTUE9OREVOQ0VfTU9ERVMubWFwKChtb2RlKSA9PiA8b3B0aW9uIHZhbHVlPXttb2RlfSBrZXk9e21vZGV9PntDT1JSRVNQT05ERU5DRV9MQUJFTFNbbW9kZV0gfHwgbW9kZX08L29wdGlvbj4pfTwvc2VsZWN0PjwvUHJvcGVydHk+XG4gICAgICAgICAgPHAgY2xhc3NOYW1lPVwiYWJvdXQtZWRpdG9yLWhlbHBcIiByb2xlPVwic3RhdHVzXCIgYXJpYS1saXZlPVwicG9saXRlXCI+Q29ycmVzcG9uZGVuY2U6IHtjb3JyZXNwb25kZW5jZVN0YXR1c317cHJlcGFyZWQgJiYgcnVudGltZU1ldHJpY3M/LmNvcnJlc3BvbmRlbmNlVG9Xb3JsZElkID09PSBzZWN0aW9uLmlkICYmIE51bWJlci5pc0Zpbml0ZShydW50aW1lTWV0cmljcz8uY29ycmVzcG9uZGVuY2VJbXByb3ZlbWVudCkgPyBgIMK3ICR7TWF0aC5yb3VuZChydW50aW1lTWV0cmljcy5jb3JyZXNwb25kZW5jZUltcHJvdmVtZW50ICogMTAwKX0lIFJNUyBpbXByb3ZlbWVudGAgOiAnJ30uPC9wPlxuICAgICAgICAgIDxidXR0b24gdHlwZT1cImJ1dHRvblwiIGNsYXNzTmFtZT1cImFib3V0LWVkaXRvci1kYW5nZXJcIiBvbkNsaWNrPXsoKSA9PiBzdG9yZS5jb21taXQoJ1JlbW92ZSBXb3JsZCB0cmFuc2l0aW9uJywgKGRyYWZ0KSA9PiB7XG4gICAgICAgICAgICBjb25zdCB0cmFuc2l0aW9uID0gZHJhZnQuc2VjdGlvbnNbc2VjdGlvbkluZGV4XS53b3JsZC50cmFuc2l0aW9uSW47XG4gICAgICAgICAgICB0cmFuc2l0aW9uLnN0YXJ0ID0gMDtcbiAgICAgICAgICAgIHRyYW5zaXRpb24uZW5kID0gMDtcbiAgICAgICAgICAgIHRyYW5zaXRpb24udHlwZSA9ICdjdXQnO1xuICAgICAgICAgIH0sIHsgc2VsZWN0aW9uOiB7IHR5cGU6ICd3b3JsZCcsIHNlY3Rpb25JZDogc2VjdGlvbi5pZCB9IH0pfT5SZW1vdmUgdHJhbnNpdGlvbiBrZXlmcmFtZXM8L2J1dHRvbj5cbiAgICAgICAgPC8+IDogPD5cbiAgICAgICAgICA8cCBjbGFzc05hbWU9XCJhYm91dC1lZGl0b3ItaGVscFwiPlRoaXMgV29ybGQgY3V0cyBpbiBhdCB0aGUgU2VjdGlvbiBib3VuZGFyeSBhbmQgaGFzIG5vIHRyYW5zaXRpb24ga2V5ZnJhbWVzLjwvcD5cbiAgICAgICAgICA8YnV0dG9uIHR5cGU9XCJidXR0b25cIiBjbGFzc05hbWU9XCJhYm91dC1lZGl0b3Itd2lkZS1hY3Rpb25cIiBvbkNsaWNrPXsoKSA9PiBzdG9yZS5jb21taXQoJ0FkZCBXb3JsZCB0cmFuc2l0aW9uJywgKGRyYWZ0KSA9PiB7XG4gICAgICAgICAgICBjb25zdCB0cmFuc2l0aW9uID0gZHJhZnQuc2VjdGlvbnNbc2VjdGlvbkluZGV4XS53b3JsZC50cmFuc2l0aW9uSW47XG4gICAgICAgICAgICB0cmFuc2l0aW9uLnN0YXJ0ID0gTWF0aC5taW4oMC4wOCwgdHJhbnNpdGlvbkxpbWl0KTtcbiAgICAgICAgICAgIHRyYW5zaXRpb24uZW5kID0gTWF0aC5taW4oMC42OCwgdHJhbnNpdGlvbkxpbWl0KTtcbiAgICAgICAgICAgIHRyYW5zaXRpb24udHlwZSA9ICdtb3JwaCc7XG4gICAgICAgICAgfSwgeyBzZWxlY3Rpb246IHsgdHlwZTogJ3dvcmxkJywgc2VjdGlvbklkOiBzZWN0aW9uLmlkIH0gfSl9PkFkZCB0cmFuc2l0aW9uIGtleWZyYW1lczwvYnV0dG9uPlxuICAgICAgICA8Lz59XG4gICAgICA8L2RldGFpbHM+XG4gICAgICA8ZGV0YWlscyBvcGVuPjxzdW1tYXJ5Pk1vZGlmaWVyIHN0YWNrPC9zdW1tYXJ5PlxuICAgICAgICB7d29ybGQubW9kaWZpZXJzLm1hcCgoaXRlbSwgbW9kaWZpZXJJbmRleCkgPT4ge1xuICAgICAgICAgIGNvbnN0IGRlZmluaXRpb24gPSBBQk9VVF9OQVJSQVRJVkVfTU9ESUZJRVJfREVGSU5JVElPTlNbaXRlbS5pZF07XG4gICAgICAgICAgY29uc3QgbW92ZU1vZGlmaWVyID0gKGRpcmVjdGlvbikgPT4gdXBkYXRlKCdSZW9yZGVyIG1vZGlmaWVyJywgKGRyYWZ0KSA9PiB7XG4gICAgICAgICAgICBjb25zdCBuZXh0SW5kZXggPSBtb2RpZmllckluZGV4ICsgZGlyZWN0aW9uO1xuICAgICAgICAgICAgaWYgKG5leHRJbmRleCA8IDAgfHwgbmV4dEluZGV4ID49IGRyYWZ0Lm1vZGlmaWVycy5sZW5ndGgpIHJldHVybjtcbiAgICAgICAgICAgIGNvbnN0IFttb3ZlZF0gPSBkcmFmdC5tb2RpZmllcnMuc3BsaWNlKG1vZGlmaWVySW5kZXgsIDEpO1xuICAgICAgICAgICAgZHJhZnQubW9kaWZpZXJzLnNwbGljZShuZXh0SW5kZXgsIDAsIG1vdmVkKTtcbiAgICAgICAgICB9KTtcbiAgICAgICAgICByZXR1cm4gPGRpdiBjbGFzc05hbWU9XCJhYm91dC1lZGl0b3ItbW9kaWZpZXJcIiBrZXk9e2Ake2l0ZW0uaWR9LSR7bW9kaWZpZXJJbmRleH1gfT48ZGl2PjxsYWJlbD48aW5wdXQgdHlwZT1cImNoZWNrYm94XCIgY2hlY2tlZD17aXRlbS5lbmFibGVkfSBvbkNoYW5nZT17KGV2ZW50KSA9PiB1cGRhdGUoYFRvZ2dsZSAke2RlZmluaXRpb24/LmxhYmVsfWAsIChkcmFmdCkgPT4geyBkcmFmdC5tb2RpZmllcnNbbW9kaWZpZXJJbmRleF0uZW5hYmxlZCA9IGV2ZW50LnRhcmdldC5jaGVja2VkOyB9KX0gLz57ZGVmaW5pdGlvbj8ubGFiZWwgfHwgaXRlbS5pZH08L2xhYmVsPjxzcGFuPjxidXR0b24gdHlwZT1cImJ1dHRvblwiIGRpc2FibGVkPXttb2RpZmllckluZGV4ID09PSAwfSBvbkNsaWNrPXsoKSA9PiBtb3ZlTW9kaWZpZXIoLTEpfSBhcmlhLWxhYmVsPVwiTW92ZSBtb2RpZmllciB1cFwiPuKGkTwvYnV0dG9uPjxidXR0b24gdHlwZT1cImJ1dHRvblwiIGRpc2FibGVkPXttb2RpZmllckluZGV4ID09PSB3b3JsZC5tb2RpZmllcnMubGVuZ3RoIC0gMX0gb25DbGljaz17KCkgPT4gbW92ZU1vZGlmaWVyKDEpfSBhcmlhLWxhYmVsPVwiTW92ZSBtb2RpZmllciBkb3duXCI+4oaTPC9idXR0b24+IENvc3Qge2RlZmluaXRpb24/LmNvc3QgfHwgJz8nfTwvc3Bhbj48L2Rpdj57KGRlZmluaXRpb24/LnBhcmFtZXRlcnMgfHwgW10pLm1hcCgoY29udHJvbCkgPT4gY29udHJvbC50eXBlID09PSAncmFuZ2UnID8gPE51bWJlclByb3BlcnR5IGtleT17Y29udHJvbC5pZH0gbGFiZWw9e2NvbnRyb2wubGFiZWx9IHZhbHVlPXtpdGVtLnBhcmFtZXRlcnNbY29udHJvbC5pZF19IG1pbj17Y29udHJvbC5taW59IG1heD17Y29udHJvbC5tYXh9IHN0ZXA9e2NvbnRyb2wuc3RlcH0gdW5pdD17Y29udHJvbC51bml0fSBvbkNoYW5nZT17KHZhbHVlKSA9PiB1cGRhdGUoYENoYW5nZSAke2NvbnRyb2wubGFiZWx9YCwgKGRyYWZ0KSA9PiB7IGRyYWZ0Lm1vZGlmaWVyc1ttb2RpZmllckluZGV4XS5wYXJhbWV0ZXJzW2NvbnRyb2wuaWRdID0gdmFsdWU7IH0sIGBtb2RpZmllcjoke3NlY3Rpb24uaWR9OiR7bW9kaWZpZXJJbmRleH06JHtjb250cm9sLmlkfWApfSAvPiA6IDxQcm9wZXJ0eSBrZXk9e2NvbnRyb2wuaWR9IGxhYmVsPXtjb250cm9sLmxhYmVsfT48c2VsZWN0IHZhbHVlPXtpdGVtLnBhcmFtZXRlcnNbY29udHJvbC5pZF19IG9uQ2hhbmdlPXsoZXZlbnQpID0+IHVwZGF0ZShgQ2hhbmdlICR7Y29udHJvbC5sYWJlbH1gLCAoZHJhZnQpID0+IHsgZHJhZnQubW9kaWZpZXJzW21vZGlmaWVySW5kZXhdLnBhcmFtZXRlcnNbY29udHJvbC5pZF0gPSBldmVudC50YXJnZXQudmFsdWU7IH0pfT57Y29udHJvbC5vcHRpb25zLm1hcCgob3B0aW9uKSA9PiA8b3B0aW9uIGtleT17b3B0aW9ufT57b3B0aW9ufTwvb3B0aW9uPil9PC9zZWxlY3Q+PC9Qcm9wZXJ0eT4pfTwvZGl2PjtcbiAgICAgICAgfSl9XG4gICAgICA8L2RldGFpbHM+XG4gICAgPC8+XG4gICk7XG59XG5cbmZ1bmN0aW9uIERpYWdub3N0aWNzKHsgZGlhZ25vc3RpY3MgfSkge1xuICBpZiAoIWRpYWdub3N0aWNzLmxlbmd0aCkgcmV0dXJuIDxkaXYgY2xhc3NOYW1lPVwiYWJvdXQtZWRpdG9yLWRpYWdub3N0aWNzIGlzLWNsZWFyXCI+PENoZWNrIGFyaWEtaGlkZGVuPVwidHJ1ZVwiIC8+IE5vIGRpYWdub3N0aWNzPC9kaXY+O1xuICByZXR1cm4gPGRpdiBjbGFzc05hbWU9XCJhYm91dC1lZGl0b3ItZGlhZ25vc3RpY3NcIj57ZGlhZ25vc3RpY3MubWFwKChpdGVtLCBpbmRleCkgPT4ge1xuICAgIGNvbnN0IERpYWdub3N0aWNJY29uID0gaXRlbS5sZXZlbCA9PT0gJ2Vycm9yJyA/IENpcmNsZUFsZXJ0IDogSW5mbztcbiAgICByZXR1cm4gPGRpdiBrZXk9e2Ake2l0ZW0uY29kZX0tJHtpdGVtLnBhdGh9LSR7aW5kZXh9YH0gY2xhc3NOYW1lPXtgaXMtJHtpdGVtLmxldmVsfWB9PjxEaWFnbm9zdGljSWNvbiBhcmlhLWhpZGRlbj1cInRydWVcIiAvPjxzcGFuPjxzdHJvbmc+e2l0ZW0ubWVzc2FnZX08L3N0cm9uZz48c21hbGw+e2l0ZW0ucGF0aH08L3NtYWxsPjwvc3Bhbj48L2Rpdj47XG4gIH0pfTwvZGl2Pjtcbn1cblxuZnVuY3Rpb24gSW5zcGVjdG9yKHsgc3RvcmUsIHNuYXBzaG90LCB0aW1lbGluZU9wZW4sIHJ1bnRpbWVNZXRyaWNzIH0pIHtcbiAgY29uc3QgaW5zcGVjdG9yUmVmID0gdXNlUmVmKG51bGwpO1xuICBjb25zdCBkcmFnUmVmID0gdXNlUmVmKG51bGwpO1xuICBjb25zdCBsYXN0SGVhZGVyQ2xpY2tSZWYgPSB1c2VSZWYobnVsbCk7XG4gIGNvbnN0IFtwb3NpdGlvbiwgc2V0UG9zaXRpb25dID0gdXNlU3RhdGUobnVsbCk7XG4gIGNvbnN0IFtkcmFnZ2luZywgc2V0RHJhZ2dpbmddID0gdXNlU3RhdGUoZmFsc2UpO1xuICBjb25zdCBzZWN0aW9uID0gZ2V0U2VjdGlvbihzbmFwc2hvdC5kb2N1bWVudCwgc25hcHNob3Quc2VsZWN0aW9uKTtcbiAgbGV0IGNvbnRlbnQgPSA8U2VjdGlvbkluc3BlY3RvciBzdG9yZT17c3RvcmV9IHNuYXBzaG90PXtzbmFwc2hvdH0gc2VjdGlvbj17c2VjdGlvbn0gLz47XG4gIGlmIChzbmFwc2hvdC5zZWxlY3Rpb24udHlwZSA9PT0gJ3NlcXVlbmNlJykgY29udGVudCA9IDxTZXF1ZW5jZUluc3BlY3RvciBzdG9yZT17c3RvcmV9IHNuYXBzaG90PXtzbmFwc2hvdH0gLz47XG4gIGlmIChzbmFwc2hvdC5zZWxlY3Rpb24udHlwZSA9PT0gJ2N1ZScpIGNvbnRlbnQgPSA8Q3VlSW5zcGVjdG9yIHN0b3JlPXtzdG9yZX0gc25hcHNob3Q9e3NuYXBzaG90fSBzZWN0aW9uPXtzZWN0aW9ufSAvPjtcbiAgaWYgKHNuYXBzaG90LnNlbGVjdGlvbi50eXBlID09PSAnZGlzY2lwbGluZS1yZXZlYWwnKSBjb250ZW50ID0gPERpc2NpcGxpbmVSZXZlYWxJbnNwZWN0b3Igc3RvcmU9e3N0b3JlfSBzbmFwc2hvdD17c25hcHNob3R9IHNlY3Rpb249e3NlY3Rpb259IC8+O1xuICBpZiAoc25hcHNob3Quc2VsZWN0aW9uLnR5cGUgPT09ICdjYW1lcmEta2V5JykgY29udGVudCA9IDxDYW1lcmFJbnNwZWN0b3Igc3RvcmU9e3N0b3JlfSBzbmFwc2hvdD17c25hcHNob3R9IHNlY3Rpb249e3NlY3Rpb259IC8+O1xuICBpZiAoc25hcHNob3Quc2VsZWN0aW9uLnR5cGUgPT09ICd3b3JsZCcpIGNvbnRlbnQgPSA8V29ybGRJbnNwZWN0b3Igc3RvcmU9e3N0b3JlfSBzbmFwc2hvdD17c25hcHNob3R9IHNlY3Rpb249e3NlY3Rpb259IHJ1bnRpbWVNZXRyaWNzPXtydW50aW1lTWV0cmljc30gLz47XG4gIGlmIChzbmFwc2hvdC5zZWxlY3Rpb24udHlwZSA9PT0gJ2ludGVyYWN0aW9uJykgY29udGVudCA9IDxTZWN0aW9uSW5zcGVjdG9yIHN0b3JlPXtzdG9yZX0gc25hcHNob3Q9e3NuYXBzaG90fSBzZWN0aW9uPXtzZWN0aW9ufSAvPjtcblxuICB1c2VFZmZlY3QoKCkgPT4ge1xuICAgIGNvbnN0IGtlZXBJbkJvdW5kcyA9ICgpID0+IHtcbiAgICAgIGlmICh3aW5kb3cuaW5uZXJXaWR0aCA8IDc2MCkge1xuICAgICAgICBzZXRQb3NpdGlvbihudWxsKTtcbiAgICAgICAgcmV0dXJuO1xuICAgICAgfVxuICAgICAgc2V0UG9zaXRpb24oKGN1cnJlbnQpID0+IChcbiAgICAgICAgY3VycmVudCAmJiBpbnNwZWN0b3JSZWYuY3VycmVudFxuICAgICAgICAgID8gY2xhbXBJbnNwZWN0b3JQb3NpdGlvbihpbnNwZWN0b3JSZWYuY3VycmVudCwgY3VycmVudCwgdGltZWxpbmVPcGVuKVxuICAgICAgICAgIDogY3VycmVudFxuICAgICAgKSk7XG4gICAgfTtcbiAgICBrZWVwSW5Cb3VuZHMoKTtcbiAgICB3aW5kb3cuYWRkRXZlbnRMaXN0ZW5lcigncmVzaXplJywga2VlcEluQm91bmRzKTtcbiAgICByZXR1cm4gKCkgPT4gd2luZG93LnJlbW92ZUV2ZW50TGlzdGVuZXIoJ3Jlc2l6ZScsIGtlZXBJbkJvdW5kcyk7XG4gIH0sIFt0aW1lbGluZU9wZW5dKTtcblxuICBjb25zdCBiZWdpbkRyYWcgPSAoZXZlbnQpID0+IHtcbiAgICBpZiAoZXZlbnQuYnV0dG9uICE9PSAwIHx8IHdpbmRvdy5pbm5lcldpZHRoIDwgNzYwIHx8ICFldmVudC50YXJnZXQuY2xvc2VzdCgnaGVhZGVyJykpIHJldHVybjtcbiAgICBjb25zdCBpbnNwZWN0b3IgPSBpbnNwZWN0b3JSZWYuY3VycmVudDtcbiAgICBpZiAoIWluc3BlY3RvcikgcmV0dXJuO1xuICAgIGNvbnN0IHJlY3QgPSBpbnNwZWN0b3IuZ2V0Qm91bmRpbmdDbGllbnRSZWN0KCk7XG4gICAgY29uc3QgeyBtaW5Ub3AsIG1heEJvdHRvbSB9ID0gZ2V0SW5zcGVjdG9yVmVydGljYWxCb3VuZHMoaW5zcGVjdG9yLCB0aW1lbGluZU9wZW4pO1xuICAgIGNvbnN0IGF2YWlsYWJsZUhlaWdodCA9IG1heEJvdHRvbSAtIG1pblRvcDtcbiAgICBjb25zdCBmbG9hdGluZ0hlaWdodCA9IE1hdGgubWluKHJlY3QuaGVpZ2h0LCA1NjAsIE1hdGgubWF4KDI0MCwgYXZhaWxhYmxlSGVpZ2h0ICogMC43MikpO1xuICAgIGNvbnN0IHN0YXJ0ID0gY2xhbXBJbnNwZWN0b3JQb3NpdGlvbihpbnNwZWN0b3IsIHtcbiAgICAgIGxlZnQ6IHJlY3QubGVmdCxcbiAgICAgIHRvcDogcmVjdC50b3AsXG4gICAgICB3aWR0aDogcmVjdC53aWR0aCxcbiAgICAgIGhlaWdodDogZmxvYXRpbmdIZWlnaHQsXG4gICAgfSwgdGltZWxpbmVPcGVuKTtcbiAgICBkcmFnUmVmLmN1cnJlbnQgPSB7XG4gICAgICBwb2ludGVySWQ6IGV2ZW50LnBvaW50ZXJJZCxcbiAgICAgIG9yaWdpblg6IGV2ZW50LmNsaWVudFgsXG4gICAgICBvcmlnaW5ZOiBldmVudC5jbGllbnRZLFxuICAgICAgc3RhcnQsXG4gICAgICBtb3ZlZDogZmFsc2UsXG4gICAgfTtcbiAgICBpbnNwZWN0b3Iuc2V0UG9pbnRlckNhcHR1cmUoZXZlbnQucG9pbnRlcklkKTtcbiAgfTtcblxuICBjb25zdCBtb3ZlRHJhZyA9IChldmVudCkgPT4ge1xuICAgIGNvbnN0IGRyYWcgPSBkcmFnUmVmLmN1cnJlbnQ7XG4gICAgY29uc3QgaW5zcGVjdG9yID0gaW5zcGVjdG9yUmVmLmN1cnJlbnQ7XG4gICAgaWYgKCFkcmFnIHx8ICFpbnNwZWN0b3IgfHwgZHJhZy5wb2ludGVySWQgIT09IGV2ZW50LnBvaW50ZXJJZCkgcmV0dXJuO1xuICAgIGNvbnN0IGRlbHRhWCA9IGV2ZW50LmNsaWVudFggLSBkcmFnLm9yaWdpblg7XG4gICAgY29uc3QgZGVsdGFZID0gZXZlbnQuY2xpZW50WSAtIGRyYWcub3JpZ2luWTtcbiAgICBpZiAoIWRyYWcubW92ZWQgJiYgTWF0aC5oeXBvdChkZWx0YVgsIGRlbHRhWSkgPCAzKSByZXR1cm47XG4gICAgZHJhZy5tb3ZlZCA9IHRydWU7XG4gICAgc2V0RHJhZ2dpbmcodHJ1ZSk7XG4gICAgc2V0UG9zaXRpb24oY2xhbXBJbnNwZWN0b3JQb3NpdGlvbihpbnNwZWN0b3IsIHtcbiAgICAgIC4uLmRyYWcuc3RhcnQsXG4gICAgICBsZWZ0OiBkcmFnLnN0YXJ0LmxlZnQgKyBkZWx0YVgsXG4gICAgICB0b3A6IGRyYWcuc3RhcnQudG9wICsgZGVsdGFZLFxuICAgIH0sIHRpbWVsaW5lT3BlbikpO1xuICB9O1xuXG4gIGNvbnN0IGVuZERyYWcgPSAoZXZlbnQpID0+IHtcbiAgICBjb25zdCBkcmFnID0gZHJhZ1JlZi5jdXJyZW50O1xuICAgIGlmIChkcmFnPy5wb2ludGVySWQgIT09IGV2ZW50LnBvaW50ZXJJZCkgcmV0dXJuO1xuICAgIGlmICghZHJhZy5tb3ZlZCkge1xuICAgICAgY29uc3Qgbm93ID0gcGVyZm9ybWFuY2Uubm93KCk7XG4gICAgICBjb25zdCBwcmV2aW91cyA9IGxhc3RIZWFkZXJDbGlja1JlZi5jdXJyZW50O1xuICAgICAgaWYgKHByZXZpb3VzICYmIG5vdyAtIHByZXZpb3VzLnRpbWUgPCAzNjBcbiAgICAgICAgJiYgTWF0aC5oeXBvdChldmVudC5jbGllbnRYIC0gcHJldmlvdXMueCwgZXZlbnQuY2xpZW50WSAtIHByZXZpb3VzLnkpIDwgNikge1xuICAgICAgICBzZXRQb3NpdGlvbihudWxsKTtcbiAgICAgICAgbGFzdEhlYWRlckNsaWNrUmVmLmN1cnJlbnQgPSBudWxsO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgbGFzdEhlYWRlckNsaWNrUmVmLmN1cnJlbnQgPSB7IHRpbWU6IG5vdywgeDogZXZlbnQuY2xpZW50WCwgeTogZXZlbnQuY2xpZW50WSB9O1xuICAgICAgfVxuICAgIH1cbiAgICBkcmFnUmVmLmN1cnJlbnQgPSBudWxsO1xuICAgIHNldERyYWdnaW5nKGZhbHNlKTtcbiAgICBpZiAoaW5zcGVjdG9yUmVmLmN1cnJlbnQ/Lmhhc1BvaW50ZXJDYXB0dXJlKGV2ZW50LnBvaW50ZXJJZCkpIHtcbiAgICAgIGluc3BlY3RvclJlZi5jdXJyZW50LnJlbGVhc2VQb2ludGVyQ2FwdHVyZShldmVudC5wb2ludGVySWQpO1xuICAgIH1cbiAgfTtcblxuICBjb25zdCByZXNldFBvc2l0aW9uID0gKCkgPT4gc2V0UG9zaXRpb24obnVsbCk7XG5cbiAgcmV0dXJuIChcbiAgICA8YXNpZGVcbiAgICAgIHJlZj17aW5zcGVjdG9yUmVmfVxuICAgICAgY2xhc3NOYW1lPXtgYWJvdXQtZWRpdG9yLWluc3BlY3RvciR7ZHJhZ2dpbmcgPyAnIGlzLWRyYWdnaW5nJyA6ICcnfWB9XG4gICAgICBkYXRhLWZsb2F0aW5nPXtwb3NpdGlvbiA/ICd0cnVlJyA6ICdmYWxzZSd9XG4gICAgICBzdHlsZT17cG9zaXRpb24gPyB7XG4gICAgICAgIGxlZnQ6IHBvc2l0aW9uLmxlZnQsXG4gICAgICAgIHRvcDogcG9zaXRpb24udG9wLFxuICAgICAgICByaWdodDogJ2F1dG8nLFxuICAgICAgICBib3R0b206ICdhdXRvJyxcbiAgICAgICAgd2lkdGg6IHBvc2l0aW9uLndpZHRoLFxuICAgICAgICBoZWlnaHQ6IHBvc2l0aW9uLmhlaWdodCxcbiAgICAgIH0gOiB1bmRlZmluZWR9XG4gICAgICBvblBvaW50ZXJEb3duPXtiZWdpbkRyYWd9XG4gICAgICBvblBvaW50ZXJNb3ZlPXttb3ZlRHJhZ31cbiAgICAgIG9uUG9pbnRlclVwPXtlbmREcmFnfVxuICAgICAgb25Qb2ludGVyQ2FuY2VsPXtlbmREcmFnfVxuICAgICAgb25Eb3VibGVDbGljaz17cmVzZXRQb3NpdGlvbn1cbiAgICA+PGRpdiBjbGFzc05hbWU9XCJhYm91dC1lZGl0b3ItaW5zcGVjdG9yLXNjcm9sbFwiPntjb250ZW50fTxEaWFnbm9zdGljcyBkaWFnbm9zdGljcz17c25hcHNob3QuZGlhZ25vc3RpY3N9IC8+PC9kaXY+PC9hc2lkZT5cbiAgKTtcbn1cblxuZnVuY3Rpb24gQ2FtZXJhUGF0aE92ZXJsYXkoeyBzbmFwc2hvdCB9KSB7XG4gIGNvbnN0IHNlY3Rpb25zID0gc25hcHNob3QuY29tcGlsZWRQbGFuPy5zZWN0aW9ucyB8fCBbXTtcbiAgY29uc3QgdG90YWwgPSBzbmFwc2hvdC5jb21waWxlZFBsYW4/Lm1heFN0b3J5V1UgfHwgMTtcbiAgcmV0dXJuIChcbiAgICA8ZGl2IGNsYXNzTmFtZT1cImFib3V0LWVkaXRvci1wYXRoLW92ZXJsYXlcIiBhcmlhLWxhYmVsPVwiQ2FtZXJhIHBhdGggb3ZlcmxheVwiPlxuICAgICAgPGRpdj48c3Ryb25nPlBhdGggwrcgY29uc3RhbnQgY2FkZW5jZTwvc3Ryb25nPjxzcGFuPntmb3JtYXRXVShzbmFwc2hvdC50cmFuc3BvcnQuc3RvcnlXVSl9IC8ge2Zvcm1hdFdVKHRvdGFsKX08L3NwYW4+PC9kaXY+XG4gICAgICA8c3ZnIHZpZXdCb3g9XCIwIDAgMjQwIDExMlwiIHJvbGU9XCJpbWdcIiBhcmlhLWxhYmVsPVwiQ2FtZXJhIGFuZCBXb3JsZCBhbmNob3JzIG92ZXIgc3RvcnkgZGlzdGFuY2VcIj5cbiAgICAgICAgPHBhdGggZD1cIk0xOCA1NiBIMjIyXCIgLz5cbiAgICAgICAge3NlY3Rpb25zLm1hcCgoc2VjdGlvbikgPT4ge1xuICAgICAgICAgIGNvbnN0IHggPSAxOCArICgoc2VjdGlvbi5zdGFydFdVIC8gdG90YWwpICogMjA0KTtcbiAgICAgICAgICByZXR1cm4gPGcga2V5PXtzZWN0aW9uLmlkfSB0cmFuc2Zvcm09e2B0cmFuc2xhdGUoJHt4fSA1NilgfT48bGluZSB5MT1cIi0xMlwiIHkyPVwiMTJcIiAvPjxjaXJjbGUgcj17c2VjdGlvbi53b3JsZFN0YXRlPy5jaGFuZ2VzV29ybGQgPyA0IDogMn0gLz48dGl0bGU+e3NlY3Rpb24ubGFiZWx9e3NlY3Rpb24ud29ybGRTdGF0ZT8uY2hhbmdlc1dvcmxkID8gYCDCtyAke3NlY3Rpb24ud29ybGRTdGF0ZS5hY3RpdmVXb3JsZC5zaGFwZUlkfWAgOiAnJ308L3RpdGxlPjwvZz47XG4gICAgICAgIH0pfVxuICAgICAgICA8ZyBjbGFzc05hbWU9XCJpcy1wbGF5aGVhZFwiIHRyYW5zZm9ybT17YHRyYW5zbGF0ZSgkezE4ICsgKChzbmFwc2hvdC50cmFuc3BvcnQuc3RvcnlXVSAvIHRvdGFsKSAqIDIwNCl9IDU2KWB9PjxwYXRoIGQ9XCJNMCAtMjIgTDUgLTE1IEgtNSBaXCIgLz48bGluZSB5MT1cIi0xNVwiIHkyPVwiMjJcIiAvPjwvZz5cbiAgICAgIDwvc3ZnPlxuICAgICAgPHNtYWxsPkRvdHMgYXJlIFNlY3Rpb24gYm91bmRhcmllcy4gTGFyZ2UgZG90cyBhcmUgZml4ZWQgV29ybGQgYW5jaG9ycy4gVGhlIG1hcmtlciBpcyB0aGUgcHVibGlzaGVkIGNhbWVyYS48L3NtYWxsPlxuICAgIDwvZGl2PlxuICApO1xufVxuXG5leHBvcnQgZGVmYXVsdCBmdW5jdGlvbiBBYm91dE5hcnJhdGl2ZUVkaXRvcih7IHN0b3JlLCBydW50aW1lUmVmLCByb290UmVmIH0pIHtcbiAgY29uc3Qgc25hcHNob3QgPSB1c2VTeW5jRXh0ZXJuYWxTdG9yZShzdG9yZS5zdWJzY3JpYmUsIHN0b3JlLmdldFNuYXBzaG90KTtcbiAgY29uc3QgW2NoZWNrcG9pbnRzLCBzZXRDaGVja3BvaW50c10gPSB1c2VTdGF0ZSgoKSA9PiByZWFkQWJvdXROYXJyYXRpdmVDaGVja3BvaW50cygpKTtcbiAgY29uc3QgW3J1bnRpbWVNZXRyaWNzLCBzZXRSdW50aW1lTWV0cmljc10gPSB1c2VTdGF0ZShudWxsKTtcbiAgY29uc3QgW3BhdGhWaXNpYmxlLCBzZXRQYXRoVmlzaWJsZV0gPSB1c2VTdGF0ZShmYWxzZSk7XG4gIGNvbnN0IFtkaXJlY3RvclZpZXcsIHNldERpcmVjdG9yVmlld10gPSB1c2VTdGF0ZShmYWxzZSk7XG4gIGNvbnN0IFttb2JpbGVQYW5lLCBzZXRNb2JpbGVQYW5lXSA9IHVzZVN0YXRlKCdzZXF1ZW5jZScpO1xuICBjb25zdCBbdGltZWxpbmVPcGVuLCBzZXRUaW1lbGluZU9wZW5dID0gdXNlU3RhdGUoKCkgPT4gKFxuICAgIHdpbmRvdy5sb2NhbFN0b3JhZ2UuZ2V0SXRlbShBQk9VVF9FRElUT1JfVElNRUxJTkVfU1RPUkFHRV9LRVkpICE9PSAnY2xvc2VkJ1xuICApKTtcbiAgY29uc3QgaW1wb3J0UmVmID0gdXNlUmVmKG51bGwpO1xuICBjb25zdCBzbmFwc2hvdFJlZiA9IHVzZVJlZihzbmFwc2hvdCk7XG4gIGNvbnN0IGFjdGl2ZVNlbGVjdGlvbiA9IHNuYXBzaG90LnNlbGVjdGlvbjtcblxuICB1c2VFZmZlY3QoKCkgPT4ge1xuICAgIHNuYXBzaG90UmVmLmN1cnJlbnQgPSBzbmFwc2hvdDtcbiAgfSwgW3NuYXBzaG90XSk7XG5cbiAgdXNlRWZmZWN0KCgpID0+IHtcbiAgICB3aW5kb3cubG9jYWxTdG9yYWdlLnNldEl0ZW0oQUJPVVRfRURJVE9SX1RJTUVMSU5FX1NUT1JBR0VfS0VZLCB0aW1lbGluZU9wZW4gPyAnb3BlbicgOiAnY2xvc2VkJyk7XG4gIH0sIFt0aW1lbGluZU9wZW5dKTtcblxuICB1c2VFZmZlY3QoKCkgPT4ge1xuICAgIGNvbnN0IHJvb3QgPSByb290UmVmLmN1cnJlbnQ7XG4gICAgY29uc3QgcnVudGltZSA9IHJ1bnRpbWVSZWYuY3VycmVudDtcbiAgICByb290Py5zZXRBdHRyaWJ1dGUoJ2RhdGEtZWRpdG9yLWFjdGl2ZScsICd0cnVlJyk7XG4gICAgbG9hZEFib3V0TmFycmF0aXZlU291cmNlKCkudGhlbigoeyBkb2N1bWVudCwgaGFzaCB9KSA9PiB7XG4gICAgICBjb25zdCBjdXJyZW50ID0gc3RvcmUuZ2V0U25hcHNob3QoKTtcbiAgICAgIGlmICghY3VycmVudC5kaXJ0eSkgc3RvcmUucmVwbGFjZURvY3VtZW50KCdSZWZyZXNoIGNhbm9uaWNhbCBzb3VyY2UnLCBkb2N1bWVudCk7XG4gICAgICBzdG9yZS5zZXRCYXNlbGluZShkb2N1bWVudCwgaGFzaCk7XG4gICAgICBjb25zdCByZWNvdmVyeSA9IHJlYWRBYm91dE5hcnJhdGl2ZVJlY292ZXJ5RHJhZnQoKTtcbiAgICAgIGlmIChyZWNvdmVyeSAmJiByZWNvdmVyeS50aW1lc3RhbXAgPiBEYXRlLm5vdygpIC0gKDE0ICogODY0MDAwMDApKSB7XG4gICAgICAgIHN0b3JlLnNldFJlY292ZXJ5U3RhdGUoeyBhdmFpbGFibGU6IHRydWUsIGRyYWZ0OiByZWNvdmVyeSwgZXJyb3I6ICcnIH0pO1xuICAgICAgfVxuICAgIH0pLmNhdGNoKChlcnJvcikgPT4gc3RvcmUuc2V0U2F2ZVN0YXRlKHsgc3RhdHVzOiAnZmFpbGVkJywgbWVzc2FnZTogZXJyb3IubWVzc2FnZSB9KSk7XG4gICAgcmV0dXJuICgpID0+IHtcbiAgICAgIHJvb3Q/LnJlbW92ZUF0dHJpYnV0ZSgnZGF0YS1lZGl0b3ItYWN0aXZlJyk7XG4gICAgICBydW50aW1lPy5zZXREaXJlY3RvclZpZXc/LihmYWxzZSk7XG4gICAgfTtcbiAgfSwgW3Jvb3RSZWYsIHJ1bnRpbWVSZWYsIHN0b3JlXSk7XG5cbiAgdXNlRWZmZWN0KCgpID0+IHtcbiAgICBjb25zdCByb290ID0gcm9vdFJlZi5jdXJyZW50O1xuICAgIGlmICghcm9vdCkgcmV0dXJuIHVuZGVmaW5lZDtcbiAgICByb290LnF1ZXJ5U2VsZWN0b3JBbGwoJy5pcy1lZGl0b3Itc2VsZWN0ZWQnKS5mb3JFYWNoKChub2RlKSA9PiBub2RlLmNsYXNzTGlzdC5yZW1vdmUoJ2lzLWVkaXRvci1zZWxlY3RlZCcpKTtcbiAgICBnZXRBYm91dE5hcnJhdGl2ZVNlbGVjdGlvbk1lbWJlcnMoYWN0aXZlU2VsZWN0aW9uKS5mb3JFYWNoKChtZW1iZXIpID0+IHtcbiAgICAgIHJvb3QucXVlcnlTZWxlY3RvcihgW2RhdGEtdGV4dC1jdWU9XCIke0NTUy5lc2NhcGUobWVtYmVyLmN1ZUlkKX1cIl1gKT8uY2xhc3NMaXN0LmFkZCgnaXMtZWRpdG9yLXNlbGVjdGVkJyk7XG4gICAgfSk7XG4gICAgcm9vdC5kYXRhc2V0LmVkaXRvclNlbGVjdGlvblR5cGUgPSBhY3RpdmVTZWxlY3Rpb24udHlwZSB8fCAnJztcbiAgICByZXR1cm4gKCkgPT4ge1xuICAgICAgcm9vdC5xdWVyeVNlbGVjdG9yQWxsKCcuaXMtZWRpdG9yLXNlbGVjdGVkJykuZm9yRWFjaCgobm9kZSkgPT4gbm9kZS5jbGFzc0xpc3QucmVtb3ZlKCdpcy1lZGl0b3Itc2VsZWN0ZWQnKSk7XG4gICAgICBkZWxldGUgcm9vdC5kYXRhc2V0LmVkaXRvclNlbGVjdGlvblR5cGU7XG4gICAgfTtcbiAgfSwgW2FjdGl2ZVNlbGVjdGlvbiwgcm9vdFJlZl0pO1xuXG4gIHVzZUVmZmVjdCgoKSA9PiB7XG4gICAgY29uc3QgaW50ZXJ2YWwgPSB3aW5kb3cuc2V0SW50ZXJ2YWwoKCkgPT4gc2V0UnVudGltZU1ldHJpY3MocnVudGltZVJlZi5jdXJyZW50Py5nZXRNZXRyaWNzPy4oKSB8fCBudWxsKSwgNTAwKTtcbiAgICByZXR1cm4gKCkgPT4gd2luZG93LmNsZWFySW50ZXJ2YWwoaW50ZXJ2YWwpO1xuICB9LCBbcnVudGltZVJlZl0pO1xuXG4gIHVzZUVmZmVjdCgoKSA9PiB7XG4gICAgaWYgKCFzbmFwc2hvdC5kaXJ0eSkgcmV0dXJuIHVuZGVmaW5lZDtcbiAgICBjb25zdCB0aW1lciA9IHdpbmRvdy5zZXRUaW1lb3V0KCgpID0+IHtcbiAgICAgIHRyeSB7XG4gICAgICAgIHdyaXRlQWJvdXROYXJyYXRpdmVSZWNvdmVyeURyYWZ0KHNuYXBzaG90LmRvY3VtZW50LCBzbmFwc2hvdC5iYXNlbGluZUhhc2gpO1xuICAgICAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICAgICAgc3RvcmUuc2V0UmVjb3ZlcnlTdGF0ZSh7IGVycm9yOiBgRHJhZnQgc3RvcmFnZSBmYWlsZWQ6ICR7ZXJyb3IubWVzc2FnZX1gIH0pO1xuICAgICAgfVxuICAgIH0sIDkwMCk7XG4gICAgcmV0dXJuICgpID0+IHdpbmRvdy5jbGVhclRpbWVvdXQodGltZXIpO1xuICB9LCBbc25hcHNob3QuYmFzZWxpbmVIYXNoLCBzbmFwc2hvdC5kaXJ0eSwgc25hcHNob3QuZG9jdW1lbnQsIHN0b3JlXSk7XG5cbiAgdXNlRWZmZWN0KCgpID0+IHtcbiAgICBjb25zdCBwYWdlaGlkZSA9ICgpID0+IHtcbiAgICAgIGNvbnN0IGN1cnJlbnQgPSBzbmFwc2hvdFJlZi5jdXJyZW50O1xuICAgICAgaWYgKGN1cnJlbnQuZGlydHkpIHtcbiAgICAgICAgdHJ5IHsgd3JpdGVBYm91dE5hcnJhdGl2ZVJlY292ZXJ5RHJhZnQoY3VycmVudC5kb2N1bWVudCwgY3VycmVudC5iYXNlbGluZUhhc2gpOyB9IGNhdGNoIHsgLyogc3VyZmFjZWQgYnkgbm9ybWFsIGF1dG9zYXZlICovIH1cbiAgICAgIH1cbiAgICB9O1xuICAgIGNvbnN0IGtleWRvd24gPSAoZXZlbnQpID0+IHtcbiAgICAgIGlmICgoZXZlbnQubWV0YUtleSB8fCBldmVudC5jdHJsS2V5KSAmJiBldmVudC5rZXkudG9Mb3dlckNhc2UoKSA9PT0gJ3MnKSB7XG4gICAgICAgIGV2ZW50LnByZXZlbnREZWZhdWx0KCk7XG4gICAgICAgIGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3IoJ1tkYXRhLWFib3V0LWVkaXRvci1zYXZlXScpPy5jbGljaygpO1xuICAgICAgfVxuICAgICAgaWYgKChldmVudC5tZXRhS2V5IHx8IGV2ZW50LmN0cmxLZXkpICYmIGV2ZW50LmtleS50b0xvd2VyQ2FzZSgpID09PSAneicpIHtcbiAgICAgICAgZXZlbnQucHJldmVudERlZmF1bHQoKTtcbiAgICAgICAgZXZlbnQuc2hpZnRLZXkgPyBzdG9yZS5yZWRvKCkgOiBzdG9yZS51bmRvKCk7XG4gICAgICB9XG4gICAgICBpZiAoIWV2ZW50Lm1ldGFLZXkgJiYgIWV2ZW50LmN0cmxLZXkgJiYgIWV2ZW50LmFsdEtleSAmJiAhZXZlbnQuc2hpZnRLZXlcbiAgICAgICAgJiYgIWlzVGV4dEVkaXRpbmdUYXJnZXQoZXZlbnQudGFyZ2V0KSAmJiBbJ0Fycm93TGVmdCcsICdBcnJvd1JpZ2h0J10uaW5jbHVkZXMoZXZlbnQua2V5KSkge1xuICAgICAgICBldmVudC5wcmV2ZW50RGVmYXVsdCgpO1xuICAgICAgICBqdW1wVGltZWxpbmVLZXlmcmFtZShzdG9yZSwgc3RvcmUuZ2V0U25hcHNob3QoKSwgZXZlbnQua2V5ID09PSAnQXJyb3dSaWdodCcgPyAxIDogLTEpO1xuICAgICAgfVxuICAgICAgaWYgKCFldmVudC5tZXRhS2V5ICYmICFldmVudC5jdHJsS2V5ICYmICFldmVudC5hbHRLZXlcbiAgICAgICAgJiYgIWlzVGV4dEVkaXRpbmdUYXJnZXQoZXZlbnQudGFyZ2V0KSAmJiBbJ0JhY2tzcGFjZScsICdEZWxldGUnXS5pbmNsdWRlcyhldmVudC5rZXkpXG4gICAgICAgICYmIGRlbGV0ZVRpbWVsaW5lU2VsZWN0aW9uKHN0b3JlLCBzdG9yZS5nZXRTbmFwc2hvdCgpKSkge1xuICAgICAgICBldmVudC5wcmV2ZW50RGVmYXVsdCgpO1xuICAgICAgfVxuICAgICAgaWYgKGV2ZW50LmtleSA9PT0gJ0VzY2FwZScpIHtcbiAgICAgICAgY29uc3QgY3VycmVudCA9IHN0b3JlLmdldFNuYXBzaG90KCk7XG4gICAgICAgIGlmIChjdXJyZW50LnByZXZpZXdTdGF0ZSkgc3RvcmUuY2FuY2VsUHJldmlldygpO1xuICAgICAgICBlbHNlIGlmIChjdXJyZW50LnRyeVN0YXRlKSBzdG9yZS5jYW5jZWxUcnkoKTtcbiAgICAgICAgZWxzZSBpZiAoZ2V0QWJvdXROYXJyYXRpdmVTZWxlY3Rpb25NZW1iZXJzKGN1cnJlbnQuc2VsZWN0aW9uKS5sZW5ndGggPiAxKSB7XG4gICAgICAgICAgc3RvcmUuc2V0U2VsZWN0aW9uKHtcbiAgICAgICAgICAgIHR5cGU6ICdjdWUnLFxuICAgICAgICAgICAgc2VjdGlvbklkOiBjdXJyZW50LnNlbGVjdGlvbi5zZWN0aW9uSWQsXG4gICAgICAgICAgICBjdWVJZDogY3VycmVudC5zZWxlY3Rpb24uY3VlSWQsXG4gICAgICAgICAgICBrZXlQYXJ0OiBjdXJyZW50LnNlbGVjdGlvbi5rZXlQYXJ0IHx8ICdmb2N1cycsXG4gICAgICAgICAgfSk7XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSBpZiAoY3VycmVudC5zZWxlY3Rpb24udHlwZSAhPT0gJ3NlY3Rpb24nKSBzdG9yZS5zZXRTZWxlY3Rpb24oeyB0eXBlOiAnc2VjdGlvbicsIHNlY3Rpb25JZDogY3VycmVudC5zZWxlY3Rpb24uc2VjdGlvbklkIH0pO1xuICAgICAgICBlbHNlIHN0b3JlLnNldFNlbGVjdGlvbih7IHR5cGU6ICdzZXF1ZW5jZScgfSk7XG4gICAgICB9XG4gICAgfTtcbiAgICB3aW5kb3cuYWRkRXZlbnRMaXN0ZW5lcigncGFnZWhpZGUnLCBwYWdlaGlkZSk7XG4gICAgd2luZG93LmFkZEV2ZW50TGlzdGVuZXIoJ2tleWRvd24nLCBrZXlkb3duKTtcbiAgICByZXR1cm4gKCkgPT4geyB3aW5kb3cucmVtb3ZlRXZlbnRMaXN0ZW5lcigncGFnZWhpZGUnLCBwYWdlaGlkZSk7IHdpbmRvdy5yZW1vdmVFdmVudExpc3RlbmVyKCdrZXlkb3duJywga2V5ZG93bik7IH07XG4gIH0sIFtzdG9yZV0pO1xuXG4gIGNvbnN0IHNhdmUgPSBhc3luYyAoKSA9PiB7XG4gICAgY29uc3QgZWRpdG9yVXJsID0gbmV3IFVSTCh3aW5kb3cubG9jYXRpb24uaHJlZik7XG4gICAgZWRpdG9yVXJsLnNlYXJjaFBhcmFtcy5zZXQoJ2VkaXQnLCAnMScpO1xuICAgIHdpbmRvdy5oaXN0b3J5LnJlcGxhY2VTdGF0ZSh3aW5kb3cuaGlzdG9yeS5zdGF0ZSwgJycsIGAke2VkaXRvclVybC5wYXRobmFtZX0ke2VkaXRvclVybC5zZWFyY2h9JHtlZGl0b3JVcmwuaGFzaH1gKTtcbiAgICBjb25zdCBzZW50ID0gY2xvbmVBYm91dE5hcnJhdGl2ZURvY3VtZW50KHNuYXBzaG90LmRvY3VtZW50KTtcbiAgICBpZiAoc25hcHNob3QuZGlhZ25vc3RpY3Muc29tZSgoaXRlbSkgPT4gaXRlbS5sZXZlbCA9PT0gJ2Vycm9yJykpIHtcbiAgICAgIHN0b3JlLnNldFNhdmVTdGF0ZSh7IHN0YXR1czogJ2ZhaWxlZCcsIG1lc3NhZ2U6ICdSZXNvbHZlIHZhbGlkYXRpb24gZXJyb3JzIGJlZm9yZSBzYXZpbmcuJyB9KTtcbiAgICAgIHJldHVybjtcbiAgICB9XG4gICAgc3RvcmUuc2V0U2F2ZVN0YXRlKHsgc3RhdHVzOiAnc2F2aW5nJywgbWVzc2FnZTogJycgfSk7XG4gICAgdHJ5IHtcbiAgICAgIGNvbnN0IHJlc3VsdCA9IGF3YWl0IHNhdmVBYm91dE5hcnJhdGl2ZVNvdXJjZShzZW50LCBzbmFwc2hvdC5iYXNlbGluZUhhc2gpO1xuICAgICAgc3RvcmUubWFya1NhdmVkKHNlbnQsIHJlc3VsdC5oYXNoKTtcbiAgICAgIGNsZWFyQWJvdXROYXJyYXRpdmVSZWNvdmVyeURyYWZ0KCk7XG4gICAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICAgIHN0b3JlLnNldFNhdmVTdGF0ZSh7IHN0YXR1czogZXJyb3Iuc3RhdHVzID09PSA0MDkgPyAnY29uZmxpY3QnIDogJ2ZhaWxlZCcsIG1lc3NhZ2U6IGVycm9yLm1lc3NhZ2UgfSk7XG4gICAgfVxuICB9O1xuXG4gIGNvbnN0IGFkZENoZWNrcG9pbnQgPSAoKSA9PiB7XG4gICAgY29uc3QgY2hlY2twb2ludCA9IHtcbiAgICAgIGlkOiBjcnlwdG8ucmFuZG9tVVVJRCgpLFxuICAgICAgbmFtZTogYENoZWNrcG9pbnQgJHtuZXcgRGF0ZSgpLnRvTG9jYWxlVGltZVN0cmluZyhbXSwgeyBob3VyOiAnMi1kaWdpdCcsIG1pbnV0ZTogJzItZGlnaXQnIH0pfWAsXG4gICAgICB0aW1lc3RhbXA6IERhdGUubm93KCksXG4gICAgICBzdG9yeVdVOiBzbmFwc2hvdC50cmFuc3BvcnQuc3RvcnlXVSxcbiAgICAgIGJhc2VTb3VyY2VIYXNoOiBzbmFwc2hvdC5iYXNlbGluZUhhc2gsXG4gICAgICBkb2N1bWVudDogc25hcHNob3QuZG9jdW1lbnQsXG4gICAgfTtcbiAgICBzZXRDaGVja3BvaW50cyh3cml0ZUFib3V0TmFycmF0aXZlQ2hlY2twb2ludChjaGVja3BvaW50KSk7XG4gIH07XG4gIGNvbnN0IHN0YXR1c0xhYmVsID0gc25hcHNob3Quc2F2ZVN0YXRlLnN0YXR1cyA9PT0gJ3NhdmluZycgPyAnU2F2aW5n4oCmJ1xuICAgIDogc25hcHNob3Quc2F2ZVN0YXRlLnN0YXR1cyA9PT0gJ2NvbmZsaWN0JyA/ICdTb3VyY2UgY2hhbmdlZCdcbiAgICAgIDogc25hcHNob3Quc2F2ZVN0YXRlLnN0YXR1cyA9PT0gJ2ZhaWxlZCcgPyAnU2F2ZSBmYWlsZWQnXG4gICAgICAgIDogc25hcHNob3QuZGlydHkgPyAnRHJhZnQnIDogJ1NhdmVkJztcbiAgY29uc3Qgc2VsZWN0ZWQgPSBnZXRTZWN0aW9uKHNuYXBzaG90LmRvY3VtZW50LCBzbmFwc2hvdC5zZWxlY3Rpb24pO1xuICBjb25zdCBjb21waWxlZFNlbGVjdGVkID0gc25hcHNob3QuY29tcGlsZWRQbGFuPy5zZWN0aW9ucy5maW5kKChzZWN0aW9uKSA9PiBzZWN0aW9uLmlkID09PSBzZWxlY3RlZD8uaWQpO1xuICBjb25zdCByZXNvbHZlZEV4dGVudCA9IGNvbXBpbGVkU2VsZWN0ZWQ/LnJlc29sdmVkRXh0ZW50V1UgfHwgc2VsZWN0ZWQ/LmV4dGVudFdVIHx8IDA7XG4gIGNvbnN0IHNlbGVjdGVkRXh0ZW50ID0gc2VsZWN0ZWRcbiAgICA/IE51bWJlcihzbmFwc2hvdC5wcmV2aWV3UHJvZmlsZSA9PT0gJ21vYmlsZScgPyBzZWxlY3RlZC5tb2JpbGVFeHRlbnRXVSA6IHNlbGVjdGVkLmV4dGVudFdVKVxuICAgIDogMDtcbiAgY29uc3Qgc2VsZWN0ZWRDdWVDb3VudCA9IGdldEFib3V0TmFycmF0aXZlU2VsZWN0aW9uTWVtYmVycyhzbmFwc2hvdC5zZWxlY3Rpb24pLmxlbmd0aDtcbiAgY29uc3QgbG9vcEFjdGl2ZSA9IEJvb2xlYW4oc25hcHNob3QudHJhbnNwb3J0Lmxvb3A/LnNlY3Rpb25JZCA9PT0gc2VsZWN0ZWQ/LmlkKTtcbiAgY29uc3QgdGltZWxpbmVEZWxldGlvbiA9IGdldFRpbWVsaW5lRGVsZXRpb24oc25hcHNob3QpO1xuICBjb25zdCB0b2dnbGVMb29wID0gKCkgPT4gc3RvcmUuc2V0VHJhbnNwb3J0KHtcbiAgICBsb29wOiBsb29wQWN0aXZlIHx8ICFjb21waWxlZFNlbGVjdGVkID8gbnVsbCA6IHtcbiAgICAgIHNlY3Rpb25JZDogc2VsZWN0ZWQuaWQsXG4gICAgICBzdGFydFdVOiBjb21waWxlZFNlbGVjdGVkLnN0YXJ0V1UsXG4gICAgICBlbmRXVTogY29tcGlsZWRTZWxlY3RlZC5zdGFydFdVICsgY29tcGlsZWRTZWxlY3RlZC50cmF2ZWxXVSxcbiAgICB9LFxuICB9KTtcbiAgY29uc3QgdG9nZ2xlU29sbyA9ICh0cmFjaykgPT4gc3RvcmUuc2V0VHJhbnNwb3J0KHtcbiAgICBzb2xvVHJhY2s6IHNuYXBzaG90LnRyYW5zcG9ydC5zb2xvVHJhY2sgPT09IHRyYWNrID8gbnVsbCA6IHRyYWNrLFxuICB9KTtcbiAgY29uc3QgZml0U2VxdWVuY2UgPSAoKSA9PiB7XG4gICAgc3RvcmUuc2V0VHJhbnNwb3J0KHsgem9vbTogMSB9KTtcbiAgICByZXF1ZXN0QW5pbWF0aW9uRnJhbWUoKCkgPT4ge1xuICAgICAgY29uc3QgbGFuZXMgPSBkb2N1bWVudC5xdWVyeVNlbGVjdG9yKCcuYWJvdXQtZWRpdG9yLWxhbmVzJyk7XG4gICAgICBpZiAobGFuZXMpIGxhbmVzLnNjcm9sbExlZnQgPSAwO1xuICAgIH0pO1xuICB9O1xuICBjb25zdCBmaXRTZWN0aW9uID0gKCkgPT4ge1xuICAgIGlmICghY29tcGlsZWRTZWxlY3RlZCB8fCAhc25hcHNob3QuY29tcGlsZWRQbGFuPy5tYXhTdG9yeVdVKSByZXR1cm47XG4gICAgY29uc3Qgc2VjdGlvblNwYW4gPSBNYXRoLm1heCgwLjAwMSwgY29tcGlsZWRTZWxlY3RlZC5yZXNvbHZlZEV4dGVudFdVKTtcbiAgICBjb25zdCB6b29tID0gTWF0aC5taW4oOCwgTWF0aC5tYXgoMSwgKHNuYXBzaG90LmNvbXBpbGVkUGxhbi5tYXhTdG9yeVdVIC8gc2VjdGlvblNwYW4pICogMC44MikpO1xuICAgIHN0b3JlLnNldFRyYW5zcG9ydCh7IHpvb206IE51bWJlcih6b29tLnRvRml4ZWQoMykpIH0pO1xuICAgIHJlcXVlc3RBbmltYXRpb25GcmFtZSgoKSA9PiB7XG4gICAgICBjb25zdCBsYW5lcyA9IGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3IoJy5hYm91dC1lZGl0b3ItbGFuZXMnKTtcbiAgICAgIGlmICghbGFuZXMpIHJldHVybjtcbiAgICAgIGNvbnN0IHN0YXJ0UmF0aW8gPSBjb21waWxlZFNlbGVjdGVkLnN0YXJ0V1UgLyBzbmFwc2hvdC5jb21waWxlZFBsYW4ubWF4U3RvcnlXVTtcbiAgICAgIGxhbmVzLnNjcm9sbExlZnQgPSBNYXRoLm1heCgwLCAoc3RhcnRSYXRpbyAqIGxhbmVzLnNjcm9sbFdpZHRoKSAtIChsYW5lcy5jbGllbnRXaWR0aCAqIDAuMDgpKTtcbiAgICB9KTtcbiAgfTtcbiAgY29uc3QgdG9nZ2xlRGlyZWN0b3IgPSAoKSA9PiB7XG4gICAgY29uc3QgbmV4dCA9ICFkaXJlY3RvclZpZXc7XG4gICAgc2V0RGlyZWN0b3JWaWV3KG5leHQpO1xuICAgIHJ1bnRpbWVSZWYuY3VycmVudD8uc2V0RGlyZWN0b3JWaWV3Py4obmV4dCk7XG4gIH07XG4gIGNvbnN0IHRvZ2dsZUJlZm9yZSA9ICgpID0+IHtcbiAgICBpZiAoc25hcHNob3QudHJ5U3RhdGU/LmxhYmVsID09PSAnQ29tcGFyZSBzYXZlZCBzb3VyY2UnKSB7XG4gICAgICBzdG9yZS5jYW5jZWxUcnkoKTtcbiAgICAgIHJldHVybjtcbiAgICB9XG4gICAgaWYgKHNuYXBzaG90LnRyeVN0YXRlKSByZXR1cm47XG4gICAgc3RvcmUuYmVnaW5UcnkoJ0NvbXBhcmUgc2F2ZWQgc291cmNlJywgKGRyYWZ0KSA9PiB7XG4gICAgICBPYmplY3Qua2V5cyhkcmFmdCkuZm9yRWFjaCgoa2V5KSA9PiBkZWxldGUgZHJhZnRba2V5XSk7XG4gICAgICBPYmplY3QuYXNzaWduKGRyYWZ0LCBjbG9uZUFib3V0TmFycmF0aXZlRG9jdW1lbnQoc25hcHNob3QuYmFzZWxpbmVEb2N1bWVudCkpO1xuICAgIH0pO1xuICB9O1xuXG4gIHJldHVybiBjcmVhdGVQb3J0YWwoKFxuICAgIDxkaXZcbiAgICAgIGNsYXNzTmFtZT1cImFib3V0LWVkaXRvclwiXG4gICAgICBkYXRhLW1vYmlsZS1wYW5lPXttb2JpbGVQYW5lfVxuICAgICAgZGF0YS10aW1lbGluZS1vcGVuPXt0aW1lbGluZU9wZW4gPyAndHJ1ZScgOiAnZmFsc2UnfVxuICAgICAgcm9sZT1cInJlZ2lvblwiXG4gICAgICBhcmlhLWxhYmVsPVwiQWJvdXQgTmFycmF0aXZlIGNyZWF0aXZlIHRvb2xraXRcIlxuICAgID5cbiAgICAgIDxoZWFkZXIgY2xhc3NOYW1lPVwiYWJvdXQtZWRpdG9yLXRvcGJhclwiPlxuICAgICAgICA8YnV0dG9uIHR5cGU9XCJidXR0b25cIiBjbGFzc05hbWU9XCJhYm91dC1lZGl0b3ItYnJhbmRcIiBvbkNsaWNrPXsoKSA9PiBzdG9yZS5zZXRTZWxlY3Rpb24oeyB0eXBlOiAnc2VxdWVuY2UnIH0pfT48RGlhbW9uZCBhcmlhLWhpZGRlbj1cInRydWVcIiAvPjxzcGFuPkFib3V0IE5hcnJhdGl2ZTwvc3Bhbj48c21hbGw+Q3JlYXRpdmUgdG9vbGtpdDwvc21hbGw+PC9idXR0b24+XG4gICAgICAgIDxUcmFuc3BvcnQgc3RvcmU9e3N0b3JlfSBzbmFwc2hvdD17c25hcHNob3R9IC8+XG4gICAgICAgIDxkaXYgY2xhc3NOYW1lPVwiYWJvdXQtZWRpdG9yLWFjdGlvbnNcIj5cbiAgICAgICAgICA8YnV0dG9uIHR5cGU9XCJidXR0b25cIiBkaXNhYmxlZD17IXNuYXBzaG90Lmhpc3RvcnkuY2FuVW5kb30gdGl0bGU9e3NuYXBzaG90Lmhpc3RvcnkudW5kb0xhYmVsIHx8ICdVbmRvJ30gYXJpYS1sYWJlbD1cIlVuZG9cIiBvbkNsaWNrPXsoKSA9PiBzdG9yZS51bmRvKCl9PjxzcGFuIGFyaWEtaGlkZGVuPVwidHJ1ZVwiPuKGtjwvc3Bhbj48L2J1dHRvbj5cbiAgICAgICAgICA8YnV0dG9uIHR5cGU9XCJidXR0b25cIiBkaXNhYmxlZD17IXNuYXBzaG90Lmhpc3RvcnkuY2FuUmVkb30gdGl0bGU9e3NuYXBzaG90Lmhpc3RvcnkucmVkb0xhYmVsIHx8ICdSZWRvJ30gYXJpYS1sYWJlbD1cIlJlZG9cIiBvbkNsaWNrPXsoKSA9PiBzdG9yZS5yZWRvKCl9PjxzcGFuIGFyaWEtaGlkZGVuPVwidHJ1ZVwiPuKGtzwvc3Bhbj48L2J1dHRvbj5cbiAgICAgICAgICA8YnV0dG9uIHR5cGU9XCJidXR0b25cIiBjbGFzc05hbWU9e3BhdGhWaXNpYmxlID8gJ2lzLWFjdGl2ZScgOiAnJ30gb25DbGljaz17KCkgPT4gc2V0UGF0aFZpc2libGUoIXBhdGhWaXNpYmxlKX0+UGF0aDwvYnV0dG9uPlxuICAgICAgICAgIDxidXR0b24gdHlwZT1cImJ1dHRvblwiIGNsYXNzTmFtZT17ZGlyZWN0b3JWaWV3ID8gJ2lzLWFjdGl2ZScgOiAnJ30gb25DbGljaz17dG9nZ2xlRGlyZWN0b3J9PntkaXJlY3RvclZpZXcgPyAnRGlyZWN0b3InIDogJ0NhbWVyYSd9PC9idXR0b24+XG4gICAgICAgICAgPGJ1dHRvbiB0eXBlPVwiYnV0dG9uXCIgY2xhc3NOYW1lPXtzbmFwc2hvdC50cnlTdGF0ZT8ubGFiZWwgPT09ICdDb21wYXJlIHNhdmVkIHNvdXJjZScgPyAnaXMtYWN0aXZlJyA6ICcnfSBkaXNhYmxlZD17c25hcHNob3QudHJ5U3RhdGUgJiYgc25hcHNob3QudHJ5U3RhdGUubGFiZWwgIT09ICdDb21wYXJlIHNhdmVkIHNvdXJjZSd9IG9uQ2xpY2s9e3RvZ2dsZUJlZm9yZX0+e3NuYXBzaG90LnRyeVN0YXRlPy5sYWJlbCA9PT0gJ0NvbXBhcmUgc2F2ZWQgc291cmNlJyA/ICdCZWZvcmUnIDogJ0FmdGVyJ308L2J1dHRvbj5cbiAgICAgICAgICA8ZGV0YWlscyBjbGFzc05hbWU9XCJhYm91dC1lZGl0b3ItbW9yZVwiPlxuICAgICAgICAgICAgPHN1bW1hcnk+TW9yZTwvc3VtbWFyeT5cbiAgICAgICAgICAgIDxkaXY+XG4gICAgICAgICAgICAgIDxidXR0b24gdHlwZT1cImJ1dHRvblwiIG9uQ2xpY2s9e2FkZENoZWNrcG9pbnR9PkNoZWNrcG9pbnQ8L2J1dHRvbj5cbiAgICAgICAgICAgICAgPGJ1dHRvbiB0eXBlPVwiYnV0dG9uXCIgb25DbGljaz17KCkgPT4gZXhwb3J0QWJvdXROYXJyYXRpdmVEb2N1bWVudChzbmFwc2hvdC5kb2N1bWVudCl9PkV4cG9ydCBKU09OPC9idXR0b24+XG4gICAgICAgICAgICAgIDxidXR0b24gdHlwZT1cImJ1dHRvblwiIG9uQ2xpY2s9eygpID0+IGltcG9ydFJlZi5jdXJyZW50Py5jbGljaygpfT5JbXBvcnQgSlNPTjwvYnV0dG9uPlxuICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgPC9kZXRhaWxzPlxuICAgICAgICAgIDxpbnB1dCByZWY9e2ltcG9ydFJlZn0gaGlkZGVuIHR5cGU9XCJmaWxlXCIgYWNjZXB0PVwiYXBwbGljYXRpb24vanNvblwiIG9uQ2hhbmdlPXthc3luYyAoZXZlbnQpID0+IHtcbiAgICAgICAgICAgIGNvbnN0IGZpbGUgPSBldmVudC50YXJnZXQuZmlsZXM/LlswXTtcbiAgICAgICAgICAgIGlmICghZmlsZSkgcmV0dXJuO1xuICAgICAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgICAgY29uc3QgaW1wb3J0ZWQgPSBKU09OLnBhcnNlKGF3YWl0IGZpbGUudGV4dCgpKTtcbiAgICAgICAgICAgICAgYXNzZXJ0VmFsaWRBYm91dE5hcnJhdGl2ZURvY3VtZW50KGltcG9ydGVkKTtcbiAgICAgICAgICAgICAgc3RvcmUucmVwbGFjZURvY3VtZW50KCdJbXBvcnQgZG9jdW1lbnQnLCBpbXBvcnRlZCk7XG4gICAgICAgICAgICB9IGNhdGNoIChlcnJvcikgeyBzdG9yZS5zZXRTYXZlU3RhdGUoeyBzdGF0dXM6ICdmYWlsZWQnLCBtZXNzYWdlOiBlcnJvci5tZXNzYWdlIH0pOyB9XG4gICAgICAgICAgICBldmVudC50YXJnZXQudmFsdWUgPSAnJztcbiAgICAgICAgICB9fSAvPlxuICAgICAgICAgIDxidXR0b24gdHlwZT1cImJ1dHRvblwiIGRhdGEtYWJvdXQtZWRpdG9yLXNhdmUgY2xhc3NOYW1lPVwiaXMtc2F2ZVwiIGRpc2FibGVkPXtzbmFwc2hvdC5zYXZlU3RhdGUuc3RhdHVzID09PSAnc2F2aW5nJ30gb25DbGljaz17c2F2ZX0+PHNwYW4+e3N0YXR1c0xhYmVsfTwvc3Bhbj48a2JkPuKMmFM8L2tiZD48L2J1dHRvbj5cbiAgICAgICAgPC9kaXY+XG4gICAgICA8L2hlYWRlcj5cblxuICAgICAge3NuYXBzaG90LnJlY292ZXJ5U3RhdGUuYXZhaWxhYmxlID8gPGRpdiBjbGFzc05hbWU9XCJhYm91dC1lZGl0b3ItcmVjb3ZlcnlcIj48c3Bhbj5BbiB1bnNhdmVkIGRyYWZ0IGZyb20ge25ldyBEYXRlKHNuYXBzaG90LnJlY292ZXJ5U3RhdGUuZHJhZnQudGltZXN0YW1wKS50b0xvY2FsZVN0cmluZygpfSBpcyBhdmFpbGFibGUuPC9zcGFuPjxidXR0b24gdHlwZT1cImJ1dHRvblwiIG9uQ2xpY2s9eygpID0+IHsgc3RvcmUucmVwbGFjZURvY3VtZW50KCdSZWNvdmVyIGRyYWZ0Jywgc25hcHNob3QucmVjb3ZlcnlTdGF0ZS5kcmFmdC5kb2N1bWVudCk7IHN0b3JlLnNldFJlY292ZXJ5U3RhdGUoeyBhdmFpbGFibGU6IGZhbHNlIH0pOyB9fT5SZWNvdmVyIGFzIHVuc2F2ZWQgY29weTwvYnV0dG9uPjxidXR0b24gdHlwZT1cImJ1dHRvblwiIG9uQ2xpY2s9eygpID0+IHsgZXhwb3J0QWJvdXROYXJyYXRpdmVEb2N1bWVudChzbmFwc2hvdC5yZWNvdmVyeVN0YXRlLmRyYWZ0LmRvY3VtZW50LCAnY29udGVudHMtYWJvdXQtcmVjb3ZlcmVkLmpzb24nKTsgfX0+RXhwb3J0PC9idXR0b24+PGJ1dHRvbiB0eXBlPVwiYnV0dG9uXCIgb25DbGljaz17KCkgPT4geyBjbGVhckFib3V0TmFycmF0aXZlUmVjb3ZlcnlEcmFmdCgpOyBzdG9yZS5zZXRSZWNvdmVyeVN0YXRlKHsgYXZhaWxhYmxlOiBmYWxzZSB9KTsgfX0+RGlzY2FyZDwvYnV0dG9uPjwvZGl2PiA6IG51bGx9XG4gICAgICB7c25hcHNob3Quc2F2ZVN0YXRlLm1lc3NhZ2UgPyA8ZGl2IGNsYXNzTmFtZT17YGFib3V0LWVkaXRvci1zYXZlLW1lc3NhZ2UgaXMtJHtzbmFwc2hvdC5zYXZlU3RhdGUuc3RhdHVzfWB9PntzbmFwc2hvdC5zYXZlU3RhdGUubWVzc2FnZX08YnV0dG9uIHR5cGU9XCJidXR0b25cIiBhcmlhLWxhYmVsPVwiRGlzbWlzcyBtZXNzYWdlXCIgb25DbGljaz17KCkgPT4gc3RvcmUuc2V0U2F2ZVN0YXRlKHsgbWVzc2FnZTogJycgfSl9PsOXPC9idXR0b24+PC9kaXY+IDogbnVsbH1cblxuICAgICAge3BhdGhWaXNpYmxlID8gPENhbWVyYVBhdGhPdmVybGF5IHNuYXBzaG90PXtzbmFwc2hvdH0gLz4gOiBudWxsfVxuICAgICAge2RpcmVjdG9yVmlldyA/IDxkaXYgY2xhc3NOYW1lPVwiYWJvdXQtZWRpdG9yLWRpcmVjdG9yLWNvbnRyb2xzXCI+PHN0cm9uZz5EaXJlY3RvciBWaWV3PC9zdHJvbmc+PGJ1dHRvbiB0eXBlPVwiYnV0dG9uXCIgb25DbGljaz17KCkgPT4gcnVudGltZVJlZi5jdXJyZW50Py5udWRnZURpcmVjdG9yPy4oeyB5YXc6IC0wLjA4IH0pfT7ihpA8L2J1dHRvbj48YnV0dG9uIHR5cGU9XCJidXR0b25cIiBvbkNsaWNrPXsoKSA9PiBydW50aW1lUmVmLmN1cnJlbnQ/Lm51ZGdlRGlyZWN0b3I/Lih7IHBpdGNoOiAwLjA4IH0pfT7ihpE8L2J1dHRvbj48YnV0dG9uIHR5cGU9XCJidXR0b25cIiBvbkNsaWNrPXsoKSA9PiBydW50aW1lUmVmLmN1cnJlbnQ/Lm51ZGdlRGlyZWN0b3I/Lih7IHBpdGNoOiAtMC4wOCB9KX0+4oaTPC9idXR0b24+PGJ1dHRvbiB0eXBlPVwiYnV0dG9uXCIgb25DbGljaz17KCkgPT4gcnVudGltZVJlZi5jdXJyZW50Py5udWRnZURpcmVjdG9yPy4oeyB5YXc6IDAuMDggfSl9PuKGkjwvYnV0dG9uPjxidXR0b24gdHlwZT1cImJ1dHRvblwiIG9uQ2xpY2s9eygpID0+IHJ1bnRpbWVSZWYuY3VycmVudD8ubnVkZ2VEaXJlY3Rvcj8uKHsgZGlzdGFuY2U6IC0wLjIgfSl9Pu+8izwvYnV0dG9uPjxidXR0b24gdHlwZT1cImJ1dHRvblwiIG9uQ2xpY2s9eygpID0+IHJ1bnRpbWVSZWYuY3VycmVudD8ubnVkZ2VEaXJlY3Rvcj8uKHsgZGlzdGFuY2U6IDAuMiB9KX0+4oiSPC9idXR0b24+PGJ1dHRvbiB0eXBlPVwiYnV0dG9uXCIgb25DbGljaz17KCkgPT4gcnVudGltZVJlZi5jdXJyZW50Py5yZXNldERpcmVjdG9yPy4oKX0+UmVzZXQ8L2J1dHRvbj48c21hbGw+VGVtcG9yYXJ5IGluc3BlY3Rpb24gb25seS4gUHVibGlzaGVkIENhbWVyYSBrZXlzIGFyZSB1bmNoYW5nZWQuPC9zbWFsbD48L2Rpdj4gOiBudWxsfVxuXG4gICAgICA8SW5zcGVjdG9yIHN0b3JlPXtzdG9yZX0gc25hcHNob3Q9e3NuYXBzaG90fSB0aW1lbGluZU9wZW49e3RpbWVsaW5lT3Blbn0gcnVudGltZU1ldHJpY3M9e3J1bnRpbWVNZXRyaWNzfSAvPlxuICAgICAgPGJ1dHRvblxuICAgICAgICB0eXBlPVwiYnV0dG9uXCJcbiAgICAgICAgY2xhc3NOYW1lPVwiYWJvdXQtZWRpdG9yLXRpbWVsaW5lLXRvZ2dsZVwiXG4gICAgICAgIGFyaWEtY29udHJvbHM9XCJhYm91dC1lZGl0b3ItdGltZWxpbmUtcGFuZWxcIlxuICAgICAgICBhcmlhLWV4cGFuZGVkPXt0aW1lbGluZU9wZW59XG4gICAgICAgIHRpdGxlPXt0aW1lbGluZU9wZW4gPyAnSGlkZSB0aW1lbGluZScgOiAnU2hvdyB0aW1lbGluZSd9XG4gICAgICAgIG9uQ2xpY2s9eygpID0+IHNldFRpbWVsaW5lT3Blbigob3BlbikgPT4gIW9wZW4pfVxuICAgICAgPnt0aW1lbGluZU9wZW4gPyA8Q2hldnJvbkRvd24gYXJpYS1oaWRkZW49XCJ0cnVlXCIgLz4gOiA8Q2hldnJvblVwIGFyaWEtaGlkZGVuPVwidHJ1ZVwiIC8+fTxzcGFuPnt0aW1lbGluZU9wZW4gPyAnSGlkZSB0aW1lbGluZScgOiAnU2hvdyB0aW1lbGluZSd9PC9zcGFuPjwvYnV0dG9uPlxuICAgICAgPGRpdiBpZD1cImFib3V0LWVkaXRvci10aW1lbGluZS1wYW5lbFwiIGNsYXNzTmFtZT1cImFib3V0LWVkaXRvci1ib3R0b21cIiBhcmlhLWhpZGRlbj17IXRpbWVsaW5lT3Blbn0+XG4gICAgICAgIDxkaXYgY2xhc3NOYW1lPVwiYWJvdXQtZWRpdG9yLWNvbnRleHRiYXJcIj5cbiAgICAgICAgICA8c3Bhbj48c3Ryb25nPntzZWxlY3RlZD8ubGFiZWwgfHwgJ1NlcXVlbmNlJ308L3N0cm9uZz4ge3NlbGVjdGVkID8gYCR7c2VsZWN0ZWQudHlwZX0gwrcgJHtmb3JtYXRXVShNYXRoLm1heCgwLCBzZWxlY3RlZEV4dGVudCAtIDEpKX0gc2Nyb2xsIMK3ICR7Zm9ybWF0V1Uoc2VsZWN0ZWRFeHRlbnQpfSB0b3RhbCR7cmVzb2x2ZWRFeHRlbnQgPiBzZWxlY3RlZEV4dGVudCArIDAuMDAxID8gYCDCtyAke2Zvcm1hdFdVKHJlc29sdmVkRXh0ZW50KX0gcmVzb2x2ZWRgIDogJyd9YCA6ICcnfTwvc3Bhbj5cbiAgICAgICAgICB7c2VsZWN0ZWRDdWVDb3VudCA+IDEgPyA8c3BhbiBjbGFzc05hbWU9XCJhYm91dC1lZGl0b3Itc2VsZWN0aW9uLWNvdW50XCI+e3NlbGVjdGVkQ3VlQ291bnR9IHRpdGxlcyBzZWxlY3RlZDwvc3Bhbj4gOiBudWxsfVxuICAgICAgICAgIDxzcGFuPntzbmFwc2hvdC5hdXRvS2V5ID8gJ0F1dG8ta2V5IGFybWVkJyA6ICdBdXRvLWtleSBvZmYnfTwvc3Bhbj5cbiAgICAgICAgICA8YnV0dG9uIHR5cGU9XCJidXR0b25cIiBjbGFzc05hbWU9e3NuYXBzaG90LmF1dG9LZXkgPyAnaXMtYWN0aXZlJyA6ICcnfSBvbkNsaWNrPXsoKSA9PiBzdG9yZS5zZXRBdXRvS2V5KCFzbmFwc2hvdC5hdXRvS2V5KX0+4peGIEF1dG8ta2V5PC9idXR0b24+XG4gICAgICAgICAgPGJ1dHRvbiB0eXBlPVwiYnV0dG9uXCIgY2xhc3NOYW1lPXtsb29wQWN0aXZlID8gJ2lzLWFjdGl2ZScgOiAnJ30gb25DbGljaz17dG9nZ2xlTG9vcH0+TG9vcCBTZWN0aW9uPC9idXR0b24+XG4gICAgICAgICAgPGJ1dHRvbiB0eXBlPVwiYnV0dG9uXCIgb25DbGljaz17Zml0U2VxdWVuY2V9PkZpdCBzZXF1ZW5jZTwvYnV0dG9uPlxuICAgICAgICAgIDxidXR0b24gdHlwZT1cImJ1dHRvblwiIGRpc2FibGVkPXshY29tcGlsZWRTZWxlY3RlZH0gb25DbGljaz17Zml0U2VjdGlvbn0+Rml0IFNlY3Rpb248L2J1dHRvbj5cbiAgICAgICAgICB7WydjYW1lcmEnLCAnd29ybGQnLCAndGV4dCddLm1hcCgodHJhY2spID0+IDxidXR0b24gdHlwZT1cImJ1dHRvblwiIGtleT17dHJhY2t9IGNsYXNzTmFtZT17c25hcHNob3QudHJhbnNwb3J0LnNvbG9UcmFjayA9PT0gdHJhY2sgPyAnaXMtYWN0aXZlJyA6ICcnfSBvbkNsaWNrPXsoKSA9PiB0b2dnbGVTb2xvKHRyYWNrKX0+U29sbyB7dHJhY2t9PC9idXR0b24+KX1cbiAgICAgICAgICB7dGltZWxpbmVEZWxldGlvbiA/IDxidXR0b24gdHlwZT1cImJ1dHRvblwiIGNsYXNzTmFtZT1cImFib3V0LWVkaXRvci1kZWxldGUta2V5XCIgZGlzYWJsZWQ9e3RpbWVsaW5lRGVsZXRpb24uZGlzYWJsZWR9IHRpdGxlPXt0aW1lbGluZURlbGV0aW9uLm1lc3NhZ2UgfHwgYCR7dGltZWxpbmVEZWxldGlvbi5sYWJlbH0gwrcgRGVsZXRlL0JhY2tzcGFjZWB9IG9uQ2xpY2s9eygpID0+IGRlbGV0ZVRpbWVsaW5lU2VsZWN0aW9uKHN0b3JlLCBzbmFwc2hvdCl9PjxUcmFzaDIgYXJpYS1oaWRkZW49XCJ0cnVlXCIgLz57dGltZWxpbmVEZWxldGlvbi5sYWJlbH08L2J1dHRvbj4gOiBudWxsfVxuICAgICAgICAgIHtydW50aW1lTWV0cmljcyA/IDxzcGFuIGNsYXNzTmFtZT1cImFib3V0LWVkaXRvci1odWRcIj57cnVudGltZU1ldHJpY3MuZnJhbWVUaW1lTXMudG9GaXhlZCgyKX1tcyDCtyB7cnVudGltZU1ldHJpY3MuZHJhd0NhbGxzfSBkcmF3IMK3IHtydW50aW1lTWV0cmljcy5wb2ludENvdW50LnRvTG9jYWxlU3RyaW5nKCl9IHB0cyDCtyB7cnVudGltZU1ldHJpY3MuYWN0aXZlTW9kaWZpZXJzfSBtb2RpZmllcnMgwrcge3J1bnRpbWVNZXRyaWNzLmJ1ZmZlclJlYnVpbGRzfSByZWJ1aWxkczwvc3Bhbj4gOiBudWxsfVxuICAgICAgICAgIHtjaGVja3BvaW50cy5sZW5ndGggPyA8c2VsZWN0IGFyaWEtbGFiZWw9XCJSZXN0b3JlIGNoZWNrcG9pbnRcIiBkZWZhdWx0VmFsdWU9XCJcIiBvbkNoYW5nZT17KGV2ZW50KSA9PiB7IGNvbnN0IGZvdW5kID0gY2hlY2twb2ludHMuZmluZCgoaXRlbSkgPT4gaXRlbS5pZCA9PT0gZXZlbnQudGFyZ2V0LnZhbHVlKTsgaWYgKGZvdW5kKSB7IHN0b3JlLnJlcGxhY2VEb2N1bWVudChgUmVzdG9yZSAke2ZvdW5kLm5hbWV9YCwgZm91bmQuZG9jdW1lbnQpOyBzdG9yZS5zZXRUcmFuc3BvcnQoeyBvd25lcjogJ3RpbWVsaW5lJywgc3RvcnlXVTogZm91bmQuc3RvcnlXVSwgcGxheWluZzogZmFsc2UgfSk7IH0gZXZlbnQudGFyZ2V0LnZhbHVlID0gJyc7IH19PjxvcHRpb24gdmFsdWU9XCJcIj5DaGVja3BvaW50cyAoe2NoZWNrcG9pbnRzLmxlbmd0aH0pPC9vcHRpb24+e2NoZWNrcG9pbnRzLm1hcCgoaXRlbSkgPT4gPG9wdGlvbiB2YWx1ZT17aXRlbS5pZH0ga2V5PXtpdGVtLmlkfT57aXRlbS5uYW1lfTwvb3B0aW9uPil9PC9zZWxlY3Q+IDogbnVsbH1cbiAgICAgICAgPC9kaXY+XG4gICAgICAgIDxUaW1lbGluZSBzdG9yZT17c3RvcmV9IHNuYXBzaG90PXtzbmFwc2hvdH0gLz5cbiAgICAgIDwvZGl2PlxuICAgICAgPG5hdiBjbGFzc05hbWU9XCJhYm91dC1lZGl0b3ItbW9iaWxlLXRhYnNcIiBhcmlhLWxhYmVsPVwiRWRpdG9yIHBhbmVsXCI+PGJ1dHRvbiB0eXBlPVwiYnV0dG9uXCIgY2xhc3NOYW1lPXttb2JpbGVQYW5lID09PSAnc2VxdWVuY2UnID8gJ2lzLWFjdGl2ZScgOiAnJ30gb25DbGljaz17KCkgPT4gc2V0TW9iaWxlUGFuZSgnc2VxdWVuY2UnKX0+U2VxdWVuY2U8L2J1dHRvbj48YnV0dG9uIHR5cGU9XCJidXR0b25cIiBjbGFzc05hbWU9e21vYmlsZVBhbmUgPT09ICdpbnNwZWN0JyA/ICdpcy1hY3RpdmUnIDogJyd9IG9uQ2xpY2s9eygpID0+IHNldE1vYmlsZVBhbmUoJ2luc3BlY3QnKX0+SW5zcGVjdDwvYnV0dG9uPjxidXR0b24gdHlwZT1cImJ1dHRvblwiIGNsYXNzTmFtZT17bW9iaWxlUGFuZSA9PT0gJ3ByZXZpZXcnID8gJ2lzLWFjdGl2ZScgOiAnJ30gb25DbGljaz17KCkgPT4gc2V0TW9iaWxlUGFuZSgncHJldmlldycpfT5QcmV2aWV3PC9idXR0b24+PC9uYXY+XG4gICAgPC9kaXY+XG4gICksIGRvY3VtZW50LmJvZHkpO1xufVxuIl0sImZpbGUiOiIvVXNlcnMvYWxleGFuZGVyYmVjay9Qcm9qZWN0cy1jb2RlL0FsZXhhbmRlciBCZWNrIFN0dWRpbyBXZWJzaXRlL3JlYWN0LWFwcC9hcHAvc3JjL3JvdXRlcy9hYm91dC1uYXJyYXRpdmUtbGFiL0Fib3V0TmFycmF0aXZlRWRpdG9yLmpzeCJ9