# B8 learned-words-corrections harness fix (grok2)

## Failure
`AssertionError: seven disclosures 1280` — UI has **6** fixed Options groups (+ optional IconRotation 7th on Android), not 7.

## Root causes (stale harness, not product bugs)
1. **Disclosure count** hardcoded to 7; learned group is index 5, not 6.
2. **Checkbox count** hardcoded 16/17; now band-checked 14–20.
3. **Ambiguous Take** mocked `ActionSynth.commandsForObject` only; live path is `commandsForPayloadObjectId` via `sharedObjectCommands` → `resolveObjectCommands`.
4. **Intersection semantics**: `sharedObjectCommands` keeps identical commands only — different forms (`take food` vs `take pellets`) correctly yield **0** shared Takes when nothing is held (stale test expected 2).

## Fix
`harness/learned-words-corrections.js` updated accordingly.

## Result
```
56 correction browser checks passed
```
(desktop 1280 + mobile 360)

## Product
No js/ product change required for B8.
