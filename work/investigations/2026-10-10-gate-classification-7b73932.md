# Regression gate: 77f4e87 (baseline) vs 7b73932 (current), 298 games
Noisy, excluded: the 15 titles that differ between two baseline runs, plus Advent (random forest). Raw diff: 2026-10-10-gate-diff-77f4e87-vs-7b73932.txt.

## Map-side (rooms/exits/marks): 4 titles
- thorn: same marks, different order. Benign.
- Inevita: adds vessel, engines, straps, stick, pouch ("engine" becomes "engines"). Likely intended (fuller descriptors); spot-check pending.
- gamlet: adds balcony, balustrade, wall, ... ("eyes" kept). Likely intended or timing; spot-check pending.
- **Relief: adds stray "drive" and "good". SUSPECT REGRESSION.** It is also present on c6e4f84, so it comes from eb35f19 or 7ca64eb. Sent to Codex.
- Resolved since c6e4f84 (they came from the reverted c807641): Fork "People walk", huntdark verbs/descriptor loss, BeingAndrewPlotkin split, selection's lost envelope.

## Inventory names: INTENDED
- C1: MakeItGood, blair (no line crossing).
- C2: casing (GreatXavio "ID", HollywoodHijinx, HouseOfDream, Peacock, Slackerx, ShadowOfMemories, Damnatio, TCOTY, bofh, boothdye, Treasures ALL CAPS). Verified against each game's own `i` print.
- C3/D: Gumshoe "license", Delusns "technician's jumpsuit", beneath "small paper bag", burglar "dirty overcoat" / "item of junk mail", acorncourt "tin bucket".
- C4 partial: curves "door" becomes "keys".
- Unchanged and still wrong (item queue, not regressions): TCOTY "rifles"/"dead parrots" for the singular print; acorncourt 21x "ball".

## Verdict
No map regression except the Relief stray marks, which are under investigation. D224 (Wumpus) introduced no difference outside wump2ka.
