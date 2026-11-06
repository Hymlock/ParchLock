# I4: gate start-up table

`regression-gate.cjs` now reads `work/investigations/gate-startup.json`. For each listed game it runs the steps (`{char:key}` presses the key at the CharInput, `{line:word}` injects a line), waiting 1300 ms after each, then runs the normal settle(). Games that are not listed run exactly as before: no steps, then the default Space settle.

The no-prompt titles came from `zil-titles/review-lane-1101/full-gate-aee925aa/{base,cand}.jsonl`. guess and yagwad do not end in no-prompt there, so they are not in the table.

| Game | Opening prompt | Steps | Before | After |
|---|---|---|---|---|
| BlueLacuna.gblorb.js | N / R / C menu | n | no-prompt | rows, but all empty: the prologue has no mapped rooms (this is how the game starts) |
| Borderzo.z5.js | chapter 1/2/3/R | 1 | no-prompt | rows, 3 exits, marks, inventory |
| bookvol.z5.js | I/A/L/R/B menu | b | no-prompt | exits out/south>361, inv pager, key |
| chico.z5.js | intro pages, then [1-4] | Space x3, 4 | no-prompt | exits north>53/south>52, marks |
| stiffmst.z5.js | <1>/<2>/<3> | 2, then default Space | no-prompt | exits east>27/north>30, inv gun, clothes |
| vgame.z8.js | (1)-(9) menu | 1, then default Space | no-prompt | marks; exits empty |
| BeingSteve.zblorb.js | none | not in the table | no-prompt | no-prompt (correct: every key types the next scripted command, so there is never a line prompt) |

Full rows: `np-before.jsonl` and `np-after.jsonl`. A second run after the change matched `np-after.jsonl` byte for byte (deterministic).

Control set, GLULX=1: Alabaster, 905, DreamTooReal, LASH, Savoir-Faire, TreasuresofaSlaversKingdom, bj, curves, forms, library. `ct-before.jsonl` and `ct-after.jsonl` are byte-identical (cmp), with 0 errors.
