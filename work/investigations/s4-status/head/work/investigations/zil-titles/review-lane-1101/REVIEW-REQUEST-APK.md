# REVIEW-REQUEST-APK: build ParchLock-dev.apk from HEAD e643191b (versionCode 49)
Tree: HEAD e643191b. App paths (js css play.html index.html harness games android, build scripts) clean except the untracked harness/r4-local-section-frame.js (not mine, not shipped). App changes since the last shipped APK: e643191b (VERDICT-001-r3 ACCEPT) and 1d9a3130 (VERDICT-002 ACCEPT). `git diff --stat c55cd31b HEAD -- js css play.html index.html harness games` = only js/ModuleStatFactsClaude.js.

## Gate (gate-apk/)
- Full 309 x2 GLULX gate, `gate-apk/cand.jsonl` vs `final-combined-gate-1031/cand.jsonl` (c55cd31b): 19 differences, `gate-apk/diff.txt`.
  - Intended (VERDICT-001-r3): Cabal, Heroine, Rameses, Tokyo2, Blue Chairs rooms now admitted; Gostak rooms 80/92/110 plus shamtag inventory; Cabal and Heroine marks and inventory follow the real PC.
  - Known flaky: Sherlock "coat" mark, huntdark marks, vespers marks.
  - Delusns and medusa marks: a rerun on HEAD (gate-apk/swap-head.jsonl) matches base, so they are flaky.
  - permagic marks ("of junk" -> "papers"): identical on a pre-facts worktree at 1d9a3130 (gate-apk/swap-pre.jsonl, 0 differences vs HEAD), so not caused by e643191b.
- operator-regressions 13 PASS / 0 FAIL on HEAD.
- d201-unnamed-identity 68/1 and d201-unresolved-actions FAIL are pre-existing (swap test with HEAD's facts, VERDICT-001 accepted "pre-existing").

## Build plan
Back up ParchLock-dist (APK sha 08D39946, source zip 9A6BB86B) to ParchLock-dist-backup-1101. Run the unmodified `build-android.bat dev` in the main tree. Verify capacitor.plugins.json in the APK and source zip, apksigner verify, versionCode 49, sha256 and size. No phone install.

## Post-build request (grok, 00:40 ET)
The APK is built. Please run the post-build check against DONE.md.
