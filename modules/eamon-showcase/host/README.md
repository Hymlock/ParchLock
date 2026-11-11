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

- Safe points are top-level waits only (plan section 5): the adventure's own command prompt and a menu waiting for a choice, decided from which engine code is asking. Nested prompts (shop steps, registration, yes/no inside an action, "press any key") save nothing. At a safe point the host sends the files that changed since the last one, plus the name of the program now running, as one batch.
- The page stores each batch in a single IndexedDB transaction, so a revision is all or nothing. The player's answer is not passed to the engine until that transaction has completed, so the engine never runs ahead of durable storage.
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

## Not done

- The in-app run used a debug-signed side-by-side build with the engine baked into the app, not the release-signed APK and not an imported Showcase package. Importing is not implemented. The host page was opened directly; it has not run alongside ParchLock's own service worker or inside ParchLock's play screen. Airplane mode was not switched on for the run.
- No Windows launcher or hosted-site run.
- Raw framework size is above the 20 MB target; trimming is untried.
- A restart resumes from the engine's last saved game, not the exact turn. Force-stop in the middle of a write, storage-full and two-tabs-at-once cases are untested.
- Restart while the Main Hall is processing a returning character is untested.
- Only one adventure exercised, lightly. No combat, spells, death, or the other 19 adventures.
- Engine pacing delays are currently skipped.
- No independent review of this code.
