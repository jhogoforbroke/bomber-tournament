# Bomber Tournament Manager Tasks

## Execution Protocol (MANDATORY -- do not skip)

Implement these tasks with the `tlc-spec-driven` skill: **activate it by name and follow its Execute flow and Critical Rules.** Do not search for skill files by filesystem path. The skill is the source of truth for the full flow (per-task cycle, sub-agent delegation, the walk, check_proofs, the Verifier and the screens sub-agent).

**If the skill cannot be activated, STOP and tell the user - do not proceed without it.**

---

**Design**: `.specs/features/bomber-tournament/design.md`
**Status**: Approved
**Approved**: 2026-11-15 - user: "aprovado"
**Build**: none - JavaScript ES modules require no compilation step before task execution
**Run unit**: `PATH="/home/jmarinho/.local/bin:$PATH" node --test --test-reporter=spec tests/unit/*.test.js`
**Run integration**: `PATH="/home/jmarinho/.local/bin:$PATH" node --test --test-reporter=spec tests/integration/*.test.js`

---

## Test Coverage Matrix

> Generated from codebase, project guidelines, and spec - confirm before Execute. Guidelines found: none - strong defaults applied, confirmed by user (`node --test --test-reporter=spec`).

| Code Layer | Required Test Type | Coverage Expectation | Location Pattern | Run Command |
| ---------- | ------------------ | -------------------- | ---------------- | ----------- |
| Domain (`src/domain/*.js`) | unit | All branches; 1:1 to spec ACs; every listed edge case has a test | `tests/unit/*.test.js` | `PATH="/home/jmarinho/.local/bin:$PATH" node --test --test-reporter=spec tests/unit/*.test.js` |
| Storage (`src/storage/*.js`) | integration | Key query paths + atomic `.tmp` write and error handling | `tests/integration/file-repository.test.js` | `PATH="/home/jmarinho/.local/bin:$PATH" node --test --test-reporter=spec tests/integration/*.test.js` |
| Express API & Frontend (`src/server/*.js`, `public/*`) | integration | All routes and UI workflows: happy path + every listed edge case + error/failure paths | `tests/integration/*.test.js` | `PATH="/home/jmarinho/.local/bin:$PATH" node --test --test-reporter=spec tests/integration/*.test.js` |

## Gate Check Commands

> Generated from codebase and confirmed with user - confirm before Execute.

| Gate Level | When to Use | Command |
| ---------- | ----------- | ------- |
| Quick | After tasks with unit tests only | `PATH="/home/jmarinho/.local/bin:$PATH" node --test --test-reporter=spec tests/unit/*.test.js` |
| Full | After tasks with integration tests | `PATH="/home/jmarinho/.local/bin:$PATH" node --test --test-reporter=spec tests/unit/*.test.js tests/integration/*.test.js` |
| Build | After phase completion | `PATH="/home/jmarinho/.local/bin:$PATH" node --test --test-reporter=spec tests/unit/*.test.js tests/integration/*.test.js` |

---

## Execution Plan

Phases are ordered and run sequentially - each phase completes before the next begins, and tasks within a phase execute in order.

### Phase 1: Domain & Bracket Engine

Core business rules for players, 4-player double elimination brackets, and Grand Final handicap.

```
T1 -> T2 -> T3
```

### Phase 2: Persistence & Express REST API

Atomic JSON text-file storage and Express HTTP endpoints.

```
T4 -> T5 -> T6
```

### Phase 3: Bomberman Arcade SPA Frontend

Bomberman visual theme, SVG sprites, and interactive bracket/Grand Final controller.

```
T7 -> T8
```

---

## Task Breakdown

### Phase 1: Domain & Bracket Engine

### T1: Create Tournament and Player Seeding Domain Module

**What**: Implement tournament creation in `DRAFT` state, player registration with Bomberman colors, duplicate/empty validation, shuffle/manual seeding, and participant count bounds check ($16 \le N \le 64$, multiple of 4).
**Where**: `src/domain/tournament.js`
**Depends on**: None
**Reuses**: Standard `node:crypto` UUID generation
**Requirement**: TOURN-01, TOURN-02, TOURN-03, TOURN-04, TOURN-06

