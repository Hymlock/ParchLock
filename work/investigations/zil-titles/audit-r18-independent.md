# Audit r18 (independent, read-only): batch-r18.diff

| Title | Fact | Verdict |
|---|---|---|
| Starcross | switchable [71], forms turn on/off (js/ModuleStatFactsClaude.js:568-569) | ACCEPT |
| Stationfall | switchable [141] (js/ModuleStatFactsClaude.js:415-416) | ACCEPT, with a gap that players will see (below) |
| Moonmist | switchable [153] (js/ModuleStatFactsClaude.js:524-525) | ACCEPT |
| Wishbringer | door 2 (js/ModuleStatFactsClaude.js:103) | ACCEPT (r16 objection resolved) |

## Switch rows
- Starcross: grok1/switch/starcross.json shows the tape library 71 turning on and off, plus "already off", with bits [16,27,29] unchanged. The state is the global TAPE-ON (actions.zil:811 cited), so leaving out activationState/on is correct. The negative case is the bunk refusal.
- Stationfall: stationfall.json, step 109: "turn on lamp" sets 26 and 30, and "turn off" clears them. "turn on kit" gives the refusal "You can't turn that on.". ACTIVEBIT 26 is shared with Floyd 26 and the presser, and ONBIT 30 with about 100 rooms, so having no `on` mapping is correct.
- Moonmist: lantern 153 sets and clears bit 10 (`on` 10 is already mapped). Nightlamp 164 is fixed and excluded. This is consistent.

## Consumers
- AttributeSchema.activationForms (js/AttributeSchema.js:382-406) returns ["turn on","turn off"] only when all of these hold: context === "inventory", the id is in objectCapabilityIds, and the family grammar has turn+on/off. In every other case it returns []. A room context therefore gets no switch forms, which is the intent.
- activationStateAllows (js/AttributeSchema.js:596-613) returns false because there is no activationState. EquipmentUI.activationStateTags (js/EquipmentUI.js:224-231) then shows no active/inactive tag. This is intended, and no other consumer changes.
- ActionSynth.formsForAttribute (js/ActionSynth.js:78-81) and projectGeneratedActivation (:122-128, applied at :167) turn the base switch forms into "turn on/off" for a held item. This works for held items.
- **Stationfall gap:** when the item is worn, ActionSynth.js:337-345 replaces the inventory verbs with [examine, remove] plus container verbs only. The evidence row has bit 21 (worn) set, and "You are wearing a headlamp". As a result, the headlamp radial offers no Turn on/off while it is worn, which is its normal state. Nothing breaks and nothing wrong is shown, but the fact has no visible effect until the headlamp is taken off. A follow-up fix would keep activationForms for a worn item, analogous to the Knapsack container exception. I treat this as a follow-up and not a reason to block, because the row is correct. The Starcross tape library can also be worn (WEAR requires TAPE-ON), and the same gap applies.

## Wishbringer door 2
- The current r4-grok2/doorbit/Wishbringer.z3.js.json has `ok: true`. The toll gate 190 (North of Bridge) and the stump 19 (Underground) each go open false -> true -> false on OPENBIT 25. That is two strict toggles.
- The negative case is small stone 158, "How can you do that to a small stone?". This is a refusal from the game's verb handler, not a parser reply. It replaces the r16 parser-level negative ("can't see any instrument"), so the r16 OBJECT is resolved. One nit: the file's `note` field says "open coin" while the record shows the stone. The note is stale text and does not affect the evidence.
- Source: DOORBIT bit 2 exact, 15/15 (2026-10-11-zil-source-flags.json). The census lists 18 bit-2 carriers in RAM. The stump is source DOORBIT and is shown to open, so it is a legitimate door.
- Extras: the circulation desk 73, chain 204 and glass case 235 carry bit 2. At most they gain door Open/Close offers, which the game refuses or handles. This is the same harmless class as the Enchanter and Sorcerer gates in r16 (audit-r16:77). I consider them harmless and do not object.
