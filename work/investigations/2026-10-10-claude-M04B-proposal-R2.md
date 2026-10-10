# M04-B R2 (final draft): digest-bound Map_Storage facts (claude, after Codex #2761/#2764)

Supersedes the generic-discovery draft (2026-10-10-claude-M04B-proposal.md). The runtime never disassembles.

## Evidence (combined native / counter / disassembly measurement; not a universal ABI proof)
- Disassembly (work/investigations/m04b-*-mapstorage-disasm.txt, zdis.cjs). Warbler routine 144480 (called from 144240):
  - `call_vs RV__Pr L5 #77` (RV__Pr decoded at routine 239432);
  - `get_prop L4 #25`, `mul #13`, `add`;
  - `loadw #17062`.
  Facility routines 204768/217184 and others: `get_prop #25`, `mul #12`, `add`, `loadw #30128`. Routine entries are sweep-derived and are not independently proven reachable, except 144480 by its decoded caller.
- Room domain (measured), counting only objects whose prop 25 is a 2-byte value:
  - Warbler: 5 rooms, counters 0..4, unique and contiguous.
  - Facility: 130 rooms, counters 0..129, unique and contiguous. Object 210 holds prop 25 as a 1-byte value (read as a word it gives 56858). It is excluded by the 2-byte rule and is not a room.
- Direction domain (measured, individual ik3_count):
  - Warbler: objects 36..47 hold 0..11 (n, ne, nw, s, se, sw, e, w, u, d, in, out) and 94 holds 12 (road).
  - Facility: objects 33..44 hold 0..11 in the same order.
- Native: Warbler 51 south leads to 53 (row 0, column 3); Facility 45 north leads to 48 (row 0, column 0).

## Facts (ModuleStatFactsClaude, D204 lane: full digest plus the existing stable-header check)
- Warbler 9f3a27369091e16a23eab33038e6416823c8f39f34a9eec803120bd88cb0e5f0:
  `mapStorage { base:17062, nd:13, rowProp:25, colProp:77, rows:5, dirIds:[36..47, 94] }`
- Facility ef6530a73b3a3b868f0c872a28944bba407d0e209bf73892af0f38a9ef6a3a48:
  `mapStorage { base:30128, nd:12, rowProp:25, colProp:112, rows:130, dirIds:[33..44] }`

## Runtime (each collection generation; fail closed per collection)
- Use the fact only when the existing authenticated lookup returns it (digest, header and version).
- Re-verify the measured domain against current RAM every generation:
  - rowProp is a 2-byte value on exactly `rows` objects, with counters 0..rows-1 each used once;
  - each dirIds[i] has colProp == i (each used once).
  Any mismatch means NO decoded exits this collection.
- Row k is the current room's counter. The current room must be one of the domain objects; otherwise nothing is decoded.
- The table extent is `base + 2*rows*nd`. It must lie inside dynamic memory (below staticMem). All arithmetic is finite and non-negative.
- Cell c = word at `base + 2*(k*nd + c)`:
  - 0: no exit;
  - a domain room: exit to it;
  - an object with door_to: a door stub (door_to is never executed; door wins);
  - anything else: unknown, skipped.
- Labels:
  - canonical directions take the canonical word (D217 rule);
  - a custom direction (Warbler road, counter 12) is NOT labelled or drawn in this change (no runnable-command qualification yet), and is recorded as unknown.
- Cells are recomputed every generation. Exits predicted by this lane are not retained when a later generation decodes nothing or a different value. Walked edges are never touched.

## Integration (PRODUCTION_PLAN / ARCHITECTURE)
- This is a new D-entry extending D204 (executable-owned measured facts) and D218 (I7 metadata). It stays compatible with D23/D24 (no guessed labels) and does not touch D35 or D217.
- D219, D220 and D222 are not prerequisites.
- It is merged in ZRamReader.lookAheadExits as an additional source for I7 fact titles only, ahead of the generic scans, under the same D218 metadata guard.

## Tests (one native route per title plus targeted negatives)
- Positive:
  - Warbler 51: n -> 56, s -> 53; walking south lands in 53.
  - Facility 45: n -> 48; walking north lands in 48.
- Negative:
  - a non-fact title: unchanged;
  - a tampered counter or a duplicate counter: nothing decoded;
  - a row outside the domain: nothing decoded;
  - a door cell: stub only;
  - the road column: unlabelled.

## Amendment (Codex #2770, #2778): source-owned reconciliation
- Order per update: decode, then source reconciliation, then mergeConfirmedExits, then the map update.
- Every Map_Storage exit carries ExitMeta.source = "i7-mapstorage" and is integrated as an ephemeral hintOnly look-ahead. MapTopology.updateFromPayload preserves that source instead of the unconditional "ram-lookahead".
- The decoder always reports validity (a valid decode with zero cells is distinct from an invalid or off decoder).
- Reconcile (current room only):
  - for each Exits[dir] owned by "i7-mapstorage" without travelledTo, when this generation has no cell, a different destination, or an invalid decoder, delete Exits[dir];
  - also delete its own unwalked target metadata (toId, hintOnly, ...), keeping at most an explicit unresolved diagnostic outside the graph.
- Insertion never overwrites an Exits/ExitMeta entry from another source or one with travelledTo. When a cell differs from a walked travelledTo, the new lane does NOT call the link path that clears the proof (MapTopology.js ~360): walked history is never contradicted by this lane.
- mergeConfirmedExits: an "i7-mapstorage" entry without travelledTo is never marked confirmed. All other sources are unchanged.
- Tests (small, throwaway page): a cell set to 0 removes the predicted edge; a changed cell moves it; an invalid domain removes all of the room's owned edges; a walked edge for the same direction survives; an unowned entry is untouched. Exact row ids: Warbler room 51 (row 0), Facility room 45 (row 0).

## Clarification accepted into the plan (Codex #2781)
- The measured row domain is the COMPLETE list of room-id:counter pairs (2-byte prop 25). It is stored in the fact and validated every generation, so swapped counters or an extra holder fail. Warbler: 51:0,53:1,56:2,61:3,101:4. Facility: 130 pairs, from 45:0 to the last (stored verbatim in the fact).
- Canonical direction qualification, road skipped, generation and memory invalidation, and the dynamic-memory extent all remain. There is no generic scanner.
