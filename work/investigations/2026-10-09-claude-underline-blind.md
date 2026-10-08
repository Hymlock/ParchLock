# Underlining regression (Treasures, Hitchhiker's): claude sealed findings

Sealed before Codex's independent investigation. The operator's report is
quoted in the bus blind request. The operator states that all of this
underlining worked previously.

Measured headless on the current checkout (APK62 plus the World Map), and on
HEAD `543b0be` (Oct 4) in a clean worktree with game files copied.

## F1 Treasures: in-room items never underline (space-rag, flashlight, robodroid)

- Route `south,in` reaches ROCKET COCKPIT. There are 0 marks, and
  `discoveredObjects` is EMPTY in every room. `ZRamReader.shortName` returns
  "" for every object in this story: the player, the rooms and the items
  (Inform with routine-printed names).
- The items DO arrive as `unnamedCandidates`: `147: absorbent/space-ra` and
  `148: flashligh`, both parented to room 146. The robodroid comes the same way.
- `Actionable.promoteUnnamed` (`js/Actionable.js` ~930) drops every alias with
  `t.length >= cut` (cut = 9 for v4+), labelled "maybe truncated". It then
  requires a whole-word match in the printed text.
  - `absorbent`, `flashligh` and `robodroid` are 9 characters long, so they
    are dropped.
  - `space-ra` is followed by "g" in SPACE-RAG, so the boundary regex fails.
  - So no candidate is ever promoted, and nothing in the room underlines.
    After TAKE the items enter `inventory`, which is a different path, so they
    underline ("ABSORBENT SPACE-RAG: Seized.").
- The same probe on HEAD `543b0be` gives the identical result (0 marks in the
  cockpit). So this predates this week's changes. The guard line exists at
  HEAD.
- **Hypothesis:** the 9-character truncation guard plus the whole-word match is
  the cause. A truncated dictionary word should match as a PREFIX of the
  printed word (the parser accepts the full typed word and truncates it).
  Codex's E5 work added "actual ZVM dictionary encoding for punctuated
  truncation equivalence" for references, but `promoteUnnamed` was not
  updated.
- The cache-on/off comparison (BufferRevision.bypass) gives identical marks,
  so the DOM-scan caching is not involved.

## F2 Treasures: TWO-HANDED SWORD (held by the Lizard Maiden), banners, culvert/castle