**Done when**:

- [x] Exports `createTournament`, `addPlayer`, `shufflePlayers`, `reorderPlayers`, `validateCanStart`, and error classes `ValidationError`, `ConflictError`, `NotFoundError`
- [x] Unit tests written in `tests/unit/tournament.test.js` covering TOURN-01, TOURN-02, TOURN-03, TOURN-04, TOURN-06
- [x] Gate check passes: `PATH="/home/jmarinho/.local/bin:$PATH" node --test --test-reporter=spec tests/unit/*.test.js`
- [x] Test count: at least 5 unit tests pass

**Tests**: unit
**Gate**: quick
**Commit**: `feat(domain): add tournament creation and player seeding rules`

---

### T2: Create 4-Player Double Elimination Bracket Engine

**What**: Implement bracket sizing ($P \in \{16, 32, 64\}$) with balanced `BOT/BYE` padding, 4-player Winners and Losers match generation, 2-winner progression, `BOT/BYE` auto-elimination, match result undo with `409` conflict guard, and transition to `GRAND_FINAL`.
**Where**: `src/domain/bracket.js`
**Depends on**: T1
**Reuses**: `src/domain/tournament.js`
**Requirement**: TOURN-05, BRACK-01, BRACK-02, BRACK-03, BRACK-04, BRACK-05, MGMT-02, MGMT-03

**Done when**:

- [x] Exports `startTournament`, `recordMatchResult`, `undoMatchResult`, and `findMatch`
- [x] Unit tests written in `tests/unit/bracket.test.js` covering 16-player and 20-player (`BOT/BYE`) brackets, Winners/Losers progression, undo, and `409` dependent-match guard
- [x] Gate check passes: `PATH="/home/jmarinho/.local/bin:$PATH" node --test --test-reporter=spec tests/unit/*.test.js`
- [x] Test count: at least 14 unit tests pass across unit suite

**Tests**: unit
**Gate**: quick
**Commit**: `feat(domain): implement 4-player double elimination bracket engine`

---

### T3: Create Grand Final Handicap Engine

**What**: Implement the 4-finalist Grand Final arena with 3-win target for Winners Bracket finalists, 6-win target for Losers Bracket finalists, round win recording, champion crowning, and round undo.
**Where**: `src/domain/grand-final.js`
**Depends on**: T2
**Reuses**: `src/domain/tournament.js`
**Requirement**: FINAL-01, FINAL-02, FINAL-03, FINAL-04, FINAL-05

**Done when**:

- [ ] Exports `initGrandFinal`, `recordGrandFinalWin`, and `undoGrandFinalWin`
- [ ] Unit tests written in `tests/unit/grand-final.test.js` covering 3-win Winners target, 6-win Losers target, and undo from `COMPLETED` to `GRAND_FINAL`
- [ ] Gate check passes: `PATH="/home/jmarinho/.local/bin:$PATH" node --test --test-reporter=spec tests/unit/*.test.js`
- [ ] Test count: at least 19 unit tests pass across unit suite

**Tests**: unit
**Gate**: build
**Commit**: `feat(domain): implement grand final 3 vs 6 handicap engine`

---

### Phase 2: Persistence & Express REST API

### T4: Create Atomic JSON Text-File Repository

**What**: Implement file-based tournament persistence in `data/tournaments/*.json` using atomic temporary file write (`.tmp` + `rename`), serialized per-tournament write queue, listing, loading, and deletion.
**Where**: `src/storage/file-repository.js`
**Depends on**: T3
**Reuses**: `src/domain/tournament.js`
**Requirement**: TOURN-01, MGMT-01

**Done when**:

- [ ] Exports `createFileRepository(dataDir)` with `save`, `getById`, `list`, and `remove`
- [ ] Integration tests written in `tests/integration/file-repository.test.js` verifying `.json` persistence, atomic `.tmp` rename without leftover temp files, listing, and deletion
- [ ] Gate check passes: `PATH="/home/jmarinho/.local/bin:$PATH" node --test --test-reporter=spec tests/unit/*.test.js tests/integration/*.test.js`
- [ ] Test count: at least 22 tests pass across unit and integration suites

