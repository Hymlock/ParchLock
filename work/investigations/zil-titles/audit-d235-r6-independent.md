# Independent audit: D235 food-scope proposal R1 + r6 LH enterable (stand-in reviewer, 2026-10-23)

Read: food-scope-proposal-r1.md, batch-r6-enterable.diff, js/AttributeSchema.js 188-240 / 495-590 / 718-724,
js/ActionSynth.js 1-10, 68-130, 241, 271-332, 435-471, js/ZRamProvider.js 270-337, js/ZRamReader.js 236-275,
1855-1875, 2440-2490, js/WorldModel.js 470-530 (excerpts), harness/zil-food-state.js (grep hits), source-flags JSON
LH row (node). Did NOT read PRODUCTION_PLAN.md D228/D229 bodies or DECISION-INDEX (budget); flag if those add rules.

## Item 1 - D235: ACCEPT WITH REQUIRED CHANGES

Facts
- Only one container-scope edible rule exists in the whole facts file: ModuleStatFactsClaude.js:784 (LH 90 in 58).
  The proposal's "Border Zone follows the same code" is wrong: no other title changes. Gate impact = LH only.
- Context strings: callers pass only "inventory" or "room" (ActionSynth.js:99, 451, 469; 436 defaults "room").
  "object" is never used. Accept "room" only; do not add an "object" alias.
