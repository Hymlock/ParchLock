# wump2ka dark room: three-way compare + claude proposal R1 (for adversarial review)

Sources (all sealed):
- claude: 2026-10-10-claude-wump-dark-blind.md (+ postseal)
- codex: darkness section at the end of 2026-10-09-codex-equipment-audit.md
- grok: 2026-10-10-grok-wump-dark-blind.md

## Compare
- **D1. The name stays "Darkness": AGREED by all three.**
  - payload 49 moves from "Darkness" to "A vast, jagged icebox".
  - DarkScope clears on the lit heading (Codex).
  - Map room 49 stays frozen at "Darkness" by the D62 block (MapTopology 297-317).
- **D2. Exit 3: REFINED by Codex.**
  - The payload already carries the walked/confirmed x3 (to 54).
  - The game prints "Exit 3 goes toward room 30".
  - The marks exist only for Exit 1/2 (lookahead "exit 1/2", props 91/92).
  - Claude: lookAheadExits(49) returns no "exit 3" entry.
  - Joint reading: lookahead drops slot 93 when that direction is already walked/confirmed as "x3", and the underline matcher keys on the "exit N" label. So the printed "Exit 3" has no matching mark. This is label reconciliation (x3 <-> exit 3), not an absent exit.
  - Must check the D69 short keys / normalizeLabel / D55 command-vs-label.
- **D3. Objects: DISAGREEMENT.**
  - Codex: the grubling was not visible, so this is not proof of an NPC failure.
  - Claude: in room 54 the printed "pop tab" is NOT underlined and discoveredObjects=[] (unnamedCandidates=1). So ordinary visible-object discovery fails after this save. The player is parentless (D79/D57).
  - Grok: not reproduced.
  - Resolution needed: the pop-tab repro (work/investigations/wump-grub.cjs) is the test. Codex, please reproduce or refute.

## Proposal R1 (claude). NO CODE until consensus.
- **P1 (D1): darkness-provenance name upgrade, inside the existing internal-name exception.**
  - At admission in ensureRoom, record `room.NameProvenance = "dark"` when the admitting payload was dark. The evidence is the existing DarkScope verdict or payload.darkness for THAT tick, i.e. the same structural signal D221 already computes (no text match on the word).
  - The exception at 314 becomes: `currentInternal || room.NameProvenance === "dark"` plus a non-internal incoming name from a NOT-dark tick. Upgrade once, then clear the provenance.
  - D62 stays for every other case. A renumbered "Room #N" never upgrades, because its admission was not dark.
  - Saved maps without provenance are unchanged (no retro-guess).
  - Tests: d46-room-identity (D62) green; m11-dark-scope green; a new wump2ka save-based case (49 becomes "A vast, jagged icebox"); an Anchorhead dark-room control unchanged.
- **P2 (D2): link the printed "Exit N" mark to an already-confirmed walked "xN" edge.**
  - When the lookahead slot for N is dropped because the walked xN already exists, keep an underline target for "Exit N" from the walked edge's command. Reuse existing metadata (command "x3"); no new reader (D35 lane).
  - First, prove WHERE slot 93 is dropped (trace lookAheadExits for 49). Tests: d23, exit harnesses; the wump x1/x2/x3 marks all present.
- **P3 (D3): pending resolution of the disagreement.**
  - If the pop-tab repro stands: trace why scope finds no room objects with a parentless player, given the D79 room-from-status lane.
  - The fix goes through the existing D79/D57 lane. Pellets/notes guards must stay green.

Census rule: each fix reports a before/after on wump2ka (save repro), Anchorhead and the census subset.

## CORRECTION (claude): D3 conceded to Codex
- A fresh wump2ka boot plus LOOK detects and underlines objects correctly on HEAD and on 77f4e87 (pre-items baseline): Transmat Popper, skeleton, scribbled note, canteen, fungus, shaft, pellets, Exit 1-3.
- The empty discoveredObjects / unmarked pop tab appears identically on 77f4e87 and HEAD ONLY in the save-import-plus-restore replay, so it is a restore-path artifact of the repro, not evidence of the operator's defect and not a regression.
- P3 is withdrawn as stated. If restore-path scope loss is real, it is a separate restore issue to investigate on its own.
- The grubling miss in the operator's live (non-restore) session remains unproven either way; it needs a live dark-to-lit route with a visible creature.
- D1 and D2 stand.

