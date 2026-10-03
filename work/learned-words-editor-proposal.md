# Edit Learned Words — proposition for adversarial review

Status: UI proposition, not live implementation or runtime acceptance.
Review outcome: Codex accepts Grok #1049 and #1051 with the consolidated contract below. This section supersedes conflicting exploratory options and sample semantics elsewhere in this document. Consensus is on the proposed contract, not implemented behavior or operator goal completion.

## Consolidated adversarial consensus

- Default section is Learned: published exact forms and allowed verbs, provisional records visibly marked not remembered, manual suggestions, and learned disabled/substitute inspect behavior. Collapsed optional sections Story actions, Names, and Status labels are explicitly not learned records.
- Trigger means command verb/form for command records. Response means menu/display text, not game-authored reply or a second command. Original replies and learning provenance remain read-only. Status and name edits are display labels only; story aliases/VerifiedNouns and command references remain untouched. The poisoned prose example is not a learned-command row. No generic Match/contains control exists.
- Owner adapters determine editable fields and compatible Used in choices. Manual additions require a unique verified in-scope object and dictionaryForm command form. Changed triggers are replacement overrides, initially Enter false with zero confirmations for that revision. Only subsequent distinct real successful submissions, through the existing recorder and its refusal, arity, scope, reference and object gates, can promote them after two successes. A candidate adapter must admit non-RPG manual forms to that same pipeline; the editor never increments evidence or executes a validation command.
- Active replacements suppress only their original learned contribution. Ignore filters the selected learned contribution inside exactFormsFor/allowedVerbsFor for all consumers; independently valid provider actions remain. Provider-only actions permit label edits, with no Ignore control. Undo restores the original contribution or last valid override and never restores a blank draft.
- Learned inspect behavior is included. Reversible suppressDisabled/suppressSubstitute overrides are consulted by defaultInspectVerb and inspectVerbCurrentlyDisabled without changing confirmed flags, responsesByObject or opcode evidence. Behavioral disable confirmation currently requires identical replies across three distinct objects; it is not opcode proof.
- Store version-1 overrides separately in PL_LearnedWordOverrides_<gameIdentityKey>, validate identity/schema and fail closed on mismatch. Do not edit PL_AttrCalib_ or PM_Stats_ evidence stores. Status label overrides affect rendering only, never values, pins, sources or current-condition evidence. Revision confirmation must remain recorder-owned and not reuse pre-edit counts.
- Autosave one valid row on blur or Done. Preserve focused rows during live refresh. Key drafts by game identity and restore generation. Keep committed edits; discard incomplete drafts on close/Back/story/module change with that behavior stated inline. Local phrase checking never Submit/Injects a command.
- Dedicated tutorial appears once application-wide on first editor opening. PL_LearnedWordsTutorialSeen version "1" is independent of the main tutorial. Finish/Skip records completion; interruption does not. Voluntary replay affects only this tutorial. Keep the main TutorialVersion and lifecycle untouched. Explain all supported controls and owner-specific limitations without mutating real records.

Evidence verified against current source: AttrCalibrator ALLOWED_VERB_THRESHOLD=2, VERB_DISABLE_CONFIRM_THRESHOLD=3, existing manual-extra admission limited to RPG_VERBS in verbSuccess.prepare; exactFormsFor reader EquipmentUI and allowedVerbsFor readers ActionSynth/Actionable. Candidate adapter, override projection and tutorial are proposed additions, not existing functionality. Product implementation and its tests remain pending.
Operator requests Grok adversarial review of the interface and a safe integration contract.

## Review artifacts

- Interactive fragment: `work/learned-words-preview.html`.
- Browser-openable preview: `work/learned-words-preview-check.html`.
- Both use sample entries and in-memory edits. They do not read or write real learning stores.
- Operator iterations accepted the simpler list, automatic saving, explicit Trigger/Response labels, right-hand destination/ignored status, and a compatibility-filtered Used in dropdown.

## Product goal

Add **Edit Learned Words** to the in-game Tools menu. Show every actually learned word/action/response entry for the selected story, with editable trigger and response, reversible Ignore, and Add word. Automatically reflect new learning while preserving any active edit. Support mobile and desktop through the same interface.

