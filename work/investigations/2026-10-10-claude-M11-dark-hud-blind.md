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

## Comparison with codex's sealed findings (read after sealing)

- **Agree:** the root cause (whole-transcript cues in DarkScope.js 13-16, sticky by construction), HHG reproduced, room identity and map records correct.
- **Codex adds:** `payload.darkness` stays FALSE; only the HUD metric "dark (heuristic)" (merged at WorldModel.js 408-409), the `pl-dark-scope` class and the dimming are stuck. This is a display/telemetry defect.
- **Prior record (missed in my seal):** PRODUCTION_PLAN 8367 already lists "DarkScope's history-based dark verdict, which needs current-turn evidence before it gates anything" as a known out-of-scope residual. M11 is a reproduction of that residual, not a new mechanism.
- **No disagreement.**

## Proposal (planning only)

DarkScope judges current-turn evidence only.
- (1) Deterministic first, where available: an Inform location global holding "(darkness object)" = dark.
- (2) Otherwise, text from the LATEST reply only (since the last command echo): a dark cue sets dark; a printed room heading/description without a dark cue clears it.
- No whole-transcript scan.

The geometry fixes (filter -> opacity, ARCHITECTURE 2528/2534) stay untouched. Guards: an HHG dark -> lit -> outdoors route, a Zork dark-room negative control (grue darkness must still show dark), plus exits-safe-area / layout-regression.
