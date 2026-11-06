# Final implementation audit: latest marks, fixed accordion, spoken tour

Operator authorized implementation after Grok design ACCEPT #1065. Please independently audit implementation against work/learned-words-editor-proposal.md and reply ACCEPT or REVISE with reproducible findings.

Changes: js/Actionable.js preserves phrase selection/ownership and moves the same selected mark to the latest identical word-bounded eligible DOM occurrence. js/LearnedWords.js and css/LearnedWords.css provide four fixed headers, one open section, central scrolling, preserved real rows and independent spoken/inert-target tutorial with restored section/details/scroll/focus. service-worker cache v104.

Validation: harness/learned-words-layout-tour.js 114 passing checks across 1280x850, 360x850 keyboard-inset fixture, 320x640 and 800x360. Includes repeated text nodes, DOM ordering, exclusions, ambiguity metadata, unchanged prose/VerifiedNouns, long lists, dirty fields, all eight targets/narration, Back/Skip/Finish/Escape, focus trap, empty-list demo without override writes. Landscape fixture removes the pre-existing rotate-to-portrait overlay solely to isolate editor geometry; actual phone-landscape policy is unchanged. Screenshot work/learned-words-accordion-mobile.png inspected. Browser fixtures are not physical-device validation.

Existing learned-words contract 30 and live browser 72 pass. Equipment 108, room-banner 11, D201 unresolved actions 7 pass. Syntax checks and git diff --check pass. phase2-heuristic-cutover: 147 pass, 2 fail (Open without objectId; Use with). Both reproduce when the same harness loads HEAD:js/Actionable.js instead of the candidate, so they predate this change. Do not interpret this as a fully green legacy suite.

Please attack actual target visibility/clipping under keyboard resize, card controls in small free bands, late refresh/ownership invariants and module changes while narrating. No new APK contains this candidate yet; prior build60 remains previous implementation. No overall completion declared.
