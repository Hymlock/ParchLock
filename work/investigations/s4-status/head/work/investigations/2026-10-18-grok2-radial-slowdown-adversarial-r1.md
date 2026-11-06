# Adversarial R1 — grok2 on claude radial slowdown proposal

Target: `work/investigations/2026-10-18-claude-radial-slowdown-proposal.md`  
Task: bus #4148  
Against: CURRENT checkout (not the proposal text alone)

## Verdict: **REVISE** (direction sound; P1 scope incomplete for the phone freeze)

Not a reject of P1/P2 mechanisms. Concrete objections below. No code.

---

## Compare agreement (held)

- Independent agree: repeated `payloadPool()` without `_resolutionPool` → O(objects²) via `referenceFor` / `commandsForObject` / displayName paths.
- Independent agree: repeated `parseDictionary` full Z-decode is real (grok2 LostPig: 114 parses / one collect; claude phone: 6.9 s self).
- Claude phone path `Submit → onAcceptedSubmit → _splitAnyVerbNoun → referenceFor → payloadPool` explains 8–10 s better than desktop Open alone; grok2 did not reproduce 10 s Open on Identity Chromium.

---

## P1 — `withResolutionPool` on three bodies

### What is fine

- **Reentrant helper required.** Existing Open / resolveObjectCommands already do `prior = _resolutionPool; try { if (!prior) … } finally { restore prior }`. Nested Open → addMoreActions → GetRadialCommands already sees Open’s pool today (`Actionable.js:2669–2675`, `2873`). Helper MUST match that reentrancy or nested finally will wipe Open’s pool mid-Open.
- **No mutation of payloadPool inputs inside the three named bodies** (checked):
  - `_splitAnyVerbNoun` (`AttrCalibrator.js:762–819`): read-only filter/match on command string + lastPayload object list + `referenceFor` / `commandNounFor`.
  - `collectFromPayload` (`ActionSynth.js:341–355`): read-only over lastPayload; calls `commandsForObject` only.
  - `GetRadialCommands` (`Qol.js:624–697`): builds a new array from payload fields; does not write LiveMarks / Scope / lastPayload / RAM.
- Snapshot-equality claim for one synchronous call is correct for those three.

### OBJECTION A (blocking for phone H1): P1 list misses the rest of the accepted-submit fanout

Phone freeze is **post-Submit**, not only `_splitAnyVerbNoun`.

`LearnedWords.observeSubmit` (`LearnedWords.js:150–157`) after split:

```js
var split = AttrCalibrator._splitAnyVerbNoun(event.command);
var obj = Actionable.payloadPool().find(...);   // full pool again
var ref = Actionable.referenceFor(obj);         // payloadPool again if no pool
```

Wrapping **only** `_splitAnyVerbNoun` leaves these two full rebuilds on every accepted submit. AttrCalibrator also calls `referenceFor` without a pool in `_d198ScopedCorrelation` (`AttrCalibrator.js:133–147`, up to **2× per object** in the room/inventory loop).

**Required amendment:** either

1. `Actionable.withResolutionPool` around the **entire** `TurnRecorder.onAcceptedSubmit` subscriber fanout (one snapshot for all listeners), or  
2. Same wrap on `LearnedWords.observeSubmit` and AttrCalibrator observe/analyze entry points that call `referenceFor`/`payloadPool` in a loop — not only `_splitAnyVerbNoun`.

(1) is smaller and matches “one synchronous resolution” for the submit event.

### OBJECTION B (non-blocking correction to proposal text)

Proposal line 17: “Open already scopes `_resolutionPool`, so its addMoreActions→GetRadialCommands is covered” — **true today** for nested calls during Open. Wrapping GetRadialCommands is still required for the **wheel** path (no Open). Keep P1 on GetRadialCommands; do not treat Open coverage as making that wrap optional.

### OBJECTION C (optional clarity, not blocking)

`_splitAnyVerbNoun` filters raw `discoveredObjects||inventory` but `referenceFor` uses full `payloadPool()` (promoteUnnamed, possessions, relabeled names). Pre-existing. Prefer `referenceFor(o, sharedPool)` with one explicit `payloadPool()` at the top of split **in addition to** withResolutionPool, so match list and uniqueness share one array. Not required if fanout wrap (A) is done.

### Helper placement

Leaving Open/resolveObjectCommands as duplicate try/finally is OK for smallest diff. Prefer helper used by all four sites to avoid a fifth copy later — non-blocking.

---

## P2 — memoize `parseDictionary`

### What is fine

- Uncached `parseDictionary` (`ZRamReader.js:1506`) is a real multi-caller cost; `hasDictionaryWord` already memoizes **words** via `_dictWordCache` (`:1549–1576`) but other callers still invoke full parse (`:1365`, `:1445`, `:1559` cold path, `:2838`, GrammarProvider `:414`, Autocomplete, StatTracker).
- Static-memory gate (`h.dict >= h.staticMem`) is the right fail-closed rule for “dictionary may be rewritten” games.
- WeakMap on `(mem && mem.buffer) || mem` matches `_objectCountCache` (`:27–33`).

### OBJECTION D (must-specify, else stale or useless cache)

1. **Return value must be treated immutable.** Cache the object and never hand callers a shared mutable `words`/`entries` to mutate. Today callers appear read-only; freeze or document “do not mutate” and add a one-line guard in review. If any caller ever did `dict.words[x]=…`, all seats share corruption.
2. **Key must include story identity, not only buffer.** Same ArrayBuffer can back a replaced story in some hosts; pair `gameIdentityKey(mem)` (or executable digest) with the WeakMap entry (proposal text already says buffer + gameIdentityKey — keep both in the stored record and reject mismatch).
3. **Invalidate on story load / mem replace.** WeakMap drops when buffer is GC’d; if the engine reuses one buffer for a new story file, `gameIdentityKey` change must miss cache (store key inside value; compare on get).
4. **Cold path synergy:** `hasDictionaryWord` should consume P2’s memoized parse (or fill `_dictWordCache` from it) so first open does not parse twice.

### OBJECTION E (verify staticMem field)

Confirm `header()` exposes `staticMem` consistently for v3/v4/v5 used in release-80. If missing, gate must fail closed (no memo), not throw. Cite header parse site in implementation review.

No caller found that **mutates** parseDictionary’s return for write-back into RAM in the paths listed; P2 “read-only callers” claim accepted pending freeze.

---

## Out-of-scope H2/H3/H4

Accepted for this round: re-measure after P1+P2 (with amendment A).  
If wheel still pages 200–400 dictionary-verb pills into Rank/OpenRadial after pool fix, revisit dump-on-first-ring separately — not required to block P1+P2.

---

## Validation amendments

Keep: `operator-regressions.js` 0 FAIL; 309×2 0 REAL; `radial-latency.js`; grok2 LostPig wheel probe.  
**Add (from claude sealed, not optional):** phone re-profile Identity underline submit path (the 8 s freeze). Desktop green alone must not close the operator report.

---

## Direct answers to #4148 questions

| Question | Answer |
|----------|--------|
| Inner call mutates payloadPool inputs inside the three bodies? | **No** for the three named bodies. |
| parseDictionary caller mutates result? | **None found** in cited callers; still **freeze or must-not-mutate** on cache. |
| ACCEPT or OBJECTION? | **REVISE** — P1+P2 direction yes; **blocking OBJECTION A** (submit fanout); **D/E** on P2 specifics. |

Seat: grok2
