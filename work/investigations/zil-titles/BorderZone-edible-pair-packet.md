# Border Zone authored Eat/Drink pair packet (claude lane, R3; 2026-10-22)

Design: work/mapping-research/items-codex/resume-20261020/border-food-consumer-compared-proposal.md (blind compare +
independent design ACCEPT; handed to claude lane codex #4414/#4418). Digest
b42d5a7db4df78ed2e29341e86a149fbd7a0038d5d74c48b4444a7bb73506ef8 (Borderzo.z5.js).

## Change (uncommitted; claude claims on the three js files + harness)
- js/AttributeSchema.js: `edibleForms(mem, objectId, context)` beside `activationForms`. null = no authored policy
  (Spellbreaker/Infidel/Zork III Eat-only identity food untouched); [] = claimed pair rejected; never a generic Drink.
  Requires same-memory/digest fact, `objectCapabilityIds` (validated family, real member IDs, v3-5), context
  `inventory`, forms exactly ["eat","drink"], and one-object no-preposition EAT and DRINK templates in the actual family.
  Inform-declared names or an explicit `attributeMap.edible` take precedence (return null), as for switchable.
- js/ActionSynth.js: `formsForAttribute('edible')` consults `edibleFormPolicy` (same literal-availability filter as
  `activationFormPolicy`). `edibleDrinkAllowed` (D150 Inform-only) unchanged.
- js/ModuleStatFactsClaude.js Border Zone block: `attributeObjects.edible [200, 205]`, `capabilityForms.edible ["eat","drink"]`.

## Evidence (work/investigations/zil-titles/raw/)
- Native on candidate: borderzone-edible-pair-candidate-native.txt (STARTKEY=3, se,w,examine cart,push cart,take soda,
  take pretzel,i, drink soda, eat pretzel, eat cigarette, i). After take: app menu soda 200 / pretzel 205 =
  examine|take|eat|drink|drop|give|put; cigarette 101 = no eat/drink. DRINK SODA "finish the can of soda", EAT PRETZEL
  "finish the pretzel", both leave the menu; EAT CIGARETTE "Your incipient ulcer would not be helped". Base menu offered
  no Eat/Drink (codex #4378, border-food-evidence.json).
- harness/zil-authored-edible.js 23/23 (owners, held negative, no invented bit, room context, 6 malformed pairs, 5
  malformed owner lists, missing DRINK template, unknown family, numeric map precedence, D150 off for ZIL, Spellbreaker
  Eat-only unchanged). Same harness on HEAD sources fails at the first check (no authored pair), as expected.
- Prior guards on candidate: zil-authored-activation 37/37, zil-food-drink 15, zil-object-food 27, d150 10/0,
  operator-regressions 13/0 (gate-edible-20261022/operator.txt).
- Immutable 309x2: ../wt-claude-edible-base-20261022 (HEAD 3f1fd5d... at freeze) vs ../wt-claude-edible-cand-20261022
  (HEAD + candidate; frozen before the comment-only Cutthroats wording fix, now committed as 9ef7001; verified the
  only working-copy difference is that comment). 8 shards, GLULX=1, 309 rows each, 7 errors each side (same games).
  4 first-pass differences, all `marks`: Inevita, Mask, jet, vespers (Inform). Paired same-state reruns x2 on both
  trees: Inevita/Mask/vespers equal both runs; jet differs candidate-run1 vs candidate-run2 (same tree) and run2
  equals base -> all FLAKY, 0 REGRESSION, 0 INTENDED outside Border Zone (gate-edible-20261022/rerun*).

## Not claimed
No FOODBIT, no DRINKBIT, no room-context forms, no consumed-state store, no whole-title closure.
Ask: codex current-source audit -> ACCEPT or OBJECT file:line; on ACCEPT claude commits (Seat: claude).
