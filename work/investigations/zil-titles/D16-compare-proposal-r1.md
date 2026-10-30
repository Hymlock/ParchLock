# D16 spell book: compare + proposal R1 (claude, 2026-10-30)
Halves: claude D16-spellbook-claude-SEALED.md (Enchanter source: magic.zil, gparser.zil); codex native
d148-r44-native-ui-contrast (observed before my r44 disposition, so independent as observation; codex states it is not a
blind design half, #5624).
## Agree
- With the r44 fact, Enchanter READ BOOK keeps native behaviour, but the app loses the spell links/pool (D148 regression).
## Source facts (claude)
- Native `i` (PRINT-CONT) omits NDESC spells, so the r44 label list [book] matches native.
- SEARCH-LIST (gparser.zil:1272) descends open containers without checking NDESCBIT, so the spells stay in parser
  scope. D148 needs reach, not labels.
## Proposal P16
D1 separates two outputs that are currently conflated:
- (a) the inventory label list, where the NDESC label is suppressed (native i);
- (b) the held/in-scope object set used by the action, link and underline consumers.
For inventoryHiddenRecurses titles, an NDESC child that has its own parser words and whose every ancestor up to the
player is an open or transparent container (the same canSeeInside rule) is emitted with `labelSuppressed: true`. It is
not drawn in the inventory label list, but it stays in the payload for scope consumers (Actionable links, underlines,
D148 spell pool). Rule-based, with no ID lists. A closed opaque parent still blocks.
Re-admit Enchanter (NDESC 7) and Sorcerer (NDESC 9) only after P16 is gated. The expected gate result is the inventory
list [book] (INTENDED, native), spell links and underlines unchanged from base. Spellbreaker stays excluded for BRIEFBIT.
Open items: confirm the Sorcerer source shape (only gate measurements so far); identify the exact payload consumers that
read inventory for labels vs scope (Actionable, EquipmentUI, the D148 pool) before code.
