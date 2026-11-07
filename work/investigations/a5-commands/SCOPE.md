# A5 scope: D88 stages 7-8 (read-only investigation, 2026-11-06)

## 1. D88 stage definitions (PRODUCTION_PLAN.md ~L887-910, D88 row L1465)
- Stage 7 "Held-out live challenge and default-on": freeze code, THEN pick held-out stories/builds
  (implementers must not choose/inspect them). Clean-profile runs across Inform Z3/Z5/Z8/zblorb,
  non-Inform ZIL, randomized Wumpus, AOTYRZ, duplicate nouns, multiword-only fixture, localized
  fixture. Each run: cleared sidecar, then repeat after reload, save/restore, undo, restart.
  Same release+serial, different checksum must not share learning. Glulx only after its adapter.
- Stage 8 "Cleanup after soak": remove the first-token inspect split and the legacy usage path
  only after default-on evidence. KEEP v2 readers (PM_AttrCalib_*) and the rollback flag for at
  least one compatibility cycle.
- Note: default-on half of stage 7 already happened (D198): CutoverFlag defaults true.

## 2. Command paths
Flag: `SemanticActions.CutoverFlag.isEnabled()` (js/SemanticActions.js ~L104): `_testOverride`,
else `localStorage PL_SemanticActions_Cutover !== "0"`, else true. Rollback = set "0".
Read at: Actionable.js L1016 (_resolveObjectCommands), L1047 (resolveExitCommand), L1060
(resolveAskAboutTopics); Autocomplete.js L237 (RamCommandSeeds); Qol.js L694 (input radial);
EquipmentUI.js L81 (inventory/equipment radial).

KEY FINDING: there are not two independent paths. SemanticActions wraps ActionSynth
(SemanticActions.js L337 calls ActionSynth.commandsForObject; also payloadPlayerId,
defaultInspectVerb, heldContainerName, authoredCommandAllowed, normalizeQualifiedRemovalCandidate).
And with cutover ON, two consumers still deliberately UNION the legacy output:
- Actionable._resolveObjectCommands: semantic.concat(ActionSynth.commandsForPayloadObjectId) dedup.
- EquipmentUI: commands.concat(ActionSynth.commandsForObject(obj,"inventory",nested)) unconditionally.
Paths that are truly legacy-only when ON (flag-off branches):
- Actionable L1066-1070 fallback ActionSynth.commandsForPayloadObjectId (also the catch path).
- Actionable.commandForExitLabel as the resolveExitCommand off-branch (but it is still a live
  helper; SemanticActions.resolveExitCommand mirrors it).
- Actionable.resolveAskAboutTopics hand-built legacy construction (off-branch).
- Autocomplete/Qol `ActionSynth.collectFromPayload` fallback when resolveForPayload returns null/throws.
- Actionable usageCounts/verbCounts (L15-16, L902-904, ranking L1097) alongside intentUsageCounts
  = the "legacy usage path"; first-token verb ranking (Actionable.js L13) = the "inspect split".
examineOnly / possessedBy branches in Actionable run BEFORE the flag check, use ActionSynth
directly on both settings (not covered by cutover at all).

Feature dependence:
- D259 Wear (wearForms) and D260 Light (lightForms): logic lives in ActionSynth (L438-510,
  L93-163); reached via SemanticActions->ActionSynth and via the legacy unions. Must stay.
- M6 seated taps: exit commands via Navigator/Actionable.resolveExitCommand -> cutover path for
  labels; Navigator itself does not read the flag. Unaffected by stage 8 deletions above.
- M11 rewind: Map.js/SaveState.js/ZvmCapture UNDO bookkeeping; independent of both paths.
- S1 probes (D270): ZvmCapture status probe; independent of both paths.

## 3. Smallest safe next steps
Stage 7:
- An evaluator seat (not the implementer) picks, after a recorded code-freeze commit, ~8 builds
  from the 309 catalog NOT named in D88/D198/D259/D260 harness fixtures or tuning notes (grep
  harness/d88-*, d198-*, ModuleStatFactsClaude digests to build the exclusion list): one each of
  Inform Z3, Z5, Z8, zblorb, ZIL, plus wump2ka (randomized), AOTYRZ, a duplicate-noun game.
  Multiword + localized = existing fixtures (d88-multiword-recognition.js; localized fixture
  must be authored -- none found).
- Commands: radial/left-click/input-radial set per object on 3 rooms each; assert flag-ON
  descriptors == flag-OFF commands (parity) and that each submits without parser error;
  cleared sidecar, then reload / save-restore / undo / restart; checksum-split check via
  d88-sidecar-persistence.js. Driver: extend harness/d88-stage6-cutover.js + d88-semantic-parity.js
  run with title labels withheld; touch via d88-touch-longpress.js (browser, no phone).
Stage 8 (only after stage 7 passes):
- Deletable when ON, proof = flag-off branch only: Actionable resolveAskAboutTopics legacy body;
  Autocomplete/Qol collectFromPayload fallback (verify resolveForPayload never returns null on
  the 309 gate first -- add a counter, not a deletion, as step one); legacy usageCounts/verbCounts
  ranking once intentUsageCounts ranking matches.
- Must stay: ActionSynth module itself (SemanticActions depends on it; wear/light/qualified
  removal/outOfReach/inspect policy); the two legacy unions (removing them drops capabilities
  -- "missing over wrong"); commandForExitLabel; CutoverFlag + rollback; PM_AttrCalib v2 readers.
- Honest conclusion: "two paths" mostly means two consumer branches; full collapse is not
  possible without moving ActionSynth's capability logic into providers, which is beyond stage 8.

## 4. Prior-fix guard
harness/d88-semantic-parity.js, d88-stage6-cutover.js, d88-sidecar-persistence.js,
d88-passive-evidence.js, d88-multiword-recognition.js, d88-touch-longpress.js,
d198-semantic-provenance.js, d31-known-topics.js, d259/d260 wear/light harnesses (grep harness
for wearForms/lightForms), m11 rewind + m11-dark-scope.js, S1 probe harness (D270),
phase2-heuristic-cutover.js; then node harness/operator-regressions.js (0 FAIL),
work/investigations/regression-gate.cjs (ZIL+Inform Z+Glulx), full 309x2 gate, each diff
INTENDED or REGRESSION.
