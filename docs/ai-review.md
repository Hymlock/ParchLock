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

## Consensus implementation candidate (2026-10-04)
Operator authorized implementation when consensus met; Grok #1083 closed final all-held rule. Candidate implements shared display names separate from parser identity, distinct physical owners, pageEpoch exact-form dedup, neutral version1 classification/session display, shared ordinals, initial Status/compact toolbar. New consensus22, layout150, live78 and relevant regressions pass; mobile images inspected. Full evidence/limitations work/learned-words-consensus-implementation-audit.md. New independent implementation audit requested; no new APK/device validation or overall completion claim. Unrelated lifecycle PRODUCTION_PLAN working diff preserved and excluded from commit.

## Correction implementation and Codex self-audit (2026-10-04)
Operator authorized implementation of #1091/#1092, then explicitly requested Codex self-audit and no Grok report. Implemented provider-owned outside-copy submitting Take without carried-sibling intersection, legacy automatic built-in row display exclusion preserving evidence/overrides, four persisted banner visibility controls with defaults/all-off/cumulative ordering, seven initially collapsed options disclosures, ASCII speech-rate minus, and keyboard disclosure focus/activation compatibility. Hidden learned section disables Add; tutorial hides real disabled-section rows, uses read-only examples, restores preferences and visibility. Cache v107.

Validation: new corrections browser52 (1280/360: options counts, native disclosures/keyboard, rate clamps, persisted preference, 16 visibility combinations, all-off tour, different ground commands/mixed/all-held submission), consensus24, layout/tutorial150, live78, original learned30, command disambiguation42, equipment108, statistics201, inspect disablement22, nested inventory60, semantic parity24. Syntax and diff checks pass. Legacy live fixture changed from a now-intentionally-hidden built-in inspect form to a genuinely custom form; manual test uses a distinct second custom form. Self-audit caught and fixed modal focus-trap summary exclusion and minimal-owner inspect API compatibility. No blocking source finding remains in reviewed scope.

Browser scenarios include real Anchorhead boot plus controlled object fixtures; they do not prove held-out real-game pellet parsing or physical Android Back/IME/speech/storage. No new APK built. No report sent to Grok. Unrelated PRODUCTION_PLAN lifecycle edits and diagnostics preserved. Overall completion remains operator-owned.

## Corrected real-game and startup verification (2026-10-04)
Operator screenshots disproved the earlier completion assessment. Reproduced in real Wumpus: first TAKE turns one unnamed copy into named inventory; promoteUnnamed rejected the ground sibling because its vocabulary belonged to that named copy. Removed that premature named-word exclusion, retaining live scoped candidates and existing RAM-id/reference/descriptor ambiguity machinery. Open now matches multiword observed phrases against each candidate's vocabulary tokens, consistent with marker ownership. No hidden LOOK or other probing command added. Existing descriptor-disambiguation checks remain green.

Startup visibility defect: author CSS display:flex overrides native hidden on header buttons. Added scoped [hidden] display:none!important. Previous correction test checked hidden flags only; strengthened it to computed visibility. New harness/pellets-startup-live.js boots actual Wumpus without injected object/provider fixtures: fresh launch, tutorial restoration, reopen, real first TAKE, surviving ground/held IDs, actual first-ring Take click obtaining second pellet, empty prompt after submission, all-held exclusion, saved-off prefs on full reload/new game. 22 checks pass at desktop1280/mobile360. Other checks: corrected visibility/options52, live78, layout150, command-disambiguation42, consensus24, statistics201, unresolved evidence gates7, adversarial probes8. Syntax/diff checks pass. Cache v108. No report sent to Grok; self-audit performed. Physical Android and a newly packaged APK remain unvalidated.

## Inventory-root corruption: integrated containment correction (2026-10-04)
Operator repro investigated step-by-step. Fresh two-pellet TAKE + actual inventory-radial Eat refusal retained both pellets and Glow Bar. Real Wumpus barrel/hole replay reproduced the reported corruption class: TAKE of a handled room object returns Impossible but the game remove_obj/insert_obj repositions it in the same room. Previous verbSuccess treated this as structural success and D75 recorded the room destination as inventoryRootId; provider then walked room children and WorldModel.correctPlayerId propagated that false root into EquipmentUI.