Not yet probed (they need the operator's save, which is now supplied).
**Hypothesis:** the same path as F1. "two-handed" is a hyphenated token and
"sword" is shared with the player's own gladius; the banners are probably
unnamed with aliases blue/green/gold/red. To verify from the save.

## F3 Hitchhiker's: darkness scope, and "it"/"your" marked

- In the opening darkness (Bedroom, `DarkScope.dark = true`), the current
  `discoveredObjects` = `14:it`, toothbrush, `61:name`, `63:your curtains`,
  `102:it`, flathead screwdriver, bed, telephone, bedroom, `206:your gown`.
- Marks: `your`, `it`, `It`.
- Objects whose short name IS a pronoun or a generic word ("it", "name",
  "bedroom") are global/pseudo objects in ZIL. They match every "it" in the
  prose.
- "your curtains" / "your gown": the possessive becomes a matchable token, so
  "round your head" gets marked. The radial then offers "your curtains", "your
  gown" and "it" while the player can see nothing.
- **Darkness:** the visibility shield (D24) should give an empty scope when the
  location is dark. Here the whole lit-room contents are listed.
- HEAD `543b0be` was WORSE: 71+ objects in scope at the start (the
  HHG-payload bug Codex fixed this week), with marks "HITCHHIKER'S GUIDE",
  "number", "room", "your head", "it" x3 and "black". So the current code
  improved this, but it is not correct.
- **Hypotheses:**
  - (a) the pronoun and possessive names need a particle filter (D146 names
    `isGrammarParticle`; "it" and "your" are not in it, or names consisting
    only of a particle are not rejected);
  - (b) a darkness gate is missing from non-Inform (ZIL) scope;
  - (c) ZIL global objects (parent = 0, or the GLOBAL-OBJECTS/LOCAL-GLOBALS
    containers) are entering room scope.

## F4 Focus lost when a large block of text appears; "doesn't follow the text forward"

Not yet measured. The relevant mechanism is `Actionable.Refresh`:
`RoomLines` is re-anchored on the last room banner (heading/lastBanner) and on
`latest` (lines after the last input). A long reply scrolls the banner away
from the anchor, or an interrupting message ("Coward!", combat text) becomes
the new `latest`, so earlier room marks go stale. It needs a reproduction from
the saves.

## Baseline question

The operator says it all worked before. HEAD (Oct 4) does NOT have working
underlines for F1 or F3. So the working baseline predates Oct 4.
`C:/Users/hymlo/Downloads/ParchLock-dist` holds per-build corresponding-source
archives (make-dist). Diffing the `Actionable`/`ZRamReader` source of an
earlier build where it worked would locate the regression exactly.

Files probed (read-only scratch): `harness/_ul_route.js`, `_ul_probe.js`,
`_ul_probe2.js`.

## Addendum (still sealed): baseline search

`ParchLock-dist` keeps only the build62 source archive. Git checkouts on the
cockpit route (`south,in`):

| Commit | Cockpit marks | Other |
|---|---|---|
| ef3419a (build 59, 10-02) | [] | plain marks "of the" |
| 3cca2e0 (10-01) | [] | |
| c249b0f (09-27) | | does not reach a prompt headless (room ""); unusable |

So no runnable commit since 10-01 underlined the cockpit items. "Worked
previously" is therefore an earlier APK, or a different state or route. It is
not a regression within the git range I can execute.

## Addendum (sealed): measured on the operator's Treasures save 2 (OLD STONE BRIDGE)

- **Marks:** stream, east, CULVERT, north, LIZARD MAIDEN.
- **Missing:**
  - The **TWO-HANDED SWORD** held by the maiden. It is not even in
    `unnamedCandidates`, so objects held by an NPC never enter scope.
    Inform's own "You can see" counts them as visible; this is a scope
    defect, not a matching one.
  - **SLAVER KING'S CASTLE.** Its only alias is the compiler-style
    `castlevis`, so no printed word matches.
  - **ROYAL ROAD** is absent from the candidates altogether.
  - The **bridge** and **cliff** are not underlined.
- **"examine sword"** resolved to the player's GLADIUS (in-game). With the
  maiden's sword out of scope, the app cannot offer "examine two-handed
  sword" at all.

## F5 The Yourself-hold menu is narrow (operator #1912)

- `EquipmentUI.yourselfCommands` gives the sword, space-rag and flashlight in
  this save only **examine / use / drop**.
- `ActionSynth.commandsForObject` (the full item list) is only examine, use,
  drop, "give X to …" and "put X in …". The two-object forms are correctly
  excluded from Yourself (arity 1).
- `RPG_VERBS` = wield/equip/wear/remove/eat/drink/apply/use/take/drop/examine.
  It has not changed since D205 introduced it (27d061f, 10-02). The original
  D205 code was even narrower (it also required `ref.verified`). So the
  Yourself radial has never been large since D205. The operator's "used to be
  pretty large" most likely means a pre-D205 behaviour or the full item
  radial. It needs the operator's or git's clarification.
- Treasures' dictionary (via `isGameWord`):
  - **has:** use, take, drop, examine, attack, light, turn, open, look, hold,
    push, smell, break, kill, fight, seize, get, enter, hit;
  - **lacks:** wield, wear, remove, eat, drink, apply, throw, wave, give, PUT,
    read, close, …
- **Finding:** ActionSynth offers "give X to" and "put X in" in Treasures,
  although neither verb is in its dictionary. That is a D24/D147 violation
  (invented vocabulary) in the full item radial.
- **Finding:** the Yourself menu never considers this game's real item verbs
  (light/turn for the flashlight, hold/hit/attack for weapons), because its
  pool is limited to the 11 curated RPG verbs plus ActionSynth.
- Hitchhiker's dictionary is much richer (wear, remove, eat, drink, throw,
  wave, switch, turn, clean, rub, read, open, close, search, show, give, put,
  insert, …).

