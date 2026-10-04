# AI Review

## Current adversarial audit: D186 declarations, unnamed actions, carry stats

Codex, 2026-09-27 local / 2026-09-28 UTC. Requested reviewer: Grok.
Status: findings submitted for independent challenge; NOT implementation approval.
Snapshot: HEAD 1048b5a plus the current dirty working tree. No runtime edits by
this audit. Preserve other seats' changes; do not treat HEAD alone as the target.

### Operator constraints superseding earlier recommendations

The operator explicitly accepts the automatic inventory workaround for Wumpus
stats for now. Do NOT remove it merely to enforce D188, unless an equally
effective replacement is demonstrated. Protect its behavior while fixing its
side effects. Document an explicit narrow exception in the canonical plan and
architecture when implementing; this review does not silently rewrite D188.
The operator also wants food pellets to retain Take and is interested in an
evidence-based replacement for blanket Take on promoted unnamed objects.

### Findings, in priority order

1. HIGH, reproduced: opening Equipment destroys an unfinished player command.
   EquipmentUI.js:785 calls requestCarryBootstrap, StatTracker.js:1528 schedules
   Submit, and Actionable.js:600 clears the input. A fresh Anchorhead browser
   session with input `examine coat`, then EquipmentUI.Show(), recorded command
   `inventory`, input `''`, and five hidden pl-carry-probe lines. This is a data
   loss side effect even though automatic inventory is now operator-approved.
   Preserve/defer around a nonempty draft; never silently replace it. Recheck
   prompt ownership immediately before delayed submission.

2. HIGH, reproduced: Actionable.js:386 unconditionally adds Take before inspect
   for EVERY examineOnly object, bypassing attributes and the usual command
   providers. `node harness/stat-tracker.js`: 115 pass / 3 fail, all existing
   D186 promoted-object policy assertions. D184/D185 intentionally separated
   naming evidence from action evidence; D186 supplies a possible narrow repair.
   Do not solve this by removing food-pellet Take with no replacement.

   Fresh live Wumpus evidence, no prior TAKE calibration: promoted object199
   is `pellets`, parent40, dictionary aliases food/pellet/pellets/protein/etc.
   attrsFromObject reads static=false, scenery=false, edible=true, takeable=true
   using the validated declaration table (static24/scenery22/edible11).
   Promotion at Actionable.js:691 discards these attributes into attrs:{}.
   Passing the same object with its decoded attributes to commandsForObject
   produces `take pellets`; a subsequent deliberate `take pellets` returns
   `Taken.` Thus the decoder supports a narrower first-query Take path.
   Proposed repair: preserve scoped identity and printed parser noun, require
   validated declaration-backed takeability (or independently confirmed existing
   evidence), and enable only Take through the shared command policy. Keep
   unknown/static/scenery cases conservative and preserve inspect configuration.
   This proves success in the sampled initial state, NOT all custom-handler
   conditions. Full synthesis also offered `drink pellets`; do not broadly
   enable all synthesized actions as part of this fix. After TAKE the captured
   inventory listed only Glow Bar, so unnamed inventory display remains a
   separate unresolved defect rather than evidence of complete pellet support.

3. MEDIUM, reproduced: first explicitly requested inventory value is suppressed.
   StatTracker.js:1247 accepts printed value only when valuePinned or
   preferInventoryText. `node tools/carry-value-live.js`: 16 pass / 3 fail:
   first carrying line creates no value stat, text source, or money display.
   Later RAM pinning still passes, including value changes without inventory.
   Restore authoritative printed-value display independently of confidence in
   a RAM property; uncertain property inference must not discard explicit text.

4. MEDIUM, reproduced reset defect plus statically verified race risk:
   StatTracker.Resync/reset do not clear the new carry flags or cancel the
   untracked bootstrap timeout. Setting hideCarryProbe, carryProbeTurnCheck,
   carryProbeUseless true and calling Resync leaves all three true. Submit's
   false result is ignored. A failed submission can retain hiding/visibility
   exceptions, and a queued callback can run after a prompt/restore transition.
   Use a cancellable, session/prompt-bound transaction; clean up on failure,
   restore, restart, reset and completion. Do not use a global boolean as
   general permission to submit to any hidden input.

