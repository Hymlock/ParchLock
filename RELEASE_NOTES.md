# ParchLock Release Notes

## Build 101 (release candidate, 2026-11-14/15)

- Hall Equipment: carried/worn CharArt inventory in Main Hall (HallSnapshot.CharacterInventory).
- Status chips: Eamon skills pack two-up (numeric percent/fraction).
- Read-aloud: decorative asterisks not spoken.
- Phone acceptance: P1, P3, P4, P5, N4 PASS; P2 marked partial/off.
- Showcase package pin: fd291722… (0.1.0-dev-hallinv).
- Android versionCode 100 / 2.0.100; shell cache 200. Not Play-signed (no keystore in env).

## Build 100 (test build, Hall inventory) - 2026-11-14

- Eamon Main Hall: Equipment lists the character's carried and worn gear (CharArt), not an empty Yourself row.
- Read-aloud: decorative asterisks (`***`) are not spoken.
- New Showcase package digest (0.1.0-dev-hallinv). Android versionCode 100; shell cache 200. Not a public release.

## Build 99 (test build, status packing) - 2026-11-14

- Eamon status card: weapon skills, spells, learning and charm are numeric chips and pack two-up in Equipment (no full-width text rows). Freeform lines (armour name, conditions, rare boosts) stay full width.
- Android versionCode 99; shell cache 199. Not a public release.

## Build 98 (test build, Eamon stats) - 2026-11-13

