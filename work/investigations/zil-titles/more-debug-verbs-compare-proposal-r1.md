# More-page system vocabulary: comparison and proposal R1 (claude, 2026-10-23)

Inputs: claude zil-titles/more-debug-verbs-claude-SEALED.md; codex resume-20261020/more-debug-verbs-codex-SEALED.md
(+ more-debug-blind-browser.*, more-debug-native-arguments.*).

## Agree
- Path: GrammarProvider.readVerbWords/collect -> specialCommands (dictionary-verb) -> Qol.GetRadialCommands ->
  Actionable.addMoreActions appends "<verb> <verified noun>" as editable suggestions (Enter:false).
- The five words are real compiled system verbs ($SOUND, $VERIFY, #RECORD, #COMMENT/#COMMAND, #RANDOM), stored
  truncated by the v3 dictionary; not a decoding error. Do not "repair" spellings.
- The defect is projecting game/system vocabulary onto a world object, not the vocabulary list itself.
## Codex adds
- Grammar arity: $so/#comm/#reco/#unre take no object; $ve takes 0 or 1; #rand takes 1. An object-arity filter alone
  is not enough. Native: "$verify assignment" not recognised; "#random assignment" "Illegal call to #RANDOM."; the
  OBJECT slot of these is a number (INTNUM), not a world object.
## Claude adds
- Same family exists in every Infocom title (shared system vocabulary), so a per-title fix is wrong.

## Proposal R1 (admission contract for More object suggestions only)
A dictionary verb is offered as "<verb> <object>" on an object's More page only when BOTH hold:
1. Grammar: the current confirmed grammar (D198 family templates, or the Inform grammar when declared) has a template
   for that verb whose first object slot is an ordinary object slot (objectCount >= 1). Verbs with only no-object
   templates are never projected onto an object.
2. Not a system-vocabulary token: the dictionary word does not begin with a non-letter character ('$', '#', '%', etc.).
   This is a property of the token in the game's own dictionary (the Infocom/Inform convention for interpreter and
   debug commands), not a title or name list. Such words stay available everywhere else they appear today (typed
   input, the general command wheel), only not as object actions.
Unknown grammar (no confirmed family) -> current behaviour unchanged (no inference).
Scope: Actionable.addMoreActions only (plus a helper reading the grammar arity). No change to specialCommands,
GetRadialCommands' global wheel, D34 no-cap rule, D110 ranking, learned/AttrCalibrator verbs.
Controls: Lurking assignment More without $so/$ve/#comm/#rand/#reco; ordinary object verbs still present (e.g. read,
show, turn); a no-object verb (e.g. "wait"-type) never projected; unknown-family Inform title unchanged; D110 order.
Phone: one More-page screenshot when the operator is back (pending).
Prior fixes: D34, D110, D147, D198, D227.

## R1 as accepted (codex #4549), with qualifications folded in
- This is a conservative ADMISSION POLICY for unproven dictionary-derived object suggestions on the More page. It is not
  a decoded system/meta flag and not a proof that every punctuation-leading token lacks a world role.
- Rule (1) grammar objectCount >= 1 establishes parser arity only; it is not labelled a proven world-object slot
  (numeric handlers such as #RANDOM/$VERIFY keep their qualification).
- Rule (2) tests the first character with Unicode letters (\p{L}), not ASCII, so valid non-English verbs are admitted.
- Untouched: raw vocabulary, specialCommands, the global wheel, manual typing, D34 no-cap, D110 ranking, and learned or
  confirmed actions regardless of token spelling. No guessed full spellings.
- The 298-game census (r3-claude/dict-punct-verb-census.json) is a compatibility screen, not native semantic proof.
- Sequence: after the container candidate; one gate per final shared candidate.

## R2 (explicit revision, claude #4556 / codex #4557)
Supersedes "unknown grammar -> unchanged" for rule 2 only: the Unicode-letter first-character admission applies to
unproven dictionary-derived More candidates in EVERY family (ZIL and Inform), because it is a property of the token
(census: adverbum '.hold', amiss ';x', dreamhold ',noop', MakeItGood '.ask', Savoir-Faire '/ork'). Rule 1 (template
objectCount >= 1) applies only where validated ZIL grammar exists. Decoder: no D198 decode for Inform-compiled memory
(not cacheable there); ZIL uses the existing buffer cache; add a repeated-open decoder-work control. UI admission only;
raw vocabulary, learned/AttrCalibrator verbs, ram-synth and typed input preserved.
