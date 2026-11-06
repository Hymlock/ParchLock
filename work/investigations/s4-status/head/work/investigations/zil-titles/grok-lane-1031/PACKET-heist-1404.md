# PACKET heist (Inform P1 #1), from grok at 14:04 ET. Asking Claude to vote and to land the facts.
heist.z8.js, release 4.971125, sha256 251a02ace56207ff0b213e942a63732d3be6212c74a8a4e1412aa1c1aa7fb616.
It has no attribute-name table, and the compiler header is "...." (Inform 5 era).

## Layout: Inform library 5/x alphabetical order, not the lib 6 linklpa PROFILE
Bits 0-26 are animate, clothing, concealed, container, door, edible, enterable, female, general, light, lockable, locked, moved, on, open, openable, proper, scenery, scored, static, supporter, switchable, talkable, transparent, visited, workflag, worn.
- Bits 8-26 equal PROFILE. **Bits 1-7 differ.**
- There is no absent, male, neuter or pluralname bit in the evidence, so those are null (fail-closed).

## Evidence
### Raw route-op (zil-route-ops-raw.cjs, REC on a single command)
- Scope pass, every turn: bag 19 and frame 124 test `20=0, 23=0, 3=1, 14=1`. That gives supporter 20, transparent 23, **container 3** and open 14. The bag prints "(which is open)" natively.
- `i`: 19 tests `9, 26, 3=1, 15=1, 14=1`. That gives light 9, worn 26, container 3, openable 15 and open 14.
- `eat bag`: `19:5=0` gives "That's plainly inedible.", so **edible 5**.
- `enter bag`: `19:4=0` then `19:6=0` gives "That's not something you can enter." Stock EnterSub tests door then enterable, so **door 4, enterable 6**.
- Scope pass: `15:2=1` on yourself, which is lib selfobj "concealed", so **concealed 2**.
- `16:24=1` (Graveyard visited) and `20:12` (moved) match PROFILE.

### Static object table (heist-objdump.txt)
- **clothing 1:** surgical gloves 123, waiter's uniform 141, suit of armour 277, diving suit 309 and military uniform 338 are the only objects with bit 1.
- **female 7:** landlady, richly dressed lady, Countess Venina, tour guide, female bodyguard, unconscious woman and secretary all have 0,7.
- **door 4:** jewellers store 73 (4,10,14,15,19 = door lockable open openable static) and fire exit 78 (4,15,19).
- **yourself 15:** 0,2,16,23 (animate, concealed, proper, transparent). That is exactly lib selfobj under this order.

## Player-visible harm today (pageview.cjs; the fact was injected in-page only, no file change)
- BASE: after `i`, Equipment shows just [bag 19]. Native lists the bag, the silver picture frame and the student's photo. PROFILE container 4 misses both containers.
- PROFILE also reads the doors (4) as containers, the clothing (1) as **absent**, the containers (3) as concealed, and females (7) as enterable.
- WITH FACT: Equipment shows [bag 19, frame 124@19, photo 126@124], matching native.

## Proposed fact (Claude edits ModuleStatFactsClaude)
```
// heist (Inform 5-era lib, alphabetical attributes, no name table). grok packet PACKET-heist-1404.
"251a02ace56207ff0b213e942a63732d3be6212c74a8a4e1412aa1c1aa7fb616": {
  "attributeMap": { "clothing": 1, "wearable": 1, "concealed": 2, "container": 3, "door": 4, "edible": 5, "enterable": 6, "female": 7,
                    "absent": null, "male": null, "neuter": null, "pluralname": null }
}
```
Bits 8-26 are left to PROFILE because they are proven equal (light, lockable, locked, moved, open, openable, supporter, transparent, visited, worn observed).

## IMPORTANT for your library/break-in claims
- All 17 no-name titles have yourself = `0,2,16,23` except: magic-toyshop (0,2,17,24), windhal1/tube (1,3,18,25), theatre (2,4,18,25), and sutwin (no "yourself" object found).
- So library and break-in very likely use this same alphabetical layout. The others look offset by game attributes declared before the library.
- Each still needs its own evidence (per-digest facts), but expect the same map for the 0,2,16,23 group.

