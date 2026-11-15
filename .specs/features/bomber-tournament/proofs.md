# bomber-tournament proofs

**HEAD**: 05406f3
**Tree**: clean
**Shell**: /bin/sh
**Result**: 23 pass, 0 fail

| Check | Proof | Result |
| --- | --- | --- |
| C1 | `run integration / ✔ C1: creating a tournament persists a JSON file in data/tournaments with DRAFT status` | pass |
| C2 | `run unit / ✔ C2: adding a player in DRAFT with valid Bomberman color registers the player` | pass |
| C3 | `run unit / ✔ C3: adding a player with empty or duplicate name throws ValidationError 400` | pass |
| C4 | `run unit / ✔ C4: shuffling or manually reordering players in DRAFT updates seed order` | pass |
| C5 | `run unit / ✔ C5: starting a tournament with 16 or 20 players sets IN_PROGRESS, pads BOT/BYE to power of 2 and ` | pass |
| C6 | `run unit / ✔ C6: starting a tournament with invalid player count (<16, >64, or not multiple of 4) throws Valid` | pass |
| C7 | `run unit / ✔ C7: recording a Winners match advances 2 winners to next Winners round and drops 2 losers to Lose` | pass |
| C8 | `run unit / ✔ C8: recording a Losers match advances 2 winners and marks 2 losers as ELIMINATED` | pass |
| C9 | `run unit / ✔ C9: matches with BOT/BYE forbid selecting BOT over human and auto-eliminate BOT/BYE first` | pass |
| C10 | `run unit / ✔ C10: recording a match with winner count != 2 or not READY throws ValidationError 400` | pass |
| C11 | `run unit / ✔ C11: completing Winners Final and Losers Final transitions tournament to GRAND_FINAL with 2 WINNE` | pass |
| C12 | `run unit / ✔ C12: grand final state exposes 4 finalists with origin, wins and targetWins (3 for WINNERS, 6 for` | pass |
| C13 | `run unit / ✔ C13: recording a grand final win increments finalist wins and appends round history` | pass |
| C14 | `run unit / ✔ C14: Winners Bracket finalist reaching 3 wins immediately completes tournament as champion` | pass |
| C15 | `run unit / ✔ C15: Losers Bracket finalist requires 6 wins to complete tournament as champion` | pass |
| C16 | `run unit / ✔ C16: undoing last grand final win decrements score and reverts COMPLETED to GRAND_FINAL` | pass |
| C17 | `run integration / ✔ C17: listing and deleting tournaments reads and removes the JSON file in data/tournaments` | pass |
| C18 | `run unit / ✔ C18: undoing a completed match with unplayed target matches clears target slots and restores READ` | pass |
| C19 | `run unit / ✔ C19: undoing a match whose dependent match is already COMPLETED throws ConflictError 409` | pass |
| C20 | `run integration / ✔ C20: web interface serves Bomberman arcade theme, SVG sprites for 8 colors, and interactiv` | pass |
| C21 | `run integration / ✔ C21: file repository writes atomically via temp file rename leaving no .tmp artifacts` | pass |
| C22 | `run integration / ✔ C22: requesting non-existent tournament or match ID returns HTTP 404 JSON error` | pass |
| C23 | `run unit / ✔ C23: 20, 24 and 28 player tournaments distribute BOT/BYE in trailing slots and eliminate them fir` | pass |

## Output

`Run integration` - exit 0

```
  ✔ serves index.html with SVG sprites for all 8 Bomberman colors, bomb, explosion, brick, and trophy plus phase containers (65.066245ms)
  ✔ serves styles.css with Bomberman arcade pixel typography, 8-color palette tokens, and responsive rules (12.750551ms)
✔ T7: Bomberman Arcade HTML Layout, Retro Pixel CSS and SVG Sprites (79.188128ms)
▶ T8: Interactive Bomberman SPA Client Controller
  ✔ C20: web interface serves Bomberman arcade theme, SVG sprites for 8 colors, and interactive SPA controller (171.725848ms)
  ✔ drives interactive match selection, undo, and Grand Final 3 vs 6 handicap through to Champion banner (172.362657ms)
✔ T8: Interactive Bomberman SPA Client Controller (345.615579ms)
ℹ tests 15
ℹ suites 5
ℹ pass 15
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 534.957917
```

`Run unit` - exit 0

```
▶ T1: Tournament & Player Seeding Domain
  ✔ creates a tournament in DRAFT status with empty players and bracket structures (TOURN-01) (1.722691ms)
  ✔ C2: adding a player in DRAFT with valid Bomberman color registers the player (0.444033ms)
  ✔ C3: adding a player with empty or duplicate name throws ValidationError 400 (0.724625ms)
  ✔ C4: shuffling or manually reordering players in DRAFT updates seed order (0.768532ms)
  ✔ C6: starting a tournament with invalid player count (<16, >64, or not multiple of 4) throws ValidationError 400 (2.111357ms)
✔ T1: Tournament & Player Seeding Domain (6.850796ms)
ℹ tests 19
ℹ suites 3
ℹ pass 19
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 84.487925
```
