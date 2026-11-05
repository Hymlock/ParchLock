# REVIEW-REQUEST-006 - Z3 Sherlock TAKE uses FL-TAKEABLE 39 (grok)

Diff: REVIEW-006-Z3.patch vs HEAD d54a294d. Pathspec: js/GrammarProvider.js (2 lines: 14, 320), harness/d214-variable-take-find.js (new).
sha256 GrammarProvider 844a0623..., d214 6f1fcec8...
Claim: variable-syntax (infocom-pre-v6-variable) grammar lines now record FIND attribute bytes (pos+2, pos+5) and the
takeable-bit reader accepts that family, so Sherlock TAKE uses its FIND bit 39 instead of no bit. Fixed-family path unchanged.
Prior review: Codex ACCEPT (sherlock-find-1104/CODEX-IMPLEMENTATION-VERDICT.md, nov4-lead/REVIEW-GROK-Z3-IMPLEMENTATION.md) at these hashes.
Commands: node harness/d214-variable-take-find.js -> "166 checks PASS"; operator-regressions 13/0.
Doc-check: PRODUCTION_PLAN D198/D214 grammar sections; ARCHITECTURE_UML GrammarProvider.