**Tests**: integration
**Gate**: full
**Commit**: `feat(storage): add atomic json text file repository`

---

### T5: Create Express App and Tournament Setup REST Endpoints

**What**: Set up `package.json` with `express` and implement the Express application (`createApp`) with routes for tournament CRUD, player registration, shuffle, manual reorder, start tournament, static asset serving, and `400`/`404` JSON error handling.
**Where**: `src/server/app.js`
**Depends on**: T4
**Reuses**: `src/domain/tournament.js`, `src/domain/bracket.js`, `src/storage/file-repository.js`
**Requirement**: TOURN-01, TOURN-02, TOURN-03, TOURN-04, TOURN-05, TOURN-06, MGMT-01

**Done when**:

- [ ] Exports `createApp({ dataDir })` and CLI entrypoint `src/server/index.js`
- [ ] Integration tests written in `tests/integration/api-tournaments.test.js` covering tournament CRUD, player registration, shuffle/reorder, start validation (`400`), and missing ID (`404`)
- [ ] Gate check passes: `PATH="/home/jmarinho/.local/bin:$PATH" node --test --test-reporter=spec tests/unit/*.test.js tests/integration/*.test.js`
- [ ] Test count: at least 26 tests pass across unit and integration suites

**Tests**: integration
**Gate**: full
**Commit**: `feat(server): create express app and tournament management endpoints`

---

### T6: Add Express Match Progression, Undo and Grand Final Routes

**What**: Implement REST endpoints for recording Winners/Losers match results, undoing match results (`409` when dependent match is completed), and recording/undoing Grand Final map wins.
**Where**: `src/server/routes-matches.js`
**Depends on**: T5
**Reuses**: `src/domain/bracket.js`, `src/domain/grand-final.js`, `src/server/app.js`
**Requirement**: BRACK-01, BRACK-02, BRACK-03, BRACK-04, BRACK-05, FINAL-01, FINAL-02, FINAL-03, FINAL-04, FINAL-05, MGMT-02, MGMT-03

**Done when**:

- [ ] Exports `registerMatchRoutes(app, repo)` wired into `src/server/app.js`
- [ ] Integration tests written in `tests/integration/api-matches.test.js` running a full 16-player tournament through Winners, Losers, match undo (`200` and `409`), and Grand Final (3-win and 6-win paths)
- [ ] Gate check passes: `PATH="/home/jmarinho/.local/bin:$PATH" node --test --test-reporter=spec tests/unit/*.test.js tests/integration/*.test.js`
- [ ] Test count: at least 30 tests pass across unit and integration suites

**Tests**: integration
**Gate**: build
**Commit**: `feat(server): add match progression, undo and grand final routes`

---

### Phase 3: Bomberman Arcade SPA Frontend

### T7: Create Bomberman Arcade HTML Layout, Retro Pixel CSS and SVG Sprites

**What**: Build the Bomberman-themed responsive interface with arcade pixel typography, classic Bomberman color palette, custom SVG graphics (8 Bomberman character colors, bomb, explosion, brick wall, champion trophy), and views for Tournaments, Seeding, Winners Bracket, Losers Bracket, and Grand Final Arena.
**Where**: `public/index.html`
**Depends on**: T6
**Reuses**: `src/server/app.js` static file serving
**Requirement**: MGMT-04

**Done when**:

- [ ] `public/index.html` and `public/styles.css` define the Bomberman arcade layout, fonts, color tokens, SVG sprite gallery, and accessible containers for all tournament phases
- [ ] Integration test written in `tests/integration/frontend-assets.test.js` verifying HTTP delivery of `index.html` and `styles.css`, Bomberman typography/palette tokens, and SVG sprites for all 8 Bomberman colors
- [ ] Gate check passes: `PATH="/home/jmarinho/.local/bin:$PATH" node --test --test-reporter=spec tests/unit/*.test.js tests/integration/*.test.js`
- [ ] Test count: at least 32 tests pass across unit and integration suites

