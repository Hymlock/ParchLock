# D12 compare + proposal R1 (claude, 2026-10-30)
Halves: claude claude-probe/hollywood-d12/FINDINGS.md (native + disassembly); codex
oct30-recovery/hollywood-blind/SEALED-findings.md (source handlers). Both were sealed before either half was read.
## Agree
- Explicit action-routine OPEN/CLOSE refusals: matches, holes, pond, cannon, projectors, niches. They have nonzero
  CAPACITY, so no data rule separates them. They keep the options: the game refuses honestly, and wrong is better than
  missing.
- Hopper 216: CAPACITY 8 and no action override, so it closes generically. Keep it.
- Plank ends: VEHBIT plus default CAPACITY 0. The generic V-CLOSE rejects them ("You can't close that!").
- Search/Look in/Empty are supported generically on CONTBIT. CANNON EMPTY is refused specifically ("too heavy"); the
  rest are not automatically wrong. Keep them.
## Codex adds
- The CAPACITY property binding must be compiled per title (a property number), not assumed.
- containerForms are held-only; room owners need the reviewed room scope (link to the P4 pattern).
## Proposal P12
Open/Close for a mapped ZIL container is offered only when the title's own generic V-CLOSE predicate holds:
(container AND NOT supporter AND capacity property != 0) OR door. Conditions:
- The predicate is a per-title fact `closeRule: {capacityProp: N}`, with N measured from the compiled property table and
  verified against the V-CLOSE disassembly. If absent, there is no change (byte-identical).
- The capacity value is read live from the object's property, falling back to the property default.
- It applies only to the Open/Close forms. Search/Empty/Look-in are unchanged.
- First title: Hollywood. The effect is that the plank ends lose close, and the mantle and other surfaces are already
  excluded. Generalising to other ZIL titles needs each one's V-CLOSE checked (sample until proof).
Validation: radial diff on Hollywood (only plank ends 8/68 lose Open/Close; hopper and mailbox keep them), operator
13/0, gate.
