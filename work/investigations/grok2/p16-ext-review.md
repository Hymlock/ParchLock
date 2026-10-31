# P16 extension review (grok2) — Sorcerer NDESC 9 + Spellbreaker NDESC 19

**Task:** Claude #5726  
**Base:** Enchanter P16 already landed (37327b0 / 999974c)

## Verdict: **ACCEPT both**

### Sorcerer (bit 9)

- Trace clarifies “9” is the **attribute bit**, not spell count — **7** NDESC children in book 139.
- Book CONTBIT+OPENBIT; all 7 spells NDESC+SPELLBIT; native `read book` / `learn frotz` / `read frotz spell` resolve nouns through open book.
- App defect: inventory lists 7 spells; native `i` does not.
- Apply: `inventoryHiddenAttribute: 9`, `inventoryHiddenRecurses: true`, `inventoryHiddenScopeRetained: true`.

### Spellbreaker (bit 19) — BRIEFBIT attack

- PRINT-CONT exception: NDESC listed only if BRIEFBIT ∧ VERBOSITY==1 ∧ !DESCRIBED-ROOM.
- ITAKE always FCLEAR NDESCBIT → **held** bread/fish lose NDESC → BRIEFBIT exception **unreachable in inventory**.
- Only room-listing side effect (ogre/bread/fish) — **outside inventory cell**.
- SEARCH-LIST does not test NDESC → scope retained for held open book.
- Native: `i` omits 7 spells; app lists them; book 144 CONTBIT+OPENBIT.
- Apply: `inventoryHiddenAttribute: 19`, `inventoryHiddenRecurses: true`, `inventoryHiddenScopeRetained: true` — **no verbosity condition**.

### Residual

- Gate INTENDED: inventory labels [book] only; spells remain in scope payload.
- Runtime gnusto adding children later is consistent with rule-based fact.

## Product edits

None this review.
