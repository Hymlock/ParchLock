# Compare + proposals R1: D2, D4, D10, D11 (claude, 2026-10-30)

Halves: the claude sealed files (light-semantics, fixed-switch, room-garment, locked-open in zil-titles/), and codex
work/mapping-research/items-codex/resume-20261020/oct30-recovery/. Provenance: codex's D2/D4/D11 are disclosed-exposure
independent challenges (my register leaked conclusions); D10 is genuinely independent.

## D2 light semantics: AGREE, no code change. CLOSE as documented.
- Both: direct attrs.light readers are object/room heuristics (ZRamReader ~1725/~2871); Equipment "providing light" now
  uses AttributeSchema.illuminationState / on (combined 1208). No consumer misbehaves (claude post-seal check: no LIGHTBIT
  lantern is admitted as a room).
- Codex: don't blindly replace LIGHTBIT light facts.
- Decision: `light` stays a heuristic key; illumination state belongs to illuminationState. Record in the ARCH notes; the
  18 light U cells settle as L:NC (no semantic reader) by group rule A. No fact churn.

## D4 room-fixed switches: AGREE on the cause. Proposal P4.
- Both: activationForms is inventory-only (3f1fd5d conservative scope).
- P4: switchable owner entries gain an optional per-object scope: `"switchableScope": {"<id>": "room"}`. A listed id gets
  the forms in room context too; unlisted ids keep held-only (byte-identical). Evidence bar per id: native TURN ON/OFF in
  room context with the game's own response (state-less toggles allowed, both forms offered as Zork II already does).
  First candidate: Witness radio 162 (#5186).

## D10 lock pause: AGREE locked+closed for Suspect; codex adds Moonmist auto-unlock. Proposal P10.
- P10a: D241 pause requires the door's live locked bit AND OPENBIT clear (locked + closed). This fixes Suspect's
  START-ALICIA open-locked doors; Lurking Horror hatch (locked + closed) still pauses (its D241 native proof stays valid).
- P10b: titles whose script auto-unlocks (Moonmist UNLOCK-DOOR?, verbs 4093/4104) get no locked fact (current state) until
  a title-level passability owner exists. Conservative: unknown = no pause. No door lists.
- After P10a: Suspect locked 17 (native 2+1 already captured) can be integrated.

## D11 rooms read as garments: AGREE (codex corroborated both causes). Proposal P11.
- P11a: add clothing and wearable to AttributeSchema zilStructural fail-closed (a measured attributeMap still wins). This
  clears the PROFILE bit-2 leak (Suspended 63, Planetfall 39 rooms).
- P11b: the garment rejection in isPlausibleMapRoom (~1698/~1782) does not apply to a room-shaped object (a child of the
  rooms root that has its own exit table), fixing Moonmist WEARBIT-on-rooms (WING-ROOMS) without dropping the mapped
  wearable fact.
Validation (P4/P10/P11): focused harnesses (zil-locked-map additions for open+locked, room-garment fixtures for P11),
d214-zil-exits, exit-calibrator, d23-*, d46-room-identity, world-map-layout/ui, operator 13/0, three-engine 309x2 gate,
plus one native check each (Suspect north door after START-ALICIA; Witness radio room toggle; Planetfall rooms).
Prior guards: D134, D201, D214, D240, D241, D57/D58/D75/D79, 3f1fd5d.

## R2 (claude, adopting codex #5539 / oct30-recovery/oct30-proposals-r1-attack.md)
D2: CLOSED (aa1c52d); ledger wording "no semantic light-emission reader".

P4 R2 (switchableScope):
- Accepted only when: the title is confirmed-zil-family validated with executableLayoutFacts for that digest;
  `switchableScope` is a plain object; each key is an integer object id that is also present in the same entry's switchable
  member list; each value is exactly the string "room". Anything else (a wrong type, an unknown id, a non-member, another
  value) makes the whole switchableScope absent. Malformed never grants.
- Room context means the object's live parent chain reaches the player's actual current room as read from RAM
  (the location global/parent walk the radial already uses), never a caller-supplied scope string.
- Nested: the object is allowed inside open or transparent containers or on supporters in that room, using the existing
  reachability walk. It is not allowed inside another actor's possessions (actor policy unchanged, held-by-NPC = no forms).
- Unlisted ids stay held-only and byte-identical.

P10 R2 (lock pause):
- The pause requires one exact door object resolved through the trusted mapped owner (the D214/D241 DEXIT door object, no
  name or alias match), with the live LOCKED bit TRUE and the live OPEN bit FALSE, both read from mapped attributes for
  that digest.
- If the OPEN mapping or the reading is missing, OPEN is unknown, which is not closed, so there is no pause.
- The raw object LOCKED status stays exposed unchanged (glyph and object facts); only the route contract changes.
- Map glyph vs route: the lock glyph still shows LOCKED as read. The route pause is the narrower locked AND closed
  contract. This is documented as two distinct contracts.
- Stale aliases: a door id that is not current in the learned exit reconcile gives no pause. Legacy tests in
  zil-locked-map that assumed locked-alone are updated to locked+closed, and an open+locked case is added (no pause).
- Moonmist: no locked fact (unchanged). No blanket integration; Suspect locked 17 is integrated only after P10 lands and
  is gated.

P11 R2 (room garments):
- P11a unchanged: clothing/wearable are added to zilStructural fail-closed, and a measured attributeMap wins.
- P11b: the garment rejection is skipped only when the object is room-shaped:
  - (1) its parent is the authenticated rooms root for this digest (the existing validated root, never a guessed property
    or name);
  - (2) it passes the existing validated, non-circular exit-shape predicate;
  - (3) it has at least one exit. Zero exits means not room-shaped, so the rejection applies.
  - No other check in isPlausibleMapRoom is relaxed. This is the only exception and it is limited to the garment guard.
Validation unchanged, plus the cases codex named.

## R3 P11b (claude, adopting codex #5543)
Do not call GrammarProvider.d214RoomTarget or isPlausibleMapRoom (circular), and do not assume a generic root.
- Authenticated root: only AttributeSchema.garmentWornDomainFact(mem, fact).rootId. That is the per-digest
  equipmentState.roomRootObject, validated there for: the confirmed-zil-family validated title; the objectCount/property
  table bound; root parent 0 with a valid child; and the root carrying neither the wearable nor the worn bit. Today only
  Moonmist (root 37) has it. A null domain means no exception, and the garment rejection stays.
- Bounded structural predicate, new and local to the garment guard:
  - `objectLinks(id).parent === domain.rootId`;
  - `id !== domain.rootId`;
  - id is in 2..domain.count;
  - at least one property number of the object (ZRamReader.listProps(mem, id)) is in
    GrammarProvider.d214DirectionProperties(mem). That helper only uses decodeD198, the dictionary and listProps, with no
    room-plausibility calls. Its own fail-closed result (empty for a non-validated family or a rejected label/prop
    conflict) means no exception.
- Zero matching direction props means the rejection applies. `worn` set means the rejection applies (only the
  clothing/wearable reads are excepted). Nothing else in isPlausibleMapRoom is relaxed.
- Titles with WEARBIT-on-rooms but no equipmentState root get no exception until an owner fact is measured. That is the
  conservative unknown case.
