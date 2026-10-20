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

## Opening route (native, 2026-10-20; zil-walkdiff.cjs EXTRA)
look | out (leave the sports car) | push eye (wyvern on the gate) | Ms. Ann Smith | yes | red (favourite colour) | yes ->
"The red eye turns green, and the front gate creaks open." | s | s | s ... -> scripted introduction: Tamara greets you in
the courtyard, Lord Jack, Bolitho, Vivien, Hyde, Ian, Iris (cutscene moves through foyer/drawing room/new great hall).
During the introduction "turn on lamp" -> "(The light is already on!)" and "turn off lamp" -> Tamara: "Please don't leave
us in the dark." (a room lamp, not your lamp). Next: let the introduction finish (wait), then great hall -> up -> gallery
-> east = your bedroom (castle.zil:1799-1814, 1981) for your lamp on/off and undressing.

## Native evidence: your bedroom (route above + wait x5 | u | e | ... | e | wait x3; reached "Your room is decorated in
## shades of red ... a night table with a lamp on it")
- "turn on lamp" -> "(Your lamp is already on!)"; "turn off lamp" -> "Okay, it is now off." your lamp 164 -10;
  "turn on lamp" -> "Okay, it is now on." 164 +10  => on = ONBIT 10 (source-predicted), 1 object set+clear.
- "take off outfit" -> "Okay... My, what a fine figure of a woman!" tweed outfit 78 -21; "wear outfit" -> "Okay." +21
  => worn = WORNBIT 21 (source-predicted), 1 object clear+set. Earlier: undress refused at the gate (location rule) and
  while Tamara is present ("I wish you wouldn't change clothes while I'm here!") - state rules, not incapability.
Second distinct objects still needed: on (drawing-room lamp / brass lantern 153), worn (dinner outfit).

## Native evidence: worn second object (same route, then in your bedroom)
"open luggage" -> dinner outfit, exercise outfit, nightshirt, tourist brochure; "take dinner outfit"; "take off tweed
outfit" -> tweed 78 -21; "wear dinner outfit" -> "Ahhh! Nothing like a new outfit to change your whole outlook!" dinner
outfit 217 +21 (+5); "take off dinner outfit" -> 217 -21.
Proposed: worn = NATIVE-PROVEN bit 21 (WORNBIT): 2 distinct objects (tweed 78, dinner 217), each set and cleared natively.
Negative still to add explicitly: wear a held non-garment (e.g. tourist brochure) -> refusal, no bit 21.
