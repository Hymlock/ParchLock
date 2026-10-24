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
