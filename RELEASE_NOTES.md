# ParchLock Release Notes

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
