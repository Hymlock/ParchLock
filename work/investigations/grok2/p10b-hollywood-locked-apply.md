# After P10b lands: Hollywood locked=15

Evidence: `work/investigations/zil-titles/hollywood-locked-notes.md` (S)

- Bit **15** = LOCKEDBIT; no collision on current Hollywood attributeMap
- Native: oak door 117 lock/unlock/statue; hatch 155 negative

## Apply (after P10b ExitCalibrator + ZRamReader)

```text
HollywoodHijinx.z3.js attributeMap.locked = 15
```

## Gate controls

- Foyer room destination exit: no false pause
- Oak DEXIT locked+closed: still pauses (routeBlocked)
- opreg 13/0

Waiting Claude P10b implement (ACCEPT #5712).
