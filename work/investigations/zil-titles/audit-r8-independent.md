# Independent audit of batch-r8.diff (claude reviewer, standing in for codex), 2026-10-24

Read-only and bounded. No runs were made; this is based on the evidence JSONs and the current code.

## Checks common to all four titles
- (7) `AttributeSchema.openCapability()` (js/AttributeSchema.js:117-124) requires only `Array.isArray(cap.all) && Array.isArray(cap.none)`, so `none: []` is accepted. With `none: []`, `openCapabilityAllows` (127-143) skips the loop and returns true whenever `container` is set. OK.
- Bit numbers: every per-title JSON `sourceBits` entry is exact with fp=0 and fn=0 (Suspect CB16 33/33, OB13 36/36, PERSON31 10/10; Stationfall CB25 31/31, OB15 16/16, AB31 4/4; LGOP CB24 22/22, OB15 18/18, AB31 10/10; Suspended CB19 13/13, OB8 6/6, no actor). The walk bits match where they exist; Suspect has `walkBits: null` ("no walk entry"), so the diff comment needs no change there. There are no attributeMap collisions in any row: Stationfall light 24 and container 25 are distinct, and Suspended wearable 31, on 2, container 19 and open 8 are distinct.
- **Main finding, which affects all four titles.** Mapping container and open makes `canSeeInside` (AttributeSchema.js:725-727, `container ? open||transparent : supporter`) true for every object that has CB+OB. The room scope walk then recurses into those objects at js/ZRamReader.js:2484 (`if (d > 0 && ZRamReader.canSeeInside(attrs)) walk(...)`). That ordinary child path has **no animate guard**: the animate guards at 2463 and 2830 cover only the unnamed-wrapper bypass. So any NPC, robot or player body that carries CONTBIT+OPENBIT and is a room child will now have its possessions surfaced as room-visible objects (underlines and radial targets). The `openCapability` `none:["animate"]` setting only gates Open/Close offers. It does not gate scope.
  - Before this diff the behaviour was different. In LGOP, open 15 was already mapped but container was not, so canSeeInside fell back to `supporter` (17). In the other three titles nothing was mapped. This is a new D57-class exposure.
  - ActionSynth.js:427 (`if (pa.animate) return false;`) blocks one consumer for animate ancestors. It does not help Suspended, where the robots are not animate.

## Per title

### Suspect (d02fd95b): OBJECT, conditional
- Bits are sound (JSON sourceBits, toggles gunbelt 96 OB 1->0->1, fireplace, notebook negative).
- A new `animate: 31` is consumed by ActionSynth.js:14 (offers "talk to"; characters can be talked to, so this is correct), ActionSynth.js:369/374 (Take on actors is suppressed, which is correct), and the ZRamReader location/room guards at 1698/1781/2123 (these exclude actors from being treated as rooms or locations, which is correct). Before acceptance, the D57 wrapper guards (2463/2830) must be checked against the reporter: if the unnamed or player body 99 now reads animate, it is no longer tunnelled. That is the intended D57 behaviour, but it should be confirmed that inventory does not root through 99 via the wrapper path.
- Point (4): WorldModel playerId=98 "yourself" while the moving body is 99 "reporter" (Suspect.json notes). If 99 carries CONTBIT+OPENBIT, then 99's carried inventory is recursed into from the room at ZRamReader.js:2484, because the stops/resolvePlayer exclusion exists only in ActionSynth:420-ish and not in the room walk. As a result, the player's own items would be listed as room objects. The diff comment says "Actors carrying CONTBIT (Alicia, Veronica's body)" but does not report OPENBIT on those actors or on 99. That claim is not backed by the JSON, whose steps record only CB/OB for objects that changed.
- Required: dump the initial-memory bits 16, 13 and 31 for 98, 99 and every PERSON carrier, and show that none has 16+13, or else add an animate/player guard on the 2484 recursion (a scope change, which needs its own proposal). Also run the operator-regressions and three-type gate.

### Stationfall (3c565689): OBJECT, conditional
- Bits are sound (JSON plus walk CB25/OB15/AB31).
- Point (5): player 218 "it" goes OB 0->1 on turn 1 (Stationfall.json step "close uniform"). 218 lacks CB 25 (`"CB": 0`), so canSeeInside stays false and openCapabilityAllows fails on `all:["container"]`. There is no effect from the new mapping, and `isOpen` on a non-container is unused by these gates. Harmless.
- Floyd and Plato carry CONTBIT according to the comment. If either also has OB 15, Floyd's carried items become room-visible through 2484. The comment says "excluded by animate 31", which is true for Open/Close only.
- Required: same as Suspect. Show the initial OB 15 status for the 4 ACTORBIT carriers (and for Floyd after he picks something up), or guard the recursion.

### Leather Goddesses (103324c3): OBJECT, conditional
- CB 24 is sound (22/22, walk CB 24). The tray and basket positives come from the JSON notes. The "close on lidless basket" comment matches status ("basket lidless but bit set").
- This title has the same scope exposure: Trent 48, the gorillas and the salesman carry CB 24, and OB 15 was already mapped. Any of them with OB 15 now exposes its contents in the room. Required: the same actor-bit dump or guard.

