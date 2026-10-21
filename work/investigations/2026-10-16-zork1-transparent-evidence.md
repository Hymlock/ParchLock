# Zork I TRANSBIT 12 evidence (2026-10-16, original scene, no relocation)

## i after take bottle + take sack
>i ::  You are carrying: A brown sack A glass bottle The glass bottle contains: A quantity of water > 
OPS ["203:27=0","224:7=0","224:14=0","224:20=0","224:0=0","224:12=0","224:11=0","236:7=0","236:14=0","236:20=0","236:0=0","236:12=1","237:7=0","237:14=0","236:10=0","236:30=0","237:20=0","237:0=0","237:12=0","237:11=0","114:7=1","45:3=0","46:9=0","46:6=1","46:3=0","217:2=0","114:2=0","203:20=1"]
EQ ["224:brown sack@4","236:glass bottle@4"]

## look with bottle in closed trophy case
>look :: ook Living Room You are in the living room. There is a doorway to the east, a wooden door with strange gothic lettering to the west, which appears to be nailed shut, a trophy case, and a large oriental rug in the center of the room. Above the trophy case hangs an elvish sword of great antiquity. A battery-powered brass lantern is on the trophy case. Your collection of treasures consists of: A glas
OPS ["193:3=1","193:5=0","193:27=0","183:11=0","194:7=0","194:3=1","110:7=0","110:3=0","110:14=0","110:12=0","110:11=0","111:7=0","111:3=0","164:7=0","164:3=0","164:14=0","164:12=0","164:11=0","183:7=1","192:7=0","192:3=0","194:14=1","194:12=1","236:7=0","236:3=1","109:7=1","236:14=0","236:20=0","236:0=0","236:12=1","237:7=0","237:3=1","237:14=0","236:10=0","236:30=0","237:20=0","237:0=0","237:12=0","237:11=0","111:14=1","192:14=1","114:7=1","152:3=0","150:9=0","150:6=1","150:3=0","217:2=0","114:2=0","193:20=1"]
EQ []

## Current-source audit, October21

Fresh untouched route north/east/open window/west, take bottle/sack, close sack, west reaches Living Room. Named LOOK IN
bottle236 and trophy case194 each tests TRANSBIT12 TRUE with contents/empty replies; closed brown sack224 tests12 FALSE
with the closed refusal. Independently bounded compiled table250 objects has exactly194/236/111 as bit12 owners.

Separate controlled browser candidate changes only the in-memory transparent12 fact. Bottle stays closed; water237
becomes an additional Equipment entry. Baseline omits it. This proves the current consumer effect, not a new policy:
OPEN_WORK says operator decision pending, while later bus4075 reports approval of keeping closed water hidden. Direct
human decision text was not found in the checked local Codex/Claude transcripts. Preserve baseline pending reconciliation.
No product-file or story-RAM changes. Native semantic proof and consumer-policy acceptance remain separate.

Artifacts: work/mapping-research/items-codex/resume-20261020/zork1-transparent/review.md, evidence.json, current-domain.json,
native-ui.cjs, counterfactual-ui.cjs and routes.json. Raw native/candidate output retained locally in the same directory.
