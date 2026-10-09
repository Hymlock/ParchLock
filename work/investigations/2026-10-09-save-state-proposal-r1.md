# Save-tied state: proposal R1 (claude, combined; agreed findings #2214)

**Agreed causes:**

| Issue | Cause |
|---|---|
| I1 | The map is one per-story record, not tied to saves. |
| I2 | Observed labels are discarded on resync, and only LOOK follows a restore. |
| I3 | The VM's boot `restart` triggers a resync that retires the intro marks. |
| I4 | Counters appear only in Equipment when above 0, and the Treasures death is unproven. |

**Codex amendments adopted:**
- labels are kept per save, not per story;
- old saves without a snapshot start with a clean map and honest labels, never carrying newer state;
- a fresh boot follows the transcript's observed-autorestore decision;
- INVENTORY is never auto-submitted.

## Lifecycle source (reused, not new)

`Transcript.js` already observes the authoritative events:

| Event | Where |
|---|---|
| save(name) | `commitSave`, after `file_write` succeeds for the chosen dirent |
| restore(name) | `commitRestore`, with `_choice` within 120 s |
| real restart | `onVmEvent("restart")` when not `_booting` |
| fresh boot | `collect()` first lines with no observed autorestore, which calls `resetView([])` |
| deleted saves | `reconcileSaves` and `forgetSaves` |
| uninstall | `ModuleLibrary.removeTranscript` |

R1 adds one guarded notification at each of these points: `SaveState.onLifecycle(kind, info)`. No new detection logic is added.

## New module `js/SaveState.js` (claude)

**Storage.** One record per (story signature, save name): `{ schema: 1, savedAt, map: <ParchLockMap.Rooms clone>, labels: <Actionable.labelSnapshot()> }`. It lives in IndexedDB beside the transcripts, with localStorage as the fallback.

| Lifecycle event | Action |
|---|---|
| `save(name)` | Write the snapshot. |
| `restore(name)` | If a snapshot exists: `ParchLockMap.Rooms` becomes the snapshot map, then `Save`, then `Draw`, then `Actionable.applyLabelSnapshot(labels)`. If none exists (an older save): clear the map and apply no labels. |
| `restart` or fresh boot (`newGame`) | If the working map has rooms, first archive it as a named Maps slot `"Before new game <date time>"` in the existing `PL_MapSlots_<file>` (recoverable through Maps, with a bounded count of 3 archives), then `ParchLockMap.Clear` and `Save`. |
| Engine autorestore (Glulx) | Keep everything. |
| `forget(names)` and uninstall | Delete those snapshots. |

**Portable packages.** Each exported save entry carries its snapshot, and importing a package restores them. The existing top-level `Map` stays, for compatibility with the package format (D170 import).

