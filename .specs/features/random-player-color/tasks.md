# Random Player Color Assignment Tasks

## Execution Protocol (MANDATORY -- do not skip)

Implement these tasks with the `tlc-spec-driven` skill: **activate it by name and follow its Execute flow and Critical Rules.** Do not search for skill files by filesystem path. The skill is the source of truth for the full flow (per-task cycle, sub-agent delegation, the walk, check_proofs, the Verifier and the screens sub-agent).

**If the skill cannot be activated, STOP and tell the user - do not proceed without it.**

---

**Design**: `.specs/features/random-player-color/spec.md`
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
| Domain (`src/domain/tournament.js`) | unit | All branches; 1:1 to spec ACs; every listed edge case has a test | `tests/unit/tournament.test.js` | `PATH="/home/jmarinho/IA-RESOURCES-DEV/.local/bin:/home/jmarinho/.local/bin:$PATH" node --test --test-reporter=spec tests/unit/*.test.js` |
| Express API & Frontend Assets (`public/index.html`, `src/server/app.js`) | integration | All routes and HTML markup assertions: happy path + edge cases + error paths | `tests/integration/*.test.js` | `PATH="/home/jmarinho/IA-RESOURCES-DEV/.local/bin:/home/jmarinho/.local/bin:$PATH" node --test --test-reporter=spec tests/integration/*.test.js` |
| Frontend SPA Controller (`public/app.js`) | integration | Single-player and quick-fill registration without client-side fixed color | `tests/integration/frontend-flow.test.js` | `PATH="/home/jmarinho/IA-RESOURCES-DEV/.local/bin:/home/jmarinho/.local/bin:$PATH" node --test --test-reporter=spec tests/integration/*.test.js` |

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

### Phase 1: Balanced Random Color Domain Logic

Domain function for balanced random Bomberman color selection and validation.

```
T1
```

### Phase 2: Simplified Registration Form & SPA Integration

Remove manual color selector from HTML/CSS and update SPA store/controller to delegate color selection.

```
T2 -> T3
```

---

## Task Breakdown

### Phase 1: Balanced Random Color Domain Logic

### T1: Implement Balanced Random Color Assignment in Tournament Domain

**What**: Update `addPlayer` (and export `pickBalancedRandomColor`) so omitting `color` selects randomly from the least-used `BOMBERMAN_COLORS` among current human players in the tournament, while still rejecting explicitly invalid color strings with `ValidationError` (`400`).
**Where**: `src/domain/tournament.js`
**Depends on**: None
**Reuses**: `BOMBERMAN_COLORS` in `src/domain/tournament.js`
**Requirement**: COLOR-01, COLOR-02, COLOR-03

**Done when**:

- [x] `addPlayer(tournament, { name, color, rng })` assigns a balanced random color from the least-used `BOMBERMAN_COLORS` when `color` is omitted, `null`, or empty, and throws `ValidationError` (`400`) when an invalid color string is provided
- [x] Unit tests written in `tests/unit/tournament.test.js` covering balanced random assignment across 8 and 16 players, RNG randomness within the least-used pool, recalculation after `removePlayer`, and `ValidationError` on invalid explicit color
- [x] Gate check passes: `PATH="/home/jmarinho/IA-RESOURCES-DEV/.local/bin:/home/jmarinho/.local/bin:$PATH" node --test --test-reporter=spec tests/unit/*.test.js`
- [x] Test count: at least 22 unit tests pass across unit suite

**Tests**: unit
**Gate**: quick
**Commit**: `feat(domain): assign balanced random bomberman color when adding players`

---

### Phase 2: Simplified Registration Form & SPA Integration

### T2: Remove Color Selector from Player Registration Form in HTML

**What**: Remove `#player-color-select` and its field container from `#add-player-form` so the player registration form contains only `#player-name-input` and `#add-player-btn`, and verify API/HTML behavior when `color` is omitted.
**Where**: `public/index.html`
**Depends on**: T1
**Reuses**: `src/server/app.js`
**Requirement**: COLOR-04

**Done when**:

- [x] `#add-player-form` in `public/index.html` renders `#player-name-input` and `#add-player-btn` without `#player-color-select`
- [x] Integration tests updated/added in `tests/integration/frontend-assets.test.js` and `tests/integration/api-tournaments.test.js` verifying absence of `#player-color-select` in `#add-player-form` and `201` response with balanced random color on `POST /api/tournaments/:id/players` without `color`
- [x] Gate check passes: `PATH="/home/jmarinho/IA-RESOURCES-DEV/.local/bin:/home/jmarinho/.local/bin:$PATH" node --test --test-reporter=spec tests/unit/*.test.js tests/integration/*.test.js`
- [x] Test count: at least 41 tests pass across unit and integration suites

**Tests**: integration
**Gate**: full
**Commit**: `feat(ui): remove manual color selector from player registration form`

---

### T3: Update SPA Controller and Quick-Fill to Use Automatic Balanced Colors

