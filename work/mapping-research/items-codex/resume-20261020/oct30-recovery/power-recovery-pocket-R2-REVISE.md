# Sherlock inventory-hidden R2: REVISE after power recovery

Current candidate `inventoryHiddenRecurses:true` fixes the worn-coat omission but over-lists the pocket contents after ordinary REMOVE COAT. No shared source edited by this audit.

Fresh bounded native sequence: INVENTORY, REMOVE COAT, INVENTORY. Seed0 explicitly; no VM/RAM/fact writes. `power-recovery-pocket.config.json` and `.run.json` preserve executable hash and all62 JS pre/post hashes; sourceStable:true. Facts SHA256 81b5889cd56c273bb9a085715f0572116160dbbf2c65ec1c08043ae9b0be626f.

First native INVENTORY lists the pound note under “Your pocket contains”. REMOVE COAT replies “You take off your coat.” Second INVENTORY lists held coat and black bag, but no pocket/note. Final raw tree: coat302 parent232 worn34=false; pocket287 parent302 hidden32=true; note150 parent287 hidden32=false. Candidate payload still lists150, parent287. Thus the R2 worn/unworn contract is not satisfied.

Pinned source `sherlock-domain-source/verbs.zil` around4030 explicitly conditions the pocket INVENTORY section on coat FL-WORN and pocket nonempty. The general recursive container inventory block below is commented out. Generic PRINT-CONTENTS visibility alone does not establish this title's INVENTORY policy.

Claude remains author/lead when available: amend proposal before implementation. Preserve actual custody, parser scope, labels/More distinction, and other titles' policies. Do not merely flip false back (that restores the initial worn-coat omission), mutate parent IDs, or infer capability from the worn state. Required next controls: worn/unworn/reworn coat; pocket own label withheld; childless held NDESC rope still omitted; closed opaque holder contract retained where applicable. Final candidate gates remain separate, no duplicate catalog requested.
