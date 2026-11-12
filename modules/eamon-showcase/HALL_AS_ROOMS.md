# The Main Hall as ParchLock rooms: design for adversarial review

Operator direction, 2026-11-11: the Main Hall choices are directions. The Hall's places are rooms on the
map, reached with the direction buttons and radial like moving between rooms in any ParchLock game;
make the Hall a room and attach the options to it; full ParchLock interaction and mapping. Upstream
source: EamonMH/Game/Menus (pinned 5db64a37). The engine is not changed; this is presentation over its
own menu structure, fed to the existing systems (WorldModel provider, MapTopology, DirectionalRadial,
Navigator, Input, history, transcript).

## What the engine has (source facts)

- Three hierarchical menus, each a `Menu` subclass with a fixed `MenuItemList` (`SelectChar`, `LineText`,
  `SubMenu`): `MainHallMenu` (title "MAIN HALL"), `VillageMenu`, `PracticeAreaMenu`.
- Fixed tree: Main Hall item 6 opens Village; Village item 6 opens Practice Area. Each menu's X item has
  `SubMenu = null` and leaves that menu ("Head north into the Main Hall" from the Village, "Head north
  into the Village" from the Practice Area, "Temporarily leave the universe" from the Main Hall).
- Places are action menus (leaf `SubMenu`s whose own `Execute` runs an interaction with nested prompts,
  then returns to the parent menu): Main Hall: Go on an adventure, Weapons and Armor Shop (Marcos
  Cavielli), Wizard (Hokas Tokas), Banker (Rowan McFenny); Village: Casino Schmitt, Good Witch's
  Emporium, Grendel's Smithy, Village Square statue; Practice Area: Licensed Wizard, Don Diego, Master
  Armor, Info Booth. "Examine your abilities" appears in all three and is not a place.
- `Menu.Execute` asks with `ReadField(size 1, emptyVal "X", validator = IsCharMenuItem)`.

## Proposal

1. **Rooms.** Main Hall, Village, Practice Area, and one room per place (12). Names from a small
   presentation table keyed by the action-menu interface (e.g. `IMarcosCavielliMenu` -> "Weapons and
   Armor Shop"). Ids: Main Hall adventure code (308) x 1,000,000 + a fixed small number per room.
2. **Where the player is** (host, at each prompt, from the stack, no text): an action menu's own
   `Execute` frame on the stack means "in that place"; otherwise the number of `Menu.Execute` frames
   gives the hierarchical room (1 Main Hall, 2 Village, 3 Practice Area), checked against the fixed
   tree. Unknown shape: no Hall world (honest absence).
3. **Exits.** Each hierarchical room exposes its places and child/parent menus as exits whose command is
   the engine key. Compass labels come from the engine's own wording where it gives one (Village <->
   Main Hall north/south, Practice Area <-> Village); other exits are non-compass, labelled with the
   place name (ParchLock already handles non-compass exits). Main Hall X (leave the universe) is not an
   exit.
4. **Commands attached to the room.** "Examine your abilities" (its key) and, in the Main Hall, "Leave
   the universe" go to `specialCommands`, so the Send-button command radial and autocomplete offer them.
5. **Hall menu prompts become line prompts.** At a `Menu.Execute` prompt the adapter requests line input
   instead of a single key, so ParchLock's existing `Input.Inject` path (radial, map taps, Navigator
   fast travel, history, transcript, TurnRecorder) drives it exactly as a Z game's typed command. The
   engine's validator still decides; typing the key and Enter still works. Nested prompts inside a
   place (buy/sell, yes/no) stay single-key as they are now.
6. **Places.** Entering a place is a move into its room; the interaction's nested prompts happen in that
   room; when the engine returns to the menu, the player is back in the parent room. Place rooms list no
   exits (there is no command that leaves them; the interaction ends itself).
7. **Map scope.** The existing "Main Hall" map scope (R16) now holds these rooms. Equipment/stats for
   the selected character are a later slice. The outer chamber and registration desk (before a
   character is chosen) are a later slice.

## Questions for review

Q1. Returning from a place happens without a movement command; MapTopology learns edges from (previous
room, last command, new room). Will it record a bogus edge (e.g. "N" answered in a shop -> Main Hall)?
What is the existing way to mark an engine-driven relocation (restore, teleport) so no edge is learned?
Q2. Any risk in presenting Menu.Execute prompts as line input (history noise from single keys, autocomplete,
the Glk line request size, screen-reader mode)?
Q3. Is stack-depth identification acceptable, or is there a cleaner engine fact (`gEngine.Menu`,
`IMhMenu`) for the current menu?
Q4. Non-compass exit labels named after places: anything in DirectionalRadial/MapTopology/Navigator that
mishandles them (slot borrowing, route finding, reverse-edge inference)?
Q5. Anything here that duplicates an existing ParchLock mechanism or contradicts plan rules?
