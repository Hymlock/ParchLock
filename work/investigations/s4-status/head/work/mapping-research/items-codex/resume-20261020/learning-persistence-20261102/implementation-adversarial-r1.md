# Current implementation adversarial audit R1

2026-11-02. Independent subagent source review, not a repository-seat vote. Reviewed the current thirteen-file implementation diff (including the separate Autocomplete producer tag, fourteen touched JS paths in diff listing), accepted remembered-form/identity contracts and integration-contract-r3-review.md. No tests/browser/native work, no retries of failed roles. Root runs focused tests separately. Concurrent root changes mean this is a bounded reviewed snapshot, not an immutable-candidate acceptance.

**Implementation verdict: REVISE for the concrete issues below.** Manual authored priority without two witnesses is ACCEPTED by integration R3 and is not a defect: its current revision is authored intent, separate from Enter/witness semantics. My initial message questioning it is withdrawn after reading the accepted R3 record.

## 1. New learned append resurrects disabled inspection (P1)

ActionSynth.commandsForObject adds every learnedFormsFor verb after verbsForAttrs (js/ActionSynth.js:529-532). verbsForAttrs deliberately omits disabled default inspection (163-164), but learnedFormsFor includes persisted exactForms for all observed verbs, including examine/look (AttrCalibrator.recordExactForm called at1167). authoredCommandAllowed (ActionSynth:117-142) returns true immediately for inspect verbs, so its final filter does not repair this. A prior confirmed exact EXAMINE survives when module-wide inspect behavior later disables it, and the new append reinstates it in ordinary direct room/held commands. Yourself has its own inspect-disabled check, so the surfaces diverge.

Required correction: apply the existing inspect authority to the learned projection before it enters either surface, including exact prior default/substitute spellings. Keep stored evidence, but do not reoffer currently disabled inspection. Focused counterexample: exactForms.examine threshold2 plus inspectVerbDisabled=true produces no Examine in ordinary direct object commands, matching Yourself.

## 2. Semantic wrapper drops new scope, while tap validates a different descriptor (P1)

ActionSynth assigns learnedItemScope to allowed descriptors (671-672). SemanticActions.migrationCompatFormsFor copies only existing named scopes and not learnedItemScope (js/SemanticActions.js:351-356), and duplicate-merge likewise omits it (373-405). Ordinary slices reconstruct a scoped copy only in LearnedCommand (Actionable:2940), which Qol validates for ranking. Their Action closure instead validates original c (2945-2948), which has no learnedItemScope after semantic wrapping. With semantic cutover enabled, a remembered descriptor can keep its learned priority/rendered command and later execute after that evidence is ignored/erased or otherwise invalidated, because the tap path never checks the reconstructed marker.

Required correction: preserve the exact same validated learned descriptor through semantic wrapping/merge and actual tap closure, while retaining stronger owner scopes. Do not validate only a ranker-only copy. A direct current learned predicate check at tap is also sufficient if it checks the captured identity/revision/form and preserves existing guards. Test cutover ON/OFF with remembered scope invalidated between render and click; stale click must not submit. This is the metadata propagation seam explicitly required by R3.

## 3. Import conditional false drops genuine observations permanently (P1)

readOwned can resolve false for a temporary queue conflict, raw-source changed, or a competing target/source condition (LearningStores:296-306). AttrCalibrator.record defers a current entry but calls record again only if ok (AttrCalibrator:1093-1103). ExitCalibrator.observe likewise replays only if ok (ExitCalibrator:545-554), and diagonal travel callback replays only if ok (ZRamReader:929-936). Thus a legitimate current observation is lost when the import declines temporarily, contrary to the reviewed fresh-observation policy. It is especially visible if queue already contains a target write: copy returns false before checking target presence; later hydration loads target but the deferred observation has vanished.

Required correction: distinguish imported/new-target-ready/retryable-conflict/erased/failed outcomes. Retry/reapply immutable current observations after hydration reaches authoritative ready state for the same module/generation, or make their new-key write win by explicit policy. Erased/stale identity may deliberately discard, but cannot conflate all false outcomes. Do not loop unboundedly on permanent failure. Existing source/raw-string/owner lock checks themselves are sound and should stay.

## 4. Response witness filtering does not exclude owned echo/probe lines (P2)

New remembered responseObserved uses a whole-string regex at AttrCalibrator:526 after captureAfter has joined every BufferLine with spaces (459-464). It removes only the case where the entire trimmed text exactly equals command. Input echo plus a separate bare prompt, e.g. `polish lamp >`, remains nonempty and can count twice without any game response. Probe-owned lines are not filtered in this new path either. This violates the accepted echo-only/probe/prompt-only exclusions; it is not a demand for universal NLP success detection.

Required correction: filter by existing DOM ownership while freezing the response: exclude Style_input and pl-stat-probe/pl-carry-probe lines, and require actual nonempty remaining game response rather than command/prompt-only text. Keep refusal heuristics conservative. Explicitly known More/continuation-only output should remain nonqualifying. Preserve old calibration classifier behavior by changing only the remembered lane's snapshot/response predicate.

## Found during review, now corrected by root

Initial AttrCalibrator.hydrate returned on pending B import while retaining A table. Root added _loadingKey transition clearing table/marker before readOwned (1005-1009); current read confirms the reported A→B pending contamination path is closed in source. This is not test certification. Manual c.enter gate concern is withdrawn per accepted authored-preference decision above.

## New exit flush design verdict

**ACCEPT WITH FINITE IMPLEMENTATION CONDITIONS**, before code: track the actual active drain promise plus import promises; wait recorder settlement before flush; bounded 2000ms result; failure/timeout keeps the page with retry. No force-close/native guarantee and no synchronous lock bypass. The following are required meanings of that design, not an engine-wide lifecycle project:

- `wait current turn settlement` must cover already boundary-stamped turns whose 450ms analyze timers are still pending, not only TurnRecorder._activeTurn. A simple new 450ms delay is acceptable if submissions are blocked during this exit attempt and it waits all pre-exit timers before capturing flush work; explicit tracked settlement promises are clearer. Do not invoke analyzers twice.
- Freeze navigation/submission interaction while settling/flushing, or capture and wait a stable submission/snapshot watermark that includes subsequent accepted events. Otherwise a command accepted during flush creates a timer/write after the success result. Recheck no pending settlements/imports/snapshots before navigation.
- Return ok only after tracked writes/imports are actually complete and no terminal failed/quota-dropped outcome remains for the captured exit work. queue length zero alone is insufficient: drain removes quota-dropped snapshots. Existing quotaError/lastError and conditional-import outcome must be considered; distinguish retained/unassigned legacy (not a pending new write) from a failed attempted write.
- Existing drain returns Promise.resolve if already draining (LearningStores:370), so flush must retain/join the actual in-flight promise rather than assume calling drain awaits it. Joining imports must account for completion callbacks that enqueue new writes, then drain again to stable empty state.
- Lock rejection/timeouts never navigate or assert durability. Retry is explicit and bounded; keep authorized library/restart destination intact. Restart prepareNewGame intent should be created only after successful flush or rolled back if navigation is withheld. Error text must avoid saying retry will recover a quota-dropped payload unless implementation actually retained it.

This accepts the finite exit design with these conditions; it does not certify its eventual code. No need for native Activity changes. Current source still has immediate WorkspaceUI navigation, so implementation review remains outstanding.
