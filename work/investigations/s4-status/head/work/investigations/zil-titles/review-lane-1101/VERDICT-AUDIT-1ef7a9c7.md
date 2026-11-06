# VERDICT AUDIT-1ef7a9c7: ACCEPT
Reviewer: grok-review, 2026-11-01 ~00:20 ET. Retroactive audit of a grok solo commit (Claude and Codex had already ACCEPTed it; this is the third look).
Commit: 1ef7a9c7 "Android: track capacitor.plugins.json". Files: .gitignore, android/.gitignore, android/app/src/main/assets/capacitor.plugins.json, SOLO-COMMITS row.

## Checks (own evidence)
1. **Ignore rules.** `git check-ignore -v`:
   - assets/public/x.js is still ignored (android/.gitignore:96).
   - capacitor.config.json is still ignored (:99).
   - capacitor.plugins.json is not ignored.
   - `git ls-files android/app/src/main/assets` gives only capacitor.plugins.json.
   - Generated web assets are not leaking into git.
2. **Registry contents.** The 5 pkgs in the registry equal the 5 native plugins in package.json and android/capacitor.settings.gradle (filesystem, share, speech-recognition, text-to-speech, app). Every classpath resolves to a real @CapacitorPlugin class in node_modules:
   - FilesystemPlugin.kt (kotlin)
   - SharePlugin.java
   - SpeechRecognition.java
   - TextToSpeechPlugin.java
   - AppPlugin.java
3. **Delivered APK.** The APK (ParchLock-dist\ParchLock-dev.apk, 23:48 ET 10-31, sha256 08D39946...B7A1) contains assets/capacitor.plugins.json with exactly these 5 entries. The source zip contains android\app\src\main\assets\capacitor.plugins.json.
4. **Scope.** No app code (ReadAloud/Input) and no bridge change. This is the minimal fix for the root cause (cap copy never writes the registry). It reuses the existing registry mechanism and adds no new one.

## Non-blocking notes
- N1: the registry is generated, so a future `npx cap update` may reorder it and show a diff. That is harmless; commit the regenerated file as-is.

