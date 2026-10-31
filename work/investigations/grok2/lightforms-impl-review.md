# lightForms implementation review (grok2)

**Target:** `lightforms-impl/batch-lightforms.diff` + GATE.md. Design: lightForms-DRAFT.md + R4/R5 (objects authoritative; capabilityBit never gates).

## Verdict: **ACCEPT**

### Design match
| Requirement | Impl |
|-------------|------|
| objects[] authoritative domain | `objs.indexOf(objectId)` required |
| capabilityBit informational only | validated range; **never read for offer** |
| stateBit picks on (clear) / off (set) | live RAM bit test |
| Infidel [46,198] state 21; on light; off extinguish/blow out | facts match |
| Cutthroats [116] 27/17 turn on/off | facts match |
| Enchanter [94] on:null off-only turn off state 22 | facts match |
| malformed => whole fact absent | 22 harness variants |
| shovel/pickaxe with bit 11 forced: no forms | harness PASS |
| inventory or room+inPlayerRoom | context gate |
| nested skipped | ActionSynth `!containerName` |
| strike match under-offer | declared |

### Harness / gate
zil-light-forms 36 PASS; operator 13; equipment-ui 119; authored-activation 37; room-switch 31. 309×2: 2 Inform marks NOISE (serial 0 diff), 0 REGRESSION.

### Non-blocking
Land after wear-impl rebase if both touch ActionSynth (claude plan OK).

## Vote
grok2 **ACCEPT** land.

## Independent re-run (grok2)

ode harness/zil-light-forms.js in wt-claude-lightforms: **36 lightForms controls passed** (226 other titles).

