# Codex implementation audit: active APK64 issue 1

Blind investigations: operator-only2245, Codex2a3e492 and Claude2246. Compared2248; R2 attacked2253, R3 accepted2257. Current implementation independently accepted2264 after the concrete defects below were repaired. Claude owns product code; Codex owns the independent Activity fixture and workflow records. Queued issues2-10 are outside this round.

## Changes actually read

Native Activity, IconRotator, IconPolicy and SaveFilePlugin; Options IconRotation.js; PC launcher and shortcut fixture; service worker152. The installed Capacitor BridgeActivity was read to verify load-inside-onCreate, null-bridge callbacks, lifecycle forwarding and activityDepth. MobileLayout Back routing and installed AppPlugin.exitApp were checked against actual activity.finish().

- No pinned or alias work runs on a non-finishing stop. Pinned rotation is queued once for a new Activity and executes only while live and resumed. A pending update resumes once, without advancing again on mere returns or saved-state recreation.
- First native consent defers actual Bridge/WebView creation. Add updates the stable owned pin or requests native confirmation. No and Back dismissal are remembered; destroyed prompts cannot initialize a stale Activity. Normal launcher-created app icons cannot be enumerated or removed by this shortcut API, and the text does not claim otherwise.
- Deferred initialization forwards current start/resume and active status once, balancing activityDepth through a prompt/Home cycle. The tapped scene is saved across recreation and separate from future shortcut preferences.
- Experimental remains in Options, off by default with a warning and Cancel focus. It mutates launcher aliases only on a genuine finishing exit, not Home/lock/app switch. Shortcut scene preference commits only after successful native update.
- PC computes the current splash URL before advancing the future owned shortcut at startup. Explicit Yes can take over a top-level Desktop shortcut resolving to this executable; foreign targets are untouched, nothing is deleted, and a deleted owned shortcut is not silently recreated.

## Adversarial findings resolved

1. Native finishLoad originally posted unguarded rotation and consumed the launch flag before execution. The actual Activity integration fixture reproduced Home-before-Runnable updating in the background (first five checks passed, sixth failed). Reviews2258/2260 required a live resumed check inside the Runnable and preservation of pending once-only work. Current code fixes this; same fixture now passes all15.
2. Options refused text promised an automatic next-launch update even if no pin had been created. Review2261 requested truthful retry wording. Current text says Android did not allow it and asks the player to try later; native prompt points to Options. No automatic retry is promised.

## Focused validation

Independent Codex checks, current checkout:
- `python harness/audit-icon-activity.py`:15/0, actual Activity and IconPolicy compiled against isolated Android/Bridge doubles, including first prompt, deferred lifecycle, Home-before-queued-work, resume-once, destroyed Activity, saved launch scene, Back dismissal, destroyed prompt and prompt/Home balance. This is integration evidence with doubles, not device behavior proof.
- Windows C# compiler plus `harness/pc-desktop-icon-test.cs`:11/0 using temporary COM shortcuts; no real desktop changes.
- Android `:app:compileDebugJavaWithJavac --offline`:BUILD SUCCESSFUL, exit0.
- JavaScript syntax and scoped diff checks pass. Architecture chapter75 unique anchors, table entry, D215 target and boot qualification pass after correcting the check to exclude data-chapter-id from HTML id counting.

Claude reported independent Policy18/0, PC11/0, Activity15/0, Android compile/lint, splash matching, startup-menu guard and four Options outcomes. Those supplement, not replace, the checks above.

## Limits and stop condition

No phone logcat was supplied. Experimental alias mutation is a documented risk and credible explanation, not a proven device-specific crash cause. Current source removes icon work from ordinary focus loss; physical minimized/resumed behavior still requires operator testing in a newly built APK. No APK was requested or built in this round; delivered APK64 remains the older source149 binary. Source152 includes the new text/save-state and icon changes. Only the operator may mark the overall project complete.

## Final closure

Claude committed901eab8 and confirmed source closure2265. Codex re-read the current plan, architecture chapter75, decision index and checked OPEN_WORK item1; all eight audited implementation files are byte-identical to the independently tested files. Mutual implementation acceptance2264/2265 is satisfied. Timed mailbox polling stops at this condition; no persistent root watcher or model-launch monitor was started. Previous CSS closeout2254 and save-state architecture343f45f are also resolved. Queued issues2-10 remain open for separate rounds.
