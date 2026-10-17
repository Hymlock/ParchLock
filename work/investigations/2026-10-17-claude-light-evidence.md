# Light-bit evidence (claude, 2026-10-17)

## Source census

`historicalsource`, `(FLAGS ...)` carriers / runtime `FSET`, by title:

- LIGHTBIT carriers:
  - 0: Border Zone, Cutthroats, Deadline, Infidel, Seastalker, Spellbreaker, Starcross, Suspended, Wishbringer.
  - 1: Sorcerer, Lurking, Witness, Zork II.
  - 2 or more: Zork I 3, Zork III 4, Ballyhoo 4, Hollywood 4, LGOP 3, Moonmist 2, Planetfall 3, PH 3, H2G2 7,
    Stationfall 12, Enchanter 32.
- ONBIT: 25-124 carriers per title, mostly lit ROOMS.
  - `on = ONBIT` therefore also marks lit rooms. Harmless: the only consumers are ZRamReader's item-likeness tests
    (#3904).

## Compiled boot object table

Bounded scan with `zil-objtab-carriers.cjs`, valid IDs up to the first property address:

- Single owner: Lurking 22 = {132}, Zork II 31 = {76}, Zork III 6 = {41}.
- Several owners: Zork I 31 = {104, 147, 164}, Hollywood 3 = 5 objects, Stationfall 24 = 11, Enchanter 22 = 32.

## Zork II lightSource 31: rule 5 met (single-owner exception)

- Walk positive: `light lamp` 76:31 TRUE.
- Cold device: `light lamp` 76:31 TRUE ("The lamp is now on.").
- Cold device negative: `turn on sword` 23:31 FALSE ("You can't turn that on.").
- Census {76}; source LIGHTBIT 1/1.

## Lurking lightSource 22: positive + census + source

- Walk positive: `light flashlight` 132:22 TRUE. Census {132}; source 1/1 (`cs.zil:1365`).
- LIGHTBIT is only tested in FLASHLIGHT's own routine and by the syntax `(FIND LIGHTBIT)`, so a target-named
  negative on another object cannot exist.
- Cold device: a bare `light` runs the parser FIND scan, which tests 22 FALSE on 20+ in-scope objects (including the
  carried assignment 97). This is a device negative, but NOT target-named (rule 7), so it needs a ruling.
- Runtime `FCLEAR ,FLASHLIGHT ,LIGHTBIT` at `cs.zil:1413`: the bit is the flashlight's working state, not just
  capability.

## Zork I lightSource 31: one testable positive + source match (needs a rule-5 exception ruling)

- Census {104 torch, 147 candles, 164 lamp}; source LIGHTBIT carriers 3/3 exact.
- Target-named positive: walk mz3 steps 15/19/25/35/307 (`Light lamp` / `Douse lamp`), 164:31 TRUE each time.
- Cold device negatives: `turn on mailbox` 160:31 FALSE; `turn on leaflet` 161:31 FALSE ("You can't turn that on.").
- Torch 104 and candles 147 are never tested on bit 31 by any command. The torch is always lit, and the candles'
  own routine handles LIGHT and DOUSE without V-LAMP-ON. So no second target-named positive exists in the module.
- Withdrawal history: Zork I light 31 was withdrawn in 894c923 (#3380) over capability vs emission. The #3904
  consumer audit answers that.

## Rule-7 ruling (leader, #4028)

A parser GWIM/FIND scan does not satisfy rule 7. Lurking light 22 therefore stays U, because only a FIND-scan negative
can exist (documented as untestable-by-rule).

## Stationfall lightSource 24: rule 5 complete

- Walk positives, target-named: `turn reader off` 29:24 TRUE; `turn lamp on` 141:24 TRUE.
- Cold device negatives: `turn on uniform` 229:24 FALSE; `turn on chronometer` 1:24 FALSE; `turn off card` 81:24 FALSE
  ("You can't turn that on/off.").
- Census (bounded): 11 objects. Source LIGHTBIT: 12 FLAGS carriers.

## Other titles: census vs walk tests on the LB bit

- Hollywood 3: positive flashlight 123 ("TURN ON FLASHLIGHT"). The negatives 63 and 179 came from "TURN IT ON" /
  "LIGHT IT", which name the object only through a pronoun.
- LGOP 25: positive flashlight 110 only.
- Enchanter 22: positive lantern 94 only.
- No LB test in any walk: Ballyhoo, Moonmist, Planetfall, PH, H2G2, Witness, Zork III, Sorcerer.

## Single-positive titles: carrier names and status (2026-10-17 afternoon)

- Hollywood 3: carriers computer 103, flashlight 123, slide projector 133, film projector 191, plus pseudo 69.
  V-LAMP-ON tests LIGHTBIT on PRSO, and COMPUTER-F handles only EXAMINE/PUT, so `turn on computer` should give a second
  target-named positive. Walk running (`_hw-light.json`).
- LGOP 25: carriers flashlight 110 and blender 186, plus pseudo 10/54. V-ON tests LIGHTBIT on PRSO. The blender
  appears after the old route desync at step 240; the route is fixed (comma-list drops split) and rerunning.
- Moonmist 24: carriers brass lantern 153 and "your lamp" 164, plus pseudo 66. Cold negative: `turn on outfit`
  78:24 FALSE. The positives need a castle route; there is no Moonmist walkthrough route yet.
- PH 25: torch 9, chandelier 59, pseudo 60.
- Planetfall 21: microfilm reader 55, terminal 56, robot 110.
- Ballyhoo 26: headphones 36, radio 48, light 58, chandelier 74, pseudo 76.
- Witness 25: cigarette 43, pseudo 249.
