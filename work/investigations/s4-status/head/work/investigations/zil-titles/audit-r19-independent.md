# Audit r19 (independent, read-only) - batch-r19.diff

## (A) js/ActionSynth.js D237 worn switch verbs - ACCEPT
- js/ActionSynth.js:345-348: filter keeps only /^(switch|turn) (on|off)$/ from `verbs`, which is the output of verbsForAttrs (line 332) for this same object. It adds nothing new; it only stops discarding on/off the object already earned.
- On/off forms enter only via the `switchable` key (rules.switchable line 8; formsForAttribute line 78 routes it through activationFormPolicy). A worn item with no switchable attribute produces no on/off, so cannot gain one.
- Inform worn switchable lamp: it already got on/off when held; keeping it when worn is correct (wearing does not stop switching). activationFormPolicy still applies, so per-object refusals/policies are preserved.
- Note: switch verbs are appended after container verbs; order only affects radial position, not short-tap (inspect stays first).

## (B) Door facts - ACCEPT (with one note)
- Cutthroats: 2026-10-11-zil-source-flags.json DOORBIT bit 25 exact (tp2 fp0 fn0: 177 bedroom door, 164 front door); OPENBIT 21. No other flag on 25. js/ModuleStatFactsClaude.js:59-60 map "door": 25 matches. Native r4-grok2/doorbit/Cutthroats.z3.js.json: 177 and 26 open-close-toggle false/true/false on bit 21; 164 locked-refusal; room key 143 negative. Evidence real.
  - Note: RAM bit-25 carriers also include unmatched 45 "door" (unprobed) and 223 (empty name, parent 0, not reachable). Harmless (45 is a real door name; 223 parentless), but 45 is unqualified natively.
- Border Zone: source-flags DOORBIT bit 45 exact (tp12 fp0 fn0); OPENBIT 34 exact; no collision (HUTBIT is 21). js/ModuleStatFactsClaude.js:388-389 "door": 45. door-border-qualified.json: positives 290, 328 toggling 34, negative seat 250 "Don't even consider it!", source bystander.zil:477,863; status still says "peer review pending" - this audit serves as that review.
