# Final open ZIL cells - disposition proposal R1 (claude, 2026-10-31; three-seat rule: codex + grok + claude)
Open at HEAD 136fd89f: L:U 7, N? 1, Sherlock B 14. Vote per row (ACCEPT/REVISE) in FINAL-DISPOSITIONS-VOTES-<seat>.md.

## Wear cells (L:U 7)
| cell | proposal | basis |
|---|---|---|
| Infidel clothing, wearable | L:S covered by wearForms (D259: ring 2, owner-scoped Wear; Remove via wornAttribute 22) | there is no static can-wear WEARBIT; capability is per owner, from native evidence (grok2 R2 packets, grok ACCEPT #5879) |
| LH clothing, wearable | L:S covered by wearForms (gloves 203, boots 104) | same |
| Starcross clothing, wearable | L:S covered by wearForms (suit 144) | same |
| Suspended clothing | L:S covered by wearable 31 (clothing follows wearable, #5185) | grok2 R2 packet; grok ACCEPT with wording |
## LGOP concealed (N?)
| LGOP concealed | L:NA (bit sense): the hole's visibility is routine-based (HOLE-INVISIBLE / HOLE-OPEN global), handled by the bounded revealedLocalGlobal fact (LGOP R3, three-seat ACCEPT) | concealed is a hide/reveal BIT key; no INVISIBLE setter/toggled carrier (grok2 R3/R4) |
## Sherlock (B 14)
| cell | proposal | basis |
|---|---|---|
| concealed | L:NA (claude packet; grok ACCEPT) | reveal is by MOVE; FL-NODESC is list-only |
| inventoryHiddenAttribute | L:U (grok REVISE adopted) | held-NODESC is reachable via the Lair double-tie + untie/cut rope (places2:718, things2:1886); native INVENTORY-omit proof not run; do not map 32 yet |
| switchable | L:NC: the lamp is served by lightForms {166, state 38} (claude packet; grok ACCEPT); FL-LAMP 42 is only the parser default for EXTINGUISH | no switchable consumer needed |
| light | L:NC (key-level D247: heuristic key; FL-LIGHTED 38 is lit STATE) | same as the 18 other titles |
| visited | L:NC unless FL-SEEN proves a remote-described room domain (Sherlock has FL-SEEN as well as FL-TOUCHED); claude to check FL-SEEN setters before final | key-level visited rule (navigation supplies visited) |
| static | L:S static = 26 FL-TRYTAKE (grok2 PACKET-static-trytake-26.md: source exact 79/79; sofa/mantelpiece bit 26 set and take refused; pound note/pistol/knife clear and takeable) | same key semantics as other titles' static = TRYTAKE |
| openCapability | L:NA: Sherlock maps openable 44 (FL-OPENABLE) directly; the openCapability container heuristic is not needed | r49 openable |
| absent, general, lockable, scored, workflag, male, neuter | L:NA: Sherlock's 44 FL-* flags (sherlock-source-flags.json) contain no counterpart; semantic check done against the full flag list (FL-KEY is key-ness, not lockable) | same as the other ZIL titles |
