const __vite__mapDeps=(i,m=__vite__mapDeps,d=(m.f||(m.f=["assets/font-loader-CozohjpE.js","assets/useLegacyBootstrap-g9FGz5mk.js","assets/useLegacyBootstrap-CiWxontQ.css","assets/entrance-animation-CyK0DB7Z.js"])))=>i.map(i=>d[i]);
import{_ as f}from"./useLegacyBootstrap-g9FGz5mk.js";import{l as x,d as z,W as y,g as b,h as _,k as C,z as I,C as L,K as $,I as V,H as B,_ as R,$ as F,a0 as O,a1 as A}from"./font-loader-CozohjpE.js";import{a as k,b as g,i as D,c as G}from"./shared-chrome-Br1qTTck.js";function M(){return{rebuild(){},destroy(){}}}const P={imageFolder:"images/cv-images/",images:["profile-image-01.jpg","profile-image-02.jpg","profile-image-03.jpg","profile-image-04.jpg","profile-image-05.jpg","profile-image-06.jpg","profile-image-07.jpg","profile-image-08.jpg","profile-image-09.jpg","profile-image-10.jpg"]},S=[{x:-50,y:-50,rotate:0}];function W(){const t=document.querySelector(".cv-photo"),a=document.querySelector(".cv-photo__image"),r=document.querySelector(".cv-right");if(!t||!a||!r)return console.warn("[CV Photo Slideshow] Required elements not found"),null;const c=P.images.map(l=>`${P.imageFolder}${l}`);let n=0,e=0;function o(){const l=S[e];a.style.transform=`translate(${l.x}%, ${l.y}%) rotate(${l.rotate}deg)`,e=(e+1)%S.length}function s(){const l=r.scrollTop,d=r.scrollHeight,h=r.clientHeight,i=d-h,p=i>0?l/i:0,u=Math.min(Math.floor(p*c.length),c.length-1);console.log(`[CV Scroll Debug] top:${l.toFixed(0)} max:${i.toFixed(0)} progress:${(p*100).toFixed(1)}% → img ${u+1}/${c.length}`),u!==n&&(n=u,a.src=c[n],console.log(`[CV Photo] ✓ Changed to image ${u+1}`))}return a.src=c[0],o(),r.addEventListener("scroll",()=>{s()},{passive:!0}),setTimeout(()=>{s()},500),t.style.cursor="pointer",t.addEventListener("click",l=>{l.preventDefault(),c.length>1&&(n=(n+1)%c.length,a.src=c[n])}),console.log(`[CV Photo Slideshow] Initialized with ${c.length} image(s) - scroll-driven`),{destroy(){scrollTimeout&&(clearTimeout(scrollTimeout),scrollTimeout=null),t.style.cursor=""}}}const T="cv_config",m={leftWidth:32,leftPaddingTop:10,leftPaddingBottom:10,leftGap:2.5,photoAspectRatio:.75,photoSize:115,photoBorderRadius:1,rightPaddingTop:20,rightPaddingBottom:20,rightPaddingX:2.5,rightMaxWidth:42,nameSize:2.2,titleSize:.9,sectionTitleSize:.75,bodySize:.9,sectionGap:3.5,paragraphGap:1.5,mutedOpacity:.6};function N(){try{const t=localStorage.getItem(T);if(!t)return{...m};const a=JSON.parse(t);return{...m,...a}}catch{return{...m}}}function w(t){try{localStorage.setItem(T,JSON.stringify(t))}catch(a){console.warn("[CV Panel] Could not save config:",a)}}function v(t){const a=document.documentElement;a.style.setProperty("--cv-left-width",`${t.leftWidth}vw`),a.style.setProperty("--cv-left-padding-top",`${t.leftPaddingTop}vh`),a.style.setProperty("--cv-left-padding-bottom",`${t.leftPaddingBottom}vh`),a.style.setProperty("--cv-left-gap",`${t.leftGap}rem`),a.style.setProperty("--cv-photo-aspect-ratio",t.photoAspectRatio),a.style.setProperty("--cv-photo-size",`${t.photoSize}%`),a.style.setProperty("--cv-photo-border-radius",`${t.photoBorderRadius}rem`),a.style.setProperty("--cv-right-padding-top",`${t.rightPaddingTop}vh`),a.style.setProperty("--cv-right-padding-bottom",`${t.rightPaddingBottom}vh`),a.style.setProperty("--cv-right-padding-x",`${t.rightPaddingX}rem`),a.style.setProperty("--cv-right-max-width",`${t.rightMaxWidth}rem`),a.style.setProperty("--cv-name-size",`${t.nameSize}rem`),a.style.setProperty("--cv-title-size",`${t.titleSize}rem`),a.style.setProperty("--cv-section-title-size",`${t.sectionTitleSize}rem`),a.style.setProperty("--cv-body-size",`${t.bodySize}rem`),a.style.setProperty("--cv-section-gap",`${t.sectionGap}rem`),a.style.setProperty("--cv-paragraph-gap",`${t.paragraphGap}rem`),a.style.setProperty("--cv-muted-opacity",t.mutedOpacity)}function j(){return`
    <div id="cv-config-panel" class="cv-config-panel">
      <div class="cv-panel-header">
        <h3>CV Layout Config</h3>
        <button id="cv-panel-close" class="cv-panel-close" aria-label="Close panel">×</button>
      </div>
      <div class="cv-panel-content">
        
        <details class="cv-panel-section" open>
          <summary>Left Column</summary>
          <div class="cv-panel-controls">
            <label>
              <span>Width (vw)</span>
              <input type="range" id="leftWidth" min="20" max="45" step="1" />
              <output></output>
            </label>
            <label>
              <span>Padding Top (vh)</span>
              <input type="range" id="leftPaddingTop" min="0" max="20" step="1" />
              <output></output>
            </label>
            <label>
              <span>Padding Bottom (vh)</span>
              <input type="range" id="leftPaddingBottom" min="0" max="20" step="1" />
              <output></output>
            </label>
            <label>
              <span>Gap (rem)</span>
              <input type="range" id="leftGap" min="0.5" max="5" step="0.25" />
              <output></output>
            </label>
          </div>
        </details>
        
        <details class="cv-panel-section" open>
          <summary>Photo</summary>
          <div class="cv-panel-controls">
            <label>
              <span>Size (%)</span>
              <input type="range" id="photoSize" min="10" max="150" step="1" />
              <output></output>
            </label>
            <label>
              <span>Aspect Ratio</span>
              <input type="range" id="photoAspectRatio" min="0.5" max="1.5" step="0.05" />
              <output></output>
            </label>
            <label>
              <span>Border Radius (rem)</span>
              <input type="range" id="photoBorderRadius" min="0" max="3" step="0.1" />
              <output></output>
            </label>
          </div>
        </details>
        
        <details class="cv-panel-section">
          <summary>Right Column</summary>
          <div class="cv-panel-controls">
            <label>
              <span>Padding Top (vh)</span>
              <input type="range" id="rightPaddingTop" min="0" max="30" step="1" />
              <output></output>
            </label>
            <label>
              <span>Padding Bottom (vh)</span>
              <input type="range" id="rightPaddingBottom" min="0" max="30" step="1" />
              <output></output>
            </label>
            <label>
              <span>Padding X (rem)</span>
              <input type="range" id="rightPaddingX" min="0" max="5" step="0.25" />
              <output></output>
            </label>
            <label>
              <span>Max Width (rem)</span>
              <input type="range" id="rightMaxWidth" min="30" max="60" step="1" />
              <output></output>
            </label>
          </div>
        </details>
        
        <details class="cv-panel-section">
          <summary>Typography</summary>
          <div class="cv-panel-controls">
            <label>
              <span>Name Size (rem)</span>
              <input type="range" id="nameSize" min="1" max="4" step="0.1" />
              <output></output>
            </label>
            <label>
              <span>Title Size (rem)</span>
              <input type="range" id="titleSize" min="0.5" max="1.5" step="0.05" />
              <output></output>
            </label>
            <label>
              <span>Section Title (rem)</span>
              <input type="range" id="sectionTitleSize" min="0.5" max="1.2" step="0.05" />
              <output></output>
            </label>
            <label>
              <span>Body Size (rem)</span>
              <input type="range" id="bodySize" min="0.6" max="1.4" step="0.05" />
              <output></output>
            </label>
          </div>
        </details>
        
        <details class="cv-panel-section">
          <summary>Spacing</summary>
          <div class="cv-panel-controls">
            <label>
              <span>Section Gap (rem)</span>
              <input type="range" id="sectionGap" min="1" max="6" step="0.25" />
              <output></output>
            </label>
            <label>
              <span>Paragraph Gap (rem)</span>
              <input type="range" id="paragraphGap" min="0.5" max="3" step="0.25" />
              <output></output>
            </label>
          </div>
        </details>
        
        <div class="cv-panel-actions">
          <button id="cv-panel-reset" class="cv-panel-btn cv-panel-btn--secondary">Reset to Defaults</button>
        </div>
      </div>
    </div>
  `}function H(){const t=document.createElement("button");t.id="cv-panel-toggle",t.className="cv-panel-toggle",t.setAttribute("aria-label","Toggle CV config panel"),t.textContent="⚙",document.body.appendChild(t);const a=document.createElement("div");a.innerHTML=j(),document.body.appendChild(a.firstElementChild);const r=document.getElementById("cv-config-panel"),c=document.getElementById("cv-panel-close"),n=document.getElementById("cv-panel-reset");let e=N();v(e),Object.keys(e).forEach(o=>{const s=document.getElementById(o);if(!s)return;const l=s.nextElementSibling;s.value=e[o],l&&(l.textContent=e[o]),s.addEventListener("input",()=>{const d=parseFloat(s.value);e[o]=d,l&&(l.textContent=d),v(e),w(e)})}),t.addEventListener("click",()=>{r.classList.toggle("cv-panel--visible")}),document.addEventListener("keydown",o=>{if(o.key==="/"&&!o.ctrlKey&&!o.metaKey&&!o.altKey){if(o.target.tagName==="INPUT"||o.target.tagName==="TEXTAREA")return;o.preventDefault(),r.classList.toggle("cv-panel--visible")}}),c.addEventListener("click",()=>{r.classList.remove("cv-panel--visible")}),n.addEventListener("click",()=>{confirm("Reset all CV layout settings to defaults?")&&(e={...m},v(e),w(e),Object.keys(e).forEach(o=>{const s=document.getElementById(o);if(!s)return;const l=s.nextElementSibling;s.value=e[o],l&&(l.textContent=e[o])}))}),document.addEventListener("keydown",o=>{o.key==="Escape"&&r.classList.contains("cv-panel--visible")&&r.classList.remove("cv-panel--visible")}),console.log("[CV Panel] Initialized")}async function E(){try{await x(),z()}catch{}try{await y()}catch{}try{const n=b(),e=document.getElementById("app-frame"),o=!!window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches,s=()=>{try{const i=document.getElementById("fade-blocking");i&&i.remove()}catch{}},l=i=>{if(!e)return;e.style.opacity="1",e.style.transform="translateZ(0)",s();const p=document.querySelector(".cv-scroll-container");p&&(p.style.opacity="1",p.style.visibility="visible"),console.warn(`⚠️ CV entrance fallback (${i})`)},{didViewTransitionRun:d}=await f(async()=>{const{didViewTransitionRun:i}=await import("./font-loader-CozohjpE.js").then(p=>p.aK);return{didViewTransitionRun:i}},__vite__mapDeps([0,1,2]));if(d()){e&&(e.style.opacity="1",e.style.visibility="visible",e.style.transform="translateZ(0)");const i=document.querySelector(".cv-scroll-container");i&&(i.style.opacity="1",i.style.visibility="visible"),s(),console.log("✓ CV entrance skipped (View Transition handled it)")}else if(!n.entranceEnabled||o){e&&(e.style.opacity="1",e.style.transform="translateZ(0)");const i=document.querySelector(".cv-scroll-container");i&&(i.style.opacity="1",i.style.visibility="visible"),s(),console.log("✓ CV entrance animation skipped (disabled or reduced motion)")}else{const{orchestrateEntrance:i}=await f(async()=>{const{orchestrateEntrance:p}=await import("./entrance-animation-CyK0DB7Z.js");return{orchestrateEntrance:p}},__vite__mapDeps([3,0,1,2]));await i({waitForFonts:async()=>{try{await y()}catch{}},skipWallAnimation:!0,centralContent:[".cv-scroll-container"]}),s(),console.log("✓ Dramatic entrance animation orchestrated (CV)")}window.setTimeout(()=>{if(!e)return;window.getComputedStyle(e).opacity==="0"&&l("watchdog")},2500)}catch(n){const e=document.getElementById("app-frame");e&&(e.style.opacity="1",e.style.transform="translateZ(0)");const o=document.querySelector(".cv-scroll-container");o&&(o.style.opacity="1",o.style.visibility="visible"),console.warn("⚠️ CV entrance animation failed, forcing content visible",n)}let t=null;try{t=await _(),k(t),requestAnimationFrame(()=>{g()});try{D({canvasSelector:".cv-wall-canvas"})}catch{}try{C(b())}catch{}window.addEventListener("resize",g,{passive:!0}),window.visualViewport&&window.visualViewport.addEventListener("resize",g,{passive:!0})}catch{try{C()}catch{}}G({contactModal:!0,cvModal:!1,portfolioModal:!0,cursorHiding:!0,modalOverlayConfig:t||{}}),I(),L();const a=document.documentElement,r=getComputedStyle(a).getPropertyValue("--wall-color").trim();r&&a.style.setProperty("--chrome-bg",r),$?.("startup"),V(),B();try{try{await y()}catch{}M({scrollContainerSelector:".cv-right",contentSelector:".cv-right__inner"})}catch{}try{W()}catch(n){console.warn("CV photo slideshow failed to initialize",n)}try{typeof __DEV__<"u"&&__DEV__&&H()}catch(n){console.warn("CV config panel failed to initialize",n)}document.querySelectorAll("[data-nav-transition]").forEach(n=>{n.addEventListener("click",e=>{e.preventDefault(),R(n.href,F.INTERNAL)})}),window.addEventListener("pageshow",n=>{if(n.persisted){O();const e=document.getElementById("app-frame");e&&(e.style.opacity="1")}});const c=document.querySelector('[data-nav-transition][href*="index"]');c&&A(c,"index.html")}document.readyState==="loading"?document.addEventListener("DOMContentLoaded",()=>{E()}):E();
