# Infocom (ZIL) room prediction: claude sealed findings

Operator (2026-10-08): "Infocomm titles seem to have no room prediction and
only register rooms after they've been traveled to and back from I assume
this is limitation of their Engines?"

**Measured (Zork I, fresh context, scratch harness/_zil_lookahead.js).**

| Step | Rooms | Hinted look-ahead exits | Payload exits |
|---|---|---|---|
| north, east, south | 4 | 0 | none |
| after a 4th move (west) | 4 | 1 | "north" only |
| next move | 4 | 1 | "east" only |

Unwalked exits are almost never predicted; rooms appear only once walked.

**Cause (from the code comments; to be verified in source).** For non-Inform
stories, look-ahead comes from ExitCalibrator. It LEARNS which room
properties hold exits from observed real moves, and "nothing is emitted from
a property until it has predicted travel in several distinct rooms" (D134,
MapTopology ~720). So prediction is calibration-gated, not engine-limited.

**Engine fact.** ZIL direction properties have a standard layout, and the
property length encodes the exit type: UEXIT (an unconditional room byte or
word), NEXIT (a message), FEXIT (a routine), CEXIT (conditional, with a flag
global), and DEXIT (a door object). Unconditional and door exits can be read
statically, before any travel. Conditional and routine exits must stay
hinted or unknown. Which property numbers are directions is also recoverable
statically (the direction properties are the highest-numbered and are named
by the parser's direction words).

**Hypothesis / direction.** A generic ZIL exit decoder (property-length exit
types) feeding the existing look-ahead as HINTED evidence, with no title
dispatch. Calibration stays the authority for confidence. It needs a blind
comparison and evidence on several Infocom titles (Zork I, Planetfall,
Hitchhiker's).

## Correction after reading the record (operator: "check all the documents")

- **D134** (ExitCalibrator) EXPLICITLY rejected decoding ZIL byte layouts:
  "closes it without decoding ZIL byte layouts (the guess that made D61's
  phantoms)". It chose learning from travel. Measured on Zork1: 15/15
  predictions correct, 0 wrong. Calibration is persisted per game file and
  torn down on contradiction.
- My "static ZIL exit decoder" hypothesis above is therefore WITHDRAWN as a
  direction. Re-opening it would contradict D134, and it was the source of
  D61's phantoms.
- **D61:** Inform direction properties stay Inform-only.
  **D198:** ZIL capability completion.
  **D35/D55:** wump2ka numbered exits (door_dir, "xN" commands) are a separate
  mechanism that any change must leave untouched.
- **Questions that remain within D134's discipline:**
  - (a) Does calibration persist and reload on the device across sessions and
    restores? A fresh browser context starts empty by design, so my headless
    "1 hint after 4 moves" is the expected cold start, not steady state.
  - (b) Is the "several distinct rooms" threshold too slow in practice?
  - (c) Are learned properties applied to EVERY room once proven, or only
    re-emitted per room after travel?
  These are measurable against the operator's phone experience. Wumpus
  (`wump2ka`, numbered exits) and Inform games (Anchorhead) must be controls
  for any change.
