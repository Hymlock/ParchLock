# ZIL `light` key semantics - claude blind half (SEALED 2026-10-30)

Problem statement (for the other seat, no findings): the ledger maps `light` = ONBIT ("currently lit"), but committed
facts map Zork I light 31 and Enchanter light 22, which are LIGHTBIT ("can be lit"). Is that wrong, and does any
consumer behave wrongly because of it?

## Findings (claude, code read only, no native run)
1. Readers of attrs.light in js/ (grep, facts file excluded):
   - ZRamReader.js:1725, inside the map-room plausibility path: `!admitted && !attrs.light && !attrs.door && no kids &&
     takeable -> reject`. Here `light` exempts an object from rejection, meaning a LIT PLACE (ONBIT/"lit" sense). With
     light = LIGHTBIT, a takeable lantern (Zork I 164, LIGHTBIT 31) carries light and is NOT rejected by this rule:
     a candidate wrong-room-admission hazard. Unproven: needs a native or constructed check of whether a lantern can
     reach this path as a room candidate (and whether the other guards above line 1715 already reject it).
   - ZRamReader.js:1795: same exemption, but gated `isInformCompiled`, so not ZIL.
   - ZRamReader.js:2871: wrapper "item-like" test; either sense works (lantern is item-like both ways).
   - Global.js/MainMenu.js `light` are the UI theme class, unrelated.
2. Codex's combined patch 1208 (being integrated) adds a separate `AttributeSchema.illuminationState` ("providing light")
   for Gear emission, explicitly not switchability or room light. So illumination state is moving to its own key; the
   `light` key's meaning must be pinned down so the two do not double up.
3. Room light for local-scope already uses its own fact field (localScope.roomLitAttribute), not `light`.

## Leaning (not a decision)
`light` should mean the Inform sense (currently lit = ZIL ONBIT where that marks a lit place/object). LIGHTBIT-mapped light
facts (Zork I 31, Enchanter 22) should then move to switchable/capability or be removed. The first proof needed is the
ZRamReader:1725 hazard (does a LIGHTBIT lantern get admitted as a room?). If no consumer misbehaves, the fix is just
ledger/fact hygiene, not a runtime change.
Prior-fix guards: D134 (room plausibility), D232 (localScope roomLitAttribute), D75/D57/D58 (wrong-room cascades).

## Post-seal measurement (claude 2026-10-30, after sealing; not part of the blind half)
Constructed check on original story bytes with current facts: ZRamReader.isPlausibleMapRoom is FALSE for Zork I lantern 164,
candles 147, torch 104 and Enchanter lanterns 94/175, although light=true and takeable=true on the LIGHTBIT-mapped ones.
Other guards reject them before the :1725 exemption matters, so the room-admission hazard is not live today. The
light-key mismatch is fact/ledger hygiene unless another consumer is found.
