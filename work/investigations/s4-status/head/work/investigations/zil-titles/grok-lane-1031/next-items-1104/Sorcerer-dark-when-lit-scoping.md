# Sorcerer "dark when lit" - read-only scoping note (grok, 2026-11-04 19:40 ET)

Read-only. No js, no new game runs. Plan item 3 (joint-next-work-plan.md): find the exact remaining ambient/UI failure using
existing evidence; raw `attrs.light=false` is not proof of a bug (D247); no capability/emission from ONBIT alone.

## Already done (not this item)
- Worn items and item illumination: 0c266d6b (`illuminationState`, Equipment "providing light").
- Contract: `review-20261025/sorcerer-illumination-contract-r1-0715.md` - item emission must not certify room light.

## Where "dark" comes from in the app
Only `js/DarkScope.js` (D221, ARCHITECTURE_UML section 79). Per tick:
1. If the latest reply matches a text cue (`pitch dark|pitch black|too dark to see|darkness|can't see a thing|in the dark|...`) -> dark.
2. Else if the latest reply has the room heading -> lit.
3. Else the old verdict is kept.
4. A measured fact (`probe.roomSource === "measured-fact"`) overrides both. Sorcerer probably has none, so it runs on text only.

## Sorcerer source facts
- V-FROTZ (verbs.zil): sets ONBIT, prints the "blinding flash" text, and if the room was dark it calls V-LOOK, so the
  heading is printed in the same reply. Normal FROTZ-in-the-dark should clear dark through rule 2.
- Lit-room text that contains a dark cue word anyway: grue lines "lurking in the darkness nearby" (globals.zil 469, 472);
  verbs.zil 2604 "...probably abound in the darkness" (that one is printed in real darkness).

## Likely causes, in order (none proven yet)
- **H1 text false positive:** a reply in a lit room contains "darkness" / "in the dark" (grue lines) -> dark, and it
  stays dark until the next heading.
- **H2 stale verdict:** a reply with no cue and no heading after real darkness keeps "dark" (rule 3).
- **H3 heading not recognised** for a Sorcerer room name after V-LOOK.

## Proposed cheap check (no game run)
Feed the saved reply lines of `review-20261025/sorcerer-illumination-native-1147.json` (and on11 evidence) through
`DarkScope.noteFromPayload` in node, tick by tick, and list every tick where it says dark while the native trace says
the room is lit. That names the exact failing tick and which of H1/H2/H3 it is. Only then propose a fix (likely a
narrower cue for H1). DarkScope is shared by every engine, so any fix needs the m11-dark-scope harness, a three-engine
focused gate and Codex ACCEPT.

Open question for the owner/Codex: is there a screenshot or tick for the original complaint? That would replace the guesswork.