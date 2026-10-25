# Grok 1 solo commits (interim lead while other seats are out of credits)

Lead returns to Claude when it is back (bus #5266). Solo rule: strict adversarial self-review in place of a peer ACCEPT.
Doc check before each item: PRODUCTION_PLAN.md / ARCHITECTURE_UML.md (no product-code or architecture change in any row below).

| Commit | Summary | Evidence |
|---|---|---|
| 7c243ec | g1-batch: one timestamped run/log file per invocation, judge merges all runs; suspect key | work/investigations/grok1/batch/g1-batch.cjs |
| 9f6cb2a | Ledger: merge Claude #5242 rulings (fail closed x18 L:X, wornAttribute NA x7); regenerated U 137->112, L:X 1->19, L:NA 308->315 | work/investigations/grok1/ledger/verify-a-batch.txt, work/investigations/grok1/ledger/a-batch.json |
| 586fe85 | Facts r38 (Claude's dirty file minus Zork3 worn hunk, exact blob 2b320b06 = candidate sha 782BBD9B...B621E7): concealed x6 (Zork1, Enchanter, Infidel, Hitchhik, Hollywood, Suspended), Suspect wornAttribute 5, Hollywood talkable 18, Borderzone scenery 29, locked 14. CORRECTION: commit message says "Moonmist locked 14"; the locked 14 hunk is Wishbringer. Codex #5275 conditional ACCEPT; operator 13/0; 309-game three-type gate 6 Inform-only diffs, all FLAKY by same-state reruns x2 on both trees | agent-tools/r38gate/ (base/cand/rerun/full5 jsonl, source sha256) |
| (this commit) | Ledger regenerated from HEAD 586fe85 facts: C 203->214, U 112->102, L:UD 31->30 (Suspect worn row now C from wornAttribute) | work/investigations/2026-10-16-zil-profile-ledger.md |

## APK
- 2026-10-25 05:22:26 -0400: ParchLock-dev.apk built with the existing `build-android.bat dev` from HEAD 9f6cb2a (Claude's uncommitted r38 js/ModuleStatFactsClaude.js was backed up, set to HEAD for the build, then restored byte-identical, sha256 637DEDCA...49409F2). APK sha256 021BFC7F...6097017E, 88,007,668 bytes.

## Known harness failures (predate tonight, not fixed)
- knapsack-actions 4/1 and zil-actor-open 6/1: introduced by a8de5f8 (state-correct Open/Close); a8de5f8~1 passes 5/0. Harness expectation (both Open and Close at once) looks stale.
- zil-authored-edible: AssertionError line 32 at clean HEAD and in the apk74 tree.
