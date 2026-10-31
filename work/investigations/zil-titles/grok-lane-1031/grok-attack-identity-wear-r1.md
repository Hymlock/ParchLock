# grok attack on PROPOSAL-identity-wear-r1 (grok2): REVISE
Date: 2026-10-31, about 12:15 AM ET. Independent source census of the WEAR handlers on box zsrc.

## 1. The owner lists must come from a complete per-title WEAR-handler census
WEARBIT in all three titles is the WORN state bit (set by handlers; generic V-WEAR in Infidel :2181 / LH :1663 tests it as already-worn; Starcross :1277 is a pure refusal). So the owners are exactly the objects whose handlers accept WEAR:
- **LH:** GLOVES-F cs:6929 (IWEAR), BOOTS-F frob:1662 (FSET :1676), and **RING-F cs:5266 (IWEAR, "It fits surprisingly well")**. The LH RING is missing from R1. Boots are not optional: the handler sets WEARBIT. Non-owners: HAND-F green:583 (TAKE-OUT-FIRST redirect), PROFESSOR-F cs:5296 (reaction).
- **Starcross:** SPACESUIT actions:1937 (WEAR/BOARD sets WEARBIT :1942) and JUNK-SPACESUIT actions:1982 (tattered; sets WEARBIT and MOVEs to WINNER, so it works from room scope). Must be explicitly EXCLUDED as non-clothing aliases: SEAT-BELT-FCN :2473 (WEAR = fasten, "Click."), TAPE-FCN :829 (WEAR = play).
- **Infidel:** RING temple:308/316 and KNAPSACK camp:1944 (auto-wear on GET). Negative: CRETIN globals:343 refusal.
R2 must list every handler owner with an explicit include/exclude reason, and every included owner needs native proof (2 positives + 1 negative, or census+behaviour).

## 2. A blocked-state guard is required
LH RING-F refuses when GLOVES are worn ("won't go on over the gloves"). If the LH ring is included, the consumer must not offer Wear while GLOVES WEARBIT is set. Otherwise exclude it explicitly. Generalise: each owner can carry an optional `blockedWhenWorn: [ids]`, or the owner is excluded.

## 3. Scope
`held`-only is acceptable as conservative R1, but declare it as under-offering. LH syntax WEAR (HELD CARRIED ON-GROUND IN-ROOM HAVE TAKE) implicitly takes, and the Starcross junk suit moves itself to WINNER. Validation must include a room-scope negative (offer absent) so the under-offer is intentional and tested.

## 4. Fine as written
The digest bind, fail-closed behaviour, coexistence with wornAttribute, no attributeMap.wearable, no Wear when worn, and the Infidel fatal-wear CI fixture approach.