User intent is primarily correction of learned radial actions. Status-display examples were included in the preview; they must be clearly identified and must not imply that status observations are the same kind of learned record as action forms. Review must decide how supported status corrections compose with StatTracker without inventing a second learner.

## Agreed presentation

1. One expandable row per entry. Summary left: **Trigger: [text]** and **Response: [text]** on separate lines. Summary right: **Radial menu**, **Status display**, or **Word alias**, with **Ignored** below when applicable. No destination beside the trigger text.
2. Expanded normal view: only Trigger, Response, Ignore this entry.
3. **Advanced settings** contains Display name, Used in, Match (exact/contains), Item or context, story scope, Original learning, and Try a phrase / Check.
4. **Used in** is a dropdown restricted to destinations supported by the record's proven source/capabilities, not by a guess from its text. Sample records have one valid destination. Multiple options require an owner-backed compatibility determination.
5. Add word creates a new entry. No Save or Cancel buttons. Valid edits save on field exit and Done/close. Quiet saved/unsaved/error feedback. Undo recovers an accidental change.
6. Invalid incomplete edits cannot silently overwrite a valid record. The preview blocks Done while trigger/response is blank. Review should settle new-entry abandon behavior and draft preservation during dismissal, game switching, and restore.
7. Mobile stacks Trigger and Response. Desktop places them side by side. Advanced settings stays collapsed initially. No loss of functionality at narrow widths; prototype checked at 320/360px.

## Actual source boundaries discovered

## Operator addendum: dedicated first-open tutorial

Keep this tutorial separate from the main tour. Automatically show it the first time the user opens Edit Learned Words, following the existing one-and-done tutorial convention. Provide a Help / Replay tutorial control for voluntary replay. Reopening the editor or changing stories must not repeat the automatic tour. Use an application-level, versioned completion preference; record completion only after explicit Finish or Skip, following existing tutorial dismissal behavior. Interrupted tours must not silently mark themselves complete.

Use short, friendly steps anchored to the actual controls, with Back, Next, Finish, and Skip. Explain Trigger and each supported meaning of Response; the right-hand destination and Ignored labels; how learned entries connect to radial menus, aliases, or supported status corrections; automatic saving on field exit or close, validation errors, and Undo; Ignore versus deletion; adding a manual entry; story scope and new-learning refresh. Explain every available advanced control (display name, compatible Used in options, supported matching modes, item/context, original learning, and Try a phrase), using expandable details to keep each step readable. Only describe controls and destinations supported by the final owner contract. Be explicit that edits affect the app's learned behavior, not the game's authored text, and that phrase checking does not execute a game command.

The tour must work on mobile and desktop, support keyboard and screen-reader navigation, and preserve drafts, focus, and scroll position. Use illustrative data or nonmutating highlights rather than editing real learned records during the tour. Review first-open, Finish/Skip, replay, interrupted dismissal, module switching, narrow screens, and persistence across relaunch. Grok: include this requirement in the adversarial review and identify the existing tutorial owner/preferences to reuse; no separate competing tutorial lifecycle.

- `js/AttrCalibrator.js`: per-build `table.objects[id].exactForms`, allowedVerbs, verbBehavior disabled/substitute evidence. Persistence is `PL_AttrCalib_<gameIdentityKey>`.
- Exact forms contain confirmation counts and source provenance, not generic editable story-output strings. `verbBehavior` stores observed replies as evidence; editing those observations must not forge automatic success proof.
- `js/Actionable.js`: verified printed nouns / command references. Alias display and exact object targeting are different facts; do not conflate them.
- `js/StatTracker.js`: condition readings and source/epoch/generation provenance. Current conditions are observations, not reusable learned lexical triggers; restoring invalidates current readings. A manual correction must not become a fabricated RAM observation.
- `js/EquipmentUI.js`, `js/ActionSynth.js`, `js/SemanticActions.js`: shared action admission, verified nouns, object identity, positional and dictionary gates. New editor must compose with these owners.
- `js/WorkspaceUI.js`: Tools entry composition and existing application dialog ownership.

## Proposed integration principles for challenge

