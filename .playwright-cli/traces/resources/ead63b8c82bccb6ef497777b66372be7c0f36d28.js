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
      lineNumber: 1347,
      columnNumber: 7
    }, this),
    members.length > 1 ? /* @__PURE__ */ jsxDEV(Fragment, { children: [
      /* @__PURE__ */ jsxDEV("div", { className: "about-editor-rhythm-actions", children: [
        /* @__PURE__ */ jsxDEV("button", { type: "button", onClick: distribute, children: "Distribute evenly" }, void 0, false, {
          fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
          lineNumber: 1351,
          columnNumber: 13
        }, this),
        /* @__PURE__ */ jsxDEV("button", { type: "button", onClick: alignPrimary, children: "Align primary to playhead" }, void 0, false, {
          fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
          lineNumber: 1352,
          columnNumber: 13
        }, this)
      ] }, void 0, true, {
        fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
        lineNumber: 1350,
        columnNumber: 11
      }, this),
      /* @__PURE__ */ jsxDEV("div", { className: "about-editor-rhythm-gap", children: [
        /* @__PURE__ */ jsxDEV(Property, { label: "Exact gap", children: /* @__PURE__ */ jsxDEV("input", { type: "number", min: "0", max: "8", step: "0.05", value: gapWU, onChange: (event) => setGapWU(Math.max(0, Number(event.target.value) || 0)) }, void 0, false, {
          fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
          lineNumber: 1355,
          columnNumber: 41
        }, this) }, void 0, false, {
          fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
          lineNumber: 1355,
          columnNumber: 13
        }, this),
        /* @__PURE__ */ jsxDEV(Property, { label: "Anchor", children: /* @__PURE__ */ jsxDEV("select", { value: anchor, onChange: (event) => setAnchor(event.target.value), children: [
          /* @__PURE__ */ jsxDEV("option", { value: "primary", children: "Primary" }, void 0, false, {
            fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
            lineNumber: 1356,
            columnNumber: 113
          }, this),
          /* @__PURE__ */ jsxDEV("option", { value: "first", children: "First" }, void 0, false, {
            fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
            lineNumber: 1356,
            columnNumber: 153
          }, this),
          /* @__PURE__ */ jsxDEV("option", { value: "last", children: "Last" }, void 0, false, {
            fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
            lineNumber: 1356,
            columnNumber: 189
          }, this)
        ] }, void 0, true, {
          fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
          lineNumber: 1356,
          columnNumber: 38
        }, this) }, void 0, false, {
          fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
          lineNumber: 1356,
          columnNumber: 13
        }, this),
        /* @__PURE__ */ jsxDEV("button", { type: "button", onClick: exactGap, children: "Preview exact gap" }, void 0, false, {
          fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
          lineNumber: 1357,
          columnNumber: 13
        }, this)
      ] }, void 0, true, {
        fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
        lineNumber: 1354,
        columnNumber: 11
      }, this)
    ] }, void 0, true, {
      fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
      lineNumber: 1349,
      columnNumber: 7
    }, this) : null,
    ghostMoves.length ? /* @__PURE__ */ jsxDEV("div", { className: "about-editor-rhythm-preview", "aria-label": "Proposed title rhythm", children: ghostMoves.map((move) => {
      const compiled = snapshot.compiledPlan.sections.find((item) => item.id === move.sectionId);
      const storyWU = Number(compiled?.startWU || 0) + move.hold * Number(compiled?.travelWU || 0);
      return /* @__PURE__ */ jsxDEV("i", { style: { left: `${storyWU / maxWU * 100}%` }, title: `${move.cueId} · ${formatWU(storyWU)}` }, `${move.sectionId}:${move.cueId}`, false, {
        fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
        lineNumber: 1366,
        columnNumber: 18
      }, this);
    }) }, void 0, false, {
      fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
      lineNumber: 1362,
      columnNumber: 7
    }, this) : null,
    message ? /* @__PURE__ */ jsxDEV("p", { className: `about-editor-rhythm-message${preview && !preview.valid ? " is-error" : ""}`, children: message }, void 0, false, {
      fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
      lineNumber: 1370,
      columnNumber: 18
    }, this) : null,
    preview?.valid && snapshot.tryState ? /* @__PURE__ */ jsxDEV("div", { className: "about-editor-try", children: [
      /* @__PURE__ */ jsxDEV("span", { children: [
        "Previewing ",
        preview.label
      ] }, void 0, true, {
        fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
        lineNumber: 1371,
        columnNumber: 80
      }, this),
      /* @__PURE__ */ jsxDEV("button", { type: "button", onClick: cancelPreview, children: "Cancel" }, void 0, false, {
        fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
        lineNumber: 1371,
        columnNumber: 119
      }, this),
      /* @__PURE__ */ jsxDEV("button", { type: "button", className: "is-primary", onClick: applyPreview, children: "Apply" }, void 0, false, {
        fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
        lineNumber: 1371,
        columnNumber: 180
      }, this)
    ] }, void 0, true, {
      fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
      lineNumber: 1371,
      columnNumber: 46
    }, this) : null,
    /* @__PURE__ */ jsxDEV("div", { className: "about-editor-rhythm-actions", children: [
      /* @__PURE__ */ jsxDEV("button", { type: "button", onClick: duplicate, children: [
        "Duplicate ",
        members.length > 1 ? "selection" : "title"
      ] }, void 0, true, {
        fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
        lineNumber: 1373,
        columnNumber: 9
      }, this),
      /* @__PURE__ */ jsxDEV("button", { type: "button", onClick: copy, children: "Copy" }, void 0, false, {
        fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
        lineNumber: 1374,
        columnNumber: 9
      }, this),
      /* @__PURE__ */ jsxDEV("button", { type: "button", disabled: !clipboard, onClick: paste, children: "Paste at playhead" }, void 0, false, {
        fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
        lineNumber: 1375,
        columnNumber: 9
      }, this)
    ] }, void 0, true, {
      fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
      lineNumber: 1372,
      columnNumber: 7
    }, this)
  ] }, void 0, true, {
    fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
    lineNumber: 1346,
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
    lineNumber: 1386,
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
        lineNumber: 1406,
        columnNumber: 15
      }, this),
      /* @__PURE__ */ jsxDEV("strong", { children: cue.id }, void 0, false, {
        fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
        lineNumber: 1406,
        columnNumber: 36
      }, this)
    ] }, void 0, true, {
      fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
      lineNumber: 1406,
      columnNumber: 7
    }, this),
    selectedMembers.length > 1 ? /* @__PURE__ */ jsxDEV("div", { className: "about-editor-group-summary", children: [
      /* @__PURE__ */ jsxDEV("strong", { children: [
        selectedMembers.length,
        " titles selected"
      ] }, void 0, true, {
        fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
        lineNumber: 1409,
        columnNumber: 11
      }, this),
      /* @__PURE__ */ jsxDEV("ol", { children: selectedMembers.map((member) => {
        const memberSection = snapshot.document.sections.find((item) => item.id === member.sectionId);
        const memberCue = memberSection?.text?.cues?.find((item) => item.id === member.cueId);
        return /* @__PURE__ */ jsxDEV("li", { children: [
          /* @__PURE__ */ jsxDEV("span", { children: memberSection?.label }, void 0, false, {
            fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
            lineNumber: 1413,
            columnNumber: 68
          }, this),
          memberCue?.text
        ] }, `${member.sectionId}:${member.cueId}`, true, {
          fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
          lineNumber: 1413,
          columnNumber: 20
        }, this);
      }) }, void 0, false, {
        fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
        lineNumber: 1410,
        columnNumber: 11
      }, this),
      /* @__PURE__ */ jsxDEV("button", { type: "button", onClick: () => store.setSelection({ type: "cue", sectionId: section.id, cueId: cue.id, keyPart: "focus" }), children: "Keep primary only" }, void 0, false, {
        fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
        lineNumber: 1415,
        columnNumber: 11
      }, this)
    ] }, void 0, true, {
      fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
      lineNumber: 1408,
      columnNumber: 7
    }, this) : null,
    /* @__PURE__ */ jsxDEV("p", { className: "about-editor-help", children: "Drag the pink timing marker anywhere from 0–100% of its Section. This moves the title's focus time only. Its travel duration, speed, blur, and in/out cadence remain controlled globally under Spatial titles." }, void 0, false, {
      fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
      lineNumber: 1418,
      columnNumber: 7
    }, this),
    /* @__PURE__ */ jsxDEV(Property, { label: "Statement", children: /* @__PURE__ */ jsxDEV("textarea", { rows: "7", value: cue.text, onChange: (event) => update("text", event.target.value) }, void 0, false, {
      fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
      lineNumber: 1419,
      columnNumber: 35
    }, this) }, void 0, false, {
      fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
      lineNumber: 1419,
      columnNumber: 7
    }, this),
    /* @__PURE__ */ jsxDEV(Property, { label: "Movement", children: /* @__PURE__ */ jsxDEV("select", { value: movement, onChange: (event) => updateMovement(event.target.value), children: [
      /* @__PURE__ */ jsxDEV("option", { value: "spatial", children: "Spatial travel" }, void 0, false, {
        fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
        lineNumber: 1420,
        columnNumber: 116
      }, this),
      /* @__PURE__ */ jsxDEV("option", { value: "vertical", children: "Vertical scroll" }, void 0, false, {
        fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
        lineNumber: 1420,
        columnNumber: 163
      }, this)
    ] }, void 0, true, {
      fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
      lineNumber: 1420,
      columnNumber: 34
    }, this) }, void 0, false, {
      fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
      lineNumber: 1420,
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
        lineNumber: 1421,
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
        lineNumber: 1433,
        columnNumber: 41
      }, this) }, void 0, false, {
        fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
        lineNumber: 1433,
        columnNumber: 11
      }, this),
      /* @__PURE__ */ jsxDEV(Property, { label: "Motion preset", children: /* @__PURE__ */ jsxDEV("select", { value: cue.preset, onChange: (event) => update("preset", event.target.value), children: [
        /* @__PURE__ */ jsxDEV("option", { value: "travelling-title-v1", children: "Travelling title" }, void 0, false, {
          fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
          lineNumber: 1434,
          columnNumber: 129
        }, this),
        /* @__PURE__ */ jsxDEV("option", { value: "opener-v1", children: "Opener" }, void 0, false, {
          fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
          lineNumber: 1434,
          columnNumber: 190
        }, this),
        /* @__PURE__ */ jsxDEV("option", { value: "finale-v1", children: "Finale" }, void 0, false, {
          fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
          lineNumber: 1434,
          columnNumber: 231
        }, this)
      ] }, void 0, true, {
        fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
        lineNumber: 1434,
        columnNumber: 43
      }, this) }, void 0, false, {
        fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
        lineNumber: 1434,
        columnNumber: 11
      }, this)
    ] }, void 0, true, {
      fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
      lineNumber: 1432,
      columnNumber: 7
    }, this) : /* @__PURE__ */ jsxDEV(Property, { label: "Reveal", children: /* @__PURE__ */ jsxDEV("output", { className: "about-editor-readout", children: "Editorial vertical scroll" }, void 0, false, {
      fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
      lineNumber: 1436,
      columnNumber: 32
    }, this) }, void 0, false, {
      fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
      lineNumber: 1436,
      columnNumber: 7
    }, this),
    /* @__PURE__ */ jsxDEV(CueRhythmAndReuse, { store, snapshot, clipboard, setClipboard }, void 0, false, {
      fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
      lineNumber: 1437,
      columnNumber: 7
    }, this),
    /* @__PURE__ */ jsxDEV("button", { type: "button", className: "about-editor-danger", disabled: section.type === "finale", onClick: remove, children: "Delete Cue" }, void 0, false, {
      fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
      lineNumber: 1438,
      columnNumber: 7
    }, this)
  ] }, void 0, true, {
    fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
    lineNumber: 1405,
    columnNumber: 5
  }, this);
}
_c9 = CueInspector;
function DisciplineRevealInspector({ store, snapshot, section }) {
  const sectionIndex = getSectionIndex(snapshot.document, section.id);
  const reveal = section.text.disciplineReveal;
  if (!reveal) return /* @__PURE__ */ jsxDEV(SectionInspector, { store, snapshot, section }, void 0, false, {
    fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
    lineNumber: 1446,
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
        lineNumber: 1470,
        columnNumber: 15
      }, this),
      /* @__PURE__ */ jsxDEV("strong", { children: "Discipline reveal" }, void 0, false, {
        fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
        lineNumber: 1470,
        columnNumber: 41
      }, this)
    ] }, void 0, true, {
      fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
      lineNumber: 1470,
      columnNumber: 7
    }, this),
    /* @__PURE__ */ jsxDEV("p", { className: "about-editor-help", children: "One clip controls the complete six-point sequence. Drag its striped block in the Text lane to move every reveal together." }, void 0, false, {
      fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
      lineNumber: 1471,
      columnNumber: 7
    }, this),
    /* @__PURE__ */ jsxDEV("details", { open: true, children: [
      /* @__PURE__ */ jsxDEV("summary", { children: "Reveal choreography" }, void 0, false, {
        fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
        lineNumber: 1472,
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
            lineNumber: 1476,
            columnNumber: 13
          },
          this
        );
      })
    ] }, void 0, true, {
      fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
      lineNumber: 1472,
      columnNumber: 7
    }, this),
    /* @__PURE__ */ jsxDEV("details", { open: true, children: [
      /* @__PURE__ */ jsxDEV("summary", { children: "Reveal order and labels" }, void 0, false, {
        fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
        lineNumber: 1489,
        columnNumber: 21
      }, this),
      /* @__PURE__ */ jsxDEV("div", { className: "about-editor-discipline-items", children: reveal.items.map(
        (item, itemIndex) => /* @__PURE__ */ jsxDEV("div", { className: "about-editor-discipline-item", children: [
          /* @__PURE__ */ jsxDEV("code", { children: String(itemIndex + 1).padStart(2, "0") }, void 0, false, {
            fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
            lineNumber: 1493,
            columnNumber: 15
          }, this),
          /* @__PURE__ */ jsxDEV("input", { value: item.label, "aria-label": `Discipline ${itemIndex + 1} label`, onChange: (event) => update("Edit discipline label", (draft) => {
            draft.items[itemIndex].label = event.target.value;
          }, `discipline-reveal:${section.id}:item:${item.group}:label`) }, void 0, false, {
            fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
            lineNumber: 1494,
            columnNumber: 15
          }, this),
          /* @__PURE__ */ jsxDEV("div", { className: "about-editor-discipline-palette", title: `${item.label} uses the Home simulation ${DISCIPLINE_BALL_TOKEN_BY_GROUP[item.group]}`, children: [
            /* @__PURE__ */ jsxDEV("i", { style: { background: `var(${DISCIPLINE_BALL_TOKEN_BY_GROUP[item.group]})` } }, void 0, false, {
              fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
              lineNumber: 1496,
              columnNumber: 17
            }, this),
            /* @__PURE__ */ jsxDEV("code", { children: DISCIPLINE_BALL_TOKEN_BY_GROUP[item.group] }, void 0, false, {
              fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
              lineNumber: 1497,
              columnNumber: 17
            }, this)
          ] }, void 0, true, {
            fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
            lineNumber: 1495,
            columnNumber: 15
          }, this),
          /* @__PURE__ */ jsxDEV("span", { children: [
            /* @__PURE__ */ jsxDEV("button", { type: "button", disabled: itemIndex === 0, "aria-label": `Reveal ${item.label} earlier`, onClick: () => update("Reorder discipline reveal", (draft) => {
              const [moved] = draft.items.splice(itemIndex, 1);
              draft.items.splice(itemIndex - 1, 0, moved);
            }), children: "↑" }, void 0, false, {
              fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
              lineNumber: 1500,
              columnNumber: 17
            }, this),
            /* @__PURE__ */ jsxDEV("button", { type: "button", disabled: itemIndex === reveal.items.length - 1, "aria-label": `Reveal ${item.label} later`, onClick: () => update("Reorder discipline reveal", (draft) => {
              const [moved] = draft.items.splice(itemIndex, 1);
              draft.items.splice(itemIndex + 1, 0, moved);
            }), children: "↓" }, void 0, false, {
              fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
              lineNumber: 1501,
              columnNumber: 17
            }, this)
          ] }, void 0, true, {
            fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
            lineNumber: 1499,
            columnNumber: 15
          }, this)
        ] }, item.group, true, {
          fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
          lineNumber: 1492,
          columnNumber: 11
        }, this)
      ) }, void 0, false, {
        fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
        lineNumber: 1490,
        columnNumber: 9
      }, this)
    ] }, void 0, true, {
      fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
      lineNumber: 1489,
      columnNumber: 7
    }, this),
    /* @__PURE__ */ jsxDEV("p", { className: "about-editor-help", children: "The six points persist after the labels leave. An editorial block marked “Reconnect point grid” restores the surrounding grid as that paragraph enters." }, void 0, false, {
      fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
      lineNumber: 1507,
      columnNumber: 7
    }, this)
  ] }, void 0, true, {
    fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
    lineNumber: 1469,
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
    lineNumber: 1571,
    columnNumber: 127
  }, this)) }, void 0, false, {
    fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
    lineNumber: 1571,
    columnNumber: 19
  }, this);
  if (!key) {
    return /* @__PURE__ */ jsxDEV(Fragment, { children: [
      /* @__PURE__ */ jsxDEV("header", { children: [
        /* @__PURE__ */ jsxDEV("span", { children: "Camera track" }, void 0, false, {
          fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
          lineNumber: 1573,
          columnNumber: 22
        }, this),
        /* @__PURE__ */ jsxDEV("strong", { children: "Editing Section base" }, void 0, false, {
          fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
          lineNumber: 1573,
          columnNumber: 47
        }, this)
      ] }, void 0, true, {
        fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
        lineNumber: 1573,
        columnNumber: 14
      }, this),
      /* @__PURE__ */ jsxDEV("p", { className: "about-editor-help", children: "The dolly and Section joins are continuous automatically. Add visible keys only where the framing, aim, roll, or lens should change." }, void 0, false, {
        fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
        lineNumber: 1573,
        columnNumber: 93
      }, this),
      recipes,
      /* @__PURE__ */ jsxDEV("button", { type: "button", className: "about-editor-wide-action", onClick: setKey, children: [
        "Set camera key at ",
        formatCameraPercent(targetAt)
      ] }, void 0, true, {
        fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
        lineNumber: 1573,
        columnNumber: 271
      }, this)
    ] }, void 0, true, {
      fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
      lineNumber: 1573,
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
        lineNumber: 1592,
        columnNumber: 15
      }, this),
      /* @__PURE__ */ jsxDEV("strong", { children: [
        formatCameraPercent(key.at),
        " through ",
        section.label
      ] }, void 0, true, {
        fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
        lineNumber: 1592,
        columnNumber: 38
      }, this)
    ] }, void 0, true, {
      fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
      lineNumber: 1592,
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
        lineNumber: 1594,
        columnNumber: 7
      },
      this
    ),
    /* @__PURE__ */ jsxDEV(NumberProperty, { label: extentLabel, value: section[extentField], min: 1, max: 8, step: 0.05, unit: "WU", onChange: updateExtent }, void 0, false, {
      fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
      lineNumber: 1603,
      columnNumber: 7
    }, this),
    ["X offset", "Y offset", "Forward offset"].map((label, axis) => /* @__PURE__ */ jsxDEV(NumberProperty, { label, value: key.offset[axis], min: -8, max: 8, step: 0.02, unit: "WU", onChange: (value) => updateVector("offset", axis, value) }, label, false, {
      fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
      lineNumber: 1604,
      columnNumber: 72
    }, this)),
    ["Aim X", "Aim Y", "Aim depth"].map((label, axis) => /* @__PURE__ */ jsxDEV(NumberProperty, { label, value: key.lookAtOffset[axis], min: -8, max: 8, step: 0.02, unit: "WU", onChange: (value) => updateVector("lookAtOffset", axis, value) }, label, false, {
      fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
      lineNumber: 1605,
      columnNumber: 61
    }, this)),
    /* @__PURE__ */ jsxDEV(NumberProperty, { label: "Field of view", value: key.fov, min: 20, max: 90, step: 1, unit: "°", onChange: (value) => update("fov", value) }, void 0, false, {
      fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
      lineNumber: 1606,
      columnNumber: 7
    }, this),
    /* @__PURE__ */ jsxDEV(NumberProperty, { label: "Roll", value: key.roll, min: -1.2, max: 1.2, step: 0.01, unit: "rad", onChange: (value) => update("roll", value) }, void 0, false, {
      fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
      lineNumber: 1607,
      columnNumber: 7
    }, this),
    /* @__PURE__ */ jsxDEV(Property, { label: "Easing", children: /* @__PURE__ */ jsxDEV("select", { value: key.easing, onChange: (event) => update("easing", event.target.value), children: [
      /* @__PURE__ */ jsxDEV("option", { value: "smoothstep", children: "Smoothstep" }, void 0, false, {
        fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
        lineNumber: 1608,
        columnNumber: 118
      }, this),
      /* @__PURE__ */ jsxDEV("option", { value: "ease-in-out", children: "Ease in out" }, void 0, false, {
        fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
        lineNumber: 1608,
        columnNumber: 164
      }, this)
    ] }, void 0, true, {
      fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
      lineNumber: 1608,
      columnNumber: 32
    }, this) }, void 0, false, {
      fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
      lineNumber: 1608,
      columnNumber: 7
    }, this),
    /* @__PURE__ */ jsxDEV("button", { type: "button", className: "about-editor-wide-action", disabled: existingKeyAtPlayhead >= 0, onClick: setKey, children: existingKeyAtPlayhead >= 0 ? `Camera key already at ${formatCameraPercent(targetAt)}` : `Set another key at ${formatCameraPercent(targetAt)}` }, void 0, false, {
      fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
      lineNumber: 1609,
      columnNumber: 7
    }, this),
    /* @__PURE__ */ jsxDEV("button", { type: "button", className: "about-editor-danger", onClick: () => store.commit("Delete camera key", (draft) => {
      draft.sections[sectionIndex].camera.keys.splice(keyIndex, 1);
    }, { selection: { type: "section", sectionId: section.id } }), children: "Delete key" }, void 0, false, {
      fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
      lineNumber: 1610,
      columnNumber: 7
    }, this)
  ] }, void 0, true, {
    fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
    lineNumber: 1591,
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
          lineNumber: 1625,
          columnNumber: 22
        }, this),
        /* @__PURE__ */ jsxDEV("strong", { children: "Inherited World" }, void 0, false, {
          fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
          lineNumber: 1625,
          columnNumber: 46
        }, this)
      ] }, void 0, true, {
        fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
        lineNumber: 1625,
        columnNumber: 14
      }, this),
      /* @__PURE__ */ jsxDEV("p", { className: "about-editor-help", children: "This Section keeps the previous World. Choose “Create World clip” only when the shape should change here." }, void 0, false, {
        fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
        lineNumber: 1625,
        columnNumber: 87
      }, this),
      /* @__PURE__ */ jsxDEV("button", { type: "button", className: "about-editor-wide-action", onClick: () => store.commit("Create World clip", (draft) => {
        draft.sections[sectionIndex].world = cloneAboutNarrativeDocument(draft.sections.slice(0, sectionIndex).reverse().find((item) => item.world.mode === "set")?.world || draft.sections[0].world);
      }), children: "Create World clip" }, void 0, false, {
        fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
        lineNumber: 1625,
        columnNumber: 229
      }, this)
    ] }, void 0, true, {
      fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
      lineNumber: 1625,
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
        lineNumber: 1658,
        columnNumber: 15
      }, this),
      /* @__PURE__ */ jsxDEV("strong", { children: shape?.label || world.shapeId }, void 0, false, {
        fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
        lineNumber: 1658,
        columnNumber: 38
      }, this)
    ] }, void 0, true, {
      fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
      lineNumber: 1658,
      columnNumber: 7
    }, this),
    /* @__PURE__ */ jsxDEV("div", { className: "about-editor-shape-catalog", children: Object.values(ABOUT_NARRATIVE_SHAPE_DEFINITIONS).map(
      (item) => /* @__PURE__ */ jsxDEV("button", { type: "button", disabled: section.locked, className: item.id === world.shapeId ? "is-selected" : "", onClick: () => tryShape(item.id), children: [
        /* @__PURE__ */ jsxDEV("i", {}, void 0, false, {
          fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
          lineNumber: 1662,
          columnNumber: 13
        }, this),
        /* @__PURE__ */ jsxDEV("span", { children: [
          /* @__PURE__ */ jsxDEV("strong", { children: item.label }, void 0, false, {
            fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
            lineNumber: 1662,
            columnNumber: 24
          }, this),
          /* @__PURE__ */ jsxDEV("small", { children: [
            "Cost ",
            item.cost,
            " · Point field"
          ] }, void 0, true, {
            fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
            lineNumber: 1662,
            columnNumber: 53
          }, this)
        ] }, void 0, true, {
          fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
          lineNumber: 1662,
          columnNumber: 18
        }, this)
      ] }, item.id, true, {
        fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
        lineNumber: 1661,
        columnNumber: 9
      }, this)
    ) }, void 0, false, {
      fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
      lineNumber: 1659,
      columnNumber: 7
    }, this),
    snapshot.tryState ? /* @__PURE__ */ jsxDEV("div", { className: "about-editor-try", children: [
      /* @__PURE__ */ jsxDEV("span", { children: [
        "Trying ",
        snapshot.tryState.label
      ] }, void 0, true, {
        fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
        lineNumber: 1666,
        columnNumber: 62
      }, this),
      /* @__PURE__ */ jsxDEV("button", { type: "button", onClick: () => store.cancelTry(), children: "Cancel" }, void 0, false, {
        fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
        lineNumber: 1666,
        columnNumber: 107
      }, this),
      /* @__PURE__ */ jsxDEV("button", { type: "button", className: "is-primary", onClick: () => store.applyTry(), children: "Apply" }, void 0, false, {
        fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
        lineNumber: 1666,
        columnNumber: 178
      }, this)
    ] }, void 0, true, {
      fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
      lineNumber: 1666,
      columnNumber: 28
    }, this) : null,
    /* @__PURE__ */ jsxDEV("details", { open: true, children: [
      /* @__PURE__ */ jsxDEV("summary", { children: "Shape parameters" }, void 0, false, {
        fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
        lineNumber: 1667,
        columnNumber: 21
      }, this),
      (shape?.parameters || []).map((control) => /* @__PURE__ */ jsxDEV(NumberProperty, { label: control.label, value: world.shapeParameters[control.id], min: control.min, max: control.max, step: control.step, unit: control.unit, onChange: (value) => update(`Change ${control.label}`, (draft) => {
        draft.shapeParameters[control.id] = value;
      }, `world:${section.id}:${control.id}`) }, control.id, false, {
        fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
        lineNumber: 1668,
        columnNumber: 53
      }, this)),
      /* @__PURE__ */ jsxDEV("div", { className: "about-editor-inline-actions", children: [
        /* @__PURE__ */ jsxDEV("button", { type: "button", onClick: () => update("Reseed Shape", (draft) => {
          draft.seed = Math.floor(Math.random() * 4294967295);
        }), children: "Reseed" }, void 0, false, {
          fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
          lineNumber: 1669,
          columnNumber: 54
        }, this),
        /* @__PURE__ */ jsxDEV("code", { children: world.seed }, void 0, false, {
          fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
          lineNumber: 1669,
          columnNumber: 197
        }, this)
      ] }, void 0, true, {
        fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
        lineNumber: 1669,
        columnNumber: 9
      }, this)
    ] }, void 0, true, {
      fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
      lineNumber: 1667,
      columnNumber: 7
    }, this),
    /* @__PURE__ */ jsxDEV("details", { open: true, children: [
      /* @__PURE__ */ jsxDEV("summary", { children: "Placement" }, void 0, false, {
        fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
        lineNumber: 1671,
        columnNumber: 21
      }, this),
      /* @__PURE__ */ jsxDEV(NumberProperty, { label: "Distance at entry", value: world.entryDistanceWU, min: 0.2, max: 16, step: 0.05, unit: "WU", onChange: (value) => update("Move World", (draft) => {
        draft.entryDistanceWU = value;
      }, `world:${section.id}:distance`) }, void 0, false, {
        fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
        lineNumber: 1672,
        columnNumber: 9
      }, this),
      /* @__PURE__ */ jsxDEV(NumberProperty, { label: "Scale", value: world.transform.scale, min: 0.1, max: 3, step: 0.01, onChange: (value) => update("Scale World", (draft) => {
        draft.transform.scale = value;
      }, `world:${section.id}:scale`) }, void 0, false, {
        fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
        lineNumber: 1673,
        columnNumber: 9
      }, this)
    ] }, void 0, true, {
      fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
      lineNumber: 1671,
      columnNumber: 7
    }, this),
    /* @__PURE__ */ jsxDEV("details", { open: true, children: [
      /* @__PURE__ */ jsxDEV("summary", { children: "Transition in" }, void 0, false, {
        fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
        lineNumber: 1675,
        columnNumber: 21
      }, this),
      transitionEnabled ? /* @__PURE__ */ jsxDEV(Fragment, { children: [
        /* @__PURE__ */ jsxDEV("p", { className: "about-editor-help", children: [
          "Timing is relative to this Section: 1 is its end; values above 1 continue across inherited World Sections. The next World begins at ",
          transitionLimit.toFixed(3),
          "."
        ] }, void 0, true, {
          fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
          lineNumber: 1677,
          columnNumber: 11
        }, this),
        /* @__PURE__ */ jsxDEV(NumberProperty, { label: "Start", value: world.transitionIn.start, min: 0, max: transitionMax, step: 5e-3, unit: "× section", onChange: (value) => update("Change transition start", (draft) => {
          draft.transitionIn.start = Math.min(value, draft.transitionIn.end);
        }) }, void 0, false, {
          fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
          lineNumber: 1678,
          columnNumber: 11
        }, this),
        /* @__PURE__ */ jsxDEV(NumberProperty, { label: "End", value: world.transitionIn.end, min: 0, max: transitionMax, step: 5e-3, unit: "× section", onChange: (value) => update("Change transition end", (draft) => {
          draft.transitionIn.end = Math.max(value, draft.transitionIn.start);
        }) }, void 0, false, {
          fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
          lineNumber: 1679,
          columnNumber: 11
        }, this),
        /* @__PURE__ */ jsxDEV(Property, { label: "Type", children: /* @__PURE__ */ jsxDEV("select", { value: world.transitionIn.type, onChange: (event) => update("Change transition type", (draft) => {
          draft.transitionIn.type = event.target.value;
        }), children: [
          /* @__PURE__ */ jsxDEV("option", { value: "morph", children: "Morph" }, void 0, false, {
            fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
            lineNumber: 1680,
            columnNumber: 189
          }, this),
          /* @__PURE__ */ jsxDEV("option", { value: "dissolve-morph", children: "Dissolve morph" }, void 0, false, {
            fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
            lineNumber: 1680,
            columnNumber: 225
          }, this),
          /* @__PURE__ */ jsxDEV("option", { value: "crossfade", children: "Crossfade" }, void 0, false, {
            fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
            lineNumber: 1680,
            columnNumber: 279
          }, this),
          /* @__PURE__ */ jsxDEV("option", { value: "hold", children: "Hold" }, void 0, false, {
            fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
            lineNumber: 1680,
            columnNumber: 323
          }, this)
        ] }, void 0, true, {
          fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
          lineNumber: 1680,
          columnNumber: 34
        }, this) }, void 0, false, {
          fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
          lineNumber: 1680,
          columnNumber: 11
        }, this),
        /* @__PURE__ */ jsxDEV(Property, { label: "Easing", children: /* @__PURE__ */ jsxDEV("select", { value: world.transitionIn.easing, onChange: (event) => update("Change transition easing", (draft) => {
          draft.transitionIn.easing = event.target.value;
        }), children: [
          /* @__PURE__ */ jsxDEV("option", { value: "linear", children: "Linear" }, void 0, false, {
            fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
            lineNumber: 1681,
            columnNumber: 197
          }, this),
          /* @__PURE__ */ jsxDEV("option", { value: "smoothstep", children: "Smoothstep" }, void 0, false, {
            fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
            lineNumber: 1681,
            columnNumber: 235
          }, this),
          /* @__PURE__ */ jsxDEV("option", { value: "ease-in", children: "Ease in" }, void 0, false, {
            fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
            lineNumber: 1681,
            columnNumber: 281
          }, this),
          /* @__PURE__ */ jsxDEV("option", { value: "ease-out", children: "Ease out" }, void 0, false, {
            fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
            lineNumber: 1681,
            columnNumber: 321
          }, this),
          /* @__PURE__ */ jsxDEV("option", { value: "ease-in-out", children: "Ease in out" }, void 0, false, {
            fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
            lineNumber: 1681,
            columnNumber: 363
          }, this),
          /* @__PURE__ */ jsxDEV("option", { value: "hold", children: "Hold" }, void 0, false, {
            fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
            lineNumber: 1681,
            columnNumber: 411
          }, this)
        ] }, void 0, true, {
          fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
          lineNumber: 1681,
          columnNumber: 36
        }, this) }, void 0, false, {
          fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
          lineNumber: 1681,
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
          lineNumber: 1682,
          columnNumber: 11
        }, this),
        /* @__PURE__ */ jsxDEV(Property, { label: "Correspondence", children: /* @__PURE__ */ jsxDEV("select", { "aria-label": "Correspondence", value: world.transitionIn.correspondence, disabled: !correspondenceEnabled, title: correspondenceEnabled ? "Choose how source points are assigned to target points." : "Correspondence applies to Morph and Dissolve morph transitions.", onChange: (event) => update("Change correspondence", (draft) => {
          draft.transitionIn.correspondence = event.target.value;
        }), children: ABOUT_NARRATIVE_CORRESPONDENCE_MODES.map((mode) => /* @__PURE__ */ jsxDEV("option", { value: mode, children: CORRESPONDENCE_LABELS[mode] || mode }, mode, false, {
          fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
          lineNumber: 1683,
          columnNumber: 490
        }, this)) }, void 0, false, {
          fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
          lineNumber: 1683,
          columnNumber: 44
        }, this) }, void 0, false, {
          fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
          lineNumber: 1683,
          columnNumber: 11
        }, this),
        /* @__PURE__ */ jsxDEV("p", { className: "about-editor-help", role: "status", "aria-live": "polite", children: [
          "Correspondence: ",
          correspondenceStatus,
          prepared && runtimeMetrics?.correspondenceToWorldId === section.id && Number.isFinite(runtimeMetrics?.correspondenceImprovement) ? ` · ${Math.round(runtimeMetrics.correspondenceImprovement * 100)}% RMS improvement` : "",
          "."
        ] }, void 0, true, {
          fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
          lineNumber: 1684,
          columnNumber: 11
        }, this),
        /* @__PURE__ */ jsxDEV("button", { type: "button", className: "about-editor-danger", onClick: () => store.commit("Remove World transition", (draft) => {
          const transition = draft.sections[sectionIndex].world.transitionIn;
          transition.start = 0;
          transition.end = 0;
          transition.type = "cut";
        }, { selection: { type: "world", sectionId: section.id } }), children: "Remove transition keyframes" }, void 0, false, {
          fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
          lineNumber: 1685,
          columnNumber: 11
        }, this)
      ] }, void 0, true, {
        fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
        lineNumber: 1676,
        columnNumber: 30
      }, this) : /* @__PURE__ */ jsxDEV(Fragment, { children: [
        /* @__PURE__ */ jsxDEV("p", { className: "about-editor-help", children: "This World cuts in at the Section boundary and has no transition keyframes." }, void 0, false, {
          fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
          lineNumber: 1692,
          columnNumber: 11
        }, this),
        /* @__PURE__ */ jsxDEV("button", { type: "button", className: "about-editor-wide-action", onClick: () => store.commit("Add World transition", (draft) => {
          const transition = draft.sections[sectionIndex].world.transitionIn;
          transition.start = Math.min(0.08, transitionLimit);
          transition.end = Math.min(0.68, transitionLimit);
          transition.type = "morph";
        }, { selection: { type: "world", sectionId: section.id } }), children: "Add transition keyframes" }, void 0, false, {
          fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
          lineNumber: 1693,
          columnNumber: 11
        }, this)
      ] }, void 0, true, {
        fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
        lineNumber: 1691,
        columnNumber: 15
      }, this)
    ] }, void 0, true, {
      fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
      lineNumber: 1675,
      columnNumber: 7
    }, this),
    /* @__PURE__ */ jsxDEV("details", { open: true, children: [
      /* @__PURE__ */ jsxDEV("summary", { children: "Modifier stack" }, void 0, false, {
        fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
        lineNumber: 1701,
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
                lineNumber: 1710,
                columnNumber: 105
              }, this),
              definition?.label || item.id
            ] }, void 0, true, {
              fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
              lineNumber: 1710,
              columnNumber: 98
            }, this),
            /* @__PURE__ */ jsxDEV("span", { children: [
              /* @__PURE__ */ jsxDEV("button", { type: "button", disabled: modifierIndex === 0, onClick: () => moveModifier(-1), "aria-label": "Move modifier up", children: "↑" }, void 0, false, {
                fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
                lineNumber: 1710,
                columnNumber: 334
              }, this),
              /* @__PURE__ */ jsxDEV("button", { type: "button", disabled: modifierIndex === world.modifiers.length - 1, onClick: () => moveModifier(1), "aria-label": "Move modifier down", children: "↓" }, void 0, false, {
                fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
                lineNumber: 1710,
                columnNumber: 460
              }, this),
              " Cost ",
              definition?.cost || "?"
            ] }, void 0, true, {
              fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
              lineNumber: 1710,
              columnNumber: 328
            }, this)
          ] }, void 0, true, {
            fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
            lineNumber: 1710,
            columnNumber: 93
          }, this),
          (definition?.parameters || []).map((control) => control.type === "range" ? /* @__PURE__ */ jsxDEV(NumberProperty, { label: control.label, value: item.parameters[control.id], min: control.min, max: control.max, step: control.step, unit: control.unit, onChange: (value) => update(`Change ${control.label}`, (draft) => {
            draft.modifiers[modifierIndex].parameters[control.id] = value;
          }, `modifier:${section.id}:${modifierIndex}:${control.id}`) }, control.id, false, {
            fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
            lineNumber: 1710,
            columnNumber: 732
          }, this) : /* @__PURE__ */ jsxDEV(Property, { label: control.label, children: /* @__PURE__ */ jsxDEV("select", { value: item.parameters[control.id], onChange: (event) => update(`Change ${control.label}`, (draft) => {
            draft.modifiers[modifierIndex].parameters[control.id] = event.target.value;
          }), children: control.options.map((option) => /* @__PURE__ */ jsxDEV("option", { children: option }, option, false, {
            fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
            lineNumber: 1710,
            columnNumber: 1366
          }, this)) }, void 0, false, {
            fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
            lineNumber: 1710,
            columnNumber: 1143
          }, this) }, control.id, false, {
            fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
            lineNumber: 1710,
            columnNumber: 1094
          }, this))
        ] }, `${item.id}-${modifierIndex}`, true, {
          fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
          lineNumber: 1710,
          columnNumber: 18
        }, this);
      })
    ] }, void 0, true, {
      fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
      lineNumber: 1701,
      columnNumber: 7
    }, this)
  ] }, void 0, true, {
    fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
    lineNumber: 1657,
    columnNumber: 5
  }, this);
}
_c10 = WorldInspector;
function Diagnostics({ diagnostics }) {
  if (!diagnostics.length) return /* @__PURE__ */ jsxDEV("div", { className: "about-editor-diagnostics is-clear", children: [
    /* @__PURE__ */ jsxDEV(Check, { "aria-hidden": "true" }, void 0, false, {
      fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
      lineNumber: 1718,
      columnNumber: 86
    }, this),
    " No diagnostics"
  ] }, void 0, true, {
    fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
    lineNumber: 1718,
    columnNumber: 35
  }, this);
  return /* @__PURE__ */ jsxDEV("div", { className: "about-editor-diagnostics", children: diagnostics.map((item, index) => {
    const DiagnosticIcon = item.level === "error" ? CircleAlert : Info;
    return /* @__PURE__ */ jsxDEV("div", { className: `is-${item.level}`, children: [
      /* @__PURE__ */ jsxDEV(DiagnosticIcon, { "aria-hidden": "true" }, void 0, false, {
        fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
        lineNumber: 1721,
        columnNumber: 93
      }, this),
      /* @__PURE__ */ jsxDEV("span", { children: [
        /* @__PURE__ */ jsxDEV("strong", { children: item.message }, void 0, false, {
          fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
          lineNumber: 1721,
          columnNumber: 136
        }, this),
        /* @__PURE__ */ jsxDEV("small", { children: item.path }, void 0, false, {
          fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
          lineNumber: 1721,
          columnNumber: 167
        }, this)
      ] }, void 0, true, {
        fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
        lineNumber: 1721,
        columnNumber: 130
      }, this)
    ] }, `${item.code}-${item.path}-${index}`, true, {
      fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
      lineNumber: 1721,
      columnNumber: 14
    }, this);
  }) }, void 0, false, {
    fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
    lineNumber: 1719,
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
    lineNumber: 1732,
    columnNumber: 17
  }, this);
  if (snapshot.selection.type === "sequence") content = /* @__PURE__ */ jsxDEV(SequenceInspector, { store, snapshot }, void 0, false, {
    fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
    lineNumber: 1733,
    columnNumber: 57
  }, this);
  if (snapshot.selection.type === "cue") content = /* @__PURE__ */ jsxDEV(CueInspector, { store, snapshot, section }, void 0, false, {
    fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
    lineNumber: 1734,
    columnNumber: 52
  }, this);
  if (snapshot.selection.type === "discipline-reveal") content = /* @__PURE__ */ jsxDEV(DisciplineRevealInspector, { store, snapshot, section }, void 0, false, {
    fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
    lineNumber: 1735,
    columnNumber: 66
  }, this);
  if (snapshot.selection.type === "camera-key") content = /* @__PURE__ */ jsxDEV(CameraInspector, { store, snapshot, section }, void 0, false, {
    fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
    lineNumber: 1736,
    columnNumber: 59
  }, this);
  if (snapshot.selection.type === "world") content = /* @__PURE__ */ jsxDEV(WorldInspector, { store, snapshot, section, runtimeMetrics }, void 0, false, {
    fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
    lineNumber: 1737,
    columnNumber: 54
  }, this);
  if (snapshot.selection.type === "interaction") content = /* @__PURE__ */ jsxDEV(SectionInspector, { store, snapshot, section }, void 0, false, {
    fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
    lineNumber: 1738,
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
          lineNumber: 1838,
          columnNumber: 63
        }, this)
      ] }, void 0, true, {
        fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
        lineNumber: 1838,
        columnNumber: 7
      }, this)
    },
    void 0,
    false,
    {
      fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
      lineNumber: 1821,
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
        lineNumber: 1847,
        columnNumber: 12
      }, this),
      /* @__PURE__ */ jsxDEV("span", { children: [
        formatWU(snapshot.transport.storyWU),
        " / ",
        formatWU(total)
      ] }, void 0, true, {
        fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
        lineNumber: 1847,
        columnNumber: 52
      }, this)
    ] }, void 0, true, {
      fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
      lineNumber: 1847,
      columnNumber: 7
    }, this),
    /* @__PURE__ */ jsxDEV("svg", { viewBox: "0 0 240 112", role: "img", "aria-label": "Camera and World anchors over story distance", children: [
      /* @__PURE__ */ jsxDEV("path", { d: "M18 56 H222" }, void 0, false, {
        fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
        lineNumber: 1849,
        columnNumber: 9
      }, this),
      sections.map((section) => {
        const x = 18 + section.startWU / total * 204;
        return /* @__PURE__ */ jsxDEV("g", { transform: `translate(${x} 56)`, children: [
          /* @__PURE__ */ jsxDEV("line", { y1: "-12", y2: "12" }, void 0, false, {
            fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
            lineNumber: 1852,
            columnNumber: 71
          }, this),
          /* @__PURE__ */ jsxDEV("circle", { r: section.worldState?.changesWorld ? 4 : 2 }, void 0, false, {
            fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
            lineNumber: 1852,
            columnNumber: 96
          }, this),
          /* @__PURE__ */ jsxDEV("title", { children: [
            section.label,
            section.worldState?.changesWorld ? ` · ${section.worldState.activeWorld.shapeId}` : ""
          ] }, void 0, true, {
            fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
            lineNumber: 1852,
            columnNumber: 151
          }, this)
        ] }, section.id, true, {
          fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
          lineNumber: 1852,
          columnNumber: 18
        }, this);
      }),
      /* @__PURE__ */ jsxDEV("g", { className: "is-playhead", transform: `translate(${18 + snapshot.transport.storyWU / total * 204} 56)`, children: [
        /* @__PURE__ */ jsxDEV("path", { d: "M0 -22 L5 -15 H-5 Z" }, void 0, false, {
          fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
          lineNumber: 1854,
          columnNumber: 113
        }, this),
        /* @__PURE__ */ jsxDEV("line", { y1: "-15", y2: "22" }, void 0, false, {
          fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
          lineNumber: 1854,
          columnNumber: 145
        }, this)
      ] }, void 0, true, {
        fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
        lineNumber: 1854,
        columnNumber: 9
      }, this)
    ] }, void 0, true, {
      fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
      lineNumber: 1848,
      columnNumber: 7
    }, this),
    /* @__PURE__ */ jsxDEV("small", { children: "Dots are Section boundaries. Large dots are fixed World anchors. The marker is the published camera." }, void 0, false, {
      fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
      lineNumber: 1856,
      columnNumber: 7
    }, this)
  ] }, void 0, true, {
    fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
    lineNumber: 1846,
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
                lineNumber: 2078,
                columnNumber: 119
              }, this),
              /* @__PURE__ */ jsxDEV("span", { children: "About Narrative" }, void 0, false, {
                fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
                lineNumber: 2078,
                columnNumber: 149
              }, this),
              /* @__PURE__ */ jsxDEV("small", { children: "Creative toolkit" }, void 0, false, {
                fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
                lineNumber: 2078,
                columnNumber: 177
              }, this)
            ] }, void 0, true, {
              fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
              lineNumber: 2078,
              columnNumber: 9
            }, this),
            /* @__PURE__ */ jsxDEV(Transport, { store, snapshot }, void 0, false, {
              fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
              lineNumber: 2079,
              columnNumber: 9
            }, this),
            /* @__PURE__ */ jsxDEV("div", { className: "about-editor-actions", children: [
              /* @__PURE__ */ jsxDEV("button", { type: "button", disabled: !snapshot.history.canUndo, title: snapshot.history.undoLabel || "Undo", "aria-label": "Undo", onClick: () => store.undo(), children: /* @__PURE__ */ jsxDEV("span", { "aria-hidden": "true", children: "↶" }, void 0, false, {
                fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
                lineNumber: 2081,
                columnNumber: 162
              }, this) }, void 0, false, {
                fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
                lineNumber: 2081,
                columnNumber: 11
              }, this),
              /* @__PURE__ */ jsxDEV("button", { type: "button", disabled: !snapshot.history.canRedo, title: snapshot.history.redoLabel || "Redo", "aria-label": "Redo", onClick: () => store.redo(), children: /* @__PURE__ */ jsxDEV("span", { "aria-hidden": "true", children: "↷" }, void 0, false, {
                fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
                lineNumber: 2082,
                columnNumber: 162
              }, this) }, void 0, false, {
                fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
                lineNumber: 2082,
                columnNumber: 11
              }, this),
              /* @__PURE__ */ jsxDEV("button", { type: "button", className: pathVisible ? "is-active" : "", onClick: () => setPathVisible(!pathVisible), children: "Path" }, void 0, false, {
                fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
                lineNumber: 2083,
                columnNumber: 11
              }, this),
              /* @__PURE__ */ jsxDEV("button", { type: "button", className: directorView ? "is-active" : "", onClick: toggleDirector, children: directorView ? "Director" : "Camera" }, void 0, false, {
                fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
                lineNumber: 2084,
                columnNumber: 11
              }, this),
              /* @__PURE__ */ jsxDEV("button", { type: "button", className: snapshot.tryState?.label === "Compare saved source" ? "is-active" : "", disabled: snapshot.tryState && snapshot.tryState.label !== "Compare saved source", onClick: toggleBefore, children: snapshot.tryState?.label === "Compare saved source" ? "Before" : "After" }, void 0, false, {
                fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
                lineNumber: 2085,
                columnNumber: 11
              }, this),
              /* @__PURE__ */ jsxDEV("details", { className: "about-editor-more", children: [
                /* @__PURE__ */ jsxDEV("summary", { children: "More" }, void 0, false, {
                  fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
                  lineNumber: 2087,
                  columnNumber: 13
                }, this),
                /* @__PURE__ */ jsxDEV("div", { children: [
                  /* @__PURE__ */ jsxDEV("button", { type: "button", onClick: addCheckpoint, children: "Checkpoint" }, void 0, false, {
                    fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
                    lineNumber: 2089,
                    columnNumber: 15
                  }, this),
                  /* @__PURE__ */ jsxDEV("button", { type: "button", onClick: () => exportAboutNarrativeDocument(snapshot.document), children: "Export JSON" }, void 0, false, {
                    fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
                    lineNumber: 2090,
                    columnNumber: 15
                  }, this),
                  /* @__PURE__ */ jsxDEV("button", { type: "button", onClick: () => importRef.current?.click(), children: "Import JSON" }, void 0, false, {
                    fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
                    lineNumber: 2091,
                    columnNumber: 15
                  }, this)
                ] }, void 0, true, {
                  fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
                  lineNumber: 2088,
                  columnNumber: 13
                }, this)
              ] }, void 0, true, {
                fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
                lineNumber: 2086,
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
                lineNumber: 2094,
                columnNumber: 11
              }, this),
              /* @__PURE__ */ jsxDEV("button", { type: "button", "data-about-editor-save": true, className: "is-save", disabled: snapshot.saveState.status === "saving", onClick: save, children: [
                /* @__PURE__ */ jsxDEV("span", { children: statusLabel }, void 0, false, {
                  fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
                  lineNumber: 2104,
                  columnNumber: 141
                }, this),
                /* @__PURE__ */ jsxDEV("kbd", { children: "⌘S" }, void 0, false, {
                  fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
                  lineNumber: 2104,
                  columnNumber: 167
                }, this)
              ] }, void 0, true, {
                fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
                lineNumber: 2104,
                columnNumber: 11
              }, this)
            ] }, void 0, true, {
              fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
              lineNumber: 2080,
              columnNumber: 9
            }, this)
          ] }, void 0, true, {
            fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
            lineNumber: 2077,
            columnNumber: 7
          }, this),
          snapshot.recoveryState.available ? /* @__PURE__ */ jsxDEV("div", { className: "about-editor-recovery", children: [
            /* @__PURE__ */ jsxDEV("span", { children: [
              "An unsaved draft from ",
              new Date(snapshot.recoveryState.draft.timestamp).toLocaleString(),
              " is available."
            ] }, void 0, true, {
              fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
              lineNumber: 2108,
              columnNumber: 82
            }, this),
            /* @__PURE__ */ jsxDEV("button", { type: "button", onClick: () => {
              store.replaceDocument("Recover draft", snapshot.recoveryState.draft.document);
              store.setRecoveryState({ available: false });
            }, children: "Recover as unsaved copy" }, void 0, false, {
              fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
              lineNumber: 2108,
              columnNumber: 198
            }, this),
            /* @__PURE__ */ jsxDEV("button", { type: "button", onClick: () => {
              exportAboutNarrativeDocument(snapshot.recoveryState.draft.document, "contents-about-recovered.json");
            }, children: "Export" }, void 0, false, {
              fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
              lineNumber: 2108,
              columnNumber: 394
            }, this),
            /* @__PURE__ */ jsxDEV("button", { type: "button", onClick: () => {
              clearAboutNarrativeRecoveryDraft();
              store.setRecoveryState({ available: false });
            }, children: "Discard" }, void 0, false, {
              fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
              lineNumber: 2108,
              columnNumber: 551
            }, this)
          ] }, void 0, true, {
            fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
            lineNumber: 2108,
            columnNumber: 43
          }, this) : null,
          snapshot.saveState.message ? /* @__PURE__ */ jsxDEV("div", { className: `about-editor-save-message is-${snapshot.saveState.status}`, children: [
            snapshot.saveState.message,
            /* @__PURE__ */ jsxDEV("button", { type: "button", "aria-label": "Dismiss message", onClick: () => store.setSaveState({ message: "" }), children: "×" }, void 0, false, {
              fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
              lineNumber: 2109,
              columnNumber: 142
            }, this)
          ] }, void 0, true, {
            fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
            lineNumber: 2109,
            columnNumber: 37
          }, this) : null,
          pathVisible ? /* @__PURE__ */ jsxDEV(CameraPathOverlay, { snapshot }, void 0, false, {
            fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
            lineNumber: 2111,
            columnNumber: 22
          }, this) : null,
          directorView ? /* @__PURE__ */ jsxDEV("div", { className: "about-editor-director-controls", children: [
            /* @__PURE__ */ jsxDEV("strong", { children: "Director View" }, void 0, false, {
              fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
              lineNumber: 2112,
              columnNumber: 71
            }, this),
            /* @__PURE__ */ jsxDEV("button", { type: "button", onClick: () => runtimeRef.current?.nudgeDirector?.({ yaw: -0.08 }), children: "←" }, void 0, false, {
              fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
              lineNumber: 2112,
              columnNumber: 101
            }, this),
            /* @__PURE__ */ jsxDEV("button", { type: "button", onClick: () => runtimeRef.current?.nudgeDirector?.({ pitch: 0.08 }), children: "↑" }, void 0, false, {
              fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
              lineNumber: 2112,
              columnNumber: 201
            }, this),
            /* @__PURE__ */ jsxDEV("button", { type: "button", onClick: () => runtimeRef.current?.nudgeDirector?.({ pitch: -0.08 }), children: "↓" }, void 0, false, {
              fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
              lineNumber: 2112,
              columnNumber: 302
            }, this),
            /* @__PURE__ */ jsxDEV("button", { type: "button", onClick: () => runtimeRef.current?.nudgeDirector?.({ yaw: 0.08 }), children: "→" }, void 0, false, {
              fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
              lineNumber: 2112,
              columnNumber: 404
            }, this),
            /* @__PURE__ */ jsxDEV("button", { type: "button", onClick: () => runtimeRef.current?.nudgeDirector?.({ distance: -0.2 }), children: "＋" }, void 0, false, {
              fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
              lineNumber: 2112,
              columnNumber: 503
            }, this),
            /* @__PURE__ */ jsxDEV("button", { type: "button", onClick: () => runtimeRef.current?.nudgeDirector?.({ distance: 0.2 }), children: "−" }, void 0, false, {
              fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
              lineNumber: 2112,
              columnNumber: 607
            }, this),
            /* @__PURE__ */ jsxDEV("button", { type: "button", onClick: () => runtimeRef.current?.resetDirector?.(), children: "Reset" }, void 0, false, {
              fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
              lineNumber: 2112,
              columnNumber: 710
            }, this),
            /* @__PURE__ */ jsxDEV("small", { children: "Temporary inspection only. Published Camera keys are unchanged." }, void 0, false, {
              fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
              lineNumber: 2112,
              columnNumber: 800
            }, this)
          ] }, void 0, true, {
            fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
            lineNumber: 2112,
            columnNumber: 23
          }, this) : null,
          /* @__PURE__ */ jsxDEV(Inspector, { store, snapshot, timelineOpen, runtimeMetrics }, void 0, false, {
            fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
            lineNumber: 2114,
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
                  lineNumber: 2122,
                  columnNumber: 25
                }, this) : /* @__PURE__ */ jsxDEV(ChevronUp, { "aria-hidden": "true" }, void 0, false, {
                  fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
                  lineNumber: 2122,
                  columnNumber: 62
                }, this),
                /* @__PURE__ */ jsxDEV("span", { children: timelineOpen ? "Hide timeline" : "Show timeline" }, void 0, false, {
                  fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
                  lineNumber: 2122,
                  columnNumber: 95
                }, this)
              ]
            },
            void 0,
            true,
            {
              fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
              lineNumber: 2115,
              columnNumber: 7
            },
            this
          ),
          /* @__PURE__ */ jsxDEV("div", { id: "about-editor-timeline-panel", className: "about-editor-bottom", "aria-hidden": !timelineOpen, children: [
            /* @__PURE__ */ jsxDEV("div", { className: "about-editor-contextbar", children: [
              /* @__PURE__ */ jsxDEV("span", { children: [
                /* @__PURE__ */ jsxDEV("strong", { children: selected?.label || "Sequence" }, void 0, false, {
                  fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
                  lineNumber: 2125,
                  columnNumber: 17
                }, this),
                " ",
                selected ? `${selected.type} · ${formatWU(Math.max(0, selectedExtent - 1))} scroll · ${formatWU(selectedExtent)} total${resolvedExtent > selectedExtent + 1e-3 ? ` · ${formatWU(resolvedExtent)} resolved` : ""}` : ""
              ] }, void 0, true, {
                fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
                lineNumber: 2125,
                columnNumber: 11
              }, this),
              selectedCueCount > 1 ? /* @__PURE__ */ jsxDEV("span", { className: "about-editor-selection-count", children: [
                selectedCueCount,
                " titles selected"
              ] }, void 0, true, {
                fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
                lineNumber: 2126,
                columnNumber: 35
              }, this) : null,
              /* @__PURE__ */ jsxDEV("span", { children: snapshot.autoKey ? "Auto-key armed" : "Auto-key off" }, void 0, false, {
                fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
                lineNumber: 2127,
                columnNumber: 11
              }, this),
              /* @__PURE__ */ jsxDEV("button", { type: "button", className: snapshot.autoKey ? "is-active" : "", onClick: () => store.setAutoKey(!snapshot.autoKey), children: "◆ Auto-key" }, void 0, false, {
                fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
                lineNumber: 2128,
                columnNumber: 11
              }, this),
              /* @__PURE__ */ jsxDEV("button", { type: "button", className: loopActive ? "is-active" : "", onClick: toggleLoop, children: "Loop Section" }, void 0, false, {
                fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
                lineNumber: 2129,
                columnNumber: 11
              }, this),
              /* @__PURE__ */ jsxDEV("button", { type: "button", onClick: fitSequence, children: "Fit sequence" }, void 0, false, {
                fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
                lineNumber: 2130,
                columnNumber: 11
              }, this),
              /* @__PURE__ */ jsxDEV("button", { type: "button", disabled: !compiledSelected, onClick: fitSection, children: "Fit Section" }, void 0, false, {
                fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
                lineNumber: 2131,
                columnNumber: 11
              }, this),
              ["camera", "world", "text"].map((track) => /* @__PURE__ */ jsxDEV("button", { type: "button", className: snapshot.transport.soloTrack === track ? "is-active" : "", onClick: () => toggleSolo(track), children: [
                "Solo ",
                track
              ] }, track, true, {
                fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
                lineNumber: 2132,
                columnNumber: 55
              }, this)),
              timelineDeletion ? /* @__PURE__ */ jsxDEV("button", { type: "button", className: "about-editor-delete-key", disabled: timelineDeletion.disabled, title: timelineDeletion.message || `${timelineDeletion.label} · Delete/Backspace`, onClick: () => deleteTimelineSelection(store, snapshot), children: [
                /* @__PURE__ */ jsxDEV(Trash2, { "aria-hidden": "true" }, void 0, false, {
                  fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
                  lineNumber: 2133,
                  columnNumber: 266
                }, this),
                timelineDeletion.label
              ] }, void 0, true, {
                fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
                lineNumber: 2133,
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
                lineNumber: 2134,
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
                  lineNumber: 2135,
                  columnNumber: 369
                }, this),
                checkpoints.map((item) => /* @__PURE__ */ jsxDEV("option", { value: item.id, children: item.name }, item.id, false, {
                  fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
                  lineNumber: 2135,
                  columnNumber: 456
                }, this))
              ] }, void 0, true, {
                fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
                lineNumber: 2135,
                columnNumber: 33
              }, this) : null
            ] }, void 0, true, {
              fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
              lineNumber: 2124,
              columnNumber: 9
            }, this),
            /* @__PURE__ */ jsxDEV(Timeline, { store, snapshot }, void 0, false, {
              fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
              lineNumber: 2137,
              columnNumber: 9
            }, this)
          ] }, void 0, true, {
            fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
            lineNumber: 2123,
            columnNumber: 7
          }, this),
          /* @__PURE__ */ jsxDEV("nav", { className: "about-editor-mobile-tabs", "aria-label": "Editor panel", children: [
            /* @__PURE__ */ jsxDEV("button", { type: "button", className: mobilePane === "sequence" ? "is-active" : "", onClick: () => setMobilePane("sequence"), children: "Sequence" }, void 0, false, {
              fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
              lineNumber: 2139,
              columnNumber: 75
            }, this),
            /* @__PURE__ */ jsxDEV("button", { type: "button", className: mobilePane === "inspect" ? "is-active" : "", onClick: () => setMobilePane("inspect"), children: "Inspect" }, void 0, false, {
              fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
              lineNumber: 2139,
              columnNumber: 213
            }, this),
            /* @__PURE__ */ jsxDEV("button", { type: "button", className: mobilePane === "preview" ? "is-active" : "", onClick: () => setMobilePane("preview"), children: "Preview" }, void 0, false, {
              fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
              lineNumber: 2139,
              columnNumber: 348
            }, this)
          ] }, void 0, true, {
            fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
            lineNumber: 2139,
            columnNumber: 7
          }, this)
        ]
      },
      void 0,
      true,
      {
        fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
        lineNumber: 2070,
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

//# sourceMappingURL=data:application/json;base64,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WCxJQUFBSyxLQUFBWSxLQUFBd2UsS0FBQTNULEtBQUFlLEtBQUFrQixLQUFBMlIsS0FBQWxQLEtBQUFTLEtBQUE2QixLQUFBd0MsTUFBQU0sTUFBQStKLE1BQUE5SCxNQUFBK0g7QUFBQSxhQUFBNWYsSUFBQTtBQUFBLGFBQUFLLEtBQUE7QUFBQSxhQUFBWSxLQUFBO0FBQUEsYUFBQXdlLEtBQUE7QUFBQSxhQUFBM1QsS0FBQTtBQUFBLGFBQUFlLEtBQUE7QUFBQSxhQUFBa0IsS0FBQTtBQUFBLGFBQUEyUixLQUFBO0FBQUEsYUFBQWxQLEtBQUE7QUFBQSxhQUFBUyxLQUFBO0FBQUEsYUFBQTZCLEtBQUE7QUFBQSxhQUFBd0MsTUFBQTtBQUFBLGFBQUFNLE1BQUE7QUFBQSxhQUFBK0osTUFBQTtBQUFBLGFBQUE5SCxNQUFBO0FBQUEsYUFBQStILE1BQUEiLCJuYW1lcyI6WyJ1c2VFZmZlY3QiLCJ1c2VSZWYiLCJ1c2VTdGF0ZSIsInVzZVN5bmNFeHRlcm5hbFN0b3JlIiwiY3JlYXRlUG9ydGFsIiwiQ2hlY2siLCJDaGV2cm9uRG93biIsIkNoZXZyb25MZWZ0IiwiQ2hldnJvblJpZ2h0IiwiQ2hldnJvblVwIiwiQ2lyY2xlQWxlcnQiLCJEaWFtb25kIiwiSW5mbyIsIkxvY2tLZXlob2xlIiwiUGF1c2UiLCJQbGF5IiwiU2tpcEJhY2siLCJTa2lwRm9yd2FyZCIsIlRyYXNoMiIsIkFCT1VUX05BUlJBVElWRV9HTE9CQUxfQ09OVFJPTFMiLCJBQk9VVF9OQVJSQVRJVkVfQ09SUkVTUE9OREVOQ0VfTU9ERVMiLCJBQk9VVF9OQVJSQVRJVkVfRElTQ0lQTElORV9SRVZFQUxfQ09OVFJPTFMiLCJBQk9VVF9OQVJSQVRJVkVfRU1QSEFTSVNfVE9ORVMiLCJBQk9VVF9OQVJSQVRJVkVfTU9ESUZJRVJfREVGSU5JVElPTlMiLCJBQk9VVF9OQVJSQVRJVkVfU0hBUEVfREVGSU5JVElPTlMiLCJjbGVhckFib3V0TmFycmF0aXZlUmVjb3ZlcnlEcmFmdCIsImV4cG9ydEFib3V0TmFycmF0aXZlRG9jdW1lbnQiLCJsb2FkQWJvdXROYXJyYXRpdmVTb3VyY2UiLCJyZWFkQWJvdXROYXJyYXRpdmVDaGVja3BvaW50cyIsInJlYWRBYm91dE5hcnJhdGl2ZVJlY292ZXJ5RHJhZnQiLCJzYXZlQWJvdXROYXJyYXRpdmVTb3VyY2UiLCJ3cml0ZUFib3V0TmFycmF0aXZlQ2hlY2twb2ludCIsIndyaXRlQWJvdXROYXJyYXRpdmVSZWNvdmVyeURyYWZ0IiwiYXNzZXJ0VmFsaWRBYm91dE5hcnJhdGl2ZURvY3VtZW50IiwiY2xvbmVBYm91dE5hcnJhdGl2ZURvY3VtZW50IiwiZ2V0QWJvdXROYXJyYXRpdmVDdWVNb3ZlbWVudCIsImdldEFib3V0TmFycmF0aXZlQ3VlTW90aW9uSW50ZXJ2YWwiLCJnZXRBYm91dE5hcnJhdGl2ZVdvcmxkVHJhbnNpdGlvbkxpbWl0Iiwic2FtcGxlQWJvdXROYXJyYXRpdmVQbGFuIiwiY2FwdHVyZUFib3V0TmFycmF0aXZlUGxheWhlYWRDb250ZXh0IiwiY3JlYXRlQWJvdXROYXJyYXRpdmVDdWVDbGlwYm9hcmRQYXlsb2FkIiwiZGVyaXZlQWJvdXROYXJyYXRpdmVMb29wUmFuZ2UiLCJkdXBsaWNhdGVBYm91dE5hcnJhdGl2ZUN1ZUdyb3VwIiwiZHVwbGljYXRlQWJvdXROYXJyYXRpdmVTZWN0aW9uIiwiZ2V0QWJvdXROYXJyYXRpdmVDYW1lcmFLZXlUaW1pbmdCb3VuZHMiLCJnZXRBYm91dE5hcnJhdGl2ZUN1ZVRpbWluZ0JvdW5kcyIsImdldEFib3V0TmFycmF0aXZlRXh0ZW50RmllbGQiLCJnZXRBYm91dE5hcnJhdGl2ZVNlbGVjdGlvbk1lbWJlcnMiLCJtb3ZlQWJvdXROYXJyYXRpdmVDdWVUaW1pbmciLCJyZW1hcEFib3V0TmFycmF0aXZlUGxheWhlYWRDb250ZXh0IiwicmVzb2x2ZUFib3V0TmFycmF0aXZlQ2FtZXJhS2V5RHJvcCIsInJlc29sdmVBYm91dE5hcnJhdGl2ZUN1ZURpc3RyaWJ1dGlvbiIsInJlc29sdmVBYm91dE5hcnJhdGl2ZUN1ZUV4YWN0R2FwIiwicmVzb2x2ZUFib3V0TmFycmF0aXZlQ3VlR3JvdXBNb3ZlIiwicmVzb2x2ZUFib3V0TmFycmF0aXZlQ3VlR3JvdXBBbGlnbiIsInJlc29sdmVBYm91dE5hcnJhdGl2ZUN1ZUdyb3VwUGFzdGUiLCJzbmFwQWJvdXROYXJyYXRpdmVUaW1lbGluZVZhbHVlIiwic3RpdGNoQWJvdXROYXJyYXRpdmVDYW1lcmFCb3VuZGFyaWVzIiwidG9nZ2xlQWJvdXROYXJyYXRpdmVDdWVTZWxlY3Rpb24iLCJ2YWxpZGF0ZUFib3V0TmFycmF0aXZlQ3VlQ2xpcGJvYXJkUGF5bG9hZCIsImNsYW1wMDEiLCJ2YWx1ZSIsIk1hdGgiLCJtaW4iLCJtYXgiLCJBQk9VVF9FRElUT1JfVElNRUxJTkVfU1RPUkFHRV9LRVkiLCJUSU1FTElORV9LRVlfRVBTSUxPTiIsIklOU1BFQ1RPUl9FREdFX0dBUCIsIkNBTUVSQV9QT1NFX0ZJRUxEUyIsIlNldCIsIkRJU0NJUExJTkVfUkVWRUFMX01BWCIsImZpbmQiLCJjb250cm9sIiwiaWQiLCJESVNDSVBMSU5FX0JBTExfVE9LRU5fQllfR1JPVVAiLCJPYmplY3QiLCJmcmVlemUiLCJjYW1lcmFQb3NlQ2hhbmdlcyIsImZyb20iLCJ0byIsInNvbWUiLCJmaWVsZCIsImluZGV4IiwiYWJzIiwiZm92Iiwicm9sbCIsImNvcHlDYW1lcmFQb3NlIiwidGFyZ2V0Iiwic291cmNlIiwib2Zmc2V0IiwibG9va0F0T2Zmc2V0IiwibGlua0NhbWVyYUJvdW5kYXJ5IiwiZG9jdW1lbnQiLCJzZWN0aW9uSW5kZXgiLCJrZXlJbmRleCIsInNlY3Rpb24iLCJzZWN0aW9ucyIsImtleSIsImNhbWVyYSIsImtleXMiLCJhdCIsImxlbmd0aCIsImJyaWRnZUNhbWVyYVNlY3Rpb24iLCJzdGl0Y2hDYW1lcmFCb3VuZGFyaWVzIiwiZ2V0SW5zcGVjdG9yVmVydGljYWxCb3VuZHMiLCJpbnNwZWN0b3IiLCJ0aW1lbGluZU9wZW4iLCJlZGl0b3IiLCJjbG9zZXN0Iiwic3R5bGVzIiwiZ2V0Q29tcHV0ZWRTdHlsZSIsInRvcGJhckhlaWdodCIsIk51bWJlciIsInBhcnNlRmxvYXQiLCJnZXRQcm9wZXJ0eVZhbHVlIiwidGltZWxpbmVIZWlnaHQiLCJidXR0b25CYXJUb3AiLCJxdWVyeVNlbGVjdG9yIiwiZ2V0Qm91bmRpbmdDbGllbnRSZWN0IiwidG9wIiwid2luZG93IiwiaW5uZXJIZWlnaHQiLCJtaW5Ub3AiLCJtYXhCb3R0b20iLCJjbGFtcEluc3BlY3RvclBvc2l0aW9uIiwicG9zaXRpb24iLCJtYXhXaWR0aCIsImlubmVyV2lkdGgiLCJ3aWR0aCIsImF2YWlsYWJsZUhlaWdodCIsImhlaWdodCIsIm1heExlZnQiLCJtYXhUb3AiLCJsZWZ0IiwiZ2V0U2VjdGlvbkluZGV4Iiwic2VjdGlvbklkIiwiZmluZEluZGV4IiwiZ2V0U2VjdGlvbiIsInNlbGVjdGlvbiIsImdldExvY2FsUHJvZ3Jlc3MiLCJwbGFuIiwic3RvcnlXVSIsImNvbXBpbGVkIiwiaXRlbSIsInN0YXJ0V1UiLCJ0cmF2ZWxXVSIsImZvcm1hdFdVIiwidG9GaXhlZCIsImZvcm1hdENhbWVyYVBlcmNlbnQiLCJpc1RleHRFZGl0aW5nVGFyZ2V0IiwiSFRNTEVsZW1lbnQiLCJtYXRjaGVzIiwiaXNDb250ZW50RWRpdGFibGUiLCJnZXRUaW1lbGluZUtleWZyYW1lcyIsInNuYXBzaG90IiwiY29tcGlsZWRQbGFuIiwiZXZlbnRzIiwiZm9yRWFjaCIsInRvU3RvcnlXVSIsInB1c2giLCJwcmlvcml0eSIsInR5cGUiLCJ3b3JsZCIsIm1vZGUiLCJ0cmFuc2l0aW9uSW4iLCJwYXJ0IiwicGFydEluZGV4Iiwia2V5UGFydCIsInRleHQiLCJjdWVzIiwiY3VlIiwiY3VlSW5kZXgiLCJob2xkIiwiY3VlSWQiLCJkaXNjaXBsaW5lUmV2ZWFsIiwic3RhcnQiLCJpbnRlcmFjdGlvbiIsImlzRmluaXRlIiwiYWN0aXZhdGlvblN0YXJ0Iiwic29ydCIsImEiLCJiIiwiZ2V0VGltZWxpbmVEZWxldGlvbiIsInJlcXVpcmVkIiwibGFiZWwiLCJkaXNhYmxlZCIsIm1lc3NhZ2UiLCJleGVjdXRlIiwic3RvcmUiLCJjb21taXQiLCJkcmFmdCIsInNwbGljZSIsInN0YXJ0c1dpdGgiLCJ0cmFuc2l0aW9uIiwiZW5kIiwiZGVsZXRlVGltZWxpbmVTZWxlY3Rpb24iLCJkZWxldGlvbiIsInNldFNhdmVTdGF0ZSIsInNlZWtUaW1lbGluZUtleWZyYW1lIiwiZXZlbnQiLCJzZXRTZWxlY3Rpb24iLCJzZXRUcmFuc3BvcnQiLCJvd25lciIsInBsYXlpbmciLCJqdW1wVGltZWxpbmVLZXlmcmFtZSIsImRpcmVjdGlvbiIsImN1cnJlbnRXVSIsInRyYW5zcG9ydCIsInRhcmdldFBvc2l0aW9uIiwicmV2ZXJzZSIsIm1ha2VTbHVnIiwidG9Mb3dlckNhc2UiLCJyZXBsYWNlIiwibmV4dElkIiwiYmFzZSIsInVzZWQiLCJmbGF0TWFwIiwibWFwIiwiYmxvY2tzIiwiYmxvY2siLCJzdWZmaXgiLCJoYXMiLCJyZXBsYWNlRHJhZnREb2N1bWVudCIsIm5leHREb2N1bWVudCIsImFzc2lnbiIsImFwcGx5Q3VlTW92ZXMiLCJtb3ZlcyIsIm1vdmUiLCJlbnRlciIsImV4aXQiLCJQcm9wZXJ0eSIsImNoaWxkcmVuIiwiaGludCIsIl9jIiwiTnVtYmVyUHJvcGVydHkiLCJzdGVwIiwib25DaGFuZ2UiLCJ1bml0IiwiX2MyIiwiVHJhbnNwb3J0IiwibWF4V1UiLCJtYXhTdG9yeVdVIiwicGxheSIsInNlZWsiLCJzZWxlY3RlZCIsImp1bXBTZWN0aW9uIiwibmV4dCIsImxpdmVBbWJpZW50IiwicHJldmlld1Byb2ZpbGUiLCJzZXRQcmV2aWV3UHJvZmlsZSIsIl9jMyIsIlRpbWVsaW5lIiwiX3MiLCJzZWxlY3RlZEN1ZU1lbWJlcnMiLCJyZWR1Y2UiLCJzdW0iLCJleHRlbnRXVSIsInBsYXloZWFkIiwibGFuZXNSZWYiLCJ0aW1pbmdEcmFnUmVmIiwicHJldmlld0ZyYW1lUmVmIiwicGVuZGluZ1ByZXZpZXdSZWYiLCJzdXBwcmVzc2VkQ2xpY2tSZWYiLCJjYW1lcmFEcmFnUHJldmlldyIsInNldENhbWVyYURyYWdQcmV2aWV3Iiwic2VjdGlvblJlc2l6ZVByZXZpZXciLCJzZXRTZWN0aW9uUmVzaXplUHJldmlldyIsIm1hcnF1ZWUiLCJzZXRNYXJxdWVlIiwicXVldWVQcmV2aWV3RnJhbWUiLCJjYWxsYmFjayIsImN1cnJlbnQiLCJyZXF1ZXN0QW5pbWF0aW9uRnJhbWUiLCJwZW5kaW5nIiwiZmx1c2hQcmV2aWV3RnJhbWUiLCJjYW5jZWxBbmltYXRpb25GcmFtZSIsInpvb21UaW1lbGluZSIsImN0cmxLZXkiLCJtZXRhS2V5IiwicHJldmVudERlZmF1bHQiLCJsYW5lcyIsInJlY3QiLCJwb2ludGVyWCIsImNsaWVudFgiLCJzdG9yeVJhdGlvIiwic2Nyb2xsTGVmdCIsInNjcm9sbFdpZHRoIiwiY3VycmVudFpvb20iLCJ6b29tIiwibmV4dFpvb20iLCJleHAiLCJkZWx0YVkiLCJyZXNvbHZlQ2FtZXJhRHJvcEF0Q2xpZW50WCIsImdldFNuYXBzaG90IiwidmFsaWQiLCJyZWFzb24iLCJjb250ZW50WCIsImRyYWciLCJkcm9wIiwic291cmNlU2VjdGlvbkluZGV4Iiwic291cmNlS2V5SW5kZXgiLCJiZWdpblRpbWluZ0RyYWciLCJsb2NrZWQiLCJidXR0b24iLCJjbGlwIiwiY3VycmVudFRhcmdldCIsInBhcmVudEVsZW1lbnQiLCJzdG9wUHJvcGFnYXRpb24iLCJzZXRQb2ludGVyQ2FwdHVyZSIsInBvaW50ZXJJZCIsIm5leHRTZWxlY3Rpb24iLCJjdXJyZW50U2VsZWN0aW9uIiwiY3VycmVudE1lbWJlcnMiLCJhbHJlYWR5U2VsZWN0ZWQiLCJtZW1iZXIiLCJzaGlmdEtleSIsIm1lbWJlcnMiLCJiZWdpblByZXZpZXciLCJzdGFydERvY3VtZW50Iiwic3RhcnRQbGFuIiwic3RhcnRYIiwibW92ZWQiLCJsYXN0QXQiLCJsYXN0RHJvcCIsIm1vdmVUaW1pbmdEcmFnIiwidG9rZW4iLCJkZWx0YUxhbmUiLCJuZXh0QXQiLCJkZWx0YSIsInJldmVhbCIsImNvYWxlc2NlS2V5Iiwic2VjdGlvblN0YXJ0V1UiLCJsb2NhbERlbHRhIiwibW92ZW1lbnQiLCJwcmltYXJ5IiwiZGVsdGFXVSIsImxhc3REZWx0YVdVIiwidXBkYXRlUHJldmlldyIsImVuZFRpbWluZ0RyYWciLCJoYXNQb2ludGVyQ2FwdHVyZSIsInJlbGVhc2VQb2ludGVyQ2FwdHVyZSIsImNhbmNlbFByZXZpZXciLCJjb21taXRQcmV2aWV3Iiwic291cmNlS2V5cyIsIm1vdmVkS2V5IiwiZGVzdGluYXRpb25LZXlzIiwic2V0VGltZW91dCIsImhhbmRsZVRpbWluZ0NsaWNrIiwiYWN0aW9uIiwiYmVnaW5TZWN0aW9uUmVzaXplIiwiZGF0YSIsInNlY3Rpb25MYWJlbCIsInN0YXJ0RXh0ZW50Iiwic3RhcnRNYXhXVSIsInN0YXJ0U2Nyb2xsV2lkdGgiLCJwbGF5aGVhZENvbnRleHQiLCJyZXNpemVkU2VjdGlvbklkIiwiZXh0ZW50IiwibW92ZVNlY3Rpb25SZXNpemUiLCJyYXdFeHRlbnQiLCJhbHRLZXkiLCJyb3VuZCIsImxhc3RFeHRlbnQiLCJlbmRTZWN0aW9uUmVzaXplIiwicmVzZXRTZWN0aW9uRXh0ZW50IiwiYmFzZWxpbmVTZWN0aW9uIiwiYmFzZWxpbmVEb2N1bWVudCIsImNvbnRleHQiLCJiZWdpbk1hcnF1ZWUiLCJjYW52YXMiLCJzdGFydENsaWVudFgiLCJzdGFydENsaWVudFkiLCJjbGllbnRZIiwiY2FudmFzUmVjdCIsImFkZGl0aXZlIiwibW92ZU1hcnF1ZWUiLCJlbmRNYXJxdWVlIiwic2VsZWN0aW9uUmVjdCIsInJpZ2h0IiwiYm90dG9tIiwibGFuZVJlY3QiLCJoaXRzIiwicXVlcnlTZWxlY3RvckFsbCIsImZpbHRlciIsIm5vZGUiLCJ2aXNpYmxlIiwiZGF0YXNldCIsInNsaWNlIiwiaGl0Iiwic29sb1RyYWNrIiwibGFuZSIsIm5leHRTdGFydFdVIiwic3BhbldVIiwiaW5TZWxlY3RlZFNlY3Rpb24iLCJsb2NhbFBlcmNlbnQiLCJsb2NhbFBvc2l0aW9uIiwiZXh0ZW5kZWRMb2NhbFBvc2l0aW9uIiwiZXh0ZW5kZWRMb2NhbFdpZHRoIiwidGV4dFBvc2l0aW9uIiwic2VsZWN0QXQiLCJpc1NlbGVjdGVkIiwicmVzaXplRXh0ZW50IiwicmVzb2x2ZWRFeHRlbnRXVSIsIlN0cmluZyIsInBhZFN0YXJ0IiwiZnJvbUtleSIsInRpbWluZ0JvdW5kcyIsImtleVNlbGVjdGlvbiIsInVuZGVmaW5lZCIsInNoYXBlSWQiLCJpc1ByaW1hcnkiLCJjdWVTZWxlY3Rpb24iLCJjb2RlIiwiZHVyYXRpb24iLCJjZW50cmUiLCJyZXZlYWxTZWxlY3Rpb24iLCJhY3RpdmF0aW9uIiwiU2VxdWVuY2VJbnNwZWN0b3IiLCJjb21taXRHbG9iYWwiLCJncm91cCIsImdsb2JhbHMiLCJ0YXJnZXRLZXkiLCJjb250cm9scyIsIl9jNSIsIlNlY3Rpb25JbnNwZWN0b3IiLCJjb21waWxlZFNlY3Rpb24iLCJhY3RpdmVFeHRlbnRGaWVsZCIsImFjdGl2ZUV4dGVudCIsInJlc29sdmVkRXh0ZW50IiwiY29udGVudE1pbmltdW1BY3RpdmUiLCJ1cGRhdGUiLCJtdXRhdGUiLCJ0b0luZGV4IiwibW9iaWxlRXh0ZW50V1UiLCJsb2NhbCIsImZvY3VzIiwicHJlc2V0IiwibW90aW9uIiwiX2M2IiwiRWRpdG9yaWFsQmxvY2tzIiwidXBkYXRlQmxvY2siLCJibG9ja0luZGV4IiwidXBkYXRlRW1waGFzaXMiLCJlbXBoYXNpc0luZGV4IiwiZW1waGFzaXMiLCJhZGRFbXBoYXNpcyIsInRyaW0iLCJzcGxpdCIsImpvaW4iLCJ0b25lIiwicmVtb3ZlRW1waGFzaXMiLCJraW5kIiwid29ybGRJbmZsdWVuY2UiLCJjaGVja2VkIiwiaXRlbXMiLCJCb29sZWFuIiwiX2M3IiwiQ3VlUmh5dGhtQW5kUmV1c2UiLCJjbGlwYm9hcmQiLCJzZXRDbGlwYm9hcmQiLCJfczIiLCJnYXBXVSIsInNldEdhcFdVIiwiYW5jaG9yIiwic2V0QW5jaG9yIiwicHJldmlldyIsInNldFByZXZpZXciLCJzZXRNZXNzYWdlIiwicHJldmlld01vdmVzIiwicmVzdWx0IiwidHJ5U3RhdGUiLCJjYW5jZWxUcnkiLCJiZWdpblRyeSIsImFwcGx5UHJldmlldyIsImFwcGx5VHJ5IiwiY29tbWl0Q2FuZGlkYXRlIiwiZGlzdHJpYnV0ZSIsImV4YWN0R2FwIiwiYWxpZ25QcmltYXJ5IiwicGxheWhlYWRXVSIsImR1cGxpY2F0ZSIsImNvcHkiLCJwYXlsb2FkIiwidmFsaWRhdGlvbiIsInBhc3RlIiwiZGVzdGluYXRpb25TZWN0aW9uSWQiLCJnaG9zdE1vdmVzIiwiQ3VlSW5zcGVjdG9yIiwic2VsZWN0ZWRNZW1iZXJzIiwicmVtb3ZlIiwibW90aW9uSW50ZXJ2YWwiLCJ0ZXh0TW90aW9uIiwibW92ZUN1ZSIsInBlcmNlbnQiLCJ1cGRhdGVNb3ZlbWVudCIsIm1lbWJlclNlY3Rpb24iLCJtZW1iZXJDdWUiLCJfYzkiLCJEaXNjaXBsaW5lUmV2ZWFsSW5zcGVjdG9yIiwib2NjdXBpZWQiLCJzdGFnZ2VyIiwibGFiZWxEdXJhdGlvbiIsImxpbWl0c0ZvciIsImxpbWl0cyIsIml0ZW1JbmRleCIsImJhY2tncm91bmQiLCJfYzAiLCJDYW1lcmFJbnNwZWN0b3IiLCJzZWxlY3RlZEtleSIsInRhcmdldEF0IiwiYXBwbHlQcmVzZXQiLCJyZWNpcGVzIiwiUHVzaCIsImVhc2luZyIsIkdsaWRlIiwiT3JiaXQiLCJSZXZlYWwiLCJSZXNvbHZlIiwiZXhpc3RpbmdLZXlBdFBsYXloZWFkIiwic2V0S2V5IiwiaW5zZXJ0aW9uSW5kZXgiLCJzZWxlY3RlZEtleUluZGV4Iiwic2FtcGxlZCIsImJhc2VaIiwic3RhcnRaIiwiY2FkZW5jZSIsIm5ld0tleSIsImF4aXMiLCJuYW1lIiwiQXJyYXkiLCJpc0FycmF5IiwidXBkYXRlVmVjdG9yIiwiZXh0ZW50RmllbGQiLCJleHRlbnRMYWJlbCIsInVwZGF0ZUV4dGVudCIsIl9jMSIsIkNPUlJFU1BPTkRFTkNFX0xBQkVMUyIsIldvcmxkSW5zcGVjdG9yIiwicnVudGltZU1ldHJpY3MiLCJzaGFwZSIsInRyYW5zaXRpb25MaW1pdCIsInRyYW5zaXRpb25NYXgiLCJ0cmFuc2l0aW9uRW5hYmxlZCIsImNvcnJlc3BvbmRlbmNlRW5hYmxlZCIsImluY2x1ZGVzIiwicHJldmlvdXNXb3JsZFNlY3Rpb24iLCJzb3VyY2VTaGFwZSIsInByZXBhcmVkIiwicHJlcGFyZWRXb3JsZElkcyIsImNvcnJlc3BvbmRlbmNlU3RhdHVzIiwiY29ycmVzcG9uZGVuY2VTZXF1ZW5jZVN0YXRlIiwiY29ycmVzcG9uZGVuY2VGYWxsYmFjayIsImNvcnJlc3BvbmRlbmNlVG9Xb3JsZElkIiwidHJ5U2hhcGUiLCJzaGFwZVBhcmFtZXRlcnMiLCJmcm9tRW50cmllcyIsInBhcmFtZXRlcnMiLCJ2YWx1ZXMiLCJjb3N0Iiwic2VlZCIsImZsb29yIiwicmFuZG9tIiwiZW50cnlEaXN0YW5jZVdVIiwidHJhbnNmb3JtIiwic2NhbGUiLCJjb3JyZXNwb25kZW5jZSIsImNvcnJlc3BvbmRlbmNlSW1wcm92ZW1lbnQiLCJtb2RpZmllcnMiLCJtb2RpZmllckluZGV4IiwiZGVmaW5pdGlvbiIsIm1vdmVNb2RpZmllciIsIm5leHRJbmRleCIsImVuYWJsZWQiLCJvcHRpb25zIiwib3B0aW9uIiwiX2MxMCIsIkRpYWdub3N0aWNzIiwiZGlhZ25vc3RpY3MiLCJEaWFnbm9zdGljSWNvbiIsImxldmVsIiwicGF0aCIsIl9jMTEiLCJJbnNwZWN0b3IiLCJfczMiLCJpbnNwZWN0b3JSZWYiLCJkcmFnUmVmIiwibGFzdEhlYWRlckNsaWNrUmVmIiwic2V0UG9zaXRpb24iLCJkcmFnZ2luZyIsInNldERyYWdnaW5nIiwiY29udGVudCIsImtlZXBJbkJvdW5kcyIsImFkZEV2ZW50TGlzdGVuZXIiLCJyZW1vdmVFdmVudExpc3RlbmVyIiwiYmVnaW5EcmFnIiwiZmxvYXRpbmdIZWlnaHQiLCJvcmlnaW5YIiwib3JpZ2luWSIsIm1vdmVEcmFnIiwiZGVsdGFYIiwiaHlwb3QiLCJlbmREcmFnIiwibm93IiwicGVyZm9ybWFuY2UiLCJwcmV2aW91cyIsInRpbWUiLCJ4IiwieSIsInJlc2V0UG9zaXRpb24iLCJDYW1lcmFQYXRoT3ZlcmxheSIsInRvdGFsIiwid29ybGRTdGF0ZSIsImNoYW5nZXNXb3JsZCIsImFjdGl2ZVdvcmxkIiwiX2MxMyIsIkFib3V0TmFycmF0aXZlRWRpdG9yIiwicnVudGltZVJlZiIsInJvb3RSZWYiLCJfczQiLCJzdWJzY3JpYmUiLCJjaGVja3BvaW50cyIsInNldENoZWNrcG9pbnRzIiwic2V0UnVudGltZU1ldHJpY3MiLCJwYXRoVmlzaWJsZSIsInNldFBhdGhWaXNpYmxlIiwiZGlyZWN0b3JWaWV3Iiwic2V0RGlyZWN0b3JWaWV3IiwibW9iaWxlUGFuZSIsInNldE1vYmlsZVBhbmUiLCJzZXRUaW1lbGluZU9wZW4iLCJsb2NhbFN0b3JhZ2UiLCJnZXRJdGVtIiwiaW1wb3J0UmVmIiwic25hcHNob3RSZWYiLCJhY3RpdmVTZWxlY3Rpb24iLCJzZXRJdGVtIiwicm9vdCIsInJ1bnRpbWUiLCJzZXRBdHRyaWJ1dGUiLCJ0aGVuIiwiaGFzaCIsImRpcnR5IiwicmVwbGFjZURvY3VtZW50Iiwic2V0QmFzZWxpbmUiLCJyZWNvdmVyeSIsInRpbWVzdGFtcCIsIkRhdGUiLCJzZXRSZWNvdmVyeVN0YXRlIiwiYXZhaWxhYmxlIiwiZXJyb3IiLCJjYXRjaCIsInN0YXR1cyIsInJlbW92ZUF0dHJpYnV0ZSIsImNsYXNzTGlzdCIsIkNTUyIsImVzY2FwZSIsImFkZCIsImVkaXRvclNlbGVjdGlvblR5cGUiLCJpbnRlcnZhbCIsInNldEludGVydmFsIiwiZ2V0TWV0cmljcyIsImNsZWFySW50ZXJ2YWwiLCJ0aW1lciIsImJhc2VsaW5lSGFzaCIsImNsZWFyVGltZW91dCIsInBhZ2VoaWRlIiwia2V5ZG93biIsImNsaWNrIiwicmVkbyIsInVuZG8iLCJwcmV2aWV3U3RhdGUiLCJzYXZlIiwiZWRpdG9yVXJsIiwiVVJMIiwibG9jYXRpb24iLCJocmVmIiwic2VhcmNoUGFyYW1zIiwic2V0IiwiaGlzdG9yeSIsInJlcGxhY2VTdGF0ZSIsInN0YXRlIiwicGF0aG5hbWUiLCJzZWFyY2giLCJzZW50IiwibWFya1NhdmVkIiwiYWRkQ2hlY2twb2ludCIsImNoZWNrcG9pbnQiLCJjcnlwdG8iLCJyYW5kb21VVUlEIiwidG9Mb2NhbGVUaW1lU3RyaW5nIiwiaG91ciIsIm1pbnV0ZSIsImJhc2VTb3VyY2VIYXNoIiwic3RhdHVzTGFiZWwiLCJzYXZlU3RhdGUiLCJjb21waWxlZFNlbGVjdGVkIiwic2VsZWN0ZWRFeHRlbnQiLCJzZWxlY3RlZEN1ZUNvdW50IiwibG9vcEFjdGl2ZSIsImxvb3AiLCJ0aW1lbGluZURlbGV0aW9uIiwidG9nZ2xlTG9vcCIsImVuZFdVIiwidG9nZ2xlU29sbyIsInRyYWNrIiwiZml0U2VxdWVuY2UiLCJmaXRTZWN0aW9uIiwic2VjdGlvblNwYW4iLCJzdGFydFJhdGlvIiwiY2xpZW50V2lkdGgiLCJ0b2dnbGVEaXJlY3RvciIsInRvZ2dsZUJlZm9yZSIsImNhblVuZG8iLCJ1bmRvTGFiZWwiLCJjYW5SZWRvIiwicmVkb0xhYmVsIiwiZmlsZSIsImZpbGVzIiwiaW1wb3J0ZWQiLCJKU09OIiwicGFyc2UiLCJyZWNvdmVyeVN0YXRlIiwidG9Mb2NhbGVTdHJpbmciLCJudWRnZURpcmVjdG9yIiwieWF3IiwicGl0Y2giLCJkaXN0YW5jZSIsInJlc2V0RGlyZWN0b3IiLCJvcGVuIiwiYXV0b0tleSIsInNldEF1dG9LZXkiLCJmcmFtZVRpbWVNcyIsImRyYXdDYWxscyIsInBvaW50Q291bnQiLCJhY3RpdmVNb2RpZmllcnMiLCJidWZmZXJSZWJ1aWxkcyIsImZvdW5kIiwiYm9keSIsIl9jNCIsIl9jOCIsIl9jMTIiLCJfYzE0Il0sImlnbm9yZUxpc3QiOltdLCJzb3VyY2VzIjpbIkFib3V0TmFycmF0aXZlRWRpdG9yLmpzeCJdLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgeyB1c2VFZmZlY3QsIHVzZVJlZiwgdXNlU3RhdGUsIHVzZVN5bmNFeHRlcm5hbFN0b3JlIH0gZnJvbSAncmVhY3QnO1xuaW1wb3J0IHsgY3JlYXRlUG9ydGFsIH0gZnJvbSAncmVhY3QtZG9tJztcbmltcG9ydCB7XG4gIENoZWNrLFxuICBDaGV2cm9uRG93bixcbiAgQ2hldnJvbkxlZnQsXG4gIENoZXZyb25SaWdodCxcbiAgQ2hldnJvblVwLFxuICBDaXJjbGVBbGVydCxcbiAgRGlhbW9uZCxcbiAgSW5mbyxcbiAgTG9ja0tleWhvbGUsXG4gIFBhdXNlLFxuICBQbGF5LFxuICBTa2lwQmFjayxcbiAgU2tpcEZvcndhcmQsXG4gIFRyYXNoMixcbn0gZnJvbSAnbHVjaWRlLXJlYWN0JztcbmltcG9ydCB7XG4gIEFCT1VUX05BUlJBVElWRV9HTE9CQUxfQ09OVFJPTFMsXG4gIEFCT1VUX05BUlJBVElWRV9DT1JSRVNQT05ERU5DRV9NT0RFUyxcbiAgQUJPVVRfTkFSUkFUSVZFX0RJU0NJUExJTkVfUkVWRUFMX0NPTlRST0xTLFxuICBBQk9VVF9OQVJSQVRJVkVfRU1QSEFTSVNfVE9ORVMsXG4gIEFCT1VUX05BUlJBVElWRV9NT0RJRklFUl9ERUZJTklUSU9OUyxcbiAgQUJPVVRfTkFSUkFUSVZFX1NIQVBFX0RFRklOSVRJT05TLFxufSBmcm9tICcuL2Fib3V0TmFycmF0aXZlRGVmaW5pdGlvbnMuanMnO1xuaW1wb3J0IHtcbiAgY2xlYXJBYm91dE5hcnJhdGl2ZVJlY292ZXJ5RHJhZnQsXG4gIGV4cG9ydEFib3V0TmFycmF0aXZlRG9jdW1lbnQsXG4gIGxvYWRBYm91dE5hcnJhdGl2ZVNvdXJjZSxcbiAgcmVhZEFib3V0TmFycmF0aXZlQ2hlY2twb2ludHMsXG4gIHJlYWRBYm91dE5hcnJhdGl2ZVJlY292ZXJ5RHJhZnQsXG4gIHNhdmVBYm91dE5hcnJhdGl2ZVNvdXJjZSxcbiAgd3JpdGVBYm91dE5hcnJhdGl2ZUNoZWNrcG9pbnQsXG4gIHdyaXRlQWJvdXROYXJyYXRpdmVSZWNvdmVyeURyYWZ0LFxufSBmcm9tICcuL2Fib3V0TmFycmF0aXZlUGVyc2lzdGVuY2UuanMnO1xuaW1wb3J0IHtcbiAgYXNzZXJ0VmFsaWRBYm91dE5hcnJhdGl2ZURvY3VtZW50LFxuICBjbG9uZUFib3V0TmFycmF0aXZlRG9jdW1lbnQsXG59IGZyb20gJy4vYWJvdXROYXJyYXRpdmVTY2hlbWEuanMnO1xuaW1wb3J0IHtcbiAgZ2V0QWJvdXROYXJyYXRpdmVDdWVNb3ZlbWVudCxcbiAgZ2V0QWJvdXROYXJyYXRpdmVDdWVNb3Rpb25JbnRlcnZhbCxcbiAgZ2V0QWJvdXROYXJyYXRpdmVXb3JsZFRyYW5zaXRpb25MaW1pdCxcbiAgc2FtcGxlQWJvdXROYXJyYXRpdmVQbGFuLFxufSBmcm9tICcuL2Fib3V0TmFycmF0aXZlQ29tcGlsZXIuanMnO1xuaW1wb3J0IHtcbiAgY2FwdHVyZUFib3V0TmFycmF0aXZlUGxheWhlYWRDb250ZXh0LFxuICBjcmVhdGVBYm91dE5hcnJhdGl2ZUN1ZUNsaXBib2FyZFBheWxvYWQsXG4gIGRlcml2ZUFib3V0TmFycmF0aXZlTG9vcFJhbmdlLFxuICBkdXBsaWNhdGVBYm91dE5hcnJhdGl2ZUN1ZUdyb3VwLFxuICBkdXBsaWNhdGVBYm91dE5hcnJhdGl2ZVNlY3Rpb24sXG4gIGdldEFib3V0TmFycmF0aXZlQ2FtZXJhS2V5VGltaW5nQm91bmRzLFxuICBnZXRBYm91dE5hcnJhdGl2ZUN1ZVRpbWluZ0JvdW5kcyxcbiAgZ2V0QWJvdXROYXJyYXRpdmVFeHRlbnRGaWVsZCxcbiAgZ2V0QWJvdXROYXJyYXRpdmVTZWxlY3Rpb25NZW1iZXJzLFxuICBtb3ZlQWJvdXROYXJyYXRpdmVDdWVUaW1pbmcsXG4gIHJlbWFwQWJvdXROYXJyYXRpdmVQbGF5aGVhZENvbnRleHQsXG4gIHJlc29sdmVBYm91dE5hcnJhdGl2ZUNhbWVyYUtleURyb3AsXG4gIHJlc29sdmVBYm91dE5hcnJhdGl2ZUN1ZURpc3RyaWJ1dGlvbixcbiAgcmVzb2x2ZUFib3V0TmFycmF0aXZlQ3VlRXhhY3RHYXAsXG4gIHJlc29sdmVBYm91dE5hcnJhdGl2ZUN1ZUdyb3VwTW92ZSxcbiAgcmVzb2x2ZUFib3V0TmFycmF0aXZlQ3VlR3JvdXBBbGlnbixcbiAgcmVzb2x2ZUFib3V0TmFycmF0aXZlQ3VlR3JvdXBQYXN0ZSxcbiAgc25hcEFib3V0TmFycmF0aXZlVGltZWxpbmVWYWx1ZSxcbiAgc3RpdGNoQWJvdXROYXJyYXRpdmVDYW1lcmFCb3VuZGFyaWVzLFxuICB0b2dnbGVBYm91dE5hcnJhdGl2ZUN1ZVNlbGVjdGlvbixcbiAgdmFsaWRhdGVBYm91dE5hcnJhdGl2ZUN1ZUNsaXBib2FyZFBheWxvYWQsXG59IGZyb20gJy4vYWJvdXROYXJyYXRpdmVUaW1lbGluZS5qcyc7XG5pbXBvcnQgJy4vYWJvdXQtbmFycmF0aXZlLWVkaXRvci5jc3MnO1xuXG5jb25zdCBjbGFtcDAxID0gKHZhbHVlKSA9PiBNYXRoLm1pbigxLCBNYXRoLm1heCgwLCB2YWx1ZSkpO1xuY29uc3QgQUJPVVRfRURJVE9SX1RJTUVMSU5FX1NUT1JBR0VfS0VZID0gJ2FiczphYm91dC1uYXJyYXRpdmU6dGltZWxpbmUtb3Blbjp2MSc7XG5jb25zdCBUSU1FTElORV9LRVlfRVBTSUxPTiA9IDAuMDA0O1xuY29uc3QgSU5TUEVDVE9SX0VER0VfR0FQID0gODtcbmNvbnN0IENBTUVSQV9QT1NFX0ZJRUxEUyA9IG5ldyBTZXQoWydvZmZzZXQnLCAnbG9va0F0T2Zmc2V0JywgJ2ZvdicsICdyb2xsJ10pO1xuY29uc3QgRElTQ0lQTElORV9SRVZFQUxfTUFYID0gQUJPVVRfTkFSUkFUSVZFX0RJU0NJUExJTkVfUkVWRUFMX0NPTlRST0xTXG4gIC5maW5kKChjb250cm9sKSA9PiBjb250cm9sLmlkID09PSAnZW5kJyk/Lm1heCB8fCA0O1xuY29uc3QgRElTQ0lQTElORV9CQUxMX1RPS0VOX0JZX0dST1VQID0gT2JqZWN0LmZyZWV6ZSh7XG4gIDE6ICctLWJhbGwtMScsXG4gIDI6ICctLWJhbGwtNCcsXG4gIDM6ICctLWJhbGwtMycsXG4gIDQ6ICctLWJhbGwtNycsXG4gIDU6ICctLWJhbGwtOCcsXG4gIDY6ICctLWJhbGwtNicsXG59KTtcblxuZnVuY3Rpb24gY2FtZXJhUG9zZUNoYW5nZXMoZnJvbSwgdG8pIHtcbiAgaWYgKCFmcm9tIHx8ICF0bykgcmV0dXJuIGZhbHNlO1xuICByZXR1cm4gWydvZmZzZXQnLCAnbG9va0F0T2Zmc2V0J10uc29tZSgoZmllbGQpID0+IChcbiAgICBmcm9tW2ZpZWxkXS5zb21lKCh2YWx1ZSwgaW5kZXgpID0+IE1hdGguYWJzKHZhbHVlIC0gdG9bZmllbGRdW2luZGV4XSkgPiAwLjAwMDEpXG4gICkpIHx8IE1hdGguYWJzKGZyb20uZm92IC0gdG8uZm92KSA+IDAuMDAwMSB8fCBNYXRoLmFicyhmcm9tLnJvbGwgLSB0by5yb2xsKSA+IDAuMDAwMTtcbn1cblxuZnVuY3Rpb24gY29weUNhbWVyYVBvc2UodGFyZ2V0LCBzb3VyY2UpIHtcbiAgdGFyZ2V0Lm9mZnNldCA9IFsuLi5zb3VyY2Uub2Zmc2V0XTtcbiAgdGFyZ2V0Lmxvb2tBdE9mZnNldCA9IFsuLi5zb3VyY2UubG9va0F0T2Zmc2V0XTtcbiAgdGFyZ2V0LmZvdiA9IHNvdXJjZS5mb3Y7XG4gIHRhcmdldC5yb2xsID0gc291cmNlLnJvbGw7XG59XG5cbmZ1bmN0aW9uIGxpbmtDYW1lcmFCb3VuZGFyeShkb2N1bWVudCwgc2VjdGlvbkluZGV4LCBrZXlJbmRleCkge1xuICBjb25zdCBzZWN0aW9uID0gZG9jdW1lbnQuc2VjdGlvbnNbc2VjdGlvbkluZGV4XTtcbiAgY29uc3Qga2V5ID0gc2VjdGlvbj8uY2FtZXJhLmtleXNba2V5SW5kZXhdO1xuICBpZiAoIWtleSkgcmV0dXJuO1xuICBpZiAoa2V5SW5kZXggPT09IDAgJiYgc2VjdGlvbkluZGV4ID4gMCkge1xuICAgIGNvcHlDYW1lcmFQb3NlKGRvY3VtZW50LnNlY3Rpb25zW3NlY3Rpb25JbmRleCAtIDFdLmNhbWVyYS5rZXlzLmF0KC0xKSwga2V5KTtcbiAgfVxuICBpZiAoa2V5SW5kZXggPT09IHNlY3Rpb24uY2FtZXJhLmtleXMubGVuZ3RoIC0gMSAmJiBzZWN0aW9uSW5kZXggPCBkb2N1bWVudC5zZWN0aW9ucy5sZW5ndGggLSAxKSB7XG4gICAgY29weUNhbWVyYVBvc2UoZG9jdW1lbnQuc2VjdGlvbnNbc2VjdGlvbkluZGV4ICsgMV0uY2FtZXJhLmtleXNbMF0sIGtleSk7XG4gIH1cbn1cblxuZnVuY3Rpb24gYnJpZGdlQ2FtZXJhU2VjdGlvbihkb2N1bWVudCwgc2VjdGlvbkluZGV4KSB7XG4gIGNvbnN0IHNlY3Rpb24gPSBkb2N1bWVudC5zZWN0aW9uc1tzZWN0aW9uSW5kZXhdO1xuICBpZiAoIXNlY3Rpb24/LmNhbWVyYS5rZXlzLmxlbmd0aCkgcmV0dXJuO1xuICBpZiAoc2VjdGlvbkluZGV4ID4gMCkgY29weUNhbWVyYVBvc2Uoc2VjdGlvbi5jYW1lcmEua2V5c1swXSwgZG9jdW1lbnQuc2VjdGlvbnNbc2VjdGlvbkluZGV4IC0gMV0uY2FtZXJhLmtleXMuYXQoLTEpKTtcbiAgaWYgKHNlY3Rpb25JbmRleCA8IGRvY3VtZW50LnNlY3Rpb25zLmxlbmd0aCAtIDEpIGNvcHlDYW1lcmFQb3NlKHNlY3Rpb24uY2FtZXJhLmtleXMuYXQoLTEpLCBkb2N1bWVudC5zZWN0aW9uc1tzZWN0aW9uSW5kZXggKyAxXS5jYW1lcmEua2V5c1swXSk7XG59XG5cbmZ1bmN0aW9uIHN0aXRjaENhbWVyYUJvdW5kYXJpZXMoZG9jdW1lbnQpIHtcbiAgZm9yIChsZXQgc2VjdGlvbkluZGV4ID0gMTsgc2VjdGlvbkluZGV4IDwgZG9jdW1lbnQuc2VjdGlvbnMubGVuZ3RoOyBzZWN0aW9uSW5kZXggKz0gMSkge1xuICAgIGNvcHlDYW1lcmFQb3NlKGRvY3VtZW50LnNlY3Rpb25zW3NlY3Rpb25JbmRleF0uY2FtZXJhLmtleXNbMF0sIGRvY3VtZW50LnNlY3Rpb25zW3NlY3Rpb25JbmRleCAtIDFdLmNhbWVyYS5rZXlzLmF0KC0xKSk7XG4gIH1cbn1cblxuZnVuY3Rpb24gZ2V0SW5zcGVjdG9yVmVydGljYWxCb3VuZHMoaW5zcGVjdG9yLCB0aW1lbGluZU9wZW4pIHtcbiAgY29uc3QgZWRpdG9yID0gaW5zcGVjdG9yLmNsb3Nlc3QoJy5hYm91dC1lZGl0b3InKTtcbiAgY29uc3Qgc3R5bGVzID0gZWRpdG9yID8gZ2V0Q29tcHV0ZWRTdHlsZShlZGl0b3IpIDogbnVsbDtcbiAgY29uc3QgdG9wYmFySGVpZ2h0ID0gTnVtYmVyLnBhcnNlRmxvYXQoc3R5bGVzPy5nZXRQcm9wZXJ0eVZhbHVlKCctLWFib3V0LWVkaXRvci10b3BiYXInKSkgfHwgNDQ7XG4gIGNvbnN0IHRpbWVsaW5lSGVpZ2h0ID0gdGltZWxpbmVPcGVuXG4gICAgPyBOdW1iZXIucGFyc2VGbG9hdChzdHlsZXM/LmdldFByb3BlcnR5VmFsdWUoJy0tYWJvdXQtZWRpdG9yLXRpbWVsaW5lJykpIHx8IDE4OFxuICAgIDogMDtcbiAgY29uc3QgYnV0dG9uQmFyVG9wID0gZG9jdW1lbnQucXVlcnlTZWxlY3RvcignW2RhdGEtYnV0dG9uLWJhcl0nKT8uZ2V0Qm91bmRpbmdDbGllbnRSZWN0KCkudG9wXG4gICAgPz8gd2luZG93LmlubmVySGVpZ2h0O1xuICByZXR1cm4ge1xuICAgIG1pblRvcDogdG9wYmFySGVpZ2h0ICsgSU5TUEVDVE9SX0VER0VfR0FQLFxuICAgIG1heEJvdHRvbTogKHRpbWVsaW5lT3BlbiA/IHdpbmRvdy5pbm5lckhlaWdodCAtIHRpbWVsaW5lSGVpZ2h0IDogYnV0dG9uQmFyVG9wKSAtIElOU1BFQ1RPUl9FREdFX0dBUCxcbiAgfTtcbn1cblxuZnVuY3Rpb24gY2xhbXBJbnNwZWN0b3JQb3NpdGlvbihpbnNwZWN0b3IsIHBvc2l0aW9uLCB0aW1lbGluZU9wZW4pIHtcbiAgY29uc3QgeyBtaW5Ub3AsIG1heEJvdHRvbSB9ID0gZ2V0SW5zcGVjdG9yVmVydGljYWxCb3VuZHMoaW5zcGVjdG9yLCB0aW1lbGluZU9wZW4pO1xuICBjb25zdCBtYXhXaWR0aCA9IE1hdGgubWF4KDI0MCwgd2luZG93LmlubmVyV2lkdGggLSAoSU5TUEVDVE9SX0VER0VfR0FQICogMikpO1xuICBjb25zdCB3aWR0aCA9IE1hdGgubWluKHBvc2l0aW9uLndpZHRoLCBtYXhXaWR0aCk7XG4gIGNvbnN0IGF2YWlsYWJsZUhlaWdodCA9IE1hdGgubWF4KDI0MCwgbWF4Qm90dG9tIC0gbWluVG9wKTtcbiAgY29uc3QgaGVpZ2h0ID0gTWF0aC5taW4ocG9zaXRpb24uaGVpZ2h0LCBhdmFpbGFibGVIZWlnaHQpO1xuICBjb25zdCBtYXhMZWZ0ID0gTWF0aC5tYXgoSU5TUEVDVE9SX0VER0VfR0FQLCB3aW5kb3cuaW5uZXJXaWR0aCAtIHdpZHRoIC0gSU5TUEVDVE9SX0VER0VfR0FQKTtcbiAgY29uc3QgbWF4VG9wID0gTWF0aC5tYXgobWluVG9wLCBtYXhCb3R0b20gLSBoZWlnaHQpO1xuICByZXR1cm4ge1xuICAgIGxlZnQ6IE1hdGgubWluKG1heExlZnQsIE1hdGgubWF4KElOU1BFQ1RPUl9FREdFX0dBUCwgcG9zaXRpb24ubGVmdCkpLFxuICAgIHRvcDogTWF0aC5taW4obWF4VG9wLCBNYXRoLm1heChtaW5Ub3AsIHBvc2l0aW9uLnRvcCkpLFxuICAgIHdpZHRoLFxuICAgIGhlaWdodCxcbiAgfTtcbn1cblxuZnVuY3Rpb24gZ2V0U2VjdGlvbkluZGV4KGRvY3VtZW50LCBzZWN0aW9uSWQpIHtcbiAgcmV0dXJuIGRvY3VtZW50LnNlY3Rpb25zLmZpbmRJbmRleCgoc2VjdGlvbikgPT4gc2VjdGlvbi5pZCA9PT0gc2VjdGlvbklkKTtcbn1cblxuZnVuY3Rpb24gZ2V0U2VjdGlvbihkb2N1bWVudCwgc2VsZWN0aW9uKSB7XG4gIGNvbnN0IHNlY3Rpb25JZCA9IHNlbGVjdGlvbi5zZWN0aW9uSWQgfHwgZG9jdW1lbnQuc2VjdGlvbnNbMF0/LmlkO1xuICByZXR1cm4gZG9jdW1lbnQuc2VjdGlvbnMuZmluZCgoc2VjdGlvbikgPT4gc2VjdGlvbi5pZCA9PT0gc2VjdGlvbklkKSB8fCBkb2N1bWVudC5zZWN0aW9uc1swXTtcbn1cblxuZnVuY3Rpb24gZ2V0TG9jYWxQcm9ncmVzcyhwbGFuLCBzZWN0aW9uLCBzdG9yeVdVKSB7XG4gIGNvbnN0IGNvbXBpbGVkID0gcGxhbj8uc2VjdGlvbnM/LmZpbmQoKGl0ZW0pID0+IGl0ZW0uaWQgPT09IHNlY3Rpb24uaWQpO1xuICByZXR1cm4gY29tcGlsZWQgPyBjbGFtcDAxKChzdG9yeVdVIC0gY29tcGlsZWQuc3RhcnRXVSkgLyBjb21waWxlZC50cmF2ZWxXVSkgOiAwO1xufVxuXG5mdW5jdGlvbiBmb3JtYXRXVSh2YWx1ZSkge1xuICByZXR1cm4gYCR7TnVtYmVyKHZhbHVlIHx8IDApLnRvRml4ZWQoMil9IFdVYDtcbn1cblxuZnVuY3Rpb24gZm9ybWF0Q2FtZXJhUGVyY2VudCh2YWx1ZSkge1xuICByZXR1cm4gYCR7TnVtYmVyKChOdW1iZXIodmFsdWUpICogMTAwKS50b0ZpeGVkKDEpKX0lYDtcbn1cblxuZnVuY3Rpb24gaXNUZXh0RWRpdGluZ1RhcmdldCh0YXJnZXQpIHtcbiAgcmV0dXJuIHRhcmdldCBpbnN0YW5jZW9mIEhUTUxFbGVtZW50XG4gICAgJiYgKHRhcmdldC5tYXRjaGVzKCdpbnB1dCwgdGV4dGFyZWEsIHNlbGVjdCcpIHx8IHRhcmdldC5pc0NvbnRlbnRFZGl0YWJsZSk7XG59XG5cbmZ1bmN0aW9uIGdldFRpbWVsaW5lS2V5ZnJhbWVzKHNuYXBzaG90KSB7XG4gIGNvbnN0IHBsYW4gPSBzbmFwc2hvdC5jb21waWxlZFBsYW47XG4gIGlmICghcGxhbj8uc2VjdGlvbnM/Lmxlbmd0aCkgcmV0dXJuIFtdO1xuICBjb25zdCBldmVudHMgPSBbXTtcbiAgcGxhbi5zZWN0aW9ucy5mb3JFYWNoKChjb21waWxlZCwgc2VjdGlvbkluZGV4KSA9PiB7XG4gICAgY29uc3Qgc2VjdGlvbiA9IHNuYXBzaG90LmRvY3VtZW50LnNlY3Rpb25zW3NlY3Rpb25JbmRleF07XG4gICAgY29uc3QgdG9TdG9yeVdVID0gKGF0KSA9PiBjb21waWxlZC5zdGFydFdVICsgKE51bWJlcihhdCB8fCAwKSAqIGNvbXBpbGVkLnRyYXZlbFdVKTtcbiAgICBzZWN0aW9uLmNhbWVyYS5rZXlzLmZvckVhY2goKGtleSwga2V5SW5kZXgpID0+IHtcbiAgICAgIGlmIChrZXkuYXQgPT09IDAgfHwga2V5LmF0ID09PSAxKSByZXR1cm47XG4gICAgICBldmVudHMucHVzaCh7XG4gICAgICAgIHN0b3J5V1U6IHRvU3RvcnlXVShrZXkuYXQpLFxuICAgICAgICBwcmlvcml0eTogMCxcbiAgICAgICAgc2VsZWN0aW9uOiB7IHR5cGU6ICdjYW1lcmEta2V5Jywgc2VjdGlvbklkOiBzZWN0aW9uLmlkLCBrZXlJbmRleCB9LFxuICAgICAgfSk7XG4gICAgfSk7XG4gICAgaWYgKHNlY3Rpb24ud29ybGQubW9kZSA9PT0gJ3NldCcgJiYgc2VjdGlvbi53b3JsZC50cmFuc2l0aW9uSW4udHlwZSAhPT0gJ2N1dCcpIHtcbiAgICAgIFsnc3RhcnQnLCAnZW5kJ10uZm9yRWFjaCgocGFydCwgcGFydEluZGV4KSA9PiBldmVudHMucHVzaCh7XG4gICAgICAgIHN0b3J5V1U6IHRvU3RvcnlXVShzZWN0aW9uLndvcmxkLnRyYW5zaXRpb25JbltwYXJ0XSksXG4gICAgICAgIHByaW9yaXR5OiAxMCArIHBhcnRJbmRleCxcbiAgICAgICAgc2VsZWN0aW9uOiB7IHR5cGU6ICd3b3JsZCcsIHNlY3Rpb25JZDogc2VjdGlvbi5pZCwga2V5UGFydDogYHRyYW5zaXRpb24tJHtwYXJ0fWAgfSxcbiAgICAgIH0pKTtcbiAgICB9XG4gICAgKHNlY3Rpb24udGV4dC5jdWVzIHx8IFtdKS5mb3JFYWNoKChjdWUsIGN1ZUluZGV4KSA9PiB7XG4gICAgICBldmVudHMucHVzaCh7XG4gICAgICAgIHN0b3J5V1U6IHRvU3RvcnlXVShjdWUuaG9sZCksXG4gICAgICAgIHByaW9yaXR5OiAyMCArIGN1ZUluZGV4LFxuICAgICAgICBzZWxlY3Rpb246IHsgdHlwZTogJ2N1ZScsIHNlY3Rpb25JZDogc2VjdGlvbi5pZCwgY3VlSWQ6IGN1ZS5pZCwga2V5UGFydDogJ2ZvY3VzJyB9LFxuICAgICAgfSk7XG4gICAgfSk7XG4gICAgaWYgKHNlY3Rpb24udGV4dC5kaXNjaXBsaW5lUmV2ZWFsKSB7XG4gICAgICBldmVudHMucHVzaCh7XG4gICAgICAgIHN0b3J5V1U6IHRvU3RvcnlXVShzZWN0aW9uLnRleHQuZGlzY2lwbGluZVJldmVhbC5zdGFydCksXG4gICAgICAgIHByaW9yaXR5OiAyOCxcbiAgICAgICAgc2VsZWN0aW9uOiB7IHR5cGU6ICdkaXNjaXBsaW5lLXJldmVhbCcsIHNlY3Rpb25JZDogc2VjdGlvbi5pZCB9LFxuICAgICAgfSk7XG4gICAgfVxuICAgIGlmIChzZWN0aW9uLmludGVyYWN0aW9uPy50eXBlICE9PSAnbm9uZScgJiYgTnVtYmVyLmlzRmluaXRlKHNlY3Rpb24uaW50ZXJhY3Rpb24uYWN0aXZhdGlvblN0YXJ0KSkge1xuICAgICAgZXZlbnRzLnB1c2goe1xuICAgICAgICBzdG9yeVdVOiB0b1N0b3J5V1Uoc2VjdGlvbi5pbnRlcmFjdGlvbi5hY3RpdmF0aW9uU3RhcnQpLFxuICAgICAgICBwcmlvcml0eTogMzAsXG4gICAgICAgIHNlbGVjdGlvbjogeyB0eXBlOiAnaW50ZXJhY3Rpb24nLCBzZWN0aW9uSWQ6IHNlY3Rpb24uaWQsIGtleVBhcnQ6ICdhY3RpdmF0aW9uJyB9LFxuICAgICAgfSk7XG4gICAgfVxuICB9KTtcbiAgcmV0dXJuIGV2ZW50cy5zb3J0KChhLCBiKSA9PiAoYS5zdG9yeVdVIC0gYi5zdG9yeVdVKSB8fCAoYS5wcmlvcml0eSAtIGIucHJpb3JpdHkpKTtcbn1cblxuZnVuY3Rpb24gZ2V0VGltZWxpbmVEZWxldGlvbihzbmFwc2hvdCkge1xuICBjb25zdCB7IHNlbGVjdGlvbiwgZG9jdW1lbnQgfSA9IHNuYXBzaG90O1xuICBjb25zdCBzZWN0aW9uSW5kZXggPSBnZXRTZWN0aW9uSW5kZXgoZG9jdW1lbnQsIHNlbGVjdGlvbi5zZWN0aW9uSWQpO1xuICBjb25zdCBzZWN0aW9uID0gZG9jdW1lbnQuc2VjdGlvbnNbc2VjdGlvbkluZGV4XTtcbiAgaWYgKCFzZWN0aW9uKSByZXR1cm4gbnVsbDtcbiAgaWYgKHNlbGVjdGlvbi50eXBlID09PSAnY2FtZXJhLWtleScpIHtcbiAgICBjb25zdCBrZXkgPSBzZWN0aW9uLmNhbWVyYS5rZXlzW3NlbGVjdGlvbi5rZXlJbmRleF07XG4gICAgaWYgKCFrZXkpIHJldHVybiBudWxsO1xuICAgIGNvbnN0IHJlcXVpcmVkID0ga2V5LmF0ID09PSAwIHx8IGtleS5hdCA9PT0gMTtcbiAgICByZXR1cm4ge1xuICAgICAgbGFiZWw6IHJlcXVpcmVkID8gJ1JlcXVpcmVkIGNhbWVyYSBrZXknIDogJ0RlbGV0ZSBjYW1lcmEga2V5JyxcbiAgICAgIGRpc2FibGVkOiByZXF1aXJlZCxcbiAgICAgIG1lc3NhZ2U6IHJlcXVpcmVkID8gJ1RoZSBzdGFydCBhbmQgZW5kIENhbWVyYSBrZXlzIHByZXNlcnZlIFNlY3Rpb24gY29udGludWl0eSBhbmQgY2Fubm90IGJlIHJlbW92ZWQuJyA6ICcnLFxuICAgICAgZXhlY3V0ZTogKHN0b3JlKSA9PiBzdG9yZS5jb21taXQoJ0RlbGV0ZSBjYW1lcmEga2V5JywgKGRyYWZ0KSA9PiB7XG4gICAgICAgIGRyYWZ0LnNlY3Rpb25zW3NlY3Rpb25JbmRleF0uY2FtZXJhLmtleXMuc3BsaWNlKHNlbGVjdGlvbi5rZXlJbmRleCwgMSk7XG4gICAgICB9LCB7IHNlbGVjdGlvbjogeyB0eXBlOiAnc2VjdGlvbicsIHNlY3Rpb25JZDogc2VjdGlvbi5pZCB9IH0pLFxuICAgIH07XG4gIH1cbiAgaWYgKHNlbGVjdGlvbi50eXBlID09PSAnd29ybGQnICYmIHNlbGVjdGlvbi5rZXlQYXJ0Py5zdGFydHNXaXRoKCd0cmFuc2l0aW9uLScpKSB7XG4gICAgcmV0dXJuIHtcbiAgICAgIGxhYmVsOiAnUmVtb3ZlIHRyYW5zaXRpb24nLFxuICAgICAgZGlzYWJsZWQ6IGZhbHNlLFxuICAgICAgbWVzc2FnZTogJycsXG4gICAgICBleGVjdXRlOiAoc3RvcmUpID0+IHN0b3JlLmNvbW1pdCgnUmVtb3ZlIFdvcmxkIHRyYW5zaXRpb24nLCAoZHJhZnQpID0+IHtcbiAgICAgICAgY29uc3QgdHJhbnNpdGlvbiA9IGRyYWZ0LnNlY3Rpb25zW3NlY3Rpb25JbmRleF0ud29ybGQudHJhbnNpdGlvbkluO1xuICAgICAgICB0cmFuc2l0aW9uLnN0YXJ0ID0gMDtcbiAgICAgICAgdHJhbnNpdGlvbi5lbmQgPSAwO1xuICAgICAgICB0cmFuc2l0aW9uLnR5cGUgPSAnY3V0JztcbiAgICAgIH0sIHsgc2VsZWN0aW9uOiB7IHR5cGU6ICd3b3JsZCcsIHNlY3Rpb25JZDogc2VjdGlvbi5pZCB9IH0pLFxuICAgIH07XG4gIH1cbiAgaWYgKHNlbGVjdGlvbi50eXBlID09PSAnaW50ZXJhY3Rpb24nICYmIHNlbGVjdGlvbi5rZXlQYXJ0ID09PSAnYWN0aXZhdGlvbicpIHtcbiAgICByZXR1cm4ge1xuICAgICAgbGFiZWw6ICdSZW1vdmUgaW50ZXJhY3Rpb24ga2V5JyxcbiAgICAgIGRpc2FibGVkOiBmYWxzZSxcbiAgICAgIG1lc3NhZ2U6ICcnLFxuICAgICAgZXhlY3V0ZTogKHN0b3JlKSA9PiBzdG9yZS5jb21taXQoJ1JlbW92ZSBpbnRlcmFjdGlvbiBrZXknLCAoZHJhZnQpID0+IHtcbiAgICAgICAgZHJhZnQuc2VjdGlvbnNbc2VjdGlvbkluZGV4XS5pbnRlcmFjdGlvbiA9IHsgdHlwZTogJ25vbmUnIH07XG4gICAgICB9LCB7IHNlbGVjdGlvbjogeyB0eXBlOiAnc2VjdGlvbicsIHNlY3Rpb25JZDogc2VjdGlvbi5pZCB9IH0pLFxuICAgIH07XG4gIH1cbiAgcmV0dXJuIG51bGw7XG59XG5cbmZ1bmN0aW9uIGRlbGV0ZVRpbWVsaW5lU2VsZWN0aW9uKHN0b3JlLCBzbmFwc2hvdCkge1xuICBjb25zdCBkZWxldGlvbiA9IGdldFRpbWVsaW5lRGVsZXRpb24oc25hcHNob3QpO1xuICBpZiAoIWRlbGV0aW9uKSByZXR1cm4gZmFsc2U7XG4gIGlmIChkZWxldGlvbi5kaXNhYmxlZCkge1xuICAgIHN0b3JlLnNldFNhdmVTdGF0ZSh7IG1lc3NhZ2U6IGRlbGV0aW9uLm1lc3NhZ2UgfSk7XG4gICAgcmV0dXJuIHRydWU7XG4gIH1cbiAgZGVsZXRpb24uZXhlY3V0ZShzdG9yZSk7XG4gIHJldHVybiB0cnVlO1xufVxuXG5mdW5jdGlvbiBzZWVrVGltZWxpbmVLZXlmcmFtZShzdG9yZSwgZXZlbnQpIHtcbiAgaWYgKCFldmVudCkgcmV0dXJuO1xuICBzdG9yZS5zZXRTZWxlY3Rpb24oZXZlbnQuc2VsZWN0aW9uKTtcbiAgc3RvcmUuc2V0VHJhbnNwb3J0KHsgb3duZXI6ICd0aW1lbGluZScsIHBsYXlpbmc6IGZhbHNlLCBzdG9yeVdVOiBldmVudC5zdG9yeVdVIH0pO1xufVxuXG5mdW5jdGlvbiBqdW1wVGltZWxpbmVLZXlmcmFtZShzdG9yZSwgc25hcHNob3QsIGRpcmVjdGlvbikge1xuICBjb25zdCBldmVudHMgPSBnZXRUaW1lbGluZUtleWZyYW1lcyhzbmFwc2hvdCk7XG4gIGNvbnN0IGN1cnJlbnRXVSA9IHNuYXBzaG90LnRyYW5zcG9ydC5zdG9yeVdVO1xuICBjb25zdCB0YXJnZXRQb3NpdGlvbiA9IGRpcmVjdGlvbiA+IDBcbiAgICA/IGV2ZW50cy5maW5kKChldmVudCkgPT4gZXZlbnQuc3RvcnlXVSA+IGN1cnJlbnRXVSArIFRJTUVMSU5FX0tFWV9FUFNJTE9OKT8uc3RvcnlXVVxuICAgIDogWy4uLmV2ZW50c10ucmV2ZXJzZSgpLmZpbmQoKGV2ZW50KSA9PiBldmVudC5zdG9yeVdVIDwgY3VycmVudFdVIC0gVElNRUxJTkVfS0VZX0VQU0lMT04pPy5zdG9yeVdVO1xuICBjb25zdCBldmVudCA9IE51bWJlci5pc0Zpbml0ZSh0YXJnZXRQb3NpdGlvbilcbiAgICA/IGV2ZW50cy5maW5kKChpdGVtKSA9PiBNYXRoLmFicyhpdGVtLnN0b3J5V1UgLSB0YXJnZXRQb3NpdGlvbikgPCBUSU1FTElORV9LRVlfRVBTSUxPTilcbiAgICA6IG51bGw7XG4gIHNlZWtUaW1lbGluZUtleWZyYW1lKHN0b3JlLCBldmVudCk7XG59XG5cbmZ1bmN0aW9uIG1ha2VTbHVnKHZhbHVlKSB7XG4gIHJldHVybiB2YWx1ZS50b0xvd2VyQ2FzZSgpLnJlcGxhY2UoL1teYS16MC05XSsvZywgJy0nKS5yZXBsYWNlKC9eLXwtJC9nLCAnJykgfHwgJ2l0ZW0nO1xufVxuXG5mdW5jdGlvbiBuZXh0SWQoZG9jdW1lbnQsIGJhc2UpIHtcbiAgY29uc3QgdXNlZCA9IG5ldyBTZXQoZG9jdW1lbnQuc2VjdGlvbnMuZmxhdE1hcCgoc2VjdGlvbikgPT4gW1xuICAgIHNlY3Rpb24uaWQsXG4gICAgLi4uKHNlY3Rpb24udGV4dC5jdWVzIHx8IFtdKS5tYXAoKGN1ZSkgPT4gY3VlLmlkKSxcbiAgICAuLi4oc2VjdGlvbi50ZXh0LmJsb2NrcyB8fCBbXSkubWFwKChibG9jaykgPT4gYmxvY2suaWQpLFxuICAgIC4uLihzZWN0aW9uLnRleHQuZGlzY2lwbGluZVJldmVhbCA/IFtzZWN0aW9uLnRleHQuZGlzY2lwbGluZVJldmVhbC5pZF0gOiBbXSksXG4gIF0pKTtcbiAgbGV0IGlkID0gbWFrZVNsdWcoYmFzZSk7XG4gIGxldCBzdWZmaXggPSAyO1xuICB3aGlsZSAodXNlZC5oYXMoaWQpKSB7XG4gICAgaWQgPSBgJHttYWtlU2x1ZyhiYXNlKX0tJHtzdWZmaXh9YDtcbiAgICBzdWZmaXggKz0gMTtcbiAgfVxuICByZXR1cm4gaWQ7XG59XG5cbmZ1bmN0aW9uIHJlcGxhY2VEcmFmdERvY3VtZW50KGRyYWZ0LCBuZXh0RG9jdW1lbnQpIHtcbiAgT2JqZWN0LmtleXMoZHJhZnQpLmZvckVhY2goKGtleSkgPT4gZGVsZXRlIGRyYWZ0W2tleV0pO1xuICBPYmplY3QuYXNzaWduKGRyYWZ0LCBjbG9uZUFib3V0TmFycmF0aXZlRG9jdW1lbnQobmV4dERvY3VtZW50KSk7XG59XG5cbmZ1bmN0aW9uIGFwcGx5Q3VlTW92ZXMoZHJhZnQsIG1vdmVzKSB7XG4gIG1vdmVzLmZvckVhY2goKG1vdmUpID0+IHtcbiAgICBjb25zdCBzZWN0aW9uID0gZHJhZnQuc2VjdGlvbnMuZmluZCgoaXRlbSkgPT4gaXRlbS5pZCA9PT0gbW92ZS5zZWN0aW9uSWQpO1xuICAgIGNvbnN0IGN1ZSA9IHNlY3Rpb24/LnRleHQ/LmN1ZXM/LmZpbmQoKGl0ZW0pID0+IGl0ZW0uaWQgPT09IG1vdmUuY3VlSWQpO1xuICAgIGlmIChjdWUpIE9iamVjdC5hc3NpZ24oY3VlLCB7IGVudGVyOiBtb3ZlLmVudGVyLCBob2xkOiBtb3ZlLmhvbGQsIGV4aXQ6IG1vdmUuZXhpdCB9KTtcbiAgfSk7XG59XG5cbmZ1bmN0aW9uIFByb3BlcnR5KHsgbGFiZWwsIGNoaWxkcmVuLCBoaW50ID0gJycgfSkge1xuICByZXR1cm4gKFxuICAgIDxsYWJlbCBjbGFzc05hbWU9XCJhYm91dC1lZGl0b3ItcHJvcGVydHlcIj5cbiAgICAgIDxzcGFuPntsYWJlbH08L3NwYW4+XG4gICAgICB7Y2hpbGRyZW59XG4gICAgICB7aGludCA/IDxzbWFsbD57aGludH08L3NtYWxsPiA6IG51bGx9XG4gICAgPC9sYWJlbD5cbiAgKTtcbn1cblxuZnVuY3Rpb24gTnVtYmVyUHJvcGVydHkoeyBsYWJlbCwgdmFsdWUsIG1pbiwgbWF4LCBzdGVwLCBvbkNoYW5nZSwgdW5pdCA9ICcnLCBkaXNhYmxlZCA9IGZhbHNlIH0pIHtcbiAgcmV0dXJuIChcbiAgICA8UHJvcGVydHkgbGFiZWw9e2xhYmVsfT5cbiAgICAgIDxkaXYgY2xhc3NOYW1lPVwiYWJvdXQtZWRpdG9yLW51bWJlclwiPlxuICAgICAgICA8aW5wdXRcbiAgICAgICAgICB0eXBlPVwicmFuZ2VcIlxuICAgICAgICAgIHZhbHVlPXt2YWx1ZX1cbiAgICAgICAgICBtaW49e21pbn1cbiAgICAgICAgICBtYXg9e21heH1cbiAgICAgICAgICBzdGVwPXtzdGVwfVxuICAgICAgICAgIGRpc2FibGVkPXtkaXNhYmxlZH1cbiAgICAgICAgICBvbkNoYW5nZT17KGV2ZW50KSA9PiBvbkNoYW5nZShOdW1iZXIoZXZlbnQudGFyZ2V0LnZhbHVlKSl9XG4gICAgICAgIC8+XG4gICAgICAgIDxpbnB1dFxuICAgICAgICAgIHR5cGU9XCJudW1iZXJcIlxuICAgICAgICAgIHZhbHVlPXt2YWx1ZX1cbiAgICAgICAgICBtaW49e21pbn1cbiAgICAgICAgICBtYXg9e21heH1cbiAgICAgICAgICBzdGVwPXtzdGVwfVxuICAgICAgICAgIGRpc2FibGVkPXtkaXNhYmxlZH1cbiAgICAgICAgICBvbkNoYW5nZT17KGV2ZW50KSA9PiBvbkNoYW5nZShOdW1iZXIoZXZlbnQudGFyZ2V0LnZhbHVlKSl9XG4gICAgICAgIC8+XG4gICAgICAgIHt1bml0ID8gPGVtPnt1bml0fTwvZW0+IDogbnVsbH1cbiAgICAgIDwvZGl2PlxuICAgIDwvUHJvcGVydHk+XG4gICk7XG59XG5cbmZ1bmN0aW9uIFRyYW5zcG9ydCh7IHN0b3JlLCBzbmFwc2hvdCB9KSB7XG4gIGNvbnN0IHsgdHJhbnNwb3J0LCBjb21waWxlZFBsYW4gfSA9IHNuYXBzaG90O1xuICBjb25zdCBtYXhXVSA9IGNvbXBpbGVkUGxhbj8ubWF4U3RvcnlXVSB8fCAxO1xuICBjb25zdCBwbGF5ID0gKCkgPT4gc3RvcmUuc2V0VHJhbnNwb3J0KHtcbiAgICBvd25lcjogdHJhbnNwb3J0LnBsYXlpbmcgPyAndGltZWxpbmUnIDogJ3BsYXliYWNrJyxcbiAgICBwbGF5aW5nOiAhdHJhbnNwb3J0LnBsYXlpbmcsXG4gICAgc3RvcnlXVTogdHJhbnNwb3J0LnN0b3J5V1UsXG4gIH0pO1xuICBjb25zdCBzZWVrID0gKHN0b3J5V1UpID0+IHN0b3JlLnNldFRyYW5zcG9ydCh7IG93bmVyOiAndGltZWxpbmUnLCBwbGF5aW5nOiBmYWxzZSwgc3RvcnlXVSB9KTtcbiAgY29uc3Qgc2VsZWN0ZWQgPSBnZXRTZWN0aW9uKHNuYXBzaG90LmRvY3VtZW50LCBzbmFwc2hvdC5zZWxlY3Rpb24pO1xuICBjb25zdCBzZWN0aW9uSW5kZXggPSBnZXRTZWN0aW9uSW5kZXgoc25hcHNob3QuZG9jdW1lbnQsIHNlbGVjdGVkLmlkKTtcbiAgY29uc3QganVtcFNlY3Rpb24gPSAoZGlyZWN0aW9uKSA9PiB7XG4gICAgY29uc3QgbmV4dCA9IHNuYXBzaG90LmNvbXBpbGVkUGxhbi5zZWN0aW9uc1tNYXRoLm1heCgwLCBNYXRoLm1pbihzbmFwc2hvdC5jb21waWxlZFBsYW4uc2VjdGlvbnMubGVuZ3RoIC0gMSwgc2VjdGlvbkluZGV4ICsgZGlyZWN0aW9uKSldO1xuICAgIGlmIChuZXh0KSBzZWVrKG5leHQuc3RhcnRXVSk7XG4gIH07XG4gIHJldHVybiAoXG4gICAgPGRpdiBjbGFzc05hbWU9XCJhYm91dC1lZGl0b3ItdHJhbnNwb3J0XCI+XG4gICAgICA8YnV0dG9uIHR5cGU9XCJidXR0b25cIiB0aXRsZT1cIlByZXZpb3VzIFNlY3Rpb25cIiBhcmlhLWxhYmVsPVwiUHJldmlvdXMgU2VjdGlvblwiIG9uQ2xpY2s9eygpID0+IGp1bXBTZWN0aW9uKC0xKX0+PFNraXBCYWNrIGFyaWEtaGlkZGVuPVwidHJ1ZVwiIC8+PC9idXR0b24+XG4gICAgICA8YnV0dG9uIHR5cGU9XCJidXR0b25cIiB0aXRsZT1cIlByZXZpb3VzIGtleWZyYW1lIMK3IExlZnQgYXJyb3dcIiBhcmlhLWxhYmVsPVwiUHJldmlvdXMga2V5ZnJhbWVcIiBvbkNsaWNrPXsoKSA9PiBqdW1wVGltZWxpbmVLZXlmcmFtZShzdG9yZSwgc25hcHNob3QsIC0xKX0+PENoZXZyb25MZWZ0IGFyaWEtaGlkZGVuPVwidHJ1ZVwiIC8+PC9idXR0b24+XG4gICAgICA8YnV0dG9uIHR5cGU9XCJidXR0b25cIiBjbGFzc05hbWU9XCJpcy1wcmltYXJ5XCIgdGl0bGU9e3RyYW5zcG9ydC5wbGF5aW5nID8gJ1BhdXNlJyA6ICdQbGF5J30gYXJpYS1sYWJlbD17dHJhbnNwb3J0LnBsYXlpbmcgPyAnUGF1c2UnIDogJ1BsYXknfSBvbkNsaWNrPXtwbGF5fT5cbiAgICAgICAge3RyYW5zcG9ydC5wbGF5aW5nID8gPFBhdXNlIGFyaWEtaGlkZGVuPVwidHJ1ZVwiIC8+IDogPFBsYXkgYXJpYS1oaWRkZW49XCJ0cnVlXCIgLz59XG4gICAgICA8L2J1dHRvbj5cbiAgICAgIDxidXR0b24gdHlwZT1cImJ1dHRvblwiIHRpdGxlPVwiTmV4dCBTZWN0aW9uXCIgYXJpYS1sYWJlbD1cIk5leHQgU2VjdGlvblwiIG9uQ2xpY2s9eygpID0+IGp1bXBTZWN0aW9uKDEpfT48U2tpcEZvcndhcmQgYXJpYS1oaWRkZW49XCJ0cnVlXCIgLz48L2J1dHRvbj5cbiAgICAgIDxidXR0b24gdHlwZT1cImJ1dHRvblwiIHRpdGxlPVwiTmV4dCBrZXlmcmFtZSDCtyBSaWdodCBhcnJvd1wiIGFyaWEtbGFiZWw9XCJOZXh0IGtleWZyYW1lXCIgb25DbGljaz17KCkgPT4ganVtcFRpbWVsaW5lS2V5ZnJhbWUoc3RvcmUsIHNuYXBzaG90LCAxKX0+PENoZXZyb25SaWdodCBhcmlhLWhpZGRlbj1cInRydWVcIiAvPjwvYnV0dG9uPlxuICAgICAgPG91dHB1dD57Zm9ybWF0V1UodHJhbnNwb3J0LnN0b3J5V1UpfTwvb3V0cHV0PlxuICAgICAgPGlucHV0XG4gICAgICAgIGFyaWEtbGFiZWw9XCJHbG9iYWwgbmFycmF0aXZlIHBsYXloZWFkXCJcbiAgICAgICAgdHlwZT1cInJhbmdlXCJcbiAgICAgICAgbWluPVwiMFwiXG4gICAgICAgIG1heD17bWF4V1V9XG4gICAgICAgIHN0ZXA9XCIwLjAwMlwiXG4gICAgICAgIHZhbHVlPXtNYXRoLm1pbihtYXhXVSwgdHJhbnNwb3J0LnN0b3J5V1UpfVxuICAgICAgICBvbkNoYW5nZT17KGV2ZW50KSA9PiBzZWVrKE51bWJlcihldmVudC50YXJnZXQudmFsdWUpKX1cbiAgICAgIC8+XG4gICAgICA8YnV0dG9uXG4gICAgICAgIHR5cGU9XCJidXR0b25cIlxuICAgICAgICBjbGFzc05hbWU9e3RyYW5zcG9ydC5vd25lciA9PT0gJ3Njcm9sbCcgPyAnaXMtYWN0aXZlJyA6ICcnfVxuICAgICAgICBvbkNsaWNrPXsoKSA9PiBzdG9yZS5zZXRUcmFuc3BvcnQoeyBvd25lcjogJ3Njcm9sbCcsIHBsYXlpbmc6IGZhbHNlIH0pfVxuICAgICAgPkZvbGxvdyBzY3JvbGw8L2J1dHRvbj5cbiAgICAgIDxidXR0b25cbiAgICAgICAgdHlwZT1cImJ1dHRvblwiXG4gICAgICAgIGNsYXNzTmFtZT17dHJhbnNwb3J0LmxpdmVBbWJpZW50ID8gJ2lzLWFjdGl2ZScgOiAnJ31cbiAgICAgICAgb25DbGljaz17KCkgPT4gc3RvcmUuc2V0VHJhbnNwb3J0KHsgbGl2ZUFtYmllbnQ6ICF0cmFuc3BvcnQubGl2ZUFtYmllbnQgfSl9XG4gICAgICA+TGl2ZSBhbWJpZW50PC9idXR0b24+XG4gICAgICA8c2VsZWN0XG4gICAgICAgIGFyaWEtbGFiZWw9XCJQcmV2aWV3IHByb2ZpbGVcIlxuICAgICAgICB2YWx1ZT17c25hcHNob3QucHJldmlld1Byb2ZpbGV9XG4gICAgICAgIG9uQ2hhbmdlPXsoZXZlbnQpID0+IHN0b3JlLnNldFByZXZpZXdQcm9maWxlKGV2ZW50LnRhcmdldC52YWx1ZSl9XG4gICAgICA+XG4gICAgICAgIDxvcHRpb24gdmFsdWU9XCJkZXNrdG9wXCI+RGVza3RvcDwvb3B0aW9uPlxuICAgICAgICA8b3B0aW9uIHZhbHVlPVwibW9iaWxlXCI+TW9iaWxlPC9vcHRpb24+XG4gICAgICAgIDxvcHRpb24gdmFsdWU9XCJyZWR1Y2VkLW1vdGlvblwiPlJlZHVjZWQgbW90aW9uPC9vcHRpb24+XG4gICAgICA8L3NlbGVjdD5cbiAgICA8L2Rpdj5cbiAgKTtcbn1cblxuZnVuY3Rpb24gVGltZWxpbmUoeyBzdG9yZSwgc25hcHNob3QgfSkge1xuICBjb25zdCB7IGRvY3VtZW50LCBjb21waWxlZFBsYW4sIHNlbGVjdGlvbiwgdHJhbnNwb3J0IH0gPSBzbmFwc2hvdDtcbiAgY29uc3Qgc2VsZWN0ZWRDdWVNZW1iZXJzID0gZ2V0QWJvdXROYXJyYXRpdmVTZWxlY3Rpb25NZW1iZXJzKHNlbGVjdGlvbik7XG4gIGNvbnN0IG1heFdVID0gTWF0aC5tYXgoMC4wMDEsIGNvbXBpbGVkUGxhbj8ubWF4U3RvcnlXVSB8fCBkb2N1bWVudC5zZWN0aW9ucy5yZWR1Y2UoKHN1bSwgc2VjdGlvbikgPT4gc3VtICsgc2VjdGlvbi5leHRlbnRXVSwgMCkpO1xuICBjb25zdCBwbGF5aGVhZCA9IGAkeyh0cmFuc3BvcnQuc3RvcnlXVSAvIG1heFdVKSAqIDEwMH0lYDtcbiAgY29uc3QgbGFuZXNSZWYgPSB1c2VSZWYobnVsbCk7XG4gIGNvbnN0IHRpbWluZ0RyYWdSZWYgPSB1c2VSZWYobnVsbCk7XG4gIGNvbnN0IHByZXZpZXdGcmFtZVJlZiA9IHVzZVJlZihudWxsKTtcbiAgY29uc3QgcGVuZGluZ1ByZXZpZXdSZWYgPSB1c2VSZWYobnVsbCk7XG4gIGNvbnN0IHN1cHByZXNzZWRDbGlja1JlZiA9IHVzZVJlZihudWxsKTtcbiAgY29uc3QgW2NhbWVyYURyYWdQcmV2aWV3LCBzZXRDYW1lcmFEcmFnUHJldmlld10gPSB1c2VTdGF0ZShudWxsKTtcbiAgY29uc3QgW3NlY3Rpb25SZXNpemVQcmV2aWV3LCBzZXRTZWN0aW9uUmVzaXplUHJldmlld10gPSB1c2VTdGF0ZShudWxsKTtcbiAgY29uc3QgW21hcnF1ZWUsIHNldE1hcnF1ZWVdID0gdXNlU3RhdGUobnVsbCk7XG5cbiAgY29uc3QgcXVldWVQcmV2aWV3RnJhbWUgPSAoY2FsbGJhY2spID0+IHtcbiAgICBwZW5kaW5nUHJldmlld1JlZi5jdXJyZW50ID0gY2FsbGJhY2s7XG4gICAgaWYgKHByZXZpZXdGcmFtZVJlZi5jdXJyZW50KSByZXR1cm47XG4gICAgcHJldmlld0ZyYW1lUmVmLmN1cnJlbnQgPSByZXF1ZXN0QW5pbWF0aW9uRnJhbWUoKCkgPT4ge1xuICAgICAgcHJldmlld0ZyYW1lUmVmLmN1cnJlbnQgPSBudWxsO1xuICAgICAgY29uc3QgcGVuZGluZyA9IHBlbmRpbmdQcmV2aWV3UmVmLmN1cnJlbnQ7XG4gICAgICBwZW5kaW5nUHJldmlld1JlZi5jdXJyZW50ID0gbnVsbDtcbiAgICAgIHBlbmRpbmc/LigpO1xuICAgIH0pO1xuICB9O1xuICBjb25zdCBmbHVzaFByZXZpZXdGcmFtZSA9ICgpID0+IHtcbiAgICBpZiAocHJldmlld0ZyYW1lUmVmLmN1cnJlbnQpIGNhbmNlbEFuaW1hdGlvbkZyYW1lKHByZXZpZXdGcmFtZVJlZi5jdXJyZW50KTtcbiAgICBwcmV2aWV3RnJhbWVSZWYuY3VycmVudCA9IG51bGw7XG4gICAgY29uc3QgcGVuZGluZyA9IHBlbmRpbmdQcmV2aWV3UmVmLmN1cnJlbnQ7XG4gICAgcGVuZGluZ1ByZXZpZXdSZWYuY3VycmVudCA9IG51bGw7XG4gICAgcGVuZGluZz8uKCk7XG4gIH07XG5cbiAgY29uc3Qgem9vbVRpbWVsaW5lID0gKGV2ZW50KSA9PiB7XG4gICAgaWYgKCFldmVudC5jdHJsS2V5ICYmICFldmVudC5tZXRhS2V5KSByZXR1cm47XG4gICAgZXZlbnQucHJldmVudERlZmF1bHQoKTtcbiAgICBjb25zdCBsYW5lcyA9IGxhbmVzUmVmLmN1cnJlbnQ7XG4gICAgaWYgKCFsYW5lcykgcmV0dXJuO1xuICAgIGNvbnN0IHJlY3QgPSBsYW5lcy5nZXRCb3VuZGluZ0NsaWVudFJlY3QoKTtcbiAgICBjb25zdCBwb2ludGVyWCA9IE1hdGgubWluKHJlY3Qud2lkdGgsIE1hdGgubWF4KDAsIGV2ZW50LmNsaWVudFggLSByZWN0LmxlZnQpKTtcbiAgICBjb25zdCBzdG9yeVJhdGlvID0gKGxhbmVzLnNjcm9sbExlZnQgKyBwb2ludGVyWCkgLyBNYXRoLm1heCgxLCBsYW5lcy5zY3JvbGxXaWR0aCk7XG4gICAgY29uc3QgY3VycmVudFpvb20gPSBNYXRoLm1heCgxLCBOdW1iZXIodHJhbnNwb3J0Lnpvb20pIHx8IDEpO1xuICAgIGNvbnN0IG5leHRab29tID0gTWF0aC5taW4oOCwgTWF0aC5tYXgoMSwgY3VycmVudFpvb20gKiBNYXRoLmV4cCgtZXZlbnQuZGVsdGFZICogMC4wMDI1KSkpO1xuICAgIHN0b3JlLnNldFRyYW5zcG9ydCh7IHpvb206IE51bWJlcihuZXh0Wm9vbS50b0ZpeGVkKDMpKSB9KTtcbiAgICByZXF1ZXN0QW5pbWF0aW9uRnJhbWUoKCkgPT4ge1xuICAgICAgbGFuZXMuc2Nyb2xsTGVmdCA9IChzdG9yeVJhdGlvICogbGFuZXMuc2Nyb2xsV2lkdGgpIC0gcG9pbnRlclg7XG4gICAgfSk7XG4gIH07XG5cbiAgdXNlRWZmZWN0KCgpID0+ICgpID0+IHtcbiAgICBpZiAocHJldmlld0ZyYW1lUmVmLmN1cnJlbnQpIGNhbmNlbEFuaW1hdGlvbkZyYW1lKHByZXZpZXdGcmFtZVJlZi5jdXJyZW50KTtcbiAgfSwgW10pO1xuXG4gIGNvbnN0IHJlc29sdmVDYW1lcmFEcm9wQXRDbGllbnRYID0gKGNsaWVudFgpID0+IHtcbiAgICBjb25zdCBsYW5lcyA9IGxhbmVzUmVmLmN1cnJlbnQ7XG4gICAgY29uc3QgY3VycmVudCA9IHN0b3JlLmdldFNuYXBzaG90KCk7XG4gICAgaWYgKCFsYW5lcykgcmV0dXJuIHsgdmFsaWQ6IGZhbHNlLCByZWFzb246ICdUaGUgY2FtZXJhIHRpbWVsaW5lIGlzIG5vdCByZWFkeS4nIH07XG4gICAgY29uc3QgcmVjdCA9IGxhbmVzLmdldEJvdW5kaW5nQ2xpZW50UmVjdCgpO1xuICAgIGNvbnN0IGNvbnRlbnRYID0gTWF0aC5taW4oXG4gICAgICBsYW5lcy5zY3JvbGxXaWR0aCxcbiAgICAgIE1hdGgubWF4KDAsIGNsaWVudFggLSByZWN0LmxlZnQgKyBsYW5lcy5zY3JvbGxMZWZ0KSxcbiAgICApO1xuICAgIGNvbnN0IHN0b3J5V1UgPSAoY29udGVudFggLyBNYXRoLm1heCgxLCBsYW5lcy5zY3JvbGxXaWR0aCkpXG4gICAgICAqIE1hdGgubWF4KDAuMDAxLCBjdXJyZW50LmNvbXBpbGVkUGxhbj8ubWF4U3RvcnlXVSB8fCBtYXhXVSk7XG4gICAgY29uc3QgZHJhZyA9IHRpbWluZ0RyYWdSZWYuY3VycmVudDtcbiAgICBjb25zdCBkcm9wID0gcmVzb2x2ZUFib3V0TmFycmF0aXZlQ2FtZXJhS2V5RHJvcCh7XG4gICAgICBkb2N1bWVudDogY3VycmVudC5kb2N1bWVudCxcbiAgICAgIHBsYW46IGN1cnJlbnQuY29tcGlsZWRQbGFuLFxuICAgICAgc291cmNlU2VjdGlvbkluZGV4OiBkcmFnPy5zZWN0aW9uSW5kZXgsXG4gICAgICBzb3VyY2VLZXlJbmRleDogZHJhZz8ua2V5SW5kZXgsXG4gICAgICBzdG9yeVdVLFxuICAgIH0pO1xuICAgIHJldHVybiB7IC4uLmRyb3AsIGNvbnRlbnRYIH07XG4gIH07XG5cbiAgY29uc3QgYmVnaW5UaW1pbmdEcmFnID0gKGV2ZW50LCBkcmFnKSA9PiB7XG4gICAgaWYgKGRyYWcubG9ja2VkIHx8IGV2ZW50LmJ1dHRvbiAhPT0gMCkgcmV0dXJuO1xuICAgIGNvbnN0IGNsaXAgPSBldmVudC5jdXJyZW50VGFyZ2V0LnBhcmVudEVsZW1lbnQ7XG4gICAgY29uc3QgcmVjdCA9IGNsaXA/LmdldEJvdW5kaW5nQ2xpZW50UmVjdCgpO1xuICAgIGlmICghcmVjdD8ud2lkdGgpIHJldHVybjtcbiAgICBldmVudC5wcmV2ZW50RGVmYXVsdCgpO1xuICAgIGV2ZW50LnN0b3BQcm9wYWdhdGlvbigpO1xuICAgIGV2ZW50LmN1cnJlbnRUYXJnZXQuc2V0UG9pbnRlckNhcHR1cmU/LihldmVudC5wb2ludGVySWQpO1xuICAgIGxldCBuZXh0U2VsZWN0aW9uID0gZHJhZy5zZWxlY3Rpb247XG4gICAgaWYgKGRyYWcudHlwZSA9PT0gJ2N1ZScpIHtcbiAgICAgIGNvbnN0IGN1cnJlbnRTZWxlY3Rpb24gPSBzdG9yZS5nZXRTbmFwc2hvdCgpLnNlbGVjdGlvbjtcbiAgICAgIGNvbnN0IGN1cnJlbnRNZW1iZXJzID0gZ2V0QWJvdXROYXJyYXRpdmVTZWxlY3Rpb25NZW1iZXJzKGN1cnJlbnRTZWxlY3Rpb24pO1xuICAgICAgY29uc3QgYWxyZWFkeVNlbGVjdGVkID0gY3VycmVudE1lbWJlcnMuc29tZSgobWVtYmVyKSA9PiAoXG4gICAgICAgIG1lbWJlci5zZWN0aW9uSWQgPT09IGRyYWcuc2VsZWN0aW9uLnNlY3Rpb25JZCAmJiBtZW1iZXIuY3VlSWQgPT09IGRyYWcuc2VsZWN0aW9uLmN1ZUlkXG4gICAgICApKTtcbiAgICAgIG5leHRTZWxlY3Rpb24gPSBldmVudC5zaGlmdEtleVxuICAgICAgICA/IHRvZ2dsZUFib3V0TmFycmF0aXZlQ3VlU2VsZWN0aW9uKGN1cnJlbnRTZWxlY3Rpb24sIGRyYWcuc2VsZWN0aW9uKVxuICAgICAgICA6IGFscmVhZHlTZWxlY3RlZCAmJiBjdXJyZW50TWVtYmVycy5sZW5ndGggPiAxXG4gICAgICAgICAgPyB7IC4uLmRyYWcuc2VsZWN0aW9uLCBtZW1iZXJzOiBjdXJyZW50TWVtYmVycyB9XG4gICAgICAgICAgOiBkcmFnLnNlbGVjdGlvbjtcbiAgICAgIHN0b3JlLmJlZ2luUHJldmlldygnTW92ZSB0ZXh0IEN1ZXMnKTtcbiAgICB9XG4gICAgdGltaW5nRHJhZ1JlZi5jdXJyZW50ID0ge1xuICAgICAgLi4uZHJhZyxcbiAgICAgIHNlbGVjdGlvbjogbmV4dFNlbGVjdGlvbixcbiAgICAgIG1lbWJlcnM6IGRyYWcudHlwZSA9PT0gJ2N1ZScgPyBnZXRBYm91dE5hcnJhdGl2ZVNlbGVjdGlvbk1lbWJlcnMobmV4dFNlbGVjdGlvbikgOiBudWxsLFxuICAgICAgc3RhcnREb2N1bWVudDogZHJhZy50eXBlID09PSAnY3VlJyA/IGNsb25lQWJvdXROYXJyYXRpdmVEb2N1bWVudChzdG9yZS5nZXRTbmFwc2hvdCgpLmRvY3VtZW50KSA6IG51bGwsXG4gICAgICBzdGFydFBsYW46IGRyYWcudHlwZSA9PT0gJ2N1ZScgPyBzdG9yZS5nZXRTbmFwc2hvdCgpLmNvbXBpbGVkUGxhbiA6IG51bGwsXG4gICAgICBwb2ludGVySWQ6IGV2ZW50LnBvaW50ZXJJZCxcbiAgICAgIHJlY3QsXG4gICAgICBzdGFydFg6IGV2ZW50LmNsaWVudFgsXG4gICAgICBtb3ZlZDogZmFsc2UsXG4gICAgICBsYXN0QXQ6IGRyYWcuYXQsXG4gICAgICBsYXN0RHJvcDogbnVsbCxcbiAgICB9O1xuICAgIHN0b3JlLnNldFNlbGVjdGlvbihuZXh0U2VsZWN0aW9uKTtcbiAgICBzdG9yZS5zZXRUcmFuc3BvcnQoeyBvd25lcjogJ3RpbWVsaW5lJywgcGxheWluZzogZmFsc2UsIHN0b3J5V1U6IGRyYWcuc3RvcnlXVSB9KTtcbiAgfTtcblxuICBjb25zdCBtb3ZlVGltaW5nRHJhZyA9IChldmVudCkgPT4ge1xuICAgIGNvbnN0IGRyYWcgPSB0aW1pbmdEcmFnUmVmLmN1cnJlbnQ7XG4gICAgaWYgKCFkcmFnIHx8IGRyYWcucG9pbnRlcklkICE9PSBldmVudC5wb2ludGVySWQpIHJldHVybjtcbiAgICBpZiAoIWRyYWcubW92ZWQgJiYgTWF0aC5hYnMoZXZlbnQuY2xpZW50WCAtIGRyYWcuc3RhcnRYKSA8IDMpIHJldHVybjtcbiAgICBkcmFnLm1vdmVkID0gdHJ1ZTtcbiAgICBpZiAoZHJhZy50eXBlID09PSAnY2FtZXJhJykge1xuICAgICAgY29uc3QgZHJvcCA9IHJlc29sdmVDYW1lcmFEcm9wQXRDbGllbnRYKGV2ZW50LmNsaWVudFgpO1xuICAgICAgZHJhZy5sYXN0RHJvcCA9IGRyb3A7XG4gICAgICBzZXRDYW1lcmFEcmFnUHJldmlldyh7IC4uLmRyb3AsIHRva2VuOiBkcmFnLnRva2VuIH0pO1xuICAgICAgaWYgKGRyb3AudmFsaWQpIHtcbiAgICAgICAgc3RvcmUuc2V0VHJhbnNwb3J0KHsgb3duZXI6ICd0aW1lbGluZScsIHBsYXlpbmc6IGZhbHNlLCBzdG9yeVdVOiBkcm9wLnN0b3J5V1UgfSk7XG4gICAgICB9XG4gICAgICByZXR1cm47XG4gICAgfVxuICAgIGlmIChkcmFnLnR5cGUgPT09ICdkaXNjaXBsaW5lLXJldmVhbCcpIHtcbiAgICAgIGNvbnN0IGRlbHRhTGFuZSA9IChldmVudC5jbGllbnRYIC0gZHJhZy5zdGFydFgpIC8gZHJhZy5yZWN0LndpZHRoO1xuICAgICAgY29uc3QgbmV4dEF0ID0gTWF0aC5taW4oZHJhZy5tYXgsIE1hdGgubWF4KFxuICAgICAgICBkcmFnLm1pbixcbiAgICAgICAgc25hcEFib3V0TmFycmF0aXZlVGltZWxpbmVWYWx1ZShkcmFnLmF0ICsgZGVsdGFMYW5lKSxcbiAgICAgICkpO1xuICAgICAgaWYgKE1hdGguYWJzKG5leHRBdCAtIGRyYWcubGFzdEF0KSA8IDAuMDAwMDAxKSByZXR1cm47XG4gICAgICBjb25zdCBkZWx0YSA9IG5leHRBdCAtIGRyYWcubGFzdEF0O1xuICAgICAgc3RvcmUuY29tbWl0KCdNb3ZlIERpc2NpcGxpbmUgcmV2ZWFsJywgKGRyYWZ0KSA9PiB7XG4gICAgICAgIGNvbnN0IHJldmVhbCA9IGRyYWZ0LnNlY3Rpb25zW2RyYWcuc2VjdGlvbkluZGV4XS50ZXh0LmRpc2NpcGxpbmVSZXZlYWw7XG4gICAgICAgIGlmICghcmV2ZWFsKSByZXR1cm47XG4gICAgICAgIHJldmVhbC5zdGFydCArPSBkZWx0YTtcbiAgICAgICAgcmV2ZWFsLmVuZCArPSBkZWx0YTtcbiAgICAgIH0sIHsgY29hbGVzY2VLZXk6IGRyYWcuY29hbGVzY2VLZXksIHNlbGVjdGlvbjogZHJhZy5zZWxlY3Rpb24gfSk7XG4gICAgICBkcmFnLmxhc3RBdCA9IG5leHRBdDtcbiAgICAgIHN0b3JlLnNldFRyYW5zcG9ydCh7XG4gICAgICAgIG93bmVyOiAndGltZWxpbmUnLFxuICAgICAgICBwbGF5aW5nOiBmYWxzZSxcbiAgICAgICAgc3RvcnlXVTogZHJhZy5zZWN0aW9uU3RhcnRXVSArIChuZXh0QXQgKiBkcmFnLnRyYXZlbFdVKSxcbiAgICAgIH0pO1xuICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICBjb25zdCBsb2NhbERlbHRhID0gKGV2ZW50LmNsaWVudFggLSBkcmFnLnN0YXJ0WCkgLyBkcmFnLnJlY3Qud2lkdGg7XG4gICAgY29uc3QgbW92ZW1lbnQgPSByZXNvbHZlQWJvdXROYXJyYXRpdmVDdWVHcm91cE1vdmUoe1xuICAgICAgZG9jdW1lbnQ6IGRyYWcuc3RhcnREb2N1bWVudCxcbiAgICAgIHBsYW46IGRyYWcuc3RhcnRQbGFuLFxuICAgICAgbWVtYmVyczogZHJhZy5tZW1iZXJzLFxuICAgICAgcHJpbWFyeTogZHJhZy5zZWxlY3Rpb24sXG4gICAgICBsb2NhbERlbHRhLFxuICAgIH0pO1xuICAgIGlmICghbW92ZW1lbnQudmFsaWQgfHwgTWF0aC5hYnMobW92ZW1lbnQuZGVsdGFXVSAtIChkcmFnLmxhc3REZWx0YVdVIHx8IDApKSA8IDAuMDAwMDAxKSByZXR1cm47XG4gICAgZHJhZy5sYXN0RGVsdGFXVSA9IG1vdmVtZW50LmRlbHRhV1U7XG4gICAgcXVldWVQcmV2aWV3RnJhbWUoKCkgPT4ge1xuICAgICAgc3RvcmUudXBkYXRlUHJldmlldygoZHJhZnQpID0+IHtcbiAgICAgICAgbW92ZW1lbnQubW92ZXMuZm9yRWFjaCgobW92ZSkgPT4ge1xuICAgICAgICAgIGNvbnN0IGN1ZSA9IGRyYWZ0LnNlY3Rpb25zW21vdmUuc2VjdGlvbkluZGV4XT8udGV4dD8uY3Vlcz8uZmluZCgoaXRlbSkgPT4gaXRlbS5pZCA9PT0gbW92ZS5jdWVJZCk7XG4gICAgICAgICAgaWYgKGN1ZSkgT2JqZWN0LmFzc2lnbihjdWUsIHsgZW50ZXI6IG1vdmUuZW50ZXIsIGhvbGQ6IG1vdmUuaG9sZCwgZXhpdDogbW92ZS5leGl0IH0pO1xuICAgICAgICB9KTtcbiAgICAgIH0sIHtcbiAgICAgICAgb3duZXI6ICd0aW1lbGluZScsXG4gICAgICAgIHBsYXlpbmc6IGZhbHNlLFxuICAgICAgICBzdG9yeVdVOiBkcmFnLnN0b3J5V1UgKyBtb3ZlbWVudC5kZWx0YVdVLFxuICAgICAgfSk7XG4gICAgfSk7XG4gIH07XG5cbiAgY29uc3QgZW5kVGltaW5nRHJhZyA9IChldmVudCkgPT4ge1xuICAgIGNvbnN0IGRyYWcgPSB0aW1pbmdEcmFnUmVmLmN1cnJlbnQ7XG4gICAgaWYgKCFkcmFnIHx8IGRyYWcucG9pbnRlcklkICE9PSBldmVudC5wb2ludGVySWQpIHJldHVybjtcbiAgICBpZiAoZXZlbnQuY3VycmVudFRhcmdldC5oYXNQb2ludGVyQ2FwdHVyZT8uKGV2ZW50LnBvaW50ZXJJZCkpIGV2ZW50LmN1cnJlbnRUYXJnZXQucmVsZWFzZVBvaW50ZXJDYXB0dXJlKGV2ZW50LnBvaW50ZXJJZCk7XG4gICAgaWYgKGRyYWcudHlwZSA9PT0gJ2N1ZScpIHtcbiAgICAgIGZsdXNoUHJldmlld0ZyYW1lKCk7XG4gICAgICBpZiAoZXZlbnQudHlwZSA9PT0gJ3BvaW50ZXJjYW5jZWwnIHx8ICFkcmFnLm1vdmVkKSBzdG9yZS5jYW5jZWxQcmV2aWV3KCk7XG4gICAgICBlbHNlIHN0b3JlLmNvbW1pdFByZXZpZXcoZHJhZy5zZWxlY3Rpb24pO1xuICAgIH1cbiAgICBpZiAoZHJhZy50eXBlID09PSAnY2FtZXJhJyAmJiBkcmFnLm1vdmVkICYmIGV2ZW50LnR5cGUgIT09ICdwb2ludGVyY2FuY2VsJykge1xuICAgICAgY29uc3QgZHJvcCA9IGRyYWcubGFzdERyb3AgfHwgcmVzb2x2ZUNhbWVyYURyb3BBdENsaWVudFgoZXZlbnQuY2xpZW50WCk7XG4gICAgICBpZiAoZHJvcC52YWxpZCkge1xuICAgICAgICBzdG9yZS5jb21taXQoJ01vdmUgY2FtZXJhIGtleScsIChkcmFmdCkgPT4ge1xuICAgICAgICAgIGNvbnN0IHNvdXJjZUtleXMgPSBkcmFmdC5zZWN0aW9uc1tkcmFnLnNlY3Rpb25JbmRleF0/LmNhbWVyYS5rZXlzO1xuICAgICAgICAgIGNvbnN0IFttb3ZlZEtleV0gPSBzb3VyY2VLZXlzPy5zcGxpY2UoZHJhZy5rZXlJbmRleCwgMSkgfHwgW107XG4gICAgICAgICAgaWYgKCFtb3ZlZEtleSkgcmV0dXJuO1xuICAgICAgICAgIG1vdmVkS2V5LmF0ID0gZHJvcC5hdDtcbiAgICAgICAgICBjb25zdCBkZXN0aW5hdGlvbktleXMgPSBkcmFmdC5zZWN0aW9uc1tkcm9wLnNlY3Rpb25JbmRleF0uY2FtZXJhLmtleXM7XG4gICAgICAgICAgZGVzdGluYXRpb25LZXlzLnB1c2gobW92ZWRLZXkpO1xuICAgICAgICAgIGRlc3RpbmF0aW9uS2V5cy5zb3J0KChhLCBiKSA9PiBhLmF0IC0gYi5hdCk7XG4gICAgICAgIH0sIHtcbiAgICAgICAgICBzZWxlY3Rpb246IHsgdHlwZTogJ2NhbWVyYS1rZXknLCBzZWN0aW9uSWQ6IGRyb3Auc2VjdGlvbklkLCBrZXlJbmRleDogZHJvcC5rZXlJbmRleCB9LFxuICAgICAgICB9KTtcbiAgICAgICAgc3RvcmUuc2V0VHJhbnNwb3J0KHsgb3duZXI6ICd0aW1lbGluZScsIHBsYXlpbmc6IGZhbHNlLCBzdG9yeVdVOiBkcm9wLnN0b3J5V1UgfSk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBzdG9yZS5zZXRTYXZlU3RhdGUoeyBtZXNzYWdlOiBkcm9wLnJlYXNvbiB8fCAnVGhhdCBjYW1lcmEga2V5IGNhbm5vdCBiZSBwbGFjZWQgaGVyZS4nIH0pO1xuICAgICAgfVxuICAgIH1cbiAgICBpZiAoZHJhZy5tb3ZlZCkge1xuICAgICAgc3VwcHJlc3NlZENsaWNrUmVmLmN1cnJlbnQgPSBkcmFnLnRva2VuO1xuICAgICAgd2luZG93LnNldFRpbWVvdXQoKCkgPT4ge1xuICAgICAgICBpZiAoc3VwcHJlc3NlZENsaWNrUmVmLmN1cnJlbnQgPT09IGRyYWcudG9rZW4pIHN1cHByZXNzZWRDbGlja1JlZi5jdXJyZW50ID0gbnVsbDtcbiAgICAgIH0sIDApO1xuICAgIH1cbiAgICBzZXRDYW1lcmFEcmFnUHJldmlldyhudWxsKTtcbiAgICB0aW1pbmdEcmFnUmVmLmN1cnJlbnQgPSBudWxsO1xuICB9O1xuXG4gIGNvbnN0IGhhbmRsZVRpbWluZ0NsaWNrID0gKHRva2VuLCBhY3Rpb24pID0+IHtcbiAgICBpZiAoc3VwcHJlc3NlZENsaWNrUmVmLmN1cnJlbnQgPT09IHRva2VuKSB7XG4gICAgICBzdXBwcmVzc2VkQ2xpY2tSZWYuY3VycmVudCA9IG51bGw7XG4gICAgICByZXR1cm47XG4gICAgfVxuICAgIGFjdGlvbigpO1xuICB9O1xuXG4gIGNvbnN0IGJlZ2luU2VjdGlvblJlc2l6ZSA9IChldmVudCwgZGF0YSkgPT4ge1xuICAgIGlmIChkYXRhLmxvY2tlZCB8fCBldmVudC5idXR0b24gIT09IDApIHJldHVybjtcbiAgICBldmVudC5wcmV2ZW50RGVmYXVsdCgpO1xuICAgIGV2ZW50LnN0b3BQcm9wYWdhdGlvbigpO1xuICAgIGV2ZW50LmN1cnJlbnRUYXJnZXQuc2V0UG9pbnRlckNhcHR1cmU/LihldmVudC5wb2ludGVySWQpO1xuICAgIGNvbnN0IGN1cnJlbnQgPSBzdG9yZS5nZXRTbmFwc2hvdCgpO1xuICAgIGNvbnN0IGZpZWxkID0gZ2V0QWJvdXROYXJyYXRpdmVFeHRlbnRGaWVsZChjdXJyZW50LnByZXZpZXdQcm9maWxlKTtcbiAgICBzdG9yZS5iZWdpblByZXZpZXcoYFJlc2l6ZSAke2RhdGEuc2VjdGlvbkxhYmVsfWApO1xuICAgIHN0b3JlLnNldFNlbGVjdGlvbih7IHR5cGU6ICdzZWN0aW9uJywgc2VjdGlvbklkOiBkYXRhLnNlY3Rpb25JZCB9KTtcbiAgICB0aW1pbmdEcmFnUmVmLmN1cnJlbnQgPSB7XG4gICAgICB0eXBlOiAnc2VjdGlvbi1yZXNpemUnLFxuICAgICAgdG9rZW46IGBzZWN0aW9uLXJlc2l6ZToke2RhdGEuc2VjdGlvbklkfWAsXG4gICAgICBwb2ludGVySWQ6IGV2ZW50LnBvaW50ZXJJZCxcbiAgICAgIHN0YXJ0WDogZXZlbnQuY2xpZW50WCxcbiAgICAgIG1vdmVkOiBmYWxzZSxcbiAgICAgIHNlY3Rpb25JZDogZGF0YS5zZWN0aW9uSWQsXG4gICAgICBzZWN0aW9uSW5kZXg6IGRhdGEuc2VjdGlvbkluZGV4LFxuICAgICAgc2VjdGlvbkxhYmVsOiBkYXRhLnNlY3Rpb25MYWJlbCxcbiAgICAgIGZpZWxkLFxuICAgICAgc3RhcnRFeHRlbnQ6IE51bWJlcihjdXJyZW50LmRvY3VtZW50LnNlY3Rpb25zW2RhdGEuc2VjdGlvbkluZGV4XVtmaWVsZF0pLFxuICAgICAgc3RhcnRNYXhXVTogTWF0aC5tYXgoMC4wMDEsIGN1cnJlbnQuY29tcGlsZWRQbGFuPy5tYXhTdG9yeVdVIHx8IG1heFdVKSxcbiAgICAgIHN0YXJ0U2Nyb2xsV2lkdGg6IE1hdGgubWF4KDEsIGxhbmVzUmVmLmN1cnJlbnQ/LnNjcm9sbFdpZHRoIHx8IDEpLFxuICAgICAgcGxheWhlYWRDb250ZXh0OiBjYXB0dXJlQWJvdXROYXJyYXRpdmVQbGF5aGVhZENvbnRleHQoe1xuICAgICAgICBwbGFuOiBjdXJyZW50LmNvbXBpbGVkUGxhbixcbiAgICAgICAgc3RvcnlXVTogY3VycmVudC50cmFuc3BvcnQuc3RvcnlXVSxcbiAgICAgICAgcmVzaXplZFNlY3Rpb25JZDogZGF0YS5zZWN0aW9uSWQsXG4gICAgICB9KSxcbiAgICAgIHNlbGVjdGlvbjogeyB0eXBlOiAnc2VjdGlvbicsIHNlY3Rpb25JZDogZGF0YS5zZWN0aW9uSWQgfSxcbiAgICB9O1xuICAgIHNldFNlY3Rpb25SZXNpemVQcmV2aWV3KHsgc2VjdGlvbklkOiBkYXRhLnNlY3Rpb25JZCwgZXh0ZW50OiBOdW1iZXIoY3VycmVudC5kb2N1bWVudC5zZWN0aW9uc1tkYXRhLnNlY3Rpb25JbmRleF1bZmllbGRdKSB9KTtcbiAgfTtcblxuICBjb25zdCBtb3ZlU2VjdGlvblJlc2l6ZSA9IChldmVudCkgPT4ge1xuICAgIGNvbnN0IGRyYWcgPSB0aW1pbmdEcmFnUmVmLmN1cnJlbnQ7XG4gICAgaWYgKGRyYWc/LnR5cGUgIT09ICdzZWN0aW9uLXJlc2l6ZScgfHwgZHJhZy5wb2ludGVySWQgIT09IGV2ZW50LnBvaW50ZXJJZCkgcmV0dXJuO1xuICAgIGlmICghZHJhZy5tb3ZlZCAmJiBNYXRoLmFicyhldmVudC5jbGllbnRYIC0gZHJhZy5zdGFydFgpIDwgMykgcmV0dXJuO1xuICAgIGRyYWcubW92ZWQgPSB0cnVlO1xuICAgIGNvbnN0IHJhd0V4dGVudCA9IGRyYWcuc3RhcnRFeHRlbnQgKyAoKChldmVudC5jbGllbnRYIC0gZHJhZy5zdGFydFgpIC8gZHJhZy5zdGFydFNjcm9sbFdpZHRoKSAqIGRyYWcuc3RhcnRNYXhXVSk7XG4gICAgY29uc3Qgc3RlcCA9IGV2ZW50LmFsdEtleSA/IDAuMDEgOiBldmVudC5zaGlmdEtleSA/IDAuMjUgOiAwLjA1O1xuICAgIGNvbnN0IGV4dGVudCA9IE1hdGgubWluKDgsIE1hdGgubWF4KDEsIE1hdGgucm91bmQocmF3RXh0ZW50IC8gc3RlcCkgKiBzdGVwKSk7XG4gICAgaWYgKE1hdGguYWJzKGV4dGVudCAtIChkcmFnLmxhc3RFeHRlbnQgPz8gZHJhZy5zdGFydEV4dGVudCkpIDwgMC4wMDAwMDEpIHJldHVybjtcbiAgICBkcmFnLmxhc3RFeHRlbnQgPSBOdW1iZXIoZXh0ZW50LnRvRml4ZWQoMikpO1xuICAgIHNldFNlY3Rpb25SZXNpemVQcmV2aWV3KHsgc2VjdGlvbklkOiBkcmFnLnNlY3Rpb25JZCwgZXh0ZW50OiBkcmFnLmxhc3RFeHRlbnQgfSk7XG4gICAgcXVldWVQcmV2aWV3RnJhbWUoKCkgPT4ge1xuICAgICAgc3RvcmUudXBkYXRlUHJldmlldygoZHJhZnQpID0+IHtcbiAgICAgICAgZHJhZnQuc2VjdGlvbnNbZHJhZy5zZWN0aW9uSW5kZXhdW2RyYWcuZmllbGRdID0gZHJhZy5sYXN0RXh0ZW50O1xuICAgICAgfSk7XG4gICAgICBzdG9yZS5zZXRUcmFuc3BvcnQoe1xuICAgICAgICBvd25lcjogJ3RpbWVsaW5lJyxcbiAgICAgICAgcGxheWluZzogZmFsc2UsXG4gICAgICAgIHN0b3J5V1U6IHJlbWFwQWJvdXROYXJyYXRpdmVQbGF5aGVhZENvbnRleHQoZHJhZy5wbGF5aGVhZENvbnRleHQsIHN0b3JlLmdldFNuYXBzaG90KCkuY29tcGlsZWRQbGFuKSxcbiAgICAgIH0pO1xuICAgIH0pO1xuICB9O1xuXG4gIGNvbnN0IGVuZFNlY3Rpb25SZXNpemUgPSAoZXZlbnQpID0+IHtcbiAgICBjb25zdCBkcmFnID0gdGltaW5nRHJhZ1JlZi5jdXJyZW50O1xuICAgIGlmIChkcmFnPy50eXBlICE9PSAnc2VjdGlvbi1yZXNpemUnIHx8IGRyYWcucG9pbnRlcklkICE9PSBldmVudC5wb2ludGVySWQpIHJldHVybjtcbiAgICBpZiAoZXZlbnQuY3VycmVudFRhcmdldC5oYXNQb2ludGVyQ2FwdHVyZT8uKGV2ZW50LnBvaW50ZXJJZCkpIGV2ZW50LmN1cnJlbnRUYXJnZXQucmVsZWFzZVBvaW50ZXJDYXB0dXJlKGV2ZW50LnBvaW50ZXJJZCk7XG4gICAgZmx1c2hQcmV2aWV3RnJhbWUoKTtcbiAgICBpZiAoZXZlbnQudHlwZSA9PT0gJ3BvaW50ZXJjYW5jZWwnIHx8ICFkcmFnLm1vdmVkKSBzdG9yZS5jYW5jZWxQcmV2aWV3KCk7XG4gICAgZWxzZSBzdG9yZS5jb21taXRQcmV2aWV3KGRyYWcuc2VsZWN0aW9uKTtcbiAgICB0aW1pbmdEcmFnUmVmLmN1cnJlbnQgPSBudWxsO1xuICAgIHNldFNlY3Rpb25SZXNpemVQcmV2aWV3KG51bGwpO1xuICB9O1xuXG4gIGNvbnN0IHJlc2V0U2VjdGlvbkV4dGVudCA9IChzZWN0aW9uSWQsIHNlY3Rpb25JbmRleCkgPT4ge1xuICAgIGNvbnN0IGN1cnJlbnQgPSBzdG9yZS5nZXRTbmFwc2hvdCgpO1xuICAgIGNvbnN0IGZpZWxkID0gZ2V0QWJvdXROYXJyYXRpdmVFeHRlbnRGaWVsZChjdXJyZW50LnByZXZpZXdQcm9maWxlKTtcbiAgICBjb25zdCBiYXNlbGluZVNlY3Rpb24gPSBjdXJyZW50LmJhc2VsaW5lRG9jdW1lbnQuc2VjdGlvbnMuZmluZCgoaXRlbSkgPT4gaXRlbS5pZCA9PT0gc2VjdGlvbklkKTtcbiAgICBpZiAoIWJhc2VsaW5lU2VjdGlvbiB8fCBiYXNlbGluZVNlY3Rpb25bZmllbGRdID09PSBjdXJyZW50LmRvY3VtZW50LnNlY3Rpb25zW3NlY3Rpb25JbmRleF1bZmllbGRdKSByZXR1cm47XG4gICAgY29uc3QgY29udGV4dCA9IGNhcHR1cmVBYm91dE5hcnJhdGl2ZVBsYXloZWFkQ29udGV4dCh7XG4gICAgICBwbGFuOiBjdXJyZW50LmNvbXBpbGVkUGxhbixcbiAgICAgIHN0b3J5V1U6IGN1cnJlbnQudHJhbnNwb3J0LnN0b3J5V1UsXG4gICAgICByZXNpemVkU2VjdGlvbklkOiBzZWN0aW9uSWQsXG4gICAgfSk7XG4gICAgc3RvcmUuYmVnaW5QcmV2aWV3KCdSZXN0b3JlIHNhdmVkIFNlY3Rpb24gbGVuZ3RoJyk7XG4gICAgc3RvcmUudXBkYXRlUHJldmlldygoZHJhZnQpID0+IHsgZHJhZnQuc2VjdGlvbnNbc2VjdGlvbkluZGV4XVtmaWVsZF0gPSBiYXNlbGluZVNlY3Rpb25bZmllbGRdOyB9KTtcbiAgICBzdG9yZS5zZXRUcmFuc3BvcnQoeyBzdG9yeVdVOiByZW1hcEFib3V0TmFycmF0aXZlUGxheWhlYWRDb250ZXh0KGNvbnRleHQsIHN0b3JlLmdldFNuYXBzaG90KCkuY29tcGlsZWRQbGFuKSB9KTtcbiAgICBzdG9yZS5jb21taXRQcmV2aWV3KHsgdHlwZTogJ3NlY3Rpb24nLCBzZWN0aW9uSWQgfSk7XG4gIH07XG5cbiAgY29uc3QgYmVnaW5NYXJxdWVlID0gKGV2ZW50KSA9PiB7XG4gICAgaWYgKGV2ZW50LmJ1dHRvbiAhPT0gMCB8fCBldmVudC50YXJnZXQgIT09IGV2ZW50LmN1cnJlbnRUYXJnZXQpIHJldHVybjtcbiAgICBjb25zdCBjYW52YXMgPSBsYW5lc1JlZi5jdXJyZW50Py5xdWVyeVNlbGVjdG9yKCcuYWJvdXQtZWRpdG9yLXRpbWVsaW5lLWNhbnZhcycpO1xuICAgIGlmICghY2FudmFzKSByZXR1cm47XG4gICAgZXZlbnQucHJldmVudERlZmF1bHQoKTtcbiAgICBldmVudC5jdXJyZW50VGFyZ2V0LnNldFBvaW50ZXJDYXB0dXJlPy4oZXZlbnQucG9pbnRlcklkKTtcbiAgICBjb25zdCByZWN0ID0gY2FudmFzLmdldEJvdW5kaW5nQ2xpZW50UmVjdCgpO1xuICAgIHRpbWluZ0RyYWdSZWYuY3VycmVudCA9IHtcbiAgICAgIHR5cGU6ICdtYXJxdWVlJyxcbiAgICAgIHBvaW50ZXJJZDogZXZlbnQucG9pbnRlcklkLFxuICAgICAgc3RhcnRDbGllbnRYOiBldmVudC5jbGllbnRYLFxuICAgICAgc3RhcnRDbGllbnRZOiBldmVudC5jbGllbnRZLFxuICAgICAgY2FudmFzUmVjdDogcmVjdCxcbiAgICAgIGFkZGl0aXZlOiBldmVudC5zaGlmdEtleSxcbiAgICB9O1xuICAgIHNldE1hcnF1ZWUoeyBsZWZ0OiBldmVudC5jbGllbnRYIC0gcmVjdC5sZWZ0LCB0b3A6IGV2ZW50LmNsaWVudFkgLSByZWN0LnRvcCwgd2lkdGg6IDAsIGhlaWdodDogMCB9KTtcbiAgfTtcblxuICBjb25zdCBtb3ZlTWFycXVlZSA9IChldmVudCkgPT4ge1xuICAgIGNvbnN0IGRyYWcgPSB0aW1pbmdEcmFnUmVmLmN1cnJlbnQ7XG4gICAgaWYgKGRyYWc/LnR5cGUgIT09ICdtYXJxdWVlJyB8fCBkcmFnLnBvaW50ZXJJZCAhPT0gZXZlbnQucG9pbnRlcklkKSByZXR1cm47XG4gICAgY29uc3QgbGVmdCA9IE1hdGgubWluKGRyYWcuc3RhcnRDbGllbnRYLCBldmVudC5jbGllbnRYKSAtIGRyYWcuY2FudmFzUmVjdC5sZWZ0O1xuICAgIGNvbnN0IHRvcCA9IE1hdGgubWluKGRyYWcuc3RhcnRDbGllbnRZLCBldmVudC5jbGllbnRZKSAtIGRyYWcuY2FudmFzUmVjdC50b3A7XG4gICAgc2V0TWFycXVlZSh7XG4gICAgICBsZWZ0LFxuICAgICAgdG9wLFxuICAgICAgd2lkdGg6IE1hdGguYWJzKGV2ZW50LmNsaWVudFggLSBkcmFnLnN0YXJ0Q2xpZW50WCksXG4gICAgICBoZWlnaHQ6IE1hdGguYWJzKGV2ZW50LmNsaWVudFkgLSBkcmFnLnN0YXJ0Q2xpZW50WSksXG4gICAgfSk7XG4gIH07XG5cbiAgY29uc3QgZW5kTWFycXVlZSA9IChldmVudCkgPT4ge1xuICAgIGNvbnN0IGRyYWcgPSB0aW1pbmdEcmFnUmVmLmN1cnJlbnQ7XG4gICAgaWYgKGRyYWc/LnR5cGUgIT09ICdtYXJxdWVlJyB8fCBkcmFnLnBvaW50ZXJJZCAhPT0gZXZlbnQucG9pbnRlcklkKSByZXR1cm47XG4gICAgaWYgKGV2ZW50LmN1cnJlbnRUYXJnZXQuaGFzUG9pbnRlckNhcHR1cmU/LihldmVudC5wb2ludGVySWQpKSBldmVudC5jdXJyZW50VGFyZ2V0LnJlbGVhc2VQb2ludGVyQ2FwdHVyZShldmVudC5wb2ludGVySWQpO1xuICAgIGlmIChldmVudC50eXBlICE9PSAncG9pbnRlcmNhbmNlbCcpIHtcbiAgICAgIGNvbnN0IHNlbGVjdGlvblJlY3QgPSB7XG4gICAgICAgIGxlZnQ6IE1hdGgubWluKGRyYWcuc3RhcnRDbGllbnRYLCBldmVudC5jbGllbnRYKSxcbiAgICAgICAgcmlnaHQ6IE1hdGgubWF4KGRyYWcuc3RhcnRDbGllbnRYLCBldmVudC5jbGllbnRYKSxcbiAgICAgICAgdG9wOiBNYXRoLm1pbihkcmFnLnN0YXJ0Q2xpZW50WSwgZXZlbnQuY2xpZW50WSksXG4gICAgICAgIGJvdHRvbTogTWF0aC5tYXgoZHJhZy5zdGFydENsaWVudFksIGV2ZW50LmNsaWVudFkpLFxuICAgICAgfTtcbiAgICAgIGNvbnN0IGxhbmVSZWN0ID0gbGFuZXNSZWYuY3VycmVudD8uZ2V0Qm91bmRpbmdDbGllbnRSZWN0KCk7XG4gICAgICBjb25zdCBoaXRzID0gWy4uLihsYW5lc1JlZi5jdXJyZW50Py5xdWVyeVNlbGVjdG9yQWxsKCcuYWJvdXQtZWRpdG9yLWN1ZVtkYXRhLWN1ZS1pZF0nKSB8fCBbXSldXG4gICAgICAgIC5maWx0ZXIoKG5vZGUpID0+IHtcbiAgICAgICAgICBjb25zdCByZWN0ID0gbm9kZS5nZXRCb3VuZGluZ0NsaWVudFJlY3QoKTtcbiAgICAgICAgICBjb25zdCB2aXNpYmxlID0gbGFuZVJlY3QgJiYgcmVjdC5yaWdodCA+PSBsYW5lUmVjdC5sZWZ0ICYmIHJlY3QubGVmdCA8PSBsYW5lUmVjdC5yaWdodDtcbiAgICAgICAgICByZXR1cm4gdmlzaWJsZSAmJiByZWN0LnJpZ2h0ID49IHNlbGVjdGlvblJlY3QubGVmdCAmJiByZWN0LmxlZnQgPD0gc2VsZWN0aW9uUmVjdC5yaWdodFxuICAgICAgICAgICAgJiYgcmVjdC5ib3R0b20gPj0gc2VsZWN0aW9uUmVjdC50b3AgJiYgcmVjdC50b3AgPD0gc2VsZWN0aW9uUmVjdC5ib3R0b207XG4gICAgICAgIH0pXG4gICAgICAgIC5tYXAoKG5vZGUpID0+ICh7IHR5cGU6ICdjdWUnLCBzZWN0aW9uSWQ6IG5vZGUuZGF0YXNldC5zZWN0aW9uSWQsIGN1ZUlkOiBub2RlLmRhdGFzZXQuY3VlSWQsIGtleVBhcnQ6ICdmb2N1cycgfSkpO1xuICAgICAgaWYgKGhpdHMubGVuZ3RoKSB7XG4gICAgICAgIGxldCBuZXh0U2VsZWN0aW9uID0gZHJhZy5hZGRpdGl2ZSA/IHN0b3JlLmdldFNuYXBzaG90KCkuc2VsZWN0aW9uIDogaGl0c1swXTtcbiAgICAgICAgaGl0cy5zbGljZShkcmFnLmFkZGl0aXZlID8gMCA6IDEpLmZvckVhY2goKGhpdCkgPT4ge1xuICAgICAgICAgIG5leHRTZWxlY3Rpb24gPSB0b2dnbGVBYm91dE5hcnJhdGl2ZUN1ZVNlbGVjdGlvbihuZXh0U2VsZWN0aW9uLCBoaXQpO1xuICAgICAgICB9KTtcbiAgICAgICAgc3RvcmUuc2V0U2VsZWN0aW9uKG5leHRTZWxlY3Rpb24pO1xuICAgICAgfVxuICAgIH1cbiAgICB0aW1pbmdEcmFnUmVmLmN1cnJlbnQgPSBudWxsO1xuICAgIHNldE1hcnF1ZWUobnVsbCk7XG4gIH07XG5cbiAgcmV0dXJuIChcbiAgICA8ZGl2IGNsYXNzTmFtZT1cImFib3V0LWVkaXRvci10aW1lbGluZVwiPlxuICAgICAgPGRpdiBjbGFzc05hbWU9XCJhYm91dC1lZGl0b3ItbGFuZS1sYWJlbHNcIiBhcmlhLWhpZGRlbj1cInRydWVcIj5cbiAgICAgICAgPHNwYW4+U2VjdGlvbnM8L3NwYW4+PHNwYW4+Q2FtZXJhPC9zcGFuPjxzcGFuPldvcmxkPC9zcGFuPjxzcGFuPlRleHQ8L3NwYW4+PHNwYW4+SW50ZXJhY3Rpb248L3NwYW4+XG4gICAgICA8L2Rpdj5cbiAgICAgIDxkaXYgcmVmPXtsYW5lc1JlZn0gY2xhc3NOYW1lPVwiYWJvdXQtZWRpdG9yLWxhbmVzXCIgZGF0YS1zb2xvLXRyYWNrPXt0cmFuc3BvcnQuc29sb1RyYWNrIHx8ICcnfSBvbldoZWVsPXt6b29tVGltZWxpbmV9PlxuICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cImFib3V0LWVkaXRvci10aW1lbGluZS1jYW52YXNcIiBzdHlsZT17eyAnLS1hYm91dC1lZGl0b3ItcGxheWhlYWQnOiBwbGF5aGVhZCwgJy0tYWJvdXQtZWRpdG9yLXRpbWVsaW5lLXpvb20nOiBNYXRoLm1heCgxLCBOdW1iZXIodHJhbnNwb3J0Lnpvb20pIHx8IDEpIH19PlxuICAgICAgICAgIDxkaXYgY2xhc3NOYW1lPVwiYWJvdXQtZWRpdG9yLXBsYXloZWFkXCIgLz5cbiAgICAgICAgICB7bWFycXVlZSA/IDxkaXYgY2xhc3NOYW1lPVwiYWJvdXQtZWRpdG9yLW1hcnF1ZWVcIiBzdHlsZT17bWFycXVlZX0gYXJpYS1oaWRkZW49XCJ0cnVlXCIgLz4gOiBudWxsfVxuICAgICAgICAgIHtjYW1lcmFEcmFnUHJldmlldyA/IChcbiAgICAgICAgICA8ZGl2XG4gICAgICAgICAgICBjbGFzc05hbWU9e2BhYm91dC1lZGl0b3ItY2FtZXJhLWRyYWctZ2hvc3Qke2NhbWVyYURyYWdQcmV2aWV3LnZhbGlkID8gJycgOiAnIGlzLWludmFsaWQnfWB9XG4gICAgICAgICAgICBzdHlsZT17eyBsZWZ0OiBgJHtjYW1lcmFEcmFnUHJldmlldy5jb250ZW50WH1weGAgfX1cbiAgICAgICAgICAgIGFyaWEtaGlkZGVuPVwidHJ1ZVwiXG4gICAgICAgICAgPlxuICAgICAgICAgICAgPGkgLz5cbiAgICAgICAgICAgIDxzcGFuPntjYW1lcmFEcmFnUHJldmlldy52YWxpZCA/IGAke2NhbWVyYURyYWdQcmV2aWV3LnNlY3Rpb25MYWJlbH0gwrcgJHtmb3JtYXRDYW1lcmFQZXJjZW50KGNhbWVyYURyYWdQcmV2aWV3LmF0KX1gIDogY2FtZXJhRHJhZ1ByZXZpZXcucmVhc29ufTwvc3Bhbj5cbiAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICApIDogbnVsbH1cbiAgICAgICAgICB7WydzZWN0aW9uJywgJ2NhbWVyYScsICd3b3JsZCcsICd0ZXh0JywgJ2ludGVyYWN0aW9uJ10ubWFwKChsYW5lKSA9PiAoXG4gICAgICAgICAgPGRpdiBjbGFzc05hbWU9e2BhYm91dC1lZGl0b3ItbGFuZSBhYm91dC1lZGl0b3ItbGFuZS0tJHtsYW5lfWB9IGtleT17bGFuZX0+XG4gICAgICAgICAgICB7ZG9jdW1lbnQuc2VjdGlvbnMubWFwKChzZWN0aW9uLCBzZWN0aW9uSW5kZXgpID0+IHtcbiAgICAgICAgICAgICAgY29uc3QgY29tcGlsZWQgPSBjb21waWxlZFBsYW4/LnNlY3Rpb25zPy5bc2VjdGlvbkluZGV4XTtcbiAgICAgICAgICAgICAgY29uc3Qgc3RhcnRXVSA9IE1hdGgubWluKG1heFdVLCBjb21waWxlZD8uc3RhcnRXVSB8fCAwKTtcbiAgICAgICAgICAgICAgY29uc3QgbmV4dFN0YXJ0V1UgPSBNYXRoLm1pbihtYXhXVSwgY29tcGlsZWRQbGFuPy5zZWN0aW9ucz8uW3NlY3Rpb25JbmRleCArIDFdPy5zdGFydFdVID8/IG1heFdVKTtcbiAgICAgICAgICAgICAgY29uc3Qgc3BhbldVID0gTWF0aC5tYXgoMC4wMDEsIG5leHRTdGFydFdVIC0gc3RhcnRXVSk7XG4gICAgICAgICAgICAgIGNvbnN0IHdpZHRoID0gYCR7KHNwYW5XVSAvIG1heFdVKSAqIDEwMH0lYDtcbiAgICAgICAgICAgICAgY29uc3QgaW5TZWxlY3RlZFNlY3Rpb24gPSBzZWxlY3Rpb24uc2VjdGlvbklkID09PSBzZWN0aW9uLmlkO1xuICAgICAgICAgICAgICBjb25zdCBsb2NhbFBlcmNlbnQgPSAoYXQpID0+IE1hdGgubWluKDEwMCwgKE51bWJlcihhdCB8fCAwKSAqIChjb21waWxlZD8udHJhdmVsV1UgfHwgc3BhbldVKSAvIHNwYW5XVSkgKiAxMDApO1xuICAgICAgICAgICAgICBjb25zdCBsb2NhbFBvc2l0aW9uID0gKGF0KSA9PiBgJHtsb2NhbFBlcmNlbnQoYXQpfSVgO1xuICAgICAgICAgICAgICBjb25zdCBleHRlbmRlZExvY2FsUG9zaXRpb24gPSAoYXQpID0+IGAkeyhOdW1iZXIoYXQgfHwgMCkgKiAoY29tcGlsZWQ/LnRyYXZlbFdVIHx8IHNwYW5XVSkgLyBzcGFuV1UpICogMTAwfSVgO1xuICAgICAgICAgICAgICBjb25zdCBleHRlbmRlZExvY2FsV2lkdGggPSAoZnJvbSwgdG8pID0+IGAke01hdGgubWF4KDAuMzUsIChOdW1iZXIodG8pIC0gTnVtYmVyKGZyb20pKSAqIChjb21waWxlZD8udHJhdmVsV1UgfHwgc3BhbldVKSAvIHNwYW5XVSAqIDEwMCl9JWA7XG4gICAgICAgICAgICAgIGNvbnN0IHRleHRQb3NpdGlvbiA9IChhdCkgPT4gYCR7Y2xhbXAwMShOdW1iZXIoYXQgfHwgMCkpICogMTAwfSVgO1xuICAgICAgICAgICAgICBjb25zdCBzZWxlY3RBdCA9IChuZXh0U2VsZWN0aW9uLCBhdCA9IDApID0+IHtcbiAgICAgICAgICAgICAgICBzdG9yZS5zZXRTZWxlY3Rpb24oeyBzZWN0aW9uSWQ6IHNlY3Rpb24uaWQsIC4uLm5leHRTZWxlY3Rpb24gfSk7XG4gICAgICAgICAgICAgICAgc3RvcmUuc2V0VHJhbnNwb3J0KHtcbiAgICAgICAgICAgICAgICAgIG93bmVyOiAndGltZWxpbmUnLFxuICAgICAgICAgICAgICAgICAgcGxheWluZzogZmFsc2UsXG4gICAgICAgICAgICAgICAgICBzdG9yeVdVOiBzdGFydFdVICsgKE51bWJlcihhdCB8fCAwKSAqIChjb21waWxlZD8udHJhdmVsV1UgfHwgMCkpLFxuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgICBpZiAobGFuZSA9PT0gJ3NlY3Rpb24nKSB7XG4gICAgICAgICAgICAgICAgY29uc3QgaXNTZWxlY3RlZCA9IGluU2VsZWN0ZWRTZWN0aW9uICYmIHNlbGVjdGlvbi50eXBlID09PSAnc2VjdGlvbic7XG4gICAgICAgICAgICAgICAgY29uc3QgcmVzaXplRXh0ZW50ID0gc2VjdGlvblJlc2l6ZVByZXZpZXc/LnNlY3Rpb25JZCA9PT0gc2VjdGlvbi5pZFxuICAgICAgICAgICAgICAgICAgPyBzZWN0aW9uUmVzaXplUHJldmlldy5leHRlbnRcbiAgICAgICAgICAgICAgICAgIDogTnVtYmVyKHNlY3Rpb25bZ2V0QWJvdXROYXJyYXRpdmVFeHRlbnRGaWVsZChzbmFwc2hvdC5wcmV2aWV3UHJvZmlsZSldKTtcbiAgICAgICAgICAgICAgICByZXR1cm4gKFxuICAgICAgICAgICAgICAgICAgPGRpdlxuICAgICAgICAgICAgICAgICAgICBrZXk9e3NlY3Rpb24uaWR9XG4gICAgICAgICAgICAgICAgICAgIGNsYXNzTmFtZT17YGFib3V0LWVkaXRvci1zZWN0aW9uLWNsaXAke2lzU2VsZWN0ZWQgPyAnIGlzLXNlbGVjdGVkJyA6ICcnfSR7aW5TZWxlY3RlZFNlY3Rpb24gPyAnIGlzLWNvbnRleHQnIDogJyd9YH1cbiAgICAgICAgICAgICAgICAgICAgc3R5bGU9e3sgd2lkdGggfX1cbiAgICAgICAgICAgICAgICAgICAgdGl0bGU9e2Ake3NlY3Rpb24ubGFiZWx9IMK3ICR7Zm9ybWF0V1UoY29tcGlsZWQ/LnJlc29sdmVkRXh0ZW50V1UgfHwgc2VjdGlvbi5leHRlbnRXVSl9YH1cbiAgICAgICAgICAgICAgICAgID5cbiAgICAgICAgICAgICAgICAgICAgPGJ1dHRvbiB0eXBlPVwiYnV0dG9uXCIgYXJpYS1wcmVzc2VkPXtpc1NlbGVjdGVkfSBvbkNsaWNrPXsoKSA9PiBzZWxlY3RBdCh7IHR5cGU6ICdzZWN0aW9uJyB9KX0+XG4gICAgICAgICAgICAgICAgICAgICAgPHNwYW4+e1N0cmluZyhzZWN0aW9uSW5kZXggKyAxKS5wYWRTdGFydCgyLCAnMCcpfTwvc3Bhbj57c2VjdGlvbi5sYWJlbH1cbiAgICAgICAgICAgICAgICAgICAgPC9idXR0b24+XG4gICAgICAgICAgICAgICAgICAgIHtzZWN0aW9uUmVzaXplUHJldmlldz8uc2VjdGlvbklkID09PSBzZWN0aW9uLmlkID8gPG91dHB1dD57Zm9ybWF0V1UoTWF0aC5tYXgoMCwgcmVzaXplRXh0ZW50IC0gMSkpfSBzY3JvbGwgwrcge2Zvcm1hdFdVKHJlc2l6ZUV4dGVudCl9IHRvdGFsPC9vdXRwdXQ+IDogbnVsbH1cbiAgICAgICAgICAgICAgICAgICAgPGJ1dHRvblxuICAgICAgICAgICAgICAgICAgICAgIHR5cGU9XCJidXR0b25cIlxuICAgICAgICAgICAgICAgICAgICAgIGNsYXNzTmFtZT1cImFib3V0LWVkaXRvci1zZWN0aW9uLXJlc2l6ZVwiXG4gICAgICAgICAgICAgICAgICAgICAgZGlzYWJsZWQ9e3NlY3Rpb24ubG9ja2VkfVxuICAgICAgICAgICAgICAgICAgICAgIGFyaWEtbGFiZWw9e2BSZXNpemUgJHtzZWN0aW9uLmxhYmVsfWB9XG4gICAgICAgICAgICAgICAgICAgICAgdGl0bGU9e3NlY3Rpb24ubG9ja2VkID8gJ1VubG9jayB0aGlzIHByb3RlY3RlZCBTZWN0aW9uIHRvIHJlc2l6ZSBpdCcgOiBgRHJhZyB0byBjaGFuZ2UgJHtzbmFwc2hvdC5wcmV2aWV3UHJvZmlsZSA9PT0gJ21vYmlsZScgPyAnbW9iaWxlJyA6ICdkZXNrdG9wJ30gc2Nyb2xsIGxlbmd0aCDCtyBkb3VibGUtY2xpY2sgdG8gcmVzdG9yZSBzYXZlZCBsZW5ndGhgfVxuICAgICAgICAgICAgICAgICAgICAgIG9uRG91YmxlQ2xpY2s9eyhldmVudCkgPT4geyBldmVudC5wcmV2ZW50RGVmYXVsdCgpOyBldmVudC5zdG9wUHJvcGFnYXRpb24oKTsgcmVzZXRTZWN0aW9uRXh0ZW50KHNlY3Rpb24uaWQsIHNlY3Rpb25JbmRleCk7IH19XG4gICAgICAgICAgICAgICAgICAgICAgb25Qb2ludGVyRG93bj17KGV2ZW50KSA9PiBiZWdpblNlY3Rpb25SZXNpemUoZXZlbnQsIHsgc2VjdGlvbklkOiBzZWN0aW9uLmlkLCBzZWN0aW9uSW5kZXgsIHNlY3Rpb25MYWJlbDogc2VjdGlvbi5sYWJlbCwgbG9ja2VkOiBzZWN0aW9uLmxvY2tlZCB9KX1cbiAgICAgICAgICAgICAgICAgICAgICBvblBvaW50ZXJNb3ZlPXttb3ZlU2VjdGlvblJlc2l6ZX1cbiAgICAgICAgICAgICAgICAgICAgICBvblBvaW50ZXJVcD17ZW5kU2VjdGlvblJlc2l6ZX1cbiAgICAgICAgICAgICAgICAgICAgICBvblBvaW50ZXJDYW5jZWw9e2VuZFNlY3Rpb25SZXNpemV9XG4gICAgICAgICAgICAgICAgICAgIC8+XG4gICAgICAgICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgICAgICApO1xuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgIGlmIChsYW5lID09PSAnY2FtZXJhJykge1xuICAgICAgICAgICAgICAgIHJldHVybiAoXG4gICAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cImFib3V0LWVkaXRvci1jbGlwXCIga2V5PXtzZWN0aW9uLmlkfSBzdHlsZT17eyB3aWR0aCB9fT5cbiAgICAgICAgICAgICAgICAgICAgPGRpdiBjbGFzc05hbWU9XCJhYm91dC1lZGl0b3ItY2FtZXJhLXJhaWxcIiBhcmlhLWhpZGRlbj1cInRydWVcIj5cbiAgICAgICAgICAgICAgICAgICAgICB7c2VjdGlvbi5jYW1lcmEua2V5cy5zbGljZSgxKS5tYXAoKGtleSwga2V5SW5kZXgpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IGZyb21LZXkgPSBzZWN0aW9uLmNhbWVyYS5rZXlzW2tleUluZGV4XTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IGxlZnQgPSBsb2NhbFBlcmNlbnQoZnJvbUtleS5hdCk7XG4gICAgICAgICAgICAgICAgICAgICAgICBjb25zdCByaWdodCA9IGxvY2FsUGVyY2VudChrZXkuYXQpO1xuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIChcbiAgICAgICAgICAgICAgICAgICAgICAgICAgPHNwYW5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjbGFzc05hbWU9e2NhbWVyYVBvc2VDaGFuZ2VzKGZyb21LZXksIGtleSkgPyAnaXMtYXV0aG9yZWQtbW90aW9uJyA6ICdpcy1iYXNlLWRvbGx5J31cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBrZXk9e2Ake3NlY3Rpb24uaWR9OmNhbWVyYS1zcGFuOiR7a2V5SW5kZXh9YH1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBzdHlsZT17eyBsZWZ0OiBgJHtsZWZ0fSVgLCB3aWR0aDogYCR7TWF0aC5tYXgoMC41LCByaWdodCAtIGxlZnQpfSVgIH19XG4gICAgICAgICAgICAgICAgICAgICAgICAgIC8+XG4gICAgICAgICAgICAgICAgICAgICAgICApO1xuICAgICAgICAgICAgICAgICAgICAgIH0pfVxuICAgICAgICAgICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgICAgICAgICAge3NlY3Rpb24uY2FtZXJhLmtleXMubWFwKChrZXksIGtleUluZGV4KSA9PiB7XG4gICAgICAgICAgICAgICAgICAgICAgY29uc3QgdGltaW5nQm91bmRzID0gZ2V0QWJvdXROYXJyYXRpdmVDYW1lcmFLZXlUaW1pbmdCb3VuZHMoc2VjdGlvbi5jYW1lcmEua2V5cywga2V5SW5kZXgpO1xuICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IHRva2VuID0gYGNhbWVyYToke3NlY3Rpb24uaWR9OiR7a2V5SW5kZXh9YDtcbiAgICAgICAgICAgICAgICAgICAgICBjb25zdCBrZXlTZWxlY3Rpb24gPSB7IHR5cGU6ICdjYW1lcmEta2V5Jywgc2VjdGlvbklkOiBzZWN0aW9uLmlkLCBrZXlJbmRleCB9O1xuICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IGlzU2VsZWN0ZWQgPSBpblNlbGVjdGVkU2VjdGlvbiAmJiBzZWxlY3Rpb24udHlwZSA9PT0gJ2NhbWVyYS1rZXknICYmIHNlbGVjdGlvbi5rZXlJbmRleCA9PT0ga2V5SW5kZXg7XG4gICAgICAgICAgICAgICAgICAgICAgY29uc3QgcmVxdWlyZWQgPSB0aW1pbmdCb3VuZHMubG9ja2VkO1xuICAgICAgICAgICAgICAgICAgICAgIHJldHVybiAoXG4gICAgICAgICAgICAgICAgICAgICAgICA8YnV0dG9uXG4gICAgICAgICAgICAgICAgICAgICAgICAgIHR5cGU9XCJidXR0b25cIlxuICAgICAgICAgICAgICAgICAgICAgICAgICBrZXk9e3Rva2VufVxuICAgICAgICAgICAgICAgICAgICAgICAgICBjbGFzc05hbWU9e2BhYm91dC1lZGl0b3Ita2V5JHtyZXF1aXJlZCA/ICcgaXMtYm91bmRhcnknIDogJyBpcy1kcmFnZ2FibGUnfSR7aXNTZWxlY3RlZCA/ICcgaXMtc2VsZWN0ZWQnIDogJyd9JHtjYW1lcmFEcmFnUHJldmlldz8udG9rZW4gPT09IHRva2VuID8gJyBpcy1kcmFnLXNvdXJjZScgOiAnJ31gfVxuICAgICAgICAgICAgICAgICAgICAgICAgICBzdHlsZT17eyBsZWZ0OiBsb2NhbFBvc2l0aW9uKGtleS5hdCkgfX1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgdGl0bGU9e3JlcXVpcmVkXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgPyBgUHJvdGVjdGVkIENhbWVyYSBrZXkgYXQgJHtmb3JtYXRDYW1lcmFQZXJjZW50KGtleS5hdCl9IMK3IHNlbGVjdCB0byBpbnNwZWN0YFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIDogYENhbWVyYSBrZXkgYXQgJHtmb3JtYXRDYW1lcmFQZXJjZW50KGtleS5hdCl9IMK3IGRyYWcgYW55d2hlcmUgb24gdGhlIENhbWVyYSB0cmFja2B9XG4gICAgICAgICAgICAgICAgICAgICAgICAgIGFyaWEtbGFiZWw9e2Ake3JlcXVpcmVkID8gJ1Byb3RlY3RlZCAnIDogJyd9Q2FtZXJhIGtleSBhdCAke2Zvcm1hdENhbWVyYVBlcmNlbnQoa2V5LmF0KX0gdGhyb3VnaCAke3NlY3Rpb24ubGFiZWx9YH1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgYXJpYS1wcmVzc2VkPXtpc1NlbGVjdGVkfVxuICAgICAgICAgICAgICAgICAgICAgICAgICBvblBvaW50ZXJEb3duPXtyZXF1aXJlZCA/IHVuZGVmaW5lZCA6IChldmVudCkgPT4gYmVnaW5UaW1pbmdEcmFnKGV2ZW50LCB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdHlwZTogJ2NhbWVyYScsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdG9rZW4sXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgbG9ja2VkOiBmYWxzZSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBhdDoga2V5LmF0LFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHNlY3Rpb25JbmRleCxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBrZXlJbmRleCxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBzZWN0aW9uU3RhcnRXVTogc3RhcnRXVSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBzcGFuV1UsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdHJhdmVsV1U6IGNvbXBpbGVkPy50cmF2ZWxXVSB8fCBzcGFuV1UsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgc3RvcnlXVTogc3RhcnRXVSArIChOdW1iZXIoa2V5LmF0KSAqIChjb21waWxlZD8udHJhdmVsV1UgfHwgMCkpLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHNlbGVjdGlvbjoga2V5U2VsZWN0aW9uLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvYWxlc2NlS2V5OiBgdGltZWxpbmU6JHt0b2tlbn1gLFxuICAgICAgICAgICAgICAgICAgICAgICAgICB9KX1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgb25Qb2ludGVyTW92ZT17cmVxdWlyZWQgPyB1bmRlZmluZWQgOiBtb3ZlVGltaW5nRHJhZ31cbiAgICAgICAgICAgICAgICAgICAgICAgICAgb25Qb2ludGVyVXA9e3JlcXVpcmVkID8gdW5kZWZpbmVkIDogZW5kVGltaW5nRHJhZ31cbiAgICAgICAgICAgICAgICAgICAgICAgICAgb25Qb2ludGVyQ2FuY2VsPXtyZXF1aXJlZCA/IHVuZGVmaW5lZCA6IGVuZFRpbWluZ0RyYWd9XG4gICAgICAgICAgICAgICAgICAgICAgICAgIG9uQ2xpY2s9eygpID0+IGhhbmRsZVRpbWluZ0NsaWNrKHRva2VuLCAoKSA9PiBzZWxlY3RBdCh7IHR5cGU6ICdjYW1lcmEta2V5Jywga2V5SW5kZXggfSwga2V5LmF0KSl9XG4gICAgICAgICAgICAgICAgICAgICAgICAvPlxuICAgICAgICAgICAgICAgICAgICAgICk7XG4gICAgICAgICAgICAgICAgICAgIH0pfVxuICAgICAgICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgICAgICAgKTtcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICBpZiAobGFuZSA9PT0gJ3dvcmxkJykge1xuICAgICAgICAgICAgICAgIGNvbnN0IGlzU2VsZWN0ZWQgPSBpblNlbGVjdGVkU2VjdGlvbiAmJiBzZWxlY3Rpb24udHlwZSA9PT0gJ3dvcmxkJztcbiAgICAgICAgICAgICAgICBjb25zdCB0cmFuc2l0aW9uID0gc2VjdGlvbi53b3JsZC5tb2RlID09PSAnc2V0JyAmJiBzZWN0aW9uLndvcmxkLnRyYW5zaXRpb25Jbi50eXBlICE9PSAnY3V0J1xuICAgICAgICAgICAgICAgICAgPyBzZWN0aW9uLndvcmxkLnRyYW5zaXRpb25JblxuICAgICAgICAgICAgICAgICAgOiBudWxsO1xuICAgICAgICAgICAgICAgIHJldHVybiAoXG4gICAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzTmFtZT17YGFib3V0LWVkaXRvci1jbGlwJHtpc1NlbGVjdGVkID8gJyBpcy1zZWxlY3RlZCcgOiAnJ31gfSBrZXk9e3NlY3Rpb24uaWR9IHN0eWxlPXt7IHdpZHRoIH19PlxuICAgICAgICAgICAgICAgICAgICA8YnV0dG9uXG4gICAgICAgICAgICAgICAgICAgICAgdHlwZT1cImJ1dHRvblwiXG4gICAgICAgICAgICAgICAgICAgICAgY2xhc3NOYW1lPXtgYWJvdXQtZWRpdG9yLXdvcmxkLWNsaXAgJHtzZWN0aW9uLndvcmxkLm1vZGUgPT09ICdzZXQnID8gJ2hhcy13b3JsZCcgOiAnJ30ke2lzU2VsZWN0ZWQgPyAnIGlzLXNlbGVjdGVkJyA6ICcnfWB9XG4gICAgICAgICAgICAgICAgICAgICAgYXJpYS1wcmVzc2VkPXtpc1NlbGVjdGVkfVxuICAgICAgICAgICAgICAgICAgICAgIG9uQ2xpY2s9eygpID0+IHNlbGVjdEF0KHsgdHlwZTogJ3dvcmxkJyB9LCB0cmFuc2l0aW9uID8gdHJhbnNpdGlvbi5lbmQgOiAwKX1cbiAgICAgICAgICAgICAgICAgICAgPntzZWN0aW9uLndvcmxkLm1vZGUgPT09ICdzZXQnID8gc2VjdGlvbi53b3JsZC5zaGFwZUlkLnJlcGxhY2UoJy12MScsICcnKSA6ICdjb250aW51ZSd9PC9idXR0b24+XG4gICAgICAgICAgICAgICAgICAgIHt0cmFuc2l0aW9uID8gWydzdGFydCcsICdlbmQnXS5tYXAoKHBhcnQpID0+IChcbiAgICAgICAgICAgICAgICAgICAgICA8YnV0dG9uXG4gICAgICAgICAgICAgICAgICAgICAgICB0eXBlPVwiYnV0dG9uXCJcbiAgICAgICAgICAgICAgICAgICAgICAgIGtleT17cGFydH1cbiAgICAgICAgICAgICAgICAgICAgICAgIGNsYXNzTmFtZT17YGFib3V0LWVkaXRvci10aW1pbmcta2V5IGlzLXdvcmxkJHtpc1NlbGVjdGVkICYmIHNlbGVjdGlvbi5rZXlQYXJ0ID09PSBgdHJhbnNpdGlvbi0ke3BhcnR9YCA/ICcgaXMtc2VsZWN0ZWQnIDogJyd9YH1cbiAgICAgICAgICAgICAgICAgICAgICAgIHN0eWxlPXt7IGxlZnQ6IGV4dGVuZGVkTG9jYWxQb3NpdGlvbih0cmFuc2l0aW9uW3BhcnRdKSB9fVxuICAgICAgICAgICAgICAgICAgICAgICAgdGl0bGU9e2BXb3JsZCB0cmFuc2l0aW9uICR7cGFydH1gfVxuICAgICAgICAgICAgICAgICAgICAgICAgYXJpYS1sYWJlbD17YCR7c2VjdGlvbi5sYWJlbH0gV29ybGQgdHJhbnNpdGlvbiAke3BhcnR9YH1cbiAgICAgICAgICAgICAgICAgICAgICAgIG9uQ2xpY2s9eygpID0+IHNlbGVjdEF0KHsgdHlwZTogJ3dvcmxkJywga2V5UGFydDogYHRyYW5zaXRpb24tJHtwYXJ0fWAgfSwgdHJhbnNpdGlvbltwYXJ0XSl9XG4gICAgICAgICAgICAgICAgICAgICAgLz5cbiAgICAgICAgICAgICAgICAgICAgKSkgOiBudWxsfVxuICAgICAgICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgICAgICAgKTtcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICBpZiAobGFuZSA9PT0gJ3RleHQnKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIChcbiAgICAgICAgICAgICAgICAgIDxkaXZcbiAgICAgICAgICAgICAgICAgICAgY2xhc3NOYW1lPXtgYWJvdXQtZWRpdG9yLWNsaXAke3NlY3Rpb24udGV4dC5kaXNjaXBsaW5lUmV2ZWFsID8gJyBoYXMtZXh0ZW5kZWQtZGlzY2lwbGluZScgOiAnJ31gfVxuICAgICAgICAgICAgICAgICAgICBrZXk9e3NlY3Rpb24uaWR9XG4gICAgICAgICAgICAgICAgICAgIHN0eWxlPXt7IHdpZHRoIH19XG4gICAgICAgICAgICAgICAgICAgIG9uUG9pbnRlckRvd249e2JlZ2luTWFycXVlZX1cbiAgICAgICAgICAgICAgICAgICAgb25Qb2ludGVyTW92ZT17bW92ZU1hcnF1ZWV9XG4gICAgICAgICAgICAgICAgICAgIG9uUG9pbnRlclVwPXtlbmRNYXJxdWVlfVxuICAgICAgICAgICAgICAgICAgICBvblBvaW50ZXJDYW5jZWw9e2VuZE1hcnF1ZWV9XG4gICAgICAgICAgICAgICAgICA+XG4gICAgICAgICAgICAgICAgICAgIHsoc2VjdGlvbi50ZXh0LmN1ZXMgfHwgW10pLm1hcCgoY3VlKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgICAgY29uc3QgaXNTZWxlY3RlZCA9IHNlbGVjdGVkQ3VlTWVtYmVycy5zb21lKChtZW1iZXIpID0+IG1lbWJlci5zZWN0aW9uSWQgPT09IHNlY3Rpb24uaWQgJiYgbWVtYmVyLmN1ZUlkID09PSBjdWUuaWQpO1xuICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IGlzUHJpbWFyeSA9IHNlbGVjdGlvbi50eXBlID09PSAnY3VlJyAmJiBzZWxlY3Rpb24uc2VjdGlvbklkID09PSBzZWN0aW9uLmlkICYmIHNlbGVjdGlvbi5jdWVJZCA9PT0gY3VlLmlkO1xuICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IG1vdmVtZW50ID0gZ2V0QWJvdXROYXJyYXRpdmVDdWVNb3ZlbWVudChjdWUpO1xuICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IHRpbWluZ0JvdW5kcyA9IGdldEFib3V0TmFycmF0aXZlQ3VlVGltaW5nQm91bmRzKGN1ZSk7XG4gICAgICAgICAgICAgICAgICAgICAgY29uc3QgdG9rZW4gPSBgY3VlOiR7c2VjdGlvbi5pZH06JHtjdWUuaWR9YDtcbiAgICAgICAgICAgICAgICAgICAgICBjb25zdCBjdWVTZWxlY3Rpb24gPSB7IHR5cGU6ICdjdWUnLCBzZWN0aW9uSWQ6IHNlY3Rpb24uaWQsIGN1ZUlkOiBjdWUuaWQsIGtleVBhcnQ6ICdmb2N1cycgfTtcbiAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gKFxuICAgICAgICAgICAgICAgICAgICAgICAgPGJ1dHRvblxuICAgICAgICAgICAgICAgICAgICAgICAgICB0eXBlPVwiYnV0dG9uXCJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgY2xhc3NOYW1lPXtgYWJvdXQtZWRpdG9yLWN1ZSBpcy0ke21vdmVtZW50fSR7dGltaW5nQm91bmRzLm1pbiA9PT0gdGltaW5nQm91bmRzLm1heCA/ICcgaXMtYm91bmRhcnknIDogJyBpcy1kcmFnZ2FibGUnfSR7aXNTZWxlY3RlZCA/ICcgaXMtc2VsZWN0ZWQnIDogJyd9JHtpc1ByaW1hcnkgPyAnIGlzLXByaW1hcnktc2VsZWN0aW9uJyA6ICcnfWB9XG4gICAgICAgICAgICAgICAgICAgICAgICAgIGtleT17Y3VlLmlkfVxuICAgICAgICAgICAgICAgICAgICAgICAgICBkYXRhLXNlY3Rpb24taWQ9e3NlY3Rpb24uaWR9XG4gICAgICAgICAgICAgICAgICAgICAgICAgIGRhdGEtY3VlLWlkPXtjdWUuaWR9XG4gICAgICAgICAgICAgICAgICAgICAgICAgIHN0eWxlPXt7IGxlZnQ6IHRleHRQb3NpdGlvbihjdWUuaG9sZCkgfX1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgYXJpYS1sYWJlbD17YCR7bW92ZW1lbnQgPT09ICd2ZXJ0aWNhbCcgPyAnVmVydGljYWwnIDogJ1NwYXRpYWwnfSB0ZXh0IGF0ICR7TWF0aC5yb3VuZChjdWUuaG9sZCAqIDEwMCl9JSDCtyAke2N1ZS50ZXh0fWB9XG4gICAgICAgICAgICAgICAgICAgICAgICAgIGFyaWEtcHJlc3NlZD17aXNTZWxlY3RlZH1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgdGl0bGU9e2Ake21vdmVtZW50ID09PSAndmVydGljYWwnID8gJ1ZlcnRpY2FsJyA6ICdTcGF0aWFsJ30gdGl0bGUgwrcgZHJhZyB0byBtb3ZlIGl0OyBkdXJhdGlvbiBzdGF5cyBnbG9iYWwgwrcgJHtjdWUudGV4dH1gfVxuICAgICAgICAgICAgICAgICAgICAgICAgICBvblBvaW50ZXJEb3duPXsoZXZlbnQpID0+IGJlZ2luVGltaW5nRHJhZyhldmVudCwge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHR5cGU6ICdjdWUnLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRva2VuLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGxvY2tlZDogdGltaW5nQm91bmRzLm1pbiA9PT0gdGltaW5nQm91bmRzLm1heCxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBtaW46IHRpbWluZ0JvdW5kcy5taW4sXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgbWF4OiB0aW1pbmdCb3VuZHMubWF4LFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGF0OiBjdWUuaG9sZCxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBzZWN0aW9uSW5kZXgsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY3VlSWQ6IGN1ZS5pZCxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBzZWN0aW9uU3RhcnRXVTogc3RhcnRXVSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBzcGFuV1UsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdHJhdmVsV1U6IGNvbXBpbGVkPy50cmF2ZWxXVSB8fCBzcGFuV1UsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgc3RvcnlXVTogc3RhcnRXVSArIChOdW1iZXIoY3VlLmhvbGQpICogKGNvbXBpbGVkPy50cmF2ZWxXVSB8fCAwKSksXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgc2VsZWN0aW9uOiBjdWVTZWxlY3Rpb24sXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY29hbGVzY2VLZXk6IGB0aW1lbGluZToke3Rva2VufWAsXG4gICAgICAgICAgICAgICAgICAgICAgICAgIH0pfVxuICAgICAgICAgICAgICAgICAgICAgICAgICBvblBvaW50ZXJNb3ZlPXttb3ZlVGltaW5nRHJhZ31cbiAgICAgICAgICAgICAgICAgICAgICAgICAgb25Qb2ludGVyVXA9e2VuZFRpbWluZ0RyYWd9XG4gICAgICAgICAgICAgICAgICAgICAgICAgIG9uUG9pbnRlckNhbmNlbD17ZW5kVGltaW5nRHJhZ31cbiAgICAgICAgICAgICAgICAgICAgICAgICAgb25LZXlEb3duPXsoZXZlbnQpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoZXZlbnQuc2hpZnRLZXkgJiYgZXZlbnQuY29kZSA9PT0gJ1NwYWNlJykge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZXZlbnQucHJldmVudERlZmF1bHQoKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IG5leHRTZWxlY3Rpb24gPSB0b2dnbGVBYm91dE5hcnJhdGl2ZUN1ZVNlbGVjdGlvbihzdG9yZS5nZXRTbmFwc2hvdCgpLnNlbGVjdGlvbiwgY3VlU2VsZWN0aW9uKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHN0b3JlLnNldFNlbGVjdGlvbihuZXh0U2VsZWN0aW9uKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHN0b3JlLnNldFRyYW5zcG9ydCh7IG93bmVyOiAndGltZWxpbmUnLCBwbGF5aW5nOiBmYWxzZSwgc3RvcnlXVTogc3RhcnRXVSArIChOdW1iZXIoY3VlLmhvbGQpICogKGNvbXBpbGVkPy50cmF2ZWxXVSB8fCAwKSkgfSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgICB9fVxuICAgICAgICAgICAgICAgICAgICAgICAgICBvbkNsaWNrPXsoKSA9PiBoYW5kbGVUaW1pbmdDbGljayh0b2tlbiwgKCkgPT4ge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHN0b3JlLnNldFRyYW5zcG9ydCh7IG93bmVyOiAndGltZWxpbmUnLCBwbGF5aW5nOiBmYWxzZSwgc3RvcnlXVTogc3RhcnRXVSArIChOdW1iZXIoY3VlLmhvbGQpICogKGNvbXBpbGVkPy50cmF2ZWxXVSB8fCAwKSkgfSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgIH0pfVxuICAgICAgICAgICAgICAgICAgICAgICAgLz5cbiAgICAgICAgICAgICAgICAgICAgICApO1xuICAgICAgICAgICAgICAgICAgICB9KX1cbiAgICAgICAgICAgICAgICAgICAge3NlY3Rpb24udGV4dC5kaXNjaXBsaW5lUmV2ZWFsID8gKCgpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgICBjb25zdCByZXZlYWwgPSBzZWN0aW9uLnRleHQuZGlzY2lwbGluZVJldmVhbDtcbiAgICAgICAgICAgICAgICAgICAgICBjb25zdCBkdXJhdGlvbiA9IHJldmVhbC5lbmQgLSByZXZlYWwuc3RhcnQ7XG4gICAgICAgICAgICAgICAgICAgICAgY29uc3QgY2VudHJlID0gcmV2ZWFsLnN0YXJ0ICsgKGR1cmF0aW9uICogMC41KTtcbiAgICAgICAgICAgICAgICAgICAgICBjb25zdCBpc1NlbGVjdGVkID0gaW5TZWxlY3RlZFNlY3Rpb24gJiYgc2VsZWN0aW9uLnR5cGUgPT09ICdkaXNjaXBsaW5lLXJldmVhbCc7XG4gICAgICAgICAgICAgICAgICAgICAgY29uc3QgdG9rZW4gPSBgZGlzY2lwbGluZS1yZXZlYWw6JHtzZWN0aW9uLmlkfToke3JldmVhbC5pZH1gO1xuICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IHJldmVhbFNlbGVjdGlvbiA9IHsgdHlwZTogJ2Rpc2NpcGxpbmUtcmV2ZWFsJywgc2VjdGlvbklkOiBzZWN0aW9uLmlkIH07XG4gICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIChcbiAgICAgICAgICAgICAgICAgICAgICAgIDxidXR0b25cbiAgICAgICAgICAgICAgICAgICAgICAgICAgdHlwZT1cImJ1dHRvblwiXG4gICAgICAgICAgICAgICAgICAgICAgICAgIGNsYXNzTmFtZT17YGFib3V0LWVkaXRvci1kaXNjaXBsaW5lLXJldmVhbCBpcy1kcmFnZ2FibGUke2lzU2VsZWN0ZWQgPyAnIGlzLXNlbGVjdGVkJyA6ICcnfWB9XG4gICAgICAgICAgICAgICAgICAgICAgICAgIHN0eWxlPXt7IGxlZnQ6IGV4dGVuZGVkTG9jYWxQb3NpdGlvbihyZXZlYWwuc3RhcnQpLCB3aWR0aDogZXh0ZW5kZWRMb2NhbFdpZHRoKHJldmVhbC5zdGFydCwgcmV2ZWFsLmVuZCkgfX1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgYXJpYS1sYWJlbD17YERpc2NpcGxpbmUgcmV2ZWFsIGZyb20gJHtNYXRoLnJvdW5kKHJldmVhbC5zdGFydCAqIDEwMCl9JSB0byAke01hdGgucm91bmQocmV2ZWFsLmVuZCAqIDEwMCl9JWB9XG4gICAgICAgICAgICAgICAgICAgICAgICAgIGFyaWEtcHJlc3NlZD17aXNTZWxlY3RlZH1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgdGl0bGU9XCJEaXNjaXBsaW5lIHJldmVhbCDCtyBkcmFnIHRoZSBjb21wbGV0ZSBjbGlwIHRvIHJldGltZVwiXG4gICAgICAgICAgICAgICAgICAgICAgICAgIG9uUG9pbnRlckRvd249eyhldmVudCkgPT4gYmVnaW5UaW1pbmdEcmFnKGV2ZW50LCB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdHlwZTogJ2Rpc2NpcGxpbmUtcmV2ZWFsJyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0b2tlbixcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBsb2NrZWQ6IGZhbHNlLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIG1pbjogZHVyYXRpb24gKiAwLjUsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgbWF4OiBESVNDSVBMSU5FX1JFVkVBTF9NQVggLSAoZHVyYXRpb24gKiAwLjUpLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGF0OiBjZW50cmUsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgc2VjdGlvbkluZGV4LFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHNlY3Rpb25TdGFydFdVOiBzdGFydFdVLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHNwYW5XVSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0cmF2ZWxXVTogY29tcGlsZWQ/LnRyYXZlbFdVIHx8IHNwYW5XVSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBzdG9yeVdVOiBzdGFydFdVICsgKGNlbnRyZSAqIChjb21waWxlZD8udHJhdmVsV1UgfHwgMCkpLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHNlbGVjdGlvbjogcmV2ZWFsU2VsZWN0aW9uLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvYWxlc2NlS2V5OiBgdGltZWxpbmU6JHt0b2tlbn1gLFxuICAgICAgICAgICAgICAgICAgICAgICAgICB9KX1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgb25Qb2ludGVyTW92ZT17bW92ZVRpbWluZ0RyYWd9XG4gICAgICAgICAgICAgICAgICAgICAgICAgIG9uUG9pbnRlclVwPXtlbmRUaW1pbmdEcmFnfVxuICAgICAgICAgICAgICAgICAgICAgICAgICBvblBvaW50ZXJDYW5jZWw9e2VuZFRpbWluZ0RyYWd9XG4gICAgICAgICAgICAgICAgICAgICAgICAgIG9uQ2xpY2s9eygpID0+IGhhbmRsZVRpbWluZ0NsaWNrKHRva2VuLCAoKSA9PiBzZWxlY3RBdCh7IHR5cGU6ICdkaXNjaXBsaW5lLXJldmVhbCcgfSwgcmV2ZWFsLnN0YXJ0KSl9XG4gICAgICAgICAgICAgICAgICAgICAgICA+RGlzY2lwbGluZSByZXZlYWw8L2J1dHRvbj5cbiAgICAgICAgICAgICAgICAgICAgICApO1xuICAgICAgICAgICAgICAgICAgICB9KSgpIDogbnVsbH1cbiAgICAgICAgICAgICAgICAgICAgeyhzZWN0aW9uLnRleHQuYmxvY2tzIHx8IFtdKS5sZW5ndGggPyAoXG4gICAgICAgICAgICAgICAgICAgICAgPGJ1dHRvbiB0eXBlPVwiYnV0dG9uXCIgY2xhc3NOYW1lPXtgYWJvdXQtZWRpdG9yLWVkaXRvcmlhbC1jbGlwJHtpblNlbGVjdGVkU2VjdGlvbiAmJiBzZWxlY3Rpb24udHlwZSA9PT0gJ3NlY3Rpb24nID8gJyBpcy1zZWxlY3RlZCcgOiAnJ31gfSBvbkNsaWNrPXsoKSA9PiBzZWxlY3RBdCh7IHR5cGU6ICdzZWN0aW9uJyB9KX0+XG4gICAgICAgICAgICAgICAgICAgICAgICBWZXJ0aWNhbCDCtyB7c2VjdGlvbi50ZXh0LmJsb2Nrcy5sZW5ndGh9IGJsb2Nrc1xuICAgICAgICAgICAgICAgICAgICAgIDwvYnV0dG9uPlxuICAgICAgICAgICAgICAgICAgICApIDogbnVsbH1cbiAgICAgICAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgICAgICk7XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgY29uc3QgaXNTZWxlY3RlZCA9IGluU2VsZWN0ZWRTZWN0aW9uICYmIHNlbGVjdGlvbi50eXBlID09PSAnaW50ZXJhY3Rpb24nO1xuICAgICAgICAgICAgICBjb25zdCBhY3RpdmF0aW9uID0gc2VjdGlvbi5pbnRlcmFjdGlvbj8udHlwZSAhPT0gJ25vbmUnID8gc2VjdGlvbi5pbnRlcmFjdGlvbi5hY3RpdmF0aW9uU3RhcnQgOiBudWxsO1xuICAgICAgICAgICAgICByZXR1cm4gKFxuICAgICAgICAgICAgICAgIDxkaXYgY2xhc3NOYW1lPXtgYWJvdXQtZWRpdG9yLWNsaXAke2lzU2VsZWN0ZWQgPyAnIGlzLXNlbGVjdGVkJyA6ICcnfWB9IGtleT17c2VjdGlvbi5pZH0gc3R5bGU9e3sgd2lkdGggfX0+XG4gICAgICAgICAgICAgICAgICA8YnV0dG9uXG4gICAgICAgICAgICAgICAgICAgIHR5cGU9XCJidXR0b25cIlxuICAgICAgICAgICAgICAgICAgICBjbGFzc05hbWU9e2BhYm91dC1lZGl0b3ItaW50ZXJhY3Rpb24tY2xpcCAke3NlY3Rpb24uaW50ZXJhY3Rpb24/LnR5cGUgIT09ICdub25lJyA/ICdoYXMtaW50ZXJhY3Rpb24nIDogJyd9JHtpc1NlbGVjdGVkID8gJyBpcy1zZWxlY3RlZCcgOiAnJ31gfVxuICAgICAgICAgICAgICAgICAgICBhcmlhLXByZXNzZWQ9e2lzU2VsZWN0ZWR9XG4gICAgICAgICAgICAgICAgICAgIG9uQ2xpY2s9eygpID0+IHNlbGVjdEF0KHsgdHlwZTogJ2ludGVyYWN0aW9uJyB9LCBhY3RpdmF0aW9uIHx8IDApfVxuICAgICAgICAgICAgICAgICAgPntzZWN0aW9uLmludGVyYWN0aW9uPy50eXBlICE9PSAnbm9uZScgPyBzZWN0aW9uLmludGVyYWN0aW9uLnR5cGUgOiAnJ308L2J1dHRvbj5cbiAgICAgICAgICAgICAgICAgIHtOdW1iZXIuaXNGaW5pdGUoYWN0aXZhdGlvbikgPyAoXG4gICAgICAgICAgICAgICAgICAgIDxidXR0b25cbiAgICAgICAgICAgICAgICAgICAgICB0eXBlPVwiYnV0dG9uXCJcbiAgICAgICAgICAgICAgICAgICAgICBjbGFzc05hbWU9e2BhYm91dC1lZGl0b3ItdGltaW5nLWtleSBpcy1pbnRlcmFjdGlvbiR7aXNTZWxlY3RlZCAmJiBzZWxlY3Rpb24ua2V5UGFydCA9PT0gJ2FjdGl2YXRpb24nID8gJyBpcy1zZWxlY3RlZCcgOiAnJ31gfVxuICAgICAgICAgICAgICAgICAgICAgIHN0eWxlPXt7IGxlZnQ6IGxvY2FsUG9zaXRpb24oYWN0aXZhdGlvbikgfX1cbiAgICAgICAgICAgICAgICAgICAgICB0aXRsZT1cIkludGVyYWN0aW9uIGFjdGl2YXRpb25cIlxuICAgICAgICAgICAgICAgICAgICAgIGFyaWEtbGFiZWw9e2Ake3NlY3Rpb24ubGFiZWx9IGludGVyYWN0aW9uIGFjdGl2YXRpb24ga2V5ZnJhbWVgfVxuICAgICAgICAgICAgICAgICAgICAgIG9uQ2xpY2s9eygpID0+IHNlbGVjdEF0KHsgdHlwZTogJ2ludGVyYWN0aW9uJywga2V5UGFydDogJ2FjdGl2YXRpb24nIH0sIGFjdGl2YXRpb24pfVxuICAgICAgICAgICAgICAgICAgICAvPlxuICAgICAgICAgICAgICAgICAgKSA6IG51bGx9XG4gICAgICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgICAgICk7XG4gICAgICAgICAgICB9KX1cbiAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICApKX1cbiAgICAgICAgPC9kaXY+XG4gICAgICA8L2Rpdj5cbiAgICA8L2Rpdj5cbiAgKTtcbn1cblxuZnVuY3Rpb24gU2VxdWVuY2VJbnNwZWN0b3IoeyBzdG9yZSwgc25hcHNob3QgfSkge1xuICBjb25zdCBjb21taXRHbG9iYWwgPSAoZ3JvdXAsIGtleSwgdmFsdWUpID0+IHN0b3JlLmNvbW1pdChgQ2hhbmdlICR7a2V5fWAsIChkcmFmdCkgPT4ge1xuICAgIGlmIChncm91cCA9PT0gJ3NlcXVlbmNlJykgZHJhZnQuZ2xvYmFsc1trZXldID0gdmFsdWU7XG4gICAgZWxzZSB7XG4gICAgICBjb25zdCB0YXJnZXRLZXkgPSBncm91cCA9PT0gJ21hdGVyaWFsJyA/ICdwb2ludE1hdGVyaWFsJyA6IGdyb3VwO1xuICAgICAgZHJhZnQuZ2xvYmFsc1t0YXJnZXRLZXldW2tleV0gPSB2YWx1ZTtcbiAgICB9XG4gIH0sIHsgY29hbGVzY2VLZXk6IGBnbG9iYWw6JHtncm91cH06JHtrZXl9YCB9KTtcbiAgcmV0dXJuIChcbiAgICA8PlxuICAgICAgPGhlYWRlcj48c3Bhbj5TZXF1ZW5jZTwvc3Bhbj48c3Ryb25nPkdsb2JhbCBjb250cm9sczwvc3Ryb25nPjwvaGVhZGVyPlxuICAgICAge0FCT1VUX05BUlJBVElWRV9HTE9CQUxfQ09OVFJPTFMubWFwKChncm91cCkgPT4gKFxuICAgICAgICA8ZGV0YWlscyBvcGVuIGtleT17Z3JvdXAuaWR9PlxuICAgICAgICAgIDxzdW1tYXJ5Pntncm91cC5sYWJlbH08L3N1bW1hcnk+XG4gICAgICAgICAge2dyb3VwLmlkID09PSAndGV4dE1vdGlvbicgPyA8cCBjbGFzc05hbWU9XCJhYm91dC1lZGl0b3ItaGVscFwiPkV2ZXJ5IHRpdGxlIGZvbGxvd3MgdGhpcyBwYXRoIGNvbnRpbnVvdXNseS4gTmVnYXRpdmUgWSBpcyBoaWdoZXIsIHBvc2l0aXZlIFkgaXMgbG93ZXIuIFRoZSBvcGVuZXIgc3RhcnRzIHNoYXJwIGF0IGl0cyBvd24gWSBwb3NpdGlvbjsgQ2xlYXIgZnJvbSBhbmQgQ2xlYXIgdW50aWwgc2V0IHRoZSBzaGFycCB3aW5kb3cgZm9yIGxhdGVyIHRpdGxlcy48L3A+IDogbnVsbH1cbiAgICAgICAgICB7Z3JvdXAuaWQgPT09ICdzd2FybVR1cmJ1bGVuY2UnID8gPHAgY2xhc3NOYW1lPVwiYWJvdXQtZWRpdG9yLWhlbHBcIj5PbmUgYW1iaWVudCBtb3Rpb24gcHJvZmlsZSBkcml2ZXMgYm90aCB0aGUgY2x1c3RlciBhbmQgdHVyYnVsZW50IGZpZWxkLiBFYWNoIFdvcmxkIG9ubHkgc2NhbGVzIGl0cyBzdHJlbmd0aCwgc28gdGhlIG1vdGlvbiBzdGF5cyBjb250aW51b3VzIHdoaWxlIFNoYXBlcyBjaGFuZ2UuPC9wPiA6IG51bGx9XG4gICAgICAgICAge2dyb3VwLmNvbnRyb2xzLm1hcCgoY29udHJvbCkgPT4ge1xuICAgICAgICAgICAgY29uc3QgdGFyZ2V0ID0gZ3JvdXAuaWQgPT09ICdzZXF1ZW5jZSdcbiAgICAgICAgICAgICAgPyBzbmFwc2hvdC5kb2N1bWVudC5nbG9iYWxzXG4gICAgICAgICAgICAgIDogc25hcHNob3QuZG9jdW1lbnQuZ2xvYmFsc1tncm91cC5pZCA9PT0gJ21hdGVyaWFsJyA/ICdwb2ludE1hdGVyaWFsJyA6IGdyb3VwLmlkXTtcbiAgICAgICAgICAgIHJldHVybiAoXG4gICAgICAgICAgICAgIDxOdW1iZXJQcm9wZXJ0eVxuICAgICAgICAgICAgICAgIGtleT17Y29udHJvbC5pZH1cbiAgICAgICAgICAgICAgICBsYWJlbD17Y29udHJvbC5sYWJlbH1cbiAgICAgICAgICAgICAgICB2YWx1ZT17dGFyZ2V0W2NvbnRyb2wuaWRdfVxuICAgICAgICAgICAgICAgIG1pbj17Y29udHJvbC5taW59XG4gICAgICAgICAgICAgICAgbWF4PXtjb250cm9sLm1heH1cbiAgICAgICAgICAgICAgICBzdGVwPXtjb250cm9sLnN0ZXB9XG4gICAgICAgICAgICAgICAgdW5pdD17Y29udHJvbC51bml0fVxuICAgICAgICAgICAgICAgIG9uQ2hhbmdlPXsodmFsdWUpID0+IGNvbW1pdEdsb2JhbChncm91cC5pZCwgY29udHJvbC5pZCwgdmFsdWUpfVxuICAgICAgICAgICAgICAvPlxuICAgICAgICAgICAgKTtcbiAgICAgICAgICB9KX1cbiAgICAgICAgPC9kZXRhaWxzPlxuICAgICAgKSl9XG4gICAgPC8+XG4gICk7XG59XG5cbmZ1bmN0aW9uIFNlY3Rpb25JbnNwZWN0b3IoeyBzdG9yZSwgc25hcHNob3QsIHNlY3Rpb24gfSkge1xuICBjb25zdCBzZWN0aW9uSW5kZXggPSBnZXRTZWN0aW9uSW5kZXgoc25hcHNob3QuZG9jdW1lbnQsIHNlY3Rpb24uaWQpO1xuICBjb25zdCBjb21waWxlZFNlY3Rpb24gPSBzbmFwc2hvdC5jb21waWxlZFBsYW4/LnNlY3Rpb25zPy5bc2VjdGlvbkluZGV4XTtcbiAgY29uc3QgYWN0aXZlRXh0ZW50RmllbGQgPSBzbmFwc2hvdC5wcmV2aWV3UHJvZmlsZSA9PT0gJ21vYmlsZScgPyAnbW9iaWxlRXh0ZW50V1UnIDogJ2V4dGVudFdVJztcbiAgY29uc3QgYWN0aXZlRXh0ZW50ID0gTnVtYmVyKHNlY3Rpb25bYWN0aXZlRXh0ZW50RmllbGRdKTtcbiAgY29uc3QgcmVzb2x2ZWRFeHRlbnQgPSBOdW1iZXIoY29tcGlsZWRTZWN0aW9uPy5yZXNvbHZlZEV4dGVudFdVID8/IGFjdGl2ZUV4dGVudCk7XG4gIGNvbnN0IGNvbnRlbnRNaW5pbXVtQWN0aXZlID0gcmVzb2x2ZWRFeHRlbnQgPiBhY3RpdmVFeHRlbnQgKyAwLjAwMTtcbiAgY29uc3QgYmFzZWxpbmVTZWN0aW9uID0gc25hcHNob3QuYmFzZWxpbmVEb2N1bWVudC5zZWN0aW9ucy5maW5kKChpdGVtKSA9PiBpdGVtLmlkID09PSBzZWN0aW9uLmlkKTtcbiAgY29uc3QgdXBkYXRlID0gKGxhYmVsLCBtdXRhdGUsIGNvYWxlc2NlS2V5ID0gbnVsbCkgPT4gc3RvcmUuY29tbWl0KGxhYmVsLCAoZHJhZnQpID0+IHtcbiAgICBtdXRhdGUoZHJhZnQuc2VjdGlvbnNbc2VjdGlvbkluZGV4XSk7XG4gIH0sIHsgY29hbGVzY2VLZXksIHNlbGVjdGlvbjogc25hcHNob3Quc2VsZWN0aW9uIH0pO1xuICBjb25zdCBtb3ZlID0gKGRpcmVjdGlvbikgPT4gc3RvcmUuY29tbWl0KCdSZW9yZGVyIFNlY3Rpb24nLCAoZHJhZnQpID0+IHtcbiAgICBjb25zdCB0b0luZGV4ID0gc2VjdGlvbkluZGV4ICsgZGlyZWN0aW9uO1xuICAgIGlmICh0b0luZGV4IDwgMCB8fCB0b0luZGV4ID49IGRyYWZ0LnNlY3Rpb25zLmxlbmd0aCkgcmV0dXJuO1xuICAgIGNvbnN0IFttb3ZlZF0gPSBkcmFmdC5zZWN0aW9ucy5zcGxpY2Uoc2VjdGlvbkluZGV4LCAxKTtcbiAgICBkcmFmdC5zZWN0aW9ucy5zcGxpY2UodG9JbmRleCwgMCwgbW92ZWQpO1xuICAgIHN0aXRjaENhbWVyYUJvdW5kYXJpZXMoZHJhZnQpO1xuICB9LCB7IHNlbGVjdGlvbjogeyB0eXBlOiAnc2VjdGlvbicsIHNlY3Rpb25JZDogc2VjdGlvbi5pZCB9IH0pO1xuXG4gIHJldHVybiAoXG4gICAgPD5cbiAgICAgIDxoZWFkZXI+PHNwYW4+U2VjdGlvbiB7U3RyaW5nKHNlY3Rpb25JbmRleCArIDEpLnBhZFN0YXJ0KDIsICcwJyl9PC9zcGFuPjxzdHJvbmc+e3NlY3Rpb24ubGFiZWx9PC9zdHJvbmc+PC9oZWFkZXI+XG4gICAgICB7c2VjdGlvbi5sb2NrZWQgPyA8ZGl2IGNsYXNzTmFtZT1cImFib3V0LWVkaXRvci1sb2NrXCI+PExvY2tLZXlob2xlIGFyaWEtaGlkZGVuPVwidHJ1ZVwiIC8+PHNwYW4+VGhpcyBwcm90ZWN0ZWQgU2VjdGlvbiBjYW5ub3QgYmUgcmVvcmRlcmVkIG9yIGhhdmUgaXRzIFdvcmxkIHJlcGxhY2VkIGFjY2lkZW50YWxseS48L3NwYW4+PGJ1dHRvbiB0eXBlPVwiYnV0dG9uXCIgb25DbGljaz17KCkgPT4gdXBkYXRlKCdVbmxvY2sgcHJvdGVjdGVkIFNlY3Rpb24nLCAoZHJhZnQpID0+IHsgZHJhZnQubG9ja2VkID0gZmFsc2U7IH0pfT5VbmxvY2sgYWR2YW5jZWQ8L2J1dHRvbj48L2Rpdj4gOiBudWxsfVxuICAgICAgPGRpdiBjbGFzc05hbWU9XCJhYm91dC1lZGl0b3ItaW5saW5lLWFjdGlvbnNcIj5cbiAgICAgICAgPGJ1dHRvbiB0eXBlPVwiYnV0dG9uXCIgZGlzYWJsZWQ9e3NlY3Rpb24ubG9ja2VkIHx8IHNlY3Rpb25JbmRleCA9PT0gMH0gb25DbGljaz17KCkgPT4gbW92ZSgtMSl9Pk1vdmUgZWFybGllcjwvYnV0dG9uPlxuICAgICAgICA8YnV0dG9uIHR5cGU9XCJidXR0b25cIiBkaXNhYmxlZD17c2VjdGlvbi5sb2NrZWQgfHwgc2VjdGlvbkluZGV4ID09PSBzbmFwc2hvdC5kb2N1bWVudC5zZWN0aW9ucy5sZW5ndGggLSAxfSBvbkNsaWNrPXsoKSA9PiBtb3ZlKDEpfT5Nb3ZlIGxhdGVyPC9idXR0b24+XG4gICAgICA8L2Rpdj5cbiAgICAgIDxQcm9wZXJ0eSBsYWJlbD1cIlNlY3Rpb24gbmFtZVwiPjxpbnB1dCB2YWx1ZT17c2VjdGlvbi5sYWJlbH0gb25DaGFuZ2U9eyhldmVudCkgPT4gdXBkYXRlKCdSZW5hbWUgU2VjdGlvbicsIChkcmFmdCkgPT4geyBkcmFmdC5sYWJlbCA9IGV2ZW50LnRhcmdldC52YWx1ZTsgfSwgYHNlY3Rpb246JHtzZWN0aW9uLmlkfTpsYWJlbGApfSAvPjwvUHJvcGVydHk+XG4gICAgICA8UHJvcGVydHkgbGFiZWw9XCJTdGFibGUgSURcIj48aW5wdXQgdmFsdWU9e3NlY3Rpb24uaWR9IHJlYWRPbmx5IC8+PHNtYWxsPlJlZmVyZW5jZXMgdGhpcyBTZWN0aW9uIHdpdGhvdXQgdHlpbmcgaXQgdG8gaXRzIGN1cnJlbnQgbWVhbmluZy48L3NtYWxsPjwvUHJvcGVydHk+XG4gICAgICA8UHJvcGVydHkgbGFiZWw9XCJUeXBlXCI+XG4gICAgICAgIDxzZWxlY3QgdmFsdWU9e3NlY3Rpb24udHlwZX0gZGlzYWJsZWQ9e3NlY3Rpb24udHlwZSA9PT0gJ2ZpbmFsZSd9IG9uQ2hhbmdlPXsoZXZlbnQpID0+IHVwZGF0ZSgnQ2hhbmdlIFNlY3Rpb24gdHlwZScsIChkcmFmdCkgPT4geyBkcmFmdC50eXBlID0gZXZlbnQudGFyZ2V0LnZhbHVlOyB9KX0+XG4gICAgICAgICAgPG9wdGlvbiB2YWx1ZT1cInNwYXRpYWxcIj5TcGF0aWFsPC9vcHRpb24+PG9wdGlvbiB2YWx1ZT1cImVkaXRvcmlhbFwiPkVkaXRvcmlhbDwvb3B0aW9uPjxvcHRpb24gdmFsdWU9XCJmaW5hbGVcIj5GaW5hbGU8L29wdGlvbj5cbiAgICAgICAgPC9zZWxlY3Q+XG4gICAgICA8L1Byb3BlcnR5PlxuICAgICAgPGRldGFpbHMgb3Blbj5cbiAgICAgICAgPHN1bW1hcnk+U2VjdGlvbiB0aW1pbmc8L3N1bW1hcnk+XG4gICAgICAgIDxQcm9wZXJ0eSBsYWJlbD1cIlNjcm9sbCB0cmF2ZWxcIj48b3V0cHV0IGNsYXNzTmFtZT1cImFib3V0LWVkaXRvci1yZWFkb3V0XCI+e2Zvcm1hdFdVKE1hdGgubWF4KDAsIGFjdGl2ZUV4dGVudCAtIDEpKX08L291dHB1dD48L1Byb3BlcnR5PlxuICAgICAgICA8UHJvcGVydHkgbGFiZWw9XCJUb3RhbCBoZWlnaHRcIj48b3V0cHV0IGNsYXNzTmFtZT1cImFib3V0LWVkaXRvci1yZWFkb3V0XCI+e2Zvcm1hdFdVKGFjdGl2ZUV4dGVudCl9PC9vdXRwdXQ+PC9Qcm9wZXJ0eT5cbiAgICAgICAgPE51bWJlclByb3BlcnR5IGxhYmVsPVwiRGVza3RvcCBsZW5ndGhcIiB2YWx1ZT17c2VjdGlvbi5leHRlbnRXVX0gbWluPXsxfSBtYXg9ezh9IHN0ZXA9ezAuMDV9IHVuaXQ9XCJXVVwiIG9uQ2hhbmdlPXsodmFsdWUpID0+IHVwZGF0ZSgnQ2hhbmdlIGRlc2t0b3AgU2VjdGlvbiBsZW5ndGgnLCAoZHJhZnQpID0+IHsgZHJhZnQuZXh0ZW50V1UgPSB2YWx1ZTsgfSwgYHNlY3Rpb246JHtzZWN0aW9uLmlkfTpleHRlbnRgKX0gLz5cbiAgICAgICAgPE51bWJlclByb3BlcnR5IGxhYmVsPVwiTW9iaWxlIGxlbmd0aFwiIHZhbHVlPXtzZWN0aW9uLm1vYmlsZUV4dGVudFdVfSBtaW49ezF9IG1heD17OH0gc3RlcD17MC4wNX0gdW5pdD1cIldVXCIgb25DaGFuZ2U9eyh2YWx1ZSkgPT4gdXBkYXRlKCdDaGFuZ2UgbW9iaWxlIFNlY3Rpb24gbGVuZ3RoJywgKGRyYWZ0KSA9PiB7IGRyYWZ0Lm1vYmlsZUV4dGVudFdVID0gdmFsdWU7IH0sIGBzZWN0aW9uOiR7c2VjdGlvbi5pZH06bW9iaWxlYCl9IC8+XG4gICAgICAgIDxQcm9wZXJ0eSBsYWJlbD1cIlJlc29sdmVkIGhlaWdodFwiPjxvdXRwdXQgY2xhc3NOYW1lPVwiYWJvdXQtZWRpdG9yLXJlYWRvdXRcIj57Zm9ybWF0V1UocmVzb2x2ZWRFeHRlbnQpfTwvb3V0cHV0PjwvUHJvcGVydHk+XG4gICAgICAgIHtjb250ZW50TWluaW11bUFjdGl2ZSA/IDxwIGNsYXNzTmFtZT1cImFib3V0LWVkaXRvci10aW1pbmctd2FybmluZ1wiPkNvbnRlbnQgbWluaW11bSBpbiBlZmZlY3QuIFRoZSByZW5kZXJlZCBjb3B5IG5lZWRzIHtmb3JtYXRXVShyZXNvbHZlZEV4dGVudCl9IGluIHRoaXMgcHJvZmlsZS48L3A+IDogbnVsbH1cbiAgICAgICAgPGJ1dHRvblxuICAgICAgICAgIHR5cGU9XCJidXR0b25cIlxuICAgICAgICAgIGNsYXNzTmFtZT1cImFib3V0LWVkaXRvci13aWRlLWFjdGlvblwiXG4gICAgICAgICAgZGlzYWJsZWQ9eyFiYXNlbGluZVNlY3Rpb24gfHwgYmFzZWxpbmVTZWN0aW9uW2FjdGl2ZUV4dGVudEZpZWxkXSA9PT0gc2VjdGlvblthY3RpdmVFeHRlbnRGaWVsZF19XG4gICAgICAgICAgb25DbGljaz17KCkgPT4gdXBkYXRlKCdSZXN0b3JlIHNhdmVkIFNlY3Rpb24gbGVuZ3RoJywgKGRyYWZ0KSA9PiB7IGRyYWZ0W2FjdGl2ZUV4dGVudEZpZWxkXSA9IGJhc2VsaW5lU2VjdGlvblthY3RpdmVFeHRlbnRGaWVsZF07IH0pfVxuICAgICAgICA+UmVzZXQge3NuYXBzaG90LnByZXZpZXdQcm9maWxlID09PSAnbW9iaWxlJyA/ICdtb2JpbGUnIDogJ2Rlc2t0b3AnfSBsZW5ndGg8L2J1dHRvbj5cbiAgICAgIDwvZGV0YWlscz5cbiAgICAgIHtzZWN0aW9uLnR5cGUgPT09ICdlZGl0b3JpYWwnID8gPEVkaXRvcmlhbEJsb2NrcyBzdG9yZT17c3RvcmV9IHNuYXBzaG90PXtzbmFwc2hvdH0gc2VjdGlvbj17c2VjdGlvbn0gLz4gOiBudWxsfVxuICAgICAge3NlY3Rpb24udHlwZSAhPT0gJ2VkaXRvcmlhbCcgPyAoXG4gICAgICAgIDxidXR0b25cbiAgICAgICAgICB0eXBlPVwiYnV0dG9uXCJcbiAgICAgICAgICBjbGFzc05hbWU9XCJhYm91dC1lZGl0b3Itd2lkZS1hY3Rpb25cIlxuICAgICAgICAgIG9uQ2xpY2s9eygpID0+IHtcbiAgICAgICAgICAgIGNvbnN0IGxvY2FsID0gZ2V0TG9jYWxQcm9ncmVzcyhzbmFwc2hvdC5jb21waWxlZFBsYW4sIHNlY3Rpb24sIHNuYXBzaG90LnRyYW5zcG9ydC5zdG9yeVdVKTtcbiAgICAgICAgICAgIGNvbnN0IGlkID0gbmV4dElkKHNuYXBzaG90LmRvY3VtZW50LCBgJHtzZWN0aW9uLmlkfS1zdGF0ZW1lbnRgKTtcbiAgICAgICAgICAgIGNvbnN0IGZvY3VzID0gTWF0aC5taW4oMC45MiwgTWF0aC5tYXgoMC4wOCwgc25hcEFib3V0TmFycmF0aXZlVGltZWxpbmVWYWx1ZShsb2NhbCkpKTtcbiAgICAgICAgICAgIHVwZGF0ZSgnQWRkIHRleHQgQ3VlJywgKGRyYWZ0KSA9PiB7XG4gICAgICAgICAgICAgIGRyYWZ0LnRleHQuY3VlcyB8fD0gW107XG4gICAgICAgICAgICAgIGRyYWZ0LnRleHQuY3Vlcy5wdXNoKHsgaWQsIHRleHQ6ICdOZXcgdHJhdmVsbGluZyBzdGF0ZW1lbnQnLCBlbnRlcjogZm9jdXMgLSAwLjA4LCBob2xkOiBmb2N1cywgZXhpdDogZm9jdXMgKyAwLjA4LCBwcmVzZXQ6ICd0cmF2ZWxsaW5nLXRpdGxlLXYxJywgbW90aW9uOiB7IG1vZGU6ICdzcGF0aWFsJyB9IH0pO1xuICAgICAgICAgICAgICBkcmFmdC50ZXh0LmN1ZXMuc29ydCgoYSwgYikgPT4gYS5ob2xkIC0gYi5ob2xkKTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgc3RvcmUuc2V0U2VsZWN0aW9uKHsgdHlwZTogJ2N1ZScsIHNlY3Rpb25JZDogc2VjdGlvbi5pZCwgY3VlSWQ6IGlkLCBrZXlQYXJ0OiAnZm9jdXMnIH0pO1xuICAgICAgICAgIH19XG4gICAgICAgID5BZGQgdGV4dCBjdWUgYXQgcGxheWhlYWQ8L2J1dHRvbj5cbiAgICAgICkgOiBudWxsfVxuICAgIDwvPlxuICApO1xufVxuXG5mdW5jdGlvbiBFZGl0b3JpYWxCbG9ja3MoeyBzdG9yZSwgc25hcHNob3QsIHNlY3Rpb24gfSkge1xuICBjb25zdCBzZWN0aW9uSW5kZXggPSBnZXRTZWN0aW9uSW5kZXgoc25hcHNob3QuZG9jdW1lbnQsIHNlY3Rpb24uaWQpO1xuICBjb25zdCB1cGRhdGVCbG9jayA9IChibG9ja0luZGV4LCBmaWVsZCwgdmFsdWUpID0+IHN0b3JlLmNvbW1pdCgnRWRpdCBlZGl0b3JpYWwgY29weScsIChkcmFmdCkgPT4ge1xuICAgIGRyYWZ0LnNlY3Rpb25zW3NlY3Rpb25JbmRleF0udGV4dC5ibG9ja3NbYmxvY2tJbmRleF1bZmllbGRdID0gdmFsdWU7XG4gIH0sIHsgY29hbGVzY2VLZXk6IGBibG9jazoke3NlY3Rpb24uaWR9OiR7YmxvY2tJbmRleH06JHtmaWVsZH1gLCBzZWxlY3Rpb246IHNuYXBzaG90LnNlbGVjdGlvbiB9KTtcbiAgY29uc3QgdXBkYXRlRW1waGFzaXMgPSAoYmxvY2tJbmRleCwgZW1waGFzaXNJbmRleCwgZmllbGQsIHZhbHVlKSA9PiBzdG9yZS5jb21taXQoJ0VkaXQgZWRpdG9yaWFsIGhpZ2hsaWdodCcsIChkcmFmdCkgPT4ge1xuICAgIGRyYWZ0LnNlY3Rpb25zW3NlY3Rpb25JbmRleF0udGV4dC5ibG9ja3NbYmxvY2tJbmRleF0uZW1waGFzaXNbZW1waGFzaXNJbmRleF1bZmllbGRdID0gdmFsdWU7XG4gIH0sIHsgY29hbGVzY2VLZXk6IGBibG9jazoke3NlY3Rpb24uaWR9OiR7YmxvY2tJbmRleH06ZW1waGFzaXM6JHtlbXBoYXNpc0luZGV4fToke2ZpZWxkfWAsIHNlbGVjdGlvbjogc25hcHNob3Quc2VsZWN0aW9uIH0pO1xuICBjb25zdCBhZGRFbXBoYXNpcyA9IChibG9ja0luZGV4KSA9PiBzdG9yZS5jb21taXQoJ0FkZCBlZGl0b3JpYWwgaGlnaGxpZ2h0JywgKGRyYWZ0KSA9PiB7XG4gICAgY29uc3QgYmxvY2sgPSBkcmFmdC5zZWN0aW9uc1tzZWN0aW9uSW5kZXhdLnRleHQuYmxvY2tzW2Jsb2NrSW5kZXhdO1xuICAgIGJsb2NrLmVtcGhhc2lzIHx8PSBbXTtcbiAgICBibG9jay5lbXBoYXNpcy5wdXNoKHsgdGV4dDogYmxvY2sudGV4dC50cmltKCkuc3BsaXQoL1xccysvKS5zbGljZSgwLCAyKS5qb2luKCcgJyksIHRvbmU6ICdibHVlJyB9KTtcbiAgfSwgeyBzZWxlY3Rpb246IHNuYXBzaG90LnNlbGVjdGlvbiB9KTtcbiAgY29uc3QgcmVtb3ZlRW1waGFzaXMgPSAoYmxvY2tJbmRleCwgZW1waGFzaXNJbmRleCkgPT4gc3RvcmUuY29tbWl0KCdSZW1vdmUgZWRpdG9yaWFsIGhpZ2hsaWdodCcsIChkcmFmdCkgPT4ge1xuICAgIGRyYWZ0LnNlY3Rpb25zW3NlY3Rpb25JbmRleF0udGV4dC5ibG9ja3NbYmxvY2tJbmRleF0uZW1waGFzaXMuc3BsaWNlKGVtcGhhc2lzSW5kZXgsIDEpO1xuICB9LCB7IHNlbGVjdGlvbjogc25hcHNob3Quc2VsZWN0aW9uIH0pO1xuICByZXR1cm4gKFxuICAgIDxkZXRhaWxzIG9wZW4+XG4gICAgICA8c3VtbWFyeT5FZGl0b3JpYWwgY29udGVudDwvc3VtbWFyeT5cbiAgICAgIHsoc2VjdGlvbi50ZXh0LmJsb2NrcyB8fCBbXSkubWFwKChibG9jaywgYmxvY2tJbmRleCkgPT4gKFxuICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cImFib3V0LWVkaXRvci1ibG9ja1wiIGtleT17YmxvY2suaWR9PlxuICAgICAgICAgIDxkaXY+PGNvZGU+e2Jsb2NrLmtpbmR9PC9jb2RlPjxzcGFuPntibG9jay5pZH08L3NwYW4+PC9kaXY+XG4gICAgICAgICAge2Jsb2NrLmxhYmVsICE9IG51bGwgPyA8UHJvcGVydHkgbGFiZWw9XCJMYWJlbFwiPjxpbnB1dCB2YWx1ZT17YmxvY2subGFiZWx9IG9uQ2hhbmdlPXsoZXZlbnQpID0+IHVwZGF0ZUJsb2NrKGJsb2NrSW5kZXgsICdsYWJlbCcsIGV2ZW50LnRhcmdldC52YWx1ZSl9IC8+PC9Qcm9wZXJ0eT4gOiBudWxsfVxuICAgICAgICAgIHtibG9jay50ZXh0ICE9IG51bGwgPyA8UHJvcGVydHkgbGFiZWw9XCJDb3B5XCI+PHRleHRhcmVhIHJvd3M9XCI1XCIgdmFsdWU9e2Jsb2NrLnRleHR9IG9uQ2hhbmdlPXsoZXZlbnQpID0+IHVwZGF0ZUJsb2NrKGJsb2NrSW5kZXgsICd0ZXh0JywgZXZlbnQudGFyZ2V0LnZhbHVlKX0gLz48L1Byb3BlcnR5PiA6IG51bGx9XG4gICAgICAgICAge2Jsb2NrLmtpbmQgPT09ICdwcm9zZScgPyA8UHJvcGVydHkgbGFiZWw9XCJSZWNvbm5lY3QgcG9pbnQgZ3JpZFwiPjxpbnB1dCB0eXBlPVwiY2hlY2tib3hcIiBjaGVja2VkPXtibG9jay53b3JsZEluZmx1ZW5jZSA9PT0gdHJ1ZX0gb25DaGFuZ2U9eyhldmVudCkgPT4gdXBkYXRlQmxvY2soYmxvY2tJbmRleCwgJ3dvcmxkSW5mbHVlbmNlJywgZXZlbnQudGFyZ2V0LmNoZWNrZWQpfSAvPjwvUHJvcGVydHk+IDogbnVsbH1cbiAgICAgICAgICB7YmxvY2sudGV4dCAhPSBudWxsID8gKFxuICAgICAgICAgICAgPGRpdiBjbGFzc05hbWU9XCJhYm91dC1lZGl0b3ItZW1waGFzaXMtY29udHJvbHNcIj5cbiAgICAgICAgICAgICAgPHNwYW4+SGlnaGxpZ2h0ZWQgd29yZHM8L3NwYW4+XG4gICAgICAgICAgICAgIHsoYmxvY2suZW1waGFzaXMgfHwgW10pLm1hcCgoaXRlbSwgZW1waGFzaXNJbmRleCkgPT4gKFxuICAgICAgICAgICAgICAgIDxkaXYgY2xhc3NOYW1lPVwiYWJvdXQtZWRpdG9yLWVtcGhhc2lzLXJvd1wiIGtleT17YCR7YmxvY2suaWR9LWVtcGhhc2lzLSR7ZW1waGFzaXNJbmRleH1gfT5cbiAgICAgICAgICAgICAgICAgIDxpbnB1dCBhcmlhLWxhYmVsPVwiSGlnaGxpZ2h0ZWQgcGhyYXNlXCIgdmFsdWU9e2l0ZW0udGV4dH0gb25DaGFuZ2U9eyhldmVudCkgPT4gdXBkYXRlRW1waGFzaXMoYmxvY2tJbmRleCwgZW1waGFzaXNJbmRleCwgJ3RleHQnLCBldmVudC50YXJnZXQudmFsdWUpfSAvPlxuICAgICAgICAgICAgICAgICAgPHNlbGVjdCBhcmlhLWxhYmVsPVwiSGlnaGxpZ2h0IGNvbG91clwiIHZhbHVlPXtpdGVtLnRvbmV9IG9uQ2hhbmdlPXsoZXZlbnQpID0+IHVwZGF0ZUVtcGhhc2lzKGJsb2NrSW5kZXgsIGVtcGhhc2lzSW5kZXgsICd0b25lJywgZXZlbnQudGFyZ2V0LnZhbHVlKX0+XG4gICAgICAgICAgICAgICAgICAgIHtBQk9VVF9OQVJSQVRJVkVfRU1QSEFTSVNfVE9ORVMubWFwKCh0b25lKSA9PiA8b3B0aW9uIHZhbHVlPXt0b25lfSBrZXk9e3RvbmV9Pnt0b25lfTwvb3B0aW9uPil9XG4gICAgICAgICAgICAgICAgICA8L3NlbGVjdD5cbiAgICAgICAgICAgICAgICAgIDxidXR0b24gdHlwZT1cImJ1dHRvblwiIGFyaWEtbGFiZWw9e2BSZW1vdmUgJHtpdGVtLnRleHQgfHwgJ2VtcHR5J30gaGlnaGxpZ2h0YH0gb25DbGljaz17KCkgPT4gcmVtb3ZlRW1waGFzaXMoYmxvY2tJbmRleCwgZW1waGFzaXNJbmRleCl9PsOXPC9idXR0b24+XG4gICAgICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgICAgICkpfVxuICAgICAgICAgICAgICA8YnV0dG9uIHR5cGU9XCJidXR0b25cIiBvbkNsaWNrPXsoKSA9PiBhZGRFbXBoYXNpcyhibG9ja0luZGV4KX0+QWRkIGhpZ2hsaWdodDwvYnV0dG9uPlxuICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgKSA6IG51bGx9XG4gICAgICAgICAge2Jsb2NrLml0ZW1zID8gPFByb3BlcnR5IGxhYmVsPVwiSXRlbXNcIj48dGV4dGFyZWEgcm93cz1cIjZcIiB2YWx1ZT17YmxvY2suaXRlbXMuam9pbignXFxuJyl9IG9uQ2hhbmdlPXsoZXZlbnQpID0+IHVwZGF0ZUJsb2NrKGJsb2NrSW5kZXgsICdpdGVtcycsIGV2ZW50LnRhcmdldC52YWx1ZS5zcGxpdCgnXFxuJykuZmlsdGVyKEJvb2xlYW4pKX0gLz48L1Byb3BlcnR5PiA6IG51bGx9XG4gICAgICAgIDwvZGl2PlxuICAgICAgKSl9XG4gICAgICA8YnV0dG9uIHR5cGU9XCJidXR0b25cIiBjbGFzc05hbWU9XCJhYm91dC1lZGl0b3Itd2lkZS1hY3Rpb25cIiBvbkNsaWNrPXsoKSA9PiBzdG9yZS5jb21taXQoJ0FkZCBlZGl0b3JpYWwgYmxvY2snLCAoZHJhZnQpID0+IHtcbiAgICAgICAgZHJhZnQuc2VjdGlvbnNbc2VjdGlvbkluZGV4XS50ZXh0LmJsb2Nrcy5wdXNoKHsgaWQ6IG5leHRJZChkcmFmdCwgYCR7c2VjdGlvbi5pZH0tcHJvc2VgKSwga2luZDogJ3Byb3NlJywgdGV4dDogJ05ldyBlZGl0b3JpYWwgcGFyYWdyYXBoLicgfSk7XG4gICAgICB9KX0+QWRkIHByb3NlIGJsb2NrPC9idXR0b24+XG4gICAgPC9kZXRhaWxzPlxuICApO1xufVxuXG5mdW5jdGlvbiBDdWVSaHl0aG1BbmRSZXVzZSh7IHN0b3JlLCBzbmFwc2hvdCwgY2xpcGJvYXJkLCBzZXRDbGlwYm9hcmQgfSkge1xuICBjb25zdCBtZW1iZXJzID0gZ2V0QWJvdXROYXJyYXRpdmVTZWxlY3Rpb25NZW1iZXJzKHNuYXBzaG90LnNlbGVjdGlvbik7XG4gIGNvbnN0IFtnYXBXVSwgc2V0R2FwV1VdID0gdXNlU3RhdGUoMC4zNSk7XG4gIGNvbnN0IFthbmNob3IsIHNldEFuY2hvcl0gPSB1c2VTdGF0ZSgncHJpbWFyeScpO1xuICBjb25zdCBbcHJldmlldywgc2V0UHJldmlld10gPSB1c2VTdGF0ZShudWxsKTtcbiAgY29uc3QgW21lc3NhZ2UsIHNldE1lc3NhZ2VdID0gdXNlU3RhdGUoJycpO1xuXG4gIGNvbnN0IHByZXZpZXdNb3ZlcyA9IChsYWJlbCwgcmVzdWx0KSA9PiB7XG4gICAgaWYgKCFyZXN1bHQudmFsaWQpIHtcbiAgICAgIGlmIChzbmFwc2hvdC50cnlTdGF0ZSkgc3RvcmUuY2FuY2VsVHJ5KCk7XG4gICAgICBzZXRQcmV2aWV3KHJlc3VsdCk7XG4gICAgICBzZXRNZXNzYWdlKHJlc3VsdC5yZWFzb24gfHwgJ1RoaXMgYXJyYW5nZW1lbnQgZG9lcyBub3QgZml0IHRoZSBzZWxlY3RlZCBTZWN0aW9ucy4nKTtcbiAgICAgIHJldHVybjtcbiAgICB9XG4gICAgaWYgKHNuYXBzaG90LnRyeVN0YXRlKSBzdG9yZS5jYW5jZWxUcnkoKTtcbiAgICBzdG9yZS5iZWdpblRyeShsYWJlbCwgKGRyYWZ0KSA9PiBhcHBseUN1ZU1vdmVzKGRyYWZ0LCByZXN1bHQubW92ZXMpKTtcbiAgICBzZXRQcmV2aWV3KHsgLi4ucmVzdWx0LCBsYWJlbCB9KTtcbiAgICBzZXRNZXNzYWdlKCcnKTtcbiAgfTtcbiAgY29uc3QgY2FuY2VsUHJldmlldyA9ICgpID0+IHtcbiAgICBpZiAoc25hcHNob3QudHJ5U3RhdGUpIHN0b3JlLmNhbmNlbFRyeSgpO1xuICAgIHNldFByZXZpZXcobnVsbCk7XG4gICAgc2V0TWVzc2FnZSgnJyk7XG4gIH07XG4gIGNvbnN0IGFwcGx5UHJldmlldyA9ICgpID0+IHtcbiAgICBpZiAoIXByZXZpZXc/LnZhbGlkIHx8ICFzbmFwc2hvdC50cnlTdGF0ZSkgcmV0dXJuO1xuICAgIHN0b3JlLmFwcGx5VHJ5KCk7XG4gICAgc2V0UHJldmlldyhudWxsKTtcbiAgICBzZXRNZXNzYWdlKCcnKTtcbiAgfTtcbiAgY29uc3QgY29tbWl0Q2FuZGlkYXRlID0gKGxhYmVsLCByZXN1bHQpID0+IHtcbiAgICBpZiAoIXJlc3VsdD8udmFsaWQgfHwgIXJlc3VsdC5kb2N1bWVudCkge1xuICAgICAgc2V0TWVzc2FnZShyZXN1bHQ/LnJlYXNvbiB8fCAnVGhpcyBvcGVyYXRpb24gY291bGQgbm90IGJlIGNvbXBsZXRlZCBzYWZlbHkuJyk7XG4gICAgICByZXR1cm47XG4gICAgfVxuICAgIHN0b3JlLmNvbW1pdChsYWJlbCwgKGRyYWZ0KSA9PiByZXBsYWNlRHJhZnREb2N1bWVudChkcmFmdCwgcmVzdWx0LmRvY3VtZW50KSwge1xuICAgICAgc2VsZWN0aW9uOiByZXN1bHQuc2VsZWN0aW9uIHx8IHNuYXBzaG90LnNlbGVjdGlvbixcbiAgICB9KTtcbiAgICBzZXRNZXNzYWdlKCcnKTtcbiAgfTtcblxuICBjb25zdCBkaXN0cmlidXRlID0gKCkgPT4gcHJldmlld01vdmVzKCdEaXN0cmlidXRlIHRpdGxlIHJoeXRobScsIHJlc29sdmVBYm91dE5hcnJhdGl2ZUN1ZURpc3RyaWJ1dGlvbih7XG4gICAgZG9jdW1lbnQ6IHNuYXBzaG90LmRvY3VtZW50LFxuICAgIHBsYW46IHNuYXBzaG90LmNvbXBpbGVkUGxhbixcbiAgICBtZW1iZXJzLFxuICAgIHByaW1hcnk6IHNuYXBzaG90LnNlbGVjdGlvbixcbiAgfSkpO1xuICBjb25zdCBleGFjdEdhcCA9ICgpID0+IHByZXZpZXdNb3ZlcygnU2V0IGV4YWN0IHRpdGxlIGdhcCcsIHJlc29sdmVBYm91dE5hcnJhdGl2ZUN1ZUV4YWN0R2FwKHtcbiAgICBkb2N1bWVudDogc25hcHNob3QuZG9jdW1lbnQsXG4gICAgcGxhbjogc25hcHNob3QuY29tcGlsZWRQbGFuLFxuICAgIG1lbWJlcnMsXG4gICAgcHJpbWFyeTogc25hcHNob3Quc2VsZWN0aW9uLFxuICAgIGdhcFdVLFxuICAgIGFuY2hvcixcbiAgfSkpO1xuICBjb25zdCBhbGlnblByaW1hcnkgPSAoKSA9PiBwcmV2aWV3TW92ZXMoJ0FsaWduIHRpdGxlcyB0byBwbGF5aGVhZCcsIHJlc29sdmVBYm91dE5hcnJhdGl2ZUN1ZUdyb3VwQWxpZ24oe1xuICAgIGRvY3VtZW50OiBzbmFwc2hvdC5kb2N1bWVudCxcbiAgICBwbGFuOiBzbmFwc2hvdC5jb21waWxlZFBsYW4sXG4gICAgbWVtYmVycyxcbiAgICBwcmltYXJ5OiBzbmFwc2hvdC5zZWxlY3Rpb24sXG4gICAgcGxheWhlYWRXVTogc25hcHNob3QudHJhbnNwb3J0LnN0b3J5V1UsXG4gIH0pKTtcbiAgY29uc3QgZHVwbGljYXRlID0gKCkgPT4gY29tbWl0Q2FuZGlkYXRlKCdEdXBsaWNhdGUgdGl0bGUgQ3VlcycsIGR1cGxpY2F0ZUFib3V0TmFycmF0aXZlQ3VlR3JvdXAoe1xuICAgIGRvY3VtZW50OiBzbmFwc2hvdC5kb2N1bWVudCxcbiAgICBtZW1iZXJzLFxuICAgIHByaW1hcnk6IHNuYXBzaG90LnNlbGVjdGlvbixcbiAgfSkpO1xuICBjb25zdCBjb3B5ID0gKCkgPT4ge1xuICAgIGNvbnN0IHJlc3VsdCA9IGNyZWF0ZUFib3V0TmFycmF0aXZlQ3VlQ2xpcGJvYXJkUGF5bG9hZCh7XG4gICAgICBkb2N1bWVudDogc25hcHNob3QuZG9jdW1lbnQsXG4gICAgICBwbGFuOiBzbmFwc2hvdC5jb21waWxlZFBsYW4sXG4gICAgICBtZW1iZXJzLFxuICAgICAgcHJpbWFyeTogc25hcHNob3Quc2VsZWN0aW9uLFxuICAgIH0pO1xuICAgIGNvbnN0IHBheWxvYWQgPSByZXN1bHQ/LnBheWxvYWQgfHwgcmVzdWx0O1xuICAgIGNvbnN0IHZhbGlkYXRpb24gPSB2YWxpZGF0ZUFib3V0TmFycmF0aXZlQ3VlQ2xpcGJvYXJkUGF5bG9hZChwYXlsb2FkKTtcbiAgICBpZiAocmVzdWx0Py52YWxpZCA9PT0gZmFsc2UgfHwgdmFsaWRhdGlvbj8udmFsaWQgPT09IGZhbHNlKSB7XG4gICAgICBzZXRNZXNzYWdlKHJlc3VsdD8ucmVhc29uIHx8IHZhbGlkYXRpb24/LnJlYXNvbiB8fCAnVGhlc2UgdGl0bGVzIGNhbm5vdCBiZSBjb3BpZWQuJyk7XG4gICAgICByZXR1cm47XG4gICAgfVxuICAgIHNldENsaXBib2FyZChwYXlsb2FkKTtcbiAgICBzZXRNZXNzYWdlKGAke21lbWJlcnMubGVuZ3RofSB0aXRsZSR7bWVtYmVycy5sZW5ndGggPT09IDEgPyAnJyA6ICdzJ30gY29waWVkIGZvciB0aGlzIGVkaXRvciBzZXNzaW9uLmApO1xuICB9O1xuICBjb25zdCBwYXN0ZSA9ICgpID0+IGNvbW1pdENhbmRpZGF0ZSgnUGFzdGUgdGl0bGUgQ3VlcycsIHJlc29sdmVBYm91dE5hcnJhdGl2ZUN1ZUdyb3VwUGFzdGUoe1xuICAgIGRvY3VtZW50OiBzbmFwc2hvdC5kb2N1bWVudCxcbiAgICBwbGFuOiBzbmFwc2hvdC5jb21waWxlZFBsYW4sXG4gICAgcGF5bG9hZDogY2xpcGJvYXJkLFxuICAgIGRlc3RpbmF0aW9uU2VjdGlvbklkOiBzbmFwc2hvdC5zZWxlY3Rpb24uc2VjdGlvbklkLFxuICAgIHBsYXloZWFkV1U6IHNuYXBzaG90LnRyYW5zcG9ydC5zdG9yeVdVLFxuICB9KSk7XG5cbiAgY29uc3QgZ2hvc3RNb3ZlcyA9IHByZXZpZXc/LnZhbGlkID8gcHJldmlldy5tb3ZlcyA6IFtdO1xuICBjb25zdCBtYXhXVSA9IE1hdGgubWF4KDAuMDAxLCBzbmFwc2hvdC5jb21waWxlZFBsYW4/Lm1heFN0b3J5V1UgfHwgMSk7XG4gIHJldHVybiAoXG4gICAgPGRldGFpbHMgY2xhc3NOYW1lPVwiYWJvdXQtZWRpdG9yLXJoeXRobVwiIG9wZW49e21lbWJlcnMubGVuZ3RoID4gMX0+XG4gICAgICA8c3VtbWFyeT5SaHl0aG0gYW5kIHJldXNlPC9zdW1tYXJ5PlxuICAgICAge21lbWJlcnMubGVuZ3RoID4gMSA/IChcbiAgICAgICAgPD5cbiAgICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cImFib3V0LWVkaXRvci1yaHl0aG0tYWN0aW9uc1wiPlxuICAgICAgICAgICAgPGJ1dHRvbiB0eXBlPVwiYnV0dG9uXCIgb25DbGljaz17ZGlzdHJpYnV0ZX0+RGlzdHJpYnV0ZSBldmVubHk8L2J1dHRvbj5cbiAgICAgICAgICAgIDxidXR0b24gdHlwZT1cImJ1dHRvblwiIG9uQ2xpY2s9e2FsaWduUHJpbWFyeX0+QWxpZ24gcHJpbWFyeSB0byBwbGF5aGVhZDwvYnV0dG9uPlxuICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgIDxkaXYgY2xhc3NOYW1lPVwiYWJvdXQtZWRpdG9yLXJoeXRobS1nYXBcIj5cbiAgICAgICAgICAgIDxQcm9wZXJ0eSBsYWJlbD1cIkV4YWN0IGdhcFwiPjxpbnB1dCB0eXBlPVwibnVtYmVyXCIgbWluPVwiMFwiIG1heD1cIjhcIiBzdGVwPVwiMC4wNVwiIHZhbHVlPXtnYXBXVX0gb25DaGFuZ2U9eyhldmVudCkgPT4gc2V0R2FwV1UoTWF0aC5tYXgoMCwgTnVtYmVyKGV2ZW50LnRhcmdldC52YWx1ZSkgfHwgMCkpfSAvPjwvUHJvcGVydHk+XG4gICAgICAgICAgICA8UHJvcGVydHkgbGFiZWw9XCJBbmNob3JcIj48c2VsZWN0IHZhbHVlPXthbmNob3J9IG9uQ2hhbmdlPXsoZXZlbnQpID0+IHNldEFuY2hvcihldmVudC50YXJnZXQudmFsdWUpfT48b3B0aW9uIHZhbHVlPVwicHJpbWFyeVwiPlByaW1hcnk8L29wdGlvbj48b3B0aW9uIHZhbHVlPVwiZmlyc3RcIj5GaXJzdDwvb3B0aW9uPjxvcHRpb24gdmFsdWU9XCJsYXN0XCI+TGFzdDwvb3B0aW9uPjwvc2VsZWN0PjwvUHJvcGVydHk+XG4gICAgICAgICAgICA8YnV0dG9uIHR5cGU9XCJidXR0b25cIiBvbkNsaWNrPXtleGFjdEdhcH0+UHJldmlldyBleGFjdCBnYXA8L2J1dHRvbj5cbiAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgPC8+XG4gICAgICApIDogbnVsbH1cbiAgICAgIHtnaG9zdE1vdmVzLmxlbmd0aCA/IChcbiAgICAgICAgPGRpdiBjbGFzc05hbWU9XCJhYm91dC1lZGl0b3Itcmh5dGhtLXByZXZpZXdcIiBhcmlhLWxhYmVsPVwiUHJvcG9zZWQgdGl0bGUgcmh5dGhtXCI+XG4gICAgICAgICAge2dob3N0TW92ZXMubWFwKChtb3ZlKSA9PiB7XG4gICAgICAgICAgICBjb25zdCBjb21waWxlZCA9IHNuYXBzaG90LmNvbXBpbGVkUGxhbi5zZWN0aW9ucy5maW5kKChpdGVtKSA9PiBpdGVtLmlkID09PSBtb3ZlLnNlY3Rpb25JZCk7XG4gICAgICAgICAgICBjb25zdCBzdG9yeVdVID0gTnVtYmVyKGNvbXBpbGVkPy5zdGFydFdVIHx8IDApICsgKG1vdmUuaG9sZCAqIE51bWJlcihjb21waWxlZD8udHJhdmVsV1UgfHwgMCkpO1xuICAgICAgICAgICAgcmV0dXJuIDxpIGtleT17YCR7bW92ZS5zZWN0aW9uSWR9OiR7bW92ZS5jdWVJZH1gfSBzdHlsZT17eyBsZWZ0OiBgJHsoc3RvcnlXVSAvIG1heFdVKSAqIDEwMH0lYCB9fSB0aXRsZT17YCR7bW92ZS5jdWVJZH0gwrcgJHtmb3JtYXRXVShzdG9yeVdVKX1gfSAvPjtcbiAgICAgICAgICB9KX1cbiAgICAgICAgPC9kaXY+XG4gICAgICApIDogbnVsbH1cbiAgICAgIHttZXNzYWdlID8gPHAgY2xhc3NOYW1lPXtgYWJvdXQtZWRpdG9yLXJoeXRobS1tZXNzYWdlJHtwcmV2aWV3ICYmICFwcmV2aWV3LnZhbGlkID8gJyBpcy1lcnJvcicgOiAnJ31gfT57bWVzc2FnZX08L3A+IDogbnVsbH1cbiAgICAgIHtwcmV2aWV3Py52YWxpZCAmJiBzbmFwc2hvdC50cnlTdGF0ZSA/IDxkaXYgY2xhc3NOYW1lPVwiYWJvdXQtZWRpdG9yLXRyeVwiPjxzcGFuPlByZXZpZXdpbmcge3ByZXZpZXcubGFiZWx9PC9zcGFuPjxidXR0b24gdHlwZT1cImJ1dHRvblwiIG9uQ2xpY2s9e2NhbmNlbFByZXZpZXd9PkNhbmNlbDwvYnV0dG9uPjxidXR0b24gdHlwZT1cImJ1dHRvblwiIGNsYXNzTmFtZT1cImlzLXByaW1hcnlcIiBvbkNsaWNrPXthcHBseVByZXZpZXd9PkFwcGx5PC9idXR0b24+PC9kaXY+IDogbnVsbH1cbiAgICAgIDxkaXYgY2xhc3NOYW1lPVwiYWJvdXQtZWRpdG9yLXJoeXRobS1hY3Rpb25zXCI+XG4gICAgICAgIDxidXR0b24gdHlwZT1cImJ1dHRvblwiIG9uQ2xpY2s9e2R1cGxpY2F0ZX0+RHVwbGljYXRlIHttZW1iZXJzLmxlbmd0aCA+IDEgPyAnc2VsZWN0aW9uJyA6ICd0aXRsZSd9PC9idXR0b24+XG4gICAgICAgIDxidXR0b24gdHlwZT1cImJ1dHRvblwiIG9uQ2xpY2s9e2NvcHl9PkNvcHk8L2J1dHRvbj5cbiAgICAgICAgPGJ1dHRvbiB0eXBlPVwiYnV0dG9uXCIgZGlzYWJsZWQ9eyFjbGlwYm9hcmR9IG9uQ2xpY2s9e3Bhc3RlfT5QYXN0ZSBhdCBwbGF5aGVhZDwvYnV0dG9uPlxuICAgICAgPC9kaXY+XG4gICAgPC9kZXRhaWxzPlxuICApO1xufVxuXG5mdW5jdGlvbiBDdWVJbnNwZWN0b3IoeyBzdG9yZSwgc25hcHNob3QsIHNlY3Rpb24sIGNsaXBib2FyZCwgc2V0Q2xpcGJvYXJkIH0pIHtcbiAgY29uc3Qgc2VsZWN0ZWRNZW1iZXJzID0gZ2V0QWJvdXROYXJyYXRpdmVTZWxlY3Rpb25NZW1iZXJzKHNuYXBzaG90LnNlbGVjdGlvbik7XG4gIGNvbnN0IHNlY3Rpb25JbmRleCA9IGdldFNlY3Rpb25JbmRleChzbmFwc2hvdC5kb2N1bWVudCwgc2VjdGlvbi5pZCk7XG4gIGNvbnN0IGN1ZUluZGV4ID0gc2VjdGlvbi50ZXh0LmN1ZXMuZmluZEluZGV4KChjdWUpID0+IGN1ZS5pZCA9PT0gc25hcHNob3Quc2VsZWN0aW9uLmN1ZUlkKTtcbiAgY29uc3QgY3VlID0gc2VjdGlvbi50ZXh0LmN1ZXNbY3VlSW5kZXhdO1xuICBpZiAoIWN1ZSkgcmV0dXJuIDxTZWN0aW9uSW5zcGVjdG9yIHN0b3JlPXtzdG9yZX0gc25hcHNob3Q9e3NuYXBzaG90fSBzZWN0aW9uPXtzZWN0aW9ufSAvPjtcbiAgY29uc3QgdXBkYXRlID0gKGZpZWxkLCB2YWx1ZSkgPT4gc3RvcmUuY29tbWl0KGBFZGl0IEN1ZSAke2ZpZWxkfWAsIChkcmFmdCkgPT4ge1xuICAgIGRyYWZ0LnNlY3Rpb25zW3NlY3Rpb25JbmRleF0udGV4dC5jdWVzW2N1ZUluZGV4XVtmaWVsZF0gPSB2YWx1ZTtcbiAgfSwgeyBjb2FsZXNjZUtleTogYGN1ZToke2N1ZS5pZH06JHtmaWVsZH1gLCBzZWxlY3Rpb246IHNuYXBzaG90LnNlbGVjdGlvbiB9KTtcbiAgY29uc3QgcmVtb3ZlID0gKCkgPT4gc3RvcmUuY29tbWl0KCdEZWxldGUgdGV4dCBDdWUnLCAoZHJhZnQpID0+IHtcbiAgICBkcmFmdC5zZWN0aW9uc1tzZWN0aW9uSW5kZXhdLnRleHQuY3Vlcy5zcGxpY2UoY3VlSW5kZXgsIDEpO1xuICB9LCB7IHNlbGVjdGlvbjogeyB0eXBlOiAnc2VjdGlvbicsIHNlY3Rpb25JZDogc2VjdGlvbi5pZCB9IH0pO1xuICBjb25zdCB0aW1pbmdCb3VuZHMgPSBnZXRBYm91dE5hcnJhdGl2ZUN1ZVRpbWluZ0JvdW5kcyhjdWUpO1xuICBjb25zdCBtb3Rpb25JbnRlcnZhbCA9IGdldEFib3V0TmFycmF0aXZlQ3VlTW90aW9uSW50ZXJ2YWwoY3VlLCBzbmFwc2hvdC5kb2N1bWVudC5nbG9iYWxzLnRleHRNb3Rpb24pO1xuICBjb25zdCBtb3ZlbWVudCA9IGdldEFib3V0TmFycmF0aXZlQ3VlTW92ZW1lbnQoY3VlKTtcbiAgY29uc3QgbW92ZUN1ZSA9IChwZXJjZW50KSA9PiBzdG9yZS5jb21taXQoJ01vdmUgdGV4dCBDdWUnLCAoZHJhZnQpID0+IHtcbiAgICBjb25zdCB0YXJnZXQgPSBkcmFmdC5zZWN0aW9uc1tzZWN0aW9uSW5kZXhdLnRleHQuY3Vlc1tjdWVJbmRleF07XG4gICAgT2JqZWN0LmFzc2lnbih0YXJnZXQsIG1vdmVBYm91dE5hcnJhdGl2ZUN1ZVRpbWluZyh0YXJnZXQsIHBlcmNlbnQgLyAxMDApKTtcbiAgfSwgeyBjb2FsZXNjZUtleTogYGN1ZToke2N1ZS5pZH06dGltaW5nYCwgc2VsZWN0aW9uOiB7IC4uLnNuYXBzaG90LnNlbGVjdGlvbiwga2V5UGFydDogJ2ZvY3VzJyB9IH0pO1xuICBjb25zdCB1cGRhdGVNb3ZlbWVudCA9IChtb2RlKSA9PiBzdG9yZS5jb21taXQoJ0NoYW5nZSB0ZXh0IG1vdmVtZW50JywgKGRyYWZ0KSA9PiB7XG4gICAgY29uc3QgdGFyZ2V0ID0gZHJhZnQuc2VjdGlvbnNbc2VjdGlvbkluZGV4XS50ZXh0LmN1ZXNbY3VlSW5kZXhdO1xuICAgIHRhcmdldC5tb3Rpb24gPSB7IC4uLnRhcmdldC5tb3Rpb24sIG1vZGUgfTtcbiAgfSwgeyBzZWxlY3Rpb246IHNuYXBzaG90LnNlbGVjdGlvbiB9KTtcbiAgcmV0dXJuIChcbiAgICA8PlxuICAgICAgPGhlYWRlcj48c3Bhbj5UZXh0IEN1ZTwvc3Bhbj48c3Ryb25nPntjdWUuaWR9PC9zdHJvbmc+PC9oZWFkZXI+XG4gICAgICB7c2VsZWN0ZWRNZW1iZXJzLmxlbmd0aCA+IDEgPyAoXG4gICAgICAgIDxkaXYgY2xhc3NOYW1lPVwiYWJvdXQtZWRpdG9yLWdyb3VwLXN1bW1hcnlcIj5cbiAgICAgICAgICA8c3Ryb25nPntzZWxlY3RlZE1lbWJlcnMubGVuZ3RofSB0aXRsZXMgc2VsZWN0ZWQ8L3N0cm9uZz5cbiAgICAgICAgICA8b2w+e3NlbGVjdGVkTWVtYmVycy5tYXAoKG1lbWJlcikgPT4ge1xuICAgICAgICAgICAgY29uc3QgbWVtYmVyU2VjdGlvbiA9IHNuYXBzaG90LmRvY3VtZW50LnNlY3Rpb25zLmZpbmQoKGl0ZW0pID0+IGl0ZW0uaWQgPT09IG1lbWJlci5zZWN0aW9uSWQpO1xuICAgICAgICAgICAgY29uc3QgbWVtYmVyQ3VlID0gbWVtYmVyU2VjdGlvbj8udGV4dD8uY3Vlcz8uZmluZCgoaXRlbSkgPT4gaXRlbS5pZCA9PT0gbWVtYmVyLmN1ZUlkKTtcbiAgICAgICAgICAgIHJldHVybiA8bGkga2V5PXtgJHttZW1iZXIuc2VjdGlvbklkfToke21lbWJlci5jdWVJZH1gfT48c3Bhbj57bWVtYmVyU2VjdGlvbj8ubGFiZWx9PC9zcGFuPnttZW1iZXJDdWU/LnRleHR9PC9saT47XG4gICAgICAgICAgfSl9PC9vbD5cbiAgICAgICAgICA8YnV0dG9uIHR5cGU9XCJidXR0b25cIiBvbkNsaWNrPXsoKSA9PiBzdG9yZS5zZXRTZWxlY3Rpb24oeyB0eXBlOiAnY3VlJywgc2VjdGlvbklkOiBzZWN0aW9uLmlkLCBjdWVJZDogY3VlLmlkLCBrZXlQYXJ0OiAnZm9jdXMnIH0pfT5LZWVwIHByaW1hcnkgb25seTwvYnV0dG9uPlxuICAgICAgICA8L2Rpdj5cbiAgICAgICkgOiBudWxsfVxuICAgICAgPHAgY2xhc3NOYW1lPVwiYWJvdXQtZWRpdG9yLWhlbHBcIj5EcmFnIHRoZSBwaW5rIHRpbWluZyBtYXJrZXIgYW55d2hlcmUgZnJvbSAw4oCTMTAwJSBvZiBpdHMgU2VjdGlvbi4gVGhpcyBtb3ZlcyB0aGUgdGl0bGUncyBmb2N1cyB0aW1lIG9ubHkuIEl0cyB0cmF2ZWwgZHVyYXRpb24sIHNwZWVkLCBibHVyLCBhbmQgaW4vb3V0IGNhZGVuY2UgcmVtYWluIGNvbnRyb2xsZWQgZ2xvYmFsbHkgdW5kZXIgU3BhdGlhbCB0aXRsZXMuPC9wPlxuICAgICAgPFByb3BlcnR5IGxhYmVsPVwiU3RhdGVtZW50XCI+PHRleHRhcmVhIHJvd3M9XCI3XCIgdmFsdWU9e2N1ZS50ZXh0fSBvbkNoYW5nZT17KGV2ZW50KSA9PiB1cGRhdGUoJ3RleHQnLCBldmVudC50YXJnZXQudmFsdWUpfSAvPjwvUHJvcGVydHk+XG4gICAgICA8UHJvcGVydHkgbGFiZWw9XCJNb3ZlbWVudFwiPjxzZWxlY3QgdmFsdWU9e21vdmVtZW50fSBvbkNoYW5nZT17KGV2ZW50KSA9PiB1cGRhdGVNb3ZlbWVudChldmVudC50YXJnZXQudmFsdWUpfT48b3B0aW9uIHZhbHVlPVwic3BhdGlhbFwiPlNwYXRpYWwgdHJhdmVsPC9vcHRpb24+PG9wdGlvbiB2YWx1ZT1cInZlcnRpY2FsXCI+VmVydGljYWwgc2Nyb2xsPC9vcHRpb24+PC9zZWxlY3Q+PC9Qcm9wZXJ0eT5cbiAgICAgIDxOdW1iZXJQcm9wZXJ0eVxuICAgICAgICBsYWJlbD1cIlBvc2l0aW9uXCJcbiAgICAgICAgdmFsdWU9e051bWJlcigoY3VlLmhvbGQgKiAxMDApLnRvRml4ZWQoMSkpfVxuICAgICAgICBtaW49e051bWJlcigodGltaW5nQm91bmRzLm1pbiAqIDEwMCkudG9GaXhlZCgxKSl9XG4gICAgICAgIG1heD17TnVtYmVyKCh0aW1pbmdCb3VuZHMubWF4ICogMTAwKS50b0ZpeGVkKDEpKX1cbiAgICAgICAgc3RlcD17MC41fVxuICAgICAgICB1bml0PVwiJVwiXG4gICAgICAgIGRpc2FibGVkPXt0aW1pbmdCb3VuZHMubWluID09PSB0aW1pbmdCb3VuZHMubWF4fVxuICAgICAgICBvbkNoYW5nZT17bW92ZUN1ZX1cbiAgICAgIC8+XG4gICAgICB7bW92ZW1lbnQgPT09ICdzcGF0aWFsJyA/IChcbiAgICAgICAgPD5cbiAgICAgICAgICA8UHJvcGVydHkgbGFiZWw9XCJBdXRvIHRyYXZlbFwiPjxvdXRwdXQgY2xhc3NOYW1lPVwiYWJvdXQtZWRpdG9yLXJlYWRvdXRcIj57TWF0aC5yb3VuZChtb3Rpb25JbnRlcnZhbC5zdGFydCAqIDEwMCl94oCTe01hdGgucm91bmQobW90aW9uSW50ZXJ2YWwuZW5kICogMTAwKX0lPC9vdXRwdXQ+PC9Qcm9wZXJ0eT5cbiAgICAgICAgICA8UHJvcGVydHkgbGFiZWw9XCJNb3Rpb24gcHJlc2V0XCI+PHNlbGVjdCB2YWx1ZT17Y3VlLnByZXNldH0gb25DaGFuZ2U9eyhldmVudCkgPT4gdXBkYXRlKCdwcmVzZXQnLCBldmVudC50YXJnZXQudmFsdWUpfT48b3B0aW9uIHZhbHVlPVwidHJhdmVsbGluZy10aXRsZS12MVwiPlRyYXZlbGxpbmcgdGl0bGU8L29wdGlvbj48b3B0aW9uIHZhbHVlPVwib3BlbmVyLXYxXCI+T3BlbmVyPC9vcHRpb24+PG9wdGlvbiB2YWx1ZT1cImZpbmFsZS12MVwiPkZpbmFsZTwvb3B0aW9uPjwvc2VsZWN0PjwvUHJvcGVydHk+XG4gICAgICAgIDwvPlxuICAgICAgKSA6IDxQcm9wZXJ0eSBsYWJlbD1cIlJldmVhbFwiPjxvdXRwdXQgY2xhc3NOYW1lPVwiYWJvdXQtZWRpdG9yLXJlYWRvdXRcIj5FZGl0b3JpYWwgdmVydGljYWwgc2Nyb2xsPC9vdXRwdXQ+PC9Qcm9wZXJ0eT59XG4gICAgICA8Q3VlUmh5dGhtQW5kUmV1c2Ugc3RvcmU9e3N0b3JlfSBzbmFwc2hvdD17c25hcHNob3R9IGNsaXBib2FyZD17Y2xpcGJvYXJkfSBzZXRDbGlwYm9hcmQ9e3NldENsaXBib2FyZH0gLz5cbiAgICAgIDxidXR0b24gdHlwZT1cImJ1dHRvblwiIGNsYXNzTmFtZT1cImFib3V0LWVkaXRvci1kYW5nZXJcIiBkaXNhYmxlZD17c2VjdGlvbi50eXBlID09PSAnZmluYWxlJ30gb25DbGljaz17cmVtb3ZlfT5EZWxldGUgQ3VlPC9idXR0b24+XG4gICAgPC8+XG4gICk7XG59XG5cbmZ1bmN0aW9uIERpc2NpcGxpbmVSZXZlYWxJbnNwZWN0b3IoeyBzdG9yZSwgc25hcHNob3QsIHNlY3Rpb24gfSkge1xuICBjb25zdCBzZWN0aW9uSW5kZXggPSBnZXRTZWN0aW9uSW5kZXgoc25hcHNob3QuZG9jdW1lbnQsIHNlY3Rpb24uaWQpO1xuICBjb25zdCByZXZlYWwgPSBzZWN0aW9uLnRleHQuZGlzY2lwbGluZVJldmVhbDtcbiAgaWYgKCFyZXZlYWwpIHJldHVybiA8U2VjdGlvbkluc3BlY3RvciBzdG9yZT17c3RvcmV9IHNuYXBzaG90PXtzbmFwc2hvdH0gc2VjdGlvbj17c2VjdGlvbn0gLz47XG4gIGNvbnN0IHVwZGF0ZSA9IChsYWJlbCwgbXV0YXRlLCBjb2FsZXNjZUtleSA9IG51bGwpID0+IHN0b3JlLmNvbW1pdChsYWJlbCwgKGRyYWZ0KSA9PiB7XG4gICAgbXV0YXRlKGRyYWZ0LnNlY3Rpb25zW3NlY3Rpb25JbmRleF0udGV4dC5kaXNjaXBsaW5lUmV2ZWFsKTtcbiAgfSwgeyBjb2FsZXNjZUtleSwgc2VsZWN0aW9uOiBzbmFwc2hvdC5zZWxlY3Rpb24gfSk7XG4gIGNvbnN0IG9jY3VwaWVkID0gKChyZXZlYWwuaXRlbXMubGVuZ3RoIC0gMSkgKiByZXZlYWwuc3RhZ2dlcikgKyByZXZlYWwubGFiZWxEdXJhdGlvbiArIHJldmVhbC5ob2xkO1xuICBjb25zdCBsaW1pdHNGb3IgPSAoY29udHJvbCkgPT4ge1xuICAgIGlmIChjb250cm9sLmlkID09PSAnc3RhcnQnKSByZXR1cm4geyBtaW46IGNvbnRyb2wubWluLCBtYXg6IE1hdGgubWF4KGNvbnRyb2wubWluLCByZXZlYWwuZW5kIC0gb2NjdXBpZWQpIH07XG4gICAgaWYgKGNvbnRyb2wuaWQgPT09ICdlbmQnKSByZXR1cm4geyBtaW46IE1hdGgubWluKGNvbnRyb2wubWF4LCByZXZlYWwuc3RhcnQgKyBvY2N1cGllZCksIG1heDogY29udHJvbC5tYXggfTtcbiAgICBpZiAoY29udHJvbC5pZCA9PT0gJ3N0YWdnZXInKSByZXR1cm4ge1xuICAgICAgbWluOiBjb250cm9sLm1pbixcbiAgICAgIG1heDogTWF0aC5tYXgoY29udHJvbC5taW4sIChyZXZlYWwuZW5kIC0gcmV2ZWFsLnN0YXJ0IC0gcmV2ZWFsLmxhYmVsRHVyYXRpb24gLSByZXZlYWwuaG9sZCkgLyBNYXRoLm1heCgxLCByZXZlYWwuaXRlbXMubGVuZ3RoIC0gMSkpLFxuICAgIH07XG4gICAgaWYgKGNvbnRyb2wuaWQgPT09ICdsYWJlbER1cmF0aW9uJykgcmV0dXJuIHtcbiAgICAgIG1pbjogY29udHJvbC5taW4sXG4gICAgICBtYXg6IE1hdGgubWF4KGNvbnRyb2wubWluLCByZXZlYWwuZW5kIC0gcmV2ZWFsLnN0YXJ0IC0gKChyZXZlYWwuaXRlbXMubGVuZ3RoIC0gMSkgKiByZXZlYWwuc3RhZ2dlcikgLSByZXZlYWwuaG9sZCksXG4gICAgfTtcbiAgICBpZiAoY29udHJvbC5pZCA9PT0gJ2hvbGQnKSByZXR1cm4ge1xuICAgICAgbWluOiBjb250cm9sLm1pbixcbiAgICAgIG1heDogTWF0aC5tYXgoY29udHJvbC5taW4sIHJldmVhbC5lbmQgLSByZXZlYWwuc3RhcnQgLSAoKHJldmVhbC5pdGVtcy5sZW5ndGggLSAxKSAqIHJldmVhbC5zdGFnZ2VyKSAtIHJldmVhbC5sYWJlbER1cmF0aW9uKSxcbiAgICB9O1xuICAgIHJldHVybiB7IG1pbjogY29udHJvbC5taW4sIG1heDogY29udHJvbC5tYXggfTtcbiAgfTtcbiAgcmV0dXJuIChcbiAgICA8PlxuICAgICAgPGhlYWRlcj48c3Bhbj5UZXh0IHNlcXVlbmNlPC9zcGFuPjxzdHJvbmc+RGlzY2lwbGluZSByZXZlYWw8L3N0cm9uZz48L2hlYWRlcj5cbiAgICAgIDxwIGNsYXNzTmFtZT1cImFib3V0LWVkaXRvci1oZWxwXCI+T25lIGNsaXAgY29udHJvbHMgdGhlIGNvbXBsZXRlIHNpeC1wb2ludCBzZXF1ZW5jZS4gRHJhZyBpdHMgc3RyaXBlZCBibG9jayBpbiB0aGUgVGV4dCBsYW5lIHRvIG1vdmUgZXZlcnkgcmV2ZWFsIHRvZ2V0aGVyLjwvcD5cbiAgICAgIDxkZXRhaWxzIG9wZW4+PHN1bW1hcnk+UmV2ZWFsIGNob3Jlb2dyYXBoeTwvc3VtbWFyeT5cbiAgICAgICAge0FCT1VUX05BUlJBVElWRV9ESVNDSVBMSU5FX1JFVkVBTF9DT05UUk9MUy5tYXAoKGNvbnRyb2wpID0+IHtcbiAgICAgICAgICBjb25zdCBsaW1pdHMgPSBsaW1pdHNGb3IoY29udHJvbCk7XG4gICAgICAgICAgcmV0dXJuIChcbiAgICAgICAgICAgIDxOdW1iZXJQcm9wZXJ0eVxuICAgICAgICAgICAgICBrZXk9e2NvbnRyb2wuaWR9XG4gICAgICAgICAgICAgIGxhYmVsPXtjb250cm9sLmxhYmVsfVxuICAgICAgICAgICAgICB2YWx1ZT17cmV2ZWFsW2NvbnRyb2wuaWRdfVxuICAgICAgICAgICAgICBtaW49e2xpbWl0cy5taW59XG4gICAgICAgICAgICAgIG1heD17bGltaXRzLm1heH1cbiAgICAgICAgICAgICAgc3RlcD17Y29udHJvbC5zdGVwfVxuICAgICAgICAgICAgICB1bml0PXtjb250cm9sLnVuaXR9XG4gICAgICAgICAgICAgIG9uQ2hhbmdlPXsodmFsdWUpID0+IHVwZGF0ZShgQ2hhbmdlICR7Y29udHJvbC5sYWJlbH1gLCAoZHJhZnQpID0+IHsgZHJhZnRbY29udHJvbC5pZF0gPSB2YWx1ZTsgfSwgYGRpc2NpcGxpbmUtcmV2ZWFsOiR7c2VjdGlvbi5pZH06JHtjb250cm9sLmlkfWApfVxuICAgICAgICAgICAgLz5cbiAgICAgICAgICApO1xuICAgICAgICB9KX1cbiAgICAgIDwvZGV0YWlscz5cbiAgICAgIDxkZXRhaWxzIG9wZW4+PHN1bW1hcnk+UmV2ZWFsIG9yZGVyIGFuZCBsYWJlbHM8L3N1bW1hcnk+XG4gICAgICAgIDxkaXYgY2xhc3NOYW1lPVwiYWJvdXQtZWRpdG9yLWRpc2NpcGxpbmUtaXRlbXNcIj5cbiAgICAgICAgICB7cmV2ZWFsLml0ZW1zLm1hcCgoaXRlbSwgaXRlbUluZGV4KSA9PiAoXG4gICAgICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cImFib3V0LWVkaXRvci1kaXNjaXBsaW5lLWl0ZW1cIiBrZXk9e2l0ZW0uZ3JvdXB9PlxuICAgICAgICAgICAgICA8Y29kZT57U3RyaW5nKGl0ZW1JbmRleCArIDEpLnBhZFN0YXJ0KDIsICcwJyl9PC9jb2RlPlxuICAgICAgICAgICAgICA8aW5wdXQgdmFsdWU9e2l0ZW0ubGFiZWx9IGFyaWEtbGFiZWw9e2BEaXNjaXBsaW5lICR7aXRlbUluZGV4ICsgMX0gbGFiZWxgfSBvbkNoYW5nZT17KGV2ZW50KSA9PiB1cGRhdGUoJ0VkaXQgZGlzY2lwbGluZSBsYWJlbCcsIChkcmFmdCkgPT4geyBkcmFmdC5pdGVtc1tpdGVtSW5kZXhdLmxhYmVsID0gZXZlbnQudGFyZ2V0LnZhbHVlOyB9LCBgZGlzY2lwbGluZS1yZXZlYWw6JHtzZWN0aW9uLmlkfTppdGVtOiR7aXRlbS5ncm91cH06bGFiZWxgKX0gLz5cbiAgICAgICAgICAgICAgPGRpdiBjbGFzc05hbWU9XCJhYm91dC1lZGl0b3ItZGlzY2lwbGluZS1wYWxldHRlXCIgdGl0bGU9e2Ake2l0ZW0ubGFiZWx9IHVzZXMgdGhlIEhvbWUgc2ltdWxhdGlvbiAke0RJU0NJUExJTkVfQkFMTF9UT0tFTl9CWV9HUk9VUFtpdGVtLmdyb3VwXX1gfT5cbiAgICAgICAgICAgICAgICA8aSBzdHlsZT17eyBiYWNrZ3JvdW5kOiBgdmFyKCR7RElTQ0lQTElORV9CQUxMX1RPS0VOX0JZX0dST1VQW2l0ZW0uZ3JvdXBdfSlgIH19IC8+XG4gICAgICAgICAgICAgICAgPGNvZGU+e0RJU0NJUExJTkVfQkFMTF9UT0tFTl9CWV9HUk9VUFtpdGVtLmdyb3VwXX08L2NvZGU+XG4gICAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgICA8c3Bhbj5cbiAgICAgICAgICAgICAgICA8YnV0dG9uIHR5cGU9XCJidXR0b25cIiBkaXNhYmxlZD17aXRlbUluZGV4ID09PSAwfSBhcmlhLWxhYmVsPXtgUmV2ZWFsICR7aXRlbS5sYWJlbH0gZWFybGllcmB9IG9uQ2xpY2s9eygpID0+IHVwZGF0ZSgnUmVvcmRlciBkaXNjaXBsaW5lIHJldmVhbCcsIChkcmFmdCkgPT4geyBjb25zdCBbbW92ZWRdID0gZHJhZnQuaXRlbXMuc3BsaWNlKGl0ZW1JbmRleCwgMSk7IGRyYWZ0Lml0ZW1zLnNwbGljZShpdGVtSW5kZXggLSAxLCAwLCBtb3ZlZCk7IH0pfT7ihpE8L2J1dHRvbj5cbiAgICAgICAgICAgICAgICA8YnV0dG9uIHR5cGU9XCJidXR0b25cIiBkaXNhYmxlZD17aXRlbUluZGV4ID09PSByZXZlYWwuaXRlbXMubGVuZ3RoIC0gMX0gYXJpYS1sYWJlbD17YFJldmVhbCAke2l0ZW0ubGFiZWx9IGxhdGVyYH0gb25DbGljaz17KCkgPT4gdXBkYXRlKCdSZW9yZGVyIGRpc2NpcGxpbmUgcmV2ZWFsJywgKGRyYWZ0KSA9PiB7IGNvbnN0IFttb3ZlZF0gPSBkcmFmdC5pdGVtcy5zcGxpY2UoaXRlbUluZGV4LCAxKTsgZHJhZnQuaXRlbXMuc3BsaWNlKGl0ZW1JbmRleCArIDEsIDAsIG1vdmVkKTsgfSl9PuKGkzwvYnV0dG9uPlxuICAgICAgICAgICAgICA8L3NwYW4+XG4gICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICApKX1cbiAgICAgICAgPC9kaXY+XG4gICAgICA8L2RldGFpbHM+XG4gICAgICA8cCBjbGFzc05hbWU9XCJhYm91dC1lZGl0b3ItaGVscFwiPlRoZSBzaXggcG9pbnRzIHBlcnNpc3QgYWZ0ZXIgdGhlIGxhYmVscyBsZWF2ZS4gQW4gZWRpdG9yaWFsIGJsb2NrIG1hcmtlZCDigJxSZWNvbm5lY3QgcG9pbnQgZ3JpZOKAnSByZXN0b3JlcyB0aGUgc3Vycm91bmRpbmcgZ3JpZCBhcyB0aGF0IHBhcmFncmFwaCBlbnRlcnMuPC9wPlxuICAgIDwvPlxuICApO1xufVxuXG5mdW5jdGlvbiBDYW1lcmFJbnNwZWN0b3IoeyBzdG9yZSwgc25hcHNob3QsIHNlY3Rpb24gfSkge1xuICBjb25zdCBzZWN0aW9uSW5kZXggPSBnZXRTZWN0aW9uSW5kZXgoc25hcHNob3QuZG9jdW1lbnQsIHNlY3Rpb24uaWQpO1xuICBjb25zdCBrZXlJbmRleCA9IHNuYXBzaG90LnNlbGVjdGlvbi5rZXlJbmRleDtcbiAgY29uc3Qgc2VsZWN0ZWRLZXkgPSBzZWN0aW9uLmNhbWVyYS5rZXlzW2tleUluZGV4XTtcbiAgY29uc3Qga2V5ID0gc2VsZWN0ZWRLZXkgJiYgc2VsZWN0ZWRLZXkuYXQgPiAwICYmIHNlbGVjdGVkS2V5LmF0IDwgMSA/IHNlbGVjdGVkS2V5IDogbnVsbDtcbiAgY29uc3QgbG9jYWwgPSBnZXRMb2NhbFByb2dyZXNzKHNuYXBzaG90LmNvbXBpbGVkUGxhbiwgc2VjdGlvbiwgc25hcHNob3QudHJhbnNwb3J0LnN0b3J5V1UpO1xuICBjb25zdCB0YXJnZXRBdCA9IE1hdGgubWluKDAuOTk1LCBNYXRoLm1heCgwLjAwNSwgc25hcEFib3V0TmFycmF0aXZlVGltZWxpbmVWYWx1ZShsb2NhbCkpKTtcbiAgY29uc3QgYXBwbHlQcmVzZXQgPSAocHJlc2V0KSA9PiBzdG9yZS5jb21taXQoYEFwcGx5ICR7cHJlc2V0fSBjYW1lcmEgcmVjaXBlYCwgKGRyYWZ0KSA9PiB7XG4gICAgY29uc3QgcmVjaXBlcyA9IHtcbiAgICAgIFB1c2g6IFtcbiAgICAgICAgeyBhdDogMCwgb2Zmc2V0OiBbMCwgMCwgMF0sIGxvb2tBdE9mZnNldDogWzAsIDAsIC0xXSwgZm92OiA0OCwgcm9sbDogMCwgZWFzaW5nOiAnc21vb3Roc3RlcCcgfSxcbiAgICAgICAgeyBhdDogMSwgb2Zmc2V0OiBbMCwgMCwgLTEuMl0sIGxvb2tBdE9mZnNldDogWzAsIDAsIC0xXSwgZm92OiA0NSwgcm9sbDogMCwgZWFzaW5nOiAnc21vb3Roc3RlcCcgfSxcbiAgICAgIF0sXG4gICAgICBHbGlkZTogW1xuICAgICAgICB7IGF0OiAwLCBvZmZzZXQ6IFstMC44LCAwLCAwXSwgbG9va0F0T2Zmc2V0OiBbMC40LCAwLCAtMV0sIGZvdjogNDgsIHJvbGw6IDAsIGVhc2luZzogJ3Ntb290aHN0ZXAnIH0sXG4gICAgICAgIHsgYXQ6IDEsIG9mZnNldDogWzAuOCwgMCwgMF0sIGxvb2tBdE9mZnNldDogWy0wLjQsIDAsIC0xXSwgZm92OiA0OCwgcm9sbDogMCwgZWFzaW5nOiAnc21vb3Roc3RlcCcgfSxcbiAgICAgIF0sXG4gICAgICBPcmJpdDogW1xuICAgICAgICB7IGF0OiAwLCBvZmZzZXQ6IFstMC43LCAwLCAwXSwgbG9va0F0T2Zmc2V0OiBbMC43LCAwLCAtMV0sIGZvdjogNDgsIHJvbGw6IC0wLjA4LCBlYXNpbmc6ICdzbW9vdGhzdGVwJyB9LFxuICAgICAgICB7IGF0OiAwLjUsIG9mZnNldDogWzAuNywgMC4yNSwgMF0sIGxvb2tBdE9mZnNldDogWy0wLjcsIC0wLjEsIC0xXSwgZm92OiA0OCwgcm9sbDogMC4wOCwgZWFzaW5nOiAnc21vb3Roc3RlcCcgfSxcbiAgICAgICAgeyBhdDogMSwgb2Zmc2V0OiBbMCwgMCwgMF0sIGxvb2tBdE9mZnNldDogWzAsIDAsIC0xXSwgZm92OiA0OCwgcm9sbDogMCwgZWFzaW5nOiAnc21vb3Roc3RlcCcgfSxcbiAgICAgIF0sXG4gICAgICBSZXZlYWw6IFtcbiAgICAgICAgeyBhdDogMCwgb2Zmc2V0OiBbMCwgLTAuNDUsIDAuNV0sIGxvb2tBdE9mZnNldDogWzAsIDAuMywgLTFdLCBmb3Y6IDU2LCByb2xsOiAwLCBlYXNpbmc6ICdzbW9vdGhzdGVwJyB9LFxuICAgICAgICB7IGF0OiAxLCBvZmZzZXQ6IFswLCAwLCAwXSwgbG9va0F0T2Zmc2V0OiBbMCwgMCwgLTFdLCBmb3Y6IDQ2LCByb2xsOiAwLCBlYXNpbmc6ICdzbW9vdGhzdGVwJyB9LFxuICAgICAgXSxcbiAgICAgIFJlc29sdmU6IFtcbiAgICAgICAgeyBhdDogMCwgb2Zmc2V0OiBbMC4zLCAwLjIsIDBdLCBsb29rQXRPZmZzZXQ6IFstMC4zLCAtMC4yLCAtMV0sIGZvdjogNTIsIHJvbGw6IDAuMTQsIGVhc2luZzogJ3Ntb290aHN0ZXAnIH0sXG4gICAgICAgIHsgYXQ6IDEsIG9mZnNldDogWzAsIDAsIDBdLCBsb29rQXRPZmZzZXQ6IFswLCAwLCAtMV0sIGZvdjogNDgsIHJvbGw6IDAsIGVhc2luZzogJ3Ntb290aHN0ZXAnIH0sXG4gICAgICBdLFxuICAgIH07XG4gICAgZHJhZnQuc2VjdGlvbnNbc2VjdGlvbkluZGV4XS5jYW1lcmEua2V5cyA9IHJlY2lwZXNbcHJlc2V0XTtcbiAgICBicmlkZ2VDYW1lcmFTZWN0aW9uKGRyYWZ0LCBzZWN0aW9uSW5kZXgpO1xuICB9LCB7IHNlbGVjdGlvbjogeyB0eXBlOiAnc2VjdGlvbicsIHNlY3Rpb25JZDogc2VjdGlvbi5pZCB9IH0pO1xuICBjb25zdCBleGlzdGluZ0tleUF0UGxheWhlYWQgPSBzZWN0aW9uLmNhbWVyYS5rZXlzLmZpbmRJbmRleCgoaXRlbSkgPT4gKFxuICAgIGl0ZW0uYXQgPiAwICYmIGl0ZW0uYXQgPCAxICYmIE1hdGguYWJzKGl0ZW0uYXQgLSB0YXJnZXRBdCkgPCAwLjAwMjVcbiAgKSk7XG4gIGNvbnN0IHNldEtleSA9ICgpID0+IHtcbiAgICBpZiAoZXhpc3RpbmdLZXlBdFBsYXloZWFkID49IDApIHtcbiAgICAgIHN0b3JlLnNldFNlbGVjdGlvbih7IHR5cGU6ICdjYW1lcmEta2V5Jywgc2VjdGlvbklkOiBzZWN0aW9uLmlkLCBrZXlJbmRleDogZXhpc3RpbmdLZXlBdFBsYXloZWFkIH0pO1xuICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICBjb25zdCBpbnNlcnRpb25JbmRleCA9IHNlY3Rpb24uY2FtZXJhLmtleXMuZmluZEluZGV4KChpdGVtKSA9PiBpdGVtLmF0ID4gdGFyZ2V0QXQpO1xuICAgIGNvbnN0IHNlbGVjdGVkS2V5SW5kZXggPSBpbnNlcnRpb25JbmRleCA8IDAgPyBzZWN0aW9uLmNhbWVyYS5rZXlzLmxlbmd0aCA6IGluc2VydGlvbkluZGV4O1xuICAgIGNvbnN0IHNhbXBsZWQgPSBzYW1wbGVBYm91dE5hcnJhdGl2ZVBsYW4oc25hcHNob3QuY29tcGlsZWRQbGFuLCBzbmFwc2hvdC50cmFuc3BvcnQuc3RvcnlXVSk7XG4gICAgY29uc3QgYmFzZVogPSBzbmFwc2hvdC5kb2N1bWVudC5nbG9iYWxzLmNhbWVyYS5zdGFydFogLSAoc25hcHNob3QudHJhbnNwb3J0LnN0b3J5V1UgKiBzYW1wbGVkLmNhbWVyYS5jYWRlbmNlKTtcbiAgICBjb25zdCBuZXdLZXkgPSB7XG4gICAgICBhdDogdGFyZ2V0QXQsXG4gICAgICBvZmZzZXQ6IFtzYW1wbGVkLmNhbWVyYS5wb3NpdGlvblswXSwgc2FtcGxlZC5jYW1lcmEucG9zaXRpb25bMV0sIHNhbXBsZWQuY2FtZXJhLnBvc2l0aW9uWzJdIC0gYmFzZVpdLFxuICAgICAgbG9va0F0T2Zmc2V0OiBzYW1wbGVkLmNhbWVyYS50YXJnZXQubWFwKCh2YWx1ZSwgYXhpcykgPT4gdmFsdWUgLSBzYW1wbGVkLmNhbWVyYS5wb3NpdGlvbltheGlzXSksXG4gICAgICBmb3Y6IHNhbXBsZWQuY2FtZXJhLmZvdixcbiAgICAgIHJvbGw6IHNhbXBsZWQuY2FtZXJhLnJvbGwsXG4gICAgICBlYXNpbmc6ICdzbW9vdGhzdGVwJyxcbiAgICB9O1xuICAgIHN0b3JlLmNvbW1pdCgnU2V0IGNhbWVyYSBrZXknLCAoZHJhZnQpID0+IHtcbiAgICAgIGRyYWZ0LnNlY3Rpb25zW3NlY3Rpb25JbmRleF0uY2FtZXJhLmtleXMucHVzaChuZXdLZXkpO1xuICAgICAgZHJhZnQuc2VjdGlvbnNbc2VjdGlvbkluZGV4XS5jYW1lcmEua2V5cy5zb3J0KChhLCBiKSA9PiBhLmF0IC0gYi5hdCk7XG4gICAgfSwgeyBzZWxlY3Rpb246IHsgdHlwZTogJ2NhbWVyYS1rZXknLCBzZWN0aW9uSWQ6IHNlY3Rpb24uaWQsIGtleUluZGV4OiBzZWxlY3RlZEtleUluZGV4IH0gfSk7XG4gIH07XG4gIGNvbnN0IHJlY2lwZXMgPSA8ZGl2IGNsYXNzTmFtZT1cImFib3V0LWVkaXRvci1jYW1lcmEtcmVjaXBlc1wiPntbJ1B1c2gnLCAnR2xpZGUnLCAnT3JiaXQnLCAnUmV2ZWFsJywgJ1Jlc29sdmUnXS5tYXAoKG5hbWUpID0+IDxidXR0b24gdHlwZT1cImJ1dHRvblwiIGtleT17bmFtZX0gb25DbGljaz17KCkgPT4gYXBwbHlQcmVzZXQobmFtZSl9PntuYW1lfTwvYnV0dG9uPil9PC9kaXY+O1xuICBpZiAoIWtleSkge1xuICAgIHJldHVybiA8PjxoZWFkZXI+PHNwYW4+Q2FtZXJhIHRyYWNrPC9zcGFuPjxzdHJvbmc+RWRpdGluZyBTZWN0aW9uIGJhc2U8L3N0cm9uZz48L2hlYWRlcj48cCBjbGFzc05hbWU9XCJhYm91dC1lZGl0b3ItaGVscFwiPlRoZSBkb2xseSBhbmQgU2VjdGlvbiBqb2lucyBhcmUgY29udGludW91cyBhdXRvbWF0aWNhbGx5LiBBZGQgdmlzaWJsZSBrZXlzIG9ubHkgd2hlcmUgdGhlIGZyYW1pbmcsIGFpbSwgcm9sbCwgb3IgbGVucyBzaG91bGQgY2hhbmdlLjwvcD57cmVjaXBlc308YnV0dG9uIHR5cGU9XCJidXR0b25cIiBjbGFzc05hbWU9XCJhYm91dC1lZGl0b3Itd2lkZS1hY3Rpb25cIiBvbkNsaWNrPXtzZXRLZXl9PlNldCBjYW1lcmEga2V5IGF0IHtmb3JtYXRDYW1lcmFQZXJjZW50KHRhcmdldEF0KX08L2J1dHRvbj48Lz47XG4gIH1cbiAgY29uc3QgdXBkYXRlID0gKGZpZWxkLCB2YWx1ZSkgPT4gc3RvcmUuY29tbWl0KGBFZGl0IGNhbWVyYSAke2ZpZWxkfWAsIChkcmFmdCkgPT4ge1xuICAgIGRyYWZ0LnNlY3Rpb25zW3NlY3Rpb25JbmRleF0uY2FtZXJhLmtleXNba2V5SW5kZXhdW2ZpZWxkXSA9IEFycmF5LmlzQXJyYXkodmFsdWUpID8gWy4uLnZhbHVlXSA6IHZhbHVlO1xuICAgIGlmIChDQU1FUkFfUE9TRV9GSUVMRFMuaGFzKGZpZWxkKSkgbGlua0NhbWVyYUJvdW5kYXJ5KGRyYWZ0LCBzZWN0aW9uSW5kZXgsIGtleUluZGV4KTtcbiAgfSwgeyBjb2FsZXNjZUtleTogYGNhbWVyYToke3NlY3Rpb24uaWR9OiR7a2V5SW5kZXh9OiR7ZmllbGR9YCwgc2VsZWN0aW9uOiBzbmFwc2hvdC5zZWxlY3Rpb24gfSk7XG4gIGNvbnN0IHVwZGF0ZVZlY3RvciA9IChmaWVsZCwgYXhpcywgdmFsdWUpID0+IHtcbiAgICBjb25zdCBuZXh0ID0gWy4uLmtleVtmaWVsZF1dO1xuICAgIG5leHRbYXhpc10gPSB2YWx1ZTtcbiAgICB1cGRhdGUoZmllbGQsIG5leHQpO1xuICB9O1xuICBjb25zdCB0aW1pbmdCb3VuZHMgPSBnZXRBYm91dE5hcnJhdGl2ZUNhbWVyYUtleVRpbWluZ0JvdW5kcyhzZWN0aW9uLmNhbWVyYS5rZXlzLCBrZXlJbmRleCk7XG4gIGNvbnN0IGV4dGVudEZpZWxkID0gc25hcHNob3QucHJldmlld1Byb2ZpbGUgPT09ICdtb2JpbGUnID8gJ21vYmlsZUV4dGVudFdVJyA6ICdleHRlbnRXVSc7XG4gIGNvbnN0IGV4dGVudExhYmVsID0gc25hcHNob3QucHJldmlld1Byb2ZpbGUgPT09ICdtb2JpbGUnID8gJ01vYmlsZSBsZW5ndGgnIDogJ1NlY3Rpb24gbGVuZ3RoJztcbiAgY29uc3QgdXBkYXRlRXh0ZW50ID0gKHZhbHVlKSA9PiBzdG9yZS5jb21taXQoJ0NoYW5nZSBTZWN0aW9uIGV4dGVudCcsIChkcmFmdCkgPT4ge1xuICAgIGRyYWZ0LnNlY3Rpb25zW3NlY3Rpb25JbmRleF1bZXh0ZW50RmllbGRdID0gdmFsdWU7XG4gIH0sIHsgY29hbGVzY2VLZXk6IGBzZWN0aW9uOiR7c2VjdGlvbi5pZH06JHtleHRlbnRGaWVsZH1gLCBzZWxlY3Rpb246IHNuYXBzaG90LnNlbGVjdGlvbiB9KTtcbiAgcmV0dXJuIChcbiAgICA8PlxuICAgICAgPGhlYWRlcj48c3Bhbj5DYW1lcmEga2V5PC9zcGFuPjxzdHJvbmc+e2Zvcm1hdENhbWVyYVBlcmNlbnQoa2V5LmF0KX0gdGhyb3VnaCB7c2VjdGlvbi5sYWJlbH08L3N0cm9uZz48L2hlYWRlcj5cbiAgICAgIHtyZWNpcGVzfVxuICAgICAgPE51bWJlclByb3BlcnR5XG4gICAgICAgIGxhYmVsPVwiUG9zaXRpb25cIlxuICAgICAgICB2YWx1ZT17TnVtYmVyKChrZXkuYXQgKiAxMDApLnRvRml4ZWQoMSkpfVxuICAgICAgICBtaW49e051bWJlcigodGltaW5nQm91bmRzLm1pbiAqIDEwMCkudG9GaXhlZCgxKSl9XG4gICAgICAgIG1heD17TnVtYmVyKCh0aW1pbmdCb3VuZHMubWF4ICogMTAwKS50b0ZpeGVkKDEpKX1cbiAgICAgICAgc3RlcD17MC41fVxuICAgICAgICB1bml0PVwiJVwiXG4gICAgICAgIG9uQ2hhbmdlPXsodmFsdWUpID0+IHVwZGF0ZSgnYXQnLCBNYXRoLm1pbih0aW1pbmdCb3VuZHMubWF4LCBNYXRoLm1heCh0aW1pbmdCb3VuZHMubWluLCBzbmFwQWJvdXROYXJyYXRpdmVUaW1lbGluZVZhbHVlKHZhbHVlIC8gMTAwKSkpKX1cbiAgICAgIC8+XG4gICAgICA8TnVtYmVyUHJvcGVydHkgbGFiZWw9e2V4dGVudExhYmVsfSB2YWx1ZT17c2VjdGlvbltleHRlbnRGaWVsZF19IG1pbj17MX0gbWF4PXs4fSBzdGVwPXswLjA1fSB1bml0PVwiV1VcIiBvbkNoYW5nZT17dXBkYXRlRXh0ZW50fSAvPlxuICAgICAge1snWCBvZmZzZXQnLCAnWSBvZmZzZXQnLCAnRm9yd2FyZCBvZmZzZXQnXS5tYXAoKGxhYmVsLCBheGlzKSA9PiA8TnVtYmVyUHJvcGVydHkga2V5PXtsYWJlbH0gbGFiZWw9e2xhYmVsfSB2YWx1ZT17a2V5Lm9mZnNldFtheGlzXX0gbWluPXstOH0gbWF4PXs4fSBzdGVwPXswLjAyfSB1bml0PVwiV1VcIiBvbkNoYW5nZT17KHZhbHVlKSA9PiB1cGRhdGVWZWN0b3IoJ29mZnNldCcsIGF4aXMsIHZhbHVlKX0gLz4pfVxuICAgICAge1snQWltIFgnLCAnQWltIFknLCAnQWltIGRlcHRoJ10ubWFwKChsYWJlbCwgYXhpcykgPT4gPE51bWJlclByb3BlcnR5IGtleT17bGFiZWx9IGxhYmVsPXtsYWJlbH0gdmFsdWU9e2tleS5sb29rQXRPZmZzZXRbYXhpc119IG1pbj17LTh9IG1heD17OH0gc3RlcD17MC4wMn0gdW5pdD1cIldVXCIgb25DaGFuZ2U9eyh2YWx1ZSkgPT4gdXBkYXRlVmVjdG9yKCdsb29rQXRPZmZzZXQnLCBheGlzLCB2YWx1ZSl9IC8+KX1cbiAgICAgIDxOdW1iZXJQcm9wZXJ0eSBsYWJlbD1cIkZpZWxkIG9mIHZpZXdcIiB2YWx1ZT17a2V5LmZvdn0gbWluPXsyMH0gbWF4PXs5MH0gc3RlcD17MX0gdW5pdD1cIsKwXCIgb25DaGFuZ2U9eyh2YWx1ZSkgPT4gdXBkYXRlKCdmb3YnLCB2YWx1ZSl9IC8+XG4gICAgICA8TnVtYmVyUHJvcGVydHkgbGFiZWw9XCJSb2xsXCIgdmFsdWU9e2tleS5yb2xsfSBtaW49ey0xLjJ9IG1heD17MS4yfSBzdGVwPXswLjAxfSB1bml0PVwicmFkXCIgb25DaGFuZ2U9eyh2YWx1ZSkgPT4gdXBkYXRlKCdyb2xsJywgdmFsdWUpfSAvPlxuICAgICAgPFByb3BlcnR5IGxhYmVsPVwiRWFzaW5nXCI+PHNlbGVjdCB2YWx1ZT17a2V5LmVhc2luZ30gb25DaGFuZ2U9eyhldmVudCkgPT4gdXBkYXRlKCdlYXNpbmcnLCBldmVudC50YXJnZXQudmFsdWUpfT48b3B0aW9uIHZhbHVlPVwic21vb3Roc3RlcFwiPlNtb290aHN0ZXA8L29wdGlvbj48b3B0aW9uIHZhbHVlPVwiZWFzZS1pbi1vdXRcIj5FYXNlIGluIG91dDwvb3B0aW9uPjwvc2VsZWN0PjwvUHJvcGVydHk+XG4gICAgICA8YnV0dG9uIHR5cGU9XCJidXR0b25cIiBjbGFzc05hbWU9XCJhYm91dC1lZGl0b3Itd2lkZS1hY3Rpb25cIiBkaXNhYmxlZD17ZXhpc3RpbmdLZXlBdFBsYXloZWFkID49IDB9IG9uQ2xpY2s9e3NldEtleX0+e2V4aXN0aW5nS2V5QXRQbGF5aGVhZCA+PSAwID8gYENhbWVyYSBrZXkgYWxyZWFkeSBhdCAke2Zvcm1hdENhbWVyYVBlcmNlbnQodGFyZ2V0QXQpfWAgOiBgU2V0IGFub3RoZXIga2V5IGF0ICR7Zm9ybWF0Q2FtZXJhUGVyY2VudCh0YXJnZXRBdCl9YH08L2J1dHRvbj5cbiAgICAgIDxidXR0b24gdHlwZT1cImJ1dHRvblwiIGNsYXNzTmFtZT1cImFib3V0LWVkaXRvci1kYW5nZXJcIiBvbkNsaWNrPXsoKSA9PiBzdG9yZS5jb21taXQoJ0RlbGV0ZSBjYW1lcmEga2V5JywgKGRyYWZ0KSA9PiB7IGRyYWZ0LnNlY3Rpb25zW3NlY3Rpb25JbmRleF0uY2FtZXJhLmtleXMuc3BsaWNlKGtleUluZGV4LCAxKTsgfSwgeyBzZWxlY3Rpb246IHsgdHlwZTogJ3NlY3Rpb24nLCBzZWN0aW9uSWQ6IHNlY3Rpb24uaWQgfSB9KX0+RGVsZXRlIGtleTwvYnV0dG9uPlxuICAgIDwvPlxuICApO1xufVxuXG5jb25zdCBDT1JSRVNQT05ERU5DRV9MQUJFTFMgPSBPYmplY3QuZnJlZXplKHtcbiAgJ2luZGV4LXYxJzogJ0luZGV4IG9yZGVyJyxcbiAgJ3N0YWJsZS1zZWVkJzogJ1N0YWJsZSBzZWVkJyxcbiAgJ3NwYXRpYWwtbmVhcmVzdC12MSc6ICdMb2NhbCB0cmF2ZWwgKGFwcHJveC4pJyxcbiAgJ2dyb3VwLWF3YXJlJzogJ0dyb3VwIGF3YXJlJyxcbn0pO1xuXG5mdW5jdGlvbiBXb3JsZEluc3BlY3Rvcih7IHN0b3JlLCBzbmFwc2hvdCwgc2VjdGlvbiwgcnVudGltZU1ldHJpY3MgfSkge1xuICBjb25zdCBzZWN0aW9uSW5kZXggPSBnZXRTZWN0aW9uSW5kZXgoc25hcHNob3QuZG9jdW1lbnQsIHNlY3Rpb24uaWQpO1xuICBpZiAoc2VjdGlvbi53b3JsZC5tb2RlICE9PSAnc2V0Jykge1xuICAgIHJldHVybiA8PjxoZWFkZXI+PHNwYW4+V29ybGQgdHJhY2s8L3NwYW4+PHN0cm9uZz5Jbmhlcml0ZWQgV29ybGQ8L3N0cm9uZz48L2hlYWRlcj48cCBjbGFzc05hbWU9XCJhYm91dC1lZGl0b3ItaGVscFwiPlRoaXMgU2VjdGlvbiBrZWVwcyB0aGUgcHJldmlvdXMgV29ybGQuIENob29zZSDigJxDcmVhdGUgV29ybGQgY2xpcOKAnSBvbmx5IHdoZW4gdGhlIHNoYXBlIHNob3VsZCBjaGFuZ2UgaGVyZS48L3A+PGJ1dHRvbiB0eXBlPVwiYnV0dG9uXCIgY2xhc3NOYW1lPVwiYWJvdXQtZWRpdG9yLXdpZGUtYWN0aW9uXCIgb25DbGljaz17KCkgPT4gc3RvcmUuY29tbWl0KCdDcmVhdGUgV29ybGQgY2xpcCcsIChkcmFmdCkgPT4ge1xuICAgICAgZHJhZnQuc2VjdGlvbnNbc2VjdGlvbkluZGV4XS53b3JsZCA9IGNsb25lQWJvdXROYXJyYXRpdmVEb2N1bWVudChkcmFmdC5zZWN0aW9ucy5zbGljZSgwLCBzZWN0aW9uSW5kZXgpLnJldmVyc2UoKS5maW5kKChpdGVtKSA9PiBpdGVtLndvcmxkLm1vZGUgPT09ICdzZXQnKT8ud29ybGQgfHwgZHJhZnQuc2VjdGlvbnNbMF0ud29ybGQpO1xuICAgIH0pfT5DcmVhdGUgV29ybGQgY2xpcDwvYnV0dG9uPjwvPjtcbiAgfVxuICBjb25zdCB3b3JsZCA9IHNlY3Rpb24ud29ybGQ7XG4gIGNvbnN0IHNoYXBlID0gQUJPVVRfTkFSUkFUSVZFX1NIQVBFX0RFRklOSVRJT05TW3dvcmxkLnNoYXBlSWRdO1xuICBjb25zdCB0cmFuc2l0aW9uTGltaXQgPSBnZXRBYm91dE5hcnJhdGl2ZVdvcmxkVHJhbnNpdGlvbkxpbWl0KHNuYXBzaG90LmNvbXBpbGVkUGxhbiwgc2VjdGlvbkluZGV4KTtcbiAgY29uc3QgdHJhbnNpdGlvbk1heCA9IE1hdGgubWF4KHRyYW5zaXRpb25MaW1pdCwgd29ybGQudHJhbnNpdGlvbkluLmVuZCwgMSk7XG4gIGNvbnN0IHRyYW5zaXRpb25FbmFibGVkID0gd29ybGQudHJhbnNpdGlvbkluLnR5cGUgIT09ICdjdXQnO1xuICBjb25zdCBjb3JyZXNwb25kZW5jZUVuYWJsZWQgPSBbJ21vcnBoJywgJ2Rpc3NvbHZlLW1vcnBoJ10uaW5jbHVkZXMod29ybGQudHJhbnNpdGlvbkluLnR5cGUpO1xuICBjb25zdCBwcmV2aW91c1dvcmxkU2VjdGlvbiA9IHNuYXBzaG90LmRvY3VtZW50LnNlY3Rpb25zXG4gICAgLnNsaWNlKDAsIHNlY3Rpb25JbmRleClcbiAgICAucmV2ZXJzZSgpXG4gICAgLmZpbmQoKGl0ZW0pID0+IGl0ZW0ud29ybGQubW9kZSA9PT0gJ3NldCcpO1xuICBjb25zdCBzb3VyY2VTaGFwZSA9IEFCT1VUX05BUlJBVElWRV9TSEFQRV9ERUZJTklUSU9OU1twcmV2aW91c1dvcmxkU2VjdGlvbj8ud29ybGQuc2hhcGVJZCB8fCB3b3JsZC5zaGFwZUlkXTtcbiAgY29uc3QgcHJlcGFyZWQgPSBydW50aW1lTWV0cmljcz8ucHJlcGFyZWRXb3JsZElkcz8uaW5jbHVkZXMoc2VjdGlvbi5pZCk7XG4gIGNvbnN0IGNvcnJlc3BvbmRlbmNlU3RhdHVzID0gcnVudGltZU1ldHJpY3M/LmNvcnJlc3BvbmRlbmNlU2VxdWVuY2VTdGF0ZSA9PT0gJ2ZhaWxlZCdcbiAgICA/ICdGYWlsZWQnXG4gICAgOiBydW50aW1lTWV0cmljcz8uY29ycmVzcG9uZGVuY2VTZXF1ZW5jZVN0YXRlID09PSAnbG9hZGluZydcbiAgICAgID8gJ1ByZXBhcmluZydcbiAgICAgIDogcHJlcGFyZWRcbiAgICAgICAgPyBydW50aW1lTWV0cmljcz8uY29ycmVzcG9uZGVuY2VGYWxsYmFjayAmJiBydW50aW1lTWV0cmljcz8uY29ycmVzcG9uZGVuY2VUb1dvcmxkSWQgPT09IHNlY3Rpb24uaWRcbiAgICAgICAgICA/ICdCYXNlbGluZSBmYWxsYmFjaydcbiAgICAgICAgICA6ICdSZWFkeSdcbiAgICAgICAgOiAnUHJlcGFyaW5nJztcbiAgY29uc3QgdXBkYXRlID0gKGxhYmVsLCBtdXRhdGUsIGNvYWxlc2NlS2V5ID0gbnVsbCkgPT4gc3RvcmUuY29tbWl0KGxhYmVsLCAoZHJhZnQpID0+IG11dGF0ZShkcmFmdC5zZWN0aW9uc1tzZWN0aW9uSW5kZXhdLndvcmxkKSwgeyBjb2FsZXNjZUtleSwgc2VsZWN0aW9uOiBzbmFwc2hvdC5zZWxlY3Rpb24gfSk7XG4gIGNvbnN0IHRyeVNoYXBlID0gKHNoYXBlSWQpID0+IHN0b3JlLmJlZ2luVHJ5KGBSZXBsYWNlIFNoYXBlIHdpdGggJHtBQk9VVF9OQVJSQVRJVkVfU0hBUEVfREVGSU5JVElPTlNbc2hhcGVJZF0ubGFiZWx9YCwgKGRyYWZ0KSA9PiB7XG4gICAgY29uc3QgdGFyZ2V0ID0gZHJhZnQuc2VjdGlvbnNbc2VjdGlvbkluZGV4XS53b3JsZDtcbiAgICB0YXJnZXQuc2hhcGVJZCA9IHNoYXBlSWQ7XG4gICAgdGFyZ2V0LnNoYXBlUGFyYW1ldGVycyA9IE9iamVjdC5mcm9tRW50cmllcyhBQk9VVF9OQVJSQVRJVkVfU0hBUEVfREVGSU5JVElPTlNbc2hhcGVJZF0ucGFyYW1ldGVycy5tYXAoKGNvbnRyb2wpID0+IFtjb250cm9sLmlkLCBjb250cm9sLmlkID09PSAnZGVuc2l0eScgPyAxIDogKGNvbnRyb2wubWluICsgY29udHJvbC5tYXgpIC8gMl0pKTtcbiAgfSk7XG4gIHJldHVybiAoXG4gICAgPD5cbiAgICAgIDxoZWFkZXI+PHNwYW4+V29ybGQgY2xpcDwvc3Bhbj48c3Ryb25nPntzaGFwZT8ubGFiZWwgfHwgd29ybGQuc2hhcGVJZH08L3N0cm9uZz48L2hlYWRlcj5cbiAgICAgIDxkaXYgY2xhc3NOYW1lPVwiYWJvdXQtZWRpdG9yLXNoYXBlLWNhdGFsb2dcIj5cbiAgICAgICAge09iamVjdC52YWx1ZXMoQUJPVVRfTkFSUkFUSVZFX1NIQVBFX0RFRklOSVRJT05TKS5tYXAoKGl0ZW0pID0+IChcbiAgICAgICAgICA8YnV0dG9uIHR5cGU9XCJidXR0b25cIiBrZXk9e2l0ZW0uaWR9IGRpc2FibGVkPXtzZWN0aW9uLmxvY2tlZH0gY2xhc3NOYW1lPXtpdGVtLmlkID09PSB3b3JsZC5zaGFwZUlkID8gJ2lzLXNlbGVjdGVkJyA6ICcnfSBvbkNsaWNrPXsoKSA9PiB0cnlTaGFwZShpdGVtLmlkKX0+XG4gICAgICAgICAgICA8aSAvPjxzcGFuPjxzdHJvbmc+e2l0ZW0ubGFiZWx9PC9zdHJvbmc+PHNtYWxsPkNvc3Qge2l0ZW0uY29zdH0gwrcgUG9pbnQgZmllbGQ8L3NtYWxsPjwvc3Bhbj5cbiAgICAgICAgICA8L2J1dHRvbj5cbiAgICAgICAgKSl9XG4gICAgICA8L2Rpdj5cbiAgICAgIHtzbmFwc2hvdC50cnlTdGF0ZSA/IDxkaXYgY2xhc3NOYW1lPVwiYWJvdXQtZWRpdG9yLXRyeVwiPjxzcGFuPlRyeWluZyB7c25hcHNob3QudHJ5U3RhdGUubGFiZWx9PC9zcGFuPjxidXR0b24gdHlwZT1cImJ1dHRvblwiIG9uQ2xpY2s9eygpID0+IHN0b3JlLmNhbmNlbFRyeSgpfT5DYW5jZWw8L2J1dHRvbj48YnV0dG9uIHR5cGU9XCJidXR0b25cIiBjbGFzc05hbWU9XCJpcy1wcmltYXJ5XCIgb25DbGljaz17KCkgPT4gc3RvcmUuYXBwbHlUcnkoKX0+QXBwbHk8L2J1dHRvbj48L2Rpdj4gOiBudWxsfVxuICAgICAgPGRldGFpbHMgb3Blbj48c3VtbWFyeT5TaGFwZSBwYXJhbWV0ZXJzPC9zdW1tYXJ5PlxuICAgICAgICB7KHNoYXBlPy5wYXJhbWV0ZXJzIHx8IFtdKS5tYXAoKGNvbnRyb2wpID0+IDxOdW1iZXJQcm9wZXJ0eSBrZXk9e2NvbnRyb2wuaWR9IGxhYmVsPXtjb250cm9sLmxhYmVsfSB2YWx1ZT17d29ybGQuc2hhcGVQYXJhbWV0ZXJzW2NvbnRyb2wuaWRdfSBtaW49e2NvbnRyb2wubWlufSBtYXg9e2NvbnRyb2wubWF4fSBzdGVwPXtjb250cm9sLnN0ZXB9IHVuaXQ9e2NvbnRyb2wudW5pdH0gb25DaGFuZ2U9eyh2YWx1ZSkgPT4gdXBkYXRlKGBDaGFuZ2UgJHtjb250cm9sLmxhYmVsfWAsIChkcmFmdCkgPT4geyBkcmFmdC5zaGFwZVBhcmFtZXRlcnNbY29udHJvbC5pZF0gPSB2YWx1ZTsgfSwgYHdvcmxkOiR7c2VjdGlvbi5pZH06JHtjb250cm9sLmlkfWApfSAvPil9XG4gICAgICAgIDxkaXYgY2xhc3NOYW1lPVwiYWJvdXQtZWRpdG9yLWlubGluZS1hY3Rpb25zXCI+PGJ1dHRvbiB0eXBlPVwiYnV0dG9uXCIgb25DbGljaz17KCkgPT4gdXBkYXRlKCdSZXNlZWQgU2hhcGUnLCAoZHJhZnQpID0+IHsgZHJhZnQuc2VlZCA9IE1hdGguZmxvb3IoTWF0aC5yYW5kb20oKSAqIDB4ZmZmZmZmZmYpOyB9KX0+UmVzZWVkPC9idXR0b24+PGNvZGU+e3dvcmxkLnNlZWR9PC9jb2RlPjwvZGl2PlxuICAgICAgPC9kZXRhaWxzPlxuICAgICAgPGRldGFpbHMgb3Blbj48c3VtbWFyeT5QbGFjZW1lbnQ8L3N1bW1hcnk+XG4gICAgICAgIDxOdW1iZXJQcm9wZXJ0eSBsYWJlbD1cIkRpc3RhbmNlIGF0IGVudHJ5XCIgdmFsdWU9e3dvcmxkLmVudHJ5RGlzdGFuY2VXVX0gbWluPXswLjJ9IG1heD17MTZ9IHN0ZXA9ezAuMDV9IHVuaXQ9XCJXVVwiIG9uQ2hhbmdlPXsodmFsdWUpID0+IHVwZGF0ZSgnTW92ZSBXb3JsZCcsIChkcmFmdCkgPT4geyBkcmFmdC5lbnRyeURpc3RhbmNlV1UgPSB2YWx1ZTsgfSwgYHdvcmxkOiR7c2VjdGlvbi5pZH06ZGlzdGFuY2VgKX0gLz5cbiAgICAgICAgPE51bWJlclByb3BlcnR5IGxhYmVsPVwiU2NhbGVcIiB2YWx1ZT17d29ybGQudHJhbnNmb3JtLnNjYWxlfSBtaW49ezAuMX0gbWF4PXszfSBzdGVwPXswLjAxfSBvbkNoYW5nZT17KHZhbHVlKSA9PiB1cGRhdGUoJ1NjYWxlIFdvcmxkJywgKGRyYWZ0KSA9PiB7IGRyYWZ0LnRyYW5zZm9ybS5zY2FsZSA9IHZhbHVlOyB9LCBgd29ybGQ6JHtzZWN0aW9uLmlkfTpzY2FsZWApfSAvPlxuICAgICAgPC9kZXRhaWxzPlxuICAgICAgPGRldGFpbHMgb3Blbj48c3VtbWFyeT5UcmFuc2l0aW9uIGluPC9zdW1tYXJ5PlxuICAgICAgICB7dHJhbnNpdGlvbkVuYWJsZWQgPyA8PlxuICAgICAgICAgIDxwIGNsYXNzTmFtZT1cImFib3V0LWVkaXRvci1oZWxwXCI+VGltaW5nIGlzIHJlbGF0aXZlIHRvIHRoaXMgU2VjdGlvbjogMSBpcyBpdHMgZW5kOyB2YWx1ZXMgYWJvdmUgMSBjb250aW51ZSBhY3Jvc3MgaW5oZXJpdGVkIFdvcmxkIFNlY3Rpb25zLiBUaGUgbmV4dCBXb3JsZCBiZWdpbnMgYXQge3RyYW5zaXRpb25MaW1pdC50b0ZpeGVkKDMpfS48L3A+XG4gICAgICAgICAgPE51bWJlclByb3BlcnR5IGxhYmVsPVwiU3RhcnRcIiB2YWx1ZT17d29ybGQudHJhbnNpdGlvbkluLnN0YXJ0fSBtaW49ezB9IG1heD17dHJhbnNpdGlvbk1heH0gc3RlcD17MC4wMDV9IHVuaXQ9XCLDlyBzZWN0aW9uXCIgb25DaGFuZ2U9eyh2YWx1ZSkgPT4gdXBkYXRlKCdDaGFuZ2UgdHJhbnNpdGlvbiBzdGFydCcsIChkcmFmdCkgPT4geyBkcmFmdC50cmFuc2l0aW9uSW4uc3RhcnQgPSBNYXRoLm1pbih2YWx1ZSwgZHJhZnQudHJhbnNpdGlvbkluLmVuZCk7IH0pfSAvPlxuICAgICAgICAgIDxOdW1iZXJQcm9wZXJ0eSBsYWJlbD1cIkVuZFwiIHZhbHVlPXt3b3JsZC50cmFuc2l0aW9uSW4uZW5kfSBtaW49ezB9IG1heD17dHJhbnNpdGlvbk1heH0gc3RlcD17MC4wMDV9IHVuaXQ9XCLDlyBzZWN0aW9uXCIgb25DaGFuZ2U9eyh2YWx1ZSkgPT4gdXBkYXRlKCdDaGFuZ2UgdHJhbnNpdGlvbiBlbmQnLCAoZHJhZnQpID0+IHsgZHJhZnQudHJhbnNpdGlvbkluLmVuZCA9IE1hdGgubWF4KHZhbHVlLCBkcmFmdC50cmFuc2l0aW9uSW4uc3RhcnQpOyB9KX0gLz5cbiAgICAgICAgICA8UHJvcGVydHkgbGFiZWw9XCJUeXBlXCI+PHNlbGVjdCB2YWx1ZT17d29ybGQudHJhbnNpdGlvbkluLnR5cGV9IG9uQ2hhbmdlPXsoZXZlbnQpID0+IHVwZGF0ZSgnQ2hhbmdlIHRyYW5zaXRpb24gdHlwZScsIChkcmFmdCkgPT4geyBkcmFmdC50cmFuc2l0aW9uSW4udHlwZSA9IGV2ZW50LnRhcmdldC52YWx1ZTsgfSl9PjxvcHRpb24gdmFsdWU9XCJtb3JwaFwiPk1vcnBoPC9vcHRpb24+PG9wdGlvbiB2YWx1ZT1cImRpc3NvbHZlLW1vcnBoXCI+RGlzc29sdmUgbW9ycGg8L29wdGlvbj48b3B0aW9uIHZhbHVlPVwiY3Jvc3NmYWRlXCI+Q3Jvc3NmYWRlPC9vcHRpb24+PG9wdGlvbiB2YWx1ZT1cImhvbGRcIj5Ib2xkPC9vcHRpb24+PC9zZWxlY3Q+PC9Qcm9wZXJ0eT5cbiAgICAgICAgICA8UHJvcGVydHkgbGFiZWw9XCJFYXNpbmdcIj48c2VsZWN0IHZhbHVlPXt3b3JsZC50cmFuc2l0aW9uSW4uZWFzaW5nfSBvbkNoYW5nZT17KGV2ZW50KSA9PiB1cGRhdGUoJ0NoYW5nZSB0cmFuc2l0aW9uIGVhc2luZycsIChkcmFmdCkgPT4geyBkcmFmdC50cmFuc2l0aW9uSW4uZWFzaW5nID0gZXZlbnQudGFyZ2V0LnZhbHVlOyB9KX0+PG9wdGlvbiB2YWx1ZT1cImxpbmVhclwiPkxpbmVhcjwvb3B0aW9uPjxvcHRpb24gdmFsdWU9XCJzbW9vdGhzdGVwXCI+U21vb3Roc3RlcDwvb3B0aW9uPjxvcHRpb24gdmFsdWU9XCJlYXNlLWluXCI+RWFzZSBpbjwvb3B0aW9uPjxvcHRpb24gdmFsdWU9XCJlYXNlLW91dFwiPkVhc2Ugb3V0PC9vcHRpb24+PG9wdGlvbiB2YWx1ZT1cImVhc2UtaW4tb3V0XCI+RWFzZSBpbiBvdXQ8L29wdGlvbj48b3B0aW9uIHZhbHVlPVwiaG9sZFwiPkhvbGQ8L29wdGlvbj48L3NlbGVjdD48L1Byb3BlcnR5PlxuICAgICAgICAgIDxwIGNsYXNzTmFtZT1cImFib3V0LWVkaXRvci1oZWxwXCI+TWFwcyB7c291cmNlU2hhcGU/LmxhYmVsIHx8ICdwcmV2aW91cyBTaGFwZSd9IOKGkiB7c2hhcGU/LmxhYmVsIHx8IHdvcmxkLnNoYXBlSWR9LjwvcD5cbiAgICAgICAgICA8UHJvcGVydHkgbGFiZWw9XCJDb3JyZXNwb25kZW5jZVwiPjxzZWxlY3QgYXJpYS1sYWJlbD1cIkNvcnJlc3BvbmRlbmNlXCIgdmFsdWU9e3dvcmxkLnRyYW5zaXRpb25Jbi5jb3JyZXNwb25kZW5jZX0gZGlzYWJsZWQ9eyFjb3JyZXNwb25kZW5jZUVuYWJsZWR9IHRpdGxlPXtjb3JyZXNwb25kZW5jZUVuYWJsZWQgPyAnQ2hvb3NlIGhvdyBzb3VyY2UgcG9pbnRzIGFyZSBhc3NpZ25lZCB0byB0YXJnZXQgcG9pbnRzLicgOiAnQ29ycmVzcG9uZGVuY2UgYXBwbGllcyB0byBNb3JwaCBhbmQgRGlzc29sdmUgbW9ycGggdHJhbnNpdGlvbnMuJ30gb25DaGFuZ2U9eyhldmVudCkgPT4gdXBkYXRlKCdDaGFuZ2UgY29ycmVzcG9uZGVuY2UnLCAoZHJhZnQpID0+IHsgZHJhZnQudHJhbnNpdGlvbkluLmNvcnJlc3BvbmRlbmNlID0gZXZlbnQudGFyZ2V0LnZhbHVlOyB9KX0+e0FCT1VUX05BUlJBVElWRV9DT1JSRVNQT05ERU5DRV9NT0RFUy5tYXAoKG1vZGUpID0+IDxvcHRpb24gdmFsdWU9e21vZGV9IGtleT17bW9kZX0+e0NPUlJFU1BPTkRFTkNFX0xBQkVMU1ttb2RlXSB8fCBtb2RlfTwvb3B0aW9uPil9PC9zZWxlY3Q+PC9Qcm9wZXJ0eT5cbiAgICAgICAgICA8cCBjbGFzc05hbWU9XCJhYm91dC1lZGl0b3ItaGVscFwiIHJvbGU9XCJzdGF0dXNcIiBhcmlhLWxpdmU9XCJwb2xpdGVcIj5Db3JyZXNwb25kZW5jZToge2NvcnJlc3BvbmRlbmNlU3RhdHVzfXtwcmVwYXJlZCAmJiBydW50aW1lTWV0cmljcz8uY29ycmVzcG9uZGVuY2VUb1dvcmxkSWQgPT09IHNlY3Rpb24uaWQgJiYgTnVtYmVyLmlzRmluaXRlKHJ1bnRpbWVNZXRyaWNzPy5jb3JyZXNwb25kZW5jZUltcHJvdmVtZW50KSA/IGAgwrcgJHtNYXRoLnJvdW5kKHJ1bnRpbWVNZXRyaWNzLmNvcnJlc3BvbmRlbmNlSW1wcm92ZW1lbnQgKiAxMDApfSUgUk1TIGltcHJvdmVtZW50YCA6ICcnfS48L3A+XG4gICAgICAgICAgPGJ1dHRvbiB0eXBlPVwiYnV0dG9uXCIgY2xhc3NOYW1lPVwiYWJvdXQtZWRpdG9yLWRhbmdlclwiIG9uQ2xpY2s9eygpID0+IHN0b3JlLmNvbW1pdCgnUmVtb3ZlIFdvcmxkIHRyYW5zaXRpb24nLCAoZHJhZnQpID0+IHtcbiAgICAgICAgICAgIGNvbnN0IHRyYW5zaXRpb24gPSBkcmFmdC5zZWN0aW9uc1tzZWN0aW9uSW5kZXhdLndvcmxkLnRyYW5zaXRpb25JbjtcbiAgICAgICAgICAgIHRyYW5zaXRpb24uc3RhcnQgPSAwO1xuICAgICAgICAgICAgdHJhbnNpdGlvbi5lbmQgPSAwO1xuICAgICAgICAgICAgdHJhbnNpdGlvbi50eXBlID0gJ2N1dCc7XG4gICAgICAgICAgfSwgeyBzZWxlY3Rpb246IHsgdHlwZTogJ3dvcmxkJywgc2VjdGlvbklkOiBzZWN0aW9uLmlkIH0gfSl9PlJlbW92ZSB0cmFuc2l0aW9uIGtleWZyYW1lczwvYnV0dG9uPlxuICAgICAgICA8Lz4gOiA8PlxuICAgICAgICAgIDxwIGNsYXNzTmFtZT1cImFib3V0LWVkaXRvci1oZWxwXCI+VGhpcyBXb3JsZCBjdXRzIGluIGF0IHRoZSBTZWN0aW9uIGJvdW5kYXJ5IGFuZCBoYXMgbm8gdHJhbnNpdGlvbiBrZXlmcmFtZXMuPC9wPlxuICAgICAgICAgIDxidXR0b24gdHlwZT1cImJ1dHRvblwiIGNsYXNzTmFtZT1cImFib3V0LWVkaXRvci13aWRlLWFjdGlvblwiIG9uQ2xpY2s9eygpID0+IHN0b3JlLmNvbW1pdCgnQWRkIFdvcmxkIHRyYW5zaXRpb24nLCAoZHJhZnQpID0+IHtcbiAgICAgICAgICAgIGNvbnN0IHRyYW5zaXRpb24gPSBkcmFmdC5zZWN0aW9uc1tzZWN0aW9uSW5kZXhdLndvcmxkLnRyYW5zaXRpb25JbjtcbiAgICAgICAgICAgIHRyYW5zaXRpb24uc3RhcnQgPSBNYXRoLm1pbigwLjA4LCB0cmFuc2l0aW9uTGltaXQpO1xuICAgICAgICAgICAgdHJhbnNpdGlvbi5lbmQgPSBNYXRoLm1pbigwLjY4LCB0cmFuc2l0aW9uTGltaXQpO1xuICAgICAgICAgICAgdHJhbnNpdGlvbi50eXBlID0gJ21vcnBoJztcbiAgICAgICAgICB9LCB7IHNlbGVjdGlvbjogeyB0eXBlOiAnd29ybGQnLCBzZWN0aW9uSWQ6IHNlY3Rpb24uaWQgfSB9KX0+QWRkIHRyYW5zaXRpb24ga2V5ZnJhbWVzPC9idXR0b24+XG4gICAgICAgIDwvPn1cbiAgICAgIDwvZGV0YWlscz5cbiAgICAgIDxkZXRhaWxzIG9wZW4+PHN1bW1hcnk+TW9kaWZpZXIgc3RhY2s8L3N1bW1hcnk+XG4gICAgICAgIHt3b3JsZC5tb2RpZmllcnMubWFwKChpdGVtLCBtb2RpZmllckluZGV4KSA9PiB7XG4gICAgICAgICAgY29uc3QgZGVmaW5pdGlvbiA9IEFCT1VUX05BUlJBVElWRV9NT0RJRklFUl9ERUZJTklUSU9OU1tpdGVtLmlkXTtcbiAgICAgICAgICBjb25zdCBtb3ZlTW9kaWZpZXIgPSAoZGlyZWN0aW9uKSA9PiB1cGRhdGUoJ1Jlb3JkZXIgbW9kaWZpZXInLCAoZHJhZnQpID0+IHtcbiAgICAgICAgICAgIGNvbnN0IG5leHRJbmRleCA9IG1vZGlmaWVySW5kZXggKyBkaXJlY3Rpb247XG4gICAgICAgICAgICBpZiAobmV4dEluZGV4IDwgMCB8fCBuZXh0SW5kZXggPj0gZHJhZnQubW9kaWZpZXJzLmxlbmd0aCkgcmV0dXJuO1xuICAgICAgICAgICAgY29uc3QgW21vdmVkXSA9IGRyYWZ0Lm1vZGlmaWVycy5zcGxpY2UobW9kaWZpZXJJbmRleCwgMSk7XG4gICAgICAgICAgICBkcmFmdC5tb2RpZmllcnMuc3BsaWNlKG5leHRJbmRleCwgMCwgbW92ZWQpO1xuICAgICAgICAgIH0pO1xuICAgICAgICAgIHJldHVybiA8ZGl2IGNsYXNzTmFtZT1cImFib3V0LWVkaXRvci1tb2RpZmllclwiIGtleT17YCR7aXRlbS5pZH0tJHttb2RpZmllckluZGV4fWB9PjxkaXY+PGxhYmVsPjxpbnB1dCB0eXBlPVwiY2hlY2tib3hcIiBjaGVja2VkPXtpdGVtLmVuYWJsZWR9IG9uQ2hhbmdlPXsoZXZlbnQpID0+IHVwZGF0ZShgVG9nZ2xlICR7ZGVmaW5pdGlvbj8ubGFiZWx9YCwgKGRyYWZ0KSA9PiB7IGRyYWZ0Lm1vZGlmaWVyc1ttb2RpZmllckluZGV4XS5lbmFibGVkID0gZXZlbnQudGFyZ2V0LmNoZWNrZWQ7IH0pfSAvPntkZWZpbml0aW9uPy5sYWJlbCB8fCBpdGVtLmlkfTwvbGFiZWw+PHNwYW4+PGJ1dHRvbiB0eXBlPVwiYnV0dG9uXCIgZGlzYWJsZWQ9e21vZGlmaWVySW5kZXggPT09IDB9IG9uQ2xpY2s9eygpID0+IG1vdmVNb2RpZmllcigtMSl9IGFyaWEtbGFiZWw9XCJNb3ZlIG1vZGlmaWVyIHVwXCI+4oaRPC9idXR0b24+PGJ1dHRvbiB0eXBlPVwiYnV0dG9uXCIgZGlzYWJsZWQ9e21vZGlmaWVySW5kZXggPT09IHdvcmxkLm1vZGlmaWVycy5sZW5ndGggLSAxfSBvbkNsaWNrPXsoKSA9PiBtb3ZlTW9kaWZpZXIoMSl9IGFyaWEtbGFiZWw9XCJNb3ZlIG1vZGlmaWVyIGRvd25cIj7ihpM8L2J1dHRvbj4gQ29zdCB7ZGVmaW5pdGlvbj8uY29zdCB8fCAnPyd9PC9zcGFuPjwvZGl2PnsoZGVmaW5pdGlvbj8ucGFyYW1ldGVycyB8fCBbXSkubWFwKChjb250cm9sKSA9PiBjb250cm9sLnR5cGUgPT09ICdyYW5nZScgPyA8TnVtYmVyUHJvcGVydHkga2V5PXtjb250cm9sLmlkfSBsYWJlbD17Y29udHJvbC5sYWJlbH0gdmFsdWU9e2l0ZW0ucGFyYW1ldGVyc1tjb250cm9sLmlkXX0gbWluPXtjb250cm9sLm1pbn0gbWF4PXtjb250cm9sLm1heH0gc3RlcD17Y29udHJvbC5zdGVwfSB1bml0PXtjb250cm9sLnVuaXR9IG9uQ2hhbmdlPXsodmFsdWUpID0+IHVwZGF0ZShgQ2hhbmdlICR7Y29udHJvbC5sYWJlbH1gLCAoZHJhZnQpID0+IHsgZHJhZnQubW9kaWZpZXJzW21vZGlmaWVySW5kZXhdLnBhcmFtZXRlcnNbY29udHJvbC5pZF0gPSB2YWx1ZTsgfSwgYG1vZGlmaWVyOiR7c2VjdGlvbi5pZH06JHttb2RpZmllckluZGV4fToke2NvbnRyb2wuaWR9YCl9IC8+IDogPFByb3BlcnR5IGtleT17Y29udHJvbC5pZH0gbGFiZWw9e2NvbnRyb2wubGFiZWx9PjxzZWxlY3QgdmFsdWU9e2l0ZW0ucGFyYW1ldGVyc1tjb250cm9sLmlkXX0gb25DaGFuZ2U9eyhldmVudCkgPT4gdXBkYXRlKGBDaGFuZ2UgJHtjb250cm9sLmxhYmVsfWAsIChkcmFmdCkgPT4geyBkcmFmdC5tb2RpZmllcnNbbW9kaWZpZXJJbmRleF0ucGFyYW1ldGVyc1tjb250cm9sLmlkXSA9IGV2ZW50LnRhcmdldC52YWx1ZTsgfSl9Pntjb250cm9sLm9wdGlvbnMubWFwKChvcHRpb24pID0+IDxvcHRpb24ga2V5PXtvcHRpb259PntvcHRpb259PC9vcHRpb24+KX08L3NlbGVjdD48L1Byb3BlcnR5Pil9PC9kaXY+O1xuICAgICAgICB9KX1cbiAgICAgIDwvZGV0YWlscz5cbiAgICA8Lz5cbiAgKTtcbn1cblxuZnVuY3Rpb24gRGlhZ25vc3RpY3MoeyBkaWFnbm9zdGljcyB9KSB7XG4gIGlmICghZGlhZ25vc3RpY3MubGVuZ3RoKSByZXR1cm4gPGRpdiBjbGFzc05hbWU9XCJhYm91dC1lZGl0b3ItZGlhZ25vc3RpY3MgaXMtY2xlYXJcIj48Q2hlY2sgYXJpYS1oaWRkZW49XCJ0cnVlXCIgLz4gTm8gZGlhZ25vc3RpY3M8L2Rpdj47XG4gIHJldHVybiA8ZGl2IGNsYXNzTmFtZT1cImFib3V0LWVkaXRvci1kaWFnbm9zdGljc1wiPntkaWFnbm9zdGljcy5tYXAoKGl0ZW0sIGluZGV4KSA9PiB7XG4gICAgY29uc3QgRGlhZ25vc3RpY0ljb24gPSBpdGVtLmxldmVsID09PSAnZXJyb3InID8gQ2lyY2xlQWxlcnQgOiBJbmZvO1xuICAgIHJldHVybiA8ZGl2IGtleT17YCR7aXRlbS5jb2RlfS0ke2l0ZW0ucGF0aH0tJHtpbmRleH1gfSBjbGFzc05hbWU9e2Bpcy0ke2l0ZW0ubGV2ZWx9YH0+PERpYWdub3N0aWNJY29uIGFyaWEtaGlkZGVuPVwidHJ1ZVwiIC8+PHNwYW4+PHN0cm9uZz57aXRlbS5tZXNzYWdlfTwvc3Ryb25nPjxzbWFsbD57aXRlbS5wYXRofTwvc21hbGw+PC9zcGFuPjwvZGl2PjtcbiAgfSl9PC9kaXY+O1xufVxuXG5mdW5jdGlvbiBJbnNwZWN0b3IoeyBzdG9yZSwgc25hcHNob3QsIHRpbWVsaW5lT3BlbiwgcnVudGltZU1ldHJpY3MgfSkge1xuICBjb25zdCBpbnNwZWN0b3JSZWYgPSB1c2VSZWYobnVsbCk7XG4gIGNvbnN0IGRyYWdSZWYgPSB1c2VSZWYobnVsbCk7XG4gIGNvbnN0IGxhc3RIZWFkZXJDbGlja1JlZiA9IHVzZVJlZihudWxsKTtcbiAgY29uc3QgW3Bvc2l0aW9uLCBzZXRQb3NpdGlvbl0gPSB1c2VTdGF0ZShudWxsKTtcbiAgY29uc3QgW2RyYWdnaW5nLCBzZXREcmFnZ2luZ10gPSB1c2VTdGF0ZShmYWxzZSk7XG4gIGNvbnN0IHNlY3Rpb24gPSBnZXRTZWN0aW9uKHNuYXBzaG90LmRvY3VtZW50LCBzbmFwc2hvdC5zZWxlY3Rpb24pO1xuICBsZXQgY29udGVudCA9IDxTZWN0aW9uSW5zcGVjdG9yIHN0b3JlPXtzdG9yZX0gc25hcHNob3Q9e3NuYXBzaG90fSBzZWN0aW9uPXtzZWN0aW9ufSAvPjtcbiAgaWYgKHNuYXBzaG90LnNlbGVjdGlvbi50eXBlID09PSAnc2VxdWVuY2UnKSBjb250ZW50ID0gPFNlcXVlbmNlSW5zcGVjdG9yIHN0b3JlPXtzdG9yZX0gc25hcHNob3Q9e3NuYXBzaG90fSAvPjtcbiAgaWYgKHNuYXBzaG90LnNlbGVjdGlvbi50eXBlID09PSAnY3VlJykgY29udGVudCA9IDxDdWVJbnNwZWN0b3Igc3RvcmU9e3N0b3JlfSBzbmFwc2hvdD17c25hcHNob3R9IHNlY3Rpb249e3NlY3Rpb259IC8+O1xuICBpZiAoc25hcHNob3Quc2VsZWN0aW9uLnR5cGUgPT09ICdkaXNjaXBsaW5lLXJldmVhbCcpIGNvbnRlbnQgPSA8RGlzY2lwbGluZVJldmVhbEluc3BlY3RvciBzdG9yZT17c3RvcmV9IHNuYXBzaG90PXtzbmFwc2hvdH0gc2VjdGlvbj17c2VjdGlvbn0gLz47XG4gIGlmIChzbmFwc2hvdC5zZWxlY3Rpb24udHlwZSA9PT0gJ2NhbWVyYS1rZXknKSBjb250ZW50ID0gPENhbWVyYUluc3BlY3RvciBzdG9yZT17c3RvcmV9IHNuYXBzaG90PXtzbmFwc2hvdH0gc2VjdGlvbj17c2VjdGlvbn0gLz47XG4gIGlmIChzbmFwc2hvdC5zZWxlY3Rpb24udHlwZSA9PT0gJ3dvcmxkJykgY29udGVudCA9IDxXb3JsZEluc3BlY3RvciBzdG9yZT17c3RvcmV9IHNuYXBzaG90PXtzbmFwc2hvdH0gc2VjdGlvbj17c2VjdGlvbn0gcnVudGltZU1ldHJpY3M9e3J1bnRpbWVNZXRyaWNzfSAvPjtcbiAgaWYgKHNuYXBzaG90LnNlbGVjdGlvbi50eXBlID09PSAnaW50ZXJhY3Rpb24nKSBjb250ZW50ID0gPFNlY3Rpb25JbnNwZWN0b3Igc3RvcmU9e3N0b3JlfSBzbmFwc2hvdD17c25hcHNob3R9IHNlY3Rpb249e3NlY3Rpb259IC8+O1xuXG4gIHVzZUVmZmVjdCgoKSA9PiB7XG4gICAgY29uc3Qga2VlcEluQm91bmRzID0gKCkgPT4ge1xuICAgICAgaWYgKHdpbmRvdy5pbm5lcldpZHRoIDwgNzYwKSB7XG4gICAgICAgIHNldFBvc2l0aW9uKG51bGwpO1xuICAgICAgICByZXR1cm47XG4gICAgICB9XG4gICAgICBzZXRQb3NpdGlvbigoY3VycmVudCkgPT4gKFxuICAgICAgICBjdXJyZW50ICYmIGluc3BlY3RvclJlZi5jdXJyZW50XG4gICAgICAgICAgPyBjbGFtcEluc3BlY3RvclBvc2l0aW9uKGluc3BlY3RvclJlZi5jdXJyZW50LCBjdXJyZW50LCB0aW1lbGluZU9wZW4pXG4gICAgICAgICAgOiBjdXJyZW50XG4gICAgICApKTtcbiAgICB9O1xuICAgIGtlZXBJbkJvdW5kcygpO1xuICAgIHdpbmRvdy5hZGRFdmVudExpc3RlbmVyKCdyZXNpemUnLCBrZWVwSW5Cb3VuZHMpO1xuICAgIHJldHVybiAoKSA9PiB3aW5kb3cucmVtb3ZlRXZlbnRMaXN0ZW5lcigncmVzaXplJywga2VlcEluQm91bmRzKTtcbiAgfSwgW3RpbWVsaW5lT3Blbl0pO1xuXG4gIGNvbnN0IGJlZ2luRHJhZyA9IChldmVudCkgPT4ge1xuICAgIGlmIChldmVudC5idXR0b24gIT09IDAgfHwgd2luZG93LmlubmVyV2lkdGggPCA3NjAgfHwgIWV2ZW50LnRhcmdldC5jbG9zZXN0KCdoZWFkZXInKSkgcmV0dXJuO1xuICAgIGNvbnN0IGluc3BlY3RvciA9IGluc3BlY3RvclJlZi5jdXJyZW50O1xuICAgIGlmICghaW5zcGVjdG9yKSByZXR1cm47XG4gICAgY29uc3QgcmVjdCA9IGluc3BlY3Rvci5nZXRCb3VuZGluZ0NsaWVudFJlY3QoKTtcbiAgICBjb25zdCB7IG1pblRvcCwgbWF4Qm90dG9tIH0gPSBnZXRJbnNwZWN0b3JWZXJ0aWNhbEJvdW5kcyhpbnNwZWN0b3IsIHRpbWVsaW5lT3Blbik7XG4gICAgY29uc3QgYXZhaWxhYmxlSGVpZ2h0ID0gbWF4Qm90dG9tIC0gbWluVG9wO1xuICAgIGNvbnN0IGZsb2F0aW5nSGVpZ2h0ID0gTWF0aC5taW4ocmVjdC5oZWlnaHQsIDU2MCwgTWF0aC5tYXgoMjQwLCBhdmFpbGFibGVIZWlnaHQgKiAwLjcyKSk7XG4gICAgY29uc3Qgc3RhcnQgPSBjbGFtcEluc3BlY3RvclBvc2l0aW9uKGluc3BlY3Rvciwge1xuICAgICAgbGVmdDogcmVjdC5sZWZ0LFxuICAgICAgdG9wOiByZWN0LnRvcCxcbiAgICAgIHdpZHRoOiByZWN0LndpZHRoLFxuICAgICAgaGVpZ2h0OiBmbG9hdGluZ0hlaWdodCxcbiAgICB9LCB0aW1lbGluZU9wZW4pO1xuICAgIGRyYWdSZWYuY3VycmVudCA9IHtcbiAgICAgIHBvaW50ZXJJZDogZXZlbnQucG9pbnRlcklkLFxuICAgICAgb3JpZ2luWDogZXZlbnQuY2xpZW50WCxcbiAgICAgIG9yaWdpblk6IGV2ZW50LmNsaWVudFksXG4gICAgICBzdGFydCxcbiAgICAgIG1vdmVkOiBmYWxzZSxcbiAgICB9O1xuICAgIGluc3BlY3Rvci5zZXRQb2ludGVyQ2FwdHVyZShldmVudC5wb2ludGVySWQpO1xuICB9O1xuXG4gIGNvbnN0IG1vdmVEcmFnID0gKGV2ZW50KSA9PiB7XG4gICAgY29uc3QgZHJhZyA9IGRyYWdSZWYuY3VycmVudDtcbiAgICBjb25zdCBpbnNwZWN0b3IgPSBpbnNwZWN0b3JSZWYuY3VycmVudDtcbiAgICBpZiAoIWRyYWcgfHwgIWluc3BlY3RvciB8fCBkcmFnLnBvaW50ZXJJZCAhPT0gZXZlbnQucG9pbnRlcklkKSByZXR1cm47XG4gICAgY29uc3QgZGVsdGFYID0gZXZlbnQuY2xpZW50WCAtIGRyYWcub3JpZ2luWDtcbiAgICBjb25zdCBkZWx0YVkgPSBldmVudC5jbGllbnRZIC0gZHJhZy5vcmlnaW5ZO1xuICAgIGlmICghZHJhZy5tb3ZlZCAmJiBNYXRoLmh5cG90KGRlbHRhWCwgZGVsdGFZKSA8IDMpIHJldHVybjtcbiAgICBkcmFnLm1vdmVkID0gdHJ1ZTtcbiAgICBzZXREcmFnZ2luZyh0cnVlKTtcbiAgICBzZXRQb3NpdGlvbihjbGFtcEluc3BlY3RvclBvc2l0aW9uKGluc3BlY3Rvciwge1xuICAgICAgLi4uZHJhZy5zdGFydCxcbiAgICAgIGxlZnQ6IGRyYWcuc3RhcnQubGVmdCArIGRlbHRhWCxcbiAgICAgIHRvcDogZHJhZy5zdGFydC50b3AgKyBkZWx0YVksXG4gICAgfSwgdGltZWxpbmVPcGVuKSk7XG4gIH07XG5cbiAgY29uc3QgZW5kRHJhZyA9IChldmVudCkgPT4ge1xuICAgIGNvbnN0IGRyYWcgPSBkcmFnUmVmLmN1cnJlbnQ7XG4gICAgaWYgKGRyYWc/LnBvaW50ZXJJZCAhPT0gZXZlbnQucG9pbnRlcklkKSByZXR1cm47XG4gICAgaWYgKCFkcmFnLm1vdmVkKSB7XG4gICAgICBjb25zdCBub3cgPSBwZXJmb3JtYW5jZS5ub3coKTtcbiAgICAgIGNvbnN0IHByZXZpb3VzID0gbGFzdEhlYWRlckNsaWNrUmVmLmN1cnJlbnQ7XG4gICAgICBpZiAocHJldmlvdXMgJiYgbm93IC0gcHJldmlvdXMudGltZSA8IDM2MFxuICAgICAgICAmJiBNYXRoLmh5cG90KGV2ZW50LmNsaWVudFggLSBwcmV2aW91cy54LCBldmVudC5jbGllbnRZIC0gcHJldmlvdXMueSkgPCA2KSB7XG4gICAgICAgIHNldFBvc2l0aW9uKG51bGwpO1xuICAgICAgICBsYXN0SGVhZGVyQ2xpY2tSZWYuY3VycmVudCA9IG51bGw7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBsYXN0SGVhZGVyQ2xpY2tSZWYuY3VycmVudCA9IHsgdGltZTogbm93LCB4OiBldmVudC5jbGllbnRYLCB5OiBldmVudC5jbGllbnRZIH07XG4gICAgICB9XG4gICAgfVxuICAgIGRyYWdSZWYuY3VycmVudCA9IG51bGw7XG4gICAgc2V0RHJhZ2dpbmcoZmFsc2UpO1xuICAgIGlmIChpbnNwZWN0b3JSZWYuY3VycmVudD8uaGFzUG9pbnRlckNhcHR1cmUoZXZlbnQucG9pbnRlcklkKSkge1xuICAgICAgaW5zcGVjdG9yUmVmLmN1cnJlbnQucmVsZWFzZVBvaW50ZXJDYXB0dXJlKGV2ZW50LnBvaW50ZXJJZCk7XG4gICAgfVxuICB9O1xuXG4gIGNvbnN0IHJlc2V0UG9zaXRpb24gPSAoKSA9PiBzZXRQb3NpdGlvbihudWxsKTtcblxuICByZXR1cm4gKFxuICAgIDxhc2lkZVxuICAgICAgcmVmPXtpbnNwZWN0b3JSZWZ9XG4gICAgICBjbGFzc05hbWU9e2BhYm91dC1lZGl0b3ItaW5zcGVjdG9yJHtkcmFnZ2luZyA/ICcgaXMtZHJhZ2dpbmcnIDogJyd9YH1cbiAgICAgIGRhdGEtZmxvYXRpbmc9e3Bvc2l0aW9uID8gJ3RydWUnIDogJ2ZhbHNlJ31cbiAgICAgIHN0eWxlPXtwb3NpdGlvbiA/IHtcbiAgICAgICAgbGVmdDogcG9zaXRpb24ubGVmdCxcbiAgICAgICAgdG9wOiBwb3NpdGlvbi50b3AsXG4gICAgICAgIHJpZ2h0OiAnYXV0bycsXG4gICAgICAgIGJvdHRvbTogJ2F1dG8nLFxuICAgICAgICB3aWR0aDogcG9zaXRpb24ud2lkdGgsXG4gICAgICAgIGhlaWdodDogcG9zaXRpb24uaGVpZ2h0LFxuICAgICAgfSA6IHVuZGVmaW5lZH1cbiAgICAgIG9uUG9pbnRlckRvd249e2JlZ2luRHJhZ31cbiAgICAgIG9uUG9pbnRlck1vdmU9e21vdmVEcmFnfVxuICAgICAgb25Qb2ludGVyVXA9e2VuZERyYWd9XG4gICAgICBvblBvaW50ZXJDYW5jZWw9e2VuZERyYWd9XG4gICAgICBvbkRvdWJsZUNsaWNrPXtyZXNldFBvc2l0aW9ufVxuICAgID48ZGl2IGNsYXNzTmFtZT1cImFib3V0LWVkaXRvci1pbnNwZWN0b3Itc2Nyb2xsXCI+e2NvbnRlbnR9PERpYWdub3N0aWNzIGRpYWdub3N0aWNzPXtzbmFwc2hvdC5kaWFnbm9zdGljc30gLz48L2Rpdj48L2FzaWRlPlxuICApO1xufVxuXG5mdW5jdGlvbiBDYW1lcmFQYXRoT3ZlcmxheSh7IHNuYXBzaG90IH0pIHtcbiAgY29uc3Qgc2VjdGlvbnMgPSBzbmFwc2hvdC5jb21waWxlZFBsYW4/LnNlY3Rpb25zIHx8IFtdO1xuICBjb25zdCB0b3RhbCA9IHNuYXBzaG90LmNvbXBpbGVkUGxhbj8ubWF4U3RvcnlXVSB8fCAxO1xuICByZXR1cm4gKFxuICAgIDxkaXYgY2xhc3NOYW1lPVwiYWJvdXQtZWRpdG9yLXBhdGgtb3ZlcmxheVwiIGFyaWEtbGFiZWw9XCJDYW1lcmEgcGF0aCBvdmVybGF5XCI+XG4gICAgICA8ZGl2PjxzdHJvbmc+UGF0aCDCtyBjb25zdGFudCBjYWRlbmNlPC9zdHJvbmc+PHNwYW4+e2Zvcm1hdFdVKHNuYXBzaG90LnRyYW5zcG9ydC5zdG9yeVdVKX0gLyB7Zm9ybWF0V1UodG90YWwpfTwvc3Bhbj48L2Rpdj5cbiAgICAgIDxzdmcgdmlld0JveD1cIjAgMCAyNDAgMTEyXCIgcm9sZT1cImltZ1wiIGFyaWEtbGFiZWw9XCJDYW1lcmEgYW5kIFdvcmxkIGFuY2hvcnMgb3ZlciBzdG9yeSBkaXN0YW5jZVwiPlxuICAgICAgICA8cGF0aCBkPVwiTTE4IDU2IEgyMjJcIiAvPlxuICAgICAgICB7c2VjdGlvbnMubWFwKChzZWN0aW9uKSA9PiB7XG4gICAgICAgICAgY29uc3QgeCA9IDE4ICsgKChzZWN0aW9uLnN0YXJ0V1UgLyB0b3RhbCkgKiAyMDQpO1xuICAgICAgICAgIHJldHVybiA8ZyBrZXk9e3NlY3Rpb24uaWR9IHRyYW5zZm9ybT17YHRyYW5zbGF0ZSgke3h9IDU2KWB9PjxsaW5lIHkxPVwiLTEyXCIgeTI9XCIxMlwiIC8+PGNpcmNsZSByPXtzZWN0aW9uLndvcmxkU3RhdGU/LmNoYW5nZXNXb3JsZCA/IDQgOiAyfSAvPjx0aXRsZT57c2VjdGlvbi5sYWJlbH17c2VjdGlvbi53b3JsZFN0YXRlPy5jaGFuZ2VzV29ybGQgPyBgIMK3ICR7c2VjdGlvbi53b3JsZFN0YXRlLmFjdGl2ZVdvcmxkLnNoYXBlSWR9YCA6ICcnfTwvdGl0bGU+PC9nPjtcbiAgICAgICAgfSl9XG4gICAgICAgIDxnIGNsYXNzTmFtZT1cImlzLXBsYXloZWFkXCIgdHJhbnNmb3JtPXtgdHJhbnNsYXRlKCR7MTggKyAoKHNuYXBzaG90LnRyYW5zcG9ydC5zdG9yeVdVIC8gdG90YWwpICogMjA0KX0gNTYpYH0+PHBhdGggZD1cIk0wIC0yMiBMNSAtMTUgSC01IFpcIiAvPjxsaW5lIHkxPVwiLTE1XCIgeTI9XCIyMlwiIC8+PC9nPlxuICAgICAgPC9zdmc+XG4gICAgICA8c21hbGw+RG90cyBhcmUgU2VjdGlvbiBib3VuZGFyaWVzLiBMYXJnZSBkb3RzIGFyZSBmaXhlZCBXb3JsZCBhbmNob3JzLiBUaGUgbWFya2VyIGlzIHRoZSBwdWJsaXNoZWQgY2FtZXJhLjwvc21hbGw+XG4gICAgPC9kaXY+XG4gICk7XG59XG5cbmV4cG9ydCBkZWZhdWx0IGZ1bmN0aW9uIEFib3V0TmFycmF0aXZlRWRpdG9yKHsgc3RvcmUsIHJ1bnRpbWVSZWYsIHJvb3RSZWYgfSkge1xuICBjb25zdCBzbmFwc2hvdCA9IHVzZVN5bmNFeHRlcm5hbFN0b3JlKHN0b3JlLnN1YnNjcmliZSwgc3RvcmUuZ2V0U25hcHNob3QpO1xuICBjb25zdCBbY2hlY2twb2ludHMsIHNldENoZWNrcG9pbnRzXSA9IHVzZVN0YXRlKCgpID0+IHJlYWRBYm91dE5hcnJhdGl2ZUNoZWNrcG9pbnRzKCkpO1xuICBjb25zdCBbcnVudGltZU1ldHJpY3MsIHNldFJ1bnRpbWVNZXRyaWNzXSA9IHVzZVN0YXRlKG51bGwpO1xuICBjb25zdCBbcGF0aFZpc2libGUsIHNldFBhdGhWaXNpYmxlXSA9IHVzZVN0YXRlKGZhbHNlKTtcbiAgY29uc3QgW2RpcmVjdG9yVmlldywgc2V0RGlyZWN0b3JWaWV3XSA9IHVzZVN0YXRlKGZhbHNlKTtcbiAgY29uc3QgW21vYmlsZVBhbmUsIHNldE1vYmlsZVBhbmVdID0gdXNlU3RhdGUoJ3NlcXVlbmNlJyk7XG4gIGNvbnN0IFt0aW1lbGluZU9wZW4sIHNldFRpbWVsaW5lT3Blbl0gPSB1c2VTdGF0ZSgoKSA9PiAoXG4gICAgd2luZG93LmxvY2FsU3RvcmFnZS5nZXRJdGVtKEFCT1VUX0VESVRPUl9USU1FTElORV9TVE9SQUdFX0tFWSkgIT09ICdjbG9zZWQnXG4gICkpO1xuICBjb25zdCBpbXBvcnRSZWYgPSB1c2VSZWYobnVsbCk7XG4gIGNvbnN0IHNuYXBzaG90UmVmID0gdXNlUmVmKHNuYXBzaG90KTtcbiAgY29uc3QgYWN0aXZlU2VsZWN0aW9uID0gc25hcHNob3Quc2VsZWN0aW9uO1xuXG4gIHVzZUVmZmVjdCgoKSA9PiB7XG4gICAgc25hcHNob3RSZWYuY3VycmVudCA9IHNuYXBzaG90O1xuICB9LCBbc25hcHNob3RdKTtcblxuICB1c2VFZmZlY3QoKCkgPT4ge1xuICAgIHdpbmRvdy5sb2NhbFN0b3JhZ2Uuc2V0SXRlbShBQk9VVF9FRElUT1JfVElNRUxJTkVfU1RPUkFHRV9LRVksIHRpbWVsaW5lT3BlbiA/ICdvcGVuJyA6ICdjbG9zZWQnKTtcbiAgfSwgW3RpbWVsaW5lT3Blbl0pO1xuXG4gIHVzZUVmZmVjdCgoKSA9PiB7XG4gICAgY29uc3Qgcm9vdCA9IHJvb3RSZWYuY3VycmVudDtcbiAgICBjb25zdCBydW50aW1lID0gcnVudGltZVJlZi5jdXJyZW50O1xuICAgIHJvb3Q/LnNldEF0dHJpYnV0ZSgnZGF0YS1lZGl0b3ItYWN0aXZlJywgJ3RydWUnKTtcbiAgICBsb2FkQWJvdXROYXJyYXRpdmVTb3VyY2UoKS50aGVuKCh7IGRvY3VtZW50LCBoYXNoIH0pID0+IHtcbiAgICAgIGNvbnN0IGN1cnJlbnQgPSBzdG9yZS5nZXRTbmFwc2hvdCgpO1xuICAgICAgaWYgKCFjdXJyZW50LmRpcnR5KSBzdG9yZS5yZXBsYWNlRG9jdW1lbnQoJ1JlZnJlc2ggY2Fub25pY2FsIHNvdXJjZScsIGRvY3VtZW50KTtcbiAgICAgIHN0b3JlLnNldEJhc2VsaW5lKGRvY3VtZW50LCBoYXNoKTtcbiAgICAgIGNvbnN0IHJlY292ZXJ5ID0gcmVhZEFib3V0TmFycmF0aXZlUmVjb3ZlcnlEcmFmdCgpO1xuICAgICAgaWYgKHJlY292ZXJ5ICYmIHJlY292ZXJ5LnRpbWVzdGFtcCA+IERhdGUubm93KCkgLSAoMTQgKiA4NjQwMDAwMCkpIHtcbiAgICAgICAgc3RvcmUuc2V0UmVjb3ZlcnlTdGF0ZSh7IGF2YWlsYWJsZTogdHJ1ZSwgZHJhZnQ6IHJlY292ZXJ5LCBlcnJvcjogJycgfSk7XG4gICAgICB9XG4gICAgfSkuY2F0Y2goKGVycm9yKSA9PiBzdG9yZS5zZXRTYXZlU3RhdGUoeyBzdGF0dXM6ICdmYWlsZWQnLCBtZXNzYWdlOiBlcnJvci5tZXNzYWdlIH0pKTtcbiAgICByZXR1cm4gKCkgPT4ge1xuICAgICAgcm9vdD8ucmVtb3ZlQXR0cmlidXRlKCdkYXRhLWVkaXRvci1hY3RpdmUnKTtcbiAgICAgIHJ1bnRpbWU/LnNldERpcmVjdG9yVmlldz8uKGZhbHNlKTtcbiAgICB9O1xuICB9LCBbcm9vdFJlZiwgcnVudGltZVJlZiwgc3RvcmVdKTtcblxuICB1c2VFZmZlY3QoKCkgPT4ge1xuICAgIGNvbnN0IHJvb3QgPSByb290UmVmLmN1cnJlbnQ7XG4gICAgaWYgKCFyb290KSByZXR1cm4gdW5kZWZpbmVkO1xuICAgIHJvb3QucXVlcnlTZWxlY3RvckFsbCgnLmlzLWVkaXRvci1zZWxlY3RlZCcpLmZvckVhY2goKG5vZGUpID0+IG5vZGUuY2xhc3NMaXN0LnJlbW92ZSgnaXMtZWRpdG9yLXNlbGVjdGVkJykpO1xuICAgIGdldEFib3V0TmFycmF0aXZlU2VsZWN0aW9uTWVtYmVycyhhY3RpdmVTZWxlY3Rpb24pLmZvckVhY2goKG1lbWJlcikgPT4ge1xuICAgICAgcm9vdC5xdWVyeVNlbGVjdG9yKGBbZGF0YS10ZXh0LWN1ZT1cIiR7Q1NTLmVzY2FwZShtZW1iZXIuY3VlSWQpfVwiXWApPy5jbGFzc0xpc3QuYWRkKCdpcy1lZGl0b3Itc2VsZWN0ZWQnKTtcbiAgICB9KTtcbiAgICByb290LmRhdGFzZXQuZWRpdG9yU2VsZWN0aW9uVHlwZSA9IGFjdGl2ZVNlbGVjdGlvbi50eXBlIHx8ICcnO1xuICAgIHJldHVybiAoKSA9PiB7XG4gICAgICByb290LnF1ZXJ5U2VsZWN0b3JBbGwoJy5pcy1lZGl0b3Itc2VsZWN0ZWQnKS5mb3JFYWNoKChub2RlKSA9PiBub2RlLmNsYXNzTGlzdC5yZW1vdmUoJ2lzLWVkaXRvci1zZWxlY3RlZCcpKTtcbiAgICAgIGRlbGV0ZSByb290LmRhdGFzZXQuZWRpdG9yU2VsZWN0aW9uVHlwZTtcbiAgICB9O1xuICB9LCBbYWN0aXZlU2VsZWN0aW9uLCByb290UmVmXSk7XG5cbiAgdXNlRWZmZWN0KCgpID0+IHtcbiAgICBjb25zdCBpbnRlcnZhbCA9IHdpbmRvdy5zZXRJbnRlcnZhbCgoKSA9PiBzZXRSdW50aW1lTWV0cmljcyhydW50aW1lUmVmLmN1cnJlbnQ/LmdldE1ldHJpY3M/LigpIHx8IG51bGwpLCA1MDApO1xuICAgIHJldHVybiAoKSA9PiB3aW5kb3cuY2xlYXJJbnRlcnZhbChpbnRlcnZhbCk7XG4gIH0sIFtydW50aW1lUmVmXSk7XG5cbiAgdXNlRWZmZWN0KCgpID0+IHtcbiAgICBpZiAoIXNuYXBzaG90LmRpcnR5KSByZXR1cm4gdW5kZWZpbmVkO1xuICAgIGNvbnN0IHRpbWVyID0gd2luZG93LnNldFRpbWVvdXQoKCkgPT4ge1xuICAgICAgdHJ5IHtcbiAgICAgICAgd3JpdGVBYm91dE5hcnJhdGl2ZVJlY292ZXJ5RHJhZnQoc25hcHNob3QuZG9jdW1lbnQsIHNuYXBzaG90LmJhc2VsaW5lSGFzaCk7XG4gICAgICB9IGNhdGNoIChlcnJvcikge1xuICAgICAgICBzdG9yZS5zZXRSZWNvdmVyeVN0YXRlKHsgZXJyb3I6IGBEcmFmdCBzdG9yYWdlIGZhaWxlZDogJHtlcnJvci5tZXNzYWdlfWAgfSk7XG4gICAgICB9XG4gICAgfSwgOTAwKTtcbiAgICByZXR1cm4gKCkgPT4gd2luZG93LmNsZWFyVGltZW91dCh0aW1lcik7XG4gIH0sIFtzbmFwc2hvdC5iYXNlbGluZUhhc2gsIHNuYXBzaG90LmRpcnR5LCBzbmFwc2hvdC5kb2N1bWVudCwgc3RvcmVdKTtcblxuICB1c2VFZmZlY3QoKCkgPT4ge1xuICAgIGNvbnN0IHBhZ2VoaWRlID0gKCkgPT4ge1xuICAgICAgY29uc3QgY3VycmVudCA9IHNuYXBzaG90UmVmLmN1cnJlbnQ7XG4gICAgICBpZiAoY3VycmVudC5kaXJ0eSkge1xuICAgICAgICB0cnkgeyB3cml0ZUFib3V0TmFycmF0aXZlUmVjb3ZlcnlEcmFmdChjdXJyZW50LmRvY3VtZW50LCBjdXJyZW50LmJhc2VsaW5lSGFzaCk7IH0gY2F0Y2ggeyAvKiBzdXJmYWNlZCBieSBub3JtYWwgYXV0b3NhdmUgKi8gfVxuICAgICAgfVxuICAgIH07XG4gICAgY29uc3Qga2V5ZG93biA9IChldmVudCkgPT4ge1xuICAgICAgaWYgKChldmVudC5tZXRhS2V5IHx8IGV2ZW50LmN0cmxLZXkpICYmIGV2ZW50LmtleS50b0xvd2VyQ2FzZSgpID09PSAncycpIHtcbiAgICAgICAgZXZlbnQucHJldmVudERlZmF1bHQoKTtcbiAgICAgICAgZG9jdW1lbnQucXVlcnlTZWxlY3RvcignW2RhdGEtYWJvdXQtZWRpdG9yLXNhdmVdJyk/LmNsaWNrKCk7XG4gICAgICB9XG4gICAgICBpZiAoKGV2ZW50Lm1ldGFLZXkgfHwgZXZlbnQuY3RybEtleSkgJiYgZXZlbnQua2V5LnRvTG93ZXJDYXNlKCkgPT09ICd6Jykge1xuICAgICAgICBldmVudC5wcmV2ZW50RGVmYXVsdCgpO1xuICAgICAgICBldmVudC5zaGlmdEtleSA/IHN0b3JlLnJlZG8oKSA6IHN0b3JlLnVuZG8oKTtcbiAgICAgIH1cbiAgICAgIGlmICghZXZlbnQubWV0YUtleSAmJiAhZXZlbnQuY3RybEtleSAmJiAhZXZlbnQuYWx0S2V5ICYmICFldmVudC5zaGlmdEtleVxuICAgICAgICAmJiAhaXNUZXh0RWRpdGluZ1RhcmdldChldmVudC50YXJnZXQpICYmIFsnQXJyb3dMZWZ0JywgJ0Fycm93UmlnaHQnXS5pbmNsdWRlcyhldmVudC5rZXkpKSB7XG4gICAgICAgIGV2ZW50LnByZXZlbnREZWZhdWx0KCk7XG4gICAgICAgIGp1bXBUaW1lbGluZUtleWZyYW1lKHN0b3JlLCBzdG9yZS5nZXRTbmFwc2hvdCgpLCBldmVudC5rZXkgPT09ICdBcnJvd1JpZ2h0JyA/IDEgOiAtMSk7XG4gICAgICB9XG4gICAgICBpZiAoIWV2ZW50Lm1ldGFLZXkgJiYgIWV2ZW50LmN0cmxLZXkgJiYgIWV2ZW50LmFsdEtleVxuICAgICAgICAmJiAhaXNUZXh0RWRpdGluZ1RhcmdldChldmVudC50YXJnZXQpICYmIFsnQmFja3NwYWNlJywgJ0RlbGV0ZSddLmluY2x1ZGVzKGV2ZW50LmtleSlcbiAgICAgICAgJiYgZGVsZXRlVGltZWxpbmVTZWxlY3Rpb24oc3RvcmUsIHN0b3JlLmdldFNuYXBzaG90KCkpKSB7XG4gICAgICAgIGV2ZW50LnByZXZlbnREZWZhdWx0KCk7XG4gICAgICB9XG4gICAgICBpZiAoZXZlbnQua2V5ID09PSAnRXNjYXBlJykge1xuICAgICAgICBjb25zdCBjdXJyZW50ID0gc3RvcmUuZ2V0U25hcHNob3QoKTtcbiAgICAgICAgaWYgKGN1cnJlbnQucHJldmlld1N0YXRlKSBzdG9yZS5jYW5jZWxQcmV2aWV3KCk7XG4gICAgICAgIGVsc2UgaWYgKGN1cnJlbnQudHJ5U3RhdGUpIHN0b3JlLmNhbmNlbFRyeSgpO1xuICAgICAgICBlbHNlIGlmIChnZXRBYm91dE5hcnJhdGl2ZVNlbGVjdGlvbk1lbWJlcnMoY3VycmVudC5zZWxlY3Rpb24pLmxlbmd0aCA+IDEpIHtcbiAgICAgICAgICBzdG9yZS5zZXRTZWxlY3Rpb24oe1xuICAgICAgICAgICAgdHlwZTogJ2N1ZScsXG4gICAgICAgICAgICBzZWN0aW9uSWQ6IGN1cnJlbnQuc2VsZWN0aW9uLnNlY3Rpb25JZCxcbiAgICAgICAgICAgIGN1ZUlkOiBjdXJyZW50LnNlbGVjdGlvbi5jdWVJZCxcbiAgICAgICAgICAgIGtleVBhcnQ6IGN1cnJlbnQuc2VsZWN0aW9uLmtleVBhcnQgfHwgJ2ZvY3VzJyxcbiAgICAgICAgICB9KTtcbiAgICAgICAgfVxuICAgICAgICBlbHNlIGlmIChjdXJyZW50LnNlbGVjdGlvbi50eXBlICE9PSAnc2VjdGlvbicpIHN0b3JlLnNldFNlbGVjdGlvbih7IHR5cGU6ICdzZWN0aW9uJywgc2VjdGlvbklkOiBjdXJyZW50LnNlbGVjdGlvbi5zZWN0aW9uSWQgfSk7XG4gICAgICAgIGVsc2Ugc3RvcmUuc2V0U2VsZWN0aW9uKHsgdHlwZTogJ3NlcXVlbmNlJyB9KTtcbiAgICAgIH1cbiAgICB9O1xuICAgIHdpbmRvdy5hZGRFdmVudExpc3RlbmVyKCdwYWdlaGlkZScsIHBhZ2VoaWRlKTtcbiAgICB3aW5kb3cuYWRkRXZlbnRMaXN0ZW5lcigna2V5ZG93bicsIGtleWRvd24pO1xuICAgIHJldHVybiAoKSA9PiB7IHdpbmRvdy5yZW1vdmVFdmVudExpc3RlbmVyKCdwYWdlaGlkZScsIHBhZ2VoaWRlKTsgd2luZG93LnJlbW92ZUV2ZW50TGlzdGVuZXIoJ2tleWRvd24nLCBrZXlkb3duKTsgfTtcbiAgfSwgW3N0b3JlXSk7XG5cbiAgY29uc3Qgc2F2ZSA9IGFzeW5jICgpID0+IHtcbiAgICBjb25zdCBlZGl0b3JVcmwgPSBuZXcgVVJMKHdpbmRvdy5sb2NhdGlvbi5ocmVmKTtcbiAgICBlZGl0b3JVcmwuc2VhcmNoUGFyYW1zLnNldCgnZWRpdCcsICcxJyk7XG4gICAgd2luZG93Lmhpc3RvcnkucmVwbGFjZVN0YXRlKHdpbmRvdy5oaXN0b3J5LnN0YXRlLCAnJywgYCR7ZWRpdG9yVXJsLnBhdGhuYW1lfSR7ZWRpdG9yVXJsLnNlYXJjaH0ke2VkaXRvclVybC5oYXNofWApO1xuICAgIGNvbnN0IHNlbnQgPSBjbG9uZUFib3V0TmFycmF0aXZlRG9jdW1lbnQoc25hcHNob3QuZG9jdW1lbnQpO1xuICAgIGlmIChzbmFwc2hvdC5kaWFnbm9zdGljcy5zb21lKChpdGVtKSA9PiBpdGVtLmxldmVsID09PSAnZXJyb3InKSkge1xuICAgICAgc3RvcmUuc2V0U2F2ZVN0YXRlKHsgc3RhdHVzOiAnZmFpbGVkJywgbWVzc2FnZTogJ1Jlc29sdmUgdmFsaWRhdGlvbiBlcnJvcnMgYmVmb3JlIHNhdmluZy4nIH0pO1xuICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICBzdG9yZS5zZXRTYXZlU3RhdGUoeyBzdGF0dXM6ICdzYXZpbmcnLCBtZXNzYWdlOiAnJyB9KTtcbiAgICB0cnkge1xuICAgICAgY29uc3QgcmVzdWx0ID0gYXdhaXQgc2F2ZUFib3V0TmFycmF0aXZlU291cmNlKHNlbnQsIHNuYXBzaG90LmJhc2VsaW5lSGFzaCk7XG4gICAgICBzdG9yZS5tYXJrU2F2ZWQoc2VudCwgcmVzdWx0Lmhhc2gpO1xuICAgICAgY2xlYXJBYm91dE5hcnJhdGl2ZVJlY292ZXJ5RHJhZnQoKTtcbiAgICB9IGNhdGNoIChlcnJvcikge1xuICAgICAgc3RvcmUuc2V0U2F2ZVN0YXRlKHsgc3RhdHVzOiBlcnJvci5zdGF0dXMgPT09IDQwOSA/ICdjb25mbGljdCcgOiAnZmFpbGVkJywgbWVzc2FnZTogZXJyb3IubWVzc2FnZSB9KTtcbiAgICB9XG4gIH07XG5cbiAgY29uc3QgYWRkQ2hlY2twb2ludCA9ICgpID0+IHtcbiAgICBjb25zdCBjaGVja3BvaW50ID0ge1xuICAgICAgaWQ6IGNyeXB0by5yYW5kb21VVUlEKCksXG4gICAgICBuYW1lOiBgQ2hlY2twb2ludCAke25ldyBEYXRlKCkudG9Mb2NhbGVUaW1lU3RyaW5nKFtdLCB7IGhvdXI6ICcyLWRpZ2l0JywgbWludXRlOiAnMi1kaWdpdCcgfSl9YCxcbiAgICAgIHRpbWVzdGFtcDogRGF0ZS5ub3coKSxcbiAgICAgIHN0b3J5V1U6IHNuYXBzaG90LnRyYW5zcG9ydC5zdG9yeVdVLFxuICAgICAgYmFzZVNvdXJjZUhhc2g6IHNuYXBzaG90LmJhc2VsaW5lSGFzaCxcbiAgICAgIGRvY3VtZW50OiBzbmFwc2hvdC5kb2N1bWVudCxcbiAgICB9O1xuICAgIHNldENoZWNrcG9pbnRzKHdyaXRlQWJvdXROYXJyYXRpdmVDaGVja3BvaW50KGNoZWNrcG9pbnQpKTtcbiAgfTtcbiAgY29uc3Qgc3RhdHVzTGFiZWwgPSBzbmFwc2hvdC5zYXZlU3RhdGUuc3RhdHVzID09PSAnc2F2aW5nJyA/ICdTYXZpbmfigKYnXG4gICAgOiBzbmFwc2hvdC5zYXZlU3RhdGUuc3RhdHVzID09PSAnY29uZmxpY3QnID8gJ1NvdXJjZSBjaGFuZ2VkJ1xuICAgICAgOiBzbmFwc2hvdC5zYXZlU3RhdGUuc3RhdHVzID09PSAnZmFpbGVkJyA/ICdTYXZlIGZhaWxlZCdcbiAgICAgICAgOiBzbmFwc2hvdC5kaXJ0eSA/ICdEcmFmdCcgOiAnU2F2ZWQnO1xuICBjb25zdCBzZWxlY3RlZCA9IGdldFNlY3Rpb24oc25hcHNob3QuZG9jdW1lbnQsIHNuYXBzaG90LnNlbGVjdGlvbik7XG4gIGNvbnN0IGNvbXBpbGVkU2VsZWN0ZWQgPSBzbmFwc2hvdC5jb21waWxlZFBsYW4/LnNlY3Rpb25zLmZpbmQoKHNlY3Rpb24pID0+IHNlY3Rpb24uaWQgPT09IHNlbGVjdGVkPy5pZCk7XG4gIGNvbnN0IHJlc29sdmVkRXh0ZW50ID0gY29tcGlsZWRTZWxlY3RlZD8ucmVzb2x2ZWRFeHRlbnRXVSB8fCBzZWxlY3RlZD8uZXh0ZW50V1UgfHwgMDtcbiAgY29uc3Qgc2VsZWN0ZWRFeHRlbnQgPSBzZWxlY3RlZFxuICAgID8gTnVtYmVyKHNuYXBzaG90LnByZXZpZXdQcm9maWxlID09PSAnbW9iaWxlJyA/IHNlbGVjdGVkLm1vYmlsZUV4dGVudFdVIDogc2VsZWN0ZWQuZXh0ZW50V1UpXG4gICAgOiAwO1xuICBjb25zdCBzZWxlY3RlZEN1ZUNvdW50ID0gZ2V0QWJvdXROYXJyYXRpdmVTZWxlY3Rpb25NZW1iZXJzKHNuYXBzaG90LnNlbGVjdGlvbikubGVuZ3RoO1xuICBjb25zdCBsb29wQWN0aXZlID0gQm9vbGVhbihzbmFwc2hvdC50cmFuc3BvcnQubG9vcD8uc2VjdGlvbklkID09PSBzZWxlY3RlZD8uaWQpO1xuICBjb25zdCB0aW1lbGluZURlbGV0aW9uID0gZ2V0VGltZWxpbmVEZWxldGlvbihzbmFwc2hvdCk7XG4gIGNvbnN0IHRvZ2dsZUxvb3AgPSAoKSA9PiBzdG9yZS5zZXRUcmFuc3BvcnQoe1xuICAgIGxvb3A6IGxvb3BBY3RpdmUgfHwgIWNvbXBpbGVkU2VsZWN0ZWQgPyBudWxsIDoge1xuICAgICAgc2VjdGlvbklkOiBzZWxlY3RlZC5pZCxcbiAgICAgIHN0YXJ0V1U6IGNvbXBpbGVkU2VsZWN0ZWQuc3RhcnRXVSxcbiAgICAgIGVuZFdVOiBjb21waWxlZFNlbGVjdGVkLnN0YXJ0V1UgKyBjb21waWxlZFNlbGVjdGVkLnRyYXZlbFdVLFxuICAgIH0sXG4gIH0pO1xuICBjb25zdCB0b2dnbGVTb2xvID0gKHRyYWNrKSA9PiBzdG9yZS5zZXRUcmFuc3BvcnQoe1xuICAgIHNvbG9UcmFjazogc25hcHNob3QudHJhbnNwb3J0LnNvbG9UcmFjayA9PT0gdHJhY2sgPyBudWxsIDogdHJhY2ssXG4gIH0pO1xuICBjb25zdCBmaXRTZXF1ZW5jZSA9ICgpID0+IHtcbiAgICBzdG9yZS5zZXRUcmFuc3BvcnQoeyB6b29tOiAxIH0pO1xuICAgIHJlcXVlc3RBbmltYXRpb25GcmFtZSgoKSA9PiB7XG4gICAgICBjb25zdCBsYW5lcyA9IGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3IoJy5hYm91dC1lZGl0b3ItbGFuZXMnKTtcbiAgICAgIGlmIChsYW5lcykgbGFuZXMuc2Nyb2xsTGVmdCA9IDA7XG4gICAgfSk7XG4gIH07XG4gIGNvbnN0IGZpdFNlY3Rpb24gPSAoKSA9PiB7XG4gICAgaWYgKCFjb21waWxlZFNlbGVjdGVkIHx8ICFzbmFwc2hvdC5jb21waWxlZFBsYW4/Lm1heFN0b3J5V1UpIHJldHVybjtcbiAgICBjb25zdCBzZWN0aW9uU3BhbiA9IE1hdGgubWF4KDAuMDAxLCBjb21waWxlZFNlbGVjdGVkLnJlc29sdmVkRXh0ZW50V1UpO1xuICAgIGNvbnN0IHpvb20gPSBNYXRoLm1pbig4LCBNYXRoLm1heCgxLCAoc25hcHNob3QuY29tcGlsZWRQbGFuLm1heFN0b3J5V1UgLyBzZWN0aW9uU3BhbikgKiAwLjgyKSk7XG4gICAgc3RvcmUuc2V0VHJhbnNwb3J0KHsgem9vbTogTnVtYmVyKHpvb20udG9GaXhlZCgzKSkgfSk7XG4gICAgcmVxdWVzdEFuaW1hdGlvbkZyYW1lKCgpID0+IHtcbiAgICAgIGNvbnN0IGxhbmVzID0gZG9jdW1lbnQucXVlcnlTZWxlY3RvcignLmFib3V0LWVkaXRvci1sYW5lcycpO1xuICAgICAgaWYgKCFsYW5lcykgcmV0dXJuO1xuICAgICAgY29uc3Qgc3RhcnRSYXRpbyA9IGNvbXBpbGVkU2VsZWN0ZWQuc3RhcnRXVSAvIHNuYXBzaG90LmNvbXBpbGVkUGxhbi5tYXhTdG9yeVdVO1xuICAgICAgbGFuZXMuc2Nyb2xsTGVmdCA9IE1hdGgubWF4KDAsIChzdGFydFJhdGlvICogbGFuZXMuc2Nyb2xsV2lkdGgpIC0gKGxhbmVzLmNsaWVudFdpZHRoICogMC4wOCkpO1xuICAgIH0pO1xuICB9O1xuICBjb25zdCB0b2dnbGVEaXJlY3RvciA9ICgpID0+IHtcbiAgICBjb25zdCBuZXh0ID0gIWRpcmVjdG9yVmlldztcbiAgICBzZXREaXJlY3RvclZpZXcobmV4dCk7XG4gICAgcnVudGltZVJlZi5jdXJyZW50Py5zZXREaXJlY3RvclZpZXc/LihuZXh0KTtcbiAgfTtcbiAgY29uc3QgdG9nZ2xlQmVmb3JlID0gKCkgPT4ge1xuICAgIGlmIChzbmFwc2hvdC50cnlTdGF0ZT8ubGFiZWwgPT09ICdDb21wYXJlIHNhdmVkIHNvdXJjZScpIHtcbiAgICAgIHN0b3JlLmNhbmNlbFRyeSgpO1xuICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICBpZiAoc25hcHNob3QudHJ5U3RhdGUpIHJldHVybjtcbiAgICBzdG9yZS5iZWdpblRyeSgnQ29tcGFyZSBzYXZlZCBzb3VyY2UnLCAoZHJhZnQpID0+IHtcbiAgICAgIE9iamVjdC5rZXlzKGRyYWZ0KS5mb3JFYWNoKChrZXkpID0+IGRlbGV0ZSBkcmFmdFtrZXldKTtcbiAgICAgIE9iamVjdC5hc3NpZ24oZHJhZnQsIGNsb25lQWJvdXROYXJyYXRpdmVEb2N1bWVudChzbmFwc2hvdC5iYXNlbGluZURvY3VtZW50KSk7XG4gICAgfSk7XG4gIH07XG5cbiAgcmV0dXJuIGNyZWF0ZVBvcnRhbCgoXG4gICAgPGRpdlxuICAgICAgY2xhc3NOYW1lPVwiYWJvdXQtZWRpdG9yXCJcbiAgICAgIGRhdGEtbW9iaWxlLXBhbmU9e21vYmlsZVBhbmV9XG4gICAgICBkYXRhLXRpbWVsaW5lLW9wZW49e3RpbWVsaW5lT3BlbiA/ICd0cnVlJyA6ICdmYWxzZSd9XG4gICAgICByb2xlPVwicmVnaW9uXCJcbiAgICAgIGFyaWEtbGFiZWw9XCJBYm91dCBOYXJyYXRpdmUgY3JlYXRpdmUgdG9vbGtpdFwiXG4gICAgPlxuICAgICAgPGhlYWRlciBjbGFzc05hbWU9XCJhYm91dC1lZGl0b3ItdG9wYmFyXCI+XG4gICAgICAgIDxidXR0b24gdHlwZT1cImJ1dHRvblwiIGNsYXNzTmFtZT1cImFib3V0LWVkaXRvci1icmFuZFwiIG9uQ2xpY2s9eygpID0+IHN0b3JlLnNldFNlbGVjdGlvbih7IHR5cGU6ICdzZXF1ZW5jZScgfSl9PjxEaWFtb25kIGFyaWEtaGlkZGVuPVwidHJ1ZVwiIC8+PHNwYW4+QWJvdXQgTmFycmF0aXZlPC9zcGFuPjxzbWFsbD5DcmVhdGl2ZSB0b29sa2l0PC9zbWFsbD48L2J1dHRvbj5cbiAgICAgICAgPFRyYW5zcG9ydCBzdG9yZT17c3RvcmV9IHNuYXBzaG90PXtzbmFwc2hvdH0gLz5cbiAgICAgICAgPGRpdiBjbGFzc05hbWU9XCJhYm91dC1lZGl0b3ItYWN0aW9uc1wiPlxuICAgICAgICAgIDxidXR0b24gdHlwZT1cImJ1dHRvblwiIGRpc2FibGVkPXshc25hcHNob3QuaGlzdG9yeS5jYW5VbmRvfSB0aXRsZT17c25hcHNob3QuaGlzdG9yeS51bmRvTGFiZWwgfHwgJ1VuZG8nfSBhcmlhLWxhYmVsPVwiVW5kb1wiIG9uQ2xpY2s9eygpID0+IHN0b3JlLnVuZG8oKX0+PHNwYW4gYXJpYS1oaWRkZW49XCJ0cnVlXCI+4oa2PC9zcGFuPjwvYnV0dG9uPlxuICAgICAgICAgIDxidXR0b24gdHlwZT1cImJ1dHRvblwiIGRpc2FibGVkPXshc25hcHNob3QuaGlzdG9yeS5jYW5SZWRvfSB0aXRsZT17c25hcHNob3QuaGlzdG9yeS5yZWRvTGFiZWwgfHwgJ1JlZG8nfSBhcmlhLWxhYmVsPVwiUmVkb1wiIG9uQ2xpY2s9eygpID0+IHN0b3JlLnJlZG8oKX0+PHNwYW4gYXJpYS1oaWRkZW49XCJ0cnVlXCI+4oa3PC9zcGFuPjwvYnV0dG9uPlxuICAgICAgICAgIDxidXR0b24gdHlwZT1cImJ1dHRvblwiIGNsYXNzTmFtZT17cGF0aFZpc2libGUgPyAnaXMtYWN0aXZlJyA6ICcnfSBvbkNsaWNrPXsoKSA9PiBzZXRQYXRoVmlzaWJsZSghcGF0aFZpc2libGUpfT5QYXRoPC9idXR0b24+XG4gICAgICAgICAgPGJ1dHRvbiB0eXBlPVwiYnV0dG9uXCIgY2xhc3NOYW1lPXtkaXJlY3RvclZpZXcgPyAnaXMtYWN0aXZlJyA6ICcnfSBvbkNsaWNrPXt0b2dnbGVEaXJlY3Rvcn0+e2RpcmVjdG9yVmlldyA/ICdEaXJlY3RvcicgOiAnQ2FtZXJhJ308L2J1dHRvbj5cbiAgICAgICAgICA8YnV0dG9uIHR5cGU9XCJidXR0b25cIiBjbGFzc05hbWU9e3NuYXBzaG90LnRyeVN0YXRlPy5sYWJlbCA9PT0gJ0NvbXBhcmUgc2F2ZWQgc291cmNlJyA/ICdpcy1hY3RpdmUnIDogJyd9IGRpc2FibGVkPXtzbmFwc2hvdC50cnlTdGF0ZSAmJiBzbmFwc2hvdC50cnlTdGF0ZS5sYWJlbCAhPT0gJ0NvbXBhcmUgc2F2ZWQgc291cmNlJ30gb25DbGljaz17dG9nZ2xlQmVmb3JlfT57c25hcHNob3QudHJ5U3RhdGU/LmxhYmVsID09PSAnQ29tcGFyZSBzYXZlZCBzb3VyY2UnID8gJ0JlZm9yZScgOiAnQWZ0ZXInfTwvYnV0dG9uPlxuICAgICAgICAgIDxkZXRhaWxzIGNsYXNzTmFtZT1cImFib3V0LWVkaXRvci1tb3JlXCI+XG4gICAgICAgICAgICA8c3VtbWFyeT5Nb3JlPC9zdW1tYXJ5PlxuICAgICAgICAgICAgPGRpdj5cbiAgICAgICAgICAgICAgPGJ1dHRvbiB0eXBlPVwiYnV0dG9uXCIgb25DbGljaz17YWRkQ2hlY2twb2ludH0+Q2hlY2twb2ludDwvYnV0dG9uPlxuICAgICAgICAgICAgICA8YnV0dG9uIHR5cGU9XCJidXR0b25cIiBvbkNsaWNrPXsoKSA9PiBleHBvcnRBYm91dE5hcnJhdGl2ZURvY3VtZW50KHNuYXBzaG90LmRvY3VtZW50KX0+RXhwb3J0IEpTT048L2J1dHRvbj5cbiAgICAgICAgICAgICAgPGJ1dHRvbiB0eXBlPVwiYnV0dG9uXCIgb25DbGljaz17KCkgPT4gaW1wb3J0UmVmLmN1cnJlbnQ/LmNsaWNrKCl9PkltcG9ydCBKU09OPC9idXR0b24+XG4gICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICA8L2RldGFpbHM+XG4gICAgICAgICAgPGlucHV0IHJlZj17aW1wb3J0UmVmfSBoaWRkZW4gdHlwZT1cImZpbGVcIiBhY2NlcHQ9XCJhcHBsaWNhdGlvbi9qc29uXCIgb25DaGFuZ2U9e2FzeW5jIChldmVudCkgPT4ge1xuICAgICAgICAgICAgY29uc3QgZmlsZSA9IGV2ZW50LnRhcmdldC5maWxlcz8uWzBdO1xuICAgICAgICAgICAgaWYgKCFmaWxlKSByZXR1cm47XG4gICAgICAgICAgICB0cnkge1xuICAgICAgICAgICAgICBjb25zdCBpbXBvcnRlZCA9IEpTT04ucGFyc2UoYXdhaXQgZmlsZS50ZXh0KCkpO1xuICAgICAgICAgICAgICBhc3NlcnRWYWxpZEFib3V0TmFycmF0aXZlRG9jdW1lbnQoaW1wb3J0ZWQpO1xuICAgICAgICAgICAgICBzdG9yZS5yZXBsYWNlRG9jdW1lbnQoJ0ltcG9ydCBkb2N1bWVudCcsIGltcG9ydGVkKTtcbiAgICAgICAgICAgIH0gY2F0Y2ggKGVycm9yKSB7IHN0b3JlLnNldFNhdmVTdGF0ZSh7IHN0YXR1czogJ2ZhaWxlZCcsIG1lc3NhZ2U6IGVycm9yLm1lc3NhZ2UgfSk7IH1cbiAgICAgICAgICAgIGV2ZW50LnRhcmdldC52YWx1ZSA9ICcnO1xuICAgICAgICAgIH19IC8+XG4gICAgICAgICAgPGJ1dHRvbiB0eXBlPVwiYnV0dG9uXCIgZGF0YS1hYm91dC1lZGl0b3Itc2F2ZSBjbGFzc05hbWU9XCJpcy1zYXZlXCIgZGlzYWJsZWQ9e3NuYXBzaG90LnNhdmVTdGF0ZS5zdGF0dXMgPT09ICdzYXZpbmcnfSBvbkNsaWNrPXtzYXZlfT48c3Bhbj57c3RhdHVzTGFiZWx9PC9zcGFuPjxrYmQ+4oyYUzwva2JkPjwvYnV0dG9uPlxuICAgICAgICA8L2Rpdj5cbiAgICAgIDwvaGVhZGVyPlxuXG4gICAgICB7c25hcHNob3QucmVjb3ZlcnlTdGF0ZS5hdmFpbGFibGUgPyA8ZGl2IGNsYXNzTmFtZT1cImFib3V0LWVkaXRvci1yZWNvdmVyeVwiPjxzcGFuPkFuIHVuc2F2ZWQgZHJhZnQgZnJvbSB7bmV3IERhdGUoc25hcHNob3QucmVjb3ZlcnlTdGF0ZS5kcmFmdC50aW1lc3RhbXApLnRvTG9jYWxlU3RyaW5nKCl9IGlzIGF2YWlsYWJsZS48L3NwYW4+PGJ1dHRvbiB0eXBlPVwiYnV0dG9uXCIgb25DbGljaz17KCkgPT4geyBzdG9yZS5yZXBsYWNlRG9jdW1lbnQoJ1JlY292ZXIgZHJhZnQnLCBzbmFwc2hvdC5yZWNvdmVyeVN0YXRlLmRyYWZ0LmRvY3VtZW50KTsgc3RvcmUuc2V0UmVjb3ZlcnlTdGF0ZSh7IGF2YWlsYWJsZTogZmFsc2UgfSk7IH19PlJlY292ZXIgYXMgdW5zYXZlZCBjb3B5PC9idXR0b24+PGJ1dHRvbiB0eXBlPVwiYnV0dG9uXCIgb25DbGljaz17KCkgPT4geyBleHBvcnRBYm91dE5hcnJhdGl2ZURvY3VtZW50KHNuYXBzaG90LnJlY292ZXJ5U3RhdGUuZHJhZnQuZG9jdW1lbnQsICdjb250ZW50cy1hYm91dC1yZWNvdmVyZWQuanNvbicpOyB9fT5FeHBvcnQ8L2J1dHRvbj48YnV0dG9uIHR5cGU9XCJidXR0b25cIiBvbkNsaWNrPXsoKSA9PiB7IGNsZWFyQWJvdXROYXJyYXRpdmVSZWNvdmVyeURyYWZ0KCk7IHN0b3JlLnNldFJlY292ZXJ5U3RhdGUoeyBhdmFpbGFibGU6IGZhbHNlIH0pOyB9fT5EaXNjYXJkPC9idXR0b24+PC9kaXY+IDogbnVsbH1cbiAgICAgIHtzbmFwc2hvdC5zYXZlU3RhdGUubWVzc2FnZSA/IDxkaXYgY2xhc3NOYW1lPXtgYWJvdXQtZWRpdG9yLXNhdmUtbWVzc2FnZSBpcy0ke3NuYXBzaG90LnNhdmVTdGF0ZS5zdGF0dXN9YH0+e3NuYXBzaG90LnNhdmVTdGF0ZS5tZXNzYWdlfTxidXR0b24gdHlwZT1cImJ1dHRvblwiIGFyaWEtbGFiZWw9XCJEaXNtaXNzIG1lc3NhZ2VcIiBvbkNsaWNrPXsoKSA9PiBzdG9yZS5zZXRTYXZlU3RhdGUoeyBtZXNzYWdlOiAnJyB9KX0+w5c8L2J1dHRvbj48L2Rpdj4gOiBudWxsfVxuXG4gICAgICB7cGF0aFZpc2libGUgPyA8Q2FtZXJhUGF0aE92ZXJsYXkgc25hcHNob3Q9e3NuYXBzaG90fSAvPiA6IG51bGx9XG4gICAgICB7ZGlyZWN0b3JWaWV3ID8gPGRpdiBjbGFzc05hbWU9XCJhYm91dC1lZGl0b3ItZGlyZWN0b3ItY29udHJvbHNcIj48c3Ryb25nPkRpcmVjdG9yIFZpZXc8L3N0cm9uZz48YnV0dG9uIHR5cGU9XCJidXR0b25cIiBvbkNsaWNrPXsoKSA9PiBydW50aW1lUmVmLmN1cnJlbnQ/Lm51ZGdlRGlyZWN0b3I/Lih7IHlhdzogLTAuMDggfSl9PuKGkDwvYnV0dG9uPjxidXR0b24gdHlwZT1cImJ1dHRvblwiIG9uQ2xpY2s9eygpID0+IHJ1bnRpbWVSZWYuY3VycmVudD8ubnVkZ2VEaXJlY3Rvcj8uKHsgcGl0Y2g6IDAuMDggfSl9PuKGkTwvYnV0dG9uPjxidXR0b24gdHlwZT1cImJ1dHRvblwiIG9uQ2xpY2s9eygpID0+IHJ1bnRpbWVSZWYuY3VycmVudD8ubnVkZ2VEaXJlY3Rvcj8uKHsgcGl0Y2g6IC0wLjA4IH0pfT7ihpM8L2J1dHRvbj48YnV0dG9uIHR5cGU9XCJidXR0b25cIiBvbkNsaWNrPXsoKSA9PiBydW50aW1lUmVmLmN1cnJlbnQ/Lm51ZGdlRGlyZWN0b3I/Lih7IHlhdzogMC4wOCB9KX0+4oaSPC9idXR0b24+PGJ1dHRvbiB0eXBlPVwiYnV0dG9uXCIgb25DbGljaz17KCkgPT4gcnVudGltZVJlZi5jdXJyZW50Py5udWRnZURpcmVjdG9yPy4oeyBkaXN0YW5jZTogLTAuMiB9KX0+77yLPC9idXR0b24+PGJ1dHRvbiB0eXBlPVwiYnV0dG9uXCIgb25DbGljaz17KCkgPT4gcnVudGltZVJlZi5jdXJyZW50Py5udWRnZURpcmVjdG9yPy4oeyBkaXN0YW5jZTogMC4yIH0pfT7iiJI8L2J1dHRvbj48YnV0dG9uIHR5cGU9XCJidXR0b25cIiBvbkNsaWNrPXsoKSA9PiBydW50aW1lUmVmLmN1cnJlbnQ/LnJlc2V0RGlyZWN0b3I/LigpfT5SZXNldDwvYnV0dG9uPjxzbWFsbD5UZW1wb3JhcnkgaW5zcGVjdGlvbiBvbmx5LiBQdWJsaXNoZWQgQ2FtZXJhIGtleXMgYXJlIHVuY2hhbmdlZC48L3NtYWxsPjwvZGl2PiA6IG51bGx9XG5cbiAgICAgIDxJbnNwZWN0b3Igc3RvcmU9e3N0b3JlfSBzbmFwc2hvdD17c25hcHNob3R9IHRpbWVsaW5lT3Blbj17dGltZWxpbmVPcGVufSBydW50aW1lTWV0cmljcz17cnVudGltZU1ldHJpY3N9IC8+XG4gICAgICA8YnV0dG9uXG4gICAgICAgIHR5cGU9XCJidXR0b25cIlxuICAgICAgICBjbGFzc05hbWU9XCJhYm91dC1lZGl0b3ItdGltZWxpbmUtdG9nZ2xlXCJcbiAgICAgICAgYXJpYS1jb250cm9scz1cImFib3V0LWVkaXRvci10aW1lbGluZS1wYW5lbFwiXG4gICAgICAgIGFyaWEtZXhwYW5kZWQ9e3RpbWVsaW5lT3Blbn1cbiAgICAgICAgdGl0bGU9e3RpbWVsaW5lT3BlbiA/ICdIaWRlIHRpbWVsaW5lJyA6ICdTaG93IHRpbWVsaW5lJ31cbiAgICAgICAgb25DbGljaz17KCkgPT4gc2V0VGltZWxpbmVPcGVuKChvcGVuKSA9PiAhb3Blbil9XG4gICAgICA+e3RpbWVsaW5lT3BlbiA/IDxDaGV2cm9uRG93biBhcmlhLWhpZGRlbj1cInRydWVcIiAvPiA6IDxDaGV2cm9uVXAgYXJpYS1oaWRkZW49XCJ0cnVlXCIgLz59PHNwYW4+e3RpbWVsaW5lT3BlbiA/ICdIaWRlIHRpbWVsaW5lJyA6ICdTaG93IHRpbWVsaW5lJ308L3NwYW4+PC9idXR0b24+XG4gICAgICA8ZGl2IGlkPVwiYWJvdXQtZWRpdG9yLXRpbWVsaW5lLXBhbmVsXCIgY2xhc3NOYW1lPVwiYWJvdXQtZWRpdG9yLWJvdHRvbVwiIGFyaWEtaGlkZGVuPXshdGltZWxpbmVPcGVufT5cbiAgICAgICAgPGRpdiBjbGFzc05hbWU9XCJhYm91dC1lZGl0b3ItY29udGV4dGJhclwiPlxuICAgICAgICAgIDxzcGFuPjxzdHJvbmc+e3NlbGVjdGVkPy5sYWJlbCB8fCAnU2VxdWVuY2UnfTwvc3Ryb25nPiB7c2VsZWN0ZWQgPyBgJHtzZWxlY3RlZC50eXBlfSDCtyAke2Zvcm1hdFdVKE1hdGgubWF4KDAsIHNlbGVjdGVkRXh0ZW50IC0gMSkpfSBzY3JvbGwgwrcgJHtmb3JtYXRXVShzZWxlY3RlZEV4dGVudCl9IHRvdGFsJHtyZXNvbHZlZEV4dGVudCA+IHNlbGVjdGVkRXh0ZW50ICsgMC4wMDEgPyBgIMK3ICR7Zm9ybWF0V1UocmVzb2x2ZWRFeHRlbnQpfSByZXNvbHZlZGAgOiAnJ31gIDogJyd9PC9zcGFuPlxuICAgICAgICAgIHtzZWxlY3RlZEN1ZUNvdW50ID4gMSA/IDxzcGFuIGNsYXNzTmFtZT1cImFib3V0LWVkaXRvci1zZWxlY3Rpb24tY291bnRcIj57c2VsZWN0ZWRDdWVDb3VudH0gdGl0bGVzIHNlbGVjdGVkPC9zcGFuPiA6IG51bGx9XG4gICAgICAgICAgPHNwYW4+e3NuYXBzaG90LmF1dG9LZXkgPyAnQXV0by1rZXkgYXJtZWQnIDogJ0F1dG8ta2V5IG9mZid9PC9zcGFuPlxuICAgICAgICAgIDxidXR0b24gdHlwZT1cImJ1dHRvblwiIGNsYXNzTmFtZT17c25hcHNob3QuYXV0b0tleSA/ICdpcy1hY3RpdmUnIDogJyd9IG9uQ2xpY2s9eygpID0+IHN0b3JlLnNldEF1dG9LZXkoIXNuYXBzaG90LmF1dG9LZXkpfT7il4YgQXV0by1rZXk8L2J1dHRvbj5cbiAgICAgICAgICA8YnV0dG9uIHR5cGU9XCJidXR0b25cIiBjbGFzc05hbWU9e2xvb3BBY3RpdmUgPyAnaXMtYWN0aXZlJyA6ICcnfSBvbkNsaWNrPXt0b2dnbGVMb29wfT5Mb29wIFNlY3Rpb248L2J1dHRvbj5cbiAgICAgICAgICA8YnV0dG9uIHR5cGU9XCJidXR0b25cIiBvbkNsaWNrPXtmaXRTZXF1ZW5jZX0+Rml0IHNlcXVlbmNlPC9idXR0b24+XG4gICAgICAgICAgPGJ1dHRvbiB0eXBlPVwiYnV0dG9uXCIgZGlzYWJsZWQ9eyFjb21waWxlZFNlbGVjdGVkfSBvbkNsaWNrPXtmaXRTZWN0aW9ufT5GaXQgU2VjdGlvbjwvYnV0dG9uPlxuICAgICAgICAgIHtbJ2NhbWVyYScsICd3b3JsZCcsICd0ZXh0J10ubWFwKCh0cmFjaykgPT4gPGJ1dHRvbiB0eXBlPVwiYnV0dG9uXCIga2V5PXt0cmFja30gY2xhc3NOYW1lPXtzbmFwc2hvdC50cmFuc3BvcnQuc29sb1RyYWNrID09PSB0cmFjayA/ICdpcy1hY3RpdmUnIDogJyd9IG9uQ2xpY2s9eygpID0+IHRvZ2dsZVNvbG8odHJhY2spfT5Tb2xvIHt0cmFja308L2J1dHRvbj4pfVxuICAgICAgICAgIHt0aW1lbGluZURlbGV0aW9uID8gPGJ1dHRvbiB0eXBlPVwiYnV0dG9uXCIgY2xhc3NOYW1lPVwiYWJvdXQtZWRpdG9yLWRlbGV0ZS1rZXlcIiBkaXNhYmxlZD17dGltZWxpbmVEZWxldGlvbi5kaXNhYmxlZH0gdGl0bGU9e3RpbWVsaW5lRGVsZXRpb24ubWVzc2FnZSB8fCBgJHt0aW1lbGluZURlbGV0aW9uLmxhYmVsfSDCtyBEZWxldGUvQmFja3NwYWNlYH0gb25DbGljaz17KCkgPT4gZGVsZXRlVGltZWxpbmVTZWxlY3Rpb24oc3RvcmUsIHNuYXBzaG90KX0+PFRyYXNoMiBhcmlhLWhpZGRlbj1cInRydWVcIiAvPnt0aW1lbGluZURlbGV0aW9uLmxhYmVsfTwvYnV0dG9uPiA6IG51bGx9XG4gICAgICAgICAge3J1bnRpbWVNZXRyaWNzID8gPHNwYW4gY2xhc3NOYW1lPVwiYWJvdXQtZWRpdG9yLWh1ZFwiPntydW50aW1lTWV0cmljcy5mcmFtZVRpbWVNcy50b0ZpeGVkKDIpfW1zIMK3IHtydW50aW1lTWV0cmljcy5kcmF3Q2FsbHN9IGRyYXcgwrcge3J1bnRpbWVNZXRyaWNzLnBvaW50Q291bnQudG9Mb2NhbGVTdHJpbmcoKX0gcHRzIMK3IHtydW50aW1lTWV0cmljcy5hY3RpdmVNb2RpZmllcnN9IG1vZGlmaWVycyDCtyB7cnVudGltZU1ldHJpY3MuYnVmZmVyUmVidWlsZHN9IHJlYnVpbGRzPC9zcGFuPiA6IG51bGx9XG4gICAgICAgICAge2NoZWNrcG9pbnRzLmxlbmd0aCA/IDxzZWxlY3QgYXJpYS1sYWJlbD1cIlJlc3RvcmUgY2hlY2twb2ludFwiIGRlZmF1bHRWYWx1ZT1cIlwiIG9uQ2hhbmdlPXsoZXZlbnQpID0+IHsgY29uc3QgZm91bmQgPSBjaGVja3BvaW50cy5maW5kKChpdGVtKSA9PiBpdGVtLmlkID09PSBldmVudC50YXJnZXQudmFsdWUpOyBpZiAoZm91bmQpIHsgc3RvcmUucmVwbGFjZURvY3VtZW50KGBSZXN0b3JlICR7Zm91bmQubmFtZX1gLCBmb3VuZC5kb2N1bWVudCk7IHN0b3JlLnNldFRyYW5zcG9ydCh7IG93bmVyOiAndGltZWxpbmUnLCBzdG9yeVdVOiBmb3VuZC5zdG9yeVdVLCBwbGF5aW5nOiBmYWxzZSB9KTsgfSBldmVudC50YXJnZXQudmFsdWUgPSAnJzsgfX0+PG9wdGlvbiB2YWx1ZT1cIlwiPkNoZWNrcG9pbnRzICh7Y2hlY2twb2ludHMubGVuZ3RofSk8L29wdGlvbj57Y2hlY2twb2ludHMubWFwKChpdGVtKSA9PiA8b3B0aW9uIHZhbHVlPXtpdGVtLmlkfSBrZXk9e2l0ZW0uaWR9PntpdGVtLm5hbWV9PC9vcHRpb24+KX08L3NlbGVjdD4gOiBudWxsfVxuICAgICAgICA8L2Rpdj5cbiAgICAgICAgPFRpbWVsaW5lIHN0b3JlPXtzdG9yZX0gc25hcHNob3Q9e3NuYXBzaG90fSAvPlxuICAgICAgPC9kaXY+XG4gICAgICA8bmF2IGNsYXNzTmFtZT1cImFib3V0LWVkaXRvci1tb2JpbGUtdGFic1wiIGFyaWEtbGFiZWw9XCJFZGl0b3IgcGFuZWxcIj48YnV0dG9uIHR5cGU9XCJidXR0b25cIiBjbGFzc05hbWU9e21vYmlsZVBhbmUgPT09ICdzZXF1ZW5jZScgPyAnaXMtYWN0aXZlJyA6ICcnfSBvbkNsaWNrPXsoKSA9PiBzZXRNb2JpbGVQYW5lKCdzZXF1ZW5jZScpfT5TZXF1ZW5jZTwvYnV0dG9uPjxidXR0b24gdHlwZT1cImJ1dHRvblwiIGNsYXNzTmFtZT17bW9iaWxlUGFuZSA9PT0gJ2luc3BlY3QnID8gJ2lzLWFjdGl2ZScgOiAnJ30gb25DbGljaz17KCkgPT4gc2V0TW9iaWxlUGFuZSgnaW5zcGVjdCcpfT5JbnNwZWN0PC9idXR0b24+PGJ1dHRvbiB0eXBlPVwiYnV0dG9uXCIgY2xhc3NOYW1lPXttb2JpbGVQYW5lID09PSAncHJldmlldycgPyAnaXMtYWN0aXZlJyA6ICcnfSBvbkNsaWNrPXsoKSA9PiBzZXRNb2JpbGVQYW5lKCdwcmV2aWV3Jyl9PlByZXZpZXc8L2J1dHRvbj48L25hdj5cbiAgICA8L2Rpdj5cbiAgKSwgZG9jdW1lbnQuYm9keSk7XG59XG4iXSwiZmlsZSI6Ii9Vc2Vycy9hbGV4YW5kZXJiZWNrL1Byb2plY3RzLWNvZGUvQWxleGFuZGVyIEJlY2sgU3R1ZGlvIFdlYnNpdGUvcmVhY3QtYXBwL2FwcC9zcmMvcm91dGVzL2Fib3V0LW5hcnJhdGl2ZS1sYWIvQWJvdXROYXJyYXRpdmVFZGl0b3IuanN4In0=