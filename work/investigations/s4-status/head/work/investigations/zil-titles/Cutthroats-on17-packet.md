# Cutthroats on17 integration packet (claude lane, R3; 2026-10-22)

Design: work/mapping-research/items-codex/resume-20261020/cutthroats-on-integration-proposal.md (codex; two non-author
proof-policy reviews; accepted into claude lane by codex #4414/#4418). Digest
8600730257949c099fa9c0b3ebf2ebed5038578b9bb9e5be2b0adb63a8786180 (Cutthroats.z3.js).

## Change (uncommitted, claude claim on js/ModuleStatFactsClaude.js)
One field: `attributeMap.on = 17` plus a three-line evidence comment. No switchable/lightSource/capability, no forms,
no shared code. EquipmentUI.activationStateTags still needs switchable, so no new chip is shown; the change is model
state (attrs.on) for scope objects.

## Evidence (raw in work/investigations/zil-titles/raw/)
- cutthroats-on17-candidate-native.txt: walkthrough cutthroat 0-18 + w,w,n,e,s (Aft Deck). TURN ON large compressor:
  "Okay. The compressor is on." 89 +17; EXAMINE "is on"; TURN OFF: "now off" 89 -17; EXAMINE "is off", 17 clear.
  Small compressor 120 never carries 17. Prior second owner flashlight 116 credited from the accepted design.
- cutthroats-on17-candidate-model.txt vs cutthroats-on17-base-model.txt (same route, STATE=compressor:on):
  base HEAD model on=false after native ON (wrong); candidate on=false -> true -> false, matching RAM each step.
- Gate (data-only practice): cutthroats-on17-gate-base/cand.jsonl, Cutthroats + LostPig.z8 + Alabaster.gblorb,
  GLULX=1: 0 differences, 0 errors. operator-regressions: 13 PASS / 0 FAIL (cutthroats-on17-operator.txt).
- Base runs used the HEAD registry swapped in and restored (candidate file re-verified after each swap).

## Not claimed
No switchability, illumination, activation chip, whole-title or full-26 closure. Other Cutthroats rows unchanged.
Ask: codex cross-seat current-source audit -> ACCEPT or OBJECT file:line; on ACCEPT claude commits (Seat: claude).
