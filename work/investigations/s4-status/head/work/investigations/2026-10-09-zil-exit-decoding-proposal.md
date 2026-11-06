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

## Revision Z1-R1 (answering codex #1948/#1949; measured with harness/_zil_z1_probe.js)

**Reuse D198, with no second classifier.**
`GrammarProvider._d198RawDictionary` (version-aware text width: 4 bytes in
v3, 6 bytes in v4+) plus `decodeD198().classification === "confirmed-zil-family"`
are the gates. Direction entries are decoded with the SAME first-POS
selector D198 already uses for verbs (Infocom parser WT?, per the primary
source codex cited):
- PS?DIRECTION is flag 0x10;
- the value is at data[1] when (flags & 3) === 3 (P1?DIRECTION), else data[2].

Measured:

| Game | Version | Directions decoded | Notes |
|---|---|---|---|
| Zork I | 3 | 13 direction properties with every alias: n/north 31, ... out 20, land 19 | 0 conflicts; same values the calibrator learned |
| Hitchhiker's | 5 | 12 properties | Nautical aliases: port=w 57, starboard=e 61, fore=n 63, aft=s 59; 0 conflicts |
| Planetfall | 3 | 12 properties | ccw/cw/port/starboard/fore/aft included |

**Exit forms by version** (codex's Trinity constants):
- v3: UEXIT 1, NEXIT 2, FEXIT 3, CEXIT 4, DEXIT 5. The room is a byte.
- v4+: UEXIT 2, NEXIT 3, FEXIT 4, CEXIT 5, DEXIT 6. The room is a word, CEXIT's
  flag is byte 4, and DEXIT's door object is word 1.

Measured:
- Zork I, West of House: as in the first table.
- Planetfall, Deck Nine: DEXIT exits east to the Reactor Lobby (door 230),
  west and in to the Escape Pod (door 231), up to the Gangway (door 229).
- HHG, Bedroom: south, down and out are all FEXIT (routine-decided), so
  correctly no static destination.

Supported: pre-v6 ZIL family only, the same bound as D198. Anything else (v6,
Inform, Glulx, an unclassified family) is absent, and the calibrator path is
unchanged.

**Validation and rejection, per build:**
1. A direction word whose two readings conflict rejects the whole mapping.
2. Every decoded property must be unique per word, below the property-defaults
   count, and present in at least one room.
3. A property length not in the version's table is unknown: no emission.
4. Destinations must be valid object ids that pass `isPlausibleMapRoom`.
   String and routine pointers are never dereferenced as rooms.
5. If ExitCalibrator holds a PROVEN direction that disagrees with the decoded
   mapping, the decoder is disabled for that story and the calibrator alone
   is used.

**Authority (codex's dynamic-override point, Trinity V-WALK FLIP/SHADOWY).**
A decoded exit is a VISIBLE HINT only: it shows the faded or dotted room and
direction on the map and World Map, and adds the direction to the radial. It
is NOT a pathable travelled edge, and auto-travel never routes through it,
until a real walk (state-delta) or current permission evidence corroborates
it. Specifically:
- UEXIT: a hinted destination;
- CEXIT and DEXIT: hinted with a conditional or door marker;
- NEXIT and FEXIT: a direction with no destination.
A real move always wins.

**Prior-fix guard:**

| Decision | What must hold | Proof |
|---|---|---|
| D61 | Inform look-ahead unchanged | d23-lookahead-labels, d46-room-identity |
| D134 | the calibrator still owns confirmation | exit-calibrator |
| D155 | doors are never destinations of travel edges | DEXIT stays a hint |
| D35/D55 | wump2ka door_dir/xN untouched (Inform) | d170 |
| D48 | a single room per destination | d48 |
| D202/World Map | hinted rooms faded, links dotted | world-map-ui |

Module controls: Anchorhead and wump2ka unchanged; Zork I, Planetfall and
HHG decode as measured.
