# Final finite source followup — ACCEPT

2026-11-02. Independent subagent source review; no new tests/browser/native runs, no external repository-seat vote.

**ACCEPT the current simplified digest-only implementation in the bounded reviewed scope.** The last navigation-abort blocker is corrected in actual source: WorkspaceUI.js:97 returns early only if navigate() does not report false; restart returns false on prepareNewGame failure (134) and caught navigation failure after canceling intent (138). Both cases now reach _leaving=false and blocker removal (99-100). No additional concrete blocker found in this finite followup.

Remembered forms use the existing AttrCalibrator.table.objects[item].rememberedForms and existing `attrCalib` LearningStores registration/key namespace (AttrCalibrator.js:95,1075,1536). They are not a separate database. LearnedWords.js:244-248 projects these digest-qualified item/form preferences into existing exact rows, so established ignored/revision metadata applies. Existing LearningStores installed-owner protection and uninstalled erase path operate on the same registered attrCalib key; no special unmanaged store bypass is introduced. Read implementation-settings-r1.json as supplied evidence: it records existing Light/Douse `exact:135:*` rows. This artifact is evidence of its recorded run, not an independent rerun or proof of every later source change.

Earlier R1/R2 import replay findings are superseded by the operator's no-compatibility direction and complete removal of imports. Prior actions/ranking/tap/echo/neutral/default-inspect corrections remain accepted as recorded in simplified-final-source-review.md. Root's focused37/store92/caps53 and erase-preservation results are reported evidence, not tests performed by this reviewer.

Limits: this accepts current source against the finite reviewed contract, not whole-module/all-game completion, physical-phone behavior, force-close durability or external-seat consensus. Final current-source native unsaved-reopen/SAVE/RESTORE proof and one final immutable shared gate remain required as root already records. No APK is authorized or produced by this review.

## Narrow authority helper followup — ACCEPT (2026-11-02)

Inspected only ActionSynth.learnedFormAllowed and its four integration callsites after the final report. ACCEPT in the bounded intended scope. It retains authored-command and disabled-default-inspect restrictions, checks existing activation policy for switch/turn pairs, and constrains an exact on/off spelling belonging to a measured light owner to AttributeSchema.lightForms' current validated side. The latter independently validates executable layout/family/object frontier/state/custody (AttributeSchema.js:525-573). Null/no applicable owner preserves prior behavior; this helper does not create capability or state evidence. Exact owned spellings are filtered, not every unknown generic verb globally.

Callsites inspected: ActionSynth learned append (551-553), Actionable learned scope authority (2796), EquipmentUI allowed form (54), Actionable More admission (2724). They consistently use the same helper; stored spelling evidence is retained. Existing later provider filters/stronger scopes continue to apply. HugeCave no-owner behavior remains unchanged by this helper in source; no native run repeated here.

Reviewed SHA256 snapshots:
- js/ActionSynth.js: 86B9D156F4393FB69FA7484530C11E3546DBD80EC785E190F04D44EA8BA645DE
- js/Actionable.js: FCEA730709C7B2A0C16B1798B16BBC940ED4DA6BFBC56DB579DA36E4601C289B
- js/EquipmentUI.js: 36FDCE4E90263EDA2DCA6B033B26F0144E7A4D6322DD698F713B0FF4143037EC

No additional blocker found in this narrow followup. No repeated tests/full audit/native, external-seat attribution, final shared gate result or overall completion claim.

## Resource-only cache bump — ACCEPT (2026-11-02)

Verified service-worker.js diff is two added lines/one removed: CACHE_VERSION parchlock-shell-v173 -> v174 plus explanatory persistent-learning comment. Existing cache-first APP_SHELL path at163-166 explicitly depends on version bump for new JS delivery; narrow resource update accepted. No APK/versionCode change reviewed or requested. Three helper-review JS hashes above remain identical. service-worker.js SHA256: 4CE2D71066A15DA1809B39FFBF4C8B04F4D82E023CE88495ECBBBCAF539331CF. No test/native run repeated; gate should snapshot this worker with the reviewed candidate.

## Newly identified former-inspect gap — REVISE pending narrow correction

2026-11-02 source-only followup. The concrete former-inspect defect is real: AttrCalibrator.defaultInspectVerb (974-980) selects substituteVerb, and inspectVerbCurrentlyDisabled (988-997) checks only disabled[current]. Consequently disabled.examine.confirmed=true with substituteVerb='look at' makes the current learnedFormAllowed check admit stored exact examine. New append/More can reintroduce that explicitly disabled former spelling.

ACCEPT proposed narrow correction before implementation: independently reject a candidate form when verbBehavior.disabled[form].confirmed is present, unless existing LearnedWords.inspectSuppressed('disabled:'+form) explicitly ignores that disabled decision. Preserve stored data, default/substitute selection and all other authority checks; no new semantic inference. Safe absent-table/disabled guards required. This finite gap supersedes prior final acceptance only until corrected; earlier accepted unrelated paths stand. No tests/native/gate rerun performed by this reviewer.

## Former-inspect correction verified — ACCEPT (2026-11-02)

Narrow current-source reread confirms learnedFormAllowed now safely resolves table.verbBehavior.disabled[form] and rejects its confirmed disabled decision unless existing LearnedWords.inspectSuppressed('disabled:'+form) explicitly ignores it (ActionSynth.js:150-152). Previous current-default check and remaining authority checks are preserved. This closes the specific disabled original EXAMINE + substitute LOOK AT gap; explicit Ignore remains authoritative. ACCEPT bounded correction. Current js/ActionSynth.js SHA256: 4CD538AAE0C82158D455D04C0F787C7D3F800A86F8575D470D53BF8E3E3AD765 (supersedes its earlier hash).

Root reports first failing constructed control then44PASS; this reviewer did not rerun tests. R1 baseline309 remains reusable unchanged; R1 candidate evidence is superseded by this product correction. Final R2 candidate-only309 comparison against preserved exact baseline and remaining paired-diff classification are root's pending checks, not results claimed here. No further research/feature expansion or external-seat vote.

## R3 early-membership source correction — ACCEPT (2026-11-02)

Narrow reread confirms LearnedWords.hasAuthoredFormRaw (110-118) inspects only current loaded rows, type/object/trigger/ignored/manual-or-edited identity; it does not invoke eligible/objects/payloadPool/referenceFor. learnedItemScopeFor now checks digest and stored learned/raw-authored exact pair membership first (Actionable:2790-2795). Absent pair returns before presentation/reference work. Full candidates validation runs only for matching raw-authored pair; actual object/reference/context/authority and captured generation/revision checks remain afterward. ACCEPT finite correction; no new sidecar/type/UI or scope admission is introduced.

Current SHA256:
- js/Actionable.js: 4EE4145FF3F9BE5E42486483D1F7B4E168119E37386185EB2E09F638D1F03819
- js/LearnedWords.js: 840DB1BA4A9912A50DBECE4741796548D25FB49920901A654CA9FF81C3D3DF9D

Root reports counter-regression first failed on R2 and now47/0; not rerun by this reviewer. This is source acceptance of the targeted side-effect avoidance, not proof it explains or resolves cabal/heist differences. Exact-driver pair evidence and final R3 candidate gate/classification remain pending; retain earlier R2 output and unchanged baseline.
