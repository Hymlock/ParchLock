# D16 Sorcerer native trace (claude, 2026-10-30), qualifies Sorcerer for inventoryHiddenScopeRetained

Tier: **seeded-native**. The Z-machine `random` was replaced by the g1-batch JSEED LCG (seed 0). Nothing else was forced: no relocation and no RAM writes. Run from play.html?story=games/Sorcerer.z3.js. Read-only: no js/ edits, no commit.

## The 9-vs-7 reconciliation
The "NDESC 9" in R2 and r1 line 19 is a misreading of audit-r44/GATE.md:11. In "Sorcerer 9" and "Enchanter 7", the
number is the `inventoryHiddenAttribute` **bit number** (Sorcerer NDESCBIT = attr 9, Enchanter = attr 7, per
2026-10-11-zil-source-flags.json). It is not a child count. GATE.md:37 itself says "Sorcerer drops 7 spells". Source
and RAM agree: there are 7 children.

## RAM at game start (dream, Twisted Forest, turn 0)
- Spell book is object 139 "spell book". Its parent is 16 "combination dial", which matches source `(IN DIAL)`. Its attrs are `00012310`, with bits {15 OPENBIT, 18 TOUCHBIT, 22 READBIT, 23 TAKEBIT, 27 CONTBIT}. This matches globals.zil:917 exactly. CONTBIT and OPENBIT are both set.
- Children, in sibling order:

| id | short name | attr hex | bits |
|---|---|---|---|
| 214 | gnusto spell | 01400000 | 7 SPELLBIT, 9 NDESCBIT |
| 27 | vezza spell | 01400000 | 7, 9 |
| 162 | pulver spell | 01400000 | 7, 9 |
| 140 | izyuk spell | 01480000 | 7, 9, 12 VOWELBIT |
| 183 | yomin spell | 01400000 | 7, 9 |
| 22 | rezrov spell | 01400000 | 7, 9 |
| 147 | frotz spell | 01400000 | 7, 9 |

- All 7 have NDESCBIT. None has INVISIBLE (bit 19). There are no non-spell children. The set is exactly the 7 objects at globals.zil:951-1044, with izyuk carrying VOWELBIT as in the source.
- After the commands below, the book is held by 223 "protagonist" in 17 "Your Quarters". It has the same attrs and the same 7 children.

## Native text
- `i` in the dream gives "You are empty-handed." The book is not held there. The hellhound then kills you, you wake in Your Quarters, and the room is dark.
- `read book` gives "My Spell Book", followed by gnusto, vezza, pulver, izyuk, yomin, rezrov and frotz with their descriptions. That is the same 7 spells, in RAM sibling order.
- `read frotz spell` gives: The spell reads "cause something to give off light". The noun resolves natively through the open book, and darkness does not stop it.
- `learn frotz` gives "You already know that spell by heart." The noun resolves.
- `examine frotz spell` and `examine gnusto spell` give "It's too dark to see!" This is the dark-room verb gate, not a parser miss.

## Verdict
Sorcerer **qualifies** for `inventoryHiddenScopeRetained`. The book has CONTBIT and OPENBIT, so it is always open. All 7
spells are NDESCBIT children and none is INVISIBLE. The native parser reaches them through the held book (read/learn).
Gate expectation: the inventory label list is [book] once the book is held, and the 7 spells stay in the scope payload.
Runtime gnusto adds more children later (verbs.zil:2218). That is consistent with the rule-based fact, not a count.

## Manifest (sha256)
- d16-sorcerer/sorc-probe.cjs  d05181e082436615ef8add4ed833e08614e6d4911ae77f8ffae00341b49960c4
- d16-sorcerer/sorc-probe-out.json  19b86354e8790a67ce2ce355d80f6925ec80434c216f55c0831513fedc67158a
- games/Sorcerer.z3.js  d8a878364d0331ab789c859f7e4a3b6a1d0b3b3f3f0415ff566a702f543195b8
- audit-r44/GATE.md  525609859c859250471a16625cce7625da36849d739bbc8de3bc534832bce6c6
- sorcerer-src/globals.zil (scratchpad clone)  cb43c892cbc67821b5b15627f5f193e64cc201d23b4cf4eb121de163b9a7815a
