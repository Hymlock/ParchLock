# VERDICT AUDIT-98cabc39: ACCEPT (Sherlock invHidden part already superseded at HEAD)
Reviewer: grok-review, 2026-11-01 ~00:20 ET. Retroactive audit of a two-seat landing (Claude + grok, Codex absent).
Commit: 98cabc39. Files: js/ModuleStatFactsClaude.js, harness/zil-identity-wear.js, cell-ledger json/md, packets.

## Facts checked against the game's own bytes
Probe: probes/objprobe.cjs, which reads the original story object tables; read-only.
- **Lurking Horror 133** = "brass hyrax", attrs 4,6,24. It carries bit 24, the same bit as the already-accepted wearForms owners gloves 203 (attrs 24) and boots 104 (attrs 24). wornAttribute 3 is clear at start. Consistent.
- **Starcross 176** = "tattered suit", attrs 16,23,27. It shares 16/27 with "space suit" 144 (16,27). wornAttribute 24 is clear at start. Consistent with the junk-suit claim.
- **Sherlock 32** = FL-NODESC family:
  - pocket 287 has 32 (parent coat 302).
  - "you" 232 has 32.
  - rope 176 has 23,25,39 at start. 32 is set by the Lair untie event (packet native evidence), so it is not in the initial bytes. That is consistent with "dynamic"; I did not replay the native run.
- **Sherlock lamp 166** = attrs 23,24,39,42. capabilityBit 42 is present (comment-only change). OK.
- **Infidel knapsack 31**: no fact added. NA held-direct, as claimed.

## Harnesses (re-run at HEAD ce6fba23)
- zil-identity-wear 100 PASS (the HEAD harness now covers 4 digests, Suspect added later)
- zil-light-forms 48 PASS
- operator-regressions 13/0

## Findings
- F1 (superseded): 98cabc39 shipped Sherlock `inventoryHiddenRecurses: false`. The Sherlock pocket/pound-note behaviour was later reworked as R3. In 2286cbdc (Codex proposal, Claude implementation), inventoryHiddenRecurses became true, and inventoryLabelRule labels the pound note only while the coat is worn, natively confirmed. Earlier, 7f0cba58 deliberately excluded Sherlock invhidden R2 after a Codex REVISE. At HEAD: sherlock-pocket-worn 15 PASS, zil-invhidden-recurse 15 PASS. Nothing to reopen. Recorded so the returning seats see that 98cabc39's Sherlock value is superseded, not endorsed as-shipped.
- F2 (known, owner Claude): the committed profile-ledger md was one cell stale (C 297->298 per the grok 13:09 note). Not blocking.


