# Independent audit: batch-r17 (switchable lamp/flashlight, Zork II / Hollywood Hijinx / LGOP)

Verdict: **ACCEPT all three** (Zork II, Hollywood Hijinx, LGOP). Two non-blocking notes are listed at the end.

## 1. Bits and ids
- Zork II (row js/ModuleStatFactsClaude.js:6): source-flags ONBIT bit 19 exact (26/26, examples are all rooms), LIGHTBIT bit 31 exact with one positive, `76:lamp`. In the probe (grok1/switch/zork2.json), 76 has bits [2,17,31], and TURN ON sets 19 and TURN OFF clears it. The held sword is refused. Ids and bits match.
- Hollywood (row :481): source-flags ONBIT 20 exact (all room examples) and LIGHTBIT 3 exact (3 positives: computer 103, film projector 191, slide projector 133). Flashlight 123 is not among the matched source positives, but the RAM census and the probe both show 123 carrying bit 3, with TURN ON setting 20 and TURN OFF clearing it. The fixed projectors and computer are correctly left out. The ids are correct.
- LGOP (row :174): source-flags ONBIT 30 exact (60 positives, room examples) and LIGHTBIT 25 exact (flashlight 110 and blender 186). The probe shows 110 toggling 30 both ways. The blender is momentary ("Whirr.", 30 never set) and the torch is fire with an irreversible OFF, so leaving both out is correct.

## 2. Consumers
- AttributeSchema.objectCapabilityIds (js/AttributeSchema.js:164-189) needs the digest row, no attributeMap.switchable, and confirmed-zil-family. It returns [76]/[123]/[110]. attributeMap.switchable is absent from all three rows, so this path is active.
- AttributeSchema.activationForms (:385-406) returns forms only when context === "inventory" and the id is in ids, and only when the grammar has `turn on`/`turn off` templates. Otherwise it returns []. No room or other object gets the forms.
- ActionSynth (js/ActionSynth.js:78-81, 119-131): the switchable key and projectGeneratedActivation both go through the policy above. For any other object in these titles the policy is [], so a generated "turn on/off" is dropped (null). That is fail-closed for all other objects.
- activationStateAllows (:596-614) is true only for ids in onObjects ⊆ ids. EquipmentUI.activationStateTags (js/EquipmentUI.js:224-231) therefore badges only 76/123/110.
- The new `attributeMap.on` has only two readers outside facts:
  - EquipmentUI.js:231: state tag, already gated as above.
  - ZRamReader.js:2837 `wrapperAttrs.on`: item-likeness for nameless "(" wrapper children. Rooms have names and are never contents. The non-room ONBIT carriers (Zork II 243@0, Hollywood 69@0) sit at parent 0 and are never walked, so there is no practical effect.
  - roomLitAttribute (ZRamReader.js:2375-2383) reads `localScope.roomLitAttribute` directly. For Zork II it is the same bit (19, :8), and the shared meaning is consistent with source ONBIT. No other light/dark consumer (DarkScope, StatTracker) reads attributeMap.on; grep found none.
- Net change: Turn on/off plus an active/inactive badge on the one held light per title, and nothing else.

## 3. Both forms offered regardless of state
activationForms returns the fixed pair. State only drives the badge and never filters the forms. Ballyhoo radio 48 behaves the same way. Under missing-first this is acceptable: both commands are native-valid, and the redundant one gets the game's own harmless reply. Choosing the form from the state would be a separate, cross-title enhancement, not a defect of this batch.

## 4. Single-owner exception
- Zork II: LIGHTBIT exact 1/1 (lamp), and V-LAMP-ON (gverbs.zil:830) switches only LIGHTBIT objects, so two distinct carriers cannot exist. Justified.
- Hollywood: there are 3 source LIGHTBIT objects, but only the flashlight has TAKEBIT. The others are fixed and unreachable from the inventory-only radial. Justified as a single holdable owner, with the negatives held paper (BURNBIT route) and mailbox.
- LGOP: there are 3 holdable LIGHTBIT objects, but only the flashlight keeps on/off state. Blender and torch are excluded with probe and source reasons. Justified as a single stateful owner. This is the weakest of the three, but it fails closed.

## Non-blocking notes
- The Hollywood source-flags LIGHTBIT positives omit the flashlight (an unmatched source object). The fact rests on the RAM census and the probe, which is sufficient.
- These are desktop/probe proofs only. Per the radial-first rule, an on-phone long-press check is still owed.
