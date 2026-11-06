# Shared-word mark coverage (Enchanter "Book" vs "spell") — claude, 2026-10-16

Sole active seat (operator: take possession of all work). Self-review recorded below.

## Problem
Enchanter open 12 (OPENBIT, MEETS 2+1, source-exact) was blocked: with it, the spells inside the spell book
enter the pool, the intro's "He recites a short spell" gets an ambiguous mark (candidates book 144 + 4 spells),
and "spells in your Book" loses its underline. Without open 12 the jug's water is hidden although native `i`
prints "The jug contains: A quantity of water".

## Cause (js/Actionable.js wrap loop)
After a wrap, every candidate id of the mark was recorded in `markedIds`. The book is a candidate of "spell"
only through a secondary word; D146 (one mark per object) then refused the book its own "Book" mark.

## Prior-decision check
- D146 one mark per object (guard d150-noun-and-verbs): kept. An object still gets one mark.
- D214 item 7 shared word (guards command-disambiguation, underline-first-per-reply, hhg-links-live): a shared
  single word is underlined only when it is the MAIN noun of a sharer. This change applies that same head-noun
  principle to coverage: an ambiguous single-word mark covers only the candidates whose head noun it is.
- D148 spell path: spells become listed/tappable once the book's open bit is known (intended).
- No masking: nothing is hidden; a missing mark is restored from the game's own nouns.

## Change
Coverage after a single-word, multi-candidate wrap = candidates whose `headNounOf`/`headTokenOf` equals the
word (fallback: all candidates if none match, i.e. unchanged behaviour). Multi-word and unique marks unchanged.

## Self-review (adversarial)
- Could an object now get two marks? Only if the ambiguous word is not its head noun; its own head/name mark
  is then its one mark (D146 holds per object for its own phrases).
- Pronoun/alias marks: unaffected (multi-word or unique).
- Evidence: Enchanter gate cand marks ["spell","Book",...]; guards command-disambiguation 51/0,
  underline-first-per-reply 8/0, hhg-links-live 22/0, d150-noun-and-verbs 10/0, operator-regressions 7/0;
  full all-games gate (baseline HEAD vs candidate) required before commit.