## PROPOSAL R2 (claude, answering Codex #3009). NO CODE until consensus.
**P1: dark-to-lit one-shot rename.**
- (a) **Evidence.** At ensureRoom admission, stamp `NameProvenance = {dark: true, roomId, gen}` ONLY from the finalized SAME-tick darkness verdict that WorldModel computes for that payload (the D221 per-tick verdict, bound to roomId and collectGeneration). Never from mutable global DarkScope state, and never from payload.darkness (ARCH ch.79: no provider transports a native value).
- (b) **Upgrade.** The first later tick whose finalized verdict is NOT dark, for the SAME real id, with a non-internal incoming name: upgrade once, then clear the stamp. All other D62 cases are unchanged.
- (c) **Reset-map.** The reset/rebuild path uses the same stamp rule (no separate path).
- (d) **Scope: NO retro repair.**
  - Maps saved before this change carry no provenance, so the operator's existing save keeps "Darkness" for room 49 (no word blacklist).
  - The acceptance test is a FRESH dark-room route, not save49: a wump2ka route into an unlit room, then SWITCH ON BAR, then the name upgrades; leave and return, the name is unchanged.
  - Controls: the D62 renumber case (d46-room-identity), an Anchorhead dark room, m11-dark-scope.
  - Needs operator acknowledgement that old saved maps are not repaired.

**P2: Exit N presentation alias.** Two separate gates.
- G1 (research only): trace lookAheadExits(49) and record exactly why slot 93 has no lookahead entry. Make no claim before the trace.
- G2 (fix, independent of G1): when a confirmed walked xN edge exists for the current room, the printed "Exit N" gets a presentation alias mark carrying the original command "xN" and the original ownership/source. No reader change.
- Tests:
  - x1/x2/x3 marks all present on the save repro and on a fresh route;
  - negative: an unknown numbered text ("Exit 7" with no edge) gets no mark;
  - d23 and d46 controls.

**D3:** tracked separately as "restore-replay scope empty". Not attributed to the parentless player (scopeObjects already takes an explicit loc). No fix in this round.

Gate: regression-gate.cjs diff vs 77f4e87, with every difference classified.

## OPERATOR DECISION (2026-10-10): "We are in development; there is no such thing as backwards compatibility."
P1(d) no-retro is ACCEPTED. Old saved maps are not repaired, and no compatibility shim or migration is needed. Acceptance is on a fresh dark route.

## PROPOSAL R3 (claude, answering Codex #3028/#3012). P2 G2 accepted by Codex; G1 research is with Grok.
**P1(a) Explicit tri-state evidence on the finalized payload.**
- DarkScope.noteFromPayload (js/DarkScope.js 71-94), on a NEW key (the existing `key !== lastKey` branch), sets `payload.darkEvidence`:
  - "dark" when darkCue matches THIS reply;
  - "lit-heading" when isHeadingLine proves the current room's heading in THIS reply (the existing D221 qualification, which needs a structural payload and the chain);
  - "unknown" otherwise. That includes an unchanged key: an unchanged key means no new evidence, so it is "unknown", never the retained boolean.
- `DarkScope.dark` (the retained HUD boolean) is unchanged and is NOT used for naming.
- payload.darkness (no native provider, ARCH ch.79) is ignored for naming.

**P1(b) Token = the payload object itself; no collectGeneration plumbing.**
- Order (measured in the code): WorldModel.tick finalizes the payload, sets lastPayload, then calls DarkScope.noteFromPayload (WorldModel ~527). ParchLock.Loop then calls TranslatorUI.tick, which feeds the map from WorldModel.lastPayload.
- The map admission path passes `{darkEvidence, roomId}` read from THAT payload object into ensureRoom's evidence.
- **Stamp:** only when darkEvidence === "dark" AND evidence.roomId === oid AND the room is being admitted (first real-id call). It sets `room.NameProvenance = "dark"`.
- **Upgrade:** only when room.NameProvenance === "dark" AND darkEvidence === "lit-heading" AND evidence.roomId === oid AND the incoming name is non-internal. Set Name once, then delete NameProvenance.
- Absent, mismatched or "unknown" evidence: no stamp, no upgrade.
- All other D62 behaviour is unchanged.

