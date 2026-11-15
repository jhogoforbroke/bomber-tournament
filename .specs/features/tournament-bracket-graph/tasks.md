# Tournament Bracket Graph & Podium Export Tasks

## Execution Protocol (MANDATORY -- do not skip)

Implement these tasks with the `tlc-spec-driven` skill: **activate it by name and follow its Execute flow and Critical Rules.** Do not search for skill files by filesystem path. The skill is the source of truth for the full flow (per-task cycle, sub-agent delegation, the walk, check_proofs, the Verifier and the screens sub-agent).

**If the skill cannot be activated, STOP and tell the user - do not proceed without it.**

---

**Design**: `.specs/features/tournament-bracket-graph/spec.md`
**Status**: Approved
**Approved**: 2026-11-15 - user: "aprovado"
**Build**: none - JavaScript ES modules require no compilation step before task execution
**Run unit**: `PATH="/home/jmarinho/IA-RESOURCES-DEV/.local/bin:/home/jmarinho/.local/bin:$PATH" node --test --test-reporter=spec tests/unit/*.test.js`
**Run integration**: `PATH="/home/jmarinho/IA-RESOURCES-DEV/.local/bin:/home/jmarinho/.local/bin:$PATH" node --test --test-reporter=spec tests/integration/*.test.js`

---

## Test Coverage Matrix

> Generated from codebase, project guidelines, and spec - confirm before Execute. Guidelines found: none - strong defaults applied (`node --test --test-reporter=spec`).

| Code Layer | Required Test Type | Coverage Expectation | Location Pattern | Run Command |
| ---------- | ------------------ | -------------------- | ---------------- | ----------- |
| Domain (`src/domain/grand-final.js`) | unit | All branches; 1:1 to spec ACs; every listed edge case has a test | `tests/unit/grand-final.test.js` | `PATH="/home/jmarinho/IA-RESOURCES-DEV/.local/bin:/home/jmarinho/.local/bin:$PATH" node --test --test-reporter=spec tests/unit/*.test.js` |
| Frontend Markup & Styles (`public/index.html`, `public/styles.css`) | integration | All HTML containers, tab controls, and CSS classes in scope | `tests/integration/frontend-assets.test.js` | `PATH="/home/jmarinho/IA-RESOURCES-DEV/.local/bin:/home/jmarinho/.local/bin:$PATH" node --test --test-reporter=spec tests/integration/*.test.js` |
| Frontend SPA Controller (`public/app.js`) | integration | Real-time bracket graph rendering, Top 4 podium banner, button states, and PNG export across all tournament states and edge cases | `tests/integration/frontend-flow.test.js` | `PATH="/home/jmarinho/IA-RESOURCES-DEV/.local/bin:/home/jmarinho/.local/bin:$PATH" node --test --test-reporter=spec tests/integration/*.test.js` |

## Gate Check Commands

> Generated from codebase - confirm before Execute.

| Gate Level | When to Use | Command |
| ---------- | ----------- | ------- |
| Quick | After tasks with unit tests only | `PATH="/home/jmarinho/IA-RESOURCES-DEV/.local/bin:/home/jmarinho/.local/bin:$PATH" node --test --test-reporter=spec tests/unit/*.test.js` |
| Full | After tasks with integration tests | `PATH="/home/jmarinho/IA-RESOURCES-DEV/.local/bin:/home/jmarinho/.local/bin:$PATH" node --test --test-reporter=spec tests/unit/*.test.js tests/integration/*.test.js` |
| Build | After phase completion | `PATH="/home/jmarinho/IA-RESOURCES-DEV/.local/bin:/home/jmarinho/.local/bin:$PATH" node --test --test-reporter=spec tests/unit/*.test.js tests/integration/*.test.js` |

---

## Execution Plan

Phases are ordered and run sequentially - each phase completes before the next begins, and tasks within a phase execute in order.

### Phase 1: Podium Top 4 Domain Logic