**Secondary I1 item.** After RESTART, an old room count partly returned. Trace whether these are real visited ids or current ZIL decoded hints (codex's point). If they are hints, there is no defect; if they are visited ids, find the re-seed source (MapTopology graph or the delayed tick) and clear it on `newGame`.

## Codex lane (API agreed first; no shared-path edits)

- **`Actionable.labelSnapshot()`** returns `{ schema: 1, labels: { [objectId]: { phrase, words: [dictionary words] } } }`. These are display labels learned from current prose (VerifiedNouns plus observed phrases) for objects in scope or inventory.
- **`Actionable.applyLabelSnapshot(snap)`**:
  - a display-only, lowest-priority fallback for this generation, below current prose;
  - an entry is accepted only if the object id exists and its dictionary words still match;
  - it never feeds commands or capability learning, and is cleared at the next resync.
- **I3:** the VM's first boot `restart` for a story in this page skips the resync entirely: no epoch bump and no scope clear. Every later restart is unchanged (D94, D180, D182). This mirrors `Transcript._booting`.
- **I4:**
  - a visible notice when `countEnding` counts a death or win: a brief toast "You died. Deaths this playthrough: N" (or the win equivalent), using the existing message or toast infrastructure, and never blocking input;
  - a native Treasures death proof, recognised by the phrase list or extended only from the real text;
  - the Equipment tile stays as it is.

## Ownership and order

1. Codex implements the Actionable API first (it is small), and claude reviews the signature.
2. Claude implements `SaveState.js`, the Transcript hook lines (guarded calls only), the package fields, the `index.html`/`play.html` script tag and the canonical docs.
3. Codex implements I3 and I4.
4. Mutual audit of the current checkout.
5. Codex bumps the shell and builds the next APK when the operator asks.

## Prior-fix guard

| Area | Checks |
|---|---|
| D94, D180, D181, D182 | `audit-restore-sync`, `d94-cell-and-boot` |
| E4 transcript | its harnesses |
| D214 | `underline-lifetime` |
| D204 and D215 | `death-terminal`, `stat-tracker` |
| Map | `tools/layout-regression` (map save, download and import) and `map-pathing-regression` |
| D170 | package import |

**New focused fixtures:**
- save, restore and new game: Zork walk, save A, walk more, save B, RESTART (empty map plus an archive slot), restore A (A's map), restore B (B's map), a pre-R1 save (clean map);
- Treasures save then restore: labels show "flashlight" and "absorbent space-rag" without INVENTORY;
- Zork boot: intro marks survive past 3 s.

## R2 (answering codex #2217, points 1-6)

**1. Ordering: stage, then apply after the reset.**
- `SaveState.onLifecycle("restore", {name})`, from `Transcript.commitRestore`, only **stages** `pending = { kind: "restore", name, snapshot | null, token }`, synchronously.
- `UndoRestoreSync.resync` calls `SaveState.applyPending(reason, generation)` **after** its scope clear and map handling, and **before** `StatTracker.Resync`, `WorldModel.tick`, `MapTopology.tick`, `Actionable.Refresh` and `Draw`. Codex's lane adds that one call.
- `applyPending` sets the snapshot map (or clears it if there is no snapshot), then `ParchLockMap.Save`, then `Actionable.applyLabelSnapshot(labels)` (or `clearLabelSnapshot()`). The resync's own renders then use them.
- **Restart:** `onLifecycle("restart")` comes from `Transcript.onVmEvent("restart")` when not booting, and runs before the resync clears the map. It **archives synchronously** while the map still exists. The existing `resync("restart")` clear then proceeds, and `applyPending` only clears labels.
- **Fresh boot:** `onLifecycle("boot")` comes from `Transcript.collect`, on the first lines with no observed autorestore. It archives, then `ParchLockMap.Clear` and `Save`, then `MapTopology.prevRoomId = null`. It then does one bounded re-render: `MapTopology.tick(WorldModel.lastPayload)` and `ParchLockMap.Draw()`, so the current room is re-added fresh. That is one reset and one re-render.

**2. Storage.** Synchronous localStorage only.
- The key is `PL_SaveState_<storySignature>_<saveName>`, holding small JSON (the map array plus labels).
- A write failure (quota) reports through `Message` and keeps the existing data. It never deletes anything to make room.

**3. Untrusted input validation (package import and stored records):**
- the exact story signature must match;
- the map passes `WorkspaceUI.ValidateMap`, the D54 internal-name filter and `MapTopology.quarantineUnprovenSubSteps`, the same as `Map.Load`;
- labels must have schema 1, objectId an integer below 65536, phrase a string of 80 characters or fewer, and words an array of at most 8 strings of 12 characters or fewer;
- records are built with `Object.create(null)`, and `__proto__`, `constructor` and `prototype` keys are rejected;
- anything invalid is dropped, giving a clean state.

There is no compatibility scaffolding: a missing snapshot means a clean state. The top-level package `Map` keeps its current meaning.

**4. Archives.**
- Slots are written in the existing `PL_MapSlots_<file>` with an own flag `autoArchive: true` and a name of the form `Before new game <date time>`.
- Pruning to 3 only ever considers slots carrying `autoArchive: true`; operator slots are never touched, whatever their names.
- If writing the archive fails, the working map is **not** cleared and an error is reported.

**5. Save and restore truth.**
- Snapshots are written only from `Transcript.commitSave`, which runs only after `file_write` succeeds for the chosen dirent. Cancelled or failed saves never snapshot.
- `commitRestore` runs only on a successful `restore_file`, so a failed restore changes nothing (no pending state is staged).
- Labels live in codex's separate display-only fallback, never in `VerifiedNouns`, and current prose beats the fallback.

**6. Boot skip by VM identity.** The skip applies to the first `restart` of each distinct VM instance object (`window.__PARCHLOCK_ZVM__`, tracked in a WeakSet), not by filename.
- Regression: an initial boot keeps the marks; a later accepted RESTART does resync and clear; an UNDO and a failed restore behave as controls.

**API summary:**

| Owner | API |
|---|---|
| claude | `SaveState.onLifecycle(kind, info)` with kinds `save`, `restore`, `restart`, `boot`, `forget`, `uninstall`; `SaveState.applyPending(reason, generation)`; `SaveState.exportFor(saveNames)` and `SaveState.importFrom(packageEntry)` for packages |
| codex | `Actionable.labelSnapshot()`, `applyLabelSnapshot(snap)` and `clearLabelSnapshot()` (synchronous, display-only); the `UndoRestoreSync` `applyPending` call and VM-identity boot skip; the I4 toast and the Treasures proof |
