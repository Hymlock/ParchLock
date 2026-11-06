# REVIEW-REQUEST-005 - A1 qualified Suspect REMOVE (Codex's work, committed by grok under user override)

Author: Codex (root seat). Committer: grok. Authority: USER OVERRIDE 2026-11-05 05:41 ET ("finish and commit all open work
using adversarial instances. Take all open work from codex"). Codex is out of usage. Stand-in protocol reactivated.

Diff: REVIEW-005-A1.patch against HEAD d54a294d. Pathspec: js/ActionSynth.js js/Actionable.js js/EquipmentUI.js
js/SemanticActions.js js/ModuleStatFactsClaude.js harness/zil-identity-wear.js harness/qualified-removal-reference.js (new).
Working-tree sha256 prefixes equal the accepted hashes in nov4-lead/a1-source-review-hashes.json:
ActionSynth 23621211, Actionable 5b374b53, EquipmentUI 18781ab2, SemanticActions e8491543, ModuleStatFactsClaude 950e20bc.

Claim: Suspect (digest d02fd95b...) bare "mask" is ambiguous to the native parser; the exact fact
removalReferences {objects:[38], verb:"remove", scope:"worn-direct", nouns:{38:"western mask"}} makes the worn mask's
Remove render and submit "remove western mask". Every module without that fact returns "unowned" and keeps the old path.

Evidence: nov4-lead/a1-equipment-rendered-native-final.cjs/json, a1-rendered-native.cjs/json, TO-GROK-A1-SOURCE-REVIEW.md
(grok source review ACCEPT at these hashes), Codex combined 309 gate A1+Z3 (nov4-lead/final-shared-gate, diffs triaged as
nondeterminism in d54a294d CYCLES-GATE-DIFF-grok.md).

Commands (expected): node harness/qualified-removal-reference.js -> 46 PASS / 0 FAIL; node harness/zil-identity-wear.js ->
100 PASS / 0 FAIL; node harness/operator-regressions.js -> 13 PASS / 0 FAIL.

Doc-check: PRODUCTION_PLAN equipment/worn-removal sections and ARCHITECTURE_UML ActionSynth/EquipmentUI; DECISION-INDEX has no
rule against an exact per-digest action reference (same shape as wornRemovalScope / identityWearScope).