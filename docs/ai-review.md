# AI Review

## D109 review target
Verify that Anchorhead, anchor, and anchored receive the K-sound spelling hint; anchovy,
ranch, and visible story text remain unchanged; repeated preparation is idempotent; and
Android/Web engines receive the same prepared bytes.

## D108 review target
Verify same-element suffix capture, no replay after underline wrapping, complete
blank-separated Driving and Huge Cave output, diagram geometry suppression with labels
retained, all-caps and compass pronunciation, exact preservation of normal dash/colon
prose, idempotence, and byte-identical native/Web Speech payloads. Reject module-title
exceptions, fuzzy deduplication, timing-based collection, or engine-specific cleanup.

## Active Review: D100-D104 (claude, 2026-09-21)

Self-audited because both other seats are out of credits (no independent reviewer): skip-repeats read line by line (consecutive-only, replaced each flush, cleared on seedSilent/clearSessionMemory, default off) and exercised by harness/d100-live-turns.js off/on/consecutive cases; D102 and D103 audited by live probes on real Anchorhead at 412x860 (no defects). Residuals: no real-device evidence; live-turn harness stubs the native plugin only; dialogs remain opt-in.

## Active Review: D103 mobile gesture tutorial

Status: **READY FOR ADVERSARIAL REVIEW** (Codex implementation, 2026-09-21). Review should verify
that the tour appears once only after a real mobile line prompt, accurately distinguishes quick tap
from actionable hold and input hold, writes completion only on an explicit dismissal, replays through
Options, remains absent on desktop, and leaves all existing gesture/command paths unchanged. Focused
evidence: expanded D96 98/98 plus portrait/landscape visual inspection. Broader regression pending.

## Historical Review: D102 mobile menu simplification

Status: **REVIEW-PASSED** (Codex implementation, Claude live adversarial probe, 2026-09-21). Scope is
deliberately narrow: remove the mobile bottom Menu control and add its three unique
actions to the existing Tools list. Input/submit long-hold radial access and desktop are
unchanged. Focused evidence: D96 82/82. Claude's independent real-Anchorhead probe found
no defects: mobile handle absent/zero-height, real line-input touch hold preserved, 16
unique comprehensive list entries, scroll/sticky-close/last-item reachability, and the
original 13-entry desktop Tools radial unchanged. Android Back and the accepted no-prompt
reachability interval were not part of Claude's browser probe.

## Historical Review: D101 UI repair

Status: **REVIEW-PASSED** (Codex implementation, Claude adversarial review, 2026-09-21). The D99 broad
font-scaling experiment remains rejected and removed. D101 instead scales only normal
reflowable mobile story prose relative to the default preference, leaving D94's fixed
grid/preformatted/heading character cell untouched. The duplicate Tools correction is
now directly asserted in both the game and Tools menu contexts.

Evidence: D94 54/54 and D96 112/112 in real Chromium across five mobile viewports plus
desktop. Claude's review found the smallest prose setting could fall below D94's 9px
floor; that was fixed and permanently tested. Its maximum-size concern was checked live:
Anchorhead's padded title is fixed `Style_user1`, remains unwrapped, and is now guarded at
preference 30. Claude found no defect in the menu de-duplication. Grok remains isolated
to D100 read-aloud work. Packaging is intentionally deferred until D100 settles.

## Historical Review: D99/D98

Status: **REVIEW-PASSED WITH RESIDUALS** (Grok, 2026-09-21). Implementation audited
against `PRODUCTION_PLAN.md` §§12–13 and `ARCHITECTURE_UML.md` §§34–35. Evidence in
`PRODUCTION_PLAN.md` §12.8 and `tools/screenshots/matrix/d99-grok-*.json`.

Passed: ParchLock identity/credit; D98 ModuleLibrary; runtime/source allow-lists;
Emglken runtime exclusion; Android `com.parchlock.app` + allowBackup=false + no INTERNET;
15/15 critical harness suite; Tools duplicate menu fix. The original broad Display font
experiment was **fully reversed** per operator (D94 cell sync preserved); D101's later
prose-only reading scale is a separate implementation and does not restore that path.

Residuals (not greenwashed): d22-holistic-scope Wumpus/zblorb pending-scope;
`lib/pm_vm_probe*` ABI name; operator external gates (story removal, keystore/release
APK, legal, real-device mic, splash provenance, name clearance).

## Historical Review: D88 Plan Review

READY FOR IMPLEMENTATION, not implemented. The double-blind proposals agreed on an
additive semantic descriptor and independent engine/compiler dialect providers. The
adversarial challenge is incorporated as mandatory gates rather than left as review
notes.

Review must reject implementation if behavioral text alone promotes an unknown command
to INSPECT, if missing INSPECT falls through to another action, if consumers reconstruct
commands separately, if dictionary membership is treated as grammar proof, if active
probing occurs, or if build/locale/ambiguity/touch boundaries are not tested.

The final review target is a frozen build tested against held-out stories whose
title/serial labels were unavailable to product assertions. D87 audit repairs remain a
separate READY_FOR_REVIEW body of work.

## September 16 Audit Repairs

READY FOR REVIEW, not yet operator-approved. Real Bronze/Zork/Anchorhead/Wumpus,
cross-game mobile/desktop UI, navigation failure, import fault-injection, recorder,
calibration, action synthesis, and portable PHP endpoint gates all pass. The audit
evidence and maintained scope boundaries are recorded in PRODUCTION_PLAN.md.

## Historical September 16 Review Target
TBD

## Historical Status
READY_FOR_REVIEW

## Historical Required Fixes
- None known after the post-change matrix.

## Historical Optional Improvements
- None yet.

## Historical Final Review Decision
- PENDING OPERATOR REVIEW

## D110 Review Target (2026-09-22)

Audit `Actionable.usageCount` and `ParchLockQol.RankRadialCommands` against this tuple:
uncapped usage descending, static prior descending, original index ascending. Confirm
that complete commands count only after accepted submit; launchers and `Enter:false`
stems count once at activation; More and center Tools never count. Confirm ranking is
applied before pagination to every adaptive context but not fixed Tools/game lists, and
that ActionSynth/SemanticActions producer order and left-click primary selection remain
unchanged. Evidence currently passes at 144/144 structural and 102/102 browser checks.

Claude review #762 passed those points and identified one defect: accepted usage and
radial tap usage were unconditionally added for stem completions. Operator chose the
exact-once interpretation. Review the follow-up for exact, multiword-stem, slash-command,
abandoned-tap, and unrelated-command cases; verify exact complete-command usage remains.

## D111 Review Target (2026-09-22)

Verify the auto pad cannot trigger for BufferWindow char prompts, desktop, multiple
CharInputs, or app overlays. Verify Glk replacing the HELP CharInput never toggles pad
visibility, manual dismissal is sticky until a true mode transition, automatic exit
never closes a manually opened line-prompt pad, and the uncovered strip still reaches
the keyboard proxy. Treat unknown catalog false positives as an open residual because
ZVM `read_char` provides no allowed-key metadata.
