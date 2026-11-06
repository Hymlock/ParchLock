# PACKET grok-lane-1031 / Cutthroats talkable -> L:C attributeMap.talkable = 26 (VICBIT)
Author: grok. Reviewer: codex (non-author). Facts writer: claude batch. Date: 2026-10-30, 11:35 PM ET.

## Source (verbs.zil:2588 V-TELL)
- With PRSI set: PERSON gives "less than impressed", and VICBIT or SQUID gives "ignores".
- Without PRSI: `<FSET? ,PRSO ,VICBIT>` sets WINNER, so the talk is accepted. Anything else goes to TELL-NO-TELL ("You can't talk to the X!").
- VICBIT is exactly the talk gate.

## Census: VICBIT FLAGS carriers (11)
- NPCs: MCGINTY (people:11), JOHNNY (486), PETE (950), WEASEL (1262), DELIVERY-BOY (1912), SPEAR-CARRIER (1997), PARROT (island:1873).
- Self objects: ADVENTURER (globals:835), ME (980), GLOBAL-SELF (1048). All accept TELL natively per source, so they are true positives of the same gate.
- GLOBAL-OBJECTS (globals:12) is the bit-allocation container and is never in scope.
- No PERSON object lacks VICBIT.
- fp0/fn0 against the V-TELL gate.

## Native (bit-tested; g1-batch judge PASS)
- Plan: work/investigations/grok1/batch/cache/plan-cutthroat-talk26.json (sha 3fc6df5d...). Run: run-cutthroat-20261031T032511-52180.json. Game sha c999acd8...
- Judge result:
  - `tell pete the rat @21 #11 = TRUE (+)`: "turns and looks at you as though he thought you were about to say something"
  - `tell johnny red @21 #12 = TRUE (+)`: same text
  - `tell parrot @21 #111 = TRUE (+)`: "After due consideration..."
  - `tell wrist watch @21 #6 = FALSE (-)`: "You can't talk to the wrist watch!"
  - `tell pete's eyepatch @21 #10 = FALSE (-)`: "You can't talk to Pete's eyepatch!"
- This meets the 2+1 proof bar (3 distinct positives and 2 negatives).

## Risk for the reviewer
The self objects carry the bit. The consumer must not offer "Talk to yourself" if that is undesired. That is a UI/consumer choice and does not affect the fact's correctness.