Compute deterministic 1st, 2nd, 3rd, and 4th place rankings in the Grand Final domain and handle undo state transitions.

```
T1
```

### Phase 2: Bracket Graph Tab Markup & Arcade Styling

Add the `6. GRÁFICO DO TORNEIO` navigation tab, containers, download button, and Bomberman Arcade CSS rules.

```
T2 -> T3
```

### Phase 3: Real-Time Bracket Graph Rendering & PNG Image Export

Implement real-time bracket tree graph rendering, Top 4 podium highlight banner, and client-side PNG image generation/download in `public/app.js`.

```
T4
```

---

## Task Breakdown

### Phase 1: Podium Top 4 Domain Logic

### T1: Compute Top 4 Podium Rankings in Grand Final Domain

**What**: Export `computeGrandFinalPodium(tournament)` in `src/domain/grand-final.js`, store `tournament.grandFinal.podium` when `recordGrandFinalWin` completes the tournament (`1st` = `championId`; `2nd..4th` sorted by `wins` desc, `origin` `WINNERS` > `LOSERS`, `seed` asc), and clear `tournament.grandFinal.podium` (`[]`) when `undoGrandFinalWin` reverts `COMPLETED` to `GRAND_FINAL`.
**Where**: `src/domain/grand-final.js`
**Depends on**: None
**Reuses**: `initGrandFinal`, `recordGrandFinalWin`, `undoGrandFinalWin` in `src/domain/grand-final.js`
**Requirement**: GRAPH-05, GRAPH-07

**Done when**:

- [x] `computeGrandFinalPodium(tournament)` returns the 4-entry podium (`place: 1..4`, `playerId`, `name`, `color`, `seed`, `origin`, `wins`, `targetWins`) when `tournament.status === 'COMPLETED'` and `[]` otherwise
- [x] `recordGrandFinalWin` populates `tournament.grandFinal.podium` on completion and `undoGrandFinalWin` resets `tournament.grandFinal.podium` to `[]` when reverting from `COMPLETED` to `GRAND_FINAL`
- [x] Unit tests added in `tests/unit/grand-final.test.js` covering podium ordering by total `wins`, tie-breaking by `origin` (`WINNERS` > `LOSERS`) and initial `seed` ascending, and clearing podium on `undoGrandFinalWin`
- [x] Gate check passes: `PATH="/home/jmarinho/IA-RESOURCES-DEV/.local/bin:/home/jmarinho/.local/bin:$PATH" node --test --test-reporter=spec tests/unit/*.test.js`
- [x] Test count: at least 26 unit tests pass across unit suite

**Tests**: unit
**Gate**: quick
**Commit**: `feat(domain): compute top 4 podium rankings on grand final completion`

---

### Phase 2: Bracket Graph Tab Markup & Arcade Styling

### T2: Add Bracket Graph Tab and Podium Section to HTML

**What**: Add the `6. GRÁFICO DO TORNEIO` tab button (`data-tab="bracket-graph"`) to `#phase-tabs` and the `#bracket-graph-section` panel containing `#download-bracket-image-btn`, `#bracket-podium-banner`, and `#bracket-graph-container` in `public/index.html`.
**Where**: `public/index.html`
**Depends on**: T1
**Reuses**: `#phase-tabs` and `.tab-panel` structure in `public/index.html`
**Requirement**: GRAPH-01

**Done when**:

- [x] `public/index.html` includes `<button type="button" class="tab-btn" data-tab="bracket-graph">6. GRÁFICO DO TORNEIO</button>` inside `#phase-tabs` and `<section id="bracket-graph-section" ...>` with `#download-bracket-image-btn` (`disabled` by default), `#bracket-podium-banner`, and `#bracket-graph-container`
- [x] Integration test added in `tests/integration/frontend-assets.test.js` verifying the new tab button and section IDs in served HTML
- [x] Gate check passes: `PATH="/home/jmarinho/IA-RESOURCES-DEV/.local/bin:/home/jmarinho/.local/bin:$PATH" node --test --test-reporter=spec tests/unit/*.test.js tests/integration/*.test.js`
- [x] Test count: at least 46 tests pass across unit and integration suites

