import { createHotContext as __vite__createHotContext } from "/@vite/client";import.meta.hot = __vite__createHotContext("/src/routes/about-narrative-lab/AboutNarrativeLabExperience.jsx");import __vite__cjsImport0_react_jsxDevRuntime from "/node_modules/.vite/deps/react_jsx-dev-runtime.js?v=6e8fde4d"; const Fragment = __vite__cjsImport0_react_jsxDevRuntime["Fragment"]; const jsxDEV = __vite__cjsImport0_react_jsxDevRuntime["jsxDEV"];
var _s = $RefreshSig$();
import __vite__cjsImport1_react from "/node_modules/.vite/deps/react.js?v=6e8fde4d"; const useEffect = __vite__cjsImport1_react["useEffect"]; const useLayoutEffect = __vite__cjsImport1_react["useLayoutEffect"]; const useMemo = __vite__cjsImport1_react["useMemo"]; const useRef = __vite__cjsImport1_react["useRef"]; const useState = __vite__cjsImport1_react["useState"];
import __vite__cjsImport2_reactDom from "/node_modules/.vite/deps/react-dom.js?v=6e8fde4d"; const createPortal = __vite__cjsImport2_reactDom["createPortal"];
import {
  ABOUT_NARRATIVE_CONTACT,
  ABOUT_NARRATIVE_DOCUMENT
} from "/src/routes/about-narrative-lab/aboutNarrativeLabData.js";
import { getAboutNarrativeCueMovement } from "/src/routes/about-narrative-lab/aboutNarrativeCompiler.js";
import { AboutNarrativeWorld } from "/src/routes/about-narrative-lab/AboutNarrativeWorld.jsx?t=1784280135025";
import {
  ABOUT_SCROLL_INDICATOR_ACTIVE_TICK_COUNT,
  ABOUT_SCROLL_INDICATOR_TICK_COUNT,
  useAboutNarrativeTimeline
} from "/src/routes/about-narrative-lab/useAboutNarrativeTimeline.js";
import "/src/routes/about-narrative-lab/about-narrative-lab.css?t=1784282934420";
function getSectionStyle(section) {
  return {
    "--section-duration-wu": section.extentWU,
    "--section-duration-mobile-wu": section.mobileExtentWU
  };
}
function getVerticalCueStyle(cue, section) {
  const desktopExtentWU = Math.max(1, Number(section.extentWU));
  const mobileExtentWU = Math.max(1, Number(section.mobileExtentWU));
  const desktopTravelWU = Math.max(1e-3, desktopExtentWU - 1);
  const mobileTravelWU = Math.max(1e-3, mobileExtentWU - 1);
  const desktopTop = (0.5 + Number(cue.hold) * desktopTravelWU) / desktopExtentWU;
  const mobileTop = (0.5 + Number(cue.hold) * mobileTravelWU) / mobileExtentWU;
  return {
    "--vertical-cue-top": `${(desktopTop * 100).toFixed(4)}%`,
    "--vertical-cue-top-mobile": `${(mobileTop * 100).toFixed(4)}%`
  };
}
function VerticalCueSequence({ cues, section, headingId = null, headingLevel = 2, onSelect }) {
  if (!cues.length) return null;
  const Heading = headingLevel === 1 ? "h1" : "h2";
  return /* @__PURE__ */ jsxDEV("div", { className: "about-narrative-vertical-sequence", "data-text-movement": "vertical", children: cues.map((cue, cueIndex) => {
    const isSemanticHeading = Boolean(headingId) && cueIndex === 0;
    const Element = isSemanticHeading ? Heading : "p";
    return /* @__PURE__ */ jsxDEV(
      Element,
      {
        id: isSemanticHeading ? headingId : void 0,
        className: `about-narrative-vertical-title${section.layout === "opener" ? " is-opener" : ""}`,
        style: getVerticalCueStyle(cue, section),
        "data-text-cue": cue.id,
        "data-text-movement": "vertical",
        "data-editorial-line": true,
        "data-primary-copy": true,
        "aria-label": isSemanticHeading ? cues.map((item) => item.text).join(" ") : void 0,
        "aria-hidden": isSemanticHeading ? void 0 : true,
        onClick: (event) => {
          if (!onSelect) return;
          event.stopPropagation();
          onSelect({ type: "cue", sectionId: section.id, cueId: cue.id });
        },
        children: cue.text
      },
      cue.id,
      false,
      {
        fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeLabExperience.jsx",
        lineNumber: 45,
        columnNumber: 11
      },
      this
    );
  }) }, void 0, false, {
    fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeLabExperience.jsx",
    lineNumber: 40,
    columnNumber: 5
  }, this);
}
_c = VerticalCueSequence;
function OpeningSection({ section, index, sectionRef, onSelect }) {
  const verticalCues = section.text.cues.filter((cue) => getAboutNarrativeCueMovement(cue) === "vertical");
  const spatialCues = section.text.cues.filter((cue) => getAboutNarrativeCueMovement(cue) === "spatial");
  const copy = section.text.cues.map((cue) => cue.text).join(" ");
  const headingId = "about-route-title";
  return /* @__PURE__ */ jsxDEV(
    "section",
    {
      ref: sectionRef,
      id: `about-narrative-${section.id}`,
      className: "about-narrative-section about-narrative-section--opening",
      "data-narrative-section": section.id,
      "data-section-index": index,
      style: getSectionStyle(section),
      "aria-labelledby": headingId,
      onClick: () => onSelect?.({ type: "section", sectionId: section.id }),
      "data-text-movement": verticalCues.length && spatialCues.length ? "mixed" : verticalCues.length ? "vertical" : "spatial",
      children: [
        /* @__PURE__ */ jsxDEV(VerticalCueSequence, { cues: verticalCues, section, headingId: spatialCues.length ? null : headingId, headingLevel: 1, onSelect }, void 0, false, {
          fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeLabExperience.jsx",
          lineNumber: 85,
          columnNumber: 7
        }, this),
        spatialCues.length ? /* @__PURE__ */ jsxDEV("div", { className: "about-narrative-spatial-stage", "data-text-movement": "spatial", children: /* @__PURE__ */ jsxDEV("div", { className: "about-narrative-spatial-copy", children: [
          /* @__PURE__ */ jsxDEV("h1", { id: headingId, className: "about-narrative-spatial-title", "aria-label": copy, "data-primary-copy": true, children: spatialCues.map(
            (cue) => /* @__PURE__ */ jsxDEV("span", { className: "about-narrative-spatial-fragment", "data-text-cue": cue.id, "data-text-movement": "spatial", "aria-hidden": "true", onClick: (event) => {
              event.stopPropagation();
              onSelect?.({ type: "cue", sectionId: section.id, cueId: cue.id });
            }, children: cue.text }, cue.id, false, {
              fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeLabExperience.jsx",
              lineNumber: 91,
              columnNumber: 13
            }, this)
          ) }, void 0, false, {
            fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeLabExperience.jsx",
            lineNumber: 89,
            columnNumber: 13
          }, this),
          /* @__PURE__ */ jsxDEV("div", { className: "about-narrative-opening-scroll-cue", "aria-hidden": "true", children: /* @__PURE__ */ jsxDEV("i", { className: "ti ti-arrow-left about-narrative-opening-scroll-cue__icon" }, void 0, false, {
            fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeLabExperience.jsx",
            lineNumber: 95,
            columnNumber: 15
          }, this) }, void 0, false, {
            fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeLabExperience.jsx",
            lineNumber: 94,
            columnNumber: 13
          }, this)
        ] }, void 0, true, {
          fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeLabExperience.jsx",
          lineNumber: 88,
          columnNumber: 11
        }, this) }, void 0, false, {
          fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeLabExperience.jsx",
          lineNumber: 87,
          columnNumber: 7
        }, this) : null
      ]
    },
    void 0,
    true,
    {
      fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeLabExperience.jsx",
      lineNumber: 74,
      columnNumber: 5
    },
    this
  );
}
_c2 = OpeningSection;
function SpatialSection({ section, index, sectionRef, onSelect }) {
  const Heading = index === 0 ? "h1" : "h2";
  const cues = section.text.cues || [];
  const copy = cues.map((cue) => cue.text).join(" ");
  const verticalCues = cues.filter((cue) => getAboutNarrativeCueMovement(cue) === "vertical");
  const spatialCues = cues.filter((cue) => getAboutNarrativeCueMovement(cue) === "spatial");
  const headingId = `about-narrative-${section.id}-title`;
  const hasHeading = verticalCues.length > 0 || spatialCues.length > 0;
  const layoutClass = section.layout === "lower" ? "constellation" : section.layout === "wide" ? "living-field" : section.layout;
  return /* @__PURE__ */ jsxDEV(
    "section",
    {
      ref: sectionRef,
      id: `about-narrative-${section.id}`,
      className: `about-narrative-section about-narrative-section--spatial about-narrative-section--${layoutClass}`,
      "data-narrative-section": section.id,
      "data-section-index": index,
      style: getSectionStyle(section),
      "aria-labelledby": hasHeading ? headingId : void 0,
      "aria-label": hasHeading ? void 0 : section.label,
      "data-text-movement": verticalCues.length && spatialCues.length ? "mixed" : verticalCues.length ? "vertical" : "spatial",
      children: [
        /* @__PURE__ */ jsxDEV(VerticalCueSequence, { cues: verticalCues, section, headingId: spatialCues.length ? null : headingId, headingLevel: index === 0 ? 1 : 2, onSelect }, void 0, false, {
          fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeLabExperience.jsx",
          lineNumber: 127,
          columnNumber: 7
        }, this),
        spatialCues.length ? /* @__PURE__ */ jsxDEV("div", { className: "about-narrative-spatial-stage", "data-text-movement": "spatial", children: /* @__PURE__ */ jsxDEV("div", { className: "about-narrative-spatial-copy", children: /* @__PURE__ */ jsxDEV(
          Heading,
          {
            id: headingId,
            className: "about-narrative-spatial-title",
            "aria-label": copy,
            "data-primary-copy": true,
            children: spatialCues.map(
              (cue) => /* @__PURE__ */ jsxDEV(
                "span",
                {
                  className: "about-narrative-spatial-fragment",
                  "data-text-cue": cue.id,
                  "data-text-movement": "spatial",
                  "aria-hidden": "true",
                  onClick: (event) => {
                    event.stopPropagation();
                    onSelect?.({ type: "cue", sectionId: section.id, cueId: cue.id });
                  },
                  children: cue.text
                },
                cue.id,
                false,
                {
                  fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeLabExperience.jsx",
                  lineNumber: 138,
                  columnNumber: 13
                },
                this
              )
            )
          },
          void 0,
          false,
          {
            fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeLabExperience.jsx",
            lineNumber: 131,
            columnNumber: 13
          },
          this
        ) }, void 0, false, {
          fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeLabExperience.jsx",
          lineNumber: 130,
          columnNumber: 11
        }, this) }, void 0, false, {
          fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeLabExperience.jsx",
          lineNumber: 129,
          columnNumber: 7
        }, this) : null
      ]
    },
    void 0,
    true,
    {
      fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeLabExperience.jsx",
      lineNumber: 116,
      columnNumber: 5
    },
    this
  );
}
_c3 = SpatialSection;
function DisciplineRevealOverlay({ reveal, overlayRef }) {
  if (!reveal) return null;
  return /* @__PURE__ */ jsxDEV(
    "ol",
    {
      ref: overlayRef,
      className: "about-narrative-discipline-reveal",
      "data-discipline-reveal": reveal.id,
      "aria-label": "Six connected disciplines",
      "aria-hidden": "true",
      children: reveal.items.map(
        (item) => /* @__PURE__ */ jsxDEV(
          "li",
          {
            "data-discipline-group": item.group,
            "data-discipline-tone": item.tone,
            style: { "--discipline-label-offset": `${reveal.labelOffsetPx}px` },
            children: /* @__PURE__ */ jsxDEV("span", { className: "about-narrative-discipline-reveal__label", children: item.label }, void 0, false, {
              fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeLabExperience.jsx",
              lineNumber: 172,
              columnNumber: 11
            }, this)
          },
          item.group,
          false,
          {
            fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeLabExperience.jsx",
            lineNumber: 166,
            columnNumber: 7
          },
          this
        )
      )
    },
    void 0,
    false,
    {
      fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeLabExperience.jsx",
      lineNumber: 158,
      columnNumber: 5
    },
    this
  );
}
_c4 = DisciplineRevealOverlay;
function EditorialList({ block }) {
  return /* @__PURE__ */ jsxDEV("div", { className: "about-narrative-editorial-list", children: [
    block.label ? /* @__PURE__ */ jsxDEV("p", { className: "about-narrative-editorial-list__label", "data-editorial-line": true, children: block.label }, void 0, false, {
      fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeLabExperience.jsx",
      lineNumber: 182,
      columnNumber: 22
    }, this) : null,
    /* @__PURE__ */ jsxDEV("ul", { children: block.items.map((item) => /* @__PURE__ */ jsxDEV("li", { "data-editorial-line": true, children: item }, item, false, {
      fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeLabExperience.jsx",
      lineNumber: 183,
      columnNumber: 38
    }, this)) }, void 0, false, {
      fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeLabExperience.jsx",
      lineNumber: 183,
      columnNumber: 7
    }, this)
  ] }, void 0, true, {
    fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeLabExperience.jsx",
    lineNumber: 181,
    columnNumber: 5
  }, this);
}
_c5 = EditorialList;
function DisciplineList({ items }) {
  return /* @__PURE__ */ jsxDEV("ol", { className: "about-narrative-discipline-list", "aria-label": "Areas of expertise", children: items.map(
    (item, itemIndex) => /* @__PURE__ */ jsxDEV("li", { "data-editorial-line": true, "data-world-group": itemIndex + 1, children: [
      /* @__PURE__ */ jsxDEV("span", { className: "about-narrative-discipline-list__marker", "aria-hidden": "true" }, void 0, false, {
        fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeLabExperience.jsx",
        lineNumber: 193,
        columnNumber: 11
      }, this),
      /* @__PURE__ */ jsxDEV("span", { className: "about-narrative-discipline-list__number", "aria-hidden": "true", children: String(itemIndex + 1).padStart(2, "0") }, void 0, false, {
        fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeLabExperience.jsx",
        lineNumber: 194,
        columnNumber: 11
      }, this),
      /* @__PURE__ */ jsxDEV("span", { children: item }, void 0, false, {
        fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeLabExperience.jsx",
        lineNumber: 195,
        columnNumber: 11
      }, this)
    ] }, item, true, {
      fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeLabExperience.jsx",
      lineNumber: 192,
      columnNumber: 7
    }, this)
  ) }, void 0, false, {
    fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeLabExperience.jsx",
    lineNumber: 190,
    columnNumber: 5
  }, this);
}
_c6 = DisciplineList;
function ClientLogos({ items = [] }) {
  return /* @__PURE__ */ jsxDEV("ul", { className: "about-narrative-client-logos", "aria-label": "Selected clients", "data-editorial-line": true, children: items.map(
    (item) => /* @__PURE__ */ jsxDEV("li", { "data-client-logo": item.toLowerCase().replace(/[^a-z0-9]+/g, "-"), children: item }, item, false, {
      fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeLabExperience.jsx",
      lineNumber: 206,
      columnNumber: 7
    }, this)
  ) }, void 0, false, {
    fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeLabExperience.jsx",
    lineNumber: 204,
    columnNumber: 5
  }, this);
}
_c7 = ClientLogos;
function EditorialText({ text = "", emphasis = [] }) {
  if (!emphasis.length) return text;
  const matches = [];
  emphasis.forEach((item, emphasisIndex) => {
    if (!item.text) return;
    let fromIndex = 0;
    while (fromIndex < text.length) {
      const start = text.indexOf(item.text, fromIndex);
      if (start < 0) break;
      matches.push({
        start,
        end: start + item.text.length,
        tone: item.tone,
        emphasisIndex
      });
      fromIndex = start + item.text.length;
    }
  });
  matches.sort((a, b) => a.start - b.start || b.end - a.end || a.emphasisIndex - b.emphasisIndex);
  const accepted = [];
  matches.forEach((match) => {
    if (match.start >= (accepted.at(-1)?.end || 0)) accepted.push(match);
  });
  if (!accepted.length) return text;
  const parts = [];
  let cursor = 0;
  accepted.forEach((match) => {
    if (match.start > cursor) parts.push(text.slice(cursor, match.start));
    parts.push(
      /* @__PURE__ */ jsxDEV(
        "strong",
        {
          className: "about-narrative-editorial-emphasis",
          "data-emphasis-tone": match.tone,
          children: text.slice(match.start, match.end)
        },
        `${match.start}-${match.end}`,
        false,
        {
          fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeLabExperience.jsx",
          lineNumber: 244,
          columnNumber: 7
        },
        this
      )
    );
    cursor = match.end;
  });
  if (cursor < text.length) parts.push(text.slice(cursor));
  return parts;
}
_c8 = EditorialText;
function EditorialSection({ section, index, sectionRef, onSelect }) {
  const highlightedBlock = section.text.blocks.find((block) => block.kind === "highlight");
  return /* @__PURE__ */ jsxDEV(
    "section",
    {
      ref: sectionRef,
      id: `about-narrative-${section.id}`,
      className: `about-narrative-section about-narrative-section--editorial${section.layout ? ` about-narrative-section--${section.layout}` : ""}`,
      "data-narrative-section": section.id,
      "data-section-index": index,
      style: getSectionStyle(section),
      "aria-labelledby": `about-narrative-${section.id}-title`,
      onClick: () => onSelect?.({ type: "section", sectionId: section.id }),
      "data-text-movement": "vertical",
      children: /* @__PURE__ */ jsxDEV("div", { className: "about-narrative-editorial-inner", children: [
        /* @__PURE__ */ jsxDEV(
          "h2",
          {
            id: `about-narrative-${section.id}-title`,
            className: "about-narrative-editorial-title",
            "data-editorial-line": true,
            "data-editorial-block": highlightedBlock?.id,
            "data-primary-copy": true,
            children: /* @__PURE__ */ jsxDEV(
              EditorialText,
              {
                text: highlightedBlock?.text || section.label,
                emphasis: highlightedBlock?.emphasis
              },
              void 0,
              false,
              {
                fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeLabExperience.jsx",
                lineNumber: 280,
                columnNumber: 11
              },
              this
            )
          },
          void 0,
          false,
          {
            fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeLabExperience.jsx",
            lineNumber: 273,
            columnNumber: 9
          },
          this
        ),
        section.text.blocks.map((block) => {
          if (block.id === highlightedBlock?.id) return null;
          if (block.kind === "list") return /* @__PURE__ */ jsxDEV(EditorialList, { block }, block.id, false, {
            fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeLabExperience.jsx",
            lineNumber: 287,
            columnNumber: 45
          }, this);
          if (block.kind === "disciplines") return /* @__PURE__ */ jsxDEV(DisciplineList, { items: block.items }, block.id, false, {
            fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeLabExperience.jsx",
            lineNumber: 288,
            columnNumber: 52
          }, this);
          if (block.kind === "clients") return /* @__PURE__ */ jsxDEV(ClientLogos, { items: block.items }, block.id, false, {
            fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeLabExperience.jsx",
            lineNumber: 289,
            columnNumber: 48
          }, this);
          if (block.kind === "detail") return /* @__PURE__ */ jsxDEV("p", { className: "about-narrative-editorial-detail", "data-editorial-line": true, "data-editorial-block": block.id, children: /* @__PURE__ */ jsxDEV(EditorialText, { text: block.text, emphasis: block.emphasis }, void 0, false, {
            fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeLabExperience.jsx",
            lineNumber: 290,
            columnNumber: 162
          }, this) }, block.id, false, {
            fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeLabExperience.jsx",
            lineNumber: 290,
            columnNumber: 47
          }, this);
          return /* @__PURE__ */ jsxDEV(
            "p",
            {
              className: "about-narrative-editorial-copy",
              "data-editorial-line": true,
              "data-editorial-block": block.id,
              "data-world-influence": block.worldInfluence ? "true" : void 0,
              "data-primary-copy": true,
              children: /* @__PURE__ */ jsxDEV(EditorialText, { text: block.text, emphasis: block.emphasis }, void 0, false, {
                fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeLabExperience.jsx",
                lineNumber: 300,
                columnNumber: 15
              }, this)
            },
            block.id,
            false,
            {
              fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeLabExperience.jsx",
              lineNumber: 292,
              columnNumber: 13
            },
            this
          );
        })
      ] }, void 0, true, {
        fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeLabExperience.jsx",
        lineNumber: 272,
        columnNumber: 7
      }, this)
    },
    void 0,
    false,
    {
      fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeLabExperience.jsx",
      lineNumber: 261,
      columnNumber: 5
    },
    this
  );
}
_c9 = EditorialSection;
function FinaleSection({ section, index, sectionRef, interactionRef, onSelect }) {
  const copy = section.text.cues.map((cue) => cue.text).join(" ");
  const spatialCues = section.text.cues.filter((cue) => getAboutNarrativeCueMovement(cue) === "spatial");
  const verticalCues = section.text.cues.filter((cue) => getAboutNarrativeCueMovement(cue) === "vertical");
  const hasSupportingCopy = Boolean(section.text.profile || section.text.prompt);
  const headingId = `about-narrative-${section.id}-title`;
  return /* @__PURE__ */ jsxDEV(
    "section",
    {
      ref: sectionRef,
      id: `about-narrative-${section.id}`,
      className: "about-narrative-section about-narrative-section--spatial about-narrative-section--closing about-narrative-section--finale",
      "data-narrative-section": section.id,
      "data-section-index": index,
      style: getSectionStyle(section),
      "aria-labelledby": headingId,
      "data-text-movement": verticalCues.length && spatialCues.length ? "mixed" : verticalCues.length ? "vertical" : "spatial",
      children: [
        /* @__PURE__ */ jsxDEV(VerticalCueSequence, { cues: verticalCues, section, headingId: spatialCues.length ? null : headingId, headingLevel: 2, onSelect }, void 0, false, {
          fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeLabExperience.jsx",
          lineNumber: 326,
          columnNumber: 7
        }, this),
        /* @__PURE__ */ jsxDEV("div", { className: "about-narrative-spatial-stage about-narrative-finale-stage", children: /* @__PURE__ */ jsxDEV("div", { className: "about-narrative-spatial-copy about-narrative-finale-copy", children: [
          spatialCues.length ? /* @__PURE__ */ jsxDEV("h2", { id: headingId, className: "about-narrative-spatial-title", "aria-label": copy, "data-primary-copy": true, children: spatialCues.map(
            (cue) => /* @__PURE__ */ jsxDEV("span", { className: "about-narrative-spatial-fragment", "data-text-cue": cue.id, "data-text-movement": "spatial", "aria-hidden": "true", onClick: () => onSelect?.({ type: "cue", sectionId: section.id, cueId: cue.id }), children: cue.text }, cue.id, false, {
              fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeLabExperience.jsx",
              lineNumber: 332,
              columnNumber: 13
            }, this)
          ) }, void 0, false, {
            fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeLabExperience.jsx",
            lineNumber: 330,
            columnNumber: 11
          }, this) : null,
          /* @__PURE__ */ jsxDEV(
            "div",
            {
              ref: interactionRef,
              className: "about-narrative-bust-interaction",
              "data-active": "false",
              role: "group",
              "aria-label": "Rotate the point-cloud bust horizontally",
              tabIndex: -1
            },
            void 0,
            false,
            {
              fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeLabExperience.jsx",
              lineNumber: 336,
              columnNumber: 11
            },
            this
          ),
          /* @__PURE__ */ jsxDEV("div", { className: `about-narrative-finale-cta${hasSupportingCopy ? "" : " is-actions-only"}`, children: [
            section.text.profile ? /* @__PURE__ */ jsxDEV("p", { className: "about-narrative-finale-profile", children: section.text.profile }, void 0, false, {
              fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeLabExperience.jsx",
              lineNumber: 345,
              columnNumber: 37
            }, this) : null,
            section.text.prompt ? /* @__PURE__ */ jsxDEV("p", { className: "about-narrative-finale-statement", children: section.text.prompt }, void 0, false, {
              fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeLabExperience.jsx",
              lineNumber: 346,
              columnNumber: 36
            }, this) : null,
            /* @__PURE__ */ jsxDEV("nav", { className: "about-narrative-cta", "aria-label": "Contact Alexander", children: [
              /* @__PURE__ */ jsxDEV("a", { href: `mailto:${ABOUT_NARRATIVE_CONTACT.email}`, children: "Email" }, void 0, false, {
                fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeLabExperience.jsx",
                lineNumber: 348,
                columnNumber: 15
              }, this),
              /* @__PURE__ */ jsxDEV("a", { href: ABOUT_NARRATIVE_CONTACT.linkedin, target: "_blank", rel: "noreferrer", children: "LinkedIn" }, void 0, false, {
                fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeLabExperience.jsx",
                lineNumber: 349,
                columnNumber: 15
              }, this)
            ] }, void 0, true, {
              fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeLabExperience.jsx",
              lineNumber: 347,
              columnNumber: 13
            }, this)
          ] }, void 0, true, {
            fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeLabExperience.jsx",
            lineNumber: 344,
            columnNumber: 11
          }, this)
        ] }, void 0, true, {
          fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeLabExperience.jsx",
          lineNumber: 328,
          columnNumber: 9
        }, this) }, void 0, false, {
          fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeLabExperience.jsx",
          lineNumber: 327,
          columnNumber: 7
        }, this)
      ]
    },
    void 0,
    true,
    {
      fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeLabExperience.jsx",
      lineNumber: 316,
      columnNumber: 5
    },
    this
  );
}
_c0 = FinaleSection;
function ScrollProgressIndicator({ activeSectionIndex, activeStartIndex, sectionCount }) {
  const maxStartIndex = Math.max(
    1,
    ABOUT_SCROLL_INDICATOR_TICK_COUNT - ABOUT_SCROLL_INDICATOR_ACTIVE_TICK_COUNT
  );
  const progressValue = Math.round(activeStartIndex / maxStartIndex * 100);
  const sectionStatus = `Section ${activeSectionIndex + 1} of ${sectionCount}`;
  return /* @__PURE__ */ jsxDEV(Fragment, { children: [
    /* @__PURE__ */ jsxDEV(
      "div",
      {
        className: "about-narrative-indicator",
        "data-about-indicator-layer": "ui",
        role: "progressbar",
        "aria-label": "About page scroll progress",
        "aria-valuemin": "0",
        "aria-valuemax": "100",
        "aria-valuenow": progressValue,
        "aria-valuetext": sectionStatus,
        children: Array.from({ length: ABOUT_SCROLL_INDICATOR_TICK_COUNT }, (_, index) => {
          const isActive = index >= activeStartIndex && index < activeStartIndex + ABOUT_SCROLL_INDICATOR_ACTIVE_TICK_COUNT;
          return /* @__PURE__ */ jsxDEV(
            "div",
            {
              "aria-hidden": "true",
              className: `about-narrative-indicator__line${isActive ? " is-active" : ""}`,
              "data-active": isActive ? "true" : "false",
              "data-line-index": index
            },
            index,
            false,
            {
              fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeLabExperience.jsx",
              lineNumber: 381,
              columnNumber: 13
            },
            this
          );
        })
      },
      void 0,
      false,
      {
        fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeLabExperience.jsx",
        lineNumber: 367,
        columnNumber: 7
      },
      this
    ),
    /* @__PURE__ */ jsxDEV("span", { className: "about-narrative-visually-hidden", role: "status", "aria-live": "polite", "aria-atomic": "true", children: sectionStatus }, void 0, false, {
      fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeLabExperience.jsx",
      lineNumber: 391,
      columnNumber: 7
    }, this)
  ] }, void 0, true, {
    fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeLabExperience.jsx",
    lineNumber: 366,
    columnNumber: 5
  }, this);
}
_c1 = ScrollProgressIndicator;
export function AboutNarrativeLabExperience({
  routeContentId = "about-narrative-lab",
  showIndicator = true
}) {
  _s();
  const editorRequested = useMemo(
    () => typeof window !== "undefined" && routeContentId === "about-narrative-lab" && new URLSearchParams(window.location.search).get("edit") === "1",
    [routeContentId]
  );
  const [editorModule, setEditorModule] = useState(null);
  const [editorStore, setEditorStore] = useState(null);
  const [indicatorHost, setIndicatorHost] = useState(null);
  const [playbackDocument, setPlaybackDocument] = useState(ABOUT_NARRATIVE_DOCUMENT);
  const rootRef = useRef(null);
  const scrollportRef = useRef(null);
  const contentRef = useRef(null);
  const sectionRefs = useRef([]);
  const worldRuntimeRef = useRef(null);
  const bustInteractionRef = useRef(null);
  const disciplineOverlayRef = useRef(null);
  useLayoutEffect(() => {
    if (!showIndicator || typeof document === "undefined") return void 0;
    const host = document.getElementById("shell-persistent-route-ui-host");
    setIndicatorHost(host);
    return void 0;
  }, [routeContentId, showIndicator]);
  useEffect(() => {
    if (!__DEV__ || !editorRequested) return void 0;
    let active = true;
    Promise.all(
      [
        import("/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx?t=1784283357042"),
        import("/src/routes/about-narrative-lab/aboutNarrativeEditorStore.js?t=1784281395009")
      ]
    ).then(([editor, storeModule]) => {
      if (!active) return;
      const store = storeModule.createAboutNarrativeEditorStore(ABOUT_NARRATIVE_DOCUMENT);
      setEditorStore(store);
      setEditorModule(() => editor.default);
    }).catch((error) => console.error("[About narrative] Could not load the development editor.", error));
    return () => {
      active = false;
    };
  }, [editorRequested]);
  useEffect(() => {
    if (!editorStore) return void 0;
    const update = () => {
      const state = editorStore.getSnapshot();
      setPlaybackDocument(state.tryState?.document || state.document);
    };
    update();
    return editorStore.subscribe(update);
  }, [editorStore]);
  const { activeSectionIndex, activeIndicatorStartIndex } = useAboutNarrativeTimeline({
    document: playbackDocument,
    editorStore,
    rootRef,
    worldRuntimeRef,
    scrollportRef,
    contentRef,
    sectionRefs
  });
  const rootStyle = useMemo(() => ({
    "--about-reading-width": `${playbackDocument.globals.readingWidthRem}rem`
  }), [playbackDocument.globals.readingWidthRem]);
  const disciplineReveal = useMemo(
    () => playbackDocument.sections.find((section) => section.text?.disciplineReveal)?.text.disciplineReveal || null,
    [playbackDocument]
  );
  const select = editorStore ? (selection) => editorStore.setSelection(selection) : null;
  const Editor = editorModule;
  return /* @__PURE__ */ jsxDEV("div", { ref: rootRef, className: "about-narrative-lab", "data-route-content": routeContentId, style: rootStyle, children: [
    /* @__PURE__ */ jsxDEV(AboutNarrativeWorld, { rendererId: "three-point-world-v1", rootRef, interactionRef: bustInteractionRef, disciplineOverlayRef, runtimeRef: worldRuntimeRef }, void 0, false, {
      fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeLabExperience.jsx",
      lineNumber: 472,
      columnNumber: 7
    }, this),
    /* @__PURE__ */ jsxDEV(DisciplineRevealOverlay, { reveal: disciplineReveal, overlayRef: disciplineOverlayRef }, void 0, false, {
      fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeLabExperience.jsx",
      lineNumber: 473,
      columnNumber: 7
    }, this),
    /* @__PURE__ */ jsxDEV("div", { ref: scrollportRef, className: "about-narrative-scrollport", "data-lenis-prevent-touch": true, tabIndex: 0, "aria-label": "About Alexander narrative", children: /* @__PURE__ */ jsxDEV("main", { ref: contentRef, className: "about-narrative-content", children: playbackDocument.sections.map((section, index) => {
      const sectionRef = (node) => {
        sectionRefs.current[index] = node;
      };
      if (section.layout === "opener") return /* @__PURE__ */ jsxDEV(OpeningSection, { section, index, sectionRef, onSelect: select }, section.id, false, {
        fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeLabExperience.jsx",
        lineNumber: 478,
        columnNumber: 53
      }, this);
      if (section.type === "spatial") return /* @__PURE__ */ jsxDEV(SpatialSection, { section, index, sectionRef, onSelect: select }, section.id, false, {
        fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeLabExperience.jsx",
        lineNumber: 479,
        columnNumber: 52
      }, this);
      if (section.type === "finale") return /* @__PURE__ */ jsxDEV(FinaleSection, { section, index, sectionRef, interactionRef: bustInteractionRef, onSelect: select }, section.id, false, {
        fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeLabExperience.jsx",
        lineNumber: 480,
        columnNumber: 51
      }, this);
      return /* @__PURE__ */ jsxDEV(EditorialSection, { section, index, sectionRef, onSelect: select }, section.id, false, {
        fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeLabExperience.jsx",
        lineNumber: 481,
        columnNumber: 20
      }, this);
    }) }, void 0, false, {
      fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeLabExperience.jsx",
      lineNumber: 475,
      columnNumber: 9
    }, this) }, void 0, false, {
      fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeLabExperience.jsx",
      lineNumber: 474,
      columnNumber: 7
    }, this),
    showIndicator && indicatorHost ? createPortal(
      /* @__PURE__ */ jsxDEV("div", { className: "about-narrative-indicator-layer", "data-about-indicator-host": "shell-persistent", children: /* @__PURE__ */ jsxDEV(
        ScrollProgressIndicator,
        {
          activeSectionIndex,
          activeStartIndex: activeIndicatorStartIndex,
          sectionCount: playbackDocument.sections.length
        },
        void 0,
        false,
        {
          fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeLabExperience.jsx",
          lineNumber: 488,
          columnNumber: 13
        },
        this
      ) }, void 0, false, {
        fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeLabExperience.jsx",
        lineNumber: 487,
        columnNumber: 9
      }, this),
      indicatorHost
    ) : null,
    Editor && editorStore ? /* @__PURE__ */ jsxDEV(Editor, { store: editorStore, runtimeRef: worldRuntimeRef, rootRef }, void 0, false, {
      fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeLabExperience.jsx",
      lineNumber: 497,
      columnNumber: 32
    }, this) : null
  ] }, void 0, true, {
    fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeLabExperience.jsx",
    lineNumber: 471,
    columnNumber: 5
  }, this);
}
_s(AboutNarrativeLabExperience, "XI0DFjHFjxkNuI23K2cwUna6ACA=", false, function() {
  return [useAboutNarrativeTimeline];
});
_c10 = AboutNarrativeLabExperience;
var _c, _c2, _c3, _c4, _c5, _c6, _c7, _c8, _c9, _c0, _c1, _c10;
$RefreshReg$(_c, "VerticalCueSequence");
$RefreshReg$(_c2, "OpeningSection");
$RefreshReg$(_c3, "SpatialSection");
$RefreshReg$(_c4, "DisciplineRevealOverlay");
$RefreshReg$(_c5, "EditorialList");
$RefreshReg$(_c6, "DisciplineList");
$RefreshReg$(_c7, "ClientLogos");
$RefreshReg$(_c8, "EditorialText");
$RefreshReg$(_c9, "EditorialSection");
$RefreshReg$(_c0, "FinaleSection");
$RefreshReg$(_c1, "ScrollProgressIndicator");
$RefreshReg$(_c10, "AboutNarrativeLabExperience");
import * as RefreshRuntime from "/@react-refresh";
const inWebWorker = typeof WorkerGlobalScope !== "undefined" && self instanceof WorkerGlobalScope;
if (import.meta.hot && !inWebWorker) {
  if (!window.$RefreshReg$) {
    throw new Error(
      "@vitejs/plugin-react can't detect preamble. Something is wrong."
    );
  }
  RefreshRuntime.__hmr_import(import.meta.url).then((currentExports) => {
    RefreshRuntime.registerExportsForReactRefresh("/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeLabExperience.jsx", currentExports);
    import.meta.hot.accept((nextExports) => {
      if (!nextExports) return;
      const invalidateMessage = RefreshRuntime.validateRefreshBoundaryAndEnqueueUpdate("/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeLabExperience.jsx", currentExports, nextExports);
      if (invalidateMessage) import.meta.hot.invalidate(invalidateMessage);
    });
  });
}
function $RefreshReg$(type, id) {
  return RefreshRuntime.register(type, "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeLabExperience.jsx " + id);
}
function $RefreshSig$() {
  return RefreshRuntime.createSignatureFunctionForTransform();
}

