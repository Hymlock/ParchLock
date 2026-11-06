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
- Android: install the ParchLock APK from the distribution folder (for example
  `ParchLock-build64.apk`).
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
