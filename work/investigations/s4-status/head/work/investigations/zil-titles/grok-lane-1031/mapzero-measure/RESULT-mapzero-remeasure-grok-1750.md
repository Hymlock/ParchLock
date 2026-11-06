# grok mapzero re-measure with real start-up answers (NON-BLIND, measurement only), 17:31 ET (file name says 1750; clock-time typo), HEAD 074062ce
Tool: mapzero-measure/measure.cjs. It drives play.html and snapshots after every input: the buffer tail, the status line, the ParchLockMap.Rooms entries that have HasRealId, and CurrentRoomId. Raw traces are in s1-*, s2-* and s3-*.json. Nothing in js/ was touched.

## Not defects (the map fills once the intro is answered)
- **Advent** (control): 5 rooms at start.
- **yagwad**: two "yes" answers are needed (violence warning, then dragons warning). After that the map has 1 room (29 Treasure Cave), as soon as the game reaches its first prompt.
- **LASH**: answer "no" (restore), then CONNECT and type a name. After that the map has 5 rooms, and travel works: n gives CurrentRoomId 63 Portico, s gives 60 Foot of Driveway.
- This agrees with claude's 17:40 correction for saveprinceton, csbb, HugeCave, KoA and windhal1, which I did not re-run.
- Running total: **7 of 14 are harness artefacts**.

## Real candidates (the game is at a real prompt, and the map has 0 rooms)
| title | start-up input | status line (game's room) | move tried | result |
|---|---|---|---|---|
| **gostak** | none | Delcot | kiloff | **In-game travel succeeded** (status Delcot -> Gomway), but the map stayed at 0. This is the strongest evidence of a resolver/admission defect. (LOOK is "lop"? No: that is "not a dape I recognise".) |
| cabal | space | McDonald's Hamburger Restaurant | stand/out | The game refuses ("YOU'RE STAYING PUT"), so there was no travel. 0 rooms. |
| rameses | space | Dormitory Room | e/w | "get off my bunkbed first" (it needs a disambiguated "get off my bunkbed"), so there was no travel. 0 rooms. |
| bluechairs | none | Stuck in an Attic | d/u | Scene narration; no travel. 0 rooms. |
| Heroine | space | Drowning | u/swim | A scripted drowning prologue; no travel. 0 rooms. |
| Tokyo2 | space, space | Prologue | n/s/e/w | "no urge to leave his comfortable table". This is a scripted prologue whose status shows a scene name, not a room. 0 rooms. |
| guess | new, boy | Verb Guessing Booth | n/s | "can't go that way" (a one-room game). 0 rooms. |

## Next (measurement), no diagnosis from me (I am not blind)
- For each of the 7, a scripted route that achieves one real in-game move. Then: does the map ever admit a room after travel? gostak already answers yes for "never".
- I propose that the per-title start-up answers become the standard pre-roll for any future map audit, because the 2026-10-17 audit and the 17:00 measure were both contaminated by intro prompts.

