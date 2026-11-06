# PACKET names-shifted 9 (grok, 1421 ET). Verdict: OK, no fact needed
These titles have extra attributes declared before animate, so every library bit shifts by k. The names path picks up the shift automatically.
Check per title: the self object's bits must equal the names-map {animate, concealed, proper(=open+2), transparent(=supporter+3)}, and then the in-page pool must be plausible. Files are in inform-plan/<t>-{pageview,objdump}.txt.

| title | shift k | self bits | names map anim/conc/open/supp/worn | page check |
|---|---|---|---|---|
| building | +1 | (map) | 1/4/15/21/27 | ground is enterable+supporter; walls and window are scenery. OK |
| degen | +1 | 1,4,17,24 ✓ | 1/4/15/21/27 | Baron's corpse = supporter+male (21,28): a corpse, so not animate, correct. Gear (symbol, mail, sheath) is worn 27 on StandardPlayer 157 = EQ. OK |
| Swineback | +2 | (map) | 2/5/16/22/28 | breastplate worn, "remove". OK |
| Savoir-Faire | +3 | 3,6,19,26 ✓ | 3/6/17/23/29 | well = container+door (the shaft), water edible+transparent (drink), shed enterable. Game data. OK |
| Aug4 | +5 | 5,8,21,28 ✓ | 5/8/19/25/31 | "Jim and Rob" (392) = animate, proper, scenery, pluralname (3,5,21,22,35); "hooked nose" is just its short-name quirk. OK |
| yagwad | +5 | (same as Aug4) | 5/8/19/25/31 | machine static, objects scenery. OK |
| HugeCave | +6 | (map) | 6/9/20/26/32 | Knapsack container+openable+worn, "remove". OK |
| blues | +8 | (map) | 8/11/22/28/34 | knapsack wearable container, NPC Engine concealed. OK |
| bookvol | +6 | 6,9,22,29 ✓ (self and yourself 364) | names map | **Static only.** The game opens on a char-input prompt, and pageview and raw ops time out waiting for a LineInput. The objdump self bits match the shift; no page check is possible with the current tools. |

All rows: attrSource = names. Nothing to fix. Next I'll take the 46 exact titles as a batch confirm.
