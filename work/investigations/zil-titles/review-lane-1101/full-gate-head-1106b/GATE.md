# Full combined gate (309x2): 16ce5bfe -> HEAD 46037e1d (includes M11 rewind 84b0ffab)

- **base: 16ce5bfe** (last fully gated, full-gate-head-1106). **cand: HEAD 46037e1d**.
- Trees built with `git archive` into C:\pmg\{base,cand}. games/ and node_modules were copied with robocopy /E /XJ. HEAD's regression-gate.cjs, gate-startup.json and gate-parallel.sh were copied into both trees.
- Serial runs, base then cand: `N=8 GLULX=1 OUT=... bash work/investigations/gate-parallel.sh` -> 309/309 rows each (base.jsonl, cand.jsonl, *.log).
- `--diff` -> diff.txt: 4 differing games, all in `marks`.
- Serial paired rerun of all 4 -> rerun-*: 2 vanished, 2 persisted (School, cabal). A second paired rerun of those 2 -> rerun2-*: School vanished, cabal persisted. Extra check: cabal was run 3x in each tree (r3-*.jsonl). All 6 runs gave the identical value `["table",...]`, which is cand's value. So base sometimes produces it as well.

| game | field | class | reason |
|---|---|---|---|
| Delusns.z5 | marks (+Self) | FLAKY | vanished on rerun; same flake as 1106 |
| medusa.z5 | marks (order + mirror) | FLAKY | vanished on rerun; same flake as 1106 |
| School.z5 | marks (admission letter) | FLAKY | vanished on rerun 2; flipped in 1106 |
| cabal.z5 | marks (table) | FLAKY | base = cand 3/3 in r3; flipped direction in 1106 |

**Totals: INTENDED 0, FLAKY 4, REGRESSION 0.**
As expected, M11 (js/Map.js, js/ZvmCapture.js) produces no difference in exits/marks/inv/rooms.
In cand: harness/operator-regressions.js 13 PASS / 0 FAIL (operator-regressions.txt). harness/m11-rewind.js 20 PASS / 0 FAIL (m11-rewind.txt).
The 309 rows cover ZIL, Inform Z and Glulx. Trees removed after the run.
