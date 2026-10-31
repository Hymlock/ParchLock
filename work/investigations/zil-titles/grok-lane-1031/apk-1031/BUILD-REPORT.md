# APK build report: grok, 2026-10-31 (ET)

- Source: commit **04cc1d328814dfcd0bd9472e6eef4e14dd65071c**, built in the temporary worktree wt-grok-apk (detached, clean status). Ignored inputs were copied, not junctioned: games, node_modules, local.properties, cordova plugins, config.xml. The main tree was untouched (dirty count 3255 before and after; nothing was stashed, reset or modified).
- Gates at HEAD, all exit 0 (logs gate-*.log): complete-plan-gate PASS; command-consistency-regression PASS; zil-revealed-local-global PASS (19 LGOP controls); zil-light-forms 48 PASS; operator-regressions 13 PASS / 0 FAIL.
- Build: `build-android.bat dev`, unmodified, ran 11:20:38 to 11:21:43 ET. Gradle BUILD SUCCESSFUL; exit 0. Log: build-android-dev.log.
- Output in C:\Users\hymlo\Downloads\ParchLock-dist:
  - ParchLock-dev.apk: 87,987,935 bytes, 11:21:43 ET, sha256 7AC03EE93E8E84E1F285F746F1BC5149488073F53E586D4844AC5CA5EFFF36D5
  - ParchLock-source.zip: 27,228,711 bytes, 11:20:51 ET, sha256 405DE8BBCD4D1BB8C0830F48918E5D27C5A8A8484EB789E04448E5715DDE7776 (381 entries)
  - ParchLock.exe: 91,136 bytes, 11:20:40 ET, sha256 E698C0F9492E44EB311B6BF7C15FF27826C17FCDB7EADB913E8D0B53F963A9BF
  - Full list: dist-hashes.txt
- Provenance check: inside both the APK and the source zip, js/AttributeSchema.js (8B06DB75810A…) and js/ModuleStatFactsClaude.js (13AD202B37B9…) equal the HEAD versions. They do not equal the dirty main-tree versions (09EF46F6…, 429DE4FB…), so the uncommitted D260 and lamp work is not included.
- Worktree: removed. `git worktree remove` failed with "Filename too long" after unregistering it; the 0-reparse-point leftover directory was deleted with `rmdir \\?\…`, then pruned.
- Previous dist backup: C:\Users\hymlo\Downloads\ParchLock-dist-backup-20261031-pre-grok (APK 525F19F43725…, 10/26).
- Not published anywhere.
