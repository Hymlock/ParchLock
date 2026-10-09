# App closes when it loses focus (APK 64): claude blind findings, sealed

Written 2026-10-09 before reading codex's report. The request was the blind #2245.

**Evidence status.** Static analysis only. No phone is attached (`adb devices` lists nothing), so there is no crash log. Logcat proof stays the operator's post-APK check.

## What runs when the app loses focus (APK 64)

The only native code is `ParchLockActivity.onStop()`, which calls `IconRotator.onLeave(this)` unless the activity is changing configuration or app-launched UI is pending. `onLeave` does the following:
1. applies a pending experimental OFF (`restoreBase`, which enables `.MainActivity` and disables all `.IconX`);
2. if neither the pinned shortcut exists nor experimental is on, it returns immediately: **no work**;
3. pinned shortcut: `updateShortcuts` with the next scene (an adaptive bitmap of 432 px at xxxhdpi);
4. experimental: `switchAlias`, which enables the next `.IconX` and **disables `.MainActivity` and the other aliases**.

All of this is wrapped in `try/catch (Exception)`.

The web side runs only harmless visibility handlers on hide: DirectionalRadial reset, mic abort, ReadAloud, and the Map G3 reveal reset. None of these is new to closing.

## Cause assessment

| Path | Can it close the app? | Why |
|---|---|---|
| Experimental ON | **Yes, every time the app loses focus.** | The running task was started through a launcher alias (`.MainActivity`, or the current `.IconX`). `switchAlias` disables that alias. Android finishes activities whose launching component is disabled; `DONT_KILL_APP` only spares the *process*. This matches "closes when minimized" exactly, and the public reports found earlier ("each time the icon changed, the app would close due to activity-alias lifecycle changes"). |
| Pinned shortcut only | Unlikely to crash. | `updateShortcuts` is an ordinary supported call and exceptions are caught. It is, however, background work at the wrong moment: Android rate-limits shortcut updates for backgrounded apps, so it can silently fail. |
| Neither | No. | `onLeave` returns before doing anything. |

**Conclusion:** the closing is almost certainly the experimental alias switch, if the operator turned it on (they say they will leave it off by default). In any case, the rotation must not run on focus loss.

## Direction (for the proposal)

1. **Move the pinned-icon rotation to app start.** On a cold start (`onCreate`, once per process), if our pinned shortcut exists, `updateShortcuts` it to the next scene in the foreground, where it is not rate-limited. The splash shows the scene of the icon that was tapped, and the icon then shows the next scene for the next launch. No icon code runs on `onStop` at all.
2. **Experimental launcher-icon setting.** Per the operator it stays off until the user turns it on, and it is not moved to app start: switching a launcher alias while running closes the app just the same, and doing it at start would close the app on launch. To make it usable, apply the alias switch **only when the user really exits** (`isFinishing()`, the Back exit), never on minimize. If even that is judged risky, keep it as is but have its warning say plainly "the app may close when you leave it". It is the operator's choice; I recommend the `isFinishing()` gating.
3. **The home-screen icon question comes first, on first run, before anything else.**
   - Android: a native `AlertDialog` in `ParchLockActivity.onCreate` on first launch (a preferences flag), shown before the web content, the splash and the tutorial. Yes calls `requestPinShortcut`, and Android shows its own confirmation. No is remembered, and Options can re-offer. The current web-side offer is removed, so the question is never asked twice.
   - Installation-time prompts are impossible on Android: no code runs at install.
4. **"If the user already placed a shortcut, replace it":**
   - Android: ParchLock's own pinned shortcut can be detected (`getPinnedShortcuts`) and replaced or updated in place; `requestPinShortcut` with the same id updates it rather than duplicating it. A copy of the *base app icon* that the user dragged to the home screen **cannot** be detected or removed by any app API, because it belongs to the launcher. The prompt text can mention it ("you can remove the old icon yourself").
   - PC: the launcher can scan the desktop for `.lnk` files whose target is this `ParchLock.exe` and, on Yes, take over or replace those, instead of skipping, which the operator now authorises. Unrelated shortcuts are never touched.

## Prior-fix guard

- D129 plugin registration before `super.onCreate`;
- the D215 rotation records and `pc-desktop-icon-test`;
- SaveFilePlugin `iconScene` and splash matching;
- no regression to the app-launched-UI exclusion (which becomes moot once nothing runs on stop).
