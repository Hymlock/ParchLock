# Lurking Horror held-food consumer: comparison (claude, 2026-10-22)

Inputs: claude blind (unexposed subagent) work/investigations/zil-titles/lurking-food-claude-blind-SEALED.md;
codex sealed work/mapping-research/items-codex/resume-20261020/lurking-food-consumer-investigation-SEALED.md.

## Agree
- Coke = object 61, held (parent 56), bits [1,2,6,24], after the retained lurking route first 61 + INVENTORY.
- App menu and independent forms offer no Eat/Drink before or after.
- Source: COKE has FOODBIT; V-EAT (verbs.zil:614) needs FOODBIT + HEAT; COKE-F handles DRINK separately.
- No edible owner in the Lurking registry block (no attributeMap.edible / attributeObjects / capabilityForms).
- Cause: semantic capability absent, so ActionSynth.trustworthyAttrs gates edible off for ZIL; Drink for ZIL exists only
  as an authored pair (D150 inference is Inform-only). Fix must not accept raw attrs or a blanket FOODBIT map.

## Codex adds (claude blind did not establish)
- FOODBIT is bit 1: native EAT tests 61:1 TRUE (claude left 1/2/6/24 unresolved).
- EAT COKE "It tastes cold." leaves the Coke held with the same flags: NOT consumption, and not a DRINK success.
- Other bit-1 owners observed: package 18, carton 58, Chinese food 90; CARTON-F intercepts EAT and points at contents.

## Claude adds
- Native DRINK COKE succeeds with the caffeine/alertness message (COKE-F SIZE decrement); codex records it from source.

## Gaps to close before a proposal
1. Bounded census of the bit-1 domain (who really owns FOODBIT in the compiled table), not an exploratory list.
2. Per owner, which forms the game accepts natively: Coke Eat (non-consuming taste reply) vs Drink (effect); carton
   (EAT intercepted -> contents); Chinese food own handler; package 18 unqualified.
3. Native refusal controls for held non-food objects (EAT and DRINK).
4. Whether a non-consuming EAT ("tastes cold") should be offered at all (useful-consumer question for the operator rule
   "visible impact"), vs Drink only for the Coke.

## Proposal owner
Lurking Horror is in codex's R3 lane; codex writes the proposal from both findings, claude reviews adversarially.
Implementation, if any, reuses the Border Zone authored-pair mechanism only if the domain fits; the registry write
stays with claude.
