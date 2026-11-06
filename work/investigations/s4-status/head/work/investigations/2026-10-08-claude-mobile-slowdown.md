# Mobile slowdown and read-aloud lag (claude investigation, sealed 2026-10-08)

Request: bus #1810 (blind). Report: since the read-aloud speed fix, speech
starts lagging after some play and only a full phone restart clears it; the
whole game also slows substantially over time.

**Blindness disclosure.** Before I started, the operator's relay message named
two leads: (a) repeated scans of the growing story text, and (b) native speech
waiting indefinitely for a stop to finish. I checked both, and also looked
past them. These findings are therefore not fully blind.

No code changed. Nothing here is proven on a device.

## H1 (strongest for "the whole game slows over time"): unbounded DOM x per-mutation full-buffer walkers

- GlkOte `max_buffer_length` is not configured anywhere (`js/`, `*.html`), so
  `.BufferWindow` keeps every `.BufferLine` for the whole session.
- At least five subscribers re-walk the WHOLE buffer after DOM mutations. Each
  pass grows linearly with session length, so total cost grows quadratically:
  - `ReadAloud.collectNewLines` (`js/ReadAloud.js`, flush after a 350 ms
    debounce). It runs on every subtree/characterData mutation of the buffer
    roots, and each line gets `speakableText` (a recursive child walk) plus
    `closest`/`querySelector`. `speakableText` is new in the current diff (D207).
  - `Transcript.collect` (`js/Transcript.js:303`, 300 ms debounce). The observer
    also fires on class/aria-hidden attribute changes. Each line gets
    `lineText` (a recursive walk), `closest` and `querySelector`; a changed line
    also costs `_live.indexOf(entry)`, which is O(unsaved lines), and
    `writeLines` filters `_live` with `lines.indexOf`, which is O(n*m). `_live`
    grows until the player saves.
  - `StatTracker.Tick` → `freshOutputSpans` (`js/StatTracker.js:2875`). Tick runs on
    ANY `#windowport` subtree mutation with only a 20 ms throttle, so a turn
    with status probes produces many Ticks. Each Tick calls `lineText` for every
    line.
  - `Actionable.Refresh` (`js/Actionable.js` ~1320-1390). It runs a jQuery
    `$(line).find('.Style_subheader').addBack()` over every line to find
    `lastBanner`, then `$("#windowport .Style_input").last()`, then `Stale()`
    `$(".pl-act:not(.is-stale)")` across the document.
  - The StatTracker probe DOM guard (`js/StatTracker.js:4067`) scans every
    `#windowport .BufferLine`.
- The mutation sources multiply this. The underline pass rewrites lines
  (unwrap/normalize/re-wrap), status probes add and remove nodes, and
  `MobileLayout.apply` runs per animation frame for any windowport subtree
  mutation (`js/MobileLayout.js:215`).
- Prediction: per-turn main-thread time grows with the number of
  `.BufferLine`s. A restart of the APP (WebView reload) should fully clear it.
  If the operator really needs a PHONE restart, H1 is not the whole story.

## H2 (strongest for "speech lags, only a phone restart clears it"): native TTS call pattern

Plugin source: `node_modules/@capacitor-community/text-to-speech/android`.

- Each `ReadAloud.speak` on native explicitly calls `native.stop()`, waits for
  its promise, then calls `native.speak` 40 ms later. The plugin's `speak` then
  calls `stop()` AGAIN internally (QUEUE_FLUSH), so every utterance costs two
  `tts.stop()` calls, plus `setLanguage`, `setSpeechRate` and `setPitch`. On
  Google TTS, `stop()` and `setLanguage()` are cross-process binder calls.
- The plugin's `stop()` calls `requests.clear()`, so an interrupted utterance's
  `speak` PluginCall is never resolved or rejected. The Capacitor JS bridge
  keeps one pending callback for each interrupted utterance for the whole
  session. That is a small, unbounded leak, and it fits "after some play".
- If the plugin's `stop` promise never settles (it does resolve in this plugin
  version unless `isAvailable()` is false, in which case `call.unavailable`
  rejects), the `.then(run)` chain never speaks. That is silence, not lag, so
  it does not on its own explain progressive lag.
- All Capacitor plugin calls for a plugin are serialized on the plugin's
  handler thread. A slow binder call (the engine busy synthesizing a 4000-char
  chunk while being stopped) queues the next stop and speak behind it. Back-to-
  back turns during long narration could build a backlog of stop/speak pairs.
