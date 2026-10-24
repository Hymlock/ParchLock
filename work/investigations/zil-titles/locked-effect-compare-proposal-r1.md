# Locked visible effect: compare + proposal R1 (claude, 2026-10-24)

Halves: claude work/investigations/zil-titles/locked-effect-claude-SEALED.md; codex
work/mapping-research/items-codex/resume-20261020/locked-effect-codex-SEALED.md (both sealed before reading the other).

## Agree
- No radial consumer of `locked` (ActionSynth rules/verbsForAttrs). Mapping locked alone changes no form.
- D214 `_d214ZilExitsFor` decodes `doorObjectId` but never emits `isLocked`. Legacy producers (ZRamReader:2584,
  ExitCalibrator:148/580) read the DESTINATION's attrs, which in ZIL is the room, not the door.
- Navigator:119 already pauses on ExitMeta.isLocked/.locked, so a correct feed reuses existing policy.
- D231/D234 Unlock chooser exists and stays the only Unlock path (needs a tool); locked does not create Unlock.
## Codex adds (accepted)
- Freshness: MapTopology applyPayloadExits:696 coerces a missing isLocked to false; MapIdentity:45-48 sets only
  positive locked and never clears it. Unknown must stay unknown; true->false must clear.
- WorldMap buildGraph:121-133 drops lock state, so even a correct feed is invisible on the map.
- Object context: a non-command "Locked" status on a trusted locked object is the honest object-level effect.
## Differ
- claude rated the radial effect marginal; codex proposes a status label. Resolution: phase 2 (below), since it needs
  a radial status-row affordance that may not exist yet; this is to be checked before committing to it.

## Proposal (phase 1: map/navigation; phase 2: object status)
P1a. D214 feed: for a DEXIT with a bounded `doorObjectId`, emit `isLocked` from a LIVE read of that door object's
     attrs, but only when the title has a trusted mapped `locked` (exact-digest fact); otherwise omit the field
     (unknown). U/C/F exits never borrow destination attrs as a door lock. hintOnly is preserved; no new route.
P1b. Freshness: MapTopology.applyPayloadExits stores isLocked only when the payload field is present (true OR false);
     absent -> leave the existing value untouched, but drop it when the exit's door identity changes. MapIdentity gets
     an explicit clear when a fresh payload says false.
P1c. Map visibility: WorldMap carries isLocked into the edge graph and draws a lock glyph on edges whose live state is
     true (no glyph for unknown).
P1d. Navigator:119 unchanged (it pauses on true only). BFS still does not route around locks (no new policy).
P2.  Object status (separate round): a non-command "Locked" status on in-scope objects whose trusted locked bit is
     live-true, keeping Examine first and More; never "Unlocked"; no Unlock invented.
Validation: native LH padlock 135 / roof door 163 unlock/lock toggles (existing evidence) re-checked through the
composed map payload before/after; negatives: non-DEXIT exit, room-vs-door identity, unmapped title, Inform/Glulx
unchanged. Harnesses: d214-zil-exits, exit-calibrator, d23-*, d46-room-identity, d214-room-door-alias,
operator-regressions, three-engine gate.
Prior-fix guards: D25, D134, D198, D214, D231, D234, D240.
