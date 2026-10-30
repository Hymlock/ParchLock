# r45: Suspended + Hitchhiker U cells (claude, 2026-10-30)

Batch: `apply-r45.cjs` (prepared, NOT applied; dry-run on a scratch copy of js/ModuleStatFactsClaude.js: 7 edits, no collision, parses).
Evidence: `claude-probe/r45/`. Runner: `grok1/batch/g1-batch.cjs run` (test_attr recorded only during the named command; JSEED replay).
Plans `plan-sus*.json`, `plan-hh*.json`; routes `route-suspW.json` (robot travel + waits), `route-hg7.json` (hhgg route with
WAITUNTIL for Ford's device: the stock route's fixed waits now die on Earth); results `run-*.json` / `log-*.txt`.
Source checked at historicalsource/suspended and /hitchhikersguide HEAD.

## Suspended.z3.js

Actor scope: the player (FC) can't see anything itself. Bare commands answer "Visual scanners cannot see any X here" with no
attribute test (`get in vehicle`, `open basket`, `look in home`). Every probe below is robot-addressed (`waldo,` `sensa,` `whiz,`).
The app has no robot-prefix support, so these facts give correct object state (contents, open, surface), but a bare radial verb
fails for every Suspended object. That was already true of the accepted wearable/on/moved/concealed facts.
Iris probes are excluded: she's blind, so the game's answer is about scope, not the object.

| cell | status | reason |
|---|---|---|
| container | S 19 | CONTBIT exact 13/13. Native TRUE: HOME 81 ("The electrical column is closed."), cabinet 62 ("The hollow object is closed."), groove 45 (contents listed), BLT 37. FALSE: ramp 64 ("I don't know how to look inside a dens..."). Robots carry 19+8 (+VICBIT 24): they hold items, so container is semantically right for them. |
| supporter | S 11 | SURFACEBIT exact 3/3 (compiled carriers also include the BLTs and grooves). TRUE: BLT 37 ("There is nothing on the walkway."), groove 45 ("Sitting in the groove are..."). FALSE: cabinet 62, Poet 146. |
| open | S 8 | OPENBIT exact 6/6. TRUE: BLT 37, groove 45. FALSE: cabinet 62 ("It's already closed."), HOME 81 ("...is closed."). |
| isOpen | S 8 | Same bit and evidence as open (shared-bit pair, as in other titles). |
| openCapability | S, FAIL-CLOSED `{all:[container], none:[supporter, animate]}` | No CONTBIT carrier accepts container Open/Close natively. waldo,open cabinet: "I don't detect any easy way to do that". Close on BLT/groove: "Not a likely occurrence within reality, no?". sensa,close poet: "I don't think he would like that". animate is unmapped (ledger NA, ACTORBIT 0 carriers), so the predicate is false for every object (#3642 pattern). Containers keep search/look-in but never get Open/Close. Possible follow-up: VICBIT 24 (robots) as animate would re-enable Open/Close for real openables such as panel 80 (`waldo,open panel` in the walkthrough). That would overturn the animate NA, so it is out of scope here. |
| enterable | NC | VEHBIT 28 has a single owner (vehicle 58, source objects.zil:595, compiled 1/1). There is no native positive: Poet is stuck at Hallway Junction ("I can't get from Hallway Junction to Sloping Corridor"), so the car can't be reached in a lean route. Negative: sensa,get in home 81:28=0. Also, the FC never boards; only robots do, and the app's bare "enter" would always fail. |

## Hitchhik.z5.js

| cell | status | reason |
|---|---|---|
| enterable | S 28 | VEHBIT census: bed 114, GLOBAL-BED 166 (a local-global proxy that PERFORMs on BED), pilot seat 49, poetry appreciation chair 164. All are seats or beds, none is a room. `ENTER X` = V-THROUGH -> BOARD on VEHBIT (verbs.zil:1957). Native: get in bed 114:28=1 ("You are now in the bed."). FALSE: gown 206 ("You can't get into your gown!"), jukebox 98. Second native positive not reached (the chair needs the Vogon poetry scene, which the probe route missed), so the claim rests on the exact source census plus native behaviour. |
| switchable | S 32 | SWITCHBIT census exact 3/3: dipswitch 143, generator switch 96, case switch 134. All are devices, none is a room, and each action routine handles LAMP-ON. Native: switch on switch (134, RAM bit 32 set) plays the case recording. Switch on gown (32 clear): "You can't turn that on." The game never test_attrs bit 32 for switch on/off (V-LAMP-ON tests LIGHTBIT), so the basis is census plus native behaviour. Note: "switch off" is refused for 134 and 96 ("You can't turn that off."). That is a harmless wrong option (missing-over-wrong). |
| on | L:NC | ONBIT 45 is the room-lit bit (localScope roomLitAttribute 45). 24 carriers are rooms; the only non-room carriers are jukebox 98 and Eddie 52. Native: switch on jukebox 98:45=1 "It is already on."; switch off jukebox "You can't. It's not yours." No routine FSETs or FCLEARs ONBIT on an object (only `FSET ,HERE ,ONBIT` at globals.zil:205). Mapping on=45 would mark rooms as switched-on devices and offer no working toggle, so it fails closed. |
