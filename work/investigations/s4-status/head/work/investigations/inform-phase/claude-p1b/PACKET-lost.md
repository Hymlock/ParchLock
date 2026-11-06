# P1 layout check: The Lost Spellmaker (lost.z5.js)

Digest 9ad23948fdf8c4c4f72fadbe1818b4f17fc50dbf9d8fc81312ba9c4e44dc2ddb. v5 r3 s980116, Inform 6.05. Existing row: no-score facts, no attributeMap. No attribute-name table.

Evidence: objs-lost.txt (objdump.cjs), run-lost-*.txt (rawops.cjs), pageview-lost-before/after.txt (grok pageview.cjs, FACT=fact-base.json injected in-page).

Note for all alphabetical-layout titles: the per-turn library loop tests bit 7 on every door/floating object (spirit 38,60,142,163...; wedding 38,62,85,134), i.e. the floating-object `absent` check. Bit 7 is female AND absent (old-library alias). Batch 1 keeps absent null (fail-closed); flagged, not changed.

| flag | PROFILE | measured | evidence | verdict |
|---|---|---|---|---|
| fingerprint | | yourself 20 = 0,2,16,23 | objdump | alphabetical layout |
| container | 4 | 3 | room listing 41:3=0 at the contents site (T); census basket 110, well 89, fire 71 = 3 (+open 14) | DIVERGE (site + census; the game intercepts LOOK IN on everything in the start room) |
| concealed | 3 | 2 | LOOK: 20:2=1 (yourself), 42..45:2=1 (photos, weaver, document, hat) | DIVERGE |
| animate | 0 | 0 | TAKE T 41:0=1 -> "wouldn't care for that" | AGREE |
| female | 28 | 7 | TAKE T 41:7=0 (male); census Daisy 67, Mrs Wisher 73, Tilly 86, Edna 94 = 7 | DIVERGE |
| door / enterable | 5 / 7 | 4 / 6 | census green door 111 = 4; armchair 70, well 89 = 6 | DIVERGE (static) |
| clothing / edible | 2 / 6 | 1 / 5 | no live objects carry 1 or 5 below the object-table end; by layout | by layout |
| scenery 17 / light 9 | = | = | WEAR DOCUMENT 44:17=1 "hardly portable"; room 40:9=1 | AGREE |

Visible radial (start room): photographs, Magic Weaver, document, hat are currently tagged clothing/wearable (they are concealed); after: concealed, scenery. Commands unchanged (examine only), so a correctness fix with no command delta here.

Proposed attributeMap:
{ "animate": 0, "clothing": 1, "wearable": 1, "concealed": 2, "container": 3, "door": 4, "edible": 5, "enterable": 6, "female": 7, "absent": null, "male": null, "neuter": null, "pluralname": null }
