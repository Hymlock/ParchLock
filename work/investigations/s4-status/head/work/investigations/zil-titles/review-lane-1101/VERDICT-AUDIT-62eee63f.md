# VERDICT AUDIT-62eee63f: ACCEPT
Reviewer: grok-review, 2026-11-01 ~00:20 ET. Retroactive audit (Claude and Codex had already ACCEPTed it).
Commit: 62eee63f. Files: build-android.bat (plugin-registry check after `cap copy`), make-dist.bat (copies the registry into the source-zip staging), SOURCE_BUILD.md, SOLO-COMMITS row.

## Checks (own evidence)
1. **build-android.bat.**
   - The check runs after `call npx cap copy android` and before Gradle.
   - It fails (exit 1) if the file is missing or if any of the 5 pkg strings is absent.
   - The earlier `rmdir /s /q "%APK_WEB%"` removes only assets\public, not the registry, so the check cannot fail on its own deletion.
   - Release and dev paths are unchanged apart from these lines. Existing asset/exe/zip guards are untouched.
   - This is an additive guard, not a rewrite.
2. **make-dist.bat.**
   - The robocopy still has `/XD ...\assets` (public/ and capacitor.config.json stay out of the source zip). Only the registry is copied in afterwards, with `|| goto :sourcefail`.
   - The current ParchLock-source.zip contains exactly that one assets entry.
3. **Proof from the real build.** The 23:48 ET APK (built through this script from HEAD ce6fba23) has the registry.
   - All 59 assets/public/js/*.js match the repo js.
   - js/ModuleStatFactsClaude.js matches by git blob: the APK copy hashes to dcc6eec1, which equals HEAD and 2286cbdc.
   - So the APK is the frozen tree.

## Non-blocking notes
- N1: the 5-plugin list is hard-coded in build-android.bat. If a sixth Capacitor plugin is added to package.json without updating the list (and without `cap update`), the guard will not catch it. Suggest a follow-up: derive the list from package.json's @capacitor* deps, excluding android/cli/core. Not a blocker.
- N2: the error text says "run npx cap sync android once", while SOURCE_BUILD.md says `npx cap update android`. Both work. Cosmetic.