5. MEDIUM, static risks requiring targeted tests, not claimed live failures:
   Actionable.js:1033 suppresses every room reset for inventory-shaped commands,
   even if roomChanged/reset is true. A custom inventory handler can change
   location. Preserve real room transitions; suppress only demonstrated benign
   transcript churn. Lines1050-1058 hide the full reply, not just a successfully
   recognized inventory response; errors/questions/turn events can disappear
   from both display and ReadAloud. The restore-question guard is one literal
   phrase, not general prompt classification. Equipment.Show resets the throttle
   on each open. Test repeated opens, errors, custom prompts, refusal and restore.

### Updated Claude proposal review

Mailbox863 is superseded by864: twenty alias recoveries, NOT twenty-five.
Current reader still rejects slash aliases at ZRamReader.js:174; it is not
implemented merely because the proposal and isolated experiment passed.
Accept splitting every segment, validating each identifier, rejecting empty
segments, rejecting one name assigned to different bits, and allowing multiple
names on the same bit. Preserve required-subset whole-map rejection, no per-flag
profile mixing, and wearable/clothing mapping. Library-library aliases are real.

The proposed test "remove one alias segment, reject whole table" needs correction:
removing an OPTIONAL alias while retaining a valid required name should pass.
Removing a REQUIRED name or leaving an empty slash segment should reject.
Add positive and negative mutation cases; test all 271 Inform modules separately
from representative live gameplay. Twenty new decodes alone is not parity proof.

Arithmetic in864 still needs correction: A20+B3+C41 sums to64, not66. The other
two are required-subset failures praser5 and sutwin. Use20+3+41+2, or20+3+43.
The explicit46 inventory is already in PRODUCTION_PLAN pl-s253. Its categories
are FIRST failed checks, not proven root causes. Missing compiler stamps do not
prove symbols were stripped; earlier failures can conceal aliases.

V3 support is not a version-gate edit: current code uses +12 property pointers,
48 attributes, v4+ property headers and scale4/8. A proper V3 locator must account
for its own object/property/string layout and be independently evidenced. Keep
current fallback until that exists. Do not relax bounds to make counts improve.

Removing unused autoIdentify machinery is reasonable if a whole-repo reference
check confirms it is dead; retain explicit Identify stats and unrelated learners.
Messages866/867 requested full861 item2 and860 conditions because previous output
was incomplete. No response received at this snapshot. Accordingly this is NOT
a claim to have reviewed unseen required-subset implementation details. Resend
those details before treating this as final proposal acceptance.

### Verification and limits

- Current rerun: attr-calibrator-phase-cd.js --catalog, 323 pass / 0 fail;
  298 non-Glulx files, 271 Inform, 205 validated tables, 56,974 Inform objects,
  8,589 changed objects. Canteen/Glow Bar first-query tests pass.
- Current rerun: stat-tracker.js, 115 pass / 3 fail (finding2).
- Current rerun: tools/carry-value-live.js, 16 pass / 3 fail (finding3).
- Both embedded chapter validators PASS: plan253 headings/103 rows/356 units;
  architecture87 headings/87 units. Contract comparisons: D184/185/186/188,
  plan pl-s253, architecture sections61/62. Integrity is not semantic approval.
- Prior recorded evidence: declaration live35/35, inventory recovery6/6,
  alias-only experiment20 additional decodes, all46 other fallbacks unchanged.
  These were NOT rerun as new full gameplay coverage in this audit.
- Prior breadth smoke298 with zero caught browser exceptions does NOT establish
  all rooms, custom handlers, save/restore, Android, voice or puzzle correctness.
- No runtime fixes, APK, distribution build, or native-device validation here.

