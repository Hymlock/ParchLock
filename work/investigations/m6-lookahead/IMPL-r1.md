# M6 IMPL r1 (claude) - get-out prefix on tapped compass moves while seated

## Prechecks (native play.html, seeded as regression-gate.cjs)
- (a) HHG in bed (player parent 114 "bed", room 150): the bed's long-press radial shows only
  Examine / Unlock with... / More. "get out of bed" is NOT on the primary ring (More not expanded).
  ActionSynth.commandsForObject({id:114},'room') returned []. So D236's get-out offer is not
  visibly reaching the HHG bed radial; separate follow-up, not fixed here.
- (b) HHG bed attrs (exact-digest attributeMap): enterable=28=VEHBIT true, container+supporter true.
  ZIL has no bit separating a vehicle (Zork I boat) from furniture (bed): VEHBIT IS "enterable".
  No decoder in the repo emits a `vehicle` attribute (Inform has none either). Consequence: the
  "not a vehicle" clause can only exempt a parent whose decoded attrs.vehicle is true, which today
  never happens. Rule as implemented therefore = "measured parent != room, parent directly in the room".

## Rule (Actionable.seatedExitForm)
- Player resolved, parent known, enclosingRoom known, parent != room, parent's own parent == room,
  attrs readable and !attrs.vehicle. Anything unknown -> null (plain move).
- ZIL: "get out of <noun>" (D236 form, gated like D236 on literalAvailable("get out")); noun = the
  object's short name when all its words are dictionary words, else its last word if a dictionary
  word, else null.
- Inform: "exit" if literalAvailable, else "get out", else null.
- Actionable.SubmitTapMove(cmd): sends the form via Actionable.Submit, polls until the line input is
  back and the player parent == room, then submits cmd. r1b (main-seat decision, missing > wrong):
  parent still the carrier after 1.5s (refused) -> the move is sent anyway and the game decides; the 8s
  cap and any read error also send the move. Zork I boat on the river keeps steering by direction.
- Wired: Map.js exit chips, MapBeautify.js compass buttons, DirectionalRadial.js release + Enter,
  Actionable direction links (.pl-act kind=direction) and "Go X" radial slices. Navigator.Pump sends
  the form once per route before the first step (Awaiting keeps the same room). Typed input untouched.

## Tests
- harness/m6-seated-move.js: ALL PASS. HHG real exit chip in bed -> ["get out of bed","s"], parent
  -> room, game attempts the move (no "get out of the bed first"); standing taps send only "s" and
  (after the walkthrough gown/analgesic steps) move you out; typed "south" in bed unchanged; Zork I
  West of House control -> ["n"], no form; r1b constructed refusal (stubbed form, parent unchanged)
  -> ["wait","s"], move still sent.
- Vehicle case not tested: no decoded vehicle exists (see b). Zork I boat WILL now get "get out of boat"
  before a tapped move; on land that matches the game ("You can't go there in a magic boat"), on the
  river the game refuses the get-out and the move is still sent (r1b), so steering works.
- node harness/operator-regressions.js: 13 PASS / 0 FAIL (re-run after r1b: same).
- node harness/zil-enter-forms.js (D236): 7 checks passed.
- regression-gate GLULX=1 GAMES=Hitchhik,Zork1,Advent,break-in,Alabaster.gblorb; base = git archive
  HEAD (js css img lib vendor play.html + 5 games): 0 differences.

## Notes
- Bus claim failed (harness "operation aborted" twice); edits made unclaimed. Not committed.
- js/StatTracker.js, ZvmCapture.js, ZRamReader.js untouched.

## r1c (REVIEW-impl.md REVISE)
- One pending tap (Actionable._tapPending). A tap during the wait replaces the move: no second
  get-out, only the latest move is sent. Cancelled (timer cleared) by any other accepted command
  (TurnRecorder accepted-submit hook; the tap path's own submits are flagged _tapSubmitting), by
  Navigator.EnqueueRoute (the route start; there is no Navigator.Start), and by a room change
  (enclosingRoom differs from the room at tap time).
- Skip after refusal: a refused get-out records the parent (_tapRefusedParent, page/story session).
  Later taps while the parent is still that object send the move with no prefix; the memory clears
  as soon as the parent differs. Implicit-get-out titles waste at most one turn per parent.
- Poll exceptions retry until the 8s cap (the move is sent at the cap).
- Missed tap path wired: Input.CaptureMovement (Ctrl+Shift+Up/Down compass shortcut) now goes
  through SubmitTapMove. Grep found no other direct Submit with resolveExitCommand/commandForExitLabel.
- Harness additions (all PASS): refused parent gets no prefix on the next tap (["up"]); double tap
  -> ["wait","west"]; typing "look" during the wait -> ["wait","look"], move cancelled.
- Re-runs: m6-seated-move ALL PASS; operator-regressions 13 PASS / 0 FAIL; zil-enter-forms 7 passed.

## r1d (Re-review REVISE: Navigator blocker)
- Navigator.Pump: the seated get-out submit is now wrapped in Navigator.Submitting = true try/finally,
  the same guard the route step uses, so the accepted-submit hook no longer clears the route queue.
- Input.CaptureMovement: Input.Clear() restored before the Ctrl+Shift+arrow move (then SubmitTapMove).
- Harness case 6 (Zork I, stubbed seated form "wait"): Navigator.EnqueueRoute(["e"]) sent
  ["wait","east"]; route finished, not interrupted. Only a one-step mapped route was available from
  that room (no learned back edge), so this shows the queue survives the get-out and the step runs.
- Re-runs: m6-seated-move ALL PASS; zil-enter-forms 7 passed; operator-regressions 13 PASS / 0 FAIL
  on both runs.
