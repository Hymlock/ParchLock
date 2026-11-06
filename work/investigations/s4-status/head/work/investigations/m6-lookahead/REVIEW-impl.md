# M6 implementation review (adversarial, stand-in seat) -- REVISE

Scope: git diff of js/Actionable.js, Navigator.js, Map.js, MapBeautify.js, DirectionalRadial.js + harness/m6-seated-move.js.

## Harness runs (current checkout)
- harness/m6-seated-move.js: ALL PASS
- harness/operator-regressions.js: 13 PASS / 0 FAIL
- harness/zil-enter-forms.js: 7 checks passed
- Native Zork I boat on the river: NOT run (not done in this review).

## Blocking findings
1. **Double tap leads to a double get-out and a double move.** SubmitTapMove has no in-flight guard. A second tap
   before the game has processed the get-out still reads parent==bed. It sends a second get-out and starts a second
   poll, and each poll then sends the move. Result: get-out, get-out, n, n. Fix: one module-level pending
   record. While it is set, a further tap is dropped, or it replaces the queued command without a resend.
2. **Stale move after typed input.** If the player types a command during the 300-8000 ms wait, the poll still sends
   the tapped move afterwards, perhaps from a different room or after the player has deliberately stayed seated.
   Fix: cancel the pending move on any user Submit or line input. Also cancel it when the room or turn changes
   to anything other than the expected outcome.
3. **Navigator route while a tap is pending.** Navigator.Pump calls seatedExitForm independently and sends the
   get-out with system-navigation. The tap's poll then fires its own move into the route, so the steps interleave.
   The same pending guard (cancel on Navigator.Start) covers this.
4. **Zork I boat on the river costs a harmful turn.** ZIL has no vehicle bit (IMPL-r1 b), so the boat qualifies. On
   the river the game refuses "get out of boat", but the refusal still spends a turn while the current carries the
   boat. Frigid River leads toward Aragain Falls, so a wasted turn per tap moves the player toward a death. Add a
   narrow exemption from the game's own data. Option (a): skip the prefix when the parent object is the source of
   the room's movement, for example when the room is non-land/RIVER flagged. Option (b): skip it when the parent
   has VEHBIT and an action routine handling WALK. Failing those, (c) make the second and later taps in the same
   seated state skip the prefix after one refusal. That is not masking: it is learning the refusal.

## Non-blocking
- "(first getting off...)" implicit-exit games: one extra turn per tap. This is acceptable for furniture, since the
  move still happens. It is not acceptable for timed sequences. Mitigation (c) above, learning from a refusal or
  an implicit-exit message once per parent, keeps the cost to at most one turn.
- Non-furniture parent: the parent must sit directly in enclosingRoom and parent!=room, so a room-as-parent
  (D222 odd titles) returns null. That is correct. A vehicle-room in an object (a nested chain) also returns null. OK.
- Coverage: exit chip, Go slice, directional radial (pointer + keyboard Enter), Map.js dir-name, MapBeautify
  non-cardinal buttons are all wired. Not checked: any keyboard compass shortcut that calls Actionable.Submit
  directly. Grep `Submit(.*resolveExitCommand|commandForExitLabel` before re-review.
- Navigator Awaiting with dir:null: Pump compares current.Id===target (same room), so this is fine. A refused
  get-out lets the step run, as designed.
- The catch path in poll calls Submit(command) immediately on any exception, which could send before the game is
  ready. Prefer a retry until the cap.

Verdict: **REVISE** (findings 1-4).

## Re-review (r1c) -- REVISE (one blocking bug, a one-line fix)

Runs:
- m6-seated-move: ALL PASS, including the new double-tap, typed-cancel and refused-parent cases.
- zil-enter-forms: 7 passed.
- operator-regressions on the working tree: the first run gave 11/2 FAIL and a re-run gave 13/0. That is flaky,
  and the working tree also carries the S1 lane.
- Focused gate, GLULX=1, on Hitchhik, Zork1, Advent, break-in and Alabaster. Base was a git archive of HEAD.
  Candidate was HEAD plus Actionable, Navigator, Input, Map, MapBeautify and DirectionalRadial, with StatTracker
  confirmed identical to HEAD. Result: **0 differences**. The scratch trees are in the session scratchpad.

Findings 1-4 against r1c:
1. Double tap: closed. A single _tapPending is replaced, never resent, and finish() checks identity.
2. Typed input / room change: closed. The TurnRecorder.onAcceptedSubmit listeners run synchronously inside
   Submit, so the _tapSubmitting try/finally flag is race-free (single-threaded, set and cleared around the
   synchronous call). The room-change check runs before the parent checks. A stale timer is harmless: the poll
   returns once _tapPending !== pending.
3. Route: closed on the tap side. EnqueueRoute calls cancelTapMove, and any route step Submit also cancels it
   through the hook.
4. Boat on the river: mitigated by skip-after-refusal. That costs at most one turn per parent, which I accept as
   option (c). The memory clears when the parent changes.
Non-blocking: poll retry (closed); Ctrl+Shift compass now goes through SubmitTapMove (closed). Minor: that path
no longer calls Input.Clear(), so partially typed text is left in the line. Check that this is intended.

**New blocking bug (Navigator.js, the M6 block in Pump):** the route's seated get-out is sent through
Actionable.Submit WITHOUT Navigator.Submitting = true. TurnRecorder.onAcceptedSubmit does
`if (Navigator.Running && !Navigator.Submitting) Navigator.ClearQueue()`, so the route's own get-out kills the
route. The player gets out of the bed and the route never moves. The normal step path (around line 175) sets the
flag; the M6 block must wrap its Submit the same way, with try { Navigator.Submitting = true; ... } finally
{ false }. Add a harness case: a route started while seated sends the get-out and then the first step.
This bug was already present in r1; I missed it in round 1.

Verdict: **REVISE**. Accept once the Submitting wrap and its harness case land; nothing else is outstanding.

## Claude (main seat) closing check of r1d
The Navigator Pump seated get-out is now wrapped in Navigator.Submitting = true try/finally, matching the route-step guard the re-review required (the only remaining blocker). Input.Clear restored for Ctrl+Shift+arrow. m6-seated-move ALL PASS (new case 6: route started while seated sends the get-out, then its step), zil-enter-forms 7, operator 13/0 twice. Re-review findings 1-4 were already closed; focused gate 0 diffs. Accepted for commit.
