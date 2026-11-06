# D198 Sherlock proposal r1 (claude, 2026-10-31) - for adversarial review, no code yet
Evidence: layout-research.md (same folder). Answers codex sherlock-informed-challenges.md point by point.

## Prior-fix guard
Touches D198 (§64) dictionary/grammar decode and D214 direction linkage. Harnesses to run before acceptance:
harness/d198-grammar-decoder.js, d198-contract-matrix.js, d198-provider-completeness.js, d198-exit-valve.js,
d198-lifecycle.js, d198-loader-identity.js, d198-grammar-shadow.js, d198-semantic-provenance.js,
harness/operator-regressions.js, work/investigations/regression-gate.cjs (all games, diff vs baseline: only Sherlock may change).

## Change (js/GrammarProvider.js only)
1. `_d198RawDictionary`: two named layouts, selected for the whole dictionary, nothing else admitted.
   - `classic`: entryLen >= textBytes+3 (unchanged; data = [flags, v1, v2, ...]).
   - `single-value`: entryLen === textBytes+2 AND h.version === 5 (only evidence) AND every entry satisfies:
     flags&0x40 -> (flags&3)===1; flags&0x10 -> (flags&3)===3; (flags&3)!==2. Any violation -> return null
     (whole dict rejected, `invalid-dictionary`). data = [flags, v1] exactly; no zero/placeholder for v2.
   - Return `layout` ('classic' | 'single-value') on the dict object. entryLen < textBytes+2 still null.
2. Consumers (explicit, no reliance on undefined):
   - :66 directions: single-value -> prop = data[1] (invariant guarantees P1=direction); classic unchanged.
   - :349 verbs: single-value -> verb value = data[1] (invariant guarantees P1=verb); classic unchanged.
   - :372-377 orphan proof: single-value -> check only 255-data[1]; the `data.length < 3` reject applies to classic only.
     (Sherlock has 0 orphans, but the branch must be correct.)
   - :339 prepositions: single-value layout only -> a repeated ID is allowed iff every record for that ID points at a
     valid dict entry flagged 0x08; first record is the canonical word; `prepositions` lists all words. Classic keeps the
     strict unique-ID rule byte-for-byte.
   - Actionable.js:233 (flags&128) and ZRamReader/GrammarProvider:449 read only the flags byte, same meaning: no change.
3. Grammar ownership: the existing `variable` syntax family and action/preposition structural validation apply as-is
   (Sherlock syntax = P-SONUMS byte0>>6, SPREP1 low 6 bits +0xC0, SACTION byte1, SLEN 2/4/7). No new grammar decoder,
   no fabricated templates: templates come only from real VERBS lines owned by real dictionary verbs.
4. `D198DecoderVersion` -> "d198-infocom-pre-v6-v2" (admitted interpretation changes); result carries
   `dictionaryLayout` for evidence.

## Controls (targeted, before the shared gate)
- Sherlock: confirmed-zil-family/validated; spot templates (TAKE x FROM y = action 63, UNLOCK x WITH y = 218,
  PUT x IN y = 46) and d214 props 52-63 as in layout-research.md.
- Malformed 8-byte (mutated Sherlock buffers): (a) one verb word with low bits 3 -> invalid-dictionary;
  (b) one direction word with low bits 1 -> invalid-dictionary; (c) entryLen 7 -> invalid-dictionary;
  (d) entryLen 8 in a v3/v4 header -> invalid-dictionary; (e) duplicate prep ID pointing at a non-0x08 word -> rejected.
- Inform (known + early/stamped Inform controls already in d198 harnesses) and every 9-byte ZIL title: decodeD198
  output byte-identical except decoderVersion string; regression-gate diff shows only Sherlock.

## Not in scope
Sherlock per-title flag dispositions (lightSource, concealed, etc.) stay pending per codex challenge; this only
admits the dictionary/grammar family.
