# Item 3 latency: compare and proposal R1 (claude)

**Compare** (claude sealed `2026-10-09-claude-latency-blind.md`; codex sealed `2026-10-09-codex-command-latency-blind.md`):
- **Codex:** Submit acceptance is fast (LOOK accepted in 21.4 ms, Glow Bar actions resolved in 14.8 ms, unthrottled). The 5 s probe deadlines and the 24 × 250 ms retry are possible waits, unproven.
- **Claude:** after the game's output, the main thread spends 4.3-8.8 s (CPU at 6x, phone-like) in `Actionable.observedPhraseFor` / `displayKey` on LOOK, INVENTORY and moves. That blocks the UI, which is what the player perceives as the command taking seconds.
- **Agreement:** submission itself is not slow, and the probe waits are not shown to be the cause.
- **Gap:** codex's sample did not measure post-output processing, nor throttled CPU.

**R1** (behaviour-neutral performance fix; deterministic):
1. `displayKey` is memoised: a module-level `Map` keyed by the lower-cased word, holding the encode result, owned by the live VM instance. It is reset when `window.__PARCHLOCK_ZVM__` changes (new story or restart), held in a WeakMap keyed by the VM object.
2. Inside `observedPhraseFor`, the text's word keys are computed once per (text, call). A per-text cache (last text string → array of keys) serves repeated calls with the same text across objects within the same refresh.
3. Aliases are mapped through the memoised `displayKey`.
4. Display results are identical: same keys, same ordering.

**Tests:**
- New `harness/display-key-cache.js`: identical outputs before and after for a fixture with a hyphen alphabet-shift word; the cache resets on VM change.
- Existing underline and labels harnesses: `underline-lifetime.js`, `save-labels-live.js` and `learned-words-corrections.js` sampled.
- Throttled re-measure of the wump2ka LOOK, INVENTORY and moves prompt-to-idle time: target under 1.5 s at 6x.
- If a residual remains, profile the next cost (`AttributeSchema.applyTo`) as a separate step.

**Prior-fix guard:** D184 and D214 (display equivalence, encode-based keys) and the D215 save-tied labels.
