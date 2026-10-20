# Border Zone (Borderzo.z5.js) - ZIL completion (claude lane, R3/R3.1). Auditor: codex.
Census row: supporter C, lightSource UD, on U, wearable X, animate C, edible U, takeable S, playerRoot C, status Os,
rooms O, actors U, underlineVsDict X, descriptors X, identical UD, onoff U, wornItems X, consumed U.
Static source flags: WEARBIT 41 (10), WORNBIT 39 (6); ONBIT/LIGHTBIT/FOOD/EAT/DRINK/ACTOR/PERSON none (static scan).
Boot: chapter menu needs a character key (zil-walkdiff.cjs STARTKEY=1|2|3).

## Whole-source search (historicalsource-borderzone-5c80126)
- LIGHTBIT: no occurrence. ONBIT: only desc.zil:217, inside the commented-out ;<ROUTINE DESCRIBE-SPECIAL> (no live code).
- V-ON (verbs.zil:851): CANT-TURN "n" -> "You can't turn that on." for every object. LIGHT and TURN ON both map to V-ON
  (syntax.zil:317/618). Object ON handlers: MATCHES-F (bad.zil:201) and CIGARETTE-F (bad.zil:223) both refuse.
- V-EAT (verbs.zil:485) refuses everything ("Your incipient ulcer..."); V-DRINK refuses. Overrides: CAFE-FOOD-F refuses
  (bad.zil:1559); FOOD-F (vendor food + SODA, bad.zil ~1950-1975) ACCEPTS EAT/DRINK ("You take a moment to finish the ...").

## Native evidence (zil-walkdiff.cjs, STARTKEY=3, fresh boot, no relocation)
- inventory: "a matchbook, a cigarette, a Gurthark Mark VI revolver and a business card"
- "light matches" -> "You've tried this before on the train - the matches don't work..." (MATCHES-F refusal)
- "turn on cigarette" -> "You haven't a lighter and the matches you're carrying have proven themselves useless..."

## Proposed closures (codex audit)
| key | state | evidence |
|---|---|---|
| on | FEATURE-ABSENT | whole-source: no live ONBIT/LIGHTBIT code, universal V-ON refusal, both object ON handlers refuse; native refusals on both owners (matchbook, cigarette) |
| lightSource | FEATURE-ABSENT (was UD; same evidence) | as above |
| edible | NO-DEDICATED-BIT + PROVEN-ALTERNATIVE (FOOD-F vendor food/soda) | source; native EAT/DRINK of vendor food still to capture (hand route to the vendor) |

Edible native capture needs story state: vendor food/soda are takeable only after CART-TOPPLED? (VENDOR-STUFF-F bad.zil:1987-2000; alley rooms ~1640-1682 off Town Square, chapter 3). Needs a hand route that topples the cart; edible stays OPEN (source-only PROVEN-ALTERNATIVE candidate) until captured.

## Wearable41 independent native audit
Border Zone wearable41 independently accepted from Grok4128: native chronograph81 and parka244 WEAR successes, oilcan4 bit41 false/refused, current bounded351-object domain with no room owners. Current native Equipment reports both wearable/worn with Remove, agreeing with native i; existing worn39 unchanged. Operator13/0; chapter2-selecting base/candidate map/inventory/underline parity0diff, plus LostPig InformZ and Alabaster Glulx controls. Generic Borderzo no-prompt rows excluded and replaced with chapter2 replay. Exact semantic delta1field, no shared algorithm. Evidence: work/mapping-research/items-codex/resume-20261020/border-wear/. Whole-title completion is not claimed.
