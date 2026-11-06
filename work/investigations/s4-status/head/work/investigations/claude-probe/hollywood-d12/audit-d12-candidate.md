# D12 candidate audit (claude) — verdict: ACCEPT

Audited: refreshed d12-close-candidate-r1 (bus #5613), AttributeSchema.js SHA 6162ddfc…8bf6 (matches the stated hash), applied to a temporary worktree at HEAD d0dd25c.

## Results
- controls.cjs: 25 PASS / 0 FAIL. These are mocked fixtures only.
- original-memory.cjs: real Hollywood RAM through the DataView adapter. Plank 8/68 false (default CAPACITY 0), hopper 216 true (cap 8), mailbox 225 true (cap 11), mantle 194 false (SURFACEBIT). All five rows match the expected value.
- harness/operator-regressions.js: 13 PASS / 0 FAIL.
- audit-r43/radial.cjs, before and after the patch:
  - plank 8/68: `close` before, gone after (now examine/search/empty).
  - pond 14, cannon 172, hopper 216: still offer `close`.
  - mailbox 225: open/close still follows the open state.
  - mantle 194: no change, it had no Close before either.

## Focus areas
1. **Parser bounds** (`js/AttributeSchema.js`, closeRuleAllows, patch lines ~+119..+158)
   - The parser re-derives the v3 header and enforces strictly descending property numbers. It checks contiguity (`dataAddr === end+headerSize`) and finds the 0 terminator with `u8` against `byteLength`.
   - The defaults table is bounds-checked against both `byteLength` and `staticMem`. The default for property N is read at `objTable+(N-1)*2`.
   - Values are size 1 → u8 and size 2 → u16. Any other size, or a duplicate property, returns null.
   - Every failure path returns null, which leaves the radial unchanged.
   - The r1 version used `mem[...]` and `mem.length`, which are undefined on the runtime DataView. That made the gate always return null, so the old candidate never changed anything at runtime. The refresh fixes this, and original-memory.cjs proves the fix.
2. **Shared gate** (`js/ActionSynth.js:120`)
   - It applies to `verb==="close"` only, and only when the result is strictly `=== false`.
   - It can only remove a command, never add one.
   - Titles without `closeRule` are untouched: Inform titles, other ZIL titles, and doors. Every ZIL title except Hollywood lacks the fact, so closeRuleAllows returns null for them.
   - Inside Hollywood, a DOORBIT object always returns true, so later gates still decide.
   - Open, Search and Empty are untouched (control rows plus radial).
3. **Hollywood effect**: as expected. See Results.

## Non-blocking notes
- The v4+ header-size branch (`headerSize` / bit 7 check) is dead code for this fact, because the only rule is on a v3 title. It is harmless.
- controls.cjs rewrites controls.json in place every time it runs.
