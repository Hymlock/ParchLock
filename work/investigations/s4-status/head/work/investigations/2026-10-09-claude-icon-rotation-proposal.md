# Icon rotation, native side (claude proposal, for codex review); assigned in #2123

**Operator decisions:**
- the approved storybook icons come in 4 variants (scenes: map, dungeon, archive, forest; `img/ParchLockSplash.js` order and ids);
- on Android the icon rotates **on leaving the app**, but not for in-app pickers or screen rotation;
- on PC, a first-run consent creates a desktop shortcut whose icon rotates on every close;
- the next splash **matches the icon only if that is simple**.

This proposal shows that matching *is* simple on both platforms, with no shared storage beyond what each platform already has. Codex owns the image and web packing. Claude owns the code below.

## Scene ids (shared)

`map`, `dungeon`, `archive` and `forest` are the existing `scenes[].id` values. Asset names follow them:
- Android mipmaps: `ic_launcher_<id>` (foreground, background, round and monochrome);
- PC: `img/icons/parchlock-<id>.ico`.

## Splash matching (web, one small change)

`ParchLockSplash.js` picks `scenes[randomIndex()]` today. New rule:
1. If a valid preferred scene id is supplied, use that scene.
2. Otherwise fall back to random, exactly as today.

The preferred id comes from:
- **PC:** the launcher opens `play.html?splash=<id>`. The splash reads `URLSearchParams`.
- **Android:** a new `@PluginMethod iconScene()` on the existing `SaveFilePlugin` (D129 registration, so no new plugin). It returns the scene of the **alias the app was launched through** (`getActivity().getIntent().getComponent().getClassName()`), or the stored index when launched from recents. The splash awaits it for at most 150ms, then falls back to random. If the bridge is missing (web build), it is random as today.

Unchanged: dismissal (`hasBeenDismissed`), the markup and the timing.

## Android (MainActivity.java, AndroidManifest.xml)

**Manifest:**
- Move the MAIN/LAUNCHER intent filter from `MainActivity` to 4 `<activity-alias>` entries: `.LauncherMap`, `.LauncherDungeon`, `.LauncherArchive` and `.LauncherForest`.
- Each has `targetActivity=".MainActivity"`, `exported="true"`, its own `android:icon` and `android:roundIcon`, and the same label.
- Only `.LauncherMap` has `enabled="true"`; the others are `enabled="false"`. MainActivity stays exported, without the LAUNCHER category.

**Rotation trigger: user leaving, not app-initiated UI.**
- `onUserLeaveHint()` sets `userLeft = true`. Android calls it only when the user leaves by choice (Home or Recents). It is **not** called when the app itself starts another activity: the `SaveFilePlugin` document picker, the WebView `<input type=file>` chooser used by imports, share sheets or speech recognition. It is also not called on screen lock or incoming calls.
- `onStop()`: if `(userLeft || isFinishing()) && !isChangingConfigurations()`, call `rotate()`. `isFinishing()` covers leaving with Back.
- `onStart()` resets `userLeft = false`.
- `onDestroy` is not relied on.

**`rotate()`:**
1. Read `index` from SharedPreferences `parchlock_icon` (default 0) and compute `next = (index+1) % 4`.
2. `setComponentEnabledSetting(next alias, ENABLED, DONT_KILL_APP)` **first**, then `(current alias, DISABLED, DONT_KILL_APP)`, so at least one launcher entry always exists. Use API 33's `setComponentEnabledSettings` batch where available.
3. Store `next`. All of this happens in onStop only, never in the foreground. Exceptions are caught and logged; on failure the current alias is left enabled.

**Risk that must be proven on the operator's device:** some launchers (notably Pixel Launcher) **remove a home-screen shortcut** whose component gets disabled, instead of updating it. The app-drawer icon always updates. If the operator's launcher drops the home-screen icon on rotation, the operator decides one of:
- (a) accept a drawer-only rotation;
- (b) rotate only the PC shortcut, keeping Android fixed.

This must be verified with the dev APK before release.

## PC (pc-launcher/ParchLockLauncher.cs; no new dependency, .NET Framework csc as today)

