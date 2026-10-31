# Emulator verification of ZIL radials, HEAD 98cabc39: BLOCKED (claude, 2026-10-31)

## Result: no checks could run. The emulator cannot boot on this host.

| # | Check | Result |
|---|---|---|
| 1 | Sherlock start inventory / `i` / intro "coat" underline | NOT RUN (blocked) |
| 2 | Lurking Horror hyrax 133 Wear / Remove | NOT RUN (blocked) |
| 3 | Starcross junk suit 176 Wear | NOT RUN (blocked) |
| 4 | Sherlock lamp 166 turn on / turn off | NOT RUN (blocked) |
| 5 | LGOP (optional) | NOT RUN |

No radial option lists or screenshots exist, because no app session ran.

## Blocker

The emulator was started hidden (`emulator -avd parch34 -no-window -no-audio -no-snapshot-save -no-boot-anim -gpu swiftshader_indirect`, via Start-Process -WindowStyle Hidden). It exits immediately:

```
ERROR | x86_64 emulation currently requires hardware acceleration!
CPU acceleration status: Android Emulator hypervisor driver is not installed on this machine
```

`emulator -accel-check` returns exit code 6 with the same message. The only system image installed is android-34/google_apis/x86_64, so the image cannot run without acceleration.

Fixing this means installing the Android Emulator Hypervisor Driver (SDK Manager, "Android Emulator hypervisor driver"), or enabling Windows Hypervisor Platform (WHPX) in Windows Features. Both change system settings, so the operator has to do it. After that, rerun this task unchanged.

## What did complete

- A clean worktree of 98cabc39 (`git -c core.longpaths=true worktree add --detach`). games/, node_modules, android/local.properties, android/capacitor-cordova-android-plugins and res/xml/config.xml were copied in, with no links. capacitor.plugins.json was already tracked and present.
- `build-android.bat dev` ran unmodified with exit 0 ("BUILD SUCCESSFUL"). Log: emulator-1031/build-android-dev.log.
- The APK built from 98cabc39 was kept outside the repo, ready for a rerun: `C:\Users\hymlo\AppData\Local\Temp\claude\C--Users-hymlo-Downloads-Projects-Parchmap-main-Parchmap-main\aff5db1d-28f7-4d83-89a7-bee59c2081ee\scratchpad\ParchLock-dev-98cabc39.apk`, sha256 E8331E53F550989B01F9B4557BC730D34BE37C300285384E06B55E19B25F6C65.

## Disclosures

- The build script writes its output to C:\Users\hymlo\Downloads\ParchLock-dist. I backed that folder up first to C:\Users\hymlo\Downloads\ParchLock-dist-backup-20261031-pre-claude-emu, then restored it after the build. The dist ParchLock-dev.apk is again the earlier 87,988,466-byte build from 12:09.
- Worktree wt-claude-emu was removed. `git worktree remove` hit "Filename too long". The leftover directory had 0 reparse points; I deleted it with `rmdir \\?\...` and then ran `git worktree prune`. No other worktree was touched.
- I stopped only the processes I started: the first emulator (it had already exited) and a background `adb wait-for-device`. No node processes were touched. Nothing was committed, and no build scripts were modified.
