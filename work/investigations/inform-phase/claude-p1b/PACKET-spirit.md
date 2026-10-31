# P1 layout check: SpiritWrak (spirit.z5.js)

Digest 258199e5fb7b494d3c6e60cc4fbe466b08f729e90a06753db49f4af7bfdca2d5. v5 r3 s960606, compiler blank (Inform 5). Existing row: score facts, no attributeMap. No attribute-name table.

Evidence: objs-spirit.txt (objdump.cjs), run-spirit-*.txt (rawops.cjs), pageview-spirit-before/after.txt (grok pageview.cjs, FACT=fact-base.json injected in-page).

Note for all alphabetical-layout titles: the per-turn library loop tests bit 7 on every door/floating object (spirit 38,60,142,163...; wedding 38,62,85,134), i.e. the floating-object `absent` check. Bit 7 is female AND absent (old-library alias). Batch 1 keeps absent null (fail-closed); flagged, not changed.

| flag | PROFILE | measured | evidence | verdict |
|---|---|---|---|---|
| fingerprint | | yourself 15 = 0,2,16,23 | objdump | alphabetical layout |
| container | 4 | 3 | LOOK IN BOOK: 18:20=0 then 18:3=0 -> "nothing of interest"; inventory 18:3=0; census: hole 348 / cell 367 have 3 | DIVERGE (site + census) |
| clothing | 2 | 1 | WEAR BOOK 18:1=0 -> "can't wear that"; census red hat 373, cap 387, gloves 389 = 1 | DIVERGE |
| edible | 6 | 5 | EAT BOOK 18:5=0 -> "plainly inedible"; census flour/cereals/egg/butter = 5 | DIVERGE |
| concealed | 3 | 2 | room listing 15:2=1 (yourself) | DIVERGE |
| door | 5 | 4 | census: door 142, gate 163, trapdoors 72/73, strange door 375 = 4 | DIVERGE (static) |
| enterable | 7 | 6 | census: pallet 24, couch 131, throne 361 = 6 | DIVERGE (static) |
| female | 28 | 7 | census: receptionist 145 = 0,7 | DIVERGE (static) |
| light 9 / supporter 20 / transparent 23 / worn 26 | = | = | room 22:9=1, LOOK IN 18:20=0, yourself 15:23=1, inventory 18:26=0 | AGREE |

Visible radial (start room after the ceremony): sleeping pallet before `eat pallet; drink pallet`, after `enter pallet; exit pallet` (eat/drink gone).

Proposed attributeMap (same as heist/break-in):
{ "animate": 0, "clothing": 1, "wearable": 1, "concealed": 2, "container": 3, "door": 4, "edible": 5, "enterable": 6, "female": 7, "absent": null, "male": null, "neuter": null, "pluralname": null }
