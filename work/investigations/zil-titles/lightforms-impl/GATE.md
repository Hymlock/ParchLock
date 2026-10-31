# lightForms implementation — GATE (claude, 2026-10-31)

Worktree `../wt-claude-lightforms` at 22fb9fc3 (real copies of games/ node_modules, 0 reparse points). Diff: `batch-lightforms.diff` (js/ActionSynth.js, js/AttributeSchema.js, js/ModuleStatFactsClaude.js, new harness/zil-light-forms.js). `git apply --check` passes on root HEAD c9f1bfc6. Not committed.

Design: grok2 lightForms-DRAFT.md sha 76e755d4...; codex-votes-0231 + lightforms-r4-adversarial-review; grok-review-lightforms-draft.
- Facts: Infidel {cap 11, state 21, objects [46,198], on default "light", off 198 "extinguish" / 46 "blow out"}; Cutthroats {cap 27, state 17, [116], turn on / turn off}; Enchanter {cap null, state 22, [94], on null, off 94 "turn off"}.
- AttributeSchema.lightForms: exact executable fact (digest + executableLayoutFacts), not Inform, validated confirmed-zil-family, v3-5; strict shape (only known keys; stateBit/capabilityBit in range; objects non-empty unique ints 1..objectCount; on/off null or plain object of default/owner-id -> lowercase 1-2 word verb; not both null). Malformed => null (absent). capabilityBit validated but never read for gating. Owner only; context inventory, or room with inPlayerRoom; live stateBit picks off (set) / on (clear).
- ActionSynth.lightFormsFor + commandsForObject: additive verbs (dictionary-literal gated), skipped for nested held items.
- Infidel "strike match", other match objects: declared under-offer.

Validation (candidate worktree):
- harness/zil-light-forms.js: 36 PASS (owners by state; shovel 33/pickaxe 37 with bit 11 forced: none; cap bit cleared on torch still offers; room scope in/out; Cutthroats key 143/watch 6 none; Enchanter unlit none / lit turn off / candle 204 none; 22 malformed variants = all-object menus identical to no fact; wrong digest / unvalidated family absent; non-owners identical; 226 other Z titles lightForms null for every object).
- operator-regressions 13 PASS / 0 FAIL; equipment-ui 119/0; zil-authored-activation 37; zil-room-switch 31.
- 309x2 gate (gate-parallel.sh N=8 GLULX=1, base worktree at 22fb9fc3): 2 differences, jet.z8.js and vespers.z8.js marks. Both NOISE: non-target z8 titles (lightForms returns null without a fact); serial rerun base vs cand of those two = 0 differences, and base serial vs base parallel itself differs on vespers. Classification: no walk-visible change, 0 REGRESSION.
