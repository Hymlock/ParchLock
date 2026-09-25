# ParchLock!

ParchLock is an interactive-fiction player adapted by Hymlock Groves and based
on Parchmap by Roy Lazarovich. It combines the Parchment interpreters with
automatic mapping, module-derived object actions, radial command menus, notes,
navigation, autocomplete, save packages, and an adaptive desktop/mobile UI.

ParchLock is distributed as an application without story modules. You are
responsible for ensuring that every module you add to or redistribute with your
copy is lawful for you to use. ParchLock's compatibility check examines file
structure; it does not determine ownership or permission.

## Start

- Desktop: open `play.html`, or serve the folder from localhost.
- Android: install `ParchLock.apk` from a release folder.
- Library: open `index.html` and select **Modules** to add files.

Supported local formats are Z-machine v3, v4, v5 and v8, zblorb, raw Glulx
(`.ulx`) and gblorb. Z-machine modules receive the full mapping and action
system. Glulx modules are currently play-only.

Imported bytes are stored in IndexedDB on the current device. They are not sent
to a ParchLock server. Clearing browser/app storage or reinstalling the Android
app removes imported modules and local state. Export important saves and maps.

See [USER_GUIDE.md](USER_GUIDE.md), [PRIVACY.md](PRIVACY.md),
[CREDITS.md](CREDITS.md), [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md), and
[SOURCE_BUILD.md](SOURCE_BUILD.md).

## License

ParchLock modifications are provided under GNU GPL version 3; see `LICENSE`.
Corresponding source for the distributed build is `ParchLock-source.zip`.
Third-party components retain their own licenses.