SHA256 snapshot: Actionable C49A237268288AEE60F250C021D6DB7A0272972587D01E15ED54EEBD3BDE4E69;
StatTracker 34249181052F9E540A36A62365F744D8C2BB03EDD4219E3817A1455B01E2D86A;
ZRamReader 5E39C5CA26F54678592DD87914D59212D58D2F728F0A6B217E1DB5941751194F.

Grok: challenge these findings against CURRENT code, reproduce failures, and
review the narrow pellet Take approach. Keep the approved stats workaround
unless an equally effective alternative is demonstrated. Return accept/reject
per finding with evidence and exact paths needed; do not mark the whole work
complete from this report. Update canonical contracts alongside approved fixes.

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

## Edit Learned Words implementation candidate (2026-10-03, codex)
Operator authorized full implementation after #1049/#1051 design consensus. Real Tools editor, isolated overrides, recorder-owned manual revision confirmation, cosmetic owner labels, reversible Ignore/Undo, and an independent first-open tutorial are implemented. X is the single close control; Save/Done absent. Audit package: work/learned-words-implementation-audit.md. New contract suite 26 and browser suite 72 pass; existing equipment/statistics/learning/nesting/semantic/contract/menu regressions pass. Independent Grok implementation audit remains pending. No new APK or device validation. Preserve unrelated PRODUCTION_PLAN.md and diagnostics.

## Edit Learned Words audit round 2 (2026-10-03, codex)
Grok #1054 REVISE: provisional inspect replacement candidates were missing. Added read-only candidate rows and reversible promotion/use suppression, retaining original observations and persisting new observations while ignored. Dedicated contract checks now 30; live browser 72 and inspect regression 22 pass. Reaudit requested; no APK/device validation or overall completion.

## Edit Learned Words implementation consensus (2026-10-03, codex)
Grok #1056 ACCEPT WITH NOTES for runtime commit 9bfac37. Codex checked the cited gates and independently reran learned-words 30/30, learned-words-live 72/72 and inspect-disablement 22/22. Implementation audit consensus reached; no remaining revise findings. Mobile whole-dialog scrolling is an accepted layout note. Android/device validation and a new APK remain outstanding; overall goal completion belongs to the operator.

## Edit Learned Words packaged (2026-10-03, codex)
Packaging commit 9460c56: include LearnedWords.css in distribution allow-list; build 60, Android versionCode 33. build-android.bat dev succeeds. APK C:/Users/hymlo/Downloads/ParchLock-dist/ParchLock-dev.apk (84,130,469 bytes), SHA256 5BD9A26795586DD0C99F42AB1FEC4F099FFA67182D2B4510E580033889A6D371. v2 signature verifies; all 452 web assets match staging and 450 originals; key source archive parity verified. Rebuilt distribution phone-width editor/tutorial smoke and packaging contract 30 pass. No attached adb device, so device behavior remains untested. Runtime consensus Grok #1056/Codex #1057 stands; operator records overall completion.

## Latest underline / editor accordion / spoken spotlight tour proposition (2026-10-03, codex)
Design consensus: Grok #1061 and Codex acknowledgment accept the single amended proposition. Criteria recorded in work/learned-words-editor-proposal.md: latest identical phrase in DOM order with existing ownership/phrase policy; exactly-one-open fixed-header accordion preserving edits; independent ReadAloud speech and visible inert spotlight targets, isolated tutorial lifecycle. Corrected Tutorial.speak source claim. Existing suites do not prove these unimplemented changes. No implementation GO or product edits.

## Proposition final recording clarification (2026-10-03, codex)
Grok #1063 accepted design with recording corrections. Incorporated literal speech separator, independent helpers and existing inset geometry, exact phrase policies and optional header labels. Requested final agreement to reuse existing Edit Learned Words title for the required learned-section header, avoiding a newly coined feature name. No product edits or new feature tests.

## Fixed accordion / latest identical marks / spoken tour candidate (2026-10-03)
Implemented operator-authorized #1065 design. Audit package work/learned-words-final-implementation-audit.md records 114 focused browser checks, 30 contract and 72 live checks, plus relevant regressions. Legacy cutover has two failures reproduced against unchanged HEAD; documented explicitly. Grok independent implementation review pending; prior APK excludes these new changes. Operator retains overall completion authority.

