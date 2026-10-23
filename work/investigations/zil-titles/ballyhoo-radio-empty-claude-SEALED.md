# Ballyhoo radio radial offers Empty (and Open/Close) - claude sealed findings (2026-10-23)

Blind: written before reading codex's radio file or capture (codex #4521 request).

- Source (historicalsource ballyhoo 9f779e8, way.zil:2815): OBJECT RADIO FLAGS LIGHTBIT TAKEBIT OPENBIT CONTBIT
  (ONBIT, TRYTAKEBIT, NDESCBIT, SEARCHBIT commented out). It is a container only because it holds its own part:
  OBJECT DIAL (IN RADIO) (FLAGS NDESCBIT) way.zil:2950.
- RADIO-F (way.zil:2826) refuses OPEN/CLOSE: "It's one of those non-opening models." No EMPTY/SEARCH clause.
- Native (zil-walkdiff, Jericho ballyhoo walkthrough 0-185 + extras; raw zil-titles/raw/ballyhoo-radio-container-native.txt):
  radio 48 bits [15,18,22,23,24,26] held (parent 211), dial 18 parent 48.
  EMPTY RADIO -> "The radio dial: Absolutely insane." (refused, dial stays); SEARCH RADIO -> "You can see nothing
  extraordinary."; LOOK IN RADIO -> "nothing interesting"; OPEN/CLOSE RADIO -> "non-opening models". No state change.
- App: Ballyhoo attributeMap container 23 + openCapability all:[container] -> ActionSynth.rules.container gives
  search/empty/open/close for the radio. Bit 23 (CONTBIT) is set on the radio, so the decode is correct; the offered
  actions are not useful: every one is refused or a no-op natively.
- Cause: container capability is offered from the structural bit for a container whose only content is a hidden
  part and whose own handler refuses opening. Not a mis-decoded flag.
No fix proposed (blind stage).