Fix is in existing AttrCalibrator owner only: frozen before/after parent links prevent same-parent TAKE/DROP success or behavioral confirmation; root writes use the submitted object's insert and reject its frozen original room/current structural room/compiler-owned room index. confirmedInventoryRootId ignores already persisted known-room roots so established provider recovery resumes. No map/UI label dependency, hidden probe, new inventory filtering or title branch. Existing room-scope / held-scope separation and provider priority remain. ARCHITECTURE_UML containment and command-evidence sections and canonical plan D31/D75 were reviewed; architecture updated. Cache v109.

Validation: real Wumpus inventory48 checks: two takes, actual inventory Eat refusal, real navigation to a barrel via existing exit commands, handled room reinsertion, inventory/equipment identities after each action, new room hole underline, and simulated persisted bad-room-root recovery. The actual leaking ooze presence varies; ooze command checks are not asserted as the independently proven original trigger. The proven room-reinsertion mechanism reproduces the corruption. Root contract10, second-pellet/fresh-start22 (desktop/mobile), equipment108, nested inventory60, statistics201, consensus24, inspect22, command disambiguation42, room banner11 and unresolved-object7 pass. Syntax/diff checks pass. No Grok report sent; Codex self-audit. Existing unrelated PRODUCTION_PLAN edits and diagnostics excluded. No new APK or physical-device claim.


## 2026-10-04 ? Readable duplicate commands and editor default

Self-audit: duplicate pellets retained a parser-vocabulary fragment as their structural name while their observed display name was already correct. The existing head-noun resolver now accepts the observed spelling only when it matches an object alias through the existing dictionary-equivalence function. When no distinguishing qualifier exists, it keeps that readable shared head; referenceFor still reports both candidates and no unique/verified target. No title-specific names, inventory membership changes, new commands, or probe turns were added. Real Wumpus desktop/mobile Eat prints eat pellets and refuses without consuming; Drop prints drop pellets and removes exactly one copy.

Edit Learned Words opens its learned section first when enabled, otherwise the existing enabled-section fallback applies. Tutorial copy and initial-panel expectations updated; preference visibility, banner ordering and tutorial restoration retained. Service-worker shell cache v110.

Validation: command-disambiguation 44, equipment 108, consensus 24, inventory-root 10, real startup/Eat/Drop 34, layout/tutorial 150, learned live 78 passed. Real inventory-containment replay 48 passed. Syntax and diff checks passed. Authenticated mailbox read had no unread messages; exact paths claimed. No report sent to Grok per operator instruction. APK has not been rebuilt for this source change.


## 2026-10-04 ? Unified duplicate-item radials

Replaced the reduced ambiguous-item slice mapper with the normal Actionable.Open slice/ranking/target builder. sharedObjectCommands intersects the same resolveObjectCommands results across current ground or inventory candidates. Optional allowAmbiguousReference travels through existing ActionSynth APIs only for this intersection; default unique-object gates are unchanged. UI owner remains null, candidate IDs remain explicit, and submissions including target/instrumental submenus retain ambiguous-reference learning exclusion. All supporting learned members are checked for current validity; any review-only member keeps the shared action review-only (including stems). More retains candidate learned verbs as prompt suggestions. Ground Take, ordinary nested-container retrieval, inspect policy and evidence-only promoted-object capability gates use the existing resolver. ActionSynth uses the same observed vocabulary row as marks/radials so raw dictionary fragments cannot reappear after resolver integration. Inventory containment and calibration code unmodified. Cache v111.

Self-audit validation: shared-radial-integration 28 (legacy/semantic parity, ranking metadata, Put/Give/instrumental targets, mixed/held/nested copies, unsupported siblings, review-only/stale learning); real pellets startup/Eat/Drop 34 desktop/mobile; learned live 78; inventory containment replay 48; equipment 108; command disambiguation 44; nested inventory 60; semantic parity 24; cutover 13; unresolved actions 7; consensus 24; command consistency regression passed. Syntax and diff checks passed. Updated old nested-duplicate fixture to expect the existing Take-out-of action now restored by the normal resolver. Authenticated mailbox empty; no Grok report. Source implementation only; APK not rebuilt.


## 2026-10-04 - Observed descriptor precedence restored

Reviewed the D141/D146/D150/D201 notes, Build 55 display contract, shared-name amendment and actual commit history before runtime implementation. Replayed a53709c and 8983d55 (both notes correct) against 2637df8 through 1d68f55 (both notes become scrap of paper). Added failing-before assertions for differently described notes sharing generic synonyms, source-order independence and a single held note; corrected only Actionable observed display ranking. Observed structural labels/uniquely owned extensions outrank generic synonyms; other uniquely owned phrases outrank shared fallback phrases. Existing length selection remains within a rank. requireUnique parser selection, IDs, scope/containment, learned/manual labels and lifecycle are unchanged. No title-specific runtime names, inventory filters, probing commands or additional naming store. Retained 62e9195 readable head resolution and 1d68f55 canonical synthesis row lookup. Cache v112.

