# REVIEW-REQUEST-003 (docs only): OPEN_WORK.md becomes the Nov 1 working list
Diff (staged): REVIEW-003.patch.
- `git mv` OPEN_WORK.md -> OPEN_WORK-2026-10-22-OUTDATED.md, with the banner "OUTDATED as of 2026-11-01. Superseded by OPEN_WORK.md. Kept for history only." The old file is otherwise unchanged.
- New OPEN_WORK.md lists every item from the "What's Left to Implement (Nov 1, 2026)" report, grouped by area. Each row has the description, effect, status, blocker, source and size.
  - The report's code lists 49 items (M12, I6, A6, S6, Z4, B8, E7). Its "48" headline was a miscount.
  - Done tonight: M1 and M2 (e643191b), B3 (1d9a3130). A2 is marked Done at its earlier fix (c3dfec41/7f0cba58).
  - A1 is now Blocked (shared code).
  - Unverified items were rechecked with `git log --since=2026-10-20 --grep`; none has a commit. M7 was corrected to Partly done, because ZRamReader already reads door_to for door classification. A6 now records css/Tutorial.css:65. B8 now records the d201 failures and the flaky marks.
- Links: the other mentions of OPEN_WORK in PRODUCTION_PLAN.md and ARCHITECTURE_UML.md are dated history entries, and docs/ai-*.md belong to other seats. None of them is misleading, so none was edited.
No app, harness or build change.
