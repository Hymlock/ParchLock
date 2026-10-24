# D235 proposal R1 - LH nested food Eat when its open container is visible, not only held (claude, 2026-10-24)

Supersedes the held-only part of D228's container scope. Inputs: codex blind comparison lh-food-scope-compare.md
(sealed problem-only child + prior investigation), native packets #4742 (eat from open carton in closed oven), #4774
(eat from open carton on counter; closed carton hides food and Eat refuses), sweep MISSING "eat chinese food".

## Cause (agreed by both investigations)
AttributeSchema.edibleForms (js/AttributeSchema.js ~527 and ~573-576) returns [] unless context === "inventory",
and for a container scope also requires parent(container) === player and the food in payload.inventory. D228 chose
this deliberately; harness/zil-food-state.js lines 24/30 assert room/non-held rejection.

## Change
1. Context: accept "inventory" and "room" (and "object", if that is the room alias in this path).
2. Container scope `{containerObject, openAttribute}` (held scope unchanged):
   - object.parent === containerObject (unchanged)
   - container open bit set (unchanged)
   - REPLACE "container held + food in payload.inventory" by: the food is in the app's current visible scope, i.e. in
     payload.inventory OR payload.discoveredObjects (which already applies canSeeInside/transparent and local scope).
   No reach rule: native EAT succeeds through the closed transparent oven (#4742).
3. Everything else is kept: heat/quantity/consumed filters, Drink-only Coke, carton not food, malformed rules fail
   closed, held-scope rules (Coke 61, snack 18) still require held.

## Harness/fixture updates (harness/zil-food-state.js)
- "wrong parent or nonheld carton" splits: wrong parent stays [] ; carton on counter (parent 160, open, food
  discovered) now ['eat'] ; carton closed stays [].
- "room scope rejected" keeps Coke 61 (held scope) [] in room context; adds food 90 in room context with open visible
  carton -> ['eat'].
- New: food 90 not in discovered/inventory (closed container or not in view) -> [].

## Prior-fix guards to run
D228 harness (updated), D229/D230/D231 harnesses unaffected (no shared code), operator-regressions 13/0, three-engine,
one isolated 309x2 gate, native Actionable full menu: carton on counter open/closed, carton in closed oven open.

Not a whole-title closure. Other titles' container-scope food rules (Border Zone) follow the same code: their gate
rows must show no unintended change.
