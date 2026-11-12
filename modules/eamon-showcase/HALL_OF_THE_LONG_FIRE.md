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
