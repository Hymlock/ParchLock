# Spellbreaker inventoryHiddenAttribute: claude sealed half (2026-10-30)

SEALED: write-up for the later blind compare. Read-only investigation. No js/ edits.
Source: historicalsource/spellbreaker @ 6f83ba4c285d665362bbcd254cc52852d848803a (z6.zil inserts MAGIC, not ACTIONS; the two are duplicate copies).

## 1. verbs.zil:1888-1892 exception (PRINT-CONT)
A child Y is listed if it is NOT NDESCBIT, OR if it has BRIEFBIT AND VERBOSITY==1 AND NOT DESCRIBED-ROOM?.
Otherwise, if Y has children and SEE-INSIDE?, it recurses (PRINT-CONT Y) so NDESC containers still show their contents. That is the same recursion as D1.
- VERBOSITY: default 1 (verbs.zil:114). VERBOSE=2, BRIEF=1, SUPERBRIEF=<> (false).
- DESCRIBED-ROOM? is set by DESCRIBE-ROOM to V? (true on LOOK, in verbose mode, or on a first visit).
- BRIEFBIT carriers (bit 13, exact): OGRE (c1.zil:1773, not takeable), BREAD and FISH (guild.zil:51/58, NDESC+BRIEF+TAKEBIT, in GUILD-HALL).
- ITAKE does an unconditional FCLEAR PRSO NDESCBIT (verbs.zil:1734). A held BREAD or FISH has therefore lost NDESC, and the exception has no effect on held objects. It only un-hides bread, fish and the ogre in a room listing after a brief-mode re-entry. **In inventory the exception is not reachable, so it does not depend on verbosity.**

## 2. NDESCBIT
Attribute 19 in 2026-10-11-zil-source-flags.json Spellbreaker (55 tp, 0 fp, 0 fn, exact). Native RAM agrees: all 7 spells have attr bytes [0,0,0x30,0], so bit 19 (NDESC) and bit 18 (SPELLBIT) are set.

## 3. Spell book shape
- SPELL-BOOK (magic.zil:58): IN PLAYER, TOUCHBIT TAKEBIT READBIT CONTBIT OPENBIT MAGICBIT. It is permanently open, so SEE-INSIDE? is true.
- The spells are IN SPELL-BOOK and have NDESCBIT SPELLBIT. They have no children, so PRINT-CONT skips them and the recursion branch does nothing.
- READ/LOOK-INSIDE (magic.zil:94-115): MAP-CONTENTS over the book prints "The X spell (TEXT)." This is the game's own channel for the spells.
- Parser SEARCH-LIST (parser.zil:1562): it does not test NDESC. It descends into OPENBIT containers, so the spells stay in scope while the book is held. That supports inventoryHiddenScopeRetained.

## 4. Native check (games/Spellbreaker.z3.js, play.html + playwright, scratchpad sb-probe.cjs)
- `i` with default, verbose and brief verbosity: "magic burin / knife / spell book". No spells are listed. (The superbrief capture got mixed with intro text, but per the source, verbosity cannot matter.)
- RAM: book=obj 144, parent 52 (player). Children: yomin 178, rezrov 14, frotz 150, gnusto 204, malyon 229, jindak 240, lesoch 35.
- Wrapper today: ZRamProvider.collect().inventory = burin, knife, spell book **plus all 7 spells**. That is the visible defect the U cell represents.
- `read book` lists the spells, with the source's MAP-CONTENTS text.

## Disposition (proposal)
Apply inventoryHiddenRecurses + inventoryHiddenScopeRetained **as-is, with no verbosity condition**. NDESCBIT=19 hides the 7 spells from inventory, and they stay in parser scope through the open book. The BRIEFBIT exception that kept Spellbreaker out of D1 cannot be reached for held objects, because ITAKE clears NDESC. Its only effect is on room listings (bread, fish, ogre), so it is outside the inventory cell. Spell-book D16 shape: the spells keep their own channel through READ, so hiding them in inventory loses nothing native.

## sha256 manifest
53cc6f49d9f0a1630cf7b44c1fe3ebc90774d7bff0d2776b84718b2578e52594 *verbs.zil
ad242a10d602a0c187066d9e0bd842396f5a30ea009393ee62338622d7ae6ba6 *magic.zil
a49370ea3dce8f1e8b5aae0869762388b5e614a8a2e098a2d6194ddbdceadfe1 *guild.zil
f61c2dfbc32039200b3d1425a332b542fefc6e41b5889dd9a62dd0df040a7f1a *c1.zil
e9ba6902888d310d8b028b59172dc25c92c80a6bc9bf0b1449365becc6ab666d *parser.zil
ed6422c9ae341381ef44a55b81cccbb89122a536cc9de24fe999e33244dd15ac *z6.zil
b13535f88072bbad619621646be89a37d21e300d8c273dcce03c6464c8c5b5db *sb-probe.cjs
39edbf895262d97d173196b6b7ddc511fb3f737a8e2177e0ae6510032ed6de1b *sb-probe-out.json
5ad1dc88e8c928bb1a25ec2f256183387c52fed428595137a8a625ec00e14251 *games/Spellbreaker.z3.js
19e047ffbaa48fbcf34305590616c78eaacc851f2de0947f778243d35903ca66 *work/investigations/2026-10-11-zil-source-flags.json
(The .zil files are in the clone at scratchpad/spellbreaker-src. sb-probe.* are in scratchpad.)
