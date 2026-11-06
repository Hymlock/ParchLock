# ParchLock Privacy

ParchLock does not require an account and has no ParchLock analytics or module
upload service.

Imported modules, preferences, maps, notes, command history, calibration data
and browser saves are stored locally by the browser or Android WebView.
Imported module bytes are loaded from IndexedDB and are not sent to a ParchLock
server. Clearing app/browser storage removes this data. Android backup is
disabled, so reinstalling or moving to another device starts empty.

PWA installation and update checks may contact the origin from which the web
app was installed. Links opened from documentation use the browser. Speech
recognition is supplied by the operating system or browser; audio and
transcripts may be processed by that provider and must not be assumed to remain
on-device. Read aloud hands story text to the voice of the device (Android) or
of the browser (desktop). ParchLock itself does not send story text to a
ParchLock server, but some browser or system voices are online services; whether
speech stays on the device depends on the voice and provider you have chosen.
The Android app requests microphone permission only for speech input. The
packaged app does not request Android's Internet permission.

Icons and shortcuts:

- On Android, ParchLock stores the next storybook icon scene and whether the
  first-launch icon question has been answered in its own app settings. It adds
  a home-screen widget only after you agree and Android confirms placement.
  Only installed widgets rotate; the app's launcher entry stays fixed. Once a
  widget exists, the app disables only its own old rotating shortcut.
- On a PC, `ParchLock.exe` stores its choices (whether to add a desktop shortcut,
  the current icon scene, and the shortcut it created) in
  `%LOCALAPPDATA%\ParchLock\launcher.ini`. It creates a desktop shortcut only if
  you answer Yes, changes only the shortcut it created, and never automatically recreates one
  you delete. The browser profile it opens is kept in
  `%LOCALAPPDATA%\ParchLock\browser-profile`.

Users are responsible for modules they add to or redistribute with their copy.
The technical compatibility check does not determine rights or permission.
