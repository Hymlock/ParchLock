# Item 2: status probe output visible (proposal R1, claude)

**Basis:** sealed claude b45f31b and codex `2026-10-09-codex-probe-visible-blind.md`.

**Agreement:**
- The cause is `StatTracker.releaseProbeEvents` (js/StatTracker.js 4159-4205). After the first paragraph gap it releases every line `isKnownProbeReplyLine` does not recognise, so it is shown and spoken. It is not a hiding failure: wump2ka's "You are carrying 4 lbs of stuff ..." carries `data-pl-probe-event="1"`.
- Codex adds that the colon-heading continuation is reset by the first item line, which opens the gap.
- The leak is general (any multi-paragraph or state-varying reply of a probe that costs a turn); META verbs never release.

**Disagreement:**
- Claude: the default for an unrecognised later paragraph becomes hidden.
- Codex: D207's genuine-attack visibility must be kept.
- Operator 2026-10-09: "They should all be headless and invisible." D207's operator rule: "Show the attack".
- R1 below satisfies both where evidence exists; the operator is asked to confirm the residual case.

## R1: release only on deterministic turn evidence; reply ownership learned from the game itself

1. **No turn, no event (deterministic, first).**
   - `beginProbeOwnership` records the tracked turn counter (`model().stats.turns.value`, the RAM-confirmed turns global, D152/D153) in `_spanOrigin.turnsBefore`.
   - At release:
     - turns tracked and unchanged: nothing else ran, so **the whole span stays hidden**. This is the META rule generalised to any probe that cost no turn.
     - turns unknown (no confirmed counter): **hidden**. The operator's headless rule wins when there is no evidence.
     - turns advanced: go to step 2.
2. **Reply paragraphs learned per story and verb (deterministic second, text as confirmation).**
   - A per-story record `PL_ProbeReplyShapes_<digest>` holds digit-normalised signatures (digits become `#`; whitespace collapsed; at most 64 per verb) of later paragraphs:
     - (a) seen in an earlier span of the same probe verb that turned out to be part of the reply;
     - (b) seen in a **typed** visible command of the same verb (the player's own INVENTORY or SCORE output, every paragraph up to its prompt).
   - A later line whose signature matches is reply: hidden, never released.
   - A line is learned as a reply shape only when it recurs in 2 spans of that verb, or from typed output. A one-off attack line ("The wumpus lunges...") is never learned as reply, because it does not recur in the same form.
3. **Release only what is left:** turns advanced AND the line is not on the known list AND it matches no learned shape. Such a line is released as today (shown, spoken, `data-pl-probe-event`).
   - The first-ever probe of a verb in a story, before any shape is known, is the only window in which an unknown reply paragraph can still be released.
   - **Operator question:** in that window, hide (always invisible, so an attack there would be missed) or show (as D207)? R1 defaults to **hide**, per the latest operator words; flipping it is one constant.
4. **Continuation fix (codex):** a colon heading's continuation persists through its item lines until the next blank paragraph, and is not reset by the first item line.
5. **Out of scope:** no per-title strings, no timers, no change to typed commands, and no removal of the known-reply list (it stays as confirmation).

## Tests

- New `harness/probe-release.js` (node, DOM doubles):
  - no-turn span: all hidden;
  - unknown turns: hidden;
  - turn advanced with an unknown paragraph on first use: hidden by default;
  - learned shape (typed INVENTORY then probe): hidden;
  - an attack line with turn advanced and shapes known: released and spoken;
  - continuation through item lines;
  - signatures normalise digits, so "4 lbs" and "13 lbs" match.
- Live matrix: `status-probe-matrix.js --only=wump2ka.z5.js` PASS; sampled LLR3 (Combat prompt), Treasures (prowess), Anchorhead and HHG, with the LOOK positive control.

**Prior-fix guard:** D207 (headless spans, released events, META provenance), D188, D169 (carry probe), D173 and D152/D153 (turn global), and D204 (superseded rule). Harnesses: stat-tracker, `death-terminal.js` (ending capture shares the span), status-probe-matrix samples and e3-inventory-warning.
