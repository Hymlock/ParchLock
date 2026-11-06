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

# R2 (claude, 2026-10-30) — answers codex review #5630
## Scope: per-title literal fact, not all D1 titles
New fact `inventoryHiddenScopeRetained: true`, set only on titles whose source proves parser reach through the holder
regardless of NDESCBIT. inventoryHiddenRecurses alone does NOT imply it. Per-title justification:
- Enchanter: gparser.zil:1272 SEARCH-LIST descends any child with OPENBIT|TRANSBIT; no NDESCBIT test (THIS-IT? tests
  only INVISIBLE). Spells (IN SPELL-BOOK) NDESCBIT; book OPENBIT (en-src magic.zil).
- Sorcerer (historicalsource/sorcerer, read-only clone): sorcerer.zil:28 INSERT-FILE GPARSER; gparser.zil:1318
  SEARCH-LIST same shape (OPENBIT|TRANSBIT, no NDESC test); THIS-IT? gparser.zil:1497 rejects only INVISIBLE.
  globals.zil:911-917 SPELL-BOOK FLAGS TOUCHBIT TAKEBIT READBIT CONTBIT OPENBIT (always open per SPELL-BOOK-F OPEN/CLOSE
  text). Source places 7 spells IN SPELL-BOOK (gnusto, frotz, rezrov, yomin, izyuk, pulver, vezza; globals.zil:951-1044),
  all NDESCBIT SPELLBIT; GNUSTO adds more at runtime (verbs.zil:2218 MOVE ,PRSO ,SPELL-BOOK). The gate's "NDESC 9"
  is therefore 7 static + runtime-gnustoed, NOT yet qualified. READ/LOOK-INSIDE (globals.zil:937-949) prints
  "My Spell Book" then iterates FIRST?/NEXT? children: the native READ text names every spell.
  Sorcerer re-admission stays BLOCKED until a native trace at the gate point lists the exact 9 children of the book
  (ids, parent chain, NDESC/INVISIBLE bits) and READ BOOK text matches them.
- Spellbreaker: excluded (BRIEFBIT, unchanged). No other D1 title gets the fact without its own source citation.

## Consumer contract (HEAD line numbers)
LABEL = must skip labelSuppressed rows; SCOPE = must keep them.
| Consumer | file:line | Class | Change |
|---|---|---|---|
| EquipmentUI.demoActive real filter | js/EquipmentUI.js:302 | LABEL (empty-fallback decision) | count only non-suppressed rows; but a book with only hidden children still counts the book, so demo never shows when book held. Control: empty inventory -> demo still shown. |
| EquipmentUI.model items/byParent/topLevel | js/EquipmentUI.js:307-324+ | LABEL | filter out labelSuppressed before building byId/byParent (rows, tree, hierarchy, text filter, sort seq). |
| EquipmentUI.categoryCounts | js/EquipmentUI.js:434 | LABEL | inherits from model items; suppressed spells must not raise `spells` count / reveal filter chip. |
| Actionable.RenderInventory | js/Actionable.js:2626 | LABEL | filter labelSuppressed from items before byParent/topLevel. |
| Actionable scope.inventoryNouns / invIds | js/Actionable.js:2411-2420 | SCOPE | keep: invIds and inventoryNouns include suppressed ids (underline/noun pool). |
| Actionable._buildPayloadPool / payloadPool | js/Actionable.js:1555-1566 | SCOPE | keep: base = discovered + inventory unchanged; links/underlines/D148 pool read here. |
| WorldModel.recoverInventory | js/WorldModel.js:120 | SCOPE-in, but must not infer | returns inv as-is when non-empty; suppressed rows never originate here (worn-bit recovery only). Rule: suppressed rows are never used as recovery seeds. |
| WorldModel.correctPlayerId | js/WorldModel.js:166 | HOLDER INFERENCE | must skip labelSuppressed when counting parentIds (their parent is the book, already an itemId, so today they are skipped by `itemIds[key]`; add explicit skip so a suppressed child whose parent is absent can never vote). |
| ActionSynth.commandsForPayloadObjectId | js/ActionSynth.js:504-516 | SCOPE | keep: context "inventory" for a suppressed spell, containerName via heldContainerName. |
| ActionSynth.collectFromPayload | js/ActionSynth.js:526-540 | SCOPE | keep. |
| ActionSynth.heldContainerName | js/ActionSynth.js:220 | SCOPE | keep; returns "spell book". Requirement: for SPELLBIT/spell-category objects the command set must still include the D148 cast route (`<spell> spell`, gnusto/learn/cast), not reduce to "Take X out of book". |
| ActionSynth line 301 payloadPool lookup | js/ActionSynth.js:301 | SCOPE | keep. |
labelSuppressed must survive WorldModel merge/dedup (recoverInventory, correctPlayerId, any id-dedup in collect) as a
field copied with the row; never strip it, never drop the row. Native `i` text labeling (Actionable marks on printed
inventory text) is separate: spells are not printed by native `i`, so no mark is created there; this is not masking.

## D148 route that must survive
D148 (PRODUCTION_PLAN.md:3316): the inventory walk enters the held named book with children although its bits do not
decode container/open; measured Enchanter scope 2 -> 6, all four spells reachable, ambiguity 1 -> 0, each addressable as
`rezrov spell` / `frotz spell` / `blorb spell` / `nitfol spell` (D107 real-word nouns). P16 keeps those exact payload
rows and commands; only rendering drops them. harness/d31-nested-inventory.js must stay green (closed-bag no-spill).

## Test matrix (before any re-admission)
Constructed (unit, fact on vs off):
1. closed opaque parent with NDESC child -> child absent from payload entirely (no scope).
2. open transparent-bitless parent (D148 shape) with NDESC child -> row present, labelSuppressed, not in render/count/tree.
3. transparent closed parent -> present, suppressed.
4. nested: player > bag(open) > book(open) > NDESC spell -> suppressed, heldContainerName = nearest named, cast route kept.
5. NDESC parent itself (book NDESC) with plain child -> parent suppressed, child rendered top-level? -> must re-parent
   under player label; assert no orphan row and correctPlayerId unchanged.
6. INVISIBLE child -> excluded from scope (THIS-IT? rejects).
7. title without the fact -> current behaviour byte-identical.
8. empty inventory -> demo fallback still shown; inventory of only [book] -> no demo.
Native (Enchanter; Sorcerer after qualification):
9. `i` -> list [book] (INTENDED, matches native).
10. READ BOOK -> spell names in output are underlined; clicking a spell link yields cast/learn commands per D148
    (`frotz spell` etc.), and the issued current command executes natively.
11. categoryCounts spells chip state recorded and justified.
12. operator-regressions + three-type gate 0 FAIL; d31-nested-inventory green.
