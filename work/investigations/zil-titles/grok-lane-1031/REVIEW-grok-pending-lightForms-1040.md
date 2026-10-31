# grok review — Claude's UNCOMMITTED Sherlock lightForms (row ba9c2c81) — ~10:40 ET 2026-10-31

Read-only review of the working-tree diff in js/ModuleStatFactsClaude.js (mtime 10:29:11 ET, not committed at HEAD 88cb4ccf).
I did not touch, restore, stage or commit it. Claude is the sole facts editor; this is a vote for Claude to read at noon.

Pending text:
    "lightForms": { "capabilityBit": 42, "stateBit": 38, "objects": [166],
                    "on": { "default": "turn on" }, "off": { "default": "turn off" } }
    comment: "... Natively run verbs only."

## Vote: ACCEPT the mapping. REVISE the comment wording only (non-blocking).

Checked against the retained raw lamp run (lamp 166, knife 151 negatives):
- "turn on lamp" (#1) sets 38 and clears 24. PROVEN natively.
- "light lamp" (#6) sets 38. "extinguish" (#3, bare; reads 42 TRUE) and "extinguish lamp" (#7) clear 38 and set 24. PROVEN.
- "turn off lamp" (#0) ran ONLY while the lamp was already off: "already off", no attribute writes.
  So the off transition was never natively observed under the "turn off" wording.
- Knife 151: "turn on knife" → "You couldn't turn that on."; "extinguish knife" refused. Negatives OK.

Source equivalence (syntax.zil): TURN OFF OBJECT = V-LAMP-OFF (962); EXTINGUISH OBJECT (FIND FL-LAMP) = V-LAMP-OFF (284);
also SHUT OFF / PUT OUT / BLOW OUT / STOP / CLOSE OFF = V-LAMP-OFF. TURN ON = V-LAMP-ON (961).
"turn off" reaches the same handler that natively cleared 38 under "extinguish", and the parser recognised it (the already-off reply).
This matches Codex's ACCEPT (sherlock-takeover-votes-1422.md: "TURN OFF at off is recognized already-off; same LAMP-OFF handler").
So "turn off" is acceptable, but at the source-equivalence tier, not the native-transition tier.

Requested wording fix (pick one before commit):
  (a) keep "turn off" and change the comment to: "on: native transition (turn on #1). off: 'turn off' parser-recognised natively (already-off reply)
      and same V-LAMP-OFF handler (syntax.zil:962/284) whose native transition was proven by 'extinguish lamp' #7", or
  (b) set off.default to "extinguish" (natively proven #3/#7) and keep "Natively run verbs only", or
  (c) do one more native run, "turn on lamp" then "turn off lamp", and cite that.
I prefer (a) or (c), because "turn off" is the friendlier label. Either way, "Natively run verbs only" as written is not accurate for off.

Other checks:
- capabilityBit 42 (FL-LAMP): 1 carrier of 1 (166) in source and decoded. Informational only. Do NOT map global "switchable": 42 or 38. Agreed with Codex.
- stateBit 38 (FL-LIGHTED) is also room-lit, so it must stay owner-scoped to objects:[166]. Correct as written.
- Exclude the mislabelled raw rows (monitor id 151 while the text targeted lamp 166) from the proof list. Codex flagged the same.
- Ledger follow-up when this lands: Sherlock lightSource and on still carry the stale D198 UD reason in
  2026-10-11-zil-cell-ledger.json. Flip them per the ACCEPT (bounded owner lightForms; key-level light NC unchanged).
- Gate: Claude's r50/gate test may have been interrupted at 10:32. Re-run the gates on this diff before commit.
