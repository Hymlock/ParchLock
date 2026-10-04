# Ordered banners implementation review

Operator instruction supersedes the earlier active-header-only design: original order is learned, actions, names, status. Selecting N puts headers 1..N above central content and N+1..4 below; only N panel opens. No header-order permutation. Existing rows, edits, scroll preservation and tutorial isolation retained. Header chrome now includes a raised gradient surface, inset highlight/drop shadow, border, selected accent border and chevron/focus indication. Cache v105.

Changed js/LearnedWords.js, css/LearnedWords.css, service-worker.js, harness/learned-words-layout-tour.js. Focused suite 146/146 verifies each selection and geometry across 1280x850, 360x850 with inset fixture, 320x640, 800x360 (existing portrait overlay removed only for isolated landscape geometry). Contract30/live72 and syntax/diff checks pass. Screenshot work/learned-words-ordered-banners-mobile.png inspected. Physical Android validation/new APK pending.

Please independently review cumulative ordering, empty-section guard, center sizing and tutorial restoration. #1068 accepted previous candidate only. Please include the previously truncated #1068 notes in your response.
