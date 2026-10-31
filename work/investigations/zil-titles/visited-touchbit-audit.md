# R3-C `visited` (TOUCHBIT) audit — 25 L:NC cells

Source: historicalsource/<title> (commit in table), cloned read-only to scratchpad. Excerpts: `visited-evidence/<title>.txt`.
Cells: `2026-10-11-zil-cell-ledger.json` where `visited.s==='NC'` (25).

## Finding
In 24/25 titles the only general room setter is `<FSET ,HERE ,TOUCHBIT>` inside the room describer
(DESCRIBE-ROOM / V-LOOK / GOTO path) on `,HERE` = the player's current room. That is "player has been
here (and it was described)" — the same fact the app already records from navigation (WorldMap.isVisited).
Deviations make TOUCHBIT a *worse* visited signal, never a better one:
- Scripted `FCLEAR` on rooms to replay first-visit text (Ballyhoo STANDS-ROOM/WINGS/TIGHTROPE-ROOM, Enchanter gallery/magic/stair, Infidel camp, Lurking Horror frob, Spellbreaker c4, Zork3 actions, Stationfall COMMANDERS-OFFICE/LAUNDRY/COMM-CENTER) — visited rooms read unvisited.
- Zork1 maze rooms: TOUCHBIT cleared every visit (gverbs.zil:1655, MAZEBIT) — maze would never show visited.
- Remote description (Zork2 GO&LOOK palantir 2actions.zil:1536, Starcross actions.zil:2434): explicitly *restores* TOUCHBIT off for the remotely-seen room. So the "seen without entering" case does not exist in these sources.
- Stationfall AIR-SHAFT never gets TOUCHBIT (verbs.zil:2679).
- Suspended: no dynamic room setter at all; TOUCHBIT is compile-time on objects/GLOBAL-OBJECTS and set on PRSO by verbs (object "touched"); main.zil:59 tests CPU-ROOM only for startup banner.
- Suspect rchk.zil:4 sets TOUCHBIT on all ROOMS but is a debug routine compiled only when PREDGEN is unassigned (not player flow).
Save restore is already covered by D215 per-save map snapshots. No player-visible map/radial gain.

## Per-title

| Title | commit | Room setter (cite) | Other room writers | Verdict |
|---|---|---|---|---|
| Zork1 | 97b7b3d | gverbs.zil:1651 | :1655 maze clear | REDUNDANT (maze makes it worse) |
| Zork2 | 3da9661 | gverbs.zil:1695 | :1699; 2actions.zil:1536 GO&LOOK un-sets remote view | REDUNDANT |
| Zork3 | 3ec9ed4 | gverbs.zil:1695, verbs.zil:75 | 3actions.zil:427, actions.zil:382 FCLEAR | REDUNDANT |
| Enchanter | 472c3b9 | verbs.zil:63 | gallery.zil:35, magic.zil:1049, stair.zil:573 FCLEAR | REDUNDANT |
| Hitchhiker's | 1288855 | verbs.zil:2407 | — | REDUNDANT |
| Ballyhoo | 9f779e8 | verbs.zil:3040 | bigtop.zil:586/596/609/1437/1512, globals.zil:552 FCLEAR | REDUNDANT |
| Cutthroats | 2febadb | verbs.zil:76 | — | REDUNDANT |
| Deadline | 2602bd5 | verbs.zil:82 | — | REDUNDANT |
| Infidel | dca8235 | verbs.zil:70 | camp.zil:1737 FCLEAR | REDUNDANT |
| Hollywood Hijinx | e93d085 | verbs.zil:13 | — | REDUNDANT |
| Leather Goddesses | 17cbbc1 | verbs.zil:2851 | — | REDUNDANT |
| Moonmist | c85885f | verbs.zil:821 | castle.zil:558 (M-LOOK of HERE) | REDUNDANT |
| Plundered Hearts | f3db372 | verbs.zil:2848 | — | REDUNDANT |
| Border Zone | 5c80126 | desc.zil:23 | — | REDUNDANT |
| Lurking Horror | 51d8060 | desc.zil:28 | frob.zil:710 FCLEAR | REDUNDANT |
| Planetfall | 7e7af12 | verbs.zil:76 | — | REDUNDANT |
| Seastalker | 258f825 | verbs.zil:260, 270 | — | REDUNDANT |
| Sorcerer | 6417e1e | verbs.zil:2608 | — | REDUNDANT |
| Spellbreaker | 6f83ba4 | verbs.zil:1800 | c4.zil:1351 FCLEAR | REDUNDANT |
| Starcross | 3ceaa9f | verbs.zil:59 | actions.zil:2434 un-sets remote view | REDUNDANT |
| Stationfall | 5d05d5e | verbs.zil:2679 (not AIR-SHAFT) | globals.zil:1092, interrupts.zil:86/451, station.zil:661 FCLEAR | REDUNDANT |
| Suspect | a18e100 | verbs.zil:249 | rchk.zil:4 debug-only | REDUNDANT |
| Wishbringer | e46c2ed | verbs.zil:2335 | — | REDUNDANT |
| Witness | 8fe092a | verbs.zil:294 | — | REDUNDANT |
| Suspended | ce4b8ed | none (rooms never set) | objects/PRSO only (objects.zil:1618, verbs.zil:682...) | DIFFERENT-MEANING (object-touched; NC) |

"—" = no other room-level writer matched `<FSET|FCLEAR ,HERE|.RM ,TOUCHBIT>`; remaining FSET/FCLEAR TOUCHBIT hits in each title are named objects/rooms used as one-shot script flags (counts in evidence headers not exhaustive per object).

## Recommendation
All 25 stay NC. 24 REDUNDANT: "same meaning as navigation-derived visited; source deviations (FCLEAR replays, maze clear, remote-view un-set) only make TOUCHBIT less accurate." Suspended DIFFERENT-MEANING: "TOUCHBIT never set on rooms; object-touched flag." No USEFUL case: no title leaves TOUCHBIT set on a room the player has not entered.
