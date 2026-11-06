# GATE D8 — Suspended actor-addressed radial (P8) batch-d8.diff

## Setup
- **base:** `wt-g2-d8-base` detached at `a17d39d` (D5 landed; js clean; no actor-addressing)
- **cand:** `wt-g2-d8-cand` detached at `71c3c8c` + uncommitted D8 P8 apply:
  - `harness/zil-actor-addressing.js` (new)
  - `js/ActionSynth.js`, `js/Actionable.js`, `js/ModuleStatFactsClaude.js` (actorAddressing fact + addressed submit/label)
- games/ and node_modules/ are real copies (0 top-level reparse points; `fsutil` confirms games is not a reparse point)
- Scope: Suspended-only per-title `actorAddressing` fact; radial-first addressed robot forms. Walk path unchanged for non-Suspended titles.

## Main gate (N=4 shards, GLULX=1)
`node work/investigations/regression-gate.cjs` via run-b{0-3}.bat / run-c{0-3}.bat
- base: 309/309 rows (base-0..3.jsonl -> base.jsonl)
- cand: 309/309 rows (cand-0..3.jsonl -> cand.jsonl)
- `--diff`: **3 differences** (diff.txt)

| Game | Field | Class |
|---|---|---|
| Jigsaw.z8.js | marks | **FLAKY** (known list; p10b GATE same class) |
| cycles.z5.js | rooms | **FLAKY** (known list; d5 GATE same rooms/inv2 pair) |
| cycles.z5.js | inv2 | **FLAKY** (known list; d5 GATE) |

## Target title
- **Suspended.z3.js**: base == cand on rooms/exits/marks/inv1/inv2/error (walk-identical). D8 is radial-only; no walk-visible INTENDED.

## Verdict
**ACCEPT** — 0 REGRESSION, 0 INTENDED walk-visible changes, 3 Inform FLAKY only. Safe for Claude to commit D8 P8.

## Evidence
base.jsonl, cand.jsonl, diff.txt, shard base-*.jsonl / cand-*.jsonl in this directory; code `../batch-d8.diff`; native `../p8-native/`; prior review ACCEPT on bus.