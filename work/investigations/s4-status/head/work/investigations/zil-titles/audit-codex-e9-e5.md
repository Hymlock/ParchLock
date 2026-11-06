# Audit: codex E9 (loader identity) and E5 (Zork3 worn-custody prototype r1) — 2026-10-30

## A) E9 — verdict: ACCEPT (with one scoped exception, REVISE wording)
Confirmed: js/ModuleLibrary.js:476-509 `installAjaxAdapter` wraps jQuery.ajax; built-in branch returns
`requestResult.then(captureExecutableIdentity)` (:487-488), local/ branch resolves only after
`captureExecutableIdentity(...).then` (:498-499). Installed twice (:713 init, :729 at script load); script order
index.html:44-47 puts ModuleLibrary.js after jquery and before the game loader, so lib/main.js gets the base64 only
after the digest promise resolves. No ordinary Parchment/Quixe/ZVM cold-boot window found.
Other paths checked:
- Local file picker / module import (ModuleLibrary bindPicker ~:700-703, Qol.js:545 FileReader): store bytes; play goes via `local/` ajax branch -> covered.
- SaveState.js / Transcript.js autorestore (Transcript.js:61,167,329): engine autorestore happens after VM start, which is after identity -> covered.
- VmProbeLoader.js:141-152 fetches story bytes separately but is a probe, does not start the VM.
- **Exception: HostEmglkenBridge.js:40-64,109-115** (opt-in via `?vm=emglken`/`host=emglken`/`parchment_options.use_emglken`, EmglkenHost.js:20-25): the story runs inside an iframe (`frame.src = buildSrc()` :48) that never passes through the parent jQuery.ajax adapter, so no exact identity is ever captured; input can begin with identity null. Not a cold-boot "loss window" on the default path, but the E9 claim "across all loader paths" is too broad — state the Emglken host as uncovered (identity never resolves; pending ops stay queued).
- E9-current-source-investigation.md is at oct30-recovery/ (not inside e9-loader-identity-investigation/). Its residual (process kill between enqueue and digest+flush loses volatile events) stands as a durability boundary, not a defect.

## B) E5 — verdict: REVISE
1. **Does not apply to HEAD 3d20614.** `git apply --check --cached` fails on all 7 files (Actionable.js:1325, ActionSynth.js:289, AttributeSchema.js:642, EquipmentUI.js:47, LearnedWords.js:147, ModuleStatFactsClaude.js:136, SemanticActions.js:349). It applies only with `--ignore-whitespace`: the patch is LF, the tree is CRLF (rebase-source-manifest.json itself shows rootRawHashes != copiedLFHashes for AttributeSchema/ModuleStatFactsClaude/SemanticActions). Against the working tree it also fails on AttributeSchema.js and SemanticActions.js (uncommitted local AttributeSchema.js edit, +4/-1). Regenerate against raw CRLF HEAD bytes, or document `--ignore-whitespace` and recheck after the dirty AttributeSchema.js change lands.
2. Delta review (logic looks sound, fail-closed): `wornRemovalForm` requires live-mem identity, confirmed ZIL family, v3-5, no Inform attr names, measured player, object parented to player with the wearable bit; `wornRemovalScopeFor` additionally binds digest, unique verified noun, validated D198 `drop` template, authored-command allow. Shared/multi-select excludes worn-scoped entries (EquipmentUI/Actionable hunks). Concerns:
   - ActionSynth hunk: `ModuleLibrary.currentExecutableDigest()` returns null under the Emglken host (see A), so Drop silently falls back to "remove" there — acceptable fail-closed, but note it.
   - Actionable.js:1325 hunk replaces the `learnedWordScope && LearnedWords.commandCurrent` guard with `Actionable.radialCommandCurrent(cmds[0])`; confirm that helper still enforces the learnedWordScope check (prior-fix guard), otherwise this regresses LearnedWords currency.
3. Focused controls (selector/public-resolver/consumer/more-prior .cjs) were NOT re-run in this audit; the prior result JSONs are on a whitespace-mismatched base. Re-run in a temp copy after regenerating the patch, plus harness/operator-regressions.js and the 3-type gate.
