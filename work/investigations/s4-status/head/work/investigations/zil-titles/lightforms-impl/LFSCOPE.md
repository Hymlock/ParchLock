# lightForms tap currency (codex 1107 REVISE) — candidate, not committed

Base HEAD 46fbb103. Worktree ../wt-claude-lfscope. Diff: batch-lfscope.diff (js/ActionSynth.js, js/Actionable.js,
js/SemanticActions.js, js/EquipmentUI.js, harness/zil-light-forms.js). Pattern = landed Identity-Wear (19109b07).

- ActionSynth.lightFormScopeFor(obj, name, context) -> {kind:'lightForms', digest, generation (UndoRestoreSync), id, noun
  (unique verified, must equal command noun), verb, command, side 'on'|'off' (live stateBit), stateBit, context}. Requires exact
  executable fact, AttributeSchema.lightForms (actual custody: inventory = direct player parent; room = inPlayerRoom) to return
  exactly that verb. commandsForObject now offers a light verb ONLY with its scope attached (no unscoped light rows).
- ActionSynth.lightFormCommandCurrent(cmd): re-derives at tap; rejects sharedMembers, digest/generation/id/noun/verb/side/
  stateBit/command drift, lost custody, flipped state bit.
- Actionable.radialCommandCurrent rejects a failing lightFormScope (and any shared use); sharedObjectCommands excludes them.
- SemanticActions carries lightFormScope through migration-compat and the rendered-dedupe winner.
- EquipmentUI.yourselfCommands keeps lightFormScope rows (Label = capitalized verb: Light / Turn off); selectYourselfAction
  kind switch extended (id, generation, side, command, context must match).

Validation (worktree):
- harness/zil-light-forms.js 48 PASS (39 prior + 9 new: scope shape; state flip after render; custody lost held/nested/offstage;
  room owner leaves room; generation bump; noun drift/command mismatch/digest drift; shared rows; SemanticActions keeps scope;
  Equipment row scope+label and Equipment tap rejects flipped state). Uses the REAL Actionable.radialCommandCurrent extracted from source.
- zil-identity-wear 48 PASS; equipment-ui 119/0; operator-regressions 13/0.
- codex oct30-recovery/lightforms-review-controls.cjs: offstage [] / phantom null / host clone null / restored sentinel [light...] unchanged.
- regression-gate (GLULX=1) Infidel, Cutthroats, Enchanter, Advent.z5.js, Alabaster.gblorb.js: base HEAD vs cand -> 0 differences.
