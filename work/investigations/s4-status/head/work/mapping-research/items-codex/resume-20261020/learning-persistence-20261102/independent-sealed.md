# Independent sealed investigation — learning persistence

Sealed 2026-11-02 by independent Codex subagent. I received only operator symptom and restrictions. I did not read root codex-sealed-initial.md or any new root findings. I prematurely sent two source findings to root before sealing; root had already sealed its initial half and disclosed timing. This report is independent of root findings but those early messages must not be represented as post-seal exchange.

## Scope and result

Read-only source investigation plus one in-memory Node source execution. No browser/native/device reproduction, user storage access/change, VM state mutation, product edit, APK or fix. The exact operator scene and which radial surface was observed remain unverified. The source proves an observation eligibility gap affecting LIGHT and DOUSE; it does not prove that gap alone explains every part of the reported transient appearance.

## Independently observed defects and contracts

1. AttrCalibrator.js:364-375 verbSuccess.prepare builds its recognized verbs from ActionSynth.rules and VERB_SYNONYMS. Its fallback split is rejected unless manual candidate or RPG_VERBS member. Actual rules (ActionSynth.js:3-20) have switch on/off but neither light nor douse. RPG_VERBS (AttrCalibrator.js:31) also has neither. LIGHT occurs only in the wider ITEM_SUGGESTION_VERBS lexical suggestions; DOUSE is absent there. Thus ordinary typed LIGHT LAMP and DOUSE LAMP never reach the success observer even when unique object split and dictionary eligibility succeed. Repeating them twice cannot promote through this analyzer. Independently executed actual prepare in a Node vm with dictionary true, unique split stub and no manual candidate: `light lamp null`, `douse lamp null`. This is constructed eligibility evidence, not a native command execution.

2. LearnedWords.observeSubmit (195-222) accepts the generic split, writes classification metadata and creates _projection for submitted exact forms. Projection is session memory, deliberately cleared on module identity change/undo/restore. Records displays such attempts without successful evidence as Not remembered yet (255-259). A displayed learned row is therefore not itself proof of durable learned command. This may explain some reported transient observation; its particular UI path must be captured before claiming native causality.

3. Genuine AttrCalibrator exactForms and allowedVerbs are already localStorage sidecars independent of SaveState: record (1018-1088) persists changed successful evidence via persist (1000), PL_AttrCalib_<release-serial>; hydrate (943) loads v2 tables. exactForms require 2 confirmations; allowed verbs allow opcode witness or repeated acceptance. LearningStores registers/persists snapshots by kind and records module ownership. SaveState contains no AttrCalibrator/LearnedWords snapshot replacement. No evidence found that skipping SAVE itself deletes learning.

4. Source consumer mismatch deserves investigation independently: exactFormsFor is consumed only by EquipmentUI.yourselfCommands (96). Ordinary ActionSynth adds allowedVerbsFor (196) but does not read arbitrary exact forms. _recordAllowedVerb (296) rejects verbs outside ActionSynth rules (except take/drop), so arbitrary exact learning would not naturally appear on the ordinary object radial even if observer eligibility were expanded. A fix must establish intended surface(s), not just storage.

5. LearningStores persists asynchronously under a Web Lock and reads newest queued snapshots within the same page (224). No quit/unload flush reference was found in ParchLock. Locked/failed writes can therefore look learned within a page before durable storage; quota drops report error and do not retry until next mutation. These are possible broader durability edges, not demonstrated cause here. Existing valid writes without lock use synchronous storage fallback.

## Prior decisions inspected

Read AGENTS.md, docs/seat-rules.md, current ai-status/plan/handoff/review; decision-index entries D205, D248, D258, D88 and matching plan/architecture excerpts. D205 architecture section69 explicitly requires real new-verb persistence in the same implementation and separates lexical suggestions from confirmed exact/object forms. D248 retains learning even across uninstall; D258 preserves confirmed exact forms, storage-full handling and seven-owner store scheme. These make save-independent module persistence the existing contract; do not weaken evidence guards or broaden ActionSynth rules as a shortcut.

Bus authenticated status/read failed fetch failed. Parent confirmed existing Codex resume-directory claim covers this report and durable file coordination while harness unavailable. Only this newly named report is written.

## Comparison/proposal requirements

Before implementation, capture exact module executable/header identity, held/ground scope, submitted commands/responses, analyzer preparation/record outputs, PL_AttrCalib value and LearningStores durable/queued state, and ordinary versus Yourself radial contents before/after reload in an isolated fresh browser context. Preserve opcode versus transcript evidence, unique/verified references, independent forms, manual revisions, generation applicability and quota/erase guarantees. Audit all seven learning owners, not just this symptom. No proposed runtime patch has been implemented or agreed here.
