# Independent subagent source audit

Read-only product audit; no native runs or mapping acceptance.
Cached historicalsource/moonmist revision c85885f is corroboration, not a text
recompilation or exact current-build claim.

Whole-source WEARBIT/WORNBIT search establishes overloaded domains. castle.zil
60 and global.zil45/292 explicitly call HERE WEARBIT WING-ROOMS; tower.zil1694-1697
compares wing membership of two room locations. castle.zil1949 uses HERE WORNBIT
to decide whether MIRROR-GLOBAL is available, rather than whether a room is worn.
Clothes in global.zil378-408 use the same flags for capability/state.

The story has a structural room domain: room objects are IN ROOMS; native source
verbs.zil3272,3356,3374 explicitly test PRSO/PRSI IN ROOMS. Captured sampled rooms
share parent37, while outfit78 has parent42 and other outfits198/217 parent59.
This supports testing room-root membership rather than names or a room ID list.
But anchoring the current executable's ROOMS owner and qualifying exceptional
room/door/global objects remains necessary; do not infer it solely from a common
parent among selected samples.

Clothes state must not become capability alone. A current player containment
relation can qualify who wears an outfit, while room-domain exclusion prevents
the room aliases from becoming wearable/worn. It must not erase other actors'
authored state or off-player garment state without evidence. Source FIND-OUTFIT
uses direct owner and scoped container queries, distinguishing nested clothing.

Current original attributeMap.worn proposal remains a no-op because wornBitFallback
reads wornAttribute. Replacing it silently is not accepted. Existing wearable29
already affects rooms33/62, and all sampled room predicates were false in baseline;
this is a safety risk, not a newly demonstrated map regression.

Smallest useful travel experiment: reuse an existing original route to your bedroom
and bathroom; record native location/HERE, validated player parent chain, ROOMS-root
membership, current map node/edge and compass before/after actual doorway travel.
Compare immutable base against a reviewed owner-domain candidate, with tweed outfit
worn and then a native outfit change/removal. Check real arrival/pathability and
Equipment commands together, rather than only isPlausibleMapRoom snapshots.
No candidate or native run is performed by this audit.
