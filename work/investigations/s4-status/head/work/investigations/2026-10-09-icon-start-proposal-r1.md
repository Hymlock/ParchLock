# Icon rotation at app start, first-launch prompt and owned-shortcut replacement: proposal R1 (claude)

**Basis:**
- sealed reviews `2026-10-09-claude-app-closure-blind.md` and `2026-10-09-codex-icon-start-blind.md`, which agree on every point;
- operator decisions (#2245): move the rotation to app start; ask about the home-screen icon first, on first launch, before anything else; replace an existing shortcut if the user says Yes; leave the experimental setting off until the user turns it on, and do not move it.

**Agreed facts:**
- `ParchLockActivity.onStop` → `IconRotator.onLeave` is the only icon work done on focus loss.
- Experimental alias toggling is the credible cause of the closing (PackageManager documents unpredictable behaviour despite `DONT_KILL_APP`). It is unproven without logcat.
- The JS offer appears 4 s after load, so it is not "first".
- Only the owned pinned id `parchlock-rotating` can be updated or replaced; a launcher's own copy of the base app icon cannot be enumerated or removed by any app API.

## R1

1. **No icon work on focus loss.** Remove `IconRotator.onLeave` from `onStop`. Delete `appUiPending` and the `startActivity*` overrides, which are no longer needed (smaller surface).

2. **One logical launch transaction.**
   - It runs in `ParchLockActivity.onCreate` only when `savedInstanceState == null`. A configuration recreation, a restore after process death, `onResume` (from a picker, permission sheet or unlock) and an `onNewIntent` that only brings an existing task forward are **not** launches.
   - A static per-process guard ensures it runs at most once.
   - Steps:
     - (a) record the launching scene (`sceneOfLaunch(intent)`, from the tapped alias or the shortcut extra), so `iconScene()` keeps the splash on the icon the player tapped;
     - (b) advance `scene = (scene+1) % 4`;
     - (c) if the owned pin exists, `updateShortcuts` it to the new scene now, in the foreground, so it is not rate-limited. This is posted to the main looper after `super.onCreate`, so it never delays the WebView or the splash decision.
   - A refused update keeps the old index, so the next launch retries the same step.

3. **Experimental launcher setting.** It stays off by default and is not moved to start: switching the alias of a running task closes it, and doing so at start would close the app on launch.
   - The alias switch for the current scene is applied **only on a real exit**: `onStop` with `isFinishing()`, meaning Back out of the app, when the task is ending anyway. It never runs on Home, lock or app switch.
   - Toggling it on or off is recorded and applied at the next real exit, as today.
   - The warning text becomes: "Experimental: the app icon changes when you exit ParchLock with Back. Some phones may remove or move your home-screen icon."

4. **First-launch prompt, native and first.**
   - On first launch (preference `iconPromptAsked` unset) and only when `isRequestPinShortcutSupported`, show a native `AlertDialog` in `onCreate`, before the WebView becomes interactive and before the splash, tutorial or any JS prompt.
   - Text: "Add a ParchLock icon to your home screen? Its picture changes to a different story scene each time you open ParchLock." with the buttons **Add icon** and **Not now**.
     - **Add icon:** if an owned pin exists, update it in place (that is the replacement). Otherwise `requestPinShortcut`, and Android shows its own confirmation.
     - The dialog adds one line: "If you already have a ParchLock icon on your home screen, you can remove the old one."
     - **Not now** is remembered. Options re-offers it, and the Options button stays enabled as "Update home-screen icon" when a pin exists.
     - Unsupported launchers (API < 26 or no pin support) are never asked.
   - The JS `offerOnce` is removed, so the question is never asked twice. The pin's own outcome is never recorded as accepted; ownership is always read from `getPinnedShortcuts`.

5. **PC launcher, the same model.**
   - **Rotation at start:** before opening the browser, the URL carries `?splash=<current scene>` (the scene the shortcut showed when clicked). The launcher then advances the scene and rewrites the owned shortcut's icon to the next scene. Nothing happens on close.
   - **First-run question, first, as today.** On Yes, the desktop is scanned for `.lnk` files whose target is this `ParchLock.exe` (resolved path, case-insensitive). If one exists, it is taken over as the owned shortcut and rewritten (replace); otherwise `Desktop\ParchLock.lnk` is created. Shortcuts pointing elsewhere are never touched. The rest of `DesktopIcon` ownership is unchanged.

6. **Tests:**
   - Android unit-level fixture (JVM or Robolectric if available; otherwise a pure-Java helper test of the launch-decision logic):
     - no rotation from stop;
     - exactly one advance per logical launch;
     - none on recreation or resume;
     - a refused update keeps the index;
     - experimental applies only when `isFinishing`;
     - the prompt decision table (first launch and supported, asked, unsupported).
   - Gradle compile.
   - `pc-desktop-icon-test` extended: rotation at start; takeover of an existing `.lnk` targeting this exe; a foreign `.lnk` untouched.
   - Splash: `?splash` matching unchanged.
   - Device behaviour (no closing on minimize, prompt first, in-place update) is the operator's post-APK test, with logcat if anything remains.

**Prior-fix guard:** D129 registration; D215 rotation, ownership and splash records; `pc-desktop-icon-test`; startup-menu-regression; the Options App icon group.

## R2 (codex #2248 and #2249)

- **Causation wording.** The experimental alias toggling is the *credible, documented-risk* cause and is not proven without logcat. Removing all focus-loss icon work is the fix regardless of which path caused it. The operator's device test confirms it.
- **"Not moved" means Options location and off by default.** It is not a licence to keep background work. The experimental switch is applied only when `isFinishing()` is true (a Back exit), never on minimize, lock or switch. Timing contract: **no icon work, of either kind, on any non-finishing stop**.
- **Truly first, the native prompt before the WebView** (codex #2249: `BridgeActivity.onCreate` calls `load()`, which builds the Bridge and loads the WebView).
  - `ParchLockActivity` overrides `protected void load()`. If the first-launch prompt is due, it shows the native dialog and calls `super.load()` only when the dialog resolves (Add, Not now, or dismissed by Back, which counts as Not now). Otherwise it calls `super.load()` immediately.
  - `registerPlugin(SaveFilePlugin.class)` stays before `super.onCreate` (D129).
  - While deferred the bridge is null, so these are guarded: `onNewIntent` (store the intent, call `setIntent`, and skip forwarding to the bridge), `onActivityResult`, `onConfigurationChanged` and `onRequestPermissionsResult` (no-op while the bridge is null). `onStart` and `onResume` already guard null (codex). A configuration change during the dialog recreates the activity: the dialog is re-shown (the preference is still unset), with no double launch transaction because `savedInstanceState != null` skips the advance.
  - The launch transaction (scene record and advance) runs before `load()`, so `iconScene()` is ready for the splash.
- **PC takeover scope is justified by the operator's words:** "it should check if the user has already placed a shortcut and replace it if they have, if they choose yes." The scope is bounded to `.lnk` files **on the user's Desktop** whose resolved target is **this** `ParchLock.exe`. Start Menu and other folders are not scanned, and foreign targets are never touched. If several match, the first is taken over and the others are left alone (no deletions).

## R3 (codex #2253, A-E; my extra null guards dropped per #2251)

- **A. Deferred load lifecycle.**
  - `ParchLockActivity` tracks `started` and `resumed` flags in its own `onStart`, `onResume`, `onPause` and `onStop`, each calling `super` as today.
  - When the dialog resolves, and only if `!isFinishing() && !isDestroyed()`, it calls `super.load()`. It then forwards the current state to the new bridge **exactly once**: `if (started) bridge.onStart(); if (resumed) bridge.onResume();`. These are direct `Bridge` calls; it never calls `super.onStart` again, so `activityDepth` is untouched.
  - The dialog is dismissed in `onDestroy` (no window leak), and a destroyed or finishing activity never loads.
  - Tests: Add, Not now, Back-dismiss, Home during the prompt then return (the dialog is still shown and no load happens until it is answered), recreation during the prompt (re-shown and no double advance), and a resumed start.
- **B. Launch counting.** One launch per **new Activity instance**: `onCreate` with `savedInstanceState == null`. There is no static per-process guard, so a real Back exit followed by a relaunch in the same process counts. `onNewIntent`, including any synthetic call from `Bridge.load`, never advances. Recreation (`savedInstanceState != null`) never advances.
- **C. Immutable launch scene, and commit only after success.**
  - `launchScene` is computed once in `onCreate`: the tapped alias or the shortcut extra, otherwise null (random splash). `iconScene()` returns it for the life of this Activity.
  - `futureScene = (stored + 1) % 4` is committed to preferences **only after** `updateShortcuts` returns true (pinned path). With no pin and experimental off, nothing advances.
  - Experimental: the alias switch at the real exit uses `futureScene` and commits only after the switch succeeds.
  - The pinned update runs on the main looper after `super.load()` (or immediately when no prompt is due), never inside `onStop`.
- **D.** `requestPin` loses its `noteAppUi()` call, together with `appUiPending` and the `startActivity*` overrides.
- **E. Truthful results.**
  - `pinRotatingShortcut()` resolves `{ action: "updated" | "requested" | "refused" | "unsupported" }`:
    - **updated**: an owned pin exists and `updateShortcuts` returned true;
    - **requested**: Android's pin confirmation was shown;
    - **refused**: rate-limited or false;
    - **unsupported**: no pin support.
  - Options shows a short message: "Home-screen icon updated.", "Android will ask you to place the icon.", "Android didn't allow the update right now; it will update the next time you open ParchLock." or "This launcher doesn't support app-placed icons."
  - The native first-launch dialog uses the same paths.

The accepted direction is unchanged: no icon work on any non-finishing stop; the opted-in experimental switch only on a real finishing exit; Options location, off by default and the warning unchanged; the pinned transaction at startup; PC takeover scoped to the same exe on the Desktop.
