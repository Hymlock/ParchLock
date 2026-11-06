# M11 rewind DESIGN.md: adversarial review (stand-in seat)

Verdict: **REVISE**

## Blocking
B1. **The counter can only be built on ZVM.** `js/ZvmCapture.js:114` wraps `restore_undo`, `restore_file` and `restart` on the ZVM prototype only. No file in js/ references Quixe's `vm_saveundo`/`vm_restoreundo`, and nothing in EmglkenHost/HostEmglkenBridge mentions undo. Bocfel and glulxe run in wasm, so JS cannot see their save_undo at all. On Glulx (Quixe/emglken) and on bocfel-run Z games, the design's "exact accounting" does not exist. The design must name a counting source for each engine, or limit (b) to ZVM and hide the option elsewhere.

B2. **The count is depth, not saves, and it has to be two-sided.** ZVM `save_undo` shifts out the oldest entry once `undo_len > options.undo_len` (lib/zvm.js). A plain success counter keeps growing after the oldest entries are discarded, so the depth must be clamped as `min(count, undo.length)`. Reading `this.undo.length` directly is better than a counter. Quixe also drops levels past 10. `restore_undo` pops one entry, so the count must go down on every successful restore, including a player-typed UNDO and every rewind UNDO. The design only describes the increment.

B3. **Native batch UNDO is refused by common libraries.** The Inform 6 library sets `just_undone` and rejects a second consecutive UNDO ("can't undo twice in a row", Miscellany 12). Some I7/extension setups and games with UNDO disabled do the same. N > 1 then stops at depth -1 and leaves the player at an intermediate point, the partial failure the design itself lists. The design must either (i) call `restore_undo` N times directly on the VM, bypassing the parser (possible only on ZVM, where one resync follows), or (ii) detect refusal after each step and abort with a report. Option (i) also removes the hidden-output problem in B4.

B4. **Hidden UNDO commands conflict with the S1 probe boundary and TurnRecorder.** If N UNDOs go through the input path, each is a submission. The D207/S1 probe span covers a single app-owned command, and StatTracker reads probe output through `probeFactsForIdentity` (StatTracker.js:391-609). N commands inside one span would either be misattributed or need a new multi-command span type. TurnRecorder would also record N turns. The design must specify the ownership (one rewind-owned span, with TurnRecorder and the D263 learners told to skip it). The direct-VM route in B3(i) avoids this.

B5. **Drop "Undo rewind".** A pre-rewind ZVM-shaped snapshot is only feasible on ZVM. Quixe would need a private copy of vm_saveundo, and emglken would need a wasm save/restore API. Both are the option (a) build. Rely on the confirmation (turn count plus "progress is lost") and remove the redo from the scope.

## Non-blocking
- Map: truncating the visit log is correct but must happen at the depth reached after the restore, not the requested depth (see B3 partial failure). The visited set and discovered rooms/exits stay in place, which matches D267 (physical visits) and D263 (knowledge is not state), since resync only moves the current room. D243 is unaffected because nothing is saved to file. Add the wump2ka check: verify the post-rewind room against the target id.
- Long-press: D112 Notes is in use, through the Map.js:84 press-and-hold/right-click on a Known Rooms entry, and harness/d112-notes-panel.js covers it. A menu adds a tap, so that harness must be updated to tap Notes, and the menu must show Notes alone (or open Notes directly) when Rewind is not offered, so the current one-step flow keeps working on non-rewindable rooms and games.
- v3 ZIL has no undo, so hiding the option there is right (missing over wrong).

## Required revisions before consensus
1. Name the depth source per engine (ZVM `undo.length`), and hide the option on engines without one.
2. Count both directions, and clamp the depth when old entries are discarded.
3. Use direct `restore_undo` N times plus one resync and LOOK (ZVM), not the parser UNDO verb. Otherwise handle refusal of repeated UNDO.
4. If commands are kept, define the probe and TurnRecorder ownership for the batch.
5. Remove the one-level redo.
6. Keep the Notes path one step when Rewind is unavailable, and update d112-notes-panel.js.

## Re-review of R2: **REVISE** (one blocking issue; everything else accepted)

Accepted: ZVM-only scope, `undo.length` as the depth source (it is a plain array that shift/pop keep current), dropping undo-rewind, the partial-failure report, map truncation and the target-room check, and the one-step Notes path.

**Blocking issue R2-B1: `restore_undo` cannot be called directly between turns.** Evidence from lib/zvm.js:
- `restore_undo` is an opcode handler. The compiled op 1010 is `if(e.restore_undo())return`. The function pops an entry, sets `this.pc` to the address after the game's `@save_undo`, and stores 2 into `t.var` (`this.variable(t.var,2)`). It needs no branch, but it relies on the JIT loop to return and then `run()` from the new pc.
- Between turns, the VM is parked in `read` with `this.read_data` = {bufaddr, parseaddr, storer} and an outstanding Glk line request. A direct call only swaps the RAM and the pc. Nothing calls `run()`, so no output appears and LOOK cannot be submitted as a new command. The next line event goes to `handle_line_input`. That writes the text into the stale `read_data.bufaddr`, stores into the stale `storer`, and resumes at the restored pc, which is mid-Keyboard just after save_undo. The game then issues its own new @read while the old line request is still live. The result is corrupted input and a possible Glk double-request.
- Calling it N times compounds this. Each call overwrites the pc and RAM, which is harmless, but the stale read context is still the problem.

**Required fix (simple, and it uses existing paths):** discard the N-1 newest entries from `vm.undo` (pop them and subtract their sizes from `undo_len`, exactly as restore_undo does). Then submit one ordinary typed `undo`. The game's own @restore_undo then runs inside a real opcode context, the ZvmCapture.js:114 wrapper fires once, UndoRestoreSync resyncs, and the game prints its own undo message. The I6 "twice in a row" refusal cannot trigger, because only one UNDO is sent. That single command is a normal player-visible system command, so S1 and TurnRecorder need nothing new. The game's own output replaces the extra LOOK, or LOOK can follow as a second command. Failure handling: if `undo.length` did not drop by one after the command (the game refused UNDO, or UNDO is disabled), report it, and accept that the discarded entries are lost. Since that is irreversible, only offer Rewind once a first typed UNDO in this game has worked (a learned "undo works" flag), or check the game's own UNDO response first.
