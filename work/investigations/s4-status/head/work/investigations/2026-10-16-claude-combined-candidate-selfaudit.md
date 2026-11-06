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

## Gate round 1 (first combined candidate) -> fixes found by the gate
HEAD-vs-HEAD rerun of the differing games measured run-to-run NOISE: Biscuit inv1, Inevita marks, Mask marks, WiR2 inv2,
cycles rooms/inv2, jet marks, medusa marks (they flip between identical runs). Not attributable to the candidate.

REGRESSIONS found and fixed before the final pass:
- Duplicate marks of one shared word (building x3, devdoit children x2, Cove sea x2): an object took its mark from a shared
  word that is only its secondary word. Such targets are now skipped (coverage symmetry).
- suvehnux "under": an object uncovered by the split took a stray second-pass token. Only its full name or head noun may
  mark it (preferred pass); otherwise it stays under the shared mark as before.
- Label losses: AllRoads "pair of manacles" (header "All that you know you have is:" -> the header test now runs on the
  line's last sentence and accepts any colon-ended line built around a player inventory phrase); curves "key ring" (Inform
  top-level rows are unindented -> the first row fixes the block indentation); Plundered Hearts / Moonmist "your reticule" /
  "your luggage" truncated to "reticule" / "luggage" (a label shorter than a possessive structural name now falls back);
  a leftover "and" in a descriptor now abstains. Controls 25/0.

INTENDED (kept): Enchanter spells listed, "spell" ambiguous mark, "Book" kept (open 12, D148); prose labels removed
(Lurking "You are carrying an assignment", dreamhold, Photograph, Wishbringer "You're holding ..."); native descriptors gained
(I-0 "pair of cut-offs", Mask "pair of shoes", huntdark "brightly-glowing lamplens" / "empty thighband"); duplicate
same-object marks removed (Tangle, shade, acorncourt; D146); own marks gained by objects previously hidden under another
object's ambiguous mark (identity window 69, ghost dark woods 59).

## Final pass (all-cand-final vs all-base, 309 games incl. ZIL + Inform Z + Glulx): 31 differences, 0 REGRESSION
- NOISE (flip in HEAD-vs-HEAD reruns): Biscuit inv1, WiR2 inv2, jet marks.
- INTENDED, as classified in round 1: Enchanter marks/inv1/inv2; I-0, Mask, huntdark descriptors; Photograph, Lurking,
  dreamhold, Wishbringer prose labels removed; Tangle, shade, acorncourt duplicate same-object marks removed; ghost, identity
  own marks gained.
- INTENDED, new in this pass: NightBeforeChristmas loses the ambiguous "bed" mark (candidates 45/50/51) while Mamma's bed 51
  and the small beds keep their own marks; gostak loses "Glauds" beside "glauds" and gourmet loses "oven" beside "large oven"
  (same-object duplicates, D146); oad / risorg "clothes" -> "your clothes" (matches the native row and the neighbouring
  "your talisman").
- Round-1 regressions all gone (no building/devdoit/Cove duplicates, suvehnux "under", AllRoads/curves/PH/Moonmist labels).
Guards on this exact version: command-disambiguation 51/0, underline-first-per-reply 8/0, hhg-links-live 22/0,
d150-noun-and-verbs 10/0, operator-regressions 7/0, label controls 25/0.
