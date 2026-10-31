# Sherlock.z5.js: preliminary dispositions for the B and L:UD ledger cells

These are preliminary. Nothing is applied to the ledger or to js/.

## Identity
- Header: v5, release 21, serial 871214, checksum 0x79b2, 188445 bytes. That is Infocom's "Sherlock: The Riddle of the Crown Jewels" (1987). IFDB lists R21/871214 as a released build, alongside R26/880127 and later builds.
- Source: github.com/historicalsource/sherlock @ 85ab6e5385446cb1ac8cdfe1007cbb372407c76e (copy in sherlock-evidence/SOURCE_SHA). The repo is a mirror of the source archive, so it may differ from R21. The object-flag match below is exact for every non-comment flag, which strongly suggests the source matches this build for object definitions.
- ZIL-family check: `GrammarProvider.decodeD198` returns `unknown / rejected / invalid-dictionary`. This is the known D198 gap: Sherlock's dictionary has 8-byte entries (2 metadata bytes), and the decoder requires 9 (codex 2026-10-12 title sweep). The title is therefore **not** confirmed-zil-family by D198. Its ZIL origin rests on the source repo, not on the classifier. The harness is sherlock-evidence/d198-sherlock.cjs.
- Why every cell was B: Sherlock's source uses `FL-*` flag names (FL-PERSON, FL-OPENED, ...) and macros (`MC-IS?` = FSET?, `MC-MAKE` = FSET, `MC-UNMAKE` = FCLEAR, macros.zil:234-252). The ledger's ACTORBIT/OPENBIT name mapping found nothing to match.

## Source-flag census (sherlock-source-flags.json)
- 314 source objects and 314 RAM objects; 277 matched by unique DESC.
- Every real flag is **exact** (fp0 fn0). The only non-exact entries are two parse artifacts from commented-out `;FL-...` tokens.
- The generator is work/investigations/zil-source-flags.js, adapted to read the local clone and write only the Sherlock file. A copy is in sherlock-evidence/sherlock-source-flags.js.

Consumer counts below are tests / sets / clears, counted with `MC-IS?|MC-ISNOT?|FSET?`, `MC-MAKE|FSET` and `MC-UNMAKE|FCLEAR`.

