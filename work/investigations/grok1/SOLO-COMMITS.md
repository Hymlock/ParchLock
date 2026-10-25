# Grok 1 solo commits (interim lead while other seats are out of credits)

Lead returns to Claude when it is back (bus #5266). Solo rule: strict adversarial self-review in place of a peer ACCEPT.
Doc check before each item: PRODUCTION_PLAN.md / ARCHITECTURE_UML.md (no product-code or architecture change in any row below).

| Commit | Summary | Evidence |
|---|---|---|
| 7c243ec | g1-batch: one timestamped run/log file per invocation, judge merges all runs; suspect key | work/investigations/grok1/batch/g1-batch.cjs |
| 9f6cb2a | Ledger: merge Claude #5242 rulings (fail closed x18 L:X, wornAttribute NA x7); regenerated U 137->112, L:X 1->19, L:NA 308->315 | work/investigations/grok1/ledger/verify-a-batch.txt, work/investigations/grok1/ledger/a-batch.json |
| 586fe85 | Facts r38 (Claude's dirty file minus Zork3 worn hunk, exact blob 2b320b06 = candidate sha 782BBD9B...B621E7): concealed x6 (Zork1, Enchanter, Infidel, Hitchhik, Hollywood, Suspended), Suspect wornAttribute 5, Hollywood talkable 18, Borderzone scenery 29, locked 14. CORRECTION: commit message says "Moonmist locked 14"; the locked 14 hunk is Wishbringer. Codex #5275 conditional ACCEPT; operator 13/0; 309-game three-type gate 6 Inform-only diffs, all FLAKY by same-state reruns x2 on both trees | agent-tools/r38gate/ (base/cand/rerun/full5 jsonl, source sha256) |
| (this commit) | Ledger regenerated from HEAD 586fe85 facts: C 203->214, U 112->102, L:UD 31->30 (Suspect worn row now C from wornAttribute) | work/investigations/2026-10-16-zil-profile-ledger.md |
| (this commit: USER_GUIDE encoding) | Docs only: USER_GUIDE.md L148/149/151 restore U+00D7 and U+2192 that were literal 0x3F '?' since 99d17c0 (widget commit, 2026-10-09). Build/sync byte-identical (sha256 dev = ParchLock-dist = distro). Codex out of credits; bus #5318 claim; audit on reset | git show HEAD -- USER_GUIDE.md |

| (this commit: radial auto-submit) | Operator rule (pt462u, claim #5299): direct complete actions submit at once from every radial/menu path; only whitespace-terminated compound/addition stems (Put in/Give to/Unlock with/Cast at/Say, examine/take...) prefill. Root cause: per-closure Enter:false -> Inject prefill gates (Yourself Wield "wield gauche" only pasted). One shared decision Actionable.runChosenCommand (fail closed: Submit()===true, / branch dialog guard) now owns Yourself radial, object radial + primary click (activatePrimary), target picker, Specify..., More, Tools list, Commands/History dialogs. Docs amended (PLAN pl-d205, ARCH sec 69/70/74). Independent review: grok2 REVISE #5317 -> ACCEPT #5322 of patch sha256 719299A4...C455 (v2); full suite 0 new failures | work/investigations/grok1/yourself-radial-autosubmit.patch, work/investigations/grok1/autosubmit/rerun-base.json + rerun-patch-v2.json, harness/radial-auto-submit.js 60/0 |
## APK
- 2026-10-25 05:22:26 -0400: ParchLock-dev.apk built with the existing `build-android.bat dev` from HEAD 9f6cb2a (Claude's uncommitted r38 js/ModuleStatFactsClaude.js was backed up, set to HEAD for the build, then restored byte-identical, sha256 637DEDCA...49409F2). APK sha256 021BFC7F...6097017E, 88,007,668 bytes.

- 2026-10-25 16:36:30 -0400: ParchLock-dev.apk rebuilt with the existing `build-android.bat dev` from HEAD 8281fc2 (app-affecting change: 586fe85 r38 facts). Facts file set to HEAD for the build (bundled assets + dist facts sha256 782BBD9B...B621E7), then Claude's dirty file restored byte-identical (637DEDCA...49409F2). APK sha256 59DA1E53...7E081C3A, 88,063,232 bytes. Earlier 16:31 attempts failed at make-dist ("Could not replace ParchLock-dist", folder held by another worker's process; released by user).

- 2026-10-25 18:44:30 -0400: ParchLock-dev.apk rebuilt with the existing `build-android.bat dev` from HEAD ec1d0a7 (radial auto-submit, grok2 ACCEPT #5322). Claude's dirty js/ModuleStatFactsClaude.js set to HEAD for the build, then restored byte-identical (637DEDCA...49409F2). APK sha256 76B35DB1...4C7DC592, 88,029,935 bytes; bundled public/js/Actionable.js contains activatePrimary.
## Known harness failures (predate tonight, not fixed)
- knapsack-actions 4/1 and zil-actor-open 6/1: introduced by a8de5f8 (state-correct Open/Close); a8de5f8~1 passes 5/0. Harness expectation (both Open and Close at once) looks stale.
- zil-authored-edible: AssertionError line 32 at clean HEAD and in the apk74 tree.
