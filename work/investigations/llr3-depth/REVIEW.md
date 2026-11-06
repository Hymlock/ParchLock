# Adversarial review: LLR3 depth + widened DEATH_PHRASE (uncommitted diff)

Verdict: ACCEPT (no blocking issues; notes below)

Runs (reviewer, this checkout): harness/llr3-depth.js 7 PASS 0 FAIL; harness/death-terminal.js 41 PASS 0 FAIL;
harness/operator-regressions.js 13 PASS 0 FAIL.

1. Gating: regionDepthTable returns null unless probeFactsForIdentity(current digest) carries regionDepth; only
   the LLR3 digest 4bf1f6ea... has it. Other Inform 7 games with map_region are unaffected (no fact, no scan).
   Same digest-bound measured-fact pattern as D224.
2. Cache: keyed by digest and re-checked on every call, so no cross-game leak. Rank is computed over every object
   in the object table (not visited rooms), so it is stable across save/restore and map reload; nothing is persisted.
3. readProp reads only explicit properties (no default-table fallback), so objects without prop 7 do not create a
   spurious rank.
4. Up/reverse edge: levelChangeDir is symmetric (b<a -> "up"); layoutDir only affects placement, dir/command stay
   the game's. "Reverse has no opposite" is placement-only; harness shows 233 placed at level -1 under 219. Not visible.
5. DEATH_PHRASE: wider body still needs the sentence end, and D215 framing (terminal menu/banner, quotes stripped,
   app probes excluded) still applies; "unframed body prose is not a death" passes. Low false-positive risk.

Non-blocking notes:
- N1 Any non-room object carrying prop 7 adds a rank; measured LLR3 data shows level 1 = rank 1, so no shift today.
- N2 When mem has no rooms yet the table is not cached and is rescanned (up to 2000 objects) per call, including
  per edge in WorldMap; transient, but could cache the empty result per digest+load.
