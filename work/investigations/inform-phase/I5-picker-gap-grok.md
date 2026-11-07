# I5 picker gap — School Days night-table (#6113), grok, 2026-11-06 ~23:00 EST
Read-only. No js edits. Logs: grok-i5/picker-gap-run-1..4*.txt (headless probe on the owner's machine, app payload read live after `look|take air freshener|i`).

## Verdict: filtered as non-unique, not absent and not paged out
- Present in the payload: poolN=26 includes 156 night-table (supporter:true, container:false, examineOnly:false, revealedLocalGlobal:false).
- Dropped by the picker filter `Actionable.referenceFor(o).unique` at js/Actionable.js:3054. 22 objects are kept. The kept order is drawers 1-6, then the bed, and so on; night-table is not in it.
- Why not unique: referenceFor gives noun "table" (commandNounFor/disambiguatedNoun), but **candidateIds=[]**, i.e. zero, not two. At js/Actionable.js:191 the object's words are `aliases` (empty for 156) plus its name split on `/[^a-z0-9'-]+/`. The hyphen is kept, so the only word is "night-table", and "table" never matches its own object. `unique` at :215 requires exactly one candidate.
- The game accepts the noun: typed `examine table` returned "A night table carefully made out of cherry wood sits by the bed." (run-4). The command noun is correct; the uniqueness proof is what fails.
- Other non-unique objects (correctly excluded, a real collision): 119 dresser (supporter) and 120 double dresser (container) share aliases, so cands=[119,120]. 116 wall is also excluded.

## Proposed minimal fix (not applied)
At js/Actionable.js:191, add the hyphen-split parts of each name token to `words` (keep the whole token as well). This only adds candidate matches. It can make other objects less unique, never more, so it cannot invent uniqueness. Then 156 gets cands=[156], so it is unique and listed, and with aebef2c3 it gets "put air freshener on table".
Alternative: when candidates is empty, fall back to the dictionary-verified full name. That is riskier.

## Limits
Seen on one title only. The fix is untested: no code changed. The aliases=[] cause (name-property read empty for 156) is not traced further.
