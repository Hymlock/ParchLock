# Blind investigation: HugeCave knapsack actions (grok2)

**Bus:** #4167 / unpark #4187  
**Game:** `games/HugeCave.z8.js` (Adventure in Humongous Cave)  
**Operator save:** `work/investigations/2026-10-18-hugecave-operator-save.json`  
**Blind:** Did not read claude 2026-10-18 knapsack sealed files.  
**Checkout:** current (c24ae52 base + dirty tree). Read-only.

## Operator words
Knapsack had **no open/close** until used the first time. After open, system **automatically took the matches** out. **Inventory did not update** to show matches no longer in knapsack.

## Causes (file:line) — static + logic

### H1 (strong): worn inventory collapses verbs to examine/remove only
`js/ActionSynth.js:257-258`:

```js
if (context === "inventory" && ActionSynth.isWorn(obj)) {
    verbs = ActionSynth.inspectVerbDisabled() ? ["remove"] : [ActionSynth.defaultInspectVerb(), "remove"];
}
```

Any inventory object classified **worn** loses **all** `verbsForAttrs` output (container → open/close/search/empty at `ActionSynth.js:11`, openable pair at line 5). Only examine/remove remain.

`isWorn` (`ActionSynth.js:115-120`) is true when `attrs.worn || attrs.isWorn` (and not scenery-without-clothing).

**Implication:** If the knapsack is worn **or** its worn bit is wrongly true before first use, Open/Close never appear on the inventory radial. After a successful open/use, calibrator or bit refresh may clear worn or set openable — matching “no open until I used it first.”

### H2 (strong): nested contents only get single “take X” action
`js/ActionSynth.js:229-250`: if `context === "inventory" && containerName` (item nested in held/worn container via `heldContainerName`), **return early** with one command:

- label: `take out of <container>`
- submit: `take <noun>` (D78)

No open/close on the **matches** while inside the knapsack — only take. Short tap on nested item = take (plan R1 T3 bullet). Explains automatic take-out if UI or player path hits that single action; also if open-knapsack flow somehow targets contents.

### H3 (moderate): open/close gated by openCapability
`ActionSynth.js:61-71`: when `AttributeSchema.openCapability` exists for the digest, container open/close require `openCapabilityAllows`. Wrong/missing fact → no Open/Close even with container bit.

### H4 (inventory stale after take) — separate surface
After matches leave knapsack, Equipment/inventory UI must rebuild from `WorldModel` payload / LiveMarks. If:
- take succeeds in VM but EquipmentUI does not refresh on that turn, or
- nested listing still shows parent’s last inventory text until next `i`,

operator sees stale “matches still in knapsack.” Likely `js/EquipmentUI.js` / inventory render path + `WorldModel.tick` timing — **needs live repro** to pin file:line (not sealed here without browser run).

### H5 (game may auto-move matches on OPEN)
Some adventure ports put matches in knapsack and spill on open. That would be **story** behavior, not app inventing take — but app may still fail to refresh inventory (H4). Distinguish with live: after open, did app submit `take matches` or only `open knapsack`?

## Map note from operator save
Save shows real room graph (End of Road 113, etc.) — map works for this title; defect is inventory/actions, not empty-map Pattern A.

## What is NOT claimed without live run
- Exact knapsack object id / worn bit at boot
- Whether first “use” was examine vs open vs other
- Whether matches take was app Submit vs story side-effect

## Suggested fix direction (investigation only)
1. Worn inventory containers that are also `container`/`openable` must **keep** open/close/search (merge worn branch with attrs verbs, not replace).
2. Nested-in-container single-action rule: keep D78 take submit, but parent knapsack radial must expose open/close when not merely worn-clothing.
3. After any inventory-changing command, force Equipment refresh from fresh payload.

## Live follow-up
Playwright boot HugeCave, restore or walk to knapsack, dump attrs + `commandsForObject` for knapsack and matches before/after open. (May run after this seal if monitors allow.)

Seat: grok2  
Sealed: 2026-10-19
