# Sherlock inventory: independent non-blind source investigation

Disclosure: the full-history fork inherited the parent's already sealed findings. This is a separate adversarial source investigation, **not a blind half**. No parent pocket report or native artifact was opened; no native replay, shared-source edit, or test verdict is claimed here.

## Source findings

`verbs.zil:4001-4057` V-INVENTORY temporarily removes TH-POCKET from its actual location before printing either worn or held groups. It prints the pocket's contents in a separate section **only when TH-WATSONS-COAT has FL-WORN and the pocket is nonempty**, then restores the pocket to the saved location. This means ordinary generic container recursion cannot model inventory by itself: the pocket is deliberately absent from that recursive walk during native INVENTORY.

`verbs.zil:3739-3765` RT-PRINT-CONTENTS-1 does restore NODESC holders and recursively call PRINT-CONTENTS-3 on see-inside children. That proves a label-only suppression policy for ordinary holders, but does not override V-INVENTORY's temporary removal of the pocket. The later explicit V-INVENTORY general-recursion block is commented; the existing PRINT-CONTENTS-1 recursion above is live. Neither “all recursion disabled” nor “unconditional recursive pocket listing” is justified.

`things1.zil:518` TH-POCKET starts in TH-WATSONS-COAT, NODESC+CONTAINER+OPENED; coat at887 is CONTAINER+OPENED+WORN. Lapel at896 is another NODESC container under the coat. A source claim that pocket is the only relevant NODESC holder must account for lapel becoming nonempty during play, not merely its initial childlessness.

`boot.zil:11` RT-SEE-INSIDE? depends on surface/container-open/transparency (plus NPC special handling), **not worn coat state**. Thus canSeeInside alone cannot supply the missing native INVENTORY condition. `parser.zil:1722+` treats pocket specially in held/accessibility logic. Display omission is not proof that pocket contents are parser-inaccessible.

## Current consumer and prior contracts

ZRamReader.walkVisibleDescendants at2925+ applies hiddenRecurses as a generic hidden-holder traversal switch. It has no coat/pocket condition; fact true therefore cannot express the native entrypoint. D244/D1 explicitly matches native inventory while suppressing only hidden labels; D249/P16 distinguishes label lists from scope sets. D31/D53 preserve nested immediate parent IDs; source temporary MOVE/REMOVE operations inside INVENTORY are not permission for the app to rewrite persistent custody.

## Minimal safe proposal direction (not implementation consensus)

Keep the qualified FL-NODESC32 semantics and existing generic recursion for ordinary visible descendants. Add a bounded exact-executable **inventory display** policy for the separately printed pocket domain, sourced from native V-INVENTORY: pocket287/coat302/player232 and current FL-WORN34 determine whether pocket descendants are inventory labels. Validate exact facts, current tree identities/custody, true object bounds, family and state; do not infer capability or change physical parent IDs. Closed/opaque visibility and ordinary per-child hidden/invisible rules remain stronger.

When pocket descendants are absent from native inventory labels, do not automatically remove them from all parser/discovery/action scope: first establish the existing consumer's labelSuppressed contract and whether it can safely carry accessible nested descendants without synthesizing generic commands. An alternative separate inventory-label projection may be smaller than changing the shared walker. A one-key false/true switch alone cannot meet both contexts. Exact proposal must list affected consumers and prior guards before code.

Required focused cases: worn/unworn/reworn coat; note removed from pocket to direct custody; pocket empty; pocket/coat moved outside player's custody; hidden pocket own label stays omitted; visible contents of a non-pocket hidden holder (lapel if naturally reachable) are not incorrectly suppressed; childless held hidden rope remains omitted; closed/opaque holder rule and More preserved. Source assertions are not new native passes.

## Binding

Source cache is parent's pinned historicalsource/sherlock snapshot; exact compiled-source identity is not newly proven by this investigation. SHA256:

- ZRamReader.js: da89f11f5c0e7fb4c9200e7f4c8e7caa2989f63aeb016fb4a3523769add1a260
- ModuleStatFactsClaude.js: 81b5889cd56c273bb9a085715f0572116160dbbf2c65ec1c08043ae9b0be626f
- verbs.zil: d3607268b31946e5065a06b36eca2235bf77f35fbf008d90973b9adc3f936723
- boot.zil: cf194f94a0ad212883c6cc5172757d5223867881530f02e5ec21a6c63edbbda5
- parser.zil: a36a03cf4e2e846fe9bf5133257066374505ea1fb1d09a49df5654be4911a515
- things1.zil: 8f48e0e8762c5a776d3a16efe977efee8d425b5cb8b929325c6b9b174bf850c4

Verdict: **REVISE the unconditional recursive inventory proposal**, narrow display-policy proposal needed. No runtime implementation acceptance, native-accessibility claim or overall title completion.