1. Separate **user overrides** from automatic evidence. Preserve original provenance; label manual additions/edits as user supplied. Do not rewrite confirmations, RAM pins, compiler grammar, or frozen turn evidence.
2. Enumerate records through owner adapters. Each adapter supplies stable build/object/record identity, editable fields, display destination, compatible destinations, and validation. Deduplicate equivalent learning records without losing provenance.
3. An edited Response is the app's interpretation/action/label, not a replacement for game-authored prose. A radial entry needs a validated command form, not an arbitrary prose string. UI labels may adapt to record type while retaining simple Trigger/Response presentation.
4. Ignore must suppress that exact learned entry without destroying its evidence or permanently changing unrelated provider facts. Ignore should not erase a independently valid compiler/attribute action merely because a lexical rule was wrong. Define this boundary explicitly.
5. Manual additions do not become automatically confirmed successes. Dictionary membership alone cannot license auto-submit. Unsupported one-object forms remain editable suggestions; ambiguous references, missing dictionary words, wrong arity, and stale IDs stay gated. Explicit user edits must have a clearly specified validation/override policy rather than silently widening ActionSynth rules.
6. Compatibility must be checked both while generating dropdown options and at mutation/consumer use. A record cannot be turned from a status reading into a radial command by changing UI text or metadata.
7. Exact matching is the safe default. Contains matching must be limited to record types that support it, with context/source constraints so quoted or unrelated prose cannot trigger status changes or action learning. Do not let the preview's generic contains field prescribe an unsafe live classifier.
8. Overrides must be module/build isolated, versioned, validated on load, and fail closed on corruption or incompatible build identity. Do not persist current stats as facts. Preserve existing learned data and undo/restore lifecycle contracts.
9. Autosave commits an atomic validated edit on blur/close, with undo. Live refresh must not replace focused inputs or misattribute edits after module switch. Handle duplicate triggers, multiword commands, case normalization, IDs changing on rebuild, and conflicts between automatic learning and a user override.
10. Preserve Tools/dialog stacking, drafts, probes, mobile keyboard, narration exclusions, and existing inventory/radial/More behavior. Editor interaction must not submit game commands merely to validate an edit.

## Open decisions requiring review

- Which owners/record types can truthfully be enumerated as actually learned words? Include provisional records or confirmed only? Clearly distinguish existing evidence from manual entries.
- What exactly is editable for each owner (command form, matching reply, display label, interpretation)? Freeform sample Response fields are not a finalized live schema.
- Should Status display corrections be supported in this feature, a separately labeled section, or postponed until their ownership contract is established? Do not silently drop requested functionality; propose a safe composition.
- What can a user explicitly override, and what still must satisfy parser/dictionary/object gates? How does Ignore differ from disabling a game-authored action?
- How is an Add word destination chosen and validated when no existing record supplies compatibility? The prototype defaults additions to a radial response rule; this is not a live admission decision.
- What happens to a partial new entry on close/back/module change? A single undo after committing a new entry currently restores its blank draft in the prototype; live undo must not strand the user in an invalid entry.
- How should exact/contains, original evidence, matching tests, and current-readings invalidation work without a parallel statistics/turn owner?

## Review requested

Challenge this proposition against the current source. Report concrete unsafe paths or missing contracts, then propose owner-local solutions. Distinguish UI acceptance from runtime authorization. Do not implement product code, commit, rebuild, or treat this document as implementation GO. Return ACCEPT, REVISE, or BLOCKED with file/line evidence and precise amendments needed for an implementable contract.

## Prototype validation

Playwright exercised autosave on blur and Done, undo, Ignore, Add word, story switching, Advanced phrase checking, preservation of summary labels after editing, compatibility-filtered destinations, blank-field validation, and 320/360px overflow checks. These are prototype interaction checks, not proof of live storage or game behavior.

## Layout and tutorial speech, 2026-10-03

Review outcome: design consensus on the consolidated proposition in Grok #1061 / Codex response. No implementation authorization or product changes. Existing command/evidence contract remains unchanged. Corrected source fact: Tutorial.speak takes the supplied step definition; Tutorial.placeSpotlight depends on main-tour state/DOM. This tour uses its own helpers and state in either case.

