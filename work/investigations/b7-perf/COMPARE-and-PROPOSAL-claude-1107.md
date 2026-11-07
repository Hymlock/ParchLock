# B7 phone stall: comparison (step 2) and proposal (step 3) - claude
## Compare (sealed: PHONE-TIMING-claude-1107.md, REVIEW-PREP-claude-1107.md vs BLIND-grok2.md)
Agree: cost is per-command repeated world-model rebuilding, synchronous on the main thread; map draw, underline markup, D198 decode are negligible.
- claude (phone CDP): 28 WorldModel.tick per LOOK, ZRamReader.snapshot 932 ms of 961; Actionable.Refresh nests 9 ticks.
- grok2 (desktop): ~10.9k applyTo, ~380k bitFor, ~10.9k attrsFromObject per command; objectLinks 46k, shortName 22k; findPlayerId 35-50 ms.
Same thing seen from two sides: 28 ticks x ~390 objects = ~10.9k attrsFromObject -> applyTo (35 bitFor each). Every command pays the full tax.
Gap: grok2 did not bisect callers (I did: ticks from Actionable 2291/2298, EquipmentUI 1159, ParchLock 49/160/462, TranslatorUI 302, UndoRestoreSync 62/86).
## Proposal: reuse the RAM snapshot between VM runs (extend existing generation plumbing; no new system)
1. ZvmCapture.install already wraps ZVM.prototype start/resume. Add ZvmCapture.vmRuns (integer) incremented on entry AND exit of start/resume,
   and ZvmCapture.inRun true while inside. Any RAM change by the game happens inside these calls (no app module writes game RAM; undo/restore/
   restart run in the VM and also bump UndoRestoreSync.generation).
2. ZRamReader.snapshot(mem): memo keyed {mem.buffer identity, ZvmCapture.vmRuns, UndoRestoreSync.generation, ModuleLibrary digest}.
   Hit -> return a copy (structuredClone or JSON round-trip of the cached result) so callers that mutate (ZRamProvider.collect lines 282-316,
   DarkScope hudMetrics filter, consumers of discoveredObjects) never touch the cached value. Miss or inRun -> compute, store, return a copy.
3. ZRamProvider.collect keeps computing its non-RAM parts every call (statusTranslation, ParchLockMap.CurrentRoom fallback, text hints):
   only the pure-RAM snapshot is reused. collectGeneration semantics unchanged (still per pass) so D217 library compass stays as is.
4. No change to tick call sites in this step (fewer ticks would be a second, separate change).
Invalidation cases that must miss: any VM resume (typed command, probe queue, /goto, timed input, char input, glk event), restore_file/undo/
restart (generation), new story load (buffer/digest), AttrCalibrator learning (happens inside opcodes, so inside a run), tick re-entered
during a run (inRun). Glulx/RemGlk: no ZVM, snapshot path not used -> unaffected.
Proof plan: phone CDP before/after on Zork I (target << 200 ms per command), unit harness (hit/miss per case above incl. probe and /goto),
operator-regressions 0 FAIL, three-engine gate on a sample + full 309 gate (every game, since snapshot feeds all Z titles).
Prior-fix guard: D217 (library compass per generation), D198 frozen decode (7c1784bb), r1-r3 parked cache (b7-perf), D88 generation semantics.

## r2 (after grok REJECT #6277 and grok2 ACCEPT-with-conditions #627x)
grok's two counterexamples hold: (A) TurnRecorder._settle (450 ms after the VM returns) runs AttrCalibrator analyzers that change bitFor/applyTo
with RAM unchanged; (B) snapshot itself reads the status-grid DOM (findLikelyLocation -> printedRoomNumber, D171). Key extended, not replaced:
1. Learning version: one integer LearningVersion.n bumped by every semantic-table writer, at the write: AttrCalibrator.record (verbSuccess),
   _correlateLocation / _correlateVerbBehavior outcomes, inventoryRootId write (1388-1430), wornBit write (1505), hydrate (1011-1027: replace/reset),
   persist failure reset (1069-1076); ExitCalibrator hydrate/persist and diagonal hydration (436-465, 891+). AttributeSchema per-object
   takeability overrides if written outside these. A harness enumerates writes by proxying the tables and fails if any write leaves n unchanged.
2. Status input: the exact string printedRoomNumber() reads (status-grid text) joins the key; it is read fresh on every call (cheap DOM text),
   so a repaint with a new room number misses.
3. Hydrate BEFORE key lookup (calibrator hydration runs first, may bump n), as grok noted.
4. grok2 conditions: never store while ZvmCapture.inRun; hot path (ZRamProvider.collect -> snapshot) uses the memo; copy cost measured
   (structured copy of top level + arrays; elements frozen only if a harness proves no consumer mutates them), not 28 deep clones.
Key = {mem.buffer, vmRuns, UndoRestoreSync.generation, digest, LearningVersion.n, statusGridText}.
Unit harness must reproduce grok's A and B counterexamples as MISS cases, plus probe, /goto, restore, inRun re-entry.
