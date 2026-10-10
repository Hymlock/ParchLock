# Claude audit of codex's mapping research (work/mapping-research/OPEN_FINDINGS.md)

Baseline checkout cf7125f or later. Each class is reproduced independently against the current code before agreement.

## M01: Inform direction ABI not selected by the banner (CONFIRMED, with a deterministic fix candidate)

**Reproduction** (Moonglow, banner "Inform v6.15 microform v1.1", v3):
- At Edge of Field (14), prop 7 = 17 "Barn House", and the lookahead labels it **north** (stock 6.12.2 profile).
- The real `north` does not move. `south` -> 17 Barn House. Prop 6 is a routine (the blocked-north message).

**Deterministic source of the true mapping:** Inform's compass. The compass object's children are the direction objects, and each carries the direction property it stands for (`door_dir`).
- Moonglow: compass 6; north(7) has prop9 = 6, south(8) prop9 = 7, east prop9 = 8, west prop9 = 9, up prop9 = 10, down prop9 = 11. So prop7 = south, which matches real travel.
- Advent (standard library 6.12.x): compass 6; north..out carry prop21 = 7..18, exactly the current PROFILE (a positive control).

**General fix candidate:**
- Locate the compass: an object whose children (at least 4) each have dictionary words naming a direction, and which all share ONE property whose values are distinct small property numbers.
- Map value -> that child's direction word. Use that mapping for direction labels and look-ahead.
- Fall back to the stock profile only when no such structure exists.
- No per-title rules, no travel needed, nothing guessed. It also covers the D23 diagonal order (the ne/nw/se/sw children carry their own numbers).
- **To check:** PunyInform and I7 compass layouts. Moonglow has no diagonals, so its compass only names what it has.

**Touches:** D23, D24, D61, D134 and Z1-R1 (ZIL keeps its own dictionary path). ZRamReader.directionProps PROFILE (~438) becomes the fallback.

## M02: contradicting decoded hints survive real travel (CONFIRMED, two parts)

**Reproduction** (Moonglow; route south, south, north, north). Barn House `Exits` / `ExitMeta`:
- Arrive: `n -> Inside Barn House` from prop7 (ram-lookahead). Prop7 is really south (M01).
- After the real `north` from Barn House reaches Edge of Field (14): `ExitMeta.n` = state-delta to 14, but `Exits.n` STILL = Inside Barn House. Both maps show the false edge.

**Part 1 (follows from M01):** with the compass mapping, prop7 = south and prop6 = north -> Edge of Field, so this route's false edge vanishes.

