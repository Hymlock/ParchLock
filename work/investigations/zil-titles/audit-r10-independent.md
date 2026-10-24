# Audit r10 (independent, read-only) — batch-r10.diff localScope roots-only facts

Reviewer: claude subagent standing in for codex. Inputs: work/investigations/zil-titles/batch-r10.diff,
work/investigations/r3-claude/localscope3/*.json, 2026-10-11-zil-source-flags.json, js/ZRamReader.js:2366-2420.
Room/property scan: localscope3/static.cjs logic run against each story (A.story), plus dictionary/synonym decode.

## Consumer recap (js/ZRamReader.js:2366-2420)
Returns [] unless room has `roomLitAttribute` (2383); admits a property id only if parent == holder (2412);
skips INVISIBLE / empty / "(" names (2393); no contents walk without `contents:"search"` (2416).

## (1) Bits
| Title | lit | ONBIT source | INVISIBLE | attributeMap conflict |
|---|---|---|---|---|
| Zork II | 19 | 19 exact 26/26 | 9 tp6 fp0 fn1 | none ("on" 19 withdrawn for objects at ModuleStatFactsClaude.js:10; room-lit use is a different claim, source-exact) |
| Sorcerer | 11 | 11 exact 34/34 | 19 exact | "on":11 at :252 equals lit 11 |
| Infidel | 21 | 21 exact 13/13 | 30 exact | no "on" mapped (:230) |
| Hollywood | 20 | 20 exact 26/26 | 29 exact | no "on" mapped (:450) |

Zork II INVISIBLE miss: 2dungeon.zil INVISIBLE owners are BAT(wooden club 190), DIM-DOOR(secret door 171),
IRON-BOX(steel box 83), CAGE(solid steel cage 56), CANDY(55), GENIE("demon"). RAM bit 9 at boot is set on
190/171/83/56/55 but NOT on demon 26 (parent 0). The fn is the demon. Its parent is 0, not holder 249, so
ZRamReader.js:2412 never admits it as a local root: no exposure. Of the real holder-249 children only secret
door 171 carries bit 9 and is correctly skipped.

## (2) Evidence JSON matches claims
- Zork II: Foot Bridge 228 GLOBAL=[bridge,chasm]; Great Cavern 227=[mosses]; Narrow Tunnel 229 lists stream;
  run: examine stream/bridge/mosses positive, reciprocal "You can't see any ..." refusals; Dark Tunnel 225 has no
  GLOBAL prop, "It is pitch black". Confirmed.
- Sorcerer: Hallway 67=[heavy wooden door 251], Lobby 18=[opening,road,stairs177(par31),doorway];
  Your Quarters 17 lit=false, "It's too dark to see!" before FROTZ; reciprocal refusals. Stairs 177 skipped by
  parent check, as disclosed. Note: Your Quarters stays room-unlit after FROTZ (lit by the carried book), so bed
  will not be offered there: a missing option, consistent with positive-only lit, not a wrong one.
- Infidel: Your Tent 71 lists flap 209, River Bank 82 lists water 74; positives and reciprocal refusals present.
- Hollywood: Front Porch 185 lists oak door 117, SW Junction 31 lists garden 241; positives/refusals present.

## (3) Abstractions / unknown words among holder children — which rooms list them
| Title | object | rooms listing it | shown? |
|---|---|---|---|
| Zork II | pseudo 13 | none | never |
| Zork II | stairs 188 | Cerberus 177, Oddly-angled 182, Stairway 189 — all room-unlit | never under positive-only lit |
| Sorcerer | pseudo | not a holder child | never |
| Hollywood | pseudo 242 | none | never |
| Infidel | gem 190 | Neith 135, Isis 137, Antechamber 192 — all room-unlit | never; synonyms lazuli/obsidi/jasper/gems are valid words anyway |
| Infidel | thicket 80 | Southern Path 65, Outside Supply Tent 68, River Bank 82 (lit) | yes; "thicke" in dictionary, native positive at 68 (run-thicket.json). Out-of-room reply "I see no thickets here." is the game's own handler. Correct. |
| Infidel | mirage 25 | Desert 26 (lit) | YES |

Mirage: dictionary has no "mirage"; its synonyms are gort, klaatu, fish, buffal (an authored easter egg object).
The game itself puts it in Desert's GLOBAL list, so admitting it is faithful to game data. Whether a
long-press yields a parseable command depends on which noun the app sends (name "mirage" -> "I don't know the
word"; alias "gort" -> game reply). Harmless (no state change). Under no-masking, a name-based exclusion is not
justified; a general fix (send a parser alias when the short name is not a dictionary word) is the right lane,
outside this batch. Not blocking.

## Verdicts
- Zork II (abf145d2, ModuleStatFactsClaude.js:8): ACCEPT. INVISIBLE fn is demon 26, parent 0, unreachable via holder 249.
- Sorcerer (3bf24a3d, :239): ACCEPT. Lit 11 == mapped "on" 11.
- Infidel (91f78d4b, :227): ACCEPT with note (Desert mirage shows; unparseable by short name; follow-up general alias-noun check, no exclusion).
- Hollywood Hijinx (e3341f28, :446): ACCEPT. pseudo listed by no room.
