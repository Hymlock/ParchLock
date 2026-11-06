# S1: compare the two blind investigations, then proposal R1 (claude, main seat)
## Agreement
- Both reproduce: anchor and MakeItGood show the inventory reply's 2nd paragraph ([data-pl-probe-event]); single-paragraph replies (Advent) are clean.
- Both locate releaseProbeEvents (StatTracker.js ~4250-4294): the first paragraph is the reply, other paragraphs are events unless a sentence list matches (D207 contract; 4d6d0c0 extended the list).
- Both reject extending the sentence list (masking) and want a VM-execution boundary.
## Added by the second investigation
- Control: a typed visible "inventory" prints the same 2 paragraphs, so paragraph 2 is the game's own reply, not an event.
- Phase anchors differ by compiler:
  - **I6:** EndTurnSequence increments `turns` before timers, daemons and each_turn, so "printed after the turns global changed" is an exact boundary, readable at print time with no write hook.
  - **I7:** every-turn rules run before advance-time, so the turns boundary would mask them; I7 needs a routine anchor.
  - **ZIL:** CLOCKER interrupts precede MOVES, so ZIL also needs a routine anchor.
## Gap
The first investigation proposed a generic routine-return marker; the second shows it must be per compiler. Adopt the per-compiler view.
## PROPOSAL R1: staged
**Stage 1 (this proposal): I6 only.** While _statProbeOwned is set, tag each output chunk at print time with the current value of the **confirmed** turns global (D167/StatTracker slot).
- In releaseProbeEvents, for an I6 story with a confirmed turns slot, text printed while turns == its pre-probe value is reply (hidden); text printed after turns changed is an event (shown).
- Unconfirmed slot, I7, ZIL or anything unproven: today's rule, unchanged (fail-visible).
- **Hook:** wrap the ZVM print path in js/ZvmCapture.js (it already patches ZVM.prototype); map chunks to BufferLines by output order, not DOM timing.
- **Fixes:** Anchorhead. Make It Good (I7) stays on the current rule until stage 2.
**Stage 2 (later, separate proposal): I7 rulebook anchors and ZIL CLOCKER anchors.**
Prior-fix guard: D207, D191, D194, D195, D197, D167; harnesses for D207/item-2 (wump2ka carry), stat-tracker, operator-regressions, plus a three-engine gate.
