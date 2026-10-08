# Proposal: underlining an item an NPC visibly holds (Treasures TWO-HANDED SWORD)

claude, 2026-10-09. A follow-on to D214, an original operator report.

Inputs:
- the operator screenshot (Old Stone Bridge: "She hefts an impressive
  green-metal TWO-HANDED SWORD");
- codex #1938, #1939, #1941 and #1943;
- D57/D68 (actor contents never leak into room scope), D206 (actors
  discoverable, no TAKE on people) and D24 (only what the game printed).

## Facts

- Treasures object **124**, aliases `two-hand`/`sword`, is a DIRECT child of
  the Lizard Maiden **123**. It is not concealed and not nested, and it has no
  children.
- Native EXAMINE TWO-HANDED SWORD is accepted (codex), so the object is
  parser-visible.
- The restored LOOK and EXAMINE MAIDEN do not print it. The first-encounter
  description does ("hefts an impressive green-metal TWO-HANDED SWORD").
- The player's own GLADIUS SWORD (56) shares the word `sword`. Codex: a
  generic "sword" must not promote 124.
- **D57/D68:** `ZRamReader.scopeObjects` never recurses into an animate
  child. This is why Anchorhead's unnamed "(self object)" player and wump2ka's
  randomised animate "CustomPlayer" prop holding a "Glow Bar" stopped leaking
  into room scope. That rule must stay exactly as it is.

## Proposed rule (P1), Actionable-side and room scope untouched

A **visible-possession candidate** is admitted for marking only when ALL of
these hold:

1. **Actor.** Its parent A is an animate object currently in scope (a
   discovered object or a promoted unnamed candidate), directly in the current
   room, and is not the player, the inventory root or any confirmed holder.
2. **Direct child only.** `parent(C) === A`. There is no deeper recursion. C
   is not concealed, not hidden by the module fact `inventoryHiddenAttribute`,
   and not worn-hidden.
3. **Distinguishing vocabulary printed in THIS turn's admitted text** (the
   latest reply or the current room description, via the D214 U2/U3
   observation). The matched alias must be distinguishing: under
   dictionary-key equality it is not a vocabulary word of any other in-scope
   or held object. `two-hand` passes; `sword` (shared with the held gladius)
   does not.
4. **Re-validated every tick:** A is still in scope, and `parent(C)` is still
   A. If either fails, the mark is staled through U1's owner check.

**Presentation:** C is marked with `possessedBy: A`. The radial offers
examine only, plus any existing actor-directed forms the provider already
certifies. There is no take, drop, use or give-to inference (D206). It never
enters inventory, room `discoveredObjects` or the map.

**Lifetime:** from then on it follows D214 U1 (the mark follows its word;
restore, restart and a new story clear it).

## Out of scope

- No change to `scopeObjects` or `walkVisibleDescendants`.
- No recursion into actor contents.
- No naming from compiler aliases.
- Nothing for actors not in the current room.

## Ownership

- **Codex:** Actionable (it owns the D214 candidate pool and marks).
- **Claude:** the docs (a D214 amendment, or D215) and the independent
  audit.

## Proof

- **Positive:** Treasures, new-game `north` to the Old Stone Bridge. The
  first-encounter text marks TWO-HANDED SWORD to object 124. The radial is
  examine-only; there is no TAKE.
- **Negatives:**
  - "examine sword" (printing only GLADIUS) never promotes 124;
  - the restored-save LOOK, which does not print the sword, gives no mark;
  - Anchorhead: the player's held and worn items never appear as NPC
    possessions;
  - wump2ka: the CustomPlayer Glow Bar is never marked (D57/D58);
  - a concealed or hidden child is never marked;
  - a nested grandchild is never marked;
  - after a restore the mark is cleared.
- **Existing suites:** underline-lifetime, d201-unnamed-identity,
  command-disambiguation, d170.
