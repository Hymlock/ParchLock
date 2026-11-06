# HugeCave knapsack: compare + proposal (claude, P0/T3 lane) - 2026-10-20

Inputs: claude sealed work/investigations/2026-10-18-claude-knapsack-SEALED.md (now unsealed),
grok2 blind work/investigations/2026-10-18-grok2-knapsack-blind.md (#4196). Operator save
work/investigations/2026-10-18-hugecave-operator-save.json. Rules: docs/seat-rules.md steps 4-8.

## Compare
Agree (independently):
- A. js/ActionSynth.js:257-258: a WORN item in inventory context gets only [inspect, remove]; the container verbs
  verbsForAttrs derived (open/close/search/empty) are discarded. Knapsack 503 attrs (declared table, D193 alias
  recovery): worn, clothing, container, openable. This is "no Open/Close" in the Equipment-panel menu.
- B. js/ActionSynth.js:229-250: an item inside a held container gets ONE action, "take out of <container>" with
  command "take <item>" (D78). A short tap runs the first action, so a tap on the matches takes them.
grok2-only leads, resolved by claude's replay (scratchpad knapsack.cjs / knapring*.cjs on c24ae52):
- H3 openCapability (ActionSynth.js:61-71): not a factor; HugeCave has no openCapability fact, and the story-text
  (object) menu shows Open/Close from boot.
- H4 stale inventory: not reproduced; after "take matches" the panel immediately shows matches held by the player.
  The operator screenshot shows the same. No change proposed (rule 14: nothing to mask or fix).
- H5 story spills the matches on OPEN: no; the game prints the contents on open and moves them only on "take".
claude-only: "Unlock with..." is the D147 instrumental launcher (Actionable.js:814-818), offered whenever "unlock" is a
dictionary word, with no lockable object in scope.

## Proposal (consumer rules only; no tag or evidence change)
F1. Worn container keeps its container verbs (ActionSynth.js:257-258). In inventory context, a worn item gets
    [inspect, remove] PLUS the container-family verbs verbsForAttrs already derived from its own attributes
    (open, close, search, empty, look in), in that order. The container rule and the openCapability gate
    (ActionSynth.js:61-71) still decide those verbs; nothing new is invented.
F2. Item inside a held container (ActionSynth.js:229-250): offer the item's own inspect verb FIRST, then
    "take out of <container>" (label) -> "take <item>" (command, D78 unchanged). A short tap now inspects; taking
    is an explicit choice. Other verbs for the nested item stay out (the container-held path is unchanged otherwise).
F3. "Unlock with..." (Actionable.js availableInstrumentals): additionally require at least one in-scope object whose
    attributes say lockable (validated ABI / proven), so the launcher appears only when something can be unlocked.
    "Use with..." and "Cast at..." unchanged (D147 dictionary rule).

Prior-fix guard (rules step 5): D78 (take X out of Y submits plain take: kept), D122 equipment sheet, D147 instrumental
verbs (dictionary gate kept, lockable gate added), D205 Yourself radial, D226 inventory holder; ARCHITECTURE_UML §56
(Equipment sheet), §59 (Commanding held containers, instrumentals). Guards: harness/operator-regressions.js (Zork I
mailbox Open/Close, leaflet/kitchen-table underlines), the HugeCave knapsack replay (new: harness/knapsack-actions.js,
asserting F1-F3 before/after), 309x2 gate (shared ActionSynth/Actionable) owned by grok2.

Review asked: grok2 (blind peer) and codex (T3 auditor per plan R1). ACCEPT or OBJECT with file:line.
