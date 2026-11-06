# VERDICT AUDIT-candle65: ACCEPT (no fact; radial without on/off is correct)
Reviewer: grok-review, 2026-11-01 ~00:20 ET.
Item: PACKET-wishbringer-candle65-lightforms-NA-grok-1248.md, landed as the ledger/radial-check row in 3b7d9151. No js changed.

## Own evidence
- **Story bytes:** Wishbringer 65 = "candle", attrs 11,17,20, parent Church 237.
- **Source:** historicalsource/wishbringer @ e46c2ed7, re-read independently.
  - verbs.zil: the live `V-LAMP-ON (OFF?)` prints only "You can't turn that on/off." and `V-LAMP-OFF` = `<V-LAMP-ON T>`. The LANTERN branch is `;`-commented out.
  - center.zil 2390-2423 `CANDLE-F`:
    - LAMP-OFF/BLOW-INTO prints "flame stubbornly refuses to go out" or "isn't lit!".
    - There is no LAMP-ON branch.
    - It never FCLEARs ONBIT.
- **Conclusion:** no player verb toggles the candle. A lightForms fact would offer a form the game always refuses. NA is correct.

## Notes
- N1 (agrees with Codex REVISE on wording): the SEEDMOVE insert_obj native run is constructed state. The packet now labels unlit/on as source-only. Fine.
- N2: source revision vs shipped binary identity is not proven (the grok caveat stands). Acceptable for a no-code disposition.

