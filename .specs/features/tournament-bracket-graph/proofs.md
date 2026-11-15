# tournament-bracket-graph proofs

**HEAD**: cbd6ba0
**Tree**: clean
**Shell**: /bin/sh
**Result**: 13 pass, 0 fail

| Check | Proof | Result |
| --- | --- | --- |
| C1 | `run integration / ✔ GRAPH-C1: index.html includes bracket-graph tab button, section, podium banner, and downlo` | pass |
| C2 | `run integration / ✔ GRAPH-C2: DRAFT tournament renders empty state in bracket graph and keeps download button ` | pass |
| C3 | `run integration / ✔ GRAPH-C3: active tournament renders Winners, Losers, and Grand Final nodes with connectors` | pass |
| C4 | `run integration / ✔ GRAPH-C4: recording or undoing matches and Grand Final rounds updates bracket graph in rea` | pass |
| C5 | `run unit / ✔ GRAPH-C5: completing Grand Final computes 1st to 4th place podium ordered by wins, origin, and se` | pass |
| C6 | `run integration / ✔ GRAPH-C6: COMPLETED tournament renders 1st, 2nd, 3rd, and 4th place podium highlight banne` | pass |
| C7 | `run unit / ✔ GRAPH-C7: undoing final Grand Final win reverts COMPLETED to GRAND_FINAL and clears podium` | pass |
| C8 | `run integration / ✔ GRAPH-C8: download bracket image button remains disabled during DRAFT, IN_PROGRESS, and GR` | pass |
| C9 | `run integration / ✔ GRAPH-C9: download bracket image button is enabled when tournament reaches COMPLETED` | pass |
| C10 | `run integration / ✔ GRAPH-C10: exporting bracket image on COMPLETED tournament downloads PNG with Top 4 podium` | pass |
| C11 | `run unit / ✔ GRAPH-C11: non-champion finalists tied on wins and origin are ordered by ascending initial seed` | pass |
| C12 | `run integration / ✔ GRAPH-C12: exportTournamentBracketPng blocks image generation when tournament is not COMPL` | pass |
| C13 | `run integration / ✔ GRAPH-C13: 20-player tournament with BOT/BYE renders auto-resolved matches in graph and ex` | pass |

## Output

`Run integration` - exit 0

```
  ✔ GRAPH-C6: COMPLETED tournament renders 1st, 2nd, 3rd, and 4th place podium highlight banner (206.647465ms)
  ✔ GRAPH-C8: download bracket image button remains disabled during DRAFT, IN_PROGRESS, and GRAND_FINAL (138.187958ms)
  ✔ GRAPH-C9: download bracket image button is enabled when tournament reaches COMPLETED (156.336582ms)
  ✔ GRAPH-C10: exporting bracket image on COMPLETED tournament downloads PNG with Top 4 podium and full brackets (153.092774ms)
  ✔ GRAPH-C12: exportTournamentBracketPng blocks image generation when tournament is not COMPLETED (3.023808ms)
  ✔ GRAPH-C13: 20-player tournament with BOT/BYE renders auto-resolved matches in graph and exported image (174.071974ms)
✔ T8: Interactive Bomberman SPA Client Controller (1467.61266ms)
ℹ tests 30
ℹ suites 5
ℹ pass 30
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 1695.564651
```

`Run unit` - exit 0

```
  ✔ C4: shuffling or manually reordering players in DRAFT updates seed order (0.633784ms)
  ✔ C6: starting a tournament with invalid player count (<16, >64, or not multiple of 4) throws ValidationError 400 (2.074142ms)
  ✔ COLOR-C1: adding a player without color picks from least-used Bomberman colors (0.494267ms)
  ✔ COLOR-C2: adding 8 players without color assigns all 8 colors once before repeating (0.70565ms)
  ✔ COLOR-C3: passing an explicit invalid color throws ValidationError 400 (0.330183ms)
  ✔ COLOR-C6: removing a player and adding a new one without color prioritizes the freed color (0.350167ms)
✔ T1: Tournament & Player Seeding Domain (9.423883ms)
ℹ tests 26
ℹ suites 3
ℹ pass 26
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 92.076508
```
