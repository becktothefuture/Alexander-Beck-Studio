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
  getAboutNarrativeCameraKeyTimingBounds,
  getAboutNarrativeCueTimingBounds,
  getAboutNarrativeExtentField,
  getAboutNarrativeSelectionMembers,
  moveAboutNarrativeCueTiming,
  remapAboutNarrativePlayheadContext,
  resolveAboutNarrativeCameraKeyDrop,
  resolveAboutNarrativeCueGroupMove,
  snapAboutNarrativeTimelineValue,
  toggleAboutNarrativeCueSelection
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
function Property({ label, children, hint = "" }) {
  return /* @__PURE__ */ jsxDEV("label", { className: "about-editor-property", children: [
    /* @__PURE__ */ jsxDEV("span", { children: label }, void 0, false, {
      fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
      lineNumber: 318,
      columnNumber: 7
    }, this),
    children,
    hint ? /* @__PURE__ */ jsxDEV("small", { children: hint }, void 0, false, {
      fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
      lineNumber: 320,
      columnNumber: 15
    }, this) : null
  ] }, void 0, true, {
    fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
    lineNumber: 317,
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
        lineNumber: 329,
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
        lineNumber: 338,
        columnNumber: 9
      },
      this
    ),
    unit ? /* @__PURE__ */ jsxDEV("em", { children: unit }, void 0, false, {
      fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
      lineNumber: 347,
      columnNumber: 17
    }, this) : null
  ] }, void 0, true, {
    fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
    lineNumber: 328,
    columnNumber: 7
  }, this) }, void 0, false, {
    fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
    lineNumber: 327,
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
      lineNumber: 370,
      columnNumber: 116
    }, this) }, void 0, false, {
      fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
      lineNumber: 370,
      columnNumber: 7
    }, this),
    /* @__PURE__ */ jsxDEV("button", { type: "button", title: "Previous keyframe · Left arrow", "aria-label": "Previous keyframe", onClick: () => jumpTimelineKeyframe(store, snapshot, -1), children: /* @__PURE__ */ jsxDEV(ChevronLeft, { "aria-hidden": "true" }, void 0, false, {
      fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
      lineNumber: 371,
      columnNumber: 157
    }, this) }, void 0, false, {
      fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
      lineNumber: 371,
      columnNumber: 7
    }, this),
    /* @__PURE__ */ jsxDEV("button", { type: "button", className: "is-primary", title: transport.playing ? "Pause" : "Play", "aria-label": transport.playing ? "Pause" : "Play", onClick: play, children: transport.playing ? /* @__PURE__ */ jsxDEV(Pause, { "aria-hidden": "true" }, void 0, false, {
      fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
      lineNumber: 373,
      columnNumber: 30
    }, this) : /* @__PURE__ */ jsxDEV(Play, { "aria-hidden": "true" }, void 0, false, {
      fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
      lineNumber: 373,
      columnNumber: 61
    }, this) }, void 0, false, {
      fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
      lineNumber: 372,
      columnNumber: 7
    }, this),
    /* @__PURE__ */ jsxDEV("button", { type: "button", title: "Next Section", "aria-label": "Next Section", onClick: () => jumpSection(1), children: /* @__PURE__ */ jsxDEV(SkipForward, { "aria-hidden": "true" }, void 0, false, {
      fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
      lineNumber: 375,
      columnNumber: 107
    }, this) }, void 0, false, {
      fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
      lineNumber: 375,
      columnNumber: 7
    }, this),
    /* @__PURE__ */ jsxDEV("button", { type: "button", title: "Next keyframe · Right arrow", "aria-label": "Next keyframe", onClick: () => jumpTimelineKeyframe(store, snapshot, 1), children: /* @__PURE__ */ jsxDEV(ChevronRight, { "aria-hidden": "true" }, void 0, false, {
      fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
      lineNumber: 376,
      columnNumber: 149
    }, this) }, void 0, false, {
      fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
      lineNumber: 376,
      columnNumber: 7
    }, this),
    /* @__PURE__ */ jsxDEV("output", { children: formatWU(transport.storyWU) }, void 0, false, {
      fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
      lineNumber: 377,
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
        lineNumber: 378,
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
        lineNumber: 387,
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
        lineNumber: 392,
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
            lineNumber: 402,
            columnNumber: 9
          }, this),
          /* @__PURE__ */ jsxDEV("option", { value: "mobile", children: "Mobile" }, void 0, false, {
            fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
            lineNumber: 403,
            columnNumber: 9
          }, this),
          /* @__PURE__ */ jsxDEV("option", { value: "reduced-motion", children: "Reduced motion" }, void 0, false, {
            fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
            lineNumber: 404,
            columnNumber: 9
          }, this)
        ]
      },
      void 0,
      true,
      {
        fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
        lineNumber: 397,
        columnNumber: 7
      },
      this
    )
  ] }, void 0, true, {
    fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
    lineNumber: 369,
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
        lineNumber: 777,
        columnNumber: 9
      }, this),
      /* @__PURE__ */ jsxDEV("span", { children: "Camera" }, void 0, false, {
        fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
        lineNumber: 777,
        columnNumber: 30
      }, this),
      /* @__PURE__ */ jsxDEV("span", { children: "World" }, void 0, false, {
        fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
        lineNumber: 777,
        columnNumber: 49
      }, this),
      /* @__PURE__ */ jsxDEV("span", { children: "Text" }, void 0, false, {
        fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
        lineNumber: 777,
        columnNumber: 67
      }, this),
      /* @__PURE__ */ jsxDEV("span", { children: "Interaction" }, void 0, false, {
        fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
        lineNumber: 777,
        columnNumber: 84
      }, this)
    ] }, void 0, true, {
      fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
      lineNumber: 776,
      columnNumber: 7
    }, this),
    /* @__PURE__ */ jsxDEV("div", { ref: lanesRef, className: "about-editor-lanes", "data-solo-track": transport.soloTrack || "", onWheel: zoomTimeline, children: /* @__PURE__ */ jsxDEV("div", { className: "about-editor-timeline-canvas", style: { "--about-editor-playhead": playhead, "--about-editor-timeline-zoom": Math.max(1, Number(transport.zoom) || 1) }, children: [
      /* @__PURE__ */ jsxDEV("div", { className: "about-editor-playhead" }, void 0, false, {
        fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
        lineNumber: 781,
        columnNumber: 11
      }, this),
      marquee ? /* @__PURE__ */ jsxDEV("div", { className: "about-editor-marquee", style: marquee, "aria-hidden": "true" }, void 0, false, {
        fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
        lineNumber: 782,
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
              lineNumber: 789,
              columnNumber: 13
            }, this),
            /* @__PURE__ */ jsxDEV("span", { children: cameraDragPreview.valid ? `${cameraDragPreview.sectionLabel} · ${formatCameraPercent(cameraDragPreview.at)}` : cameraDragPreview.reason }, void 0, false, {
              fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
              lineNumber: 790,
              columnNumber: 13
            }, this)
          ]
        },
        void 0,
        true,
        {
          fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
          lineNumber: 784,
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
                      lineNumber: 828,
                      columnNumber: 23
                    }, this),
                    section.label
                  ] }, void 0, true, {
                    fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
                    lineNumber: 827,
                    columnNumber: 21
                  }, this),
                  sectionResizePreview?.sectionId === section.id ? /* @__PURE__ */ jsxDEV("output", { children: [
                    formatWU(Math.max(0, resizeExtent - 1)),
                    " scroll · ",
                    formatWU(resizeExtent),
                    " total"
                  ] }, void 0, true, {
                    fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
                    lineNumber: 830,
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
                      lineNumber: 831,
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
                lineNumber: 821,
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
                    lineNumber: 855,
                    columnNumber: 27
                  },
                  this
                );
              }) }, void 0, false, {
                fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
                lineNumber: 849,
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
                    lineNumber: 870,
                    columnNumber: 25
                  },
                  this
                );
              })
            ] }, section.id, true, {
              fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
              lineNumber: 848,
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
                  lineNumber: 911,
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
                    lineNumber: 918,
                    columnNumber: 21
                  },
                  this
                )
              ) : null
            ] }, section.id, true, {
              fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
              lineNumber: 910,
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
                        lineNumber: 950,
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
                        lineNumber: 1001,
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
                    lineNumber: 1031,
                    columnNumber: 21
                  }, this) : null
                ]
              },
              section.id,
              true,
              {
                fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
                lineNumber: 933,
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
                lineNumber: 1042,
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
                lineNumber: 1049,
                columnNumber: 19
              },
              this
            ) : null
          ] }, section.id, true, {
            fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
            lineNumber: 1041,
            columnNumber: 17
          }, this);
        }) }, lane, false, {
          fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
          lineNumber: 794,
          columnNumber: 11
        }, this)
      )
    ] }, void 0, true, {
      fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
      lineNumber: 780,
      columnNumber: 9
    }, this) }, void 0, false, {
      fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
      lineNumber: 779,
      columnNumber: 7
    }, this)
  ] }, void 0, true, {
    fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
    lineNumber: 775,
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
        lineNumber: 1079,
        columnNumber: 15
      }, this),
      /* @__PURE__ */ jsxDEV("strong", { children: "Global controls" }, void 0, false, {
        fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
        lineNumber: 1079,
        columnNumber: 36
      }, this)
    ] }, void 0, true, {
      fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
      lineNumber: 1079,
      columnNumber: 7
    }, this),
    ABOUT_NARRATIVE_GLOBAL_CONTROLS.map(
      (group) => /* @__PURE__ */ jsxDEV("details", { open: true, children: [
        /* @__PURE__ */ jsxDEV("summary", { children: group.label }, void 0, false, {
          fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
          lineNumber: 1082,
          columnNumber: 11
        }, this),
        group.id === "textMotion" ? /* @__PURE__ */ jsxDEV("p", { className: "about-editor-help", children: "Every title follows this path continuously. Negative Y is higher, positive Y is lower. The opener starts sharp at its own Y position; Clear from and Clear until set the sharp window for later titles." }, void 0, false, {
          fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
          lineNumber: 1083,
          columnNumber: 40
        }, this) : null,
        group.id === "swarmTurbulence" ? /* @__PURE__ */ jsxDEV("p", { className: "about-editor-help", children: "One ambient motion profile drives both the cluster and turbulent field. Each World only scales its strength, so the motion stays continuous while Shapes change." }, void 0, false, {
          fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
          lineNumber: 1084,
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
              lineNumber: 1090,
              columnNumber: 13
            },
            this
          );
        })
      ] }, group.id, true, {
        fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
        lineNumber: 1081,
        columnNumber: 7
      }, this)
    )
  ] }, void 0, true, {
    fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
    lineNumber: 1078,
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
        lineNumber: 1129,
        columnNumber: 15
      }, this),
      /* @__PURE__ */ jsxDEV("strong", { children: section.label }, void 0, false, {
        fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
        lineNumber: 1129,
        columnNumber: 79
      }, this)
    ] }, void 0, true, {
      fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
      lineNumber: 1129,
      columnNumber: 7
    }, this),
    section.locked ? /* @__PURE__ */ jsxDEV("div", { className: "about-editor-lock", children: [
      /* @__PURE__ */ jsxDEV(LockKeyhole, { "aria-hidden": "true" }, void 0, false, {
        fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
        lineNumber: 1130,
        columnNumber: 60
      }, this),
      /* @__PURE__ */ jsxDEV("span", { children: "This protected Section cannot be reordered or have its World replaced accidentally." }, void 0, false, {
        fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
        lineNumber: 1130,
        columnNumber: 94
      }, this),
      /* @__PURE__ */ jsxDEV("button", { type: "button", onClick: () => update("Unlock protected Section", (draft) => {
        draft.locked = false;
      }), children: "Unlock advanced" }, void 0, false, {
        fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
        lineNumber: 1130,
        columnNumber: 190
      }, this)
    ] }, void 0, true, {
      fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
      lineNumber: 1130,
      columnNumber: 25
    }, this) : null,
    /* @__PURE__ */ jsxDEV("div", { className: "about-editor-inline-actions", children: [
      /* @__PURE__ */ jsxDEV("button", { type: "button", disabled: section.locked || sectionIndex === 0, onClick: () => move(-1), children: "Move earlier" }, void 0, false, {
        fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
        lineNumber: 1132,
        columnNumber: 9
      }, this),
      /* @__PURE__ */ jsxDEV("button", { type: "button", disabled: section.locked || sectionIndex === snapshot.document.sections.length - 1, onClick: () => move(1), children: "Move later" }, void 0, false, {
        fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
        lineNumber: 1133,
        columnNumber: 9
      }, this)
    ] }, void 0, true, {
      fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
      lineNumber: 1131,
      columnNumber: 7
    }, this),
    /* @__PURE__ */ jsxDEV(Property, { label: "Section name", children: /* @__PURE__ */ jsxDEV("input", { value: section.label, onChange: (event) => update("Rename Section", (draft) => {
      draft.label = event.target.value;
    }, `section:${section.id}:label`) }, void 0, false, {
      fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
      lineNumber: 1135,
      columnNumber: 38
    }, this) }, void 0, false, {
      fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
      lineNumber: 1135,
      columnNumber: 7
    }, this),
    /* @__PURE__ */ jsxDEV(Property, { label: "Stable ID", children: [
      /* @__PURE__ */ jsxDEV("input", { value: section.id, readOnly: true }, void 0, false, {
        fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
        lineNumber: 1136,
        columnNumber: 35
      }, this),
      /* @__PURE__ */ jsxDEV("small", { children: "References this Section without tying it to its current meaning." }, void 0, false, {
        fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
        lineNumber: 1136,
        columnNumber: 72
      }, this)
    ] }, void 0, true, {
      fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
      lineNumber: 1136,
      columnNumber: 7
    }, this),
    /* @__PURE__ */ jsxDEV(Property, { label: "Type", children: /* @__PURE__ */ jsxDEV("select", { value: section.type, disabled: section.type === "finale", onChange: (event) => update("Change Section type", (draft) => {
      draft.type = event.target.value;
    }), children: [
      /* @__PURE__ */ jsxDEV("option", { value: "spatial", children: "Spatial" }, void 0, false, {
        fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
        lineNumber: 1139,
        columnNumber: 11
      }, this),
      /* @__PURE__ */ jsxDEV("option", { value: "editorial", children: "Editorial" }, void 0, false, {
        fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
        lineNumber: 1139,
        columnNumber: 51
      }, this),
      /* @__PURE__ */ jsxDEV("option", { value: "finale", children: "Finale" }, void 0, false, {
        fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
        lineNumber: 1139,
        columnNumber: 95
      }, this)
    ] }, void 0, true, {
      fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
      lineNumber: 1138,
      columnNumber: 9
    }, this) }, void 0, false, {
      fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
      lineNumber: 1137,
      columnNumber: 7
    }, this),
    /* @__PURE__ */ jsxDEV("details", { open: true, children: [
      /* @__PURE__ */ jsxDEV("summary", { children: "Section timing" }, void 0, false, {
        fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
        lineNumber: 1143,
        columnNumber: 9
      }, this),
      /* @__PURE__ */ jsxDEV(Property, { label: "Scroll travel", children: /* @__PURE__ */ jsxDEV("output", { className: "about-editor-readout", children: formatWU(Math.max(0, activeExtent - 1)) }, void 0, false, {
        fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
        lineNumber: 1144,
        columnNumber: 41
      }, this) }, void 0, false, {
        fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
        lineNumber: 1144,
        columnNumber: 9
      }, this),
      /* @__PURE__ */ jsxDEV(Property, { label: "Total height", children: /* @__PURE__ */ jsxDEV("output", { className: "about-editor-readout", children: formatWU(activeExtent) }, void 0, false, {
        fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
        lineNumber: 1145,
        columnNumber: 40
      }, this) }, void 0, false, {
        fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
        lineNumber: 1145,
        columnNumber: 9
      }, this),
      /* @__PURE__ */ jsxDEV(NumberProperty, { label: "Desktop length", value: section.extentWU, min: 1, max: 8, step: 0.05, unit: "WU", onChange: (value) => update("Change desktop Section length", (draft) => {
        draft.extentWU = value;
      }, `section:${section.id}:extent`) }, void 0, false, {
        fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
        lineNumber: 1146,
        columnNumber: 9
      }, this),
      /* @__PURE__ */ jsxDEV(NumberProperty, { label: "Mobile length", value: section.mobileExtentWU, min: 1, max: 8, step: 0.05, unit: "WU", onChange: (value) => update("Change mobile Section length", (draft) => {
        draft.mobileExtentWU = value;
      }, `section:${section.id}:mobile`) }, void 0, false, {
        fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
        lineNumber: 1147,
        columnNumber: 9
      }, this),
      /* @__PURE__ */ jsxDEV(Property, { label: "Resolved height", children: /* @__PURE__ */ jsxDEV("output", { className: "about-editor-readout", children: formatWU(resolvedExtent) }, void 0, false, {
        fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
        lineNumber: 1148,
        columnNumber: 43
      }, this) }, void 0, false, {
        fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
        lineNumber: 1148,
        columnNumber: 9
      }, this),
      contentMinimumActive ? /* @__PURE__ */ jsxDEV("p", { className: "about-editor-timing-warning", children: [
        "Content minimum in effect. The rendered copy needs ",
        formatWU(resolvedExtent),
        " in this profile."
      ] }, void 0, true, {
        fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
        lineNumber: 1149,
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
          lineNumber: 1150,
          columnNumber: 9
        },
        this
      )
    ] }, void 0, true, {
      fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
      lineNumber: 1142,
      columnNumber: 7
    }, this),
    section.type === "editorial" ? /* @__PURE__ */ jsxDEV(EditorialBlocks, { store, snapshot, section }, void 0, false, {
      fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
      lineNumber: 1157,
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
        lineNumber: 1159,
        columnNumber: 7
      },
      this
    ) : null
  ] }, void 0, true, {
    fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
    lineNumber: 1128,
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
      lineNumber: 1197,
      columnNumber: 7
    }, this),
    (section.text.blocks || []).map(
      (block, blockIndex) => /* @__PURE__ */ jsxDEV("div", { className: "about-editor-block", children: [
        /* @__PURE__ */ jsxDEV("div", { children: [
          /* @__PURE__ */ jsxDEV("code", { children: block.kind }, void 0, false, {
            fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
            lineNumber: 1200,
            columnNumber: 16
          }, this),
          /* @__PURE__ */ jsxDEV("span", { children: block.id }, void 0, false, {
            fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
            lineNumber: 1200,
            columnNumber: 41
          }, this)
        ] }, void 0, true, {
          fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
          lineNumber: 1200,
          columnNumber: 11
        }, this),
        block.label != null ? /* @__PURE__ */ jsxDEV(Property, { label: "Label", children: /* @__PURE__ */ jsxDEV("input", { value: block.label, onChange: (event) => updateBlock(blockIndex, "label", event.target.value) }, void 0, false, {
          fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
          lineNumber: 1201,
          columnNumber: 58
        }, this) }, void 0, false, {
          fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
          lineNumber: 1201,
          columnNumber: 34
        }, this) : null,
        block.text != null ? /* @__PURE__ */ jsxDEV(Property, { label: "Copy", children: /* @__PURE__ */ jsxDEV("textarea", { rows: "5", value: block.text, onChange: (event) => updateBlock(blockIndex, "text", event.target.value) }, void 0, false, {
          fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
          lineNumber: 1202,
          columnNumber: 56
        }, this) }, void 0, false, {
          fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
          lineNumber: 1202,
          columnNumber: 33
        }, this) : null,
        block.kind === "prose" ? /* @__PURE__ */ jsxDEV(Property, { label: "Reconnect point grid", children: /* @__PURE__ */ jsxDEV("input", { type: "checkbox", checked: block.worldInfluence === true, onChange: (event) => updateBlock(blockIndex, "worldInfluence", event.target.checked) }, void 0, false, {
          fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
          lineNumber: 1203,
          columnNumber: 76
        }, this) }, void 0, false, {
          fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
          lineNumber: 1203,
          columnNumber: 37
        }, this) : null,
        block.text != null ? /* @__PURE__ */ jsxDEV("div", { className: "about-editor-emphasis-controls", children: [
          /* @__PURE__ */ jsxDEV("span", { children: "Highlighted words" }, void 0, false, {
            fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
            lineNumber: 1206,
            columnNumber: 15
          }, this),
          (block.emphasis || []).map(
            (item, emphasisIndex) => /* @__PURE__ */ jsxDEV("div", { className: "about-editor-emphasis-row", children: [
              /* @__PURE__ */ jsxDEV("input", { "aria-label": "Highlighted phrase", value: item.text, onChange: (event) => updateEmphasis(blockIndex, emphasisIndex, "text", event.target.value) }, void 0, false, {
                fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
                lineNumber: 1209,
                columnNumber: 19
              }, this),
              /* @__PURE__ */ jsxDEV("select", { "aria-label": "Highlight colour", value: item.tone, onChange: (event) => updateEmphasis(blockIndex, emphasisIndex, "tone", event.target.value), children: ABOUT_NARRATIVE_EMPHASIS_TONES.map((tone) => /* @__PURE__ */ jsxDEV("option", { value: tone, children: tone }, tone, false, {
                fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
                lineNumber: 1211,
                columnNumber: 67
              }, this)) }, void 0, false, {
                fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
                lineNumber: 1210,
                columnNumber: 19
              }, this),
              /* @__PURE__ */ jsxDEV("button", { type: "button", "aria-label": `Remove ${item.text || "empty"} highlight`, onClick: () => removeEmphasis(blockIndex, emphasisIndex), children: "×" }, void 0, false, {
                fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
                lineNumber: 1213,
                columnNumber: 19
              }, this)
            ] }, `${block.id}-emphasis-${emphasisIndex}`, true, {
              fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
              lineNumber: 1208,
              columnNumber: 11
            }, this)
          ),
          /* @__PURE__ */ jsxDEV("button", { type: "button", onClick: () => addEmphasis(blockIndex), children: "Add highlight" }, void 0, false, {
            fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
            lineNumber: 1216,
            columnNumber: 15
          }, this)
        ] }, void 0, true, {
          fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
          lineNumber: 1205,
          columnNumber: 9
        }, this) : null,
        block.items ? /* @__PURE__ */ jsxDEV(Property, { label: "Items", children: /* @__PURE__ */ jsxDEV("textarea", { rows: "6", value: block.items.join("\n"), onChange: (event) => updateBlock(blockIndex, "items", event.target.value.split("\n").filter(Boolean)) }, void 0, false, {
          fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
          lineNumber: 1219,
          columnNumber: 50
        }, this) }, void 0, false, {
          fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
          lineNumber: 1219,
          columnNumber: 26
        }, this) : null
      ] }, block.id, true, {
        fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
        lineNumber: 1199,
        columnNumber: 7
      }, this)
    ),
    /* @__PURE__ */ jsxDEV("button", { type: "button", className: "about-editor-wide-action", onClick: () => store.commit("Add editorial block", (draft) => {
      draft.sections[sectionIndex].text.blocks.push({ id: nextId(draft, `${section.id}-prose`), kind: "prose", text: "New editorial paragraph." });
    }), children: "Add prose block" }, void 0, false, {
      fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
      lineNumber: 1222,
      columnNumber: 7
    }, this)
  ] }, void 0, true, {
    fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
    lineNumber: 1196,
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
    lineNumber: 1234,
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
        lineNumber: 1254,
        columnNumber: 15
      }, this),
      /* @__PURE__ */ jsxDEV("strong", { children: cue.id }, void 0, false, {
        fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
        lineNumber: 1254,
        columnNumber: 36
      }, this)
    ] }, void 0, true, {
      fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
      lineNumber: 1254,
      columnNumber: 7
    }, this),
    selectedMembers.length > 1 ? /* @__PURE__ */ jsxDEV("div", { className: "about-editor-group-summary", children: [
      /* @__PURE__ */ jsxDEV("strong", { children: [
        selectedMembers.length,
        " titles selected"
      ] }, void 0, true, {
        fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
        lineNumber: 1257,
        columnNumber: 11
      }, this),
      /* @__PURE__ */ jsxDEV("ol", { children: selectedMembers.map((member) => {
        const memberSection = snapshot.document.sections.find((item) => item.id === member.sectionId);
        const memberCue = memberSection?.text?.cues?.find((item) => item.id === member.cueId);
        return /* @__PURE__ */ jsxDEV("li", { children: [
          /* @__PURE__ */ jsxDEV("span", { children: memberSection?.label }, void 0, false, {
            fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
            lineNumber: 1261,
            columnNumber: 68
          }, this),
          memberCue?.text
        ] }, `${member.sectionId}:${member.cueId}`, true, {
          fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
          lineNumber: 1261,
          columnNumber: 20
        }, this);
      }) }, void 0, false, {
        fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
        lineNumber: 1258,
        columnNumber: 11
      }, this),
      /* @__PURE__ */ jsxDEV("button", { type: "button", onClick: () => store.setSelection({ type: "cue", sectionId: section.id, cueId: cue.id, keyPart: "focus" }), children: "Keep primary only" }, void 0, false, {
        fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
        lineNumber: 1263,
        columnNumber: 11
      }, this)
    ] }, void 0, true, {
      fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
      lineNumber: 1256,
      columnNumber: 7
    }, this) : null,
    /* @__PURE__ */ jsxDEV("p", { className: "about-editor-help", children: "Drag the pink timing marker anywhere from 0–100% of its Section. This moves the title's focus time only. Its travel duration, speed, blur, and in/out cadence remain controlled globally under Spatial titles." }, void 0, false, {
      fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
      lineNumber: 1266,
      columnNumber: 7
    }, this),
    /* @__PURE__ */ jsxDEV(Property, { label: "Statement", children: /* @__PURE__ */ jsxDEV("textarea", { rows: "7", value: cue.text, onChange: (event) => update("text", event.target.value) }, void 0, false, {
      fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
      lineNumber: 1267,
      columnNumber: 35
    }, this) }, void 0, false, {
      fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
      lineNumber: 1267,
      columnNumber: 7
    }, this),
    /* @__PURE__ */ jsxDEV(Property, { label: "Movement", children: /* @__PURE__ */ jsxDEV("select", { value: movement, onChange: (event) => updateMovement(event.target.value), children: [
      /* @__PURE__ */ jsxDEV("option", { value: "spatial", children: "Spatial travel" }, void 0, false, {
        fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
        lineNumber: 1268,
        columnNumber: 116
      }, this),
      /* @__PURE__ */ jsxDEV("option", { value: "vertical", children: "Vertical scroll" }, void 0, false, {
        fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
        lineNumber: 1268,
        columnNumber: 163
      }, this)
    ] }, void 0, true, {
      fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
      lineNumber: 1268,
      columnNumber: 34
    }, this) }, void 0, false, {
      fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
      lineNumber: 1268,
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
        lineNumber: 1269,
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
        lineNumber: 1281,
        columnNumber: 41
      }, this) }, void 0, false, {
        fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
        lineNumber: 1281,
        columnNumber: 11
      }, this),
      /* @__PURE__ */ jsxDEV(Property, { label: "Motion preset", children: /* @__PURE__ */ jsxDEV("select", { value: cue.preset, onChange: (event) => update("preset", event.target.value), children: [
        /* @__PURE__ */ jsxDEV("option", { value: "travelling-title-v1", children: "Travelling title" }, void 0, false, {
          fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
          lineNumber: 1282,
          columnNumber: 129
        }, this),
        /* @__PURE__ */ jsxDEV("option", { value: "opener-v1", children: "Opener" }, void 0, false, {
          fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
          lineNumber: 1282,
          columnNumber: 190
        }, this),
        /* @__PURE__ */ jsxDEV("option", { value: "finale-v1", children: "Finale" }, void 0, false, {
          fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
          lineNumber: 1282,
          columnNumber: 231
        }, this)
      ] }, void 0, true, {
        fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
        lineNumber: 1282,
        columnNumber: 43
      }, this) }, void 0, false, {
        fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
        lineNumber: 1282,
        columnNumber: 11
      }, this)
    ] }, void 0, true, {
      fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
      lineNumber: 1280,
      columnNumber: 7
    }, this) : /* @__PURE__ */ jsxDEV(Property, { label: "Reveal", children: /* @__PURE__ */ jsxDEV("output", { className: "about-editor-readout", children: "Editorial vertical scroll" }, void 0, false, {
      fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
      lineNumber: 1284,
      columnNumber: 32
    }, this) }, void 0, false, {
      fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
      lineNumber: 1284,
      columnNumber: 7
    }, this),
    /* @__PURE__ */ jsxDEV("button", { type: "button", className: "about-editor-danger", disabled: section.type === "finale", onClick: remove, children: "Delete Cue" }, void 0, false, {
      fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
      lineNumber: 1285,
      columnNumber: 7
    }, this)
  ] }, void 0, true, {
    fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
    lineNumber: 1253,
    columnNumber: 5
  }, this);
}
_c8 = CueInspector;
function DisciplineRevealInspector({ store, snapshot, section }) {
  const sectionIndex = getSectionIndex(snapshot.document, section.id);
  const reveal = section.text.disciplineReveal;
  if (!reveal) return /* @__PURE__ */ jsxDEV(SectionInspector, { store, snapshot, section }, void 0, false, {
    fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
    lineNumber: 1293,
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
        lineNumber: 1317,
        columnNumber: 15
      }, this),
      /* @__PURE__ */ jsxDEV("strong", { children: "Discipline reveal" }, void 0, false, {
        fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
        lineNumber: 1317,
        columnNumber: 41
      }, this)
    ] }, void 0, true, {
      fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
      lineNumber: 1317,
      columnNumber: 7
    }, this),
    /* @__PURE__ */ jsxDEV("p", { className: "about-editor-help", children: "One clip controls the complete six-point sequence. Drag its striped block in the Text lane to move every reveal together." }, void 0, false, {
      fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
      lineNumber: 1318,
      columnNumber: 7
    }, this),
    /* @__PURE__ */ jsxDEV("details", { open: true, children: [
      /* @__PURE__ */ jsxDEV("summary", { children: "Reveal choreography" }, void 0, false, {
        fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
        lineNumber: 1319,
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
            lineNumber: 1323,
            columnNumber: 13
          },
          this
        );
      })
    ] }, void 0, true, {
      fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
      lineNumber: 1319,
      columnNumber: 7
    }, this),
    /* @__PURE__ */ jsxDEV("details", { open: true, children: [
      /* @__PURE__ */ jsxDEV("summary", { children: "Reveal order and labels" }, void 0, false, {
        fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
        lineNumber: 1336,
        columnNumber: 21
      }, this),
      /* @__PURE__ */ jsxDEV("div", { className: "about-editor-discipline-items", children: reveal.items.map(
        (item, itemIndex) => /* @__PURE__ */ jsxDEV("div", { className: "about-editor-discipline-item", children: [
          /* @__PURE__ */ jsxDEV("code", { children: String(itemIndex + 1).padStart(2, "0") }, void 0, false, {
            fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
            lineNumber: 1340,
            columnNumber: 15
          }, this),
          /* @__PURE__ */ jsxDEV("input", { value: item.label, "aria-label": `Discipline ${itemIndex + 1} label`, onChange: (event) => update("Edit discipline label", (draft) => {
            draft.items[itemIndex].label = event.target.value;
          }, `discipline-reveal:${section.id}:item:${item.group}:label`) }, void 0, false, {
            fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
            lineNumber: 1341,
            columnNumber: 15
          }, this),
          /* @__PURE__ */ jsxDEV("div", { className: "about-editor-discipline-palette", title: `${item.label} uses the Home simulation ${DISCIPLINE_BALL_TOKEN_BY_GROUP[item.group]}`, children: [
            /* @__PURE__ */ jsxDEV("i", { style: { background: `var(${DISCIPLINE_BALL_TOKEN_BY_GROUP[item.group]})` } }, void 0, false, {
              fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
              lineNumber: 1343,
              columnNumber: 17
            }, this),
            /* @__PURE__ */ jsxDEV("code", { children: DISCIPLINE_BALL_TOKEN_BY_GROUP[item.group] }, void 0, false, {
              fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
              lineNumber: 1344,
              columnNumber: 17
            }, this)
          ] }, void 0, true, {
            fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
            lineNumber: 1342,
            columnNumber: 15
          }, this),
          /* @__PURE__ */ jsxDEV("span", { children: [
            /* @__PURE__ */ jsxDEV("button", { type: "button", disabled: itemIndex === 0, "aria-label": `Reveal ${item.label} earlier`, onClick: () => update("Reorder discipline reveal", (draft) => {
              const [moved] = draft.items.splice(itemIndex, 1);
              draft.items.splice(itemIndex - 1, 0, moved);
            }), children: "↑" }, void 0, false, {
              fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
              lineNumber: 1347,
              columnNumber: 17
            }, this),
            /* @__PURE__ */ jsxDEV("button", { type: "button", disabled: itemIndex === reveal.items.length - 1, "aria-label": `Reveal ${item.label} later`, onClick: () => update("Reorder discipline reveal", (draft) => {
              const [moved] = draft.items.splice(itemIndex, 1);
              draft.items.splice(itemIndex + 1, 0, moved);
            }), children: "↓" }, void 0, false, {
              fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
              lineNumber: 1348,
              columnNumber: 17
            }, this)
          ] }, void 0, true, {
            fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
            lineNumber: 1346,
            columnNumber: 15
          }, this)
        ] }, item.group, true, {
          fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
          lineNumber: 1339,
          columnNumber: 11
        }, this)
      ) }, void 0, false, {
        fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
        lineNumber: 1337,
        columnNumber: 9
      }, this)
    ] }, void 0, true, {
      fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
      lineNumber: 1336,
      columnNumber: 7
    }, this),
    /* @__PURE__ */ jsxDEV("p", { className: "about-editor-help", children: "The six points persist after the labels leave. An editorial block marked “Reconnect point grid” restores the surrounding grid as that paragraph enters." }, void 0, false, {
      fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
      lineNumber: 1354,
      columnNumber: 7
    }, this)
  ] }, void 0, true, {
    fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
    lineNumber: 1316,
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
    lineNumber: 1418,
    columnNumber: 127
  }, this)) }, void 0, false, {
    fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
    lineNumber: 1418,
    columnNumber: 19
  }, this);
  if (!key) {
    return /* @__PURE__ */ jsxDEV(Fragment, { children: [
      /* @__PURE__ */ jsxDEV("header", { children: [
        /* @__PURE__ */ jsxDEV("span", { children: "Camera track" }, void 0, false, {
          fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
          lineNumber: 1420,
          columnNumber: 22
        }, this),
        /* @__PURE__ */ jsxDEV("strong", { children: "Editing Section base" }, void 0, false, {
          fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
          lineNumber: 1420,
          columnNumber: 47
        }, this)
      ] }, void 0, true, {
        fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
        lineNumber: 1420,
        columnNumber: 14
      }, this),
      /* @__PURE__ */ jsxDEV("p", { className: "about-editor-help", children: "The dolly and Section joins are continuous automatically. Add visible keys only where the framing, aim, roll, or lens should change." }, void 0, false, {
        fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
        lineNumber: 1420,
        columnNumber: 93
      }, this),
      recipes,
      /* @__PURE__ */ jsxDEV("button", { type: "button", className: "about-editor-wide-action", onClick: setKey, children: [
        "Set camera key at ",
        formatCameraPercent(targetAt)
      ] }, void 0, true, {
        fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
        lineNumber: 1420,
        columnNumber: 271
      }, this)
    ] }, void 0, true, {
      fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
      lineNumber: 1420,
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
        lineNumber: 1439,
        columnNumber: 15
      }, this),
      /* @__PURE__ */ jsxDEV("strong", { children: [
        formatCameraPercent(key.at),
        " through ",
        section.label
      ] }, void 0, true, {
        fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
        lineNumber: 1439,
        columnNumber: 38
      }, this)
    ] }, void 0, true, {
      fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
      lineNumber: 1439,
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
        lineNumber: 1441,
        columnNumber: 7
      },
      this
    ),
    /* @__PURE__ */ jsxDEV(NumberProperty, { label: extentLabel, value: section[extentField], min: 1, max: 8, step: 0.05, unit: "WU", onChange: updateExtent }, void 0, false, {
      fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
      lineNumber: 1450,
      columnNumber: 7
    }, this),
    ["X offset", "Y offset", "Forward offset"].map((label, axis) => /* @__PURE__ */ jsxDEV(NumberProperty, { label, value: key.offset[axis], min: -8, max: 8, step: 0.02, unit: "WU", onChange: (value) => updateVector("offset", axis, value) }, label, false, {
      fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
      lineNumber: 1451,
      columnNumber: 72
    }, this)),
    ["Aim X", "Aim Y", "Aim depth"].map((label, axis) => /* @__PURE__ */ jsxDEV(NumberProperty, { label, value: key.lookAtOffset[axis], min: -8, max: 8, step: 0.02, unit: "WU", onChange: (value) => updateVector("lookAtOffset", axis, value) }, label, false, {
      fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
      lineNumber: 1452,
      columnNumber: 61
    }, this)),
    /* @__PURE__ */ jsxDEV(NumberProperty, { label: "Field of view", value: key.fov, min: 20, max: 90, step: 1, unit: "°", onChange: (value) => update("fov", value) }, void 0, false, {
      fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
      lineNumber: 1453,
      columnNumber: 7
    }, this),
    /* @__PURE__ */ jsxDEV(NumberProperty, { label: "Roll", value: key.roll, min: -1.2, max: 1.2, step: 0.01, unit: "rad", onChange: (value) => update("roll", value) }, void 0, false, {
      fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
      lineNumber: 1454,
      columnNumber: 7
    }, this),
    /* @__PURE__ */ jsxDEV(Property, { label: "Easing", children: /* @__PURE__ */ jsxDEV("select", { value: key.easing, onChange: (event) => update("easing", event.target.value), children: [
      /* @__PURE__ */ jsxDEV("option", { value: "smoothstep", children: "Smoothstep" }, void 0, false, {
        fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
        lineNumber: 1455,
        columnNumber: 118
      }, this),
      /* @__PURE__ */ jsxDEV("option", { value: "ease-in-out", children: "Ease in out" }, void 0, false, {
        fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
        lineNumber: 1455,
        columnNumber: 164
      }, this)
    ] }, void 0, true, {
      fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
      lineNumber: 1455,
      columnNumber: 32
    }, this) }, void 0, false, {
      fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
      lineNumber: 1455,
      columnNumber: 7
    }, this),
    /* @__PURE__ */ jsxDEV("button", { type: "button", className: "about-editor-wide-action", disabled: existingKeyAtPlayhead >= 0, onClick: setKey, children: existingKeyAtPlayhead >= 0 ? `Camera key already at ${formatCameraPercent(targetAt)}` : `Set another key at ${formatCameraPercent(targetAt)}` }, void 0, false, {
      fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
      lineNumber: 1456,
      columnNumber: 7
    }, this),
    /* @__PURE__ */ jsxDEV("button", { type: "button", className: "about-editor-danger", onClick: () => store.commit("Delete camera key", (draft) => {
      draft.sections[sectionIndex].camera.keys.splice(keyIndex, 1);
    }, { selection: { type: "section", sectionId: section.id } }), children: "Delete key" }, void 0, false, {
      fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
      lineNumber: 1457,
      columnNumber: 7
    }, this)
  ] }, void 0, true, {
    fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
    lineNumber: 1438,
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
          lineNumber: 1472,
          columnNumber: 22
        }, this),
        /* @__PURE__ */ jsxDEV("strong", { children: "Inherited World" }, void 0, false, {
          fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
          lineNumber: 1472,
          columnNumber: 46
        }, this)
      ] }, void 0, true, {
        fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
        lineNumber: 1472,
        columnNumber: 14
      }, this),
      /* @__PURE__ */ jsxDEV("p", { className: "about-editor-help", children: "This Section keeps the previous World. Choose “Create World clip” only when the shape should change here." }, void 0, false, {
        fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
        lineNumber: 1472,
        columnNumber: 87
      }, this),
      /* @__PURE__ */ jsxDEV("button", { type: "button", className: "about-editor-wide-action", onClick: () => store.commit("Create World clip", (draft) => {
        draft.sections[sectionIndex].world = cloneAboutNarrativeDocument(draft.sections.slice(0, sectionIndex).reverse().find((item) => item.world.mode === "set")?.world || draft.sections[0].world);
      }), children: "Create World clip" }, void 0, false, {
        fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
        lineNumber: 1472,
        columnNumber: 229
      }, this)
    ] }, void 0, true, {
      fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
      lineNumber: 1472,
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
        lineNumber: 1505,
        columnNumber: 15
      }, this),
      /* @__PURE__ */ jsxDEV("strong", { children: shape?.label || world.shapeId }, void 0, false, {
        fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
        lineNumber: 1505,
        columnNumber: 38
      }, this)
    ] }, void 0, true, {
      fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
      lineNumber: 1505,
      columnNumber: 7
    }, this),
    /* @__PURE__ */ jsxDEV("div", { className: "about-editor-shape-catalog", children: Object.values(ABOUT_NARRATIVE_SHAPE_DEFINITIONS).map(
      (item) => /* @__PURE__ */ jsxDEV("button", { type: "button", disabled: section.locked, className: item.id === world.shapeId ? "is-selected" : "", onClick: () => tryShape(item.id), children: [
        /* @__PURE__ */ jsxDEV("i", {}, void 0, false, {
          fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
          lineNumber: 1509,
          columnNumber: 13
        }, this),
        /* @__PURE__ */ jsxDEV("span", { children: [
          /* @__PURE__ */ jsxDEV("strong", { children: item.label }, void 0, false, {
            fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
            lineNumber: 1509,
            columnNumber: 24
          }, this),
          /* @__PURE__ */ jsxDEV("small", { children: [
            "Cost ",
            item.cost,
            " · Point field"
          ] }, void 0, true, {
            fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
            lineNumber: 1509,
            columnNumber: 53
          }, this)
        ] }, void 0, true, {
          fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
          lineNumber: 1509,
          columnNumber: 18
        }, this)
      ] }, item.id, true, {
        fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
        lineNumber: 1508,
        columnNumber: 9
      }, this)
    ) }, void 0, false, {
      fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
      lineNumber: 1506,
      columnNumber: 7
    }, this),
    snapshot.tryState ? /* @__PURE__ */ jsxDEV("div", { className: "about-editor-try", children: [
      /* @__PURE__ */ jsxDEV("span", { children: [
        "Trying ",
        snapshot.tryState.label
      ] }, void 0, true, {
        fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
        lineNumber: 1513,
        columnNumber: 62
      }, this),
      /* @__PURE__ */ jsxDEV("button", { type: "button", onClick: () => store.cancelTry(), children: "Cancel" }, void 0, false, {
        fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
        lineNumber: 1513,
        columnNumber: 107
      }, this),
      /* @__PURE__ */ jsxDEV("button", { type: "button", className: "is-primary", onClick: () => store.applyTry(), children: "Apply" }, void 0, false, {
        fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
        lineNumber: 1513,
        columnNumber: 178
      }, this)
    ] }, void 0, true, {
      fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
      lineNumber: 1513,
      columnNumber: 28
    }, this) : null,
    /* @__PURE__ */ jsxDEV("details", { open: true, children: [
      /* @__PURE__ */ jsxDEV("summary", { children: "Shape parameters" }, void 0, false, {
        fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
        lineNumber: 1514,
        columnNumber: 21
      }, this),
      (shape?.parameters || []).map((control) => /* @__PURE__ */ jsxDEV(NumberProperty, { label: control.label, value: world.shapeParameters[control.id], min: control.min, max: control.max, step: control.step, unit: control.unit, onChange: (value) => update(`Change ${control.label}`, (draft) => {
        draft.shapeParameters[control.id] = value;
      }, `world:${section.id}:${control.id}`) }, control.id, false, {
        fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
        lineNumber: 1515,
        columnNumber: 53
      }, this)),
      /* @__PURE__ */ jsxDEV("div", { className: "about-editor-inline-actions", children: [
        /* @__PURE__ */ jsxDEV("button", { type: "button", onClick: () => update("Reseed Shape", (draft) => {
          draft.seed = Math.floor(Math.random() * 4294967295);
        }), children: "Reseed" }, void 0, false, {
          fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
          lineNumber: 1516,
          columnNumber: 54
        }, this),
        /* @__PURE__ */ jsxDEV("code", { children: world.seed }, void 0, false, {
          fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
          lineNumber: 1516,
          columnNumber: 197
        }, this)
      ] }, void 0, true, {
        fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
        lineNumber: 1516,
        columnNumber: 9
      }, this)
    ] }, void 0, true, {
      fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
      lineNumber: 1514,
      columnNumber: 7
    }, this),
    /* @__PURE__ */ jsxDEV("details", { open: true, children: [
      /* @__PURE__ */ jsxDEV("summary", { children: "Placement" }, void 0, false, {
        fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
        lineNumber: 1518,
        columnNumber: 21
      }, this),
      /* @__PURE__ */ jsxDEV(NumberProperty, { label: "Distance at entry", value: world.entryDistanceWU, min: 0.2, max: 16, step: 0.05, unit: "WU", onChange: (value) => update("Move World", (draft) => {
        draft.entryDistanceWU = value;
      }, `world:${section.id}:distance`) }, void 0, false, {
        fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
        lineNumber: 1519,
        columnNumber: 9
      }, this),
      /* @__PURE__ */ jsxDEV(NumberProperty, { label: "Scale", value: world.transform.scale, min: 0.1, max: 3, step: 0.01, onChange: (value) => update("Scale World", (draft) => {
        draft.transform.scale = value;
      }, `world:${section.id}:scale`) }, void 0, false, {
        fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
        lineNumber: 1520,
        columnNumber: 9
      }, this)
    ] }, void 0, true, {
      fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
      lineNumber: 1518,
      columnNumber: 7
    }, this),
    /* @__PURE__ */ jsxDEV("details", { open: true, children: [
      /* @__PURE__ */ jsxDEV("summary", { children: "Transition in" }, void 0, false, {
        fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
        lineNumber: 1522,
        columnNumber: 21
      }, this),
      transitionEnabled ? /* @__PURE__ */ jsxDEV(Fragment, { children: [
        /* @__PURE__ */ jsxDEV("p", { className: "about-editor-help", children: [
          "Timing is relative to this Section: 1 is its end; values above 1 continue across inherited World Sections. The next World begins at ",
          transitionLimit.toFixed(3),
          "."
        ] }, void 0, true, {
          fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
          lineNumber: 1524,
          columnNumber: 11
        }, this),
        /* @__PURE__ */ jsxDEV(NumberProperty, { label: "Start", value: world.transitionIn.start, min: 0, max: transitionMax, step: 5e-3, unit: "× section", onChange: (value) => update("Change transition start", (draft) => {
          draft.transitionIn.start = Math.min(value, draft.transitionIn.end);
        }) }, void 0, false, {
          fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
          lineNumber: 1525,
          columnNumber: 11
        }, this),
        /* @__PURE__ */ jsxDEV(NumberProperty, { label: "End", value: world.transitionIn.end, min: 0, max: transitionMax, step: 5e-3, unit: "× section", onChange: (value) => update("Change transition end", (draft) => {
          draft.transitionIn.end = Math.max(value, draft.transitionIn.start);
        }) }, void 0, false, {
          fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
          lineNumber: 1526,
          columnNumber: 11
        }, this),
        /* @__PURE__ */ jsxDEV(Property, { label: "Type", children: /* @__PURE__ */ jsxDEV("select", { value: world.transitionIn.type, onChange: (event) => update("Change transition type", (draft) => {
          draft.transitionIn.type = event.target.value;
        }), children: [
          /* @__PURE__ */ jsxDEV("option", { value: "morph", children: "Morph" }, void 0, false, {
            fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
            lineNumber: 1527,
            columnNumber: 189
          }, this),
          /* @__PURE__ */ jsxDEV("option", { value: "dissolve-morph", children: "Dissolve morph" }, void 0, false, {
            fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
            lineNumber: 1527,
            columnNumber: 225
          }, this),
          /* @__PURE__ */ jsxDEV("option", { value: "crossfade", children: "Crossfade" }, void 0, false, {
            fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
            lineNumber: 1527,
            columnNumber: 279
          }, this),
          /* @__PURE__ */ jsxDEV("option", { value: "hold", children: "Hold" }, void 0, false, {
            fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
            lineNumber: 1527,
            columnNumber: 323
          }, this)
        ] }, void 0, true, {
          fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
          lineNumber: 1527,
          columnNumber: 34
        }, this) }, void 0, false, {
          fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
          lineNumber: 1527,
          columnNumber: 11
        }, this),
        /* @__PURE__ */ jsxDEV(Property, { label: "Easing", children: /* @__PURE__ */ jsxDEV("select", { value: world.transitionIn.easing, onChange: (event) => update("Change transition easing", (draft) => {
          draft.transitionIn.easing = event.target.value;
        }), children: [
          /* @__PURE__ */ jsxDEV("option", { value: "linear", children: "Linear" }, void 0, false, {
            fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
            lineNumber: 1528,
            columnNumber: 197
          }, this),
          /* @__PURE__ */ jsxDEV("option", { value: "smoothstep", children: "Smoothstep" }, void 0, false, {
            fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
            lineNumber: 1528,
            columnNumber: 235
          }, this),
          /* @__PURE__ */ jsxDEV("option", { value: "ease-in", children: "Ease in" }, void 0, false, {
            fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
            lineNumber: 1528,
            columnNumber: 281
          }, this),
          /* @__PURE__ */ jsxDEV("option", { value: "ease-out", children: "Ease out" }, void 0, false, {
            fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
            lineNumber: 1528,
            columnNumber: 321
          }, this),
          /* @__PURE__ */ jsxDEV("option", { value: "ease-in-out", children: "Ease in out" }, void 0, false, {
            fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
            lineNumber: 1528,
            columnNumber: 363
          }, this),
          /* @__PURE__ */ jsxDEV("option", { value: "hold", children: "Hold" }, void 0, false, {
            fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
            lineNumber: 1528,
            columnNumber: 411
          }, this)
        ] }, void 0, true, {
          fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
          lineNumber: 1528,
          columnNumber: 36
        }, this) }, void 0, false, {
          fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
          lineNumber: 1528,
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
          lineNumber: 1529,
          columnNumber: 11
        }, this),
        /* @__PURE__ */ jsxDEV(Property, { label: "Correspondence", children: /* @__PURE__ */ jsxDEV("select", { "aria-label": "Correspondence", value: world.transitionIn.correspondence, disabled: !correspondenceEnabled, title: correspondenceEnabled ? "Choose how source points are assigned to target points." : "Correspondence applies to Morph and Dissolve morph transitions.", onChange: (event) => update("Change correspondence", (draft) => {
          draft.transitionIn.correspondence = event.target.value;
        }), children: ABOUT_NARRATIVE_CORRESPONDENCE_MODES.map((mode) => /* @__PURE__ */ jsxDEV("option", { value: mode, children: CORRESPONDENCE_LABELS[mode] || mode }, mode, false, {
          fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
          lineNumber: 1530,
          columnNumber: 490
        }, this)) }, void 0, false, {
          fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
          lineNumber: 1530,
          columnNumber: 44
        }, this) }, void 0, false, {
          fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
          lineNumber: 1530,
          columnNumber: 11
        }, this),
        /* @__PURE__ */ jsxDEV("p", { className: "about-editor-help", role: "status", "aria-live": "polite", children: [
          "Correspondence: ",
          correspondenceStatus,
          prepared && runtimeMetrics?.correspondenceToWorldId === section.id && Number.isFinite(runtimeMetrics?.correspondenceImprovement) ? ` · ${Math.round(runtimeMetrics.correspondenceImprovement * 100)}% RMS improvement` : "",
          "."
        ] }, void 0, true, {
          fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
          lineNumber: 1531,
          columnNumber: 11
        }, this),
        /* @__PURE__ */ jsxDEV("button", { type: "button", className: "about-editor-danger", onClick: () => store.commit("Remove World transition", (draft) => {
          const transition = draft.sections[sectionIndex].world.transitionIn;
          transition.start = 0;
          transition.end = 0;
          transition.type = "cut";
        }, { selection: { type: "world", sectionId: section.id } }), children: "Remove transition keyframes" }, void 0, false, {
          fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
          lineNumber: 1532,
          columnNumber: 11
        }, this)
      ] }, void 0, true, {
        fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
        lineNumber: 1523,
        columnNumber: 30
      }, this) : /* @__PURE__ */ jsxDEV(Fragment, { children: [
        /* @__PURE__ */ jsxDEV("p", { className: "about-editor-help", children: "This World cuts in at the Section boundary and has no transition keyframes." }, void 0, false, {
          fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
          lineNumber: 1539,
          columnNumber: 11
        }, this),
        /* @__PURE__ */ jsxDEV("button", { type: "button", className: "about-editor-wide-action", onClick: () => store.commit("Add World transition", (draft) => {
          const transition = draft.sections[sectionIndex].world.transitionIn;
          transition.start = Math.min(0.08, transitionLimit);
          transition.end = Math.min(0.68, transitionLimit);
          transition.type = "morph";
        }, { selection: { type: "world", sectionId: section.id } }), children: "Add transition keyframes" }, void 0, false, {
          fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
          lineNumber: 1540,
          columnNumber: 11
        }, this)
      ] }, void 0, true, {
        fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
        lineNumber: 1538,
        columnNumber: 15
      }, this)
    ] }, void 0, true, {
      fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
      lineNumber: 1522,
      columnNumber: 7
    }, this),
    /* @__PURE__ */ jsxDEV("details", { open: true, children: [
      /* @__PURE__ */ jsxDEV("summary", { children: "Modifier stack" }, void 0, false, {
        fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
        lineNumber: 1548,
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
                lineNumber: 1557,
                columnNumber: 105
              }, this),
              definition?.label || item.id
            ] }, void 0, true, {
              fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
              lineNumber: 1557,
              columnNumber: 98
            }, this),
            /* @__PURE__ */ jsxDEV("span", { children: [
              /* @__PURE__ */ jsxDEV("button", { type: "button", disabled: modifierIndex === 0, onClick: () => moveModifier(-1), "aria-label": "Move modifier up", children: "↑" }, void 0, false, {
                fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
                lineNumber: 1557,
                columnNumber: 334
              }, this),
              /* @__PURE__ */ jsxDEV("button", { type: "button", disabled: modifierIndex === world.modifiers.length - 1, onClick: () => moveModifier(1), "aria-label": "Move modifier down", children: "↓" }, void 0, false, {
                fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
                lineNumber: 1557,
                columnNumber: 460
              }, this),
              " Cost ",
              definition?.cost || "?"
            ] }, void 0, true, {
              fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
              lineNumber: 1557,
              columnNumber: 328
            }, this)
          ] }, void 0, true, {
            fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
            lineNumber: 1557,
            columnNumber: 93
          }, this),
          (definition?.parameters || []).map((control) => control.type === "range" ? /* @__PURE__ */ jsxDEV(NumberProperty, { label: control.label, value: item.parameters[control.id], min: control.min, max: control.max, step: control.step, unit: control.unit, onChange: (value) => update(`Change ${control.label}`, (draft) => {
            draft.modifiers[modifierIndex].parameters[control.id] = value;
          }, `modifier:${section.id}:${modifierIndex}:${control.id}`) }, control.id, false, {
            fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
            lineNumber: 1557,
            columnNumber: 732
          }, this) : /* @__PURE__ */ jsxDEV(Property, { label: control.label, children: /* @__PURE__ */ jsxDEV("select", { value: item.parameters[control.id], onChange: (event) => update(`Change ${control.label}`, (draft) => {
            draft.modifiers[modifierIndex].parameters[control.id] = event.target.value;
          }), children: control.options.map((option) => /* @__PURE__ */ jsxDEV("option", { children: option }, option, false, {
            fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
            lineNumber: 1557,
            columnNumber: 1366
          }, this)) }, void 0, false, {
            fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
            lineNumber: 1557,
            columnNumber: 1143
          }, this) }, control.id, false, {
            fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
            lineNumber: 1557,
            columnNumber: 1094
          }, this))
        ] }, `${item.id}-${modifierIndex}`, true, {
          fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
          lineNumber: 1557,
          columnNumber: 18
        }, this);
      })
    ] }, void 0, true, {
      fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
      lineNumber: 1548,
      columnNumber: 7
    }, this)
  ] }, void 0, true, {
    fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
    lineNumber: 1504,
    columnNumber: 5
  }, this);
}
_c1 = WorldInspector;
function Diagnostics({ diagnostics }) {
  if (!diagnostics.length) return /* @__PURE__ */ jsxDEV("div", { className: "about-editor-diagnostics is-clear", children: [
    /* @__PURE__ */ jsxDEV(Check, { "aria-hidden": "true" }, void 0, false, {
      fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
      lineNumber: 1565,
      columnNumber: 86
    }, this),
    " No diagnostics"
  ] }, void 0, true, {
    fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
    lineNumber: 1565,
    columnNumber: 35
  }, this);
  return /* @__PURE__ */ jsxDEV("div", { className: "about-editor-diagnostics", children: diagnostics.map((item, index) => {
    const DiagnosticIcon = item.level === "error" ? CircleAlert : Info;
    return /* @__PURE__ */ jsxDEV("div", { className: `is-${item.level}`, children: [
      /* @__PURE__ */ jsxDEV(DiagnosticIcon, { "aria-hidden": "true" }, void 0, false, {
        fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
        lineNumber: 1568,
        columnNumber: 93
      }, this),
      /* @__PURE__ */ jsxDEV("span", { children: [
        /* @__PURE__ */ jsxDEV("strong", { children: item.message }, void 0, false, {
          fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
          lineNumber: 1568,
          columnNumber: 136
        }, this),
        /* @__PURE__ */ jsxDEV("small", { children: item.path }, void 0, false, {
          fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
          lineNumber: 1568,
          columnNumber: 167
        }, this)
      ] }, void 0, true, {
        fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
        lineNumber: 1568,
        columnNumber: 130
      }, this)
    ] }, `${item.code}-${item.path}-${index}`, true, {
      fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
      lineNumber: 1568,
      columnNumber: 14
    }, this);
  }) }, void 0, false, {
    fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
    lineNumber: 1566,
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
    lineNumber: 1579,
    columnNumber: 17
  }, this);
  if (snapshot.selection.type === "sequence") content = /* @__PURE__ */ jsxDEV(SequenceInspector, { store, snapshot }, void 0, false, {
    fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
    lineNumber: 1580,
    columnNumber: 57
  }, this);
  if (snapshot.selection.type === "cue") content = /* @__PURE__ */ jsxDEV(CueInspector, { store, snapshot, section }, void 0, false, {
    fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
    lineNumber: 1581,
    columnNumber: 52
  }, this);
  if (snapshot.selection.type === "discipline-reveal") content = /* @__PURE__ */ jsxDEV(DisciplineRevealInspector, { store, snapshot, section }, void 0, false, {
    fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
    lineNumber: 1582,
    columnNumber: 66
  }, this);
  if (snapshot.selection.type === "camera-key") content = /* @__PURE__ */ jsxDEV(CameraInspector, { store, snapshot, section }, void 0, false, {
    fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
    lineNumber: 1583,
    columnNumber: 59
  }, this);
  if (snapshot.selection.type === "world") content = /* @__PURE__ */ jsxDEV(WorldInspector, { store, snapshot, section, runtimeMetrics }, void 0, false, {
    fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
    lineNumber: 1584,
    columnNumber: 54
  }, this);
  if (snapshot.selection.type === "interaction") content = /* @__PURE__ */ jsxDEV(SectionInspector, { store, snapshot, section }, void 0, false, {
    fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
    lineNumber: 1585,
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
          lineNumber: 1685,
          columnNumber: 63
        }, this)
      ] }, void 0, true, {
        fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
        lineNumber: 1685,
        columnNumber: 7
      }, this)
    },
    void 0,
    false,
    {
      fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
      lineNumber: 1668,
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
        lineNumber: 1694,
        columnNumber: 12
      }, this),
      /* @__PURE__ */ jsxDEV("span", { children: [
        formatWU(snapshot.transport.storyWU),
        " / ",
        formatWU(total)
      ] }, void 0, true, {
        fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
        lineNumber: 1694,
        columnNumber: 52
      }, this)
    ] }, void 0, true, {
      fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
      lineNumber: 1694,
      columnNumber: 7
    }, this),
    /* @__PURE__ */ jsxDEV("svg", { viewBox: "0 0 240 112", role: "img", "aria-label": "Camera and World anchors over story distance", children: [
      /* @__PURE__ */ jsxDEV("path", { d: "M18 56 H222" }, void 0, false, {
        fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
        lineNumber: 1696,
        columnNumber: 9
      }, this),
      sections.map((section) => {
        const x = 18 + section.startWU / total * 204;
        return /* @__PURE__ */ jsxDEV("g", { transform: `translate(${x} 56)`, children: [
          /* @__PURE__ */ jsxDEV("line", { y1: "-12", y2: "12" }, void 0, false, {
            fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
            lineNumber: 1699,
            columnNumber: 71
          }, this),
          /* @__PURE__ */ jsxDEV("circle", { r: section.worldState?.changesWorld ? 4 : 2 }, void 0, false, {
            fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
            lineNumber: 1699,
            columnNumber: 96
          }, this),
          /* @__PURE__ */ jsxDEV("title", { children: [
            section.label,
            section.worldState?.changesWorld ? ` · ${section.worldState.activeWorld.shapeId}` : ""
          ] }, void 0, true, {
            fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
            lineNumber: 1699,
            columnNumber: 151
          }, this)
        ] }, section.id, true, {
          fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
          lineNumber: 1699,
          columnNumber: 18
        }, this);
      }),
      /* @__PURE__ */ jsxDEV("g", { className: "is-playhead", transform: `translate(${18 + snapshot.transport.storyWU / total * 204} 56)`, children: [
        /* @__PURE__ */ jsxDEV("path", { d: "M0 -22 L5 -15 H-5 Z" }, void 0, false, {
          fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
          lineNumber: 1701,
          columnNumber: 113
        }, this),
        /* @__PURE__ */ jsxDEV("line", { y1: "-15", y2: "22" }, void 0, false, {
          fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
          lineNumber: 1701,
          columnNumber: 145
        }, this)
      ] }, void 0, true, {
        fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
        lineNumber: 1701,
        columnNumber: 9
      }, this)
    ] }, void 0, true, {
      fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
      lineNumber: 1695,
      columnNumber: 7
    }, this),
    /* @__PURE__ */ jsxDEV("small", { children: "Dots are Section boundaries. Large dots are fixed World anchors. The marker is the published camera." }, void 0, false, {
      fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
      lineNumber: 1703,
      columnNumber: 7
    }, this)
  ] }, void 0, true, {
    fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
    lineNumber: 1693,
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
                lineNumber: 1925,
                columnNumber: 119
              }, this),
              /* @__PURE__ */ jsxDEV("span", { children: "About Narrative" }, void 0, false, {
                fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
                lineNumber: 1925,
                columnNumber: 149
              }, this),
              /* @__PURE__ */ jsxDEV("small", { children: "Creative toolkit" }, void 0, false, {
                fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
                lineNumber: 1925,
                columnNumber: 177
              }, this)
            ] }, void 0, true, {
              fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
              lineNumber: 1925,
              columnNumber: 9
            }, this),
            /* @__PURE__ */ jsxDEV(Transport, { store, snapshot }, void 0, false, {
              fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
              lineNumber: 1926,
              columnNumber: 9
            }, this),
            /* @__PURE__ */ jsxDEV("div", { className: "about-editor-actions", children: [
              /* @__PURE__ */ jsxDEV("button", { type: "button", disabled: !snapshot.history.canUndo, title: snapshot.history.undoLabel || "Undo", "aria-label": "Undo", onClick: () => store.undo(), children: /* @__PURE__ */ jsxDEV("span", { "aria-hidden": "true", children: "↶" }, void 0, false, {
                fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
                lineNumber: 1928,
                columnNumber: 162
              }, this) }, void 0, false, {
                fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
                lineNumber: 1928,
                columnNumber: 11
              }, this),
              /* @__PURE__ */ jsxDEV("button", { type: "button", disabled: !snapshot.history.canRedo, title: snapshot.history.redoLabel || "Redo", "aria-label": "Redo", onClick: () => store.redo(), children: /* @__PURE__ */ jsxDEV("span", { "aria-hidden": "true", children: "↷" }, void 0, false, {
                fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
                lineNumber: 1929,
                columnNumber: 162
              }, this) }, void 0, false, {
                fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
                lineNumber: 1929,
                columnNumber: 11
              }, this),
              /* @__PURE__ */ jsxDEV("button", { type: "button", className: pathVisible ? "is-active" : "", onClick: () => setPathVisible(!pathVisible), children: "Path" }, void 0, false, {
                fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
                lineNumber: 1930,
                columnNumber: 11
              }, this),
              /* @__PURE__ */ jsxDEV("button", { type: "button", className: directorView ? "is-active" : "", onClick: toggleDirector, children: directorView ? "Director" : "Camera" }, void 0, false, {
                fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
                lineNumber: 1931,
                columnNumber: 11
              }, this),
              /* @__PURE__ */ jsxDEV("button", { type: "button", className: snapshot.tryState?.label === "Compare saved source" ? "is-active" : "", disabled: snapshot.tryState && snapshot.tryState.label !== "Compare saved source", onClick: toggleBefore, children: snapshot.tryState?.label === "Compare saved source" ? "Before" : "After" }, void 0, false, {
                fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
                lineNumber: 1932,
                columnNumber: 11
              }, this),
              /* @__PURE__ */ jsxDEV("details", { className: "about-editor-more", children: [
                /* @__PURE__ */ jsxDEV("summary", { children: "More" }, void 0, false, {
                  fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
                  lineNumber: 1934,
                  columnNumber: 13
                }, this),
                /* @__PURE__ */ jsxDEV("div", { children: [
                  /* @__PURE__ */ jsxDEV("button", { type: "button", onClick: addCheckpoint, children: "Checkpoint" }, void 0, false, {
                    fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
                    lineNumber: 1936,
                    columnNumber: 15
                  }, this),
                  /* @__PURE__ */ jsxDEV("button", { type: "button", onClick: () => exportAboutNarrativeDocument(snapshot.document), children: "Export JSON" }, void 0, false, {
                    fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
                    lineNumber: 1937,
                    columnNumber: 15
                  }, this),
                  /* @__PURE__ */ jsxDEV("button", { type: "button", onClick: () => importRef.current?.click(), children: "Import JSON" }, void 0, false, {
                    fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
                    lineNumber: 1938,
                    columnNumber: 15
                  }, this)
                ] }, void 0, true, {
                  fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
                  lineNumber: 1935,
                  columnNumber: 13
                }, this)
              ] }, void 0, true, {
                fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
                lineNumber: 1933,
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
                lineNumber: 1941,
                columnNumber: 11
              }, this),
              /* @__PURE__ */ jsxDEV("button", { type: "button", "data-about-editor-save": true, className: "is-save", disabled: snapshot.saveState.status === "saving", onClick: save, children: [
                /* @__PURE__ */ jsxDEV("span", { children: statusLabel }, void 0, false, {
                  fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
                  lineNumber: 1951,
                  columnNumber: 141
                }, this),
                /* @__PURE__ */ jsxDEV("kbd", { children: "⌘S" }, void 0, false, {
                  fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
                  lineNumber: 1951,
                  columnNumber: 167
                }, this)
              ] }, void 0, true, {
                fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
                lineNumber: 1951,
                columnNumber: 11
              }, this)
            ] }, void 0, true, {
              fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
              lineNumber: 1927,
              columnNumber: 9
            }, this)
          ] }, void 0, true, {
            fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
            lineNumber: 1924,
            columnNumber: 7
          }, this),
          snapshot.recoveryState.available ? /* @__PURE__ */ jsxDEV("div", { className: "about-editor-recovery", children: [
            /* @__PURE__ */ jsxDEV("span", { children: [
              "An unsaved draft from ",
              new Date(snapshot.recoveryState.draft.timestamp).toLocaleString(),
              " is available."
            ] }, void 0, true, {
              fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
              lineNumber: 1955,
              columnNumber: 82
            }, this),
            /* @__PURE__ */ jsxDEV("button", { type: "button", onClick: () => {
              store.replaceDocument("Recover draft", snapshot.recoveryState.draft.document);
              store.setRecoveryState({ available: false });
            }, children: "Recover as unsaved copy" }, void 0, false, {
              fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
              lineNumber: 1955,
              columnNumber: 198
            }, this),
            /* @__PURE__ */ jsxDEV("button", { type: "button", onClick: () => {
              exportAboutNarrativeDocument(snapshot.recoveryState.draft.document, "contents-about-recovered.json");
            }, children: "Export" }, void 0, false, {
              fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
              lineNumber: 1955,
              columnNumber: 394
            }, this),
            /* @__PURE__ */ jsxDEV("button", { type: "button", onClick: () => {
              clearAboutNarrativeRecoveryDraft();
              store.setRecoveryState({ available: false });
            }, children: "Discard" }, void 0, false, {
              fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
              lineNumber: 1955,
              columnNumber: 551
            }, this)
          ] }, void 0, true, {
            fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
            lineNumber: 1955,
            columnNumber: 43
          }, this) : null,
          snapshot.saveState.message ? /* @__PURE__ */ jsxDEV("div", { className: `about-editor-save-message is-${snapshot.saveState.status}`, children: [
            snapshot.saveState.message,
            /* @__PURE__ */ jsxDEV("button", { type: "button", "aria-label": "Dismiss message", onClick: () => store.setSaveState({ message: "" }), children: "×" }, void 0, false, {
              fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
              lineNumber: 1956,
              columnNumber: 142
            }, this)
          ] }, void 0, true, {
            fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
            lineNumber: 1956,
            columnNumber: 37
          }, this) : null,
          pathVisible ? /* @__PURE__ */ jsxDEV(CameraPathOverlay, { snapshot }, void 0, false, {
            fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
            lineNumber: 1958,
            columnNumber: 22
          }, this) : null,
          directorView ? /* @__PURE__ */ jsxDEV("div", { className: "about-editor-director-controls", children: [
            /* @__PURE__ */ jsxDEV("strong", { children: "Director View" }, void 0, false, {
              fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
              lineNumber: 1959,
              columnNumber: 71
            }, this),
            /* @__PURE__ */ jsxDEV("button", { type: "button", onClick: () => runtimeRef.current?.nudgeDirector?.({ yaw: -0.08 }), children: "←" }, void 0, false, {
              fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
              lineNumber: 1959,
              columnNumber: 101
            }, this),
            /* @__PURE__ */ jsxDEV("button", { type: "button", onClick: () => runtimeRef.current?.nudgeDirector?.({ pitch: 0.08 }), children: "↑" }, void 0, false, {
              fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
              lineNumber: 1959,
              columnNumber: 201
            }, this),
            /* @__PURE__ */ jsxDEV("button", { type: "button", onClick: () => runtimeRef.current?.nudgeDirector?.({ pitch: -0.08 }), children: "↓" }, void 0, false, {
              fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
              lineNumber: 1959,
              columnNumber: 302
            }, this),
            /* @__PURE__ */ jsxDEV("button", { type: "button", onClick: () => runtimeRef.current?.nudgeDirector?.({ yaw: 0.08 }), children: "→" }, void 0, false, {
              fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
              lineNumber: 1959,
              columnNumber: 404
            }, this),
            /* @__PURE__ */ jsxDEV("button", { type: "button", onClick: () => runtimeRef.current?.nudgeDirector?.({ distance: -0.2 }), children: "＋" }, void 0, false, {
              fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
              lineNumber: 1959,
              columnNumber: 503
            }, this),
            /* @__PURE__ */ jsxDEV("button", { type: "button", onClick: () => runtimeRef.current?.nudgeDirector?.({ distance: 0.2 }), children: "−" }, void 0, false, {
              fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
              lineNumber: 1959,
              columnNumber: 607
            }, this),
            /* @__PURE__ */ jsxDEV("button", { type: "button", onClick: () => runtimeRef.current?.resetDirector?.(), children: "Reset" }, void 0, false, {
              fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
              lineNumber: 1959,
              columnNumber: 710
            }, this),
            /* @__PURE__ */ jsxDEV("small", { children: "Temporary inspection only. Published Camera keys are unchanged." }, void 0, false, {
              fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
              lineNumber: 1959,
              columnNumber: 800
            }, this)
          ] }, void 0, true, {
            fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
            lineNumber: 1959,
            columnNumber: 23
          }, this) : null,
          /* @__PURE__ */ jsxDEV(Inspector, { store, snapshot, timelineOpen, runtimeMetrics }, void 0, false, {
            fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
            lineNumber: 1961,
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
                  lineNumber: 1969,
                  columnNumber: 25
                }, this) : /* @__PURE__ */ jsxDEV(ChevronUp, { "aria-hidden": "true" }, void 0, false, {
                  fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
                  lineNumber: 1969,
                  columnNumber: 62
                }, this),
                /* @__PURE__ */ jsxDEV("span", { children: timelineOpen ? "Hide timeline" : "Show timeline" }, void 0, false, {
                  fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
                  lineNumber: 1969,
                  columnNumber: 95
                }, this)
              ]
            },
            void 0,
            true,
            {
              fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
              lineNumber: 1962,
              columnNumber: 7
            },
            this
          ),
          /* @__PURE__ */ jsxDEV("div", { id: "about-editor-timeline-panel", className: "about-editor-bottom", "aria-hidden": !timelineOpen, children: [
            /* @__PURE__ */ jsxDEV("div", { className: "about-editor-contextbar", children: [
              /* @__PURE__ */ jsxDEV("span", { children: [
                /* @__PURE__ */ jsxDEV("strong", { children: selected?.label || "Sequence" }, void 0, false, {
                  fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
                  lineNumber: 1972,
                  columnNumber: 17
                }, this),
                " ",
                selected ? `${selected.type} · ${formatWU(Math.max(0, selectedExtent - 1))} scroll · ${formatWU(selectedExtent)} total${resolvedExtent > selectedExtent + 1e-3 ? ` · ${formatWU(resolvedExtent)} resolved` : ""}` : ""
              ] }, void 0, true, {
                fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
                lineNumber: 1972,
                columnNumber: 11
              }, this),
              selectedCueCount > 1 ? /* @__PURE__ */ jsxDEV("span", { className: "about-editor-selection-count", children: [
                selectedCueCount,
                " titles selected"
              ] }, void 0, true, {
                fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
                lineNumber: 1973,
                columnNumber: 35
              }, this) : null,
              /* @__PURE__ */ jsxDEV("span", { children: snapshot.autoKey ? "Auto-key armed" : "Auto-key off" }, void 0, false, {
                fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
                lineNumber: 1974,
                columnNumber: 11
              }, this),
              /* @__PURE__ */ jsxDEV("button", { type: "button", className: snapshot.autoKey ? "is-active" : "", onClick: () => store.setAutoKey(!snapshot.autoKey), children: "◆ Auto-key" }, void 0, false, {
                fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
                lineNumber: 1975,
                columnNumber: 11
              }, this),
              /* @__PURE__ */ jsxDEV("button", { type: "button", className: loopActive ? "is-active" : "", onClick: toggleLoop, children: "Loop Section" }, void 0, false, {
                fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
                lineNumber: 1976,
                columnNumber: 11
              }, this),
              /* @__PURE__ */ jsxDEV("button", { type: "button", onClick: fitSequence, children: "Fit sequence" }, void 0, false, {
                fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
                lineNumber: 1977,
                columnNumber: 11
              }, this),
              /* @__PURE__ */ jsxDEV("button", { type: "button", disabled: !compiledSelected, onClick: fitSection, children: "Fit Section" }, void 0, false, {
                fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
                lineNumber: 1978,
                columnNumber: 11
              }, this),
              ["camera", "world", "text"].map((track) => /* @__PURE__ */ jsxDEV("button", { type: "button", className: snapshot.transport.soloTrack === track ? "is-active" : "", onClick: () => toggleSolo(track), children: [
                "Solo ",
                track
              ] }, track, true, {
                fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
                lineNumber: 1979,
                columnNumber: 55
              }, this)),
              timelineDeletion ? /* @__PURE__ */ jsxDEV("button", { type: "button", className: "about-editor-delete-key", disabled: timelineDeletion.disabled, title: timelineDeletion.message || `${timelineDeletion.label} · Delete/Backspace`, onClick: () => deleteTimelineSelection(store, snapshot), children: [
                /* @__PURE__ */ jsxDEV(Trash2, { "aria-hidden": "true" }, void 0, false, {
                  fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
                  lineNumber: 1980,
                  columnNumber: 266
                }, this),
                timelineDeletion.label
              ] }, void 0, true, {
                fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
                lineNumber: 1980,
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
                lineNumber: 1981,
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
                  lineNumber: 1982,
                  columnNumber: 369
                }, this),
                checkpoints.map((item) => /* @__PURE__ */ jsxDEV("option", { value: item.id, children: item.name }, item.id, false, {
                  fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
                  lineNumber: 1982,
                  columnNumber: 456
                }, this))
              ] }, void 0, true, {
                fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
                lineNumber: 1982,
                columnNumber: 33
              }, this) : null
            ] }, void 0, true, {
              fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
              lineNumber: 1971,
              columnNumber: 9
            }, this),
            /* @__PURE__ */ jsxDEV(Timeline, { store, snapshot }, void 0, false, {
              fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
              lineNumber: 1984,
              columnNumber: 9
            }, this)
          ] }, void 0, true, {
            fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
            lineNumber: 1970,
            columnNumber: 7
          }, this),
          /* @__PURE__ */ jsxDEV("nav", { className: "about-editor-mobile-tabs", "aria-label": "Editor panel", children: [
            /* @__PURE__ */ jsxDEV("button", { type: "button", className: mobilePane === "sequence" ? "is-active" : "", onClick: () => setMobilePane("sequence"), children: "Sequence" }, void 0, false, {
              fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
              lineNumber: 1986,
              columnNumber: 75
            }, this),
            /* @__PURE__ */ jsxDEV("button", { type: "button", className: mobilePane === "inspect" ? "is-active" : "", onClick: () => setMobilePane("inspect"), children: "Inspect" }, void 0, false, {
              fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
              lineNumber: 1986,
              columnNumber: 213
            }, this),
            /* @__PURE__ */ jsxDEV("button", { type: "button", className: mobilePane === "preview" ? "is-active" : "", onClick: () => setMobilePane("preview"), children: "Preview" }, void 0, false, {
              fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
              lineNumber: 1986,
              columnNumber: 348
            }, this)
          ] }, void 0, true, {
            fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
            lineNumber: 1986,
            columnNumber: 7
          }, this)
        ]
      },
      void 0,
      true,
      {
        fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx",
        lineNumber: 1917,
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

//# sourceMappingURL=data:application/json;base64,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V0QsZUFBZSxZQUFZLGNBQWMsSUFBSSxTQUFTLE1BQU1DLGNBQWMsU0FBUyxHQUFHLHVCQUF2SDtBQUFBO0FBQUE7QUFBQTtBQUFBLG1CQUE4SDtBQUFBLFlBQVMsdUJBQUMsWUFBTyxNQUFLLFVBQVMsV0FBV0QsZUFBZSxZQUFZLGNBQWMsSUFBSSxTQUFTLE1BQU1DLGNBQWMsU0FBUyxHQUFHLHVCQUF2SDtBQUFBO0FBQUE7QUFBQTtBQUFBLG1CQUE4SDtBQUFBLGVBQW5kO0FBQUE7QUFBQTtBQUFBO0FBQUEsaUJBQTRkO0FBQUE7QUFBQTtBQUFBLE1BckU5ZDtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUEsSUFzRUE7QUFBQSxJQUNDM2YsU0FBU3ltQjtBQUFBQSxFQUFJO0FBQ2xCO0FBQUN4SCxJQXpSdUJILHNCQUFvQjtBQUFBLE9BQXBCQTtBQUFvQixJQUFBelcsSUFBQUssS0FBQVksS0FBQW9kLEtBQUFsUyxLQUFBZSxLQUFBa0IsS0FBQVcsS0FBQVMsS0FBQTZCLEtBQUE0QyxLQUFBTSxNQUFBK0osTUFBQTlILE1BQUErSDtBQUFBLGFBQUF2ZSxJQUFBO0FBQUEsYUFBQUssS0FBQTtBQUFBLGFBQUFZLEtBQUE7QUFBQSxhQUFBb2QsS0FBQTtBQUFBLGFBQUFsUyxLQUFBO0FBQUEsYUFBQWUsS0FBQTtBQUFBLGFBQUFrQixLQUFBO0FBQUEsYUFBQVcsS0FBQTtBQUFBLGFBQUFTLEtBQUE7QUFBQSxhQUFBNkIsS0FBQTtBQUFBLGFBQUE0QyxLQUFBO0FBQUEsYUFBQU0sTUFBQTtBQUFBLGFBQUErSixNQUFBO0FBQUEsYUFBQTlILE1BQUE7QUFBQSxhQUFBK0gsTUFBQSIsIm5hbWVzIjpbInVzZUVmZmVjdCIsInVzZVJlZiIsInVzZVN0YXRlIiwidXNlU3luY0V4dGVybmFsU3RvcmUiLCJjcmVhdGVQb3J0YWwiLCJDaGVjayIsIkNoZXZyb25Eb3duIiwiQ2hldnJvbkxlZnQiLCJDaGV2cm9uUmlnaHQiLCJDaGV2cm9uVXAiLCJDaXJjbGVBbGVydCIsIkRpYW1vbmQiLCJJbmZvIiwiTG9ja0tleWhvbGUiLCJQYXVzZSIsIlBsYXkiLCJTa2lwQmFjayIsIlNraXBGb3J3YXJkIiwiVHJhc2gyIiwiQUJPVVRfTkFSUkFUSVZFX0dMT0JBTF9DT05UUk9MUyIsIkFCT1VUX05BUlJBVElWRV9DT1JSRVNQT05ERU5DRV9NT0RFUyIsIkFCT1VUX05BUlJBVElWRV9ESVNDSVBMSU5FX1JFVkVBTF9DT05UUk9MUyIsIkFCT1VUX05BUlJBVElWRV9FTVBIQVNJU19UT05FUyIsIkFCT1VUX05BUlJBVElWRV9NT0RJRklFUl9ERUZJTklUSU9OUyIsIkFCT1VUX05BUlJBVElWRV9TSEFQRV9ERUZJTklUSU9OUyIsImNsZWFyQWJvdXROYXJyYXRpdmVSZWNvdmVyeURyYWZ0IiwiZXhwb3J0QWJvdXROYXJyYXRpdmVEb2N1bWVudCIsImxvYWRBYm91dE5hcnJhdGl2ZVNvdXJjZSIsInJlYWRBYm91dE5hcnJhdGl2ZUNoZWNrcG9pbnRzIiwicmVhZEFib3V0TmFycmF0aXZlUmVjb3ZlcnlEcmFmdCIsInNhdmVBYm91dE5hcnJhdGl2ZVNvdXJjZSIsIndyaXRlQWJvdXROYXJyYXRpdmVDaGVja3BvaW50Iiwid3JpdGVBYm91dE5hcnJhdGl2ZVJlY292ZXJ5RHJhZnQiLCJhc3NlcnRWYWxpZEFib3V0TmFycmF0aXZlRG9jdW1lbnQiLCJjbG9uZUFib3V0TmFycmF0aXZlRG9jdW1lbnQiLCJnZXRBYm91dE5hcnJhdGl2ZUN1ZU1vdmVtZW50IiwiZ2V0QWJvdXROYXJyYXRpdmVDdWVNb3Rpb25JbnRlcnZhbCIsImdldEFib3V0TmFycmF0aXZlV29ybGRUcmFuc2l0aW9uTGltaXQiLCJzYW1wbGVBYm91dE5hcnJhdGl2ZVBsYW4iLCJjYXB0dXJlQWJvdXROYXJyYXRpdmVQbGF5aGVhZENvbnRleHQiLCJnZXRBYm91dE5hcnJhdGl2ZUNhbWVyYUtleVRpbWluZ0JvdW5kcyIsImdldEFib3V0TmFycmF0aXZlQ3VlVGltaW5nQm91bmRzIiwiZ2V0QWJvdXROYXJyYXRpdmVFeHRlbnRGaWVsZCIsImdldEFib3V0TmFycmF0aXZlU2VsZWN0aW9uTWVtYmVycyIsIm1vdmVBYm91dE5hcnJhdGl2ZUN1ZVRpbWluZyIsInJlbWFwQWJvdXROYXJyYXRpdmVQbGF5aGVhZENvbnRleHQiLCJyZXNvbHZlQWJvdXROYXJyYXRpdmVDYW1lcmFLZXlEcm9wIiwicmVzb2x2ZUFib3V0TmFycmF0aXZlQ3VlR3JvdXBNb3ZlIiwic25hcEFib3V0TmFycmF0aXZlVGltZWxpbmVWYWx1ZSIsInRvZ2dsZUFib3V0TmFycmF0aXZlQ3VlU2VsZWN0aW9uIiwiY2xhbXAwMSIsInZhbHVlIiwiTWF0aCIsIm1pbiIsIm1heCIsIkFCT1VUX0VESVRPUl9USU1FTElORV9TVE9SQUdFX0tFWSIsIlRJTUVMSU5FX0tFWV9FUFNJTE9OIiwiSU5TUEVDVE9SX0VER0VfR0FQIiwiQ0FNRVJBX1BPU0VfRklFTERTIiwiU2V0IiwiRElTQ0lQTElORV9SRVZFQUxfTUFYIiwiZmluZCIsImNvbnRyb2wiLCJpZCIsIkRJU0NJUExJTkVfQkFMTF9UT0tFTl9CWV9HUk9VUCIsIk9iamVjdCIsImZyZWV6ZSIsImNhbWVyYVBvc2VDaGFuZ2VzIiwiZnJvbSIsInRvIiwic29tZSIsImZpZWxkIiwiaW5kZXgiLCJhYnMiLCJmb3YiLCJyb2xsIiwiY29weUNhbWVyYVBvc2UiLCJ0YXJnZXQiLCJzb3VyY2UiLCJvZmZzZXQiLCJsb29rQXRPZmZzZXQiLCJsaW5rQ2FtZXJhQm91bmRhcnkiLCJkb2N1bWVudCIsInNlY3Rpb25JbmRleCIsImtleUluZGV4Iiwic2VjdGlvbiIsInNlY3Rpb25zIiwia2V5IiwiY2FtZXJhIiwia2V5cyIsImF0IiwibGVuZ3RoIiwiYnJpZGdlQ2FtZXJhU2VjdGlvbiIsInN0aXRjaENhbWVyYUJvdW5kYXJpZXMiLCJnZXRJbnNwZWN0b3JWZXJ0aWNhbEJvdW5kcyIsImluc3BlY3RvciIsInRpbWVsaW5lT3BlbiIsImVkaXRvciIsImNsb3Nlc3QiLCJzdHlsZXMiLCJnZXRDb21wdXRlZFN0eWxlIiwidG9wYmFySGVpZ2h0IiwiTnVtYmVyIiwicGFyc2VGbG9hdCIsImdldFByb3BlcnR5VmFsdWUiLCJ0aW1lbGluZUhlaWdodCIsImJ1dHRvbkJhclRvcCIsInF1ZXJ5U2VsZWN0b3IiLCJnZXRCb3VuZGluZ0NsaWVudFJlY3QiLCJ0b3AiLCJ3aW5kb3ciLCJpbm5lckhlaWdodCIsIm1pblRvcCIsIm1heEJvdHRvbSIsImNsYW1wSW5zcGVjdG9yUG9zaXRpb24iLCJwb3NpdGlvbiIsIm1heFdpZHRoIiwiaW5uZXJXaWR0aCIsIndpZHRoIiwiYXZhaWxhYmxlSGVpZ2h0IiwiaGVpZ2h0IiwibWF4TGVmdCIsIm1heFRvcCIsImxlZnQiLCJnZXRTZWN0aW9uSW5kZXgiLCJzZWN0aW9uSWQiLCJmaW5kSW5kZXgiLCJnZXRTZWN0aW9uIiwic2VsZWN0aW9uIiwiZ2V0TG9jYWxQcm9ncmVzcyIsInBsYW4iLCJzdG9yeVdVIiwiY29tcGlsZWQiLCJpdGVtIiwic3RhcnRXVSIsInRyYXZlbFdVIiwiZm9ybWF0V1UiLCJ0b0ZpeGVkIiwiZm9ybWF0Q2FtZXJhUGVyY2VudCIsImlzVGV4dEVkaXRpbmdUYXJnZXQiLCJIVE1MRWxlbWVudCIsIm1hdGNoZXMiLCJpc0NvbnRlbnRFZGl0YWJsZSIsImdldFRpbWVsaW5lS2V5ZnJhbWVzIiwic25hcHNob3QiLCJjb21waWxlZFBsYW4iLCJldmVudHMiLCJmb3JFYWNoIiwidG9TdG9yeVdVIiwicHVzaCIsInByaW9yaXR5IiwidHlwZSIsIndvcmxkIiwibW9kZSIsInRyYW5zaXRpb25JbiIsInBhcnQiLCJwYXJ0SW5kZXgiLCJrZXlQYXJ0IiwidGV4dCIsImN1ZXMiLCJjdWUiLCJjdWVJbmRleCIsImhvbGQiLCJjdWVJZCIsImRpc2NpcGxpbmVSZXZlYWwiLCJzdGFydCIsImludGVyYWN0aW9uIiwiaXNGaW5pdGUiLCJhY3RpdmF0aW9uU3RhcnQiLCJzb3J0IiwiYSIsImIiLCJnZXRUaW1lbGluZURlbGV0aW9uIiwicmVxdWlyZWQiLCJsYWJlbCIsImRpc2FibGVkIiwibWVzc2FnZSIsImV4ZWN1dGUiLCJzdG9yZSIsImNvbW1pdCIsImRyYWZ0Iiwic3BsaWNlIiwic3RhcnRzV2l0aCIsInRyYW5zaXRpb24iLCJlbmQiLCJkZWxldGVUaW1lbGluZVNlbGVjdGlvbiIsImRlbGV0aW9uIiwic2V0U2F2ZVN0YXRlIiwic2Vla1RpbWVsaW5lS2V5ZnJhbWUiLCJldmVudCIsInNldFNlbGVjdGlvbiIsInNldFRyYW5zcG9ydCIsIm93bmVyIiwicGxheWluZyIsImp1bXBUaW1lbGluZUtleWZyYW1lIiwiZGlyZWN0aW9uIiwiY3VycmVudFdVIiwidHJhbnNwb3J0IiwidGFyZ2V0UG9zaXRpb24iLCJyZXZlcnNlIiwibWFrZVNsdWciLCJ0b0xvd2VyQ2FzZSIsInJlcGxhY2UiLCJuZXh0SWQiLCJiYXNlIiwidXNlZCIsImZsYXRNYXAiLCJtYXAiLCJibG9ja3MiLCJibG9jayIsInN1ZmZpeCIsImhhcyIsIlByb3BlcnR5IiwiY2hpbGRyZW4iLCJoaW50IiwiX2MiLCJOdW1iZXJQcm9wZXJ0eSIsInN0ZXAiLCJvbkNoYW5nZSIsInVuaXQiLCJfYzIiLCJUcmFuc3BvcnQiLCJtYXhXVSIsIm1heFN0b3J5V1UiLCJwbGF5Iiwic2VlayIsInNlbGVjdGVkIiwianVtcFNlY3Rpb24iLCJuZXh0IiwibGl2ZUFtYmllbnQiLCJwcmV2aWV3UHJvZmlsZSIsInNldFByZXZpZXdQcm9maWxlIiwiX2MzIiwiVGltZWxpbmUiLCJfcyIsInNlbGVjdGVkQ3VlTWVtYmVycyIsInJlZHVjZSIsInN1bSIsImV4dGVudFdVIiwicGxheWhlYWQiLCJsYW5lc1JlZiIsInRpbWluZ0RyYWdSZWYiLCJwcmV2aWV3RnJhbWVSZWYiLCJwZW5kaW5nUHJldmlld1JlZiIsInN1cHByZXNzZWRDbGlja1JlZiIsImNhbWVyYURyYWdQcmV2aWV3Iiwic2V0Q2FtZXJhRHJhZ1ByZXZpZXciLCJzZWN0aW9uUmVzaXplUHJldmlldyIsInNldFNlY3Rpb25SZXNpemVQcmV2aWV3IiwibWFycXVlZSIsInNldE1hcnF1ZWUiLCJxdWV1ZVByZXZpZXdGcmFtZSIsImNhbGxiYWNrIiwiY3VycmVudCIsInJlcXVlc3RBbmltYXRpb25GcmFtZSIsInBlbmRpbmciLCJmbHVzaFByZXZpZXdGcmFtZSIsImNhbmNlbEFuaW1hdGlvbkZyYW1lIiwiem9vbVRpbWVsaW5lIiwiY3RybEtleSIsIm1ldGFLZXkiLCJwcmV2ZW50RGVmYXVsdCIsImxhbmVzIiwicmVjdCIsInBvaW50ZXJYIiwiY2xpZW50WCIsInN0b3J5UmF0aW8iLCJzY3JvbGxMZWZ0Iiwic2Nyb2xsV2lkdGgiLCJjdXJyZW50Wm9vbSIsInpvb20iLCJuZXh0Wm9vbSIsImV4cCIsImRlbHRhWSIsInJlc29sdmVDYW1lcmFEcm9wQXRDbGllbnRYIiwiZ2V0U25hcHNob3QiLCJ2YWxpZCIsInJlYXNvbiIsImNvbnRlbnRYIiwiZHJhZyIsImRyb3AiLCJzb3VyY2VTZWN0aW9uSW5kZXgiLCJzb3VyY2VLZXlJbmRleCIsImJlZ2luVGltaW5nRHJhZyIsImxvY2tlZCIsImJ1dHRvbiIsImNsaXAiLCJjdXJyZW50VGFyZ2V0IiwicGFyZW50RWxlbWVudCIsInN0b3BQcm9wYWdhdGlvbiIsInNldFBvaW50ZXJDYXB0dXJlIiwicG9pbnRlcklkIiwibmV4dFNlbGVjdGlvbiIsImN1cnJlbnRTZWxlY3Rpb24iLCJjdXJyZW50TWVtYmVycyIsImFscmVhZHlTZWxlY3RlZCIsIm1lbWJlciIsInNoaWZ0S2V5IiwibWVtYmVycyIsImJlZ2luUHJldmlldyIsInN0YXJ0RG9jdW1lbnQiLCJzdGFydFBsYW4iLCJzdGFydFgiLCJtb3ZlZCIsImxhc3RBdCIsImxhc3REcm9wIiwibW92ZVRpbWluZ0RyYWciLCJ0b2tlbiIsImRlbHRhTGFuZSIsIm5leHRBdCIsImRlbHRhIiwicmV2ZWFsIiwiY29hbGVzY2VLZXkiLCJzZWN0aW9uU3RhcnRXVSIsImxvY2FsRGVsdGEiLCJtb3ZlbWVudCIsInByaW1hcnkiLCJkZWx0YVdVIiwibGFzdERlbHRhV1UiLCJ1cGRhdGVQcmV2aWV3IiwibW92ZXMiLCJtb3ZlIiwiYXNzaWduIiwiZW50ZXIiLCJleGl0IiwiZW5kVGltaW5nRHJhZyIsImhhc1BvaW50ZXJDYXB0dXJlIiwicmVsZWFzZVBvaW50ZXJDYXB0dXJlIiwiY2FuY2VsUHJldmlldyIsImNvbW1pdFByZXZpZXciLCJzb3VyY2VLZXlzIiwibW92ZWRLZXkiLCJkZXN0aW5hdGlvbktleXMiLCJzZXRUaW1lb3V0IiwiaGFuZGxlVGltaW5nQ2xpY2siLCJhY3Rpb24iLCJiZWdpblNlY3Rpb25SZXNpemUiLCJkYXRhIiwic2VjdGlvbkxhYmVsIiwic3RhcnRFeHRlbnQiLCJzdGFydE1heFdVIiwic3RhcnRTY3JvbGxXaWR0aCIsInBsYXloZWFkQ29udGV4dCIsInJlc2l6ZWRTZWN0aW9uSWQiLCJleHRlbnQiLCJtb3ZlU2VjdGlvblJlc2l6ZSIsInJhd0V4dGVudCIsImFsdEtleSIsInJvdW5kIiwibGFzdEV4dGVudCIsImVuZFNlY3Rpb25SZXNpemUiLCJyZXNldFNlY3Rpb25FeHRlbnQiLCJiYXNlbGluZVNlY3Rpb24iLCJiYXNlbGluZURvY3VtZW50IiwiY29udGV4dCIsImJlZ2luTWFycXVlZSIsImNhbnZhcyIsInN0YXJ0Q2xpZW50WCIsInN0YXJ0Q2xpZW50WSIsImNsaWVudFkiLCJjYW52YXNSZWN0IiwiYWRkaXRpdmUiLCJtb3ZlTWFycXVlZSIsImVuZE1hcnF1ZWUiLCJzZWxlY3Rpb25SZWN0IiwicmlnaHQiLCJib3R0b20iLCJsYW5lUmVjdCIsImhpdHMiLCJxdWVyeVNlbGVjdG9yQWxsIiwiZmlsdGVyIiwibm9kZSIsInZpc2libGUiLCJkYXRhc2V0Iiwic2xpY2UiLCJoaXQiLCJzb2xvVHJhY2siLCJsYW5lIiwibmV4dFN0YXJ0V1UiLCJzcGFuV1UiLCJpblNlbGVjdGVkU2VjdGlvbiIsImxvY2FsUGVyY2VudCIsImxvY2FsUG9zaXRpb24iLCJleHRlbmRlZExvY2FsUG9zaXRpb24iLCJleHRlbmRlZExvY2FsV2lkdGgiLCJ0ZXh0UG9zaXRpb24iLCJzZWxlY3RBdCIsImlzU2VsZWN0ZWQiLCJyZXNpemVFeHRlbnQiLCJyZXNvbHZlZEV4dGVudFdVIiwiU3RyaW5nIiwicGFkU3RhcnQiLCJmcm9tS2V5IiwidGltaW5nQm91bmRzIiwia2V5U2VsZWN0aW9uIiwidW5kZWZpbmVkIiwic2hhcGVJZCIsImlzUHJpbWFyeSIsImN1ZVNlbGVjdGlvbiIsImNvZGUiLCJkdXJhdGlvbiIsImNlbnRyZSIsInJldmVhbFNlbGVjdGlvbiIsImFjdGl2YXRpb24iLCJTZXF1ZW5jZUluc3BlY3RvciIsImNvbW1pdEdsb2JhbCIsImdyb3VwIiwiZ2xvYmFscyIsInRhcmdldEtleSIsImNvbnRyb2xzIiwiX2M1IiwiU2VjdGlvbkluc3BlY3RvciIsImNvbXBpbGVkU2VjdGlvbiIsImFjdGl2ZUV4dGVudEZpZWxkIiwiYWN0aXZlRXh0ZW50IiwicmVzb2x2ZWRFeHRlbnQiLCJjb250ZW50TWluaW11bUFjdGl2ZSIsInVwZGF0ZSIsIm11dGF0ZSIsInRvSW5kZXgiLCJtb2JpbGVFeHRlbnRXVSIsImxvY2FsIiwiZm9jdXMiLCJwcmVzZXQiLCJtb3Rpb24iLCJfYzYiLCJFZGl0b3JpYWxCbG9ja3MiLCJ1cGRhdGVCbG9jayIsImJsb2NrSW5kZXgiLCJ1cGRhdGVFbXBoYXNpcyIsImVtcGhhc2lzSW5kZXgiLCJlbXBoYXNpcyIsImFkZEVtcGhhc2lzIiwidHJpbSIsInNwbGl0Iiwiam9pbiIsInRvbmUiLCJyZW1vdmVFbXBoYXNpcyIsImtpbmQiLCJ3b3JsZEluZmx1ZW5jZSIsImNoZWNrZWQiLCJpdGVtcyIsIkJvb2xlYW4iLCJfYzciLCJDdWVJbnNwZWN0b3IiLCJzZWxlY3RlZE1lbWJlcnMiLCJyZW1vdmUiLCJtb3Rpb25JbnRlcnZhbCIsInRleHRNb3Rpb24iLCJtb3ZlQ3VlIiwicGVyY2VudCIsInVwZGF0ZU1vdmVtZW50IiwibWVtYmVyU2VjdGlvbiIsIm1lbWJlckN1ZSIsIl9jOCIsIkRpc2NpcGxpbmVSZXZlYWxJbnNwZWN0b3IiLCJvY2N1cGllZCIsInN0YWdnZXIiLCJsYWJlbER1cmF0aW9uIiwibGltaXRzRm9yIiwibGltaXRzIiwiaXRlbUluZGV4IiwiYmFja2dyb3VuZCIsIl9jOSIsIkNhbWVyYUluc3BlY3RvciIsInNlbGVjdGVkS2V5IiwidGFyZ2V0QXQiLCJhcHBseVByZXNldCIsInJlY2lwZXMiLCJQdXNoIiwiZWFzaW5nIiwiR2xpZGUiLCJPcmJpdCIsIlJldmVhbCIsIlJlc29sdmUiLCJleGlzdGluZ0tleUF0UGxheWhlYWQiLCJzZXRLZXkiLCJpbnNlcnRpb25JbmRleCIsInNlbGVjdGVkS2V5SW5kZXgiLCJzYW1wbGVkIiwiYmFzZVoiLCJzdGFydFoiLCJjYWRlbmNlIiwibmV3S2V5IiwiYXhpcyIsIm5hbWUiLCJBcnJheSIsImlzQXJyYXkiLCJ1cGRhdGVWZWN0b3IiLCJleHRlbnRGaWVsZCIsImV4dGVudExhYmVsIiwidXBkYXRlRXh0ZW50IiwiX2MwIiwiQ09SUkVTUE9OREVOQ0VfTEFCRUxTIiwiV29ybGRJbnNwZWN0b3IiLCJydW50aW1lTWV0cmljcyIsInNoYXBlIiwidHJhbnNpdGlvbkxpbWl0IiwidHJhbnNpdGlvbk1heCIsInRyYW5zaXRpb25FbmFibGVkIiwiY29ycmVzcG9uZGVuY2VFbmFibGVkIiwiaW5jbHVkZXMiLCJwcmV2aW91c1dvcmxkU2VjdGlvbiIsInNvdXJjZVNoYXBlIiwicHJlcGFyZWQiLCJwcmVwYXJlZFdvcmxkSWRzIiwiY29ycmVzcG9uZGVuY2VTdGF0dXMiLCJjb3JyZXNwb25kZW5jZVNlcXVlbmNlU3RhdGUiLCJjb3JyZXNwb25kZW5jZUZhbGxiYWNrIiwiY29ycmVzcG9uZGVuY2VUb1dvcmxkSWQiLCJ0cnlTaGFwZSIsImJlZ2luVHJ5Iiwic2hhcGVQYXJhbWV0ZXJzIiwiZnJvbUVudHJpZXMiLCJwYXJhbWV0ZXJzIiwidmFsdWVzIiwiY29zdCIsInRyeVN0YXRlIiwiY2FuY2VsVHJ5IiwiYXBwbHlUcnkiLCJzZWVkIiwiZmxvb3IiLCJyYW5kb20iLCJlbnRyeURpc3RhbmNlV1UiLCJ0cmFuc2Zvcm0iLCJzY2FsZSIsImNvcnJlc3BvbmRlbmNlIiwiY29ycmVzcG9uZGVuY2VJbXByb3ZlbWVudCIsIm1vZGlmaWVycyIsIm1vZGlmaWVySW5kZXgiLCJkZWZpbml0aW9uIiwibW92ZU1vZGlmaWVyIiwibmV4dEluZGV4IiwiZW5hYmxlZCIsIm9wdGlvbnMiLCJvcHRpb24iLCJfYzEiLCJEaWFnbm9zdGljcyIsImRpYWdub3N0aWNzIiwiRGlhZ25vc3RpY0ljb24iLCJsZXZlbCIsInBhdGgiLCJfYzEwIiwiSW5zcGVjdG9yIiwiX3MyIiwiaW5zcGVjdG9yUmVmIiwiZHJhZ1JlZiIsImxhc3RIZWFkZXJDbGlja1JlZiIsInNldFBvc2l0aW9uIiwiZHJhZ2dpbmciLCJzZXREcmFnZ2luZyIsImNvbnRlbnQiLCJrZWVwSW5Cb3VuZHMiLCJhZGRFdmVudExpc3RlbmVyIiwicmVtb3ZlRXZlbnRMaXN0ZW5lciIsImJlZ2luRHJhZyIsImZsb2F0aW5nSGVpZ2h0Iiwib3JpZ2luWCIsIm9yaWdpblkiLCJtb3ZlRHJhZyIsImRlbHRhWCIsImh5cG90IiwiZW5kRHJhZyIsIm5vdyIsInBlcmZvcm1hbmNlIiwicHJldmlvdXMiLCJ0aW1lIiwieCIsInkiLCJyZXNldFBvc2l0aW9uIiwiQ2FtZXJhUGF0aE92ZXJsYXkiLCJ0b3RhbCIsIndvcmxkU3RhdGUiLCJjaGFuZ2VzV29ybGQiLCJhY3RpdmVXb3JsZCIsIl9jMTIiLCJBYm91dE5hcnJhdGl2ZUVkaXRvciIsInJ1bnRpbWVSZWYiLCJyb290UmVmIiwiX3MzIiwic3Vic2NyaWJlIiwiY2hlY2twb2ludHMiLCJzZXRDaGVja3BvaW50cyIsInNldFJ1bnRpbWVNZXRyaWNzIiwicGF0aFZpc2libGUiLCJzZXRQYXRoVmlzaWJsZSIsImRpcmVjdG9yVmlldyIsInNldERpcmVjdG9yVmlldyIsIm1vYmlsZVBhbmUiLCJzZXRNb2JpbGVQYW5lIiwic2V0VGltZWxpbmVPcGVuIiwibG9jYWxTdG9yYWdlIiwiZ2V0SXRlbSIsImltcG9ydFJlZiIsInNuYXBzaG90UmVmIiwiYWN0aXZlU2VsZWN0aW9uIiwic2V0SXRlbSIsInJvb3QiLCJydW50aW1lIiwic2V0QXR0cmlidXRlIiwidGhlbiIsImhhc2giLCJkaXJ0eSIsInJlcGxhY2VEb2N1bWVudCIsInNldEJhc2VsaW5lIiwicmVjb3ZlcnkiLCJ0aW1lc3RhbXAiLCJEYXRlIiwic2V0UmVjb3ZlcnlTdGF0ZSIsImF2YWlsYWJsZSIsImVycm9yIiwiY2F0Y2giLCJzdGF0dXMiLCJyZW1vdmVBdHRyaWJ1dGUiLCJjbGFzc0xpc3QiLCJDU1MiLCJlc2NhcGUiLCJhZGQiLCJlZGl0b3JTZWxlY3Rpb25UeXBlIiwiaW50ZXJ2YWwiLCJzZXRJbnRlcnZhbCIsImdldE1ldHJpY3MiLCJjbGVhckludGVydmFsIiwidGltZXIiLCJiYXNlbGluZUhhc2giLCJjbGVhclRpbWVvdXQiLCJwYWdlaGlkZSIsImtleWRvd24iLCJjbGljayIsInJlZG8iLCJ1bmRvIiwicHJldmlld1N0YXRlIiwic2F2ZSIsImVkaXRvclVybCIsIlVSTCIsImxvY2F0aW9uIiwiaHJlZiIsInNlYXJjaFBhcmFtcyIsInNldCIsImhpc3RvcnkiLCJyZXBsYWNlU3RhdGUiLCJzdGF0ZSIsInBhdGhuYW1lIiwic2VhcmNoIiwic2VudCIsInJlc3VsdCIsIm1hcmtTYXZlZCIsImFkZENoZWNrcG9pbnQiLCJjaGVja3BvaW50IiwiY3J5cHRvIiwicmFuZG9tVVVJRCIsInRvTG9jYWxlVGltZVN0cmluZyIsImhvdXIiLCJtaW51dGUiLCJiYXNlU291cmNlSGFzaCIsInN0YXR1c0xhYmVsIiwic2F2ZVN0YXRlIiwiY29tcGlsZWRTZWxlY3RlZCIsInNlbGVjdGVkRXh0ZW50Iiwic2VsZWN0ZWRDdWVDb3VudCIsImxvb3BBY3RpdmUiLCJsb29wIiwidGltZWxpbmVEZWxldGlvbiIsInRvZ2dsZUxvb3AiLCJlbmRXVSIsInRvZ2dsZVNvbG8iLCJ0cmFjayIsImZpdFNlcXVlbmNlIiwiZml0U2VjdGlvbiIsInNlY3Rpb25TcGFuIiwic3RhcnRSYXRpbyIsImNsaWVudFdpZHRoIiwidG9nZ2xlRGlyZWN0b3IiLCJ0b2dnbGVCZWZvcmUiLCJjYW5VbmRvIiwidW5kb0xhYmVsIiwiY2FuUmVkbyIsInJlZG9MYWJlbCIsImZpbGUiLCJmaWxlcyIsImltcG9ydGVkIiwiSlNPTiIsInBhcnNlIiwicmVjb3ZlcnlTdGF0ZSIsInRvTG9jYWxlU3RyaW5nIiwibnVkZ2VEaXJlY3RvciIsInlhdyIsInBpdGNoIiwiZGlzdGFuY2UiLCJyZXNldERpcmVjdG9yIiwib3BlbiIsImF1dG9LZXkiLCJzZXRBdXRvS2V5IiwiZnJhbWVUaW1lTXMiLCJkcmF3Q2FsbHMiLCJwb2ludENvdW50IiwiYWN0aXZlTW9kaWZpZXJzIiwiYnVmZmVyUmVidWlsZHMiLCJmb3VuZCIsImJvZHkiLCJfYzQiLCJfYzExIiwiX2MxMyJdLCJpZ25vcmVMaXN0IjpbXSwic291cmNlcyI6WyJBYm91dE5hcnJhdGl2ZUVkaXRvci5qc3giXSwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHsgdXNlRWZmZWN0LCB1c2VSZWYsIHVzZVN0YXRlLCB1c2VTeW5jRXh0ZXJuYWxTdG9yZSB9IGZyb20gJ3JlYWN0JztcbmltcG9ydCB7IGNyZWF0ZVBvcnRhbCB9IGZyb20gJ3JlYWN0LWRvbSc7XG5pbXBvcnQge1xuICBDaGVjayxcbiAgQ2hldnJvbkRvd24sXG4gIENoZXZyb25MZWZ0LFxuICBDaGV2cm9uUmlnaHQsXG4gIENoZXZyb25VcCxcbiAgQ2lyY2xlQWxlcnQsXG4gIERpYW1vbmQsXG4gIEluZm8sXG4gIExvY2tLZXlob2xlLFxuICBQYXVzZSxcbiAgUGxheSxcbiAgU2tpcEJhY2ssXG4gIFNraXBGb3J3YXJkLFxuICBUcmFzaDIsXG59IGZyb20gJ2x1Y2lkZS1yZWFjdCc7XG5pbXBvcnQge1xuICBBQk9VVF9OQVJSQVRJVkVfR0xPQkFMX0NPTlRST0xTLFxuICBBQk9VVF9OQVJSQVRJVkVfQ09SUkVTUE9OREVOQ0VfTU9ERVMsXG4gIEFCT1VUX05BUlJBVElWRV9ESVNDSVBMSU5FX1JFVkVBTF9DT05UUk9MUyxcbiAgQUJPVVRfTkFSUkFUSVZFX0VNUEhBU0lTX1RPTkVTLFxuICBBQk9VVF9OQVJSQVRJVkVfTU9ESUZJRVJfREVGSU5JVElPTlMsXG4gIEFCT1VUX05BUlJBVElWRV9TSEFQRV9ERUZJTklUSU9OUyxcbn0gZnJvbSAnLi9hYm91dE5hcnJhdGl2ZURlZmluaXRpb25zLmpzJztcbmltcG9ydCB7XG4gIGNsZWFyQWJvdXROYXJyYXRpdmVSZWNvdmVyeURyYWZ0LFxuICBleHBvcnRBYm91dE5hcnJhdGl2ZURvY3VtZW50LFxuICBsb2FkQWJvdXROYXJyYXRpdmVTb3VyY2UsXG4gIHJlYWRBYm91dE5hcnJhdGl2ZUNoZWNrcG9pbnRzLFxuICByZWFkQWJvdXROYXJyYXRpdmVSZWNvdmVyeURyYWZ0LFxuICBzYXZlQWJvdXROYXJyYXRpdmVTb3VyY2UsXG4gIHdyaXRlQWJvdXROYXJyYXRpdmVDaGVja3BvaW50LFxuICB3cml0ZUFib3V0TmFycmF0aXZlUmVjb3ZlcnlEcmFmdCxcbn0gZnJvbSAnLi9hYm91dE5hcnJhdGl2ZVBlcnNpc3RlbmNlLmpzJztcbmltcG9ydCB7XG4gIGFzc2VydFZhbGlkQWJvdXROYXJyYXRpdmVEb2N1bWVudCxcbiAgY2xvbmVBYm91dE5hcnJhdGl2ZURvY3VtZW50LFxufSBmcm9tICcuL2Fib3V0TmFycmF0aXZlU2NoZW1hLmpzJztcbmltcG9ydCB7XG4gIGdldEFib3V0TmFycmF0aXZlQ3VlTW92ZW1lbnQsXG4gIGdldEFib3V0TmFycmF0aXZlQ3VlTW90aW9uSW50ZXJ2YWwsXG4gIGdldEFib3V0TmFycmF0aXZlV29ybGRUcmFuc2l0aW9uTGltaXQsXG4gIHNhbXBsZUFib3V0TmFycmF0aXZlUGxhbixcbn0gZnJvbSAnLi9hYm91dE5hcnJhdGl2ZUNvbXBpbGVyLmpzJztcbmltcG9ydCB7XG4gIGNhcHR1cmVBYm91dE5hcnJhdGl2ZVBsYXloZWFkQ29udGV4dCxcbiAgZ2V0QWJvdXROYXJyYXRpdmVDYW1lcmFLZXlUaW1pbmdCb3VuZHMsXG4gIGdldEFib3V0TmFycmF0aXZlQ3VlVGltaW5nQm91bmRzLFxuICBnZXRBYm91dE5hcnJhdGl2ZUV4dGVudEZpZWxkLFxuICBnZXRBYm91dE5hcnJhdGl2ZVNlbGVjdGlvbk1lbWJlcnMsXG4gIG1vdmVBYm91dE5hcnJhdGl2ZUN1ZVRpbWluZyxcbiAgcmVtYXBBYm91dE5hcnJhdGl2ZVBsYXloZWFkQ29udGV4dCxcbiAgcmVzb2x2ZUFib3V0TmFycmF0aXZlQ2FtZXJhS2V5RHJvcCxcbiAgcmVzb2x2ZUFib3V0TmFycmF0aXZlQ3VlR3JvdXBNb3ZlLFxuICBzbmFwQWJvdXROYXJyYXRpdmVUaW1lbGluZVZhbHVlLFxuICB0b2dnbGVBYm91dE5hcnJhdGl2ZUN1ZVNlbGVjdGlvbixcbn0gZnJvbSAnLi9hYm91dE5hcnJhdGl2ZVRpbWVsaW5lLmpzJztcbmltcG9ydCAnLi9hYm91dC1uYXJyYXRpdmUtZWRpdG9yLmNzcyc7XG5cbmNvbnN0IGNsYW1wMDEgPSAodmFsdWUpID0+IE1hdGgubWluKDEsIE1hdGgubWF4KDAsIHZhbHVlKSk7XG5jb25zdCBBQk9VVF9FRElUT1JfVElNRUxJTkVfU1RPUkFHRV9LRVkgPSAnYWJzOmFib3V0LW5hcnJhdGl2ZTp0aW1lbGluZS1vcGVuOnYxJztcbmNvbnN0IFRJTUVMSU5FX0tFWV9FUFNJTE9OID0gMC4wMDQ7XG5jb25zdCBJTlNQRUNUT1JfRURHRV9HQVAgPSA4O1xuY29uc3QgQ0FNRVJBX1BPU0VfRklFTERTID0gbmV3IFNldChbJ29mZnNldCcsICdsb29rQXRPZmZzZXQnLCAnZm92JywgJ3JvbGwnXSk7XG5jb25zdCBESVNDSVBMSU5FX1JFVkVBTF9NQVggPSBBQk9VVF9OQVJSQVRJVkVfRElTQ0lQTElORV9SRVZFQUxfQ09OVFJPTFNcbiAgLmZpbmQoKGNvbnRyb2wpID0+IGNvbnRyb2wuaWQgPT09ICdlbmQnKT8ubWF4IHx8IDQ7XG5jb25zdCBESVNDSVBMSU5FX0JBTExfVE9LRU5fQllfR1JPVVAgPSBPYmplY3QuZnJlZXplKHtcbiAgMTogJy0tYmFsbC0xJyxcbiAgMjogJy0tYmFsbC00JyxcbiAgMzogJy0tYmFsbC0zJyxcbiAgNDogJy0tYmFsbC03JyxcbiAgNTogJy0tYmFsbC04JyxcbiAgNjogJy0tYmFsbC02Jyxcbn0pO1xuXG5mdW5jdGlvbiBjYW1lcmFQb3NlQ2hhbmdlcyhmcm9tLCB0bykge1xuICBpZiAoIWZyb20gfHwgIXRvKSByZXR1cm4gZmFsc2U7XG4gIHJldHVybiBbJ29mZnNldCcsICdsb29rQXRPZmZzZXQnXS5zb21lKChmaWVsZCkgPT4gKFxuICAgIGZyb21bZmllbGRdLnNvbWUoKHZhbHVlLCBpbmRleCkgPT4gTWF0aC5hYnModmFsdWUgLSB0b1tmaWVsZF1baW5kZXhdKSA+IDAuMDAwMSlcbiAgKSkgfHwgTWF0aC5hYnMoZnJvbS5mb3YgLSB0by5mb3YpID4gMC4wMDAxIHx8IE1hdGguYWJzKGZyb20ucm9sbCAtIHRvLnJvbGwpID4gMC4wMDAxO1xufVxuXG5mdW5jdGlvbiBjb3B5Q2FtZXJhUG9zZSh0YXJnZXQsIHNvdXJjZSkge1xuICB0YXJnZXQub2Zmc2V0ID0gWy4uLnNvdXJjZS5vZmZzZXRdO1xuICB0YXJnZXQubG9va0F0T2Zmc2V0ID0gWy4uLnNvdXJjZS5sb29rQXRPZmZzZXRdO1xuICB0YXJnZXQuZm92ID0gc291cmNlLmZvdjtcbiAgdGFyZ2V0LnJvbGwgPSBzb3VyY2Uucm9sbDtcbn1cblxuZnVuY3Rpb24gbGlua0NhbWVyYUJvdW5kYXJ5KGRvY3VtZW50LCBzZWN0aW9uSW5kZXgsIGtleUluZGV4KSB7XG4gIGNvbnN0IHNlY3Rpb24gPSBkb2N1bWVudC5zZWN0aW9uc1tzZWN0aW9uSW5kZXhdO1xuICBjb25zdCBrZXkgPSBzZWN0aW9uPy5jYW1lcmEua2V5c1trZXlJbmRleF07XG4gIGlmICgha2V5KSByZXR1cm47XG4gIGlmIChrZXlJbmRleCA9PT0gMCAmJiBzZWN0aW9uSW5kZXggPiAwKSB7XG4gICAgY29weUNhbWVyYVBvc2UoZG9jdW1lbnQuc2VjdGlvbnNbc2VjdGlvbkluZGV4IC0gMV0uY2FtZXJhLmtleXMuYXQoLTEpLCBrZXkpO1xuICB9XG4gIGlmIChrZXlJbmRleCA9PT0gc2VjdGlvbi5jYW1lcmEua2V5cy5sZW5ndGggLSAxICYmIHNlY3Rpb25JbmRleCA8IGRvY3VtZW50LnNlY3Rpb25zLmxlbmd0aCAtIDEpIHtcbiAgICBjb3B5Q2FtZXJhUG9zZShkb2N1bWVudC5zZWN0aW9uc1tzZWN0aW9uSW5kZXggKyAxXS5jYW1lcmEua2V5c1swXSwga2V5KTtcbiAgfVxufVxuXG5mdW5jdGlvbiBicmlkZ2VDYW1lcmFTZWN0aW9uKGRvY3VtZW50LCBzZWN0aW9uSW5kZXgpIHtcbiAgY29uc3Qgc2VjdGlvbiA9IGRvY3VtZW50LnNlY3Rpb25zW3NlY3Rpb25JbmRleF07XG4gIGlmICghc2VjdGlvbj8uY2FtZXJhLmtleXMubGVuZ3RoKSByZXR1cm47XG4gIGlmIChzZWN0aW9uSW5kZXggPiAwKSBjb3B5Q2FtZXJhUG9zZShzZWN0aW9uLmNhbWVyYS5rZXlzWzBdLCBkb2N1bWVudC5zZWN0aW9uc1tzZWN0aW9uSW5kZXggLSAxXS5jYW1lcmEua2V5cy5hdCgtMSkpO1xuICBpZiAoc2VjdGlvbkluZGV4IDwgZG9jdW1lbnQuc2VjdGlvbnMubGVuZ3RoIC0gMSkgY29weUNhbWVyYVBvc2Uoc2VjdGlvbi5jYW1lcmEua2V5cy5hdCgtMSksIGRvY3VtZW50LnNlY3Rpb25zW3NlY3Rpb25JbmRleCArIDFdLmNhbWVyYS5rZXlzWzBdKTtcbn1cblxuZnVuY3Rpb24gc3RpdGNoQ2FtZXJhQm91bmRhcmllcyhkb2N1bWVudCkge1xuICBmb3IgKGxldCBzZWN0aW9uSW5kZXggPSAxOyBzZWN0aW9uSW5kZXggPCBkb2N1bWVudC5zZWN0aW9ucy5sZW5ndGg7IHNlY3Rpb25JbmRleCArPSAxKSB7XG4gICAgY29weUNhbWVyYVBvc2UoZG9jdW1lbnQuc2VjdGlvbnNbc2VjdGlvbkluZGV4XS5jYW1lcmEua2V5c1swXSwgZG9jdW1lbnQuc2VjdGlvbnNbc2VjdGlvbkluZGV4IC0gMV0uY2FtZXJhLmtleXMuYXQoLTEpKTtcbiAgfVxufVxuXG5mdW5jdGlvbiBnZXRJbnNwZWN0b3JWZXJ0aWNhbEJvdW5kcyhpbnNwZWN0b3IsIHRpbWVsaW5lT3Blbikge1xuICBjb25zdCBlZGl0b3IgPSBpbnNwZWN0b3IuY2xvc2VzdCgnLmFib3V0LWVkaXRvcicpO1xuICBjb25zdCBzdHlsZXMgPSBlZGl0b3IgPyBnZXRDb21wdXRlZFN0eWxlKGVkaXRvcikgOiBudWxsO1xuICBjb25zdCB0b3BiYXJIZWlnaHQgPSBOdW1iZXIucGFyc2VGbG9hdChzdHlsZXM/LmdldFByb3BlcnR5VmFsdWUoJy0tYWJvdXQtZWRpdG9yLXRvcGJhcicpKSB8fCA0NDtcbiAgY29uc3QgdGltZWxpbmVIZWlnaHQgPSB0aW1lbGluZU9wZW5cbiAgICA/IE51bWJlci5wYXJzZUZsb2F0KHN0eWxlcz8uZ2V0UHJvcGVydHlWYWx1ZSgnLS1hYm91dC1lZGl0b3ItdGltZWxpbmUnKSkgfHwgMTg4XG4gICAgOiAwO1xuICBjb25zdCBidXR0b25CYXJUb3AgPSBkb2N1bWVudC5xdWVyeVNlbGVjdG9yKCdbZGF0YS1idXR0b24tYmFyXScpPy5nZXRCb3VuZGluZ0NsaWVudFJlY3QoKS50b3BcbiAgICA/PyB3aW5kb3cuaW5uZXJIZWlnaHQ7XG4gIHJldHVybiB7XG4gICAgbWluVG9wOiB0b3BiYXJIZWlnaHQgKyBJTlNQRUNUT1JfRURHRV9HQVAsXG4gICAgbWF4Qm90dG9tOiAodGltZWxpbmVPcGVuID8gd2luZG93LmlubmVySGVpZ2h0IC0gdGltZWxpbmVIZWlnaHQgOiBidXR0b25CYXJUb3ApIC0gSU5TUEVDVE9SX0VER0VfR0FQLFxuICB9O1xufVxuXG5mdW5jdGlvbiBjbGFtcEluc3BlY3RvclBvc2l0aW9uKGluc3BlY3RvciwgcG9zaXRpb24sIHRpbWVsaW5lT3Blbikge1xuICBjb25zdCB7IG1pblRvcCwgbWF4Qm90dG9tIH0gPSBnZXRJbnNwZWN0b3JWZXJ0aWNhbEJvdW5kcyhpbnNwZWN0b3IsIHRpbWVsaW5lT3Blbik7XG4gIGNvbnN0IG1heFdpZHRoID0gTWF0aC5tYXgoMjQwLCB3aW5kb3cuaW5uZXJXaWR0aCAtIChJTlNQRUNUT1JfRURHRV9HQVAgKiAyKSk7XG4gIGNvbnN0IHdpZHRoID0gTWF0aC5taW4ocG9zaXRpb24ud2lkdGgsIG1heFdpZHRoKTtcbiAgY29uc3QgYXZhaWxhYmxlSGVpZ2h0ID0gTWF0aC5tYXgoMjQwLCBtYXhCb3R0b20gLSBtaW5Ub3ApO1xuICBjb25zdCBoZWlnaHQgPSBNYXRoLm1pbihwb3NpdGlvbi5oZWlnaHQsIGF2YWlsYWJsZUhlaWdodCk7XG4gIGNvbnN0IG1heExlZnQgPSBNYXRoLm1heChJTlNQRUNUT1JfRURHRV9HQVAsIHdpbmRvdy5pbm5lcldpZHRoIC0gd2lkdGggLSBJTlNQRUNUT1JfRURHRV9HQVApO1xuICBjb25zdCBtYXhUb3AgPSBNYXRoLm1heChtaW5Ub3AsIG1heEJvdHRvbSAtIGhlaWdodCk7XG4gIHJldHVybiB7XG4gICAgbGVmdDogTWF0aC5taW4obWF4TGVmdCwgTWF0aC5tYXgoSU5TUEVDVE9SX0VER0VfR0FQLCBwb3NpdGlvbi5sZWZ0KSksXG4gICAgdG9wOiBNYXRoLm1pbihtYXhUb3AsIE1hdGgubWF4KG1pblRvcCwgcG9zaXRpb24udG9wKSksXG4gICAgd2lkdGgsXG4gICAgaGVpZ2h0LFxuICB9O1xufVxuXG5mdW5jdGlvbiBnZXRTZWN0aW9uSW5kZXgoZG9jdW1lbnQsIHNlY3Rpb25JZCkge1xuICByZXR1cm4gZG9jdW1lbnQuc2VjdGlvbnMuZmluZEluZGV4KChzZWN0aW9uKSA9PiBzZWN0aW9uLmlkID09PSBzZWN0aW9uSWQpO1xufVxuXG5mdW5jdGlvbiBnZXRTZWN0aW9uKGRvY3VtZW50LCBzZWxlY3Rpb24pIHtcbiAgY29uc3Qgc2VjdGlvbklkID0gc2VsZWN0aW9uLnNlY3Rpb25JZCB8fCBkb2N1bWVudC5zZWN0aW9uc1swXT8uaWQ7XG4gIHJldHVybiBkb2N1bWVudC5zZWN0aW9ucy5maW5kKChzZWN0aW9uKSA9PiBzZWN0aW9uLmlkID09PSBzZWN0aW9uSWQpIHx8IGRvY3VtZW50LnNlY3Rpb25zWzBdO1xufVxuXG5mdW5jdGlvbiBnZXRMb2NhbFByb2dyZXNzKHBsYW4sIHNlY3Rpb24sIHN0b3J5V1UpIHtcbiAgY29uc3QgY29tcGlsZWQgPSBwbGFuPy5zZWN0aW9ucz8uZmluZCgoaXRlbSkgPT4gaXRlbS5pZCA9PT0gc2VjdGlvbi5pZCk7XG4gIHJldHVybiBjb21waWxlZCA/IGNsYW1wMDEoKHN0b3J5V1UgLSBjb21waWxlZC5zdGFydFdVKSAvIGNvbXBpbGVkLnRyYXZlbFdVKSA6IDA7XG59XG5cbmZ1bmN0aW9uIGZvcm1hdFdVKHZhbHVlKSB7XG4gIHJldHVybiBgJHtOdW1iZXIodmFsdWUgfHwgMCkudG9GaXhlZCgyKX0gV1VgO1xufVxuXG5mdW5jdGlvbiBmb3JtYXRDYW1lcmFQZXJjZW50KHZhbHVlKSB7XG4gIHJldHVybiBgJHtOdW1iZXIoKE51bWJlcih2YWx1ZSkgKiAxMDApLnRvRml4ZWQoMSkpfSVgO1xufVxuXG5mdW5jdGlvbiBpc1RleHRFZGl0aW5nVGFyZ2V0KHRhcmdldCkge1xuICByZXR1cm4gdGFyZ2V0IGluc3RhbmNlb2YgSFRNTEVsZW1lbnRcbiAgICAmJiAodGFyZ2V0Lm1hdGNoZXMoJ2lucHV0LCB0ZXh0YXJlYSwgc2VsZWN0JykgfHwgdGFyZ2V0LmlzQ29udGVudEVkaXRhYmxlKTtcbn1cblxuZnVuY3Rpb24gZ2V0VGltZWxpbmVLZXlmcmFtZXMoc25hcHNob3QpIHtcbiAgY29uc3QgcGxhbiA9IHNuYXBzaG90LmNvbXBpbGVkUGxhbjtcbiAgaWYgKCFwbGFuPy5zZWN0aW9ucz8ubGVuZ3RoKSByZXR1cm4gW107XG4gIGNvbnN0IGV2ZW50cyA9IFtdO1xuICBwbGFuLnNlY3Rpb25zLmZvckVhY2goKGNvbXBpbGVkLCBzZWN0aW9uSW5kZXgpID0+IHtcbiAgICBjb25zdCBzZWN0aW9uID0gc25hcHNob3QuZG9jdW1lbnQuc2VjdGlvbnNbc2VjdGlvbkluZGV4XTtcbiAgICBjb25zdCB0b1N0b3J5V1UgPSAoYXQpID0+IGNvbXBpbGVkLnN0YXJ0V1UgKyAoTnVtYmVyKGF0IHx8IDApICogY29tcGlsZWQudHJhdmVsV1UpO1xuICAgIHNlY3Rpb24uY2FtZXJhLmtleXMuZm9yRWFjaCgoa2V5LCBrZXlJbmRleCkgPT4ge1xuICAgICAgaWYgKGtleS5hdCA9PT0gMCB8fCBrZXkuYXQgPT09IDEpIHJldHVybjtcbiAgICAgIGV2ZW50cy5wdXNoKHtcbiAgICAgICAgc3RvcnlXVTogdG9TdG9yeVdVKGtleS5hdCksXG4gICAgICAgIHByaW9yaXR5OiAwLFxuICAgICAgICBzZWxlY3Rpb246IHsgdHlwZTogJ2NhbWVyYS1rZXknLCBzZWN0aW9uSWQ6IHNlY3Rpb24uaWQsIGtleUluZGV4IH0sXG4gICAgICB9KTtcbiAgICB9KTtcbiAgICBpZiAoc2VjdGlvbi53b3JsZC5tb2RlID09PSAnc2V0JyAmJiBzZWN0aW9uLndvcmxkLnRyYW5zaXRpb25Jbi50eXBlICE9PSAnY3V0Jykge1xuICAgICAgWydzdGFydCcsICdlbmQnXS5mb3JFYWNoKChwYXJ0LCBwYXJ0SW5kZXgpID0+IGV2ZW50cy5wdXNoKHtcbiAgICAgICAgc3RvcnlXVTogdG9TdG9yeVdVKHNlY3Rpb24ud29ybGQudHJhbnNpdGlvbkluW3BhcnRdKSxcbiAgICAgICAgcHJpb3JpdHk6IDEwICsgcGFydEluZGV4LFxuICAgICAgICBzZWxlY3Rpb246IHsgdHlwZTogJ3dvcmxkJywgc2VjdGlvbklkOiBzZWN0aW9uLmlkLCBrZXlQYXJ0OiBgdHJhbnNpdGlvbi0ke3BhcnR9YCB9LFxuICAgICAgfSkpO1xuICAgIH1cbiAgICAoc2VjdGlvbi50ZXh0LmN1ZXMgfHwgW10pLmZvckVhY2goKGN1ZSwgY3VlSW5kZXgpID0+IHtcbiAgICAgIGV2ZW50cy5wdXNoKHtcbiAgICAgICAgc3RvcnlXVTogdG9TdG9yeVdVKGN1ZS5ob2xkKSxcbiAgICAgICAgcHJpb3JpdHk6IDIwICsgY3VlSW5kZXgsXG4gICAgICAgIHNlbGVjdGlvbjogeyB0eXBlOiAnY3VlJywgc2VjdGlvbklkOiBzZWN0aW9uLmlkLCBjdWVJZDogY3VlLmlkLCBrZXlQYXJ0OiAnZm9jdXMnIH0sXG4gICAgICB9KTtcbiAgICB9KTtcbiAgICBpZiAoc2VjdGlvbi50ZXh0LmRpc2NpcGxpbmVSZXZlYWwpIHtcbiAgICAgIGV2ZW50cy5wdXNoKHtcbiAgICAgICAgc3RvcnlXVTogdG9TdG9yeVdVKHNlY3Rpb24udGV4dC5kaXNjaXBsaW5lUmV2ZWFsLnN0YXJ0KSxcbiAgICAgICAgcHJpb3JpdHk6IDI4LFxuICAgICAgICBzZWxlY3Rpb246IHsgdHlwZTogJ2Rpc2NpcGxpbmUtcmV2ZWFsJywgc2VjdGlvbklkOiBzZWN0aW9uLmlkIH0sXG4gICAgICB9KTtcbiAgICB9XG4gICAgaWYgKHNlY3Rpb24uaW50ZXJhY3Rpb24/LnR5cGUgIT09ICdub25lJyAmJiBOdW1iZXIuaXNGaW5pdGUoc2VjdGlvbi5pbnRlcmFjdGlvbi5hY3RpdmF0aW9uU3RhcnQpKSB7XG4gICAgICBldmVudHMucHVzaCh7XG4gICAgICAgIHN0b3J5V1U6IHRvU3RvcnlXVShzZWN0aW9uLmludGVyYWN0aW9uLmFjdGl2YXRpb25TdGFydCksXG4gICAgICAgIHByaW9yaXR5OiAzMCxcbiAgICAgICAgc2VsZWN0aW9uOiB7IHR5cGU6ICdpbnRlcmFjdGlvbicsIHNlY3Rpb25JZDogc2VjdGlvbi5pZCwga2V5UGFydDogJ2FjdGl2YXRpb24nIH0sXG4gICAgICB9KTtcbiAgICB9XG4gIH0pO1xuICByZXR1cm4gZXZlbnRzLnNvcnQoKGEsIGIpID0+IChhLnN0b3J5V1UgLSBiLnN0b3J5V1UpIHx8IChhLnByaW9yaXR5IC0gYi5wcmlvcml0eSkpO1xufVxuXG5mdW5jdGlvbiBnZXRUaW1lbGluZURlbGV0aW9uKHNuYXBzaG90KSB7XG4gIGNvbnN0IHsgc2VsZWN0aW9uLCBkb2N1bWVudCB9ID0gc25hcHNob3Q7XG4gIGNvbnN0IHNlY3Rpb25JbmRleCA9IGdldFNlY3Rpb25JbmRleChkb2N1bWVudCwgc2VsZWN0aW9uLnNlY3Rpb25JZCk7XG4gIGNvbnN0IHNlY3Rpb24gPSBkb2N1bWVudC5zZWN0aW9uc1tzZWN0aW9uSW5kZXhdO1xuICBpZiAoIXNlY3Rpb24pIHJldHVybiBudWxsO1xuICBpZiAoc2VsZWN0aW9uLnR5cGUgPT09ICdjYW1lcmEta2V5Jykge1xuICAgIGNvbnN0IGtleSA9IHNlY3Rpb24uY2FtZXJhLmtleXNbc2VsZWN0aW9uLmtleUluZGV4XTtcbiAgICBpZiAoIWtleSkgcmV0dXJuIG51bGw7XG4gICAgY29uc3QgcmVxdWlyZWQgPSBrZXkuYXQgPT09IDAgfHwga2V5LmF0ID09PSAxO1xuICAgIHJldHVybiB7XG4gICAgICBsYWJlbDogcmVxdWlyZWQgPyAnUmVxdWlyZWQgY2FtZXJhIGtleScgOiAnRGVsZXRlIGNhbWVyYSBrZXknLFxuICAgICAgZGlzYWJsZWQ6IHJlcXVpcmVkLFxuICAgICAgbWVzc2FnZTogcmVxdWlyZWQgPyAnVGhlIHN0YXJ0IGFuZCBlbmQgQ2FtZXJhIGtleXMgcHJlc2VydmUgU2VjdGlvbiBjb250aW51aXR5IGFuZCBjYW5ub3QgYmUgcmVtb3ZlZC4nIDogJycsXG4gICAgICBleGVjdXRlOiAoc3RvcmUpID0+IHN0b3JlLmNvbW1pdCgnRGVsZXRlIGNhbWVyYSBrZXknLCAoZHJhZnQpID0+IHtcbiAgICAgICAgZHJhZnQuc2VjdGlvbnNbc2VjdGlvbkluZGV4XS5jYW1lcmEua2V5cy5zcGxpY2Uoc2VsZWN0aW9uLmtleUluZGV4LCAxKTtcbiAgICAgIH0sIHsgc2VsZWN0aW9uOiB7IHR5cGU6ICdzZWN0aW9uJywgc2VjdGlvbklkOiBzZWN0aW9uLmlkIH0gfSksXG4gICAgfTtcbiAgfVxuICBpZiAoc2VsZWN0aW9uLnR5cGUgPT09ICd3b3JsZCcgJiYgc2VsZWN0aW9uLmtleVBhcnQ/LnN0YXJ0c1dpdGgoJ3RyYW5zaXRpb24tJykpIHtcbiAgICByZXR1cm4ge1xuICAgICAgbGFiZWw6ICdSZW1vdmUgdHJhbnNpdGlvbicsXG4gICAgICBkaXNhYmxlZDogZmFsc2UsXG4gICAgICBtZXNzYWdlOiAnJyxcbiAgICAgIGV4ZWN1dGU6IChzdG9yZSkgPT4gc3RvcmUuY29tbWl0KCdSZW1vdmUgV29ybGQgdHJhbnNpdGlvbicsIChkcmFmdCkgPT4ge1xuICAgICAgICBjb25zdCB0cmFuc2l0aW9uID0gZHJhZnQuc2VjdGlvbnNbc2VjdGlvbkluZGV4XS53b3JsZC50cmFuc2l0aW9uSW47XG4gICAgICAgIHRyYW5zaXRpb24uc3RhcnQgPSAwO1xuICAgICAgICB0cmFuc2l0aW9uLmVuZCA9IDA7XG4gICAgICAgIHRyYW5zaXRpb24udHlwZSA9ICdjdXQnO1xuICAgICAgfSwgeyBzZWxlY3Rpb246IHsgdHlwZTogJ3dvcmxkJywgc2VjdGlvbklkOiBzZWN0aW9uLmlkIH0gfSksXG4gICAgfTtcbiAgfVxuICBpZiAoc2VsZWN0aW9uLnR5cGUgPT09ICdpbnRlcmFjdGlvbicgJiYgc2VsZWN0aW9uLmtleVBhcnQgPT09ICdhY3RpdmF0aW9uJykge1xuICAgIHJldHVybiB7XG4gICAgICBsYWJlbDogJ1JlbW92ZSBpbnRlcmFjdGlvbiBrZXknLFxuICAgICAgZGlzYWJsZWQ6IGZhbHNlLFxuICAgICAgbWVzc2FnZTogJycsXG4gICAgICBleGVjdXRlOiAoc3RvcmUpID0+IHN0b3JlLmNvbW1pdCgnUmVtb3ZlIGludGVyYWN0aW9uIGtleScsIChkcmFmdCkgPT4ge1xuICAgICAgICBkcmFmdC5zZWN0aW9uc1tzZWN0aW9uSW5kZXhdLmludGVyYWN0aW9uID0geyB0eXBlOiAnbm9uZScgfTtcbiAgICAgIH0sIHsgc2VsZWN0aW9uOiB7IHR5cGU6ICdzZWN0aW9uJywgc2VjdGlvbklkOiBzZWN0aW9uLmlkIH0gfSksXG4gICAgfTtcbiAgfVxuICByZXR1cm4gbnVsbDtcbn1cblxuZnVuY3Rpb24gZGVsZXRlVGltZWxpbmVTZWxlY3Rpb24oc3RvcmUsIHNuYXBzaG90KSB7XG4gIGNvbnN0IGRlbGV0aW9uID0gZ2V0VGltZWxpbmVEZWxldGlvbihzbmFwc2hvdCk7XG4gIGlmICghZGVsZXRpb24pIHJldHVybiBmYWxzZTtcbiAgaWYgKGRlbGV0aW9uLmRpc2FibGVkKSB7XG4gICAgc3RvcmUuc2V0U2F2ZVN0YXRlKHsgbWVzc2FnZTogZGVsZXRpb24ubWVzc2FnZSB9KTtcbiAgICByZXR1cm4gdHJ1ZTtcbiAgfVxuICBkZWxldGlvbi5leGVjdXRlKHN0b3JlKTtcbiAgcmV0dXJuIHRydWU7XG59XG5cbmZ1bmN0aW9uIHNlZWtUaW1lbGluZUtleWZyYW1lKHN0b3JlLCBldmVudCkge1xuICBpZiAoIWV2ZW50KSByZXR1cm47XG4gIHN0b3JlLnNldFNlbGVjdGlvbihldmVudC5zZWxlY3Rpb24pO1xuICBzdG9yZS5zZXRUcmFuc3BvcnQoeyBvd25lcjogJ3RpbWVsaW5lJywgcGxheWluZzogZmFsc2UsIHN0b3J5V1U6IGV2ZW50LnN0b3J5V1UgfSk7XG59XG5cbmZ1bmN0aW9uIGp1bXBUaW1lbGluZUtleWZyYW1lKHN0b3JlLCBzbmFwc2hvdCwgZGlyZWN0aW9uKSB7XG4gIGNvbnN0IGV2ZW50cyA9IGdldFRpbWVsaW5lS2V5ZnJhbWVzKHNuYXBzaG90KTtcbiAgY29uc3QgY3VycmVudFdVID0gc25hcHNob3QudHJhbnNwb3J0LnN0b3J5V1U7XG4gIGNvbnN0IHRhcmdldFBvc2l0aW9uID0gZGlyZWN0aW9uID4gMFxuICAgID8gZXZlbnRzLmZpbmQoKGV2ZW50KSA9PiBldmVudC5zdG9yeVdVID4gY3VycmVudFdVICsgVElNRUxJTkVfS0VZX0VQU0lMT04pPy5zdG9yeVdVXG4gICAgOiBbLi4uZXZlbnRzXS5yZXZlcnNlKCkuZmluZCgoZXZlbnQpID0+IGV2ZW50LnN0b3J5V1UgPCBjdXJyZW50V1UgLSBUSU1FTElORV9LRVlfRVBTSUxPTik/LnN0b3J5V1U7XG4gIGNvbnN0IGV2ZW50ID0gTnVtYmVyLmlzRmluaXRlKHRhcmdldFBvc2l0aW9uKVxuICAgID8gZXZlbnRzLmZpbmQoKGl0ZW0pID0+IE1hdGguYWJzKGl0ZW0uc3RvcnlXVSAtIHRhcmdldFBvc2l0aW9uKSA8IFRJTUVMSU5FX0tFWV9FUFNJTE9OKVxuICAgIDogbnVsbDtcbiAgc2Vla1RpbWVsaW5lS2V5ZnJhbWUoc3RvcmUsIGV2ZW50KTtcbn1cblxuZnVuY3Rpb24gbWFrZVNsdWcodmFsdWUpIHtcbiAgcmV0dXJuIHZhbHVlLnRvTG93ZXJDYXNlKCkucmVwbGFjZSgvW15hLXowLTldKy9nLCAnLScpLnJlcGxhY2UoL14tfC0kL2csICcnKSB8fCAnaXRlbSc7XG59XG5cbmZ1bmN0aW9uIG5leHRJZChkb2N1bWVudCwgYmFzZSkge1xuICBjb25zdCB1c2VkID0gbmV3IFNldChkb2N1bWVudC5zZWN0aW9ucy5mbGF0TWFwKChzZWN0aW9uKSA9PiBbXG4gICAgc2VjdGlvbi5pZCxcbiAgICAuLi4oc2VjdGlvbi50ZXh0LmN1ZXMgfHwgW10pLm1hcCgoY3VlKSA9PiBjdWUuaWQpLFxuICAgIC4uLihzZWN0aW9uLnRleHQuYmxvY2tzIHx8IFtdKS5tYXAoKGJsb2NrKSA9PiBibG9jay5pZCksXG4gICAgLi4uKHNlY3Rpb24udGV4dC5kaXNjaXBsaW5lUmV2ZWFsID8gW3NlY3Rpb24udGV4dC5kaXNjaXBsaW5lUmV2ZWFsLmlkXSA6IFtdKSxcbiAgXSkpO1xuICBsZXQgaWQgPSBtYWtlU2x1ZyhiYXNlKTtcbiAgbGV0IHN1ZmZpeCA9IDI7XG4gIHdoaWxlICh1c2VkLmhhcyhpZCkpIHtcbiAgICBpZCA9IGAke21ha2VTbHVnKGJhc2UpfS0ke3N1ZmZpeH1gO1xuICAgIHN1ZmZpeCArPSAxO1xuICB9XG4gIHJldHVybiBpZDtcbn1cblxuZnVuY3Rpb24gUHJvcGVydHkoeyBsYWJlbCwgY2hpbGRyZW4sIGhpbnQgPSAnJyB9KSB7XG4gIHJldHVybiAoXG4gICAgPGxhYmVsIGNsYXNzTmFtZT1cImFib3V0LWVkaXRvci1wcm9wZXJ0eVwiPlxuICAgICAgPHNwYW4+e2xhYmVsfTwvc3Bhbj5cbiAgICAgIHtjaGlsZHJlbn1cbiAgICAgIHtoaW50ID8gPHNtYWxsPntoaW50fTwvc21hbGw+IDogbnVsbH1cbiAgICA8L2xhYmVsPlxuICApO1xufVxuXG5mdW5jdGlvbiBOdW1iZXJQcm9wZXJ0eSh7IGxhYmVsLCB2YWx1ZSwgbWluLCBtYXgsIHN0ZXAsIG9uQ2hhbmdlLCB1bml0ID0gJycsIGRpc2FibGVkID0gZmFsc2UgfSkge1xuICByZXR1cm4gKFxuICAgIDxQcm9wZXJ0eSBsYWJlbD17bGFiZWx9PlxuICAgICAgPGRpdiBjbGFzc05hbWU9XCJhYm91dC1lZGl0b3ItbnVtYmVyXCI+XG4gICAgICAgIDxpbnB1dFxuICAgICAgICAgIHR5cGU9XCJyYW5nZVwiXG4gICAgICAgICAgdmFsdWU9e3ZhbHVlfVxuICAgICAgICAgIG1pbj17bWlufVxuICAgICAgICAgIG1heD17bWF4fVxuICAgICAgICAgIHN0ZXA9e3N0ZXB9XG4gICAgICAgICAgZGlzYWJsZWQ9e2Rpc2FibGVkfVxuICAgICAgICAgIG9uQ2hhbmdlPXsoZXZlbnQpID0+IG9uQ2hhbmdlKE51bWJlcihldmVudC50YXJnZXQudmFsdWUpKX1cbiAgICAgICAgLz5cbiAgICAgICAgPGlucHV0XG4gICAgICAgICAgdHlwZT1cIm51bWJlclwiXG4gICAgICAgICAgdmFsdWU9e3ZhbHVlfVxuICAgICAgICAgIG1pbj17bWlufVxuICAgICAgICAgIG1heD17bWF4fVxuICAgICAgICAgIHN0ZXA9e3N0ZXB9XG4gICAgICAgICAgZGlzYWJsZWQ9e2Rpc2FibGVkfVxuICAgICAgICAgIG9uQ2hhbmdlPXsoZXZlbnQpID0+IG9uQ2hhbmdlKE51bWJlcihldmVudC50YXJnZXQudmFsdWUpKX1cbiAgICAgICAgLz5cbiAgICAgICAge3VuaXQgPyA8ZW0+e3VuaXR9PC9lbT4gOiBudWxsfVxuICAgICAgPC9kaXY+XG4gICAgPC9Qcm9wZXJ0eT5cbiAgKTtcbn1cblxuZnVuY3Rpb24gVHJhbnNwb3J0KHsgc3RvcmUsIHNuYXBzaG90IH0pIHtcbiAgY29uc3QgeyB0cmFuc3BvcnQsIGNvbXBpbGVkUGxhbiB9ID0gc25hcHNob3Q7XG4gIGNvbnN0IG1heFdVID0gY29tcGlsZWRQbGFuPy5tYXhTdG9yeVdVIHx8IDE7XG4gIGNvbnN0IHBsYXkgPSAoKSA9PiBzdG9yZS5zZXRUcmFuc3BvcnQoe1xuICAgIG93bmVyOiB0cmFuc3BvcnQucGxheWluZyA/ICd0aW1lbGluZScgOiAncGxheWJhY2snLFxuICAgIHBsYXlpbmc6ICF0cmFuc3BvcnQucGxheWluZyxcbiAgICBzdG9yeVdVOiB0cmFuc3BvcnQuc3RvcnlXVSxcbiAgfSk7XG4gIGNvbnN0IHNlZWsgPSAoc3RvcnlXVSkgPT4gc3RvcmUuc2V0VHJhbnNwb3J0KHsgb3duZXI6ICd0aW1lbGluZScsIHBsYXlpbmc6IGZhbHNlLCBzdG9yeVdVIH0pO1xuICBjb25zdCBzZWxlY3RlZCA9IGdldFNlY3Rpb24oc25hcHNob3QuZG9jdW1lbnQsIHNuYXBzaG90LnNlbGVjdGlvbik7XG4gIGNvbnN0IHNlY3Rpb25JbmRleCA9IGdldFNlY3Rpb25JbmRleChzbmFwc2hvdC5kb2N1bWVudCwgc2VsZWN0ZWQuaWQpO1xuICBjb25zdCBqdW1wU2VjdGlvbiA9IChkaXJlY3Rpb24pID0+IHtcbiAgICBjb25zdCBuZXh0ID0gc25hcHNob3QuY29tcGlsZWRQbGFuLnNlY3Rpb25zW01hdGgubWF4KDAsIE1hdGgubWluKHNuYXBzaG90LmNvbXBpbGVkUGxhbi5zZWN0aW9ucy5sZW5ndGggLSAxLCBzZWN0aW9uSW5kZXggKyBkaXJlY3Rpb24pKV07XG4gICAgaWYgKG5leHQpIHNlZWsobmV4dC5zdGFydFdVKTtcbiAgfTtcbiAgcmV0dXJuIChcbiAgICA8ZGl2IGNsYXNzTmFtZT1cImFib3V0LWVkaXRvci10cmFuc3BvcnRcIj5cbiAgICAgIDxidXR0b24gdHlwZT1cImJ1dHRvblwiIHRpdGxlPVwiUHJldmlvdXMgU2VjdGlvblwiIGFyaWEtbGFiZWw9XCJQcmV2aW91cyBTZWN0aW9uXCIgb25DbGljaz17KCkgPT4ganVtcFNlY3Rpb24oLTEpfT48U2tpcEJhY2sgYXJpYS1oaWRkZW49XCJ0cnVlXCIgLz48L2J1dHRvbj5cbiAgICAgIDxidXR0b24gdHlwZT1cImJ1dHRvblwiIHRpdGxlPVwiUHJldmlvdXMga2V5ZnJhbWUgwrcgTGVmdCBhcnJvd1wiIGFyaWEtbGFiZWw9XCJQcmV2aW91cyBrZXlmcmFtZVwiIG9uQ2xpY2s9eygpID0+IGp1bXBUaW1lbGluZUtleWZyYW1lKHN0b3JlLCBzbmFwc2hvdCwgLTEpfT48Q2hldnJvbkxlZnQgYXJpYS1oaWRkZW49XCJ0cnVlXCIgLz48L2J1dHRvbj5cbiAgICAgIDxidXR0b24gdHlwZT1cImJ1dHRvblwiIGNsYXNzTmFtZT1cImlzLXByaW1hcnlcIiB0aXRsZT17dHJhbnNwb3J0LnBsYXlpbmcgPyAnUGF1c2UnIDogJ1BsYXknfSBhcmlhLWxhYmVsPXt0cmFuc3BvcnQucGxheWluZyA/ICdQYXVzZScgOiAnUGxheSd9IG9uQ2xpY2s9e3BsYXl9PlxuICAgICAgICB7dHJhbnNwb3J0LnBsYXlpbmcgPyA8UGF1c2UgYXJpYS1oaWRkZW49XCJ0cnVlXCIgLz4gOiA8UGxheSBhcmlhLWhpZGRlbj1cInRydWVcIiAvPn1cbiAgICAgIDwvYnV0dG9uPlxuICAgICAgPGJ1dHRvbiB0eXBlPVwiYnV0dG9uXCIgdGl0bGU9XCJOZXh0IFNlY3Rpb25cIiBhcmlhLWxhYmVsPVwiTmV4dCBTZWN0aW9uXCIgb25DbGljaz17KCkgPT4ganVtcFNlY3Rpb24oMSl9PjxTa2lwRm9yd2FyZCBhcmlhLWhpZGRlbj1cInRydWVcIiAvPjwvYnV0dG9uPlxuICAgICAgPGJ1dHRvbiB0eXBlPVwiYnV0dG9uXCIgdGl0bGU9XCJOZXh0IGtleWZyYW1lIMK3IFJpZ2h0IGFycm93XCIgYXJpYS1sYWJlbD1cIk5leHQga2V5ZnJhbWVcIiBvbkNsaWNrPXsoKSA9PiBqdW1wVGltZWxpbmVLZXlmcmFtZShzdG9yZSwgc25hcHNob3QsIDEpfT48Q2hldnJvblJpZ2h0IGFyaWEtaGlkZGVuPVwidHJ1ZVwiIC8+PC9idXR0b24+XG4gICAgICA8b3V0cHV0Pntmb3JtYXRXVSh0cmFuc3BvcnQuc3RvcnlXVSl9PC9vdXRwdXQ+XG4gICAgICA8aW5wdXRcbiAgICAgICAgYXJpYS1sYWJlbD1cIkdsb2JhbCBuYXJyYXRpdmUgcGxheWhlYWRcIlxuICAgICAgICB0eXBlPVwicmFuZ2VcIlxuICAgICAgICBtaW49XCIwXCJcbiAgICAgICAgbWF4PXttYXhXVX1cbiAgICAgICAgc3RlcD1cIjAuMDAyXCJcbiAgICAgICAgdmFsdWU9e01hdGgubWluKG1heFdVLCB0cmFuc3BvcnQuc3RvcnlXVSl9XG4gICAgICAgIG9uQ2hhbmdlPXsoZXZlbnQpID0+IHNlZWsoTnVtYmVyKGV2ZW50LnRhcmdldC52YWx1ZSkpfVxuICAgICAgLz5cbiAgICAgIDxidXR0b25cbiAgICAgICAgdHlwZT1cImJ1dHRvblwiXG4gICAgICAgIGNsYXNzTmFtZT17dHJhbnNwb3J0Lm93bmVyID09PSAnc2Nyb2xsJyA/ICdpcy1hY3RpdmUnIDogJyd9XG4gICAgICAgIG9uQ2xpY2s9eygpID0+IHN0b3JlLnNldFRyYW5zcG9ydCh7IG93bmVyOiAnc2Nyb2xsJywgcGxheWluZzogZmFsc2UgfSl9XG4gICAgICA+Rm9sbG93IHNjcm9sbDwvYnV0dG9uPlxuICAgICAgPGJ1dHRvblxuICAgICAgICB0eXBlPVwiYnV0dG9uXCJcbiAgICAgICAgY2xhc3NOYW1lPXt0cmFuc3BvcnQubGl2ZUFtYmllbnQgPyAnaXMtYWN0aXZlJyA6ICcnfVxuICAgICAgICBvbkNsaWNrPXsoKSA9PiBzdG9yZS5zZXRUcmFuc3BvcnQoeyBsaXZlQW1iaWVudDogIXRyYW5zcG9ydC5saXZlQW1iaWVudCB9KX1cbiAgICAgID5MaXZlIGFtYmllbnQ8L2J1dHRvbj5cbiAgICAgIDxzZWxlY3RcbiAgICAgICAgYXJpYS1sYWJlbD1cIlByZXZpZXcgcHJvZmlsZVwiXG4gICAgICAgIHZhbHVlPXtzbmFwc2hvdC5wcmV2aWV3UHJvZmlsZX1cbiAgICAgICAgb25DaGFuZ2U9eyhldmVudCkgPT4gc3RvcmUuc2V0UHJldmlld1Byb2ZpbGUoZXZlbnQudGFyZ2V0LnZhbHVlKX1cbiAgICAgID5cbiAgICAgICAgPG9wdGlvbiB2YWx1ZT1cImRlc2t0b3BcIj5EZXNrdG9wPC9vcHRpb24+XG4gICAgICAgIDxvcHRpb24gdmFsdWU9XCJtb2JpbGVcIj5Nb2JpbGU8L29wdGlvbj5cbiAgICAgICAgPG9wdGlvbiB2YWx1ZT1cInJlZHVjZWQtbW90aW9uXCI+UmVkdWNlZCBtb3Rpb248L29wdGlvbj5cbiAgICAgIDwvc2VsZWN0PlxuICAgIDwvZGl2PlxuICApO1xufVxuXG5mdW5jdGlvbiBUaW1lbGluZSh7IHN0b3JlLCBzbmFwc2hvdCB9KSB7XG4gIGNvbnN0IHsgZG9jdW1lbnQsIGNvbXBpbGVkUGxhbiwgc2VsZWN0aW9uLCB0cmFuc3BvcnQgfSA9IHNuYXBzaG90O1xuICBjb25zdCBzZWxlY3RlZEN1ZU1lbWJlcnMgPSBnZXRBYm91dE5hcnJhdGl2ZVNlbGVjdGlvbk1lbWJlcnMoc2VsZWN0aW9uKTtcbiAgY29uc3QgbWF4V1UgPSBNYXRoLm1heCgwLjAwMSwgY29tcGlsZWRQbGFuPy5tYXhTdG9yeVdVIHx8IGRvY3VtZW50LnNlY3Rpb25zLnJlZHVjZSgoc3VtLCBzZWN0aW9uKSA9PiBzdW0gKyBzZWN0aW9uLmV4dGVudFdVLCAwKSk7XG4gIGNvbnN0IHBsYXloZWFkID0gYCR7KHRyYW5zcG9ydC5zdG9yeVdVIC8gbWF4V1UpICogMTAwfSVgO1xuICBjb25zdCBsYW5lc1JlZiA9IHVzZVJlZihudWxsKTtcbiAgY29uc3QgdGltaW5nRHJhZ1JlZiA9IHVzZVJlZihudWxsKTtcbiAgY29uc3QgcHJldmlld0ZyYW1lUmVmID0gdXNlUmVmKG51bGwpO1xuICBjb25zdCBwZW5kaW5nUHJldmlld1JlZiA9IHVzZVJlZihudWxsKTtcbiAgY29uc3Qgc3VwcHJlc3NlZENsaWNrUmVmID0gdXNlUmVmKG51bGwpO1xuICBjb25zdCBbY2FtZXJhRHJhZ1ByZXZpZXcsIHNldENhbWVyYURyYWdQcmV2aWV3XSA9IHVzZVN0YXRlKG51bGwpO1xuICBjb25zdCBbc2VjdGlvblJlc2l6ZVByZXZpZXcsIHNldFNlY3Rpb25SZXNpemVQcmV2aWV3XSA9IHVzZVN0YXRlKG51bGwpO1xuICBjb25zdCBbbWFycXVlZSwgc2V0TWFycXVlZV0gPSB1c2VTdGF0ZShudWxsKTtcblxuICBjb25zdCBxdWV1ZVByZXZpZXdGcmFtZSA9IChjYWxsYmFjaykgPT4ge1xuICAgIHBlbmRpbmdQcmV2aWV3UmVmLmN1cnJlbnQgPSBjYWxsYmFjaztcbiAgICBpZiAocHJldmlld0ZyYW1lUmVmLmN1cnJlbnQpIHJldHVybjtcbiAgICBwcmV2aWV3RnJhbWVSZWYuY3VycmVudCA9IHJlcXVlc3RBbmltYXRpb25GcmFtZSgoKSA9PiB7XG4gICAgICBwcmV2aWV3RnJhbWVSZWYuY3VycmVudCA9IG51bGw7XG4gICAgICBjb25zdCBwZW5kaW5nID0gcGVuZGluZ1ByZXZpZXdSZWYuY3VycmVudDtcbiAgICAgIHBlbmRpbmdQcmV2aWV3UmVmLmN1cnJlbnQgPSBudWxsO1xuICAgICAgcGVuZGluZz8uKCk7XG4gICAgfSk7XG4gIH07XG4gIGNvbnN0IGZsdXNoUHJldmlld0ZyYW1lID0gKCkgPT4ge1xuICAgIGlmIChwcmV2aWV3RnJhbWVSZWYuY3VycmVudCkgY2FuY2VsQW5pbWF0aW9uRnJhbWUocHJldmlld0ZyYW1lUmVmLmN1cnJlbnQpO1xuICAgIHByZXZpZXdGcmFtZVJlZi5jdXJyZW50ID0gbnVsbDtcbiAgICBjb25zdCBwZW5kaW5nID0gcGVuZGluZ1ByZXZpZXdSZWYuY3VycmVudDtcbiAgICBwZW5kaW5nUHJldmlld1JlZi5jdXJyZW50ID0gbnVsbDtcbiAgICBwZW5kaW5nPy4oKTtcbiAgfTtcblxuICBjb25zdCB6b29tVGltZWxpbmUgPSAoZXZlbnQpID0+IHtcbiAgICBpZiAoIWV2ZW50LmN0cmxLZXkgJiYgIWV2ZW50Lm1ldGFLZXkpIHJldHVybjtcbiAgICBldmVudC5wcmV2ZW50RGVmYXVsdCgpO1xuICAgIGNvbnN0IGxhbmVzID0gbGFuZXNSZWYuY3VycmVudDtcbiAgICBpZiAoIWxhbmVzKSByZXR1cm47XG4gICAgY29uc3QgcmVjdCA9IGxhbmVzLmdldEJvdW5kaW5nQ2xpZW50UmVjdCgpO1xuICAgIGNvbnN0IHBvaW50ZXJYID0gTWF0aC5taW4ocmVjdC53aWR0aCwgTWF0aC5tYXgoMCwgZXZlbnQuY2xpZW50WCAtIHJlY3QubGVmdCkpO1xuICAgIGNvbnN0IHN0b3J5UmF0aW8gPSAobGFuZXMuc2Nyb2xsTGVmdCArIHBvaW50ZXJYKSAvIE1hdGgubWF4KDEsIGxhbmVzLnNjcm9sbFdpZHRoKTtcbiAgICBjb25zdCBjdXJyZW50Wm9vbSA9IE1hdGgubWF4KDEsIE51bWJlcih0cmFuc3BvcnQuem9vbSkgfHwgMSk7XG4gICAgY29uc3QgbmV4dFpvb20gPSBNYXRoLm1pbig4LCBNYXRoLm1heCgxLCBjdXJyZW50Wm9vbSAqIE1hdGguZXhwKC1ldmVudC5kZWx0YVkgKiAwLjAwMjUpKSk7XG4gICAgc3RvcmUuc2V0VHJhbnNwb3J0KHsgem9vbTogTnVtYmVyKG5leHRab29tLnRvRml4ZWQoMykpIH0pO1xuICAgIHJlcXVlc3RBbmltYXRpb25GcmFtZSgoKSA9PiB7XG4gICAgICBsYW5lcy5zY3JvbGxMZWZ0ID0gKHN0b3J5UmF0aW8gKiBsYW5lcy5zY3JvbGxXaWR0aCkgLSBwb2ludGVyWDtcbiAgICB9KTtcbiAgfTtcblxuICB1c2VFZmZlY3QoKCkgPT4gKCkgPT4ge1xuICAgIGlmIChwcmV2aWV3RnJhbWVSZWYuY3VycmVudCkgY2FuY2VsQW5pbWF0aW9uRnJhbWUocHJldmlld0ZyYW1lUmVmLmN1cnJlbnQpO1xuICB9LCBbXSk7XG5cbiAgY29uc3QgcmVzb2x2ZUNhbWVyYURyb3BBdENsaWVudFggPSAoY2xpZW50WCkgPT4ge1xuICAgIGNvbnN0IGxhbmVzID0gbGFuZXNSZWYuY3VycmVudDtcbiAgICBjb25zdCBjdXJyZW50ID0gc3RvcmUuZ2V0U25hcHNob3QoKTtcbiAgICBpZiAoIWxhbmVzKSByZXR1cm4geyB2YWxpZDogZmFsc2UsIHJlYXNvbjogJ1RoZSBjYW1lcmEgdGltZWxpbmUgaXMgbm90IHJlYWR5LicgfTtcbiAgICBjb25zdCByZWN0ID0gbGFuZXMuZ2V0Qm91bmRpbmdDbGllbnRSZWN0KCk7XG4gICAgY29uc3QgY29udGVudFggPSBNYXRoLm1pbihcbiAgICAgIGxhbmVzLnNjcm9sbFdpZHRoLFxuICAgICAgTWF0aC5tYXgoMCwgY2xpZW50WCAtIHJlY3QubGVmdCArIGxhbmVzLnNjcm9sbExlZnQpLFxuICAgICk7XG4gICAgY29uc3Qgc3RvcnlXVSA9IChjb250ZW50WCAvIE1hdGgubWF4KDEsIGxhbmVzLnNjcm9sbFdpZHRoKSlcbiAgICAgICogTWF0aC5tYXgoMC4wMDEsIGN1cnJlbnQuY29tcGlsZWRQbGFuPy5tYXhTdG9yeVdVIHx8IG1heFdVKTtcbiAgICBjb25zdCBkcmFnID0gdGltaW5nRHJhZ1JlZi5jdXJyZW50O1xuICAgIGNvbnN0IGRyb3AgPSByZXNvbHZlQWJvdXROYXJyYXRpdmVDYW1lcmFLZXlEcm9wKHtcbiAgICAgIGRvY3VtZW50OiBjdXJyZW50LmRvY3VtZW50LFxuICAgICAgcGxhbjogY3VycmVudC5jb21waWxlZFBsYW4sXG4gICAgICBzb3VyY2VTZWN0aW9uSW5kZXg6IGRyYWc/LnNlY3Rpb25JbmRleCxcbiAgICAgIHNvdXJjZUtleUluZGV4OiBkcmFnPy5rZXlJbmRleCxcbiAgICAgIHN0b3J5V1UsXG4gICAgfSk7XG4gICAgcmV0dXJuIHsgLi4uZHJvcCwgY29udGVudFggfTtcbiAgfTtcblxuICBjb25zdCBiZWdpblRpbWluZ0RyYWcgPSAoZXZlbnQsIGRyYWcpID0+IHtcbiAgICBpZiAoZHJhZy5sb2NrZWQgfHwgZXZlbnQuYnV0dG9uICE9PSAwKSByZXR1cm47XG4gICAgY29uc3QgY2xpcCA9IGV2ZW50LmN1cnJlbnRUYXJnZXQucGFyZW50RWxlbWVudDtcbiAgICBjb25zdCByZWN0ID0gY2xpcD8uZ2V0Qm91bmRpbmdDbGllbnRSZWN0KCk7XG4gICAgaWYgKCFyZWN0Py53aWR0aCkgcmV0dXJuO1xuICAgIGV2ZW50LnByZXZlbnREZWZhdWx0KCk7XG4gICAgZXZlbnQuc3RvcFByb3BhZ2F0aW9uKCk7XG4gICAgZXZlbnQuY3VycmVudFRhcmdldC5zZXRQb2ludGVyQ2FwdHVyZT8uKGV2ZW50LnBvaW50ZXJJZCk7XG4gICAgbGV0IG5leHRTZWxlY3Rpb24gPSBkcmFnLnNlbGVjdGlvbjtcbiAgICBpZiAoZHJhZy50eXBlID09PSAnY3VlJykge1xuICAgICAgY29uc3QgY3VycmVudFNlbGVjdGlvbiA9IHN0b3JlLmdldFNuYXBzaG90KCkuc2VsZWN0aW9uO1xuICAgICAgY29uc3QgY3VycmVudE1lbWJlcnMgPSBnZXRBYm91dE5hcnJhdGl2ZVNlbGVjdGlvbk1lbWJlcnMoY3VycmVudFNlbGVjdGlvbik7XG4gICAgICBjb25zdCBhbHJlYWR5U2VsZWN0ZWQgPSBjdXJyZW50TWVtYmVycy5zb21lKChtZW1iZXIpID0+IChcbiAgICAgICAgbWVtYmVyLnNlY3Rpb25JZCA9PT0gZHJhZy5zZWxlY3Rpb24uc2VjdGlvbklkICYmIG1lbWJlci5jdWVJZCA9PT0gZHJhZy5zZWxlY3Rpb24uY3VlSWRcbiAgICAgICkpO1xuICAgICAgbmV4dFNlbGVjdGlvbiA9IGV2ZW50LnNoaWZ0S2V5XG4gICAgICAgID8gdG9nZ2xlQWJvdXROYXJyYXRpdmVDdWVTZWxlY3Rpb24oY3VycmVudFNlbGVjdGlvbiwgZHJhZy5zZWxlY3Rpb24pXG4gICAgICAgIDogYWxyZWFkeVNlbGVjdGVkICYmIGN1cnJlbnRNZW1iZXJzLmxlbmd0aCA+IDFcbiAgICAgICAgICA/IHsgLi4uZHJhZy5zZWxlY3Rpb24sIG1lbWJlcnM6IGN1cnJlbnRNZW1iZXJzIH1cbiAgICAgICAgICA6IGRyYWcuc2VsZWN0aW9uO1xuICAgICAgc3RvcmUuYmVnaW5QcmV2aWV3KCdNb3ZlIHRleHQgQ3VlcycpO1xuICAgIH1cbiAgICB0aW1pbmdEcmFnUmVmLmN1cnJlbnQgPSB7XG4gICAgICAuLi5kcmFnLFxuICAgICAgc2VsZWN0aW9uOiBuZXh0U2VsZWN0aW9uLFxuICAgICAgbWVtYmVyczogZHJhZy50eXBlID09PSAnY3VlJyA/IGdldEFib3V0TmFycmF0aXZlU2VsZWN0aW9uTWVtYmVycyhuZXh0U2VsZWN0aW9uKSA6IG51bGwsXG4gICAgICBzdGFydERvY3VtZW50OiBkcmFnLnR5cGUgPT09ICdjdWUnID8gY2xvbmVBYm91dE5hcnJhdGl2ZURvY3VtZW50KHN0b3JlLmdldFNuYXBzaG90KCkuZG9jdW1lbnQpIDogbnVsbCxcbiAgICAgIHN0YXJ0UGxhbjogZHJhZy50eXBlID09PSAnY3VlJyA/IHN0b3JlLmdldFNuYXBzaG90KCkuY29tcGlsZWRQbGFuIDogbnVsbCxcbiAgICAgIHBvaW50ZXJJZDogZXZlbnQucG9pbnRlcklkLFxuICAgICAgcmVjdCxcbiAgICAgIHN0YXJ0WDogZXZlbnQuY2xpZW50WCxcbiAgICAgIG1vdmVkOiBmYWxzZSxcbiAgICAgIGxhc3RBdDogZHJhZy5hdCxcbiAgICAgIGxhc3REcm9wOiBudWxsLFxuICAgIH07XG4gICAgc3RvcmUuc2V0U2VsZWN0aW9uKG5leHRTZWxlY3Rpb24pO1xuICAgIHN0b3JlLnNldFRyYW5zcG9ydCh7IG93bmVyOiAndGltZWxpbmUnLCBwbGF5aW5nOiBmYWxzZSwgc3RvcnlXVTogZHJhZy5zdG9yeVdVIH0pO1xuICB9O1xuXG4gIGNvbnN0IG1vdmVUaW1pbmdEcmFnID0gKGV2ZW50KSA9PiB7XG4gICAgY29uc3QgZHJhZyA9IHRpbWluZ0RyYWdSZWYuY3VycmVudDtcbiAgICBpZiAoIWRyYWcgfHwgZHJhZy5wb2ludGVySWQgIT09IGV2ZW50LnBvaW50ZXJJZCkgcmV0dXJuO1xuICAgIGlmICghZHJhZy5tb3ZlZCAmJiBNYXRoLmFicyhldmVudC5jbGllbnRYIC0gZHJhZy5zdGFydFgpIDwgMykgcmV0dXJuO1xuICAgIGRyYWcubW92ZWQgPSB0cnVlO1xuICAgIGlmIChkcmFnLnR5cGUgPT09ICdjYW1lcmEnKSB7XG4gICAgICBjb25zdCBkcm9wID0gcmVzb2x2ZUNhbWVyYURyb3BBdENsaWVudFgoZXZlbnQuY2xpZW50WCk7XG4gICAgICBkcmFnLmxhc3REcm9wID0gZHJvcDtcbiAgICAgIHNldENhbWVyYURyYWdQcmV2aWV3KHsgLi4uZHJvcCwgdG9rZW46IGRyYWcudG9rZW4gfSk7XG4gICAgICBpZiAoZHJvcC52YWxpZCkge1xuICAgICAgICBzdG9yZS5zZXRUcmFuc3BvcnQoeyBvd25lcjogJ3RpbWVsaW5lJywgcGxheWluZzogZmFsc2UsIHN0b3J5V1U6IGRyb3Auc3RvcnlXVSB9KTtcbiAgICAgIH1cbiAgICAgIHJldHVybjtcbiAgICB9XG4gICAgaWYgKGRyYWcudHlwZSA9PT0gJ2Rpc2NpcGxpbmUtcmV2ZWFsJykge1xuICAgICAgY29uc3QgZGVsdGFMYW5lID0gKGV2ZW50LmNsaWVudFggLSBkcmFnLnN0YXJ0WCkgLyBkcmFnLnJlY3Qud2lkdGg7XG4gICAgICBjb25zdCBuZXh0QXQgPSBNYXRoLm1pbihkcmFnLm1heCwgTWF0aC5tYXgoXG4gICAgICAgIGRyYWcubWluLFxuICAgICAgICBzbmFwQWJvdXROYXJyYXRpdmVUaW1lbGluZVZhbHVlKGRyYWcuYXQgKyBkZWx0YUxhbmUpLFxuICAgICAgKSk7XG4gICAgICBpZiAoTWF0aC5hYnMobmV4dEF0IC0gZHJhZy5sYXN0QXQpIDwgMC4wMDAwMDEpIHJldHVybjtcbiAgICAgIGNvbnN0IGRlbHRhID0gbmV4dEF0IC0gZHJhZy5sYXN0QXQ7XG4gICAgICBzdG9yZS5jb21taXQoJ01vdmUgRGlzY2lwbGluZSByZXZlYWwnLCAoZHJhZnQpID0+IHtcbiAgICAgICAgY29uc3QgcmV2ZWFsID0gZHJhZnQuc2VjdGlvbnNbZHJhZy5zZWN0aW9uSW5kZXhdLnRleHQuZGlzY2lwbGluZVJldmVhbDtcbiAgICAgICAgaWYgKCFyZXZlYWwpIHJldHVybjtcbiAgICAgICAgcmV2ZWFsLnN0YXJ0ICs9IGRlbHRhO1xuICAgICAgICByZXZlYWwuZW5kICs9IGRlbHRhO1xuICAgICAgfSwgeyBjb2FsZXNjZUtleTogZHJhZy5jb2FsZXNjZUtleSwgc2VsZWN0aW9uOiBkcmFnLnNlbGVjdGlvbiB9KTtcbiAgICAgIGRyYWcubGFzdEF0ID0gbmV4dEF0O1xuICAgICAgc3RvcmUuc2V0VHJhbnNwb3J0KHtcbiAgICAgICAgb3duZXI6ICd0aW1lbGluZScsXG4gICAgICAgIHBsYXlpbmc6IGZhbHNlLFxuICAgICAgICBzdG9yeVdVOiBkcmFnLnNlY3Rpb25TdGFydFdVICsgKG5leHRBdCAqIGRyYWcudHJhdmVsV1UpLFxuICAgICAgfSk7XG4gICAgICByZXR1cm47XG4gICAgfVxuICAgIGNvbnN0IGxvY2FsRGVsdGEgPSAoZXZlbnQuY2xpZW50WCAtIGRyYWcuc3RhcnRYKSAvIGRyYWcucmVjdC53aWR0aDtcbiAgICBjb25zdCBtb3ZlbWVudCA9IHJlc29sdmVBYm91dE5hcnJhdGl2ZUN1ZUdyb3VwTW92ZSh7XG4gICAgICBkb2N1bWVudDogZHJhZy5zdGFydERvY3VtZW50LFxuICAgICAgcGxhbjogZHJhZy5zdGFydFBsYW4sXG4gICAgICBtZW1iZXJzOiBkcmFnLm1lbWJlcnMsXG4gICAgICBwcmltYXJ5OiBkcmFnLnNlbGVjdGlvbixcbiAgICAgIGxvY2FsRGVsdGEsXG4gICAgfSk7XG4gICAgaWYgKCFtb3ZlbWVudC52YWxpZCB8fCBNYXRoLmFicyhtb3ZlbWVudC5kZWx0YVdVIC0gKGRyYWcubGFzdERlbHRhV1UgfHwgMCkpIDwgMC4wMDAwMDEpIHJldHVybjtcbiAgICBkcmFnLmxhc3REZWx0YVdVID0gbW92ZW1lbnQuZGVsdGFXVTtcbiAgICBxdWV1ZVByZXZpZXdGcmFtZSgoKSA9PiB7XG4gICAgICBzdG9yZS51cGRhdGVQcmV2aWV3KChkcmFmdCkgPT4ge1xuICAgICAgICBtb3ZlbWVudC5tb3Zlcy5mb3JFYWNoKChtb3ZlKSA9PiB7XG4gICAgICAgICAgY29uc3QgY3VlID0gZHJhZnQuc2VjdGlvbnNbbW92ZS5zZWN0aW9uSW5kZXhdPy50ZXh0Py5jdWVzPy5maW5kKChpdGVtKSA9PiBpdGVtLmlkID09PSBtb3ZlLmN1ZUlkKTtcbiAgICAgICAgICBpZiAoY3VlKSBPYmplY3QuYXNzaWduKGN1ZSwgeyBlbnRlcjogbW92ZS5lbnRlciwgaG9sZDogbW92ZS5ob2xkLCBleGl0OiBtb3ZlLmV4aXQgfSk7XG4gICAgICAgIH0pO1xuICAgICAgfSwge1xuICAgICAgICBvd25lcjogJ3RpbWVsaW5lJyxcbiAgICAgICAgcGxheWluZzogZmFsc2UsXG4gICAgICAgIHN0b3J5V1U6IGRyYWcuc3RvcnlXVSArIG1vdmVtZW50LmRlbHRhV1UsXG4gICAgICB9KTtcbiAgICB9KTtcbiAgfTtcblxuICBjb25zdCBlbmRUaW1pbmdEcmFnID0gKGV2ZW50KSA9PiB7XG4gICAgY29uc3QgZHJhZyA9IHRpbWluZ0RyYWdSZWYuY3VycmVudDtcbiAgICBpZiAoIWRyYWcgfHwgZHJhZy5wb2ludGVySWQgIT09IGV2ZW50LnBvaW50ZXJJZCkgcmV0dXJuO1xuICAgIGlmIChldmVudC5jdXJyZW50VGFyZ2V0Lmhhc1BvaW50ZXJDYXB0dXJlPy4oZXZlbnQucG9pbnRlcklkKSkgZXZlbnQuY3VycmVudFRhcmdldC5yZWxlYXNlUG9pbnRlckNhcHR1cmUoZXZlbnQucG9pbnRlcklkKTtcbiAgICBpZiAoZHJhZy50eXBlID09PSAnY3VlJykge1xuICAgICAgZmx1c2hQcmV2aWV3RnJhbWUoKTtcbiAgICAgIGlmIChldmVudC50eXBlID09PSAncG9pbnRlcmNhbmNlbCcgfHwgIWRyYWcubW92ZWQpIHN0b3JlLmNhbmNlbFByZXZpZXcoKTtcbiAgICAgIGVsc2Ugc3RvcmUuY29tbWl0UHJldmlldyhkcmFnLnNlbGVjdGlvbik7XG4gICAgfVxuICAgIGlmIChkcmFnLnR5cGUgPT09ICdjYW1lcmEnICYmIGRyYWcubW92ZWQgJiYgZXZlbnQudHlwZSAhPT0gJ3BvaW50ZXJjYW5jZWwnKSB7XG4gICAgICBjb25zdCBkcm9wID0gZHJhZy5sYXN0RHJvcCB8fCByZXNvbHZlQ2FtZXJhRHJvcEF0Q2xpZW50WChldmVudC5jbGllbnRYKTtcbiAgICAgIGlmIChkcm9wLnZhbGlkKSB7XG4gICAgICAgIHN0b3JlLmNvbW1pdCgnTW92ZSBjYW1lcmEga2V5JywgKGRyYWZ0KSA9PiB7XG4gICAgICAgICAgY29uc3Qgc291cmNlS2V5cyA9IGRyYWZ0LnNlY3Rpb25zW2RyYWcuc2VjdGlvbkluZGV4XT8uY2FtZXJhLmtleXM7XG4gICAgICAgICAgY29uc3QgW21vdmVkS2V5XSA9IHNvdXJjZUtleXM/LnNwbGljZShkcmFnLmtleUluZGV4LCAxKSB8fCBbXTtcbiAgICAgICAgICBpZiAoIW1vdmVkS2V5KSByZXR1cm47XG4gICAgICAgICAgbW92ZWRLZXkuYXQgPSBkcm9wLmF0O1xuICAgICAgICAgIGNvbnN0IGRlc3RpbmF0aW9uS2V5cyA9IGRyYWZ0LnNlY3Rpb25zW2Ryb3Auc2VjdGlvbkluZGV4XS5jYW1lcmEua2V5cztcbiAgICAgICAgICBkZXN0aW5hdGlvbktleXMucHVzaChtb3ZlZEtleSk7XG4gICAgICAgICAgZGVzdGluYXRpb25LZXlzLnNvcnQoKGEsIGIpID0+IGEuYXQgLSBiLmF0KTtcbiAgICAgICAgfSwge1xuICAgICAgICAgIHNlbGVjdGlvbjogeyB0eXBlOiAnY2FtZXJhLWtleScsIHNlY3Rpb25JZDogZHJvcC5zZWN0aW9uSWQsIGtleUluZGV4OiBkcm9wLmtleUluZGV4IH0sXG4gICAgICAgIH0pO1xuICAgICAgICBzdG9yZS5zZXRUcmFuc3BvcnQoeyBvd25lcjogJ3RpbWVsaW5lJywgcGxheWluZzogZmFsc2UsIHN0b3J5V1U6IGRyb3Auc3RvcnlXVSB9KTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHN0b3JlLnNldFNhdmVTdGF0ZSh7IG1lc3NhZ2U6IGRyb3AucmVhc29uIHx8ICdUaGF0IGNhbWVyYSBrZXkgY2Fubm90IGJlIHBsYWNlZCBoZXJlLicgfSk7XG4gICAgICB9XG4gICAgfVxuICAgIGlmIChkcmFnLm1vdmVkKSB7XG4gICAgICBzdXBwcmVzc2VkQ2xpY2tSZWYuY3VycmVudCA9IGRyYWcudG9rZW47XG4gICAgICB3aW5kb3cuc2V0VGltZW91dCgoKSA9PiB7XG4gICAgICAgIGlmIChzdXBwcmVzc2VkQ2xpY2tSZWYuY3VycmVudCA9PT0gZHJhZy50b2tlbikgc3VwcHJlc3NlZENsaWNrUmVmLmN1cnJlbnQgPSBudWxsO1xuICAgICAgfSwgMCk7XG4gICAgfVxuICAgIHNldENhbWVyYURyYWdQcmV2aWV3KG51bGwpO1xuICAgIHRpbWluZ0RyYWdSZWYuY3VycmVudCA9IG51bGw7XG4gIH07XG5cbiAgY29uc3QgaGFuZGxlVGltaW5nQ2xpY2sgPSAodG9rZW4sIGFjdGlvbikgPT4ge1xuICAgIGlmIChzdXBwcmVzc2VkQ2xpY2tSZWYuY3VycmVudCA9PT0gdG9rZW4pIHtcbiAgICAgIHN1cHByZXNzZWRDbGlja1JlZi5jdXJyZW50ID0gbnVsbDtcbiAgICAgIHJldHVybjtcbiAgICB9XG4gICAgYWN0aW9uKCk7XG4gIH07XG5cbiAgY29uc3QgYmVnaW5TZWN0aW9uUmVzaXplID0gKGV2ZW50LCBkYXRhKSA9PiB7XG4gICAgaWYgKGRhdGEubG9ja2VkIHx8IGV2ZW50LmJ1dHRvbiAhPT0gMCkgcmV0dXJuO1xuICAgIGV2ZW50LnByZXZlbnREZWZhdWx0KCk7XG4gICAgZXZlbnQuc3RvcFByb3BhZ2F0aW9uKCk7XG4gICAgZXZlbnQuY3VycmVudFRhcmdldC5zZXRQb2ludGVyQ2FwdHVyZT8uKGV2ZW50LnBvaW50ZXJJZCk7XG4gICAgY29uc3QgY3VycmVudCA9IHN0b3JlLmdldFNuYXBzaG90KCk7XG4gICAgY29uc3QgZmllbGQgPSBnZXRBYm91dE5hcnJhdGl2ZUV4dGVudEZpZWxkKGN1cnJlbnQucHJldmlld1Byb2ZpbGUpO1xuICAgIHN0b3JlLmJlZ2luUHJldmlldyhgUmVzaXplICR7ZGF0YS5zZWN0aW9uTGFiZWx9YCk7XG4gICAgc3RvcmUuc2V0U2VsZWN0aW9uKHsgdHlwZTogJ3NlY3Rpb24nLCBzZWN0aW9uSWQ6IGRhdGEuc2VjdGlvbklkIH0pO1xuICAgIHRpbWluZ0RyYWdSZWYuY3VycmVudCA9IHtcbiAgICAgIHR5cGU6ICdzZWN0aW9uLXJlc2l6ZScsXG4gICAgICB0b2tlbjogYHNlY3Rpb24tcmVzaXplOiR7ZGF0YS5zZWN0aW9uSWR9YCxcbiAgICAgIHBvaW50ZXJJZDogZXZlbnQucG9pbnRlcklkLFxuICAgICAgc3RhcnRYOiBldmVudC5jbGllbnRYLFxuICAgICAgbW92ZWQ6IGZhbHNlLFxuICAgICAgc2VjdGlvbklkOiBkYXRhLnNlY3Rpb25JZCxcbiAgICAgIHNlY3Rpb25JbmRleDogZGF0YS5zZWN0aW9uSW5kZXgsXG4gICAgICBzZWN0aW9uTGFiZWw6IGRhdGEuc2VjdGlvbkxhYmVsLFxuICAgICAgZmllbGQsXG4gICAgICBzdGFydEV4dGVudDogTnVtYmVyKGN1cnJlbnQuZG9jdW1lbnQuc2VjdGlvbnNbZGF0YS5zZWN0aW9uSW5kZXhdW2ZpZWxkXSksXG4gICAgICBzdGFydE1heFdVOiBNYXRoLm1heCgwLjAwMSwgY3VycmVudC5jb21waWxlZFBsYW4/Lm1heFN0b3J5V1UgfHwgbWF4V1UpLFxuICAgICAgc3RhcnRTY3JvbGxXaWR0aDogTWF0aC5tYXgoMSwgbGFuZXNSZWYuY3VycmVudD8uc2Nyb2xsV2lkdGggfHwgMSksXG4gICAgICBwbGF5aGVhZENvbnRleHQ6IGNhcHR1cmVBYm91dE5hcnJhdGl2ZVBsYXloZWFkQ29udGV4dCh7XG4gICAgICAgIHBsYW46IGN1cnJlbnQuY29tcGlsZWRQbGFuLFxuICAgICAgICBzdG9yeVdVOiBjdXJyZW50LnRyYW5zcG9ydC5zdG9yeVdVLFxuICAgICAgICByZXNpemVkU2VjdGlvbklkOiBkYXRhLnNlY3Rpb25JZCxcbiAgICAgIH0pLFxuICAgICAgc2VsZWN0aW9uOiB7IHR5cGU6ICdzZWN0aW9uJywgc2VjdGlvbklkOiBkYXRhLnNlY3Rpb25JZCB9LFxuICAgIH07XG4gICAgc2V0U2VjdGlvblJlc2l6ZVByZXZpZXcoeyBzZWN0aW9uSWQ6IGRhdGEuc2VjdGlvbklkLCBleHRlbnQ6IE51bWJlcihjdXJyZW50LmRvY3VtZW50LnNlY3Rpb25zW2RhdGEuc2VjdGlvbkluZGV4XVtmaWVsZF0pIH0pO1xuICB9O1xuXG4gIGNvbnN0IG1vdmVTZWN0aW9uUmVzaXplID0gKGV2ZW50KSA9PiB7XG4gICAgY29uc3QgZHJhZyA9IHRpbWluZ0RyYWdSZWYuY3VycmVudDtcbiAgICBpZiAoZHJhZz8udHlwZSAhPT0gJ3NlY3Rpb24tcmVzaXplJyB8fCBkcmFnLnBvaW50ZXJJZCAhPT0gZXZlbnQucG9pbnRlcklkKSByZXR1cm47XG4gICAgaWYgKCFkcmFnLm1vdmVkICYmIE1hdGguYWJzKGV2ZW50LmNsaWVudFggLSBkcmFnLnN0YXJ0WCkgPCAzKSByZXR1cm47XG4gICAgZHJhZy5tb3ZlZCA9IHRydWU7XG4gICAgY29uc3QgcmF3RXh0ZW50ID0gZHJhZy5zdGFydEV4dGVudCArICgoKGV2ZW50LmNsaWVudFggLSBkcmFnLnN0YXJ0WCkgLyBkcmFnLnN0YXJ0U2Nyb2xsV2lkdGgpICogZHJhZy5zdGFydE1heFdVKTtcbiAgICBjb25zdCBzdGVwID0gZXZlbnQuYWx0S2V5ID8gMC4wMSA6IGV2ZW50LnNoaWZ0S2V5ID8gMC4yNSA6IDAuMDU7XG4gICAgY29uc3QgZXh0ZW50ID0gTWF0aC5taW4oOCwgTWF0aC5tYXgoMSwgTWF0aC5yb3VuZChyYXdFeHRlbnQgLyBzdGVwKSAqIHN0ZXApKTtcbiAgICBpZiAoTWF0aC5hYnMoZXh0ZW50IC0gKGRyYWcubGFzdEV4dGVudCA/PyBkcmFnLnN0YXJ0RXh0ZW50KSkgPCAwLjAwMDAwMSkgcmV0dXJuO1xuICAgIGRyYWcubGFzdEV4dGVudCA9IE51bWJlcihleHRlbnQudG9GaXhlZCgyKSk7XG4gICAgc2V0U2VjdGlvblJlc2l6ZVByZXZpZXcoeyBzZWN0aW9uSWQ6IGRyYWcuc2VjdGlvbklkLCBleHRlbnQ6IGRyYWcubGFzdEV4dGVudCB9KTtcbiAgICBxdWV1ZVByZXZpZXdGcmFtZSgoKSA9PiB7XG4gICAgICBzdG9yZS51cGRhdGVQcmV2aWV3KChkcmFmdCkgPT4ge1xuICAgICAgICBkcmFmdC5zZWN0aW9uc1tkcmFnLnNlY3Rpb25JbmRleF1bZHJhZy5maWVsZF0gPSBkcmFnLmxhc3RFeHRlbnQ7XG4gICAgICB9KTtcbiAgICAgIHN0b3JlLnNldFRyYW5zcG9ydCh7XG4gICAgICAgIG93bmVyOiAndGltZWxpbmUnLFxuICAgICAgICBwbGF5aW5nOiBmYWxzZSxcbiAgICAgICAgc3RvcnlXVTogcmVtYXBBYm91dE5hcnJhdGl2ZVBsYXloZWFkQ29udGV4dChkcmFnLnBsYXloZWFkQ29udGV4dCwgc3RvcmUuZ2V0U25hcHNob3QoKS5jb21waWxlZFBsYW4pLFxuICAgICAgfSk7XG4gICAgfSk7XG4gIH07XG5cbiAgY29uc3QgZW5kU2VjdGlvblJlc2l6ZSA9IChldmVudCkgPT4ge1xuICAgIGNvbnN0IGRyYWcgPSB0aW1pbmdEcmFnUmVmLmN1cnJlbnQ7XG4gICAgaWYgKGRyYWc/LnR5cGUgIT09ICdzZWN0aW9uLXJlc2l6ZScgfHwgZHJhZy5wb2ludGVySWQgIT09IGV2ZW50LnBvaW50ZXJJZCkgcmV0dXJuO1xuICAgIGlmIChldmVudC5jdXJyZW50VGFyZ2V0Lmhhc1BvaW50ZXJDYXB0dXJlPy4oZXZlbnQucG9pbnRlcklkKSkgZXZlbnQuY3VycmVudFRhcmdldC5yZWxlYXNlUG9pbnRlckNhcHR1cmUoZXZlbnQucG9pbnRlcklkKTtcbiAgICBmbHVzaFByZXZpZXdGcmFtZSgpO1xuICAgIGlmIChldmVudC50eXBlID09PSAncG9pbnRlcmNhbmNlbCcgfHwgIWRyYWcubW92ZWQpIHN0b3JlLmNhbmNlbFByZXZpZXcoKTtcbiAgICBlbHNlIHN0b3JlLmNvbW1pdFByZXZpZXcoZHJhZy5zZWxlY3Rpb24pO1xuICAgIHRpbWluZ0RyYWdSZWYuY3VycmVudCA9IG51bGw7XG4gICAgc2V0U2VjdGlvblJlc2l6ZVByZXZpZXcobnVsbCk7XG4gIH07XG5cbiAgY29uc3QgcmVzZXRTZWN0aW9uRXh0ZW50ID0gKHNlY3Rpb25JZCwgc2VjdGlvbkluZGV4KSA9PiB7XG4gICAgY29uc3QgY3VycmVudCA9IHN0b3JlLmdldFNuYXBzaG90KCk7XG4gICAgY29uc3QgZmllbGQgPSBnZXRBYm91dE5hcnJhdGl2ZUV4dGVudEZpZWxkKGN1cnJlbnQucHJldmlld1Byb2ZpbGUpO1xuICAgIGNvbnN0IGJhc2VsaW5lU2VjdGlvbiA9IGN1cnJlbnQuYmFzZWxpbmVEb2N1bWVudC5zZWN0aW9ucy5maW5kKChpdGVtKSA9PiBpdGVtLmlkID09PSBzZWN0aW9uSWQpO1xuICAgIGlmICghYmFzZWxpbmVTZWN0aW9uIHx8IGJhc2VsaW5lU2VjdGlvbltmaWVsZF0gPT09IGN1cnJlbnQuZG9jdW1lbnQuc2VjdGlvbnNbc2VjdGlvbkluZGV4XVtmaWVsZF0pIHJldHVybjtcbiAgICBjb25zdCBjb250ZXh0ID0gY2FwdHVyZUFib3V0TmFycmF0aXZlUGxheWhlYWRDb250ZXh0KHtcbiAgICAgIHBsYW46IGN1cnJlbnQuY29tcGlsZWRQbGFuLFxuICAgICAgc3RvcnlXVTogY3VycmVudC50cmFuc3BvcnQuc3RvcnlXVSxcbiAgICAgIHJlc2l6ZWRTZWN0aW9uSWQ6IHNlY3Rpb25JZCxcbiAgICB9KTtcbiAgICBzdG9yZS5iZWdpblByZXZpZXcoJ1Jlc3RvcmUgc2F2ZWQgU2VjdGlvbiBsZW5ndGgnKTtcbiAgICBzdG9yZS51cGRhdGVQcmV2aWV3KChkcmFmdCkgPT4geyBkcmFmdC5zZWN0aW9uc1tzZWN0aW9uSW5kZXhdW2ZpZWxkXSA9IGJhc2VsaW5lU2VjdGlvbltmaWVsZF07IH0pO1xuICAgIHN0b3JlLnNldFRyYW5zcG9ydCh7IHN0b3J5V1U6IHJlbWFwQWJvdXROYXJyYXRpdmVQbGF5aGVhZENvbnRleHQoY29udGV4dCwgc3RvcmUuZ2V0U25hcHNob3QoKS5jb21waWxlZFBsYW4pIH0pO1xuICAgIHN0b3JlLmNvbW1pdFByZXZpZXcoeyB0eXBlOiAnc2VjdGlvbicsIHNlY3Rpb25JZCB9KTtcbiAgfTtcblxuICBjb25zdCBiZWdpbk1hcnF1ZWUgPSAoZXZlbnQpID0+IHtcbiAgICBpZiAoZXZlbnQuYnV0dG9uICE9PSAwIHx8IGV2ZW50LnRhcmdldCAhPT0gZXZlbnQuY3VycmVudFRhcmdldCkgcmV0dXJuO1xuICAgIGNvbnN0IGNhbnZhcyA9IGxhbmVzUmVmLmN1cnJlbnQ/LnF1ZXJ5U2VsZWN0b3IoJy5hYm91dC1lZGl0b3ItdGltZWxpbmUtY2FudmFzJyk7XG4gICAgaWYgKCFjYW52YXMpIHJldHVybjtcbiAgICBldmVudC5wcmV2ZW50RGVmYXVsdCgpO1xuICAgIGV2ZW50LmN1cnJlbnRUYXJnZXQuc2V0UG9pbnRlckNhcHR1cmU/LihldmVudC5wb2ludGVySWQpO1xuICAgIGNvbnN0IHJlY3QgPSBjYW52YXMuZ2V0Qm91bmRpbmdDbGllbnRSZWN0KCk7XG4gICAgdGltaW5nRHJhZ1JlZi5jdXJyZW50ID0ge1xuICAgICAgdHlwZTogJ21hcnF1ZWUnLFxuICAgICAgcG9pbnRlcklkOiBldmVudC5wb2ludGVySWQsXG4gICAgICBzdGFydENsaWVudFg6IGV2ZW50LmNsaWVudFgsXG4gICAgICBzdGFydENsaWVudFk6IGV2ZW50LmNsaWVudFksXG4gICAgICBjYW52YXNSZWN0OiByZWN0LFxuICAgICAgYWRkaXRpdmU6IGV2ZW50LnNoaWZ0S2V5LFxuICAgIH07XG4gICAgc2V0TWFycXVlZSh7IGxlZnQ6IGV2ZW50LmNsaWVudFggLSByZWN0LmxlZnQsIHRvcDogZXZlbnQuY2xpZW50WSAtIHJlY3QudG9wLCB3aWR0aDogMCwgaGVpZ2h0OiAwIH0pO1xuICB9O1xuXG4gIGNvbnN0IG1vdmVNYXJxdWVlID0gKGV2ZW50KSA9PiB7XG4gICAgY29uc3QgZHJhZyA9IHRpbWluZ0RyYWdSZWYuY3VycmVudDtcbiAgICBpZiAoZHJhZz8udHlwZSAhPT0gJ21hcnF1ZWUnIHx8IGRyYWcucG9pbnRlcklkICE9PSBldmVudC5wb2ludGVySWQpIHJldHVybjtcbiAgICBjb25zdCBsZWZ0ID0gTWF0aC5taW4oZHJhZy5zdGFydENsaWVudFgsIGV2ZW50LmNsaWVudFgpIC0gZHJhZy5jYW52YXNSZWN0LmxlZnQ7XG4gICAgY29uc3QgdG9wID0gTWF0aC5taW4oZHJhZy5zdGFydENsaWVudFksIGV2ZW50LmNsaWVudFkpIC0gZHJhZy5jYW52YXNSZWN0LnRvcDtcbiAgICBzZXRNYXJxdWVlKHtcbiAgICAgIGxlZnQsXG4gICAgICB0b3AsXG4gICAgICB3aWR0aDogTWF0aC5hYnMoZXZlbnQuY2xpZW50WCAtIGRyYWcuc3RhcnRDbGllbnRYKSxcbiAgICAgIGhlaWdodDogTWF0aC5hYnMoZXZlbnQuY2xpZW50WSAtIGRyYWcuc3RhcnRDbGllbnRZKSxcbiAgICB9KTtcbiAgfTtcblxuICBjb25zdCBlbmRNYXJxdWVlID0gKGV2ZW50KSA9PiB7XG4gICAgY29uc3QgZHJhZyA9IHRpbWluZ0RyYWdSZWYuY3VycmVudDtcbiAgICBpZiAoZHJhZz8udHlwZSAhPT0gJ21hcnF1ZWUnIHx8IGRyYWcucG9pbnRlcklkICE9PSBldmVudC5wb2ludGVySWQpIHJldHVybjtcbiAgICBpZiAoZXZlbnQuY3VycmVudFRhcmdldC5oYXNQb2ludGVyQ2FwdHVyZT8uKGV2ZW50LnBvaW50ZXJJZCkpIGV2ZW50LmN1cnJlbnRUYXJnZXQucmVsZWFzZVBvaW50ZXJDYXB0dXJlKGV2ZW50LnBvaW50ZXJJZCk7XG4gICAgaWYgKGV2ZW50LnR5cGUgIT09ICdwb2ludGVyY2FuY2VsJykge1xuICAgICAgY29uc3Qgc2VsZWN0aW9uUmVjdCA9IHtcbiAgICAgICAgbGVmdDogTWF0aC5taW4oZHJhZy5zdGFydENsaWVudFgsIGV2ZW50LmNsaWVudFgpLFxuICAgICAgICByaWdodDogTWF0aC5tYXgoZHJhZy5zdGFydENsaWVudFgsIGV2ZW50LmNsaWVudFgpLFxuICAgICAgICB0b3A6IE1hdGgubWluKGRyYWcuc3RhcnRDbGllbnRZLCBldmVudC5jbGllbnRZKSxcbiAgICAgICAgYm90dG9tOiBNYXRoLm1heChkcmFnLnN0YXJ0Q2xpZW50WSwgZXZlbnQuY2xpZW50WSksXG4gICAgICB9O1xuICAgICAgY29uc3QgbGFuZVJlY3QgPSBsYW5lc1JlZi5jdXJyZW50Py5nZXRCb3VuZGluZ0NsaWVudFJlY3QoKTtcbiAgICAgIGNvbnN0IGhpdHMgPSBbLi4uKGxhbmVzUmVmLmN1cnJlbnQ/LnF1ZXJ5U2VsZWN0b3JBbGwoJy5hYm91dC1lZGl0b3ItY3VlW2RhdGEtY3VlLWlkXScpIHx8IFtdKV1cbiAgICAgICAgLmZpbHRlcigobm9kZSkgPT4ge1xuICAgICAgICAgIGNvbnN0IHJlY3QgPSBub2RlLmdldEJvdW5kaW5nQ2xpZW50UmVjdCgpO1xuICAgICAgICAgIGNvbnN0IHZpc2libGUgPSBsYW5lUmVjdCAmJiByZWN0LnJpZ2h0ID49IGxhbmVSZWN0LmxlZnQgJiYgcmVjdC5sZWZ0IDw9IGxhbmVSZWN0LnJpZ2h0O1xuICAgICAgICAgIHJldHVybiB2aXNpYmxlICYmIHJlY3QucmlnaHQgPj0gc2VsZWN0aW9uUmVjdC5sZWZ0ICYmIHJlY3QubGVmdCA8PSBzZWxlY3Rpb25SZWN0LnJpZ2h0XG4gICAgICAgICAgICAmJiByZWN0LmJvdHRvbSA+PSBzZWxlY3Rpb25SZWN0LnRvcCAmJiByZWN0LnRvcCA8PSBzZWxlY3Rpb25SZWN0LmJvdHRvbTtcbiAgICAgICAgfSlcbiAgICAgICAgLm1hcCgobm9kZSkgPT4gKHsgdHlwZTogJ2N1ZScsIHNlY3Rpb25JZDogbm9kZS5kYXRhc2V0LnNlY3Rpb25JZCwgY3VlSWQ6IG5vZGUuZGF0YXNldC5jdWVJZCwga2V5UGFydDogJ2ZvY3VzJyB9KSk7XG4gICAgICBpZiAoaGl0cy5sZW5ndGgpIHtcbiAgICAgICAgbGV0IG5leHRTZWxlY3Rpb24gPSBkcmFnLmFkZGl0aXZlID8gc3RvcmUuZ2V0U25hcHNob3QoKS5zZWxlY3Rpb24gOiBoaXRzWzBdO1xuICAgICAgICBoaXRzLnNsaWNlKGRyYWcuYWRkaXRpdmUgPyAwIDogMSkuZm9yRWFjaCgoaGl0KSA9PiB7XG4gICAgICAgICAgbmV4dFNlbGVjdGlvbiA9IHRvZ2dsZUFib3V0TmFycmF0aXZlQ3VlU2VsZWN0aW9uKG5leHRTZWxlY3Rpb24sIGhpdCk7XG4gICAgICAgIH0pO1xuICAgICAgICBzdG9yZS5zZXRTZWxlY3Rpb24obmV4dFNlbGVjdGlvbik7XG4gICAgICB9XG4gICAgfVxuICAgIHRpbWluZ0RyYWdSZWYuY3VycmVudCA9IG51bGw7XG4gICAgc2V0TWFycXVlZShudWxsKTtcbiAgfTtcblxuICByZXR1cm4gKFxuICAgIDxkaXYgY2xhc3NOYW1lPVwiYWJvdXQtZWRpdG9yLXRpbWVsaW5lXCI+XG4gICAgICA8ZGl2IGNsYXNzTmFtZT1cImFib3V0LWVkaXRvci1sYW5lLWxhYmVsc1wiIGFyaWEtaGlkZGVuPVwidHJ1ZVwiPlxuICAgICAgICA8c3Bhbj5TZWN0aW9uczwvc3Bhbj48c3Bhbj5DYW1lcmE8L3NwYW4+PHNwYW4+V29ybGQ8L3NwYW4+PHNwYW4+VGV4dDwvc3Bhbj48c3Bhbj5JbnRlcmFjdGlvbjwvc3Bhbj5cbiAgICAgIDwvZGl2PlxuICAgICAgPGRpdiByZWY9e2xhbmVzUmVmfSBjbGFzc05hbWU9XCJhYm91dC1lZGl0b3ItbGFuZXNcIiBkYXRhLXNvbG8tdHJhY2s9e3RyYW5zcG9ydC5zb2xvVHJhY2sgfHwgJyd9IG9uV2hlZWw9e3pvb21UaW1lbGluZX0+XG4gICAgICAgIDxkaXYgY2xhc3NOYW1lPVwiYWJvdXQtZWRpdG9yLXRpbWVsaW5lLWNhbnZhc1wiIHN0eWxlPXt7ICctLWFib3V0LWVkaXRvci1wbGF5aGVhZCc6IHBsYXloZWFkLCAnLS1hYm91dC1lZGl0b3ItdGltZWxpbmUtem9vbSc6IE1hdGgubWF4KDEsIE51bWJlcih0cmFuc3BvcnQuem9vbSkgfHwgMSkgfX0+XG4gICAgICAgICAgPGRpdiBjbGFzc05hbWU9XCJhYm91dC1lZGl0b3ItcGxheWhlYWRcIiAvPlxuICAgICAgICAgIHttYXJxdWVlID8gPGRpdiBjbGFzc05hbWU9XCJhYm91dC1lZGl0b3ItbWFycXVlZVwiIHN0eWxlPXttYXJxdWVlfSBhcmlhLWhpZGRlbj1cInRydWVcIiAvPiA6IG51bGx9XG4gICAgICAgICAge2NhbWVyYURyYWdQcmV2aWV3ID8gKFxuICAgICAgICAgIDxkaXZcbiAgICAgICAgICAgIGNsYXNzTmFtZT17YGFib3V0LWVkaXRvci1jYW1lcmEtZHJhZy1naG9zdCR7Y2FtZXJhRHJhZ1ByZXZpZXcudmFsaWQgPyAnJyA6ICcgaXMtaW52YWxpZCd9YH1cbiAgICAgICAgICAgIHN0eWxlPXt7IGxlZnQ6IGAke2NhbWVyYURyYWdQcmV2aWV3LmNvbnRlbnRYfXB4YCB9fVxuICAgICAgICAgICAgYXJpYS1oaWRkZW49XCJ0cnVlXCJcbiAgICAgICAgICA+XG4gICAgICAgICAgICA8aSAvPlxuICAgICAgICAgICAgPHNwYW4+e2NhbWVyYURyYWdQcmV2aWV3LnZhbGlkID8gYCR7Y2FtZXJhRHJhZ1ByZXZpZXcuc2VjdGlvbkxhYmVsfSDCtyAke2Zvcm1hdENhbWVyYVBlcmNlbnQoY2FtZXJhRHJhZ1ByZXZpZXcuYXQpfWAgOiBjYW1lcmFEcmFnUHJldmlldy5yZWFzb259PC9zcGFuPlxuICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICkgOiBudWxsfVxuICAgICAgICAgIHtbJ3NlY3Rpb24nLCAnY2FtZXJhJywgJ3dvcmxkJywgJ3RleHQnLCAnaW50ZXJhY3Rpb24nXS5tYXAoKGxhbmUpID0+IChcbiAgICAgICAgICA8ZGl2IGNsYXNzTmFtZT17YGFib3V0LWVkaXRvci1sYW5lIGFib3V0LWVkaXRvci1sYW5lLS0ke2xhbmV9YH0ga2V5PXtsYW5lfT5cbiAgICAgICAgICAgIHtkb2N1bWVudC5zZWN0aW9ucy5tYXAoKHNlY3Rpb24sIHNlY3Rpb25JbmRleCkgPT4ge1xuICAgICAgICAgICAgICBjb25zdCBjb21waWxlZCA9IGNvbXBpbGVkUGxhbj8uc2VjdGlvbnM/LltzZWN0aW9uSW5kZXhdO1xuICAgICAgICAgICAgICBjb25zdCBzdGFydFdVID0gTWF0aC5taW4obWF4V1UsIGNvbXBpbGVkPy5zdGFydFdVIHx8IDApO1xuICAgICAgICAgICAgICBjb25zdCBuZXh0U3RhcnRXVSA9IE1hdGgubWluKG1heFdVLCBjb21waWxlZFBsYW4/LnNlY3Rpb25zPy5bc2VjdGlvbkluZGV4ICsgMV0/LnN0YXJ0V1UgPz8gbWF4V1UpO1xuICAgICAgICAgICAgICBjb25zdCBzcGFuV1UgPSBNYXRoLm1heCgwLjAwMSwgbmV4dFN0YXJ0V1UgLSBzdGFydFdVKTtcbiAgICAgICAgICAgICAgY29uc3Qgd2lkdGggPSBgJHsoc3BhbldVIC8gbWF4V1UpICogMTAwfSVgO1xuICAgICAgICAgICAgICBjb25zdCBpblNlbGVjdGVkU2VjdGlvbiA9IHNlbGVjdGlvbi5zZWN0aW9uSWQgPT09IHNlY3Rpb24uaWQ7XG4gICAgICAgICAgICAgIGNvbnN0IGxvY2FsUGVyY2VudCA9IChhdCkgPT4gTWF0aC5taW4oMTAwLCAoTnVtYmVyKGF0IHx8IDApICogKGNvbXBpbGVkPy50cmF2ZWxXVSB8fCBzcGFuV1UpIC8gc3BhbldVKSAqIDEwMCk7XG4gICAgICAgICAgICAgIGNvbnN0IGxvY2FsUG9zaXRpb24gPSAoYXQpID0+IGAke2xvY2FsUGVyY2VudChhdCl9JWA7XG4gICAgICAgICAgICAgIGNvbnN0IGV4dGVuZGVkTG9jYWxQb3NpdGlvbiA9IChhdCkgPT4gYCR7KE51bWJlcihhdCB8fCAwKSAqIChjb21waWxlZD8udHJhdmVsV1UgfHwgc3BhbldVKSAvIHNwYW5XVSkgKiAxMDB9JWA7XG4gICAgICAgICAgICAgIGNvbnN0IGV4dGVuZGVkTG9jYWxXaWR0aCA9IChmcm9tLCB0bykgPT4gYCR7TWF0aC5tYXgoMC4zNSwgKE51bWJlcih0bykgLSBOdW1iZXIoZnJvbSkpICogKGNvbXBpbGVkPy50cmF2ZWxXVSB8fCBzcGFuV1UpIC8gc3BhbldVICogMTAwKX0lYDtcbiAgICAgICAgICAgICAgY29uc3QgdGV4dFBvc2l0aW9uID0gKGF0KSA9PiBgJHtjbGFtcDAxKE51bWJlcihhdCB8fCAwKSkgKiAxMDB9JWA7XG4gICAgICAgICAgICAgIGNvbnN0IHNlbGVjdEF0ID0gKG5leHRTZWxlY3Rpb24sIGF0ID0gMCkgPT4ge1xuICAgICAgICAgICAgICAgIHN0b3JlLnNldFNlbGVjdGlvbih7IHNlY3Rpb25JZDogc2VjdGlvbi5pZCwgLi4ubmV4dFNlbGVjdGlvbiB9KTtcbiAgICAgICAgICAgICAgICBzdG9yZS5zZXRUcmFuc3BvcnQoe1xuICAgICAgICAgICAgICAgICAgb3duZXI6ICd0aW1lbGluZScsXG4gICAgICAgICAgICAgICAgICBwbGF5aW5nOiBmYWxzZSxcbiAgICAgICAgICAgICAgICAgIHN0b3J5V1U6IHN0YXJ0V1UgKyAoTnVtYmVyKGF0IHx8IDApICogKGNvbXBpbGVkPy50cmF2ZWxXVSB8fCAwKSksXG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgIH07XG4gICAgICAgICAgICAgIGlmIChsYW5lID09PSAnc2VjdGlvbicpIHtcbiAgICAgICAgICAgICAgICBjb25zdCBpc1NlbGVjdGVkID0gaW5TZWxlY3RlZFNlY3Rpb24gJiYgc2VsZWN0aW9uLnR5cGUgPT09ICdzZWN0aW9uJztcbiAgICAgICAgICAgICAgICBjb25zdCByZXNpemVFeHRlbnQgPSBzZWN0aW9uUmVzaXplUHJldmlldz8uc2VjdGlvbklkID09PSBzZWN0aW9uLmlkXG4gICAgICAgICAgICAgICAgICA/IHNlY3Rpb25SZXNpemVQcmV2aWV3LmV4dGVudFxuICAgICAgICAgICAgICAgICAgOiBOdW1iZXIoc2VjdGlvbltnZXRBYm91dE5hcnJhdGl2ZUV4dGVudEZpZWxkKHNuYXBzaG90LnByZXZpZXdQcm9maWxlKV0pO1xuICAgICAgICAgICAgICAgIHJldHVybiAoXG4gICAgICAgICAgICAgICAgICA8ZGl2XG4gICAgICAgICAgICAgICAgICAgIGtleT17c2VjdGlvbi5pZH1cbiAgICAgICAgICAgICAgICAgICAgY2xhc3NOYW1lPXtgYWJvdXQtZWRpdG9yLXNlY3Rpb24tY2xpcCR7aXNTZWxlY3RlZCA/ICcgaXMtc2VsZWN0ZWQnIDogJyd9JHtpblNlbGVjdGVkU2VjdGlvbiA/ICcgaXMtY29udGV4dCcgOiAnJ31gfVxuICAgICAgICAgICAgICAgICAgICBzdHlsZT17eyB3aWR0aCB9fVxuICAgICAgICAgICAgICAgICAgICB0aXRsZT17YCR7c2VjdGlvbi5sYWJlbH0gwrcgJHtmb3JtYXRXVShjb21waWxlZD8ucmVzb2x2ZWRFeHRlbnRXVSB8fCBzZWN0aW9uLmV4dGVudFdVKX1gfVxuICAgICAgICAgICAgICAgICAgPlxuICAgICAgICAgICAgICAgICAgICA8YnV0dG9uIHR5cGU9XCJidXR0b25cIiBhcmlhLXByZXNzZWQ9e2lzU2VsZWN0ZWR9IG9uQ2xpY2s9eygpID0+IHNlbGVjdEF0KHsgdHlwZTogJ3NlY3Rpb24nIH0pfT5cbiAgICAgICAgICAgICAgICAgICAgICA8c3Bhbj57U3RyaW5nKHNlY3Rpb25JbmRleCArIDEpLnBhZFN0YXJ0KDIsICcwJyl9PC9zcGFuPntzZWN0aW9uLmxhYmVsfVxuICAgICAgICAgICAgICAgICAgICA8L2J1dHRvbj5cbiAgICAgICAgICAgICAgICAgICAge3NlY3Rpb25SZXNpemVQcmV2aWV3Py5zZWN0aW9uSWQgPT09IHNlY3Rpb24uaWQgPyA8b3V0cHV0Pntmb3JtYXRXVShNYXRoLm1heCgwLCByZXNpemVFeHRlbnQgLSAxKSl9IHNjcm9sbCDCtyB7Zm9ybWF0V1UocmVzaXplRXh0ZW50KX0gdG90YWw8L291dHB1dD4gOiBudWxsfVxuICAgICAgICAgICAgICAgICAgICA8YnV0dG9uXG4gICAgICAgICAgICAgICAgICAgICAgdHlwZT1cImJ1dHRvblwiXG4gICAgICAgICAgICAgICAgICAgICAgY2xhc3NOYW1lPVwiYWJvdXQtZWRpdG9yLXNlY3Rpb24tcmVzaXplXCJcbiAgICAgICAgICAgICAgICAgICAgICBkaXNhYmxlZD17c2VjdGlvbi5sb2NrZWR9XG4gICAgICAgICAgICAgICAgICAgICAgYXJpYS1sYWJlbD17YFJlc2l6ZSAke3NlY3Rpb24ubGFiZWx9YH1cbiAgICAgICAgICAgICAgICAgICAgICB0aXRsZT17c2VjdGlvbi5sb2NrZWQgPyAnVW5sb2NrIHRoaXMgcHJvdGVjdGVkIFNlY3Rpb24gdG8gcmVzaXplIGl0JyA6IGBEcmFnIHRvIGNoYW5nZSAke3NuYXBzaG90LnByZXZpZXdQcm9maWxlID09PSAnbW9iaWxlJyA/ICdtb2JpbGUnIDogJ2Rlc2t0b3AnfSBzY3JvbGwgbGVuZ3RoIMK3IGRvdWJsZS1jbGljayB0byByZXN0b3JlIHNhdmVkIGxlbmd0aGB9XG4gICAgICAgICAgICAgICAgICAgICAgb25Eb3VibGVDbGljaz17KGV2ZW50KSA9PiB7IGV2ZW50LnByZXZlbnREZWZhdWx0KCk7IGV2ZW50LnN0b3BQcm9wYWdhdGlvbigpOyByZXNldFNlY3Rpb25FeHRlbnQoc2VjdGlvbi5pZCwgc2VjdGlvbkluZGV4KTsgfX1cbiAgICAgICAgICAgICAgICAgICAgICBvblBvaW50ZXJEb3duPXsoZXZlbnQpID0+IGJlZ2luU2VjdGlvblJlc2l6ZShldmVudCwgeyBzZWN0aW9uSWQ6IHNlY3Rpb24uaWQsIHNlY3Rpb25JbmRleCwgc2VjdGlvbkxhYmVsOiBzZWN0aW9uLmxhYmVsLCBsb2NrZWQ6IHNlY3Rpb24ubG9ja2VkIH0pfVxuICAgICAgICAgICAgICAgICAgICAgIG9uUG9pbnRlck1vdmU9e21vdmVTZWN0aW9uUmVzaXplfVxuICAgICAgICAgICAgICAgICAgICAgIG9uUG9pbnRlclVwPXtlbmRTZWN0aW9uUmVzaXplfVxuICAgICAgICAgICAgICAgICAgICAgIG9uUG9pbnRlckNhbmNlbD17ZW5kU2VjdGlvblJlc2l6ZX1cbiAgICAgICAgICAgICAgICAgICAgLz5cbiAgICAgICAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgICAgICk7XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgaWYgKGxhbmUgPT09ICdjYW1lcmEnKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIChcbiAgICAgICAgICAgICAgICAgIDxkaXYgY2xhc3NOYW1lPVwiYWJvdXQtZWRpdG9yLWNsaXBcIiBrZXk9e3NlY3Rpb24uaWR9IHN0eWxlPXt7IHdpZHRoIH19PlxuICAgICAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cImFib3V0LWVkaXRvci1jYW1lcmEtcmFpbFwiIGFyaWEtaGlkZGVuPVwidHJ1ZVwiPlxuICAgICAgICAgICAgICAgICAgICAgIHtzZWN0aW9uLmNhbWVyYS5rZXlzLnNsaWNlKDEpLm1hcCgoa2V5LCBrZXlJbmRleCkgPT4ge1xuICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgZnJvbUtleSA9IHNlY3Rpb24uY2FtZXJhLmtleXNba2V5SW5kZXhdO1xuICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgbGVmdCA9IGxvY2FsUGVyY2VudChmcm9tS2V5LmF0KTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IHJpZ2h0ID0gbG9jYWxQZXJjZW50KGtleS5hdCk7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gKFxuICAgICAgICAgICAgICAgICAgICAgICAgICA8c3BhblxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNsYXNzTmFtZT17Y2FtZXJhUG9zZUNoYW5nZXMoZnJvbUtleSwga2V5KSA/ICdpcy1hdXRob3JlZC1tb3Rpb24nIDogJ2lzLWJhc2UtZG9sbHknfVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGtleT17YCR7c2VjdGlvbi5pZH06Y2FtZXJhLXNwYW46JHtrZXlJbmRleH1gfVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHN0eWxlPXt7IGxlZnQ6IGAke2xlZnR9JWAsIHdpZHRoOiBgJHtNYXRoLm1heCgwLjUsIHJpZ2h0IC0gbGVmdCl9JWAgfX1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgLz5cbiAgICAgICAgICAgICAgICAgICAgICAgICk7XG4gICAgICAgICAgICAgICAgICAgICAgfSl9XG4gICAgICAgICAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgICAgICAgICB7c2VjdGlvbi5jYW1lcmEua2V5cy5tYXAoKGtleSwga2V5SW5kZXgpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgICBjb25zdCB0aW1pbmdCb3VuZHMgPSBnZXRBYm91dE5hcnJhdGl2ZUNhbWVyYUtleVRpbWluZ0JvdW5kcyhzZWN0aW9uLmNhbWVyYS5rZXlzLCBrZXlJbmRleCk7XG4gICAgICAgICAgICAgICAgICAgICAgY29uc3QgdG9rZW4gPSBgY2FtZXJhOiR7c2VjdGlvbi5pZH06JHtrZXlJbmRleH1gO1xuICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IGtleVNlbGVjdGlvbiA9IHsgdHlwZTogJ2NhbWVyYS1rZXknLCBzZWN0aW9uSWQ6IHNlY3Rpb24uaWQsIGtleUluZGV4IH07XG4gICAgICAgICAgICAgICAgICAgICAgY29uc3QgaXNTZWxlY3RlZCA9IGluU2VsZWN0ZWRTZWN0aW9uICYmIHNlbGVjdGlvbi50eXBlID09PSAnY2FtZXJhLWtleScgJiYgc2VsZWN0aW9uLmtleUluZGV4ID09PSBrZXlJbmRleDtcbiAgICAgICAgICAgICAgICAgICAgICBjb25zdCByZXF1aXJlZCA9IHRpbWluZ0JvdW5kcy5sb2NrZWQ7XG4gICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIChcbiAgICAgICAgICAgICAgICAgICAgICAgIDxidXR0b25cbiAgICAgICAgICAgICAgICAgICAgICAgICAgdHlwZT1cImJ1dHRvblwiXG4gICAgICAgICAgICAgICAgICAgICAgICAgIGtleT17dG9rZW59XG4gICAgICAgICAgICAgICAgICAgICAgICAgIGNsYXNzTmFtZT17YGFib3V0LWVkaXRvci1rZXkke3JlcXVpcmVkID8gJyBpcy1ib3VuZGFyeScgOiAnIGlzLWRyYWdnYWJsZSd9JHtpc1NlbGVjdGVkID8gJyBpcy1zZWxlY3RlZCcgOiAnJ30ke2NhbWVyYURyYWdQcmV2aWV3Py50b2tlbiA9PT0gdG9rZW4gPyAnIGlzLWRyYWctc291cmNlJyA6ICcnfWB9XG4gICAgICAgICAgICAgICAgICAgICAgICAgIHN0eWxlPXt7IGxlZnQ6IGxvY2FsUG9zaXRpb24oa2V5LmF0KSB9fVxuICAgICAgICAgICAgICAgICAgICAgICAgICB0aXRsZT17cmVxdWlyZWRcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICA/IGBQcm90ZWN0ZWQgQ2FtZXJhIGtleSBhdCAke2Zvcm1hdENhbWVyYVBlcmNlbnQoa2V5LmF0KX0gwrcgc2VsZWN0IHRvIGluc3BlY3RgXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgOiBgQ2FtZXJhIGtleSBhdCAke2Zvcm1hdENhbWVyYVBlcmNlbnQoa2V5LmF0KX0gwrcgZHJhZyBhbnl3aGVyZSBvbiB0aGUgQ2FtZXJhIHRyYWNrYH1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgYXJpYS1sYWJlbD17YCR7cmVxdWlyZWQgPyAnUHJvdGVjdGVkICcgOiAnJ31DYW1lcmEga2V5IGF0ICR7Zm9ybWF0Q2FtZXJhUGVyY2VudChrZXkuYXQpfSB0aHJvdWdoICR7c2VjdGlvbi5sYWJlbH1gfVxuICAgICAgICAgICAgICAgICAgICAgICAgICBhcmlhLXByZXNzZWQ9e2lzU2VsZWN0ZWR9XG4gICAgICAgICAgICAgICAgICAgICAgICAgIG9uUG9pbnRlckRvd249e3JlcXVpcmVkID8gdW5kZWZpbmVkIDogKGV2ZW50KSA9PiBiZWdpblRpbWluZ0RyYWcoZXZlbnQsIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0eXBlOiAnY2FtZXJhJyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0b2tlbixcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBsb2NrZWQ6IGZhbHNlLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGF0OiBrZXkuYXQsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgc2VjdGlvbkluZGV4LFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGtleUluZGV4LFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHNlY3Rpb25TdGFydFdVOiBzdGFydFdVLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHNwYW5XVSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0cmF2ZWxXVTogY29tcGlsZWQ/LnRyYXZlbFdVIHx8IHNwYW5XVSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBzdG9yeVdVOiBzdGFydFdVICsgKE51bWJlcihrZXkuYXQpICogKGNvbXBpbGVkPy50cmF2ZWxXVSB8fCAwKSksXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgc2VsZWN0aW9uOiBrZXlTZWxlY3Rpb24sXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY29hbGVzY2VLZXk6IGB0aW1lbGluZToke3Rva2VufWAsXG4gICAgICAgICAgICAgICAgICAgICAgICAgIH0pfVxuICAgICAgICAgICAgICAgICAgICAgICAgICBvblBvaW50ZXJNb3ZlPXtyZXF1aXJlZCA/IHVuZGVmaW5lZCA6IG1vdmVUaW1pbmdEcmFnfVxuICAgICAgICAgICAgICAgICAgICAgICAgICBvblBvaW50ZXJVcD17cmVxdWlyZWQgPyB1bmRlZmluZWQgOiBlbmRUaW1pbmdEcmFnfVxuICAgICAgICAgICAgICAgICAgICAgICAgICBvblBvaW50ZXJDYW5jZWw9e3JlcXVpcmVkID8gdW5kZWZpbmVkIDogZW5kVGltaW5nRHJhZ31cbiAgICAgICAgICAgICAgICAgICAgICAgICAgb25DbGljaz17KCkgPT4gaGFuZGxlVGltaW5nQ2xpY2sodG9rZW4sICgpID0+IHNlbGVjdEF0KHsgdHlwZTogJ2NhbWVyYS1rZXknLCBrZXlJbmRleCB9LCBrZXkuYXQpKX1cbiAgICAgICAgICAgICAgICAgICAgICAgIC8+XG4gICAgICAgICAgICAgICAgICAgICAgKTtcbiAgICAgICAgICAgICAgICAgICAgfSl9XG4gICAgICAgICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgICAgICApO1xuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgIGlmIChsYW5lID09PSAnd29ybGQnKSB7XG4gICAgICAgICAgICAgICAgY29uc3QgaXNTZWxlY3RlZCA9IGluU2VsZWN0ZWRTZWN0aW9uICYmIHNlbGVjdGlvbi50eXBlID09PSAnd29ybGQnO1xuICAgICAgICAgICAgICAgIGNvbnN0IHRyYW5zaXRpb24gPSBzZWN0aW9uLndvcmxkLm1vZGUgPT09ICdzZXQnICYmIHNlY3Rpb24ud29ybGQudHJhbnNpdGlvbkluLnR5cGUgIT09ICdjdXQnXG4gICAgICAgICAgICAgICAgICA/IHNlY3Rpb24ud29ybGQudHJhbnNpdGlvbkluXG4gICAgICAgICAgICAgICAgICA6IG51bGw7XG4gICAgICAgICAgICAgICAgcmV0dXJuIChcbiAgICAgICAgICAgICAgICAgIDxkaXYgY2xhc3NOYW1lPXtgYWJvdXQtZWRpdG9yLWNsaXAke2lzU2VsZWN0ZWQgPyAnIGlzLXNlbGVjdGVkJyA6ICcnfWB9IGtleT17c2VjdGlvbi5pZH0gc3R5bGU9e3sgd2lkdGggfX0+XG4gICAgICAgICAgICAgICAgICAgIDxidXR0b25cbiAgICAgICAgICAgICAgICAgICAgICB0eXBlPVwiYnV0dG9uXCJcbiAgICAgICAgICAgICAgICAgICAgICBjbGFzc05hbWU9e2BhYm91dC1lZGl0b3Itd29ybGQtY2xpcCAke3NlY3Rpb24ud29ybGQubW9kZSA9PT0gJ3NldCcgPyAnaGFzLXdvcmxkJyA6ICcnfSR7aXNTZWxlY3RlZCA/ICcgaXMtc2VsZWN0ZWQnIDogJyd9YH1cbiAgICAgICAgICAgICAgICAgICAgICBhcmlhLXByZXNzZWQ9e2lzU2VsZWN0ZWR9XG4gICAgICAgICAgICAgICAgICAgICAgb25DbGljaz17KCkgPT4gc2VsZWN0QXQoeyB0eXBlOiAnd29ybGQnIH0sIHRyYW5zaXRpb24gPyB0cmFuc2l0aW9uLmVuZCA6IDApfVxuICAgICAgICAgICAgICAgICAgICA+e3NlY3Rpb24ud29ybGQubW9kZSA9PT0gJ3NldCcgPyBzZWN0aW9uLndvcmxkLnNoYXBlSWQucmVwbGFjZSgnLXYxJywgJycpIDogJ2NvbnRpbnVlJ308L2J1dHRvbj5cbiAgICAgICAgICAgICAgICAgICAge3RyYW5zaXRpb24gPyBbJ3N0YXJ0JywgJ2VuZCddLm1hcCgocGFydCkgPT4gKFxuICAgICAgICAgICAgICAgICAgICAgIDxidXR0b25cbiAgICAgICAgICAgICAgICAgICAgICAgIHR5cGU9XCJidXR0b25cIlxuICAgICAgICAgICAgICAgICAgICAgICAga2V5PXtwYXJ0fVxuICAgICAgICAgICAgICAgICAgICAgICAgY2xhc3NOYW1lPXtgYWJvdXQtZWRpdG9yLXRpbWluZy1rZXkgaXMtd29ybGQke2lzU2VsZWN0ZWQgJiYgc2VsZWN0aW9uLmtleVBhcnQgPT09IGB0cmFuc2l0aW9uLSR7cGFydH1gID8gJyBpcy1zZWxlY3RlZCcgOiAnJ31gfVxuICAgICAgICAgICAgICAgICAgICAgICAgc3R5bGU9e3sgbGVmdDogZXh0ZW5kZWRMb2NhbFBvc2l0aW9uKHRyYW5zaXRpb25bcGFydF0pIH19XG4gICAgICAgICAgICAgICAgICAgICAgICB0aXRsZT17YFdvcmxkIHRyYW5zaXRpb24gJHtwYXJ0fWB9XG4gICAgICAgICAgICAgICAgICAgICAgICBhcmlhLWxhYmVsPXtgJHtzZWN0aW9uLmxhYmVsfSBXb3JsZCB0cmFuc2l0aW9uICR7cGFydH1gfVxuICAgICAgICAgICAgICAgICAgICAgICAgb25DbGljaz17KCkgPT4gc2VsZWN0QXQoeyB0eXBlOiAnd29ybGQnLCBrZXlQYXJ0OiBgdHJhbnNpdGlvbi0ke3BhcnR9YCB9LCB0cmFuc2l0aW9uW3BhcnRdKX1cbiAgICAgICAgICAgICAgICAgICAgICAvPlxuICAgICAgICAgICAgICAgICAgICApKSA6IG51bGx9XG4gICAgICAgICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgICAgICApO1xuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgIGlmIChsYW5lID09PSAndGV4dCcpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gKFxuICAgICAgICAgICAgICAgICAgPGRpdlxuICAgICAgICAgICAgICAgICAgICBjbGFzc05hbWU9e2BhYm91dC1lZGl0b3ItY2xpcCR7c2VjdGlvbi50ZXh0LmRpc2NpcGxpbmVSZXZlYWwgPyAnIGhhcy1leHRlbmRlZC1kaXNjaXBsaW5lJyA6ICcnfWB9XG4gICAgICAgICAgICAgICAgICAgIGtleT17c2VjdGlvbi5pZH1cbiAgICAgICAgICAgICAgICAgICAgc3R5bGU9e3sgd2lkdGggfX1cbiAgICAgICAgICAgICAgICAgICAgb25Qb2ludGVyRG93bj17YmVnaW5NYXJxdWVlfVxuICAgICAgICAgICAgICAgICAgICBvblBvaW50ZXJNb3ZlPXttb3ZlTWFycXVlZX1cbiAgICAgICAgICAgICAgICAgICAgb25Qb2ludGVyVXA9e2VuZE1hcnF1ZWV9XG4gICAgICAgICAgICAgICAgICAgIG9uUG9pbnRlckNhbmNlbD17ZW5kTWFycXVlZX1cbiAgICAgICAgICAgICAgICAgID5cbiAgICAgICAgICAgICAgICAgICAgeyhzZWN0aW9uLnRleHQuY3VlcyB8fCBbXSkubWFwKChjdWUpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgICBjb25zdCBpc1NlbGVjdGVkID0gc2VsZWN0ZWRDdWVNZW1iZXJzLnNvbWUoKG1lbWJlcikgPT4gbWVtYmVyLnNlY3Rpb25JZCA9PT0gc2VjdGlvbi5pZCAmJiBtZW1iZXIuY3VlSWQgPT09IGN1ZS5pZCk7XG4gICAgICAgICAgICAgICAgICAgICAgY29uc3QgaXNQcmltYXJ5ID0gc2VsZWN0aW9uLnR5cGUgPT09ICdjdWUnICYmIHNlbGVjdGlvbi5zZWN0aW9uSWQgPT09IHNlY3Rpb24uaWQgJiYgc2VsZWN0aW9uLmN1ZUlkID09PSBjdWUuaWQ7XG4gICAgICAgICAgICAgICAgICAgICAgY29uc3QgbW92ZW1lbnQgPSBnZXRBYm91dE5hcnJhdGl2ZUN1ZU1vdmVtZW50KGN1ZSk7XG4gICAgICAgICAgICAgICAgICAgICAgY29uc3QgdGltaW5nQm91bmRzID0gZ2V0QWJvdXROYXJyYXRpdmVDdWVUaW1pbmdCb3VuZHMoY3VlKTtcbiAgICAgICAgICAgICAgICAgICAgICBjb25zdCB0b2tlbiA9IGBjdWU6JHtzZWN0aW9uLmlkfToke2N1ZS5pZH1gO1xuICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IGN1ZVNlbGVjdGlvbiA9IHsgdHlwZTogJ2N1ZScsIHNlY3Rpb25JZDogc2VjdGlvbi5pZCwgY3VlSWQ6IGN1ZS5pZCwga2V5UGFydDogJ2ZvY3VzJyB9O1xuICAgICAgICAgICAgICAgICAgICAgIHJldHVybiAoXG4gICAgICAgICAgICAgICAgICAgICAgICA8YnV0dG9uXG4gICAgICAgICAgICAgICAgICAgICAgICAgIHR5cGU9XCJidXR0b25cIlxuICAgICAgICAgICAgICAgICAgICAgICAgICBjbGFzc05hbWU9e2BhYm91dC1lZGl0b3ItY3VlIGlzLSR7bW92ZW1lbnR9JHt0aW1pbmdCb3VuZHMubWluID09PSB0aW1pbmdCb3VuZHMubWF4ID8gJyBpcy1ib3VuZGFyeScgOiAnIGlzLWRyYWdnYWJsZSd9JHtpc1NlbGVjdGVkID8gJyBpcy1zZWxlY3RlZCcgOiAnJ30ke2lzUHJpbWFyeSA/ICcgaXMtcHJpbWFyeS1zZWxlY3Rpb24nIDogJyd9YH1cbiAgICAgICAgICAgICAgICAgICAgICAgICAga2V5PXtjdWUuaWR9XG4gICAgICAgICAgICAgICAgICAgICAgICAgIGRhdGEtc2VjdGlvbi1pZD17c2VjdGlvbi5pZH1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgZGF0YS1jdWUtaWQ9e2N1ZS5pZH1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgc3R5bGU9e3sgbGVmdDogdGV4dFBvc2l0aW9uKGN1ZS5ob2xkKSB9fVxuICAgICAgICAgICAgICAgICAgICAgICAgICBhcmlhLWxhYmVsPXtgJHttb3ZlbWVudCA9PT0gJ3ZlcnRpY2FsJyA/ICdWZXJ0aWNhbCcgOiAnU3BhdGlhbCd9IHRleHQgYXQgJHtNYXRoLnJvdW5kKGN1ZS5ob2xkICogMTAwKX0lIMK3ICR7Y3VlLnRleHR9YH1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgYXJpYS1wcmVzc2VkPXtpc1NlbGVjdGVkfVxuICAgICAgICAgICAgICAgICAgICAgICAgICB0aXRsZT17YCR7bW92ZW1lbnQgPT09ICd2ZXJ0aWNhbCcgPyAnVmVydGljYWwnIDogJ1NwYXRpYWwnfSB0aXRsZSDCtyBkcmFnIHRvIG1vdmUgaXQ7IGR1cmF0aW9uIHN0YXlzIGdsb2JhbCDCtyAke2N1ZS50ZXh0fWB9XG4gICAgICAgICAgICAgICAgICAgICAgICAgIG9uUG9pbnRlckRvd249eyhldmVudCkgPT4gYmVnaW5UaW1pbmdEcmFnKGV2ZW50LCB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdHlwZTogJ2N1ZScsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdG9rZW4sXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgbG9ja2VkOiB0aW1pbmdCb3VuZHMubWluID09PSB0aW1pbmdCb3VuZHMubWF4LFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIG1pbjogdGltaW5nQm91bmRzLm1pbixcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBtYXg6IHRpbWluZ0JvdW5kcy5tYXgsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgYXQ6IGN1ZS5ob2xkLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHNlY3Rpb25JbmRleCxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjdWVJZDogY3VlLmlkLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHNlY3Rpb25TdGFydFdVOiBzdGFydFdVLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHNwYW5XVSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0cmF2ZWxXVTogY29tcGlsZWQ/LnRyYXZlbFdVIHx8IHNwYW5XVSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBzdG9yeVdVOiBzdGFydFdVICsgKE51bWJlcihjdWUuaG9sZCkgKiAoY29tcGlsZWQ/LnRyYXZlbFdVIHx8IDApKSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBzZWxlY3Rpb246IGN1ZVNlbGVjdGlvbixcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb2FsZXNjZUtleTogYHRpbWVsaW5lOiR7dG9rZW59YCxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgfSl9XG4gICAgICAgICAgICAgICAgICAgICAgICAgIG9uUG9pbnRlck1vdmU9e21vdmVUaW1pbmdEcmFnfVxuICAgICAgICAgICAgICAgICAgICAgICAgICBvblBvaW50ZXJVcD17ZW5kVGltaW5nRHJhZ31cbiAgICAgICAgICAgICAgICAgICAgICAgICAgb25Qb2ludGVyQ2FuY2VsPXtlbmRUaW1pbmdEcmFnfVxuICAgICAgICAgICAgICAgICAgICAgICAgICBvbktleURvd249eyhldmVudCkgPT4ge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChldmVudC5zaGlmdEtleSAmJiBldmVudC5jb2RlID09PSAnU3BhY2UnKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICBldmVudC5wcmV2ZW50RGVmYXVsdCgpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgbmV4dFNlbGVjdGlvbiA9IHRvZ2dsZUFib3V0TmFycmF0aXZlQ3VlU2VsZWN0aW9uKHN0b3JlLmdldFNuYXBzaG90KCkuc2VsZWN0aW9uLCBjdWVTZWxlY3Rpb24pO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgc3RvcmUuc2V0U2VsZWN0aW9uKG5leHRTZWxlY3Rpb24pO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgc3RvcmUuc2V0VHJhbnNwb3J0KHsgb3duZXI6ICd0aW1lbGluZScsIHBsYXlpbmc6IGZhbHNlLCBzdG9yeVdVOiBzdGFydFdVICsgKE51bWJlcihjdWUuaG9sZCkgKiAoY29tcGlsZWQ/LnRyYXZlbFdVIHx8IDApKSB9KTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICAgIH19XG4gICAgICAgICAgICAgICAgICAgICAgICAgIG9uQ2xpY2s9eygpID0+IGhhbmRsZVRpbWluZ0NsaWNrKHRva2VuLCAoKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgc3RvcmUuc2V0VHJhbnNwb3J0KHsgb3duZXI6ICd0aW1lbGluZScsIHBsYXlpbmc6IGZhbHNlLCBzdG9yeVdVOiBzdGFydFdVICsgKE51bWJlcihjdWUuaG9sZCkgKiAoY29tcGlsZWQ/LnRyYXZlbFdVIHx8IDApKSB9KTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgfSl9XG4gICAgICAgICAgICAgICAgICAgICAgICAvPlxuICAgICAgICAgICAgICAgICAgICAgICk7XG4gICAgICAgICAgICAgICAgICAgIH0pfVxuICAgICAgICAgICAgICAgICAgICB7c2VjdGlvbi50ZXh0LmRpc2NpcGxpbmVSZXZlYWwgPyAoKCkgPT4ge1xuICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IHJldmVhbCA9IHNlY3Rpb24udGV4dC5kaXNjaXBsaW5lUmV2ZWFsO1xuICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IGR1cmF0aW9uID0gcmV2ZWFsLmVuZCAtIHJldmVhbC5zdGFydDtcbiAgICAgICAgICAgICAgICAgICAgICBjb25zdCBjZW50cmUgPSByZXZlYWwuc3RhcnQgKyAoZHVyYXRpb24gKiAwLjUpO1xuICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IGlzU2VsZWN0ZWQgPSBpblNlbGVjdGVkU2VjdGlvbiAmJiBzZWxlY3Rpb24udHlwZSA9PT0gJ2Rpc2NpcGxpbmUtcmV2ZWFsJztcbiAgICAgICAgICAgICAgICAgICAgICBjb25zdCB0b2tlbiA9IGBkaXNjaXBsaW5lLXJldmVhbDoke3NlY3Rpb24uaWR9OiR7cmV2ZWFsLmlkfWA7XG4gICAgICAgICAgICAgICAgICAgICAgY29uc3QgcmV2ZWFsU2VsZWN0aW9uID0geyB0eXBlOiAnZGlzY2lwbGluZS1yZXZlYWwnLCBzZWN0aW9uSWQ6IHNlY3Rpb24uaWQgfTtcbiAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gKFxuICAgICAgICAgICAgICAgICAgICAgICAgPGJ1dHRvblxuICAgICAgICAgICAgICAgICAgICAgICAgICB0eXBlPVwiYnV0dG9uXCJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgY2xhc3NOYW1lPXtgYWJvdXQtZWRpdG9yLWRpc2NpcGxpbmUtcmV2ZWFsIGlzLWRyYWdnYWJsZSR7aXNTZWxlY3RlZCA/ICcgaXMtc2VsZWN0ZWQnIDogJyd9YH1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgc3R5bGU9e3sgbGVmdDogZXh0ZW5kZWRMb2NhbFBvc2l0aW9uKHJldmVhbC5zdGFydCksIHdpZHRoOiBleHRlbmRlZExvY2FsV2lkdGgocmV2ZWFsLnN0YXJ0LCByZXZlYWwuZW5kKSB9fVxuICAgICAgICAgICAgICAgICAgICAgICAgICBhcmlhLWxhYmVsPXtgRGlzY2lwbGluZSByZXZlYWwgZnJvbSAke01hdGgucm91bmQocmV2ZWFsLnN0YXJ0ICogMTAwKX0lIHRvICR7TWF0aC5yb3VuZChyZXZlYWwuZW5kICogMTAwKX0lYH1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgYXJpYS1wcmVzc2VkPXtpc1NlbGVjdGVkfVxuICAgICAgICAgICAgICAgICAgICAgICAgICB0aXRsZT1cIkRpc2NpcGxpbmUgcmV2ZWFsIMK3IGRyYWcgdGhlIGNvbXBsZXRlIGNsaXAgdG8gcmV0aW1lXCJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgb25Qb2ludGVyRG93bj17KGV2ZW50KSA9PiBiZWdpblRpbWluZ0RyYWcoZXZlbnQsIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0eXBlOiAnZGlzY2lwbGluZS1yZXZlYWwnLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRva2VuLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGxvY2tlZDogZmFsc2UsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgbWluOiBkdXJhdGlvbiAqIDAuNSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBtYXg6IERJU0NJUExJTkVfUkVWRUFMX01BWCAtIChkdXJhdGlvbiAqIDAuNSksXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgYXQ6IGNlbnRyZSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBzZWN0aW9uSW5kZXgsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgc2VjdGlvblN0YXJ0V1U6IHN0YXJ0V1UsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgc3BhbldVLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRyYXZlbFdVOiBjb21waWxlZD8udHJhdmVsV1UgfHwgc3BhbldVLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHN0b3J5V1U6IHN0YXJ0V1UgKyAoY2VudHJlICogKGNvbXBpbGVkPy50cmF2ZWxXVSB8fCAwKSksXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgc2VsZWN0aW9uOiByZXZlYWxTZWxlY3Rpb24sXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY29hbGVzY2VLZXk6IGB0aW1lbGluZToke3Rva2VufWAsXG4gICAgICAgICAgICAgICAgICAgICAgICAgIH0pfVxuICAgICAgICAgICAgICAgICAgICAgICAgICBvblBvaW50ZXJNb3ZlPXttb3ZlVGltaW5nRHJhZ31cbiAgICAgICAgICAgICAgICAgICAgICAgICAgb25Qb2ludGVyVXA9e2VuZFRpbWluZ0RyYWd9XG4gICAgICAgICAgICAgICAgICAgICAgICAgIG9uUG9pbnRlckNhbmNlbD17ZW5kVGltaW5nRHJhZ31cbiAgICAgICAgICAgICAgICAgICAgICAgICAgb25DbGljaz17KCkgPT4gaGFuZGxlVGltaW5nQ2xpY2sodG9rZW4sICgpID0+IHNlbGVjdEF0KHsgdHlwZTogJ2Rpc2NpcGxpbmUtcmV2ZWFsJyB9LCByZXZlYWwuc3RhcnQpKX1cbiAgICAgICAgICAgICAgICAgICAgICAgID5EaXNjaXBsaW5lIHJldmVhbDwvYnV0dG9uPlxuICAgICAgICAgICAgICAgICAgICAgICk7XG4gICAgICAgICAgICAgICAgICAgIH0pKCkgOiBudWxsfVxuICAgICAgICAgICAgICAgICAgICB7KHNlY3Rpb24udGV4dC5ibG9ja3MgfHwgW10pLmxlbmd0aCA/IChcbiAgICAgICAgICAgICAgICAgICAgICA8YnV0dG9uIHR5cGU9XCJidXR0b25cIiBjbGFzc05hbWU9e2BhYm91dC1lZGl0b3ItZWRpdG9yaWFsLWNsaXAke2luU2VsZWN0ZWRTZWN0aW9uICYmIHNlbGVjdGlvbi50eXBlID09PSAnc2VjdGlvbicgPyAnIGlzLXNlbGVjdGVkJyA6ICcnfWB9IG9uQ2xpY2s9eygpID0+IHNlbGVjdEF0KHsgdHlwZTogJ3NlY3Rpb24nIH0pfT5cbiAgICAgICAgICAgICAgICAgICAgICAgIFZlcnRpY2FsIMK3IHtzZWN0aW9uLnRleHQuYmxvY2tzLmxlbmd0aH0gYmxvY2tzXG4gICAgICAgICAgICAgICAgICAgICAgPC9idXR0b24+XG4gICAgICAgICAgICAgICAgICAgICkgOiBudWxsfVxuICAgICAgICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgICAgICAgKTtcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICBjb25zdCBpc1NlbGVjdGVkID0gaW5TZWxlY3RlZFNlY3Rpb24gJiYgc2VsZWN0aW9uLnR5cGUgPT09ICdpbnRlcmFjdGlvbic7XG4gICAgICAgICAgICAgIGNvbnN0IGFjdGl2YXRpb24gPSBzZWN0aW9uLmludGVyYWN0aW9uPy50eXBlICE9PSAnbm9uZScgPyBzZWN0aW9uLmludGVyYWN0aW9uLmFjdGl2YXRpb25TdGFydCA6IG51bGw7XG4gICAgICAgICAgICAgIHJldHVybiAoXG4gICAgICAgICAgICAgICAgPGRpdiBjbGFzc05hbWU9e2BhYm91dC1lZGl0b3ItY2xpcCR7aXNTZWxlY3RlZCA/ICcgaXMtc2VsZWN0ZWQnIDogJyd9YH0ga2V5PXtzZWN0aW9uLmlkfSBzdHlsZT17eyB3aWR0aCB9fT5cbiAgICAgICAgICAgICAgICAgIDxidXR0b25cbiAgICAgICAgICAgICAgICAgICAgdHlwZT1cImJ1dHRvblwiXG4gICAgICAgICAgICAgICAgICAgIGNsYXNzTmFtZT17YGFib3V0LWVkaXRvci1pbnRlcmFjdGlvbi1jbGlwICR7c2VjdGlvbi5pbnRlcmFjdGlvbj8udHlwZSAhPT0gJ25vbmUnID8gJ2hhcy1pbnRlcmFjdGlvbicgOiAnJ30ke2lzU2VsZWN0ZWQgPyAnIGlzLXNlbGVjdGVkJyA6ICcnfWB9XG4gICAgICAgICAgICAgICAgICAgIGFyaWEtcHJlc3NlZD17aXNTZWxlY3RlZH1cbiAgICAgICAgICAgICAgICAgICAgb25DbGljaz17KCkgPT4gc2VsZWN0QXQoeyB0eXBlOiAnaW50ZXJhY3Rpb24nIH0sIGFjdGl2YXRpb24gfHwgMCl9XG4gICAgICAgICAgICAgICAgICA+e3NlY3Rpb24uaW50ZXJhY3Rpb24/LnR5cGUgIT09ICdub25lJyA/IHNlY3Rpb24uaW50ZXJhY3Rpb24udHlwZSA6ICcnfTwvYnV0dG9uPlxuICAgICAgICAgICAgICAgICAge051bWJlci5pc0Zpbml0ZShhY3RpdmF0aW9uKSA/IChcbiAgICAgICAgICAgICAgICAgICAgPGJ1dHRvblxuICAgICAgICAgICAgICAgICAgICAgIHR5cGU9XCJidXR0b25cIlxuICAgICAgICAgICAgICAgICAgICAgIGNsYXNzTmFtZT17YGFib3V0LWVkaXRvci10aW1pbmcta2V5IGlzLWludGVyYWN0aW9uJHtpc1NlbGVjdGVkICYmIHNlbGVjdGlvbi5rZXlQYXJ0ID09PSAnYWN0aXZhdGlvbicgPyAnIGlzLXNlbGVjdGVkJyA6ICcnfWB9XG4gICAgICAgICAgICAgICAgICAgICAgc3R5bGU9e3sgbGVmdDogbG9jYWxQb3NpdGlvbihhY3RpdmF0aW9uKSB9fVxuICAgICAgICAgICAgICAgICAgICAgIHRpdGxlPVwiSW50ZXJhY3Rpb24gYWN0aXZhdGlvblwiXG4gICAgICAgICAgICAgICAgICAgICAgYXJpYS1sYWJlbD17YCR7c2VjdGlvbi5sYWJlbH0gaW50ZXJhY3Rpb24gYWN0aXZhdGlvbiBrZXlmcmFtZWB9XG4gICAgICAgICAgICAgICAgICAgICAgb25DbGljaz17KCkgPT4gc2VsZWN0QXQoeyB0eXBlOiAnaW50ZXJhY3Rpb24nLCBrZXlQYXJ0OiAnYWN0aXZhdGlvbicgfSwgYWN0aXZhdGlvbil9XG4gICAgICAgICAgICAgICAgICAgIC8+XG4gICAgICAgICAgICAgICAgICApIDogbnVsbH1cbiAgICAgICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgICAgKTtcbiAgICAgICAgICAgIH0pfVxuICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICkpfVxuICAgICAgICA8L2Rpdj5cbiAgICAgIDwvZGl2PlxuICAgIDwvZGl2PlxuICApO1xufVxuXG5mdW5jdGlvbiBTZXF1ZW5jZUluc3BlY3Rvcih7IHN0b3JlLCBzbmFwc2hvdCB9KSB7XG4gIGNvbnN0IGNvbW1pdEdsb2JhbCA9IChncm91cCwga2V5LCB2YWx1ZSkgPT4gc3RvcmUuY29tbWl0KGBDaGFuZ2UgJHtrZXl9YCwgKGRyYWZ0KSA9PiB7XG4gICAgaWYgKGdyb3VwID09PSAnc2VxdWVuY2UnKSBkcmFmdC5nbG9iYWxzW2tleV0gPSB2YWx1ZTtcbiAgICBlbHNlIHtcbiAgICAgIGNvbnN0IHRhcmdldEtleSA9IGdyb3VwID09PSAnbWF0ZXJpYWwnID8gJ3BvaW50TWF0ZXJpYWwnIDogZ3JvdXA7XG4gICAgICBkcmFmdC5nbG9iYWxzW3RhcmdldEtleV1ba2V5XSA9IHZhbHVlO1xuICAgIH1cbiAgfSwgeyBjb2FsZXNjZUtleTogYGdsb2JhbDoke2dyb3VwfToke2tleX1gIH0pO1xuICByZXR1cm4gKFxuICAgIDw+XG4gICAgICA8aGVhZGVyPjxzcGFuPlNlcXVlbmNlPC9zcGFuPjxzdHJvbmc+R2xvYmFsIGNvbnRyb2xzPC9zdHJvbmc+PC9oZWFkZXI+XG4gICAgICB7QUJPVVRfTkFSUkFUSVZFX0dMT0JBTF9DT05UUk9MUy5tYXAoKGdyb3VwKSA9PiAoXG4gICAgICAgIDxkZXRhaWxzIG9wZW4ga2V5PXtncm91cC5pZH0+XG4gICAgICAgICAgPHN1bW1hcnk+e2dyb3VwLmxhYmVsfTwvc3VtbWFyeT5cbiAgICAgICAgICB7Z3JvdXAuaWQgPT09ICd0ZXh0TW90aW9uJyA/IDxwIGNsYXNzTmFtZT1cImFib3V0LWVkaXRvci1oZWxwXCI+RXZlcnkgdGl0bGUgZm9sbG93cyB0aGlzIHBhdGggY29udGludW91c2x5LiBOZWdhdGl2ZSBZIGlzIGhpZ2hlciwgcG9zaXRpdmUgWSBpcyBsb3dlci4gVGhlIG9wZW5lciBzdGFydHMgc2hhcnAgYXQgaXRzIG93biBZIHBvc2l0aW9uOyBDbGVhciBmcm9tIGFuZCBDbGVhciB1bnRpbCBzZXQgdGhlIHNoYXJwIHdpbmRvdyBmb3IgbGF0ZXIgdGl0bGVzLjwvcD4gOiBudWxsfVxuICAgICAgICAgIHtncm91cC5pZCA9PT0gJ3N3YXJtVHVyYnVsZW5jZScgPyA8cCBjbGFzc05hbWU9XCJhYm91dC1lZGl0b3ItaGVscFwiPk9uZSBhbWJpZW50IG1vdGlvbiBwcm9maWxlIGRyaXZlcyBib3RoIHRoZSBjbHVzdGVyIGFuZCB0dXJidWxlbnQgZmllbGQuIEVhY2ggV29ybGQgb25seSBzY2FsZXMgaXRzIHN0cmVuZ3RoLCBzbyB0aGUgbW90aW9uIHN0YXlzIGNvbnRpbnVvdXMgd2hpbGUgU2hhcGVzIGNoYW5nZS48L3A+IDogbnVsbH1cbiAgICAgICAgICB7Z3JvdXAuY29udHJvbHMubWFwKChjb250cm9sKSA9PiB7XG4gICAgICAgICAgICBjb25zdCB0YXJnZXQgPSBncm91cC5pZCA9PT0gJ3NlcXVlbmNlJ1xuICAgICAgICAgICAgICA/IHNuYXBzaG90LmRvY3VtZW50Lmdsb2JhbHNcbiAgICAgICAgICAgICAgOiBzbmFwc2hvdC5kb2N1bWVudC5nbG9iYWxzW2dyb3VwLmlkID09PSAnbWF0ZXJpYWwnID8gJ3BvaW50TWF0ZXJpYWwnIDogZ3JvdXAuaWRdO1xuICAgICAgICAgICAgcmV0dXJuIChcbiAgICAgICAgICAgICAgPE51bWJlclByb3BlcnR5XG4gICAgICAgICAgICAgICAga2V5PXtjb250cm9sLmlkfVxuICAgICAgICAgICAgICAgIGxhYmVsPXtjb250cm9sLmxhYmVsfVxuICAgICAgICAgICAgICAgIHZhbHVlPXt0YXJnZXRbY29udHJvbC5pZF19XG4gICAgICAgICAgICAgICAgbWluPXtjb250cm9sLm1pbn1cbiAgICAgICAgICAgICAgICBtYXg9e2NvbnRyb2wubWF4fVxuICAgICAgICAgICAgICAgIHN0ZXA9e2NvbnRyb2wuc3RlcH1cbiAgICAgICAgICAgICAgICB1bml0PXtjb250cm9sLnVuaXR9XG4gICAgICAgICAgICAgICAgb25DaGFuZ2U9eyh2YWx1ZSkgPT4gY29tbWl0R2xvYmFsKGdyb3VwLmlkLCBjb250cm9sLmlkLCB2YWx1ZSl9XG4gICAgICAgICAgICAgIC8+XG4gICAgICAgICAgICApO1xuICAgICAgICAgIH0pfVxuICAgICAgICA8L2RldGFpbHM+XG4gICAgICApKX1cbiAgICA8Lz5cbiAgKTtcbn1cblxuZnVuY3Rpb24gU2VjdGlvbkluc3BlY3Rvcih7IHN0b3JlLCBzbmFwc2hvdCwgc2VjdGlvbiB9KSB7XG4gIGNvbnN0IHNlY3Rpb25JbmRleCA9IGdldFNlY3Rpb25JbmRleChzbmFwc2hvdC5kb2N1bWVudCwgc2VjdGlvbi5pZCk7XG4gIGNvbnN0IGNvbXBpbGVkU2VjdGlvbiA9IHNuYXBzaG90LmNvbXBpbGVkUGxhbj8uc2VjdGlvbnM/LltzZWN0aW9uSW5kZXhdO1xuICBjb25zdCBhY3RpdmVFeHRlbnRGaWVsZCA9IHNuYXBzaG90LnByZXZpZXdQcm9maWxlID09PSAnbW9iaWxlJyA/ICdtb2JpbGVFeHRlbnRXVScgOiAnZXh0ZW50V1UnO1xuICBjb25zdCBhY3RpdmVFeHRlbnQgPSBOdW1iZXIoc2VjdGlvblthY3RpdmVFeHRlbnRGaWVsZF0pO1xuICBjb25zdCByZXNvbHZlZEV4dGVudCA9IE51bWJlcihjb21waWxlZFNlY3Rpb24/LnJlc29sdmVkRXh0ZW50V1UgPz8gYWN0aXZlRXh0ZW50KTtcbiAgY29uc3QgY29udGVudE1pbmltdW1BY3RpdmUgPSByZXNvbHZlZEV4dGVudCA+IGFjdGl2ZUV4dGVudCArIDAuMDAxO1xuICBjb25zdCBiYXNlbGluZVNlY3Rpb24gPSBzbmFwc2hvdC5iYXNlbGluZURvY3VtZW50LnNlY3Rpb25zLmZpbmQoKGl0ZW0pID0+IGl0ZW0uaWQgPT09IHNlY3Rpb24uaWQpO1xuICBjb25zdCB1cGRhdGUgPSAobGFiZWwsIG11dGF0ZSwgY29hbGVzY2VLZXkgPSBudWxsKSA9PiBzdG9yZS5jb21taXQobGFiZWwsIChkcmFmdCkgPT4ge1xuICAgIG11dGF0ZShkcmFmdC5zZWN0aW9uc1tzZWN0aW9uSW5kZXhdKTtcbiAgfSwgeyBjb2FsZXNjZUtleSwgc2VsZWN0aW9uOiBzbmFwc2hvdC5zZWxlY3Rpb24gfSk7XG4gIGNvbnN0IG1vdmUgPSAoZGlyZWN0aW9uKSA9PiBzdG9yZS5jb21taXQoJ1Jlb3JkZXIgU2VjdGlvbicsIChkcmFmdCkgPT4ge1xuICAgIGNvbnN0IHRvSW5kZXggPSBzZWN0aW9uSW5kZXggKyBkaXJlY3Rpb247XG4gICAgaWYgKHRvSW5kZXggPCAwIHx8IHRvSW5kZXggPj0gZHJhZnQuc2VjdGlvbnMubGVuZ3RoKSByZXR1cm47XG4gICAgY29uc3QgW21vdmVkXSA9IGRyYWZ0LnNlY3Rpb25zLnNwbGljZShzZWN0aW9uSW5kZXgsIDEpO1xuICAgIGRyYWZ0LnNlY3Rpb25zLnNwbGljZSh0b0luZGV4LCAwLCBtb3ZlZCk7XG4gICAgc3RpdGNoQ2FtZXJhQm91bmRhcmllcyhkcmFmdCk7XG4gIH0sIHsgc2VsZWN0aW9uOiB7IHR5cGU6ICdzZWN0aW9uJywgc2VjdGlvbklkOiBzZWN0aW9uLmlkIH0gfSk7XG5cbiAgcmV0dXJuIChcbiAgICA8PlxuICAgICAgPGhlYWRlcj48c3Bhbj5TZWN0aW9uIHtTdHJpbmcoc2VjdGlvbkluZGV4ICsgMSkucGFkU3RhcnQoMiwgJzAnKX08L3NwYW4+PHN0cm9uZz57c2VjdGlvbi5sYWJlbH08L3N0cm9uZz48L2hlYWRlcj5cbiAgICAgIHtzZWN0aW9uLmxvY2tlZCA/IDxkaXYgY2xhc3NOYW1lPVwiYWJvdXQtZWRpdG9yLWxvY2tcIj48TG9ja0tleWhvbGUgYXJpYS1oaWRkZW49XCJ0cnVlXCIgLz48c3Bhbj5UaGlzIHByb3RlY3RlZCBTZWN0aW9uIGNhbm5vdCBiZSByZW9yZGVyZWQgb3IgaGF2ZSBpdHMgV29ybGQgcmVwbGFjZWQgYWNjaWRlbnRhbGx5Ljwvc3Bhbj48YnV0dG9uIHR5cGU9XCJidXR0b25cIiBvbkNsaWNrPXsoKSA9PiB1cGRhdGUoJ1VubG9jayBwcm90ZWN0ZWQgU2VjdGlvbicsIChkcmFmdCkgPT4geyBkcmFmdC5sb2NrZWQgPSBmYWxzZTsgfSl9PlVubG9jayBhZHZhbmNlZDwvYnV0dG9uPjwvZGl2PiA6IG51bGx9XG4gICAgICA8ZGl2IGNsYXNzTmFtZT1cImFib3V0LWVkaXRvci1pbmxpbmUtYWN0aW9uc1wiPlxuICAgICAgICA8YnV0dG9uIHR5cGU9XCJidXR0b25cIiBkaXNhYmxlZD17c2VjdGlvbi5sb2NrZWQgfHwgc2VjdGlvbkluZGV4ID09PSAwfSBvbkNsaWNrPXsoKSA9PiBtb3ZlKC0xKX0+TW92ZSBlYXJsaWVyPC9idXR0b24+XG4gICAgICAgIDxidXR0b24gdHlwZT1cImJ1dHRvblwiIGRpc2FibGVkPXtzZWN0aW9uLmxvY2tlZCB8fCBzZWN0aW9uSW5kZXggPT09IHNuYXBzaG90LmRvY3VtZW50LnNlY3Rpb25zLmxlbmd0aCAtIDF9IG9uQ2xpY2s9eygpID0+IG1vdmUoMSl9Pk1vdmUgbGF0ZXI8L2J1dHRvbj5cbiAgICAgIDwvZGl2PlxuICAgICAgPFByb3BlcnR5IGxhYmVsPVwiU2VjdGlvbiBuYW1lXCI+PGlucHV0IHZhbHVlPXtzZWN0aW9uLmxhYmVsfSBvbkNoYW5nZT17KGV2ZW50KSA9PiB1cGRhdGUoJ1JlbmFtZSBTZWN0aW9uJywgKGRyYWZ0KSA9PiB7IGRyYWZ0LmxhYmVsID0gZXZlbnQudGFyZ2V0LnZhbHVlOyB9LCBgc2VjdGlvbjoke3NlY3Rpb24uaWR9OmxhYmVsYCl9IC8+PC9Qcm9wZXJ0eT5cbiAgICAgIDxQcm9wZXJ0eSBsYWJlbD1cIlN0YWJsZSBJRFwiPjxpbnB1dCB2YWx1ZT17c2VjdGlvbi5pZH0gcmVhZE9ubHkgLz48c21hbGw+UmVmZXJlbmNlcyB0aGlzIFNlY3Rpb24gd2l0aG91dCB0eWluZyBpdCB0byBpdHMgY3VycmVudCBtZWFuaW5nLjwvc21hbGw+PC9Qcm9wZXJ0eT5cbiAgICAgIDxQcm9wZXJ0eSBsYWJlbD1cIlR5cGVcIj5cbiAgICAgICAgPHNlbGVjdCB2YWx1ZT17c2VjdGlvbi50eXBlfSBkaXNhYmxlZD17c2VjdGlvbi50eXBlID09PSAnZmluYWxlJ30gb25DaGFuZ2U9eyhldmVudCkgPT4gdXBkYXRlKCdDaGFuZ2UgU2VjdGlvbiB0eXBlJywgKGRyYWZ0KSA9PiB7IGRyYWZ0LnR5cGUgPSBldmVudC50YXJnZXQudmFsdWU7IH0pfT5cbiAgICAgICAgICA8b3B0aW9uIHZhbHVlPVwic3BhdGlhbFwiPlNwYXRpYWw8L29wdGlvbj48b3B0aW9uIHZhbHVlPVwiZWRpdG9yaWFsXCI+RWRpdG9yaWFsPC9vcHRpb24+PG9wdGlvbiB2YWx1ZT1cImZpbmFsZVwiPkZpbmFsZTwvb3B0aW9uPlxuICAgICAgICA8L3NlbGVjdD5cbiAgICAgIDwvUHJvcGVydHk+XG4gICAgICA8ZGV0YWlscyBvcGVuPlxuICAgICAgICA8c3VtbWFyeT5TZWN0aW9uIHRpbWluZzwvc3VtbWFyeT5cbiAgICAgICAgPFByb3BlcnR5IGxhYmVsPVwiU2Nyb2xsIHRyYXZlbFwiPjxvdXRwdXQgY2xhc3NOYW1lPVwiYWJvdXQtZWRpdG9yLXJlYWRvdXRcIj57Zm9ybWF0V1UoTWF0aC5tYXgoMCwgYWN0aXZlRXh0ZW50IC0gMSkpfTwvb3V0cHV0PjwvUHJvcGVydHk+XG4gICAgICAgIDxQcm9wZXJ0eSBsYWJlbD1cIlRvdGFsIGhlaWdodFwiPjxvdXRwdXQgY2xhc3NOYW1lPVwiYWJvdXQtZWRpdG9yLXJlYWRvdXRcIj57Zm9ybWF0V1UoYWN0aXZlRXh0ZW50KX08L291dHB1dD48L1Byb3BlcnR5PlxuICAgICAgICA8TnVtYmVyUHJvcGVydHkgbGFiZWw9XCJEZXNrdG9wIGxlbmd0aFwiIHZhbHVlPXtzZWN0aW9uLmV4dGVudFdVfSBtaW49ezF9IG1heD17OH0gc3RlcD17MC4wNX0gdW5pdD1cIldVXCIgb25DaGFuZ2U9eyh2YWx1ZSkgPT4gdXBkYXRlKCdDaGFuZ2UgZGVza3RvcCBTZWN0aW9uIGxlbmd0aCcsIChkcmFmdCkgPT4geyBkcmFmdC5leHRlbnRXVSA9IHZhbHVlOyB9LCBgc2VjdGlvbjoke3NlY3Rpb24uaWR9OmV4dGVudGApfSAvPlxuICAgICAgICA8TnVtYmVyUHJvcGVydHkgbGFiZWw9XCJNb2JpbGUgbGVuZ3RoXCIgdmFsdWU9e3NlY3Rpb24ubW9iaWxlRXh0ZW50V1V9IG1pbj17MX0gbWF4PXs4fSBzdGVwPXswLjA1fSB1bml0PVwiV1VcIiBvbkNoYW5nZT17KHZhbHVlKSA9PiB1cGRhdGUoJ0NoYW5nZSBtb2JpbGUgU2VjdGlvbiBsZW5ndGgnLCAoZHJhZnQpID0+IHsgZHJhZnQubW9iaWxlRXh0ZW50V1UgPSB2YWx1ZTsgfSwgYHNlY3Rpb246JHtzZWN0aW9uLmlkfTptb2JpbGVgKX0gLz5cbiAgICAgICAgPFByb3BlcnR5IGxhYmVsPVwiUmVzb2x2ZWQgaGVpZ2h0XCI+PG91dHB1dCBjbGFzc05hbWU9XCJhYm91dC1lZGl0b3ItcmVhZG91dFwiPntmb3JtYXRXVShyZXNvbHZlZEV4dGVudCl9PC9vdXRwdXQ+PC9Qcm9wZXJ0eT5cbiAgICAgICAge2NvbnRlbnRNaW5pbXVtQWN0aXZlID8gPHAgY2xhc3NOYW1lPVwiYWJvdXQtZWRpdG9yLXRpbWluZy13YXJuaW5nXCI+Q29udGVudCBtaW5pbXVtIGluIGVmZmVjdC4gVGhlIHJlbmRlcmVkIGNvcHkgbmVlZHMge2Zvcm1hdFdVKHJlc29sdmVkRXh0ZW50KX0gaW4gdGhpcyBwcm9maWxlLjwvcD4gOiBudWxsfVxuICAgICAgICA8YnV0dG9uXG4gICAgICAgICAgdHlwZT1cImJ1dHRvblwiXG4gICAgICAgICAgY2xhc3NOYW1lPVwiYWJvdXQtZWRpdG9yLXdpZGUtYWN0aW9uXCJcbiAgICAgICAgICBkaXNhYmxlZD17IWJhc2VsaW5lU2VjdGlvbiB8fCBiYXNlbGluZVNlY3Rpb25bYWN0aXZlRXh0ZW50RmllbGRdID09PSBzZWN0aW9uW2FjdGl2ZUV4dGVudEZpZWxkXX1cbiAgICAgICAgICBvbkNsaWNrPXsoKSA9PiB1cGRhdGUoJ1Jlc3RvcmUgc2F2ZWQgU2VjdGlvbiBsZW5ndGgnLCAoZHJhZnQpID0+IHsgZHJhZnRbYWN0aXZlRXh0ZW50RmllbGRdID0gYmFzZWxpbmVTZWN0aW9uW2FjdGl2ZUV4dGVudEZpZWxkXTsgfSl9XG4gICAgICAgID5SZXNldCB7c25hcHNob3QucHJldmlld1Byb2ZpbGUgPT09ICdtb2JpbGUnID8gJ21vYmlsZScgOiAnZGVza3RvcCd9IGxlbmd0aDwvYnV0dG9uPlxuICAgICAgPC9kZXRhaWxzPlxuICAgICAge3NlY3Rpb24udHlwZSA9PT0gJ2VkaXRvcmlhbCcgPyA8RWRpdG9yaWFsQmxvY2tzIHN0b3JlPXtzdG9yZX0gc25hcHNob3Q9e3NuYXBzaG90fSBzZWN0aW9uPXtzZWN0aW9ufSAvPiA6IG51bGx9XG4gICAgICB7c2VjdGlvbi50eXBlICE9PSAnZWRpdG9yaWFsJyA/IChcbiAgICAgICAgPGJ1dHRvblxuICAgICAgICAgIHR5cGU9XCJidXR0b25cIlxuICAgICAgICAgIGNsYXNzTmFtZT1cImFib3V0LWVkaXRvci13aWRlLWFjdGlvblwiXG4gICAgICAgICAgb25DbGljaz17KCkgPT4ge1xuICAgICAgICAgICAgY29uc3QgbG9jYWwgPSBnZXRMb2NhbFByb2dyZXNzKHNuYXBzaG90LmNvbXBpbGVkUGxhbiwgc2VjdGlvbiwgc25hcHNob3QudHJhbnNwb3J0LnN0b3J5V1UpO1xuICAgICAgICAgICAgY29uc3QgaWQgPSBuZXh0SWQoc25hcHNob3QuZG9jdW1lbnQsIGAke3NlY3Rpb24uaWR9LXN0YXRlbWVudGApO1xuICAgICAgICAgICAgY29uc3QgZm9jdXMgPSBNYXRoLm1pbigwLjkyLCBNYXRoLm1heCgwLjA4LCBzbmFwQWJvdXROYXJyYXRpdmVUaW1lbGluZVZhbHVlKGxvY2FsKSkpO1xuICAgICAgICAgICAgdXBkYXRlKCdBZGQgdGV4dCBDdWUnLCAoZHJhZnQpID0+IHtcbiAgICAgICAgICAgICAgZHJhZnQudGV4dC5jdWVzIHx8PSBbXTtcbiAgICAgICAgICAgICAgZHJhZnQudGV4dC5jdWVzLnB1c2goeyBpZCwgdGV4dDogJ05ldyB0cmF2ZWxsaW5nIHN0YXRlbWVudCcsIGVudGVyOiBmb2N1cyAtIDAuMDgsIGhvbGQ6IGZvY3VzLCBleGl0OiBmb2N1cyArIDAuMDgsIHByZXNldDogJ3RyYXZlbGxpbmctdGl0bGUtdjEnLCBtb3Rpb246IHsgbW9kZTogJ3NwYXRpYWwnIH0gfSk7XG4gICAgICAgICAgICAgIGRyYWZ0LnRleHQuY3Vlcy5zb3J0KChhLCBiKSA9PiBhLmhvbGQgLSBiLmhvbGQpO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICBzdG9yZS5zZXRTZWxlY3Rpb24oeyB0eXBlOiAnY3VlJywgc2VjdGlvbklkOiBzZWN0aW9uLmlkLCBjdWVJZDogaWQsIGtleVBhcnQ6ICdmb2N1cycgfSk7XG4gICAgICAgICAgfX1cbiAgICAgICAgPkFkZCB0ZXh0IGN1ZSBhdCBwbGF5aGVhZDwvYnV0dG9uPlxuICAgICAgKSA6IG51bGx9XG4gICAgPC8+XG4gICk7XG59XG5cbmZ1bmN0aW9uIEVkaXRvcmlhbEJsb2Nrcyh7IHN0b3JlLCBzbmFwc2hvdCwgc2VjdGlvbiB9KSB7XG4gIGNvbnN0IHNlY3Rpb25JbmRleCA9IGdldFNlY3Rpb25JbmRleChzbmFwc2hvdC5kb2N1bWVudCwgc2VjdGlvbi5pZCk7XG4gIGNvbnN0IHVwZGF0ZUJsb2NrID0gKGJsb2NrSW5kZXgsIGZpZWxkLCB2YWx1ZSkgPT4gc3RvcmUuY29tbWl0KCdFZGl0IGVkaXRvcmlhbCBjb3B5JywgKGRyYWZ0KSA9PiB7XG4gICAgZHJhZnQuc2VjdGlvbnNbc2VjdGlvbkluZGV4XS50ZXh0LmJsb2Nrc1tibG9ja0luZGV4XVtmaWVsZF0gPSB2YWx1ZTtcbiAgfSwgeyBjb2FsZXNjZUtleTogYGJsb2NrOiR7c2VjdGlvbi5pZH06JHtibG9ja0luZGV4fToke2ZpZWxkfWAsIHNlbGVjdGlvbjogc25hcHNob3Quc2VsZWN0aW9uIH0pO1xuICBjb25zdCB1cGRhdGVFbXBoYXNpcyA9IChibG9ja0luZGV4LCBlbXBoYXNpc0luZGV4LCBmaWVsZCwgdmFsdWUpID0+IHN0b3JlLmNvbW1pdCgnRWRpdCBlZGl0b3JpYWwgaGlnaGxpZ2h0JywgKGRyYWZ0KSA9PiB7XG4gICAgZHJhZnQuc2VjdGlvbnNbc2VjdGlvbkluZGV4XS50ZXh0LmJsb2Nrc1tibG9ja0luZGV4XS5lbXBoYXNpc1tlbXBoYXNpc0luZGV4XVtmaWVsZF0gPSB2YWx1ZTtcbiAgfSwgeyBjb2FsZXNjZUtleTogYGJsb2NrOiR7c2VjdGlvbi5pZH06JHtibG9ja0luZGV4fTplbXBoYXNpczoke2VtcGhhc2lzSW5kZXh9OiR7ZmllbGR9YCwgc2VsZWN0aW9uOiBzbmFwc2hvdC5zZWxlY3Rpb24gfSk7XG4gIGNvbnN0IGFkZEVtcGhhc2lzID0gKGJsb2NrSW5kZXgpID0+IHN0b3JlLmNvbW1pdCgnQWRkIGVkaXRvcmlhbCBoaWdobGlnaHQnLCAoZHJhZnQpID0+IHtcbiAgICBjb25zdCBibG9jayA9IGRyYWZ0LnNlY3Rpb25zW3NlY3Rpb25JbmRleF0udGV4dC5ibG9ja3NbYmxvY2tJbmRleF07XG4gICAgYmxvY2suZW1waGFzaXMgfHw9IFtdO1xuICAgIGJsb2NrLmVtcGhhc2lzLnB1c2goeyB0ZXh0OiBibG9jay50ZXh0LnRyaW0oKS5zcGxpdCgvXFxzKy8pLnNsaWNlKDAsIDIpLmpvaW4oJyAnKSwgdG9uZTogJ2JsdWUnIH0pO1xuICB9LCB7IHNlbGVjdGlvbjogc25hcHNob3Quc2VsZWN0aW9uIH0pO1xuICBjb25zdCByZW1vdmVFbXBoYXNpcyA9IChibG9ja0luZGV4LCBlbXBoYXNpc0luZGV4KSA9PiBzdG9yZS5jb21taXQoJ1JlbW92ZSBlZGl0b3JpYWwgaGlnaGxpZ2h0JywgKGRyYWZ0KSA9PiB7XG4gICAgZHJhZnQuc2VjdGlvbnNbc2VjdGlvbkluZGV4XS50ZXh0LmJsb2Nrc1tibG9ja0luZGV4XS5lbXBoYXNpcy5zcGxpY2UoZW1waGFzaXNJbmRleCwgMSk7XG4gIH0sIHsgc2VsZWN0aW9uOiBzbmFwc2hvdC5zZWxlY3Rpb24gfSk7XG4gIHJldHVybiAoXG4gICAgPGRldGFpbHMgb3Blbj5cbiAgICAgIDxzdW1tYXJ5PkVkaXRvcmlhbCBjb250ZW50PC9zdW1tYXJ5PlxuICAgICAgeyhzZWN0aW9uLnRleHQuYmxvY2tzIHx8IFtdKS5tYXAoKGJsb2NrLCBibG9ja0luZGV4KSA9PiAoXG4gICAgICAgIDxkaXYgY2xhc3NOYW1lPVwiYWJvdXQtZWRpdG9yLWJsb2NrXCIga2V5PXtibG9jay5pZH0+XG4gICAgICAgICAgPGRpdj48Y29kZT57YmxvY2sua2luZH08L2NvZGU+PHNwYW4+e2Jsb2NrLmlkfTwvc3Bhbj48L2Rpdj5cbiAgICAgICAgICB7YmxvY2subGFiZWwgIT0gbnVsbCA/IDxQcm9wZXJ0eSBsYWJlbD1cIkxhYmVsXCI+PGlucHV0IHZhbHVlPXtibG9jay5sYWJlbH0gb25DaGFuZ2U9eyhldmVudCkgPT4gdXBkYXRlQmxvY2soYmxvY2tJbmRleCwgJ2xhYmVsJywgZXZlbnQudGFyZ2V0LnZhbHVlKX0gLz48L1Byb3BlcnR5PiA6IG51bGx9XG4gICAgICAgICAge2Jsb2NrLnRleHQgIT0gbnVsbCA/IDxQcm9wZXJ0eSBsYWJlbD1cIkNvcHlcIj48dGV4dGFyZWEgcm93cz1cIjVcIiB2YWx1ZT17YmxvY2sudGV4dH0gb25DaGFuZ2U9eyhldmVudCkgPT4gdXBkYXRlQmxvY2soYmxvY2tJbmRleCwgJ3RleHQnLCBldmVudC50YXJnZXQudmFsdWUpfSAvPjwvUHJvcGVydHk+IDogbnVsbH1cbiAgICAgICAgICB7YmxvY2sua2luZCA9PT0gJ3Byb3NlJyA/IDxQcm9wZXJ0eSBsYWJlbD1cIlJlY29ubmVjdCBwb2ludCBncmlkXCI+PGlucHV0IHR5cGU9XCJjaGVja2JveFwiIGNoZWNrZWQ9e2Jsb2NrLndvcmxkSW5mbHVlbmNlID09PSB0cnVlfSBvbkNoYW5nZT17KGV2ZW50KSA9PiB1cGRhdGVCbG9jayhibG9ja0luZGV4LCAnd29ybGRJbmZsdWVuY2UnLCBldmVudC50YXJnZXQuY2hlY2tlZCl9IC8+PC9Qcm9wZXJ0eT4gOiBudWxsfVxuICAgICAgICAgIHtibG9jay50ZXh0ICE9IG51bGwgPyAoXG4gICAgICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cImFib3V0LWVkaXRvci1lbXBoYXNpcy1jb250cm9sc1wiPlxuICAgICAgICAgICAgICA8c3Bhbj5IaWdobGlnaHRlZCB3b3Jkczwvc3Bhbj5cbiAgICAgICAgICAgICAgeyhibG9jay5lbXBoYXNpcyB8fCBbXSkubWFwKChpdGVtLCBlbXBoYXNpc0luZGV4KSA9PiAoXG4gICAgICAgICAgICAgICAgPGRpdiBjbGFzc05hbWU9XCJhYm91dC1lZGl0b3ItZW1waGFzaXMtcm93XCIga2V5PXtgJHtibG9jay5pZH0tZW1waGFzaXMtJHtlbXBoYXNpc0luZGV4fWB9PlxuICAgICAgICAgICAgICAgICAgPGlucHV0IGFyaWEtbGFiZWw9XCJIaWdobGlnaHRlZCBwaHJhc2VcIiB2YWx1ZT17aXRlbS50ZXh0fSBvbkNoYW5nZT17KGV2ZW50KSA9PiB1cGRhdGVFbXBoYXNpcyhibG9ja0luZGV4LCBlbXBoYXNpc0luZGV4LCAndGV4dCcsIGV2ZW50LnRhcmdldC52YWx1ZSl9IC8+XG4gICAgICAgICAgICAgICAgICA8c2VsZWN0IGFyaWEtbGFiZWw9XCJIaWdobGlnaHQgY29sb3VyXCIgdmFsdWU9e2l0ZW0udG9uZX0gb25DaGFuZ2U9eyhldmVudCkgPT4gdXBkYXRlRW1waGFzaXMoYmxvY2tJbmRleCwgZW1waGFzaXNJbmRleCwgJ3RvbmUnLCBldmVudC50YXJnZXQudmFsdWUpfT5cbiAgICAgICAgICAgICAgICAgICAge0FCT1VUX05BUlJBVElWRV9FTVBIQVNJU19UT05FUy5tYXAoKHRvbmUpID0+IDxvcHRpb24gdmFsdWU9e3RvbmV9IGtleT17dG9uZX0+e3RvbmV9PC9vcHRpb24+KX1cbiAgICAgICAgICAgICAgICAgIDwvc2VsZWN0PlxuICAgICAgICAgICAgICAgICAgPGJ1dHRvbiB0eXBlPVwiYnV0dG9uXCIgYXJpYS1sYWJlbD17YFJlbW92ZSAke2l0ZW0udGV4dCB8fCAnZW1wdHknfSBoaWdobGlnaHRgfSBvbkNsaWNrPXsoKSA9PiByZW1vdmVFbXBoYXNpcyhibG9ja0luZGV4LCBlbXBoYXNpc0luZGV4KX0+w5c8L2J1dHRvbj5cbiAgICAgICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgICAgKSl9XG4gICAgICAgICAgICAgIDxidXR0b24gdHlwZT1cImJ1dHRvblwiIG9uQ2xpY2s9eygpID0+IGFkZEVtcGhhc2lzKGJsb2NrSW5kZXgpfT5BZGQgaGlnaGxpZ2h0PC9idXR0b24+XG4gICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICApIDogbnVsbH1cbiAgICAgICAgICB7YmxvY2suaXRlbXMgPyA8UHJvcGVydHkgbGFiZWw9XCJJdGVtc1wiPjx0ZXh0YXJlYSByb3dzPVwiNlwiIHZhbHVlPXtibG9jay5pdGVtcy5qb2luKCdcXG4nKX0gb25DaGFuZ2U9eyhldmVudCkgPT4gdXBkYXRlQmxvY2soYmxvY2tJbmRleCwgJ2l0ZW1zJywgZXZlbnQudGFyZ2V0LnZhbHVlLnNwbGl0KCdcXG4nKS5maWx0ZXIoQm9vbGVhbikpfSAvPjwvUHJvcGVydHk+IDogbnVsbH1cbiAgICAgICAgPC9kaXY+XG4gICAgICApKX1cbiAgICAgIDxidXR0b24gdHlwZT1cImJ1dHRvblwiIGNsYXNzTmFtZT1cImFib3V0LWVkaXRvci13aWRlLWFjdGlvblwiIG9uQ2xpY2s9eygpID0+IHN0b3JlLmNvbW1pdCgnQWRkIGVkaXRvcmlhbCBibG9jaycsIChkcmFmdCkgPT4ge1xuICAgICAgICBkcmFmdC5zZWN0aW9uc1tzZWN0aW9uSW5kZXhdLnRleHQuYmxvY2tzLnB1c2goeyBpZDogbmV4dElkKGRyYWZ0LCBgJHtzZWN0aW9uLmlkfS1wcm9zZWApLCBraW5kOiAncHJvc2UnLCB0ZXh0OiAnTmV3IGVkaXRvcmlhbCBwYXJhZ3JhcGguJyB9KTtcbiAgICAgIH0pfT5BZGQgcHJvc2UgYmxvY2s8L2J1dHRvbj5cbiAgICA8L2RldGFpbHM+XG4gICk7XG59XG5cbmZ1bmN0aW9uIEN1ZUluc3BlY3Rvcih7IHN0b3JlLCBzbmFwc2hvdCwgc2VjdGlvbiB9KSB7XG4gIGNvbnN0IHNlbGVjdGVkTWVtYmVycyA9IGdldEFib3V0TmFycmF0aXZlU2VsZWN0aW9uTWVtYmVycyhzbmFwc2hvdC5zZWxlY3Rpb24pO1xuICBjb25zdCBzZWN0aW9uSW5kZXggPSBnZXRTZWN0aW9uSW5kZXgoc25hcHNob3QuZG9jdW1lbnQsIHNlY3Rpb24uaWQpO1xuICBjb25zdCBjdWVJbmRleCA9IHNlY3Rpb24udGV4dC5jdWVzLmZpbmRJbmRleCgoY3VlKSA9PiBjdWUuaWQgPT09IHNuYXBzaG90LnNlbGVjdGlvbi5jdWVJZCk7XG4gIGNvbnN0IGN1ZSA9IHNlY3Rpb24udGV4dC5jdWVzW2N1ZUluZGV4XTtcbiAgaWYgKCFjdWUpIHJldHVybiA8U2VjdGlvbkluc3BlY3RvciBzdG9yZT17c3RvcmV9IHNuYXBzaG90PXtzbmFwc2hvdH0gc2VjdGlvbj17c2VjdGlvbn0gLz47XG4gIGNvbnN0IHVwZGF0ZSA9IChmaWVsZCwgdmFsdWUpID0+IHN0b3JlLmNvbW1pdChgRWRpdCBDdWUgJHtmaWVsZH1gLCAoZHJhZnQpID0+IHtcbiAgICBkcmFmdC5zZWN0aW9uc1tzZWN0aW9uSW5kZXhdLnRleHQuY3Vlc1tjdWVJbmRleF1bZmllbGRdID0gdmFsdWU7XG4gIH0sIHsgY29hbGVzY2VLZXk6IGBjdWU6JHtjdWUuaWR9OiR7ZmllbGR9YCwgc2VsZWN0aW9uOiBzbmFwc2hvdC5zZWxlY3Rpb24gfSk7XG4gIGNvbnN0IHJlbW92ZSA9ICgpID0+IHN0b3JlLmNvbW1pdCgnRGVsZXRlIHRleHQgQ3VlJywgKGRyYWZ0KSA9PiB7XG4gICAgZHJhZnQuc2VjdGlvbnNbc2VjdGlvbkluZGV4XS50ZXh0LmN1ZXMuc3BsaWNlKGN1ZUluZGV4LCAxKTtcbiAgfSwgeyBzZWxlY3Rpb246IHsgdHlwZTogJ3NlY3Rpb24nLCBzZWN0aW9uSWQ6IHNlY3Rpb24uaWQgfSB9KTtcbiAgY29uc3QgdGltaW5nQm91bmRzID0gZ2V0QWJvdXROYXJyYXRpdmVDdWVUaW1pbmdCb3VuZHMoY3VlKTtcbiAgY29uc3QgbW90aW9uSW50ZXJ2YWwgPSBnZXRBYm91dE5hcnJhdGl2ZUN1ZU1vdGlvbkludGVydmFsKGN1ZSwgc25hcHNob3QuZG9jdW1lbnQuZ2xvYmFscy50ZXh0TW90aW9uKTtcbiAgY29uc3QgbW92ZW1lbnQgPSBnZXRBYm91dE5hcnJhdGl2ZUN1ZU1vdmVtZW50KGN1ZSk7XG4gIGNvbnN0IG1vdmVDdWUgPSAocGVyY2VudCkgPT4gc3RvcmUuY29tbWl0KCdNb3ZlIHRleHQgQ3VlJywgKGRyYWZ0KSA9PiB7XG4gICAgY29uc3QgdGFyZ2V0ID0gZHJhZnQuc2VjdGlvbnNbc2VjdGlvbkluZGV4XS50ZXh0LmN1ZXNbY3VlSW5kZXhdO1xuICAgIE9iamVjdC5hc3NpZ24odGFyZ2V0LCBtb3ZlQWJvdXROYXJyYXRpdmVDdWVUaW1pbmcodGFyZ2V0LCBwZXJjZW50IC8gMTAwKSk7XG4gIH0sIHsgY29hbGVzY2VLZXk6IGBjdWU6JHtjdWUuaWR9OnRpbWluZ2AsIHNlbGVjdGlvbjogeyAuLi5zbmFwc2hvdC5zZWxlY3Rpb24sIGtleVBhcnQ6ICdmb2N1cycgfSB9KTtcbiAgY29uc3QgdXBkYXRlTW92ZW1lbnQgPSAobW9kZSkgPT4gc3RvcmUuY29tbWl0KCdDaGFuZ2UgdGV4dCBtb3ZlbWVudCcsIChkcmFmdCkgPT4ge1xuICAgIGNvbnN0IHRhcmdldCA9IGRyYWZ0LnNlY3Rpb25zW3NlY3Rpb25JbmRleF0udGV4dC5jdWVzW2N1ZUluZGV4XTtcbiAgICB0YXJnZXQubW90aW9uID0geyAuLi50YXJnZXQubW90aW9uLCBtb2RlIH07XG4gIH0sIHsgc2VsZWN0aW9uOiBzbmFwc2hvdC5zZWxlY3Rpb24gfSk7XG4gIHJldHVybiAoXG4gICAgPD5cbiAgICAgIDxoZWFkZXI+PHNwYW4+VGV4dCBDdWU8L3NwYW4+PHN0cm9uZz57Y3VlLmlkfTwvc3Ryb25nPjwvaGVhZGVyPlxuICAgICAge3NlbGVjdGVkTWVtYmVycy5sZW5ndGggPiAxID8gKFxuICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cImFib3V0LWVkaXRvci1ncm91cC1zdW1tYXJ5XCI+XG4gICAgICAgICAgPHN0cm9uZz57c2VsZWN0ZWRNZW1iZXJzLmxlbmd0aH0gdGl0bGVzIHNlbGVjdGVkPC9zdHJvbmc+XG4gICAgICAgICAgPG9sPntzZWxlY3RlZE1lbWJlcnMubWFwKChtZW1iZXIpID0+IHtcbiAgICAgICAgICAgIGNvbnN0IG1lbWJlclNlY3Rpb24gPSBzbmFwc2hvdC5kb2N1bWVudC5zZWN0aW9ucy5maW5kKChpdGVtKSA9PiBpdGVtLmlkID09PSBtZW1iZXIuc2VjdGlvbklkKTtcbiAgICAgICAgICAgIGNvbnN0IG1lbWJlckN1ZSA9IG1lbWJlclNlY3Rpb24/LnRleHQ/LmN1ZXM/LmZpbmQoKGl0ZW0pID0+IGl0ZW0uaWQgPT09IG1lbWJlci5jdWVJZCk7XG4gICAgICAgICAgICByZXR1cm4gPGxpIGtleT17YCR7bWVtYmVyLnNlY3Rpb25JZH06JHttZW1iZXIuY3VlSWR9YH0+PHNwYW4+e21lbWJlclNlY3Rpb24/LmxhYmVsfTwvc3Bhbj57bWVtYmVyQ3VlPy50ZXh0fTwvbGk+O1xuICAgICAgICAgIH0pfTwvb2w+XG4gICAgICAgICAgPGJ1dHRvbiB0eXBlPVwiYnV0dG9uXCIgb25DbGljaz17KCkgPT4gc3RvcmUuc2V0U2VsZWN0aW9uKHsgdHlwZTogJ2N1ZScsIHNlY3Rpb25JZDogc2VjdGlvbi5pZCwgY3VlSWQ6IGN1ZS5pZCwga2V5UGFydDogJ2ZvY3VzJyB9KX0+S2VlcCBwcmltYXJ5IG9ubHk8L2J1dHRvbj5cbiAgICAgICAgPC9kaXY+XG4gICAgICApIDogbnVsbH1cbiAgICAgIDxwIGNsYXNzTmFtZT1cImFib3V0LWVkaXRvci1oZWxwXCI+RHJhZyB0aGUgcGluayB0aW1pbmcgbWFya2VyIGFueXdoZXJlIGZyb20gMOKAkzEwMCUgb2YgaXRzIFNlY3Rpb24uIFRoaXMgbW92ZXMgdGhlIHRpdGxlJ3MgZm9jdXMgdGltZSBvbmx5LiBJdHMgdHJhdmVsIGR1cmF0aW9uLCBzcGVlZCwgYmx1ciwgYW5kIGluL291dCBjYWRlbmNlIHJlbWFpbiBjb250cm9sbGVkIGdsb2JhbGx5IHVuZGVyIFNwYXRpYWwgdGl0bGVzLjwvcD5cbiAgICAgIDxQcm9wZXJ0eSBsYWJlbD1cIlN0YXRlbWVudFwiPjx0ZXh0YXJlYSByb3dzPVwiN1wiIHZhbHVlPXtjdWUudGV4dH0gb25DaGFuZ2U9eyhldmVudCkgPT4gdXBkYXRlKCd0ZXh0JywgZXZlbnQudGFyZ2V0LnZhbHVlKX0gLz48L1Byb3BlcnR5PlxuICAgICAgPFByb3BlcnR5IGxhYmVsPVwiTW92ZW1lbnRcIj48c2VsZWN0IHZhbHVlPXttb3ZlbWVudH0gb25DaGFuZ2U9eyhldmVudCkgPT4gdXBkYXRlTW92ZW1lbnQoZXZlbnQudGFyZ2V0LnZhbHVlKX0+PG9wdGlvbiB2YWx1ZT1cInNwYXRpYWxcIj5TcGF0aWFsIHRyYXZlbDwvb3B0aW9uPjxvcHRpb24gdmFsdWU9XCJ2ZXJ0aWNhbFwiPlZlcnRpY2FsIHNjcm9sbDwvb3B0aW9uPjwvc2VsZWN0PjwvUHJvcGVydHk+XG4gICAgICA8TnVtYmVyUHJvcGVydHlcbiAgICAgICAgbGFiZWw9XCJQb3NpdGlvblwiXG4gICAgICAgIHZhbHVlPXtOdW1iZXIoKGN1ZS5ob2xkICogMTAwKS50b0ZpeGVkKDEpKX1cbiAgICAgICAgbWluPXtOdW1iZXIoKHRpbWluZ0JvdW5kcy5taW4gKiAxMDApLnRvRml4ZWQoMSkpfVxuICAgICAgICBtYXg9e051bWJlcigodGltaW5nQm91bmRzLm1heCAqIDEwMCkudG9GaXhlZCgxKSl9XG4gICAgICAgIHN0ZXA9ezAuNX1cbiAgICAgICAgdW5pdD1cIiVcIlxuICAgICAgICBkaXNhYmxlZD17dGltaW5nQm91bmRzLm1pbiA9PT0gdGltaW5nQm91bmRzLm1heH1cbiAgICAgICAgb25DaGFuZ2U9e21vdmVDdWV9XG4gICAgICAvPlxuICAgICAge21vdmVtZW50ID09PSAnc3BhdGlhbCcgPyAoXG4gICAgICAgIDw+XG4gICAgICAgICAgPFByb3BlcnR5IGxhYmVsPVwiQXV0byB0cmF2ZWxcIj48b3V0cHV0IGNsYXNzTmFtZT1cImFib3V0LWVkaXRvci1yZWFkb3V0XCI+e01hdGgucm91bmQobW90aW9uSW50ZXJ2YWwuc3RhcnQgKiAxMDApfeKAk3tNYXRoLnJvdW5kKG1vdGlvbkludGVydmFsLmVuZCAqIDEwMCl9JTwvb3V0cHV0PjwvUHJvcGVydHk+XG4gICAgICAgICAgPFByb3BlcnR5IGxhYmVsPVwiTW90aW9uIHByZXNldFwiPjxzZWxlY3QgdmFsdWU9e2N1ZS5wcmVzZXR9IG9uQ2hhbmdlPXsoZXZlbnQpID0+IHVwZGF0ZSgncHJlc2V0JywgZXZlbnQudGFyZ2V0LnZhbHVlKX0+PG9wdGlvbiB2YWx1ZT1cInRyYXZlbGxpbmctdGl0bGUtdjFcIj5UcmF2ZWxsaW5nIHRpdGxlPC9vcHRpb24+PG9wdGlvbiB2YWx1ZT1cIm9wZW5lci12MVwiPk9wZW5lcjwvb3B0aW9uPjxvcHRpb24gdmFsdWU9XCJmaW5hbGUtdjFcIj5GaW5hbGU8L29wdGlvbj48L3NlbGVjdD48L1Byb3BlcnR5PlxuICAgICAgICA8Lz5cbiAgICAgICkgOiA8UHJvcGVydHkgbGFiZWw9XCJSZXZlYWxcIj48b3V0cHV0IGNsYXNzTmFtZT1cImFib3V0LWVkaXRvci1yZWFkb3V0XCI+RWRpdG9yaWFsIHZlcnRpY2FsIHNjcm9sbDwvb3V0cHV0PjwvUHJvcGVydHk+fVxuICAgICAgPGJ1dHRvbiB0eXBlPVwiYnV0dG9uXCIgY2xhc3NOYW1lPVwiYWJvdXQtZWRpdG9yLWRhbmdlclwiIGRpc2FibGVkPXtzZWN0aW9uLnR5cGUgPT09ICdmaW5hbGUnfSBvbkNsaWNrPXtyZW1vdmV9PkRlbGV0ZSBDdWU8L2J1dHRvbj5cbiAgICA8Lz5cbiAgKTtcbn1cblxuZnVuY3Rpb24gRGlzY2lwbGluZVJldmVhbEluc3BlY3Rvcih7IHN0b3JlLCBzbmFwc2hvdCwgc2VjdGlvbiB9KSB7XG4gIGNvbnN0IHNlY3Rpb25JbmRleCA9IGdldFNlY3Rpb25JbmRleChzbmFwc2hvdC5kb2N1bWVudCwgc2VjdGlvbi5pZCk7XG4gIGNvbnN0IHJldmVhbCA9IHNlY3Rpb24udGV4dC5kaXNjaXBsaW5lUmV2ZWFsO1xuICBpZiAoIXJldmVhbCkgcmV0dXJuIDxTZWN0aW9uSW5zcGVjdG9yIHN0b3JlPXtzdG9yZX0gc25hcHNob3Q9e3NuYXBzaG90fSBzZWN0aW9uPXtzZWN0aW9ufSAvPjtcbiAgY29uc3QgdXBkYXRlID0gKGxhYmVsLCBtdXRhdGUsIGNvYWxlc2NlS2V5ID0gbnVsbCkgPT4gc3RvcmUuY29tbWl0KGxhYmVsLCAoZHJhZnQpID0+IHtcbiAgICBtdXRhdGUoZHJhZnQuc2VjdGlvbnNbc2VjdGlvbkluZGV4XS50ZXh0LmRpc2NpcGxpbmVSZXZlYWwpO1xuICB9LCB7IGNvYWxlc2NlS2V5LCBzZWxlY3Rpb246IHNuYXBzaG90LnNlbGVjdGlvbiB9KTtcbiAgY29uc3Qgb2NjdXBpZWQgPSAoKHJldmVhbC5pdGVtcy5sZW5ndGggLSAxKSAqIHJldmVhbC5zdGFnZ2VyKSArIHJldmVhbC5sYWJlbER1cmF0aW9uICsgcmV2ZWFsLmhvbGQ7XG4gIGNvbnN0IGxpbWl0c0ZvciA9IChjb250cm9sKSA9PiB7XG4gICAgaWYgKGNvbnRyb2wuaWQgPT09ICdzdGFydCcpIHJldHVybiB7IG1pbjogY29udHJvbC5taW4sIG1heDogTWF0aC5tYXgoY29udHJvbC5taW4sIHJldmVhbC5lbmQgLSBvY2N1cGllZCkgfTtcbiAgICBpZiAoY29udHJvbC5pZCA9PT0gJ2VuZCcpIHJldHVybiB7IG1pbjogTWF0aC5taW4oY29udHJvbC5tYXgsIHJldmVhbC5zdGFydCArIG9jY3VwaWVkKSwgbWF4OiBjb250cm9sLm1heCB9O1xuICAgIGlmIChjb250cm9sLmlkID09PSAnc3RhZ2dlcicpIHJldHVybiB7XG4gICAgICBtaW46IGNvbnRyb2wubWluLFxuICAgICAgbWF4OiBNYXRoLm1heChjb250cm9sLm1pbiwgKHJldmVhbC5lbmQgLSByZXZlYWwuc3RhcnQgLSByZXZlYWwubGFiZWxEdXJhdGlvbiAtIHJldmVhbC5ob2xkKSAvIE1hdGgubWF4KDEsIHJldmVhbC5pdGVtcy5sZW5ndGggLSAxKSksXG4gICAgfTtcbiAgICBpZiAoY29udHJvbC5pZCA9PT0gJ2xhYmVsRHVyYXRpb24nKSByZXR1cm4ge1xuICAgICAgbWluOiBjb250cm9sLm1pbixcbiAgICAgIG1heDogTWF0aC5tYXgoY29udHJvbC5taW4sIHJldmVhbC5lbmQgLSByZXZlYWwuc3RhcnQgLSAoKHJldmVhbC5pdGVtcy5sZW5ndGggLSAxKSAqIHJldmVhbC5zdGFnZ2VyKSAtIHJldmVhbC5ob2xkKSxcbiAgICB9O1xuICAgIGlmIChjb250cm9sLmlkID09PSAnaG9sZCcpIHJldHVybiB7XG4gICAgICBtaW46IGNvbnRyb2wubWluLFxuICAgICAgbWF4OiBNYXRoLm1heChjb250cm9sLm1pbiwgcmV2ZWFsLmVuZCAtIHJldmVhbC5zdGFydCAtICgocmV2ZWFsLml0ZW1zLmxlbmd0aCAtIDEpICogcmV2ZWFsLnN0YWdnZXIpIC0gcmV2ZWFsLmxhYmVsRHVyYXRpb24pLFxuICAgIH07XG4gICAgcmV0dXJuIHsgbWluOiBjb250cm9sLm1pbiwgbWF4OiBjb250cm9sLm1heCB9O1xuICB9O1xuICByZXR1cm4gKFxuICAgIDw+XG4gICAgICA8aGVhZGVyPjxzcGFuPlRleHQgc2VxdWVuY2U8L3NwYW4+PHN0cm9uZz5EaXNjaXBsaW5lIHJldmVhbDwvc3Ryb25nPjwvaGVhZGVyPlxuICAgICAgPHAgY2xhc3NOYW1lPVwiYWJvdXQtZWRpdG9yLWhlbHBcIj5PbmUgY2xpcCBjb250cm9scyB0aGUgY29tcGxldGUgc2l4LXBvaW50IHNlcXVlbmNlLiBEcmFnIGl0cyBzdHJpcGVkIGJsb2NrIGluIHRoZSBUZXh0IGxhbmUgdG8gbW92ZSBldmVyeSByZXZlYWwgdG9nZXRoZXIuPC9wPlxuICAgICAgPGRldGFpbHMgb3Blbj48c3VtbWFyeT5SZXZlYWwgY2hvcmVvZ3JhcGh5PC9zdW1tYXJ5PlxuICAgICAgICB7QUJPVVRfTkFSUkFUSVZFX0RJU0NJUExJTkVfUkVWRUFMX0NPTlRST0xTLm1hcCgoY29udHJvbCkgPT4ge1xuICAgICAgICAgIGNvbnN0IGxpbWl0cyA9IGxpbWl0c0Zvcihjb250cm9sKTtcbiAgICAgICAgICByZXR1cm4gKFxuICAgICAgICAgICAgPE51bWJlclByb3BlcnR5XG4gICAgICAgICAgICAgIGtleT17Y29udHJvbC5pZH1cbiAgICAgICAgICAgICAgbGFiZWw9e2NvbnRyb2wubGFiZWx9XG4gICAgICAgICAgICAgIHZhbHVlPXtyZXZlYWxbY29udHJvbC5pZF19XG4gICAgICAgICAgICAgIG1pbj17bGltaXRzLm1pbn1cbiAgICAgICAgICAgICAgbWF4PXtsaW1pdHMubWF4fVxuICAgICAgICAgICAgICBzdGVwPXtjb250cm9sLnN0ZXB9XG4gICAgICAgICAgICAgIHVuaXQ9e2NvbnRyb2wudW5pdH1cbiAgICAgICAgICAgICAgb25DaGFuZ2U9eyh2YWx1ZSkgPT4gdXBkYXRlKGBDaGFuZ2UgJHtjb250cm9sLmxhYmVsfWAsIChkcmFmdCkgPT4geyBkcmFmdFtjb250cm9sLmlkXSA9IHZhbHVlOyB9LCBgZGlzY2lwbGluZS1yZXZlYWw6JHtzZWN0aW9uLmlkfToke2NvbnRyb2wuaWR9YCl9XG4gICAgICAgICAgICAvPlxuICAgICAgICAgICk7XG4gICAgICAgIH0pfVxuICAgICAgPC9kZXRhaWxzPlxuICAgICAgPGRldGFpbHMgb3Blbj48c3VtbWFyeT5SZXZlYWwgb3JkZXIgYW5kIGxhYmVsczwvc3VtbWFyeT5cbiAgICAgICAgPGRpdiBjbGFzc05hbWU9XCJhYm91dC1lZGl0b3ItZGlzY2lwbGluZS1pdGVtc1wiPlxuICAgICAgICAgIHtyZXZlYWwuaXRlbXMubWFwKChpdGVtLCBpdGVtSW5kZXgpID0+IChcbiAgICAgICAgICAgIDxkaXYgY2xhc3NOYW1lPVwiYWJvdXQtZWRpdG9yLWRpc2NpcGxpbmUtaXRlbVwiIGtleT17aXRlbS5ncm91cH0+XG4gICAgICAgICAgICAgIDxjb2RlPntTdHJpbmcoaXRlbUluZGV4ICsgMSkucGFkU3RhcnQoMiwgJzAnKX08L2NvZGU+XG4gICAgICAgICAgICAgIDxpbnB1dCB2YWx1ZT17aXRlbS5sYWJlbH0gYXJpYS1sYWJlbD17YERpc2NpcGxpbmUgJHtpdGVtSW5kZXggKyAxfSBsYWJlbGB9IG9uQ2hhbmdlPXsoZXZlbnQpID0+IHVwZGF0ZSgnRWRpdCBkaXNjaXBsaW5lIGxhYmVsJywgKGRyYWZ0KSA9PiB7IGRyYWZ0Lml0ZW1zW2l0ZW1JbmRleF0ubGFiZWwgPSBldmVudC50YXJnZXQudmFsdWU7IH0sIGBkaXNjaXBsaW5lLXJldmVhbDoke3NlY3Rpb24uaWR9Oml0ZW06JHtpdGVtLmdyb3VwfTpsYWJlbGApfSAvPlxuICAgICAgICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cImFib3V0LWVkaXRvci1kaXNjaXBsaW5lLXBhbGV0dGVcIiB0aXRsZT17YCR7aXRlbS5sYWJlbH0gdXNlcyB0aGUgSG9tZSBzaW11bGF0aW9uICR7RElTQ0lQTElORV9CQUxMX1RPS0VOX0JZX0dST1VQW2l0ZW0uZ3JvdXBdfWB9PlxuICAgICAgICAgICAgICAgIDxpIHN0eWxlPXt7IGJhY2tncm91bmQ6IGB2YXIoJHtESVNDSVBMSU5FX0JBTExfVE9LRU5fQllfR1JPVVBbaXRlbS5ncm91cF19KWAgfX0gLz5cbiAgICAgICAgICAgICAgICA8Y29kZT57RElTQ0lQTElORV9CQUxMX1RPS0VOX0JZX0dST1VQW2l0ZW0uZ3JvdXBdfTwvY29kZT5cbiAgICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgICAgIDxzcGFuPlxuICAgICAgICAgICAgICAgIDxidXR0b24gdHlwZT1cImJ1dHRvblwiIGRpc2FibGVkPXtpdGVtSW5kZXggPT09IDB9IGFyaWEtbGFiZWw9e2BSZXZlYWwgJHtpdGVtLmxhYmVsfSBlYXJsaWVyYH0gb25DbGljaz17KCkgPT4gdXBkYXRlKCdSZW9yZGVyIGRpc2NpcGxpbmUgcmV2ZWFsJywgKGRyYWZ0KSA9PiB7IGNvbnN0IFttb3ZlZF0gPSBkcmFmdC5pdGVtcy5zcGxpY2UoaXRlbUluZGV4LCAxKTsgZHJhZnQuaXRlbXMuc3BsaWNlKGl0ZW1JbmRleCAtIDEsIDAsIG1vdmVkKTsgfSl9PuKGkTwvYnV0dG9uPlxuICAgICAgICAgICAgICAgIDxidXR0b24gdHlwZT1cImJ1dHRvblwiIGRpc2FibGVkPXtpdGVtSW5kZXggPT09IHJldmVhbC5pdGVtcy5sZW5ndGggLSAxfSBhcmlhLWxhYmVsPXtgUmV2ZWFsICR7aXRlbS5sYWJlbH0gbGF0ZXJgfSBvbkNsaWNrPXsoKSA9PiB1cGRhdGUoJ1Jlb3JkZXIgZGlzY2lwbGluZSByZXZlYWwnLCAoZHJhZnQpID0+IHsgY29uc3QgW21vdmVkXSA9IGRyYWZ0Lml0ZW1zLnNwbGljZShpdGVtSW5kZXgsIDEpOyBkcmFmdC5pdGVtcy5zcGxpY2UoaXRlbUluZGV4ICsgMSwgMCwgbW92ZWQpOyB9KX0+4oaTPC9idXR0b24+XG4gICAgICAgICAgICAgIDwvc3Bhbj5cbiAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICkpfVxuICAgICAgICA8L2Rpdj5cbiAgICAgIDwvZGV0YWlscz5cbiAgICAgIDxwIGNsYXNzTmFtZT1cImFib3V0LWVkaXRvci1oZWxwXCI+VGhlIHNpeCBwb2ludHMgcGVyc2lzdCBhZnRlciB0aGUgbGFiZWxzIGxlYXZlLiBBbiBlZGl0b3JpYWwgYmxvY2sgbWFya2VkIOKAnFJlY29ubmVjdCBwb2ludCBncmlk4oCdIHJlc3RvcmVzIHRoZSBzdXJyb3VuZGluZyBncmlkIGFzIHRoYXQgcGFyYWdyYXBoIGVudGVycy48L3A+XG4gICAgPC8+XG4gICk7XG59XG5cbmZ1bmN0aW9uIENhbWVyYUluc3BlY3Rvcih7IHN0b3JlLCBzbmFwc2hvdCwgc2VjdGlvbiB9KSB7XG4gIGNvbnN0IHNlY3Rpb25JbmRleCA9IGdldFNlY3Rpb25JbmRleChzbmFwc2hvdC5kb2N1bWVudCwgc2VjdGlvbi5pZCk7XG4gIGNvbnN0IGtleUluZGV4ID0gc25hcHNob3Quc2VsZWN0aW9uLmtleUluZGV4O1xuICBjb25zdCBzZWxlY3RlZEtleSA9IHNlY3Rpb24uY2FtZXJhLmtleXNba2V5SW5kZXhdO1xuICBjb25zdCBrZXkgPSBzZWxlY3RlZEtleSAmJiBzZWxlY3RlZEtleS5hdCA+IDAgJiYgc2VsZWN0ZWRLZXkuYXQgPCAxID8gc2VsZWN0ZWRLZXkgOiBudWxsO1xuICBjb25zdCBsb2NhbCA9IGdldExvY2FsUHJvZ3Jlc3Moc25hcHNob3QuY29tcGlsZWRQbGFuLCBzZWN0aW9uLCBzbmFwc2hvdC50cmFuc3BvcnQuc3RvcnlXVSk7XG4gIGNvbnN0IHRhcmdldEF0ID0gTWF0aC5taW4oMC45OTUsIE1hdGgubWF4KDAuMDA1LCBzbmFwQWJvdXROYXJyYXRpdmVUaW1lbGluZVZhbHVlKGxvY2FsKSkpO1xuICBjb25zdCBhcHBseVByZXNldCA9IChwcmVzZXQpID0+IHN0b3JlLmNvbW1pdChgQXBwbHkgJHtwcmVzZXR9IGNhbWVyYSByZWNpcGVgLCAoZHJhZnQpID0+IHtcbiAgICBjb25zdCByZWNpcGVzID0ge1xuICAgICAgUHVzaDogW1xuICAgICAgICB7IGF0OiAwLCBvZmZzZXQ6IFswLCAwLCAwXSwgbG9va0F0T2Zmc2V0OiBbMCwgMCwgLTFdLCBmb3Y6IDQ4LCByb2xsOiAwLCBlYXNpbmc6ICdzbW9vdGhzdGVwJyB9LFxuICAgICAgICB7IGF0OiAxLCBvZmZzZXQ6IFswLCAwLCAtMS4yXSwgbG9va0F0T2Zmc2V0OiBbMCwgMCwgLTFdLCBmb3Y6IDQ1LCByb2xsOiAwLCBlYXNpbmc6ICdzbW9vdGhzdGVwJyB9LFxuICAgICAgXSxcbiAgICAgIEdsaWRlOiBbXG4gICAgICAgIHsgYXQ6IDAsIG9mZnNldDogWy0wLjgsIDAsIDBdLCBsb29rQXRPZmZzZXQ6IFswLjQsIDAsIC0xXSwgZm92OiA0OCwgcm9sbDogMCwgZWFzaW5nOiAnc21vb3Roc3RlcCcgfSxcbiAgICAgICAgeyBhdDogMSwgb2Zmc2V0OiBbMC44LCAwLCAwXSwgbG9va0F0T2Zmc2V0OiBbLTAuNCwgMCwgLTFdLCBmb3Y6IDQ4LCByb2xsOiAwLCBlYXNpbmc6ICdzbW9vdGhzdGVwJyB9LFxuICAgICAgXSxcbiAgICAgIE9yYml0OiBbXG4gICAgICAgIHsgYXQ6IDAsIG9mZnNldDogWy0wLjcsIDAsIDBdLCBsb29rQXRPZmZzZXQ6IFswLjcsIDAsIC0xXSwgZm92OiA0OCwgcm9sbDogLTAuMDgsIGVhc2luZzogJ3Ntb290aHN0ZXAnIH0sXG4gICAgICAgIHsgYXQ6IDAuNSwgb2Zmc2V0OiBbMC43LCAwLjI1LCAwXSwgbG9va0F0T2Zmc2V0OiBbLTAuNywgLTAuMSwgLTFdLCBmb3Y6IDQ4LCByb2xsOiAwLjA4LCBlYXNpbmc6ICdzbW9vdGhzdGVwJyB9LFxuICAgICAgICB7IGF0OiAxLCBvZmZzZXQ6IFswLCAwLCAwXSwgbG9va0F0T2Zmc2V0OiBbMCwgMCwgLTFdLCBmb3Y6IDQ4LCByb2xsOiAwLCBlYXNpbmc6ICdzbW9vdGhzdGVwJyB9LFxuICAgICAgXSxcbiAgICAgIFJldmVhbDogW1xuICAgICAgICB7IGF0OiAwLCBvZmZzZXQ6IFswLCAtMC40NSwgMC41XSwgbG9va0F0T2Zmc2V0OiBbMCwgMC4zLCAtMV0sIGZvdjogNTYsIHJvbGw6IDAsIGVhc2luZzogJ3Ntb290aHN0ZXAnIH0sXG4gICAgICAgIHsgYXQ6IDEsIG9mZnNldDogWzAsIDAsIDBdLCBsb29rQXRPZmZzZXQ6IFswLCAwLCAtMV0sIGZvdjogNDYsIHJvbGw6IDAsIGVhc2luZzogJ3Ntb290aHN0ZXAnIH0sXG4gICAgICBdLFxuICAgICAgUmVzb2x2ZTogW1xuICAgICAgICB7IGF0OiAwLCBvZmZzZXQ6IFswLjMsIDAuMiwgMF0sIGxvb2tBdE9mZnNldDogWy0wLjMsIC0wLjIsIC0xXSwgZm92OiA1Miwgcm9sbDogMC4xNCwgZWFzaW5nOiAnc21vb3Roc3RlcCcgfSxcbiAgICAgICAgeyBhdDogMSwgb2Zmc2V0OiBbMCwgMCwgMF0sIGxvb2tBdE9mZnNldDogWzAsIDAsIC0xXSwgZm92OiA0OCwgcm9sbDogMCwgZWFzaW5nOiAnc21vb3Roc3RlcCcgfSxcbiAgICAgIF0sXG4gICAgfTtcbiAgICBkcmFmdC5zZWN0aW9uc1tzZWN0aW9uSW5kZXhdLmNhbWVyYS5rZXlzID0gcmVjaXBlc1twcmVzZXRdO1xuICAgIGJyaWRnZUNhbWVyYVNlY3Rpb24oZHJhZnQsIHNlY3Rpb25JbmRleCk7XG4gIH0sIHsgc2VsZWN0aW9uOiB7IHR5cGU6ICdzZWN0aW9uJywgc2VjdGlvbklkOiBzZWN0aW9uLmlkIH0gfSk7XG4gIGNvbnN0IGV4aXN0aW5nS2V5QXRQbGF5aGVhZCA9IHNlY3Rpb24uY2FtZXJhLmtleXMuZmluZEluZGV4KChpdGVtKSA9PiAoXG4gICAgaXRlbS5hdCA+IDAgJiYgaXRlbS5hdCA8IDEgJiYgTWF0aC5hYnMoaXRlbS5hdCAtIHRhcmdldEF0KSA8IDAuMDAyNVxuICApKTtcbiAgY29uc3Qgc2V0S2V5ID0gKCkgPT4ge1xuICAgIGlmIChleGlzdGluZ0tleUF0UGxheWhlYWQgPj0gMCkge1xuICAgICAgc3RvcmUuc2V0U2VsZWN0aW9uKHsgdHlwZTogJ2NhbWVyYS1rZXknLCBzZWN0aW9uSWQ6IHNlY3Rpb24uaWQsIGtleUluZGV4OiBleGlzdGluZ0tleUF0UGxheWhlYWQgfSk7XG4gICAgICByZXR1cm47XG4gICAgfVxuICAgIGNvbnN0IGluc2VydGlvbkluZGV4ID0gc2VjdGlvbi5jYW1lcmEua2V5cy5maW5kSW5kZXgoKGl0ZW0pID0+IGl0ZW0uYXQgPiB0YXJnZXRBdCk7XG4gICAgY29uc3Qgc2VsZWN0ZWRLZXlJbmRleCA9IGluc2VydGlvbkluZGV4IDwgMCA/IHNlY3Rpb24uY2FtZXJhLmtleXMubGVuZ3RoIDogaW5zZXJ0aW9uSW5kZXg7XG4gICAgY29uc3Qgc2FtcGxlZCA9IHNhbXBsZUFib3V0TmFycmF0aXZlUGxhbihzbmFwc2hvdC5jb21waWxlZFBsYW4sIHNuYXBzaG90LnRyYW5zcG9ydC5zdG9yeVdVKTtcbiAgICBjb25zdCBiYXNlWiA9IHNuYXBzaG90LmRvY3VtZW50Lmdsb2JhbHMuY2FtZXJhLnN0YXJ0WiAtIChzbmFwc2hvdC50cmFuc3BvcnQuc3RvcnlXVSAqIHNhbXBsZWQuY2FtZXJhLmNhZGVuY2UpO1xuICAgIGNvbnN0IG5ld0tleSA9IHtcbiAgICAgIGF0OiB0YXJnZXRBdCxcbiAgICAgIG9mZnNldDogW3NhbXBsZWQuY2FtZXJhLnBvc2l0aW9uWzBdLCBzYW1wbGVkLmNhbWVyYS5wb3NpdGlvblsxXSwgc2FtcGxlZC5jYW1lcmEucG9zaXRpb25bMl0gLSBiYXNlWl0sXG4gICAgICBsb29rQXRPZmZzZXQ6IHNhbXBsZWQuY2FtZXJhLnRhcmdldC5tYXAoKHZhbHVlLCBheGlzKSA9PiB2YWx1ZSAtIHNhbXBsZWQuY2FtZXJhLnBvc2l0aW9uW2F4aXNdKSxcbiAgICAgIGZvdjogc2FtcGxlZC5jYW1lcmEuZm92LFxuICAgICAgcm9sbDogc2FtcGxlZC5jYW1lcmEucm9sbCxcbiAgICAgIGVhc2luZzogJ3Ntb290aHN0ZXAnLFxuICAgIH07XG4gICAgc3RvcmUuY29tbWl0KCdTZXQgY2FtZXJhIGtleScsIChkcmFmdCkgPT4ge1xuICAgICAgZHJhZnQuc2VjdGlvbnNbc2VjdGlvbkluZGV4XS5jYW1lcmEua2V5cy5wdXNoKG5ld0tleSk7XG4gICAgICBkcmFmdC5zZWN0aW9uc1tzZWN0aW9uSW5kZXhdLmNhbWVyYS5rZXlzLnNvcnQoKGEsIGIpID0+IGEuYXQgLSBiLmF0KTtcbiAgICB9LCB7IHNlbGVjdGlvbjogeyB0eXBlOiAnY2FtZXJhLWtleScsIHNlY3Rpb25JZDogc2VjdGlvbi5pZCwga2V5SW5kZXg6IHNlbGVjdGVkS2V5SW5kZXggfSB9KTtcbiAgfTtcbiAgY29uc3QgcmVjaXBlcyA9IDxkaXYgY2xhc3NOYW1lPVwiYWJvdXQtZWRpdG9yLWNhbWVyYS1yZWNpcGVzXCI+e1snUHVzaCcsICdHbGlkZScsICdPcmJpdCcsICdSZXZlYWwnLCAnUmVzb2x2ZSddLm1hcCgobmFtZSkgPT4gPGJ1dHRvbiB0eXBlPVwiYnV0dG9uXCIga2V5PXtuYW1lfSBvbkNsaWNrPXsoKSA9PiBhcHBseVByZXNldChuYW1lKX0+e25hbWV9PC9idXR0b24+KX08L2Rpdj47XG4gIGlmICgha2V5KSB7XG4gICAgcmV0dXJuIDw+PGhlYWRlcj48c3Bhbj5DYW1lcmEgdHJhY2s8L3NwYW4+PHN0cm9uZz5FZGl0aW5nIFNlY3Rpb24gYmFzZTwvc3Ryb25nPjwvaGVhZGVyPjxwIGNsYXNzTmFtZT1cImFib3V0LWVkaXRvci1oZWxwXCI+VGhlIGRvbGx5IGFuZCBTZWN0aW9uIGpvaW5zIGFyZSBjb250aW51b3VzIGF1dG9tYXRpY2FsbHkuIEFkZCB2aXNpYmxlIGtleXMgb25seSB3aGVyZSB0aGUgZnJhbWluZywgYWltLCByb2xsLCBvciBsZW5zIHNob3VsZCBjaGFuZ2UuPC9wPntyZWNpcGVzfTxidXR0b24gdHlwZT1cImJ1dHRvblwiIGNsYXNzTmFtZT1cImFib3V0LWVkaXRvci13aWRlLWFjdGlvblwiIG9uQ2xpY2s9e3NldEtleX0+U2V0IGNhbWVyYSBrZXkgYXQge2Zvcm1hdENhbWVyYVBlcmNlbnQodGFyZ2V0QXQpfTwvYnV0dG9uPjwvPjtcbiAgfVxuICBjb25zdCB1cGRhdGUgPSAoZmllbGQsIHZhbHVlKSA9PiBzdG9yZS5jb21taXQoYEVkaXQgY2FtZXJhICR7ZmllbGR9YCwgKGRyYWZ0KSA9PiB7XG4gICAgZHJhZnQuc2VjdGlvbnNbc2VjdGlvbkluZGV4XS5jYW1lcmEua2V5c1trZXlJbmRleF1bZmllbGRdID0gQXJyYXkuaXNBcnJheSh2YWx1ZSkgPyBbLi4udmFsdWVdIDogdmFsdWU7XG4gICAgaWYgKENBTUVSQV9QT1NFX0ZJRUxEUy5oYXMoZmllbGQpKSBsaW5rQ2FtZXJhQm91bmRhcnkoZHJhZnQsIHNlY3Rpb25JbmRleCwga2V5SW5kZXgpO1xuICB9LCB7IGNvYWxlc2NlS2V5OiBgY2FtZXJhOiR7c2VjdGlvbi5pZH06JHtrZXlJbmRleH06JHtmaWVsZH1gLCBzZWxlY3Rpb246IHNuYXBzaG90LnNlbGVjdGlvbiB9KTtcbiAgY29uc3QgdXBkYXRlVmVjdG9yID0gKGZpZWxkLCBheGlzLCB2YWx1ZSkgPT4ge1xuICAgIGNvbnN0IG5leHQgPSBbLi4ua2V5W2ZpZWxkXV07XG4gICAgbmV4dFtheGlzXSA9IHZhbHVlO1xuICAgIHVwZGF0ZShmaWVsZCwgbmV4dCk7XG4gIH07XG4gIGNvbnN0IHRpbWluZ0JvdW5kcyA9IGdldEFib3V0TmFycmF0aXZlQ2FtZXJhS2V5VGltaW5nQm91bmRzKHNlY3Rpb24uY2FtZXJhLmtleXMsIGtleUluZGV4KTtcbiAgY29uc3QgZXh0ZW50RmllbGQgPSBzbmFwc2hvdC5wcmV2aWV3UHJvZmlsZSA9PT0gJ21vYmlsZScgPyAnbW9iaWxlRXh0ZW50V1UnIDogJ2V4dGVudFdVJztcbiAgY29uc3QgZXh0ZW50TGFiZWwgPSBzbmFwc2hvdC5wcmV2aWV3UHJvZmlsZSA9PT0gJ21vYmlsZScgPyAnTW9iaWxlIGxlbmd0aCcgOiAnU2VjdGlvbiBsZW5ndGgnO1xuICBjb25zdCB1cGRhdGVFeHRlbnQgPSAodmFsdWUpID0+IHN0b3JlLmNvbW1pdCgnQ2hhbmdlIFNlY3Rpb24gZXh0ZW50JywgKGRyYWZ0KSA9PiB7XG4gICAgZHJhZnQuc2VjdGlvbnNbc2VjdGlvbkluZGV4XVtleHRlbnRGaWVsZF0gPSB2YWx1ZTtcbiAgfSwgeyBjb2FsZXNjZUtleTogYHNlY3Rpb246JHtzZWN0aW9uLmlkfToke2V4dGVudEZpZWxkfWAsIHNlbGVjdGlvbjogc25hcHNob3Quc2VsZWN0aW9uIH0pO1xuICByZXR1cm4gKFxuICAgIDw+XG4gICAgICA8aGVhZGVyPjxzcGFuPkNhbWVyYSBrZXk8L3NwYW4+PHN0cm9uZz57Zm9ybWF0Q2FtZXJhUGVyY2VudChrZXkuYXQpfSB0aHJvdWdoIHtzZWN0aW9uLmxhYmVsfTwvc3Ryb25nPjwvaGVhZGVyPlxuICAgICAge3JlY2lwZXN9XG4gICAgICA8TnVtYmVyUHJvcGVydHlcbiAgICAgICAgbGFiZWw9XCJQb3NpdGlvblwiXG4gICAgICAgIHZhbHVlPXtOdW1iZXIoKGtleS5hdCAqIDEwMCkudG9GaXhlZCgxKSl9XG4gICAgICAgIG1pbj17TnVtYmVyKCh0aW1pbmdCb3VuZHMubWluICogMTAwKS50b0ZpeGVkKDEpKX1cbiAgICAgICAgbWF4PXtOdW1iZXIoKHRpbWluZ0JvdW5kcy5tYXggKiAxMDApLnRvRml4ZWQoMSkpfVxuICAgICAgICBzdGVwPXswLjV9XG4gICAgICAgIHVuaXQ9XCIlXCJcbiAgICAgICAgb25DaGFuZ2U9eyh2YWx1ZSkgPT4gdXBkYXRlKCdhdCcsIE1hdGgubWluKHRpbWluZ0JvdW5kcy5tYXgsIE1hdGgubWF4KHRpbWluZ0JvdW5kcy5taW4sIHNuYXBBYm91dE5hcnJhdGl2ZVRpbWVsaW5lVmFsdWUodmFsdWUgLyAxMDApKSkpfVxuICAgICAgLz5cbiAgICAgIDxOdW1iZXJQcm9wZXJ0eSBsYWJlbD17ZXh0ZW50TGFiZWx9IHZhbHVlPXtzZWN0aW9uW2V4dGVudEZpZWxkXX0gbWluPXsxfSBtYXg9ezh9IHN0ZXA9ezAuMDV9IHVuaXQ9XCJXVVwiIG9uQ2hhbmdlPXt1cGRhdGVFeHRlbnR9IC8+XG4gICAgICB7WydYIG9mZnNldCcsICdZIG9mZnNldCcsICdGb3J3YXJkIG9mZnNldCddLm1hcCgobGFiZWwsIGF4aXMpID0+IDxOdW1iZXJQcm9wZXJ0eSBrZXk9e2xhYmVsfSBsYWJlbD17bGFiZWx9IHZhbHVlPXtrZXkub2Zmc2V0W2F4aXNdfSBtaW49ey04fSBtYXg9ezh9IHN0ZXA9ezAuMDJ9IHVuaXQ9XCJXVVwiIG9uQ2hhbmdlPXsodmFsdWUpID0+IHVwZGF0ZVZlY3Rvcignb2Zmc2V0JywgYXhpcywgdmFsdWUpfSAvPil9XG4gICAgICB7WydBaW0gWCcsICdBaW0gWScsICdBaW0gZGVwdGgnXS5tYXAoKGxhYmVsLCBheGlzKSA9PiA8TnVtYmVyUHJvcGVydHkga2V5PXtsYWJlbH0gbGFiZWw9e2xhYmVsfSB2YWx1ZT17a2V5Lmxvb2tBdE9mZnNldFtheGlzXX0gbWluPXstOH0gbWF4PXs4fSBzdGVwPXswLjAyfSB1bml0PVwiV1VcIiBvbkNoYW5nZT17KHZhbHVlKSA9PiB1cGRhdGVWZWN0b3IoJ2xvb2tBdE9mZnNldCcsIGF4aXMsIHZhbHVlKX0gLz4pfVxuICAgICAgPE51bWJlclByb3BlcnR5IGxhYmVsPVwiRmllbGQgb2Ygdmlld1wiIHZhbHVlPXtrZXkuZm92fSBtaW49ezIwfSBtYXg9ezkwfSBzdGVwPXsxfSB1bml0PVwiwrBcIiBvbkNoYW5nZT17KHZhbHVlKSA9PiB1cGRhdGUoJ2ZvdicsIHZhbHVlKX0gLz5cbiAgICAgIDxOdW1iZXJQcm9wZXJ0eSBsYWJlbD1cIlJvbGxcIiB2YWx1ZT17a2V5LnJvbGx9IG1pbj17LTEuMn0gbWF4PXsxLjJ9IHN0ZXA9ezAuMDF9IHVuaXQ9XCJyYWRcIiBvbkNoYW5nZT17KHZhbHVlKSA9PiB1cGRhdGUoJ3JvbGwnLCB2YWx1ZSl9IC8+XG4gICAgICA8UHJvcGVydHkgbGFiZWw9XCJFYXNpbmdcIj48c2VsZWN0IHZhbHVlPXtrZXkuZWFzaW5nfSBvbkNoYW5nZT17KGV2ZW50KSA9PiB1cGRhdGUoJ2Vhc2luZycsIGV2ZW50LnRhcmdldC52YWx1ZSl9PjxvcHRpb24gdmFsdWU9XCJzbW9vdGhzdGVwXCI+U21vb3Roc3RlcDwvb3B0aW9uPjxvcHRpb24gdmFsdWU9XCJlYXNlLWluLW91dFwiPkVhc2UgaW4gb3V0PC9vcHRpb24+PC9zZWxlY3Q+PC9Qcm9wZXJ0eT5cbiAgICAgIDxidXR0b24gdHlwZT1cImJ1dHRvblwiIGNsYXNzTmFtZT1cImFib3V0LWVkaXRvci13aWRlLWFjdGlvblwiIGRpc2FibGVkPXtleGlzdGluZ0tleUF0UGxheWhlYWQgPj0gMH0gb25DbGljaz17c2V0S2V5fT57ZXhpc3RpbmdLZXlBdFBsYXloZWFkID49IDAgPyBgQ2FtZXJhIGtleSBhbHJlYWR5IGF0ICR7Zm9ybWF0Q2FtZXJhUGVyY2VudCh0YXJnZXRBdCl9YCA6IGBTZXQgYW5vdGhlciBrZXkgYXQgJHtmb3JtYXRDYW1lcmFQZXJjZW50KHRhcmdldEF0KX1gfTwvYnV0dG9uPlxuICAgICAgPGJ1dHRvbiB0eXBlPVwiYnV0dG9uXCIgY2xhc3NOYW1lPVwiYWJvdXQtZWRpdG9yLWRhbmdlclwiIG9uQ2xpY2s9eygpID0+IHN0b3JlLmNvbW1pdCgnRGVsZXRlIGNhbWVyYSBrZXknLCAoZHJhZnQpID0+IHsgZHJhZnQuc2VjdGlvbnNbc2VjdGlvbkluZGV4XS5jYW1lcmEua2V5cy5zcGxpY2Uoa2V5SW5kZXgsIDEpOyB9LCB7IHNlbGVjdGlvbjogeyB0eXBlOiAnc2VjdGlvbicsIHNlY3Rpb25JZDogc2VjdGlvbi5pZCB9IH0pfT5EZWxldGUga2V5PC9idXR0b24+XG4gICAgPC8+XG4gICk7XG59XG5cbmNvbnN0IENPUlJFU1BPTkRFTkNFX0xBQkVMUyA9IE9iamVjdC5mcmVlemUoe1xuICAnaW5kZXgtdjEnOiAnSW5kZXggb3JkZXInLFxuICAnc3RhYmxlLXNlZWQnOiAnU3RhYmxlIHNlZWQnLFxuICAnc3BhdGlhbC1uZWFyZXN0LXYxJzogJ0xvY2FsIHRyYXZlbCAoYXBwcm94LiknLFxuICAnZ3JvdXAtYXdhcmUnOiAnR3JvdXAgYXdhcmUnLFxufSk7XG5cbmZ1bmN0aW9uIFdvcmxkSW5zcGVjdG9yKHsgc3RvcmUsIHNuYXBzaG90LCBzZWN0aW9uLCBydW50aW1lTWV0cmljcyB9KSB7XG4gIGNvbnN0IHNlY3Rpb25JbmRleCA9IGdldFNlY3Rpb25JbmRleChzbmFwc2hvdC5kb2N1bWVudCwgc2VjdGlvbi5pZCk7XG4gIGlmIChzZWN0aW9uLndvcmxkLm1vZGUgIT09ICdzZXQnKSB7XG4gICAgcmV0dXJuIDw+PGhlYWRlcj48c3Bhbj5Xb3JsZCB0cmFjazwvc3Bhbj48c3Ryb25nPkluaGVyaXRlZCBXb3JsZDwvc3Ryb25nPjwvaGVhZGVyPjxwIGNsYXNzTmFtZT1cImFib3V0LWVkaXRvci1oZWxwXCI+VGhpcyBTZWN0aW9uIGtlZXBzIHRoZSBwcmV2aW91cyBXb3JsZC4gQ2hvb3NlIOKAnENyZWF0ZSBXb3JsZCBjbGlw4oCdIG9ubHkgd2hlbiB0aGUgc2hhcGUgc2hvdWxkIGNoYW5nZSBoZXJlLjwvcD48YnV0dG9uIHR5cGU9XCJidXR0b25cIiBjbGFzc05hbWU9XCJhYm91dC1lZGl0b3Itd2lkZS1hY3Rpb25cIiBvbkNsaWNrPXsoKSA9PiBzdG9yZS5jb21taXQoJ0NyZWF0ZSBXb3JsZCBjbGlwJywgKGRyYWZ0KSA9PiB7XG4gICAgICBkcmFmdC5zZWN0aW9uc1tzZWN0aW9uSW5kZXhdLndvcmxkID0gY2xvbmVBYm91dE5hcnJhdGl2ZURvY3VtZW50KGRyYWZ0LnNlY3Rpb25zLnNsaWNlKDAsIHNlY3Rpb25JbmRleCkucmV2ZXJzZSgpLmZpbmQoKGl0ZW0pID0+IGl0ZW0ud29ybGQubW9kZSA9PT0gJ3NldCcpPy53b3JsZCB8fCBkcmFmdC5zZWN0aW9uc1swXS53b3JsZCk7XG4gICAgfSl9PkNyZWF0ZSBXb3JsZCBjbGlwPC9idXR0b24+PC8+O1xuICB9XG4gIGNvbnN0IHdvcmxkID0gc2VjdGlvbi53b3JsZDtcbiAgY29uc3Qgc2hhcGUgPSBBQk9VVF9OQVJSQVRJVkVfU0hBUEVfREVGSU5JVElPTlNbd29ybGQuc2hhcGVJZF07XG4gIGNvbnN0IHRyYW5zaXRpb25MaW1pdCA9IGdldEFib3V0TmFycmF0aXZlV29ybGRUcmFuc2l0aW9uTGltaXQoc25hcHNob3QuY29tcGlsZWRQbGFuLCBzZWN0aW9uSW5kZXgpO1xuICBjb25zdCB0cmFuc2l0aW9uTWF4ID0gTWF0aC5tYXgodHJhbnNpdGlvbkxpbWl0LCB3b3JsZC50cmFuc2l0aW9uSW4uZW5kLCAxKTtcbiAgY29uc3QgdHJhbnNpdGlvbkVuYWJsZWQgPSB3b3JsZC50cmFuc2l0aW9uSW4udHlwZSAhPT0gJ2N1dCc7XG4gIGNvbnN0IGNvcnJlc3BvbmRlbmNlRW5hYmxlZCA9IFsnbW9ycGgnLCAnZGlzc29sdmUtbW9ycGgnXS5pbmNsdWRlcyh3b3JsZC50cmFuc2l0aW9uSW4udHlwZSk7XG4gIGNvbnN0IHByZXZpb3VzV29ybGRTZWN0aW9uID0gc25hcHNob3QuZG9jdW1lbnQuc2VjdGlvbnNcbiAgICAuc2xpY2UoMCwgc2VjdGlvbkluZGV4KVxuICAgIC5yZXZlcnNlKClcbiAgICAuZmluZCgoaXRlbSkgPT4gaXRlbS53b3JsZC5tb2RlID09PSAnc2V0Jyk7XG4gIGNvbnN0IHNvdXJjZVNoYXBlID0gQUJPVVRfTkFSUkFUSVZFX1NIQVBFX0RFRklOSVRJT05TW3ByZXZpb3VzV29ybGRTZWN0aW9uPy53b3JsZC5zaGFwZUlkIHx8IHdvcmxkLnNoYXBlSWRdO1xuICBjb25zdCBwcmVwYXJlZCA9IHJ1bnRpbWVNZXRyaWNzPy5wcmVwYXJlZFdvcmxkSWRzPy5pbmNsdWRlcyhzZWN0aW9uLmlkKTtcbiAgY29uc3QgY29ycmVzcG9uZGVuY2VTdGF0dXMgPSBydW50aW1lTWV0cmljcz8uY29ycmVzcG9uZGVuY2VTZXF1ZW5jZVN0YXRlID09PSAnZmFpbGVkJ1xuICAgID8gJ0ZhaWxlZCdcbiAgICA6IHJ1bnRpbWVNZXRyaWNzPy5jb3JyZXNwb25kZW5jZVNlcXVlbmNlU3RhdGUgPT09ICdsb2FkaW5nJ1xuICAgICAgPyAnUHJlcGFyaW5nJ1xuICAgICAgOiBwcmVwYXJlZFxuICAgICAgICA/IHJ1bnRpbWVNZXRyaWNzPy5jb3JyZXNwb25kZW5jZUZhbGxiYWNrICYmIHJ1bnRpbWVNZXRyaWNzPy5jb3JyZXNwb25kZW5jZVRvV29ybGRJZCA9PT0gc2VjdGlvbi5pZFxuICAgICAgICAgID8gJ0Jhc2VsaW5lIGZhbGxiYWNrJ1xuICAgICAgICAgIDogJ1JlYWR5J1xuICAgICAgICA6ICdQcmVwYXJpbmcnO1xuICBjb25zdCB1cGRhdGUgPSAobGFiZWwsIG11dGF0ZSwgY29hbGVzY2VLZXkgPSBudWxsKSA9PiBzdG9yZS5jb21taXQobGFiZWwsIChkcmFmdCkgPT4gbXV0YXRlKGRyYWZ0LnNlY3Rpb25zW3NlY3Rpb25JbmRleF0ud29ybGQpLCB7IGNvYWxlc2NlS2V5LCBzZWxlY3Rpb246IHNuYXBzaG90LnNlbGVjdGlvbiB9KTtcbiAgY29uc3QgdHJ5U2hhcGUgPSAoc2hhcGVJZCkgPT4gc3RvcmUuYmVnaW5UcnkoYFJlcGxhY2UgU2hhcGUgd2l0aCAke0FCT1VUX05BUlJBVElWRV9TSEFQRV9ERUZJTklUSU9OU1tzaGFwZUlkXS5sYWJlbH1gLCAoZHJhZnQpID0+IHtcbiAgICBjb25zdCB0YXJnZXQgPSBkcmFmdC5zZWN0aW9uc1tzZWN0aW9uSW5kZXhdLndvcmxkO1xuICAgIHRhcmdldC5zaGFwZUlkID0gc2hhcGVJZDtcbiAgICB0YXJnZXQuc2hhcGVQYXJhbWV0ZXJzID0gT2JqZWN0LmZyb21FbnRyaWVzKEFCT1VUX05BUlJBVElWRV9TSEFQRV9ERUZJTklUSU9OU1tzaGFwZUlkXS5wYXJhbWV0ZXJzLm1hcCgoY29udHJvbCkgPT4gW2NvbnRyb2wuaWQsIGNvbnRyb2wuaWQgPT09ICdkZW5zaXR5JyA/IDEgOiAoY29udHJvbC5taW4gKyBjb250cm9sLm1heCkgLyAyXSkpO1xuICB9KTtcbiAgcmV0dXJuIChcbiAgICA8PlxuICAgICAgPGhlYWRlcj48c3Bhbj5Xb3JsZCBjbGlwPC9zcGFuPjxzdHJvbmc+e3NoYXBlPy5sYWJlbCB8fCB3b3JsZC5zaGFwZUlkfTwvc3Ryb25nPjwvaGVhZGVyPlxuICAgICAgPGRpdiBjbGFzc05hbWU9XCJhYm91dC1lZGl0b3Itc2hhcGUtY2F0YWxvZ1wiPlxuICAgICAgICB7T2JqZWN0LnZhbHVlcyhBQk9VVF9OQVJSQVRJVkVfU0hBUEVfREVGSU5JVElPTlMpLm1hcCgoaXRlbSkgPT4gKFxuICAgICAgICAgIDxidXR0b24gdHlwZT1cImJ1dHRvblwiIGtleT17aXRlbS5pZH0gZGlzYWJsZWQ9e3NlY3Rpb24ubG9ja2VkfSBjbGFzc05hbWU9e2l0ZW0uaWQgPT09IHdvcmxkLnNoYXBlSWQgPyAnaXMtc2VsZWN0ZWQnIDogJyd9IG9uQ2xpY2s9eygpID0+IHRyeVNoYXBlKGl0ZW0uaWQpfT5cbiAgICAgICAgICAgIDxpIC8+PHNwYW4+PHN0cm9uZz57aXRlbS5sYWJlbH08L3N0cm9uZz48c21hbGw+Q29zdCB7aXRlbS5jb3N0fSDCtyBQb2ludCBmaWVsZDwvc21hbGw+PC9zcGFuPlxuICAgICAgICAgIDwvYnV0dG9uPlxuICAgICAgICApKX1cbiAgICAgIDwvZGl2PlxuICAgICAge3NuYXBzaG90LnRyeVN0YXRlID8gPGRpdiBjbGFzc05hbWU9XCJhYm91dC1lZGl0b3ItdHJ5XCI+PHNwYW4+VHJ5aW5nIHtzbmFwc2hvdC50cnlTdGF0ZS5sYWJlbH08L3NwYW4+PGJ1dHRvbiB0eXBlPVwiYnV0dG9uXCIgb25DbGljaz17KCkgPT4gc3RvcmUuY2FuY2VsVHJ5KCl9PkNhbmNlbDwvYnV0dG9uPjxidXR0b24gdHlwZT1cImJ1dHRvblwiIGNsYXNzTmFtZT1cImlzLXByaW1hcnlcIiBvbkNsaWNrPXsoKSA9PiBzdG9yZS5hcHBseVRyeSgpfT5BcHBseTwvYnV0dG9uPjwvZGl2PiA6IG51bGx9XG4gICAgICA8ZGV0YWlscyBvcGVuPjxzdW1tYXJ5PlNoYXBlIHBhcmFtZXRlcnM8L3N1bW1hcnk+XG4gICAgICAgIHsoc2hhcGU/LnBhcmFtZXRlcnMgfHwgW10pLm1hcCgoY29udHJvbCkgPT4gPE51bWJlclByb3BlcnR5IGtleT17Y29udHJvbC5pZH0gbGFiZWw9e2NvbnRyb2wubGFiZWx9IHZhbHVlPXt3b3JsZC5zaGFwZVBhcmFtZXRlcnNbY29udHJvbC5pZF19IG1pbj17Y29udHJvbC5taW59IG1heD17Y29udHJvbC5tYXh9IHN0ZXA9e2NvbnRyb2wuc3RlcH0gdW5pdD17Y29udHJvbC51bml0fSBvbkNoYW5nZT17KHZhbHVlKSA9PiB1cGRhdGUoYENoYW5nZSAke2NvbnRyb2wubGFiZWx9YCwgKGRyYWZ0KSA9PiB7IGRyYWZ0LnNoYXBlUGFyYW1ldGVyc1tjb250cm9sLmlkXSA9IHZhbHVlOyB9LCBgd29ybGQ6JHtzZWN0aW9uLmlkfToke2NvbnRyb2wuaWR9YCl9IC8+KX1cbiAgICAgICAgPGRpdiBjbGFzc05hbWU9XCJhYm91dC1lZGl0b3ItaW5saW5lLWFjdGlvbnNcIj48YnV0dG9uIHR5cGU9XCJidXR0b25cIiBvbkNsaWNrPXsoKSA9PiB1cGRhdGUoJ1Jlc2VlZCBTaGFwZScsIChkcmFmdCkgPT4geyBkcmFmdC5zZWVkID0gTWF0aC5mbG9vcihNYXRoLnJhbmRvbSgpICogMHhmZmZmZmZmZik7IH0pfT5SZXNlZWQ8L2J1dHRvbj48Y29kZT57d29ybGQuc2VlZH08L2NvZGU+PC9kaXY+XG4gICAgICA8L2RldGFpbHM+XG4gICAgICA8ZGV0YWlscyBvcGVuPjxzdW1tYXJ5PlBsYWNlbWVudDwvc3VtbWFyeT5cbiAgICAgICAgPE51bWJlclByb3BlcnR5IGxhYmVsPVwiRGlzdGFuY2UgYXQgZW50cnlcIiB2YWx1ZT17d29ybGQuZW50cnlEaXN0YW5jZVdVfSBtaW49ezAuMn0gbWF4PXsxNn0gc3RlcD17MC4wNX0gdW5pdD1cIldVXCIgb25DaGFuZ2U9eyh2YWx1ZSkgPT4gdXBkYXRlKCdNb3ZlIFdvcmxkJywgKGRyYWZ0KSA9PiB7IGRyYWZ0LmVudHJ5RGlzdGFuY2VXVSA9IHZhbHVlOyB9LCBgd29ybGQ6JHtzZWN0aW9uLmlkfTpkaXN0YW5jZWApfSAvPlxuICAgICAgICA8TnVtYmVyUHJvcGVydHkgbGFiZWw9XCJTY2FsZVwiIHZhbHVlPXt3b3JsZC50cmFuc2Zvcm0uc2NhbGV9IG1pbj17MC4xfSBtYXg9ezN9IHN0ZXA9ezAuMDF9IG9uQ2hhbmdlPXsodmFsdWUpID0+IHVwZGF0ZSgnU2NhbGUgV29ybGQnLCAoZHJhZnQpID0+IHsgZHJhZnQudHJhbnNmb3JtLnNjYWxlID0gdmFsdWU7IH0sIGB3b3JsZDoke3NlY3Rpb24uaWR9OnNjYWxlYCl9IC8+XG4gICAgICA8L2RldGFpbHM+XG4gICAgICA8ZGV0YWlscyBvcGVuPjxzdW1tYXJ5PlRyYW5zaXRpb24gaW48L3N1bW1hcnk+XG4gICAgICAgIHt0cmFuc2l0aW9uRW5hYmxlZCA/IDw+XG4gICAgICAgICAgPHAgY2xhc3NOYW1lPVwiYWJvdXQtZWRpdG9yLWhlbHBcIj5UaW1pbmcgaXMgcmVsYXRpdmUgdG8gdGhpcyBTZWN0aW9uOiAxIGlzIGl0cyBlbmQ7IHZhbHVlcyBhYm92ZSAxIGNvbnRpbnVlIGFjcm9zcyBpbmhlcml0ZWQgV29ybGQgU2VjdGlvbnMuIFRoZSBuZXh0IFdvcmxkIGJlZ2lucyBhdCB7dHJhbnNpdGlvbkxpbWl0LnRvRml4ZWQoMyl9LjwvcD5cbiAgICAgICAgICA8TnVtYmVyUHJvcGVydHkgbGFiZWw9XCJTdGFydFwiIHZhbHVlPXt3b3JsZC50cmFuc2l0aW9uSW4uc3RhcnR9IG1pbj17MH0gbWF4PXt0cmFuc2l0aW9uTWF4fSBzdGVwPXswLjAwNX0gdW5pdD1cIsOXIHNlY3Rpb25cIiBvbkNoYW5nZT17KHZhbHVlKSA9PiB1cGRhdGUoJ0NoYW5nZSB0cmFuc2l0aW9uIHN0YXJ0JywgKGRyYWZ0KSA9PiB7IGRyYWZ0LnRyYW5zaXRpb25Jbi5zdGFydCA9IE1hdGgubWluKHZhbHVlLCBkcmFmdC50cmFuc2l0aW9uSW4uZW5kKTsgfSl9IC8+XG4gICAgICAgICAgPE51bWJlclByb3BlcnR5IGxhYmVsPVwiRW5kXCIgdmFsdWU9e3dvcmxkLnRyYW5zaXRpb25Jbi5lbmR9IG1pbj17MH0gbWF4PXt0cmFuc2l0aW9uTWF4fSBzdGVwPXswLjAwNX0gdW5pdD1cIsOXIHNlY3Rpb25cIiBvbkNoYW5nZT17KHZhbHVlKSA9PiB1cGRhdGUoJ0NoYW5nZSB0cmFuc2l0aW9uIGVuZCcsIChkcmFmdCkgPT4geyBkcmFmdC50cmFuc2l0aW9uSW4uZW5kID0gTWF0aC5tYXgodmFsdWUsIGRyYWZ0LnRyYW5zaXRpb25Jbi5zdGFydCk7IH0pfSAvPlxuICAgICAgICAgIDxQcm9wZXJ0eSBsYWJlbD1cIlR5cGVcIj48c2VsZWN0IHZhbHVlPXt3b3JsZC50cmFuc2l0aW9uSW4udHlwZX0gb25DaGFuZ2U9eyhldmVudCkgPT4gdXBkYXRlKCdDaGFuZ2UgdHJhbnNpdGlvbiB0eXBlJywgKGRyYWZ0KSA9PiB7IGRyYWZ0LnRyYW5zaXRpb25Jbi50eXBlID0gZXZlbnQudGFyZ2V0LnZhbHVlOyB9KX0+PG9wdGlvbiB2YWx1ZT1cIm1vcnBoXCI+TW9ycGg8L29wdGlvbj48b3B0aW9uIHZhbHVlPVwiZGlzc29sdmUtbW9ycGhcIj5EaXNzb2x2ZSBtb3JwaDwvb3B0aW9uPjxvcHRpb24gdmFsdWU9XCJjcm9zc2ZhZGVcIj5Dcm9zc2ZhZGU8L29wdGlvbj48b3B0aW9uIHZhbHVlPVwiaG9sZFwiPkhvbGQ8L29wdGlvbj48L3NlbGVjdD48L1Byb3BlcnR5PlxuICAgICAgICAgIDxQcm9wZXJ0eSBsYWJlbD1cIkVhc2luZ1wiPjxzZWxlY3QgdmFsdWU9e3dvcmxkLnRyYW5zaXRpb25Jbi5lYXNpbmd9IG9uQ2hhbmdlPXsoZXZlbnQpID0+IHVwZGF0ZSgnQ2hhbmdlIHRyYW5zaXRpb24gZWFzaW5nJywgKGRyYWZ0KSA9PiB7IGRyYWZ0LnRyYW5zaXRpb25Jbi5lYXNpbmcgPSBldmVudC50YXJnZXQudmFsdWU7IH0pfT48b3B0aW9uIHZhbHVlPVwibGluZWFyXCI+TGluZWFyPC9vcHRpb24+PG9wdGlvbiB2YWx1ZT1cInNtb290aHN0ZXBcIj5TbW9vdGhzdGVwPC9vcHRpb24+PG9wdGlvbiB2YWx1ZT1cImVhc2UtaW5cIj5FYXNlIGluPC9vcHRpb24+PG9wdGlvbiB2YWx1ZT1cImVhc2Utb3V0XCI+RWFzZSBvdXQ8L29wdGlvbj48b3B0aW9uIHZhbHVlPVwiZWFzZS1pbi1vdXRcIj5FYXNlIGluIG91dDwvb3B0aW9uPjxvcHRpb24gdmFsdWU9XCJob2xkXCI+SG9sZDwvb3B0aW9uPjwvc2VsZWN0PjwvUHJvcGVydHk+XG4gICAgICAgICAgPHAgY2xhc3NOYW1lPVwiYWJvdXQtZWRpdG9yLWhlbHBcIj5NYXBzIHtzb3VyY2VTaGFwZT8ubGFiZWwgfHwgJ3ByZXZpb3VzIFNoYXBlJ30g4oaSIHtzaGFwZT8ubGFiZWwgfHwgd29ybGQuc2hhcGVJZH0uPC9wPlxuICAgICAgICAgIDxQcm9wZXJ0eSBsYWJlbD1cIkNvcnJlc3BvbmRlbmNlXCI+PHNlbGVjdCBhcmlhLWxhYmVsPVwiQ29ycmVzcG9uZGVuY2VcIiB2YWx1ZT17d29ybGQudHJhbnNpdGlvbkluLmNvcnJlc3BvbmRlbmNlfSBkaXNhYmxlZD17IWNvcnJlc3BvbmRlbmNlRW5hYmxlZH0gdGl0bGU9e2NvcnJlc3BvbmRlbmNlRW5hYmxlZCA/ICdDaG9vc2UgaG93IHNvdXJjZSBwb2ludHMgYXJlIGFzc2lnbmVkIHRvIHRhcmdldCBwb2ludHMuJyA6ICdDb3JyZXNwb25kZW5jZSBhcHBsaWVzIHRvIE1vcnBoIGFuZCBEaXNzb2x2ZSBtb3JwaCB0cmFuc2l0aW9ucy4nfSBvbkNoYW5nZT17KGV2ZW50KSA9PiB1cGRhdGUoJ0NoYW5nZSBjb3JyZXNwb25kZW5jZScsIChkcmFmdCkgPT4geyBkcmFmdC50cmFuc2l0aW9uSW4uY29ycmVzcG9uZGVuY2UgPSBldmVudC50YXJnZXQudmFsdWU7IH0pfT57QUJPVVRfTkFSUkFUSVZFX0NPUlJFU1BPTkRFTkNFX01PREVTLm1hcCgobW9kZSkgPT4gPG9wdGlvbiB2YWx1ZT17bW9kZX0ga2V5PXttb2RlfT57Q09SUkVTUE9OREVOQ0VfTEFCRUxTW21vZGVdIHx8IG1vZGV9PC9vcHRpb24+KX08L3NlbGVjdD48L1Byb3BlcnR5PlxuICAgICAgICAgIDxwIGNsYXNzTmFtZT1cImFib3V0LWVkaXRvci1oZWxwXCIgcm9sZT1cInN0YXR1c1wiIGFyaWEtbGl2ZT1cInBvbGl0ZVwiPkNvcnJlc3BvbmRlbmNlOiB7Y29ycmVzcG9uZGVuY2VTdGF0dXN9e3ByZXBhcmVkICYmIHJ1bnRpbWVNZXRyaWNzPy5jb3JyZXNwb25kZW5jZVRvV29ybGRJZCA9PT0gc2VjdGlvbi5pZCAmJiBOdW1iZXIuaXNGaW5pdGUocnVudGltZU1ldHJpY3M/LmNvcnJlc3BvbmRlbmNlSW1wcm92ZW1lbnQpID8gYCDCtyAke01hdGgucm91bmQocnVudGltZU1ldHJpY3MuY29ycmVzcG9uZGVuY2VJbXByb3ZlbWVudCAqIDEwMCl9JSBSTVMgaW1wcm92ZW1lbnRgIDogJyd9LjwvcD5cbiAgICAgICAgICA8YnV0dG9uIHR5cGU9XCJidXR0b25cIiBjbGFzc05hbWU9XCJhYm91dC1lZGl0b3ItZGFuZ2VyXCIgb25DbGljaz17KCkgPT4gc3RvcmUuY29tbWl0KCdSZW1vdmUgV29ybGQgdHJhbnNpdGlvbicsIChkcmFmdCkgPT4ge1xuICAgICAgICAgICAgY29uc3QgdHJhbnNpdGlvbiA9IGRyYWZ0LnNlY3Rpb25zW3NlY3Rpb25JbmRleF0ud29ybGQudHJhbnNpdGlvbkluO1xuICAgICAgICAgICAgdHJhbnNpdGlvbi5zdGFydCA9IDA7XG4gICAgICAgICAgICB0cmFuc2l0aW9uLmVuZCA9IDA7XG4gICAgICAgICAgICB0cmFuc2l0aW9uLnR5cGUgPSAnY3V0JztcbiAgICAgICAgICB9LCB7IHNlbGVjdGlvbjogeyB0eXBlOiAnd29ybGQnLCBzZWN0aW9uSWQ6IHNlY3Rpb24uaWQgfSB9KX0+UmVtb3ZlIHRyYW5zaXRpb24ga2V5ZnJhbWVzPC9idXR0b24+XG4gICAgICAgIDwvPiA6IDw+XG4gICAgICAgICAgPHAgY2xhc3NOYW1lPVwiYWJvdXQtZWRpdG9yLWhlbHBcIj5UaGlzIFdvcmxkIGN1dHMgaW4gYXQgdGhlIFNlY3Rpb24gYm91bmRhcnkgYW5kIGhhcyBubyB0cmFuc2l0aW9uIGtleWZyYW1lcy48L3A+XG4gICAgICAgICAgPGJ1dHRvbiB0eXBlPVwiYnV0dG9uXCIgY2xhc3NOYW1lPVwiYWJvdXQtZWRpdG9yLXdpZGUtYWN0aW9uXCIgb25DbGljaz17KCkgPT4gc3RvcmUuY29tbWl0KCdBZGQgV29ybGQgdHJhbnNpdGlvbicsIChkcmFmdCkgPT4ge1xuICAgICAgICAgICAgY29uc3QgdHJhbnNpdGlvbiA9IGRyYWZ0LnNlY3Rpb25zW3NlY3Rpb25JbmRleF0ud29ybGQudHJhbnNpdGlvbkluO1xuICAgICAgICAgICAgdHJhbnNpdGlvbi5zdGFydCA9IE1hdGgubWluKDAuMDgsIHRyYW5zaXRpb25MaW1pdCk7XG4gICAgICAgICAgICB0cmFuc2l0aW9uLmVuZCA9IE1hdGgubWluKDAuNjgsIHRyYW5zaXRpb25MaW1pdCk7XG4gICAgICAgICAgICB0cmFuc2l0aW9uLnR5cGUgPSAnbW9ycGgnO1xuICAgICAgICAgIH0sIHsgc2VsZWN0aW9uOiB7IHR5cGU6ICd3b3JsZCcsIHNlY3Rpb25JZDogc2VjdGlvbi5pZCB9IH0pfT5BZGQgdHJhbnNpdGlvbiBrZXlmcmFtZXM8L2J1dHRvbj5cbiAgICAgICAgPC8+fVxuICAgICAgPC9kZXRhaWxzPlxuICAgICAgPGRldGFpbHMgb3Blbj48c3VtbWFyeT5Nb2RpZmllciBzdGFjazwvc3VtbWFyeT5cbiAgICAgICAge3dvcmxkLm1vZGlmaWVycy5tYXAoKGl0ZW0sIG1vZGlmaWVySW5kZXgpID0+IHtcbiAgICAgICAgICBjb25zdCBkZWZpbml0aW9uID0gQUJPVVRfTkFSUkFUSVZFX01PRElGSUVSX0RFRklOSVRJT05TW2l0ZW0uaWRdO1xuICAgICAgICAgIGNvbnN0IG1vdmVNb2RpZmllciA9IChkaXJlY3Rpb24pID0+IHVwZGF0ZSgnUmVvcmRlciBtb2RpZmllcicsIChkcmFmdCkgPT4ge1xuICAgICAgICAgICAgY29uc3QgbmV4dEluZGV4ID0gbW9kaWZpZXJJbmRleCArIGRpcmVjdGlvbjtcbiAgICAgICAgICAgIGlmIChuZXh0SW5kZXggPCAwIHx8IG5leHRJbmRleCA+PSBkcmFmdC5tb2RpZmllcnMubGVuZ3RoKSByZXR1cm47XG4gICAgICAgICAgICBjb25zdCBbbW92ZWRdID0gZHJhZnQubW9kaWZpZXJzLnNwbGljZShtb2RpZmllckluZGV4LCAxKTtcbiAgICAgICAgICAgIGRyYWZ0Lm1vZGlmaWVycy5zcGxpY2UobmV4dEluZGV4LCAwLCBtb3ZlZCk7XG4gICAgICAgICAgfSk7XG4gICAgICAgICAgcmV0dXJuIDxkaXYgY2xhc3NOYW1lPVwiYWJvdXQtZWRpdG9yLW1vZGlmaWVyXCIga2V5PXtgJHtpdGVtLmlkfS0ke21vZGlmaWVySW5kZXh9YH0+PGRpdj48bGFiZWw+PGlucHV0IHR5cGU9XCJjaGVja2JveFwiIGNoZWNrZWQ9e2l0ZW0uZW5hYmxlZH0gb25DaGFuZ2U9eyhldmVudCkgPT4gdXBkYXRlKGBUb2dnbGUgJHtkZWZpbml0aW9uPy5sYWJlbH1gLCAoZHJhZnQpID0+IHsgZHJhZnQubW9kaWZpZXJzW21vZGlmaWVySW5kZXhdLmVuYWJsZWQgPSBldmVudC50YXJnZXQuY2hlY2tlZDsgfSl9IC8+e2RlZmluaXRpb24/LmxhYmVsIHx8IGl0ZW0uaWR9PC9sYWJlbD48c3Bhbj48YnV0dG9uIHR5cGU9XCJidXR0b25cIiBkaXNhYmxlZD17bW9kaWZpZXJJbmRleCA9PT0gMH0gb25DbGljaz17KCkgPT4gbW92ZU1vZGlmaWVyKC0xKX0gYXJpYS1sYWJlbD1cIk1vdmUgbW9kaWZpZXIgdXBcIj7ihpE8L2J1dHRvbj48YnV0dG9uIHR5cGU9XCJidXR0b25cIiBkaXNhYmxlZD17bW9kaWZpZXJJbmRleCA9PT0gd29ybGQubW9kaWZpZXJzLmxlbmd0aCAtIDF9IG9uQ2xpY2s9eygpID0+IG1vdmVNb2RpZmllcigxKX0gYXJpYS1sYWJlbD1cIk1vdmUgbW9kaWZpZXIgZG93blwiPuKGkzwvYnV0dG9uPiBDb3N0IHtkZWZpbml0aW9uPy5jb3N0IHx8ICc/J308L3NwYW4+PC9kaXY+eyhkZWZpbml0aW9uPy5wYXJhbWV0ZXJzIHx8IFtdKS5tYXAoKGNvbnRyb2wpID0+IGNvbnRyb2wudHlwZSA9PT0gJ3JhbmdlJyA/IDxOdW1iZXJQcm9wZXJ0eSBrZXk9e2NvbnRyb2wuaWR9IGxhYmVsPXtjb250cm9sLmxhYmVsfSB2YWx1ZT17aXRlbS5wYXJhbWV0ZXJzW2NvbnRyb2wuaWRdfSBtaW49e2NvbnRyb2wubWlufSBtYXg9e2NvbnRyb2wubWF4fSBzdGVwPXtjb250cm9sLnN0ZXB9IHVuaXQ9e2NvbnRyb2wudW5pdH0gb25DaGFuZ2U9eyh2YWx1ZSkgPT4gdXBkYXRlKGBDaGFuZ2UgJHtjb250cm9sLmxhYmVsfWAsIChkcmFmdCkgPT4geyBkcmFmdC5tb2RpZmllcnNbbW9kaWZpZXJJbmRleF0ucGFyYW1ldGVyc1tjb250cm9sLmlkXSA9IHZhbHVlOyB9LCBgbW9kaWZpZXI6JHtzZWN0aW9uLmlkfToke21vZGlmaWVySW5kZXh9OiR7Y29udHJvbC5pZH1gKX0gLz4gOiA8UHJvcGVydHkga2V5PXtjb250cm9sLmlkfSBsYWJlbD17Y29udHJvbC5sYWJlbH0+PHNlbGVjdCB2YWx1ZT17aXRlbS5wYXJhbWV0ZXJzW2NvbnRyb2wuaWRdfSBvbkNoYW5nZT17KGV2ZW50KSA9PiB1cGRhdGUoYENoYW5nZSAke2NvbnRyb2wubGFiZWx9YCwgKGRyYWZ0KSA9PiB7IGRyYWZ0Lm1vZGlmaWVyc1ttb2RpZmllckluZGV4XS5wYXJhbWV0ZXJzW2NvbnRyb2wuaWRdID0gZXZlbnQudGFyZ2V0LnZhbHVlOyB9KX0+e2NvbnRyb2wub3B0aW9ucy5tYXAoKG9wdGlvbikgPT4gPG9wdGlvbiBrZXk9e29wdGlvbn0+e29wdGlvbn08L29wdGlvbj4pfTwvc2VsZWN0PjwvUHJvcGVydHk+KX08L2Rpdj47XG4gICAgICAgIH0pfVxuICAgICAgPC9kZXRhaWxzPlxuICAgIDwvPlxuICApO1xufVxuXG5mdW5jdGlvbiBEaWFnbm9zdGljcyh7IGRpYWdub3N0aWNzIH0pIHtcbiAgaWYgKCFkaWFnbm9zdGljcy5sZW5ndGgpIHJldHVybiA8ZGl2IGNsYXNzTmFtZT1cImFib3V0LWVkaXRvci1kaWFnbm9zdGljcyBpcy1jbGVhclwiPjxDaGVjayBhcmlhLWhpZGRlbj1cInRydWVcIiAvPiBObyBkaWFnbm9zdGljczwvZGl2PjtcbiAgcmV0dXJuIDxkaXYgY2xhc3NOYW1lPVwiYWJvdXQtZWRpdG9yLWRpYWdub3N0aWNzXCI+e2RpYWdub3N0aWNzLm1hcCgoaXRlbSwgaW5kZXgpID0+IHtcbiAgICBjb25zdCBEaWFnbm9zdGljSWNvbiA9IGl0ZW0ubGV2ZWwgPT09ICdlcnJvcicgPyBDaXJjbGVBbGVydCA6IEluZm87XG4gICAgcmV0dXJuIDxkaXYga2V5PXtgJHtpdGVtLmNvZGV9LSR7aXRlbS5wYXRofS0ke2luZGV4fWB9IGNsYXNzTmFtZT17YGlzLSR7aXRlbS5sZXZlbH1gfT48RGlhZ25vc3RpY0ljb24gYXJpYS1oaWRkZW49XCJ0cnVlXCIgLz48c3Bhbj48c3Ryb25nPntpdGVtLm1lc3NhZ2V9PC9zdHJvbmc+PHNtYWxsPntpdGVtLnBhdGh9PC9zbWFsbD48L3NwYW4+PC9kaXY+O1xuICB9KX08L2Rpdj47XG59XG5cbmZ1bmN0aW9uIEluc3BlY3Rvcih7IHN0b3JlLCBzbmFwc2hvdCwgdGltZWxpbmVPcGVuLCBydW50aW1lTWV0cmljcyB9KSB7XG4gIGNvbnN0IGluc3BlY3RvclJlZiA9IHVzZVJlZihudWxsKTtcbiAgY29uc3QgZHJhZ1JlZiA9IHVzZVJlZihudWxsKTtcbiAgY29uc3QgbGFzdEhlYWRlckNsaWNrUmVmID0gdXNlUmVmKG51bGwpO1xuICBjb25zdCBbcG9zaXRpb24sIHNldFBvc2l0aW9uXSA9IHVzZVN0YXRlKG51bGwpO1xuICBjb25zdCBbZHJhZ2dpbmcsIHNldERyYWdnaW5nXSA9IHVzZVN0YXRlKGZhbHNlKTtcbiAgY29uc3Qgc2VjdGlvbiA9IGdldFNlY3Rpb24oc25hcHNob3QuZG9jdW1lbnQsIHNuYXBzaG90LnNlbGVjdGlvbik7XG4gIGxldCBjb250ZW50ID0gPFNlY3Rpb25JbnNwZWN0b3Igc3RvcmU9e3N0b3JlfSBzbmFwc2hvdD17c25hcHNob3R9IHNlY3Rpb249e3NlY3Rpb259IC8+O1xuICBpZiAoc25hcHNob3Quc2VsZWN0aW9uLnR5cGUgPT09ICdzZXF1ZW5jZScpIGNvbnRlbnQgPSA8U2VxdWVuY2VJbnNwZWN0b3Igc3RvcmU9e3N0b3JlfSBzbmFwc2hvdD17c25hcHNob3R9IC8+O1xuICBpZiAoc25hcHNob3Quc2VsZWN0aW9uLnR5cGUgPT09ICdjdWUnKSBjb250ZW50ID0gPEN1ZUluc3BlY3RvciBzdG9yZT17c3RvcmV9IHNuYXBzaG90PXtzbmFwc2hvdH0gc2VjdGlvbj17c2VjdGlvbn0gLz47XG4gIGlmIChzbmFwc2hvdC5zZWxlY3Rpb24udHlwZSA9PT0gJ2Rpc2NpcGxpbmUtcmV2ZWFsJykgY29udGVudCA9IDxEaXNjaXBsaW5lUmV2ZWFsSW5zcGVjdG9yIHN0b3JlPXtzdG9yZX0gc25hcHNob3Q9e3NuYXBzaG90fSBzZWN0aW9uPXtzZWN0aW9ufSAvPjtcbiAgaWYgKHNuYXBzaG90LnNlbGVjdGlvbi50eXBlID09PSAnY2FtZXJhLWtleScpIGNvbnRlbnQgPSA8Q2FtZXJhSW5zcGVjdG9yIHN0b3JlPXtzdG9yZX0gc25hcHNob3Q9e3NuYXBzaG90fSBzZWN0aW9uPXtzZWN0aW9ufSAvPjtcbiAgaWYgKHNuYXBzaG90LnNlbGVjdGlvbi50eXBlID09PSAnd29ybGQnKSBjb250ZW50ID0gPFdvcmxkSW5zcGVjdG9yIHN0b3JlPXtzdG9yZX0gc25hcHNob3Q9e3NuYXBzaG90fSBzZWN0aW9uPXtzZWN0aW9ufSBydW50aW1lTWV0cmljcz17cnVudGltZU1ldHJpY3N9IC8+O1xuICBpZiAoc25hcHNob3Quc2VsZWN0aW9uLnR5cGUgPT09ICdpbnRlcmFjdGlvbicpIGNvbnRlbnQgPSA8U2VjdGlvbkluc3BlY3RvciBzdG9yZT17c3RvcmV9IHNuYXBzaG90PXtzbmFwc2hvdH0gc2VjdGlvbj17c2VjdGlvbn0gLz47XG5cbiAgdXNlRWZmZWN0KCgpID0+IHtcbiAgICBjb25zdCBrZWVwSW5Cb3VuZHMgPSAoKSA9PiB7XG4gICAgICBpZiAod2luZG93LmlubmVyV2lkdGggPCA3NjApIHtcbiAgICAgICAgc2V0UG9zaXRpb24obnVsbCk7XG4gICAgICAgIHJldHVybjtcbiAgICAgIH1cbiAgICAgIHNldFBvc2l0aW9uKChjdXJyZW50KSA9PiAoXG4gICAgICAgIGN1cnJlbnQgJiYgaW5zcGVjdG9yUmVmLmN1cnJlbnRcbiAgICAgICAgICA/IGNsYW1wSW5zcGVjdG9yUG9zaXRpb24oaW5zcGVjdG9yUmVmLmN1cnJlbnQsIGN1cnJlbnQsIHRpbWVsaW5lT3BlbilcbiAgICAgICAgICA6IGN1cnJlbnRcbiAgICAgICkpO1xuICAgIH07XG4gICAga2VlcEluQm91bmRzKCk7XG4gICAgd2luZG93LmFkZEV2ZW50TGlzdGVuZXIoJ3Jlc2l6ZScsIGtlZXBJbkJvdW5kcyk7XG4gICAgcmV0dXJuICgpID0+IHdpbmRvdy5yZW1vdmVFdmVudExpc3RlbmVyKCdyZXNpemUnLCBrZWVwSW5Cb3VuZHMpO1xuICB9LCBbdGltZWxpbmVPcGVuXSk7XG5cbiAgY29uc3QgYmVnaW5EcmFnID0gKGV2ZW50KSA9PiB7XG4gICAgaWYgKGV2ZW50LmJ1dHRvbiAhPT0gMCB8fCB3aW5kb3cuaW5uZXJXaWR0aCA8IDc2MCB8fCAhZXZlbnQudGFyZ2V0LmNsb3Nlc3QoJ2hlYWRlcicpKSByZXR1cm47XG4gICAgY29uc3QgaW5zcGVjdG9yID0gaW5zcGVjdG9yUmVmLmN1cnJlbnQ7XG4gICAgaWYgKCFpbnNwZWN0b3IpIHJldHVybjtcbiAgICBjb25zdCByZWN0ID0gaW5zcGVjdG9yLmdldEJvdW5kaW5nQ2xpZW50UmVjdCgpO1xuICAgIGNvbnN0IHsgbWluVG9wLCBtYXhCb3R0b20gfSA9IGdldEluc3BlY3RvclZlcnRpY2FsQm91bmRzKGluc3BlY3RvciwgdGltZWxpbmVPcGVuKTtcbiAgICBjb25zdCBhdmFpbGFibGVIZWlnaHQgPSBtYXhCb3R0b20gLSBtaW5Ub3A7XG4gICAgY29uc3QgZmxvYXRpbmdIZWlnaHQgPSBNYXRoLm1pbihyZWN0LmhlaWdodCwgNTYwLCBNYXRoLm1heCgyNDAsIGF2YWlsYWJsZUhlaWdodCAqIDAuNzIpKTtcbiAgICBjb25zdCBzdGFydCA9IGNsYW1wSW5zcGVjdG9yUG9zaXRpb24oaW5zcGVjdG9yLCB7XG4gICAgICBsZWZ0OiByZWN0LmxlZnQsXG4gICAgICB0b3A6IHJlY3QudG9wLFxuICAgICAgd2lkdGg6IHJlY3Qud2lkdGgsXG4gICAgICBoZWlnaHQ6IGZsb2F0aW5nSGVpZ2h0LFxuICAgIH0sIHRpbWVsaW5lT3Blbik7XG4gICAgZHJhZ1JlZi5jdXJyZW50ID0ge1xuICAgICAgcG9pbnRlcklkOiBldmVudC5wb2ludGVySWQsXG4gICAgICBvcmlnaW5YOiBldmVudC5jbGllbnRYLFxuICAgICAgb3JpZ2luWTogZXZlbnQuY2xpZW50WSxcbiAgICAgIHN0YXJ0LFxuICAgICAgbW92ZWQ6IGZhbHNlLFxuICAgIH07XG4gICAgaW5zcGVjdG9yLnNldFBvaW50ZXJDYXB0dXJlKGV2ZW50LnBvaW50ZXJJZCk7XG4gIH07XG5cbiAgY29uc3QgbW92ZURyYWcgPSAoZXZlbnQpID0+IHtcbiAgICBjb25zdCBkcmFnID0gZHJhZ1JlZi5jdXJyZW50O1xuICAgIGNvbnN0IGluc3BlY3RvciA9IGluc3BlY3RvclJlZi5jdXJyZW50O1xuICAgIGlmICghZHJhZyB8fCAhaW5zcGVjdG9yIHx8IGRyYWcucG9pbnRlcklkICE9PSBldmVudC5wb2ludGVySWQpIHJldHVybjtcbiAgICBjb25zdCBkZWx0YVggPSBldmVudC5jbGllbnRYIC0gZHJhZy5vcmlnaW5YO1xuICAgIGNvbnN0IGRlbHRhWSA9IGV2ZW50LmNsaWVudFkgLSBkcmFnLm9yaWdpblk7XG4gICAgaWYgKCFkcmFnLm1vdmVkICYmIE1hdGguaHlwb3QoZGVsdGFYLCBkZWx0YVkpIDwgMykgcmV0dXJuO1xuICAgIGRyYWcubW92ZWQgPSB0cnVlO1xuICAgIHNldERyYWdnaW5nKHRydWUpO1xuICAgIHNldFBvc2l0aW9uKGNsYW1wSW5zcGVjdG9yUG9zaXRpb24oaW5zcGVjdG9yLCB7XG4gICAgICAuLi5kcmFnLnN0YXJ0LFxuICAgICAgbGVmdDogZHJhZy5zdGFydC5sZWZ0ICsgZGVsdGFYLFxuICAgICAgdG9wOiBkcmFnLnN0YXJ0LnRvcCArIGRlbHRhWSxcbiAgICB9LCB0aW1lbGluZU9wZW4pKTtcbiAgfTtcblxuICBjb25zdCBlbmREcmFnID0gKGV2ZW50KSA9PiB7XG4gICAgY29uc3QgZHJhZyA9IGRyYWdSZWYuY3VycmVudDtcbiAgICBpZiAoZHJhZz8ucG9pbnRlcklkICE9PSBldmVudC5wb2ludGVySWQpIHJldHVybjtcbiAgICBpZiAoIWRyYWcubW92ZWQpIHtcbiAgICAgIGNvbnN0IG5vdyA9IHBlcmZvcm1hbmNlLm5vdygpO1xuICAgICAgY29uc3QgcHJldmlvdXMgPSBsYXN0SGVhZGVyQ2xpY2tSZWYuY3VycmVudDtcbiAgICAgIGlmIChwcmV2aW91cyAmJiBub3cgLSBwcmV2aW91cy50aW1lIDwgMzYwXG4gICAgICAgICYmIE1hdGguaHlwb3QoZXZlbnQuY2xpZW50WCAtIHByZXZpb3VzLngsIGV2ZW50LmNsaWVudFkgLSBwcmV2aW91cy55KSA8IDYpIHtcbiAgICAgICAgc2V0UG9zaXRpb24obnVsbCk7XG4gICAgICAgIGxhc3RIZWFkZXJDbGlja1JlZi5jdXJyZW50ID0gbnVsbDtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGxhc3RIZWFkZXJDbGlja1JlZi5jdXJyZW50ID0geyB0aW1lOiBub3csIHg6IGV2ZW50LmNsaWVudFgsIHk6IGV2ZW50LmNsaWVudFkgfTtcbiAgICAgIH1cbiAgICB9XG4gICAgZHJhZ1JlZi5jdXJyZW50ID0gbnVsbDtcbiAgICBzZXREcmFnZ2luZyhmYWxzZSk7XG4gICAgaWYgKGluc3BlY3RvclJlZi5jdXJyZW50Py5oYXNQb2ludGVyQ2FwdHVyZShldmVudC5wb2ludGVySWQpKSB7XG4gICAgICBpbnNwZWN0b3JSZWYuY3VycmVudC5yZWxlYXNlUG9pbnRlckNhcHR1cmUoZXZlbnQucG9pbnRlcklkKTtcbiAgICB9XG4gIH07XG5cbiAgY29uc3QgcmVzZXRQb3NpdGlvbiA9ICgpID0+IHNldFBvc2l0aW9uKG51bGwpO1xuXG4gIHJldHVybiAoXG4gICAgPGFzaWRlXG4gICAgICByZWY9e2luc3BlY3RvclJlZn1cbiAgICAgIGNsYXNzTmFtZT17YGFib3V0LWVkaXRvci1pbnNwZWN0b3Ike2RyYWdnaW5nID8gJyBpcy1kcmFnZ2luZycgOiAnJ31gfVxuICAgICAgZGF0YS1mbG9hdGluZz17cG9zaXRpb24gPyAndHJ1ZScgOiAnZmFsc2UnfVxuICAgICAgc3R5bGU9e3Bvc2l0aW9uID8ge1xuICAgICAgICBsZWZ0OiBwb3NpdGlvbi5sZWZ0LFxuICAgICAgICB0b3A6IHBvc2l0aW9uLnRvcCxcbiAgICAgICAgcmlnaHQ6ICdhdXRvJyxcbiAgICAgICAgYm90dG9tOiAnYXV0bycsXG4gICAgICAgIHdpZHRoOiBwb3NpdGlvbi53aWR0aCxcbiAgICAgICAgaGVpZ2h0OiBwb3NpdGlvbi5oZWlnaHQsXG4gICAgICB9IDogdW5kZWZpbmVkfVxuICAgICAgb25Qb2ludGVyRG93bj17YmVnaW5EcmFnfVxuICAgICAgb25Qb2ludGVyTW92ZT17bW92ZURyYWd9XG4gICAgICBvblBvaW50ZXJVcD17ZW5kRHJhZ31cbiAgICAgIG9uUG9pbnRlckNhbmNlbD17ZW5kRHJhZ31cbiAgICAgIG9uRG91YmxlQ2xpY2s9e3Jlc2V0UG9zaXRpb259XG4gICAgPjxkaXYgY2xhc3NOYW1lPVwiYWJvdXQtZWRpdG9yLWluc3BlY3Rvci1zY3JvbGxcIj57Y29udGVudH08RGlhZ25vc3RpY3MgZGlhZ25vc3RpY3M9e3NuYXBzaG90LmRpYWdub3N0aWNzfSAvPjwvZGl2PjwvYXNpZGU+XG4gICk7XG59XG5cbmZ1bmN0aW9uIENhbWVyYVBhdGhPdmVybGF5KHsgc25hcHNob3QgfSkge1xuICBjb25zdCBzZWN0aW9ucyA9IHNuYXBzaG90LmNvbXBpbGVkUGxhbj8uc2VjdGlvbnMgfHwgW107XG4gIGNvbnN0IHRvdGFsID0gc25hcHNob3QuY29tcGlsZWRQbGFuPy5tYXhTdG9yeVdVIHx8IDE7XG4gIHJldHVybiAoXG4gICAgPGRpdiBjbGFzc05hbWU9XCJhYm91dC1lZGl0b3ItcGF0aC1vdmVybGF5XCIgYXJpYS1sYWJlbD1cIkNhbWVyYSBwYXRoIG92ZXJsYXlcIj5cbiAgICAgIDxkaXY+PHN0cm9uZz5QYXRoIMK3IGNvbnN0YW50IGNhZGVuY2U8L3N0cm9uZz48c3Bhbj57Zm9ybWF0V1Uoc25hcHNob3QudHJhbnNwb3J0LnN0b3J5V1UpfSAvIHtmb3JtYXRXVSh0b3RhbCl9PC9zcGFuPjwvZGl2PlxuICAgICAgPHN2ZyB2aWV3Qm94PVwiMCAwIDI0MCAxMTJcIiByb2xlPVwiaW1nXCIgYXJpYS1sYWJlbD1cIkNhbWVyYSBhbmQgV29ybGQgYW5jaG9ycyBvdmVyIHN0b3J5IGRpc3RhbmNlXCI+XG4gICAgICAgIDxwYXRoIGQ9XCJNMTggNTYgSDIyMlwiIC8+XG4gICAgICAgIHtzZWN0aW9ucy5tYXAoKHNlY3Rpb24pID0+IHtcbiAgICAgICAgICBjb25zdCB4ID0gMTggKyAoKHNlY3Rpb24uc3RhcnRXVSAvIHRvdGFsKSAqIDIwNCk7XG4gICAgICAgICAgcmV0dXJuIDxnIGtleT17c2VjdGlvbi5pZH0gdHJhbnNmb3JtPXtgdHJhbnNsYXRlKCR7eH0gNTYpYH0+PGxpbmUgeTE9XCItMTJcIiB5Mj1cIjEyXCIgLz48Y2lyY2xlIHI9e3NlY3Rpb24ud29ybGRTdGF0ZT8uY2hhbmdlc1dvcmxkID8gNCA6IDJ9IC8+PHRpdGxlPntzZWN0aW9uLmxhYmVsfXtzZWN0aW9uLndvcmxkU3RhdGU/LmNoYW5nZXNXb3JsZCA/IGAgwrcgJHtzZWN0aW9uLndvcmxkU3RhdGUuYWN0aXZlV29ybGQuc2hhcGVJZH1gIDogJyd9PC90aXRsZT48L2c+O1xuICAgICAgICB9KX1cbiAgICAgICAgPGcgY2xhc3NOYW1lPVwiaXMtcGxheWhlYWRcIiB0cmFuc2Zvcm09e2B0cmFuc2xhdGUoJHsxOCArICgoc25hcHNob3QudHJhbnNwb3J0LnN0b3J5V1UgLyB0b3RhbCkgKiAyMDQpfSA1NilgfT48cGF0aCBkPVwiTTAgLTIyIEw1IC0xNSBILTUgWlwiIC8+PGxpbmUgeTE9XCItMTVcIiB5Mj1cIjIyXCIgLz48L2c+XG4gICAgICA8L3N2Zz5cbiAgICAgIDxzbWFsbD5Eb3RzIGFyZSBTZWN0aW9uIGJvdW5kYXJpZXMuIExhcmdlIGRvdHMgYXJlIGZpeGVkIFdvcmxkIGFuY2hvcnMuIFRoZSBtYXJrZXIgaXMgdGhlIHB1Ymxpc2hlZCBjYW1lcmEuPC9zbWFsbD5cbiAgICA8L2Rpdj5cbiAgKTtcbn1cblxuZXhwb3J0IGRlZmF1bHQgZnVuY3Rpb24gQWJvdXROYXJyYXRpdmVFZGl0b3IoeyBzdG9yZSwgcnVudGltZVJlZiwgcm9vdFJlZiB9KSB7XG4gIGNvbnN0IHNuYXBzaG90ID0gdXNlU3luY0V4dGVybmFsU3RvcmUoc3RvcmUuc3Vic2NyaWJlLCBzdG9yZS5nZXRTbmFwc2hvdCk7XG4gIGNvbnN0IFtjaGVja3BvaW50cywgc2V0Q2hlY2twb2ludHNdID0gdXNlU3RhdGUoKCkgPT4gcmVhZEFib3V0TmFycmF0aXZlQ2hlY2twb2ludHMoKSk7XG4gIGNvbnN0IFtydW50aW1lTWV0cmljcywgc2V0UnVudGltZU1ldHJpY3NdID0gdXNlU3RhdGUobnVsbCk7XG4gIGNvbnN0IFtwYXRoVmlzaWJsZSwgc2V0UGF0aFZpc2libGVdID0gdXNlU3RhdGUoZmFsc2UpO1xuICBjb25zdCBbZGlyZWN0b3JWaWV3LCBzZXREaXJlY3RvclZpZXddID0gdXNlU3RhdGUoZmFsc2UpO1xuICBjb25zdCBbbW9iaWxlUGFuZSwgc2V0TW9iaWxlUGFuZV0gPSB1c2VTdGF0ZSgnc2VxdWVuY2UnKTtcbiAgY29uc3QgW3RpbWVsaW5lT3Blbiwgc2V0VGltZWxpbmVPcGVuXSA9IHVzZVN0YXRlKCgpID0+IChcbiAgICB3aW5kb3cubG9jYWxTdG9yYWdlLmdldEl0ZW0oQUJPVVRfRURJVE9SX1RJTUVMSU5FX1NUT1JBR0VfS0VZKSAhPT0gJ2Nsb3NlZCdcbiAgKSk7XG4gIGNvbnN0IGltcG9ydFJlZiA9IHVzZVJlZihudWxsKTtcbiAgY29uc3Qgc25hcHNob3RSZWYgPSB1c2VSZWYoc25hcHNob3QpO1xuICBjb25zdCBhY3RpdmVTZWxlY3Rpb24gPSBzbmFwc2hvdC5zZWxlY3Rpb247XG5cbiAgdXNlRWZmZWN0KCgpID0+IHtcbiAgICBzbmFwc2hvdFJlZi5jdXJyZW50ID0gc25hcHNob3Q7XG4gIH0sIFtzbmFwc2hvdF0pO1xuXG4gIHVzZUVmZmVjdCgoKSA9PiB7XG4gICAgd2luZG93LmxvY2FsU3RvcmFnZS5zZXRJdGVtKEFCT1VUX0VESVRPUl9USU1FTElORV9TVE9SQUdFX0tFWSwgdGltZWxpbmVPcGVuID8gJ29wZW4nIDogJ2Nsb3NlZCcpO1xuICB9LCBbdGltZWxpbmVPcGVuXSk7XG5cbiAgdXNlRWZmZWN0KCgpID0+IHtcbiAgICBjb25zdCByb290ID0gcm9vdFJlZi5jdXJyZW50O1xuICAgIGNvbnN0IHJ1bnRpbWUgPSBydW50aW1lUmVmLmN1cnJlbnQ7XG4gICAgcm9vdD8uc2V0QXR0cmlidXRlKCdkYXRhLWVkaXRvci1hY3RpdmUnLCAndHJ1ZScpO1xuICAgIGxvYWRBYm91dE5hcnJhdGl2ZVNvdXJjZSgpLnRoZW4oKHsgZG9jdW1lbnQsIGhhc2ggfSkgPT4ge1xuICAgICAgY29uc3QgY3VycmVudCA9IHN0b3JlLmdldFNuYXBzaG90KCk7XG4gICAgICBpZiAoIWN1cnJlbnQuZGlydHkpIHN0b3JlLnJlcGxhY2VEb2N1bWVudCgnUmVmcmVzaCBjYW5vbmljYWwgc291cmNlJywgZG9jdW1lbnQpO1xuICAgICAgc3RvcmUuc2V0QmFzZWxpbmUoZG9jdW1lbnQsIGhhc2gpO1xuICAgICAgY29uc3QgcmVjb3ZlcnkgPSByZWFkQWJvdXROYXJyYXRpdmVSZWNvdmVyeURyYWZ0KCk7XG4gICAgICBpZiAocmVjb3ZlcnkgJiYgcmVjb3ZlcnkudGltZXN0YW1wID4gRGF0ZS5ub3coKSAtICgxNCAqIDg2NDAwMDAwKSkge1xuICAgICAgICBzdG9yZS5zZXRSZWNvdmVyeVN0YXRlKHsgYXZhaWxhYmxlOiB0cnVlLCBkcmFmdDogcmVjb3ZlcnksIGVycm9yOiAnJyB9KTtcbiAgICAgIH1cbiAgICB9KS5jYXRjaCgoZXJyb3IpID0+IHN0b3JlLnNldFNhdmVTdGF0ZSh7IHN0YXR1czogJ2ZhaWxlZCcsIG1lc3NhZ2U6IGVycm9yLm1lc3NhZ2UgfSkpO1xuICAgIHJldHVybiAoKSA9PiB7XG4gICAgICByb290Py5yZW1vdmVBdHRyaWJ1dGUoJ2RhdGEtZWRpdG9yLWFjdGl2ZScpO1xuICAgICAgcnVudGltZT8uc2V0RGlyZWN0b3JWaWV3Py4oZmFsc2UpO1xuICAgIH07XG4gIH0sIFtyb290UmVmLCBydW50aW1lUmVmLCBzdG9yZV0pO1xuXG4gIHVzZUVmZmVjdCgoKSA9PiB7XG4gICAgY29uc3Qgcm9vdCA9IHJvb3RSZWYuY3VycmVudDtcbiAgICBpZiAoIXJvb3QpIHJldHVybiB1bmRlZmluZWQ7XG4gICAgcm9vdC5xdWVyeVNlbGVjdG9yQWxsKCcuaXMtZWRpdG9yLXNlbGVjdGVkJykuZm9yRWFjaCgobm9kZSkgPT4gbm9kZS5jbGFzc0xpc3QucmVtb3ZlKCdpcy1lZGl0b3Itc2VsZWN0ZWQnKSk7XG4gICAgZ2V0QWJvdXROYXJyYXRpdmVTZWxlY3Rpb25NZW1iZXJzKGFjdGl2ZVNlbGVjdGlvbikuZm9yRWFjaCgobWVtYmVyKSA9PiB7XG4gICAgICByb290LnF1ZXJ5U2VsZWN0b3IoYFtkYXRhLXRleHQtY3VlPVwiJHtDU1MuZXNjYXBlKG1lbWJlci5jdWVJZCl9XCJdYCk/LmNsYXNzTGlzdC5hZGQoJ2lzLWVkaXRvci1zZWxlY3RlZCcpO1xuICAgIH0pO1xuICAgIHJvb3QuZGF0YXNldC5lZGl0b3JTZWxlY3Rpb25UeXBlID0gYWN0aXZlU2VsZWN0aW9uLnR5cGUgfHwgJyc7XG4gICAgcmV0dXJuICgpID0+IHtcbiAgICAgIHJvb3QucXVlcnlTZWxlY3RvckFsbCgnLmlzLWVkaXRvci1zZWxlY3RlZCcpLmZvckVhY2goKG5vZGUpID0+IG5vZGUuY2xhc3NMaXN0LnJlbW92ZSgnaXMtZWRpdG9yLXNlbGVjdGVkJykpO1xuICAgICAgZGVsZXRlIHJvb3QuZGF0YXNldC5lZGl0b3JTZWxlY3Rpb25UeXBlO1xuICAgIH07XG4gIH0sIFthY3RpdmVTZWxlY3Rpb24sIHJvb3RSZWZdKTtcblxuICB1c2VFZmZlY3QoKCkgPT4ge1xuICAgIGNvbnN0IGludGVydmFsID0gd2luZG93LnNldEludGVydmFsKCgpID0+IHNldFJ1bnRpbWVNZXRyaWNzKHJ1bnRpbWVSZWYuY3VycmVudD8uZ2V0TWV0cmljcz8uKCkgfHwgbnVsbCksIDUwMCk7XG4gICAgcmV0dXJuICgpID0+IHdpbmRvdy5jbGVhckludGVydmFsKGludGVydmFsKTtcbiAgfSwgW3J1bnRpbWVSZWZdKTtcblxuICB1c2VFZmZlY3QoKCkgPT4ge1xuICAgIGlmICghc25hcHNob3QuZGlydHkpIHJldHVybiB1bmRlZmluZWQ7XG4gICAgY29uc3QgdGltZXIgPSB3aW5kb3cuc2V0VGltZW91dCgoKSA9PiB7XG4gICAgICB0cnkge1xuICAgICAgICB3cml0ZUFib3V0TmFycmF0aXZlUmVjb3ZlcnlEcmFmdChzbmFwc2hvdC5kb2N1bWVudCwgc25hcHNob3QuYmFzZWxpbmVIYXNoKTtcbiAgICAgIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgICAgIHN0b3JlLnNldFJlY292ZXJ5U3RhdGUoeyBlcnJvcjogYERyYWZ0IHN0b3JhZ2UgZmFpbGVkOiAke2Vycm9yLm1lc3NhZ2V9YCB9KTtcbiAgICAgIH1cbiAgICB9LCA5MDApO1xuICAgIHJldHVybiAoKSA9PiB3aW5kb3cuY2xlYXJUaW1lb3V0KHRpbWVyKTtcbiAgfSwgW3NuYXBzaG90LmJhc2VsaW5lSGFzaCwgc25hcHNob3QuZGlydHksIHNuYXBzaG90LmRvY3VtZW50LCBzdG9yZV0pO1xuXG4gIHVzZUVmZmVjdCgoKSA9PiB7XG4gICAgY29uc3QgcGFnZWhpZGUgPSAoKSA9PiB7XG4gICAgICBjb25zdCBjdXJyZW50ID0gc25hcHNob3RSZWYuY3VycmVudDtcbiAgICAgIGlmIChjdXJyZW50LmRpcnR5KSB7XG4gICAgICAgIHRyeSB7IHdyaXRlQWJvdXROYXJyYXRpdmVSZWNvdmVyeURyYWZ0KGN1cnJlbnQuZG9jdW1lbnQsIGN1cnJlbnQuYmFzZWxpbmVIYXNoKTsgfSBjYXRjaCB7IC8qIHN1cmZhY2VkIGJ5IG5vcm1hbCBhdXRvc2F2ZSAqLyB9XG4gICAgICB9XG4gICAgfTtcbiAgICBjb25zdCBrZXlkb3duID0gKGV2ZW50KSA9PiB7XG4gICAgICBpZiAoKGV2ZW50Lm1ldGFLZXkgfHwgZXZlbnQuY3RybEtleSkgJiYgZXZlbnQua2V5LnRvTG93ZXJDYXNlKCkgPT09ICdzJykge1xuICAgICAgICBldmVudC5wcmV2ZW50RGVmYXVsdCgpO1xuICAgICAgICBkb2N1bWVudC5xdWVyeVNlbGVjdG9yKCdbZGF0YS1hYm91dC1lZGl0b3Itc2F2ZV0nKT8uY2xpY2soKTtcbiAgICAgIH1cbiAgICAgIGlmICgoZXZlbnQubWV0YUtleSB8fCBldmVudC5jdHJsS2V5KSAmJiBldmVudC5rZXkudG9Mb3dlckNhc2UoKSA9PT0gJ3onKSB7XG4gICAgICAgIGV2ZW50LnByZXZlbnREZWZhdWx0KCk7XG4gICAgICAgIGV2ZW50LnNoaWZ0S2V5ID8gc3RvcmUucmVkbygpIDogc3RvcmUudW5kbygpO1xuICAgICAgfVxuICAgICAgaWYgKCFldmVudC5tZXRhS2V5ICYmICFldmVudC5jdHJsS2V5ICYmICFldmVudC5hbHRLZXkgJiYgIWV2ZW50LnNoaWZ0S2V5XG4gICAgICAgICYmICFpc1RleHRFZGl0aW5nVGFyZ2V0KGV2ZW50LnRhcmdldCkgJiYgWydBcnJvd0xlZnQnLCAnQXJyb3dSaWdodCddLmluY2x1ZGVzKGV2ZW50LmtleSkpIHtcbiAgICAgICAgZXZlbnQucHJldmVudERlZmF1bHQoKTtcbiAgICAgICAganVtcFRpbWVsaW5lS2V5ZnJhbWUoc3RvcmUsIHN0b3JlLmdldFNuYXBzaG90KCksIGV2ZW50LmtleSA9PT0gJ0Fycm93UmlnaHQnID8gMSA6IC0xKTtcbiAgICAgIH1cbiAgICAgIGlmICghZXZlbnQubWV0YUtleSAmJiAhZXZlbnQuY3RybEtleSAmJiAhZXZlbnQuYWx0S2V5XG4gICAgICAgICYmICFpc1RleHRFZGl0aW5nVGFyZ2V0KGV2ZW50LnRhcmdldCkgJiYgWydCYWNrc3BhY2UnLCAnRGVsZXRlJ10uaW5jbHVkZXMoZXZlbnQua2V5KVxuICAgICAgICAmJiBkZWxldGVUaW1lbGluZVNlbGVjdGlvbihzdG9yZSwgc3RvcmUuZ2V0U25hcHNob3QoKSkpIHtcbiAgICAgICAgZXZlbnQucHJldmVudERlZmF1bHQoKTtcbiAgICAgIH1cbiAgICAgIGlmIChldmVudC5rZXkgPT09ICdFc2NhcGUnKSB7XG4gICAgICAgIGNvbnN0IGN1cnJlbnQgPSBzdG9yZS5nZXRTbmFwc2hvdCgpO1xuICAgICAgICBpZiAoY3VycmVudC5wcmV2aWV3U3RhdGUpIHN0b3JlLmNhbmNlbFByZXZpZXcoKTtcbiAgICAgICAgZWxzZSBpZiAoY3VycmVudC50cnlTdGF0ZSkgc3RvcmUuY2FuY2VsVHJ5KCk7XG4gICAgICAgIGVsc2UgaWYgKGdldEFib3V0TmFycmF0aXZlU2VsZWN0aW9uTWVtYmVycyhjdXJyZW50LnNlbGVjdGlvbikubGVuZ3RoID4gMSkge1xuICAgICAgICAgIHN0b3JlLnNldFNlbGVjdGlvbih7XG4gICAgICAgICAgICB0eXBlOiAnY3VlJyxcbiAgICAgICAgICAgIHNlY3Rpb25JZDogY3VycmVudC5zZWxlY3Rpb24uc2VjdGlvbklkLFxuICAgICAgICAgICAgY3VlSWQ6IGN1cnJlbnQuc2VsZWN0aW9uLmN1ZUlkLFxuICAgICAgICAgICAga2V5UGFydDogY3VycmVudC5zZWxlY3Rpb24ua2V5UGFydCB8fCAnZm9jdXMnLFxuICAgICAgICAgIH0pO1xuICAgICAgICB9XG4gICAgICAgIGVsc2UgaWYgKGN1cnJlbnQuc2VsZWN0aW9uLnR5cGUgIT09ICdzZWN0aW9uJykgc3RvcmUuc2V0U2VsZWN0aW9uKHsgdHlwZTogJ3NlY3Rpb24nLCBzZWN0aW9uSWQ6IGN1cnJlbnQuc2VsZWN0aW9uLnNlY3Rpb25JZCB9KTtcbiAgICAgICAgZWxzZSBzdG9yZS5zZXRTZWxlY3Rpb24oeyB0eXBlOiAnc2VxdWVuY2UnIH0pO1xuICAgICAgfVxuICAgIH07XG4gICAgd2luZG93LmFkZEV2ZW50TGlzdGVuZXIoJ3BhZ2VoaWRlJywgcGFnZWhpZGUpO1xuICAgIHdpbmRvdy5hZGRFdmVudExpc3RlbmVyKCdrZXlkb3duJywga2V5ZG93bik7XG4gICAgcmV0dXJuICgpID0+IHsgd2luZG93LnJlbW92ZUV2ZW50TGlzdGVuZXIoJ3BhZ2VoaWRlJywgcGFnZWhpZGUpOyB3aW5kb3cucmVtb3ZlRXZlbnRMaXN0ZW5lcigna2V5ZG93bicsIGtleWRvd24pOyB9O1xuICB9LCBbc3RvcmVdKTtcblxuICBjb25zdCBzYXZlID0gYXN5bmMgKCkgPT4ge1xuICAgIGNvbnN0IGVkaXRvclVybCA9IG5ldyBVUkwod2luZG93LmxvY2F0aW9uLmhyZWYpO1xuICAgIGVkaXRvclVybC5zZWFyY2hQYXJhbXMuc2V0KCdlZGl0JywgJzEnKTtcbiAgICB3aW5kb3cuaGlzdG9yeS5yZXBsYWNlU3RhdGUod2luZG93Lmhpc3Rvcnkuc3RhdGUsICcnLCBgJHtlZGl0b3JVcmwucGF0aG5hbWV9JHtlZGl0b3JVcmwuc2VhcmNofSR7ZWRpdG9yVXJsLmhhc2h9YCk7XG4gICAgY29uc3Qgc2VudCA9IGNsb25lQWJvdXROYXJyYXRpdmVEb2N1bWVudChzbmFwc2hvdC5kb2N1bWVudCk7XG4gICAgaWYgKHNuYXBzaG90LmRpYWdub3N0aWNzLnNvbWUoKGl0ZW0pID0+IGl0ZW0ubGV2ZWwgPT09ICdlcnJvcicpKSB7XG4gICAgICBzdG9yZS5zZXRTYXZlU3RhdGUoeyBzdGF0dXM6ICdmYWlsZWQnLCBtZXNzYWdlOiAnUmVzb2x2ZSB2YWxpZGF0aW9uIGVycm9ycyBiZWZvcmUgc2F2aW5nLicgfSk7XG4gICAgICByZXR1cm47XG4gICAgfVxuICAgIHN0b3JlLnNldFNhdmVTdGF0ZSh7IHN0YXR1czogJ3NhdmluZycsIG1lc3NhZ2U6ICcnIH0pO1xuICAgIHRyeSB7XG4gICAgICBjb25zdCByZXN1bHQgPSBhd2FpdCBzYXZlQWJvdXROYXJyYXRpdmVTb3VyY2Uoc2VudCwgc25hcHNob3QuYmFzZWxpbmVIYXNoKTtcbiAgICAgIHN0b3JlLm1hcmtTYXZlZChzZW50LCByZXN1bHQuaGFzaCk7XG4gICAgICBjbGVhckFib3V0TmFycmF0aXZlUmVjb3ZlcnlEcmFmdCgpO1xuICAgIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgICBzdG9yZS5zZXRTYXZlU3RhdGUoeyBzdGF0dXM6IGVycm9yLnN0YXR1cyA9PT0gNDA5ID8gJ2NvbmZsaWN0JyA6ICdmYWlsZWQnLCBtZXNzYWdlOiBlcnJvci5tZXNzYWdlIH0pO1xuICAgIH1cbiAgfTtcblxuICBjb25zdCBhZGRDaGVja3BvaW50ID0gKCkgPT4ge1xuICAgIGNvbnN0IGNoZWNrcG9pbnQgPSB7XG4gICAgICBpZDogY3J5cHRvLnJhbmRvbVVVSUQoKSxcbiAgICAgIG5hbWU6IGBDaGVja3BvaW50ICR7bmV3IERhdGUoKS50b0xvY2FsZVRpbWVTdHJpbmcoW10sIHsgaG91cjogJzItZGlnaXQnLCBtaW51dGU6ICcyLWRpZ2l0JyB9KX1gLFxuICAgICAgdGltZXN0YW1wOiBEYXRlLm5vdygpLFxuICAgICAgc3RvcnlXVTogc25hcHNob3QudHJhbnNwb3J0LnN0b3J5V1UsXG4gICAgICBiYXNlU291cmNlSGFzaDogc25hcHNob3QuYmFzZWxpbmVIYXNoLFxuICAgICAgZG9jdW1lbnQ6IHNuYXBzaG90LmRvY3VtZW50LFxuICAgIH07XG4gICAgc2V0Q2hlY2twb2ludHMod3JpdGVBYm91dE5hcnJhdGl2ZUNoZWNrcG9pbnQoY2hlY2twb2ludCkpO1xuICB9O1xuICBjb25zdCBzdGF0dXNMYWJlbCA9IHNuYXBzaG90LnNhdmVTdGF0ZS5zdGF0dXMgPT09ICdzYXZpbmcnID8gJ1NhdmluZ+KApidcbiAgICA6IHNuYXBzaG90LnNhdmVTdGF0ZS5zdGF0dXMgPT09ICdjb25mbGljdCcgPyAnU291cmNlIGNoYW5nZWQnXG4gICAgICA6IHNuYXBzaG90LnNhdmVTdGF0ZS5zdGF0dXMgPT09ICdmYWlsZWQnID8gJ1NhdmUgZmFpbGVkJ1xuICAgICAgICA6IHNuYXBzaG90LmRpcnR5ID8gJ0RyYWZ0JyA6ICdTYXZlZCc7XG4gIGNvbnN0IHNlbGVjdGVkID0gZ2V0U2VjdGlvbihzbmFwc2hvdC5kb2N1bWVudCwgc25hcHNob3Quc2VsZWN0aW9uKTtcbiAgY29uc3QgY29tcGlsZWRTZWxlY3RlZCA9IHNuYXBzaG90LmNvbXBpbGVkUGxhbj8uc2VjdGlvbnMuZmluZCgoc2VjdGlvbikgPT4gc2VjdGlvbi5pZCA9PT0gc2VsZWN0ZWQ/LmlkKTtcbiAgY29uc3QgcmVzb2x2ZWRFeHRlbnQgPSBjb21waWxlZFNlbGVjdGVkPy5yZXNvbHZlZEV4dGVudFdVIHx8IHNlbGVjdGVkPy5leHRlbnRXVSB8fCAwO1xuICBjb25zdCBzZWxlY3RlZEV4dGVudCA9IHNlbGVjdGVkXG4gICAgPyBOdW1iZXIoc25hcHNob3QucHJldmlld1Byb2ZpbGUgPT09ICdtb2JpbGUnID8gc2VsZWN0ZWQubW9iaWxlRXh0ZW50V1UgOiBzZWxlY3RlZC5leHRlbnRXVSlcbiAgICA6IDA7XG4gIGNvbnN0IHNlbGVjdGVkQ3VlQ291bnQgPSBnZXRBYm91dE5hcnJhdGl2ZVNlbGVjdGlvbk1lbWJlcnMoc25hcHNob3Quc2VsZWN0aW9uKS5sZW5ndGg7XG4gIGNvbnN0IGxvb3BBY3RpdmUgPSBCb29sZWFuKHNuYXBzaG90LnRyYW5zcG9ydC5sb29wPy5zZWN0aW9uSWQgPT09IHNlbGVjdGVkPy5pZCk7XG4gIGNvbnN0IHRpbWVsaW5lRGVsZXRpb24gPSBnZXRUaW1lbGluZURlbGV0aW9uKHNuYXBzaG90KTtcbiAgY29uc3QgdG9nZ2xlTG9vcCA9ICgpID0+IHN0b3JlLnNldFRyYW5zcG9ydCh7XG4gICAgbG9vcDogbG9vcEFjdGl2ZSB8fCAhY29tcGlsZWRTZWxlY3RlZCA/IG51bGwgOiB7XG4gICAgICBzZWN0aW9uSWQ6IHNlbGVjdGVkLmlkLFxuICAgICAgc3RhcnRXVTogY29tcGlsZWRTZWxlY3RlZC5zdGFydFdVLFxuICAgICAgZW5kV1U6IGNvbXBpbGVkU2VsZWN0ZWQuc3RhcnRXVSArIGNvbXBpbGVkU2VsZWN0ZWQudHJhdmVsV1UsXG4gICAgfSxcbiAgfSk7XG4gIGNvbnN0IHRvZ2dsZVNvbG8gPSAodHJhY2spID0+IHN0b3JlLnNldFRyYW5zcG9ydCh7XG4gICAgc29sb1RyYWNrOiBzbmFwc2hvdC50cmFuc3BvcnQuc29sb1RyYWNrID09PSB0cmFjayA/IG51bGwgOiB0cmFjayxcbiAgfSk7XG4gIGNvbnN0IGZpdFNlcXVlbmNlID0gKCkgPT4ge1xuICAgIHN0b3JlLnNldFRyYW5zcG9ydCh7IHpvb206IDEgfSk7XG4gICAgcmVxdWVzdEFuaW1hdGlvbkZyYW1lKCgpID0+IHtcbiAgICAgIGNvbnN0IGxhbmVzID0gZG9jdW1lbnQucXVlcnlTZWxlY3RvcignLmFib3V0LWVkaXRvci1sYW5lcycpO1xuICAgICAgaWYgKGxhbmVzKSBsYW5lcy5zY3JvbGxMZWZ0ID0gMDtcbiAgICB9KTtcbiAgfTtcbiAgY29uc3QgZml0U2VjdGlvbiA9ICgpID0+IHtcbiAgICBpZiAoIWNvbXBpbGVkU2VsZWN0ZWQgfHwgIXNuYXBzaG90LmNvbXBpbGVkUGxhbj8ubWF4U3RvcnlXVSkgcmV0dXJuO1xuICAgIGNvbnN0IHNlY3Rpb25TcGFuID0gTWF0aC5tYXgoMC4wMDEsIGNvbXBpbGVkU2VsZWN0ZWQucmVzb2x2ZWRFeHRlbnRXVSk7XG4gICAgY29uc3Qgem9vbSA9IE1hdGgubWluKDgsIE1hdGgubWF4KDEsIChzbmFwc2hvdC5jb21waWxlZFBsYW4ubWF4U3RvcnlXVSAvIHNlY3Rpb25TcGFuKSAqIDAuODIpKTtcbiAgICBzdG9yZS5zZXRUcmFuc3BvcnQoeyB6b29tOiBOdW1iZXIoem9vbS50b0ZpeGVkKDMpKSB9KTtcbiAgICByZXF1ZXN0QW5pbWF0aW9uRnJhbWUoKCkgPT4ge1xuICAgICAgY29uc3QgbGFuZXMgPSBkb2N1bWVudC5xdWVyeVNlbGVjdG9yKCcuYWJvdXQtZWRpdG9yLWxhbmVzJyk7XG4gICAgICBpZiAoIWxhbmVzKSByZXR1cm47XG4gICAgICBjb25zdCBzdGFydFJhdGlvID0gY29tcGlsZWRTZWxlY3RlZC5zdGFydFdVIC8gc25hcHNob3QuY29tcGlsZWRQbGFuLm1heFN0b3J5V1U7XG4gICAgICBsYW5lcy5zY3JvbGxMZWZ0ID0gTWF0aC5tYXgoMCwgKHN0YXJ0UmF0aW8gKiBsYW5lcy5zY3JvbGxXaWR0aCkgLSAobGFuZXMuY2xpZW50V2lkdGggKiAwLjA4KSk7XG4gICAgfSk7XG4gIH07XG4gIGNvbnN0IHRvZ2dsZURpcmVjdG9yID0gKCkgPT4ge1xuICAgIGNvbnN0IG5leHQgPSAhZGlyZWN0b3JWaWV3O1xuICAgIHNldERpcmVjdG9yVmlldyhuZXh0KTtcbiAgICBydW50aW1lUmVmLmN1cnJlbnQ/LnNldERpcmVjdG9yVmlldz8uKG5leHQpO1xuICB9O1xuICBjb25zdCB0b2dnbGVCZWZvcmUgPSAoKSA9PiB7XG4gICAgaWYgKHNuYXBzaG90LnRyeVN0YXRlPy5sYWJlbCA9PT0gJ0NvbXBhcmUgc2F2ZWQgc291cmNlJykge1xuICAgICAgc3RvcmUuY2FuY2VsVHJ5KCk7XG4gICAgICByZXR1cm47XG4gICAgfVxuICAgIGlmIChzbmFwc2hvdC50cnlTdGF0ZSkgcmV0dXJuO1xuICAgIHN0b3JlLmJlZ2luVHJ5KCdDb21wYXJlIHNhdmVkIHNvdXJjZScsIChkcmFmdCkgPT4ge1xuICAgICAgT2JqZWN0LmtleXMoZHJhZnQpLmZvckVhY2goKGtleSkgPT4gZGVsZXRlIGRyYWZ0W2tleV0pO1xuICAgICAgT2JqZWN0LmFzc2lnbihkcmFmdCwgY2xvbmVBYm91dE5hcnJhdGl2ZURvY3VtZW50KHNuYXBzaG90LmJhc2VsaW5lRG9jdW1lbnQpKTtcbiAgICB9KTtcbiAgfTtcblxuICByZXR1cm4gY3JlYXRlUG9ydGFsKChcbiAgICA8ZGl2XG4gICAgICBjbGFzc05hbWU9XCJhYm91dC1lZGl0b3JcIlxuICAgICAgZGF0YS1tb2JpbGUtcGFuZT17bW9iaWxlUGFuZX1cbiAgICAgIGRhdGEtdGltZWxpbmUtb3Blbj17dGltZWxpbmVPcGVuID8gJ3RydWUnIDogJ2ZhbHNlJ31cbiAgICAgIHJvbGU9XCJyZWdpb25cIlxuICAgICAgYXJpYS1sYWJlbD1cIkFib3V0IE5hcnJhdGl2ZSBjcmVhdGl2ZSB0b29sa2l0XCJcbiAgICA+XG4gICAgICA8aGVhZGVyIGNsYXNzTmFtZT1cImFib3V0LWVkaXRvci10b3BiYXJcIj5cbiAgICAgICAgPGJ1dHRvbiB0eXBlPVwiYnV0dG9uXCIgY2xhc3NOYW1lPVwiYWJvdXQtZWRpdG9yLWJyYW5kXCIgb25DbGljaz17KCkgPT4gc3RvcmUuc2V0U2VsZWN0aW9uKHsgdHlwZTogJ3NlcXVlbmNlJyB9KX0+PERpYW1vbmQgYXJpYS1oaWRkZW49XCJ0cnVlXCIgLz48c3Bhbj5BYm91dCBOYXJyYXRpdmU8L3NwYW4+PHNtYWxsPkNyZWF0aXZlIHRvb2xraXQ8L3NtYWxsPjwvYnV0dG9uPlxuICAgICAgICA8VHJhbnNwb3J0IHN0b3JlPXtzdG9yZX0gc25hcHNob3Q9e3NuYXBzaG90fSAvPlxuICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cImFib3V0LWVkaXRvci1hY3Rpb25zXCI+XG4gICAgICAgICAgPGJ1dHRvbiB0eXBlPVwiYnV0dG9uXCIgZGlzYWJsZWQ9eyFzbmFwc2hvdC5oaXN0b3J5LmNhblVuZG99IHRpdGxlPXtzbmFwc2hvdC5oaXN0b3J5LnVuZG9MYWJlbCB8fCAnVW5kbyd9IGFyaWEtbGFiZWw9XCJVbmRvXCIgb25DbGljaz17KCkgPT4gc3RvcmUudW5kbygpfT48c3BhbiBhcmlhLWhpZGRlbj1cInRydWVcIj7ihrY8L3NwYW4+PC9idXR0b24+XG4gICAgICAgICAgPGJ1dHRvbiB0eXBlPVwiYnV0dG9uXCIgZGlzYWJsZWQ9eyFzbmFwc2hvdC5oaXN0b3J5LmNhblJlZG99IHRpdGxlPXtzbmFwc2hvdC5oaXN0b3J5LnJlZG9MYWJlbCB8fCAnUmVkbyd9IGFyaWEtbGFiZWw9XCJSZWRvXCIgb25DbGljaz17KCkgPT4gc3RvcmUucmVkbygpfT48c3BhbiBhcmlhLWhpZGRlbj1cInRydWVcIj7ihrc8L3NwYW4+PC9idXR0b24+XG4gICAgICAgICAgPGJ1dHRvbiB0eXBlPVwiYnV0dG9uXCIgY2xhc3NOYW1lPXtwYXRoVmlzaWJsZSA/ICdpcy1hY3RpdmUnIDogJyd9IG9uQ2xpY2s9eygpID0+IHNldFBhdGhWaXNpYmxlKCFwYXRoVmlzaWJsZSl9PlBhdGg8L2J1dHRvbj5cbiAgICAgICAgICA8YnV0dG9uIHR5cGU9XCJidXR0b25cIiBjbGFzc05hbWU9e2RpcmVjdG9yVmlldyA/ICdpcy1hY3RpdmUnIDogJyd9IG9uQ2xpY2s9e3RvZ2dsZURpcmVjdG9yfT57ZGlyZWN0b3JWaWV3ID8gJ0RpcmVjdG9yJyA6ICdDYW1lcmEnfTwvYnV0dG9uPlxuICAgICAgICAgIDxidXR0b24gdHlwZT1cImJ1dHRvblwiIGNsYXNzTmFtZT17c25hcHNob3QudHJ5U3RhdGU/LmxhYmVsID09PSAnQ29tcGFyZSBzYXZlZCBzb3VyY2UnID8gJ2lzLWFjdGl2ZScgOiAnJ30gZGlzYWJsZWQ9e3NuYXBzaG90LnRyeVN0YXRlICYmIHNuYXBzaG90LnRyeVN0YXRlLmxhYmVsICE9PSAnQ29tcGFyZSBzYXZlZCBzb3VyY2UnfSBvbkNsaWNrPXt0b2dnbGVCZWZvcmV9PntzbmFwc2hvdC50cnlTdGF0ZT8ubGFiZWwgPT09ICdDb21wYXJlIHNhdmVkIHNvdXJjZScgPyAnQmVmb3JlJyA6ICdBZnRlcid9PC9idXR0b24+XG4gICAgICAgICAgPGRldGFpbHMgY2xhc3NOYW1lPVwiYWJvdXQtZWRpdG9yLW1vcmVcIj5cbiAgICAgICAgICAgIDxzdW1tYXJ5Pk1vcmU8L3N1bW1hcnk+XG4gICAgICAgICAgICA8ZGl2PlxuICAgICAgICAgICAgICA8YnV0dG9uIHR5cGU9XCJidXR0b25cIiBvbkNsaWNrPXthZGRDaGVja3BvaW50fT5DaGVja3BvaW50PC9idXR0b24+XG4gICAgICAgICAgICAgIDxidXR0b24gdHlwZT1cImJ1dHRvblwiIG9uQ2xpY2s9eygpID0+IGV4cG9ydEFib3V0TmFycmF0aXZlRG9jdW1lbnQoc25hcHNob3QuZG9jdW1lbnQpfT5FeHBvcnQgSlNPTjwvYnV0dG9uPlxuICAgICAgICAgICAgICA8YnV0dG9uIHR5cGU9XCJidXR0b25cIiBvbkNsaWNrPXsoKSA9PiBpbXBvcnRSZWYuY3VycmVudD8uY2xpY2soKX0+SW1wb3J0IEpTT048L2J1dHRvbj5cbiAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgIDwvZGV0YWlscz5cbiAgICAgICAgICA8aW5wdXQgcmVmPXtpbXBvcnRSZWZ9IGhpZGRlbiB0eXBlPVwiZmlsZVwiIGFjY2VwdD1cImFwcGxpY2F0aW9uL2pzb25cIiBvbkNoYW5nZT17YXN5bmMgKGV2ZW50KSA9PiB7XG4gICAgICAgICAgICBjb25zdCBmaWxlID0gZXZlbnQudGFyZ2V0LmZpbGVzPy5bMF07XG4gICAgICAgICAgICBpZiAoIWZpbGUpIHJldHVybjtcbiAgICAgICAgICAgIHRyeSB7XG4gICAgICAgICAgICAgIGNvbnN0IGltcG9ydGVkID0gSlNPTi5wYXJzZShhd2FpdCBmaWxlLnRleHQoKSk7XG4gICAgICAgICAgICAgIGFzc2VydFZhbGlkQWJvdXROYXJyYXRpdmVEb2N1bWVudChpbXBvcnRlZCk7XG4gICAgICAgICAgICAgIHN0b3JlLnJlcGxhY2VEb2N1bWVudCgnSW1wb3J0IGRvY3VtZW50JywgaW1wb3J0ZWQpO1xuICAgICAgICAgICAgfSBjYXRjaCAoZXJyb3IpIHsgc3RvcmUuc2V0U2F2ZVN0YXRlKHsgc3RhdHVzOiAnZmFpbGVkJywgbWVzc2FnZTogZXJyb3IubWVzc2FnZSB9KTsgfVxuICAgICAgICAgICAgZXZlbnQudGFyZ2V0LnZhbHVlID0gJyc7XG4gICAgICAgICAgfX0gLz5cbiAgICAgICAgICA8YnV0dG9uIHR5cGU9XCJidXR0b25cIiBkYXRhLWFib3V0LWVkaXRvci1zYXZlIGNsYXNzTmFtZT1cImlzLXNhdmVcIiBkaXNhYmxlZD17c25hcHNob3Quc2F2ZVN0YXRlLnN0YXR1cyA9PT0gJ3NhdmluZyd9IG9uQ2xpY2s9e3NhdmV9PjxzcGFuPntzdGF0dXNMYWJlbH08L3NwYW4+PGtiZD7ijJhTPC9rYmQ+PC9idXR0b24+XG4gICAgICAgIDwvZGl2PlxuICAgICAgPC9oZWFkZXI+XG5cbiAgICAgIHtzbmFwc2hvdC5yZWNvdmVyeVN0YXRlLmF2YWlsYWJsZSA/IDxkaXYgY2xhc3NOYW1lPVwiYWJvdXQtZWRpdG9yLXJlY292ZXJ5XCI+PHNwYW4+QW4gdW5zYXZlZCBkcmFmdCBmcm9tIHtuZXcgRGF0ZShzbmFwc2hvdC5yZWNvdmVyeVN0YXRlLmRyYWZ0LnRpbWVzdGFtcCkudG9Mb2NhbGVTdHJpbmcoKX0gaXMgYXZhaWxhYmxlLjwvc3Bhbj48YnV0dG9uIHR5cGU9XCJidXR0b25cIiBvbkNsaWNrPXsoKSA9PiB7IHN0b3JlLnJlcGxhY2VEb2N1bWVudCgnUmVjb3ZlciBkcmFmdCcsIHNuYXBzaG90LnJlY292ZXJ5U3RhdGUuZHJhZnQuZG9jdW1lbnQpOyBzdG9yZS5zZXRSZWNvdmVyeVN0YXRlKHsgYXZhaWxhYmxlOiBmYWxzZSB9KTsgfX0+UmVjb3ZlciBhcyB1bnNhdmVkIGNvcHk8L2J1dHRvbj48YnV0dG9uIHR5cGU9XCJidXR0b25cIiBvbkNsaWNrPXsoKSA9PiB7IGV4cG9ydEFib3V0TmFycmF0aXZlRG9jdW1lbnQoc25hcHNob3QucmVjb3ZlcnlTdGF0ZS5kcmFmdC5kb2N1bWVudCwgJ2NvbnRlbnRzLWFib3V0LXJlY292ZXJlZC5qc29uJyk7IH19PkV4cG9ydDwvYnV0dG9uPjxidXR0b24gdHlwZT1cImJ1dHRvblwiIG9uQ2xpY2s9eygpID0+IHsgY2xlYXJBYm91dE5hcnJhdGl2ZVJlY292ZXJ5RHJhZnQoKTsgc3RvcmUuc2V0UmVjb3ZlcnlTdGF0ZSh7IGF2YWlsYWJsZTogZmFsc2UgfSk7IH19PkRpc2NhcmQ8L2J1dHRvbj48L2Rpdj4gOiBudWxsfVxuICAgICAge3NuYXBzaG90LnNhdmVTdGF0ZS5tZXNzYWdlID8gPGRpdiBjbGFzc05hbWU9e2BhYm91dC1lZGl0b3Itc2F2ZS1tZXNzYWdlIGlzLSR7c25hcHNob3Quc2F2ZVN0YXRlLnN0YXR1c31gfT57c25hcHNob3Quc2F2ZVN0YXRlLm1lc3NhZ2V9PGJ1dHRvbiB0eXBlPVwiYnV0dG9uXCIgYXJpYS1sYWJlbD1cIkRpc21pc3MgbWVzc2FnZVwiIG9uQ2xpY2s9eygpID0+IHN0b3JlLnNldFNhdmVTdGF0ZSh7IG1lc3NhZ2U6ICcnIH0pfT7DlzwvYnV0dG9uPjwvZGl2PiA6IG51bGx9XG5cbiAgICAgIHtwYXRoVmlzaWJsZSA/IDxDYW1lcmFQYXRoT3ZlcmxheSBzbmFwc2hvdD17c25hcHNob3R9IC8+IDogbnVsbH1cbiAgICAgIHtkaXJlY3RvclZpZXcgPyA8ZGl2IGNsYXNzTmFtZT1cImFib3V0LWVkaXRvci1kaXJlY3Rvci1jb250cm9sc1wiPjxzdHJvbmc+RGlyZWN0b3IgVmlldzwvc3Ryb25nPjxidXR0b24gdHlwZT1cImJ1dHRvblwiIG9uQ2xpY2s9eygpID0+IHJ1bnRpbWVSZWYuY3VycmVudD8ubnVkZ2VEaXJlY3Rvcj8uKHsgeWF3OiAtMC4wOCB9KX0+4oaQPC9idXR0b24+PGJ1dHRvbiB0eXBlPVwiYnV0dG9uXCIgb25DbGljaz17KCkgPT4gcnVudGltZVJlZi5jdXJyZW50Py5udWRnZURpcmVjdG9yPy4oeyBwaXRjaDogMC4wOCB9KX0+4oaRPC9idXR0b24+PGJ1dHRvbiB0eXBlPVwiYnV0dG9uXCIgb25DbGljaz17KCkgPT4gcnVudGltZVJlZi5jdXJyZW50Py5udWRnZURpcmVjdG9yPy4oeyBwaXRjaDogLTAuMDggfSl9PuKGkzwvYnV0dG9uPjxidXR0b24gdHlwZT1cImJ1dHRvblwiIG9uQ2xpY2s9eygpID0+IHJ1bnRpbWVSZWYuY3VycmVudD8ubnVkZ2VEaXJlY3Rvcj8uKHsgeWF3OiAwLjA4IH0pfT7ihpI8L2J1dHRvbj48YnV0dG9uIHR5cGU9XCJidXR0b25cIiBvbkNsaWNrPXsoKSA9PiBydW50aW1lUmVmLmN1cnJlbnQ/Lm51ZGdlRGlyZWN0b3I/Lih7IGRpc3RhbmNlOiAtMC4yIH0pfT7vvIs8L2J1dHRvbj48YnV0dG9uIHR5cGU9XCJidXR0b25cIiBvbkNsaWNrPXsoKSA9PiBydW50aW1lUmVmLmN1cnJlbnQ/Lm51ZGdlRGlyZWN0b3I/Lih7IGRpc3RhbmNlOiAwLjIgfSl9PuKIkjwvYnV0dG9uPjxidXR0b24gdHlwZT1cImJ1dHRvblwiIG9uQ2xpY2s9eygpID0+IHJ1bnRpbWVSZWYuY3VycmVudD8ucmVzZXREaXJlY3Rvcj8uKCl9PlJlc2V0PC9idXR0b24+PHNtYWxsPlRlbXBvcmFyeSBpbnNwZWN0aW9uIG9ubHkuIFB1Ymxpc2hlZCBDYW1lcmEga2V5cyBhcmUgdW5jaGFuZ2VkLjwvc21hbGw+PC9kaXY+IDogbnVsbH1cblxuICAgICAgPEluc3BlY3RvciBzdG9yZT17c3RvcmV9IHNuYXBzaG90PXtzbmFwc2hvdH0gdGltZWxpbmVPcGVuPXt0aW1lbGluZU9wZW59IHJ1bnRpbWVNZXRyaWNzPXtydW50aW1lTWV0cmljc30gLz5cbiAgICAgIDxidXR0b25cbiAgICAgICAgdHlwZT1cImJ1dHRvblwiXG4gICAgICAgIGNsYXNzTmFtZT1cImFib3V0LWVkaXRvci10aW1lbGluZS10b2dnbGVcIlxuICAgICAgICBhcmlhLWNvbnRyb2xzPVwiYWJvdXQtZWRpdG9yLXRpbWVsaW5lLXBhbmVsXCJcbiAgICAgICAgYXJpYS1leHBhbmRlZD17dGltZWxpbmVPcGVufVxuICAgICAgICB0aXRsZT17dGltZWxpbmVPcGVuID8gJ0hpZGUgdGltZWxpbmUnIDogJ1Nob3cgdGltZWxpbmUnfVxuICAgICAgICBvbkNsaWNrPXsoKSA9PiBzZXRUaW1lbGluZU9wZW4oKG9wZW4pID0+ICFvcGVuKX1cbiAgICAgID57dGltZWxpbmVPcGVuID8gPENoZXZyb25Eb3duIGFyaWEtaGlkZGVuPVwidHJ1ZVwiIC8+IDogPENoZXZyb25VcCBhcmlhLWhpZGRlbj1cInRydWVcIiAvPn08c3Bhbj57dGltZWxpbmVPcGVuID8gJ0hpZGUgdGltZWxpbmUnIDogJ1Nob3cgdGltZWxpbmUnfTwvc3Bhbj48L2J1dHRvbj5cbiAgICAgIDxkaXYgaWQ9XCJhYm91dC1lZGl0b3ItdGltZWxpbmUtcGFuZWxcIiBjbGFzc05hbWU9XCJhYm91dC1lZGl0b3ItYm90dG9tXCIgYXJpYS1oaWRkZW49eyF0aW1lbGluZU9wZW59PlxuICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cImFib3V0LWVkaXRvci1jb250ZXh0YmFyXCI+XG4gICAgICAgICAgPHNwYW4+PHN0cm9uZz57c2VsZWN0ZWQ/LmxhYmVsIHx8ICdTZXF1ZW5jZSd9PC9zdHJvbmc+IHtzZWxlY3RlZCA/IGAke3NlbGVjdGVkLnR5cGV9IMK3ICR7Zm9ybWF0V1UoTWF0aC5tYXgoMCwgc2VsZWN0ZWRFeHRlbnQgLSAxKSl9IHNjcm9sbCDCtyAke2Zvcm1hdFdVKHNlbGVjdGVkRXh0ZW50KX0gdG90YWwke3Jlc29sdmVkRXh0ZW50ID4gc2VsZWN0ZWRFeHRlbnQgKyAwLjAwMSA/IGAgwrcgJHtmb3JtYXRXVShyZXNvbHZlZEV4dGVudCl9IHJlc29sdmVkYCA6ICcnfWAgOiAnJ308L3NwYW4+XG4gICAgICAgICAge3NlbGVjdGVkQ3VlQ291bnQgPiAxID8gPHNwYW4gY2xhc3NOYW1lPVwiYWJvdXQtZWRpdG9yLXNlbGVjdGlvbi1jb3VudFwiPntzZWxlY3RlZEN1ZUNvdW50fSB0aXRsZXMgc2VsZWN0ZWQ8L3NwYW4+IDogbnVsbH1cbiAgICAgICAgICA8c3Bhbj57c25hcHNob3QuYXV0b0tleSA/ICdBdXRvLWtleSBhcm1lZCcgOiAnQXV0by1rZXkgb2ZmJ308L3NwYW4+XG4gICAgICAgICAgPGJ1dHRvbiB0eXBlPVwiYnV0dG9uXCIgY2xhc3NOYW1lPXtzbmFwc2hvdC5hdXRvS2V5ID8gJ2lzLWFjdGl2ZScgOiAnJ30gb25DbGljaz17KCkgPT4gc3RvcmUuc2V0QXV0b0tleSghc25hcHNob3QuYXV0b0tleSl9PuKXhiBBdXRvLWtleTwvYnV0dG9uPlxuICAgICAgICAgIDxidXR0b24gdHlwZT1cImJ1dHRvblwiIGNsYXNzTmFtZT17bG9vcEFjdGl2ZSA/ICdpcy1hY3RpdmUnIDogJyd9IG9uQ2xpY2s9e3RvZ2dsZUxvb3B9Pkxvb3AgU2VjdGlvbjwvYnV0dG9uPlxuICAgICAgICAgIDxidXR0b24gdHlwZT1cImJ1dHRvblwiIG9uQ2xpY2s9e2ZpdFNlcXVlbmNlfT5GaXQgc2VxdWVuY2U8L2J1dHRvbj5cbiAgICAgICAgICA8YnV0dG9uIHR5cGU9XCJidXR0b25cIiBkaXNhYmxlZD17IWNvbXBpbGVkU2VsZWN0ZWR9IG9uQ2xpY2s9e2ZpdFNlY3Rpb259PkZpdCBTZWN0aW9uPC9idXR0b24+XG4gICAgICAgICAge1snY2FtZXJhJywgJ3dvcmxkJywgJ3RleHQnXS5tYXAoKHRyYWNrKSA9PiA8YnV0dG9uIHR5cGU9XCJidXR0b25cIiBrZXk9e3RyYWNrfSBjbGFzc05hbWU9e3NuYXBzaG90LnRyYW5zcG9ydC5zb2xvVHJhY2sgPT09IHRyYWNrID8gJ2lzLWFjdGl2ZScgOiAnJ30gb25DbGljaz17KCkgPT4gdG9nZ2xlU29sbyh0cmFjayl9PlNvbG8ge3RyYWNrfTwvYnV0dG9uPil9XG4gICAgICAgICAge3RpbWVsaW5lRGVsZXRpb24gPyA8YnV0dG9uIHR5cGU9XCJidXR0b25cIiBjbGFzc05hbWU9XCJhYm91dC1lZGl0b3ItZGVsZXRlLWtleVwiIGRpc2FibGVkPXt0aW1lbGluZURlbGV0aW9uLmRpc2FibGVkfSB0aXRsZT17dGltZWxpbmVEZWxldGlvbi5tZXNzYWdlIHx8IGAke3RpbWVsaW5lRGVsZXRpb24ubGFiZWx9IMK3IERlbGV0ZS9CYWNrc3BhY2VgfSBvbkNsaWNrPXsoKSA9PiBkZWxldGVUaW1lbGluZVNlbGVjdGlvbihzdG9yZSwgc25hcHNob3QpfT48VHJhc2gyIGFyaWEtaGlkZGVuPVwidHJ1ZVwiIC8+e3RpbWVsaW5lRGVsZXRpb24ubGFiZWx9PC9idXR0b24+IDogbnVsbH1cbiAgICAgICAgICB7cnVudGltZU1ldHJpY3MgPyA8c3BhbiBjbGFzc05hbWU9XCJhYm91dC1lZGl0b3ItaHVkXCI+e3J1bnRpbWVNZXRyaWNzLmZyYW1lVGltZU1zLnRvRml4ZWQoMil9bXMgwrcge3J1bnRpbWVNZXRyaWNzLmRyYXdDYWxsc30gZHJhdyDCtyB7cnVudGltZU1ldHJpY3MucG9pbnRDb3VudC50b0xvY2FsZVN0cmluZygpfSBwdHMgwrcge3J1bnRpbWVNZXRyaWNzLmFjdGl2ZU1vZGlmaWVyc30gbW9kaWZpZXJzIMK3IHtydW50aW1lTWV0cmljcy5idWZmZXJSZWJ1aWxkc30gcmVidWlsZHM8L3NwYW4+IDogbnVsbH1cbiAgICAgICAgICB7Y2hlY2twb2ludHMubGVuZ3RoID8gPHNlbGVjdCBhcmlhLWxhYmVsPVwiUmVzdG9yZSBjaGVja3BvaW50XCIgZGVmYXVsdFZhbHVlPVwiXCIgb25DaGFuZ2U9eyhldmVudCkgPT4geyBjb25zdCBmb3VuZCA9IGNoZWNrcG9pbnRzLmZpbmQoKGl0ZW0pID0+IGl0ZW0uaWQgPT09IGV2ZW50LnRhcmdldC52YWx1ZSk7IGlmIChmb3VuZCkgeyBzdG9yZS5yZXBsYWNlRG9jdW1lbnQoYFJlc3RvcmUgJHtmb3VuZC5uYW1lfWAsIGZvdW5kLmRvY3VtZW50KTsgc3RvcmUuc2V0VHJhbnNwb3J0KHsgb3duZXI6ICd0aW1lbGluZScsIHN0b3J5V1U6IGZvdW5kLnN0b3J5V1UsIHBsYXlpbmc6IGZhbHNlIH0pOyB9IGV2ZW50LnRhcmdldC52YWx1ZSA9ICcnOyB9fT48b3B0aW9uIHZhbHVlPVwiXCI+Q2hlY2twb2ludHMgKHtjaGVja3BvaW50cy5sZW5ndGh9KTwvb3B0aW9uPntjaGVja3BvaW50cy5tYXAoKGl0ZW0pID0+IDxvcHRpb24gdmFsdWU9e2l0ZW0uaWR9IGtleT17aXRlbS5pZH0+e2l0ZW0ubmFtZX08L29wdGlvbj4pfTwvc2VsZWN0PiA6IG51bGx9XG4gICAgICAgIDwvZGl2PlxuICAgICAgICA8VGltZWxpbmUgc3RvcmU9e3N0b3JlfSBzbmFwc2hvdD17c25hcHNob3R9IC8+XG4gICAgICA8L2Rpdj5cbiAgICAgIDxuYXYgY2xhc3NOYW1lPVwiYWJvdXQtZWRpdG9yLW1vYmlsZS10YWJzXCIgYXJpYS1sYWJlbD1cIkVkaXRvciBwYW5lbFwiPjxidXR0b24gdHlwZT1cImJ1dHRvblwiIGNsYXNzTmFtZT17bW9iaWxlUGFuZSA9PT0gJ3NlcXVlbmNlJyA/ICdpcy1hY3RpdmUnIDogJyd9IG9uQ2xpY2s9eygpID0+IHNldE1vYmlsZVBhbmUoJ3NlcXVlbmNlJyl9PlNlcXVlbmNlPC9idXR0b24+PGJ1dHRvbiB0eXBlPVwiYnV0dG9uXCIgY2xhc3NOYW1lPXttb2JpbGVQYW5lID09PSAnaW5zcGVjdCcgPyAnaXMtYWN0aXZlJyA6ICcnfSBvbkNsaWNrPXsoKSA9PiBzZXRNb2JpbGVQYW5lKCdpbnNwZWN0Jyl9Pkluc3BlY3Q8L2J1dHRvbj48YnV0dG9uIHR5cGU9XCJidXR0b25cIiBjbGFzc05hbWU9e21vYmlsZVBhbmUgPT09ICdwcmV2aWV3JyA/ICdpcy1hY3RpdmUnIDogJyd9IG9uQ2xpY2s9eygpID0+IHNldE1vYmlsZVBhbmUoJ3ByZXZpZXcnKX0+UHJldmlldzwvYnV0dG9uPjwvbmF2PlxuICAgIDwvZGl2PlxuICApLCBkb2N1bWVudC5ib2R5KTtcbn1cbiJdLCJmaWxlIjoiL1VzZXJzL2FsZXhhbmRlcmJlY2svUHJvamVjdHMtY29kZS9BbGV4YW5kZXIgQmVjayBTdHVkaW8gV2Vic2l0ZS9yZWFjdC1hcHAvYXBwL3NyYy9yb3V0ZXMvYWJvdXQtbmFycmF0aXZlLWxhYi9BYm91dE5hcnJhdGl2ZUVkaXRvci5qc3gifQ==