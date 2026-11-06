# Independent adversarial audit: batch-r16 (attributeMap "door" = DOORBIT, 13 ZIL titles)

Reviewer: independent read-only subagent, 2026-10-24. No product edits, no bus calls.

## Verdict summary

| Title | door bit | Source DOORBIT (2026-10-11-zil-source-flags.json) | Native evidence | Verdict |
|---|---|---|---|---|
| Zork I | 23 | 23 exact 6/6 | r3-claude/doorbit/Zork1: kitchen window 235 and trap door 183 OPEN/CLOSE toggle bit 11; OPEN LEAFLET refused | ACCEPT |
| Zork II | 22 | 22 exact 6/6 | r3-claude/doorbit/Zork2: barred window 101 OPEN 0->1, oak door 102 OPEN 0->1 after locked refusal; OPEN SWORD refused. CLOSE never exercised (2 opens, no toggle back) | ACCEPT (weak: open-only) |
| Zork III | 9 | 9 exact 5/5 | secret door 156, stone door 104, wooden door 103 toggle bit 12; OPEN BREAD refused | ACCEPT |
| Enchanter | 24 | 24 exact 7/7 | cell door 202 toggles bit 12 (one object only); iron gate 232 door-specific refusal; OPEN BREAD refused | ACCEPT (one toggling object + one door-specific refusal) |
| Sorcerer | 24 | 24 exact 5/5 | heavy door 164, heavy wooden door 251 toggle bit 15; OPEN NOTE refused | ACCEPT |
| Lurking Horror | 25 | 25 exact 9/9 | door 84 toggles bit 13; elevator doors 115/225 open/close; OPEN FLASHLIGHT refused | ACCEPT |
| Hollywood Hijinx | 10 | 10 exact 5/5 | no toggle; "You'll have to unlock it first." on OPEN DOOR / OPEN PATIO DOOR (oak door 117, patio door 25); OPEN CARD refused | ACCEPT (weak, see note H) |
| Planetfall | 26 | 26 exact 9/9 | door 173 toggles bit 11; escape pod bulkhead 231 opens; OPEN LADDER refused | ACCEPT |
| LGOP | 26 | 26 exact 6/6 | codex door-lgop-native: wide cell door 202 and narrow cell door 176 toggle bit 15; tray 205 (door26 false) refused | ACCEPT |
| Plundered Hearts | 26 | 26 exact 12/12 | codex door-ph-native: large cupboard 45 and canvas hatch 137 toggle bit 16; slippers refused | ACCEPT |
| Ballyhoo | 27 | 27 exact 6/6 | codex door-ballyhoo-native: trailer door 44, cage door 164 toggle bit 15; negative in door-ballyhoo-negative.json ("You can't open a fiberglass pole.") | ACCEPT |
| Wishbringer | 2 | 2 exact 15/15 | **r4-grok2/doorbit/Wishbringer.z3.js.json: "doorPos": [], "ok": false, failed list for 1/9/19/40; negative is an out-of-scope parser reply ("You can't see any instrument here!")** | **OBJECT** |
| Suspect | 27 | 27 exact 28/28 | codex door-suspect-native: east/west entry hall doors 241/240 toggle bit 13; ribbon refused | ACCEPT |

## (1) Bits and collisions

All 13 values equal the source DOORBIT bit (`work/investigations/2026-10-11-zil-source-flags.json`, each `exact: true, fp 0, fn 0`).
Loaded `js/ModuleStatFactsClaude.js` with node and checked each row: the door bit is shared with no other attributeMap key,
and differs from localScope roomLitAttribute / invisible, wornAttribute and inventoryHiddenAttribute in every row
(rows at lines 6 Zork II, 64 PH, 90 Wishbringer, 109 Zork III, 130 Ballyhoo, 171 LGOP, 231 Enchanter, 254 Sorcerer,
287 Suspect, 443 Planetfall, 474 HH, 818 LH, 873 Zork I). No collisions.

Note: runtime carrier counts exceed the source "positives" for several titles (Zork III 8 vs 5, Enchanter 8 vs 7,
Sorcerer 6 vs 5, LH 15 vs 9, Planetfall 15 vs 9, HH 10 vs 5, Wishbringer 18 vs 15). The source scan matched by name, so
duplicate-name objects (Planetfall "door" x4, LH "elevator doors" x5, HH "closet door" x4) and unnamed objects
(HH 69, LH 82) are not counted. Not a bit error, but "exact" overstates the object-level match.