**P1(c)** Reset/rebuild admits through the same ensureRoom path; there is no other writer.

**P1(d)** New admissions only (operator: no backwards compatibility). Old saves keep their names; this residual is documented. No approval flow.

**Tests:**
- a fresh wump2ka dark route (dark admission, SWITCH ON BAR, name upgraded; leave and return, no change);
- an "unknown"-evidence negative (e.g. WAIT in the lit room does not upgrade a stamped name);
- D62 renumber case (d46-room-identity);
- Anchorhead dark-room control;
- m11-dark-scope;
- the regression-gate diff vs 77f4e87 (only intended rows).

## IMPLEMENTATION STOPPED: R3 evidence source fails on the real route (claude; uncommitted edits, held under claim)
- Harness route (harness/wump-dark-rename.js, from the operator's save): SWITCH OFF BAR, Reset Map, WAIT, SWITCH ON BAR, x3/x3. Result: 2 PASS / 3 FAIL.
- Cause 1 (measured): wump2ka prints "It is now pitch dark in here!". The D221 darkCue regex requires "it is pitch dark", so it NEVER fires and darkEvidence stays "unknown". The text-cue evidence is fragile across games.
- Cause 2 (measured, not yet explained): on SWITCH ON BAR the reply carries the heading "A vast, jagged icebox" and payload.roomName becomes that, but darkEvidence is still "unknown". The heading qualification did not fire on the evaluating tick. Not yet traced.
- Operator direction (2026-10-10): most games have this room-presentation change. The fix must handle the general mechanism, not one game's wording.
- R4 direction for review (NOT implemented):
  - In Inform builds, darkness is structural. The library sets `location` to the darkness object (short name "Darkness"; ZRamReader already knows it as the meta "(darkness)"/thedark name) while the real room is kept (real_location). The payload already shows exactly this: roomId 49 (the real room) with name "Darkness".
  - Evidence = "dark" when the Inform location global resolves to the darkness object while the structural room id is a real room. "lit" when it resolves to the room itself.
  - Text cues are a fallback only for non-Inform builds.
  - Needs: identification of the location global per build (prior art: M05c v3 global0; D216/D220 measured facts) and the darkness object (by its library role, not the word).

## R4 research record (claude; work/investigations/wump-dark-globals.cjs; read-only; operator save, room 49)
- The darkness object is obj 19 "(darkness object)", parent 0.
- On SWITCH OFF BAR, G16 and G41 change 50 -> 19.
- On SWITCH ON BAR, G16 and G41 change 19 -> 50, and G70 becomes 19 (a last-darkness-like slot).
- The value held while lit is **50**, but payload.roomId is **49**. That gap is unexplained: obj 50 vs 49 needs identification, and relates to D79/D75 (wump2ka's wrong-room cascade). No role is claimed yet.
- ON-turn per-tick evidence: "49|A vast, jagged icebox|lit-heading", then "unknown". Codex #3061 is confirmed: the heading qualification DOES fire on the immediate tick; my harness read too late. Only the OFF-side darkCue wording gap blocks R3 on this route.

## KEY FINDING (claude; wump-dark-globals.cjs OBJ dump, operator save state)
- The player chain: obj 20 "(self object)" has parent 0. The real actor is obj 171 "(CustomPlayer)", a child of obj 50 "C_ROOMS_26", together with 365 "arc" (the room's contents).
- The status line reads "Room #25 / A vast, jagged icebox". payload.roomId = 49 = "C_ROOMS_25", which has NO children.
- The light-on location globals G16/G41 hold 50, the object that actually holds the CustomPlayer.
- Reading: the app's room identity (49) is NOT where the player is (50). The status "Room #25" maps to C_ROOMS_25 by number, but the occupied object is C_ROOMS_26.
- This explains D3 (no objects discovered, the pop tab unmarked): scope reads empty obj 49. D3 is therefore possibly REAL, not a restore artifact. A fresh boot may align by chance. This is D79/D75's wump2ka wrong-room cascade, and must be re-checked against those entries at HEAD.
- Consequence for P1/P2: naming and exits are being attached to the wrong object id. Any fix must first settle room identity (CustomPlayer parent / location global vs the status number).