- Eamon: the status card shows the game's own figures in the Main Hall and in every adventure: health, intellect, hardiness, agility, charisma with their bonuses, weapon and spell abilities, armour and armour expertise, weight carried of the limit, gold and bank. Nothing is sent to the game behind the scenes.
- Eamon: each adventure shows only what its own STATUS shows (health only where STATUS is not available; The Vile Grimoire of Jaldi'al shows its health percentage and conditions). Temporary boosts (speed, the magic dagger) are shown apart from the base value.
- New Showcase package (0.1.0-dev, a new digest); campaigns carry over.
- Android versionCode 73; shell cache 198. Not a public release.

## Build 97 (test build, Eamon saves hardened) - 2026-11-13

- Eamon saves: names use letters, digits, spaces, apostrophes and hyphens (words like "and" would split the command); the dialog cannot delete or rename an Eamon save; a refusal is shown once, after the game's own reason; a new save is listed at once; a save keeps its transcript and map after the app restarts.
- Eamon: when the game itself offers "Restore a saved game" (after a death), ParchLock's restore dialog is used instead of the game's slot list.
- Eamon: no menu keys at an adventure's ">" command line; a sword's menu no longer offers Eat, Drink or Wear.
- Android versionCode 72; shell cache 197. Not a public release.

## Build 96 (test build, Eamon saves and menus) - 2026-11-13

- Eamon Showcase: one save system. Tools > Save, Tools > Restore, the Save files buttons and a typed SAVE or RESTORE all use ParchLock's own save and load dialog; Eamon's slot menus no longer appear. Where saving is not possible, a pop-up says so.
- Eamon: numbered choices of two or three digits (adventures 10 to 23) are underlined; a list shown in pages keeps every page's numbers live at "Enter the selection"; "or X to exit" underlines X.
- Eamon: the Hall desk key D is no longer shown as a compass "Down"; an old map repairs itself on the next visit.
- Android versionCode 71; shell cache 196. Not a public release.

## Build 95 (test build, Eamon maps) - 2026-11-13

- Eamon: the room an adventure starts in is on the map at once, not only after leaving it.
- Eamon: a yes/no question asked inside a room no longer adds its keys to the map as exits.
- Eamon: The Pyramid of Anharos now has its map, exits and underlined words (they were missing for the whole adventure).
- New Showcase package (0.1.0-dev, a new digest); campaigns carry over.
- Android versionCode 70; shell cache 195. Not a public release.
- APK SHA-256 554d1c70f769871c... (the update test package is trusted in this APK only).

## Build 94 (test build, Eamon prompt answers) - 2026-11-13

- An Eamon key (an underline or a radial entry) answers only the question it belongs to, and only while that question is waiting; a radial left open after the game moved on does nothing.
- Android versionCode 69; shell cache 194. Not a public release.

## Build 93 (test build, Eamon prompt answers) - 2026-11-13

- At an Eamon question inside a scene (Y/N, a shop step), only the question's own underlined keys and the matching radial entries answer it; a compass chip, fast travel or any other ParchLock command never does.
- When an Eamon story ends, the last menu's keys are no longer offered.
- Android versionCode 68; shell cache 193. Not a public release.

## Build 92 (test build, Eamon prompt keys) - 2026-11-13

- A refused answer (a wrong key at D/M, Y/N, a Hall or shop menu) keeps the question's keys underlined; the map, Equipment and a reload do not drop them.
- During character creation the radial offers the prompt's own keys (Y/N, 0/1, R/T) and choosing one answers it.
- Android versionCode 67; shell cache 192. Not a public release.

## Build 91 (test build, Eamon prompt keys) - 2026-11-13

- Only the waiting Eamon prompt's keys are underlined and on the radial: an answered single-key prompt (D/M, Y/N, 0/1, R/T) no longer stays tappable, so a stale key can never be sent to a later prompt. Verified on PC with real clicks and typing on a fresh load, including a 21 s idle before answering.
- Android versionCode 66; shell cache 191. Not a public release.

## Build 90 (test build, Eamon conversion layer) - 2026-11-12

- Eamon conversion layer: each prompt and menu is read for its exact accepted keys, which become the native underline targets (key only), radial and compass / non-cardinal chip entries, and map edges. Option phrases are not underlined and cannot claim those keys, so D and M in "Press D for desk or M for men" are tappable, desk and sign stay examine targets, and Main Hall / Village menu lines underline only 1-7/X.
- The top #exits chip strip is the existing non-cardinal exit band; Hall exits now use the key as the label, so chips read "1 -> Weapons and Armor Shop" (or just "5") instead of "Weapons and Armor Shop -> Weapons and Armor Shop".
- Prompt-key underlines persist when the map is opened and closed. Regular Z-machine modules are unchanged (the layer is Eamon-only).
- Android versionCode 65; shell cache 190. Not a public release.

## Build 89 (test build, Eamon menu keys and module list) - 2026-11-12

- Menu and prompt choices use ParchLock's native dotted underlines (Actionable.Refresh, wrapTargets, wrapFirstExact, span.pl-act, retained by retainMarks): the number/letter keys in the Main Hall, Village, Practice Area and other Eamon numbered or lettered menus, plus Press D/M, (Y/N) and (R/T). Option phrases are not underlined. Tapping a key sends that key.
- Hall special phrases are no longer underlined as phrases. Room commands such as Examine your abilities appear on the existing abbreviated nav chips and send the engine key.
- Newly added modules appear in alphabetical order by display title (case-insensitive) immediately after import.
- Hall/Village map edges that were recorded on the wrong room are dropped the next time that room is visited (live snapshot is authoritative). Existing saved maps are not migrated.
- Android versionCode 64; shell cache 189. Not a public release.

## Build 88 (test build, Eamon Showcase input fix) - 2026-11-12

- Fixes the input relay crash after ~20s idle: a 204 poll response no longer carries a body, so timed-out polls cannot throw and freeze all input on PC and phone.
- Hall and prompt choices are offered as underlined tappable words, not the floating special-command bar (the giant "Join the men drinking beer" overlay). Single-key letters in prompts such as "Press D for desk or M for men" or "(Y/N)" are tappable and answer the prompt directly.
- Android versionCode 63; shell cache 188. Not a public release.

## Build 87 (test build, Eamon Showcase) - 2026-11-12

- Test build for phone checks of the Eamon Showcase work: campaign carry-over across Showcase releases (free recall from a changed adventure, update warning, save-format refusal with Download Package and Start a new campaign), the Outer Chamber and Hall rooms, Equipment sheet checks, and transcripts, save snapshots and learning kept with the campaign. Android versionCode 62; shell cache 187. Not a public release.

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
