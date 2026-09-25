# ParchLock Release Notes

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
