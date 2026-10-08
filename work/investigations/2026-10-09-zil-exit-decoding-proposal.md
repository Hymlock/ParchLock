# Reopened: ZIL room prediction by decoding the game's OWN exit data (no guessing)

claude, 2026-10-09. The operator rejected the explanation-only close: "I thought
you were going to be able to decode it". This reopens #1930/#1936 with new
measured evidence.

## Why this is not D61/D134's rejected approach

- D61's phantoms came from applying INFORM's direction-property convention to
  a ZIL story: a guess about which property means which direction.
- D134 then avoided "decoding ZIL byte layouts" and learned the mapping from
  travel instead.
- This proposal guesses NOTHING. Both facts come from the story file's own
  data.

## Evidence (Zork I, native RAM, read-only; scratch harness/_zil_dirs.js and _zil_exits.js)

**Fact 1: the direction-to-property mapping is in the dictionary.** Each ZIL
direction word's entry carries the PS?DIRECTION part of speech with its
property number in the data bytes:

| Word | Data bytes | Property |
|---|---|---|
| north | 19,31 | 31 |
| south | 19,28 | 28 |
| east | 19,30 | 30 |
| west | 50,161,29 | 29 |
| ne | 19,27 | 27 |
| sw | 19,24 | 24 |
| up | 24,252,23 | 23 |
| down | 24,250,22 | 22 |
| in | 24,251,21 | 21 |
| out | 24,253,20 | 20 |

These are exactly the properties ExitCalibrator LEARNED by travel (north 31,
south 28, east 30), now available before any move.

**Fact 2: the exit form is the property length** (the standard ZIL exit
macros). In v3: 1 = UEXIT (destination room), 2 = NEXIT (a string: a blocked
message), 3 = FEXIT (a routine), 4 = CEXIT (room plus a flag global plus a
message), 5 = DEXIT (room plus a door object plus a message). West of House
decodes exactly:

| Exit | Form | Destination |
|---|---|---|
| north | UEXIT | North of House |
| ne | UEXIT | North of House |
| south | UEXIT | South of House |
| se | UEXIT | South of House |
| west | UEXIT | Forest |
| east | NEXIT | none ("The door is boarded...") |
| sw | CEXIT | Stone Barrow, gated by flag global 156 |
| in | CEXIT | Stone Barrow, gated by flag global 156 |

Every value matches the real game, with no phantoms.

## Proposal Z1

- **Mapping (per build, validated).** Read the direction mapping from
  dictionary entries carrying the direction part of speech. Accept the mapping
  only when:
  - each direction word maps to exactly one property;
  - the properties are distinct and fall within the property-default range;
  - and, if ExitCalibrator already holds proven directions, they AGREE.
  On any disagreement, fall back entirely to today's calibrator for that story.
  The decoding of part-of-speech flag bits must be specified exactly from the
  ZIL parser format (the first and second part-of-speech value bytes), and
  verified on several titles.
- **Exits.** For the current room's properties in that mapping, decode by
  length:
  - UEXIT gives a predicted, pathable hinted exit to a real room (validated by
    `isPlausibleMapRoom`).
  - CEXIT gives a hinted, CONDITIONAL exit (shown as unknown or locked; never
    auto-travelled until walked; its flag can be read for current openness
    only if proven).
  - DEXIT gives a hinted door exit. The door object's open bit is used only
    where calibrated, which is consistent with D155's "doors are not
    destinations".
  - NEXIT and FEXIT give no destination: a blocked or scripted exit, shown at
    most as a labelled direction with no target.
  - Version differences (v4+ use word-sized room numbers) are handled by size,
    validated per build.
- **Authority.** It feeds the EXISTING look-ahead/hint path as HINTED evidence
  (ram-lookahead semantics). A real walk (state-delta) stays ground truth. No
  map edge is promoted to travelled without travel. ExitCalibrator remains,
  and serves stories where the mapping fails validation.
- **Scope.** ZIL only, by compiler identity, never by title. Inform keeps D61.
  wump2ka is Inform (door_dir, D35/D55): untouched. Glulx: untouched.

## Proof

- **Zork I** West of House on turn 0: predictions as in the table, plus a
  walk-verify of each UEXIT (15/15-style, like D134).
- **Planetfall** (nautical directions), **Hitchhiker's** and one v4/v5 ZIL
  title (for example Border Zone or Trinity), each compared with a few real
  walks.
- **Negatives:** CEXIT and NEXIT never become pathable edges; doors are never
  destinations; a conflicting calibrator vote falls back.
- **Controls:** Anchorhead (Inform) and wump2ka unchanged; harness
  exit-calibrator, d23 and d48 green.
