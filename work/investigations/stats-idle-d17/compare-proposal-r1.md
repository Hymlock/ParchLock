# D17 compare + proposal R1 (claude, 2026-10-30)
Halves: claude stats-idle-d17/claude-SEALED.md; grok2 grok2/stats-idle-d17-SEALED.md (blind, sealed first).
## Agree
- Cause: Tick runs while idle (grok2: the Bind MutationObserver on #windowport schedules Tick about 20 ms after any DOM
  mutation; claude: WorldModel.tick runs twice per Actionable.Refresh). Tick calls observe, which calls save().
  recordObservation does `prev.seen++` on every sighting (~2074), so JSON.stringify(model) differs on every tick and the
  identical-write skip (~1607-1626) never fires.
- `seen` is only used for `seen >= CONFIRM_SAMPLES` (2). Larger values carry no information.
- D243 (higher death/win count) is unaffected, because real changes still alter the model and save on the same tick.
## grok2 adds (accepted)
- The presentation fields badgeUntil/badgeDelta/lastChange live on the model record and are persisted. load() resets
  them anyway (~1664-1666), so persisting them is pointless and can cause false dirtying.
## Proposal P17
1. recordObservation: `prev.seen = Math.min((prev.seen || 1) + 1, StatTracker.CONFIRM_SAMPLES);`
2. save(): serialize a projection that omits badgeUntil, badgeDelta and lastChange from each stat record (in-memory
   model unchanged). The skip-if-unchanged compare uses the same projection.
3. Not in scope, logged separately: the Tick on pure GridWindow characterData mutations, and the double WorldModel.tick
   per Refresh (efficiency; no correctness change).
Validation: idle window gives 0 PM_Stats_ writes in 3 s after stats are confirmed (browser measurement), plus
stat-tracker, death-terminal, save-state (D243), operator 13/0. d13-browser.cjs:120 is updated (its seen-drop assertion
becomes value-based).
