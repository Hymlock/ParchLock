# Claude review prep for the VM-progress barrier (sealed before grok's proposal arrives)
Facts from the code (11-07):
- VM run entry points are already wrapped once on ZVM.prototype: prepare/start/resume (js/ZvmCapture.js install). A counter belongs there.
- No app module writes game RAM (no setUint8/16 outside lib/zvm.js); undo/restore/restart go through the VM and bump UndoRestoreSync.generation.
Attack points for any proposal:
1. WorldModel.collectProviders inputs that are NOT RAM: transcript/look text, Actionable scope, learned words (AttrCalibrator/TurnRecorder),
   SaveState pending, map topology state, engine mode toggles, provider registration order. Each must either be keyed into the barrier or
   proven not to feed the payload.
2. Glulx/RemGlk providers: no ZVM; barrier must not apply (or needs its own counter).
3. Probes queued between ticks run through resume -> counter covers them; /goto must be shown to call resume, not mutate state elsewhere.
4. A tick inside resume (re-entrancy) must not cache a mid-run payload.
5. Callers that mutate lastPayload after tick (DarkScope hudMetrics filter, TranslatorUI) must not poison the cached copy.
Measure: same phone CDP script before/after; target << 200 ms per command.
