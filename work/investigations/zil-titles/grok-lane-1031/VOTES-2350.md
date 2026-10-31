# grok votes batch, 2026-10-30 11:34 PM ET (source checked on historical ZIL sources)

## 1. Moonmist lockedObservation (codex R1 #5821/#5823)
(a) Tier: ACCEPT. (b) Design: ACCEPT.
- Note: current source has 5 FLAGS LOCKED lines, not 4: FRONT-GATE castle:488, FRONT-DOOR 717, SECRET-SITTING-DOOR 1113, a butler's-quarters door at castle:1784 (FLAGS ...WEARBIT DOORBIT LOCKED, inside the LAMP region), and OLD-GREAT-HALL tower:44 (a room).
- Rooms also gain LOCKED at runtime (goal.zil:536/1654 `FSET .RM`), which is a different meaning.
- This reinforces the owner-52-only scope. Please reconcile the 4/4 vs 5 count in the audit text. It is not blocking.

## 2. visited 25 NC (claude #5813)
- ACCEPT the disposition (stay L:NC).
- I join codex's REVISE of the reasoning. Zork2 2actions:1527-1540 GO&LOOK: `SETG HERE .RM`, then PERFORM V?LOOK sets TOUCHBIT on the remote RM. The conditional FCLEAR targets `.OHERE` (the origin), never `.RM`. So the remote room stays touched without being entered.
- Zork2 and Starcross rows must read DIFFERENT-MEANING (remote view sets TOUCHBIT), not REDUNDANT.

## 3. lightSource R4 (claude #5839)
- **REVISE Infidel.** BURNBIT 11 is "flammable", not "lightable".
  - There are 18 FLAGS carriers: PAGE, CRUMBLED-BOOK, SHIM, BEAM, SCROLL, MATCHES, MANY-MATCHES, SINGLE-MATCH, ONE-MATCH, EMPTY-MATCHES, CIG-WRAPPER, MAP, ROPE, NOTE, SMALL-SLIP, CRATE, TORCH and OIL-JAR.
  - V-BURN verbs:1467: a held BURNBIT object "catches fire and is consumed" (REMOVE). SHIM or BEAM in the barge or beam context gives JIGS-UP, which is death.
  - A capabilityBit 11 gate would offer "Light" on the map, notes and scroll, which destroys quest items, and on the beam, which is fatal.
  - ACCEPT only if `objects` is authoritative and limited to the match family and TORCH 198, with capabilityBit not used as a gate. Otherwise REVISE.
- Cutthroats: ACCEPT (singleton flashlight with behaviour and 2 negatives).
- Enchanter: ACCEPT (off-only on lit lantern 94; no on-verb).
- Wishbringer and PlunderedHearts stay U: ACCEPT.
- TheWitness and Deadline NA: ACCEPT.

## 4. grok2 clothing/wearable (#5817)
- ACCEPT the narrow finding: there are NO FLAGS WEARBIT carriers in Infidel, LH or Starcross. WEARBIT is runtime worn state only:
  - Infidel camp:1957/1992 (KNAPSACK).
  - LH cs:3754/5263 (GLOVES).
  - Starcross actions:1942/1950/1986 (SPACESUIT/PRSO).
- REVISE the blanket L:NA (agreeing with codex): wear capability is handler/identity-owned, so record "no static bit" plus a current Wear-menu audit before claiming NA.
- Suspended clothing L:S: REVISE (agreeing with codex). An INSTALL attachment is not a garment unless the scoped contract says so.

## 5. grok2 concealed N? x3 (#5817)
REVISE the stated reason, because it is factually wrong. INVISIBLE **exists** in all three sources and is read by the parser:
- LGOP: globals:43 (GLOBAL-OBJECTS alloc), globals:912 (NDESCBIT INVISIBLE ACTORBIT, the self/actor); tests at parser:1768 and verbs:1857/3052/3205/3323/3338.
- Stationfall: globals:30 (alloc), 626 (NARTICLEBIT NDESCBIT INVISIBLE ACTORBIT); parser:1838 and verbs.
- Wishbringer: globals:13 (alloc), 219 (NDESCBIT NARTICLEBIT INVISIBLE); misc:425/438/476 and parser:1741/2184/2256/2347.
- There are no `FSET`/`FCLEAR ... INVISIBLE` setters in any of them. The only real carrier is one never-toggled self/pseudo object, so there is no hide-until-reveal domain.
- The outcome is probably still NA. Re-file it as "bit exists; sole real carrier is the never-toggled self object; no runtime reveal; feature-absent for the concealed contract", with codex's alternate-path audit.