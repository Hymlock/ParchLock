# "Unlock with..." offered on food/paper - claude sealed findings (2026-10-23)

Symptom (phone, Lurking Horror test APK): held Chinese food (90) and assignment (97) radials offer "Unlock with...".
Screens: work/investigations/r3-claude/phone-food/radial-Chinese_food.png, radial-snack.png (assignment).

Findings:
- Source: Actionable.INSTRUMENTALS (js/Actionable.js:814-818, D147): held-item instrumental launchers "Use with...",
  "Cast at...", "Unlock with..." ("unlock <target> with <this item>"), offered for EVERY held item whenever the verb is
  a dictionary word (availableInstrumentals). D147 only checks that the verb exists in the game.
- So "Unlock with..." on the Chinese food means "unlock X with the Chinese food". It is offered regardless of whether
  any locked or lockable target is in reach and regardless of whether the item can act as a key.
- Game data that can decide it:
  - Grammar instrument slot: Zork I <SYNTAX UNLOCK OBJECT (ON-GROUND IN-ROOM) WITH OBJECT (FIND TOOLBIT) ...> (zork1
    source :516) restricts the key to TOOLBIT holders; Lurking <SYNTAX UNLOCK OBJECT (ON-GROUND IN-ROOM) WITH OBJECT
    (HELD CARRIED HAVE) = V-UNLOCK> (:587) does not restrict the key; Ballyhoo has only <SYNTAX UNLOCK OBJECT>.
  - Target side: a decoded locked/lockable owner in current scope (attributeMap.locked / LOCKEDBIT where measured).
- Cause: the instrumental launcher has a vocabulary gate only; neither the target (something lockable/locked in reach)
  nor the instrument (grammar FIND restriction) is consulted.
No fix proposed (blind stage). Note: Ballyhoo has no WITH form for UNLOCK at all, so "Unlock with..." there would not
parse as built; worth checking in the comparison.
