# Independent audit r14 (standing in for codex) — batch-r14.diff

## (A) ModuleStatFactsClaude enterable bits — ACCEPT
- 2026-10-11-zil-source-flags.json VEHBIT: Zork II bit 27 exact (tp2 fp0 fn0: 98 basket, 51 bucket); Infidel bit 14 exact (tp5: 108 mast hole, 104 wooden beam, 51 army cot, + barge 211 and one more); Planetfall bit 30 exact (tp3: 98 large vehicle, 215 safety web, 196 bed).
- No collision: Z2 map uses 18/8/11/30/3/20/31; Infidel 20/28/25/7 (+worn 22); Planetfall 22/11/24/31.
- Disclosed extra-Enter set: Infidel mast hole 108 and beam 104 (entry refused), Planetfall large vehicle 98. Harmless: refusal, no state change. Comment for Infidel should also name mast hole 108; Planetfall comment should name large vehicle 98.

## (B) ActionSynth D236 enter/exit by player parent — OBJECT (one required change)
1. Inform regression (blocking). The block runs for every Z title, including Inform where enterable comes from the Inform profile. Inform 6 standard grammar has `get out/off/up` -> Exit (no noun) and `get off noun`, but no `get out of noun`; "get out of chair" yields "I only understood you as far as wanting to get out." literalAvailable("get out") (ActionSynth.js:45-54) checks only dictionary words, so it passes in every Inform game, and the valid Inform `exit` while inside gets replaced by an unparsable command. Required: gate the inside->"get out of" rewrite (and preferably the whole block) on !ZRamReader.isInformCompiled(mem) (the pattern already at ActionSynth.js:247-248); in Inform, leave enter/exit unchanged, or drop only "enter" while inside.
2. Player identity: resolvePlayer (ZRamReader.js:2155) prefers executable-layout facts (playerObject / playerGlobal = WINNER), so Suspect-type split actors follow the measured actor, not payload.playerId. If it returns 0 or ambiguous, plLinks is falsy, inside stays null and both verbs are kept (fails open, safe). Non-blocking.
3. Dropping exit while outside: ZIL bare EXIT is not object-targeted, and the native evidence shows EXIT refused even when inside, so no valid offer is lost in ZIL. With the Inform gate from point 1, no Inform offer is lost either.
4. Consumers: "get out of" has no SemanticActions.verbIntent entry (SemanticActions.js:50-75), so the intent resolves to null (line 260). That removes it from any intent-based classification, the same as other unmapped verbs. authoredCommandAllowed (ActionSynth.js:96) returns true for it. No other js code tests verb==="exit" (only Map.js CSS class). Recommend adding "get out of": "EXIT" to verbIntent so intent consumers still see EXIT. Non-blocking.
5. Nested case: the player in a vehicle that sits inside another enterable object only matches the direct parent. Acceptable.

Verdict: A ACCEPT (comment completeness nit). B OBJECT until the Inform gate is added; then ACCEPT, with verbIntent "get out of" -> EXIT recommended.

## Round 2
- Gate checked in `git diff js/ActionSynth.js`. When memory is missing (null, or getMem throws), the block is skipped and both offers are kept. On Inform the block is skipped and enter/exit are unchanged. On ZIL with an unresolved player, `inside` is null and both offers are kept. Correct.
- SemanticActions verbIntent "get out of" -> EXIT is present.
- Nit (non-blocking): `ZRamReader.isInformCompiled(memE)` is called outside a try/catch. If it ever throws, synthesis for the object fails instead of keeping both offers. Suggest wrapping the call in try/catch and treating a throw as "skip the block".
- Verdict (B): ACCEPT.
