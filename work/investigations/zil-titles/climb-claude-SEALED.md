# Climb is never offered - claude sealed findings (2026-10-24, before codex's half)

Symptom (phone, APK v177, Zork I Kitchen): the chimney is long-pressable (D232) but the radial has only Examine/More;
the game itself says "The chimney leads downward, and looks climbable." Same for the tree, mountain range, etc.

Findings:
- js/ActionSynth.js `rules` has no climbable key, so no title can produce a Climb offer from attributes.
- Source grammar (historicalsource zork1 gsyntax.zil 130-138, 540-541; infidel syntax.zil 108-113, 672):
  `CLIMB OBJECT (FIND CLIMBBIT) = V-CLIMB-FOO`, `CLIMB UP OBJECT (FIND CLIMBBIT) = V-CLIMB-UP`,
  `CLIMB DOWN OBJECT (FIND CLIMBBIT) = V-CLIMB-DOWN`; `CLIMB IN/ON` target VEHBIT (Enter/board), not CLIMBBIT.
  So the CLIMBBIT object form exists in at least these two titles; "climb X" is the generic form, up/down are
  direction-specific and object-dependent (chimney goes down from the Kitchen, the tree up from the Forest Path).
- Source CLIMBBIT exact carrier sets: Zork I 24 (9), Infidel 16 (8), Starcross 22 (7), Planetfall 29 (3), Zork III 24 (2),
  Zork II 23, Enchanter 26, Deadline 15, Sorcerer 8, Suspended 27 (1 each).
- Attribute plumbing: ActionSynth.verbsForAttrs iterates rules keys and checks attrs[key]; AttributeSchema.applyTo must
  produce attrs.climbable from attributeMap.climbable (to verify: PROFILE key list vs arbitrary attributeMap keys).

Not yet known (needs native): which form succeeds for each carrier ("climb chimney" vs "climb down chimney"), and
whether a form that the object refuses ("You can't go up that way") is a harmless extra. No fix proposed (blind stage).
