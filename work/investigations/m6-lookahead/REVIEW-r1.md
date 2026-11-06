# M6 FINDINGS review R1 (claude, adversarial stand-in)

Verdict: **REVISE, toward a smaller fix.**

1. Existing behaviour. D236 (js/ActionSynth.js:700-728) already does this for ZIL titles: when the measured
   player parent is the object, Enter is dropped and Exit becomes "get out of X" (if the dictionary has
   "get out"). HHG is ZIL, so the bed's radial should already show "get out of bed", provided the bed is
   classified enterable. That part is unverified (see 4). So the gap is only on the map/radial *compass*
   moves: they are emitted while seated (probe2: out/down/south identical in bed and standing), and the
   game refuses them ("You'll have to get out of the bed first."). Nothing about the get-out offer is missing.
2. Learning from refusal text is prose mining. It conflicts with the D24 honest-absence and no-masking rules,
   and unlike AttrCalibrator/LearnedWords it would key on one sentence that each game words differently.
   A structural rule exists: ZIL V-WALK and the Inform library both refuse a move when the parent is not
   the room and is not a vehicle (ZIL VEHBIT; Inform enterable without a vehicle rule). The app already
   measures the parent (D222/D236) and reads attributes, so "parent != room && !vehicle" decides it from
   the game's own data, with no learning and no first-time failure.
3. Smallest player-visible fix: when the measured parent != room and is not a vehicle, a compass tap from the
   map/radial sends the D236 get-out form and then the move (two commands). This removes a refused move
   without hiding any option. Do not drop the compass options: missing ones are worse than wrong ones.
   playerContainer {id,name} in the payload is fine as the carrier for that rule. Drop needsExitFirst-by-refusal.
   Inform: D236 is ZIL-only. Use "get out" or "get off X" from the grammar, not "get out of X".
4. Native HHG Playwright check: NOT run in this review. probe2 (seeded) already shows the refusal text and
   unchanged exits while in bed. Still open before implementing: confirm that the bed radial offers
   "get out of bed", and check the HHG bed's vehicle bit (it must be clear).

Prior-fix guard: D236, D222, D57/D58 room resolution; harness/operator-regressions.js and regression-gate.cjs.
