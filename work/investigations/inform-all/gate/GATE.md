# D280 regression gate (claude, 2026-11-07)
Baseline: 1212cb71 + 18c81343 Actionable (tree in scratchpad); candidate: working tree with the D280 block. 34 changed titles only (no other title's facts changed).
Result: 34 games, 15 differences, all INTENDED:
- New exits through doors now recognised (door/open/openable bits correct): Adventureland up, bse northeast, curses down, inhumane south (+3 rooms), karn west; matching compass marks.
- New object marks for real objects (container/supporter bits correct): I-0 key, night game.
- Container contents now listed: ninepts fish (in fishbowl), tk1 piece of paper (in tube).
- inhumane inv2 empty: the newly found south exit changed the gate walk, so "take all" ran outside the tent; direct play: take all -> amulet in Equipment (verified).
- Slackerx lost "night": object 45 "Dolemite" night-light has parent 0 (off-stage); underlining it was wrong.
Also: inform-layout (all 272 non-ZIL) 272/0, operator-regressions 13/0, coverage 264 of 272 complete (8 fail-closed, grok2 UNRESOLVED-grok2.md).
