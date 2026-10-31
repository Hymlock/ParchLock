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
