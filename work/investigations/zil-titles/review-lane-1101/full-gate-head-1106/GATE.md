# Full combined gate (309x2): aee925aa (vc51) -> HEAD

- **base: aee925aa** (vc51 APK code). **cand: HEAD** (archived at 16ce5bfe; 019ba702 landed during the run and touches no js, so cand js = current HEAD js).
- Trees built with `git archive` into C:\pmg\{base,cand}; games/ + node_modules via robocopy /E /XJ. HEAD's regression-gate.cjs, gate-startup.json and gate-parallel.sh copied into base, so start-up handling is identical.
- Serial runs, base then cand: `N=8 GLULX=1 bash work/investigations/gate-parallel.sh` -> 309/309 rows each (base.jsonl, cand.jsonl, *.log).
- `--diff` -> diff.txt: 7 differing games (all `marks`).
- Serial paired rerun of all 7 -> rerun-base/cand.jsonl, rerun-diff.txt: 3 vanished, 2 flipped direction, 2 persisted (huntdark, vespers). Second paired rerun of those 2 -> rerun2-*: 0 differences, and the values in both trees match cand's first-run value.

| game | field | class | reason |
|---|---|---|---|
| Delusns.z5 | marks (+Self) | FLAKY | vanished on rerun |
| heist.z8 | marks (+frame) | FLAKY | known heist frame flake; vanished on rerun |
| medusa.z5 | marks (order + mirror) | FLAKY | vanished on rerun |
| School.z5 | marks (admission letter) | FLAKY | flipped on rerun |
| cabal.z5 | marks (table) | FLAKY | flipped on rerun |
| huntdark.z5 | marks (crossbow/stone vs limestone) | FLAKY | same on rerun 1; rerun 2 base = cand |
| vespers.z8 | marks (intro set vs room) | FLAKY | same on rerun 1; rerun 2 base = cand |

**Totals: INTENDED 0, FLAKY 7, REGRESSION 0.**
The intended js changes (M4/M5/S6/M7/M13/M14/S1/M6/S4) produce no difference in the gate's exits/marks/inv/rooms fields. No Sherlock, guess, yagwad, MakeItGood or bookvol difference appeared.
harness/operator-regressions.js in cand: all PASS, 0 FAIL (operator-regressions.txt). The 309 rows cover ZIL, Inform Z and Glulx.
Trees removed after the run.
