# Grok 1 solo commits (interim lead while other seats are out of credits)

Lead returns to Claude when it is back (bus #5266). Solo rule: strict adversarial self-review in place of a peer ACCEPT.
Doc check before each item: PRODUCTION_PLAN.md / ARCHITECTURE_UML.md (no product-code or architecture change in any row below).

| Commit | Summary | Evidence |
|---|---|---|
| 7c243ec | g1-batch: one timestamped run/log file per invocation, judge merges all runs; suspect key | work/investigations/grok1/batch/g1-batch.cjs |
| 9f6cb2a | Ledger: merge Claude #5242 rulings (fail closed x18 L:X, wornAttribute NA x7); regenerated U 137->112, L:X 1->19, L:NA 308->315 | work/investigations/grok1/ledger/verify-a-batch.txt, work/investigations/grok1/ledger/a-batch.json |

## APK
- 2026-10-25 05:22:26 -0400: ParchLock-dev.apk built with the existing `build-android.bat dev` from HEAD 9f6cb2a (Claude's uncommitted r38 js/ModuleStatFactsClaude.js was backed up, set to HEAD for the build, then restored byte-identical, sha256 637DEDCA...49409F2). APK sha256 021BFC7F...6097017E, 88,007,668 bytes.

## Known harness failures (predate tonight, not fixed)
- knapsack-actions 4/1 and zil-actor-open 6/1: introduced by a8de5f8 (state-correct Open/Close); a8de5f8~1 passes 5/0. Harness expectation (both Open and Close at once) looks stale.
- zil-authored-edible: AssertionError line 32 at clean HEAD and in the apk74 tree.