# D18 deferred: three stale D198 harnesses

Worktree ../wt-claude-d18 at HEAD 83321185 (games/ and node_modules robocopied /XJ, no links). Verdict: all three are **stale harnesses (a)**; no js/ regression. Diff: batch-d18.diff (harness/ only).

## harness/d198-lifecycle.js — TypeError lastLookText
- Fails at js/UndoRestoreSync.js:33 `Actionable.Scope.lastLookText = ""` — the stub `Actionable` had no `Scope`.
- Cause: a53709c9 (2026-10-01, "Preserve observed item descriptors and gate ambiguous object references") added the Scope reset on restore; harness from 7e16654b (2026-09-30) predates it.
- Correct app behaviour (restore must drop stale look/inventory text). Fix: stub `Actionable.Scope: {}`. All ordering/exactly-once assertions unchanged.

## harness/d198-loader-identity.js — "undefined is not iterable"
- Fails at harness line 108 `Array.from(identityA.bytes)`: `whenExecutableIdentityReady()`/`currentExecutableIdentity()` now return a frozen `summary` {digest, format, byteLength, sourcePath, header[64]} without `bytes`; whole bytes are opt-in via `currentExecutableBytes()` (copy) — js/ModuleLibrary.js:413-485.
- Cause: b747e425 (2026-10-08 APK62 checkpoint) introduced the summary/opt-in split (only consumer js/StatTracker.js:406 already uses `identity.header || identity.bytes`).
- Fix: byte-equality and no-mutation checks moved to `currentExecutableBytes()`; added asserts that the summary carries no bytes, its header equals ZCOD[0..64], and summary+header are frozen. Guard strengthened, not weakened.

## harness/d198-grammar-shadow.js — "unknown family emits no facts"
- Fixture `Suspect.z3.js` was the unknown-family example. Bisected classification across js/GrammarProvider.js+ZRamReader.js: unknown/rejected through 43697e22, `confirmed-zil-family/validated` from b0e2f9e0 (2026-10-26, codex, "Qualify orphan ZIL syntax…", admits one dictionary-unreferenced syntax entry) onward, and D198 per §64 intends Suspect to be ZIL-family. So emitting facts for Suspect is correct.
- Every shipped raw .z?.js story now classifies confirmed, so fixture replaced with a synthetic 64 KB v3 image; added an assertion that it really classifies `unknown` in shadow (prevents the check going vacuous again). The 0-facts-when-on assertion is unchanged.

## Results (worktree)
- d198-lifecycle PASS; d198-loader-identity PASS; d198-grammar-shadow PASS (27 checks)
- operator-regressions: 13 PASS / 0 FAIL
- No js/ changes; no commit.
