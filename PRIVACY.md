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
on-device. Optional read-aloud uses on-device text-to-speech (system or browser
engine) and does not send story text to a ParchLock server. The Android app
requests microphone permission only for speech input. The packaged app does not
request Android's Internet permission.

Users are responsible for modules they add to or redistribute with their copy.
The technical compatibility check does not determine rights or permission.
