# M11 Click-to-rewind: design research (read-only; no js/ edits)

## Spec (D32, PRODUCTION_PLAN.md:1240, row pl-r097 at :1562)
Each map visit is paired with the VM turn number at entry; clicking a visited room
computes N turns back and issues N real `UNDO` commands; Phase 8 opcode hooks
(UndoRestoreSync) keep the map honest. A fixture should prove N UNDOs are issued and the
highlight lands on that node. Never built. Related: D180 (stats join the undo/restore
resync), D243 (save-linked playthrough totals; operator 2026-10-30: restoring an older save
keeps the higher death/win count), D263 (learned stores persist), D157 (fast travel).

## What exists
- **UndoRestoreSync.js**: `noteCommand` spots typed undo/restore/restart; `ZvmCapture.js:114`
  wraps the VM's `restore_undo`/`restore_file`/`restart` and calls `onStateRestored`, which
  waits and then runs `resync()` (WorldModel, verified names, stats via D180, and a LOOK after a file restore).
  So any successful interpreter restore, however it is triggered, already re-syncs.
- **Undo depth**:
  - ZVM (lib/zvm.js) `save_undo` pushes {ram up to staticmem, stack, frames, pc}. It drops
    the oldest entry once `undo_len` exceeds `options.undo_len` = 1e6 bytes. Depth is about 1 MB divided by
    the dynamic-memory size, so roughly 15 to 100 levels for typical z5/z8 games.
  - Quixe `vm_saveundo` keeps 10 levels (`Le.length>10 && Le.shift()`).
  - Emglken bocfel/glulxe (wasm) is a separate stack with its own depth.
  - A snapshot only exists when the **game** runs `@save_undo`. Inform 6/7 libraries do this
    each turn. **Infocom v3 ZIL games have no undo opcode**, so UNDO is not available there at all.
- **No per-turn snapshot history exists.** TurnRecorder records the command, status text and
  analyzer snapshots, not VM state. SaveState.js is the D243 playthrough ledger
  (run IDs, death/win totals), not a state store.
- **Map taps**: `Map.js:216` `room.click -> RoomClicked` only re-centres and reveals the icons.
  The `go-to-room` icon goes to `GotoRoom`, then `Navigator.FindRoute` (BFS) and the StepQueue walk.
  Long-press/right-click on a room (D112, Map.js:84-146) opens `PromptAddNote`, so the
  long-press slot is already taken by Notes.

## Options
**(a) Interpreter snapshot ring (own ring, separate from the game's undo).**
After each accepted turn settles (TurnRecorder settlement), capture the VM state
(ZVM: the same shape as save_undo; Glulx: Quixe `vm_saveundo`-like data or an emglken serialized save),
tagged with {turn, room id}. Rewind restores that snapshot directly.
- Memory: about the dynamic-memory size per turn (ZVM roughly 10-60 KB; Glulx RAM is often 100 KB-1 MB+).
  A 4-8 MB budget gives about 100-500 turns on Z and only about 5-40 on large Glulx. Deltas or compression against
  the previous snapshot cut this a lot, since RAM changes per turn are small.
- Works on v3 ZIL games, where native UNDO does not exist. Does not depend on game cooperation.
- Interaction: the game's own UNDO stack is now stale relative to our restore. Clear it, or
  at least accept that one UNDO after a rewind goes to an arbitrary point. Clearing is safest.
  Must call `UndoRestoreSync.onStateRestored("rewind")` and then the D180 stats resync,
  plus a LOOK (like `restore_file`), because there is no native output.
- Cost: a new hook per engine (ZVM, Quixe and emglken are three code paths). The emglken wasm needs
  its save/restore API. This is the largest build.

**(b) Repeated native UNDO (D32 as written).**
- Cheapest: inject `undo` N times through the existing input path. Resync already fires.
- Limits: N is capped by depth (10 on Quixe, about 1 MB on ZVM, 0 on v3 ZIL, and some
  Inform games or modes restrict UNDO). Meta-commands and failed parses consume no snapshot,
  so the turn count does not equal the UNDO count. Each UNDO prints text, which is noisy.
  A partial failure leaves the player at an intermediate point.

**(c) Restore from D243 save-linked history.** Only as fine as the player's own saves. It is not
per-room, and the playthrough ledger does not hold VM state. Useful only as a fallback ("nearest
save before turn T").

## Recommendation
Build **(b) first, under the D32 contract, with exact accounting**, and design for (a) as the
follow-up for v3/Quixe depth:
- Keep a visit log {roomId, enteredAtUndoDepth} keyed off a counter that increments when
  `save_undo` actually succeeds (wrap it in ZvmCapture next to restore_undo), rather than
  turn number. N = currentDepth - depthAtEntry. This counts exactly the snapshots that exist.
- Offer the option only when N is at most the available depth and the engine reports undo support. On a
  v3 game, hide it (missing beats wrong).
- Run the UNDOs as one batch with output suppressed except the final LOOK, then a single resync.
If the operator wants it on all 80 release games, including v3 ZIL, (a) is the only route. Size it
with deltas and measure on the largest Glulx release title first.

UI: the room long-press already opens Notes (D112). Turn it into a small menu of
**Notes** and **Rewind to here** (the latter only on a visited, non-current room within reach).
The confirmation reads: "Rewind 7 turns to West of House? Progress since then is lost." with Rewind and Cancel buttons.
Optionally add "Undo rewind" for one step. Native UNDO cannot redo, so redo needs (a)'s ring or a
pre-rewind snapshot. With (b), take one pre-rewind snapshot (ZVM save_undo shape) to give a
one-level redo.

## Risks
- **Irreversible loss**: needs the confirmation, an explicit turn count, and ideally a one-level redo snapshot.
- **Map and learned-store divergence (D263)**: the map keeps discovered rooms and exits after a rewind. That is
  correct, because knowledge is not state. But "current room", item locations and WorldModel must come from
  the VM via resync. Learned stores (D263) must not be rolled back, and must not learn from the
  UNDO output. Stats follow D180 resync, but death/win totals keep the higher count (D243 ruling).
- **Visit log after a rewind**: entries newer than the target must be truncated, or the next
  rewind miscounts.
- **Timed or randomised games**: real-time Glk timers keep running, and the RNG may re-roll after
  restore (wump2ka randomises its cave, so the room ids may not match the map). Verify the
  post-restore room equals the target. If it does not, report it and do not retry.
- **Fast travel in progress** (Navigator StepQueue): cancel the queue before rewinding.
- Fixture per D32: a known-depth Inform game (for example Zork-like z5), rewind 3 rooms, assert N UNDOs,
  that the highlight is on the target, and that operator-regressions.js shows 0 FAIL.
