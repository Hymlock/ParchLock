# REVIEW-REQUEST-002: versionCode 48 -> 49 (operator-requested, 12:23 AM ET)
Diff: working tree, `review-lane-1101/REVIEW-002.patch`. Pathspec: android/app/build.gradle, 1 line. versionName "2.0.0" is unchanged.
Claim: the new APK installs as an update over the build-48 APK. No app behaviour changes.
Doc/history check: 07b18df1 last moved it 45 -> 48. build-android.bat does not touch versionCode. The only other versionCode is in the capacitor-cordova-android-plugins library module, which is generated/unrelated and left alone.
Evidence after the build: `aapt dump badging` (or apkanalyzer) must show versionCode='49'. I will record that in VERDICT-APK evidence.

# Skips, for the record (no request)
- **Sherlock lamp duplicate switch verbs:** already fixed. c3dfec41 drops other switch/turn verbs when an owner lightForms scope exists, and 7f0cba58 repaired that. The only remaining path is a LearnedWords command the user saved themselves. TO-claude-1345 classed that as the documented rule (saved user choices stay recorded), so it is the LearnedWords decision, not a new fix. Not re-fixed (rule: no new fix where one exists).
- **Suspect "remove mask":** the worn-object noun comes from ActionSynth.referenceFor (shared code). There is no fact field for a noun override, so a fix needs a new shared-code mechanism. Skipped under the operator's "skip shared Inform/Glulx code" instruction. It fails gracefully ("You'll have to be more specific.").
- **The two Options panels in monospace:** body/button/input are 'Roboto Mono' by design (ParchLock.css 27/47/191), and there is no spec for which two panels are meant. Skipped pending operator identification and a screenshot.
