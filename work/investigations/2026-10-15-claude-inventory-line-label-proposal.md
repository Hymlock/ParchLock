# Inventory-line label (claude, 2026-10-15). Self-reviewed (operator: sole seat, take over all work)

## Evidence (zil-inv-check.cjs, original scene)
- Spellbreaker step 30: native `the "1" cube`; app `cube` (obj 238 parser words only cube/cubes; the label is a runtime property). The labelled-cube descriptor is the operator's multi-descriptor case.
- Enchanter step 90: native `A partially eaten loaf of bread`; app `loaf of bread`.

## Doc / code check
- ARCH "Observed item descriptor precedence (2026-10-04)": Actionable.displayNameFor is the sole label selector; the structural printed name ranks first; observed phrases are built only from parser aliases (observedPhraseFor), which cannot carry a runtime label ("1") or a state prefix ("partially eaten").
- eb35f19/7ca64eb (C1/C2/C3): no line crossing, game casing, structural name wins when printed. D214: full labels, never ellipsized. 8c2f205: text-confirmed labels survive UNDO.
- Shared-name amendment / instance badges: identical copies keep a shared label (unchanged here).

## Rule (narrow, display-only)
In displayNameFor, after the existing rules decline to change the name, read the last INVENTORY listing (Scope.lastInventoryText) line by line (never across lines). Accept the line as the label only when ALL hold:
1. The object has a real structural name (not parenthetical), and exactly one object in the pool has that structural name (identical copies are excluded).
2. Exactly one listing line ends with that structural name (case-insensitive, whole words), after stripping the leading article and any parenthetical/state suffix.
3. The line has 1-4 extra leading words, and none of them is a parser word of ANY other pool object.
4. The label is the line's own text (game casing), never invented.

Commands, identity and command nouns are untouched (display only).

## Tests
Spellbreaker `"1" cube`; Enchanter `partially eaten loaf of bread`; command-disambiguation, notes-pellets, pellets, save-labels, items-c1-c2, operator-regressions; the regression gate over the 18-title label census plus Infocom/Glulx controls, with every difference classified.
