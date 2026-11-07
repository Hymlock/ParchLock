# Q1 Edifice rock: compare (step 2) + proposal (step 3) - claude
## Compare: SEALED-claude.md vs BLIND-grok2.md - full agreement
Both: the story swaps the player body (27 "(PrimitivePlayer)" -> 57 "(HungryPlayer)"); the rock follows (parent 27 -> 57); the app resolves
player 20 "(self object)" (parentless, childless) via resolvePlayer's named-player rung, so payload inventory walks the wrong root.
grok2 adds: confirmedInventoryRootId can surface 27 early, then goes stale. Claude adds: globals G18 and G53 hold 27 at boot and 57 after
the swap (and G21=27 / G40=27 are not player slots); resolvePlayer returns {id:20, source:"named-player"} at every step.
## Proposal: exact-digest playerGlobal fact (D216 Degeneracy / D273 precedent; no generic rule)
ModuleStatFactsClaude["3fbef240e62dc6fb259109406c1a228aa41bd2c83ecc8a3f34575463d863f"] = { playerGlobal: 18 }.
ZRamReader reads the slot live each call (ZRamReader.js:2235), so the root follows 27 -> 57. Generic promotion stays rejected (D216: companions
can share globals). Evidence to attach: native INVENTORY at boot / after take / after the swap lists exactly the children of g18's object;
g18 = g53 at each measured prompt.
Also check: the blank initial map in Edifice (ParchLockMap.CurrentRoom "" until first travel, grok QA #6269) - may share the cause (player 20
has no parent, so no room). Verify after the fact; Masquerade gets its own check.
Guards: D216/D220/D273 harnesses, operator-regressions, gate on edifice + Degeneracy + guess + yagwad.
