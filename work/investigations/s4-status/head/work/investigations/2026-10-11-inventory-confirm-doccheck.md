# Inventory loop confirmation: doc check (2026-10-11, operator 12:43)

## Requirement
On every inventory reply (`i`/`inv`/`inventory`), each object the RAM says is carried (children of the confirmed inventory root, i.e. the existing payload.inventory) must be found in that reply's listing and underlined, bound to the object's CURRENT name even if an older alias underline for it is retained elsewhere. This is general for ZIL, Inform and Glulx wherever RAM inventory exists; where it doesn't (most Glulx), it does nothing.

## Existing systems (git grep js/ docs, DECISION-INDEX, git log -S)
- Actionable marking pass: `invIds` from payload.inventory tags targets as kind "inventory" (Actionable ~1890-1917). This tags carried objects but never confirms them; a target skipped by the already-marked check is silently dropped.
- D214 U1 retainMarks/relocateExactMarks: retained marks live while a phrase owner is valid and move forward only to the newest occurrence of the SAME text. They never re-bind to a different (current-name) phrase. This is why the spear was missed: retained "formation" kept 290 in markedIds, and the `i` line prints "stone spear", which relocation cannot reach.
- 0ed5cdb (pellets/pellet release): same-word variants only.
- Spear patch R2 (work/investigations/2026-10-11-spear-release.patch): alias-only retained mark yields to the preferred own name; uniquely resolved; free occurrence (Codex #3319).
- Inventory root: AttrCalibrator.confirmedInventoryRootId, D224/c53337d real_location, playerGlobal facts. Prior attempt 311ad4a (inventory root qualified by INV text) was REVERTED (d037132); locked: no text-derived inventory root. This design reads the root, never derives it.
- Equipment sheet: EquipmentUI from payload.inventory, with display text from Scope.lastInventoryText. It is already in sync (Q0 check: Equipment = inventory).
- D207: StatTracker hides carry-probe replies. Hidden probe lines are never confirmation targets (observedLine).

## Design (complements the spear patch; supersedes it only for inventory replies)
After the normal marking pass, when the command is an inventory command and the reply lines are observed:
1. For each id in payload.inventory, it is confirmed if some mark in the reply lines resolves to it (objectId or a candidateIds entry).
2. For an unconfirmed carried object, try its own targets in D146 order (full current name, then head noun, then aliases) against the reply lines only, and only on free occurrences (text nodes outside .pl-act/input).
3. Re-binding: a retained mark for that object on a non-reply line is released (text kept) only if it resolves uniquely to the object (Codex #3319). Shared-alias marks are left alone and the object stays unconfirmed.
4. Never invent: if no printed phrase matches (e.g. the game prints a description that isn't a name or alias), the object stays unconfirmed; a debug count is recorded and nothing is fabricated. Truncated vocab is never displayed (R5.1).
5. Identical items (two pellets): one mark per phrase occurrence; candidateIds already carry both ids (existing behaviour), and both ids count as confirmed.

## Isolation
Inventory replies only, and only for objects already in payload.inventory. Room text, map, status and probes are untouched. Glulx without a RAM inventory: inventory is empty, so it's a no-op.

## Proof
- Harness guard harness/inventory-underline-guard.js: on fresh seeded wump2ka (spear seed 4, pellets), Zork I (mailbox leaflet, lamp/sword), an Inform title (Curses or Ghost) and a ZIL title with nested contents (Enchanter), every carried item is underlined in the `i` output, or reported unconfirmed with the printed line.
- Negative controls: a shared-alias retained mark (not released); identical pellets (one mark, both ids); a hidden carry probe (not marked).
- Seeded all-games gate (three types), operator-regressions, pellets-inventory-live, notes-pellets-descriptors-live, d31-nested-inventory, d214-yourself-verbs, command-consistency-regression, wump-dark-rename, games=309.

## Status
Waiting for Codex GO. The spear patch stays uncommitted until Codex decides whether this supersedes it or both land.

## Swap detection (operator 12:44 addition)
On each inventory reply, compare the RAM-carried set and the current names with the previous confirmed inventory snapshot, using the existing WorldModel/payload inventory (no new registry):
- **Different id, similar name (replacement):** an id leaves the carried set while a new id enters with the same head noun. The old id's marks are released (text kept), the new id is marked on its printed name, and the Equipment sheet / inventory names follow payload.inventory (EquipmentUI already re-renders from payload; the guard asserts it).
- **Same id, new name (rename):** id still carried, current name differs from the last confirmed name. Marks for the old name are released and the new name is marked (the spear case).
- Nothing is inferred from text alone; both cases are triggered only by the RAM difference. Without RAM inventory (Glulx), no-op.
- Prior attempts: none found (git log -S "swap" / "replaced" in js: none for inventory). D148/Q0 reconcile only containment.

## Fixtures (found by scanning every Z story for an off-stage object sharing a head noun with an in-play one; tmp/swaps.js)
- Same id, new name: wump2ka 290 rock formation -> stone spear (seed 4 route + "take all").
- Different id: Border Zone (ZIL) 242 "paper towel" -> off-stage 257 "wet paper towel"; bedlam (Inform) 40 "tube of glue" -> 41 "empty tube of glue"; Adventureland 73 "empty wine bladder" -> 74 "distended gas bladder"; Balances torn scroll (64). The exact native command sequences are to be confirmed live; a fixture is admitted only after RAM shows the id change in inventory. Treasures has only one rag object (147 "absorbent space-rag"), so it has no swap.
- Harness guard (harness/inventory-underline-guard.js): on each `i`, every RAM-carried id is underlined on its CURRENT name; swapped-out ids have no live mark; the Equipment sheet ids equal the carried ids and its names equal the current names.

## R2 (Codex #3326 NO-GO addressed)
1. **Identity:** candidateIds are possible owners only. An ambiguous group mark (two pellets, candidateIds [198,199]) is "group-represented"; it never claims each object individually resolved and is never released to force individual marks.
2. **Printed only:** a carried id is checked only when the inventory reply prints one of its own phrases (current name, head noun or alias, matched by the existing exact-phrase rules). RAM descendants in closed/opaque containers, authored INVENTORY text or worn formatting that does not print the name give "not printed": a diagnostic, never a fault, never an underline, never an inventory-root signal.
3. **Ownership, by source reference:** the reply qualifies only when all of these hold. (a) The last input line (Actionable ~1661 lastInput / ~1773 command) is an observed line (Actionable.observedLine; hidden carry/stat probes fail this, D207). (b) StatTracker._probeBaseline and _hideCarryProbe are not set for this turn (StatTracker ~3352). (c) The command text is exactly i/inv/inventory, optionally "take inventory"; NPC orders ("x, ...") never match. (d) The lines are `latest` (after lastInput, current generation via BufferRevision ~1651). (e) The reply is not a parser question (it ends with "?" and has no listing line). Historical lines are excluded by (d).
4. **Transactional, one mechanism:** a single shared function, Actionable.rebindRetained(t, activeLines, idPool), replaces both the 0ed5cdb release and the spear rule. It first runs wrapFirstExact for the preferred phrase on a free occurrence. Only if that succeeds does it retire the old mark, and only when that mark resolves uniquely to t.objectId (ambiguous marks are kept). On failure nothing changes. General room text uses it under the existing conditions (same-word variant or alias-only rename). Inventory replies (qualified per 3) use the same function with the inventory-line qualification. Swap detection (above) only decides WHICH ids/phrases are offered to it.
5. **Controls (harness/inventory-underline-guard.js):** the spear (rename), a replacement fixture once proven live, identical pellets (group mark kept), a shared-alias retained mark (kept, object reported unconfirmed), a hidden carry probe (no marks), a container with hidden contents (not printed = diagnostic only), and Ghost "Christmas presents" plus notes-pellets descriptors (no change).

## R3 (Codex #3329 amendments, accepted)
- **Provenance:** the inventory reply qualifies only through TurnRecorder's accepted-submit event (TurnRecorder.subscribeAcceptedSubmit / onAcceptedSubmit: submissionId, pageEpoch, source). The event's source must not be "stat-probe" or another quiet source, and the reply is bounded to the lines produced after that submission and before the next. Unknown provenance abstains. The last Style_input text and BufferRevision are not provenance.
- **No "replacement" inference:** changed carried ids are ordinary scope reconciliation. After a drop, valid room-object marks stay. An old mark is retired only by existing owner validity (retainMarks) or by a successful, uniquely resolved rebind. A shared head noun plus enter/leave is NOT treated as a swap. "Swap" coverage = the rename case (same id) + the different-id case falling out of reconciliation (the new id is underlined on its printed name; the old id's marks are kept or dropped only by owner validity).
- Treasures' single rag object is an initial-image observation, not proof that no runtime replacement exists. The native replacement fixtures (Border Zone, bedlam, Adventureland) stay hypotheses until admitted live.
- One shared mechanism, Actionable.rebindRetained, supersedes the separate spear patch.

## PARKED (operator 12:56)
Design R3 + exact patch v3 (work/investigations/2026-10-11-rebind-retained.patch: Codex #3334 provenance/per-target/grouping/coverage fixes applied, not yet re-reviewed) + draft guard (work/investigations/inventory-underline-guard.draft.js) are parked for Codex review. No implementation. The spear fix folds into this patch. Not committed to product: the all-games gate was not within one run of done (stopped). Draft-guard note: on the candidate tree, the seed-4 fixture did not carry the spear (route timing), so the fixture needs a deterministic route before it can be a guard.
