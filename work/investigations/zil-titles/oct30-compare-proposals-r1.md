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