### Suspended (6011284a): OBJECT
- Bits are sound, but OPENBIT is PARTIAL (one native toggle on the Iris panel 80). The machine and cabinet agree only in the closed state.
- Point (6): the JSON states "All six robots carry CONTBIT+OPENBIT", and no actor bit exists. The consequences are:
  - Open/Close is offered on every robot. This is not "harmless": the game refuses it, and it is a wrong radial offer on the main characters in every room the player views. Per the no-masking and radial-first rules, a wrong offer is a defect, and calling it a "disclosed extra" does not make it acceptable.
  - canSeeInside is true for every robot, so ZRamReader.js:2484 surfaces each robot's carried items (for example Waldo's grasper, ICs, the basket) as room objects with no animate guard. Robot inventory in this game is the player-visible "what is the robot holding" state. Mixing it into room scope changes underlines and radials across the whole game.
- Required: do not ship `none: []`. Either find a structural robot discriminator from the game's own data (for example, robots are the cryolink targets or have an action property), map it as animate, and use `none:["animate"]` plus a scope guard, or hold Suspended out of this batch.

## Summary
- (7) The schema accepts `none: []`.
- Bits and collisions are clean on all four titles.
- Blocking: the container+open mapping turns on recursion through ZRamReader.js:2484 into any CB+OB actor, and this is not gated by animate. Suspended is certainly affected (6 robots, per its own JSON). Suspect, Stationfall and LGOP are unverified, because the diff comments claim actor exclusion, but that exclusion covers only Open/Close.
- Before acceptance: an initial-memory dump of the actor and player bits per title, or an agreed scope guard, followed by `node harness/operator-regressions.js` and work/investigations/regression-gate.cjs with the room-object diff reviewed for these four titles.

## Claude disposition (2026-10-24)
Initial-memory dump (actors with container+open and their starting children):
- Suspect: Veronica's body 89 [silver bullet, vital signs, hair]; 246 is the topic holder (never in a room).
- Stationfall: Floyd 26 [], Plato 247 [volume of poetry]; 57 is the global holder.
- LGOP: gorillas/your body/15/48/90 [], salesman 224 [odd machine]; 54 is the global holder.
- Suspended: six robots carry 19+8, Iris 158 [panel].
Decision: ACCEPT exposure of actor-held items for Suspect/Stationfall/LGOP as native scope (Infocom gives actors
CONTBIT+OPENBIT precisely so their visible possessions are parser-searchable; each listed item is referable in-game),
disclosed in D-entry; Open/Close on those actors stays excluded via animate. Suspended DROPPED from r8 (robots would get
Open/Close the game refuses; no actor bit to exclude them). No room-walk guard change in this batch.

## Round 2 (independent reviewer, 2026-10-24)

I tested the "native scope" argument against the source in C:/Users/hymlo/AppData/Local/Temp/hs-src. The argument holds.

- `SEARCH-LIST` behaves the same way in all three games: suspect/historicalsource-suspect-a18e100/parser.zil, and parser.zil for stationfall-5d05d5e and leathergoddesses-17cbbc1.
  - At any level other than P-SRCTOP, it recurses into any child that has contents and has `OPENBIT`, `TRANSBIT` or P-MOBY-FLAG set. Nothing tests ACTORBIT or PERSON.
  - Suspect excludes only `,PLAYER ,LOCAL-GLOBALS` from that recursion. Stationfall and LGOP exclude nothing.
  - The room is searched at all levels: `DO-SL ,HERE ,SOG ,SIR` at suspect parser.zil:1116. The grandchildren then get P-SRCTOP unless the actor has SURFACEBIT or SEARCHBIT. So native scope reaches exactly the actor's direct possessions.
- Native verbs treat those items as legitimate targets. Suspect's `PRE-TAKE` (verbs.zil:1953-1963) explicitly redirects TAKE of an item whose LOC has PERSON to `PERFORM ,V?TAKE ,PRSO .P`, which is take-from-person. It refuses only closed non-PERSON containers. Stationfall and LGOP `PRE-TAKE` (Stationfall verbs.zil:1864, LGOP verbs.zil:2185) gate on `LOC-CLOSED` and `UNTOUCHABLE?`, not on actorhood.
- Conclusion: an item held by an open-CONTBIT actor is natively in scope, so it is a correct radial target for Examine, Take (from) and so on. The wrapper surfacing it is faithful, not masking. The one difference is depth. Native scope stops at the actor's direct children, while ZRamReader.js:2484 keeps recursing through any open container the actor holds. The native recursion does the same for an open, non-SRCTOP object, so this difference is consistent and needs no fix.
- Residual requirements, all non-blocking:
  1. Suspect PLAYER exclusion: the coordinator's dump says "your body empty". It must also be confirmed that 99 "reporter" (the moving body) is not reached as a room child carrying CB 16 + OB 13 in later play. If it is, its inventory is natively excluded (PLAYER) but would be shown by the wrapper. Note this in the D-entry and add a guard if it is ever observed.
  2. Run `node harness/operator-regressions.js` (0 FAIL) and work/investigations/regression-gate.cjs, and mark the newly visible actor-held items as INTENDED.

Verdicts:
- **Suspect: ACCEPT**, subject to requirements 1 and 2.
- **Stationfall: ACCEPT**, subject to requirement 2.
- **Leather Goddesses: ACCEPT**, subject to requirement 2.
- **Suspended: dropping it is agreed** (its objection is unchanged).
