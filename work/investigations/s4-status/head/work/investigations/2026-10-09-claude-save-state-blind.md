# Operator report (APK 64): map not tied to the game, item names after load, Zork underlines lost, deaths not visible. Claude blind findings, sealed

Written 2026-10-09 before reading codex's `2026-10-09-codex-save-state-blind.md`. The blind request was #2209; the screenshots are in `work/investigations/operator-2026-10-09/`.

- **Decision index checked:** D106, D180 and D182 (the resync path), D204 (death contract), D214 (epoch underlines).
- **Probe:** `harness/_op_probe1.js` (scratch, local).

## I1. The map is not tied to the game's state (reproduced)

`harness/_op_probe1.js`, Zork I:

| Step | Map rooms stored (`PL_Map_<file>`) |
|---|---|
| Walk n, e, open window, w | 12 |
| In-game RESTART (y) | **0**: cleared correctly via ZvmCapture `restart`, then `UndoRestoreSync.onStateRestored("restart")`, then `resync("restart")`, then `ParchLockMap.Clear` |
| Then walk n, e | **9**: the old map partly returns (secondary defect; see below) |
| Close the page and reopen Zork (a fresh game: status line "Turns: 0", no restore) | **9**: the previous session's map is loaded |

**Cause.**
- The map is one per-story localStorage record (`Map.js` Save and Load, `PL_Map_<GameFilename>`). It is loaded on every page start and saved continuously. It has no link to the game's save state.
- A new game started by reopening the story (Zork has no "restore?" prompt; D182 only covers that prompt) keeps the old map.
- Restoring a native save does not bring back that save's map either: only portable *packages* carry a map. The transcript, by contrast, has save tokens (E4, `Transcript.js`).

**Secondary.** After an in-game RESTART cleared the map to 0, two moves showed 9 rooms stored. Some state outside `ParchLockMap.Rooms` (the MapTopology graph or the delayed 400 ms re-tick) appears to re-seed old rooms. This needs a trace.

**Direction (for the proposal):** tie the map to the game's state the way the transcript is tied:
- (a) on a native save, snapshot the map under that save's name (same lifecycle as transcript tokens);
- (b) on `restore_file`, load that save's snapshot (if none exists, for older saves, keep the current map);
- (c) on a fresh game (boot without autorestore, typed RESTART, or declining the restore prompt), start an empty map, while keeping the previous working map recoverable (for example archived as "previous session" in Maps) so no exploration is silently lost;
- (d) an engine autorestore (Glulx) keeps the current map.

## I2. Item names after loading a save (Treasures, cause identified)

**Screenshot:** "flashligh", "space-ra", "sword instance 6" and "sword instance 1" after loading. After a manual INVENTORY the names are correct.

**Evidence:**
- "flashligh" and "space-ra" are exactly the story's 9-z-character dictionary words; the hyphen costs a shift, so "space-rag" is cut to "space-ra" (the `observedPhraseFor` comment confirms the encoding).
- `Actionable.displayNameFor` (Actionable.js:245-260) uses the current prose first, then `Actionable.VerifiedNouns[id]`, the "epoch-cleared, object-owned observed spelling", as its fallback.
- `UndoRestoreSync.resync` (UndoRestoreSync.js:19-22) clears `Actionable.VerifiedNouns`, `CommandNouns`, `Scope.lastLookText` and `Scope.lastInventoryText` on every undo, restore and restart.
- After a restore the code submits only LOOK (`requestLookAfterRestore`), never INVENTORY, so carried items have no fresh prose and fall back to dictionary words until the player types INVENTORY.

**Direction:**
- Keep a per-story, display-only memory of printed names learned for each object id (object identity is stable within one story file), used as the lowest-priority fallback after a restore.
- It never feeds commands. It is replaced as soon as current prose says otherwise (prose stays first, as D214 requires) and is dropped if the object's dictionary words change.
- Optionally, the save-tied snapshot (I1) can carry the label memory too.
- Do NOT auto-submit INVENTORY: it can cost a turn (the E3 warning).

## I3. Zork underlines disappear right after first load (reproduced; cause)

- **Probe:** at 2.5 s, 4 s, 6 s and 9 s after boot, the only live mark is "West", and `UndoRestoreSync.generation` is already **1**, so a resync ran during boot. The operator's screenshots match: the first screen has only "West" dotted; after `look`, "in", "west", "door" and "small mailbox" are marked.
- **Cause:** Z-machine games execute `restart` as part of boot. ZvmCapture reports it, and `onStateRestored("restart")` treats the first one specially only for the *reason* (`_startedGameKey`). It still schedules `resync("")` 250 ms later.
- `resync` bumps `generation`, which is the D214 underline epoch, and clears `RoomLines`, `CommandNouns` and the Scope text. So the intro's marks, drawn moments earlier, are retired as belonging to an older timeline.
- **Direction:** the VM's first boot `restart` for a story in this page is not a state change. Skip the resync entirely for it (or at least do not bump the epoch or clear the scope), and keep every later restart unchanged (D94, D180).

## I4. Deaths and wins are not visible

- **Where they display today:** only as tiles in the **Equipment status card**, "Deaths this playthrough" and "Wins this playthrough", shown once above 0 (D204 and D215). There is no other notice, so a player who never opens Equipment sees nothing.
- **Treasures (Inform 7, from a Z-string scan):** its strings include the standard "You have died", "You have won" and "Would you like to RESTART, RESTORE a saved game…" (I7 library). A standard I7 death is therefore recognised by the contract. Not yet proven live for the operator's actual death: Treasures also has many custom combat texts, and the death could have come through a custom ending.
- **Needed evidence:** the operator's actual Treasures death text (the transcript or a save just before it), or a reproducible Treasures death.
- **Direction:**
  - a visible notice when a death or win is counted (a brief toast, for example "You died. Deaths this playthrough: 2"), plus the existing tile;
  - optionally the count in the top status area, so it can be seen without opening Equipment;
  - confirm with a real Treasures death that the counter fires; if it is a custom ending, extend the phrase list only by that real evidence.

## Prior-fix guard for any change here

- D94, D180, D181 and D182 (`audit-restore-sync`, `d94-cell-and-boot`);
- D214 epoch underlines (`underline-lifetime`);
- E4 transcript (`transcript` harnesses);
- D204 and D215 death (`death-terminal`, `stat-tracker`);
- map persistence and import/export (`tools/layout-regression` map save, download and import);
- the D182 decline-restore path.