**Tests**: integration
**Gate**: full
**Commit**: `feat(ui): add bracket graph tab and podium containers to html`

---

### T3: Add Bracket Tree Graph and Podium Arcade Styles to CSS

**What**: Add Bomberman Arcade CSS rules in `public/styles.css` for the tournament bracket graph tree (`.bracket-graph-tree`, `.graph-track`, `.graph-round-column`, `.graph-node`, `.graph-connector-badge`) and Top 4 podium highlight cards (`.podium-banner`, `.podium-grid`, `.podium-card`, `.podium-place-1`..`.podium-place-4`).
**Where**: `public/styles.css`
**Depends on**: T2
**Reuses**: Existing CSS custom properties (`--font-arcade`, `--blast-gold`, `--bomber-*`) in `public/styles.css`
**Requirement**: GRAPH-03, GRAPH-06

**Done when**:

- [ ] `public/styles.css` defines `.bracket-graph-tree`, `.graph-track`, `.graph-node`, `.graph-connector-badge`, `.podium-grid`, and `.podium-card` rules with responsive support
- [ ] Integration test updated/added in `tests/integration/frontend-assets.test.js` verifying the bracket graph and podium CSS selectors are served
- [ ] Gate check passes: `PATH="/home/jmarinho/IA-RESOURCES-DEV/.local/bin:/home/jmarinho/.local/bin:$PATH" node --test --test-reporter=spec tests/unit/*.test.js tests/integration/*.test.js`
- [ ] Test count: at least 47 tests pass across unit and integration suites

**Tests**: integration
**Gate**: full
**Commit**: `feat(ui): add arcade css styles for bracket graph tree and top 4 podium`

---

### Phase 3: Real-Time Bracket Graph Rendering & PNG Image Export

### T4: Implement Real-Time Bracket Graph Renderer, Top 4 Podium Banner, and PNG Export in SPA Controller

**What**: Implement and export `computePodiumFromTournament`, `renderBracketPodiumHtml`, `renderBracketGraphHtml`, `buildTournamentBracketSvg`, and `exportTournamentBracketPng` in `public/app.js`, and wire `#bracket-graph-section`, `#bracket-podium-banner`, `#bracket-graph-container`, and `#download-bracket-image-btn` in `mountDomApp`.
**Where**: `public/app.js`
**Depends on**: T3
**Reuses**: `getPlayerMap`, `escapeHtml`, `createSpaStore`, `mountDomApp` in `public/app.js`
**Requirement**: GRAPH-02, GRAPH-03, GRAPH-04, GRAPH-06, GRAPH-08, GRAPH-09, GRAPH-10

**Done when**:

- [ ] `renderBracketGraphHtml(tournament)` renders the empty state in `DRAFT` and renders all `Winners Bracket` rounds, `Losers Bracket` rounds, and `Grande Final (3x6)` nodes with player names, Bomberman sprites, connection targets (`winnerTargets` / `loserTargets`), and match statuses in `IN_PROGRESS`, `GRAND_FINAL`, and `COMPLETED` (including `BOT/BYE` and `autoResolved` matches)
- [ ] `renderBracketPodiumHtml(tournament)` renders the highlighted Top 4 podium (`1º LUGAR` to `4º LUGAR`) with participant names, colors/sprites, and Grand Final scores when `COMPLETED`, and empty when not `COMPLETED`
- [ ] `#download-bracket-image-btn` is `disabled` in `DRAFT`, `IN_PROGRESS`, and `GRAND_FINAL`, enabled in `COMPLETED`, and `exportTournamentBracketPng` generates and downloads a valid `.png` image containing the tournament title, 1st–4th place names in highlight, and the full bracket tree while blocking export when `status !== 'COMPLETED'`
- [ ] Integration tests added in `tests/integration/frontend-flow.test.js` covering all ACs and edge cases (`GRAPH-02`..`GRAPH-10` and Edge Cases 2 & 3)
- [ ] Gate check passes: `PATH="/home/jmarinho/IA-RESOURCES-DEV/.local/bin:/home/jmarinho/.local/bin:$PATH" node --test --test-reporter=spec tests/unit/*.test.js tests/integration/*.test.js`
- [ ] Test count: at least 51 tests pass across unit and integration suites

