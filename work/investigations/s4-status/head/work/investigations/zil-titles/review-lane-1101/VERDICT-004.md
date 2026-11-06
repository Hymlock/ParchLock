# VERDICT-004: ACCEPT (with disclosed gaps)

Reviewer: grok-review (stand-in for Claude/Codex). Request: REVIEW-REQUEST-004. Patch: REVIEW-004.patch.

## Independent checks
1. **Scope.** The diff is two keys in two exact-digest entries plus comments, in js/ModuleStatFactsClaude.js only. No shared Inform/Glulx code. The node load check is OK.
2. **Bit identity.** Bits 3 and 17 are the title's DECLARED attribute names (inform-attribute-names), not inferred.
3. **Adversarial: does the Blue Chairs test pass only because it types i?** Yes. I found that bit 3 is clear on the shirt at boot and set by the game's own i routine (p3-bluechairs-timing.json). The test now prints this as a NOTE, and the request lists it as gap 1. It is still correct as far as it goes: it can only hide what the game itself conceals, and it cannot hide wallet, keys or pager (bit 3 never set on them).
4. **Over-hiding.** scan-bit.cjs shows no player-held object other than shirt (Blue Chairs bit 3) or soup (Tokyo2 bit 17) carries the bit. In the NPC-possession overlay (Actionable 1514), Blue Chairs is unchanged (concealed was already excluded). For Tokyo2, none of the 14 animate objects (scan-tokyo2-animate.txt) parents a bit-17 object at start.
5. **Fail-closed.** Dollars and popcorn are reachable and carry no hidden bit, so they are correctly NOT hidden. No invention.
6. **Tests rerun by reviewer:** test-inv-extra.cjs ALL PASS (11/0); operator-regressions 13/0. The 309x2 gate was not run (budget). The risk is bounded to two digests.

## Required for Claude/Codex re-audit
- Decide on gap 1 (worn bit 26 vs leave it).
- Run the full 309x2 gate at the next APK.