- discoveredObjects comes from ZRamReader.scopeObjects(loc, depth 2) (ZRamProvider.js:275-286): current room only,
  rebuilt each snapshot, recursion gated by canSeeInside (ZRamReader.js:2484; open||transparent container, supporter).
  So a closed opaque carton hides 90 (good), closed transparent oven shows open carton contents (matches #4742).
  It also contains D232 local globals (ZRamReader.js ~2488) - irrelevant to 90 but means "discovered" != "reachable".
- Depth limit: room->X->carton->food is reached; room->counter->oven->carton->food (4 levels) is NOT. Fail-closed,
  but must be checked natively for the actual oven placement or the oven case silently stays missing.
- Payload is read from WorldModel.lastPayload while parent/open bits are read from live mem (AttributeSchema.js
  ~573-576). After OPEN/CLOSE/TAKE the payload may lag a turn; old code had the same lag, acceptable, but the
  live-mem checks (parent===58, open bit) must stay so a stale payload cannot alone grant Eat.
- Dark room: not verified that ZRamProvider empties discoveredObjects in darkness; needs a negative (below).

Defects in the proposal
1. "or object" context - remove (no such caller).
2. Must not drop "parent.parent !== player" without keeping the live-mem open + parent checks; the membership test
   must be by id in the CURRENT payload (inventory OR discoveredObjects), and room context must require membership
   in discoveredObjects specifically (inventory context in inventory) so a held carton isn't double-sourced oddly.
3. The general context gate at AttributeSchema.js:527 currently rejects all non-inventory contexts for every rule;
   loosening it must keep held-scope rules inventory-only (Coke 61, snack 18).

Concrete shape (AttributeSchema.js edibleForms)
```js
if ((context !== "inventory" && context !== "room") || !ids || !header || ...) return [];   // line ~527
...
if (selected.scope === "held") {
    if (context !== "inventory" || object.parent !== player) return [];
} else {
    var parentId = selected.scope.containerObject, parent = ZRamReader.objectLinks(mem, parentId);
    var payload = typeof WorldModel !== "undefined" && WorldModel.lastPayload;
    var list = payload && (context === "inventory" ? payload.inventory : payload.discoveredObjects);
    if (object.parent !== parentId || !parent || !ZRamReader.attr(parent, selected.scope.openAttribute) ||
        !Array.isArray(list) || !list.some(function (o) { return o && o.id === objectId; })) return [];
}
```

Harness changes (harness/zil-food-state.js)
- L31 "room scope rejected": keep A.edibleForms(mem,61,'room') -> []; add 90 room positive (carton 58 on counter 160,
  open, 90 in payload.discoveredObjects) -> ['eat'].
- L23 closed-parent check: keep; add room-context variant (carton closed -> [] even if a stale payload lists 90).
- Split the "wrong parent or nonheld carton" check: wrong parent -> []; nonheld open discovered carton -> ['eat'].
- New negatives: (a) 90 absent from discoveredObjects (other room / not in view) -> []; (b) 90 listed in payload but
  live parent != 58 -> []; (c) context 'object'/undefined -> []; (d) held-scope 61 in 'room' -> []; (e) dark room
  (payload.discoveredObjects emptied) -> [] if provider empties it - verify, else document.
- Native: carton on counter open/closed, carton in closed oven (confirm depth <= 3 or record as missing).

## Item 2 - r6 LH "enterable": 29: ACCEPT (fact) with two disclosures

- Source flags (2026-10-11-zil-source-flags.json, TheLurkingHorror.z3.js): VEHBIT bit 29, exact, tp 7 fp 0 fn 0,
  examples 197 forklift, 194 slab of granite, 219 pentagram. No other flag on 29 (CONTBIT 27, PERSON 31, TAKEBIT 24).
- attributeMap row values 13,13,27,8,31,15,5,2 - 29 collides with nothing.
- Consumption: AttributeSchema.bitFor (js/AttributeSchema.js:205-211) returns map value for ZIL; enterable is in the
  zilStructural fail-closed list (230), so today LH has NO enterable bit; after the change carriers get
  ActionSynth.rules.enterable = ["enter","exit"] (ActionSynth.js:7) via SEMANTIC_FLAGS (241), in room and inventory
  context alike - Exit is offered even when the player is not inside (pre-existing generic behaviour).
- D57/D75 room logic: the enterable checks in ZRamReader.enclosingRoom (236-275) are on the Inform branch only; the
  ZIL branch returns the parent if it has a short name and never reads enterable. No player/room change from this bit.
Disclosures required in the commit note:
1. Native proof covers chair 62 and forklift 197 only; the other 5 carriers (incl. slab 194, pentagram 219) get
   Enter/Exit unproven. The source-flags examples do not list chair 62 - confirm 62 is in the 7 (FURNITURE bit 0 is a
   separate flag) before citing it as a VEHBIT carrier.
2. Exit is offered on every carrier whether or not the player is inside it (generic rule, not new to LH).

## Item 3 - Zork III localScope roots-only: ACCEPT with one evidence gap disclosed

- Row ModuleStatFactsClaude.js:99/115: {property 7, width 1, holder 221, roomLitAttribute 15, invisible 28}, no contents.
- Source flags (Zork3-TheDungeonMaster.z3.js): INVISIBLE bit 28 exact tp5 fp0 fn0; ONBIT bit 15 exact tp27 fp0 fn0
  (examples include 64 Endless Stair).
- ZRamReader.localScopeObjects (js/ZRamReader.js:2366-2418): without contents only lit+invisible bits are required
  (2374-2376); roots admitted only when links.parent === holder (2408); contents() never runs (2412). Correct.
- Native JSON (work/mapping-research/items-codex/r3-20261022/Zork3-TheDungeonMaster.z3.js/local-roots-native.json,
  produced by resume-20261020/zork3-local-roots-native.cjs): Endless Stair 64 roots [216 stairs], EXAMINE STAIRS
  succeeds, EXAMINE CLIFF "can't see"; Cliff 58 roots [57 man, 215 rubble, 75 stone wall, 56 cliff], EXAMINE CLIFF
  succeeds, EXAMINE STAIRS "can't see". Two rooms, reciprocal negatives: confirmed. All roots parent 221, none INVISIBLE.
- GAP: the "dark" row is room 63 with roomLit15 false but roots [] - room 63 has no property-7 roots at all, so it
  does not prove the lit gate suppresses anything. It is a dark/lit pair, not a dark negative for the gate. Also no
  root with INVISIBLE 28 set was exercised. Both gates are source-exact and fail-closed, so low risk; disclose as
  "lit/invisible gates source-proven, not natively exercised" rather than claiming a native dark negative.
- Note Cliff now discovers "man" (57) as a local global - check the player-visible underline is intended there.
