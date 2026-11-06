# M11 implementation review (stand-in adversarial seat): **REVISE** (1 blocking issue, small)

## Runs (current checkout)
| Harness | Result |
|---|---|
| m11-rewind.js | 17 PASS / 0 FAIL |
| d112-notes-panel.js | 38 PASS / 0 FAIL |
| m9-visited-physical-only.js | 8 PASS / 0 FAIL |
| operator-regressions.js | 13 PASS / 0 FAIL |

I did not re-run the focused gate. IMPL.md reports 0 differences on Advent, Zork1, anchor and Alabaster, with candidate = HEAD plus Map.js and ZvmCapture.js. The seat that commits must re-run it.

## Verified correct
- **Trim bookkeeping:** `undo.pop()` and `undo_len -= ram.byteLength + stack.byteLength` match lib/zvm.js `restore_undo` exactly. restore_undo's other effects (pc, RAM, frames, stack, the store of 2) belong to the single real `@restore_undo` and must not be copied.
- **Arming:** in ZvmCapture, `preUndoLen` is read before `original.apply`, so the check is sound.
- **One normal undo:** it goes through `Actionable.Submit` → `Input.Inject`, the ordinary path. Submit's own undo branch sets `__PL_RESYNC__`, and the ZvmCapture wrapper fires once. No probe span is involved, so S1 and TurnRecorder see a single user-style system command.
- **Identity-based targeting:** holding the entry objects survives the oldest-first `shift`, because `indexOf` re-locates the snapshot. A missing snapshot is pruned and not offered. This deviation is better than plain depth arithmetic, and I accept it.
- **d112 stub:** adding `remove()` to the jQuery stub is a test-scaffold fix for a crash that already happened at HEAD. It does not weaken any existing assertion.

## Blocking
**IB1. Snapshots are discarded before the submit is known to be accepted.** `Rewind` pops the N-1 entries first and only then calls `Actionable.Submit`. Submit returns false whenever there is no `.Input.LineInput`, `Message.IsOpen`, or `#dialog` is present (Actionable.js:1348). That happens on a char/[MORE] prompt, when another dialog opens, or when the VM is mid-turn because the player submitted between the confirm dialog and the click. The player then loses N-1 undo levels with no rewind. The message does say so honestly, but the loss is avoidable. Fix: check the same preconditions (line input visible, no Message/dialog, `vm.undo.length === start`) **before** popping, and abort with nothing discarded if any fails. It would also be cleaner to pop inside the same tick, immediately before `Input.Inject`.

## Non-blocking
- **Typing during the confirm dialog or the poll:** Submit calls `Input.Clear()`, so a half-typed line is silently discarded. Acceptable, but restoring the field afterwards would be nice. If the player submits a command during the 5 s poll, the extra `save_undo` makes `len !== expected`. The result is a false "the game did not undo" message after a successful rewind. Fix: snapshot `vm.undo` identity, or disable input while `RewindBusy`.
- **Depth-0 lazy binding:** it resolves `undo[0]` on the next `RecordRewindVisit`. This is safe only if SetCurrentRoom runs every turn. If it runs only on a room change, a player who stays in the first room for about 15 or more turns before any eviction binds to the wrong snapshot. The room check catches it, but only after the entries are already discarded. Bind eagerly with `top=null`: let the first `save_undo` after the visit set `next`, through a save_undo wrapper. Or refuse to offer depth-0 entries once `undo_len` is near `options.undo_len`.
- **Failure text:** it is honest in both branches. "Rewound N turns, but the game is not in X" is correct for wump2ka-style divergence.

**Verdict: REVISE for IB1 only.** Re-ACCEPT once the preconditions are checked before the pops. No re-design is needed.

## Re-review (after IMPL R2): **ACCEPT**

| Run | Result |
|---|---|
| m11-rewind.js | 20 PASS / 0 FAIL |
| d112-notes-panel.js | 38 PASS / 0 FAIL |
| m9-visited-physical-only.js | 8 PASS / 0 FAIL |
| operator-regressions.js | 13 PASS / 0 FAIL |
| Focused gate (re-run by me; GLULX=1; Advent, Zork1, anchor, Alabaster; base = `git archive HEAD`, candidate = base + Map.js + ZvmCapture.js) | **0 differences** |

- **IB1 resolved.** `RewindCanSubmit` checks, before anything is popped: the line input is present and visible, no CharInput, no Message or #dialog, and `undo.length === start`. A failure reports "Nothing was discarded." These are Submit's own preconditions plus the stale-stack guard.
- **Target arithmetic.** `targetEntry = undo[start-n]`. After n-1 pops it is the top entry, which is the one the game's single @restore_undo consumes. `__pmLastRestored === targetEntry` is a correct identity proof. It is set in the wrapper from the top entry read before the original call. A command typed during the poll now cannot fake a failure.
- **save_undo wrapper.** lib/zvm.js `save_undo` returns 1 and does the push itself. The store/branch is emitted by the compiled op 1009, not by the return value. The wrapper returns `r` unchanged, so the semantics are preserved. The hook sits in try/catch with a `typeof ParchLockMap` guard, so it is inert without Map. `OnSaveUndo` returns at its first comparison unless `_rewindVm === vm`, and otherwise costs O(1). It cannot throw into the VM.
- **Depth-0 binding.** It now binds eagerly on the first save_undo. The earlier non-blocking concern is closed.
- **Draft restore.** The line is put back only if the field is empty, on cancel, on failure and on success. Fine.
- **Minor (no action required):** success also counts when the player has already played past the target (`roomVerified:false`). LastRewind records this, but the player is not told. That is acceptable.
