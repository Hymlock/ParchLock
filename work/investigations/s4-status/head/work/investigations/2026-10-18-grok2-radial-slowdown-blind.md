# Blind investigation: wheel/underline cumulative slowdown (grok2)

**Bus task:** #4143 (claude → grok2), standard issue procedure step 1 blind.  
**Seat:** grok2  
**Checkout:** current working tree at investigation time (`b79812e` dirty base when started).  
**Blindness:** Did **not** read `work/investigations/2026-10-18-claude-radial-slowdown-SEALED.md`. Independently profiled. A prior Oct-8 mobile-slowdown note was opened only after first Identity profiles; it is cited only as related history, not as this report’s source of measurements.

**Operator words (relayed):** wheel (radial) input and underline selection get extremely slow **cumulatively**; on phone in **Identity** (`identity.z5.js`) an underline action took ~**10 s**, “almost too slow to use, jarring”. **Typed text input is NOT the problem.** APK ~6 days old; investigate **CURRENT** checkout.

**Method:** Playwright Chromium, mobile viewport 390×850, touch, CPU throttle 1× and 6× via CDP. Games: Identity, Anchorhead, LostPig. Instrumented `Actionable.Open` / `payloadPool` / `Refresh` / `resolveObjectCommands` / `ParchLockQol.GetRadialCommands` / `OpenRadial` / `ActionSynth.collectFromPayload` / `ZRamReader.parseDictionary` / `hasDictionaryWord`. Scratch JSON under `work/investigations/_g2-radial-slow-*.json` (not sealed claims).

No product code changed.

---

## Executive finding

| Path | What it is | Cost on CURRENT checkout (desktop Chromium) |
|------|------------|-----------------------------------------------|
| Typed line input | `Input` inject only | Not profiled as hot; operator says fine |
| Underline **short tap** | `resolveObjectCommands` → `Submit` / Inject | Identity @6×: resolve ~10–15 ms prep (game turn separate) |
| Underline **long-press / contextmenu** (object radial) | `Actionable.Open` → always `addMoreActions` → **`GetRadialCommands`** → `OpenRadial` | Identity @6×: Open ~50–70 ms when collect is light; can pull full GetRadial path |
| **Wheel / input radial** | Hold line / contextmenu → **`GetRadialCommands`** → `OpenRadial` | Identity @6×: **~230–300 ms**; LostPig @6×: **~640–1000+ ms** |

**Did not reproduce a 10 s Identity underline stall in desktop Chromium** (current checkout, 6× CPU, up to 80 turns in one room). Peak measured input-radial open on Identity ≈ **0.3 s @6×** (~50 ms @1×). LostPig input radial reaches **~1 s @6×**. A mid/low-end Android WebView plus a 6-day-old APK can still feel multi-second; the **code paths that scale and burn main-thread on every radial open are identified below**.

---

## H1 (strongest for “wheel” / input radial): `GetRadialCommands` → `collectFromPayload` + uncapped dictionary dump

### Call chain

1. `js/Qol.js` `ShowRadialMenu` / input hold → `ParchLockQol.GetRadialCommands()` (`Qol.js` ~624–697).
2. Every open:
   - Pushes **all** `WorldModel.lastPayload.specialCommands` with `source === "dictionary-verb"` (no cap; comment at `GrammarProvider.js` ~425–431 explicitly removed a prior `slice(0,80)`).
   - Then `ActionSynth.collectFromPayload(p)` (unless semantic cutover supplies a list).
3. `OpenRadial` ranks and lays out the combined list.

### Measured sizes (after a few `look`/`i`/`wait` turns)

| Game | dictionary-verb `specialCommands` | scoped objs | `GetRadialCommands` @6× CPU | `collectFromPayload` @6× |
|------|-----------------------------------|-------------|------------------------------|---------------------------|
| Identity | **244** | 6 | ~216–230 ms | ~204–222 ms |
| Anchorhead | **293** | 9 | ~297–315 ms | ~212–229 ms |
| LostPig | **405** | 9 | **~972–995 ms** | **~920–978 ms** |

`OpenRadial` with a **prebuilt** command array is cheap (~18 ms @6× for 249 cmds). Almost all wheel latency is **command list construction**, not paint.

### Why `collectFromPayload` is so expensive (LostPig instrumentation)

One call to `ActionSynth.collectFromPayload(WorldModel.lastPayload)` @6× CPU:

| Counter | Count |
|---------|------:|
| Wall time | **641 ms** |
| `ZRamReader.parseDictionary` invocations | **114** |
| `ZRamReader.hasDictionaryWord` invocations | **19,217** |
| Commands produced | 17 |
| Scoped objects | 9 |

`hasDictionaryWord` is cached per game (`ZRamReader.js` ~1549–1576), so most of the 19k are **hash lookups**, but still main-thread work at huge volume. **114 full `parseDictionary` passes** in one collect means other call sites still force full Z-decode walks (up to 4000 entries each) instead of only the word cache.

### Amplifiers inside `commandsForObject`

`ActionSynth.commandsForObject` (`ActionSynth.js` ~205–211) does, **per object**:

```js
obj = Actionable.payloadPool().find(...) || obj;
```

`collectFromPayload` loops every inventory + discovered object and calls `commandsForObject` with **no** shared `Actionable._resolutionPool`. So each object rebuilds `payloadPool()` (LiveMarks scan, `promoteUnnamed`, `observedPossessions`, per-object `displayNameFor` / `observedPhraseFor` / optional `objectHasCustomParseName`) — O(objects²)-ish work on the open path.

`Open` / `resolveObjectCommands` **do** set `_resolutionPool` for one synchronous resolution; **`GetRadialCommands` does not**.

---

