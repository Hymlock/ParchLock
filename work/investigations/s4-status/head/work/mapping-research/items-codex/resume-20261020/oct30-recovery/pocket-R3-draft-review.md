# Adversarial review of pocket R3 design draft

Reviewer is a separate Codex child, non-author and non-blind as already disclosed. Read current draft and comparison, current walker/WorldModel/Actionable/EquipmentUI source. No code edits, native runs, catalogs or named-engine votes.

**Verdict: direction acceptable, schema/validation and invalid-policy semantics must be settled before implementation.** This is not a final proposal or implementation ACCEPT. No material source contradiction found in using strict labelSuppressed on already admitted pocket descendants under the bounded policy.

## Actual consumer attack results

1. `Actionable._buildPayloadPool` concatenates discoveredObjects and inventory and filters by actual id/name, not labelSuppressed. `referenceFor` therefore can retain this note. Do not later filter scope on this display flag. Native EXAMINE success in the parent's separate capture is the relevant scope evidence; inventory omission is not inaccessibility.
2. `EquipmentUI.labelRows` strictly removes labelSuppressed rows and only builds display-only labelParentId for children of suppressed rows. It does not mutate actual parentId. Suppress **all already-admitted descendants** of the omitted pocket section, not just its direct children, or nested grandchildren could leak as top-level labels.
3. `WorldModel.recoverInventory` and correctPlayerId do treat labelSuppressed specially: suppressed rows do not vote as holder seeds. Under the required raw coat302->actualplayer232 chain, the unsuppressed coat itself remains a valid direct-holder vote. Add an actual correctPlayerId/recovery control rather than assuming the display flag has no non-display readers. Never suppress coat302 as part of the pocket subtree.
4. Existing `inventoryHiddenScopeRetained` adds hidden holders themselves. R3 must not set it globally just to retain note150: note is non-NDESC and already admitted by recursion; changing that fact would widen pocket/lapel/rope owner scope independently.
5. A final projection of existing rows is simpler to audit than carrying suppression state through recursion. The projector must create copies when setting the flag, OR with existing strict true, and never clear pre-existing suppression. Recompute each walk, so rewear restores display without sticky flags from a prior payload.

## Minimal schema recommendation

Use one exact executable fact with a closed bounded kind, e.g. `inventoryLabelRule:{kind:"worn-holder-pocket", holder:287, garment:302, wornAttribute:34}`. Property names are illustrative; final owner chooses and documents exact names. Do not introduce a general predicate/condition expression language. Keep root/player authority from the existing exact-executable player contract rather than adding a second independent player-id source.

Validate this whole record before any suppression: plain record, exact supported kind/keys, finite integer IDs within true compiled frontier, distinct holder/garment/root IDs, valid bit width, exact authenticated executable/family authority, root is the resolved current player, pocket's raw immediate parent equals garment, garment's raw immediate parent equals root. Validate ancestry boundedly when deciding whether a returned row descends from pocket; guard cycles/malformed links and never use caller object names, stale labelParentId or parsed prose. A flat all-record check avoids partially applying a malformed rule.

If state is worn, identity/tree validation fails, record is malformed, or the title lacks this fact: **do not apply this new suppression rule; return the pre-projection rows unchanged**. This is fail-closed for the authority to hide labels, not a license to remove scope or hide arbitrary objects. Invalidity can retain the known prior over-listing; it must not silently erase inventory. Do not invent a false worn state from unknown/unavailable RAM. If integration owner chooses a different fallback, document its player-visible behavior and justify it against D1/D16 before code.

Only after a valid rule and actual coat-unworn state may already admitted pocket descendants gain strict labelSuppressed:true. A direct-held note is outside the subtree. Pocket/coat out of player custody does not qualify. Do not traverse/add hidden/closed/invisible content solely to execute this policy.

## Focused guard additions

- Real walker call through both snapshot and provider refresh returns note row with original parent287, attrs/aliases/confidence unchanged; hidden flag only with coat off; rewear restores label.
- Actionable real payloadPool/reference plus actual menu currentness retains unworn note; EquipmentUI model and Actionable inventory labels omit it. More/manual suggestions unchanged.
- WorldModel correctPlayerId stays232 with unsuppressed coat and suppressed note, including a minimal inventory consisting of just coat and nested note.
- Closed opaque/invisible ancestry still prevents admission; malformed/foreign fact and cycles add no suppression and no rows; unrelated lapel subtree unchanged; childless hidden rope unchanged.
- Source-stable native retained worn/unworn/reworn/direct-held expected outputs bound to exact candidate at final acceptance, without repeating routes merely for relabelling.

All required actual-seat proposal votes, implementation review and one final immutable shared candidate gate remain outstanding; child advice is not a substitute named-engine consensus.
