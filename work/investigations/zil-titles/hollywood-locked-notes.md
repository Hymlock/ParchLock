# HollywoodHijinx.z3.js `locked` - verdict S (locked = 15)

claude 2026-10-30. Read-only probe; no js/ edits, no commits.

## Source (historicalsource/hollywoodhijinx @ e93d08596db4297d46f3ac0065a546d27f036e74)
- LOCKEDBIT exists; source-flags: bit 15, 8/8 tp, fp 0, exact.
- Object carriers: OAK-DOOR (outside.zil:989, DOORBIT), PATIO-DOOR (outside.zil:182, DOORBIT),
  ATTIC-DOOR "panel" (elevator.zil:846, DOORBIT), WALL-SAFE (first-floor.zil:1381, CONTBIT),
  BS-SAFE "safe" (bshelter.zil:919, CONTBIT).
- Room carriers (meaning "door can be locked/unlocked from here", read via `FSET? ,HERE ,LOCKEDBIT`
  in V-LOCK/V-UNLOCK verbs.zil:1368-1382, 2753-2766): Foyer, Game Room, Bomb Shelter, Attic, hedge-maze
  room (Patio side). RAM also shows bit 15 on ids 69/246/247/254 (unnamed/out-of-table rows; not items).
- Game writes: FCLEAR OAK-DOOR on statue click (first-floor.zil:160); V-UNLOCK FCLEAR / V-LOCK FSET
  (verbs.zil); ATTIC-DOOR FCLEAR when pulled from the attic (elevator.zil:856); safes FCLEAR on correct
  combination and FSET on close (bshelter.zil:959/993, first-floor.zil:1416/1442).
- V-OPEN tests it live: "You'll have to unlock it first." (verbs.zil:1600; the `; "Locked"` comments
  out only the label string).
- DEXIT use: OAK-DOOR (Foyer S, Front Porch N/IN `IF OAK-DOOR IS OPEN`); PATIO-DOOR (outside.zil:148,
  hedgemaze.zil:13). ATTIC-DOOR has no `IF ... IS OPEN` exit. Safes are containers (D5 status/Unlock).
- Auto-unlock: none on movement (unlike Moonmist). The statue click is a real remote FCLEAR the RAM
  read follows; walking into a closed DEXIT door is refused regardless. No false D246 pause: a locked
  fact pauses only where the game itself requires UNLOCK/statue first. UNLOCK SAFE replies
  "Perhaps if you had the combination..." - harmless (Unlock offered, game refuses).

## Native evidence (run-attrs.cjs, fresh unforced commands, passive RAM reads; sourceStable true)
- Positive 1 (oak door 117): Front Porch `open door` -> "You'll have to unlock it first." 15=1;
  `unlock door` -> "You can't unlock it from this side." 15=1; `turn statue north` -> "...hear a click
  from off to the north." 15: 1->0; `open door` succeeds.
- Positive 2 (oak door 117, from Foyer 122 which carries 15): `close oak door`, `lock oak door` ->
  "You lock the oak door." 15: 0->1; `unlock oak door` -> "With a click you unlock the oak door." 15: 1->0.
- Static carriers at start with 15=1: 25 patio door, 117 oak door, 175 panel, 203 wall safe, 227 safe.
- Negative: hatch 155 (DOORBIT) 15=0 throughout; start room 1 15=0.

## Apply (append to apply-r46.cjs style script)
```js
addMap('HollywoodHijinx.z3.js', 'locked', 15, 'locked 15 = LOCKEDBIT (source exact 8/8; native zil-titles/hollywood-locked/hw-locked-run*.json): oak door 117 reads 15=1 and OPEN DOOR says "You\'ll have to unlock it first."; TURN STATUE NORTH clicks it 1->0; from Foyer LOCK OAK DOOR 0->1, UNLOCK OAK DOOR "With a click" 1->0; hatch 155 (door) 15=0. Patio door 25, panel 175, safes 203/227 also carry it. Rooms carrying 15 mean "lockable from here" (verbs.zil V-LOCK/V-UNLOCK). No movement auto-unlock; D246 pause needs locked AND closed.', 'LOCKEDBIT', true);
```
Bit 15 is unused in the current Hollywood attributeMap (no collision).

## sha256 manifest
```
e819e250483249fa1020f4bdb128d3376782cdfd9b3a94ba4b92eca2487f0cc8  work/investigations/zil-titles/hollywood-locked/hw-locked-cfg.json
d688d8f06796678cba3ccdeaf848fb7d2731d0a5cc8f41322d4345c147d980da  work/investigations/zil-titles/hollywood-locked/hw-locked-cfg2.json
cd2830b9833431f25bc50814e260faf8fb1c5317a983f7e661f0fd0d19b51f3a  work/investigations/zil-titles/hollywood-locked/hw-locked-run.json
9813a93a09838a5c6d67f5027ea07be4f00e090524de05ccf67c249f0a4f865c  work/investigations/zil-titles/hollywood-locked/hw-locked-run2.json
1067babf4f185c6c9579ce714412886d83de8410bf4a5a7212b236d96153f495  games/HollywoodHijinx.z3.js
5b114d0f4c1f0b61b56db3f5bdbdd9d8ae51014f17e15b2aa6a91f49b41c5784  js/ZRamReader.js
9c604fdea22e9f52e58f1cdb1329a8dcbe20d39b21dc4407bba0e01497617d68  js/ModuleStatFactsClaude.js
19e047ffbaa48fbcf34305590616c78eaacc851f2de0947f778243d35903ca66  work/investigations/2026-10-11-zil-source-flags.json
765113aaa867313bc437a3152f5ec5b060ff757bd8e92c2048b7b14db9904a5d  work/investigations/claude-probe/hollywood-d12/run-attrs.cjs
```
