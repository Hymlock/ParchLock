# Z1 reconcile: ZIL L:NC cells against current consumers (claude, 2026-11-06)

Read-only. Sources: 2026-10-11-zil-cell-ledger.json; view regenerated here as zil-profile-ledger.md
(26 titles x 38 keys: F 134, L:NA 338, C 301, L:S 76, L:NC 94, L:UD 16, L:O 3, L:X 26).
Raw ledger holds 95 NC entries; the view shows 94 because Sherlock `on` is overridden by a committed fact.
Facts checked in the working-copy js/ModuleStatFactsClaude.js per story digest (lightForms, illuminationState, wearForms, on, switchable).

## Headline: release impact is zero
None of the 26 ZIL titles (Zork I-III ... Sherlock) is in GAMES_INCLUDED.md (the 80 release games). So under the
"visible impact in the release 80" rule, no NC cell can change a release player's radial or status. Z1 is a
development-catalogue item only.

## Counts per class (95 raw NC cells)
| class | n | cells |
|---|---|---|
| (a) now consumed (ledger stale: should be S, citing D260 owner forms) | 7 | light: Cutthroats, Infidel, Sorcerer, Sherlock (lightForms / Sorcerer illuminationState); lightSource: Sorcerer (illuminationState); on: Sherlock (committed fact); switchable: Sherlock (ledger itself says served by lightForms {166, state 38}) |
| (b) sibling consumer exists, this title could get a fact | 29 | light (15): Zork3, Hitchhik, Ballyhoo, HollywoodHijinx, LGOP, Moonmist, PlunderedHearts, TheLurkingHorror, Planetfall, Seastalker, Spellbreaker, Suspect, Suspended, Wishbringer, TheWitness. lightSource (14): Hitchhik, Ballyhoo, HollywoodHijinx, LGOP, Moonmist, PlunderedHearts, TheLurkingHorror, Planetfall, Seastalker, Spellbreaker, Starcross, Stationfall, Suspended, Wishbringer. Consumer = D260 lightForms (ActionSynth.lightFormsFor -> Light/Extinguish radial row) and illuminationState (EquipmentUI 'providing light' tag). The raw keys `light`/`lightSource` themselves still have no semantic reader; the fact to add is lightForms/illuminationState, not the key. |
| (c) no player-visible consumer possible | 59 | visited (26, all titles): no reader; rooms visited are already known from the wrapper's own map walk, object TOUCHBIT = moved. proper (12), female (9), pluralname (6), male + neuter (Sherlock, 2): no consumer composes articles/pronouns/number; labels use the game's own short names, so no option is missing (four-seat R3-A). on Hitchhik: ONBIT is the room-lit bit (r45). locked Moonmist: auto-unlock routines, a fact would add false route pauses (D246). static + takeable Sherlock: Take already offered on every non-actor; no missing option. |
| (d) needs a new consumer | 0 | none: every remaining NC either is served by an existing consumer (a/b) or cannot add a missing option (c). |

Check: 7 + 29 + 59 = 95.

## Consumer grep (js/ActionSynth, AttributeSchema, EquipmentUI, StatTracker, DarkScope)
- lightForms: AttributeSchema.js:525, ActionSynth.js:93/498/737. illuminationState: AttributeSchema.js:600, EquipmentUI.js:273/783. wearForms: ActionSynth.js:438.
- No reader of attrs.light/lightSource as a semantic key (ZRamReader.js:1786/1856/3017 are object heuristics). DarkScope.js and StatTracker.js read none of the NC keys.
- visited, proper, male, female, neuter, pluralname: zero readers in js/ (generated consumer inventory).
- S1 (I6 hidden status probe) and M7 (door_to look-ahead hint) from 11-05/11-06 read none of these keys. M7 is display-only; WorldMap locked reads exit meta, not attrs.locked.

## (b) ordered by benefit if Z1 is pursued (development catalogue only, missing-over-wrong)
1. Titles where the player must light a source to progress (missing Light/Turn on is a missing option):
   TheLurkingHorror, Planetfall, Spellbreaker, Wishbringer, Zork3, HollywoodHijinx, Starcross (lightSource), Stationfall (lightSource).
   Proposal: lightForms fact per title (owner ids + on/off verbs + state bit), same D260 shape and harness.
2. Mystery/real-world titles with incidental lamps/matches: Ballyhoo, Moonmist, Suspect, TheWitness, Seastalker, PlunderedHearts, LGOP, Hitchhik, Suspended.
   Many already offer the switch via switchable facts (C), so the gain is mostly the 'providing light' tag; low priority.

## Recommended ledger edits (for the docs owner)
- Move the 7 (a) cells to L:S with reason "served by D260 lightForms/illuminationState" (Sherlock on: drop the stale NC entry, the fact supersedes it).
- Annotate the 29 (b) cells "sibling consumer D260 exists; fact is lightForms/illuminationState, not the raw key".
- (c) stays NC with the reasons above; replace the old 94 headline with 7/29/59 and note zero release-80 impact.
