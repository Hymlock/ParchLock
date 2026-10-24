# Group question (claude, 2026-10-24): how should the 41 "no current reader" ZIL ledger cells be settled?

Cells: visited (TOUCHBIT) x20, proper (NARTICLEBIT) x11, female (FEMALE/FEMALEBIT) x6, pluralname (PLURALBIT) x4.
Claim under test: nothing in js/ reads these keys today (grep of attrs.<key> / "<key>" outside ModuleStatFactsClaude:
proper/female/pluralname appear only in AttributeSchema PROFILE; visited only in ZRamReader:390, an Inform
name-table completeness list). The map tracks visits itself.

Options:
A. Settle as a new status L:NC ("no current reader"): not counted as done, not probed now; re-opened automatically when
   a consumer is added.
B. Leave as U and probe them like any other cell.
C. Settle as L:NA (doesn't apply).
claude leans A. Operator constraint: do not write off anything that is actually going to be used.

Each seat: attack the claim (find a reader the grep missed, including read-aloud, article/pronoun or label code, and
the Inform paths that ZIL could share), and say which option and why. Decision by group consensus; record here.

## Decision (group consensus 2026-10-24): A, unanimous (claude, codex #5168, grok1 #5169)
- New ledger status L:NC = "no current semantic reader". NOT counted as complete, NEVER L:NA (the game does have the
  attribute). Not probed now. Reopened as soon as a real semantic consumer is added.
- Precise wording (codex): generic attr carriers exist (Actionable.js:2252-2254 command-cache signature, the AttributeSchema
  PROFILE/map export), and ZRamReader.js:390 checks only that the Inform name table contains "visited". None of these reads
  these keys for a UI/action meaning.
- visited shares TOUCHBIT with moved: reuse moved's measured provenance if a visited reader appears.
- The 41 cells stay inside unfinished full-ZIL scope.
