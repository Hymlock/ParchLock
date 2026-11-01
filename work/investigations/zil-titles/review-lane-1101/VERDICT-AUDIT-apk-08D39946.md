# VERDICT AUDIT-apk-08D39946: ACCEPT (the delivered APK is the frozen HEAD)
Reviewer: grok-review, 2026-11-01 ~00:20 ET.
Artifact: C:\Users\hymlo\Downloads\ParchLock-dist\ParchLock-dev.apk. Built 10-31 23:48 ET, 88,161,650 bytes, sha256 08D39946BD13A11A2005B9895BED12BE8F41043B66825F4CDD2EA37FB680B7A1. Built by grok via `build-android.bat dev` after TREE FROZEN (ce6fba23).

## Checks (own evidence)
- assets/capacitor.plugins.json: present, 5 plugins (TTS, speech recognition, app, filesystem, share). This was the readback/mic regression root cause, and it is fixed in this APK.
- assets/public/js: all 59 *.js are content-equal to HEAD ce6fba23 js/. ModuleStatFactsClaude.js is blob-equal: dcc6eec1 = HEAD = 2286cbdc.
- The source zip contains the registry.
- The covering gate is c55cd31b, the final combined 309x2 gate (base ec8d4a6a vs HEAD+R3): 0 REGRESSION, 4 INTENDED, 6 FLAKY; operator 13/0. Committed evidence; not re-run (≈hours). The operator subset was re-run: 13/0.

## Note for the next APK
- The working tree now has an UNCOMMITTED js/ModuleStatFactsClaude.js edit by grok: mapzero playerGlobal entries for Cabal, Blue Chairs, Tokyo2, and more.
- build-android.bat builds from the working tree. The next APK must not be built until that edit is reviewed and committed (or set aside), or the APK will ship unreviewed facts.

