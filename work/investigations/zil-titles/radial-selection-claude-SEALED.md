# Radial overlaid by Android text selection - claude sealed findings (2026-10-22)

Operator report: on the phone (build 74, versionCode 47), long-pressing an underlined word opens the radial, but native
text highlighting and the Android selection toolbar (Define / Copy / Select all, then Web search / Share / Read aloud /
Ask Gemini) appear over the radial and block its buttons. Operator: highlighting is supposed to be off while a radial is
active. Screens: work/investigations/r3-claude/phone-74/bz-soda-radial2.png, bz-radial-eat-result.png (Border Zone,
long-press "soda" via adb `input swipe x y x y 900`; the radial's centre "Tools" label became the selected text with
handles; Eat button hidden under the toolbar).

Findings:
- D210 / ARCHITECTURE_UML s72: hold selection guard (`Actionable.guardHoldSelection`, js/Actionable.js:1240-1247,
  registered :1219-1220 for selectstart/contextmenu) applies to the HELD TARGET ONLY by design.
- The radial opens under the still-down finger (Qol.js OpenRadial adds body.radial-open :787/:805, items
  .radial-command :835/:949, centre .radial-tools :971). Android's own long-press timer then fires on the element now
  under the finger (the radial's "Tools" label), which is not the held target, so the guard does not preventDefault.
- CSS: no `user-select: none` / `-webkit-touch-callout: none` rule covers body.radial-open or the radial elements
  (css/ParchLock.css radial-open rules :3112-3125 only hide controls). Existing user-select:none rules cover
  .pl-hold-active (:2844), map press, dirpad handle, mic.
- Cause: selection suppression is scoped to the held mark, while the radial (a different element under the finger) is
  left selectable for the remainder of the same press.
No fix written. Prior-fix guards to run for any change: D210/D211/D212 harnesses, D88 Stage 6 long-press, operator
regressions, desktop right-click radial unaffected.
