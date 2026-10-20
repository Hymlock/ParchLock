# Moonmist (Moonmist.z3.js) - ZIL completion (claude lane, R3/R3.1). Auditor: codex.
Census row: lightSource U, on U, wearable C, worn U, animate C, edible U, takeable S, playerRoot S, status Os, rooms O,
actors X, underlineVsDict X, descriptors X, identical UD, onoff U, wornItems U, consumed U.
Static flags: ONBIT 10 (32, rooms lit), LIGHTBIT 24 (brass lantern 153, your lamp 164, +1), WEARBIT 29 / WORNBIT 21 (the
scan's examples are rooms - check what these flag names mean in this source before using them); no FOOD/EAT/DRINK.
No jericho walkthrough key; opening = front gate, player wearing the tweed outfit.

## Native so far (zil-walkdiff.cjs, fresh boot)
- "i" -> "You are holding the tweed outfit (actually, wearing it)."
- "take off outfit" at the gate -> "...this isn't a good place to undress." (location rule; no bit change)
- "wear outfit" -> "(The tweed outfit is already being worn!)"; "wear ornament" -> "(You aren't holding a dragon!)"
- "turn on lamp" at the gate -> "You can't reach it from here." (lamp is in your bedroom)
Next: route to your bedroom (lamp on/off for on/lightSource; undress/dress for worn); whole-source check of WEARBIT/WORNBIT
meaning (rooms as carriers suggests a different use) and of EAT handling.

## Whole-source findings (historicalsource-moonmist)
- WEARBIT is reused: on ROOMS it marks the castle "WING-ROOMS" (castle.zil:23-60, FLAGS ... WEARBIT on rooms
  731/847/973/...); on OBJECTS it is wearability (V-WEAR verbs.zil:4330-4336 tests FSET? PRSO WEARBIT). So the committed
  attributeMap.wearable 29 is the right bit for objects; consumers must never treat a room's bit 29 as wearable (rooms
  are not offered Wear today - keep it that way). WORNBIT 21 also appears on a room (847) - same caution.
- Eating: V-EAT (verbs.zil:2033) refuses everything ("It's hard to believe you're that hungry."). Handlers: DINNER EAT
  -> "You take a bite and find it delicious." (castle.zil ~1631, dinner scene only); ink (colors.zil:429) DRINK/EAT kills
  the player (FINISH); wine bottle (tower.zil:212) refuses; MOON EAT -> smell ocean.
  => edible = NO-DEDICATED-BIT + PROVEN-ALTERNATIVE candidate (dinner handler); native capture needs the dinner scene.
