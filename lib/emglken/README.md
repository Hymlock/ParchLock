# Emglken staging (O1 dual-host)

Vendored from npm `emglken@0.7.2` (curiousdannii/emglken).

## Default

Quixe/ZVM in `lib/main.js` remain the default host. These files are staged for dual-host work and do not replace Quixe until `?vm=emglken` wiring is complete.

## Engines present

- `bocfel.js` / `bocfel.wasm` — Z-machine (Inform)
- `glulxe.js` / `glulxe.wasm` — Glulx (Inform)
- `asyncglk.js` — AsyncGlk helper used by modern Parchment

## Activation

`js/EmglkenHost.js` detects `?vm=emglken` and reports capability into `window.__EMGLKEN_HOST__`. Full story launch via Bocfel/Glulxe is the next step after GlkOte bridge work.