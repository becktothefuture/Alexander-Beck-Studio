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
      lineNumber: 335,
      columnNumber: 7
    }, this),
    children,
    hint ? /* @__PURE__ */ jsxDEV("small", { children: hint }, void 0, false, {
      fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
      lineNumber: 337,
      columnNumber: 15
    }, this) : null
  ] }, void 0, true, {
    fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
    lineNumber: 334,
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
        lineNumber: 346,
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
        lineNumber: 355,
        columnNumber: 9
      },
      this
    ),
    unit ? /* @__PURE__ */ jsxDEV("em", { children: unit }, void 0, false, {
      fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
      lineNumber: 364,
      columnNumber: 17
    }, this) : null
  ] }, void 0, true, {
    fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
    lineNumber: 345,
    columnNumber: 7
  }, this) }, void 0, false, {
    fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
    lineNumber: 344,
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
      lineNumber: 387,
      columnNumber: 116
    }, this) }, void 0, false, {
      fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
      lineNumber: 387,
      columnNumber: 7
    }, this),
    /* @__PURE__ */ jsxDEV("button", { type: "button", title: "Previous keyframe · Left arrow", "aria-label": "Previous keyframe", onClick: () => jumpTimelineKeyframe(store, snapshot, -1), children: /* @__PURE__ */ jsxDEV(ChevronLeft, { "aria-hidden": "true" }, void 0, false, {
      fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
      lineNumber: 388,
      columnNumber: 157
    }, this) }, void 0, false, {
      fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
      lineNumber: 388,
      columnNumber: 7
    }, this),
    /* @__PURE__ */ jsxDEV("button", { type: "button", className: "is-primary", title: transport.playing ? "Pause" : "Play", "aria-label": transport.playing ? "Pause" : "Play", onClick: play, children: transport.playing ? /* @__PURE__ */ jsxDEV(Pause, { "aria-hidden": "true" }, void 0, false, {
      fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
      lineNumber: 390,
      columnNumber: 30
    }, this) : /* @__PURE__ */ jsxDEV(Play, { "aria-hidden": "true" }, void 0, false, {
      fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
      lineNumber: 390,
      columnNumber: 61
    }, this) }, void 0, false, {
      fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
      lineNumber: 389,
      columnNumber: 7
    }, this),
    /* @__PURE__ */ jsxDEV("button", { type: "button", title: "Next Section", "aria-label": "Next Section", onClick: () => jumpSection(1), children: /* @__PURE__ */ jsxDEV(SkipForward, { "aria-hidden": "true" }, void 0, false, {
      fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
      lineNumber: 392,
      columnNumber: 107
    }, this) }, void 0, false, {
      fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
      lineNumber: 392,
      columnNumber: 7
    }, this),
    /* @__PURE__ */ jsxDEV("button", { type: "button", title: "Next keyframe · Right arrow", "aria-label": "Next keyframe", onClick: () => jumpTimelineKeyframe(store, snapshot, 1), children: /* @__PURE__ */ jsxDEV(ChevronRight, { "aria-hidden": "true" }, void 0, false, {
      fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
      lineNumber: 393,
      columnNumber: 149
    }, this) }, void 0, false, {
      fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
      lineNumber: 393,
      columnNumber: 7
    }, this),
    /* @__PURE__ */ jsxDEV("output", { children: formatWU(transport.storyWU) }, void 0, false, {
      fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
      lineNumber: 394,
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
        lineNumber: 395,
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
        lineNumber: 404,
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
        lineNumber: 409,
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
            lineNumber: 419,
            columnNumber: 9
          }, this),
          /* @__PURE__ */ jsxDEV("option", { value: "mobile", children: "Mobile" }, void 0, false, {
            fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
            lineNumber: 420,
            columnNumber: 9
          }, this),
          /* @__PURE__ */ jsxDEV("option", { value: "reduced-motion", children: "Reduced motion" }, void 0, false, {
            fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
            lineNumber: 421,
            columnNumber: 9
          }, this)
        ]
      },
      void 0,
      true,
      {
        fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
        lineNumber: 414,
        columnNumber: 7
      },
      this
    )
  ] }, void 0, true, {
    fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
    lineNumber: 386,
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
        lineNumber: 794,
        columnNumber: 9
      }, this),
      /* @__PURE__ */ jsxDEV("span", { children: "Camera" }, void 0, false, {
        fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
        lineNumber: 794,
        columnNumber: 30
      }, this),
      /* @__PURE__ */ jsxDEV("span", { children: "World" }, void 0, false, {
        fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
        lineNumber: 794,
        columnNumber: 49
      }, this),
      /* @__PURE__ */ jsxDEV("span", { children: "Text" }, void 0, false, {
        fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
        lineNumber: 794,
        columnNumber: 67
      }, this),
      /* @__PURE__ */ jsxDEV("span", { children: "Interaction" }, void 0, false, {
        fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
        lineNumber: 794,
        columnNumber: 84
      }, this)
    ] }, void 0, true, {
      fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
      lineNumber: 793,
      columnNumber: 7
    }, this),
    /* @__PURE__ */ jsxDEV("div", { ref: lanesRef, className: "about-editor-lanes", "data-solo-track": transport.soloTrack || "", onWheel: zoomTimeline, children: /* @__PURE__ */ jsxDEV("div", { className: "about-editor-timeline-canvas", style: { "--about-editor-playhead": playhead, "--about-editor-timeline-zoom": Math.max(1, Number(transport.zoom) || 1) }, children: [
      /* @__PURE__ */ jsxDEV("div", { className: "about-editor-playhead" }, void 0, false, {
        fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
        lineNumber: 798,
        columnNumber: 11
      }, this),
      marquee ? /* @__PURE__ */ jsxDEV("div", { className: "about-editor-marquee", style: marquee, "aria-hidden": "true" }, void 0, false, {
        fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
        lineNumber: 799,
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
              lineNumber: 806,
              columnNumber: 13
            }, this),
            /* @__PURE__ */ jsxDEV("span", { children: cameraDragPreview.valid ? `${cameraDragPreview.sectionLabel} · ${formatCameraPercent(cameraDragPreview.at)}` : cameraDragPreview.reason }, void 0, false, {
              fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
              lineNumber: 807,
              columnNumber: 13
            }, this)
          ]
        },
        void 0,
        true,
        {
          fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
          lineNumber: 801,
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
                      lineNumber: 845,
                      columnNumber: 23
                    }, this),
                    section.label
                  ] }, void 0, true, {
                    fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
                    lineNumber: 844,
                    columnNumber: 21
                  }, this),
                  sectionResizePreview?.sectionId === section.id ? /* @__PURE__ */ jsxDEV("output", { children: [
                    formatWU(Math.max(0, resizeExtent - 1)),
                    " scroll · ",
                    formatWU(resizeExtent),
                    " total"
                  ] }, void 0, true, {
                    fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
                    lineNumber: 847,
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
                      lineNumber: 848,
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
                lineNumber: 838,
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
                    lineNumber: 872,
                    columnNumber: 27
                  },
                  this
                );
              }) }, void 0, false, {
                fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
                lineNumber: 866,
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
                    lineNumber: 887,
                    columnNumber: 25
                  },
                  this
                );
              })
            ] }, section.id, true, {
              fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
              lineNumber: 865,
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
                  lineNumber: 928,
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
                    lineNumber: 935,
                    columnNumber: 21
                  },
                  this
                )
              ) : null
            ] }, section.id, true, {
              fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
              lineNumber: 927,
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
                        lineNumber: 967,
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
                        lineNumber: 1018,
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
                    lineNumber: 1048,
                    columnNumber: 21
                  }, this) : null
                ]
              },
              section.id,
              true,
              {
                fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
                lineNumber: 950,
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
                lineNumber: 1059,
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
                lineNumber: 1066,
                columnNumber: 19
              },
              this
            ) : null
          ] }, section.id, true, {
            fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
            lineNumber: 1058,
            columnNumber: 17
          }, this);
        }) }, lane, false, {
          fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
          lineNumber: 811,
          columnNumber: 11
        }, this)
      )
    ] }, void 0, true, {
      fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
      lineNumber: 797,
      columnNumber: 9
    }, this) }, void 0, false, {
      fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
      lineNumber: 796,
      columnNumber: 7
    }, this)
  ] }, void 0, true, {
    fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
    lineNumber: 792,
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
        lineNumber: 1096,
        columnNumber: 15
      }, this),
      /* @__PURE__ */ jsxDEV("strong", { children: "Global controls" }, void 0, false, {
        fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
        lineNumber: 1096,
        columnNumber: 36
      }, this)
    ] }, void 0, true, {
      fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
      lineNumber: 1096,
      columnNumber: 7
    }, this),
    ABOUT_NARRATIVE_GLOBAL_CONTROLS.map(
      (group) => /* @__PURE__ */ jsxDEV("details", { open: true, children: [
        /* @__PURE__ */ jsxDEV("summary", { children: group.label }, void 0, false, {
          fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
          lineNumber: 1099,
          columnNumber: 11
        }, this),
        group.id === "textMotion" ? /* @__PURE__ */ jsxDEV("p", { className: "about-editor-help", children: "Every title follows this path continuously. Negative Y is higher, positive Y is lower. The opener starts sharp at its own Y position; Clear from and Clear until set the sharp window for later titles." }, void 0, false, {
          fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
          lineNumber: 1100,
          columnNumber: 40
        }, this) : null,
        group.id === "swarmTurbulence" ? /* @__PURE__ */ jsxDEV("p", { className: "about-editor-help", children: "One ambient motion profile drives both the cluster and turbulent field. Each World only scales its strength, so the motion stays continuous while Shapes change." }, void 0, false, {
          fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
          lineNumber: 1101,
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
              lineNumber: 1107,
              columnNumber: 13
            },
            this
          );
        })
      ] }, group.id, true, {
        fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
        lineNumber: 1098,
        columnNumber: 7
      }, this)
    )
  ] }, void 0, true, {
    fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
    lineNumber: 1095,
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
        lineNumber: 1156,
        columnNumber: 15
      }, this),
      /* @__PURE__ */ jsxDEV("strong", { children: section.label }, void 0, false, {
        fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
        lineNumber: 1156,
        columnNumber: 79
      }, this)
    ] }, void 0, true, {
      fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
      lineNumber: 1156,
      columnNumber: 7
    }, this),
    section.locked ? /* @__PURE__ */ jsxDEV("div", { className: "about-editor-lock", children: [
      /* @__PURE__ */ jsxDEV(LockKeyhole, { "aria-hidden": "true" }, void 0, false, {
        fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
        lineNumber: 1157,
        columnNumber: 60
      }, this),
      /* @__PURE__ */ jsxDEV("span", { children: "This protected Section cannot be reordered or have its World replaced accidentally." }, void 0, false, {
        fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
        lineNumber: 1157,
        columnNumber: 94
      }, this),
      /* @__PURE__ */ jsxDEV("button", { type: "button", onClick: () => update("Unlock protected Section", (draft) => {
        draft.locked = false;
      }), children: "Unlock advanced" }, void 0, false, {
        fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
        lineNumber: 1157,
        columnNumber: 190
      }, this)
    ] }, void 0, true, {
      fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
      lineNumber: 1157,
      columnNumber: 25
    }, this) : null,
    /* @__PURE__ */ jsxDEV("div", { className: "about-editor-inline-actions", children: [
      /* @__PURE__ */ jsxDEV("button", { type: "button", disabled: section.locked || sectionIndex === 0, onClick: () => move(-1), children: "Move earlier" }, void 0, false, {
        fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
        lineNumber: 1159,
        columnNumber: 9
      }, this),
      /* @__PURE__ */ jsxDEV("button", { type: "button", disabled: section.locked || sectionIndex === snapshot.document.sections.length - 1, onClick: () => move(1), children: "Move later" }, void 0, false, {
        fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
        lineNumber: 1160,
        columnNumber: 9
      }, this),
      /* @__PURE__ */ jsxDEV("button", { type: "button", disabled: section.locked || section.type === "finale", onClick: duplicate, children: "Duplicate" }, void 0, false, {
        fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
        lineNumber: 1161,
        columnNumber: 9
      }, this)
    ] }, void 0, true, {
      fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
      lineNumber: 1158,
      columnNumber: 7
    }, this),
    /* @__PURE__ */ jsxDEV(Property, { label: "Section name", children: /* @__PURE__ */ jsxDEV("input", { value: section.label, onChange: (event) => update("Rename Section", (draft) => {
      draft.label = event.target.value;
    }, `section:${section.id}:label`) }, void 0, false, {
      fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
      lineNumber: 1163,
      columnNumber: 38
    }, this) }, void 0, false, {
      fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
      lineNumber: 1163,
      columnNumber: 7
    }, this),
    /* @__PURE__ */ jsxDEV(Property, { label: "Stable ID", children: [
      /* @__PURE__ */ jsxDEV("input", { value: section.id, readOnly: true }, void 0, false, {
        fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
        lineNumber: 1164,
        columnNumber: 35
      }, this),
      /* @__PURE__ */ jsxDEV("small", { children: "References this Section without tying it to its current meaning." }, void 0, false, {
        fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
        lineNumber: 1164,
        columnNumber: 72
      }, this)
    ] }, void 0, true, {
      fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
      lineNumber: 1164,
      columnNumber: 7
    }, this),
    /* @__PURE__ */ jsxDEV(Property, { label: "Type", children: /* @__PURE__ */ jsxDEV("select", { value: section.type, disabled: section.type === "finale", onChange: (event) => update("Change Section type", (draft) => {
      draft.type = event.target.value;
    }), children: [
      /* @__PURE__ */ jsxDEV("option", { value: "spatial", children: "Spatial" }, void 0, false, {
        fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
        lineNumber: 1167,
        columnNumber: 11
      }, this),
      /* @__PURE__ */ jsxDEV("option", { value: "editorial", children: "Editorial" }, void 0, false, {
        fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
        lineNumber: 1167,
        columnNumber: 51
      }, this),
      /* @__PURE__ */ jsxDEV("option", { value: "finale", children: "Finale" }, void 0, false, {
        fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
        lineNumber: 1167,
        columnNumber: 95
      }, this)
    ] }, void 0, true, {
      fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
      lineNumber: 1166,
      columnNumber: 9
    }, this) }, void 0, false, {
      fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
      lineNumber: 1165,
      columnNumber: 7
    }, this),
    /* @__PURE__ */ jsxDEV("details", { open: true, children: [
      /* @__PURE__ */ jsxDEV("summary", { children: "Section timing" }, void 0, false, {
        fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
        lineNumber: 1171,
        columnNumber: 9
      }, this),
      /* @__PURE__ */ jsxDEV(Property, { label: "Scroll travel", children: /* @__PURE__ */ jsxDEV("output", { className: "about-editor-readout", children: formatWU(Math.max(0, activeExtent - 1)) }, void 0, false, {
        fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
        lineNumber: 1172,
        columnNumber: 41
      }, this) }, void 0, false, {
        fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
        lineNumber: 1172,
        columnNumber: 9
      }, this),
      /* @__PURE__ */ jsxDEV(Property, { label: "Total height", children: /* @__PURE__ */ jsxDEV("output", { className: "about-editor-readout", children: formatWU(activeExtent) }, void 0, false, {
        fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
        lineNumber: 1173,
        columnNumber: 40
      }, this) }, void 0, false, {
        fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
        lineNumber: 1173,
        columnNumber: 9
      }, this),
      /* @__PURE__ */ jsxDEV(NumberProperty, { label: "Desktop length", value: section.extentWU, min: 1, max: 8, step: 0.05, unit: "WU", onChange: (value) => update("Change desktop Section length", (draft) => {
        draft.extentWU = value;
      }, `section:${section.id}:extent`) }, void 0, false, {
        fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
        lineNumber: 1174,
        columnNumber: 9
      }, this),
      /* @__PURE__ */ jsxDEV(NumberProperty, { label: "Mobile length", value: section.mobileExtentWU, min: 1, max: 8, step: 0.05, unit: "WU", onChange: (value) => update("Change mobile Section length", (draft) => {
        draft.mobileExtentWU = value;
      }, `section:${section.id}:mobile`) }, void 0, false, {
        fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
        lineNumber: 1175,
        columnNumber: 9
      }, this),
      /* @__PURE__ */ jsxDEV(Property, { label: "Resolved height", children: /* @__PURE__ */ jsxDEV("output", { className: "about-editor-readout", children: formatWU(resolvedExtent) }, void 0, false, {
        fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
        lineNumber: 1176,
        columnNumber: 43
      }, this) }, void 0, false, {
        fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
        lineNumber: 1176,
        columnNumber: 9
      }, this),
      contentMinimumActive ? /* @__PURE__ */ jsxDEV("p", { className: "about-editor-timing-warning", children: [
        "Content minimum in effect. The rendered copy needs ",
        formatWU(resolvedExtent),
        " in this profile."
      ] }, void 0, true, {
        fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
        lineNumber: 1177,
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
          lineNumber: 1178,
          columnNumber: 9
        },
        this
      )
    ] }, void 0, true, {
      fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
      lineNumber: 1170,
      columnNumber: 7
    }, this),
    section.type === "editorial" ? /* @__PURE__ */ jsxDEV(EditorialBlocks, { store, snapshot, section }, void 0, false, {
      fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
      lineNumber: 1185,
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
        lineNumber: 1187,
        columnNumber: 7
      },
      this
    ) : null
  ] }, void 0, true, {
    fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
    lineNumber: 1155,
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
      lineNumber: 1225,
      columnNumber: 7
    }, this),
    (section.text.blocks || []).map(
      (block, blockIndex) => /* @__PURE__ */ jsxDEV("div", { className: "about-editor-block", children: [
        /* @__PURE__ */ jsxDEV("div", { children: [
          /* @__PURE__ */ jsxDEV("code", { children: block.kind }, void 0, false, {
            fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
            lineNumber: 1228,
            columnNumber: 16
          }, this),
          /* @__PURE__ */ jsxDEV("span", { children: block.id }, void 0, false, {
            fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
            lineNumber: 1228,
            columnNumber: 41
          }, this)
        ] }, void 0, true, {
          fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
          lineNumber: 1228,
          columnNumber: 11
        }, this),
        block.label != null ? /* @__PURE__ */ jsxDEV(Property, { label: "Label", children: /* @__PURE__ */ jsxDEV("input", { value: block.label, onChange: (event) => updateBlock(blockIndex, "label", event.target.value) }, void 0, false, {
          fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
          lineNumber: 1229,
          columnNumber: 58
        }, this) }, void 0, false, {
          fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
          lineNumber: 1229,
          columnNumber: 34
        }, this) : null,
        block.text != null ? /* @__PURE__ */ jsxDEV(Property, { label: "Copy", children: /* @__PURE__ */ jsxDEV("textarea", { rows: "5", value: block.text, onChange: (event) => updateBlock(blockIndex, "text", event.target.value) }, void 0, false, {
          fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
          lineNumber: 1230,
          columnNumber: 56
        }, this) }, void 0, false, {
          fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
          lineNumber: 1230,
          columnNumber: 33
        }, this) : null,
        block.kind === "prose" ? /* @__PURE__ */ jsxDEV(Property, { label: "Reconnect point grid", children: /* @__PURE__ */ jsxDEV("input", { type: "checkbox", checked: block.worldInfluence === true, onChange: (event) => updateBlock(blockIndex, "worldInfluence", event.target.checked) }, void 0, false, {
          fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
          lineNumber: 1231,
          columnNumber: 76
        }, this) }, void 0, false, {
          fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
          lineNumber: 1231,
          columnNumber: 37
        }, this) : null,
        block.text != null ? /* @__PURE__ */ jsxDEV("div", { className: "about-editor-emphasis-controls", children: [
          /* @__PURE__ */ jsxDEV("span", { children: "Highlighted words" }, void 0, false, {
            fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
            lineNumber: 1234,
            columnNumber: 15
          }, this),
          (block.emphasis || []).map(
            (item, emphasisIndex) => /* @__PURE__ */ jsxDEV("div", { className: "about-editor-emphasis-row", children: [
              /* @__PURE__ */ jsxDEV("input", { "aria-label": "Highlighted phrase", value: item.text, onChange: (event) => updateEmphasis(blockIndex, emphasisIndex, "text", event.target.value) }, void 0, false, {
                fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
                lineNumber: 1237,
                columnNumber: 19
              }, this),
              /* @__PURE__ */ jsxDEV("select", { "aria-label": "Highlight colour", value: item.tone, onChange: (event) => updateEmphasis(blockIndex, emphasisIndex, "tone", event.target.value), children: ABOUT_NARRATIVE_EMPHASIS_TONES.map((tone) => /* @__PURE__ */ jsxDEV("option", { value: tone, children: tone }, tone, false, {
                fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
                lineNumber: 1239,
                columnNumber: 67
              }, this)) }, void 0, false, {
                fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
                lineNumber: 1238,
                columnNumber: 19
              }, this),
              /* @__PURE__ */ jsxDEV("button", { type: "button", "aria-label": `Remove ${item.text || "empty"} highlight`, onClick: () => removeEmphasis(blockIndex, emphasisIndex), children: "×" }, void 0, false, {
                fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
                lineNumber: 1241,
                columnNumber: 19
              }, this)
            ] }, `${block.id}-emphasis-${emphasisIndex}`, true, {
              fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
              lineNumber: 1236,
              columnNumber: 11
            }, this)
          ),
          /* @__PURE__ */ jsxDEV("button", { type: "button", onClick: () => addEmphasis(blockIndex), children: "Add highlight" }, void 0, false, {
            fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
            lineNumber: 1244,
            columnNumber: 15
          }, this)
        ] }, void 0, true, {
          fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
          lineNumber: 1233,
          columnNumber: 9
        }, this) : null,
        block.items ? /* @__PURE__ */ jsxDEV(Property, { label: "Items", children: /* @__PURE__ */ jsxDEV("textarea", { rows: "6", value: block.items.join("\n"), onChange: (event) => updateBlock(blockIndex, "items", event.target.value.split("\n").filter(Boolean)) }, void 0, false, {
          fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
          lineNumber: 1247,
          columnNumber: 50
        }, this) }, void 0, false, {
          fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
          lineNumber: 1247,
          columnNumber: 26
        }, this) : null
      ] }, block.id, true, {
        fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
        lineNumber: 1227,
        columnNumber: 7
      }, this)
    ),
    /* @__PURE__ */ jsxDEV("button", { type: "button", className: "about-editor-wide-action", onClick: () => store.commit("Add editorial block", (draft) => {
      draft.sections[sectionIndex].text.blocks.push({ id: nextId(draft, `${section.id}-prose`), kind: "prose", text: "New editorial paragraph." });
    }), children: "Add prose block" }, void 0, false, {
      fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
      lineNumber: 1250,
      columnNumber: 7
    }, this)
  ] }, void 0, true, {
    fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
    lineNumber: 1224,
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
      lineNumber: 1352,
      columnNumber: 7
    }, this),
    members.length > 1 ? /* @__PURE__ */ jsxDEV(Fragment, { children: [
      /* @__PURE__ */ jsxDEV("div", { className: "about-editor-rhythm-actions", children: [
        /* @__PURE__ */ jsxDEV("button", { type: "button", onClick: distribute, children: "Distribute evenly" }, void 0, false, {
          fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
          lineNumber: 1356,
          columnNumber: 13
        }, this),
        /* @__PURE__ */ jsxDEV("button", { type: "button", onClick: alignPrimary, children: "Align primary to playhead" }, void 0, false, {
          fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
          lineNumber: 1357,
          columnNumber: 13
        }, this)
      ] }, void 0, true, {
        fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
        lineNumber: 1355,
        columnNumber: 11
      }, this),
      /* @__PURE__ */ jsxDEV("div", { className: "about-editor-rhythm-gap", children: [
        /* @__PURE__ */ jsxDEV(Property, { label: "Exact gap", children: /* @__PURE__ */ jsxDEV("input", { type: "number", min: "0", max: "8", step: "0.05", value: gapWU, onChange: (event) => setGapWU(Math.max(0, Number(event.target.value) || 0)) }, void 0, false, {
          fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
          lineNumber: 1360,
          columnNumber: 41
        }, this) }, void 0, false, {
          fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
          lineNumber: 1360,
          columnNumber: 13
        }, this),
        /* @__PURE__ */ jsxDEV(Property, { label: "Anchor", children: /* @__PURE__ */ jsxDEV("select", { value: anchor, onChange: (event) => setAnchor(event.target.value), children: [
          /* @__PURE__ */ jsxDEV("option", { value: "primary", children: "Primary" }, void 0, false, {
            fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
            lineNumber: 1361,
            columnNumber: 113
          }, this),
          /* @__PURE__ */ jsxDEV("option", { value: "first", children: "First" }, void 0, false, {
            fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
            lineNumber: 1361,
            columnNumber: 153
          }, this),
          /* @__PURE__ */ jsxDEV("option", { value: "last", children: "Last" }, void 0, false, {
            fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
            lineNumber: 1361,
            columnNumber: 189
          }, this)
        ] }, void 0, true, {
          fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
          lineNumber: 1361,
          columnNumber: 38
        }, this) }, void 0, false, {
          fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
          lineNumber: 1361,
          columnNumber: 13
        }, this),
        /* @__PURE__ */ jsxDEV("button", { type: "button", onClick: exactGap, children: "Preview exact gap" }, void 0, false, {
          fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
          lineNumber: 1362,
          columnNumber: 13
        }, this)
      ] }, void 0, true, {
        fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
        lineNumber: 1359,
        columnNumber: 11
      }, this)
    ] }, void 0, true, {
      fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
      lineNumber: 1354,
      columnNumber: 7
    }, this) : null,
    ghostMoves.length ? /* @__PURE__ */ jsxDEV("div", { className: "about-editor-rhythm-preview", "aria-label": "Proposed title rhythm", children: ghostMoves.map((move) => {
      const compiled = snapshot.compiledPlan.sections.find((item) => item.id === move.sectionId);
      const storyWU = Number(compiled?.startWU || 0) + move.hold * Number(compiled?.travelWU || 0);
      return /* @__PURE__ */ jsxDEV("i", { style: { left: `${storyWU / maxWU * 100}%` }, title: `${move.cueId} · ${formatWU(storyWU)}` }, `${move.sectionId}:${move.cueId}`, false, {
        fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
        lineNumber: 1371,
        columnNumber: 18
      }, this);
    }) }, void 0, false, {
      fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
      lineNumber: 1367,
      columnNumber: 7
    }, this) : null,
    message ? /* @__PURE__ */ jsxDEV("p", { className: `about-editor-rhythm-message${preview && !preview.valid ? " is-error" : ""}`, children: message }, void 0, false, {
      fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
      lineNumber: 1375,
      columnNumber: 18
    }, this) : null,
    preview?.valid && snapshot.tryState ? /* @__PURE__ */ jsxDEV("div", { className: "about-editor-try", children: [
      /* @__PURE__ */ jsxDEV("span", { children: [
        "Previewing ",
        preview.label
      ] }, void 0, true, {
        fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
        lineNumber: 1376,
        columnNumber: 80
      }, this),
      /* @__PURE__ */ jsxDEV("button", { type: "button", onClick: cancelPreview, children: "Cancel" }, void 0, false, {
        fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
        lineNumber: 1376,
        columnNumber: 119
      }, this),
      /* @__PURE__ */ jsxDEV("button", { type: "button", className: "is-primary", onClick: applyPreview, children: "Apply" }, void 0, false, {
        fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
        lineNumber: 1376,
        columnNumber: 180
      }, this)
    ] }, void 0, true, {
      fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
      lineNumber: 1376,
      columnNumber: 46
    }, this) : null,
    /* @__PURE__ */ jsxDEV("div", { className: "about-editor-rhythm-actions", children: [
      /* @__PURE__ */ jsxDEV("button", { type: "button", onClick: duplicate, children: [
        "Duplicate ",
        members.length > 1 ? "selection" : "title"
      ] }, void 0, true, {
        fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
        lineNumber: 1378,
        columnNumber: 9
      }, this),
      /* @__PURE__ */ jsxDEV("button", { type: "button", onClick: copy, children: "Copy" }, void 0, false, {
        fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
        lineNumber: 1379,
        columnNumber: 9
      }, this),
      /* @__PURE__ */ jsxDEV("button", { type: "button", disabled: !clipboard, onClick: paste, children: "Paste at playhead" }, void 0, false, {
        fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
        lineNumber: 1380,
        columnNumber: 9
      }, this)
    ] }, void 0, true, {
      fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
      lineNumber: 1377,
      columnNumber: 7
    }, this)
  ] }, void 0, true, {
    fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
    lineNumber: 1351,
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
    lineNumber: 1391,
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
        lineNumber: 1411,
        columnNumber: 15
      }, this),
      /* @__PURE__ */ jsxDEV("strong", { children: cue.id }, void 0, false, {
        fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
        lineNumber: 1411,
        columnNumber: 36
      }, this)
    ] }, void 0, true, {
      fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
      lineNumber: 1411,
      columnNumber: 7
    }, this),
    selectedMembers.length > 1 ? /* @__PURE__ */ jsxDEV("div", { className: "about-editor-group-summary", children: [
      /* @__PURE__ */ jsxDEV("strong", { children: [
        selectedMembers.length,
        " titles selected"
      ] }, void 0, true, {
        fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
        lineNumber: 1414,
        columnNumber: 11
      }, this),
      /* @__PURE__ */ jsxDEV("ol", { children: selectedMembers.map((member) => {
        const memberSection = snapshot.document.sections.find((item) => item.id === member.sectionId);
        const memberCue = memberSection?.text?.cues?.find((item) => item.id === member.cueId);
        return /* @__PURE__ */ jsxDEV("li", { children: [
          /* @__PURE__ */ jsxDEV("span", { children: memberSection?.label }, void 0, false, {
            fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
            lineNumber: 1418,
            columnNumber: 68
          }, this),
          memberCue?.text
        ] }, `${member.sectionId}:${member.cueId}`, true, {
          fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
          lineNumber: 1418,
          columnNumber: 20
        }, this);
      }) }, void 0, false, {
        fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
        lineNumber: 1415,
        columnNumber: 11
      }, this),
      /* @__PURE__ */ jsxDEV("button", { type: "button", onClick: () => store.setSelection({ type: "cue", sectionId: section.id, cueId: cue.id, keyPart: "focus" }), children: "Keep primary only" }, void 0, false, {
        fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
        lineNumber: 1420,
        columnNumber: 11
      }, this)
    ] }, void 0, true, {
      fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
      lineNumber: 1413,
      columnNumber: 7
    }, this) : null,
    /* @__PURE__ */ jsxDEV("p", { className: "about-editor-help", children: "Drag the pink timing marker anywhere from 0–100% of its Section. This moves the title's focus time only. Its travel duration, speed, blur, and in/out cadence remain controlled globally under Spatial titles." }, void 0, false, {
      fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
      lineNumber: 1423,
      columnNumber: 7
    }, this),
    /* @__PURE__ */ jsxDEV(Property, { label: "Statement", children: /* @__PURE__ */ jsxDEV("textarea", { rows: "7", value: cue.text, onChange: (event) => update("text", event.target.value) }, void 0, false, {
      fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
      lineNumber: 1424,
      columnNumber: 35
    }, this) }, void 0, false, {
      fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
      lineNumber: 1424,
      columnNumber: 7
    }, this),
    /* @__PURE__ */ jsxDEV(Property, { label: "Movement", children: /* @__PURE__ */ jsxDEV("select", { value: movement, onChange: (event) => updateMovement(event.target.value), children: [
      /* @__PURE__ */ jsxDEV("option", { value: "spatial", children: "Spatial travel" }, void 0, false, {
        fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
        lineNumber: 1425,
        columnNumber: 116
      }, this),
      /* @__PURE__ */ jsxDEV("option", { value: "vertical", children: "Vertical scroll" }, void 0, false, {
        fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
        lineNumber: 1425,
        columnNumber: 163
      }, this)
    ] }, void 0, true, {
      fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
      lineNumber: 1425,
      columnNumber: 34
    }, this) }, void 0, false, {
      fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
      lineNumber: 1425,
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
        lineNumber: 1426,
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
        lineNumber: 1438,
        columnNumber: 41
      }, this) }, void 0, false, {
        fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
        lineNumber: 1438,
        columnNumber: 11
      }, this),
      /* @__PURE__ */ jsxDEV(Property, { label: "Motion preset", children: /* @__PURE__ */ jsxDEV("select", { value: cue.preset, onChange: (event) => update("preset", event.target.value), children: [
        /* @__PURE__ */ jsxDEV("option", { value: "travelling-title-v1", children: "Travelling title" }, void 0, false, {
          fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
          lineNumber: 1439,
          columnNumber: 129
        }, this),
        /* @__PURE__ */ jsxDEV("option", { value: "opener-v1", children: "Opener" }, void 0, false, {
          fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
          lineNumber: 1439,
          columnNumber: 190
        }, this),
        /* @__PURE__ */ jsxDEV("option", { value: "finale-v1", children: "Finale" }, void 0, false, {
          fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
          lineNumber: 1439,
          columnNumber: 231
        }, this)
      ] }, void 0, true, {
        fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
        lineNumber: 1439,
        columnNumber: 43
      }, this) }, void 0, false, {
        fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
        lineNumber: 1439,
        columnNumber: 11
      }, this)
    ] }, void 0, true, {
      fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
      lineNumber: 1437,
      columnNumber: 7
    }, this) : /* @__PURE__ */ jsxDEV(Property, { label: "Reveal", children: /* @__PURE__ */ jsxDEV("output", { className: "about-editor-readout", children: "Editorial vertical scroll" }, void 0, false, {
      fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
      lineNumber: 1441,
      columnNumber: 32
    }, this) }, void 0, false, {
      fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
      lineNumber: 1441,
      columnNumber: 7
    }, this),
    /* @__PURE__ */ jsxDEV(CueRhythmAndReuse, { store, snapshot, clipboard, setClipboard }, void 0, false, {
      fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
      lineNumber: 1442,
      columnNumber: 7
    }, this),
    /* @__PURE__ */ jsxDEV("button", { type: "button", className: "about-editor-danger", disabled: section.type === "finale", onClick: remove, children: "Delete Cue" }, void 0, false, {
      fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
      lineNumber: 1443,
      columnNumber: 7
    }, this)
  ] }, void 0, true, {
    fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
    lineNumber: 1410,
    columnNumber: 5
  }, this);
}
_c9 = CueInspector;
function DisciplineRevealInspector({ store, snapshot, section }) {
  const sectionIndex = getSectionIndex(snapshot.document, section.id);
  const reveal = section.text.disciplineReveal;
  if (!reveal) return /* @__PURE__ */ jsxDEV(SectionInspector, { store, snapshot, section }, void 0, false, {
    fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
    lineNumber: 1451,
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
        lineNumber: 1475,
        columnNumber: 15
      }, this),
      /* @__PURE__ */ jsxDEV("strong", { children: "Discipline reveal" }, void 0, false, {
        fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
        lineNumber: 1475,
        columnNumber: 41
      }, this)
    ] }, void 0, true, {
      fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
      lineNumber: 1475,
      columnNumber: 7
    }, this),
    /* @__PURE__ */ jsxDEV("p", { className: "about-editor-help", children: "One clip controls the complete six-point sequence. Drag its striped block in the Text lane to move every reveal together." }, void 0, false, {
      fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
      lineNumber: 1476,
      columnNumber: 7
    }, this),
    /* @__PURE__ */ jsxDEV("details", { open: true, children: [
      /* @__PURE__ */ jsxDEV("summary", { children: "Reveal choreography" }, void 0, false, {
        fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
        lineNumber: 1477,
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
            lineNumber: 1481,
            columnNumber: 13
          },
          this
        );
      })
    ] }, void 0, true, {
      fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
      lineNumber: 1477,
      columnNumber: 7
    }, this),
    /* @__PURE__ */ jsxDEV("details", { open: true, children: [
      /* @__PURE__ */ jsxDEV("summary", { children: "Reveal order and labels" }, void 0, false, {
        fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
        lineNumber: 1494,
        columnNumber: 21
      }, this),
      /* @__PURE__ */ jsxDEV("div", { className: "about-editor-discipline-items", children: reveal.items.map(
        (item, itemIndex) => /* @__PURE__ */ jsxDEV("div", { className: "about-editor-discipline-item", children: [
          /* @__PURE__ */ jsxDEV("code", { children: String(itemIndex + 1).padStart(2, "0") }, void 0, false, {
            fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
            lineNumber: 1498,
            columnNumber: 15
          }, this),
          /* @__PURE__ */ jsxDEV("input", { value: item.label, "aria-label": `Discipline ${itemIndex + 1} label`, onChange: (event) => update("Edit discipline label", (draft) => {
            draft.items[itemIndex].label = event.target.value;
          }, `discipline-reveal:${section.id}:item:${item.group}:label`) }, void 0, false, {
            fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
            lineNumber: 1499,
            columnNumber: 15
          }, this),
          /* @__PURE__ */ jsxDEV("div", { className: "about-editor-discipline-palette", title: `${item.label} uses the Home simulation ${DISCIPLINE_BALL_TOKEN_BY_GROUP[item.group]}`, children: [
            /* @__PURE__ */ jsxDEV("i", { style: { background: `var(${DISCIPLINE_BALL_TOKEN_BY_GROUP[item.group]})` } }, void 0, false, {
              fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
              lineNumber: 1501,
              columnNumber: 17
            }, this),
            /* @__PURE__ */ jsxDEV("code", { children: DISCIPLINE_BALL_TOKEN_BY_GROUP[item.group] }, void 0, false, {
              fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
              lineNumber: 1502,
              columnNumber: 17
            }, this)
          ] }, void 0, true, {
            fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
            lineNumber: 1500,
            columnNumber: 15
          }, this),
          /* @__PURE__ */ jsxDEV("span", { children: [
            /* @__PURE__ */ jsxDEV("button", { type: "button", disabled: itemIndex === 0, "aria-label": `Reveal ${item.label} earlier`, onClick: () => update("Reorder discipline reveal", (draft) => {
              const [moved] = draft.items.splice(itemIndex, 1);
              draft.items.splice(itemIndex - 1, 0, moved);
            }), children: "↑" }, void 0, false, {
              fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
              lineNumber: 1505,
              columnNumber: 17
            }, this),
            /* @__PURE__ */ jsxDEV("button", { type: "button", disabled: itemIndex === reveal.items.length - 1, "aria-label": `Reveal ${item.label} later`, onClick: () => update("Reorder discipline reveal", (draft) => {
              const [moved] = draft.items.splice(itemIndex, 1);
              draft.items.splice(itemIndex + 1, 0, moved);
            }), children: "↓" }, void 0, false, {
              fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
              lineNumber: 1506,
              columnNumber: 17
            }, this)
          ] }, void 0, true, {
            fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
            lineNumber: 1504,
            columnNumber: 15
          }, this)
        ] }, item.group, true, {
          fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
          lineNumber: 1497,
          columnNumber: 11
        }, this)
      ) }, void 0, false, {
        fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
        lineNumber: 1495,
        columnNumber: 9
      }, this)
    ] }, void 0, true, {
      fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
      lineNumber: 1494,
      columnNumber: 7
    }, this),
    /* @__PURE__ */ jsxDEV("p", { className: "about-editor-help", children: "The six points persist after the labels leave. An editorial block marked “Reconnect point grid” restores the surrounding grid as that paragraph enters." }, void 0, false, {
      fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
      lineNumber: 1512,
      columnNumber: 7
    }, this)
  ] }, void 0, true, {
    fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
    lineNumber: 1474,
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
    lineNumber: 1576,
    columnNumber: 127
  }, this)) }, void 0, false, {
    fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
    lineNumber: 1576,
    columnNumber: 19
  }, this);
  if (!key) {
    return /* @__PURE__ */ jsxDEV(Fragment, { children: [
      /* @__PURE__ */ jsxDEV("header", { children: [
        /* @__PURE__ */ jsxDEV("span", { children: "Camera track" }, void 0, false, {
          fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
          lineNumber: 1578,
          columnNumber: 22
        }, this),
        /* @__PURE__ */ jsxDEV("strong", { children: "Editing Section base" }, void 0, false, {
          fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
          lineNumber: 1578,
          columnNumber: 47
        }, this)
      ] }, void 0, true, {
        fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
        lineNumber: 1578,
        columnNumber: 14
      }, this),
      /* @__PURE__ */ jsxDEV("p", { className: "about-editor-help", children: "The dolly and Section joins are continuous automatically. Add visible keys only where the framing, aim, roll, or lens should change." }, void 0, false, {
        fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
        lineNumber: 1578,
        columnNumber: 93
      }, this),
      recipes,
      /* @__PURE__ */ jsxDEV("button", { type: "button", className: "about-editor-wide-action", onClick: setKey, children: [
        "Set camera key at ",
        formatCameraPercent(targetAt)
      ] }, void 0, true, {
        fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
        lineNumber: 1578,
        columnNumber: 271
      }, this)
    ] }, void 0, true, {
      fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
      lineNumber: 1578,
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
        lineNumber: 1597,
        columnNumber: 15
      }, this),
      /* @__PURE__ */ jsxDEV("strong", { children: [
        formatCameraPercent(key.at),
        " through ",
        section.label
      ] }, void 0, true, {
        fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
        lineNumber: 1597,
        columnNumber: 38
      }, this)
    ] }, void 0, true, {
      fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
      lineNumber: 1597,
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
        lineNumber: 1599,
        columnNumber: 7
      },
      this
    ),
    /* @__PURE__ */ jsxDEV(NumberProperty, { label: extentLabel, value: section[extentField], min: 1, max: 8, step: 0.05, unit: "WU", onChange: updateExtent }, void 0, false, {
      fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
      lineNumber: 1608,
      columnNumber: 7
    }, this),
    ["X offset", "Y offset", "Forward offset"].map((label, axis) => /* @__PURE__ */ jsxDEV(NumberProperty, { label, value: key.offset[axis], min: -8, max: 8, step: 0.02, unit: "WU", onChange: (value) => updateVector("offset", axis, value) }, label, false, {
      fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
      lineNumber: 1609,
      columnNumber: 72
    }, this)),
    ["Aim X", "Aim Y", "Aim depth"].map((label, axis) => /* @__PURE__ */ jsxDEV(NumberProperty, { label, value: key.lookAtOffset[axis], min: -8, max: 8, step: 0.02, unit: "WU", onChange: (value) => updateVector("lookAtOffset", axis, value) }, label, false, {
      fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
      lineNumber: 1610,
      columnNumber: 61
    }, this)),
    /* @__PURE__ */ jsxDEV(NumberProperty, { label: "Field of view", value: key.fov, min: 20, max: 90, step: 1, unit: "°", onChange: (value) => update("fov", value) }, void 0, false, {
      fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
      lineNumber: 1611,
      columnNumber: 7
    }, this),
    /* @__PURE__ */ jsxDEV(NumberProperty, { label: "Roll", value: key.roll, min: -1.2, max: 1.2, step: 0.01, unit: "rad", onChange: (value) => update("roll", value) }, void 0, false, {
      fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
      lineNumber: 1612,
      columnNumber: 7
    }, this),
    /* @__PURE__ */ jsxDEV(Property, { label: "Easing", children: /* @__PURE__ */ jsxDEV("select", { value: key.easing, onChange: (event) => update("easing", event.target.value), children: [
      /* @__PURE__ */ jsxDEV("option", { value: "smoothstep", children: "Smoothstep" }, void 0, false, {
        fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
        lineNumber: 1613,
        columnNumber: 118
      }, this),
      /* @__PURE__ */ jsxDEV("option", { value: "ease-in-out", children: "Ease in out" }, void 0, false, {
        fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
        lineNumber: 1613,
        columnNumber: 164
      }, this)
    ] }, void 0, true, {
      fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
      lineNumber: 1613,
      columnNumber: 32
    }, this) }, void 0, false, {
      fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
      lineNumber: 1613,
      columnNumber: 7
    }, this),
    /* @__PURE__ */ jsxDEV("button", { type: "button", className: "about-editor-wide-action", disabled: existingKeyAtPlayhead >= 0, onClick: setKey, children: existingKeyAtPlayhead >= 0 ? `Camera key already at ${formatCameraPercent(targetAt)}` : `Set another key at ${formatCameraPercent(targetAt)}` }, void 0, false, {
      fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
      lineNumber: 1614,
      columnNumber: 7
    }, this),
    /* @__PURE__ */ jsxDEV("button", { type: "button", className: "about-editor-danger", onClick: () => store.commit("Delete camera key", (draft) => {
      draft.sections[sectionIndex].camera.keys.splice(keyIndex, 1);
    }, { selection: { type: "section", sectionId: section.id } }), children: "Delete key" }, void 0, false, {
      fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
      lineNumber: 1615,
      columnNumber: 7
    }, this)
  ] }, void 0, true, {
    fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
    lineNumber: 1596,
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
          lineNumber: 1630,
          columnNumber: 22
        }, this),
        /* @__PURE__ */ jsxDEV("strong", { children: "Inherited World" }, void 0, false, {
          fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
          lineNumber: 1630,
          columnNumber: 46
        }, this)
      ] }, void 0, true, {
        fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
        lineNumber: 1630,
        columnNumber: 14
      }, this),
      /* @__PURE__ */ jsxDEV("p", { className: "about-editor-help", children: "This Section keeps the previous World. Choose “Create World clip” only when the shape should change here." }, void 0, false, {
        fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
        lineNumber: 1630,
        columnNumber: 87
      }, this),
      /* @__PURE__ */ jsxDEV("button", { type: "button", className: "about-editor-wide-action", onClick: () => store.commit("Create World clip", (draft) => {
        draft.sections[sectionIndex].world = cloneAboutNarrativeDocument(draft.sections.slice(0, sectionIndex).reverse().find((item) => item.world.mode === "set")?.world || draft.sections[0].world);
      }), children: "Create World clip" }, void 0, false, {
        fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
        lineNumber: 1630,
        columnNumber: 229
      }, this)
    ] }, void 0, true, {
      fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
      lineNumber: 1630,
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
        lineNumber: 1663,
        columnNumber: 15
      }, this),
      /* @__PURE__ */ jsxDEV("strong", { children: shape?.label || world.shapeId }, void 0, false, {
        fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
        lineNumber: 1663,
        columnNumber: 38
      }, this)
    ] }, void 0, true, {
      fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
      lineNumber: 1663,
      columnNumber: 7
    }, this),
    /* @__PURE__ */ jsxDEV("div", { className: "about-editor-shape-catalog", children: Object.values(ABOUT_NARRATIVE_SHAPE_DEFINITIONS).map(
      (item) => /* @__PURE__ */ jsxDEV("button", { type: "button", disabled: section.locked, className: item.id === world.shapeId ? "is-selected" : "", onClick: () => tryShape(item.id), children: [
        /* @__PURE__ */ jsxDEV("i", {}, void 0, false, {
          fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
          lineNumber: 1667,
          columnNumber: 13
        }, this),
        /* @__PURE__ */ jsxDEV("span", { children: [
          /* @__PURE__ */ jsxDEV("strong", { children: item.label }, void 0, false, {
            fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
            lineNumber: 1667,
            columnNumber: 24
          }, this),
          /* @__PURE__ */ jsxDEV("small", { children: [
            "Cost ",
            item.cost,
            " · Point field"
          ] }, void 0, true, {
            fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
            lineNumber: 1667,
            columnNumber: 53
          }, this)
        ] }, void 0, true, {
          fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
          lineNumber: 1667,
          columnNumber: 18
        }, this)
      ] }, item.id, true, {
        fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
        lineNumber: 1666,
        columnNumber: 9
      }, this)
    ) }, void 0, false, {
      fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
      lineNumber: 1664,
      columnNumber: 7
    }, this),
    snapshot.tryState ? /* @__PURE__ */ jsxDEV("div", { className: "about-editor-try", children: [
      /* @__PURE__ */ jsxDEV("span", { children: [
        "Trying ",
        snapshot.tryState.label
      ] }, void 0, true, {
        fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
        lineNumber: 1671,
        columnNumber: 62
      }, this),
      /* @__PURE__ */ jsxDEV("button", { type: "button", onClick: () => store.cancelTry(), children: "Cancel" }, void 0, false, {
        fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
        lineNumber: 1671,
        columnNumber: 107
      }, this),
      /* @__PURE__ */ jsxDEV("button", { type: "button", className: "is-primary", onClick: () => store.applyTry(), children: "Apply" }, void 0, false, {
        fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
        lineNumber: 1671,
        columnNumber: 178
      }, this)
    ] }, void 0, true, {
      fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
      lineNumber: 1671,
      columnNumber: 28
    }, this) : null,
    /* @__PURE__ */ jsxDEV("details", { open: true, children: [
      /* @__PURE__ */ jsxDEV("summary", { children: "Shape parameters" }, void 0, false, {
        fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
        lineNumber: 1672,
        columnNumber: 21
      }, this),
      (shape?.parameters || []).map((control) => /* @__PURE__ */ jsxDEV(NumberProperty, { label: control.label, value: world.shapeParameters[control.id], min: control.min, max: control.max, step: control.step, unit: control.unit, onChange: (value) => update(`Change ${control.label}`, (draft) => {
        draft.shapeParameters[control.id] = value;
      }, `world:${section.id}:${control.id}`) }, control.id, false, {
        fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
        lineNumber: 1673,
        columnNumber: 53
      }, this)),
      /* @__PURE__ */ jsxDEV("div", { className: "about-editor-inline-actions", children: [
        /* @__PURE__ */ jsxDEV("button", { type: "button", onClick: () => update("Reseed Shape", (draft) => {
          draft.seed = Math.floor(Math.random() * 4294967295);
        }), children: "Reseed" }, void 0, false, {
          fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
          lineNumber: 1674,
          columnNumber: 54
        }, this),
        /* @__PURE__ */ jsxDEV("code", { children: world.seed }, void 0, false, {
          fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
          lineNumber: 1674,
          columnNumber: 197
        }, this)
      ] }, void 0, true, {
        fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
        lineNumber: 1674,
        columnNumber: 9
      }, this)
    ] }, void 0, true, {
      fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
      lineNumber: 1672,
      columnNumber: 7
    }, this),
    /* @__PURE__ */ jsxDEV("details", { open: true, children: [
      /* @__PURE__ */ jsxDEV("summary", { children: "Placement" }, void 0, false, {
        fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
        lineNumber: 1676,
        columnNumber: 21
      }, this),
      /* @__PURE__ */ jsxDEV(NumberProperty, { label: "Distance at entry", value: world.entryDistanceWU, min: 0.2, max: 16, step: 0.05, unit: "WU", onChange: (value) => update("Move World", (draft) => {
        draft.entryDistanceWU = value;
      }, `world:${section.id}:distance`) }, void 0, false, {
        fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
        lineNumber: 1677,
        columnNumber: 9
      }, this),
      /* @__PURE__ */ jsxDEV(NumberProperty, { label: "Scale", value: world.transform.scale, min: 0.1, max: 3, step: 0.01, onChange: (value) => update("Scale World", (draft) => {
        draft.transform.scale = value;
      }, `world:${section.id}:scale`) }, void 0, false, {
        fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
        lineNumber: 1678,
        columnNumber: 9
      }, this)
    ] }, void 0, true, {
      fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
      lineNumber: 1676,
      columnNumber: 7
    }, this),
    /* @__PURE__ */ jsxDEV("details", { open: true, children: [
      /* @__PURE__ */ jsxDEV("summary", { children: "Transition in" }, void 0, false, {
        fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
        lineNumber: 1680,
        columnNumber: 21
      }, this),
      transitionEnabled ? /* @__PURE__ */ jsxDEV(Fragment, { children: [
        /* @__PURE__ */ jsxDEV("p", { className: "about-editor-help", children: [
          "Timing is relative to this Section: 1 is its end; values above 1 continue across inherited World Sections. The next World begins at ",
          transitionLimit.toFixed(3),
          "."
        ] }, void 0, true, {
          fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
          lineNumber: 1682,
          columnNumber: 11
        }, this),
        /* @__PURE__ */ jsxDEV(NumberProperty, { label: "Start", value: world.transitionIn.start, min: 0, max: transitionMax, step: 5e-3, unit: "× section", onChange: (value) => update("Change transition start", (draft) => {
          draft.transitionIn.start = Math.min(value, draft.transitionIn.end);
        }) }, void 0, false, {
          fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
          lineNumber: 1683,
          columnNumber: 11
        }, this),
        /* @__PURE__ */ jsxDEV(NumberProperty, { label: "End", value: world.transitionIn.end, min: 0, max: transitionMax, step: 5e-3, unit: "× section", onChange: (value) => update("Change transition end", (draft) => {
          draft.transitionIn.end = Math.max(value, draft.transitionIn.start);
        }) }, void 0, false, {
          fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
          lineNumber: 1684,
          columnNumber: 11
        }, this),
        /* @__PURE__ */ jsxDEV(Property, { label: "Type", children: /* @__PURE__ */ jsxDEV("select", { value: world.transitionIn.type, onChange: (event) => update("Change transition type", (draft) => {
          draft.transitionIn.type = event.target.value;
        }), children: [
          /* @__PURE__ */ jsxDEV("option", { value: "morph", children: "Morph" }, void 0, false, {
            fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
            lineNumber: 1685,
            columnNumber: 189
          }, this),
          /* @__PURE__ */ jsxDEV("option", { value: "dissolve-morph", children: "Dissolve morph" }, void 0, false, {
            fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
            lineNumber: 1685,
            columnNumber: 225
          }, this),
          /* @__PURE__ */ jsxDEV("option", { value: "crossfade", children: "Crossfade" }, void 0, false, {
            fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
            lineNumber: 1685,
            columnNumber: 279
          }, this),
          /* @__PURE__ */ jsxDEV("option", { value: "hold", children: "Hold" }, void 0, false, {
            fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
            lineNumber: 1685,
            columnNumber: 323
          }, this)
        ] }, void 0, true, {
          fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
          lineNumber: 1685,
          columnNumber: 34
        }, this) }, void 0, false, {
          fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
          lineNumber: 1685,
          columnNumber: 11
        }, this),
        /* @__PURE__ */ jsxDEV(Property, { label: "Easing", children: /* @__PURE__ */ jsxDEV("select", { value: world.transitionIn.easing, onChange: (event) => update("Change transition easing", (draft) => {
          draft.transitionIn.easing = event.target.value;
        }), children: [
          /* @__PURE__ */ jsxDEV("option", { value: "linear", children: "Linear" }, void 0, false, {
            fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
            lineNumber: 1686,
            columnNumber: 197
          }, this),
          /* @__PURE__ */ jsxDEV("option", { value: "smoothstep", children: "Smoothstep" }, void 0, false, {
            fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
            lineNumber: 1686,
            columnNumber: 235
          }, this),
          /* @__PURE__ */ jsxDEV("option", { value: "ease-in", children: "Ease in" }, void 0, false, {
            fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
            lineNumber: 1686,
            columnNumber: 281
          }, this),
          /* @__PURE__ */ jsxDEV("option", { value: "ease-out", children: "Ease out" }, void 0, false, {
            fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
            lineNumber: 1686,
            columnNumber: 321
          }, this),
          /* @__PURE__ */ jsxDEV("option", { value: "ease-in-out", children: "Ease in out" }, void 0, false, {
            fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
            lineNumber: 1686,
            columnNumber: 363
          }, this),
          /* @__PURE__ */ jsxDEV("option", { value: "hold", children: "Hold" }, void 0, false, {
            fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
            lineNumber: 1686,
            columnNumber: 411
          }, this)
        ] }, void 0, true, {
          fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
          lineNumber: 1686,
          columnNumber: 36
        }, this) }, void 0, false, {
          fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
          lineNumber: 1686,
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
          lineNumber: 1687,
          columnNumber: 11
        }, this),
        /* @__PURE__ */ jsxDEV(Property, { label: "Correspondence", children: /* @__PURE__ */ jsxDEV("select", { "aria-label": "Correspondence", value: world.transitionIn.correspondence, disabled: !correspondenceEnabled, title: correspondenceEnabled ? "Choose how source points are assigned to target points." : "Correspondence applies to Morph and Dissolve morph transitions.", onChange: (event) => update("Change correspondence", (draft) => {
          draft.transitionIn.correspondence = event.target.value;
        }), children: ABOUT_NARRATIVE_CORRESPONDENCE_MODES.map((mode) => /* @__PURE__ */ jsxDEV("option", { value: mode, children: CORRESPONDENCE_LABELS[mode] || mode }, mode, false, {
          fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
          lineNumber: 1688,
          columnNumber: 490
        }, this)) }, void 0, false, {
          fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
          lineNumber: 1688,
          columnNumber: 44
        }, this) }, void 0, false, {
          fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
          lineNumber: 1688,
          columnNumber: 11
        }, this),
        /* @__PURE__ */ jsxDEV("p", { className: "about-editor-help", role: "status", "aria-live": "polite", children: [
          "Correspondence: ",
          correspondenceStatus,
          prepared && runtimeMetrics?.correspondenceToWorldId === section.id && Number.isFinite(runtimeMetrics?.correspondenceImprovement) ? ` · ${Math.round(runtimeMetrics.correspondenceImprovement * 100)}% RMS improvement` : "",
          "."
        ] }, void 0, true, {
          fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
          lineNumber: 1689,
          columnNumber: 11
        }, this),
        /* @__PURE__ */ jsxDEV("button", { type: "button", className: "about-editor-danger", onClick: () => store.commit("Remove World transition", (draft) => {
          const transition = draft.sections[sectionIndex].world.transitionIn;
          transition.start = 0;
          transition.end = 0;
          transition.type = "cut";
        }, { selection: { type: "world", sectionId: section.id } }), children: "Remove transition keyframes" }, void 0, false, {
          fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
          lineNumber: 1690,
          columnNumber: 11
        }, this)
      ] }, void 0, true, {
        fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
        lineNumber: 1681,
        columnNumber: 30
      }, this) : /* @__PURE__ */ jsxDEV(Fragment, { children: [
        /* @__PURE__ */ jsxDEV("p", { className: "about-editor-help", children: "This World cuts in at the Section boundary and has no transition keyframes." }, void 0, false, {
          fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
          lineNumber: 1697,
          columnNumber: 11
        }, this),
        /* @__PURE__ */ jsxDEV("button", { type: "button", className: "about-editor-wide-action", onClick: () => store.commit("Add World transition", (draft) => {
          const transition = draft.sections[sectionIndex].world.transitionIn;
          transition.start = Math.min(0.08, transitionLimit);
          transition.end = Math.min(0.68, transitionLimit);
          transition.type = "morph";
        }, { selection: { type: "world", sectionId: section.id } }), children: "Add transition keyframes" }, void 0, false, {
          fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
          lineNumber: 1698,
          columnNumber: 11
        }, this)
      ] }, void 0, true, {
        fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
        lineNumber: 1696,
        columnNumber: 15
      }, this)
    ] }, void 0, true, {
      fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
      lineNumber: 1680,
      columnNumber: 7
    }, this),
    /* @__PURE__ */ jsxDEV("details", { open: true, children: [
      /* @__PURE__ */ jsxDEV("summary", { children: "Modifier stack" }, void 0, false, {
        fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
        lineNumber: 1706,
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
                lineNumber: 1715,
                columnNumber: 105
              }, this),
              definition?.label || item.id
            ] }, void 0, true, {
              fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
              lineNumber: 1715,
              columnNumber: 98
            }, this),
            /* @__PURE__ */ jsxDEV("span", { children: [
              /* @__PURE__ */ jsxDEV("button", { type: "button", disabled: modifierIndex === 0, onClick: () => moveModifier(-1), "aria-label": "Move modifier up", children: "↑" }, void 0, false, {
                fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
                lineNumber: 1715,
                columnNumber: 334
              }, this),
              /* @__PURE__ */ jsxDEV("button", { type: "button", disabled: modifierIndex === world.modifiers.length - 1, onClick: () => moveModifier(1), "aria-label": "Move modifier down", children: "↓" }, void 0, false, {
                fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
                lineNumber: 1715,
                columnNumber: 460
              }, this),
              " Cost ",
              definition?.cost || "?"
            ] }, void 0, true, {
              fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
              lineNumber: 1715,
              columnNumber: 328
            }, this)
          ] }, void 0, true, {
            fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
            lineNumber: 1715,
            columnNumber: 93
          }, this),
          (definition?.parameters || []).map((control) => control.type === "range" ? /* @__PURE__ */ jsxDEV(NumberProperty, { label: control.label, value: item.parameters[control.id], min: control.min, max: control.max, step: control.step, unit: control.unit, onChange: (value) => update(`Change ${control.label}`, (draft) => {
            draft.modifiers[modifierIndex].parameters[control.id] = value;
          }, `modifier:${section.id}:${modifierIndex}:${control.id}`) }, control.id, false, {
            fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
            lineNumber: 1715,
            columnNumber: 732
          }, this) : /* @__PURE__ */ jsxDEV(Property, { label: control.label, children: /* @__PURE__ */ jsxDEV("select", { value: item.parameters[control.id], onChange: (event) => update(`Change ${control.label}`, (draft) => {
            draft.modifiers[modifierIndex].parameters[control.id] = event.target.value;
          }), children: control.options.map((option) => /* @__PURE__ */ jsxDEV("option", { children: option }, option, false, {
            fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
            lineNumber: 1715,
            columnNumber: 1366
          }, this)) }, void 0, false, {
            fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
            lineNumber: 1715,
            columnNumber: 1143
          }, this) }, control.id, false, {
            fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
            lineNumber: 1715,
            columnNumber: 1094
          }, this))
        ] }, `${item.id}-${modifierIndex}`, true, {
          fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
          lineNumber: 1715,
          columnNumber: 18
        }, this);
      })
    ] }, void 0, true, {
      fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
      lineNumber: 1706,
      columnNumber: 7
    }, this)
  ] }, void 0, true, {
    fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
    lineNumber: 1662,
    columnNumber: 5
  }, this);
}
_c10 = WorldInspector;
function Diagnostics({ diagnostics }) {
  if (!diagnostics.length) return /* @__PURE__ */ jsxDEV("div", { className: "about-editor-diagnostics is-clear", children: [
    /* @__PURE__ */ jsxDEV(Check, { "aria-hidden": "true" }, void 0, false, {
      fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
      lineNumber: 1723,
      columnNumber: 86
    }, this),
    " No diagnostics"
  ] }, void 0, true, {
    fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
    lineNumber: 1723,
    columnNumber: 35
  }, this);
  return /* @__PURE__ */ jsxDEV("div", { className: "about-editor-diagnostics", children: diagnostics.map((item, index) => {
    const DiagnosticIcon = item.level === "error" ? CircleAlert : Info;
    return /* @__PURE__ */ jsxDEV("div", { className: `is-${item.level}`, children: [
      /* @__PURE__ */ jsxDEV(DiagnosticIcon, { "aria-hidden": "true" }, void 0, false, {
        fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
        lineNumber: 1726,
        columnNumber: 93
      }, this),
      /* @__PURE__ */ jsxDEV("span", { children: [
        /* @__PURE__ */ jsxDEV("strong", { children: item.message }, void 0, false, {
          fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
          lineNumber: 1726,
          columnNumber: 136
        }, this),
        /* @__PURE__ */ jsxDEV("small", { children: item.path }, void 0, false, {
          fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
          lineNumber: 1726,
          columnNumber: 167
        }, this)
      ] }, void 0, true, {
        fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
        lineNumber: 1726,
        columnNumber: 130
      }, this)
    ] }, `${item.code}-${item.path}-${index}`, true, {
      fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
      lineNumber: 1726,
      columnNumber: 14
    }, this);
  }) }, void 0, false, {
    fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
    lineNumber: 1724,
    columnNumber: 10
  }, this);
}
_c11 = Diagnostics;
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
      lineNumber: 1766,
      columnNumber: 7
    }, this),
    /* @__PURE__ */ jsxDEV("div", { className: "about-editor-audition-range", children: [
      /* @__PURE__ */ jsxDEV(Property, { label: "Pre-roll", children: /* @__PURE__ */ jsxDEV("input", { type: "number", min: "0", max: "2", step: "0.05", value: preRollWU, onChange: (event) => setPreRollWU(Math.max(0, Number(event.target.value) || 0)) }, void 0, false, {
        fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
        lineNumber: 1768,
        columnNumber: 36
      }, this) }, void 0, false, {
        fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
        lineNumber: 1768,
        columnNumber: 9
      }, this),
      /* @__PURE__ */ jsxDEV(Property, { label: "Post-roll", children: /* @__PURE__ */ jsxDEV("input", { type: "number", min: "0", max: "2", step: "0.05", value: postRollWU, onChange: (event) => setPostRollWU(Math.max(0, Number(event.target.value) || 0)) }, void 0, false, {
        fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
        lineNumber: 1769,
        columnNumber: 37
      }, this) }, void 0, false, {
        fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
        lineNumber: 1769,
        columnNumber: 9
      }, this)
    ] }, void 0, true, {
      fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
      lineNumber: 1767,
      columnNumber: 7
    }, this),
    range.valid ? /* @__PURE__ */ jsxDEV("p", { className: "about-editor-help", children: [
      formatWU(range.startWU),
      " → ",
      formatWU(range.endWU),
      " · ambient motion freezes for a repeatable review."
    ] }, void 0, true, {
      fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
      lineNumber: 1771,
      columnNumber: 22
    }, this) : /* @__PURE__ */ jsxDEV("p", { className: "about-editor-rhythm-message is-error", children: range.reason }, void 0, false, {
      fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
      lineNumber: 1771,
      columnNumber: 163
    }, this),
    /* @__PURE__ */ jsxDEV("button", { type: "button", className: active ? "is-active about-editor-wide-action" : "about-editor-wide-action", disabled: !range.valid, onClick: toggle, children: active ? "Stop audition" : "Loop this selection" }, void 0, false, {
      fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
      lineNumber: 1772,
      columnNumber: 7
    }, this)
  ] }, void 0, true, {
    fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
    lineNumber: 1765,
    columnNumber: 5
  }, this);
}
_s3(AuditionControls, "dFAS9Y1WbSWFrHycw0Ao6VfZPgM=");
_c12 = AuditionControls;
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
    lineNumber: 1784,
    columnNumber: 17
  }, this);
  if (snapshot.selection.type === "sequence") content = /* @__PURE__ */ jsxDEV(SequenceInspector, { store, snapshot }, void 0, false, {
    fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
    lineNumber: 1785,
    columnNumber: 57
  }, this);
  if (snapshot.selection.type === "cue") content = /* @__PURE__ */ jsxDEV(CueInspector, { store, snapshot, section, clipboard, setClipboard }, void 0, false, {
    fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
    lineNumber: 1786,
    columnNumber: 52
  }, this);
  if (snapshot.selection.type === "discipline-reveal") content = /* @__PURE__ */ jsxDEV(DisciplineRevealInspector, { store, snapshot, section }, void 0, false, {
    fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
    lineNumber: 1787,
    columnNumber: 66
  }, this);
  if (snapshot.selection.type === "camera-key") content = /* @__PURE__ */ jsxDEV(CameraInspector, { store, snapshot, section }, void 0, false, {
    fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
    lineNumber: 1788,
    columnNumber: 59
  }, this);
  if (snapshot.selection.type === "world") content = /* @__PURE__ */ jsxDEV(WorldInspector, { store, snapshot, section, runtimeMetrics }, void 0, false, {
    fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
    lineNumber: 1789,
    columnNumber: 54
  }, this);
  if (snapshot.selection.type === "interaction") content = /* @__PURE__ */ jsxDEV(SectionInspector, { store, snapshot, section }, void 0, false, {
    fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
    lineNumber: 1790,
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
          lineNumber: 1890,
          columnNumber: 63
        }, this),
        /* @__PURE__ */ jsxDEV(Diagnostics, { diagnostics: snapshot.diagnostics }, void 0, false, {
          fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
          lineNumber: 1890,
          columnNumber: 117
        }, this)
      ] }, void 0, true, {
        fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
        lineNumber: 1890,
        columnNumber: 7
      }, this)
    },
    void 0,
    false,
    {
      fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
      lineNumber: 1873,
      columnNumber: 5
    },
    this
  );
}
_s4(Inspector, "+h4TZ3OOjdefApVkJJ1n/C7j/fg=");
_c13 = Inspector;
function CameraPathOverlay({ snapshot }) {
  const sections = snapshot.compiledPlan?.sections || [];
  const total = snapshot.compiledPlan?.maxStoryWU || 1;
  return /* @__PURE__ */ jsxDEV("div", { className: "about-editor-path-overlay", "aria-label": "Camera path overlay", children: [
    /* @__PURE__ */ jsxDEV("div", { children: [
      /* @__PURE__ */ jsxDEV("strong", { children: "Path · constant cadence" }, void 0, false, {
        fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
        lineNumber: 1899,
        columnNumber: 12
      }, this),
      /* @__PURE__ */ jsxDEV("span", { children: [
        formatWU(snapshot.transport.storyWU),
        " / ",
        formatWU(total)
      ] }, void 0, true, {
        fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
        lineNumber: 1899,
        columnNumber: 52
      }, this)
    ] }, void 0, true, {
      fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
      lineNumber: 1899,
      columnNumber: 7
    }, this),
    /* @__PURE__ */ jsxDEV("svg", { viewBox: "0 0 240 112", role: "img", "aria-label": "Camera and World anchors over story distance", children: [
      /* @__PURE__ */ jsxDEV("path", { d: "M18 56 H222" }, void 0, false, {
        fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
        lineNumber: 1901,
        columnNumber: 9
      }, this),
      sections.map((section) => {
        const x = 18 + section.startWU / total * 204;
        return /* @__PURE__ */ jsxDEV("g", { transform: `translate(${x} 56)`, children: [
          /* @__PURE__ */ jsxDEV("line", { y1: "-12", y2: "12" }, void 0, false, {
            fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
            lineNumber: 1904,
            columnNumber: 71
          }, this),
          /* @__PURE__ */ jsxDEV("circle", { r: section.worldState?.changesWorld ? 4 : 2 }, void 0, false, {
            fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
            lineNumber: 1904,
            columnNumber: 96
          }, this),
          /* @__PURE__ */ jsxDEV("title", { children: [
            section.label,
            section.worldState?.changesWorld ? ` · ${section.worldState.activeWorld.shapeId}` : ""
          ] }, void 0, true, {
            fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
            lineNumber: 1904,
            columnNumber: 151
          }, this)
        ] }, section.id, true, {
          fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
          lineNumber: 1904,
          columnNumber: 18
        }, this);
      }),
      /* @__PURE__ */ jsxDEV("g", { className: "is-playhead", transform: `translate(${18 + snapshot.transport.storyWU / total * 204} 56)`, children: [
        /* @__PURE__ */ jsxDEV("path", { d: "M0 -22 L5 -15 H-5 Z" }, void 0, false, {
          fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
          lineNumber: 1906,
          columnNumber: 113
        }, this),
        /* @__PURE__ */ jsxDEV("line", { y1: "-15", y2: "22" }, void 0, false, {
          fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
          lineNumber: 1906,
          columnNumber: 145
        }, this)
      ] }, void 0, true, {
        fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
        lineNumber: 1906,
        columnNumber: 9
      }, this)
    ] }, void 0, true, {
      fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
      lineNumber: 1900,
      columnNumber: 7
    }, this),
    /* @__PURE__ */ jsxDEV("small", { children: "Dots are Section boundaries. Large dots are fixed World anchors. The marker is the published camera." }, void 0, false, {
      fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
      lineNumber: 1908,
      columnNumber: 7
    }, this)
  ] }, void 0, true, {
    fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
    lineNumber: 1898,
    columnNumber: 5
  }, this);
}
_c14 = CameraPathOverlay;
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
                lineNumber: 2136,
                columnNumber: 119
              }, this),
              /* @__PURE__ */ jsxDEV("span", { children: "About Narrative" }, void 0, false, {
                fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
                lineNumber: 2136,
                columnNumber: 149
              }, this),
              /* @__PURE__ */ jsxDEV("small", { children: "Creative toolkit" }, void 0, false, {
                fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
                lineNumber: 2136,
                columnNumber: 177
              }, this)
            ] }, void 0, true, {
              fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
              lineNumber: 2136,
              columnNumber: 9
            }, this),
            /* @__PURE__ */ jsxDEV(Transport, { store, snapshot }, void 0, false, {
              fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
              lineNumber: 2137,
              columnNumber: 9
            }, this),
            /* @__PURE__ */ jsxDEV("div", { className: "about-editor-actions", children: [
              /* @__PURE__ */ jsxDEV("button", { type: "button", disabled: !snapshot.history.canUndo, title: snapshot.history.undoLabel || "Undo", "aria-label": "Undo", onClick: () => store.undo(), children: /* @__PURE__ */ jsxDEV("span", { "aria-hidden": "true", children: "↶" }, void 0, false, {
                fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
                lineNumber: 2139,
                columnNumber: 162
              }, this) }, void 0, false, {
                fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
                lineNumber: 2139,
                columnNumber: 11
              }, this),
              /* @__PURE__ */ jsxDEV("button", { type: "button", disabled: !snapshot.history.canRedo, title: snapshot.history.redoLabel || "Redo", "aria-label": "Redo", onClick: () => store.redo(), children: /* @__PURE__ */ jsxDEV("span", { "aria-hidden": "true", children: "↷" }, void 0, false, {
                fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
                lineNumber: 2140,
                columnNumber: 162
              }, this) }, void 0, false, {
                fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
                lineNumber: 2140,
                columnNumber: 11
              }, this),
              /* @__PURE__ */ jsxDEV("button", { type: "button", className: pathVisible ? "is-active" : "", onClick: () => setPathVisible(!pathVisible), children: "Path" }, void 0, false, {
                fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
                lineNumber: 2141,
                columnNumber: 11
              }, this),
              /* @__PURE__ */ jsxDEV("button", { type: "button", className: directorView ? "is-active" : "", onClick: toggleDirector, children: directorView ? "Director" : "Camera" }, void 0, false, {
                fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
                lineNumber: 2142,
                columnNumber: 11
              }, this),
              /* @__PURE__ */ jsxDEV("button", { type: "button", className: snapshot.tryState?.label === "Compare saved source" ? "is-active" : "", disabled: snapshot.tryState && snapshot.tryState.label !== "Compare saved source", onClick: toggleBefore, children: snapshot.tryState?.label === "Compare saved source" ? "Before" : "After" }, void 0, false, {
                fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
                lineNumber: 2143,
                columnNumber: 11
              }, this),
              /* @__PURE__ */ jsxDEV("details", { className: "about-editor-more", children: [
                /* @__PURE__ */ jsxDEV("summary", { children: "More" }, void 0, false, {
                  fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
                  lineNumber: 2145,
                  columnNumber: 13
                }, this),
                /* @__PURE__ */ jsxDEV("div", { children: [
                  /* @__PURE__ */ jsxDEV("button", { type: "button", onClick: addCheckpoint, children: "Checkpoint" }, void 0, false, {
                    fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
                    lineNumber: 2147,
                    columnNumber: 15
                  }, this),
                  /* @__PURE__ */ jsxDEV("button", { type: "button", onClick: () => exportAboutNarrativeDocument(snapshot.document), children: "Export JSON" }, void 0, false, {
                    fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
                    lineNumber: 2148,
                    columnNumber: 15
                  }, this),
                  /* @__PURE__ */ jsxDEV("button", { type: "button", onClick: () => importRef.current?.click(), children: "Import JSON" }, void 0, false, {
                    fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
                    lineNumber: 2149,
                    columnNumber: 15
                  }, this)
                ] }, void 0, true, {
                  fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
                  lineNumber: 2146,
                  columnNumber: 13
                }, this)
              ] }, void 0, true, {
                fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
                lineNumber: 2144,
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
                lineNumber: 2152,
                columnNumber: 11
              }, this),
              /* @__PURE__ */ jsxDEV("button", { type: "button", "data-about-editor-save": true, className: "is-save", disabled: snapshot.saveState.status === "saving", onClick: save, children: [
                /* @__PURE__ */ jsxDEV("span", { children: statusLabel }, void 0, false, {
                  fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
                  lineNumber: 2162,
                  columnNumber: 141
                }, this),
                /* @__PURE__ */ jsxDEV("kbd", { children: "⌘S" }, void 0, false, {
                  fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
                  lineNumber: 2162,
                  columnNumber: 167
                }, this)
              ] }, void 0, true, {
                fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
                lineNumber: 2162,
                columnNumber: 11
              }, this)
            ] }, void 0, true, {
              fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
              lineNumber: 2138,
              columnNumber: 9
            }, this)
          ] }, void 0, true, {
            fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
            lineNumber: 2135,
            columnNumber: 7
          }, this),
          snapshot.recoveryState.available ? /* @__PURE__ */ jsxDEV("div", { className: "about-editor-recovery", children: [
            /* @__PURE__ */ jsxDEV("span", { children: [
              "An unsaved draft from ",
              new Date(snapshot.recoveryState.draft.timestamp).toLocaleString(),
              " is available."
            ] }, void 0, true, {
              fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
              lineNumber: 2166,
              columnNumber: 82
            }, this),
            /* @__PURE__ */ jsxDEV("button", { type: "button", onClick: () => {
              store.replaceDocument("Recover draft", snapshot.recoveryState.draft.document);
              store.setRecoveryState({ available: false });
            }, children: "Recover as unsaved copy" }, void 0, false, {
              fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
              lineNumber: 2166,
              columnNumber: 198
            }, this),
            /* @__PURE__ */ jsxDEV("button", { type: "button", onClick: () => {
              exportAboutNarrativeDocument(snapshot.recoveryState.draft.document, "contents-about-recovered.json");
            }, children: "Export" }, void 0, false, {
              fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
              lineNumber: 2166,
              columnNumber: 394
            }, this),
            /* @__PURE__ */ jsxDEV("button", { type: "button", onClick: () => {
              clearAboutNarrativeRecoveryDraft();
              store.setRecoveryState({ available: false });
            }, children: "Discard" }, void 0, false, {
              fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
              lineNumber: 2166,
              columnNumber: 551
            }, this)
          ] }, void 0, true, {
            fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
            lineNumber: 2166,
            columnNumber: 43
          }, this) : null,
          snapshot.saveState.message ? /* @__PURE__ */ jsxDEV("div", { className: `about-editor-save-message is-${snapshot.saveState.status}`, children: [
            snapshot.saveState.message,
            /* @__PURE__ */ jsxDEV("button", { type: "button", "aria-label": "Dismiss message", onClick: () => store.setSaveState({ message: "" }), children: "×" }, void 0, false, {
              fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
              lineNumber: 2167,
              columnNumber: 142
            }, this)
          ] }, void 0, true, {
            fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
            lineNumber: 2167,
            columnNumber: 37
          }, this) : null,
          pathVisible ? /* @__PURE__ */ jsxDEV(CameraPathOverlay, { snapshot }, void 0, false, {
            fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
            lineNumber: 2169,
            columnNumber: 22
          }, this) : null,
          directorView ? /* @__PURE__ */ jsxDEV("div", { className: "about-editor-director-controls", children: [
            /* @__PURE__ */ jsxDEV("strong", { children: "Director View" }, void 0, false, {
              fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
              lineNumber: 2170,
              columnNumber: 71
            }, this),
            /* @__PURE__ */ jsxDEV("button", { type: "button", onClick: () => runtimeRef.current?.nudgeDirector?.({ yaw: -0.08 }), children: "←" }, void 0, false, {
              fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
              lineNumber: 2170,
              columnNumber: 101
            }, this),
            /* @__PURE__ */ jsxDEV("button", { type: "button", onClick: () => runtimeRef.current?.nudgeDirector?.({ pitch: 0.08 }), children: "↑" }, void 0, false, {
              fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
              lineNumber: 2170,
              columnNumber: 201
            }, this),
            /* @__PURE__ */ jsxDEV("button", { type: "button", onClick: () => runtimeRef.current?.nudgeDirector?.({ pitch: -0.08 }), children: "↓" }, void 0, false, {
              fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
              lineNumber: 2170,
              columnNumber: 302
            }, this),
            /* @__PURE__ */ jsxDEV("button", { type: "button", onClick: () => runtimeRef.current?.nudgeDirector?.({ yaw: 0.08 }), children: "→" }, void 0, false, {
              fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
              lineNumber: 2170,
              columnNumber: 404
            }, this),
            /* @__PURE__ */ jsxDEV("button", { type: "button", onClick: () => runtimeRef.current?.nudgeDirector?.({ distance: -0.2 }), children: "＋" }, void 0, false, {
              fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
              lineNumber: 2170,
              columnNumber: 503
            }, this),
            /* @__PURE__ */ jsxDEV("button", { type: "button", onClick: () => runtimeRef.current?.nudgeDirector?.({ distance: 0.2 }), children: "−" }, void 0, false, {
              fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
              lineNumber: 2170,
              columnNumber: 607
            }, this),
            /* @__PURE__ */ jsxDEV("button", { type: "button", onClick: () => runtimeRef.current?.resetDirector?.(), children: "Reset" }, void 0, false, {
              fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
              lineNumber: 2170,
              columnNumber: 710
            }, this),
            /* @__PURE__ */ jsxDEV("small", { children: "Temporary inspection only. Published Camera keys are unchanged." }, void 0, false, {
              fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
              lineNumber: 2170,
              columnNumber: 800
            }, this)
          ] }, void 0, true, {
            fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
            lineNumber: 2170,
            columnNumber: 23
          }, this) : null,
          /* @__PURE__ */ jsxDEV(Inspector, { store, snapshot, timelineOpen, runtimeMetrics, clipboard, setClipboard }, void 0, false, {
            fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
            lineNumber: 2172,
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
                  lineNumber: 2180,
                  columnNumber: 25
                }, this) : /* @__PURE__ */ jsxDEV(ChevronUp, { "aria-hidden": "true" }, void 0, false, {
                  fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
                  lineNumber: 2180,
                  columnNumber: 62
                }, this),
                /* @__PURE__ */ jsxDEV("span", { children: timelineOpen ? "Hide timeline" : "Show timeline" }, void 0, false, {
                  fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
                  lineNumber: 2180,
                  columnNumber: 95
                }, this)
              ]
            },
            void 0,
            true,
            {
              fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
              lineNumber: 2173,
              columnNumber: 7
            },
            this
          ),
          /* @__PURE__ */ jsxDEV("div", { id: "about-editor-timeline-panel", className: "about-editor-bottom", "aria-hidden": !timelineOpen, children: [
            /* @__PURE__ */ jsxDEV("div", { className: "about-editor-contextbar", children: [
              /* @__PURE__ */ jsxDEV("span", { children: [
                /* @__PURE__ */ jsxDEV("strong", { children: selected?.label || "Sequence" }, void 0, false, {
                  fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
                  lineNumber: 2183,
                  columnNumber: 17
                }, this),
                " ",
                selected ? `${selected.type} · ${formatWU(Math.max(0, selectedExtent - 1))} scroll · ${formatWU(selectedExtent)} total${resolvedExtent > selectedExtent + 1e-3 ? ` · ${formatWU(resolvedExtent)} resolved` : ""}` : ""
              ] }, void 0, true, {
                fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
                lineNumber: 2183,
                columnNumber: 11
              }, this),
              selectedCueCount > 1 ? /* @__PURE__ */ jsxDEV("span", { className: "about-editor-selection-count", children: [
                selectedCueCount,
                " titles selected"
              ] }, void 0, true, {
                fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
                lineNumber: 2184,
                columnNumber: 35
              }, this) : null,
              /* @__PURE__ */ jsxDEV("span", { children: snapshot.autoKey ? "Auto-key armed" : "Auto-key off" }, void 0, false, {
                fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
                lineNumber: 2185,
                columnNumber: 11
              }, this),
              /* @__PURE__ */ jsxDEV("button", { type: "button", className: snapshot.autoKey ? "is-active" : "", onClick: () => store.setAutoKey(!snapshot.autoKey), children: "◆ Auto-key" }, void 0, false, {
                fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
                lineNumber: 2186,
                columnNumber: 11
              }, this),
              /* @__PURE__ */ jsxDEV("button", { type: "button", className: loopActive ? "is-active" : "", onClick: toggleLoop, children: loopActive ? "Stop audition" : "Loop Section" }, void 0, false, {
                fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
                lineNumber: 2187,
                columnNumber: 11
              }, this),
              /* @__PURE__ */ jsxDEV("button", { type: "button", onClick: fitSequence, children: "Fit sequence" }, void 0, false, {
                fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
                lineNumber: 2188,
                columnNumber: 11
              }, this),
              /* @__PURE__ */ jsxDEV("button", { type: "button", disabled: !compiledSelected, onClick: fitSection, children: "Fit Section" }, void 0, false, {
                fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
                lineNumber: 2189,
                columnNumber: 11
              }, this),
              ["camera", "world", "text"].map((track) => /* @__PURE__ */ jsxDEV("button", { type: "button", className: snapshot.transport.soloTrack === track ? "is-active" : "", onClick: () => toggleSolo(track), children: [
                "Solo ",
                track
              ] }, track, true, {
                fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
                lineNumber: 2190,
                columnNumber: 55
              }, this)),
              timelineDeletion ? /* @__PURE__ */ jsxDEV("button", { type: "button", className: "about-editor-delete-key", disabled: timelineDeletion.disabled, title: timelineDeletion.message || `${timelineDeletion.label} · Delete/Backspace`, onClick: () => deleteTimelineSelection(store, snapshot), children: [
                /* @__PURE__ */ jsxDEV(Trash2, { "aria-hidden": "true" }, void 0, false, {
                  fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
                  lineNumber: 2191,
                  columnNumber: 266
                }, this),
                timelineDeletion.label
              ] }, void 0, true, {
                fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
                lineNumber: 2191,
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
                lineNumber: 2192,
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
                  lineNumber: 2193,
                  columnNumber: 369
                }, this),
                checkpoints.map((item) => /* @__PURE__ */ jsxDEV("option", { value: item.id, children: item.name }, item.id, false, {
                  fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
                  lineNumber: 2193,
                  columnNumber: 456
                }, this))
              ] }, void 0, true, {
                fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
                lineNumber: 2193,
                columnNumber: 33
              }, this) : null
            ] }, void 0, true, {
              fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
              lineNumber: 2182,
              columnNumber: 9
            }, this),
            /* @__PURE__ */ jsxDEV(Timeline, { store, snapshot }, void 0, false, {
              fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
              lineNumber: 2195,
              columnNumber: 9
            }, this)
          ] }, void 0, true, {
            fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
            lineNumber: 2181,
            columnNumber: 7
          }, this),
          /* @__PURE__ */ jsxDEV("nav", { className: "about-editor-mobile-tabs", "aria-label": "Editor panel", children: [
            /* @__PURE__ */ jsxDEV("button", { type: "button", className: mobilePane === "sequence" ? "is-active" : "", onClick: () => setMobilePane("sequence"), children: "Sequence" }, void 0, false, {
              fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
              lineNumber: 2197,
              columnNumber: 75
            }, this),
            /* @__PURE__ */ jsxDEV("button", { type: "button", className: mobilePane === "inspect" ? "is-active" : "", onClick: () => setMobilePane("inspect"), children: "Inspect" }, void 0, false, {
              fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
              lineNumber: 2197,
              columnNumber: 213
            }, this),
            /* @__PURE__ */ jsxDEV("button", { type: "button", className: mobilePane === "preview" ? "is-active" : "", onClick: () => setMobilePane("preview"), children: "Preview" }, void 0, false, {
              fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
              lineNumber: 2197,
              columnNumber: 348
            }, this)
          ] }, void 0, true, {
            fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
            lineNumber: 2197,
            columnNumber: 7
          }, this)
        ]
      },
      void 0,
      true,
      {
        fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
        lineNumber: 2128,
        columnNumber: 5
      },
      this
    ),
    document.body
  );
}
_s5(AboutNarrativeEditor, "bLb3NYqc3ahSTBTmrBEIMEiNsDo=");
_c15 = AboutNarrativeEditor;
var _c, _c2, _c3, _c4, _c5, _c6, _c7, _c8, _c9, _c0, _c1, _c10, _c11, _c12, _c13, _c14, _c15;
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
$RefreshReg$(_c12, "AuditionControls");
$RefreshReg$(_c13, "Inspector");
$RefreshReg$(_c14, "CameraPathOverlay");
$RefreshReg$(_c15, "AboutNarrativeEditor");
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

//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJtYXBwaW5ncyI6IkFBOFVNLFNBd3ZCRixVQXh2QkU7O0FBOVVOLFNBQVNBLFdBQVdDLFFBQVFDLFVBQVVDLDRCQUE0QjtBQUNsRSxTQUFTQyxvQkFBb0I7QUFDN0I7QUFBQSxFQUNFQztBQUFBQSxFQUNBQztBQUFBQSxFQUNBQztBQUFBQSxFQUNBQztBQUFBQSxFQUNBQztBQUFBQSxFQUNBQztBQUFBQSxFQUNBQztBQUFBQSxFQUNBQztBQUFBQSxFQUNBQztBQUFBQSxFQUNBQztBQUFBQSxFQUNBQztBQUFBQSxFQUNBQztBQUFBQSxFQUNBQztBQUFBQSxFQUNBQztBQUFBQSxPQUNLO0FBQ1A7QUFBQSxFQUNFQztBQUFBQSxFQUNBQztBQUFBQSxFQUNBQztBQUFBQSxFQUNBQztBQUFBQSxFQUNBQztBQUFBQSxFQUNBQztBQUFBQSxPQUNLO0FBQ1A7QUFBQSxFQUNFQztBQUFBQSxFQUNBQztBQUFBQSxFQUNBQztBQUFBQSxFQUNBQztBQUFBQSxFQUNBQztBQUFBQSxFQUNBQztBQUFBQSxFQUNBQztBQUFBQSxFQUNBQztBQUFBQSxPQUNLO0FBQ1A7QUFBQSxFQUNFQztBQUFBQSxFQUNBQztBQUFBQSxPQUNLO0FBQ1A7QUFBQSxFQUNFQztBQUFBQSxFQUNBQztBQUFBQSxFQUNBQztBQUFBQSxFQUNBQztBQUFBQSxPQUNLO0FBQ1A7QUFBQSxFQUNFQztBQUFBQSxFQUNBQztBQUFBQSxFQUNBQztBQUFBQSxFQUNBQztBQUFBQSxFQUNBQztBQUFBQSxFQUNBQztBQUFBQSxFQUNBQztBQUFBQSxFQUNBQztBQUFBQSxFQUNBQztBQUFBQSxFQUNBQztBQUFBQSxFQUNBQztBQUFBQSxFQUNBQztBQUFBQSxFQUNBQztBQUFBQSxFQUNBQztBQUFBQSxFQUNBQztBQUFBQSxFQUNBQztBQUFBQSxFQUNBQztBQUFBQSxFQUNBQztBQUFBQSxFQUNBQztBQUFBQSxFQUNBQztBQUFBQSxFQUNBQztBQUFBQSxPQUNLO0FBQ1AsT0FBTztBQUVQLE1BQU1DLFVBQVVBLENBQUNDLFVBQVVDLEtBQUtDLElBQUksR0FBR0QsS0FBS0UsSUFBSSxHQUFHSCxLQUFLLENBQUM7QUFDekQsTUFBTUksb0NBQW9DO0FBQzFDLE1BQU1DLHVCQUF1QjtBQUM3QixNQUFNQyxxQkFBcUI7QUFDM0IsTUFBTUMscUJBQXFCLG9CQUFJQyxJQUFJLENBQUMsVUFBVSxnQkFBZ0IsT0FBTyxNQUFNLENBQUM7QUFDNUUsTUFBTUMsd0JBQXdCakQsMkNBQzNCa0QsS0FBSyxDQUFDQyxZQUFZQSxRQUFRQyxPQUFPLEtBQUssR0FBR1QsT0FBTztBQUNuRCxNQUFNVSxpQ0FBaUNDLE9BQU9DLE9BQU87QUFBQSxFQUNuRCxHQUFHO0FBQUEsRUFDSCxHQUFHO0FBQUEsRUFDSCxHQUFHO0FBQUEsRUFDSCxHQUFHO0FBQUEsRUFDSCxHQUFHO0FBQUEsRUFDSCxHQUFHO0FBQ0wsQ0FBQztBQUVELFNBQVNDLGtCQUFrQkMsTUFBTUMsSUFBSTtBQUNuQyxNQUFJLENBQUNELFFBQVEsQ0FBQ0MsR0FBSSxRQUFPO0FBQ3pCLFNBQU8sQ0FBQyxVQUFVLGNBQWMsRUFBRUM7QUFBQUEsSUFBSyxDQUFDQyxVQUN0Q0gsS0FBS0csS0FBSyxFQUFFRCxLQUFLLENBQUNuQixPQUFPcUIsVUFBVXBCLEtBQUtxQixJQUFJdEIsUUFBUWtCLEdBQUdFLEtBQUssRUFBRUMsS0FBSyxDQUFDLElBQUksSUFBTTtBQUFBLEVBQy9FLEtBQUtwQixLQUFLcUIsSUFBSUwsS0FBS00sTUFBTUwsR0FBR0ssR0FBRyxJQUFJLFFBQVV0QixLQUFLcUIsSUFBSUwsS0FBS08sT0FBT04sR0FBR00sSUFBSSxJQUFJO0FBQ2hGO0FBRUEsU0FBU0MsZUFBZUMsUUFBUUMsUUFBUTtBQUN0Q0QsU0FBT0UsU0FBUyxDQUFDLEdBQUdELE9BQU9DLE1BQU07QUFDakNGLFNBQU9HLGVBQWUsQ0FBQyxHQUFHRixPQUFPRSxZQUFZO0FBQzdDSCxTQUFPSCxNQUFNSSxPQUFPSjtBQUNwQkcsU0FBT0YsT0FBT0csT0FBT0g7QUFDdkI7QUFFQSxTQUFTTSxtQkFBbUJDLFdBQVVDLGNBQWNDLFVBQVU7QUFDNUQsUUFBTUMsVUFBVUgsVUFBU0ksU0FBU0gsWUFBWTtBQUM5QyxRQUFNSSxNQUFNRixTQUFTRyxPQUFPQyxLQUFLTCxRQUFRO0FBQ3pDLE1BQUksQ0FBQ0csSUFBSztBQUNWLE1BQUlILGFBQWEsS0FBS0QsZUFBZSxHQUFHO0FBQ3RDUCxtQkFBZU0sVUFBU0ksU0FBU0gsZUFBZSxDQUFDLEVBQUVLLE9BQU9DLEtBQUtDLEdBQUcsRUFBRSxHQUFHSCxHQUFHO0FBQUEsRUFDNUU7QUFDQSxNQUFJSCxhQUFhQyxRQUFRRyxPQUFPQyxLQUFLRSxTQUFTLEtBQUtSLGVBQWVELFVBQVNJLFNBQVNLLFNBQVMsR0FBRztBQUM5RmYsbUJBQWVNLFVBQVNJLFNBQVNILGVBQWUsQ0FBQyxFQUFFSyxPQUFPQyxLQUFLLENBQUMsR0FBR0YsR0FBRztBQUFBLEVBQ3hFO0FBQ0Y7QUFFQSxTQUFTSyxvQkFBb0JWLFdBQVVDLGNBQWM7QUFDbkQsUUFBTUUsVUFBVUgsVUFBU0ksU0FBU0gsWUFBWTtBQUM5QyxNQUFJLENBQUNFLFNBQVNHLE9BQU9DLEtBQUtFLE9BQVE7QUFDbEMsTUFBSVIsZUFBZSxFQUFHUCxnQkFBZVMsUUFBUUcsT0FBT0MsS0FBSyxDQUFDLEdBQUdQLFVBQVNJLFNBQVNILGVBQWUsQ0FBQyxFQUFFSyxPQUFPQyxLQUFLQyxHQUFHLEVBQUUsQ0FBQztBQUNuSCxNQUFJUCxlQUFlRCxVQUFTSSxTQUFTSyxTQUFTLEVBQUdmLGdCQUFlUyxRQUFRRyxPQUFPQyxLQUFLQyxHQUFHLEVBQUUsR0FBR1IsVUFBU0ksU0FBU0gsZUFBZSxDQUFDLEVBQUVLLE9BQU9DLEtBQUssQ0FBQyxDQUFDO0FBQ2hKO0FBRUEsU0FBU0ksMkJBQTJCQyxXQUFXQyxjQUFjO0FBQzNELFFBQU1DLFNBQVNGLFVBQVVHLFFBQVEsZUFBZTtBQUNoRCxRQUFNQyxTQUFTRixTQUFTRyxpQkFBaUJILE1BQU0sSUFBSTtBQUNuRCxRQUFNSSxlQUFlQyxPQUFPQyxXQUFXSixRQUFRSyxpQkFBaUIsdUJBQXVCLENBQUMsS0FBSztBQUM3RixRQUFNQyxpQkFBaUJULGVBQ25CTSxPQUFPQyxXQUFXSixRQUFRSyxpQkFBaUIseUJBQXlCLENBQUMsS0FBSyxNQUMxRTtBQUNKLFFBQU1FLGVBQWV2QixTQUFTd0IsY0FBYyxtQkFBbUIsR0FBR0Msc0JBQXNCLEVBQUVDLE9BQ3JGQyxPQUFPQztBQUNaLFNBQU87QUFBQSxJQUNMQyxRQUFRWCxlQUFlM0M7QUFBQUEsSUFDdkJ1RCxZQUFZakIsZUFBZWMsT0FBT0MsY0FBY04saUJBQWlCQyxnQkFBZ0JoRDtBQUFBQSxFQUNuRjtBQUNGO0FBRUEsU0FBU3dELHVCQUF1Qm5CLFdBQVdvQixVQUFVbkIsY0FBYztBQUNqRSxRQUFNLEVBQUVnQixRQUFRQyxVQUFVLElBQUluQiwyQkFBMkJDLFdBQVdDLFlBQVk7QUFDaEYsUUFBTW9CLFdBQVcvRCxLQUFLRSxJQUFJLEtBQUt1RCxPQUFPTyxhQUFjM0QscUJBQXFCLENBQUU7QUFDM0UsUUFBTTRELFFBQVFqRSxLQUFLQyxJQUFJNkQsU0FBU0csT0FBT0YsUUFBUTtBQUMvQyxRQUFNRyxrQkFBa0JsRSxLQUFLRSxJQUFJLEtBQUswRCxZQUFZRCxNQUFNO0FBQ3hELFFBQU1RLFNBQVNuRSxLQUFLQyxJQUFJNkQsU0FBU0ssUUFBUUQsZUFBZTtBQUN4RCxRQUFNRSxVQUFVcEUsS0FBS0UsSUFBSUcsb0JBQW9Cb0QsT0FBT08sYUFBYUMsUUFBUTVELGtCQUFrQjtBQUMzRixRQUFNZ0UsU0FBU3JFLEtBQUtFLElBQUl5RCxRQUFRQyxZQUFZTyxNQUFNO0FBQ2xELFNBQU87QUFBQSxJQUNMRyxNQUFNdEUsS0FBS0MsSUFBSW1FLFNBQVNwRSxLQUFLRSxJQUFJRyxvQkFBb0J5RCxTQUFTUSxJQUFJLENBQUM7QUFBQSxJQUNuRWQsS0FBS3hELEtBQUtDLElBQUlvRSxRQUFRckUsS0FBS0UsSUFBSXlELFFBQVFHLFNBQVNOLEdBQUcsQ0FBQztBQUFBLElBQ3BEUztBQUFBQSxJQUNBRTtBQUFBQSxFQUNGO0FBQ0Y7QUFFQSxTQUFTSSxnQkFBZ0J6QyxXQUFVMEMsV0FBVztBQUM1QyxTQUFPMUMsVUFBU0ksU0FBU3VDLFVBQVUsQ0FBQ3hDLFlBQVlBLFFBQVF0QixPQUFPNkQsU0FBUztBQUMxRTtBQUVBLFNBQVNFLFdBQVc1QyxXQUFVNkMsV0FBVztBQUN2QyxRQUFNSCxZQUFZRyxVQUFVSCxhQUFhMUMsVUFBU0ksU0FBUyxDQUFDLEdBQUd2QjtBQUMvRCxTQUFPbUIsVUFBU0ksU0FBU3pCLEtBQUssQ0FBQ3dCLFlBQVlBLFFBQVF0QixPQUFPNkQsU0FBUyxLQUFLMUMsVUFBU0ksU0FBUyxDQUFDO0FBQzdGO0FBRUEsU0FBUzBDLGlCQUFpQkMsTUFBTTVDLFNBQVM2QyxTQUFTO0FBQ2hELFFBQU1DLFdBQVdGLE1BQU0zQyxVQUFVekIsS0FBSyxDQUFDdUUsU0FBU0EsS0FBS3JFLE9BQU9zQixRQUFRdEIsRUFBRTtBQUN0RSxTQUFPb0UsV0FBV2pGLFNBQVNnRixVQUFVQyxTQUFTRSxXQUFXRixTQUFTRyxRQUFRLElBQUk7QUFDaEY7QUFFQSxTQUFTQyxTQUFTcEYsT0FBTztBQUN2QixTQUFPLEdBQUdrRCxPQUFPbEQsU0FBUyxDQUFDLEVBQUVxRixRQUFRLENBQUMsQ0FBQztBQUN6QztBQUVBLFNBQVNDLG9CQUFvQnRGLE9BQU87QUFDbEMsU0FBTyxHQUFHa0QsUUFBUUEsT0FBT2xELEtBQUssSUFBSSxLQUFLcUYsUUFBUSxDQUFDLENBQUMsQ0FBQztBQUNwRDtBQUVBLFNBQVNFLG9CQUFvQjdELFFBQVE7QUFDbkMsU0FBT0Esa0JBQWtCOEQsZ0JBQ25COUQsT0FBTytELFFBQVEseUJBQXlCLEtBQUsvRCxPQUFPZ0U7QUFDNUQ7QUFFQSxTQUFTQyxxQkFBcUJDLFVBQVU7QUFDdEMsUUFBTWQsT0FBT2MsU0FBU0M7QUFDdEIsTUFBSSxDQUFDZixNQUFNM0MsVUFBVUssT0FBUSxRQUFPO0FBQ3BDLFFBQU1zRCxTQUFTO0FBQ2ZoQixPQUFLM0MsU0FBUzRELFFBQVEsQ0FBQ2YsVUFBVWhELGlCQUFpQjtBQUNoRCxVQUFNRSxVQUFVMEQsU0FBUzdELFNBQVNJLFNBQVNILFlBQVk7QUFDdkQsVUFBTWdFLFlBQVlBLENBQUN6RCxPQUFPeUMsU0FBU0UsVUFBV2hDLE9BQU9YLE1BQU0sQ0FBQyxJQUFJeUMsU0FBU0c7QUFDekVqRCxZQUFRRyxPQUFPQyxLQUFLeUQsUUFBUSxDQUFDM0QsS0FBS0gsYUFBYTtBQUM3QyxVQUFJRyxJQUFJRyxPQUFPLEtBQUtILElBQUlHLE9BQU8sRUFBRztBQUNsQ3VELGFBQU9HLEtBQUs7QUFBQSxRQUNWbEIsU0FBU2lCLFVBQVU1RCxJQUFJRyxFQUFFO0FBQUEsUUFDekIyRCxVQUFVO0FBQUEsUUFDVnRCLFdBQVcsRUFBRXVCLE1BQU0sY0FBYzFCLFdBQVd2QyxRQUFRdEIsSUFBSXFCLFNBQVM7QUFBQSxNQUNuRSxDQUFDO0FBQUEsSUFDSCxDQUFDO0FBQ0QsUUFBSUMsUUFBUWtFLE1BQU1DLFNBQVMsU0FBU25FLFFBQVFrRSxNQUFNRSxhQUFhSCxTQUFTLE9BQU87QUFDN0UsT0FBQyxTQUFTLEtBQUssRUFBRUosUUFBUSxDQUFDUSxNQUFNQyxjQUFjVixPQUFPRyxLQUFLO0FBQUEsUUFDeERsQixTQUFTaUIsVUFBVTlELFFBQVFrRSxNQUFNRSxhQUFhQyxJQUFJLENBQUM7QUFBQSxRQUNuREwsVUFBVSxLQUFLTTtBQUFBQSxRQUNmNUIsV0FBVyxFQUFFdUIsTUFBTSxTQUFTMUIsV0FBV3ZDLFFBQVF0QixJQUFJNkYsU0FBUyxjQUFjRixJQUFJLEdBQUc7QUFBQSxNQUNuRixDQUFDLENBQUM7QUFBQSxJQUNKO0FBQ0EsS0FBQ3JFLFFBQVF3RSxLQUFLQyxRQUFRLElBQUlaLFFBQVEsQ0FBQ2EsS0FBS0MsYUFBYTtBQUNuRGYsYUFBT0csS0FBSztBQUFBLFFBQ1ZsQixTQUFTaUIsVUFBVVksSUFBSUUsSUFBSTtBQUFBLFFBQzNCWixVQUFVLEtBQUtXO0FBQUFBLFFBQ2ZqQyxXQUFXLEVBQUV1QixNQUFNLE9BQU8xQixXQUFXdkMsUUFBUXRCLElBQUltRyxPQUFPSCxJQUFJaEcsSUFBSTZGLFNBQVMsUUFBUTtBQUFBLE1BQ25GLENBQUM7QUFBQSxJQUNILENBQUM7QUFDRCxRQUFJdkUsUUFBUXdFLEtBQUtNLGtCQUFrQjtBQUNqQ2xCLGFBQU9HLEtBQUs7QUFBQSxRQUNWbEIsU0FBU2lCLFVBQVU5RCxRQUFRd0UsS0FBS00saUJBQWlCQyxLQUFLO0FBQUEsUUFDdERmLFVBQVU7QUFBQSxRQUNWdEIsV0FBVyxFQUFFdUIsTUFBTSxxQkFBcUIxQixXQUFXdkMsUUFBUXRCLEdBQUc7QUFBQSxNQUNoRSxDQUFDO0FBQUEsSUFDSDtBQUNBLFFBQUlzQixRQUFRZ0YsYUFBYWYsU0FBUyxVQUFVakQsT0FBT2lFLFNBQVNqRixRQUFRZ0YsWUFBWUUsZUFBZSxHQUFHO0FBQ2hHdEIsYUFBT0csS0FBSztBQUFBLFFBQ1ZsQixTQUFTaUIsVUFBVTlELFFBQVFnRixZQUFZRSxlQUFlO0FBQUEsUUFDdERsQixVQUFVO0FBQUEsUUFDVnRCLFdBQVcsRUFBRXVCLE1BQU0sZUFBZTFCLFdBQVd2QyxRQUFRdEIsSUFBSTZGLFNBQVMsYUFBYTtBQUFBLE1BQ2pGLENBQUM7QUFBQSxJQUNIO0FBQUEsRUFDRixDQUFDO0FBQ0QsU0FBT1gsT0FBT3VCLEtBQUssQ0FBQ0MsR0FBR0MsTUFBT0QsRUFBRXZDLFVBQVV3QyxFQUFFeEMsV0FBYXVDLEVBQUVwQixXQUFXcUIsRUFBRXJCLFFBQVM7QUFDbkY7QUFFQSxTQUFTc0Isb0JBQW9CNUIsVUFBVTtBQUNyQyxRQUFNLEVBQUVoQixXQUFXN0Msb0JBQVMsSUFBSTZEO0FBQ2hDLFFBQU01RCxlQUFld0MsZ0JBQWdCekMsV0FBVTZDLFVBQVVILFNBQVM7QUFDbEUsUUFBTXZDLFVBQVVILFVBQVNJLFNBQVNILFlBQVk7QUFDOUMsTUFBSSxDQUFDRSxRQUFTLFFBQU87QUFDckIsTUFBSTBDLFVBQVV1QixTQUFTLGNBQWM7QUFDbkMsVUFBTS9ELE1BQU1GLFFBQVFHLE9BQU9DLEtBQUtzQyxVQUFVM0MsUUFBUTtBQUNsRCxRQUFJLENBQUNHLElBQUssUUFBTztBQUNqQixVQUFNcUYsV0FBV3JGLElBQUlHLE9BQU8sS0FBS0gsSUFBSUcsT0FBTztBQUM1QyxXQUFPO0FBQUEsTUFDTG1GLE9BQU9ELFdBQVcsd0JBQXdCO0FBQUEsTUFDMUNFLFVBQVVGO0FBQUFBLE1BQ1ZHLFNBQVNILFdBQVcscUZBQXFGO0FBQUEsTUFDekdJLFNBQVNBLENBQUNDLFVBQVVBLE1BQU1DLE9BQU8scUJBQXFCLENBQUNDLFVBQVU7QUFDL0RBLGNBQU03RixTQUFTSCxZQUFZLEVBQUVLLE9BQU9DLEtBQUsyRixPQUFPckQsVUFBVTNDLFVBQVUsQ0FBQztBQUFBLE1BQ3ZFLEdBQUcsRUFBRTJDLFdBQVcsRUFBRXVCLE1BQU0sV0FBVzFCLFdBQVd2QyxRQUFRdEIsR0FBRyxFQUFFLENBQUM7QUFBQSxJQUM5RDtBQUFBLEVBQ0Y7QUFDQSxNQUFJZ0UsVUFBVXVCLFNBQVMsV0FBV3ZCLFVBQVU2QixTQUFTeUIsV0FBVyxhQUFhLEdBQUc7QUFDOUUsV0FBTztBQUFBLE1BQ0xSLE9BQU87QUFBQSxNQUNQQyxVQUFVO0FBQUEsTUFDVkMsU0FBUztBQUFBLE1BQ1RDLFNBQVNBLENBQUNDLFVBQVVBLE1BQU1DLE9BQU8sMkJBQTJCLENBQUNDLFVBQVU7QUFDckUsY0FBTUcsYUFBYUgsTUFBTTdGLFNBQVNILFlBQVksRUFBRW9FLE1BQU1FO0FBQ3RENkIsbUJBQVdsQixRQUFRO0FBQ25Ca0IsbUJBQVdDLE1BQU07QUFDakJELG1CQUFXaEMsT0FBTztBQUFBLE1BQ3BCLEdBQUcsRUFBRXZCLFdBQVcsRUFBRXVCLE1BQU0sU0FBUzFCLFdBQVd2QyxRQUFRdEIsR0FBRyxFQUFFLENBQUM7QUFBQSxJQUM1RDtBQUFBLEVBQ0Y7QUFDQSxNQUFJZ0UsVUFBVXVCLFNBQVMsaUJBQWlCdkIsVUFBVTZCLFlBQVksY0FBYztBQUMxRSxXQUFPO0FBQUEsTUFDTGlCLE9BQU87QUFBQSxNQUNQQyxVQUFVO0FBQUEsTUFDVkMsU0FBUztBQUFBLE1BQ1RDLFNBQVNBLENBQUNDLFVBQVVBLE1BQU1DLE9BQU8sMEJBQTBCLENBQUNDLFVBQVU7QUFDcEVBLGNBQU03RixTQUFTSCxZQUFZLEVBQUVrRixjQUFjLEVBQUVmLE1BQU0sT0FBTztBQUFBLE1BQzVELEdBQUcsRUFBRXZCLFdBQVcsRUFBRXVCLE1BQU0sV0FBVzFCLFdBQVd2QyxRQUFRdEIsR0FBRyxFQUFFLENBQUM7QUFBQSxJQUM5RDtBQUFBLEVBQ0Y7QUFDQSxTQUFPO0FBQ1Q7QUFFQSxTQUFTeUgsd0JBQXdCUCxPQUFPbEMsVUFBVTtBQUNoRCxRQUFNMEMsV0FBV2Qsb0JBQW9CNUIsUUFBUTtBQUM3QyxNQUFJLENBQUMwQyxTQUFVLFFBQU87QUFDdEIsTUFBSUEsU0FBU1gsVUFBVTtBQUNyQkcsVUFBTVMsYUFBYSxFQUFFWCxTQUFTVSxTQUFTVixRQUFRLENBQUM7QUFDaEQsV0FBTztBQUFBLEVBQ1Q7QUFDQVUsV0FBU1QsUUFBUUMsS0FBSztBQUN0QixTQUFPO0FBQ1Q7QUFFQSxTQUFTVSxxQkFBcUJWLE9BQU9XLE9BQU87QUFDMUMsTUFBSSxDQUFDQSxNQUFPO0FBQ1pYLFFBQU1ZLGFBQWFELE1BQU03RCxTQUFTO0FBQ2xDa0QsUUFBTWEsYUFBYSxFQUFFQyxPQUFPLFlBQVlDLFNBQVMsT0FBTzlELFNBQVMwRCxNQUFNMUQsUUFBUSxDQUFDO0FBQ2xGO0FBRUEsU0FBUytELHFCQUFxQmhCLE9BQU9sQyxVQUFVbUQsV0FBVztBQUN4RCxRQUFNakQsU0FBU0gscUJBQXFCQyxRQUFRO0FBQzVDLFFBQU1vRCxZQUFZcEQsU0FBU3FELFVBQVVsRTtBQUNyQyxRQUFNbUUsaUJBQWlCSCxZQUFZLElBQy9CakQsT0FBT3BGLEtBQUssQ0FBQytILFdBQVVBLE9BQU0xRCxVQUFVaUUsWUFBWTNJLG9CQUFvQixHQUFHMEUsVUFDMUUsQ0FBQyxHQUFHZSxNQUFNLEVBQUVxRCxRQUFRLEVBQUV6SSxLQUFLLENBQUMrSCxXQUFVQSxPQUFNMUQsVUFBVWlFLFlBQVkzSSxvQkFBb0IsR0FBRzBFO0FBQzdGLFFBQU0wRCxRQUFRdkYsT0FBT2lFLFNBQVMrQixjQUFjLElBQ3hDcEQsT0FBT3BGLEtBQUssQ0FBQ3VFLFNBQVNoRixLQUFLcUIsSUFBSTJELEtBQUtGLFVBQVVtRSxjQUFjLElBQUk3SSxvQkFBb0IsSUFDcEY7QUFDSm1JLHVCQUFxQlYsT0FBT1csS0FBSztBQUNuQztBQUVBLFNBQVNXLFNBQVNwSixPQUFPO0FBQ3ZCLFNBQU9BLE1BQU1xSixZQUFZLEVBQUVDLFFBQVEsZUFBZSxHQUFHLEVBQUVBLFFBQVEsVUFBVSxFQUFFLEtBQUs7QUFDbEY7QUFFQSxTQUFTQyxPQUFPeEgsV0FBVXlILE1BQU07QUFDOUIsUUFBTUMsT0FBTyxJQUFJakosSUFBSXVCLFVBQVNJLFNBQVN1SDtBQUFBQSxJQUFRLENBQUN4SCxZQUFZO0FBQUEsTUFDMURBLFFBQVF0QjtBQUFBQSxNQUNSLElBQUlzQixRQUFRd0UsS0FBS0MsUUFBUSxJQUFJZ0QsSUFBSSxDQUFDL0MsUUFBUUEsSUFBSWhHLEVBQUU7QUFBQSxNQUNoRCxJQUFJc0IsUUFBUXdFLEtBQUtrRCxVQUFVLElBQUlELElBQUksQ0FBQ0UsVUFBVUEsTUFBTWpKLEVBQUU7QUFBQSxNQUN0RCxHQUFJc0IsUUFBUXdFLEtBQUtNLG1CQUFtQixDQUFDOUUsUUFBUXdFLEtBQUtNLGlCQUFpQnBHLEVBQUUsSUFBSTtBQUFBLElBQUc7QUFBQSxFQUM3RSxDQUFDO0FBQ0YsTUFBSUEsS0FBS3dJLFNBQVNJLElBQUk7QUFDdEIsTUFBSU0sU0FBUztBQUNiLFNBQU9MLEtBQUtNLElBQUluSixFQUFFLEdBQUc7QUFDbkJBLFNBQUssR0FBR3dJLFNBQVNJLElBQUksQ0FBQyxJQUFJTSxNQUFNO0FBQ2hDQSxjQUFVO0FBQUEsRUFDWjtBQUNBLFNBQU9sSjtBQUNUO0FBRUEsU0FBU29KLHFCQUFxQmhDLE9BQU9pQyxjQUFjO0FBQ2pEbkosU0FBT3dCLEtBQUswRixLQUFLLEVBQUVqQyxRQUFRLENBQUMzRCxRQUFRLE9BQU80RixNQUFNNUYsR0FBRyxDQUFDO0FBQ3JEdEIsU0FBT29KLE9BQU9sQyxPQUFPM0osNEJBQTRCNEwsWUFBWSxDQUFDO0FBQ2hFO0FBRUEsU0FBU0UsY0FBY25DLE9BQU9vQyxPQUFPO0FBQ25DQSxRQUFNckUsUUFBUSxDQUFDc0UsU0FBUztBQUN0QixVQUFNbkksVUFBVThGLE1BQU03RixTQUFTekIsS0FBSyxDQUFDdUUsU0FBU0EsS0FBS3JFLE9BQU95SixLQUFLNUYsU0FBUztBQUN4RSxVQUFNbUMsTUFBTTFFLFNBQVN3RSxNQUFNQyxNQUFNakcsS0FBSyxDQUFDdUUsU0FBU0EsS0FBS3JFLE9BQU95SixLQUFLdEQsS0FBSztBQUN0RSxRQUFJSCxJQUFLOUYsUUFBT29KLE9BQU90RCxLQUFLLEVBQUUwRCxPQUFPRCxLQUFLQyxPQUFPeEQsTUFBTXVELEtBQUt2RCxNQUFNeUQsTUFBTUYsS0FBS0UsS0FBSyxDQUFDO0FBQUEsRUFDckYsQ0FBQztBQUNIO0FBRUEsU0FBU0MsU0FBUyxFQUFFOUMsT0FBTytDLFVBQVVDLE9BQU8sR0FBRyxHQUFHO0FBQ2hELFNBQ0UsdUJBQUMsV0FBTSxXQUFVLHlCQUNmO0FBQUEsMkJBQUMsVUFBTWhELG1CQUFQO0FBQUE7QUFBQTtBQUFBO0FBQUEsV0FBYTtBQUFBLElBQ1orQztBQUFBQSxJQUNBQyxPQUFPLHVCQUFDLFdBQU9BLGtCQUFSO0FBQUE7QUFBQTtBQUFBO0FBQUEsV0FBYSxJQUFXO0FBQUEsT0FIbEM7QUFBQTtBQUFBO0FBQUE7QUFBQSxTQUlBO0FBRUo7QUFBQ0MsS0FSUUg7QUFVVCxTQUFTSSxlQUFlLEVBQUVsRCxPQUFPMUgsT0FBT0UsS0FBS0MsS0FBSzBLLE1BQU1DLFVBQVVDLE9BQU8sSUFBSXBELFdBQVcsTUFBTSxHQUFHO0FBQy9GLFNBQ0UsdUJBQUMsWUFBUyxPQUNSLGlDQUFDLFNBQUksV0FBVSx1QkFDYjtBQUFBO0FBQUEsTUFBQztBQUFBO0FBQUEsUUFDQyxNQUFLO0FBQUEsUUFDTDtBQUFBLFFBQ0E7QUFBQSxRQUNBO0FBQUEsUUFDQTtBQUFBLFFBQ0E7QUFBQSxRQUNBLFVBQVUsQ0FBQ2MsVUFBVXFDLFNBQVM1SCxPQUFPdUYsTUFBTS9HLE9BQU8xQixLQUFLLENBQUM7QUFBQTtBQUFBLE1BUDFEO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQSxJQU80RDtBQUFBLElBRTVEO0FBQUEsTUFBQztBQUFBO0FBQUEsUUFDQyxNQUFLO0FBQUEsUUFDTDtBQUFBLFFBQ0E7QUFBQSxRQUNBO0FBQUEsUUFDQTtBQUFBLFFBQ0E7QUFBQSxRQUNBLFVBQVUsQ0FBQ3lJLFVBQVVxQyxTQUFTNUgsT0FBT3VGLE1BQU0vRyxPQUFPMUIsS0FBSyxDQUFDO0FBQUE7QUFBQSxNQVAxRDtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUEsSUFPNEQ7QUFBQSxJQUUzRCtLLE9BQU8sdUJBQUMsUUFBSUEsa0JBQUw7QUFBQTtBQUFBO0FBQUE7QUFBQSxXQUFVLElBQVE7QUFBQSxPQW5CNUI7QUFBQTtBQUFBO0FBQUE7QUFBQSxTQW9CQSxLQXJCRjtBQUFBO0FBQUE7QUFBQTtBQUFBLFNBc0JBO0FBRUo7QUFBQ0MsTUExQlFKO0FBNEJULFNBQVNLLFVBQVUsRUFBRW5ELE9BQU9sQyxTQUFTLEdBQUc7QUFDdEMsUUFBTSxFQUFFcUQsV0FBV3BELGFBQWEsSUFBSUQ7QUFDcEMsUUFBTXNGLFFBQVFyRixjQUFjc0YsY0FBYztBQUMxQyxRQUFNQyxPQUFPQSxNQUFNdEQsTUFBTWEsYUFBYTtBQUFBLElBQ3BDQyxPQUFPSyxVQUFVSixVQUFVLGFBQWE7QUFBQSxJQUN4Q0EsU0FBUyxDQUFDSSxVQUFVSjtBQUFBQSxJQUNwQjlELFNBQVNrRSxVQUFVbEU7QUFBQUEsRUFDckIsQ0FBQztBQUNELFFBQU1zRyxPQUFPQSxDQUFDdEcsWUFBWStDLE1BQU1hLGFBQWEsRUFBRUMsT0FBTyxZQUFZQyxTQUFTLE9BQU85RCxRQUFRLENBQUM7QUFDM0YsUUFBTXVHLFdBQVczRyxXQUFXaUIsU0FBUzdELFVBQVU2RCxTQUFTaEIsU0FBUztBQUNqRSxRQUFNNUMsZUFBZXdDLGdCQUFnQm9CLFNBQVM3RCxVQUFVdUosU0FBUzFLLEVBQUU7QUFDbkUsUUFBTTJLLGNBQWNBLENBQUN4QyxjQUFjO0FBQ2pDLFVBQU15QyxPQUFPNUYsU0FBU0MsYUFBYTFELFNBQVNsQyxLQUFLRSxJQUFJLEdBQUdGLEtBQUtDLElBQUkwRixTQUFTQyxhQUFhMUQsU0FBU0ssU0FBUyxHQUFHUixlQUFlK0csU0FBUyxDQUFDLENBQUM7QUFDdEksUUFBSXlDLEtBQU1ILE1BQUtHLEtBQUt0RyxPQUFPO0FBQUEsRUFDN0I7QUFDQSxTQUNFLHVCQUFDLFNBQUksV0FBVSwwQkFDYjtBQUFBLDJCQUFDLFlBQU8sTUFBSyxVQUFTLE9BQU0sb0JBQW1CLGNBQVcsb0JBQW1CLFNBQVMsTUFBTXFHLFlBQVksRUFBRSxHQUFHLGlDQUFDLFlBQVMsZUFBWSxVQUF0QjtBQUFBO0FBQUE7QUFBQTtBQUFBLFdBQTRCLEtBQXpJO0FBQUE7QUFBQTtBQUFBO0FBQUEsV0FBNEk7QUFBQSxJQUM1SSx1QkFBQyxZQUFPLE1BQUssVUFBUyxPQUFNLGtDQUFpQyxjQUFXLHFCQUFvQixTQUFTLE1BQU16QyxxQkFBcUJoQixPQUFPbEMsVUFBVSxFQUFFLEdBQUcsaUNBQUMsZUFBWSxlQUFZLFVBQXpCO0FBQUE7QUFBQTtBQUFBO0FBQUEsV0FBK0IsS0FBckw7QUFBQTtBQUFBO0FBQUE7QUFBQSxXQUF3TDtBQUFBLElBQ3hMLHVCQUFDLFlBQU8sTUFBSyxVQUFTLFdBQVUsY0FBYSxPQUFPcUQsVUFBVUosVUFBVSxVQUFVLFFBQVEsY0FBWUksVUFBVUosVUFBVSxVQUFVLFFBQVEsU0FBU3VDLE1BQ2xKbkMsb0JBQVVKLFVBQVUsdUJBQUMsU0FBTSxlQUFZLFVBQW5CO0FBQUE7QUFBQTtBQUFBO0FBQUEsV0FBeUIsSUFBTSx1QkFBQyxRQUFLLGVBQVksVUFBbEI7QUFBQTtBQUFBO0FBQUE7QUFBQSxXQUF3QixLQUQ5RTtBQUFBO0FBQUE7QUFBQTtBQUFBLFdBRUE7QUFBQSxJQUNBLHVCQUFDLFlBQU8sTUFBSyxVQUFTLE9BQU0sZ0JBQWUsY0FBVyxnQkFBZSxTQUFTLE1BQU0wQyxZQUFZLENBQUMsR0FBRyxpQ0FBQyxlQUFZLGVBQVksVUFBekI7QUFBQTtBQUFBO0FBQUE7QUFBQSxXQUErQixLQUFuSTtBQUFBO0FBQUE7QUFBQTtBQUFBLFdBQXNJO0FBQUEsSUFDdEksdUJBQUMsWUFBTyxNQUFLLFVBQVMsT0FBTSwrQkFBOEIsY0FBVyxpQkFBZ0IsU0FBUyxNQUFNekMscUJBQXFCaEIsT0FBT2xDLFVBQVUsQ0FBQyxHQUFHLGlDQUFDLGdCQUFhLGVBQVksVUFBMUI7QUFBQTtBQUFBO0FBQUE7QUFBQSxXQUFnQyxLQUE5SztBQUFBO0FBQUE7QUFBQTtBQUFBLFdBQWlMO0FBQUEsSUFDakwsdUJBQUMsWUFBUVIsbUJBQVM2RCxVQUFVbEUsT0FBTyxLQUFuQztBQUFBO0FBQUE7QUFBQTtBQUFBLFdBQXFDO0FBQUEsSUFDckM7QUFBQSxNQUFDO0FBQUE7QUFBQSxRQUNDLGNBQVc7QUFBQSxRQUNYLE1BQUs7QUFBQSxRQUNMLEtBQUk7QUFBQSxRQUNKLEtBQUttRztBQUFBQSxRQUNMLE1BQUs7QUFBQSxRQUNMLE9BQU9qTCxLQUFLQyxJQUFJZ0wsT0FBT2pDLFVBQVVsRSxPQUFPO0FBQUEsUUFDeEMsVUFBVSxDQUFDMEQsVUFBVTRDLEtBQUtuSSxPQUFPdUYsTUFBTS9HLE9BQU8xQixLQUFLLENBQUM7QUFBQTtBQUFBLE1BUHREO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQSxJQU93RDtBQUFBLElBRXhEO0FBQUEsTUFBQztBQUFBO0FBQUEsUUFDQyxNQUFLO0FBQUEsUUFDTCxXQUFXaUosVUFBVUwsVUFBVSxXQUFXLGNBQWM7QUFBQSxRQUN4RCxTQUFTLE1BQU1kLE1BQU1hLGFBQWEsRUFBRUMsT0FBTyxVQUFVQyxTQUFTLE1BQU0sQ0FBQztBQUFBLFFBQUU7QUFBQTtBQUFBLE1BSHpFO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQSxJQUljO0FBQUEsSUFDZDtBQUFBLE1BQUM7QUFBQTtBQUFBLFFBQ0MsTUFBSztBQUFBLFFBQ0wsV0FBV0ksVUFBVXdDLGNBQWMsY0FBYztBQUFBLFFBQ2pELFNBQVMsTUFBTTNELE1BQU1hLGFBQWEsRUFBRThDLGFBQWEsQ0FBQ3hDLFVBQVV3QyxZQUFZLENBQUM7QUFBQSxRQUFFO0FBQUE7QUFBQSxNQUg3RTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUEsSUFJYTtBQUFBLElBQ2I7QUFBQSxNQUFDO0FBQUE7QUFBQSxRQUNDLGNBQVc7QUFBQSxRQUNYLE9BQU83RixTQUFTOEY7QUFBQUEsUUFDaEIsVUFBVSxDQUFDakQsVUFBVVgsTUFBTTZELGtCQUFrQmxELE1BQU0vRyxPQUFPMUIsS0FBSztBQUFBLFFBRS9EO0FBQUEsaUNBQUMsWUFBTyxPQUFNLFdBQVUsdUJBQXhCO0FBQUE7QUFBQTtBQUFBO0FBQUEsaUJBQStCO0FBQUEsVUFDL0IsdUJBQUMsWUFBTyxPQUFNLFVBQVMsc0JBQXZCO0FBQUE7QUFBQTtBQUFBO0FBQUEsaUJBQTZCO0FBQUEsVUFDN0IsdUJBQUMsWUFBTyxPQUFNLGtCQUFpQiw4QkFBL0I7QUFBQTtBQUFBO0FBQUE7QUFBQSxpQkFBNkM7QUFBQTtBQUFBO0FBQUEsTUFQL0M7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBLElBUUE7QUFBQSxPQXBDRjtBQUFBO0FBQUE7QUFBQTtBQUFBLFNBcUNBO0FBRUo7QUFBQzRMLE1BdkRRWDtBQXlEVCxTQUFTWSxTQUFTLEVBQUUvRCxPQUFPbEMsU0FBUyxHQUFHO0FBQUFrRyxLQUFBO0FBQ3JDLFFBQU0sRUFBRS9KLHFCQUFVOEQsY0FBY2pCLFdBQVdxRSxVQUFVLElBQUlyRDtBQUN6RCxRQUFNbUcscUJBQXFCN00sa0NBQWtDMEYsU0FBUztBQUN0RSxRQUFNc0csUUFBUWpMLEtBQUtFLElBQUksTUFBTzBGLGNBQWNzRixjQUFjcEosVUFBU0ksU0FBUzZKLE9BQU8sQ0FBQ0MsS0FBSy9KLFlBQVkrSixNQUFNL0osUUFBUWdLLFVBQVUsQ0FBQyxDQUFDO0FBQy9ILFFBQU1DLFdBQVcsR0FBSWxELFVBQVVsRSxVQUFVbUcsUUFBUyxHQUFHO0FBQ3JELFFBQU1rQixXQUFXaFEsT0FBTyxJQUFJO0FBQzVCLFFBQU1pUSxnQkFBZ0JqUSxPQUFPLElBQUk7QUFDakMsUUFBTWtRLGtCQUFrQmxRLE9BQU8sSUFBSTtBQUNuQyxRQUFNbVEsb0JBQW9CblEsT0FBTyxJQUFJO0FBQ3JDLFFBQU1vUSxxQkFBcUJwUSxPQUFPLElBQUk7QUFDdEMsUUFBTSxDQUFDcVEsbUJBQW1CQyxvQkFBb0IsSUFBSXJRLFNBQVMsSUFBSTtBQUMvRCxRQUFNLENBQUNzUSxzQkFBc0JDLHVCQUF1QixJQUFJdlEsU0FBUyxJQUFJO0FBQ3JFLFFBQU0sQ0FBQ3dRLFNBQVNDLFVBQVUsSUFBSXpRLFNBQVMsSUFBSTtBQUUzQyxRQUFNMFEsb0JBQW9CQSxDQUFDQyxhQUFhO0FBQ3RDVCxzQkFBa0JVLFVBQVVEO0FBQzVCLFFBQUlWLGdCQUFnQlcsUUFBUztBQUM3Qlgsb0JBQWdCVyxVQUFVQyxzQkFBc0IsTUFBTTtBQUNwRFosc0JBQWdCVyxVQUFVO0FBQzFCLFlBQU1FLFVBQVVaLGtCQUFrQlU7QUFDbENWLHdCQUFrQlUsVUFBVTtBQUM1QkUsZ0JBQVU7QUFBQSxJQUNaLENBQUM7QUFBQSxFQUNIO0FBQ0EsUUFBTUMsb0JBQW9CQSxNQUFNO0FBQzlCLFFBQUlkLGdCQUFnQlcsUUFBU0ksc0JBQXFCZixnQkFBZ0JXLE9BQU87QUFDekVYLG9CQUFnQlcsVUFBVTtBQUMxQixVQUFNRSxVQUFVWixrQkFBa0JVO0FBQ2xDVixzQkFBa0JVLFVBQVU7QUFDNUJFLGNBQVU7QUFBQSxFQUNaO0FBRUEsUUFBTUcsZUFBZUEsQ0FBQzdFLFVBQVU7QUFDOUIsUUFBSSxDQUFDQSxNQUFNOEUsV0FBVyxDQUFDOUUsTUFBTStFLFFBQVM7QUFDdEMvRSxVQUFNZ0YsZUFBZTtBQUNyQixVQUFNQyxRQUFRdEIsU0FBU2E7QUFDdkIsUUFBSSxDQUFDUyxNQUFPO0FBQ1osVUFBTUMsT0FBT0QsTUFBTWxLLHNCQUFzQjtBQUN6QyxVQUFNb0ssV0FBVzNOLEtBQUtDLElBQUl5TixLQUFLekosT0FBT2pFLEtBQUtFLElBQUksR0FBR3NJLE1BQU1vRixVQUFVRixLQUFLcEosSUFBSSxDQUFDO0FBQzVFLFVBQU11SixjQUFjSixNQUFNSyxhQUFhSCxZQUFZM04sS0FBS0UsSUFBSSxHQUFHdU4sTUFBTU0sV0FBVztBQUNoRixVQUFNQyxjQUFjaE8sS0FBS0UsSUFBSSxHQUFHK0MsT0FBTytGLFVBQVVpRixJQUFJLEtBQUssQ0FBQztBQUMzRCxVQUFNQyxXQUFXbE8sS0FBS0MsSUFBSSxHQUFHRCxLQUFLRSxJQUFJLEdBQUc4TixjQUFjaE8sS0FBS21PLElBQUksQ0FBQzNGLE1BQU00RixTQUFTLEtBQU0sQ0FBQyxDQUFDO0FBQ3hGdkcsVUFBTWEsYUFBYSxFQUFFdUYsTUFBTWhMLE9BQU9pTCxTQUFTOUksUUFBUSxDQUFDLENBQUMsRUFBRSxDQUFDO0FBQ3hENkgsMEJBQXNCLE1BQU07QUFDMUJRLFlBQU1LLGFBQWNELGFBQWFKLE1BQU1NLGNBQWVKO0FBQUFBLElBQ3hELENBQUM7QUFBQSxFQUNIO0FBRUF6UixZQUFVLE1BQU0sTUFBTTtBQUNwQixRQUFJbVEsZ0JBQWdCVyxRQUFTSSxzQkFBcUJmLGdCQUFnQlcsT0FBTztBQUFBLEVBQzNFLEdBQUcsRUFBRTtBQUVMLFFBQU1xQiw2QkFBNkJBLENBQUNULFlBQVk7QUFDOUMsVUFBTUgsUUFBUXRCLFNBQVNhO0FBQ3ZCLFVBQU1BLFVBQVVuRixNQUFNeUcsWUFBWTtBQUNsQyxRQUFJLENBQUNiLE1BQU8sUUFBTyxFQUFFYyxPQUFPLE9BQU9DLFFBQVEsb0NBQW9DO0FBQy9FLFVBQU1kLE9BQU9ELE1BQU1sSyxzQkFBc0I7QUFDekMsVUFBTWtMLFdBQVd6TyxLQUFLQztBQUFBQSxNQUNwQndOLE1BQU1NO0FBQUFBLE1BQ04vTixLQUFLRSxJQUFJLEdBQUcwTixVQUFVRixLQUFLcEosT0FBT21KLE1BQU1LLFVBQVU7QUFBQSxJQUNwRDtBQUNBLFVBQU1oSixVQUFXMkosV0FBV3pPLEtBQUtFLElBQUksR0FBR3VOLE1BQU1NLFdBQVcsSUFDckQvTixLQUFLRSxJQUFJLE1BQU84TSxRQUFRcEgsY0FBY3NGLGNBQWNELEtBQUs7QUFDN0QsVUFBTXlELE9BQU90QyxjQUFjWTtBQUMzQixVQUFNMkIsT0FBT3ZQLG1DQUFtQztBQUFBLE1BQzlDMEMsVUFBVWtMLFFBQVFsTDtBQUFBQSxNQUNsQitDLE1BQU1tSSxRQUFRcEg7QUFBQUEsTUFDZGdKLG9CQUFvQkYsTUFBTTNNO0FBQUFBLE1BQzFCOE0sZ0JBQWdCSCxNQUFNMU07QUFBQUEsTUFDdEI4QztBQUFBQSxJQUNGLENBQUM7QUFDRCxXQUFPLEVBQUUsR0FBRzZKLE1BQU1GLFNBQVM7QUFBQSxFQUM3QjtBQUVBLFFBQU1LLGtCQUFrQkEsQ0FBQ3RHLE9BQU9rRyxTQUFTO0FBQ3ZDLFFBQUlBLEtBQUtLLFVBQVV2RyxNQUFNd0csV0FBVyxFQUFHO0FBQ3ZDLFVBQU1DLE9BQU96RyxNQUFNMEcsY0FBY0M7QUFDakMsVUFBTXpCLE9BQU91QixNQUFNMUwsc0JBQXNCO0FBQ3pDLFFBQUksQ0FBQ21LLE1BQU16SixNQUFPO0FBQ2xCdUUsVUFBTWdGLGVBQWU7QUFDckJoRixVQUFNNEcsZ0JBQWdCO0FBQ3RCNUcsVUFBTTBHLGNBQWNHLG9CQUFvQjdHLE1BQU04RyxTQUFTO0FBQ3ZELFFBQUlDLGdCQUFnQmIsS0FBSy9KO0FBQ3pCLFFBQUkrSixLQUFLeEksU0FBUyxPQUFPO0FBQ3ZCLFlBQU1zSixtQkFBbUIzSCxNQUFNeUcsWUFBWSxFQUFFM0o7QUFDN0MsWUFBTThLLGlCQUFpQnhRLGtDQUFrQ3VRLGdCQUFnQjtBQUN6RSxZQUFNRSxrQkFBa0JELGVBQWV2TztBQUFBQSxRQUFLLENBQUN5TyxXQUMzQ0EsT0FBT25MLGNBQWNrSyxLQUFLL0osVUFBVUgsYUFBYW1MLE9BQU83SSxVQUFVNEgsS0FBSy9KLFVBQVVtQztBQUFBQSxNQUNsRjtBQUNEeUksc0JBQWdCL0csTUFBTW9ILFdBQ2xCaFEsaUNBQWlDNFAsa0JBQWtCZCxLQUFLL0osU0FBUyxJQUNqRStLLG1CQUFtQkQsZUFBZWxOLFNBQVMsSUFDekMsRUFBRSxHQUFHbU0sS0FBSy9KLFdBQVdrTCxTQUFTSixlQUFlLElBQzdDZixLQUFLL0o7QUFDWGtELFlBQU1pSSxhQUFhLGdCQUFnQjtBQUFBLElBQ3JDO0FBQ0ExRCxrQkFBY1ksVUFBVTtBQUFBLE1BQ3RCLEdBQUcwQjtBQUFBQSxNQUNIL0osV0FBVzRLO0FBQUFBLE1BQ1hNLFNBQVNuQixLQUFLeEksU0FBUyxRQUFRakgsa0NBQWtDc1EsYUFBYSxJQUFJO0FBQUEsTUFDbEZRLGVBQWVyQixLQUFLeEksU0FBUyxRQUFROUgsNEJBQTRCeUosTUFBTXlHLFlBQVksRUFBRXhNLFFBQVEsSUFBSTtBQUFBLE1BQ2pHa08sV0FBV3RCLEtBQUt4SSxTQUFTLFFBQVEyQixNQUFNeUcsWUFBWSxFQUFFMUksZUFBZTtBQUFBLE1BQ3BFMEosV0FBVzlHLE1BQU04RztBQUFBQSxNQUNqQjVCO0FBQUFBLE1BQ0F1QyxRQUFRekgsTUFBTW9GO0FBQUFBLE1BQ2RzQyxPQUFPO0FBQUEsTUFDUEMsUUFBUXpCLEtBQUtwTTtBQUFBQSxNQUNiOE4sVUFBVTtBQUFBLElBQ1o7QUFDQXZJLFVBQU1ZLGFBQWE4RyxhQUFhO0FBQ2hDMUgsVUFBTWEsYUFBYSxFQUFFQyxPQUFPLFlBQVlDLFNBQVMsT0FBTzlELFNBQVM0SixLQUFLNUosUUFBUSxDQUFDO0FBQUEsRUFDakY7QUFFQSxRQUFNdUwsaUJBQWlCQSxDQUFDN0gsVUFBVTtBQUNoQyxVQUFNa0csT0FBT3RDLGNBQWNZO0FBQzNCLFFBQUksQ0FBQzBCLFFBQVFBLEtBQUtZLGNBQWM5RyxNQUFNOEcsVUFBVztBQUNqRCxRQUFJLENBQUNaLEtBQUt3QixTQUFTbFEsS0FBS3FCLElBQUltSCxNQUFNb0YsVUFBVWMsS0FBS3VCLE1BQU0sSUFBSSxFQUFHO0FBQzlEdkIsU0FBS3dCLFFBQVE7QUFDYixRQUFJeEIsS0FBS3hJLFNBQVMsVUFBVTtBQUMxQixZQUFNeUksT0FBT04sMkJBQTJCN0YsTUFBTW9GLE9BQU87QUFDckRjLFdBQUswQixXQUFXekI7QUFDaEJsQywyQkFBcUIsRUFBRSxHQUFHa0MsTUFBTTJCLE9BQU81QixLQUFLNEIsTUFBTSxDQUFDO0FBQ25ELFVBQUkzQixLQUFLSixPQUFPO0FBQ2QxRyxjQUFNYSxhQUFhLEVBQUVDLE9BQU8sWUFBWUMsU0FBUyxPQUFPOUQsU0FBUzZKLEtBQUs3SixRQUFRLENBQUM7QUFBQSxNQUNqRjtBQUNBO0FBQUEsSUFDRjtBQUNBLFFBQUk0SixLQUFLeEksU0FBUyxxQkFBcUI7QUFDckMsWUFBTXFLLGFBQWEvSCxNQUFNb0YsVUFBVWMsS0FBS3VCLFVBQVV2QixLQUFLaEIsS0FBS3pKO0FBQzVELFlBQU11TSxTQUFTeFEsS0FBS0MsSUFBSXlPLEtBQUt4TyxLQUFLRixLQUFLRTtBQUFBQSxRQUNyQ3dPLEtBQUt6TztBQUFBQSxRQUNMUCxnQ0FBZ0NnUCxLQUFLcE0sS0FBS2lPLFNBQVM7QUFBQSxNQUNyRCxDQUFDO0FBQ0QsVUFBSXZRLEtBQUtxQixJQUFJbVAsU0FBUzlCLEtBQUt5QixNQUFNLElBQUksS0FBVTtBQUMvQyxZQUFNTSxRQUFRRCxTQUFTOUIsS0FBS3lCO0FBQzVCdEksWUFBTUMsT0FBTywwQkFBMEIsQ0FBQ0MsVUFBVTtBQUNoRCxjQUFNMkksU0FBUzNJLE1BQU03RixTQUFTd00sS0FBSzNNLFlBQVksRUFBRTBFLEtBQUtNO0FBQ3RELFlBQUksQ0FBQzJKLE9BQVE7QUFDYkEsZUFBTzFKLFNBQVN5SjtBQUNoQkMsZUFBT3ZJLE9BQU9zSTtBQUFBQSxNQUNoQixHQUFHLEVBQUVFLGFBQWFqQyxLQUFLaUMsYUFBYWhNLFdBQVcrSixLQUFLL0osVUFBVSxDQUFDO0FBQy9EK0osV0FBS3lCLFNBQVNLO0FBQ2QzSSxZQUFNYSxhQUFhO0FBQUEsUUFDakJDLE9BQU87QUFBQSxRQUNQQyxTQUFTO0FBQUEsUUFDVDlELFNBQVM0SixLQUFLa0MsaUJBQWtCSixTQUFTOUIsS0FBS3hKO0FBQUFBLE1BQ2hELENBQUM7QUFDRDtBQUFBLElBQ0Y7QUFDQSxVQUFNMkwsY0FBY3JJLE1BQU1vRixVQUFVYyxLQUFLdUIsVUFBVXZCLEtBQUtoQixLQUFLeko7QUFDN0QsVUFBTTZNLFdBQVd2UixrQ0FBa0M7QUFBQSxNQUNqRHVDLFVBQVU0TSxLQUFLcUI7QUFBQUEsTUFDZmxMLE1BQU02SixLQUFLc0I7QUFBQUEsTUFDWEgsU0FBU25CLEtBQUttQjtBQUFBQSxNQUNka0IsU0FBU3JDLEtBQUsvSjtBQUFBQSxNQUNka007QUFBQUEsSUFDRixDQUFDO0FBQ0QsUUFBSSxDQUFDQyxTQUFTdkMsU0FBU3ZPLEtBQUtxQixJQUFJeVAsU0FBU0UsV0FBV3RDLEtBQUt1QyxlQUFlLEVBQUUsSUFBSSxLQUFVO0FBQ3hGdkMsU0FBS3VDLGNBQWNILFNBQVNFO0FBQzVCbEUsc0JBQWtCLE1BQU07QUFDdEJqRixZQUFNcUosY0FBYyxDQUFDbkosVUFBVTtBQUM3QitJLGlCQUFTM0csTUFBTXJFLFFBQVEsQ0FBQ3NFLFNBQVM7QUFDL0IsZ0JBQU16RCxNQUFNb0IsTUFBTTdGLFNBQVNrSSxLQUFLckksWUFBWSxHQUFHMEUsTUFBTUMsTUFBTWpHLEtBQUssQ0FBQ3VFLFNBQVNBLEtBQUtyRSxPQUFPeUosS0FBS3RELEtBQUs7QUFDaEcsY0FBSUgsSUFBSzlGLFFBQU9vSixPQUFPdEQsS0FBSyxFQUFFMEQsT0FBT0QsS0FBS0MsT0FBT3hELE1BQU11RCxLQUFLdkQsTUFBTXlELE1BQU1GLEtBQUtFLEtBQUssQ0FBQztBQUFBLFFBQ3JGLENBQUM7QUFBQSxNQUNILEdBQUc7QUFBQSxRQUNEM0IsT0FBTztBQUFBLFFBQ1BDLFNBQVM7QUFBQSxRQUNUOUQsU0FBUzRKLEtBQUs1SixVQUFVZ00sU0FBU0U7QUFBQUEsTUFDbkMsQ0FBQztBQUFBLElBQ0gsQ0FBQztBQUFBLEVBQ0g7QUFFQSxRQUFNRyxnQkFBZ0JBLENBQUMzSSxVQUFVO0FBQy9CLFVBQU1rRyxPQUFPdEMsY0FBY1k7QUFDM0IsUUFBSSxDQUFDMEIsUUFBUUEsS0FBS1ksY0FBYzlHLE1BQU04RyxVQUFXO0FBQ2pELFFBQUk5RyxNQUFNMEcsY0FBY2tDLG9CQUFvQjVJLE1BQU04RyxTQUFTLEVBQUc5RyxPQUFNMEcsY0FBY21DLHNCQUFzQjdJLE1BQU04RyxTQUFTO0FBQ3ZILFFBQUlaLEtBQUt4SSxTQUFTLE9BQU87QUFDdkJpSCx3QkFBa0I7QUFDbEIsVUFBSTNFLE1BQU10QyxTQUFTLG1CQUFtQixDQUFDd0ksS0FBS3dCLE1BQU9ySSxPQUFNeUosY0FBYztBQUFBO0FBQ2xFekosY0FBTTBKLGNBQWM3QyxLQUFLL0osU0FBUztBQUFBLElBQ3pDO0FBQ0EsUUFBSStKLEtBQUt4SSxTQUFTLFlBQVl3SSxLQUFLd0IsU0FBUzFILE1BQU10QyxTQUFTLGlCQUFpQjtBQUMxRSxZQUFNeUksT0FBT0QsS0FBSzBCLFlBQVkvQiwyQkFBMkI3RixNQUFNb0YsT0FBTztBQUN0RSxVQUFJZSxLQUFLSixPQUFPO0FBQ2QxRyxjQUFNQyxPQUFPLG1CQUFtQixDQUFDQyxVQUFVO0FBQ3pDLGdCQUFNeUosYUFBYXpKLE1BQU03RixTQUFTd00sS0FBSzNNLFlBQVksR0FBR0ssT0FBT0M7QUFDN0QsZ0JBQU0sQ0FBQ29QLFFBQVEsSUFBSUQsWUFBWXhKLE9BQU8wRyxLQUFLMU0sVUFBVSxDQUFDLEtBQUs7QUFDM0QsY0FBSSxDQUFDeVAsU0FBVTtBQUNmQSxtQkFBU25QLEtBQUtxTSxLQUFLck07QUFDbkIsZ0JBQU1vUCxrQkFBa0IzSixNQUFNN0YsU0FBU3lNLEtBQUs1TSxZQUFZLEVBQUVLLE9BQU9DO0FBQ2pFcVAsMEJBQWdCMUwsS0FBS3lMLFFBQVE7QUFDN0JDLDBCQUFnQnRLLEtBQUssQ0FBQ0MsR0FBR0MsTUFBTUQsRUFBRS9FLEtBQUtnRixFQUFFaEYsRUFBRTtBQUFBLFFBQzVDLEdBQUc7QUFBQSxVQUNEcUMsV0FBVyxFQUFFdUIsTUFBTSxjQUFjMUIsV0FBV21LLEtBQUtuSyxXQUFXeEMsVUFBVTJNLEtBQUszTSxTQUFTO0FBQUEsUUFDdEYsQ0FBQztBQUNENkYsY0FBTWEsYUFBYSxFQUFFQyxPQUFPLFlBQVlDLFNBQVMsT0FBTzlELFNBQVM2SixLQUFLN0osUUFBUSxDQUFDO0FBQUEsTUFDakYsT0FBTztBQUNMK0MsY0FBTVMsYUFBYSxFQUFFWCxTQUFTZ0gsS0FBS0gsVUFBVSx5Q0FBeUMsQ0FBQztBQUFBLE1BQ3pGO0FBQUEsSUFDRjtBQUNBLFFBQUlFLEtBQUt3QixPQUFPO0FBQ2QzRCx5QkFBbUJTLFVBQVUwQixLQUFLNEI7QUFDbEM3TSxhQUFPa08sV0FBVyxNQUFNO0FBQ3RCLFlBQUlwRixtQkFBbUJTLFlBQVkwQixLQUFLNEIsTUFBTy9ELG9CQUFtQlMsVUFBVTtBQUFBLE1BQzlFLEdBQUcsQ0FBQztBQUFBLElBQ047QUFDQVAseUJBQXFCLElBQUk7QUFDekJMLGtCQUFjWSxVQUFVO0FBQUEsRUFDMUI7QUFFQSxRQUFNNEUsb0JBQW9CQSxDQUFDdEIsT0FBT3VCLFdBQVc7QUFDM0MsUUFBSXRGLG1CQUFtQlMsWUFBWXNELE9BQU87QUFDeEMvRCx5QkFBbUJTLFVBQVU7QUFDN0I7QUFBQSxJQUNGO0FBQ0E2RSxXQUFPO0FBQUEsRUFDVDtBQUVBLFFBQU1DLHFCQUFxQkEsQ0FBQ3RKLE9BQU91SixTQUFTO0FBQzFDLFFBQUlBLEtBQUtoRCxVQUFVdkcsTUFBTXdHLFdBQVcsRUFBRztBQUN2Q3hHLFVBQU1nRixlQUFlO0FBQ3JCaEYsVUFBTTRHLGdCQUFnQjtBQUN0QjVHLFVBQU0wRyxjQUFjRyxvQkFBb0I3RyxNQUFNOEcsU0FBUztBQUN2RCxVQUFNdEMsVUFBVW5GLE1BQU15RyxZQUFZO0FBQ2xDLFVBQU1uTixRQUFRbkMsNkJBQTZCZ08sUUFBUXZCLGNBQWM7QUFDakU1RCxVQUFNaUksYUFBYSxVQUFVaUMsS0FBS0MsWUFBWSxFQUFFO0FBQ2hEbkssVUFBTVksYUFBYSxFQUFFdkMsTUFBTSxXQUFXMUIsV0FBV3VOLEtBQUt2TixVQUFVLENBQUM7QUFDakU0SCxrQkFBY1ksVUFBVTtBQUFBLE1BQ3RCOUcsTUFBTTtBQUFBLE1BQ05vSyxPQUFPLGtCQUFrQnlCLEtBQUt2TixTQUFTO0FBQUEsTUFDdkM4SyxXQUFXOUcsTUFBTThHO0FBQUFBLE1BQ2pCVyxRQUFRekgsTUFBTW9GO0FBQUFBLE1BQ2RzQyxPQUFPO0FBQUEsTUFDUDFMLFdBQVd1TixLQUFLdk47QUFBQUEsTUFDaEJ6QyxjQUFjZ1EsS0FBS2hRO0FBQUFBLE1BQ25CaVEsY0FBY0QsS0FBS0M7QUFBQUEsTUFDbkI3UTtBQUFBQSxNQUNBOFEsYUFBYWhQLE9BQU8rSixRQUFRbEwsU0FBU0ksU0FBUzZQLEtBQUtoUSxZQUFZLEVBQUVaLEtBQUssQ0FBQztBQUFBLE1BQ3ZFK1EsWUFBWWxTLEtBQUtFLElBQUksTUFBTzhNLFFBQVFwSCxjQUFjc0YsY0FBY0QsS0FBSztBQUFBLE1BQ3JFa0gsa0JBQWtCblMsS0FBS0UsSUFBSSxHQUFHaU0sU0FBU2EsU0FBU2UsZUFBZSxDQUFDO0FBQUEsTUFDaEVxRSxpQkFBaUIzVCxxQ0FBcUM7QUFBQSxRQUNwRG9HLE1BQU1tSSxRQUFRcEg7QUFBQUEsUUFDZGQsU0FBU2tJLFFBQVFoRSxVQUFVbEU7QUFBQUEsUUFDM0J1TixrQkFBa0JOLEtBQUt2TjtBQUFBQSxNQUN6QixDQUFDO0FBQUEsTUFDREcsV0FBVyxFQUFFdUIsTUFBTSxXQUFXMUIsV0FBV3VOLEtBQUt2TixVQUFVO0FBQUEsSUFDMUQ7QUFDQW1JLDRCQUF3QixFQUFFbkksV0FBV3VOLEtBQUt2TixXQUFXOE4sUUFBUXJQLE9BQU8rSixRQUFRbEwsU0FBU0ksU0FBUzZQLEtBQUtoUSxZQUFZLEVBQUVaLEtBQUssQ0FBQyxFQUFFLENBQUM7QUFBQSxFQUM1SDtBQUVBLFFBQU1vUixvQkFBb0JBLENBQUMvSixVQUFVO0FBQ25DLFVBQU1rRyxPQUFPdEMsY0FBY1k7QUFDM0IsUUFBSTBCLE1BQU14SSxTQUFTLG9CQUFvQndJLEtBQUtZLGNBQWM5RyxNQUFNOEcsVUFBVztBQUMzRSxRQUFJLENBQUNaLEtBQUt3QixTQUFTbFEsS0FBS3FCLElBQUltSCxNQUFNb0YsVUFBVWMsS0FBS3VCLE1BQU0sSUFBSSxFQUFHO0FBQzlEdkIsU0FBS3dCLFFBQVE7QUFDYixVQUFNc0MsWUFBWTlELEtBQUt1RCxlQUFpQnpKLE1BQU1vRixVQUFVYyxLQUFLdUIsVUFBVXZCLEtBQUt5RCxtQkFBb0J6RCxLQUFLd0Q7QUFDckcsVUFBTXRILE9BQU9wQyxNQUFNaUssU0FBUyxPQUFPakssTUFBTW9ILFdBQVcsT0FBTztBQUMzRCxVQUFNMEMsU0FBU3RTLEtBQUtDLElBQUksR0FBR0QsS0FBS0UsSUFBSSxHQUFHRixLQUFLMFMsTUFBTUYsWUFBWTVILElBQUksSUFBSUEsSUFBSSxDQUFDO0FBQzNFLFFBQUk1SyxLQUFLcUIsSUFBSWlSLFVBQVU1RCxLQUFLaUUsY0FBY2pFLEtBQUt1RCxZQUFZLElBQUksS0FBVTtBQUN6RXZELFNBQUtpRSxhQUFhMVAsT0FBT3FQLE9BQU9sTixRQUFRLENBQUMsQ0FBQztBQUMxQ3VILDRCQUF3QixFQUFFbkksV0FBV2tLLEtBQUtsSyxXQUFXOE4sUUFBUTVELEtBQUtpRSxXQUFXLENBQUM7QUFDOUU3RixzQkFBa0IsTUFBTTtBQUN0QmpGLFlBQU1xSixjQUFjLENBQUNuSixVQUFVO0FBQzdCQSxjQUFNN0YsU0FBU3dNLEtBQUszTSxZQUFZLEVBQUUyTSxLQUFLdk4sS0FBSyxJQUFJdU4sS0FBS2lFO0FBQUFBLE1BQ3ZELENBQUM7QUFDRDlLLFlBQU1hLGFBQWE7QUFBQSxRQUNqQkMsT0FBTztBQUFBLFFBQ1BDLFNBQVM7QUFBQSxRQUNUOUQsU0FBUzNGLG1DQUFtQ3VQLEtBQUswRCxpQkFBaUJ2SyxNQUFNeUcsWUFBWSxFQUFFMUksWUFBWTtBQUFBLE1BQ3BHLENBQUM7QUFBQSxJQUNILENBQUM7QUFBQSxFQUNIO0FBRUEsUUFBTWdOLG1CQUFtQkEsQ0FBQ3BLLFVBQVU7QUFDbEMsVUFBTWtHLE9BQU90QyxjQUFjWTtBQUMzQixRQUFJMEIsTUFBTXhJLFNBQVMsb0JBQW9Cd0ksS0FBS1ksY0FBYzlHLE1BQU04RyxVQUFXO0FBQzNFLFFBQUk5RyxNQUFNMEcsY0FBY2tDLG9CQUFvQjVJLE1BQU04RyxTQUFTLEVBQUc5RyxPQUFNMEcsY0FBY21DLHNCQUFzQjdJLE1BQU04RyxTQUFTO0FBQ3ZIbkMsc0JBQWtCO0FBQ2xCLFFBQUkzRSxNQUFNdEMsU0FBUyxtQkFBbUIsQ0FBQ3dJLEtBQUt3QixNQUFPckksT0FBTXlKLGNBQWM7QUFBQTtBQUNsRXpKLFlBQU0wSixjQUFjN0MsS0FBSy9KLFNBQVM7QUFDdkN5SCxrQkFBY1ksVUFBVTtBQUN4QkwsNEJBQXdCLElBQUk7QUFBQSxFQUM5QjtBQUVBLFFBQU1rRyxxQkFBcUJBLENBQUNyTyxXQUFXekMsaUJBQWlCO0FBQ3RELFVBQU1pTCxVQUFVbkYsTUFBTXlHLFlBQVk7QUFDbEMsVUFBTW5OLFFBQVFuQyw2QkFBNkJnTyxRQUFRdkIsY0FBYztBQUNqRSxVQUFNcUgsa0JBQWtCOUYsUUFBUStGLGlCQUFpQjdRLFNBQVN6QixLQUFLLENBQUN1RSxTQUFTQSxLQUFLckUsT0FBTzZELFNBQVM7QUFDOUYsUUFBSSxDQUFDc08sbUJBQW1CQSxnQkFBZ0IzUixLQUFLLE1BQU02TCxRQUFRbEwsU0FBU0ksU0FBU0gsWUFBWSxFQUFFWixLQUFLLEVBQUc7QUFDbkcsVUFBTTZSLFVBQVV2VSxxQ0FBcUM7QUFBQSxNQUNuRG9HLE1BQU1tSSxRQUFRcEg7QUFBQUEsTUFDZGQsU0FBU2tJLFFBQVFoRSxVQUFVbEU7QUFBQUEsTUFDM0J1TixrQkFBa0I3TjtBQUFBQSxJQUNwQixDQUFDO0FBQ0RxRCxVQUFNaUksYUFBYSw4QkFBOEI7QUFDakRqSSxVQUFNcUosY0FBYyxDQUFDbkosVUFBVTtBQUFFQSxZQUFNN0YsU0FBU0gsWUFBWSxFQUFFWixLQUFLLElBQUkyUixnQkFBZ0IzUixLQUFLO0FBQUEsSUFBRyxDQUFDO0FBQ2hHMEcsVUFBTWEsYUFBYSxFQUFFNUQsU0FBUzNGLG1DQUFtQzZULFNBQVNuTCxNQUFNeUcsWUFBWSxFQUFFMUksWUFBWSxFQUFFLENBQUM7QUFDN0dpQyxVQUFNMEosY0FBYyxFQUFFckwsTUFBTSxXQUFXMUIsVUFBVSxDQUFDO0FBQUEsRUFDcEQ7QUFFQSxRQUFNeU8sZUFBZUEsQ0FBQ3pLLFVBQVU7QUFDOUIsUUFBSUEsTUFBTXdHLFdBQVcsS0FBS3hHLE1BQU0vRyxXQUFXK0csTUFBTTBHLGNBQWU7QUFDaEUsVUFBTWdFLFNBQVMvRyxTQUFTYSxTQUFTMUosY0FBYywrQkFBK0I7QUFDOUUsUUFBSSxDQUFDNFAsT0FBUTtBQUNiMUssVUFBTWdGLGVBQWU7QUFDckJoRixVQUFNMEcsY0FBY0csb0JBQW9CN0csTUFBTThHLFNBQVM7QUFDdkQsVUFBTTVCLE9BQU93RixPQUFPM1Asc0JBQXNCO0FBQzFDNkksa0JBQWNZLFVBQVU7QUFBQSxNQUN0QjlHLE1BQU07QUFBQSxNQUNOb0osV0FBVzlHLE1BQU04RztBQUFBQSxNQUNqQjZELGNBQWMzSyxNQUFNb0Y7QUFBQUEsTUFDcEJ3RixjQUFjNUssTUFBTTZLO0FBQUFBLE1BQ3BCQyxZQUFZNUY7QUFBQUEsTUFDWjZGLFVBQVUvSyxNQUFNb0g7QUFBQUEsSUFDbEI7QUFDQS9DLGVBQVcsRUFBRXZJLE1BQU1rRSxNQUFNb0YsVUFBVUYsS0FBS3BKLE1BQU1kLEtBQUtnRixNQUFNNkssVUFBVTNGLEtBQUtsSyxLQUFLUyxPQUFPLEdBQUdFLFFBQVEsRUFBRSxDQUFDO0FBQUEsRUFDcEc7QUFFQSxRQUFNcVAsY0FBY0EsQ0FBQ2hMLFVBQVU7QUFDN0IsVUFBTWtHLE9BQU90QyxjQUFjWTtBQUMzQixRQUFJMEIsTUFBTXhJLFNBQVMsYUFBYXdJLEtBQUtZLGNBQWM5RyxNQUFNOEcsVUFBVztBQUNwRSxVQUFNaEwsT0FBT3RFLEtBQUtDLElBQUl5TyxLQUFLeUUsY0FBYzNLLE1BQU1vRixPQUFPLElBQUljLEtBQUs0RSxXQUFXaFA7QUFDMUUsVUFBTWQsTUFBTXhELEtBQUtDLElBQUl5TyxLQUFLMEUsY0FBYzVLLE1BQU02SyxPQUFPLElBQUkzRSxLQUFLNEUsV0FBVzlQO0FBQ3pFcUosZUFBVztBQUFBLE1BQ1R2STtBQUFBQSxNQUNBZDtBQUFBQSxNQUNBUyxPQUFPakUsS0FBS3FCLElBQUltSCxNQUFNb0YsVUFBVWMsS0FBS3lFLFlBQVk7QUFBQSxNQUNqRGhQLFFBQVFuRSxLQUFLcUIsSUFBSW1ILE1BQU02SyxVQUFVM0UsS0FBSzBFLFlBQVk7QUFBQSxJQUNwRCxDQUFDO0FBQUEsRUFDSDtBQUVBLFFBQU1LLGFBQWFBLENBQUNqTCxVQUFVO0FBQzVCLFVBQU1rRyxPQUFPdEMsY0FBY1k7QUFDM0IsUUFBSTBCLE1BQU14SSxTQUFTLGFBQWF3SSxLQUFLWSxjQUFjOUcsTUFBTThHLFVBQVc7QUFDcEUsUUFBSTlHLE1BQU0wRyxjQUFja0Msb0JBQW9CNUksTUFBTThHLFNBQVMsRUFBRzlHLE9BQU0wRyxjQUFjbUMsc0JBQXNCN0ksTUFBTThHLFNBQVM7QUFDdkgsUUFBSTlHLE1BQU10QyxTQUFTLGlCQUFpQjtBQUNsQyxZQUFNd04sZ0JBQWdCO0FBQUEsUUFDcEJwUCxNQUFNdEUsS0FBS0MsSUFBSXlPLEtBQUt5RSxjQUFjM0ssTUFBTW9GLE9BQU87QUFBQSxRQUMvQytGLE9BQU8zVCxLQUFLRSxJQUFJd08sS0FBS3lFLGNBQWMzSyxNQUFNb0YsT0FBTztBQUFBLFFBQ2hEcEssS0FBS3hELEtBQUtDLElBQUl5TyxLQUFLMEUsY0FBYzVLLE1BQU02SyxPQUFPO0FBQUEsUUFDOUNPLFFBQVE1VCxLQUFLRSxJQUFJd08sS0FBSzBFLGNBQWM1SyxNQUFNNkssT0FBTztBQUFBLE1BQ25EO0FBQ0EsWUFBTVEsV0FBVzFILFNBQVNhLFNBQVN6SixzQkFBc0I7QUFDekQsWUFBTXVRLE9BQU8sQ0FBQyxHQUFJM0gsU0FBU2EsU0FBUytHLGlCQUFpQixnQ0FBZ0MsS0FBSyxFQUFHLEVBQzFGQyxPQUFPLENBQUNDLFNBQVM7QUFDaEIsY0FBTXZHLE9BQU91RyxLQUFLMVEsc0JBQXNCO0FBQ3hDLGNBQU0yUSxVQUFVTCxZQUFZbkcsS0FBS2lHLFNBQVNFLFNBQVN2UCxRQUFRb0osS0FBS3BKLFFBQVF1UCxTQUFTRjtBQUNqRixlQUFPTyxXQUFXeEcsS0FBS2lHLFNBQVNELGNBQWNwUCxRQUFRb0osS0FBS3BKLFFBQVFvUCxjQUFjQyxTQUM1RWpHLEtBQUtrRyxVQUFVRixjQUFjbFEsT0FBT2tLLEtBQUtsSyxPQUFPa1EsY0FBY0U7QUFBQUEsTUFDckUsQ0FBQyxFQUNBbEssSUFBSSxDQUFDdUssVUFBVSxFQUFFL04sTUFBTSxPQUFPMUIsV0FBV3lQLEtBQUtFLFFBQVEzUCxXQUFXc0MsT0FBT21OLEtBQUtFLFFBQVFyTixPQUFPTixTQUFTLFFBQVEsRUFBRTtBQUNsSCxVQUFJc04sS0FBS3ZSLFFBQVE7QUFDZixZQUFJZ04sZ0JBQWdCYixLQUFLNkUsV0FBVzFMLE1BQU15RyxZQUFZLEVBQUUzSixZQUFZbVAsS0FBSyxDQUFDO0FBQzFFQSxhQUFLTSxNQUFNMUYsS0FBSzZFLFdBQVcsSUFBSSxDQUFDLEVBQUV6TixRQUFRLENBQUN1TyxRQUFRO0FBQ2pEOUUsMEJBQWdCM1AsaUNBQWlDMlAsZUFBZThFLEdBQUc7QUFBQSxRQUNyRSxDQUFDO0FBQ0R4TSxjQUFNWSxhQUFhOEcsYUFBYTtBQUFBLE1BQ2xDO0FBQUEsSUFDRjtBQUNBbkQsa0JBQWNZLFVBQVU7QUFDeEJILGVBQVcsSUFBSTtBQUFBLEVBQ2pCO0FBRUEsU0FDRSx1QkFBQyxTQUFJLFdBQVUseUJBQ2I7QUFBQSwyQkFBQyxTQUFJLFdBQVUsNEJBQTJCLGVBQVksUUFDcEQ7QUFBQSw2QkFBQyxVQUFLLHdCQUFOO0FBQUE7QUFBQTtBQUFBO0FBQUEsYUFBYztBQUFBLE1BQU8sdUJBQUMsVUFBSyxzQkFBTjtBQUFBO0FBQUE7QUFBQTtBQUFBLGFBQVk7QUFBQSxNQUFPLHVCQUFDLFVBQUsscUJBQU47QUFBQTtBQUFBO0FBQUE7QUFBQSxhQUFXO0FBQUEsTUFBTyx1QkFBQyxVQUFLLG9CQUFOO0FBQUE7QUFBQTtBQUFBO0FBQUEsYUFBVTtBQUFBLE1BQU8sdUJBQUMsVUFBSywyQkFBTjtBQUFBO0FBQUE7QUFBQTtBQUFBLGFBQWlCO0FBQUEsU0FEOUY7QUFBQTtBQUFBO0FBQUE7QUFBQSxXQUVBO0FBQUEsSUFDQSx1QkFBQyxTQUFJLEtBQUtWLFVBQVUsV0FBVSxzQkFBcUIsbUJBQWlCbkQsVUFBVXNMLGFBQWEsSUFBSSxTQUFTakgsY0FDdEcsaUNBQUMsU0FBSSxXQUFVLGdDQUErQixPQUFPLEVBQUUsMkJBQTJCbkIsVUFBVSxnQ0FBZ0NsTSxLQUFLRSxJQUFJLEdBQUcrQyxPQUFPK0YsVUFBVWlGLElBQUksS0FBSyxDQUFDLEVBQUUsR0FDbks7QUFBQSw2QkFBQyxTQUFJLFdBQVUsMkJBQWY7QUFBQTtBQUFBO0FBQUE7QUFBQSxhQUFzQztBQUFBLE1BQ3JDckIsVUFBVSx1QkFBQyxTQUFJLFdBQVUsd0JBQXVCLE9BQU9BLFNBQVMsZUFBWSxVQUFsRTtBQUFBO0FBQUE7QUFBQTtBQUFBLGFBQXdFLElBQU07QUFBQSxNQUN4Rkosb0JBQ0Q7QUFBQSxRQUFDO0FBQUE7QUFBQSxVQUNDLFdBQVcsaUNBQWlDQSxrQkFBa0IrQixRQUFRLEtBQUssYUFBYTtBQUFBLFVBQ3hGLE9BQU8sRUFBRWpLLE1BQU0sR0FBR2tJLGtCQUFrQmlDLFFBQVEsS0FBSztBQUFBLFVBQ2pELGVBQVk7QUFBQSxVQUVaO0FBQUEsbUNBQUMsU0FBRDtBQUFBO0FBQUE7QUFBQTtBQUFBLG1CQUFFO0FBQUEsWUFDRix1QkFBQyxVQUFNakMsNEJBQWtCK0IsUUFBUSxHQUFHL0Isa0JBQWtCd0YsWUFBWSxNQUFNM00sb0JBQW9CbUgsa0JBQWtCbEssRUFBRSxDQUFDLEtBQUtrSyxrQkFBa0JnQyxVQUF4STtBQUFBO0FBQUE7QUFBQTtBQUFBLG1CQUErSTtBQUFBO0FBQUE7QUFBQSxRQU5qSjtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUEsTUFPQSxJQUNJO0FBQUEsTUFDSCxDQUFDLFdBQVcsVUFBVSxTQUFTLFFBQVEsYUFBYSxFQUFFOUU7QUFBQUEsUUFBSSxDQUFDNkssU0FDNUQsdUJBQUMsU0FBSSxXQUFXLHdDQUF3Q0EsSUFBSSxJQUN6RHpTLG9CQUFTSSxTQUFTd0gsSUFBSSxDQUFDekgsU0FBU0YsaUJBQWlCO0FBQ2hELGdCQUFNZ0QsV0FBV2EsY0FBYzFELFdBQVdILFlBQVk7QUFDdEQsZ0JBQU1rRCxVQUFVakYsS0FBS0MsSUFBSWdMLE9BQU9sRyxVQUFVRSxXQUFXLENBQUM7QUFDdEQsZ0JBQU11UCxjQUFjeFUsS0FBS0MsSUFBSWdMLE9BQU9yRixjQUFjMUQsV0FBV0gsZUFBZSxDQUFDLEdBQUdrRCxXQUFXZ0csS0FBSztBQUNoRyxnQkFBTXdKLFNBQVN6VSxLQUFLRSxJQUFJLE1BQU9zVSxjQUFjdlAsT0FBTztBQUNwRCxnQkFBTWhCLFFBQVEsR0FBSXdRLFNBQVN4SixRQUFTLEdBQUc7QUFDdkMsZ0JBQU15SixvQkFBb0IvUCxVQUFVSCxjQUFjdkMsUUFBUXRCO0FBQzFELGdCQUFNZ1UsZUFBZUEsQ0FBQ3JTLE9BQU90QyxLQUFLQyxJQUFJLEtBQU1nRCxPQUFPWCxNQUFNLENBQUMsS0FBS3lDLFVBQVVHLFlBQVl1UCxVQUFVQSxTQUFVLEdBQUc7QUFDNUcsZ0JBQU1HLGdCQUFnQkEsQ0FBQ3RTLE9BQU8sR0FBR3FTLGFBQWFyUyxFQUFFLENBQUM7QUFDakQsZ0JBQU11Uyx3QkFBd0JBLENBQUN2UyxPQUFPLEdBQUlXLE9BQU9YLE1BQU0sQ0FBQyxLQUFLeUMsVUFBVUcsWUFBWXVQLFVBQVVBLFNBQVUsR0FBRztBQUMxRyxnQkFBTUsscUJBQXFCQSxDQUFDOVQsTUFBTUMsT0FBTyxHQUFHakIsS0FBS0UsSUFBSSxPQUFPK0MsT0FBT2hDLEVBQUUsSUFBSWdDLE9BQU9qQyxJQUFJLE1BQU0rRCxVQUFVRyxZQUFZdVAsVUFBVUEsU0FBUyxHQUFHLENBQUM7QUFDdkksZ0JBQU1NLGVBQWVBLENBQUN6UyxPQUFPLEdBQUd4QyxRQUFRbUQsT0FBT1gsTUFBTSxDQUFDLENBQUMsSUFBSSxHQUFHO0FBQzlELGdCQUFNMFMsV0FBV0EsQ0FBQ3pGLGVBQWVqTixLQUFLLE1BQU07QUFDMUN1RixrQkFBTVksYUFBYSxFQUFFakUsV0FBV3ZDLFFBQVF0QixJQUFJLEdBQUc0TyxjQUFjLENBQUM7QUFDOUQxSCxrQkFBTWEsYUFBYTtBQUFBLGNBQ2pCQyxPQUFPO0FBQUEsY0FDUEMsU0FBUztBQUFBLGNBQ1Q5RCxTQUFTRyxVQUFXaEMsT0FBT1gsTUFBTSxDQUFDLEtBQUt5QyxVQUFVRyxZQUFZO0FBQUEsWUFDL0QsQ0FBQztBQUFBLFVBQ0g7QUFDQSxjQUFJcVAsU0FBUyxXQUFXO0FBQ3RCLGtCQUFNVSxjQUFhUCxxQkFBcUIvUCxVQUFVdUIsU0FBUztBQUMzRCxrQkFBTWdQLGVBQWV4SSxzQkFBc0JsSSxjQUFjdkMsUUFBUXRCLEtBQzdEK0wscUJBQXFCNEYsU0FDckJyUCxPQUFPaEIsUUFBUWpELDZCQUE2QjJHLFNBQVM4RixjQUFjLENBQUMsQ0FBQztBQUN6RSxtQkFDRTtBQUFBLGNBQUM7QUFBQTtBQUFBLGdCQUVDLFdBQVcsNEJBQTRCd0osY0FBYSxpQkFBaUIsRUFBRSxHQUFHUCxvQkFBb0IsZ0JBQWdCLEVBQUU7QUFBQSxnQkFDaEgsT0FBTyxFQUFFelEsTUFBTTtBQUFBLGdCQUNmLE9BQU8sR0FBR2hDLFFBQVF3RixLQUFLLE1BQU10QyxTQUFTSixVQUFVb1Esb0JBQW9CbFQsUUFBUWdLLFFBQVEsQ0FBQztBQUFBLGdCQUVyRjtBQUFBLHlDQUFDLFlBQU8sTUFBSyxVQUFTLGdCQUFjZ0osYUFBWSxTQUFTLE1BQU1ELFNBQVMsRUFBRTlPLE1BQU0sVUFBVSxDQUFDLEdBQ3pGO0FBQUEsMkNBQUMsVUFBTWtQLGlCQUFPclQsZUFBZSxDQUFDLEVBQUVzVCxTQUFTLEdBQUcsR0FBRyxLQUEvQztBQUFBO0FBQUE7QUFBQTtBQUFBLDJCQUFpRDtBQUFBLG9CQUFRcFQsUUFBUXdGO0FBQUFBLHVCQURuRTtBQUFBO0FBQUE7QUFBQTtBQUFBLHlCQUVBO0FBQUEsa0JBQ0NpRixzQkFBc0JsSSxjQUFjdkMsUUFBUXRCLEtBQUssdUJBQUMsWUFBUXdFO0FBQUFBLDZCQUFTbkYsS0FBS0UsSUFBSSxHQUFHZ1YsZUFBZSxDQUFDLENBQUM7QUFBQSxvQkFBRTtBQUFBLG9CQUFXL1AsU0FBUytQLFlBQVk7QUFBQSxvQkFBRTtBQUFBLHVCQUFuRjtBQUFBO0FBQUE7QUFBQTtBQUFBLHlCQUF5RixJQUFZO0FBQUEsa0JBQ3ZKO0FBQUEsb0JBQUM7QUFBQTtBQUFBLHNCQUNDLE1BQUs7QUFBQSxzQkFDTCxXQUFVO0FBQUEsc0JBQ1YsVUFBVWpULFFBQVE4TTtBQUFBQSxzQkFDbEIsY0FBWSxVQUFVOU0sUUFBUXdGLEtBQUs7QUFBQSxzQkFDbkMsT0FBT3hGLFFBQVE4TSxTQUFTLCtDQUErQyxrQkFBa0JwSixTQUFTOEYsbUJBQW1CLFdBQVcsV0FBVyxTQUFTO0FBQUEsc0JBQ3BKLGVBQWUsQ0FBQ2pELFVBQVU7QUFBRUEsOEJBQU1nRixlQUFlO0FBQUdoRiw4QkFBTTRHLGdCQUFnQjtBQUFHeUQsMkNBQW1CNVEsUUFBUXRCLElBQUlvQixZQUFZO0FBQUEsc0JBQUc7QUFBQSxzQkFDM0gsZUFBZSxDQUFDeUcsVUFBVXNKLG1CQUFtQnRKLE9BQU8sRUFBRWhFLFdBQVd2QyxRQUFRdEIsSUFBSW9CLGNBQWNpUSxjQUFjL1AsUUFBUXdGLE9BQU9zSCxRQUFROU0sUUFBUThNLE9BQU8sQ0FBQztBQUFBLHNCQUNoSixlQUFld0Q7QUFBQUEsc0JBQ2YsYUFBYUs7QUFBQUEsc0JBQ2IsaUJBQWlCQTtBQUFBQTtBQUFBQSxvQkFWbkI7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBLGtCQVVvQztBQUFBO0FBQUE7QUFBQSxjQW5CL0IzUSxRQUFRdEI7QUFBQUEsY0FEZjtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBLFlBc0JBO0FBQUEsVUFFSjtBQUNBLGNBQUk0VCxTQUFTLFVBQVU7QUFDckIsbUJBQ0UsdUJBQUMsU0FBSSxXQUFVLHFCQUFxQyxPQUFPLEVBQUV0USxNQUFNLEdBQ2pFO0FBQUEscUNBQUMsU0FBSSxXQUFVLDRCQUEyQixlQUFZLFFBQ25EaEMsa0JBQVFHLE9BQU9DLEtBQUsrUixNQUFNLENBQUMsRUFBRTFLLElBQUksQ0FBQ3ZILEtBQUtILGFBQWE7QUFDbkQsc0JBQU1zVCxVQUFVclQsUUFBUUcsT0FBT0MsS0FBS0wsUUFBUTtBQUM1QyxzQkFBTXNDLE9BQU9xUSxhQUFhVyxRQUFRaFQsRUFBRTtBQUNwQyxzQkFBTXFSLFFBQVFnQixhQUFheFMsSUFBSUcsRUFBRTtBQUNqQyx1QkFDRTtBQUFBLGtCQUFDO0FBQUE7QUFBQSxvQkFDQyxXQUFXdkIsa0JBQWtCdVUsU0FBU25ULEdBQUcsSUFBSSx1QkFBdUI7QUFBQSxvQkFFcEUsT0FBTyxFQUFFbUMsTUFBTSxHQUFHQSxJQUFJLEtBQUtMLE9BQU8sR0FBR2pFLEtBQUtFLElBQUksS0FBS3lULFFBQVFyUCxJQUFJLENBQUMsSUFBSTtBQUFBO0FBQUEsa0JBRC9ELEdBQUdyQyxRQUFRdEIsRUFBRSxnQkFBZ0JxQixRQUFRO0FBQUEsa0JBRjVDO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUEsZ0JBR3dFO0FBQUEsY0FHNUUsQ0FBQyxLQVpIO0FBQUE7QUFBQTtBQUFBO0FBQUEscUJBYUE7QUFBQSxjQUNDQyxRQUFRRyxPQUFPQyxLQUFLcUgsSUFBSSxDQUFDdkgsS0FBS0gsYUFBYTtBQUMxQyxzQkFBTXVULGVBQWV6Vyx1Q0FBdUNtRCxRQUFRRyxPQUFPQyxNQUFNTCxRQUFRO0FBQ3pGLHNCQUFNc08sUUFBUSxVQUFVck8sUUFBUXRCLEVBQUUsSUFBSXFCLFFBQVE7QUFDOUMsc0JBQU13VCxlQUFlLEVBQUV0UCxNQUFNLGNBQWMxQixXQUFXdkMsUUFBUXRCLElBQUlxQixTQUFTO0FBQzNFLHNCQUFNaVQsY0FBYVAscUJBQXFCL1AsVUFBVXVCLFNBQVMsZ0JBQWdCdkIsVUFBVTNDLGFBQWFBO0FBQ2xHLHNCQUFNd0YsV0FBVytOLGFBQWF4RztBQUM5Qix1QkFDRTtBQUFBLGtCQUFDO0FBQUE7QUFBQSxvQkFDQyxNQUFLO0FBQUEsb0JBRUwsV0FBVyxtQkFBbUJ2SCxXQUFXLGlCQUFpQixlQUFlLEdBQUd5TixjQUFhLGlCQUFpQixFQUFFLEdBQUd6SSxtQkFBbUI4RCxVQUFVQSxRQUFRLG9CQUFvQixFQUFFO0FBQUEsb0JBQzFLLE9BQU8sRUFBRWhNLE1BQU1zUSxjQUFjelMsSUFBSUcsRUFBRSxFQUFFO0FBQUEsb0JBQ3JDLE9BQU9rRixXQUNILDJCQUEyQm5DLG9CQUFvQmxELElBQUlHLEVBQUUsQ0FBQyx5QkFDdEQsaUJBQWlCK0Msb0JBQW9CbEQsSUFBSUcsRUFBRSxDQUFDO0FBQUEsb0JBQ2hELGNBQVksR0FBR2tGLFdBQVcsZUFBZSxFQUFFLGlCQUFpQm5DLG9CQUFvQmxELElBQUlHLEVBQUUsQ0FBQyxZQUFZTCxRQUFRd0YsS0FBSztBQUFBLG9CQUNoSCxnQkFBY3dOO0FBQUFBLG9CQUNkLGVBQWV6TixXQUFXaU8sU0FBWSxDQUFDak4sVUFBVXNHLGdCQUFnQnRHLE9BQU87QUFBQSxzQkFDdEV0QyxNQUFNO0FBQUEsc0JBQ05vSztBQUFBQSxzQkFDQXZCLFFBQVE7QUFBQSxzQkFDUnpNLElBQUlILElBQUlHO0FBQUFBLHNCQUNSUDtBQUFBQSxzQkFDQUM7QUFBQUEsc0JBQ0E0TyxnQkFBZ0IzTDtBQUFBQSxzQkFDaEJ3UDtBQUFBQSxzQkFDQXZQLFVBQVVILFVBQVVHLFlBQVl1UDtBQUFBQSxzQkFDaEMzUCxTQUFTRyxVQUFXaEMsT0FBT2QsSUFBSUcsRUFBRSxLQUFLeUMsVUFBVUcsWUFBWTtBQUFBLHNCQUM1RFAsV0FBVzZRO0FBQUFBLHNCQUNYN0UsYUFBYSxZQUFZTCxLQUFLO0FBQUEsb0JBQ2hDLENBQUM7QUFBQSxvQkFDRCxlQUFlOUksV0FBV2lPLFNBQVlwRjtBQUFBQSxvQkFDdEMsYUFBYTdJLFdBQVdpTyxTQUFZdEU7QUFBQUEsb0JBQ3BDLGlCQUFpQjNKLFdBQVdpTyxTQUFZdEU7QUFBQUEsb0JBQ3hDLFNBQVMsTUFBTVMsa0JBQWtCdEIsT0FBTyxNQUFNMEUsU0FBUyxFQUFFOU8sTUFBTSxjQUFjbEUsU0FBUyxHQUFHRyxJQUFJRyxFQUFFLENBQUM7QUFBQTtBQUFBLGtCQXpCM0ZnTztBQUFBQSxrQkFGUDtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBLGdCQTJCb0c7QUFBQSxjQUd4RyxDQUFDO0FBQUEsaUJBcERxQ3JPLFFBQVF0QixJQUFoRDtBQUFBO0FBQUE7QUFBQTtBQUFBLG1CQXFEQTtBQUFBLFVBRUo7QUFDQSxjQUFJNFQsU0FBUyxTQUFTO0FBQ3BCLGtCQUFNVSxjQUFhUCxxQkFBcUIvUCxVQUFVdUIsU0FBUztBQUMzRCxrQkFBTWdDLGFBQWFqRyxRQUFRa0UsTUFBTUMsU0FBUyxTQUFTbkUsUUFBUWtFLE1BQU1FLGFBQWFILFNBQVMsUUFDbkZqRSxRQUFRa0UsTUFBTUUsZUFDZDtBQUNKLG1CQUNFLHVCQUFDLFNBQUksV0FBVyxvQkFBb0I0TyxjQUFhLGlCQUFpQixFQUFFLElBQXFCLE9BQU8sRUFBRWhSLE1BQU0sR0FDdEc7QUFBQTtBQUFBLGdCQUFDO0FBQUE7QUFBQSxrQkFDQyxNQUFLO0FBQUEsa0JBQ0wsV0FBVywyQkFBMkJoQyxRQUFRa0UsTUFBTUMsU0FBUyxRQUFRLGNBQWMsRUFBRSxHQUFHNk8sY0FBYSxpQkFBaUIsRUFBRTtBQUFBLGtCQUN4SCxnQkFBY0E7QUFBQUEsa0JBQ2QsU0FBUyxNQUFNRCxTQUFTLEVBQUU5TyxNQUFNLFFBQVEsR0FBR2dDLGFBQWFBLFdBQVdDLE1BQU0sQ0FBQztBQUFBLGtCQUMxRWxHLGtCQUFRa0UsTUFBTUMsU0FBUyxRQUFRbkUsUUFBUWtFLE1BQU11UCxRQUFRck0sUUFBUSxPQUFPLEVBQUUsSUFBSTtBQUFBO0FBQUEsZ0JBTDVFO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQSxjQUt1RjtBQUFBLGNBQ3RGbkIsYUFBYSxDQUFDLFNBQVMsS0FBSyxFQUFFd0I7QUFBQUEsZ0JBQUksQ0FBQ3BELFNBQ2xDO0FBQUEsa0JBQUM7QUFBQTtBQUFBLG9CQUNDLE1BQUs7QUFBQSxvQkFFTCxXQUFXLG1DQUFtQzJPLGVBQWN0USxVQUFVNkIsWUFBWSxjQUFjRixJQUFJLEtBQUssaUJBQWlCLEVBQUU7QUFBQSxvQkFDNUgsT0FBTyxFQUFFaEMsTUFBTXVRLHNCQUFzQjNNLFdBQVc1QixJQUFJLENBQUMsRUFBRTtBQUFBLG9CQUN2RCxPQUFPLG9CQUFvQkEsSUFBSTtBQUFBLG9CQUMvQixjQUFZLEdBQUdyRSxRQUFRd0YsS0FBSyxxQkFBcUJuQixJQUFJO0FBQUEsb0JBQ3JELFNBQVMsTUFBTTBPLFNBQVMsRUFBRTlPLE1BQU0sU0FBU00sU0FBUyxjQUFjRixJQUFJLEdBQUcsR0FBRzRCLFdBQVc1QixJQUFJLENBQUM7QUFBQTtBQUFBLGtCQUxyRkE7QUFBQUEsa0JBRlA7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQSxnQkFPOEY7QUFBQSxjQUUvRixJQUFJO0FBQUEsaUJBakJzRXJFLFFBQVF0QixJQUFyRjtBQUFBO0FBQUE7QUFBQTtBQUFBLG1CQWtCQTtBQUFBLFVBRUo7QUFDQSxjQUFJNFQsU0FBUyxRQUFRO0FBQ25CLG1CQUNFO0FBQUEsY0FBQztBQUFBO0FBQUEsZ0JBQ0MsV0FBVyxvQkFBb0J0UyxRQUFRd0UsS0FBS00sbUJBQW1CLDZCQUE2QixFQUFFO0FBQUEsZ0JBRTlGLE9BQU8sRUFBRTlDLE1BQU07QUFBQSxnQkFDZixlQUFlZ1A7QUFBQUEsZ0JBQ2YsZUFBZU87QUFBQUEsZ0JBQ2YsYUFBYUM7QUFBQUEsZ0JBQ2IsaUJBQWlCQTtBQUFBQSxnQkFFZnhSO0FBQUFBLDJCQUFRd0UsS0FBS0MsUUFBUSxJQUFJZ0QsSUFBSSxDQUFDL0MsUUFBUTtBQUN0QywwQkFBTXNPLGNBQWFuSixtQkFBbUI1SyxLQUFLLENBQUN5TyxXQUFXQSxPQUFPbkwsY0FBY3ZDLFFBQVF0QixNQUFNZ1AsT0FBTzdJLFVBQVVILElBQUloRyxFQUFFO0FBQ2pILDBCQUFNZ1YsWUFBWWhSLFVBQVV1QixTQUFTLFNBQVN2QixVQUFVSCxjQUFjdkMsUUFBUXRCLE1BQU1nRSxVQUFVbUMsVUFBVUgsSUFBSWhHO0FBQzVHLDBCQUFNbVEsV0FBV3pTLDZCQUE2QnNJLEdBQUc7QUFDakQsMEJBQU00TyxlQUFleFcsaUNBQWlDNEgsR0FBRztBQUN6RCwwQkFBTTJKLFFBQVEsT0FBT3JPLFFBQVF0QixFQUFFLElBQUlnRyxJQUFJaEcsRUFBRTtBQUN6QywwQkFBTWlWLGVBQWUsRUFBRTFQLE1BQU0sT0FBTzFCLFdBQVd2QyxRQUFRdEIsSUFBSW1HLE9BQU9ILElBQUloRyxJQUFJNkYsU0FBUyxRQUFRO0FBQzNGLDJCQUNFO0FBQUEsc0JBQUM7QUFBQTtBQUFBLHdCQUNDLE1BQUs7QUFBQSx3QkFDTCxXQUFXLHVCQUF1QnNLLFFBQVEsR0FBR3lFLGFBQWF0VixRQUFRc1YsYUFBYXJWLE1BQU0saUJBQWlCLGVBQWUsR0FBRytVLGNBQWEsaUJBQWlCLEVBQUUsR0FBR1UsWUFBWSwwQkFBMEIsRUFBRTtBQUFBLHdCQUVuTSxtQkFBaUIxVCxRQUFRdEI7QUFBQUEsd0JBQ3pCLGVBQWFnRyxJQUFJaEc7QUFBQUEsd0JBQ2pCLE9BQU8sRUFBRTJELE1BQU15USxhQUFhcE8sSUFBSUUsSUFBSSxFQUFFO0FBQUEsd0JBQ3RDLGNBQVksR0FBR2lLLGFBQWEsYUFBYSxhQUFhLFNBQVMsWUFBWTlRLEtBQUswUyxNQUFNL0wsSUFBSUUsT0FBTyxHQUFHLENBQUMsT0FBT0YsSUFBSUYsSUFBSTtBQUFBLHdCQUNwSCxnQkFBY3dPO0FBQUFBLHdCQUNkLE9BQU8sR0FBR25FLGFBQWEsYUFBYSxhQUFhLFNBQVMscURBQXFEbkssSUFBSUYsSUFBSTtBQUFBLHdCQUN2SCxlQUFlLENBQUMrQixVQUFVc0csZ0JBQWdCdEcsT0FBTztBQUFBLDBCQUMvQ3RDLE1BQU07QUFBQSwwQkFDTm9LO0FBQUFBLDBCQUNBdkIsUUFBUXdHLGFBQWF0VixRQUFRc1YsYUFBYXJWO0FBQUFBLDBCQUMxQ0QsS0FBS3NWLGFBQWF0VjtBQUFBQSwwQkFDbEJDLEtBQUtxVixhQUFhclY7QUFBQUEsMEJBQ2xCb0MsSUFBSXFFLElBQUlFO0FBQUFBLDBCQUNSOUU7QUFBQUEsMEJBQ0ErRSxPQUFPSCxJQUFJaEc7QUFBQUEsMEJBQ1hpUSxnQkFBZ0IzTDtBQUFBQSwwQkFDaEJ3UDtBQUFBQSwwQkFDQXZQLFVBQVVILFVBQVVHLFlBQVl1UDtBQUFBQSwwQkFDaEMzUCxTQUFTRyxVQUFXaEMsT0FBTzBELElBQUlFLElBQUksS0FBSzlCLFVBQVVHLFlBQVk7QUFBQSwwQkFDOURQLFdBQVdpUjtBQUFBQSwwQkFDWGpGLGFBQWEsWUFBWUwsS0FBSztBQUFBLHdCQUNoQyxDQUFDO0FBQUEsd0JBQ0QsZUFBZUQ7QUFBQUEsd0JBQ2YsYUFBYWM7QUFBQUEsd0JBQ2IsaUJBQWlCQTtBQUFBQSx3QkFDakIsV0FBVyxDQUFDM0ksVUFBVTtBQUNwQiw4QkFBSUEsTUFBTW9ILFlBQVlwSCxNQUFNcU4sU0FBUyxTQUFTO0FBQzVDck4sa0NBQU1nRixlQUFlO0FBQ3JCLGtDQUFNK0IsZ0JBQWdCM1AsaUNBQWlDaUksTUFBTXlHLFlBQVksRUFBRTNKLFdBQVdpUixZQUFZO0FBQ2xHL04sa0NBQU1ZLGFBQWE4RyxhQUFhO0FBQ2hDMUgsa0NBQU1hLGFBQWEsRUFBRUMsT0FBTyxZQUFZQyxTQUFTLE9BQU85RCxTQUFTRyxVQUFXaEMsT0FBTzBELElBQUlFLElBQUksS0FBSzlCLFVBQVVHLFlBQVksR0FBSSxDQUFDO0FBQUEsMEJBQzdIO0FBQUEsd0JBQ0Y7QUFBQSx3QkFDQSxTQUFTLE1BQU0wTSxrQkFBa0J0QixPQUFPLE1BQU07QUFDNUN6SSxnQ0FBTWEsYUFBYSxFQUFFQyxPQUFPLFlBQVlDLFNBQVMsT0FBTzlELFNBQVNHLFVBQVdoQyxPQUFPMEQsSUFBSUUsSUFBSSxLQUFLOUIsVUFBVUcsWUFBWSxHQUFJLENBQUM7QUFBQSx3QkFDN0gsQ0FBQztBQUFBO0FBQUEsc0JBcENJeUIsSUFBSWhHO0FBQUFBLHNCQUhYO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUEsb0JBdUNLO0FBQUEsa0JBR1QsQ0FBQztBQUFBLGtCQUNBc0IsUUFBUXdFLEtBQUtNLG9CQUFvQixNQUFNO0FBQ3RDLDBCQUFNMkosU0FBU3pPLFFBQVF3RSxLQUFLTTtBQUM1QiwwQkFBTStPLFdBQVdwRixPQUFPdkksTUFBTXVJLE9BQU8xSjtBQUNyQywwQkFBTStPLFNBQVNyRixPQUFPMUosUUFBUzhPLFdBQVc7QUFDMUMsMEJBQU1iLGNBQWFQLHFCQUFxQi9QLFVBQVV1QixTQUFTO0FBQzNELDBCQUFNb0ssUUFBUSxxQkFBcUJyTyxRQUFRdEIsRUFBRSxJQUFJK1AsT0FBTy9QLEVBQUU7QUFDMUQsMEJBQU1xVixrQkFBa0IsRUFBRTlQLE1BQU0scUJBQXFCMUIsV0FBV3ZDLFFBQVF0QixHQUFHO0FBQzNFLDJCQUNFO0FBQUEsc0JBQUM7QUFBQTtBQUFBLHdCQUNDLE1BQUs7QUFBQSx3QkFDTCxXQUFXLDhDQUE4Q3NVLGNBQWEsaUJBQWlCLEVBQUU7QUFBQSx3QkFDekYsT0FBTyxFQUFFM1EsTUFBTXVRLHNCQUFzQm5FLE9BQU8xSixLQUFLLEdBQUcvQyxPQUFPNlEsbUJBQW1CcEUsT0FBTzFKLE9BQU8wSixPQUFPdkksR0FBRyxFQUFFO0FBQUEsd0JBQ3hHLGNBQVksMEJBQTBCbkksS0FBSzBTLE1BQU1oQyxPQUFPMUosUUFBUSxHQUFHLENBQUMsUUFBUWhILEtBQUswUyxNQUFNaEMsT0FBT3ZJLE1BQU0sR0FBRyxDQUFDO0FBQUEsd0JBQ3hHLGdCQUFjOE07QUFBQUEsd0JBQ2QsT0FBTTtBQUFBLHdCQUNOLGVBQWUsQ0FBQ3pNLFVBQVVzRyxnQkFBZ0J0RyxPQUFPO0FBQUEsMEJBQy9DdEMsTUFBTTtBQUFBLDBCQUNOb0s7QUFBQUEsMEJBQ0F2QixRQUFRO0FBQUEsMEJBQ1I5TyxLQUFLNlYsV0FBVztBQUFBLDBCQUNoQjVWLEtBQUtNLHdCQUF5QnNWLFdBQVc7QUFBQSwwQkFDekN4VCxJQUFJeVQ7QUFBQUEsMEJBQ0poVTtBQUFBQSwwQkFDQTZPLGdCQUFnQjNMO0FBQUFBLDBCQUNoQndQO0FBQUFBLDBCQUNBdlAsVUFBVUgsVUFBVUcsWUFBWXVQO0FBQUFBLDBCQUNoQzNQLFNBQVNHLFVBQVc4USxVQUFVaFIsVUFBVUcsWUFBWTtBQUFBLDBCQUNwRFAsV0FBV3FSO0FBQUFBLDBCQUNYckYsYUFBYSxZQUFZTCxLQUFLO0FBQUEsd0JBQ2hDLENBQUM7QUFBQSx3QkFDRCxlQUFlRDtBQUFBQSx3QkFDZixhQUFhYztBQUFBQSx3QkFDYixpQkFBaUJBO0FBQUFBLHdCQUNqQixTQUFTLE1BQU1TLGtCQUFrQnRCLE9BQU8sTUFBTTBFLFNBQVMsRUFBRTlPLE1BQU0sb0JBQW9CLEdBQUd3SyxPQUFPMUosS0FBSyxDQUFDO0FBQUEsd0JBQUU7QUFBQTtBQUFBLHNCQXpCdkc7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBLG9CQTBCa0I7QUFBQSxrQkFFdEIsR0FBRyxJQUFJO0FBQUEsbUJBQ0wvRSxRQUFRd0UsS0FBS2tELFVBQVUsSUFBSXBILFNBQzNCLHVCQUFDLFlBQU8sTUFBSyxVQUFTLFdBQVcsOEJBQThCbVMscUJBQXFCL1AsVUFBVXVCLFNBQVMsWUFBWSxpQkFBaUIsRUFBRSxJQUFJLFNBQVMsTUFBTThPLFNBQVMsRUFBRTlPLE1BQU0sVUFBVSxDQUFDLEdBQUU7QUFBQTtBQUFBLG9CQUN6S2pFLFFBQVF3RSxLQUFLa0QsT0FBT3BIO0FBQUFBLG9CQUFPO0FBQUEsdUJBRHpDO0FBQUE7QUFBQTtBQUFBO0FBQUEseUJBRUEsSUFDRTtBQUFBO0FBQUE7QUFBQSxjQW5HQ04sUUFBUXRCO0FBQUFBLGNBRmY7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQSxZQXNHQTtBQUFBLFVBRUo7QUFDQSxnQkFBTXNVLGFBQWFQLHFCQUFxQi9QLFVBQVV1QixTQUFTO0FBQzNELGdCQUFNK1AsYUFBYWhVLFFBQVFnRixhQUFhZixTQUFTLFNBQVNqRSxRQUFRZ0YsWUFBWUUsa0JBQWtCO0FBQ2hHLGlCQUNFLHVCQUFDLFNBQUksV0FBVyxvQkFBb0I4TixhQUFhLGlCQUFpQixFQUFFLElBQXFCLE9BQU8sRUFBRWhSLE1BQU0sR0FDdEc7QUFBQTtBQUFBLGNBQUM7QUFBQTtBQUFBLGdCQUNDLE1BQUs7QUFBQSxnQkFDTCxXQUFXLGlDQUFpQ2hDLFFBQVFnRixhQUFhZixTQUFTLFNBQVMsb0JBQW9CLEVBQUUsR0FBRytPLGFBQWEsaUJBQWlCLEVBQUU7QUFBQSxnQkFDNUksZ0JBQWNBO0FBQUFBLGdCQUNkLFNBQVMsTUFBTUQsU0FBUyxFQUFFOU8sTUFBTSxjQUFjLEdBQUcrUCxjQUFjLENBQUM7QUFBQSxnQkFDaEVoVSxrQkFBUWdGLGFBQWFmLFNBQVMsU0FBU2pFLFFBQVFnRixZQUFZZixPQUFPO0FBQUE7QUFBQSxjQUxwRTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUEsWUFLdUU7QUFBQSxZQUN0RWpELE9BQU9pRSxTQUFTK08sVUFBVSxJQUN6QjtBQUFBLGNBQUM7QUFBQTtBQUFBLGdCQUNDLE1BQUs7QUFBQSxnQkFDTCxXQUFXLHlDQUF5Q2hCLGNBQWN0USxVQUFVNkIsWUFBWSxlQUFlLGlCQUFpQixFQUFFO0FBQUEsZ0JBQzFILE9BQU8sRUFBRWxDLE1BQU1zUSxjQUFjcUIsVUFBVSxFQUFFO0FBQUEsZ0JBQ3pDLE9BQU07QUFBQSxnQkFDTixjQUFZLEdBQUdoVSxRQUFRd0YsS0FBSztBQUFBLGdCQUM1QixTQUFTLE1BQU11TixTQUFTLEVBQUU5TyxNQUFNLGVBQWVNLFNBQVMsYUFBYSxHQUFHeVAsVUFBVTtBQUFBO0FBQUEsY0FOcEY7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBLFlBTXNGLElBRXBGO0FBQUEsZUFoQnVFaFUsUUFBUXRCLElBQXJGO0FBQUE7QUFBQTtBQUFBO0FBQUEsaUJBaUJBO0FBQUEsUUFFSixDQUFDLEtBMVFrRTRULE1BQXJFO0FBQUE7QUFBQTtBQUFBO0FBQUEsZUEyUUE7QUFBQSxNQUNDO0FBQUEsU0ExUkg7QUFBQTtBQUFBO0FBQUE7QUFBQSxXQTJSQSxLQTVSRjtBQUFBO0FBQUE7QUFBQTtBQUFBLFdBNlJBO0FBQUEsT0FqU0Y7QUFBQTtBQUFBO0FBQUE7QUFBQSxTQWtTQTtBQUVKO0FBQUMxSSxHQWpwQlFELFVBQVE7QUFBQSxNQUFSQTtBQW1wQlQsU0FBU3NLLGtCQUFrQixFQUFFck8sT0FBT2xDLFNBQVMsR0FBRztBQUM5QyxRQUFNd1EsZUFBZUEsQ0FBQ0MsT0FBT2pVLEtBQUtwQyxVQUFVOEgsTUFBTUMsT0FBTyxVQUFVM0YsR0FBRyxJQUFJLENBQUM0RixVQUFVO0FBQ25GLFFBQUlxTyxVQUFVLFdBQVlyTyxPQUFNc08sUUFBUWxVLEdBQUcsSUFBSXBDO0FBQUFBLFNBQzFDO0FBQ0gsWUFBTXVXLFlBQVlGLFVBQVUsYUFBYSxrQkFBa0JBO0FBQzNEck8sWUFBTXNPLFFBQVFDLFNBQVMsRUFBRW5VLEdBQUcsSUFBSXBDO0FBQUFBLElBQ2xDO0FBQUEsRUFDRixHQUFHLEVBQUU0USxhQUFhLFVBQVV5RixLQUFLLElBQUlqVSxHQUFHLEdBQUcsQ0FBQztBQUM1QyxTQUNFLG1DQUNFO0FBQUEsMkJBQUMsWUFBTztBQUFBLDZCQUFDLFVBQUssd0JBQU47QUFBQTtBQUFBO0FBQUE7QUFBQSxhQUFjO0FBQUEsTUFBTyx1QkFBQyxZQUFPLCtCQUFSO0FBQUE7QUFBQTtBQUFBO0FBQUEsYUFBdUI7QUFBQSxTQUFwRDtBQUFBO0FBQUE7QUFBQTtBQUFBLFdBQTZEO0FBQUEsSUFDNUQ5RSxnQ0FBZ0NxTTtBQUFBQSxNQUFJLENBQUMwTSxVQUNwQyx1QkFBQyxhQUFRLE1BQUksTUFDWDtBQUFBLCtCQUFDLGFBQVNBLGdCQUFNM08sU0FBaEI7QUFBQTtBQUFBO0FBQUE7QUFBQSxlQUFzQjtBQUFBLFFBQ3JCMk8sTUFBTXpWLE9BQU8sZUFBZSx1QkFBQyxPQUFFLFdBQVUscUJBQW9CLHVOQUFqQztBQUFBO0FBQUE7QUFBQTtBQUFBLGVBQXdPLElBQU87QUFBQSxRQUMzUXlWLE1BQU16VixPQUFPLG9CQUFvQix1QkFBQyxPQUFFLFdBQVUscUJBQW9CLGdMQUFqQztBQUFBO0FBQUE7QUFBQTtBQUFBLGVBQWlNLElBQU87QUFBQSxRQUN6T3lWLE1BQU1HLFNBQVM3TSxJQUFJLENBQUNoSixZQUFZO0FBQy9CLGdCQUFNZSxTQUFTMlUsTUFBTXpWLE9BQU8sYUFDeEJnRixTQUFTN0QsU0FBU3VVLFVBQ2xCMVEsU0FBUzdELFNBQVN1VSxRQUFRRCxNQUFNelYsT0FBTyxhQUFhLGtCQUFrQnlWLE1BQU16VixFQUFFO0FBQ2xGLGlCQUNFO0FBQUEsWUFBQztBQUFBO0FBQUEsY0FFQyxPQUFPRCxRQUFRK0c7QUFBQUEsY0FDZixPQUFPaEcsT0FBT2YsUUFBUUMsRUFBRTtBQUFBLGNBQ3hCLEtBQUtELFFBQVFUO0FBQUFBLGNBQ2IsS0FBS1MsUUFBUVI7QUFBQUEsY0FDYixNQUFNUSxRQUFRa0s7QUFBQUEsY0FDZCxNQUFNbEssUUFBUW9LO0FBQUFBLGNBQ2QsVUFBVSxDQUFDL0ssVUFBVW9XLGFBQWFDLE1BQU16VixJQUFJRCxRQUFRQyxJQUFJWixLQUFLO0FBQUE7QUFBQSxZQVB4RFcsUUFBUUM7QUFBQUEsWUFEZjtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBLFVBUWlFO0FBQUEsUUFHckUsQ0FBQztBQUFBLFdBcEJnQnlWLE1BQU16VixJQUF6QjtBQUFBO0FBQUE7QUFBQTtBQUFBLGFBcUJBO0FBQUEsSUFDRDtBQUFBLE9BekJIO0FBQUE7QUFBQTtBQUFBO0FBQUEsU0EwQkE7QUFFSjtBQUFDNlYsTUFyQ1FOO0FBdUNULFNBQVNPLGlCQUFpQixFQUFFNU8sT0FBT2xDLFVBQVUxRCxRQUFRLEdBQUc7QUFDdEQsUUFBTUYsZUFBZXdDLGdCQUFnQm9CLFNBQVM3RCxVQUFVRyxRQUFRdEIsRUFBRTtBQUNsRSxRQUFNK1Ysa0JBQWtCL1EsU0FBU0MsY0FBYzFELFdBQVdILFlBQVk7QUFDdEUsUUFBTTRVLG9CQUFvQmhSLFNBQVM4RixtQkFBbUIsV0FBVyxtQkFBbUI7QUFDcEYsUUFBTW1MLGVBQWUzVCxPQUFPaEIsUUFBUTBVLGlCQUFpQixDQUFDO0FBQ3RELFFBQU1FLGlCQUFpQjVULE9BQU95VCxpQkFBaUJ2QixvQkFBb0J5QixZQUFZO0FBQy9FLFFBQU1FLHVCQUF1QkQsaUJBQWlCRCxlQUFlO0FBQzdELFFBQU05RCxrQkFBa0JuTixTQUFTb04saUJBQWlCN1EsU0FBU3pCLEtBQUssQ0FBQ3VFLFNBQVNBLEtBQUtyRSxPQUFPc0IsUUFBUXRCLEVBQUU7QUFDaEcsUUFBTW9XLFNBQVNBLENBQUN0UCxPQUFPdVAsUUFBUXJHLGNBQWMsU0FBUzlJLE1BQU1DLE9BQU9MLE9BQU8sQ0FBQ00sVUFBVTtBQUNuRmlQLFdBQU9qUCxNQUFNN0YsU0FBU0gsWUFBWSxDQUFDO0FBQUEsRUFDckMsR0FBRyxFQUFFNE8sYUFBYWhNLFdBQVdnQixTQUFTaEIsVUFBVSxDQUFDO0FBQ2pELFFBQU15RixPQUFPQSxDQUFDdEIsY0FBY2pCLE1BQU1DLE9BQU8sbUJBQW1CLENBQUNDLFVBQVU7QUFDckUsVUFBTWtQLFVBQVVsVixlQUFlK0c7QUFDL0IsUUFBSW1PLFVBQVUsS0FBS0EsV0FBV2xQLE1BQU03RixTQUFTSyxPQUFRO0FBQ3JELFVBQU0sQ0FBQzJOLEtBQUssSUFBSW5JLE1BQU03RixTQUFTOEYsT0FBT2pHLGNBQWMsQ0FBQztBQUNyRGdHLFVBQU03RixTQUFTOEYsT0FBT2lQLFNBQVMsR0FBRy9HLEtBQUs7QUFDdkNuRyx5QkFBcUJoQyxPQUFPcEkscUNBQXFDb0ksS0FBSyxDQUFDO0FBQUEsRUFDekUsR0FBRyxFQUFFcEQsV0FBVyxFQUFFdUIsTUFBTSxXQUFXMUIsV0FBV3ZDLFFBQVF0QixHQUFHLEVBQUUsQ0FBQztBQUM1RCxRQUFNdVcsWUFBWUEsTUFBTTtBQUN0QixVQUFNQyxTQUFTdFksK0JBQStCLEVBQUVpRCxVQUFVNkQsU0FBUzdELFVBQVUwQyxXQUFXdkMsUUFBUXRCLEdBQUcsQ0FBQztBQUNwRyxRQUFJLENBQUN3VyxPQUFPNUksT0FBTztBQUNqQjFHLFlBQU1TLGFBQWEsRUFBRVgsU0FBU3dQLE9BQU8zSSxVQUFVLHFDQUFxQyxDQUFDO0FBQ3JGO0FBQUEsSUFDRjtBQUNBM0csVUFBTUMsT0FBTyxxQkFBcUIsQ0FBQ0MsVUFBVWdDLHFCQUFxQmhDLE9BQU9vUCxPQUFPclYsUUFBUSxHQUFHO0FBQUEsTUFDekY2QyxXQUFXd1MsT0FBT3hTO0FBQUFBLElBQ3BCLENBQUM7QUFBQSxFQUNIO0FBRUEsU0FDRSxtQ0FDRTtBQUFBLDJCQUFDLFlBQU87QUFBQSw2QkFBQyxVQUFLO0FBQUE7QUFBQSxRQUFTeVEsT0FBT3JULGVBQWUsQ0FBQyxFQUFFc1QsU0FBUyxHQUFHLEdBQUc7QUFBQSxXQUF2RDtBQUFBO0FBQUE7QUFBQTtBQUFBLGFBQXlEO0FBQUEsTUFBTyx1QkFBQyxZQUFRcFQsa0JBQVF3RixTQUFqQjtBQUFBO0FBQUE7QUFBQTtBQUFBLGFBQXVCO0FBQUEsU0FBL0Y7QUFBQTtBQUFBO0FBQUE7QUFBQSxXQUF3RztBQUFBLElBQ3ZHeEYsUUFBUThNLFNBQVMsdUJBQUMsU0FBSSxXQUFVLHFCQUFvQjtBQUFBLDZCQUFDLGVBQVksZUFBWSxVQUF6QjtBQUFBO0FBQUE7QUFBQTtBQUFBLGFBQStCO0FBQUEsTUFBRyx1QkFBQyxVQUFLLG1HQUFOO0FBQUE7QUFBQTtBQUFBO0FBQUEsYUFBeUY7QUFBQSxNQUFPLHVCQUFDLFlBQU8sTUFBSyxVQUFTLFNBQVMsTUFBTWdJLE9BQU8sNEJBQTRCLENBQUNoUCxVQUFVO0FBQUVBLGNBQU1nSCxTQUFTO0FBQUEsTUFBTyxDQUFDLEdBQUcsK0JBQS9HO0FBQUE7QUFBQTtBQUFBO0FBQUEsYUFBOEg7QUFBQSxTQUFuUztBQUFBO0FBQUE7QUFBQTtBQUFBLFdBQTRTLElBQVM7QUFBQSxJQUN2VSx1QkFBQyxTQUFJLFdBQVUsK0JBQ2I7QUFBQSw2QkFBQyxZQUFPLE1BQUssVUFBUyxVQUFVOU0sUUFBUThNLFVBQVVoTixpQkFBaUIsR0FBRyxTQUFTLE1BQU1xSSxLQUFLLEVBQUUsR0FBRyw0QkFBL0Y7QUFBQTtBQUFBO0FBQUE7QUFBQSxhQUEyRztBQUFBLE1BQzNHLHVCQUFDLFlBQU8sTUFBSyxVQUFTLFVBQVVuSSxRQUFROE0sVUFBVWhOLGlCQUFpQjRELFNBQVM3RCxTQUFTSSxTQUFTSyxTQUFTLEdBQUcsU0FBUyxNQUFNNkgsS0FBSyxDQUFDLEdBQUcsMEJBQWxJO0FBQUE7QUFBQTtBQUFBO0FBQUEsYUFBNEk7QUFBQSxNQUM1SSx1QkFBQyxZQUFPLE1BQUssVUFBUyxVQUFVbkksUUFBUThNLFVBQVU5TSxRQUFRaUUsU0FBUyxVQUFVLFNBQVNnUixXQUFXLHlCQUFqRztBQUFBO0FBQUE7QUFBQTtBQUFBLGFBQTBHO0FBQUEsU0FINUc7QUFBQTtBQUFBO0FBQUE7QUFBQSxXQUlBO0FBQUEsSUFDQSx1QkFBQyxZQUFTLE9BQU0sZ0JBQWUsaUNBQUMsV0FBTSxPQUFPalYsUUFBUXdGLE9BQU8sVUFBVSxDQUFDZSxVQUFVdU8sT0FBTyxrQkFBa0IsQ0FBQ2hQLFVBQVU7QUFBRUEsWUFBTU4sUUFBUWUsTUFBTS9HLE9BQU8xQjtBQUFBQSxJQUFPLEdBQUcsV0FBV2tDLFFBQVF0QixFQUFFLFFBQVEsS0FBMUo7QUFBQTtBQUFBO0FBQUE7QUFBQSxXQUE0SixLQUEzTDtBQUFBO0FBQUE7QUFBQTtBQUFBLFdBQThMO0FBQUEsSUFDOUwsdUJBQUMsWUFBUyxPQUFNLGFBQVk7QUFBQSw2QkFBQyxXQUFNLE9BQU9zQixRQUFRdEIsSUFBSSxVQUFRLFFBQWxDO0FBQUE7QUFBQTtBQUFBO0FBQUEsYUFBa0M7QUFBQSxNQUFHLHVCQUFDLFdBQU0sZ0ZBQVA7QUFBQTtBQUFBO0FBQUE7QUFBQSxhQUF1RTtBQUFBLFNBQXhJO0FBQUE7QUFBQTtBQUFBO0FBQUEsV0FBZ0o7QUFBQSxJQUNoSix1QkFBQyxZQUFTLE9BQU0sUUFDZCxpQ0FBQyxZQUFPLE9BQU9zQixRQUFRaUUsTUFBTSxVQUFVakUsUUFBUWlFLFNBQVMsVUFBVSxVQUFVLENBQUNzQyxVQUFVdU8sT0FBTyx1QkFBdUIsQ0FBQ2hQLFVBQVU7QUFBRUEsWUFBTTdCLE9BQU9zQyxNQUFNL0csT0FBTzFCO0FBQUFBLElBQU8sQ0FBQyxHQUNsSztBQUFBLDZCQUFDLFlBQU8sT0FBTSxXQUFVLHVCQUF4QjtBQUFBO0FBQUE7QUFBQTtBQUFBLGFBQStCO0FBQUEsTUFBUyx1QkFBQyxZQUFPLE9BQU0sYUFBWSx5QkFBMUI7QUFBQTtBQUFBO0FBQUE7QUFBQSxhQUFtQztBQUFBLE1BQVMsdUJBQUMsWUFBTyxPQUFNLFVBQVMsc0JBQXZCO0FBQUE7QUFBQTtBQUFBO0FBQUEsYUFBNkI7QUFBQSxTQURuSDtBQUFBO0FBQUE7QUFBQTtBQUFBLFdBRUEsS0FIRjtBQUFBO0FBQUE7QUFBQTtBQUFBLFdBSUE7QUFBQSxJQUNBLHVCQUFDLGFBQVEsTUFBSSxNQUNYO0FBQUEsNkJBQUMsYUFBUSw4QkFBVDtBQUFBO0FBQUE7QUFBQTtBQUFBLGFBQXVCO0FBQUEsTUFDdkIsdUJBQUMsWUFBUyxPQUFNLGlCQUFnQixpQ0FBQyxZQUFPLFdBQVUsd0JBQXdCb0YsbUJBQVNuRixLQUFLRSxJQUFJLEdBQUcwVyxlQUFlLENBQUMsQ0FBQyxLQUFoRjtBQUFBO0FBQUE7QUFBQTtBQUFBLGFBQWtGLEtBQWxIO0FBQUE7QUFBQTtBQUFBO0FBQUEsYUFBMkg7QUFBQSxNQUMzSCx1QkFBQyxZQUFTLE9BQU0sZ0JBQWUsaUNBQUMsWUFBTyxXQUFVLHdCQUF3QnpSLG1CQUFTeVIsWUFBWSxLQUEvRDtBQUFBO0FBQUE7QUFBQTtBQUFBLGFBQWlFLEtBQWhHO0FBQUE7QUFBQTtBQUFBO0FBQUEsYUFBeUc7QUFBQSxNQUN6Ryx1QkFBQyxrQkFBZSxPQUFNLGtCQUFpQixPQUFPM1UsUUFBUWdLLFVBQVUsS0FBSyxHQUFHLEtBQUssR0FBRyxNQUFNLE1BQU0sTUFBSyxNQUFLLFVBQVUsQ0FBQ2xNLFVBQVVnWCxPQUFPLGlDQUFpQyxDQUFDaFAsVUFBVTtBQUFFQSxjQUFNa0UsV0FBV2xNO0FBQUFBLE1BQU8sR0FBRyxXQUFXa0MsUUFBUXRCLEVBQUUsU0FBUyxLQUF6TztBQUFBO0FBQUE7QUFBQTtBQUFBLGFBQTJPO0FBQUEsTUFDM08sdUJBQUMsa0JBQWUsT0FBTSxpQkFBZ0IsT0FBT3NCLFFBQVFtVixnQkFBZ0IsS0FBSyxHQUFHLEtBQUssR0FBRyxNQUFNLE1BQU0sTUFBSyxNQUFLLFVBQVUsQ0FBQ3JYLFVBQVVnWCxPQUFPLGdDQUFnQyxDQUFDaFAsVUFBVTtBQUFFQSxjQUFNcVAsaUJBQWlCclg7QUFBQUEsTUFBTyxHQUFHLFdBQVdrQyxRQUFRdEIsRUFBRSxTQUFTLEtBQW5QO0FBQUE7QUFBQTtBQUFBO0FBQUEsYUFBcVA7QUFBQSxNQUNyUCx1QkFBQyxZQUFTLE9BQU0sbUJBQWtCLGlDQUFDLFlBQU8sV0FBVSx3QkFBd0J3RSxtQkFBUzBSLGNBQWMsS0FBakU7QUFBQTtBQUFBO0FBQUE7QUFBQSxhQUFtRSxLQUFyRztBQUFBO0FBQUE7QUFBQTtBQUFBLGFBQThHO0FBQUEsTUFDN0dDLHVCQUF1Qix1QkFBQyxPQUFFLFdBQVUsK0JBQThCO0FBQUE7QUFBQSxRQUFvRDNSLFNBQVMwUixjQUFjO0FBQUEsUUFBRTtBQUFBLFdBQXhIO0FBQUE7QUFBQTtBQUFBO0FBQUEsYUFBeUksSUFBTztBQUFBLE1BQ3hLO0FBQUEsUUFBQztBQUFBO0FBQUEsVUFDQyxNQUFLO0FBQUEsVUFDTCxXQUFVO0FBQUEsVUFDVixVQUFVLENBQUMvRCxtQkFBbUJBLGdCQUFnQjZELGlCQUFpQixNQUFNMVUsUUFBUTBVLGlCQUFpQjtBQUFBLFVBQzlGLFNBQVMsTUFBTUksT0FBTyxnQ0FBZ0MsQ0FBQ2hQLFVBQVU7QUFBRUEsa0JBQU00TyxpQkFBaUIsSUFBSTdELGdCQUFnQjZELGlCQUFpQjtBQUFBLFVBQUcsQ0FBQztBQUFBLFVBQUU7QUFBQTtBQUFBLFlBQy9IaFIsU0FBUzhGLG1CQUFtQixXQUFXLFdBQVc7QUFBQSxZQUFVO0FBQUE7QUFBQTtBQUFBLFFBTHBFO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQSxNQUsyRTtBQUFBLFNBYjdFO0FBQUE7QUFBQTtBQUFBO0FBQUEsV0FjQTtBQUFBLElBQ0N4SixRQUFRaUUsU0FBUyxjQUFjLHVCQUFDLG1CQUFnQixPQUFjLFVBQW9CLFdBQW5EO0FBQUE7QUFBQTtBQUFBO0FBQUEsV0FBb0UsSUFBTTtBQUFBLElBQ3pHakUsUUFBUWlFLFNBQVMsY0FDaEI7QUFBQSxNQUFDO0FBQUE7QUFBQSxRQUNDLE1BQUs7QUFBQSxRQUNMLFdBQVU7QUFBQSxRQUNWLFNBQVMsTUFBTTtBQUNiLGdCQUFNbVIsUUFBUXpTLGlCQUFpQmUsU0FBU0MsY0FBYzNELFNBQVMwRCxTQUFTcUQsVUFBVWxFLE9BQU87QUFDekYsZ0JBQU1uRSxLQUFLMkksT0FBTzNELFNBQVM3RCxVQUFVLEdBQUdHLFFBQVF0QixFQUFFLFlBQVk7QUFDOUQsZ0JBQU0yVyxRQUFRdFgsS0FBS0MsSUFBSSxNQUFNRCxLQUFLRSxJQUFJLE1BQU1SLGdDQUFnQzJYLEtBQUssQ0FBQyxDQUFDO0FBQ25GTixpQkFBTyxnQkFBZ0IsQ0FBQ2hQLFVBQVU7QUFDaENBLGtCQUFNdEIsS0FBS0MsU0FBUztBQUNwQnFCLGtCQUFNdEIsS0FBS0MsS0FBS1YsS0FBSyxFQUFFckYsSUFBSThGLE1BQU0sNEJBQTRCNEQsT0FBT2lOLFFBQVEsTUFBTXpRLE1BQU15USxPQUFPaE4sTUFBTWdOLFFBQVEsTUFBTUMsUUFBUSx1QkFBdUJDLFFBQVEsRUFBRXBSLE1BQU0sVUFBVSxFQUFFLENBQUM7QUFDL0syQixrQkFBTXRCLEtBQUtDLEtBQUtVLEtBQUssQ0FBQ0MsR0FBR0MsTUFBTUQsRUFBRVIsT0FBT1MsRUFBRVQsSUFBSTtBQUFBLFVBQ2hELENBQUM7QUFDRGdCLGdCQUFNWSxhQUFhLEVBQUV2QyxNQUFNLE9BQU8xQixXQUFXdkMsUUFBUXRCLElBQUltRyxPQUFPbkcsSUFBSTZGLFNBQVMsUUFBUSxDQUFDO0FBQUEsUUFDeEY7QUFBQSxRQUFFO0FBQUE7QUFBQSxNQWJKO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQSxJQWN5QixJQUN2QjtBQUFBLE9BL0NOO0FBQUE7QUFBQTtBQUFBO0FBQUEsU0FnREE7QUFFSjtBQUFDaVIsTUFoRlFoQjtBQWtGVCxTQUFTaUIsZ0JBQWdCLEVBQUU3UCxPQUFPbEMsVUFBVTFELFFBQVEsR0FBRztBQUNyRCxRQUFNRixlQUFld0MsZ0JBQWdCb0IsU0FBUzdELFVBQVVHLFFBQVF0QixFQUFFO0FBQ2xFLFFBQU1nWCxjQUFjQSxDQUFDQyxZQUFZelcsT0FBT3BCLFVBQVU4SCxNQUFNQyxPQUFPLHVCQUF1QixDQUFDQyxVQUFVO0FBQy9GQSxVQUFNN0YsU0FBU0gsWUFBWSxFQUFFMEUsS0FBS2tELE9BQU9pTyxVQUFVLEVBQUV6VyxLQUFLLElBQUlwQjtBQUFBQSxFQUNoRSxHQUFHLEVBQUU0USxhQUFhLFNBQVMxTyxRQUFRdEIsRUFBRSxJQUFJaVgsVUFBVSxJQUFJelcsS0FBSyxJQUFJd0QsV0FBV2dCLFNBQVNoQixVQUFVLENBQUM7QUFDL0YsUUFBTWtULGlCQUFpQkEsQ0FBQ0QsWUFBWUUsZUFBZTNXLE9BQU9wQixVQUFVOEgsTUFBTUMsT0FBTyw0QkFBNEIsQ0FBQ0MsVUFBVTtBQUN0SEEsVUFBTTdGLFNBQVNILFlBQVksRUFBRTBFLEtBQUtrRCxPQUFPaU8sVUFBVSxFQUFFRyxTQUFTRCxhQUFhLEVBQUUzVyxLQUFLLElBQUlwQjtBQUFBQSxFQUN4RixHQUFHLEVBQUU0USxhQUFhLFNBQVMxTyxRQUFRdEIsRUFBRSxJQUFJaVgsVUFBVSxhQUFhRSxhQUFhLElBQUkzVyxLQUFLLElBQUl3RCxXQUFXZ0IsU0FBU2hCLFVBQVUsQ0FBQztBQUN6SCxRQUFNcVQsY0FBY0EsQ0FBQ0osZUFBZS9QLE1BQU1DLE9BQU8sMkJBQTJCLENBQUNDLFVBQVU7QUFDckYsVUFBTTZCLFFBQVE3QixNQUFNN0YsU0FBU0gsWUFBWSxFQUFFMEUsS0FBS2tELE9BQU9pTyxVQUFVO0FBQ2pFaE8sVUFBTW1PLGFBQWE7QUFDbkJuTyxVQUFNbU8sU0FBUy9SLEtBQUssRUFBRVMsTUFBTW1ELE1BQU1uRCxLQUFLd1IsS0FBSyxFQUFFQyxNQUFNLEtBQUssRUFBRTlELE1BQU0sR0FBRyxDQUFDLEVBQUUrRCxLQUFLLEdBQUcsR0FBR0MsTUFBTSxPQUFPLENBQUM7QUFBQSxFQUNsRyxHQUFHLEVBQUV6VCxXQUFXZ0IsU0FBU2hCLFVBQVUsQ0FBQztBQUNwQyxRQUFNMFQsaUJBQWlCQSxDQUFDVCxZQUFZRSxrQkFBa0JqUSxNQUFNQyxPQUFPLDhCQUE4QixDQUFDQyxVQUFVO0FBQzFHQSxVQUFNN0YsU0FBU0gsWUFBWSxFQUFFMEUsS0FBS2tELE9BQU9pTyxVQUFVLEVBQUVHLFNBQVMvUCxPQUFPOFAsZUFBZSxDQUFDO0FBQUEsRUFDdkYsR0FBRyxFQUFFblQsV0FBV2dCLFNBQVNoQixVQUFVLENBQUM7QUFDcEMsU0FDRSx1QkFBQyxhQUFRLE1BQUksTUFDWDtBQUFBLDJCQUFDLGFBQVEsaUNBQVQ7QUFBQTtBQUFBO0FBQUE7QUFBQSxXQUEwQjtBQUFBLEtBQ3hCMUMsUUFBUXdFLEtBQUtrRCxVQUFVLElBQUlEO0FBQUFBLE1BQUksQ0FBQ0UsT0FBT2dPLGVBQ3ZDLHVCQUFDLFNBQUksV0FBVSxzQkFDYjtBQUFBLCtCQUFDLFNBQUk7QUFBQSxpQ0FBQyxVQUFNaE8sZ0JBQU0wTyxRQUFiO0FBQUE7QUFBQTtBQUFBO0FBQUEsaUJBQWtCO0FBQUEsVUFBTyx1QkFBQyxVQUFNMU8sZ0JBQU1qSixNQUFiO0FBQUE7QUFBQTtBQUFBO0FBQUEsaUJBQWdCO0FBQUEsYUFBOUM7QUFBQTtBQUFBO0FBQUE7QUFBQSxlQUFxRDtBQUFBLFFBQ3BEaUosTUFBTW5DLFNBQVMsT0FBTyx1QkFBQyxZQUFTLE9BQU0sU0FBUSxpQ0FBQyxXQUFNLE9BQU9tQyxNQUFNbkMsT0FBTyxVQUFVLENBQUNlLFVBQVVtUCxZQUFZQyxZQUFZLFNBQVNwUCxNQUFNL0csT0FBTzFCLEtBQUssS0FBbkc7QUFBQTtBQUFBO0FBQUE7QUFBQSxlQUFxRyxLQUE3SDtBQUFBO0FBQUE7QUFBQTtBQUFBLGVBQWdJLElBQWM7QUFBQSxRQUNwSzZKLE1BQU1uRCxRQUFRLE9BQU8sdUJBQUMsWUFBUyxPQUFNLFFBQU8saUNBQUMsY0FBUyxNQUFLLEtBQUksT0FBT21ELE1BQU1uRCxNQUFNLFVBQVUsQ0FBQytCLFVBQVVtUCxZQUFZQyxZQUFZLFFBQVFwUCxNQUFNL0csT0FBTzFCLEtBQUssS0FBN0c7QUFBQTtBQUFBO0FBQUE7QUFBQSxlQUErRyxLQUF0STtBQUFBO0FBQUE7QUFBQTtBQUFBLGVBQXlJLElBQWM7QUFBQSxRQUM1SzZKLE1BQU0wTyxTQUFTLFVBQVUsdUJBQUMsWUFBUyxPQUFNLHdCQUF1QixpQ0FBQyxXQUFNLE1BQUssWUFBVyxTQUFTMU8sTUFBTTJPLG1CQUFtQixNQUFNLFVBQVUsQ0FBQy9QLFVBQVVtUCxZQUFZQyxZQUFZLGtCQUFrQnBQLE1BQU0vRyxPQUFPK1csT0FBTyxLQUFsSjtBQUFBO0FBQUE7QUFBQTtBQUFBLGVBQW9KLEtBQTNMO0FBQUE7QUFBQTtBQUFBO0FBQUEsZUFBOEwsSUFBYztBQUFBLFFBQ3JPNU8sTUFBTW5ELFFBQVEsT0FDYix1QkFBQyxTQUFJLFdBQVUsa0NBQ2I7QUFBQSxpQ0FBQyxVQUFLLGlDQUFOO0FBQUE7QUFBQTtBQUFBO0FBQUEsaUJBQXVCO0FBQUEsV0FDckJtRCxNQUFNbU8sWUFBWSxJQUFJck87QUFBQUEsWUFBSSxDQUFDMUUsTUFBTThTLGtCQUNqQyx1QkFBQyxTQUFJLFdBQVUsNkJBQ2I7QUFBQSxxQ0FBQyxXQUFNLGNBQVcsc0JBQXFCLE9BQU85UyxLQUFLeUIsTUFBTSxVQUFVLENBQUMrQixVQUFVcVAsZUFBZUQsWUFBWUUsZUFBZSxRQUFRdFAsTUFBTS9HLE9BQU8xQixLQUFLLEtBQWxKO0FBQUE7QUFBQTtBQUFBO0FBQUEscUJBQW9KO0FBQUEsY0FDcEosdUJBQUMsWUFBTyxjQUFXLG9CQUFtQixPQUFPaUYsS0FBS29ULE1BQU0sVUFBVSxDQUFDNVAsVUFBVXFQLGVBQWVELFlBQVlFLGVBQWUsUUFBUXRQLE1BQU0vRyxPQUFPMUIsS0FBSyxHQUM5SXZDLHlDQUErQmtNLElBQUksQ0FBQzBPLFNBQVMsdUJBQUMsWUFBTyxPQUFPQSxNQUFrQkEsa0JBQVBBLE1BQTFCO0FBQUE7QUFBQTtBQUFBO0FBQUEscUJBQXNDLENBQVMsS0FEL0Y7QUFBQTtBQUFBO0FBQUE7QUFBQSxxQkFFQTtBQUFBLGNBQ0EsdUJBQUMsWUFBTyxNQUFLLFVBQVMsY0FBWSxVQUFVcFQsS0FBS3lCLFFBQVEsT0FBTyxjQUFjLFNBQVMsTUFBTTRSLGVBQWVULFlBQVlFLGFBQWEsR0FBRyxpQkFBeEk7QUFBQTtBQUFBO0FBQUE7QUFBQSxxQkFBeUk7QUFBQSxpQkFMM0YsR0FBR2xPLE1BQU1qSixFQUFFLGFBQWFtWCxhQUFhLElBQXJGO0FBQUE7QUFBQTtBQUFBO0FBQUEsbUJBTUE7QUFBQSxVQUNEO0FBQUEsVUFDRCx1QkFBQyxZQUFPLE1BQUssVUFBUyxTQUFTLE1BQU1FLFlBQVlKLFVBQVUsR0FBRyw2QkFBOUQ7QUFBQTtBQUFBO0FBQUE7QUFBQSxpQkFBMkU7QUFBQSxhQVg3RTtBQUFBO0FBQUE7QUFBQTtBQUFBLGVBWUEsSUFDRTtBQUFBLFFBQ0hoTyxNQUFNNk8sUUFBUSx1QkFBQyxZQUFTLE9BQU0sU0FBUSxpQ0FBQyxjQUFTLE1BQUssS0FBSSxPQUFPN08sTUFBTTZPLE1BQU1OLEtBQUssSUFBSSxHQUFHLFVBQVUsQ0FBQzNQLFVBQVVtUCxZQUFZQyxZQUFZLFNBQVNwUCxNQUFNL0csT0FBTzFCLE1BQU1tWSxNQUFNLElBQUksRUFBRWxFLE9BQU8wRSxPQUFPLENBQUMsS0FBdEo7QUFBQTtBQUFBO0FBQUE7QUFBQSxlQUF3SixLQUFoTDtBQUFBO0FBQUE7QUFBQTtBQUFBLGVBQW1MLElBQWM7QUFBQSxXQXBCeks5TyxNQUFNakosSUFBL0M7QUFBQTtBQUFBO0FBQUE7QUFBQSxhQXFCQTtBQUFBLElBQ0Q7QUFBQSxJQUNELHVCQUFDLFlBQU8sTUFBSyxVQUFTLFdBQVUsNEJBQTJCLFNBQVMsTUFBTWtILE1BQU1DLE9BQU8sdUJBQXVCLENBQUNDLFVBQVU7QUFDdkhBLFlBQU03RixTQUFTSCxZQUFZLEVBQUUwRSxLQUFLa0QsT0FBTzNELEtBQUssRUFBRXJGLElBQUkySSxPQUFPdkIsT0FBTyxHQUFHOUYsUUFBUXRCLEVBQUUsUUFBUSxHQUFHMlgsTUFBTSxTQUFTN1IsTUFBTSwyQkFBMkIsQ0FBQztBQUFBLElBQzdJLENBQUMsR0FBRywrQkFGSjtBQUFBO0FBQUE7QUFBQTtBQUFBLFdBRW1CO0FBQUEsT0E1QnJCO0FBQUE7QUFBQTtBQUFBO0FBQUEsU0E2QkE7QUFFSjtBQUFDa1MsTUFoRFFqQjtBQWtEVCxTQUFTa0Isa0JBQWtCLEVBQUUvUSxPQUFPbEMsVUFBVWtULFdBQVdDLGFBQWEsR0FBRztBQUFBQyxNQUFBO0FBQ3ZFLFFBQU1sSixVQUFVNVEsa0NBQWtDMEcsU0FBU2hCLFNBQVM7QUFDcEUsUUFBTSxDQUFDcVUsT0FBT0MsUUFBUSxJQUFJN2MsU0FBUyxJQUFJO0FBQ3ZDLFFBQU0sQ0FBQzhjLFFBQVFDLFNBQVMsSUFBSS9jLFNBQVMsU0FBUztBQUM5QyxRQUFNLENBQUNnZCxTQUFTQyxVQUFVLElBQUlqZCxTQUFTLElBQUk7QUFDM0MsUUFBTSxDQUFDdUwsU0FBUzJSLFVBQVUsSUFBSWxkLFNBQVMsRUFBRTtBQUV6QyxRQUFNbWQsZUFBZUEsQ0FBQzlSLE9BQU8wUCxXQUFXO0FBQ3RDLFFBQUksQ0FBQ0EsT0FBTzVJLE9BQU87QUFDakIsVUFBSTVJLFNBQVM2VCxTQUFVM1IsT0FBTTRSLFVBQVU7QUFDdkNKLGlCQUFXbEMsTUFBTTtBQUNqQm1DLGlCQUFXbkMsT0FBTzNJLFVBQVUsc0RBQXNEO0FBQ2xGO0FBQUEsSUFDRjtBQUNBLFFBQUk3SSxTQUFTNlQsU0FBVTNSLE9BQU00UixVQUFVO0FBQ3ZDNVIsVUFBTTZSLFNBQVNqUyxPQUFPLENBQUNNLFVBQVVtQyxjQUFjbkMsT0FBT29QLE9BQU9oTixLQUFLLENBQUM7QUFDbkVrUCxlQUFXLEVBQUUsR0FBR2xDLFFBQVExUCxNQUFNLENBQUM7QUFDL0I2UixlQUFXLEVBQUU7QUFBQSxFQUNmO0FBQ0EsUUFBTWhJLGdCQUFnQkEsTUFBTTtBQUMxQixRQUFJM0wsU0FBUzZULFNBQVUzUixPQUFNNFIsVUFBVTtBQUN2Q0osZUFBVyxJQUFJO0FBQ2ZDLGVBQVcsRUFBRTtBQUFBLEVBQ2Y7QUFDQSxRQUFNSyxlQUFlQSxNQUFNO0FBQ3pCLFFBQUksQ0FBQ1AsU0FBUzdLLFNBQVMsQ0FBQzVJLFNBQVM2VCxTQUFVO0FBQzNDM1IsVUFBTStSLFNBQVM7QUFDZlAsZUFBVyxJQUFJO0FBQ2ZDLGVBQVcsRUFBRTtBQUFBLEVBQ2Y7QUFDQSxRQUFNTyxrQkFBa0JBLENBQUNwUyxPQUFPMFAsV0FBVztBQUN6QyxRQUFJLENBQUNBLFFBQVE1SSxTQUFTLENBQUM0SSxPQUFPclYsVUFBVTtBQUN0Q3dYLGlCQUFXbkMsUUFBUTNJLFVBQVUsK0NBQStDO0FBQzVFO0FBQUEsSUFDRjtBQUNBM0csVUFBTUMsT0FBT0wsT0FBTyxDQUFDTSxVQUFVZ0MscUJBQXFCaEMsT0FBT29QLE9BQU9yVixRQUFRLEdBQUc7QUFBQSxNQUMzRTZDLFdBQVd3UyxPQUFPeFMsYUFBYWdCLFNBQVNoQjtBQUFBQSxJQUMxQyxDQUFDO0FBQ0QyVSxlQUFXLEVBQUU7QUFBQSxFQUNmO0FBRUEsUUFBTVEsYUFBYUEsTUFBTVAsYUFBYSwyQkFBMkJsYSxxQ0FBcUM7QUFBQSxJQUNwR3lDLFVBQVU2RCxTQUFTN0Q7QUFBQUEsSUFDbkIrQyxNQUFNYyxTQUFTQztBQUFBQSxJQUNmaUs7QUFBQUEsSUFDQWtCLFNBQVNwTCxTQUFTaEI7QUFBQUEsRUFDcEIsQ0FBQyxDQUFDO0FBQ0YsUUFBTW9WLFdBQVdBLE1BQU1SLGFBQWEsdUJBQXVCamEsaUNBQWlDO0FBQUEsSUFDMUZ3QyxVQUFVNkQsU0FBUzdEO0FBQUFBLElBQ25CK0MsTUFBTWMsU0FBU0M7QUFBQUEsSUFDZmlLO0FBQUFBLElBQ0FrQixTQUFTcEwsU0FBU2hCO0FBQUFBLElBQ2xCcVU7QUFBQUEsSUFDQUU7QUFBQUEsRUFDRixDQUFDLENBQUM7QUFDRixRQUFNYyxlQUFlQSxNQUFNVCxhQUFhLDRCQUE0Qi9aLG1DQUFtQztBQUFBLElBQ3JHc0MsVUFBVTZELFNBQVM3RDtBQUFBQSxJQUNuQitDLE1BQU1jLFNBQVNDO0FBQUFBLElBQ2ZpSztBQUFBQSxJQUNBa0IsU0FBU3BMLFNBQVNoQjtBQUFBQSxJQUNsQnNWLFlBQVl0VSxTQUFTcUQsVUFBVWxFO0FBQUFBLEVBQ2pDLENBQUMsQ0FBQztBQUNGLFFBQU1vUyxZQUFZQSxNQUFNMkMsZ0JBQWdCLHdCQUF3QmpiLGdDQUFnQztBQUFBLElBQzlGa0QsVUFBVTZELFNBQVM3RDtBQUFBQSxJQUNuQitOO0FBQUFBLElBQ0FrQixTQUFTcEwsU0FBU2hCO0FBQUFBLEVBQ3BCLENBQUMsQ0FBQztBQUNGLFFBQU11VixPQUFPQSxNQUFNO0FBQ2pCLFVBQU0vQyxTQUFTelksd0NBQXdDO0FBQUEsTUFDckRvRCxVQUFVNkQsU0FBUzdEO0FBQUFBLE1BQ25CK0MsTUFBTWMsU0FBU0M7QUFBQUEsTUFDZmlLO0FBQUFBLE1BQ0FrQixTQUFTcEwsU0FBU2hCO0FBQUFBLElBQ3BCLENBQUM7QUFDRCxVQUFNd1YsVUFBVWhELFFBQVFnRCxXQUFXaEQ7QUFDbkMsVUFBTWlELGFBQWF2YSwwQ0FBMENzYSxPQUFPO0FBQ3BFLFFBQUloRCxRQUFRNUksVUFBVSxTQUFTNkwsWUFBWTdMLFVBQVUsT0FBTztBQUMxRCtLLGlCQUFXbkMsUUFBUTNJLFVBQVU0TCxZQUFZNUwsVUFBVSxnQ0FBZ0M7QUFDbkY7QUFBQSxJQUNGO0FBQ0FzSyxpQkFBYXFCLE9BQU87QUFDcEJiLGVBQVcsR0FBR3pKLFFBQVF0TixNQUFNLFNBQVNzTixRQUFRdE4sV0FBVyxJQUFJLEtBQUssR0FBRyxrQ0FBa0M7QUFBQSxFQUN4RztBQUNBLFFBQU04WCxRQUFRQSxNQUFNUixnQkFBZ0Isb0JBQW9CcGEsbUNBQW1DO0FBQUEsSUFDekZxQyxVQUFVNkQsU0FBUzdEO0FBQUFBLElBQ25CK0MsTUFBTWMsU0FBU0M7QUFBQUEsSUFDZnVVLFNBQVN0QjtBQUFBQSxJQUNUeUIsc0JBQXNCM1UsU0FBU2hCLFVBQVVIO0FBQUFBLElBQ3pDeVYsWUFBWXRVLFNBQVNxRCxVQUFVbEU7QUFBQUEsRUFDakMsQ0FBQyxDQUFDO0FBRUYsUUFBTXlWLGFBQWFuQixTQUFTN0ssUUFBUTZLLFFBQVFqUCxRQUFRO0FBQ3BELFFBQU1jLFFBQVFqTCxLQUFLRSxJQUFJLE1BQU95RixTQUFTQyxjQUFjc0YsY0FBYyxDQUFDO0FBQ3BFLFNBQ0UsdUJBQUMsYUFBUSxXQUFVLHVCQUFzQixNQUFNMkUsUUFBUXROLFNBQVMsR0FDOUQ7QUFBQSwyQkFBQyxhQUFRLGdDQUFUO0FBQUE7QUFBQTtBQUFBO0FBQUEsV0FBeUI7QUFBQSxJQUN4QnNOLFFBQVF0TixTQUFTLElBQ2hCLG1DQUNFO0FBQUEsNkJBQUMsU0FBSSxXQUFVLCtCQUNiO0FBQUEsK0JBQUMsWUFBTyxNQUFLLFVBQVMsU0FBU3VYLFlBQVksaUNBQTNDO0FBQUE7QUFBQTtBQUFBO0FBQUEsZUFBNEQ7QUFBQSxRQUM1RCx1QkFBQyxZQUFPLE1BQUssVUFBUyxTQUFTRSxjQUFjLHlDQUE3QztBQUFBO0FBQUE7QUFBQTtBQUFBLGVBQXNFO0FBQUEsV0FGeEU7QUFBQTtBQUFBO0FBQUE7QUFBQSxhQUdBO0FBQUEsTUFDQSx1QkFBQyxTQUFJLFdBQVUsMkJBQ2I7QUFBQSwrQkFBQyxZQUFTLE9BQU0sYUFBWSxpQ0FBQyxXQUFNLE1BQUssVUFBUyxLQUFJLEtBQUksS0FBSSxLQUFJLE1BQUssUUFBTyxPQUFPaEIsT0FBTyxVQUFVLENBQUN4USxVQUFVeVEsU0FBU2paLEtBQUtFLElBQUksR0FBRytDLE9BQU91RixNQUFNL0csT0FBTzFCLEtBQUssS0FBSyxDQUFDLENBQUMsS0FBekk7QUFBQTtBQUFBO0FBQUE7QUFBQSxlQUEySSxLQUF2SztBQUFBO0FBQUE7QUFBQTtBQUFBLGVBQTBLO0FBQUEsUUFDMUssdUJBQUMsWUFBUyxPQUFNLFVBQVMsaUNBQUMsWUFBTyxPQUFPbVosUUFBUSxVQUFVLENBQUMxUSxVQUFVMlEsVUFBVTNRLE1BQU0vRyxPQUFPMUIsS0FBSyxHQUFHO0FBQUEsaUNBQUMsWUFBTyxPQUFNLFdBQVUsdUJBQXhCO0FBQUE7QUFBQTtBQUFBO0FBQUEsaUJBQStCO0FBQUEsVUFBUyx1QkFBQyxZQUFPLE9BQU0sU0FBUSxxQkFBdEI7QUFBQTtBQUFBO0FBQUE7QUFBQSxpQkFBMkI7QUFBQSxVQUFTLHVCQUFDLFlBQU8sT0FBTSxRQUFPLG9CQUFyQjtBQUFBO0FBQUE7QUFBQTtBQUFBLGlCQUF5QjtBQUFBLGFBQWhMO0FBQUE7QUFBQTtBQUFBO0FBQUEsZUFBeUwsS0FBbE47QUFBQTtBQUFBO0FBQUE7QUFBQSxlQUEyTjtBQUFBLFFBQzNOLHVCQUFDLFlBQU8sTUFBSyxVQUFTLFNBQVNnYSxVQUFVLGlDQUF6QztBQUFBO0FBQUE7QUFBQTtBQUFBLGVBQTBEO0FBQUEsV0FINUQ7QUFBQTtBQUFBO0FBQUE7QUFBQSxhQUlBO0FBQUEsU0FURjtBQUFBO0FBQUE7QUFBQTtBQUFBLFdBVUEsSUFDRTtBQUFBLElBQ0hRLFdBQVdoWSxTQUNWLHVCQUFDLFNBQUksV0FBVSwrQkFBOEIsY0FBVyx5QkFDckRnWSxxQkFBVzdRLElBQUksQ0FBQ1UsU0FBUztBQUN4QixZQUFNckYsV0FBV1ksU0FBU0MsYUFBYTFELFNBQVN6QixLQUFLLENBQUN1RSxTQUFTQSxLQUFLckUsT0FBT3lKLEtBQUs1RixTQUFTO0FBQ3pGLFlBQU1NLFVBQVU3QixPQUFPOEIsVUFBVUUsV0FBVyxDQUFDLElBQUttRixLQUFLdkQsT0FBTzVELE9BQU84QixVQUFVRyxZQUFZLENBQUM7QUFDNUYsYUFBTyx1QkFBQyxPQUEwQyxPQUFPLEVBQUVaLE1BQU0sR0FBSVEsVUFBVW1HLFFBQVMsR0FBRyxJQUFJLEdBQUcsT0FBTyxHQUFHYixLQUFLdEQsS0FBSyxNQUFNM0IsU0FBU0wsT0FBTyxDQUFDLE1BQTlILEdBQUdzRixLQUFLNUYsU0FBUyxJQUFJNEYsS0FBS3RELEtBQUssSUFBdkM7QUFBQTtBQUFBO0FBQUE7QUFBQSxhQUF5STtBQUFBLElBQ2xKLENBQUMsS0FMSDtBQUFBO0FBQUE7QUFBQTtBQUFBLFdBTUEsSUFDRTtBQUFBLElBQ0hhLFVBQVUsdUJBQUMsT0FBRSxXQUFXLDhCQUE4QnlSLFdBQVcsQ0FBQ0EsUUFBUTdLLFFBQVEsY0FBYyxFQUFFLElBQUs1RyxxQkFBN0Y7QUFBQTtBQUFBO0FBQUE7QUFBQSxXQUFxRyxJQUFPO0FBQUEsSUFDdEh5UixTQUFTN0ssU0FBUzVJLFNBQVM2VCxXQUFXLHVCQUFDLFNBQUksV0FBVSxvQkFBbUI7QUFBQSw2QkFBQyxVQUFLO0FBQUE7QUFBQSxRQUFZSixRQUFRM1I7QUFBQUEsV0FBMUI7QUFBQTtBQUFBO0FBQUE7QUFBQSxhQUFnQztBQUFBLE1BQU8sdUJBQUMsWUFBTyxNQUFLLFVBQVMsU0FBUzZKLGVBQWUsc0JBQTlDO0FBQUE7QUFBQTtBQUFBO0FBQUEsYUFBb0Q7QUFBQSxNQUFTLHVCQUFDLFlBQU8sTUFBSyxVQUFTLFdBQVUsY0FBYSxTQUFTcUksY0FBYyxxQkFBcEU7QUFBQTtBQUFBO0FBQUE7QUFBQSxhQUF5RTtBQUFBLFNBQS9NO0FBQUE7QUFBQTtBQUFBO0FBQUEsV0FBd04sSUFBUztBQUFBLElBQ3hRLHVCQUFDLFNBQUksV0FBVSwrQkFDYjtBQUFBLDZCQUFDLFlBQU8sTUFBSyxVQUFTLFNBQVN6QyxXQUFXO0FBQUE7QUFBQSxRQUFXckgsUUFBUXROLFNBQVMsSUFBSSxjQUFjO0FBQUEsV0FBeEY7QUFBQTtBQUFBO0FBQUE7QUFBQSxhQUFnRztBQUFBLE1BQ2hHLHVCQUFDLFlBQU8sTUFBSyxVQUFTLFNBQVMyWCxNQUFNLG9CQUFyQztBQUFBO0FBQUE7QUFBQTtBQUFBLGFBQXlDO0FBQUEsTUFDekMsdUJBQUMsWUFBTyxNQUFLLFVBQVMsVUFBVSxDQUFDckIsV0FBVyxTQUFTd0IsT0FBTyxpQ0FBNUQ7QUFBQTtBQUFBO0FBQUE7QUFBQSxhQUE2RTtBQUFBLFNBSC9FO0FBQUE7QUFBQTtBQUFBO0FBQUEsV0FJQTtBQUFBLE9BOUJGO0FBQUE7QUFBQTtBQUFBO0FBQUEsU0ErQkE7QUFFSjtBQUFDdEIsSUEvSFFILG1CQUFpQjtBQUFBLE1BQWpCQTtBQWlJVCxTQUFTNEIsYUFBYSxFQUFFM1MsT0FBT2xDLFVBQVUxRCxTQUFTNFcsV0FBV0MsYUFBYSxHQUFHO0FBQzNFLFFBQU0yQixrQkFBa0J4YixrQ0FBa0MwRyxTQUFTaEIsU0FBUztBQUM1RSxRQUFNNUMsZUFBZXdDLGdCQUFnQm9CLFNBQVM3RCxVQUFVRyxRQUFRdEIsRUFBRTtBQUNsRSxRQUFNaUcsV0FBVzNFLFFBQVF3RSxLQUFLQyxLQUFLakMsVUFBVSxDQUFDa0MsU0FBUUEsS0FBSWhHLE9BQU9nRixTQUFTaEIsVUFBVW1DLEtBQUs7QUFDekYsUUFBTUgsTUFBTTFFLFFBQVF3RSxLQUFLQyxLQUFLRSxRQUFRO0FBQ3RDLE1BQUksQ0FBQ0QsSUFBSyxRQUFPLHVCQUFDLG9CQUFpQixPQUFjLFVBQW9CLFdBQXBEO0FBQUE7QUFBQTtBQUFBO0FBQUEsU0FBcUU7QUFDdEYsUUFBTW9RLFNBQVNBLENBQUM1VixPQUFPcEIsVUFBVThILE1BQU1DLE9BQU8sWUFBWTNHLEtBQUssSUFBSSxDQUFDNEcsVUFBVTtBQUM1RUEsVUFBTTdGLFNBQVNILFlBQVksRUFBRTBFLEtBQUtDLEtBQUtFLFFBQVEsRUFBRXpGLEtBQUssSUFBSXBCO0FBQUFBLEVBQzVELEdBQUcsRUFBRTRRLGFBQWEsT0FBT2hLLElBQUloRyxFQUFFLElBQUlRLEtBQUssSUFBSXdELFdBQVdnQixTQUFTaEIsVUFBVSxDQUFDO0FBQzNFLFFBQU0rVixTQUFTQSxNQUFNN1MsTUFBTUMsT0FBTyxtQkFBbUIsQ0FBQ0MsVUFBVTtBQUM5REEsVUFBTTdGLFNBQVNILFlBQVksRUFBRTBFLEtBQUtDLEtBQUtzQixPQUFPcEIsVUFBVSxDQUFDO0FBQUEsRUFDM0QsR0FBRyxFQUFFakMsV0FBVyxFQUFFdUIsTUFBTSxXQUFXMUIsV0FBV3ZDLFFBQVF0QixHQUFHLEVBQUUsQ0FBQztBQUM1RCxRQUFNNFUsZUFBZXhXLGlDQUFpQzRILEdBQUc7QUFDekQsUUFBTWdVLGlCQUFpQnJjLG1DQUFtQ3FJLEtBQUtoQixTQUFTN0QsU0FBU3VVLFFBQVF1RSxVQUFVO0FBQ25HLFFBQU05SixXQUFXelMsNkJBQTZCc0ksR0FBRztBQUNqRCxRQUFNa1UsVUFBVUEsQ0FBQ0MsWUFBWWpULE1BQU1DLE9BQU8saUJBQWlCLENBQUNDLFVBQVU7QUFDcEUsVUFBTXRHLFNBQVNzRyxNQUFNN0YsU0FBU0gsWUFBWSxFQUFFMEUsS0FBS0MsS0FBS0UsUUFBUTtBQUM5RC9GLFdBQU9vSixPQUFPeEksUUFBUXZDLDRCQUE0QnVDLFFBQVFxWixVQUFVLEdBQUcsQ0FBQztBQUFBLEVBQzFFLEdBQUcsRUFBRW5LLGFBQWEsT0FBT2hLLElBQUloRyxFQUFFLFdBQVdnRSxXQUFXLEVBQUUsR0FBR2dCLFNBQVNoQixXQUFXNkIsU0FBUyxRQUFRLEVBQUUsQ0FBQztBQUNsRyxRQUFNdVUsaUJBQWlCQSxDQUFDM1UsU0FBU3lCLE1BQU1DLE9BQU8sd0JBQXdCLENBQUNDLFVBQVU7QUFDL0UsVUFBTXRHLFNBQVNzRyxNQUFNN0YsU0FBU0gsWUFBWSxFQUFFMEUsS0FBS0MsS0FBS0UsUUFBUTtBQUM5RG5GLFdBQU8rVixTQUFTLEVBQUUsR0FBRy9WLE9BQU8rVixRQUFRcFIsS0FBSztBQUFBLEVBQzNDLEdBQUcsRUFBRXpCLFdBQVdnQixTQUFTaEIsVUFBVSxDQUFDO0FBQ3BDLFNBQ0UsbUNBQ0U7QUFBQSwyQkFBQyxZQUFPO0FBQUEsNkJBQUMsVUFBSyx3QkFBTjtBQUFBO0FBQUE7QUFBQTtBQUFBLGFBQWM7QUFBQSxNQUFPLHVCQUFDLFlBQVFnQyxjQUFJaEcsTUFBYjtBQUFBO0FBQUE7QUFBQTtBQUFBLGFBQWdCO0FBQUEsU0FBN0M7QUFBQTtBQUFBO0FBQUE7QUFBQSxXQUFzRDtBQUFBLElBQ3JEOFosZ0JBQWdCbFksU0FBUyxJQUN4Qix1QkFBQyxTQUFJLFdBQVUsOEJBQ2I7QUFBQSw2QkFBQyxZQUFRa1k7QUFBQUEsd0JBQWdCbFk7QUFBQUEsUUFBTztBQUFBLFdBQWhDO0FBQUE7QUFBQTtBQUFBO0FBQUEsYUFBZ0Q7QUFBQSxNQUNoRCx1QkFBQyxRQUFJa1ksMEJBQWdCL1EsSUFBSSxDQUFDaUcsV0FBVztBQUNuQyxjQUFNcUwsZ0JBQWdCclYsU0FBUzdELFNBQVNJLFNBQVN6QixLQUFLLENBQUN1RSxTQUFTQSxLQUFLckUsT0FBT2dQLE9BQU9uTCxTQUFTO0FBQzVGLGNBQU15VyxZQUFZRCxlQUFldlUsTUFBTUMsTUFBTWpHLEtBQUssQ0FBQ3VFLFNBQVNBLEtBQUtyRSxPQUFPZ1AsT0FBTzdJLEtBQUs7QUFDcEYsZUFBTyx1QkFBQyxRQUErQztBQUFBLGlDQUFDLFVBQU1rVSx5QkFBZXZULFNBQXRCO0FBQUE7QUFBQTtBQUFBO0FBQUEsaUJBQTRCO0FBQUEsVUFBUXdULFdBQVd4VTtBQUFBQSxhQUF0RixHQUFHa0osT0FBT25MLFNBQVMsSUFBSW1MLE9BQU83SSxLQUFLLElBQTVDO0FBQUE7QUFBQTtBQUFBO0FBQUEsZUFBb0c7QUFBQSxNQUM3RyxDQUFDLEtBSkQ7QUFBQTtBQUFBO0FBQUE7QUFBQSxhQUlHO0FBQUEsTUFDSCx1QkFBQyxZQUFPLE1BQUssVUFBUyxTQUFTLE1BQU1lLE1BQU1ZLGFBQWEsRUFBRXZDLE1BQU0sT0FBTzFCLFdBQVd2QyxRQUFRdEIsSUFBSW1HLE9BQU9ILElBQUloRyxJQUFJNkYsU0FBUyxRQUFRLENBQUMsR0FBRyxpQ0FBbEk7QUFBQTtBQUFBO0FBQUE7QUFBQSxhQUFtSjtBQUFBLFNBUHJKO0FBQUE7QUFBQTtBQUFBO0FBQUEsV0FRQSxJQUNFO0FBQUEsSUFDSix1QkFBQyxPQUFFLFdBQVUscUJBQW9CLDhOQUFqQztBQUFBO0FBQUE7QUFBQTtBQUFBLFdBQStPO0FBQUEsSUFDL08sdUJBQUMsWUFBUyxPQUFNLGFBQVksaUNBQUMsY0FBUyxNQUFLLEtBQUksT0FBT0csSUFBSUYsTUFBTSxVQUFVLENBQUMrQixVQUFVdU8sT0FBTyxRQUFRdk8sTUFBTS9HLE9BQU8xQixLQUFLLEtBQTFGO0FBQUE7QUFBQTtBQUFBO0FBQUEsV0FBNEYsS0FBeEg7QUFBQTtBQUFBO0FBQUE7QUFBQSxXQUEySDtBQUFBLElBQzNILHVCQUFDLFlBQVMsT0FBTSxZQUFXLGlDQUFDLFlBQU8sT0FBTytRLFVBQVUsVUFBVSxDQUFDdEksVUFBVXVTLGVBQWV2UyxNQUFNL0csT0FBTzFCLEtBQUssR0FBRztBQUFBLDZCQUFDLFlBQU8sT0FBTSxXQUFVLDhCQUF4QjtBQUFBO0FBQUE7QUFBQTtBQUFBLGFBQXNDO0FBQUEsTUFBUyx1QkFBQyxZQUFPLE9BQU0sWUFBVywrQkFBekI7QUFBQTtBQUFBO0FBQUE7QUFBQSxhQUF3QztBQUFBLFNBQXpLO0FBQUE7QUFBQTtBQUFBO0FBQUEsV0FBa0wsS0FBN007QUFBQTtBQUFBO0FBQUE7QUFBQSxXQUFzTjtBQUFBLElBQ3ROO0FBQUEsTUFBQztBQUFBO0FBQUEsUUFDQyxPQUFNO0FBQUEsUUFDTixPQUFPa0QsUUFBUTBELElBQUlFLE9BQU8sS0FBS3pCLFFBQVEsQ0FBQyxDQUFDO0FBQUEsUUFDekMsS0FBS25DLFFBQVFzUyxhQUFhdFYsTUFBTSxLQUFLbUYsUUFBUSxDQUFDLENBQUM7QUFBQSxRQUMvQyxLQUFLbkMsUUFBUXNTLGFBQWFyVixNQUFNLEtBQUtrRixRQUFRLENBQUMsQ0FBQztBQUFBLFFBQy9DLE1BQU07QUFBQSxRQUNOLE1BQUs7QUFBQSxRQUNMLFVBQVVtUSxhQUFhdFYsUUFBUXNWLGFBQWFyVjtBQUFBQSxRQUM1QyxVQUFVMmE7QUFBQUE7QUFBQUEsTUFSWjtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUEsSUFRb0I7QUFBQSxJQUVuQi9KLGFBQWEsWUFDWixtQ0FDRTtBQUFBLDZCQUFDLFlBQVMsT0FBTSxlQUFjLGlDQUFDLFlBQU8sV0FBVSx3QkFBd0I5UTtBQUFBQSxhQUFLMFMsTUFBTWlJLGVBQWUzVCxRQUFRLEdBQUc7QUFBQSxRQUFFO0FBQUEsUUFBRWhILEtBQUswUyxNQUFNaUksZUFBZXhTLE1BQU0sR0FBRztBQUFBLFFBQUU7QUFBQSxXQUF4SDtBQUFBO0FBQUE7QUFBQTtBQUFBLGFBQXlILEtBQXZKO0FBQUE7QUFBQTtBQUFBO0FBQUEsYUFBZ0s7QUFBQSxNQUNoSyx1QkFBQyxZQUFTLE9BQU0saUJBQWdCLGlDQUFDLFlBQU8sT0FBT3hCLElBQUk0USxRQUFRLFVBQVUsQ0FBQy9PLFVBQVV1TyxPQUFPLFVBQVV2TyxNQUFNL0csT0FBTzFCLEtBQUssR0FBRztBQUFBLCtCQUFDLFlBQU8sT0FBTSx1QkFBc0IsZ0NBQXBDO0FBQUE7QUFBQTtBQUFBO0FBQUEsZUFBb0Q7QUFBQSxRQUFTLHVCQUFDLFlBQU8sT0FBTSxhQUFZLHNCQUExQjtBQUFBO0FBQUE7QUFBQTtBQUFBLGVBQWdDO0FBQUEsUUFBUyx1QkFBQyxZQUFPLE9BQU0sYUFBWSxzQkFBMUI7QUFBQTtBQUFBO0FBQUE7QUFBQSxlQUFnQztBQUFBLFdBQTVOO0FBQUE7QUFBQTtBQUFBO0FBQUEsYUFBcU8sS0FBclE7QUFBQTtBQUFBO0FBQUE7QUFBQSxhQUE4UTtBQUFBLFNBRmhSO0FBQUE7QUFBQTtBQUFBO0FBQUEsV0FHQSxJQUNFLHVCQUFDLFlBQVMsT0FBTSxVQUFTLGlDQUFDLFlBQU8sV0FBVSx3QkFBdUIseUNBQXpDO0FBQUE7QUFBQTtBQUFBO0FBQUEsV0FBa0UsS0FBM0Y7QUFBQTtBQUFBO0FBQUE7QUFBQSxXQUFvRztBQUFBLElBQ3hHLHVCQUFDLHFCQUFrQixPQUFjLFVBQW9CLFdBQXNCLGdCQUEzRTtBQUFBO0FBQUE7QUFBQTtBQUFBLFdBQXNHO0FBQUEsSUFDdEcsdUJBQUMsWUFBTyxNQUFLLFVBQVMsV0FBVSx1QkFBc0IsVUFBVWtDLFFBQVFpRSxTQUFTLFVBQVUsU0FBU3dVLFFBQVEsMEJBQTVHO0FBQUE7QUFBQTtBQUFBO0FBQUEsV0FBc0g7QUFBQSxPQWpDeEg7QUFBQTtBQUFBO0FBQUE7QUFBQSxTQWtDQTtBQUVKO0FBQUNRLE1BNURRVjtBQThEVCxTQUFTVywwQkFBMEIsRUFBRXRULE9BQU9sQyxVQUFVMUQsUUFBUSxHQUFHO0FBQy9ELFFBQU1GLGVBQWV3QyxnQkFBZ0JvQixTQUFTN0QsVUFBVUcsUUFBUXRCLEVBQUU7QUFDbEUsUUFBTStQLFNBQVN6TyxRQUFRd0UsS0FBS007QUFDNUIsTUFBSSxDQUFDMkosT0FBUSxRQUFPLHVCQUFDLG9CQUFpQixPQUFjLFVBQW9CLFdBQXBEO0FBQUE7QUFBQTtBQUFBO0FBQUEsU0FBcUU7QUFDekYsUUFBTXFHLFNBQVNBLENBQUN0UCxPQUFPdVAsUUFBUXJHLGNBQWMsU0FBUzlJLE1BQU1DLE9BQU9MLE9BQU8sQ0FBQ00sVUFBVTtBQUNuRmlQLFdBQU9qUCxNQUFNN0YsU0FBU0gsWUFBWSxFQUFFMEUsS0FBS00sZ0JBQWdCO0FBQUEsRUFDM0QsR0FBRyxFQUFFNEosYUFBYWhNLFdBQVdnQixTQUFTaEIsVUFBVSxDQUFDO0FBQ2pELFFBQU15VyxZQUFhMUssT0FBTytILE1BQU1sVyxTQUFTLEtBQUttTyxPQUFPMkssVUFBVzNLLE9BQU80SyxnQkFBZ0I1SyxPQUFPN0o7QUFDOUYsUUFBTTBVLFlBQVlBLENBQUM3YSxZQUFZO0FBQzdCLFFBQUlBLFFBQVFDLE9BQU8sUUFBUyxRQUFPLEVBQUVWLEtBQUtTLFFBQVFULEtBQUtDLEtBQUtGLEtBQUtFLElBQUlRLFFBQVFULEtBQUt5USxPQUFPdkksTUFBTWlULFFBQVEsRUFBRTtBQUN6RyxRQUFJMWEsUUFBUUMsT0FBTyxNQUFPLFFBQU8sRUFBRVYsS0FBS0QsS0FBS0MsSUFBSVMsUUFBUVIsS0FBS3dRLE9BQU8xSixRQUFRb1UsUUFBUSxHQUFHbGIsS0FBS1EsUUFBUVIsSUFBSTtBQUN6RyxRQUFJUSxRQUFRQyxPQUFPLFVBQVcsUUFBTztBQUFBLE1BQ25DVixLQUFLUyxRQUFRVDtBQUFBQSxNQUNiQyxLQUFLRixLQUFLRSxJQUFJUSxRQUFRVCxNQUFNeVEsT0FBT3ZJLE1BQU11SSxPQUFPMUosUUFBUTBKLE9BQU80SyxnQkFBZ0I1SyxPQUFPN0osUUFBUTdHLEtBQUtFLElBQUksR0FBR3dRLE9BQU8rSCxNQUFNbFcsU0FBUyxDQUFDLENBQUM7QUFBQSxJQUNwSTtBQUNBLFFBQUk3QixRQUFRQyxPQUFPLGdCQUFpQixRQUFPO0FBQUEsTUFDekNWLEtBQUtTLFFBQVFUO0FBQUFBLE1BQ2JDLEtBQUtGLEtBQUtFLElBQUlRLFFBQVFULEtBQUt5USxPQUFPdkksTUFBTXVJLE9BQU8xSixTQUFVMEosT0FBTytILE1BQU1sVyxTQUFTLEtBQUttTyxPQUFPMkssVUFBVzNLLE9BQU83SixJQUFJO0FBQUEsSUFDbkg7QUFDQSxRQUFJbkcsUUFBUUMsT0FBTyxPQUFRLFFBQU87QUFBQSxNQUNoQ1YsS0FBS1MsUUFBUVQ7QUFBQUEsTUFDYkMsS0FBS0YsS0FBS0UsSUFBSVEsUUFBUVQsS0FBS3lRLE9BQU92SSxNQUFNdUksT0FBTzFKLFNBQVUwSixPQUFPK0gsTUFBTWxXLFNBQVMsS0FBS21PLE9BQU8ySyxVQUFXM0ssT0FBTzRLLGFBQWE7QUFBQSxJQUM1SDtBQUNBLFdBQU8sRUFBRXJiLEtBQUtTLFFBQVFULEtBQUtDLEtBQUtRLFFBQVFSLElBQUk7QUFBQSxFQUM5QztBQUNBLFNBQ0UsbUNBQ0U7QUFBQSwyQkFBQyxZQUFPO0FBQUEsNkJBQUMsVUFBSyw2QkFBTjtBQUFBO0FBQUE7QUFBQTtBQUFBLGFBQW1CO0FBQUEsTUFBTyx1QkFBQyxZQUFPLGlDQUFSO0FBQUE7QUFBQTtBQUFBO0FBQUEsYUFBeUI7QUFBQSxTQUEzRDtBQUFBO0FBQUE7QUFBQTtBQUFBLFdBQW9FO0FBQUEsSUFDcEUsdUJBQUMsT0FBRSxXQUFVLHFCQUFvQix5SUFBakM7QUFBQTtBQUFBO0FBQUE7QUFBQSxXQUEwSjtBQUFBLElBQzFKLHVCQUFDLGFBQVEsTUFBSSxNQUFDO0FBQUEsNkJBQUMsYUFBUSxtQ0FBVDtBQUFBO0FBQUE7QUFBQTtBQUFBLGFBQTRCO0FBQUEsTUFDdkMzQywyQ0FBMkNtTSxJQUFJLENBQUNoSixZQUFZO0FBQzNELGNBQU04YSxTQUFTRCxVQUFVN2EsT0FBTztBQUNoQyxlQUNFO0FBQUEsVUFBQztBQUFBO0FBQUEsWUFFQyxPQUFPQSxRQUFRK0c7QUFBQUEsWUFDZixPQUFPaUosT0FBT2hRLFFBQVFDLEVBQUU7QUFBQSxZQUN4QixLQUFLNmEsT0FBT3ZiO0FBQUFBLFlBQ1osS0FBS3ViLE9BQU90YjtBQUFBQSxZQUNaLE1BQU1RLFFBQVFrSztBQUFBQSxZQUNkLE1BQU1sSyxRQUFRb0s7QUFBQUEsWUFDZCxVQUFVLENBQUMvSyxVQUFVZ1gsT0FBTyxVQUFVclcsUUFBUStHLEtBQUssSUFBSSxDQUFDTSxVQUFVO0FBQUVBLG9CQUFNckgsUUFBUUMsRUFBRSxJQUFJWjtBQUFBQSxZQUFPLEdBQUcscUJBQXFCa0MsUUFBUXRCLEVBQUUsSUFBSUQsUUFBUUMsRUFBRSxFQUFFO0FBQUE7QUFBQSxVQVA1SUQsUUFBUUM7QUFBQUEsVUFEZjtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBLFFBUXFKO0FBQUEsTUFHekosQ0FBQztBQUFBLFNBZkg7QUFBQTtBQUFBO0FBQUE7QUFBQSxXQWdCQTtBQUFBLElBQ0EsdUJBQUMsYUFBUSxNQUFJLE1BQUM7QUFBQSw2QkFBQyxhQUFRLHVDQUFUO0FBQUE7QUFBQTtBQUFBO0FBQUEsYUFBZ0M7QUFBQSxNQUM1Qyx1QkFBQyxTQUFJLFdBQVUsaUNBQ1orUCxpQkFBTytILE1BQU0vTztBQUFBQSxRQUFJLENBQUMxRSxNQUFNeVcsY0FDdkIsdUJBQUMsU0FBSSxXQUFVLGdDQUNiO0FBQUEsaUNBQUMsVUFBTXJHLGlCQUFPcUcsWUFBWSxDQUFDLEVBQUVwRyxTQUFTLEdBQUcsR0FBRyxLQUE1QztBQUFBO0FBQUE7QUFBQTtBQUFBLGlCQUE4QztBQUFBLFVBQzlDLHVCQUFDLFdBQU0sT0FBT3JRLEtBQUt5QyxPQUFPLGNBQVksY0FBY2dVLFlBQVksQ0FBQyxVQUFVLFVBQVUsQ0FBQ2pULFVBQVV1TyxPQUFPLHlCQUF5QixDQUFDaFAsVUFBVTtBQUFFQSxrQkFBTTBRLE1BQU1nRCxTQUFTLEVBQUVoVSxRQUFRZSxNQUFNL0csT0FBTzFCO0FBQUFBLFVBQU8sR0FBRyxxQkFBcUJrQyxRQUFRdEIsRUFBRSxTQUFTcUUsS0FBS29SLEtBQUssUUFBUSxLQUE3UDtBQUFBO0FBQUE7QUFBQTtBQUFBLGlCQUErUDtBQUFBLFVBQy9QLHVCQUFDLFNBQUksV0FBVSxtQ0FBa0MsT0FBTyxHQUFHcFIsS0FBS3lDLEtBQUssNkJBQTZCN0csK0JBQStCb0UsS0FBS29SLEtBQUssQ0FBQyxJQUMxSTtBQUFBLG1DQUFDLE9BQUUsT0FBTyxFQUFFc0YsWUFBWSxPQUFPOWEsK0JBQStCb0UsS0FBS29SLEtBQUssQ0FBQyxJQUFJLEtBQTdFO0FBQUE7QUFBQTtBQUFBO0FBQUEsbUJBQStFO0FBQUEsWUFDL0UsdUJBQUMsVUFBTXhWLHlDQUErQm9FLEtBQUtvUixLQUFLLEtBQWhEO0FBQUE7QUFBQTtBQUFBO0FBQUEsbUJBQWtEO0FBQUEsZUFGcEQ7QUFBQTtBQUFBO0FBQUE7QUFBQSxpQkFHQTtBQUFBLFVBQ0EsdUJBQUMsVUFDQztBQUFBLG1DQUFDLFlBQU8sTUFBSyxVQUFTLFVBQVVxRixjQUFjLEdBQUcsY0FBWSxVQUFVelcsS0FBS3lDLEtBQUssWUFBWSxTQUFTLE1BQU1zUCxPQUFPLDZCQUE2QixDQUFDaFAsVUFBVTtBQUFFLG9CQUFNLENBQUNtSSxLQUFLLElBQUluSSxNQUFNMFEsTUFBTXpRLE9BQU95VCxXQUFXLENBQUM7QUFBRzFULG9CQUFNMFEsTUFBTXpRLE9BQU95VCxZQUFZLEdBQUcsR0FBR3ZMLEtBQUs7QUFBQSxZQUFHLENBQUMsR0FBRyxpQkFBaFE7QUFBQTtBQUFBO0FBQUE7QUFBQSxtQkFBaVE7QUFBQSxZQUNqUSx1QkFBQyxZQUFPLE1BQUssVUFBUyxVQUFVdUwsY0FBYy9LLE9BQU8rSCxNQUFNbFcsU0FBUyxHQUFHLGNBQVksVUFBVXlDLEtBQUt5QyxLQUFLLFVBQVUsU0FBUyxNQUFNc1AsT0FBTyw2QkFBNkIsQ0FBQ2hQLFVBQVU7QUFBRSxvQkFBTSxDQUFDbUksS0FBSyxJQUFJbkksTUFBTTBRLE1BQU16USxPQUFPeVQsV0FBVyxDQUFDO0FBQUcxVCxvQkFBTTBRLE1BQU16USxPQUFPeVQsWUFBWSxHQUFHLEdBQUd2TCxLQUFLO0FBQUEsWUFBRyxDQUFDLEdBQUcsaUJBQXBSO0FBQUE7QUFBQTtBQUFBO0FBQUEsbUJBQXFSO0FBQUEsZUFGdlI7QUFBQTtBQUFBO0FBQUE7QUFBQSxpQkFHQTtBQUFBLGFBVmlEbEwsS0FBS29SLE9BQXhEO0FBQUE7QUFBQTtBQUFBO0FBQUEsZUFXQTtBQUFBLE1BQ0QsS0FkSDtBQUFBO0FBQUE7QUFBQTtBQUFBLGFBZUE7QUFBQSxTQWhCRjtBQUFBO0FBQUE7QUFBQTtBQUFBLFdBaUJBO0FBQUEsSUFDQSx1QkFBQyxPQUFFLFdBQVUscUJBQW9CLHVLQUFqQztBQUFBO0FBQUE7QUFBQTtBQUFBLFdBQXdMO0FBQUEsT0F0QzFMO0FBQUE7QUFBQTtBQUFBO0FBQUEsU0F1Q0E7QUFFSjtBQUFDdUYsTUFuRVFSO0FBcUVULFNBQVNTLGdCQUFnQixFQUFFL1QsT0FBT2xDLFVBQVUxRCxRQUFRLEdBQUc7QUFDckQsUUFBTUYsZUFBZXdDLGdCQUFnQm9CLFNBQVM3RCxVQUFVRyxRQUFRdEIsRUFBRTtBQUNsRSxRQUFNcUIsV0FBVzJELFNBQVNoQixVQUFVM0M7QUFDcEMsUUFBTTZaLGNBQWM1WixRQUFRRyxPQUFPQyxLQUFLTCxRQUFRO0FBQ2hELFFBQU1HLE1BQU0wWixlQUFlQSxZQUFZdlosS0FBSyxLQUFLdVosWUFBWXZaLEtBQUssSUFBSXVaLGNBQWM7QUFDcEYsUUFBTXhFLFFBQVF6UyxpQkFBaUJlLFNBQVNDLGNBQWMzRCxTQUFTMEQsU0FBU3FELFVBQVVsRSxPQUFPO0FBQ3pGLFFBQU1nWCxXQUFXOWIsS0FBS0MsSUFBSSxPQUFPRCxLQUFLRSxJQUFJLE1BQU9SLGdDQUFnQzJYLEtBQUssQ0FBQyxDQUFDO0FBQ3hGLFFBQU0wRSxjQUFjQSxDQUFDeEUsV0FBVzFQLE1BQU1DLE9BQU8sU0FBU3lQLE1BQU0sa0JBQWtCLENBQUN4UCxVQUFVO0FBQ3ZGLFVBQU1pVSxXQUFVO0FBQUEsTUFDZEMsTUFBTTtBQUFBLFFBQ0osRUFBRTNaLElBQUksR0FBR1gsUUFBUSxDQUFDLEdBQUcsR0FBRyxDQUFDLEdBQUdDLGNBQWMsQ0FBQyxHQUFHLEdBQUcsRUFBRSxHQUFHTixLQUFLLElBQUlDLE1BQU0sR0FBRzJhLFFBQVEsYUFBYTtBQUFBLFFBQzdGLEVBQUU1WixJQUFJLEdBQUdYLFFBQVEsQ0FBQyxHQUFHLEdBQUcsSUFBSSxHQUFHQyxjQUFjLENBQUMsR0FBRyxHQUFHLEVBQUUsR0FBR04sS0FBSyxJQUFJQyxNQUFNLEdBQUcyYSxRQUFRLGFBQWE7QUFBQSxNQUFDO0FBQUEsTUFFbkdDLE9BQU87QUFBQSxRQUNMLEVBQUU3WixJQUFJLEdBQUdYLFFBQVEsQ0FBQyxNQUFNLEdBQUcsQ0FBQyxHQUFHQyxjQUFjLENBQUMsS0FBSyxHQUFHLEVBQUUsR0FBR04sS0FBSyxJQUFJQyxNQUFNLEdBQUcyYSxRQUFRLGFBQWE7QUFBQSxRQUNsRyxFQUFFNVosSUFBSSxHQUFHWCxRQUFRLENBQUMsS0FBSyxHQUFHLENBQUMsR0FBR0MsY0FBYyxDQUFDLE1BQU0sR0FBRyxFQUFFLEdBQUdOLEtBQUssSUFBSUMsTUFBTSxHQUFHMmEsUUFBUSxhQUFhO0FBQUEsTUFBQztBQUFBLE1BRXJHRSxPQUFPO0FBQUEsUUFDTCxFQUFFOVosSUFBSSxHQUFHWCxRQUFRLENBQUMsTUFBTSxHQUFHLENBQUMsR0FBR0MsY0FBYyxDQUFDLEtBQUssR0FBRyxFQUFFLEdBQUdOLEtBQUssSUFBSUMsTUFBTSxPQUFPMmEsUUFBUSxhQUFhO0FBQUEsUUFDdEcsRUFBRTVaLElBQUksS0FBS1gsUUFBUSxDQUFDLEtBQUssTUFBTSxDQUFDLEdBQUdDLGNBQWMsQ0FBQyxNQUFNLE1BQU0sRUFBRSxHQUFHTixLQUFLLElBQUlDLE1BQU0sTUFBTTJhLFFBQVEsYUFBYTtBQUFBLFFBQzdHLEVBQUU1WixJQUFJLEdBQUdYLFFBQVEsQ0FBQyxHQUFHLEdBQUcsQ0FBQyxHQUFHQyxjQUFjLENBQUMsR0FBRyxHQUFHLEVBQUUsR0FBR04sS0FBSyxJQUFJQyxNQUFNLEdBQUcyYSxRQUFRLGFBQWE7QUFBQSxNQUFDO0FBQUEsTUFFaEdHLFFBQVE7QUFBQSxRQUNOLEVBQUUvWixJQUFJLEdBQUdYLFFBQVEsQ0FBQyxHQUFHLE9BQU8sR0FBRyxHQUFHQyxjQUFjLENBQUMsR0FBRyxLQUFLLEVBQUUsR0FBR04sS0FBSyxJQUFJQyxNQUFNLEdBQUcyYSxRQUFRLGFBQWE7QUFBQSxRQUNyRyxFQUFFNVosSUFBSSxHQUFHWCxRQUFRLENBQUMsR0FBRyxHQUFHLENBQUMsR0FBR0MsY0FBYyxDQUFDLEdBQUcsR0FBRyxFQUFFLEdBQUdOLEtBQUssSUFBSUMsTUFBTSxHQUFHMmEsUUFBUSxhQUFhO0FBQUEsTUFBQztBQUFBLE1BRWhHSSxTQUFTO0FBQUEsUUFDUCxFQUFFaGEsSUFBSSxHQUFHWCxRQUFRLENBQUMsS0FBSyxLQUFLLENBQUMsR0FBR0MsY0FBYyxDQUFDLE1BQU0sTUFBTSxFQUFFLEdBQUdOLEtBQUssSUFBSUMsTUFBTSxNQUFNMmEsUUFBUSxhQUFhO0FBQUEsUUFDMUcsRUFBRTVaLElBQUksR0FBR1gsUUFBUSxDQUFDLEdBQUcsR0FBRyxDQUFDLEdBQUdDLGNBQWMsQ0FBQyxHQUFHLEdBQUcsRUFBRSxHQUFHTixLQUFLLElBQUlDLE1BQU0sR0FBRzJhLFFBQVEsYUFBYTtBQUFBLE1BQUM7QUFBQSxJQUVsRztBQUNBblUsVUFBTTdGLFNBQVNILFlBQVksRUFBRUssT0FBT0MsT0FBTzJaLFNBQVF6RSxNQUFNO0FBQ3pEL1Usd0JBQW9CdUYsT0FBT2hHLFlBQVk7QUFBQSxFQUN6QyxHQUFHLEVBQUU0QyxXQUFXLEVBQUV1QixNQUFNLFdBQVcxQixXQUFXdkMsUUFBUXRCLEdBQUcsRUFBRSxDQUFDO0FBQzVELFFBQU00Yix3QkFBd0J0YSxRQUFRRyxPQUFPQyxLQUFLb0M7QUFBQUEsSUFBVSxDQUFDTyxTQUMzREEsS0FBSzFDLEtBQUssS0FBSzBDLEtBQUsxQyxLQUFLLEtBQUt0QyxLQUFLcUIsSUFBSTJELEtBQUsxQyxLQUFLd1osUUFBUSxJQUFJO0FBQUEsRUFDOUQ7QUFDRCxRQUFNVSxTQUFTQSxNQUFNO0FBQ25CLFFBQUlELHlCQUF5QixHQUFHO0FBQzlCMVUsWUFBTVksYUFBYSxFQUFFdkMsTUFBTSxjQUFjMUIsV0FBV3ZDLFFBQVF0QixJQUFJcUIsVUFBVXVhLHNCQUFzQixDQUFDO0FBQ2pHO0FBQUEsSUFDRjtBQUNBLFVBQU1FLGlCQUFpQnhhLFFBQVFHLE9BQU9DLEtBQUtvQyxVQUFVLENBQUNPLFNBQVNBLEtBQUsxQyxLQUFLd1osUUFBUTtBQUNqRixVQUFNWSxtQkFBbUJELGlCQUFpQixJQUFJeGEsUUFBUUcsT0FBT0MsS0FBS0UsU0FBU2thO0FBQzNFLFVBQU1FLFVBQVVuZSx5QkFBeUJtSCxTQUFTQyxjQUFjRCxTQUFTcUQsVUFBVWxFLE9BQU87QUFDMUYsVUFBTThYLFFBQVFqWCxTQUFTN0QsU0FBU3VVLFFBQVFqVSxPQUFPeWEsU0FBVWxYLFNBQVNxRCxVQUFVbEUsVUFBVTZYLFFBQVF2YSxPQUFPMGE7QUFDckcsVUFBTUMsU0FBUztBQUFBLE1BQ2J6YSxJQUFJd1o7QUFBQUEsTUFDSm5hLFFBQVEsQ0FBQ2diLFFBQVF2YSxPQUFPMEIsU0FBUyxDQUFDLEdBQUc2WSxRQUFRdmEsT0FBTzBCLFNBQVMsQ0FBQyxHQUFHNlksUUFBUXZhLE9BQU8wQixTQUFTLENBQUMsSUFBSThZLEtBQUs7QUFBQSxNQUNuR2hiLGNBQWMrYSxRQUFRdmEsT0FBT1gsT0FBT2lJLElBQUksQ0FBQzNKLE9BQU9pZCxTQUFTamQsUUFBUTRjLFFBQVF2YSxPQUFPMEIsU0FBU2taLElBQUksQ0FBQztBQUFBLE1BQzlGMWIsS0FBS3FiLFFBQVF2YSxPQUFPZDtBQUFBQSxNQUNwQkMsTUFBTW9iLFFBQVF2YSxPQUFPYjtBQUFBQSxNQUNyQjJhLFFBQVE7QUFBQSxJQUNWO0FBQ0FyVSxVQUFNQyxPQUFPLGtCQUFrQixDQUFDQyxVQUFVO0FBQ3hDQSxZQUFNN0YsU0FBU0gsWUFBWSxFQUFFSyxPQUFPQyxLQUFLMkQsS0FBSytXLE1BQU07QUFDcERoVixZQUFNN0YsU0FBU0gsWUFBWSxFQUFFSyxPQUFPQyxLQUFLK0UsS0FBSyxDQUFDQyxHQUFHQyxNQUFNRCxFQUFFL0UsS0FBS2dGLEVBQUVoRixFQUFFO0FBQUEsSUFDckUsR0FBRyxFQUFFcUMsV0FBVyxFQUFFdUIsTUFBTSxjQUFjMUIsV0FBV3ZDLFFBQVF0QixJQUFJcUIsVUFBVTBhLGlCQUFpQixFQUFFLENBQUM7QUFBQSxFQUM3RjtBQUNBLFFBQU1WLFVBQVUsdUJBQUMsU0FBSSxXQUFVLCtCQUErQixXQUFDLFFBQVEsU0FBUyxTQUFTLFVBQVUsU0FBUyxFQUFFdFMsSUFBSSxDQUFDdVQsU0FBUyx1QkFBQyxZQUFPLE1BQUssVUFBb0IsU0FBUyxNQUFNbEIsWUFBWWtCLElBQUksR0FBSUEsa0JBQXpDQSxNQUEzQjtBQUFBO0FBQUE7QUFBQTtBQUFBLFNBQXlFLENBQVMsS0FBOUw7QUFBQTtBQUFBO0FBQUE7QUFBQSxTQUFnTTtBQUNoTixNQUFJLENBQUM5YSxLQUFLO0FBQ1IsV0FBTyxtQ0FBRTtBQUFBLDZCQUFDLFlBQU87QUFBQSwrQkFBQyxVQUFLLDRCQUFOO0FBQUE7QUFBQTtBQUFBO0FBQUEsZUFBa0I7QUFBQSxRQUFPLHVCQUFDLFlBQU8sb0NBQVI7QUFBQTtBQUFBO0FBQUE7QUFBQSxlQUE0QjtBQUFBLFdBQTdEO0FBQUE7QUFBQTtBQUFBO0FBQUEsYUFBc0U7QUFBQSxNQUFTLHVCQUFDLE9BQUUsV0FBVSxxQkFBb0Isb0pBQWpDO0FBQUE7QUFBQTtBQUFBO0FBQUEsYUFBcUs7QUFBQSxNQUFLNlo7QUFBQUEsTUFBUSx1QkFBQyxZQUFPLE1BQUssVUFBUyxXQUFVLDRCQUEyQixTQUFTUSxRQUFRO0FBQUE7QUFBQSxRQUFtQm5YLG9CQUFvQnlXLFFBQVE7QUFBQSxXQUEzSDtBQUFBO0FBQUE7QUFBQTtBQUFBLGFBQTZIO0FBQUEsU0FBaFk7QUFBQTtBQUFBO0FBQUE7QUFBQSxXQUF5WTtBQUFBLEVBQ2xaO0FBQ0EsUUFBTS9FLFNBQVNBLENBQUM1VixPQUFPcEIsVUFBVThILE1BQU1DLE9BQU8sZUFBZTNHLEtBQUssSUFBSSxDQUFDNEcsVUFBVTtBQUMvRUEsVUFBTTdGLFNBQVNILFlBQVksRUFBRUssT0FBT0MsS0FBS0wsUUFBUSxFQUFFYixLQUFLLElBQUkrYixNQUFNQyxRQUFRcGQsS0FBSyxJQUFJLENBQUMsR0FBR0EsS0FBSyxJQUFJQTtBQUNoRyxRQUFJTyxtQkFBbUJ3SixJQUFJM0ksS0FBSyxFQUFHVSxvQkFBbUJrRyxPQUFPaEcsY0FBY0MsUUFBUTtBQUFBLEVBQ3JGLEdBQUcsRUFBRTJPLGFBQWEsVUFBVTFPLFFBQVF0QixFQUFFLElBQUlxQixRQUFRLElBQUliLEtBQUssSUFBSXdELFdBQVdnQixTQUFTaEIsVUFBVSxDQUFDO0FBQzlGLFFBQU15WSxlQUFlQSxDQUFDamMsT0FBTzZiLE1BQU1qZCxVQUFVO0FBQzNDLFVBQU13TCxPQUFPLENBQUMsR0FBR3BKLElBQUloQixLQUFLLENBQUM7QUFDM0JvSyxTQUFLeVIsSUFBSSxJQUFJamQ7QUFDYmdYLFdBQU81VixPQUFPb0ssSUFBSTtBQUFBLEVBQ3BCO0FBQ0EsUUFBTWdLLGVBQWV6Vyx1Q0FBdUNtRCxRQUFRRyxPQUFPQyxNQUFNTCxRQUFRO0FBQ3pGLFFBQU1xYixjQUFjMVgsU0FBUzhGLG1CQUFtQixXQUFXLG1CQUFtQjtBQUM5RSxRQUFNNlIsY0FBYzNYLFNBQVM4RixtQkFBbUIsV0FBVyxrQkFBa0I7QUFDN0UsUUFBTThSLGVBQWVBLENBQUN4ZCxVQUFVOEgsTUFBTUMsT0FBTyx5QkFBeUIsQ0FBQ0MsVUFBVTtBQUMvRUEsVUFBTTdGLFNBQVNILFlBQVksRUFBRXNiLFdBQVcsSUFBSXRkO0FBQUFBLEVBQzlDLEdBQUcsRUFBRTRRLGFBQWEsV0FBVzFPLFFBQVF0QixFQUFFLElBQUkwYyxXQUFXLElBQUkxWSxXQUFXZ0IsU0FBU2hCLFVBQVUsQ0FBQztBQUN6RixTQUNFLG1DQUNFO0FBQUEsMkJBQUMsWUFBTztBQUFBLDZCQUFDLFVBQUssMEJBQU47QUFBQTtBQUFBO0FBQUE7QUFBQSxhQUFnQjtBQUFBLE1BQU8sdUJBQUMsWUFBUVU7QUFBQUEsNEJBQW9CbEQsSUFBSUcsRUFBRTtBQUFBLFFBQUU7QUFBQSxRQUFVTCxRQUFRd0Y7QUFBQUEsV0FBdkQ7QUFBQTtBQUFBO0FBQUE7QUFBQSxhQUE2RDtBQUFBLFNBQTVGO0FBQUE7QUFBQTtBQUFBO0FBQUEsV0FBcUc7QUFBQSxJQUNwR3VVO0FBQUFBLElBQ0Q7QUFBQSxNQUFDO0FBQUE7QUFBQSxRQUNDLE9BQU07QUFBQSxRQUNOLE9BQU8vWSxRQUFRZCxJQUFJRyxLQUFLLEtBQUs4QyxRQUFRLENBQUMsQ0FBQztBQUFBLFFBQ3ZDLEtBQUtuQyxRQUFRc1MsYUFBYXRWLE1BQU0sS0FBS21GLFFBQVEsQ0FBQyxDQUFDO0FBQUEsUUFDL0MsS0FBS25DLFFBQVFzUyxhQUFhclYsTUFBTSxLQUFLa0YsUUFBUSxDQUFDLENBQUM7QUFBQSxRQUMvQyxNQUFNO0FBQUEsUUFDTixNQUFLO0FBQUEsUUFDTCxVQUFVLENBQUNyRixVQUFVZ1gsT0FBTyxNQUFNL1csS0FBS0MsSUFBSXNWLGFBQWFyVixLQUFLRixLQUFLRSxJQUFJcVYsYUFBYXRWLEtBQUtQLGdDQUFnQ0ssUUFBUSxHQUFHLENBQUMsQ0FBQyxDQUFDO0FBQUE7QUFBQSxNQVB4STtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUEsSUFPMEk7QUFBQSxJQUUxSSx1QkFBQyxrQkFBZSxPQUFPdWQsYUFBYSxPQUFPcmIsUUFBUW9iLFdBQVcsR0FBRyxLQUFLLEdBQUcsS0FBSyxHQUFHLE1BQU0sTUFBTSxNQUFLLE1BQUssVUFBVUUsZ0JBQWpIO0FBQUE7QUFBQTtBQUFBO0FBQUEsV0FBOEg7QUFBQSxJQUM3SCxDQUFDLFlBQVksWUFBWSxnQkFBZ0IsRUFBRTdULElBQUksQ0FBQ2pDLE9BQU91VixTQUFTLHVCQUFDLGtCQUEyQixPQUFjLE9BQU83YSxJQUFJUixPQUFPcWIsSUFBSSxHQUFHLEtBQUssSUFBSSxLQUFLLEdBQUcsTUFBTSxNQUFNLE1BQUssTUFBSyxVQUFVLENBQUNqZCxVQUFVcWQsYUFBYSxVQUFVSixNQUFNamQsS0FBSyxLQUE1STBILE9BQXJCO0FBQUE7QUFBQTtBQUFBO0FBQUEsV0FBbUssQ0FBRztBQUFBLElBQ3RPLENBQUMsU0FBUyxTQUFTLFdBQVcsRUFBRWlDLElBQUksQ0FBQ2pDLE9BQU91VixTQUFTLHVCQUFDLGtCQUEyQixPQUFjLE9BQU83YSxJQUFJUCxhQUFhb2IsSUFBSSxHQUFHLEtBQUssSUFBSSxLQUFLLEdBQUcsTUFBTSxNQUFNLE1BQUssTUFBSyxVQUFVLENBQUNqZCxVQUFVcWQsYUFBYSxnQkFBZ0JKLE1BQU1qZCxLQUFLLEtBQXhKMEgsT0FBckI7QUFBQTtBQUFBO0FBQUE7QUFBQSxXQUErSyxDQUFHO0FBQUEsSUFDeE8sdUJBQUMsa0JBQWUsT0FBTSxpQkFBZ0IsT0FBT3RGLElBQUliLEtBQUssS0FBSyxJQUFJLEtBQUssSUFBSSxNQUFNLEdBQUcsTUFBSyxLQUFJLFVBQVUsQ0FBQ3ZCLFVBQVVnWCxPQUFPLE9BQU9oWCxLQUFLLEtBQWxJO0FBQUE7QUFBQTtBQUFBO0FBQUEsV0FBb0k7QUFBQSxJQUNwSSx1QkFBQyxrQkFBZSxPQUFNLFFBQU8sT0FBT29DLElBQUlaLE1BQU0sS0FBSyxNQUFNLEtBQUssS0FBSyxNQUFNLE1BQU0sTUFBSyxPQUFNLFVBQVUsQ0FBQ3hCLFVBQVVnWCxPQUFPLFFBQVFoWCxLQUFLLEtBQW5JO0FBQUE7QUFBQTtBQUFBO0FBQUEsV0FBcUk7QUFBQSxJQUNySSx1QkFBQyxZQUFTLE9BQU0sVUFBUyxpQ0FBQyxZQUFPLE9BQU9vQyxJQUFJK1osUUFBUSxVQUFVLENBQUMxVCxVQUFVdU8sT0FBTyxVQUFVdk8sTUFBTS9HLE9BQU8xQixLQUFLLEdBQUc7QUFBQSw2QkFBQyxZQUFPLE9BQU0sY0FBYSwwQkFBM0I7QUFBQTtBQUFBO0FBQUE7QUFBQSxhQUFxQztBQUFBLE1BQVMsdUJBQUMsWUFBTyxPQUFNLGVBQWMsMkJBQTVCO0FBQUE7QUFBQTtBQUFBO0FBQUEsYUFBdUM7QUFBQSxTQUEzSztBQUFBO0FBQUE7QUFBQTtBQUFBLFdBQW9MLEtBQTdNO0FBQUE7QUFBQTtBQUFBO0FBQUEsV0FBc047QUFBQSxJQUN0Tix1QkFBQyxZQUFPLE1BQUssVUFBUyxXQUFVLDRCQUEyQixVQUFVd2MseUJBQXlCLEdBQUcsU0FBU0MsUUFBU0QsbUNBQXlCLElBQUkseUJBQXlCbFgsb0JBQW9CeVcsUUFBUSxDQUFDLEtBQUssc0JBQXNCelcsb0JBQW9CeVcsUUFBUSxDQUFDLE1BQTlQO0FBQUE7QUFBQTtBQUFBO0FBQUEsV0FBaVE7QUFBQSxJQUNqUSx1QkFBQyxZQUFPLE1BQUssVUFBUyxXQUFVLHVCQUFzQixTQUFTLE1BQU1qVSxNQUFNQyxPQUFPLHFCQUFxQixDQUFDQyxVQUFVO0FBQUVBLFlBQU03RixTQUFTSCxZQUFZLEVBQUVLLE9BQU9DLEtBQUsyRixPQUFPaEcsVUFBVSxDQUFDO0FBQUEsSUFBRyxHQUFHLEVBQUUyQyxXQUFXLEVBQUV1QixNQUFNLFdBQVcxQixXQUFXdkMsUUFBUXRCLEdBQUcsRUFBRSxDQUFDLEdBQUcsMEJBQWpQO0FBQUE7QUFBQTtBQUFBO0FBQUEsV0FBMlA7QUFBQSxPQW5CN1A7QUFBQTtBQUFBO0FBQUE7QUFBQSxTQW9CQTtBQUVKO0FBQUM2YyxNQXJHUTVCO0FBdUdULE1BQU02Qix3QkFBd0I1YyxPQUFPQyxPQUFPO0FBQUEsRUFDMUMsWUFBWTtBQUFBLEVBQ1osZUFBZTtBQUFBLEVBQ2Ysc0JBQXNCO0FBQUEsRUFDdEIsZUFBZTtBQUNqQixDQUFDO0FBRUQsU0FBUzRjLGVBQWUsRUFBRTdWLE9BQU9sQyxVQUFVMUQsU0FBUzBiLGVBQWUsR0FBRztBQUNwRSxRQUFNNWIsZUFBZXdDLGdCQUFnQm9CLFNBQVM3RCxVQUFVRyxRQUFRdEIsRUFBRTtBQUNsRSxNQUFJc0IsUUFBUWtFLE1BQU1DLFNBQVMsT0FBTztBQUNoQyxXQUFPLG1DQUFFO0FBQUEsNkJBQUMsWUFBTztBQUFBLCtCQUFDLFVBQUssMkJBQU47QUFBQTtBQUFBO0FBQUE7QUFBQSxlQUFpQjtBQUFBLFFBQU8sdUJBQUMsWUFBTywrQkFBUjtBQUFBO0FBQUE7QUFBQTtBQUFBLGVBQXVCO0FBQUEsV0FBdkQ7QUFBQTtBQUFBO0FBQUE7QUFBQSxhQUFnRTtBQUFBLE1BQVMsdUJBQUMsT0FBRSxXQUFVLHFCQUFvQix5SEFBakM7QUFBQTtBQUFBO0FBQUE7QUFBQSxhQUEwSTtBQUFBLE1BQUksdUJBQUMsWUFBTyxNQUFLLFVBQVMsV0FBVSw0QkFBMkIsU0FBUyxNQUFNeUIsTUFBTUMsT0FBTyxxQkFBcUIsQ0FBQ0MsVUFBVTtBQUNyVkEsY0FBTTdGLFNBQVNILFlBQVksRUFBRW9FLFFBQVEvSCw0QkFBNEIySixNQUFNN0YsU0FBU2tTLE1BQU0sR0FBR3JTLFlBQVksRUFBRW1ILFFBQVEsRUFBRXpJLEtBQUssQ0FBQ3VFLFNBQVNBLEtBQUttQixNQUFNQyxTQUFTLEtBQUssR0FBR0QsU0FBUzRCLE1BQU03RixTQUFTLENBQUMsRUFBRWlFLEtBQUs7QUFBQSxNQUM5TCxDQUFDLEdBQUcsaUNBRjROO0FBQUE7QUFBQTtBQUFBO0FBQUEsYUFFM007QUFBQSxTQUZkO0FBQUE7QUFBQTtBQUFBO0FBQUEsV0FFdUI7QUFBQSxFQUNoQztBQUNBLFFBQU1BLFFBQVFsRSxRQUFRa0U7QUFDdEIsUUFBTXlYLFFBQVFsZ0Isa0NBQWtDeUksTUFBTXVQLE9BQU87QUFDN0QsUUFBTW1JLGtCQUFrQnRmLHNDQUFzQ29ILFNBQVNDLGNBQWM3RCxZQUFZO0FBQ2pHLFFBQU0rYixnQkFBZ0I5ZCxLQUFLRSxJQUFJMmQsaUJBQWlCMVgsTUFBTUUsYUFBYThCLEtBQUssQ0FBQztBQUN6RSxRQUFNNFYsb0JBQW9CNVgsTUFBTUUsYUFBYUgsU0FBUztBQUN0RCxRQUFNOFgsd0JBQXdCLENBQUMsU0FBUyxnQkFBZ0IsRUFBRUMsU0FBUzlYLE1BQU1FLGFBQWFILElBQUk7QUFDMUYsUUFBTWdZLHVCQUF1QnZZLFNBQVM3RCxTQUFTSSxTQUM1Q2tTLE1BQU0sR0FBR3JTLFlBQVksRUFDckJtSCxRQUFRLEVBQ1J6SSxLQUFLLENBQUN1RSxTQUFTQSxLQUFLbUIsTUFBTUMsU0FBUyxLQUFLO0FBQzNDLFFBQU0rWCxjQUFjemdCLGtDQUFrQ3dnQixzQkFBc0IvWCxNQUFNdVAsV0FBV3ZQLE1BQU11UCxPQUFPO0FBQzFHLFFBQU0wSSxXQUFXVCxnQkFBZ0JVLGtCQUFrQkosU0FBU2hjLFFBQVF0QixFQUFFO0FBQ3RFLFFBQU0yZCx1QkFBdUJYLGdCQUFnQlksZ0NBQWdDLFdBQ3pFLFdBQ0FaLGdCQUFnQlksZ0NBQWdDLFlBQzlDLGNBQ0FILFdBQ0VULGdCQUFnQmEsMEJBQTBCYixnQkFBZ0JjLDRCQUE0QnhjLFFBQVF0QixLQUM1RixzQkFDQSxVQUNGO0FBQ1IsUUFBTW9XLFNBQVNBLENBQUN0UCxPQUFPdVAsUUFBUXJHLGNBQWMsU0FBUzlJLE1BQU1DLE9BQU9MLE9BQU8sQ0FBQ00sVUFBVWlQLE9BQU9qUCxNQUFNN0YsU0FBU0gsWUFBWSxFQUFFb0UsS0FBSyxHQUFHLEVBQUV3SyxhQUFhaE0sV0FBV2dCLFNBQVNoQixVQUFVLENBQUM7QUFDL0ssUUFBTStaLFdBQVdBLENBQUNoSixZQUFZN04sTUFBTTZSLFNBQVMsc0JBQXNCaGMsa0NBQWtDZ1ksT0FBTyxFQUFFak8sS0FBSyxJQUFJLENBQUNNLFVBQVU7QUFDaEksVUFBTXRHLFNBQVNzRyxNQUFNN0YsU0FBU0gsWUFBWSxFQUFFb0U7QUFDNUMxRSxXQUFPaVUsVUFBVUE7QUFDakJqVSxXQUFPa2Qsa0JBQWtCOWQsT0FBTytkLFlBQVlsaEIsa0NBQWtDZ1ksT0FBTyxFQUFFbUosV0FBV25WLElBQUksQ0FBQ2hKLFlBQVksQ0FBQ0EsUUFBUUMsSUFBSUQsUUFBUUMsT0FBTyxZQUFZLEtBQUtELFFBQVFULE1BQU1TLFFBQVFSLE9BQU8sQ0FBQyxDQUFDLENBQUM7QUFBQSxFQUNsTSxDQUFDO0FBQ0QsU0FDRSxtQ0FDRTtBQUFBLDJCQUFDLFlBQU87QUFBQSw2QkFBQyxVQUFLLDBCQUFOO0FBQUE7QUFBQTtBQUFBO0FBQUEsYUFBZ0I7QUFBQSxNQUFPLHVCQUFDLFlBQVEwZCxpQkFBT25XLFNBQVN0QixNQUFNdVAsV0FBL0I7QUFBQTtBQUFBO0FBQUE7QUFBQSxhQUF1QztBQUFBLFNBQXRFO0FBQUE7QUFBQTtBQUFBO0FBQUEsV0FBK0U7QUFBQSxJQUMvRSx1QkFBQyxTQUFJLFdBQVUsOEJBQ1o3VSxpQkFBT2llLE9BQU9waEIsaUNBQWlDLEVBQUVnTTtBQUFBQSxNQUFJLENBQUMxRSxTQUNyRCx1QkFBQyxZQUFPLE1BQUssVUFBdUIsVUFBVS9DLFFBQVE4TSxRQUFRLFdBQVcvSixLQUFLckUsT0FBT3dGLE1BQU11UCxVQUFVLGdCQUFnQixJQUFJLFNBQVMsTUFBTWdKLFNBQVMxWixLQUFLckUsRUFBRSxHQUN0SjtBQUFBLCtCQUFDLFNBQUQ7QUFBQTtBQUFBO0FBQUE7QUFBQSxlQUFFO0FBQUEsUUFBRyx1QkFBQyxVQUFLO0FBQUEsaUNBQUMsWUFBUXFFLGVBQUt5QyxTQUFkO0FBQUE7QUFBQTtBQUFBO0FBQUEsaUJBQW9CO0FBQUEsVUFBUyx1QkFBQyxXQUFNO0FBQUE7QUFBQSxZQUFNekMsS0FBSytaO0FBQUFBLFlBQUs7QUFBQSxlQUF2QjtBQUFBO0FBQUE7QUFBQTtBQUFBLGlCQUFxQztBQUFBLGFBQXhFO0FBQUE7QUFBQTtBQUFBO0FBQUEsZUFBZ0Y7QUFBQSxXQUQ1RC9aLEtBQUtyRSxJQUFoQztBQUFBO0FBQUE7QUFBQTtBQUFBLGFBRUE7QUFBQSxJQUNELEtBTEg7QUFBQTtBQUFBO0FBQUE7QUFBQSxXQU1BO0FBQUEsSUFDQ2dGLFNBQVM2VCxXQUFXLHVCQUFDLFNBQUksV0FBVSxvQkFBbUI7QUFBQSw2QkFBQyxVQUFLO0FBQUE7QUFBQSxRQUFRN1QsU0FBUzZULFNBQVMvUjtBQUFBQSxXQUFoQztBQUFBO0FBQUE7QUFBQTtBQUFBLGFBQXNDO0FBQUEsTUFBTyx1QkFBQyxZQUFPLE1BQUssVUFBUyxTQUFTLE1BQU1JLE1BQU00UixVQUFVLEdBQUcsc0JBQXhEO0FBQUE7QUFBQTtBQUFBO0FBQUEsYUFBOEQ7QUFBQSxNQUFTLHVCQUFDLFlBQU8sTUFBSyxVQUFTLFdBQVUsY0FBYSxTQUFTLE1BQU01UixNQUFNK1IsU0FBUyxHQUFHLHFCQUE5RTtBQUFBO0FBQUE7QUFBQTtBQUFBLGFBQW1GO0FBQUEsU0FBek87QUFBQTtBQUFBO0FBQUE7QUFBQSxXQUFrUCxJQUFTO0FBQUEsSUFDaFIsdUJBQUMsYUFBUSxNQUFJLE1BQUM7QUFBQSw2QkFBQyxhQUFRLGdDQUFUO0FBQUE7QUFBQTtBQUFBO0FBQUEsYUFBeUI7QUFBQSxPQUNuQ2dFLE9BQU9pQixjQUFjLElBQUluVixJQUFJLENBQUNoSixZQUFZLHVCQUFDLGtCQUFnQyxPQUFPQSxRQUFRK0csT0FBTyxPQUFPdEIsTUFBTXdZLGdCQUFnQmplLFFBQVFDLEVBQUUsR0FBRyxLQUFLRCxRQUFRVCxLQUFLLEtBQUtTLFFBQVFSLEtBQUssTUFBTVEsUUFBUWtLLE1BQU0sTUFBTWxLLFFBQVFvSyxNQUFNLFVBQVUsQ0FBQy9LLFVBQVVnWCxPQUFPLFVBQVVyVyxRQUFRK0csS0FBSyxJQUFJLENBQUNNLFVBQVU7QUFBRUEsY0FBTTRXLGdCQUFnQmplLFFBQVFDLEVBQUUsSUFBSVo7QUFBQUEsTUFBTyxHQUFHLFNBQVNrQyxRQUFRdEIsRUFBRSxJQUFJRCxRQUFRQyxFQUFFLEVBQUUsS0FBN1NELFFBQVFDLElBQTdCO0FBQUE7QUFBQTtBQUFBO0FBQUEsYUFBb1UsQ0FBRztBQUFBLE1BQ25YLHVCQUFDLFNBQUksV0FBVSwrQkFBOEI7QUFBQSwrQkFBQyxZQUFPLE1BQUssVUFBUyxTQUFTLE1BQU1vVyxPQUFPLGdCQUFnQixDQUFDaFAsVUFBVTtBQUFFQSxnQkFBTWlYLE9BQU9oZixLQUFLaWYsTUFBTWpmLEtBQUtrZixPQUFPLElBQUksVUFBVTtBQUFBLFFBQUcsQ0FBQyxHQUFHLHNCQUFsSTtBQUFBO0FBQUE7QUFBQTtBQUFBLGVBQXdJO0FBQUEsUUFBUyx1QkFBQyxVQUFNL1ksZ0JBQU02WSxRQUFiO0FBQUE7QUFBQTtBQUFBO0FBQUEsZUFBa0I7QUFBQSxXQUFoTjtBQUFBO0FBQUE7QUFBQTtBQUFBLGFBQXVOO0FBQUEsU0FGek47QUFBQTtBQUFBO0FBQUE7QUFBQSxXQUdBO0FBQUEsSUFDQSx1QkFBQyxhQUFRLE1BQUksTUFBQztBQUFBLDZCQUFDLGFBQVEseUJBQVQ7QUFBQTtBQUFBO0FBQUE7QUFBQSxhQUFrQjtBQUFBLE1BQzlCLHVCQUFDLGtCQUFlLE9BQU0scUJBQW9CLE9BQU83WSxNQUFNZ1osaUJBQWlCLEtBQUssS0FBSyxLQUFLLElBQUksTUFBTSxNQUFNLE1BQUssTUFBSyxVQUFVLENBQUNwZixVQUFVZ1gsT0FBTyxjQUFjLENBQUNoUCxVQUFVO0FBQUVBLGNBQU1vWCxrQkFBa0JwZjtBQUFBQSxNQUFPLEdBQUcsU0FBU2tDLFFBQVF0QixFQUFFLFdBQVcsS0FBeE87QUFBQTtBQUFBO0FBQUE7QUFBQSxhQUEwTztBQUFBLE1BQzFPLHVCQUFDLGtCQUFlLE9BQU0sU0FBUSxPQUFPd0YsTUFBTWlaLFVBQVVDLE9BQU8sS0FBSyxLQUFLLEtBQUssR0FBRyxNQUFNLE1BQU0sVUFBVSxDQUFDdGYsVUFBVWdYLE9BQU8sZUFBZSxDQUFDaFAsVUFBVTtBQUFFQSxjQUFNcVgsVUFBVUMsUUFBUXRmO0FBQUFBLE1BQU8sR0FBRyxTQUFTa0MsUUFBUXRCLEVBQUUsUUFBUSxLQUEvTTtBQUFBO0FBQUE7QUFBQTtBQUFBLGFBQWlOO0FBQUEsU0FGbk47QUFBQTtBQUFBO0FBQUE7QUFBQSxXQUdBO0FBQUEsSUFDQSx1QkFBQyxhQUFRLE1BQUksTUFBQztBQUFBLDZCQUFDLGFBQVEsNkJBQVQ7QUFBQTtBQUFBO0FBQUE7QUFBQSxhQUFzQjtBQUFBLE1BQ2pDb2Qsb0JBQW9CLG1DQUNuQjtBQUFBLCtCQUFDLE9BQUUsV0FBVSxxQkFBb0I7QUFBQTtBQUFBLFVBQXFJRixnQkFBZ0J6WSxRQUFRLENBQUM7QUFBQSxVQUFFO0FBQUEsYUFBak07QUFBQTtBQUFBO0FBQUE7QUFBQSxlQUFrTTtBQUFBLFFBQ2xNLHVCQUFDLGtCQUFlLE9BQU0sU0FBUSxPQUFPZSxNQUFNRSxhQUFhVyxPQUFPLEtBQUssR0FBRyxLQUFLOFcsZUFBZSxNQUFNLE1BQU8sTUFBSyxhQUFZLFVBQVUsQ0FBQy9kLFVBQVVnWCxPQUFPLDJCQUEyQixDQUFDaFAsVUFBVTtBQUFFQSxnQkFBTTFCLGFBQWFXLFFBQVFoSCxLQUFLQyxJQUFJRixPQUFPZ0ksTUFBTTFCLGFBQWE4QixHQUFHO0FBQUEsUUFBRyxDQUFDLEtBQWxRO0FBQUE7QUFBQTtBQUFBO0FBQUEsZUFBb1E7QUFBQSxRQUNwUSx1QkFBQyxrQkFBZSxPQUFNLE9BQU0sT0FBT2hDLE1BQU1FLGFBQWE4QixLQUFLLEtBQUssR0FBRyxLQUFLMlYsZUFBZSxNQUFNLE1BQU8sTUFBSyxhQUFZLFVBQVUsQ0FBQy9kLFVBQVVnWCxPQUFPLHlCQUF5QixDQUFDaFAsVUFBVTtBQUFFQSxnQkFBTTFCLGFBQWE4QixNQUFNbkksS0FBS0UsSUFBSUgsT0FBT2dJLE1BQU0xQixhQUFhVyxLQUFLO0FBQUEsUUFBRyxDQUFDLEtBQTVQO0FBQUE7QUFBQTtBQUFBO0FBQUEsZUFBOFA7QUFBQSxRQUM5UCx1QkFBQyxZQUFTLE9BQU0sUUFBTyxpQ0FBQyxZQUFPLE9BQU9iLE1BQU1FLGFBQWFILE1BQU0sVUFBVSxDQUFDc0MsVUFBVXVPLE9BQU8sMEJBQTBCLENBQUNoUCxVQUFVO0FBQUVBLGdCQUFNMUIsYUFBYUgsT0FBT3NDLE1BQU0vRyxPQUFPMUI7QUFBQUEsUUFBTyxDQUFDLEdBQUc7QUFBQSxpQ0FBQyxZQUFPLE9BQU0sU0FBUSxxQkFBdEI7QUFBQTtBQUFBO0FBQUE7QUFBQSxpQkFBMkI7QUFBQSxVQUFTLHVCQUFDLFlBQU8sT0FBTSxrQkFBaUIsOEJBQS9CO0FBQUE7QUFBQTtBQUFBO0FBQUEsaUJBQTZDO0FBQUEsVUFBUyx1QkFBQyxZQUFPLE9BQU0sYUFBWSx5QkFBMUI7QUFBQTtBQUFBO0FBQUE7QUFBQSxpQkFBbUM7QUFBQSxVQUFTLHVCQUFDLFlBQU8sT0FBTSxRQUFPLG9CQUFyQjtBQUFBO0FBQUE7QUFBQTtBQUFBLGlCQUF5QjtBQUFBLGFBQTVUO0FBQUE7QUFBQTtBQUFBO0FBQUEsZUFBcVUsS0FBNVY7QUFBQTtBQUFBO0FBQUE7QUFBQSxlQUFxVztBQUFBLFFBQ3JXLHVCQUFDLFlBQVMsT0FBTSxVQUFTLGlDQUFDLFlBQU8sT0FBT29HLE1BQU1FLGFBQWE2VixRQUFRLFVBQVUsQ0FBQzFULFVBQVV1TyxPQUFPLDRCQUE0QixDQUFDaFAsVUFBVTtBQUFFQSxnQkFBTTFCLGFBQWE2VixTQUFTMVQsTUFBTS9HLE9BQU8xQjtBQUFBQSxRQUFPLENBQUMsR0FBRztBQUFBLGlDQUFDLFlBQU8sT0FBTSxVQUFTLHNCQUF2QjtBQUFBO0FBQUE7QUFBQTtBQUFBLGlCQUE2QjtBQUFBLFVBQVMsdUJBQUMsWUFBTyxPQUFNLGNBQWEsMEJBQTNCO0FBQUE7QUFBQTtBQUFBO0FBQUEsaUJBQXFDO0FBQUEsVUFBUyx1QkFBQyxZQUFPLE9BQU0sV0FBVSx1QkFBeEI7QUFBQTtBQUFBO0FBQUE7QUFBQSxpQkFBK0I7QUFBQSxVQUFTLHVCQUFDLFlBQU8sT0FBTSxZQUFXLHdCQUF6QjtBQUFBO0FBQUE7QUFBQTtBQUFBLGlCQUFpQztBQUFBLFVBQVMsdUJBQUMsWUFBTyxPQUFNLGVBQWMsMkJBQTVCO0FBQUE7QUFBQTtBQUFBO0FBQUEsaUJBQXVDO0FBQUEsVUFBUyx1QkFBQyxZQUFPLE9BQU0sUUFBTyxvQkFBckI7QUFBQTtBQUFBO0FBQUE7QUFBQSxpQkFBeUI7QUFBQSxhQUFsWjtBQUFBO0FBQUE7QUFBQTtBQUFBLGVBQTJaLEtBQXBiO0FBQUE7QUFBQTtBQUFBO0FBQUEsZUFBNmI7QUFBQSxRQUM3Yix1QkFBQyxPQUFFLFdBQVUscUJBQW9CO0FBQUE7QUFBQSxVQUFNb2UsYUFBYTFXLFNBQVM7QUFBQSxVQUFpQjtBQUFBLFVBQUltVyxPQUFPblcsU0FBU3RCLE1BQU11UDtBQUFBQSxVQUFRO0FBQUEsYUFBaEg7QUFBQTtBQUFBO0FBQUE7QUFBQSxlQUFpSDtBQUFBLFFBQ2pILHVCQUFDLFlBQVMsT0FBTSxrQkFBaUIsaUNBQUMsWUFBTyxjQUFXLGtCQUFpQixPQUFPdlAsTUFBTUUsYUFBYWlaLGdCQUFnQixVQUFVLENBQUN0Qix1QkFBdUIsT0FBT0Esd0JBQXdCLDREQUE0RCxtRUFBbUUsVUFBVSxDQUFDeFYsVUFBVXVPLE9BQU8seUJBQXlCLENBQUNoUCxVQUFVO0FBQUVBLGdCQUFNMUIsYUFBYWlaLGlCQUFpQjlXLE1BQU0vRyxPQUFPMUI7QUFBQUEsUUFBTyxDQUFDLEdBQUl6QywrQ0FBcUNvTSxJQUFJLENBQUN0RCxTQUFTLHVCQUFDLFlBQU8sT0FBT0EsTUFBa0JxWCxnQ0FBc0JyWCxJQUFJLEtBQUtBLFFBQXRDQSxNQUExQjtBQUFBO0FBQUE7QUFBQTtBQUFBLGVBQXFFLENBQVMsS0FBOWdCO0FBQUE7QUFBQTtBQUFBO0FBQUEsZUFBZ2hCLEtBQWpqQjtBQUFBO0FBQUE7QUFBQTtBQUFBLGVBQTBqQjtBQUFBLFFBQzFqQix1QkFBQyxPQUFFLFdBQVUscUJBQW9CLE1BQUssVUFBUyxhQUFVLFVBQVM7QUFBQTtBQUFBLFVBQWlCa1k7QUFBQUEsVUFBc0JGLFlBQVlULGdCQUFnQmMsNEJBQTRCeGMsUUFBUXRCLE1BQU1zQyxPQUFPaUUsU0FBU3lXLGdCQUFnQjRCLHlCQUF5QixJQUFJLE1BQU12ZixLQUFLMFMsTUFBTWlMLGVBQWU0Qiw0QkFBNEIsR0FBRyxDQUFDLHNCQUFzQjtBQUFBLFVBQUc7QUFBQSxhQUFyVTtBQUFBO0FBQUE7QUFBQTtBQUFBLGVBQXNVO0FBQUEsUUFDdFUsdUJBQUMsWUFBTyxNQUFLLFVBQVMsV0FBVSx1QkFBc0IsU0FBUyxNQUFNMVgsTUFBTUMsT0FBTywyQkFBMkIsQ0FBQ0MsVUFBVTtBQUN0SCxnQkFBTUcsYUFBYUgsTUFBTTdGLFNBQVNILFlBQVksRUFBRW9FLE1BQU1FO0FBQ3RENkIscUJBQVdsQixRQUFRO0FBQ25Ca0IscUJBQVdDLE1BQU07QUFDakJELHFCQUFXaEMsT0FBTztBQUFBLFFBQ3BCLEdBQUcsRUFBRXZCLFdBQVcsRUFBRXVCLE1BQU0sU0FBUzFCLFdBQVd2QyxRQUFRdEIsR0FBRyxFQUFFLENBQUMsR0FBRywyQ0FMN0Q7QUFBQTtBQUFBO0FBQUE7QUFBQSxlQUt3RjtBQUFBLFdBZHJFO0FBQUE7QUFBQTtBQUFBO0FBQUEsYUFlckIsSUFBTSxtQ0FDSjtBQUFBLCtCQUFDLE9BQUUsV0FBVSxxQkFBb0IsMkZBQWpDO0FBQUE7QUFBQTtBQUFBO0FBQUEsZUFBNEc7QUFBQSxRQUM1Ryx1QkFBQyxZQUFPLE1BQUssVUFBUyxXQUFVLDRCQUEyQixTQUFTLE1BQU1rSCxNQUFNQyxPQUFPLHdCQUF3QixDQUFDQyxVQUFVO0FBQ3hILGdCQUFNRyxhQUFhSCxNQUFNN0YsU0FBU0gsWUFBWSxFQUFFb0UsTUFBTUU7QUFDdEQ2QixxQkFBV2xCLFFBQVFoSCxLQUFLQyxJQUFJLE1BQU00ZCxlQUFlO0FBQ2pEM1YscUJBQVdDLE1BQU1uSSxLQUFLQyxJQUFJLE1BQU00ZCxlQUFlO0FBQy9DM1YscUJBQVdoQyxPQUFPO0FBQUEsUUFDcEIsR0FBRyxFQUFFdkIsV0FBVyxFQUFFdUIsTUFBTSxTQUFTMUIsV0FBV3ZDLFFBQVF0QixHQUFHLEVBQUUsQ0FBQyxHQUFHLHdDQUw3RDtBQUFBO0FBQUE7QUFBQTtBQUFBLGVBS3FGO0FBQUEsV0FQakY7QUFBQTtBQUFBO0FBQUE7QUFBQSxhQVFOO0FBQUEsU0F4QkY7QUFBQTtBQUFBO0FBQUE7QUFBQSxXQXlCQTtBQUFBLElBQ0EsdUJBQUMsYUFBUSxNQUFJLE1BQUM7QUFBQSw2QkFBQyxhQUFRLDhCQUFUO0FBQUE7QUFBQTtBQUFBO0FBQUEsYUFBdUI7QUFBQSxNQUNsQ3dGLE1BQU1xWixVQUFVOVYsSUFBSSxDQUFDMUUsTUFBTXlhLGtCQUFrQjtBQUM1QyxjQUFNQyxhQUFhamlCLHFDQUFxQ3VILEtBQUtyRSxFQUFFO0FBQy9ELGNBQU1nZixlQUFlQSxDQUFDN1csY0FBY2lPLE9BQU8sb0JBQW9CLENBQUNoUCxVQUFVO0FBQ3hFLGdCQUFNNlgsWUFBWUgsZ0JBQWdCM1c7QUFDbEMsY0FBSThXLFlBQVksS0FBS0EsYUFBYTdYLE1BQU15WCxVQUFVamQsT0FBUTtBQUMxRCxnQkFBTSxDQUFDMk4sS0FBSyxJQUFJbkksTUFBTXlYLFVBQVV4WCxPQUFPeVgsZUFBZSxDQUFDO0FBQ3ZEMVgsZ0JBQU15WCxVQUFVeFgsT0FBTzRYLFdBQVcsR0FBRzFQLEtBQUs7QUFBQSxRQUM1QyxDQUFDO0FBQ0QsZUFBTyx1QkFBQyxTQUFJLFdBQVUseUJBQTREO0FBQUEsaUNBQUMsU0FBSTtBQUFBLG1DQUFDLFdBQU07QUFBQSxxQ0FBQyxXQUFNLE1BQUssWUFBVyxTQUFTbEwsS0FBSzZhLFNBQVMsVUFBVSxDQUFDclgsVUFBVXVPLE9BQU8sVUFBVTJJLFlBQVlqWSxLQUFLLElBQUksQ0FBQ00sVUFBVTtBQUFFQSxzQkFBTXlYLFVBQVVDLGFBQWEsRUFBRUksVUFBVXJYLE1BQU0vRyxPQUFPK1c7QUFBQUEsY0FBUyxDQUFDLEtBQXRMO0FBQUE7QUFBQTtBQUFBO0FBQUEscUJBQXdMO0FBQUEsY0FBSWtILFlBQVlqWSxTQUFTekMsS0FBS3JFO0FBQUFBLGlCQUE3TjtBQUFBO0FBQUE7QUFBQTtBQUFBLG1CQUFnTztBQUFBLFlBQVEsdUJBQUMsVUFBSztBQUFBLHFDQUFDLFlBQU8sTUFBSyxVQUFTLFVBQVU4ZSxrQkFBa0IsR0FBRyxTQUFTLE1BQU1FLGFBQWEsRUFBRSxHQUFHLGNBQVcsb0JBQW1CLGlCQUFwSDtBQUFBO0FBQUE7QUFBQTtBQUFBLHFCQUFxSDtBQUFBLGNBQVMsdUJBQUMsWUFBTyxNQUFLLFVBQVMsVUFBVUYsa0JBQWtCdFosTUFBTXFaLFVBQVVqZCxTQUFTLEdBQUcsU0FBUyxNQUFNb2QsYUFBYSxDQUFDLEdBQUcsY0FBVyxzQkFBcUIsaUJBQTlJO0FBQUE7QUFBQTtBQUFBO0FBQUEscUJBQStJO0FBQUEsY0FBUztBQUFBLGNBQU9ELFlBQVlYLFFBQVE7QUFBQSxpQkFBdlQ7QUFBQTtBQUFBO0FBQUE7QUFBQSxtQkFBMlQ7QUFBQSxlQUF4aUI7QUFBQTtBQUFBO0FBQUE7QUFBQSxpQkFBK2lCO0FBQUEsV0FBUVcsWUFBWWIsY0FBYyxJQUFJblYsSUFBSSxDQUFDaEosWUFBWUEsUUFBUXdGLFNBQVMsVUFBVSx1QkFBQyxrQkFBZ0MsT0FBT3hGLFFBQVErRyxPQUFPLE9BQU96QyxLQUFLNlosV0FBV25lLFFBQVFDLEVBQUUsR0FBRyxLQUFLRCxRQUFRVCxLQUFLLEtBQUtTLFFBQVFSLEtBQUssTUFBTVEsUUFBUWtLLE1BQU0sTUFBTWxLLFFBQVFvSyxNQUFNLFVBQVUsQ0FBQy9LLFVBQVVnWCxPQUFPLFVBQVVyVyxRQUFRK0csS0FBSyxJQUFJLENBQUNNLFVBQVU7QUFBRUEsa0JBQU15WCxVQUFVQyxhQUFhLEVBQUVaLFdBQVduZSxRQUFRQyxFQUFFLElBQUlaO0FBQUFBLFVBQU8sR0FBRyxZQUFZa0MsUUFBUXRCLEVBQUUsSUFBSThlLGFBQWEsSUFBSS9lLFFBQVFDLEVBQUUsRUFBRSxLQUEvVUQsUUFBUUMsSUFBN0I7QUFBQTtBQUFBO0FBQUE7QUFBQSxpQkFBc1csSUFBTSx1QkFBQyxZQUEwQixPQUFPRCxRQUFRK0csT0FBTyxpQ0FBQyxZQUFPLE9BQU96QyxLQUFLNlosV0FBV25lLFFBQVFDLEVBQUUsR0FBRyxVQUFVLENBQUM2SCxVQUFVdU8sT0FBTyxVQUFVclcsUUFBUStHLEtBQUssSUFBSSxDQUFDTSxVQUFVO0FBQUVBLGtCQUFNeVgsVUFBVUMsYUFBYSxFQUFFWixXQUFXbmUsUUFBUUMsRUFBRSxJQUFJNkgsTUFBTS9HLE9BQU8xQjtBQUFBQSxVQUFPLENBQUMsR0FBSVcsa0JBQVFvZixRQUFRcFcsSUFBSSxDQUFDcVcsV0FBVyx1QkFBQyxZQUFxQkEsb0JBQVRBLFFBQWI7QUFBQTtBQUFBO0FBQUE7QUFBQSxpQkFBNkIsQ0FBUyxLQUF2UTtBQUFBO0FBQUE7QUFBQTtBQUFBLGlCQUF5USxLQUEzU3JmLFFBQVFDLElBQXZCO0FBQUE7QUFBQTtBQUFBO0FBQUEsaUJBQW1VLENBQVc7QUFBQSxhQUExMUMsR0FBR3FFLEtBQUtyRSxFQUFFLElBQUk4ZSxhQUFhLElBQXZFO0FBQUE7QUFBQTtBQUFBO0FBQUEsZUFBdzRDO0FBQUEsTUFDajVDLENBQUM7QUFBQSxTQVZIO0FBQUE7QUFBQTtBQUFBO0FBQUEsV0FXQTtBQUFBLE9BdkRGO0FBQUE7QUFBQTtBQUFBO0FBQUEsU0F3REE7QUFFSjtBQUFDTyxPQTdGUXRDO0FBK0ZULFNBQVN1QyxZQUFZLEVBQUVDLFlBQVksR0FBRztBQUNwQyxNQUFJLENBQUNBLFlBQVkzZCxPQUFRLFFBQU8sdUJBQUMsU0FBSSxXQUFVLHFDQUFvQztBQUFBLDJCQUFDLFNBQU0sZUFBWSxVQUFuQjtBQUFBO0FBQUE7QUFBQTtBQUFBLFdBQXlCO0FBQUEsSUFBRztBQUFBLE9BQS9FO0FBQUE7QUFBQTtBQUFBO0FBQUEsU0FBOEY7QUFDOUgsU0FBTyx1QkFBQyxTQUFJLFdBQVUsNEJBQTRCMmQsc0JBQVl4VyxJQUFJLENBQUMxRSxNQUFNNUQsVUFBVTtBQUNqRixVQUFNK2UsaUJBQWlCbmIsS0FBS29iLFVBQVUsVUFBVXhqQixjQUFjRTtBQUM5RCxXQUFPLHVCQUFDLFNBQStDLFdBQVcsTUFBTWtJLEtBQUtvYixLQUFLLElBQUk7QUFBQSw2QkFBQyxrQkFBZSxlQUFZLFVBQTVCO0FBQUE7QUFBQTtBQUFBO0FBQUEsYUFBa0M7QUFBQSxNQUFHLHVCQUFDLFVBQUs7QUFBQSwrQkFBQyxZQUFRcGIsZUFBSzJDLFdBQWQ7QUFBQTtBQUFBO0FBQUE7QUFBQSxlQUFzQjtBQUFBLFFBQVMsdUJBQUMsV0FBTzNDLGVBQUtxYixRQUFiO0FBQUE7QUFBQTtBQUFBO0FBQUEsZUFBa0I7QUFBQSxXQUF2RDtBQUFBO0FBQUE7QUFBQTtBQUFBLGFBQStEO0FBQUEsU0FBekssR0FBR3JiLEtBQUs2USxJQUFJLElBQUk3USxLQUFLcWIsSUFBSSxJQUFJamYsS0FBSyxJQUE1QztBQUFBO0FBQUE7QUFBQTtBQUFBLFdBQTBMO0FBQUEsRUFDbk0sQ0FBQyxLQUhNO0FBQUE7QUFBQTtBQUFBO0FBQUEsU0FHSjtBQUNMO0FBQUNrZixPQU5RTDtBQVFULFNBQVNNLGlCQUFpQixFQUFFMVksT0FBT2xDLFNBQVMsR0FBRztBQUFBNmEsTUFBQTtBQUM3QyxRQUFNLENBQUNDLFdBQVdDLFlBQVksSUFBSXRrQixTQUFTLElBQUk7QUFDL0MsUUFBTSxDQUFDdWtCLFlBQVlDLGFBQWEsSUFBSXhrQixTQUFTLElBQUk7QUFDakQsUUFBTXlULFVBQVU1USxrQ0FBa0MwRyxTQUFTaEIsU0FBUztBQUNwRSxRQUFNakQsU0FBU2lFLFNBQVNoQixVQUFVdUIsU0FBUyxRQUN2QyxFQUFFQSxNQUFNLGFBQWExQixXQUFXbUIsU0FBU2hCLFVBQVVILFdBQVdxTCxTQUFTa0IsU0FBU3BMLFNBQVNoQixVQUFVLElBQ25HLENBQUMsV0FBVyxTQUFTLFlBQVksRUFBRXNaLFNBQVN0WSxTQUFTaEIsVUFBVXVCLElBQUksSUFDakVQLFNBQVNoQixZQUNUO0FBQ04sTUFBSSxDQUFDakQsT0FBUSxRQUFPO0FBQ3BCLFFBQU1tZixRQUFRbGlCLDhCQUE4QjtBQUFBLElBQzFDbUQsVUFBVTZELFNBQVM3RDtBQUFBQSxJQUNuQitDLE1BQU1jLFNBQVNDO0FBQUFBLElBQ2ZsRTtBQUFBQSxJQUNBK2U7QUFBQUEsSUFDQUU7QUFBQUEsRUFDRixDQUFDO0FBQ0QsUUFBTUcsU0FBU0QsTUFBTXRTLFNBQ2hCNUksU0FBU3FELFVBQVUrWCxNQUFNQyxlQUFlSCxNQUFNRyxjQUM5Q3JiLFNBQVNxRCxVQUFVK1gsTUFBTUUsYUFBYUosTUFBTUk7QUFDakQsUUFBTUMsU0FBU0EsTUFBTTtBQUNuQixRQUFJSixRQUFRO0FBQ1ZqWixZQUFNYSxhQUFhLEVBQUVDLE9BQU8sWUFBWUMsU0FBUyxPQUFPbVksTUFBTSxLQUFLLENBQUM7QUFDcEU7QUFBQSxJQUNGO0FBQ0EsUUFBSSxDQUFDRixNQUFNdFMsTUFBTztBQUNsQjFHLFVBQU1hLGFBQWE7QUFBQSxNQUNqQkMsT0FBTztBQUFBLE1BQ1BDLFNBQVM7QUFBQSxNQUNUNEMsYUFBYTtBQUFBLE1BQ2IxRyxTQUFTK2IsTUFBTTViO0FBQUFBLE1BQ2Y4YixNQUFNRjtBQUFBQSxJQUNSLENBQUM7QUFBQSxFQUNIO0FBQ0EsU0FDRSx1QkFBQyxhQUFRLFdBQVUseUJBQ2pCO0FBQUEsMkJBQUMsYUFBUSxpQ0FBVDtBQUFBO0FBQUE7QUFBQTtBQUFBLFdBQTBCO0FBQUEsSUFDMUIsdUJBQUMsU0FBSSxXQUFVLCtCQUNiO0FBQUEsNkJBQUMsWUFBUyxPQUFNLFlBQVcsaUNBQUMsV0FBTSxNQUFLLFVBQVMsS0FBSSxLQUFJLEtBQUksS0FBSSxNQUFLLFFBQU8sT0FBT0osV0FBVyxVQUFVLENBQUNqWSxVQUFVa1ksYUFBYTFnQixLQUFLRSxJQUFJLEdBQUcrQyxPQUFPdUYsTUFBTS9HLE9BQU8xQixLQUFLLEtBQUssQ0FBQyxDQUFDLEtBQWpKO0FBQUE7QUFBQTtBQUFBO0FBQUEsYUFBbUosS0FBOUs7QUFBQTtBQUFBO0FBQUE7QUFBQSxhQUFpTDtBQUFBLE1BQ2pMLHVCQUFDLFlBQVMsT0FBTSxhQUFZLGlDQUFDLFdBQU0sTUFBSyxVQUFTLEtBQUksS0FBSSxLQUFJLEtBQUksTUFBSyxRQUFPLE9BQU80Z0IsWUFBWSxVQUFVLENBQUNuWSxVQUFVb1ksY0FBYzVnQixLQUFLRSxJQUFJLEdBQUcrQyxPQUFPdUYsTUFBTS9HLE9BQU8xQixLQUFLLEtBQUssQ0FBQyxDQUFDLEtBQW5KO0FBQUE7QUFBQTtBQUFBO0FBQUEsYUFBcUosS0FBakw7QUFBQTtBQUFBO0FBQUE7QUFBQSxhQUFvTDtBQUFBLFNBRnRMO0FBQUE7QUFBQTtBQUFBO0FBQUEsV0FHQTtBQUFBLElBQ0M4Z0IsTUFBTXRTLFFBQVEsdUJBQUMsT0FBRSxXQUFVLHFCQUFxQnBKO0FBQUFBLGVBQVMwYixNQUFNNWIsT0FBTztBQUFBLE1BQUU7QUFBQSxNQUFJRSxTQUFTMGIsTUFBTU0sS0FBSztBQUFBLE1BQUU7QUFBQSxTQUFwRjtBQUFBO0FBQUE7QUFBQTtBQUFBLFdBQXNJLElBQU8sdUJBQUMsT0FBRSxXQUFVLHdDQUF3Q04sZ0JBQU1yUyxVQUEzRDtBQUFBO0FBQUE7QUFBQTtBQUFBLFdBQWtFO0FBQUEsSUFDOU4sdUJBQUMsWUFBTyxNQUFLLFVBQVMsV0FBV3NTLFNBQVMsdUNBQXVDLDRCQUE0QixVQUFVLENBQUNELE1BQU10UyxPQUFPLFNBQVMyUyxRQUFTSixtQkFBUyxrQkFBa0IseUJBQWxMO0FBQUE7QUFBQTtBQUFBO0FBQUEsV0FBd007QUFBQSxPQVAxTTtBQUFBO0FBQUE7QUFBQTtBQUFBLFNBUUE7QUFFSjtBQUFDTixJQTdDUUQsa0JBQWdCO0FBQUEsT0FBaEJBO0FBK0NULFNBQVNhLFVBQVUsRUFBRXZaLE9BQU9sQyxVQUFVaEQsY0FBY2diLGdCQUFnQjlFLFdBQVdDLGFBQWEsR0FBRztBQUFBdUksTUFBQTtBQUM3RixRQUFNQyxlQUFlbmxCLE9BQU8sSUFBSTtBQUNoQyxRQUFNb2xCLFVBQVVwbEIsT0FBTyxJQUFJO0FBQzNCLFFBQU1xbEIscUJBQXFCcmxCLE9BQU8sSUFBSTtBQUN0QyxRQUFNLENBQUMySCxVQUFVMmQsV0FBVyxJQUFJcmxCLFNBQVMsSUFBSTtBQUM3QyxRQUFNLENBQUNzbEIsVUFBVUMsV0FBVyxJQUFJdmxCLFNBQVMsS0FBSztBQUM5QyxRQUFNNkYsVUFBVXlDLFdBQVdpQixTQUFTN0QsVUFBVTZELFNBQVNoQixTQUFTO0FBQ2hFLE1BQUlpZCxVQUFVLHVCQUFDLG9CQUFpQixPQUFjLFVBQW9CLFdBQXBEO0FBQUE7QUFBQTtBQUFBO0FBQUEsU0FBcUU7QUFDbkYsTUFBSWpjLFNBQVNoQixVQUFVdUIsU0FBUyxXQUFZMGIsV0FBVSx1QkFBQyxxQkFBa0IsT0FBYyxZQUFqQztBQUFBO0FBQUE7QUFBQTtBQUFBLFNBQW9EO0FBQzFHLE1BQUlqYyxTQUFTaEIsVUFBVXVCLFNBQVMsTUFBTzBiLFdBQVUsdUJBQUMsZ0JBQWEsT0FBYyxVQUFvQixTQUFrQixXQUFzQixnQkFBeEY7QUFBQTtBQUFBO0FBQUE7QUFBQSxTQUFtSDtBQUNwSyxNQUFJamMsU0FBU2hCLFVBQVV1QixTQUFTLG9CQUFxQjBiLFdBQVUsdUJBQUMsNkJBQTBCLE9BQWMsVUFBb0IsV0FBN0Q7QUFBQTtBQUFBO0FBQUE7QUFBQSxTQUE4RTtBQUM3SSxNQUFJamMsU0FBU2hCLFVBQVV1QixTQUFTLGFBQWMwYixXQUFVLHVCQUFDLG1CQUFnQixPQUFjLFVBQW9CLFdBQW5EO0FBQUE7QUFBQTtBQUFBO0FBQUEsU0FBb0U7QUFDNUgsTUFBSWpjLFNBQVNoQixVQUFVdUIsU0FBUyxRQUFTMGIsV0FBVSx1QkFBQyxrQkFBZSxPQUFjLFVBQW9CLFNBQWtCLGtCQUFwRTtBQUFBO0FBQUE7QUFBQTtBQUFBLFNBQW1HO0FBQ3RKLE1BQUlqYyxTQUFTaEIsVUFBVXVCLFNBQVMsY0FBZTBiLFdBQVUsdUJBQUMsb0JBQWlCLE9BQWMsVUFBb0IsV0FBcEQ7QUFBQTtBQUFBO0FBQUE7QUFBQSxTQUFxRTtBQUU5SDFsQixZQUFVLE1BQU07QUFDZCxVQUFNMmxCLGVBQWVBLE1BQU07QUFDekIsVUFBSXBlLE9BQU9PLGFBQWEsS0FBSztBQUMzQnlkLG9CQUFZLElBQUk7QUFDaEI7QUFBQSxNQUNGO0FBQ0FBO0FBQUFBLFFBQVksQ0FBQ3pVLFlBQ1hBLFdBQVdzVSxhQUFhdFUsVUFDcEJuSix1QkFBdUJ5ZCxhQUFhdFUsU0FBU0EsU0FBU3JLLFlBQVksSUFDbEVxSztBQUFBQSxNQUNMO0FBQUEsSUFDSDtBQUNBNlUsaUJBQWE7QUFDYnBlLFdBQU9xZSxpQkFBaUIsVUFBVUQsWUFBWTtBQUM5QyxXQUFPLE1BQU1wZSxPQUFPc2Usb0JBQW9CLFVBQVVGLFlBQVk7QUFBQSxFQUNoRSxHQUFHLENBQUNsZixZQUFZLENBQUM7QUFFakIsUUFBTXFmLFlBQVlBLENBQUN4WixVQUFVO0FBQzNCLFFBQUlBLE1BQU13RyxXQUFXLEtBQUt2TCxPQUFPTyxhQUFhLE9BQU8sQ0FBQ3dFLE1BQU0vRyxPQUFPb0IsUUFBUSxRQUFRLEVBQUc7QUFDdEYsVUFBTUgsWUFBWTRlLGFBQWF0VTtBQUMvQixRQUFJLENBQUN0SyxVQUFXO0FBQ2hCLFVBQU1nTCxPQUFPaEwsVUFBVWEsc0JBQXNCO0FBQzdDLFVBQU0sRUFBRUksUUFBUUMsVUFBVSxJQUFJbkIsMkJBQTJCQyxXQUFXQyxZQUFZO0FBQ2hGLFVBQU11QixrQkFBa0JOLFlBQVlEO0FBQ3BDLFVBQU1zZSxpQkFBaUJqaUIsS0FBS0MsSUFBSXlOLEtBQUt2SixRQUFRLEtBQUtuRSxLQUFLRSxJQUFJLEtBQUtnRSxrQkFBa0IsSUFBSSxDQUFDO0FBQ3ZGLFVBQU04QyxRQUFRbkQsdUJBQXVCbkIsV0FBVztBQUFBLE1BQzlDNEIsTUFBTW9KLEtBQUtwSjtBQUFBQSxNQUNYZCxLQUFLa0ssS0FBS2xLO0FBQUFBLE1BQ1ZTLE9BQU95SixLQUFLeko7QUFBQUEsTUFDWkUsUUFBUThkO0FBQUFBLElBQ1YsR0FBR3RmLFlBQVk7QUFDZjRlLFlBQVF2VSxVQUFVO0FBQUEsTUFDaEJzQyxXQUFXOUcsTUFBTThHO0FBQUFBLE1BQ2pCNFMsU0FBUzFaLE1BQU1vRjtBQUFBQSxNQUNmdVUsU0FBUzNaLE1BQU02SztBQUFBQSxNQUNmck07QUFBQUEsTUFDQWtKLE9BQU87QUFBQSxJQUNUO0FBQ0F4TixjQUFVMk0sa0JBQWtCN0csTUFBTThHLFNBQVM7QUFBQSxFQUM3QztBQUVBLFFBQU04UyxXQUFXQSxDQUFDNVosVUFBVTtBQUMxQixVQUFNa0csT0FBTzZTLFFBQVF2VTtBQUNyQixVQUFNdEssWUFBWTRlLGFBQWF0VTtBQUMvQixRQUFJLENBQUMwQixRQUFRLENBQUNoTSxhQUFhZ00sS0FBS1ksY0FBYzlHLE1BQU04RyxVQUFXO0FBQy9ELFVBQU0rUyxTQUFTN1osTUFBTW9GLFVBQVVjLEtBQUt3VDtBQUNwQyxVQUFNOVQsU0FBUzVGLE1BQU02SyxVQUFVM0UsS0FBS3lUO0FBQ3BDLFFBQUksQ0FBQ3pULEtBQUt3QixTQUFTbFEsS0FBS3NpQixNQUFNRCxRQUFRalUsTUFBTSxJQUFJLEVBQUc7QUFDbkRNLFNBQUt3QixRQUFRO0FBQ2J5UixnQkFBWSxJQUFJO0FBQ2hCRixnQkFBWTVkLHVCQUF1Qm5CLFdBQVc7QUFBQSxNQUM1QyxHQUFHZ00sS0FBSzFIO0FBQUFBLE1BQ1IxQyxNQUFNb0ssS0FBSzFILE1BQU0xQyxPQUFPK2Q7QUFBQUEsTUFDeEI3ZSxLQUFLa0wsS0FBSzFILE1BQU14RCxNQUFNNEs7QUFBQUEsSUFDeEIsR0FBR3pMLFlBQVksQ0FBQztBQUFBLEVBQ2xCO0FBRUEsUUFBTTRmLFVBQVVBLENBQUMvWixVQUFVO0FBQ3pCLFVBQU1rRyxPQUFPNlMsUUFBUXZVO0FBQ3JCLFFBQUkwQixNQUFNWSxjQUFjOUcsTUFBTThHLFVBQVc7QUFDekMsUUFBSSxDQUFDWixLQUFLd0IsT0FBTztBQUNmLFlBQU1zUyxNQUFNQyxZQUFZRCxJQUFJO0FBQzVCLFlBQU1FLFdBQVdsQixtQkFBbUJ4VTtBQUNwQyxVQUFJMFYsWUFBWUYsTUFBTUUsU0FBU0MsT0FBTyxPQUNqQzNpQixLQUFLc2lCLE1BQU05WixNQUFNb0YsVUFBVThVLFNBQVNFLEdBQUdwYSxNQUFNNkssVUFBVXFQLFNBQVNHLENBQUMsSUFBSSxHQUFHO0FBQzNFcEIsb0JBQVksSUFBSTtBQUNoQkQsMkJBQW1CeFUsVUFBVTtBQUFBLE1BQy9CLE9BQU87QUFDTHdVLDJCQUFtQnhVLFVBQVUsRUFBRTJWLE1BQU1ILEtBQUtJLEdBQUdwYSxNQUFNb0YsU0FBU2lWLEdBQUdyYSxNQUFNNkssUUFBUTtBQUFBLE1BQy9FO0FBQUEsSUFDRjtBQUNBa08sWUFBUXZVLFVBQVU7QUFDbEIyVSxnQkFBWSxLQUFLO0FBQ2pCLFFBQUlMLGFBQWF0VSxTQUFTb0Usa0JBQWtCNUksTUFBTThHLFNBQVMsR0FBRztBQUM1RGdTLG1CQUFhdFUsUUFBUXFFLHNCQUFzQjdJLE1BQU04RyxTQUFTO0FBQUEsSUFDNUQ7QUFBQSxFQUNGO0FBRUEsUUFBTXdULGdCQUFnQkEsTUFBTXJCLFlBQVksSUFBSTtBQUU1QyxTQUNFO0FBQUEsSUFBQztBQUFBO0FBQUEsTUFDQyxLQUFLSDtBQUFBQSxNQUNMLFdBQVcseUJBQXlCSSxXQUFXLGlCQUFpQixFQUFFO0FBQUEsTUFDbEUsaUJBQWU1ZCxXQUFXLFNBQVM7QUFBQSxNQUNuQyxPQUFPQSxXQUFXO0FBQUEsUUFDaEJRLE1BQU1SLFNBQVNRO0FBQUFBLFFBQ2ZkLEtBQUtNLFNBQVNOO0FBQUFBLFFBQ2RtUSxPQUFPO0FBQUEsUUFDUEMsUUFBUTtBQUFBLFFBQ1IzUCxPQUFPSCxTQUFTRztBQUFBQSxRQUNoQkUsUUFBUUwsU0FBU0s7QUFBQUEsTUFDbkIsSUFBSXNSO0FBQUFBLE1BQ0osZUFBZXVNO0FBQUFBLE1BQ2YsZUFBZUk7QUFBQUEsTUFDZixhQUFhRztBQUFBQSxNQUNiLGlCQUFpQkE7QUFBQUEsTUFDakIsZUFBZU87QUFBQUEsTUFDaEIsaUNBQUMsU0FBSSxXQUFVLGlDQUFpQ2xCO0FBQUFBO0FBQUFBLFFBQVEsdUJBQUMsb0JBQWlCLE9BQWMsWUFBaEM7QUFBQTtBQUFBO0FBQUE7QUFBQSxlQUFtRDtBQUFBLFFBQUcsdUJBQUMsZUFBWSxhQUFhamMsU0FBU3VhLGVBQW5DO0FBQUE7QUFBQTtBQUFBO0FBQUEsZUFBK0M7QUFBQSxXQUE3SjtBQUFBO0FBQUE7QUFBQTtBQUFBLGFBQWdLO0FBQUE7QUFBQSxJQWpCaks7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBLEVBaUJ1SztBQUUzSztBQUFDbUIsSUFuSFFELFdBQVM7QUFBQSxPQUFUQTtBQXFIVCxTQUFTMkIsa0JBQWtCLEVBQUVwZCxTQUFTLEdBQUc7QUFDdkMsUUFBTXpELFdBQVd5RCxTQUFTQyxjQUFjMUQsWUFBWTtBQUNwRCxRQUFNOGdCLFFBQVFyZCxTQUFTQyxjQUFjc0YsY0FBYztBQUNuRCxTQUNFLHVCQUFDLFNBQUksV0FBVSw2QkFBNEIsY0FBVyx1QkFDcEQ7QUFBQSwyQkFBQyxTQUFJO0FBQUEsNkJBQUMsWUFBTyx1Q0FBUjtBQUFBO0FBQUE7QUFBQTtBQUFBLGFBQStCO0FBQUEsTUFBUyx1QkFBQyxVQUFNL0Y7QUFBQUEsaUJBQVNRLFNBQVNxRCxVQUFVbEUsT0FBTztBQUFBLFFBQUU7QUFBQSxRQUFJSyxTQUFTNmQsS0FBSztBQUFBLFdBQTlEO0FBQUE7QUFBQTtBQUFBO0FBQUEsYUFBZ0U7QUFBQSxTQUE3RztBQUFBO0FBQUE7QUFBQTtBQUFBLFdBQW9IO0FBQUEsSUFDcEgsdUJBQUMsU0FBSSxTQUFRLGVBQWMsTUFBSyxPQUFNLGNBQVcsZ0RBQy9DO0FBQUEsNkJBQUMsVUFBSyxHQUFFLGlCQUFSO0FBQUE7QUFBQTtBQUFBO0FBQUEsYUFBcUI7QUFBQSxNQUNwQjlnQixTQUFTd0gsSUFBSSxDQUFDekgsWUFBWTtBQUN6QixjQUFNMmdCLElBQUksS0FBTzNnQixRQUFRZ0QsVUFBVStkLFFBQVM7QUFDNUMsZUFBTyx1QkFBQyxPQUFtQixXQUFXLGFBQWFKLENBQUMsUUFBUTtBQUFBLGlDQUFDLFVBQUssSUFBRyxPQUFNLElBQUcsUUFBbEI7QUFBQTtBQUFBO0FBQUE7QUFBQSxpQkFBc0I7QUFBQSxVQUFHLHVCQUFDLFlBQU8sR0FBRzNnQixRQUFRZ2hCLFlBQVlDLGVBQWUsSUFBSSxLQUFsRDtBQUFBO0FBQUE7QUFBQTtBQUFBLGlCQUFvRDtBQUFBLFVBQUcsdUJBQUMsV0FBT2poQjtBQUFBQSxvQkFBUXdGO0FBQUFBLFlBQU94RixRQUFRZ2hCLFlBQVlDLGVBQWUsTUFBTWpoQixRQUFRZ2hCLFdBQVdFLFlBQVl6TixPQUFPLEtBQUs7QUFBQSxlQUEzRztBQUFBO0FBQUE7QUFBQTtBQUFBLGlCQUE4RztBQUFBLGFBQTNPelQsUUFBUXRCLElBQWhCO0FBQUE7QUFBQTtBQUFBO0FBQUEsZUFBMlA7QUFBQSxNQUNwUSxDQUFDO0FBQUEsTUFDRCx1QkFBQyxPQUFFLFdBQVUsZUFBYyxXQUFXLGFBQWEsS0FBT2dGLFNBQVNxRCxVQUFVbEUsVUFBVWtlLFFBQVMsR0FBSSxRQUFRO0FBQUEsK0JBQUMsVUFBSyxHQUFFLHlCQUFSO0FBQUE7QUFBQTtBQUFBO0FBQUEsZUFBNkI7QUFBQSxRQUFHLHVCQUFDLFVBQUssSUFBRyxPQUFNLElBQUcsUUFBbEI7QUFBQTtBQUFBO0FBQUE7QUFBQSxlQUFzQjtBQUFBLFdBQWxLO0FBQUE7QUFBQTtBQUFBO0FBQUEsYUFBcUs7QUFBQSxTQU52SztBQUFBO0FBQUE7QUFBQTtBQUFBLFdBT0E7QUFBQSxJQUNBLHVCQUFDLFdBQU0sb0hBQVA7QUFBQTtBQUFBO0FBQUE7QUFBQSxXQUEyRztBQUFBLE9BVjdHO0FBQUE7QUFBQTtBQUFBO0FBQUEsU0FXQTtBQUVKO0FBQUNJLE9BakJRTDtBQW1CVCx3QkFBd0JNLHFCQUFxQixFQUFFeGIsT0FBT3liLFlBQVlDLFFBQVEsR0FBRztBQUFBQyxNQUFBO0FBQzNFLFFBQU03ZCxXQUFXdEoscUJBQXFCd0wsTUFBTTRiLFdBQVc1YixNQUFNeUcsV0FBVztBQUN4RSxRQUFNLENBQUNvVixhQUFhQyxjQUFjLElBQUl2bkIsU0FBUyxNQUFNMEIsOEJBQThCLENBQUM7QUFDcEYsUUFBTSxDQUFDK2EsV0FBV0MsWUFBWSxJQUFJMWMsU0FBUyxJQUFJO0FBQy9DLFFBQU0sQ0FBQ3VoQixnQkFBZ0JpRyxpQkFBaUIsSUFBSXhuQixTQUFTLElBQUk7QUFDekQsUUFBTSxDQUFDeW5CLGFBQWFDLGNBQWMsSUFBSTFuQixTQUFTLEtBQUs7QUFDcEQsUUFBTSxDQUFDMm5CLGNBQWNDLGVBQWUsSUFBSTVuQixTQUFTLEtBQUs7QUFDdEQsUUFBTSxDQUFDNm5CLFlBQVlDLGFBQWEsSUFBSTluQixTQUFTLFVBQVU7QUFDdkQsUUFBTSxDQUFDdUcsY0FBY3doQixlQUFlLElBQUkvbkI7QUFBQUEsSUFBUyxNQUMvQ3FILE9BQU8yZ0IsYUFBYUMsUUFBUWxrQixpQ0FBaUMsTUFBTTtBQUFBLEVBQ3BFO0FBQ0QsUUFBTW1rQixZQUFZbm9CLE9BQU8sSUFBSTtBQUM3QixRQUFNb29CLGNBQWNwb0IsT0FBT3dKLFFBQVE7QUFDbkMsUUFBTTZlLGtCQUFrQjdlLFNBQVNoQjtBQUVqQ3pJLFlBQVUsTUFBTTtBQUNkcW9CLGdCQUFZdlgsVUFBVXJIO0FBQUFBLEVBQ3hCLEdBQUcsQ0FBQ0EsUUFBUSxDQUFDO0FBRWJ6SixZQUFVLE1BQU07QUFDZHVILFdBQU8yZ0IsYUFBYUssUUFBUXRrQixtQ0FBbUN3QyxlQUFlLFNBQVMsUUFBUTtBQUFBLEVBQ2pHLEdBQUcsQ0FBQ0EsWUFBWSxDQUFDO0FBRWpCekcsWUFBVSxNQUFNO0FBQ2QsVUFBTXdvQixPQUFPbkIsUUFBUXZXO0FBQ3JCLFVBQU0yWCxVQUFVckIsV0FBV3RXO0FBQzNCMFgsVUFBTUUsYUFBYSxzQkFBc0IsTUFBTTtBQUMvQy9tQiw2QkFBeUIsRUFBRWduQixLQUFLLENBQUMsRUFBRS9pQixxQkFBVWdqQixLQUFLLE1BQU07QUFDdEQsWUFBTTlYLFVBQVVuRixNQUFNeUcsWUFBWTtBQUNsQyxVQUFJLENBQUN0QixRQUFRK1gsTUFBT2xkLE9BQU1tZCxnQkFBZ0IsNEJBQTRCbGpCLFNBQVE7QUFDOUUrRixZQUFNb2QsWUFBWW5qQixXQUFVZ2pCLElBQUk7QUFDaEMsWUFBTUksV0FBV25uQixnQ0FBZ0M7QUFDakQsVUFBSW1uQixZQUFZQSxTQUFTQyxZQUFZQyxLQUFLNUMsSUFBSSxJQUFLLEtBQUssT0FBVztBQUNqRTNhLGNBQU13ZCxpQkFBaUIsRUFBRUMsV0FBVyxNQUFNdmQsT0FBT21kLFVBQVVLLE9BQU8sR0FBRyxDQUFDO0FBQUEsTUFDeEU7QUFBQSxJQUNGLENBQUMsRUFBRUMsTUFBTSxDQUFDRCxVQUFVMWQsTUFBTVMsYUFBYSxFQUFFbWQsUUFBUSxVQUFVOWQsU0FBUzRkLE1BQU01ZCxRQUFRLENBQUMsQ0FBQztBQUNwRixXQUFPLE1BQU07QUFDWCtjLFlBQU1nQixnQkFBZ0Isb0JBQW9CO0FBQzFDZixlQUFTWCxrQkFBa0IsS0FBSztBQUFBLElBQ2xDO0FBQUEsRUFDRixHQUFHLENBQUNULFNBQVNELFlBQVl6YixLQUFLLENBQUM7QUFFL0IzTCxZQUFVLE1BQU07QUFDZCxVQUFNd29CLE9BQU9uQixRQUFRdlc7QUFDckIsUUFBSSxDQUFDMFgsS0FBTSxRQUFPalA7QUFDbEJpUCxTQUFLM1EsaUJBQWlCLHFCQUFxQixFQUFFak8sUUFBUSxDQUFDbU8sU0FBU0EsS0FBSzBSLFVBQVVqTCxPQUFPLG9CQUFvQixDQUFDO0FBQzFHemIsc0NBQWtDdWxCLGVBQWUsRUFBRTFlLFFBQVEsQ0FBQzZKLFdBQVc7QUFDckUrVSxXQUFLcGhCLGNBQWMsbUJBQW1Cc2lCLElBQUlDLE9BQU9sVyxPQUFPN0ksS0FBSyxDQUFDLElBQUksR0FBRzZlLFVBQVVHLElBQUksb0JBQW9CO0FBQUEsSUFDekcsQ0FBQztBQUNEcEIsU0FBS3ZRLFFBQVE0UixzQkFBc0J2QixnQkFBZ0J0ZSxRQUFRO0FBQzNELFdBQU8sTUFBTTtBQUNYd2UsV0FBSzNRLGlCQUFpQixxQkFBcUIsRUFBRWpPLFFBQVEsQ0FBQ21PLFNBQVNBLEtBQUswUixVQUFVakwsT0FBTyxvQkFBb0IsQ0FBQztBQUMxRyxhQUFPZ0ssS0FBS3ZRLFFBQVE0UjtBQUFBQSxJQUN0QjtBQUFBLEVBQ0YsR0FBRyxDQUFDdkIsaUJBQWlCakIsT0FBTyxDQUFDO0FBRTdCcm5CLFlBQVUsTUFBTTtBQUNkLFVBQU04cEIsV0FBV3ZpQixPQUFPd2lCLFlBQVksTUFBTXJDLGtCQUFrQk4sV0FBV3RXLFNBQVNrWixhQUFhLEtBQUssSUFBSSxHQUFHLEdBQUc7QUFDNUcsV0FBTyxNQUFNemlCLE9BQU8waUIsY0FBY0gsUUFBUTtBQUFBLEVBQzVDLEdBQUcsQ0FBQzFDLFVBQVUsQ0FBQztBQUVmcG5CLFlBQVUsTUFBTTtBQUNkLFFBQUksQ0FBQ3lKLFNBQVNvZixNQUFPLFFBQU90UDtBQUM1QixVQUFNMlEsUUFBUTNpQixPQUFPa08sV0FBVyxNQUFNO0FBQ3BDLFVBQUk7QUFDRnpULHlDQUFpQ3lILFNBQVM3RCxVQUFVNkQsU0FBUzBnQixZQUFZO0FBQUEsTUFDM0UsU0FBU2QsT0FBTztBQUNkMWQsY0FBTXdkLGlCQUFpQixFQUFFRSxPQUFPLHlCQUF5QkEsTUFBTTVkLE9BQU8sR0FBRyxDQUFDO0FBQUEsTUFDNUU7QUFBQSxJQUNGLEdBQUcsR0FBRztBQUNOLFdBQU8sTUFBTWxFLE9BQU82aUIsYUFBYUYsS0FBSztBQUFBLEVBQ3hDLEdBQUcsQ0FBQ3pnQixTQUFTMGdCLGNBQWMxZ0IsU0FBU29mLE9BQU9wZixTQUFTN0QsVUFBVStGLEtBQUssQ0FBQztBQUVwRTNMLFlBQVUsTUFBTTtBQUNkLFVBQU1xcUIsV0FBV0EsTUFBTTtBQUNyQixZQUFNdlosVUFBVXVYLFlBQVl2WDtBQUM1QixVQUFJQSxRQUFRK1gsT0FBTztBQUNqQixZQUFJO0FBQUU3bUIsMkNBQWlDOE8sUUFBUWxMLFVBQVVrTCxRQUFRcVosWUFBWTtBQUFBLFFBQUcsUUFBUTtBQUFBLFFBQUU7QUFBQSxNQUM1RjtBQUFBLElBQ0Y7QUFDQSxVQUFNRyxVQUFVQSxDQUFDaGUsVUFBVTtBQUN6QixXQUFLQSxNQUFNK0UsV0FBVy9FLE1BQU04RSxZQUFZOUUsTUFBTXJHLElBQUlpSCxZQUFZLE1BQU0sS0FBSztBQUN2RVosY0FBTWdGLGVBQWU7QUFDckIxTCxpQkFBU3dCLGNBQWMsMEJBQTBCLEdBQUdtakIsTUFBTTtBQUFBLE1BQzVEO0FBQ0EsV0FBS2plLE1BQU0rRSxXQUFXL0UsTUFBTThFLFlBQVk5RSxNQUFNckcsSUFBSWlILFlBQVksTUFBTSxLQUFLO0FBQ3ZFWixjQUFNZ0YsZUFBZTtBQUNyQmhGLGNBQU1vSCxXQUFXL0gsTUFBTTZlLEtBQUssSUFBSTdlLE1BQU04ZSxLQUFLO0FBQUEsTUFDN0M7QUFDQSxVQUFJLENBQUNuZSxNQUFNK0UsV0FBVyxDQUFDL0UsTUFBTThFLFdBQVcsQ0FBQzlFLE1BQU1pSyxVQUFVLENBQUNqSyxNQUFNb0gsWUFDM0QsQ0FBQ3RLLG9CQUFvQmtELE1BQU0vRyxNQUFNLEtBQUssQ0FBQyxhQUFhLFlBQVksRUFBRXdjLFNBQVN6VixNQUFNckcsR0FBRyxHQUFHO0FBQzFGcUcsY0FBTWdGLGVBQWU7QUFDckIzRSw2QkFBcUJoQixPQUFPQSxNQUFNeUcsWUFBWSxHQUFHOUYsTUFBTXJHLFFBQVEsZUFBZSxJQUFJLEVBQUU7QUFBQSxNQUN0RjtBQUNBLFVBQUksQ0FBQ3FHLE1BQU0rRSxXQUFXLENBQUMvRSxNQUFNOEUsV0FBVyxDQUFDOUUsTUFBTWlLLFVBQzFDLENBQUNuTixvQkFBb0JrRCxNQUFNL0csTUFBTSxLQUFLLENBQUMsYUFBYSxRQUFRLEVBQUV3YyxTQUFTelYsTUFBTXJHLEdBQUcsS0FDaEZpRyx3QkFBd0JQLE9BQU9BLE1BQU15RyxZQUFZLENBQUMsR0FBRztBQUN4RDlGLGNBQU1nRixlQUFlO0FBQUEsTUFDdkI7QUFDQSxVQUFJaEYsTUFBTXJHLFFBQVEsVUFBVTtBQUMxQixjQUFNNkssVUFBVW5GLE1BQU15RyxZQUFZO0FBQ2xDLFlBQUl0QixRQUFRNFosYUFBYy9lLE9BQU15SixjQUFjO0FBQUEsaUJBQ3JDdEUsUUFBUXdNLFNBQVUzUixPQUFNNFIsVUFBVTtBQUFBLGlCQUNsQ3hhLGtDQUFrQytOLFFBQVFySSxTQUFTLEVBQUVwQyxTQUFTLEdBQUc7QUFDeEVzRixnQkFBTVksYUFBYTtBQUFBLFlBQ2pCdkMsTUFBTTtBQUFBLFlBQ04xQixXQUFXd0ksUUFBUXJJLFVBQVVIO0FBQUFBLFlBQzdCc0MsT0FBT2tHLFFBQVFySSxVQUFVbUM7QUFBQUEsWUFDekJOLFNBQVN3RyxRQUFRckksVUFBVTZCLFdBQVc7QUFBQSxVQUN4QyxDQUFDO0FBQUEsUUFDSCxXQUNTd0csUUFBUXJJLFVBQVV1QixTQUFTLFVBQVcyQixPQUFNWSxhQUFhLEVBQUV2QyxNQUFNLFdBQVcxQixXQUFXd0ksUUFBUXJJLFVBQVVILFVBQVUsQ0FBQztBQUFBO0FBQ3hIcUQsZ0JBQU1ZLGFBQWEsRUFBRXZDLE1BQU0sV0FBVyxDQUFDO0FBQUEsTUFDOUM7QUFBQSxJQUNGO0FBQ0F6QyxXQUFPcWUsaUJBQWlCLFlBQVl5RSxRQUFRO0FBQzVDOWlCLFdBQU9xZSxpQkFBaUIsV0FBVzBFLE9BQU87QUFDMUMsV0FBTyxNQUFNO0FBQUUvaUIsYUFBT3NlLG9CQUFvQixZQUFZd0UsUUFBUTtBQUFHOWlCLGFBQU9zZSxvQkFBb0IsV0FBV3lFLE9BQU87QUFBQSxJQUFHO0FBQUEsRUFDbkgsR0FBRyxDQUFDM2UsS0FBSyxDQUFDO0FBRVYsUUFBTWdmLE9BQU8sWUFBWTtBQUN2QixVQUFNQyxZQUFZLElBQUlDLElBQUl0akIsT0FBT3VqQixTQUFTQyxJQUFJO0FBQzlDSCxjQUFVSSxhQUFhQyxJQUFJLFFBQVEsR0FBRztBQUN0QzFqQixXQUFPMmpCLFFBQVFDLGFBQWE1akIsT0FBTzJqQixRQUFRRSxPQUFPLElBQUksR0FBR1IsVUFBVVMsUUFBUSxHQUFHVCxVQUFVVSxNQUFNLEdBQUdWLFVBQVVoQyxJQUFJLEVBQUU7QUFDakgsVUFBTTJDLE9BQU9ycEIsNEJBQTRCdUgsU0FBUzdELFFBQVE7QUFDMUQsUUFBSTZELFNBQVN1YSxZQUFZaGYsS0FBSyxDQUFDOEQsU0FBU0EsS0FBS29iLFVBQVUsT0FBTyxHQUFHO0FBQy9EdlksWUFBTVMsYUFBYSxFQUFFbWQsUUFBUSxVQUFVOWQsU0FBUywyQ0FBMkMsQ0FBQztBQUM1RjtBQUFBLElBQ0Y7QUFDQUUsVUFBTVMsYUFBYSxFQUFFbWQsUUFBUSxVQUFVOWQsU0FBUyxHQUFHLENBQUM7QUFDcEQsUUFBSTtBQUNGLFlBQU13UCxTQUFTLE1BQU1uWix5QkFBeUJ5cEIsTUFBTTloQixTQUFTMGdCLFlBQVk7QUFDekV4ZSxZQUFNNmYsVUFBVUQsTUFBTXRRLE9BQU8yTixJQUFJO0FBQ2pDbm5CLHVDQUFpQztBQUFBLElBQ25DLFNBQVM0bkIsT0FBTztBQUNkMWQsWUFBTVMsYUFBYSxFQUFFbWQsUUFBUUYsTUFBTUUsV0FBVyxNQUFNLGFBQWEsVUFBVTlkLFNBQVM0ZCxNQUFNNWQsUUFBUSxDQUFDO0FBQUEsSUFDckc7QUFBQSxFQUNGO0FBRUEsUUFBTWdnQixnQkFBZ0JBLE1BQU07QUFDMUIsVUFBTUMsYUFBYTtBQUFBLE1BQ2pCam5CLElBQUlrbkIsT0FBT0MsV0FBVztBQUFBLE1BQ3RCN0ssTUFBTSxlQUFjLG9CQUFJbUksS0FBSyxHQUFFMkMsbUJBQW1CLElBQUksRUFBRUMsTUFBTSxXQUFXQyxRQUFRLFVBQVUsQ0FBQyxDQUFDO0FBQUEsTUFDN0Y5QyxXQUFXQyxLQUFLNUMsSUFBSTtBQUFBLE1BQ3BCMWQsU0FBU2EsU0FBU3FELFVBQVVsRTtBQUFBQSxNQUM1Qm9qQixnQkFBZ0J2aUIsU0FBUzBnQjtBQUFBQSxNQUN6QnZrQixVQUFVNkQsU0FBUzdEO0FBQUFBLElBQ3JCO0FBQ0E2aEIsbUJBQWUxbEIsOEJBQThCMnBCLFVBQVUsQ0FBQztBQUFBLEVBQzFEO0FBQ0EsUUFBTU8sY0FBY3hpQixTQUFTeWlCLFVBQVUzQyxXQUFXLFdBQVcsWUFDekQ5ZixTQUFTeWlCLFVBQVUzQyxXQUFXLGFBQWEsbUJBQ3pDOWYsU0FBU3lpQixVQUFVM0MsV0FBVyxXQUFXLGdCQUN2QzlmLFNBQVNvZixRQUFRLFVBQVU7QUFDbkMsUUFBTTFaLFdBQVczRyxXQUFXaUIsU0FBUzdELFVBQVU2RCxTQUFTaEIsU0FBUztBQUNqRSxRQUFNMGpCLG1CQUFtQjFpQixTQUFTQyxjQUFjMUQsU0FBU3pCLEtBQUssQ0FBQ3dCLFlBQVlBLFFBQVF0QixPQUFPMEssVUFBVTFLLEVBQUU7QUFDdEcsUUFBTWtXLGlCQUFpQndSLGtCQUFrQmxULG9CQUFvQjlKLFVBQVVZLFlBQVk7QUFDbkYsUUFBTXFjLGlCQUFpQmpkLFdBQ25CcEksT0FBTzBDLFNBQVM4RixtQkFBbUIsV0FBV0osU0FBUytMLGlCQUFpQi9MLFNBQVNZLFFBQVEsSUFDekY7QUFDSixRQUFNc2MsbUJBQW1CdHBCLGtDQUFrQzBHLFNBQVNoQixTQUFTLEVBQUVwQztBQUMvRSxRQUFNaW1CLGFBQWE5UCxRQUFRL1MsU0FBU3FELFVBQVUrWCxJQUFJO0FBQ2xELFFBQU0wSCxtQkFBbUJsaEIsb0JBQW9CNUIsUUFBUTtBQUNyRCxRQUFNK2lCLGFBQWFBLE1BQU07QUFDdkIsUUFBSUYsWUFBWTtBQUNkM2dCLFlBQU1hLGFBQWEsRUFBRUMsT0FBTyxZQUFZQyxTQUFTLE9BQU9tWSxNQUFNLEtBQUssQ0FBQztBQUNwRTtBQUFBLElBQ0Y7QUFDQSxVQUFNRixRQUFRbGlCLDhCQUE4QjtBQUFBLE1BQzFDbUQsVUFBVTZELFNBQVM3RDtBQUFBQSxNQUNuQitDLE1BQU1jLFNBQVNDO0FBQUFBLE1BQ2ZsRSxRQUFRMkosV0FBVyxFQUFFbkYsTUFBTSxXQUFXMUIsV0FBVzZHLFNBQVMxSyxHQUFHLElBQUk7QUFBQSxJQUNuRSxDQUFDO0FBQ0QsUUFBSWtnQixNQUFNdFMsTUFBTzFHLE9BQU1hLGFBQWEsRUFBRXFZLE1BQU1GLE1BQU0sQ0FBQztBQUFBLEVBQ3JEO0FBQ0EsUUFBTThILGFBQWFBLENBQUNDLFVBQVUvZ0IsTUFBTWEsYUFBYTtBQUFBLElBQy9DNEwsV0FBVzNPLFNBQVNxRCxVQUFVc0wsY0FBY3NVLFFBQVEsT0FBT0E7QUFBQUEsRUFDN0QsQ0FBQztBQUNELFFBQU1DLGNBQWNBLE1BQU07QUFDeEJoaEIsVUFBTWEsYUFBYSxFQUFFdUYsTUFBTSxFQUFFLENBQUM7QUFDOUJoQiwwQkFBc0IsTUFBTTtBQUMxQixZQUFNUSxRQUFRM0wsU0FBU3dCLGNBQWMscUJBQXFCO0FBQzFELFVBQUltSyxNQUFPQSxPQUFNSyxhQUFhO0FBQUEsSUFDaEMsQ0FBQztBQUFBLEVBQ0g7QUFDQSxRQUFNZ2IsYUFBYUEsTUFBTTtBQUN2QixRQUFJLENBQUNULG9CQUFvQixDQUFDMWlCLFNBQVNDLGNBQWNzRixXQUFZO0FBQzdELFVBQU02ZCxjQUFjL29CLEtBQUtFLElBQUksTUFBT21vQixpQkFBaUJsVCxnQkFBZ0I7QUFDckUsVUFBTWxILE9BQU9qTyxLQUFLQyxJQUFJLEdBQUdELEtBQUtFLElBQUksR0FBSXlGLFNBQVNDLGFBQWFzRixhQUFhNmQsY0FBZSxJQUFJLENBQUM7QUFDN0ZsaEIsVUFBTWEsYUFBYSxFQUFFdUYsTUFBTWhMLE9BQU9nTCxLQUFLN0ksUUFBUSxDQUFDLENBQUMsRUFBRSxDQUFDO0FBQ3BENkgsMEJBQXNCLE1BQU07QUFDMUIsWUFBTVEsUUFBUTNMLFNBQVN3QixjQUFjLHFCQUFxQjtBQUMxRCxVQUFJLENBQUNtSyxNQUFPO0FBQ1osWUFBTXViLGFBQWFYLGlCQUFpQnBqQixVQUFVVSxTQUFTQyxhQUFhc0Y7QUFDcEV1QyxZQUFNSyxhQUFhOU4sS0FBS0UsSUFBSSxHQUFJOG9CLGFBQWF2YixNQUFNTSxjQUFnQk4sTUFBTXdiLGNBQWMsSUFBSztBQUFBLElBQzlGLENBQUM7QUFBQSxFQUNIO0FBQ0EsUUFBTUMsaUJBQWlCQSxNQUFNO0FBQzNCLFVBQU0zZCxPQUFPLENBQUN3WTtBQUNkQyxvQkFBZ0J6WSxJQUFJO0FBQ3BCK1gsZUFBV3RXLFNBQVNnWCxrQkFBa0J6WSxJQUFJO0FBQUEsRUFDNUM7QUFDQSxRQUFNNGQsZUFBZUEsTUFBTTtBQUN6QixRQUFJeGpCLFNBQVM2VCxVQUFVL1IsVUFBVSx3QkFBd0I7QUFDdkRJLFlBQU00UixVQUFVO0FBQ2hCO0FBQUEsSUFDRjtBQUNBLFFBQUk5VCxTQUFTNlQsU0FBVTtBQUN2QjNSLFVBQU02UixTQUFTLHdCQUF3QixDQUFDM1IsVUFBVTtBQUNoRGxILGFBQU93QixLQUFLMEYsS0FBSyxFQUFFakMsUUFBUSxDQUFDM0QsUUFBUSxPQUFPNEYsTUFBTTVGLEdBQUcsQ0FBQztBQUNyRHRCLGFBQU9vSixPQUFPbEMsT0FBTzNKLDRCQUE0QnVILFNBQVNvTixnQkFBZ0IsQ0FBQztBQUFBLElBQzdFLENBQUM7QUFBQSxFQUNIO0FBRUEsU0FBT3pXO0FBQUFBLElBQ0w7QUFBQSxNQUFDO0FBQUE7QUFBQSxRQUNDLFdBQVU7QUFBQSxRQUNWLG9CQUFrQjJuQjtBQUFBQSxRQUNsQixzQkFBb0J0aEIsZUFBZSxTQUFTO0FBQUEsUUFDNUMsTUFBSztBQUFBLFFBQ0wsY0FBVztBQUFBLFFBRVg7QUFBQSxpQ0FBQyxZQUFPLFdBQVUsdUJBQ2hCO0FBQUEsbUNBQUMsWUFBTyxNQUFLLFVBQVMsV0FBVSxzQkFBcUIsU0FBUyxNQUFNa0YsTUFBTVksYUFBYSxFQUFFdkMsTUFBTSxXQUFXLENBQUMsR0FBRztBQUFBLHFDQUFDLFdBQVEsZUFBWSxVQUFyQjtBQUFBO0FBQUE7QUFBQTtBQUFBLHFCQUEyQjtBQUFBLGNBQUcsdUJBQUMsVUFBSywrQkFBTjtBQUFBO0FBQUE7QUFBQTtBQUFBLHFCQUFxQjtBQUFBLGNBQU8sdUJBQUMsV0FBTSxnQ0FBUDtBQUFBO0FBQUE7QUFBQTtBQUFBLHFCQUF1QjtBQUFBLGlCQUEvTDtBQUFBO0FBQUE7QUFBQTtBQUFBLG1CQUF1TTtBQUFBLFlBQ3ZNLHVCQUFDLGFBQVUsT0FBYyxZQUF6QjtBQUFBO0FBQUE7QUFBQTtBQUFBLG1CQUE0QztBQUFBLFlBQzVDLHVCQUFDLFNBQUksV0FBVSx3QkFDYjtBQUFBLHFDQUFDLFlBQU8sTUFBSyxVQUFTLFVBQVUsQ0FBQ1AsU0FBU3loQixRQUFRZ0MsU0FBUyxPQUFPempCLFNBQVN5aEIsUUFBUWlDLGFBQWEsUUFBUSxjQUFXLFFBQU8sU0FBUyxNQUFNeGhCLE1BQU04ZSxLQUFLLEdBQUcsaUNBQUMsVUFBSyxlQUFZLFFBQU8saUJBQXpCO0FBQUE7QUFBQTtBQUFBO0FBQUEscUJBQTBCLEtBQWpMO0FBQUE7QUFBQTtBQUFBO0FBQUEscUJBQXdMO0FBQUEsY0FDeEwsdUJBQUMsWUFBTyxNQUFLLFVBQVMsVUFBVSxDQUFDaGhCLFNBQVN5aEIsUUFBUWtDLFNBQVMsT0FBTzNqQixTQUFTeWhCLFFBQVFtQyxhQUFhLFFBQVEsY0FBVyxRQUFPLFNBQVMsTUFBTTFoQixNQUFNNmUsS0FBSyxHQUFHLGlDQUFDLFVBQUssZUFBWSxRQUFPLGlCQUF6QjtBQUFBO0FBQUE7QUFBQTtBQUFBLHFCQUEwQixLQUFqTDtBQUFBO0FBQUE7QUFBQTtBQUFBLHFCQUF3TDtBQUFBLGNBQ3hMLHVCQUFDLFlBQU8sTUFBSyxVQUFTLFdBQVc3QyxjQUFjLGNBQWMsSUFBSSxTQUFTLE1BQU1DLGVBQWUsQ0FBQ0QsV0FBVyxHQUFHLG9CQUE5RztBQUFBO0FBQUE7QUFBQTtBQUFBLHFCQUFrSDtBQUFBLGNBQ2xILHVCQUFDLFlBQU8sTUFBSyxVQUFTLFdBQVdFLGVBQWUsY0FBYyxJQUFJLFNBQVNtRixnQkFBaUJuRix5QkFBZSxhQUFhLFlBQXhIO0FBQUE7QUFBQTtBQUFBO0FBQUEscUJBQWlJO0FBQUEsY0FDakksdUJBQUMsWUFBTyxNQUFLLFVBQVMsV0FBV3BlLFNBQVM2VCxVQUFVL1IsVUFBVSx5QkFBeUIsY0FBYyxJQUFJLFVBQVU5QixTQUFTNlQsWUFBWTdULFNBQVM2VCxTQUFTL1IsVUFBVSx3QkFBd0IsU0FBUzBoQixjQUFleGpCLG1CQUFTNlQsVUFBVS9SLFVBQVUseUJBQXlCLFdBQVcsV0FBclI7QUFBQTtBQUFBO0FBQUE7QUFBQSxxQkFBNlI7QUFBQSxjQUM3Uix1QkFBQyxhQUFRLFdBQVUscUJBQ2pCO0FBQUEsdUNBQUMsYUFBUSxvQkFBVDtBQUFBO0FBQUE7QUFBQTtBQUFBLHVCQUFhO0FBQUEsZ0JBQ2IsdUJBQUMsU0FDQztBQUFBLHlDQUFDLFlBQU8sTUFBSyxVQUFTLFNBQVNrZ0IsZUFBZSwwQkFBOUM7QUFBQTtBQUFBO0FBQUE7QUFBQSx5QkFBd0Q7QUFBQSxrQkFDeEQsdUJBQUMsWUFBTyxNQUFLLFVBQVMsU0FBUyxNQUFNL3BCLDZCQUE2QitILFNBQVM3RCxRQUFRLEdBQUcsMkJBQXRGO0FBQUE7QUFBQTtBQUFBO0FBQUEseUJBQWlHO0FBQUEsa0JBQ2pHLHVCQUFDLFlBQU8sTUFBSyxVQUFTLFNBQVMsTUFBTXdpQixVQUFVdFgsU0FBU3laLE1BQU0sR0FBRywyQkFBakU7QUFBQTtBQUFBO0FBQUE7QUFBQSx5QkFBNEU7QUFBQSxxQkFIOUU7QUFBQTtBQUFBO0FBQUE7QUFBQSx1QkFJQTtBQUFBLG1CQU5GO0FBQUE7QUFBQTtBQUFBO0FBQUEscUJBT0E7QUFBQSxjQUNBLHVCQUFDLFdBQU0sS0FBS25DLFdBQVcsUUFBTSxNQUFDLE1BQUssUUFBTyxRQUFPLG9CQUFtQixVQUFVLE9BQU85YixVQUFVO0FBQzdGLHNCQUFNZ2hCLE9BQU9oaEIsTUFBTS9HLE9BQU9nb0IsUUFBUSxDQUFDO0FBQ25DLG9CQUFJLENBQUNELEtBQU07QUFDWCxvQkFBSTtBQUNGLHdCQUFNRSxXQUFXQyxLQUFLQyxNQUFNLE1BQU1KLEtBQUsvaUIsS0FBSyxDQUFDO0FBQzdDdEksb0RBQWtDdXJCLFFBQVE7QUFDMUM3aEIsd0JBQU1tZCxnQkFBZ0IsbUJBQW1CMEUsUUFBUTtBQUFBLGdCQUNuRCxTQUFTbkUsT0FBTztBQUFFMWQsd0JBQU1TLGFBQWEsRUFBRW1kLFFBQVEsVUFBVTlkLFNBQVM0ZCxNQUFNNWQsUUFBUSxDQUFDO0FBQUEsZ0JBQUc7QUFDcEZhLHNCQUFNL0csT0FBTzFCLFFBQVE7QUFBQSxjQUN2QixLQVRBO0FBQUE7QUFBQTtBQUFBO0FBQUEscUJBU0U7QUFBQSxjQUNGLHVCQUFDLFlBQU8sTUFBSyxVQUFTLDBCQUFzQixNQUFDLFdBQVUsV0FBVSxVQUFVNEYsU0FBU3lpQixVQUFVM0MsV0FBVyxVQUFVLFNBQVNvQixNQUFNO0FBQUEsdUNBQUMsVUFBTXNCLHlCQUFQO0FBQUE7QUFBQTtBQUFBO0FBQUEsdUJBQW1CO0FBQUEsZ0JBQU8sdUJBQUMsU0FBSSxrQkFBTDtBQUFBO0FBQUE7QUFBQTtBQUFBLHVCQUFPO0FBQUEsbUJBQW5LO0FBQUE7QUFBQTtBQUFBO0FBQUEscUJBQXlLO0FBQUEsaUJBeEIzSztBQUFBO0FBQUE7QUFBQTtBQUFBLG1CQXlCQTtBQUFBLGVBNUJGO0FBQUE7QUFBQTtBQUFBO0FBQUEsaUJBNkJBO0FBQUEsVUFFQ3hpQixTQUFTa2tCLGNBQWN2RSxZQUFZLHVCQUFDLFNBQUksV0FBVSx5QkFBd0I7QUFBQSxtQ0FBQyxVQUFLO0FBQUE7QUFBQSxjQUF1QixJQUFJRixLQUFLemYsU0FBU2trQixjQUFjOWhCLE1BQU1vZCxTQUFTLEVBQUUyRSxlQUFlO0FBQUEsY0FBRTtBQUFBLGlCQUEvRjtBQUFBO0FBQUE7QUFBQTtBQUFBLG1CQUE2RztBQUFBLFlBQU8sdUJBQUMsWUFBTyxNQUFLLFVBQVMsU0FBUyxNQUFNO0FBQUVqaUIsb0JBQU1tZCxnQkFBZ0IsaUJBQWlCcmYsU0FBU2trQixjQUFjOWhCLE1BQU1qRyxRQUFRO0FBQUcrRixvQkFBTXdkLGlCQUFpQixFQUFFQyxXQUFXLE1BQU0sQ0FBQztBQUFBLFlBQUcsR0FBRyx1Q0FBdks7QUFBQTtBQUFBO0FBQUE7QUFBQSxtQkFBOEw7QUFBQSxZQUFTLHVCQUFDLFlBQU8sTUFBSyxVQUFTLFNBQVMsTUFBTTtBQUFFMW5CLDJDQUE2QitILFNBQVNra0IsY0FBYzloQixNQUFNakcsVUFBVSwrQkFBK0I7QUFBQSxZQUFHLEdBQUcsc0JBQWhKO0FBQUE7QUFBQTtBQUFBO0FBQUEsbUJBQXNKO0FBQUEsWUFBUyx1QkFBQyxZQUFPLE1BQUssVUFBUyxTQUFTLE1BQU07QUFBRW5FLCtDQUFpQztBQUFHa0ssb0JBQU13ZCxpQkFBaUIsRUFBRUMsV0FBVyxNQUFNLENBQUM7QUFBQSxZQUFHLEdBQUcsdUJBQTVIO0FBQUE7QUFBQTtBQUFBO0FBQUEsbUJBQW1JO0FBQUEsZUFBcG9CO0FBQUE7QUFBQTtBQUFBO0FBQUEsaUJBQTZvQixJQUFTO0FBQUEsVUFDenJCM2YsU0FBU3lpQixVQUFVemdCLFVBQVUsdUJBQUMsU0FBSSxXQUFXLGdDQUFnQ2hDLFNBQVN5aUIsVUFBVTNDLE1BQU0sSUFBSzlmO0FBQUFBLHFCQUFTeWlCLFVBQVV6Z0I7QUFBQUEsWUFBUSx1QkFBQyxZQUFPLE1BQUssVUFBUyxjQUFXLG1CQUFrQixTQUFTLE1BQU1FLE1BQU1TLGFBQWEsRUFBRVgsU0FBUyxHQUFHLENBQUMsR0FBRyxpQkFBdkc7QUFBQTtBQUFBO0FBQUE7QUFBQSxtQkFBd0c7QUFBQSxlQUFqTjtBQUFBO0FBQUE7QUFBQTtBQUFBLGlCQUEwTixJQUFTO0FBQUEsVUFFaFFrYyxjQUFjLHVCQUFDLHFCQUFrQixZQUFuQjtBQUFBO0FBQUE7QUFBQTtBQUFBLGlCQUFzQyxJQUFNO0FBQUEsVUFDMURFLGVBQWUsdUJBQUMsU0FBSSxXQUFVLGtDQUFpQztBQUFBLG1DQUFDLFlBQU8sNkJBQVI7QUFBQTtBQUFBO0FBQUE7QUFBQSxtQkFBcUI7QUFBQSxZQUFTLHVCQUFDLFlBQU8sTUFBSyxVQUFTLFNBQVMsTUFBTVQsV0FBV3RXLFNBQVMrYyxnQkFBZ0IsRUFBRUMsS0FBSyxNQUFNLENBQUMsR0FBRyxpQkFBMUY7QUFBQTtBQUFBO0FBQUE7QUFBQSxtQkFBMkY7QUFBQSxZQUFTLHVCQUFDLFlBQU8sTUFBSyxVQUFTLFNBQVMsTUFBTTFHLFdBQVd0VyxTQUFTK2MsZ0JBQWdCLEVBQUVFLE9BQU8sS0FBSyxDQUFDLEdBQUcsaUJBQTNGO0FBQUE7QUFBQTtBQUFBO0FBQUEsbUJBQTRGO0FBQUEsWUFBUyx1QkFBQyxZQUFPLE1BQUssVUFBUyxTQUFTLE1BQU0zRyxXQUFXdFcsU0FBUytjLGdCQUFnQixFQUFFRSxPQUFPLE1BQU0sQ0FBQyxHQUFHLGlCQUE1RjtBQUFBO0FBQUE7QUFBQTtBQUFBLG1CQUE2RjtBQUFBLFlBQVMsdUJBQUMsWUFBTyxNQUFLLFVBQVMsU0FBUyxNQUFNM0csV0FBV3RXLFNBQVMrYyxnQkFBZ0IsRUFBRUMsS0FBSyxLQUFLLENBQUMsR0FBRyxpQkFBekY7QUFBQTtBQUFBO0FBQUE7QUFBQSxtQkFBMEY7QUFBQSxZQUFTLHVCQUFDLFlBQU8sTUFBSyxVQUFTLFNBQVMsTUFBTTFHLFdBQVd0VyxTQUFTK2MsZ0JBQWdCLEVBQUVHLFVBQVUsS0FBSyxDQUFDLEdBQUcsaUJBQTlGO0FBQUE7QUFBQTtBQUFBO0FBQUEsbUJBQStGO0FBQUEsWUFBUyx1QkFBQyxZQUFPLE1BQUssVUFBUyxTQUFTLE1BQU01RyxXQUFXdFcsU0FBUytjLGdCQUFnQixFQUFFRyxVQUFVLElBQUksQ0FBQyxHQUFHLGlCQUE3RjtBQUFBO0FBQUE7QUFBQTtBQUFBLG1CQUE4RjtBQUFBLFlBQVMsdUJBQUMsWUFBTyxNQUFLLFVBQVMsU0FBUyxNQUFNNUcsV0FBV3RXLFNBQVNtZCxnQkFBZ0IsR0FBRyxxQkFBNUU7QUFBQTtBQUFBO0FBQUE7QUFBQSxtQkFBaUY7QUFBQSxZQUFTLHVCQUFDLFdBQU0sK0VBQVA7QUFBQTtBQUFBO0FBQUE7QUFBQSxtQkFBc0U7QUFBQSxlQUEvMEI7QUFBQTtBQUFBO0FBQUE7QUFBQSxpQkFBdTFCLElBQVM7QUFBQSxVQUVoM0IsdUJBQUMsYUFBVSxPQUFjLFVBQW9CLGNBQTRCLGdCQUFnQyxXQUFzQixnQkFBL0g7QUFBQTtBQUFBO0FBQUE7QUFBQSxpQkFBMEo7QUFBQSxVQUMxSjtBQUFBLFlBQUM7QUFBQTtBQUFBLGNBQ0MsTUFBSztBQUFBLGNBQ0wsV0FBVTtBQUFBLGNBQ1YsaUJBQWM7QUFBQSxjQUNkLGlCQUFleG5CO0FBQUFBLGNBQ2YsT0FBT0EsZUFBZSxrQkFBa0I7QUFBQSxjQUN4QyxTQUFTLE1BQU13aEIsZ0JBQWdCLENBQUNpRyxTQUFTLENBQUNBLElBQUk7QUFBQSxjQUM5Q3puQjtBQUFBQSwrQkFBZSx1QkFBQyxlQUFZLGVBQVksVUFBekI7QUFBQTtBQUFBO0FBQUE7QUFBQSx1QkFBK0IsSUFBTSx1QkFBQyxhQUFVLGVBQVksVUFBdkI7QUFBQTtBQUFBO0FBQUE7QUFBQSx1QkFBNkI7QUFBQSxnQkFBSSx1QkFBQyxVQUFNQSx5QkFBZSxrQkFBa0IsbUJBQXhDO0FBQUE7QUFBQTtBQUFBO0FBQUEsdUJBQXdEO0FBQUE7QUFBQTtBQUFBLFlBUC9JO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQSxVQU9zSjtBQUFBLFVBQ3RKLHVCQUFDLFNBQUksSUFBRywrQkFBOEIsV0FBVSx1QkFBc0IsZUFBYSxDQUFDQSxjQUNsRjtBQUFBLG1DQUFDLFNBQUksV0FBVSwyQkFDYjtBQUFBLHFDQUFDLFVBQUs7QUFBQSx1Q0FBQyxZQUFRMEksb0JBQVU1RCxTQUFTLGNBQTVCO0FBQUE7QUFBQTtBQUFBO0FBQUEsdUJBQXVDO0FBQUEsZ0JBQVM7QUFBQSxnQkFBRTRELFdBQVcsR0FBR0EsU0FBU25GLElBQUksTUFBTWYsU0FBU25GLEtBQUtFLElBQUksR0FBR29vQixpQkFBaUIsQ0FBQyxDQUFDLENBQUMsYUFBYW5qQixTQUFTbWpCLGNBQWMsQ0FBQyxTQUFTelIsaUJBQWlCeVIsaUJBQWlCLE9BQVEsTUFBTW5qQixTQUFTMFIsY0FBYyxDQUFDLGNBQWMsRUFBRSxLQUFLO0FBQUEsbUJBQTdRO0FBQUE7QUFBQTtBQUFBO0FBQUEscUJBQWdSO0FBQUEsY0FDL1EwUixtQkFBbUIsSUFBSSx1QkFBQyxVQUFLLFdBQVUsZ0NBQWdDQTtBQUFBQTtBQUFBQSxnQkFBaUI7QUFBQSxtQkFBakU7QUFBQTtBQUFBO0FBQUE7QUFBQSxxQkFBaUYsSUFBVTtBQUFBLGNBQ25ILHVCQUFDLFVBQU01aUIsbUJBQVMwa0IsVUFBVSxtQkFBbUIsa0JBQTdDO0FBQUE7QUFBQTtBQUFBO0FBQUEscUJBQTREO0FBQUEsY0FDNUQsdUJBQUMsWUFBTyxNQUFLLFVBQVMsV0FBVzFrQixTQUFTMGtCLFVBQVUsY0FBYyxJQUFJLFNBQVMsTUFBTXhpQixNQUFNeWlCLFdBQVcsQ0FBQzNrQixTQUFTMGtCLE9BQU8sR0FBRywwQkFBMUg7QUFBQTtBQUFBO0FBQUE7QUFBQSxxQkFBb0k7QUFBQSxjQUNwSSx1QkFBQyxZQUFPLE1BQUssVUFBUyxXQUFXN0IsYUFBYSxjQUFjLElBQUksU0FBU0UsWUFBYUYsdUJBQWEsa0JBQWtCLGtCQUFySDtBQUFBO0FBQUE7QUFBQTtBQUFBLHFCQUFvSTtBQUFBLGNBQ3BJLHVCQUFDLFlBQU8sTUFBSyxVQUFTLFNBQVNLLGFBQWEsNEJBQTVDO0FBQUE7QUFBQTtBQUFBO0FBQUEscUJBQXdEO0FBQUEsY0FDeEQsdUJBQUMsWUFBTyxNQUFLLFVBQVMsVUFBVSxDQUFDUixrQkFBa0IsU0FBU1MsWUFBWSwyQkFBeEU7QUFBQTtBQUFBO0FBQUE7QUFBQSxxQkFBbUY7QUFBQSxjQUNsRixDQUFDLFVBQVUsU0FBUyxNQUFNLEVBQUVwZixJQUFJLENBQUNrZixVQUFVLHVCQUFDLFlBQU8sTUFBSyxVQUFxQixXQUFXampCLFNBQVNxRCxVQUFVc0wsY0FBY3NVLFFBQVEsY0FBYyxJQUFJLFNBQVMsTUFBTUQsV0FBV0MsS0FBSyxHQUFHO0FBQUE7QUFBQSxnQkFBTUE7QUFBQUEsbUJBQXJIQSxPQUEzQjtBQUFBO0FBQUE7QUFBQTtBQUFBLHFCQUFzSixDQUFTO0FBQUEsY0FDMU1ILG1CQUFtQix1QkFBQyxZQUFPLE1BQUssVUFBUyxXQUFVLDJCQUEwQixVQUFVQSxpQkFBaUIvZ0IsVUFBVSxPQUFPK2dCLGlCQUFpQjlnQixXQUFXLEdBQUc4Z0IsaUJBQWlCaGhCLEtBQUssdUJBQXVCLFNBQVMsTUFBTVcsd0JBQXdCUCxPQUFPbEMsUUFBUSxHQUFHO0FBQUEsdUNBQUMsVUFBTyxlQUFZLFVBQXBCO0FBQUE7QUFBQTtBQUFBO0FBQUEsdUJBQTBCO0FBQUEsZ0JBQUk4aUIsaUJBQWlCaGhCO0FBQUFBLG1CQUExUjtBQUFBO0FBQUE7QUFBQTtBQUFBLHFCQUFnUyxJQUFZO0FBQUEsY0FDL1RrVyxpQkFBaUIsdUJBQUMsVUFBSyxXQUFVLG9CQUFvQkE7QUFBQUEsK0JBQWU0TSxZQUFZbmxCLFFBQVEsQ0FBQztBQUFBLGdCQUFFO0FBQUEsZ0JBQU11WSxlQUFlNk07QUFBQUEsZ0JBQVU7QUFBQSxnQkFBUzdNLGVBQWU4TSxXQUFXWCxlQUFlO0FBQUEsZ0JBQUU7QUFBQSxnQkFBUW5NLGVBQWUrTTtBQUFBQSxnQkFBZ0I7QUFBQSxnQkFBYy9NLGVBQWVnTjtBQUFBQSxnQkFBZTtBQUFBLG1CQUFoUDtBQUFBO0FBQUE7QUFBQTtBQUFBLHFCQUF5UCxJQUFVO0FBQUEsY0FDcFJqSCxZQUFZbmhCLFNBQVMsdUJBQUMsWUFBTyxjQUFXLHNCQUFxQixjQUFhLElBQUcsVUFBVSxDQUFDaUcsVUFBVTtBQUFFLHNCQUFNb2lCLFFBQVFsSCxZQUFZampCLEtBQUssQ0FBQ3VFLFNBQVNBLEtBQUtyRSxPQUFPNkgsTUFBTS9HLE9BQU8xQixLQUFLO0FBQUcsb0JBQUk2cUIsT0FBTztBQUFFL2lCLHdCQUFNbWQsZ0JBQWdCLFdBQVc0RixNQUFNM04sSUFBSSxJQUFJMk4sTUFBTTlvQixRQUFRO0FBQUcrRix3QkFBTWEsYUFBYSxFQUFFQyxPQUFPLFlBQVk3RCxTQUFTOGxCLE1BQU05bEIsU0FBUzhELFNBQVMsTUFBTSxDQUFDO0FBQUEsZ0JBQUc7QUFBRUosc0JBQU0vRyxPQUFPMUIsUUFBUTtBQUFBLGNBQUksR0FBRztBQUFBLHVDQUFDLFlBQU8sT0FBTSxJQUFHO0FBQUE7QUFBQSxrQkFBYzJqQixZQUFZbmhCO0FBQUFBLGtCQUFPO0FBQUEscUJBQWxEO0FBQUE7QUFBQTtBQUFBO0FBQUEsdUJBQW1EO0FBQUEsZ0JBQVVtaEIsWUFBWWhhLElBQUksQ0FBQzFFLFNBQVMsdUJBQUMsWUFBTyxPQUFPQSxLQUFLckUsSUFBbUJxRSxlQUFLaVksUUFBZmpZLEtBQUtyRSxJQUFsQztBQUFBO0FBQUE7QUFBQTtBQUFBLHVCQUFpRCxDQUFTO0FBQUEsbUJBQXhlO0FBQUE7QUFBQTtBQUFBO0FBQUEscUJBQTBlLElBQVk7QUFBQSxpQkFYOWdCO0FBQUE7QUFBQTtBQUFBO0FBQUEsbUJBWUE7QUFBQSxZQUNBLHVCQUFDLFlBQVMsT0FBYyxZQUF4QjtBQUFBO0FBQUE7QUFBQTtBQUFBLG1CQUEyQztBQUFBLGVBZDdDO0FBQUE7QUFBQTtBQUFBO0FBQUEsaUJBZUE7QUFBQSxVQUNBLHVCQUFDLFNBQUksV0FBVSw0QkFBMkIsY0FBVyxnQkFBZTtBQUFBLG1DQUFDLFlBQU8sTUFBSyxVQUFTLFdBQVdzakIsZUFBZSxhQUFhLGNBQWMsSUFBSSxTQUFTLE1BQU1DLGNBQWMsVUFBVSxHQUFHLHdCQUF6SDtBQUFBO0FBQUE7QUFBQTtBQUFBLG1CQUFpSTtBQUFBLFlBQVMsdUJBQUMsWUFBTyxNQUFLLFVBQVMsV0FBV0QsZUFBZSxZQUFZLGNBQWMsSUFBSSxTQUFTLE1BQU1DLGNBQWMsU0FBUyxHQUFHLHVCQUF2SDtBQUFBO0FBQUE7QUFBQTtBQUFBLG1CQUE4SDtBQUFBLFlBQVMsdUJBQUMsWUFBTyxNQUFLLFVBQVMsV0FBV0QsZUFBZSxZQUFZLGNBQWMsSUFBSSxTQUFTLE1BQU1DLGNBQWMsU0FBUyxHQUFHLHVCQUF2SDtBQUFBO0FBQUE7QUFBQTtBQUFBLG1CQUE4SDtBQUFBLGVBQW5kO0FBQUE7QUFBQTtBQUFBO0FBQUEsaUJBQTRkO0FBQUE7QUFBQTtBQUFBLE1BckU5ZDtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUEsSUFzRUE7QUFBQSxJQUNDcGlCLFNBQVMrb0I7QUFBQUEsRUFBSTtBQUNsQjtBQUFDckgsSUEvUnVCSCxzQkFBb0I7QUFBQSxPQUFwQkE7QUFBb0IsSUFBQTNZLElBQUFLLEtBQUFZLEtBQUFtZixLQUFBdFUsS0FBQWlCLEtBQUFrQixLQUFBb1MsS0FBQTdQLEtBQUFTLEtBQUE2QixLQUFBd0MsTUFBQU0sTUFBQTBLLE1BQUFDLE1BQUE3SCxNQUFBOEg7QUFBQSxhQUFBeGdCLElBQUE7QUFBQSxhQUFBSyxLQUFBO0FBQUEsYUFBQVksS0FBQTtBQUFBLGFBQUFtZixLQUFBO0FBQUEsYUFBQXRVLEtBQUE7QUFBQSxhQUFBaUIsS0FBQTtBQUFBLGFBQUFrQixLQUFBO0FBQUEsYUFBQW9TLEtBQUE7QUFBQSxhQUFBN1AsS0FBQTtBQUFBLGFBQUFTLEtBQUE7QUFBQSxhQUFBNkIsS0FBQTtBQUFBLGFBQUF3QyxNQUFBO0FBQUEsYUFBQU0sTUFBQTtBQUFBLGFBQUEwSyxNQUFBO0FBQUEsYUFBQUMsTUFBQTtBQUFBLGFBQUE3SCxNQUFBO0FBQUEsYUFBQThILE1BQUEiLCJuYW1lcyI6WyJ1c2VFZmZlY3QiLCJ1c2VSZWYiLCJ1c2VTdGF0ZSIsInVzZVN5bmNFeHRlcm5hbFN0b3JlIiwiY3JlYXRlUG9ydGFsIiwiQ2hlY2siLCJDaGV2cm9uRG93biIsIkNoZXZyb25MZWZ0IiwiQ2hldnJvblJpZ2h0IiwiQ2hldnJvblVwIiwiQ2lyY2xlQWxlcnQiLCJEaWFtb25kIiwiSW5mbyIsIkxvY2tLZXlob2xlIiwiUGF1c2UiLCJQbGF5IiwiU2tpcEJhY2siLCJTa2lwRm9yd2FyZCIsIlRyYXNoMiIsIkFCT1VUX05BUlJBVElWRV9HTE9CQUxfQ09OVFJPTFMiLCJBQk9VVF9OQVJSQVRJVkVfQ09SUkVTUE9OREVOQ0VfTU9ERVMiLCJBQk9VVF9OQVJSQVRJVkVfRElTQ0lQTElORV9SRVZFQUxfQ09OVFJPTFMiLCJBQk9VVF9OQVJSQVRJVkVfRU1QSEFTSVNfVE9ORVMiLCJBQk9VVF9OQVJSQVRJVkVfTU9ESUZJRVJfREVGSU5JVElPTlMiLCJBQk9VVF9OQVJSQVRJVkVfU0hBUEVfREVGSU5JVElPTlMiLCJjbGVhckFib3V0TmFycmF0aXZlUmVjb3ZlcnlEcmFmdCIsImV4cG9ydEFib3V0TmFycmF0aXZlRG9jdW1lbnQiLCJsb2FkQWJvdXROYXJyYXRpdmVTb3VyY2UiLCJyZWFkQWJvdXROYXJyYXRpdmVDaGVja3BvaW50cyIsInJlYWRBYm91dE5hcnJhdGl2ZVJlY292ZXJ5RHJhZnQiLCJzYXZlQWJvdXROYXJyYXRpdmVTb3VyY2UiLCJ3cml0ZUFib3V0TmFycmF0aXZlQ2hlY2twb2ludCIsIndyaXRlQWJvdXROYXJyYXRpdmVSZWNvdmVyeURyYWZ0IiwiYXNzZXJ0VmFsaWRBYm91dE5hcnJhdGl2ZURvY3VtZW50IiwiY2xvbmVBYm91dE5hcnJhdGl2ZURvY3VtZW50IiwiZ2V0QWJvdXROYXJyYXRpdmVDdWVNb3ZlbWVudCIsImdldEFib3V0TmFycmF0aXZlQ3VlTW90aW9uSW50ZXJ2YWwiLCJnZXRBYm91dE5hcnJhdGl2ZVdvcmxkVHJhbnNpdGlvbkxpbWl0Iiwic2FtcGxlQWJvdXROYXJyYXRpdmVQbGFuIiwiY2FwdHVyZUFib3V0TmFycmF0aXZlUGxheWhlYWRDb250ZXh0IiwiY3JlYXRlQWJvdXROYXJyYXRpdmVDdWVDbGlwYm9hcmRQYXlsb2FkIiwiZGVyaXZlQWJvdXROYXJyYXRpdmVMb29wUmFuZ2UiLCJkdXBsaWNhdGVBYm91dE5hcnJhdGl2ZUN1ZUdyb3VwIiwiZHVwbGljYXRlQWJvdXROYXJyYXRpdmVTZWN0aW9uIiwiZ2V0QWJvdXROYXJyYXRpdmVDYW1lcmFLZXlUaW1pbmdCb3VuZHMiLCJnZXRBYm91dE5hcnJhdGl2ZUN1ZVRpbWluZ0JvdW5kcyIsImdldEFib3V0TmFycmF0aXZlRXh0ZW50RmllbGQiLCJnZXRBYm91dE5hcnJhdGl2ZVNlbGVjdGlvbk1lbWJlcnMiLCJtb3ZlQWJvdXROYXJyYXRpdmVDdWVUaW1pbmciLCJyZW1hcEFib3V0TmFycmF0aXZlUGxheWhlYWRDb250ZXh0IiwicmVzb2x2ZUFib3V0TmFycmF0aXZlQ2FtZXJhS2V5RHJvcCIsInJlc29sdmVBYm91dE5hcnJhdGl2ZUN1ZURpc3RyaWJ1dGlvbiIsInJlc29sdmVBYm91dE5hcnJhdGl2ZUN1ZUV4YWN0R2FwIiwicmVzb2x2ZUFib3V0TmFycmF0aXZlQ3VlR3JvdXBNb3ZlIiwicmVzb2x2ZUFib3V0TmFycmF0aXZlQ3VlR3JvdXBBbGlnbiIsInJlc29sdmVBYm91dE5hcnJhdGl2ZUN1ZUdyb3VwUGFzdGUiLCJzbmFwQWJvdXROYXJyYXRpdmVUaW1lbGluZVZhbHVlIiwic3RpdGNoQWJvdXROYXJyYXRpdmVDYW1lcmFCb3VuZGFyaWVzIiwidG9nZ2xlQWJvdXROYXJyYXRpdmVDdWVTZWxlY3Rpb24iLCJ2YWxpZGF0ZUFib3V0TmFycmF0aXZlQ3VlQ2xpcGJvYXJkUGF5bG9hZCIsImNsYW1wMDEiLCJ2YWx1ZSIsIk1hdGgiLCJtaW4iLCJtYXgiLCJBQk9VVF9FRElUT1JfVElNRUxJTkVfU1RPUkFHRV9LRVkiLCJUSU1FTElORV9LRVlfRVBTSUxPTiIsIklOU1BFQ1RPUl9FREdFX0dBUCIsIkNBTUVSQV9QT1NFX0ZJRUxEUyIsIlNldCIsIkRJU0NJUExJTkVfUkVWRUFMX01BWCIsImZpbmQiLCJjb250cm9sIiwiaWQiLCJESVNDSVBMSU5FX0JBTExfVE9LRU5fQllfR1JPVVAiLCJPYmplY3QiLCJmcmVlemUiLCJjYW1lcmFQb3NlQ2hhbmdlcyIsImZyb20iLCJ0byIsInNvbWUiLCJmaWVsZCIsImluZGV4IiwiYWJzIiwiZm92Iiwicm9sbCIsImNvcHlDYW1lcmFQb3NlIiwidGFyZ2V0Iiwic291cmNlIiwib2Zmc2V0IiwibG9va0F0T2Zmc2V0IiwibGlua0NhbWVyYUJvdW5kYXJ5IiwiZG9jdW1lbnQiLCJzZWN0aW9uSW5kZXgiLCJrZXlJbmRleCIsInNlY3Rpb24iLCJzZWN0aW9ucyIsImtleSIsImNhbWVyYSIsImtleXMiLCJhdCIsImxlbmd0aCIsImJyaWRnZUNhbWVyYVNlY3Rpb24iLCJnZXRJbnNwZWN0b3JWZXJ0aWNhbEJvdW5kcyIsImluc3BlY3RvciIsInRpbWVsaW5lT3BlbiIsImVkaXRvciIsImNsb3Nlc3QiLCJzdHlsZXMiLCJnZXRDb21wdXRlZFN0eWxlIiwidG9wYmFySGVpZ2h0IiwiTnVtYmVyIiwicGFyc2VGbG9hdCIsImdldFByb3BlcnR5VmFsdWUiLCJ0aW1lbGluZUhlaWdodCIsImJ1dHRvbkJhclRvcCIsInF1ZXJ5U2VsZWN0b3IiLCJnZXRCb3VuZGluZ0NsaWVudFJlY3QiLCJ0b3AiLCJ3aW5kb3ciLCJpbm5lckhlaWdodCIsIm1pblRvcCIsIm1heEJvdHRvbSIsImNsYW1wSW5zcGVjdG9yUG9zaXRpb24iLCJwb3NpdGlvbiIsIm1heFdpZHRoIiwiaW5uZXJXaWR0aCIsIndpZHRoIiwiYXZhaWxhYmxlSGVpZ2h0IiwiaGVpZ2h0IiwibWF4TGVmdCIsIm1heFRvcCIsImxlZnQiLCJnZXRTZWN0aW9uSW5kZXgiLCJzZWN0aW9uSWQiLCJmaW5kSW5kZXgiLCJnZXRTZWN0aW9uIiwic2VsZWN0aW9uIiwiZ2V0TG9jYWxQcm9ncmVzcyIsInBsYW4iLCJzdG9yeVdVIiwiY29tcGlsZWQiLCJpdGVtIiwic3RhcnRXVSIsInRyYXZlbFdVIiwiZm9ybWF0V1UiLCJ0b0ZpeGVkIiwiZm9ybWF0Q2FtZXJhUGVyY2VudCIsImlzVGV4dEVkaXRpbmdUYXJnZXQiLCJIVE1MRWxlbWVudCIsIm1hdGNoZXMiLCJpc0NvbnRlbnRFZGl0YWJsZSIsImdldFRpbWVsaW5lS2V5ZnJhbWVzIiwic25hcHNob3QiLCJjb21waWxlZFBsYW4iLCJldmVudHMiLCJmb3JFYWNoIiwidG9TdG9yeVdVIiwicHVzaCIsInByaW9yaXR5IiwidHlwZSIsIndvcmxkIiwibW9kZSIsInRyYW5zaXRpb25JbiIsInBhcnQiLCJwYXJ0SW5kZXgiLCJrZXlQYXJ0IiwidGV4dCIsImN1ZXMiLCJjdWUiLCJjdWVJbmRleCIsImhvbGQiLCJjdWVJZCIsImRpc2NpcGxpbmVSZXZlYWwiLCJzdGFydCIsImludGVyYWN0aW9uIiwiaXNGaW5pdGUiLCJhY3RpdmF0aW9uU3RhcnQiLCJzb3J0IiwiYSIsImIiLCJnZXRUaW1lbGluZURlbGV0aW9uIiwicmVxdWlyZWQiLCJsYWJlbCIsImRpc2FibGVkIiwibWVzc2FnZSIsImV4ZWN1dGUiLCJzdG9yZSIsImNvbW1pdCIsImRyYWZ0Iiwic3BsaWNlIiwic3RhcnRzV2l0aCIsInRyYW5zaXRpb24iLCJlbmQiLCJkZWxldGVUaW1lbGluZVNlbGVjdGlvbiIsImRlbGV0aW9uIiwic2V0U2F2ZVN0YXRlIiwic2Vla1RpbWVsaW5lS2V5ZnJhbWUiLCJldmVudCIsInNldFNlbGVjdGlvbiIsInNldFRyYW5zcG9ydCIsIm93bmVyIiwicGxheWluZyIsImp1bXBUaW1lbGluZUtleWZyYW1lIiwiZGlyZWN0aW9uIiwiY3VycmVudFdVIiwidHJhbnNwb3J0IiwidGFyZ2V0UG9zaXRpb24iLCJyZXZlcnNlIiwibWFrZVNsdWciLCJ0b0xvd2VyQ2FzZSIsInJlcGxhY2UiLCJuZXh0SWQiLCJiYXNlIiwidXNlZCIsImZsYXRNYXAiLCJtYXAiLCJibG9ja3MiLCJibG9jayIsInN1ZmZpeCIsImhhcyIsInJlcGxhY2VEcmFmdERvY3VtZW50IiwibmV4dERvY3VtZW50IiwiYXNzaWduIiwiYXBwbHlDdWVNb3ZlcyIsIm1vdmVzIiwibW92ZSIsImVudGVyIiwiZXhpdCIsIlByb3BlcnR5IiwiY2hpbGRyZW4iLCJoaW50IiwiX2MiLCJOdW1iZXJQcm9wZXJ0eSIsInN0ZXAiLCJvbkNoYW5nZSIsInVuaXQiLCJfYzIiLCJUcmFuc3BvcnQiLCJtYXhXVSIsIm1heFN0b3J5V1UiLCJwbGF5Iiwic2VlayIsInNlbGVjdGVkIiwianVtcFNlY3Rpb24iLCJuZXh0IiwibGl2ZUFtYmllbnQiLCJwcmV2aWV3UHJvZmlsZSIsInNldFByZXZpZXdQcm9maWxlIiwiX2MzIiwiVGltZWxpbmUiLCJfcyIsInNlbGVjdGVkQ3VlTWVtYmVycyIsInJlZHVjZSIsInN1bSIsImV4dGVudFdVIiwicGxheWhlYWQiLCJsYW5lc1JlZiIsInRpbWluZ0RyYWdSZWYiLCJwcmV2aWV3RnJhbWVSZWYiLCJwZW5kaW5nUHJldmlld1JlZiIsInN1cHByZXNzZWRDbGlja1JlZiIsImNhbWVyYURyYWdQcmV2aWV3Iiwic2V0Q2FtZXJhRHJhZ1ByZXZpZXciLCJzZWN0aW9uUmVzaXplUHJldmlldyIsInNldFNlY3Rpb25SZXNpemVQcmV2aWV3IiwibWFycXVlZSIsInNldE1hcnF1ZWUiLCJxdWV1ZVByZXZpZXdGcmFtZSIsImNhbGxiYWNrIiwiY3VycmVudCIsInJlcXVlc3RBbmltYXRpb25GcmFtZSIsInBlbmRpbmciLCJmbHVzaFByZXZpZXdGcmFtZSIsImNhbmNlbEFuaW1hdGlvbkZyYW1lIiwiem9vbVRpbWVsaW5lIiwiY3RybEtleSIsIm1ldGFLZXkiLCJwcmV2ZW50RGVmYXVsdCIsImxhbmVzIiwicmVjdCIsInBvaW50ZXJYIiwiY2xpZW50WCIsInN0b3J5UmF0aW8iLCJzY3JvbGxMZWZ0Iiwic2Nyb2xsV2lkdGgiLCJjdXJyZW50Wm9vbSIsInpvb20iLCJuZXh0Wm9vbSIsImV4cCIsImRlbHRhWSIsInJlc29sdmVDYW1lcmFEcm9wQXRDbGllbnRYIiwiZ2V0U25hcHNob3QiLCJ2YWxpZCIsInJlYXNvbiIsImNvbnRlbnRYIiwiZHJhZyIsImRyb3AiLCJzb3VyY2VTZWN0aW9uSW5kZXgiLCJzb3VyY2VLZXlJbmRleCIsImJlZ2luVGltaW5nRHJhZyIsImxvY2tlZCIsImJ1dHRvbiIsImNsaXAiLCJjdXJyZW50VGFyZ2V0IiwicGFyZW50RWxlbWVudCIsInN0b3BQcm9wYWdhdGlvbiIsInNldFBvaW50ZXJDYXB0dXJlIiwicG9pbnRlcklkIiwibmV4dFNlbGVjdGlvbiIsImN1cnJlbnRTZWxlY3Rpb24iLCJjdXJyZW50TWVtYmVycyIsImFscmVhZHlTZWxlY3RlZCIsIm1lbWJlciIsInNoaWZ0S2V5IiwibWVtYmVycyIsImJlZ2luUHJldmlldyIsInN0YXJ0RG9jdW1lbnQiLCJzdGFydFBsYW4iLCJzdGFydFgiLCJtb3ZlZCIsImxhc3RBdCIsImxhc3REcm9wIiwibW92ZVRpbWluZ0RyYWciLCJ0b2tlbiIsImRlbHRhTGFuZSIsIm5leHRBdCIsImRlbHRhIiwicmV2ZWFsIiwiY29hbGVzY2VLZXkiLCJzZWN0aW9uU3RhcnRXVSIsImxvY2FsRGVsdGEiLCJtb3ZlbWVudCIsInByaW1hcnkiLCJkZWx0YVdVIiwibGFzdERlbHRhV1UiLCJ1cGRhdGVQcmV2aWV3IiwiZW5kVGltaW5nRHJhZyIsImhhc1BvaW50ZXJDYXB0dXJlIiwicmVsZWFzZVBvaW50ZXJDYXB0dXJlIiwiY2FuY2VsUHJldmlldyIsImNvbW1pdFByZXZpZXciLCJzb3VyY2VLZXlzIiwibW92ZWRLZXkiLCJkZXN0aW5hdGlvbktleXMiLCJzZXRUaW1lb3V0IiwiaGFuZGxlVGltaW5nQ2xpY2siLCJhY3Rpb24iLCJiZWdpblNlY3Rpb25SZXNpemUiLCJkYXRhIiwic2VjdGlvbkxhYmVsIiwic3RhcnRFeHRlbnQiLCJzdGFydE1heFdVIiwic3RhcnRTY3JvbGxXaWR0aCIsInBsYXloZWFkQ29udGV4dCIsInJlc2l6ZWRTZWN0aW9uSWQiLCJleHRlbnQiLCJtb3ZlU2VjdGlvblJlc2l6ZSIsInJhd0V4dGVudCIsImFsdEtleSIsInJvdW5kIiwibGFzdEV4dGVudCIsImVuZFNlY3Rpb25SZXNpemUiLCJyZXNldFNlY3Rpb25FeHRlbnQiLCJiYXNlbGluZVNlY3Rpb24iLCJiYXNlbGluZURvY3VtZW50IiwiY29udGV4dCIsImJlZ2luTWFycXVlZSIsImNhbnZhcyIsInN0YXJ0Q2xpZW50WCIsInN0YXJ0Q2xpZW50WSIsImNsaWVudFkiLCJjYW52YXNSZWN0IiwiYWRkaXRpdmUiLCJtb3ZlTWFycXVlZSIsImVuZE1hcnF1ZWUiLCJzZWxlY3Rpb25SZWN0IiwicmlnaHQiLCJib3R0b20iLCJsYW5lUmVjdCIsImhpdHMiLCJxdWVyeVNlbGVjdG9yQWxsIiwiZmlsdGVyIiwibm9kZSIsInZpc2libGUiLCJkYXRhc2V0Iiwic2xpY2UiLCJoaXQiLCJzb2xvVHJhY2siLCJsYW5lIiwibmV4dFN0YXJ0V1UiLCJzcGFuV1UiLCJpblNlbGVjdGVkU2VjdGlvbiIsImxvY2FsUGVyY2VudCIsImxvY2FsUG9zaXRpb24iLCJleHRlbmRlZExvY2FsUG9zaXRpb24iLCJleHRlbmRlZExvY2FsV2lkdGgiLCJ0ZXh0UG9zaXRpb24iLCJzZWxlY3RBdCIsImlzU2VsZWN0ZWQiLCJyZXNpemVFeHRlbnQiLCJyZXNvbHZlZEV4dGVudFdVIiwiU3RyaW5nIiwicGFkU3RhcnQiLCJmcm9tS2V5IiwidGltaW5nQm91bmRzIiwia2V5U2VsZWN0aW9uIiwidW5kZWZpbmVkIiwic2hhcGVJZCIsImlzUHJpbWFyeSIsImN1ZVNlbGVjdGlvbiIsImNvZGUiLCJkdXJhdGlvbiIsImNlbnRyZSIsInJldmVhbFNlbGVjdGlvbiIsImFjdGl2YXRpb24iLCJTZXF1ZW5jZUluc3BlY3RvciIsImNvbW1pdEdsb2JhbCIsImdyb3VwIiwiZ2xvYmFscyIsInRhcmdldEtleSIsImNvbnRyb2xzIiwiX2M1IiwiU2VjdGlvbkluc3BlY3RvciIsImNvbXBpbGVkU2VjdGlvbiIsImFjdGl2ZUV4dGVudEZpZWxkIiwiYWN0aXZlRXh0ZW50IiwicmVzb2x2ZWRFeHRlbnQiLCJjb250ZW50TWluaW11bUFjdGl2ZSIsInVwZGF0ZSIsIm11dGF0ZSIsInRvSW5kZXgiLCJkdXBsaWNhdGUiLCJyZXN1bHQiLCJtb2JpbGVFeHRlbnRXVSIsImxvY2FsIiwiZm9jdXMiLCJwcmVzZXQiLCJtb3Rpb24iLCJfYzYiLCJFZGl0b3JpYWxCbG9ja3MiLCJ1cGRhdGVCbG9jayIsImJsb2NrSW5kZXgiLCJ1cGRhdGVFbXBoYXNpcyIsImVtcGhhc2lzSW5kZXgiLCJlbXBoYXNpcyIsImFkZEVtcGhhc2lzIiwidHJpbSIsInNwbGl0Iiwiam9pbiIsInRvbmUiLCJyZW1vdmVFbXBoYXNpcyIsImtpbmQiLCJ3b3JsZEluZmx1ZW5jZSIsImNoZWNrZWQiLCJpdGVtcyIsIkJvb2xlYW4iLCJfYzciLCJDdWVSaHl0aG1BbmRSZXVzZSIsImNsaXBib2FyZCIsInNldENsaXBib2FyZCIsIl9zMiIsImdhcFdVIiwic2V0R2FwV1UiLCJhbmNob3IiLCJzZXRBbmNob3IiLCJwcmV2aWV3Iiwic2V0UHJldmlldyIsInNldE1lc3NhZ2UiLCJwcmV2aWV3TW92ZXMiLCJ0cnlTdGF0ZSIsImNhbmNlbFRyeSIsImJlZ2luVHJ5IiwiYXBwbHlQcmV2aWV3IiwiYXBwbHlUcnkiLCJjb21taXRDYW5kaWRhdGUiLCJkaXN0cmlidXRlIiwiZXhhY3RHYXAiLCJhbGlnblByaW1hcnkiLCJwbGF5aGVhZFdVIiwiY29weSIsInBheWxvYWQiLCJ2YWxpZGF0aW9uIiwicGFzdGUiLCJkZXN0aW5hdGlvblNlY3Rpb25JZCIsImdob3N0TW92ZXMiLCJDdWVJbnNwZWN0b3IiLCJzZWxlY3RlZE1lbWJlcnMiLCJyZW1vdmUiLCJtb3Rpb25JbnRlcnZhbCIsInRleHRNb3Rpb24iLCJtb3ZlQ3VlIiwicGVyY2VudCIsInVwZGF0ZU1vdmVtZW50IiwibWVtYmVyU2VjdGlvbiIsIm1lbWJlckN1ZSIsIl9jOSIsIkRpc2NpcGxpbmVSZXZlYWxJbnNwZWN0b3IiLCJvY2N1cGllZCIsInN0YWdnZXIiLCJsYWJlbER1cmF0aW9uIiwibGltaXRzRm9yIiwibGltaXRzIiwiaXRlbUluZGV4IiwiYmFja2dyb3VuZCIsIl9jMCIsIkNhbWVyYUluc3BlY3RvciIsInNlbGVjdGVkS2V5IiwidGFyZ2V0QXQiLCJhcHBseVByZXNldCIsInJlY2lwZXMiLCJQdXNoIiwiZWFzaW5nIiwiR2xpZGUiLCJPcmJpdCIsIlJldmVhbCIsIlJlc29sdmUiLCJleGlzdGluZ0tleUF0UGxheWhlYWQiLCJzZXRLZXkiLCJpbnNlcnRpb25JbmRleCIsInNlbGVjdGVkS2V5SW5kZXgiLCJzYW1wbGVkIiwiYmFzZVoiLCJzdGFydFoiLCJjYWRlbmNlIiwibmV3S2V5IiwiYXhpcyIsIm5hbWUiLCJBcnJheSIsImlzQXJyYXkiLCJ1cGRhdGVWZWN0b3IiLCJleHRlbnRGaWVsZCIsImV4dGVudExhYmVsIiwidXBkYXRlRXh0ZW50IiwiX2MxIiwiQ09SUkVTUE9OREVOQ0VfTEFCRUxTIiwiV29ybGRJbnNwZWN0b3IiLCJydW50aW1lTWV0cmljcyIsInNoYXBlIiwidHJhbnNpdGlvbkxpbWl0IiwidHJhbnNpdGlvbk1heCIsInRyYW5zaXRpb25FbmFibGVkIiwiY29ycmVzcG9uZGVuY2VFbmFibGVkIiwiaW5jbHVkZXMiLCJwcmV2aW91c1dvcmxkU2VjdGlvbiIsInNvdXJjZVNoYXBlIiwicHJlcGFyZWQiLCJwcmVwYXJlZFdvcmxkSWRzIiwiY29ycmVzcG9uZGVuY2VTdGF0dXMiLCJjb3JyZXNwb25kZW5jZVNlcXVlbmNlU3RhdGUiLCJjb3JyZXNwb25kZW5jZUZhbGxiYWNrIiwiY29ycmVzcG9uZGVuY2VUb1dvcmxkSWQiLCJ0cnlTaGFwZSIsInNoYXBlUGFyYW1ldGVycyIsImZyb21FbnRyaWVzIiwicGFyYW1ldGVycyIsInZhbHVlcyIsImNvc3QiLCJzZWVkIiwiZmxvb3IiLCJyYW5kb20iLCJlbnRyeURpc3RhbmNlV1UiLCJ0cmFuc2Zvcm0iLCJzY2FsZSIsImNvcnJlc3BvbmRlbmNlIiwiY29ycmVzcG9uZGVuY2VJbXByb3ZlbWVudCIsIm1vZGlmaWVycyIsIm1vZGlmaWVySW5kZXgiLCJkZWZpbml0aW9uIiwibW92ZU1vZGlmaWVyIiwibmV4dEluZGV4IiwiZW5hYmxlZCIsIm9wdGlvbnMiLCJvcHRpb24iLCJfYzEwIiwiRGlhZ25vc3RpY3MiLCJkaWFnbm9zdGljcyIsIkRpYWdub3N0aWNJY29uIiwibGV2ZWwiLCJwYXRoIiwiX2MxMSIsIkF1ZGl0aW9uQ29udHJvbHMiLCJfczMiLCJwcmVSb2xsV1UiLCJzZXRQcmVSb2xsV1UiLCJwb3N0Um9sbFdVIiwic2V0UG9zdFJvbGxXVSIsInJhbmdlIiwiYWN0aXZlIiwibG9vcCIsInNvdXJjZVR5cGUiLCJzb3VyY2VJZCIsInRvZ2dsZSIsImVuZFdVIiwiSW5zcGVjdG9yIiwiX3M0IiwiaW5zcGVjdG9yUmVmIiwiZHJhZ1JlZiIsImxhc3RIZWFkZXJDbGlja1JlZiIsInNldFBvc2l0aW9uIiwiZHJhZ2dpbmciLCJzZXREcmFnZ2luZyIsImNvbnRlbnQiLCJrZWVwSW5Cb3VuZHMiLCJhZGRFdmVudExpc3RlbmVyIiwicmVtb3ZlRXZlbnRMaXN0ZW5lciIsImJlZ2luRHJhZyIsImZsb2F0aW5nSGVpZ2h0Iiwib3JpZ2luWCIsIm9yaWdpblkiLCJtb3ZlRHJhZyIsImRlbHRhWCIsImh5cG90IiwiZW5kRHJhZyIsIm5vdyIsInBlcmZvcm1hbmNlIiwicHJldmlvdXMiLCJ0aW1lIiwieCIsInkiLCJyZXNldFBvc2l0aW9uIiwiQ2FtZXJhUGF0aE92ZXJsYXkiLCJ0b3RhbCIsIndvcmxkU3RhdGUiLCJjaGFuZ2VzV29ybGQiLCJhY3RpdmVXb3JsZCIsIl9jMTQiLCJBYm91dE5hcnJhdGl2ZUVkaXRvciIsInJ1bnRpbWVSZWYiLCJyb290UmVmIiwiX3M1Iiwic3Vic2NyaWJlIiwiY2hlY2twb2ludHMiLCJzZXRDaGVja3BvaW50cyIsInNldFJ1bnRpbWVNZXRyaWNzIiwicGF0aFZpc2libGUiLCJzZXRQYXRoVmlzaWJsZSIsImRpcmVjdG9yVmlldyIsInNldERpcmVjdG9yVmlldyIsIm1vYmlsZVBhbmUiLCJzZXRNb2JpbGVQYW5lIiwic2V0VGltZWxpbmVPcGVuIiwibG9jYWxTdG9yYWdlIiwiZ2V0SXRlbSIsImltcG9ydFJlZiIsInNuYXBzaG90UmVmIiwiYWN0aXZlU2VsZWN0aW9uIiwic2V0SXRlbSIsInJvb3QiLCJydW50aW1lIiwic2V0QXR0cmlidXRlIiwidGhlbiIsImhhc2giLCJkaXJ0eSIsInJlcGxhY2VEb2N1bWVudCIsInNldEJhc2VsaW5lIiwicmVjb3ZlcnkiLCJ0aW1lc3RhbXAiLCJEYXRlIiwic2V0UmVjb3ZlcnlTdGF0ZSIsImF2YWlsYWJsZSIsImVycm9yIiwiY2F0Y2giLCJzdGF0dXMiLCJyZW1vdmVBdHRyaWJ1dGUiLCJjbGFzc0xpc3QiLCJDU1MiLCJlc2NhcGUiLCJhZGQiLCJlZGl0b3JTZWxlY3Rpb25UeXBlIiwiaW50ZXJ2YWwiLCJzZXRJbnRlcnZhbCIsImdldE1ldHJpY3MiLCJjbGVhckludGVydmFsIiwidGltZXIiLCJiYXNlbGluZUhhc2giLCJjbGVhclRpbWVvdXQiLCJwYWdlaGlkZSIsImtleWRvd24iLCJjbGljayIsInJlZG8iLCJ1bmRvIiwicHJldmlld1N0YXRlIiwic2F2ZSIsImVkaXRvclVybCIsIlVSTCIsImxvY2F0aW9uIiwiaHJlZiIsInNlYXJjaFBhcmFtcyIsInNldCIsImhpc3RvcnkiLCJyZXBsYWNlU3RhdGUiLCJzdGF0ZSIsInBhdGhuYW1lIiwic2VhcmNoIiwic2VudCIsIm1hcmtTYXZlZCIsImFkZENoZWNrcG9pbnQiLCJjaGVja3BvaW50IiwiY3J5cHRvIiwicmFuZG9tVVVJRCIsInRvTG9jYWxlVGltZVN0cmluZyIsImhvdXIiLCJtaW51dGUiLCJiYXNlU291cmNlSGFzaCIsInN0YXR1c0xhYmVsIiwic2F2ZVN0YXRlIiwiY29tcGlsZWRTZWxlY3RlZCIsInNlbGVjdGVkRXh0ZW50Iiwic2VsZWN0ZWRDdWVDb3VudCIsImxvb3BBY3RpdmUiLCJ0aW1lbGluZURlbGV0aW9uIiwidG9nZ2xlTG9vcCIsInRvZ2dsZVNvbG8iLCJ0cmFjayIsImZpdFNlcXVlbmNlIiwiZml0U2VjdGlvbiIsInNlY3Rpb25TcGFuIiwic3RhcnRSYXRpbyIsImNsaWVudFdpZHRoIiwidG9nZ2xlRGlyZWN0b3IiLCJ0b2dnbGVCZWZvcmUiLCJjYW5VbmRvIiwidW5kb0xhYmVsIiwiY2FuUmVkbyIsInJlZG9MYWJlbCIsImZpbGUiLCJmaWxlcyIsImltcG9ydGVkIiwiSlNPTiIsInBhcnNlIiwicmVjb3ZlcnlTdGF0ZSIsInRvTG9jYWxlU3RyaW5nIiwibnVkZ2VEaXJlY3RvciIsInlhdyIsInBpdGNoIiwiZGlzdGFuY2UiLCJyZXNldERpcmVjdG9yIiwib3BlbiIsImF1dG9LZXkiLCJzZXRBdXRvS2V5IiwiZnJhbWVUaW1lTXMiLCJkcmF3Q2FsbHMiLCJwb2ludENvdW50IiwiYWN0aXZlTW9kaWZpZXJzIiwiYnVmZmVyUmVidWlsZHMiLCJmb3VuZCIsImJvZHkiLCJfYzQiLCJfYzgiLCJfYzEyIiwiX2MxMyIsIl9jMTUiXSwiaWdub3JlTGlzdCI6W10sInNvdXJjZXMiOlsiQWJvdXROYXJyYXRpdmVFZGl0b3IuanN4Il0sInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7IHVzZUVmZmVjdCwgdXNlUmVmLCB1c2VTdGF0ZSwgdXNlU3luY0V4dGVybmFsU3RvcmUgfSBmcm9tICdyZWFjdCc7XG5pbXBvcnQgeyBjcmVhdGVQb3J0YWwgfSBmcm9tICdyZWFjdC1kb20nO1xuaW1wb3J0IHtcbiAgQ2hlY2ssXG4gIENoZXZyb25Eb3duLFxuICBDaGV2cm9uTGVmdCxcbiAgQ2hldnJvblJpZ2h0LFxuICBDaGV2cm9uVXAsXG4gIENpcmNsZUFsZXJ0LFxuICBEaWFtb25kLFxuICBJbmZvLFxuICBMb2NrS2V5aG9sZSxcbiAgUGF1c2UsXG4gIFBsYXksXG4gIFNraXBCYWNrLFxuICBTa2lwRm9yd2FyZCxcbiAgVHJhc2gyLFxufSBmcm9tICdsdWNpZGUtcmVhY3QnO1xuaW1wb3J0IHtcbiAgQUJPVVRfTkFSUkFUSVZFX0dMT0JBTF9DT05UUk9MUyxcbiAgQUJPVVRfTkFSUkFUSVZFX0NPUlJFU1BPTkRFTkNFX01PREVTLFxuICBBQk9VVF9OQVJSQVRJVkVfRElTQ0lQTElORV9SRVZFQUxfQ09OVFJPTFMsXG4gIEFCT1VUX05BUlJBVElWRV9FTVBIQVNJU19UT05FUyxcbiAgQUJPVVRfTkFSUkFUSVZFX01PRElGSUVSX0RFRklOSVRJT05TLFxuICBBQk9VVF9OQVJSQVRJVkVfU0hBUEVfREVGSU5JVElPTlMsXG59IGZyb20gJy4vYWJvdXROYXJyYXRpdmVEZWZpbml0aW9ucy5qcyc7XG5pbXBvcnQge1xuICBjbGVhckFib3V0TmFycmF0aXZlUmVjb3ZlcnlEcmFmdCxcbiAgZXhwb3J0QWJvdXROYXJyYXRpdmVEb2N1bWVudCxcbiAgbG9hZEFib3V0TmFycmF0aXZlU291cmNlLFxuICByZWFkQWJvdXROYXJyYXRpdmVDaGVja3BvaW50cyxcbiAgcmVhZEFib3V0TmFycmF0aXZlUmVjb3ZlcnlEcmFmdCxcbiAgc2F2ZUFib3V0TmFycmF0aXZlU291cmNlLFxuICB3cml0ZUFib3V0TmFycmF0aXZlQ2hlY2twb2ludCxcbiAgd3JpdGVBYm91dE5hcnJhdGl2ZVJlY292ZXJ5RHJhZnQsXG59IGZyb20gJy4vYWJvdXROYXJyYXRpdmVQZXJzaXN0ZW5jZS5qcyc7XG5pbXBvcnQge1xuICBhc3NlcnRWYWxpZEFib3V0TmFycmF0aXZlRG9jdW1lbnQsXG4gIGNsb25lQWJvdXROYXJyYXRpdmVEb2N1bWVudCxcbn0gZnJvbSAnLi9hYm91dE5hcnJhdGl2ZVNjaGVtYS5qcyc7XG5pbXBvcnQge1xuICBnZXRBYm91dE5hcnJhdGl2ZUN1ZU1vdmVtZW50LFxuICBnZXRBYm91dE5hcnJhdGl2ZUN1ZU1vdGlvbkludGVydmFsLFxuICBnZXRBYm91dE5hcnJhdGl2ZVdvcmxkVHJhbnNpdGlvbkxpbWl0LFxuICBzYW1wbGVBYm91dE5hcnJhdGl2ZVBsYW4sXG59IGZyb20gJy4vYWJvdXROYXJyYXRpdmVDb21waWxlci5qcyc7XG5pbXBvcnQge1xuICBjYXB0dXJlQWJvdXROYXJyYXRpdmVQbGF5aGVhZENvbnRleHQsXG4gIGNyZWF0ZUFib3V0TmFycmF0aXZlQ3VlQ2xpcGJvYXJkUGF5bG9hZCxcbiAgZGVyaXZlQWJvdXROYXJyYXRpdmVMb29wUmFuZ2UsXG4gIGR1cGxpY2F0ZUFib3V0TmFycmF0aXZlQ3VlR3JvdXAsXG4gIGR1cGxpY2F0ZUFib3V0TmFycmF0aXZlU2VjdGlvbixcbiAgZ2V0QWJvdXROYXJyYXRpdmVDYW1lcmFLZXlUaW1pbmdCb3VuZHMsXG4gIGdldEFib3V0TmFycmF0aXZlQ3VlVGltaW5nQm91bmRzLFxuICBnZXRBYm91dE5hcnJhdGl2ZUV4dGVudEZpZWxkLFxuICBnZXRBYm91dE5hcnJhdGl2ZVNlbGVjdGlvbk1lbWJlcnMsXG4gIG1vdmVBYm91dE5hcnJhdGl2ZUN1ZVRpbWluZyxcbiAgcmVtYXBBYm91dE5hcnJhdGl2ZVBsYXloZWFkQ29udGV4dCxcbiAgcmVzb2x2ZUFib3V0TmFycmF0aXZlQ2FtZXJhS2V5RHJvcCxcbiAgcmVzb2x2ZUFib3V0TmFycmF0aXZlQ3VlRGlzdHJpYnV0aW9uLFxuICByZXNvbHZlQWJvdXROYXJyYXRpdmVDdWVFeGFjdEdhcCxcbiAgcmVzb2x2ZUFib3V0TmFycmF0aXZlQ3VlR3JvdXBNb3ZlLFxuICByZXNvbHZlQWJvdXROYXJyYXRpdmVDdWVHcm91cEFsaWduLFxuICByZXNvbHZlQWJvdXROYXJyYXRpdmVDdWVHcm91cFBhc3RlLFxuICBzbmFwQWJvdXROYXJyYXRpdmVUaW1lbGluZVZhbHVlLFxuICBzdGl0Y2hBYm91dE5hcnJhdGl2ZUNhbWVyYUJvdW5kYXJpZXMsXG4gIHRvZ2dsZUFib3V0TmFycmF0aXZlQ3VlU2VsZWN0aW9uLFxuICB2YWxpZGF0ZUFib3V0TmFycmF0aXZlQ3VlQ2xpcGJvYXJkUGF5bG9hZCxcbn0gZnJvbSAnLi9hYm91dE5hcnJhdGl2ZVRpbWVsaW5lLmpzJztcbmltcG9ydCAnLi9hYm91dC1uYXJyYXRpdmUtZWRpdG9yLmNzcyc7XG5cbmNvbnN0IGNsYW1wMDEgPSAodmFsdWUpID0+IE1hdGgubWluKDEsIE1hdGgubWF4KDAsIHZhbHVlKSk7XG5jb25zdCBBQk9VVF9FRElUT1JfVElNRUxJTkVfU1RPUkFHRV9LRVkgPSAnYWJzOmFib3V0LW5hcnJhdGl2ZTp0aW1lbGluZS1vcGVuOnYxJztcbmNvbnN0IFRJTUVMSU5FX0tFWV9FUFNJTE9OID0gMC4wMDQ7XG5jb25zdCBJTlNQRUNUT1JfRURHRV9HQVAgPSA4O1xuY29uc3QgQ0FNRVJBX1BPU0VfRklFTERTID0gbmV3IFNldChbJ29mZnNldCcsICdsb29rQXRPZmZzZXQnLCAnZm92JywgJ3JvbGwnXSk7XG5jb25zdCBESVNDSVBMSU5FX1JFVkVBTF9NQVggPSBBQk9VVF9OQVJSQVRJVkVfRElTQ0lQTElORV9SRVZFQUxfQ09OVFJPTFNcbiAgLmZpbmQoKGNvbnRyb2wpID0+IGNvbnRyb2wuaWQgPT09ICdlbmQnKT8ubWF4IHx8IDQ7XG5jb25zdCBESVNDSVBMSU5FX0JBTExfVE9LRU5fQllfR1JPVVAgPSBPYmplY3QuZnJlZXplKHtcbiAgMTogJy0tYmFsbC0xJyxcbiAgMjogJy0tYmFsbC00JyxcbiAgMzogJy0tYmFsbC0zJyxcbiAgNDogJy0tYmFsbC03JyxcbiAgNTogJy0tYmFsbC04JyxcbiAgNjogJy0tYmFsbC02Jyxcbn0pO1xuXG5mdW5jdGlvbiBjYW1lcmFQb3NlQ2hhbmdlcyhmcm9tLCB0bykge1xuICBpZiAoIWZyb20gfHwgIXRvKSByZXR1cm4gZmFsc2U7XG4gIHJldHVybiBbJ29mZnNldCcsICdsb29rQXRPZmZzZXQnXS5zb21lKChmaWVsZCkgPT4gKFxuICAgIGZyb21bZmllbGRdLnNvbWUoKHZhbHVlLCBpbmRleCkgPT4gTWF0aC5hYnModmFsdWUgLSB0b1tmaWVsZF1baW5kZXhdKSA+IDAuMDAwMSlcbiAgKSkgfHwgTWF0aC5hYnMoZnJvbS5mb3YgLSB0by5mb3YpID4gMC4wMDAxIHx8IE1hdGguYWJzKGZyb20ucm9sbCAtIHRvLnJvbGwpID4gMC4wMDAxO1xufVxuXG5mdW5jdGlvbiBjb3B5Q2FtZXJhUG9zZSh0YXJnZXQsIHNvdXJjZSkge1xuICB0YXJnZXQub2Zmc2V0ID0gWy4uLnNvdXJjZS5vZmZzZXRdO1xuICB0YXJnZXQubG9va0F0T2Zmc2V0ID0gWy4uLnNvdXJjZS5sb29rQXRPZmZzZXRdO1xuICB0YXJnZXQuZm92ID0gc291cmNlLmZvdjtcbiAgdGFyZ2V0LnJvbGwgPSBzb3VyY2Uucm9sbDtcbn1cblxuZnVuY3Rpb24gbGlua0NhbWVyYUJvdW5kYXJ5KGRvY3VtZW50LCBzZWN0aW9uSW5kZXgsIGtleUluZGV4KSB7XG4gIGNvbnN0IHNlY3Rpb24gPSBkb2N1bWVudC5zZWN0aW9uc1tzZWN0aW9uSW5kZXhdO1xuICBjb25zdCBrZXkgPSBzZWN0aW9uPy5jYW1lcmEua2V5c1trZXlJbmRleF07XG4gIGlmICgha2V5KSByZXR1cm47XG4gIGlmIChrZXlJbmRleCA9PT0gMCAmJiBzZWN0aW9uSW5kZXggPiAwKSB7XG4gICAgY29weUNhbWVyYVBvc2UoZG9jdW1lbnQuc2VjdGlvbnNbc2VjdGlvbkluZGV4IC0gMV0uY2FtZXJhLmtleXMuYXQoLTEpLCBrZXkpO1xuICB9XG4gIGlmIChrZXlJbmRleCA9PT0gc2VjdGlvbi5jYW1lcmEua2V5cy5sZW5ndGggLSAxICYmIHNlY3Rpb25JbmRleCA8IGRvY3VtZW50LnNlY3Rpb25zLmxlbmd0aCAtIDEpIHtcbiAgICBjb3B5Q2FtZXJhUG9zZShkb2N1bWVudC5zZWN0aW9uc1tzZWN0aW9uSW5kZXggKyAxXS5jYW1lcmEua2V5c1swXSwga2V5KTtcbiAgfVxufVxuXG5mdW5jdGlvbiBicmlkZ2VDYW1lcmFTZWN0aW9uKGRvY3VtZW50LCBzZWN0aW9uSW5kZXgpIHtcbiAgY29uc3Qgc2VjdGlvbiA9IGRvY3VtZW50LnNlY3Rpb25zW3NlY3Rpb25JbmRleF07XG4gIGlmICghc2VjdGlvbj8uY2FtZXJhLmtleXMubGVuZ3RoKSByZXR1cm47XG4gIGlmIChzZWN0aW9uSW5kZXggPiAwKSBjb3B5Q2FtZXJhUG9zZShzZWN0aW9uLmNhbWVyYS5rZXlzWzBdLCBkb2N1bWVudC5zZWN0aW9uc1tzZWN0aW9uSW5kZXggLSAxXS5jYW1lcmEua2V5cy5hdCgtMSkpO1xuICBpZiAoc2VjdGlvbkluZGV4IDwgZG9jdW1lbnQuc2VjdGlvbnMubGVuZ3RoIC0gMSkgY29weUNhbWVyYVBvc2Uoc2VjdGlvbi5jYW1lcmEua2V5cy5hdCgtMSksIGRvY3VtZW50LnNlY3Rpb25zW3NlY3Rpb25JbmRleCArIDFdLmNhbWVyYS5rZXlzWzBdKTtcbn1cblxuZnVuY3Rpb24gZ2V0SW5zcGVjdG9yVmVydGljYWxCb3VuZHMoaW5zcGVjdG9yLCB0aW1lbGluZU9wZW4pIHtcbiAgY29uc3QgZWRpdG9yID0gaW5zcGVjdG9yLmNsb3Nlc3QoJy5hYm91dC1lZGl0b3InKTtcbiAgY29uc3Qgc3R5bGVzID0gZWRpdG9yID8gZ2V0Q29tcHV0ZWRTdHlsZShlZGl0b3IpIDogbnVsbDtcbiAgY29uc3QgdG9wYmFySGVpZ2h0ID0gTnVtYmVyLnBhcnNlRmxvYXQoc3R5bGVzPy5nZXRQcm9wZXJ0eVZhbHVlKCctLWFib3V0LWVkaXRvci10b3BiYXInKSkgfHwgNDQ7XG4gIGNvbnN0IHRpbWVsaW5lSGVpZ2h0ID0gdGltZWxpbmVPcGVuXG4gICAgPyBOdW1iZXIucGFyc2VGbG9hdChzdHlsZXM/LmdldFByb3BlcnR5VmFsdWUoJy0tYWJvdXQtZWRpdG9yLXRpbWVsaW5lJykpIHx8IDE4OFxuICAgIDogMDtcbiAgY29uc3QgYnV0dG9uQmFyVG9wID0gZG9jdW1lbnQucXVlcnlTZWxlY3RvcignW2RhdGEtYnV0dG9uLWJhcl0nKT8uZ2V0Qm91bmRpbmdDbGllbnRSZWN0KCkudG9wXG4gICAgPz8gd2luZG93LmlubmVySGVpZ2h0O1xuICByZXR1cm4ge1xuICAgIG1pblRvcDogdG9wYmFySGVpZ2h0ICsgSU5TUEVDVE9SX0VER0VfR0FQLFxuICAgIG1heEJvdHRvbTogKHRpbWVsaW5lT3BlbiA/IHdpbmRvdy5pbm5lckhlaWdodCAtIHRpbWVsaW5lSGVpZ2h0IDogYnV0dG9uQmFyVG9wKSAtIElOU1BFQ1RPUl9FREdFX0dBUCxcbiAgfTtcbn1cblxuZnVuY3Rpb24gY2xhbXBJbnNwZWN0b3JQb3NpdGlvbihpbnNwZWN0b3IsIHBvc2l0aW9uLCB0aW1lbGluZU9wZW4pIHtcbiAgY29uc3QgeyBtaW5Ub3AsIG1heEJvdHRvbSB9ID0gZ2V0SW5zcGVjdG9yVmVydGljYWxCb3VuZHMoaW5zcGVjdG9yLCB0aW1lbGluZU9wZW4pO1xuICBjb25zdCBtYXhXaWR0aCA9IE1hdGgubWF4KDI0MCwgd2luZG93LmlubmVyV2lkdGggLSAoSU5TUEVDVE9SX0VER0VfR0FQICogMikpO1xuICBjb25zdCB3aWR0aCA9IE1hdGgubWluKHBvc2l0aW9uLndpZHRoLCBtYXhXaWR0aCk7XG4gIGNvbnN0IGF2YWlsYWJsZUhlaWdodCA9IE1hdGgubWF4KDI0MCwgbWF4Qm90dG9tIC0gbWluVG9wKTtcbiAgY29uc3QgaGVpZ2h0ID0gTWF0aC5taW4ocG9zaXRpb24uaGVpZ2h0LCBhdmFpbGFibGVIZWlnaHQpO1xuICBjb25zdCBtYXhMZWZ0ID0gTWF0aC5tYXgoSU5TUEVDVE9SX0VER0VfR0FQLCB3aW5kb3cuaW5uZXJXaWR0aCAtIHdpZHRoIC0gSU5TUEVDVE9SX0VER0VfR0FQKTtcbiAgY29uc3QgbWF4VG9wID0gTWF0aC5tYXgobWluVG9wLCBtYXhCb3R0b20gLSBoZWlnaHQpO1xuICByZXR1cm4ge1xuICAgIGxlZnQ6IE1hdGgubWluKG1heExlZnQsIE1hdGgubWF4KElOU1BFQ1RPUl9FREdFX0dBUCwgcG9zaXRpb24ubGVmdCkpLFxuICAgIHRvcDogTWF0aC5taW4obWF4VG9wLCBNYXRoLm1heChtaW5Ub3AsIHBvc2l0aW9uLnRvcCkpLFxuICAgIHdpZHRoLFxuICAgIGhlaWdodCxcbiAgfTtcbn1cblxuZnVuY3Rpb24gZ2V0U2VjdGlvbkluZGV4KGRvY3VtZW50LCBzZWN0aW9uSWQpIHtcbiAgcmV0dXJuIGRvY3VtZW50LnNlY3Rpb25zLmZpbmRJbmRleCgoc2VjdGlvbikgPT4gc2VjdGlvbi5pZCA9PT0gc2VjdGlvbklkKTtcbn1cblxuZnVuY3Rpb24gZ2V0U2VjdGlvbihkb2N1bWVudCwgc2VsZWN0aW9uKSB7XG4gIGNvbnN0IHNlY3Rpb25JZCA9IHNlbGVjdGlvbi5zZWN0aW9uSWQgfHwgZG9jdW1lbnQuc2VjdGlvbnNbMF0/LmlkO1xuICByZXR1cm4gZG9jdW1lbnQuc2VjdGlvbnMuZmluZCgoc2VjdGlvbikgPT4gc2VjdGlvbi5pZCA9PT0gc2VjdGlvbklkKSB8fCBkb2N1bWVudC5zZWN0aW9uc1swXTtcbn1cblxuZnVuY3Rpb24gZ2V0TG9jYWxQcm9ncmVzcyhwbGFuLCBzZWN0aW9uLCBzdG9yeVdVKSB7XG4gIGNvbnN0IGNvbXBpbGVkID0gcGxhbj8uc2VjdGlvbnM/LmZpbmQoKGl0ZW0pID0+IGl0ZW0uaWQgPT09IHNlY3Rpb24uaWQpO1xuICByZXR1cm4gY29tcGlsZWQgPyBjbGFtcDAxKChzdG9yeVdVIC0gY29tcGlsZWQuc3RhcnRXVSkgLyBjb21waWxlZC50cmF2ZWxXVSkgOiAwO1xufVxuXG5mdW5jdGlvbiBmb3JtYXRXVSh2YWx1ZSkge1xuICByZXR1cm4gYCR7TnVtYmVyKHZhbHVlIHx8IDApLnRvRml4ZWQoMil9IFdVYDtcbn1cblxuZnVuY3Rpb24gZm9ybWF0Q2FtZXJhUGVyY2VudCh2YWx1ZSkge1xuICByZXR1cm4gYCR7TnVtYmVyKChOdW1iZXIodmFsdWUpICogMTAwKS50b0ZpeGVkKDEpKX0lYDtcbn1cblxuZnVuY3Rpb24gaXNUZXh0RWRpdGluZ1RhcmdldCh0YXJnZXQpIHtcbiAgcmV0dXJuIHRhcmdldCBpbnN0YW5jZW9mIEhUTUxFbGVtZW50XG4gICAgJiYgKHRhcmdldC5tYXRjaGVzKCdpbnB1dCwgdGV4dGFyZWEsIHNlbGVjdCcpIHx8IHRhcmdldC5pc0NvbnRlbnRFZGl0YWJsZSk7XG59XG5cbmZ1bmN0aW9uIGdldFRpbWVsaW5lS2V5ZnJhbWVzKHNuYXBzaG90KSB7XG4gIGNvbnN0IHBsYW4gPSBzbmFwc2hvdC5jb21waWxlZFBsYW47XG4gIGlmICghcGxhbj8uc2VjdGlvbnM/Lmxlbmd0aCkgcmV0dXJuIFtdO1xuICBjb25zdCBldmVudHMgPSBbXTtcbiAgcGxhbi5zZWN0aW9ucy5mb3JFYWNoKChjb21waWxlZCwgc2VjdGlvbkluZGV4KSA9PiB7XG4gICAgY29uc3Qgc2VjdGlvbiA9IHNuYXBzaG90LmRvY3VtZW50LnNlY3Rpb25zW3NlY3Rpb25JbmRleF07XG4gICAgY29uc3QgdG9TdG9yeVdVID0gKGF0KSA9PiBjb21waWxlZC5zdGFydFdVICsgKE51bWJlcihhdCB8fCAwKSAqIGNvbXBpbGVkLnRyYXZlbFdVKTtcbiAgICBzZWN0aW9uLmNhbWVyYS5rZXlzLmZvckVhY2goKGtleSwga2V5SW5kZXgpID0+IHtcbiAgICAgIGlmIChrZXkuYXQgPT09IDAgfHwga2V5LmF0ID09PSAxKSByZXR1cm47XG4gICAgICBldmVudHMucHVzaCh7XG4gICAgICAgIHN0b3J5V1U6IHRvU3RvcnlXVShrZXkuYXQpLFxuICAgICAgICBwcmlvcml0eTogMCxcbiAgICAgICAgc2VsZWN0aW9uOiB7IHR5cGU6ICdjYW1lcmEta2V5Jywgc2VjdGlvbklkOiBzZWN0aW9uLmlkLCBrZXlJbmRleCB9LFxuICAgICAgfSk7XG4gICAgfSk7XG4gICAgaWYgKHNlY3Rpb24ud29ybGQubW9kZSA9PT0gJ3NldCcgJiYgc2VjdGlvbi53b3JsZC50cmFuc2l0aW9uSW4udHlwZSAhPT0gJ2N1dCcpIHtcbiAgICAgIFsnc3RhcnQnLCAnZW5kJ10uZm9yRWFjaCgocGFydCwgcGFydEluZGV4KSA9PiBldmVudHMucHVzaCh7XG4gICAgICAgIHN0b3J5V1U6IHRvU3RvcnlXVShzZWN0aW9uLndvcmxkLnRyYW5zaXRpb25JbltwYXJ0XSksXG4gICAgICAgIHByaW9yaXR5OiAxMCArIHBhcnRJbmRleCxcbiAgICAgICAgc2VsZWN0aW9uOiB7IHR5cGU6ICd3b3JsZCcsIHNlY3Rpb25JZDogc2VjdGlvbi5pZCwga2V5UGFydDogYHRyYW5zaXRpb24tJHtwYXJ0fWAgfSxcbiAgICAgIH0pKTtcbiAgICB9XG4gICAgKHNlY3Rpb24udGV4dC5jdWVzIHx8IFtdKS5mb3JFYWNoKChjdWUsIGN1ZUluZGV4KSA9PiB7XG4gICAgICBldmVudHMucHVzaCh7XG4gICAgICAgIHN0b3J5V1U6IHRvU3RvcnlXVShjdWUuaG9sZCksXG4gICAgICAgIHByaW9yaXR5OiAyMCArIGN1ZUluZGV4LFxuICAgICAgICBzZWxlY3Rpb246IHsgdHlwZTogJ2N1ZScsIHNlY3Rpb25JZDogc2VjdGlvbi5pZCwgY3VlSWQ6IGN1ZS5pZCwga2V5UGFydDogJ2ZvY3VzJyB9LFxuICAgICAgfSk7XG4gICAgfSk7XG4gICAgaWYgKHNlY3Rpb24udGV4dC5kaXNjaXBsaW5lUmV2ZWFsKSB7XG4gICAgICBldmVudHMucHVzaCh7XG4gICAgICAgIHN0b3J5V1U6IHRvU3RvcnlXVShzZWN0aW9uLnRleHQuZGlzY2lwbGluZVJldmVhbC5zdGFydCksXG4gICAgICAgIHByaW9yaXR5OiAyOCxcbiAgICAgICAgc2VsZWN0aW9uOiB7IHR5cGU6ICdkaXNjaXBsaW5lLXJldmVhbCcsIHNlY3Rpb25JZDogc2VjdGlvbi5pZCB9LFxuICAgICAgfSk7XG4gICAgfVxuICAgIGlmIChzZWN0aW9uLmludGVyYWN0aW9uPy50eXBlICE9PSAnbm9uZScgJiYgTnVtYmVyLmlzRmluaXRlKHNlY3Rpb24uaW50ZXJhY3Rpb24uYWN0aXZhdGlvblN0YXJ0KSkge1xuICAgICAgZXZlbnRzLnB1c2goe1xuICAgICAgICBzdG9yeVdVOiB0b1N0b3J5V1Uoc2VjdGlvbi5pbnRlcmFjdGlvbi5hY3RpdmF0aW9uU3RhcnQpLFxuICAgICAgICBwcmlvcml0eTogMzAsXG4gICAgICAgIHNlbGVjdGlvbjogeyB0eXBlOiAnaW50ZXJhY3Rpb24nLCBzZWN0aW9uSWQ6IHNlY3Rpb24uaWQsIGtleVBhcnQ6ICdhY3RpdmF0aW9uJyB9LFxuICAgICAgfSk7XG4gICAgfVxuICB9KTtcbiAgcmV0dXJuIGV2ZW50cy5zb3J0KChhLCBiKSA9PiAoYS5zdG9yeVdVIC0gYi5zdG9yeVdVKSB8fCAoYS5wcmlvcml0eSAtIGIucHJpb3JpdHkpKTtcbn1cblxuZnVuY3Rpb24gZ2V0VGltZWxpbmVEZWxldGlvbihzbmFwc2hvdCkge1xuICBjb25zdCB7IHNlbGVjdGlvbiwgZG9jdW1lbnQgfSA9IHNuYXBzaG90O1xuICBjb25zdCBzZWN0aW9uSW5kZXggPSBnZXRTZWN0aW9uSW5kZXgoZG9jdW1lbnQsIHNlbGVjdGlvbi5zZWN0aW9uSWQpO1xuICBjb25zdCBzZWN0aW9uID0gZG9jdW1lbnQuc2VjdGlvbnNbc2VjdGlvbkluZGV4XTtcbiAgaWYgKCFzZWN0aW9uKSByZXR1cm4gbnVsbDtcbiAgaWYgKHNlbGVjdGlvbi50eXBlID09PSAnY2FtZXJhLWtleScpIHtcbiAgICBjb25zdCBrZXkgPSBzZWN0aW9uLmNhbWVyYS5rZXlzW3NlbGVjdGlvbi5rZXlJbmRleF07XG4gICAgaWYgKCFrZXkpIHJldHVybiBudWxsO1xuICAgIGNvbnN0IHJlcXVpcmVkID0ga2V5LmF0ID09PSAwIHx8IGtleS5hdCA9PT0gMTtcbiAgICByZXR1cm4ge1xuICAgICAgbGFiZWw6IHJlcXVpcmVkID8gJ1JlcXVpcmVkIGNhbWVyYSBrZXknIDogJ0RlbGV0ZSBjYW1lcmEga2V5JyxcbiAgICAgIGRpc2FibGVkOiByZXF1aXJlZCxcbiAgICAgIG1lc3NhZ2U6IHJlcXVpcmVkID8gJ1RoZSBzdGFydCBhbmQgZW5kIENhbWVyYSBrZXlzIHByZXNlcnZlIFNlY3Rpb24gY29udGludWl0eSBhbmQgY2Fubm90IGJlIHJlbW92ZWQuJyA6ICcnLFxuICAgICAgZXhlY3V0ZTogKHN0b3JlKSA9PiBzdG9yZS5jb21taXQoJ0RlbGV0ZSBjYW1lcmEga2V5JywgKGRyYWZ0KSA9PiB7XG4gICAgICAgIGRyYWZ0LnNlY3Rpb25zW3NlY3Rpb25JbmRleF0uY2FtZXJhLmtleXMuc3BsaWNlKHNlbGVjdGlvbi5rZXlJbmRleCwgMSk7XG4gICAgICB9LCB7IHNlbGVjdGlvbjogeyB0eXBlOiAnc2VjdGlvbicsIHNlY3Rpb25JZDogc2VjdGlvbi5pZCB9IH0pLFxuICAgIH07XG4gIH1cbiAgaWYgKHNlbGVjdGlvbi50eXBlID09PSAnd29ybGQnICYmIHNlbGVjdGlvbi5rZXlQYXJ0Py5zdGFydHNXaXRoKCd0cmFuc2l0aW9uLScpKSB7XG4gICAgcmV0dXJuIHtcbiAgICAgIGxhYmVsOiAnUmVtb3ZlIHRyYW5zaXRpb24nLFxuICAgICAgZGlzYWJsZWQ6IGZhbHNlLFxuICAgICAgbWVzc2FnZTogJycsXG4gICAgICBleGVjdXRlOiAoc3RvcmUpID0+IHN0b3JlLmNvbW1pdCgnUmVtb3ZlIFdvcmxkIHRyYW5zaXRpb24nLCAoZHJhZnQpID0+IHtcbiAgICAgICAgY29uc3QgdHJhbnNpdGlvbiA9IGRyYWZ0LnNlY3Rpb25zW3NlY3Rpb25JbmRleF0ud29ybGQudHJhbnNpdGlvbkluO1xuICAgICAgICB0cmFuc2l0aW9uLnN0YXJ0ID0gMDtcbiAgICAgICAgdHJhbnNpdGlvbi5lbmQgPSAwO1xuICAgICAgICB0cmFuc2l0aW9uLnR5cGUgPSAnY3V0JztcbiAgICAgIH0sIHsgc2VsZWN0aW9uOiB7IHR5cGU6ICd3b3JsZCcsIHNlY3Rpb25JZDogc2VjdGlvbi5pZCB9IH0pLFxuICAgIH07XG4gIH1cbiAgaWYgKHNlbGVjdGlvbi50eXBlID09PSAnaW50ZXJhY3Rpb24nICYmIHNlbGVjdGlvbi5rZXlQYXJ0ID09PSAnYWN0aXZhdGlvbicpIHtcbiAgICByZXR1cm4ge1xuICAgICAgbGFiZWw6ICdSZW1vdmUgaW50ZXJhY3Rpb24ga2V5JyxcbiAgICAgIGRpc2FibGVkOiBmYWxzZSxcbiAgICAgIG1lc3NhZ2U6ICcnLFxuICAgICAgZXhlY3V0ZTogKHN0b3JlKSA9PiBzdG9yZS5jb21taXQoJ1JlbW92ZSBpbnRlcmFjdGlvbiBrZXknLCAoZHJhZnQpID0+IHtcbiAgICAgICAgZHJhZnQuc2VjdGlvbnNbc2VjdGlvbkluZGV4XS5pbnRlcmFjdGlvbiA9IHsgdHlwZTogJ25vbmUnIH07XG4gICAgICB9LCB7IHNlbGVjdGlvbjogeyB0eXBlOiAnc2VjdGlvbicsIHNlY3Rpb25JZDogc2VjdGlvbi5pZCB9IH0pLFxuICAgIH07XG4gIH1cbiAgcmV0dXJuIG51bGw7XG59XG5cbmZ1bmN0aW9uIGRlbGV0ZVRpbWVsaW5lU2VsZWN0aW9uKHN0b3JlLCBzbmFwc2hvdCkge1xuICBjb25zdCBkZWxldGlvbiA9IGdldFRpbWVsaW5lRGVsZXRpb24oc25hcHNob3QpO1xuICBpZiAoIWRlbGV0aW9uKSByZXR1cm4gZmFsc2U7XG4gIGlmIChkZWxldGlvbi5kaXNhYmxlZCkge1xuICAgIHN0b3JlLnNldFNhdmVTdGF0ZSh7IG1lc3NhZ2U6IGRlbGV0aW9uLm1lc3NhZ2UgfSk7XG4gICAgcmV0dXJuIHRydWU7XG4gIH1cbiAgZGVsZXRpb24uZXhlY3V0ZShzdG9yZSk7XG4gIHJldHVybiB0cnVlO1xufVxuXG5mdW5jdGlvbiBzZWVrVGltZWxpbmVLZXlmcmFtZShzdG9yZSwgZXZlbnQpIHtcbiAgaWYgKCFldmVudCkgcmV0dXJuO1xuICBzdG9yZS5zZXRTZWxlY3Rpb24oZXZlbnQuc2VsZWN0aW9uKTtcbiAgc3RvcmUuc2V0VHJhbnNwb3J0KHsgb3duZXI6ICd0aW1lbGluZScsIHBsYXlpbmc6IGZhbHNlLCBzdG9yeVdVOiBldmVudC5zdG9yeVdVIH0pO1xufVxuXG5mdW5jdGlvbiBqdW1wVGltZWxpbmVLZXlmcmFtZShzdG9yZSwgc25hcHNob3QsIGRpcmVjdGlvbikge1xuICBjb25zdCBldmVudHMgPSBnZXRUaW1lbGluZUtleWZyYW1lcyhzbmFwc2hvdCk7XG4gIGNvbnN0IGN1cnJlbnRXVSA9IHNuYXBzaG90LnRyYW5zcG9ydC5zdG9yeVdVO1xuICBjb25zdCB0YXJnZXRQb3NpdGlvbiA9IGRpcmVjdGlvbiA+IDBcbiAgICA/IGV2ZW50cy5maW5kKChldmVudCkgPT4gZXZlbnQuc3RvcnlXVSA+IGN1cnJlbnRXVSArIFRJTUVMSU5FX0tFWV9FUFNJTE9OKT8uc3RvcnlXVVxuICAgIDogWy4uLmV2ZW50c10ucmV2ZXJzZSgpLmZpbmQoKGV2ZW50KSA9PiBldmVudC5zdG9yeVdVIDwgY3VycmVudFdVIC0gVElNRUxJTkVfS0VZX0VQU0lMT04pPy5zdG9yeVdVO1xuICBjb25zdCBldmVudCA9IE51bWJlci5pc0Zpbml0ZSh0YXJnZXRQb3NpdGlvbilcbiAgICA/IGV2ZW50cy5maW5kKChpdGVtKSA9PiBNYXRoLmFicyhpdGVtLnN0b3J5V1UgLSB0YXJnZXRQb3NpdGlvbikgPCBUSU1FTElORV9LRVlfRVBTSUxPTilcbiAgICA6IG51bGw7XG4gIHNlZWtUaW1lbGluZUtleWZyYW1lKHN0b3JlLCBldmVudCk7XG59XG5cbmZ1bmN0aW9uIG1ha2VTbHVnKHZhbHVlKSB7XG4gIHJldHVybiB2YWx1ZS50b0xvd2VyQ2FzZSgpLnJlcGxhY2UoL1teYS16MC05XSsvZywgJy0nKS5yZXBsYWNlKC9eLXwtJC9nLCAnJykgfHwgJ2l0ZW0nO1xufVxuXG5mdW5jdGlvbiBuZXh0SWQoZG9jdW1lbnQsIGJhc2UpIHtcbiAgY29uc3QgdXNlZCA9IG5ldyBTZXQoZG9jdW1lbnQuc2VjdGlvbnMuZmxhdE1hcCgoc2VjdGlvbikgPT4gW1xuICAgIHNlY3Rpb24uaWQsXG4gICAgLi4uKHNlY3Rpb24udGV4dC5jdWVzIHx8IFtdKS5tYXAoKGN1ZSkgPT4gY3VlLmlkKSxcbiAgICAuLi4oc2VjdGlvbi50ZXh0LmJsb2NrcyB8fCBbXSkubWFwKChibG9jaykgPT4gYmxvY2suaWQpLFxuICAgIC4uLihzZWN0aW9uLnRleHQuZGlzY2lwbGluZVJldmVhbCA/IFtzZWN0aW9uLnRleHQuZGlzY2lwbGluZVJldmVhbC5pZF0gOiBbXSksXG4gIF0pKTtcbiAgbGV0IGlkID0gbWFrZVNsdWcoYmFzZSk7XG4gIGxldCBzdWZmaXggPSAyO1xuICB3aGlsZSAodXNlZC5oYXMoaWQpKSB7XG4gICAgaWQgPSBgJHttYWtlU2x1ZyhiYXNlKX0tJHtzdWZmaXh9YDtcbiAgICBzdWZmaXggKz0gMTtcbiAgfVxuICByZXR1cm4gaWQ7XG59XG5cbmZ1bmN0aW9uIHJlcGxhY2VEcmFmdERvY3VtZW50KGRyYWZ0LCBuZXh0RG9jdW1lbnQpIHtcbiAgT2JqZWN0LmtleXMoZHJhZnQpLmZvckVhY2goKGtleSkgPT4gZGVsZXRlIGRyYWZ0W2tleV0pO1xuICBPYmplY3QuYXNzaWduKGRyYWZ0LCBjbG9uZUFib3V0TmFycmF0aXZlRG9jdW1lbnQobmV4dERvY3VtZW50KSk7XG59XG5cbmZ1bmN0aW9uIGFwcGx5Q3VlTW92ZXMoZHJhZnQsIG1vdmVzKSB7XG4gIG1vdmVzLmZvckVhY2goKG1vdmUpID0+IHtcbiAgICBjb25zdCBzZWN0aW9uID0gZHJhZnQuc2VjdGlvbnMuZmluZCgoaXRlbSkgPT4gaXRlbS5pZCA9PT0gbW92ZS5zZWN0aW9uSWQpO1xuICAgIGNvbnN0IGN1ZSA9IHNlY3Rpb24/LnRleHQ/LmN1ZXM/LmZpbmQoKGl0ZW0pID0+IGl0ZW0uaWQgPT09IG1vdmUuY3VlSWQpO1xuICAgIGlmIChjdWUpIE9iamVjdC5hc3NpZ24oY3VlLCB7IGVudGVyOiBtb3ZlLmVudGVyLCBob2xkOiBtb3ZlLmhvbGQsIGV4aXQ6IG1vdmUuZXhpdCB9KTtcbiAgfSk7XG59XG5cbmZ1bmN0aW9uIFByb3BlcnR5KHsgbGFiZWwsIGNoaWxkcmVuLCBoaW50ID0gJycgfSkge1xuICByZXR1cm4gKFxuICAgIDxsYWJlbCBjbGFzc05hbWU9XCJhYm91dC1lZGl0b3ItcHJvcGVydHlcIj5cbiAgICAgIDxzcGFuPntsYWJlbH08L3NwYW4+XG4gICAgICB7Y2hpbGRyZW59XG4gICAgICB7aGludCA/IDxzbWFsbD57aGludH08L3NtYWxsPiA6IG51bGx9XG4gICAgPC9sYWJlbD5cbiAgKTtcbn1cblxuZnVuY3Rpb24gTnVtYmVyUHJvcGVydHkoeyBsYWJlbCwgdmFsdWUsIG1pbiwgbWF4LCBzdGVwLCBvbkNoYW5nZSwgdW5pdCA9ICcnLCBkaXNhYmxlZCA9IGZhbHNlIH0pIHtcbiAgcmV0dXJuIChcbiAgICA8UHJvcGVydHkgbGFiZWw9e2xhYmVsfT5cbiAgICAgIDxkaXYgY2xhc3NOYW1lPVwiYWJvdXQtZWRpdG9yLW51bWJlclwiPlxuICAgICAgICA8aW5wdXRcbiAgICAgICAgICB0eXBlPVwicmFuZ2VcIlxuICAgICAgICAgIHZhbHVlPXt2YWx1ZX1cbiAgICAgICAgICBtaW49e21pbn1cbiAgICAgICAgICBtYXg9e21heH1cbiAgICAgICAgICBzdGVwPXtzdGVwfVxuICAgICAgICAgIGRpc2FibGVkPXtkaXNhYmxlZH1cbiAgICAgICAgICBvbkNoYW5nZT17KGV2ZW50KSA9PiBvbkNoYW5nZShOdW1iZXIoZXZlbnQudGFyZ2V0LnZhbHVlKSl9XG4gICAgICAgIC8+XG4gICAgICAgIDxpbnB1dFxuICAgICAgICAgIHR5cGU9XCJudW1iZXJcIlxuICAgICAgICAgIHZhbHVlPXt2YWx1ZX1cbiAgICAgICAgICBtaW49e21pbn1cbiAgICAgICAgICBtYXg9e21heH1cbiAgICAgICAgICBzdGVwPXtzdGVwfVxuICAgICAgICAgIGRpc2FibGVkPXtkaXNhYmxlZH1cbiAgICAgICAgICBvbkNoYW5nZT17KGV2ZW50KSA9PiBvbkNoYW5nZShOdW1iZXIoZXZlbnQudGFyZ2V0LnZhbHVlKSl9XG4gICAgICAgIC8+XG4gICAgICAgIHt1bml0ID8gPGVtPnt1bml0fTwvZW0+IDogbnVsbH1cbiAgICAgIDwvZGl2PlxuICAgIDwvUHJvcGVydHk+XG4gICk7XG59XG5cbmZ1bmN0aW9uIFRyYW5zcG9ydCh7IHN0b3JlLCBzbmFwc2hvdCB9KSB7XG4gIGNvbnN0IHsgdHJhbnNwb3J0LCBjb21waWxlZFBsYW4gfSA9IHNuYXBzaG90O1xuICBjb25zdCBtYXhXVSA9IGNvbXBpbGVkUGxhbj8ubWF4U3RvcnlXVSB8fCAxO1xuICBjb25zdCBwbGF5ID0gKCkgPT4gc3RvcmUuc2V0VHJhbnNwb3J0KHtcbiAgICBvd25lcjogdHJhbnNwb3J0LnBsYXlpbmcgPyAndGltZWxpbmUnIDogJ3BsYXliYWNrJyxcbiAgICBwbGF5aW5nOiAhdHJhbnNwb3J0LnBsYXlpbmcsXG4gICAgc3RvcnlXVTogdHJhbnNwb3J0LnN0b3J5V1UsXG4gIH0pO1xuICBjb25zdCBzZWVrID0gKHN0b3J5V1UpID0+IHN0b3JlLnNldFRyYW5zcG9ydCh7IG93bmVyOiAndGltZWxpbmUnLCBwbGF5aW5nOiBmYWxzZSwgc3RvcnlXVSB9KTtcbiAgY29uc3Qgc2VsZWN0ZWQgPSBnZXRTZWN0aW9uKHNuYXBzaG90LmRvY3VtZW50LCBzbmFwc2hvdC5zZWxlY3Rpb24pO1xuICBjb25zdCBzZWN0aW9uSW5kZXggPSBnZXRTZWN0aW9uSW5kZXgoc25hcHNob3QuZG9jdW1lbnQsIHNlbGVjdGVkLmlkKTtcbiAgY29uc3QganVtcFNlY3Rpb24gPSAoZGlyZWN0aW9uKSA9PiB7XG4gICAgY29uc3QgbmV4dCA9IHNuYXBzaG90LmNvbXBpbGVkUGxhbi5zZWN0aW9uc1tNYXRoLm1heCgwLCBNYXRoLm1pbihzbmFwc2hvdC5jb21waWxlZFBsYW4uc2VjdGlvbnMubGVuZ3RoIC0gMSwgc2VjdGlvbkluZGV4ICsgZGlyZWN0aW9uKSldO1xuICAgIGlmIChuZXh0KSBzZWVrKG5leHQuc3RhcnRXVSk7XG4gIH07XG4gIHJldHVybiAoXG4gICAgPGRpdiBjbGFzc05hbWU9XCJhYm91dC1lZGl0b3ItdHJhbnNwb3J0XCI+XG4gICAgICA8YnV0dG9uIHR5cGU9XCJidXR0b25cIiB0aXRsZT1cIlByZXZpb3VzIFNlY3Rpb25cIiBhcmlhLWxhYmVsPVwiUHJldmlvdXMgU2VjdGlvblwiIG9uQ2xpY2s9eygpID0+IGp1bXBTZWN0aW9uKC0xKX0+PFNraXBCYWNrIGFyaWEtaGlkZGVuPVwidHJ1ZVwiIC8+PC9idXR0b24+XG4gICAgICA8YnV0dG9uIHR5cGU9XCJidXR0b25cIiB0aXRsZT1cIlByZXZpb3VzIGtleWZyYW1lIMK3IExlZnQgYXJyb3dcIiBhcmlhLWxhYmVsPVwiUHJldmlvdXMga2V5ZnJhbWVcIiBvbkNsaWNrPXsoKSA9PiBqdW1wVGltZWxpbmVLZXlmcmFtZShzdG9yZSwgc25hcHNob3QsIC0xKX0+PENoZXZyb25MZWZ0IGFyaWEtaGlkZGVuPVwidHJ1ZVwiIC8+PC9idXR0b24+XG4gICAgICA8YnV0dG9uIHR5cGU9XCJidXR0b25cIiBjbGFzc05hbWU9XCJpcy1wcmltYXJ5XCIgdGl0bGU9e3RyYW5zcG9ydC5wbGF5aW5nID8gJ1BhdXNlJyA6ICdQbGF5J30gYXJpYS1sYWJlbD17dHJhbnNwb3J0LnBsYXlpbmcgPyAnUGF1c2UnIDogJ1BsYXknfSBvbkNsaWNrPXtwbGF5fT5cbiAgICAgICAge3RyYW5zcG9ydC5wbGF5aW5nID8gPFBhdXNlIGFyaWEtaGlkZGVuPVwidHJ1ZVwiIC8+IDogPFBsYXkgYXJpYS1oaWRkZW49XCJ0cnVlXCIgLz59XG4gICAgICA8L2J1dHRvbj5cbiAgICAgIDxidXR0b24gdHlwZT1cImJ1dHRvblwiIHRpdGxlPVwiTmV4dCBTZWN0aW9uXCIgYXJpYS1sYWJlbD1cIk5leHQgU2VjdGlvblwiIG9uQ2xpY2s9eygpID0+IGp1bXBTZWN0aW9uKDEpfT48U2tpcEZvcndhcmQgYXJpYS1oaWRkZW49XCJ0cnVlXCIgLz48L2J1dHRvbj5cbiAgICAgIDxidXR0b24gdHlwZT1cImJ1dHRvblwiIHRpdGxlPVwiTmV4dCBrZXlmcmFtZSDCtyBSaWdodCBhcnJvd1wiIGFyaWEtbGFiZWw9XCJOZXh0IGtleWZyYW1lXCIgb25DbGljaz17KCkgPT4ganVtcFRpbWVsaW5lS2V5ZnJhbWUoc3RvcmUsIHNuYXBzaG90LCAxKX0+PENoZXZyb25SaWdodCBhcmlhLWhpZGRlbj1cInRydWVcIiAvPjwvYnV0dG9uPlxuICAgICAgPG91dHB1dD57Zm9ybWF0V1UodHJhbnNwb3J0LnN0b3J5V1UpfTwvb3V0cHV0PlxuICAgICAgPGlucHV0XG4gICAgICAgIGFyaWEtbGFiZWw9XCJHbG9iYWwgbmFycmF0aXZlIHBsYXloZWFkXCJcbiAgICAgICAgdHlwZT1cInJhbmdlXCJcbiAgICAgICAgbWluPVwiMFwiXG4gICAgICAgIG1heD17bWF4V1V9XG4gICAgICAgIHN0ZXA9XCIwLjAwMlwiXG4gICAgICAgIHZhbHVlPXtNYXRoLm1pbihtYXhXVSwgdHJhbnNwb3J0LnN0b3J5V1UpfVxuICAgICAgICBvbkNoYW5nZT17KGV2ZW50KSA9PiBzZWVrKE51bWJlcihldmVudC50YXJnZXQudmFsdWUpKX1cbiAgICAgIC8+XG4gICAgICA8YnV0dG9uXG4gICAgICAgIHR5cGU9XCJidXR0b25cIlxuICAgICAgICBjbGFzc05hbWU9e3RyYW5zcG9ydC5vd25lciA9PT0gJ3Njcm9sbCcgPyAnaXMtYWN0aXZlJyA6ICcnfVxuICAgICAgICBvbkNsaWNrPXsoKSA9PiBzdG9yZS5zZXRUcmFuc3BvcnQoeyBvd25lcjogJ3Njcm9sbCcsIHBsYXlpbmc6IGZhbHNlIH0pfVxuICAgICAgPkZvbGxvdyBzY3JvbGw8L2J1dHRvbj5cbiAgICAgIDxidXR0b25cbiAgICAgICAgdHlwZT1cImJ1dHRvblwiXG4gICAgICAgIGNsYXNzTmFtZT17dHJhbnNwb3J0LmxpdmVBbWJpZW50ID8gJ2lzLWFjdGl2ZScgOiAnJ31cbiAgICAgICAgb25DbGljaz17KCkgPT4gc3RvcmUuc2V0VHJhbnNwb3J0KHsgbGl2ZUFtYmllbnQ6ICF0cmFuc3BvcnQubGl2ZUFtYmllbnQgfSl9XG4gICAgICA+TGl2ZSBhbWJpZW50PC9idXR0b24+XG4gICAgICA8c2VsZWN0XG4gICAgICAgIGFyaWEtbGFiZWw9XCJQcmV2aWV3IHByb2ZpbGVcIlxuICAgICAgICB2YWx1ZT17c25hcHNob3QucHJldmlld1Byb2ZpbGV9XG4gICAgICAgIG9uQ2hhbmdlPXsoZXZlbnQpID0+IHN0b3JlLnNldFByZXZpZXdQcm9maWxlKGV2ZW50LnRhcmdldC52YWx1ZSl9XG4gICAgICA+XG4gICAgICAgIDxvcHRpb24gdmFsdWU9XCJkZXNrdG9wXCI+RGVza3RvcDwvb3B0aW9uPlxuICAgICAgICA8b3B0aW9uIHZhbHVlPVwibW9iaWxlXCI+TW9iaWxlPC9vcHRpb24+XG4gICAgICAgIDxvcHRpb24gdmFsdWU9XCJyZWR1Y2VkLW1vdGlvblwiPlJlZHVjZWQgbW90aW9uPC9vcHRpb24+XG4gICAgICA8L3NlbGVjdD5cbiAgICA8L2Rpdj5cbiAgKTtcbn1cblxuZnVuY3Rpb24gVGltZWxpbmUoeyBzdG9yZSwgc25hcHNob3QgfSkge1xuICBjb25zdCB7IGRvY3VtZW50LCBjb21waWxlZFBsYW4sIHNlbGVjdGlvbiwgdHJhbnNwb3J0IH0gPSBzbmFwc2hvdDtcbiAgY29uc3Qgc2VsZWN0ZWRDdWVNZW1iZXJzID0gZ2V0QWJvdXROYXJyYXRpdmVTZWxlY3Rpb25NZW1iZXJzKHNlbGVjdGlvbik7XG4gIGNvbnN0IG1heFdVID0gTWF0aC5tYXgoMC4wMDEsIGNvbXBpbGVkUGxhbj8ubWF4U3RvcnlXVSB8fCBkb2N1bWVudC5zZWN0aW9ucy5yZWR1Y2UoKHN1bSwgc2VjdGlvbikgPT4gc3VtICsgc2VjdGlvbi5leHRlbnRXVSwgMCkpO1xuICBjb25zdCBwbGF5aGVhZCA9IGAkeyh0cmFuc3BvcnQuc3RvcnlXVSAvIG1heFdVKSAqIDEwMH0lYDtcbiAgY29uc3QgbGFuZXNSZWYgPSB1c2VSZWYobnVsbCk7XG4gIGNvbnN0IHRpbWluZ0RyYWdSZWYgPSB1c2VSZWYobnVsbCk7XG4gIGNvbnN0IHByZXZpZXdGcmFtZVJlZiA9IHVzZVJlZihudWxsKTtcbiAgY29uc3QgcGVuZGluZ1ByZXZpZXdSZWYgPSB1c2VSZWYobnVsbCk7XG4gIGNvbnN0IHN1cHByZXNzZWRDbGlja1JlZiA9IHVzZVJlZihudWxsKTtcbiAgY29uc3QgW2NhbWVyYURyYWdQcmV2aWV3LCBzZXRDYW1lcmFEcmFnUHJldmlld10gPSB1c2VTdGF0ZShudWxsKTtcbiAgY29uc3QgW3NlY3Rpb25SZXNpemVQcmV2aWV3LCBzZXRTZWN0aW9uUmVzaXplUHJldmlld10gPSB1c2VTdGF0ZShudWxsKTtcbiAgY29uc3QgW21hcnF1ZWUsIHNldE1hcnF1ZWVdID0gdXNlU3RhdGUobnVsbCk7XG5cbiAgY29uc3QgcXVldWVQcmV2aWV3RnJhbWUgPSAoY2FsbGJhY2spID0+IHtcbiAgICBwZW5kaW5nUHJldmlld1JlZi5jdXJyZW50ID0gY2FsbGJhY2s7XG4gICAgaWYgKHByZXZpZXdGcmFtZVJlZi5jdXJyZW50KSByZXR1cm47XG4gICAgcHJldmlld0ZyYW1lUmVmLmN1cnJlbnQgPSByZXF1ZXN0QW5pbWF0aW9uRnJhbWUoKCkgPT4ge1xuICAgICAgcHJldmlld0ZyYW1lUmVmLmN1cnJlbnQgPSBudWxsO1xuICAgICAgY29uc3QgcGVuZGluZyA9IHBlbmRpbmdQcmV2aWV3UmVmLmN1cnJlbnQ7XG4gICAgICBwZW5kaW5nUHJldmlld1JlZi5jdXJyZW50ID0gbnVsbDtcbiAgICAgIHBlbmRpbmc/LigpO1xuICAgIH0pO1xuICB9O1xuICBjb25zdCBmbHVzaFByZXZpZXdGcmFtZSA9ICgpID0+IHtcbiAgICBpZiAocHJldmlld0ZyYW1lUmVmLmN1cnJlbnQpIGNhbmNlbEFuaW1hdGlvbkZyYW1lKHByZXZpZXdGcmFtZVJlZi5jdXJyZW50KTtcbiAgICBwcmV2aWV3RnJhbWVSZWYuY3VycmVudCA9IG51bGw7XG4gICAgY29uc3QgcGVuZGluZyA9IHBlbmRpbmdQcmV2aWV3UmVmLmN1cnJlbnQ7XG4gICAgcGVuZGluZ1ByZXZpZXdSZWYuY3VycmVudCA9IG51bGw7XG4gICAgcGVuZGluZz8uKCk7XG4gIH07XG5cbiAgY29uc3Qgem9vbVRpbWVsaW5lID0gKGV2ZW50KSA9PiB7XG4gICAgaWYgKCFldmVudC5jdHJsS2V5ICYmICFldmVudC5tZXRhS2V5KSByZXR1cm47XG4gICAgZXZlbnQucHJldmVudERlZmF1bHQoKTtcbiAgICBjb25zdCBsYW5lcyA9IGxhbmVzUmVmLmN1cnJlbnQ7XG4gICAgaWYgKCFsYW5lcykgcmV0dXJuO1xuICAgIGNvbnN0IHJlY3QgPSBsYW5lcy5nZXRCb3VuZGluZ0NsaWVudFJlY3QoKTtcbiAgICBjb25zdCBwb2ludGVyWCA9IE1hdGgubWluKHJlY3Qud2lkdGgsIE1hdGgubWF4KDAsIGV2ZW50LmNsaWVudFggLSByZWN0LmxlZnQpKTtcbiAgICBjb25zdCBzdG9yeVJhdGlvID0gKGxhbmVzLnNjcm9sbExlZnQgKyBwb2ludGVyWCkgLyBNYXRoLm1heCgxLCBsYW5lcy5zY3JvbGxXaWR0aCk7XG4gICAgY29uc3QgY3VycmVudFpvb20gPSBNYXRoLm1heCgxLCBOdW1iZXIodHJhbnNwb3J0Lnpvb20pIHx8IDEpO1xuICAgIGNvbnN0IG5leHRab29tID0gTWF0aC5taW4oOCwgTWF0aC5tYXgoMSwgY3VycmVudFpvb20gKiBNYXRoLmV4cCgtZXZlbnQuZGVsdGFZICogMC4wMDI1KSkpO1xuICAgIHN0b3JlLnNldFRyYW5zcG9ydCh7IHpvb206IE51bWJlcihuZXh0Wm9vbS50b0ZpeGVkKDMpKSB9KTtcbiAgICByZXF1ZXN0QW5pbWF0aW9uRnJhbWUoKCkgPT4ge1xuICAgICAgbGFuZXMuc2Nyb2xsTGVmdCA9IChzdG9yeVJhdGlvICogbGFuZXMuc2Nyb2xsV2lkdGgpIC0gcG9pbnRlclg7XG4gICAgfSk7XG4gIH07XG5cbiAgdXNlRWZmZWN0KCgpID0+ICgpID0+IHtcbiAgICBpZiAocHJldmlld0ZyYW1lUmVmLmN1cnJlbnQpIGNhbmNlbEFuaW1hdGlvbkZyYW1lKHByZXZpZXdGcmFtZVJlZi5jdXJyZW50KTtcbiAgfSwgW10pO1xuXG4gIGNvbnN0IHJlc29sdmVDYW1lcmFEcm9wQXRDbGllbnRYID0gKGNsaWVudFgpID0+IHtcbiAgICBjb25zdCBsYW5lcyA9IGxhbmVzUmVmLmN1cnJlbnQ7XG4gICAgY29uc3QgY3VycmVudCA9IHN0b3JlLmdldFNuYXBzaG90KCk7XG4gICAgaWYgKCFsYW5lcykgcmV0dXJuIHsgdmFsaWQ6IGZhbHNlLCByZWFzb246ICdUaGUgY2FtZXJhIHRpbWVsaW5lIGlzIG5vdCByZWFkeS4nIH07XG4gICAgY29uc3QgcmVjdCA9IGxhbmVzLmdldEJvdW5kaW5nQ2xpZW50UmVjdCgpO1xuICAgIGNvbnN0IGNvbnRlbnRYID0gTWF0aC5taW4oXG4gICAgICBsYW5lcy5zY3JvbGxXaWR0aCxcbiAgICAgIE1hdGgubWF4KDAsIGNsaWVudFggLSByZWN0LmxlZnQgKyBsYW5lcy5zY3JvbGxMZWZ0KSxcbiAgICApO1xuICAgIGNvbnN0IHN0b3J5V1UgPSAoY29udGVudFggLyBNYXRoLm1heCgxLCBsYW5lcy5zY3JvbGxXaWR0aCkpXG4gICAgICAqIE1hdGgubWF4KDAuMDAxLCBjdXJyZW50LmNvbXBpbGVkUGxhbj8ubWF4U3RvcnlXVSB8fCBtYXhXVSk7XG4gICAgY29uc3QgZHJhZyA9IHRpbWluZ0RyYWdSZWYuY3VycmVudDtcbiAgICBjb25zdCBkcm9wID0gcmVzb2x2ZUFib3V0TmFycmF0aXZlQ2FtZXJhS2V5RHJvcCh7XG4gICAgICBkb2N1bWVudDogY3VycmVudC5kb2N1bWVudCxcbiAgICAgIHBsYW46IGN1cnJlbnQuY29tcGlsZWRQbGFuLFxuICAgICAgc291cmNlU2VjdGlvbkluZGV4OiBkcmFnPy5zZWN0aW9uSW5kZXgsXG4gICAgICBzb3VyY2VLZXlJbmRleDogZHJhZz8ua2V5SW5kZXgsXG4gICAgICBzdG9yeVdVLFxuICAgIH0pO1xuICAgIHJldHVybiB7IC4uLmRyb3AsIGNvbnRlbnRYIH07XG4gIH07XG5cbiAgY29uc3QgYmVnaW5UaW1pbmdEcmFnID0gKGV2ZW50LCBkcmFnKSA9PiB7XG4gICAgaWYgKGRyYWcubG9ja2VkIHx8IGV2ZW50LmJ1dHRvbiAhPT0gMCkgcmV0dXJuO1xuICAgIGNvbnN0IGNsaXAgPSBldmVudC5jdXJyZW50VGFyZ2V0LnBhcmVudEVsZW1lbnQ7XG4gICAgY29uc3QgcmVjdCA9IGNsaXA/LmdldEJvdW5kaW5nQ2xpZW50UmVjdCgpO1xuICAgIGlmICghcmVjdD8ud2lkdGgpIHJldHVybjtcbiAgICBldmVudC5wcmV2ZW50RGVmYXVsdCgpO1xuICAgIGV2ZW50LnN0b3BQcm9wYWdhdGlvbigpO1xuICAgIGV2ZW50LmN1cnJlbnRUYXJnZXQuc2V0UG9pbnRlckNhcHR1cmU/LihldmVudC5wb2ludGVySWQpO1xuICAgIGxldCBuZXh0U2VsZWN0aW9uID0gZHJhZy5zZWxlY3Rpb247XG4gICAgaWYgKGRyYWcudHlwZSA9PT0gJ2N1ZScpIHtcbiAgICAgIGNvbnN0IGN1cnJlbnRTZWxlY3Rpb24gPSBzdG9yZS5nZXRTbmFwc2hvdCgpLnNlbGVjdGlvbjtcbiAgICAgIGNvbnN0IGN1cnJlbnRNZW1iZXJzID0gZ2V0QWJvdXROYXJyYXRpdmVTZWxlY3Rpb25NZW1iZXJzKGN1cnJlbnRTZWxlY3Rpb24pO1xuICAgICAgY29uc3QgYWxyZWFkeVNlbGVjdGVkID0gY3VycmVudE1lbWJlcnMuc29tZSgobWVtYmVyKSA9PiAoXG4gICAgICAgIG1lbWJlci5zZWN0aW9uSWQgPT09IGRyYWcuc2VsZWN0aW9uLnNlY3Rpb25JZCAmJiBtZW1iZXIuY3VlSWQgPT09IGRyYWcuc2VsZWN0aW9uLmN1ZUlkXG4gICAgICApKTtcbiAgICAgIG5leHRTZWxlY3Rpb24gPSBldmVudC5zaGlmdEtleVxuICAgICAgICA/IHRvZ2dsZUFib3V0TmFycmF0aXZlQ3VlU2VsZWN0aW9uKGN1cnJlbnRTZWxlY3Rpb24sIGRyYWcuc2VsZWN0aW9uKVxuICAgICAgICA6IGFscmVhZHlTZWxlY3RlZCAmJiBjdXJyZW50TWVtYmVycy5sZW5ndGggPiAxXG4gICAgICAgICAgPyB7IC4uLmRyYWcuc2VsZWN0aW9uLCBtZW1iZXJzOiBjdXJyZW50TWVtYmVycyB9XG4gICAgICAgICAgOiBkcmFnLnNlbGVjdGlvbjtcbiAgICAgIHN0b3JlLmJlZ2luUHJldmlldygnTW92ZSB0ZXh0IEN1ZXMnKTtcbiAgICB9XG4gICAgdGltaW5nRHJhZ1JlZi5jdXJyZW50ID0ge1xuICAgICAgLi4uZHJhZyxcbiAgICAgIHNlbGVjdGlvbjogbmV4dFNlbGVjdGlvbixcbiAgICAgIG1lbWJlcnM6IGRyYWcudHlwZSA9PT0gJ2N1ZScgPyBnZXRBYm91dE5hcnJhdGl2ZVNlbGVjdGlvbk1lbWJlcnMobmV4dFNlbGVjdGlvbikgOiBudWxsLFxuICAgICAgc3RhcnREb2N1bWVudDogZHJhZy50eXBlID09PSAnY3VlJyA/IGNsb25lQWJvdXROYXJyYXRpdmVEb2N1bWVudChzdG9yZS5nZXRTbmFwc2hvdCgpLmRvY3VtZW50KSA6IG51bGwsXG4gICAgICBzdGFydFBsYW46IGRyYWcudHlwZSA9PT0gJ2N1ZScgPyBzdG9yZS5nZXRTbmFwc2hvdCgpLmNvbXBpbGVkUGxhbiA6IG51bGwsXG4gICAgICBwb2ludGVySWQ6IGV2ZW50LnBvaW50ZXJJZCxcbiAgICAgIHJlY3QsXG4gICAgICBzdGFydFg6IGV2ZW50LmNsaWVudFgsXG4gICAgICBtb3ZlZDogZmFsc2UsXG4gICAgICBsYXN0QXQ6IGRyYWcuYXQsXG4gICAgICBsYXN0RHJvcDogbnVsbCxcbiAgICB9O1xuICAgIHN0b3JlLnNldFNlbGVjdGlvbihuZXh0U2VsZWN0aW9uKTtcbiAgICBzdG9yZS5zZXRUcmFuc3BvcnQoeyBvd25lcjogJ3RpbWVsaW5lJywgcGxheWluZzogZmFsc2UsIHN0b3J5V1U6IGRyYWcuc3RvcnlXVSB9KTtcbiAgfTtcblxuICBjb25zdCBtb3ZlVGltaW5nRHJhZyA9IChldmVudCkgPT4ge1xuICAgIGNvbnN0IGRyYWcgPSB0aW1pbmdEcmFnUmVmLmN1cnJlbnQ7XG4gICAgaWYgKCFkcmFnIHx8IGRyYWcucG9pbnRlcklkICE9PSBldmVudC5wb2ludGVySWQpIHJldHVybjtcbiAgICBpZiAoIWRyYWcubW92ZWQgJiYgTWF0aC5hYnMoZXZlbnQuY2xpZW50WCAtIGRyYWcuc3RhcnRYKSA8IDMpIHJldHVybjtcbiAgICBkcmFnLm1vdmVkID0gdHJ1ZTtcbiAgICBpZiAoZHJhZy50eXBlID09PSAnY2FtZXJhJykge1xuICAgICAgY29uc3QgZHJvcCA9IHJlc29sdmVDYW1lcmFEcm9wQXRDbGllbnRYKGV2ZW50LmNsaWVudFgpO1xuICAgICAgZHJhZy5sYXN0RHJvcCA9IGRyb3A7XG4gICAgICBzZXRDYW1lcmFEcmFnUHJldmlldyh7IC4uLmRyb3AsIHRva2VuOiBkcmFnLnRva2VuIH0pO1xuICAgICAgaWYgKGRyb3AudmFsaWQpIHtcbiAgICAgICAgc3RvcmUuc2V0VHJhbnNwb3J0KHsgb3duZXI6ICd0aW1lbGluZScsIHBsYXlpbmc6IGZhbHNlLCBzdG9yeVdVOiBkcm9wLnN0b3J5V1UgfSk7XG4gICAgICB9XG4gICAgICByZXR1cm47XG4gICAgfVxuICAgIGlmIChkcmFnLnR5cGUgPT09ICdkaXNjaXBsaW5lLXJldmVhbCcpIHtcbiAgICAgIGNvbnN0IGRlbHRhTGFuZSA9IChldmVudC5jbGllbnRYIC0gZHJhZy5zdGFydFgpIC8gZHJhZy5yZWN0LndpZHRoO1xuICAgICAgY29uc3QgbmV4dEF0ID0gTWF0aC5taW4oZHJhZy5tYXgsIE1hdGgubWF4KFxuICAgICAgICBkcmFnLm1pbixcbiAgICAgICAgc25hcEFib3V0TmFycmF0aXZlVGltZWxpbmVWYWx1ZShkcmFnLmF0ICsgZGVsdGFMYW5lKSxcbiAgICAgICkpO1xuICAgICAgaWYgKE1hdGguYWJzKG5leHRBdCAtIGRyYWcubGFzdEF0KSA8IDAuMDAwMDAxKSByZXR1cm47XG4gICAgICBjb25zdCBkZWx0YSA9IG5leHRBdCAtIGRyYWcubGFzdEF0O1xuICAgICAgc3RvcmUuY29tbWl0KCdNb3ZlIERpc2NpcGxpbmUgcmV2ZWFsJywgKGRyYWZ0KSA9PiB7XG4gICAgICAgIGNvbnN0IHJldmVhbCA9IGRyYWZ0LnNlY3Rpb25zW2RyYWcuc2VjdGlvbkluZGV4XS50ZXh0LmRpc2NpcGxpbmVSZXZlYWw7XG4gICAgICAgIGlmICghcmV2ZWFsKSByZXR1cm47XG4gICAgICAgIHJldmVhbC5zdGFydCArPSBkZWx0YTtcbiAgICAgICAgcmV2ZWFsLmVuZCArPSBkZWx0YTtcbiAgICAgIH0sIHsgY29hbGVzY2VLZXk6IGRyYWcuY29hbGVzY2VLZXksIHNlbGVjdGlvbjogZHJhZy5zZWxlY3Rpb24gfSk7XG4gICAgICBkcmFnLmxhc3RBdCA9IG5leHRBdDtcbiAgICAgIHN0b3JlLnNldFRyYW5zcG9ydCh7XG4gICAgICAgIG93bmVyOiAndGltZWxpbmUnLFxuICAgICAgICBwbGF5aW5nOiBmYWxzZSxcbiAgICAgICAgc3RvcnlXVTogZHJhZy5zZWN0aW9uU3RhcnRXVSArIChuZXh0QXQgKiBkcmFnLnRyYXZlbFdVKSxcbiAgICAgIH0pO1xuICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICBjb25zdCBsb2NhbERlbHRhID0gKGV2ZW50LmNsaWVudFggLSBkcmFnLnN0YXJ0WCkgLyBkcmFnLnJlY3Qud2lkdGg7XG4gICAgY29uc3QgbW92ZW1lbnQgPSByZXNvbHZlQWJvdXROYXJyYXRpdmVDdWVHcm91cE1vdmUoe1xuICAgICAgZG9jdW1lbnQ6IGRyYWcuc3RhcnREb2N1bWVudCxcbiAgICAgIHBsYW46IGRyYWcuc3RhcnRQbGFuLFxuICAgICAgbWVtYmVyczogZHJhZy5tZW1iZXJzLFxuICAgICAgcHJpbWFyeTogZHJhZy5zZWxlY3Rpb24sXG4gICAgICBsb2NhbERlbHRhLFxuICAgIH0pO1xuICAgIGlmICghbW92ZW1lbnQudmFsaWQgfHwgTWF0aC5hYnMobW92ZW1lbnQuZGVsdGFXVSAtIChkcmFnLmxhc3REZWx0YVdVIHx8IDApKSA8IDAuMDAwMDAxKSByZXR1cm47XG4gICAgZHJhZy5sYXN0RGVsdGFXVSA9IG1vdmVtZW50LmRlbHRhV1U7XG4gICAgcXVldWVQcmV2aWV3RnJhbWUoKCkgPT4ge1xuICAgICAgc3RvcmUudXBkYXRlUHJldmlldygoZHJhZnQpID0+IHtcbiAgICAgICAgbW92ZW1lbnQubW92ZXMuZm9yRWFjaCgobW92ZSkgPT4ge1xuICAgICAgICAgIGNvbnN0IGN1ZSA9IGRyYWZ0LnNlY3Rpb25zW21vdmUuc2VjdGlvbkluZGV4XT8udGV4dD8uY3Vlcz8uZmluZCgoaXRlbSkgPT4gaXRlbS5pZCA9PT0gbW92ZS5jdWVJZCk7XG4gICAgICAgICAgaWYgKGN1ZSkgT2JqZWN0LmFzc2lnbihjdWUsIHsgZW50ZXI6IG1vdmUuZW50ZXIsIGhvbGQ6IG1vdmUuaG9sZCwgZXhpdDogbW92ZS5leGl0IH0pO1xuICAgICAgICB9KTtcbiAgICAgIH0sIHtcbiAgICAgICAgb3duZXI6ICd0aW1lbGluZScsXG4gICAgICAgIHBsYXlpbmc6IGZhbHNlLFxuICAgICAgICBzdG9yeVdVOiBkcmFnLnN0b3J5V1UgKyBtb3ZlbWVudC5kZWx0YVdVLFxuICAgICAgfSk7XG4gICAgfSk7XG4gIH07XG5cbiAgY29uc3QgZW5kVGltaW5nRHJhZyA9IChldmVudCkgPT4ge1xuICAgIGNvbnN0IGRyYWcgPSB0aW1pbmdEcmFnUmVmLmN1cnJlbnQ7XG4gICAgaWYgKCFkcmFnIHx8IGRyYWcucG9pbnRlcklkICE9PSBldmVudC5wb2ludGVySWQpIHJldHVybjtcbiAgICBpZiAoZXZlbnQuY3VycmVudFRhcmdldC5oYXNQb2ludGVyQ2FwdHVyZT8uKGV2ZW50LnBvaW50ZXJJZCkpIGV2ZW50LmN1cnJlbnRUYXJnZXQucmVsZWFzZVBvaW50ZXJDYXB0dXJlKGV2ZW50LnBvaW50ZXJJZCk7XG4gICAgaWYgKGRyYWcudHlwZSA9PT0gJ2N1ZScpIHtcbiAgICAgIGZsdXNoUHJldmlld0ZyYW1lKCk7XG4gICAgICBpZiAoZXZlbnQudHlwZSA9PT0gJ3BvaW50ZXJjYW5jZWwnIHx8ICFkcmFnLm1vdmVkKSBzdG9yZS5jYW5jZWxQcmV2aWV3KCk7XG4gICAgICBlbHNlIHN0b3JlLmNvbW1pdFByZXZpZXcoZHJhZy5zZWxlY3Rpb24pO1xuICAgIH1cbiAgICBpZiAoZHJhZy50eXBlID09PSAnY2FtZXJhJyAmJiBkcmFnLm1vdmVkICYmIGV2ZW50LnR5cGUgIT09ICdwb2ludGVyY2FuY2VsJykge1xuICAgICAgY29uc3QgZHJvcCA9IGRyYWcubGFzdERyb3AgfHwgcmVzb2x2ZUNhbWVyYURyb3BBdENsaWVudFgoZXZlbnQuY2xpZW50WCk7XG4gICAgICBpZiAoZHJvcC52YWxpZCkge1xuICAgICAgICBzdG9yZS5jb21taXQoJ01vdmUgY2FtZXJhIGtleScsIChkcmFmdCkgPT4ge1xuICAgICAgICAgIGNvbnN0IHNvdXJjZUtleXMgPSBkcmFmdC5zZWN0aW9uc1tkcmFnLnNlY3Rpb25JbmRleF0/LmNhbWVyYS5rZXlzO1xuICAgICAgICAgIGNvbnN0IFttb3ZlZEtleV0gPSBzb3VyY2VLZXlzPy5zcGxpY2UoZHJhZy5rZXlJbmRleCwgMSkgfHwgW107XG4gICAgICAgICAgaWYgKCFtb3ZlZEtleSkgcmV0dXJuO1xuICAgICAgICAgIG1vdmVkS2V5LmF0ID0gZHJvcC5hdDtcbiAgICAgICAgICBjb25zdCBkZXN0aW5hdGlvbktleXMgPSBkcmFmdC5zZWN0aW9uc1tkcm9wLnNlY3Rpb25JbmRleF0uY2FtZXJhLmtleXM7XG4gICAgICAgICAgZGVzdGluYXRpb25LZXlzLnB1c2gobW92ZWRLZXkpO1xuICAgICAgICAgIGRlc3RpbmF0aW9uS2V5cy5zb3J0KChhLCBiKSA9PiBhLmF0IC0gYi5hdCk7XG4gICAgICAgIH0sIHtcbiAgICAgICAgICBzZWxlY3Rpb246IHsgdHlwZTogJ2NhbWVyYS1rZXknLCBzZWN0aW9uSWQ6IGRyb3Auc2VjdGlvbklkLCBrZXlJbmRleDogZHJvcC5rZXlJbmRleCB9LFxuICAgICAgICB9KTtcbiAgICAgICAgc3RvcmUuc2V0VHJhbnNwb3J0KHsgb3duZXI6ICd0aW1lbGluZScsIHBsYXlpbmc6IGZhbHNlLCBzdG9yeVdVOiBkcm9wLnN0b3J5V1UgfSk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBzdG9yZS5zZXRTYXZlU3RhdGUoeyBtZXNzYWdlOiBkcm9wLnJlYXNvbiB8fCAnVGhhdCBjYW1lcmEga2V5IGNhbm5vdCBiZSBwbGFjZWQgaGVyZS4nIH0pO1xuICAgICAgfVxuICAgIH1cbiAgICBpZiAoZHJhZy5tb3ZlZCkge1xuICAgICAgc3VwcHJlc3NlZENsaWNrUmVmLmN1cnJlbnQgPSBkcmFnLnRva2VuO1xuICAgICAgd2luZG93LnNldFRpbWVvdXQoKCkgPT4ge1xuICAgICAgICBpZiAoc3VwcHJlc3NlZENsaWNrUmVmLmN1cnJlbnQgPT09IGRyYWcudG9rZW4pIHN1cHByZXNzZWRDbGlja1JlZi5jdXJyZW50ID0gbnVsbDtcbiAgICAgIH0sIDApO1xuICAgIH1cbiAgICBzZXRDYW1lcmFEcmFnUHJldmlldyhudWxsKTtcbiAgICB0aW1pbmdEcmFnUmVmLmN1cnJlbnQgPSBudWxsO1xuICB9O1xuXG4gIGNvbnN0IGhhbmRsZVRpbWluZ0NsaWNrID0gKHRva2VuLCBhY3Rpb24pID0+IHtcbiAgICBpZiAoc3VwcHJlc3NlZENsaWNrUmVmLmN1cnJlbnQgPT09IHRva2VuKSB7XG4gICAgICBzdXBwcmVzc2VkQ2xpY2tSZWYuY3VycmVudCA9IG51bGw7XG4gICAgICByZXR1cm47XG4gICAgfVxuICAgIGFjdGlvbigpO1xuICB9O1xuXG4gIGNvbnN0IGJlZ2luU2VjdGlvblJlc2l6ZSA9IChldmVudCwgZGF0YSkgPT4ge1xuICAgIGlmIChkYXRhLmxvY2tlZCB8fCBldmVudC5idXR0b24gIT09IDApIHJldHVybjtcbiAgICBldmVudC5wcmV2ZW50RGVmYXVsdCgpO1xuICAgIGV2ZW50LnN0b3BQcm9wYWdhdGlvbigpO1xuICAgIGV2ZW50LmN1cnJlbnRUYXJnZXQuc2V0UG9pbnRlckNhcHR1cmU/LihldmVudC5wb2ludGVySWQpO1xuICAgIGNvbnN0IGN1cnJlbnQgPSBzdG9yZS5nZXRTbmFwc2hvdCgpO1xuICAgIGNvbnN0IGZpZWxkID0gZ2V0QWJvdXROYXJyYXRpdmVFeHRlbnRGaWVsZChjdXJyZW50LnByZXZpZXdQcm9maWxlKTtcbiAgICBzdG9yZS5iZWdpblByZXZpZXcoYFJlc2l6ZSAke2RhdGEuc2VjdGlvbkxhYmVsfWApO1xuICAgIHN0b3JlLnNldFNlbGVjdGlvbih7IHR5cGU6ICdzZWN0aW9uJywgc2VjdGlvbklkOiBkYXRhLnNlY3Rpb25JZCB9KTtcbiAgICB0aW1pbmdEcmFnUmVmLmN1cnJlbnQgPSB7XG4gICAgICB0eXBlOiAnc2VjdGlvbi1yZXNpemUnLFxuICAgICAgdG9rZW46IGBzZWN0aW9uLXJlc2l6ZToke2RhdGEuc2VjdGlvbklkfWAsXG4gICAgICBwb2ludGVySWQ6IGV2ZW50LnBvaW50ZXJJZCxcbiAgICAgIHN0YXJ0WDogZXZlbnQuY2xpZW50WCxcbiAgICAgIG1vdmVkOiBmYWxzZSxcbiAgICAgIHNlY3Rpb25JZDogZGF0YS5zZWN0aW9uSWQsXG4gICAgICBzZWN0aW9uSW5kZXg6IGRhdGEuc2VjdGlvbkluZGV4LFxuICAgICAgc2VjdGlvbkxhYmVsOiBkYXRhLnNlY3Rpb25MYWJlbCxcbiAgICAgIGZpZWxkLFxuICAgICAgc3RhcnRFeHRlbnQ6IE51bWJlcihjdXJyZW50LmRvY3VtZW50LnNlY3Rpb25zW2RhdGEuc2VjdGlvbkluZGV4XVtmaWVsZF0pLFxuICAgICAgc3RhcnRNYXhXVTogTWF0aC5tYXgoMC4wMDEsIGN1cnJlbnQuY29tcGlsZWRQbGFuPy5tYXhTdG9yeVdVIHx8IG1heFdVKSxcbiAgICAgIHN0YXJ0U2Nyb2xsV2lkdGg6IE1hdGgubWF4KDEsIGxhbmVzUmVmLmN1cnJlbnQ/LnNjcm9sbFdpZHRoIHx8IDEpLFxuICAgICAgcGxheWhlYWRDb250ZXh0OiBjYXB0dXJlQWJvdXROYXJyYXRpdmVQbGF5aGVhZENvbnRleHQoe1xuICAgICAgICBwbGFuOiBjdXJyZW50LmNvbXBpbGVkUGxhbixcbiAgICAgICAgc3RvcnlXVTogY3VycmVudC50cmFuc3BvcnQuc3RvcnlXVSxcbiAgICAgICAgcmVzaXplZFNlY3Rpb25JZDogZGF0YS5zZWN0aW9uSWQsXG4gICAgICB9KSxcbiAgICAgIHNlbGVjdGlvbjogeyB0eXBlOiAnc2VjdGlvbicsIHNlY3Rpb25JZDogZGF0YS5zZWN0aW9uSWQgfSxcbiAgICB9O1xuICAgIHNldFNlY3Rpb25SZXNpemVQcmV2aWV3KHsgc2VjdGlvbklkOiBkYXRhLnNlY3Rpb25JZCwgZXh0ZW50OiBOdW1iZXIoY3VycmVudC5kb2N1bWVudC5zZWN0aW9uc1tkYXRhLnNlY3Rpb25JbmRleF1bZmllbGRdKSB9KTtcbiAgfTtcblxuICBjb25zdCBtb3ZlU2VjdGlvblJlc2l6ZSA9IChldmVudCkgPT4ge1xuICAgIGNvbnN0IGRyYWcgPSB0aW1pbmdEcmFnUmVmLmN1cnJlbnQ7XG4gICAgaWYgKGRyYWc/LnR5cGUgIT09ICdzZWN0aW9uLXJlc2l6ZScgfHwgZHJhZy5wb2ludGVySWQgIT09IGV2ZW50LnBvaW50ZXJJZCkgcmV0dXJuO1xuICAgIGlmICghZHJhZy5tb3ZlZCAmJiBNYXRoLmFicyhldmVudC5jbGllbnRYIC0gZHJhZy5zdGFydFgpIDwgMykgcmV0dXJuO1xuICAgIGRyYWcubW92ZWQgPSB0cnVlO1xuICAgIGNvbnN0IHJhd0V4dGVudCA9IGRyYWcuc3RhcnRFeHRlbnQgKyAoKChldmVudC5jbGllbnRYIC0gZHJhZy5zdGFydFgpIC8gZHJhZy5zdGFydFNjcm9sbFdpZHRoKSAqIGRyYWcuc3RhcnRNYXhXVSk7XG4gICAgY29uc3Qgc3RlcCA9IGV2ZW50LmFsdEtleSA/IDAuMDEgOiBldmVudC5zaGlmdEtleSA/IDAuMjUgOiAwLjA1O1xuICAgIGNvbnN0IGV4dGVudCA9IE1hdGgubWluKDgsIE1hdGgubWF4KDEsIE1hdGgucm91bmQocmF3RXh0ZW50IC8gc3RlcCkgKiBzdGVwKSk7XG4gICAgaWYgKE1hdGguYWJzKGV4dGVudCAtIChkcmFnLmxhc3RFeHRlbnQgPz8gZHJhZy5zdGFydEV4dGVudCkpIDwgMC4wMDAwMDEpIHJldHVybjtcbiAgICBkcmFnLmxhc3RFeHRlbnQgPSBOdW1iZXIoZXh0ZW50LnRvRml4ZWQoMikpO1xuICAgIHNldFNlY3Rpb25SZXNpemVQcmV2aWV3KHsgc2VjdGlvbklkOiBkcmFnLnNlY3Rpb25JZCwgZXh0ZW50OiBkcmFnLmxhc3RFeHRlbnQgfSk7XG4gICAgcXVldWVQcmV2aWV3RnJhbWUoKCkgPT4ge1xuICAgICAgc3RvcmUudXBkYXRlUHJldmlldygoZHJhZnQpID0+IHtcbiAgICAgICAgZHJhZnQuc2VjdGlvbnNbZHJhZy5zZWN0aW9uSW5kZXhdW2RyYWcuZmllbGRdID0gZHJhZy5sYXN0RXh0ZW50O1xuICAgICAgfSk7XG4gICAgICBzdG9yZS5zZXRUcmFuc3BvcnQoe1xuICAgICAgICBvd25lcjogJ3RpbWVsaW5lJyxcbiAgICAgICAgcGxheWluZzogZmFsc2UsXG4gICAgICAgIHN0b3J5V1U6IHJlbWFwQWJvdXROYXJyYXRpdmVQbGF5aGVhZENvbnRleHQoZHJhZy5wbGF5aGVhZENvbnRleHQsIHN0b3JlLmdldFNuYXBzaG90KCkuY29tcGlsZWRQbGFuKSxcbiAgICAgIH0pO1xuICAgIH0pO1xuICB9O1xuXG4gIGNvbnN0IGVuZFNlY3Rpb25SZXNpemUgPSAoZXZlbnQpID0+IHtcbiAgICBjb25zdCBkcmFnID0gdGltaW5nRHJhZ1JlZi5jdXJyZW50O1xuICAgIGlmIChkcmFnPy50eXBlICE9PSAnc2VjdGlvbi1yZXNpemUnIHx8IGRyYWcucG9pbnRlcklkICE9PSBldmVudC5wb2ludGVySWQpIHJldHVybjtcbiAgICBpZiAoZXZlbnQuY3VycmVudFRhcmdldC5oYXNQb2ludGVyQ2FwdHVyZT8uKGV2ZW50LnBvaW50ZXJJZCkpIGV2ZW50LmN1cnJlbnRUYXJnZXQucmVsZWFzZVBvaW50ZXJDYXB0dXJlKGV2ZW50LnBvaW50ZXJJZCk7XG4gICAgZmx1c2hQcmV2aWV3RnJhbWUoKTtcbiAgICBpZiAoZXZlbnQudHlwZSA9PT0gJ3BvaW50ZXJjYW5jZWwnIHx8ICFkcmFnLm1vdmVkKSBzdG9yZS5jYW5jZWxQcmV2aWV3KCk7XG4gICAgZWxzZSBzdG9yZS5jb21taXRQcmV2aWV3KGRyYWcuc2VsZWN0aW9uKTtcbiAgICB0aW1pbmdEcmFnUmVmLmN1cnJlbnQgPSBudWxsO1xuICAgIHNldFNlY3Rpb25SZXNpemVQcmV2aWV3KG51bGwpO1xuICB9O1xuXG4gIGNvbnN0IHJlc2V0U2VjdGlvbkV4dGVudCA9IChzZWN0aW9uSWQsIHNlY3Rpb25JbmRleCkgPT4ge1xuICAgIGNvbnN0IGN1cnJlbnQgPSBzdG9yZS5nZXRTbmFwc2hvdCgpO1xuICAgIGNvbnN0IGZpZWxkID0gZ2V0QWJvdXROYXJyYXRpdmVFeHRlbnRGaWVsZChjdXJyZW50LnByZXZpZXdQcm9maWxlKTtcbiAgICBjb25zdCBiYXNlbGluZVNlY3Rpb24gPSBjdXJyZW50LmJhc2VsaW5lRG9jdW1lbnQuc2VjdGlvbnMuZmluZCgoaXRlbSkgPT4gaXRlbS5pZCA9PT0gc2VjdGlvbklkKTtcbiAgICBpZiAoIWJhc2VsaW5lU2VjdGlvbiB8fCBiYXNlbGluZVNlY3Rpb25bZmllbGRdID09PSBjdXJyZW50LmRvY3VtZW50LnNlY3Rpb25zW3NlY3Rpb25JbmRleF1bZmllbGRdKSByZXR1cm47XG4gICAgY29uc3QgY29udGV4dCA9IGNhcHR1cmVBYm91dE5hcnJhdGl2ZVBsYXloZWFkQ29udGV4dCh7XG4gICAgICBwbGFuOiBjdXJyZW50LmNvbXBpbGVkUGxhbixcbiAgICAgIHN0b3J5V1U6IGN1cnJlbnQudHJhbnNwb3J0LnN0b3J5V1UsXG4gICAgICByZXNpemVkU2VjdGlvbklkOiBzZWN0aW9uSWQsXG4gICAgfSk7XG4gICAgc3RvcmUuYmVnaW5QcmV2aWV3KCdSZXN0b3JlIHNhdmVkIFNlY3Rpb24gbGVuZ3RoJyk7XG4gICAgc3RvcmUudXBkYXRlUHJldmlldygoZHJhZnQpID0+IHsgZHJhZnQuc2VjdGlvbnNbc2VjdGlvbkluZGV4XVtmaWVsZF0gPSBiYXNlbGluZVNlY3Rpb25bZmllbGRdOyB9KTtcbiAgICBzdG9yZS5zZXRUcmFuc3BvcnQoeyBzdG9yeVdVOiByZW1hcEFib3V0TmFycmF0aXZlUGxheWhlYWRDb250ZXh0KGNvbnRleHQsIHN0b3JlLmdldFNuYXBzaG90KCkuY29tcGlsZWRQbGFuKSB9KTtcbiAgICBzdG9yZS5jb21taXRQcmV2aWV3KHsgdHlwZTogJ3NlY3Rpb24nLCBzZWN0aW9uSWQgfSk7XG4gIH07XG5cbiAgY29uc3QgYmVnaW5NYXJxdWVlID0gKGV2ZW50KSA9PiB7XG4gICAgaWYgKGV2ZW50LmJ1dHRvbiAhPT0gMCB8fCBldmVudC50YXJnZXQgIT09IGV2ZW50LmN1cnJlbnRUYXJnZXQpIHJldHVybjtcbiAgICBjb25zdCBjYW52YXMgPSBsYW5lc1JlZi5jdXJyZW50Py5xdWVyeVNlbGVjdG9yKCcuYWJvdXQtZWRpdG9yLXRpbWVsaW5lLWNhbnZhcycpO1xuICAgIGlmICghY2FudmFzKSByZXR1cm47XG4gICAgZXZlbnQucHJldmVudERlZmF1bHQoKTtcbiAgICBldmVudC5jdXJyZW50VGFyZ2V0LnNldFBvaW50ZXJDYXB0dXJlPy4oZXZlbnQucG9pbnRlcklkKTtcbiAgICBjb25zdCByZWN0ID0gY2FudmFzLmdldEJvdW5kaW5nQ2xpZW50UmVjdCgpO1xuICAgIHRpbWluZ0RyYWdSZWYuY3VycmVudCA9IHtcbiAgICAgIHR5cGU6ICdtYXJxdWVlJyxcbiAgICAgIHBvaW50ZXJJZDogZXZlbnQucG9pbnRlcklkLFxuICAgICAgc3RhcnRDbGllbnRYOiBldmVudC5jbGllbnRYLFxuICAgICAgc3RhcnRDbGllbnRZOiBldmVudC5jbGllbnRZLFxuICAgICAgY2FudmFzUmVjdDogcmVjdCxcbiAgICAgIGFkZGl0aXZlOiBldmVudC5zaGlmdEtleSxcbiAgICB9O1xuICAgIHNldE1hcnF1ZWUoeyBsZWZ0OiBldmVudC5jbGllbnRYIC0gcmVjdC5sZWZ0LCB0b3A6IGV2ZW50LmNsaWVudFkgLSByZWN0LnRvcCwgd2lkdGg6IDAsIGhlaWdodDogMCB9KTtcbiAgfTtcblxuICBjb25zdCBtb3ZlTWFycXVlZSA9IChldmVudCkgPT4ge1xuICAgIGNvbnN0IGRyYWcgPSB0aW1pbmdEcmFnUmVmLmN1cnJlbnQ7XG4gICAgaWYgKGRyYWc/LnR5cGUgIT09ICdtYXJxdWVlJyB8fCBkcmFnLnBvaW50ZXJJZCAhPT0gZXZlbnQucG9pbnRlcklkKSByZXR1cm47XG4gICAgY29uc3QgbGVmdCA9IE1hdGgubWluKGRyYWcuc3RhcnRDbGllbnRYLCBldmVudC5jbGllbnRYKSAtIGRyYWcuY2FudmFzUmVjdC5sZWZ0O1xuICAgIGNvbnN0IHRvcCA9IE1hdGgubWluKGRyYWcuc3RhcnRDbGllbnRZLCBldmVudC5jbGllbnRZKSAtIGRyYWcuY2FudmFzUmVjdC50b3A7XG4gICAgc2V0TWFycXVlZSh7XG4gICAgICBsZWZ0LFxuICAgICAgdG9wLFxuICAgICAgd2lkdGg6IE1hdGguYWJzKGV2ZW50LmNsaWVudFggLSBkcmFnLnN0YXJ0Q2xpZW50WCksXG4gICAgICBoZWlnaHQ6IE1hdGguYWJzKGV2ZW50LmNsaWVudFkgLSBkcmFnLnN0YXJ0Q2xpZW50WSksXG4gICAgfSk7XG4gIH07XG5cbiAgY29uc3QgZW5kTWFycXVlZSA9IChldmVudCkgPT4ge1xuICAgIGNvbnN0IGRyYWcgPSB0aW1pbmdEcmFnUmVmLmN1cnJlbnQ7XG4gICAgaWYgKGRyYWc/LnR5cGUgIT09ICdtYXJxdWVlJyB8fCBkcmFnLnBvaW50ZXJJZCAhPT0gZXZlbnQucG9pbnRlcklkKSByZXR1cm47XG4gICAgaWYgKGV2ZW50LmN1cnJlbnRUYXJnZXQuaGFzUG9pbnRlckNhcHR1cmU/LihldmVudC5wb2ludGVySWQpKSBldmVudC5jdXJyZW50VGFyZ2V0LnJlbGVhc2VQb2ludGVyQ2FwdHVyZShldmVudC5wb2ludGVySWQpO1xuICAgIGlmIChldmVudC50eXBlICE9PSAncG9pbnRlcmNhbmNlbCcpIHtcbiAgICAgIGNvbnN0IHNlbGVjdGlvblJlY3QgPSB7XG4gICAgICAgIGxlZnQ6IE1hdGgubWluKGRyYWcuc3RhcnRDbGllbnRYLCBldmVudC5jbGllbnRYKSxcbiAgICAgICAgcmlnaHQ6IE1hdGgubWF4KGRyYWcuc3RhcnRDbGllbnRYLCBldmVudC5jbGllbnRYKSxcbiAgICAgICAgdG9wOiBNYXRoLm1pbihkcmFnLnN0YXJ0Q2xpZW50WSwgZXZlbnQuY2xpZW50WSksXG4gICAgICAgIGJvdHRvbTogTWF0aC5tYXgoZHJhZy5zdGFydENsaWVudFksIGV2ZW50LmNsaWVudFkpLFxuICAgICAgfTtcbiAgICAgIGNvbnN0IGxhbmVSZWN0ID0gbGFuZXNSZWYuY3VycmVudD8uZ2V0Qm91bmRpbmdDbGllbnRSZWN0KCk7XG4gICAgICBjb25zdCBoaXRzID0gWy4uLihsYW5lc1JlZi5jdXJyZW50Py5xdWVyeVNlbGVjdG9yQWxsKCcuYWJvdXQtZWRpdG9yLWN1ZVtkYXRhLWN1ZS1pZF0nKSB8fCBbXSldXG4gICAgICAgIC5maWx0ZXIoKG5vZGUpID0+IHtcbiAgICAgICAgICBjb25zdCByZWN0ID0gbm9kZS5nZXRCb3VuZGluZ0NsaWVudFJlY3QoKTtcbiAgICAgICAgICBjb25zdCB2aXNpYmxlID0gbGFuZVJlY3QgJiYgcmVjdC5yaWdodCA+PSBsYW5lUmVjdC5sZWZ0ICYmIHJlY3QubGVmdCA8PSBsYW5lUmVjdC5yaWdodDtcbiAgICAgICAgICByZXR1cm4gdmlzaWJsZSAmJiByZWN0LnJpZ2h0ID49IHNlbGVjdGlvblJlY3QubGVmdCAmJiByZWN0LmxlZnQgPD0gc2VsZWN0aW9uUmVjdC5yaWdodFxuICAgICAgICAgICAgJiYgcmVjdC5ib3R0b20gPj0gc2VsZWN0aW9uUmVjdC50b3AgJiYgcmVjdC50b3AgPD0gc2VsZWN0aW9uUmVjdC5ib3R0b207XG4gICAgICAgIH0pXG4gICAgICAgIC5tYXAoKG5vZGUpID0+ICh7IHR5cGU6ICdjdWUnLCBzZWN0aW9uSWQ6IG5vZGUuZGF0YXNldC5zZWN0aW9uSWQsIGN1ZUlkOiBub2RlLmRhdGFzZXQuY3VlSWQsIGtleVBhcnQ6ICdmb2N1cycgfSkpO1xuICAgICAgaWYgKGhpdHMubGVuZ3RoKSB7XG4gICAgICAgIGxldCBuZXh0U2VsZWN0aW9uID0gZHJhZy5hZGRpdGl2ZSA/IHN0b3JlLmdldFNuYXBzaG90KCkuc2VsZWN0aW9uIDogaGl0c1swXTtcbiAgICAgICAgaGl0cy5zbGljZShkcmFnLmFkZGl0aXZlID8gMCA6IDEpLmZvckVhY2goKGhpdCkgPT4ge1xuICAgICAgICAgIG5leHRTZWxlY3Rpb24gPSB0b2dnbGVBYm91dE5hcnJhdGl2ZUN1ZVNlbGVjdGlvbihuZXh0U2VsZWN0aW9uLCBoaXQpO1xuICAgICAgICB9KTtcbiAgICAgICAgc3RvcmUuc2V0U2VsZWN0aW9uKG5leHRTZWxlY3Rpb24pO1xuICAgICAgfVxuICAgIH1cbiAgICB0aW1pbmdEcmFnUmVmLmN1cnJlbnQgPSBudWxsO1xuICAgIHNldE1hcnF1ZWUobnVsbCk7XG4gIH07XG5cbiAgcmV0dXJuIChcbiAgICA8ZGl2IGNsYXNzTmFtZT1cImFib3V0LWVkaXRvci10aW1lbGluZVwiPlxuICAgICAgPGRpdiBjbGFzc05hbWU9XCJhYm91dC1lZGl0b3ItbGFuZS1sYWJlbHNcIiBhcmlhLWhpZGRlbj1cInRydWVcIj5cbiAgICAgICAgPHNwYW4+U2VjdGlvbnM8L3NwYW4+PHNwYW4+Q2FtZXJhPC9zcGFuPjxzcGFuPldvcmxkPC9zcGFuPjxzcGFuPlRleHQ8L3NwYW4+PHNwYW4+SW50ZXJhY3Rpb248L3NwYW4+XG4gICAgICA8L2Rpdj5cbiAgICAgIDxkaXYgcmVmPXtsYW5lc1JlZn0gY2xhc3NOYW1lPVwiYWJvdXQtZWRpdG9yLWxhbmVzXCIgZGF0YS1zb2xvLXRyYWNrPXt0cmFuc3BvcnQuc29sb1RyYWNrIHx8ICcnfSBvbldoZWVsPXt6b29tVGltZWxpbmV9PlxuICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cImFib3V0LWVkaXRvci10aW1lbGluZS1jYW52YXNcIiBzdHlsZT17eyAnLS1hYm91dC1lZGl0b3ItcGxheWhlYWQnOiBwbGF5aGVhZCwgJy0tYWJvdXQtZWRpdG9yLXRpbWVsaW5lLXpvb20nOiBNYXRoLm1heCgxLCBOdW1iZXIodHJhbnNwb3J0Lnpvb20pIHx8IDEpIH19PlxuICAgICAgICAgIDxkaXYgY2xhc3NOYW1lPVwiYWJvdXQtZWRpdG9yLXBsYXloZWFkXCIgLz5cbiAgICAgICAgICB7bWFycXVlZSA/IDxkaXYgY2xhc3NOYW1lPVwiYWJvdXQtZWRpdG9yLW1hcnF1ZWVcIiBzdHlsZT17bWFycXVlZX0gYXJpYS1oaWRkZW49XCJ0cnVlXCIgLz4gOiBudWxsfVxuICAgICAgICAgIHtjYW1lcmFEcmFnUHJldmlldyA/IChcbiAgICAgICAgICA8ZGl2XG4gICAgICAgICAgICBjbGFzc05hbWU9e2BhYm91dC1lZGl0b3ItY2FtZXJhLWRyYWctZ2hvc3Qke2NhbWVyYURyYWdQcmV2aWV3LnZhbGlkID8gJycgOiAnIGlzLWludmFsaWQnfWB9XG4gICAgICAgICAgICBzdHlsZT17eyBsZWZ0OiBgJHtjYW1lcmFEcmFnUHJldmlldy5jb250ZW50WH1weGAgfX1cbiAgICAgICAgICAgIGFyaWEtaGlkZGVuPVwidHJ1ZVwiXG4gICAgICAgICAgPlxuICAgICAgICAgICAgPGkgLz5cbiAgICAgICAgICAgIDxzcGFuPntjYW1lcmFEcmFnUHJldmlldy52YWxpZCA/IGAke2NhbWVyYURyYWdQcmV2aWV3LnNlY3Rpb25MYWJlbH0gwrcgJHtmb3JtYXRDYW1lcmFQZXJjZW50KGNhbWVyYURyYWdQcmV2aWV3LmF0KX1gIDogY2FtZXJhRHJhZ1ByZXZpZXcucmVhc29ufTwvc3Bhbj5cbiAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICApIDogbnVsbH1cbiAgICAgICAgICB7WydzZWN0aW9uJywgJ2NhbWVyYScsICd3b3JsZCcsICd0ZXh0JywgJ2ludGVyYWN0aW9uJ10ubWFwKChsYW5lKSA9PiAoXG4gICAgICAgICAgPGRpdiBjbGFzc05hbWU9e2BhYm91dC1lZGl0b3ItbGFuZSBhYm91dC1lZGl0b3ItbGFuZS0tJHtsYW5lfWB9IGtleT17bGFuZX0+XG4gICAgICAgICAgICB7ZG9jdW1lbnQuc2VjdGlvbnMubWFwKChzZWN0aW9uLCBzZWN0aW9uSW5kZXgpID0+IHtcbiAgICAgICAgICAgICAgY29uc3QgY29tcGlsZWQgPSBjb21waWxlZFBsYW4/LnNlY3Rpb25zPy5bc2VjdGlvbkluZGV4XTtcbiAgICAgICAgICAgICAgY29uc3Qgc3RhcnRXVSA9IE1hdGgubWluKG1heFdVLCBjb21waWxlZD8uc3RhcnRXVSB8fCAwKTtcbiAgICAgICAgICAgICAgY29uc3QgbmV4dFN0YXJ0V1UgPSBNYXRoLm1pbihtYXhXVSwgY29tcGlsZWRQbGFuPy5zZWN0aW9ucz8uW3NlY3Rpb25JbmRleCArIDFdPy5zdGFydFdVID8/IG1heFdVKTtcbiAgICAgICAgICAgICAgY29uc3Qgc3BhbldVID0gTWF0aC5tYXgoMC4wMDEsIG5leHRTdGFydFdVIC0gc3RhcnRXVSk7XG4gICAgICAgICAgICAgIGNvbnN0IHdpZHRoID0gYCR7KHNwYW5XVSAvIG1heFdVKSAqIDEwMH0lYDtcbiAgICAgICAgICAgICAgY29uc3QgaW5TZWxlY3RlZFNlY3Rpb24gPSBzZWxlY3Rpb24uc2VjdGlvbklkID09PSBzZWN0aW9uLmlkO1xuICAgICAgICAgICAgICBjb25zdCBsb2NhbFBlcmNlbnQgPSAoYXQpID0+IE1hdGgubWluKDEwMCwgKE51bWJlcihhdCB8fCAwKSAqIChjb21waWxlZD8udHJhdmVsV1UgfHwgc3BhbldVKSAvIHNwYW5XVSkgKiAxMDApO1xuICAgICAgICAgICAgICBjb25zdCBsb2NhbFBvc2l0aW9uID0gKGF0KSA9PiBgJHtsb2NhbFBlcmNlbnQoYXQpfSVgO1xuICAgICAgICAgICAgICBjb25zdCBleHRlbmRlZExvY2FsUG9zaXRpb24gPSAoYXQpID0+IGAkeyhOdW1iZXIoYXQgfHwgMCkgKiAoY29tcGlsZWQ/LnRyYXZlbFdVIHx8IHNwYW5XVSkgLyBzcGFuV1UpICogMTAwfSVgO1xuICAgICAgICAgICAgICBjb25zdCBleHRlbmRlZExvY2FsV2lkdGggPSAoZnJvbSwgdG8pID0+IGAke01hdGgubWF4KDAuMzUsIChOdW1iZXIodG8pIC0gTnVtYmVyKGZyb20pKSAqIChjb21waWxlZD8udHJhdmVsV1UgfHwgc3BhbldVKSAvIHNwYW5XVSAqIDEwMCl9JWA7XG4gICAgICAgICAgICAgIGNvbnN0IHRleHRQb3NpdGlvbiA9IChhdCkgPT4gYCR7Y2xhbXAwMShOdW1iZXIoYXQgfHwgMCkpICogMTAwfSVgO1xuICAgICAgICAgICAgICBjb25zdCBzZWxlY3RBdCA9IChuZXh0U2VsZWN0aW9uLCBhdCA9IDApID0+IHtcbiAgICAgICAgICAgICAgICBzdG9yZS5zZXRTZWxlY3Rpb24oeyBzZWN0aW9uSWQ6IHNlY3Rpb24uaWQsIC4uLm5leHRTZWxlY3Rpb24gfSk7XG4gICAgICAgICAgICAgICAgc3RvcmUuc2V0VHJhbnNwb3J0KHtcbiAgICAgICAgICAgICAgICAgIG93bmVyOiAndGltZWxpbmUnLFxuICAgICAgICAgICAgICAgICAgcGxheWluZzogZmFsc2UsXG4gICAgICAgICAgICAgICAgICBzdG9yeVdVOiBzdGFydFdVICsgKE51bWJlcihhdCB8fCAwKSAqIChjb21waWxlZD8udHJhdmVsV1UgfHwgMCkpLFxuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgICBpZiAobGFuZSA9PT0gJ3NlY3Rpb24nKSB7XG4gICAgICAgICAgICAgICAgY29uc3QgaXNTZWxlY3RlZCA9IGluU2VsZWN0ZWRTZWN0aW9uICYmIHNlbGVjdGlvbi50eXBlID09PSAnc2VjdGlvbic7XG4gICAgICAgICAgICAgICAgY29uc3QgcmVzaXplRXh0ZW50ID0gc2VjdGlvblJlc2l6ZVByZXZpZXc/LnNlY3Rpb25JZCA9PT0gc2VjdGlvbi5pZFxuICAgICAgICAgICAgICAgICAgPyBzZWN0aW9uUmVzaXplUHJldmlldy5leHRlbnRcbiAgICAgICAgICAgICAgICAgIDogTnVtYmVyKHNlY3Rpb25bZ2V0QWJvdXROYXJyYXRpdmVFeHRlbnRGaWVsZChzbmFwc2hvdC5wcmV2aWV3UHJvZmlsZSldKTtcbiAgICAgICAgICAgICAgICByZXR1cm4gKFxuICAgICAgICAgICAgICAgICAgPGRpdlxuICAgICAgICAgICAgICAgICAgICBrZXk9e3NlY3Rpb24uaWR9XG4gICAgICAgICAgICAgICAgICAgIGNsYXNzTmFtZT17YGFib3V0LWVkaXRvci1zZWN0aW9uLWNsaXAke2lzU2VsZWN0ZWQgPyAnIGlzLXNlbGVjdGVkJyA6ICcnfSR7aW5TZWxlY3RlZFNlY3Rpb24gPyAnIGlzLWNvbnRleHQnIDogJyd9YH1cbiAgICAgICAgICAgICAgICAgICAgc3R5bGU9e3sgd2lkdGggfX1cbiAgICAgICAgICAgICAgICAgICAgdGl0bGU9e2Ake3NlY3Rpb24ubGFiZWx9IMK3ICR7Zm9ybWF0V1UoY29tcGlsZWQ/LnJlc29sdmVkRXh0ZW50V1UgfHwgc2VjdGlvbi5leHRlbnRXVSl9YH1cbiAgICAgICAgICAgICAgICAgID5cbiAgICAgICAgICAgICAgICAgICAgPGJ1dHRvbiB0eXBlPVwiYnV0dG9uXCIgYXJpYS1wcmVzc2VkPXtpc1NlbGVjdGVkfSBvbkNsaWNrPXsoKSA9PiBzZWxlY3RBdCh7IHR5cGU6ICdzZWN0aW9uJyB9KX0+XG4gICAgICAgICAgICAgICAgICAgICAgPHNwYW4+e1N0cmluZyhzZWN0aW9uSW5kZXggKyAxKS5wYWRTdGFydCgyLCAnMCcpfTwvc3Bhbj57c2VjdGlvbi5sYWJlbH1cbiAgICAgICAgICAgICAgICAgICAgPC9idXR0b24+XG4gICAgICAgICAgICAgICAgICAgIHtzZWN0aW9uUmVzaXplUHJldmlldz8uc2VjdGlvbklkID09PSBzZWN0aW9uLmlkID8gPG91dHB1dD57Zm9ybWF0V1UoTWF0aC5tYXgoMCwgcmVzaXplRXh0ZW50IC0gMSkpfSBzY3JvbGwgwrcge2Zvcm1hdFdVKHJlc2l6ZUV4dGVudCl9IHRvdGFsPC9vdXRwdXQ+IDogbnVsbH1cbiAgICAgICAgICAgICAgICAgICAgPGJ1dHRvblxuICAgICAgICAgICAgICAgICAgICAgIHR5cGU9XCJidXR0b25cIlxuICAgICAgICAgICAgICAgICAgICAgIGNsYXNzTmFtZT1cImFib3V0LWVkaXRvci1zZWN0aW9uLXJlc2l6ZVwiXG4gICAgICAgICAgICAgICAgICAgICAgZGlzYWJsZWQ9e3NlY3Rpb24ubG9ja2VkfVxuICAgICAgICAgICAgICAgICAgICAgIGFyaWEtbGFiZWw9e2BSZXNpemUgJHtzZWN0aW9uLmxhYmVsfWB9XG4gICAgICAgICAgICAgICAgICAgICAgdGl0bGU9e3NlY3Rpb24ubG9ja2VkID8gJ1VubG9jayB0aGlzIHByb3RlY3RlZCBTZWN0aW9uIHRvIHJlc2l6ZSBpdCcgOiBgRHJhZyB0byBjaGFuZ2UgJHtzbmFwc2hvdC5wcmV2aWV3UHJvZmlsZSA9PT0gJ21vYmlsZScgPyAnbW9iaWxlJyA6ICdkZXNrdG9wJ30gc2Nyb2xsIGxlbmd0aCDCtyBkb3VibGUtY2xpY2sgdG8gcmVzdG9yZSBzYXZlZCBsZW5ndGhgfVxuICAgICAgICAgICAgICAgICAgICAgIG9uRG91YmxlQ2xpY2s9eyhldmVudCkgPT4geyBldmVudC5wcmV2ZW50RGVmYXVsdCgpOyBldmVudC5zdG9wUHJvcGFnYXRpb24oKTsgcmVzZXRTZWN0aW9uRXh0ZW50KHNlY3Rpb24uaWQsIHNlY3Rpb25JbmRleCk7IH19XG4gICAgICAgICAgICAgICAgICAgICAgb25Qb2ludGVyRG93bj17KGV2ZW50KSA9PiBiZWdpblNlY3Rpb25SZXNpemUoZXZlbnQsIHsgc2VjdGlvbklkOiBzZWN0aW9uLmlkLCBzZWN0aW9uSW5kZXgsIHNlY3Rpb25MYWJlbDogc2VjdGlvbi5sYWJlbCwgbG9ja2VkOiBzZWN0aW9uLmxvY2tlZCB9KX1cbiAgICAgICAgICAgICAgICAgICAgICBvblBvaW50ZXJNb3ZlPXttb3ZlU2VjdGlvblJlc2l6ZX1cbiAgICAgICAgICAgICAgICAgICAgICBvblBvaW50ZXJVcD17ZW5kU2VjdGlvblJlc2l6ZX1cbiAgICAgICAgICAgICAgICAgICAgICBvblBvaW50ZXJDYW5jZWw9e2VuZFNlY3Rpb25SZXNpemV9XG4gICAgICAgICAgICAgICAgICAgIC8+XG4gICAgICAgICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgICAgICApO1xuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgIGlmIChsYW5lID09PSAnY2FtZXJhJykge1xuICAgICAgICAgICAgICAgIHJldHVybiAoXG4gICAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cImFib3V0LWVkaXRvci1jbGlwXCIga2V5PXtzZWN0aW9uLmlkfSBzdHlsZT17eyB3aWR0aCB9fT5cbiAgICAgICAgICAgICAgICAgICAgPGRpdiBjbGFzc05hbWU9XCJhYm91dC1lZGl0b3ItY2FtZXJhLXJhaWxcIiBhcmlhLWhpZGRlbj1cInRydWVcIj5cbiAgICAgICAgICAgICAgICAgICAgICB7c2VjdGlvbi5jYW1lcmEua2V5cy5zbGljZSgxKS5tYXAoKGtleSwga2V5SW5kZXgpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IGZyb21LZXkgPSBzZWN0aW9uLmNhbWVyYS5rZXlzW2tleUluZGV4XTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IGxlZnQgPSBsb2NhbFBlcmNlbnQoZnJvbUtleS5hdCk7XG4gICAgICAgICAgICAgICAgICAgICAgICBjb25zdCByaWdodCA9IGxvY2FsUGVyY2VudChrZXkuYXQpO1xuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIChcbiAgICAgICAgICAgICAgICAgICAgICAgICAgPHNwYW5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjbGFzc05hbWU9e2NhbWVyYVBvc2VDaGFuZ2VzKGZyb21LZXksIGtleSkgPyAnaXMtYXV0aG9yZWQtbW90aW9uJyA6ICdpcy1iYXNlLWRvbGx5J31cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBrZXk9e2Ake3NlY3Rpb24uaWR9OmNhbWVyYS1zcGFuOiR7a2V5SW5kZXh9YH1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBzdHlsZT17eyBsZWZ0OiBgJHtsZWZ0fSVgLCB3aWR0aDogYCR7TWF0aC5tYXgoMC41LCByaWdodCAtIGxlZnQpfSVgIH19XG4gICAgICAgICAgICAgICAgICAgICAgICAgIC8+XG4gICAgICAgICAgICAgICAgICAgICAgICApO1xuICAgICAgICAgICAgICAgICAgICAgIH0pfVxuICAgICAgICAgICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgICAgICAgICAge3NlY3Rpb24uY2FtZXJhLmtleXMubWFwKChrZXksIGtleUluZGV4KSA9PiB7XG4gICAgICAgICAgICAgICAgICAgICAgY29uc3QgdGltaW5nQm91bmRzID0gZ2V0QWJvdXROYXJyYXRpdmVDYW1lcmFLZXlUaW1pbmdCb3VuZHMoc2VjdGlvbi5jYW1lcmEua2V5cywga2V5SW5kZXgpO1xuICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IHRva2VuID0gYGNhbWVyYToke3NlY3Rpb24uaWR9OiR7a2V5SW5kZXh9YDtcbiAgICAgICAgICAgICAgICAgICAgICBjb25zdCBrZXlTZWxlY3Rpb24gPSB7IHR5cGU6ICdjYW1lcmEta2V5Jywgc2VjdGlvbklkOiBzZWN0aW9uLmlkLCBrZXlJbmRleCB9O1xuICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IGlzU2VsZWN0ZWQgPSBpblNlbGVjdGVkU2VjdGlvbiAmJiBzZWxlY3Rpb24udHlwZSA9PT0gJ2NhbWVyYS1rZXknICYmIHNlbGVjdGlvbi5rZXlJbmRleCA9PT0ga2V5SW5kZXg7XG4gICAgICAgICAgICAgICAgICAgICAgY29uc3QgcmVxdWlyZWQgPSB0aW1pbmdCb3VuZHMubG9ja2VkO1xuICAgICAgICAgICAgICAgICAgICAgIHJldHVybiAoXG4gICAgICAgICAgICAgICAgICAgICAgICA8YnV0dG9uXG4gICAgICAgICAgICAgICAgICAgICAgICAgIHR5cGU9XCJidXR0b25cIlxuICAgICAgICAgICAgICAgICAgICAgICAgICBrZXk9e3Rva2VufVxuICAgICAgICAgICAgICAgICAgICAgICAgICBjbGFzc05hbWU9e2BhYm91dC1lZGl0b3Ita2V5JHtyZXF1aXJlZCA/ICcgaXMtYm91bmRhcnknIDogJyBpcy1kcmFnZ2FibGUnfSR7aXNTZWxlY3RlZCA/ICcgaXMtc2VsZWN0ZWQnIDogJyd9JHtjYW1lcmFEcmFnUHJldmlldz8udG9rZW4gPT09IHRva2VuID8gJyBpcy1kcmFnLXNvdXJjZScgOiAnJ31gfVxuICAgICAgICAgICAgICAgICAgICAgICAgICBzdHlsZT17eyBsZWZ0OiBsb2NhbFBvc2l0aW9uKGtleS5hdCkgfX1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgdGl0bGU9e3JlcXVpcmVkXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgPyBgUHJvdGVjdGVkIENhbWVyYSBrZXkgYXQgJHtmb3JtYXRDYW1lcmFQZXJjZW50KGtleS5hdCl9IMK3IHNlbGVjdCB0byBpbnNwZWN0YFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIDogYENhbWVyYSBrZXkgYXQgJHtmb3JtYXRDYW1lcmFQZXJjZW50KGtleS5hdCl9IMK3IGRyYWcgYW55d2hlcmUgb24gdGhlIENhbWVyYSB0cmFja2B9XG4gICAgICAgICAgICAgICAgICAgICAgICAgIGFyaWEtbGFiZWw9e2Ake3JlcXVpcmVkID8gJ1Byb3RlY3RlZCAnIDogJyd9Q2FtZXJhIGtleSBhdCAke2Zvcm1hdENhbWVyYVBlcmNlbnQoa2V5LmF0KX0gdGhyb3VnaCAke3NlY3Rpb24ubGFiZWx9YH1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgYXJpYS1wcmVzc2VkPXtpc1NlbGVjdGVkfVxuICAgICAgICAgICAgICAgICAgICAgICAgICBvblBvaW50ZXJEb3duPXtyZXF1aXJlZCA/IHVuZGVmaW5lZCA6IChldmVudCkgPT4gYmVnaW5UaW1pbmdEcmFnKGV2ZW50LCB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdHlwZTogJ2NhbWVyYScsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdG9rZW4sXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgbG9ja2VkOiBmYWxzZSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBhdDoga2V5LmF0LFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHNlY3Rpb25JbmRleCxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBrZXlJbmRleCxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBzZWN0aW9uU3RhcnRXVTogc3RhcnRXVSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBzcGFuV1UsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdHJhdmVsV1U6IGNvbXBpbGVkPy50cmF2ZWxXVSB8fCBzcGFuV1UsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgc3RvcnlXVTogc3RhcnRXVSArIChOdW1iZXIoa2V5LmF0KSAqIChjb21waWxlZD8udHJhdmVsV1UgfHwgMCkpLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHNlbGVjdGlvbjoga2V5U2VsZWN0aW9uLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvYWxlc2NlS2V5OiBgdGltZWxpbmU6JHt0b2tlbn1gLFxuICAgICAgICAgICAgICAgICAgICAgICAgICB9KX1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgb25Qb2ludGVyTW92ZT17cmVxdWlyZWQgPyB1bmRlZmluZWQgOiBtb3ZlVGltaW5nRHJhZ31cbiAgICAgICAgICAgICAgICAgICAgICAgICAgb25Qb2ludGVyVXA9e3JlcXVpcmVkID8gdW5kZWZpbmVkIDogZW5kVGltaW5nRHJhZ31cbiAgICAgICAgICAgICAgICAgICAgICAgICAgb25Qb2ludGVyQ2FuY2VsPXtyZXF1aXJlZCA/IHVuZGVmaW5lZCA6IGVuZFRpbWluZ0RyYWd9XG4gICAgICAgICAgICAgICAgICAgICAgICAgIG9uQ2xpY2s9eygpID0+IGhhbmRsZVRpbWluZ0NsaWNrKHRva2VuLCAoKSA9PiBzZWxlY3RBdCh7IHR5cGU6ICdjYW1lcmEta2V5Jywga2V5SW5kZXggfSwga2V5LmF0KSl9XG4gICAgICAgICAgICAgICAgICAgICAgICAvPlxuICAgICAgICAgICAgICAgICAgICAgICk7XG4gICAgICAgICAgICAgICAgICAgIH0pfVxuICAgICAgICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgICAgICAgKTtcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICBpZiAobGFuZSA9PT0gJ3dvcmxkJykge1xuICAgICAgICAgICAgICAgIGNvbnN0IGlzU2VsZWN0ZWQgPSBpblNlbGVjdGVkU2VjdGlvbiAmJiBzZWxlY3Rpb24udHlwZSA9PT0gJ3dvcmxkJztcbiAgICAgICAgICAgICAgICBjb25zdCB0cmFuc2l0aW9uID0gc2VjdGlvbi53b3JsZC5tb2RlID09PSAnc2V0JyAmJiBzZWN0aW9uLndvcmxkLnRyYW5zaXRpb25Jbi50eXBlICE9PSAnY3V0J1xuICAgICAgICAgICAgICAgICAgPyBzZWN0aW9uLndvcmxkLnRyYW5zaXRpb25JblxuICAgICAgICAgICAgICAgICAgOiBudWxsO1xuICAgICAgICAgICAgICAgIHJldHVybiAoXG4gICAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzTmFtZT17YGFib3V0LWVkaXRvci1jbGlwJHtpc1NlbGVjdGVkID8gJyBpcy1zZWxlY3RlZCcgOiAnJ31gfSBrZXk9e3NlY3Rpb24uaWR9IHN0eWxlPXt7IHdpZHRoIH19PlxuICAgICAgICAgICAgICAgICAgICA8YnV0dG9uXG4gICAgICAgICAgICAgICAgICAgICAgdHlwZT1cImJ1dHRvblwiXG4gICAgICAgICAgICAgICAgICAgICAgY2xhc3NOYW1lPXtgYWJvdXQtZWRpdG9yLXdvcmxkLWNsaXAgJHtzZWN0aW9uLndvcmxkLm1vZGUgPT09ICdzZXQnID8gJ2hhcy13b3JsZCcgOiAnJ30ke2lzU2VsZWN0ZWQgPyAnIGlzLXNlbGVjdGVkJyA6ICcnfWB9XG4gICAgICAgICAgICAgICAgICAgICAgYXJpYS1wcmVzc2VkPXtpc1NlbGVjdGVkfVxuICAgICAgICAgICAgICAgICAgICAgIG9uQ2xpY2s9eygpID0+IHNlbGVjdEF0KHsgdHlwZTogJ3dvcmxkJyB9LCB0cmFuc2l0aW9uID8gdHJhbnNpdGlvbi5lbmQgOiAwKX1cbiAgICAgICAgICAgICAgICAgICAgPntzZWN0aW9uLndvcmxkLm1vZGUgPT09ICdzZXQnID8gc2VjdGlvbi53b3JsZC5zaGFwZUlkLnJlcGxhY2UoJy12MScsICcnKSA6ICdjb250aW51ZSd9PC9idXR0b24+XG4gICAgICAgICAgICAgICAgICAgIHt0cmFuc2l0aW9uID8gWydzdGFydCcsICdlbmQnXS5tYXAoKHBhcnQpID0+IChcbiAgICAgICAgICAgICAgICAgICAgICA8YnV0dG9uXG4gICAgICAgICAgICAgICAgICAgICAgICB0eXBlPVwiYnV0dG9uXCJcbiAgICAgICAgICAgICAgICAgICAgICAgIGtleT17cGFydH1cbiAgICAgICAgICAgICAgICAgICAgICAgIGNsYXNzTmFtZT17YGFib3V0LWVkaXRvci10aW1pbmcta2V5IGlzLXdvcmxkJHtpc1NlbGVjdGVkICYmIHNlbGVjdGlvbi5rZXlQYXJ0ID09PSBgdHJhbnNpdGlvbi0ke3BhcnR9YCA/ICcgaXMtc2VsZWN0ZWQnIDogJyd9YH1cbiAgICAgICAgICAgICAgICAgICAgICAgIHN0eWxlPXt7IGxlZnQ6IGV4dGVuZGVkTG9jYWxQb3NpdGlvbih0cmFuc2l0aW9uW3BhcnRdKSB9fVxuICAgICAgICAgICAgICAgICAgICAgICAgdGl0bGU9e2BXb3JsZCB0cmFuc2l0aW9uICR7cGFydH1gfVxuICAgICAgICAgICAgICAgICAgICAgICAgYXJpYS1sYWJlbD17YCR7c2VjdGlvbi5sYWJlbH0gV29ybGQgdHJhbnNpdGlvbiAke3BhcnR9YH1cbiAgICAgICAgICAgICAgICAgICAgICAgIG9uQ2xpY2s9eygpID0+IHNlbGVjdEF0KHsgdHlwZTogJ3dvcmxkJywga2V5UGFydDogYHRyYW5zaXRpb24tJHtwYXJ0fWAgfSwgdHJhbnNpdGlvbltwYXJ0XSl9XG4gICAgICAgICAgICAgICAgICAgICAgLz5cbiAgICAgICAgICAgICAgICAgICAgKSkgOiBudWxsfVxuICAgICAgICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgICAgICAgKTtcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICBpZiAobGFuZSA9PT0gJ3RleHQnKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIChcbiAgICAgICAgICAgICAgICAgIDxkaXZcbiAgICAgICAgICAgICAgICAgICAgY2xhc3NOYW1lPXtgYWJvdXQtZWRpdG9yLWNsaXAke3NlY3Rpb24udGV4dC5kaXNjaXBsaW5lUmV2ZWFsID8gJyBoYXMtZXh0ZW5kZWQtZGlzY2lwbGluZScgOiAnJ31gfVxuICAgICAgICAgICAgICAgICAgICBrZXk9e3NlY3Rpb24uaWR9XG4gICAgICAgICAgICAgICAgICAgIHN0eWxlPXt7IHdpZHRoIH19XG4gICAgICAgICAgICAgICAgICAgIG9uUG9pbnRlckRvd249e2JlZ2luTWFycXVlZX1cbiAgICAgICAgICAgICAgICAgICAgb25Qb2ludGVyTW92ZT17bW92ZU1hcnF1ZWV9XG4gICAgICAgICAgICAgICAgICAgIG9uUG9pbnRlclVwPXtlbmRNYXJxdWVlfVxuICAgICAgICAgICAgICAgICAgICBvblBvaW50ZXJDYW5jZWw9e2VuZE1hcnF1ZWV9XG4gICAgICAgICAgICAgICAgICA+XG4gICAgICAgICAgICAgICAgICAgIHsoc2VjdGlvbi50ZXh0LmN1ZXMgfHwgW10pLm1hcCgoY3VlKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgICAgY29uc3QgaXNTZWxlY3RlZCA9IHNlbGVjdGVkQ3VlTWVtYmVycy5zb21lKChtZW1iZXIpID0+IG1lbWJlci5zZWN0aW9uSWQgPT09IHNlY3Rpb24uaWQgJiYgbWVtYmVyLmN1ZUlkID09PSBjdWUuaWQpO1xuICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IGlzUHJpbWFyeSA9IHNlbGVjdGlvbi50eXBlID09PSAnY3VlJyAmJiBzZWxlY3Rpb24uc2VjdGlvbklkID09PSBzZWN0aW9uLmlkICYmIHNlbGVjdGlvbi5jdWVJZCA9PT0gY3VlLmlkO1xuICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IG1vdmVtZW50ID0gZ2V0QWJvdXROYXJyYXRpdmVDdWVNb3ZlbWVudChjdWUpO1xuICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IHRpbWluZ0JvdW5kcyA9IGdldEFib3V0TmFycmF0aXZlQ3VlVGltaW5nQm91bmRzKGN1ZSk7XG4gICAgICAgICAgICAgICAgICAgICAgY29uc3QgdG9rZW4gPSBgY3VlOiR7c2VjdGlvbi5pZH06JHtjdWUuaWR9YDtcbiAgICAgICAgICAgICAgICAgICAgICBjb25zdCBjdWVTZWxlY3Rpb24gPSB7IHR5cGU6ICdjdWUnLCBzZWN0aW9uSWQ6IHNlY3Rpb24uaWQsIGN1ZUlkOiBjdWUuaWQsIGtleVBhcnQ6ICdmb2N1cycgfTtcbiAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gKFxuICAgICAgICAgICAgICAgICAgICAgICAgPGJ1dHRvblxuICAgICAgICAgICAgICAgICAgICAgICAgICB0eXBlPVwiYnV0dG9uXCJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgY2xhc3NOYW1lPXtgYWJvdXQtZWRpdG9yLWN1ZSBpcy0ke21vdmVtZW50fSR7dGltaW5nQm91bmRzLm1pbiA9PT0gdGltaW5nQm91bmRzLm1heCA/ICcgaXMtYm91bmRhcnknIDogJyBpcy1kcmFnZ2FibGUnfSR7aXNTZWxlY3RlZCA/ICcgaXMtc2VsZWN0ZWQnIDogJyd9JHtpc1ByaW1hcnkgPyAnIGlzLXByaW1hcnktc2VsZWN0aW9uJyA6ICcnfWB9XG4gICAgICAgICAgICAgICAgICAgICAgICAgIGtleT17Y3VlLmlkfVxuICAgICAgICAgICAgICAgICAgICAgICAgICBkYXRhLXNlY3Rpb24taWQ9e3NlY3Rpb24uaWR9XG4gICAgICAgICAgICAgICAgICAgICAgICAgIGRhdGEtY3VlLWlkPXtjdWUuaWR9XG4gICAgICAgICAgICAgICAgICAgICAgICAgIHN0eWxlPXt7IGxlZnQ6IHRleHRQb3NpdGlvbihjdWUuaG9sZCkgfX1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgYXJpYS1sYWJlbD17YCR7bW92ZW1lbnQgPT09ICd2ZXJ0aWNhbCcgPyAnVmVydGljYWwnIDogJ1NwYXRpYWwnfSB0ZXh0IGF0ICR7TWF0aC5yb3VuZChjdWUuaG9sZCAqIDEwMCl9JSDCtyAke2N1ZS50ZXh0fWB9XG4gICAgICAgICAgICAgICAgICAgICAgICAgIGFyaWEtcHJlc3NlZD17aXNTZWxlY3RlZH1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgdGl0bGU9e2Ake21vdmVtZW50ID09PSAndmVydGljYWwnID8gJ1ZlcnRpY2FsJyA6ICdTcGF0aWFsJ30gdGl0bGUgwrcgZHJhZyB0byBtb3ZlIGl0OyBkdXJhdGlvbiBzdGF5cyBnbG9iYWwgwrcgJHtjdWUudGV4dH1gfVxuICAgICAgICAgICAgICAgICAgICAgICAgICBvblBvaW50ZXJEb3duPXsoZXZlbnQpID0+IGJlZ2luVGltaW5nRHJhZyhldmVudCwge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHR5cGU6ICdjdWUnLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRva2VuLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGxvY2tlZDogdGltaW5nQm91bmRzLm1pbiA9PT0gdGltaW5nQm91bmRzLm1heCxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBtaW46IHRpbWluZ0JvdW5kcy5taW4sXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgbWF4OiB0aW1pbmdCb3VuZHMubWF4LFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGF0OiBjdWUuaG9sZCxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBzZWN0aW9uSW5kZXgsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY3VlSWQ6IGN1ZS5pZCxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBzZWN0aW9uU3RhcnRXVTogc3RhcnRXVSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBzcGFuV1UsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdHJhdmVsV1U6IGNvbXBpbGVkPy50cmF2ZWxXVSB8fCBzcGFuV1UsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgc3RvcnlXVTogc3RhcnRXVSArIChOdW1iZXIoY3VlLmhvbGQpICogKGNvbXBpbGVkPy50cmF2ZWxXVSB8fCAwKSksXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgc2VsZWN0aW9uOiBjdWVTZWxlY3Rpb24sXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY29hbGVzY2VLZXk6IGB0aW1lbGluZToke3Rva2VufWAsXG4gICAgICAgICAgICAgICAgICAgICAgICAgIH0pfVxuICAgICAgICAgICAgICAgICAgICAgICAgICBvblBvaW50ZXJNb3ZlPXttb3ZlVGltaW5nRHJhZ31cbiAgICAgICAgICAgICAgICAgICAgICAgICAgb25Qb2ludGVyVXA9e2VuZFRpbWluZ0RyYWd9XG4gICAgICAgICAgICAgICAgICAgICAgICAgIG9uUG9pbnRlckNhbmNlbD17ZW5kVGltaW5nRHJhZ31cbiAgICAgICAgICAgICAgICAgICAgICAgICAgb25LZXlEb3duPXsoZXZlbnQpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoZXZlbnQuc2hpZnRLZXkgJiYgZXZlbnQuY29kZSA9PT0gJ1NwYWNlJykge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZXZlbnQucHJldmVudERlZmF1bHQoKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IG5leHRTZWxlY3Rpb24gPSB0b2dnbGVBYm91dE5hcnJhdGl2ZUN1ZVNlbGVjdGlvbihzdG9yZS5nZXRTbmFwc2hvdCgpLnNlbGVjdGlvbiwgY3VlU2VsZWN0aW9uKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHN0b3JlLnNldFNlbGVjdGlvbihuZXh0U2VsZWN0aW9uKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHN0b3JlLnNldFRyYW5zcG9ydCh7IG93bmVyOiAndGltZWxpbmUnLCBwbGF5aW5nOiBmYWxzZSwgc3RvcnlXVTogc3RhcnRXVSArIChOdW1iZXIoY3VlLmhvbGQpICogKGNvbXBpbGVkPy50cmF2ZWxXVSB8fCAwKSkgfSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgICB9fVxuICAgICAgICAgICAgICAgICAgICAgICAgICBvbkNsaWNrPXsoKSA9PiBoYW5kbGVUaW1pbmdDbGljayh0b2tlbiwgKCkgPT4ge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHN0b3JlLnNldFRyYW5zcG9ydCh7IG93bmVyOiAndGltZWxpbmUnLCBwbGF5aW5nOiBmYWxzZSwgc3RvcnlXVTogc3RhcnRXVSArIChOdW1iZXIoY3VlLmhvbGQpICogKGNvbXBpbGVkPy50cmF2ZWxXVSB8fCAwKSkgfSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgIH0pfVxuICAgICAgICAgICAgICAgICAgICAgICAgLz5cbiAgICAgICAgICAgICAgICAgICAgICApO1xuICAgICAgICAgICAgICAgICAgICB9KX1cbiAgICAgICAgICAgICAgICAgICAge3NlY3Rpb24udGV4dC5kaXNjaXBsaW5lUmV2ZWFsID8gKCgpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgICBjb25zdCByZXZlYWwgPSBzZWN0aW9uLnRleHQuZGlzY2lwbGluZVJldmVhbDtcbiAgICAgICAgICAgICAgICAgICAgICBjb25zdCBkdXJhdGlvbiA9IHJldmVhbC5lbmQgLSByZXZlYWwuc3RhcnQ7XG4gICAgICAgICAgICAgICAgICAgICAgY29uc3QgY2VudHJlID0gcmV2ZWFsLnN0YXJ0ICsgKGR1cmF0aW9uICogMC41KTtcbiAgICAgICAgICAgICAgICAgICAgICBjb25zdCBpc1NlbGVjdGVkID0gaW5TZWxlY3RlZFNlY3Rpb24gJiYgc2VsZWN0aW9uLnR5cGUgPT09ICdkaXNjaXBsaW5lLXJldmVhbCc7XG4gICAgICAgICAgICAgICAgICAgICAgY29uc3QgdG9rZW4gPSBgZGlzY2lwbGluZS1yZXZlYWw6JHtzZWN0aW9uLmlkfToke3JldmVhbC5pZH1gO1xuICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IHJldmVhbFNlbGVjdGlvbiA9IHsgdHlwZTogJ2Rpc2NpcGxpbmUtcmV2ZWFsJywgc2VjdGlvbklkOiBzZWN0aW9uLmlkIH07XG4gICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIChcbiAgICAgICAgICAgICAgICAgICAgICAgIDxidXR0b25cbiAgICAgICAgICAgICAgICAgICAgICAgICAgdHlwZT1cImJ1dHRvblwiXG4gICAgICAgICAgICAgICAgICAgICAgICAgIGNsYXNzTmFtZT17YGFib3V0LWVkaXRvci1kaXNjaXBsaW5lLXJldmVhbCBpcy1kcmFnZ2FibGUke2lzU2VsZWN0ZWQgPyAnIGlzLXNlbGVjdGVkJyA6ICcnfWB9XG4gICAgICAgICAgICAgICAgICAgICAgICAgIHN0eWxlPXt7IGxlZnQ6IGV4dGVuZGVkTG9jYWxQb3NpdGlvbihyZXZlYWwuc3RhcnQpLCB3aWR0aDogZXh0ZW5kZWRMb2NhbFdpZHRoKHJldmVhbC5zdGFydCwgcmV2ZWFsLmVuZCkgfX1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgYXJpYS1sYWJlbD17YERpc2NpcGxpbmUgcmV2ZWFsIGZyb20gJHtNYXRoLnJvdW5kKHJldmVhbC5zdGFydCAqIDEwMCl9JSB0byAke01hdGgucm91bmQocmV2ZWFsLmVuZCAqIDEwMCl9JWB9XG4gICAgICAgICAgICAgICAgICAgICAgICAgIGFyaWEtcHJlc3NlZD17aXNTZWxlY3RlZH1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgdGl0bGU9XCJEaXNjaXBsaW5lIHJldmVhbCDCtyBkcmFnIHRoZSBjb21wbGV0ZSBjbGlwIHRvIHJldGltZVwiXG4gICAgICAgICAgICAgICAgICAgICAgICAgIG9uUG9pbnRlckRvd249eyhldmVudCkgPT4gYmVnaW5UaW1pbmdEcmFnKGV2ZW50LCB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdHlwZTogJ2Rpc2NpcGxpbmUtcmV2ZWFsJyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0b2tlbixcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBsb2NrZWQ6IGZhbHNlLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIG1pbjogZHVyYXRpb24gKiAwLjUsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgbWF4OiBESVNDSVBMSU5FX1JFVkVBTF9NQVggLSAoZHVyYXRpb24gKiAwLjUpLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGF0OiBjZW50cmUsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgc2VjdGlvbkluZGV4LFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHNlY3Rpb25TdGFydFdVOiBzdGFydFdVLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHNwYW5XVSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0cmF2ZWxXVTogY29tcGlsZWQ/LnRyYXZlbFdVIHx8IHNwYW5XVSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBzdG9yeVdVOiBzdGFydFdVICsgKGNlbnRyZSAqIChjb21waWxlZD8udHJhdmVsV1UgfHwgMCkpLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHNlbGVjdGlvbjogcmV2ZWFsU2VsZWN0aW9uLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvYWxlc2NlS2V5OiBgdGltZWxpbmU6JHt0b2tlbn1gLFxuICAgICAgICAgICAgICAgICAgICAgICAgICB9KX1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgb25Qb2ludGVyTW92ZT17bW92ZVRpbWluZ0RyYWd9XG4gICAgICAgICAgICAgICAgICAgICAgICAgIG9uUG9pbnRlclVwPXtlbmRUaW1pbmdEcmFnfVxuICAgICAgICAgICAgICAgICAgICAgICAgICBvblBvaW50ZXJDYW5jZWw9e2VuZFRpbWluZ0RyYWd9XG4gICAgICAgICAgICAgICAgICAgICAgICAgIG9uQ2xpY2s9eygpID0+IGhhbmRsZVRpbWluZ0NsaWNrKHRva2VuLCAoKSA9PiBzZWxlY3RBdCh7IHR5cGU6ICdkaXNjaXBsaW5lLXJldmVhbCcgfSwgcmV2ZWFsLnN0YXJ0KSl9XG4gICAgICAgICAgICAgICAgICAgICAgICA+RGlzY2lwbGluZSByZXZlYWw8L2J1dHRvbj5cbiAgICAgICAgICAgICAgICAgICAgICApO1xuICAgICAgICAgICAgICAgICAgICB9KSgpIDogbnVsbH1cbiAgICAgICAgICAgICAgICAgICAgeyhzZWN0aW9uLnRleHQuYmxvY2tzIHx8IFtdKS5sZW5ndGggPyAoXG4gICAgICAgICAgICAgICAgICAgICAgPGJ1dHRvbiB0eXBlPVwiYnV0dG9uXCIgY2xhc3NOYW1lPXtgYWJvdXQtZWRpdG9yLWVkaXRvcmlhbC1jbGlwJHtpblNlbGVjdGVkU2VjdGlvbiAmJiBzZWxlY3Rpb24udHlwZSA9PT0gJ3NlY3Rpb24nID8gJyBpcy1zZWxlY3RlZCcgOiAnJ31gfSBvbkNsaWNrPXsoKSA9PiBzZWxlY3RBdCh7IHR5cGU6ICdzZWN0aW9uJyB9KX0+XG4gICAgICAgICAgICAgICAgICAgICAgICBWZXJ0aWNhbCDCtyB7c2VjdGlvbi50ZXh0LmJsb2Nrcy5sZW5ndGh9IGJsb2Nrc1xuICAgICAgICAgICAgICAgICAgICAgIDwvYnV0dG9uPlxuICAgICAgICAgICAgICAgICAgICApIDogbnVsbH1cbiAgICAgICAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgICAgICk7XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgY29uc3QgaXNTZWxlY3RlZCA9IGluU2VsZWN0ZWRTZWN0aW9uICYmIHNlbGVjdGlvbi50eXBlID09PSAnaW50ZXJhY3Rpb24nO1xuICAgICAgICAgICAgICBjb25zdCBhY3RpdmF0aW9uID0gc2VjdGlvbi5pbnRlcmFjdGlvbj8udHlwZSAhPT0gJ25vbmUnID8gc2VjdGlvbi5pbnRlcmFjdGlvbi5hY3RpdmF0aW9uU3RhcnQgOiBudWxsO1xuICAgICAgICAgICAgICByZXR1cm4gKFxuICAgICAgICAgICAgICAgIDxkaXYgY2xhc3NOYW1lPXtgYWJvdXQtZWRpdG9yLWNsaXAke2lzU2VsZWN0ZWQgPyAnIGlzLXNlbGVjdGVkJyA6ICcnfWB9IGtleT17c2VjdGlvbi5pZH0gc3R5bGU9e3sgd2lkdGggfX0+XG4gICAgICAgICAgICAgICAgICA8YnV0dG9uXG4gICAgICAgICAgICAgICAgICAgIHR5cGU9XCJidXR0b25cIlxuICAgICAgICAgICAgICAgICAgICBjbGFzc05hbWU9e2BhYm91dC1lZGl0b3ItaW50ZXJhY3Rpb24tY2xpcCAke3NlY3Rpb24uaW50ZXJhY3Rpb24/LnR5cGUgIT09ICdub25lJyA/ICdoYXMtaW50ZXJhY3Rpb24nIDogJyd9JHtpc1NlbGVjdGVkID8gJyBpcy1zZWxlY3RlZCcgOiAnJ31gfVxuICAgICAgICAgICAgICAgICAgICBhcmlhLXByZXNzZWQ9e2lzU2VsZWN0ZWR9XG4gICAgICAgICAgICAgICAgICAgIG9uQ2xpY2s9eygpID0+IHNlbGVjdEF0KHsgdHlwZTogJ2ludGVyYWN0aW9uJyB9LCBhY3RpdmF0aW9uIHx8IDApfVxuICAgICAgICAgICAgICAgICAgPntzZWN0aW9uLmludGVyYWN0aW9uPy50eXBlICE9PSAnbm9uZScgPyBzZWN0aW9uLmludGVyYWN0aW9uLnR5cGUgOiAnJ308L2J1dHRvbj5cbiAgICAgICAgICAgICAgICAgIHtOdW1iZXIuaXNGaW5pdGUoYWN0aXZhdGlvbikgPyAoXG4gICAgICAgICAgICAgICAgICAgIDxidXR0b25cbiAgICAgICAgICAgICAgICAgICAgICB0eXBlPVwiYnV0dG9uXCJcbiAgICAgICAgICAgICAgICAgICAgICBjbGFzc05hbWU9e2BhYm91dC1lZGl0b3ItdGltaW5nLWtleSBpcy1pbnRlcmFjdGlvbiR7aXNTZWxlY3RlZCAmJiBzZWxlY3Rpb24ua2V5UGFydCA9PT0gJ2FjdGl2YXRpb24nID8gJyBpcy1zZWxlY3RlZCcgOiAnJ31gfVxuICAgICAgICAgICAgICAgICAgICAgIHN0eWxlPXt7IGxlZnQ6IGxvY2FsUG9zaXRpb24oYWN0aXZhdGlvbikgfX1cbiAgICAgICAgICAgICAgICAgICAgICB0aXRsZT1cIkludGVyYWN0aW9uIGFjdGl2YXRpb25cIlxuICAgICAgICAgICAgICAgICAgICAgIGFyaWEtbGFiZWw9e2Ake3NlY3Rpb24ubGFiZWx9IGludGVyYWN0aW9uIGFjdGl2YXRpb24ga2V5ZnJhbWVgfVxuICAgICAgICAgICAgICAgICAgICAgIG9uQ2xpY2s9eygpID0+IHNlbGVjdEF0KHsgdHlwZTogJ2ludGVyYWN0aW9uJywga2V5UGFydDogJ2FjdGl2YXRpb24nIH0sIGFjdGl2YXRpb24pfVxuICAgICAgICAgICAgICAgICAgICAvPlxuICAgICAgICAgICAgICAgICAgKSA6IG51bGx9XG4gICAgICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgICAgICk7XG4gICAgICAgICAgICB9KX1cbiAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICApKX1cbiAgICAgICAgPC9kaXY+XG4gICAgICA8L2Rpdj5cbiAgICA8L2Rpdj5cbiAgKTtcbn1cblxuZnVuY3Rpb24gU2VxdWVuY2VJbnNwZWN0b3IoeyBzdG9yZSwgc25hcHNob3QgfSkge1xuICBjb25zdCBjb21taXRHbG9iYWwgPSAoZ3JvdXAsIGtleSwgdmFsdWUpID0+IHN0b3JlLmNvbW1pdChgQ2hhbmdlICR7a2V5fWAsIChkcmFmdCkgPT4ge1xuICAgIGlmIChncm91cCA9PT0gJ3NlcXVlbmNlJykgZHJhZnQuZ2xvYmFsc1trZXldID0gdmFsdWU7XG4gICAgZWxzZSB7XG4gICAgICBjb25zdCB0YXJnZXRLZXkgPSBncm91cCA9PT0gJ21hdGVyaWFsJyA/ICdwb2ludE1hdGVyaWFsJyA6IGdyb3VwO1xuICAgICAgZHJhZnQuZ2xvYmFsc1t0YXJnZXRLZXldW2tleV0gPSB2YWx1ZTtcbiAgICB9XG4gIH0sIHsgY29hbGVzY2VLZXk6IGBnbG9iYWw6JHtncm91cH06JHtrZXl9YCB9KTtcbiAgcmV0dXJuIChcbiAgICA8PlxuICAgICAgPGhlYWRlcj48c3Bhbj5TZXF1ZW5jZTwvc3Bhbj48c3Ryb25nPkdsb2JhbCBjb250cm9sczwvc3Ryb25nPjwvaGVhZGVyPlxuICAgICAge0FCT1VUX05BUlJBVElWRV9HTE9CQUxfQ09OVFJPTFMubWFwKChncm91cCkgPT4gKFxuICAgICAgICA8ZGV0YWlscyBvcGVuIGtleT17Z3JvdXAuaWR9PlxuICAgICAgICAgIDxzdW1tYXJ5Pntncm91cC5sYWJlbH08L3N1bW1hcnk+XG4gICAgICAgICAge2dyb3VwLmlkID09PSAndGV4dE1vdGlvbicgPyA8cCBjbGFzc05hbWU9XCJhYm91dC1lZGl0b3ItaGVscFwiPkV2ZXJ5IHRpdGxlIGZvbGxvd3MgdGhpcyBwYXRoIGNvbnRpbnVvdXNseS4gTmVnYXRpdmUgWSBpcyBoaWdoZXIsIHBvc2l0aXZlIFkgaXMgbG93ZXIuIFRoZSBvcGVuZXIgc3RhcnRzIHNoYXJwIGF0IGl0cyBvd24gWSBwb3NpdGlvbjsgQ2xlYXIgZnJvbSBhbmQgQ2xlYXIgdW50aWwgc2V0IHRoZSBzaGFycCB3aW5kb3cgZm9yIGxhdGVyIHRpdGxlcy48L3A+IDogbnVsbH1cbiAgICAgICAgICB7Z3JvdXAuaWQgPT09ICdzd2FybVR1cmJ1bGVuY2UnID8gPHAgY2xhc3NOYW1lPVwiYWJvdXQtZWRpdG9yLWhlbHBcIj5PbmUgYW1iaWVudCBtb3Rpb24gcHJvZmlsZSBkcml2ZXMgYm90aCB0aGUgY2x1c3RlciBhbmQgdHVyYnVsZW50IGZpZWxkLiBFYWNoIFdvcmxkIG9ubHkgc2NhbGVzIGl0cyBzdHJlbmd0aCwgc28gdGhlIG1vdGlvbiBzdGF5cyBjb250aW51b3VzIHdoaWxlIFNoYXBlcyBjaGFuZ2UuPC9wPiA6IG51bGx9XG4gICAgICAgICAge2dyb3VwLmNvbnRyb2xzLm1hcCgoY29udHJvbCkgPT4ge1xuICAgICAgICAgICAgY29uc3QgdGFyZ2V0ID0gZ3JvdXAuaWQgPT09ICdzZXF1ZW5jZSdcbiAgICAgICAgICAgICAgPyBzbmFwc2hvdC5kb2N1bWVudC5nbG9iYWxzXG4gICAgICAgICAgICAgIDogc25hcHNob3QuZG9jdW1lbnQuZ2xvYmFsc1tncm91cC5pZCA9PT0gJ21hdGVyaWFsJyA/ICdwb2ludE1hdGVyaWFsJyA6IGdyb3VwLmlkXTtcbiAgICAgICAgICAgIHJldHVybiAoXG4gICAgICAgICAgICAgIDxOdW1iZXJQcm9wZXJ0eVxuICAgICAgICAgICAgICAgIGtleT17Y29udHJvbC5pZH1cbiAgICAgICAgICAgICAgICBsYWJlbD17Y29udHJvbC5sYWJlbH1cbiAgICAgICAgICAgICAgICB2YWx1ZT17dGFyZ2V0W2NvbnRyb2wuaWRdfVxuICAgICAgICAgICAgICAgIG1pbj17Y29udHJvbC5taW59XG4gICAgICAgICAgICAgICAgbWF4PXtjb250cm9sLm1heH1cbiAgICAgICAgICAgICAgICBzdGVwPXtjb250cm9sLnN0ZXB9XG4gICAgICAgICAgICAgICAgdW5pdD17Y29udHJvbC51bml0fVxuICAgICAgICAgICAgICAgIG9uQ2hhbmdlPXsodmFsdWUpID0+IGNvbW1pdEdsb2JhbChncm91cC5pZCwgY29udHJvbC5pZCwgdmFsdWUpfVxuICAgICAgICAgICAgICAvPlxuICAgICAgICAgICAgKTtcbiAgICAgICAgICB9KX1cbiAgICAgICAgPC9kZXRhaWxzPlxuICAgICAgKSl9XG4gICAgPC8+XG4gICk7XG59XG5cbmZ1bmN0aW9uIFNlY3Rpb25JbnNwZWN0b3IoeyBzdG9yZSwgc25hcHNob3QsIHNlY3Rpb24gfSkge1xuICBjb25zdCBzZWN0aW9uSW5kZXggPSBnZXRTZWN0aW9uSW5kZXgoc25hcHNob3QuZG9jdW1lbnQsIHNlY3Rpb24uaWQpO1xuICBjb25zdCBjb21waWxlZFNlY3Rpb24gPSBzbmFwc2hvdC5jb21waWxlZFBsYW4/LnNlY3Rpb25zPy5bc2VjdGlvbkluZGV4XTtcbiAgY29uc3QgYWN0aXZlRXh0ZW50RmllbGQgPSBzbmFwc2hvdC5wcmV2aWV3UHJvZmlsZSA9PT0gJ21vYmlsZScgPyAnbW9iaWxlRXh0ZW50V1UnIDogJ2V4dGVudFdVJztcbiAgY29uc3QgYWN0aXZlRXh0ZW50ID0gTnVtYmVyKHNlY3Rpb25bYWN0aXZlRXh0ZW50RmllbGRdKTtcbiAgY29uc3QgcmVzb2x2ZWRFeHRlbnQgPSBOdW1iZXIoY29tcGlsZWRTZWN0aW9uPy5yZXNvbHZlZEV4dGVudFdVID8/IGFjdGl2ZUV4dGVudCk7XG4gIGNvbnN0IGNvbnRlbnRNaW5pbXVtQWN0aXZlID0gcmVzb2x2ZWRFeHRlbnQgPiBhY3RpdmVFeHRlbnQgKyAwLjAwMTtcbiAgY29uc3QgYmFzZWxpbmVTZWN0aW9uID0gc25hcHNob3QuYmFzZWxpbmVEb2N1bWVudC5zZWN0aW9ucy5maW5kKChpdGVtKSA9PiBpdGVtLmlkID09PSBzZWN0aW9uLmlkKTtcbiAgY29uc3QgdXBkYXRlID0gKGxhYmVsLCBtdXRhdGUsIGNvYWxlc2NlS2V5ID0gbnVsbCkgPT4gc3RvcmUuY29tbWl0KGxhYmVsLCAoZHJhZnQpID0+IHtcbiAgICBtdXRhdGUoZHJhZnQuc2VjdGlvbnNbc2VjdGlvbkluZGV4XSk7XG4gIH0sIHsgY29hbGVzY2VLZXksIHNlbGVjdGlvbjogc25hcHNob3Quc2VsZWN0aW9uIH0pO1xuICBjb25zdCBtb3ZlID0gKGRpcmVjdGlvbikgPT4gc3RvcmUuY29tbWl0KCdSZW9yZGVyIFNlY3Rpb24nLCAoZHJhZnQpID0+IHtcbiAgICBjb25zdCB0b0luZGV4ID0gc2VjdGlvbkluZGV4ICsgZGlyZWN0aW9uO1xuICAgIGlmICh0b0luZGV4IDwgMCB8fCB0b0luZGV4ID49IGRyYWZ0LnNlY3Rpb25zLmxlbmd0aCkgcmV0dXJuO1xuICAgIGNvbnN0IFttb3ZlZF0gPSBkcmFmdC5zZWN0aW9ucy5zcGxpY2Uoc2VjdGlvbkluZGV4LCAxKTtcbiAgICBkcmFmdC5zZWN0aW9ucy5zcGxpY2UodG9JbmRleCwgMCwgbW92ZWQpO1xuICAgIHJlcGxhY2VEcmFmdERvY3VtZW50KGRyYWZ0LCBzdGl0Y2hBYm91dE5hcnJhdGl2ZUNhbWVyYUJvdW5kYXJpZXMoZHJhZnQpKTtcbiAgfSwgeyBzZWxlY3Rpb246IHsgdHlwZTogJ3NlY3Rpb24nLCBzZWN0aW9uSWQ6IHNlY3Rpb24uaWQgfSB9KTtcbiAgY29uc3QgZHVwbGljYXRlID0gKCkgPT4ge1xuICAgIGNvbnN0IHJlc3VsdCA9IGR1cGxpY2F0ZUFib3V0TmFycmF0aXZlU2VjdGlvbih7IGRvY3VtZW50OiBzbmFwc2hvdC5kb2N1bWVudCwgc2VjdGlvbklkOiBzZWN0aW9uLmlkIH0pO1xuICAgIGlmICghcmVzdWx0LnZhbGlkKSB7XG4gICAgICBzdG9yZS5zZXRTYXZlU3RhdGUoeyBtZXNzYWdlOiByZXN1bHQucmVhc29uIHx8ICdUaGlzIFNlY3Rpb24gY2Fubm90IGJlIGR1cGxpY2F0ZWQuJyB9KTtcbiAgICAgIHJldHVybjtcbiAgICB9XG4gICAgc3RvcmUuY29tbWl0KCdEdXBsaWNhdGUgU2VjdGlvbicsIChkcmFmdCkgPT4gcmVwbGFjZURyYWZ0RG9jdW1lbnQoZHJhZnQsIHJlc3VsdC5kb2N1bWVudCksIHtcbiAgICAgIHNlbGVjdGlvbjogcmVzdWx0LnNlbGVjdGlvbixcbiAgICB9KTtcbiAgfTtcblxuICByZXR1cm4gKFxuICAgIDw+XG4gICAgICA8aGVhZGVyPjxzcGFuPlNlY3Rpb24ge1N0cmluZyhzZWN0aW9uSW5kZXggKyAxKS5wYWRTdGFydCgyLCAnMCcpfTwvc3Bhbj48c3Ryb25nPntzZWN0aW9uLmxhYmVsfTwvc3Ryb25nPjwvaGVhZGVyPlxuICAgICAge3NlY3Rpb24ubG9ja2VkID8gPGRpdiBjbGFzc05hbWU9XCJhYm91dC1lZGl0b3ItbG9ja1wiPjxMb2NrS2V5aG9sZSBhcmlhLWhpZGRlbj1cInRydWVcIiAvPjxzcGFuPlRoaXMgcHJvdGVjdGVkIFNlY3Rpb24gY2Fubm90IGJlIHJlb3JkZXJlZCBvciBoYXZlIGl0cyBXb3JsZCByZXBsYWNlZCBhY2NpZGVudGFsbHkuPC9zcGFuPjxidXR0b24gdHlwZT1cImJ1dHRvblwiIG9uQ2xpY2s9eygpID0+IHVwZGF0ZSgnVW5sb2NrIHByb3RlY3RlZCBTZWN0aW9uJywgKGRyYWZ0KSA9PiB7IGRyYWZ0LmxvY2tlZCA9IGZhbHNlOyB9KX0+VW5sb2NrIGFkdmFuY2VkPC9idXR0b24+PC9kaXY+IDogbnVsbH1cbiAgICAgIDxkaXYgY2xhc3NOYW1lPVwiYWJvdXQtZWRpdG9yLWlubGluZS1hY3Rpb25zXCI+XG4gICAgICAgIDxidXR0b24gdHlwZT1cImJ1dHRvblwiIGRpc2FibGVkPXtzZWN0aW9uLmxvY2tlZCB8fCBzZWN0aW9uSW5kZXggPT09IDB9IG9uQ2xpY2s9eygpID0+IG1vdmUoLTEpfT5Nb3ZlIGVhcmxpZXI8L2J1dHRvbj5cbiAgICAgICAgPGJ1dHRvbiB0eXBlPVwiYnV0dG9uXCIgZGlzYWJsZWQ9e3NlY3Rpb24ubG9ja2VkIHx8IHNlY3Rpb25JbmRleCA9PT0gc25hcHNob3QuZG9jdW1lbnQuc2VjdGlvbnMubGVuZ3RoIC0gMX0gb25DbGljaz17KCkgPT4gbW92ZSgxKX0+TW92ZSBsYXRlcjwvYnV0dG9uPlxuICAgICAgICA8YnV0dG9uIHR5cGU9XCJidXR0b25cIiBkaXNhYmxlZD17c2VjdGlvbi5sb2NrZWQgfHwgc2VjdGlvbi50eXBlID09PSAnZmluYWxlJ30gb25DbGljaz17ZHVwbGljYXRlfT5EdXBsaWNhdGU8L2J1dHRvbj5cbiAgICAgIDwvZGl2PlxuICAgICAgPFByb3BlcnR5IGxhYmVsPVwiU2VjdGlvbiBuYW1lXCI+PGlucHV0IHZhbHVlPXtzZWN0aW9uLmxhYmVsfSBvbkNoYW5nZT17KGV2ZW50KSA9PiB1cGRhdGUoJ1JlbmFtZSBTZWN0aW9uJywgKGRyYWZ0KSA9PiB7IGRyYWZ0LmxhYmVsID0gZXZlbnQudGFyZ2V0LnZhbHVlOyB9LCBgc2VjdGlvbjoke3NlY3Rpb24uaWR9OmxhYmVsYCl9IC8+PC9Qcm9wZXJ0eT5cbiAgICAgIDxQcm9wZXJ0eSBsYWJlbD1cIlN0YWJsZSBJRFwiPjxpbnB1dCB2YWx1ZT17c2VjdGlvbi5pZH0gcmVhZE9ubHkgLz48c21hbGw+UmVmZXJlbmNlcyB0aGlzIFNlY3Rpb24gd2l0aG91dCB0eWluZyBpdCB0byBpdHMgY3VycmVudCBtZWFuaW5nLjwvc21hbGw+PC9Qcm9wZXJ0eT5cbiAgICAgIDxQcm9wZXJ0eSBsYWJlbD1cIlR5cGVcIj5cbiAgICAgICAgPHNlbGVjdCB2YWx1ZT17c2VjdGlvbi50eXBlfSBkaXNhYmxlZD17c2VjdGlvbi50eXBlID09PSAnZmluYWxlJ30gb25DaGFuZ2U9eyhldmVudCkgPT4gdXBkYXRlKCdDaGFuZ2UgU2VjdGlvbiB0eXBlJywgKGRyYWZ0KSA9PiB7IGRyYWZ0LnR5cGUgPSBldmVudC50YXJnZXQudmFsdWU7IH0pfT5cbiAgICAgICAgICA8b3B0aW9uIHZhbHVlPVwic3BhdGlhbFwiPlNwYXRpYWw8L29wdGlvbj48b3B0aW9uIHZhbHVlPVwiZWRpdG9yaWFsXCI+RWRpdG9yaWFsPC9vcHRpb24+PG9wdGlvbiB2YWx1ZT1cImZpbmFsZVwiPkZpbmFsZTwvb3B0aW9uPlxuICAgICAgICA8L3NlbGVjdD5cbiAgICAgIDwvUHJvcGVydHk+XG4gICAgICA8ZGV0YWlscyBvcGVuPlxuICAgICAgICA8c3VtbWFyeT5TZWN0aW9uIHRpbWluZzwvc3VtbWFyeT5cbiAgICAgICAgPFByb3BlcnR5IGxhYmVsPVwiU2Nyb2xsIHRyYXZlbFwiPjxvdXRwdXQgY2xhc3NOYW1lPVwiYWJvdXQtZWRpdG9yLXJlYWRvdXRcIj57Zm9ybWF0V1UoTWF0aC5tYXgoMCwgYWN0aXZlRXh0ZW50IC0gMSkpfTwvb3V0cHV0PjwvUHJvcGVydHk+XG4gICAgICAgIDxQcm9wZXJ0eSBsYWJlbD1cIlRvdGFsIGhlaWdodFwiPjxvdXRwdXQgY2xhc3NOYW1lPVwiYWJvdXQtZWRpdG9yLXJlYWRvdXRcIj57Zm9ybWF0V1UoYWN0aXZlRXh0ZW50KX08L291dHB1dD48L1Byb3BlcnR5PlxuICAgICAgICA8TnVtYmVyUHJvcGVydHkgbGFiZWw9XCJEZXNrdG9wIGxlbmd0aFwiIHZhbHVlPXtzZWN0aW9uLmV4dGVudFdVfSBtaW49ezF9IG1heD17OH0gc3RlcD17MC4wNX0gdW5pdD1cIldVXCIgb25DaGFuZ2U9eyh2YWx1ZSkgPT4gdXBkYXRlKCdDaGFuZ2UgZGVza3RvcCBTZWN0aW9uIGxlbmd0aCcsIChkcmFmdCkgPT4geyBkcmFmdC5leHRlbnRXVSA9IHZhbHVlOyB9LCBgc2VjdGlvbjoke3NlY3Rpb24uaWR9OmV4dGVudGApfSAvPlxuICAgICAgICA8TnVtYmVyUHJvcGVydHkgbGFiZWw9XCJNb2JpbGUgbGVuZ3RoXCIgdmFsdWU9e3NlY3Rpb24ubW9iaWxlRXh0ZW50V1V9IG1pbj17MX0gbWF4PXs4fSBzdGVwPXswLjA1fSB1bml0PVwiV1VcIiBvbkNoYW5nZT17KHZhbHVlKSA9PiB1cGRhdGUoJ0NoYW5nZSBtb2JpbGUgU2VjdGlvbiBsZW5ndGgnLCAoZHJhZnQpID0+IHsgZHJhZnQubW9iaWxlRXh0ZW50V1UgPSB2YWx1ZTsgfSwgYHNlY3Rpb246JHtzZWN0aW9uLmlkfTptb2JpbGVgKX0gLz5cbiAgICAgICAgPFByb3BlcnR5IGxhYmVsPVwiUmVzb2x2ZWQgaGVpZ2h0XCI+PG91dHB1dCBjbGFzc05hbWU9XCJhYm91dC1lZGl0b3ItcmVhZG91dFwiPntmb3JtYXRXVShyZXNvbHZlZEV4dGVudCl9PC9vdXRwdXQ+PC9Qcm9wZXJ0eT5cbiAgICAgICAge2NvbnRlbnRNaW5pbXVtQWN0aXZlID8gPHAgY2xhc3NOYW1lPVwiYWJvdXQtZWRpdG9yLXRpbWluZy13YXJuaW5nXCI+Q29udGVudCBtaW5pbXVtIGluIGVmZmVjdC4gVGhlIHJlbmRlcmVkIGNvcHkgbmVlZHMge2Zvcm1hdFdVKHJlc29sdmVkRXh0ZW50KX0gaW4gdGhpcyBwcm9maWxlLjwvcD4gOiBudWxsfVxuICAgICAgICA8YnV0dG9uXG4gICAgICAgICAgdHlwZT1cImJ1dHRvblwiXG4gICAgICAgICAgY2xhc3NOYW1lPVwiYWJvdXQtZWRpdG9yLXdpZGUtYWN0aW9uXCJcbiAgICAgICAgICBkaXNhYmxlZD17IWJhc2VsaW5lU2VjdGlvbiB8fCBiYXNlbGluZVNlY3Rpb25bYWN0aXZlRXh0ZW50RmllbGRdID09PSBzZWN0aW9uW2FjdGl2ZUV4dGVudEZpZWxkXX1cbiAgICAgICAgICBvbkNsaWNrPXsoKSA9PiB1cGRhdGUoJ1Jlc3RvcmUgc2F2ZWQgU2VjdGlvbiBsZW5ndGgnLCAoZHJhZnQpID0+IHsgZHJhZnRbYWN0aXZlRXh0ZW50RmllbGRdID0gYmFzZWxpbmVTZWN0aW9uW2FjdGl2ZUV4dGVudEZpZWxkXTsgfSl9XG4gICAgICAgID5SZXNldCB7c25hcHNob3QucHJldmlld1Byb2ZpbGUgPT09ICdtb2JpbGUnID8gJ21vYmlsZScgOiAnZGVza3RvcCd9IGxlbmd0aDwvYnV0dG9uPlxuICAgICAgPC9kZXRhaWxzPlxuICAgICAge3NlY3Rpb24udHlwZSA9PT0gJ2VkaXRvcmlhbCcgPyA8RWRpdG9yaWFsQmxvY2tzIHN0b3JlPXtzdG9yZX0gc25hcHNob3Q9e3NuYXBzaG90fSBzZWN0aW9uPXtzZWN0aW9ufSAvPiA6IG51bGx9XG4gICAgICB7c2VjdGlvbi50eXBlICE9PSAnZWRpdG9yaWFsJyA/IChcbiAgICAgICAgPGJ1dHRvblxuICAgICAgICAgIHR5cGU9XCJidXR0b25cIlxuICAgICAgICAgIGNsYXNzTmFtZT1cImFib3V0LWVkaXRvci13aWRlLWFjdGlvblwiXG4gICAgICAgICAgb25DbGljaz17KCkgPT4ge1xuICAgICAgICAgICAgY29uc3QgbG9jYWwgPSBnZXRMb2NhbFByb2dyZXNzKHNuYXBzaG90LmNvbXBpbGVkUGxhbiwgc2VjdGlvbiwgc25hcHNob3QudHJhbnNwb3J0LnN0b3J5V1UpO1xuICAgICAgICAgICAgY29uc3QgaWQgPSBuZXh0SWQoc25hcHNob3QuZG9jdW1lbnQsIGAke3NlY3Rpb24uaWR9LXN0YXRlbWVudGApO1xuICAgICAgICAgICAgY29uc3QgZm9jdXMgPSBNYXRoLm1pbigwLjkyLCBNYXRoLm1heCgwLjA4LCBzbmFwQWJvdXROYXJyYXRpdmVUaW1lbGluZVZhbHVlKGxvY2FsKSkpO1xuICAgICAgICAgICAgdXBkYXRlKCdBZGQgdGV4dCBDdWUnLCAoZHJhZnQpID0+IHtcbiAgICAgICAgICAgICAgZHJhZnQudGV4dC5jdWVzIHx8PSBbXTtcbiAgICAgICAgICAgICAgZHJhZnQudGV4dC5jdWVzLnB1c2goeyBpZCwgdGV4dDogJ05ldyB0cmF2ZWxsaW5nIHN0YXRlbWVudCcsIGVudGVyOiBmb2N1cyAtIDAuMDgsIGhvbGQ6IGZvY3VzLCBleGl0OiBmb2N1cyArIDAuMDgsIHByZXNldDogJ3RyYXZlbGxpbmctdGl0bGUtdjEnLCBtb3Rpb246IHsgbW9kZTogJ3NwYXRpYWwnIH0gfSk7XG4gICAgICAgICAgICAgIGRyYWZ0LnRleHQuY3Vlcy5zb3J0KChhLCBiKSA9PiBhLmhvbGQgLSBiLmhvbGQpO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICBzdG9yZS5zZXRTZWxlY3Rpb24oeyB0eXBlOiAnY3VlJywgc2VjdGlvbklkOiBzZWN0aW9uLmlkLCBjdWVJZDogaWQsIGtleVBhcnQ6ICdmb2N1cycgfSk7XG4gICAgICAgICAgfX1cbiAgICAgICAgPkFkZCB0ZXh0IGN1ZSBhdCBwbGF5aGVhZDwvYnV0dG9uPlxuICAgICAgKSA6IG51bGx9XG4gICAgPC8+XG4gICk7XG59XG5cbmZ1bmN0aW9uIEVkaXRvcmlhbEJsb2Nrcyh7IHN0b3JlLCBzbmFwc2hvdCwgc2VjdGlvbiB9KSB7XG4gIGNvbnN0IHNlY3Rpb25JbmRleCA9IGdldFNlY3Rpb25JbmRleChzbmFwc2hvdC5kb2N1bWVudCwgc2VjdGlvbi5pZCk7XG4gIGNvbnN0IHVwZGF0ZUJsb2NrID0gKGJsb2NrSW5kZXgsIGZpZWxkLCB2YWx1ZSkgPT4gc3RvcmUuY29tbWl0KCdFZGl0IGVkaXRvcmlhbCBjb3B5JywgKGRyYWZ0KSA9PiB7XG4gICAgZHJhZnQuc2VjdGlvbnNbc2VjdGlvbkluZGV4XS50ZXh0LmJsb2Nrc1tibG9ja0luZGV4XVtmaWVsZF0gPSB2YWx1ZTtcbiAgfSwgeyBjb2FsZXNjZUtleTogYGJsb2NrOiR7c2VjdGlvbi5pZH06JHtibG9ja0luZGV4fToke2ZpZWxkfWAsIHNlbGVjdGlvbjogc25hcHNob3Quc2VsZWN0aW9uIH0pO1xuICBjb25zdCB1cGRhdGVFbXBoYXNpcyA9IChibG9ja0luZGV4LCBlbXBoYXNpc0luZGV4LCBmaWVsZCwgdmFsdWUpID0+IHN0b3JlLmNvbW1pdCgnRWRpdCBlZGl0b3JpYWwgaGlnaGxpZ2h0JywgKGRyYWZ0KSA9PiB7XG4gICAgZHJhZnQuc2VjdGlvbnNbc2VjdGlvbkluZGV4XS50ZXh0LmJsb2Nrc1tibG9ja0luZGV4XS5lbXBoYXNpc1tlbXBoYXNpc0luZGV4XVtmaWVsZF0gPSB2YWx1ZTtcbiAgfSwgeyBjb2FsZXNjZUtleTogYGJsb2NrOiR7c2VjdGlvbi5pZH06JHtibG9ja0luZGV4fTplbXBoYXNpczoke2VtcGhhc2lzSW5kZXh9OiR7ZmllbGR9YCwgc2VsZWN0aW9uOiBzbmFwc2hvdC5zZWxlY3Rpb24gfSk7XG4gIGNvbnN0IGFkZEVtcGhhc2lzID0gKGJsb2NrSW5kZXgpID0+IHN0b3JlLmNvbW1pdCgnQWRkIGVkaXRvcmlhbCBoaWdobGlnaHQnLCAoZHJhZnQpID0+IHtcbiAgICBjb25zdCBibG9jayA9IGRyYWZ0LnNlY3Rpb25zW3NlY3Rpb25JbmRleF0udGV4dC5ibG9ja3NbYmxvY2tJbmRleF07XG4gICAgYmxvY2suZW1waGFzaXMgfHw9IFtdO1xuICAgIGJsb2NrLmVtcGhhc2lzLnB1c2goeyB0ZXh0OiBibG9jay50ZXh0LnRyaW0oKS5zcGxpdCgvXFxzKy8pLnNsaWNlKDAsIDIpLmpvaW4oJyAnKSwgdG9uZTogJ2JsdWUnIH0pO1xuICB9LCB7IHNlbGVjdGlvbjogc25hcHNob3Quc2VsZWN0aW9uIH0pO1xuICBjb25zdCByZW1vdmVFbXBoYXNpcyA9IChibG9ja0luZGV4LCBlbXBoYXNpc0luZGV4KSA9PiBzdG9yZS5jb21taXQoJ1JlbW92ZSBlZGl0b3JpYWwgaGlnaGxpZ2h0JywgKGRyYWZ0KSA9PiB7XG4gICAgZHJhZnQuc2VjdGlvbnNbc2VjdGlvbkluZGV4XS50ZXh0LmJsb2Nrc1tibG9ja0luZGV4XS5lbXBoYXNpcy5zcGxpY2UoZW1waGFzaXNJbmRleCwgMSk7XG4gIH0sIHsgc2VsZWN0aW9uOiBzbmFwc2hvdC5zZWxlY3Rpb24gfSk7XG4gIHJldHVybiAoXG4gICAgPGRldGFpbHMgb3Blbj5cbiAgICAgIDxzdW1tYXJ5PkVkaXRvcmlhbCBjb250ZW50PC9zdW1tYXJ5PlxuICAgICAgeyhzZWN0aW9uLnRleHQuYmxvY2tzIHx8IFtdKS5tYXAoKGJsb2NrLCBibG9ja0luZGV4KSA9PiAoXG4gICAgICAgIDxkaXYgY2xhc3NOYW1lPVwiYWJvdXQtZWRpdG9yLWJsb2NrXCIga2V5PXtibG9jay5pZH0+XG4gICAgICAgICAgPGRpdj48Y29kZT57YmxvY2sua2luZH08L2NvZGU+PHNwYW4+e2Jsb2NrLmlkfTwvc3Bhbj48L2Rpdj5cbiAgICAgICAgICB7YmxvY2subGFiZWwgIT0gbnVsbCA/IDxQcm9wZXJ0eSBsYWJlbD1cIkxhYmVsXCI+PGlucHV0IHZhbHVlPXtibG9jay5sYWJlbH0gb25DaGFuZ2U9eyhldmVudCkgPT4gdXBkYXRlQmxvY2soYmxvY2tJbmRleCwgJ2xhYmVsJywgZXZlbnQudGFyZ2V0LnZhbHVlKX0gLz48L1Byb3BlcnR5PiA6IG51bGx9XG4gICAgICAgICAge2Jsb2NrLnRleHQgIT0gbnVsbCA/IDxQcm9wZXJ0eSBsYWJlbD1cIkNvcHlcIj48dGV4dGFyZWEgcm93cz1cIjVcIiB2YWx1ZT17YmxvY2sudGV4dH0gb25DaGFuZ2U9eyhldmVudCkgPT4gdXBkYXRlQmxvY2soYmxvY2tJbmRleCwgJ3RleHQnLCBldmVudC50YXJnZXQudmFsdWUpfSAvPjwvUHJvcGVydHk+IDogbnVsbH1cbiAgICAgICAgICB7YmxvY2sua2luZCA9PT0gJ3Byb3NlJyA/IDxQcm9wZXJ0eSBsYWJlbD1cIlJlY29ubmVjdCBwb2ludCBncmlkXCI+PGlucHV0IHR5cGU9XCJjaGVja2JveFwiIGNoZWNrZWQ9e2Jsb2NrLndvcmxkSW5mbHVlbmNlID09PSB0cnVlfSBvbkNoYW5nZT17KGV2ZW50KSA9PiB1cGRhdGVCbG9jayhibG9ja0luZGV4LCAnd29ybGRJbmZsdWVuY2UnLCBldmVudC50YXJnZXQuY2hlY2tlZCl9IC8+PC9Qcm9wZXJ0eT4gOiBudWxsfVxuICAgICAgICAgIHtibG9jay50ZXh0ICE9IG51bGwgPyAoXG4gICAgICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cImFib3V0LWVkaXRvci1lbXBoYXNpcy1jb250cm9sc1wiPlxuICAgICAgICAgICAgICA8c3Bhbj5IaWdobGlnaHRlZCB3b3Jkczwvc3Bhbj5cbiAgICAgICAgICAgICAgeyhibG9jay5lbXBoYXNpcyB8fCBbXSkubWFwKChpdGVtLCBlbXBoYXNpc0luZGV4KSA9PiAoXG4gICAgICAgICAgICAgICAgPGRpdiBjbGFzc05hbWU9XCJhYm91dC1lZGl0b3ItZW1waGFzaXMtcm93XCIga2V5PXtgJHtibG9jay5pZH0tZW1waGFzaXMtJHtlbXBoYXNpc0luZGV4fWB9PlxuICAgICAgICAgICAgICAgICAgPGlucHV0IGFyaWEtbGFiZWw9XCJIaWdobGlnaHRlZCBwaHJhc2VcIiB2YWx1ZT17aXRlbS50ZXh0fSBvbkNoYW5nZT17KGV2ZW50KSA9PiB1cGRhdGVFbXBoYXNpcyhibG9ja0luZGV4LCBlbXBoYXNpc0luZGV4LCAndGV4dCcsIGV2ZW50LnRhcmdldC52YWx1ZSl9IC8+XG4gICAgICAgICAgICAgICAgICA8c2VsZWN0IGFyaWEtbGFiZWw9XCJIaWdobGlnaHQgY29sb3VyXCIgdmFsdWU9e2l0ZW0udG9uZX0gb25DaGFuZ2U9eyhldmVudCkgPT4gdXBkYXRlRW1waGFzaXMoYmxvY2tJbmRleCwgZW1waGFzaXNJbmRleCwgJ3RvbmUnLCBldmVudC50YXJnZXQudmFsdWUpfT5cbiAgICAgICAgICAgICAgICAgICAge0FCT1VUX05BUlJBVElWRV9FTVBIQVNJU19UT05FUy5tYXAoKHRvbmUpID0+IDxvcHRpb24gdmFsdWU9e3RvbmV9IGtleT17dG9uZX0+e3RvbmV9PC9vcHRpb24+KX1cbiAgICAgICAgICAgICAgICAgIDwvc2VsZWN0PlxuICAgICAgICAgICAgICAgICAgPGJ1dHRvbiB0eXBlPVwiYnV0dG9uXCIgYXJpYS1sYWJlbD17YFJlbW92ZSAke2l0ZW0udGV4dCB8fCAnZW1wdHknfSBoaWdobGlnaHRgfSBvbkNsaWNrPXsoKSA9PiByZW1vdmVFbXBoYXNpcyhibG9ja0luZGV4LCBlbXBoYXNpc0luZGV4KX0+w5c8L2J1dHRvbj5cbiAgICAgICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgICAgKSl9XG4gICAgICAgICAgICAgIDxidXR0b24gdHlwZT1cImJ1dHRvblwiIG9uQ2xpY2s9eygpID0+IGFkZEVtcGhhc2lzKGJsb2NrSW5kZXgpfT5BZGQgaGlnaGxpZ2h0PC9idXR0b24+XG4gICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICApIDogbnVsbH1cbiAgICAgICAgICB7YmxvY2suaXRlbXMgPyA8UHJvcGVydHkgbGFiZWw9XCJJdGVtc1wiPjx0ZXh0YXJlYSByb3dzPVwiNlwiIHZhbHVlPXtibG9jay5pdGVtcy5qb2luKCdcXG4nKX0gb25DaGFuZ2U9eyhldmVudCkgPT4gdXBkYXRlQmxvY2soYmxvY2tJbmRleCwgJ2l0ZW1zJywgZXZlbnQudGFyZ2V0LnZhbHVlLnNwbGl0KCdcXG4nKS5maWx0ZXIoQm9vbGVhbikpfSAvPjwvUHJvcGVydHk+IDogbnVsbH1cbiAgICAgICAgPC9kaXY+XG4gICAgICApKX1cbiAgICAgIDxidXR0b24gdHlwZT1cImJ1dHRvblwiIGNsYXNzTmFtZT1cImFib3V0LWVkaXRvci13aWRlLWFjdGlvblwiIG9uQ2xpY2s9eygpID0+IHN0b3JlLmNvbW1pdCgnQWRkIGVkaXRvcmlhbCBibG9jaycsIChkcmFmdCkgPT4ge1xuICAgICAgICBkcmFmdC5zZWN0aW9uc1tzZWN0aW9uSW5kZXhdLnRleHQuYmxvY2tzLnB1c2goeyBpZDogbmV4dElkKGRyYWZ0LCBgJHtzZWN0aW9uLmlkfS1wcm9zZWApLCBraW5kOiAncHJvc2UnLCB0ZXh0OiAnTmV3IGVkaXRvcmlhbCBwYXJhZ3JhcGguJyB9KTtcbiAgICAgIH0pfT5BZGQgcHJvc2UgYmxvY2s8L2J1dHRvbj5cbiAgICA8L2RldGFpbHM+XG4gICk7XG59XG5cbmZ1bmN0aW9uIEN1ZVJoeXRobUFuZFJldXNlKHsgc3RvcmUsIHNuYXBzaG90LCBjbGlwYm9hcmQsIHNldENsaXBib2FyZCB9KSB7XG4gIGNvbnN0IG1lbWJlcnMgPSBnZXRBYm91dE5hcnJhdGl2ZVNlbGVjdGlvbk1lbWJlcnMoc25hcHNob3Quc2VsZWN0aW9uKTtcbiAgY29uc3QgW2dhcFdVLCBzZXRHYXBXVV0gPSB1c2VTdGF0ZSgwLjM1KTtcbiAgY29uc3QgW2FuY2hvciwgc2V0QW5jaG9yXSA9IHVzZVN0YXRlKCdwcmltYXJ5Jyk7XG4gIGNvbnN0IFtwcmV2aWV3LCBzZXRQcmV2aWV3XSA9IHVzZVN0YXRlKG51bGwpO1xuICBjb25zdCBbbWVzc2FnZSwgc2V0TWVzc2FnZV0gPSB1c2VTdGF0ZSgnJyk7XG5cbiAgY29uc3QgcHJldmlld01vdmVzID0gKGxhYmVsLCByZXN1bHQpID0+IHtcbiAgICBpZiAoIXJlc3VsdC52YWxpZCkge1xuICAgICAgaWYgKHNuYXBzaG90LnRyeVN0YXRlKSBzdG9yZS5jYW5jZWxUcnkoKTtcbiAgICAgIHNldFByZXZpZXcocmVzdWx0KTtcbiAgICAgIHNldE1lc3NhZ2UocmVzdWx0LnJlYXNvbiB8fCAnVGhpcyBhcnJhbmdlbWVudCBkb2VzIG5vdCBmaXQgdGhlIHNlbGVjdGVkIFNlY3Rpb25zLicpO1xuICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICBpZiAoc25hcHNob3QudHJ5U3RhdGUpIHN0b3JlLmNhbmNlbFRyeSgpO1xuICAgIHN0b3JlLmJlZ2luVHJ5KGxhYmVsLCAoZHJhZnQpID0+IGFwcGx5Q3VlTW92ZXMoZHJhZnQsIHJlc3VsdC5tb3ZlcykpO1xuICAgIHNldFByZXZpZXcoeyAuLi5yZXN1bHQsIGxhYmVsIH0pO1xuICAgIHNldE1lc3NhZ2UoJycpO1xuICB9O1xuICBjb25zdCBjYW5jZWxQcmV2aWV3ID0gKCkgPT4ge1xuICAgIGlmIChzbmFwc2hvdC50cnlTdGF0ZSkgc3RvcmUuY2FuY2VsVHJ5KCk7XG4gICAgc2V0UHJldmlldyhudWxsKTtcbiAgICBzZXRNZXNzYWdlKCcnKTtcbiAgfTtcbiAgY29uc3QgYXBwbHlQcmV2aWV3ID0gKCkgPT4ge1xuICAgIGlmICghcHJldmlldz8udmFsaWQgfHwgIXNuYXBzaG90LnRyeVN0YXRlKSByZXR1cm47XG4gICAgc3RvcmUuYXBwbHlUcnkoKTtcbiAgICBzZXRQcmV2aWV3KG51bGwpO1xuICAgIHNldE1lc3NhZ2UoJycpO1xuICB9O1xuICBjb25zdCBjb21taXRDYW5kaWRhdGUgPSAobGFiZWwsIHJlc3VsdCkgPT4ge1xuICAgIGlmICghcmVzdWx0Py52YWxpZCB8fCAhcmVzdWx0LmRvY3VtZW50KSB7XG4gICAgICBzZXRNZXNzYWdlKHJlc3VsdD8ucmVhc29uIHx8ICdUaGlzIG9wZXJhdGlvbiBjb3VsZCBub3QgYmUgY29tcGxldGVkIHNhZmVseS4nKTtcbiAgICAgIHJldHVybjtcbiAgICB9XG4gICAgc3RvcmUuY29tbWl0KGxhYmVsLCAoZHJhZnQpID0+IHJlcGxhY2VEcmFmdERvY3VtZW50KGRyYWZ0LCByZXN1bHQuZG9jdW1lbnQpLCB7XG4gICAgICBzZWxlY3Rpb246IHJlc3VsdC5zZWxlY3Rpb24gfHwgc25hcHNob3Quc2VsZWN0aW9uLFxuICAgIH0pO1xuICAgIHNldE1lc3NhZ2UoJycpO1xuICB9O1xuXG4gIGNvbnN0IGRpc3RyaWJ1dGUgPSAoKSA9PiBwcmV2aWV3TW92ZXMoJ0Rpc3RyaWJ1dGUgdGl0bGUgcmh5dGhtJywgcmVzb2x2ZUFib3V0TmFycmF0aXZlQ3VlRGlzdHJpYnV0aW9uKHtcbiAgICBkb2N1bWVudDogc25hcHNob3QuZG9jdW1lbnQsXG4gICAgcGxhbjogc25hcHNob3QuY29tcGlsZWRQbGFuLFxuICAgIG1lbWJlcnMsXG4gICAgcHJpbWFyeTogc25hcHNob3Quc2VsZWN0aW9uLFxuICB9KSk7XG4gIGNvbnN0IGV4YWN0R2FwID0gKCkgPT4gcHJldmlld01vdmVzKCdTZXQgZXhhY3QgdGl0bGUgZ2FwJywgcmVzb2x2ZUFib3V0TmFycmF0aXZlQ3VlRXhhY3RHYXAoe1xuICAgIGRvY3VtZW50OiBzbmFwc2hvdC5kb2N1bWVudCxcbiAgICBwbGFuOiBzbmFwc2hvdC5jb21waWxlZFBsYW4sXG4gICAgbWVtYmVycyxcbiAgICBwcmltYXJ5OiBzbmFwc2hvdC5zZWxlY3Rpb24sXG4gICAgZ2FwV1UsXG4gICAgYW5jaG9yLFxuICB9KSk7XG4gIGNvbnN0IGFsaWduUHJpbWFyeSA9ICgpID0+IHByZXZpZXdNb3ZlcygnQWxpZ24gdGl0bGVzIHRvIHBsYXloZWFkJywgcmVzb2x2ZUFib3V0TmFycmF0aXZlQ3VlR3JvdXBBbGlnbih7XG4gICAgZG9jdW1lbnQ6IHNuYXBzaG90LmRvY3VtZW50LFxuICAgIHBsYW46IHNuYXBzaG90LmNvbXBpbGVkUGxhbixcbiAgICBtZW1iZXJzLFxuICAgIHByaW1hcnk6IHNuYXBzaG90LnNlbGVjdGlvbixcbiAgICBwbGF5aGVhZFdVOiBzbmFwc2hvdC50cmFuc3BvcnQuc3RvcnlXVSxcbiAgfSkpO1xuICBjb25zdCBkdXBsaWNhdGUgPSAoKSA9PiBjb21taXRDYW5kaWRhdGUoJ0R1cGxpY2F0ZSB0aXRsZSBDdWVzJywgZHVwbGljYXRlQWJvdXROYXJyYXRpdmVDdWVHcm91cCh7XG4gICAgZG9jdW1lbnQ6IHNuYXBzaG90LmRvY3VtZW50LFxuICAgIG1lbWJlcnMsXG4gICAgcHJpbWFyeTogc25hcHNob3Quc2VsZWN0aW9uLFxuICB9KSk7XG4gIGNvbnN0IGNvcHkgPSAoKSA9PiB7XG4gICAgY29uc3QgcmVzdWx0ID0gY3JlYXRlQWJvdXROYXJyYXRpdmVDdWVDbGlwYm9hcmRQYXlsb2FkKHtcbiAgICAgIGRvY3VtZW50OiBzbmFwc2hvdC5kb2N1bWVudCxcbiAgICAgIHBsYW46IHNuYXBzaG90LmNvbXBpbGVkUGxhbixcbiAgICAgIG1lbWJlcnMsXG4gICAgICBwcmltYXJ5OiBzbmFwc2hvdC5zZWxlY3Rpb24sXG4gICAgfSk7XG4gICAgY29uc3QgcGF5bG9hZCA9IHJlc3VsdD8ucGF5bG9hZCB8fCByZXN1bHQ7XG4gICAgY29uc3QgdmFsaWRhdGlvbiA9IHZhbGlkYXRlQWJvdXROYXJyYXRpdmVDdWVDbGlwYm9hcmRQYXlsb2FkKHBheWxvYWQpO1xuICAgIGlmIChyZXN1bHQ/LnZhbGlkID09PSBmYWxzZSB8fCB2YWxpZGF0aW9uPy52YWxpZCA9PT0gZmFsc2UpIHtcbiAgICAgIHNldE1lc3NhZ2UocmVzdWx0Py5yZWFzb24gfHwgdmFsaWRhdGlvbj8ucmVhc29uIHx8ICdUaGVzZSB0aXRsZXMgY2Fubm90IGJlIGNvcGllZC4nKTtcbiAgICAgIHJldHVybjtcbiAgICB9XG4gICAgc2V0Q2xpcGJvYXJkKHBheWxvYWQpO1xuICAgIHNldE1lc3NhZ2UoYCR7bWVtYmVycy5sZW5ndGh9IHRpdGxlJHttZW1iZXJzLmxlbmd0aCA9PT0gMSA/ICcnIDogJ3MnfSBjb3BpZWQgZm9yIHRoaXMgZWRpdG9yIHNlc3Npb24uYCk7XG4gIH07XG4gIGNvbnN0IHBhc3RlID0gKCkgPT4gY29tbWl0Q2FuZGlkYXRlKCdQYXN0ZSB0aXRsZSBDdWVzJywgcmVzb2x2ZUFib3V0TmFycmF0aXZlQ3VlR3JvdXBQYXN0ZSh7XG4gICAgZG9jdW1lbnQ6IHNuYXBzaG90LmRvY3VtZW50LFxuICAgIHBsYW46IHNuYXBzaG90LmNvbXBpbGVkUGxhbixcbiAgICBwYXlsb2FkOiBjbGlwYm9hcmQsXG4gICAgZGVzdGluYXRpb25TZWN0aW9uSWQ6IHNuYXBzaG90LnNlbGVjdGlvbi5zZWN0aW9uSWQsXG4gICAgcGxheWhlYWRXVTogc25hcHNob3QudHJhbnNwb3J0LnN0b3J5V1UsXG4gIH0pKTtcblxuICBjb25zdCBnaG9zdE1vdmVzID0gcHJldmlldz8udmFsaWQgPyBwcmV2aWV3Lm1vdmVzIDogW107XG4gIGNvbnN0IG1heFdVID0gTWF0aC5tYXgoMC4wMDEsIHNuYXBzaG90LmNvbXBpbGVkUGxhbj8ubWF4U3RvcnlXVSB8fCAxKTtcbiAgcmV0dXJuIChcbiAgICA8ZGV0YWlscyBjbGFzc05hbWU9XCJhYm91dC1lZGl0b3Itcmh5dGhtXCIgb3Blbj17bWVtYmVycy5sZW5ndGggPiAxfT5cbiAgICAgIDxzdW1tYXJ5PlJoeXRobSBhbmQgcmV1c2U8L3N1bW1hcnk+XG4gICAgICB7bWVtYmVycy5sZW5ndGggPiAxID8gKFxuICAgICAgICA8PlxuICAgICAgICAgIDxkaXYgY2xhc3NOYW1lPVwiYWJvdXQtZWRpdG9yLXJoeXRobS1hY3Rpb25zXCI+XG4gICAgICAgICAgICA8YnV0dG9uIHR5cGU9XCJidXR0b25cIiBvbkNsaWNrPXtkaXN0cmlidXRlfT5EaXN0cmlidXRlIGV2ZW5seTwvYnV0dG9uPlxuICAgICAgICAgICAgPGJ1dHRvbiB0eXBlPVwiYnV0dG9uXCIgb25DbGljaz17YWxpZ25QcmltYXJ5fT5BbGlnbiBwcmltYXJ5IHRvIHBsYXloZWFkPC9idXR0b24+XG4gICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgPGRpdiBjbGFzc05hbWU9XCJhYm91dC1lZGl0b3Itcmh5dGhtLWdhcFwiPlxuICAgICAgICAgICAgPFByb3BlcnR5IGxhYmVsPVwiRXhhY3QgZ2FwXCI+PGlucHV0IHR5cGU9XCJudW1iZXJcIiBtaW49XCIwXCIgbWF4PVwiOFwiIHN0ZXA9XCIwLjA1XCIgdmFsdWU9e2dhcFdVfSBvbkNoYW5nZT17KGV2ZW50KSA9PiBzZXRHYXBXVShNYXRoLm1heCgwLCBOdW1iZXIoZXZlbnQudGFyZ2V0LnZhbHVlKSB8fCAwKSl9IC8+PC9Qcm9wZXJ0eT5cbiAgICAgICAgICAgIDxQcm9wZXJ0eSBsYWJlbD1cIkFuY2hvclwiPjxzZWxlY3QgdmFsdWU9e2FuY2hvcn0gb25DaGFuZ2U9eyhldmVudCkgPT4gc2V0QW5jaG9yKGV2ZW50LnRhcmdldC52YWx1ZSl9PjxvcHRpb24gdmFsdWU9XCJwcmltYXJ5XCI+UHJpbWFyeTwvb3B0aW9uPjxvcHRpb24gdmFsdWU9XCJmaXJzdFwiPkZpcnN0PC9vcHRpb24+PG9wdGlvbiB2YWx1ZT1cImxhc3RcIj5MYXN0PC9vcHRpb24+PC9zZWxlY3Q+PC9Qcm9wZXJ0eT5cbiAgICAgICAgICAgIDxidXR0b24gdHlwZT1cImJ1dHRvblwiIG9uQ2xpY2s9e2V4YWN0R2FwfT5QcmV2aWV3IGV4YWN0IGdhcDwvYnV0dG9uPlxuICAgICAgICAgIDwvZGl2PlxuICAgICAgICA8Lz5cbiAgICAgICkgOiBudWxsfVxuICAgICAge2dob3N0TW92ZXMubGVuZ3RoID8gKFxuICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cImFib3V0LWVkaXRvci1yaHl0aG0tcHJldmlld1wiIGFyaWEtbGFiZWw9XCJQcm9wb3NlZCB0aXRsZSByaHl0aG1cIj5cbiAgICAgICAgICB7Z2hvc3RNb3Zlcy5tYXAoKG1vdmUpID0+IHtcbiAgICAgICAgICAgIGNvbnN0IGNvbXBpbGVkID0gc25hcHNob3QuY29tcGlsZWRQbGFuLnNlY3Rpb25zLmZpbmQoKGl0ZW0pID0+IGl0ZW0uaWQgPT09IG1vdmUuc2VjdGlvbklkKTtcbiAgICAgICAgICAgIGNvbnN0IHN0b3J5V1UgPSBOdW1iZXIoY29tcGlsZWQ/LnN0YXJ0V1UgfHwgMCkgKyAobW92ZS5ob2xkICogTnVtYmVyKGNvbXBpbGVkPy50cmF2ZWxXVSB8fCAwKSk7XG4gICAgICAgICAgICByZXR1cm4gPGkga2V5PXtgJHttb3ZlLnNlY3Rpb25JZH06JHttb3ZlLmN1ZUlkfWB9IHN0eWxlPXt7IGxlZnQ6IGAkeyhzdG9yeVdVIC8gbWF4V1UpICogMTAwfSVgIH19IHRpdGxlPXtgJHttb3ZlLmN1ZUlkfSDCtyAke2Zvcm1hdFdVKHN0b3J5V1UpfWB9IC8+O1xuICAgICAgICAgIH0pfVxuICAgICAgICA8L2Rpdj5cbiAgICAgICkgOiBudWxsfVxuICAgICAge21lc3NhZ2UgPyA8cCBjbGFzc05hbWU9e2BhYm91dC1lZGl0b3Itcmh5dGhtLW1lc3NhZ2Uke3ByZXZpZXcgJiYgIXByZXZpZXcudmFsaWQgPyAnIGlzLWVycm9yJyA6ICcnfWB9PnttZXNzYWdlfTwvcD4gOiBudWxsfVxuICAgICAge3ByZXZpZXc/LnZhbGlkICYmIHNuYXBzaG90LnRyeVN0YXRlID8gPGRpdiBjbGFzc05hbWU9XCJhYm91dC1lZGl0b3ItdHJ5XCI+PHNwYW4+UHJldmlld2luZyB7cHJldmlldy5sYWJlbH08L3NwYW4+PGJ1dHRvbiB0eXBlPVwiYnV0dG9uXCIgb25DbGljaz17Y2FuY2VsUHJldmlld30+Q2FuY2VsPC9idXR0b24+PGJ1dHRvbiB0eXBlPVwiYnV0dG9uXCIgY2xhc3NOYW1lPVwiaXMtcHJpbWFyeVwiIG9uQ2xpY2s9e2FwcGx5UHJldmlld30+QXBwbHk8L2J1dHRvbj48L2Rpdj4gOiBudWxsfVxuICAgICAgPGRpdiBjbGFzc05hbWU9XCJhYm91dC1lZGl0b3Itcmh5dGhtLWFjdGlvbnNcIj5cbiAgICAgICAgPGJ1dHRvbiB0eXBlPVwiYnV0dG9uXCIgb25DbGljaz17ZHVwbGljYXRlfT5EdXBsaWNhdGUge21lbWJlcnMubGVuZ3RoID4gMSA/ICdzZWxlY3Rpb24nIDogJ3RpdGxlJ308L2J1dHRvbj5cbiAgICAgICAgPGJ1dHRvbiB0eXBlPVwiYnV0dG9uXCIgb25DbGljaz17Y29weX0+Q29weTwvYnV0dG9uPlxuICAgICAgICA8YnV0dG9uIHR5cGU9XCJidXR0b25cIiBkaXNhYmxlZD17IWNsaXBib2FyZH0gb25DbGljaz17cGFzdGV9PlBhc3RlIGF0IHBsYXloZWFkPC9idXR0b24+XG4gICAgICA8L2Rpdj5cbiAgICA8L2RldGFpbHM+XG4gICk7XG59XG5cbmZ1bmN0aW9uIEN1ZUluc3BlY3Rvcih7IHN0b3JlLCBzbmFwc2hvdCwgc2VjdGlvbiwgY2xpcGJvYXJkLCBzZXRDbGlwYm9hcmQgfSkge1xuICBjb25zdCBzZWxlY3RlZE1lbWJlcnMgPSBnZXRBYm91dE5hcnJhdGl2ZVNlbGVjdGlvbk1lbWJlcnMoc25hcHNob3Quc2VsZWN0aW9uKTtcbiAgY29uc3Qgc2VjdGlvbkluZGV4ID0gZ2V0U2VjdGlvbkluZGV4KHNuYXBzaG90LmRvY3VtZW50LCBzZWN0aW9uLmlkKTtcbiAgY29uc3QgY3VlSW5kZXggPSBzZWN0aW9uLnRleHQuY3Vlcy5maW5kSW5kZXgoKGN1ZSkgPT4gY3VlLmlkID09PSBzbmFwc2hvdC5zZWxlY3Rpb24uY3VlSWQpO1xuICBjb25zdCBjdWUgPSBzZWN0aW9uLnRleHQuY3Vlc1tjdWVJbmRleF07XG4gIGlmICghY3VlKSByZXR1cm4gPFNlY3Rpb25JbnNwZWN0b3Igc3RvcmU9e3N0b3JlfSBzbmFwc2hvdD17c25hcHNob3R9IHNlY3Rpb249e3NlY3Rpb259IC8+O1xuICBjb25zdCB1cGRhdGUgPSAoZmllbGQsIHZhbHVlKSA9PiBzdG9yZS5jb21taXQoYEVkaXQgQ3VlICR7ZmllbGR9YCwgKGRyYWZ0KSA9PiB7XG4gICAgZHJhZnQuc2VjdGlvbnNbc2VjdGlvbkluZGV4XS50ZXh0LmN1ZXNbY3VlSW5kZXhdW2ZpZWxkXSA9IHZhbHVlO1xuICB9LCB7IGNvYWxlc2NlS2V5OiBgY3VlOiR7Y3VlLmlkfToke2ZpZWxkfWAsIHNlbGVjdGlvbjogc25hcHNob3Quc2VsZWN0aW9uIH0pO1xuICBjb25zdCByZW1vdmUgPSAoKSA9PiBzdG9yZS5jb21taXQoJ0RlbGV0ZSB0ZXh0IEN1ZScsIChkcmFmdCkgPT4ge1xuICAgIGRyYWZ0LnNlY3Rpb25zW3NlY3Rpb25JbmRleF0udGV4dC5jdWVzLnNwbGljZShjdWVJbmRleCwgMSk7XG4gIH0sIHsgc2VsZWN0aW9uOiB7IHR5cGU6ICdzZWN0aW9uJywgc2VjdGlvbklkOiBzZWN0aW9uLmlkIH0gfSk7XG4gIGNvbnN0IHRpbWluZ0JvdW5kcyA9IGdldEFib3V0TmFycmF0aXZlQ3VlVGltaW5nQm91bmRzKGN1ZSk7XG4gIGNvbnN0IG1vdGlvbkludGVydmFsID0gZ2V0QWJvdXROYXJyYXRpdmVDdWVNb3Rpb25JbnRlcnZhbChjdWUsIHNuYXBzaG90LmRvY3VtZW50Lmdsb2JhbHMudGV4dE1vdGlvbik7XG4gIGNvbnN0IG1vdmVtZW50ID0gZ2V0QWJvdXROYXJyYXRpdmVDdWVNb3ZlbWVudChjdWUpO1xuICBjb25zdCBtb3ZlQ3VlID0gKHBlcmNlbnQpID0+IHN0b3JlLmNvbW1pdCgnTW92ZSB0ZXh0IEN1ZScsIChkcmFmdCkgPT4ge1xuICAgIGNvbnN0IHRhcmdldCA9IGRyYWZ0LnNlY3Rpb25zW3NlY3Rpb25JbmRleF0udGV4dC5jdWVzW2N1ZUluZGV4XTtcbiAgICBPYmplY3QuYXNzaWduKHRhcmdldCwgbW92ZUFib3V0TmFycmF0aXZlQ3VlVGltaW5nKHRhcmdldCwgcGVyY2VudCAvIDEwMCkpO1xuICB9LCB7IGNvYWxlc2NlS2V5OiBgY3VlOiR7Y3VlLmlkfTp0aW1pbmdgLCBzZWxlY3Rpb246IHsgLi4uc25hcHNob3Quc2VsZWN0aW9uLCBrZXlQYXJ0OiAnZm9jdXMnIH0gfSk7XG4gIGNvbnN0IHVwZGF0ZU1vdmVtZW50ID0gKG1vZGUpID0+IHN0b3JlLmNvbW1pdCgnQ2hhbmdlIHRleHQgbW92ZW1lbnQnLCAoZHJhZnQpID0+IHtcbiAgICBjb25zdCB0YXJnZXQgPSBkcmFmdC5zZWN0aW9uc1tzZWN0aW9uSW5kZXhdLnRleHQuY3Vlc1tjdWVJbmRleF07XG4gICAgdGFyZ2V0Lm1vdGlvbiA9IHsgLi4udGFyZ2V0Lm1vdGlvbiwgbW9kZSB9O1xuICB9LCB7IHNlbGVjdGlvbjogc25hcHNob3Quc2VsZWN0aW9uIH0pO1xuICByZXR1cm4gKFxuICAgIDw+XG4gICAgICA8aGVhZGVyPjxzcGFuPlRleHQgQ3VlPC9zcGFuPjxzdHJvbmc+e2N1ZS5pZH08L3N0cm9uZz48L2hlYWRlcj5cbiAgICAgIHtzZWxlY3RlZE1lbWJlcnMubGVuZ3RoID4gMSA/IChcbiAgICAgICAgPGRpdiBjbGFzc05hbWU9XCJhYm91dC1lZGl0b3ItZ3JvdXAtc3VtbWFyeVwiPlxuICAgICAgICAgIDxzdHJvbmc+e3NlbGVjdGVkTWVtYmVycy5sZW5ndGh9IHRpdGxlcyBzZWxlY3RlZDwvc3Ryb25nPlxuICAgICAgICAgIDxvbD57c2VsZWN0ZWRNZW1iZXJzLm1hcCgobWVtYmVyKSA9PiB7XG4gICAgICAgICAgICBjb25zdCBtZW1iZXJTZWN0aW9uID0gc25hcHNob3QuZG9jdW1lbnQuc2VjdGlvbnMuZmluZCgoaXRlbSkgPT4gaXRlbS5pZCA9PT0gbWVtYmVyLnNlY3Rpb25JZCk7XG4gICAgICAgICAgICBjb25zdCBtZW1iZXJDdWUgPSBtZW1iZXJTZWN0aW9uPy50ZXh0Py5jdWVzPy5maW5kKChpdGVtKSA9PiBpdGVtLmlkID09PSBtZW1iZXIuY3VlSWQpO1xuICAgICAgICAgICAgcmV0dXJuIDxsaSBrZXk9e2Ake21lbWJlci5zZWN0aW9uSWR9OiR7bWVtYmVyLmN1ZUlkfWB9PjxzcGFuPnttZW1iZXJTZWN0aW9uPy5sYWJlbH08L3NwYW4+e21lbWJlckN1ZT8udGV4dH08L2xpPjtcbiAgICAgICAgICB9KX08L29sPlxuICAgICAgICAgIDxidXR0b24gdHlwZT1cImJ1dHRvblwiIG9uQ2xpY2s9eygpID0+IHN0b3JlLnNldFNlbGVjdGlvbih7IHR5cGU6ICdjdWUnLCBzZWN0aW9uSWQ6IHNlY3Rpb24uaWQsIGN1ZUlkOiBjdWUuaWQsIGtleVBhcnQ6ICdmb2N1cycgfSl9PktlZXAgcHJpbWFyeSBvbmx5PC9idXR0b24+XG4gICAgICAgIDwvZGl2PlxuICAgICAgKSA6IG51bGx9XG4gICAgICA8cCBjbGFzc05hbWU9XCJhYm91dC1lZGl0b3ItaGVscFwiPkRyYWcgdGhlIHBpbmsgdGltaW5nIG1hcmtlciBhbnl3aGVyZSBmcm9tIDDigJMxMDAlIG9mIGl0cyBTZWN0aW9uLiBUaGlzIG1vdmVzIHRoZSB0aXRsZSdzIGZvY3VzIHRpbWUgb25seS4gSXRzIHRyYXZlbCBkdXJhdGlvbiwgc3BlZWQsIGJsdXIsIGFuZCBpbi9vdXQgY2FkZW5jZSByZW1haW4gY29udHJvbGxlZCBnbG9iYWxseSB1bmRlciBTcGF0aWFsIHRpdGxlcy48L3A+XG4gICAgICA8UHJvcGVydHkgbGFiZWw9XCJTdGF0ZW1lbnRcIj48dGV4dGFyZWEgcm93cz1cIjdcIiB2YWx1ZT17Y3VlLnRleHR9IG9uQ2hhbmdlPXsoZXZlbnQpID0+IHVwZGF0ZSgndGV4dCcsIGV2ZW50LnRhcmdldC52YWx1ZSl9IC8+PC9Qcm9wZXJ0eT5cbiAgICAgIDxQcm9wZXJ0eSBsYWJlbD1cIk1vdmVtZW50XCI+PHNlbGVjdCB2YWx1ZT17bW92ZW1lbnR9IG9uQ2hhbmdlPXsoZXZlbnQpID0+IHVwZGF0ZU1vdmVtZW50KGV2ZW50LnRhcmdldC52YWx1ZSl9PjxvcHRpb24gdmFsdWU9XCJzcGF0aWFsXCI+U3BhdGlhbCB0cmF2ZWw8L29wdGlvbj48b3B0aW9uIHZhbHVlPVwidmVydGljYWxcIj5WZXJ0aWNhbCBzY3JvbGw8L29wdGlvbj48L3NlbGVjdD48L1Byb3BlcnR5PlxuICAgICAgPE51bWJlclByb3BlcnR5XG4gICAgICAgIGxhYmVsPVwiUG9zaXRpb25cIlxuICAgICAgICB2YWx1ZT17TnVtYmVyKChjdWUuaG9sZCAqIDEwMCkudG9GaXhlZCgxKSl9XG4gICAgICAgIG1pbj17TnVtYmVyKCh0aW1pbmdCb3VuZHMubWluICogMTAwKS50b0ZpeGVkKDEpKX1cbiAgICAgICAgbWF4PXtOdW1iZXIoKHRpbWluZ0JvdW5kcy5tYXggKiAxMDApLnRvRml4ZWQoMSkpfVxuICAgICAgICBzdGVwPXswLjV9XG4gICAgICAgIHVuaXQ9XCIlXCJcbiAgICAgICAgZGlzYWJsZWQ9e3RpbWluZ0JvdW5kcy5taW4gPT09IHRpbWluZ0JvdW5kcy5tYXh9XG4gICAgICAgIG9uQ2hhbmdlPXttb3ZlQ3VlfVxuICAgICAgLz5cbiAgICAgIHttb3ZlbWVudCA9PT0gJ3NwYXRpYWwnID8gKFxuICAgICAgICA8PlxuICAgICAgICAgIDxQcm9wZXJ0eSBsYWJlbD1cIkF1dG8gdHJhdmVsXCI+PG91dHB1dCBjbGFzc05hbWU9XCJhYm91dC1lZGl0b3ItcmVhZG91dFwiPntNYXRoLnJvdW5kKG1vdGlvbkludGVydmFsLnN0YXJ0ICogMTAwKX3igJN7TWF0aC5yb3VuZChtb3Rpb25JbnRlcnZhbC5lbmQgKiAxMDApfSU8L291dHB1dD48L1Byb3BlcnR5PlxuICAgICAgICAgIDxQcm9wZXJ0eSBsYWJlbD1cIk1vdGlvbiBwcmVzZXRcIj48c2VsZWN0IHZhbHVlPXtjdWUucHJlc2V0fSBvbkNoYW5nZT17KGV2ZW50KSA9PiB1cGRhdGUoJ3ByZXNldCcsIGV2ZW50LnRhcmdldC52YWx1ZSl9PjxvcHRpb24gdmFsdWU9XCJ0cmF2ZWxsaW5nLXRpdGxlLXYxXCI+VHJhdmVsbGluZyB0aXRsZTwvb3B0aW9uPjxvcHRpb24gdmFsdWU9XCJvcGVuZXItdjFcIj5PcGVuZXI8L29wdGlvbj48b3B0aW9uIHZhbHVlPVwiZmluYWxlLXYxXCI+RmluYWxlPC9vcHRpb24+PC9zZWxlY3Q+PC9Qcm9wZXJ0eT5cbiAgICAgICAgPC8+XG4gICAgICApIDogPFByb3BlcnR5IGxhYmVsPVwiUmV2ZWFsXCI+PG91dHB1dCBjbGFzc05hbWU9XCJhYm91dC1lZGl0b3ItcmVhZG91dFwiPkVkaXRvcmlhbCB2ZXJ0aWNhbCBzY3JvbGw8L291dHB1dD48L1Byb3BlcnR5Pn1cbiAgICAgIDxDdWVSaHl0aG1BbmRSZXVzZSBzdG9yZT17c3RvcmV9IHNuYXBzaG90PXtzbmFwc2hvdH0gY2xpcGJvYXJkPXtjbGlwYm9hcmR9IHNldENsaXBib2FyZD17c2V0Q2xpcGJvYXJkfSAvPlxuICAgICAgPGJ1dHRvbiB0eXBlPVwiYnV0dG9uXCIgY2xhc3NOYW1lPVwiYWJvdXQtZWRpdG9yLWRhbmdlclwiIGRpc2FibGVkPXtzZWN0aW9uLnR5cGUgPT09ICdmaW5hbGUnfSBvbkNsaWNrPXtyZW1vdmV9PkRlbGV0ZSBDdWU8L2J1dHRvbj5cbiAgICA8Lz5cbiAgKTtcbn1cblxuZnVuY3Rpb24gRGlzY2lwbGluZVJldmVhbEluc3BlY3Rvcih7IHN0b3JlLCBzbmFwc2hvdCwgc2VjdGlvbiB9KSB7XG4gIGNvbnN0IHNlY3Rpb25JbmRleCA9IGdldFNlY3Rpb25JbmRleChzbmFwc2hvdC5kb2N1bWVudCwgc2VjdGlvbi5pZCk7XG4gIGNvbnN0IHJldmVhbCA9IHNlY3Rpb24udGV4dC5kaXNjaXBsaW5lUmV2ZWFsO1xuICBpZiAoIXJldmVhbCkgcmV0dXJuIDxTZWN0aW9uSW5zcGVjdG9yIHN0b3JlPXtzdG9yZX0gc25hcHNob3Q9e3NuYXBzaG90fSBzZWN0aW9uPXtzZWN0aW9ufSAvPjtcbiAgY29uc3QgdXBkYXRlID0gKGxhYmVsLCBtdXRhdGUsIGNvYWxlc2NlS2V5ID0gbnVsbCkgPT4gc3RvcmUuY29tbWl0KGxhYmVsLCAoZHJhZnQpID0+IHtcbiAgICBtdXRhdGUoZHJhZnQuc2VjdGlvbnNbc2VjdGlvbkluZGV4XS50ZXh0LmRpc2NpcGxpbmVSZXZlYWwpO1xuICB9LCB7IGNvYWxlc2NlS2V5LCBzZWxlY3Rpb246IHNuYXBzaG90LnNlbGVjdGlvbiB9KTtcbiAgY29uc3Qgb2NjdXBpZWQgPSAoKHJldmVhbC5pdGVtcy5sZW5ndGggLSAxKSAqIHJldmVhbC5zdGFnZ2VyKSArIHJldmVhbC5sYWJlbER1cmF0aW9uICsgcmV2ZWFsLmhvbGQ7XG4gIGNvbnN0IGxpbWl0c0ZvciA9IChjb250cm9sKSA9PiB7XG4gICAgaWYgKGNvbnRyb2wuaWQgPT09ICdzdGFydCcpIHJldHVybiB7IG1pbjogY29udHJvbC5taW4sIG1heDogTWF0aC5tYXgoY29udHJvbC5taW4sIHJldmVhbC5lbmQgLSBvY2N1cGllZCkgfTtcbiAgICBpZiAoY29udHJvbC5pZCA9PT0gJ2VuZCcpIHJldHVybiB7IG1pbjogTWF0aC5taW4oY29udHJvbC5tYXgsIHJldmVhbC5zdGFydCArIG9jY3VwaWVkKSwgbWF4OiBjb250cm9sLm1heCB9O1xuICAgIGlmIChjb250cm9sLmlkID09PSAnc3RhZ2dlcicpIHJldHVybiB7XG4gICAgICBtaW46IGNvbnRyb2wubWluLFxuICAgICAgbWF4OiBNYXRoLm1heChjb250cm9sLm1pbiwgKHJldmVhbC5lbmQgLSByZXZlYWwuc3RhcnQgLSByZXZlYWwubGFiZWxEdXJhdGlvbiAtIHJldmVhbC5ob2xkKSAvIE1hdGgubWF4KDEsIHJldmVhbC5pdGVtcy5sZW5ndGggLSAxKSksXG4gICAgfTtcbiAgICBpZiAoY29udHJvbC5pZCA9PT0gJ2xhYmVsRHVyYXRpb24nKSByZXR1cm4ge1xuICAgICAgbWluOiBjb250cm9sLm1pbixcbiAgICAgIG1heDogTWF0aC5tYXgoY29udHJvbC5taW4sIHJldmVhbC5lbmQgLSByZXZlYWwuc3RhcnQgLSAoKHJldmVhbC5pdGVtcy5sZW5ndGggLSAxKSAqIHJldmVhbC5zdGFnZ2VyKSAtIHJldmVhbC5ob2xkKSxcbiAgICB9O1xuICAgIGlmIChjb250cm9sLmlkID09PSAnaG9sZCcpIHJldHVybiB7XG4gICAgICBtaW46IGNvbnRyb2wubWluLFxuICAgICAgbWF4OiBNYXRoLm1heChjb250cm9sLm1pbiwgcmV2ZWFsLmVuZCAtIHJldmVhbC5zdGFydCAtICgocmV2ZWFsLml0ZW1zLmxlbmd0aCAtIDEpICogcmV2ZWFsLnN0YWdnZXIpIC0gcmV2ZWFsLmxhYmVsRHVyYXRpb24pLFxuICAgIH07XG4gICAgcmV0dXJuIHsgbWluOiBjb250cm9sLm1pbiwgbWF4OiBjb250cm9sLm1heCB9O1xuICB9O1xuICByZXR1cm4gKFxuICAgIDw+XG4gICAgICA8aGVhZGVyPjxzcGFuPlRleHQgc2VxdWVuY2U8L3NwYW4+PHN0cm9uZz5EaXNjaXBsaW5lIHJldmVhbDwvc3Ryb25nPjwvaGVhZGVyPlxuICAgICAgPHAgY2xhc3NOYW1lPVwiYWJvdXQtZWRpdG9yLWhlbHBcIj5PbmUgY2xpcCBjb250cm9scyB0aGUgY29tcGxldGUgc2l4LXBvaW50IHNlcXVlbmNlLiBEcmFnIGl0cyBzdHJpcGVkIGJsb2NrIGluIHRoZSBUZXh0IGxhbmUgdG8gbW92ZSBldmVyeSByZXZlYWwgdG9nZXRoZXIuPC9wPlxuICAgICAgPGRldGFpbHMgb3Blbj48c3VtbWFyeT5SZXZlYWwgY2hvcmVvZ3JhcGh5PC9zdW1tYXJ5PlxuICAgICAgICB7QUJPVVRfTkFSUkFUSVZFX0RJU0NJUExJTkVfUkVWRUFMX0NPTlRST0xTLm1hcCgoY29udHJvbCkgPT4ge1xuICAgICAgICAgIGNvbnN0IGxpbWl0cyA9IGxpbWl0c0Zvcihjb250cm9sKTtcbiAgICAgICAgICByZXR1cm4gKFxuICAgICAgICAgICAgPE51bWJlclByb3BlcnR5XG4gICAgICAgICAgICAgIGtleT17Y29udHJvbC5pZH1cbiAgICAgICAgICAgICAgbGFiZWw9e2NvbnRyb2wubGFiZWx9XG4gICAgICAgICAgICAgIHZhbHVlPXtyZXZlYWxbY29udHJvbC5pZF19XG4gICAgICAgICAgICAgIG1pbj17bGltaXRzLm1pbn1cbiAgICAgICAgICAgICAgbWF4PXtsaW1pdHMubWF4fVxuICAgICAgICAgICAgICBzdGVwPXtjb250cm9sLnN0ZXB9XG4gICAgICAgICAgICAgIHVuaXQ9e2NvbnRyb2wudW5pdH1cbiAgICAgICAgICAgICAgb25DaGFuZ2U9eyh2YWx1ZSkgPT4gdXBkYXRlKGBDaGFuZ2UgJHtjb250cm9sLmxhYmVsfWAsIChkcmFmdCkgPT4geyBkcmFmdFtjb250cm9sLmlkXSA9IHZhbHVlOyB9LCBgZGlzY2lwbGluZS1yZXZlYWw6JHtzZWN0aW9uLmlkfToke2NvbnRyb2wuaWR9YCl9XG4gICAgICAgICAgICAvPlxuICAgICAgICAgICk7XG4gICAgICAgIH0pfVxuICAgICAgPC9kZXRhaWxzPlxuICAgICAgPGRldGFpbHMgb3Blbj48c3VtbWFyeT5SZXZlYWwgb3JkZXIgYW5kIGxhYmVsczwvc3VtbWFyeT5cbiAgICAgICAgPGRpdiBjbGFzc05hbWU9XCJhYm91dC1lZGl0b3ItZGlzY2lwbGluZS1pdGVtc1wiPlxuICAgICAgICAgIHtyZXZlYWwuaXRlbXMubWFwKChpdGVtLCBpdGVtSW5kZXgpID0+IChcbiAgICAgICAgICAgIDxkaXYgY2xhc3NOYW1lPVwiYWJvdXQtZWRpdG9yLWRpc2NpcGxpbmUtaXRlbVwiIGtleT17aXRlbS5ncm91cH0+XG4gICAgICAgICAgICAgIDxjb2RlPntTdHJpbmcoaXRlbUluZGV4ICsgMSkucGFkU3RhcnQoMiwgJzAnKX08L2NvZGU+XG4gICAgICAgICAgICAgIDxpbnB1dCB2YWx1ZT17aXRlbS5sYWJlbH0gYXJpYS1sYWJlbD17YERpc2NpcGxpbmUgJHtpdGVtSW5kZXggKyAxfSBsYWJlbGB9IG9uQ2hhbmdlPXsoZXZlbnQpID0+IHVwZGF0ZSgnRWRpdCBkaXNjaXBsaW5lIGxhYmVsJywgKGRyYWZ0KSA9PiB7IGRyYWZ0Lml0ZW1zW2l0ZW1JbmRleF0ubGFiZWwgPSBldmVudC50YXJnZXQudmFsdWU7IH0sIGBkaXNjaXBsaW5lLXJldmVhbDoke3NlY3Rpb24uaWR9Oml0ZW06JHtpdGVtLmdyb3VwfTpsYWJlbGApfSAvPlxuICAgICAgICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cImFib3V0LWVkaXRvci1kaXNjaXBsaW5lLXBhbGV0dGVcIiB0aXRsZT17YCR7aXRlbS5sYWJlbH0gdXNlcyB0aGUgSG9tZSBzaW11bGF0aW9uICR7RElTQ0lQTElORV9CQUxMX1RPS0VOX0JZX0dST1VQW2l0ZW0uZ3JvdXBdfWB9PlxuICAgICAgICAgICAgICAgIDxpIHN0eWxlPXt7IGJhY2tncm91bmQ6IGB2YXIoJHtESVNDSVBMSU5FX0JBTExfVE9LRU5fQllfR1JPVVBbaXRlbS5ncm91cF19KWAgfX0gLz5cbiAgICAgICAgICAgICAgICA8Y29kZT57RElTQ0lQTElORV9CQUxMX1RPS0VOX0JZX0dST1VQW2l0ZW0uZ3JvdXBdfTwvY29kZT5cbiAgICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgICAgIDxzcGFuPlxuICAgICAgICAgICAgICAgIDxidXR0b24gdHlwZT1cImJ1dHRvblwiIGRpc2FibGVkPXtpdGVtSW5kZXggPT09IDB9IGFyaWEtbGFiZWw9e2BSZXZlYWwgJHtpdGVtLmxhYmVsfSBlYXJsaWVyYH0gb25DbGljaz17KCkgPT4gdXBkYXRlKCdSZW9yZGVyIGRpc2NpcGxpbmUgcmV2ZWFsJywgKGRyYWZ0KSA9PiB7IGNvbnN0IFttb3ZlZF0gPSBkcmFmdC5pdGVtcy5zcGxpY2UoaXRlbUluZGV4LCAxKTsgZHJhZnQuaXRlbXMuc3BsaWNlKGl0ZW1JbmRleCAtIDEsIDAsIG1vdmVkKTsgfSl9PuKGkTwvYnV0dG9uPlxuICAgICAgICAgICAgICAgIDxidXR0b24gdHlwZT1cImJ1dHRvblwiIGRpc2FibGVkPXtpdGVtSW5kZXggPT09IHJldmVhbC5pdGVtcy5sZW5ndGggLSAxfSBhcmlhLWxhYmVsPXtgUmV2ZWFsICR7aXRlbS5sYWJlbH0gbGF0ZXJgfSBvbkNsaWNrPXsoKSA9PiB1cGRhdGUoJ1Jlb3JkZXIgZGlzY2lwbGluZSByZXZlYWwnLCAoZHJhZnQpID0+IHsgY29uc3QgW21vdmVkXSA9IGRyYWZ0Lml0ZW1zLnNwbGljZShpdGVtSW5kZXgsIDEpOyBkcmFmdC5pdGVtcy5zcGxpY2UoaXRlbUluZGV4ICsgMSwgMCwgbW92ZWQpOyB9KX0+4oaTPC9idXR0b24+XG4gICAgICAgICAgICAgIDwvc3Bhbj5cbiAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICkpfVxuICAgICAgICA8L2Rpdj5cbiAgICAgIDwvZGV0YWlscz5cbiAgICAgIDxwIGNsYXNzTmFtZT1cImFib3V0LWVkaXRvci1oZWxwXCI+VGhlIHNpeCBwb2ludHMgcGVyc2lzdCBhZnRlciB0aGUgbGFiZWxzIGxlYXZlLiBBbiBlZGl0b3JpYWwgYmxvY2sgbWFya2VkIOKAnFJlY29ubmVjdCBwb2ludCBncmlk4oCdIHJlc3RvcmVzIHRoZSBzdXJyb3VuZGluZyBncmlkIGFzIHRoYXQgcGFyYWdyYXBoIGVudGVycy48L3A+XG4gICAgPC8+XG4gICk7XG59XG5cbmZ1bmN0aW9uIENhbWVyYUluc3BlY3Rvcih7IHN0b3JlLCBzbmFwc2hvdCwgc2VjdGlvbiB9KSB7XG4gIGNvbnN0IHNlY3Rpb25JbmRleCA9IGdldFNlY3Rpb25JbmRleChzbmFwc2hvdC5kb2N1bWVudCwgc2VjdGlvbi5pZCk7XG4gIGNvbnN0IGtleUluZGV4ID0gc25hcHNob3Quc2VsZWN0aW9uLmtleUluZGV4O1xuICBjb25zdCBzZWxlY3RlZEtleSA9IHNlY3Rpb24uY2FtZXJhLmtleXNba2V5SW5kZXhdO1xuICBjb25zdCBrZXkgPSBzZWxlY3RlZEtleSAmJiBzZWxlY3RlZEtleS5hdCA+IDAgJiYgc2VsZWN0ZWRLZXkuYXQgPCAxID8gc2VsZWN0ZWRLZXkgOiBudWxsO1xuICBjb25zdCBsb2NhbCA9IGdldExvY2FsUHJvZ3Jlc3Moc25hcHNob3QuY29tcGlsZWRQbGFuLCBzZWN0aW9uLCBzbmFwc2hvdC50cmFuc3BvcnQuc3RvcnlXVSk7XG4gIGNvbnN0IHRhcmdldEF0ID0gTWF0aC5taW4oMC45OTUsIE1hdGgubWF4KDAuMDA1LCBzbmFwQWJvdXROYXJyYXRpdmVUaW1lbGluZVZhbHVlKGxvY2FsKSkpO1xuICBjb25zdCBhcHBseVByZXNldCA9IChwcmVzZXQpID0+IHN0b3JlLmNvbW1pdChgQXBwbHkgJHtwcmVzZXR9IGNhbWVyYSByZWNpcGVgLCAoZHJhZnQpID0+IHtcbiAgICBjb25zdCByZWNpcGVzID0ge1xuICAgICAgUHVzaDogW1xuICAgICAgICB7IGF0OiAwLCBvZmZzZXQ6IFswLCAwLCAwXSwgbG9va0F0T2Zmc2V0OiBbMCwgMCwgLTFdLCBmb3Y6IDQ4LCByb2xsOiAwLCBlYXNpbmc6ICdzbW9vdGhzdGVwJyB9LFxuICAgICAgICB7IGF0OiAxLCBvZmZzZXQ6IFswLCAwLCAtMS4yXSwgbG9va0F0T2Zmc2V0OiBbMCwgMCwgLTFdLCBmb3Y6IDQ1LCByb2xsOiAwLCBlYXNpbmc6ICdzbW9vdGhzdGVwJyB9LFxuICAgICAgXSxcbiAgICAgIEdsaWRlOiBbXG4gICAgICAgIHsgYXQ6IDAsIG9mZnNldDogWy0wLjgsIDAsIDBdLCBsb29rQXRPZmZzZXQ6IFswLjQsIDAsIC0xXSwgZm92OiA0OCwgcm9sbDogMCwgZWFzaW5nOiAnc21vb3Roc3RlcCcgfSxcbiAgICAgICAgeyBhdDogMSwgb2Zmc2V0OiBbMC44LCAwLCAwXSwgbG9va0F0T2Zmc2V0OiBbLTAuNCwgMCwgLTFdLCBmb3Y6IDQ4LCByb2xsOiAwLCBlYXNpbmc6ICdzbW9vdGhzdGVwJyB9LFxuICAgICAgXSxcbiAgICAgIE9yYml0OiBbXG4gICAgICAgIHsgYXQ6IDAsIG9mZnNldDogWy0wLjcsIDAsIDBdLCBsb29rQXRPZmZzZXQ6IFswLjcsIDAsIC0xXSwgZm92OiA0OCwgcm9sbDogLTAuMDgsIGVhc2luZzogJ3Ntb290aHN0ZXAnIH0sXG4gICAgICAgIHsgYXQ6IDAuNSwgb2Zmc2V0OiBbMC43LCAwLjI1LCAwXSwgbG9va0F0T2Zmc2V0OiBbLTAuNywgLTAuMSwgLTFdLCBmb3Y6IDQ4LCByb2xsOiAwLjA4LCBlYXNpbmc6ICdzbW9vdGhzdGVwJyB9LFxuICAgICAgICB7IGF0OiAxLCBvZmZzZXQ6IFswLCAwLCAwXSwgbG9va0F0T2Zmc2V0OiBbMCwgMCwgLTFdLCBmb3Y6IDQ4LCByb2xsOiAwLCBlYXNpbmc6ICdzbW9vdGhzdGVwJyB9LFxuICAgICAgXSxcbiAgICAgIFJldmVhbDogW1xuICAgICAgICB7IGF0OiAwLCBvZmZzZXQ6IFswLCAtMC40NSwgMC41XSwgbG9va0F0T2Zmc2V0OiBbMCwgMC4zLCAtMV0sIGZvdjogNTYsIHJvbGw6IDAsIGVhc2luZzogJ3Ntb290aHN0ZXAnIH0sXG4gICAgICAgIHsgYXQ6IDEsIG9mZnNldDogWzAsIDAsIDBdLCBsb29rQXRPZmZzZXQ6IFswLCAwLCAtMV0sIGZvdjogNDYsIHJvbGw6IDAsIGVhc2luZzogJ3Ntb290aHN0ZXAnIH0sXG4gICAgICBdLFxuICAgICAgUmVzb2x2ZTogW1xuICAgICAgICB7IGF0OiAwLCBvZmZzZXQ6IFswLjMsIDAuMiwgMF0sIGxvb2tBdE9mZnNldDogWy0wLjMsIC0wLjIsIC0xXSwgZm92OiA1Miwgcm9sbDogMC4xNCwgZWFzaW5nOiAnc21vb3Roc3RlcCcgfSxcbiAgICAgICAgeyBhdDogMSwgb2Zmc2V0OiBbMCwgMCwgMF0sIGxvb2tBdE9mZnNldDogWzAsIDAsIC0xXSwgZm92OiA0OCwgcm9sbDogMCwgZWFzaW5nOiAnc21vb3Roc3RlcCcgfSxcbiAgICAgIF0sXG4gICAgfTtcbiAgICBkcmFmdC5zZWN0aW9uc1tzZWN0aW9uSW5kZXhdLmNhbWVyYS5rZXlzID0gcmVjaXBlc1twcmVzZXRdO1xuICAgIGJyaWRnZUNhbWVyYVNlY3Rpb24oZHJhZnQsIHNlY3Rpb25JbmRleCk7XG4gIH0sIHsgc2VsZWN0aW9uOiB7IHR5cGU6ICdzZWN0aW9uJywgc2VjdGlvbklkOiBzZWN0aW9uLmlkIH0gfSk7XG4gIGNvbnN0IGV4aXN0aW5nS2V5QXRQbGF5aGVhZCA9IHNlY3Rpb24uY2FtZXJhLmtleXMuZmluZEluZGV4KChpdGVtKSA9PiAoXG4gICAgaXRlbS5hdCA+IDAgJiYgaXRlbS5hdCA8IDEgJiYgTWF0aC5hYnMoaXRlbS5hdCAtIHRhcmdldEF0KSA8IDAuMDAyNVxuICApKTtcbiAgY29uc3Qgc2V0S2V5ID0gKCkgPT4ge1xuICAgIGlmIChleGlzdGluZ0tleUF0UGxheWhlYWQgPj0gMCkge1xuICAgICAgc3RvcmUuc2V0U2VsZWN0aW9uKHsgdHlwZTogJ2NhbWVyYS1rZXknLCBzZWN0aW9uSWQ6IHNlY3Rpb24uaWQsIGtleUluZGV4OiBleGlzdGluZ0tleUF0UGxheWhlYWQgfSk7XG4gICAgICByZXR1cm47XG4gICAgfVxuICAgIGNvbnN0IGluc2VydGlvbkluZGV4ID0gc2VjdGlvbi5jYW1lcmEua2V5cy5maW5kSW5kZXgoKGl0ZW0pID0+IGl0ZW0uYXQgPiB0YXJnZXRBdCk7XG4gICAgY29uc3Qgc2VsZWN0ZWRLZXlJbmRleCA9IGluc2VydGlvbkluZGV4IDwgMCA/IHNlY3Rpb24uY2FtZXJhLmtleXMubGVuZ3RoIDogaW5zZXJ0aW9uSW5kZXg7XG4gICAgY29uc3Qgc2FtcGxlZCA9IHNhbXBsZUFib3V0TmFycmF0aXZlUGxhbihzbmFwc2hvdC5jb21waWxlZFBsYW4sIHNuYXBzaG90LnRyYW5zcG9ydC5zdG9yeVdVKTtcbiAgICBjb25zdCBiYXNlWiA9IHNuYXBzaG90LmRvY3VtZW50Lmdsb2JhbHMuY2FtZXJhLnN0YXJ0WiAtIChzbmFwc2hvdC50cmFuc3BvcnQuc3RvcnlXVSAqIHNhbXBsZWQuY2FtZXJhLmNhZGVuY2UpO1xuICAgIGNvbnN0IG5ld0tleSA9IHtcbiAgICAgIGF0OiB0YXJnZXRBdCxcbiAgICAgIG9mZnNldDogW3NhbXBsZWQuY2FtZXJhLnBvc2l0aW9uWzBdLCBzYW1wbGVkLmNhbWVyYS5wb3NpdGlvblsxXSwgc2FtcGxlZC5jYW1lcmEucG9zaXRpb25bMl0gLSBiYXNlWl0sXG4gICAgICBsb29rQXRPZmZzZXQ6IHNhbXBsZWQuY2FtZXJhLnRhcmdldC5tYXAoKHZhbHVlLCBheGlzKSA9PiB2YWx1ZSAtIHNhbXBsZWQuY2FtZXJhLnBvc2l0aW9uW2F4aXNdKSxcbiAgICAgIGZvdjogc2FtcGxlZC5jYW1lcmEuZm92LFxuICAgICAgcm9sbDogc2FtcGxlZC5jYW1lcmEucm9sbCxcbiAgICAgIGVhc2luZzogJ3Ntb290aHN0ZXAnLFxuICAgIH07XG4gICAgc3RvcmUuY29tbWl0KCdTZXQgY2FtZXJhIGtleScsIChkcmFmdCkgPT4ge1xuICAgICAgZHJhZnQuc2VjdGlvbnNbc2VjdGlvbkluZGV4XS5jYW1lcmEua2V5cy5wdXNoKG5ld0tleSk7XG4gICAgICBkcmFmdC5zZWN0aW9uc1tzZWN0aW9uSW5kZXhdLmNhbWVyYS5rZXlzLnNvcnQoKGEsIGIpID0+IGEuYXQgLSBiLmF0KTtcbiAgICB9LCB7IHNlbGVjdGlvbjogeyB0eXBlOiAnY2FtZXJhLWtleScsIHNlY3Rpb25JZDogc2VjdGlvbi5pZCwga2V5SW5kZXg6IHNlbGVjdGVkS2V5SW5kZXggfSB9KTtcbiAgfTtcbiAgY29uc3QgcmVjaXBlcyA9IDxkaXYgY2xhc3NOYW1lPVwiYWJvdXQtZWRpdG9yLWNhbWVyYS1yZWNpcGVzXCI+e1snUHVzaCcsICdHbGlkZScsICdPcmJpdCcsICdSZXZlYWwnLCAnUmVzb2x2ZSddLm1hcCgobmFtZSkgPT4gPGJ1dHRvbiB0eXBlPVwiYnV0dG9uXCIga2V5PXtuYW1lfSBvbkNsaWNrPXsoKSA9PiBhcHBseVByZXNldChuYW1lKX0+e25hbWV9PC9idXR0b24+KX08L2Rpdj47XG4gIGlmICgha2V5KSB7XG4gICAgcmV0dXJuIDw+PGhlYWRlcj48c3Bhbj5DYW1lcmEgdHJhY2s8L3NwYW4+PHN0cm9uZz5FZGl0aW5nIFNlY3Rpb24gYmFzZTwvc3Ryb25nPjwvaGVhZGVyPjxwIGNsYXNzTmFtZT1cImFib3V0LWVkaXRvci1oZWxwXCI+VGhlIGRvbGx5IGFuZCBTZWN0aW9uIGpvaW5zIGFyZSBjb250aW51b3VzIGF1dG9tYXRpY2FsbHkuIEFkZCB2aXNpYmxlIGtleXMgb25seSB3aGVyZSB0aGUgZnJhbWluZywgYWltLCByb2xsLCBvciBsZW5zIHNob3VsZCBjaGFuZ2UuPC9wPntyZWNpcGVzfTxidXR0b24gdHlwZT1cImJ1dHRvblwiIGNsYXNzTmFtZT1cImFib3V0LWVkaXRvci13aWRlLWFjdGlvblwiIG9uQ2xpY2s9e3NldEtleX0+U2V0IGNhbWVyYSBrZXkgYXQge2Zvcm1hdENhbWVyYVBlcmNlbnQodGFyZ2V0QXQpfTwvYnV0dG9uPjwvPjtcbiAgfVxuICBjb25zdCB1cGRhdGUgPSAoZmllbGQsIHZhbHVlKSA9PiBzdG9yZS5jb21taXQoYEVkaXQgY2FtZXJhICR7ZmllbGR9YCwgKGRyYWZ0KSA9PiB7XG4gICAgZHJhZnQuc2VjdGlvbnNbc2VjdGlvbkluZGV4XS5jYW1lcmEua2V5c1trZXlJbmRleF1bZmllbGRdID0gQXJyYXkuaXNBcnJheSh2YWx1ZSkgPyBbLi4udmFsdWVdIDogdmFsdWU7XG4gICAgaWYgKENBTUVSQV9QT1NFX0ZJRUxEUy5oYXMoZmllbGQpKSBsaW5rQ2FtZXJhQm91bmRhcnkoZHJhZnQsIHNlY3Rpb25JbmRleCwga2V5SW5kZXgpO1xuICB9LCB7IGNvYWxlc2NlS2V5OiBgY2FtZXJhOiR7c2VjdGlvbi5pZH06JHtrZXlJbmRleH06JHtmaWVsZH1gLCBzZWxlY3Rpb246IHNuYXBzaG90LnNlbGVjdGlvbiB9KTtcbiAgY29uc3QgdXBkYXRlVmVjdG9yID0gKGZpZWxkLCBheGlzLCB2YWx1ZSkgPT4ge1xuICAgIGNvbnN0IG5leHQgPSBbLi4ua2V5W2ZpZWxkXV07XG4gICAgbmV4dFtheGlzXSA9IHZhbHVlO1xuICAgIHVwZGF0ZShmaWVsZCwgbmV4dCk7XG4gIH07XG4gIGNvbnN0IHRpbWluZ0JvdW5kcyA9IGdldEFib3V0TmFycmF0aXZlQ2FtZXJhS2V5VGltaW5nQm91bmRzKHNlY3Rpb24uY2FtZXJhLmtleXMsIGtleUluZGV4KTtcbiAgY29uc3QgZXh0ZW50RmllbGQgPSBzbmFwc2hvdC5wcmV2aWV3UHJvZmlsZSA9PT0gJ21vYmlsZScgPyAnbW9iaWxlRXh0ZW50V1UnIDogJ2V4dGVudFdVJztcbiAgY29uc3QgZXh0ZW50TGFiZWwgPSBzbmFwc2hvdC5wcmV2aWV3UHJvZmlsZSA9PT0gJ21vYmlsZScgPyAnTW9iaWxlIGxlbmd0aCcgOiAnU2VjdGlvbiBsZW5ndGgnO1xuICBjb25zdCB1cGRhdGVFeHRlbnQgPSAodmFsdWUpID0+IHN0b3JlLmNvbW1pdCgnQ2hhbmdlIFNlY3Rpb24gZXh0ZW50JywgKGRyYWZ0KSA9PiB7XG4gICAgZHJhZnQuc2VjdGlvbnNbc2VjdGlvbkluZGV4XVtleHRlbnRGaWVsZF0gPSB2YWx1ZTtcbiAgfSwgeyBjb2FsZXNjZUtleTogYHNlY3Rpb246JHtzZWN0aW9uLmlkfToke2V4dGVudEZpZWxkfWAsIHNlbGVjdGlvbjogc25hcHNob3Quc2VsZWN0aW9uIH0pO1xuICByZXR1cm4gKFxuICAgIDw+XG4gICAgICA8aGVhZGVyPjxzcGFuPkNhbWVyYSBrZXk8L3NwYW4+PHN0cm9uZz57Zm9ybWF0Q2FtZXJhUGVyY2VudChrZXkuYXQpfSB0aHJvdWdoIHtzZWN0aW9uLmxhYmVsfTwvc3Ryb25nPjwvaGVhZGVyPlxuICAgICAge3JlY2lwZXN9XG4gICAgICA8TnVtYmVyUHJvcGVydHlcbiAgICAgICAgbGFiZWw9XCJQb3NpdGlvblwiXG4gICAgICAgIHZhbHVlPXtOdW1iZXIoKGtleS5hdCAqIDEwMCkudG9GaXhlZCgxKSl9XG4gICAgICAgIG1pbj17TnVtYmVyKCh0aW1pbmdCb3VuZHMubWluICogMTAwKS50b0ZpeGVkKDEpKX1cbiAgICAgICAgbWF4PXtOdW1iZXIoKHRpbWluZ0JvdW5kcy5tYXggKiAxMDApLnRvRml4ZWQoMSkpfVxuICAgICAgICBzdGVwPXswLjV9XG4gICAgICAgIHVuaXQ9XCIlXCJcbiAgICAgICAgb25DaGFuZ2U9eyh2YWx1ZSkgPT4gdXBkYXRlKCdhdCcsIE1hdGgubWluKHRpbWluZ0JvdW5kcy5tYXgsIE1hdGgubWF4KHRpbWluZ0JvdW5kcy5taW4sIHNuYXBBYm91dE5hcnJhdGl2ZVRpbWVsaW5lVmFsdWUodmFsdWUgLyAxMDApKSkpfVxuICAgICAgLz5cbiAgICAgIDxOdW1iZXJQcm9wZXJ0eSBsYWJlbD17ZXh0ZW50TGFiZWx9IHZhbHVlPXtzZWN0aW9uW2V4dGVudEZpZWxkXX0gbWluPXsxfSBtYXg9ezh9IHN0ZXA9ezAuMDV9IHVuaXQ9XCJXVVwiIG9uQ2hhbmdlPXt1cGRhdGVFeHRlbnR9IC8+XG4gICAgICB7WydYIG9mZnNldCcsICdZIG9mZnNldCcsICdGb3J3YXJkIG9mZnNldCddLm1hcCgobGFiZWwsIGF4aXMpID0+IDxOdW1iZXJQcm9wZXJ0eSBrZXk9e2xhYmVsfSBsYWJlbD17bGFiZWx9IHZhbHVlPXtrZXkub2Zmc2V0W2F4aXNdfSBtaW49ey04fSBtYXg9ezh9IHN0ZXA9ezAuMDJ9IHVuaXQ9XCJXVVwiIG9uQ2hhbmdlPXsodmFsdWUpID0+IHVwZGF0ZVZlY3Rvcignb2Zmc2V0JywgYXhpcywgdmFsdWUpfSAvPil9XG4gICAgICB7WydBaW0gWCcsICdBaW0gWScsICdBaW0gZGVwdGgnXS5tYXAoKGxhYmVsLCBheGlzKSA9PiA8TnVtYmVyUHJvcGVydHkga2V5PXtsYWJlbH0gbGFiZWw9e2xhYmVsfSB2YWx1ZT17a2V5Lmxvb2tBdE9mZnNldFtheGlzXX0gbWluPXstOH0gbWF4PXs4fSBzdGVwPXswLjAyfSB1bml0PVwiV1VcIiBvbkNoYW5nZT17KHZhbHVlKSA9PiB1cGRhdGVWZWN0b3IoJ2xvb2tBdE9mZnNldCcsIGF4aXMsIHZhbHVlKX0gLz4pfVxuICAgICAgPE51bWJlclByb3BlcnR5IGxhYmVsPVwiRmllbGQgb2Ygdmlld1wiIHZhbHVlPXtrZXkuZm92fSBtaW49ezIwfSBtYXg9ezkwfSBzdGVwPXsxfSB1bml0PVwiwrBcIiBvbkNoYW5nZT17KHZhbHVlKSA9PiB1cGRhdGUoJ2ZvdicsIHZhbHVlKX0gLz5cbiAgICAgIDxOdW1iZXJQcm9wZXJ0eSBsYWJlbD1cIlJvbGxcIiB2YWx1ZT17a2V5LnJvbGx9IG1pbj17LTEuMn0gbWF4PXsxLjJ9IHN0ZXA9ezAuMDF9IHVuaXQ9XCJyYWRcIiBvbkNoYW5nZT17KHZhbHVlKSA9PiB1cGRhdGUoJ3JvbGwnLCB2YWx1ZSl9IC8+XG4gICAgICA8UHJvcGVydHkgbGFiZWw9XCJFYXNpbmdcIj48c2VsZWN0IHZhbHVlPXtrZXkuZWFzaW5nfSBvbkNoYW5nZT17KGV2ZW50KSA9PiB1cGRhdGUoJ2Vhc2luZycsIGV2ZW50LnRhcmdldC52YWx1ZSl9PjxvcHRpb24gdmFsdWU9XCJzbW9vdGhzdGVwXCI+U21vb3Roc3RlcDwvb3B0aW9uPjxvcHRpb24gdmFsdWU9XCJlYXNlLWluLW91dFwiPkVhc2UgaW4gb3V0PC9vcHRpb24+PC9zZWxlY3Q+PC9Qcm9wZXJ0eT5cbiAgICAgIDxidXR0b24gdHlwZT1cImJ1dHRvblwiIGNsYXNzTmFtZT1cImFib3V0LWVkaXRvci13aWRlLWFjdGlvblwiIGRpc2FibGVkPXtleGlzdGluZ0tleUF0UGxheWhlYWQgPj0gMH0gb25DbGljaz17c2V0S2V5fT57ZXhpc3RpbmdLZXlBdFBsYXloZWFkID49IDAgPyBgQ2FtZXJhIGtleSBhbHJlYWR5IGF0ICR7Zm9ybWF0Q2FtZXJhUGVyY2VudCh0YXJnZXRBdCl9YCA6IGBTZXQgYW5vdGhlciBrZXkgYXQgJHtmb3JtYXRDYW1lcmFQZXJjZW50KHRhcmdldEF0KX1gfTwvYnV0dG9uPlxuICAgICAgPGJ1dHRvbiB0eXBlPVwiYnV0dG9uXCIgY2xhc3NOYW1lPVwiYWJvdXQtZWRpdG9yLWRhbmdlclwiIG9uQ2xpY2s9eygpID0+IHN0b3JlLmNvbW1pdCgnRGVsZXRlIGNhbWVyYSBrZXknLCAoZHJhZnQpID0+IHsgZHJhZnQuc2VjdGlvbnNbc2VjdGlvbkluZGV4XS5jYW1lcmEua2V5cy5zcGxpY2Uoa2V5SW5kZXgsIDEpOyB9LCB7IHNlbGVjdGlvbjogeyB0eXBlOiAnc2VjdGlvbicsIHNlY3Rpb25JZDogc2VjdGlvbi5pZCB9IH0pfT5EZWxldGUga2V5PC9idXR0b24+XG4gICAgPC8+XG4gICk7XG59XG5cbmNvbnN0IENPUlJFU1BPTkRFTkNFX0xBQkVMUyA9IE9iamVjdC5mcmVlemUoe1xuICAnaW5kZXgtdjEnOiAnSW5kZXggb3JkZXInLFxuICAnc3RhYmxlLXNlZWQnOiAnU3RhYmxlIHNlZWQnLFxuICAnc3BhdGlhbC1uZWFyZXN0LXYxJzogJ0xvY2FsIHRyYXZlbCAoYXBwcm94LiknLFxuICAnZ3JvdXAtYXdhcmUnOiAnR3JvdXAgYXdhcmUnLFxufSk7XG5cbmZ1bmN0aW9uIFdvcmxkSW5zcGVjdG9yKHsgc3RvcmUsIHNuYXBzaG90LCBzZWN0aW9uLCBydW50aW1lTWV0cmljcyB9KSB7XG4gIGNvbnN0IHNlY3Rpb25JbmRleCA9IGdldFNlY3Rpb25JbmRleChzbmFwc2hvdC5kb2N1bWVudCwgc2VjdGlvbi5pZCk7XG4gIGlmIChzZWN0aW9uLndvcmxkLm1vZGUgIT09ICdzZXQnKSB7XG4gICAgcmV0dXJuIDw+PGhlYWRlcj48c3Bhbj5Xb3JsZCB0cmFjazwvc3Bhbj48c3Ryb25nPkluaGVyaXRlZCBXb3JsZDwvc3Ryb25nPjwvaGVhZGVyPjxwIGNsYXNzTmFtZT1cImFib3V0LWVkaXRvci1oZWxwXCI+VGhpcyBTZWN0aW9uIGtlZXBzIHRoZSBwcmV2aW91cyBXb3JsZC4gQ2hvb3NlIOKAnENyZWF0ZSBXb3JsZCBjbGlw4oCdIG9ubHkgd2hlbiB0aGUgc2hhcGUgc2hvdWxkIGNoYW5nZSBoZXJlLjwvcD48YnV0dG9uIHR5cGU9XCJidXR0b25cIiBjbGFzc05hbWU9XCJhYm91dC1lZGl0b3Itd2lkZS1hY3Rpb25cIiBvbkNsaWNrPXsoKSA9PiBzdG9yZS5jb21taXQoJ0NyZWF0ZSBXb3JsZCBjbGlwJywgKGRyYWZ0KSA9PiB7XG4gICAgICBkcmFmdC5zZWN0aW9uc1tzZWN0aW9uSW5kZXhdLndvcmxkID0gY2xvbmVBYm91dE5hcnJhdGl2ZURvY3VtZW50KGRyYWZ0LnNlY3Rpb25zLnNsaWNlKDAsIHNlY3Rpb25JbmRleCkucmV2ZXJzZSgpLmZpbmQoKGl0ZW0pID0+IGl0ZW0ud29ybGQubW9kZSA9PT0gJ3NldCcpPy53b3JsZCB8fCBkcmFmdC5zZWN0aW9uc1swXS53b3JsZCk7XG4gICAgfSl9PkNyZWF0ZSBXb3JsZCBjbGlwPC9idXR0b24+PC8+O1xuICB9XG4gIGNvbnN0IHdvcmxkID0gc2VjdGlvbi53b3JsZDtcbiAgY29uc3Qgc2hhcGUgPSBBQk9VVF9OQVJSQVRJVkVfU0hBUEVfREVGSU5JVElPTlNbd29ybGQuc2hhcGVJZF07XG4gIGNvbnN0IHRyYW5zaXRpb25MaW1pdCA9IGdldEFib3V0TmFycmF0aXZlV29ybGRUcmFuc2l0aW9uTGltaXQoc25hcHNob3QuY29tcGlsZWRQbGFuLCBzZWN0aW9uSW5kZXgpO1xuICBjb25zdCB0cmFuc2l0aW9uTWF4ID0gTWF0aC5tYXgodHJhbnNpdGlvbkxpbWl0LCB3b3JsZC50cmFuc2l0aW9uSW4uZW5kLCAxKTtcbiAgY29uc3QgdHJhbnNpdGlvbkVuYWJsZWQgPSB3b3JsZC50cmFuc2l0aW9uSW4udHlwZSAhPT0gJ2N1dCc7XG4gIGNvbnN0IGNvcnJlc3BvbmRlbmNlRW5hYmxlZCA9IFsnbW9ycGgnLCAnZGlzc29sdmUtbW9ycGgnXS5pbmNsdWRlcyh3b3JsZC50cmFuc2l0aW9uSW4udHlwZSk7XG4gIGNvbnN0IHByZXZpb3VzV29ybGRTZWN0aW9uID0gc25hcHNob3QuZG9jdW1lbnQuc2VjdGlvbnNcbiAgICAuc2xpY2UoMCwgc2VjdGlvbkluZGV4KVxuICAgIC5yZXZlcnNlKClcbiAgICAuZmluZCgoaXRlbSkgPT4gaXRlbS53b3JsZC5tb2RlID09PSAnc2V0Jyk7XG4gIGNvbnN0IHNvdXJjZVNoYXBlID0gQUJPVVRfTkFSUkFUSVZFX1NIQVBFX0RFRklOSVRJT05TW3ByZXZpb3VzV29ybGRTZWN0aW9uPy53b3JsZC5zaGFwZUlkIHx8IHdvcmxkLnNoYXBlSWRdO1xuICBjb25zdCBwcmVwYXJlZCA9IHJ1bnRpbWVNZXRyaWNzPy5wcmVwYXJlZFdvcmxkSWRzPy5pbmNsdWRlcyhzZWN0aW9uLmlkKTtcbiAgY29uc3QgY29ycmVzcG9uZGVuY2VTdGF0dXMgPSBydW50aW1lTWV0cmljcz8uY29ycmVzcG9uZGVuY2VTZXF1ZW5jZVN0YXRlID09PSAnZmFpbGVkJ1xuICAgID8gJ0ZhaWxlZCdcbiAgICA6IHJ1bnRpbWVNZXRyaWNzPy5jb3JyZXNwb25kZW5jZVNlcXVlbmNlU3RhdGUgPT09ICdsb2FkaW5nJ1xuICAgICAgPyAnUHJlcGFyaW5nJ1xuICAgICAgOiBwcmVwYXJlZFxuICAgICAgICA/IHJ1bnRpbWVNZXRyaWNzPy5jb3JyZXNwb25kZW5jZUZhbGxiYWNrICYmIHJ1bnRpbWVNZXRyaWNzPy5jb3JyZXNwb25kZW5jZVRvV29ybGRJZCA9PT0gc2VjdGlvbi5pZFxuICAgICAgICAgID8gJ0Jhc2VsaW5lIGZhbGxiYWNrJ1xuICAgICAgICAgIDogJ1JlYWR5J1xuICAgICAgICA6ICdQcmVwYXJpbmcnO1xuICBjb25zdCB1cGRhdGUgPSAobGFiZWwsIG11dGF0ZSwgY29hbGVzY2VLZXkgPSBudWxsKSA9PiBzdG9yZS5jb21taXQobGFiZWwsIChkcmFmdCkgPT4gbXV0YXRlKGRyYWZ0LnNlY3Rpb25zW3NlY3Rpb25JbmRleF0ud29ybGQpLCB7IGNvYWxlc2NlS2V5LCBzZWxlY3Rpb246IHNuYXBzaG90LnNlbGVjdGlvbiB9KTtcbiAgY29uc3QgdHJ5U2hhcGUgPSAoc2hhcGVJZCkgPT4gc3RvcmUuYmVnaW5UcnkoYFJlcGxhY2UgU2hhcGUgd2l0aCAke0FCT1VUX05BUlJBVElWRV9TSEFQRV9ERUZJTklUSU9OU1tzaGFwZUlkXS5sYWJlbH1gLCAoZHJhZnQpID0+IHtcbiAgICBjb25zdCB0YXJnZXQgPSBkcmFmdC5zZWN0aW9uc1tzZWN0aW9uSW5kZXhdLndvcmxkO1xuICAgIHRhcmdldC5zaGFwZUlkID0gc2hhcGVJZDtcbiAgICB0YXJnZXQuc2hhcGVQYXJhbWV0ZXJzID0gT2JqZWN0LmZyb21FbnRyaWVzKEFCT1VUX05BUlJBVElWRV9TSEFQRV9ERUZJTklUSU9OU1tzaGFwZUlkXS5wYXJhbWV0ZXJzLm1hcCgoY29udHJvbCkgPT4gW2NvbnRyb2wuaWQsIGNvbnRyb2wuaWQgPT09ICdkZW5zaXR5JyA/IDEgOiAoY29udHJvbC5taW4gKyBjb250cm9sLm1heCkgLyAyXSkpO1xuICB9KTtcbiAgcmV0dXJuIChcbiAgICA8PlxuICAgICAgPGhlYWRlcj48c3Bhbj5Xb3JsZCBjbGlwPC9zcGFuPjxzdHJvbmc+e3NoYXBlPy5sYWJlbCB8fCB3b3JsZC5zaGFwZUlkfTwvc3Ryb25nPjwvaGVhZGVyPlxuICAgICAgPGRpdiBjbGFzc05hbWU9XCJhYm91dC1lZGl0b3Itc2hhcGUtY2F0YWxvZ1wiPlxuICAgICAgICB7T2JqZWN0LnZhbHVlcyhBQk9VVF9OQVJSQVRJVkVfU0hBUEVfREVGSU5JVElPTlMpLm1hcCgoaXRlbSkgPT4gKFxuICAgICAgICAgIDxidXR0b24gdHlwZT1cImJ1dHRvblwiIGtleT17aXRlbS5pZH0gZGlzYWJsZWQ9e3NlY3Rpb24ubG9ja2VkfSBjbGFzc05hbWU9e2l0ZW0uaWQgPT09IHdvcmxkLnNoYXBlSWQgPyAnaXMtc2VsZWN0ZWQnIDogJyd9IG9uQ2xpY2s9eygpID0+IHRyeVNoYXBlKGl0ZW0uaWQpfT5cbiAgICAgICAgICAgIDxpIC8+PHNwYW4+PHN0cm9uZz57aXRlbS5sYWJlbH08L3N0cm9uZz48c21hbGw+Q29zdCB7aXRlbS5jb3N0fSDCtyBQb2ludCBmaWVsZDwvc21hbGw+PC9zcGFuPlxuICAgICAgICAgIDwvYnV0dG9uPlxuICAgICAgICApKX1cbiAgICAgIDwvZGl2PlxuICAgICAge3NuYXBzaG90LnRyeVN0YXRlID8gPGRpdiBjbGFzc05hbWU9XCJhYm91dC1lZGl0b3ItdHJ5XCI+PHNwYW4+VHJ5aW5nIHtzbmFwc2hvdC50cnlTdGF0ZS5sYWJlbH08L3NwYW4+PGJ1dHRvbiB0eXBlPVwiYnV0dG9uXCIgb25DbGljaz17KCkgPT4gc3RvcmUuY2FuY2VsVHJ5KCl9PkNhbmNlbDwvYnV0dG9uPjxidXR0b24gdHlwZT1cImJ1dHRvblwiIGNsYXNzTmFtZT1cImlzLXByaW1hcnlcIiBvbkNsaWNrPXsoKSA9PiBzdG9yZS5hcHBseVRyeSgpfT5BcHBseTwvYnV0dG9uPjwvZGl2PiA6IG51bGx9XG4gICAgICA8ZGV0YWlscyBvcGVuPjxzdW1tYXJ5PlNoYXBlIHBhcmFtZXRlcnM8L3N1bW1hcnk+XG4gICAgICAgIHsoc2hhcGU/LnBhcmFtZXRlcnMgfHwgW10pLm1hcCgoY29udHJvbCkgPT4gPE51bWJlclByb3BlcnR5IGtleT17Y29udHJvbC5pZH0gbGFiZWw9e2NvbnRyb2wubGFiZWx9IHZhbHVlPXt3b3JsZC5zaGFwZVBhcmFtZXRlcnNbY29udHJvbC5pZF19IG1pbj17Y29udHJvbC5taW59IG1heD17Y29udHJvbC5tYXh9IHN0ZXA9e2NvbnRyb2wuc3RlcH0gdW5pdD17Y29udHJvbC51bml0fSBvbkNoYW5nZT17KHZhbHVlKSA9PiB1cGRhdGUoYENoYW5nZSAke2NvbnRyb2wubGFiZWx9YCwgKGRyYWZ0KSA9PiB7IGRyYWZ0LnNoYXBlUGFyYW1ldGVyc1tjb250cm9sLmlkXSA9IHZhbHVlOyB9LCBgd29ybGQ6JHtzZWN0aW9uLmlkfToke2NvbnRyb2wuaWR9YCl9IC8+KX1cbiAgICAgICAgPGRpdiBjbGFzc05hbWU9XCJhYm91dC1lZGl0b3ItaW5saW5lLWFjdGlvbnNcIj48YnV0dG9uIHR5cGU9XCJidXR0b25cIiBvbkNsaWNrPXsoKSA9PiB1cGRhdGUoJ1Jlc2VlZCBTaGFwZScsIChkcmFmdCkgPT4geyBkcmFmdC5zZWVkID0gTWF0aC5mbG9vcihNYXRoLnJhbmRvbSgpICogMHhmZmZmZmZmZik7IH0pfT5SZXNlZWQ8L2J1dHRvbj48Y29kZT57d29ybGQuc2VlZH08L2NvZGU+PC9kaXY+XG4gICAgICA8L2RldGFpbHM+XG4gICAgICA8ZGV0YWlscyBvcGVuPjxzdW1tYXJ5PlBsYWNlbWVudDwvc3VtbWFyeT5cbiAgICAgICAgPE51bWJlclByb3BlcnR5IGxhYmVsPVwiRGlzdGFuY2UgYXQgZW50cnlcIiB2YWx1ZT17d29ybGQuZW50cnlEaXN0YW5jZVdVfSBtaW49ezAuMn0gbWF4PXsxNn0gc3RlcD17MC4wNX0gdW5pdD1cIldVXCIgb25DaGFuZ2U9eyh2YWx1ZSkgPT4gdXBkYXRlKCdNb3ZlIFdvcmxkJywgKGRyYWZ0KSA9PiB7IGRyYWZ0LmVudHJ5RGlzdGFuY2VXVSA9IHZhbHVlOyB9LCBgd29ybGQ6JHtzZWN0aW9uLmlkfTpkaXN0YW5jZWApfSAvPlxuICAgICAgICA8TnVtYmVyUHJvcGVydHkgbGFiZWw9XCJTY2FsZVwiIHZhbHVlPXt3b3JsZC50cmFuc2Zvcm0uc2NhbGV9IG1pbj17MC4xfSBtYXg9ezN9IHN0ZXA9ezAuMDF9IG9uQ2hhbmdlPXsodmFsdWUpID0+IHVwZGF0ZSgnU2NhbGUgV29ybGQnLCAoZHJhZnQpID0+IHsgZHJhZnQudHJhbnNmb3JtLnNjYWxlID0gdmFsdWU7IH0sIGB3b3JsZDoke3NlY3Rpb24uaWR9OnNjYWxlYCl9IC8+XG4gICAgICA8L2RldGFpbHM+XG4gICAgICA8ZGV0YWlscyBvcGVuPjxzdW1tYXJ5PlRyYW5zaXRpb24gaW48L3N1bW1hcnk+XG4gICAgICAgIHt0cmFuc2l0aW9uRW5hYmxlZCA/IDw+XG4gICAgICAgICAgPHAgY2xhc3NOYW1lPVwiYWJvdXQtZWRpdG9yLWhlbHBcIj5UaW1pbmcgaXMgcmVsYXRpdmUgdG8gdGhpcyBTZWN0aW9uOiAxIGlzIGl0cyBlbmQ7IHZhbHVlcyBhYm92ZSAxIGNvbnRpbnVlIGFjcm9zcyBpbmhlcml0ZWQgV29ybGQgU2VjdGlvbnMuIFRoZSBuZXh0IFdvcmxkIGJlZ2lucyBhdCB7dHJhbnNpdGlvbkxpbWl0LnRvRml4ZWQoMyl9LjwvcD5cbiAgICAgICAgICA8TnVtYmVyUHJvcGVydHkgbGFiZWw9XCJTdGFydFwiIHZhbHVlPXt3b3JsZC50cmFuc2l0aW9uSW4uc3RhcnR9IG1pbj17MH0gbWF4PXt0cmFuc2l0aW9uTWF4fSBzdGVwPXswLjAwNX0gdW5pdD1cIsOXIHNlY3Rpb25cIiBvbkNoYW5nZT17KHZhbHVlKSA9PiB1cGRhdGUoJ0NoYW5nZSB0cmFuc2l0aW9uIHN0YXJ0JywgKGRyYWZ0KSA9PiB7IGRyYWZ0LnRyYW5zaXRpb25Jbi5zdGFydCA9IE1hdGgubWluKHZhbHVlLCBkcmFmdC50cmFuc2l0aW9uSW4uZW5kKTsgfSl9IC8+XG4gICAgICAgICAgPE51bWJlclByb3BlcnR5IGxhYmVsPVwiRW5kXCIgdmFsdWU9e3dvcmxkLnRyYW5zaXRpb25Jbi5lbmR9IG1pbj17MH0gbWF4PXt0cmFuc2l0aW9uTWF4fSBzdGVwPXswLjAwNX0gdW5pdD1cIsOXIHNlY3Rpb25cIiBvbkNoYW5nZT17KHZhbHVlKSA9PiB1cGRhdGUoJ0NoYW5nZSB0cmFuc2l0aW9uIGVuZCcsIChkcmFmdCkgPT4geyBkcmFmdC50cmFuc2l0aW9uSW4uZW5kID0gTWF0aC5tYXgodmFsdWUsIGRyYWZ0LnRyYW5zaXRpb25Jbi5zdGFydCk7IH0pfSAvPlxuICAgICAgICAgIDxQcm9wZXJ0eSBsYWJlbD1cIlR5cGVcIj48c2VsZWN0IHZhbHVlPXt3b3JsZC50cmFuc2l0aW9uSW4udHlwZX0gb25DaGFuZ2U9eyhldmVudCkgPT4gdXBkYXRlKCdDaGFuZ2UgdHJhbnNpdGlvbiB0eXBlJywgKGRyYWZ0KSA9PiB7IGRyYWZ0LnRyYW5zaXRpb25Jbi50eXBlID0gZXZlbnQudGFyZ2V0LnZhbHVlOyB9KX0+PG9wdGlvbiB2YWx1ZT1cIm1vcnBoXCI+TW9ycGg8L29wdGlvbj48b3B0aW9uIHZhbHVlPVwiZGlzc29sdmUtbW9ycGhcIj5EaXNzb2x2ZSBtb3JwaDwvb3B0aW9uPjxvcHRpb24gdmFsdWU9XCJjcm9zc2ZhZGVcIj5Dcm9zc2ZhZGU8L29wdGlvbj48b3B0aW9uIHZhbHVlPVwiaG9sZFwiPkhvbGQ8L29wdGlvbj48L3NlbGVjdD48L1Byb3BlcnR5PlxuICAgICAgICAgIDxQcm9wZXJ0eSBsYWJlbD1cIkVhc2luZ1wiPjxzZWxlY3QgdmFsdWU9e3dvcmxkLnRyYW5zaXRpb25Jbi5lYXNpbmd9IG9uQ2hhbmdlPXsoZXZlbnQpID0+IHVwZGF0ZSgnQ2hhbmdlIHRyYW5zaXRpb24gZWFzaW5nJywgKGRyYWZ0KSA9PiB7IGRyYWZ0LnRyYW5zaXRpb25Jbi5lYXNpbmcgPSBldmVudC50YXJnZXQudmFsdWU7IH0pfT48b3B0aW9uIHZhbHVlPVwibGluZWFyXCI+TGluZWFyPC9vcHRpb24+PG9wdGlvbiB2YWx1ZT1cInNtb290aHN0ZXBcIj5TbW9vdGhzdGVwPC9vcHRpb24+PG9wdGlvbiB2YWx1ZT1cImVhc2UtaW5cIj5FYXNlIGluPC9vcHRpb24+PG9wdGlvbiB2YWx1ZT1cImVhc2Utb3V0XCI+RWFzZSBvdXQ8L29wdGlvbj48b3B0aW9uIHZhbHVlPVwiZWFzZS1pbi1vdXRcIj5FYXNlIGluIG91dDwvb3B0aW9uPjxvcHRpb24gdmFsdWU9XCJob2xkXCI+SG9sZDwvb3B0aW9uPjwvc2VsZWN0PjwvUHJvcGVydHk+XG4gICAgICAgICAgPHAgY2xhc3NOYW1lPVwiYWJvdXQtZWRpdG9yLWhlbHBcIj5NYXBzIHtzb3VyY2VTaGFwZT8ubGFiZWwgfHwgJ3ByZXZpb3VzIFNoYXBlJ30g4oaSIHtzaGFwZT8ubGFiZWwgfHwgd29ybGQuc2hhcGVJZH0uPC9wPlxuICAgICAgICAgIDxQcm9wZXJ0eSBsYWJlbD1cIkNvcnJlc3BvbmRlbmNlXCI+PHNlbGVjdCBhcmlhLWxhYmVsPVwiQ29ycmVzcG9uZGVuY2VcIiB2YWx1ZT17d29ybGQudHJhbnNpdGlvbkluLmNvcnJlc3BvbmRlbmNlfSBkaXNhYmxlZD17IWNvcnJlc3BvbmRlbmNlRW5hYmxlZH0gdGl0bGU9e2NvcnJlc3BvbmRlbmNlRW5hYmxlZCA/ICdDaG9vc2UgaG93IHNvdXJjZSBwb2ludHMgYXJlIGFzc2lnbmVkIHRvIHRhcmdldCBwb2ludHMuJyA6ICdDb3JyZXNwb25kZW5jZSBhcHBsaWVzIHRvIE1vcnBoIGFuZCBEaXNzb2x2ZSBtb3JwaCB0cmFuc2l0aW9ucy4nfSBvbkNoYW5nZT17KGV2ZW50KSA9PiB1cGRhdGUoJ0NoYW5nZSBjb3JyZXNwb25kZW5jZScsIChkcmFmdCkgPT4geyBkcmFmdC50cmFuc2l0aW9uSW4uY29ycmVzcG9uZGVuY2UgPSBldmVudC50YXJnZXQudmFsdWU7IH0pfT57QUJPVVRfTkFSUkFUSVZFX0NPUlJFU1BPTkRFTkNFX01PREVTLm1hcCgobW9kZSkgPT4gPG9wdGlvbiB2YWx1ZT17bW9kZX0ga2V5PXttb2RlfT57Q09SUkVTUE9OREVOQ0VfTEFCRUxTW21vZGVdIHx8IG1vZGV9PC9vcHRpb24+KX08L3NlbGVjdD48L1Byb3BlcnR5PlxuICAgICAgICAgIDxwIGNsYXNzTmFtZT1cImFib3V0LWVkaXRvci1oZWxwXCIgcm9sZT1cInN0YXR1c1wiIGFyaWEtbGl2ZT1cInBvbGl0ZVwiPkNvcnJlc3BvbmRlbmNlOiB7Y29ycmVzcG9uZGVuY2VTdGF0dXN9e3ByZXBhcmVkICYmIHJ1bnRpbWVNZXRyaWNzPy5jb3JyZXNwb25kZW5jZVRvV29ybGRJZCA9PT0gc2VjdGlvbi5pZCAmJiBOdW1iZXIuaXNGaW5pdGUocnVudGltZU1ldHJpY3M/LmNvcnJlc3BvbmRlbmNlSW1wcm92ZW1lbnQpID8gYCDCtyAke01hdGgucm91bmQocnVudGltZU1ldHJpY3MuY29ycmVzcG9uZGVuY2VJbXByb3ZlbWVudCAqIDEwMCl9JSBSTVMgaW1wcm92ZW1lbnRgIDogJyd9LjwvcD5cbiAgICAgICAgICA8YnV0dG9uIHR5cGU9XCJidXR0b25cIiBjbGFzc05hbWU9XCJhYm91dC1lZGl0b3ItZGFuZ2VyXCIgb25DbGljaz17KCkgPT4gc3RvcmUuY29tbWl0KCdSZW1vdmUgV29ybGQgdHJhbnNpdGlvbicsIChkcmFmdCkgPT4ge1xuICAgICAgICAgICAgY29uc3QgdHJhbnNpdGlvbiA9IGRyYWZ0LnNlY3Rpb25zW3NlY3Rpb25JbmRleF0ud29ybGQudHJhbnNpdGlvbkluO1xuICAgICAgICAgICAgdHJhbnNpdGlvbi5zdGFydCA9IDA7XG4gICAgICAgICAgICB0cmFuc2l0aW9uLmVuZCA9IDA7XG4gICAgICAgICAgICB0cmFuc2l0aW9uLnR5cGUgPSAnY3V0JztcbiAgICAgICAgICB9LCB7IHNlbGVjdGlvbjogeyB0eXBlOiAnd29ybGQnLCBzZWN0aW9uSWQ6IHNlY3Rpb24uaWQgfSB9KX0+UmVtb3ZlIHRyYW5zaXRpb24ga2V5ZnJhbWVzPC9idXR0b24+XG4gICAgICAgIDwvPiA6IDw+XG4gICAgICAgICAgPHAgY2xhc3NOYW1lPVwiYWJvdXQtZWRpdG9yLWhlbHBcIj5UaGlzIFdvcmxkIGN1dHMgaW4gYXQgdGhlIFNlY3Rpb24gYm91bmRhcnkgYW5kIGhhcyBubyB0cmFuc2l0aW9uIGtleWZyYW1lcy48L3A+XG4gICAgICAgICAgPGJ1dHRvbiB0eXBlPVwiYnV0dG9uXCIgY2xhc3NOYW1lPVwiYWJvdXQtZWRpdG9yLXdpZGUtYWN0aW9uXCIgb25DbGljaz17KCkgPT4gc3RvcmUuY29tbWl0KCdBZGQgV29ybGQgdHJhbnNpdGlvbicsIChkcmFmdCkgPT4ge1xuICAgICAgICAgICAgY29uc3QgdHJhbnNpdGlvbiA9IGRyYWZ0LnNlY3Rpb25zW3NlY3Rpb25JbmRleF0ud29ybGQudHJhbnNpdGlvbkluO1xuICAgICAgICAgICAgdHJhbnNpdGlvbi5zdGFydCA9IE1hdGgubWluKDAuMDgsIHRyYW5zaXRpb25MaW1pdCk7XG4gICAgICAgICAgICB0cmFuc2l0aW9uLmVuZCA9IE1hdGgubWluKDAuNjgsIHRyYW5zaXRpb25MaW1pdCk7XG4gICAgICAgICAgICB0cmFuc2l0aW9uLnR5cGUgPSAnbW9ycGgnO1xuICAgICAgICAgIH0sIHsgc2VsZWN0aW9uOiB7IHR5cGU6ICd3b3JsZCcsIHNlY3Rpb25JZDogc2VjdGlvbi5pZCB9IH0pfT5BZGQgdHJhbnNpdGlvbiBrZXlmcmFtZXM8L2J1dHRvbj5cbiAgICAgICAgPC8+fVxuICAgICAgPC9kZXRhaWxzPlxuICAgICAgPGRldGFpbHMgb3Blbj48c3VtbWFyeT5Nb2RpZmllciBzdGFjazwvc3VtbWFyeT5cbiAgICAgICAge3dvcmxkLm1vZGlmaWVycy5tYXAoKGl0ZW0sIG1vZGlmaWVySW5kZXgpID0+IHtcbiAgICAgICAgICBjb25zdCBkZWZpbml0aW9uID0gQUJPVVRfTkFSUkFUSVZFX01PRElGSUVSX0RFRklOSVRJT05TW2l0ZW0uaWRdO1xuICAgICAgICAgIGNvbnN0IG1vdmVNb2RpZmllciA9IChkaXJlY3Rpb24pID0+IHVwZGF0ZSgnUmVvcmRlciBtb2RpZmllcicsIChkcmFmdCkgPT4ge1xuICAgICAgICAgICAgY29uc3QgbmV4dEluZGV4ID0gbW9kaWZpZXJJbmRleCArIGRpcmVjdGlvbjtcbiAgICAgICAgICAgIGlmIChuZXh0SW5kZXggPCAwIHx8IG5leHRJbmRleCA+PSBkcmFmdC5tb2RpZmllcnMubGVuZ3RoKSByZXR1cm47XG4gICAgICAgICAgICBjb25zdCBbbW92ZWRdID0gZHJhZnQubW9kaWZpZXJzLnNwbGljZShtb2RpZmllckluZGV4LCAxKTtcbiAgICAgICAgICAgIGRyYWZ0Lm1vZGlmaWVycy5zcGxpY2UobmV4dEluZGV4LCAwLCBtb3ZlZCk7XG4gICAgICAgICAgfSk7XG4gICAgICAgICAgcmV0dXJuIDxkaXYgY2xhc3NOYW1lPVwiYWJvdXQtZWRpdG9yLW1vZGlmaWVyXCIga2V5PXtgJHtpdGVtLmlkfS0ke21vZGlmaWVySW5kZXh9YH0+PGRpdj48bGFiZWw+PGlucHV0IHR5cGU9XCJjaGVja2JveFwiIGNoZWNrZWQ9e2l0ZW0uZW5hYmxlZH0gb25DaGFuZ2U9eyhldmVudCkgPT4gdXBkYXRlKGBUb2dnbGUgJHtkZWZpbml0aW9uPy5sYWJlbH1gLCAoZHJhZnQpID0+IHsgZHJhZnQubW9kaWZpZXJzW21vZGlmaWVySW5kZXhdLmVuYWJsZWQgPSBldmVudC50YXJnZXQuY2hlY2tlZDsgfSl9IC8+e2RlZmluaXRpb24/LmxhYmVsIHx8IGl0ZW0uaWR9PC9sYWJlbD48c3Bhbj48YnV0dG9uIHR5cGU9XCJidXR0b25cIiBkaXNhYmxlZD17bW9kaWZpZXJJbmRleCA9PT0gMH0gb25DbGljaz17KCkgPT4gbW92ZU1vZGlmaWVyKC0xKX0gYXJpYS1sYWJlbD1cIk1vdmUgbW9kaWZpZXIgdXBcIj7ihpE8L2J1dHRvbj48YnV0dG9uIHR5cGU9XCJidXR0b25cIiBkaXNhYmxlZD17bW9kaWZpZXJJbmRleCA9PT0gd29ybGQubW9kaWZpZXJzLmxlbmd0aCAtIDF9IG9uQ2xpY2s9eygpID0+IG1vdmVNb2RpZmllcigxKX0gYXJpYS1sYWJlbD1cIk1vdmUgbW9kaWZpZXIgZG93blwiPuKGkzwvYnV0dG9uPiBDb3N0IHtkZWZpbml0aW9uPy5jb3N0IHx8ICc/J308L3NwYW4+PC9kaXY+eyhkZWZpbml0aW9uPy5wYXJhbWV0ZXJzIHx8IFtdKS5tYXAoKGNvbnRyb2wpID0+IGNvbnRyb2wudHlwZSA9PT0gJ3JhbmdlJyA/IDxOdW1iZXJQcm9wZXJ0eSBrZXk9e2NvbnRyb2wuaWR9IGxhYmVsPXtjb250cm9sLmxhYmVsfSB2YWx1ZT17aXRlbS5wYXJhbWV0ZXJzW2NvbnRyb2wuaWRdfSBtaW49e2NvbnRyb2wubWlufSBtYXg9e2NvbnRyb2wubWF4fSBzdGVwPXtjb250cm9sLnN0ZXB9IHVuaXQ9e2NvbnRyb2wudW5pdH0gb25DaGFuZ2U9eyh2YWx1ZSkgPT4gdXBkYXRlKGBDaGFuZ2UgJHtjb250cm9sLmxhYmVsfWAsIChkcmFmdCkgPT4geyBkcmFmdC5tb2RpZmllcnNbbW9kaWZpZXJJbmRleF0ucGFyYW1ldGVyc1tjb250cm9sLmlkXSA9IHZhbHVlOyB9LCBgbW9kaWZpZXI6JHtzZWN0aW9uLmlkfToke21vZGlmaWVySW5kZXh9OiR7Y29udHJvbC5pZH1gKX0gLz4gOiA8UHJvcGVydHkga2V5PXtjb250cm9sLmlkfSBsYWJlbD17Y29udHJvbC5sYWJlbH0+PHNlbGVjdCB2YWx1ZT17aXRlbS5wYXJhbWV0ZXJzW2NvbnRyb2wuaWRdfSBvbkNoYW5nZT17KGV2ZW50KSA9PiB1cGRhdGUoYENoYW5nZSAke2NvbnRyb2wubGFiZWx9YCwgKGRyYWZ0KSA9PiB7IGRyYWZ0Lm1vZGlmaWVyc1ttb2RpZmllckluZGV4XS5wYXJhbWV0ZXJzW2NvbnRyb2wuaWRdID0gZXZlbnQudGFyZ2V0LnZhbHVlOyB9KX0+e2NvbnRyb2wub3B0aW9ucy5tYXAoKG9wdGlvbikgPT4gPG9wdGlvbiBrZXk9e29wdGlvbn0+e29wdGlvbn08L29wdGlvbj4pfTwvc2VsZWN0PjwvUHJvcGVydHk+KX08L2Rpdj47XG4gICAgICAgIH0pfVxuICAgICAgPC9kZXRhaWxzPlxuICAgIDwvPlxuICApO1xufVxuXG5mdW5jdGlvbiBEaWFnbm9zdGljcyh7IGRpYWdub3N0aWNzIH0pIHtcbiAgaWYgKCFkaWFnbm9zdGljcy5sZW5ndGgpIHJldHVybiA8ZGl2IGNsYXNzTmFtZT1cImFib3V0LWVkaXRvci1kaWFnbm9zdGljcyBpcy1jbGVhclwiPjxDaGVjayBhcmlhLWhpZGRlbj1cInRydWVcIiAvPiBObyBkaWFnbm9zdGljczwvZGl2PjtcbiAgcmV0dXJuIDxkaXYgY2xhc3NOYW1lPVwiYWJvdXQtZWRpdG9yLWRpYWdub3N0aWNzXCI+e2RpYWdub3N0aWNzLm1hcCgoaXRlbSwgaW5kZXgpID0+IHtcbiAgICBjb25zdCBEaWFnbm9zdGljSWNvbiA9IGl0ZW0ubGV2ZWwgPT09ICdlcnJvcicgPyBDaXJjbGVBbGVydCA6IEluZm87XG4gICAgcmV0dXJuIDxkaXYga2V5PXtgJHtpdGVtLmNvZGV9LSR7aXRlbS5wYXRofS0ke2luZGV4fWB9IGNsYXNzTmFtZT17YGlzLSR7aXRlbS5sZXZlbH1gfT48RGlhZ25vc3RpY0ljb24gYXJpYS1oaWRkZW49XCJ0cnVlXCIgLz48c3Bhbj48c3Ryb25nPntpdGVtLm1lc3NhZ2V9PC9zdHJvbmc+PHNtYWxsPntpdGVtLnBhdGh9PC9zbWFsbD48L3NwYW4+PC9kaXY+O1xuICB9KX08L2Rpdj47XG59XG5cbmZ1bmN0aW9uIEF1ZGl0aW9uQ29udHJvbHMoeyBzdG9yZSwgc25hcHNob3QgfSkge1xuICBjb25zdCBbcHJlUm9sbFdVLCBzZXRQcmVSb2xsV1VdID0gdXNlU3RhdGUoMC4xOCk7XG4gIGNvbnN0IFtwb3N0Um9sbFdVLCBzZXRQb3N0Um9sbFdVXSA9IHVzZVN0YXRlKDAuMTgpO1xuICBjb25zdCBtZW1iZXJzID0gZ2V0QWJvdXROYXJyYXRpdmVTZWxlY3Rpb25NZW1iZXJzKHNuYXBzaG90LnNlbGVjdGlvbik7XG4gIGNvbnN0IHNvdXJjZSA9IHNuYXBzaG90LnNlbGVjdGlvbi50eXBlID09PSAnY3VlJ1xuICAgID8geyB0eXBlOiAnY3VlLWdyb3VwJywgc2VjdGlvbklkOiBzbmFwc2hvdC5zZWxlY3Rpb24uc2VjdGlvbklkLCBtZW1iZXJzLCBwcmltYXJ5OiBzbmFwc2hvdC5zZWxlY3Rpb24gfVxuICAgIDogWydzZWN0aW9uJywgJ3dvcmxkJywgJ2NhbWVyYS1rZXknXS5pbmNsdWRlcyhzbmFwc2hvdC5zZWxlY3Rpb24udHlwZSlcbiAgICAgID8gc25hcHNob3Quc2VsZWN0aW9uXG4gICAgICA6IG51bGw7XG4gIGlmICghc291cmNlKSByZXR1cm4gbnVsbDtcbiAgY29uc3QgcmFuZ2UgPSBkZXJpdmVBYm91dE5hcnJhdGl2ZUxvb3BSYW5nZSh7XG4gICAgZG9jdW1lbnQ6IHNuYXBzaG90LmRvY3VtZW50LFxuICAgIHBsYW46IHNuYXBzaG90LmNvbXBpbGVkUGxhbixcbiAgICBzb3VyY2UsXG4gICAgcHJlUm9sbFdVLFxuICAgIHBvc3RSb2xsV1UsXG4gIH0pO1xuICBjb25zdCBhY3RpdmUgPSByYW5nZS52YWxpZFxuICAgICYmIHNuYXBzaG90LnRyYW5zcG9ydC5sb29wPy5zb3VyY2VUeXBlID09PSByYW5nZS5zb3VyY2VUeXBlXG4gICAgJiYgc25hcHNob3QudHJhbnNwb3J0Lmxvb3A/LnNvdXJjZUlkID09PSByYW5nZS5zb3VyY2VJZDtcbiAgY29uc3QgdG9nZ2xlID0gKCkgPT4ge1xuICAgIGlmIChhY3RpdmUpIHtcbiAgICAgIHN0b3JlLnNldFRyYW5zcG9ydCh7IG93bmVyOiAndGltZWxpbmUnLCBwbGF5aW5nOiBmYWxzZSwgbG9vcDogbnVsbCB9KTtcbiAgICAgIHJldHVybjtcbiAgICB9XG4gICAgaWYgKCFyYW5nZS52YWxpZCkgcmV0dXJuO1xuICAgIHN0b3JlLnNldFRyYW5zcG9ydCh7XG4gICAgICBvd25lcjogJ3BsYXliYWNrJyxcbiAgICAgIHBsYXlpbmc6IHRydWUsXG4gICAgICBsaXZlQW1iaWVudDogZmFsc2UsXG4gICAgICBzdG9yeVdVOiByYW5nZS5zdGFydFdVLFxuICAgICAgbG9vcDogcmFuZ2UsXG4gICAgfSk7XG4gIH07XG4gIHJldHVybiAoXG4gICAgPGRldGFpbHMgY2xhc3NOYW1lPVwiYWJvdXQtZWRpdG9yLWF1ZGl0aW9uXCI+XG4gICAgICA8c3VtbWFyeT5Cb3VuZGFyeSBhdWRpdGlvbjwvc3VtbWFyeT5cbiAgICAgIDxkaXYgY2xhc3NOYW1lPVwiYWJvdXQtZWRpdG9yLWF1ZGl0aW9uLXJhbmdlXCI+XG4gICAgICAgIDxQcm9wZXJ0eSBsYWJlbD1cIlByZS1yb2xsXCI+PGlucHV0IHR5cGU9XCJudW1iZXJcIiBtaW49XCIwXCIgbWF4PVwiMlwiIHN0ZXA9XCIwLjA1XCIgdmFsdWU9e3ByZVJvbGxXVX0gb25DaGFuZ2U9eyhldmVudCkgPT4gc2V0UHJlUm9sbFdVKE1hdGgubWF4KDAsIE51bWJlcihldmVudC50YXJnZXQudmFsdWUpIHx8IDApKX0gLz48L1Byb3BlcnR5PlxuICAgICAgICA8UHJvcGVydHkgbGFiZWw9XCJQb3N0LXJvbGxcIj48aW5wdXQgdHlwZT1cIm51bWJlclwiIG1pbj1cIjBcIiBtYXg9XCIyXCIgc3RlcD1cIjAuMDVcIiB2YWx1ZT17cG9zdFJvbGxXVX0gb25DaGFuZ2U9eyhldmVudCkgPT4gc2V0UG9zdFJvbGxXVShNYXRoLm1heCgwLCBOdW1iZXIoZXZlbnQudGFyZ2V0LnZhbHVlKSB8fCAwKSl9IC8+PC9Qcm9wZXJ0eT5cbiAgICAgIDwvZGl2PlxuICAgICAge3JhbmdlLnZhbGlkID8gPHAgY2xhc3NOYW1lPVwiYWJvdXQtZWRpdG9yLWhlbHBcIj57Zm9ybWF0V1UocmFuZ2Uuc3RhcnRXVSl9IOKGkiB7Zm9ybWF0V1UocmFuZ2UuZW5kV1UpfSDCtyBhbWJpZW50IG1vdGlvbiBmcmVlemVzIGZvciBhIHJlcGVhdGFibGUgcmV2aWV3LjwvcD4gOiA8cCBjbGFzc05hbWU9XCJhYm91dC1lZGl0b3Itcmh5dGhtLW1lc3NhZ2UgaXMtZXJyb3JcIj57cmFuZ2UucmVhc29ufTwvcD59XG4gICAgICA8YnV0dG9uIHR5cGU9XCJidXR0b25cIiBjbGFzc05hbWU9e2FjdGl2ZSA/ICdpcy1hY3RpdmUgYWJvdXQtZWRpdG9yLXdpZGUtYWN0aW9uJyA6ICdhYm91dC1lZGl0b3Itd2lkZS1hY3Rpb24nfSBkaXNhYmxlZD17IXJhbmdlLnZhbGlkfSBvbkNsaWNrPXt0b2dnbGV9PnthY3RpdmUgPyAnU3RvcCBhdWRpdGlvbicgOiAnTG9vcCB0aGlzIHNlbGVjdGlvbid9PC9idXR0b24+XG4gICAgPC9kZXRhaWxzPlxuICApO1xufVxuXG5mdW5jdGlvbiBJbnNwZWN0b3IoeyBzdG9yZSwgc25hcHNob3QsIHRpbWVsaW5lT3BlbiwgcnVudGltZU1ldHJpY3MsIGNsaXBib2FyZCwgc2V0Q2xpcGJvYXJkIH0pIHtcbiAgY29uc3QgaW5zcGVjdG9yUmVmID0gdXNlUmVmKG51bGwpO1xuICBjb25zdCBkcmFnUmVmID0gdXNlUmVmKG51bGwpO1xuICBjb25zdCBsYXN0SGVhZGVyQ2xpY2tSZWYgPSB1c2VSZWYobnVsbCk7XG4gIGNvbnN0IFtwb3NpdGlvbiwgc2V0UG9zaXRpb25dID0gdXNlU3RhdGUobnVsbCk7XG4gIGNvbnN0IFtkcmFnZ2luZywgc2V0RHJhZ2dpbmddID0gdXNlU3RhdGUoZmFsc2UpO1xuICBjb25zdCBzZWN0aW9uID0gZ2V0U2VjdGlvbihzbmFwc2hvdC5kb2N1bWVudCwgc25hcHNob3Quc2VsZWN0aW9uKTtcbiAgbGV0IGNvbnRlbnQgPSA8U2VjdGlvbkluc3BlY3RvciBzdG9yZT17c3RvcmV9IHNuYXBzaG90PXtzbmFwc2hvdH0gc2VjdGlvbj17c2VjdGlvbn0gLz47XG4gIGlmIChzbmFwc2hvdC5zZWxlY3Rpb24udHlwZSA9PT0gJ3NlcXVlbmNlJykgY29udGVudCA9IDxTZXF1ZW5jZUluc3BlY3RvciBzdG9yZT17c3RvcmV9IHNuYXBzaG90PXtzbmFwc2hvdH0gLz47XG4gIGlmIChzbmFwc2hvdC5zZWxlY3Rpb24udHlwZSA9PT0gJ2N1ZScpIGNvbnRlbnQgPSA8Q3VlSW5zcGVjdG9yIHN0b3JlPXtzdG9yZX0gc25hcHNob3Q9e3NuYXBzaG90fSBzZWN0aW9uPXtzZWN0aW9ufSBjbGlwYm9hcmQ9e2NsaXBib2FyZH0gc2V0Q2xpcGJvYXJkPXtzZXRDbGlwYm9hcmR9IC8+O1xuICBpZiAoc25hcHNob3Quc2VsZWN0aW9uLnR5cGUgPT09ICdkaXNjaXBsaW5lLXJldmVhbCcpIGNvbnRlbnQgPSA8RGlzY2lwbGluZVJldmVhbEluc3BlY3RvciBzdG9yZT17c3RvcmV9IHNuYXBzaG90PXtzbmFwc2hvdH0gc2VjdGlvbj17c2VjdGlvbn0gLz47XG4gIGlmIChzbmFwc2hvdC5zZWxlY3Rpb24udHlwZSA9PT0gJ2NhbWVyYS1rZXknKSBjb250ZW50ID0gPENhbWVyYUluc3BlY3RvciBzdG9yZT17c3RvcmV9IHNuYXBzaG90PXtzbmFwc2hvdH0gc2VjdGlvbj17c2VjdGlvbn0gLz47XG4gIGlmIChzbmFwc2hvdC5zZWxlY3Rpb24udHlwZSA9PT0gJ3dvcmxkJykgY29udGVudCA9IDxXb3JsZEluc3BlY3RvciBzdG9yZT17c3RvcmV9IHNuYXBzaG90PXtzbmFwc2hvdH0gc2VjdGlvbj17c2VjdGlvbn0gcnVudGltZU1ldHJpY3M9e3J1bnRpbWVNZXRyaWNzfSAvPjtcbiAgaWYgKHNuYXBzaG90LnNlbGVjdGlvbi50eXBlID09PSAnaW50ZXJhY3Rpb24nKSBjb250ZW50ID0gPFNlY3Rpb25JbnNwZWN0b3Igc3RvcmU9e3N0b3JlfSBzbmFwc2hvdD17c25hcHNob3R9IHNlY3Rpb249e3NlY3Rpb259IC8+O1xuXG4gIHVzZUVmZmVjdCgoKSA9PiB7XG4gICAgY29uc3Qga2VlcEluQm91bmRzID0gKCkgPT4ge1xuICAgICAgaWYgKHdpbmRvdy5pbm5lcldpZHRoIDwgNzYwKSB7XG4gICAgICAgIHNldFBvc2l0aW9uKG51bGwpO1xuICAgICAgICByZXR1cm47XG4gICAgICB9XG4gICAgICBzZXRQb3NpdGlvbigoY3VycmVudCkgPT4gKFxuICAgICAgICBjdXJyZW50ICYmIGluc3BlY3RvclJlZi5jdXJyZW50XG4gICAgICAgICAgPyBjbGFtcEluc3BlY3RvclBvc2l0aW9uKGluc3BlY3RvclJlZi5jdXJyZW50LCBjdXJyZW50LCB0aW1lbGluZU9wZW4pXG4gICAgICAgICAgOiBjdXJyZW50XG4gICAgICApKTtcbiAgICB9O1xuICAgIGtlZXBJbkJvdW5kcygpO1xuICAgIHdpbmRvdy5hZGRFdmVudExpc3RlbmVyKCdyZXNpemUnLCBrZWVwSW5Cb3VuZHMpO1xuICAgIHJldHVybiAoKSA9PiB3aW5kb3cucmVtb3ZlRXZlbnRMaXN0ZW5lcigncmVzaXplJywga2VlcEluQm91bmRzKTtcbiAgfSwgW3RpbWVsaW5lT3Blbl0pO1xuXG4gIGNvbnN0IGJlZ2luRHJhZyA9IChldmVudCkgPT4ge1xuICAgIGlmIChldmVudC5idXR0b24gIT09IDAgfHwgd2luZG93LmlubmVyV2lkdGggPCA3NjAgfHwgIWV2ZW50LnRhcmdldC5jbG9zZXN0KCdoZWFkZXInKSkgcmV0dXJuO1xuICAgIGNvbnN0IGluc3BlY3RvciA9IGluc3BlY3RvclJlZi5jdXJyZW50O1xuICAgIGlmICghaW5zcGVjdG9yKSByZXR1cm47XG4gICAgY29uc3QgcmVjdCA9IGluc3BlY3Rvci5nZXRCb3VuZGluZ0NsaWVudFJlY3QoKTtcbiAgICBjb25zdCB7IG1pblRvcCwgbWF4Qm90dG9tIH0gPSBnZXRJbnNwZWN0b3JWZXJ0aWNhbEJvdW5kcyhpbnNwZWN0b3IsIHRpbWVsaW5lT3Blbik7XG4gICAgY29uc3QgYXZhaWxhYmxlSGVpZ2h0ID0gbWF4Qm90dG9tIC0gbWluVG9wO1xuICAgIGNvbnN0IGZsb2F0aW5nSGVpZ2h0ID0gTWF0aC5taW4ocmVjdC5oZWlnaHQsIDU2MCwgTWF0aC5tYXgoMjQwLCBhdmFpbGFibGVIZWlnaHQgKiAwLjcyKSk7XG4gICAgY29uc3Qgc3RhcnQgPSBjbGFtcEluc3BlY3RvclBvc2l0aW9uKGluc3BlY3Rvciwge1xuICAgICAgbGVmdDogcmVjdC5sZWZ0LFxuICAgICAgdG9wOiByZWN0LnRvcCxcbiAgICAgIHdpZHRoOiByZWN0LndpZHRoLFxuICAgICAgaGVpZ2h0OiBmbG9hdGluZ0hlaWdodCxcbiAgICB9LCB0aW1lbGluZU9wZW4pO1xuICAgIGRyYWdSZWYuY3VycmVudCA9IHtcbiAgICAgIHBvaW50ZXJJZDogZXZlbnQucG9pbnRlcklkLFxuICAgICAgb3JpZ2luWDogZXZlbnQuY2xpZW50WCxcbiAgICAgIG9yaWdpblk6IGV2ZW50LmNsaWVudFksXG4gICAgICBzdGFydCxcbiAgICAgIG1vdmVkOiBmYWxzZSxcbiAgICB9O1xuICAgIGluc3BlY3Rvci5zZXRQb2ludGVyQ2FwdHVyZShldmVudC5wb2ludGVySWQpO1xuICB9O1xuXG4gIGNvbnN0IG1vdmVEcmFnID0gKGV2ZW50KSA9PiB7XG4gICAgY29uc3QgZHJhZyA9IGRyYWdSZWYuY3VycmVudDtcbiAgICBjb25zdCBpbnNwZWN0b3IgPSBpbnNwZWN0b3JSZWYuY3VycmVudDtcbiAgICBpZiAoIWRyYWcgfHwgIWluc3BlY3RvciB8fCBkcmFnLnBvaW50ZXJJZCAhPT0gZXZlbnQucG9pbnRlcklkKSByZXR1cm47XG4gICAgY29uc3QgZGVsdGFYID0gZXZlbnQuY2xpZW50WCAtIGRyYWcub3JpZ2luWDtcbiAgICBjb25zdCBkZWx0YVkgPSBldmVudC5jbGllbnRZIC0gZHJhZy5vcmlnaW5ZO1xuICAgIGlmICghZHJhZy5tb3ZlZCAmJiBNYXRoLmh5cG90KGRlbHRhWCwgZGVsdGFZKSA8IDMpIHJldHVybjtcbiAgICBkcmFnLm1vdmVkID0gdHJ1ZTtcbiAgICBzZXREcmFnZ2luZyh0cnVlKTtcbiAgICBzZXRQb3NpdGlvbihjbGFtcEluc3BlY3RvclBvc2l0aW9uKGluc3BlY3Rvciwge1xuICAgICAgLi4uZHJhZy5zdGFydCxcbiAgICAgIGxlZnQ6IGRyYWcuc3RhcnQubGVmdCArIGRlbHRhWCxcbiAgICAgIHRvcDogZHJhZy5zdGFydC50b3AgKyBkZWx0YVksXG4gICAgfSwgdGltZWxpbmVPcGVuKSk7XG4gIH07XG5cbiAgY29uc3QgZW5kRHJhZyA9IChldmVudCkgPT4ge1xuICAgIGNvbnN0IGRyYWcgPSBkcmFnUmVmLmN1cnJlbnQ7XG4gICAgaWYgKGRyYWc/LnBvaW50ZXJJZCAhPT0gZXZlbnQucG9pbnRlcklkKSByZXR1cm47XG4gICAgaWYgKCFkcmFnLm1vdmVkKSB7XG4gICAgICBjb25zdCBub3cgPSBwZXJmb3JtYW5jZS5ub3coKTtcbiAgICAgIGNvbnN0IHByZXZpb3VzID0gbGFzdEhlYWRlckNsaWNrUmVmLmN1cnJlbnQ7XG4gICAgICBpZiAocHJldmlvdXMgJiYgbm93IC0gcHJldmlvdXMudGltZSA8IDM2MFxuICAgICAgICAmJiBNYXRoLmh5cG90KGV2ZW50LmNsaWVudFggLSBwcmV2aW91cy54LCBldmVudC5jbGllbnRZIC0gcHJldmlvdXMueSkgPCA2KSB7XG4gICAgICAgIHNldFBvc2l0aW9uKG51bGwpO1xuICAgICAgICBsYXN0SGVhZGVyQ2xpY2tSZWYuY3VycmVudCA9IG51bGw7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBsYXN0SGVhZGVyQ2xpY2tSZWYuY3VycmVudCA9IHsgdGltZTogbm93LCB4OiBldmVudC5jbGllbnRYLCB5OiBldmVudC5jbGllbnRZIH07XG4gICAgICB9XG4gICAgfVxuICAgIGRyYWdSZWYuY3VycmVudCA9IG51bGw7XG4gICAgc2V0RHJhZ2dpbmcoZmFsc2UpO1xuICAgIGlmIChpbnNwZWN0b3JSZWYuY3VycmVudD8uaGFzUG9pbnRlckNhcHR1cmUoZXZlbnQucG9pbnRlcklkKSkge1xuICAgICAgaW5zcGVjdG9yUmVmLmN1cnJlbnQucmVsZWFzZVBvaW50ZXJDYXB0dXJlKGV2ZW50LnBvaW50ZXJJZCk7XG4gICAgfVxuICB9O1xuXG4gIGNvbnN0IHJlc2V0UG9zaXRpb24gPSAoKSA9PiBzZXRQb3NpdGlvbihudWxsKTtcblxuICByZXR1cm4gKFxuICAgIDxhc2lkZVxuICAgICAgcmVmPXtpbnNwZWN0b3JSZWZ9XG4gICAgICBjbGFzc05hbWU9e2BhYm91dC1lZGl0b3ItaW5zcGVjdG9yJHtkcmFnZ2luZyA/ICcgaXMtZHJhZ2dpbmcnIDogJyd9YH1cbiAgICAgIGRhdGEtZmxvYXRpbmc9e3Bvc2l0aW9uID8gJ3RydWUnIDogJ2ZhbHNlJ31cbiAgICAgIHN0eWxlPXtwb3NpdGlvbiA/IHtcbiAgICAgICAgbGVmdDogcG9zaXRpb24ubGVmdCxcbiAgICAgICAgdG9wOiBwb3NpdGlvbi50b3AsXG4gICAgICAgIHJpZ2h0OiAnYXV0bycsXG4gICAgICAgIGJvdHRvbTogJ2F1dG8nLFxuICAgICAgICB3aWR0aDogcG9zaXRpb24ud2lkdGgsXG4gICAgICAgIGhlaWdodDogcG9zaXRpb24uaGVpZ2h0LFxuICAgICAgfSA6IHVuZGVmaW5lZH1cbiAgICAgIG9uUG9pbnRlckRvd249e2JlZ2luRHJhZ31cbiAgICAgIG9uUG9pbnRlck1vdmU9e21vdmVEcmFnfVxuICAgICAgb25Qb2ludGVyVXA9e2VuZERyYWd9XG4gICAgICBvblBvaW50ZXJDYW5jZWw9e2VuZERyYWd9XG4gICAgICBvbkRvdWJsZUNsaWNrPXtyZXNldFBvc2l0aW9ufVxuICAgID48ZGl2IGNsYXNzTmFtZT1cImFib3V0LWVkaXRvci1pbnNwZWN0b3Itc2Nyb2xsXCI+e2NvbnRlbnR9PEF1ZGl0aW9uQ29udHJvbHMgc3RvcmU9e3N0b3JlfSBzbmFwc2hvdD17c25hcHNob3R9IC8+PERpYWdub3N0aWNzIGRpYWdub3N0aWNzPXtzbmFwc2hvdC5kaWFnbm9zdGljc30gLz48L2Rpdj48L2FzaWRlPlxuICApO1xufVxuXG5mdW5jdGlvbiBDYW1lcmFQYXRoT3ZlcmxheSh7IHNuYXBzaG90IH0pIHtcbiAgY29uc3Qgc2VjdGlvbnMgPSBzbmFwc2hvdC5jb21waWxlZFBsYW4/LnNlY3Rpb25zIHx8IFtdO1xuICBjb25zdCB0b3RhbCA9IHNuYXBzaG90LmNvbXBpbGVkUGxhbj8ubWF4U3RvcnlXVSB8fCAxO1xuICByZXR1cm4gKFxuICAgIDxkaXYgY2xhc3NOYW1lPVwiYWJvdXQtZWRpdG9yLXBhdGgtb3ZlcmxheVwiIGFyaWEtbGFiZWw9XCJDYW1lcmEgcGF0aCBvdmVybGF5XCI+XG4gICAgICA8ZGl2PjxzdHJvbmc+UGF0aCDCtyBjb25zdGFudCBjYWRlbmNlPC9zdHJvbmc+PHNwYW4+e2Zvcm1hdFdVKHNuYXBzaG90LnRyYW5zcG9ydC5zdG9yeVdVKX0gLyB7Zm9ybWF0V1UodG90YWwpfTwvc3Bhbj48L2Rpdj5cbiAgICAgIDxzdmcgdmlld0JveD1cIjAgMCAyNDAgMTEyXCIgcm9sZT1cImltZ1wiIGFyaWEtbGFiZWw9XCJDYW1lcmEgYW5kIFdvcmxkIGFuY2hvcnMgb3ZlciBzdG9yeSBkaXN0YW5jZVwiPlxuICAgICAgICA8cGF0aCBkPVwiTTE4IDU2IEgyMjJcIiAvPlxuICAgICAgICB7c2VjdGlvbnMubWFwKChzZWN0aW9uKSA9PiB7XG4gICAgICAgICAgY29uc3QgeCA9IDE4ICsgKChzZWN0aW9uLnN0YXJ0V1UgLyB0b3RhbCkgKiAyMDQpO1xuICAgICAgICAgIHJldHVybiA8ZyBrZXk9e3NlY3Rpb24uaWR9IHRyYW5zZm9ybT17YHRyYW5zbGF0ZSgke3h9IDU2KWB9PjxsaW5lIHkxPVwiLTEyXCIgeTI9XCIxMlwiIC8+PGNpcmNsZSByPXtzZWN0aW9uLndvcmxkU3RhdGU/LmNoYW5nZXNXb3JsZCA/IDQgOiAyfSAvPjx0aXRsZT57c2VjdGlvbi5sYWJlbH17c2VjdGlvbi53b3JsZFN0YXRlPy5jaGFuZ2VzV29ybGQgPyBgIMK3ICR7c2VjdGlvbi53b3JsZFN0YXRlLmFjdGl2ZVdvcmxkLnNoYXBlSWR9YCA6ICcnfTwvdGl0bGU+PC9nPjtcbiAgICAgICAgfSl9XG4gICAgICAgIDxnIGNsYXNzTmFtZT1cImlzLXBsYXloZWFkXCIgdHJhbnNmb3JtPXtgdHJhbnNsYXRlKCR7MTggKyAoKHNuYXBzaG90LnRyYW5zcG9ydC5zdG9yeVdVIC8gdG90YWwpICogMjA0KX0gNTYpYH0+PHBhdGggZD1cIk0wIC0yMiBMNSAtMTUgSC01IFpcIiAvPjxsaW5lIHkxPVwiLTE1XCIgeTI9XCIyMlwiIC8+PC9nPlxuICAgICAgPC9zdmc+XG4gICAgICA8c21hbGw+RG90cyBhcmUgU2VjdGlvbiBib3VuZGFyaWVzLiBMYXJnZSBkb3RzIGFyZSBmaXhlZCBXb3JsZCBhbmNob3JzLiBUaGUgbWFya2VyIGlzIHRoZSBwdWJsaXNoZWQgY2FtZXJhLjwvc21hbGw+XG4gICAgPC9kaXY+XG4gICk7XG59XG5cbmV4cG9ydCBkZWZhdWx0IGZ1bmN0aW9uIEFib3V0TmFycmF0aXZlRWRpdG9yKHsgc3RvcmUsIHJ1bnRpbWVSZWYsIHJvb3RSZWYgfSkge1xuICBjb25zdCBzbmFwc2hvdCA9IHVzZVN5bmNFeHRlcm5hbFN0b3JlKHN0b3JlLnN1YnNjcmliZSwgc3RvcmUuZ2V0U25hcHNob3QpO1xuICBjb25zdCBbY2hlY2twb2ludHMsIHNldENoZWNrcG9pbnRzXSA9IHVzZVN0YXRlKCgpID0+IHJlYWRBYm91dE5hcnJhdGl2ZUNoZWNrcG9pbnRzKCkpO1xuICBjb25zdCBbY2xpcGJvYXJkLCBzZXRDbGlwYm9hcmRdID0gdXNlU3RhdGUobnVsbCk7XG4gIGNvbnN0IFtydW50aW1lTWV0cmljcywgc2V0UnVudGltZU1ldHJpY3NdID0gdXNlU3RhdGUobnVsbCk7XG4gIGNvbnN0IFtwYXRoVmlzaWJsZSwgc2V0UGF0aFZpc2libGVdID0gdXNlU3RhdGUoZmFsc2UpO1xuICBjb25zdCBbZGlyZWN0b3JWaWV3LCBzZXREaXJlY3RvclZpZXddID0gdXNlU3RhdGUoZmFsc2UpO1xuICBjb25zdCBbbW9iaWxlUGFuZSwgc2V0TW9iaWxlUGFuZV0gPSB1c2VTdGF0ZSgnc2VxdWVuY2UnKTtcbiAgY29uc3QgW3RpbWVsaW5lT3Blbiwgc2V0VGltZWxpbmVPcGVuXSA9IHVzZVN0YXRlKCgpID0+IChcbiAgICB3aW5kb3cubG9jYWxTdG9yYWdlLmdldEl0ZW0oQUJPVVRfRURJVE9SX1RJTUVMSU5FX1NUT1JBR0VfS0VZKSAhPT0gJ2Nsb3NlZCdcbiAgKSk7XG4gIGNvbnN0IGltcG9ydFJlZiA9IHVzZVJlZihudWxsKTtcbiAgY29uc3Qgc25hcHNob3RSZWYgPSB1c2VSZWYoc25hcHNob3QpO1xuICBjb25zdCBhY3RpdmVTZWxlY3Rpb24gPSBzbmFwc2hvdC5zZWxlY3Rpb247XG5cbiAgdXNlRWZmZWN0KCgpID0+IHtcbiAgICBzbmFwc2hvdFJlZi5jdXJyZW50ID0gc25hcHNob3Q7XG4gIH0sIFtzbmFwc2hvdF0pO1xuXG4gIHVzZUVmZmVjdCgoKSA9PiB7XG4gICAgd2luZG93LmxvY2FsU3RvcmFnZS5zZXRJdGVtKEFCT1VUX0VESVRPUl9USU1FTElORV9TVE9SQUdFX0tFWSwgdGltZWxpbmVPcGVuID8gJ29wZW4nIDogJ2Nsb3NlZCcpO1xuICB9LCBbdGltZWxpbmVPcGVuXSk7XG5cbiAgdXNlRWZmZWN0KCgpID0+IHtcbiAgICBjb25zdCByb290ID0gcm9vdFJlZi5jdXJyZW50O1xuICAgIGNvbnN0IHJ1bnRpbWUgPSBydW50aW1lUmVmLmN1cnJlbnQ7XG4gICAgcm9vdD8uc2V0QXR0cmlidXRlKCdkYXRhLWVkaXRvci1hY3RpdmUnLCAndHJ1ZScpO1xuICAgIGxvYWRBYm91dE5hcnJhdGl2ZVNvdXJjZSgpLnRoZW4oKHsgZG9jdW1lbnQsIGhhc2ggfSkgPT4ge1xuICAgICAgY29uc3QgY3VycmVudCA9IHN0b3JlLmdldFNuYXBzaG90KCk7XG4gICAgICBpZiAoIWN1cnJlbnQuZGlydHkpIHN0b3JlLnJlcGxhY2VEb2N1bWVudCgnUmVmcmVzaCBjYW5vbmljYWwgc291cmNlJywgZG9jdW1lbnQpO1xuICAgICAgc3RvcmUuc2V0QmFzZWxpbmUoZG9jdW1lbnQsIGhhc2gpO1xuICAgICAgY29uc3QgcmVjb3ZlcnkgPSByZWFkQWJvdXROYXJyYXRpdmVSZWNvdmVyeURyYWZ0KCk7XG4gICAgICBpZiAocmVjb3ZlcnkgJiYgcmVjb3ZlcnkudGltZXN0YW1wID4gRGF0ZS5ub3coKSAtICgxNCAqIDg2NDAwMDAwKSkge1xuICAgICAgICBzdG9yZS5zZXRSZWNvdmVyeVN0YXRlKHsgYXZhaWxhYmxlOiB0cnVlLCBkcmFmdDogcmVjb3ZlcnksIGVycm9yOiAnJyB9KTtcbiAgICAgIH1cbiAgICB9KS5jYXRjaCgoZXJyb3IpID0+IHN0b3JlLnNldFNhdmVTdGF0ZSh7IHN0YXR1czogJ2ZhaWxlZCcsIG1lc3NhZ2U6IGVycm9yLm1lc3NhZ2UgfSkpO1xuICAgIHJldHVybiAoKSA9PiB7XG4gICAgICByb290Py5yZW1vdmVBdHRyaWJ1dGUoJ2RhdGEtZWRpdG9yLWFjdGl2ZScpO1xuICAgICAgcnVudGltZT8uc2V0RGlyZWN0b3JWaWV3Py4oZmFsc2UpO1xuICAgIH07XG4gIH0sIFtyb290UmVmLCBydW50aW1lUmVmLCBzdG9yZV0pO1xuXG4gIHVzZUVmZmVjdCgoKSA9PiB7XG4gICAgY29uc3Qgcm9vdCA9IHJvb3RSZWYuY3VycmVudDtcbiAgICBpZiAoIXJvb3QpIHJldHVybiB1bmRlZmluZWQ7XG4gICAgcm9vdC5xdWVyeVNlbGVjdG9yQWxsKCcuaXMtZWRpdG9yLXNlbGVjdGVkJykuZm9yRWFjaCgobm9kZSkgPT4gbm9kZS5jbGFzc0xpc3QucmVtb3ZlKCdpcy1lZGl0b3Itc2VsZWN0ZWQnKSk7XG4gICAgZ2V0QWJvdXROYXJyYXRpdmVTZWxlY3Rpb25NZW1iZXJzKGFjdGl2ZVNlbGVjdGlvbikuZm9yRWFjaCgobWVtYmVyKSA9PiB7XG4gICAgICByb290LnF1ZXJ5U2VsZWN0b3IoYFtkYXRhLXRleHQtY3VlPVwiJHtDU1MuZXNjYXBlKG1lbWJlci5jdWVJZCl9XCJdYCk/LmNsYXNzTGlzdC5hZGQoJ2lzLWVkaXRvci1zZWxlY3RlZCcpO1xuICAgIH0pO1xuICAgIHJvb3QuZGF0YXNldC5lZGl0b3JTZWxlY3Rpb25UeXBlID0gYWN0aXZlU2VsZWN0aW9uLnR5cGUgfHwgJyc7XG4gICAgcmV0dXJuICgpID0+IHtcbiAgICAgIHJvb3QucXVlcnlTZWxlY3RvckFsbCgnLmlzLWVkaXRvci1zZWxlY3RlZCcpLmZvckVhY2goKG5vZGUpID0+IG5vZGUuY2xhc3NMaXN0LnJlbW92ZSgnaXMtZWRpdG9yLXNlbGVjdGVkJykpO1xuICAgICAgZGVsZXRlIHJvb3QuZGF0YXNldC5lZGl0b3JTZWxlY3Rpb25UeXBlO1xuICAgIH07XG4gIH0sIFthY3RpdmVTZWxlY3Rpb24sIHJvb3RSZWZdKTtcblxuICB1c2VFZmZlY3QoKCkgPT4ge1xuICAgIGNvbnN0IGludGVydmFsID0gd2luZG93LnNldEludGVydmFsKCgpID0+IHNldFJ1bnRpbWVNZXRyaWNzKHJ1bnRpbWVSZWYuY3VycmVudD8uZ2V0TWV0cmljcz8uKCkgfHwgbnVsbCksIDUwMCk7XG4gICAgcmV0dXJuICgpID0+IHdpbmRvdy5jbGVhckludGVydmFsKGludGVydmFsKTtcbiAgfSwgW3J1bnRpbWVSZWZdKTtcblxuICB1c2VFZmZlY3QoKCkgPT4ge1xuICAgIGlmICghc25hcHNob3QuZGlydHkpIHJldHVybiB1bmRlZmluZWQ7XG4gICAgY29uc3QgdGltZXIgPSB3aW5kb3cuc2V0VGltZW91dCgoKSA9PiB7XG4gICAgICB0cnkge1xuICAgICAgICB3cml0ZUFib3V0TmFycmF0aXZlUmVjb3ZlcnlEcmFmdChzbmFwc2hvdC5kb2N1bWVudCwgc25hcHNob3QuYmFzZWxpbmVIYXNoKTtcbiAgICAgIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgICAgIHN0b3JlLnNldFJlY292ZXJ5U3RhdGUoeyBlcnJvcjogYERyYWZ0IHN0b3JhZ2UgZmFpbGVkOiAke2Vycm9yLm1lc3NhZ2V9YCB9KTtcbiAgICAgIH1cbiAgICB9LCA5MDApO1xuICAgIHJldHVybiAoKSA9PiB3aW5kb3cuY2xlYXJUaW1lb3V0KHRpbWVyKTtcbiAgfSwgW3NuYXBzaG90LmJhc2VsaW5lSGFzaCwgc25hcHNob3QuZGlydHksIHNuYXBzaG90LmRvY3VtZW50LCBzdG9yZV0pO1xuXG4gIHVzZUVmZmVjdCgoKSA9PiB7XG4gICAgY29uc3QgcGFnZWhpZGUgPSAoKSA9PiB7XG4gICAgICBjb25zdCBjdXJyZW50ID0gc25hcHNob3RSZWYuY3VycmVudDtcbiAgICAgIGlmIChjdXJyZW50LmRpcnR5KSB7XG4gICAgICAgIHRyeSB7IHdyaXRlQWJvdXROYXJyYXRpdmVSZWNvdmVyeURyYWZ0KGN1cnJlbnQuZG9jdW1lbnQsIGN1cnJlbnQuYmFzZWxpbmVIYXNoKTsgfSBjYXRjaCB7IC8qIHN1cmZhY2VkIGJ5IG5vcm1hbCBhdXRvc2F2ZSAqLyB9XG4gICAgICB9XG4gICAgfTtcbiAgICBjb25zdCBrZXlkb3duID0gKGV2ZW50KSA9PiB7XG4gICAgICBpZiAoKGV2ZW50Lm1ldGFLZXkgfHwgZXZlbnQuY3RybEtleSkgJiYgZXZlbnQua2V5LnRvTG93ZXJDYXNlKCkgPT09ICdzJykge1xuICAgICAgICBldmVudC5wcmV2ZW50RGVmYXVsdCgpO1xuICAgICAgICBkb2N1bWVudC5xdWVyeVNlbGVjdG9yKCdbZGF0YS1hYm91dC1lZGl0b3Itc2F2ZV0nKT8uY2xpY2soKTtcbiAgICAgIH1cbiAgICAgIGlmICgoZXZlbnQubWV0YUtleSB8fCBldmVudC5jdHJsS2V5KSAmJiBldmVudC5rZXkudG9Mb3dlckNhc2UoKSA9PT0gJ3onKSB7XG4gICAgICAgIGV2ZW50LnByZXZlbnREZWZhdWx0KCk7XG4gICAgICAgIGV2ZW50LnNoaWZ0S2V5ID8gc3RvcmUucmVkbygpIDogc3RvcmUudW5kbygpO1xuICAgICAgfVxuICAgICAgaWYgKCFldmVudC5tZXRhS2V5ICYmICFldmVudC5jdHJsS2V5ICYmICFldmVudC5hbHRLZXkgJiYgIWV2ZW50LnNoaWZ0S2V5XG4gICAgICAgICYmICFpc1RleHRFZGl0aW5nVGFyZ2V0KGV2ZW50LnRhcmdldCkgJiYgWydBcnJvd0xlZnQnLCAnQXJyb3dSaWdodCddLmluY2x1ZGVzKGV2ZW50LmtleSkpIHtcbiAgICAgICAgZXZlbnQucHJldmVudERlZmF1bHQoKTtcbiAgICAgICAganVtcFRpbWVsaW5lS2V5ZnJhbWUoc3RvcmUsIHN0b3JlLmdldFNuYXBzaG90KCksIGV2ZW50LmtleSA9PT0gJ0Fycm93UmlnaHQnID8gMSA6IC0xKTtcbiAgICAgIH1cbiAgICAgIGlmICghZXZlbnQubWV0YUtleSAmJiAhZXZlbnQuY3RybEtleSAmJiAhZXZlbnQuYWx0S2V5XG4gICAgICAgICYmICFpc1RleHRFZGl0aW5nVGFyZ2V0KGV2ZW50LnRhcmdldCkgJiYgWydCYWNrc3BhY2UnLCAnRGVsZXRlJ10uaW5jbHVkZXMoZXZlbnQua2V5KVxuICAgICAgICAmJiBkZWxldGVUaW1lbGluZVNlbGVjdGlvbihzdG9yZSwgc3RvcmUuZ2V0U25hcHNob3QoKSkpIHtcbiAgICAgICAgZXZlbnQucHJldmVudERlZmF1bHQoKTtcbiAgICAgIH1cbiAgICAgIGlmIChldmVudC5rZXkgPT09ICdFc2NhcGUnKSB7XG4gICAgICAgIGNvbnN0IGN1cnJlbnQgPSBzdG9yZS5nZXRTbmFwc2hvdCgpO1xuICAgICAgICBpZiAoY3VycmVudC5wcmV2aWV3U3RhdGUpIHN0b3JlLmNhbmNlbFByZXZpZXcoKTtcbiAgICAgICAgZWxzZSBpZiAoY3VycmVudC50cnlTdGF0ZSkgc3RvcmUuY2FuY2VsVHJ5KCk7XG4gICAgICAgIGVsc2UgaWYgKGdldEFib3V0TmFycmF0aXZlU2VsZWN0aW9uTWVtYmVycyhjdXJyZW50LnNlbGVjdGlvbikubGVuZ3RoID4gMSkge1xuICAgICAgICAgIHN0b3JlLnNldFNlbGVjdGlvbih7XG4gICAgICAgICAgICB0eXBlOiAnY3VlJyxcbiAgICAgICAgICAgIHNlY3Rpb25JZDogY3VycmVudC5zZWxlY3Rpb24uc2VjdGlvbklkLFxuICAgICAgICAgICAgY3VlSWQ6IGN1cnJlbnQuc2VsZWN0aW9uLmN1ZUlkLFxuICAgICAgICAgICAga2V5UGFydDogY3VycmVudC5zZWxlY3Rpb24ua2V5UGFydCB8fCAnZm9jdXMnLFxuICAgICAgICAgIH0pO1xuICAgICAgICB9XG4gICAgICAgIGVsc2UgaWYgKGN1cnJlbnQuc2VsZWN0aW9uLnR5cGUgIT09ICdzZWN0aW9uJykgc3RvcmUuc2V0U2VsZWN0aW9uKHsgdHlwZTogJ3NlY3Rpb24nLCBzZWN0aW9uSWQ6IGN1cnJlbnQuc2VsZWN0aW9uLnNlY3Rpb25JZCB9KTtcbiAgICAgICAgZWxzZSBzdG9yZS5zZXRTZWxlY3Rpb24oeyB0eXBlOiAnc2VxdWVuY2UnIH0pO1xuICAgICAgfVxuICAgIH07XG4gICAgd2luZG93LmFkZEV2ZW50TGlzdGVuZXIoJ3BhZ2VoaWRlJywgcGFnZWhpZGUpO1xuICAgIHdpbmRvdy5hZGRFdmVudExpc3RlbmVyKCdrZXlkb3duJywga2V5ZG93bik7XG4gICAgcmV0dXJuICgpID0+IHsgd2luZG93LnJlbW92ZUV2ZW50TGlzdGVuZXIoJ3BhZ2VoaWRlJywgcGFnZWhpZGUpOyB3aW5kb3cucmVtb3ZlRXZlbnRMaXN0ZW5lcigna2V5ZG93bicsIGtleWRvd24pOyB9O1xuICB9LCBbc3RvcmVdKTtcblxuICBjb25zdCBzYXZlID0gYXN5bmMgKCkgPT4ge1xuICAgIGNvbnN0IGVkaXRvclVybCA9IG5ldyBVUkwod2luZG93LmxvY2F0aW9uLmhyZWYpO1xuICAgIGVkaXRvclVybC5zZWFyY2hQYXJhbXMuc2V0KCdlZGl0JywgJzEnKTtcbiAgICB3aW5kb3cuaGlzdG9yeS5yZXBsYWNlU3RhdGUod2luZG93Lmhpc3Rvcnkuc3RhdGUsICcnLCBgJHtlZGl0b3JVcmwucGF0aG5hbWV9JHtlZGl0b3JVcmwuc2VhcmNofSR7ZWRpdG9yVXJsLmhhc2h9YCk7XG4gICAgY29uc3Qgc2VudCA9IGNsb25lQWJvdXROYXJyYXRpdmVEb2N1bWVudChzbmFwc2hvdC5kb2N1bWVudCk7XG4gICAgaWYgKHNuYXBzaG90LmRpYWdub3N0aWNzLnNvbWUoKGl0ZW0pID0+IGl0ZW0ubGV2ZWwgPT09ICdlcnJvcicpKSB7XG4gICAgICBzdG9yZS5zZXRTYXZlU3RhdGUoeyBzdGF0dXM6ICdmYWlsZWQnLCBtZXNzYWdlOiAnUmVzb2x2ZSB2YWxpZGF0aW9uIGVycm9ycyBiZWZvcmUgc2F2aW5nLicgfSk7XG4gICAgICByZXR1cm47XG4gICAgfVxuICAgIHN0b3JlLnNldFNhdmVTdGF0ZSh7IHN0YXR1czogJ3NhdmluZycsIG1lc3NhZ2U6ICcnIH0pO1xuICAgIHRyeSB7XG4gICAgICBjb25zdCByZXN1bHQgPSBhd2FpdCBzYXZlQWJvdXROYXJyYXRpdmVTb3VyY2Uoc2VudCwgc25hcHNob3QuYmFzZWxpbmVIYXNoKTtcbiAgICAgIHN0b3JlLm1hcmtTYXZlZChzZW50LCByZXN1bHQuaGFzaCk7XG4gICAgICBjbGVhckFib3V0TmFycmF0aXZlUmVjb3ZlcnlEcmFmdCgpO1xuICAgIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgICBzdG9yZS5zZXRTYXZlU3RhdGUoeyBzdGF0dXM6IGVycm9yLnN0YXR1cyA9PT0gNDA5ID8gJ2NvbmZsaWN0JyA6ICdmYWlsZWQnLCBtZXNzYWdlOiBlcnJvci5tZXNzYWdlIH0pO1xuICAgIH1cbiAgfTtcblxuICBjb25zdCBhZGRDaGVja3BvaW50ID0gKCkgPT4ge1xuICAgIGNvbnN0IGNoZWNrcG9pbnQgPSB7XG4gICAgICBpZDogY3J5cHRvLnJhbmRvbVVVSUQoKSxcbiAgICAgIG5hbWU6IGBDaGVja3BvaW50ICR7bmV3IERhdGUoKS50b0xvY2FsZVRpbWVTdHJpbmcoW10sIHsgaG91cjogJzItZGlnaXQnLCBtaW51dGU6ICcyLWRpZ2l0JyB9KX1gLFxuICAgICAgdGltZXN0YW1wOiBEYXRlLm5vdygpLFxuICAgICAgc3RvcnlXVTogc25hcHNob3QudHJhbnNwb3J0LnN0b3J5V1UsXG4gICAgICBiYXNlU291cmNlSGFzaDogc25hcHNob3QuYmFzZWxpbmVIYXNoLFxuICAgICAgZG9jdW1lbnQ6IHNuYXBzaG90LmRvY3VtZW50LFxuICAgIH07XG4gICAgc2V0Q2hlY2twb2ludHMod3JpdGVBYm91dE5hcnJhdGl2ZUNoZWNrcG9pbnQoY2hlY2twb2ludCkpO1xuICB9O1xuICBjb25zdCBzdGF0dXNMYWJlbCA9IHNuYXBzaG90LnNhdmVTdGF0ZS5zdGF0dXMgPT09ICdzYXZpbmcnID8gJ1NhdmluZ+KApidcbiAgICA6IHNuYXBzaG90LnNhdmVTdGF0ZS5zdGF0dXMgPT09ICdjb25mbGljdCcgPyAnU291cmNlIGNoYW5nZWQnXG4gICAgICA6IHNuYXBzaG90LnNhdmVTdGF0ZS5zdGF0dXMgPT09ICdmYWlsZWQnID8gJ1NhdmUgZmFpbGVkJ1xuICAgICAgICA6IHNuYXBzaG90LmRpcnR5ID8gJ0RyYWZ0JyA6ICdTYXZlZCc7XG4gIGNvbnN0IHNlbGVjdGVkID0gZ2V0U2VjdGlvbihzbmFwc2hvdC5kb2N1bWVudCwgc25hcHNob3Quc2VsZWN0aW9uKTtcbiAgY29uc3QgY29tcGlsZWRTZWxlY3RlZCA9IHNuYXBzaG90LmNvbXBpbGVkUGxhbj8uc2VjdGlvbnMuZmluZCgoc2VjdGlvbikgPT4gc2VjdGlvbi5pZCA9PT0gc2VsZWN0ZWQ/LmlkKTtcbiAgY29uc3QgcmVzb2x2ZWRFeHRlbnQgPSBjb21waWxlZFNlbGVjdGVkPy5yZXNvbHZlZEV4dGVudFdVIHx8IHNlbGVjdGVkPy5leHRlbnRXVSB8fCAwO1xuICBjb25zdCBzZWxlY3RlZEV4dGVudCA9IHNlbGVjdGVkXG4gICAgPyBOdW1iZXIoc25hcHNob3QucHJldmlld1Byb2ZpbGUgPT09ICdtb2JpbGUnID8gc2VsZWN0ZWQubW9iaWxlRXh0ZW50V1UgOiBzZWxlY3RlZC5leHRlbnRXVSlcbiAgICA6IDA7XG4gIGNvbnN0IHNlbGVjdGVkQ3VlQ291bnQgPSBnZXRBYm91dE5hcnJhdGl2ZVNlbGVjdGlvbk1lbWJlcnMoc25hcHNob3Quc2VsZWN0aW9uKS5sZW5ndGg7XG4gIGNvbnN0IGxvb3BBY3RpdmUgPSBCb29sZWFuKHNuYXBzaG90LnRyYW5zcG9ydC5sb29wKTtcbiAgY29uc3QgdGltZWxpbmVEZWxldGlvbiA9IGdldFRpbWVsaW5lRGVsZXRpb24oc25hcHNob3QpO1xuICBjb25zdCB0b2dnbGVMb29wID0gKCkgPT4ge1xuICAgIGlmIChsb29wQWN0aXZlKSB7XG4gICAgICBzdG9yZS5zZXRUcmFuc3BvcnQoeyBvd25lcjogJ3RpbWVsaW5lJywgcGxheWluZzogZmFsc2UsIGxvb3A6IG51bGwgfSk7XG4gICAgICByZXR1cm47XG4gICAgfVxuICAgIGNvbnN0IHJhbmdlID0gZGVyaXZlQWJvdXROYXJyYXRpdmVMb29wUmFuZ2Uoe1xuICAgICAgZG9jdW1lbnQ6IHNuYXBzaG90LmRvY3VtZW50LFxuICAgICAgcGxhbjogc25hcHNob3QuY29tcGlsZWRQbGFuLFxuICAgICAgc291cmNlOiBzZWxlY3RlZCA/IHsgdHlwZTogJ3NlY3Rpb24nLCBzZWN0aW9uSWQ6IHNlbGVjdGVkLmlkIH0gOiBudWxsLFxuICAgIH0pO1xuICAgIGlmIChyYW5nZS52YWxpZCkgc3RvcmUuc2V0VHJhbnNwb3J0KHsgbG9vcDogcmFuZ2UgfSk7XG4gIH07XG4gIGNvbnN0IHRvZ2dsZVNvbG8gPSAodHJhY2spID0+IHN0b3JlLnNldFRyYW5zcG9ydCh7XG4gICAgc29sb1RyYWNrOiBzbmFwc2hvdC50cmFuc3BvcnQuc29sb1RyYWNrID09PSB0cmFjayA/IG51bGwgOiB0cmFjayxcbiAgfSk7XG4gIGNvbnN0IGZpdFNlcXVlbmNlID0gKCkgPT4ge1xuICAgIHN0b3JlLnNldFRyYW5zcG9ydCh7IHpvb206IDEgfSk7XG4gICAgcmVxdWVzdEFuaW1hdGlvbkZyYW1lKCgpID0+IHtcbiAgICAgIGNvbnN0IGxhbmVzID0gZG9jdW1lbnQucXVlcnlTZWxlY3RvcignLmFib3V0LWVkaXRvci1sYW5lcycpO1xuICAgICAgaWYgKGxhbmVzKSBsYW5lcy5zY3JvbGxMZWZ0ID0gMDtcbiAgICB9KTtcbiAgfTtcbiAgY29uc3QgZml0U2VjdGlvbiA9ICgpID0+IHtcbiAgICBpZiAoIWNvbXBpbGVkU2VsZWN0ZWQgfHwgIXNuYXBzaG90LmNvbXBpbGVkUGxhbj8ubWF4U3RvcnlXVSkgcmV0dXJuO1xuICAgIGNvbnN0IHNlY3Rpb25TcGFuID0gTWF0aC5tYXgoMC4wMDEsIGNvbXBpbGVkU2VsZWN0ZWQucmVzb2x2ZWRFeHRlbnRXVSk7XG4gICAgY29uc3Qgem9vbSA9IE1hdGgubWluKDgsIE1hdGgubWF4KDEsIChzbmFwc2hvdC5jb21waWxlZFBsYW4ubWF4U3RvcnlXVSAvIHNlY3Rpb25TcGFuKSAqIDAuODIpKTtcbiAgICBzdG9yZS5zZXRUcmFuc3BvcnQoeyB6b29tOiBOdW1iZXIoem9vbS50b0ZpeGVkKDMpKSB9KTtcbiAgICByZXF1ZXN0QW5pbWF0aW9uRnJhbWUoKCkgPT4ge1xuICAgICAgY29uc3QgbGFuZXMgPSBkb2N1bWVudC5xdWVyeVNlbGVjdG9yKCcuYWJvdXQtZWRpdG9yLWxhbmVzJyk7XG4gICAgICBpZiAoIWxhbmVzKSByZXR1cm47XG4gICAgICBjb25zdCBzdGFydFJhdGlvID0gY29tcGlsZWRTZWxlY3RlZC5zdGFydFdVIC8gc25hcHNob3QuY29tcGlsZWRQbGFuLm1heFN0b3J5V1U7XG4gICAgICBsYW5lcy5zY3JvbGxMZWZ0ID0gTWF0aC5tYXgoMCwgKHN0YXJ0UmF0aW8gKiBsYW5lcy5zY3JvbGxXaWR0aCkgLSAobGFuZXMuY2xpZW50V2lkdGggKiAwLjA4KSk7XG4gICAgfSk7XG4gIH07XG4gIGNvbnN0IHRvZ2dsZURpcmVjdG9yID0gKCkgPT4ge1xuICAgIGNvbnN0IG5leHQgPSAhZGlyZWN0b3JWaWV3O1xuICAgIHNldERpcmVjdG9yVmlldyhuZXh0KTtcbiAgICBydW50aW1lUmVmLmN1cnJlbnQ/LnNldERpcmVjdG9yVmlldz8uKG5leHQpO1xuICB9O1xuICBjb25zdCB0b2dnbGVCZWZvcmUgPSAoKSA9PiB7XG4gICAgaWYgKHNuYXBzaG90LnRyeVN0YXRlPy5sYWJlbCA9PT0gJ0NvbXBhcmUgc2F2ZWQgc291cmNlJykge1xuICAgICAgc3RvcmUuY2FuY2VsVHJ5KCk7XG4gICAgICByZXR1cm47XG4gICAgfVxuICAgIGlmIChzbmFwc2hvdC50cnlTdGF0ZSkgcmV0dXJuO1xuICAgIHN0b3JlLmJlZ2luVHJ5KCdDb21wYXJlIHNhdmVkIHNvdXJjZScsIChkcmFmdCkgPT4ge1xuICAgICAgT2JqZWN0LmtleXMoZHJhZnQpLmZvckVhY2goKGtleSkgPT4gZGVsZXRlIGRyYWZ0W2tleV0pO1xuICAgICAgT2JqZWN0LmFzc2lnbihkcmFmdCwgY2xvbmVBYm91dE5hcnJhdGl2ZURvY3VtZW50KHNuYXBzaG90LmJhc2VsaW5lRG9jdW1lbnQpKTtcbiAgICB9KTtcbiAgfTtcblxuICByZXR1cm4gY3JlYXRlUG9ydGFsKChcbiAgICA8ZGl2XG4gICAgICBjbGFzc05hbWU9XCJhYm91dC1lZGl0b3JcIlxuICAgICAgZGF0YS1tb2JpbGUtcGFuZT17bW9iaWxlUGFuZX1cbiAgICAgIGRhdGEtdGltZWxpbmUtb3Blbj17dGltZWxpbmVPcGVuID8gJ3RydWUnIDogJ2ZhbHNlJ31cbiAgICAgIHJvbGU9XCJyZWdpb25cIlxuICAgICAgYXJpYS1sYWJlbD1cIkFib3V0IE5hcnJhdGl2ZSBjcmVhdGl2ZSB0b29sa2l0XCJcbiAgICA+XG4gICAgICA8aGVhZGVyIGNsYXNzTmFtZT1cImFib3V0LWVkaXRvci10b3BiYXJcIj5cbiAgICAgICAgPGJ1dHRvbiB0eXBlPVwiYnV0dG9uXCIgY2xhc3NOYW1lPVwiYWJvdXQtZWRpdG9yLWJyYW5kXCIgb25DbGljaz17KCkgPT4gc3RvcmUuc2V0U2VsZWN0aW9uKHsgdHlwZTogJ3NlcXVlbmNlJyB9KX0+PERpYW1vbmQgYXJpYS1oaWRkZW49XCJ0cnVlXCIgLz48c3Bhbj5BYm91dCBOYXJyYXRpdmU8L3NwYW4+PHNtYWxsPkNyZWF0aXZlIHRvb2xraXQ8L3NtYWxsPjwvYnV0dG9uPlxuICAgICAgICA8VHJhbnNwb3J0IHN0b3JlPXtzdG9yZX0gc25hcHNob3Q9e3NuYXBzaG90fSAvPlxuICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cImFib3V0LWVkaXRvci1hY3Rpb25zXCI+XG4gICAgICAgICAgPGJ1dHRvbiB0eXBlPVwiYnV0dG9uXCIgZGlzYWJsZWQ9eyFzbmFwc2hvdC5oaXN0b3J5LmNhblVuZG99IHRpdGxlPXtzbmFwc2hvdC5oaXN0b3J5LnVuZG9MYWJlbCB8fCAnVW5kbyd9IGFyaWEtbGFiZWw9XCJVbmRvXCIgb25DbGljaz17KCkgPT4gc3RvcmUudW5kbygpfT48c3BhbiBhcmlhLWhpZGRlbj1cInRydWVcIj7ihrY8L3NwYW4+PC9idXR0b24+XG4gICAgICAgICAgPGJ1dHRvbiB0eXBlPVwiYnV0dG9uXCIgZGlzYWJsZWQ9eyFzbmFwc2hvdC5oaXN0b3J5LmNhblJlZG99IHRpdGxlPXtzbmFwc2hvdC5oaXN0b3J5LnJlZG9MYWJlbCB8fCAnUmVkbyd9IGFyaWEtbGFiZWw9XCJSZWRvXCIgb25DbGljaz17KCkgPT4gc3RvcmUucmVkbygpfT48c3BhbiBhcmlhLWhpZGRlbj1cInRydWVcIj7ihrc8L3NwYW4+PC9idXR0b24+XG4gICAgICAgICAgPGJ1dHRvbiB0eXBlPVwiYnV0dG9uXCIgY2xhc3NOYW1lPXtwYXRoVmlzaWJsZSA/ICdpcy1hY3RpdmUnIDogJyd9IG9uQ2xpY2s9eygpID0+IHNldFBhdGhWaXNpYmxlKCFwYXRoVmlzaWJsZSl9PlBhdGg8L2J1dHRvbj5cbiAgICAgICAgICA8YnV0dG9uIHR5cGU9XCJidXR0b25cIiBjbGFzc05hbWU9e2RpcmVjdG9yVmlldyA/ICdpcy1hY3RpdmUnIDogJyd9IG9uQ2xpY2s9e3RvZ2dsZURpcmVjdG9yfT57ZGlyZWN0b3JWaWV3ID8gJ0RpcmVjdG9yJyA6ICdDYW1lcmEnfTwvYnV0dG9uPlxuICAgICAgICAgIDxidXR0b24gdHlwZT1cImJ1dHRvblwiIGNsYXNzTmFtZT17c25hcHNob3QudHJ5U3RhdGU/LmxhYmVsID09PSAnQ29tcGFyZSBzYXZlZCBzb3VyY2UnID8gJ2lzLWFjdGl2ZScgOiAnJ30gZGlzYWJsZWQ9e3NuYXBzaG90LnRyeVN0YXRlICYmIHNuYXBzaG90LnRyeVN0YXRlLmxhYmVsICE9PSAnQ29tcGFyZSBzYXZlZCBzb3VyY2UnfSBvbkNsaWNrPXt0b2dnbGVCZWZvcmV9PntzbmFwc2hvdC50cnlTdGF0ZT8ubGFiZWwgPT09ICdDb21wYXJlIHNhdmVkIHNvdXJjZScgPyAnQmVmb3JlJyA6ICdBZnRlcid9PC9idXR0b24+XG4gICAgICAgICAgPGRldGFpbHMgY2xhc3NOYW1lPVwiYWJvdXQtZWRpdG9yLW1vcmVcIj5cbiAgICAgICAgICAgIDxzdW1tYXJ5Pk1vcmU8L3N1bW1hcnk+XG4gICAgICAgICAgICA8ZGl2PlxuICAgICAgICAgICAgICA8YnV0dG9uIHR5cGU9XCJidXR0b25cIiBvbkNsaWNrPXthZGRDaGVja3BvaW50fT5DaGVja3BvaW50PC9idXR0b24+XG4gICAgICAgICAgICAgIDxidXR0b24gdHlwZT1cImJ1dHRvblwiIG9uQ2xpY2s9eygpID0+IGV4cG9ydEFib3V0TmFycmF0aXZlRG9jdW1lbnQoc25hcHNob3QuZG9jdW1lbnQpfT5FeHBvcnQgSlNPTjwvYnV0dG9uPlxuICAgICAgICAgICAgICA8YnV0dG9uIHR5cGU9XCJidXR0b25cIiBvbkNsaWNrPXsoKSA9PiBpbXBvcnRSZWYuY3VycmVudD8uY2xpY2soKX0+SW1wb3J0IEpTT048L2J1dHRvbj5cbiAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgIDwvZGV0YWlscz5cbiAgICAgICAgICA8aW5wdXQgcmVmPXtpbXBvcnRSZWZ9IGhpZGRlbiB0eXBlPVwiZmlsZVwiIGFjY2VwdD1cImFwcGxpY2F0aW9uL2pzb25cIiBvbkNoYW5nZT17YXN5bmMgKGV2ZW50KSA9PiB7XG4gICAgICAgICAgICBjb25zdCBmaWxlID0gZXZlbnQudGFyZ2V0LmZpbGVzPy5bMF07XG4gICAgICAgICAgICBpZiAoIWZpbGUpIHJldHVybjtcbiAgICAgICAgICAgIHRyeSB7XG4gICAgICAgICAgICAgIGNvbnN0IGltcG9ydGVkID0gSlNPTi5wYXJzZShhd2FpdCBmaWxlLnRleHQoKSk7XG4gICAgICAgICAgICAgIGFzc2VydFZhbGlkQWJvdXROYXJyYXRpdmVEb2N1bWVudChpbXBvcnRlZCk7XG4gICAgICAgICAgICAgIHN0b3JlLnJlcGxhY2VEb2N1bWVudCgnSW1wb3J0IGRvY3VtZW50JywgaW1wb3J0ZWQpO1xuICAgICAgICAgICAgfSBjYXRjaCAoZXJyb3IpIHsgc3RvcmUuc2V0U2F2ZVN0YXRlKHsgc3RhdHVzOiAnZmFpbGVkJywgbWVzc2FnZTogZXJyb3IubWVzc2FnZSB9KTsgfVxuICAgICAgICAgICAgZXZlbnQudGFyZ2V0LnZhbHVlID0gJyc7XG4gICAgICAgICAgfX0gLz5cbiAgICAgICAgICA8YnV0dG9uIHR5cGU9XCJidXR0b25cIiBkYXRhLWFib3V0LWVkaXRvci1zYXZlIGNsYXNzTmFtZT1cImlzLXNhdmVcIiBkaXNhYmxlZD17c25hcHNob3Quc2F2ZVN0YXRlLnN0YXR1cyA9PT0gJ3NhdmluZyd9IG9uQ2xpY2s9e3NhdmV9PjxzcGFuPntzdGF0dXNMYWJlbH08L3NwYW4+PGtiZD7ijJhTPC9rYmQ+PC9idXR0b24+XG4gICAgICAgIDwvZGl2PlxuICAgICAgPC9oZWFkZXI+XG5cbiAgICAgIHtzbmFwc2hvdC5yZWNvdmVyeVN0YXRlLmF2YWlsYWJsZSA/IDxkaXYgY2xhc3NOYW1lPVwiYWJvdXQtZWRpdG9yLXJlY292ZXJ5XCI+PHNwYW4+QW4gdW5zYXZlZCBkcmFmdCBmcm9tIHtuZXcgRGF0ZShzbmFwc2hvdC5yZWNvdmVyeVN0YXRlLmRyYWZ0LnRpbWVzdGFtcCkudG9Mb2NhbGVTdHJpbmcoKX0gaXMgYXZhaWxhYmxlLjwvc3Bhbj48YnV0dG9uIHR5cGU9XCJidXR0b25cIiBvbkNsaWNrPXsoKSA9PiB7IHN0b3JlLnJlcGxhY2VEb2N1bWVudCgnUmVjb3ZlciBkcmFmdCcsIHNuYXBzaG90LnJlY292ZXJ5U3RhdGUuZHJhZnQuZG9jdW1lbnQpOyBzdG9yZS5zZXRSZWNvdmVyeVN0YXRlKHsgYXZhaWxhYmxlOiBmYWxzZSB9KTsgfX0+UmVjb3ZlciBhcyB1bnNhdmVkIGNvcHk8L2J1dHRvbj48YnV0dG9uIHR5cGU9XCJidXR0b25cIiBvbkNsaWNrPXsoKSA9PiB7IGV4cG9ydEFib3V0TmFycmF0aXZlRG9jdW1lbnQoc25hcHNob3QucmVjb3ZlcnlTdGF0ZS5kcmFmdC5kb2N1bWVudCwgJ2NvbnRlbnRzLWFib3V0LXJlY292ZXJlZC5qc29uJyk7IH19PkV4cG9ydDwvYnV0dG9uPjxidXR0b24gdHlwZT1cImJ1dHRvblwiIG9uQ2xpY2s9eygpID0+IHsgY2xlYXJBYm91dE5hcnJhdGl2ZVJlY292ZXJ5RHJhZnQoKTsgc3RvcmUuc2V0UmVjb3ZlcnlTdGF0ZSh7IGF2YWlsYWJsZTogZmFsc2UgfSk7IH19PkRpc2NhcmQ8L2J1dHRvbj48L2Rpdj4gOiBudWxsfVxuICAgICAge3NuYXBzaG90LnNhdmVTdGF0ZS5tZXNzYWdlID8gPGRpdiBjbGFzc05hbWU9e2BhYm91dC1lZGl0b3Itc2F2ZS1tZXNzYWdlIGlzLSR7c25hcHNob3Quc2F2ZVN0YXRlLnN0YXR1c31gfT57c25hcHNob3Quc2F2ZVN0YXRlLm1lc3NhZ2V9PGJ1dHRvbiB0eXBlPVwiYnV0dG9uXCIgYXJpYS1sYWJlbD1cIkRpc21pc3MgbWVzc2FnZVwiIG9uQ2xpY2s9eygpID0+IHN0b3JlLnNldFNhdmVTdGF0ZSh7IG1lc3NhZ2U6ICcnIH0pfT7DlzwvYnV0dG9uPjwvZGl2PiA6IG51bGx9XG5cbiAgICAgIHtwYXRoVmlzaWJsZSA/IDxDYW1lcmFQYXRoT3ZlcmxheSBzbmFwc2hvdD17c25hcHNob3R9IC8+IDogbnVsbH1cbiAgICAgIHtkaXJlY3RvclZpZXcgPyA8ZGl2IGNsYXNzTmFtZT1cImFib3V0LWVkaXRvci1kaXJlY3Rvci1jb250cm9sc1wiPjxzdHJvbmc+RGlyZWN0b3IgVmlldzwvc3Ryb25nPjxidXR0b24gdHlwZT1cImJ1dHRvblwiIG9uQ2xpY2s9eygpID0+IHJ1bnRpbWVSZWYuY3VycmVudD8ubnVkZ2VEaXJlY3Rvcj8uKHsgeWF3OiAtMC4wOCB9KX0+4oaQPC9idXR0b24+PGJ1dHRvbiB0eXBlPVwiYnV0dG9uXCIgb25DbGljaz17KCkgPT4gcnVudGltZVJlZi5jdXJyZW50Py5udWRnZURpcmVjdG9yPy4oeyBwaXRjaDogMC4wOCB9KX0+4oaRPC9idXR0b24+PGJ1dHRvbiB0eXBlPVwiYnV0dG9uXCIgb25DbGljaz17KCkgPT4gcnVudGltZVJlZi5jdXJyZW50Py5udWRnZURpcmVjdG9yPy4oeyBwaXRjaDogLTAuMDggfSl9PuKGkzwvYnV0dG9uPjxidXR0b24gdHlwZT1cImJ1dHRvblwiIG9uQ2xpY2s9eygpID0+IHJ1bnRpbWVSZWYuY3VycmVudD8ubnVkZ2VEaXJlY3Rvcj8uKHsgeWF3OiAwLjA4IH0pfT7ihpI8L2J1dHRvbj48YnV0dG9uIHR5cGU9XCJidXR0b25cIiBvbkNsaWNrPXsoKSA9PiBydW50aW1lUmVmLmN1cnJlbnQ/Lm51ZGdlRGlyZWN0b3I/Lih7IGRpc3RhbmNlOiAtMC4yIH0pfT7vvIs8L2J1dHRvbj48YnV0dG9uIHR5cGU9XCJidXR0b25cIiBvbkNsaWNrPXsoKSA9PiBydW50aW1lUmVmLmN1cnJlbnQ/Lm51ZGdlRGlyZWN0b3I/Lih7IGRpc3RhbmNlOiAwLjIgfSl9PuKIkjwvYnV0dG9uPjxidXR0b24gdHlwZT1cImJ1dHRvblwiIG9uQ2xpY2s9eygpID0+IHJ1bnRpbWVSZWYuY3VycmVudD8ucmVzZXREaXJlY3Rvcj8uKCl9PlJlc2V0PC9idXR0b24+PHNtYWxsPlRlbXBvcmFyeSBpbnNwZWN0aW9uIG9ubHkuIFB1Ymxpc2hlZCBDYW1lcmEga2V5cyBhcmUgdW5jaGFuZ2VkLjwvc21hbGw+PC9kaXY+IDogbnVsbH1cblxuICAgICAgPEluc3BlY3RvciBzdG9yZT17c3RvcmV9IHNuYXBzaG90PXtzbmFwc2hvdH0gdGltZWxpbmVPcGVuPXt0aW1lbGluZU9wZW59IHJ1bnRpbWVNZXRyaWNzPXtydW50aW1lTWV0cmljc30gY2xpcGJvYXJkPXtjbGlwYm9hcmR9IHNldENsaXBib2FyZD17c2V0Q2xpcGJvYXJkfSAvPlxuICAgICAgPGJ1dHRvblxuICAgICAgICB0eXBlPVwiYnV0dG9uXCJcbiAgICAgICAgY2xhc3NOYW1lPVwiYWJvdXQtZWRpdG9yLXRpbWVsaW5lLXRvZ2dsZVwiXG4gICAgICAgIGFyaWEtY29udHJvbHM9XCJhYm91dC1lZGl0b3ItdGltZWxpbmUtcGFuZWxcIlxuICAgICAgICBhcmlhLWV4cGFuZGVkPXt0aW1lbGluZU9wZW59XG4gICAgICAgIHRpdGxlPXt0aW1lbGluZU9wZW4gPyAnSGlkZSB0aW1lbGluZScgOiAnU2hvdyB0aW1lbGluZSd9XG4gICAgICAgIG9uQ2xpY2s9eygpID0+IHNldFRpbWVsaW5lT3Blbigob3BlbikgPT4gIW9wZW4pfVxuICAgICAgPnt0aW1lbGluZU9wZW4gPyA8Q2hldnJvbkRvd24gYXJpYS1oaWRkZW49XCJ0cnVlXCIgLz4gOiA8Q2hldnJvblVwIGFyaWEtaGlkZGVuPVwidHJ1ZVwiIC8+fTxzcGFuPnt0aW1lbGluZU9wZW4gPyAnSGlkZSB0aW1lbGluZScgOiAnU2hvdyB0aW1lbGluZSd9PC9zcGFuPjwvYnV0dG9uPlxuICAgICAgPGRpdiBpZD1cImFib3V0LWVkaXRvci10aW1lbGluZS1wYW5lbFwiIGNsYXNzTmFtZT1cImFib3V0LWVkaXRvci1ib3R0b21cIiBhcmlhLWhpZGRlbj17IXRpbWVsaW5lT3Blbn0+XG4gICAgICAgIDxkaXYgY2xhc3NOYW1lPVwiYWJvdXQtZWRpdG9yLWNvbnRleHRiYXJcIj5cbiAgICAgICAgICA8c3Bhbj48c3Ryb25nPntzZWxlY3RlZD8ubGFiZWwgfHwgJ1NlcXVlbmNlJ308L3N0cm9uZz4ge3NlbGVjdGVkID8gYCR7c2VsZWN0ZWQudHlwZX0gwrcgJHtmb3JtYXRXVShNYXRoLm1heCgwLCBzZWxlY3RlZEV4dGVudCAtIDEpKX0gc2Nyb2xsIMK3ICR7Zm9ybWF0V1Uoc2VsZWN0ZWRFeHRlbnQpfSB0b3RhbCR7cmVzb2x2ZWRFeHRlbnQgPiBzZWxlY3RlZEV4dGVudCArIDAuMDAxID8gYCDCtyAke2Zvcm1hdFdVKHJlc29sdmVkRXh0ZW50KX0gcmVzb2x2ZWRgIDogJyd9YCA6ICcnfTwvc3Bhbj5cbiAgICAgICAgICB7c2VsZWN0ZWRDdWVDb3VudCA+IDEgPyA8c3BhbiBjbGFzc05hbWU9XCJhYm91dC1lZGl0b3Itc2VsZWN0aW9uLWNvdW50XCI+e3NlbGVjdGVkQ3VlQ291bnR9IHRpdGxlcyBzZWxlY3RlZDwvc3Bhbj4gOiBudWxsfVxuICAgICAgICAgIDxzcGFuPntzbmFwc2hvdC5hdXRvS2V5ID8gJ0F1dG8ta2V5IGFybWVkJyA6ICdBdXRvLWtleSBvZmYnfTwvc3Bhbj5cbiAgICAgICAgICA8YnV0dG9uIHR5cGU9XCJidXR0b25cIiBjbGFzc05hbWU9e3NuYXBzaG90LmF1dG9LZXkgPyAnaXMtYWN0aXZlJyA6ICcnfSBvbkNsaWNrPXsoKSA9PiBzdG9yZS5zZXRBdXRvS2V5KCFzbmFwc2hvdC5hdXRvS2V5KX0+4peGIEF1dG8ta2V5PC9idXR0b24+XG4gICAgICAgICAgPGJ1dHRvbiB0eXBlPVwiYnV0dG9uXCIgY2xhc3NOYW1lPXtsb29wQWN0aXZlID8gJ2lzLWFjdGl2ZScgOiAnJ30gb25DbGljaz17dG9nZ2xlTG9vcH0+e2xvb3BBY3RpdmUgPyAnU3RvcCBhdWRpdGlvbicgOiAnTG9vcCBTZWN0aW9uJ308L2J1dHRvbj5cbiAgICAgICAgICA8YnV0dG9uIHR5cGU9XCJidXR0b25cIiBvbkNsaWNrPXtmaXRTZXF1ZW5jZX0+Rml0IHNlcXVlbmNlPC9idXR0b24+XG4gICAgICAgICAgPGJ1dHRvbiB0eXBlPVwiYnV0dG9uXCIgZGlzYWJsZWQ9eyFjb21waWxlZFNlbGVjdGVkfSBvbkNsaWNrPXtmaXRTZWN0aW9ufT5GaXQgU2VjdGlvbjwvYnV0dG9uPlxuICAgICAgICAgIHtbJ2NhbWVyYScsICd3b3JsZCcsICd0ZXh0J10ubWFwKCh0cmFjaykgPT4gPGJ1dHRvbiB0eXBlPVwiYnV0dG9uXCIga2V5PXt0cmFja30gY2xhc3NOYW1lPXtzbmFwc2hvdC50cmFuc3BvcnQuc29sb1RyYWNrID09PSB0cmFjayA/ICdpcy1hY3RpdmUnIDogJyd9IG9uQ2xpY2s9eygpID0+IHRvZ2dsZVNvbG8odHJhY2spfT5Tb2xvIHt0cmFja308L2J1dHRvbj4pfVxuICAgICAgICAgIHt0aW1lbGluZURlbGV0aW9uID8gPGJ1dHRvbiB0eXBlPVwiYnV0dG9uXCIgY2xhc3NOYW1lPVwiYWJvdXQtZWRpdG9yLWRlbGV0ZS1rZXlcIiBkaXNhYmxlZD17dGltZWxpbmVEZWxldGlvbi5kaXNhYmxlZH0gdGl0bGU9e3RpbWVsaW5lRGVsZXRpb24ubWVzc2FnZSB8fCBgJHt0aW1lbGluZURlbGV0aW9uLmxhYmVsfSDCtyBEZWxldGUvQmFja3NwYWNlYH0gb25DbGljaz17KCkgPT4gZGVsZXRlVGltZWxpbmVTZWxlY3Rpb24oc3RvcmUsIHNuYXBzaG90KX0+PFRyYXNoMiBhcmlhLWhpZGRlbj1cInRydWVcIiAvPnt0aW1lbGluZURlbGV0aW9uLmxhYmVsfTwvYnV0dG9uPiA6IG51bGx9XG4gICAgICAgICAge3J1bnRpbWVNZXRyaWNzID8gPHNwYW4gY2xhc3NOYW1lPVwiYWJvdXQtZWRpdG9yLWh1ZFwiPntydW50aW1lTWV0cmljcy5mcmFtZVRpbWVNcy50b0ZpeGVkKDIpfW1zIMK3IHtydW50aW1lTWV0cmljcy5kcmF3Q2FsbHN9IGRyYXcgwrcge3J1bnRpbWVNZXRyaWNzLnBvaW50Q291bnQudG9Mb2NhbGVTdHJpbmcoKX0gcHRzIMK3IHtydW50aW1lTWV0cmljcy5hY3RpdmVNb2RpZmllcnN9IG1vZGlmaWVycyDCtyB7cnVudGltZU1ldHJpY3MuYnVmZmVyUmVidWlsZHN9IHJlYnVpbGRzPC9zcGFuPiA6IG51bGx9XG4gICAgICAgICAge2NoZWNrcG9pbnRzLmxlbmd0aCA/IDxzZWxlY3QgYXJpYS1sYWJlbD1cIlJlc3RvcmUgY2hlY2twb2ludFwiIGRlZmF1bHRWYWx1ZT1cIlwiIG9uQ2hhbmdlPXsoZXZlbnQpID0+IHsgY29uc3QgZm91bmQgPSBjaGVja3BvaW50cy5maW5kKChpdGVtKSA9PiBpdGVtLmlkID09PSBldmVudC50YXJnZXQudmFsdWUpOyBpZiAoZm91bmQpIHsgc3RvcmUucmVwbGFjZURvY3VtZW50KGBSZXN0b3JlICR7Zm91bmQubmFtZX1gLCBmb3VuZC5kb2N1bWVudCk7IHN0b3JlLnNldFRyYW5zcG9ydCh7IG93bmVyOiAndGltZWxpbmUnLCBzdG9yeVdVOiBmb3VuZC5zdG9yeVdVLCBwbGF5aW5nOiBmYWxzZSB9KTsgfSBldmVudC50YXJnZXQudmFsdWUgPSAnJzsgfX0+PG9wdGlvbiB2YWx1ZT1cIlwiPkNoZWNrcG9pbnRzICh7Y2hlY2twb2ludHMubGVuZ3RofSk8L29wdGlvbj57Y2hlY2twb2ludHMubWFwKChpdGVtKSA9PiA8b3B0aW9uIHZhbHVlPXtpdGVtLmlkfSBrZXk9e2l0ZW0uaWR9PntpdGVtLm5hbWV9PC9vcHRpb24+KX08L3NlbGVjdD4gOiBudWxsfVxuICAgICAgICA8L2Rpdj5cbiAgICAgICAgPFRpbWVsaW5lIHN0b3JlPXtzdG9yZX0gc25hcHNob3Q9e3NuYXBzaG90fSAvPlxuICAgICAgPC9kaXY+XG4gICAgICA8bmF2IGNsYXNzTmFtZT1cImFib3V0LWVkaXRvci1tb2JpbGUtdGFic1wiIGFyaWEtbGFiZWw9XCJFZGl0b3IgcGFuZWxcIj48YnV0dG9uIHR5cGU9XCJidXR0b25cIiBjbGFzc05hbWU9e21vYmlsZVBhbmUgPT09ICdzZXF1ZW5jZScgPyAnaXMtYWN0aXZlJyA6ICcnfSBvbkNsaWNrPXsoKSA9PiBzZXRNb2JpbGVQYW5lKCdzZXF1ZW5jZScpfT5TZXF1ZW5jZTwvYnV0dG9uPjxidXR0b24gdHlwZT1cImJ1dHRvblwiIGNsYXNzTmFtZT17bW9iaWxlUGFuZSA9PT0gJ2luc3BlY3QnID8gJ2lzLWFjdGl2ZScgOiAnJ30gb25DbGljaz17KCkgPT4gc2V0TW9iaWxlUGFuZSgnaW5zcGVjdCcpfT5JbnNwZWN0PC9idXR0b24+PGJ1dHRvbiB0eXBlPVwiYnV0dG9uXCIgY2xhc3NOYW1lPXttb2JpbGVQYW5lID09PSAncHJldmlldycgPyAnaXMtYWN0aXZlJyA6ICcnfSBvbkNsaWNrPXsoKSA9PiBzZXRNb2JpbGVQYW5lKCdwcmV2aWV3Jyl9PlByZXZpZXc8L2J1dHRvbj48L25hdj5cbiAgICA8L2Rpdj5cbiAgKSwgZG9jdW1lbnQuYm9keSk7XG59XG4iXSwiZmlsZSI6Ii9Vc2Vycy9hbGV4YW5kZXJiZWNrL1Byb2plY3RzLWNvZGUvQWxleGFuZGVyIEJlY2sgU3R1ZGlvIFdlYnNpdGUvcmVhY3QtYXBwL2FwcC9zcmMvcm91dGVzL2Fib3V0LW5hcnJhdGl2ZS1sYWIvQWJvdXROYXJyYXRpdmVFZGl0b3IuanN4In0=