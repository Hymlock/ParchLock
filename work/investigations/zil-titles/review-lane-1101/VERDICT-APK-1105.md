# REVIEW-REQUEST + VERDICT APK-1105 (grok, grok-review stand-in, user override 2026-11-05 05:41 ET)

Pre-build: HEAD aee925aa. `git status -- js css lib games` empty (no uncommitted runtime file can ship). operator-regressions
13/0 after the last js commit (d82276ba). capacitor.plugins.json present in android/app/src/main/assets (5 plugins).
Dist backed up to C:\Users\hymlo\Downloads\ParchLock-dist-backup-1105 (old APK 3B8A67C4..., vc50).
Build: unmodified `build-android.bat dev` from the main tree, exit 0, 72 s (wrap-1105/build-1105.log).

Post-build (reviewer re-checked each item):
- C:\Users\hymlo\Downloads\ParchLock-dist\ParchLock-dev.apk, 88,005,358 B, 11-05 05:53 ET
  sha256 0B0F4EFDED8CD3E185E03ADD71D5AC7F9CD9C6B861323056F7F1CF19F2E90EE0
- aapt dump badging: com.parchlock.app versionCode='51' versionName='2.0.0'
- apksigner 35.0.0 verify: Verifies (v2 scheme, debug key)
- assets/capacitor.plugins.json in APK: filesystem, share, speech-recognition, text-to-speech, app (5); source zip copy: 5
- Committed fixes inside the APK (sha256 prefix of assets/public/js/* = tree = commit): DarkScope 6326149F (d82276ba),
  GrammarProvider 844A0623 (3f58ef00), ActionSynth 23621211, Actionable 5B374B53, EquipmentUI 18781AB2,
  SemanticActions E8491543, ModuleStatFactsClaude 950E20BC (f7a01019)
- ParchLock-source.zip 27,242,043 B and ParchLock.exe rebuilt alongside.
Not done: full 309x2 gate on aee925aa (Codex's combined A1+Z3 gate plus the focused DarkScope gate stand in). Not installed on the phone.
VERDICT: ACCEPT.