# D17 — PM_Stats_ idle rewrite (claude, SEALED half, 2026-10-30)

## Decision-index check
- `D157` in docs/DECISION-INDEX.md is "payload death / read-aloud" (unrelated index row); the
  identical-write dedup is the *code comment* "D157" at js/StatTracker.js:1607-1626.
- D243 (§89, PRODUCTION_PLAN.md:9656): restore keeps the HIGHER playthrough death/win count.
- D215/D208 touch StatTracker but not persistence cadence.

## Findings
1. Write path: `StatTracker.observe()` ends with an unconditional `StatTracker.save(key, model)`
   (js/StatTracker.js:2051). observe() is called by `StatTracker.Tick()` (3108/3126), which is
   called from `WorldModel.tick()` (js/WorldModel.js:545). WorldModel.tick is invoked by
   `Actionable.Refresh` — TWICE per Refresh (js/Actionable.js:2140 and 2147) — plus EquipmentUI and
   the AttributeSchema wrapper. Refresh runs on UI/DOM refresh cycles, not just turns, so an idle tab
   still ticks repeatedly (observed ~13/s; 39 writes / 3 s idle).
2. `seen`: per-stat integer, incremented on EVERY status observation (recordObservation,
   js/StatTracker.js:2074). It is not a set. Its only consumer is `prev.seen >= CONFIRM_SAMPLES`
   (2086; CONFIRM_SAMPLES = 2, line 47); other writers set it to `max(seen, CONFIRM_SAMPLES)`.
   No reader outside StatTracker.js. Evidence: browser-r1/localStorage-after.json Zork I after
   5 turns has `score.seen: 476`, `turns.seen: 476`.
3. D157 dedup compares the full `JSON.stringify(model)` against `_lastSaved`. Because `seen` grows
   every tick, the string always differs, so every tick writes. Nothing else in an idle model changes.
4. Durability need: `seen` beyond CONFIRM_SAMPLES carries zero information; it does not need
   persisting at any rate. Deaths/wins/score changes are real model changes and must keep being
   written immediately (D243).

## Proposal (minimal, no masking)
Saturate the counter at its only meaningful threshold, in recordObservation:
  `prev.seen = Math.min((prev.seen || 1) + 1, StatTracker.CONFIRM_SAMPLES);`
(and leave the `max(...)` writers as they are). Once confirmed, idle ticks produce a byte-identical
model and the existing D157 dedup skips the write. Every real change (value, deaths, wins, banners,
evidence) still alters the JSON and is written on the same tick, so D243 durability is unchanged.
No debounce/pagehide machinery needed. Optional secondary (separate decision): Actionable.Refresh
calling WorldModel.tick twice back-to-back is redundant work, but not the cause of the writes.

Verification to run after implementation: re-run browser-r1/d13-browser.cjs idle window (expect
0 PM_Stats_ writes in 3 s idle after confirmation), harness/stat-tracker.js, death-terminal.js /
save-state.js (D243 harnesses), operator-regressions.js. Note d13-browser.cjs:120 asserts on
`stats.score.seen` decreasing after erase — that assertion must be revised (seen will be <=2).
Not measured live in this pass; the persisted seen:476 artifact is the measurement.
