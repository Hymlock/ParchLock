# Independent audit, batch-r15.diff (claude reviewer, 2026-10-24, read-only)

Enumeration: zil-attr-analyzer.js story() + vm-loaded js/ZRamReader.js shortName, v3 object table, initial memory.

## (1) ModuleStatFactsClaude.js supporter rows

Bits: Suspect 15, Hollywood Hijinx 27 match SURFACEBIT in source flags and the r3-claude evidence. No collision with the rows' other mapped bits (Suspect 16/13/31/19; HH 22/18/14).

Suspect, carriers of bit 15 (id name cont16 anim31 open13):
89 Veronica's body 1 1 1 | 137 workbench 1 0 1 | 146 sideboard 1 0 1 | 147 table 1 0 1 | 154 side table 1 0 1 |
159 toilet 0 0 1 | 164 mantel 1 0 1 | 183 small desk 1 0 1 | 184 large desk 1 0 1 | 229 end table 1 0 1 |
233 window seat 1 0 0 | 246 (unnamed global holder) 1 1 1.
- Open/Close lost (openCapabilityAllows, AttributeSchema.js:127-143; ActionSynth.js:142): workbench, sideboard, table, side table, mantel, small desk, large desk, end table, window seat (9). Veronica's body and 246 were already excluded by animate.
- canSeeInside (AttributeSchema.js:725-728) is container-first, so the 10 container carriers are unchanged (8 already open=1; window seat open=0 stays hidden). Only the toilet newly shows contents.
- rules.supporter (ActionSynth.js:13) adds Search to all carriers.
- Gap: no native OPEN/CLOSE probe was run on any surface (sus.cmds has none). "put notebook in table" succeeding shows CONTBIT is real, not that OPEN is valid. Most surfaces start open=1, so OPEN is likely a no-op, but that is inferred, not measured. The window seat (cont 1, open 0) is the one carrier where Open could be a real action.
Verdict: OBJECT (narrow) — run native "open window seat", "close large desk", "open table" before accepting the none-list change; the attributeMap supporter 15 addition alone is ACCEPT.

Hollywood Hijinx, carriers of bit 27 (ids <240): 9/82/184 wax statuettes, 128 bed, 194 mantle, 207 pile of cannon balls, 211 table, 69 (unnamed, animate). Ids 245-254 are past the object table and ignored.
- No container mapping in the row, so openCapability.all ["container"] already fails: no Open/Close change.
- canSeeInside: all named carriers now show contents (no container key, so the supporter branch applies). Search added. Statuettes/cannon balls get an extra Put on/Search (disclosed as harmless).
Verdict: ACCEPT.

## (2) ActionSynth.js D236 zilE
isInformCompiled moved inside the try; on exception zilE=false, the block is skipped, both Enter/Exit offers stay. memE null -> zilE false, same as before. Behaviour identical otherwise (batch-r15.diff hunk at ActionSynth.js:388-393).
Verdict: ACCEPT.

## Claude disposition (2026-10-24): native Open/Close on Suspect surfaces
r3-claude/animate-supporter/_sus-openclose.run.json (ordinary commands): "open table" -> "It's already open."; "close table"
-> "You can't close the table."; "open mantel" -> "It's already open."; "close mantel" -> "You can't close the mantel.";
sideboard is not a parser word; window seat not reached (not in the probed rooms). Open/Close on these container-surfaces
is a wrong offer natively, so supporter in the Open/Close none list is correct. Objection resolved.
