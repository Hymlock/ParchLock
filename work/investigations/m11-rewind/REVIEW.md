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