## Addendum (sealed): measured on the operator's HHG save 1 (Bedroom, lit)

- Restoring and running look / take screwdriver / look / inventory / look:
  - Room marks (small bedroom, old wallpaper, washbasin, curtains, phone,
    flathead screwdriver, toothbrush) were RETAINED across an interrupting
    reply ("It slips through your fumbling fingers...") and an unknown-word
    reply. So the focus loss did NOT reproduce in this short sequence; it
    needs a longer or room-changing sequence.
  - "It" is marked at every sentence start ("It is a small bedroom", "It
    slips ..."), via the scope objects 14/102/202, whose short name is "it".
- **DarkScope stale dark:** `DarkScope.dark` stays TRUE in the lit, described
  Bedroom. `DarkScope.noteText` scans the WHOLE transcript, so the opening's
  "pitch black" keeps it dark until a light-cue word appears. The darkness
  verdict is history-based, not current. It does not gate the marks here, but
  any consumer of `payload.darkness` gets a stale answer.
  - (My S2 change, the identical-text early return, does not alter that
    verdict: the same text gives the same result.)

## Addendum (sealed): F4 focus loss MEASURED (operator screenshot, HHG save 1)

Marks are reported as "word@line offset", where 0 is the last command echo.

- Restored: the room description is at +3..+5 and is marked.
- After `get all`: room marks at -4 (the old description) PLUS the reply's
  items at +1..+3 (flathead screwdriver, toothbrush, telephone), and "it" at
  +2/+3 inside the reply.
- After `examine carpet`: every item mark jumps BACK to the room description
  at -9..-7. The `get all` reply in between loses all its marks, and the only
  new mark is "it" in "leave it alone" (+1).

**Mechanism:** `Actionable.Refresh` marks only `RoomLines` (the last room
banner's description) plus `latest` (the lines after the last command).
Earlier replies lose their marks after the next command. On a phone the room
description has scrolled away, so the player sees no underlines on the text
they are reading. That is "doesn't follow the text forward" and "anything
can interrupt".

Contributing: D146's one mark per object plus the line order (RoomLines
first, then latest) means that when an object appears in both, the OLDER
room line takes the mark, not the newest text. The "it" pseudo-objects and
"your" names (F3) add wrong marks to every reply.

"your gown" is not marked in the get-all reply: it is not among the
discovered objects in this save.

## Addendum (sealed): the operator's stated design versus the code

**Operator:** "Underlining is not supposed to be limited by Blocks. It is
supposed to be tracked by the existing underlined words ... it tracks an
underlined word until that word appears again in a [newer text]" (the
message was truncated).

**Code today:**
- Every `Actionable.Refresh` that changes the signature calls
  `Actionable.Stale()`, which adds `is-stale` to EVERY live mark
  (`css: .pl-act.is-stale` = no underline).
- Marks are then rebuilt ONLY inside activeLines (`RoomLines` + `latest`).
- `relocateExactMarks` (added 10-03 in fbd9d5d) moves the chosen marks to the
  newest copy of the phrase, but again only within activeLines.

So an underline outside the room description and the newest reply is killed,
not carried. The operator's model is persistent per-word tracking across the
whole transcript, where a mark moves forward when its word reappears. That
needs: (a) do not stale marks that are still valid for an in-scope object;
(b) relocate to the newest occurrence anywhere after the existing mark, not
only within activeLines.
