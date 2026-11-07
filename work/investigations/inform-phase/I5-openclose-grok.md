# I5 finding 1: Open/Close by state (#6118), grok, 2026-11-06 ~23:05 EST
Read-only. Probe logs: grok-i5/openclose-run-1-*.txt. Earlier evidence: probe-run-1/3 and putron-run-1.

## Gating already exists
- js/ActionSynth.js:132-140 (authoredCommandAllowed, reached for attribute forms via :79) hides Open when open and Close when closed, but only when one of these returns a value:
  - AttributeSchema.containerStateAuthority (js/AttributeSchema.js:645, ZIL fact rules), or
  - containerOpenState (js/AttributeSchema.js:704-724). That needs owns("container") && owns("open"), i.e. declared Inform names (:714) or measuredFlagOwner (:225-241, a ZIL fact attributeMap with a validated family). It also needs the object's container bit to be set (:723).
- Observed:
  - Zork I trophy case and brown sack show "Open" without "Close" (putron-run-1). Gated.
  - School Days (exact names) trapdoor 162 shows Open and Close both when closed and after `open trapdoor` (openclose-run-1). Not a container, so not gated.
  - Lists door 19 and the no-names Godot box 17 show both (I5).

## Why both show
1. Non-container openables (doors, trapdoors) never reach a state answer: :717/:723 require container.
2. No-names Inform titles: the I1 TRUST open cells live only in investigation files and are not loaded by containerOpenState (owns() is false), so the result is null and both are shown.

## Recommendation: don't extend now (missing-over-wrong)
- Doors: a stale or mis-mapped open bit would hide the needed verb. The current both-shown state is safe. If wanted later: allow non-container openables only under a declared-names or validated-fact open bit, with no PROFILE inference.
- No-names I1 TRUST: TRUST was proven per cell and per title, not per object at runtime. Wiring it in means a new fact path plus a review. Not worth the risk for a harmless duplicate.
- No code change proposed.
