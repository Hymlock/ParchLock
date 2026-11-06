# NOV4 priority review (grok, sealed 2026-11-04 ~17:50 ET, independent; Codex-priority-review.md NOT read)

Inputs read: OPEN_WORK.md @ aa141b8d, git log since 11-01 (8e2c906b, 2044b658, 809d4f63, 378c0755, aa141b8d),
zil-profile-ledger (c3dfec41 regen), nc-keys-proposal-r1 (R1-R4 + DECIDED), visited-touchbit-audit, lightsource-radial-check,
PACKET-suspended-enterable, VERDICT-AUDIT-airlock-board, Codex reconciled-queue NOV2/NOV4 blocks, PLAN 9504 / ARCH 4177,
seat-rules. Bus: original 6000 halt retained (423); this file is durable delivery only.

## 1. Stale-row corrections to OPEN_WORK.md (verified against checkout)
- Header "Latest APK 7A9C9C18 vc49" is STALE: Codex published build76 / android50 / cache175, release v0.dev-2026-11-04
  (roy-keyboard-20261104). E7 phone test should target that build, not vc49.
- B3 versionCode: now 50 (Codex). Row stays Done; note value.
- Z2 Sorcerer: the WORN half is DONE (56d6016f, equipmentState.wornWhen wearable-direct-player, AttributeSchema.js:925).
  Only the light half remains (PLAN 9504: on11 accepted, Equipment shows on=true / switchable=false; wrapper light=false).
  Rename Z2 -> "Sorcerer light display (on11 vs light=false)"; state vs capability must stay separate.
- Z1 "94 no-reader keys / Blocked three-seat": STALE. nc-keys DECIDED (four-seat 10-31): proper/female/pluralname L:NC
  no-composer (ACCEPT x4); light stays D247 NC (ACCEPT x4); visited audited REDUNDANT 24/25 (visited-touchbit-audit.md);
  Suspended enterable LANDED (facts :1447, four-seat); lightSource BUILD landed as lightForms (cb04cc1b, 6051d3d8, d4e89ea7)
  for Infidel/Cutthroats/Enchanter/Sherlock. Truly open in Z1: PlunderedHearts torch 9 lightForms (U, needs route 2+1),
  Moonmist raw Locked display (Codex-assigned, D5-style, moonmist-raw-lock-audit.md 10-30), Borderzone matchbook
  (unverified), Hitchhik ONBIT room-lit (no consumer; reopen-on-use only). Status -> Partly done, not Blocked.
- Z4 Seastalker BOARD: grok-review VERDICT-AUDIT-airlock-board ACCEPT "no consumer work now; scoped research, not
  won't-fix"; native still BLOCKED by SCIMITAR route. Keep Blocked (research), owner Codex audit of that verdict (E5).
- A2: Done (correct). M1/M2/B3: Done, Codex audit pending (E5).
- "Known issues 11-01": Tokyo2 soup + Blue Chairs shirt (after first i) fixed 8e2c906b; remaining by design/evidence:
  BC shirt before first i, BC $23 wallet, Tokyo2 popcorn (real held). Move to rows with 8e2c906b.
- E5: Codex IS back -> no longer Blocked; it is now a ready review task (see 4).
- Rows unchanged by any commit since 11-01 (rechecked by path/grep): M3-M12, I1-I6, A1, A3-A6, S1-S6, B1, B2, B4-B8, E1-E4, E6.

## 2. Full26 ZIL useful-consumer remainder (my measured view; zero ledger-open != full26 complete)
Wrong/missing player-visible outputs in ZIL titles, ranked:
1. A4 PROFILE-fallback bit leaks (Suspect: static=NDESCBIT on food/lariat/fairy mask/TV, scenery=LOCKED17 on doors;
   'on' -> OPENBIT13 because 'on' is not zilStructural, AttributeSchema.js ~311-317, feeding EquipmentUI.activationStateTags).
   If static=1 suppresses Take on real takeables this is a WRONG radial across possibly several of the 26. Unmeasured
   title-wide -> research first. A1 (Suspect "remove mask" noun) is the same family (shared ActionSynth.referenceFor).
2. Sorcerer light display (Z2 remainder): app says dark/light=false while native lists both items providing light.
3. PlunderedHearts torch 9 lightForms (missing Light option), then Moonmist Locked display (Codex lane).
4. Z3 Sherlock Take hints (D214 FIND reader) - larger, after 1-3.
Evidence debt that can reopen ZIL items: E1 lapel, E2 LH133/Starcross176 natural wear, E3 V34/V69 docs.

## 3. Proposed top 3 (ZIL first, per standing operator priority)
1. Codex audit of grok solo commits (E5) - small, unblocks trust in shipped code: 1d9a3130, e643191b, 86dc0012,
   8feb21d5, 8e2c906b (+ SOLO-COMMITS retro rows). Reviewer: Codex. No gate needed (already gated).
2. A4+A1 leak family: grok READ-ONLY census across all 26 ZIL titles with the existing radial composer
   (audit-r43/radial.cjs load(), reuse lightsource-radial/run.cjs shape): per title, which objects get static/scenery/on
   from PROFILE fallback vs exact facts, and which radial rows change (Take lost / dead remove). Output packet + proposal;
   no js until Codex ACCEPT; shared code -> one 309x2 gate per candidate (rule 20).
3. Sorcerer light display (Codex or grok after #2): proposal reusing accepted on11 evidence, no new FROTZ probe.
Then: PlunderedHearts torch route, Moonmist Locked (Codex), Sherlock FIND, then Inform I2 (S, generator missingNames)
and I1 batches; Glulx I6 last (operator ruling). Build items B1/B2 (make-dist safety) are small and independent but
touch the release script -> only with Codex ACCEPT and never during a build.

## 4. Ready (approved) vs research
- Ready, no design needed: E5 audits (Codex), OPEN_WORK stale-row doc fix (grok, Codex ACCEPT), I2 missingNames (S, tool only).
- Research needed before code: A4/A1, Sorcerer light, PH torch route, M3 LASH, M4 yagwad, M5 guess, B1/B2 design.
- Operator-blocked: M10, B5, B6, A6 (which panels), E7 (phone), E6 (owners).

## 5. Review / gate dependencies
- Codex = reviewer for all grok work while present (grok-review stand-in retired; its verdicts stay logged for re-audit).
- js/ shared changes: operator-regressions 13/0 + three-type + one 309x2 gate per candidate; facts-only exact-digest
  changes: focused harness + operator + three-type (as 8e2c906b).
- Only Claude edits PLAN/ARCH (rule 23); grok sends evidence entries.

## 6. grok exact disjoint claim / next step
Claim (read-only, no js/, no facts): work/investigations/zil-titles/grok-lane-1031/leak-census-1104/ for item 2 above.
Next: run the census, write PACKET-a4-leak-census-1104.md, send REVIEW-REQUEST to Codex. I will not touch
OPEN_WORK.md until Codex agrees the corrections in section 1.
