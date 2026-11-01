# DONE: review lane 1101 (grok solo), 2026-11-01 00:40 ET

## APK
- C:\Users\hymlo\Downloads\ParchLock-dist\ParchLock-dev.apk
- sha256 7A9C9C183ACB593B40EAEB1E2F89A287C16D3F3B53215B83EE7FD4081AA8A72C, 87,994,562 B, built 00:39 ET from HEAD e643191b.
- Package com.parchlock.app, versionCode 49, versionName 2.0.0.
- apksigner verify: Verifies (v2, Android Debug cert, exit 0).
- assets/capacitor.plugins.json is 558 B and equals the repo file. The APK's ModuleStatFactsClaude.js equals the committed file (git blob 04dea50e; file sha256 907C3AA4).
- 998 entries, the same as the previous APK. The only entry whose size changed is ModuleStatFactsClaude.js. The smaller APK size comes from compression only.
- Source zip ParchLock-source.zip: sha256 E3D3745F12F1B5EC36E20934752338556FC8D61D7E5FF6D49F2B298D7C8B25B5, 27,233,418 B. It contains android\app\src\main\assets\capacitor.plugins.json (558 B).
- Backup of the previous dist (APK 08D39946, zip 9A6BB86B): C:\Users\hymlo\Downloads\ParchLock-dist-backup-1101.
- Build log: build-1101.log. Not installed on any phone.

## Commits
- e643191b: map-zero playerGlobal facts for Cabal, Blue Chairs, Tokyo2, Rameses, Heroine and Gostak (VERDICT-001-r3 ACCEPT).
- 1d9a3130: versionCode 48 -> 49 (VERDICT-002 ACCEPT).

## Gate
- gate-apk/diff.txt: 19 differences. 0 are regressions (see VERDICT-APK).
- operator-regressions: 13/0.

## Skipped
See REVIEW-REQUEST-002 (Skips):
- Sherlock lamp: already fixed in c3dfec41/7f0cba58.
- Suspect "remove mask": needs shared ActionSynth code.
- Options monospace panels: not specified.
