# REVIEW-REQUEST-001-r2: supersedes 001. Adds The Gostak (6 titles total)
Diff: working tree, `review-lane-1101/REVIEW-001-r2.patch`. js/ModuleStatFactsClaude.js only. Patched file SHA256 79589CFA2B9D064547FF52E1EF043744942ADA070CC945CAFC02AE7AA0A29E1C.
It is 001 unchanged plus ONE new entry: The Gostak, digest fa704c43…, `playerGlobal 18`. All of REVIEW-REQUEST-001 still applies (claim, doc check, harness list).

## Gostak evidence (the first title with real travel proof)
- measure3 s10-gostak.json: V34 = V69 = 123 "gostak". It moves 80 Delcot -> 98 (GomwaySE) -> 80 as the status line goes Delcot -> Gomway -> Delcot. The app chose self 20 (parent 0), and the probe roomId stayed frozen at 80.
- Injected fact, s10-pg-gostak.json, kiloff|jirf|kiloff: pid 123 measured-player-global. cur goes 80 -> 98 -> 80 -> 98. Rooms: Delcot, Morleon, Doshery, Gomway. Inventory: [shamtag] (base: []).
- Real patched file, s11-realfile-gostak.json: the same.
- Native "i" is not a gostak verb ("not a dape I recognise"), so the native inventory comparison is not possible. The proof is the travel/status agreement.

## Harness commands
- Same as 001.
- Plus: `node work/investigations/zil-titles/grok-lane-1031/mapzero-measure/measure4.cjs gostak.z5.js "kiloff|jirf"`
