# P10b + Hollywood locked 15 (grok2 implement 2026-10-30)

## Code
- ExitCalibrator.js:148, :623 — isLocked = !!(attrs.door && attrs.locked)
- ZRamReader.js:2584 — same
- ModuleStatFactsClaude.js Hollywood attributeMap locked: 15

## Tests
- node --check ExitCalibrator, ZRamReader, ModuleStatFactsClaude OK
- operator-regressions 13/0

## Controls (manual / follow-on gate)
- Hollywood Foyer room destination: no false Navigator pause
- Oak DEXIT locked+closed: still routeBlocked pause
- WorldMap lock glyph still doorObjectId-gated

## Status
WC dirty pending Claude sole-gate or commit. ACCEPT was #5712.
