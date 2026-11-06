# PACKET dialect: Heliopause / temple / Vacation (grok, 1417 ET). Verdict: OK, no fact needed
All three have a valid Inform attribute-name table, so bitFor uses declared names first.
- Aliases ("female/absent" etc.) are split by ZRamReader.informAttributeNames (D193 slash segments). One name claiming two bits rejects the table.
- Missing names (Heliopause general/scored; temple male/neuter/pluralname; Vacation male/neuter) give null, which is fail-closed.
- bsent is read in exactly one place: Actionable.js:1517, which excludes NPC-held children. With absent=female aliased (temple bit 8, Vacation bit 7), the bit set on an NPC-held item means absent in the game's own library too, so exclusion is correct.

| title | digest | names | in-page check (inform-plan/<t>-pageview.txt) |
|---|---|---|---|
| Heliopause (I7, 6.31) | 950578b3... | 45 names; proper 27, workflag 34, remove_proper 28 | Start: Horizon 51 is scenery/static, examine only. Native i: "You own nothing of value, besides the Horizon of Night"; EQ is empty. Consistent. |
| temple (6.15) | 7378f6ce... | 29 names; ward_area 0, animate 1, absent=female 8 | Roof after the intro: tower, city and sky are scenery; railing is concealed/static. Plausible, no wrong verbs. |
| Vacation (6.15) | 7c361e4c... | 31 names; clothing..enterable down by 1, absent=female 7, huge/weird 27/28 | bed/chair/table enterable+supporter (enter/exit); closet and make-up bag are containers, bag lock/unlock; bedroom door is a door; T-shirt and jeans worn with "remove". EQ T-shirt + jeans @99 matches the scope test. |

Rows: attrSource = names-dialect. P1 has nothing to fix here.
