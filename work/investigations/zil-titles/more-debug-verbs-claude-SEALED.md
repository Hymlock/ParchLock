# Radial "More" page lists debug/system words - claude sealed findings (2026-10-23)

Symptom (phone, build74 + D210 + food test APK, Lurking Horror): long-press the held "assignment" (97) -> More ->
entries "$so", "$ve", "#reco", "#comm", "#rand" (work/investigations/r3-claude/phone-food/radial-snack-more.png; that
press was on the assignment, see phone-result.json).

Findings:
- More page = Actionable.addMoreActions (js/Actionable.js:2638): adds every ParchLockQol.GetRadialCommands() entry whose
  source is 'dictionary-verb' or 'ram-synth' as "<verb> <noun>", plus AttrCalibrator.allowedVerbsFor(id).
- 'dictionary-verb' entries come from WorldModel.lastPayload.specialCommands, built by GrammarProvider.collect
  (js/GrammarProvider.js:442-468): GrammarProvider.readVerbWords takes EVERY dictionary word with the verb flag (and the
  D198 vocabulary when the valve is on), no filtering beyond length >= 2.
- The words are the game's real system/debug verbs, stored truncated by the Z-machine dictionary (v3: 6 Z-characters;
  '$'/'#' cost extra Z-characters): Lurking source has <SYNTAX $SOUND = V-$SOUND>, <SYNTAX $VERIFY = V-$VERIFY> and
  $VERIFY OBJECT, and the #RECORD/#COMMENT/#RANDOM interpreter-system verbs; DEBUG-CODE-only syntaxes ($DEBUG, $CHEAT,
  $BLORPLE, $TAKE) are compiled out in release.
- So the radial offers object actions built from (a) system/meta verbs that are not object actions and (b) truncated
  dictionary tokens that are not valid typed words ("$so", "#reco"); "<verb> <noun>" from these is never useful.
- Likely affects every ZIL title (same Infocom system verbs) and possibly Inform titles with meta verbs.
No fix proposed (blind stage).
