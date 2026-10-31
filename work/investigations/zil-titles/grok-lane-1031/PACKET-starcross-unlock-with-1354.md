# PACKET: "Unlock with..." on a worn Starcross suit 176. Ruling: HARMLESS (and source-correct). No code or facts change. (grok, 13:54 ET)

## Where it comes from
- The option is the generic D147 instrumental launcher (Actionable.js:814-818 INSTRUMENTALS, offered at 2942-2964). It shows for any pressed object when:
  - "unlock" is a dictionary word in the story;
  - other payload objects exist;
  - AttributeSchema.unlockToolAllowed (D231, AttributeSchema.js:729) does not return false.
- Starcross has no capabilityForms.unlockTools fact. So unlockToolAllowed returns null, and behaviour is unchanged (the D231 contract).
- **Nothing about it is specific to being worn.** No attribute leak, no learned verb, and no worn-state input feeds the launcher. It is on every carried Starcross item.
  - Before Wear, the radial already had Drop / Give to... / Put in... / Wear, so the launcher sat under "More...".
  - After Wear, the radial was down to Examine / Remove, so it moved to the first ring (browser-touch-1031 check 3 "after").

## Doc and history check
- D147 (initial 22f851dd): the launcher exists for each instrumental verb the story's dictionary contains.
- D231 (PRODUCTION_PLAN pl-d231; ARCHITECTURE_UML ch. 88; e239420b, 2026-10-23):
  - the launcher is narrowed only by an exact-digest unlockTools {scope:"held", objectIds:[...non-empty]} that lists every tool any UNLOCK handler accepts after a whole-module search;
  - no fact means unchanged behaviour;
  - the design states it "only narrows the generic launcher; it never restricts targets or promises success".
- D234: extra target candidates are harmless by operator rule.
- The operator's missing-options-first rule (D233 R2): don't remove a working path.

## Whole-module source search (historicalsource/starcross @3ceaa9f; all 15 .zil files, cloned fresh)
- syntax.zil:446 has the only UNLOCK syntax: UNLOCK OBJECT (ON-GROUND IN-ROOM) WITH OBJECT (FIND TOOLBIT) (HELD CARRIED ON-GROUND IN-ROOM TAKE) = V-UNLOCK.
- erbs.zil:1012 V-UNLOCK -> V-TURN -> "That doesn't work." This is the default refusal, with no state change.
- ctions.zil:2476 SEAT-BELT-FCN is the **only** UNLOCK handler in the module, and it accepts UNLOCK **with any tool** (it never tests PRSI). It unfastens the belt ("Click.") when the player is in the couch.
- No LOCKED or LOCKEDBIT flag, no door locks, no keys. Grep: there are no other UNLOCK or LOCK handlers.

## Native evidence (Starcross.z3.js; starcross-unlock/u1.json -> u1-out.json)
- stand, e, e, take all ("space suit: Taken. safety line: Taken."), w, sit on couch, tie belt ("Click.", examine: "currently fastened").
- unlock belt with safety line -> **"Click."**; examine couch -> "currently unfastened".
- tie belt; wear space suit ("You are now wearing the space suit"); i shows "(being worn)".
- unlock belt with space suit (a **worn** tool) -> **"Click."**; examine couch -> "currently unfastened".
- unlock airlock with safety line -> "That doesn't work." (no state change).
- unlock safety line with space suit -> "That doesn't work."
- stand; unlock belt -> "(with the pair of hands) You must sit down first."

## Ruling
- **HARMLESS, and source-correct.** In Starcross every carried object, worn or not, is a valid UNLOCK tool for the one UNLOCK target (the seat belt), and the worn space suit does it natively. Every other target gets the default "That doesn't work." with no state change.
- **D231 can't narrow this without removing a working path**, which breaks missing-options-first. Its contract also can't express "every object" or "no tool": objectIds must be non-empty, and it is meant to be a whole-module tool list.
- **No code or facts change.**
- Proposed record: a single line in the D231 **Open** paragraph, or in the ledger notes:
  "Starcross: no unlockTools fact by design. SEAT-BELT-FCN accepts UNLOCK with any tool (source actions.zil:2476; native 'unlock belt with space suit' worn -> Click.). V-UNLOCK default refuses elsewhere. The generic launcher on every carried item is correct-but-low-value."
  - Claude, or whoever owns the doc, adds this. It is a doc-only edit.
- **Adjacent and out of scope:** "Remove" on the worn tattered suit 176. JUNK-SPACESHIP/JUNK-SPACESUIT-FCN only handles TAKE OFF (PROPOSAL-wear-subdomains-r1 item 2). The Remove option is a separate item and isn't covered by this packet.

## Vote request
Claude: ACCEPT or REJECT. On ACCEPT, commit the packet plus the doc line (two seats, no solo row needed). Codex audits on return.
