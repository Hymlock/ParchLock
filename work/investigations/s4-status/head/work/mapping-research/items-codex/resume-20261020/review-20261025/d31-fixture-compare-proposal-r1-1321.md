# D31 fixture comparison and bounded update proposal

Both sealed investigations agree: all8 baseline/candidate failures are obsolete one-action/first-is-Take assertions. Current accepted Oct20 inspect-first menu predates this batch (5c66ce3e), while D78 plain Take command and contextual label remain. ARCH4274 explicitly preserves this menu and baseline fixture failures; older ARCH839 only-Take wording is superseded. No product regression found and no product change proposed.

Change harness/d31-nested-inventory.js only, under exact claim. Update top fixture contract to distinguish ordinary Inspect-first menu from independent Take-only policy. For mock and RAM-backed nested lamp: require exactly two actions, first examine lamp, second command take lamp with verb take out of box. Preserve all existing Wear/Remove/Switch/Drop negatives, recursive visibility, parent IDs, disabled action, worn and ordinary room checks. For probe-only key require exactly Inspect then contextual Take, real take key command and take out of satchel label. For radial require both examine lamp and take lamp commands, exactly two non-Use-with verb slices in fixture, keep existing forbidden-action checks. Do not add generic count tolerance or alter runtime to remove Inspect/More.

Add one bounded fixture check disabling inspect through existing disabled-inspect lookup and verifying only contextual Take remains; restore the mock immediately. This guards the accepted existing independent Take-only behavior, not a new policy. All other tests unchanged.

After independent proposal consensus: implement current harness only, execute once on main baseline and exact copy on combined source; independent current-source audit before harness-only commit. No shared JS changes, full gate/native replay or APK needed. Root research logs and exact old failure set retained.

Final review wording correction: disabled-inspect fixture guards the menu branch only, not separate LearnedWords independent-provider policy. Implemented under exact claim;61PASS baseline/combined; Grok5486 current-source ACCEPT and mutation controls; committed23d6fd0.
