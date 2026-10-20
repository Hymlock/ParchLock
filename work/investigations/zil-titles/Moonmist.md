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
