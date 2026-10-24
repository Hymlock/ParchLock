# Independent adversarial audit, batch r9 (D232 localScope roots-only: Zork I, Enchanter)

Reviewer: claude subagent standing in for codex. Read-only on product files. Current checkout
(`git diff --stat js/ModuleStatFactsClaude.js` = 9 insertions, matches batch-r9.diff).

## Verdict
- Zork I (0ae5ac22): **ACCEPT**
- Enchanter (431678a6): **ACCEPT** (with one non-blocking note on parser-scope scenery, below)

## 1. Bits
- 2026-10-11-zil-source-flags.json: Zork1 INVISIBLE bit 7 tp9 fp0 fn0 exact (l.131-138), ONBIT 20 tp23 exact (l.186-193);
  Enchanter INVISIBLE 16 tp7 exact (l.1221-1228), ONBIT 8 tp33 exact (l.1277-1284).
- Row consistency: Zork I attributeMap `"on": 20` (ModuleStatFactsClaude.js:846) = roomLitAttribute 20;
  Enchanter attributeMap `"on": 8` (row at :214, attributeMap just below the new line) = roomLitAttribute 8. OK.

## 2. Native evidence (r3-claude/localscope2, r4-grok2/localscope/registry-ready)
Zork I: West of House 180 list {white house, board}; EXAMINE chimney/window refused. North of House 81 boarded window
examined; Behind House 79 kitchen window examined; Kitchen 203 {kitchen window, chimney, stairs} chimney+window
examined; Living Room 193 {stairs} (grok2: "examine stairs" succeeds; "examine grating" refused at West of House).
Cellar 72 lit=false, "It is pitch black". Matches the comment. Probe sha256 is of the .js file, the registry digest
is the executable digest; registry JSON records 0ae5ac22 at both lit and dark rooms.
Enchanter: Fork 42 {hills, mountain}, shack+forest refused; Outside of Shack 227 {wooden shack, hills, mountain},
shack examined; Long Road 45 {hills, mountain, forest, tree}, forest examined, shack refused; grok2 Fork "examine hills"
positive. Fork lit, Tower 225 bit clear. Matches the comment and the Zork III standard (2 rooms positive + reciprocal
negatives, lit set in those rooms, INVISIBLE exact).

## 3. Code (js/ZRamReader.js:2366-2425)
- No `contents` key -> bits = [roomLitAttribute, invisible] only (2376-2378); `contents()` invoked only when
  `ls.contents === "search"` (2421) -> no recursion for either title.
- Roots filtered `links.parent !== ls.holder` -> skip (2418). Zork Cellar property 5 = {183 trap door (parent 193),
  205 chute, 73 stairs}: 183 skipped by the localScope path; it reaches the Cellar list only if physically there, and the
  scopeObjects merge dedupes on `seen[o.id]` (2492), so never double-listed. Other skips found by a full room scan:
  Zork Dead End 65 (parent 82), Enchanter lurking evil presence 46 (parent 216); all correctly excluded.

## 4. Holder children (initial memory, vm-loaded ZRamReader + zil-attr-analyzer story())
Zork I holder 249: board, stairs, pseudo, white cliffs, cliff, wooden ladder, river, rainbow, pile of bodies,
grating[INVISIBLE], crack, boarded window, chute, chimney, kitchen window, water, tree, forest, white house, songbird.
`pseudo` 13 is in no room's property 5 (never emitted). Grating starts INVISIBLE (skipped until revealed). songbird
(6 forest rooms) is heard-not-seen scenery; it is in parser scope, so admitting it matches D232's parser-scope
contract. Non-blocking.
Enchanter holder 58: 39 children incl. adventurer[INV], simple wooden door[INV] (both skipped), plus noise 17
(7 rooms), guards 109 (Cell), mirror environment / shards of glass (Hall of Mirrors x4). These are parser-scope
abstractions (sounds, unseen guards, shards before the mirror breaks). D232 defines scope as parser scope, so this
is contract-consistent, but they will surface as underlines/radial targets the player cannot see. **Note, not
blocking:** worth a phone glance in Hall of Mirrors and Cell; a separate "non-visual local global" question, not
this batch.

## 5. Dark rooms
Enchanter has no pitch-black witness: Tower bit 8 clear, yet LOOK describes the room (lit by the carried light). The
gate is positive-only (D232 contract), so a clear bit can only under-list, never over-list; ONBIT 8 is exact
33/33 in source flags. Acceptable. Same under-listing applies to Zork I lantern-lit dark rooms (known D232 open item,
LIT locator).

## Not run
No gate/operator-regressions (read-only review); those remain the committer's duty.
