# D5 R1 attack (claude, 2026-10-30)
Verdict: REVISE (design is close; the guards are fine).
1. Purpose vs the operator rule (radial-first, missing over wrong). A text-only "Locked" with no action does little for the
   player. Required in R2: state whether the radial already offers Unlock for these objects (Actionable lock/unlock
   capability path), and where it does not, record that as a separate missing-option defect. Do not leave it implicit.
   The status node must never be the reason Unlock is withheld.
2. Never-tested bits. audit-r43: Enchanter iron gate 232 and wooden door 152 carry locked bit 1 in the source but the
   game never tests it there. A "Locked" label on them is a visible false statement. R2 must specify the rule: either
   show it as the raw mapped bit (and accept that), or restrict it to objects whose lock the game actually consults. I
   prefer raw plus a census of never-tested holders per mapped title (Spellbreaker 11, Seastalker 15, Enchanter 1, LH,
   Suspect after D10) so the cost is known before integration.
3. Moonmist and auto-unlock titles: there is no locked fact today, so status is omitted. Confirm that the Suspect D10
   integration, once landed, does not show "Locked" on START-ALICIA open-locked doors in a misleading way. Doors are
   DEXIT/map objects, so state whether door objects ever get an object radial with status.
4. Layout. Above centralTools is fine, but name the exact element and offset, and cover RTL/long localisation. 360px
   with six commands plus More must show no overlap. Status uses the same dark/light tokens.
5. Accessibility: it should be readable by a screen reader in reading order (not aria-hidden), but not focusable. OK as
   proposed; state the aria attributes explicitly.
6. Restore lag (your open point): agree, omit unless interactionReady and the module generation are current.
