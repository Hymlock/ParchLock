# D198 rejects Sherlock - claude half (SEALED 2026-10-31)
Problem statement (for the other seat): GrammarProvider.decodeD198 classifies games/Sherlock.z5.js (Infocom R21/871214,
ZIL per historicalsource/sherlock) as unknown/rejected/invalid-dictionary, so no per-title ZIL fact can take effect for
it. Why, and what is the correct fix?
## Findings
- js/GrammarProvider.js _d198RawDictionary: v5 textBytes = 6, and it requires `entryLen >= textBytes + 3` (9). Sherlock's
  dictionary entryLen is 8, which gives only 2 data bytes after the text, so it returns null at line ~156.
- So D198 assumes the classic 3-byte ZIL data tail (flags + 2 parts-of-speech values). Later Infocom v5 titles built with
  the newer parser (Sherlock uses the FL-* macro library and MC-IS?) evidently pack 2 data bytes.
- Every downstream D198 consumer that indexes data[1]/data[2] (verb/preposition/adjective numbers, the grammar decode)
  must be checked for the 2-byte layout before the length gate is relaxed. Relaxing only the gate could misdecode.
## Leaning
Determine the 2-byte data layout from the Sherlock source (parser.zil dictionary word definitions/part-of-speech
macros) and the bytes. Extend D198 with a validated alternate layout (entryLen === textBytes + 2) selected only when
the whole dictionary is consistent with it and the rest of the D198 validations pass. It must not apply to unknown
layouts, and Inform and other ZIL titles stay byte-identical. Validate with the gate and the existing D198 harnesses.
- RETRACTED blind request #5792: the 5787-5791 broadcast disclosed the cause to all seats; grok's half is a disclosed-exposure challenge.
