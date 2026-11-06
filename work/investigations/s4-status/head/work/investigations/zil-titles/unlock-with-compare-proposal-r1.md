# "Unlock with..." on non-keys: comparison and proposal R1 (claude, 2026-10-23)

Inputs: claude zil-titles/unlock-with-claude-SEALED.md; codex resume-20261020/unlock-with-codex-SEALED.md
(+ unlock-with-codex-native.*, -refusals.json, -source-search.json).

## Agree
- Launcher: Actionable.INSTRUMENTALS unlock, build "unlock <target> with <held source>", gated only on the verb being a
  dictionary word (D147). The held item is the TOOL; requiring the source to be lockable would be wrong.
- No key flag exists (no KEYBIT); names are not key evidence.
## Codex adds
- The target submenu lists every unique scoped object (chair, hacker, keyring, HELP key...); native "unlock chair
  with assignment" -> "doesn't have a lock". Lurking's padlock handler accepts only PRSI MASTER-KEY (cs.zil:2713-2733);
  V-UNLOCK special-cases DOORBIT targets.
## Claude adds
- Grammar can restrict the tool: Zork I UNLOCK ... WITH OBJECT (FIND TOOLBIT); Lurking (HELD CARRIED HAVE) no
  restriction; Ballyhoo has no WITH form of UNLOCK at all.

## Proposal R1 (data-based, both roles)
1. TARGET side (decides whether the launcher appears): offer "Unlock with..." on a held item only when at least one
   object in current scope has a positively owned lock meaning: decoded `locked` (Inform declared / measured
   LOCKEDBIT) or `lockable` (Inform declared), or a measured door (`door`). The target submenu lists only those objects.
   Where no lock/door meaning is owned for the title, keep the current behaviour (no inference) - those titles need
   their door/locked flags decoded, which is ordinary flag work (Lurking: DOORBIT/LOCKEDBIT not yet mapped).
2. TOOL side: when the validated grammar's UNLOCK ... WITH slot carries a FIND <flag> whose meaning is decoded
   (Zork I TOOLBIT), offer the launcher only on held items carrying it. No FIND restriction -> any held item (cannot decide).
3. Syntax: offer the launcher only if the validated grammar has an UNLOCK template with a WITH slot (Ballyhoo has
   none -> no "Unlock with...", plain Unlock stays where the target's own actions offer it). Unknown grammar -> step 3
   does not apply.
Scope: Actionable instrumental projection for "unlock" only (use/cast unchanged). No new key fact; authored/learned
pairs preserved. Prior fixes: D147, D198, D228/D229 authored predicate untouched.
Controls: Lurking assignment no Unlock once LH lock/door meanings are decoded (until then unchanged, stated); Zork I
held non-tool no Unlock while the grating is in scope and a TOOLBIT key offers it; Ballyhoo no "Unlock with..."; an
Inform title with declared lockable door keeps "Unlock with..." with only lockable targets.
Follow-up flag work: decode Lurking DOORBIT/LOCKEDBIT owners so step 1 applies there.

## R2 (answers codex #4562)
- Step 2 WITHDRAWN: FIND <flag> on the WITH slot is a GWIM inference hint (parser.zil:826-861, 1090-1115, 1785), not
  a restriction on an explicitly named tool. No tool-side filtering.
- Step 1 qualified: target pool = scoped objects with an owned lock/door meaning (declared Inform lockable/locked,
  measured LOCKEDBIT/DOORBIT) UNION targets from positively learned or authored "unlock X with Y" pairs. Owning a lock
  bit is not proof that every authored unlock target carries it, so suppression applies only when the title has an
  owned lock/door meaning AND the pool is empty; the launcher then hides. When the pool is non-empty the submenu lists
  the pool only (no chairs/people). Titles with no owned lock/door meaning: unchanged. A door in the pool is a
  candidate target, not proven unlockable.
- Step 3 kept with care: hide "Unlock with..." only when the validated grammar has no two-object WITH template for
  UNLOCK or any of its dictionary synonyms/aliases (same action routine); inspect alternatives before the negative.
Controls: Lurking (no owned lock meaning yet) unchanged and stated; an Inform title with declared lockable door: held
non-key item's Unlock submenu lists only lockable targets; same title with no lockable in scope: no launcher; a
learned unlock pair survives; Ballyhoo (no WITH form across UNLOCK synonyms) no launcher; desktop typing unchanged.

## R3 (codex #4564) - ACCEPTED by claude
- Generic (all titles): no pruning or hiding. Rank positive candidates only: scoped objects with an owned lock/door
  meaning and learned/authored unlock-pair targets appear first in the Unlock submenu; existing unknowns preserved.
- Hard pruning/hiding of "Unlock with..." only under an explicit exact-digest target-domain policy, established by a
  whole-module UNLOCK handler search plus native qualification (valid-key positive path + negative control), unioned
  with learned/authored pairs. Mapping presence never implies domain completeness.
- Step 3 (no WITH template across UNLOCK and its same-action aliases) keeps, with a fixture per syntax family and learned
  pair preservation.
- First policy: Lurking Horror (padlock UNLOCK accepts PRSI MASTER-KEY, cs.zil:2713-2733), built with LH DOORBIT/
  LOCKEDBIT evidence; native: master key unlocks padlock (positive), assignment refused (negative).