## The 27 B cells
| key | ZIL flag | Sherlock flag | bit | source match | consumer | disposition |
|---|---|---|---|---|---|---|
| absent | none | - | - | - | - | NA |
| clothing | WEARBIT | FL-CLOTHING | 11 | 8/8 exact | verbs.zil:821, 3084 (wear/remove) | S candidate; native WEAR of a clothing item vs a non-clothing item |
| concealed | INVISIBLE | none in source | - | - | - | NA |
| door | DOORBIT | FL-DOOR | 8 | 8/8 | 6 tests | S candidate; native OPEN/go through one door |
| enterable | VEHBIT | FL-VEHICLE | 1 | 3/3 | verbs.zil:809/922/2603, parser.zil:2004 | S candidate; native ENTER cab or another vehicle |
| general | none | - | - | - | - | NA |
| light | ONBIT | FL-LIGHTED | 38 | 49/49 (rooms and objects) | 60/31/33; parser.zil:1828 room-lit test | S candidate; native LIGHT match/torch (charles.zil:111-239) toggles bit 38 |
| lockable | none | - | - | - | - | NA |
| locked | LOCKEDBIT | FL-LOCKED | 15 | 8/8 | 48/16/14 (bank.zil:915 vault door) | S candidate; native UNLOCK flips bit 15 |
| moved | TOUCHBIT | FL-TOUCHED | 3 | 2/2 (thin) | 5/22/0 | S candidate; native TAKE sets bit 3 on an object |
| on | ONBIT | FL-LIGHTED | 38 | 49/49 | as for light | S candidate (shares bit 38 with light) |
| proper | NARTICLEBIT | FL-NOARTC | 29 | 83/83 | boot.zil:215 article printing | S candidate; native output shows no article on a bit-29 object |
| scenery | NDESCBIT | FL-NODESC | 32 | 98/98 | 9/11/27 (other-misc.zil:48) | S candidate; native LOOK omits bit-32 objects |
| scored | none | - | - | - | - | NA |
| static | TRYTAKEBIT | FL-TRYTAKE | 26 | 79/79 | boot.zil:161 (7 tests) | S candidate; native TAKE of a bit-26 object refused |
| supporter | SURFACEBIT | FL-SURFACE | 16 | 47/47 | 27 tests (boot.zil:14) | S candidate; native PUT X ON a surface |
| talkable | ACTORBIT/PERSONBIT | FL-PERSON | 47 | 25/25 | 53/1/1 | S candidate; native ASK/TELL a bit-47 character |
| transparent | TRANSBIT | FL-TRANSPARENT | 2 | 8/8 | 7/3/1 (boot.zil:21) | S candidate; native LOOK IN shows the contents of a closed bit-2 container |
| visited | TOUCHBIT | FL-TOUCHED (rooms) | 3 | shares bit 3 | boot.zil:371 `MC-ISNOT? .PLACE ,FL-TOUCHED` | S candidate; native re-entry of a room sets bit 3. Note: FL-SEEN (bit 4, set 171 times) is for characters, not rooms |
| workflag | none | - | - | - | - | NA |
| worn | WORNBIT | FL-WORN | 34 | 4/4 | 93/6/19 | S candidate; native WEAR/REMOVE flips bit 34 |
| female | FEMALE | FL-FEMALE | 27 | 3/3 | 15 tests (bank.zil:841 pronouns) | S candidate (static; source plus pronoun output is enough) |
| neuter | none | - | - | - | - | NA |
| pluralname | PLURALBIT | FL-PLURAL | 28 | 27/27 | 29 tests (bank.zil:838) | S candidate (static) |
| takeable | TAKEBIT | FL-TAKEABLE | 39 | 58/58 | 15/4/0 (boot.zil:160) | S candidate; native TAKE of a bit-39 object |
| wornAttribute | WORNBIT | FL-WORN | 34 | 4/4 | as for worn | S candidate (bit 34) |
| openCapability | OPENBIT/DOORBIT | FL-OPENABLE (+FL-DOOR) | 44 (+8) | 22/22 | 10 tests (parser.zil:1663) | S candidate; native OPEN works on a bit-44 object |

## The 8 L:UD cells
| key | Sherlock flag | bit | match | consumer | disposition |
|---|---|---|---|---|---|
| animate | FL-ALIVE (or FL-PERSON) | 40 (47) | 29/29 (25/25) | 23/1/3 (boot.zil:24) | S candidate bit 40. FL-ALIVE is a superset of FL-PERSON (4 more objects, probably animals); a native check is needed on one ALIVE object that is not a PERSON |
| wearable | FL-CLOTHING | 11 | 8/8 | verbs.zil:821 | S candidate (as for clothing) |
| edible | FL-FOOD | 41 | 4/4 | syntax.zil:286-288 FIND, things2.zil:2257 | S candidate; native FEED/EAT |
| open | FL-OPENED | 5 | 22/22 | 79/19/7 | S candidate; native OPEN flips bit 5 |
| switchable | FL-LAMP | 42 | 1/1 | syntax.zil:284 FIND only (EXTINGUISH) | weak S candidate: one object, consumer is only parser FIND (could be NC); native EXTINGUISH on the lamp |
| male | none | - | - | - | NA |
| lightSource | FL-LIGHTED | 38 | 49/49 | parser.zil:1828-1836 (room-lit and GWIM) | S candidate bit 38; native: a dark room becomes lit by a carried lighted object |
| inventoryHiddenAttribute | FL-NODESC? | 32 | 98/98 | other-misc.zil:48 | UD stays until a native INVENTORY shows whether a held NODESC item is hidden |

## Counts
- 27 B cells: 20 S candidates and 7 NA. The NA cells are absent, concealed, general, lockable, scored, workflag and neuter. Concealed is NA because INVISIBLE is not in the source; the other six are NA because the ledger maps no ZIL flag to them.
- 8 UD cells: S 6 (one weak: switchable), NA 1 (male), UD 1 (inventoryHiddenAttribute).
- No NC. switchable could become NC if the parser FIND use is not counted as a consumer.
- Every S still needs the native evidence listed. Nothing is promoted on source alone.
