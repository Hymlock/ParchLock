# Batch 3 candidate: transparent containers (claude, 2026-10-23) - from sweep pilot, LH step 10
Finding: Kitchen after PUT CARTON IN OVEN / CLOSE OVEN. Native LOOK: "The microwave oven contains a cardboard carton.
The cardboard carton contains Chinese food." App discoveredObjects lacks carton 58 / food 90: carton parent 86
(microwave, closed); ZRamReader/AttributeSchema.canSeeInside = container ? (open || transparent) : supporter, and no
ZIL row maps "transparent", so a closed see-through container hides its contents.
Fix (fact only, existing consumer): attributeMap.transparent = measured TRANSBIT per title.
  LH 5 (grok2 #4642 natives: microwave 86, smashed cabinet 88; fridge/assignment refused)
  Zork I 12, Enchanter 10, Ballyhoo 13, Cutthroats 19 (carrier sets exact vs source, 2026-10-11-zil-source-flags.json)
Consumers of attrs.transparent: AttributeSchema.canSeeInside only (room scope walk + nested inventory walk D31).
Gate after batch2 commits: 309x2 + operator 13/0; expected INTENDED only in these 5 titles.
