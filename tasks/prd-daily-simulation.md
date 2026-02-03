# PRD: Daily Simulation System

## Introduction
Replace the current random simulation rotation and manual navigation with a strict, deterministic "Simulation of the Day" system. The website will feature a single simulation that persists for 24 hours (based on the user's local time) and changes only at midnight. This creates a ritualistic, calendar-based experience where the site "lives" and evolves with time.

## Goals
- **Deterministic Daily Content:** The simulation is determined solely by the current date.
- **Simplification:** Remove manual mode switching controls (arrows, UI buttons) to focus the user's attention on the *current* piece.
- **Persistence:** The simulation stays consistent throughout the day, even across reloads.
- **Passive Transition:** Changes occur at midnight but only apply on the next reload/visit (no jarring live switches).

## User Stories

### US-001: Deterministic Startup Mode
**Description:** As a visitor, I see a specific simulation determined by today's date, so that everyone visiting today sees the same "Daily Mode".
**Acceptance Criteria:**
- [ ] Startup logic calculates `DayOfYear`.
- [ ] Selects mode from `NARRATIVE_MODE_SEQUENCE` using `DayOfYear % SequenceLength`.
- [ ] Consistent selection for the entire 24-hour period (00:00 - 23:59 local time).
- [ ] Removes existing `pickStartupMode` (random) logic.

### US-002: Disable Manual Navigation
**Description:** As a visitor, I experience the site as a singular daily installation, without the ability to switch away from the daily mode.
**Acceptance Criteria:**
- [ ] Disable Arrow Left/Right keyboard navigation.
- [ ] Disable Right-click context menu navigation (if active).
- [ ] Disable/Remove "Mode" selection buttons from the UI/Settings panel.
- [ ] Disable click-to-cycle functionality (ensure it's off).

### US-003: UI Updates for Daily Context
**Description:** As a visitor, I see UI context that reflects the single-mode nature of the site.
**Acceptance Criteria:**
- [ ] "Mode" section in settings panel is either removed or replaced with a read-only "Current Simulation" display.
- [ ] Narrative Chapter titles (left edge) still function for the current mode.

## Functional Requirements
1.  **Date-Based Selection:**
    -   `getIndexForToday() = getDayOfYear() % NARRATIVE_MODE_SEQUENCE.length`
    -   Must use local user time.
2.  **Strict Locking:**
    -   Remove `controls.js` mode buttons generation or hide them.
    -   Remove `keyboard.js` arrow key handlers.
    -   Hardcode `clickCycleEnabled` to false.
3.  **Midnight Behavior:**
    -   Logic checks date *only* on page load.
    -   If a user keeps the tab open past midnight, the simulation *remains* until they reload.

## Non-Goals
-   **Live Transition:** We will NOT automatically switch the simulation at midnight if the page is open.
-   **History/Archive:** We will not provide a way to view "past" simulations (for now).
-   **Server Sync:** Time is strictly client-side local time.

## Technical Considerations
-   **Day of Year Calculation:** Standard Algorithm: `Math.floor((date - new Date(date.getFullYear(), 0, 0)) / 1000 * 60 * 60 * 24)`.
-   **Sequence:** Use `source/modules/core/constants.js` -> `NARRATIVE_MODE_SEQUENCE`.
-   **Refactoring:**
    -   `source/main.js`: Replace startup logic.
    -   `source/modules/ui/controls.js`: Remove mode buttons.
    -   `source/modules/ui/keyboard.js`: Remove nav handlers.

## Success Metrics
-   Zero "random" modes on startup.
-   Visiting the site 5 times in one day yields the exact same simulation 5 times.
-   Visiting the next day yields the next simulation in the sequence.

## Open Questions
-   Should we display the Date/Day somewhere prominent to reinforce the "Daily" concept? (Assumed: No, keep minimal design for now, just the content changes).
