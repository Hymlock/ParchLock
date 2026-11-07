# Phone check, A Little Like Rogue (LLR3), 2026-11-06, device 91260151019C

Build 78 (c40bb2db), then Build 79 (4eafa7ed) after two fixes found on the phone.

| Check | Result |
|---|---|
| Typed INVENTORY shows only the game's reply | PASS (B78) |
| Opening Equipment (hidden inventory probe) adds no story lines | PASS (B78) |
| Status card Depth = 1 at start, 2 after "enter trapdoor" | PASS (B78) |
| World map puts depth 2 on its own level | PASS (B78) |
| World map level buttons named by depth | FAIL on B78 ("Level 1" was depth 2) -> fixed 836f7214, PASS on B79 ("Depth 1", "Depth 2") |
| Local map shows the landing room alone, no up link (the game has no way back up) | PASS |
| "*** You have been killed in combat ***" counts: Deaths this playthrough = 1 | PASS (B78) |
| Deaths tile label wrapped mid-word ("PLAYTHROUG/H") | FAIL on B78 -> fixed (overflow-wrap: break-word) 836f7214 |

Not a bug: ParchLock Help opens at story start when there is no save (Prefs.ShowInfoOnStart, js/Message.js:18).
Not checked on B79: the Deaths tile wrap (needs another death); depth 3+.

## 2026-11-07 ~22:10 ET, Build 79, same device

| Check | Result |
|---|---|
| Zork I mailbox radial offers Open; after OPEN ("reveals a leaflet") the radial offers Close; leaflet underlined | PASS |
| A6: Options > Accessibility & controls: Configure directions..., Replay tutorial, Reset tutorial render in the sans UI font | PASS (A6 closed) |
| Guess the Verb (M5): after NEW, map shows Verb Guessing Booth with The Midway (NE) and Behind the Booths (SE) | PASS |
| Note (harmless, missing-over-wrong): Zork I mailbox radial also offers "Cast at..." | noted, not fixed |

Still not phone-checked: Advent rewind from a map box, Book and Volume label (M14), Sherlock clock (S4), Deaths tile wrap (needs a death), seated move (M6).
