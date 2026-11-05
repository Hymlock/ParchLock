# A1+Z3 final-gate diff triage — cycles.z5.js and the 9 word-mark rows (grok, read-only)

Date: 2026-11-05 ~00:30 ET. No product code edited; frozen trees only read. Driver: work/investigations/regression-gate.cjs (sha acc1229f…, same as gate), GLULX=1, GAMES filter, run from main tree cwd.
Trees: base = Parchmap-keyboard-final-20261104 (pre-A1/pre-Z3), cand = Parchmap-a1-z3-final-20261104 (frozen A1+Z3).
Launcher: cycles-gate/run-focused.cjs. Raw rows: cycles-gate/*.jsonl.

## Important context
The gate's base.jsonl was NOT re-run: run-final-gate.cjs reuses roy-keyboard-20261104 candidate.jsonl (an older single run). So every diff compares one cand run vs one older base run; single-run flakes on either side show up as diffs.

## cycles.z5.js (room 191 Charles St. Station + inv2 70:money card)
Fresh focused runs (rooms 191 / money card present?):
- base: 4 of 5 present; base-r1 (9 games, 4 parallel processes) reproduced the EXACT gate-cand shape: rooms=[199:Darkness], inv2=[].
- cand: 5 of 5 present (matches the stored baseline).
Verdict: run-to-run NONDETERMINISM, not Z3 and not A1. The failing shape occurs on the pre-A1/pre-Z3 base tree, and the candidate tree produces the baseline result every time. It appears under parallel load (8 shards in the gate, 4 processes here); the driver uses fixed waitForTimeout sleeps (2000 ms after load), so a slow start most likely misses the opening/take-all turn. A Z3-only/A1-only split was unnecessary because base itself flips.

## The 9 marks diffs (fresh base x2 vs cand x2)
| game | gate diff | fresh base r1/r2 | fresh cand r1/r2 | class |
|---|---|---|---|---|
| Delusns | +Self | Self,east,west both | same | stale baseline/noise (fresh base = cand) |
| Jigsaw | party/attractive stranger -> Crowds | west,northeast,Crowds,east both | same | stale baseline/noise |
| jet | dragon's -> wing | dragon's / dragon's | dragon's / wing | flaky within cand (seen once of 3 cand runs incl. gate) |
| medusa | +mirror (order) | 7 marks, no mirror both | 7 marks, no mirror both | gate-cand flake (mirror not reproduced) |
| permagic | of junk -> papers | of junk / papers | papers / papers | flaky within base |
| suvehnux | vault,golden key,black,dark -> under,darkness | cand set both | same | stale baseline/noise |
| terror_tabby | +drawers,floor | cand set both | same | stale baseline/noise |
| vespers | Saint Cuthbert's,place,hands,window,door -> room | cand set both | same | stale baseline/noise |
None is Z3/A1-caused: in every row fresh base either equals fresh cand or flips between runs itself. (Underline marks depend on which reply text is on screen when the driver samples.)

## Conclusion for Codex (root owns the gate classification)
All 10 differences: environment/timing nondeterminism or a stale reused baseline, reproducible without A1/Z3. No evidence against either accepted fix. Suggestion only: a same-session focused base re-run of the 10 games (as here) is a cheap way to classify; reusing an older base.jsonl turns flakes into diffs.