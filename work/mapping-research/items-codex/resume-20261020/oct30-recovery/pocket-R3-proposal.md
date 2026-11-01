# R3 proposal: bounded Sherlock inventory-label projection

Status: Codex proposal, actual Claude/Grok adversarial votes required before implementation. Supersedes R2 and rejects the current whenParentWorn subtree-return approach. Independent draft/source/current-walker reviews are retained beside this file; child is non-author but not a substitute named-engine vote.

## Evidence and contract

Native I/REMOVE COAT/I proves unworn pocket contents omitted from inventory display. EXAMINE POUND NOTE while unworn succeeds. Rewear restores listing; ordinary TAKE puts150 directly under232 and it remains listed. Both short captures bind full62-JS pre/post hashes and executable file hash, sourceStable:true. Pinned V-INVENTORY removes TH-POCKET temporarily and conditionally prints its contents; parser scope remains separate. Independent actual-walker probe proves whenParentWorn removes150 entirely, so reject that implementation.

## Exact proposed data

On the existing validated Sherlock executable fact ba9c2c81d6b55eb9fc7de43a2e439fc65304231cbb834c208005cd9460f44ff0 only:

```
inventoryHiddenRecurses: true,
inventoryLabelRule: {
  kind: "worn-holder-pocket",
  holder: 287,
  garment: 302,
  wornAttribute: 34
}
```

No blanket inventoryHiddenScopeRetained opt-in. Correct the stale direct-children-only comment. Existing32 hidden semantics remain; no scenery/static mapping or capability inferred from34.

## Validation and algorithm

Implement a small inventory-label projection helper called at the end of walkVisibleDescendants, so snapshot and provider re-root use the same behavior. The generic walk stays unchanged from pre-whenParentWorn: closed/invisible/NDESC admission is not broadened by this helper.

Validate the whole rule before hiding anything: plain non-array record with exactly the four keys above; exact supported kind; integer distinct nonzero holder/garment IDs inside the true compiled object frontier, computed from first-object property-pointer/entry-size, not heuristic objectCount; valid v3-v5 bitwidth; wornAttribute agrees with the executable's qualified wornAttribute. Require validated confirmed-ZIL family and the existing executableLayoutFacts identity authority. Resolve actual player with existing resolver; reject ambiguous/unresolved/out-of-bounds player, require rootId==actual player, and distinct holder/garment/player. Current raw holder.parent must equal garment and garment.parent must equal actual player. Validate raw attribute-byte availability before reading worn state; do not turn unavailable state into false through attrs fallback.

If no rule, malformed rule, foreign/unqualified identity, invalid bounds/links/root, unknown state, or coat worn: return pre-projection rows unchanged. This fails closed on the authority to suppress inventory labels. It may preserve prior over-listing under invalid data; it must not silently erase accessible scope or fabricate objects. The chosen fallback is explicit and requires peer acceptance.

Only for a wholly valid rule with actual coat-unworn state: for each already admitted row, follow its current raw ancestor links with a true-frontier bound and visited-ID cycle guard. If it is a strict descendant of holder287, clone it with strict labelSuppressed:true. Do not suppress holder itself through this rule, clear existing suppression, alter attrs/aliases/confidence/parentId, append rows, or infer accessibility. Invalid ancestry for a row introduces no new suppression for it. Recompute on every walk: no persistent/sticky flags. Direct-held note is not a pocket descendant; lapel descendants are not pocket descendants.

## Prior-fix and consumer guards

D1/D16 display-versus-scope; D31 nested physical custody; D53/D75 holder recovery; D260 direct-held action restrictions. Actionable.payloadPool/reference must retain the suppressed note, and no new Take/Wear/light capability is inferred. EquipmentUI.labelRows and inventory renderer omit it; labelParentId remains display-only. WorldModel excludes suppressed rows as recovery votes, so verify an unsuppressed held coat still resolves232 in the minimal coat+note fixture. Preserve More/manual LearnedWords suggestions and existing current-state command scopes.

## Focused validation and landing

Actual walker through snapshot/provider: worn/unworn/reworn, note raw parent287, direct-held note, empty pocket, unrelated lapel, childless hidden rope, closed/invisible ancestry. Invalid record/keys/bit/IDs/family/digest/root/parents/state and cyclic ancestry add no suppression/no rows. Real Actionable resolver + Equipment model prove note scope retained but label hidden; More and actual current command execution must remain. Retained native evidence supplies expectations; no long acquisition routes or old proofs repeated merely to relabel. Existing nested-inventory and inventory-scope-retained guards, source-stable focused controls, independent non-author current-source audit after actual proposal consensus.

Integration owner records exact paths/freeze. Run operator13/0, three-engine checks and one final immutable shared309x2 candidate classification after both this policy and ActionSynth repairs are agreed, not on the known-bad intermediate enum. No new APK or full26 completion claim.
