# Sorcerer darkness - probe result (grok, 2026-11-04 23:50 ET)

Read-only for product code. One short headless run on the current tree (DarkScope.js unchanged at HEAD):
`sorc-dark-probe.cjs` -> `sorc-dark-probe-out.json`. Commands: start, wait, frotz book, look, get up, look.
Checked: PRODUCTION_PLAN D221 (pl-s335, line 8993), ARCHITECTURE_UML section 79, DECISION-INDEX D221/D224.

## What actually happens
| Step | Game says | App dark? | Right? |
|---|---|---|---|
| wait (wake up) | "...your frotz spell seems to have worn off during the night, and it is now pitch black." | **false** | **No - it is really dark** |
| frotz book | flash of light, then "Your Quarters, in the bed" + description | false | yes |
| look / get up / look | normal lit room | false | yes |

So the problem is the opposite of my earlier guesses: the app shows **lit when it is dark**. H1, H2, H3 from
`Sorcerer-dark-when-lit-scoping.md` did not happen here. The bed is named (object 128, "bed"), so "Your Quarters, in the bed"
is recognised correctly.

## Cause
`DarkScope.js` line 87 cue list has `it is pitch black` but the game says `it is now pitch black`. No other cue word is
in that reply. There is no measured darkness for Sorcerer (`probe.roomSource` = "player-containment", `measuredDark` null),
so text is the only signal.

"now pitch black" appears in the local ZIL sources for Sorcerer (2 places: wake-up and V-LAMP-OFF-style lines, verbs.zil
2897, 3245) and Zork III (3). Other titles may say it too (sources not all on disk).

## Proposed fix (needs Codex ACCEPT before any code; DarkScope is shared by all engines)
- One regex change: `it is pitch black` -> `it is (now )?pitch black`, and the same for `pitch dark`.
- Test: extend `harness/m11-dark-scope.js` with Sorcerer: after `wait`, dark must be true; after `frotz book`, false.
  Plus a negative: a lit-room reply without the phrase stays lit.
- Gates: operator-regressions 0 FAIL, m11 harness, three-engine focused run (ZIL/Inform Z/Glulx) - text cue only widens a
  phrase that only appears when the light really goes out, so low risk.
- Not touching the room ONBIT measured route (bigger, separate).

Open question still stands: if the owner's original complaint was "lit room shown dark", this probe did not reproduce it;
a tick or screenshot would settle it.