- **Settings:** `%LOCALAPPDATA%\ParchLock\launcher.ini` (the folder already exists for `browser-profile`) holds `shortcut=yes|no|unasked`, `scene=<0-3>` and `shortcutPath=`.
- **First run** (`shortcut=unasked`), before the browser starts: a `MessageBox` Yes/No, "Add a ParchLock shortcut to your desktop? Its picture changes each time you close ParchLock."
  - Yes: create `Desktop\ParchLock.lnk` (`Environment.SpecialFolder.DesktopDirectory`). Its TargetPath is this exe, the WorkingDirectory is the exe folder, the IconLocation is `img\icons\parchlock-<scene>.ico,0`, and the Description is the marker "ParchLock (rotating icon)".
  - The shortcut is created through `WScript.Shell` via `Type.GetTypeFromProgID` and `InvokeMember` (late-bound COM, so no extra references).
  - The answer is stored. No is permanent.
  - `ParchLock.exe --desktop-shortcut` asks again later.
- **Launch:** the URL becomes `play.html?splash=<sceneId>`, so the splash matches the shortcut icon.
- **On close** (after `WaitForExit`, or the `RunUntilQuit` path; only when a session actually ran):
  - Compute `scene=(scene+1)%4`.
  - If `shortcutPath` exists **and** its Description carries the marker, rewrite IconLocation (and TargetPath if the exe folder moved), save it, and call `SHChangeNotify(SHCNE_UPDATEITEM, SHCNF_PATHW, lnk)` and then `SHChangeNotify(SHCNE_ASSOCCHANGED)`.
  - If the shortcut was deleted, do nothing and never recreate it.
  - Other shortcuts are never touched.
- **Unchanged:** the exe's embedded icon (`/win32icon`) is static, and the build script gains the 4 `.ico` files in dist. A taskbar pin of the exe does not rotate; this is documented.

## Proof plan

| Area | Proof |
|---|---|
| Web | Splash with `?splash=dungeon` shows dungeon; an invalid id falls back to random; with no parameter it is random as today (startup-menu-regression, plus a focused check). |
| PC (this machine) | First-run prompt. Yes creates the lnk with icon *map*. Close rotates it to *dungeon*: read the lnk IconLocation before and after. The next launch's URL carries `splash=dungeon`. No is never asked again. A deleted lnk is not recreated. A moved folder updates TargetPath. |
| Android (operator device, dev APK) | Leaving through Home rotates the drawer icon; the next launch shows the matching splash. An import file picker, rotation and screen lock do not rotate. Home-screen shortcut behaviour is observed and reported (the risk above). |

**Prior-fix guard:** D129 plugin registration (SaveFilePlugin still works: save and export round trip), startup-menu-regression, and the splash-related checks in layout-regression.

## Revision R1: Android must never remove or move the home-screen icon (operator)

Operator: "You need to figure out how to keep mobile from removing or moving the icon every time it changes."

Activity-alias switching is **withdrawn**. Launchers bind a home-screen icon to the exact launcher component. Disabling that component commonly removes the icon from the home screen (it stays in the drawer) or leaves an "app not installed" stub (Dan Lew, "Preserve your launchers", and the Mozilla bug 1268455 patch notes). We cannot control that per launcher.

**Replacement: one pinned home-screen shortcut, updated in place.** This is the same model as PC.
- **The app-drawer icon is fixed.** It is one launcher component (MainActivity, unchanged manifest) with the approved base storybook icon. Nothing is ever enabled or disabled, so no launcher entry can vanish.
- **First run:** ask "Add a ParchLock icon to your home screen? Its picture changes each time you leave ParchLock."
  - On yes, call `ShortcutManager.requestPinShortcut()` with id `parchlock-rotating`, an intent to MainActivity, and an adaptive-bitmap icon of the current scene. Android then shows its own confirmation, and the user places it.
  - The answer is stored in SharedPreferences, and no is permanent. The question can be re-offered from Options.
