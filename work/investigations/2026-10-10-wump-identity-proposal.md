# wump2ka room identity: multi-section rooms (claude proposal R1, for adversarial review; NO CODE)

## Evidence (operator save; wump-dark-globals.cjs)
- The game prints "You are in a section of room #25". The status row shows "Room #25".
- The actor obj 171 "(CustomPlayer)" is a child of obj 50 "C_ROOMS_26", with the room contents ("arc" 365). Obj 49 "C_ROOMS_25" has no children.
- The lit location globals G16/G41 = 50. "(self object)" 20 has parent 0.
- payload: playerSource "named-player" (20), roomSource "existing-resolver", roomId 49, scopeCount 0.

## Prior art at HEAD
- **D171** (pl-d171) picks the room by printed "Room #N" -> compiled C_ROOMS_N (compiledRoomIndex / printedRoomNumber, consulted first by findLikelyLocation and findLocationGlobal; the plausibility gate is skipped).
  - Measured 39/45 agreement. It records "printed #25 correct id 49: kids 1".
  - It did NOT model multi-section rooms: one printed number spans several C_ROOMS_N objects ("a section of room #25"). Here the actor is in C_ROOMS_26 while #25 selects C_ROOMS_25.
- **D62:** "the same RAM room printed a different Room #N" is the same phenomenon seen from the other side (sections share or shift printed numbers).
- **D75:** the wump2ka inventory holder is the (CustomPlayer) object; that is the existing provenance for the actor.
- **D79/D84:** the location-global and learned-calibration lanes.

