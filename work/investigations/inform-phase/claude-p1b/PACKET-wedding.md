# P1 layout check: The Wedding (wedding.z5.js)

Digest 2ab09dc0227163e8cb6916a1a3008dc25ef8698464dd7f3353dcaf1225bb81e5. v5 r4 s970602, Inform 6.05. No existing fact row (new row). No attribute-name table.

Evidence: objs-wedding.txt (objdump.cjs), run-wedding-*.txt (rawops.cjs), pageview-wedding-before/after.txt (grok pageview.cjs, FACT=fact-base.json injected in-page).

Note for all alphabetical-layout titles: the per-turn library loop tests bit 7 on every door/floating object (spirit 38,60,142,163...; wedding 38,62,85,134), i.e. the floating-object `absent` check. Bit 7 is female AND absent (old-library alias). Batch 1 keeps absent null (fail-closed); flagged, not changed.

| flag | PROFILE | measured | evidence | verdict |
|---|---|---|---|---|
| fingerprint | | yourself 20 = 0,2,16,23 | objdump | alphabetical layout |
| container | 4 | 3 | LOOK IN STONES 30:3=0, TAKE 29:3=0 (drive); census wardrobe 56, rivers 75/138 = 3 | DIVERGE (site + census) |
| clothing | 2 | 1 | WEAR STONES 30:1=0 -> "You can't wear that!" | DIVERGE (negative site) |
| edible | 6 | 5 | EAT STONES 30:5=0 -> "plainly inedible"; census pizza 124 = 5 | DIVERGE |
| concealed | 3 | 2 | listing 20:2=1, 29:2=1; TAKE STONES 30:2=1 | DIVERGE |
| animate / female | 0 / 28 | 0 / 7 | TAKE GUARD 28:0=1, 28:7=0; census mother 24, Deborah 44, Barbara 92, Chloe 114 = 7 | AGREE / DIVERGE |
| door / enterable | 5 / 7 | 4 / 6 | census hidden/bathroom/hall/cellar/wooden doors, gate = 4; tables, chair, stool = 6 | DIVERGE (static) |
| supporter 20 / transparent 23 / worn 26 | = | = | 29:20=1 drive, 20:23=1, inventory 30:26=0 | AGREE |

Visible radial (start): gravel drive and stones tagged clothing/wearable now -> concealed after. Commands unchanged at start; doors/tables/wardrobe elsewhere lose eat/drink and gain open/enter as in break-in.

Proposed attributeMap (new row):
{ "animate": 0, "clothing": 1, "wearable": 1, "concealed": 2, "container": 3, "door": 4, "edible": 5, "enterable": 6, "female": 7, "absent": null, "male": null, "neuter": null, "pluralname": null }
