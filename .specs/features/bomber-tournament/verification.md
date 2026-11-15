# Bomber Tournament Manager verification

**Verdict**: PASS
**Proofs**: `proofs.md` at 05406f3
**Verifier**: independent sub-agent (author != verifier)

## Checks

| Check | Test | Holds |
| --- | --- | --- |
| C1 | `tests/integration/file-repository.test.js` `C1: creating a tournament persists a JSON file in data/tournaments with DRAFT status` | yes |
| C2 | `tests/unit/tournament.test.js` `C2: adding a player in DRAFT with valid Bomberman color registers the player` | yes |
| C3 | `tests/unit/tournament.test.js` `C3: adding a player with empty or duplicate name throws ValidationError 400` | yes |
| C4 | `tests/unit/tournament.test.js` `C4: shuffling or manually reordering players in DRAFT updates seed order` | yes |
| C5 | `tests/unit/bracket.test.js` `C5: starting a tournament with 16 or 20 players sets IN_PROGRESS, pads BOT/BYE to power of 2 and generates 4-slot matches` | yes |
| C6 | `tests/unit/tournament.test.js` `C6: starting a tournament with invalid player count (<16, >64, or not multiple of 4) throws ValidationError 400` | yes |
| C7 | `tests/unit/bracket.test.js` `C7: recording a Winners match advances 2 winners to next Winners round and drops 2 losers to Losers bracket` | yes |
| C8 | `tests/unit/bracket.test.js` `C8: recording a Losers match advances 2 winners and marks 2 losers as ELIMINATED` | yes |
| C9 | `tests/unit/bracket.test.js` `C9: matches with BOT/BYE forbid selecting BOT over human and auto-eliminate BOT/BYE first` | yes |
| C10 | `tests/unit/bracket.test.js` `C10: recording a match with winner count != 2 or not READY throws ValidationError 400` | yes |
| C11 | `tests/unit/bracket.test.js` `C11: completing Winners Final and Losers Final transitions tournament to GRAND_FINAL with 2 WINNERS (target 3) and 2 LOSERS (target 6)` | yes |
| C12 | `tests/unit/grand-final.test.js` `C12: grand final state exposes 4 finalists with origin, wins and targetWins (3 for WINNERS, 6 for LOSERS)` | yes |
| C13 | `tests/unit/grand-final.test.js` `C13: recording a grand final win increments finalist wins and appends round history` | yes |
| C14 | `tests/unit/grand-final.test.js` `C14: Winners Bracket finalist reaching 3 wins immediately completes tournament as champion` | yes |
| C15 | `tests/unit/grand-final.test.js` `C15: Losers Bracket finalist requires 6 wins to complete tournament as champion` | yes |
| C16 | `tests/unit/grand-final.test.js` `C16: undoing last grand final win decrements score and reverts COMPLETED to GRAND_FINAL` | yes |
| C17 | `tests/integration/file-repository.test.js` `C17: listing and deleting tournaments reads and removes the JSON file in data/tournaments` | yes |
| C18 | `tests/unit/bracket.test.js` `C18: undoing a completed match with unplayed target matches clears target slots and restores READY` | yes |
| C19 | `tests/unit/bracket.test.js` `C19: undoing a match whose dependent match is already COMPLETED throws ConflictError 409` | yes |
| C20 | `tests/integration/frontend-flow.test.js` `C20: web interface serves Bomberman arcade theme, SVG sprites for 8 colors, and interactive SPA controller` | yes |
| C21 | `tests/integration/file-repository.test.js` `C21: file repository writes atomically via temp file rename leaving no .tmp artifacts` | yes |
| C22 | `tests/integration/api-tournaments.test.js` `C22: requesting non-existent tournament or match ID returns HTTP 404 JSON error` | yes |
| C23 | `tests/unit/bracket.test.js` `C23: 20, 24 and 28 player tournaments distribute BOT/BYE in trailing slots and eliminate them first` | yes |

## Findings

None - Probed 36-, 48-, and 64-player brackets (auto-resolving 28/16/0 BOT/BYE slots across Winners and Losers into 4 human finalists) and undoing Losers Final from GRAND_FINAL state before and after round 1 win recording (409 guard).