## Proposal (direction for attack)
- **I1.** For a story with a compiled room index, the room is the parent of the established actor (the D75 holder, CustomPlayer) WHEN that parent is a compiled indexed room object (C_ROOMS_<n>). The printed "Room #N" remains display-only (D54) and serves as a fallback selector ONLY when the actor/parent is unavailable.
- **I2.** No change for stories without a compiled index (D171's gate unchanged).
- **I3.** No name-based actor inference: the actor comes from the existing D75 holder provenance, not the "(CustomPlayer)" string.

**Tests:**
- operator save (49 -> 50; scope non-empty; the pop tab marked);
- D171's own probe (8 sessions x 30 turns, zero rooms with exit text and no marks);
- the d170 room-banner locator;
- the regression gate on wump2ka plus the cross-module set listed in D171 (Anchorhead, Zork1, Enchanter, LostPig, 905).

**Open questions for review:**
- Is the D75 holder available at the snapshot room-resolution point?
- Does a section's exit/lookahead still resolve when the actor is in a non-first section?
- How do D62 naming and the darkness P1 interact once identity is the section object?

## Native player-role witness (claude; work/investigations/wump-actor-witness.cjs; answers Codex #3072)
Route: x3, x3, x1, x1, x2 from the operator save.
- G34 and G69 hold 171 "(CustomPlayer)" on EVERY turn. These are the player-global candidates; (self object) 20 is held by no global.
- 171's parent follows every move: 50 (#25) -> 63 (#30) -> 50 (#25) -> 47 (#23) -> 50 (#25) -> 61 (#25).
- G16 and G41 equal parent(171) on every turn. This is the location global, consistent with the D84 learned-location role.
- payload.roomId is wrong in every multi-section room: 49 for 50, 54 for 63, 49 for 61. It is right only for single-section #23 (47).
- Sections are distinct places: C_ROOMS_26 "A vast, jagged icebox" and C_ROOMS_37 "A vast, rough icebox" are both "room #25" ("You are in a section of room #25"). One printed number covers several section objects with their own headings, exits and contents.
- Disqualification controls (Codex): an NPC holder is excluded because the witness is the GLOBAL-held object whose parent equals the location global each turn, not any holder. A stale/offstage holder fails the per-turn parent == location equality.

## Proposal R2
- **I1':** For indexed stories, room = the location-global value (D84 learned location / G16) when it equals the parent of the player-global object (G34) AND that parent is an indexed C_ROOMS object. All three agree per turn.
- The printed number is display/fallback only; D84 precedence is preserved (it IS the location global).
- No name-based actor inference. The globals are identified by per-turn equality on observed movement (a learned calibration like D84), not by the "(CustomPlayer)" string.

## Operator request (2026-10-10): show sections on the map
- Display each section as its own map room (true identity), grouped inside one larger frame labelled "Room #N" (the printed number as a display-only group key, D54).
- A separate map-display step AFTER identity is accepted.
- Gated to stories with a compiled room index plus "section of room #N" groups (wump2ka-style); no other game changes.

## R3 (claude, answering Codex #3077): an independent location-role witness, not derived from the player candidate
- **Independent witness (darkness transition, wump-dark-globals.cjs):**
  - On SWITCH OFF BAR, G16 and G41 change room(50) -> 19 "(darkness object)", and back on SWITCH ON BAR.
  - Only the library `location` role takes the darkness object while the real room is retained elsewhere. The player-candidate parent did NOT change (171 stayed in 50).
  - So G16/G41's role is qualified by native darkness semantics, independently of G34/G69.
  - Framed as a CALIBRATED LOCATION WITNESS (D84-style learned fact), not an actor role. The mapping actor stays separate.
- **Calibration rules (to implement only after GO):**
  1. A candidate location global qualifies after at least 3 observed moves where it changes to a new indexed C_ROOMS object together with a printed room heading change, plus at least 1 darkness transition to the darkness object (where the story has darkness).
  2. Any contradiction permanently disqualifies it for this story identity: the value changes with no move, or it holds a non-room, non-darkness object while lit.
  3. Lifecycle: the calibration is reset on restart, restore and story change (the same lifecycle hooks as D84). While the value is the darkness object, the room = the last qualified room (no map change).
  4. The player candidate is used only as a corroborating check (parent equality), never as the qualifier.
- **Negatives to prove:**
  - (a) an NPC moving between rooms with its own global (a grubling's room-holding slot) never qualifies, because it changes on turns without a player move or heading;
  - (b) a decoy global copying the location on one turn fails the threshold or the contradiction rule;
  - (c) non-indexed stories are untouched;
  - (d) D171's 8x30 probe plus the regression gate.

## R4 (claude, following Codex #3085's suggestion): a narrow MEASURED executable fact, no generic correlation
**Measured** (wump-actor-witness.cjs plus wump-dark-globals.cjs, operator save; route x3,x3,x1,x1,x2 and SWITCH OFF/ON):
- **G37 and G38:** equal the actor's section on every move (50, 63, 50, 47, 50, 61) AND keep 50 while dark. This is the real_location role.
- **G16 and G41:** equal the section on every move, and become obj 19 while dark. This is the location role.
- **G70:** always the previous section. This is the lastlocation role.
- **G34 and G69:** hold the actor 171 on every turn.
- These are the Inform library's location / real_location / lastlocation triple, by observed behaviour.

**Proposal:**
- A D204 digest-bound fact for wump2ka in ModuleStatFactsClaude (the same lane as the D216 Degeneracy playerGlobal fact): `{ realLocationGlobal: 37, locationGlobal: 16 }`.
- Validated EVERY tick, failing closed (no fact => today's behaviour):
  - the realLocation value is an indexed C_ROOMS object;
  - locationGlobal equals realLocationGlobal, OR equals the story's darkness object (the object locationGlobal holds while dark; recorded in the fact by id 19 and re-validated as parentless with an internal name).
- **Room identity** = the G37 value: ahead of D171's printed-number index, for this digest only.
- **Darkness evidence (P1)** = `location != real_location` from the same tick. This replaces text cues for this digest; text stays for all other games.
- Dark travel is handled because real_location moves even while dark (Codex: "need current real_location witness"). Teleports and scripted moves are just new G37 values; there is no "move" heuristic.
- **Cold-start limitation:** none for this digest (the fact holds from turn 1). Other games: unchanged; this is not a generic resolution.
- **Tests:**
  - the operator save (room 50 / 63 / 61 per section, the pop tab marked, Exit 1-3);
  - the dark route via the P1 harness;
  - D171's 8x30 probe;
  - a non-wump2ka digest is untouched;
  - a tampered G37 (a non-room value) fails closed;
  - the regression gate.
- **Map section display** (operator) is a later, separate step: the printed "Room #N" becomes a display-only group key.

## Final evidence for R4 (claude, answering Codex #3094)
**Executable:**
- SHA256 a18e057bd832ec381830cb7a6891fca39657eed6ad80e13446317d8766bf6bc7 (z5, 174080 bytes, games/wump2ka.z5.js).
- Header bytes 0-29: [5,0,0,1,233,128,233,129,200,133,1,10,180,207,191,31,0,16,48,52,49,49,49,57,0,66,169,189,148,24]. Release 1, serial 041119.
- This is the same digest as the operator save's SaveStates.story.

**Native dark-travel capture** (work/investigations/wump-dark-travel.cjs; SWITCH OFF BAR, x3, x3, x1, SWITCH ON BAR):
- off: G16 = G41 = 19, G37 = 50, G38 = 50. Status "Darkness".
- x3 in the dark: actor parent 63; **G37 = 63**; G16 = G41 = **G38** = 19.
- x3 in the dark: actor parent 50; **G37 = 50**; G38 = 19.
- x1 into lit #23: everything is 47.
- on: everything is 47.

**Conclusions:**
- **G37 is the only real_location slot.** It follows the actor while dark. G38 becomes 19 after a dark move, so it is excluded.
- location = G16, which equals G37 while lit and 19 while dark.
- The repeated lit route was captured earlier (wump-actor-witness.cjs).

**Fact as proposed:**
- `{ realLocationGlobal: 37, locationGlobal: 16, darknessObject: 19 }`.
- Per-tick validation, abstaining from the WHOLE fact (and from provenance) on any failure:
  - the slots are within the globals table;
  - G37 is an indexed C_ROOMS object with real RAM links;
  - G16 is exactly G37 OR exactly 19;
  - obj 19 keeps its structural invariant (parent 0, internal name, no children).
- **roomSource** = "measured-fact".
- The darkness verdict is transported as the same validated result (dark iff G16 == 19 and the fact is valid). It is not inferred from inequality alone.
- **D84 policy:** a valid fact outranks the learned location for this digest. On a contradiction (validation fails) the WHOLE fact abstains for that tick and falls back to today's resolver with no darkness stamp. There is no stale stamp.
- No actor global is added. The inventory holder stays separate.
- **Negatives:** a tampered G37 (non-room); G16 not in {G37, 19}; another digest; a story-generation change; a fresh boot; a restore.
