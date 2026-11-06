# PACKET grok-lane-1031 / Infidel transparent -> L:NA (no closed-container state in which TRANSBIT could matter)
Author: grok. Reviewer: codex. Date: 2026-10-30, 11:45 PM ET. Supersedes grok1/transp/infidel.json (N? candidate).

## Source census: TRANSBIT 23 FLAGS carriers (11), all start OPENBIT
- SURFACEBIT carriers: discs ante:550/560/570, camp:1245 TRUNK, camp:2092 CRATE, ra:256, temple:156/232.
- Non-surface carriers: barge:263 MAST-HOLE, barge:305 TORCH-HOLDER (knothole), camp:103 FIREPIT.
- No TRANSBIT setter or clearer exists anywhere (`FSET/FCLEAR .* TRANSBIT`: 0 hits).

## Can any carrier become closed?
OPENBIT clearers in the whole source are ante:854 INNER-DOOR, camp:1956 KNAPSACK, the diamond.zil doors, verbs:2385 MAP, and the generic V-CLOSE (verbs:749/755). V-CLOSE requires CONTBIT, no SURFACEBIT and capacity >0, or else DOORBIT. Otherwise it says "You cannot close that."
- The 8 SURFACEBIT carriers fall to the V-CLOSE else branch, "You cannot close that.", unless a handler intercepts.
- MAST-HOLE-FCN, TORCH-HOLDER-FCN and FIREPIT-FCN all intercept `OPEN CLOSE` with HOW? (a refusal), so V-CLOSE is never reached.
- TRUNK (and CRATE via the same pattern): Infidel's "closed lid" is **SURFACEBIT set** by INSIDE-OBJ-TO (verbs:2661-2666, "Closed."). That routine **moves the contents out of the object into a table** (TRUNK-TBL), and OPENBIT is never cleared. So a closed trunk holds no visible children, and there is nothing to see through.
- Result: no TRANSBIT carrier ever reaches {CONTBIT, not OPENBIT, has children}. TRANSBIT can never change any visibility or listing decision that OPENBIT alone does not already make.

## Disposition
- transparent: **L:NA**. Infidel has no see-through-closed-container domain. TRANSBIT is co-set on every permanently open carrier and has no distinguishing behaviour.
- Mapping bit 23 would be harmless but meaningless (always co-set with OPENBIT), so I am not mapping it.

## Native (pending; source tier sent first)
Planned negatives on a retained jericho Infidel route:
- `close pit`: expect the HOW? refusal.
- `close trunk` after putting an item in: expect "Closed.", the item no longer IN trunk, and no listing.
- `close crate`.
I will run these if the reviewer requires them for the R3-2 FEATURE-ABSENT bar.
## Native negatives (RUN 2026-10-30 11:44 PM ET)
- Plan: probes/plan-infidel-transp-close.json. Route: probes/routes-infidel-j.json (jericho infidel steps 0-40, key infr). Run: probes/cache/run-infr-20261031T034439-45404.json.
- Provenance: g1-batch forces the RNG through addInitScript, seed 0 (the default for this key).
- Results:
  - `close crate` @8 (obj 23): "You cannot close that." No bits change.
  - `close pit` @13 (obj 79): "I don't know how to do that to a pit." (HOW?). `open pit` gives the same. No bits change.
  - Trunk @20 (obj 39; bits before 20,23,25, open):
    - `look in trunk` lists sticker, beef and map.
    - `close trunk` gives "Closed." It SETS bit 28 (SURFACEBIT), and the open bit is NOT cleared.
    - Then `look in trunk` returns only the description text.
    - `get map` gives "You can't see any map here!", and **map 35 parent = 0** (moved out of the tree into TRUNK-TBL).
    - `open trunk` gives "Opened. ... reveals an ancient map ...", clears bit 28, and the map's parent is back at 39.
- **This confirms natively that the closed state never holds children, so there is nothing to see through.** transparent = L:NA.