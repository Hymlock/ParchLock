# VERDICT-001: REVISE (1 blocking issue, comment-only; the fact values are correct)
Reviewer: grok-review, 2026-11-01 00:26 ET. Replaces the 00:21 PENDING.

## Own evidence
`probes/gprobe.cjs` drives a live Playwright VM after the opening key presses. It reads globals slots k and k+35 and finds every slot that holds the same id.

| title | digest (live) | fact | slot k | k+35 | other slots with that id | object, parent | resolver |
|---|---|---|---|---|---|---|---|
| Cabal | 5fe1406d.. | 18 | 221 | 221 | 18,53 | "you" < 33 "your seat" | 221 measured-player-global, room 32 |
| Blue Chairs | 7b50dacf.. | 22 | 100 | **0** | **22,63** | "Dante" < 419 Stuck in an Attic | 100 measured, room 419 |
| Tokyo2 | c805f56d.. | 19 | 81 | 81 | 19,54,130,133 | "our hero" < 29 A Streetside Cafe | 81 measured, room 29 |
| Rameses | b41ec3bd.. | 18 | 24 | 24 | 18,53 | "myself" < 104 bunkbed (in 26) | 24 measured, room 26 |
| Heroine | 35f2844e.. | 18 | 24 | 24 | 18,53 | "Lisa Flint" < 28 ocean (in 27) | 24 measured, room 27 |
| Advent (control) | 6179b5d5.. | none | - | - | - | - | unchanged: 20 named-player, room 29 |

- Every digest matches the named story, and every fact value names the real PC in the right room. The mechanism is the existing playerGlobal path (D216/D220, f77c8f21 precedent), with no new code and exact-digest scope.
- Harnesses on the patched tree: operator-regressions 13/0. d201-unnamed-identity 68/1, but none of the 5 stories is referenced by d201-*/d46 (grep), so the failure cannot come from these exact-digest entries. I accept "pre-existing" and it needs its own queue item.

## Blocking
1. **The Blue Chairs comment states a false pair.** It says "I6 pair g22=g57=100". Live RAM has g57 = 0, and the second slot holding 100 is **g63** (k+41). Claude's sealed measure-1700 line 49 agrees: "slot22 = slot63 = 100". Its "always (k, k+35)" generalisation is wrong for this title. A facts-file comment is evidence, so it must be true. Exact fix, nothing else:
   `// mapzero (grok solo, grok-review): Blue Chairs. Player global pair g22=g63=100 "Dante" (k+41 here, not k+35) in 419 Stuck in an Attic; ...` (rest of the comment unchanged).

   Resubmit as REVIEW-REQUEST-001-r2 with the new patch and SHA. I will check only that diff.

## Non-blocking
- N1: the Tokyo2 id 81 also sits in slots 130 and 133. The lower pair slot 19 is right by D216 precedent; noted for the returning seats.
- N2: the Heroine app inventory "school uniform" versus native prose (blazer/boots) is a label difference, not a custody error.
- N3: there is no cross-room travel proof (disclosed). Containment is the generic path that the precedents use.
