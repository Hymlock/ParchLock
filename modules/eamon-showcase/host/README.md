# Eamon engine host (gate G1)

The real, unmodified Eamon CS 3.1.0 engine running in a browser worker. Still a gate probe: not wired into ParchLock, not packaged, not an installed module.

## How it works

- The engine libraries and all 19 adventure plugin projects are rebuilt from the pinned reference source as .NET 8 WebAssembly. No engine or adventure source is changed, and none is copied into this repository.
- Upstream's own adapters for output, files, directories, paths, serialisation and Main Hall/adventure hand-off are compiled unchanged against `AppShim.cs`, a small stand-in for upstream's desktop application class.
- Only three adapters are replaced (`HostAdapters.cs`): the input reader (upstream's is bound to its desktop UI), the process mutex and thread sleep.
- Input blocks the engine worker on a synchronous request that `host-sw.js` holds open until the page answers. The request is re-polled every 20 seconds and the page re-offers its answer on every poll, so a restarted service worker loses nothing.
- Screen output is sent as a diff (keep N characters, append), because the engine rewrites the tail of its screen buffer in place.
- All game files live in the runtime's in-memory file system under `/Eamon-CS`. There is no other file system, so it is the single storage authority; `Entry.ListFiles/ReadFile/WriteFile` are the only way in or out.

## Reproduce

```
host/Prepare-Host.ps1 -Upstream <pinned Eamon-CS clone> -Work <new private scratch dir>
PARCHLOCK_SOURCE_ROOT=<repo> PARCHLOCK_HOST_WORK=<scratch> PARCHLOCK_HOST_SCRIPT=host/play-beginners-cave.json node host/run-host-probe.cjs
```

## Inside ParchLock's play screen (G1 app-integration candidate, not adopted)

App-owned files in `lib/eamon/`: `zvm.js` (engine adapter), `host-worker.js`, `input-relay.js`, `story.z8.js`.

- ParchLock's vendor loader (`lib/main.js`, untouched) starts a story by loading `<lib_path>zvm.js` and constructing `window.ZVM` against its Glk. For a story id ending `.eamon`, `js/Consts.js` points `lib_path` at `lib/eamon/`, so the loader constructs the Eamon adapter instead. **Deviation to review:** the plan asked whether the loader can start a non-Glk engine without patching minified code. It cannot start one directly; this adapter presents the engine through the same Glk start/resume contract the Z-machine engine uses. `story.z8.js` is an empty placeholder the loader requires; it is not the module's identity and must never be treated as an imported story.
- Text goes into the ordinary story window, fed at each prompt (the engine rewrites the tail of its screen while working, and the window is append-only). Line prompts use the normal line input; single-key prompts use the normal character input, so ParchLock's mobile input box and key proxy apply unchanged.
- `service-worker.js` loads `input-relay.js`; the page confirms the controlling service worker carries the relay before starting the engine.
- `run-app-probe.cjs` plays through the real `play.html`, on desktop or on a device over CDP.

Not yet connected: map, underlines, direction buttons, Equipment, stats, read-aloud tuning (plan package D). The engine's fixed 80-column layout wraps badly in a narrow window. Storage is one global `parchlock-eamon` database, not yet scoped to a campaign or package.

## Saving

- Safe points are top-level waits only (plan section 5): the adventure's own command prompt and the Main Hall's top menu (not its sub-menus), decided from which engine code is asking; anything unrecognised is not a safe point. Nested prompts (shop steps, registration, yes/no inside an action, "press any key") save nothing. At a safe point the host sends the files that changed since the last one, plus the name of the program now running, as one batch.
- The page stores each batch in a single IndexedDB transaction, so a revision is all or nothing. The player's answer is not passed to the engine until that transaction has completed, so the engine never runs ahead of durable storage.
- In the application adapter, the next prompt and buffered story output also wait for acknowledgement;
  a successful end message waits too. A failed commit never flushes its buffered success text. A
  delayed-callback test verified this bounded ordering, not every native save/return failure scenario.
- Changed files are detected by exact byte comparison against the previous snapshot, not size/timestamp:
  a same-length rewrite with the same timestamp must still reach durable storage. The bytes staged are
  the bytes scanned. Snapshot memory overhead and real-target timings remain part of G1 measurement.
- On start, saved files (and recorded deletions) are laid over the pristine bundle and the saved program is relaunched. The engine's own resume logic does the rest.
- `PARCHLOCK_HOST_PROFILE` + `PARCHLOCK_HOST_PORT` keep one browser profile and origin across runs; `PARCHLOCK_HOST_CDP` drives an already running browser such as Chrome on a phone over adb.

## Results so far

Desktop headless Chromium, engine untouched:

- One session: Main Hall start, new character, weapon and armour purchase, adventure list, launch The Beginner's Cave, movement, look, inventory, status, quick save, quick restore, leave, loot sale, return to the Main Hall with the character written back, examine abilities, leave. The plugin chain ended cleanly.
- Across browser restarts (same profile): session 1 stopped inside the adventure after a quick save; session 2 reopened straight into the adventure with the engine's "Welcome back"; session 3 finished it and returned to the Main Hall with the character on file; session 4 started at the Main Hall with that character still on file.
- First prompt about 1 s after page load. Ordinary turns 2 to 95 ms; adventure start about 0.4 s.

Chrome 156 on an Android phone (NX799J) over USB, same full session script: passed. First prompt 3.7 s, ordinary turns 25 to 110 ms, adventure start 1.4 s, return to Main Hall 1.1 s.

Inside the app's own WebView on the same phone (Android 16, WebView 156): a side-by-side debug build (`android-probe.init.gradle`, app id `com.parchlock.app.g1probe`) carrying the normal ParchLock assets plus this host under `/eamon/`, served by Capacitor at `https://localhost`. The full session script passed. Then: stop inside the adventure after a quick save, `am force-stop`, relaunch: the adventure resumed with "Welcome back", finished, and the character was on file in the Main Hall. First prompt 0.7 to 0.9 s, ordinary turns 9 to 40 ms, adventure start about 0.3 s. `PARCHLOCK_HOST_URL` points the runner at a host already inside an app.

Download: framework 28.0 MB raw, 8.4 MB Brotli (untrimmed); game data under 1 MB.

In the real play screen: full session passed on desktop Chromium and on the phone inside the debug probe app (through ParchLock's own service worker and mobile input path). Restart after a quick save resumed the adventure. Interrupting at a nested prompt (inside the shop) and restarting came back at the Main Hall entrance. An existing Z-machine story still loads normally with these changes.

Known consequence of the engine's own behaviour: a newly created character and Main Hall purchases are written to file only when the character leaves the hall, so a kill before that loses them.

G1 Hall durability candidate (Codex continuation): at a verified top-level Hall menu, `HallCheckpoint`
calls the same flag-guarded serializers as the upstream Hall shutdown, with `printOutput=false`, before
the atomic host flush. Flags remain set; shop, reward and quest logic is not rerun. Serialization failure
aborts before a durable flush. Local Chromium testing created a new character, bought a sword and armor,
closed the browser at the Hall menu without a normal game exit, then reopened and found the character,
equipment and remaining gold. Serialized character/inventory records were unchanged after restart.
Later unchanged-data exit runs with and without the hook also kept those bytes unchanged, but did NOT
prove native-shutdown equivalence after identical purchases: those exit runs had no modified flags.
This closes the observed loss in that bounded desktop scenario only: independent review, signed Android,
interrupted serializer writes, storage failure, concurrent tabs and campaign/save integration remain open.
The earlier observed loss describes the host before this candidate, not intended final behavior.
Unlike upstream's log-and-continue save errors, the candidate treats serialization failure as fatal
before durable flush. Any page-side storage failure also stops and discards the worker; its advanced
in-memory snapshot must never be reused after a failed commit. Reopen reads the last durable revision.
Returned engine-error results also use this fatal path in both the probe and application adapter.
Injected result-message checks confirmed visible failure and one worker termination; they do not prove
an actual native serializer exception or mid-write interruption. A normal real-play-screen session
still passed after the change. Those remaining failure families are not waived.

Further gate checks (desktop Chromium): the heaviest adventure by code size, The Vile Grimoire of Jaldi'al (8,174 lines), launched from the Main Hall in about 1 s and played; nested parser questions ("Get who or what?", "Examine who or what?") were answered and correctly classified as not safe points; cancelling the pending input ended the run as "cancelled", and the next start resumed that adventure from its saved game. Script: the answer `<cancel>` in a rules file.

Windows launcher path: `ParchLock.exe` is a local web server on `http://127.0.0.1` that opens Chrome or Edge, and its server code already serves every file type the engine needs (`.wasm`, `.json`, `.js`, binary data). The full session through the real play screen passed in the installed Chrome 157 and Edge 157 (`PARCHLOCK_APP_CHANNEL=chrome|msedge`). The launcher executable itself was not started, and the engine files were served by the probe's server, not from a launcher folder.

Character return: stopping at the Main Hall menu right after returning from an adventure and restarting opened straight at that menu with the character on file; the loot sale did not replay (that sale was 0 gold, so a double payment is not ruled out by this run alone).

### Actual fee-bearing recall (bounded desktop continuation)

This is different from ordinary registration lookup and from `quit hall`, which took another native
return path in the first attempted script. The retained first attempt did not satisfy the fee assertion.
Using the upstream character Confucious Maximus, the host entered A Runcible Cargo and saved a game,
then closed without normal exit. A controlled test startup choice booted Main Hall while retaining the
native abandoned-adventure files. Registration then executed the real paid recall, including its
native save-file deletion. One observed fee was 83 gold (1244 -> 1161); after closing and reopening,
the character table was unchanged and no new recall charge was printed. This is not a shipped Hall/
resume choice UI, and neither run is principal quest-outcome evidence.

A second test seeded an empty private profile with that actual pre-recall snapshot, interrupted at the
post-recall single-key prompt, and verified ZERO commits and the old store unchanged. Retrying to the
top Hall menu committed once: a native fee of 88 gold (1244 -> 1156), Alive character and 15 expected
save-file tombstones. The fee is native and varies; the test compares the amount actually printed, not
a hardcoded price. It does not prove crash safety between serializer writes or during IndexedDB commit.

Recipes: `recall-abandon.json`, `recall-complete.json`, `recall-interrupt.json`, `recall-restart.json`.
Use a dedicated profile/fixed port. `PARCHLOCK_HOST_TEST_MAIN_HALL_BOOT=1` is a controlled startup fixture;
it changes only the test worker's boot arguments. `PARCHLOCK_HOST_EXPORT` records the actual private
store. `PARCHLOCK_HOST_SEED_STORE` accepts that exported fixture only into an empty private test store;
never point these controls at a user's real storage or treat them as the final campaign start mechanism.

## Not done

- The in-app run used a debug-signed side-by-side build with the engine baked into the app, not the release-signed APK and not an imported Showcase package. Importing is not implemented. A later debug build did run through ParchLock's own service worker and play screen (see above); that is still a debug build with the engine baked in. Airplane mode was not switched on for the run.
- The Windows launcher executable has not been run end to end, and nothing has been run from a hosted site.
- Untrimmed framework is about 28 MB. The operator made size reduction optional on November 11;
  retain the untrimmed baseline. An isolated framework-trim experiment (engine/serializer assemblies
  explicitly preserved) measured 12,109,477 raw framework bytes and passed bounded desktop sessions,
  including nested-menu classifications and the heaviest adventure. It is not adopted, not Android
  accepted, and not a measured final import-package size.
- A restart resumes from the engine's last saved game, not the exact turn. Force-stop in the middle of a write, storage-full and two-tabs-at-once cases are untested.
- Paid-recall interruption at the nested key prompt is covered above; interruption between native
  serializer writes, during the durable commit, and paid/nonzero-loot regular return cases remain open.
- Only two adventures exercised, lightly. No combat, spells, death, or the other 18 adventures.
- Engine pacing delays are currently skipped.
- Grok performed a focused independent read-only review of the Hall checkpoint/content-snapshot
  candidate (accept with changes, not full G1 acceptance). Current corrections and remaining host/UI
  integration still require their actual independent reviews; no blanket implementation pass exists.

## Player-facing integration (November 11, Claude continuation; candidate, not reviewed)

- **World data** (`WorldSnapshot.cs` -> `js/EamonProvider.js` -> existing `WorldModel`): at an adventure's
  own prompt only, a read-only picture built from engine fields and location arithmetic. Objects and
  monsters appear only once the game has shown them (`Seen`) and only in a lit room; exits are exactly
  those the game's own `IsDirectionInObviousExitsList` gives; a destination is named only after a visit.
  It never calls the engine's printing or "listed in room" helpers (they set `Seen`) and draws no
  random numbers. Ids: rooms as-is, artifacts +100000, monsters +200000, Yourself 300000. Two consumer
  gates accept the new source (`js/ParchLock.js` "eamon-live", `js/MapTopology.js` "eamon-native").
  Result: the map builds as you walk, direction chips and exits work, objects/exits are underlined,
  Equipment shows Yourself with worn gear under it.
- **Tap menus**: each object carries the Eamon parser's own verbs for its present state
  (`nativeCommands`); `Actionable` offers those as given instead of Z-machine grammar synthesis.
- **Presentation**: Eamon's fixed 80-column text is reflowed for any window width (presentation only);
  a status line shows the room (or "Main Hall") and health.
- **Import**: `js/EamonPackage.js` + `ModuleLibrary`: a `.eamon` file chosen in Modules -> Choose files
  installs as one library entry (`local/<sha256>.eamon.js`) and plays from its own package cache,
  served by the app's service worker; app updates never purge it; removing it keeps campaign progress.
  A package runs only if its whole-file SHA-256 is listed in `TRUSTED` in `js/EamonPackage.js`.
  **The current pin is a development build (`0.1.0-dev`; the digest is in the TRUSTED block); a release must replace it.**
  Build a package with `node host/pack-showcase.cjs <work> <out.eamon> <version> [--pin]` (deterministic).
- Verified on desktop Chromium: import (0.7 s for 11.1 MB, 381 files) -> Main Hall -> Beginner's Cave with
  no development overlay served; map 4 rooms correctly linked. Ordinary-module regression
  (`probes/run-existing-module-regression.cjs`): z3, z5, z8, zblorb, gblorb, ulx and offline z5/ulx pass.

Still open for this layer: Android import through the real picker (phone was disconnected); stats panel
(StatTracker does not yet read Eamon figures; the status line does show health); Main Hall menus are
numbered text, not tappable choices (proposal only); `parchlock-eamon` progress database is one global
campaign; independent review of all of the above.
