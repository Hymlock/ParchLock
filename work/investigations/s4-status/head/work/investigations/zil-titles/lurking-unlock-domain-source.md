# Lurking Horror unlock target domain: whole-module source search (claude, 2026-10-23)

Input for the R3 exact-digest target-domain policy (codex native evidence: resume-20261020/lurking-unlock-native-qualified.json,
roof 163 bit 19 clears only with held master key 95, crowbar 156 refused). Source: historicalsource lurkinghorror (cached,
not an exact-build recompilation claim); searched every .zil file.

- The lock flag is named LOCKED (no LOCKEDBIT in this module). Static carriers (FLAGS): ACCESS-HATCH, ALCHEMY-DOOR,
  CURTAIN-DOOR, OUTSIDE-DOOR, PADLOCK, ROOF-DOOR. Runtime FSET/FCLEAR LOCKED: PRSO generic (green.zil ~183/186 and
  cs.zil 2701/2724), PADLOCK, ACCESS-HATCH, CHAIN-2, ALCHEMY-DOOR.
- DOORBIT carriers: ACCESS-HATCH, ALCHEMY-DOOR, ALCHEMY-TRAP-DOOR, CURTAIN-DOOR, DOME-DOOR, ELEVATOR-DOOR(-1/-2/-3/-B),
  MANHOLE, OFFICE-DOOR, OUTSIDE-DOOR, ROOF-DOOR.
- V-UNLOCK (verbs.zil:1537): DOORBIT PRSO + PRSI MASTER-KEY -> unlock; otherwise falls back. UNLOCK handlers with own
  logic: cs.zil ACCESS-HATCH-F (needs padlock first) and the padlock clause (PRSI MASTER-KEY; LOCK/CLOSE/TIE with
  CHAIN/CHAIN-1/CHAIN-2/ACCESS-HATCH), green.zil OUTSIDE-DOOR-F (OPEN UNLOCK), frob.zil URCHIN-F (actor refusal branch).
- Candidate exact-digest domain: targets = {DOORBIT objects} U {PADLOCK, CHAIN-2 (runtime LOCKED)}; the only tool any
  handler accepts is MASTER-KEY. "Unlock with..." on any other held item (assignment, food, crowbar) can never succeed.
- Needed before a policy: map source objects to runtime IDs (roof 163 known), measure the LOCKED and DOORBIT bit
  numbers (bit 19 = LOCKED on roof 163 per codex; DOORBIT number from a door owner), one more native positive (padlock or
  another door with the master key) for the >=2-positive bar, and the crowbar negative already in hand.

## Correction (codex #4572, verified)
V-UNLOCK (verbs.zil:1537-1544) does NOT unlock doors: DOORBIT + MASTER-KEY prints "The key fits perfectly in the lock,
but the lock doesn't turn. The master key doesn't work on this lock."; otherwise it falls to V-LOCK. So DOORBIT is a
PLAUSIBLE target class only, never a proven one.
- PROVEN-capable unlock sites (FCLEAR LOCKED in an UNLOCK path): green.zil:183 (roof-door path; codex native: roof 163
  clears bit 19 with held master key 95, crowbar refused); padlock cs.zil:2724/2730 (PRSI MASTER-KEY); CHAIN / CHAIN-2
  alias cs.zil:3757-3770 (UNLOCK CHAIN or CHAIN-2 WITH MASTER-KEY, state on CHAIN-2, delegates PADLOCK).
- Not unlock-by-player (state changes from game events, to confirm): CHAIN-2 cs.zil:1761, ALCHEMY-DOOR cs.zil:5021.
- Curtain-door side condition frob.zil:914-919 (codex) must be read before classifying CURTAIN-DOOR.
Revised candidate policy: proven targets = {ROOF-DOOR, PADLOCK, CHAIN, CHAIN-2} with tool MASTER-KEY; other DOORBIT /
LOCKED objects = plausible (ranked, not offered as proven). Withdrawn: "targets = DOORBIT U {...}".
