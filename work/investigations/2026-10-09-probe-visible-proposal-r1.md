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

## R2 (codex #2298/#2299 accepted; operator answer 2026-10-09)

**Operator:** "obviously it should be displayed and read if possible to do that without also displaying any status command requests." So the D207 rules stand: real events are shown and spoken, and no status-check output is ever shown.

**R1 withdrawn:**
- recurrence learning would also learn repeated attacks;
- typed output can contain attacks;
- the cached turn counter cannot prove that no turn passed;
- defaulting to hidden suppresses events.

**R2:**
1. **Continuation fix (codex):** a colon heading's continuation persists through its item lines until the next blank paragraph.
2. **Generic inventory summary recognition (codex):** inside an inventory-origin span, a later paragraph is reply when the **whole paragraph** validates against the existing D169 carry parsers (the weight, capacity and value forms that `observeCarryText` already decodes). It must start with the subject ("You are carrying ..." / "It's all worth ..."); a substring match is never enough. No per-title strings.
3. **Coverage of "all modules" (operator: it is in others as well):**
   - Run `harness/status-probe-matrix.js` on **every** manifest row, both owners, at 360 width, before and after.
   - Every leaked line (`data-pl-probe-event` on a probe-family reply) is classified into a reply family. Each family gets one generic whole-paragraph recogniser built from the existing metric parsers where they exist (`MEASURED_METRIC_REPLIES`, rank and prowess forms), scoped to the probe's origin verb.
   - A genuine event found in the sweep (an attack, NPC action or timer) stays released; it is a negative control and is listed.
   - Lines that no generic family covers are listed for the operator, not hidden by guesswork.
4. **Negative controls:** a real attack in the same turn is shown and spoken; a repeated attack is shown again; META output stays hidden; typed INVENTORY and SCORE are unaffected; the LOOK positive control holds.

**Tests:**
- unit (DOM doubles): continuation; whole-paragraph carry validation versus a substring decoy; attack released; repeated attack released;
- the existing stat-tracker unit suite;
- the full matrix before and after, with the leak list going to zero except released genuine events.

**Prior-fix guard:** D207, D188, D169, D204, `death-terminal.js`, e3-inventory-warning.

## R3 (operator 2026-10-09: "I don't want us to have to go through every freaking game and adjust it for every tiny little difference")

R2's per-family sweep is withdrawn. R3 is one deterministic mechanism with no reply lists:

1. **Make the probe out-of-world.**
   - In Inform games, the parser decides whether time passes from the verb word's dictionary flag (`#dict_par1` bit 0x02, META). `probeVerbIsMeta` already reads it.
   - Immediately before a status probe is submitted, set bit 0x02 on that verb's dictionary entry in the interpreter's memory. Restore the original byte when the probe's span ends: `endProbeOwnership`, and every abort, restore, restart and undo path that clears the probe (`clearCarryProbe` and friends).
   - Result: no turn passes, no daemons, timers or NPCs run, so **the whole span is the reply and stays hidden** (the existing META rule in `releaseProbeEvents`).
   - Real events happen on the player's next real turn and are shown and spoken normally. The operator's "show the attack" is satisfied by construction.
   - Side benefit: probes stop costing a turn (the D194 and E3 "uses a turn" warnings stop applying where this works).
2. **Safety:**
   - The dictionary lives in static memory, which Quetzal saves never contain, and the byte is restored before the next player input, so saves, undo and the transcript never see it.
   - It is applied only when the dictionary has Inform verb flags (`informVerbFlags`) and the verb entry is found.
   - Proof per game is not needed: if the game ignores the flag, the span still advances a turn and falls back to item 3.
3. **Fallback (ZIL/Infocom and anything without Inform flags):** the current D207 release plus the continuation fix (codex). No new per-family lists.
4. **Tests:**
   - unit: the flag is set during the probe and restored on end, abort, restore, restart and undo; the original byte is preserved when it was already META;
   - live: wump2ka probe with no turn advance and no leak, and an attack on the next real turn visible;
   - samples: Treasures and Anchorhead;
   - one ZIL game: unchanged behaviour;
   - the matrix sample, `death-terminal.js` and stat-tracker.

**Prior-fix guard:** D207, D188, D169, D194/E3 (turn-cost warning), D173 and D152/D153, plus `UndoRestoreSync` (the byte must be restored before any resync).

## R4 (codex #2303 accepted: R3 withdrawn, since META skips authored before-hooks and is not neutral; no memory mutation)

