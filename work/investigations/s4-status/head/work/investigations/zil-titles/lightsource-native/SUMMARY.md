# lightSource native evidence (claude worker, 2026-10-31; tier T1: fresh native play.html walk, unforced, no RAM/fact writes)
| Title | Bits | Native | Verbs | Verdict |
|---|---|---|---|---|
| Infidel | BURNBIT 11 exact (lightable), ONBIT 21 exact (lit) | match 46 + bronze torch 198: light tests 11 TRUE, sets 10+21; shovel 33/pickaxe 37 test 11 FALSE "You can't light that." | on: light X / strike match; off: extinguish torch (clears 10+21), blow out match | MEETS 2+1 |
| Cutthroats | bit 27 (not in flags json), ONBIT 17 | flashlight 116 tests 27 TRUE; turn on sets 17, off clears; key 143/watch 6 refuse | turn on / turn off (light also works) | single owner + behaviour + 2 negatives (only portable light) |
| Enchanter | LIGHTBIT 22 (lit state), ONBIT 8 | 22 TRUE on lit candle 204, lantern 94 after FROTZ; book 144 FALSE; turn on refused "broken, beyond repair" (light only via FROTZ) | on: none by verb; off: turn off lantern clears 8+22; candle cannot be extinguished | MEETS 2+1 for lit STATE; only 'turn off' when lit is a real option |
| Wishbringer | FLAMEBIT 11 (candle 65 only) | candle never in scope in a 184-step walk | light/snuff/blow/extinguish in dictionary | census only - needs a route |
| PlunderedHearts | LIGHTBIT 25 (torch 9, chandelier 59) | torch never in scope over 189 steps | light/extinguish/douse | census only - needs a route |
| TheWitness | LIGHTBIT 25 = cigarette 43 | matches are a feelie ("don't seem to work"); lantern 48 "You can't turn on"; lamp 159 furniture | none | REFUTED - no usable light |
| Deadline | ONBIT 23 | crystal lamp 50: can't turn on/off, take "Surely you jest" | none | REFUTED - scenery |
Key point: LIGHTBIT semantics differ per title (lit state vs lightable vs smokable). A name-based key would be wrong;
bits must be mapped per title from native play. Evidence: probe.cjs, static.cjs, static-census.txt, per-title run.json
+ MANIFEST.sha256 in this directory.
