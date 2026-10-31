# lightSource radial check (2026-10-30, read-only, HEAD js/)

Method: `work/investigations/zil-titles/lightsource-radial/run.cjs` reuses the audit-r43/radial.cjs `load()` harness
(live js/ ZRamReader + AttributeSchema + ActionSynth in a vm, story bytes from games/). For each title every object whose
short name matches lamp|lantern|torch|flashlight|match|candle|light|glow is reparented to the player (story-initial state,
not a walk) and placed in `payload.inventory`; the radial is `ActionSynth.commandsForPayloadObjectId(id)`.
Player id: name-detected, Witness=79/Spellbreaker=52 from ModuleStatFactsClaude, else first id that yields "drop".
Caveat: not Playwright and not a walked state; it is the same composer the app uses, at start-of-game attributes.
`lightSource=false` on every row: the key is not surfaced by AttributeSchema today (no consumer), so every
"turn on/turn off" below comes from `switchable` alone. No "light" verb is ever offered.

| Title | Light object(s) | Radial | Class |
|---|---|---|---|
| Zork1 | brass lantern 164; candles 147 | turn on/off | OK (torch 104, matchbook 155: no light; torch is lit natively) |
| Zork2 | lamp 76 | turn on/off | OK |
| Zork3 | lamp 198 | turn on/off | OK (torch 41 none) |
| Enchanter | brass lantern 175, battered lantern 94 | examine/drop/give/put | MISSING |
| Sorcerer | brass lantern 192 | turn on/off | OK |
| Spellbreaker | none carried | - | N/A |
| Planetfall | portable lamp 25 | turn on/off | OK |
| Stationfall | headlamp 141 | turn on/off (+wear) | OK |
| Infidel | bronze torch 198; match/matchbook 44-49 | no light | MISSING |
| Wishbringer | candle 65 | no light | MISSING |
| Hitchhik | none (only "light" scenery) | - | N/A |
| Starcross | none (light beam scenery) | - | N/A |
| LurkingHorror | flashlight 132 | turn on/off | OK |
| Witness | Brass Lantern 48, lamp 159, match book 53 | no turn on/light | MISSING |
| Deadline | crystal lamp 50 | no turn on | MISSING (likely furniture lamp; low impact) |
| Ballyhoo | "light" 58 only | - | N/A |
| Moonmist | brass lantern 153 | turn on/off | OK ("your lamp" 164 none) |
| Cutthroats | flashlight 116 | no turn on | MISSING |
| Seastalker | brass search light 212 (sub fixture) | none | N/A (fixture) |
| Suspect | no candidate | - | N/A |
| Suspended | no candidate | - | N/A |
| HollywoodHijinx | flashlight 123 | turn on/off | OK (matches 20/171 no light) |
| LGOP | flashlight 110 | turn on/off | OK (matchbook 56 none) |
| PlunderedHearts | torch 9 | no light | MISSING |
| Borderzone | matchbook 152 | harness could not place in inventory | N/A/unverified |

