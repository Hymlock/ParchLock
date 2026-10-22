# Research representation review

The initial report's allCrosslinksValid field incorrectly combined dictionary linkage,
index range and uniqueness. It is replaced by allChecksPass plus separate
dictionaryCrosslinksValid, indicesInRange and indicesUnique fields. Raw tuples remain.
For three-byte rows dictionaryCrosslinksValid=true, indicesInRange=true,
indicesUnique=false. This is not classifier acceptance.

Research proposal: retain ordered raw prep records (dictionary address, word, index),
and index -> ordered unique word/address alternatives. Repeated identical records
are deduplicated for presentation, not rejected or allowed to overwrite aliases.
Grammar lines retain ordered prep indices. At the existing template projection,
emit distinct flat prepositions:string[] templates for the Cartesian product of
the applicable alternative lists, preserving verb/action/object count/FIND metadata.
Deduplicate identical resulting templates. No substring guessing or canonical-word
selection. A policy for bounded expansion must reject an excessive layout explicitly,
not silently truncate. Raw alias provenance should remain in the decoded result.

Current product consumers: GrammarProvider constructs prepIndices on fixed/variable
lines, resolves them through prepByIndex and projects flat template.prepositions.
d214TakeAttribute reads templates to select the bare one-object TAKE form and its
matching two-object action, but explicitly rejects variable families. collect exposes
validated vocabulary only behind the grammar valve; it does not emit prepositional
commands from templates. No other current js reader of .templates/.prepositions or
prepIndices was found. Future diagnostic or cache consumers must be checked alongside
the decoder version and snapshot contracts before implementation.

PLAN D198 and ARCH64 keep classification, grammar activation, semantic provenance and
exit evidence independent. Alias preservation must not activate semantic actions,
TAKE capability or exit hints. Sherlock still requires native command dispatch proof
and adversarial review; no production changes are made here.

Source drift: a second report regeneration saw ZRamReader SHA256 change from
8d327bd5ace5394861288dc73cc520f877dcdc7649eae5444625dc9ee71f5f9c to
9e4778c4a76185812b464350cbdd1faa8a65a8bc2b2d7237eb6e5f5fa2ef2f06.
GrammarProvider SHA256 remains 5f41584422c424ac503e289c287fb34bdf91636b115f6c421f53dd4fdfa32fb0.
The regenerated report records the exact current inputs; this research does not
certify the intervening reader change or frozen-candidate equivalence.