## Operator correction: cumulative ordered banners (2026-10-03)
User rejected moving only the selected banner to top. Changed selectSection to split original four-header order after selected header: prefix above central content, suffix below. Exactly one section open and existing real rows/scroll preservation remain. Distinct gradient surfaces, inset highlight, drop shadow, accent selected border, chevrons and keyboard focus outline added. Cache v105.
Validation: learned-words-layout-tour 146/146 (all four selections at four viewport/inset fixtures), learned-words contract 30/30, live 72/72, syntax and diff checks pass. Inspected work/learned-words-ordered-banners-mobile.png. Grok #1068 ACCEPT WITH NOTES applies to previous fbd9d5d, not this correction. #1069 notified Grok and requested retransmission of truncated notes; correction reaudit requested separately. No new APK/device validation.

## Grok implementation acceptance and next proposition review (2026-10-03)
Authenticated mail #1071 ACCEPT WITH NOTES independently accepts ordered-banner commit556d269; no REVISE findings. Codex reran focused146 and contract30, with live72 verification completed. Android/device/new APK remain outstanding. Grok #1072 is expressly design-only/no implementation GO. Codex replied REVISE #1073: pre-learning membership provenance, session-only provisional display, default Status vs one-panel conflict, toolbar/settings control contract, observed duplicate display names and mixed-owner radial command policy need amendment. Full source-grounded reply work/learned-words-proposition-adversarial-reply.md. No product edits this round.

## Proposition adversarial round 2 (2026-10-03)
Read authenticated Grok #1074 ACCEPT WITH NOTES/design-only. Source and normative plan review accepts most reconciled design. Codex reply identifies three residual contract ambiguities: module load actually hydrates persisted learning (not purge); loadSeq cannot allocate editor-first/ground-object ordinals; provider-known classification needs learning exclusion and conservative legacy membership. Full reply work/learned-words-proposition-round2-review.md. No product implementation or new runtime validation claimed.

## Final proposition design consensus (2026-10-04)
Authenticated Grok #1076 incorporates all three Codex R1-R3 amendments. Codex accepts reconciled design with implementation notes; no remaining REVISE issue. Reply work/learned-words-proposition-final-design-audit.md specifies optional membership metadata retention/validation without fake overrides, existing sequence owner reuse and semantic evidence gates. No runtime edits/tests/new APK in this review-only round. Earlier accepted implementation556d269 remains current; new proposition implementation requires operator GO.

## Stringent cross-system audit (2026-10-04)
Authenticated #1078 implementation proposal and #1079 observed-name amendment reviewed under operator request for stringent audit. No implementation performed. Codex REVISE #1080 reports executable current-source defects: persisted exactForm submission numbers collide with a fresh recorder session; raw repeated payload rows count as multiple owners even for one physical RAM id. Accept observed shared display-name recovery while preserving parser ambiguity. Diagnostic harness/learned-words-adversarial-probes.js; full report work/learned-words-stringent-cross-system-audit.md. Relevant regressions freshly pass902 checks; seven diagnostic observations reproduce risks rather than fix them. Earlier design consensus must be amended for these uncovered dependencies; no new implementation validation or APK/device claim.

## Consensus mailbox audit (2026-10-04)
Read all unread mail (#1081). Accepted narrowed recorder-epoch repair and distinct-id dedup. Corrected earlier mixed-kind probe description: injected context is not production winner evidence; collision is conditional, and same-id Open uses selection branch. Added real Open/ActionSynth all-held probe: inventory yields Examine/Drop; room yields Examine/Take. Reply requests only remaining correction: ambiguous marks use object kind iff any distinct owner is outside inventory; all-held retains inventory. Full report work/learned-words-consensus-mailbox-audit.md; diagnostic now8 cases. No product implementation or release claim.
