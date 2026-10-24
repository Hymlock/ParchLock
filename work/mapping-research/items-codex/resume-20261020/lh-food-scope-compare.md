# Food room-scope investigation comparison

Root native findings sealed in combined-r4-r2-consumer-audit-food-residual.json, d233-verb-reach-native.json and lh-food-room-carton-native.json before the clean-context independent investigation returned. Preliminary scope-extension direction had already been shared with lead; no implementation exists. This comparison precedes a formal design/implementation decision.

Independent child lh_food_scope_blind received problem statement only, read no root findings/bus/checkpoint, and sealed source-only findings in lh-food-scope-independent-SEALED.txt (SHA256 c15c7a1de99235036123a508812bc37135a06c5d6df10f44a004e1dd13ef7294). Its broad initial read was truncated; bounded D228/D229/ARCH85 checks were subsequently performed. It does not claim native reproduction or whole-document review. Separate old zil_food_independent explicitly disclosed prior exposure; its native dropped-carton result is corroboration, not blind evidence.

Agreement: AttributeSchema.edibleForms rejects non-inventory context at528, then requires named carton58 held by player and food90 in inventory at573-575. Food identity and reference exist; this is applicability, not absent FOODBIT or ambiguous noun. D228/ARCH85 intentionally documented held-only; harness/zil-food-state.js24 and30 enforce it. Native room-counter and closed-oven/open-carton Eat successes establish a new legitimate scope; closed carton hides/refuses food.

No contradiction in findings. Gaps: independent blind child source-only; no general claim every room/container/food is edible. Current native food proof concerns sole owner90 in named carton58. Source provenance remains adjacent revision, not exact recompilation.

Prior-fix guards: D78 plain Take wording; D148 visibility and no hidden-content revelation; D150 no inferred ZIL Drink; D201 reference/examineOnly; D228 snack heat/eaten, Coke quantity/Drink-only, carton exclusion; D229 independent open-state filtering; D233 current parent reach semantics. Revise only a named measured scope with explicit schema keys, source/consumer review, native room/held/closed/consumed controls and existing X-only fixture expectations updated deliberately. No blanket removal of context/custody checks.

Next: lead formal proposal checked against PLAN/ARCH and this comparison, adversarial review/consensus before code. Freeze r5 unchanged; no catalog restart for this pending extension.
