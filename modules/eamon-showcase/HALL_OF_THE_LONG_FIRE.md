# The Hall of the Long Fire: ParchLock's addition to the Main Hall (concept for review)

Operator direction, 2026-11-11: add interactable things to the Hall, a true addition for ParchLock's version.
A mythical hall, for example a long hall with a long fire. Fully fleshed out; every interactable object has
a theme and a true purpose. To be worked through with Grok. This is ParchLock's own content, labelled as
such (plan rule 1: campaign framing is ParchLock's added design); upstream Eamon text and data stay as
they are.

## The place

The Guild of Free Adventurers meets in a mead-hall: a long timber hall, roof beams black with smoke,
shields along both walls. Down the middle runs the **Long Fire**, a stone-lined trench of embers the
length of the hall that is never allowed to go out. Benches and trestle tables flank it. The registration
desk stands by the doors; the shop, the wizard and the banker keep alcoves along the sides; the far end
opens on the stair down to the Village. This is the Main Hall room of HALL_AS_ROOMS.md, given a body.

## Interactable objects and their purpose

Every object is tied to something real in the game or the campaign. Nothing is decoration only.

| Object (where) | Theme | True purpose (what it really does) | Source of truth |
| --- | --- | --- | --- |
| **The Long Fire** (centre) | the guild's undying hearth; old adventurers sit here | **Sit by the fire**: the skald recounts your last adventure. This is the plan's debriefing: was the clear credited and why, rank, any newly opened tier, in the engine's own figures | campaign record, outcome contracts |
| **The Skald** (at the fire) | an old bard who has heard every tale | **Ask the skald about <adventure>**: a short telling of an open adventure (its own intro and author line), so the player can choose; adventures still locked get only "That tale is not yet yours to hear" | ADVENTURES.DAT descriptions, tier gates |
| **The Quest Board** (by the desk) | notices nailed to a post | **Read the board**: every adventure grouped by the five tiers, open or locked, with what unlocks the next tier (two distinct clears below). **Take a notice**: goes to the adventure desk with that adventure chosen | tier policy, campaign record |
| **The Trophy Wall** (east wall) | a trophy hung for each deed | one trophy per credited clear (the Grimoire's torn page, Kahr-Dur's banner...). **Examine** a trophy: which character earned it, when, and the outcome that counted | campaign record (credits) |
| **The Stones of the Fallen** (by the doors) | runestones for those who did not return | a name for each character who died on an adventure, with where. Gives death a lasting place, matching ParchLock's death counter | character file (dead characters), playthrough history |
| **The Long Tables** (both sides of the fire) | tankards, mead, loud company | to be settled with Grok. Correction (source check): upstream "join the men drinking beer" (`DrinkBeerMenu`) is a joke death for ignoring the sign, not a drinking event, so it is not reused as a table purpose | upstream `DrinkBeerMenu.cs` |
| **The Shield Wall** (both walls) | members' shields | **Examine your shield**: your character sheet (the engine's own Examine Abilities) | upstream Examine Abilities |
| **The Guild Ledger** (on the desk) | the Irishman's book of names | **Read the ledger**: the guild roster; **sign the ledger**: register a new character (the upstream registration flow) | character file, upstream registration |
| **The Great Tapestry** (far wall) | the known lands, five regions | the campaign map: the five tiers as regions, which are open, how far the character has come. Opens ParchLock's existing world map view for the campaign | tier policy, campaign record |
| **The Stair to the Village** (far end) | worn stone steps | the exit south to the Village (HALL_AS_ROOMS.md) | upstream Village menu |

Each object is a real game object in the Hall room: underlined in the text, on the long-press radial,
listed in the room, examinable, with the verbs above. It is reached like anything else in a ParchLock game.

## How it is answered (needs review)

ParchLock never answers commands itself; the game does. So the Hall's objects are implemented as game
content in Eamon's own extension mechanism, not in ParchLock's interface code:

- **Option A (preferred for review): a ParchLock Hall plugin.** Eamon adventures customise the engine by
  `[ClassMappings]` subclasses in their own assembly; upstream source stays untouched. A ParchLock-owned
  assembly maps a Hall room with these objects and verbs onto the Main Hall, answers them through the
  engine's normal output and input, and reads the campaign record and character file it needs. It ships
  in the Showcase package beside the upstream assemblies, is listed as ParchLock content in the rights
  ledger, and the existing provider/WorldSnapshot expose its objects like any adventure's.
- **Option B: a small Eamon-format "Great Hall" world** (rooms/artifacts/effects .DAT plus a thin plugin)
  that the player is in between Hall choices. More native data, but the Hall menu places would have to be
  bridged from inside it.
- **Rejected: ParchLock-side answers** (the interface inventing responses). It breaks plan rule 2 and would
  be a parallel system.

Needed first from the campaign side: the campaign record (credits, tiers, debriefing) that plan package E
defines. The objects that depend on it (fire debriefing, board, trophies, tapestry) become live with it;
the ones on upstream behaviour (tables, shield, ledger, stair) can come first.

## Questions for Grok

1. Is Option A sound against Eamon CS's ClassMappings/plugin loading for EamonMH (can a separate assembly
   extend the Main Hall the way adventures extend EamonRT), and against the package trust boundary?
