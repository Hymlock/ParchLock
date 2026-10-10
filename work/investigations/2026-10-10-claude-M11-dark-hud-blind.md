# M11: the HHG map keeps "dark (heuristic)" after lighting and outdoors. Claude blind findings, SEALED

Written before reading codex's work/mapping-research/M11-dark-hud-sealed.md.

**Reproduced** (Hitchhik.z5, typed commands): after TURN ON LIGHT, GET OUT OF BED, TAKE/WEAR GOWN, OPEN POCKET, TAKE ANALGESIC, EAT ANALGESIC, SOUTH (Front Porch), NORTH, `DarkScope.dark` stays TRUE and `html.pl-dark-scope` stays set on every turn.

**Root cause:** `js/DarkScope.js` `noteText` evaluates the WHOLE transcript (`BufferRevision.text("#windowport")`), not the latest reply.
- `darkCue` (pitch dark | too dark to see | darkness | in the dark ...) matches anywhere in history, so once HHG's opening darkness is printed it is set forever.
- The light clear requires a light cue AND no "pitch dark | too dark" anywhere in the whole text, which can never be true after the first dark scene. The flag is sticky by construction.
- It is also a pure text heuristic (confidence 0.5), contrary to the operator rule "deterministic first, text confirmation, text alone only as a last resort".

**Side effects of a stuck flag:**
- the "dark (heuristic)" HUD chip and the World/local map label;
- `html.pl-dark-scope` dims #windowport (now opacity, item 5);
- anything consuming `payload.darkness`.

**Fix direction:**
- (1) **Deterministic first:**
  - Inform stories: the location global (D84 learned or v3 global0) holding the library's "(darkness object)" means dark, any real room means lit.
  - ZIL: the room's lit state from the story's own LIT/ONBIT evidence. Research needed: which global or attribute, decoded without per-title rules.
- (2) **Text fallback,** only when no deterministic signal exists: judge ONLY the latest reply (text since the last command echo). A dark cue sets dark; a room heading/description printed without a dark cue clears it.
- (3) Never scan the whole transcript.

**Prior decisions to check before proposing:** item 5's opacity change (only the dimming mechanism, not the flag) and any D-entry on DarkScope (none in DECISION-INDEX under "dark").
