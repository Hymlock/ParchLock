# E3: which slot the Inform player facts pin (V34 = global 18, not V69 = global 53)

Z-machine variable V34 is global 18 and V69 is global 53 (globals start at V16).

**Pinned slot:** every Inform 6 `playerGlobal` fact in js/ModuleStatFactsClaude.js uses 18
(Degeneracy, Cabal, Rameses, The Gostak, and the other mapzero titles). None uses 53.

**Why 18:**
- In every measured prompt of these titles, g18 = g53 = the player object (Degeneracy 157,
  Cabal 221, Rameses 24, Gostak 123), so prompt measurements alone cannot separate them.
- Bear and Dew Drops hold the player only in 18 (53 differs there), so 18 is the slot this
  library family uses for the player across titles. That is the deciding evidence
  (js/ModuleStatFactsClaude.js, Degeneracy comment above its fact).

**Known limit (not measured):** no directed-NPC test ("bob, go north") was run. If 53 is the
library's acting-object slot, it would leave the player only during an order, and 18 would
stay correct. If instead 18 moved during orders, the facts would follow the NPC for that turn.
Codex #2503 recorded this scope. A one-turn order in Cabal or Gostak would close it.

Docs only; no code change.

## Directed-NPC measurement (grok2, 2026-11-07) — closes open limit

**Title:** Cabal (`games/cabal.z5.js`), digest `5fe1406def45c0df…`, fact `playerGlobal: 18`.

**Method:** play.html headless; after boot settle, `look` / examine; then directed orders.

| Moment | g18 | name(g18) | g53 | name(g53) |
|--------|-----|-----------|-----|-----------|
| before orders | 221 | you | 221 | you |
| after `waiter, hello` (no parse) | 221 | you | 221 | you |
| after `man, go north` (vagrant dialogue opens) | **221** | **you** | **42** | **vagrant** |
| after further commands while menu open | 221 | you | 42 | vagrant |

**Result:** **g18 stays the PC** across a successful directed interaction. **g53 moves to the NPC** (vagrant 42) when the order is accepted into dialogue. Therefore pinning `playerGlobal: 18` (not 53) is correct for orders: following 53 would track the NPC for that turn.

**Evidence:** `work/investigations/e3-v34-v69/cabal-npc-order.json` (meta + before/mid); live console log of post-order snaps in session.

**No js/ change.** E3 open limit closed.