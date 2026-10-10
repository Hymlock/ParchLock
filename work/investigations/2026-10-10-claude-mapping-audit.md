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

## M05b: Facility player discovery (CONFIRMED; deterministic signal found)

**Evidence** (object-parent diff around real moves): the ONLY object whose parent changes is 46:
- `north`: 45 -> 48 (Lobby -> Visitor Gallery);
- `south`: 48 -> 45;
- `north`: 45 -> 48.

45 and 48 are top-level (parent 0). Object 46 has an EMPTY short name (I7 prints "yourself" through a routine) and no "self" words, so today's resolver gives playerId 0 and an empty map.

**Planned fix:**
- When no player is identified, the object that moves between two top-level objects on a successful directional command is the player, and its new parent is the room. Persist it per story digest, as the calibrations are.
- Corroborate with the global variable holding that object id (I7's player global). Names come from the printed heading.
- Inventory follows from the same identity.
- **Negative controls:** carried items move WITH the player (their parent is the player, unchanged); NPC movement is excluded by requiring the move to coincide with the player's own successful directional command and a new printed heading.

## Target 2: qualifying internal-named rooms (M05 safety)

**Census of top-level "(...)" objects:**
- **Real rooms:** Advent (Alike_Maze_1..13, Dead_End_1..12); Anchorhead (hall1, cell1-3, maze1-5, m_maze1-6, M_South/M_Middle/M_North); Make It Good (MainStreet).
- **NOT rooms, yet top-level and holding children:** Make It Good (TopTreeObj) 93 kids, (MainGameDaemon) 7, (MaidsWork) 8, (cast); Anchorhead (crowd), (gang), (orderly); every game's (darkness object), (Inform Parser), (Inform Library), (LibraryMessages); Facility (ValuePropertyHolder_n).

**Conclusion:** top-level + internal name alone is NOT safe. The M05 rule is safe only with all of these together:
- (a) top-level;
- (b) DIRECTLY encloses the player (or via an internal-named container, as with the car);
- (c) a room heading is printed in that same turn;
- (d) not a library/meta holder (darkness, self, parser, library, messages, class, object).

Condition (c) protects against cutscenes that park the player in an off-stage holder. The M05 patch must add (c) before it is applied.

## M05b follow-up (codex #2355: globals 44 and 50 both = 46)

The canonical slot is not needed for identity. The player OBJECT is what the map needs, and both globals agree on it (I6 `player`/`actor`, equal outside NPC actions). With several movers (followers), the player is the mover whose new parent is the room whose heading was just printed AND which equals a global stable across turns; followers fail one of those tests.

## M09 cases checked

- **Curses: CONFIRMED.** After boot plus LOOK, the map records 100 "Tiny Balcony", 35 Attic and 42 Servant's Room. The route never visits Tiny Balcony; Servant's Room is a look-ahead hint.
- **Galatea: NOT reproduced as a recorded room.** The map holds only 29 "The Gallery's End" by the first line prompt. Codex's boot 135 was a transient payload reading that was never admitted. It stays a watch item, not an M09 case.

## Opaque exit properties (codex #2360) explained by the compass; M01 family is broad

| Module | Compass mapping (property -> direction) | Opaque props |
|---|---|---|
| Curses, Godot, b2demo | 5 = n, 6 = s, 7 = e, 8 = w, 9 = ne, 10 = se, 11 = nw, 12 = sw, 13 = u, 14 = d | 5, 6 = north, south |
| Cat's Eye, Moonglow | 6 = n, 7 = s, 8 = e, 9 = w, 10 = u, 11 = d | 6 = north |
| Deja Vu | 9 = n, 10 = s, 11 = e, 12 = w, 13 = ne, 14 = se, 15 = nw, 16 = sw, 17 = u, 18 = d | (none; the look-ahead is empty) |
| Gostak | no compass group found by direction WORDS (it uses invented vocabulary) | 13 unexplained |

**Implications:**
- In Curses, Godot and b2demo every stock label is shifted by two (the stock "north" = prop7 is really EAST). The older ne/se/nw/sw order applies.
- The compass mapping fixes the whole older-library family.

**Refinement:** detect the compass STRUCTURALLY (an object with at least 4 children that share one property with distinct small values, terminating the direction table) without requiring English direction words. Use the words only for labels, with the game's own words or a per-module label list (allowed now) for Gostak.

**M05b (codex #2357 objection accepted):** the moved-object player identity is PROVISIONAL. It is persisted per digest only after the same object is the mover on at least 2 distinct moves that each print a new heading, with both candidate globals agreeing; any contradicting mover discards it. Degeneracy (offstage default self), vehicles, teleports and followers are listed as controls.

## Codex #2361/#2363 follow-ups

- **Ghost Train: M09 CONFIRMED (second case).** Map rooms are 179 "black railway carriage no:7." and 43 "first class carriage". The player is in 43 from the first line prompt and never visits 179, which was the intro location before the prompt. The planned admission boundary (no room before the first line prompt of a session, except a restored map) covers it.
- **Inevita counterexample supports the STRUCTURAL compass rule.**
  - The real compass 6 has 12 children carrying prop21 with DISTINCT values, but only 5 readable direction words (the rest are internal n_obj..).
  - A room group 25 has 4 direction-word children with a CONSTANT shared value (prop2 = 24).
  - The distinct-values requirement selects the real compass and rejects the room group; word-based detection would do neither reliably. The rule stands: at least 4 children, one shared property, pairwise-distinct small values; words only for labelling.

## Structural compass census (codex #2366): Gostak solved

Structural rule: an object with at least 4 children that all carry one property with pairwise-distinct small values (2..63). No words used. Exactly ONE hit per game:
- **Gostak:** holder 6 "compass", prop21: 7 = k, 8 = j, 9 = l, 10 = h, 11 = kl, 13 = kh, 12 = jl, 14 = jh, 15 = f, 16 = g, 18 = outside, 17 = inside. So Gostak uses the STANDARD layout. Its exits looked opaque only because its direction words are invented (k/j/l/h, with kl/kh/jl/jh as diagonals). Opaque prop13 is "kh", its north-west.
- **Curses:** holder 1, prop8: 5 = n ... 16 = outside, 15 = inside (shift by two).
- **Advent:** holder 6, prop21: 7 = n ... 18 = out (standard; positive control).

**Labels:** use the child's own dictionary word ("kh"), which is what the player types in that game. The direction's MEANING (for map layout) comes from the child's position in the standard order, or from a standard word when one exists. Per codex #2365, store the full value -> direction mapping (an enum with the diagonal permutation), never a scalar offset.

## Structural compass uniqueness (codex #2368 objection tested)

Census over 14 games (structural rule only):
- **One correct hit each:**
  - Moonglow and Cat's Eye: 6/compass, p9, north = 6;
  - Godot: 1/compass, p8, north = 5;
  - Anchorhead: 6/compass, p21, standard;
  - Make It Good: 6/compass, p21, standard;
  - **Building: 6/compass, p22, north = 8, a NEW variant shifted +1.**
- **False hits:**
  - b2demo: 2 hits, the compass plus 54 "puzzles" p9 (distinct values 5..15);
  - Warbler's Nest (I7): 4 hits on unnamed rooms whose contents share p26/p32. I7 has no direction-property compass.
- **No hits, correctly:** wump2ka (custom door_dir exits, D35/D55), Zork I (ZIL, own decoder), Facility (I7).
- **Probe errors (to retry):** Deja Vu, Bedlam, Balances. Deja Vu's compass was found earlier by the word-based probe.

**Revised rule:** the structural pattern AND a holder whose short name is "compass" (the library object, present in every true hit including Gostak). This rejects the b2demo "puzzles" and all Warbler false hits.

**Geometry (codex #2368 accepted):**
- Labels are always the game's own token.
- The cardinal layout slot only when that child's own words include a standard direction word; otherwise the exit goes to a neutral numbered slot (as D63 does for wump2ka), so Gostak's kh shows as "kh" without a guessed north-west position.
- The full value -> token mapping is stored (an enum), never an offset.

## M09 boundary revised (codex #2369/#2372: Being Steve plays through CharInput)

The "first line prompt" gate is withdrawn: it would block all mapping in Being Steve, whose whole gameplay uses character reads.

**Revised rule (independent of input type):** a room is admitted to the map only when the game has ANNOUNCED it at that moment, i.e. its name appears as the printed room heading in the story or as the room name in the status line.
- Boot cases (Curses Tiny Balcony, Ghost Train carriage no:7., Jigsaw Office, Mullmurd Mulldoon) are the player's hidden intro position, never printed as a heading, so they are not admitted. The first announced room (Attic, Century Park, Outside Museum) is admitted normally.
- Being Steve: admitted whenever its headings print, whatever the input widget.
- **Edge cases to test:**
  - games without headings or status lines: fall back to today's behaviour, with a printed-room provenance flag recorded;
  - dark rooms (the heading says "Darkness"): admit the structural room id, named later;
  - restores: the saved map is restored as-is.

**Accepted from #2372:** the compass rule is research-qualified, not global approval. Keep the unknown-holder fallback and the ZIL/Wumpus exclusions.

## Heroine (codex #2374): player misidentified, an M05-class case, NOT an M09 counterexample

**Evidence:**
- The payload player is 114 "Rex" (playerSource "parser-self") inside 112 "Golden Horse". Rex's words are golden/horse/ship/rex/computer: it is the ship's COMPUTER.
- The real player is **24 "Lisa Flint"** (the heroine): 24 is inside 28 "ocean", inside 27 "Jetty". That matches the printed text ("drowning ... planks of a wooden jetty").
- The game switches the player character (Inform ChangePlayer), and the parser-self guess picked the wrong object. No global holds 114 or 20; the player global must hold 24.

**Planned fix:** when the parser-self candidate has no self words and sits away from the printed location, prefer the object held by the game's player global that is animate and placed in a plausible room. Cross-check with the M05b moved-object rule on the first successful move.
- **Controls:** games with a normal (self object) player; vehicles (Golden Horse later in play); Facility.
- **Effect on M09:** the announced-heading rule then compares against the RIGHT location (Jetty), so Heroine supports the rule once the player is fixed. The heading-versus-name comparison should be a prefix/containment match on the structural room or its outermost plausible container, not strict equality.

## Primrose (codex #2376/#2377): M05b class, plus an epigraph phantom room

**Evidence** (SPACE, LOOK, SOUTH, SOUTH, NORTH, INVENTORY):
- The payload player is 0 / source none throughout. The parent diff on the first SOUTH: **65 moves 64 -> 63**, out of the bed (64, parent 63) into 63 (top-level), the printed "Bedroom". So the player is 65, the same class as Facility M05b. The later S/N do not move (authored).
- The map's current room is named **"Learn to obey before you command."**: the game's opening epigraph, recorded as a room with NO structural id behind it.

**Refinement to the M09 rule (and to any heading-based admission):** a room is admitted only with BOTH a structural location id (from the corrected player's containment) AND an announcement (heading or status name matching that location by prefix/containment). Text alone (an epigraph, title or quote) never mints a room. Codex #2376 is right that prefix matching cannot prove admission alone; it only confirms a structurally identified room.

## INVENTORY-children cross-check (player-identity confirmation)

| Module | Candidate | INVENTORY text | Candidate children | Verdict |
|---|---|---|---|---|
| Heroine | 24 Lisa Flint | school blazer and boots (worn uniform) | 25 school uniform | agrees; rejects Rex |
| Facility | 46 | "You have barely gotten started." (nothing carried) | none | consistent, but empty = weak |
| Primrose | 65 | "I'm empty-handed." | none | consistent, but empty = weak |

**Conclusion:** the INVENTORY cross-check CONFIRMS a candidate when it carries or wears something, and is non-informative when both sides are empty. Player identity = moved-object rule (M05b, provisional until 2 heading-changing moves) + the player global holding that object + this check when non-empty. That combination answers codex's "canonical provenance" request without relying on any single signal.

## Primrose multi-mover counterexample (codex #2383) resolved: floating objects

On the real room change (Bedroom 63 -> Hallway 78), the movers are 65, 68, 77, 107, 108, 109, 110:
- 68 walls, 77 door, 109 sky/ceiling, 110 floor, 108 nightgown, 107 "you/yourself/matilda" (a floating description object, which is why the player looked AMBIGUOUS: both 65 and 107 have "yourself").
- These are Inform floating objects that MoveFloatingObjects relocates to the player's new room.
- The property-name table did not decode for this I7 build, but structurally EVERY co-mover carries prop39 (the found_in slot) and **65 lacks it**. 65 has actor properties the scenery lacks (48, 45, 44, 42, 41, 29).
- On the bed exit (no room change) only 65 moved.

**Refined player rule:**
- among movers on a room change, discard the objects that share the floating marker (a property present on all co-movers that the candidate lacks; `found_in` where names decode);
- the remaining mover that also carries self words is the player;
- a container-only move (bed exit, no room change) isolates the player directly.
This also resolves the 65-versus-107 "yourself" ambiguity. It is still provisional until 2 moves, with the global and INVENTORY checks as confirmation.

## Evidence tiers for player identity (codex #2385 accepted)

- **Tier A (compiler-proven):** a decoded property name (`found_in`), or the compiled read-site: a routine that loops over objects, reads the property (get_prop / get_prop_addr with that constant) and moves matches into the player's location (insert_obj). This is MoveFloatingObjects.
- **Tier B (structural inference):** a property common to all co-movers and absent from the candidate, as for Primrose prop39. Plausible, but a companion class could also share a property.
- **Tier C (behavioural):** repeated moves, globals, INVENTORY children.

Exclusions use Tier A only; Tier B/C stay provisional and are labelled as such. A container-only move isolates the player only when no other object changed parent in that move (pets and vehicle occupants would show up as co-movers).

**Next research task (claude):** scan Primrose's code for get_prop with constant 39 inside an object loop that ends in insert_obj to the player location, as a Tier-A proof of found_in.

**Tier-A attempt (Primrose prop39), INCONCLUSIVE:** a raw byte scan of high memory for long-form get_prop/get_prop_addr with a constant property, followed within 40 bytes by insert_obj, does not discriminate: prop39 has 19 sites (5 near insert_obj), prop48 73 (48), prop26 54 (25), prop45 12 (5), prop21 12 (1). A byte scan cannot separate instructions from data. Tier-A needs a real routine disassembler: decode routines, find the object loop that reads the property and insert_obj's into the player location. Until then, the Primrose floating-object exclusion stays Tier B (provisional).

## M10 (codex #2389): timed travel recorded as a typed direction, answered with D73 live opcode observation

**Problem:** an awakening scene moves the player Chapel 20 -> Quarters 22 on whichever turn it fires. The map records that turn's typed direction (n in one run, w in another) as a confirmed exit (state-delta, confidence 0.98). Coincidence is not causation.

**Existing capability (D73):** `lib/zvm.js` runs the game's opcodes as live, patchable methods. `js/ZvmCapture.js` already patches `get_prop` / `insert_obj` / `test_attr` and others; `AttrCalibrator` uses them. So we can observe what the game's code actually executes each turn. That is compiler-executed evidence, not a byte scan.

**Planned rule (Tier A, causal):**
- record an exit (R, D -> X) only when, in the same turn, the game read the current room's direction property for D (get_prop / get_prop_addr on R with D's property, compass mapping M01) and that read produced X (or a door leading to X), followed by insert_obj(player, X);
- a player insert_obj with no such read (daemon, timed scene, scripted transport) moves the map's current room but records NO directional exit (it can be shown as an unlabelled "event" link);
- custom travel commands (M06) are recorded under their own command label.

**Floating objects, Tier A via the same hooks:** on a room change, MoveFloatingObjects reads one property on each object immediately before insert_obj(obj, newRoom). The property read immediately before those co-mover insert_obj calls IS found_in, observed live. This upgrades the Primrose prop39 exclusion from Tier B to Tier A once observed.

**Checks:** whether ZvmCapture's hooks see get_prop calls made from compiled routines (D73 says yes), plus the performance cost (hooks only around the submitted turn).
