# Random Player Color Assignment verification

**Verdict**: PASS
**Proofs**: `proofs.md` at 1527297
**Verifier**: independent sub-agent (author != verifier)

## Checks

| Check | Test | Holds |
| --- | --- | --- |
| C1 | `tests/unit/tournament.test.js` `COLOR-C1: adding a player without color picks from least-used Bomberman colors` | yes - verifies least-used filtering (`aqua` at count 0 when other 7 are at count 1) and RNG index selection across tied least-used colors |
| C2 | `tests/unit/tournament.test.js` `COLOR-C2: adding 8 players without color assigns all 8 colors once before repeating` | yes - verifies all 8 `BOMBERMAN_COLORS` are assigned once in non-static order across the first 8 players and exactly twice across 16 players |
| C3 | `tests/unit/tournament.test.js` `COLOR-C3: passing an explicit invalid color throws ValidationError 400` | yes - asserts `ValidationError` with `statusCode === 400` when passing an invalid color string (`purple`) |
| C4 | `tests/integration/frontend-assets.test.js` `COLOR-C4: add-player-form contains nickname input and submit button without player-color-select` | yes - inspects served `#add-player-form` markup for `#player-name-input` and `#add-player-btn` and asserts absence of `#player-color-select` and `<select>` |
| C5 | `tests/integration/frontend-flow.test.js` `COLOR-C5: addSinglePlayer and quickFillPlayers omit client color and receive balanced random colors` | yes - intercepts `POST /api/tournaments/:id/players` payloads from `addSinglePlayer` and `quickFillPlayers(16)` to assert `color` is omitted on the client and all 8 colors are assigned twice each |
| C6 | `tests/unit/tournament.test.js` `COLOR-C6: removing a player and adding a new one without color prioritizes the freed color` | yes - removes one of 8 distinct-colored players in `DRAFT` and verifies the next player added without `color` receives the exact freed color |
| C7 | `tests/integration/api-tournaments.test.js` `COLOR-C7: POST /api/tournaments/:id/players without color returns 201 with valid Bomberman color` | yes - posts `{ name }` without `color` 8 times to `POST /api/tournaments/:id/players`, asserting HTTP `201` and all 8 valid `BOMBERMAN_COLORS` assigned |

## Findings

None - Probed unlisted boundary cases at HEAD `1527297`: (1) `addPlayer` with `color: null`, `color: ""`, `color: "   "`, pre-existing bot entries (`isBot: true`) that must not skew human color counts, and scaling to the 64-player maximum (confirming 8 assignments per color); (2) `quickFillPlayers(20)` non-multiple-of-8 distribution (confirming 4 colors with 3 players and 4 colors with 2 players) plus single and batch `POST /api/tournaments/:id/players` with explicit invalid colors (`orange`, `cyan`) returning HTTP `400`.