**Output provenance by the turn boundary, one deterministic rule for every module:**

1. **The boundary.**
   - The game's own turns global is already located and confirmed by RAM observation (D152/D153 `promoteGlobals` / `readConfirmedGlobals`).
   - During a probe span, the engine output tap (`StatTracker.tapEngine`, the existing per-instance Glk `put_*` wrapper) records, for each chunk of output, whether the turns global still held its pre-submit value when the chunk was printed. This is a single memory read per output call, only while a probe span is owned.
   - Inform's main loop prints the action's reply first, then runs the end-of-turn sequence (turns advance, then daemons, timers, each_turn and NPCs). So output **before** the turns global changes is the command's reply, and output **after** it is the turn's events.
2. **Release:**
   - Lines whose text came entirely from before the boundary are reply and stay hidden, whatever their wording, paragraphs or headings: no lists, no families.
   - Lines from after the boundary are events: shown and spoken (D207 "show the attack").
   - If the turns global never changes during the span (no turn passed), the whole span is reply.
3. **Fallback:** if no confirmed turns global exists for the game, or the engine cannot be tapped (Glulx), the current D207 release plus codex's continuation fix applies, with no new lists.
4. **No game behaviour change:** nothing is written to game memory; the game runs its normal hooks and turn.

**To verify before implementing (codex, attack points):**
- that the turns global changes before daemon output in the Inform library versions present (6/10, 6/11, 6/12; the PunyInform `turns` handling);
- the ZIL equivalent (moves, `CLOCKER`): where the Infocom move counter increments relative to the interrupt output;
- a turn ending at "(press a key)";
- output buffered across Glk calls versus line attribution;
- the chunk-to-BufferLine mapping (span lines are DOM; the tap sees text in order), mapped by order and text.

**Tests:**
- unit: tap-order attribution with a turns change mid-span (reply hidden, event shown); no change (all hidden); no global (fallback);
- live: wump2ka carry summary hidden with no list entry for it; an attack after the boundary shown; Treasures; Anchorhead; HHG; one ZIL sample; `death-terminal.js`; stat-tracker.

## R5 (codex #2305: the default-library order is confirmed in Inform 6.12.2 parser.h 4757-4764/4922 and PunyInform puny.h 2409-2429)

1. **Library-order qualification.**
   - The boundary rule is the **default Inform/PunyInform turn order**, recorded as such and not claimed to be universal.
   - **Residual A:** an authored before, after or react hook that prints during the probe's own action is classed as reply and hidden. It exists only because the probe ran, so hiding it keeps the probe invisible.
   - **Residual B:** a game that replaces its end-of-turn sequence so that events print before turns advance would have those events hidden.
   - Both residuals are documented in D207/D215; neither gets a per-title fix.
2. **Streams.**
   - The tap attributes only output whose target is the **main story buffer window's stream**: the current stream when it is that window's stream, or an explicit stream argument equal to it.
   - Status-window, transcript, memory and file streams are ignored.
   - `glk_put_jstring_stream` and the other `_stream` variants are tested on the stream argument.
3. **Mixed lines.**
   - Attribution is per character range, not per line. Each tap chunk carries its phase (reply or event) and text.
   - When a BufferLine contains both, release wraps the reply characters in a `pl-stat-probe` span (hidden, aria-hidden) and leaves the event characters visible. It never reveals the whole line. This is done by walking the line's text nodes in order against the chunk sequence.
4. **Unknown and unmapped:**
   - a line or range whose text cannot be matched to tap chunks (order-preserving text match fails) **stays hidden** when the span had a confirmed boundary;
   - the whole span uses the D207 fallback only when no boundary information exists (no confirmed turns global, or the engine is untapped);
   - unmapped never means visible.
5. **Pause and abort bounds:**
   - Phase tracking starts at probe submit and ends at `endProbeOwnership`.
   - A turn that ends at "(press a key)" keeps its phases across the pause within the same span (the existing `_carrySpanOwned` continuation); a char-input answer by the player ends it.
   - Restore, restart, undo, `clearCarryProbe` and a new player submission clear the chunk log.
   - The chunk log is capped (4096 chunks or 256 KB). On overflow the rest of the span is treated as "boundary unknown", and point 4 keeps it hidden.
6. **ZIL:**
   - Applied only after the codex review confirms that the move counter advances before the CLOCKER interrupt output.
   - Until then, ZIL keeps the current D207 release plus the continuation fix.
