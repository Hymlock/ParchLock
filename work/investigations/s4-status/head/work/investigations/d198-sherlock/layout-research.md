# D198 Sherlock: 8-byte dictionary layout research (claude, 2026-10-31)
Research only. No js/ edits. Probes: scratchpad scripts loading js/ZRamReader.js and a sandboxed copy of js/GrammarProvider.js.

## 1. D198 consumers of dictionary entry data (classic 9-byte v4/v5: 6 text + flags + v1 + v2)
Classic ZIL vocabulary: `flags` = PS? bits (0x80 object, 0x40 verb, 0x20 adjective, 0x10 direction, 0x08 preposition, 0x04 buzz);
low 2 bits = P1? (which part of speech owns v1: 1 verb, 2 adjective, 3 direction, 0 none/object). v1 = value of the P1 part,
v2 = value of the second valued part. Entry.data = [flags, v1, v2].

| Site | Reads | Meaning |
|---|---|---|
| GrammarProvider.js:197 `_d198RawDictionary` | gate `entryLen >= textBytes+3` | admits only classic layout; Sherlock (8) -> null -> `invalid-dictionary` |
| :65-66 `d214DirectionProperties` | flags&0x10; `data[(flags&3)===3 ? 1 : 2]` | direction property number (v1 if P1=direction else v2) |
| :218 `_d198EarlyInformSignal` | flags&0x80, flags&0x50 | Inform compass-noun detection (flags byte only) |
| :348-351 `_d198InfocomGrammar` verbs | flags&0x40; `data[(flags&3)===1 ? 1 : 2]`, verb index = 255-value | verb -> syntax entry ownership |
| :372-377 orphan rejection | flags&0x40; requires data.length>=3, checks 255-data[1] and 255-data[2] | proves no dictionary verb owns the orphan syntax index |
| :336 preposition table | `dict.byAddress[addr]` (word only) | preposition IDs come from the PREPOSITIONS table, not dict bytes |
| Actionable.js:233-240 | `e.flags & 128` | noun bit for trigger words |
| ZRamReader.parseDictionary / GrammarProvider:449 | flags byte, `flags & 1` | not D198 (heuristic verb list, Inform-oriented); unchanged by this work |

No other js/ file reads `.data[` from D198 entries.

## 2. Sherlock's 8-byte layout (source + bytes)
Source (work/investigations/zil-titles/sherlock-evidence/parser.zil):
- `K-P-PSOFF 6` "offset to parts of speech byte", `K-P-P1OFF 7` "offset to first parts of speech" (parser.zil:48-49).
- `RT-WT?` (parser.zil:812-830): tests `GETB PTR 6` for the PS? bit; for prepositions it ignores the entry and looks
  the word up in `PREPOSITIONS` (`INTBL? ... *203*`, 3-byte records); otherwise returns `GETB PTR 7`. The disabled
  second-offset code is annotated "no longer applies, since there's only one byte defined for all this".
So: entry = 6 text bytes + flags (same PS? bits and P1? low bits as classic) + ONE value byte = the P1 part's value.
There is no second value. A word's non-P1 parts carry no number (adjective numbers are not kept; preposition IDs live in
PREPOSITIONS only).

Bytes (games/Sherlock.z5.js, dict seps 5, entryLen 8, 1193 entries, staticMem/VERBS at 16441, 210 verbs):
| word | flags | value | reading |
|---|---|---|---|
| take | 0x41 | 230 | verb, P1=verb, index 25 |
| examine / x | 0x41 | 64 | verb index 191 (synonyms share) |
| walk | 0xc1 | 248 | object+verb, P1 verb, index 7 |
| go | 0x49 | 69 | verb+prep, P1 verb, index 186 |
| north / n | 0x33 | 63 | adj+dir, P1=dir, property 63 |
| northeast | 0x33 | 62 | property 62 |
| in / up | 0x3b | 53 / 55 | adj+dir+prep, P1=dir |
| into / on / with | 0x08 | 0 | prep only, no value |
| red / brass | 0x20 | 0 | adjective, no value |
| lamp | 0x80 | 0 | object |
Flag histogram: 0x80 391, 0x41 418, 0x20 166, 0xa0 83, 0x08 38, 0x04 35, 0xc1 24, 0x33 16, 0x61 8, 0x3b 6, 0xe1 6, 0x49 1, 0x88 1.
Whole-dictionary invariants hold: every 0x40 word has low bits 1, every 0x10 word has low bits 3; low bits 2 never occur.
Every one of the 210 verb indices is owned by a dictionary verb (0 orphans).

Key fact: the P1 value sits at data[1] in BOTH layouts. Classic consumers already read data[1] whenever the selector says
the part is P1; they read data[2] only for a non-P1 part, which does not exist in the 8-byte layout.

## 3. Grammar / preposition tables
- VERBS syntax lines are the compact variable form (constants.zil:1158-1172: P-SONUMS = byte0>>6, SPREP1 0 (low 6 bits,
  +0xC0), SACTION 1, SLEN 2/4/7). D198's existing `variable` family decodes this unchanged.
- PREPOSITIONS (at 21204): count 65, 3-byte records (word addr, id 0xE9-0xFF). Unlike classic tables it lists
  synonyms with shared IDs and repeats canonical words (until/till/til=233; in/within/between/into/inside=249; the 23
  canonical words appear twice). D198 :339 rejects any repeated ID -> second blocker after the dictionary gate.

## 4. Sandbox result
Relaxing only the gate: still rejected (`unvalidated-grammar-family`, duplicate prep ID at :339).
Gate relaxed + data kept as [flags, v1] (no fill) + preposition IDs allowed to repeat (first record canonical):
`confirmed-zil-family / validated`, 457 vocabulary, 1735 templates, 65 preps; templates match syntax.zil
(PUT x IN/ON/UNDER/BEHIND/OVER/THROUGH/AGAINST y, TAKE x FROM/OFF/OUT, UNLOCK x WITH y, OPEN x WITH y);
d214 directions = props 52-63 out,in,down,up,nw,w,sw,s,se,e,ne,n with aliases (n, ne, u, d...).

## 5. Blast radius
Scan of every games/*.js Z-machine story: Sherlock.z5.js is the ONLY title whose entryLen != textBytes+3
(R21/871214, `invalid-dictionary`). No other title changes.