## H2 (strong for underline **radial** / long-press): every `Actionable.Open` ends in `addMoreActions` → `GetRadialCommands`

`Actionable._open` always finishes with (`Actionable.js` ~2873–2874):

```js
Actionable.addMoreActions(slices, context, x, y);
ParchLockQol.OpenRadial(x, y, slices, context);
```

`addMoreActions` (`Actionable.js` ~2621–2647) builds the **More** suggestion list by:

```js
ParchLockQol.GetRadialCommands().forEach(function (c) {
  if (c.source === 'dictionary-verb' || c.source === 'ram-synth') add(c.Command.trim());
});
```

So **object underline long-press pays the same GetRadialCommands construction** used for the input wheel, even though the first ring only needs a handful of object actions. Measured: `addMore` always invoked once per Open (Identity/LostPig probes).

Short-tap underline path (`click.pmAct`) only `resolveObjectCommands` + `Submit` — it does **not** open the radial; operator “underline action” may mean long-press (phone primary for rings) or the full turn after examine submit.

---

## H3 (background pressure, weaker for 10 s alone): 200 ms `ParchLock.Loop` + `Actionable.Refresh`

`ParchLock.js` ~158–164: every **200 ms**, `Actionable.Refresh()`, `WorldModel.tick()`, `TranslatorUI.tick()`, etc.

`Refresh` still:

- Queries **all** `#windowport .BufferWindow .BufferLine` every pass.
- Calls `WorldModel.tick` (also called again from the Loop body).
- Runs `relocateExactMarks` over `LiveMarks` when the signature changes.
- Builds a large `signature` string from latest text + full payload JSON.

`BufferRevision` (consensus #1830) caches per-line facts and avoids the old every-line jQuery tax; Identity profiles show Refresh roughly **stable ~50–60 ms @6×** while lines grow 26 → 200 (Glk soft-cap behavior observed: line count plateaus near **200**). So pure scrollback growth alone did **not** produce multi-second Open on Identity in this environment.

`GrammarProvider.collect` re-reads verb words each `WorldModel.tick`; isolated `GrammarProvider.collect` ~3–5 ms @6× on Identity — not the radial killer vs collectFromPayload.

---

## H4: what is **not** the primary typed-input path

Typed input does not call `GetRadialCommands` / `collectFromPayload` per character. That matches the operator split (“typed text is fine”).

---

## H5: cumulative aspect — what actually grows

Reproduced growth drivers (not Identity 10 s wall-clock):

1. **Dictionary-verb list size** is large from first structural tick (244–405) and is rebuilt into radial command objects on **every** wheel open and every object-Open More pass.
2. **`collectFromPayload` cost** scales with scoped object count × per-object `payloadPool` + dictionary probes; more rooms/inventory → worse wheel.
3. **Background Loop** keeps Refresh/tick on the main thread (~80 ms combined loop body @6× Identity after many looks), so gesture handlers compete for the same thread (contended Open p50 still ~49 ms when Refresh forced every 50 ms — contention alone ≠ 10 s).

Not reproduced: Identity Open latency climbing from tens of ms to seconds solely from 30–80 idle `look`/`wait` turns in Cryotube with 6 objects.

---

## Limits / honesty

- Desktop Chromium ≠ operator phone WebView; no APK, no device trace here.
- Operator APK ~6 days old may predate BufferRevision / other Loop fixes; current checkout still has H1/H2.
- Did not exhaust Identity’s full map (stayed Cryotube); late-game object counts may be higher.
- Did not profile native TTS / Capacitor bridges (Oct-8 H2 class); typed-OK + radial-bad points at JS radial construction first.
- Curses boot failed in multi-game harness (no line input in time); not required for Identity claim.

---

## Evidence files (scratch)

- `work/investigations/_g2-radial-slow-profile.js` + `_g2-radial-slow-profile.json`
- `_g2-radial-slow-profile2.json`, `_g2-radial-slow-multigame.json`
- `_g2-radial-slow-detail.json`, `_g2-radial-slow-addmore.json`, `_g2-radial-slow-more.json`

---

## Suggested fix direction (investigation only — no implementation)

Not a design consensus; for compare step only:

1. **Stop calling full `GetRadialCommands` from `addMoreActions`.** Feed More from dictionary-verb labels already on the payload (or a cached verb list), without `collectFromPayload`.
2. **Cache `collectFromPayload` / input radial command list** per payload identity (roomId + object id set + inventory id set + dict key); invalidate on tick change only.
3. **Share one `payloadPool` snapshot** across `collectFromPayload` the way `Open`/`resolveObjectCommands` already do via `_resolutionPool`.
4. **Do not put hundreds of dictionary verbs on the first input ring** (page or omit stems that are not exits/universals/chrome); keep uncapped data for More if product requires it.
5. Audit remaining **`parseDictionary` callers** so open/tick paths only hit `_dictWordCache` / one parse per story load.

---

## Verdict for compare

- **Wheel slow:** **CONFIRMED** on current checkout; primary cause **H1** (GetRadialCommands → collectFromPayload + large dictionary-verb dump). LostPig shows ~1 s @6× CPU.
- **Underline radial slow:** **CONFIRMED mechanism** via **H2** (Open → addMoreActions → GetRadialCommands); Identity object Open still modest in Chromium when collect is not at LostPig scale.
- **Underline short-tap 10 s:** **NOT reproduced** as pure Open/resolve cost on Identity desktop; likely device/APK, full turn+Refresh, or long-press path misreported as “underline action”.
- **Cumulative:** **Partially confirmed** (object/dict load and per-open rebuild), **not** confirmed as pure BufferLine growth on Identity with fixed 6 objects.

Seat: grok2  
Sealed: 2026-10-18
