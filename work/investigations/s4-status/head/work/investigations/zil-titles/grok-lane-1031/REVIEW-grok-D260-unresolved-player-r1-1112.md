# grok review: D260 unresolved-player custody guard R1 (light-unresolved-player-proposal-r1.md)

Seat: grok (non-author). Time: 2026-10-31 ~11:12 ET. Design review only. No code, facts, or native run. js/AttributeSchema.js is clean in the tree, sha256 prefix 8B06DB75; lines 561-566 were read.

## Defect confirmed
Current line 565 is `if (!holder || holder.ambiguous || !link || link.parent !== holder.id) return [];`.
With resolvePlayer giving {id:0} (pristine, or the player is offstage) and object 166 at parent 0, `0 !== 0` is false. Custody passes and the forms are returned. This is a real missing-validity hole inside the accepted D260 contract ("inventory = actual direct custody"). It is not a new capability.

## Proposed guard
`!holder || holder.ambiguous || !Number.isInteger(holder.id) || holder.id < 1 || holder.id > count || holder.id === objectId || !link || link.parent !== holder.id`
- `count` is in scope (line 543, true frontier, already validated as an integer ≥ 2). Correct.
- objectId is already bounded via `objs` ⊂ [1,count] (lines 548-550, 560).
- With holder.id ∈ [1,count] and link.parent === holder.id, a parent-0 sentinel can no longer match. A self-loop is rejected.
- Fails closed: it returns [] (no owner action), never null or "absent". This is consistent with the proposal.

**Vote: ACCEPT (design)**, with these non-blocking notes:
- n1 (consistency): illuminationState (lines 619-621) is stricter. It whitelists player.source ∈ {measured-player-object, measured-player-global} and requires id ≥ 2. Consider the same source whitelist here so a heuristic player resolution can't drive inventory forms. If that is not adopted, say in the proposal why the two contracts differ.
- n2 (controls): add a constructed control with the holder id > count (a resolvePlayer stub or a bad global) and one with holder.id === objectId. The proposal lists neither explicitly.
- n3 (out of scope, flag only): the room branch inPlayerRoom (line 579) checks id < 1 but not id > count. It probably fails closed through objectLinks/enclosingRoom, but I did not verify that. It is not a blocker for this inventory-only change.
- The existing obligations remain: current-source audit after code, operator 13, three-engine, and the shared final gate. The LGOP frozen gate does not cover this change.

## Addendum, current-source check (~11:16 ET)
- Clock note: the user-machine clock read 11:11 when this file was named "1112"; the timestamps are approximate.
- The design review above read the **pre-edit** AttributeSchema.js. The working-tree file was modified at 11:06:09 and now has sha256 09ef46f6e0aefe242a243435364c0a9789504183ab8c7af9b7c58376f970aa08. `git diff` shows the inventory guard replaced **verbatim** by the proposed condition, with no other AttributeSchema change.
- I ran these myself (read-only, no source edits):
  - `node harness/zil-light-unresolved-player.js` (sha256 prefix bf0ef95d): 5 PASS, exit 0.
  - `node harness/zil-light-forms.js` (dirty, +4/-2): 48 lightForms controls passed, exit 0.
- **Current-source vote: ACCEPT** for the inventory-guard hunk at 09ef46f6. n2 still stands: no harness control explicitly exercises holder.id > count or holder.id === objectId. Please add both, or say they are covered. n1 and n3 are unchanged.
- This is not a review of the dirty harness/zil-light-forms.js diff or of any facts change. The operator 13, three-engine, and final shared gate obligations remain with the lead gate owner.