- **On leaving** (`onUserLeaveHint` or `isFinishing`, and not changing configurations, as before): if `getPinnedShortcuts()` still contains `parchlock-rotating`, call `updateShortcuts()` with the next scene's icon. `updateShortcuts` updates existing shortcuts by id, including pinned ones, so the shortcut stays where the user put it and only its picture changes.
- If the user removed it, nothing happens and it is never re-pinned silently.
- **Splash matching:** the shortcut intent carries `extra scene=<id>`, which `iconScene()` returns, so tapping the shortcut opens on the scene it shows. The drawer icon gives a random scene, or the stored one.
- **Device verification** (dev APK, operator's phone):
  - the icon changes in place after leaving, with no removal or movement;
  - the launcher's refresh timing;
  - whether the launcher draws a small app badge on pinned shortcuts (some launchers do; cosmetic, reported to the operator);
  - the background update rate limit is not hit (one update per leave).
- **API floor:** `requestPinShortcut` needs Android 8 (API 26), which is ParchLock's minimum or below. Check `minSdk`. Below 26, no prompt is shown and the icon stays fixed.

PC is unchanged from the proposal: the first-run desktop shortcut whose icon rotates on close.

## Revision R3 (operator: safe default plus an experimental opt-in with a warning; codex #2139, #2152, #2159, #2160)

**Component structure (codex #2159).** Today the launcher component *is* `com.parchlock.app.MainActivity`, and existing home-screen copies point at that name. So:
- Rename the real activity class to `ParchLockActivity` (BridgeActivity, same code, D129 plugin registration unchanged). Mark it `exported="true"` with **no** launcher filter. It is never enabled or disabled, so it is the stable target for every intent and for the pinned shortcut.
- Declare an `<activity-alias android:name="com.parchlock.app.MainActivity" android:targetActivity=".ParchLockActivity">` holding MAIN/LAUNCHER, with the base storybook icon. This is the Dan Lew / Mozilla 1268455 "preserve your launchers" pattern: the public name users' icons point at stays identical, and it is enabled by default.
- Declare 4 experimental aliases `.IconMap`, `.IconDungeon`, `.IconArchive` and `.IconForest`, each with `enabled="false"`, the LAUNCHER filter and their own icon.
- Update `layout/activity_main.xml tools:context` to the new class. Nothing else references the name (checked: manifest, layout, and a comment in a copied asset).
- The app stays launchable at all times: the target activity is never disabled, and at least one launcher alias is always enabled (enable the next one before disabling the old one). This works on API 24, where aliases are supported.

**Default path, pinned shortcut (API 26+).**
- **First-run offer.** A one-time in-app question, then `requestPinShortcut(id "parchlock-rotating")` whose intent targets `ParchLockActivity` with extra `scene`. Android shows its own confirmation. "No" or a cancellation is remembered. The offer can be re-made from Options.
- **On leaving.** In `onStop`, when not `isChangingConfigurations()` and no app-launched UI is outstanding:
  - Rotation includes screen lock (operator #2124).
  - "App-launched UI" is detected generically by overriding `startActivityForResult(Intent,int,Bundle)` and `startActivity(Intent,Bundle)` in `ParchLockActivity`. That catches SaveFilePlugin, the Capacitor WebView file chooser, share and speech intents, because ActivityResultRegistry calls `startActivityForResult` on the activity. The overrides set `externalUiPending`, which is cleared in `onResume`.
  - Rotation itself: if `getPinnedShortcuts()` contains our id and it is enabled, `updateShortcuts()` with the next scene's icon. That icon is `Icon.createWithAdaptiveBitmap` of the **foreground composed over the dark background** (#2142), never the 82% legacy PNG.
  - If `updateShortcuts` returns false (rate limited), the stored scene index stays unchanged.
- **Never re-pin.** A deleted shortcut is not re-pinned.
- **Below API 26** there is no offer, and the icon stays fixed.

**Experimental path** (Options, "Change the app icon too (experimental)", default **off**):
- **Enabling** shows a confirmation, with Cancel as the default button: "Experimental: changing the app icon can make some phones remove or move your ParchLock home-screen icon. Turn on anyway?" Cancel changes nothing (#2160). There is no "drawer icon is safe" claim.
- **While on**, rotation in the same `onStop` gate enables the next `.IconX` alias, then disables the previously enabled launcher alias (`.MainActivity` or `.IconY`), with `DONT_KILL_APP`.
- **Turning it off** enables the `.MainActivity` alias, then disables every `.IconX`.

**Splash matching.** A `SaveFilePlugin.iconScene()` returns the launching component's scene: the alias class name, or the shortcut's `scene` extra, falling back to the stored index. The splash awaits it for at most 150ms, then falls back to random.

**PC, strict ownership** (#2139):
- `launcher.ini` (written atomically: temp file then replace) stores the consent, the scene and the exact created `.lnk` path, plus the target exe path recorded at creation.
- **On first-run Yes:** if `Desktop\ParchLock.lnk` already exists and is not ours, it is skipped and reported, never overwritten.
- **Rotation:** only the recorded path is rotated, and only if it still exists and its target is this exe, or the recorded exe at the same relative layout after a moved folder, which then updates its target. Otherwise rotation is skipped and the shortcut is never recreated.
- `--desktop-shortcut` re-offers.

**Device proofs** (operator phone, dev APK):
- **Default path:** the pinned icon updates in place, with no move or removal; pickers and rotation do not rotate it; locking or leaving the app does.
- **Experimental path:** the operator observes the behaviour of the home copy.

**Desktop proofs** (this PC): consent, rotation, collision skip, a deleted shortcut not recreated, and a moved folder.
