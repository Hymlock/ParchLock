# Current R3 implementation audit: REVISE one layout-validation blocker

Bounded independent non-author review of actual current source. `pocket-R3-implementation-audit.cjs/json` preserve seven source pre/post hashes; **sourceStable:true**,14 focused checks pass,2 robustness controls fail with qualifications below. No shared-source edits, native replay, or catalog run.

Reader SHA256 8874138522074ab5f60c487450de0b5c50cddd8b57f04363cbbafc36b98942f1; facts 8449193f10383efdf3beb6494f616ede7440727ebeffc59388b0378501c57444.

## Confirmed behavior resolved

Actual current walker keeps150@287 in scope when unworn and adds labelSuppressed:true; worn/reworn lists it. The pocket itself remains absent. Projection clones without mutating input/parents/attrs/aliases, preserves existing suppression, leaves direct-held note and unrelated lapel alone. Wrong root/unqualified family introduce no suppression. Actual Actionable.payloadPool retains the note and real referenceFor resolves unique verified `note` with scoped-vocabulary provenance. EquipmentUI.labelRows omits it while scope rows remain. Actual WorldModel.correctPlayerId stays232 with minimal coat+suppressed-note inventory.

## Blocker: invalid first-property layout still authorizes label suppression

The helper computes an integral frontier from the first object's property pointer but never checks that table/property boundary lies within dynamic memory and the supplied buffer. Own control changes **the real first object's property pointer in the supplied DataView** to an entry-aligned address past header.staticMem (no objectLinks/family stub). The helper continues to suppress note150 despite the layout being invalid under the agreed whole-rule validation. Stable header/executable identity alone does not certify mutable object-table bytes.

Required narrow fix: reuse or match the existing true-frontier structural validation, rejecting pointer/table ranges outside staticMem/buffer and incomplete entries before authorizing this rule. Unknown/invalid layout returns original rows; no broad runtime-hardening expansion requested. Retain this focused malformed-table regression.

## Separate non-native malformed dependency control

Replacing only garment objectLinks' attrBytes with an empty array causes missing worn byte to coerce to zero and suppress the note. This fails the proposal's explicit unknown-state contract, but **real objectLinks currently always constructs a complete4/6-byte array or throws for DataView bounds**. Therefore this is a constructed dependency-malformation observation, not an asserted naturally reachable game defect, and is not an independent material blocker. A direct checked byte read/bounds check when implementing the layout fix can also satisfy the stated unknown-state rule without inventing a new API.

No final implementation ACCEPT until the layout failure is corrected and reviewed against a frozen hash. Actual-seat proposal votes and required final shared-candidate gates remain separate.
