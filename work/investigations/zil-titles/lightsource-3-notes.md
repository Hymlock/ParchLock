# lightSource: the last three L:U cells (Ballyhoo, TheLurkingHorror, TheWitness)

Verdict: all three are **NC**. None is S and none is NA.

## Why NC
- On 2026-10-30, 17 lightSource cells were closed as NC under group rule A (work/investigations/zil-titles/no-reader-cells-question.md). The reason given was that nothing in js/ reads lightSource. Under D2/D247 the light key is heuristic and illuminationState owns illumination.
- Checked again today: `grep -rln lightSource js/` (excluding ModuleStatFactsClaude) returns no files. Nothing reads the key, so rule A applies to these three titles the same way.
- These three were left at U by an earlier, separate pass (#4028/#4040, commits d7077a1 and de32205). That pass ruled them untestable under rule 7, before rule A existed. Rule A swept the cells that were still open, but these three already had a U value with a reason, so the sweep missed them. There is no title-specific reason they differ.
- They are not NA because the flag exists in each game's source: Ballyhoo LIGHTBIT 26, TheLurkingHorror LIGHTBIT 22, TheWitness LIGHTBIT 25.
- They are not S because no target-named command tests or writes LIGHTBIT. V-LAMP-ON either refuses unconditionally or never checks the bit, and the only reader is the parser's FIND/GWIM scan. A rule-7 positive pair is therefore impossible, and native probes would prove nothing.

## Proposed ledger values
- Ballyhoo.z3.js lightSource: {"s":"NC","r":"group rule A: no js/ reader of lightSource (grep 2026-10-30). LIGHTBIT 26 exists but only the parser FIND reads it (V-LAMP-ON refuses). Not complete; reopen when a consumer is added."}
- TheLurkingHorror.z3.js lightSource: {"s":"NC","r":"group rule A: no js/ reader of lightSource (grep 2026-10-30). LIGHTBIT 22 is read only by parser FIND/GWIM. Not complete; reopen when a consumer is added."}
- TheWitness.z3.js lightSource: {"s":"NC","r":"group rule A: no js/ reader of lightSource (grep 2026-10-30). LIGHTBIT 25 is read only by parser FIND; V-LAMP-ON never tests it. Not complete; reopen when a consumer is added."}

If a consumer is ever added, these three titles stay at U under rule 7, because no native fact is possible for them. No addMap/fact line is proposed.
