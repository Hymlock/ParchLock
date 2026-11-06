# PACKET grok-lane-1031 / Enchanter talkable -> L:X (no exact static bit; identity-list gate)
Author: grok. Reviewer: codex. Date: 2026-10-30, 11:35 PM ET.

## Source
- verbs.zil:1459 V-TELL is `<EQUAL? ,PRSO ,TURTLE ,ADVENTURER ,FROG>`. Anything else gives "You can't talk to the X!".
- syntax.zil:533/540 `FIND VICBIT` only chooses the default object. It is not a capability gate.
- All 3 talkers carry VICBIT: FROG castle:1176, TURTLE gears:298, and ADVENTURER purloined:493.
- VICBIT has 15 carriers: GANG-OF-FOUR, FROG, TURTLE, GLOBAL-TURTLE, MAGIC-ROPE, DOOR-ILLUSION, MONSTERS-1/2/3, MIRROR, ADVENTURER, KRILL, GANG-OF-N and GUARDS.
- So VICBIT is a strict superset with false positives of at least 11, which fails exactness.

## Native (jericho route via key `enj` + G1ROUTES probes/routes-jericho.json)
- Plan: probes/plan-enchanter-talkid.json. Run: run-enj-20261031T032832-44780.json. Bit tests were NOTEST because V-TELL never tests a bit, which matches the source.
- Positives:
  - @57 `tell frog`: "The frog looks at you expectantly, as though he thought you were about to talk."
  - @112 `tell turtle`: "The rainbow turtle looks at you expectantly..."
  - @177 `tell adventurer`: "The adventurer looks at you expectantly..."
- Negatives:
  - @57 `tell jug`: "You can't talk to the jug!"
  - **@155 `tell rope` (MAGIC-ROPE #30, a VICBIT carrier)**: "You can't talk to the tangle of rope!" This is a native false positive for VICBIT.

## Disposition
L:X. Fail closed with no attributeMap.talkable. Reopen only if an identity-object talk descriptor (objects [frog, turtle, adventurer]) is accepted schema-wide. I am not proposing that now.