# Audit r11 (independent, standing in for codex) - batch-r11.diff D232 localScope

Verdict: ACCEPT all four (Planetfall, Hitchhik.z5.js, Seastalker, Spellbreaker). No product change requested.

## (1) Bits vs 2026-10-11-zil-source-flags.json
| Title | fact invisible / lit | source flags | evidence exact |
|---|---|---|---|
| Planetfall | 19 / 5 | INVISIBLE 19, ONBIT 5 | 7/225, 100/132 tp, 0 fp/fn |
| Hitchhik | 21 / 45 | INVISIBLE 21, ONBIT 45 | 3/183, 26/160 |
| Seastalker | 12 / 19 | INVISIBLE 12, ONBIT 19 | 2/176, 24/154 |
| Spellbreaker | 12 / 8 | INVISIBLE 12, ONBIT 8 | 2/157, 28/131 |
Digests in each localscope4/<title>.json match the diff's digest keys (digestMatch true).

## (2) Two rooms + reciprocal refusals
- Planetfall: stairway at Deck Nine 235 / Gangway 222; escape pod 228 refused at 222 (listed by 235); INVISIBLE bulkheads 230/229 refused in their listing rooms.
- Hitchhik: tree at Front of House 71 / Back of House 72; tree refused at Front Porch 174; stairs 162 positive at 174, refused at 71/72. Dark Bedroom 150 "too dark" until light on (lit bit 45).
- Seastalker: alarm bell at 65/92 (+89); intercom 87 / lab door 88 refused at 65/92, positive at 89.
- Spellbreaker: see (4); stone hut 226 positive at 109, refused at 29 - clean reciprocal pair.

## Consumer (js/ZRamReader.js 2366-2420, objectLinks 62-88)
- width 2: `ZRamReader.u16(mem, prop.dataAddr + i)` stepping by 2, `prop.sz % ls.width` guard - correct for v5 property 47 word lists.
- holder check: `objectLinks` v4+ branch reads parent/sibling/child as u16 at b+6/8/10 (lines 80-82), so `links.parent !== ls.holder` (37) is correct for v5. Count derived with the v4+ 12-byte props offset.
- grok2's width-1 proposal would have read high/low bytes as separate ids; the width-2 correction is right (Hitchhik.json summary.caveat).

## (3) Hitchhik "it" local globals
Holder-37 children listed by the four rooms (Hitchhik.json holderChildren, listedBy):
- 71 Front of House: third planet 140, tree 97, pile of rubble 10, it 77, your home 24, bulldozer 228 (INVISIBLE at start, skipped), conversation 169 (INVISIBLE).
- 72 Back of House: third planet, tree, rubble, it 77, your home.
- 174 Front Porch: stairs 162, third planet, door 205, it 77, your home.
- 150 Bedroom (dark at start; nothing listed until lit): stairs, window 11, water 171, third planet, bulldozer, bed 166, door, it 77, your home.
Only one "it" (77) is reached in these rooms. Its own dictionary words (from the story file): 51 house; 50 my, your. So 77 is the house object whose DESC is "it". Other "it" objects (5 cage, 213 equation, 34 mattress, 12 beermat, 60 book) are listed elsewhere or nowhere.

Underline risk: none for the word "it". Actionable.js namePhrases (1649-1659) drops a reference-token full name, and nounTrigger (227-228) returns false for `isReferenceToken` (220), which is a grammar-class pronoun test, not a per-game name list. Target building (2412-2432) filters through both. 77 can therefore be underlined only through its alias "house" (a dictionary noun, the real object), and 24 through "home". "my"/"your" are reference tokens too. 77 was not in discoveredObjects before this change: its parent is 37, outside the room tree, and only localScopeObjects adds holder children.
Residual (not blocking, cosmetic): a radial/header that shows `o.name` could read "it" for the house. Check on the device. If it does show, fix it from the object's own head noun (house), not by excluding the object. No exclusion is recommended. Excluding 77 would hide a real, room-scoped game object (masking).

## (4) Spellbreaker cliff/rock
Both "examine cliff" and "examine rock" print the same reply. rock 23 and cliff 96 are both listed by 29 and 109, so either resolution is a valid holder child, and the positive holds. Packed Earth 156 lists neither 23 nor 96, so its refusal is valid. The stone-hut pair gives an unambiguous reciprocal. ACCEPT.

## (5) Hitchhik bulldozer
`add()` reads INVISIBLE live from RAM on every call (`ZRamReader.attr(raw, ls.invisible)`), and the fact holds no static object list. When the game clears bit 21 the bulldozer appears in 71, which is correct. Fine.
