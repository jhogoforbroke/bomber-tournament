# random-player-color proofs

**HEAD**: 1527297
**Tree**: clean
**Shell**: /bin/sh
**Result**: 7 pass, 0 fail

| Check | Proof | Result |
| --- | --- | --- |
| C1 | `run unit / ✔ COLOR-C1: adding a player without color picks from least-used Bomberman colors` | pass |
| C2 | `run unit / ✔ COLOR-C2: adding 8 players without color assigns all 8 colors once before repeating` | pass |
| C3 | `run unit / ✔ COLOR-C3: passing an explicit invalid color throws ValidationError 400` | pass |
| C4 | `run integration / ✔ COLOR-C4: add-player-form contains nickname input and submit button without player-color-s` | pass |
| C5 | `run integration / ✔ COLOR-C5: addSinglePlayer and quickFillPlayers omit client color and receive balanced rand` | pass |
| C6 | `run unit / ✔ COLOR-C6: removing a player and adding a new one without color prioritizes the freed color` | pass |
| C7 | `run integration / ✔ COLOR-C7: POST /api/tournaments/:id/players without color returns 201 with valid Bomberman` | pass |

## Output

`Run unit` - exit 0

```
  ✔ C4: shuffling or manually reordering players in DRAFT updates seed order (0.669075ms)
  ✔ C6: starting a tournament with invalid player count (<16, >64, or not multiple of 4) throws ValidationError 400 (2.854317ms)
  ✔ COLOR-C1: adding a player without color picks from least-used Bomberman colors (0.486017ms)
  ✔ COLOR-C2: adding 8 players without color assigns all 8 colors once before repeating (0.676225ms)
  ✔ COLOR-C3: passing an explicit invalid color throws ValidationError 400 (0.313133ms)
  ✔ COLOR-C6: removing a player and adding a new one without color prioritizes the freed color (0.378583ms)
✔ T1: Tournament & Player Seeding Domain (10.709233ms)
ℹ tests 23
ℹ suites 3
ℹ pass 23
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 103.945143
```

`Run integration` - exit 0

```
  ✔ serves styles.css with Bomberman arcade pixel typography, 8-color palette tokens, and responsive rules (15.160567ms)
✔ T7: Bomberman Arcade HTML Layout, Retro Pixel CSS and SVG Sprites (117.664434ms)
▶ T8: Interactive Bomberman SPA Client Controller
  ✔ C20: web interface serves Bomberman arcade theme, SVG sprites for 8 colors, and interactive SPA controller (195.973526ms)
  ✔ drives interactive match selection, undo, and Grand Final 3 vs 6 handicap through to Champion banner (215.419877ms)
  ✔ COLOR-C5: addSinglePlayer and quickFillPlayers omit client color and receive balanced random colors (28.954475ms)
✔ T8: Interactive Bomberman SPA Client Controller (442.258119ms)
ℹ tests 19
ℹ suites 5
ℹ pass 19
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 725.770839
```
