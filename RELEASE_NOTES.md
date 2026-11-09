# ParchLock Release Notes

## Desktop patch 2.0.3 - 2026-11-09

- Windows: if Windows reserves ParchLock's local port (for example after enabling virtualization), the launcher offers an available alternative and remembers it for future launches. It explains that browser saves and settings belong to the previous address; declining leaves that address unchanged. Existing data is not deleted.
- Includes the unchanged signed Android 2.0.2 APK (Build 86, versionCode 61). No Android update is needed for this desktop-only fix.
- Complete ZIP packaging restores the directory entries and portable file metadata used by the working 2.0.1 archive. Live itch.io web-play validation remains required.

## Build 86 (2.0.2) - 2026-11-09

- Android: supported story files no longer appear disabled in the Modules file picker when Android does not recognize their file types. Selected files still pass the existing content checks before import. Android versionCode 61; shell cache 185.
- Imported Glulx stories now launch from their stored bytes instead of attempting a second script load that left them at "Loading". Glulx support remains play-only.

## Build 85 (2.0.1) - 2026-11-07

- Equipment: putting something into a container you carry (Colossal Cave: catching the bird in the cage) no longer makes Equipment show only that container. Android versionCode 60; shell cache 184.

## Build 84 - 2026-11-07

- Faster on phones: each command used to freeze the screen for about a second; it now takes about a tenth of a second.
- Correct object flags (open, container, wear, light) for 35 more Inform games, so menus and maps offer the right actions and exits.
- The Edifice: the Useful Rock stays in Equipment after the story changes your character, and the map shows the first room immediately.
- "Cast at..." only appears in games that really have a cast verb. Android versionCode 59; shell cache 183.

## Build 83 - 2026-11-07

- Accessibility: visible keyboard focus on buttons and tabs, readable Map tab colours, Tab key no longer trapped in the story input, Known Rooms "go to" works with Enter, labelled map toolbar.
- Put: items with hyphenated names (School Days night-table) now appear in the "Put in..." list.
- Map: dashed "?" exit boxes no longer have lines drawn through their names.
- Faster: the game grammar is shared instead of copied on every refresh. Android versionCode 58; shell cache 182.

## Build 82 - 2026-11-07

- Map: a room you just entered shows where its exits lead (from the game data) as dashed "?" boxes, instead of a lone box until you walk each way.
- Put: choosing a table, desk or other surface in the "Put in..." list now sends "put X on Y" (Inform games refuse "in" for surfaces).
- Zork I no longer offers "Cast at..." (the game has no such command). Android versionCode 57; shell cache 181.

## Build 81 - 2026-11-07

- Map: long-press (or right-click) a room box on the map for the same menu as the Known Rooms list: Notes, and "Rewind to here" when it is available. Android versionCode 56; shell cache 180.

## Build 80 - 2026-11-07

- Equipment status: a stat with a long name ("Deaths this playthrough") takes two columns, so its words are no longer split on phones. Android versionCode 55; shell cache 179.

## Build 79 - 2026-11-06

- A Little Like Rogue: World map level buttons are named by dungeon depth (Depth 1, Depth 2, ...).
- Status card: long stat names wrap between words ("Deaths this playthrough"). Android versionCode 54; shell cache 178.

## Build 78 - 2026-11-06

