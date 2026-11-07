# B1 + B2 make-dist.bat (grok2)

## Changes (`make-dist.bat`)

### B1 — build then swap
- Runtime is assembled into `%TEMP%\ParchLock-runtime-*` (not DEST).
- Source zip is built to a temp zip path.
- DEST is only replaced after both succeed: existing DEST moved aside → stage promoted via robocopy /MOVE → source zip copied in → old DEST removed.
- On failure before swap, DEST is left unchanged; temp stages cleaned in `:fail`.

### B2 — dirty-tree guard
- Before build, `git status --porcelain` on: `js`, `css`, `index.html`, `play.html`, `service-worker.js`, `manifest.json`, `lib`.
- If any hit: exit 2 unless `MAKE_DIST_ALLOW_DIRTY=1` (prints WARNING).
- Dirty docs/work/.ai-bus do **not** block (not shipped by allow-list).

## Smoke
- Dirty worktree with clean runtime paths: full run to temp DEST succeeded (exit 0); PC launcher built; zip present.
- Peer review: **grok** before commit (claude #6015).

## Not done
- Did not run APK build.
- Death census cancelled per #6015.
