# Independent adversarial audit (stand-in for codex), 2026-10-23
Read-only audit. No product/tool edits. Evidence is file:line in the current checkout.

## Item 1: radial-sweep.cjs rework: OBJECT

### Evidence does not match the code
- sweep-claude/TheLurkingHorror.z3.js.json was written 20:00:06; radial-sweep.cjs was modified 20:00:20. So the JSON comes from an older version of the tool.
- Proof: steps 10 and 20 record `drink coke` as WRONG-OFFER (oracle "drink", delta [], reply "Delicious!...").
  - Current line 121 can only give `drink` the values true or null.
  - So line 125 can only produce OK/MISSING or UNKNOWN for it, never WRONG.
- Conclusion: none of the current counts (WRONG 7 / MISSING 2 / UNKNOWN 1 / UNSEEN 2) is evidence for the current code. Re-run before citing any of them.

### Objections in #4633: status
| #4633 objection | Status |
|---|---|
| VM-only restore (no app state, transcript, storage, RNG) | Partly fixed. A fresh browser is opened per sampled step (l.74-75). Within a step, only RAM, stack, frames, frameptr and pc are restored (l.49-50). |
| Seeded Math.random closure (l.39) advances across probes and is never snapshotted | **Not fixed.** Probe N's random outcomes depend on how many earlier probes ran. Not listed as a limit. |
| No two-order equivalence check | **Not fixed.** Not listed as a limit. |
| Any object-tree delta counted as success | Fixed for the CORE verbs (l.117-125). Still the fallback for every other verb (see A4). |
| Scope recursion into hidden/closed contents; census width-by-version | **Not fixed.** l.57 walks every descendant regardless of open/INVISIBLE. l.59 uses `version > 3` for the width instead of the localScope.width fact, and has no holder, INVISIBLE or lit check. This is mitigated only by the EXAMINE referability gate. |
| UNSEEN lacked native EXAMINE referability | Addressed (l.85-90), with the defects in A5. |
| Uses resolveObjectCommands only, not full Actionable.Open/addMore/instrumentals | **Not fixed** (l.77). Not listed as a coverage limit. |
| Header text | Stale. l.7-8 still define WRONG/MISSING as "changes nothing in the object tree". |

### Defects
- **A1. A failed restore leaks state (l.114, l.125).**
  - When `ok` is false, the probe is marked UNKNOWN but the loop carries on with the same corrupted VM. There is no `open(i)` call.
  - Each later probe hashes its own `before` snapshot, so their `ok` is true and their classifications look trustworthy when they are not.
  - The same gap exists where restore results are discarded: l.88 (UNSEEN examine) and l.97 (WAIT control). A failed restore there poisons every probe in that step silently.
  - Fix: on any restore failure, call `open(i)` and mark the rest of the step UNKNOWN.
- **A2. The take oracle can never be true for contents of a held container (l.119).**
  - `toPlayer` requires that the player is *not* in s0.chain.
  - Taking a coin from a carried bag (parent goes bag -> player) is therefore always false, giving WRONG-OFFER when offered and OK when missing.
  - Example from the output: step 20, `take food` (food in the held carton).
  - Use `s1.parent === player && s0.parent !== player`.
- **A3. The enter oracle is wrong for doors and passages (l.122).**
  - It requires the player's parent to become the target object.
  - Entering a door or a passage moves the player to a room instead, so these come out as WRONG-OFFER (or OK when missing).
  - Fix: count "playerParent changed" as success, or return null when the target is not a vehicle.
- **A4. The fallback for non-CORE verbs overcounts WRONG-OFFER (l.124).**
  - Any offered verb without its own oracle (empty, push, unlock, put, give, knock...) is false whenever the target and the tree did not change.
  - Text-only successes (push button prints a message, an empty container) become WRONG-OFFER.
  - Output shows 4x WRONG-OFFER for `empty oven/refrigerator/counter/doors`. Those happen to be real refusals, but the oracle cannot tell a refusal from a text-only success.
  - Fix: return UNKNOWN unless the reply is a recognised refusal.
