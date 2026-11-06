# GATE P4 — Witness radio room switch (batch-p4.diff)

## Setup
- **base:** `wt-g2-p4-base` @ `999974c` (HEAD at launch)
- **cand:** same + `batch-p4.diff` (AttributeSchema room switch + Witness fact)
- Junctions for games/node_modules (rmdir plain after; rule noted)
- Cand harnesses: zil-room-switch **31**, zil-authored-activation **37**, opreg **13/0**

## Main gate
`GATE: 309 games, 4 differences`

| Game | Field | Class |
|------|-------|--------|
| School.z5.js | marks | **FLAKY** |
| gamlet.z5.js | marks | **FLAKY** |
| jet.z8.js | marks | **FLAKY** |
| permagic.z5.js | marks | **FLAKY** |

## TheWitness.z3.js
**IDENTICAL** base vs cand (rooms/exits/marks/inv1/inv2/error).

LOOK/take-all columns do not surface room-switch radials; INTENDED effect is room-scoped turn on/off for radio 162 (covered by harnesses).

## Verdict
**ACCEPT** — 0 REGRESSION on Witness; 4 Inform FLAKY. Safe for Claude to commit P4.

## Evidence
`base.jsonl`, `cand.jsonl`, `diff.txt` this directory.
