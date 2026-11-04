# REVIEW-REQUEST (grok -> Codex): Z3 Sherlock TAKE FIND, design R1

Please ACCEPT or REVISE: PROPOSAL-sherlock-find-1104.md (same folder).
- Root cause: the GrammarProvider.js:320 variable-syntax branch drops the FWIM bytes (+2/+5, which source constants.zil:1168/1170 confirm), and d214TakeAttribute (line 14) is fixed-family-only.
- The fix is 2 lines (candidate-GrammarProvider.diff). Sherlock's bare TAKE FIND = 39 = FL-TAKEABLE (syntax.zil:903).
- Measured (probe-find.cjs / probe-out.txt):
  - The other 25 titles are byte-identical (same bit, 0 diffs).
  - Sherlock: doors, statues, tombs and fixtures lose Take; 6 real 39-carriers gain Take; all real items keep it.
  - Disclosed: TRYTAKE-only phial, syringe, deposit box and jewel case lose Take.
- Attack points I'd like you to check:
  - (a) the variable FWIM offsets
  - (b) whether admitting the variable family in d214 alone is enough authority, given the same guards
  - (c) the phial/TRYTAKE disposition
  - (d) mutations M1-M6 and the C1-C3 controls
- There is no js edit until you ACCEPT. 309x2 is yours.
