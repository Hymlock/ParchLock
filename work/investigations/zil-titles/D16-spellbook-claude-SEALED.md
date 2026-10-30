# D16 spell book: Claude, sealed blind findings

Read-only. No js/ edits and no game runs.

## Sources
- Enchanter: C:/Users/hymlo/agent-tools/en-src (historicalsource copy).
- Sorcerer and Spellbreaker ZIL are NOT on this machine. agent-tools has no so-src or sb-src, and the repo has no .zil
  files. Statements about those two games come from gate measurements (GATE.md: Sorcerer book 139, spells carry bit 9),
  not from source. Fetch historicalsource/sorcerer and historicalsource/spellbreaker before consensus.

## Enchanter facts (source)
- magic.zil:27 SPELL-BOOK is (IN PLAYER) with FLAGS TOUCHBIT TAKEBIT READBIT CONTBIT OPENBIT, and ACTION SPELL-BOOK-F.
- Every spell (magic.zil:35-343) is (IN SPELL-BOOK) with FLAGS NDESCBIT READBIT SPELLBIT, its own SYNONYM SPELL plus an
  ADJECTIVE (FROTZ, GNUSTO, ...), and a TEXT property.
- Native `i`: V-INVENTORY (verbs.zil:580) calls PRINT-CONT WINNER. Its second loop (verbs.zil:~186) skips an NDESC
  child's label and recurses only if the child has FIRST? and SEE-INSIDE?. Spells have no children, so **native `i` prints
  only "a spell book". The spells are not listed.** r44's hidden fact reproduces native `i` exactly.
- READ BOOK: SPELL-BOOK-F (magic.zil:410) enumerates FIRST?/NEXT? of the book itself and prints
  "The <D> (<TEXT>)." for each spell. This is the game's own presentation of the spells. EXAMINE gives fixed prose, and
  OPEN/CLOSE are refused ("always open ... always closed").
- Parser scope: SEARCH-LIST (gparser.zil:1272) matches any child that has SYNONYM, and descends into OPENBIT/TRANSBIT
  containers. It never tests NDESCBIT (gparser/parser have no NDESCBIT reference). **So spells stay in parser scope while
  the book is held.** That is why `frotz spell` or `gnusto spell` resolves natively.

## What D148 needs
D148 (PRODUCTION_PLAN.md:3316) was about reach, not labels. It made the held book's children reach the payload so that
each spell is tappable and addressable ("use items like spells from your inventory"; ambiguous commands 1 -> 0). The
consumer needs the spells as held, in-scope, tappable objects that have parser words. It does not need a native-`i`
label line.

## Diagnosis
D1 conflates two different native facts:
1. NDESC means "PRINT-CONT does not print this label". This is a display fact, and correct.
2. The walk also uses it to decide what the app treats as held and reachable. NDESC does not remove an object from
   parser scope (SEARCH-LIST ignores it). Dropping the spells therefore contradicts the game, which is masking in reverse.

## Proposed disposition (data-derived, no ID lists)
Split label from reach in walkVisibleDescendants for hiddenRecurses titles:
- An NDESC child keeps `suppressLabel = true`, so it gets no inventory label. This matches native `i`.
- The child is still emitted as a held, in-scope object (the D148 tap/link path) when the game's own scope rule would
  find it. That means it has its own parser words (non-empty SYNONYM / parserWordsAny), and every ancestor up to the
  player is open or see-through under the existing D148/D73 container logic. That logic is the same gate that let the
  spells in originally. A closed opaque parent still blocks it.
- This is not title-specific: it mirrors SEARCH-LIST in every ZIL PRINT-CONT title. Elsewhere the reach is small anyway,
  because ITAKE clears NDESC (proposal r1, item 4).
- If the app has no separate "in scope but unlabelled" channel, the fallback is a per-title executable fact. One option
  is `inventoryHiddenScopeRetained: true`, in the style of inventoryHiddenPreservesWorn. It would be justified by the
  container's ACTION enumerating its own children on READ (SPELL-BOOK-F). That is weaker: it is a reviewed fact, not a
  rule. The split is preferred.
- Keep Enchanter and Sorcerer excluded until this lands. Re-admit them with gate expectations: the inventory label list
  is [book] (INTENDED, matches native `i`), the spells are still tappable and linked, and underline marks for "spell" or
  "frotz spell" do not regress.

## Spellbreaker
- Per the gate it is the same shape: a held spell book with NDESC spell children (measured; D148 notes spells and cubes).
  Source is not verified locally. Its separate R2 exclusion is about PRINT-CONT's BRIEFBIT + VERBOSITY 1 exception
  (verbs.zil:1868), which is a room-description path. That exclusion is independent of the spell book. Once the
  label/reach split lands, the spell-book concern is resolved for all three games. Spellbreaker then still needs only
  its BRIEFBIT disposition.

## Open items
1. Pull Sorcerer and Spellbreaker sources and confirm the book FLAGS (CONTBIT OPENBIT), spell NDESCBIT, and READ routine.
2. Confirm that their SEARCH-LIST also ignores NDESCBIT.
3. Locate the payload channel (scope vs label list) in ZRamReader/consumers before proposing code.