**Part 2 (independent, general):** real travel evidence (from R, direction D, arrived at X) must replace any decoded `Exits[D]` that names a different destination; ExitMeta already holds the state-delta.
- Genuine multiple directions to the same room (Advent's in/east -> building) are unaffected, because the rule only overwrites the SAME direction when the walk contradicts it.
- The fix belongs in MapTopology's state-delta link path, which must win over an earlier ram-lookahead `Exits` entry for the same key.
- Touches D23/D24, Z1-R1 ("a destination conflict cannot retain that permission").

## M03: no pre-travel exits in some Inform 6 games (CONFIRMED, same class as M01)

**Reproduction** (Deja Vu, "Compiled by Inform v634", v3):
- Compass 1; the direction walls carry prop8 (1 byte): n = 9, s = 10, e = 11, w = 12, ne = 13, se = 14, nw = 15, sw = 16, u = 17, d = 18.
- Y2 Rock Room (13): prop12 = 25 Broken Passage, prop10 = 40 Reservoir. By the compass that is west -> Broken Passage and south -> Reservoir. The real `south` -> 40 Reservoir confirms it; the real `north` does not move (no prop9).
- The current look-ahead is EMPTY because the stock 6.12.2 profile does not fit this library.

**Fix:** the same compass mapping as M01. 1-byte values (v3) must be read too. **Merge M01 and M03** into one class: "Inform direction properties from the game's own compass".

## M03: no pre-travel exits in some Inform 6 games (CONFIRMED, same class as M01)

**Reproduction** (Deja Vu, "Compiled by Inform v634", v3):
- Compass 1; the direction walls carry prop8 (1 byte): n = 9, s = 10, e = 11, w = 12, ne = 13, se = 14, nw = 15, sw = 16, u = 17, d = 18.
- Y2 Rock Room (13): prop12 = 25 Broken Passage, prop10 = 40 Reservoir. By the compass that is west -> Broken Passage and south -> Reservoir. The real `south` -> 40 Reservoir confirms it; the real `north` does not move (no prop9).
- The current look-ahead is EMPTY because the stock 6.12.2 profile does not fit this library.

**Fix:** the same compass mapping as M01. 1-byte values (v3) must be read too. **Merge M01 and M03** into one class: "Inform direction properties from the game's own compass".

## M04: opaque exit-N in Inform 7 rooms (CONFIRMED as a phantom; deterministic source identified, decoder still to be written)

**Evidence** (The Warbler's Nest, I7 on Z):
- Compass 5 has 12 direction children (n, ne, nw, s, se, sw, e, w, u, d, in, out) with NO direction-property values. I7 does not store exits in room properties.
- Prop31 exists on exactly 5 unnamed objects and forms a single chain 51 -> 53 -> 56 -> 61 -> 101 -> 0. That is an I7 kind-instance link (each room's "next of this kind"), not a direction. I7 room names print through routines, so the short names are empty.
- Today the generic exit-candidate scan (props 5..31) admits it as "exit-31".

**Fix candidates:**
- (a) **Exclusion:** a property whose values chain through objects of one kind, terminating in 0, is a list link and is never an exit candidate.
- (b) **Positive:** decode I7's map storage, an array indexed room x direction in compass-child order. That gives exact I7 exits pre-travel. The array must be located from compiled structure, not per title.
- **NEEDS-MORE:** confirm that 51/53/56/61/101 are the room objects (payload roomIds in the trace), and locate the map storage array generically.

## M05: player location misidentified (CONFIRMED; fix planned, patch prepared, not applied)

**Reproduction** (Make It Good):
- The player chain is 20 (self) -> 397 "(Car)" -> 391 "(MainStreet)" (391 is top-level), and later 20 -> 391.
- Payload room = 398 "glove compartment", room source "none", for the WHOLE route. The map never left the glove compartment, while the game printed "Broken Top Boulevard, Outside No. 15 / No. 17".

**Cause:** `ZRamReader.isLocationObject` rejects every name starting "(", so enclosingRoom dead-ends at "(Car)" / "(MainStreet)" and a fallback picks a wrong object.

**Planned fix** (`work/investigations/patches/M05-internal-named-rooms.patch`):
- (1) an internal-named object counts as a location only when it is TOP-LEVEL (parent 0) and encloses the player, with meta holders ("(darkness...", "(self...", "(class...", "(object...") still rejected;
- (2) enclosingRoom climbs past an internal-named intermediate container instead of stopping.

**Measured with the patch:** the map follows to 391 named from the printed heading, in the car and on the street. Guards: d46 27/0, d201 22/0 and 24/0, d23 88/0, exit-calibrator 26/0, d214-zil-exits 17/0, pellets-inventory-live PASS (one Wumpus-random failure, then two passes).

**Follow-ups:**
- strip a trailing sublocation suffix "(in the blue car)" / "(on ...)" from heading-derived room names;
- the virtual addresses (No. 15 vs No. 17 on one object) are M07.

**Facility (second M05 variant):** not yet re-traced; planned next.

## Planned fixes for the remaining classes (planning only; nothing applied)

Operator 2026-10-10: plan answers for every discovered issue, "even if we need specific fixes per module when necessary". Each item names its deterministic source; per-module fallbacks are marked as such.

**M05b, Facility (I7, empty/internal object names): player not found (playerId 0, empty map).** NEEDS-MORE.
- Plan: identify the player deterministically as the object whose parent changes on a successful move, with the new parent as the room. Corroborate with I7's player global, once its slot is identified by that same move. Use the printed heading for the name.
- My probe did not trigger the move (runner timing). Codex to verify with its trace.

**M06, non-compass travel (Heliopause WEIGH ANCHOR / HOIST SAILS): rooms with no connecting edge.**
- Plan: record a successful room change caused by a typed non-compass command as an edge labelled with that exact command (source "state-delta-command"), drawn dotted.
- Offer it as a clickable command, but never auto-path through it until it has repeated the same transition at least once (one-shot events are excluded).
- Reuses the D138-D140 command labels.

**M07, virtual rooms on one object (Appallatron Room #1..#4 = object 26; Make It Good No. 15/No. 17 = object 391).**
- General signal: one object prints DIFFERENT headings that are stable on revisits AND co-vary with a global (Appallatron globals 134/135 step 0,1,2,3,2,1,0). Room identity = object id + that global's value; the heading is the name.
- Must NOT apply to wump2ka, which re-randomises names on the same object (D62). There the heading changes with no co-varying global, so the rule excludes it by construction.
- Per-module fallback if the global test proves unreliable: an explicit list of virtual-room modules keyed by heading.

**M08, furniture minted as a room (Bedlam's bed 23; Break-In's chair 34).**
- Cause: `enclosingRoom` (ZRamReader ~123) returns the first parent that is not an enterable container/supporter. The bed is a supporter with enterable = false.
- Plan: never stop at a supporter or container that `isPlausibleMapRoom` rejects when an outer ancestor is a plausible room; climb to that room.
- Controls that must keep working: Bear, For a Change, Book and Volume (correct rooms while on furniture) and genuine enterable vehicles.

**M09, a room minted before the game starts (Curses "Tiny Balcony" before SPACE).**
- Plan: no room is admitted to the map before the story's first line-input prompt of a session (after load or restart), unless a saved map is being restored.
- Mid-game character prompts are unaffected. Treasure and Anchorhead already behave this way (controls).

**Name cleanup (from M05):** strip a trailing sublocation suffix ("(in the blue car)", "(on the bed)") from heading-derived room names.

**Non-mapping items:**
- **Item 2, the first status check leaking in many modules.** Per-module fixes are now allowed, so: keep the general D207 release rule, and add a per-module table of known status-reply shapes (the leaked lines, recorded per game during the sweep), so each game's own reply paragraphs stay hidden.
  - Codex: please record any visible status-probe text per module in the sweep (the first Equipment open plus Refresh).
- **Inventory:**
  - Treasure's pre-travel destinations print with blank names (Codex coverage note). Plan: name them from the printed heading after the first visit, as cf7125f does for truncated names.
  - Codex: please record per module any Equipment row showing an internal name ("(...)", "K15_...", truncated dictionary words) or a missing or duplicated item. Fixes are planned per class once counted.