- **A5. The UNSEEN referability regex (l.89).**
  - Under-classifies:
    - "which do you mean" counts as not referable, but an ambiguous reply proves the object *is* referable.
    - shortName often is not parser vocabulary, so "don't know the word" wrongly sends a real object to notReferable.
  - Over-classifies: replies with no listed refusal phrase ("It's too dark to see", "There seems to be a noun missing", text in another tense) count as UNSEEN.
  - A crash during examine (l.90) is filed as notReferable, which hides a possible UNSEEN. It should be UNKNOWN.
- **A6. Reply capture in send() (l.27-36).**
  - (a) When the tagged line has been evicted by the 200-line cap, `findIndex` returns -1 and `slice(0)` returns the whole buffer. The old text is then read as the reply. The comment claims the opposite.
  - (b) The regex `/^>s*/` (l.32) should be `/^>\s*/`. When the echo is rendered as "> cmd", it is not removed. The echo then counts as a reply line, so the wait loop (l.34) can exit before the game has answered.
    - Then `after.t` is read too early (false WRONG-OFFER).
    - The examine reply is the echo, which matches no refusal, giving a false UNSEEN.
  - (c) Exiting the loop only needs the LineInput to exist, which may be true throughout. There is no check that the VM is idle.
- **A7. Crash recovery (l.90, l.109).**
  - `open(i)` reseeds the RNG at 12345, while the crashed page had already advanced it.
  - After that, `noisy`, `view` and `bits` from the old page are reused, so post-crash probes run under a different WAIT baseline.
- **A8. JS-side VM state is not snapshotted** (read-pending state, output streams, window or undo state). This may be benign because pc points at the same read, but it is not listed as a limit.

The open/close (flip of attributeMap.open), turn on/off (flip of on), wear (flip of wornAttribute, null when unknown), eat (parent change) and drink (true or null) oracles are correct in form. Two caveats:
- `remove` = flip(worn) || fromPlayer counts "remove X from held box -> floor" as success. That is acceptable.
- open/close use a symmetric flip, so a wrong-direction toggle cannot be detected. Minor.

## Item 2: transparent batch 3: OBJECT (minor; ACCEPT after corrections)

### The "only consumer" claim is false as written
- Readers of `attrs.transparent` are:
  - AttributeSchema.js:723
  - ZRamReader.js:2755, a fallback copy of canSeeInside used when AttributeSchema is not loaded (pure harnesses)
- Both are the same predicate, so behaviour is unchanged. The proposal should still cite both.

### How the bit gets into attrs
- The proposal does not trace this path:
  - "transparent" is a PROFILE key (AttributeSchema.js:82).
  - `bitFor` reads `attributeMap[flag]` from the exact-digest fact (AttributeSchema.js:~206-212).
  - "transparent" is in the ZIL fail-closed structural list (l.230). Today, without a map entry, it is null for confirmed-ZIL titles.
- Adding the key does populate attrs.transparent.

### Call sites that change
canSeeInside callers ZRamReader.js:2475 (room-scope walk), :2860 and :2885 (walkVisibleDescendants, inventory and nested D31). Effects:
- Contents of closed TRANSBIT containers enter room scope and inventory, which affects the underline pool, radial pool, map item lists and Equipment.
- This matches ZIL presentation: DESCRIBE/PRINT-CONT shows contents when OPENBIT or TRANSBIT is set, and the native LH LOOK prints carton/food.
- It also matches the parser:
  - SEARCH-LIST recurses on OPENBIT|TRANSBIT (cutthroats-src/parser.zil:1302-1303; zork3 gparser.zil:1252-1253).
  - So the object is referable.
- Side effect to expect: radial `take food` from a closed transparent oven returns the game's "is closed" refusal. That is a normal recoverable reply.
- Only a container can be seen into, since the gate requires attrs.container. TRANSBIT on non-containers (Ballyhoo barred passage, Cutthroats bunk, LH frosted glass) is therefore inert.
- localScopeObjects (ZRamReader.js:2384) uses ls.transBit separately and is unaffected.

