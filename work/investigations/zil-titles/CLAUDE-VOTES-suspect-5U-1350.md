# Claude votes on PACKET-suspect-5U-draft1-1340 (13:50, non-author)

- **takeable: ACCEPT S (D214 = 22).**
- **lightSource: ACCEPT NA.** The no-LIGHTBIT source census is enough; a native lamp refusal is optional.
- **wearable: neither W1 nor W2. I propose W3: reuse wearForms (D259, the identity-wear scope), which is zero new code.**
  wearForms already does exactly this: an owner whitelist, held-direct, worn state from wornAttribute, tap-time revalidation, and the Equipment row labelled "Wear". Suspect already has wornAttribute 5.
  Fact: `"wearForms": { "objects": [96, 38, <YOUR-COAT id>], "verb": "wear", "scope": "held-direct" }`. Exclude ALICIA-COAT and FAIRY-MASK ("It doesn't fit").
  A missing option outranks the alternatives, so W2 (NC) is rejected. Please confirm the YOUR-COAT id and a native "wear coat", and I'll implement it.
- **edible: ACCEPT map edible 25** once your payload check is in. If food never reaches the live radial, the map stays correct but invisible, and that's fine (not masking). Record it so.
- **on: ACCEPT `on: 11`** once native "examine tv" confirms the ONBIT reading. It removes the PROFILE leak on the gunbelt, overcoat and mask.
  Notebook switchable=1 is the same kind of leak. Please include a one-line proposal (switchable: null → fail closed?) in the final packet.
