# Lurking Horror held Coke: no Eat/Drink (claude blind investigation)

blind; investigator not exposed to codex findings; the claude seat lead was exposed to the Border Zone authored Eat/Drink pair design and therefore delegated

## Facts
- DECISION-INDEX: only D150 matches (Inform edible->Drink inference, Anchorhead). No Lurking food decision.
- Source (hacker.zil:526-534): `OBJECT COKE (FLAGS TAKEBIT FOODBIT OPENABLE) (SIZE 5) (HEAT 0) (ACTION COKE-F)`. Food is a FLAG (FOODBIT), not identity. Other FOODBIT owners: CARTON (449), CHINESE-FOOD (489), SNACK (597).
- Syntax: `EAT OBJECT (HELD CARRIED ON-GROUND IN-ROOM MANY) = V-EAT`, `DRINK OBJECT (...) = V-DRINK` (syntax.zil:158,171).
- V-EAT (verbs.zil:614) tests HEAT property + FOODBIT -> "It tastes <heat>." COKE-F handles DRINK (decrements SIZE, caffeine). V-DRINK default = "You can't drink that".
- Native replay (zil-walkdiff, 61 steps + i/eat/drink): Coke = object 61, parent 56 (player), attr bits [1,2,6,24]. `eat coke` -> "It tastes cold." ; `drink coke` -> "Delicious! Contains caffeine..." Both succeed (drink is the real action).
- App rows at every step: `examine | take | drop | give coke to | put coke in` - no eat, no drink.
- Which of bits 1/2/6/24 is FOODBIT was NOT traced with test_attr here (3 source flags + 1 runtime bit). Bit 6 coincides with Inform PROFILE edible=6; unproven that it is FOODBIT.

## Cause (code path)
1. Lurking fact block js/ModuleStatFactsClaude.js:732-770: attributeMap = {open,isOpen 13, container 27, supporter 8, animate 31, on 15}; NO `edible` entry, NO attributeObjects/capabilityForms. FOODBIT was never measured for this title (contrast Zork I line 777 `edible: 21` with grok1 proof).
2. Eat: AttributeSchema.bitFor('edible') (js/AttributeSchema.js ~190-252) has no measured map; edible is not in zilStructural, so it falls to Inform PROFILE 6. Whatever it yields, ActionSynth.trustworthyAttrs (js/ActionSynth.js:206-233) forces every SEMANTIC_FLAG incl. `edible` to false for a non-Inform story unless AttrCalibrator.hasConfirmedFlag or AttributeSchema.measuredFlagOwner -> neither exists for Lurking edible -> `copy.edible=false` (line ~229) -> verbsForAttrs never adds `eat`.
3. Drink: ActionSynth.edibleDrinkAllowed (js/ActionSynth.js:58-66) returns false for any ZIL story (requires isInformCompiled) - D150 inference is Inform-only by design; the only ZIL Drink route is AttributeSchema.edibleForms authored pair (capabilityForms.edible = ['eat','drink'], Border Zone line 324-325), absent for Lurking -> edibleFormPolicy returns null -> rules.edible = ['eat'] only, and even that is gated by (2).
4. LearnedWords.independentForms (js/LearnedWords.js:136) uses the same attrs + edibleDrinkAllowed, so the word list misses both for the same reasons.

## Relevant mechanisms
- Measured attributeMap `edible` (Zork I 21, others) -> Eat via measuredFlagOwner.
- Identity attributeObjects.edible (lines 175, 324) + capabilityForms edible pair (Border Zone) for Eat+Drink on ZIL.
- D145 (ZIL semantic flags fail closed), D150 (Inform-only drink inference), D147 vocabulary gate.
- Root: missing measured FOODBIT fact for Lurking, plus no ZIL mechanism grants Drink from FOODBIT (Coke's real verb is DRINK, handled by COKE-F identity).