### Bit check against 2026-10-11-zil-source-flags.json
TRANSBIT exact:true for each title:

| Title | TRANSBIT | Row's attributeMap and collision check |
|---|---|---|
| LH | 5 | Row l.767: {13,27,8,31,15}. No collision. Matches localScope transBit 5 (l.773). |
| Zork I | 12 | Row l.818: {19,11,10,20,30,21,31}. No collision. Matches l.827. |
| Enchanter | 10 | Row l.207: {21,14,12,22,8}. No collision. Matches l.212. |
| Ballyhoo | 13 | Row l.146: {15,23,17,31,21,24}. No collision. Matches l.154. |
| Cutthroats | 19 | Row l.49: {21,28,11,23,8,18,17}. No collision. Matches l.59. |
| Infidel | 23 | exact, 10/10. **Omitted from the proposal with no stated reason.** |

- Ballyhoo also has a ";TRANSBIT" bit 0 entry in the JSON (a commented-out source flag, exact:false). Ignore it. bit 13 is right.
- Infidel: its Infidel.md packets cite container20/edible7. Either add transparent 23 to its row or record why it is excluded. I could not find an Infidel row by name in ModuleStatFactsClaude.js (rows are keyed by digest), so this needs verifying.

### Required gate
309x2 plus the operator's regressions. Every changed inventory, Equipment or underline row in these titles must be classified INTENDED.

## Item 3: R2 null bits: OBJECT to the general form; ACCEPT only with per-title evidence

### What the parser source shows
- THIS-IT? rejects only `<FSET? .OBJ ,INVISIBLE>` (cutthroats parser.zil:1318; zork3 gparser.zil:1397).
- The other filters are name, adjective and GWIMBIT. No other flag hides an object from the parser at this point.
- So a null `invisible` is safe only if the game's *compiled* parser has no INVISIBLE test.

### New defect in D232, outside the R2 question but found while checking it: the content predicate depends on the title
- Zork-era gparser GLOBAL-CHECK (zork3 gparser.zil:1194-1202) does **not** recurse into local-global contents at all. It only checks THIS-IT? on the GLOBAL ids, then PSEUDO.
- Cutthroats GLOBAL-CHECK (parser.zil:1248-1252) recurses only when `((CONTBIT|SURFACEBIT) && OPENBIT) || TRANSBIT`, and then at P-SRCTOP (one level).
  - That differs from the accepted SEARCH-CONTENTS? predicate (SEARCHBIT && (OPEN||TRANS)) || SURFACE.
- localScopeObjects `contents()` (ZRamReader.js:2381-2391) applies the SEARCH-CONTENTS? form to every title with a localScope row:
  - Zork I l.827 and Cutthroats l.59 run gparser-family parsers, where this over- or under-admits.
  - The accepted design cites LH parser.zil:1766, a newer parser. That predicate is valid for LH only.
- Each title therefore needs a recorded "contentsMode" (none / gparser-cont / search-contents) proven from its own GLOBAL-CHECK, or contents recursion must be disabled where it is not proven.

### Lighting
GET-OBJECT calls GLOBAL-CHECK outside the `,LIT` branch (zork3 gparser.zil:1075 vs 1077). So in the source, local globals are referable even in the dark. The positive-only roomLit gate is conservative, under-admitting rather than wrong. Keep roomLitAttribute required, as proposed.

### Evidence required to back a null, per title, per field
1. The exact source for this digest: the release/serial matched, with the repo and commit cited.
2. The flag is absent from the FLAGS declarations and from every FSET?/FSET/FCLEAR, *and* the compiled THIS-IT?/SEARCH-LIST/GLOBAL-CHECK for this digest do not test any bit for it. Prove the second part by disassembling the routine, because the source alone can lag the binary.
3. The meaning of "proven absent" depends on the field:
   - null `invisible`: THIS-IT? has no attribute test other than GWIMBIT.
   - null `searchBit` or `surfaceBit`: the title's GLOBAL-CHECK/SEARCH-LIST never tests that bit.
   - If the predicate shape itself differs (gparser), a null is the wrong tool. Use a contentsMode fact instead.
