# D13 gate — claude-d13-wip d97d831 rebased onto root 999974c (P16 37327b0)

Rebase: 4 commits (ae1872d, 44809e0, a86ce92, d97d831) onto 999974c, no conflicts. 14 files, +1058/-24.
batch-d13.diff regenerated: `git diff 999974c d97d831` (1410 lines).

## Regression gate (base = wt-claude-d17 detached 999974c, js/ clean; cand = wt-claude-d13)
`N=8 GLULX=1 gate-parallel.sh`, 309/309 rows each. `--diff`: 4 differences.

| Game | Diff | Class |
|---|---|---|
| Mask.z5.js | marks door -> glass door | FLAKY (flaky list) |
| Sherlock.z5.js | marks coat -> [] | FLAKY (flaky list) |
| gamlet.z5.js | marks expanded | FLAKY (flaky list) |
| suvehnux.z5.js | marks differ | FLAKY: 3 paired serial reruns base/cand all identical (base value) |

0 INTENDED, 0 REGRESSION. D13 changes no gameplay output.

## Harnesses in cand
learning-stores 92/0; stat-tracker 211/0; save-state 34/0; death-terminal 40/0; learned-words 30 passed;
learned-words-consensus 24 passed; learned-words-adversarial-probes 8 passed; world-map-ui 52/0;
equipment-ui 119/0; operator-regressions 13/0.

## Browser flow (browser-r1/d13-browser.cjs, 127.0.0.1, cand worktree)
26 PASS / 1 FAIL, stable across 3 complete runs (a 4th aborted on a PNG file lock while running concurrently with the gate).
The FAIL is the observation assertion "first erase aborted because tab 2 rewrote an erasable key": the
pre-existing idle StatTracker writer (DEFERRED to D17) no longer rewrites during Check->Erase, so the first
erase succeeds ("Removed 7, failed 0"). All erase-correctness assertions (removed keys exact, kept keys, no
resurrection, status) pass. This assertion encoded a race, not a D13 requirement; it should become
"first erase either succeeds or aborts fail-closed". Not yet bisected whether P16 or the rebase removed the race.
Note: the script writes its evidence into root browser-r1/ (results.json, localStorage-*.json, PNGs) — those files are now modified in root.
