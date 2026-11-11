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

## Result so far (local headless Chromium only)

One scripted session, engine untouched: Main Hall start, new character, weapon and armour purchase, adventure list, launch The Beginner's Cave, movement, look, inventory, status, quick save, quick restore, leave the adventure, loot sale, return to the Main Hall with the character written back, examine abilities, leave. The plugin chain ended cleanly.

- First prompt about 0.9 s after page load (runtime 0.3 s, 155 data files 0.1 s).
- Ordinary turns 2 to 95 ms; adventure start about 0.4 s; return to Main Hall about 0.3 s.
- Download: framework 28.0 MB raw, 8.4 MB Brotli (untrimmed); game data under 1 MB.

## Not done

- No persistence yet: the file system is memory only and is lost on reload. Safe-point snapshots to durable storage are the next step.
- No Android signed-APK, Windows launcher or hosted-site run. Offline service-worker interplay with ParchLock's existing service worker is untested.
- Raw framework size is above the 20 MB target; trimming is untried.
- Only one adventure exercised, lightly. No combat, spells, death, or the other 19 adventures.
- Engine pacing delays are currently skipped.
- No independent review of this code.
