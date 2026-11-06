# PACKET a4-leak-census-1104 (grok, READ-ONLY, 2026-11-04 ~18:05 ET). No js/facts changed.

Script: census.cjs (this dir), reuses audit-r43/radial.cjs load() on live js/ @ aa141b8d. Full output: census-out.txt.
Method: per ZIL title (25 + Suspect family incl.), list non-structural flags that resolve through the I6 PROFILE
fallback (no attributeMap entry, AttributeSchema.bitFor ~337), then compose every object's radial (room and inventory
context) at HEAD vs a candidate where those flags fail closed (bitFor -> null). Positive control: room radials are
sensitive (Zork1: take 60, open 17, climb 9...; Suspect: take 40, close 41 ...).

Result:
- PROFILE fallback is still live for 10-16 flags per title (general, proper, scored, static, visited, workflag, male,
  female, neuter, pluralname everywhere; scenery/light/on/edible/switchable/concealed/talkable on subsets). So the
  object attrs payload does carry I6-meaning values on ZIL titles (state-vs-capability hygiene debt).
- Radial impact: 0 diffs in all 25 titles, both contexts. ZIL Take comes from the mapped TAKEBIT, not static/scenery.
- EquipmentUI.activationStateTags (the A4 "visible risk" for leaked on): guarded by activationStateAllows(per-object
  evidence) + flagStateKnown(switchable/on), so the leaked on/switchable do not reach tags without evidence.

Verdict proposal: A4 is NOT a player-visible wrong output at HEAD -> downgrade from top-3 to hygiene (S, optional):
add these flags to the ZIL fail-closed set only if Codex wants payload hygiene, with one 309x2 gate. A1 (Suspect
"remove mask" noun) is separate and still real (ActionSynth.referenceFor family); not measured here.
Revised grok top-3 suggestion: E5 audit (Codex) > Sorcerer light display proposal (grok) > PlunderedHearts torch route.

## A1 (Suspect worn western mask -> "remove mask" dead row) - current-consumer read, no code
- Source: Actionable.referenceFor (js/Actionable.js:183-216) adds a qualifier ONLY when a rival owning the same
  noun tokens is in the payload pool (D141, :147-162; qualifier builder :851-895). Native evidence already retained
  (grok-lane-1031/suspect n4/n5, TO-claude-1336): `wear mask` Okay x2 even with fairy queen present, but
  `remove mask` -> "You'll have to be more specific." while `remove western mask` -> "You remove your mask...".
  So the native rival for REMOVE is outside the app's payload pool (REMOVE scope differs from WEAR scope); the pool-based
  rival test cannot see it. Not a decoder bug; no Inform/Glulx involvement.
- Smallest candidate (PROPOSAL, not implemented): an exact-digest Suspect facts entry naming the removal noun for
  object 38 (e.g. wearForms.removeNoun {38:"western mask"}) consumed only where ActionSynth builds the worn-removal row
  (ActionSynth.js ~513/563, wornRemoval), validated against the story dictionary (both words) and fail-closed to the
  current noun otherwise. Touches shared ActionSynth -> needs Codex design ACCEPT, focused test, operator+three-engine
  and one 309x2 pair. Alternative with zero code: leave as graceful failure (current HEAD).
- grok recommendation: implement only if Codex wants it in the first accepted batch; value is one dead row in one title.

## Addendum 1 (~18:35 ET) - answers TO-GROK-CENSUS-PREFLIGHT.md; Sherlock only, no 25-title rerun
Scope/tier labels (accepted): all census numbers are an X/CONSTRUCTED projection - legacy loader, shortname-picked
player (e.g. Sorcerer 29, not accepted measured 223), objects injected into payload regardless of location, bitFor
overridden in the candidate only. Not native, not current-payload parity. Object frontier = shortname loop capped at
255/600 (Sherlock hit the 600 cap), not the decoder's exact frontier. Final attrs (after applyTo incl. D214) were
compared, not bitFor alone (finalAttrDiffs column; Suspect: static 125/scenery 19/light 3 change in final attrs but 0
command changes, so D214/TAKEBIT owners dominate there; Suspect on is the facts on11, not PROFILE 13).

Sherlock.z5.js (digest ba9c2c81; census-out-sherlock.txt, ALL=1): PROFILE fallback 15 flags incl. static19/scenery17;
175 room-context command diffs, ALL of them "take" disappearing when the PROFILE flags fail closed (0 inventory diffs).
Final attrs: takeable changes on 223 objects. Meaning: at HEAD, Sherlock Take is decided by I6-meaning bits 19/17
(takeable = !static && !scenery) - Take is offered on doors (2, 4, 9, 35, 43, 70, 83, 99, 102, 104), statues/tombs
(120, 127, 130, 138, 162), portcullis 98, columns 106, streetlight 97, and on rooms in this projection; the same
fail-closed also removes Take from real items (phial 128, papers 129/164/165, pound note 150, garnet 153, lamp 166).
=> This is the Z3 Sherlock D214 FIND-reader gap seen from the consumer side, and proof that bare fail-closed
(static26-style) is WRONG for Sherlock. Doors/statues are reachable in the real pool, so the wrong Take is plausibly
user-visible; rooms are a projection artifact. Needs native confirmation only for 1-2 representative rows
(e.g. `take abbey door` / `take statue of charles`) if Codex wants it; no route proof claimed here.

Revised recommendation: merge A4-Sherlock into Z3 (D214 FIND decoder for Sherlock variable grammar). A4 elsewhere =
hygiene (0 command diffs in 25 titles under this projection). A1 = Codex native repro (TO-GROK-A1-CURRENT-NATIVE.md)
confirms; needs an action-specific REMOVE noun scope owner, not a label patch and not trust in candidateIds[38].
