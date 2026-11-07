# E2 Wear natural-acquisition (grok2, 2026-11-07)

OPEN_WORK E2: LH 133 / Starcross 176 natural proof; LH ring id.

## IDs
| Title | id | short name |
|-------|-----|------------|
| LH | 133 | brass hyrax (RING; synonyms ring/hyrax) |
| LH | 203/104 | gloves/boots (already wearForms owners) |
| SC | 176 | tattered suit |
| SC | 144 | space suit (already wearForms owner) |

## Natural acquisition results

### Starcross space suit 144 — **PASS**
- Route: `2026-10-15-zil-routes.json` starcross **stop before first `wear suit`**
- Inventory includes 144 held, worn=false
- `ActionSynth.commandsForObject`: **`wear suit` with `identityWearScope: true`**
- Evidence: `sc-before-wear-suit.json`
- Learning wiped before walk

### LH brass hyrax 133 — **OPEN (acquisition failed)**
- Jericho lurking through step 180 `GET HYRAX` (after PUT HAND IN LIQUID / GET HAND)
- Hyrax **not** in inventory after walk (`lh-hyrax-after-get.json`)
- Gloves still worn; remove gloves still no hyrax
- Need a verified professor/alchemy route where GET HYRAX succeeds, then cold Wear radial

### Starcross tattered suit 176 — **OPEN**
- Not present before first `wear suit` on the short route
- `examine/take tattered suit` did not yield id 176
- Need later route segment where junk/tattered suit is takeable

### LH gloves/boots (related)
- Jericho natural GET GLOVES / GET BOOTS then WEAR already documents natural acquisition for 203/104 (prior cold captures under wear-concealed/)

## Conclusion
- E2 **partial**: SC 144 natural Wear path confirmed live with identityWearScope
- 133 and 176 still need successful get-then-wear routes
- Ring id for LH = **133** (brass hyrax) — confirmed via shortName

## No js/ change

## Update 2026-11-07 ~03:20

### SC 176 tattered suit
- At boot: parent = weasel chieftain **169** (held by NPC, not free on ground).
- enclosingRoom via ZRamReader.enclosingRoom(176) = 10; placing PC there still can't see suit (on chief).
- Natural acquisition = village encounter / take-from-chief (route later: throw suit at nest recovers a suit � may be 144 not 176).
- **wearForms does not include 176** (only 144) � correct until natural get+wear proven.

### LH 133 brass hyrax  
- Boot parent chain 133?250?174?49 (nested under professor-side containment).
- Jericho GET HYRAX after alchemy did not put 133 in player inventory in prior run.
- Ring id confirmed **133**.

### Status
E2: **SC144 natural Wear PASS**; 133/176 still OPEN (NPC/nested acquisition).
