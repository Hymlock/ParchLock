# D17 SEALED — idle PM_Stats_* rewrite storm (grok2 blind)

**Date:** 2026-10-30  
**Problem (operator/Claude #5702):** idle play tab, no input → `localStorage` key `PM_Stats_<id>` rewritten ~13×/s.  
**Scope:** `js/StatTracker.js` + call sites only. No other seat notes read.

## Root cause (two cooperating mechanisms)

### A. Continuous Tick driver (why anything runs while idle)

`StatTracker.Bind` installs a `MutationObserver` on `#windowport` / `document.body` with `{ childList, subtree, characterData: true }` (`StatTracker.js` ~4409–4417). Any DOM mutation schedules:

```js
setTimeout(function () { scheduled = false; StatTracker.Tick(); }, 20);
```

While idle, GlkOte still mutates the port (status-grid `characterData`, cursor/caret, buffer churn). That yields a steady Tick cadence (~tens of Hz theoretically; observed ~13 writes/s after save coalescing).

`WorldModel` also calls `StatTracker.Tick()` on apply (~line 545), but that alone does not explain idle-with-no-input.

### B. Model mutates on every Tick → save always “dirty”

`Tick` always calls `observe(mem, statusText())` (~3126).  
`observe` **always** ends with:

```js
StatTracker.save(key, model);  // ~2051
```

`save` (~1618–1625) already skips writes when `JSON.stringify(model) === _lastSaved` (D157). So continuous writes imply the **serialized model changes every Tick**.

Primary dirtying path in `recordObservation` (~2074):

```js
prev.seen = (prev.seen || 1) + 1;
```

This runs for **every** status sighting of an existing stat, even when `value`/`label`/`max` are unchanged. Once a status metric is confirmed (score/turns/time/etc.), idle status re-reads still inflate `seen` forever → new JSON every Tick → `localStorage.setItem` every Tick.

Secondary dirtying (can amplify DOM churn, not required for save storm):

- `Render` (~3675–3676) sets `rec.badgeUntil = Date.now() + 1500` when `lastChange` is set; badge fields live **on the model record**, so they enter `JSON.stringify(model)`.
- `readConfirmedGlobals` updates `stat.value` when RAM changes (clocks); that is legitimate change, not idle spam at 13 Hz unless RAM itself is thrashing.

## Why ~13/s specifically

Not a dedicated `setInterval(…, 77)`. It is:

1. GlkOte / status DOM events → observer → Tick (throttled 20 ms one-shot, re-armed per burst)  
2. Each Tick → `observe` → `seen++` → new JSON → write  

Write rate tracks mutation-event rate, not wall-clock second boundaries.

## What is already correct (not the bug)

- D157 skip-if-unchanged in `save` is right; it cannot help if `seen` keeps changing.  
- `applyRows` already no-ops when `innerHTML` equal (~3697–3698).  
- Persistence of **pins** (`globals`, `carry`) across load is intentional (D178).

## Right fix (ordered)

1. **Stop unbounded `seen` growth after confirmation**  
   In `recordObservation`, only bump `seen` while `!prev.confirmed` (or cap at `CONFIRM_SAMPLES`). After confirmed, update value/label/max only when they change.  
   This alone should drop idle writes to ~0 when status is stable.

2. **Do not persist ephemeral presentation fields**  
   Before `JSON.stringify` in `save`, omit or strip `badgeUntil`, `badgeDelta`, `lastChange` (and any other render-only fields). Keep them in-memory only.  
   Prevents badge timers from rewriting storage and from false-dirtying.

3. **Optional harden (not required if 1+2 land)**  
   - Drive Tick from turn boundaries / WorldModel.apply only for RAM observe; use a cheaper path for pure status paint.  
   - Or ignore MutationObserver `characterData` under `.GridWindow` if no childList change.  
   Riskier; prefer 1+2.

4. **Do not** remove status observation or headless global reads — those are the feature.

## Measurement plan (if lead wants live confirm)

In idle play tab DevTools:

```js
// count setItem on PM_Stats_
const _set = localStorage.setItem.bind(localStorage);
let n = 0; const t0 = performance.now();
localStorage.setItem = function (k,v) {
  if (String(k).indexOf('PM_Stats_') === 0) n++;
  return _set(k,v);
};
setTimeout(() => console.log('writes/s', n / ((performance.now()-t0)/1000)), 3000);
```

After fix 1: expect ~0 writes/s idle with stable status.

## Files

- Cause: `js/StatTracker.js` — `Bind` MutationObserver; `Tick` → `observe` → `recordObservation` (`seen++`); `observe` unconditional `save`.  
- Fix locus: `recordObservation` + `save` serialization strip.

## Product edits

None this seal (investigation only).
