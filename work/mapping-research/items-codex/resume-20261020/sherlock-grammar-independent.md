# Independent Sherlock grammar-boundary investigation — sealed findings

Research only, October 21. I did not read sherlock-grammar-boundary/, root sealed research, proposals, or other investigators' findings. Prior exposure: the earlier A2 escape defect and 8-byte dictionary-entry issue were already known and are not claimed as new blind discoveries. Current frozen runtime was not edited. No native game/catalog run or production classifier activation occurred. Offline instrumentation evaluated copies of functions in an isolated JavaScript context only.

## Evidence and observed boundaries

Current original Sherlock.z5.js header: version5, high memory30954, dictionary21401, object table1164, globals684, static memory16441, abbreviation table492. Dictionary1193 entries of8bytes begins21410. Current decodeD198 rejects invalid-dictionary, because _d198RawDictionary requires textBytes+3 while this dictionary has6text+2data. This is the previously known boundary, not a new finding.

Research-only function copy allowing two data bytes passes dictionary extraction but still rejects unvalidated-grammar-family. Instrumenting each rejecting guard in _d198InfocomGrammar identifies its first subsequent failure: duplicate preposition index233, dictionary word till, already assigned to until, at preposition record23. This is not an out-of-range index. Measured grammar root has210 monotonically increasing verb pointers, first16861; grammarEnd/actionBase20260;236actions; prepBase21204;65preposition records of3bytes; preposition table ends21401 exactly at dictionary header. First pointers16861,16866,16879,16960,17029,17051,17059,17062. First grammar bytes [1,64,114,47,48,3,115,20,0,240,64,45,44,240,118,110,46,0] fit the existing variable-size parser.

A research-only copy that permits repeated preposition IDs and always selects compact dictionary data offset1 reaches the existing decoder success object: infocom-pre-v6-variable,457verb words,1735templates,65preposition records, range16441..21401. That result is diagnostic only: it proves those guards explain rejection, NOT that the modified decoder meets the production validation contract. In particular silently overwriting aliases is not an acceptable production design.

## Authored source corroboration

Primary source https://github.com/historicalsource/sherlock pinned tree85ab6e5385446cb1ac8cdfe1007cbb372407c76e, parser.zil and gamesounddat.zap. Source archive provenance must remain qualified separately from current executable exact-build claims.

parser.zil constants K-P-PSOFF6, K-P-P1OFF7 establish one POS byte and one value byte. RT-WT? explicitly says only one byte is defined for all this; it retrieves the value at offset7 rather than choosing old offset7/8 by low POS bits. Preposition lookup is different: INTBL? over PREPOSITIONS three-byte records obtains the preposition ID. RT-PREP-FIND searches those records by ID and returns a dictionary word address. This establishes a many-spellings-to-one-ID relation, not a unique-ID table.

RT-SYNTAX-CHECK reads VERBS[255-verb], then line count, and advances by K-P-SLEN-0/1/2 according to P-SONUMS. RT-GET-PREP masks syntax byte with octal77 then adds octal300; RT-SYNTAX-FOUND obtains the action byte. gamesounddat.zap labels VERBS/VTBL, ACTIONS/ATBL, PREACTIONS/PATBL and PREPOSITIONS/PRTBL, the latter with count65 and dictionary-address/byte-ID records. Original bytes support that authored organisation; source recompilation equivalence was not established.

## Required bounded design constraints

Do not lower the common dictionary minimum globally. Define/prove a compact two-data-byte dictionary ABI and its grammar association separately; retain old three-data-byte handling. Do not identify ABI by title, filename, V5 alone, or non-Inform classification. Retain monotonic roots, record limits, exact table consumption/non-overlap, dictionary crosslinks, full verb-index coverage and cross-family negatives. Confirm the compact value offset for every relevant POS consumer, especially direction flags; changing only verb decoding leaves d214DirectionProperties using old offset2 for some entries.

Represent preposition aliases without dropping spellings or overwriting evidence. Repeated IDs may be legal synonyms; conflicting word-to-ID mappings and invalid dictionary addresses still reject. Templates and grammar synthesis need a deliberate alias/canonical policy. The current flat prepositions array plus one prepByIndex word can accidentally advertise only one spelling and can lose distinction between source record count and semantic ID count.

Do not treat the offline success classification as authorization. PLAN D198/ARCH64 require two unrelated builds per family, cross-family negatives, separate evidence/activation, and default-off grammar/semantic/exit valves. Current d214TakeAttribute deliberately handles fixed family only; do not invent variable FIND attributes. Existing semantic opcode provenance and action identifiers must retain meaning and correct routine-table addressing. Research analyzer actionTable assumes preposition record count and four bytes per action; preserve or explicitly adapt that contract if representation changes.

Consumers: GrammarProvider.d214DirectionProperties reads dictionary flags/value offsets directly; SemanticActions and AttributeSchema use confirmed-family evidence as authority; exits/map hints can activate independently of grammar UI valve; classification therefore has consequences beyond word lists. Verify all classification consumers before activation. No inferred useful command, flag, room, action, or title completion follows solely from decoded grammar.

Primary formal reference: https://inform-fiction.org/zmachine/standards/z1point1/sect13.html establishes dictionary lexical format but game-owned trailing bytes; parser tables are game/compiler data, not a mandated Z-machine grammar ABI. Prior D198 PLAN6440 onward / ARCH3062 onward and current GrammarProvider.js remain the production contract.
