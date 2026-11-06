# Item 3 (APK 64): commands take up to 6 seconds. Claude blind findings, sealed

**Measured** (Playwright, wump2ka at 390, CPU throttled 6x to approximate a phone; CDP sampling profiler per command, prompt-to-prompt time):

| command | prompt ms | top self time |
|---|---|---|
| look | 10680 | `observedPhraseFor` (Actionable.js:309) 5682 ms, `displayKey` 2645 |
| inventory | 8539 | `observedPhraseFor` 4626, `displayKey` 1173, `zvm encode` 1002 |
| look (again) | 10870 | `observedPhraseFor` 8779 |
| e / w | 159-174 to the prompt, then `observedPhraseFor` 4.3-6.4 s of main-thread work after it (the UI stays blocked) |
| wait | 146-783 | `AttributeSchema.applyTo` about 150-230 ms |

**Cause.**
- `Actionable.observedPhraseFor` defines `displayKey(word)`, which calls `window.__PARCHLOCK_ZVM__.encode(...)` (the Z-character encoder) for every candidate word.
- It maps every alias of the object and then calls `displayKey(words[j])` for each word of the WHOLE text (the room description, inventory or reply) inside a double loop, for every object in the payload pool. `displayNameFor` calls it up to twice per object, and label snapshots call it again.
- Nothing is cached, so the cost is objects × text words × encode calls. It is largest on LOOK and INVENTORY (long text and many objects).
- This is pure CPU on the UI thread; probes queued behind commands (item 2) are not the dominant cost.

**Fix direction:** memoise `displayKey` per live VM (a Map from word to key, invalidated when the VM or story changes), and compute the text's word keys once per call instead of per object per position. Display results are identical, so this is behaviour-neutral. Then re-measure (target well under 1 s throttled) and look at `AttributeSchema.applyTo` as the next cost.

**Prior-fix guard:** D214/D184 display equivalence (the hyphen alphabet-shift truncation is why `encode` is used), the save-tied labels (`labelSnapshot`) and the underline harnesses.
