# LGOP hole - proposal R1 (claude, 2026-10-31) - for four-seat attack, no code yet
Halves: claude-SEALED.md (blind) + codex lgop-revealed-hole-sealed.md; compare codex lgop-hole-sealed-compare-1122.md;
prerequisites prereq-measurement.md (SDESC = property 16, compiled P?SDESC=16; HOLE-OPEN = global var 160, 0 hidden /
1 revealed natively, source sole setter phobos.zil:643).
Problem: after the floor collapse, Cell describes "a black circle" (LOCAL-GLOBAL object 83) that the native game lets you
EXAMINE. The app never surfaces it: LGOP has no localScope fact, and localScopeObjects drops empty-name objects.

## First slice (codex's proposed boundary, adopted)
1. Per-title fact for the LGOP exact digest: `localScope {property: 15, holder: 40}` measured (Cell 50 prop 15 =
   [202,83,173]; 83's parent is 40), following the D232 procedure. Validated like other localScope facts.
2. A typed name source for empty-name local globals: `localScopeNames {property: 16, kind: "packed-string"}`. Used only
   when shortName is empty; the property must be exactly 2 bytes and decode to a valid string of dictionary words
   ("black circle"). Read live each time, since SDESC changes at runtime. If the name is invalid, the object is not admitted.
3. Visibility gate for object 83 only, as a per-title `localScopeVisibility` fact transcribing HOLE-INVISIBLE
   (globals.zil 1314-1321) as data:
   - in Cell 50, require global 160 != 0;
   - in Garden, require sod 183 attribute 12 set;
   - in Long Corridor, require global 144 == 3;
   - in other rooms listing 83, visible.
   Any malformed entry means not visible (fail closed).
4. Offer Examine only in this slice; it is natively accepted when revealed. Stand on circle (drops the player to the
   palace) and Enter/Look inside (routed to "go up") stay out until native replies are checked per room, since a wrong
   option is acceptable but must be honest.
## Validation
A constructed harness on real LGOP bytes covering hidden Cell (160 = 0: no mark), revealed Cell (mark + Examine),
Garden sod unmoved/moved, corridor 1/3, non-listed room, wrong digest, malformed facts, and other titles identical.
Native seeded: revealed Cell examine works through the app's radial; hidden Cell shows no mark. Then operator 13/0 and
a 309x2 gate.
## Prior guards
D232 local globals, concealed/INVISIBLE handling (the hole is not INVISIBLE-bit based), and the D248/D258 learned-data
stores (none touched).

## R2 (claude, adopting codex lgop-proposal-r1-review-1137.md)
1. Scope: exactly the agreed first slice. No general LGOP localScope fact and no general name source. A separate bounded
   descriptor, so the D232 localScope reader and its validated width/roomLitAttribute/invisible contract stay untouched
   for every title:
   `revealedLocalGlobal: { object: 83, holder: 40, room: 50, membershipProperty: 15, nameProperty: 16,
     nameValue: "black circle", gateGlobalSlot: 144, forms: ["examine"] }`
   on the LGOP exact digest only.
2. Global numbering: gateGlobalSlot is the zero-based global SLOT used by existing fact consumers (e.g. playerGlobal).
   HOLE-OPEN = Z-machine variable 160 = slot 144 (globalsBase + 2*144). The Long Corridor (variable 144 = slot 128) and
   Garden conditions are out of scope, because the slice is room 50 only.
3. Name: bound to owner 83 + exact digest + property 16 exactly 2 bytes, and the decoded packed string must EQUAL
   nameValue "black circle". This is a typed exact-value domain, not "any dictionary words", so a routine address or
   another runtime variant does not decode to that string and the object is not admitted. Any runtime SDESC variant
   would need its own authorized value; none exists for 83.
4. Integration: a separate consumer path admits object 83 into the room scope payload only when ALL of these hold:
   - the player's live room is 50;
   - room 50's live property 15 contains 83;
   - 83's parent is 40;
   - slot 144 is nonzero;
   - the name check passes.
   It is admitted as a discoverable object with only the listed forms (Examine). It does not go through
   localScopeObjects, so other local globals stay unexposed. If any check fails, nothing is admitted (unchanged).
5. Evidence correction recorded: the LGOP true object frontier is 228; object 238 was outside the table and is
   withdrawn from the census. The prerequisite decode routine is exploratory only, not a semantic census.
Validation: hidden Cell (slot 144 = 0) admits nothing; revealed admits 83 with Examine only; wrong room, malformed
descriptor, wrong digest, name mismatch, membership missing, and other titles all byte-identical; a native seeded
revealed-Cell radial Examine works; operator 13/0; 309x2.
