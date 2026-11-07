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