- Status: the hidden inventory check no longer leaks text into older Inform 7 games (A Little Like Rogue, Accuse, Child's Play, Figaro, Wallpaper, gardening).
- A Little Like Rogue: a new Depth stat shows the dungeon level, and each level is its own floor on the local map and World map; trapdoors are drawn as going down.
- Deaths: "You have been killed in combat" (and any "You have been killed ...") now counts as a death. Android versionCode 53; shell cache 177.

## Build 77 - 2026-11-06

- Map: a door you have not walked through yet shows where it probably leads ("-> Entryway?"). It is a hint only; the map still links rooms after you walk.
- Map: long-press a visited room for "Rewind to here" (Z-machine games, after UNDO has worked once). It asks for confirmation and rewinds with the game's own undo.
- Map: rooms now appear in Guess the Verb, yagwad, Cabal, Blue Chairs, Tokyo2, Rameses, Heroine's Mantle and The Gostak; Book and Volume's Library and room names are correct.
- Moving while seated: a tapped direction while you are in a bed or chair first sends the game's own "get out" command.
- Status: the hidden inventory check no longer leaks text into the story (Anchorhead, Make It Good, Advent). Sherlock's clock is shown as a time. New option: hide the story's status line when the stat strip shows it.
- Make It Good: SCORE is recognised as having no score. Android versionCode 52; shell cache 176.


## Build 76 - 2026-11-04

- Desktop: Ctrl+Shift+Up and Ctrl+Shift+Down now send North/South even while the game command box is focused. Parchment no longer intercepts these combinations as command history.
- Ordinary Up/Down and Ctrl+Up/Down history controls and the alternate movement keys remain available. The new Up/Down movement shortcuts preserve the draft while dialogs or overlays block movement, and held-key repeats do not queue extra moves.
- Map shortcut tooltips now include Ctrl+Shift and advertise the arrow keys. Android versionCode 50; shell cache 175.


## Build 72 - 2026-10-10

- Wumpus: sections of one big room are grouped. The World Map draws a frame around them, and the local map shows the room number and section count.
- First room: Curses, Ghost and Vespers no longer put an opening quote, an intro scene or a hints menu on the map as the first room. Infocom-style games (Zork, Hitchhiker's Guide) are unchanged.
- Facility: the player is found through a measured game value.
- Hitchhiker's Guide: 'Bedroom, in the bed' still keeps the dark marker until you get up (documented limit).
- Not in this build: D219 room-name type check (under review).

## Build 71 - 2026-10-10

- Wumpus: big rooms are made of sections ("a section of room #25"). The map now follows the section you are actually in, so its exits (including Exit 3), items and creatures are picked up again, and Equipment shows what you carry.
- Wumpus dark rooms: a section first seen in the dark is named "Darkness" until you light it, then takes its real name once. Moving in the dark still follows the right section. Survives save/restore and map save/reload.
- Item names: names no longer pick up a word from the next inventory line, keep the game's own capitals ("ID card", "GLADIUS SWORD"), and show the full printed descriptor ("featureless white cube", "private investigator's license").
- Inform 7 (The Warbler's Nest, Facility): exits are shown before you travel them.
- Dark rooms: the dark marker now judges only the latest reply.
- Testing notes (not yet fully accepted by review): rooms with a blank compiled name take the game's own short name (Facility, Work in Retrograde) and can occasionally show a wrong name; furniture/vehicles are mapped as their room (bedlam, break-in); Facility's player detection.
- Not in this build: grouped Wumpus section boxes on the map, the endless-loop exit arrow, the remaining item fixes.

## Build 70 - 2026-10-10

- Map directions: games built with older Inform libraries (Curses, Night, Moonglow, Cat's Eye, Theatre and about a dozen others) now label exits from the game's own compass instead of a standard table, so "north" really leads north. Inevita, Gostak and Deja Vu still use the old labels.
- Map rooms: Make It Good (and three other games) now follow you into rooms that have internal names, instead of staying stuck in the first room.
- Room names no longer keep a stale "(on the bunk)" / "(in the black chevy)" after you get up or get out (KoA, Make It Good, Bear).
- Degeneracy now finds the player, so its map and Equipment work.
- Inform 7 games no longer show a phantom "exit-31" (Warbler's Nest).
- Return paths are drawn dotted and are never saved as real exits; the old Mapping option is gone.
- Underlining: the first mention in each reply is underlined; a word shared by several objects is underlined only when it is one object's main noun.
- Long room names wrap to two lines in the top exit band, and rooms take their full printed name when the status line truncated it.
- Opening Inventory from the Map no longer streams the map past the input.

## Build 69 - 2026-10-09

- Map: no more phantom exits in older Infocom-style games (for example a "punctured boat" east of Zork's West of House). Exits that only print a message, such as a boarded door, are no longer read as rooms, and the map no longer guesses a return path that the story itself contradicts.

## Build 68 - 2026-10-09

- Commands respond immediately again. Underlined-name processing no longer repeats work for every word and item after each reply (LOOK and INVENTORY were taking several seconds).
- The inventory weight and value summary ("You are carrying ... It's all worth ...") from status checks no longer appears in the story; real events in the same turn still do.
- Item names confirmed by the story (for example "food pellets") are kept after UNDO instead of falling back to a shortened word.
- Mobile layout: equal borders on the left, right and bottom; exits along the bottom now sit at the screen edge under the input; story text no longer shows beside or below the input; the input no longer shifts in dark rooms.
- Widget setup text is plain and shorter.

## Build 67 - 2026-10-09

- Larger, badge-free rotating storybook widget, resizable on supported launchers. Installation explains the resize handles. Placement no longer opens the game over Android's confirmation sheet. Home/return does not rotate the picture.


## Build 64 - 2026-10-09

- **Equipment screen.** A dedicated sheet for what you carry and wear, grouped
  under Yourself and open containers, with drag-to-container, item actions, and
  Options for sorting, search, container view and filters. Filters that do not
  apply to the story are hidden.
- **Status card.** Shows what the story tracks; long text such as a progress line
  gets a full-width row. New **Deaths this playthrough** and **Wins this
  playthrough** counters, decided from the story's own ending (for example
  Hitchhiker's "Better luck next life" and Zork's "You have died"), reset by a new
  game or RESTART.
- **World map** of every explored room, alongside the local map.
- **Room hints** for many Infocom-style stories: nearby rooms named by the story's
  own data appear faded with dotted links, and are never used for automatic
  travel until walked.
- **Underlines follow their words** as the story scrolls; the latest reply is
  recognised; ambiguous base words offer a choice.
- **Mobile layout:** exits along the bottom now have their own space above the
  input bar and keep their compass position; story text stays clear of the
  directions handle.
- **Map:** Map controls and Notes open and close with clear headings; the current
  room is marked with a small dot; browsed rooms' Back and Go buttons are faded
  until revealed, and a first touch never travels.
- **Start screen** rebuilt: labelled filter buttons, a Done column, a readable
  story list and an up-to-date feature overview.
- **Menus:** the Directions settings close button and the desktop Menu radial
  spacing were tidied.
- **New storybook icon** with four scenes from the opening splash. Android can
  add a home-screen shortcut that changes at each new app launch; the app-drawer
  icon stays fixed. On PC the owned desktop shortcut changes at launcher start.
  The splash opens on the tapped icon's scene. Native consent is separate from
  game startup so plugin activity-result registration precedes Android STARTED.

Device behaviour of the rotating icons depends on the phone's launcher and is
being checked on real devices.

## 1.0 - 2026-09-20

- Complete ParchLock product identity and Android package conversion.
- Full-screen randomized splash sequence on desktop and mobile.
- Adaptive mobile controls, input radial with a comprehensive Tools list, Map
  tab, prompt-aware submit and hold-to-talk speech controls.
- One-time mobile quick start for highlighted-word actions and the input hold
  radial, with a replay/reset command in Options.
- Keyboard entry at "press any key" screens and game menus, an on-screen
  Tools > Arrow keys pad, and native copy/paste while the keyboard is open.
- Mobile native grid menus now open the arrow pad automatically without text or
  module-specific detection. The pad stays stable across menu redraws, leaves the
  letter-entry strip accessible, respects dismissal, and closes on menu exit.
- Read aloud speaks new story lines on-device (default on, Options only), with an
  optional setting to skip lines repeated from the previous turn. It now follows
  paragraphs appended to an existing output line, suppresses ASCII/box-map strokes,
  retains useful labels, and prepares all-capital titles for natural speech through
  the same Android and desktop path.
- Corrected the spoken CH in Anchorhead to the K sound used by "anchor" without
  changing visible story text.
- Local Module Manager with byte-sniffed compatibility checks, IndexedDB
  storage, SHA-256 identity, folder/multi-file add, removal and empty-library
  recovery.
- Deterministic module-derived primary actions and shared radial descriptors
  for supported Z-machine modules.
- Adaptive command radials now rank all module, universal, and app commands by
  uncapped session usage, then deterministic confidence/order tie-breaks. One use
  immediately outranks unused commands; fills remain bounded and non-submitting
  stems/launchers count exactly once. A stem tap followed by its accepted completion
  is paired as one action rather than being counted twice.
- Automatic mapping, items, navigation, notes, transcripts and portable save
  packages.
- Offline application shell with local Roboto Mono; no legacy upload endpoint
  or remote font dependency.
- Android backup disabled and app Internet permission removed.

Real-device speech behavior must be reported only for devices on which it was
actually tested. Glulx remains play-only for mapping/actions.
