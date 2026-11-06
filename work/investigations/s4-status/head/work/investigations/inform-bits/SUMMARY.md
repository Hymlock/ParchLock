# No-name-table Inform titles: static attribute-bit layout (2026-10-24, read-only)

Scripts: bits.cjs (object table + names -> raw.json), emit.cjs (this file + <title>.json). Static object table only; candidates for native verification, not facts.

PROFILE (6.12.2): clothing 2, concealed 3, container 4, door 5, edible 6, light 9, lockable 10, locked 11, open 14, openable 15, supporter 20, worn 26.

## Layouts found
- **L**: anchors compass=concealed 2, walls=scenery 17, yourself 0,2,16,23 (animate,concealed,proper,transparent), rooms light 9; doors carry 4+15(+10,11); containers 3+15 or 3+14; hats/clothes 1; food 5; supporters 20. Bits 1..8 are PROFILE-1 (no `absent` at 1, an extra attr at 8); 9..23 equal PROFILE.
  map: {"door":4,"open":14,"openable":15,"container":3,"supporter":20,"light":9,"edible":5,"clothing":1,"worn":26,"lockable":10,"locked":11,"concealed":2,"animate":0}
- **TOY**: compass 2, walls 18, yourself 0,2,17,24, Toyshop room 10; oak chest 3,11,12,16,20 (container,lockable,locked,openable,static); hamper 3,15; baguette/mushroom/egg 6. = L with one extra attr after container (bits>=4 +1). door/clothing/supporter not directly seen (dress 2,27 is odd; 27 likely worn).
  map: {"door":5,"open":15,"openable":16,"container":3,"supporter":21,"light":10,"edible":6,"clothing":1,"worn":27,"lockable":11,"locked":12,"concealed":2,"animate":0}
- **WIN**: compass 3, walls 19, yourself 1,3,18,25, rooms 11 = TOY+1 (game attr at 0). windhal1 doors 6,17,19 (door,openable,scenery); tinder box 4,17; basket 4,8,16,21,25; counter 19,22; cloak 2. tube: dispensing tray 4,16,19; hat/cap 2; chocolate 7; tramp 1.
  map: {"door":6,"open":16,"openable":17,"container":4,"supporter":22,"light":11,"edible":7,"clothing":2,"worn":28,"lockable":12,"locked":13,"concealed":3,"animate":1}
- **TH**: compass 4, walls 19, yourself 2,4,18,25, rooms 11 = L+2. trapdoor 6,16,17,21 (door,open,openable,static); iron door 6,12,13,17,19 (door,lockable,locked,openable,scenery); bin/locker 5,17,21 (container,openable,static); beds 8,21,22 (enterable,static,supporter); ring/gas mask 3.
  map: {"door":6,"open":16,"openable":17,"container":5,"supporter":22,"light":11,"edible":7,"clothing":3,"worn":28,"lockable":12,"locked":13,"concealed":4,"animate":2}

| Title | Verdict | Layout | Confidence | PROFILE wrong for |
|---|---|---|---|---|
| Enemies.z8 | SHIFTED (low block -1) | L | high | clothing concealed container door edible |
| Gumshoe.z5 | SHIFTED (low block -1) | L | high | clothing concealed container door edible |
| SoFar.z8 | SHIFTED (low block -1) | L | high | clothing concealed container door edible |
| break-in.z5 | SHIFTED (low block -1) | L | high | clothing concealed container door edible |
| godot.z5 | SHIFTED (low block -1) | L | high | clothing concealed container door edible |
| heist.z8 | SHIFTED (low block -1) | L | high | clothing concealed container door edible |
| library.z5 | SHIFTED (low block -1) | L | high | clothing concealed container door edible |
| lists.z5 | SHIFTED (low block -1) | L | high | clothing concealed container door edible |
| lost.z5 | SHIFTED (low block -1) | L | high | clothing concealed container door edible |
| magic-toyshop.z5 | SHIFTED (container..3 as L; door+ +1 vs L) | TOY | medium | clothing concealed container light lockable locked open openable supporter worn |
| minster.z5 | SHIFTED (low block -1) | L | high | clothing concealed container door edible |
| spirit.z5 | SHIFTED (low block -1) | L | high | clothing concealed container door edible |
| sutwin.z5 | NO EXEMPLARS | - | n/a | - |
| theatre.z5 | SHIFTED by +2 vs L | TH | high | clothing concealed container door edible light lockable locked open openable supporter worn |
| tube.z5 | SHIFTED (TOY +1) | WIN | high (windhal1) / medium (tube, few objects) | door edible light lockable locked open openable supporter worn |
| wedding.z5 | SHIFTED (low block -1) | L | high | clothing concealed container door edible |
| windhal1.z8 | SHIFTED (TOY +1) | WIN | high (windhal1) / medium (tube, few objects) | door edible light lockable locked open openable supporter worn |

## Notes
- No title is PROFILE OK. 13 share layout L (older library: no `absent` at 1). In L, light/lockable/locked/open/openable/supporter/static/scenery already equal PROFILE; only clothing, concealed, container, door, edible (and enterable/general) are off by -1.
- worn is never observable statically (nothing starts worn); values are library-order inference only. Verify with WEAR on device.
- magic-toyshop door/clothing/supporter are inferred, not seen (no door object; dress 2,27 is unexplained).
- heist: there is NO existing attributeMap for it in ModuleStatFactsClaude.js; the brief's assumption looks wrong.
- sutwin: no attribute bits on any object -> NO EXEMPLARS.
