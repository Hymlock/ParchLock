# GATE D5 — object "Locked" radial status label (batch-d5.diff)

## Setup
- **base:** `wt-claude-d17` detached at `cf0309f` (HEAD; js/css clean)
- **cand:** `wt-claude-d5` = `cf0309f` + codex `oct30-recovery/d5-shared-gate-r1/candidate.patch` (`git apply -3`, applied cleanly, 0 conflicts)
- games/ and node_modules/ are real robocopy /E /XJ copies (0 reparse points)
- Merge check: D5 elements present (AttributeSchema.lockedObjectStatus, Qol ObjectStatusForRadial/ObjectStatusStamp + span, Actionable stamp at context build + `objectStatusStamp:null` in both pickers, EquipmentUI stamp, UndoRestoreSync status removal, CSS, LH facts `lockedStatusObjects:[119,135]`). Patch only adds/changes 3 lines in place, so P16/P4/D13 code untouched (EquipmentUI labelRows/labelParentId, AttributeSchema activationForms still present). `node --check` all js OK.

## Controls (cand)
- codex selector-controls (scratch copy, worktree js swapped in): **24 pass / 0 fail**
- operator-regressions 13/0; d210-radial-selection 19/0; directional-radial 112/0; radial-auto-submit 60/0; shared-radial-integration 28 pass; t10-history-radial 26/0; equipment-ui 119/0; zil-inventory-scope-retained 61 pass; zil-room-switch 31 pass; learning-stores 92/0

## Main gate (N=8, GLULX=1)
`GATE: 309 games, 7 differences`

| Game | Field | Class |
|---|---|---|
| Aug4.z8.js | marks | FLAKY |
| cycles.z5.js | rooms | FLAKY |
| cycles.z5.js | inv2 | FLAKY |
| huntdark.z5.js | marks | FLAKY |
| permagic.z5.js | marks | FLAKY |
| suvehnux.z5.js | marks | FLAKY |
| terror_tabby.z5.js | marks | FLAKY |

All 6 are Inform games; D5 is gated to the LH digest's fact row. Paired reruns of the 6 games (base vs cand, run concurrently, twice): **0 differences** both pairs (rb1/rc1, rb2/rc2). Base vs base also varies (rb1 vs rb2: 1 diff; main base vs rb1: 4 diffs) — load-dependent nondeterminism from running both 8-shard gates simultaneously.

TheLurkingHorror.z3.js: identical base vs cand (status label is radial-only, not walk-visible).

## Verdict
**ACCEPT** — 0 REGRESSION, 0 INTENDED walk-visible changes, 7 FLAKY (paired-rerun cleared).

## Evidence
base.jsonl, cand.jsonl, diff.txt, rb1/rb2/rc1/rc2.jsonl in this directory; code diff `../batch-d5.diff`.