Real-game fixture acquires two pellets plus scribbled/scrawled notes through real commands and traversal. The same held state renders at 1280/360; Equipment DOM preserves both descriptors and both full pellet labels, scrawled remains uniquely addressable, colliding scribbled vocabulary is not falsely unique. Real Examine echo and Put target submenu verify readable source/target spelling. Randomized-world navigation initially failed on underwater exits rather than descriptor code; fixture uses seeded setup and re-routes blocked real travel. No object/containment mutation used.

Validation: command-disambiguation 51; shared-radial integration 28; real startup/Eat/Drop 34; inventory containment 48; equipment 108; nested inventory 60; semantic parity 24; unresolved actions 7; learned live 78; layout/tutorial 150; consensus 24; inventory-root 10; cutover 13; closed-container and command-consistency regressions; adversarial probes 8. New real descriptor fixture also passed. Syntax and scoped diff checks pass. Two older fixture failures were pre-existing: command-consistency seeded only VerifiedNouns, contrary to D150 parser vocabulary, now supplies mined aliases and CommandNouns; adversarial probe expected ground Take for an all-held payload, contrary to actual containment, now rejects it. Previous claim that command-consistency passed was inaccurate: a multi-command shell result hid its failure behind the later command's success. Each corrected test now passes independently.

Planning/architecture record updated before runtime edits. Preserve unrelated pre-existing planning lifecycle edits; stage this correction separately. Authenticated mailbox empty; no Grok report. APK not rebuilt.


2026-10-08 Codex D214 continuation: U1-U6/P1 peer acceptance a40f7ba/1966; authorized solo final audits1978 completed source slice (report work/investigations/2026-10-08-codex-final-self-audit.md). ZIL static room prediction and nonpathable hints implemented, generic ambiguous-word behavior verified, E1/E2/E3 fixtures repaired. APK63/version36/cache140 checkpoint/build verification next. No physical-phone claim or operator overall goal completion.


APK63 complete: source checkpoint0e9a9faffaee3632a6f7c8b74fc294bf5cadb571; Android versionCode36/versionName2.0.0, cache140. Gradle assembleDebug succeeded17s; v2 signature verified;457 bundled asset/source byte matches. ParchLock-build63.apk 84252953 bytes, SHA256 B58A519EE590CD40D2DE55235B660F2BAFF028628AC97956DF16D82F263F2FB8. Corresponding source archive SHA256 F3A9256268CA28409B4CB45168015EB3C4AB5468743866DD42A7375CB3BF1409. APK62 preserved in Downloads/ParchLock-APK-archive. Physical Android validation remains operator-owned; no overall goal completion recorded.

2026-10-08 HHG follow-up closed: A/B1998, C2000, refinement2003 accepted independently. Noun-safe links, nested held labels, real fixed-ZIL TAKE attribute, transient offstage inventory-root rejection, synchronous radial pool and full wrapping inventory names implemented. Native22/root13/disambiguation51/lifetime28 and peer cross-engine inventory controls pass. Shell141; no APK rebuilt. Next authorized queue from operator relay2004: bounded Equipment beautification with blind/adversarial loop, then full death-signal loop. APK archive location corrected by operator to C:/Users/hymlo/Downloads/Projects/Parchmap-main/ParchLock-APK-archive.

2026-10-09 Equipment surface1 accepted2051: scoped Options/control/state/text-stat presentation; centered grip unchanged; existing protector reused. Focused guards and native width/theme/keyboard-model proofs pass. Shell142, no APK. Full-app sweep continues with planned surface2 bottom-exit clearance; canonical D215 owned by Claude.

Bottom exit clearance accepted2068: measured mobile band, preserved SW/S/SE sectors, unchanged handles/input/rails. Native60/static46/equipment119/layout pass; warning fixture drift repaired after HEAD reproduction. Shell143/no APK. Surface3 accepted plan2057/2061 implementation next; full start-screen overhaul2065/2066 added.

Map visual surface3 accepted2080 after B1 specificity repair: native12 width/theme captures, centered/browsed pip geometry, World52/panel29 pass. Node geometry/handlers/handles retained; separate browsed-icon overlap queued. Shell144/source only. Start-screen overhaul implementation in progress under separate audit2083.