2. Which objects lack a true purpose, duplicate an existing ParchLock function, or misstate an upstream
   behaviour (for example: does EamonMH keep dead characters; is "join the men drinking beer" an outcome
   worth reusing)?
3. What is missing that a mythical guild hall should have and that would serve the campaign?
4. Order of work against plan packages D/E.
## Source checks (2026-11-11, against pinned upstream)

- `DrinkBeerMenu.Execute`: "you feel a sword being thrust through your back ... You really must learn to follow directions!" A death-style joke at the outer chamber, not a social event.
- Dead characters stay in the character file: `RegistrationDeskMenu` answers a dead name with "sad ... dead" (`Status.Dead`). The Stones of the Fallen have a real source.
- Class mappings are loaded per plugin by its own engine class (`LoadPluginClassMappings` -> `LoadPluginClassMappings01(Assembly.GetExecutingAssembly())`), the way each adventure's engine extends EamonRT. Option A therefore means a ParchLock Hall plugin whose engine derives from EamonMH's, launched where EamonMH would be (the host already resolves plugin launches in `AppShim.ExecutePlugin`).

## Operator addition: items are usable

"Players can use the hall's items for various purposes." Each object needs real uses (take, use, give, burn, read, sit, offer...), not only examine/read-outs, and each use must do something true in the game or campaign. Uses must not duplicate an existing place's service unless they are a themed route into that same upstream service (for example the Shield Wall opening the engine's own Examine Abilities).
## Settled with Grok (#3379)

- Mechanism: no replacement Main Hall plugin in the package. The app-owned host registers the Hall's class mappings beside EamonMH, the way it already injects portability mappings (`AppShim.LoadPortabilityClassMappings`); object text and data may ship in the package, labelled ParchLock content. Campaign reads and tier locks stay in the host (the progression authority). Option B (a separate Great Hall world) is dropped.
- Long Fire: sitting opens ParchLock's debriefing panel for the latest return; the story text does not reprint the debrief. No healing, burning loot or rest mechanic.
- Skald: tales only of open adventures, from the adventure's own intro and author line; no payment, no start.
- Quest Board: lists the tiers and the unlock rule and can say why an open adventure would still refuse this character (its own entry check). Taking a notice leads to the adventure desk's own flow; it is not a second way to start.
- Trophy Wall: credited clears only. A separate chronicle of failed or abandoned quests may follow from the outcome contracts.
- Stones of the Fallen: dead characters from the character file; reads ParchLock's existing death history, no second counter.
- Long Tables: dropped until a real purpose exists.
- Shield Wall: a themed route to the engine's Examine Abilities (the same key the room command sends).
- Guild Ledger: read-only roster in the Hall (including who is afield); signing stays at the registration desk in the outer chamber, which becomes its own later room with the real desk, sign and beer trap.
- Great Tapestry: opens ParchLock's existing world-map view with campaign data; waits for that data.
- Stair: the Village exit's themed object, sending the same key.
- Order: Hall rooms (built); then upstream-backed objects (Shield Wall, Stair, Ledger, Stones); then, after the campaign record (package E), the Fire, Board, Skald, Trophies and Tapestry.

- Constructor rule (Grok #3381): the Hall snapshot constructs the hierarchical menus and their action menus off-stage to read their items. Any host-registered Hall class must keep its constructor free of side effects (as every upstream menu constructor is: only `Buf = gEngine.Buf` and item lists).
## Mechanism for the objects (source-checked 2026-11-11; for Grok review)

- Load order (EamonMH/Program.cs): portability mappings (line 56) load before the plugin's own mappings (line 64), last write wins, so mappings registered with the portability set would be overwritten. But `EamonMH.Program.EngineType` is a settable property (line 33). The app-owned host sets it, in `AppShim.ExecutePlugin` when launching EamonMH.dll, to a host engine class derived from `EamonMH.Game.Plugin.Engine` whose `LoadPluginClassMappings` calls the base (all of EamonMH's own mappings) and then `LoadPluginClassMappings01(host assembly)`. Only `[ClassMappings]` classes in the host assembly are added. Upstream EamonMH.dll is launched unchanged; nothing in the package is a replacement plugin.
- `[ClassMappings(typeof(IMhMenu))]` and `[ClassMappings(typeof(IMainHallMenu))]` name the interface explicitly (ClassMappingsAttribute.InterfaceType).
- Room text: a host `IMhMenu` subclass's `PrintMainHallMenuSubtitle` prints the Hall's ParchLock description (the long fire, the shields, the stair, the ledger, the stones), then the upstream subtitle. The names in that text are what ParchLock underlines.
- Objects in a menu room: a host `IMainHallMenu` subclass adds menu items with empty `LineText` (not printed, so the upstream menu looks the same) and letter keys; their `SubMenu` is a host action menu that answers through the engine's normal output: Ledger -> roster from the character file; Stones -> dead characters. Shield Wall reuses key 5 (Examine Abilities) and Stair key 6 (Village), so they need no new item.
- Commands: the Hall snapshot lists the objects (name, aliases, attrs scenery) so the existing underline and radial offer them; `HallSnapshot.Translate` maps "examine stones" / "read ledger" / "climb stair" to that object's key. The engine's validator still decides; unknown lines are refused as now.
- Constructors stay side-effect free (snapshot builds menus off-stage).
