# P13b R2 implementation: gate + size table (claude, 2026-10-31)

Candidate: worktree `wt-claude-p13b` (HEAD 949c3f5c + batch-p13b.diff, uncommitted). Base: `wt-claude-p13b-base` (HEAD 949c3f5c). Both are real copies (robocopy /E /XJ of games/ and node_modules), 0 reparse points.

## 309x2 gate (gate-parallel.sh N=8 GLULX=1, base1/base2/cand1/cand2, gate-x2-classify.cjs)

- 309 rows in each of the four runs.
- REAL 2, UNSTABLE 8 (classify.txt).
  - Mullmurd.z5.js marks (base has "torch", cand1/2 had "light"), gamlet.z5.js marks (base 10 marks, cand ["eyes"]).
    Rerun in isolation, 3x base + 3x cand: all six runs give the same result for both games (Mullmurd `torch,museum,up,north,stone crocuses,pillars`; gamlet `["eyes"]`, base included). So these are load-dependent flakes from running both gates at the same time, not changes caused by the batch.
  - The 8 UNSTABLE rows (Help, Inevita, Jigsaw, School, medusa, permagic, suvehnux, ...) flip within base or within cand.
- **Result: 0 walk-visible changes**, as expected.

## Size table (UTF-16 bytes, same measure.cjs as grok2, REPO pointed at each worktree, same titles/modes)

| Title (mode, turns base/cand) | Key | base | cand |
|---|---|---:|---:|
| Zork I (jericho zork1, first 150 cmds; 150/150) | LearnedWords | 28734 | 28734 |
| | AttrCalib | 7232 | 6594 |
| | ExitCalib | 2848 | 1510 |
| | Stats | 75182 | 75118 |
| | owner index | 2220 | 3076 |
| | **learning total** | **116216** | **115032** |
| Anchorhead (explore 150; 445/431) | LearnedWords | 9046 | 5494 |
| | AttrCalib | 6242 | 4954 |
| | ExitCalib | 5478 | 2860 |
| | Stats | 86058 | 95960 |
| | owner index | 2476 | 3546 |
| | **learning total** | **109382** | **112896** |
| Alabaster Glulx (explore 150; 376/376) | Stats | 87642 | 87652 |
| | owner index | 586 | 800 |
| | **learning total** | **88228** | **88452** |

Notes:
- Exit -47/-48%, Attr -9/-21%. Stats is unchanged: these walks have no itemMetrics or banners, and the evidence ring, the largest part, was already capped at 160 and is outside R2. Anchor explore is not deterministic (445 vs 431 turns), so its Stats and LW rows are not comparable 1:1.
- The owner index grows about 0.2-1 KB from the new durable `digests` set and per-owner `lastWriteAt`. This growth is intended.
- The LearnedWords cap of 1000 rows is not reached on any measured walk (Zork I full: 148 rows).

## Caps chosen (from grok2 p13b-measure)
LearnedWords MAX_ROWS 1000 (about 7x Zork I 148); Exit BLOCKED_MAX_KEYS 512; Stats seenBanners 64; radial custom slices 64 (refuse the 65th); owners metadata 16 most recent; soft note at 1 MB per story / 3 MB total.

## Harness results (candidate)
learning-caps 53/0 (new), learning-stores 92/0 (overflow test updated to R2 semantics), stat-tracker 211/0, save-state 34/0, death-terminal 40/0, learned-words 30, learned-words-consensus 24, learned-words-adversarial-probes 8, exit-calibrator 26/0, world-map-ui 52/0, equipment-ui 119/0, operator-regressions 13/0.