**Tests**: integration
**Gate**: full
**Commit**: `feat(ui): add bomberman arcade html layout, retro css and svg sprites`

---

### T8: Create Interactive Bomberman SPA Client Controller

**What**: Implement the client-side ES module controller that drives tournament selection/creation/deletion, quick-fill & individual player registration with Bomberman colors, shuffle/reorder controls, interactive 4-player match cards (selecting 2 survivors, undoing matches), and Grand Final handicap controls (+1 win, undo round, champion banner).
**Where**: `public/app.js`
**Depends on**: T7
**Reuses**: `public/index.html`, `/api/tournaments` REST endpoints
**Requirement**: MGMT-04, TOURN-01, BRACK-01, FINAL-01

**Done when**:

- [ ] `public/app.js` implements all interactive handlers and state rendering for `DRAFT`, `IN_PROGRESS`, `GRAND_FINAL`, and `COMPLETED`
- [ ] Integration test written in `tests/integration/frontend-flow.test.js` verifying `app.js` delivery and UI state rendering helpers for Winners, Losers, and Grand Final handicap
- [ ] Gate check passes: `PATH="/home/jmarinho/.local/bin:$PATH" node --test --test-reporter=spec tests/unit/*.test.js tests/integration/*.test.js`
- [ ] Test count: at least 34 tests pass across unit and integration suites

**Tests**: integration
**Gate**: build
**Commit**: `feat(ui): implement bomberman tournament spa controller`

---

## Checks

**C1** - Creating a tournament persists a `.json` text file in `data/tournaments/` with initial status `DRAFT` (TOURN-01, AC 1)
Proof: run integration | ✔ C1: creating a tournament persists a JSON file in data/tournaments with DRAFT status

**C2** - Adding a player in `DRAFT` with a unique name and valid Bomberman color (`white`, `black`, `red`, `blue`, `green`, `yellow`, `pink`, `aqua`) registers the player (TOURN-02, AC 2)
Proof: run unit | ✔ C2: adding a player in DRAFT with valid Bomberman color registers the player

**C3** - Adding a player with an empty or duplicate name is rejected with status `400` and descriptive error message (TOURN-03, AC 3)
Proof: run unit | ✔ C3: adding a player with empty or duplicate name throws ValidationError 400

**C4** - Shuffling or manually reordering players in `DRAFT` updates the seeding order (TOURN-04, AC 4)
Proof: run unit | ✔ C4: shuffling or manually reordering players in DRAFT updates seed order

**C5** - Starting a tournament with $16 \le N \le 64$ and $N \bmod 4 = 0$ transitions status to `IN_PROGRESS`, pads up to $P \in \{16, 32, 64\}$ with `BOT/BYE` slots when $N < P$, and generates 4-player matches across Winners and Losers (TOURN-05, AC 5)
Proof: run unit | ✔ C5: starting a tournament with 16 or 20 players sets IN_PROGRESS, pads BOT/BYE to power of 2 and generates 4-slot matches

**C6** - Starting a tournament with fewer than 16 players, more than 64 players, or a count not divisible by 4 fails with status `400` (TOURN-06, AC 6)
Proof: run unit | ✔ C6: starting a tournament with invalid player count (<16, >64, or not multiple of 4) throws ValidationError 400

**C7** - Recording a `READY` Winners Bracket match with 2 winners marks it `COMPLETED`, advances the 2 winners to the next Winners round (or Grand Final), and drops the 2 losers to the corresponding Losers Bracket match (BRACK-01, AC 1)
Proof: run unit | ✔ C7: recording a Winners match advances 2 winners to next Winners round and drops 2 losers to Losers bracket

**C8** - Recording a `READY` Losers Bracket match with 2 winners marks it `COMPLETED`, advances the 2 winners to the next Losers round (or Grand Final), and marks the 2 losers as `ELIMINATED` (BRACK-02, AC 2)
Proof: run unit | ✔ C8: recording a Losers match advances 2 winners and marks 2 losers as ELIMINATED