**Tests**: integration
**Gate**: build
**Commit**: `feat(ui): render real-time bracket graph, top 4 podium and png image export`

---

## Checks

**C1** - `#phase-tabs` renders the `data-tab="bracket-graph"` (`6. GRÁFICO DO TORNEIO`) button and `#bracket-graph-section` with `#download-bracket-image-btn`, `#bracket-podium-banner`, and `#bracket-graph-container` (GRAPH-01, AC 1)
Proof: run integration | ✔ GRAPH-C1: index.html includes bracket-graph tab button, section, podium banner, and download button

**C2** - While a tournament is in `DRAFT`, `#bracket-graph-section` renders an informative empty state and keeps `#download-bracket-image-btn` disabled (GRAPH-02, AC 2)
Proof: run integration | ✔ GRAPH-C2: DRAFT tournament renders empty state in bracket graph and keeps download button disabled

**C3** - While a tournament is in `IN_PROGRESS`, `GRAND_FINAL`, or `COMPLETED`, `#bracket-graph-container` renders connected visual nodes for all `Winners Bracket`, `Losers Bracket`, and `Grande Final (3x6)` rounds with player names, Bomberman sprites, connection targets, and statuses (GRAPH-03, AC 3)
Proof: run integration | ✔ GRAPH-C3: active tournament renders Winners, Losers, and Grand Final nodes with connectors in bracket graph

**C4** - Recording or undoing a bracket match or Grand Final round immediately updates the rendered `#bracket-graph-container` with current winners, losers, and scores (GRAPH-04, AC 4)
Proof: run integration | ✔ GRAPH-C4: recording or undoing matches and Grand Final rounds updates bracket graph in real time

**C5** - Completing the Grand Final computes the 4-place `podium` where 1st place is `championId` and 2nd, 3rd, and 4th places are ordered by total `wins` descending, breaking ties by `origin` (`WINNERS` before `LOSERS`) and then initial `seed` ascending (GRAPH-05, AC 1)
Proof: run unit | ✔ GRAPH-C5: completing Grand Final computes 1st to 4th place podium ordered by wins, origin, and seed

**C6** - While a tournament is `COMPLETED`, `#bracket-podium-banner` highlights `1º LUGAR`, `2º LUGAR`, `3º LUGAR`, and `4º LUGAR` with each participant's name, Bomberman sprite/color, and Grand Final score (`wins / targetWins`) (GRAPH-06, AC 2)
Proof: run integration | ✔ GRAPH-C6: COMPLETED tournament renders 1st, 2nd, 3rd, and 4th place podium highlight banner

**C7** - Undoing the winning round of a `COMPLETED` tournament via `undoGrandFinalWin` reverts status to `GRAND_FINAL`, clears the finalized Top 4 podium, and re-disables `#download-bracket-image-btn` (GRAPH-07, AC 3)
Proof: run unit | ✔ GRAPH-C7: undoing final Grand Final win reverts COMPLETED to GRAND_FINAL and clears podium

**C8** - While a tournament is in `DRAFT`, `IN_PROGRESS`, or `GRAND_FINAL`, `#download-bracket-image-btn` remains disabled (`disabled === true`) (GRAPH-08, AC 1)
Proof: run integration | ✔ GRAPH-C8: download bracket image button remains disabled during DRAFT, IN_PROGRESS, and GRAND_FINAL

**C9** - When a tournament reaches `COMPLETED`, `#download-bracket-image-btn` becomes enabled (`disabled === false`) in `#bracket-graph-section` (GRAPH-09, AC 2)
Proof: run integration | ✔ GRAPH-C9: download bracket image button is enabled when tournament reaches COMPLETED

