# decodeD198 caller mutation audit (claude, 11-07; grok stalled, #6166 taken over)

Callers (js/): ActionSynth 352/418/457/797, Actionable 237/257/289/2866, AttributeSchema 115/237,
ExitCalibrator 166/271, ZRamReader 194/2942/2966, GrammarProvider 12/54 and collect().
Method: for each, the variable holding the decode, scanned 40 lines for assignment/push/sort/splice/
reverse/delete/++/--; repo-wide scan for writes into templates/vocabulary/prepositions and for
classification/evidence/activation/family assignments.
Result: all read-only. Only writers: GrammarProvider's own decoder while building (before caching), and
collect(): shadow mode sets activation (now copies first); "on" mode set activation on its copy and
never used it (removed). SemanticActions:396 writes winner.evidence on its own candidate object.

Change: decodeD198 returns the cached decode deep-frozen and shared (no per-call JSON copy).
Profile (Zork I, one LOOK): _d198Clone ~35-40 ms -> gone.
Tests: d198-grammar-decoder 80, d198-grammar-shadow 27, d198-contract-matrix 30, d34 54/0, d214 10/0,
command-disambiguation 51/0, command-consistency PASS, operator-regressions 13/0.
Focused gate (11 ZIL/Inform titles, HEAD vs change, x2): 0 differences.
Risk: a future caller that writes to the decode is silently ignored (sloppy-mode frozen object).
