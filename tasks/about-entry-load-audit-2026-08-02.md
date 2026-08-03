# About Me entry load audit — 2026-08-02

## Scope

Playwright inspection of the development About route at `http://localhost:8012/about.html`.
The inspection covered direct load and Home-to-About SPA navigation in Chromium, WebKit,
desktop, mobile, reduced motion, warm cache, cold cache, and Chromium with 4x CPU throttle.

## Findings

1. **Unprepared opener can paint when the code-split scene misses the shell boundary.**
   The About experience and its CSS are loaded through `React.lazy`, but the About route's
   prewarm hook returned immediately. The title, rule, description, and cue therefore had no
   declarative pre-stage state. The normal route transaction hid this race in the captured
   Chromium and WebKit runs, but a slow first import, development hot update, or delayed commit
   could paint the raw text before `createEntranceSequence().stage()` rewrote it into its hidden
   start state. This matches the reported visible-text, disappear, re-enter sequence.

2. **The progress indicator leaks through the loading plate.**
   The indicator is portalled into `#shell-persistent-route-ui-host`, outside the shell's
   registered route surfaces. It appeared beside the route spinner while the destination was
   still in `route-loading`.

3. **The entry hierarchy is internally ordered but long.**
   The current order is point-field emergence, title glyphs, centre-out rule, description lines,
   then the scroll cue. Normal WebKit took about 3.96 seconds from navigation intent to idle;
   mobile Chromium took about 4.24 seconds. The route-in portion was about 2.86-2.88 seconds.
   A 4x CPU-throttled Chromium run took about 5.01 seconds and recorded a 259ms maximum frame
   interval. No console or page errors occurred.

4. **The point field leads the readable identity.**
   The field starts at the shared route entrance event and resolves over 480ms. The title has an
   authored 500ms pause, so the field is established immediately before the first title glyph.
   This is deterministic and preserves the intended material-first arrival, but it makes any
   opener flash more conspicuous because the field then remains visually dominant.

5. **Reduced motion settles correctly.**
   The reduced-motion audit kept the route readiness and loading boundaries, removed the long
   stagger, and returned to idle without a text replay.

6. **One legacy About audit assertion was stale.**
   `scripts/audit-about-narrative.mjs` still waited for a removed
   `.about-narrative-visually-hidden[role="status"]` section announcer after scrolling to the end.
   The assertion now waits for and verifies the current progressbar values instead. The focused
   production-indicator run passes in Chromium and WebKit.

## Implemented orchestration

- The About route now imports its code-split experience during media/intent/navigation prewarm.
  Data-only boot prewarm stays light and does not mount or run the experience.
- The shell's existing `abs:route-entrance-start` boundary now marks the active route content as
  prepared before it dispatches the event.
- A global first-paint guard keeps the About opener and its rule hidden until that shell-owned
  boundary. The guard does not animate anything and does not create a second transition owner.
- The persistent About progress indicator stays hidden during `route-loading`, then appears only
  when route-in begins.
- The focused production-indicator audit now verifies `aria-valuenow` and `aria-valuetext` on the
  current progressbar contract.

The point field, title, rule, description, and cue retain their existing authored order and the
shared entrance executor remains the only child-animation mechanism.