## (2) Evidence quality

- Wishbringer: the only cited grok2 file has zero door positives and `ok: false`. The negative did not reach the object
  (blurry-vision parser refusal). Nothing native proves bit 2. OBJECT until a real run shows two door toggles of bit 25
  and a reached non-door refusal. Carriers also include non-doors (stump 19, circulation desk 73, chain 204, glass case 235).
- Hollywood Hijinx (note H): only "unlock it first" refusals; no OPENBIT toggle (HH row maps no open bit at all). The
  r3-claude JSON header records `openbit 25, containerbit 4`, which are Wishbringer's bits, not HH's; harmless for this row
  but the file metadata is wrong. Whether the refusal is DOORBIT-specific is asserted, not shown by a bit-test trace.
- Zork II: two distinct OPEN 0->1 transitions, no CLOSE. Acceptable under ">=2 positives" but not a toggle pair.
- LGOP negative "open tray" -> "It's the looney bin for you!": tray already open15 TRUE, door26 FALSE; it is an
  object-specific refusal, acceptable.
- Ballyhoo native file's in-file "open pole" row was interrupted (Chuckles ejects the player); the separate
  door-ballyhoo-negative.json supplies a clean refusal.

## (3) Consumers of attrs.door

- `js/ActionSynth.js:12` rules.door = ["open","close"]. In `verbsForAttrs` (ActionSynth.js:142-152) the openCapability
  gate `capOk` is applied only when `key === "container"`; the door rule is NOT gated by openCapability.
  Every form still passes `authoredCommandAllowed` (ActionSynth.js:95-114): `AttributeSchema.containerOpenState`
  (AttributeSchema.js:411-430) returns null unless the object carries the container bit, so
  - doors without the container bit (Zork I all 6, Zork II barred window, Zork III cleft, Planetfall all, Sorcerer all,
    LH non-elevator doors, HH all, Enchanter iron gate) get BOTH Open and Close regardless of state;
  - doors that also carry container (Zork II 102/136/171/173/197, Zork III all but cleft, Enchanter all but 232,
    LH 31/82/89/115/118/119/122) get the D229 state choice (Open when shut, Close when open).
  HH has no open bit mapped and no openCapability; containerOpenState needs both owners, so HH doors always show both.
- `js/ZRamReader.js:1679` isPlausibleExitTarget now admits named DOORBIT objects as exit targets; `ZRamReader.js:1792`
  isPlausibleMapRoom rejects them (D134). For ZIL, exits come from `ExitCalibrator.exitsFor`; `_d214ZilExitsFor`
  (ExitCalibrator.js:162-193) reads DEXIT dest from byte 0 and the door from byte 1 separately, and calibrated `destFor`
  modes are proven against real travel, so a door id should not appear as a destination. Residual risk only: if a
  calibrated mode ever read a DEXIT door byte, the door would now pass the exit-target gate and could become a map node.
  Recommend the regression-gate map diff on these 13 titles before commit.
- isDoor flags (ExitCalibrator.js:147/474, ZRamReader.js:2583) read attributes of the DESTINATION room; no DOORBIT
  carrier is a room, so these stay false. ZRamReader.js:1725 affects only blank-named objects (HH 69, LH 82, parent 0).
- No `attrs.door` consumer in AttributeSchema.js or Actionable.js; no lockable/unlock offer is derived from door.

## (4) Non-door / never-open carriers

- Zork I front door 181 and living-room wooden door 111: "The door cannot be opened." Harmless extra Open/Close.
- Zork III cleft 106: harmless extra (no container bit, so both verbs offered).
- Planetfall escape pod bulkhead 231: Open floods the pod, which is the scripted escape and the walkthrough action, not
  an instant death; Close refuses. Doors 203 and bulkheads 229/230 start open but still show Open (no container bit).
- Enchanter iron gate 232 / rusty gate 108 / gate 194, Sorcerer toll gate 56: refusals or NPC/spell-driven; harmless.
- LH elevator doors: CLOSE presses the button; harmless. LH "office" 102 / metal plate 91: harmless extras.
- Wishbringer stump/desk/chain/glass case would get Open/Close if the row were accepted: unproven.
None found that causes death or irreversible loss from the offered verb alone.