## Raw output
```
## Zork1-TheGreatUndergroundEmpire.z3.js player 4
   104 "torch" switchable=false lightSource=false ["examine","drop","give to","put in"]
   105 "Torch Room" switchable=false lightSource=false ["examine","drop","give to","put in"]
   147 "pair of candles" switchable=true lightSource=false ["examine","turn on","turn off","drop","give to","put in"]
   155 "matchbook" switchable=false lightSource=false ["examine","drop","give to","put in"]
   164 "brass lantern" switchable=true lightSource=false ["examine","turn on","turn off","drop","give to","put in"]
   166 "burned-out lantern" switchable=false lightSource=false ["examine","drop","give to","put in"]
   210 "broken lantern" switchable=false lightSource=false ["examine","drop","give to","put in"]
## Zork2-TheWizardofFrobozz.z3.js player 4
   45 "shimmering curtain of light" switchable=false lightSource=false ["examine","drop","give to","put in"]
   75 "broken brass lantern" switchable=false lightSource=false ["examine","drop","give to","put in"]
   76 "lamp" switchable=true lightSource=false ["examine","turn on","turn off","drop","give to","put in"]
   105 "matchbook" switchable=false lightSource=false ["examine","drop","give to","put in"]
## Zork3-TheDungeonMaster.z3.js player 200
   37 "lamp" switchable=false lightSource=false ["examine","drop","give to","put in"]
   40 "burned-out torch" switchable=false lightSource=false ["examine","drop","give to","put in"]
   41 "torch" switchable=false lightSource=false ["examine","drop","give to","put in"]
   124 "red beam of light" switchable=false lightSource=false ["examine","search","empty","close","drop","give to","put in"]
   198 "lamp" switchable=true lightSource=false ["examine","turn on","turn off","drop","give to","put in"]
   199 "broken brass lantern" switchable=false lightSource=false ["examine","drop","give to","put in"]
## Enchanter.z3.js player 21
   26 "banquet candles" switchable=false lightSource=false ["examine","drop","give to","put in"]
   67 "glowing button" switchable=false lightSource=false ["examine","drop","give to","put in"]
   94 "battered lantern" switchable=false lightSource=false ["examine","drop","give to","put in"]
   175 "brass lantern" switchable=false lightSource=false ["examine","drop","give to","put in"]
   204 "black candle" switchable=false lightSource=false ["examine","drop","give to","put in"]
## Sorcerer.z3.js player 29
   71 "depleted matchbook" switchable=false lightSource=false ["examine","drop","give to","put in"]
   182 "kerosene lamp" switchable=false lightSource=false ["examine","search","empty","close","drop","give to","put in"]
   192 "brass lantern" switchable=true lightSource=false ["examine","turn on","turn off","drop","give to","put in"]
## Spellbreaker.z3.js player 52
   63 "light" switchable=false lightSource=false ["examine","drop","give to","put in"]
   111 "Light Pool" switchable=false lightSource=false ["examine","drop","give to","put in"]
   118 "Light Room" switchable=false lightSource=false ["examine","drop","give to","put in"]
## Planetfall.z3.js player 234
   25 "portable lamp" switchable=true lightSource=false ["examine","turn on","turn off","drop","give to","put in"]
   94 "glowing button" switchable=false lightSource=false ["examine","drop","give to","put in"]
   242 "light" switchable=false lightSource=false ["examine","drop","give to","put in"]
## Stationfall.z3.js player 28
   141 "headlamp" switchable=true lightSource=false ["examine","turn on","turn off","wear","drop","give to","put in"]
## Infidel.z3.js player 221
   44 "matchbook" switchable=false lightSource=false ["examine","search","empty","close","drop","give to","put in"]
   45 "burned matchbook" switchable=false lightSource=false ["examine","search","empty","open","drop","give to","put in"]
   46 "match" switchable=false lightSource=false ["examine","drop","give to","put in"]
   47 "single match" switchable=false lightSource=false ["examine","drop","give to","put in"]
   48 "few matches" switchable=false lightSource=false ["examine","drop","give to","put in"]
   49 "matchbook" switchable=false lightSource=false ["examine","search","empty","open","drop","give to","put in"]
   198 "bronze torch" switchable=false lightSource=false ["examine","drop","give to","put in"]
## Wishbringer.z3.js player 23
   65 "candle" switchable=false lightSource=false ["examine","drop","give to","put in"]
## Hitchhik.z5.js player 58
   46 "light" switchable=false lightSource=false ["examine","drop","give to","put in"]
   100 "light" switchable=false lightSource=false ["examine","take out of it"]
## Starcross.z3.js player 73
   235 "light beam" switchable=false lightSource=false ["examine","drop","give to","put in"]
## TheLurkingHorror.z3.js player 29
   70 "light" switchable=false lightSource=false ["examine","drop","give to","put in"]
   132 "flashlight" switchable=true lightSource=false ["examine","turn on","turn off","drop","give to","put in"]
## TheWitness.z3.js player 79
   48 "Brass Lantern" switchable=false lightSource=false ["examine","drop","give to","put in"]
   53 "match book" switchable=false lightSource=false ["examine","drop","give to","put in"]
   159 "lamp" switchable=false lightSource=false ["examine","drop","give to","put in"]
## Deadline.z3.js player 1
   50 "crystal lamp" switchable=false lightSource=false ["examine","drop","give to","put in"]
   132 "light" switchable=false lightSource=false ["examine","drop","give to","put in"]
## Ballyhoo.z3.js player 29
   58 "light" switchable=false lightSource=false ["examine","drop","give to","put in"]
## Moonmist.z3.js player 42
   80 "ornate candle sconce" switchable=false lightSource=false ["examine","drop","give to","put in"]
   153 "brass lantern" switchable=true lightSource=false ["examine","turn on","turn off","drop","give to","put in"]
   164 "your lamp" switchable=false lightSource=false ["examine","drop","give to","put in"]
   211 "light" switchable=false lightSource=false ["examine","drop","give to","put in"]
## Cutthroats.z3.js player 181
   116 "flashlight" switchable=false lightSource=false ["examine","drop","give to","put in"]
## Seastalker.z3.js player 112
   212 "brass search light" switchable=false lightSource=false ["examine","drop","give to","put in"]
   230 "sonarscope warning light" switchable=false lightSource=false ["examine","drop","give to","put in"]
   234 "depth finder warning light" switchable=false lightSource=false ["examine","drop","give to","put in"]
## Suspect.z3.js player 98
## Suspended.z3.js player 0
## HollywoodHijinx.z3.js player 21
   19 "blue candle wax" switchable=false lightSource=false ["examine","drop","give to","put in"]
   20 "red match" switchable=false lightSource=false ["examine","search","empty","close","drop","give to","put in"]
   87 "glowing mop" switchable=false lightSource=false ["examine","drop","give to","put in"]
   123 "flashlight" switchable=true lightSource=false ["examine","turn on","turn off","drop","give to","put in"]
   171 "green match" switchable=false lightSource=false ["examine","search","empty","close","drop","give to","put in"]
   173 "red candle wax" switchable=false lightSource=false ["examine","drop","give to","put in"]
   240 "white candle wax" switchable=false lightSource=false ["examine","drop","give to","put in"]
## LeatherGoddessesofPhobos.z3.js player 16
   56 "matchbook" switchable=false lightSource=false ["examine","drop","give to","put in"]
   110 "flashlight" switchable=true lightSource=false ["examine","turn on","turn off","drop","give to","put in"]
## PlunderedHearts.z3.js player 15
   9 "torch" switchable=false lightSource=false ["examine","drop","give to","put in"]
## Borderzo.z5.js player 30
   152 "matchbook" switchable=false lightSource=false ["examine","take out of it"]
```