**C9** - Matches containing `BOT/BYE` participants prevent selecting a `BOT/BYE` over a human player and auto-advance when at most 2 human players are present (BRACK-03, AC 3)
Proof: run unit | ✔ C9: matches with BOT/BYE forbid selecting BOT over human and auto-eliminate BOT/BYE first

**C10** - Recording a match result with a winner count other than 2 or on a match without 4 defined participants is rejected with status `400` (BRACK-04, AC 4)
Proof: run unit | ✔ C10: recording a match with winner count != 2 or not READY throws ValidationError 400

**C11** - Defining the 2 Winners finalists and 2 Losers finalists transitions the tournament to `GRAND_FINAL` with 4 finalists (`WINNERS` target = 3, `LOSERS` target = 6) (BRACK-05, AC 5)
Proof: run unit | ✔ C11: completing Winners Final and Losers Final transitions tournament to GRAND_FINAL with 2 WINNERS (target 3) and 2 LOSERS (target 6)

**C12** - In `GRAND_FINAL`, the system exposes the 4 finalists with origin (`WINNERS` or `LOSERS`), current wins, and target wins (`3` vs `6`) (FINAL-01, AC 1)
Proof: run unit | ✔ C12: grand final state exposes 4 finalists with origin, wins and targetWins (3 for WINNERS, 6 for LOSERS)

**C13** - Recording a map win (+1) in the Grand Final increments the finalist's win counter and appends to round history (FINAL-02, AC 2)
Proof: run unit | ✔ C13: recording a grand final win increments finalist wins and appends round history

**C14** - A finalist from the Winners Bracket reaching `3` wins immediately finishes the tournament (`COMPLETED`) and crowns that player Champion (FINAL-03, AC 3)
Proof: run unit | ✔ C14: Winners Bracket finalist reaching 3 wins immediately completes tournament as champion

**C15** - A finalist from the Losers Bracket requires `6` wins (not finishing at 3, 4, or 5) to complete the tournament (`COMPLETED`) and become Champion (FINAL-04, AC 4)
Proof: run unit | ✔ C15: Losers Bracket finalist requires 6 wins to complete tournament as champion

**C16** - Undoing the last Grand Final round decrements the finalist's win count and reverts status from `COMPLETED` back to `GRAND_FINAL` (FINAL-05, AC 5)
Proof: run unit | ✔ C16: undoing last grand final win decrements score and reverts COMPLETED to GRAND_FINAL

**C17** - Listing and deleting tournaments via the repository/API reads and removes the corresponding `.json` file in `data/tournaments/` (MGMT-01, AC 1)
Proof: run integration | ✔ C17: listing and deleting tournaments reads and removes the JSON file in data/tournaments

**C18** - Undoing a `COMPLETED` Winners or Losers match whose target matches are not yet completed removes propagated players and restores the match to `READY` (MGMT-02, AC 2)
Proof: run unit | ✔ C18: undoing a completed match with unplayed target matches clears target slots and restores READY

**C19** - Undoing a match whose dependent match in the next round is already `COMPLETED` is rejected with status `409` (MGMT-03, AC 3)
Proof: run unit | ✔ C19: undoing a match whose dependent match is already COMPLETED throws ConflictError 409

**C20** - The web interface serves the Bomberman-themed layout, arcade typography, classic Bomberman color tokens, SVG sprites, and interactive SPA controller for all tournament states (MGMT-04, AC 4)
Proof: run integration | ✔ C20: web interface serves Bomberman arcade theme, SVG sprites for 8 colors, and interactive SPA controller

**C21** - Saving a tournament writes atomically via a temporary file (`.tmp`) and rename so no `.tmp` files remain and JSON files are never partially written (Edge Case 1)
Proof: run integration | ✔ C21: file repository writes atomically via temp file rename leaving no .tmp artifacts

