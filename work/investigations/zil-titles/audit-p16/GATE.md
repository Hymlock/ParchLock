# P16 309x2 regression gate (2026-10-30)

- Base: 5427fca (detached in ../wt-claude-d17; P17 StatTracker WIP stashed first as "pre-p16-base d17 StatTracker").
- Cand: claude-p16-wip rebased onto 5427fca (clean rebase, no conflicts), ../wt-claude-p16.
- Command: `OUT=... N=8 GLULX=1 bash work/investigations/gate-parallel.sh` in each tree; both 309 rows.
- Diff: `node work/investigations/regression-gate.cjs --diff p16-base.jsonl p16-cand.jsonl` -> 5 differences (diff.txt).

| Game | Field | Class | Evidence |
|---|---|---|---|
| Enchanter.z3.js | inv1 | INTENDED | [book + blorb/nitfol/frotz/gnusto] -> [spell book]; spells now labelSuppressed (D16 P16) |
| Enchanter.z3.js | inv2 | INTENDED | same as inv1 |
| gamlet.z5.js | marks | FLAKY | known list; paired rerun: cand returned base's 10 marks |
| medusa.z5.js | marks | FLAKY | known list; reproduced in first paired rerun, then 5 extra runs: base gave the cand set (b1,b2), cand gave the base set (c2) |
| vespers.z8.js | marks | FLAKY | known list; base reruns b1,b2 produced the cand set exactly |

A per-file revert bisect was also tried on medusa/vespers; results varied run to run (noise, not causal).

Regression count: 0.

## Candidate suites (wt-claude-p16)
- operator-regressions: 13 PASS / 0 FAIL
- zil-inventory-scope-retained (P16_BASE=5427fca): 61 checks passed
- d31-nested-inventory: 61 passed
- equipment-ui: 119 PASS / 0 FAIL

batch-p16.diff regenerated vs 5427fca (js + harness) in wt-claude-p16 commit; root copy not touched.
