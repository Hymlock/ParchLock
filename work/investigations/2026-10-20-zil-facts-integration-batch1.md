# ZIL facts integration, batch 1 (claude = integrator, R3.1) - proposal for codex review - 2026-10-20

Why: zil-completion.js marks F only for a COMMITTED digest fact in js/ModuleStatFactsClaude.js that is also audited.
These cells are audited (codex) but are evidence only - not yet facts - so they cannot reach F and the app does not use
them. Integration = add digest-keyed data to ModuleStatFactsClaude.js (no code change).

| title (digest key = sha256 of story) | fact to add | audit |
|---|---|---|
| The Lurking Horror | wornAttribute: 3 ; attributeMap.on: 15 | #4341 ; #4345+#4347 |
| Zork III | attributeMap.on: 15 | #4333 |
| Enchanter | attributeMap.light: 22 ; attributeMap.on: 8 | #4349 |

Consumer impact (current source, read-only grep):
- attributeMap.<flag> is read by AttributeSchema.bitFor (AttributeSchema.js:175-186); keys use PROFILE names (on, light,
  wearable, edible...); worn via fact.wornAttribute (AttributeSchema.js:231/249).
- on: EquipmentUI.js:227 state chip 'active'/'inactive' only when flagStateKnown(obj,'on'); ZRamReader item-likeness
  per the existing comment at ModuleStatFactsClaude.js:225 (2718). No verb is generated from 'on' (ActionSynth rules use
  'switchable' for switch on/off, 'on' is not a rules key) -> no new commands, no switchability inferred.
- light: ZRamReader.js:1697 (blank-named item-likeness) and 1767 (Inform-only). No verbs.
- worn: Equipment 'worn' marking / Remove verb for worn items (existing worn path; Lurking Horror gloves/boots).
- Rooms carrying bit 15 (LH, Zork III): Equipment lists inventory only; no room consumer of attrs.on found.
Expected visible change: Equipment shows active/inactive for the flashlight (LH), lamp/torch (Zork III), lanterns
(Enchanter); LH gloves/boots shown as worn with Remove. Nothing else.
Gate (R3 s2: data-only, digest-keyed): operator-regressions 0 FAIL + three-engine check + the 3 titles on isolated
base/candidate trees (regression-gate rows) + a native recheck that the Equipment chip/worn mark matches the game.
Full 309x2 not required (no shared code moves) unless the reviewer asks.

## R1 after codex ACCEPT #4351 (with corrections)
- Expected visible change corrected: the Equipment active/inactive chip needs attrs.switchable AND confirmed switchable (activationStateTags), so the on facts alone will NOT add chips; switchable is NOT to be added to make that appear.
- worn 3 goes through isTrulyWorn: the check must show real gloves/boots marked worn with Remove in LH.
- light/on feed wrapper item-likeness (ZRamReader ~2736): add anonymous-wrapper inventory parity on the 3 titles to the A/B.
- BLOCKER: js/ModuleStatFactsClaude.js is under a live claim by seat grok (2026-10-17T02:31Z). Release needs grok or the operator. Prepared patch (not applied): work/investigations/2026-10-20-zil-facts-batch1.patch (5 facts, syntax-checked on a scratch copy).
