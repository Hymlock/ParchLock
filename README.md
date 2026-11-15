# ParchLock!

ParchLock is an interactive-fiction player adapted by Hymlock Groves and based
on Parchmap by Roy Lazarovich. It combines the Parchment interpreters with
automatic local and World maps, an Equipment screen with the story's status,
module-derived object actions, radial command menus, notes, navigation,
autocomplete, save packages with transcripts, read aloud, and an adaptive
desktop/mobile UI.

ParchLock can carry story modules in its library (see
[GAMES_INCLUDED.md](GAMES_INCLUDED.md) for the games intended for the release and
their licences), and you can add your own. You are responsible for ensuring that
every module you add to or redistribute with your copy is lawful for you to use.
ParchLock's compatibility check examines file structure; it does not determine
ownership or permission.

## Start

- **Windows (recommended):** download and run
  [`ParchLock-Setup-2.0.100-public.exe`](https://github.com/Hymlock/ParchLock/releases/tag/v2.0.100)
  from the release page. It installs ParchLock (with shortcuts and uninstaller).
  Then start **ParchLock** from the Start menu or desktop.
- **Windows (portable):** double-click `ParchLock.exe` in a distribution folder.
  It serves the files on localhost and opens Chrome or Edge full screen so voice
  input can work. The first time, it may ask whether to add a desktop shortcut
  (`ParchLock.exe --desktop-shortcut` asks again). Opening `play.html` directly
  still plays, but the microphone cannot remember permission on a `file://` page.
- **Android:** install `ParchLock-public.apk` from the same release (or the APK
  bundled with the Windows installer package).
- **Library:** open `index.html` and select **Modules** to add files.

Supported local formats are Z-machine v3, v4, v5 and v8, zblorb, raw Glulx
(`.ulx`) and gblorb. Z-machine modules receive the full mapping and action
system. Glulx modules are currently play-only. Eamon Showcase is supported when
you import the separate `.eamon` module from the release page.

Imported bytes are stored in IndexedDB on the current device. They are not sent
to a ParchLock server. Clearing browser/app storage or reinstalling the Android
app removes imported modules and local state. Export important saves and maps.

See [USER_GUIDE.md](USER_GUIDE.md), [RELEASE_NOTES.md](RELEASE_NOTES.md),
[PRIVACY.md](PRIVACY.md), [CREDITS.md](CREDITS.md),
[THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md), and
[SOURCE_BUILD.md](SOURCE_BUILD.md).

## License

ParchLock modifications are provided under GNU GPL version 3; see `LICENSE`.
Corresponding source for the distributed build is `ParchLock-source.zip`.
Third-party components and included games retain their own licenses.

## Downloads — Windows 2.0.101 / Android 2.0.100

[Open the current release](https://github.com/Hymlock/ParchLock/releases/tag/v2.0.101).

- [ParchLock-Setup-2.0.101-public.exe](https://github.com/Hymlock/ParchLock/releases/download/v2.0.101/ParchLock-Setup-2.0.101-public.exe) — Windows installer, including the public story set, Android APK and source archives.
- [ParchLock-public.apk](https://github.com/Hymlock/ParchLock/releases/download/v2.0.101/ParchLock-public.apk) — unchanged Android 2.0.100 APK, signed with the existing release key.
- [ParchLock-source.zip](https://github.com/Hymlock/ParchLock/releases/download/v2.0.101/ParchLock-source.zip) — source for the corrected Windows/web files and installer recipe.
- [ParchLock-Android-2.0.100-source.zip](https://github.com/Hymlock/ParchLock/releases/download/v2.0.101/ParchLock-Android-2.0.100-source.zip) — original corresponding source for the unchanged Android APK.
- [Eamon Showcase module](https://github.com/Hymlock/ParchLock/releases/download/v2.0.100/EamonShowcase-2.0.100.eamon) — optional, unchanged module; import it through Modules → Add. It is separate from the installer.

This is a Windows-only maintenance patch: the startup picture follows the rotating desktop shortcut, and icon rotation notifies Windows about ParchLock's shortcut only. Android has not been rebuilt or changed. The public distribution contains 75 bundled story files. The Showcase is still a development module; its full adventure acceptance work is not declared complete.

The installer contains the APK as well as both source archives. For browser play, use the installed PC launcher or host the complete runtime folder; a source ZIP is not a ready-to-play web archive.
