# grok review: A1 touchpoint map + A1 current source

Reviewer: grok (non-author). 2026-11-04 ~6:45 PM ET.
Reviewed hashes (match a1-source-review-hashes.json): ActionSynth 23621211c6896458ee810706b85bb3f56b28101555775f926d630e7fb8a41479, Actionable 5b374b53f164dbc270904c923fca34c7114969c076ff7bcb6f878a7cc4a91168, EquipmentUI 18781ab2248731ce1fef9cd491639f22d33f3a8060edd40260aede3c0b5286f6, SemanticActions e8491543a307af9d88bd5b2845aa5f23dfc818df682bcbe5097c59a7b2e7b75f, ModuleStatFactsClaude 950e20bcef108138ee87f70f5a9b984569c8e9d1f9d02da8811f3c31619ea96c.

## Touchpoint map: ACCEPT
All four of my R2 conditions are mapped:
1. Cheap UNOWNED exit plus deep-equality controls on 25 ZIL, Inform, Glulx and the other Suspect owners.
2. The map was published before root commit.
3. BLOCKED only drops unary REMOVE; Drop and Wear labels are kept.
4. If a combined run has an unresolved diff, isolate both before reverting.

## Source: ACCEPT (hash-bound), with non-blocking notes
Checked:
- UNOWNED is the first exit. It needs a digest lookup (identityForPath), the fact, and an own `removalReferences` field, and it needs the id to be in objects. normalize returns the SAME object for non-remove verbs and for unowned. So unowned modules and other Suspect objects are unchanged.
- Recognized-owner strictness: an exact key set, plain objects, no symbols, verb/scope literals, ZIL-only (rejects informAttributeNames), a validated ZIL family with a bare 1-object REMOVE template, the true property-table frontier, unique ids, nouns in the dictionary, the worn bit set with parent == measured player, single inventory custody, and a unique/verified reference. Any failure leads to blocked, which drops REMOVE only.
- Tap: qualifiedRemovalCommandCurrent rebuilds policy and compares all 7 scope fields plus command/noun/objectId, and checks authored/learned form allowance. Shared/actor/target variants are rejected on all surfaces: Actionable 2721 suggestions, 2769 shared lists, 2785 radialCommandCurrent, the 2891 slice build, EquipmentUI add/filter/select, and the ActionSynth 810 actor exclusion.
- Learned: learnedItemScopeFor uses the scope noun only after the current check; existing guards are retained.
- Z3 overlap: none. Suspect is fixed-family and its decoded templates are deep-equal under Z3 (my C1).
Notes (please disclose or test; none blocks):
- N1. ActionSynth ~588 promotes context room->inventory for the scoped owner for ALL verbs of object 38, not only Remove. That is truthful custody, but please make sure the focused harness shows the other labels for 38 (Wear/Drop/Examine) are unchanged versus pre-A1, apart from the intended Remove.
- N2. Policy rows require integer payload ids (`Number.isInteger(o.id) && o.id === id`). If a payload ever carries string ids, it fails closed, and Remove disappears for the mask. That is acceptable but worth a comment.
- N3. radialCommandCurrent learnedWordScope branch: `Actionable.referenceFor(authoredOwner).noun` assumes a non-null reference. This is consistent with existing code but unguarded.
- N4. Stale taps across a generation change are rejected by design. A Remove tapped right after an undo/restore shows nothing; that is acceptable.
Verdict: ACCEPT A1 source at the hashes above. Root commit remains Codex's. The final combined gate is Codex's.