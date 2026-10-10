# M04-B proposal: read Inform 7 exits from Map_Storage (claude, for Codex attack)

Research basis: work/investigations/m04b-*-mapstorage-disasm.txt (forward disassembly, zdis.cjs) and the census of ik1_count holders (rooms only: Warbler 5/5, Facility 131/131).

## 1. Discovery (once per executable digest; fail closed)
- Eligible only for Z-machine version 5 or 8, with a decoded property table whose names include ik1_count and ik3_count (the D218 marker set).
- Forward-disassemble the code area (zdis rules, moved into a product helper only after acceptance). Find every instruction run in one routine of the exact shape:
  1. `X = RV__Pr(dirVar, P3)` or `get_prop dirVar P3`;
  2. `Y = get_prop roomVar P1`;
  3. `mul Y #ND`;
  4. `add`;
  5. `loadw #BASE sp`.

  P1 is the number the table names ik1_count. P3 is the number the table names ik3_count.
- The RV__Pr callee is accepted only if its decoded body matches the veneer pattern: get_prop for a property number below 64, else an address lookup followed by `loadw Lx #0`.
- All matching sites must agree on (BASE, ND, P1, P3).
- ND must equal the number of direction objects that carry ik3_count, with counters 0..ND-1 each used once.
- Any disagreement, absence, decode failure or unsupported version means NO decoder (today's behaviour).

## 2. Decoding (each collection generation; Map_Storage can change at runtime)
- For the structurally resolved current room R with ik1_count k: the cells are `BASE + 2*(k*ND + c)` for c = 0..ND-1.
- Column c is the direction object whose ik3_count == c.
- The label is that direction's canonical word (D217 rule). A custom direction such as Warbler's road (counter 12) gets its native command word, and its geometry is unknown (not drawn as a compass direction).
- Cell value 0: no exit.
- Cell value that carries ik1_count (a room): exit to that room.
- Cell value that is a door (has door_to; not executed): a door stub. The destination is unresolved until travel.
- Anything else: skipped and recorded as unknown.

## 3. Integration
- These are look-ahead exits only, for I7 builds where discovery succeeded. They never overwrite walked edges.
- D218 (I7 bookkeeping is not an exit) stays.
- D35 (numbered door_dir lane) and D217 are untouched.
- The disassembly result is cached per executable digest. Cell reads are cached per collection generation.

## 4. Tests
- Positive:
  - Warbler start room 51: n -> 56, s -> 53.
  - Room 56: ne -> 61, s -> 51, e -> 101.
  - Facility Lobby 45: n -> 48.
  - Reciprocity spot checks.
  - Native walks confirm at least one cell per title.
- Negative:
  - I6 titles and titles without the pattern: lookAheadExits unchanged.
  - A synthetic table with mismatched ND: no decoder.
  - A door cell: stub only.
- Guards: d23, d214-zil-exits, exit-calibrator, d218, m01.

## 5. Limits
- Proven on two titles. Other I7 versions may compile MapConnection differently; the decoder then stays off.
- The linear-sweep routine boundaries are cross-checked by a decoded call site for the key routine.