- Why a phone restart rather than an app restart: the TTS engine (for example,
  Speech Services by Google) runs in its OWN process and survives the app being
  swiped away. A degraded engine state (backlogged synthesis, audio focus held
  by the recognizer) is cleared by restarting that engine process. A reboot
  does that; force-stopping the engine app should too.
- Ruled out: the speech-recognition plugin destroys and recreates its
  `SpeechRecognizer` on each listen (`SpeechRecognition.java:186-191`), so it
  does not leak recognizers.

## H3 (minor): the fake-boot loops in ReadAloud are bounded

The `bootTimer` stops after 40 tries. The visibility listener is added once
(guarded by `watching`). `__readAloudLog` is capped at 200. `spokenLengths` is
a WeakMap. No accumulating timer was found in ReadAloud.

## Minimal diagnostic plan (no implementation)

1. Ask the operator, when it is slow next time:
   - (a) force-stop ParchLock in Android Settings (not a swipe) and relaunch;
     does the game slowness clear?
   - (b) does the speech lag clear?
   - (c) if not, force-stop "Speech Services by Google" (or whichever engine is
     the TTS default); does the speech lag clear?
   This separates H1 (the WebView) from H2 (the engine process).
2. Headless, desktop: drive one module (Zork I or Anchorhead) for 300 turns.
   Every 50 turns, record `.BufferLine` count, `document.querySelectorAll('*').length`,
   `.pl-act` count, `Transcript._live.length`, and the main-thread time of one
   turn (performance.now around submit → the next prompt, plus a
   `PerformanceObserver` longtask total). If H1 is real, the per-turn time
   rises roughly linearly with the line count. Also attribute self time to
   Actionable.Refresh, StatTracker.Tick, Transcript.collect and
   ReadAloud.flush (wrap each with timers).
3. Device: expose `ReadAloud.ttsCounts` (already counted) plus the count of
   unsettled native speak promises in the existing diagnostics. Speak/stop
   ratios and pending-call growth over a session test H2 without changing
   behaviour.

## Likely fix directions (for the proposal step, after comparison)

- H1: bound the work, not the history. Either configure a scrollback limit
  (needs a check against Transcript capture, which already records removed
  lines, and the Actionable `RoomLines` invariants), or make each walker
  incremental (scan only lines after a remembered cursor or new nodes from
  MutationRecords) and drop stale `.pl-act` marks outside the active lines.
- H2: issue at most one stop per utterance (the plugin already flushes on
  speak), bound or skip the stop-before-speak wait with a timeout, and never
  keep a speak promise unbounded.

## Addendum: prior decisions (per #1813/#1814)

- **D211** (Input.Mic lifecycle) already records this operator symptom as I3:
  "slows after a while, persists across an app restart until the phone
  reboots". Root cause NOT proven. Already tried, do not repeat:
  - the settle barrier and 2500ms `whenIdle`;
  - the 600ms race of `ReadAloud.stop` in `press()`;
  - generation invalidation of delayed native speak;
  - flush deferred while the mic is busy;
  - backoff;
  - the 50-entry `Mic.diag` ring with `ttsCounts`, exported through `/micdiag`.
  It also records that the speech-recognition plugin's `stop()` PluginCall
  never resolves.
- **D104** deliberately made `.BufferLine` element state, not MutationRecord
  text, the speech source; the observer is a debounce trigger only. An H1 fix
  must keep that. An incremental line cursor is compatible; returning to
  record text is not.
- **D108**: complete-turn deterministic narration. Any change to flush
  batching must keep complete-turn output.
- **New in this report (not covered by D211):**
  - H1, the unbounded buffer DOM multiplied by five full-buffer walkers (none
    of the five is mic or TTS code, and D211 did not look at main-thread
    growth);
  - H2's TTS-side specifics: the double native `tts.stop()` per utterance,
    the TTS plugin's `requests.clear()` leaving the interrupted speak
    PluginCall unsettled forever, and serialization on the plugin thread.
  D211's 600ms race only bounds the mic press, not `ReadAloud.speak`'s own
  `stop().then(run)` chain.
- **Diagnostic step 0:** ask the operator for a `/micdiag` export after the
  next slow episode. The diagnostics are already built, and they hold
  `ttsCounts`.
