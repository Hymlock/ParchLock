# Local scope - accepted design (claude #4626 + codex #4628), 2026-10-23
Base: work/mapping-research/items-codex/resume-20261020/local-scope-proposal-r1-draft.md.
1. Metadata: exact-digest localScope {property, width, holder} in ModuleStatFactsClaude.js; admitted roots must have parent == holder, bounded table.
2. Descendant predicate (parser SEARCH-CONTENTS?): !INVISIBLE && ((SEARCHBIT && (OPEN || TRANSBIT)) || SURFACEBIT); every bit measured for the title.
3. INVISIBLE is needed for roots too (THIS-IT? parser.zil:1766 rejects invisible regardless of recursion): INVISIBLE unmeasured -> no local admission for that title, not roots-only.
4. Native bar unchanged: >=2 distinct positives + negative, or single owner + cited whole-module search.
5. Lighting: dark=true -> no additions; dark=null is UNKNOWN, needs an authenticated lighting owner, never assumed lit.
6. One shared helper for ZRamProvider:275 and ZRamReader:2930.
Witnesses: native positive TopFloor 195 prop16 [163] (EXAMINE ROOF DOOR succeeds, door absent from discovered, #4621); Tomb 9 padlock; negative ComputerRoom 176. Roof 222 is a static candidate only.
Implementation GO after LH INVISIBLE / SEARCHBIT / TRANSBIT measured (grok2).
7. Lighting (codex #4632, ACCEPTED): localScope.roomLitAttribute 15, POSITIVE-ONLY: room ON15 true + other guards may add; false/null add nothing and are not a dark verdict. No use of measuredDark (null for LH) or DarkScope D221 heuristic. Lamp/door illumination OPEN until a LIT locator.
8. LH bits (grok2 #4635/#4637): INVISIBLE 20, SEARCHBIT 10, TRANSBIT 5 (source-exact + RAM carriers + native refusal/positive). TRANSBIT on-location positives still owed; until then the TRANS branch of the predicate is not used (SEARCHBIT&&OPEN or SURFACE only).
Implementer: claude (codex out of usage until 21:51); audit: codex on return + grok2 gate.
