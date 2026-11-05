# REVIEW-REQUEST-007 - DarkScope accepts "it is now pitch black" (Sorcerer) - SHARED CODE, extra-careful

Diff: REVIEW-007-darkscope.patch vs HEAD. js/DarkScope.js line 87 only:
`it is pitch dark|it is pitch black` -> `it is (?:now )?pitch (?:dark|black)`. harness/m11-dark-scope.js +3 Sorcerer checks.
Witness (exact, current): next-items-1104/sorc-dark-probe-out.json - after WAIT the dream ends in Your Quarters with
"...it is now pitch black." and DarkScope.dark=false. Codex's caution (nov4-lead/sorcerer-residual-independent.md) asked
for an exact failing current witness plus cross-engine review before touching the shared cue; both are supplied.
History/docs: D221 (PRODUCTION_PLAN 8993-9010, line 9002 "it is pitch black was added"), ARCHITECTURE_UML 79,
DECISION-INDEX D221. Last DarkScope commit 804af63d (fail closed). This is the same kind of cue addition as 9002.
Commands: node harness/m11-dark-scope.js -> 16 PASS / 1 FAIL (the 1 FAIL is pre-existing at HEAD, see verdict);
operator-regressions 13/0; focused gate base(A1+Z3 frozen tree) vs patched on CounterfeitMonkey.gblorb, Zork I, anchor.z8,
Zork III, Sorcerer -> 0 differences.