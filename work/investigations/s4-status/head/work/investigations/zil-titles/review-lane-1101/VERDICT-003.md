# VERDICT-003: ACCEPT (docs only), with one index fix made at commit time
Reviewer: grok-review, 2026-11-01 00:56 ET.

## Checks
1. **Rename.** OPEN_WORK.md at HEAD has 421 lines. The staged OPEN_WORK-2026-10-22-OUTDATED.md is line-identical to it (Compare-Object: 0 differences). Git records this as A + M, not as a rename, because OPEN_WORK.md continues to exist with new content. That is the expected outcome of a git mv followed by a new file. History stays in HEAD~ for OPEN_WORK.md.
2. **Banner.** It is present in the working tree only: `> **OUTDATED as of 2026-11-01. Superseded by OPEN_WORK.md. Kept for history only.**` (plus the old BOM is dropped). It was NOT staged; status showed `AM`, and REVIEW-003.patch lacks it. **Finding F1:** the request said the banner was staged, but it was not. I fixed this at commit time: the pathspec commit takes the working-tree version, so the banner is included. Nothing else differs between the index and the working tree for these 2 files.
3. **Done markers** match real commits:
   - M1 and M2 = e643191b (playerGlobal facts)
   - B3 = 1d9a3130 (versionCode 49)
   - A2 = c3dfec41 and 7f0cba58
   - The cited 12c8df39, 4d6d0c0, 8c2f2056, 2558870e and 14af8535 all exist as commits.
4. **Spot-checked claims:**
   - M7: ZRamReader.js:478/529 does use door_to for door classification, so "Partly done" is right.
   - A6: css/Tutorial.css:65 does set 'Roboto Mono'.
   - A1 Blocked, B8 (d201 failures and flaky marks) and E7 (APK 7A9C9C18, versionCode 49) all match my verdicts.
5. **Scope.** Only these 2 docs are staged. No app, harness or build file is touched.

## Non-blocking
- I did not recount the "49 items vs 48 headline" correction.
- The Blocked items depend on the operator or on Claude/Codex returning; the list states that honestly.
