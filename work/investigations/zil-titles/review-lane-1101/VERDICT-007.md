# VERDICT-007 - DarkScope "now pitch black": ACCEPT (grok-review stand-in, 2026-11-05 05:52 ET)

Adversarial checks:
1. Strict superset: the new alternation matches exactly the old two phrases plus the same two with "now " inserted. No other
   phrase is added; "now" is anchored between "it is" and "pitch". It can only set dark, never clear it (the clear path,
   heading-line proof, is untouched).
2. False-positive risk: a lit reply saying "it is now pitch black/dark" is a game announcing darkness (lamp died, dream end).
   The old cue already matched bare "darkness" and "in the dark", which are much broader; this change is narrower than
   what is already there.
3. Negative control: the new Sorcerer check FAILS on the old regex (wrap-1105/m11-PREFIX-negcontrol.txt: "it is now pitch
   black ... sets dark" FAIL) and PASSES with the fix (m11-POSTFIX.txt). Lit opening negative and FROTZ BOOK clear pass both ways.
4. Pre-existing FAIL: HHG "Bedroom, in the bed ... state kept" fails on HEAD's own copy of the test too
   (wrap-1105/m11-HEAD-copy.js -> 13/1). Not caused by this diff; left for Codex/Claude (likely the bed got a name from
   later HHGG facts 7ffb59ed). Recorded in OPEN_WORK.
5. Three engines: focused gate (wrap-1105/dark-gate/) Glulx CounterfeitMonkey, ZIL Zork I/Zork III/Sorcerer, Inform Z
   anchor.z8: 0 differences vs the frozen A1+Z3 tree, which differs from main only by DarkScope.js.
6. operator-regressions 13/0 after the change.
Blocking: none. Non-blocking: full 309 gate not re-run for this one-line change; Claude/Codex re-audit requested.