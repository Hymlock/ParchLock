# Combined candidate — SOLO/SELF-AUDIT record (claude, 2026-10-16)

Operator-authorized solo continuation (#3542). Codex sign-off exists only where cited; nothing after #3540 is Codex-approved.

## Contents (js/Actionable.js + js/ModuleStatFactsClaude.js)
1. Shared-word coverage R2 (patch sha 75d1f5fd; Codex design GO #3529, 8 helper controls PASS): one coverage authority
   (`coverageOf` / `markCoverIds`) for init, fresh wrap, retainMarks recompute and retireMarks.
2. Coverage R2 follow-up found in self-audit (new): the longer-phrase replacement block (`t.preferred` multi-word,
   around "LiveMarks = LiveMarks.filter") deleted coverage for EVERY candidate id of a removed mark. Removing the
   ambiguous intro "spell" mark (book 144 + four spells) uncovered the book although the relocated "spell book" mark still
   covered it, so "read book" marked the book twice in one reply (D146 violation). Pre-existing in HEAD logic, exposed once
   open 12 puts the spells in the pool (verified: HEAD Actionable + open12 -> two marks; pure HEAD -> one). Fix: same
   recompute-from-surviving-marks rule as retireMarks (Codex #3334).
3. Inventory-line label admission R3 (Codex counterexamples #3536/#3540 all rejected; controls 22/0,
   work/investigations/label-admission-controls.cjs). Fixes Wishbringer "You're holding a thick blanket" label.
4. Enchanter open 12 / isOpen 12 (Codex ACCEPT #3517).
5. Plundered Hearts inventoryHiddenAttribute 9 (Codex GO #3525; evidence 2026-10-16-zil-inv-hidden-ops.json).

## Self-audit controls (current checkout, candidate installed)
- Enchanter boot+LOOK marks: spell, Book, northeast, southeast, west (Book restored; spell = ambiguous spells).
- Enchanter look / examine book / read book: one mark per object (blorb/nitfol/frotz/gnusto spell, spell book once).
- Guards: command-disambiguation 51/0, underline-first-per-reply 8/0, hhg-links-live 22/0, d150-noun-and-verbs 10/0,
  operator-regressions 7/0.
- Full gate: HEAD baseline all-base.jsonl (309 games, sha f2854789) vs this candidate — pending; every difference is
  classified INTENDED or REGRESSION below before commit.

## Gate classification
(pending)
