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

- Desktop: double-click `ParchLock.exe` in the distribution folder. It serves the
  files on localhost and opens Chrome or Edge full screen so voice input can work.
  The first time, it asks whether to add a desktop shortcut whose picture changes
  each time you close ParchLock (`ParchLock.exe --desktop-shortcut` asks again).
  Opening `play.html` directly still plays, but the microphone cannot remember
  permission on a `file://` page.
- Android: install the signed `.apk` included in the distribution folder.
- Library: open `index.html` and select **Modules** to add files.

Supported local formats are Z-machine v3, v4, v5 and v8, zblorb, raw Glulx
(`.ulx`) and gblorb. Z-machine modules receive the full mapping and action
system. Glulx modules are currently play-only.

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


## Downloads: Windows and Android 2.0.102

- [ParchLock-Setup-2.0.102-public.exe](https://github.com/Hymlock/ParchLock/releases/download/v2.0.102/ParchLock-Setup-2.0.102-public.exe): Windows installer, including the Android APK and matching source.
- [ParchLock-public.apk](https://github.com/Hymlock/ParchLock/releases/download/v2.0.102/ParchLock-public.apk): Android app, signed with the existing release key.
- [ParchLock-source.zip](https://github.com/Hymlock/ParchLock/releases/download/v2.0.102/ParchLock-source.zip): corresponding Windows, web and Android source.
- [ParchLock-WEB-2.0.102.zip](https://github.com/Hymlock/ParchLock/releases/download/v2.0.102/ParchLock-WEB-2.0.102.zip): complete web runtime for browser hosting.
- [Eamon Showcase](https://github.com/Hymlock/ParchLock/releases/download/v2.0.100/EamonShowcase-2.0.100.eamon): optional separate module, unchanged. Import through Modules, then Add.

ParchLock now asks before its first narration. Choose Yes to hear the adventure, or No to keep it silent. The choice persists across stories and sessions. Change it anytime in Options under Read aloud. Existing disabled preferences remain disabled after upgrading. This includes the opening tutorial and Learning tour.

This public distribution contains 75 bundled story files. The Showcase remains a development module; this update does not claim completion of all adventure acceptance work.

The Windows installer includes the APK and source archive. The web ZIP contains index.html at its root and is suitable for itch.io browser hosting. An installer EXE cannot run inside the itch.io browser player.
