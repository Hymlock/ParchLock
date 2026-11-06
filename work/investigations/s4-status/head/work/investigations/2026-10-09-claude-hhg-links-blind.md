# HHG word links, Take and latency, plus Treasures labels: claude sealed findings (#1981/#1982)

Measured on the current checkout (APK63 source), read-only. Scratch probes:
harness/_hhg2_probe.js (the operator's 19-14-16 save) and harness/_hhg3_probe.js
(a fresh route: turn on light, get up, take gown, wear gown, look in pocket, i).

**L1. "large" links to the analgesic.**
- Analgesic 116's NATIVE aliases are analgesic/tablet/aspirin/pill/large/buffered.
- "large" (an adjective in the ZIL dictionary) is a valid alias, so the prose
  "Luckily, this is large enough" (the gown) marks the analgesic.
- **Hypothesis:** a lone ADJECTIVE alias must not trigger a mark. Use the D198
  dictionary part-of-speech flags (noun/object vs adjective) where an adapter
  exists. Adjectives only count inside a phrase together with a noun.

**L2. Long descriptive names leak common words as triggers.**
- 216 "thing your aunt gave you which you don't know what it is" has
  `namePhrases` = the full name plus thing, aunt, gave, don't, know.
- Its native aliases are only thing/gift/aunt's.
- "gave", "don't" and "know" are ordinary prose words, so they mark the
  thing (the operator's "which" belongs to the same class).
- **Hypothesis:** single name tokens may trigger only when they are the
  object's OWN vocabulary (vocabulary-key equality with an alias). The full
  name phrase still matches. Generic; no stop-word list.

**L3. Take is inverted for ZIL.**
- Fixed scenery offers TAKE: bedroom 193, wallpaper 102, curtains 63,
  telephone 190, bed 114.
- The genuinely takeable screwdriver 105 and toothbrush 31 do NOT.
- **Hypotheses:**
  - (a) `attrs.takeable` comes from an Inform-oriented profile and is
    unreliable for ZIL (D73/D134 note);
  - (b) the D205 refusal learner may have learned "take" as refused after
    HHG's scripted hangover fumble ("slips through your fumbling fingers"),
    which is a TEMPORARY condition, not object incapability.
  To verify: AttrCalibrator.allowedVerbsFor/disabled forms for 105/31 and the
  ZIL TAKEBIT source. D190 gates Take on promoted objects by declaration.

**L4. Radial latency.**
- `resolveObjectCommands` took about 172-179 ms PER object on the restored
  save, against about 9 ms on the fresh route.
- The restored save had a long last reply (the restore text plus the
  bulldozer death).
- **Hypothesis:** `payloadPool()` is rebuilt on EVERY call (twice per
  resolveObjectCommands), re-running promoteUnnamed and observedPossessions
  with vocabularyKey over the whole lastReplyText (O(words x aliases)). Cache
  the pool per Refresh/signature.

**L5. Nested held items "not linked".** In the fresh route, the inventory
children of the gown (analgesic, fluff, thing) ARE marked with Take. Needs the
operator's exact state; the 19-14-16 save restores into the bulldozer death
with an empty inventory (a single save, key 1).

**L6. Treasures inventory labels show truncated dictionary words** (armor,
flashligh, space-ra, sword). D201 / commit 543b0be "Preserve observed item
descriptors" was meant to show the observed label. Needs checking: does
EquipmentUI display `name` (raw alias) instead of the observed phrase (the
`observedPhraseFor` display name)? Codex #1858 earlier verified full labels on
save 1, so this may be a newer regression or a different surface (the
radial or the inventory list).

## L3 measured (harness/_hhg_take.js)

Before AND after the hangover fumble, the values are identical, so this is
NOT D205 refusal learning (allowed [] and disabled null in both).

HHG is not Inform-compiled and has no declared attribute names, yet:

| Object | takeable | scenery |
|---|---|---|
| Screwdriver 105 | false | TRUE |
| Bedroom 193 | TRUE | false |
| Wallpaper 102 | TRUE | false |

The Inform default attribute profile is being applied to a ZIL story's bits,
which inverts Take. **Fix direction:** for non-declared, non-Inform stories,
the takeable, scenery and static flags must come only from a calibrated or
fact-owned ZIL bit (AttrCalibrator confirmed flags, or a module fact like
wornAttribute), never from the Inform default numbering. Without trusted
evidence, Take stays absent, the D24 honest absence. Same discipline as the
worn-owner precedence.

## TAKEBIT from static grammar (answers codex #1987; harness/_zil_takebit.js)

An Infocom fixed-family syntax line is 8 bytes:
[objectCount, prep1, prep2, FIND1, FIND2, opts1, opts2, action]. FIND1 is the
attribute the parser uses to find a direct object, which for bare TAKE is
TAKEBIT. Select the "take" verb's line with objectCount === 1 and no
prepositions. Its action equals the action of the "take X from/out of Y"
lines (V-TAKE).

| Game | Line | TAKEBIT | Action |
|---|---|---|---|
| HHG (v5, fixed) | 1,0,0,41,0,52,0,126 | 41 | 126 |
| Zork1 (v3, fixed) | 1,0,0,17,0,52,0,93 | 17 | 93 |

HHG objects with bit 41: screwdriver 105, toothbrush 31, gown 206, analgesic
116 and telephone 190 (it dodges, but is takeable in principle). Without bit
41: bedroom 193, wallpaper 102, curtains 63, bed 114.

That is exactly correct, statically, with no Inform profile. A generic
evidence path:
- D198 `confirmed-zil-family` plus a validated grammar;
- a single bare TAKE line with FIND1 nonzero and below the attribute count;
- cross-validation: at least one object with that bit that the player has
  successfully TAKEN, when calibration exists;
- the "variable" family needs its own byte layout before use, so it is absent
  until verified.
Then `takeable := attr(FIND1)` for that story, and the Inform default never
applies.