4. One native negative control, such as an object that is never referable, so the null cannot widen scope unnoticed.

Fail closed: a missing key stays `[]`, and roomLitAttribute stays required. Keep `Number.isInteger || === null` for these keys only, never `undefined`.

## Round 2 (re-audit of working tree, 2026-10-23)

### 1. D232 contents gate: ACCEPT
- ZRamReader.js:2408-2410: `contents()` runs only when `ls.contents === "search"`. Every other title admits the roots only. Roots-only is a subset of every parser's GLOBAL-CHECK, so it can only under-admit.
- ModuleStatFactsClaude.js:773: only the LH row (1862ef7c) carries `"contents": "search"`.
- The batch2 rows have no `contents` key: Cutthroats l.59, Ballyhoo l.154, Enchanter l.212, Zork I l.827.
- Nit: the comment at ZRamReader.js:2358-2364 still describes unconditional contents recursion. Mention the gate there.

### 2. Batch 3 transparent: ACCEPT (fact rows); live check NOT independently verified
| Title | Row | Bit added | Collision check |
|---|---|---|---|
| Cutthroats | l.49 | 19 | none |
| Ballyhoo | l.146 | 13 | none |
| Enchanter | l.207 | 10 | none |
| Infidel | l.217 (row 91f78d4b, FOODBIT7/beef34 comment matches the Infidel packet) | 23 | none (map 20/28/25/7) |
| LH | l.767 | 5 | none |
| Zork I | l.818 | 12 | none |

- All six match the exact TRANSBIT in the source-flags JSON.
- The ZRamReader.js:2746-2758 fallback is unchanged. It reads attrs.transparent with the same predicate, so it is consistent, but I see no added comment noting it as the second reader.
- I did not re-run the LH step-10 microwave check (carton 58 and food 90). Treat it as the implementer's claim until the gate output is posted.

### 3. R2 null flags: ACCEPT (not implemented; the evidence bar is adopted).

### 4. radial-sweep.cjs: OBJECT (one claimed fix missing, one new defect)
- **D1, NOT FIXED.** radial-sweep.cjs:34 still has `t.replace(/^>s*/, '')`, not `/^>\s*/`.
  - When the echo is rendered as "> cmd", it is still counted as a reply line.
  - The wait loop (l.36) can then exit before the game answers, which produces a false WRONG-OFFER or a false UNSEEN.
- **D2, NEW.** l.91-92: when an examine restore fails, the object is first pushed into `unseen` or `notReferable` and then also into `unknownRef`.
  - It is double-counted, and the summary UNSEEN total (l.139) includes it.
  - Classify it only when `rok` is true.
- **Verified fixed:**
  - findIndex -1 now returns no reply (l.34).
  - The RNG seed is part of snapshot and restore (l.41, l.50, l.52).
  - Relaunch after a failed restore: probe (l.129), WAIT control (l.100), examine (l.92), crash (l.93/l.112).
  - take means the target becomes a direct child of the player (l.122).
  - enter means the player's parent changed (l.125).
  - Verbs with no oracle are UNKNOWN unless the target itself changed (l.127).
  - "which do you mean" was removed from the refusal regex (l.91).
  - coverageLimits are in the output (l.141), and the header was rewritten (l.6-12).
- **Remaining nits:**
  - The comment at l.26-28 still says "robust to the 200-line cap". It now returns empty instead, which is the safe behaviour but not what the comment says.
  - After a relaunch, `noisy` (the WAIT baseline) comes from the pre-relaunch page. The deterministic replay makes that equivalent; say so in coverageLimits.
- The old JSON is still stale. No counts are citable until the fresh pilot run, made after the D1 and D2 fixes.
