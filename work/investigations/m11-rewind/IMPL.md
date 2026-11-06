# M11 click-to-rewind: implementation (DESIGN.md R2+R3, REVIEW.md re-review). Not committed.

Diff: `m11.diff` (js/Map.js, js/ZvmCapture.js, harness/d112-notes-panel.js, new harness/m11-rewind.js).

## What was built
- **Engine gate (ZVM only):** `ParchLockMap.RewindVm()` = `window.__PARCHLOCK_ZVM__` with an array `undo`.
  Quixe, emglken glulxe and bocfel never set it, so they never offer Rewind.
- **Arming:** the ZvmCapture.js `restore_undo` wrapper sets `vm.__pmUndoSeen` when the game's own
  @restore_undo succeeded and `undo.length` decreased. It is per VM instance, so per game per session.
- **Visit log:** `SetCurrentRoom` calls `RecordRewindVisit(room)` after the single WorldVisited write
  (M9 census still passes). Each entry is `{room, roomId, undoDepthAtEntry = vm.undo.length, top, next}`.
  `top` is the VM's own top undo entry at entry, and `next` is the snapshot taken while standing in the room.
  The steps are N = undo.length minus the index of `next`, which is the same as undo.length minus
  undoDepthAtEntry while nothing has been evicted. Holding the entry objects keeps N exact after the
  1 MB oldest-first eviction in save_undo. An entry whose snapshot is gone (typed UNDO, restore,
  eviction) is pruned from the log and never offered.
- **Offer:** `RewindOffer(room)` requires ZVM, armed, not busy, a visited room that is not the current
  room, and 1 <= N <= undo.length.
- **Long-press/right-click (D112, Known Rooms rows only):** `RoomHoldAction`. With no offer, Notes opens in one
  step exactly as before. With an offer, a Message dialog with **Notes** and **Rewind to here**.
- **Confirm:** "Rewind N turns to <room>? Progress since then is lost." with Rewind and Cancel
  (Message dialog, qol-window-actions buttons).
- **Mechanism (R3):** `Navigator.ClearQueue()`, then pop the N-1 newest `vm.undo` entries, subtracting
  `ram.byteLength + stack.byteLength` from `undo_len` as restore_undo does. Then ONE
  `Actionable.Submit("undo", "system-rewind")`. Poll for up to 5 s, checking that undo.length = start - N, payload roomId =
  target, and GetCurrentRoom() = target. On success the log is truncated at the depth reached. Otherwise a
  "Rewind failed" Message states why, plus "N-1 undo steps were discarded". `ParchLockMap.LastRewind` records
  the outcome.

## Notes
- Measured on Advent: the I6 save happens before each command, so the first room's snapshot is the one
  before the first LOOK. Rewinding to it is N = 3 after look, move, move, undo, move. The fixture computes
  N from the log and does not hard-code it.
- An entry recorded at depth 0 resolves `next` = undo[0] lazily, at the next SetCurrentRoom. If eviction
  happened before any later move, that entry could point at the wrong snapshot. This is not reachable in
  practice, because eviction needs about 15 or more turns and every move re-resolves it.
- harness/d112-notes-panel.js already crashed at HEAD (its jQuery stub had no `.remove()`, used by DrawRoom).
  I added the stub method and 7 M11 assertions for the menu and one-step paths.

## Validation
- `node harness/m11-rewind.js`: 17 PASS / 0 FAIL. Advent: walk 3, arm, rewind to the first room. The payload
  room and the `.dir-here` highlight are on the target, undo dropped by N, and the log is truncated. There is
  no offer on the current room or before arming, and Notes opens directly there. Alabaster: no ZVM, never offered.
- `node harness/d112-notes-panel.js`: 38 PASS / 0 FAIL.
- `node harness/m9-visited-physical-only.js`: 8 PASS / 0 FAIL.
- `node harness/operator-regressions.js`: 13 PASS / 0 FAIL.
- Focused gate (GLULX=1; Advent, Zork1, anchor, Alabaster): base = `git archive HEAD`, candidate = base plus
  Map.js and ZvmCapture.js. Result: **0 differences**. Alabaster's row is empty (no rooms) in both base and candidate.

## R2 (answers REVIEW-impl.md REVISE)
- **IB1:** `RewindCanSubmit` checks the same preconditions as `Actionable.Submit` and `Input.Inject`
  before anything is discarded: a visible line input, no char/[MORE] prompt, no Message or `#dialog` open,
  and `vm.undo.length === start`. If any check fails, the rewind aborts with "Nothing was discarded",
  leaving undo and undo_len untouched.
- **(a)** Verification works by identity, not stack length. The ZvmCapture restore_undo wrapper records the exact
  snapshot the game consumed (`vm.__pmLastRestored`), and success requires it to be the target entry, with
  the target room seen (or the player already played on past it). A command typed during the window no
  longer causes a false failure.
- **(b)** A half-typed line is captured when the hold menu opens and restored after Cancel, abort,
  failure or success, provided the line is empty at that point.
- **(c)** ZvmCapture wraps `save_undo` and calls `ParchLockMap.OnSaveUndo(vm)`, which binds the newest
  visit's own snapshot at once. Depth-0 entries no longer wait for the next room change.
- **Harness additions:** a depth-0 binding check, "no line input -> abort, nothing discarded", "LOOK typed
  during the window -> success still reported", and "half-typed line restored".

### Validation (R2)
m11-rewind 20 PASS / 0 FAIL; d112 38/0; m9 8/0; operator-regressions 13/0. Focused gate (GLULX=1; Advent,
Zork1, anchor, Alabaster): candidate = HEAD plus only Map.js and ZvmCapture.js, 0 differences.
