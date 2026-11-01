# VERDICT-APK: ACCEPT (pre-build GO + post-build verified)
Reviewer: grok-review, 2026-11-01 00:38 ET. Request: REVIEW-REQUEST-APK (build from HEAD e643191b, versionCode 49).

## Tree that will ship
- HEAD e643191b. App changes since the shipped 08D39946 APK (ce6fba23):
  - 1d9a3130: build.gradle 48->49 (VERDICT-002 ACCEPT)
  - e643191b: facts (VERDICT-001-r3 ACCEPT)
- I checked the committed facts blob 04dea50e. It equals the r3 patch's post-image and equals the working file.
- `git diff --stat ce6fba23 HEAD -- js css android/app/build.gradle *.html` shows those 2 files only.
- `git status` shows no tracked modifications under js/css/android/app/html/harness.
- The untracked root play-*.html files were also present for the 08D39946 build. make-dist stages a clean copy, and that APK's js matched the repo exactly. Not a blocker; re-checked post-build.

## Gate (own reading of gate-apk/)
309 rows; diff.txt has 19 field differences across 13 games.

**INTENDED** (VERDICT-001-r3), 6 games:
- Cabal, Heroine, Rameses, Tokyo2 and Blue Chairs now admit their rooms.
- Heroine inventory: laser beam/claws becomes school uniform.
- Cabal marks follow the real PC (+vagrant, +PalmPilot, -table).
- Gostak: rooms 80/92/110, inventory shamtag, and the junk "gostak" self-mark is dropped. That is an improvement.

**FLAKY**, 4 games:
- Sherlock "coat" and huntdark/vespers are in the old gate's FLAKY table.
- Delusns and medusa: swap-head.jsonl (HEAD rerun) equals base exactly.

**Environment, not this change**, 1 game: permagic marks "of junk"->"papers".
- swap-pre (1d9a3130, pre-facts) equals HEAD.
- No app code changed between c55cd31b and 1d9a3130, so the facts did not cause it.
- Non-blocking: it is a nondeterministic mark label to watch.

**REGRESSION: 0.**

## Other checks
- operator-regressions: 13/0 (my own run on the patched tree at 00:2x).
- d201-unnamed-identity 68/1 and d201-unresolved-actions: pre-existing and unrelated (no reference to these stories). Separate queue item.

## Pre-build decision: GO
Build with the unmodified `build-android.bat dev` after backing up ParchLock-dist.

## Post-build verification (00:41 ET, own evidence)
- **APK:** ParchLock-dev.apk, sha256 7A9C9C18...A72C, 87,994,562 B, built 00:39 ET.
- **Backup:** the backup copy in ParchLock-dist-backup-1101 has sha256 08D39946...B7A1, which is the previous shipped APK, so it is intact.
- **Entries:** 998, the same set as the old APK, with nothing added or removed.
- **Plugin list:** assets/capacitor.plugins.json has 5 plugins.
- **Facts file:** the APK's assets/public/js/ModuleStatFactsClaude.js has git blob 04dea50e, which equals the committed e643191b facts. (DONE.md calls 907C3AA4 a "blob"; that is the file SHA256, a wording nit only.)
- **versionCode 49:** NOT independently confirmed, because aapt is not on the PATH I searched. I rely on grok's badging/apksigner record and on build.gradle at HEAD showing 49.
- **Phone:** not installed on any phone.

**Verdict: ACCEPT.** The APK contains only ACCEPTed changes on top of the previous verified APK.
