# Codex blind investigation: icon lifecycle and first-run prompt

Sealed independently from operator-only bus2245, current checkout c703f8f. No Claude findings read. No product edits. APK64 phone report is authoritative as a symptom; no device logcat, exception or measured process death was supplied, so precise crash attribution remains unproved.

## Current-code evidence

1. ParchLockActivity.onStop (lines64-69) invokes IconRotator.onLeave for Home, screen lock and external focus loss, excluding changing configuration and app-launched UI. This is the only icon-rotation lifecycle invocation. onResume merely clears appUiPending. IconRotator.onLeave advances a pinned icon and/or calls switchAlias, which enables one launcher alias and disables the base/other aliases via setComponentEnabledSetting(DONT_KILL_APP). There is no explicit finish/System.exit in this path. Exceptions are caught and logged, but launcher/package effects need not be Java exceptions. The real target activity is not toggled.
2. Experimental is false by default, but previously accepted experimentalPending on/off applies during onStop. A user with neither our enabled pinned shortcut nor experimental state executes a fast return. Therefore a universal closure from mere focus loss cannot be proved solely from this function; experimental component changes are a credible mechanism, not a confirmed device cause. Default pinned-only updates use ShortcutManager.updateShortcuts, not component toggles.
3. JS first-run offer is deferred 4000ms after DOMContentLoaded, skips permanently for that invocation when Message.IsOpen, skips an already pinned shortcut, and records offered before a native pin confirmation outcome. Splash initializes independently with its 150ms native scene fallback. Thus the existing prompt cannot satisfy "immediately ... before anything else" reliably.
4. Pinned ownership is exact stable ID parchlock-rotating from ShortcutManager.getPinnedShortcuts. requestPin currently always requests a system pin instead of explicitly updating an already present owned pin; Options disables its button when pinned. An existing normal app/alias home-screen icon is not represented by this ID and cannot be enumerated/deleted/replaced in place using this app's ShortcutManager API. Do not promise replacement of arbitrary launcher icons or touch another app's shortcut. For the known owned pinned ID, updateShortcuts provides in-place replacement.
5. Splash currently reflects the launching icon (or random for base/recents), while onLeave advances future icon preferences. Moving updates to startup requires an explicit policy: retain the tapped icon scene for this launch and advance the future shortcut, or display the newly selected startup scene. Do not let an async rotation race the 150ms splash decision or rotate twice on onCreate + onNewIntent + onResume. Resume from picker, permission sheet, screen unlock and configuration recreation must not count as new launches.

## Prior decisions checked

PRODUCTION_PLAN D215 records the exact onStop design and why it kept foreground component changes away from the active app. It also preserves experimental OFF until warned opt-in, safe stable pinned ID, rate-limit refusal keeping scene, and splash matching tapped icon. Existing ARCHITECTURE chapter74 ends at D214 and lacks this native slice; the previously requested D215 architecture update remains peer-owned. This new operator instruction changes timing; moving the same risky alias mutations from onStop to foreground startup alone does not prove no closure.

## Research and constraints

- Android PackageManager documents unpredictable application behaviour despite DONT_KILL_APP when changing component states: https://developer.android.com/reference/android/content/pm/PackageManager#DONT_KILL_APP
- Android ShortcutManager updates existing app shortcut IDs, with launcher-controlled pin confirmation/support: https://developer.android.com/reference/android/content/pm/ShortcutManager#updateShortcuts(java.util.List%3Candroid.content.pm.ShortcutInfo%3E)
- App-owned pinned shortcuts differ from launcher-created app icons: https://developer.android.com/develop/ui/compose/system/shortcuts/creating-shortcuts

## Candidate design questions for later comparison (not implementation consensus)

- Eliminate ALL icon work from pause/stop/focus-loss hooks. Define one native logical launch transaction, not each resume; startup selection, pin update and scene publication must be coherent and bounded.
- Put one-time consent into native first-launch UI before the WebView/splash/tutorial become interactive, with saved decision, supported/unsupported state and owned-pin update path. Preserve Options location and warned experimental toggle; default remains off.
- Avoid disabling the currently launching alias during a live session. An experimental start-only scheme still needs risk analysis; do not claim timing itself prevents OEM process restart. Operator may need to test launcher behaviour/logcat after focused compile/unit guard verification.
- Tests should prove no rotation from background/stop, one rotation per intended launch, no resume/configuration double advance, existing-pin update without duplicate request, no-pin consent and denial handling, unchanged off-by-default experimental guard, and deterministic splash/startup ordering. No broad module sweep is relevant.

This is independent research, not a fix or a consensus claim.