Accepted implementation criteria:
- Underlines preserve the phrase chosen by the existing preferred/longest ordering, scope, exclusions, ambiguity ownership and VerifiedNouns rules. Relocate a single mark to the last eligible identical word-bounded occurrence in actual document order, including repeated matches within one text node. Reversing activeLines alone is insufficient. Different phrases/descriptor retention remain out of scope.
- Exactly one section is open, initially Learned. Selecting another opens it, moves its real header to the top and keeps three closed headers at the bottom. Clicking the current header does not leave zero open. Preserve existing optional header names, all headers, title/X/toolbar visibility, existing section nodes, dirty/focused rows, Undo, drafts, inner details and per-section scroll. Only the central content pane scrolls. Intro/feedback belong inside it. Empty optional headers remain visible and closed; no empty section replaces the required open content.
- Use the existing mobile layout height/keyboard inset variables, without another keyboard listener. Test long lists at 320/360px, keyboard inset, landscape and larger text; all header and close hit targets must remain reachable. Browser test passes from the previous implementation do not prove this new layout.
- Speak each visible step through an independent helper using ReadAloud.stop then ReadAloud.speak(title + ". " + body), with exactly the visible step title and body. Cancel speech on navigation, replay, dismissal, Finish/Skip and module/restore change. Do not call Tutorial.speak, Tutorial.placeSpotlight or main-tour lifecycle helpers. Completion stays isolated in PL_LearnedWordsTutorialSeen.
- Tour targets remain visible but inert. Use this tour's own spotlight/card with main-tour placement semantics (free band, capped height, scrollable narration when necessary, target kept visible, existing keyboard inset). When no real row exists, use an explicitly labeled nonmutating demo; no writes to learning or override stores. Trap focus on tour controls, restore previous editor focus/section/scroll on exit, and avoid clipping on small screens.
- Required independent checks include repeated phrase within/across DOM nodes and appended inventory; same-name ambiguity and exclusion controls; no alternative phrase expansion; long-list accordion geometry and edit preservation; speech bytes/cancellation and target visibility at every step; empty-list demo isolation; first-open/replay/completion/main-tour isolation; packaged asset parity after implementation.

Recording clarifications from Grok #1063: the contract above supersedes the historical operator wording below. Spotlight geometry must use existing --pl-layout-height / --pl-kb-inset, not copy the main helper's window.innerHeight calculation; do not add another keyboard listener. Preserve displayNameFor, namePhrases, and the VerifiedNouns length rule unchanged. Phrase ordering remains exactly the current preferred full-name/head-noun bucket followed by other candidates, each already longest-first. Preserve existing optional header strings verbatim: "Story actions · labels only", "Names · display labels only", "Status labels · display text only". Empty Learned remains open with its existing empty-list sentence. Intro/feedback stay inside the center pane. No tests for the proposed changes have been run or implied by design acceptance.

Final header clarification proposed to Grok: the learned section's new required header reuses the existing product string "Edit Learned Words" verbatim (the current screen title). This adds a header control without inventing a new feature name. Exactly-one-open semantics and all other agreed behavior remain unchanged.

This is a design addendum, not an implementation. It does not reopen the #1052 behavior contract: two confirmations, Ignore, overrides, and labels kept out of commands.

The primary learned list must also be a dropdown/section, not an always-open list. All dropdowns must be more visually separated and distinct as headers. All dropdown headers remain on screen even when another dropdown is open. Opening one dropdown closes another. The opened dropdown's header moves to the top. The other dropdowns stay at the bottom, closed. The center window is the only scrolling window. Internal collapsible areas keep their current behavior, but they stay inside the central display window.

In the user's phone screenshot at 1:33, the learned list is long, and Story actions / Names sit above a cut-off "Status labels" header. This accordion is the symptom's intended fix; no measurements are implied.

The learned-words tutorial must speak each step through the existing tutorial read-aloud behavior. It must step aside the same way as the main tutorial and show the actual example or control it is describing, rather than sitting on top of the editor and only talking about it. This is a defect relative to the main tour, not a new invention.
