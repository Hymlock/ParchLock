# Three pre-existing guard failures: claude sealed findings

These fail identically on b747e42 (before D214), verified in a clean worktree
with all 309 game files copied. The operator wants them treated as real
issues, "especially the random enemy considered an item".

## E1: d201-unnamed-identity, "random enemy considered an item"

- **Fixture** (harness/d201-unnamed-identity.js:138-143): it picks the first
  LLR3 `unnamedCandidates` item whose `attrs.takeable` is true. Inform derives
  takeable from !static && !scenery, "which also describes people" (D206 note
  in ActionSynth.commandsForObject), so a random goblin, yeek or gnome
  qualifies.
- **Product behaviour is correct:** the enemy's radial does NOT offer TAKE
  (D206 "no Take on people"). That is exactly why the "radial includes
  declaration-proven TAKE" check fails, and why "take goblin" then never puts
  it in inventory.
- **Finding:** a test-fixture defect, not a product defect. The fix is in the
  harness: exclude `attrs.animate` (the product's own predicate) so the
  fixture picks a real generated item, which is its stated intent ("a
  takeable generated object"). This is not a weakened assertion: all four
  checks stay.
- **To verify:** no product surface treats these enemies as items
  (inventory, Equipment, the "items" list, map).

## E2: d22-holistic-scope, wump2ka and zblorb "zvm live but scope 0"

Not yet investigated.

## E3: d31-nested-inventory, "RAM-backed worn cloak" does not suppress drop/wear and offers no remove

Not yet investigated. Possibly the worn-bit owner precedence (one owner per
executable: declared > fact > learned > Inform 26) versus the fixture's
RAM-backed cloak.

## E2 (measured): d22-holistic-scope, wump2ka and zblorb "scope 0", both test defects

- **wump2ka:** the harness sends only "look". wump2ka first asks "Would you
  like to restore a saved game?", so "look" answers that question and there is
  no room yet (roomName ""). Every other wump2ka harness answers "no" first.
  It is a route defect.
- **zblorb:** the first `*.zblorb.js` alphabetically is Accuse. Its Hall has
  NO named objects. The rusty knife arrives as a D184 unnamed candidate
  (`61:rusty/knife`) and IS underlined ("rusty knife", plus east/south/up).
  The harness counts only `discoveredObjects`/`probe.scopeCount` and predates
  the D184 candidate path. It is a stale test oracle.
- **Fix (harness only):** answer "no" for wump2ka, and count
  `unnamedCandidates` (or underline marks with data-object-id) as scope. The
  product is correct.

## E3 (measured): d31 worn cloak, a regression of the TEST against this session's worn-owner contract

- The fixture builds a synthetic Uint8Array story and marks the cloak worn with
  bit 26 (the Inform default), but writes no compiler stamp.
- The worn-bit owner precedence (declared > module fact > learned > Inform 26
  only if `isInformCompiled`) now treats the image as an unknown compiler, so
  worn is null and drop/wear are offered.
- **Proof:** a scratch copy adding the Inform 6.31 header stamp (0x3C-0x3F)
  gives 60/0.
- **Fix:** the fixture declares itself Inform (the stamp). The product is
  correct; real Inform stories carry it.
- **Lesson** (the operator's "one fix breaks previous fixes"): the worn-owner
  change should have run d31. It is now on the guard list for any worn or
  attribute change.
