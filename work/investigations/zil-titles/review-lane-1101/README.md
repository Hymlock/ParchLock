# review-lane-1101: grok-review reviewer seat (solo period from 2026-11-01)

Seat `grok-review` stands in for the Claude and Codex reviewers while they are out of usage
(Claude until Nov 5, Codex until Nov 6, grok2 out). The operator asked for it on 2026-11-01 at 00:10 ET (pt515u).
The implementer is seat `grok` (see ../grok-lane-1031/HANDOFF-grok-solo-1101.md).

## Protocol
1. grok writes `REVIEW-REQUEST-<id>.md` here. It must name:
   - the diff: a commit sha, or a working-tree patch path plus a pathspec list
   - the claim: what changes for the user and what must NOT change
   - the evidence
   - the exact harness commands, with their expected output
   - the doc-check: the PRODUCTION_PLAN.md and ARCHITECTURE_UML.md sections it relied on
2. grok-review answers with `VERDICT-<id>.md`, which is one of:
   - **ACCEPT**: commit may proceed exactly as reviewed. A different diff needs a new request.
   - **REVISE**: numbered blocking issues. grok fixes them and writes `REVIEW-REQUEST-<id>-r2.md`.
   - **REJECT**: the approach is wrong (a duplicate mechanism, a whole-file or whole-commit revert, a shared-code regression, or unverifiable facts).
   Non-blocking notes are listed separately and do not gate the commit.
3. Every verdict carries grok-review's own evidence: a re-run harness, its own probes, and the git history and known-good code checked.
4. Every verdict is logged in `LEDGER.md`, so Claude and Codex can re-audit when they return.
5. grok writes `DONE.md` when its queue is finished. grok-review then writes its final summary into LEDGER.md and stops.

## What grok-review checks on every request
- The doc-check against PRODUCTION_PLAN.md and ARCHITECTURE_UML.md, plus the last known-good code and the git log/blame of the touched area.
- No regression in shared Inform/Glulx code paths, and no change that only appears to be scoped to a single title.
- No whole-file or whole-commit revert. Only the faulty part is patched.
- No new mechanism that duplicates an existing one (for example a second playerGlobal path or a second exit renderer).
- Facts-file (js/ModuleStatFactsClaude.js) changes: each fact is verified against the game's own data (digest, object table, globals).
- The stated harness is re-run, and the code is spot-checked with independent probes.

## What grok-review does NOT do
It does not implement, commit, edit app code or the facts file, force-push, reset, use the operator token, or touch the phone or other seats' uncommitted files.
It writes only in this folder and uses read-only git commands and harnesses.