//# sourceMappingURL=data:application/json;base64,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QUFBQTtBQUFBQSxRQUgxQztBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUEsTUFHaUQsS0FKbkQ7QUFBQTtBQUFBO0FBQUE7QUFBQSxhQU1BO0FBQUEsTUFDQWtIO0FBQUFBLElBQ0YsSUFDRTtBQUFBLElBQ0h5QyxVQUFVM0MsY0FBYyx1QkFBQyxVQUFPLE9BQU9BLGFBQWEsWUFBWVUsaUJBQWlCLFdBQXpEO0FBQUE7QUFBQTtBQUFBO0FBQUEsV0FBMEUsSUFBTTtBQUFBLE9BMUIzRztBQUFBO0FBQUE7QUFBQTtBQUFBLFNBMkJBO0FBRUo7QUFBQ25CLEdBdEdlSCw2QkFBMkI7QUFBQSxVQXFEaUIxSCx5QkFBeUI7QUFBQTtBQUFBLE9BckRyRTBIO0FBQTJCLElBQUFsRixJQUFBUSxLQUFBSyxLQUFBUSxLQUFBRyxLQUFBSyxLQUFBSSxLQUFBb0IsS0FBQU8sS0FBQVEsS0FBQWEsS0FBQTJEO0FBQUEsYUFBQTVJLElBQUE7QUFBQSxhQUFBUSxLQUFBO0FBQUEsYUFBQUssS0FBQTtBQUFBLGFBQUFRLEtBQUE7QUFBQSxhQUFBRyxLQUFBO0FBQUEsYUFBQUssS0FBQTtBQUFBLGFBQUFJLEtBQUE7QUFBQSxhQUFBb0IsS0FBQTtBQUFBLGFBQUFPLEtBQUE7QUFBQSxhQUFBUSxLQUFBO0FBQUEsYUFBQWEsS0FBQTtBQUFBLGFBQUEyRCxNQUFBIiwibmFtZXMiOlsidXNlRWZmZWN0IiwidXNlTGF5b3V0RWZmZWN0IiwidXNlTWVtbyIsInVzZVJlZiIsInVzZVN0YXRlIiwiY3JlYXRlUG9ydGFsIiwiQUJPVVRfTkFSUkFUSVZFX0NPTlRBQ1QiLCJBQk9VVF9OQVJSQVRJVkVfRE9DVU1FTlQiLCJnZXRBYm91dE5hcnJhdGl2ZUN1ZU1vdmVtZW50IiwiQWJvdXROYXJyYXRpdmVXb3JsZCIsIkFCT1VUX1NDUk9MTF9JTkRJQ0FUT1JfQUNUSVZFX1RJQ0tfQ09VTlQiLCJBQk9VVF9TQ1JPTExfSU5ESUNBVE9SX1RJQ0tfQ09VTlQiLCJ1c2VBYm91dE5hcnJhdGl2ZVRpbWVsaW5lIiwiZ2V0U2VjdGlvblN0eWxlIiwic2VjdGlvbiIsImV4dGVudFdVIiwibW9iaWxlRXh0ZW50V1UiLCJnZXRWZXJ0aWNhbEN1ZVN0eWxlIiwiY3VlIiwiZGVza3RvcEV4dGVudFdVIiwiTWF0aCIsIm1heCIsIk51bWJlciIsImRlc2t0b3BUcmF2ZWxXVSIsIm1vYmlsZVRyYXZlbFdVIiwiZGVza3RvcFRvcCIsImhvbGQiLCJtb2JpbGVUb3AiLCJ0b0ZpeGVkIiwiVmVydGljYWxDdWVTZXF1ZW5jZSIsImN1ZXMiLCJoZWFkaW5nSWQiLCJoZWFkaW5nTGV2ZWwiLCJvblNlbGVjdCIsImxlbmd0aCIsIkhlYWRpbmciLCJtYXAiLCJjdWVJbmRleCIsImlzU2VtYW50aWNIZWFkaW5nIiwiQm9vbGVhbiIsIkVsZW1lbnQiLCJ1bmRlZmluZWQiLCJsYXlvdXQiLCJpZCIsIml0ZW0iLCJ0ZXh0Iiwiam9pbiIsImV2ZW50Iiwic3RvcFByb3BhZ2F0aW9uIiwidHlwZSIsInNlY3Rpb25JZCIsImN1ZUlkIiwiX2MiLCJPcGVuaW5nU2VjdGlvbiIsImluZGV4Iiwic2VjdGlvblJlZiIsInZlcnRpY2FsQ3VlcyIsImZpbHRlciIsInNwYXRpYWxDdWVzIiwiY29weSIsIl9jMiIsIlNwYXRpYWxTZWN0aW9uIiwiaGFzSGVhZGluZyIsImxheW91dENsYXNzIiwibGFiZWwiLCJfYzMiLCJEaXNjaXBsaW5lUmV2ZWFsT3ZlcmxheSIsInJldmVhbCIsIm92ZXJsYXlSZWYiLCJpdGVtcyIsImdyb3VwIiwidG9uZSIsImxhYmVsT2Zmc2V0UHgiLCJfYzQiLCJFZGl0b3JpYWxMaXN0IiwiYmxvY2siLCJfYzUiLCJEaXNjaXBsaW5lTGlzdCIsIml0ZW1JbmRleCIsIlN0cmluZyIsInBhZFN0YXJ0IiwiX2M2IiwiQ2xpZW50TG9nb3MiLCJ0b0xvd2VyQ2FzZSIsInJlcGxhY2UiLCJfYzciLCJFZGl0b3JpYWxUZXh0IiwiZW1waGFzaXMiLCJtYXRjaGVzIiwiZm9yRWFjaCIsImVtcGhhc2lzSW5kZXgiLCJmcm9tSW5kZXgiLCJzdGFydCIsImluZGV4T2YiLCJwdXNoIiwiZW5kIiwic29ydCIsImEiLCJiIiwiYWNjZXB0ZWQiLCJtYXRjaCIsImF0IiwicGFydHMiLCJjdXJzb3IiLCJzbGljZSIsIl9jOCIsIkVkaXRvcmlhbFNlY3Rpb24iLCJoaWdobGlnaHRlZEJsb2NrIiwiYmxvY2tzIiwiZmluZCIsImtpbmQiLCJ3b3JsZEluZmx1ZW5jZSIsIl9jOSIsIkZpbmFsZVNlY3Rpb24iLCJpbnRlcmFjdGlvblJlZiIsImhhc1N1cHBvcnRpbmdDb3B5IiwicHJvZmlsZSIsInByb21wdCIsImVtYWlsIiwibGlua2VkaW4iLCJfYzAiLCJTY3JvbGxQcm9ncmVzc0luZGljYXRvciIsImFjdGl2ZVNlY3Rpb25JbmRleCIsImFjdGl2ZVN0YXJ0SW5kZXgiLCJzZWN0aW9uQ291bnQiLCJtYXhTdGFydEluZGV4IiwicHJvZ3Jlc3NWYWx1ZSIsInJvdW5kIiwic2VjdGlvblN0YXR1cyIsIkFycmF5IiwiZnJvbSIsIl8iLCJpc0FjdGl2ZSIsIl9jMSIsIkFib3V0TmFycmF0aXZlTGFiRXhwZXJpZW5jZSIsInJvdXRlQ29udGVudElkIiwic2hvd0luZGljYXRvciIsIl9zIiwiZWRpdG9yUmVxdWVzdGVkIiwid2luZG93IiwiVVJMU2VhcmNoUGFyYW1zIiwibG9jYXRpb24iLCJzZWFyY2giLCJnZXQiLCJlZGl0b3JNb2R1bGUiLCJzZXRFZGl0b3JNb2R1bGUiLCJlZGl0b3JTdG9yZSIsInNldEVkaXRvclN0b3JlIiwiaW5kaWNhdG9ySG9zdCIsInNldEluZGljYXRvckhvc3QiLCJwbGF5YmFja0RvY3VtZW50Iiwic2V0UGxheWJhY2tEb2N1bWVudCIsInJvb3RSZWYiLCJzY3JvbGxwb3J0UmVmIiwiY29udGVudFJlZiIsInNlY3Rpb25SZWZzIiwid29ybGRSdW50aW1lUmVmIiwiYnVzdEludGVyYWN0aW9uUmVmIiwiZGlzY2lwbGluZU92ZXJsYXlSZWYiLCJkb2N1bWVudCIsImhvc3QiLCJnZXRFbGVtZW50QnlJZCIsIl9fREVWX18iLCJhY3RpdmUiLCJQcm9taXNlIiwiYWxsIiwidGhlbiIsImVkaXRvciIsInN0b3JlTW9kdWxlIiwic3RvcmUiLCJjcmVhdGVBYm91dE5hcnJhdGl2ZUVkaXRvclN0b3JlIiwiZGVmYXVsdCIsImNhdGNoIiwiZXJyb3IiLCJjb25zb2xlIiwidXBkYXRlIiwic3RhdGUiLCJnZXRTbmFwc2hvdCIsInRyeVN0YXRlIiwic3Vic2NyaWJlIiwiYWN0aXZlSW5kaWNhdG9yU3RhcnRJbmRleCIsInJvb3RTdHlsZSIsImdsb2JhbHMiLCJyZWFkaW5nV2lkdGhSZW0iLCJkaXNjaXBsaW5lUmV2ZWFsIiwic2VjdGlvbnMiLCJzZWxlY3QiLCJzZWxlY3Rpb24iLCJzZXRTZWxlY3Rpb24iLCJFZGl0b3IiLCJub2RlIiwiY3VycmVudCIsIl9jMTAiXSwiaWdub3JlTGlzdCI6W10sInNvdXJjZXMiOlsiQWJvdXROYXJyYXRpdmVMYWJFeHBlcmllbmNlLmpzeCJdLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgeyB1c2VFZmZlY3QsIHVzZUxheW91dEVmZmVjdCwgdXNlTWVtbywgdXNlUmVmLCB1c2VTdGF0ZSB9IGZyb20gJ3JlYWN0JztcbmltcG9ydCB7IGNyZWF0ZVBvcnRhbCB9IGZyb20gJ3JlYWN0LWRvbSc7XG5pbXBvcnQge1xuICBBQk9VVF9OQVJSQVRJVkVfQ09OVEFDVCxcbiAgQUJPVVRfTkFSUkFUSVZFX0RPQ1VNRU5ULFxufSBmcm9tICcuL2Fib3V0TmFycmF0aXZlTGFiRGF0YS5qcyc7XG5pbXBvcnQgeyBnZXRBYm91dE5hcnJhdGl2ZUN1ZU1vdmVtZW50IH0gZnJvbSAnLi9hYm91dE5hcnJhdGl2ZUNvbXBpbGVyLmpzJztcbmltcG9ydCB7IEFib3V0TmFycmF0aXZlV29ybGQgfSBmcm9tICcuL0Fib3V0TmFycmF0aXZlV29ybGQuanN4JztcbmltcG9ydCB7XG4gIEFCT1VUX1NDUk9MTF9JTkRJQ0FUT1JfQUNUSVZFX1RJQ0tfQ09VTlQsXG4gIEFCT1VUX1NDUk9MTF9JTkRJQ0FUT1JfVElDS19DT1VOVCxcbiAgdXNlQWJvdXROYXJyYXRpdmVUaW1lbGluZSxcbn0gZnJvbSAnLi91c2VBYm91dE5hcnJhdGl2ZVRpbWVsaW5lLmpzJztcbmltcG9ydCAnLi9hYm91dC1uYXJyYXRpdmUtbGFiLmNzcyc7XG5cbmZ1bmN0aW9uIGdldFNlY3Rpb25TdHlsZShzZWN0aW9uKSB7XG4gIHJldHVybiB7XG4gICAgJy0tc2VjdGlvbi1kdXJhdGlvbi13dSc6IHNlY3Rpb24uZXh0ZW50V1UsXG4gICAgJy0tc2VjdGlvbi1kdXJhdGlvbi1tb2JpbGUtd3UnOiBzZWN0aW9uLm1vYmlsZUV4dGVudFdVLFxuICB9O1xufVxuXG5mdW5jdGlvbiBnZXRWZXJ0aWNhbEN1ZVN0eWxlKGN1ZSwgc2VjdGlvbikge1xuICBjb25zdCBkZXNrdG9wRXh0ZW50V1UgPSBNYXRoLm1heCgxLCBOdW1iZXIoc2VjdGlvbi5leHRlbnRXVSkpO1xuICBjb25zdCBtb2JpbGVFeHRlbnRXVSA9IE1hdGgubWF4KDEsIE51bWJlcihzZWN0aW9uLm1vYmlsZUV4dGVudFdVKSk7XG4gIGNvbnN0IGRlc2t0b3BUcmF2ZWxXVSA9IE1hdGgubWF4KDAuMDAxLCBkZXNrdG9wRXh0ZW50V1UgLSAxKTtcbiAgY29uc3QgbW9iaWxlVHJhdmVsV1UgPSBNYXRoLm1heCgwLjAwMSwgbW9iaWxlRXh0ZW50V1UgLSAxKTtcbiAgY29uc3QgZGVza3RvcFRvcCA9ICgwLjUgKyAoTnVtYmVyKGN1ZS5ob2xkKSAqIGRlc2t0b3BUcmF2ZWxXVSkpIC8gZGVza3RvcEV4dGVudFdVO1xuICBjb25zdCBtb2JpbGVUb3AgPSAoMC41ICsgKE51bWJlcihjdWUuaG9sZCkgKiBtb2JpbGVUcmF2ZWxXVSkpIC8gbW9iaWxlRXh0ZW50V1U7XG4gIHJldHVybiB7XG4gICAgJy0tdmVydGljYWwtY3VlLXRvcCc6IGAkeyhkZXNrdG9wVG9wICogMTAwKS50b0ZpeGVkKDQpfSVgLFxuICAgICctLXZlcnRpY2FsLWN1ZS10b3AtbW9iaWxlJzogYCR7KG1vYmlsZVRvcCAqIDEwMCkudG9GaXhlZCg0KX0lYCxcbiAgfTtcbn1cblxuZnVuY3Rpb24gVmVydGljYWxDdWVTZXF1ZW5jZSh7IGN1ZXMsIHNlY3Rpb24sIGhlYWRpbmdJZCA9IG51bGwsIGhlYWRpbmdMZXZlbCA9IDIsIG9uU2VsZWN0IH0pIHtcbiAgaWYgKCFjdWVzLmxlbmd0aCkgcmV0dXJuIG51bGw7XG4gIGNvbnN0IEhlYWRpbmcgPSBoZWFkaW5nTGV2ZWwgPT09IDEgPyAnaDEnIDogJ2gyJztcbiAgcmV0dXJuIChcbiAgICA8ZGl2IGNsYXNzTmFtZT1cImFib3V0LW5hcnJhdGl2ZS12ZXJ0aWNhbC1zZXF1ZW5jZVwiIGRhdGEtdGV4dC1tb3ZlbWVudD1cInZlcnRpY2FsXCI+XG4gICAgICB7Y3Vlcy5tYXAoKGN1ZSwgY3VlSW5kZXgpID0+IHtcbiAgICAgICAgY29uc3QgaXNTZW1hbnRpY0hlYWRpbmcgPSBCb29sZWFuKGhlYWRpbmdJZCkgJiYgY3VlSW5kZXggPT09IDA7XG4gICAgICAgIGNvbnN0IEVsZW1lbnQgPSBpc1NlbWFudGljSGVhZGluZyA/IEhlYWRpbmcgOiAncCc7XG4gICAgICAgIHJldHVybiAoXG4gICAgICAgICAgPEVsZW1lbnRcbiAgICAgICAgICAgIGtleT17Y3VlLmlkfVxuICAgICAgICAgICAgaWQ9e2lzU2VtYW50aWNIZWFkaW5nID8gaGVhZGluZ0lkIDogdW5kZWZpbmVkfVxuICAgICAgICAgICAgY2xhc3NOYW1lPXtgYWJvdXQtbmFycmF0aXZlLXZlcnRpY2FsLXRpdGxlJHtzZWN0aW9uLmxheW91dCA9PT0gJ29wZW5lcicgPyAnIGlzLW9wZW5lcicgOiAnJ31gfVxuICAgICAgICAgICAgc3R5bGU9e2dldFZlcnRpY2FsQ3VlU3R5bGUoY3VlLCBzZWN0aW9uKX1cbiAgICAgICAgICAgIGRhdGEtdGV4dC1jdWU9e2N1ZS5pZH1cbiAgICAgICAgICAgIGRhdGEtdGV4dC1tb3ZlbWVudD1cInZlcnRpY2FsXCJcbiAgICAgICAgICAgIGRhdGEtZWRpdG9yaWFsLWxpbmVcbiAgICAgICAgICAgIGRhdGEtcHJpbWFyeS1jb3B5XG4gICAgICAgICAgICBhcmlhLWxhYmVsPXtpc1NlbWFudGljSGVhZGluZyA/IGN1ZXMubWFwKChpdGVtKSA9PiBpdGVtLnRleHQpLmpvaW4oJyAnKSA6IHVuZGVmaW5lZH1cbiAgICAgICAgICAgIGFyaWEtaGlkZGVuPXtpc1NlbWFudGljSGVhZGluZyA/IHVuZGVmaW5lZCA6IHRydWV9XG4gICAgICAgICAgICBvbkNsaWNrPXsoZXZlbnQpID0+IHtcbiAgICAgICAgICAgICAgaWYgKCFvblNlbGVjdCkgcmV0dXJuO1xuICAgICAgICAgICAgICBldmVudC5zdG9wUHJvcGFnYXRpb24oKTtcbiAgICAgICAgICAgICAgb25TZWxlY3QoeyB0eXBlOiAnY3VlJywgc2VjdGlvbklkOiBzZWN0aW9uLmlkLCBjdWVJZDogY3VlLmlkIH0pO1xuICAgICAgICAgICAgfX1cbiAgICAgICAgICA+e2N1ZS50ZXh0fTwvRWxlbWVudD5cbiAgICAgICAgKTtcbiAgICAgIH0pfVxuICAgIDwvZGl2PlxuICApO1xufVxuXG5mdW5jdGlvbiBPcGVuaW5nU2VjdGlvbih7IHNlY3Rpb24sIGluZGV4LCBzZWN0aW9uUmVmLCBvblNlbGVjdCB9KSB7XG4gIGNvbnN0IHZlcnRpY2FsQ3VlcyA9IHNlY3Rpb24udGV4dC5jdWVzLmZpbHRlcigoY3VlKSA9PiBnZXRBYm91dE5hcnJhdGl2ZUN1ZU1vdmVtZW50KGN1ZSkgPT09ICd2ZXJ0aWNhbCcpO1xuICBjb25zdCBzcGF0aWFsQ3VlcyA9IHNlY3Rpb24udGV4dC5jdWVzLmZpbHRlcigoY3VlKSA9PiBnZXRBYm91dE5hcnJhdGl2ZUN1ZU1vdmVtZW50KGN1ZSkgPT09ICdzcGF0aWFsJyk7XG4gIGNvbnN0IGNvcHkgPSBzZWN0aW9uLnRleHQuY3Vlcy5tYXAoKGN1ZSkgPT4gY3VlLnRleHQpLmpvaW4oJyAnKTtcbiAgY29uc3QgaGVhZGluZ0lkID0gJ2Fib3V0LXJvdXRlLXRpdGxlJztcbiAgcmV0dXJuIChcbiAgICA8c2VjdGlvblxuICAgICAgcmVmPXtzZWN0aW9uUmVmfVxuICAgICAgaWQ9e2BhYm91dC1uYXJyYXRpdmUtJHtzZWN0aW9uLmlkfWB9XG4gICAgICBjbGFzc05hbWU9XCJhYm91dC1uYXJyYXRpdmUtc2VjdGlvbiBhYm91dC1uYXJyYXRpdmUtc2VjdGlvbi0tb3BlbmluZ1wiXG4gICAgICBkYXRhLW5hcnJhdGl2ZS1zZWN0aW9uPXtzZWN0aW9uLmlkfVxuICAgICAgZGF0YS1zZWN0aW9uLWluZGV4PXtpbmRleH1cbiAgICAgIHN0eWxlPXtnZXRTZWN0aW9uU3R5bGUoc2VjdGlvbil9XG4gICAgICBhcmlhLWxhYmVsbGVkYnk9e2hlYWRpbmdJZH1cbiAgICAgIG9uQ2xpY2s9eygpID0+IG9uU2VsZWN0Py4oeyB0eXBlOiAnc2VjdGlvbicsIHNlY3Rpb25JZDogc2VjdGlvbi5pZCB9KX1cbiAgICAgIGRhdGEtdGV4dC1tb3ZlbWVudD17dmVydGljYWxDdWVzLmxlbmd0aCAmJiBzcGF0aWFsQ3Vlcy5sZW5ndGggPyAnbWl4ZWQnIDogdmVydGljYWxDdWVzLmxlbmd0aCA/ICd2ZXJ0aWNhbCcgOiAnc3BhdGlhbCd9XG4gICAgPlxuICAgICAgPFZlcnRpY2FsQ3VlU2VxdWVuY2UgY3Vlcz17dmVydGljYWxDdWVzfSBzZWN0aW9uPXtzZWN0aW9ufSBoZWFkaW5nSWQ9e3NwYXRpYWxDdWVzLmxlbmd0aCA/IG51bGwgOiBoZWFkaW5nSWR9IGhlYWRpbmdMZXZlbD17MX0gb25TZWxlY3Q9e29uU2VsZWN0fSAvPlxuICAgICAge3NwYXRpYWxDdWVzLmxlbmd0aCA/IChcbiAgICAgICAgPGRpdiBjbGFzc05hbWU9XCJhYm91dC1uYXJyYXRpdmUtc3BhdGlhbC1zdGFnZVwiIGRhdGEtdGV4dC1tb3ZlbWVudD1cInNwYXRpYWxcIj5cbiAgICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cImFib3V0LW5hcnJhdGl2ZS1zcGF0aWFsLWNvcHlcIj5cbiAgICAgICAgICAgIDxoMSBpZD17aGVhZGluZ0lkfSBjbGFzc05hbWU9XCJhYm91dC1uYXJyYXRpdmUtc3BhdGlhbC10aXRsZVwiIGFyaWEtbGFiZWw9e2NvcHl9IGRhdGEtcHJpbWFyeS1jb3B5PlxuICAgICAgICAgICAgICB7c3BhdGlhbEN1ZXMubWFwKChjdWUpID0+IChcbiAgICAgICAgICAgICAgICA8c3BhbiBrZXk9e2N1ZS5pZH0gY2xhc3NOYW1lPVwiYWJvdXQtbmFycmF0aXZlLXNwYXRpYWwtZnJhZ21lbnRcIiBkYXRhLXRleHQtY3VlPXtjdWUuaWR9IGRhdGEtdGV4dC1tb3ZlbWVudD1cInNwYXRpYWxcIiBhcmlhLWhpZGRlbj1cInRydWVcIiBvbkNsaWNrPXsoZXZlbnQpID0+IHsgZXZlbnQuc3RvcFByb3BhZ2F0aW9uKCk7IG9uU2VsZWN0Py4oeyB0eXBlOiAnY3VlJywgc2VjdGlvbklkOiBzZWN0aW9uLmlkLCBjdWVJZDogY3VlLmlkIH0pOyB9fT57Y3VlLnRleHR9PC9zcGFuPlxuICAgICAgICAgICAgICApKX1cbiAgICAgICAgICAgIDwvaDE+XG4gICAgICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cImFib3V0LW5hcnJhdGl2ZS1vcGVuaW5nLXNjcm9sbC1jdWVcIiBhcmlhLWhpZGRlbj1cInRydWVcIj5cbiAgICAgICAgICAgICAgPGkgY2xhc3NOYW1lPVwidGkgdGktYXJyb3ctbGVmdCBhYm91dC1uYXJyYXRpdmUtb3BlbmluZy1zY3JvbGwtY3VlX19pY29uXCIgLz5cbiAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgIDwvZGl2PlxuICAgICAgICA8L2Rpdj5cbiAgICAgICkgOiBudWxsfVxuICAgIDwvc2VjdGlvbj5cbiAgKTtcbn1cblxuZnVuY3Rpb24gU3BhdGlhbFNlY3Rpb24oeyBzZWN0aW9uLCBpbmRleCwgc2VjdGlvblJlZiwgb25TZWxlY3QgfSkge1xuICBjb25zdCBIZWFkaW5nID0gaW5kZXggPT09IDAgPyAnaDEnIDogJ2gyJztcbiAgY29uc3QgY3VlcyA9IHNlY3Rpb24udGV4dC5jdWVzIHx8IFtdO1xuICBjb25zdCBjb3B5ID0gY3Vlcy5tYXAoKGN1ZSkgPT4gY3VlLnRleHQpLmpvaW4oJyAnKTtcbiAgY29uc3QgdmVydGljYWxDdWVzID0gY3Vlcy5maWx0ZXIoKGN1ZSkgPT4gZ2V0QWJvdXROYXJyYXRpdmVDdWVNb3ZlbWVudChjdWUpID09PSAndmVydGljYWwnKTtcbiAgY29uc3Qgc3BhdGlhbEN1ZXMgPSBjdWVzLmZpbHRlcigoY3VlKSA9PiBnZXRBYm91dE5hcnJhdGl2ZUN1ZU1vdmVtZW50KGN1ZSkgPT09ICdzcGF0aWFsJyk7XG4gIGNvbnN0IGhlYWRpbmdJZCA9IGBhYm91dC1uYXJyYXRpdmUtJHtzZWN0aW9uLmlkfS10aXRsZWA7XG4gIGNvbnN0IGhhc0hlYWRpbmcgPSB2ZXJ0aWNhbEN1ZXMubGVuZ3RoID4gMCB8fCBzcGF0aWFsQ3Vlcy5sZW5ndGggPiAwO1xuICBjb25zdCBsYXlvdXRDbGFzcyA9IHNlY3Rpb24ubGF5b3V0ID09PSAnbG93ZXInXG4gICAgPyAnY29uc3RlbGxhdGlvbidcbiAgICA6IHNlY3Rpb24ubGF5b3V0ID09PSAnd2lkZScgPyAnbGl2aW5nLWZpZWxkJyA6IHNlY3Rpb24ubGF5b3V0O1xuICByZXR1cm4gKFxuICAgIDxzZWN0aW9uXG4gICAgICByZWY9e3NlY3Rpb25SZWZ9XG4gICAgICBpZD17YGFib3V0LW5hcnJhdGl2ZS0ke3NlY3Rpb24uaWR9YH1cbiAgICAgIGNsYXNzTmFtZT17YGFib3V0LW5hcnJhdGl2ZS1zZWN0aW9uIGFib3V0LW5hcnJhdGl2ZS1zZWN0aW9uLS1zcGF0aWFsIGFib3V0LW5hcnJhdGl2ZS1zZWN0aW9uLS0ke2xheW91dENsYXNzfWB9XG4gICAgICBkYXRhLW5hcnJhdGl2ZS1zZWN0aW9uPXtzZWN0aW9uLmlkfVxuICAgICAgZGF0YS1zZWN0aW9uLWluZGV4PXtpbmRleH1cbiAgICAgIHN0eWxlPXtnZXRTZWN0aW9uU3R5bGUoc2VjdGlvbil9XG4gICAgICBhcmlhLWxhYmVsbGVkYnk9e2hhc0hlYWRpbmcgPyBoZWFkaW5nSWQgOiB1bmRlZmluZWR9XG4gICAgICBhcmlhLWxhYmVsPXtoYXNIZWFkaW5nID8gdW5kZWZpbmVkIDogc2VjdGlvbi5sYWJlbH1cbiAgICAgIGRhdGEtdGV4dC1tb3ZlbWVudD17dmVydGljYWxDdWVzLmxlbmd0aCAmJiBzcGF0aWFsQ3Vlcy5sZW5ndGggPyAnbWl4ZWQnIDogdmVydGljYWxDdWVzLmxlbmd0aCA/ICd2ZXJ0aWNhbCcgOiAnc3BhdGlhbCd9XG4gICAgPlxuICAgICAgPFZlcnRpY2FsQ3VlU2VxdWVuY2UgY3Vlcz17dmVydGljYWxDdWVzfSBzZWN0aW9uPXtzZWN0aW9ufSBoZWFkaW5nSWQ9e3NwYXRpYWxDdWVzLmxlbmd0aCA/IG51bGwgOiBoZWFkaW5nSWR9IGhlYWRpbmdMZXZlbD17aW5kZXggPT09IDAgPyAxIDogMn0gb25TZWxlY3Q9e29uU2VsZWN0fSAvPlxuICAgICAge3NwYXRpYWxDdWVzLmxlbmd0aCA/IChcbiAgICAgICAgPGRpdiBjbGFzc05hbWU9XCJhYm91dC1uYXJyYXRpdmUtc3BhdGlhbC1zdGFnZVwiIGRhdGEtdGV4dC1tb3ZlbWVudD1cInNwYXRpYWxcIj5cbiAgICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cImFib3V0LW5hcnJhdGl2ZS1zcGF0aWFsLWNvcHlcIj5cbiAgICAgICAgICAgIDxIZWFkaW5nXG4gICAgICAgICAgICAgIGlkPXtoZWFkaW5nSWR9XG4gICAgICAgICAgICAgIGNsYXNzTmFtZT1cImFib3V0LW5hcnJhdGl2ZS1zcGF0aWFsLXRpdGxlXCJcbiAgICAgICAgICAgICAgYXJpYS1sYWJlbD17Y29weX1cbiAgICAgICAgICAgICAgZGF0YS1wcmltYXJ5LWNvcHlcbiAgICAgICAgICAgID5cbiAgICAgICAgICAgICAge3NwYXRpYWxDdWVzLm1hcCgoY3VlKSA9PiAoXG4gICAgICAgICAgICAgIDxzcGFuXG4gICAgICAgICAgICAgICAga2V5PXtjdWUuaWR9XG4gICAgICAgICAgICAgICAgY2xhc3NOYW1lPVwiYWJvdXQtbmFycmF0aXZlLXNwYXRpYWwtZnJhZ21lbnRcIlxuICAgICAgICAgICAgICAgIGRhdGEtdGV4dC1jdWU9e2N1ZS5pZH1cbiAgICAgICAgICAgICAgICBkYXRhLXRleHQtbW92ZW1lbnQ9XCJzcGF0aWFsXCJcbiAgICAgICAgICAgICAgICBhcmlhLWhpZGRlbj1cInRydWVcIlxuICAgICAgICAgICAgICAgIG9uQ2xpY2s9eyhldmVudCkgPT4geyBldmVudC5zdG9wUHJvcGFnYXRpb24oKTsgb25TZWxlY3Q/Lih7IHR5cGU6ICdjdWUnLCBzZWN0aW9uSWQ6IHNlY3Rpb24uaWQsIGN1ZUlkOiBjdWUuaWQgfSk7IH19XG4gICAgICAgICAgICAgID57Y3VlLnRleHR9PC9zcGFuPlxuICAgICAgICAgICAgICApKX1cbiAgICAgICAgICAgIDwvSGVhZGluZz5cbiAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgPC9kaXY+XG4gICAgICApIDogbnVsbH1cbiAgICA8L3NlY3Rpb24+XG4gICk7XG59XG5cbmZ1bmN0aW9uIERpc2NpcGxpbmVSZXZlYWxPdmVybGF5KHsgcmV2ZWFsLCBvdmVybGF5UmVmIH0pIHtcbiAgaWYgKCFyZXZlYWwpIHJldHVybiBudWxsO1xuICByZXR1cm4gKFxuICAgIDxvbFxuICAgICAgcmVmPXtvdmVybGF5UmVmfVxuICAgICAgY2xhc3NOYW1lPVwiYWJvdXQtbmFycmF0aXZlLWRpc2NpcGxpbmUtcmV2ZWFsXCJcbiAgICAgIGRhdGEtZGlzY2lwbGluZS1yZXZlYWw9e3JldmVhbC5pZH1cbiAgICAgIGFyaWEtbGFiZWw9XCJTaXggY29ubmVjdGVkIGRpc2NpcGxpbmVzXCJcbiAgICAgIGFyaWEtaGlkZGVuPVwidHJ1ZVwiXG4gICAgPlxuICAgICAge3JldmVhbC5pdGVtcy5tYXAoKGl0ZW0pID0+IChcbiAgICAgICAgPGxpXG4gICAgICAgICAga2V5PXtpdGVtLmdyb3VwfVxuICAgICAgICAgIGRhdGEtZGlzY2lwbGluZS1ncm91cD17aXRlbS5ncm91cH1cbiAgICAgICAgICBkYXRhLWRpc2NpcGxpbmUtdG9uZT17aXRlbS50b25lfVxuICAgICAgICAgIHN0eWxlPXt7ICctLWRpc2NpcGxpbmUtbGFiZWwtb2Zmc2V0JzogYCR7cmV2ZWFsLmxhYmVsT2Zmc2V0UHh9cHhgIH19XG4gICAgICAgID5cbiAgICAgICAgICA8c3BhbiBjbGFzc05hbWU9XCJhYm91dC1uYXJyYXRpdmUtZGlzY2lwbGluZS1yZXZlYWxfX2xhYmVsXCI+e2l0ZW0ubGFiZWx9PC9zcGFuPlxuICAgICAgICA8L2xpPlxuICAgICAgKSl9XG4gICAgPC9vbD5cbiAgKTtcbn1cblxuZnVuY3Rpb24gRWRpdG9yaWFsTGlzdCh7IGJsb2NrIH0pIHtcbiAgcmV0dXJuIChcbiAgICA8ZGl2IGNsYXNzTmFtZT1cImFib3V0LW5hcnJhdGl2ZS1lZGl0b3JpYWwtbGlzdFwiPlxuICAgICAge2Jsb2NrLmxhYmVsID8gPHAgY2xhc3NOYW1lPVwiYWJvdXQtbmFycmF0aXZlLWVkaXRvcmlhbC1saXN0X19sYWJlbFwiIGRhdGEtZWRpdG9yaWFsLWxpbmU+e2Jsb2NrLmxhYmVsfTwvcD4gOiBudWxsfVxuICAgICAgPHVsPntibG9jay5pdGVtcy5tYXAoKGl0ZW0pID0+IDxsaSBrZXk9e2l0ZW19IGRhdGEtZWRpdG9yaWFsLWxpbmU+e2l0ZW19PC9saT4pfTwvdWw+XG4gICAgPC9kaXY+XG4gICk7XG59XG5cbmZ1bmN0aW9uIERpc2NpcGxpbmVMaXN0KHsgaXRlbXMgfSkge1xuICByZXR1cm4gKFxuICAgIDxvbCBjbGFzc05hbWU9XCJhYm91dC1uYXJyYXRpdmUtZGlzY2lwbGluZS1saXN0XCIgYXJpYS1sYWJlbD1cIkFyZWFzIG9mIGV4cGVydGlzZVwiPlxuICAgICAge2l0ZW1zLm1hcCgoaXRlbSwgaXRlbUluZGV4KSA9PiAoXG4gICAgICAgIDxsaSBrZXk9e2l0ZW19IGRhdGEtZWRpdG9yaWFsLWxpbmUgZGF0YS13b3JsZC1ncm91cD17aXRlbUluZGV4ICsgMX0+XG4gICAgICAgICAgPHNwYW4gY2xhc3NOYW1lPVwiYWJvdXQtbmFycmF0aXZlLWRpc2NpcGxpbmUtbGlzdF9fbWFya2VyXCIgYXJpYS1oaWRkZW49XCJ0cnVlXCIgLz5cbiAgICAgICAgICA8c3BhbiBjbGFzc05hbWU9XCJhYm91dC1uYXJyYXRpdmUtZGlzY2lwbGluZS1saXN0X19udW1iZXJcIiBhcmlhLWhpZGRlbj1cInRydWVcIj57U3RyaW5nKGl0ZW1JbmRleCArIDEpLnBhZFN0YXJ0KDIsICcwJyl9PC9zcGFuPlxuICAgICAgICAgIDxzcGFuPntpdGVtfTwvc3Bhbj5cbiAgICAgICAgPC9saT5cbiAgICAgICkpfVxuICAgIDwvb2w+XG4gICk7XG59XG5cbmZ1bmN0aW9uIENsaWVudExvZ29zKHsgaXRlbXMgPSBbXSB9KSB7XG4gIHJldHVybiAoXG4gICAgPHVsIGNsYXNzTmFtZT1cImFib3V0LW5hcnJhdGl2ZS1jbGllbnQtbG9nb3NcIiBhcmlhLWxhYmVsPVwiU2VsZWN0ZWQgY2xpZW50c1wiIGRhdGEtZWRpdG9yaWFsLWxpbmU+XG4gICAgICB7aXRlbXMubWFwKChpdGVtKSA9PiAoXG4gICAgICAgIDxsaSBrZXk9e2l0ZW19IGRhdGEtY2xpZW50LWxvZ289e2l0ZW0udG9Mb3dlckNhc2UoKS5yZXBsYWNlKC9bXmEtejAtOV0rL2csICctJyl9PlxuICAgICAgICAgIHtpdGVtfVxuICAgICAgICA8L2xpPlxuICAgICAgKSl9XG4gICAgPC91bD5cbiAgKTtcbn1cblxuZnVuY3Rpb24gRWRpdG9yaWFsVGV4dCh7IHRleHQgPSAnJywgZW1waGFzaXMgPSBbXSB9KSB7XG4gIGlmICghZW1waGFzaXMubGVuZ3RoKSByZXR1cm4gdGV4dDtcbiAgY29uc3QgbWF0Y2hlcyA9IFtdO1xuICBlbXBoYXNpcy5mb3JFYWNoKChpdGVtLCBlbXBoYXNpc0luZGV4KSA9PiB7XG4gICAgaWYgKCFpdGVtLnRleHQpIHJldHVybjtcbiAgICBsZXQgZnJvbUluZGV4ID0gMDtcbiAgICB3aGlsZSAoZnJvbUluZGV4IDwgdGV4dC5sZW5ndGgpIHtcbiAgICAgIGNvbnN0IHN0YXJ0ID0gdGV4dC5pbmRleE9mKGl0ZW0udGV4dCwgZnJvbUluZGV4KTtcbiAgICAgIGlmIChzdGFydCA8IDApIGJyZWFrO1xuICAgICAgbWF0Y2hlcy5wdXNoKHtcbiAgICAgICAgc3RhcnQsXG4gICAgICAgIGVuZDogc3RhcnQgKyBpdGVtLnRleHQubGVuZ3RoLFxuICAgICAgICB0b25lOiBpdGVtLnRvbmUsXG4gICAgICAgIGVtcGhhc2lzSW5kZXgsXG4gICAgICB9KTtcbiAgICAgIGZyb21JbmRleCA9IHN0YXJ0ICsgaXRlbS50ZXh0Lmxlbmd0aDtcbiAgICB9XG4gIH0pO1xuICBtYXRjaGVzLnNvcnQoKGEsIGIpID0+IChhLnN0YXJ0IC0gYi5zdGFydCkgfHwgKGIuZW5kIC0gYS5lbmQpIHx8IChhLmVtcGhhc2lzSW5kZXggLSBiLmVtcGhhc2lzSW5kZXgpKTtcbiAgY29uc3QgYWNjZXB0ZWQgPSBbXTtcbiAgbWF0Y2hlcy5mb3JFYWNoKChtYXRjaCkgPT4ge1xuICAgIGlmIChtYXRjaC5zdGFydCA+PSAoYWNjZXB0ZWQuYXQoLTEpPy5lbmQgfHwgMCkpIGFjY2VwdGVkLnB1c2gobWF0Y2gpO1xuICB9KTtcbiAgaWYgKCFhY2NlcHRlZC5sZW5ndGgpIHJldHVybiB0ZXh0O1xuXG4gIGNvbnN0IHBhcnRzID0gW107XG4gIGxldCBjdXJzb3IgPSAwO1xuICBhY2NlcHRlZC5mb3JFYWNoKChtYXRjaCkgPT4ge1xuICAgIGlmIChtYXRjaC5zdGFydCA+IGN1cnNvcikgcGFydHMucHVzaCh0ZXh0LnNsaWNlKGN1cnNvciwgbWF0Y2guc3RhcnQpKTtcbiAgICBwYXJ0cy5wdXNoKFxuICAgICAgPHN0cm9uZ1xuICAgICAgICBjbGFzc05hbWU9XCJhYm91dC1uYXJyYXRpdmUtZWRpdG9yaWFsLWVtcGhhc2lzXCJcbiAgICAgICAgZGF0YS1lbXBoYXNpcy10b25lPXttYXRjaC50b25lfVxuICAgICAgICBrZXk9e2Ake21hdGNoLnN0YXJ0fS0ke21hdGNoLmVuZH1gfVxuICAgICAgPlxuICAgICAgICB7dGV4dC5zbGljZShtYXRjaC5zdGFydCwgbWF0Y2guZW5kKX1cbiAgICAgIDwvc3Ryb25nPixcbiAgICApO1xuICAgIGN1cnNvciA9IG1hdGNoLmVuZDtcbiAgfSk7XG4gIGlmIChjdXJzb3IgPCB0ZXh0Lmxlbmd0aCkgcGFydHMucHVzaCh0ZXh0LnNsaWNlKGN1cnNvcikpO1xuICByZXR1cm4gcGFydHM7XG59XG5cbmZ1bmN0aW9uIEVkaXRvcmlhbFNlY3Rpb24oeyBzZWN0aW9uLCBpbmRleCwgc2VjdGlvblJlZiwgb25TZWxlY3QgfSkge1xuICBjb25zdCBoaWdobGlnaHRlZEJsb2NrID0gc2VjdGlvbi50ZXh0LmJsb2Nrcy5maW5kKChibG9jaykgPT4gYmxvY2sua2luZCA9PT0gJ2hpZ2hsaWdodCcpO1xuICByZXR1cm4gKFxuICAgIDxzZWN0aW9uXG4gICAgICByZWY9e3NlY3Rpb25SZWZ9XG4gICAgICBpZD17YGFib3V0LW5hcnJhdGl2ZS0ke3NlY3Rpb24uaWR9YH1cbiAgICAgIGNsYXNzTmFtZT17YGFib3V0LW5hcnJhdGl2ZS1zZWN0aW9uIGFib3V0LW5hcnJhdGl2ZS1zZWN0aW9uLS1lZGl0b3JpYWwke3NlY3Rpb24ubGF5b3V0ID8gYCBhYm91dC1uYXJyYXRpdmUtc2VjdGlvbi0tJHtzZWN0aW9uLmxheW91dH1gIDogJyd9YH1cbiAgICAgIGRhdGEtbmFycmF0aXZlLXNlY3Rpb249e3NlY3Rpb24uaWR9XG4gICAgICBkYXRhLXNlY3Rpb24taW5kZXg9e2luZGV4fVxuICAgICAgc3R5bGU9e2dldFNlY3Rpb25TdHlsZShzZWN0aW9uKX1cbiAgICAgIGFyaWEtbGFiZWxsZWRieT17YGFib3V0LW5hcnJhdGl2ZS0ke3NlY3Rpb24uaWR9LXRpdGxlYH1cbiAgICAgIG9uQ2xpY2s9eygpID0+IG9uU2VsZWN0Py4oeyB0eXBlOiAnc2VjdGlvbicsIHNlY3Rpb25JZDogc2VjdGlvbi5pZCB9KX1cbiAgICAgIGRhdGEtdGV4dC1tb3ZlbWVudD1cInZlcnRpY2FsXCJcbiAgICA+XG4gICAgICA8ZGl2IGNsYXNzTmFtZT1cImFib3V0LW5hcnJhdGl2ZS1lZGl0b3JpYWwtaW5uZXJcIj5cbiAgICAgICAgPGgyXG4gICAgICAgICAgaWQ9e2BhYm91dC1uYXJyYXRpdmUtJHtzZWN0aW9uLmlkfS10aXRsZWB9XG4gICAgICAgICAgY2xhc3NOYW1lPVwiYWJvdXQtbmFycmF0aXZlLWVkaXRvcmlhbC10aXRsZVwiXG4gICAgICAgICAgZGF0YS1lZGl0b3JpYWwtbGluZVxuICAgICAgICAgIGRhdGEtZWRpdG9yaWFsLWJsb2NrPXtoaWdobGlnaHRlZEJsb2NrPy5pZH1cbiAgICAgICAgICBkYXRhLXByaW1hcnktY29weVxuICAgICAgICA+XG4gICAgICAgICAgPEVkaXRvcmlhbFRleHRcbiAgICAgICAgICAgIHRleHQ9e2hpZ2hsaWdodGVkQmxvY2s/LnRleHQgfHwgc2VjdGlvbi5sYWJlbH1cbiAgICAgICAgICAgIGVtcGhhc2lzPXtoaWdobGlnaHRlZEJsb2NrPy5lbXBoYXNpc31cbiAgICAgICAgICAvPlxuICAgICAgICA8L2gyPlxuICAgICAgICB7c2VjdGlvbi50ZXh0LmJsb2Nrcy5tYXAoKGJsb2NrKSA9PiB7XG4gICAgICAgICAgaWYgKGJsb2NrLmlkID09PSBoaWdobGlnaHRlZEJsb2NrPy5pZCkgcmV0dXJuIG51bGw7XG4gICAgICAgICAgaWYgKGJsb2NrLmtpbmQgPT09ICdsaXN0JykgcmV0dXJuIDxFZGl0b3JpYWxMaXN0IGtleT17YmxvY2suaWR9IGJsb2NrPXtibG9ja30gLz47XG4gICAgICAgICAgaWYgKGJsb2NrLmtpbmQgPT09ICdkaXNjaXBsaW5lcycpIHJldHVybiA8RGlzY2lwbGluZUxpc3Qga2V5PXtibG9jay5pZH0gaXRlbXM9e2Jsb2NrLml0ZW1zfSAvPjtcbiAgICAgICAgICBpZiAoYmxvY2sua2luZCA9PT0gJ2NsaWVudHMnKSByZXR1cm4gPENsaWVudExvZ29zIGtleT17YmxvY2suaWR9IGl0ZW1zPXtibG9jay5pdGVtc30gLz47XG4gICAgICAgICAgaWYgKGJsb2NrLmtpbmQgPT09ICdkZXRhaWwnKSByZXR1cm4gPHAga2V5PXtibG9jay5pZH0gY2xhc3NOYW1lPVwiYWJvdXQtbmFycmF0aXZlLWVkaXRvcmlhbC1kZXRhaWxcIiBkYXRhLWVkaXRvcmlhbC1saW5lIGRhdGEtZWRpdG9yaWFsLWJsb2NrPXtibG9jay5pZH0+PEVkaXRvcmlhbFRleHQgdGV4dD17YmxvY2sudGV4dH0gZW1waGFzaXM9e2Jsb2NrLmVtcGhhc2lzfSAvPjwvcD47XG4gICAgICAgICAgcmV0dXJuIChcbiAgICAgICAgICAgIDxwXG4gICAgICAgICAgICAgIGtleT17YmxvY2suaWR9XG4gICAgICAgICAgICAgIGNsYXNzTmFtZT1cImFib3V0LW5hcnJhdGl2ZS1lZGl0b3JpYWwtY29weVwiXG4gICAgICAgICAgICAgIGRhdGEtZWRpdG9yaWFsLWxpbmVcbiAgICAgICAgICAgICAgZGF0YS1lZGl0b3JpYWwtYmxvY2s9e2Jsb2NrLmlkfVxuICAgICAgICAgICAgICBkYXRhLXdvcmxkLWluZmx1ZW5jZT17YmxvY2sud29ybGRJbmZsdWVuY2UgPyAndHJ1ZScgOiB1bmRlZmluZWR9XG4gICAgICAgICAgICAgIGRhdGEtcHJpbWFyeS1jb3B5XG4gICAgICAgICAgICA+XG4gICAgICAgICAgICAgIDxFZGl0b3JpYWxUZXh0IHRleHQ9e2Jsb2NrLnRleHR9IGVtcGhhc2lzPXtibG9jay5lbXBoYXNpc30gLz5cbiAgICAgICAgICAgIDwvcD5cbiAgICAgICAgICApO1xuICAgICAgICB9KX1cbiAgICAgIDwvZGl2PlxuICAgIDwvc2VjdGlvbj5cbiAgKTtcbn1cblxuZnVuY3Rpb24gRmluYWxlU2VjdGlvbih7IHNlY3Rpb24sIGluZGV4LCBzZWN0aW9uUmVmLCBpbnRlcmFjdGlvblJlZiwgb25TZWxlY3QgfSkge1xuICBjb25zdCBjb3B5ID0gc2VjdGlvbi50ZXh0LmN1ZXMubWFwKChjdWUpID0+IGN1ZS50ZXh0KS5qb2luKCcgJyk7XG4gIGNvbnN0IHNwYXRpYWxDdWVzID0gc2VjdGlvbi50ZXh0LmN1ZXMuZmlsdGVyKChjdWUpID0+IGdldEFib3V0TmFycmF0aXZlQ3VlTW92ZW1lbnQoY3VlKSA9PT0gJ3NwYXRpYWwnKTtcbiAgY29uc3QgdmVydGljYWxDdWVzID0gc2VjdGlvbi50ZXh0LmN1ZXMuZmlsdGVyKChjdWUpID0+IGdldEFib3V0TmFycmF0aXZlQ3VlTW92ZW1lbnQoY3VlKSA9PT0gJ3ZlcnRpY2FsJyk7XG4gIGNvbnN0IGhhc1N1cHBvcnRpbmdDb3B5ID0gQm9vbGVhbihzZWN0aW9uLnRleHQucHJvZmlsZSB8fCBzZWN0aW9uLnRleHQucHJvbXB0KTtcbiAgY29uc3QgaGVhZGluZ0lkID0gYGFib3V0LW5hcnJhdGl2ZS0ke3NlY3Rpb24uaWR9LXRpdGxlYDtcbiAgcmV0dXJuIChcbiAgICA8c2VjdGlvblxuICAgICAgcmVmPXtzZWN0aW9uUmVmfVxuICAgICAgaWQ9e2BhYm91dC1uYXJyYXRpdmUtJHtzZWN0aW9uLmlkfWB9XG4gICAgICBjbGFzc05hbWU9XCJhYm91dC1uYXJyYXRpdmUtc2VjdGlvbiBhYm91dC1uYXJyYXRpdmUtc2VjdGlvbi0tc3BhdGlhbCBhYm91dC1uYXJyYXRpdmUtc2VjdGlvbi0tY2xvc2luZyBhYm91dC1uYXJyYXRpdmUtc2VjdGlvbi0tZmluYWxlXCJcbiAgICAgIGRhdGEtbmFycmF0aXZlLXNlY3Rpb249e3NlY3Rpb24uaWR9XG4gICAgICBkYXRhLXNlY3Rpb24taW5kZXg9e2luZGV4fVxuICAgICAgc3R5bGU9e2dldFNlY3Rpb25TdHlsZShzZWN0aW9uKX1cbiAgICAgIGFyaWEtbGFiZWxsZWRieT17aGVhZGluZ0lkfVxuICAgICAgZGF0YS10ZXh0LW1vdmVtZW50PXt2ZXJ0aWNhbEN1ZXMubGVuZ3RoICYmIHNwYXRpYWxDdWVzLmxlbmd0aCA/ICdtaXhlZCcgOiB2ZXJ0aWNhbEN1ZXMubGVuZ3RoID8gJ3ZlcnRpY2FsJyA6ICdzcGF0aWFsJ31cbiAgICA+XG4gICAgICA8VmVydGljYWxDdWVTZXF1ZW5jZSBjdWVzPXt2ZXJ0aWNhbEN1ZXN9IHNlY3Rpb249e3NlY3Rpb259IGhlYWRpbmdJZD17c3BhdGlhbEN1ZXMubGVuZ3RoID8gbnVsbCA6IGhlYWRpbmdJZH0gaGVhZGluZ0xldmVsPXsyfSBvblNlbGVjdD17b25TZWxlY3R9IC8+XG4gICAgICA8ZGl2IGNsYXNzTmFtZT1cImFib3V0LW5hcnJhdGl2ZS1zcGF0aWFsLXN0YWdlIGFib3V0LW5hcnJhdGl2ZS1maW5hbGUtc3RhZ2VcIj5cbiAgICAgICAgPGRpdiBjbGFzc05hbWU9XCJhYm91dC1uYXJyYXRpdmUtc3BhdGlhbC1jb3B5IGFib3V0LW5hcnJhdGl2ZS1maW5hbGUtY29weVwiPlxuICAgICAgICAgIHtzcGF0aWFsQ3Vlcy5sZW5ndGggPyAoXG4gICAgICAgICAgICA8aDIgaWQ9e2hlYWRpbmdJZH0gY2xhc3NOYW1lPVwiYWJvdXQtbmFycmF0aXZlLXNwYXRpYWwtdGl0bGVcIiBhcmlhLWxhYmVsPXtjb3B5fSBkYXRhLXByaW1hcnktY29weT5cbiAgICAgICAgICAgICAge3NwYXRpYWxDdWVzLm1hcCgoY3VlKSA9PiAoXG4gICAgICAgICAgICAgICAgPHNwYW4ga2V5PXtjdWUuaWR9IGNsYXNzTmFtZT1cImFib3V0LW5hcnJhdGl2ZS1zcGF0aWFsLWZyYWdtZW50XCIgZGF0YS10ZXh0LWN1ZT17Y3VlLmlkfSBkYXRhLXRleHQtbW92ZW1lbnQ9XCJzcGF0aWFsXCIgYXJpYS1oaWRkZW49XCJ0cnVlXCIgb25DbGljaz17KCkgPT4gb25TZWxlY3Q/Lih7IHR5cGU6ICdjdWUnLCBzZWN0aW9uSWQ6IHNlY3Rpb24uaWQsIGN1ZUlkOiBjdWUuaWQgfSl9PntjdWUudGV4dH08L3NwYW4+XG4gICAgICAgICAgICAgICkpfVxuICAgICAgICAgICAgPC9oMj5cbiAgICAgICAgICApIDogbnVsbH1cbiAgICAgICAgICA8ZGl2XG4gICAgICAgICAgICByZWY9e2ludGVyYWN0aW9uUmVmfVxuICAgICAgICAgICAgY2xhc3NOYW1lPVwiYWJvdXQtbmFycmF0aXZlLWJ1c3QtaW50ZXJhY3Rpb25cIlxuICAgICAgICAgICAgZGF0YS1hY3RpdmU9XCJmYWxzZVwiXG4gICAgICAgICAgICByb2xlPVwiZ3JvdXBcIlxuICAgICAgICAgICAgYXJpYS1sYWJlbD1cIlJvdGF0ZSB0aGUgcG9pbnQtY2xvdWQgYnVzdCBob3Jpem9udGFsbHlcIlxuICAgICAgICAgICAgdGFiSW5kZXg9ey0xfVxuICAgICAgICAgIC8+XG4gICAgICAgICAgPGRpdiBjbGFzc05hbWU9e2BhYm91dC1uYXJyYXRpdmUtZmluYWxlLWN0YSR7aGFzU3VwcG9ydGluZ0NvcHkgPyAnJyA6ICcgaXMtYWN0aW9ucy1vbmx5J31gfT5cbiAgICAgICAgICAgIHtzZWN0aW9uLnRleHQucHJvZmlsZSA/IDxwIGNsYXNzTmFtZT1cImFib3V0LW5hcnJhdGl2ZS1maW5hbGUtcHJvZmlsZVwiPntzZWN0aW9uLnRleHQucHJvZmlsZX08L3A+IDogbnVsbH1cbiAgICAgICAgICAgIHtzZWN0aW9uLnRleHQucHJvbXB0ID8gPHAgY2xhc3NOYW1lPVwiYWJvdXQtbmFycmF0aXZlLWZpbmFsZS1zdGF0ZW1lbnRcIj57c2VjdGlvbi50ZXh0LnByb21wdH08L3A+IDogbnVsbH1cbiAgICAgICAgICAgIDxuYXYgY2xhc3NOYW1lPVwiYWJvdXQtbmFycmF0aXZlLWN0YVwiIGFyaWEtbGFiZWw9XCJDb250YWN0IEFsZXhhbmRlclwiPlxuICAgICAgICAgICAgICA8YSBocmVmPXtgbWFpbHRvOiR7QUJPVVRfTkFSUkFUSVZFX0NPTlRBQ1QuZW1haWx9YH0+RW1haWw8L2E+XG4gICAgICAgICAgICAgIDxhIGhyZWY9e0FCT1VUX05BUlJBVElWRV9DT05UQUNULmxpbmtlZGlufSB0YXJnZXQ9XCJfYmxhbmtcIiByZWw9XCJub3JlZmVycmVyXCI+TGlua2VkSW48L2E+XG4gICAgICAgICAgICA8L25hdj5cbiAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgPC9kaXY+XG4gICAgICA8L2Rpdj5cbiAgICA8L3NlY3Rpb24+XG4gICk7XG59XG5cbmZ1bmN0aW9uIFNjcm9sbFByb2dyZXNzSW5kaWNhdG9yKHsgYWN0aXZlU2VjdGlvbkluZGV4LCBhY3RpdmVTdGFydEluZGV4LCBzZWN0aW9uQ291bnQgfSkge1xuICBjb25zdCBtYXhTdGFydEluZGV4ID0gTWF0aC5tYXgoXG4gICAgMSxcbiAgICBBQk9VVF9TQ1JPTExfSU5ESUNBVE9SX1RJQ0tfQ09VTlQgLSBBQk9VVF9TQ1JPTExfSU5ESUNBVE9SX0FDVElWRV9USUNLX0NPVU5ULFxuICApO1xuICBjb25zdCBwcm9ncmVzc1ZhbHVlID0gTWF0aC5yb3VuZCgoYWN0aXZlU3RhcnRJbmRleCAvIG1heFN0YXJ0SW5kZXgpICogMTAwKTtcbiAgY29uc3Qgc2VjdGlvblN0YXR1cyA9IGBTZWN0aW9uICR7YWN0aXZlU2VjdGlvbkluZGV4ICsgMX0gb2YgJHtzZWN0aW9uQ291bnR9YDtcbiAgcmV0dXJuIChcbiAgICA8PlxuICAgICAgPGRpdlxuICAgICAgICBjbGFzc05hbWU9XCJhYm91dC1uYXJyYXRpdmUtaW5kaWNhdG9yXCJcbiAgICAgICAgZGF0YS1hYm91dC1pbmRpY2F0b3ItbGF5ZXI9XCJ1aVwiXG4gICAgICAgIHJvbGU9XCJwcm9ncmVzc2JhclwiXG4gICAgICAgIGFyaWEtbGFiZWw9XCJBYm91dCBwYWdlIHNjcm9sbCBwcm9ncmVzc1wiXG4gICAgICAgIGFyaWEtdmFsdWVtaW49XCIwXCJcbiAgICAgICAgYXJpYS12YWx1ZW1heD1cIjEwMFwiXG4gICAgICAgIGFyaWEtdmFsdWVub3c9e3Byb2dyZXNzVmFsdWV9XG4gICAgICAgIGFyaWEtdmFsdWV0ZXh0PXtzZWN0aW9uU3RhdHVzfVxuICAgICAgPlxuICAgICAgICB7QXJyYXkuZnJvbSh7IGxlbmd0aDogQUJPVVRfU0NST0xMX0lORElDQVRPUl9USUNLX0NPVU5UIH0sIChfLCBpbmRleCkgPT4ge1xuICAgICAgICAgIGNvbnN0IGlzQWN0aXZlID0gaW5kZXggPj0gYWN0aXZlU3RhcnRJbmRleFxuICAgICAgICAgICAgJiYgaW5kZXggPCBhY3RpdmVTdGFydEluZGV4ICsgQUJPVVRfU0NST0xMX0lORElDQVRPUl9BQ1RJVkVfVElDS19DT1VOVDtcbiAgICAgICAgICByZXR1cm4gKFxuICAgICAgICAgICAgPGRpdlxuICAgICAgICAgICAgICBhcmlhLWhpZGRlbj1cInRydWVcIlxuICAgICAgICAgICAgICBjbGFzc05hbWU9e2BhYm91dC1uYXJyYXRpdmUtaW5kaWNhdG9yX19saW5lJHtpc0FjdGl2ZSA/ICcgaXMtYWN0aXZlJyA6ICcnfWB9XG4gICAgICAgICAgICAgIGRhdGEtYWN0aXZlPXtpc0FjdGl2ZSA/ICd0cnVlJyA6ICdmYWxzZSd9XG4gICAgICAgICAgICAgIGRhdGEtbGluZS1pbmRleD17aW5kZXh9XG4gICAgICAgICAgICAgIGtleT17aW5kZXh9XG4gICAgICAgICAgICAvPlxuICAgICAgICAgICk7XG4gICAgICAgIH0pfVxuICAgICAgPC9kaXY+XG4gICAgICA8c3BhbiBjbGFzc05hbWU9XCJhYm91dC1uYXJyYXRpdmUtdmlzdWFsbHktaGlkZGVuXCIgcm9sZT1cInN0YXR1c1wiIGFyaWEtbGl2ZT1cInBvbGl0ZVwiIGFyaWEtYXRvbWljPVwidHJ1ZVwiPlxuICAgICAgICB7c2VjdGlvblN0YXR1c31cbiAgICAgIDwvc3Bhbj5cbiAgICA8Lz5cbiAgKTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIEFib3V0TmFycmF0aXZlTGFiRXhwZXJpZW5jZSh7XG4gIHJvdXRlQ29udGVudElkID0gJ2Fib3V0LW5hcnJhdGl2ZS1sYWInLFxuICBzaG93SW5kaWNhdG9yID0gdHJ1ZSxcbn0pIHtcbiAgY29uc3QgZWRpdG9yUmVxdWVzdGVkID0gdXNlTWVtbygoKSA9PiAoXG4gICAgdHlwZW9mIHdpbmRvdyAhPT0gJ3VuZGVmaW5lZCdcbiAgICAmJiByb3V0ZUNvbnRlbnRJZCA9PT0gJ2Fib3V0LW5hcnJhdGl2ZS1sYWInXG4gICAgJiYgbmV3IFVSTFNlYXJjaFBhcmFtcyh3aW5kb3cubG9jYXRpb24uc2VhcmNoKS5nZXQoJ2VkaXQnKSA9PT0gJzEnXG4gICksIFtyb3V0ZUNvbnRlbnRJZF0pO1xuICBjb25zdCBbZWRpdG9yTW9kdWxlLCBzZXRFZGl0b3JNb2R1bGVdID0gdXNlU3RhdGUobnVsbCk7XG4gIGNvbnN0IFtlZGl0b3JTdG9yZSwgc2V0RWRpdG9yU3RvcmVdID0gdXNlU3RhdGUobnVsbCk7XG4gIGNvbnN0IFtpbmRpY2F0b3JIb3N0LCBzZXRJbmRpY2F0b3JIb3N0XSA9IHVzZVN0YXRlKG51bGwpO1xuICBjb25zdCBbcGxheWJhY2tEb2N1bWVudCwgc2V0UGxheWJhY2tEb2N1bWVudF0gPSB1c2VTdGF0ZShBQk9VVF9OQVJSQVRJVkVfRE9DVU1FTlQpO1xuICBjb25zdCByb290UmVmID0gdXNlUmVmKG51bGwpO1xuICBjb25zdCBzY3JvbGxwb3J0UmVmID0gdXNlUmVmKG51bGwpO1xuICBjb25zdCBjb250ZW50UmVmID0gdXNlUmVmKG51bGwpO1xuICBjb25zdCBzZWN0aW9uUmVmcyA9IHVzZVJlZihbXSk7XG4gIGNvbnN0IHdvcmxkUnVudGltZVJlZiA9IHVzZVJlZihudWxsKTtcbiAgY29uc3QgYnVzdEludGVyYWN0aW9uUmVmID0gdXNlUmVmKG51bGwpO1xuICBjb25zdCBkaXNjaXBsaW5lT3ZlcmxheVJlZiA9IHVzZVJlZihudWxsKTtcblxuICB1c2VMYXlvdXRFZmZlY3QoKCkgPT4ge1xuICAgIGlmICghc2hvd0luZGljYXRvciB8fCB0eXBlb2YgZG9jdW1lbnQgPT09ICd1bmRlZmluZWQnKSByZXR1cm4gdW5kZWZpbmVkO1xuICAgIGNvbnN0IGhvc3QgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnc2hlbGwtcGVyc2lzdGVudC1yb3V0ZS11aS1ob3N0Jyk7XG4gICAgc2V0SW5kaWNhdG9ySG9zdChob3N0KTtcbiAgICByZXR1cm4gdW5kZWZpbmVkO1xuICB9LCBbcm91dGVDb250ZW50SWQsIHNob3dJbmRpY2F0b3JdKTtcblxuICB1c2VFZmZlY3QoKCkgPT4ge1xuICAgIGlmICghX19ERVZfXyB8fCAhZWRpdG9yUmVxdWVzdGVkKSByZXR1cm4gdW5kZWZpbmVkO1xuICAgIGxldCBhY3RpdmUgPSB0cnVlO1xuICAgIFByb21pc2UuYWxsKFtcbiAgICAgIGltcG9ydCgnLi9BYm91dE5hcnJhdGl2ZUVkaXRvci5qc3gnKSxcbiAgICAgIGltcG9ydCgnLi9hYm91dE5hcnJhdGl2ZUVkaXRvclN0b3JlLmpzJyksXG4gICAgXSkudGhlbigoW2VkaXRvciwgc3RvcmVNb2R1bGVdKSA9PiB7XG4gICAgICBpZiAoIWFjdGl2ZSkgcmV0dXJuO1xuICAgICAgY29uc3Qgc3RvcmUgPSBzdG9yZU1vZHVsZS5jcmVhdGVBYm91dE5hcnJhdGl2ZUVkaXRvclN0b3JlKEFCT1VUX05BUlJBVElWRV9ET0NVTUVOVCk7XG4gICAgICBzZXRFZGl0b3JTdG9yZShzdG9yZSk7XG4gICAgICBzZXRFZGl0b3JNb2R1bGUoKCkgPT4gZWRpdG9yLmRlZmF1bHQpO1xuICAgIH0pLmNhdGNoKChlcnJvcikgPT4gY29uc29sZS5lcnJvcignW0Fib3V0IG5hcnJhdGl2ZV0gQ291bGQgbm90IGxvYWQgdGhlIGRldmVsb3BtZW50IGVkaXRvci4nLCBlcnJvcikpO1xuICAgIHJldHVybiAoKSA9PiB7IGFjdGl2ZSA9IGZhbHNlOyB9O1xuICB9LCBbZWRpdG9yUmVxdWVzdGVkXSk7XG5cbiAgdXNlRWZmZWN0KCgpID0+IHtcbiAgICBpZiAoIWVkaXRvclN0b3JlKSByZXR1cm4gdW5kZWZpbmVkO1xuICAgIGNvbnN0IHVwZGF0ZSA9ICgpID0+IHtcbiAgICAgIGNvbnN0IHN0YXRlID0gZWRpdG9yU3RvcmUuZ2V0U25hcHNob3QoKTtcbiAgICAgIHNldFBsYXliYWNrRG9jdW1lbnQoc3RhdGUudHJ5U3RhdGU/LmRvY3VtZW50IHx8IHN0YXRlLmRvY3VtZW50KTtcbiAgICB9O1xuICAgIHVwZGF0ZSgpO1xuICAgIHJldHVybiBlZGl0b3JTdG9yZS5zdWJzY3JpYmUodXBkYXRlKTtcbiAgfSwgW2VkaXRvclN0b3JlXSk7XG5cbiAgY29uc3QgeyBhY3RpdmVTZWN0aW9uSW5kZXgsIGFjdGl2ZUluZGljYXRvclN0YXJ0SW5kZXggfSA9IHVzZUFib3V0TmFycmF0aXZlVGltZWxpbmUoe1xuICAgIGRvY3VtZW50OiBwbGF5YmFja0RvY3VtZW50LFxuICAgIGVkaXRvclN0b3JlLFxuICAgIHJvb3RSZWYsXG4gICAgd29ybGRSdW50aW1lUmVmLFxuICAgIHNjcm9sbHBvcnRSZWYsXG4gICAgY29udGVudFJlZixcbiAgICBzZWN0aW9uUmVmcyxcbiAgfSk7XG5cbiAgY29uc3Qgcm9vdFN0eWxlID0gdXNlTWVtbygoKSA9PiAoe1xuICAgICctLWFib3V0LXJlYWRpbmctd2lkdGgnOiBgJHtwbGF5YmFja0RvY3VtZW50Lmdsb2JhbHMucmVhZGluZ1dpZHRoUmVtfXJlbWAsXG4gIH0pLCBbcGxheWJhY2tEb2N1bWVudC5nbG9iYWxzLnJlYWRpbmdXaWR0aFJlbV0pO1xuICBjb25zdCBkaXNjaXBsaW5lUmV2ZWFsID0gdXNlTWVtbygoKSA9PiAoXG4gICAgcGxheWJhY2tEb2N1bWVudC5zZWN0aW9ucy5maW5kKChzZWN0aW9uKSA9PiBzZWN0aW9uLnRleHQ/LmRpc2NpcGxpbmVSZXZlYWwpPy50ZXh0LmRpc2NpcGxpbmVSZXZlYWwgfHwgbnVsbFxuICApLCBbcGxheWJhY2tEb2N1bWVudF0pO1xuICBjb25zdCBzZWxlY3QgPSBlZGl0b3JTdG9yZSA/IChzZWxlY3Rpb24pID0+IGVkaXRvclN0b3JlLnNldFNlbGVjdGlvbihzZWxlY3Rpb24pIDogbnVsbDtcbiAgY29uc3QgRWRpdG9yID0gZWRpdG9yTW9kdWxlO1xuXG4gIHJldHVybiAoXG4gICAgPGRpdiByZWY9e3Jvb3RSZWZ9IGNsYXNzTmFtZT1cImFib3V0LW5hcnJhdGl2ZS1sYWJcIiBkYXRhLXJvdXRlLWNvbnRlbnQ9e3JvdXRlQ29udGVudElkfSBzdHlsZT17cm9vdFN0eWxlfT5cbiAgICAgIDxBYm91dE5hcnJhdGl2ZVdvcmxkIHJlbmRlcmVySWQ9XCJ0aHJlZS1wb2ludC13b3JsZC12MVwiIHJvb3RSZWY9e3Jvb3RSZWZ9IGludGVyYWN0aW9uUmVmPXtidXN0SW50ZXJhY3Rpb25SZWZ9IGRpc2NpcGxpbmVPdmVybGF5UmVmPXtkaXNjaXBsaW5lT3ZlcmxheVJlZn0gcnVudGltZVJlZj17d29ybGRSdW50aW1lUmVmfSAvPlxuICAgICAgPERpc2NpcGxpbmVSZXZlYWxPdmVybGF5IHJldmVhbD17ZGlzY2lwbGluZVJldmVhbH0gb3ZlcmxheVJlZj17ZGlzY2lwbGluZU92ZXJsYXlSZWZ9IC8+XG4gICAgICA8ZGl2IHJlZj17c2Nyb2xscG9ydFJlZn0gY2xhc3NOYW1lPVwiYWJvdXQtbmFycmF0aXZlLXNjcm9sbHBvcnRcIiBkYXRhLWxlbmlzLXByZXZlbnQtdG91Y2ggdGFiSW5kZXg9ezB9IGFyaWEtbGFiZWw9XCJBYm91dCBBbGV4YW5kZXIgbmFycmF0aXZlXCI+XG4gICAgICAgIDxtYWluIHJlZj17Y29udGVudFJlZn0gY2xhc3NOYW1lPVwiYWJvdXQtbmFycmF0aXZlLWNvbnRlbnRcIj5cbiAgICAgICAgICB7cGxheWJhY2tEb2N1bWVudC5zZWN0aW9ucy5tYXAoKHNlY3Rpb24sIGluZGV4KSA9PiB7XG4gICAgICAgICAgICBjb25zdCBzZWN0aW9uUmVmID0gKG5vZGUpID0+IHsgc2VjdGlvblJlZnMuY3VycmVudFtpbmRleF0gPSBub2RlOyB9O1xuICAgICAgICAgICAgaWYgKHNlY3Rpb24ubGF5b3V0ID09PSAnb3BlbmVyJykgcmV0dXJuIDxPcGVuaW5nU2VjdGlvbiBrZXk9e3NlY3Rpb24uaWR9IHNlY3Rpb249e3NlY3Rpb259IGluZGV4PXtpbmRleH0gc2VjdGlvblJlZj17c2VjdGlvblJlZn0gb25TZWxlY3Q9e3NlbGVjdH0gLz47XG4gICAgICAgICAgICBpZiAoc2VjdGlvbi50eXBlID09PSAnc3BhdGlhbCcpIHJldHVybiA8U3BhdGlhbFNlY3Rpb24ga2V5PXtzZWN0aW9uLmlkfSBzZWN0aW9uPXtzZWN0aW9ufSBpbmRleD17aW5kZXh9IHNlY3Rpb25SZWY9e3NlY3Rpb25SZWZ9IG9uU2VsZWN0PXtzZWxlY3R9IC8+O1xuICAgICAgICAgICAgaWYgKHNlY3Rpb24udHlwZSA9PT0gJ2ZpbmFsZScpIHJldHVybiA8RmluYWxlU2VjdGlvbiBrZXk9e3NlY3Rpb24uaWR9IHNlY3Rpb249e3NlY3Rpb259IGluZGV4PXtpbmRleH0gc2VjdGlvblJlZj17c2VjdGlvblJlZn0gaW50ZXJhY3Rpb25SZWY9e2J1c3RJbnRlcmFjdGlvblJlZn0gb25TZWxlY3Q9e3NlbGVjdH0gLz47XG4gICAgICAgICAgICByZXR1cm4gPEVkaXRvcmlhbFNlY3Rpb24ga2V5PXtzZWN0aW9uLmlkfSBzZWN0aW9uPXtzZWN0aW9ufSBpbmRleD17aW5kZXh9IHNlY3Rpb25SZWY9e3NlY3Rpb25SZWZ9IG9uU2VsZWN0PXtzZWxlY3R9IC8+O1xuICAgICAgICAgIH0pfVxuICAgICAgICA8L21haW4+XG4gICAgICA8L2Rpdj5cbiAgICAgIHtzaG93SW5kaWNhdG9yICYmIGluZGljYXRvckhvc3RcbiAgICAgICAgPyBjcmVhdGVQb3J0YWwoXG4gICAgICAgICAgPGRpdiBjbGFzc05hbWU9XCJhYm91dC1uYXJyYXRpdmUtaW5kaWNhdG9yLWxheWVyXCIgZGF0YS1hYm91dC1pbmRpY2F0b3ItaG9zdD1cInNoZWxsLXBlcnNpc3RlbnRcIj5cbiAgICAgICAgICAgIDxTY3JvbGxQcm9ncmVzc0luZGljYXRvclxuICAgICAgICAgICAgICBhY3RpdmVTZWN0aW9uSW5kZXg9e2FjdGl2ZVNlY3Rpb25JbmRleH1cbiAgICAgICAgICAgICAgYWN0aXZlU3RhcnRJbmRleD17YWN0aXZlSW5kaWNhdG9yU3RhcnRJbmRleH1cbiAgICAgICAgICAgICAgc2VjdGlvbkNvdW50PXtwbGF5YmFja0RvY3VtZW50LnNlY3Rpb25zLmxlbmd0aH1cbiAgICAgICAgICAgIC8+XG4gICAgICAgICAgPC9kaXY+LFxuICAgICAgICAgIGluZGljYXRvckhvc3QsXG4gICAgICAgIClcbiAgICAgICAgOiBudWxsfVxuICAgICAge0VkaXRvciAmJiBlZGl0b3JTdG9yZSA/IDxFZGl0b3Igc3RvcmU9e2VkaXRvclN0b3JlfSBydW50aW1lUmVmPXt3b3JsZFJ1bnRpbWVSZWZ9IHJvb3RSZWY9e3Jvb3RSZWZ9IC8+IDogbnVsbH1cbiAgICA8L2Rpdj5cbiAgKTtcbn1cbiJdLCJmaWxlIjoiL1VzZXJzL2FsZXhhbmRlcmJlY2svUHJvamVjdHMtY29kZS9BbGV4YW5kZXIgQmVjayBTdHVkaW8gV2Vic2l0ZS9yZWFjdC1hcHAvYXBwL3NyYy9yb3V0ZXMvYWJvdXQtbmFycmF0aXZlLWxhYi9BYm91dE5hcnJhdGl2ZUxhYkV4cGVyaWVuY2UuanN4In0=