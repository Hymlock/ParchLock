# Death counter implementation audit, Codex, 2026-10-09

Accepted current `js/StatTracker.js` implementation after serial corrections.
Proposal and canonical D215 reviewed against the actual checkout. Amendments
A1-A3 are explicit: full outcome banners can cover Zork resurrection; native
restore-like output requires an engine-emitted cue; continuation requires a
positively identified authored pause. No speculative deadflag authority.

Reviewed fixes: mixed banner/win outcomes remain unknown, quoted dialogue cannot
be a terminal menu, idiomatic "dead tired" is rejected, ordinary prompts cannot
carry outcome prose into a following command. Product counters retain the D204
restore/undo and accepted restart lifecycle. Input echo, retained output and
startup autorestore without an active submission are excluded.

The engine tap forwards original arguments and return values. Stream variants
read payload argument1. Per-Glk attachment replaces the cross-engine boolean.
Capture is disabled during ordinary gameplay; a direct mock verifies both
stream capture and the ordinary-output bypass.

Focused validation run independently:

- `node harness/death-terminal.js`:35 pass,0 fail, including the subsequently
  added capture-bypass, stream-forwarding and single-attachment fixtures.
- `node harness/stat-render-diff.js`:10 pass,0 fail.
- `node tmp/death-independent-native.cjs`: supplied HHG save starts at0 deaths;
  its fresh ending and authored RETURN pause settle to1 death, while line input
  remains and the interpreter has not exited.
- Direct tap mock: streamed "Better luck next life." captured when enabled;
  ordinary output leaves capture empty when disabled.
- Syntax and scoped diff checks pass.

Peer additionally reports native Zork grue1 and ordinary/quit controls0. This
audit does not claim physical-phone validation or universal detection of all
custom resurrection schemes. Glulx restore-like endings without a tapped engine
stay conservatively excluded. No full module-catalogue sweep was run.

Accepted source checkpoint:`af89695`. Bus acceptance:2169.
Bus evidence:2155,2157,2161,2162,2164,2165,2166. The premature mock finding2163 was
corrected in2164 after inspecting the concurrent revision; it is superseded.
