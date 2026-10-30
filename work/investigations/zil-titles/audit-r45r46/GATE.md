# GATE r45+r46 (grok2 sole gate) — 2026-10-30

## Setup
- **base:** `wt-g2-r45-base` @ `9e461e6` (r44)
- **cand:** same + `work/investigations/zil-titles/batch-r45r46.diff`
- Games: **real copies** (309 each), not junctions
- 8 shards GLULX=1 → `work/investigations/grok2/r46/gate/`
- Also: `node harness/operator-regressions.js` → **13 PASS / 0 FAIL**

## Batch contents (facts only)
| Title | Fact |
|-------|------|
| Suspect | locked=17 (LOCKED) |
| Seastalker | concealed=12 (INVISIBLE) |
| HollywoodHijinx | enterable=8 (VEHBIT plank) |
| Hitchhik | enterable=28, switchable=32 |
| Suspended | container=19, supporter=11, open/isOpen=8, openCapability fail-closed |

(Cutthroats enterable=9 already on base.)

## Main gate
`GATE: 309 games, 4 differences`

| Game | Field | Class |
|------|-------|--------|
| Cyclops.z5.js | marks (+Cyclops) | **FLAKY** |
| School.z5.js | marks (+admission letter) | **FLAKY** |
| WiR2.zblorb.js | inv2 (meatball in/out) | **FLAKY** |
| gamlet.z5.js | marks (intro set) | **FLAKY** |

## Target ZIL titles (all IDENTICAL base vs cand)
Suspect, Seastalker, HollywoodHijinx, Hitchhik, Suspended, Cutthroats — rooms/exits/marks/inv1/inv2/error.

**Suspect open+locked routes:** no pause / no gate column change (P10 locked∧closed). IDENTICAL.

## Verdict
**ACCEPT** for self-commit of r45+r46 facts.

0 REGRESSION on intended titles. 4 off-target Inform FLAKY.

## Working tree note
Root `js/ModuleStatFactsClaude.js` also contains Codex E5+D12 (`f5afbb3`: ZorkIII equipmentState, Hollywood closeRule). Those must be **preserved** on commit (already in WC).

## Evidence paths
- `work/investigations/grok2/r46/gate/base.jsonl`, `cand.jsonl`, `diff.txt`
- Frozen diff: `work/investigations/zil-titles/batch-r45r46.diff` (76a6fcf)