**What**: Update `addSinglePlayer`, `quickFillPlayers`, and `mountDomApp` in `public/app.js` so adding a single player or quick-filling 16/20 players omits client-side color selection and relies on the server's balanced random color assignment.
**Where**: `public/app.js`
**Depends on**: T2
**Reuses**: `public/index.html`, `/api/tournaments/:id/players`
**Requirement**: COLOR-05

**Done when**:

- [ ] `addSinglePlayer(name)` and `quickFillPlayers(targetCount)` in `public/app.js` send player payloads without fixed client colors, and `mountDomApp` submits `#add-player-form` using only `#player-name-input`
- [ ] Integration tests added in `tests/integration/frontend-flow.test.js` verifying `addSinglePlayer(name)` and `quickFillPlayers(16)` assign all 8 Bomberman colors in balanced fashion (2 of each across 16 players) without passing `color` from the client
- [ ] Gate check passes: `PATH="/home/jmarinho/IA-RESOURCES-DEV/.local/bin:/home/jmarinho/.local/bin:$PATH" node --test --test-reporter=spec tests/unit/*.test.js tests/integration/*.test.js`
- [ ] Test count: at least 42 tests pass across unit and integration suites

**Tests**: integration
**Gate**: build
**Commit**: `feat(ui): delegate single and quick-fill player colors to balanced random assignment`

---

## Checks

**C1** - Adding a human player without specifying `color` selects randomly from the subset of `BOMBERMAN_COLORS` with the lowest current usage count among human players in the tournament (COLOR-01, AC 1)
Proof: run unit | ✔ COLOR-C1: adding a player without color picks from least-used Bomberman colors

**C2** - Adding 8 consecutive human players without `color` in an empty tournament assigns all 8 classic Bomberman colors exactly once in random order before repeating any color on the 9th player (COLOR-02, AC 2)
Proof: run unit | ✔ COLOR-C2: adding 8 players without color assigns all 8 colors once before repeating

**C3** - Explicitly passing an invalid color string to `addPlayer` or `POST /api/tournaments/:id/players` is rejected with `ValidationError` and HTTP status `400` (COLOR-03, AC 3)
Proof: run unit | ✔ COLOR-C3: passing an explicit invalid color throws ValidationError 400

**C4** - The `#add-player-form` in `public/index.html` contains `#player-name-input` and `#add-player-btn` and does not render `#player-color-select` (COLOR-04, AC 4)
Proof: run integration | ✔ COLOR-C4: add-player-form contains nickname input and submit button without player-color-select

**C5** - Adding a player via `addSinglePlayer` or `quickFillPlayers` in `public/app.js` omits fixed client colors and assigns balanced random Bomberman colors via the backend (COLOR-05, AC 5)
Proof: run integration | ✔ COLOR-C5: addSinglePlayer and quickFillPlayers omit client color and receive balanced random colors

**C6** - Removing a human player in `DRAFT` and adding a new player without `color` recalculates color frequencies and assigns the freed least-used color (Edge Case 1)
Proof: run unit | ✔ COLOR-C6: removing a player and adding a new one without color prioritizes the freed color

**C7** - Sending `POST /api/tournaments/:id/players` with `{ "name": "Shirobon" }` and no `color` field returns HTTP `201` with a valid color from `BOMBERMAN_COLORS` (Edge Case 2)
Proof: run integration | ✔ COLOR-C7: POST /api/tournaments/:id/players without color returns 201 with valid Bomberman color

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
Phase 1 -> Phase 2

Phase 1:  T1
Phase 2:  T2 ------> T3
```

---

## Task Granularity Check

| Task | Scope | Status |
| ---- | ----- | ------ |
| T1: Implement Balanced Random Color Assignment in Tournament Domain | 1 module (`src/domain/tournament.js`) | ✅ Granular |
| T2: Remove Color Selector from Player Registration Form in HTML | 1 markup file (`public/index.html`) | ✅ Granular |
| T3: Update SPA Controller and Quick-Fill to Use Automatic Balanced Colors | 1 controller (`public/app.js`) | ✅ Granular |

---

## Diagram-Definition Cross-Check

| Task | Depends On (task body) | Diagram Shows | Status |
| ---- | ---------------------- | ------------- | ------ |
| T1 | None | Phase 1 root (`T1`) | ✅ Match |
| T2 | T1 | Phase 2 root (`T2`, after Phase 1) | ✅ Match |
| T3 | T2 | `T2 -> T3` | ✅ Match |

---

## Test Co-location Validation

| Task | Code Layer Created/Modified | Matrix Requires | Task Says | Status |
| ---- | --------------------------- | --------------- | --------- | ------ |
| T1: Implement Balanced Random Color Assignment in Tournament Domain | Domain (`src/domain/tournament.js`) | unit | unit | ✅ OK |
| T2: Remove Color Selector from Player Registration Form in HTML | Express API & Frontend Assets (`public/index.html`) | integration | integration | ✅ OK |
| T3: Update SPA Controller and Quick-Fill to Use Automatic Balanced Colors | Frontend SPA Controller (`public/app.js`) | integration | integration | ✅ OK |
