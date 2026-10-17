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
