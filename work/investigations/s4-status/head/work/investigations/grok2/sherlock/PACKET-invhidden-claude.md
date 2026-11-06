# PACKET: Sherlock inventoryHiddenAttribute (FL-NODESC 32 held) -- claude seat (grok2 lane takeover)
Author: claude. Tier: source census (exhaustive over OBJECT definitions) + prior native (grok2 ndHeld=[]).

## Census: objects with FL-NODESC and FL-TAKEABLE in source
TH-WAX-HEAD, TH-WAX-AX, TH-TORCH (charles.zil), TH-SAPPHIRE, TH-CLUMP-OF-MOSS, TH-ASH (things1.zil). (GLOBAL-OBJECTS hit is the flag-declaration dummy.)

## Can the player directly hold one with NODESC still set?
- Generic take, parser.zil:1680-1685: `MC-MAKE FL-SEEN ... MC-UNMAKE GL-PRSO FL-NODESC ... MOVE GL-PRSO GL-WINNER`. Any take clears 32 first.
- Wax head take charles.zil:635-638 clears NODESC; sapphire things2.zil:1365-1367, opal 1522-1525, garnet bank.zil:606-611/646, ring
  bank.zil:455-460/people.zil:815-818, Sherman gifts people.zil:1197-1201: every scripted MOVE to the player also UNMAKEs NODESC.
- MAKE NODESC sites (charles.zil:756-767 torch/wax head/axe, people.zil:958 pigeon) MOVE the object AWAY from the player (statues/room).
- Only NODESC things under the player are body/coat slots nested under worn coat/body (lapel, pocket), not direct children.
- V-INVENTORY (verbs.zil:4001+) does list via RT-PRINT-CONTENTS, which honours NODESC (other-misc.zil:48), but no reachable state feeds it a held NODESC object.

## Verdict
**inventoryHiddenAttribute = NC (unreachable).** The game never leaves FL-NODESC on an object the player holds directly; every
acquisition path clears it (parser.zil:1684 for all takes). A native INVENTORY-omit proof cannot be produced without forcing state,
which the lane rules forbid. Do not map 32 to inventoryHidden from room furniture or nested body slots.
