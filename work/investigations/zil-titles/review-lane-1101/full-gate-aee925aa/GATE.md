# Full combined gate (309x2): 378c0755 -> aee925aa (APK vc51)

- **base: 378c0755** — runtime source of Build 76 (OPEN_WORK.md line 20) and the `baseCommit` of the D263 final shared gate (nov4-lead/final-shared-gate/manifest.json). `git diff 378c0755 f7a01019^ -- js harness gate scripts` is empty, so the only js changes base->cand are f7a01019 (A1), 3f58ef00 (Z3), d82276ba (Z2); b352cc53/aee925aa touch no js.
- **cand: aee925aa.**
- Real-copy worktrees (`git -c core.longpaths=true worktree add --detach`), games/ + node_modules via robocopy /E /XJ.
- Serial runs: base, then cand. Each used `N=8 GLULX=1 bash work/investigations/gate-parallel.sh` and gave 309/309 rows (base.jsonl, cand.jsonl, base.log, cand.log).
- `regression-gate.cjs --diff` -> diff.txt: 8 field differences in 7 games.
- Serial paired rerun of all 7 games (base worktree then cand worktree): rerun-base.jsonl, rerun-cand.jsonl, rerun-diff.txt. Only 1 difference remains, and it has flipped direction.

| game | field | class | reason |
|---|---|---|---|
| Help.z8 | marks (cand lost all 3) | FLAKY | rerun: both = base |
| Mullmurd.z5 | marks (torch/light) | FLAKY | rerun: both = cand's first value |
| School.z5 | marks (-admission letter) | FLAKY | rerun: both = cand's first value |
| Sherlock.z5 | marks (coat) | FLAKY | known intro "coat" mark race; flipped on rerun (base has coat, cand lacks it) |
| cycles.z5 | rooms, inv2 | FLAKY | known cycles flake; rerun both = base |
| jet.z8 | marks (wing/dragon's) | FLAKY | rerun: both = base |
| suvehnux.z5 | marks | FLAKY | rerun: both = base |

**Totals: INTENDED 0, FLAKY 7 games (8 field diffs), REGRESSION 0.**
The A1, Z3 and Z2 changes act at the radial and command level (Suspect REMOVE spelling, Sherlock TAKE FIND attribute, Sorcerer dark cue). They produce no difference in the gate's marks/rooms/inventory/exits fields.
harness/operator-regressions.js in cand: 13 PASS / 0 FAIL (operator-regressions.txt). The 309 rows cover ZIL, Inform Z and Glulx.
Worktrees removed after the run.
