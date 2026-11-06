# Implementation adversarial review — 2026-11-04

Verdict: runtime implementation ACCEPT. Release remains conditional on final shared/operator/three-engine gates and correction of the documentation sentence below; those gates are not asserted by this audit.

Read current Input.js, Map.js, Consts.js, service-worker.js, USER_GUIDE.md, android/app/build.gradle diff and keyboard-tests.cjs; inspected recorded keyboard-tests.json. Independently executed keyboard-tests.cjs against current source: 18 PASS, errors [], exit 0. This execution rewrote the same test result artifact; no production edits.

Capture is registered once via a named document capture function, matches only Ctrl+Shift ArrowUp/Down without alt/meta/composition, verifies exactly one total visible enabled line and absence of visible char prompts, and excludes other editable/control ancestors before consuming. Consuming before overlay/leave checks preserves the draft for blocked game-owned chords. Repeats are consumed without Inject. Inject receives user-navigation and retains history/recorder choke-point handling. Old ArrowUp/Down bubble movement cases are removed, ordinary history branches and legacy aliases are unchanged. Desktop side map remains allowed, full-screen mobile map is blocked. No interpreter edit.

The test exercises real trusted focused arrow input and repeated binding; constructed fixtures separately cover overlays, other editable target and char exclusion, synthetic repeat and old key aliases. Positive traces measure one forwarded Inject n/s; parser refusal to move south is not failure to submit south. The suite does not prove every browser/layout/Num Lock mode or every guard combination. No full catalog or physical Android verification claimed here.

One documentation correction requested: current USER_GUIDE sentence says all “Movement shortcuts ... pause while menus or dialogs are open,” but strong new overlay guards belong to the new Up/Down capture, while aliases and Left/Right remain old body handling. Narrow wording to the new Up/Down shortcuts. Metadata Build76, cache175 and Android versionCode50 match intended release identifiers. Map tooltip now truthfully prefixes Ctrl+Shift.

Reviewed SHA256 identities:
- js/Input.js B7F94A2132E427E5FDE6815E3BD8218C54FE5CE4FC2C9EC2350ADB231818D25C
- js/Map.js B374EE7979B33487D6EF6588D8CC5ACB453BE2ED0FF0F5FB760C951A74336DAF
- js/Consts.js F51476D1C2F8EE79EF51AFE099A9D9188A4064644E60D6EBC6C5CE5CC64EA745
- service-worker.js 976C132419E3BC0029EEEAFC3F7FA0B4DC0AD9A7488D01948860B9A0C7161BDC
- USER_GUIDE.md (pre-wording-correction) 641C4B0979CC46775770E9FEB03AD37F1A51E6CAEB6298D6A6CA9D9F241246B1
- android/app/build.gradle B3B1A1F746331E9A1D7B9A4CA3A877899E6F6EF82424EA9E70668CBF0B716C90

Whole-tree git diff --check reported existing unrelated documentation/research whitespace; this does not establish a defect in the scoped implementation. No external bus-seat acceptance asserted. No packaging/publication acceptance yet.
