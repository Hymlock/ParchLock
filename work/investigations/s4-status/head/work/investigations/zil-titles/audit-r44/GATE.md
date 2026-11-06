# Gate r44: batch-r44.diff (D1 inventoryHiddenRecurses + D11 P11a clothing/wearable fail-closed)

Base = HEAD 68ccb9e (..\wt-claude-gate-base). Cand = HEAD + ../batch-r44.diff (..\wt-claude-gate-cand). Both are real
worktrees with real games/ copies (no links). 309 games x 2 runs per tree (GLULX=1, gate-parallel.sh N=6). Classifier:
x2.cjs (output in x2.txt). Nothing committed.

## Batch contents
- js/ZRamReader.js and js/AttributeSchema.js: the uncommitted working-tree code.
- js/ModuleStatFactsClaude.js: apply-r44.cjs. It adds `inventoryHiddenAttribute` = exact source NDESCBIT (fp 0) and
  `inventoryHiddenRecurses: true` to 15 titles: Zork1 14, Zork2 14, Zork3 25, Enchanter 7, Cutthroats 12 (fn 1, not exact),
  Deadline 25, Infidel 18, Planetfall 8, Sorcerer 9, Starcross 23, Witness 19, Hollywood 16, LGOP 8, Stationfall 10,
  Suspended 4.
  - None of these titles had an inventoryHiddenAttribute before.
  - The only attributeMap collision is `scenery`, which is NDESCBIT itself (same as the Moonmist precedent).
  - Spellbreaker and Moonmist are excluded.
- **The main tree is NOT edited.** grok holds the claim on js/ModuleStatFactsClaude.js (since 2026-10-26, "facts-file
  integration C-R3 then facts-D"). The facts exist only in the cand worktree and in batch-r44.diff.

## Unit harnesses (cand tree): all pass
- zil-invhidden-recurse 15/15
- operator-regressions 13 PASS / 0 FAIL
- zil-locked-map 22
- world-map-ui 52/0
- d214-zil-exits 17/0, d214-npc-possession 15/0, d214-yourself-verbs 10/0, d214-dark-room PASS, d214-room-door-alias PASS
- d46-room-identity 27/0
- exit-calibrator 26/0

## Gate results: 11 stable diffs, in 5 games
The diffs count as stable because both base runs agree with each other and both cand runs agree with each other.

### REGRESSION: Enchanter (inv1, inv2, marks) and Sorcerer (inv1, inv2, marks)
- The spells are NDESC children of the spell book:
  - Enchanter: book 144; spells 193/84/59/80 carry bit 7.
  - Sorcerer: book 139; spells 214/27/147/... carry bit 9.
- With the new inventoryHiddenAttribute, each spell is hidden and has no children, so it disappears.
  - Enchanter inventory drops from [book, blorb, nitfol, frotz, gnusto] to [book].
  - Sorcerer drops 7 spells.
  - Underline marks lose "spell" (Enchanter), and "frotz spell" becomes "spell" (Sorcerer).
- Native `i` probably omits them too. However, this removes the D148 "use spells from inventory" tap path, a missing
  option in a release title.
- Cause: the hidden-attribute fact. Recursion is not the cause.
- Proposed disposition: exclude Enchanter and Sorcerer from r44 (as with Spellbreaker) until D148 has a spell-book
  disposition.

### INTENDED: Suspended (rooms, exits, marks)
- Base: ["158:Iris"], no exits.
- Cand: 106/107/113/154 rooms, exit north>113, marks north/WALDO.
- Isolation: the base tree plus only the AttributeSchema.js diff reproduces cand exactly (iso-attrschema-only.jsonl).
- So this is D11 P11a: Suspended ONBIT (PROFILE bit 2) no longer reads rooms as garments, and the room walk now works.
  This is the named target of P11a.

### FLAKY: permagic and suvehnux marks
Both games are Inform; the facts are ZIL digests only, and the recursion and P11a guards require confirmed-zil-family.
- permagic is on the known flaky list. A pure base rerun (rerun-base.jsonl) gave the cand marks.
- suvehnux: pure base reruns 2, 3 and 4 (rerun-base-suv-*.jsonl) gave the cand marks, and base runs 1 and 2 gave the old
  marks. It is nondeterministic on unchanged code.

### FLAKY (same-tree runs differ)
- Known flaky list: Help, Jigsaw, Mask, Sherlock, cycles, gamlet, medusa, vespers.
- Not on the list: Mullmurd and School. They differ between same-tree runs, so they are flaky by definition. Neither is
  a ZIL title.

## Verdict
The gate is not clean. There is 1 REGRESSION family (Enchanter and Sorcerer spell books). Everything else is INTENDED
(Suspended) or FLAKY.

## Disposition (claude, after the gate)
- Enchanter and Sorcerer: REGRESSION accepted as such (spells are NDESC children of the book; the hidden fact removes
  the D148 held-spell inventory and link path). Both titles are EXCLUDED from r44, so they have no
  inventoryHiddenAttribute and no recurses. With no fact, the D1 code path is byte-identical to HEAD
  (zil-invhidden-recurse no-fact controls), so their outputs return to base. Tracked as DEFERRED D16 (spell book
  disposition, like Spellbreaker).
- Suspended: INTENDED (P11a; base plus AttributeSchema-only reproduces the candidate).
- permagic and suvehnux: both are Inform. Pure base reruns reproduce the candidate output (permagic 1 of 1, suvehnux
  runs 2-4). Applicability: the r44 changes are (a) facts keyed by exact ZIL digests, (b) D1 code that is live only when
  inventoryHiddenRecurses === true on a validated confirmed-zil-family title, and (c) P11a inside the zilStructural
  branch, which returns null only for confirmed-zil-family. Inform reaches none of them, so they are nondeterministic,
  not caused by the change.
Final r44 = 13 titles (Enchanter and Sorcerer removed). operator 13/0, zil-invhidden-recurse 15/15.
