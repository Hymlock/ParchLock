# Claude sealed investigation: worn items missing from Yourself in Infocom (ZIL) games

Sealed 2026-10-07, before Codex's blind investigation.

Sample (fresh start, native `inventory`; stopped at proof):
- MISSING: Planetfall ("Patrol uniform (being worn)", "chronometer (being worn)") and Suspect ("western
  mask (being worn)", "gunbelt (being worn)"). The app finds no worn item, so Yourself is empty.
- OK: Anchorhead and Spring (Inform: worn items detected). Heroine, Delusions and Ballyhoo had
  nothing worn at the start.

Cause: AttributeSchema reads "worn" as the Inform default bit 26 when no Inform attribute-name
table exists, which is the case for ZIL. Infocom's WEARBIT number is per game.
AttrCalibrator.VERB_FLAG learns `worn` only from a `wear`/`remove` set_attr/clear_attr
(CONFIRM_THRESHOLD 3), so items worn from the start are never learned.

Planetfall held objects, set attribute bits (raw object table):

    brush [25]   uniform [10,11,12,22,24,25]   ID card [7,23,25]   chronometer [12,15,22,25]

The worn items share 12 and 22, both absent on the unworn items. Inventory correlation alone is
therefore AMBIGUOUS. It needs opcode evidence: the bit the game's own inventory routine
test_attr's on each held object (AttrCalibrator already receives test_attr), or a single
observed wear/remove.

Candidate design, for review. In AttrCalibrator, during a native inventory turn, the
test_attr(obj, b) calls on held objects whose results match exactly the objects the game reports
worn identify WEARBIT. One unambiguous observation suffices because it is the game's own routine
deciding. Record it as a per-executable worn bit, feeding AttributeSchema via
AttrCalibrator.overrideFor (the existing path).