**C22** - Requesting a non-existent tournament or match ID via the API returns HTTP `404` with a standardized JSON error message (Edge Case 2)
Proof: run integration | ✔ C22: requesting non-existent tournament or match ID returns HTTP 404 JSON error

**C23** - Starting a tournament with 20, 24, or 28 human players distributes `BOT/BYE` slots across Round 1 matches in the trailing slot positions so `BOT/BYE` are always eliminated first (Edge Case 3)
Proof: run unit | ✔ C23: 20, 24 and 28 player tournaments distribute BOT/BYE in trailing slots and eliminate them first

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
Phase 1:  T1 -> T2 -> T3
Phase 2:  T4 -> T5 -> T6
Phase 3:  T7 -> T8
```

---

## Task Granularity Check

Before approving tasks, verify they are granular enough:

| Task | Scope | Status |
| ---- | ----- | ------ |
| T1: Create Tournament and Player Seeding Domain Module | 1 domain module (`src/domain/tournament.js`) + unit tests | ✅ Granular |
| T2: Create 4-Player Double Elimination Bracket Engine | 1 domain module (`src/domain/bracket.js`) + unit tests | ✅ Granular |
| T3: Create Grand Final Handicap Engine | 1 domain module (`src/domain/grand-final.js`) + unit tests | ✅ Granular |
| T4: Create Atomic JSON Text-File Repository | 1 storage module (`src/storage/file-repository.js`) + integration tests | ✅ Granular |
| T5: Create Express App and Tournament Setup REST Endpoints | 1 server module (`src/server/app.js`) + integration tests | ✅ Granular |
| T6: Add Express Match Progression, Undo and Grand Final Routes | 1 route module (`src/server/routes-matches.js`) + integration tests | ✅ Granular |
| T7: Create Bomberman Arcade HTML Layout, Retro Pixel CSS and SVG Sprites | 1 UI markup/style bundle (`public/index.html`) + integration tests | ✅ Granular |
| T8: Create Interactive Bomberman SPA Client Controller | 1 SPA client module (`public/app.js`) + integration tests | ✅ Granular |

---

## Diagram-Definition Cross-Check

| Task | Depends On (task body) | Diagram Shows | Status |
| ---- | ---------------------- | ------------- | ------ |
| T1 | None | Phase 1 start (`T1`) | ✅ Match |
| T2 | T1 | `T1 -> T2` | ✅ Match |
| T3 | T2 | `T2 -> T3` | ✅ Match |
| T4 | T3 | Cross-phase (`Phase 1 -> Phase 2`), Phase 2 start (`T4`) | ✅ Match |
| T5 | T4 | `T4 -> T5` | ✅ Match |
| T6 | T5 | `T5 -> T6` | ✅ Match |
| T7 | T6 | Cross-phase (`Phase 2 -> Phase 3`), Phase 3 start (`T7`) | ✅ Match |
| T8 | T7 | `T7 -> T8` | ✅ Match |

---

## Test Co-location Validation

| Task | Code Layer Created/Modified | Matrix Requires | Task Says | Status |
| ---- | --------------------------- | --------------- | --------- | ------ |
| T1: Tournament & Seeding Domain | Domain (`src/domain/tournament.js`) | unit | unit | ✅ OK |
| T2: 4-Player Bracket Engine | Domain (`src/domain/bracket.js`) | unit | unit | ✅ OK |
| T3: Grand Final Handicap Engine | Domain (`src/domain/grand-final.js`) | unit | unit | ✅ OK |
| T4: Atomic JSON File Repository | Storage (`src/storage/file-repository.js`) | integration | integration | ✅ OK |
| T5: Express App & Setup Routes | Express API (`src/server/app.js`) | integration | integration | ✅ OK |
| T6: Express Match & Final Routes | Express API (`src/server/routes-matches.js`) | integration | integration | ✅ OK |
| T7: Bomberman Arcade HTML/CSS/SVG | Frontend (`public/index.html`) | integration | integration | ✅ OK |
| T8: Bomberman SPA Client Controller | Frontend (`public/app.js`) | integration | integration | ✅ OK |
