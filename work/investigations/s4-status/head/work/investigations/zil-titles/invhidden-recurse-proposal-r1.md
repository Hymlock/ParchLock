# D1 inventory: hidden held parent with visible contents - proposal R1 (claude, 2026-10-30)

Investigations used. Neither seat was blind, so the two independent investigations are:
- codex: work/mapping-research/items-codex/resume-20261020/inventory-hidden/ (source-path-audit.json,
  consumer-boundaries.md, modern-inventory-callees.json, native-reproduction-triage.md);
- claude worker: work/investigations/claude-probe/invhidden/, the 18-title classification and the E2 packet.

## Agreed facts
1. App: ZRamReader.walkVisibleDescendants (js/ZRamReader.js ~2855) returns on a held child carrying the title's
   inventoryHiddenAttribute (NDESC), so the child AND its whole subtree are skipped. Actionable.js ~1505-1516 applies the same to
   actors' possessions.
2. Games, per the source:
   - RECURSES (15+1: Zork 1-3, Enchanter, Cutthroats, Deadline, Infidel, Planetfall, Sorcerer, Starcross, Spellbreaker,
     Witness via PRINT-CONT; Hollywood, LGOP, Stationfall via DESCRIBE-CONTENTS; Suspended reclassified): the NDESC child's
     own label is suppressed, but its visible contents ARE listed.
   - FLAT (Moonmist, verbs.zil:516): the child and its subtree are omitted, which matches the current app.
3. INVISIBLE skips the object and its whole subtree in every PRINT-CONT and DESCRIBABLE? title, so the existing
   inventoryInvisibleAttribute subtree skip is correct and unchanged.
4. Reach is small: every ZIL ITAKE clears NDESCBIT, so held NDESC carriers occur only at startup or nested
   (e.g. Wishbringer rusty key in the lab coat, Moonmist coat of paint in the cane).

## Proposal
P1. New per-title fact, set from the source classification: `"inventoryHiddenRecurses": true` (RECURSES titles only).
    Absent or false keeps today's subtree skip byte-identical (FLAT titles, Inform, unmapped).
P2. In walkVisibleDescendants, when the hidden bit is set on a child, the title has inventoryHiddenRecurses === true,
    and the child is not INVISIBLE: do not push the child itself, but continue the walk into its children with the same
    depth budget the child would have had. Otherwise keep the current `return`.
P3. Actionable.js possession filter: same rule for an actor's possessions.
P4. inventoryHiddenPreservesWorn is unchanged and still checked first.
P5. Unblocks inventoryHiddenAttribute facts for the RECURSES titles, each still needing its exact NDESC bit from the
    source plus a fact-level audit. No native positive is possible for most titles (ITAKE clears NDESC), so the evidence
    is source-proven like the transparent x8 precedent.
Validation: a constructed harness on Zork I bytes (a held NDESC container with a visible child: the child is listed and the
parent is not); a FLAT control (Moonmist: both omitted); INVISIBLE control (subtree omitted); no-fact control (identical);
operator 13/0; 309x2 gate.
Prior guards: the inventory-hidden precondition (ZIL-BOARD), D145, the inventoryInvisibleAttribute rollout,
inventoryHiddenPreservesWorn.

## R2 (claude, adopting codex REVISE oct30-recovery/D1-r1-attack.md)
1. P3 (actor possessions, Actionable.js ~1505) DEFERRED: player-inventory recursion does not establish an actor-possession
   contract. Actors keep today's subtree skip.
2. P2 is not an unconditional tunnel. An NDESC-hidden child goes through the SAME per-child path as any child (visibility,
   container open/transparent, animate, unnamed-wrapper, cycle `seen`, depth budget, parentId); only its own label push is
   suppressed. Concretely: compute `suppressLabel` instead of `return`, run the existing body, and skip only `out.push` for
   that child.
3. Title dispositions before any facts:
   - Spellbreaker: EXCLUDED until its BRIEFBIT/verbosity exception (verbs.zil:1868) has a disposition. No
     inventoryHiddenRecurses.
   - Witness: DEBUG tags print only with DEBUG (PRINT-CONT 481). Normal play is plain RECURSES; disposition recorded.
   - The fact requires the exact family/owner guards used elsewhere: confirmed-zil-family validated, executableLayoutFacts,
     a boolean literal. Malformed means absent.
4. Constructed harness matrix (Zork I bytes):
   - hidden parent with a visible child (child listed, parent not);
   - hidden + closed opaque parent (child not listed: normal container rule);
   - hidden animate (normal animate rule);
   - depth budget exhausted;
   - worn + INVISIBLE (INVISIBLE skip wins; inventoryHiddenPreservesWorn still first for NDESC);
   - no fact (byte-identical); Inform (unaffected); FLAT Moonmist (subtree skip unchanged).