**C10** - Clicking `#download-bracket-image-btn` on a `COMPLETED` tournament generates and downloads a `.png` image containing the tournament name, highlighted 1st, 2nd, 3rd, and 4th place participant names, and the full bracket graph (GRAPH-10, AC 3)
Proof: run integration | ✔ GRAPH-C10: exporting bracket image on COMPLETED tournament downloads PNG with Top 4 podium and full brackets

**C11** - When non-champion finalists tie on both `wins` and `origin`, `computeGrandFinalPodium` breaks the tie by smaller initial `seed` number first (Edge Case 1)
Proof: run unit | ✔ GRAPH-C11: non-champion finalists tied on wins and origin are ordered by ascending initial seed

**C12** - Calling `exportTournamentBracketPng` when no tournament is active or when `status !== 'COMPLETED'` returns `null` without triggering a download (Edge Case 2)
Proof: run integration | ✔ GRAPH-C12: exportTournamentBracketPng blocks image generation when tournament is not COMPLETED

**C13** - A 20-player tournament with `BOT/BYE` participants and `autoResolved` matches renders bot slots and auto-resolved statuses accurately in both `#bracket-graph-container` and the exported bracket image (Edge Case 3)
Proof: run integration | ✔ GRAPH-C13: 20-player tournament with BOT/BYE renders auto-resolved matches in graph and exported image

---

## Handoff

The feature's live state, written as it happens - a compaction gives no warning.

**Settled mid-build:** none
**Dispatched:** none
**Walked:** pending

---

## Phase Execution Map

Visual representation of task ordering. Phases run in sequence, and tasks within a phase run in order:

```
Phase 1 -> Phase 2 -> Phase 3

Phase 1:  T1
Phase 2:  T2 ------> T3
Phase 3:  T4
```

---

## Task Granularity Check

| Task | Scope | Status |
| ---- | ----- | ------ |
| T1: Compute Top 4 Podium Rankings in Grand Final Domain | 1 domain module (`src/domain/grand-final.js`) | ✅ Granular |
| T2: Add Bracket Graph Tab and Podium Section to HTML | 1 HTML file (`public/index.html`) | ✅ Granular |
| T3: Add Bracket Tree Graph and Podium Arcade Styles to CSS | 1 CSS file (`public/styles.css`) | ✅ Granular |
| T4: Implement Real-Time Bracket Graph Renderer, Top 4 Podium Banner, and PNG Export in SPA Controller | 1 SPA module (`public/app.js`) | ✅ Granular |

---

## Diagram-Definition Cross-Check

| Task | Depends On (task body) | Diagram Shows | Status |
| ---- | ---------------------- | ------------- | ------ |
| T1 | None | Phase 1 root (`T1`) | ✅ Match |
| T2 | T1 | Phase 2 root (`T2`, after Phase 1) | ✅ Match |
| T3 | T2 | `T2 -> T3` | ✅ Match |
| T4 | T3 | Phase 3 root (`T4`, after Phase 2) | ✅ Match |

---

## Test Co-location Validation

| Task | Code Layer Created/Modified | Matrix Requires | Task Says | Status |
| ---- | --------------------------- | --------------- | --------- | ------ |
| T1: Compute Top 4 Podium Rankings in Grand Final Domain | Domain (`src/domain/grand-final.js`) | unit | unit | ✅ OK |
| T2: Add Bracket Graph Tab and Podium Section to HTML | Frontend Markup & Styles (`public/index.html`) | integration | integration | ✅ OK |
| T3: Add Bracket Tree Graph and Podium Arcade Styles to CSS | Frontend Markup & Styles (`public/styles.css`) | integration | integration | ✅ OK |
| T4: Implement Real-Time Bracket Graph Renderer, Top 4 Podium Banner, and PNG Export in SPA Controller | Frontend SPA Controller (`public/app.js`) | integration | integration | ✅ OK |
