# S1 stage 1b: arming a no-argument I6 action dispatcher (feasibility + proposal), 2026-11-05

Read-only investigation. No js/ edits. Tools in this folder: `trace1b.cjs` (in-page call/ret/_print patch, as trace-r2, plus a per-call snapshot of the globals that equal the action number), `an1b.cjs` (call tree per action-routine call), `post.cjs` (text outside action-routine spans), `dis.cjs` (minimal static disassembler for one routine, read straight from games/*.js). Traces: `MakeItGood.zblorb.js.trace.json`, `Advent.z5.js.trace.json` (last run of each).

Run: `GAME=Advent.z5.js CMDS="in|take all|inventory|i" node work/investigations/s1-probe-leak/stage1b/trace1b.cjs && node work/investigations/s1-probe-leak/stage1b/an1b.cjs Advent.z5.js`

## 1. Identifying the action routine without an argument: SOLVED STATICALLY

The no-argument dispatcher is the library's `ActionPrimitive`, i.e. `indirect(#actions_table-->action)`. Its body is fixed and decodes to the actions table base (already derived by decodeI6ActionLayout) and the `action` global:

| Game | Dispatcher | Body | actionBase | action global |
|---|---|---|---|---|
| MakeItGood (v8) | 0x27ef (byte 0x13f78), 0 locals | `loadw #49414 G57 -> sp; call_1n sp; rtrue` | 49414 (= layout.actionBase) | G57 |
| Advent (v5, strict) | 0x3734 (byte 0xdcd0), 0 locals | `call_vs #23721 #19853 G50 -> sp; call_1n sp; rtrue` (RT__ChLDW bounds-check veneer) | 19853 (= layout.actionBase) | G50 |

Runtime cross-check (globals equal to the action number at the action routine's call):
- MakeItGood: Inv(6), Wait(71), Examine(20) all have {57, 96, 233}; Examine adds others. The static decode picks G57.
- Advent: GoIn(111), Take(78, x7), Inv(29), Wait(87), Xyzzy(99) all have {50, 89, 233}. The static decode picks G50.
- Look (action 0) is useless for value matching (dozens of zero globals). That is why the value-only candidate is rejected: a global is picked by the dispatcher's own code, not by coincidence of value.

In every call the action routine's frame parent is the dispatcher (depth 6, parent 0x27ef / 0x3734 called with no args). Routines reached directly (Advent LookSub from GoSub with arg 1; InvTallSub 0x4458 from InvSub) have a non-dispatcher parent.

## 2. Inventory reply inside [entry, after-or-ret): PROVEN NATIVELY

- **MakeItGood** `inventory` and `i`: InvSub 0x34f2 (acts 6) entered at 0, returns at 212. It makes no (obj, after|react_after) call (replaced InvSub; direct callees are 3x list writer 0x2a92). Both paragraphs, "In your trenchcoat pockets ..." and "In addition to your trenchcoat, you are wearing ...", lie in [0, 212). After return: only "\r>" (prompt). So reply = [0, 212): both paragraphs hidden. This is the leak stage 1b fixes.
- **Advent** later `inventory`: InvSub 0x445b entered at 0. AfterRoutines 0x37c6 (a direct callee; it holds the 0x5c8a(obj,27) react_after calls at depth 12, obj 31/30/20/38/39/43, all within 1..277) is entered at 110 (128 with the lamp lit), the same as ret. Reply = [0, 110) is the whole list.

## 3. InvTallSub hand-off: REAL, and it breaks stage 1 logic unless handled

Advent's first INVENTORY of a game (inventory_style == 0):
`dispatcher 0x3734 -> InvSub 0x445b (d6) -> InvTallSub 0x4458 (d7; static: store G52 #23; call_2n R_Process #29; rtrue) -> 0x3766(29) -> dispatcher 0x3734 -> InvSub 0x445b (d12)`. All text (0..110) comes from the inner InvSub. Later inventories go straight to InvSub (no hand-off).

With the stage-1 rule extended naively, the outer entry is armed, the inner call faults `reentered` (fail-visible, OK). But if reentry were tolerated, after-phase detection would pick the outer routine's direct callee InvTallSub at offset 0, making the whole list an "event" (leak). So the nesting needs an explicit rule (below).

After-phase detection in stock libraries: still correct. Advent AfterRoutines makes (obj, 27) calls with obj in range. MakeItGood's AfterRoutines (seen in Wait/Examine/Look) makes 0x284c(391, 5) (RunRoutines(location, after)); 391 is within 1..664. Stock `WaitSub` calls AfterRoutines *before* its message, so a probe on Wait would get after = 0 and show "Time passes." (shows, never hides; and Wait is not a probe verb).

## 4. End-of-turn daemon after return: NOT REACHED NATIVELY

MakeItGood: 8x wait, get out, inventory, 3x wait printed nothing outside action spans except the implicit "(the black chevy)" pre-entry text. Advent: no dwarf/each_turn text in 19 commands (plugh did not move). Structurally, daemons run in EndTurnSequence after the dispatcher returns to depth < 6, so they are after ret by construction; anchor's scenario B (whistle daemon) already proves the cut shows post-ret text. A native stock proof would need a longer Advent walk into the cave (dwarf daemon); record it as a residual, not a blocker.

## Stage 1b proposal (exact arming conditions)

Static (in decodeI6ActionLayout / i6ProbeActionSpec, cached per story): nothing new is needed up front. The dispatcher is validated lazily on the action routine's first call, from the parent frame's routine address.

**`dispatcherGlobal(pk)`** (StatTracker, cached by packed address): decode the routine at pk. It must have 0 locals and exactly one of these bodies, and nothing else before `rtrue`:
- A: `loadw #actionBase Gk -> sp; call_1n sp; rtrue`
- B: `call_vs #V #actionBase Gk -> sp; call_1n sp; rtrue`, where V is a routine whose body is not checked (veneer). The constant must equal layout.actionBase exactly.
Returns k, or null. The spec carries actionBase and a lookup for this (ZvmCapture stays VM-only; pass the function or a precomputed map in the spec).

**Entry (ZvmCapture._pbCall, when t === spec.routine):** the stack records each frame's routine address. Accept as dispatcher-direct when parent.depth + 1 === depth and either
- (stage 1, unchanged) parent.arg0 === spec.action; or
- (1b) parent.args is empty, dispatcherGlobal(parent.routine) = k, and the VM's current value of Gk === spec.action (read through vm.m at the header's globals table).

**Nested re-dispatch (InvTallSub/InvWideSub):** if t === spec.routine is dispatcher-direct (by the rule above) while the armed routine is active (entry set, ret unset), and pb.text.length === pb.entry (the outer has printed nothing yet), rebase: push the outer onto pb.outer, then set entry/entryDepth/after from the inner. On the inner ret, record ret. On the outer ret, require pb.text.length === inner ret, else bad = "outer-printed". Any other reentry stays `reentered`. Nesting depth cap 2.

**Unchanged:** after = entry offset of the active routine's direct callee that contains the first (obj in 1..objMax, after|react_after) call. ret = the active routine's own return. All existing faults, caps, the text-matching cut and the fail-to-paragraph-rule path stay.

**Fail-visible (anything unproven, so no arming and today's rule):**
- the parent frame is not a decoded dispatcher shape A/B, or the constant is not actionBase: `routine-without-dispatcher`;
- Gk's value is not spec.action at the call: `dispatcher-action-mismatch`;
- the outer printed before the nested entry, or after the inner ret: `outer-printed`;
- a decode exception, or an unknown opcode in the 3 instructions: the shape is rejected.

## Required proofs for the implementation (harness/probe-action-boundary.js)
- F (native): MakeItGood first `inventory` is armed by rule 1b. Both paragraphs are hidden and nothing is released.
- G (native): Advent first INVENTORY (nested InvTallSub) and a later INVENTORY. Both armed; whole list hidden; entry is the inner InvSub.
- H (constructed, on Advent): a react_after print from AfterRoutines inside InvSub must be shown (scenario E equivalent on a natively armed stock title, which closes the stage-1 note "none was found").
- I (constructed): a dispatcher whose global value differs from spec.action stays unarmed (paragraph rule).
- Anchorhead A-E unchanged. repro.cjs before/after on anchor, MakeItGood, Advent, Zork1, curses, LostPig. Then operator-regressions and the three-type regression gate before commit.

## Residuals
- Native end-of-turn daemon on a stock title not observed (item 4).
- Any library whose ActionPrimitive differs from shapes A/B (e.g. older 6/1-6/7 libraries that inline `indirect` differently) stays unarmed. A census of ActionPrimitive shapes over the 80 release games would size this; not done here.

## Amendment R2 (claude, main seat): answers REVIEW.md blocking issues 1 and 2
**Rebase rule, restated precisely.** When the probe routine is re-entered through the dispatcher while the outer call is active:
1. **Pre-entry text.** Require the screen-text length equal to the outer entry offset (no output between outer entry and inner entry); otherwise fault `nested-pre-text`.
2. **Stale after.** If `pb.after >= 0` was already set during the nested path (Before/GamePre routines), fault `nested-pre-after`; otherwise keep `pb.after = -1`.
3. **Rebase.** Entry = the inner entry offset; entryDepth = the inner depth; after-phase detection runs inside the inner call as in stage 1.
4. **Inner ret.** `pb.ret` = the inner ret offset; restore the outer entryDepth (used by `_pbPrune` and the outer-ret detection).
5. **Outer ret.** Require the screen-text length equal to `pb.ret`; otherwise fault `outer-printed`. An outer frame that never returns before ownership ends is a fault (`outer-unreturned`).
6. Nesting is capped at 2.

Every fault means today's paragraph rule (fail-visible).

**Implementation notes from the review:**
- Record each frame's packed routine address in the same packed form as spec.routine.
- Cache dispatcherGlobal per packed address; a decode exception means `routine-without-dispatcher`.
- Read Gk from header globals (0x0C) + 2*k at the action-routine call.

**Required proofs.**
- **F (native):** MakeItGood's first INVENTORY hides both paragraphs.
- **G (native):** Advent's first (nested) and a later inventory are both armed and hide the list.
- **H (constructed, Advent):** a react_after print inside InvSub is shown.
- **I (constructed):** a dispatcher whose global mismatches stays unarmed.
- **J (constructed):** an outer routine that prints after delegating gives `outer-printed` and falls back.
- **Also required:** Anchorhead A-E unchanged, repro.cjs on 6 games, operator-regressions, and the three-type gate.

**Census (closed residual).** 47 of the 55 layout titles are armable (38 shape A, 9 shape B). 8 older-library titles inline the dispatch and stay on the paragraph rule (fail-visible).
