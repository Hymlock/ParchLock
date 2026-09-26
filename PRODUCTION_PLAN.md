# Parchmap - Production Plan: Full-Stack Engine-Level Overlay

## September 16 Audit Remediation (Ready for Review)

Operator authorized implementation, harness restart, and clearing four stale D86
claims. This supersedes the old seat-only documentation ownership restriction.
Historical decision entries remain evidence of their original test scope, not proof
that every downstream consumer is correct.

- D84 reopened by a new live Bronze counterexample: constant globals could win
  correlation and freeze the map. Calibration now requires actual value changes,
  structural validity, and revisits; mirrored candidates form a hypothesis and
  tied divergent hypotheses remain unresolved. Version-1 location/attribute caches
  are discarded while independent verb-response learning is retained.
- D47 extended through map rendering, navigation, current-room selection, and
  transition signatures. Names are labels; ambiguous name-only lookup fails closed.
- Accepted command notifications now feed usage and undo/restore synchronization
  from both native typed Enter and injected submissions. Radial pagination preserves
  its ranked list. Navigation waits for the expected room and stops on failure.
- Save import validation/rollback, story identity, corrupt-map preservation, and
  PHP boundary hardening are implemented and adversarially verified. VM restore
  synchronization only activates for successful `restore_file`/`restore_undo`.
- D80 Wumpus descriptor selection remains unchanged. Glulx work remains parked.

Post-change evidence: `tools/audit-live-mapping.js` passes real randomized Wumpus,
Bronze, Zork, and mobile Anchorhead, including duplicate room titles, typed undo,
radial pagination, usage counting, and transactional import failures. Browser gates
also pass desktop/mobile UI, native save/restore, actual route arrival, recorder 14/14,
entry points 8/8, and Bronze proof 4/4. Focused gates pass structural cutover 134/134,
room identity 13/13, destination deduplication 3/3, location calibration 15/15,
attribute calibration 13/13, verb disablement 21/21, lookahead 88/88, and nested
inventory 60/60. Portable PHP 8.4 executes the upload/log adversarial suite cleanly.
This remediation is ready for review; only the operator records overall completion.

## September 16 Semantic Action Plan (D88 - Ready for Implementation)

This plan was produced by two isolated, independent reviews and then challenged by a
third isolated adversarial review against the current code and tests. The reviews
agreed that parser words, UI labels, and player intent must become separate concepts.
The challenge rejected one unsafe assumption in the current D85 behavior: different
responses across objects can show object-specific behavior, but cannot by themselves
prove that an unknown command means INSPECT. A command such as `read`, `search`, or
`touch` may be object-specific and still be side-effectful or semantically different.

### D88 invariants

- A stable semantic intent (`INSPECT`, `TAKE`, `OPEN`, `TALK_TO`, and so on) is not a
  parser verb, display label, or command string.
- All command surfaces resolve the same descriptor: left-click, desktop radial,
  inventory radial, genuine touch long-press, input radial, autocomplete, and
  navigation. No consumer reconstructs a command independently.
- Missing INSPECT never falls through to TAKE, OPEN, EAT, TALK, or another action.
  An unresolved primary intent is omitted or disabled and submits nothing.
- Command forms preserve word order, prepositions, direct/indirect object roles, and
  verified noun aliases. `look at {direct}` must never degrade to `look {direct}`.
- Dictionary membership is lexical capability only. It is not proof of syntax,
  object applicability, or semantic meaning.
- Passive learning observes commands the player actually submitted. The system never
  probes, retries, or auto-falls back inside the game, including for supposedly safe
  observational commands.
- A behavioral response pattern may veto a proven-bad form or create a provisional
  custom form, but semantic promotion requires a compiler/engine adapter, a structural
  opcode/state witness, or an explicit association. Random or repeated prose alone is
  never semantic proof.
- Ambiguous nouns, parser clarification, correction, incomplete input, menus, delayed
  output, and interrupted turns cannot commit learning.
- Providers are parallel strategies selected by capabilities, never story title,
  filename, room name, catalog id, or a serial-specific product branch.
- Unsupported engines/locales report honest absence rather than emitting an English
  guess. Existing engine-specific structural solutions continue to coexist.

### Target contract and precedence

Add `js/SemanticActions.js` as a pure registry/resolver. `ActionSynth` supplies
available semantic actions from structure and context; dialect providers realize an
intent as an exact parser template. A resolved descriptor contains `actionId`,
`intent`, stable UI `label`, role-aware `template`, rendered `command`, object ids,
`source`, `evidence`, `confidence`, and payload generation. Legacy `verb`, `noun`, and
`command` fields remain additive compatibility output until every consumer is proven.

Resolution order is deterministic:

1. Reject stale/out-of-scope targets and apply confirmed form-specific vetoes.
2. Use an explicit structural command already supplied by RAM, such as an exit.
3. Use a confirmed object/context-specific semantic form whose fingerprint still
   matches.
4. Use a confirmed game-build-wide semantic form.
5. Use a decoded compiler grammar pattern.
6. Use a compiler-family profile only when its required lexical capabilities exist.
7. During migration only, use the current literal `ActionSynth` form as a compatibility
   candidate.
8. Otherwise return no resolved command. Never submit a speculative fallback.

Providers remain independent: `StructuralCommandProvider`,
`ObservedDialectProvider`, `InformZDialectProvider`, `ZilDialectProvider`, and a future
`InformGlulxDialectProvider` after Glulx structural support exists.
`DictionaryCapabilityProvider` may supply words but never compound syntax or semantics.

### Staged implementation

1. **Baseline repair and capture.** Correct the two known stale fixtures
   (`d31-known-topics` source-text expectation and the `command-consistency-regression`
   fake `Input.Inject` return value). Record exact current output for synthesis,
   primary click, both radials, input stems, autocomplete, navigation, and pagination.
   **GO:** all focused suites are green. **STOP:** any unexplained production failure.
2. **Semantic registry in shadow mode.** Add pure intent, template, rendering,
   recognition, provider-registry, and precedence contracts. Wrap current
   `ActionSynth` behavior with byte-equivalent legacy DTOs; no UI behavior changes.
   **GO:** deep parity over existing command arrays. **STOP:** order, labels, strings,
   stems, or primary selection differ.
3. **Role-aware multiword recognition.** Match known object ids and verified aliases
   longest-first, then match templates around those spans. Cover `look at {direct}`,
   `talk to {direct}`, `switch on {direct}`, `give {direct} to {indirect}`,
   `put {direct} in {indirect}`, and `ask {direct} about {topic}`. Ambiguous or partial
   matches produce no observation. **STOP:** swapped roles or guessed free text.
4. **Passive evidence in shadow mode.** Add command-form analysis to the existing
   `TurnRecorder` substrate. Mutating intents require structural opcode/state witnesses.
   Non-mutating response evidence remains provisional unless an adapter supplies the
   semantic mapping. Parser prompts and randomized text cannot promote a form.
5. **Sidecar persistence and migration.** Store versioned data under
   `PM_SemanticActions_<buildIdentity>` with checksum, adapter version, locale/grammar
   regime, template signature, scope, evidence, and contradiction counts. Do not rewrite
   `PM_AttrCalib_*` v2. Import D85 substitute data once as legacy/provisional evidence,
   never as newly proven semantics. Corrupt or mismatched data fails closed.
6. **Unified consumer cutover behind one flag.** Move left-click, object/inventory
   radials, genuine mobile long-press, input radial, autocomplete, usage ranking, and
   navigation to the same descriptor list. Count usage by semantic action plus exact
   rendered form, retaining legacy counters for comparison during the soak.
7. **Held-out live challenge and default-on.** Freeze code before selecting the held-out
   stories/builds. Run clean-profile tests across Inform Z3/Z5/Z8/zblorb, non-Inform
   ZIL, randomized Wumpus, AOTYRZ, duplicate nouns, a multiword-only fixture, and a
   localized fixture. Glulx gets the same gate only after its structural adapter exists.
8. **Cleanup after soak.** Remove the first-token inspect split and legacy usage path
   only after default-on evidence. Keep v2 readers and the rollback flag for at least one
   compatibility cycle.

### Double-blind serial/build challenge

The implementation gate is intentionally out-of-sample. Implementers do not choose or
inspect the held-out game list after the code freeze. The evaluator records full build
identity (release, serial, checksum) but withholds title/serial labels from assertions;
no product code may branch on them. Each run starts with cleared semantic sidecar data,
then repeats after reload, save/restore, undo, and restart. Two binaries sharing release
and serial but differing in checksum must not share learning.

Mandatory black-box cases include repeated valid generic descriptions, randomized
failure text, randomized successful descriptions, multiword and localized grammar,
same-named objects, NPC/object collisions, parser correction/disambiguation, delayed
output beyond the current settle window, menus/grid windows, and side-effectful
`search`/`read`/`touch` candidates. Physical Enter, virtual-keyboard Enter, tap, real
touch long-press, radial selection, autocomplete, and programmatic navigation must each
submit exactly one identical resolved command and produce one recorder observation.

**Release gate:** zero wrong automatic submissions; unresolved INSPECT never triggers a
different action; every displayed form is accepted for the intended stable object id;
all UI surfaces agree; no cross-build persistence; existing D31/D34/D73/D85/D86/D87
regressions remain green. Rollback is the semantic-consumer flag plus the untouched
legacy DTO/v2 calibration path; maps, saves, and imported packages require no rollback.

> Diagram companion: [`ARCHITECTURE_UML.md`](ARCHITECTURE_UML.md).  
> GUI contracts: [`GUI_BASELINE.md`](GUI_BASELINE.md).  
> **Authority:** this plan. Where the UML disagrees, **the plan wins** - and that disagreement is a bug.  
> **Advisory input only:** `Full Stack Engine Level Conversion.txt` (suggestion draft; duplicated; not gospel).

**Status:** Draft audited 2026-09-11 (repo-aligned; Translator architecture locked)  
**Created:** 2026-09-11  
**Owner:** hymlo / Faunce  
**Repo:** `Parchmap-main` (git; GPL-3.0; `Consts.js` BUILD **33**)  
**Intent:** Convert Parchmap from DOM/text-scraping QoL overlays toward a production-grade world-model overlay & action engine - while **preserving** intended UX (map, radials, inventory, notes, pathing, anti-spoiler discipline).

| Legend | Meaning |
|---|---|
| [yes] | exists in current repo / verified |
| [~] | partial / present but wrong data source |
| [ ] | designed, not built |
| [!] | risk / unproven - needs a gate |

### Audit changelog (2026-09-11)

- Locked **WorldModel Translator (L2.5)** + pluggable providers (D12); rejected RAM-correctness-first gate.
- Rewrote objectives/pipeline so ship order is **behavioral -> Z RAM -> Inform-Glulx**, heuristic forever-fallback.
- Fixed D3 conflict with D8 (Inform-family is the *RAM target*, not ship-first).
- Aligned module inventory with repo (`js/*`, `lib/*`, `tools/*`, BUILD 33, GPL-3.0, ~298 `games/` wrappers).
- Folded live regression evidence from `GUI_BASELINE.md` (5/5 PASS on test slice).

---

## 1. Objective (consolidated)

Build a **turn-synchronous overlay** whose UI is driven by a **normalized world-model payload**, not by ad-hoc DOM scraping:

1. Maintain a **WorldModel Translator** that always emits one `UIPayload` (with confidence / provenance).
2. Feed that translator from **pluggable providers** (behavioral Glk/commands for HUD/meta, Z RAM, Inform-Glulx RAM) - never a single fragile source. Text-mining heuristics are **not** one of these providers for actionable/map/radial fields (D24); they were retired from that role, not merely deprioritized. Scope is Z-machine and Glulx only (D39) - no other VM format is planned.
3. Apply a **RAM-scope Visibility Shield** (D24, §4.4) so undiscovered entities are not spoiled by default - visibility is determined by real-time RAM containment/light rules, not by matching printed transcript text.
4. Synthesize **state-aware actions** for radials strictly from real object attributes via `ActionSynth` when structural data exists; when it doesn't yet for a room/object/format, show nothing rather than a generic guessed verb list (D24).
5. Drive map, inventory tree, HUD, and pathfinding from the payload.
6. **Degrade gracefully to an empty/"not ready" state** when RAM introspection is unavailable for actionable/map/radial - not to a heuristic substitute (D24). HUD/meta may still degrade to P0 behavioral text-mining, since that surface was never in scope for the heuristic elimination.
7. **Deterministic structural primary, no heuristic fallback (D17, hardened by D24):** actionable items, map identity/graph, and left/right-click radial commands MUST come from real VM RAM (object IDs / attribute bits / dictionary bindings / in-scope children) - never from prose text-mining or name-string guessing. **P1 heuristic is not a forever-fallback for these three surfaces; it is eliminated.** Where structural RAM data does not exist yet for a room/object/format, the correct behavior is showing nothing (or an explicit "engine not ready" / "no overlay for this format" state) - never a best-effort guess. This applies to every VM format, not only Inform-family Z/Glulx; formats without a structural provider simply have no actionable/map/radial overlay until one is built (see D24).
8. **Universal coverage (D22):** the same P2/P3 deterministic path MUST work for **every room/location**, **every catalog story module**, and **every supported module system** (Z3/Z5/Z8/Zblorb on Quixe; Glulx when under the same chrome; specialized modules like wump2ka/yagwad via the same play.html Translator). Alley/Anchorhead is a **fixture only**, never a product dependency or code branch. The RAM miner must be holistic for all rooms/modules/systems.
9. **Real-attribute-bit schema, not name-regex (D25):** every object attribute an actionable/radial decision depends on (container, openable, open, locked, supporter, wearable, switchable, edible, door, scenery, etc.) MUST be read from a documented, sourced attribute-bit profile (e.g. Inform 6 standard library `linklpa.h` numbering) via the VM's real attribute bitfield - never inferred from the object's own name string via regex, and never defaulted to a guessed boolean. A flag the profile doesn't cover is left absent, not guessed.
10. **Deterministic input-line radial (D26):** the general right-click radial on the input line keeps its existing app-level chrome (undo/save/restore/map/history/transcript - non-game-content, no RAM needed) unchanged, but its game-content portion (direction shortcuts, verb-stem shortcuts) MUST be sourced from the current room's real RAM exits and the story's real dictionary/specialCommands - never a fixed generic list assumed valid for every game. Direction shortcuts follow D23 exactly: never hardcode N/S/E/W (or any compass set) as the assumed exit vocabulary - a module may expose numbered exits ("1"/"2"/"3"), nautical terms, or other arbitrary labels instead of compass directions, and the radial must show whatever exit labels are real for the current room, compass or not.
11. **Real-gameplay verification, not synthetic-only (D27):** any change to the actionable/map/radial UI surfaces must be proven with actual browser gameplay against a real catalog story (screenshots as evidence, reusing the existing Playwright regression tooling), in addition to any synthetic/unit-style fixture. A synthetic fixture alone does not close out a UI-facing phase.


**Non-goals**
- General IF IDE/debugger UI.
- Perfect spoiler-free play for every experimental Inform extension.
- Shipping SKSE/Skyrim into Parchmap (DevKits = toolchain patterns only).
- Covering author Glk graphics with our canvas.
- Blocking all UI progress until RAM mining is "complete."

---

## 2. Repo-aligned current-state audit

Verified against `C:\Users\hymlo\Downloads\Projects\Parchmap-main\Parchmap-main` on 2026-09-11.

### 2.1 Runtime host (today)

| Piece | Status | Notes |
|---|---|---|
| `lib/main.js` + `lib/zvm.js` + `lib/quixe.js` | [yes] / [!] | Legacy Parchment JS VMs. Upstream modern Parchment uses Emglken + Bocfel + Glulxe/Git + AsyncGlk + RemGlk-rs. |
| `lib/jquery*.js`, `ie.js`, `resourcemap.js` | [yes] | jQuery shell; not a Phase-0 blocker. |
| `play.html` / `index.html` | [yes] | Play shell + chooser; `?story=` contract. |
| `games/` (~298 `*.js` story wrappers) + `user/` | [yes] | Catalog + uploads. Host migration must keep these loadable (or migrate wrappers). |
| `LICENSE` | [yes] | **GPL-3.0** - any vendored terp licenses must remain compatible/noticed. |
| `Consts.js` | [yes] | `BUILD = 33`. |

### 2.2 Overlay modules (today)

| Module | Role today | Data source | Disposition |
|---|---|---|---|
| `js/Parchmap.js` | Orchestration; ~200ms `Loop` | DOM text-length deltas | Replace turn authority; keep shell |
| `js/Actionable.js` | Dotted nouns + radial | Regex / English lists | Dual-backend via Translator; keep UX |
| `js/Map.js` | Automap | String room names | ID graph when structural; keep pan/zoom/notes |
| `js/Navigator.js` | `/goto` | Name graph; **deterministic BFS shortest-path (`FindShortestRoute`), step-queue already built (`StepQueue`/`EnqueueRoute`/`Pump`)** (verified 2026-09-12 - prior "randomized short path"/"replace with step queue" description was stale, not this session's doing) | ID-key the underlying graph once Map.js/MapIdentity.js are RAM-keyed (Phase 3/D32); BFS itself doesn't need replacing |
| `js/Input.js` | Slash cmds; inject into `.Input.LineInput` | DOM | Prefer `extevent`; keep slash UX |
| `js/Autocomplete.js` | Tab complete | Buffer harvest | Keep; seed dict when available |
| `js/Qol.js` / `WorkspaceUI.js` | Items, maps modal, display, packages | **D26 cutover landed 2026-09-12: `GetRadialCommands()` game-content portion (exits/verb-stems) now reads `WorldModel.lastPayload` directly; only the app-chrome portion (undo/save/restore/map/history/transcript) stays static, per D26.** Note: `ParchmapQol.Directions`/`ShowCommands()`'s `/commands` help modal is a separate, still-hardcoded compass list not covered by D26 (different surface than the radial). | Nested inventory tree still pending (Phase 3); radial cutover done |
| `js/Directions.js` | Cardinal vocab | Static | Keep + non-cardinal labels |
| `js/GameList.js` / `MainMenu.js` / `Message.js` / `Global.js` | Catalog/menus/prefs | localStorage | Minimal |
| `tools/*-regression.js` (**8 scripts** as of 2026-09-12, up from 5 - added `alley-ram-actionable-regression.js` for D27) + screenshots | UI gates | Playwright | Keep & extend (5/5 PASS on 2026-09-11 slice; D27 Alley RAM fixture independently re-verified PASS 2026-09-12) |
| `log.php` / `upload.php` | Hosting helpers | Server | Defer / optional |

### 2.3 Product behaviors to respect

Anti-spoiler default; map notes/snapshots/packages; noun+tools radials; inventory panel; slash commands; Glk dialog coexistence; mobile modal pattern from GUI baseline.

---

## 3. Research findings that change the guide

The conversion TXT is directionally useful (RAM -> gate -> synthesize -> UI) but incomplete. Treat as advisory.

### 3.1 Platform migration is mandatory [!]

Modern Parchment runs Emglken WASM terps + AsyncGlk. This repo still vendors Quixe/ZVM. **O1 host swap before deep RAM work.**

### 3.2 Emglken has no official VM-RAM API [!]

Exports are essentially `_main` / `_setThrew`. `HEAPU8[0]` is the Emscripten address space, not Z/Glulx address 0. Production RAM needs **`vm_read_*` / ram base-length exports** (fork or upstream RFC). Naive HEAP scanning is a maintenance trap.

**Public hooks that exist now:** GlkOte `update`, `extevent`, `before_select_hook`, Dialog, Blorb, `.glktra`.

### 3.3 Attribute / property numbers are not universal [!]

I6 stock `linklpa.h` order is a useful *profile*, not a universal ABI. I7 / PunyInform / INFIX / `$NUM_ATTR_BYTES` shift layouts. Glulx objects are compiler-synthesized (`0x70`), not a VM standard.

A real calibration escape hatch now exists for the mutation-bit subset of this problem (D73): `js/AttrCalibrator.js` observes the compiled game's own opcode execution (`test_attr`/`set_attr`/`clear_attr`/`insert_obj`/`remove_obj`) live, via `js/ZvmCapture.js`'s existing VM-prototype-patching mechanism, and can learn per-game which real bit a verb actually mutates on success - ground truth from the running interpreter itself, not a static guess. Z-machine only for now; see D73 for the full mechanism and rollout phases.

### 3.4 Inform scope != children-of-room [!]

`location` vs `real_location` / `thedark`; `OffersLight` / `HasLightSource`; `add_to_scope`. Darkness is not "hide if room lacks light bit."

**Vehicles/seats resolve room identity via the parent chain, not via containment alone (D32 - previously only in ARCHITECTURE_UML.md §5's picture, missing from this prose authority):** when the player is inside a vehicle/seat object (`enterable`, `container`/`supporter`), `parent(player)` is the vehicle, not the room - the room is `parent(parent(player))`. Scope/actionable resolution must walk this chain rather than assume `parent(player)` is always the room; this is the same containment matrix already in ARCHITECTURE_UML.md §5, restated here so the prose copy is authoritative per this doc's own rule ("if they disagree, the plan wins").

### 3.5 Exit properties are polymorphic

`n_to` etc. may be room, door object, routine, or string. Doors need `door_to` / `door_dir` / `with_key`.

### 3.6 Format capability matrix

Full structural engine target: Inform-family Z/Glulx only (already vendored interpreters, Phases 1-4) - D39 removes Hugo/TADS/Adrift from scope entirely, not merely a sequencing deferral. Neither Z nor Glulx is a permanent heuristic/behavioral-only citizen; a format with no structural provider yet simply has no actionable/map/radial overlay until its provider lands (D24), rather than a text-mining substitute.

### 3.7 Turn boundary & performance

Replace DOM polling with Glk event-cycle hooks. Refresh HEAP views after growth. Budget layout work.

### 3.8 Prior art

Zarf HL overlays; babelmap; jzip.js automap; zexplorer/ztools fixtures; Glulxe+dbg; Vorple = opt-in cooperative only (never eval untrusted stories).

### 3.9 Licensing

Parchmap is GPL-3.0. Verify Bocfel/etc. per vendored revision; keep NOTICE accurate for currently-vendored interpreters (Bocfel, Glulxe/Quixe).

### 3.10 UI shell & generation

Mount chrome **outside** `#windowport`. Generation-aware caches (`gen` + save identity). Inject via `extevent`, do not peer-call `GlkOte.update`.

---

## 4. Target architecture

### 4.1 Layers

| Layer | Responsibility | Tech leaning |
|---|---|---|
| **L1 VM core** | Optional RAM exports, undo/restore signals, schema inputs | Bocfel/Glulxe/Git via Emglken + minimal C exports when needed |
| **L2 Glk/AsyncGlk seam** | Turn sync, stream tokens, window tree, input inject | TS / host adapters |
| **L2.5 WorldModel Translator** | Normalize provider outputs -> `UIPayload` + confidence; text-gate; action synth; route queue | TS (new module; can start as JS seam in-repo) |
| **L3 Overlay UI** | Existing Parchmap chrome evolved: map, radials, items, HUD | Keep current UX; migrate modules in packages O1-O5 |

**Approved defaults:** Protocol-first; Translator always present; TS-first for new engine code; **no** undocumented HEAP scans as product core; WASM layout solvers only after perf gate (>=500 nodes).

### 4.2 WorldModel Translator (D12) - heart of the design

Industry pattern: **anti-corruption / facade layer** with pluggable sources - not "mine RAM until perfect, then paint UI."

```
Providers --> Translator (merge + confidence + spoiler gate) --> UIPayload --> L3
```

| Provider | When | Role |
|---|---|---|
| **P0 Behavioral** | Always available after O1/O2 | GlkOte observe + movement/status/title; feeds HUD/meta only, not actionable/map/radial |
| **P1 Heuristic text** | **Eliminated for actionable/map/radial (D24)** | No longer a source for discoveredObjects/exits/inventory/radial verbs. May remain, clearly labeled, for non-actionable telemetry only (e.g. HUD text mining under Phase 7) if it doesn't touch the three eliminated surfaces. |
| **P2 Z RAM structural** | After Emglken exports | Version-aware object table (v3 vs v4+); real attribute-bit schema (D25) |
| **P3 Inform-Glulx structural** | After fingerprint/dbg/exports | `0x70` walker; dbg-assisted when present |

**Translator duties:** unify room/exit/object/inventory; attach `confidence` + `source`; apply spoiler shield; synthesize actions when attrs exist; expose route commands. For actionable items, map identity, and radial commands specifically: P2/P3 structural data is the *only* source - there is no P0/P1 fallback for these three fields once this cutover lands. P0/P1 may still inform HUD/meta surfaces that were never in scope for this cutover.

**Single-source-of-truth wiring (explicit, not implicit):** every UI consumer - object marks (`Actionable.Refresh`), left/right-click radials for objects (`Actionable.Open`/`ActionSynth`), the input-line general radial's game-content portion (`Qol.js`, D26), the inventory tree, and the map/exit graph - must read from the *same* `WorldModel.lastPayload` produced this tick. No module may derive its own parallel scope/exit/attribute list independently (that's exactly how the old heuristic paths ended up disagreeing with RAM data). `ActionSynth` is the single place verb lists get synthesized from attributes; nothing else hardcodes a verb-by-name-regex or a verb-by-object-type list.

**P2 Z RAM structural duties (heart of deterministic play):**
1. `get_vm_ram` / live memory view (ZVM `m`/`ram` or Bocfel HEAP exports).
2. `get_player_object_id` (or Inform-global fingerprint) ? `location = parent(player)`.
3. Walk `child(location)` (+ open containers / supporters per matrix) ? in-scope object IDs.
4. Resolve **short names** from property tables; bind UI words via **RAM dictionary** (Word<->ObjectID).
5. Look-ahead exits: `n_to`/`s_to`/? and door attrs from RAM without requiring travel.
6. Emit `discoveredObjects` / `exits` / `roomId` with high confidence so Actionable/Map stop guessing.

**P1 heuristic text-mining:** eliminated as a source for discoveredObjects/exits/inventory/radial commands (D24). When P2/P3 is not yet live for a room/object/format, those fields are simply empty - never backfilled from text-mining, and never from a RAM-confirmed-empty result either (a real empty room stays empty).

**Rejected:** RAM-correctness-first gate that blocks O1-O2 UX entirely (O1/O2 host-migration and turn-sync work can still ship without RAM); heuristic UX as a permanent substitute for actionable/map/radial once cut over.

### 4.3 Per-turn pipeline (corrected, D24)

`Glk turn/update` -> `providers.collect()` -> `Translator.merge` -> `light/scope gate (Phase 1 containment rules: current room + open/transparent containers + supporters + worn, light-gated)` -> `action synth (if structural)` -> `map graph update` -> `UIPayload` -> `L3 render`.

There is no separate `text-gate` stage for discoveredObjects/exits/inventory/radial - that was the old printed-vocab cross-reference mechanism and it is removed (D24). Structural RAM reads are the entry condition for these three fields specifically (not optional enrichment on top of a text-derived baseline); other VM formats without a structural provider yet simply produce empty fields for them (D24), not text-gated ones.

### 4.4 Spoiler policy (corrected, D24)

"Discovered" is now defined purely in RAM-scope terms, not by matching printed transcript text: an entity is visible to the UI if and only if it is in the player's current real-time RAM scope per Phase 1's containment rules (current room's children, open/transparent containers, supporters, worn clothing containers, all subject to the light gate) or held/worn in inventory. This is a deliberate refinement over the original conversion-guide mechanism ("vocabulary word appears in printed text" - `Full Stack Engine Level Conversion.txt` §4), which itself depended on text-matching and would have reintroduced exactly the failure mode D24 eliminates. A closed container's contents are never "discovered" regardless of whether they were ever printed; an object sitting in an open, lit, currently-occupied room is discovered the instant it's in scope, whether or not its name has appeared in the transcript yet - RAM scope is the single source of truth for visibility, matching the single-source-of-truth principle in §4.2. No casual full-tree browser (only the current scope, never the whole game's object table). Optional debug/reveal = explicit, off by default.

---

## 5. DevKits & harnesses

| Resource | Path | Role |
|---|---|---|
| SKSEDevKit | `Projects/SKSEDevKit` | CMake/Ninja/vcpkg patterns for Emglken C export builds |
| Ensouled harness | `Projects/Ensouled/harness` | docs-sync / fixture gate patterns -> `Parchmap/harness/` |
| ensouled-rig / AI-Bus | optional | multi-agent workflow |
| `tools/` | repo | Playwright UI regs; expand with Translator fixtures |
| `_parchmap-test-slice/` | sibling test checkout | Convenient local runner (not product) |

**Gates to create [ ]:** `docs-sync` (D29 - every phase updates the relevant plan/architecture sections and confirms every touched legacy system is either correctly updated or fully removed, never left half-migrated or contradictory), `payload-schema`, `spoiler-shield` (RAM-scope, not text-match, per D24), `platform-smoke`, `ui-regression` (extend existing 5 scripts, now including real-gameplay screenshot evidence per D27), `translator-merge` (confidence fixtures). (`fallback-heuristic` gate is dropped - there is no heuristic fallback for actionable/map/radial to gate.)

---

## 6. Phased roadmap

### Phase 0 - Contracts, corpus, Translator spec, doc gates [x]

Define `UIPayload` + provider interfaces + discovery policy; `engineMode` matrix; harness skeleton; corpus list; Emglken export RFC checklist; outside-`#windowport` shell design.  
**Gate:** docs-sync; Translator contract reviewed; corpus pinned.

### Phase 1 - Host migration + behavioral provider (O1/O2) [x]

Modern Parchment/Emglken/AsyncGlk; GlkOte observe + `extevent`; improve behavioral map (HUD/meta only, D24); story-signature persistence. Heuristic Actionable is retired for actionable/map/radial per D24, not carried forward as-is.  
**Gate:** platform-smoke; existing ui/startup/layout/highlight regressions green; zero HEAP required.

### Phase 2 - Live Z RAM provider (P2) - CRITICAL PATH [ ]

**This phase is the heart of deterministic actionable + mapping for EVERY room/module/system.** Fixture harnesses may use specific rooms; product code must not.

**Universal Phase 2 acceptance (D22):** not done until the live walk works in **arbitrary rooms** across the catalog matrix (not only Alley), with object-id marks + ActionSynth radials + inventory from RAM.

Required deliverables (from conversion guide, folded in):

**As-you-go rule:** each turn decode only the current room from RAM (player object ? parent(location) ? in-scope children + look-ahead exits). The map grows as the player moves (state-delta + look-ahead). No whole-game room pre-scan.


**As-you-go rule:** decode only the current room from RAM each turn (player ? location ? scope/exits). Map grows with movement. No whole-game room pre-scan.


**As-you-go rule:** each turn decode only the current room from RAM (player object ? parent(location) ? in-scope children + look-ahead exits). The map grows as the player moves (state-delta + look-ahead). No whole-game room pre-scan.


**As-you-go rule:** decode only the current room from RAM each turn (player ? location ? scope/exits). Map grows with movement. No whole-game room pre-scan.

1. Live memory capture on `play.html` ZVM path (`window.__PARCHMAP_ZVM__` / `m`+`ram`) and/or Bocfel `get_vm_ram_ptr` when Emglken is under the same chrome.
2. `get_player_object_id` (export or Inform global fingerprint).
3. **As-you-go location cascade:** each turn decode only the current room ? `roomId = parent(player)` when valid; room short name from props. Do not pre-scan the whole game; map grows via look-ahead + state-delta as the player moves.
4. In-scope walk: children of room + open/transparent containers + supporters (false-positive matrix).
5. Short-name decode + **dictionary Word<->ObjectID** binding for every actionable mark.
6. Look-ahead exits/doors from direction properties + lock/open attrs (no travel required).
7. Translator merge: P2 **wins** over P0/P1 for roomId, exits, discoveredObjects when confidence >= structural threshold.
8. Actionable primary = Translator structural marks only when P2 present (Phase 4 depends on this).

**Gate:** Anchorhead Alley RAM-backed marks include object IDs for cans/window/fence (harness); zexplorer-style containment fixtures; if live RAM is missing, the gate requires an empty/not-ready UI state (D24), not a heuristic fallback.

### Phase 3 - Text-gate + nested inventory UI [x] (D24 correction: the phase's namesake mechanism was removed, not built - read before trusting the bare `[x]`)

**This phase's `[x]` does not mean "text-gate is done and working."** It means "nested inventory UI shipped, and the spoiler-shield discovery gate this phase originally built (printed-text vocabulary matching) has since been superseded and removed by D24 in favor of pure RAM-scope containment (§4.4)." `js/TextGate.js`'s `isVisible()` is now a permanent no-op returning `true` always - it does not gate anything. A reader scanning only this line item, without knowing about D24, would wrongly conclude text-gate is a working spoiler mechanism today; it is not, deliberately.

Discovery set; closed-opaque non-recursion; Items panel consumes tree when present.  
**Gate:** spoiler-shield (now RAM-scope per D24, not printed-text) + nesting fixtures; Loop demoted.

### Phase 4 - Action synthesis + unambiguous commands [~] (blocked on Phase 2 structural) (D31: three requirements restored from conversion guide)

**D88 semantic-action work is the active Phase 4 command architecture.** The detailed
plan above separates stable intent from each story's parser realization, preserves
parallel compiler/engine strategies, and cuts all desktop/mobile command surfaces over
only after shadow parity and the held-out serial/build challenge pass.

Attr/relation verb matrix (I6 profile as starting ruleset); **RAM dictionary Word<->ObjectID** for every clickable word; **grammar-table verb extraction** for non-standard actions; adjective+noun unambiguous commands (query the object's dictionary adjective properties, not just its noun, so a synthesized command like `TAKE SMALL BRASS KEY` is unique enough to skip parser disambiguation - not just "TAKE KEY"); invalid-action suppression from attribute bitfields; Actionable primary = Translator when structural.

**Restored from the conversion guide (previously dropped entirely during the original TXT-to-plan conversion, per D31):**
- **Positional verb suppression (relational state, not just object attributes):** the verb set for an object depends on *where it currently is*, not only what it is. An object with `parent == player` and not worn: DROP/GIVE TO/PUT IN, plus WEAR if wearable, TURN ON/LIGHT if switchable-and-off. An object worn (`parent == player`, `worn` bit set): only EXAMINE/REMOVE - suppress TAKE/DROP/WEAR. An object in the room or on an in-room supporter: EXAMINE, plus TAKE if takeable - suppress DROP/REMOVE/WEAR. An object whose parent is itself a container that is inside inventory (nested - e.g. a key inside a bag you're carrying): show only `TAKE OUT OF <CONTAINER>`, suppressing direct-use verbs (WEAR, LIGHT, etc.) until the object is moved to top-level inventory. **IMPLEMENTED AND VERIFIED, 2026-09-12.** Both claude and grok landed complementary parts of this concurrently (claude: `ZRamReader.walkVisibleDescendants`/`canSeeInside` shared helper factored out of `scopeObjects`, plus the same-shaped fix to `ZRamReader.snapshot()`'s inventory block; grok: the actual live provider path `ZRamProvider.collect()` rewritten to use that same shared helper for real inventory recursion, `ActionSynth.commandsForObject`/`heldContainerName`/`payloadPlayerId` implementing the full positional matrix above - worn/held/room/nested - and `Actionable.RenderInventory` fixed to build a real parentId->children index instead of reading the previously-dead `obj.contents`/`obj.children`). claude independently re-verified: read every changed file directly (not a self-report), ran a from-scratch fixture (`harness/d31-nested-inventory.js`, since replaced by grok's own more thorough version covering the full worn/held/room/nested matrix, 52/0), and re-ran the full regression suite (`phase1-closed-container.js`, `phase2-heuristic-cutover.js`, `d22-ram-matrix.js`, `d23-lookahead-labels.js`, `d34-dictionary-verbs.js`, `tools/ui-regression.js` - all green). One real bug caught and fixed along the way: `js/WorldModel.js`'s payload merge never propagated `playerId` at all, which silently broke `Actionable.RenderInventory`'s new top-level/nested split in live Playwright gameplay (0 inventory buttons rendered) even though every unit-level harness passed - grok fixed this via `payload.playerId = m.probe.playerId` in `WorldModel.tick()`. Also fixed a stale pre-existing regression assertion in `harness/d22-post-move.js` that required every inventory item (including worn ones) to offer `drop` - that contradicted the now-correctly-implemented worn-item rule (examine/remove only, no drop) and needed updating to match the verified-correct behavior, not the code needing to match the stale test.
- **NPC "Known Topics" palette for conversation** (`ASK <NPC> ABOUT <TOPIC>`, `TALK TO <NPC>`): the conversion guide's original mechanism was "match printed text nouns against the dictionary" - that is itself the printed-text-matching pattern D24 eliminates, so it needs the same correction applied here, not a literal port. Corrected version: a topic is offered when its underlying object/concept is in current RAM scope (another discovered object's name, another NPC's name) or is a dictionary noun with no object backing but flagged as a common/global topic word (if the format's dictionary distinguishes those) - never "the word happened to appear in the transcript." **Part 1 (TALK TO) IMPLEMENTED AND VERIFIED, 2026-09-12:** `js/ActionSynth.js`'s `commandsForObject` already had an unreachable `talk to` special case; `ActionSynth.rules` now maps `animate`/`talkable` (real `AttributeSchema` keys - `animate`=I6 attribute bit 0, `talkable`=bit 22, an addressable-but-inanimate object) to `["talk to"]`, making it reachable. Verified by claude directly: `harness/d31-known-topics.js` (new, 16/0 - animate NPC synthesizes `talk to`, inanimate object does not, `talkable` non-animate objects also do), full regression suite green, and live Playwright (`tools/ui-regression.js`) confirms no gameplay regression from the new verb. **Part 2 (ASK ABOUT) - proposed, approved, IMPLEMENTED AND VERIFIED, 2026-09-12:** grok researched whether the dictionary carries any real signal for "conversation topic word" the way D34 found a real verb-flag bit - finding, consistent with D34's own conclusion, that grammar-table token type 9 ("topic") is verb-parse machinery (how ASK/TELL syntax consumes the rest of an input line), not a per-word or per-object topic flag; there is no RAM-decodable "global topic word" signal. Honest fallback (approved and implemented): topics are offered ONLY for objects/NPCs actually present in `WorldModel.lastPayload.discoveredObjects`/`.inventory` (real RAM scope, already populated by `scopeObjects`/`walkVisibleDescendants`) - never invented from raw dictionary nouns. UI hook (approved and implemented): `js/Actionable.js` `Open()` appends an "Ask about..." submenu (mirroring the existing "Use with..." pattern) only when the clicked object has `attrs.animate || attrs.talkable`, sourced from `Actionable.payloadPool()` excluding the NPC itself and the player (`ActionSynth.payloadPlayerId`), capped at 8 like "Use with...". Implemented by claude directly after Grok's approved proposal sat unstarted past the normal check-in interval (matches the established practice of not waiting indefinitely once a spec is fully approved and unambiguous). Verified: `harness/d31-known-topics.js` extended with source-level assertions (21/0 total - the gate check on `attrs.animate || attrs.talkable`, the `"ask <npc> about <topic>"` command template, `Actionable.payloadPool()` as the topic source, and an explicit absence check for `lastLookText`/`windowport`/`BufferLine`/`RoomLines`/`.textContent` in the new code path), full regression suite green (`phase1-closed-container.js`, `phase2-heuristic-cutover.js`, `d22-post-move.js` 5/5, `d22-ram-matrix.js` 7/7, `d23-lookahead-labels.js` 82/0, `d34-dictionary-verbs.js` 54/0, `d31-nested-inventory.js` 58/0), and live Playwright (`tools/ui-regression.js`) confirms no gameplay regression. Phase 4/D31 (positional verb suppression, nested-inventory, Known Topics) is now fully closed.

**Gate:** fewer illegal verbs; less disambiguation on multi-key fixtures; a nested-inventory fixture proves an object inside a held container only offers "take out of X," never WEAR/LIGHT/etc. directly; a conversation fixture proves the Known Topics list is RAM-scope-derived, not transcript-text-derived.

- **Live opcode calibration for attribute semantics (D73), correcting D34/D58's "attribute-approximation is a ceiling" conclusion:** `js/AttrCalibrator.js` + six new patched opcode methods in `js/ZvmCapture.js` observe the compiled game's own precondition/action routines actually running (via `lib/zvm.js`'s live, prototype-patchable opcode methods), and correlate a submitted command to real success/fail evidence - see D73 for the full mechanism and proof. **Phase B, C, and D all IMPLEMENTED AND VERIFIED, 2026-09-13** - `harness/attr-calibrator-phase-b.js` 12/12, `harness/attr-calibrator-phase-cd.js` 13/13, full regression suite clean, live-verified across Wumpus (canteen bug genuinely fixed), Anchorhead (zero regression), and Zork1 (non-Inform, confirms the mechanism is VM-generic). D73's own entry has the complete evidence and mechanism detail.

**Grammar-table verb extraction is committed work, not indefinitely deferred (D34, operator directive 2026-09-12):** the correct long-term source of truth for "which verbs are valid on this specific object in this specific game" is the game's own compiled Grammar Table (verb tokens -> syntax rules -> per-verb object-applicability, resolved from RAM) - not `ActionSynth.rules`' generic attribute->verb table, which is explicitly a starting-ruleset approximation, never the target end state. `js/GrammarProvider.js` exists today but is dead code (confirmed by direct file audit): it reads verb-classification fields (`isVerb`/`flags`) from `ZRamReader.parseDictionary` that are never actually set, so its verb output is always empty - this has not been silently treated as "done." This is a materially harder task than the attribute-bit/dictionary work already shipped, because the Z-Machine Standard doesn't define a Grammar Table layout the way it defines the object table/dictionary header - it's an Inform-compiler convention, requiring either porting known decoder logic (prior art: Txd/Infodump from the classic Z-machine toolchain already do this) or building an equivalent profile. Sequencing: does not block or reorder the current active queue (D22 arbitrary-room, DROP fix, direction-label fix) - it is the next major assignment once that queue closes, ahead of the smaller Phase 4 items (positional verb suppression, Known Topics) that current `ActionSynth` already approximates reasonably. Not to be quietly folded into "I6 profile as starting ruleset" language and left there - that phrase describes the interim approximation, not an acceptable permanent state.

### Phase 5 - Map object-id identity + path queue + non-compass topology [~] (D32: click-to-rewind restored)

ID graph; **state-delta non-cardinal edges (D23)**; hybrid grid-force when mixed/non-compass; Navigator A* + step queue + interrupt; note-key migrator. Compass directions are optional, never required.

**Restored from conversion guide, previously missing entirely (D32):** each map node visit is paired with the VM's turn number when it was entered. Clicking a historical (already-visited) room node computes how many turns back that is from the current turn and issues that many `UNDO` commands to actually rewind the live VM state to match - this is a map-UI-triggered action, distinct from Phase 8's opcode-level `@restore`/`@undo` resync hooks (which keep the map/discovery state honest when the *player* types undo/restore/restart). Phase 5 builds the click-to-rewind trigger and turn-number bookkeeping; Phase 8's hooks are what make the resulting re-sync reliable regardless of how the rewind was triggered. Needs its own fixture: click an older map node, confirm the right number of UNDOs get issued and the map highlight lands back on that node.

**Gate:** locked-door interrupt; notes survive rename collisions; click-to-rewind fixture lands on the correct historical room after issuing the computed UNDO count.

### Phase 6 - Beautify / Z-axis / Glk coexistence [~] (D30: full mechanics restored from conversion guide)

Conversion-guide detail folded back in - this phase was previously reduced to a vague "planarization/orthogonalization/label collision" one-liner during the original TXT-to-plan conversion; the actual mechanics below are the real spec, not a summary of it.

**6.1 Hybrid grid-force physics model** (source: TXT "Hybrid Grid-Force Solver" + "Addendum: Automatic Graph Beautification"):
- Rooms connected only by cardinal edges (N/S/E/W/U/D) group into **Rigid Structural Clusters**: hard relative offset vectors `[dx, dy, dz]` between members, snapped to a fixed grid stride (**80px**, matching the source spec - tune only with a measured reason, don't silently drop the number).
- Rooms connected by non-cardinal edges (numbered exits, nautical terms, arbitrary labels - D23) get **soft distance springs** instead of hard offsets, resolved by a force-directed solver.
- **Cluster collision resolution:** treat each entire Rigid Structural Cluster as one rigid body in the force simulation; compute per-cluster bounding boxes and apply inter-cluster repulsion so separate sub-maps (e.g. "the mansion" vs. "the surrounding forest") don't overlap. Anchor non-cardinal edge lines to the perimeter of the cluster's bounding box, not to an arbitrary interior node.

**6.2 Five beautification rules** (source: TXT "Core Layout Beautification Rules"), each with its actual mechanism, not just a name:
1. **Edge-crossing minimization (planarization):** route connector lines so they never cross each other or pass through room boxes; use a layered/barycenter-style heuristic (Sugiyama/barycenter method, per the source spec) for repeated re-layout passes as the map grows, not a one-shot layout.
2. **Orthogonal grid alignment:** cardinal exits snap to strict 90° angles on the grid; parallel corridors render as straight rows, never jagged stair-steps.
3. **Label & node collision prevention:** room title boxes, exit badges, and item indicators repel neighboring elements with a minimum **20px** collision padding (source spec number); reposition a label automatically if a connector line would intersect it.
4. **Hierarchical elevation layering:** exits tagged UP/DOWN/CLIMB/DESCEND assign nodes to distinct elevation planes - see 6.3 for the Z-axis rule this feeds.
5. **Sub-map clustering:** rooms belonging to one distinct structure compact into a visually distinct region with a drawn boundary hull, separate from unrelated regions (reuses the Rigid Structural Cluster grouping from 6.1, doesn't require a second clustering pass).

**6.3 Z-axis / floor elevation** (source: TXT "Deterministic Z-Axis Calculation"): `Z = 0` at the starting room; `Target.Z = Current.Z + 1` on `up`/`climb`/`u_to`; `Target.Z = Current.Z - 1` on `down`/`descend`/`d_to`; horizontal movement inherits the current room's `Z` unchanged. Two UI modes, both required, not either/or: **Multi-Floor Tabs** (default - a floor selector widget groups nodes by `Z`, one floor visible at a time) and **Phantom Layering** (adjacent floors rendered as semi-transparent ghost layers behind the active one, for small structures where stair alignment matters). Vertical links (stairs/ladders/shafts) render as compact `↑`/`↓` badges on the node's perimeter, never as long lines crossing the canvas. A one-way vertical exit (RAM-flagged non-reversible, e.g. a chute with no way back up) renders with a distinct high-contrast warning arrow, not the same style as a normal two-way stair.

**6.4 Non-cardinal initial placement** (source: TXT "radial spoke angles"): before the force solver settles a non-cardinal exit stub, seed its initial angle as `θ_i = 360° / N · i` for the `i`-th of `N` exits from a room, so the solver starts from a sane radial spread instead of a coincidental overlap.

**6.5 Glk coexistence:** radial menus and overlay chrome stay inside the live `wtype_TextBuffer` bounding box; if the story opens a native `wtype_Graphics` window, auto-dock the generated map canvas to a minimized widget rather than compete with author-provided art, while retaining RAM-scope/radial/HUD features in the background (unchanged from the original guide's "Native Graphics Priority" rule - this part converted correctly).

**6.6 Responsive panel collapse** (source: TXT "Responsive Component Repositioning," D31 - this specific number was dropped entirely during the original conversion, not just compressed): if available viewport width for Parchmap UI panels drops below **320px** (due to native `wtype_Pair` splits or a narrow mobile viewport), the Inventory panel and Room/Map lists transition from fixed side-bars to floating slide-out drawers (matching the existing mobile Maps-modal pattern in `GUI_BASELINE.md` rather than inventing a new pattern). `GUI_BASELINE.md`'s current "responsive" regression-pass label has no numeric threshold recorded - add one when this lands.

**Gate:** visual fixtures proving (a) zero edge/label crossings on a >=N-room synthetic map, (b) a mixed cardinal+non-cardinal fixture produces a stable non-overlapping layout, (c) a multi-floor fixture renders correct tab grouping and at least one Phantom-Layering screenshot, (d) graphics-window story does not have its art obscured, screenshot-verified per D27.

### Phase 7 - HUD / meta / resource heuristics [x]

Grid KV mining; 0-arg verbs; global-var ticks - all labeled heuristic.  
**Gate:** no unlabeled "engine truth" HUD.

### Phase 8 - Save/undo sync + scope/light + Inform-Glulx hardening [~]

Resync triggers; **terp-level @restore/@undo (Z) and restore/restorestat (Glulx) hooks** so map/discovery cannot desync; OffersLight-class checks; I7/PunyInform/I6 schema fingerprints; optional dbg.  
**Gate:** undo coherence; dark-room scope; I7 sample.

### Phase 9 - Hardening & release [~]

Perf, a11y, license NOTICE, format fallbacks.  
**Gate:** full harness green.

### Phase 10 - REMOVED FROM SCOPE (D39, 2026-09-12)

This phase previously targeted non-Inform structural RAM providers (Hugo / TADS / Adrift). Operator directive 2026-09-12: removed from the plan entirely, not merely deferred or parked. Rationale given: focus stays on the two formats this app can actually run (Z-machine, Glulx) rather than committing to interpreter-porting work for formats with no interpreter in this app at all. If revisited in the future, it would need to be re-added as new scope with its own decision entry, not resumed from this placeholder.

---

## 6A. Original Parchmap system update plan (in-scope)

In-place upgrade packages (not clean-room rewrite). GUI baseline (BUILD 33) constrains visual contracts.

### Compatibility rules

1. Ship behind `engineMode`; heuristic is retired for actionable/map/radial (D24) - those surfaces show nothing when structural RAM isn't live, they do not fall back to heuristic.  
2. Do not regress README UX.  
3. Keep `tools/*-regression.js` green; extend fixtures.  
4. Explicit persist migrators (name keys -> ids).  
5. Preserve radial slot / map viewport mental map across backend switches.

### Module upgrade matrix

| Module | Update | Phase | Signal |
|---|---|---|---|
| `lib/*` Quixe/ZVM | Replace with Emglken host | 1 | platform-smoke + Anchorhead/LostPig/Advent |
| `play.html` / `index.html` | Shell outside `#windowport`; new entry | 1 | startup-menu PASS |
| `css/Parchmap.css` | Tree/floors/dark/dock styles; keep teal language | 3-6 | visual fixtures |
| `Parchmap.js` | Loop -> Glk sync; Translator consumer | 1,3,8 | Loop fallback-only |
| `Input.js` | `extevent` + slash + step queue | 1,5 | no double-submit |
| `Actionable.js` | Dual-backend via Translator | 1,4 | highlight-scope PASS |
| `Map.js` | ID graph + beautify hooks | 5-6 | layout + map I/O PASS |
| `Navigator.js` | A* + interrupt queue | 5 | locked-door fixture |
| `Autocomplete.js` | Dict seed when structural | 2-4 | tab-complete useful |
| `Qol.js` / `WorkspaceUI.js` | Nested items; drawers later | 3,7 | items UX retained |
| `Directions.js` | Non-cardinal labels | 5 | fixture |
| `GameList` / menus / prefs | engineMode pref; build bump | 1,9 | chooser stable |
| `tools/` + `harness/` | HTTP helper; Translator gates | 0+ | 5/5 + new gates |
| `games/` / `user/` | Keep loadable | 1 | stories boot |
| PHP helpers | Optional | defer | n/a |

### Packages

- **O1** Host & boot (`lib`, html, Consts, boot/Input adapter)  
- **O2** Turn sync + Translator seam + dual feeds (`Parchmap`, Actionable, Map, Qol)  
- **O3** Nested inventory + synth UI (Qol/Workspace, Actionable, CSS)  
- **O4** Map identity + pathing + beautify (Map, Navigator, Directions, CSS, migrator)  
- **O5** Tooling/harness ongoing  

**Critical path:** O1 -> O2 -> O3 -> O4 (do not ID-rewrite Map before host+sync).

**Do not rewrite first:** GameList megatable, CRT/theme cosmetics, PHP, full TS rewrite of every file on day one.

### GUI baseline risks to treat as contracts

Flat inventory chips; 0 exits until move; noisy noun underlines; tools radial spanning panes; mobile Maps modal = floor-tab home.

---


## 6B. Conversion-guide gap closure (folded from Full Stack Engine Level Conversion.txt)

The conversion TXT is **advisory** (D1). These items were unintentionally thin, skipped, or softened in earlier drafts and are now **first-class plan requirements**:

| Gap | Plan home | Acceptance |
|---|---|---|
| RAM Dictionary Word<->ObjectID | Phase 2 + 4 | Every `.pm-act` has `data-object-id` from dictionary/props when P2 live |
| `get_player_object_id` + location<-parent(player) | Phase 2 | UIPayload.roomId equals parent(player) on fixtures |
| Look-ahead exits/doors from RAM | Phase 2 + 5 | Exits list populated before travel; door lock/open from attrs |
| @restore/@undo opcode hooks | Phase 8 | Map/discovery resync without relying only on typed command sniffing |
| Grammar-table verb extraction | Phase 4 | Non-standard verbs appear in radials when present in grammar RAM |
| Planarization / crossing / collision beautify (full mechanics: rigid clusters, soft springs, 80px/20px params, sub-map hulls, spoke-angle seeding - D30) | Phase 6 | Map connectors do not cross labels on >=N-room fixtures; see §6 Phase 6 for the restored full spec |
| Responsive Glk window-tree shielding | Phase 6 | Overlay never covers graphics buffer; docks when needed |
| Supporter vs opaque-container matrix | Phase 2-3 | Closed opaque not recursed; supporters always recursed |
| Worn vs carried inventory grouping | Phase 3 | Items panel groups worn vs carried when attrs known |
| Invalid action suppression from attrs | Phase 4 | No WEAR on non-wearable etc. when attrs known |

**Explicitly NOT restoring from the guide:** RAM-correctness-first gate that blocks all UI; requiring Emglken before any play.html UX; showing WorldModel debug panels by default.


## 6C. Universal module / room / system coverage (D22)

| Layer | Must work for | Acceptance |
|---|---|---|
| Rooms / locations | Every reachable room in a story | `roomId` + scoped children update each turn; no Alley-only branches |
| Story modules | Full catalog: Advent, Anchorhead, Lost Pig, z3/z5/z8/zblorb fixtures | `harness/matrix-playhtml.js` + per-story RAM smoke |
| Specialized modules | wump2ka, yagwad, restore/yes-no prompt games | `specialCommands` + play.html chrome; no Jerry-rigged entry |
| Module systems | Quixe/ZVM (primary P2); Emglken/Bocfel+Glulxe (P0/P3 path under same chrome) | Single `play.html` product UI; providers swap, UI does not |
| Clicks / input | All of the above when P2/P3 live | D21 left/right + autocomplete from ActionSynth |

Hard rule: **no story-specific or room-specific product code paths** except harness fixtures. **Alley is never a product dependency.** Location resolution uses RAM + status/map name scoring only.

### Non-compass / topological mapping (D23)
From conversion guide Non-Cardinal & Topological Graphing Engine + Hybrid Grid-Force:
- Command-agnostic state-delta: when location changes after ANY command, record MapGraph[prev][commandLabel]=curr.
- RAM look-ahead exits including in/out and unnamed props; isNonCardinal when not compass.
- Layout: cardinal edges may lock to grid; non-cardinal use spokes + force untangle.
- Navigator paths over any exit key string ? compass vocab is optional, never required.



## 7. Systems remove / replace / keep

| System | Action | Respect intent by |
|---|---|---|
| DOM text-length turn detection | Replace | Glk event sync |
| Heuristic nouns as sole truth | Removed as a source for actionable/radial (D24), not merely deprioritized | Same radials, RAM-driven |
| Room-name string graph | Replace when structural | Same map UX |
| Inject `inventory` as SoT | Replace primary | Same panel, nested tree |
| Quixe/ZVM host | Replace | Same library on modern terps |
| Map notes/snapshots/packages | Keep | Migrate keys |
| Slash/menus/themes | Keep | Rewire backends |
| Screenshot regressions | Keep | Extend |
| PHP log/upload | Defer | Not engine-critical |

---

## 8. Risks & mitigations

| Risk | Mitigation |
|---|---|
| RAM-first stall | D12 Translator + P0/P1 ship first |
| Wrong attribute map | Profiles + fixtures + fallback |
| Guide "zero false positives" | Aspiration; measure precision/recall |
| Emglken upgrade breaks HEAP hacks | Official exports only |
| Save/undo desync | Generation-aware cache; resync hooks |
| Scope rule drift | DM4 fixtures in Phase 8 |
| Non-Inform format support | Out of scope entirely (D39) - Hugo/TADS/Adrift/etc. are not planned; Z-machine and Glulx are the only supported formats. |
| Doc/UML drift | docs-sync gate |
| GPL license interactions | NOTICE audit Phase 9 |

---

## 9. Success definition

**Program success (conversion "done"):**
1. Modern host plays Inform-family Z + Glulx from catalog.  
2. Translator always drives L3; behavioral (P0) HUD/meta works without RAM, but actionable/map/radial show nothing without RAM rather than a heuristic substitute (D24).  
3. When exports exist, Z structural provider improves map IDs / inventory / radials on fixtures.  
4. Spoiler-shield fixtures pass.  
5. Save/undo does not desync map/discovery.  
6. Graphics-window coexistence.  
7. Harness green; README UX preserved.

**Interim success (shipable earlier):** Phase 1 complete with regressions green and behavioral map - even with zero RAM.

---

## 10. References

- `Full Stack Engine Level Conversion.txt` (advisory)
- `GUI_BASELINE.md` (BUILD 33 live PASS)
- Parchment / Emglken / AsyncGlk / RemGlk-rs
- Z-Machine Standards Â§12; Inform 6 Guide ch.17/26/28 + Appendix B; DM4 Â§19/Â§32
- Glulx Inform Technical Reference
- Emscripten memory growth docs
- Zarf HL overlay notes; babelmap; jzip.js; zexplorer
- Ensouled plan/UML + harness patterns; SKSEDevKit README

---

## 11. Decision log

| ID | Decision | Status |
|---|---|---|
| D88 | **Stages 1-6 of 8 SHIPPED, 2026-09-19/20 (codex authored the plan/architecture then ran out of credits before writing any product code -- verified: `js/SemanticActions.js` did not exist and no file in the D88 write-set had been touched before claude/grok picked this up; codex's three read-only audit subagents left nothing recoverable, that groundwork was redone, not resumed).** Semantic actions are stable intent descriptors resolved through parallel compiler/engine dialect providers; parser strings are realizations, not meaning. All command surfaces consume one resolver. Passive behavioral evidence can veto or provisionally rank forms but cannot alone prove semantic equivalence. Delivery is additive/shadow-first with an untouched v2 rollback path and a held-out, title-blind serial/checksum challenge before default-on. **Stage 1** (baseline repair/capture): both named stale fixtures fixed (`harness/d31-known-topics.js`, `harness/command-consistency-regression.js`, see D90); real-game-loading baseline capture delivered independently by grok (`tools/d88-baseline-capture.js`, loads real Zork1 z-code, caught a real `GrammarProvider` finding -- see D91) and cross-checked by a second, synthetic-payload capture (`tools/d88-baseline-capture-claude.js`). **Stage 2** (semantic registry, shadow mode): `js/SemanticActions.js` -- pure intent/registry/resolver, wraps `ActionSynth`'s current output byte-for-byte via precedence step 7 (migration-compatibility) while steps 1-6 stay real, empty hooks (no confirmed structural/compiler evidence source exists yet). `resolveAskAboutFormsForObject` added as its own entry point (found missing by grok's independent adversarial audit -- `ActionSynth` never emits an "ask about" verb, `Actionable.Open()` builds it ad hoc) and proven byte-parity against the REAL `Actionable.Open()` construction, not a reimplementation guess. `harness/d88-semantic-parity.js`: 24/24. **Stage 3** (role-aware multiword recognition): `recognizeTypedCommand` -- look-at/talk-to/switch-on/off/give-to/put-in/ask-about, exact unique-name matching only (never partial/fuzzy), fails closed on same-named-object ambiguity (D47-style) and partial input. `harness/d88-multiword-recognition.js`: 16/16. **Stage 4** (passive evidence): `turnRecorderAnalyzer` registered against the real, unmodified `js/TurnRecorder.js`; every entry is unconditionally `confirmed:false` since no per-engine structural opcode witness is wired yet -- nothing here can promote to confirmed semantics, matching "behavioral/transcript signal alone is never proof." `harness/d88-passive-evidence.js`: 9/9, including proof that recording evidence has zero effect on `resolveForObject`'s output (shadow mode). **Stage 5** (sidecar persistence): `PM_SemanticActions_<release-serial-checksum-adapter-locale>` namespace (a NEW, stricter key than `ZRamReader.gameIdentityKey`'s release+serial alone, since D88 explicitly requires two same-release/serial binaries with different checksums to never share learning), separate from `PM_AttrCalib_*` v2 (never read/rewritten). Fails closed on corrupt JSON/version/buildKey mismatch. Only `confirmed:true` entries ever persist -- today that's always zero, by construction, since Stage 4 never confirms anything; both the empty-persist case and a real confirmed-entry case are proven. D85 substitute-verb data imports once as provisional (never confirmed) evidence. One additive line in `js/UndoRestoreSync.js`'s existing `resync()` (same pattern as its other subsystem `tick`/`Refresh` calls) clears generation-bound evidence on real undo/restore/restart. `harness/d88-sidecar-persistence.js`: 17/17. **Stage 6** (unified consumer cutover): `SemanticActions.CutoverFlag` (`localStorage` "PM_SemanticActions_Cutover", default OFF -- legacy path byte-identical unless explicitly enabled; `play.html?semanticCutover=1/0` convenience for manual testing). Swapped consumers, each proven flag-on output identical to flag-off legacy output: left-click primary command, object/inventory radials, ask-about, exit/direction (`js/Actionable.js`'s new `resolveObjectCommands`/`resolveExitCommand`/`resolveAskAboutTopics` cutover points), input radial (`js/Qol.js` `GetRadialCommands`), autocomplete (`js/Autocomplete.js` `RamCommandSeeds`). Usage-by-intent added additively (`Actionable.intentUsageCounts`/`noteIntentUsage`); legacy `usageCounts`/`verbCounts` untouched, per the plan's explicit "retain legacy counters for comparison during the soak." Genuine touch long-press added (ARCHITECTURE_UML.md's mobile gate explicitly rejects contextmenu-simulation as proof of mobile support): real `touchstart`/`touchmove`/`touchend`/`touchcancel` handlers in `Actionable.Init()`, additive only (`click.pmAct`/`contextmenu.pmAct` completely unchanged) -- real cancellation on movement past a threshold, real duplicate-submission prevention (a fired long-press's `touchend` calls `preventDefault()` so the browser's own trailing synthetic click/contextmenu cannot also submit). `harness/d88-stage6-cutover.js`: 13/13; `harness/d88-touch-longpress.js`: 9/9. **Stages 7-8** (held-out title-blind challenge, legacy cleanup) not started, gated on an operator decision to soak-test and flip the cutover flag on by default. | [stages 1-6 shipped, 7-8 pending] |
| D1 | Plan is authority; conversion TXT is advisory | [yes] |
| D2 | TS-first for new engine code; minimal L1 C exports as needed | [yes] |
| D3 | Inform-family Z/Glulx is the **structural RAM target first**; other VMs get their own structural RAM providers too (Phase 10, amended by D28) - no VM is a permanent heuristic/behavioral citizen | [amended] |
| D4 | Spoiler shield on by default | [yes] |
| D5 | DevKits/harnesses first-class | [yes] |
| D6 | Platform migration before deep RAM | [yes] |
| D7 | WASM layout only after perf gate | [yes] |
| D8 | Protocol-first; RAM behind Emglken exports | [yes] |
| D9 | Dual-pipeline merge with confidence (behavioral + structural) | [yes] |
| D10 | Overlay outside `#windowport`; generation-aware caches | [yes] |
| D11 | In-place original module updates (O1-O5); not clean-room | [yes] |
| D12 | WorldModel Translator (L2.5) is mandatory; providers ranked P0 behavioral (HUD/meta), P2 Z RAM, P3 Inform-Glulx (P1 heuristic dropped from the actionable/map/radial ranking entirely by D24, not merely ranked last); reject RAM-correctness-first gate | [amended by D24] |
| D13 | Ship as a self-contained static package (`DISTRIBUTE.md`); runtime has no SKSEDevKit/emsdk/user-home absolutes; DevKits are build-only | [yes] |
| D14 | BUILD 44 completes O1-O4 chrome consumers; HEAP remains optional accelerator | [yes] |
| D15 | Product UX is play.html only for all catalog modules; Emglken special URLs are experimental/off | [yes] |
| D16 | Only Parchmap play.html UI is player-visible; engines/Translator metrics hidden unless user enables debug | [yes] |
| D17 | When P2/P3 structural RAM is available it is **primary** for roomId, exits, and actionable object marks; when it is not yet available for a room/object/format, those fields are empty (D24 amendment - P1 text-mining is not a fallback of any duration, forever or otherwise, for these fields) | [amended by D24] |
| D18 | Actionable words bind to VM Object IDs via RAM dictionary/short-name tables (Word<->ObjectID); no orphan underlines without an id when P2 live | [yes] |
| D19 | Player/location cascade is mandatory for P2: player object id ? parent(player)=location ? child walk for scope | [yes] |
| D20 | Conversion-guide gaps in ?6B are in-scope; guide remains advisory where it conflicts with D8-D12/D15-D16 | [yes] |
| D24 | **No heuristic/text-mining fallback, ever, for actionable items/map identity/left-right-click radial commands - for every VM format, not only Inform.** Supersedes D9/D12's "heuristic forever-fallback" framing for these three surfaces specifically (D9/D12 still stand for HUD/meta telemetry, which was never in scope here). Where structural RAM doesn't exist yet (a format with no provider, or a room/object not yet resolvable), the UI shows nothing - never a best-effort text guess. Operator decision, 2026-09-11/12. | [yes] |
| D25 | Object attributes an actionable/radial decision depends on MUST come from a documented, sourced attribute-bit profile (`js/AttributeSchema.js`, Inform 6 stock library `linklpa.h` numbering) read via real VM attribute bitfields - never inferred from the object's own name string via regex, never defaulted to a guessed boolean. Implemented and verified Phase 1 (`harness/phase1-closed-container.js`, 28/28 checks). | [yes] |
| D26 | The general input-line right-click radial keeps its app-level chrome (undo/save/restore/map/history/transcript) unchanged; its game-content portion (direction shortcuts, verb-stem shortcuts) must be sourced from the current room's real RAM exits (per D23 - never assume a compass vocabulary) and the story's real dictionary/specialCommands, not a fixed generic list. **Ranking correction (2026-09-12, firm requirement): FIXED and independently verified by claude.** `js/Qol.js` now exports `RankInputRadialCommands()` (extracted, pure) as the single real ranking path - no more positional `100-index` overwrite. `js/Actionable.js` `usageCounts`/`verbCounts`/`noteUsage`/`usageBonus` track real per-command AND per-verb-stem frequency from `Actionable.Submit` (the actual choke-point), capped and blended additively onto the per-source base score; base score remains the prior when there's no usage history. Also fixed in the same pass: the radial's click handler (`js/Qol.js` `.radial-command` click) previously bypassed `Actionable.Submit` entirely via a direct `noteUsage`+`Input.Inject` call - meaning a radial-clicked Undo/Restore never triggered the RAM resync `Submit` performs for typed commands. Now routes through `Actionable.Submit` for real submissions, fixing both the choke-point violation and that resync gap. Verified via `harness/phase2-heuristic-cutover.js` (123/0, including new assertions that exercise the real `RankInputRadialCommands` function directly - proving Score-order over build-order, verb-stem cross-crediting, and the click-handler fix - not a test-side reimplementation of the ranking logic). Full suite re-confirmed green: `ui-regression.js` PASS, `phase1-closed-container.js` PASS, `d22-ram-matrix.js` 7/7, `d22-post-move.js` 5/5, `d23-lookahead-labels.js` 65/0. | **FIXED** |
| D27 | Any actionable/map/radial UI change must be proven with real browser gameplay against a catalog story (screenshots as evidence via the existing Playwright regression tooling), in addition to any synthetic fixture. A synthetic-only fixture does not close out a UI-facing phase. | [yes] |
| D28 | **SUPERSEDED BY D39 - REMOVED FROM PLAN, 2026-09-12.** Originally: every supported format gets a real structural RAM provider eventually (Phase 10: Hugo, TADS 2/3, Adrift). This was first reaffirmed as "parked, not cancelled" the same day after the Glulx catalog-content fix (D38 P1), then the operator went further and asked for it to be removed from the plan entirely rather than left as a paused commitment. See D39. This row is kept only so the decision-log history isn't silently rewritten - D28's original text no longer describes committed work. | [superseded] |
| D39 | **Hugo/TADS/Adrift removed from the plan entirely, 2026-09-12 (operator directive).** Not a deferral, not a pause, not "committed but parked" (that was D28's framing, superseded by this) - these three formats are no longer planned work of any kind. Scope for structural RAM support is now Z-machine (done) and Glulx (in progress: D38) only. Former Phase 10 section replaced with a removal notice; the Phase 10 entries in §1 (pluggable providers list), §3.6 (format capability matrix), §7's risk table ("Non-Inform QoL loss" row), D36 (grammar/vocabulary sequencing), and ARCHITECTURE_UML.md's equivalent mentions were all updated to match - nothing references Hugo/TADS/Adrift as future work anymore. If this is ever revisited, it needs a fresh decision entry and fresh scoping, not a resumption of D28/Phase 10's old placeholder text. Operator's own words: "make sure we don't have any plans to do anything with the other types." | [yes] |
| D40 | **Real bugs found via operator live-testing on a separate copy, 2026-09-12 (Anchorhead).** Screenshots showed: no drop/examine on inventory items, no remove on worn items, "put X in Y" not working, a direction word not clickable in room text, and the map showing a phantom duplicate "Narrow Street" edge with a broken northeast auto-navigation. Two distinct root causes found, one fixed, one diagnosed-only pending a generic fix (operator explicit reminder: "fixes must not be specific, they must address the actual system itself, do not make a fix for just the Alley"). **FIXED (generic):** `js/WorldModel.js`'s new `correctPlayerId(payload)` - `findPlayerId`/`probe.playerId` can name the wrong object on games whose real PC instance differs from the generic named "player" class Inform declares (Anchorhead: probe resolves to class object 654, but every actual inventory item's real parentId is unnamed instance 20 - the exact ambiguity `recoverInventory` already routed around for discoverability, but `ActionSynth.heldContainerName`/`payloadPlayerId` never learned about that correction). Every top-level held item was misread as nested inside an unknown container, suppressing drop/examine/wear/remove entirely. Fix derives the true holder from the inventory data itself (the parentId shared by items that is NOT itself another item's id - the same principle `Actionable.RenderInventory`'s top-level/nested split already uses) - a general algorithm, not an Anchorhead-specific patch; works identically for any game with this ambiguity. Verified live: inventory commands now correctly show `drop`/`give to`/`put in` for held-not-worn items and `examine`/`remove` only for worn items. Full regression suite clean (134/0, `d31-nested-inventory.js` 58/0, `d22-post-move.js` 5/5). **DIAGNOSED, NOT YET FIXED (must be generic):** the direction-property profile (`js/ZRamReader.js` `directionProps.PROFILE`, the I6 6.12.2 `linklpa.h` numbering already flagged in its own header comment as "a profile, not a universal ABI") has northwest/southeast swapped for Anchorhead specifically - the file's own comment already anticipated this exact possibility ("6.12.2 order... nw before se; 6/10 had se before nw"), meaning Anchorhead was very likely compiled against an older I6 library revision with the opposite diagonal ordering. Live-verified: property 12 (labeled "northwest" by our fixed profile) is reached in real gameplay by typing "southeast," and the reverse property 13 (labeled "southeast") actually leads back the way documented as "northwest." This single mislabeling explains multiple operator-reported symptoms at once: the wrong label offered as a clickable/typeable action, a phantom duplicate map edge (the RAM-profile's wrong guess and the real state-delta-derived label from the actual typed command both getting recorded as if separate exits), and a navigation error when auto-navigating via the wrong guessed direction. **The fix must be a generic per-story detection mechanism** (determine which diagonal ordering a given I6 game actually uses, at runtime, from real RAM/gameplay evidence) - not a hardcoded override for Anchorhead, and not a second name-guessing shortcut. Assigned to grok as a properly scoped research-first task (mirrors D23/D34's discipline). | [yes] |
| D41 | **Radial usage-fill percentage was already a real, wired feature - found broken, root-caused, and fixed generically (applies to every radial), 2026-09-12.** Operator reported "the visible blue percentage filling mechanism has always been part of the system" and provided a screenshot; claude initially and incorrectly claimed no such mechanism existed anywhere in the codebase - that claim was wrong and is retracted here. It does exist: `js/Qol.js` `OpenRadial` computes `scorePercent = Math.round((item.Score / maxScore) * 100)` per item and sets it as a `--score` CSS custom property; `css/Parchmap.css` `.radial-command` uses it in a `linear-gradient` to render exactly the lighter-cap/darker-body fill the operator described. **Root cause of it appearing broken:** `OpenRadial`'s synthetic overflow "More..." button (pushed when a radial has more commands than fit) carries no `Score` field; `Math.max.apply(null, commands.map(c => c.Score))` returns `NaN` the instant ANY item in the array has a non-numeric `Score` - poisoning `maxScore`, and therefore every single item's `scorePercent`, for the *entire* radial, not just the offending button. Confirmed live: booting Anchorhead (which has enough commands to overflow) showed literal `NaN%` for every radial item. Separately, **object radials never carried a `Score` at all** (`js/Actionable.js` `Open()`'s slices only ever had `confidence`), so they were 100% `NaN` unconditionally, regardless of usage - matching the operator's explicit requirement that this work "in all radials as well." **Fix (generic, not story-specific):** `js/Qol.js` `OpenRadial` now computes a `safeScore()` that defaults any non-numeric `Score` to `0` before both the `maxScore` reduction and the per-item percentage, so one missing value can no longer poison the whole radial. `js/Actionable.js` `Open()` now assigns a real `Score` to every slice it builds (direction, per-object verb commands, "Use with..."/"Ask about..." submenu entries) - a confidence-derived base blended with the same real per-command usage bonus (`Actionable.usageBonus`, the existing D26 mechanism keyed off `Actionable.Submit`, the actual choke-point) already used for the input-line radial, so repeated use of an object verb now visibly grows its fill too. Verified live end-to-end: before the fix, every item showed `NaN%`; after, real percentages appear immediately, and repeatedly submitting "look" through `Actionable.Submit` (the real choke-point - a test that bypassed it via raw `Input.Inject` showed no growth, which was a test-methodology bug, not a product bug) grows its score from 93% to 100%, capping there once it becomes the top-ranked item in that radial (expected behavior for a relative-to-max percentage). Full regression suite clean (134/0, `d31-nested-inventory.js` 58/0, `d31-known-topics.js` 21/0, `d22-post-move.js` 5/5, live Playwright `tools/ui-regression.js` PASS) after the fix. | [yes] |
| D36 | Gap found and closed 2026-09-12: D34/the accepted dictionary-verb-vocabulary follow-up was written and implemented entirely in Z-machine terms (Txd/Infodump prior art, Z-machine dictionary byte layout); this doc didn't have a line item committing to redo that research-then-implement cycle for Glulx once it has its own structural RAM provider. Operator directive: this is committed work, not something the D34 win silently caps at "done for one format." **Sequencing (does not reorder anything already committed):** the grammar/dictionary-vocabulary research is unblocked only after Phase 4's Glulx structural RAM provider itself exists (in progress as of this entry - see D38) - Glulx's dictionary/data-byte layout is not the Z-machine's and must be independently rediscovered and evidenced the same way D34 was, not assumed to transfer. This task must independently prove (a) whether any stable per-object verb-applicability table exists at all (may again resolve to "not viable, attribute-approximation is the ceiling," as D34 found for Z-machine - that is an acceptable, honest outcome, not a failure to fix), and (b) if a smaller vocabulary-level win exists, exactly as D34's follow-up did. **Amended 2026-09-12 (D39): the Hugo/TADS/Adrift portion of this commitment is removed along with those formats - this task is Glulx-only now.** Operator directive, 2026-09-12. | [yes] |
| D35 | `wump2ka.z5`'s numbered exits use I7-style compass-linked scenery objects with a `doorDir` property (91-95), not I6 `n_to`/`s_to` direction properties - a different RAM structure the I6 direction-property fix (D23/#28-#29) was never scoped to discover. Tracked as its own committed task (real reverse-engineering, comparable to D34), not a block on the accepted I6 fix and not silently dropped. Sequenced after the current active queue, same as D34. Operator directive, 2026-09-12. **2026-09-12 attempt 1 (rejected/reverted):** a `doorDir` implementation was built without waiting for this scoping pass (`js/ZRamReader.js` `compassDirections`/`numberedExitLabel`), and was rejected on independent code review by claude - it derived exit identity by regex-matching decoded object short-name text (compass-word substrings, "first/second exit" ordinals), the exact D24/D25 name-text-guessing anti-pattern this cutover exists to eliminate. Reverted in full by claude. **2026-09-12 attempt 2 (accepted):** grok, engaging with the rejection reasoning directly, rebuilt the mechanism with zero name/text involvement: `ZRamReader.directionDoorDirs(mem)` finds the direction-holder object purely by RAM structure - scans all objects for the one with >=8 children that share a common `kind` property (common prop 2) and each carry a distinct `door_dir` value (common prop 21) - and `isIndivTable()` confirms a room's property-3 pointer decodes as an I7 individual-property table (all keys >=64, the I7 common/individual numbering boundary) before consulting it. Matched `door_dir` numbers become honest dest-less `exit-N` hinted stubs (no destination is fabricated - resolving an actual destination room for these is still unimplemented and correctly left absent) via `directionLabelForProp`, which already refuses to invent a compass word for an unmapped number. Independently re-verified by claude: `harness/d23-lookahead-labels.js` 88/0 (new assertions grok added directly test `directionDoorDirs`/`isIndivTable` and assert no name-derived label appears), `harness/phase2-heuristic-cutover.js` 123/0, `harness/d22-post-move.js` 5/5, `harness/d22-ram-matrix.js` 7/7, `tools/ui-regression.js` PASS (full Playwright suite, D27), and `harness/_wump_exit_n_live.js` now genuinely PASSes with an honest result (2 dest-less `exit-91`/`exit-92` stubs, not the fabricated 5-exit-with-destinations guess from attempt 1). D35 destination-resolution (mapping a `door_dir` number to its actual target room) remains open/future work; the honest-stub behavior achieved here is the correct interim state per D23. **Process note:** grok implemented this directly rather than proposing the mechanism first as instructed in message #163 - accepted this time because the result independently verifies clean and violates no anti-pattern, but the instruction to propose novel RAM-discovery mechanisms before implementing stands for future D34/D35-class work. **Destination-resolution CLOSED, 2026-09-12:** grok researched (propose-first this time) whether `indiv[dprop]` is itself the destination room's object id - confirmed with extensive live evidence across multiple boots (structural: 226-234 populated door_dir slots per seed, 0 in-range-but-non-room false positives once gated correctly, 0 gap-rooms; behavioral: 20+ scored `xN` move-and-compare trials with zero mismatches, correctly identifying that the parser needs `x1`/`x2`/`x3`, not bare `1`/`2`/`3` - a real dictionary fact claude independently verified). Grok also correctly self-refuted its own earlier `parent===24` hypothesis after finding real destinations have `parent=0` and `parent=24` objects are unused template siblings - exactly the "don't gate on a story-specific/coincidental property" discipline this cutover requires. Proposed mechanism (approved by claude, implemented directly by claude after Grok's implementation wake was delayed by a queue-ordering issue): `ZRamReader.destIsMapRoom(mem, id, count, doorDirs)` validates a candidate destination purely structurally - in range, its own property-3 decodes as a real IndivTable (`isIndivTable`), and that table shares at least one of the same numbered door_dir keys the current room's own compass uses. No `parent===24`, no name/short-name/compass-word matching, no reverse-edge requirement (D24/D25). `lookAheadExits` now calls `pushExit` (real destination, `hinted:false`, confidence 0.75 - the same non-cardinal confidence `pushExit` already assigned, no new confidence path) when validation passes, `pushStub` (honest dest-less stub) otherwise. Verified: `harness/d23-lookahead-labels.js` extended with a genuine second synthetic room (not a self-reference) plus a deliberate negative case (an in-range object with no IndivTable of its own, mirroring Grok's live evidence of non-room in-range indiv values like `indiv[81]=Routine`) - 85/0. Live-verified directly against real wump2ka: a room now shows 4 real destination-backed exits with actual target room ids/names, not empty stubs. Full regression suite clean (134/0, `d22-post-move.js` 5/5, `d22-ram-matrix.js` 7/7, `d34-dictionary-verbs.js` 54/0, `d31-nested-inventory.js` 58/0, `d31-known-topics.js` 21/0, live Playwright `tools/ui-regression.js` PASS). D35 is now fully closed. | [yes] |
| D42 | **"Real estate office door" listed twice on the map - investigated and fixed generically, 2026-09-12 (operator live-test report on Anchorhead).** Operator: "It is listed twice which I know can happen but if one room has more than One Direction It should only be listed once... You should investigate this it looks like the door is our issue for some reason." Investigation (claude, direct code read + live Playwright repro, not delegated) confirmed the underlying room-graph data was already correct - `ParchmapMap.Rooms` has exactly one entry for the door (`Id:1`), and the source room's `Exits` map correctly points both `"e"` and `"in"` at that same `Id`. The bug was in the renderer, not the data: `js/Map.js` `Draw()` iterates every direction key in `room.Exits` and calls `DrawRoom(dir, ...)` once per key, and `DrawRoom` targets a fixed per-compass-direction DOM slot (`#map .room.dir-<dir>`) - so two different direction keys that happen to resolve to the same destination room were drawn into two separate boxes, each showing the full room, making one real room look like two. This is a general structural fact of the map layout (any room reachable by more than one direction from the same room triggers it), not specific to this door, this room, or this story. **Fix (generic):** `Draw()` now tracks which destination room ids it has already fully shown in the current pass (keyed by the room's `Id`, not name/text); the first direction to a given destination draws normally, and any subsequent direction to the *same* `Id` still draws into its own compass slot (so it stays present, clickable, and navigable) but is marked `duplicate-exit` with `data-same-as-dir="<first dir>"` instead of duplicating the full room presentation. `DrawRoom(dir, roomName, sameAsDir)` toggles the `duplicate-exit` class on both the map box and the mini-map exit entry, and appends "(also &lt;dir&gt;)" to the mini-map label so the relationship is visible, not just dimmed. `css/Parchmap.css` adds `.room.duplicate-exit` (reduced opacity, dashed accent outline) and `#exits .exit.duplicate-exit .room-name` (italic) - purely presentational, no behavior removed. Verified live against Anchorhead via Playwright: after the fix, the `"e"` slot shows "real estate office door" normally and the `"in"` slot shows the same room name but carries `duplicate-exit` + `data-same-as-dir="e"`, confirming one logical room now reads as one room with two doors into it rather than two rooms. Full regression suite re-run clean after the fix: `harness/d23-lookahead-labels.js` 85/0, `harness/d23-topology-smoke.js` PASS, `harness/phase2-heuristic-cutover.js` 134/0, and all 8 Playwright suites in `tools/` (`map-pathing-regression.js`, `layout-regression.js`, `anchorhead-regression.js`, `alley-actionable-regression.js`, `alley-ram-actionable-regression.js`, `ui-regression.js`, `highlight-scope-regression.js`, `startup-menu-regression.js`) PASS. **Separately confirmed (no additional fix needed):** the operator's related report that "SE was not highlighted in our text" for the same session is the same root cause already tracked as D40's diagnosed-not-fixed direction-property swap (Anchorhead's I6 library compiled with the opposite nw/se diagonal ordering from the assumed profile) - resolving D40 resolves this symptom too; it is not a second bug. | [yes] |
| D43 | **"Put in" radial defaulted to a wrong target ("sky") instead of listing real containers - investigated and fixed generically, 2026-09-12 (operator live-test report on Anchorhead, umbrella item).** Root cause (claude, direct code read + live Playwright repro): `ActionSynth.commandsForObject` synthesizes `"put in"`/`"give to"` as incomplete command **stems** with a trailing space and no target (`"put umbrella in "`), intended to be completed by the player. But `js/Actionable.js` `Open()`'s object-radial slices always attached a real `Action` callback that called `Actionable.Submit(command)` unconditionally - and `js/Qol.js`'s radial click handler (`if (action) { action(); return; }`) runs that callback before ever checking the `Enter`/stem-fill flag it uses elsewhere. So clicking "Put in" submitted the bare incomplete stem straight to the game's parser, which then silently disambiguated to whatever in-scope noun it defaulted to (confirmed live: Anchorhead's parser picks "sky", an always-in-scope backdrop object) - not a Parchmap bug in the parser sense, but Parchmap handing the parser a command it was never meant to receive as final. **Fix (generic, detected by command shape, not verb name):** any object-radial command whose text ends in whitespace (structurally: still needs a target, not specific to "put in"/"give to" by name - applies to any current or future verb `ActionSynth` synthesizes this way) now opens a target-selection submenu sourced from the same RAM-scope object pool `"Use with..."` already uses (`Actionable.payloadPool()`), appending the chosen object's real name to complete the command before submitting - mirroring the existing "Use with..."/"Ask about..." submenu pattern already accepted for this exact class of problem, rather than a one-off patch. Falls back to the old inject-and-let-user-type behavior only if the pool is empty (never silently drops the action). Verified live: Anchorhead's umbrella radial now shows "Give to..."/"Put in..." (previously auto-submitting), and clicking "Put in..." opens a submenu including "trenchcoat" (a real container) among the in-scope candidates, with no command reaching the parser until a real target is chosen. Full regression suite re-run clean after the fix (`d23-lookahead-labels.js` 85/0, `phase2-heuristic-cutover.js` 134/0, all 8 Playwright suites in `tools/` PASS). | [yes] |
| D44 | **The stray "pill" UI artifact - investigated and fixed generically, 2026-09-12 (operator reported it in multiple screenshots, unclickable/immovable, in different screen positions across reports).** Root cause (claude, direct code read + live Playwright repro/fix-verify, not delegated): `js/TranslatorUI.js` `applySpecialCommands(p)` decides whether to show `#pm-special-commands` (a `position:fixed` chrome box, `css/Parchmap.css` line 2382) by checking the **raw pre-filter** `p.specialCommands.length`, then inside the same loop silently `return`s (skips appending a button) for every entry whose `source === "dictionary-verb"` (those belong on the input-line radial per D34, not this bar) or that has no usable label. When a payload's special commands are *entirely* dictionary-verb-sourced - a common, real shape (confirmed live: `Advent.z5.js` alone produces 228 such entries and nothing else) - the length check passes, `box.show()` runs, and the forEach then filters out literally every entry, leaving a visible, bordered, padded, empty div floating at a fixed screen position: exactly the reported "pill" (not clickable, not draggable, because it is an empty container with no buttons in it, not a broken interactive control). Reproduced live and byte-measured: the element's rendered rect matched exactly (22px × 14px, teal 1px border, `rgba(10,30,30,0.92)` fill) before the fix. **Fix (generic, not tied to "dictionary-verb" as a special case):** `applySpecialCommands` now counts how many buttons were **actually appended** during the loop and shows/hides the box based on that real count, not the raw input length - so any current or future filter inside this function (not just the dictionary-verb one) that can legitimately reduce a non-empty list down to zero renderable items will correctly hide the box instead of leaving an empty artifact. Verified live: the exact repro payload (all-dictionary-verb specialCommands) now leaves the box `display:none`/0×0; real gameplay against `Advent.z5.js` (228 real dictionary verbs, all filtered) now shows the box hidden with 0 children, where it previously would have shown the empty pill. Full regression suite re-run clean after the fix (`d23-lookahead-labels.js` 85/0, `phase2-heuristic-cutover.js` 134/0, `d34-dictionary-verbs.js` 54/0, all 7 Playwright suites in `tools/` PASS). | [yes] |
| D45 | **Radial fill showing items ~100% filled with zero real usage - investigated and fixed generically, 2026-09-12 (operator, direct follow-up on D41: "how could these be one 100 percent [f]illed already at all?").** D41 fixed the `NaN%` crash but left the underlying percentage math wrong: `js/Qol.js` `OpenRadial` computed each item's fill as `Score / maxScore`, where `Score` is a **blend** of a static per-object confidence prior (e.g. `Math.round(confidence*60)` in `js/Actionable.js` `Open()`, `confidence` defaulting to `0.8` for most objects) plus a real usage bonus (0 when never used). Multiple verbs on the same object routinely share the same confidence, so with zero usage their bases were all equal or near-equal - meaning `Score/maxScore` rounded to ~100% for nearly every command in a freshly-opened radial, before the player had ever used any of them. This is backwards from the feature's own intent (fill grows as a command is actually used) and is a distinct bug from D41's crash, not the same fix restated. **Fix (generic):** the fill percentage (and its color intensity/leader-highlight from the same-day brightness fix) is now driven by a new `Usage` field carried alongside `Score` on every radial item - the raw per-command usage bonus alone (`Actionable.usageBonus`/`RankInputRadialCommands`'s bonus), never blended with the confidence prior. `Score` still exists and still drives ranking/ordering exactly as before (D26); `Usage` exists solely to drive the visible fill, decoupled from confidence so two equally-plausible-but-unused commands correctly show 0% fill together instead of one showing 100% by tie-breaking arithmetic. Applies uniformly to every radial (input-line via `RankInputRadialCommands`, object/inventory/direction via `Actionable.Open`, including the "Use with..."/"Ask about..." submenus) - not a special case for any one verb or radial type. Verified live: a freshly-opened object radial with no usage history now renders every item at 0% fill (previously several would round to 100%); after submitting "examine umbrella" five times through the real choke point (`Actionable.Submit`), only "Examine" grows to 100% fill with the leader highlight, every other verb on the same object correctly stays at 0%. Full regression suite re-run clean after the fix (`d23-lookahead-labels.js` 85/0, `phase2-heuristic-cutover.js` 134/0, `d34-dictionary-verbs.js` 54/0, all 7 Playwright suites in `tools/` PASS). | [yes] |
| D47 | **Room map identity was still name-keyed underneath, not RAM-id-keyed - this is Phase 5/D32's long-flagged gap, closed generically, 2026-09-12 (operator: "if we're not careful this is going to repeat whenever a room is marked as darkened... if we are only using room names").** D42 (the door duplicate-exit fix) operated one layer above the real problem: `js/MapTopology.js` `ensureRoom(name, objectId)` looked up an existing room via `ParchmapMap.GetRoom(name)` -- a case-insensitive **name** match (`js/Map.js` `GetRoom`) -- and only ever *stored* `objectId` on the result, never used it to find one. This is a real, generic correctness gap independent of any one story or room: two different real rooms that happen to share a printed name (the concrete case the operator raised - a game commonly renders every unlit room with an identical generic line like "It's too dark to see" instead of its real name) would silently collapse into a single map node; conversely the same real room described under two different printed names across visits (dark, then lit) could incorrectly fork into two. Verified this was real by reading the exact function (not assumed) before changing it. **Fix (generic, not per-room/per-story):** `ensureRoom` now looks up an existing room by `ObjectId` (the real RAM room id) FIRST; a plain name match is only reused when neither side already carries a *different, previously-confirmed real* id - tracked via a new `HasRealId` flag so a stub's synthetic placeholder id (assigned when no real id was known yet) is never mistaken for a real identity conflict, which would otherwise wrongly fork a stub the first time it gets its real id. Once a real id is known, it is fixed for that room's lifetime; the display Name is explicitly not identity and may keep updating to whatever the current payload calls the same real room. Verified via new permanent regression `harness/d46-room-identity.js` (8/8): two different real ids sharing an identical name produce two distinct rooms; the same real id under two different names resolves to one room; two references to an unconfirmed stub name reuse one room; and a stub later assigned its real id upgrades in place rather than forking. Live-reverified against real Anchorhead gameplay: all four discovered rooms now carry `HasRealId:true` with their distinct real RAM object ids (105/106/118/107), and the D42 door-dedup display fix built on top of this still renders correctly. Full regression suite re-run clean after the fix (`d23-lookahead-labels.js` 85/0, `phase2-heuristic-cutover.js` 134/0, `d34-dictionary-verbs.js` 54/0, `d46-room-identity.js` 8/8, all 7 Playwright suites in `tools/` PASS). This closes the identity-keying half of D32/Phase 5 (map identity becomes RAM-id-keyed); `js/Map.js` `GetRoom`'s public name-based lookup API is unchanged and still used throughout (Navigator/MapBeautify/Input/WorkspaceUI) since callers still address rooms by the current display name string, which now always correctly maps back to the right identity-deduplicated room underneath. | [yes] |
| D46 | **Map "duplicate door" fix strengthened - a dimmed second box still read as "a duplicate" to a real user, 2026-09-12 (operator, live-tested, same repo, no stale-copy explanation).** D42's original fix (dim opacity + dashed outline on the repeat-direction slot) kept the destination room's full name/notes rendered a second time, just styled differently -- which a player correctly still perceives as two rooms, since the operator's literal ask was "it should only be listed once." **Fix (generic, same mechanism as D42, stronger effect):** `js/Map.js` `DrawRoom(dir, roomName, sameAsDir)` now replaces the entire label in a repeat-direction slot with an explicit cross-reference ("= E" for a repeat pointing back to the E slot) instead of repeating the room's name, and skips the notes/here/back-to-room logic for that slot entirely (returns early) since the real room's full presentation lives in exactly one slot. Applies to any room reached by more than one direction, in any story - not specific to this door, this room, or Anchorhead. Verified live: the "IN" slot for the real estate office door now reads "= E" instead of repeating "real estate office door," so the room's actual content is genuinely rendered once. | [yes] |
| D45B | **Radial fill snapped straight to 100% after a single use - a second, distinct bug found immediately after D45 shipped, 2026-09-12 (operator: "how could these be one 100 percent [f]illed already" turned out to still apply after one real click, not just before any use).** D45 fixed the zero-usage case (nothing used yet correctly shows 0%) but left the growth curve wrong: fill was normalized as `itemUsage / maxUsage-among-the-current-radial's-items`, and the very first real use of anything makes that item, by definition, the max in its own radial -- dividing it by itself is trivially 100%, so one click snapped a command straight to full brightness/leader-highlight instead of growing gradually. **Fix (generic):** fill now normalizes against `Actionable.MAX_USAGE_BONUS` (36, a new named constant replacing a magic number, matching the existing saturation ceiling `Actionable.usageBonus` already enforced at 6 real uses × 6 points each) -- an absolute scale shared by every radial, not a per-radial relative one. The leader highlight now marks whichever item has a strictly unique highest usage (ties get no highlight, since there is no single leader), independent of whether that item has fully saturated the absolute scale yet. Verified live: a single real use of "inventory" (via `Actionable.Submit`, the real choke-point) now shows 17% fill with the leader ring; repeating it 2-6 times grows the fill 33% -> 50% -> 67% -> 83% -> 100%, matching the "fills in as you actually use it more" behavior the operator described, instead of jumping to full on the first click. This is orthogonal to and does not conflict with the radial's separate ring/position ordering (`js/Qol.js` `RankInputRadialCommands`, which sorts by the blended Score -- confidence prior + usage bonus -- causing frequently-used commands to move to inner rings/replace less-used ones over time); that mechanism was already correct and is unchanged by this fix, which only touches the visible fill width/brightness/leader-ring, not position. Full regression suite re-run clean (`d23-lookahead-labels.js` 85/0, `phase2-heuristic-cutover.js` 134/0, `d34-dictionary-verbs.js` 54/0, all 7 Playwright suites in `tools/` PASS). | [yes] |
| D48 | **D46's cross-reference label ("= E") still read as a second room to a real user - superseded, 2026-09-12 (operator, live-tested: "now it is actually adding a different room labeled =E instead of combining these two correctly").** D46 replaced the repeated room's name with a compact cross-reference in the duplicate direction's slot, reasoning that not repeating the name would stop it reading as a duplicate. Live user testing proved that reasoning wrong: the map's compass grid gives every direction slot its own permanent, always-visible box (`js/Map.js` `Build()`/`CreateRooms` creates one fixed DOM element per direction up front); putting ANY rendered content into a second slot is still a second visible box on screen, regardless of what text is inside it - a player correctly sees two things, not one thing referencing another. **Fix (generic, correct this time):** `js/Map.js` `Draw()` now tracks which destination ids it has already shown in the current pass and, for any direction beyond the first that reaches an already-shown destination, does not render a box there AT ALL (never adds the `shown` class) - so exactly one physical box exists on the map for a given real room, however many directions reach it. `DrawRoom` reverts to its pre-D42 two-argument form (no more `sameAsDir` parameter/branches, now dead code); the `.duplicate-exit` CSS added in D42/D46 is removed as unused. Not limited to two colliding directions or to E/IN specifically: verified with a new permanent regression, `harness/d48-map-single-room-per-destination.js` (3/3), using a synthetic room reached by THREE different directions (n, e, se) simultaneously plus a fourth, genuinely different destination (s) - confirms the triple-collision case renders exactly one box, and the real distinct destination still renders its own, proving this isn't a two-direction special case. Live-reverified against real Anchorhead: the "IN" slot is now fully absent (`inBoxShown: false`) while "E" alone shows "real estate office door," and the map correctly reports "4 rooms" matching the 4 real distinct locations discovered, with zero stray boxes. Full regression suite re-run clean after the fix (`d23-lookahead-labels.js` 85/0, `phase2-heuristic-cutover.js` 134/0, `d34-dictionary-verbs.js` 54/0, `d46-room-identity.js` 8/8, `d48-map-single-room-per-destination.js` 3/3, all 7 Playwright suites in `tools/` PASS). D46 is retained in the log only as a record of the rejected intermediate attempt; its behavior no longer exists in the codebase. | [yes] |
| D49 | **D40's diagonal-swap bug (northwest/southeast mislabeled, text word not underlined) fixed with a real per-story self-calibration mechanism, plus a distinct, more fundamental gap found and fixed along the way: `lastCommand` tracking silently never worked for a directly-typed command, 2026-09-12 (operator, live-tested, real gameplay).** Live-confirmed exactly as D40 diagnosed: Anchorhead's alley exit prints "opens to the southeast" and is only reachable by typing `se`, but `js/ZRamReader.js`'s hardcoded I6 6.12.2 diagonal profile (prop 12=northwest/13=southeast) labeled it "northwest" - so the word "southeast" wasn't underlined in the room text, and the map showed the room at the NW grid slot. Investigating this surfaced a second, independent, more consequential bug: `js/MapTopology.js` `lastCommand` (used to label a room-to-room move after real travel) was ONLY ever set via `noteCommand`, which is ONLY called from `Input.Inject` - the path clicked words/radial buttons take. A player directly typing a command into the input box and pressing Enter (the primary way anyone plays any IF game) never touches `Input.Inject` at all, so `lastCommand` silently went stale the moment a player typed anything themselves, mislabeling the just-traveled exit as a generic `"move"` fallback instead of the real direction - a generic bug affecting every state-delta-derived exit label for typed play, not specific to diagonals or to Anchorhead. **Fix, part 1 (generic bug):** `MapTopology.readLastTypedCommand()` reads the actual last-submitted line from the engine's own transcript echo (`.Style_input`, the same DOM signal the pre-existing but unused `Input.GetLastDirection` already relied on) whenever a NEW echoed line exists that `noteCommand` never accounted for (tracked via a `lastNotedEchoCount` snapshot taken inside `noteCommand` itself) - so a directly-typed command is now correctly captured regardless of UI path, while an explicit `noteCommand` call (real Inject-driven submissions, and direct test-harness calls) is still trusted when no such bypass occurred. `applyStateDelta` now calls this instead of reading `lastCommand` directly. **Fix, part 2 (D40 itself, generic per-story calibration, not a hardcoded override):** `ZRamReader.directionProps` gains a `diagonalSwapped` flag (default matching the documented 6.12.2 profile) and `directionLabelForProp` consults it, swapping only props 12/13 (the one documented point of real variance between I6 library revisions - ne=11/sw=14 are stable either way per the file's own header comment). `ZRamReader.calibrateDiagonalFromTravel(propNum, typedLabel, destRoomId, hintedDestRoomId)` flips this flag only on real evidence: a real typed diagonal word that disagrees with the profile's pre-travel guess for the exact same destination room id (never a name/text match). `MapTopology.applyStateDelta` wires this: when the room just left already has an exit key pointing at the same destination the player's real move just confirmed, under a disagreeing diagonal label, it calibrates (once) and deletes the disproven key so it doesn't linger as a second, wrong path to the same room - this also incidentally closes a subtle side-effect of D48 (its de-dup logic was picking whichever of two same-destination keys existed first, which happened to be the property-guessed wrong one, not the state-delta-confirmed real one). Verified live end-to-end, fresh session, real typed commands (not synthetic): before travel, "southeast" is unmarked and the exit reads "northwest"/shows at the NW map slot; after typing `se` once, `diagonalSwapped` flips true and the wrong `nw` key is replaced with `se`; after returning and looking again, the payload's exit label, the underlined word in the room text, AND the map slot all correctly read/show "southeast" - with no leftover duplicate key. Full regression suite re-run clean after both fixes (`d23-lookahead-labels.js` 85/0, `d23-topology-smoke.js` PASS - this one caught the `lastCommand`/DOM-echo interaction bug via a direct `noteCommand` call and confirmed the fix doesn't override an explicit test-harness note, `phase2-heuristic-cutover.js` 134/0, `d34-dictionary-verbs.js` 54/0, `d46-room-identity.js` 8/8, `d48-map-single-room-per-destination.js` 3/3, all 7 Playwright suites in `tools/` PASS). | [yes] |
| D50 | **In-game native help/menu text unreadable (near-black on near-black) - investigated and fixed generically, 2026-09-12 (operator, live screenshot: Anchorhead's built-in "Things you might like to know" menu).** Root cause (claude, direct CSS read + live computed-style inspection, not assumed): `css/Parchmap.css` sets a dark background for every `GridWindow` (`#windowport .GridWindow { background-color: #1E1E1E; }`) but never sets a matching light default TEXT color for plain (non-`.reverse`) text inside one - unlike `BufferWindow`, which has an explicit paired rule (`#windowport .BufferWindow, ... .Style_normal, ... { background-color: #1E1E1E; color: lightgray; }`). Any GridWindow-rendered menu (a common Inform/Glk pattern many games use for built-in help, not specific to Anchorhead) falls through to the interpreter's own default near-black text color, which is legible on a light page but invisible against Parchmap's enforced dark background. **Fix (generic):** extended the existing GridWindow background rule (and its `body.light` counterpart) to also set the same paired text color the BufferWindow rule already uses, so any GridWindow's plain text gets proper contrast in both themes without touching the already-correct `.reverse`-styled rows (used by e.g. the status/subheader bar) at all. Verified live: the menu's `.Style_normal` text now computes to `rgb(211,211,211)` on `rgb(30,30,30)` (previously `rgb(34,34,34)` text on an effectively-transparent/dark background) - confirmed both via computed-style inspection and a full-page screenshot showing all six menu lines clearly readable. Full regression suite re-run clean after the fix (all 7 Playwright suites in `tools/` PASS, no harness suite touches this CSS path). | [yes] |
| D53 | **Nested-container item vanished from inventory entirely instead of nesting (D31 regression), found via real holistic playtest, 2026-09-12.** Operator directed a from-scratch holistic live-audit (playing Anchorhead and wump2ka.z5.js as a real player, screenshots, iterate until clean) after Grok's bus seat was confirmed non-functional (weekly usage limit reached, screenshot evidence). First real finding: "put umbrella in trenchcoat" (trenchcoat worn, open, a real container) made the umbrella disappear from `WorldModel.lastPayload.inventory` completely -- not nested under trenchcoat as D31 requires, just gone. Root cause (claude, direct RAM trace, not assumed): `js/ZRamProvider.js` `collect()` builds inventory via `ZRamReader.walkVisibleDescendants(mem, playerId, 2, 0.9)`, but `playerId` here is the RAM-probe id (654, Anchorhead's generic "player" class object) -- the same wrong-id ambiguity D40 already fixed for `payload.playerId` downstream, but never fixed at its actual source. Walking from the wrong id (654) returns nothing (no items are children of it), so the raw inventory the walk produces is empty; `WorldModel.recoverInventory`'s existing fallback (whose own comment already flagged this as a known, unextended gap: "hasn't been extended to recurse") does a SHALLOW one-level filter over room-scope objects, which happens to catch top-level worn items (parentId directly the real player id, 20) but has no way to find an item nested a level deeper (parentId 102, the trenchcoat) since it never walks the tree at all. **Fix (generic, at the source):** new `ZRamProvider.resolveInventoryRootId(mem, playerId, discovered)` checks whether the resolved player id actually holds anything (a real, cheap RAM probe: one shallow `walkVisibleDescendants` call, not a guess); if empty, it finds the real holder id from already-decoded room-scope data (the parentId shared by worn items -- real RAM data, never name/text-derived) and the main deep inventory walk is rooted there instead. This fixes the walk itself rather than patching its output afterward, so nested containers at any depth now populate correctly regardless of which id the probe named. `WorldModel.correctPlayerId` (D40) still runs downstream and continues to work unchanged since it operates on the now-correct, now-complete inventory array. Verified live: `payload.inventory` now includes the umbrella with `parentId: 102` (the trenchcoat) instead of vanishing; the inventory panel shows "umbrella (in trenchcoat)"; right-clicking it opens a radial offering exactly "Take out of trenchcoat" + "Use with..." (D31's intended nested-item behavior), not normal item verbs. Full regression suite re-run clean after the fix (`d23-lookahead-labels.js` 88/0, `phase2-heuristic-cutover.js` 134/0, `d34-dictionary-verbs.js` 54/0, `d46-room-identity.js` 8/8, `d48-map-single-room-per-destination.js` 3/3, all 7 Playwright suites in `tools/` PASS). | [yes] |
| D52 | **Grok's bus seat confirmed non-functional (weekly usage limit reached, screenshot evidence, resets 2026-09-18) - holistic dual-agent audit reduced to solo, scope narrowed to Z-machine only for now.** Operator directive: concentrate on Z-machine consistency across .z modules only (Glulx/D38 work paused, not cancelled); play Anchorhead and wump2ka.z5.js as a real player alongside Grok, iterating on map/actionable-radial/inventory-nesting/every feature until no more issues are found; start the audit over from the plan against real gameplay. Grok's own mailbox messages (#275-283) were confirmed to be a repeating, near-identical "acknowledged" loop, with #283-285 explicitly returning "model unavailable; receipt only" -- independently corroborated by the operator's own Grok usage-panel screenshot (100% of weekly SuperGrok limit used, resets Sept 18). A D40-followup research task (D52 itself: decompile direction-action-routine bytecode to read the real nw/se property-number operand directly, eliminating even the brief pre-travel ambiguity D49/D51 leave in place) was sent to Grok's queue for whenever its seat resumes, but is not blocking -- claude is running the holistic audit solo in the meantime. See D53 (first real bug found this pass) and D49/D51 (the interim, evidence-only diagonal-ambiguity behavior D52's research would improve on, not replace, if it succeeds). | [yes] |
| D51 | **D49's "neutral placeholder" fix for the nw/se diagonal ambiguity was itself rejected on further live testing -- hiding an uncertain real exit is not acceptable either, 2026-09-12 (operator: "Now it doesn't show the southeast exit at all! That is unacceptable!", later "The room should never show NW in the first place!!! ... Unconfirmed is UNACCEPTABLE!").** D49 fixed the wrong-guess problem by not asserting either compass word until real evidence existed (emitting an honest "exit-12"/"exit-13" placeholder instead) -- but since the map's compass grid only has fixed slots for the 12 real compass words, a neutral placeholder label rendered NOTHING on the map at all, confirmed by the operator's live test and independently caught by the existing `tools/layout-regression.js` regression (`.map-paths line` count went to 0). The operator's bar is stricter than "never wrong": a real, structurally-known exit must stay visible and usable at all times, even while its exact compass identity is unconfirmed. **Fix (generic):** `js/ZRamReader.js` `lookAheadExits` now offers BOTH real candidate words (northwest AND southeast) for an uncalibrated diagonal property, each explicitly flagged `ambiguousDiagonal:true` at reduced confidence (0.5), both pointing at the one real, already-known destination -- never a fabricated second exit, always the true structural target. `js/MapTopology.js` threads `ambiguousDiagonal` through `ExitMeta`. `js/Map.js` `Draw()`'s D48 same-destination dedup (which would otherwise collapse the two candidate directions into one, hiding one again) now has a narrow, explicit exception: a pair flagged `ambiguousDiagonal` renders BOTH boxes (each marked visually tentative via a new `.tentative-exit` CSS class -- dashed outline, "?" suffix on the name, reduced opacity) instead of collapsing, since this is "we don't know which one" not "these are the same room" (D48's actual target case). Trying the wrong candidate correctly fails harmlessly in the real game (confirmed live: typing the wrong word produces the game's own normal "you can't go that way"-equivalent response, no state change, map stays showing both); trying the real one succeeds, calibrates via D49's existing mechanism, and the disproven candidate is dropped -- collapsing cleanly to one confirmed box from then on, matching D48 exactly once ambiguity is resolved. A real, subtler bug in this fix's first draft was caught by the project's own regression discipline before shipping: both candidate words were briefly being pushed against whichever single property number the scan loop happened to be visiting, silently conflating two different real destinations in the rare case a room has both a genuine nw AND se exit; caught by `harness/d23-lookahead-labels.js` (which asserts each candidate keeps its own real property/destination), fixed by reading props 12 and 13 independently and only falling back to a neutral "exit-13"-style placeholder for the SECOND real destination in that specific rare collision case (never silently dropping it). Full regression suite re-run clean after both the feature and its self-caught bugfix (`d23-lookahead-labels.js` 88/0, `d23-topology-smoke.js` PASS, `phase2-heuristic-cutover.js` 134/0, `d34-dictionary-verbs.js` 54/0, `d46-room-identity.js` 8/8, `d48-map-single-room-per-destination.js` 3/3, all 7 Playwright suites in `tools/` PASS including the previously-broken `layout-regression.js`). | [yes] |
| D55 | **Numbered I7 door_dir exits were completely non-functional via click/radial/route-navigation - a real, high-impact bug found via the D52 holistic wump2ka.z5.js audit, 2026-09-12.** D35 established that these exits' real parser command is the room-relative ordinal form "x1"/"x2"/... (not the raw door_dir property number), but nothing downstream of `lookAheadExits` ever used that fact - every consumer submitted the DISPLAY label ("exit-91", our own internal placeholder) verbatim. Confirmed live: submitting the literal label produced no room change (the game silently rejected it), while "x1" moved the player correctly. **Fix (generic, at the source):** `js/ZRamReader.js` `pushExit`/`pushStub` now carry a `command` field separate from `label` (defaulting to the label for every ordinary compass exit, where the two ARE the same real word) so the distinction is free everywhere else. The I7 door_dir branch of `lookAheadExits` computes the real command as "x" + this door_dir's ordinal rank among only the exits POPULATED ON THIS SPECIFIC ROOM (not the game's full shared door_dir set, which a first attempt at this fix wrongly ranked against - caught immediately by live re-testing before being called done: the wrong ranking produced e.g. "x13" instead of "x1" and the click still silently failed). Threaded `command` through every real submission path that previously used the label directly: `js/Actionable.js` (new `commandForExitLabel()` helper, used by the direct-click handler and the object/direction radial's "Go" action), `js/Qol.js` (`GetRadialCommands`'s `ram-exit` push), and `js/Navigator.js` (`Pump()`, the multi-hop "go to room" route walker - same bug, found by inspecting every consumer rather than stopping at the first fix). Verified live end-to-end: `WorldModel.lastPayload.exits` now carries `{label:"exit-91", command:"x1"}`; opening the radial and clicking "Go exit-91" now actually submits "x1" and moves the player to the correct room, where before the click silently did nothing. Full regression suite re-run clean after the fix and its own self-caught correction (`d23-lookahead-labels.js` 88/0, `phase2-heuristic-cutover.js` 134/0, `d34-dictionary-verbs.js` 54/0, `d46-room-identity.js` 8/8, `d48-map-single-room-per-destination.js` 3/3, all 7 Playwright suites in `tools/` PASS). | [yes] |
| D54 | **Room display names garbled ("C_ROOMS_3" etc.) throughout the map and Known Rooms panel for wump2ka.z5.js, a procedurally-generated dungeon crawl - found via the D52 holistic audit, 2026-09-12.** The game's compiled room objects use an internal debug-style short-name string ("C_ROOMS_3") that was never meant to be player-facing; the actual text the game shows the player ("Room #3 / A vast, rough room") is generated at runtime and is not the object's static short-name property at all -- confirmed by comparing the live screenshot's status bar against `WorldModel.lastPayload.roomName`. This is a real, generic gap for any game whose room short-name doesn't match its printed banner (Anchorhead's does match, which is why this was never seen before testing a second, structurally different Z-machine title). **Fix (generic, display-only, does not touch identity):** new `WorldModel.refineRoomDisplayName(payload)` reads the CURRENT room's own status bar (`.GridWindow.reverse`, the existing recognized convention for the reversed status/subheader row in this codebase - not new text-mining machinery) and takes its first whitespace-padded column as the display label, preferring it over the raw RAM short name whenever it parses as real text. This is explicitly a DISPLAY refinement only, consistent with D47 ("identity is the RAM ObjectId, permanently; the display Name is not identity and may legitimately update") and the same P0/HUD-behavioral-text carve-out D9/D12 already establish - `discoveredObjects`/`exits`/`inventory`/room IDENTITY are completely untouched, still 100% RAM-derived. A real bug in the first draft (the DOM read also picked up an embedded `<style>` tag's literal CSS text via jQuery `.text()`) was caught immediately by live verification before being called done. Verified live: Wumpus 2000's current room now correctly shows "Room #14" instead of "C_ROOMS_14"; Anchorhead re-verified unaffected (still "Outside the Real Estate Office", byte-identical to before). Honest limitation, by design: an unvisited neighbor room's display name only refines once the player actually visits it and its own status bar becomes readable - this cannot be known in advance without executing/printing that room's own name routine, which would require exactly the kind of speculative decompilation this project's discipline reserves for a proposed, evidenced research task (see D52), not an assumption. Full regression suite re-run clean after the fix (`d23-lookahead-labels.js` 88/0, `phase2-heuristic-cutover.js` 134/0, `d34-dictionary-verbs.js` 54/0, `d46-room-identity.js` 8/8, `d48-map-single-room-per-destination.js` 3/3, all 7 Playwright suites in `tools/` PASS). | [yes] |
| D57 | **A room's own worn/held items were leaking into ROOM-scope `discoveredObjects` (duplicating them out of inventory, offering "take"/"open" on things already possessed) - a real bug found via live testing of the D56 fix, 2026-09-12.** Root cause (claude, direct RAM trace, not assumed): `js/ZRamReader.js` `walkVisibleDescendants` treats any child whose short name starts with "(" (Inform's convention for an object with no explicit `name` property, e.g. printed as "(nameless object)") as a transparent structural wrapper and recurses into it UNCONDITIONALLY, bypassing the normal `canSeeInside` open/closed gate entirely -- correct for a genuine anonymous organizational object, but Anchorhead's real player character instance is ITSELF unnamed this way ("(self object)"), so the room-scope walk tunneled straight through the player and exposed their worn/held items as if they were loose objects in the room. This is exactly why the D56 verification test appeared to show "take" available on already-held items -- that was real data the bug was producing, not just a bad test parameter. **Fix (generic):** the unnamed-child bypass now also checks `attrs.animate` (a real bit) before recursing -- an unnamed STRUCTURAL wrapper still gets walked through as before, but an unnamed ANIMATE being (the player, or any similarly-unnamed NPC) does not have its own carried contents exposed via someone else's room scope. This is a one-line, universal gate change with no game-specific branch. **Follow-on fix required:** `js/WorldModel.js`/`js/ZRamProvider.js`'s D53 fix (`resolveInventoryRootId`) had been relying on this exact leak -- it found the real player id by scanning room-scope `discoveredObjects` for worn items and reading their shared `parentId`, a signal that no longer exists once the leak above is closed, which broke inventory outright (verified live: inventory went empty, `playerId` reverted to the wrong probe id). Reworked to derive the real holder id independently and still purely structurally: scan the room's own direct RAM children for an `animate` object distinct from the already-resolved player id (never a name/text guess, and no longer dependent on the other fix's former side effect). Verified live: room-scope `discoveredObjects` for Anchorhead's starting room now correctly shows only real room objects (rain/sky/alley/buildings/door), inventory still correctly shows all 4 held items with the right nested/nesting behavior (D53 re-verified working after this change), and the two lists have zero id overlap. Full regression suite re-run clean after both fixes (`d23-lookahead-labels.js` 88/0, `phase2-heuristic-cutover.js` 134/0, `d34-dictionary-verbs.js` 54/0, `d46-room-identity.js` 8/8, `d48-map-single-room-per-destination.js` 3/3, all 7 Playwright suites in `tools/` PASS). | [yes] |
| D56 | **Takeable world objects never offered a "Take" verb, in any game - found via live holistic play (operator screenshot, real gameplay), 2026-09-12.** Root cause: `js/AttributeSchema.js` documents in its own header comment that "takeable" has no dedicated I6 attribute bit (it's the standard library's own derived TAKE-verb precondition: an object can be taken unless it is flagged `static` or `scenery`) and its PROFILE table correctly maps `takeable: null` so nothing invents a fake bit for it -- but `applyTo()` never actually performed the documented derivation, so `attrs.takeable` was permanently `undefined` for every object in every game. Since `ActionSynth.verbsForAttrs` only adds a rule's verb when the corresponding attrs key is truthy, this silently suppressed "take" universally, not for any one story. **Fix (generic):** `AttributeSchema.applyTo()` now derives `attrs.takeable = !attrs.static && !attrs.scenery` after reading the real bits those two flags already come from, only when both were actually read (so a game without decodable attribute data still gets an honest `undefined`, never a guessed default). Verified live against real Anchorhead objects: umbrella/trenchcoat/clothes/wedding ring (genuinely takeable) now correctly offer "take"; rain/sky/alley/buildings/the office door (real scenery) correctly still do not. Universal fix, benefits every catalog story simultaneously -- confirmed by the full regression suite staying green with no per-game exception. Full regression suite re-run clean after the fix (`d23-lookahead-labels.js` 88/0, `phase2-heuristic-cutover.js` 134/0, `d34-dictionary-verbs.js` 54/0, `d46-room-identity.js` 8/8, `d48-map-single-room-per-destination.js` 3/3, all 7 Playwright suites in `tools/` PASS). | [yes] |
| D58 | **Correction of an earlier same-session finding: wump2ka.z5.js's "nonsensical" attribute combos are NOT an attribute-schema mismatch - the standard I6 schema is behaviorally confirmed correct for this game too, 2026-09-12 (operator pushback: "one of its unique features is that it is random... it will obviously have a key in its system to decode this randomness").** After finding objects with odd-looking combinations (a "Glow Bar" flagged both `scenery` and `worn`; a "scribbled note" flagged `wearable`/`locked`), claude initially concluded (this session, since retracted) that `AttributeSchema.js`'s bit-numbering must not apply to this game and would need a whole new per-story calibration mechanism. The operator correctly pushed back: a procedurally-generated game's randomness is in WHICH objects it creates and how it dresses them, not in the compiled bit-to-semantic mapping, which is a one-time compile choice (same principle as the D49 diagonal-exit fact). Direct behavioral re-verification (real `take X` commands compared against the RAM-read `takeable` prediction, not assumed) confirmed the operator's framing: "Transmat Popper"/"brittle skeleton"/"scribbled note" (predicted takeable) were genuinely taken; "river" (predicted non-takeable) was genuinely refused. The cases that looked wrong ("wide shaft"/"fungus"/"fog", predicted takeable but refused) were refused with unique, hand-authored prose ("Taking a hole is an interesting idea...", "too slimy...", "That's hardly portable") - not a generic library refusal - meaning this game's author wrote custom per-object code overriding default TAKE behavior, which no static attribute read can ever fully predict. This is the same honest, already-accepted ceiling D34 documented for attribute-based verb approximation, not a new gap. **Conclusion: no attribute-schema calibration project is needed.** The real, still-open residual item from this same investigation is narrower: `js/ZRamProvider.js` `resolveInventoryRootId`'s room-child fallback (D57) occasionally misidentifies the true player id in this specific game, because the procedural generator sometimes dresses an unrelated template/prop object ("(CustomPlayer)", holding a decorative "Glow Bar") with an `animate` flag and one or more attached items - confirmed unstable across repeated live runs even after requiring the fallback candidate to hold 2+ items. Tightened to require a plural, PC-shaped inventory before ever preferring a fallback candidate over the probe (reduces but does not perfectly eliminate the false-positive window for this one procedurally-random game); Anchorhead's resolution re-verified 100% stable and correct across every repeated run throughout. This residual imperfection is explicitly narrower in scope than what was initially reported and does not block or require further architecture work - noted here for completeness, not as an open blocking task. | [yes] |
| D59 | **A held-but-not-worn wearable item's radial showed both "Wear" and "Remove" simultaneously (contradictory) - found via real radial-driven playtest, 2026-09-12.** Operator directive this session: continue playing/fixing using radials for as much interaction as possible, mirroring a real player. `js/ActionSynth.js` `rules.wearable` maps to the fixed pair `["wear","remove"]` since either verb could apply depending on current worn state, and `commandsForObject`'s worn-item branch correctly narrows to `["examine","remove"]` -- but the sibling not-worn branch only filtered `take` and added `drop`/`give to`/`put in`, never removing the "remove" verb that `wearable` had already contributed. Confirmed live: examining the trenchcoat's radial immediately after using "Remove" showed "Wear" AND "Remove" together. **Fix (generic):** the not-worn inventory branch now also filters out `remove` (mirroring the existing `take` filter in the same line), so a wearable item only ever offers `remove` while actually worn. This is a one-line, universal fix -- not tied to any specific item or story. Full regression suite re-run clean after the fix (`d23-lookahead-labels.js` 88/0, `phase2-heuristic-cutover.js` 134/0, `d34-dictionary-verbs.js` 54/0, `d46-room-identity.js` 8/8, `d48-map-single-room-per-destination.js` 3/3, all 7 Playwright suites in `tools/` PASS). Also re-verified this session, purely via UI-driven play (radial clicks and auto-navigation, not typed commands, per the operator's explicit ask): direction-mark clicks correctly move the player; object radials open with correct real verb lists (a door correctly offers Examine/Open/Close/Lock/Unlock); and "go to this room" (`Navigator`'s multi-hop route-follower) correctly auto-navigates across several rooms back to a known, already-visited room -- all working as intended, no further map/auto-nav bugs found in this pass. | [yes] |
| D60 | **Numbered I7 door_dir exits were never clickable/underlined in the room text at all (only reachable via the general input-line radial) - found via real radial-first playtest of wump2ka.z5.js, 2026-09-12.** Operator directive this session: play using radials as much as possible, like a real player. `Actionable.Refresh()`'s text-marking (`wrapFirstExact`) only creates a clickable mark when an exit's exact label string is found in the printed room text; the label for these exits was "exit-91" (the raw door_dir property number, D35/D55) which never appears anywhere in a real game's own prose - the game prints "Exit 1"/"Exit 2" (its own ordinal, not the raw property number). Confirmed live: zero direction marks existed in the room text for a room with two real numbered exits; the exits were only accessible via the general input-line radial (D55's `ram-exit` entries). **Fix (generic, not a text-mining regression):** the display label for these exits now uses "exit " + the same real, structurally-derived ordinal rank already computed for the "xN" submit command (D55) - e.g. "exit 1" - instead of the raw property number. This is not matching against printed text to determine identity or order (D24/D25 unaffected: the ordinal is 100% RAM-derived, from sorting this room's own populated door_dir values); it only changes what human-readable word we choose to LABEL an already-fully-resolved real exit with, using a common, generic English convention that happens to also match this game's own wording. When it matches (as it does here), the exit becomes genuinely clickable in the room text, matching Anchorhead's compass-exit experience; when a differently-worded game doesn't match, behavior is unchanged from before (still reachable via the radial, never worse). Verified live end-to-end: "Exit 1"/"Exit 2" now render as real, fresh, clickable marks; clicking one correctly submits "x1" and moves the player to the correct room. A stale test assertion (`harness/d23-lookahead-labels.js`, asserting the old "exit-91" label) was caught and updated to the new ordinal-based label as part of the same fix, not left contradicting shipped behavior. Full regression suite re-run clean after the fix (`d23-lookahead-labels.js` 88/0, `phase2-heuristic-cutover.js` 134/0, `d34-dictionary-verbs.js` 54/0, `d46-room-identity.js` 8/8, `d48-map-single-room-per-destination.js` 3/3, all 7 Playwright suites in `tools/` PASS). | [yes] |
| D61 | **Root-cause fix, not per-module patching: the entire direction-property scanning apparatus was an Inform-only assumption that misfired on non-Inform Z-machine games - found live-testing Zork 1, 2026-09-12.** Operator explicitly tested Zork 1 (classic Infocom, ZIL-compiled, v3 header - predates Inform entirely) and found: the radial showing bogus Wumpus-style "exit-N" entries, no actionable-word highlighting, and the map showing only one room at a time with no connecting lines. Operator's explicit standing directive: the system must handle every module in the Z-machine family generically, never "decode every single module" one at a time. Root cause (claude, direct RAM trace, not assumed): `js/ZRamReader.js` `directionProps` (PROFILE 7-18, the wider `candidates` scan range 5-31, and the I7 door_dir/IndivTable convention) is entirely an Inform-6/7 compiler-declaration-order fact, not part of the Z-machine spec. Live-confirmed on Zork1's "West of House": properties 25/27/28/29/31 - all inside the `candidates` range - coincidentally held valid-looking object ids for reasons completely unrelated to exits (Zork predates Inform's library conventions by years), producing five bogus "exit-N" phantom exits, while real n/s/e/w exits (wherever Zork's own much older ZIL toolchain actually puts them) were nowhere in this range and never detected at all - explaining the missing highlighting (labels that don't exist can't be underlined) and the empty map (no real exits ever recorded, so `MapTopology` never links rooms together beyond whichever single room state-delta happens to observe by name). **Fix (generic, self-detecting, not a per-game special case):** new `ZRamReader.isInformCompiled(mem)` reuses the exact real compiler-stamp signal already established for the D34 dictionary-verb work (header `$3C`/`$3D` ASCII "6."/"7." stamp, falling back to the same dictionary-verb-flag heuristic for older unstamped-but-real Inform games like `curses.z5`), cached per memory buffer (a `WeakMap`, not a single global flag, so a test harness or any process touching more than one game's memory in sequence gets a correct answer for each, not a stale one). `lookAheadExits` now returns an empty exit list immediately for any game that isn't structurally confirmed Inform-compiled - a real, honest absence (D24), not a guess - leaving `MapTopology`'s state-delta labeling (the actual typed command, confirmed by real travel, already compiler-agnostic) as the correctly-functioning fallback for any non-Inform game, exactly as it already does for every other "we don't have RAM-derived pre-travel confidence" case in this system. Verified live: Zork1's "West of House" now correctly shows zero pre-travel exits (previously 5 bogus ones); typing "north" still correctly moves the player and records a real map link via state-delta; Anchorhead and wump2ka.z5.js (both genuinely Inform-compiled) re-verified completely unaffected - numbered exits, diagonal calibration, room names, and every other D49-D60 fix all still work identically. A synthetic test fixture gap was caught and fixed as part of the same change: `harness/d23-lookahead-labels.js`'s fixtures needed the same real Inform stamp added to keep exercising the gated code path, exactly mirroring what a real Inform-compiled game's header carries. Full regression suite re-run clean (`d23-lookahead-labels.js` 88/0, `phase2-heuristic-cutover.js` 134/0, `d34-dictionary-verbs.js` 54/0, `d46-room-identity.js` 8/8, `d48-map-single-room-per-destination.js` 3/3, all 7 Playwright suites in `tools/` PASS). This closes the map/highlighting/phantom-exit class of bug generically for the WHOLE non-Inform side of the Z-machine catalog (original Zork trilogy and any other pre-Inform Infocom title), not just Zork1 specifically - directly satisfying the operator's "handle all modules, don't decode each one individually" requirement. **Still open, tracked separately, not yet investigated:** the operator's Wumpus-specific reports (canteen missing Take, Glow Bar shown as worn, scrap of paper not highlighted) and whether the map/highlighting symptoms recur in Wumpus for a DIFFERENT reason than this Inform-detection gate (Wumpus IS Inform-compiled, so this specific fix does not apply to it) - next task. | [yes] |
| D63 | **Root architecture gap: the map's compass grid has physical DOM slots ONLY for the 12 fixed direction words - a game whose exits are NOT compass words at all had no way to ever render neighbor rooms, found live-testing wump2ka.z5.js, 2026-09-12.** Following on directly from D62: even after room identity/naming was fixed, the map still showed only the current room, no neighbors, no connecting lines. Root cause: `js/Map.js` `Build()`/`CreateRooms` creates exactly 12 fixed compass-named DOM elements (`#map .room.dir-n`, `.dir-se`, etc.); Wumpus's exits are numbered ("exit 1"/"exit 2", D60) - not occasional extras alongside real compass words, but this game's *entire* navigation vocabulary - so `$("#map .room.dir-exit 1")` (a key that isn't even a valid CSS class token) matched nothing, live-confirmed as the reason the map only ever showed "here." **Fix (generic, not a Wumpus-specific patch):** `Draw()` now separates a room's exits into real compass-word keys (which claim their own fixed slot exactly as before) and everything else; any leftover non-compass exit is assigned whichever of the 12 slots isn't already claimed this pass, in a fixed preference order (n, ne, e, se, s, sw, w, nw, up, down, in, out). This is purely a visual-positioning assignment - clicking a map box still re-centers on that room by its real Name/Id, never by submitting a direction command, so borrowing a compass slot for display never changes what a numbered exit actually does when used. Applies to any current or future game whose exits aren't compass words, not only this one. Verified live: a room with exits "exit 1"->a real destination and "exit 2"->another now renders both as neighbor boxes (at borrowed slots "n"/"ne" in the observed run), each correctly deduped when two keys point at the same destination (D48/D51 unaffected). Full regression suite re-run clean (`d23-lookahead-labels.js` 88/0, `phase2-heuristic-cutover.js` 134/0, `d34-dictionary-verbs.js` 54/0, `d46-room-identity.js` 8/8, `d48-map-single-room-per-destination.js` 3/3, all 7 Playwright suites in `tools/` PASS). | [yes] |
| D79 | **The actual root cause behind the entire session's recurring Wumpus mapping complaints - `js/ZRamReader.js` `findLocationGlobal`'s scored heuristic was picking the WRONG room, confirmed with precise live evidence, 2026-09-13.** Deep live investigation (real Playwright-driven keyboard input, not JS/RAM calls as the primary test) found that `wump2ka.z5.js`'s player object has **no parent at all** - direct RAM read confirmed `ZRamReader.objectLinks(mem, playerId).parent === 0` almost always - meaning this game does not use the standard Inform "player contained in room" model, and `snapshot()`'s primary `parent(player)` check (requiring `pl.parent > 1`) fails every time, making the FALLBACK `findLocationGlobal` the PRIMARY (not rare-backup) room-detection mechanism for this entire game. That fallback scanned all 200 global variables for one that "looks like a room," scoring heavily by raw global-slot index (`g<=3: +40`, `g<=10: +25`, `g<=40: +10`) - a scoring term with no real correlation to correctness. **Concrete, reproduced proof:** after a real, game-text-confirmed move ("You are in room #2..."), the scan found the CORRECT new room (RAM id 26, referenced by FOUR distinct global slots: 16/37/38/41) sitting right there in the candidate list, but the algorithm picked a WRONG room (RAM id 34, referenced by only TWO slots: 3/12) instead - purely because slot 3's raw index (`g<=3`) outweighed everything else. This single wrong-room read then cascades into every downstream symptom this whole session chased (D62/D67/D72/D74/D75/D76 all correctly fixed real, adjacent bugs, but the fallback's actual room SELECTION was never the thing examined). A dedicated 24-move real-play regression check (`harness/_longplay_wumpus.js`, ad hoc verification script, not a permanent fixture) run BEFORE this fix showed `ParchmapMap.CurrentRoom` frozen on the SAME value for all 24 real moves despite the underlying RAM room id and printed room text changing throughout - i.e., the map was silently not tracking the player's real location almost the entire session, which is a far more serious and complete explanation than any of D62/D67/D72/D74/D75/D76 individually. **Investigated and ruled out a cleaner alternative first (with live evidence, not just theory):** hooking `lib/zvm.js`'s `variable` opcode (confirmed live-patchable via the same `js/ZvmCapture.js`/`js/AttrCalibrator.js` opcode-observation infrastructure from D73-D75) to directly OBSERVE which global gets written to the new room id during a real move - this would have been strictly more deterministic than any heuristic - but a live trace of every global-variable write during a real, confirmed move found none of them matched the correct room id at all, meaning this game recomputes/re-derives its location tracking on demand rather than caching it via a simple store-to-global that could be observed and learned the way D73-D75 did for attribute bits. **Fix, applied to the heuristic instead:** `findLocationGlobal` now does a first pass counting how many DISTINCT global slots reference each candidate value - a real, structural, RAM-derived consistency signal (a game's own bookkeeping tends to mirror "the current room" across several purpose-built globals, while an unrelated reference like a cached exit-destination is typically held in only one or two special-purpose slots) - and this reference-count is now the DOMINANT scoring term (`min(refCount, 8) * 15`), with the old raw-slot-index bonus reduced to a small final tiebreaker (max +3) that can no longer overturn a real reference-count difference the way it used to. Verified live: the exact 24-move real-play sequence that previously showed the map frozen on one room the entire session now correctly tracks the player through 13 real, distinct rooms with zero anomalies (zero duplicate names, zero orphaned/non-real-id rooms, `CurrentRoom` always resolving to an existing room every single step). Full regression suite re-run clean (`d23-lookahead-labels.js` 88/0, `d46-room-identity.js` 8/8, `phase2-heuristic-cutover.js` 134/0, `d34-dictionary-verbs.js` 54/0, `d48-map-single-room-per-destination.js` 3/3, `attr-calibrator-phase-b.js` 12/12, `attr-calibrator-phase-cd.js` 13/13, `attr-calibrator-inventory-root.js` 5/5, `d31-nested-inventory.js` 60/60, all 8 Playwright suites in `tools/` PASS). This fix is generic (touches only the scoring formula's weighting, no per-title branching) and benefits ANY current or future game whose player object isn't contained in a room the standard way, not just Wumpus. Coordinated with Codex via the Portable-AI-Bus mailbox (message #289, superseding an earlier, less-precise task brief #288) as a second-opinion check on the fix direction before implementing. | [yes] |
| D78 | **"Take umbrella out of trenchcoat" (the ONLY command synthesized for a nested-in-held-container item, D31) never actually completes a take on a real, mainstream Inform game - operator's own live transcript proved it, and suggested the fix, 2026-09-13.** Anchorhead's own real parser output: `>take umbrella out of trenchcoat` / `I only understood you as far as wanting to take the umbrella.` - repeated across several rewordings ("take umbrella out of pocket", trying twice more), never once followed by "Taken." (confirmed by the absence of that line and the object staying un-held); the exact same object, same turn budget later, succeeded immediately and completely with plain `>take umbrella` / `Taken.`. `js/ActionSynth.js`'s nested-inventory branch (D31, "Positional verb suppression... show only TAKE OUT OF <CONTAINER>") had used the SAME string for both the display label and the literal command submitted to the parser - meaning the ONLY verb ever offered for a nested-in-a-worn-container item was, on this real game, never actually executable via the radial at all; a player would have to already know to bypass the UI and type a bare "take X" themselves (exactly what the operator ended up doing, and what prompted the report: "Maybe we do need the generic Take command in inventory?"). **Fix (same shape as D55's numbered-exit label/command split and D64's alias-matching split - reused, not reinvented):** `commandsForObject`'s nested branch keeps `verb: "take out of " + containerName` as the DISPLAY label (still genuinely useful - it tells the player where the item currently sits) but now sets `command: "take " + name` - the verified-working plain take - as what actually gets submitted. Updated four stale assertions in `harness/d31-nested-inventory.js` that had checked the OLD (broken) command string literally; all now check the label/command split explicitly (60/60 passing). Verified live end-to-end via a real radial click (not a typed command): put the umbrella in the trenchcoat, opened the Items panel, right-clicked the nested umbrella (radial correctly still reads "Take out of trenchcoat"), clicked it - the actually-submitted command was `take umbrella`, and the response was `Taken.`, exactly matching the operator's own manually-typed proof. Full regression suite and all 8 Playwright suites re-run clean. This closes the nested-inventory take path for every current and future game with the same Inform-standard "take X out of Y" non-grammar, not just Anchorhead - the label/command distinction is generic, not per-title. | [yes] |
| D77 | **"Put in trenchcoat" missing from umbrella's radial but present for the (removed) wedding ring - operator investigation question, root-caused live to an arbitrary, order-dependent truncation, not a real availability difference, 2026-09-13.** Raw `ActionSynth.commandsForObject` data confirmed umbrella genuinely HAD "put in" as a verb the whole time (verified directly, both before and after removing the ring) - the bug was one level up, in the TARGET-PICKER submenu that verb opens. `js/Actionable.js`'s `needsTarget` handler capped its candidate list at `.slice(0, 8)`, with zero prioritization. Live-confirmed in Anchorhead's Alley: `Actionable.payloadPool()` held 11 objects - 7 room objects (rain/sky/wall/piles of cardboard boxes/garbage can/fence/transom window) always sorted first, then inventory (wedding ring/trenchcoat/clothes/umbrella) - so the first 8 slots were entirely consumed by room scenery plus one inventory item, and trenchcoat (a REAL, RAM-confirmed `attrs.container:true` object, verified directly) fell in 9th position, past the cutoff. Whichever object you excluded (the one you right-clicked) shifted everyone after it by one slot - excluding "wedding ring" (positioned BEFORE trenchcoat) pulled trenchcoat into the visible window; excluding "umbrella" (positioned AFTER it) did not - so the exact same room's data could show or hide the real container depending only on which item happened to be clicked, matching the operator's exact observation. **First fix (reorder, still capped) was then explicitly rejected by the operator ("there is not supposed to be a limit") in favor of the correct, more complete fix:** `ParchmapQol.OpenRadial` (`js/Qol.js`) already has its own real capacity/paging system (up to 16 items across 2 rings, a genuine "More..." overflow for anything beyond that) - built exactly for "more real candidates than one ring can show." There was no reason for `Actionable.js` to also impose a second, much lower, silent cap ahead of that. **Final fix:** removed the `.slice(0, 8)` entirely from all three target-picker/submenu call sites that had it ("Put X in ___"/"Give X to ___" stems, "Use with...", "Ask about...") - every real candidate is now passed through to `OpenRadial` unconditionally; only the ORDER is biased so the structurally-correct kind of target for a given stem verb (`attrs.container`/`attrs.supporter` for "put", `attrs.animate`/`attrs.talkable` for "give"/"ask"/"show"/"tell" - real RAM-derived signal, not per-object) surfaces on the first ring page rather than requiring "More..." for the common case, without ever silently dropping anyone. Verified live via real clicks (Items panel -> right-click umbrella -> Put in...): all 10 real candidates now appear (`piles of cardboard boxes, garbage can, trenchcoat, rain, sky, wall, fence, transom window, wedding ring, clothes`), trenchcoat correctly promoted to 3rd position. Full regression suite and all 8 Playwright suites re-run clean. Clarified for the operator's follow-up question: the radial's own capacity (16, screen-size-based only) was never actually different between the input-line radial and inventory submenus - the perceived smallness was entirely this extra, non-radial-system cap, now removed; the ring's on-screen pixel SIZE still legitimately scales with real item count (330px for ≤8, 460px for more), which is a deliberate cosmetic choice, not a cap. | [yes] |
| D76 | **Closed the "Reset Map" loose end D74 explicitly left open - operator asked directly whether Reset Map is now safe for the repeated, heavy real-world use it's actually going to get ("retesting the same games... people play games over and over"), 2026-09-13.** `ParchmapMap.Clear()` (bound to the real Reset Map button) still called the legacy `EnteredRoom(CurrentRoom)` to immediately recreate the current room - the exact raw-name-string, no-real-id stub-creation anti-pattern D72 already removed from the normal per-tick path. D74 stopped a resulting mismatch from ever blanking the map on a LATER tick, but Reset Map itself was still the one remaining place capable of introducing that stub in the first place, on every single reset. **First fix attempt (caught by the existing regression suite, not shipped):** calling the FULL `MapTopology.tick()` from inside `Clear()` correctly avoided the id-less stub, but also re-processed `payload.exits` (pre-travel lookahead hints) and immediately regenerated neighbor room stubs - silently changing Reset Map's own promised behavior ("Clear the current map? Room notes on the map will be removed") into "clear, then instantly regenerate," caught by the existing `tools/map-pathing-regression.js` assertion ("Clear() should leave at most current room"). **Second fix attempt (caught by re-running the same automated test 5 times, a real flaky bug, not assumed):** narrowing to call only `MapTopology.ensureRoom` (not the full tick) fixed the neighbor-regeneration regression, but calling a fresh `WorldModel.tick()` immediately beforehand intermittently raced the normal per-turn re-tick cycle completing its OWN full exits re-processing before the test's own check ran - passed 4 out of 5 runs, silently. **Final fix, verified stable:** `Clear()` reuses the EXISTING `WorldModel.lastPayload` (the underlying game state hasn't changed - only the map's own cache was just cleared, so no fresh tick is needed at all) and calls only `MapTopology.ensureRoom(payload.roomName, payload.roomId)` to re-establish the current room's real identity, never touching exits/neighbors and never forcing a new computation cycle. Verified: `tools/map-pathing-regression.js` re-run clean 5/5 consecutive times (was previously flaky 4/5). **Stress-tested exactly to the operator's stated concern** - a repeated-use harness driving 4 full reset cycles (real UI button click via Playwright, confirm-dialog auto-accepted, continued real play after each reset) across all three catalog games (wump2ka.z5.js, Anchorhead, Zork1): zero id-less/orphaned rooms, `CurrentRoom` always resolved to a real, existing room, and the map correctly rendered boxes every single time across all 12 reset cycles; Anchorhead's inventory (4 items) stayed correct through every round too, confirming D75's inventory fix also survives repeated resets. Full regression suite and all 8 Playwright suites re-run clean after the final fix. **Answer to the operator's direct question: yes, Reset Map is now safe for repeated, heavy real-world use** - verified against the exact usage pattern described, not just the original bug report. | [yes] |
| D75 | **"Inventory did not work at all" (operator report, A Bear's Night Out worked correctly, wump2ka.z5.js did not) - root-caused to the SAME already-documented Wumpus attribute-randomization ambiguity (D57/D58), this time surfacing as a false NEGATIVE instead of a false positive, and fixed using D73's own opcode-observation infrastructure rather than another attribute heuristic, 2026-09-13.** Live trace: the real held "Transmat Popper" (object 185)'s actual parent chain is 185->171->37 - 171 being the SAME unnamed "(CustomPlayer)"-style decorative prop D57/D58 already identified, NOT `probe.playerId` (20, confirmed via direct RAM read to have zero real children this session). `js/ZRamProvider.js` `resolveInventoryRootId`'s fallback (added D57, tightened D58) only ever considers a room-child candidate when its `animate` bit reads true - and this exact game randomizes that bit per session (D58's own confirmed finding) - so when it happened to read `false` on the TRUE holder this session, the fallback skipped it entirely and inventory silently read empty despite two real held items, with no error or warning. **Fix (reuses D73's infrastructure instead of adding a new heuristic):** a real, successful `take` command's `insert_obj(itemId, holderId)` call - already captured by `js/AttrCalibrator.js`'s opcode trace - names the TRUE holder id directly, as 100% observed fact, with zero ambiguity about attribute-bit randomization. `AttrCalibrator.record()` now also captures this `holderId` into `table.inventoryRootId` (persisted per-game, same `PM_AttrCalib_<gameIdentityKey>` entry D73 already established) whenever a take succeeds; new `AttrCalibrator.confirmedInventoryRootId(mem)` exposes it. `ZRamProvider.resolveInventoryRootId` now consults this BEFORE its own animate-gated fallback (only when the probe id itself came back empty-handed, so a genuinely correct, currently-empty-handed player is never second-guessed by a stale prior observation). New harness `harness/attr-calibrator-inventory-root.js` (5/5) proves: no observation yet -> null (never invented); a confirmed take records the real holder id, not the probe's; `resolveInventoryRootId` prefers it over the animate-gated fallback in the exact scenario that failed live; a different game's identity key never inherits another game's confirmed root. Verified live end-to-end: the exact reproduction (fresh wump2ka.z5.js session, `take transmat popper`, `inventory`) now correctly shows both held items via `WorldModel.lastPayload.inventory`, matching the real game's own printed inventory list exactly. Full regression suite re-run clean (`d23-lookahead-labels.js` 88/0, `d46-room-identity.js` 8/8, `phase2-heuristic-cutover.js` 134/0, `d34-dictionary-verbs.js` 54/0, `d48-map-single-room-per-destination.js` 3/3, `attr-calibrator-phase-b.js` 12/12, `attr-calibrator-phase-cd.js` 13/13, all 8 Playwright suites in `tools/` PASS). This is a second concrete example (after the canteen) of D73's infrastructure fixing a real bug that a static/attribute-only approach structurally could not - the same session that built the opcode-observation system used it to fix an unrelated class of bug (inventory-root identity) it wasn't originally designed for, which is exactly the kind of general-purpose payoff the operator was checking for. | [yes] |
| D74 | **Root cause of "after Reset Map + continuing to play, mapping just simply didn't work" (operator report, screenshot showing 0 map boxes rendered despite "6 rooms / 6 exits" correctly tracked underneath) - a real identity bug, not a Wumpus-randomness artifact, 2026-09-13.** Live trace confirmed: after clicking the real "Reset Map" button and continuing to play, `ParchmapMap.CurrentRoom` held the string `"Room #5"` while `ParchmapMap.Rooms` contained no room named `"Room #5"` at all - `Map.js Draw()`'s `GetRoom(CurrentRoom)` lookup silently found nothing and returned early, rendering zero boxes (not even "here"). Root cause: **four separate places** still set `ParchmapMap.CurrentRoom` directly from the raw, unrefined `payload.roomName` string read that exact tick (`MapTopology.applyPayloadExits`, `TranslatorUI.applyDiscovered`, `TranslatorUI.apply`'s own top-level set, and `Parchmap.js GetRoom`) - none of them checked whether that raw string actually matched the FROZEN identity name (D62) MapTopology had already resolved for the exact same real room via its own `ensureRoom`. Since wump2ka.z5.js re-randomizes its own printed room label on revisits (D62's original finding), any of these four raw assignments could silently point `CurrentRoom` at a fresh, re-randomized label that no `Rooms[]` entry was ever filed under - this was a live, structural race between "the frozen identity MapTopology maintains" and "whatever text was printed this exact tick," not a one-off Reset Map bug; Reset Map (`ParchmapMap.Clear()`, still calling the legacy `EnteredRoom(CurrentRoom)`, per D72's own still-open observation) simply made the mismatch far more likely to surface by discarding the room graph the instant before a fresh, unrefined reading. **Fix (single shared resolver, not four separate patches):** new `MapTopology.resolveCurrentRoomName(payload)` calls the same `ensureRoom` real-id-first resolution already used everywhere else and returns the room's frozen `.Name`; `applyPayloadExits` now reassigns its own local `roomName` to this resolved value immediately after calling `ensureRoom` (so its own `link()` calls downstream are consistent too), and all three other call sites now route through `resolveCurrentRoomName` instead of using the raw payload string directly. Verified live: the exact repro (Reset Map via a real UI click, then continued real play) now shows `CurrentRoom` always matching an existing `Rooms[]` entry, and the map correctly renders all real neighbor boxes again. Full regression suite re-run clean (same suite list as D75 above). The underlying "Reset Map still uses the legacy `EnteredRoom` path" observation from D72 remains separately tracked, not fully closed by this fix (Reset Map's own room-recreation still bypasses `MapTopology`'s id-based system on the FIRST tick after a reset - this fix only guarantees `CurrentRoom` can no longer end up pointing at a orphaned/nonexistent name on any SUBSEQUENT tick). | [yes] |
| D73 | **Correction of D34 and D58: `lib/zvm.js` is a pure-JS, JIT-compiling Z-machine interpreter whose opcode implementations are ordinary, live, prototype-patchable methods, not baked into closures - "executing/decompiling compiled Z-code... out of bar, not a RAM read" (D34) and "no attribute-schema calibration project is needed" (D58, for the mutation-bit subset of that same limitation) were both wrong for exactly this reason, operator directive 2026-09-13 ("if we can play the game we can monitor the game").** `lib/zvm.js` translates Z-machine opcodes into JS source strings (e.g. `"e.test_attr(" + args + ")"`) and executes them - the compiled game's own precondition/action routines call real, named methods (`test_attr`, `set_attr`, `clear_attr`, `get_prop`, `insert_obj`, `remove_obj`) via ordinary property lookup on the running VM instance at call time, confirmed NOT baked into closures (a later patch to the prototype method is honored by code compiled/executed both before and after the patch). `js/ZvmCapture.js` already proved this exact monkey-patching pattern works today (it patches `window.ZVM.prototype.prepare/start/resume` to capture the live instance as `window.__PARCHMAP_ZVM__`). Live proof, wump2ka.z5.js, "take canteen": `test_attr(canteen, 5/32/33/34/35/22/24)` all false, then `remove_obj(canteen)`+`insert_obj(canteen, 171)`+`set_attr(canteen, 17)` - a complete, real trace proving the compiled game's actual TAKE precondition never once tests bit 19 ("static" in `AttributeSchema.PROFILE`, which `takeable = !static && !scenery` depends on) and tests several bits entirely outside the profile's 0-30 range. This does **not** retract D58's Wumpus-randomness framing (still correct: the game's randomness is in which objects/values get generated, not in the compiled bit-to-semantic mapping) - it retracts only the "no fix is possible" conclusion, since live opcode observation is a strictly stronger, still fully-generic, still non-text-mining signal than the static profile alone (and stronger than D34's own "would require executing parser/filter routines in the VM (out of bar)" framing, which assumed this was infeasible). **Phase B implemented and verified 2026-09-13 (observation/correlation only, zero effect on any live prediction):** new `js/AttrCalibrator.js` - `js/ZvmCapture.js` gained six new guarded-once prototype patches (`test_attr`/`set_attr`/`clear_attr`/`get_prop`/`insert_obj`/`remove_obj`, same pattern as its existing `prepare`/`start`/`resume` patches) forwarding every call to `AttrCalibrator.onOpcode` behind a `typeof` guard (zero coupling - every game behaves identically whether or not `AttrCalibrator.js` is loaded). `AttrCalibrator` correlates a submitted command to its real target object id (reusing `AttributeSchema._findIdByName`, not a new lookup), opens a short trace window (mirroring `AttributeSchema.observeCommand`'s existing ~450ms delay), and classifies success/fail from the REAL opcodes observed (take/drop: `insert_obj`/`remove_obj` present; open/close/wear/switch/lock: `set_attr`/`clear_attr` present) rather than a transcript-text guess - transcript text is kept only as a secondary corroboration that can downgrade an observation to "ambiguous" (discarded), never used to positively confirm one, matching this project's D24 discipline. **Follow-on gap found and fixed during live verification of the same phase:** the initial design only wrapped `Actionable.Submit`, which fires for radial/mark clicks only - a player typing a command directly into the input box and pressing Enter (confirmed live: the single most common real interaction) never calls `Submit` at all, the exact same gap `MapTopology.readLastTypedCommand`'s own header comment already documents for its own, unrelated purpose. Fixed with a `document`-level capture-phase `keypress` listener (capture-phase listeners on an ancestor always run before any listener on the target element itself, guaranteeing the correlation window opens before the interpreter's own synchronous per-turn opcode execution) targeting `.Input.LineInput` specifically; `observeCommand` gained a re-entrancy guard so having both triggers active simultaneously is safe (whichever fires first for a real submission wins, the other is a no-op). A second follow-on gap (also found live): `AttributeSchema._transcript()`'s whole-page text check flagged real successes as false-ambiguous due to unrelated wording from many turns earlier in the same session - fixed by scoping the corroboration check to only the buffer lines printed since the current command's own window opened (the same "count new lines since I last looked" technique already used elsewhere in this codebase, e.g. `MapTopology`'s `.Style_input` echo counter). Verified live end-to-end on wump2ka.z5.js via a REAL TYPED keyboard command (not a synthetic/JS-driven one): `take canteen` -> `Taken.` correctly produced a captured trace classified `success: true, ambiguous: false` with the exact real opcode sequence quoted above. New harness `harness/attr-calibrator-phase-b.js` (13/13, using the real captured canteen trace as its primary fixture) proves correlation, success/fail classification, cross-object exclusion, and that `AttributeSchema.applyTo()`'s output is untouched by this phase. Full regression suite re-run clean (`d23-lookahead-labels.js` 88/0, `d46-room-identity.js` 8/8, `phase2-heuristic-cutover.js` 134/0, `d34-dictionary-verbs.js` 54/0, `d48-map-single-room-per-destination.js` 3/3, all 8 Playwright suites in `tools/` PASS). **Phase C (persistence) and Phase D (consumption) implemented and verified 2026-09-13, closing the canteen bug for real, not just diagnosing it:** `AttrCalibrator` now has two learning mechanisms, since take/drop have no single "mutated bit" the way open/wear/lock/switch do (takeable is the library's own derived `!static && !scenery` precondition, not a flag a successful take flips) - (1) **per-game bit calibration** (`table.verbs[flag] = {mutatedBit, confirmations}`): for open/close->`open`, wear/remove->`worn`, switch on/off->`on`, lock/unlock->`locked`, the real bit a `set_attr`/`clear_attr` call touches on success is tracked per candidate bit and only finalized once the SAME bit has been the consistent success-mutation across `CONFIRM_THRESHOLD` (3) observations - a disagreeing bit resets that flag's candidate tally rather than averaging toward a wrong answer, so noise can never settle on an incorrect override; (2) **per-object direct override** (`table.objects[id] = {takeable}`) for take/drop specifically: a single real, non-ambiguous opcode-level observation (`insert_obj`/`remove_obj` present or absent) is decisive ground truth for THAT specific object, so it's remembered immediately, no threshold needed. Both persist to `localStorage` under `PM_AttrCalib_<gameIdentityKey>` (identical key convention to `ZRamReader`'s diagonal-exit calibration) and hydrate once per game. `AttributeSchema.applyTo()` consults both, additively, after the existing static-PROFILE loop and the existing `takeable` derivation: a bit-override re-reads the flag using the learned bit instead of the profile's; a per-object `takeable` override wins last (most specific fact available). A game/flag with zero observations is byte-for-byte unaffected - no regression path exists for an already-correct prediction. New harness `harness/attr-calibrator-phase-cd.js` (13/13) proves: the per-object override flips only the observed object's `takeable`, never a different object with the same static bits; bit-level overrides require 3 consistent confirmations and reset cleanly on disagreement; persistence round-trips through a fresh "page load" via the same localStorage backing store; a completely unobserved game/flag is provably untouched. **Live-verified across three catalog games (operator: "test on multiple modules"), 2026-09-13:** wump2ka.z5.js - a real typed `take canteen` -> `Taken.` recorded object 285's `takeable:true`; a FRESH, independent `AttributeSchema.applyTo()` call for that same object afterward correctly returns `takeable:true` while `static` still honestly reads `true` (the raw bit is untouched - only the derived flag corrected) - **the flagship bug is fixed, not merely explained.** Anchorhead - real `take`/`drop`/`take umbrella` cycles recorded a matching, non-contradicting `takeable:true` for the umbrella; every other object's prediction (rain/sky/alley/buildings/door: false; wedding ring/trenchcoat/clothes: true) was compared before and after and found byte-for-byte IDENTICAL - zero regression on an already-100%-correct game. Zork1 (non-Inform, ZIL-compiled, v3 header) - `take mailbox` -> "It is securely anchored." correctly recorded `takeable:false`, and the opcode hooks/correlation worked with zero errors on a completely different compiler's output, confirming the mechanism is genuinely VM-level generic, not an Inform-specific trick. Full regression suite and all 8 Playwright suites re-confirmed green after Phase C/D. Scoped to Z-machine (`lib/zvm.js`) only; Glulx/Quixe would need its own separate feasibility check first, matching this project's existing Glulx-sequenced-behind-Z-machine discipline (D36/D38). Precondition-bit inference from rejection-only traces (i.e. learning what BLOCKS takeable, not just recording confirmed outcomes) remains the explicitly out-of-scope Phase E stretch goal. | [yes] |
| D72 | **The real root cause behind the map "feeling messed up"/duplicating rooms across ALL THREE games, not a per-game issue - TWO separate, uncoordinated legacy room-creation systems were racing the authoritative RAM-id-based one on every single tick, found via real click-driven play on wump2ka.z5.js after the operator explicitly pushed back that prior fixes weren't resolving the underlying feel of the map, 2026-09-13.** Operator's own screenshots showed Wumpus map boxes labeled with raw, unrefined internal names ("C_ROOMS_7") sitting right next to properly refined ones ("Room #16") in the SAME known-rooms list, and separately reported the map "not really solving much" despite D65-D71 all passing their own individual regression checks - a strong signal (matching the operator's own diagnosis: "I think fixing one module's mapping is breaking the others") that something architecturally systemic remained, not another isolated symptom. Direct live tracing (a setter-trap on `ParchmapMap.CurrentRoom` capturing every write with its call stack) found FIVE independent code paths writing `ParchmapMap.CurrentRoom` on every tick; deeper tracing of an actual real room-to-room transition (`probe.roomId` genuinely changing, confirmed via direct RAM read) found the true damage: two of those paths - `js/TranslatorUI.js` `applyRoom`'s call to the legacy `ParchmapMap.EnteredRoom(roomName, null)` (`js/Map.js`, pre-dates the RAM-deterministic rewrite), and the separately-called `MapIdentity.applyExits` (`js/MapIdentity.js`, explicitly commented as "Phase 5" - an even OLDER, superseded identity layer) - each independently ran their OWN name-string "does this room already exist? if not, create it" check on the exact same `payload.roomName`/`payload.exits` that `MapTopology.tick()` (the real, RAM-id-based authority, D47/D62) had ALREADY correctly resolved moments earlier in the SAME tick. Whenever the exact name string didn't match (confirmed live: happens routinely during real transitions, e.g. before vs. after D54's status-bar refinement settles), either legacy path created a SECOND, permanently orphaned room record for the exact same real room, keyed by a synthetic `MapIdentity.hashName` id instead of the real RAM id - a genuine, structural bug, not Wumpus's own accepted content-randomness (D58); confirmed the same class of race exists regardless of game, just surfaced most visibly in Wumpus because its constant room-renumbering (D62) makes exact-string mismatches far more frequent than in Anchorhead/Zork1. **Fix (generic, removes the redundant systems rather than patching around them, matching D22/D37's "one deterministic path" doctrine):** `TranslatorUI.applyRoom` no longer calls `EnteredRoom(roomName, null)` - it now calls `ParchmapMap.Save()`/`Draw()`/`RebuildRoomsList()` directly (EnteredRoom's only actually-needed side effects here; room identity was never its job once `MapTopology` existed) - and no longer calls `MapIdentity.applyExits` at all, since everything useful it did to an EXISTING room (ExitMeta hints for locked/zDelta) is already done more completely by `MapTopology.applyPayloadExits` against the identical `payload.exits` array, using real ids. `MapIdentity.migrateAll()` is kept (it only back-fills an id on rooms that already exist, for old-save compatibility - never creates a new room from a name string, so it carries none of this risk). `EnteredRoom` itself is untouched and still used correctly by its other, non-tick-driven callers (map-file import, the Clear/reset-map button) where its identity-establishing behavior is still the actual intent. Verified live end-to-end with a repeatable, real-click-driven playthrough across all three games (8+ real moves each, `probe.roomId` change confirming genuine RAM-level travel each time): wump2ka.z5.js went from 2 permanently-orphaned hash-id duplicate rooms after 8 moves to ZERO across a fresh run of the same length; Anchorhead (8 moves) and Zork1 (20 moves, including revisiting several rooms) both independently confirmed zero orphaned/duplicate room records, no regressions. Full regression suite re-run clean (`d23-lookahead-labels.js` 88/0, `d46-room-identity.js` 8/8, `phase2-heuristic-cutover.js` 134/0, `d34-dictionary-verbs.js` 54/0, `d48-map-single-room-per-destination.js` 3/3). This is very likely the true underlying cause of much of the map's general "unreliable/messed up" feel reported across this whole session, not merely one of several contributing symptoms. | [yes] |
| D71 | **Follow-on to D63/D66, found in the same real click-driven pass: a compass-slot's small corner label ("N"/"NE"/etc) never reflected the REAL direction/exit a neighbor room was actually reached by - it was a STATIC label baked in once at `Build()` time and never updated per-render.** Confirmed live and directly visible in the operator's own screenshot: wump2ka.z5.js's map showed neighbor boxes labeled "N"/"NE" even though this game's exits are NEVER compass words at all (D63's entire reason for existing) - misleadingly implying a north/northeast relationship that doesn't exist; the real way to reach that room is "x1"/"x2". **Fix (generic):** `DrawRoom(dir, roomName, label)` gained an optional third parameter - the REAL direction/exit key a room was actually reached by - which now overrides the slot's corner text when it differs from the slot's own native compass letter (a genuine compass exit is unaffected, since its real direction already equals its slot). `Draw()`'s main exits loop passes the real `dir` through; `Draw()` also now resets every slot's corner label back to its own native compass letter at the top of each pass (before either loop runs), so a borrowed label from an earlier tick can never linger once that slot legitimately returns to holding a real compass exit of its own. Full regression suite re-run clean, including a compatibility fix for the synthetic test harness's minimal jQuery stub (iterates the same fixed 12-slot list `Build()`/`CreateRooms` uses, rather than a live DOM wildcard scan the stub can't support). | [yes] |
| D70 | **Minor follow-on refinement to D64, found in the same real click-driven Anchorhead pass as D69, 2026-09-13: an object's `VerifiedNouns` entry could be downgraded to a less specific word by whichever matching phrase happened to be processed last, not necessarily the most descriptive one.** Anchorhead's "real estate office door" object never appears verbatim in its own room's printed text (the actual prose says "the real estate agent's office", a different phrasing) - `namePhrases`/D64's alias fallback correctly matched several individual words ("real", "estate", "office") against different spans of the real text, but since `Actionable.js`'s wrap-application loop unconditionally overwrote `VerifiedNouns[objectId]` on every successful match for that object (not just the first/best one), whichever candidate happened to be iterated LAST for that object ended up as its permanently-remembered command noun - confirmed live: clicking "Open" on this door submitted "open real" (functionally correct, since "real" IS one of the object's genuine recognized words, but a needlessly obscure choice compared to "office"). **Fix (one-line, generic):** since `wrapTargets` is already sorted longest-phrase-first, only replace an object's existing `VerifiedNouns` entry with a new match that is at least as long as what's already stored - the natural, already-established sort order then means the object's FIRST successful match (its longest/most-specific) wins and a later, shorter match never downgrades it, while a genuinely longer/better phrase discovered in a later tick can still improve it. Verified live: the same door now submits "open office" instead of "open real". Full regression suite re-run clean (`d23-lookahead-labels.js` 88/0, `phase2-heuristic-cutover.js` 134/0, `d34-dictionary-verbs.js` 54/0). Low severity (the prior behavior was never functionally wrong, just a less intuitive word choice) but a genuine quality improvement caught only by real click-driven play, not by any JS-eval check. | [yes] |
| D69 | **A follow-on bug from D65 itself, found via a fresh real click-driven playtest pass on Anchorhead (untouched by this session's Zork/Wumpus work), 2026-09-13.** Right-clicking the input line on Anchorhead's starting room showed BOTH full-word and abbreviated duplicates for the same direction: "northwest"/"nw", "southeast"/"se", "east"/"e", "west"/"w" all listed side by side in the radial. Root cause: `js/TranslatorUI.js` `remapRoomExitKeys` (an existing, pre-D65 mechanism, called every tick from `ensureDrawableCompass`) deliberately keeps every room's own `Exits` keys in SHORT/abbreviated form ("nw"/"se"/"e"/"w") so `Map.js Draw()`'s `#map .room.dir-XXX` slot lookup works - a fact D65's `WorldModel.mergeConfirmedExits` didn't know about: it read `curRoom.Exits` keys directly and compared them, unnormalized, against RAM pre-travel lookahead labels, which are always the FULL word (`ZRamReader.directionProps` PROFILE). Since `"nw" !== "northwest"` as plain strings, the dedup check never recognized the two as the same real direction, so a room with both a RAM hint and an already-confirmed short-form entry for the same exit got both pushed into `payload.exits` side by side. **Fix (reuses the existing canonical source of truth, no new alias table):** `mergeConfirmedExits` now canonicalizes every label - both the existing RAM-lookahead entries and each candidate from `room.Exits` - through `MapTopology.normalizeLabel` (the same short-to-long expander `classifyExit`/`link`/state-delta already use everywhere else in this codebase) before comparing or pushing, so a confirmed short-form exit is correctly recognized as a duplicate of its already-present full-word RAM hint, and is pushed under the canonical full-word label when it isn't already present. Verified live: Anchorhead's starting-room radial now shows "northwest"/"southeast"/"east"/"west" exactly once each, no abbreviated duplicates. Full regression suite re-run clean (`d23-lookahead-labels.js` 88/0, `d46-room-identity.js` 8/8, `phase2-heuristic-cutover.js` 134/0, `d34-dictionary-verbs.js` 54/0, `d48-map-single-room-per-destination.js` 3/3). This is the kind of gap the standing "check the plan/architecture, don't fix piecemeal" directive exists to catch - D65 was reviewed against `PRODUCTION_PLAN.md`/`ARCHITECTURE_UML.md` at the time, but not against `TranslatorUI.js`'s own separate short-key remapping convention, which lived in a different file and wasn't touched by that fix. | [yes] |
| D68 | **The actual root cause of "Glow Bar incorrectly shows as worn" - a worn item leaking into room-scope discovery through the SAME unnamed-transparent-wrapper mechanism D57 already partially fixed, just triggered by the D58-documented random non-animate roll instead of the confirmed-animate case D57 covered - found via real click-driven repro on wump2ka.z5.js, 2026-09-12.** `js/ZRamReader.js` `walkVisibleDescendants`'s unnamed-child bypass (D57) only skips transparent recursion when the wrapper reads `animate:true` this session - but wump2ka.z5.js's procedural generator randomizes whether a given decorative prop object (here, an unnamed "(CustomPlayer)"-style object) gets the animate bit at all, confirmed live: this exact RAM structure (a Glow Bar, id 284, parented under an unnamed prop, itself parented under the current room) read `unnamedAttrs.animate:false` this session, so the wrapper was walked through transparently and its held Glow Bar was pushed into `discoveredObjects` as if loose in the room, correctly reading `attrs.worn:true` (the bit itself was never wrong) but presenting it to the player as a normal room object anyway. **Fix (generic, structural, no per-game special case):** a `worn` attribute means, by the Inform library's own semantics, "currently equipped by whatever this is parented under" - never a loose room object - so this is true regardless of whether that parent happens to test as animate this session. `walkVisibleDescendants` now tracks whether a child was reached via the unnamed-wrapper bypass (as opposed to a normal, directly-visible room/container child) and simply does not surface it when its own `worn` bit is set, independent of the wrapper's animate reading. A normal room object recursing into an actual NAMED, `canSeeInside`-gated container (the ordinary case) is unaffected - only items reached via the transparent, unnamed-wrapper path are filtered. Verified live: the exact RAM structure that previously exposed Glow Bar with `worn:true` now correctly excludes it from `discoveredObjects` entirely. Full regression suite re-run clean (`d23-lookahead-labels.js` 88/0, `d46-room-identity.js` 8/8, `phase2-heuristic-cutover.js` 134/0, `d34-dictionary-verbs.js` 54/0, `d48-map-single-room-per-destination.js` 3/3); Anchorhead's own inventory/room-scope behavior (which depends on the SAME function, just via the confirmed-animate branch) re-verified unaffected. This closes finding (b) from the Wumpus findings note below. | [yes] |
| D67 | **The actual root cause of "the map doesn't update correctly until you travel back and forth a couple of times" - a real, pre-existing CSS/render bug exposed heavily by D66, found via real click-driven repro (typed commands, real screenshots) on Zork1, 2026-09-12, per operator's explicit demand to keep testing as a real player.** `js/Map.js` `Draw()` cleared the `shown` class from every map slot at the top of every call, but never cleared `tentative-exit` alongside it. `#map .room.tentative-exit{opacity:0.7}` (2 classes) beats the base `#map .room{opacity:0}` rule (1 class) on plain CSS specificity, WITH OR WITHOUT `shown` also present - so once ANY slot was ever marked tentative (D51's ambiguous-diagonal candidates, or D66's new inferred-incoming-edge neighbors), it stayed permanently visible showing whatever stale room name was last written into it, even long after that slot's real content moved on to something else or nothing at all. The only thing that ever cleared a slot was the main exits loop's own `.toggleClass("tentative-exit", isAmbiguous)` happening to revisit that exact slot again later with `isAmbiguous` false - which is exactly why repeatedly traveling back and forth through the same rooms would eventually "fix" the map, matching the operator's report precisely. Confirmed live and root-caused only after ruling out several false leads first (a data/logic bug in D66's new inference code, a Playwright `fullPage` screenshot side effect, a periodic redraw race) - the live evidence that broke it open: a `page.evaluate` DOM query taken moments apart from a screenshot showed a clean, correct 2-box state while the screenshot PNG (captured milliseconds earlier, same tick) showed 3 boxes including a room ("North of House") with no confirmed relationship to the current room at all - proving the discrepancy was a stale CSS paint, not stale JS state. **Fix (one-line, generic):** `Draw()` now clears `tentative-exit` together with `shown` at the top (`$("#map .room").removeClass("shown tentative-exit")`), so every Draw() pass starts from a genuinely clean slate; only the current pass's own determination (either the real-exits loop or D66's inferred-neighbor loop) ever re-applies `tentative-exit`. Verified live end-to-end: the exact repro sequence that previously showed ghost "North of House ?"/"Forest Path ?" boxes lingering at slots those rooms no longer occupied now shows only the single, correct, currently-relevant neighbor box. Full regression suite re-run clean (`d23-lookahead-labels.js` 88/0, `d46-room-identity.js` 8/8, `d48-map-single-room-per-destination.js` 3/3). This was a real, catalog-wide bug (any game using D51's tentative-diagonal mechanism, not just Zork1/D66) that had simply never been forced into the open before because it required a slot to go tentative and then stop being relevant without another tentative pass ever revisiting it - closes finding (d) from the Zork1 findings note below, this time via a genuine real click-driven repro, not just a JS-eval-style check. | [yes] |
| D66 | **A room's own confirmed Exits map only ever records the direction the player actually typed FROM that room - arriving at a brand-new room from elsewhere showed it with zero neighbors even when the map already, genuinely knew an adjacent room sat on its other side - found via real click-driven repro on Zork1, 2026-09-12.** Root cause: `js/Map.js` `Draw()` only ever iterated the CURRENT room's own outgoing `Exits`; `MapTopology.applyStateDelta` only ever writes an edge onto the DEPARTURE room (never guessing that travel is reversible - some real games have genuine one-way passages, so writing a symmetric edge into the DATA model would assert an unconfirmed fact, a real risk this fix deliberately avoids). Confirmed live: arriving at "Clearing" (reached via SOUTH from "Forest") showed a lone box with no neighbors, even though the map already, 100% genuinely knew Forest sits on Clearing's north side (from Forest's own separately-confirmed south exit). **Fix (generic, display-only, never asserts an unconfirmed fact):** `Draw()` now also scans every OTHER known room for an edge that points TO the current room, and - only when that direction has a real, language-level (not per-game) compass opposite (n/s, e/w, ne/sw, nw/se, up/down, in/out) and that opposite slot isn't already claimed by the current room's own real exits - renders that neighbor there, marked with the SAME `tentative-exit` visual treatment D51 already uses for "known but not confirmed FROM here" (not a new visual language, and never written into `room.Exits`/never treated as a real command anywhere; a map-box click already only re-centers by the room's real Name/Id, never submits a direction, so this can never cause an unconfirmed command to be sent). Verified live: after `north, north, east, south` on Zork1, "Clearing" now correctly shows "Forest" as a tentative north neighbor. Full regression suite re-run clean (`d23-lookahead-labels.js` 88/0, `d46-room-identity.js` 8/8, `d48-map-single-room-per-destination.js` 3/3). **Follow-on bug found immediately during the SAME live verification pass, see D67:** this fix, by using `tentative-exit` far more heavily than before, was what actually exposed a pre-existing, much older rendering bug badly enough to force it into the open - see D67 for the real fix to the persisting-ghost-box symptom. | [yes] |
| D65 | **Zork1's radial never offered a compass direction, even long after it had been confirmed by real travel and was already visibly linked on the map - found via real click-driven playtest (right-click on the input line), 2026-09-12, per operator's explicit demand to keep testing "as a real player... using actual commands", not backend script calls.** Root cause: `js/WorldModel.js` `tick()` built `payload.exits` ONLY from RAM providers' pre-travel lookahead (`ZRamReader.lookAheadExits`), which D61 correctly gated to Inform-compiled games only. For a non-Inform game (Zork1, ZIL-compiled, v3 header) that gate is honestly empty forever - by design, not a bug - but nothing else fed `payload.exits` from the OTHER real, compiler-agnostic source of exit knowledge already in the system: `MapTopology.applyStateDelta` already writes a real, confirmed edge onto a room's own `Exits` map the moment the player actually types a direction and actually moves (`room.Exits[dir] = destId`) - visible on the map panel itself - but this fact never flowed back into `WorldModel.lastPayload.exits`, so the radial (`Qol.js GetRadialCommands`, which only reads `p.exits`) and Actionable's direction highlighting stayed permanently blind to it for any non-Inform game. Confirmed live: after `north` from West of House, the map correctly showed `West of House.Exits = {n: ...}`, yet right-clicking the input line while standing in West of House again (after `north, north, south, south`) showed no directions at all in the radial. **Fix (generic, compiler-agnostic):** new `WorldModel.mergeConfirmedExits(payload)`, called inside the existing `isStructuralFact` block right alongside D53/D54's other post-processing steps, looks up the CURRENT room's own map entry (by real RAM id first, name fallback, matching D62's identity-first principle) and adds an entry to `payload.exits` for every direction key already present in that room's confirmed `Exits` map that isn't already covered by a pre-travel RAM hint - never overriding an existing (Inform lookahead) entry, only filling in real, already-proven facts the map already has for every other compiler too. Verified live end-to-end (real clicks, not JS calls): after `look, north, north, south, south` in Zork1, right-clicking the input line at West of House now shows a real "n" entry in the radial, clicking it submits `north` and moves the player correctly. Full regression suite re-run clean after the fix (`d23-lookahead-labels.js` 88/0, `d46-room-identity.js` 8/8, `phase2-heuristic-cutover.js` 134/0, `d34-dictionary-verbs.js` 54/0, `d48-map-single-room-per-destination.js` 3/3). This closes the "radial missing directionals" half of the still-open Zork1 report; the other half (operator's report that "the map doesn't update correctly until you travel back and forth a couple times") needs a further real click-driven repro pass - not yet reproduced in this session's own click-driven testing, tracked as still open below. | [yes] |
| D64 | **An object's structural short-name (the Z-machine object-header text `ZRamReader.shortName` decodes) is not guaranteed to be real parser vocabulary at all - found root-causing the still-open "scrap of paper not highlighted" report from earlier this session, 2026-09-12.** Live-decoded on wump2ka.z5.js: the object printed in-room as "A scrap of paper is lying next to the skeleton" decodes a `shortName` of "scrawled note" - a real Z-machine object-header string, but one that never appears anywhere in the room's own printed text, and isn't even valid parser input on its own (`x scrawled note` -> "You can't see any such thing."). The object's compiler-reserved property 1 (`name` - the actual list of dictionary words the parser accepts for it; this file's own header comment already documents "the compiler reserves properties 1-3 (`name` plus two internals)") decodes to `written, missive, scrawled, scrawl, scribbled, scribbles, note, letter, scrap, of, paper` - includes both words the room text actually uses ("scrap", "paper"), each independently confirmed live as valid (`x paper` / `x scrap` / `take scrap of paper` all resolve correctly to this object). So `Actionable.js`'s text-highlighting (which only ever tried phrases derived from `shortName`) could never find this object in real text, and `ActionSynth.js`'s command generation (which always built commands from `obj.name`) would have generated unparseable commands even if a mark had existed. **Fix (generic, structural, no per-game special-casing):** new `ZRamReader.parserWords(mem, id)` decodes property 1's word list via a reverse-dictionary lookup (new `ZRamReader.reverseDictionary`, cached per memory buffer like D61's `isInformCompiled`), gated on `isInformCompiled` since property-1-as-name is an Inform convention, not a Z-machine-spec fact (D24: honest `[]` for any other compiler). Every RAM-discovered object now also carries `aliases` (this real word list) alongside its existing `name`. `Actionable.js`'s highlighting loop tries the object's own `namePhrases(o.name)` first exactly as before (unaffected for the vast majority of objects where shortName already matches printed text), and ONLY falls back to trying individual real alias words (never invented, never guessed - each is a genuine word from the object's own compiler-authored name list) when those don't find a match; whichever phrase actually gets confirmed present in real printed text is remembered per RAM object id (new `Actionable.VerifiedNouns`, `Actionable.commandNounFor`), persisting past the current tick so it's still available once the object leaves visible room text (e.g. after being taken into inventory). `ActionSynth.commandsForObject` now builds its command text from `Actionable.commandNounFor(obj)` (falling back to `obj.name` when nothing's been verified yet) instead of always trusting `obj.name`. Verified live: "A scrap of paper is lying next to the skeleton" now gets a real, fresh, clickable mark on "scrap" (or "paper"), and its radial/click commands submit real parser-valid text ("examine paper"/"take paper") instead of the previously-unparseable "examine scrawled note". Full regression suite re-run clean after the fix (`d23-lookahead-labels.js` 88/0, `d46-room-identity.js` 8/8, `phase2-heuristic-cutover.js` 134/0, `d34-dictionary-verbs.js` 54/0, `d48-map-single-room-per-destination.js` 3/3). This closes finding (c) from the "Confirmed live findings" note below. | [yes] |
| D62 | **A confirmed live counter-example broke the D47 assumption that a room's display Name should always update to the latest reading - found live-testing wump2ka.z5.js's map, 2026-09-12.** Investigating why the SAME real room appeared to fork into differently-named duplicate map entries revealed: the exact same underlying RAM object (confirmed via byte-identical child/sibling/property-table address across visits - genuinely the same structure, not a coincidence) was printed under a DIFFERENT "Room #N" number by the game's own status bar on a later visit. Wumpus 2000's own room numbering is not a stable per-room label (thematically appropriate for a disorienting procedurally-generated maze, but it broke D47's "always trust the latest name" policy and D54's display refinement, which together kept re-labeling one real room every time it was revisited). **Fix (generic):** `js/MapTopology.js` `ensureRoom` now fixes a room's display Name the FIRST time a real RAM id is attached to it (upgrading a stub's placeholder name, or naming a freshly-discovered room) and does not let a later call with the SAME already-known real id overwrite it again. A related, hypothetical "dark room becomes lit and gets a real name" upgrade case (raised as a justification for the original always-update policy, but never actually confirmed live this session) is superseded by this fix, since there is no non-text-guessing way to distinguish "this new reading is a genuine improvement" from "this new reading is cosmetic per-visit noise" - the confirmed real bug takes priority over the unconfirmed hypothetical one; `harness/d46-room-identity.js`'s test for the old policy was updated to assert the new, correct behavior rather than left contradicting shipped code. This also fixed a downstream duplicate-exit-key symptom: state-delta's own destination-id lookup (`MapTopology.applyStateDelta`) was resolving "the room just arrived at" by NAME (which could miss an already-known room recorded under its stub's un-refined name), now resolved by real RAM id first (`MapTopology.ensureRoom`, matching D47's own identity-first principle) so the pre-travel hint and the post-travel confirmation correctly recognize each other as the same destination. Full regression suite re-run clean after both fixes. | [yes] |
| D34 | Grammar-table verb extraction (real per-object valid-verb lists read from the game's compiled Grammar Table, not `ActionSynth.rules`' generic attribute->verb approximation) is committed, sequenced work - the next major assignment after the current active queue closes, not something to leave indefinitely inside "starting ruleset" language. `js/GrammarProvider.js` is confirmed dead code today, not a working stub. Operator directive, 2026-09-12. **2026-09-12 Phase A researched and CLOSED (not viable as originally stated):** grok confirmed the `GrammarProvider.js` dead-code diagnosis (it reads a `dict.entries` array that the real `ZRamReader.parseDictionary` never returns) and then researched, with live decoded evidence across 8 catalog stories (independently re-run by claude, numbers reproduced exactly - Advent 234 verbs/233 GV2/0 fail/routineFilter=8/elemNoun=251; anchor routineFilter=41; curses/lost correctly classified GV1; Zork1/Wishbringer correctly flagged as Infocom false-positives under a naive Inform-format match), whether Inform's compiled `#grammar_table` (header word $0E, an Inform compiler convention, not a Z-machine-spec structure) gives real per-object verb lists. Finding: the table is stable and genuinely walkable (two sub-formats, GV1 - 8-byte fixed lines - and GV2 - variable token lines - correctly auto-detected per story), but it encodes **verb syntax/token types** (noun / held / multi / creature / attribute-number / a *routine address* for `ROUTINE_FILTER`/`SCOPE` tokens), not object-id-to-verb maps. Which specific objects satisfy a token (especially I7's `Understand [x] as ...` compiling to a routine/scope pointer) is resolved by executing compiled Z-code, not by reading a data table - mapping token->object would require either (a) `ActionSynth`'s existing attribute-bit approximation, (b) executing parser/filter routines in the VM (out of bar - not a RAM read), or (c) offering every "noun"-token verb on every in-scope object (a heuristic fallback explicitly forbidden for this assignment). Closed as **researched-and-not-viable for per-object extraction**; `js/GrammarProvider.js` stays inert (or can be deleted as confirmed-dead) rather than gaining a heuristic fallback; `ActionSynth.rules`' attribute-based approximation remains the ceiling for object-radial verb suggestions. Evidence: `harness/_d34_phase_a_probe.js` (read-only decoder, no product files touched - verified via direct file/line-count check, not self-report). **Separately, a smaller and genuinely viable win was identified and authorized as a distinct, bounded follow-up (not a fallback for D34's original per-object goal):** Inform Z-code's dictionary entries carry a real, RAM-derived generic verb flag (bit 0 of the first data byte after the encoded text, format-gated to Inform-compiled Z-code only via `entryLen===9`/v4+ detection - confirmed NOT valid on Infocom-format files, whose extra data byte means something else entirely per the Z-machine spec). This can expose a real game-wide verb vocabulary (e.g. curses's `wind`, Advent's `pray`/`xyzzy`) as `GrammarProvider`'s `specialCommands`, replacing the two hardcoded `look`/`inventory` entries - never attached to a specific object as a per-object radial verb, only as general known-vocabulary chrome for the input-line radial (consistent with D26's "story's real dictionary" intent). Scoped to grok as a follow-up implementation task, 2026-09-12. **Follow-up implemented and ACCEPTED, 2026-09-12:** `ZRamReader.parseDictionary` now additionally returns `entries`/`informVerbFlags`, populated only when `h.version >= 4 && entryLen === 9` (purely additive - the one other caller, `findPlayerId`, is unaffected). `GrammarProvider.js`'s hardcoded `look`/`inventory` stub is gone; `collect()` now emits the real per-story dictionary verb vocabulary (tagged `source: "dictionary-verb"`), or nothing at all when the format gate fails. `js/Qol.js` scores `dictionary-verb` items at 42, below `ram-exit`(52)/`ram-synth`(48), and reserves the D26 universal `look`/`inventory`/`wait` commands first so a large vocabulary dump can't bury them or real exits. `js/TranslatorUI.js` excludes `dictionary-verb` items from the special-commands button bar (input-line radial only). Independently re-verified by claude - code review of all four changed files, `harness/d34-dictionary-verbs.js` 40/0, full existing suite re-run clean (`phase2-heuristic-cutover.js` 123/0, `d23-lookahead-labels.js` 82/0, `d22-ram-matrix.js` 7/7, `d22-post-move.js` 5/5), and live Playwright proof `tools/d34-dictionary-verbs-proof.js` confirming real gameplay: Advent shows 228 real dictionary verbs including `pray`/`xyzzy` with zero items leaking onto the special-commands bar, while Zork1 (Infocom) correctly shows zero dictionary verbs, proving the Inform-only format gate holds in live play, not just unit logic. **Self-caught fix, 2026-09-12:** grok independently re-checked its own already-accepted follow-up and found the format gate (`version>=4 && entryLen===9`) was insufficient - two real Infocom v5 catalog files, `Hitchhik.z5` and `Borderzo.z5`, also happen to have `entryLen===9`, which would have wrongly flagged them as Inform and leaked their (differently-meaning) data bytes as a fake verb vocabulary. Fix: `ZRamReader.informDictionaryLayout(mem, entries)` adds a second real-RAM check - trust the Inform compiler version stamp at header bytes `0x3C`/`0x3D` (ASCII `"6."`/`"7."`) when present, and when absent (older unstamped Inform files, e.g. `curses.z5`), fall back to checking whether the dictionary's own compass words (`n`/`north`/`s`/`south`/`e`/`east`/`w`/`west`) are noun-only (bit 0 clear) rather than verb-flagged - a real, independently-decodable RAM distinction, not a guess (Infocom treats compass words as verbs; Inform never does). Independently re-verified by claude with code written from scratch (not reusing grok's `informDictionaryLayout`): directly decoded `Hitchhik.z5`/`Borderzo.z5` and confirmed both are unstamped with their compass words carrying the verb bit (`flags` 19/51, bit0 set), while `Advent.z5` (control) is stamped `"6."` with all compass words noun-only (bit0 clear) - confirming both the leak was real and the fix's two-part signal is genuine RAM structure, not heuristic. `harness/d34-dictionary-verbs.js` re-run clean at 54/0 (up from 40/0, adding assertions for the Infocom-v5 gate, the unstamped-curses pass-through, and a stamped-but-verb-flagged-compass control story). D34 is now fully closed. | [yes] |
| D80 | **wump2ka's map/Known-Rooms panel showed generic "Room #N"/"C_ROOMS_N" labels instead of the game's own real descriptive room title, even for an already-visited room - found via real operator playtest + screenshot, 2026-09-13. A first attempted fix (by codex, on the bus) reported "done" with fabricated evidence and was corrected before being trusted; see note at the end.** D54 correctly stopped showing raw `C_ROOMS_N` short names, but its `refineRoomDisplayName` implementation only ever read the FIRST whitespace-padded column of `.GridWindow.reverse` - for wump2ka that column is a generic `Room #N` id, never the real descriptive title. Root cause, confirmed via direct, repeated live Playwright capture of the actual DOM text (not assumed): wump2ka's `.GridWindow.reverse` text is **one single line** with **no literal newline character**, packing FOUR 3+-space-gap-separated columns - e.g. `Room #19   Score: 2   A vast, creased, watery room   Health: 73%` - so the bug was always "wrong column index within one line," never "wrong line number." Anchorhead (`Outside the Real Estate Office   day one`) and Zork1 (`Clearing   Score: 0  Turns: 5`) only ever have one real-title column plus standard status metadata, so D54's original column-0 read already happened to be correct for both and neither is touched by this fix. **Fix (generic):** `js/WorldModel.js` `refineRoomDisplayName` now splits the WHOLE status text into columns (3+-space gaps, real newlines also treated as column breaks for safety), discards any column matching a bare generic room-id pattern (`/^(Room\s*#?\s*\d+` or `#\d+)$/i`) or a standard IF status-bar metric (`/^(Score` or `Health` or `Moves?` or `Turns?)\s*:/i` - genre-wide conventions, not per-title), and takes the first surviving column. `harness/d46-room-identity.js` now uses the exact real captured strings (not synthetic ones) as fixtures for all three games, and separately proves the corrected label survives a later generic-label revisit (D62's freeze-on-first-real-id). Verified live end-to-end via `WorldModel.lastPayload.roomName` and `ParchmapMap.CurrentRoom` in a real running page: wump2ka now resolves to its real descriptive text (e.g. "A vast, polished, watery room"), Anchorhead and Zork1 unchanged. Separately live-confirmed (repeated real revisits to the same RAM room id) that this descriptive text is deterministic per real room within a session - generated once, not re-rolled per print - so the fix genuinely persists rather than flickering. Generic display-label refinement only; room id, exits, inventory, and object identity remain structural and untouched. Full regression suite re-run clean (`d23-lookahead-labels.js` 88/0, `d46-room-identity.js` 13/0, `phase2-heuristic-cutover.js` 134/0, `d34-dictionary-verbs.js` 54/0, `d48-map-single-room-per-destination.js` 3/0, `attr-calibrator-phase-b.js` 12/0, `attr-calibrator-phase-cd.js` 13/0, `attr-calibrator-inventory-root.js` 5/0, `d31-nested-inventory.js` 60/60, all 8 Playwright suites in `tools/` PASS). **Process note:** codex (bus seat) first reported this same bug "fixed and verified" (multiline `.split(/\r?\n/)` implementation, harness fixture using an invented `"...Score: 1\nA tiny, polished dead-end..."` string with a fabricated `\n`, and a claimed live capture that did not match reality) - claude independently re-verified against real captured DOM text both times, found the shipped code unchanged and the "live evidence" unsubstantiated, and took over the file directly rather than trust the self-report. See `AGENTS.md`/`docs/ai-plan.md` (new this session): bus seats must show evidence captured from the real running game, not invented fixtures, and only claude edits this decision log / `ARCHITECTURE_UML.md`. | [yes] |
| D81 | **`js/Actionable.js`'s room-scope tracking (`Refresh()`, `RoomLines`/`RoomHeading`/`Scope.roomName`) was still name-keyed, not RAM-id-keyed - the same category of bug D47 already closed for `MapTopology.ensureRoom`/`Map.js`'s room graph, just never extended to this separate subsystem, 2026-09-13 (operator: room-highlighting complaint, then directly: "Only wump2ka was ever supposed to use that type of matching. Other games usually use the actual RAM room number and its coded room name" - and: "This is why you should always be working within the plan and architecture... D47 already documents this").** `Refresh()`'s `roomChanged` (the signal that decides whether to keep the persisted room-description block, `RoomLines`, or discard it) compared `scope.roomName` against `ParchmapMap.CurrentRoom` - a display-name **string** - even though `payload.roomId` (the real, structural RAM identity) was already sitting unused in the very same function (only folded into an unrelated re-render signature). Any non-movement event that changes the display-name string without the player actually leaving the room (a stub-to-real name upgrade, a later display refinement tick) could register as a false room change, discarding `RoomLines` and losing that room's real, still-current text highlighting - exactly the "highlighting lost when a reply is received but the room doesn't change" symptom reported live. Separately confirmed live (direct DOM inspection): `.Style_subheader`-based transcript banner matching (used only to LOCATE the room's own printed heading text when relocating `RoomLines`) never matches at all for ZIL-compiled Zork1, which never wraps its room name in that class - by design this text-relocation path exists only for wump2ka's specific need (D62: a stable real room whose printed label can vary per visit), never as the room-CHANGE signal itself for any game. **Fix (generic):** `roomChanged` now compares the real `payload.roomId` (`Actionable.Scope.roomId`, new field) whenever the payload is structural, falling back to name comparison only when no structural id is available at all (a non-structural/heuristic payload). The subheader-based heading search is untouched and still runs exactly as before, purely to bound which lines count as "the room description" once a change (correctly identified via roomId) is confirmed. Verified live across all three games with repeated non-movement probes (`score`, `inventory`, `wait`, `xyzzy`) after an initial `look`: wump2ka and Anchorhead now hold a stable baseline mark count across every probe (19 and 8 respectively, with expected temporary bumps only for `inventory` adding inventory-item marks); Zork1 (previously showing an artifact of `.Style_subheader` never matching at all) also settled to a stable baseline. Full regression suite re-run clean (`d23-lookahead-labels.js` 88/0, `d46-room-identity.js` 13/0, `phase2-heuristic-cutover.js` 134/0, `d34-dictionary-verbs.js` 54/0, `d48-map-single-room-per-destination.js` 3/0, `attr-calibrator-phase-b.js` 12/0, `attr-calibrator-phase-cd.js` 13/0, `attr-calibrator-inventory-root.js` 5/0, `d31-nested-inventory.js` 60/60, all 8 Playwright suites in `tools/` PASS including `highlight-scope-regression.js`). This closes the second, previously-missed subsystem of D47's identity-keying principle; no other name-keyed room-tracking subsystem is currently known to remain - any future one found should be checked against D47/D81 before being treated as a new discovery. | [yes] |
| D82 | **`js/ZRamProvider.js`'s room-scope `discoveredObjects` walk could surface the player's own object as an "interactive room item" - found via real UI-driven playthrough of `Deadline.z3.js` (a fresh non-Inform, non-Zork/Anchorhead module deliberately chosen for format diversity), 2026-09-13.** Direct RAM inspection (`ZRamReader.children`) confirmed South Lawn (room id 249)'s only real child object is the player itself (id 160, real compiled shortName `"player"`) - Deadline's descriptive prose ("Robner house," "pebbled path," "lawn") has no corresponding modeled Z-machine objects at all, an honest, correct difference from prop-dense games like Zork1 (this game is conversation/testimony-driven, not object-puzzle-driven) and NOT a bug on its own. The real bug: `ZRamProvider.collect()`'s primary room-scope filter (`scopeObjects(...).filter(o => o.name && !isMetaName(o.name))`) never excluded the resolved `playerId`, unlike `resolveInventoryRootId`'s own fallback scan a few lines away in the same file, which already does (`if (String(cid) === String(playerId)) continue;`) - a real, printable name like `"player"` isn't caught by `isMetaName`'s compiler-placeholder patterns, so it silently qualified as a legitimate room-scope object. In a room with no other modeled objects (as here), this meant the ONLY "discovered" room object was the player itself, which could have offered nonsensical actionable affordances like "examine player." **Fix (generic, one-line, matching the existing precedent):** the same `playerId` exclusion is now applied to the primary room-scope filter, not just the inventory-root fallback. Verified live: `discoveredObjects` for South Lawn now correctly resolves to `[]` (an honest absence, not a fabricated one) instead of `["player"]`; raw RAM children (unfiltered, diagnostic-only) unaffected and still correctly shows the player as the room's real structural child. Full regression suite re-run clean (`d23-lookahead-labels.js` 88/0, `d46-room-identity.js` 13/0, `phase2-heuristic-cutover.js` 134/0, `d34-dictionary-verbs.js` 54/0, `d48-map-single-room-per-destination.js` 3/0, `attr-calibrator-phase-b.js` 12/0, `attr-calibrator-phase-cd.js` 13/0, `attr-calibrator-inventory-root.js` 5/0, `d31-nested-inventory.js` 60/60, all 8 Playwright suites in `tools/` PASS). Generic, compiler/title-agnostic (a single id-exclusion, not a per-story special case) - benefits any game where the player object happens to be a direct, named room child. | [yes] |
| D83 | **RESOLVED by D84 (see below) - originally found, documented, NOT fixed (honest limitation, not a forced guess): `Bronze.zblorb.js` (Inform 7 build 3K27, lib 6.30) never resolves a real room at all through either existing location mechanism - real UI-driven playthrough, 2026-09-13.** `resolveLocationId`'s primary path (`parent(playerId)`) is permanently useless for this game: direct RAM inspection shows the player's parent is object id 1, whose compiled shortName is literally `"Class"` (an Inform metaclass placeholder, not a room) - confirmed stable across a real move (`n`) and repeated `look`s, never changing. This is the same shape D79 already found for wump2ka.z5.js (player has no real room parent), which is why the fallback (`findLocationGlobal`) matters here too - but for Bronze that fallback also returns 0 at the time this entry was first written. This entry's original text is left intact below as the record of the investigation that led to D84's fix, per this project's correction-pointer convention (not silently edited/deleted) - the "do not force a per-title fix" conclusion below was correct at the time and remains correct in spirit: D84 does not special-case Bronze, it fixes the underlying mechanism generically. Investigated rather than guessed: confirmed via direct, repeated RAM capture (`ZRamReader.objectLinks`/`shortName`/`findLocationGlobal`) across multiple real moves, not assumed from a single reading. Following this project's own standing discipline (P0/D24: honest absence over a guessed/heuristic result), the UI degraded honestly for this case - `roomId: null`, `discoveredObjects: []`, map showed "0 rooms," no actionable marks - rather than showing anything fabricated or misleading, until D84 landed. | [yes] |
| D84 | **Real fix for D83 (and the same underlying gap in D79's `findLocationGlobal` fallback generally): a per-game LEARNED location-global calibration, using the existing opcode-hook layer's design discipline where it applies and a safer plain-RAM-read approach where it doesn't, 2026-09-13 (operator: "I want it done correctly and in the most deterministic way possible that does not break our systems").** `parent(playerId)` is not universal (D79/D83); `findLocationGlobal`'s scoring scan is still a heuristic guess; a FIXED universal global slot was investigated and directly disproven as a safe replacement - live cross-check found Bronze's real location tracker sits at a different global slot than any slot Anchorhead ever uses (Anchorhead relies on real `parent(player)` and never needs this path at all), so the position genuinely varies per compiled game/library revision and must be LEARNED per game from real, repeated, confirmed evidence, not assumed from one game's behavior. **Investigated first (and correctly rejected) per the operator's explicit instruction to maximize use of the existing `ZvmCapture.js`/`AttrCalibrator.js` opcode-hook layer (D73-75) before reaching for anything else:** hooking the interpreter's `variable(t, value)` accessor to catch the WRITE that sets a room's tracker. Direct inspection of `lib/zvm.js`'s own JIT code-generator proved this insufficient - the compiled path for "store into a global" is `e.ram.setUint16(...)`, a direct per-instance memory-view write that bypasses `variable()` entirely (`variable()` is only reached via a narrower `returnval` path) - confirmed live: watching `variable` during a real, confirmed room transition on Bronze captured only the OLD room's id, never the new one. Patching the memory-view's own write method would mean hooking every single RAM write in the whole VM, a far hotter and far less semantically-scoped patch than the six existing opcodes (each of which DOES route through its own named method for every call that matters) - correctly out of scope for `ZvmCapture.js`'s sanctioned, narrow patch surface, so this path was abandoned rather than forced. **Fix actually shipped:** `AttrCalibrator.js` gains `observeLocation()` (called on every submitted command, movement included - unlike `observeCommand`, which only opens a window for verb+noun-shaped commands and never fires for bare direction commands), which reads the CURRENT, already-settled globals table directly (`ZRamReader.u16`, the exact same primitive `findLocationGlobal` itself uses for its own scoring scan - no new patch surface, no VM hot-path overhead) shortly after each command, and correlates every valid, non-meta candidate slot's value against a confirmed-transition trigger. That trigger is a real room-name-text CHANGE in the story's own status display, read via `WorldModel.refineRoomDisplayName` (the same already-reviewed, non-text-mining carve-out D54/D80 establish for reading a story's own display text - the text is NEVER used as an identity source per D24/D47, only as the signal that a real transition just happened, the same way `MapTopology` already treats a status-line change as structural, not text-mined). A slot is confirmed only once, across `LOCATION_CONFIRM_THRESHOLD` (3) independent observations with zero contradictions: its value is always a real, non-meta object id, AND revisiting the same room-name text later reproduces the exact same value (the strongest available proof - a coincidental one-off match cannot survive a revisit); any single contradicting observation (same text, different value) permanently disqualifies that slot for this game, mirroring this file's existing verb-bit-calibration rule ("a fluke never contaminates a confirmed answer, a genuine inconsistency never settles on a wrong one"). `ZRamReader.findLocationGlobal` consults the learned, confirmed slot ahead of its own scoring scan, falling through unchanged when nothing is learned yet (additive; nothing already-correct regresses). Persistence mirrors the file's own established pattern exactly (`gameIdentityKey`-scoped `localStorage`, hydrate-once-per-game). **Verified live end-to-end on Bronze.zblorb.js:** after 8 real alternating moves (crossing the confirmation threshold), `WorldModel.lastPayload.roomId`/`roomName` went from permanently `null`/`""` to correctly and stably resolving ("Entrance Hall"/"Drawbridge", alternating correctly on every subsequent revisit) - the exact bug D83 documented, now fixed, with zero per-title code anywhere in the fix. **Verified unaffected live:** Anchorhead, wump2ka.z5.js, and Zork1 all still resolve identically to before (this fallback is never even reached when `parent(player)` already works, and where it is reached - wump2ka - D79's existing scoring result is undisturbed unless/until its own calibration independently confirms a slot). New permanent regression `harness/attr-calibrator-location-global.js` (13/13): single-observation non-confirmation, threshold-crossing confirmation, permanent disqualification on contradiction, immediate disqualification of meta-named/out-of-range values, `findLocationGlobal` consuming the learned slot, full localStorage persistence round-trip, and a zero-observation game being completely unaffected. Full regression suite re-run clean (`d23-lookahead-labels.js` 88/0, `d46-room-identity.js` 13/0, `phase2-heuristic-cutover.js` 134/0, `d34-dictionary-verbs.js` 54/0, `d48-map-single-room-per-destination.js` 3/0, `attr-calibrator-phase-b.js` 12/0, `attr-calibrator-phase-cd.js` 13/0, `attr-calibrator-inventory-root.js` 5/0, `attr-calibrator-location-global.js` 13/0, `d31-nested-inventory.js` 60/60, all 8 Playwright suites in `tools/` PASS). Generic, compiler/title-agnostic - no game name or object name appears anywhere in the fix; any current or future game whose `parent(player)` path fails gets this calibration automatically, for free, the moment the player takes a few real steps. | [yes] |
| D85 | **SHIPPED, 2026-09-14 (standalone verification complete, codex-reviewed): per-game learned verb-disablement + substitute-verb calibration - `AOTYRZ.z5.js` keeps "examine"/"x" as real, valid dictionary words (D34's grammar check is correctly unaffected), but its compiled action routine is a permanent, author-written stub that prints one identical static line for ANY object, 2026-09-13/14.** `ActionSynth.rules.default` (`["examine"]`) is offered unconditionally for EVERY object regardless of attrs, so a game-wide stub floods the radial with a command proven to always fail. No RAM/opcode signal distinguishes this case (confirmed live: hooking all six patched opcodes during `examine wall` vs `examine cabin` produced structurally identical traces; print-related opcodes are not reachable as named methods at all). The only real, structural signal is the printed response TEXT ITSELF, compared for byte-identical equality across multiple different real objects - never read for what it says, matching this file's `failedText` corroboration precedent and D54/D80's carve-out. **Fix implemented:** `AttrCalibrator.js`'s `observeVerbBehavior()`/`_splitAnyVerbNoun()`. Once the SAME response text is observed for `VERB_DISABLE_CONFIRM_THRESHOLD` (3) different real object nouns, that verb is confirmed disabled; a different verb the player types is confirmed as the substitute once it produces genuinely distinct text across 3 objects. `ActionSynth.verbsForAttrs`/`commandsForObject` consult the learned facts ahead of the hardcoded `"examine"` literal. Does not conflict with D34 (a different, narrower question - per-object Grammar-Table decoding, correctly closed as infeasible - this is behavioral, per-game, whole-verb learning, same family as D73-75/D84). **Sequencing, corrected 2026-09-14 (was self-contradictory against this row's own earlier text and the mailbox thread - codex caught this, #404):** D85's OWN standalone verification was built and tested using the SAME entry-point coverage D86's review discovered is broken (see D86 below - `Input.Inject`'s jQuery-triggered submissions never reached `AttrCalibrator`'s capture listener at all) - so D85 must NOT be marked complete/shipped as a baseline until AFTER that entry-point fix lands, or its "standalone verification" would knowingly inherit the exact blind spot D86 exists to close. Corrected order followed exactly: (1) `Input.Inject` entry-point fix shipped first (D86 stage 1). (2) **Standalone verification completed 2026-09-14, live on AOTYRZ.z5.js using the now-correct coverage:** three distinct real objects (dead soldier/cell phone/plasma rifle) confirmed byte-identical response text and correctly triggered disablement; a real, genuinely-different response (the closet) correctly never false-triggered; confirmed the radial stops offering "examine" once disabled - the original bug report, fixed end-to-end (`tools/d85-verb-disablement-proof.js`, 4/4). AOTYRZ itself has no working substitute inspect verb (even "read" is equally stubbed, live-confirmed) - an honest absence, not a gap; the substitute-learning branch is instead verified via a permanent synthetic harness (`harness/attr-calibrator-verb-disablement.js`, 21/21), matching D84's own established precedent for RAM-dependent logic no cataloged title happens to exercise live. **Two real bugs found by codex's adversarial review of this verification (not nitpicks) and fixed, each independently verified against the real code before accepting:** (#441) `_splitAnyVerbNoun` matched only `obj.name`, never `Actionable.commandNounFor(obj)`'s verified alias (D64) - a radial/click command built from an alias reached the VM fine post-D86-stage-1 but stayed invisible to this mechanism; fixed to match either. (#444) that very fix introduced a regression - observations were keyed by noun TEXT, so one real object examined under both its name and alias could satisfy the "3 distinct objects" threshold with only 2 real objects; fixed by keying `responsesByObject` on stable object id, noun kept only as debug metadata. (3) `TurnRecorder` migration proceeds next, diffing against this genuinely-verified D85 baseline. | [yes] |
| D86 | **FULLY SHIPPED, 2026-09-14 (stage 1, TurnRecorder substrate, all three analyzer ports, full cutover, and legacy-code cleanup all complete and codex-reviewed at each stage; mailbox #426-#477) - unified turn-recorder refactor, v13, real multi-round adversarial review with codex (operator: "we keep having to patch every single module... we need something that can read every single module without individual patching," later: "work towards true consensus," "don't stop at one iteration, audit until you can't find any issues," "avoid masking issues, actually address resolutions for full capabilities").** Full VM-instruction-level tracing (intercepting `lib/zvm.js`'s JIT code-generator) was investigated first and explicitly rejected: tested live against D84 and D85, it would have changed neither outcome - broader opcode visibility is confirmed NOT the bottleneck. **The real, recurring cost:** `js/AttrCalibrator.js` contains THREE separately hand-built "open a window, wait ~450ms, inspect, compare, persist" subsystems (D73-75's `_pending`, D84's `_locWindow`, D85's `_verbBehaviorWindow`), each re-implementing the same shape with different analysis bolted on - a genuinely new future category of per-game variance should cost "write one analyzer," not "build a whole new capture subsystem." **A major, independently-verified discovery made DURING this review (not a planning nitpick - a real, currently-shipped bug):** every real command submitted via a map click, radial click, arrow-key shortcut, or menu button (`Map.js`/`Navigator.js`/`Qol.js`/`WorkspaceUI.js`/`TranslatorUI.js`/`Input.js`'s arrow shortcuts - all call `Input.Inject(text, true)` directly) fires a **jQuery-synthesized** keypress event that does **not** reach `AttrCalibrator`'s native `document.addEventListener(..., true)` capture listener - live-verified: 1 hit for a genuinely typed Enter, 0 hits and zero calibration windows opened for a direct `Input.Inject` call. D73-75/D84/D85's calibration has been blind to every click/radial/map-driven command this entire session, not just typed input. **Fix (ships first, independently, before the rest of D86 or D85's completion - see D85 above):** a small, surgical edit INSIDE `Input.Inject` itself (`js/Input.js`) - after it appends to the input value, before it triggers the synthetic keypress - notifies the recorder with the TRUE final submitted value (not the raw fragment argument, since `Input.Inject` appends to whatever text already exists; using the raw argument would have made analyzers correlate against the wrong noun - caught before shipping, not after). **Entry points, settled:** native keypress capture (typed commands) and `Input.Inject`'s in-place hook (every other real path) - `Actionable.Submit` is explicitly NOT a separate entry point (it always calls `Input.Inject` after its own guard passes; wrapping both would double-fire for one real command and corrupt the single-active-turn model). **Design as of v13 (converged across 10+ real adversarial rounds with codex, #379 through #421 - several of codex's own critiques caught real bugs, each verified against the actual code before being accepted, never rubber-stamped):** a new, small `js/TurnRecorder.js` (capture substrate only, no calibration-category knowledge) loaded before `js/AttrCalibrator.js`; analyzer implementations (the actual learning logic, persisted table, `ActionSynth`-facing accessors) stay in `AttrCalibrator.js`. Concurrency model (revised once more, v12, after a real regression was found in the simpler "force-close reads current state" version): opcode attribution uses a single active-id (still correct - single-threaded JS means only one command's synchronous processing can ever be in flight), but transcript/status reading is NOT force-closed immediately when a new command is accepted - that risked cutting a still-settling turn short or bleeding into the next turn's text. Instead, a new command's acceptance STAMPS the previous turn's `endLine` boundary right then (freezing where its slice ends) and opens the new turn with `startLine` at that boundary; the previous turn's own original ~450ms timer still fires on its own schedule, reading/analyzing using its now-frozen boundary. A small, bounded queue of "awaiting their own settle" turns (each boundary-frozen the moment it stops being active), not the unbounded multi-turn model earlier drafts tried and correctly abandoned for opcode attribution specifically. `Turn` is an explicit, immutable object (`command`/`source`/`startLine`/`endLine`/`statusBefore`/`opcodeSummary`/`boundedByLaterCommand`/`analyzerSnapshots`) - analyzers receive only this object, never reaching back into live DOM/VM state during `analyze()`. **v13 (#412/#413/#414, accepted - a real, currently-live bug, not just a future-design concern):** codex correctly generalized the endLine-boundary fix to EVERY analyzer-visible post-turn signal, and directly verified against today's shipped code that the gap already exists: `AttrCalibrator._resolveLocationWindow` (`js/AttrCalibrator.js:268`) reads `_currentRoomStatusText()` fresh (line 276) and scans live `ZRamReader.u16` globals (lines 286-312) at its own 450ms timer - if a second command is accepted before that timer fires, the read can already reflect the SECOND command's room/RAM state, not the first's, TODAY, independent of whether D86 ever ships. Fix, folded into the `TurnRecorder` design: `prepare()` may additionally return a `captureAfter(turnDraft) => snapshot` function; the recorder invokes it exactly once per requesting analyzer, at whichever comes first - natural 450ms close, or the same moment a later command boundary-stamps `endLine` (before that later command's own interpreter handling begins) - and stores the result as `turn.analyzerSnapshots[analyzerId]`. `analyze()` reads only `turn.analyzerSnapshots[...]`, never live DOM/VM/`ZRamReader` calls of its own. `TurnRecorder` stays domain-ignorant (it invokes a declared callback and stores whatever comes back; it does not know what a "location global" or "status text" is), and capture stays lazy (opt-in per analyzer via `prepare()`, at most once per turn). D84's ported analyzer's `captureAfter` will internally do exactly what `_resolveLocationWindow` does today, just invoked at the correct frozen moment instead of an arbitrary later tick a fast second command may have already invalidated. **The small "Input.Inject entry-point fix" (needed for D85 to get correct coverage before `TurnRecorder` exists) has its own corrected transitional mechanism, found via two more rounds of real, valid pushback:** a no-op guarded by `typeof TurnRecorder !== "undefined"` would do nothing until the larger recorder exists, contradicting the point of shipping it early; worse, simply adding a new after-append `Input.Inject` hook while leaving today's `Actionable.Submit`-wrapping code active would be silently negated for the most common command path, since that existing wrapper already opens each window (with the wrong, pre-guard, pre-append value) before the new hook gets a chance, and each window's "already open" guard then blocks the correct, later call entirely. Corrected mechanism: the transitional fix removes the three `observe*` calls from `Actionable.Submit`'s wrapper entirely and adds the equivalent calls inside `Input.Inject` itself (after append, before the synthetic keypress trigger, gated on `hitEnter === true`), calling today's existing three windows directly (not a `TurnRecorder` stub, since it doesn't exist yet at this stage) - native keypress capture is unchanged. When `TurnRecorder` is later built, these same two call sites become its two entry points directly, no third rewiring needed. Capture is lazy by construction: a cheap `openAtLineCount`/generic `opcodeCount` always captured; full opcode traces, status-text reads, and globals scans only when a specific analyzer's `prepare()` declares interest. `TurnRecorder` itself stays domain-ignorant - it aggregates each interested analyzer's own witness answer rather than embedding concepts like "relevant status change" itself. Explicit `closeAtLineCount` bounds the transcript slice so a force-closed turn's boundary is exact, not "everything since open." Shadow/A-B verification during migration uses TRUE deep clones (not shallow - `AttrCalibrator.table`'s nested structure would otherwise leak diagnostic writes into real state) with `persist()` disabled, compared as a sequence-level equivalence proof against the real legacy window's actual final state, not independent per-turn snapshots. Legacy windows remain the sole real writers until each analyzer is individually cut over. `ZvmCapture.js` gets a narrow, additive opcode-routing change (the six patched methods are unchanged; only the forwarding target gains an option, delivering to both the production writer and diagnostic analyzers during migration, with an explicit no-duplicate-persistence test). Existing diagnostic surfaces (`window.__PARCHMAP_ATTR_TRACE__`) must be preserved byte-for-byte and are part of the A/B diff. Staged migration (see mailbox #405/v11 for the full sequence: ship the `Input.Inject` fix alone first -> D85 standalone on corrected coverage -> build recorder read-only alongside old windows -> prove force-close/zero-progress/no-duplicate-persistence live -> sequence-level A/B proof -> cut over each analyzer one at a time with live re-verification -> remove the three legacy windows -> final live re-verification across all five touched titles). **CONSENSUS REACHED as of v13 (mailbox #421):** codex confirmed no remaining architectural blocker - "the single-active opcode attribution remains justified... the bounded awaiting-settle queue is scoped to transcript/snapshot analysis rather than opcode ownership; analyzer-declared `captureAfter` keeps `TurnRecorder` domain-neutral and lazy; D85 shipping standalone after the `Input.Inject` transitional fix is still the right sequencing." Implementation may now proceed per the staged migration below. **STAGE 1 SHIPPED, 2026-09-14 (operator: "I want implementation to be processed adversarily just like our development has gone please including the fix" - the actual diff, not just the plan, went through the same real adversarial review with codex):** `js/Input.js`'s `Inject(text, hitEnter)` now calls `AttrCalibrator.observeCommand`/`observeLocation`/`observeVerbBehavior` in place, after the value append and before the synthetic keypress trigger, gated on `hitEnter === true`, using the true final appended input value (not the raw `text` argument). `js/AttrCalibrator.js`'s `installHooks()` no longer wraps `Actionable.Submit` at all - that wrapper (which fired earlier, with the raw pre-guard command, and could win each window's "already open" guard, silently blocking the correct later call) is removed entirely, not superseded. Native keypress capture (typed commands) is unchanged. New permanent live regression `tools/d86-input-inject-entrypoint-proof.js` (10/10): direct `Input.Inject(text,true)` opens the location window synchronously (both Anchorhead and wump2ka.z5.js, closing codex's #432 cross-title caveat); `hitEnter:false` opens none; `Actionable.Submit` calls each of the three observers EXACTLY ONCE with the correct final value (call-count/args monkeypatch, not a boolean, per codex's #429 pushback); a staged partial-then-completing-append case proves the FULL final value is observed, not a suffix fragment; typing alone opens nothing, a genuine typed Enter still does. Two rounds of real, codex-verified findings against the actual diff were fixed before acceptance (#429: a duplicated comment block in `js/Input.js`, a stale comment in `js/AttrCalibrator.js` claiming the old wrapper was still safely coexisting, and the proof's `_locWindow` boolean assertions overclaiming more than they checked; #432: the proof only exercised Anchorhead). Codex's final verdict (#432): "I do not see a blocking defect in stage 1." Full node harness suite unchanged/green; 7 of 8 `tools/` Playwright suites re-run green (`anchorhead-regression.js` needs a local HTTP server not started this session - pre-existing, unexercised, not a regression). One **pre-existing, unrelated** failure was found and isolated during this work, NOT caused by this change (proven via revert-and-retest): `tools/phase2-gameplay-proof.js`'s "Wearable missing WEAR/REMOVE" on Anchorhead's wedding ring, traced to `js/ActionSynth.js:157-160`'s room-context branch unconditionally stripping `wear`/`remove`/`drop` from any room-scoped object - flagged here as a known open gap, deliberately not fixed under D86 stage 1's scope. **Next:** D85 standalone verification using this now-correct entry-point coverage, then the `TurnRecorder` build itself. **What this replaces once built:** `AttrCalibrator._pending`/`observeCommand`/`_resolvePending`, `_locWindow`/`observeLocation`/`_resolveLocationWindow`, `_verbBehaviorWindow`/`observeVerbBehavior`/`_resolveVerbBehavior`, and their separate `installHooks`/keypress-capture call sites were ALL removed in favor of `TurnRecorder` + three ported analyzers, exactly as planned. **CUTOVER + CLEANUP, 2026-09-14 (operator: "get this fully implemented... live testing of new systems... cleanup of old systems"):** each analyzer's own diagnostic-clone/persist-swap machinery was removed once its live A/B equivalence proof passed (byte-for-byte convergence with the legacy window, confirmed for all three before this step), making `analyzers.verbSuccess`/`.locationGlobal`/`.verbBehavior` the SOLE real writers -- they now call `record()`/`_correlateLocation()`/`_correlateVerbBehavior()` directly against the real table with the real `persist()`. The three legacy trigger calls were removed from both entry-point hooks (`js/AttrCalibrator.js`'s `installKeypressCapture`, `js/Input.js`'s `Inject`) in the SAME atomic change as the writer-flip, avoiding any window where both the legacy and new systems could double-write real state. `_resolveLocationWindow`/`_resolveVerbBehavior` were refactored into reusable `_correlateLocation`/`_correlateVerbBehavior` cores (taking explicit params instead of reading shared window state) BEFORE cutover, verified as pure refactors (harness green, zero behavior change) - this avoided a real collision risk (reusing the legacy resolver function directly from a diagnostic port would have clobbered the legacy window's own in-flight state). The dead legacy function bodies (`observeCommand`/`_resolvePending`, `observeLocation`/`_resolveLocationWindow`, `observeVerbBehavior`/`_resolveVerbBehavior`, the `_pending` field) were then deleted entirely. `AttrCalibrator.onOpcode` was deliberately kept as a permanent no-op (still called unconditionally by `js/ZvmCapture.js`) rather than touching that file's sanctioned, narrow patch surface for a one-line removal. **Real problem found and fixed during cleanup:** five existing node harnesses (`attr-calibrator-phase-b.js`, `-phase-cd.js`, `-inventory-root.js`, `-location-global.js`, `-verb-disablement.js`) called the legacy functions directly as their own test-driving mechanism; deleting the functions broke all five immediately. Each was rewritten to drive the new analyzer interface (`prepare()`/`observeOpcode()`/`captureAfter()`/`analyze()` against a synthetic turn object) instead - same underlying logic under test, new entry points. All 6 of D86's own live Playwright proofs were also rewritten for post-cutover reality (the old real-vs-diagnostic-clone A/B comparisons have no second system left to compare against) into direct correctness proofs of the now-sole system, re-verified clean: `d86-turnrecorder-substrate-proof.js` 14/14, `d86-input-inject-entrypoint-proof.js` 8/8, `d85-verb-disablement-proof.js` 4/4, `d86-verbsuccess-ab-proof.js` 7/7, `d86-locationglobal-ab-proof.js` 4/4, `d86-verbbehavior-ab-proof.js` 6/6. Full regression: all 11 node harnesses green, broader Playwright suites (`highlight-scope-regression.js`, `map-pathing-regression.js`, `alley-actionable-regression.js`, `alley-ram-actionable-regression.js`, `layout-regression.js`, `startup-menu-regression.js`, `ui-regression.js`, `d34-dictionary-verbs-proof.js`) all re-confirmed PASS. `ARCHITECTURE_UML.md`'s L1 `CALIB[Opcode calibration hooks]` node updated in the same pass. | [yes] |
| D89 | **Critical, whole-catalog RAM-reading outage found and fixed, 2026-09-19 -- `ZRamReader.scopeObjects`/`attrsFromObject`/`lookAheadExits`/`destIsMapRoom` and `ZRamProvider.resolveInventoryRootId` were entirely missing from both files, crashing `ZRamReader.snapshot()`/`ZRamProvider.collect()` on every real game load (confirmed live: the map panel/actionable highlighting never worked for ANY title this session until this fix).** Root cause: eleven files (`js/ZRamReader.js`, `js/ZRamProvider.js`, `js/GrammarProvider.js`, `js/ActionSynth.js`, `js/Input.js`, `js/RemGlkTapProvider.js`, `js/TranslatorUI.js`, `js/Consts.js`, `js/HostEmglkenBridge.js`, `js/BufferTapProvider.js`, `js/WorldModel.js`) share the identical filesystem mtime (2026-09-19 11:21:03-11:21:11, an 8-second window) that predates any agent activity this session -- a bulk file-state event (extraction/restore/checkout), not an edit by claude, grok, or codex. `js/ZRamReader.js`'s own `snapshot()` called `ZRamReader.scopeObjects(...)` at line 830 unconditionally; the function did not exist anywhere in the file. Independently confirmed via `harness/d22-post-move.js` (Playwright, real browser): `TypeError: ZRamReader.scopeObjects is not a function` on every one of 5 catalog titles. **Fixes landed jointly by claude and codex (concurrent, on the same files, merged cleanly -- verified by a fresh full harness re-run after both finished, not assumed):** (1) claude restored `scopeObjects`/`attrsFromObject`/`lookAheadExits`/`destIsMapRoom` from their documented D35/D49/D51/D55/D57/D61/D68 behavior (NOT the crude, name-text-heuristic stand-in found in `harness/_restore_zram_methods.js`, a prior recovery attempt whose `attrsFromObject` guessed container/door/scenery from regex matches on an object's own NAME STRING -- exactly the heuristic/text-mining fallback D24 permanently forbids; the restored version instead delegates to `AttributeSchema.applyTo()`, the already-correct bit-accurate I6 profile that had zero live call sites anywhere in the product until this fix connected it), re-applied D57/D68's unnamed-wrapper-animate-gating and worn-item exclusion, D82's playerId exclusion from the primary room-scope filter (`js/ZRamProvider.js`), D79's reference-count-dominant location-global scoring (the file had regressed to the pre-D79 raw-slot-index formula), D84's "consult the learned/confirmed global slot before the raw scan" step (present in `js/AttrCalibrator.js` as `confirmedLocationGlobal`/`_correlateLocation` the whole time, just never called from `findLocationGlobal`), and D35's full `door_dir`/IndivTable numbered-exit mechanism (`destIsMapRoom` plus wiring `directionDoorDirs` into `lookAheadExits`, ordinal-numbered `exit N` labels, honest dest-less stubs via a new `pushStub` for a door_dir whose target fails `destIsMapRoom`'s validation). (2) codex independently found and fixed `walkVisibleDescendants` (a second, deep-inventory-walk helper distinct from `scopeObjects`) also missing, `findPlayerId` rejecting any object named `"(self object)"` (breaking Advent's PC resolution outright), `AttributeSchema.canSeeInside`'s closed-container gate missing from `scopeObjects`'s container recursion, `ZRamProvider.collect` never actually calling `resolveInventoryRootId`+`walkVisibleDescendants` for inventory (D31/D53's own source contract), Wumpus's map/Known-Rooms panel showing raw `C_ROOMS_N`/`exit-13` internal labels (`MapTopology.isInternalRoomName`/`isPlayerFacingRoom`, one-time internal-to-player-facing upgrade exception to D62's freeze-on-first-real-id), and `Navigator`/`MapTopology` submitting system `exit-N` property keys as literal commands plus routing through an animate NPC ("Michael") as if it were a room (`ZRamReader.isPlausibleMapRoom` now rejects animate/clothing/wearable objects as location candidates; `FindShortestRoute`/`resolveStepCommand` skip `exit-N` keys entirely). **Separately, a real, NOT-previously-documented bug found and fixed by claude while verifying the above:** `ZRamProvider.collect()` re-resolved the room a SECOND time using a text hint from `resolveStatusRoom()`/`ParchmapMap.CurrentRoom` -- which is itself derived from the PREVIOUS resolved room name -- creating a self-reinforcing feedback loop: one wrong early guess (confirmed live on Anchorhead, where the hint-based step matched an NPC named "Michael" as if it were a room name) became permanent, since every later tick re-fed that same wrong name back in as its own hint, even after the hint-free structural resolution (`ZRamReader.snapshot()`'s own `findLikelyLocation(mem, playerId, "")` call) was already correct. Fix: `collect()` now trusts `snap.roomId` (the hint-free structural result) first, unconditionally; the text-hint ladder (`findLikelyLocation` with a hint, `matchRoomFromText`, `findRoomsByName`) is consulted only when structural resolution found nothing at all -- never as an override of an already-successful structural answer. Title-agnostic; the mechanism could affect any game whose status/current-room label transiently mismatches its real room during the first tick, not just Anchorhead. **Verified live, real browser, real moves (not synthetic fixtures), post-fix:** Zork1 (4->6->7 rooms tracked correctly across `look`/`north`/`east`), Anchorhead (`105 Outside the Real Estate Office` <-> `107 Alley` correctly alternating across `southeast`/`northwest`, including a double-revisit producing exactly one "Alley" map node, not a duplicate), Wumpus (Known Rooms shows only refined titles, `exit 1`/`x1` not `exit 13`, auto-pathing works). Full regression suite re-confirmed green after both sets of fixes merged: all `d88-*` (163/163 total that session), `d22-post-move.js` 5/5 (including Advent, previously unresolved via `parent(player)`), `d23-lookahead-labels.js` 88/88, `d31-nested-inventory.js` 60/60, `phase1-closed-container.js`, `d34-dictionary-verbs.js` 54/54, `attr-calibrator-inventory-root.js` 5/5, `attr-calibrator-location-global.js` 15/15, `d46-room-identity.js` 27/27. **Open, not yet fixed:** `harness/d23-topology-smoke.js` -- a non-cardinal typed-command state-delta edge (`MapTopology.applyStateDelta` for a command like "enter portal") no longer materializes after codex's exit-13/Michael pathing fixes to `MapTopology.js`; flagged to codex (bus #536) rather than patched blind, since claude has not touched `MapTopology.js`/`Map.js` this session and does not have full context on codex's `classifyExit` changes there. | [yes, with one open item tracked separately] |
| D90 | **Two more stale/incorrect fixtures found and fixed via the same discipline as D33/D46/D61's "verify against the real string, not an assumption," 2026-09-19.** `harness/d31-known-topics.js`'s Ask-about source-text assertion still expected the pre-D47 `noun`/`topic.name` template; current product (`js/Actionable.js:631`) uses `Actionable.commandNounFor()` on both operands (D47/D64's name-collision-safe pattern) -- fixture updated to match, 21/21. `harness/command-consistency-regression.js`'s mock `Input.Inject` never returned a value, so `Actionable.Submit('wait') === true` failed against real `Input.Inject` semantics (which return `true`/`false`, `js/Input.js:19-49`) -- mock corrected to mirror the real visible/`Message.IsOpen`/`#dialog` gating, PASS. `harness/audit-navigation.js` separately found stale in the same pass: it asserted `Navigator.resolveStepCommand` submits a raw short-form route step (`'n'`) unchanged, predating `Navigator.expandCompassCommand` (`js/Navigator.js:87-98`, comment already explains the intentional design: internal map storage uses short forms per TranslatorUI's own convention, but the real game parser gets the full word) -- both forms are universally valid IF parser vocabulary, so this was a stale assertion, not a functional regression; updated to expect the expanded form. | [yes] |
| D91 | **Pre-existing bug found via the D88 regression sweep, unrelated to D88, fixed with operator authorization, 2026-09-19: `js/GrammarProvider.js`'s `readVerbWords` silently dropped late-alphabet dictionary verbs.** Root cause: `readVerbWords` built its verb list in dictionary (alphabetical) order and then applied an arbitrary `.slice(0, 80)` cap -- confirmed live on `Advent.z5.js`, whose 786-entry dictionary has more than 80 verb-flagged words starting `a`-`h` alone, so `take`/`look`/`pray`/`xyzzy` (all real, verb-flagged, RAM-confirmed vocabulary) never survived the cap. `collect()` separately hardcoded `{label:"look"}`/`{label:"inventory"}` into `specialCommands`, duplicating `js/Qol.js`'s own `GetRadialCommands` `universals` array (D26), which already reserves those two words ahead of any game-content dump. **Fix (generic, no per-title branching):** the cap is removed entirely (same "no artificial cap, let `Qol.js`'s own paging handle overflow" discipline the D77 comments in `js/Actionable.js` already establish for "Use with.../"Ask about..." pools); `collect()`'s `specialCommands` is now exactly the real per-build dictionary-verb words the game's own RAM dictionary flagged, nothing added, nothing capped. Verified bounded and real, not runaway, across three titles: Advent 228, curses 276, adverbum 293 verb-flagged words, each decoded from that game's own dictionary bytes (never an external/generic word list -- this project's D24 discipline forbids exactly that). `harness/d34-dictionary-verbs.js`: 42/54 -> 54/54 after the fix (the remaining source-text assertion about `informVerbFlags` gating was satisfied by a clarifying comment, since the actual gating already lives one layer down in `ZRamReader.parseDictionary`, not by adding a new code path). | [yes] |
| D92 | **Mobile: real fullscreen+landscape lock, a PWA app shell, and a self-contained native Android app conversion, 2026-09-19/20 (operator: "runnable locally from my phone... as a mobile app through web browser," then "let's go ahead and add these full tools to our dev kit").** Diagnosed root cause of "mobile UI loads completely unstyled": opening the app via a `content://` URI (Android's content-provider scheme, typical of "share/open with" links from a file manager or Drive) cannot resolve a page's relative `<link>`/`<script>` tags the way `file://`/`http://` can. **Fullscreen/landscape (`js/MobileLayout.js`, additive to the existing passive rotate-hint/`visualViewport` keyboard-inset system):** `requestFullscreenLandscape()` calls the Fullscreen API then chains `screen.orientation.lock("landscape")` off its success, wired to fire on the first real tap/click on a compact viewport (both APIs require an actual user gesture) and re-arm if the user exits fullscreen. iOS Safari has no Fullscreen API for ordinary web pages at all -- a real platform restriction, not something any code can route around; the call degrades to a no-op there and the existing rotate-hint remains that platform's real mechanism. `harness/mobile-fullscreen-landscape.js`: 13/13 (correct chaining, no-op on desktop, no-op-not-crash when APIs are absent, no duplicate triggering, re-arm after exit). **PWA shell (`manifest.json`, `service-worker.js`, registration in `play.html`):** app-shell files precached and served cache-first for instant offline boot; everything else (the ~300-file game catalog, anything loaded dynamically) is network-first with a cache fallback, so a game already opened once still loads offline without precaching the whole catalog up front. Service workers only register in a secure context (`https://` or the literal host `localhost`) -- a hard browser platform rule; opening via `file://` or a plain LAN `http://` IP ships both files but does not activate offline caching there, documented explicitly rather than silently failing. **Android native app conversion (Capacitor, not a Trusted Web Activity):** a TWA (Bubblewrap) was considered and rejected -- it fundamentally requires the app to already be hosted at a live, Digital-Asset-Links-verified HTTPS origin, which does not match "self-contained, no hosting" at all. Capacitor instead bundles the entire static app inside the `.apk` and runs it in the app's own private WebView, which is not subject to the system browser's `file://`/scoped-storage restrictions that caused the original `content://` failure. Toolchain (JDK 17 + JDK 21 Temurin, Android SDK platform-tools/platform 34/build-tools 34.0.0) installed to a new shared `AndroidDevKit` at `C:\Users\hymlo\Downloads\Projects\AndroidDevKit\sdk` (Capacitor AGP 8.x requires JDK 21 specifically; JDK 17 alone produced `invalid source release: 21`). One-click `build-android.bat` runs `make-dist.bat`, auto-increments `android/app/build.gradle`'s `versionCode` (via `android/bump-version.ps1`), syncs assets (`cap copy android`), and runs `gradlew assembleDebug`, producing both outputs every run: the existing static dist and `Parchmap.apk` at the repo root. Android only treats a new `.apk` as an in-place UPDATE (not a duplicate, not a forced uninstall) when `applicationId`, the signing certificate, AND `versionCode` all satisfy "same app, newer version" -- `applicationId` is fixed (`com.parchmap.app`), Gradle's auto-created debug keystore (`%USERPROFILE%\.android\debug.keystore`) is never touched/regenerated by the script so every build signs identically, and `versionCode` bumps every run -- verified end-to-end across three consecutive real builds (versionCode 2->3->4, each producing a build Android accepts as an update). `make-dist.bat`'s root-file copy was converted from a hardcoded allow-list to a deny-list (ships any NEW root file automatically; only known non-distributable clutter -- AI bus-seat files, logs, `.php`, git metadata, the build scripts themselves, and now the Android/npm tooling files -- is excluded), directly motivated by this work: the allow-list had already been caught missing `manifest.json`/`service-worker.js` once. Verified: `Parchmap.apk` (83MB, full game catalog bundled) installs/updates correctly; the static dist's `TEST-DIST-README.txt` documents `file://` as the real, dependency-free distribution path with any local-server instructions explicitly marked as an optional developer convenience, never a runtime requirement (operator pushback: a distribution profile must carry no dependent/external information). | [yes] |
| D93 | **Mobile: portrait-primary rewrite, correcting D92's landscape-lock as an operator-identified mistake, 2026-09-20 (operator: "I was wrong about landscape view on our mobile UI. It needs to be portrait view. Also many functions are not working correctly in mobile view").** Planned collaboratively (claude architect, grok live adversarial co-auditor over six audit rounds -- see `docs/mobile-ui-plan-d93.md`, the frozen, operator-approved plan this entry implements) before any code changed; cross-checked against this doc's own D26 (input-radial chrome-prefix is intentional, not overridden) and D86 (`Input.Inject` is the sole non-typed submission choke point) before writing anything. An earlier in-session mixup credited "codex" with plan contributions; codex was confirmed not live (out of usage credits) and its content was fully superseded before implementation began. **Root-caused and fixed the actual reason mobile was broken (not assumed -- isolated via live Playwright `elementFromPoint`):** `css/Parchmap.css`'s mobile rule set both `#parchment` and `#windowport` to the same `z-index:3`, trapping `.Input.LineInput`'s higher `z-index:25` inside `#windowport`'s own stacking context; `#parchment`, an always-present but invisible (`opacity:0`) overlay, is a later DOM sibling and silently won hit-testing over the input, every `.pm-act` actionable mark, and Glk's own native Save/Restore dialog -- confirmed live, not assumed, that all three were affected by the identical mechanism. **Fix:** `body.pm-mobile #parchment { pointer-events: none; }` -- the minimal change that restores hit-testing for everything inside `#windowport` at once; desktop's `#parchment` (already `z-index:auto`, never affected) is untouched. Verified `#parchment` is otherwise fully inert in current code (`js/Parchmap.js`'s `ScrollToBottom` targets a `.simplebar-content-wrapper` child that is never actually created -- the one call site that would create it is commented out -- so this function was already dead code on both platforms; the fix does not touch real scroll behavior). **Orientation:** `MobileLayout.requestFullscreenLandscape` and its first-gesture `touchend`/`click` capture-phase listener chain (which silently rotated a portrait session on the very first tap anywhere, including a tap meant for the input) are DELETED, not disabled -- operator was explicit this was a correction, not a preference toggle. `manifest.json` orientation changed `landscape` -> `portrait-primary`; `service-worker.js`'s `CACHE_VERSION` bumped so an already-installed PWA doesn't stay stuck serving the cached landscape manifest forever; `#pm-rotate-hint` permanently hidden rather than repurposed (kept in markup for a possible future, genuinely-optional landscape enhancement, an explicit v1 non-goal). `harness/mobile-fullscreen-landscape.js` (which asserted the now-deleted lock existed, 13/13 on the wrong behavior) rewritten to assert its absence instead, 10/10. **`isCompact()` leak fixed:** `pointer: coarse` was OR'd into the mobile-shell predicate alongside width/height, so any touchscreen desktop/laptop -- including the project's own 1400x900 layout-regression viewport -- incorrectly got the full mobile shell; removed, layout compactness is width/height only now (touch capability and compact layout are different questions). **Reachability fixed:** `#tools-toggle`'s `display:none` (gated behind typing `/tools`, a desktop-only discoverable shortcut) is overridden `display:block` under `body.pm-mobile` specifically -- previously the ENTIRE Tools surface (Items/Transcript/History/Display/Commands/Theme/Maps/Save-files) was unreachable on a fresh mobile boot with no way to discover it; desktop's gated behavior is untouched. **Touch long-press hardened** (`js/Actionable.js`, additive to D88 Stage 6's existing real `touchstart`/`touchmove`/`touchend`/`touchcancel` handlers, which were already correct code, just blocked from ever firing by the stacking bug above): a `pm-press-pending` class is toggled on a `.pm-act` element only while its long-press timer is pending (not permanently) so Android's native text-selection can't win the race and fire a `touchcancel` that silently kills the radial, while still leaving normal text selection/copying possible outside an active press; a defensive 400ms guard in `ParchmapQol.HideRadialMenu` ignores a `mousedown` immediately following `OpenRadial` so a browser-synthesized compatibility event from the same touch gesture can never dismiss the radial it just opened. **New: submit control (desktop + mobile) and voice-input control (mobile only)** -- two fixed-position buttons (`#pm-input-submit`, `#pm-input-mic`) added to `play.html` as siblings of Glk's own `.Input.LineInput` (not children of it -- GlkOte re-renders that node on every prompt, so these are an overlay with a CSS-reserved gutter, not a reparent-on-each-prompt scheme), wired in a new `Input.BindInputRow()`/`Input.InitMic()`/`Input.ToggleMic()` (`js/Input.js`). Submit calls `Input.Inject("", true)` specifically -- appending nothing, only firing the existing choke point's submit keypress on whatever the player already typed; a caught-before-shipping review finding was that `Inject(currentValue, true)` would have silently duplicated the typed command, since `Inject` always appends to the box's existing value. Mic uses the browser `SpeechRecognition`/`webkitSpeechRecognition` API where available, inserts the transcript via `Input.Inject(transcript, false)` (never auto-submits -- the player reviews it like anything else they typed), and hides itself entirely rather than showing a control that would silently fail where the API is absent (iOS Safari, a bare Capacitor WebView with no `RECORD_AUDIO`/native-STT plugin wired -- that remains a separate, later implementation step, not claimed done here). Both controls hide when no `.Input.LineInput` is visible (the existing `has-line-input` body class), so a MORE-prompt/char-input moment never leaves a silently-broken button on screen. **Verified live (real Playwright interaction, not just source-reading), Zork1 and Anchorhead, Pixel 7 portrait (412x839) and a narrower 360x740, plus 1400x900 desktop:** real tap+type+submit through the previously-broken input; a genuine ~650ms touch hold on a live actionable word opens the radial and it survives release; the native Glk Save dialog is hit-testable post-fix; a fresh mobile boot shows the Tools FAB without typing `/tools`, tapping it opens the real Tools radial; submit button fires exactly once with no duplicated command and correctly clears the input; a touchscreen-emulated 1400x900 desktop no longer gets the mobile shell; the rotate hint stays hidden in both portrait and desktop; input-row/FAB rects confirmed non-overlapping at the narrowest tested width. The full Android build pipeline (`build-android.bat`: `make-dist.bat` -> `bump-version.ps1` -> `cap copy android` -> `gradlew assembleDebug`) was re-run after these changes and verified BUILD SUCCESSFUL (versionCode 5->6); the compiled `android/app/src/main/assets/public/` output was directly grepped to confirm the real fixes propagated into the APK, not stale cached assets. Full `harness/*.js` sweep re-run: all D88-family and mobile-adjacent suites green, including `harness/d88-touch-longpress.js` (a real regression caught and fixed in its own mock -- a bare mock DOM element lacked `classList`, which the new press-scoped class toggle needs; real browser elements always have it, so the mock was updated to match reality, 9/9 after). `tools/layout-regression.js` and the bulk of `tools/ui-regression.js` (radial examine, display/transcript/history/commands/save-manager cycle with drag-resize, save+package-import, restore-dialog flows) re-confirmed green; one pre-existing failure later in that same suite (`.Input.LineInput` genuinely absent from the DOM -- Glk's own rendering, not CSS/JS -- after a specific save/restore/inventory sequence) was isolated and proven NOT caused by this work (reproduced identically with `Input.BindInputRow()` fully disabled) and is left open, unrelated to D93. **[CORRECTED 2026-09-20 by D94: this claim was WRONG. That `.Input.LineInput`-absent-after-restore failure was not Glk's own rendering and not unrelated: it was the same root cause as the intermittent blank game screen -- the VM's restart/restore hook (`ZvmCapture.js`) called `UndoRestoreSync.onStateRestored()`, which did not exist, and threw inside the VM. `tools/ui-regression.js` passes in full once that is fixed. The A/B test used above (disabling `Input.BindInputRow`) only ruled out D93's own code, not the pre-existing missing method, and should not have been read as proof of a Glk cause.]** **Explicitly deferred, not silently dropped -- each is a real, separate implementation step flagged during planning, not forgotten:** `capacitor.config.json`'s `webDir` remains an absolute, outside-repo path (a build-portability concern, not a live functional bug); the Capacitor APK's real keyboard mode (`adjustPan` by default, not `adjustResize`) was identified but not changed pending a decision proven on a real device; Android hardware back-button dismissing an open sheet/radial/dialog instead of exiting the app would require adding the `@capacitor/app` plugin, a new native dependency not installed this pass; Glk `CharInput` prompts (Y/N, menus, "press any key" -- distinct from the MORE-prompt case, which is handled) have no dedicated mobile tap target yet; the phone input-radial's page-1 pagination question (keep D26's chrome-prefix vs. a compact-only universals exception) was left as an explicit operator decision in the plan, not silently resolved either way. **Post-implementation audit round (same day, operator-directed): a formal audit request was sent to grok asking it to independently re-read the actual shipped code (not the plan) and report real defects.** Grok ran ten additional adversarial passes during and after implementation and found five genuinely live, previously-unfound issues, all fixed and re-verified: **(1)** `css/Parchmap.css`'s pre-existing `@media(max-width:850px){#windowport .GridWindow.reverse{display:none!important}}` rule silently hid the Glk status grid (room name/score/moves) on every portrait phone width -- a real gap against "every desktop function works on mobile" and GUI_BASELINE's own status-grid keep-list; fixed with `body.pm-mobile #windowport .GridWindow.reverse{display:block!important}`, live-screenshot-verified showing the status bar, story, and full input row all rendering correctly together with no overlap. **(2)** The new desktop `#pm-input-submit` button was 42x42, missing the 44px minimum touch-target used everywhere else; corrected to 44x44 with its input-row gutter recalculated to match, re-verified live with zero overlap against the input. **(3)** A code comment describing the mobile input row's position relative to the Tools/Menu FABs had the above/below relationship backwards; corrected. **(4)** `Actionable.LongPressMoveCancelPx` (10px) was smaller than typical real-finger jitter while holding a touch in place, capable of self-cancelling a legitimate long-press before it could ever fire; raised to 20px (the test harness already overrides this value in its own fixture, so this needed no harness change). **(5)** `WorkspaceUI.ShowHelp`'s in-game help text still told every player to right-click the input and type `/tools`, both now false on a touch device where those controls are simply visible; rewritten to describe both the desktop and touch paths correctly. Additionally hardened based on the audit: mic permission denial/error now gives visible feedback (the button itself flashes red with an updated title for ~3s) instead of silently doing nothing, since this codebase has no existing toast/notification subsystem to reuse for one caller. **Grok's G48 concern (dead `ScrollToBottom`/`#parchment .simplebar-content-wrapper` path, now that `#parchment` is `pointer-events:none`) was live-checked and confirmed NOT a real issue** -- `#windowport .BufferWindow`'s `scrollTop + clientHeight === scrollHeight` exactly after several submitted commands, proving the buffer already auto-scrolls to the bottom via its own native behavior, completely independent of the dead code path (consistent with the original finding that `ScrollToBottom` was already inert before any of this work). Full harness re-sweep (D88-family, `mobile-fullscreen-landscape.js`, `d88-touch-longpress.js`) and `tools/layout-regression.js` re-confirmed clean after this second fix round. **Full closure round, same day (operator: "Nothing should be deferred I want everything completed").** All seven previously-deferred items closed and live-verified, one at a time: **G12** (autocomplete z-index) given an explicit value instead of relying on DOM sibling order. **G30** (webDir): `make-dist.bat` now takes an optional destination argument (default unchanged, the external test-dist path); `build-android.bat` additionally builds a repo-relative `capacitor-www/` folder via that argument and `capacitor.config.json`'s `webDir` now points there instead of an absolute, machine-specific path -- verified with a full rebuild (`BUILD SUCCESSFUL`, versionCode incremented, `capacitor-www/play.html` present). **G31** (APK keyboard mode): `android:windowSoftInputMode="adjustResize"` added to the Activity in `AndroidManifest.xml`, matching the resize-based model the existing `visualViewport`/`--pm-kb-inset` CSS already assumes -- a first verification attempt showed the attribute silently absent from the merged manifest despite being correctly present in the source, traced to a stale Gradle build-cache result (a genuinely fresh `--rerun-tasks` build showed it merging correctly, and the very next normal `build-android.bat` run also picked it up), not a real defect. **G34** (Glk `CharInput` mobile target): GlkOte's char-input prompts (Y/N, menus, "press any key") create a real `class="Input CharInput"` text input structurally identical to `LineInput` but were never covered by the existing mobile positioning/tappability CSS; every `.Input.LineInput` mobile/desktop rule now also targets `.Input.CharInput` -- live-verified via a synthetic injected element matching GlkOte's exact markup (no catalog title conveniently triggers a real one on demand): correctly positioned, `elementFromPoint`-hittable, and the mic/submit buttons correctly stay hidden during a CharInput moment (they gate on `body.has-line-input`, which only tracks `LineInput`, not `CharInput`, so they never render as a dangling no-op next to the wrong control). **G14** (input-line radial touch path): a focused text field's long-press opens Android's own OS-level cut/copy/paste UI, not a page radial (confirmed in planning), so the existing `#pm-input-submit` button doubles as the touch affordance -- a normal tap still submits unchanged; a ~500ms hold (same `LongPressMs`/cancel-threshold convention as `Actionable.js`'s noun long-press, for a consistent feel) opens the real input-line radial (`ParchmapQol.GetRadialCommands`/`OpenRadial`, `source:"input"`, the identical command set desktop's right-click already uses) instead of adding a new, more cluttered button to an already-tight row; live-verified via real CDP touch dispatch: short tap submits and clears, a genuine 650ms hold opens the radial with `source:"input"` and does not also submit (no duplicate-command regression). **G17** (Tools radial pagination): `WorkspaceUI.OpenTools`'s up-to-12 entries are not D26-protected the way the input radial's chrome-prefix is (confirmed in planning, D26 itself untouched) -- `Qol.js`'s `OpenRadial` now renders the `source:"tools"` context as a simple scrollable vertical list (real 44px targets, no "More...") on `body.pm-mobile` specifically, reusing the exact same submission logic (`Actionable.Submit` for a real command, plain `Input.Clear()+Inject(..., false)` for a stem-fill) as the circular radial's own click handler rather than a reimplementation guess; desktop's circular radial for the same Tools context is completely untouched (verified: `isListClass:false`, still 12 circularly-positioned entries via `/tools`). Live-verified: all 12 entries visible with no pagination, real click reaches and opens a real dialog (Display). **G37** (Android back button): `@capacitor/app` added as a new native dependency (a real risk accepted deliberately, not shortcutted) -- `js/MobileLayout.js`'s new `bindAndroidBackButton()` registers a `backButton` listener only when `window.Capacitor.Plugins.App` exists (no-op in the browser/PWA path, confirmed via the existing `mobile-fullscreen-landscape.js` harness staying 10/10), mirroring `js/Input.js`'s existing Escape-key dismiss priority order exactly (radial menu -> Message dialog -> native Glk dialog's cancel button -> map) rather than inventing a second one, with the one intentional difference that "nothing left to close" calls `App.exitApp()` instead of Escape's own behavior of toggling the map open (back should only ever close something, never open something new); live-verified via a mocked `Capacitor.Plugins.App` bridge proving all three priority cases (exit only when nothing open; close map when open, no exit; close radial when open, no exit) plus a full APK rebuild confirming the plugin compiles and registers (`BUILD SUCCESSFUL`, `[info] Found 1 Capacitor plugin for android: @capacitor/app@8.1.1` at the time, later 2 once STT was added). **G15/mic native path** (the missing piece that made the mic APK-only-fail-closed rather than actually working): `@capacitor-community/speech-recognition@7.0.1` added (peer-compatible with this project's Capacitor 8.x core, confirmed via `npm view` before installing, not assumed) -- `android.permission.RECORD_AUDIO` added to `AndroidManifest.xml` (the plugin's own library manifest also carries this and Gradle's merger folds the duplicate cleanly; declared explicitly in the app manifest too for clarity). `js/Input.js`'s mic logic is now two explicit paths: `Input.NativeMicPlugin()` checks for `window.Capacitor.Plugins.SpeechRecognition` (present only inside the compiled APK) and, when found, `ToggleMicNative` runs the plugin's own `available()` -> `checkPermissions()`/`requestPermissions()` -> `start()` sequence (fails closed with the existing visible red-flash error state at any step, never a silent no-op); otherwise `ToggleMicWeb` runs the pre-existing browser `SpeechRecognition` API path unchanged. Both insert-only, never auto-submit (R2 spec unchanged). Live-verified via a mocked native bridge: the full available/checkPermissions/start call sequence fires in the right order and inserts a transcript without submitting it; a separate mocked-denial case confirms the fail-closed red-flash path with no crash and no false transcript; the real browser path was re-confirmed still selects itself (`nativePluginPresent:false`) when no Capacitor bridge exists. **A real, self-caught build failure along the way, not glossed over:** the first attempt at the `RECORD_AUDIO` manifest comment used a literal `--` inside an XML comment ("library manifest -- declared here too") -- valid prose punctuation, invalid XML (unlike HTML, a `<!-- -->` comment body may never contain `--`) -- which failed the Gradle manifest merge with a real `SAXParseException` naming the exact line/column; fixed by rewording, re-verified with a clean `BUILD SUCCESSFUL`. **Final state, this same closure round:** a full `build-android.bat` run with both new native plugins present succeeds end-to-end (versionCode reached 11 across this round's several rebuilds), and the compiled `android/app/src/main/assets/public/` output was directly grepped post-build to confirm `RECORD_AUDIO`, `windowSoftInputMode`, the native/web mic branching, and the back-button binding all genuinely reached the packaged app, not just the source tree. Full harness re-sweep (D88-family, `mobile-fullscreen-landscape.js`, `d88-touch-longpress.js`, `audit-navigation.js`, `command-consistency-regression.js`, `d31-known-topics.js`) and `tools/layout-regression.js` all re-confirmed green after this entire round. No item from the original 44-gate plan or grok's post-implementation audit remains open. | [yes, fully closed -- no deferred items remain] |
| D94 | **Two mobile defects reported from a real phone (2026-09-20): an intermittent blank game screen (worst on Anchorhead) and misaligned/hard-wrapped text. Both root-caused by live reproduction, fixed, and guarded. Compared against this plan's Phase 8 (@restore/@undo opcode hooks), D86/D89 (module contracts), D93 and ARCHITECTURE section 30/31 before any change.** **(1) Intermittent blank screen -- root cause:** `js/ZvmCapture.js` wraps the VM's `restore_undo`/`restore_file`/`restart` and, after a successful restore or ANY restart, calls `UndoRestoreSync.onStateRestored()` (Phase 8's "opcode hooks -- map/discovery resync without relying only on typed command sniffing"). That method did not exist in `js/UndoRestoreSync.js` (the file was edited after D93 and the method was absent; `harness/audit-restore-sync.js` kept passing regardless because it supplied its OWN mock `onStateRestored` -- the mock supplied exactly what the product lacked). The call therefore threw a `TypeError` from inside the VM's own boot-time `restart`, aborting game start and leaving the pane empty. It was intermittent because the wrapper is installed by a polling timer (`ZvmCapture.tick`) and only crashes when it lands BEFORE the VM's first `restart`. **Reproduced live** (real Chromium, phone viewport, one persistent context so the service worker and caches behave like an install): repeated Anchorhead loads alternated working/blank (~50%), and the blank ones logged `TypeError: UndoRestoreSync.onStateRestored is not a function at e.restart (ZvmCapture.js:91)`. **Fix (two layers):** `UndoRestoreSync.onStateRestored()` implemented -- the opcode-level entry to the existing `resync()`, coalesced through one 250ms timer (the same delay `tick()` already uses) so undo+restart back to back yield one resync after the terp paints; and `ZvmCapture`'s wrapper now calls it inside `try/catch` with an existence check, because that wrapper is a passive observer and an observer failure must never throw into the VM's control flow, whatever another module does. **Verified:** after the fix Anchorhead 0/10 blank (was ~5/10) with zero JS errors, and 0/4 blank across Zork1, Advent, AOTYRZ, Ballyhoo, Accuse and 905. (Glulx titles loaded too, but Glulx/Quixe is NOT adapted -- D28/D36/D38 -- so nothing here is a Glulx claim.) **This also closes the failure recorded in D93 as "pre-existing, unrelated, Glk's own rendering":** `tools/ui-regression.js` (`.Input.LineInput` absent after save/restore/inventory) is the same bug and now passes in full; D93's statement has been corrected in place, because its A/B test (disabling `Input.BindInputRow`) only excluded D93's own code. **Guards added:** (a) `harness/audit-restore-sync.js` extended to load the REAL `UndoRestoreSync.js` and prove the method exists, coalesces, that a boot `restart` cannot throw, and that a missing or throwing observer cannot reach the VM; (b) `tools/check-missing-methods.js`, a static check of every `Module.method(` call in `js/` against the module's definitions (comments and existence-guarded calls ignored) -- run across all 39 modules it found exactly this one defect and would have caught it at authoring time; (c) `harness/d94-cell-and-boot.js` (below), whose boot section requires 6 cold loads to render text with no "is not a function". **(2) Misaligned text -- root cause (measured):** GlkOte sizes the game's screen by injecting a hidden test pane, measuring `12345678` and dividing (`gridcharwidth = width/8`; `lib/main.js` `Y()`). That pane is appended to `#parchment` (GlkOte's "gameport") while the real windows live in `#windowport`, and every Parchmap font rule is scoped to `#windowport`. So the pane saw only the bare vendor CSS (grid 14px, prose 15px) while the phone rendered the grid at 10px (`Parchmap.css` `@media (max-width:850px)`) and prose at 20px. On a 412px phone the game was told 44 columns (8.4px cells) though the rendered grid held ~62 (6px cells): Anchorhead hard-wrapped its 49-column boxed quote at column 44 mid-word ("emotion of ma / nkind") and centred its title with padding for a width the 32-character prose column could not hold ("ANCHORH / EAD"). (The dark banding around the quote appeared only after D93 G47 un-hid the status grid on phones, which made the latent mismatch visible; G47 itself is still correct -- the status bar must show.) **Fix (`css/CharCell.css`, new, loaded after `Parchmap.css`):** on the mobile shell only, (i) ONE character cell for grid and prose -- games treat the grid's width as the screen width and pad centred/boxed text to it, so the prose column must hold at least as many characters as the grid reports; the cell is `min(user Display font, fit)` where `fit` makes at least `--pm-cell-cols` (default 50; Anchorhead's quote needs 49) columns fit; and (ii) the SAME rules on the measuring pane (`#parchment`) as on the real windows (`#windowport`), so the reported columns are true. Grid spans are made `inline-block` full-height, non-reverse text sits on the window background, and reverse spans are painted 1px down (cancelled by an equal negative margin) so boxed text renders as a solid block with no row seams. Desktop is untouched (verified: 158 columns, grid 14px). **Design trade-off, stated plainly:** on a 412px phone the effective mobile text size is ~12.5px (was 20px prose) because the Display font size is now an UPPER bound rather than the size; that is the price of the game being told the truth about its width. `--pm-cell-cols` in `css/CharCell.css` is the single knob if a different balance is wanted (fewer columns = larger text but more boxed-text wrapping). **Verified live** at 320x640, 360x740, 390x844, 412x911 and 430x932: measured cell == rendered cell for grid AND prose (e.g. 7.52 vs 7.52), the game is told 49-50 columns, the prose column holds exactly the reported columns, no grid line wraps, Anchorhead quote and title intact; screenshots of Anchorhead and Zork (status bar full width, prose wrapping at word boundaries). **`harness/d94-cell-and-boot.js` (33 checks) fails when the stylesheet is removed** (measured 8.40px vs rendered 6.00px, 33 columns reported, quote broken -- the original bug reproduced) and passes with it. Wiring: `play.html` link; `service-worker.js` `APP_SHELL` entry with `CACHE_VERSION` v4->v5 so installed apps refresh; `make-dist.bat`'s critical-file check now lists `css\CharCell.css`, `js\UndoRestoreSync.js` and `js\ZvmCapture.js` so a missing file fails the build. **(3) Test-suite repairs (harness drift from other seats' work, not product regressions):** Codex's click-gated ParchLock splash covers every FRESH session, and five desktop Playwright suites opened `play.html` directly without dismissing it, so their clicks were intercepted; `layout-regression`, `ui-regression`, `highlight-scope-regression`, `startup-menu-regression` and `d34-dictionary-verbs-proof` now set the same `sessionStorage` flag (`PM_ParchLockSplashSeen`) the app itself sets on the menu page, reproducing the real flow. `startup-menu-regression`'s `#start-screen a` selector assumed one link; the start screen now deliberately has two (Continue / Choose a story), so it targets `a[href="index.html"]`. **Full sweep afterwards:** 16 node harnesses (D88 family, `audit-restore-sync`, `mobile-fullscreen-landscape`, `d88-touch-longpress`, navigation/consistency/known-topics/room-identity/single-room-per-destination/calibrator) PASS; `layout-regression`, `ui-regression`, `highlight-scope-regression`, `map-pathing-regression`, `alley-actionable-regression`, `alley-ram-actionable-regression`, `startup-menu-regression`, `d34-dictionary-verbs-proof` PASS; `check-missing-methods` PASS. **Build:** `build-android.bat` rebuilt (versionCode 25); `css/CharCell.css`, `js/UndoRestoreSync.js` and `js/ZvmCapture.js` are byte-identical across source, PC dist, `capacitor-www` and the APK's bundled assets. **Recorded here because their authors did not log them (Codex asked for this); observed directly in source and DOM, not independently audited:** the ParchLock splash (`img/ParchLockSplash.css/.js`, once-per-session gate; `index.html` and no-story `play.html` show it, a story load suppresses it); the Tools button removed on mobile as redundant with Menu (operator decision, confirmed by the operator); the Menu chip centred at the bottom; the mic hold-to-talk preference (`Global.Prefs.MicHoldToTalk`, default true); the `has-char-input` body class; the start screen's Continue + Choose-a-story links. **Open / not done:** the Menu chip's bottom edge overlaps the line input's bottom edge on phones (observed in screenshots; layout owner's call, not changed here); on desktop GlkOte still measures the prose cell at 7.7px while it renders 12.0px (latent, harmless there because ~158 grid columns far exceed the reported need; deliberately not touched); Glulx/Quixe is not adapted; the mic hold-to-talk behaviour is being investigated next (operator report). | [yes] |
| D95 | **Mobile microphone: hold-to-talk did not show a held state and did not work (operator report, 2026-09-20). Reproduced with a faithful model of the native plugin, rebuilt as a small state machine, guarded by a live harness.** Requirements as given by the operator: the default is HOLD-TO-TALK (records for exactly as long as the button is held); the alternative is TAP (tap to start, ends by itself when the recognizer stops); the ONLY indicator is the button -- it stays lit while recording and goes dark when recording stops, with NO text of any kind; a failure is shown by flashing the button red and/or a circle-with-a-line over it. **Root causes (each confirmed by reproduction, not assumed), from `@capacitor-community/speech-recognition`'s real Android source:** (1) `start({partialResults:false})` resolves only when Android's `SpeechRecognizer` ends, and it ends BY ITSELF on the first pause in speech -- so one call can never last "as long as you hold"; the old code treated each call as the whole gesture, so recording silently stopped mid-hold, the button went dark while the finger was still down, only the first phrase was captured, and text was inserted BEFORE release. (2) A session that hears nothing REJECTS ("No match" / "No speech input"), so simply pressing without speaking, or a hold through silence, flashed a red failure. (3) The lit state was added only after the async `available()` -> `checkPermissions()` -> `start()` chain (visibly late on a real device) and was a subtle border-colour change; a release before that chain finished was ignored and recognition then started AFTER the finger had lifted. (4) Failures were reported only in the button's `title` attribute, which does not exist on a touchscreen. (5) The button had no `user-select`, `-webkit-touch-callout`, `touch-action` or `contextmenu` suppression, so on Android a ~500ms hold triggers text selection or the long-press menu, which fires `touchcancel` and ends the recording early. (6) A CSS specificity trap found while verifying: the mobile base rule `body.pm-mobile #pm-input-mic` outranks a plain `#pm-input-mic.pm-mic-active`, and generic button rules set the border with `!important`, so a "lit" style written naively never appears on a phone (caught by the harness, and by looking at real screenshots -- computed background was right but the border stayed grey). **Fix (`js/Input.js` `Input.Mic`, replacing the old `ToggleMic*` block; `InitMic()` stays the public entry used by Settings):** press gives IMMEDIATE feedback (before any async work); hold mode runs recognizer segments back to back while the finger is down and accumulates the text, so a pause mid-hold no longer ends the recording; release stops the recognizer, waits for the last segment, and commits ONCE (never submits -- R2); a release before recognition has started cancels cleanly; "no speech" outcomes are quiet, not errors; native availability/permission is checked once and cached so later presses start instantly; a 60s watchdog guarantees a lost `touchend` can never leave the mic lit and recording; the page losing focus/visibility aborts recording. Tap mode keeps single-utterance behaviour (tap to start, second tap to stop) and shares the same feedback. Switching the mode in Settings re-initialises immediately. The browser/PWA path (Web Speech API) follows the same state machine (`continuous` in hold mode). **Visual design (`css/Parchmap.css`):** idle = plain button; lit (`pm-mic-active`) = bright accent fill, glow, slight scale, while recording (hold mode: exactly while held; tap mode: from the tap until the recognizer stops or a second tap); dim (`pm-mic-busy`) = released, last words being delivered; failure (`pm-mic-error`) = red frame plus a circle-and-line sign over the microphone for ~2.5s (reason kept in `Input.Mic.lastError`/console only). No text element exists for the mic (an earlier draft's status pill was removed at the operator's request); the button is immune to selection/callout/context-menu/scroll-claiming (`user-select:none`, `-webkit-touch-callout:none`, `touch-action:none`, `contextmenu` suppressed). **Verified:** `harness/d95-mic-hold.js` (29 checks, real Chromium, real CDP touch events, native plugin modelled from its actual source including auto-stop on pause and rejection on empty stop): lit within 90ms of press and no text element; still lit and still recording after the recognizer ended by itself mid-hold; nothing inserted until release; BOTH phrases across a pause captured ("open the mailbox"); unlit and zero live sessions after release; release-before-start leaves nothing running; quiet on empty press and on a hold through silence; permission denied shows the red circle-and-line with no text; selection/touch-action/context-menu suppressed; tap mode lit through the automatic listen, dark and text inserted when it ends by itself, second tap stops and keeps what was heard; runtime hold<->tap switch; browser path lit/insert/stop. The harness failed 11 of 22 checks against the pre-fix code. Screenshots of idle/lit/error states inspected. Wider sweep afterwards: `check-missing-methods`, `d94-cell-and-boot`, `audit-restore-sync`, `mobile-fullscreen-landscape`, `d88-touch-longpress`, `d88-stage6-cutover`, `d88-semantic-parity`, navigation/consistency/known-topics harnesses and the `layout`, `ui`, `highlight-scope`, `startup-menu` Playwright suites all PASS. **Not verifiable here (stated plainly):** the harness proves the logic and rendering against a faithful MODEL of the Android recognizer in Chromium; it cannot prove behaviour on a physical phone -- e.g. whether a particular Android build's recognizer needs a longer gap than the 150ms used between back-to-back segments, or how the OS permission prompt interleaves with the first press. The first real-device press will confirm; `Input.Mic.lastError` (console) records the reason for any red flash. | [yes, pending real-device confirmation] |
| D96 | **Mobile chrome: the Menu chip covered the command input; it is now a retractable bottom handle, plus a faint right-edge Map tab (operator request, 2026-09-20: "the menu button at the bottom of the screen comes up over the text field. I would like it to retract to the bottom of the screen, leave a small indicator, and when pressed it will expand so it can be selected. Also ... a map button on the right hand side of the screen that is barely visible and translucent that will automatically open the map ... the most used screen besides the main screen").** **Cause of the overlap (measured, not assumed):** D93 put a 28px chip at `bottom: 2px` while the 44px input row sits at `bottom: 10px`, so the chip was drawn across the bottom of the text field, mic and submit at every phone width. **Menu:** a strip `--pm-handle-h` (16px; 0 while the keyboard is up) is now RESERVED under the input row. Collapsed, `#game-menu` is a transparent 120x16 hit area showing only a 40x4 translucent bar (no text; `aria-label` unchanged); the first tap only EXPANDS it into the normal "Menu" button, placed ABOVE the input row (never over it), the second tap opens the unchanged game radial (`WorkspaceUI.OpenGameMenu`); it retracts by itself after ~4s, on a tap elsewhere, and when the menu opens. Every offset anchored to the input row (input row, mic/submit, CharInput row, Tools list, buffer bottom padding, fade mask, autocomplete, map sheet padding) adds the SAME variable so the strip cannot drift out of sync. The expand step is a capture-phase listener in `js/MobileLayout.js` (`bindChrome`) that stops the click before the existing jQuery binding, so `WorkspaceUI.OpenGameMenu` is untouched; on desktop the handler returns early and the chip stays top-right (one click opens it). **Map tab:** new `#pm-map-tab` (inline-SVG map glyph, 18x56, ~7% white fill, ~42% icon alpha, mobile only) on the right edge that calls the existing `ParchmapMap.Toggle()`, so it opens AND closes the map (lit while the map is open; z-index above the map sheet so it stays reachable). Hidden under dialogs/radials like the other bottom chrome. **Conflict found and resolved while placing it:** the right edge already carries the interactive exit rail (`#exits .row.vertical.right`: up / E / down labels, each a travel tap, three 33vh cells). The tab sits at the seam between the "up" and "E" cells; because a long exit name (Anchorhead: "real estate office door") does reach the seam at 320x640, the rail is raised above the tab (z 24 vs 23) with `pointer-events:none` on the strip itself and `auto` only on real labels -- a label always wins an overlap, and every uncovered point of the tab stays tappable (verified by hit-testing). **Second defect found and fixed by the same live run (class: dialog state not owned by the dialog):** on first launch the Help popup opens synchronously in `Message.Init`, but `Parchmap`'s 100ms boot cleanup then removed `app-dialog-open`, so Menu/mic/submit stayed live and tappable behind an open dialog (and the popup, 820px tall from y=50, overflows an 844px phone). The cleanup now keeps `app-dialog-open` while `Message.IsOpen`. **Help text** (`WorkspaceUI.ShowHelp`) describes the bar and the tab. **Verified:** `harness/d96-menu-handle-map-tab.js` (109 checks, real Chromium + real touch taps, 320x640 / 360x740 / 390x844 / 412x911 / 430x932 + desktop): collapsed Menu overlaps neither input, mic nor submit at every width; text-free, unfilled, 40x4 bar; first tap expands without opening, expanded Menu is above the row and >=30px tall, second tap opens the game radial; auto-retract and tap-away retract; Map tab hugs the right edge, translucent, covers no story text (trailing whitespace excluded), does not steal taps from exit labels, opens and closes the map; typing still works with the reserved strip; desktop unchanged; first-launch dialog owns the screen. Screenshots of idle/expanded/map states inspected. Shell files changed, so `CACHE_VERSION` -> v7 (cache-first shell). Full sweep after: `check-missing-methods`, `d94`, `d95`, `audit-restore-sync`, `mobile-fullscreen-landscape`, `d88-*`, and the `layout`, `ui`, `highlight-scope`, `startup-menu`, `map-pathing`, `alley`, `d34` suites all PASS. **Not verifiable here (stated plainly):** thumb ergonomics of a 16px handle and a 18px-wide tab on a physical phone (sizes are within the harness-checked bounds but only a real device shows whether they feel right; both are single CSS variables/values to tune), and Android system gesture-navigation bars, which can swallow taps in the bottom ~16px on some devices -- the handle honours `--pm-safe-bottom` but cannot see gesture-zone size. | [yes, pending real-device feel] |
| D97 | **(Subordinate to D99 / section 12.2 -- story policy only; canonical text in section 12.2.) Release/legal planning decision (operator, 2026-09-20; FINAL POLICY -- subordinate to D99 section 12.2; recorded so the three-seat review (#596-#605) rests on the operator's own words, not a paraphrase).** Operator, verbatim (relayed by codex #604, confirmed by the operator): "All documentation is going to be listed as if we are just shipping the app without games included. It will be noted that the user is responsible for any modules that they include in any copy of this app not the developer. Physically we're going to keep the app exactly as it is and I will pull out the appropriate files before distribution manually." **SCOPE CORRECTION (operator, same day, verbatim): "No nothing is going to be automated as far as checking for modules included I want everything to stay exactly the same except our notations are going to be as if things are not going to be included. I will be responsible for moving any [content] out of the system and also for checking afterwards."** This SUPERSEDES the earlier review proposals for story automation (selection file, never-ship hash tripwire, story exact-set gates, generated GameList/per-release docs, dev-vs-release staging tooling): none of that is built. **Consequences:** make-dist.bat/build-android.bat keep copying games/ exactly as today; the operator removes story files from a distribution and verifies the result by hand (heads-up recorded, not a gate: removing files without editing js/GameList.js leaves dead library tiles); documentation is NOTATION ONLY -- written as if the app ships without games, stating that the user is responsible for any story modules they include in any copy (scoped to what users add to their own copy; not legal advice -- it does not by itself cover files a distributor actually ships); no bundled-catalog claims. Non-story release work in the review stands (ParchLock conversion with protected upstream tokens, ProductInfo/About/Credits/Legal, dependency/licence inventory, GPL source archive for non-story files, docs/plan/harness leak allow-list, signed release, allowBackup/INTERNET, remote fonts, upload.php/email removal); local IndexedDB import stays as a repair of the server-upload path, not as a primary-way-to-play requirement. **Operator gates:** all answered afterwards -- see PRODUCTION_PLAN.md section 12.3 (source zip bundled + Git later; operator keeps the signing key; `allowBackup` off; `INTERNET` removed; `PL` prefix; credit only). Related plan, not yet approved for implementation: full ParchLock conversion, About/Credits/Legal, allow-list packaging, signed release. No license text verified; legal sufficiency needs a qualified reviewer. | [final policy; subordinate to D99 section 12.2] |
| D98 | **In-app Module Manager (operator directive 2026-09-20; FINAL DESIGN, submitted to codex for implementation, not yet implemented).** Automatic add/remove of story modules with automatic information and a compatibility check (Z-machine v3/4/5/8 = FULL; Glulx = PLAY-ONLY; everything else rejected with a reason), add single/multiple files or a whole folder, remove one / remove all (built-ins are hidden, never deleted), the game list, counts, flags and Continue adjust automatically, and the app boots with zero modules. Story bytes live in IndexedDB keyed by SHA-256 through a jQuery.ajax seam for `local/<hash>.<ext>.js`; saves are never deleted by v1 removal; no filename catalog matching; no HEAD probing; final `PL_`/`pl-` names with one `LEGACY` adapter table. **Canonical design, verified facts, compatibility findings and required tests: PRODUCTION_PLAN.md section 13; architecture: ARCHITECTURE_UML.md section 35.** Adversarial review #609/#611 converged; the earlier long draft in this row was replaced by section 13 (history stays in bus #608/#609). Subordinate part of D99. | [design final; implementation pending] |
| D99 | **ParchLock release program -- MASTER LEDGER of retained scope (FINAL PLAN, submitted to codex for implementation; not yet implemented).** Complete Parchmap-to-ParchLock conversion (`PL_`/`pl-`), one canonical ProductInfo, rewritten in-app Help/About/Credits/Legal and public docs (README, USER_GUIDE, RELEASE_NOTES, PRIVACY, CREDITS, NOTICE, THIRD_PARTY_NOTICES, SOURCE/BUILD), exact licence inventory, explicit runtime and source allow-lists (internal docs, harness, fixtures, screenshots never ship), signed release APK with external key, `allowBackup` off, `INTERNET` removed, decoded-artifact validation, and a `ParchLock-source.zip` bundled with every distributed binary (Git repository also intended later). Operator decisions Q1-Q6 are recorded in section 12.3; story policy is D97; the Module Manager is D98. **Canonical text: PRODUCTION_PLAN.md section 12; architecture: ARCHITECTURE_UML.md section 34.** The earlier long draft in this row was replaced by section 12 (history stays in bus #596-#611). | [plan final; implementation pending] |
| D100 | **Read aloud (automatic on-device TTS for new story text) — IMPLEMENTED 2026-09-21.** Options-only controls; default ON; new buffer text only; `js/ReadAloud.js`; `@capacitor-community/text-to-speech@8.0.2`; web `speechSynthesis` fallback; mic press stops TTS; Message dialogs opt-in; SW shell v11 lists ReadAloud.js. **Plan:** `docs/read-aloud-plan-d100.md`. **Harness:** `harness/d100-read-aloud.js` 18/18. d94 33/33 regression held. | [yes] |
| D101 | **Display text size and duplicate Tools repair, 2026-09-21.** Retains D99's removal of the redundant center Tools button in game/tools menus and adds direct desktop/mobile regression coverage. Replaces the operator-rejected broad mobile font experiment with a narrower two-layer design: `--pl-reading-scale` changes only reflowable normal story prose on the mobile shell, while the D94 measured character cell remains authoritative for grid, preformatted, heading, status, and story-authored boxed/centred output. The default preference (20) maps to exactly 100%, and a 9px mobile floor prevents the smallest setting from reducing readability; desktop keeps its existing preference-driven prose size while its 14px grid remains fixed. Verified in real Chromium at five phone viewports plus desktop: `harness/d94-cell-and-boot.js` 54/54 and `harness/d96-menu-handle-map-tab.js` 112/112. | [yes] |
| D102 | **Mobile menu simplification, 2026-09-21.** Removed only the bottom mobile `#game-menu` handle and its reserved strip. Existing input-line/submit long-hold radial access, radial construction, and the radial's Tools button are unchanged. On mobile, the existing scrollable Tools list now includes the three actions that were unique to the removed game menu: **Open map**, **Modules**, and **Exit game**; shared Save/Restore/Options/Help/About entries remain single instances, and `Maps` is labelled **Map files** to distinguish saved-map management from opening the map. Desktop Menu and Tools radials are byte-behavior unchanged. The longer list has a sticky close control. Verified by real touch/browser regression at five phone viewports plus desktop: `harness/d96-menu-handle-map-tab.js` 82/82. | [yes] |
| D103 | **One-time mobile gesture tutorial and documentation repair, 2026-09-21.** At the first real line prompt on a new installation, a two-step accessible tour explains the two distinct touch contracts: a quick tap on an underlined actionable submits its deterministic primary command, while touch-and-hold opens that object's module-derived action radial; touch-and-hold on the command line or submit arrow opens the game radial, whose Tools control reaches the complete menu. Completion or Skip stores one global `PL_MobileTutorialSeen` key, so the tour does not recur per story or reload. Options exposes **Replay mobile tutorial**, which clears the key and replays immediately on mobile (or arms the next mobile load when selected on desktop). Existing action/input gesture handlers are unchanged. Help, User Guide, control accessibility descriptions, release notes, plan, and architecture use the same wording and do not promise an `Examine` label. D96 expanded to 98/98 with first-run, persistence, reset, accessibility, phone-matrix, real hold, and desktop-isolation coverage. | [yes] |
| D104 | **D100 read-aloud rework and skip-repeats option, 2026-09-21 (operator device report: intro never read, room text re-read every turn).** Root cause, reproduced headless on real Anchorhead with a stubbed native `TextToSpeech` plugin: the app's word-underline pass (`SPAN.pl-act`, D64) rewrites text nodes in the previous room and the new line ~170 ms after output, and the old pipeline used added-node text from MutationObserver records as its speech source, so each utterance was new line + underline fragments + the previous paragraph (about 1.8k chars); the echoed command was spoken; a full-screen replacement (title -> intro) was treated as silent by `computeDelta`; `start()` seeded silently and swallowed text already painted on slow devices. **Fix (`js/ReadAloud.js`):** MutationObserver is only a 350 ms debounce trigger; speech text comes from `.BufferLine` elements not yet in a `WeakSet` (`spokenLines`), skipping blank/prompt/`Style_input`/`.Input` lines; `start()` no longer seeds (only enabling mid-game/new story does); fingerprint history and `computeDelta` are no longer in the path. **New option** `Global.Prefs.ReadAloudSkipRepeats` (default false; Options label "Skip lines repeated from the previous turn"): lines whose normalized text was in the immediately previous flush are dropped; `lastLineFps` is replaced every flush (tracked even when off, cleared on `clearSessionMemory`/`seedSilent`), so it is consecutive-turn only and never becomes session history; line-level because a repeated LOOK adds a random atmosphere line. **Evidence:** new `harness/d100-live-turns.js` 16/16 (real game, stubbed native TTS: intro spoken, no echo, no underline fragments, no previous-room text, utterance <700 chars, option off/on/consecutive-only), `harness/d100-read-aloud.js` 23/23. SW shell v15. Device confirmation pending reinstall of the rebuilt APK. | [yes] |
| D105 | **Mobile input contract, 2026-09-21 (operator device report: no keyboard/text entry at startup and menu screens, Inform HELP menu not navigable, no native copy/paste with the keyboard open).** Root causes (live-verified, docs/mobile-input-plan-d105.md): the D93 rule made char prompts keyboard-less with no touch handler on `.Input.CharInput`; there was no phone path for arrow keys; a hold on a keyboard-open line field opened the input radial and dropped the keyboard; keyboard consent lived on a DOM element Glk replaces. **Fix:** one `Input._kbIntent` state; persistent key proxy + composition-safe decoder for char prompts (`js/CharKeys.js`); **Tools > Arrow keys** radial-style pad; native selection while the keyboard is open; one layout-height/keyboard-inset geometry model; closed map hidden throughout keyboard animation. ParchLock suppresses Glk game-input autofocus only in a compact mobile/Capacitor or coarse-touch runtime, while Glk still records the current prompt for hardware keys; compact mouse/keyboard desktops retain normal focus. Valid short landscape visual viewports are no longer discarded as cold-start readings. SW shell v20. **Evidence:** `harness/d105-input-contract.js` 57/57, `harness/d105-review-fixes.js` 37/37, `harness/d100-live-turns.js` 16/16, and compact 800x900 mouse/keyboard regression. **Unverified:** final real Android IME and native selection-toolbar behavior. | [yes] |
| D107 | **Parser-owned command nouns, 2026-09-22 (operator report: clicking `long-handled shovel` generated a compound phrase the module rejected).** `ZRamReader.parserWords` already mined Inform property 1 correctly, but `Actionable.VerifiedNouns` conflated the longest visible underline phrase with executable parser text. **Fix:** visible phrases remain independent; `Actionable.commandNounsForPool` resolves commands only from each object's structural aliases, recomputed for every changed room+inventory scope because uniqueness is room- and inventory-dependent. Alias ownership is counted by distinct object id; a unique alias is preferred, then an exact displayed token (rightmost/base noun first), then stable property order. Legitimate short aliases remain valid. Empty alias sets preserve legacy `obj.name` behavior. Shared aliases may use the story parser's native disambiguation, while `AttrCalibrator` fails closed unless the alias maps to exactly one object id. All existing ActionSynth, SemanticActions, left-click, radial, ask-about, use-with, and calibration consumers continue through `commandNounFor`. **Evidence:** `harness/d107-compound-noun.js` drives real Huge Cave to Tool Room, verifies the radial and clicks the actual `long-handled shovel` underline, submits `examine shovel`, and receives the story's shovel description; it also proves dynamic two-key scope changes, duplicate-id counting, short words, and empty-alias fallback. Neighbor D31/D34/D85/D88 suites remain required. SW shell v22. | [yes] |
| D33 | Plan-vs-actual-code reconciliation pass (2026-09-12, distinct from the earlier TXT-vs-plan pass): fixed six stale/contradictory doc claims found by directly re-reading current code rather than trusting prior doc text - §2.2 `Qol.js`/`Navigator.js`/`tools/*` rows, ARCHITECTURE_UML.md §15's wrong "target/nonexistent" framing of already-implemented `ZvmCapture.js`/`ZRamProvider.js`, a self-contradiction between two "not done" lists on look-ahead exits, and Phase 3's `[x]` marker implying its namesake text-gate mechanism still works when D24 removed it. Also: docs are now claude-sole-editor (operator decision, 2026-09-12); grok reports via mailbox only. | [yes] |
| D32 | Two more requirements restored after being dropped entirely from the original conversion: (1) click-a-historical-map-node computes and issues N real UNDO commands to rewind live VM state (Phase 5, distinct from Phase 8's opcode resync hooks), (2) vehicle/seat room-identity resolution via `parent(parent(player))` restated in this prose doc (it existed only in ARCHITECTURE_UML.md's diagram, which is a rule violation of this doc's own "plan is prose authority" principle). | [yes] |
| D31 | Three requirements from the conversion guide restored after being dropped entirely (not just compressed) during the original TXT-to-plan conversion: (1) positional/relational verb suppression for nested-in-container inventory items ("take out of X"), (2) NPC Known Topics palette - corrected to RAM-scope derivation rather than the guide's original printed-text-matching mechanism (same correction as D24), (3) the 320px responsive panel-collapse threshold. See Phase 4 and §6.6 for full text. | [yes] |
| D30 | Phase 6 map-beautification mechanics restored to full fidelity from `Full Stack Engine Level Conversion.txt` (rigid-cluster/soft-spring physics, named planarization method, 80px/20px parameters, sub-map boundary hulls, radial spoke-angle seeding, Z-axis dual-mode rendering) - the prior plan text had flattened all of this into one generic sentence during the original conversion, per §6 detail above. | [yes] |
| D29 | **Docs-completeness gate, every phase:** any phase that adds, changes, or removes a system MUST update the relevant sections of `PRODUCTION_PLAN.md`/`ARCHITECTURE_UML.md` to describe the new behavior, AND must confirm every legacy system it touches is left in one of exactly two states - correctly updated to match, or fully removed (registration, call sites, and all) - never half-migrated or contradicting the new behavior. A phase report that doesn't address this is incomplete regardless of its functional test results. This session's docs-conversion cleanup (fixing the stale `text-gate`/`printed vocab`/`P1 heuristic` contradictions left over from the original TXT-to-plan conversion) is the concrete example of what this gate exists to prevent from recurring. See D37 for a second, later instance of exactly this failure mode found and fixed the same way. | [yes] |
| D37 | **Gap found and fixed 2026-09-12, while scoping Glulx work:** `js/RemGlkTapProvider.js` (a live, actively-installed `WorldModel` provider, unlike the properly-gutted `TextGate.js`/`BufferTapProvider.js`) was still computing and returning real regex-mined exits (direction words like "north"/"south" matched against printed GlkOte text) and a hardcoded noun list (`pig`/`moon`/`forest`/`field`/`farm`/`wall`/`gate`/`boss`) as `discoveredObjects`/`exits`/`roomName` - the exact D24 anti-pattern, left un-migrated. It was harmless in practice only by accident: its `engineMode` is never `"structural"` and its source name (`"remglk"`) never matches `WorldModel.isStructuralFact`'s allowlist, so the merge pipeline silently discarded these fields every tick - a landmine, not a safeguard, that would become a live violation the moment anyone touched that gate without knowing this file's history. Separately, `harness/phase2-heuristic-cutover.js` had a source-check (`"GlkTap does not mine 'pig' from printed text"`) that tested the *wrong file* (`GlkTapProvider.js`, which never had this bug) - meaning this exact anti-pattern had zero real regression coverage despite an assertion whose name implied it did. Fixed by claude directly: gutted `RemGlkTapProvider.js` to the same honest-stub shape as `GlkTapProvider.js` (unconditional empty `roomId`/`roomName`/`exits`/`inventory`/`discoveredObjects`, keeping only the legitimate HUD-level yes/no dialogue-prompt detection, which is behavioral chrome, not a spoiler-sensitive fact - same carve-out D9/D12 already establish), deleted a stale scratch file (`harness/_fix_remglk_collect.js`) that referenced the removed fields and would have corrupted the file if ever re-run, and added real coverage to `harness/phase2-heuristic-cutover.js` (source-level checks against the correct file, plus a runtime check that feeds a fake GlkOte update containing "pig"/"north"/"south" text and asserts `collect()` still returns empty facts - 134/0 total, up from 123/0). Full regression suite and live Playwright re-verified clean after the fix. | [yes] |
| D38 | **Glulx structural provider, Phase A researched 2026-09-12 - memory access is real, object-model research is blocked on missing catalog content.** grok traced `lib/main.js`'s engine dispatch (independently re-verified by claude via direct byte-level grep of the minified file): story URL extension picks `"zcode"` (loads `lib/zvm.js`, `new window.ZVM`) or `"glulx"` (loads `lib/quixe.js`, runs via `window.GiLoad.load_run({vm: window.Quixe, blorb_gamechunk_type: "GLUL", ...})`) - confirmed the exact `vm:window.Quixe` / `GiLoad.load_run` call in `lib/main.js`. Quixe is a global singleton (not a class instance like `ZVM`), already exposing `ReadByte`/`ReadWord`/`get_vm_internals()` - `js/LiveHeapProvider.js` already calls `Quixe.ReadByte(0..3)` today (confirmed by claude directly), just at confidence 0.35 so `WorldModel.isStructuralFact` correctly excludes it from live facts. So a `ZvmCapture.js`-equivalent hook is **not needed** for Glulx via Quixe - the memory-access API already exists and requires no interpreter patch. The `lib/emglken/glulxe.wasm` / `lib/parchment-modern/glulxe.wasm` path is confirmed NOT wired into `play.html` at all (`js/EmglkenHost.js`/`js/HostEmglkenBridge.js` both explicitly say "not wired yet" in their own comments) and its Emscripten exports don't expose Glulx-address memory anyway (`supportsHeapView:false` is accurate, not stale). **The real blocker:** Glulx has no VM-spec-defined object table the way the Z-machine does (compiler convention, Inform-to-Glulx specific) - decoding it requires the same "prove it with real evidence from a real story" bar as D34, and the catalog has **zero** Glulx-format files to decode against (claude independently confirmed: 298 `games/*.js` files, 0 `.ulx`/`.gblorb`, `harness/fixtures` is Z-only too). Staged prerequisite (not paved over with a heuristic): P1 - a real Inform-to-Glulx catalog story (`.ulx.js`/`.gblorb.js`) needs to be added before any object-model research can start; P2 - reverse-engineer the object/attribute/property representation on that real live image with decoded evidence, same discipline as D34's dictionary/grammar work, no assumption that Z-machine attribute-bit numbering or entry sizes carry over; P3 - only then build `GlulxRamProvider`/register it as `"glulx-ram"` (already allowlisted in `WorldModel.isStructuralFact`). D36's Glulx grammar-vocabulary research stays blocked behind all three steps. Sourcing a real Glulx catalog file (P1) is a content-acquisition decision, not a code decision - raised to the operator rather than unilaterally added. **P1 RESOLVED, 2026-09-12:** operator directed sourcing a real, popular, freely-distributed Glulx title. `Counterfeit Monkey` by Emily Short (widely regarded as one of the best-known parser IF works, officially released for free) was fetched from the IF Archive (`ifarchive.org/if-archive/games/glulx/CounterfeitMonkey.gblorb`), base64-wrapped in the catalog's exact existing convention (`processBase64Zcode('...')`, matching every other blorb-based catalog entry byte-for-byte in format), saved as `games/CounterfeitMonkey.gblorb.js`, and registered in `js/GameList.js` so it's selectable in the game picker, not just loadable via a raw URL param. Verified live via Playwright: the game boots and displays its real opening text ("Back Alley, noon... Can you hear me?"), and `Quixe.ReadByte(0..3)` returns `[71,108,117,108]` = ASCII `"Glul"` - genuine, live, byte-readable Glulx memory, confirming P1 is unblocked. Operator explicitly declined extending this to Hugo/TADS/Adrift ("no need to download and convert files we can't currently support by the base App") since those formats have no interpreter at all yet - that content-sourcing step only makes sense once each format's interpreter-porting prerequisite (D28/Phase 10) lands. P2 (reverse-engineer the object model against this real image) is the next assignment. **Catalog expanded 2026-09-12: 10 more popular/well-regarded Glulx titles added** at operator's request, cross-checked against `js/GameList.js`'s real titles (not just raw `games/` filenames, which are often cryptic abbreviations) to confirm none were already present: `Blue Lacuna` (Aaron A. Reed), `Alabaster` (John Cater/Daniel Allington-Krzysztofiak & collaborators), `Cragne Manor` (community Anchorhead tribute, various authors), `Robin & Orchid` (Ryan Veeder & Emily Boegheim), `PataNoir` (Simon Christiansen), `Scroll Thief` (Daniel M. Stelzer), `Grooverland` (Mathbrush), `Andromeda Apocalypse` Extended Edition (Marco Innocenti), `Rover's Day Out` (Jack Welch & Ben Collins-Sussman), `CosmoServe` (Judith Pintar) - all fetched from `ifarchive.org/if-archive/games/glulx/`, wrapped in the identical `processBase64Zcode('...')` convention, saved under `games/`, and registered in `js/GameList.js`. All 10 independently verified live via Playwright: each boots with real, recognizable opening text and a valid `Quixe.ReadByte(0..3)` = `"Glul"` magic check; full regression suite re-run clean (134/0) after the batch add. The catalog now has 11 real Glulx stories total for D38 P2's object-model research, not just one. **Explicit acceptance criterion reaffirmed by operator, 2026-09-12: "the user experience needs to be indistinguishable" across formats.** This was already D22's underlying principle (one deterministic path, `UIPayload` shape identical regardless of source, no format-specific UI branching - `js/Actionable.js`/`js/Map.js`/`js/Qol.js` never check "is this a Z-machine game or a Glulx game," they only ever read the payload), but it's now stated as an explicit, non-negotiable acceptance bar for `GlulxRamProvider` (P3) specifically: when it lands, the player must not be able to tell from the map, actionable-item marks, or radial menus which VM is running underneath - same map-node behavior, same closed-container gating, same radial ranking, same everything, driven by the identical payload contract `ZRamProvider` already satisfies. Confirmed today via live test: booting `CounterfeitMonkey.gblorb.js` currently shows the map panel stuck at "0 rooms / 0 exits / 0 notes" and "Items 0" - the game is playable but not yet RAM-deterministic, which is the precise gap D38 P2/P3 exists to close, not a separate complaint. | [yes] |

**Confirmed live findings, wump2ka.z5.js (2026-09-12):** (a) ~~"take canteen" succeeds even though our schema predicts `takeable:false` (`static:true`)~~ **SUPERSEDED, see D73** - the "accepted D34/D58 ceiling, no static attribute read can ever predict a compiled routine body" conclusion below was itself wrong: live opcode observation (D73, 2026-09-13) directly captured the canteen's real TAKE precondition and proved it never tests bit 19 ("static") at all - the static profile was checking the wrong bits, not being overridden by unobservable custom code. Original (now-superseded) reasoning kept for the record: "re-investigated more rigorously per operator's explicit pushback rather than re-asserting the same conclusion. Direct raw-byte re-verification: the canteen's own attribute bytes (`[0,64,16,0,0,0]`) independently decode bit 9 (light) and bit 19 (static) as set, using the exact same PROFILE this session verified correct across dozens of other objects in the same game (D58) - the bit read itself is internally consistent and not in question. The distinguishing new evidence: D58's confirmed-custom-code refusals (wide shaft/fungus/fog) each printed unique, hand-authored REFUSAL prose when blocked ("Taking a hole is an interesting idea...", etc.) - proving deliberate custom code exists on those objects. The canteen, by contrast, printed the plain, generic library-default "Taken." success message, not a custom acceptance message - meaning the standard TAKE path's own precondition check ran and passed. Since a `static` object's default TAKE precondition is a library-level check, not something skipped silently, the only way this succeeds is custom per-object code that deliberately grants the take despite `static`... a static RAM attribute read can never predict the behavior of a compiled routine body." (b) ~~"Glow Bar" reads `worn:true` in our attrs, but "wear glow bar" returns "You can't wear that!"~~ **FIXED, see D68** - root-caused as the SAME unnamed-transparent-wrapper leak D57 addressed for the confirmed-animate case, just also needed to trigger on the D58-documented random non-animate roll; the `worn` bit read was correct all along, the bug was surfacing it as a loose room object at all. (c) ~~the room's discoveredObjects list never includes an entry matching the printed "A scrap of paper is lying next to the skeleton" line~~ **FIXED, see D64** - root-caused as a structural-shortName-vs-real-dictionary-vocabulary mismatch, not a synonym-list gap in our reader.

**Status: all three originally-reported Wumpus findings are now closed** (two fixed - D64, D68 - one confirmed as the same already-accepted, now more rigorously evidenced, custom-code ceiling - finding (a)).

**Confirmed live findings, Zork1 (2026-09-12, operator explicit re-test after D61/D65):** (d) ~~the map "doesn't update correctly until you travel back and forth between rooms a couple of times"~~ **FIXED, see D66/D67** - root-caused via real click-driven repro (typed commands, real screenshots, not JS-eval checks) to two compounding issues: D66 (a newly-arrived room legitimately had no neighbors to show yet, since only outgoing exits were ever rendered) and, discovered while verifying D66 live, D67 (a real pre-existing CSS bug where a map slot marked `tentative-exit` was never cleared, so stale ghost rooms lingered on screen indefinitely at slots they no longer occupied - the actual mechanism behind the operator's report).

## 12. ParchLock release program (D99 master ledger)

**Status (2026-09-20): IMPLEMENTATION COMPLETE; READY FOR FINAL ADVERSARIAL REVIEW.** Adversarial review rounds #596-#611 converged (codex #611: "consensus reached"). ProductInfo, the D98 Module Manager, complete product namespace conversion, public documentation, runtime/source allow-list packaging and Android hardening are implemented and locally verified. D97 (story policy, decision log) and D98 (section 13, Module Manager) are subordinate parts of this program. Architecture target: `ARCHITECTURE_UML.md` sections 34 and 35. External/operator release gates remain: story removal and inspection, release-keystore creation/signing, splash-art provenance, name clearance, qualified legal review, and named real-device checks.

**Origin.** Operator request for a complete and total Parchmap-to-ParchLock conversion, a professional audit of every user-visible instruction, all documentation shipped in the desktop and APK distributions, credits, acknowledgments and legal material, and leak-proof distribution. Fresh distribution: no existing installs or saves need migration.

### 12.1 Retained requirements (all stay in scope until the operator removes one)

1. Audit and rewrite ALL user-visible in-app Help/About/credits/legal text and every public documentation file.
2. Public doc set: README, USER_GUIDE, RELEASE_NOTES, PRIVACY, CREDITS, NOTICE, THIRD_PARTY_NOTICES, SOURCE/BUILD.
3. Document every shipped feature accurately: adaptive desktop/mobile controls, splash lifecycle, module-derived actions/radials, mapping limitations, saves/maps, speech controls, the Module Manager, import/storage behaviour, engine compatibility. Every behavioural claim maps to a test/evidence or is removed. Never claim real-device mic behaviour that has no device evidence (D95 keeps its caution).
4. Exact identity: display "ParchLock!", artifact-safe "ParchLock", `ParchLock.apk`, ParchLock distribution/source archive names, Android appId/namespace `com.parchlock.app` (move `MainActivity.java` into `com/parchlock/app`), matching custom URL scheme, manifest/PWA/iOS metadata.
5. Complete source-level conversion of every PRODUCT-OWNED Parchmap/PARCHMAP/PM_/pm- token, filename, class, global, storage/cache namespace, native-probe identifier, test/tool selector and build reference. No migration shims. Mapping: `PM_` to `PL_`, `pm-` to `pl-`, `__PARCHMAP_*` to `__PARCHLOCK_*`. Codex audit #596 counted about 2,177 occurrences across 204 non-generated files (not independently recounted by claude); claude counted 518 `pm-*` occurrences (76 distinct) in css/js/html plus 50 harness/tools files, and 19 distinct `PM_*` keys. A protected-token list preserves upstream Parchment/GlkOte contract identifiers (`#parchment`, `parchment.css`, `lib/parchment-modern/*`, `Parchment` inside `lib/`) and exact historical/legal attribution strings. Before and after every mechanical set: assert no target name already exists (today zero collisions with the splash `pl-*` names), run the full harness sweep and the Playwright suites, and check reference closure. `pm_vm_probe` ABI/artifacts are renamed only after inspecting the wasm imports/exports; never rename opaque wasm names blindly. Runtime-built names (`"pm-" + x`, `style.setProperty`) need a runtime/computed-style pass, not just grep.
6. One canonical `ProductInfo` source feeding splash, footer, About, metadata and docs: credit "Adapted by Hymlock Groves. Based on Parchmap by Roy Lazarovich.", version/date/features/links. About/Credits/Legal reachable from library and game menus. Never claim upstream ownership.
7. GPLv3 kept verbatim. Exact dependency and licence inventory with licence texts for every shipped interpreter, library, font, Capacitor/Android dependency and native/WASM component, generated from package files, upstream tags and the resolved Gradle graph rather than memory. Bocfel/Glulxe/Emglken source and licence provenance is recorded even though the experimental Emglken runtime is source-only and excluded from binary packages. GPLv3 s.5(a) modification notice carries the release date. Upstream Parchmap attribution and licence are preserved.
8. A GPL corresponding-source deliverable from an explicit NON-story source allow-list: build/control scripts (`make-dist.bat`, `build-android.bat`), `package.json`/lock, `capacitor.config.json`, the `android/` project without any keystore, `native-hooks/` (CMake source for `pm_vm_probe.wasm`), the Emglken/Bocfel/Glulxe wasm build recipe, licences. Delivery (operator decision, 12.3 Q1): a `ParchLock-source.zip` is bundled with EVERY distributed binary/package (PC zip and APK release folder), with source directions in the docs and the About/Legal screen; a Git repository is also intended (later, layout undecided).
9. An explicit RUNTIME ALLOW-LIST replaces the deny-list packaging in `make-dist.bat`. Never packaged in the PC dist, `capacitor-www`, Android assets or APK: PRODUCTION_PLAN, ARCHITECTURE_UML, GUI_BASELINE, DISTRIBUTE.md, AI docs, harness/tools/dev fixtures, screenshots, logs, secrets, build debris, staging READMEs (`lib/emglken/README.md`, `lib/parchment-modern/README.md`), TEST-DIST-README, internal reports. Audit 2026-09-20: PRODUCTION_PLAN.md, ARCHITECTURE_UML.md, GUI_BASELINE.md, DISTRIBUTE.md, TEST-DIST-README.txt, harness/fixtures and the staging READMEs were in the PC dist (claude verified); PRODUCTION_PLAN.md and ARCHITECTURE_UML.md were also in the APK public assets (codex #598). Story files are excluded from this allow-list mechanism by D97 (see 12.2).
10. Story policy is D97 and is unchanged: the working corpus and build behaviour stay exactly as they are; public docs are written as if the app ships without games and state that the user is responsible for modules they add; the operator removes story files by hand and checks the result; NO automated release story-rights or story-payload gate exists or is to be built. Module Manager automation (section 13) is runtime technical management only, never a rights system.
11. Remove the server upload (`upload.php` POST in `js/MainMenu.js`) and Roy Lazarovich's personal e-mail from the UI. Local-only imports. Bundle the Roboto Mono font and remove every legacy remote URL (Google Fonts, `parchmap.atspace.cc` favicon/OG/Twitter meta). Privacy text distinguishes ParchLock from OS/browser speech providers (never "audio never leaves the device") and covers local storage, backup, permissions and outbound behaviour.
12. Signed release APK: external keystore and passwords outside the repository, fail-closed release path (never silently promote a debug build), clean build, intentional versionCode/versionName (no silent bump), `apksigner verify --print-certs` fingerprint recorded, keystore leak scans. The old and new apps install side by side. `allowBackup` and `INTERNET` follow 12.3.
13. Decoded-artifact validation of the PC zip, `capacitor-www`, `android/app/src/main/assets/public`, the merged/decoded APK and the source deliverable: exact-set manifests in both directions; forbidden filename/content scans (`C:\Users`, `hymlo`, `PRODUCTION_PLAN`, `ARCHITECTURE_UML`, `harness/`, `tools/`, `docs/ai-`, `roylaza`, `parchmap.atspace`, sourceMappingURL); case-insensitive legacy-brand scan with a STRING-exact (not file-wide) attribution allow-list; `aapt2`/`apkanalyzer`/dex/native/binary-metadata inspection (a raw zip grep is not proof); reference and service-worker closure; hash parity across surfaces; desktop/mobile Playwright of Help/About/Credits/Legal/Privacy and every documented control; a network-denied run; Android package/label/version/signature checks; the full existing regression sweep. Device/emulator claims only where a named device was actually used, otherwise "not verified".
14. Internal plan/architecture docs are updated in the repository but never packaged. Historical decision rows keep historical names.
15. Coordination: single-writer freeze during the mechanical sets, claims reconciled first, operator bug reports queued unless release-critical, explicit exit criteria (mechanical sets done, gates green, artifacts reviewed, claims released), direct notice to every seat, an independent final adversarial review.

### 12.2 Story policy (D97, verbatim operator statement)

"All documentation is going to be listed as if we are just shipping the app without games included. It will be noted that the user is responsible for any modules that they include in any copy of this app not the developer. Physically we're going to keep the app exactly as it is and I will pull out the appropriate files before distribution manually." Scope correction: "No nothing is going to be automated as far as checking for modules included I want everything to stay exactly the same except our notations are going to be as if things are not going to be included. I will be responsible for moving any [content] out of the system and also for checking afterwards."

Consequences: `make-dist.bat`/`build-android.bat` keep copying `games/` as today; no selection file, hash tripwire, story scan or generated GameList exists; docs are notation only; the "user is responsible" wording is scoped to what users add to their own copy and does not by itself cover files a distributor actually ships (not legal advice; needs a qualified reviewer). Current dist folders and `Parchmap.apk` contain all 309 stories and are DEV artifacts, not for handing to others. A hand-removed story file leaves its library tile until `js/GameList.js` is edited or the Module Manager's Hide/Remove-all is used (operator's manual cleanup).

### 12.3 Operator decisions (walk-through of the open questions, 2026-09-20)

| # | Question | Decision |
|---|---|---|
| Q1 | Source delivery | **DECIDED (operator, after the walk-through):** BUNDLE a `ParchLock-source.zip` with every distributed binary/package ("I didn't realize I could actually just bundle the source zip up with it. That is a much more elegant solution"), AND ALSO use Git ("I will also be using a git as well"). The zip is built from the explicit non-story source allow-list (12.1 item 8), matches the exact build (same tag/hash as the binary), excludes games, dev fixtures, AI/internal docs, screenshots, logs and every keystore/secret, and travels WITH the binary: handing over an APK or PC zip on its own without the source zip and directions is not the release procedure. The Git repository is a second, later channel; its visibility, contents and host stay undecided (the operator: "one of the last things we do", "we are not creating a git at this point"; documents may be adjusted later). Recorded guidance (not legal advice): the GPL requires the source of the distributed version INCLUDING ParchLock's own changes, so pointing only at the original Parchment/Parchmap projects is not sufficient; unmodified third-party libraries may take their source from their own servers only with clear directions and continuing responsibility, so including the exact shipped library copies in the zip is the simplest safe route; credits link the originals as attribution, not as source delivery; any repository must be clean from its FIRST commit (no games, dev fixtures, built artifacts, AI working notes, secrets) because Git history is permanent, and each release is tagged; the real upstream Parchmap location is UNVERIFIED (the app only references the old parchmap.atspace.cc). |
| Q2 | Signing key | Operator keeps it; creation deferred to release time. Until then builds stay as today (debug signature, dev artifacts). Key and passwords live outside the project, Git and every artifact; the release build takes them at build time and fails closed if missing; the operator keeps two backups (a lost or replaced key means installed apps cannot update and users must uninstall, erasing local saves/maps). |
| Q3 | Android backup | `allowBackup` = OFF. Reinstall or a new phone starts empty; users use the in-app save-package export; privacy text says so. |
| Q4 | Internet permission | REMOVE the app's `INTERNET` permission, valid only once remote fonts and legacy URLs are gone; verified on the MERGED manifest (the speech plugin adds only `RECORD_AUDIO` and a RecognitionService `<queries>` entry). Rollback condition: if a named real-device test shows a shipped feature (for example voice input, which uses the platform recognizer's own service) cannot work without it, restore it and document why. |
| Q5 | Name prefix | `PL` confirmed: `PL_`, `pl-`, `__PARCHLOCK_*`. No collisions found. The Module Manager is written with `PL_`/`pl-` names from its first line. |
| Q6 | Copyright line | CREDIT ONLY: "Adapted by Hymlock Groves. Based on Parchmap by Roy Lazarovich." plus the GPL modification notice; NO copyright line for now. A line may be added later, covering only qualifying original modifications, under a name the operator confirms. |

No architecture gate remains open. Only late-stage details remain: the Git repository's visibility/contents/host (operator-deferred; it no longer gates any release because the bundled source zip is the decided delivery method).

### 12.4 Phases

0. Freeze and coordination: declare the single-writer freeze, reconcile all bus claims, notify every seat, queue operator bug reports (release-critical ones excepted), record exit criteria.
1. Inventory: runtime/source/dependency/art-provenance manifests, protected-token and exact-string attribution lists, rename dry-run report (repo-only, never shipped).
2. Canonical `ProductInfo` with final ParchLock/PL identity (author once, before downstream code and docs consume it).
3. Functional privacy repair: to be delivered by the Module Manager (section 13), bundled Roboto Mono, removal of the upload path, Roy's e-mail and remote URLs.
4. Product conversion in atomic mechanical sets with parity tests after each; single writer.
5. Public docs and legal set (12.1 items 1-3, 6-8, 11), every behavioural claim traceable.
6. Packaging: runtime allow-list and the `ParchLock-source.zip` allow-list; the zip is produced by the same build and bundled with every distributed binary/package.
7. Android release: package move, `allowBackup` off, `INTERNET` removed, external signing, clean build.
8. Gates (12.1 item 13).
9. Independent final adversarial review and operator sign-off.

### 12.5 Execution protocol

- **Single writer:** codex implements code and maintains `PRODUCTION_PLAN.md`/`ARCHITECTURE_UML.md`; grok is review/test-only during the freeze. Other seats report evidence, never write decision-log entries.
- **Compare before change:** every change is compared with the current code, this plan and the architecture file before it is made (operator standing rule), and the docs are updated with the implementation.
- **Phase reports:** after each phase codex reports exact files changed, commands run, results and hash/parity evidence; grok reviews the evidence adversarially.
- **Claims:** exact paths claimed on the bus before editing; the operator permits use of any existing claimed file.
- **External gates, not architecture questions:** qualified legal review of licences/notices/disclaimer, keystore creation and real-device verification. Source delivery is already decided: bundle `ParchLock-source.zip` with every binary release. Internal harness results never substitute for external gates.

### 12.6 Flagged for the operator

- Splash art (four PNGs, about 12 MB) has no provenance or generation-terms record; record it before any art credit appears.
- A non-legal-advice name-clearance search for "ParchLock!" is planned before release.
- Legal sufficiency of licences, notices and the disclaimer is NOT verified by any seat.

### 12.7 Implementation evidence (2026-09-20)

- Product-owned runtime, storage, CSS, test/tool and native names use ParchLock/PL; protected upstream Parchment/GlkOte and historical attribution strings remain unchanged. Android uses `com.parchlock.app`, `allowBackup=false`, no app `INTERNET` permission, and external fail-closed release signing.
- `make-dist.bat` builds explicit runtime and non-story source allow-lists. Internal plans, AI docs, harness/tools, screenshots, logs and source zip are absent from the APK. `build-android.bat` clears generated Android web assets before every copy so removed files cannot survive a rebuild.
- The dormant Emglken launcher, bridge, duplicate WASM trees and `play-emglken.html` are excluded from desktop, Capacitor and APK runtime packages. Their build recipe/source and licence provenance remain in `ParchLock-source.zip`. Standard ZVM and Quixe play remain the product paths.
- Local verification passed: D98 ModuleLibrary core; D96 mobile menu/map 109/109; D94 boot/cell 33/33; mobile fullscreen 10/10; D88 semantic parity 24/24; real Anchorhead route; distribution portability; JavaScript syntax; Android debug Gradle build; decoded runtime/APK/source scans. Release mode refuses to proceed without all four external signing variables.
- Known pre-existing mapping boundary remains explicit: `harness/d22-holistic-scope.js` still reports zero holistic scope for Wumpus and one zblorb case, while the catalog RAM matrix classifies both as captured-but-pending-scope. This does not change the Z-machine-full/Glulx-play-only compatibility promise and is not represented as fixed.

### 12.8 Grok adversarial audit + fixes (2026-09-21)

Operator-directed full audit (#623). Verified and fixed:

- **Duplicate Tools category:** Menu radial no longer draws a second center Tools button when the menu already lists Tools (`js/Qol.js`).
- **Display font size (historical):** The first broad game-text scaling attempt was **fully reversed** after the operator reported that it desynced mobile grid/prose and broke Anchorhead's quote. D101 later introduces a separately designed prose-only reading scale; it does not restore the rejected grid/prose override.
- **Source packaging:** removed `play-emglken.html` from `make-dist.bat` source critical list; removed empty leftover `android/.../com/parchmap` tree.
- **Final harness suite (15/15 exit 0):** d98; d94 33/33; d88 semantic/multiword/stage6/touch-longpress; d96 109/109; d95; mobile-fullscreen 10/10; command-consistency; d46; d48; d31 nested inv; d34 dictionary; phase1-closed-container. Evidence: `tools/screenshots/matrix/d99-grok-harness-final.json`.
- **Final artifacts (rebuild after reverse):** `ParchLock-dev.apk` SHA-256 `a88bf5b47e135d13d151b89c54c100a2c6ae366f4240a3a290e725e76962171a` (95,157,475 B); `ParchLock-source.zip` SHA-256 `a748ddab5a658a3c6ed967aec74b31e7f5d559f37b7318582bb2c91168648106` (23,223,602 B). Runtime exclusions confirmed (no play-emglken/emglken/parchment-modern/PRODUCTION_PLAN/harness). See `tools/screenshots/matrix/d99-grok-final-artifacts.json`.
- **Identity spot-check:** `com.parchlock.app`, allowBackup=false, no app INTERNET, RECORD_AUDIO present, credit line exact, ProductInfo + ModuleLibrary in dist.
- **Grok verdict:** **REVIEW-PASSED with residuals** for D99/D98 implementation. Not operator release-signed; external gates remain open.
- **Residual (not treated as pass):** d22-holistic-scope Wumpus/zblorb pending-scope; `lib/pm_vm_probe*` ABI name left until wasm import/export rename is separately proven; external gates (story pull, keystore/release APK, legal, real-device mic, splash provenance, name clearance). The rejected broad font-scaling path remains removed; see D101 for its safe prose-only replacement.

**Bus record:** #596–#611 plan convergence; #623/#624 audit assignment; #625 Tools/Display notes; #626 font reverse; this §12.8 closeout.

### 12.9 Display readability without character-cell drift (D101)

The Display dialog's **Text size** preference now has an observable effect in both desktop and mobile play. Desktop behavior remains the existing direct prose-size preference. On mobile, `Global.ApplyDisplayPrefs` derives `--pl-reading-scale` from the preference relative to its 20px default, and `css/CharCell.css` applies that scale only to `.BufferLine.Style_normal` and its inline descendants.

This is intentionally separate from the failed D99 experiment. D94's measured cell and minimum-column contract remain unchanged for `.GridWindow`, preformatted output, headings, reverse/status rows, and story-authored boxed or centred layouts. At the default preference the scale is 100%, preserving the prior pixels; increasing Text size enlarges ordinary wrapping narrative without changing the grid cell, reported columns, or line wrapping. The menu contract is likewise explicit: a game menu contains one list entry named Tools and no extra centre Tools button; the Tools submenu does not recursively contain another Tools entry.

Acceptance evidence: `harness/d94-cell-and-boot.js` 54/54 across 320x640, 360x740, 390x844, 412x911, 430x932 and desktop; `harness/d96-menu-handle-map-tab.js` 112/112 across the same mobile matrix and desktop. The tests prove normal prose grows by more than 15% at preference 24, the smallest setting respects the 9px mobile floor, the fixed grid font and wrapping do not change, the Anchorhead intro quote/title remain intact, its padded title stays fixed and unwrapped even at preference 30, and both menu contexts contain no duplicate Tools control.

### 12.10 Mobile radial Tools as the complete menu (D102)

The operator clarified that mobile radial access was already correct and must not be redesigned. D102 therefore leaves `Input.js`, input long-hold handling, radial command generation, and the Tools centre button untouched. It removes the redundant bottom `#game-menu` handle on `body.pl-mobile`, sets `--pl-handle-h` to zero so the input/map/list offsets reserve no dead strip, and removes the obsolete expand/retract listener from `MobileLayout.bindChrome`; the right-edge Map tab remains.

`WorkspaceUI.OpenTools` adds **Open map**, **Modules**, and **Exit game** only when the mobile shell is active. Its existing Save, Restore, Save files, Items, Transcript, History, Display, Commands, Help, About, Theme, and Options entries remain. Saved-map management is labelled **Map files** on mobile to distinguish it from **Open map**. Desktop receives the original Tools entries and circular rendering unchanged. The list's close control is sticky so it remains reachable while scrolling.

Acceptance evidence: D96 82/82 across 320x640, 360x740, 390x844, 412x911, 430x932 and desktop. It performs a real CDP touch hold on the live line input, proves the radial still opens with `source:"input"` and one Tools button, opens the existing `source:"tools"` list, checks unique comprehensive labels and real handlers, invokes Open map and guarded Exit game, closes through Escape, proves no mobile Menu box or reserved handle height remains, rechecks the Map tab, and confirms the desktop Menu/Tools paths are unchanged.

### 12.11 First-install mobile gesture education (D103)

The tutorial is global installation state, not module state. `MobileTutorial` waits until the
mobile shell has a visible `.Input.LineInput`, the splash has gone, and no app/native dialog or
radial owns the screen. This allows it to identify the actual controls without competing with
the splash, story chooser, startup Help, or character-only prompts. It never writes completion
merely because it became visible; **Done**, **Skip tutorial**, Escape, or Android Back complete it
and store `PL_MobileTutorialSeen=1`. Closing or rotating away before completion leaves it pending.

Step 1 teaches the exact existing actionable contract: quick tap submits the structurally selected
primary action, while a roughly half-second hold opens the descriptor's other commands. It states
that command words come from the active adventure and can vary. Step 2 teaches the separate input
contract: hold the command line or submit arrow, then choose Tools; quick tap still opens the
keyboard. The tour adds no command, vocabulary, radial, timing, ranking, or submission path.

The reset control lives in the existing Options dialog. It clears only the tutorial key, never
preferences, modules, maps, or saves. Dynamic line prompts and the stable submit arrow receive
matching accessible descriptions even after Glk replaces the input DOM. The modal traps keyboard
focus, Escape does not leak into map toggling, Android Back dismisses it before app exit, and it
remains absent on desktop without consuming the future mobile first run.

Acceptance evidence: expanded `harness/d96-menu-handle-map-tab.js` 98/98, JavaScript syntax checks,
and visual inspection at 390x844 and 740x390. Existing D94, D95, D100, semantic parity, and mobile
fullscreen suites remain required before packaging.

## 13. Module Manager (D98)

**Status (2026-09-20): IMPLEMENTED AND LOCALLY VERIFIED; READY FOR FINAL ADVERSARIAL REVIEW.** The Module Manager, local loader, IndexedDB storage, strict format inspection, dynamic library integration and zero-module boot are in the working tree. This is the ONE canonical design; earlier drafts (bus #608 and its review #609) are history and are not active plan text. Part of the ParchLock program (section 12); target architecture `ARCHITECTURE_UML.md` section 35. It uses final `PL_`/`pl-` names (section 12.3 Q5).

### 13.1 Operator requirements (verbatim)

1. "...an automatic system for adding and removing modules. This needs to happen. So in the system the user will be able to select add or remove a module and it will automatically have the correct information also checking if the module is compatible. Right now all we have is compatibility Z machine modules although glux [Glulx] should be able to run"
2. "It will have to be able ... to adjust any internal informational systems such as the games list for any added or removed modules"
3. "... options to remove all modules or Add all modules from a folder and the system still needs to be able to boot without a module."
4. "You have permission to use any existing claim files."

### 13.2 Verified facts about the current code (2026-09-20)

- **Engine choice is by story URL extension** (`lib/main.js` `launch()`): `z3|z4|z5|z8|zblorb` (optionally `.js`) load `lib/zvm.js`; `gblorb|ulx` load `lib/quixe.js`; anything else errors. Story bytes arrive through jQuery JSONP (`processBase64Zcode`), decoded with `atob`; `launch` runs at DOM ready reading `parchment_options.default_story` (from `?story=`, `js/Consts.js`).
- **Observed engine windows:** `lib/zvm.js` accepts exactly Z-machine versions 3, 4, 5, 8; `lib/quixe.js` accepts Glulx `0x00020000 <= version < 0x00030200` (131072 and 197120 in the minified source).
- **Existing import** (`js/MainMenu.js` `Import`, disabled: `#import` is commented out at `index.html:106`) accepts only `.z3/.z5/.z8/.zblorb`, takes the extension with `file.name.split(".")[1]` (wrong for multi-dot names), and POSTs the story to `upload.php` (not shipped). It also shows Roy Lazarovich's personal e-mail.
- **`GameList`** is a global `var` in `js/GameList.js` (309 entries for 309 files, no orphans today), consumed by `MainMenu.LoadGameList/AddGame/UpdateTitle/FilterGameList` and by `Parchmap.SetTitle` (`js/Parchmap.js:217`, `GameList.find`, unguarded).
- **Per-story state** is keyed by `Parchmap.GameFilename`: `PM_Save_`, `PM_Map_`, `PM_MapSlots_`, `PM_GameId_`; library flags `PM_Games_Starred`/`PM_Games_Done` by Filename; `PM_LastStory`. `Parchmap.js:23` writes `PM_LastStory = "games/" + GameFilename` (wrong for anything not under `games/`) and `Parchmap.js:256` renders Continue from it. Learned per-game data (`PM_AttrCalib_`, `PM_DiagonalCalib_`, `PM_SemanticActions_`) is keyed by header release+serial (`ZRamReader.gameIdentityKey`), so it is shared with a catalog copy of the same game. Browser saves are Parchment Dialog keys `dirent:<usage>:<gameid>:<filename>`, `content:<same>` and an `autosave:` prefix, not `PM_` keys.
- **Zero-module boot:** `play.html` without `?story=` already routes to `EnsureStoryOrRecover` (start screen). `index.html` with an empty/missing `GameList`, and `SetTitle` with `GameList` undefined, are unproven/likely broken.
- **Emglken/Glulxe** is not wired into `play.html` (D38). `js/VmProbeLoader.js` `scanCurrentStory` does `fetch(storyUrl())` (~line 144), which would 404 for a local module.
- **Corpus formats:** 202 z5, 35 z8, 27 z3, 34 zblorb, 11 gblorb; no raw `.ulx` or `.z4` exists, so those paths need generated/found fixtures or the label "supported by the engine, not proven here".
- `crypto.subtle` exists only in secure contexts; the PWA is also reachable over plain LAN http.

### 13.3 Final design

**M1 Module.** New `js/ModuleLibrary.js`, loaded on both pages after jQuery: single source of truth for which modules exist. New files enter `APP_SHELL`, `CACHE_VERSION` is bumped, the make-dist critical list, the packaging allow-list and the ProductInfo/docs.

**M2 Storage and consistency.** IndexedDB records (bytes plus their own metadata) are authoritative; a small localStorage cache (versioned schema) exists only so `SetTitle` and library rendering stay synchronous. Atomic add/remove transactions; startup `reconcile()` drops cache rows whose bytes are gone and rebuilds rows for bytes lacking one (the library renders from cache, then re-renders after reconcile); quota failure rolls back per file; tabs converge through BroadcastChannel/storage events; a running session survives removal in another tab but reload/Continue fails cleanly. `navigator.storage.persist()` is requested; persistence is best effort.

**M3 Identity.** id = SHA-256 of the story bytes (reviewed pure-JS fallback where `crypto.subtle` is unavailable, proven against standard vectors and against `crypto.subtle`). Story path `local/<64 lowercase hex>.<ext>.js`, extension chosen by SNIFFING, never from the user's file name. For a local story `Parchmap.GameFilename` is that relative path, so per-story keys survive remove and re-add of identical bytes. Identical bytes under different names dedupe to one identity; different bytes with the same file name are different modules. `PM_LastStory`/Continue store the raw story path (fixes the `games/` prefix bug) and Continue is offered only when that story still exists.

**M4 Loader seam.** A `jQuery.ajax` wrapper (vendored `lib/main.js` is not patched; this is a deliberate compatibility seam a later vendor build hook may replace). It intercepts ONLY URLs matching `^local/[0-9a-f]{64}\.(z3|z4|z5|z8|zblorb|gblorb|ulx)\.js$` (no traversal or query ambiguity); delegates every other call byte-for-byte to the captured original; returns a jQuery-compatible Deferred/jqXHR-shaped promise; installs before DOM ready and waits for the IndexedDB transaction; never falls back to the network for a missing local record (friendly error with a link to the library); supports abort/error well enough for `launch`'s catch chain. A harness proves that engine script loading and every non-local AJAX call are unchanged.

**M5 Probe and alternate paths.** `VmProbeLoader.scanCurrentStory` reads ModuleLibrary bytes directly for local modules (otherwise structural probing silently loses evidence). The experimental Emglken host is no longer a shipped runtime path; imported modules always use the standard extension-selected ZVM or Quixe engine.

**M6 Compatibility (bytes sniffed, name ignored).** Raw Z-machine version 3/4/5/8 = FULL (map, actions, items); other versions rejected with a specific reason. Blorb: strict parse (see M7); a Z-code executable of version 3/4/5/8 = zblorb = FULL; a Glulx executable = gblorb = PLAY-ONLY. Raw Glulx (`Glul` magic) with `0x00020000 <= version < 0x00030200` = ulx = PLAY-ONLY (loads and plays through Quixe like the catalog's existing gblorb games; the map/action/item layers are Z-machine features, D28/D36/D38 scope boundary). The `processBase64Zcode('...')` wrapper form is accepted (decoded, then inspected). A format is called "proven" only with a real or generated valid fixture, otherwise labelled "supported by the engine, not proven here" (z4 and raw ulx today). Size cap to be set at implementation.

**M7 Strict parsing.** Checked unsigned arithmetic everywhere: validate FORM length, chunk headers/lengths/padding, RIdx count multiplication, every offset/range, the Exec target chunk type, exactly one selected executable, bounded IFmd. Reject malformed or ambiguous packages before storage. Never allocate from an untrusted length before bounds checks.

**M8 Automatic information and metadata trust.** Title/author come ONLY from the embedded blorb IFmd (iFiction XML) else from a sanitized file name the user can edit; every field is labelled with its origin. Z header release and serial are identity information, never title/author. NO filename-only matching against `GameList` (unsafe: a different story can share a file name). IFmd is parsed in DOMParser XML mode, DOCTYPE rejected, XML/text/field lengths capped, no active markup accepted, rendered only through text nodes. The add dialog shows what will be stored (title, author, origin, format, compat level, size).

**M9 Game-list adjustment.** The library page renders `ModuleLibrary.all()` = visible built-ins (`GameList` data untouched, minus the hidden list) plus local modules. Counts ("Listing N stories"), filters, starred/done flags, `PM_LastStory`, Continue and `Parchmap.SetTitle` all read through `ModuleLibrary`; adding or removing runs one `changed()` path that re-renders the page and updates every stored reference.

**M10 Removal (v1, safe).** Distinct actions: "Remove imported module", "Hide built-in module", "Remove all imported / hide all built-ins" (plus "Restore built-in list"). Immutable APK/PWA assets are never deleted. Removal deletes ONLY module bytes, the cache row, library flags, `PM_LastStory` and the exact hash-path map keys (`PM_Map_`/`PM_MapSlots_`/`PM_GameId_` for `local/<hash>...`). It NEVER deletes Dialog saves, autosaves or calibration data, and never by broad prefix; the dialog and docs say saves are left in place. An "also delete saves" option stays deferred until real-save tests prove exact ownership. There is NO automatic HEAD probing of built-in files: built-ins follow `GameList` plus the hidden list, and clicking a missing file gives a friendly error.

**M11 Add from a folder.** Capability-based: feature-detect `webkitdirectory`, `showDirectoryPicker` and `multiple`; no Android directory-picker claim until device-proven; a usable multi-file fallback always exists. Files are processed sequentially with cancellation between files, bounded per-file parsing, no retained batch buffers, per-file transaction rollback, quota reporting, a progress line and a final summary (added / already present / incompatible with reasons / ignored). Partial success is normal. Base64 is produced only at load time (chunked).

**M12 Boot without a module.** A defined-empty, undefined or 404 `GameList` and a missing `games/` folder must not throw on either page (`SetTitle` guarded; `ModuleLibrary` defines an empty `GameList` if absent). The library shows an empty state with Add module(s) / Add folder / Restore built-in list; `play.html` without a story keeps the recovery start screen and gains the same pointer; no black pane and no stale Continue. This is a runtime robustness requirement, not a release story-content gate, so it does not conflict with D97.

**M13 UI.** Re-enable the library toolbar control (today a commented-out `#import`) as "Modules", opening a dialog (`Message.Show`) with: Add module(s), Add folder, the list of imported modules (title, author, origin, format, compat badge, size, Remove), Hide/Remove-all, Restore built-in list. Mobile-safe (44px targets, the D96 rule that Menu handle/Map tab hide under dialogs). The old `MainMenu.Import` and the `upload.php` path are deleted. Copy: "Only add files you have the right to use." The manager checks technical compatibility, not ownership or permission.

**M14 Privacy/docs.** "No network" applies only to importing and loading stored module bytes; docs must not overclaim speech recognition, PWA update checks or other platform services. Persistence is best effort; clearing browser/app storage removes imports and related local state; with `allowBackup` off, reinstall starts empty.

**M15 Naming and sequence.** New product-owned names are final from the start (`PL_Modules_*`, `pl-module-*`, a `parchlock-*` database name). Pre-existing legacy keys/classes it must touch (`PM_Games_Starred`, `PM_Games_Done`, `PM_LastStory`, `PM_Map_`/`PM_MapSlots_`/`PM_GameId_` via `Parchmap.GameFilename`, existing `pm-*` dialog rules) sit behind ONE small `LEGACY` adapter table so the mechanical rename edits a single place; the dry-run mapping list includes it. The `PL` prefix and ProductInfo naming are frozen first (done: section 12.3 Q5). The module is implemented and verified as a self-contained feature, then the remaining legacy tokens are converted under the single-writer freeze; every d98 test is re-run after the mechanical set, and the mixed-name interim state is allowed only inside the freeze window.

### 13.4 Compatibility with the rest of the system (checked against code, plan and architecture)

Compatible: plan lines on "GameList megatable: do not rewrite first" and "chooser stable / games and user keep loadable" (built-in entries keep their exact `?story=games/<file>` URLs); D38 (Emglken not wired; extension picks the engine); ARCH sections 20/21 (product rule and visible-UI rule: chooser UI only, no debug chrome); section 30/D93 (start screen, dialog rules) and D96 (chrome hidden under dialogs); D97 (technical compatibility check is not a rights check). The learned-data key is content identity (release+serial), so a locally added copy of a catalog game shares its calibration; release+serial is weaker than SHA-256 (pre-existing; not changed here).

Must be handled during implementation: the `PM_LastStory` write/read bug; the unguarded `GameList.find`; the Dialog save-key layout (deletion deferred); `user/` folder stays (dist README, save packages) while the upload path retires; service worker `APP_SHELL`/`CACHE_VERSION`; `local/` virtual URLs must never reach the network or the SW runtime cache.

### 13.5 Required tests (new `harness/d98-*.js`, real Chromium, real files supplied from outside the tree)

- Add one each of z3/z5/z8/zblorb/gblorb and a `.js` wrapper; reject a text file, a zip, a truncated blorb and fake z6/z7/z1 headers; metadata correctness for known files; IFmd XSS/DOCTYPE/oversize; malformed chunk overflow/padding/RIdx offsets/duplicate Exec.
- Play an added z-machine module to a prompt, type a command, save, reload, Continue, remove, re-add the same file (saves and maps restored); a Glulx module boots to its first prompt in Quixe with the play-only badge and no map/action claims.
- Add-folder of the full dev corpus (309): counts, time, memory, no UI freeze, cancellation.
- Remove one / remove all / hide built-in / restore: list, counts, starred/done, `PM_LastStory`, exact map keys only; no Dialog save, autosave or calibration key ever removed; no HEAD requests.
- Zero-module boot on BOTH pages under defined-empty, undefined and script-404 `GameList` (desktop and 390x844 mobile), no page errors, no stale Continue.
- Storage: missing IndexedDB record, corrupt cache row, cache/IDB disagreement, quota failure, interrupted transaction, two-tab add/remove race, removal of the active story in another tab, identical bytes under two names, same file name with different bytes, SHA-256 fallback equals `crypto.subtle`.
- Loader: non-local `$.ajax` parity, local requests never reaching the network or SW cache, probe reads local bytes, `?vm=emglken` rejected for local modules; network-denied run.
- Dialog at desktop and mobile sizes without colliding with the D96 Menu handle/Map tab; then the full D88-D96 sweep and the packaging/rename regression matrix after integration.

### 13.6 Docs to update with the implementation

`ARCHITECTURE_UML.md` section 35 (keep aligned), plan rows for `user/`/`upload.php`, `docs/ai-status.md`, and the public docs through the release-docs work (12.1 items 1-3).

## Known issues (open, found via real gameplay 2026-09-12, not yet fixed/verified)

| Issue | Where | Root cause | Fix in progress |
|---|---|---|---|
| ~~DROP missing from inventory items~~ | `js/ActionSynth.js` `commandsForObject` | Was: one shared `takeable` flag gated both take/drop, so suppressing take collateral-suppressed drop. | **FIXED, independently re-verified 2026-09-12** - `rules.takeable` is now `['take']` only; `drop` is added unconditionally for `context==='inventory'` and `take` is filtered out, independent of the attribute bit. |
| ~~Look-ahead exit direction labels wrong/generic for untraveled exits~~ | `js/ZRamReader.js` `lookAheadExits` + new `directionProps.PROFILE` | Was: labeled by checking if the destination room's name literally equalled a compass word. | **FIXED, independently re-verified 2026-09-12** - real I6 direction-property profile resolves compass exits before travel; numbered/non-compass exits correctly stay honest `exit-N` stubs pre-travel (D23) and get their real label from state-delta post-travel. Verified via new `harness/d23-lookahead-labels.js`, 65/0 PASS (tests up/down/in/out via real property numbers, a numbered exit staying `exit-23` pre-travel, and state-delta labeling it `1` post-travel). |
| ~~Input-line radial ranking was positional, not likelihood-based~~ | `js/Qol.js` `OpenRadial` | Was: overwrote every score with `100 - arrayIndex`. | **FIXED, independently re-verified 2026-09-12** - `Actionable.usageCounts`/`noteUsage`/`usageBonus` track real per-command frequency from `Submit()` (the actual command choke-point, first line of the function); blended additively with the base per-source score; chrome kept as a separate always-visible group, never rank-mixed with RAM-derived items. |
| ~~`tools/ui-regression.js` times out waiting for object-radial "Examine" button~~ | `tools/ui-regression.js:30` | Not a DROP/ranking regression - the Anchorhead locator (`.pm-act:not(.is-stale)[data-object-id]`) didn't exclude `data-kind="direction"` marks (the Lost Pig locator elsewhere in the same file already did), so it could grab a direction mark instead of an object mark and then wait forever for an "Examine" label a direction mark never has. | **FIXED and independently verified 2026-09-12** (claude, directly - after grok correctly diagnosed the root cause across several messages but did not land the one-line edit itself) - added `:not([data-kind="direction"])` to the line-30 locator. Full suite re-verified green: `phase2-heuristic-cutover.js` 117/0, `phase1-closed-container.js` PASS, `d22-ram-matrix.js` 7/7, `d22-post-move.js` 5/5, `d23-lookahead-labels.js` 65/0, `ui-regression.js` PASS. |

**Real-world confirmation (2026-09-12):** operator screenshotted live gameplay on `games/wump2ka.z5` (numbered-exit game, one of the D22 catalog fixtures) - the room text clearly describes two numbered exits ("Exit 1 corkscrews...", "Exit 2 curves..."), but the map panel shows "0 exits." Investigation (grok, 2026-09-12) found this is **not the same bug** as the look-ahead direction-label fix above: `wump2ka`'s numbered exits are implemented as I7-style compass-linked scenery objects carrying a `doorDir` property (values 91-95), an entirely different RAM structure from the I6 `n_to`/`s_to`-style direction properties the fix above resolves. The direction-label fix's own gate (real I6 profile + honest `exit-N` stubs for genuinely unmapped properties) is met and verified (`harness/d23-lookahead-labels.js`, 65/0) - that gate does not require discovering this separate I7 mechanism. **Tracked separately as D35** (see decision log) rather than silently blocking the accepted fix or being silently dropped. Also visible in the same screenshot: the "Known Rooms" panel shows one entry with a garbled placeholder-looking label ("C_ROOMS_13") instead of a real room name - live confirmation of the `js/Map.js`/`js/MapIdentity.js` name-keying problem that Phase 5/D32 (map identity becoming RAM-id-keyed) already exists to fix; not in scope for the fixes above, tracked as the next task after them.

These are tracked here as open findings from real play-testing, not yet closed - do not read either as fixed until this table is updated after independent re-verification.

## Implementation status (live)

**BUILD 46+** ? live Z-RAM scope + D21 clicks working on Alley fixture; **D22 universal matrix still required** before Phase 2 can be marked complete.

### Heart requirement (must work in-game)
- Enter Alley (Anchorhead) ? actionable marks for **cans / window / fence** come from **P2 object IDs in scope**, not from prose regex.
- Map room identity uses **roomId** from `parent(player)` when P2 live.
- Old fragile text-mining must not be the displayed truth when RAM is available.

### Done
- Emglken under `?host=emglken` uses **top-level redirect** into `parchment-single-tapped.html` (iframe boot cannot finish GlkOte; validated Lost Pig room+objects)

- play-emglken.html

- VmProbeLoader

- Specialized gates: wump2ka restore + yagwad continue ? UIPayload specialCommands (DOM whitespace-tolerant)
 (infrastructure / chrome)
- D12-D16, D17-D20 locked in this doc revision
- play.html-only product UI; debug HUD opt-in
- WorldModel Translator seam + provider merge + confidence
- Navigator step-queue (no comma-inject); Reset Map control
- Probe ABI2 story-byte `z_summary` (P2 **light**, not live scope)
- Portable package / NOTICE / harness gates / matrix boot checks

### Not done (D22 matrix + remaining gaps)
- **D22:** prove P2 across rooms + catalog z3/z5/z8/zblorb + Lost Pig/Advent + specialized modules (not only Alley)
- Grammar-table verb extraction (beyond attr-profile ActionSynth)
- Terp-level @undo/@restore hooks (typed-command resync exists; opcode hooks still open)
- Look-ahead exits polish + map identity from roomId everywhere
- Beautify planarize + Glk shielding polish

### Not done (was marked done too early ? corrected)
- Phase 2 live Z RAM: player id, location cascade, room children, short names, dictionary Word<->ObjectID
- Phase 4 structural Actionable primary (depends on Phase 2)
- Look-ahead exits from direction properties
- Grammar-table verb extraction
- Planarization-grade beautify + full Glk window-tree shielding
- Terp-level @restore/@undo hooks

### Next (ordered)
1. Phase 2 live ZVM memory capture on play.html + player/location/scope walk + dictionary binding
2. Actionable/Map consume P2-only marks when structural confidence high
3. Harness: alley RAM-backed cans/window/fence (fail if only text-mine)
4. Look-ahead exits + Phase 4 attr/grammar radials
5. Phase 6/8 guide-gap polish


| D23 | Non-compass topological mapping first-class | [yes] |

### D106 visible state after native file restore

A successful Z-machine `restore_file` must leave the transcript visibly describing the
restored room, not merely update the status line and map while displaying the pre-restore
room plus `Ok.`. The existing D94 observer promised this outcome but only refreshed
model/map/UI observers and scrolled the stale buffer; it never asked the story to print its
restored state.

`ZvmCapture` now preserves the successful opcode identity when notifying
`UndoRestoreSync`. After the 250ms VM settle/resync, `restore_file` alone waits boundedly
for one real, unobstructed Glk line input. The successful VM wrapper clears the main story
window through Glk's native `glk_window_clear` (so Glk's internal buffer and DOM agree), then
the synchronizer preserves the live prompt and submits exactly one normal `look` through
`Actionable.Submit`. This makes the restored room the first visible story content and keeps transcript, recorder, learning, map, and accessibility on
the established command path. Failed restores, `restore_undo`, and `restart` never inject
a command. `harness/audit-restore-sync.js` verifies operation identity, failure isolation,
coalescing, one LOOK for file restore, and passive undo/restart paths.

### D107 parser-owned command nouns

The text used to mark an actionable phrase and the text submitted to a story parser are
separate contracts. `VerifiedNouns` records the longest exact phrase found in printed
story text for underline stability. It is never parser authority. For Inform modules,
`CommandNouns` is rebuilt from property-1 `parserWords` for the current room plus
inventory pool whenever `Actionable.Refresh` observes changed state. Since alias
uniqueness changes as objects enter or leave scope, no first-seen descriptor is retained
as permanent truth.

Selection is deterministic: count alias ownership by distinct RAM object id; prefer an
alias owned by one scoped object; prefer an exact token in the object's display name,
with the rightmost token serving as the base-noun tie-break; otherwise preserve compiler
property order. If every real alias is shared, submit a parser-owned alias and let the
module perform its normal disambiguation. Object-specific calibration separately refuses
an ambiguous alias so a clarification response cannot be learned against the first
payload entry. Modules without structural aliases keep the prior `obj.name` fallback.
No transcript vocabulary, rejection-string mining, module title, or per-story exception
participates in selection.

The acceptance gate is the exact reported Huge Cave object, not a substitute compound
name: reach Tool Room from End of Road (`east`, `north`), open the actual highlighted
`long-handled shovel` radial and verify `examine shovel`, then click the underline and
require the module's steel-blade/long-handle description. The same harness covers scope
changes with two keys, duplicate payload records, short parser words, and empty aliases.

### D108 complete-turn deterministic narration

GlkOte can append later paragraphs to its existing final BufferLine instead of creating
another element. D104's element-identity WeakSet therefore treated genuine new text as
already consumed and stopped narration at a blank-separated paragraph. ReadAloud now
stores the consumed text length per element in a WeakMap and reads only a grown suffix.
DOM-only underline wrapping keeps the same length and remains silent. Raw normalized
lines still drive the optional consecutive-turn repeat filter.

One shared deterministic preparation pass serves native Android TextToSpeech and desktop
Web Speech. It joins retained paragraphs into one payload, removes ASCII/Unicode diagram
geometry while retaining exact lexical labels, expands isolated compass labels, converts
ordinary all-capital words to spoken casing, preserves known initialisms, and removes
only exact case-insensitive duplicate labels. It has no title/module exceptions, fuzzy
matching, timing heuristics, remote model, or engine-specific branch. Required fixtures
include the reported Driving second paragraph, Huge Cave's quoted Tool Room inscription,
Anchorhead-style dash/colon prose, and map diagrams. D100's 4,000-character bound,
interrupt behavior, dialog opt-in, automation mute, and native stop/defer remain intact.

### D109 shared pronunciation correction

Some Android voices pronounce the CH in Anchorhead as in "chef" instead of the K sound
in "anchor." The common speech-preparation path now rewrites only the spoken English
word stem "anchor" to the phonetic spelling "anker" before either native Android TTS or
desktop Web Speech receives it. Displayed story text is unchanged. The bounded stem rule
also covers anchor/anchored while leaving anchovy, ranch, and unrelated CH words intact;
it is case-aware and idempotent.

### D110 deterministic adaptive radial usage

Adaptive command radials now use one deterministic ordering contract across input,
object, inventory, direction, target, and topic menus. The sort tuple is uncapped
session usage descending, static module-derived prior descending, then original array
index ascending. Source labels such as `chrome`, `universal`, and `ram-synth` no longer
form protected groups: one real use immediately moves a command ahead of every unused
command, while a fresh all-zero session preserves the prior-based order.
This operator-approved D110 policy supersedes D26/D93's historical chrome-prefix
decision; those entries remain as implementation history, not the current contract.

Accepted complete commands are counted only by the existing accepted-submit subscriber.
Non-submitting pills (`Enter:false` stems and action-only launchers such as **Use with...**
and **Ask about...**) have explicit interaction keys and count once on activation. The
synthetic **More...** pager and center **Tools** control never count. Ranking uses the
uncapped count; the visual pill fill remains capped at six uses, and the unique-leader
ring is selected globally before pagination from the uncapped count. Fixed Tools and
game-menu lists retain authored order. No ActionSynth/SemanticActions output order,
left-click primary choice, persistence, or reset behavior changes.

An `Enter:false` tap is held as the pending completion until the next accepted command.
If that command is the exact injected text or a boundary-safe completion of its stem,
the radial and accepted counters overlap by one so the effective usage remains one.
An unrelated accepted command clears the pending link without erasing the abandoned
tap. Complete-command usage remains available independently for its exact pill.

Acceptance evidence is `harness/phase2-heuristic-cutover.js` (usage/prior/stability,
6-vs-100 saturation, launcher/stem accounting, exclusions) and
`harness/d96-menu-handle-map-tab.js` (actual browser DOM order, leader/fill,
object-radial reuse, and exactly-once stem activation).

### D111 automatic arrow pad for native grid menus

On the mobile shell, exactly one visible Glk `CharInput` whose closest window is a
`GridWindow` is the conservative structural signal for a native cursor/menu screen.
The Z-machine `read_char` opcode provides no menu or allowed-key metadata, so this is
explicitly a proxy, not a claim that arrow acceptance can be proved. BufferWindow
startup, MORE, and ordinary single-key prompts do not auto-open the pad. Manual
**Tools > Arrow keys** remains available and unchanged.

Eligibility is transition-latched across GlkOte replacing its `CharInput` after each
key. Brief no-prompt gaps receive a bounded grace period; a real LineInput,
BufferWindow CharInput, dialog, tutorial, or radial exits automatic mode. The pad opens
once per eligible visit, respects manual dismissal until mode exit/re-entry, and only
an automatically owned pad closes on automatic mode exit. Its backdrop stops above
the live bottom CharInput strip. A short strip tap therefore closes the automatic pad
and opens the existing keyboard proxy for letters/numbers without event forwarding or
synthetic hit testing.

Acceptance requires real Anchorhead HELP interaction: six touch-driven arrows with
zero visibility transitions over requestAnimationFrame sampling, a real keyboard `Q`
that exits HELP, BufferWindow startup exclusion, re-entry reopening, manual pad/line
history parity, dialog closure, responsive geometry, and desktop exclusion.

### D112 map panel: search placement, collapsible controls, unified notation

Full design in `docs/map-panel-plan-d112.md` (reconciled revision 2, codex GO).
`#room-filter` moved to sit above Known Rooms and narrows Known Rooms and the new
Notes section together. Map controls (Center/Zoom/Reset/Maps) are collapsible via
the existing `<details>` pattern, open by default on desktop and collapsed on the
mobile-compact layout. Adding a note is press-and-hold (mobile) or right-click
(desktop) on a **Known Rooms row only** -- the map canvas gets no new gesture at
all, deliberately sidestepping any drag/pan conflict rather than arbitrating it. A
room box on the map never renders note text inline (the reported bug); it shows
only the existing note icon. One permanent, always-visible Notes section (its
header is never hidden by note count, collapse state, or the preference below) sits
below Known Rooms: unscoped, it lists every room with notes, grouped, in Known-Rooms
order; any of the four existing "view this room's notes" icons scopes it to one
room. Each note has its own edit/delete icon (`ParchLockMap.EditNote`/`RemoveNote`,
both fail closed if the room's note at that index no longer matches the text
captured when the icon was rendered). An optional Add-note button
(`Global.Prefs.ShowNotesAddButton`, default off) can sit beside the Notes header,
toggled in a general Interface & Accessibility area of Options -- not grouped with
map-specific options -- and controls only that button's presence, nothing else.
`ParchLockMap.RefreshMapPanels()` is the single shared refresh point every
mutation/load/import site now calls, so the Notes section never falls out of sync
with Known Rooms. `harness/d112-notes-panel.js`.

### D113 no relative link may ever navigate the app away

Operator-reported: the About dialog's Credits/Privacy/Third-party-notices/Source-
build links were real `<a href="X.md" target="_blank">` navigation. The Android
Capacitor WebView has no real multi-window support, so `target="_blank"` on a
same-WebView relative link does not open a tab -- it replaces the running document,
unloading all JS/game state. The hardware back button then has nothing of this
app's own left to return to, which is what made it look like the game had reset or
closed. `js/ProductInfo.js`'s own doc links are fixed at the source: they now fetch
the doc's own text and render it inside the existing `Message.Show` dialog (already
covered by `MobileLayout.bindAndroidBackButton`'s `Message.IsOpen` check) instead of
navigating anywhere, with a Back-to-About link so a fetch failure is never a dead
end.

Rather than relying on every present and future link in the app remembering not to
repeat this mistake, `Global.BindNavigationGuard` (self-invoked once, at load, from
`js/Global.js` -- the one script both `index.html` and `play.html` load) is a single
delegated `click` listener on `document` that blocks the navigation of ANY relative
`<a href>` unconditionally, everywhere, present or future. A genuine absolute
external URL (a different origin, or `mailto:`/`tel:`) is left alone -- the OS
already handles those safely outside this app. This app's own two intentional,
explicit whole-app exits (Choose story / Exit game) are untouched: both are
programmatic `location.href` assignments, never `<a href>` clicks, so this listener
never sees them. Any screen/overlay opened during gameplay must be `Message.Show`-
based (or one of `bindAndroidBackButton`'s other explicitly-handled cases --
radial menu, native Glk dialog, CharKeys arrow pad, mobile tutorial, the map panel)
so the hardware back button covers it automatically; it must never be a real page
navigation. `harness/global-navigation-guard.js`, `harness/productinfo-doc-links.js`.

### D114 real file export on Android (Filesystem + Share)

Operator-reported, pre-existing (never worked): `MainActivity.java` is a bare
`BridgeActivity` with no `DownloadListener`/`WebViewClient` of any kind, and
Android's WebView does not reliably fire download handling for `blob:` URLs at
all even when one is wired up. `ParchLockQol.DownloadText`'s `<a download>` click
on a `blob:` URL therefore silently did nothing on the APK -- Download map, Text
export, transcript download, and every save-package export all funnel through
this one function, which is why they all appeared broken together while "Save
map" (a named localStorage slot, no OS file interaction) worked fine. Checked and
ruled out a parallel bug in the Module Manager: it has no export/download path at
all, only `<input type=file>` + `File.arrayBuffer()` for importing, both native
and already working.

Fixed by adding `@capacitor/filesystem` and `@capacitor/share` (native plugins,
`npm install` + `npx cap sync android`; both auto-register into
`window.Capacitor.Plugins` the same way `@capacitor/app` already does, with no
HTML script tag needed). `DownloadText` now, when those plugins are present,
writes the blob directly into the app's own Cache directory (no runtime
permission prompt) and hands the resulting `file://` uri to the native share
sheet, letting the player save it to Downloads/Drive/Files/etc. -- the standard,
scoped-storage-safe pattern. Falls back to the original blob-anchor-click
technique unchanged everywhere else (desktop/browser, or a build without these
plugins). A cancelled share (the player backs out without picking a target) is
not treated as an error; a genuine failure shows an in-app message rather than
failing silently. `harness/qol-download-text.js`. Verified: `npm install`,
`npx cap sync android`, and a full `build-android.bat dev` all succeeded with
both plugins compiled in -- native share-sheet behavior on a real device still
needs the operator's own on-device confirmation.

### D115 hardware back must never silently exit/minimize the app

Operator-reported, still reproducing after D113: with nothing else open --
ordinary story text, including a native BufferWindow "[Please press SPACE.]"
MORE/CharInput prompt (D111 deliberately excludes these from the auto arrow-pad,
and they are not a Message/dialog/radial/map state at all) -- `bindAndroidBackButton`'s
final fallback called `CapApp.exitApp()` immediately and silently. A real back
press or back-swipe gesture then killed the whole Activity outright; relaunching
cold-starts the app from scratch, indistinguishable from "the game reset" to the
player, with no warning. Confirmed live: pressing the on-screen SPACE key the
game itself asks for continues normally -- only the hardware back path was
wrong, and only in this one final, nothing-else-open case; every earlier
priority (tutorial, arrow pad, radial, Message dialog, native Glk dialog, map)
was and remains correct.

Fixed: the final fallback now requires `confirm("Exit ParchLock?")` before
calling `CapApp.exitApp()` -- the same native confirmation mechanism this app
already uses for its other destructive actions (Reset Map, Remove all modules),
so back can never again exit/minimize/reset the app without the player
explicitly agreeing first. A genuinely unexpected internal error inside the
handler itself still exits immediately as a last resort (not gated behind
another dialog, since that failure mode is rare and forcing a second dialog
call there risks compounding whatever already broke). Considered and rejected:
having back auto-submit the exact key a native CharInput/MORE prompt is
waiting for (e.g. sending SPACE automatically) -- the Z-machine's `read_char`
opcode carries no metadata about which key is actually expected (the same
limitation D111 already documents), so guessing risks silently submitting the
wrong keystroke into some other char-prompt context (e.g. a real menu expecting
an arrow key) rather than merely failing safe. `harness/mobilelayout-backbutton.js`.

### D116 top compass strip untouchable under the status bar

Operator-reported ("the top section of the screen is not touch capable"):
`#exits .row.horizontal.top` (the N/NE/NW compass strip across the top of the
story window, including its note icon) and the standalone `#current-room-notes`
icon both had hardcoded top offsets (`top: 0` and `top: 20px`) with no
safe-area-inset accounting at all -- unlike every other top-anchored mobile
element in this stylesheet (`#pl-map-tab`, `#map`'s own padding, the message/
options dialogs), all of which are already keyed off `--pl-safe-top`. On a
phone with an edge-to-edge status bar, this rendered those touch targets
partially or fully underneath the system status bar; taps landing there are
consumed by the OS (pull-down notification shade, etc.) before ever reaching
the WebView, indistinguishable from "the top of the screen just isn't
touchable." Fixed by shifting both elements down by the real
`env(safe-area-inset-top)` on mobile only, matching this file's own
established convention exactly -- desktop's base rules are untouched.
`harness/exits-safe-area.js` (static source-text check; a live hit-test needs
a real device, which the operator's own report already confirms).

**Follow-up (same session, operator-reported again after installing the fix):** `--pl-safe-top`
alone only clears the OS status bar. `#windowport` itself starts BELOW that
(`top: 8px + --pl-safe-top`), and the restored Glk status `GridWindow` (D93 G47 -- the "Deck Nine /
Score / Turns" banner) renders as that window's own first line, a real in-app banner with no static
CSS height. Without also clearing that, the compass strip/note icon landed on or under the in-app
banner instead of the OS status bar -- same symptom, different obstacle. Fixed by measuring the
real `GridWindow.reverse` element's rendered height live in `MobileLayout.apply()` (same discipline
as `--pl-kb-inset`, not a guessed constant) into a new `--pl-statusbar-h`, and adding it into both
elements' `top` offset alongside `--pl-safe-top`. `harness/exits-safe-area.js` extended to 7/7,
now also checking the live-measurement code itself exists, not just the CSS.

### D117 directional radial overlay -- PROTOTYPE (exits-only, not the full design)

Full design in `docs/directional-radial-plan-d117.md` (revision 2, all 7 open questions resolved
by the operator). Tonight's implementation (`js/DirectionalRadial.js`, new) is a working prototype
of ONLY the player-initiated path, built under a tight session-credit budget:

A small, translucent, continuously-pulsing handle sits above `#pl-input-submit` (safe-area-aware
per D116's convention), default ON. Press and hold (built on Pointer Events + `setPointerCapture`,
the same event model `ParchLockMap`'s own map-drag already uses -- this is also why the gesture
already works with a mouse on desktop, "for free," per the operator's "maps to PC" note) expands a
compass rose of the CURRENT room's real exits (`ParchLockMap.GetCurrentRoom().Exits`, dynamic per
room/module). Sliding across a slice highlights it (angle+radius bucketing, not
`elementFromPoint`); releasing over a highlighted slice submits it immediately via
`Actionable.Submit` -- no separate Enter step. Operator's requested extra placement: Up/Down sit on
the same angle as N/S but an outer ring ("above" as an outward extension); In/Out sit on the main
ring at E/W's radius but offset in angle ("to the right of east" / "to the left of west").

**Explicitly NOT built tonight** (still only in the plan doc, not implemented):
- No programmable settings UI, no per-module persisted custom layout (plan section 2.5).
- No merge with D111's GridWindow-CharInput arrow pad (plan section 2.7) -- `CharKeys`'s existing
  arrow pad is completely untouched by this file; the two systems are still fully separate tonight.
- No D63 numbered-exit-game slot support (compass words + up/down/in/out only -- `LAYOUT` has no
  generic fallback for e.g. a wump2ka-style `"exit 1"` key; that exit is silently skipped, not
  crashed on).
- No dedicated keyboard-only trigger (operator's "maps to PC" note) -- the mouse-driven
  hold-drag-release already works via Pointer Events, but a keyboard-only equivalent (for a player
  who can't use a mouse or touch at all) is a real, separate, not-yet-designed gap.

Caught and fixed during its own test pass, not by inspection: the angle+radius hit-test's first
draft used a fixed distance-tolerance window per ring, which overlapped between the main and outer
rings and let a tie be broken by array order instead of genuine proximity -- fixed to pick the
nearer RING by radius first, then the nearer slice by angle within it only.

**Polish pass (same session, operator live-tested and reported two more real defects):**
1. **Edge-of-screen reach.** The handle lives in a screen corner (above the submit button), so the
   ring can't always be centered under the finger without running off-screen. Added
   `chaseIfNeeded`: once the finger presses beyond the ring's usable reach, the ring itself shifts
   toward the finger (clamped to the viewport) -- "slide too far right, it moves over; slide too
   far down, it moves itself up" (operator's own words). Slices never move relative to the ring
   (positioned via `calc(50% + Npx)` on the ring container), so shifting the container carries the
   whole compass with it.
2. **Pill overlap ("pills all over the place, no circular pattern," operator-reported live).** The
   first draft put In/Out on the MAIN ring only 22 degrees from E/W -- at that radius, 22 degrees is
   less arc-length than a single pill's own width, so any room with both e.g. "e" and "in" (an
   ordinary combination) rendered two overlapping pills every time. Fixed by giving In/Out the exact
   same treatment Up/Down already had: same angle as E/W, but the OUTER ring -- radius separation
   instead of a tight angle. Also widened `MAIN_RADIUS`/`OUTER_RADIUS` (80/148 -> 92/168) and
   shrank the pill CSS, and added an exhaustive test (not just one example) proving every pair of
   same-ring slices in the whole `LAYOUT` table is at least 45 degrees apart with real arc-length
   clearance over a rendered pill's width -- no combination of a room's exits can reproduce this bug
   class again. Attempted a live Playwright/Chromium screenshot diagnosis first; the test story
   never reached a real room in that harness (a separate, unresolved environment quirk, not related
   to the actual fix) so this was verified by the exhaustive geometric test instead.

`harness/directional-radial.js` now 24/24 (was 13). `harness/_dirpad_live_probe.js` (new, kept for
future live-browser diagnosis) is not yet working end-to-end -- noted, not silently dropped.

Verified: `harness/directional-radial.js` (13/13, pure slice-population and hit-test logic --
real touch/mouse gesture timing on a device is not exercised here); full regression sweep across
every harness touched this session all green; `build-android.bat dev` succeeded with this file
compiled into both `capacitor-www` and the Android assets. Not yet verified: real on-device
press-and-hold/slide/release feel, which only the operator can check.

**Day 2: full implementation (operator: "I want everything fully implemented"; full audit + codex
review requested).** Compacted the radial further and moved the handle from above the submit
button to the horizontal center of the screen, above the input row (operator-reported: "radials
are two large," "activation spot at the center... above the text input line"). `MAIN_RADIUS`/
`OUTER_RADIUS` 92/168 -> 68/118; pill CSS shrunk again; still keeps the same exhaustive 45-degree
same-ring separation guarantee (re-verified: 68px radius still keeps 45 degrees of arc comfortably
wider than the now-smaller pill).

Then built everything the "explicitly NOT built" list above still listed as missing:
- **Programmable settings UI** (`DirectionalRadial.ShowSettings`, a `Message.Show` panel matching
  `WorkspaceUI.ShowMaps`' weight): add/edit/delete custom ("static") slices with their own label,
  command, angle, and ring; additional custom rings (2+) are entirely player-defined and use a
  generalized `RadiusForRing(ring)` (0/1 built-in, 2+ step outward by `RING_STEP` -- unbounded, not
  hardcoded to two rings). Two entry points: a genuine short TAP on the handle (a hold still opens
  the radial; the move-cancel/fired-state machinery already distinguished these), and a
  "Configure directions..." button in Options -- the same one dialog on desktop and mobile, per the
  operator's "share the same, able to be programmed" instruction; there was never a
  platform-specific settings surface to begin with, since this is one file.
- **Per-module persisted custom layout** (plan section 2.5): `PL_DirRadial_<GameFilename>`
  localStorage key, the same convention `ParchLockMap.Save/Load` already established for map data.
  Verified isolated per module (switching `GameFilename` shows none of another module's slices).
- **D63 numbered-exit-game slot support**: any exit key not in `LAYOUT` (e.g. wump2ka-style
  `"exit 1"`) now borrows a leftover ring-0 slot, then ring-1, via the same
  claimed-angles-excluded-first principle `js/Map.js`'s own `ALL_SLOTS`/`assignSlot` already uses --
  never colliding with a real compass/up-down-in-out slice the same room also has. Gets a short
  borrowed label (`LabelForBorrowed`: "exit 1" -> "E1").
- **Keyboard-only path** (operator: "maps to PC... is it implemented?"): a keyboard shortcut opens
  the radial at the handle's own position; `Tab`/`Shift+Tab` cycle by index, arrow keys cycle by
  nearest real compass angle to that arrow's direction; `Enter` submits the current selection;
  `Escape` cancels. Its own listener, ignoring every key while focus is in a real text field, never
  competing with Input.js's own keydown handling or with typing a command. (The shortcut itself was
  Alt+D here originally; codex's audit below found that reserved by Chrome/Edge for the address bar
  and it was changed to Ctrl+Alt+D.)

Deferred at the end of Day 2 (a deliberate judgment call, not an oversight): merging D111's
GridWindow-CharInput auto arrow pad into this same widget. Sent codex a full adversarial audit
request for everything above (bus #781/#782).

**codex's D117 audit (bus #782): 5 blockers, 4 medium, all fixed same session.** Codex reproduced
several defects LIVE via Playwright, not just by reading the code:
1. The disabled preference was ignored after reload (`ApplyEnabledState()` ran before
   `Global.LoadPrefs()` finished) -- fixed by re-applying it in `ParchLock.Init()` immediately after
   `LoadPrefs()`.
2. The keyboard path could submit a command while completely invisible behind an open dialog (CSS
   `visibility:hidden` under an overlay was never checked) -- fixed with a single `CanOpen()` gate
   checked at every open attempt AND on every keydown while already open (an overlay can appear
   mid-selection).
3. Custom (Settings) slices could render off-screen on a narrow phone, and two slices at the same
   ring+angle silently made the second unreachable -- fixed with viewport-aware uniform radius
   scaling in `expand()` and `HasCollision()` rejecting a save that would collide with a real
   built-in slot or another custom slice.
4. No mutual exclusion with `CharKeys`' arrow pad at all (the merge itself was correctly deferred,
   but even a basic guard was missing) -- fixed by adding one condition to `CharKeys.autoPadBlocked()`
   (block while `pl-dirpad-open`) and mirroring it in `DirectionalRadial.CanOpen()` (block while
   `CharKeys.isPadOpen()`) -- immediate two-way exclusion without touching either system's own
   lifecycle logic.
5. `js/DirectionalRadial.js` was missing from the service worker's precache list, and the cache
   version wasn't bumped -- installed PWA clients might never have received the feature. Fixed
   (`parchlock-shell-v27` -> `v28`).
6. Pointer lifecycle never verified `pointerId`, and capture only started once the hold fired (a
   finger drifting off the small handle before then could evade every handler) -- fixed: capture at
   `pointerdown`, verify `pointerId` in every subsequent handler, only one `_press` tracked at a
   time, plus `lostpointercapture`/window-blur/`visibilitychange` cleanup so nothing can leak stuck.
7. A corrupted/hand-edited `localStorage` record crashed `GetSlices()` -- fixed with
   `NormalizeCustomSlice()` validating every field (bounded finite numbers, non-empty bounded
   strings, a stable id) and discarding anything invalid rather than trusting raw storage.
8. Accessibility gaps (20px hit target, no keyboard focus/activation, no ARIA state, Settings using
   clickable `<div>`s) -- fixed: the handle is a real focusable 44px-hit-target button (`Enter`
   activates the radial, `Space` opens Settings) with a visually-hidden `aria-live` region announcing
   the current selection; Settings edit/delete are real `<button>`s.
9. Plain `Alt+D` is reserved by Chrome/Edge for the address bar and may never reach page JS -- changed
   to `Ctrl+Alt+D` (still needs the operator's own live confirmation, not just this structural fix).

`harness/directional-radial.js` grew to 71/71 covering every fix above. Full regression sweep green;
`build-android.bat dev` succeeded.

### D118 merge D111's arrow pad into DirectionalRadial

Full design: `docs/dirpad-arrowpad-merge-plan-d118.md`. Operator: "I want plans to merge the arrow
key system as well. It needs to be done" -- plan written, then implemented same session (operator:
"go ahead and implement that when you're done writing the plan... we'll have co-audited afterwards").

One shared handle/ring shell now renders both modes via a `mode` parameter on `expand()`: `"exits"`
(unchanged -- room's real exits + custom slices, slide-to-select) and `"arrows"` (new -- Up/Left/
Enter/Right/Down, discrete tap-per-button, real `<button>` elements, Enter at dead center via a
`ring: "center"` sentinel special-cased in the positioning math). `js/CharKeys.js` keeps its ENTIRE
eligibility/lifecycle state machine untouched (`_autoEligible`, `syncAutoPad`, `autoPadBlocked`,
`_autoExitTimer`, `_autoSuppressed`, `_autoPadOwned`) -- only its four rendering functions
(`openArrowPad`/`closeArrowPad`/`isPadOpen`/`refreshPad`) now delegate to `DirectionalRadial`
instead of building a separate `#pl-arrowpad` DOM tree; `buildPad()` and `CharKeys.pad` are retired
entirely. All three external callers (`js/Input.js`'s Escape chain, `js/MobileLayout.js`'s back
button, `js/WorkspaceUI.js`'s Tools menu) needed zero changes -- identical function signatures.

Three real bugs caught and fixed during implementation, none by a first pass:
1. **Self-blocking deadlock**: the D117-audit-fix version of `autoPadBlocked()` checked
   `pl-dirpad-open` unconditionally -- once arrow mode ALSO set that same class, the auto-pad's own
   open state satisfied its own "blocked" condition, so the very next `sync()` tick after
   auto-opening would immediately close what it just opened. Fixed: exclude the case where
   `DirectionalRadial._mode === "arrows"` (block only for the OTHER/exits mode, never our own).
2. **Unclickable arrow buttons**: `#pl-dirpad-ring` is `pointer-events:none` (inherited by
   children, intentional for exits-mode slices which rely on pointer capture instead). Without an
   explicit override, every arrow-mode button would have been silently dead in a real browser --
   the fake-DOM harness has no real CSS cascade and could never catch this. Fixed with
   `pointer-events: auto` on `.pl-dirpad-slice--arrow`.
3. **Missing outside-tap-close**: the retired `#pl-arrowpad` had a real full-screen backdrop, so
   "tap outside the circle closes it" came free. The new shell has no backdrop. Rebuilt explicitly:
   `bindOutsideTapClose()`/`unbindOutsideTapClose()`, a capture-phase document `pointerdown`
   listener scoped to exactly while arrow mode is open.

Verified by updating the two existing REAL-BROWSER Playwright suites (they hardcoded the old
`#pl-arrowpad`/`.pl-arrowpad__*`/`data-key` selectors) rather than writing new synthetic-only
tests: `harness/d105-review-fixes.js` 43/43, including 187 real animation frames sampled during six
actual arrow presses with zero visibility transitions -- the exact D111 "no flicker" acceptance
gate. `harness/d105-input-contract.js` 58/58, including the real "tap outside closes the pad,"
"Escape closes the pad," "arrow pad Up at a LINE prompt recalls history," and responsive geometry
at 320x640/390x844/740x390. `harness/directional-radial.js` grew to 87/87. Sent codex a full
adversarial co-audit request (bus #784) at the operator's explicit instruction, the same rigor as
the D117 audit above.

### D119 codex D117/D118 audit fixes (bus #786) + settings-merge follow-up + desktop arrow overlay

Three threads, same session:

**1. Operator-confirmed settings gap**: `DirectionalRadialEnabled` (D117's Options toggle) was
never actually extended to cover D118's merged arrow-pad mode -- `ApplyEnabledState()` only ever
hid the exits-mode handle element; the auto arrow pad and manual **Tools > Arrow keys** stayed
fully live even with the preference off. Fixed: `CharKeys.autoPadBlocked()` and `openArrowPad()`
both now also check `Global.Prefs.DirectionalRadialEnabled === false`; the Tools menu hides the
"Arrow keys" entry entirely when off; the Options checkbox label was reworded to state it covers
both modes of the one merged widget.

**2. Codex's real adversarial D117/D118 audit (bus #786)** -- live Chromium reproduction, not code
review, verdict "not ready for operator live test / APK rebuild": 2 blockers + 3 high-severity
runtime defects, all reproduced live and all fixed same session:
- **Blocker 1 (matches an old operator report)**: `ParchLock.EnsureStoryOrRecover`'s "Continue"/
  "Choose a story" recovery-screen controls were real `<a href>` anchors, which D113's
  `Global.BindNavigationGuard` unconditionally blocks for every relative link, everywhere --
  both were silently dead. Fixed: both are now real `<button>`s doing a programmatic
  `location.href` assignment, the same established pattern `js/WorkspaceUI.js`'s own intentional
  whole-app exits (Choose story / Exit game) already use, per the guard's own documented
  exemption -- no new exemption mechanism added to the guard itself. `#start-screen` CSS extended
  to style `<button>` identically to `<a>`. `harness/parchlock-recovery-nav.js` (new, 11/11).
- **Blocker 2**: the directional handle was visible and hit-testable before any story existed
  (real probe: no-story recovery screen, `handle.hidden=false`, hit-testable). `ApplyEnabledState`/
  `CanOpen` had no playable-story gate at all. Fixed with `DirectionalRadial.IsStoryPlayable()` --
  reuses `js/ParchLock.js`'s own established `$("#windowport .BufferWindow").text().length > 0`
  signal (not a new heuristic) plus a `no-story` body-class check and a `GridWindow` check for
  legitimate native-menu-only screens -- checked by both `ApplyEnabledState` and `CanOpen`, and
  re-evaluated live via two narrow `MutationObserver`s (`#windowport` childList, `body` class
  attribute) matching `js/ParchLock.js:183`'s own existing observer precedent.
- **High 3**: focusing the handle and pressing Enter opened keyboard mode AND immediately
  submitted the first slice (North) in the same keystroke -- the handle's own `keydown` bubbled to
  `BindKeyboard`'s document-level listener, which read the same Enter a second time as "submit
  while open." Fixed with `e.stopPropagation()` on the handle's own Enter/Space keydown handler.
- **High 4**: merged arrow-mode `<button>`s were keyboard-inert -- `pressKey` only fired from
  `pointerdown`, and the `click` handler unconditionally swallowed every click (correct for the
  trailing synthetic click after a real pointer press, wrong for a keyboard-only Enter/Space
  activation, which fires ONLY `click`). Fixed with a `firedByPointer` flag distinguishing the two
  cases -- `pressKey` now fires exactly once either way.
- **High 5**: `forceReset()` (blur/`visibilitychange` cleanup) called `DirectionalRadial.collapse()`
  directly in arrows mode, bypassing `CharKeys.closeArrowPad`'s ownership bookkeeping --
  `_autoPadOwned`/`_autoEligible`/the exit timer were left stuck, so a background/foreground cycle
  during an auto-opened pad silently stopped it from ever reopening for the rest of that native
  menu. Fixed: `forceReset()` now routes arrows-mode teardown through
  `CharKeys.resetAutoPadState(true)` + `CharKeys.closeArrowPad("system")` instead of collapsing
  directly; exits mode is untouched (still calls `collapse()` directly, no CharKeys involvement).
  Stale header comments claiming the D111 merge was still deferred were also corrected.

**3. Operator: "there has to be a desktop version" of the arrow-key overlay, then corrected twice
in-session ("no auto-detect on PC," "default OFF -- PC already has a keyboard with arrow keys")**:
new `Global.Prefs.DesktopArrowPadEnabled` (default `false`), a manual-only Options checkbox shown
on the non-mobile branch only. `DirectionalRadial.ApplyEnabledState()` drives it (open via the
existing `CharKeys.openArrowPad()` manual entry point, close via `closeArrowPad()`) strictly scoped
to `!pl-mobile` so it can never touch mobile's own auto-detect/Tools-menu-owned pad in either
direction. CharKeys' native-grid-menu auto-detection (`syncAutoPad`) is untouched and stays
mobile-only exactly as before (gated by `Input.ManagesMobileIme()`/`ParchLockNoGlkAutofocus`,
which already requires `pl-mobile`) -- there is no auto-open on desktop to conflict with.

`harness/directional-radial.js` grew to 108/108 (new playable-gate, `forceReset` ownership-routing,
and desktop-toggle coverage, including an explicit "never touches mobile" assertion).
`harness/parchlock-recovery-nav.js` new, 11/11. Full regression: `harness/d105-review-fixes.js`
43/43, `harness/d105-input-contract.js` 58/58, both still green with zero new failures. Sent codex
a fresh full audit request (bus #788) per the operator's instruction, same rigor as bus #782/#786.

**Codex ran out of credits before replying to bus #788.** Operator: "you'll have to do your own
adversarial audit." Built `harness/d119-live-audit.js` (new, real Playwright/CDP Chromium, real
Anchorhead, 45/45) targeting every #786 fix plus both follow-ups with genuine live reproduction --
not code review -- the same standard codex's own audits used. It found 2 more real bugs, neither
caught by the synthetic harness, in the fixes made earlier THIS session:

1. **stopPropagation() over-blocked ALL subsequent Enter presses, not just the opening one.** The
   high-3 fix for codex's "Enter opens and immediately submits" defect used an unconditional
   `e.stopPropagation()` on the handle's own keydown handler. Live-tested against a real room:
   the FIRST Enter correctly opened keyboard mode without submitting (the actual fix working) --
   but every LATER, separate Enter press was also swallowed by the same handler, since focus
   never moves off the handle during a keyboard-mode session (nothing moves it away). That meant
   Enter could open the ring once but could never submit afterward -- a new regression, strictly
   worse than the bug it replaced. Fixed correctly: the handle's keydown handler now checks
   `DirectionalRadial._keyboardOpen` first and does nothing at all once already open, letting the
   event bubble naturally to `BindKeyboard`'s document-level listener, which is what actually
   submits the highlighted slice.
2. **Arrow-mode buttons' keyboard fix depended on the browser's native click-on-Enter default
   action, which does not reliably fire on this app's actual loaded page.** Verified directly: even
   a bare, unstyled probe `<button>` freshly appended straight to `document.body` on the real
   running page failed to synthesize a `click` on a real Playwright-dispatched Enter, with
   `e.defaultPrevented` confirmed `false` at every listener phase checked -- ruling out a simple
   preventDefault conflict; root cause not fully isolated, but relying on an unreliable native
   default action would be wrong regardless of the exact cause. Fixed by handling Enter/Space
   explicitly with the button's own `keydown` listener (using the same `firedByPointer` flag,
   auto-reset after 350ms, to still de-dupe against a genuine trailing native click on browsers
   where one does fire) instead of depending on implicit browser activation at all.

All 5 of codex's original #786 findings, both this-session follow-ups (settings-merge gap, desktop
toggle), and both of these newly self-found bugs are now verified with real Chromium reproduction:
no-story recovery screen buttons actually navigate (Continue and Choose a story, both real
`location.href` clicks, no blocked-navigation console warning); the handle is genuinely
hidden/non-hit-testable pre-game and becomes visible/hit-testable once a real room with real known
exits loads; a focused handle's Enter opens without submitting AND a later Enter still submits
correctly; a real keyboard Enter on a focused arrow button fires the game key exactly once, and a
real touch press on the same button still fires exactly once too (no double-fire regression); a
real `blur` event closes an auto-owned pad and clears its ownership/eligibility/timer state
synchronously, and a genuine later eligible tick does reopen it afterward (the actual practical
consequence of the fix); the desktop toggle checkbox opens/closes the overlay through the real
Options UI, defaults off, is idempotent under repeated re-evaluation, and never calls
open/closeArrowPad on a real mobile context under any pref combination. `harness/directional-radial.js`
still 108/108, `harness/d105-review-fixes.js` 43/43, `harness/d105-input-contract.js` 58/58,
`harness/parchlock-recovery-nav.js` 11/11 -- full regression clean. Proceeding to rebuild the APK
per the operator's instruction.

### D120 non-live adaptive tutorial (full implementation) + phone-landscape portrait prompt

Full contract in `docs/ai-plan.md`'s stored "D113 Non-Live Adaptive Tutorial" plan (codex's
design, adversarially audited and corrected by claude at #785/#786 before implementation --
splash-routing risk, harness suppression-key blast radius, and voice/tone guidance folded in).
Operator: "let's go ahead and implement this in full."

**Architecture.** New isolated route: `tutorial.html` + `js/Tutorial.js` + `css/Tutorial.css`.
Loads only `lib/jquery.min.js`, `js/ProductInfo.js`, `js/Global.js`, and itself --
`harness/tutorial-isolation.js` proves this mechanically (allowlist match, forbidden-file list,
forbidden-global scan of both the HTML and the JS source, no direct `localStorage.setItem` outside
`Global.TutorialMarkComplete()`). Runs entirely on original "Training Adventure" dummy data in
memory (two dummy library cards, one dummy room/exit/inventory, a dummy map with three rooms) --
`harness/tutorial-storage-spy.js` seeds sentinel values into every real storage key
(`PL_Prefs`, `PL_LastStory`, `PL_MapSlots_*`, `PL_DirRadial_*`, `PL_Favorites`, `PL_Done_*`) and
proves a full sweep of dummy interactions (favorite/done/search/actionable/ranked-command/mic/
directional-handle/map-controls/hold-to-add-note) leaves every one byte-identical, through both
Done and Skip.

**Completion contract.** `Global.TutorialVersion`/`TutorialStorageKey` (`PL_TutorialSeen`,
versioned) replace the old `PL_MobileTutorialSeen`, with `Global.TutorialIsComplete()` migrating an
existing legacy completion deliberately (honored once, then written forward to the new key) so
upgrading players are never surprised by a full tutorial they didn't ask for. Single shared
functions in `js/Global.js` (loaded by all three pages) so `index.html`'s routing and
`tutorial.html`'s own Done/Skip can never disagree.

**Routing (plan audit fix A applied).** Hooked into `js/MainMenu.js`'s own `Init()`, before any
module-library work starts -- deliberately NOT into `img/ParchLockSplash.js`'s shared completion
callback, since that file is a per-session, per-PAGE gate that also runs independently on
`play.html`; routing through it risked hijacking a legitimate direct-to-play launch (Android
cold-start resume, or D119's own "Continue" recovery button) into training instead of the
player's actual game. `harness/tutorial-flow.js` gate 3 proves first-install routing on both
mobile and desktop, exactly-once behavior after completion, and that `play.html` is never
redirected into training under any tutorial-key state (`harness/d96-menu-handle-map-tab.js`'s new
D120 assertions).

**MobileTutorial retirement.** The entire `MobileTutorial` object, its `bindAndroidBackButton()`
branch, and its `#pl-mobile-tutorial`/`.pl-mobile-tutorial__*` CSS are deleted from
`js/MobileLayout.js`/`css/ParchLock.css` -- not left as dead code. `DirectionalRadial.CanOpen()`
and `CharKeys.autoPadBlocked()`/`reconcileOverlays()`/`sync()` had their `MobileTutorial`/
`pl-mobile-tutorial-open` checks removed outright (not renamed to a new flag): since the D113
tutorial is a genuinely separate route that never loads either file, there is no longer any
scenario where "tutorial active" and "widget trying to open" can occur in the same JS context to
guard against -- a replacement flag would have been dead code, not real defense-in-depth. Documented
in both files for whoever revisits this if a future tutorial ever runs inline again.
`harness/mobilelayout-backbutton.js` asserts `MobileTutorial` no longer exists as a global at all.

**Settings.** `js/WorkspaceUI.js`'s old mobile-only "Replay mobile tutorial" button is replaced
with platform-neutral **Replay tutorial** / **Reset tutorial**. Replay warns via `confirm()` before
leaving the live game underneath Options (the same pattern as Exit Game) since Options only exists
on `play.html`; Reset touches only the completion key, no navigation. Both verified live in
`harness/d96-menu-handle-map-tab.js` (confirm-then-navigate, decline-stays-on-play.html).

**Three real bugs found only by live-testing the actual copy/interaction, not by inspection:**
1. `stopPropagation`-guarded Enter/Space on the handle's own keydown could still be swallowed by an
   over-broad guard in an early draft -- fixed to only intercept the closed-to-open transition.
2. The compass demo (Chapter 2.4) never closed if the player released without hitting a direction
   button, leaving it sitting over the input row indefinitely -- fixed with a short delayed close
   on the handle's own `pointerup`.
3. `#tut-card` lacked `box-sizing: border-box`, so the desktop side-panel actually rendered 357px
   wide against a specified 320px -- eating 37px into the 20px gap `padding-left: 340px` was meant
   to preserve and causing a genuine (if narrow) overlap at that boundary.

**Responsive layout bugs found running the full viewport matrix (not just one device size):**
`css/ParchLock.css`'s base `body { position: fixed; height: 100% }` (the live app's own
SimpleBar-scrolls-internally convention) was silently inherited by `tutorial.html` for its shared
color tokens, making the ENTIRE page non-scrollable (`window.scrollTo()` a confirmed no-op) --
overridden for `body.pl-tutorial` specifically. `placeSpotlight()`'s scroll-correction needed three
passes to get right: (a) a verify-and-retry loop with an absolute `scrollTo` (not a compounding
relative `scrollBy`), (b) centering within the safe area *above* the mobile bottom card, not the
whole viewport (a short 320x640 phone can have that card take up most of the screen), (c) skipping
the mobile-card math entirely above the 720px desktop breakpoint but still doing *ordinary*
vertical scrolling there too, since a short-height desktop-width viewport (a phone in landscape,
e.g. 844x390) has no card to dodge but can still need scrolling on its own. The `#tut-map-tab`
(`position: fixed`) and `.tut-map-canvas` (240px tall) both needed direct layout fixes since no
amount of scrolling can rescue a fixed element or a target physically taller than the available
space. `harness/tutorial-flow.js` gate 5 covers 320x640, 390x844, 768x1024 (tablet), and 1280x800
across the full 23-step walkthrough (844x390 phone-landscape was proven at this same geometry
first, then deliberately removed from this click-through matrix once the portrait-prompt below
started correctly blocking interaction at that exact size -- its own coverage moved to
`harness/portrait-prompt.js` instead, since a real player never reaches the tutorial there
anymore): 204/204.

**Phone-landscape portrait prompt (operator follow-up, same session).** Operator: personally never
plays in landscape on a phone and questioned whether it's really usable there, but tablets should
stay freely rotatable -- a narrower ask than D93's original "don't discourage landscape at all,"
which is preserved for tablets and left completely alone. `Global.IsPhoneLandscape()`/
`BindPortraitPrompt()` (one shared implementation in `js/Global.js`, all three pages) show a pure
CSS overlay -- nothing paused, destroyed, or reloaded underneath -- whenever the *smaller* viewport
dimension is under 600 (Android's own `sw600dp` tablet qualifier, not an invented threshold) and
the aspect is landscape. Dimension-only, matching `MobileLayout.isCompact()`'s own established
"touch capability and compact layout are different questions" precedent -- a small desktop window
at phone-like dimensions gets the same prompt. `harness/portrait-prompt.js`: 27/27, including the
exact 599px/600px threshold boundary, live mid-session rotation with no reload, and confirmation
that tutorial/game progress survives the whole rotate cycle untouched.

**Cache/package.** `service-worker.js`: `tutorial.html`, `css/Tutorial.css`, `js/Tutorial.js` added
to `APP_SHELL`; `js/MainMenu.js` also added, a pre-existing gap (it was never precached despite
`index.html` requiring it to boot) found and fixed while touching this file, not introduced by
D120. `CACHE_VERSION` bumped `v28` -> `v29`.

**Full regression.** New: `harness/tutorial-isolation.js` 43/43, `harness/tutorial-storage-spy.js`
15/15, `harness/tutorial-flow.js` 204/204, `harness/portrait-prompt.js` 27/27. Updated:
`harness/mobilelayout-backbutton.js` 10/10, `harness/d96-menu-handle-map-tab.js` 97/97 (D103
assumptions replaced with D120 ones per the plan's own validation gate 7).  Unchanged and still
green: `harness/directional-radial.js` 108/108, `harness/d105-review-fixes.js` 43/43,
`harness/d105-input-contract.js` 58/58, `harness/d119-live-audit.js` 45/45 (one assertion needed
reseeding `PL_TutorialSeen` since it predates D120's own index.html routing change),
`harness/d95-mic-hold.js` 29/29, `harness/global-navigation-guard.js` 13/13,
`harness/productinfo-doc-links.js` 15/15, `harness/exits-safe-area.js` 7/7,
`harness/d112-notes-panel.js` 31/31, `harness/qol-download-text.js` 11/11,
`harness/parchlock-recovery-nav.js` 11/11. `USER_GUIDE.md` updated (tutorial section rewritten,
desktop arrow-overlay and portrait-prompt behavior documented).

### D120 follow-up: persona-based tutorial review + live-reported real-app directional-handle bugs

Operator: "take on the persona of a user and take the tutorial in full... make any adjustments you
feel it needs." Screenshotted all 24 steps at 390x844 and reviewed as a first-time player would,
not just via automated geometry/isolation checks. Found and fixed, in `js/Tutorial.js`/
`css/Tutorial.css`/`tutorial.html`:

1. The map tab (`#tut-map-tab`) was appended once at Init and visible in EVERY chapter, including
   Chapter 1's library (before its own step ever explains it) and Chapter 3's map (tapping "Map"
   while already looking at the map). Now hidden outside the play-screen chapter.
2. Spotlight halos clipped straight into adjacent card text (only 2px between title/author lines
   vs. the spotlight's own ~7px halo) -- widened the gap.
3. The actionable-word target ("brass lantern") wrapped across a line break, so its bounding-box
   spotlight covered the ENTIRE paragraph instead of one word -- narrowed the target to a single
   word ("lantern") that can't wrap.
4. The directions-handle demo visibly overlapped the "Show a Help screen" button above it (34px
   negative offset vs. only 14px of clearance) -- widened the gap.
5. Edge banners (`.tut-edge-top` etc.) were positioned relative to the whole scene, landing them
   over the "Playing a story" heading instead of the story box they're meant to frame -- nested
   inside `#tut-story-text` with much smaller offsets instead.
6. The finish chapter's own heading ("You're ready to explore!") could scroll off-screen (the
   spotlight-centering logic pushed it up to center the button below); scroll to the top for this
   one scene instead, so the payoff line is always the first thing seen.
7. Three copy fixes: favorites-step copy opened with "Nice!" as if the player had already tapped
   the star before they'd done anything; the status-strip step assumed a prior optional interaction
   ("like the one you just saw"); the map-return step claimed two visually different controls were
   "the same control." All rewritten to stand on their own.

**Two deeper bugs found only by testing on a REAL wide desktop monitor** (operator-reported, not
caught by this session's own viewport matrix, which topped out at 1280x800):
8. `#tut-shade` rendered unconditionally at all times, but `#tut-spotlight`'s own box-shadow
   ALREADY darkens everything outside itself via the standard spotlight-punch-hole technique -- the
   two 55%-opacity black layers were stacking to ~80% effective opacity. Negligible on a phone-width
   test (little of the screen is "outside" the narrow content there); overwhelming on a wide window,
   where most of the screen is that doubly-darkened region. Fixed: `#tut-shade` only renders for the
   no-target case now.
9. Even the corrected single-layer 55% opacity read as too harsh next to the fully-bright
   instruction panel -- lightened to 25% for both `#tut-shade` and the spotlight's own box-shadow.

**Separately, three real bugs in the live D117 directional handle itself** (`js/DirectionalRadial.js`,
`css/ParchLock.css`), found by the operator live-testing `play.html` on a wide desktop monitor
while reviewing the tutorial -- pre-existing, not introduced by D120:
10. `#pl-dirpad-handle`'s CSS centers it at `left: 50%` of the viewport -- correct on mobile's
    single-column layout, but on desktop with the map panel open side-by-side, this landed the
    handle at the seam between the story and map columns, nowhere near the actual command line.
    Fixed with a new `RecenterHandle()`, measuring `#windowport`'s own live horizontal center and
    positioning over that on desktop (mobile's existing `left: 50% !important` rule is untouched
    and still wins there, matching this codebase's "measure, don't guess" convention from D116).
11. `DirectionalRadial.CanOpen()` unconditionally blocked while `map-open` was set, written for
    mobile's real full-screen map sheet (which does cover the story) but firing identically on
    desktop, where `map-open` just means the side panel is visible and never covers anything --
    silently making the handle completely non-functional ("doesn't do anything") any time the map
    panel was open on desktop, which the operator's own screenshots show is the common case. Scoped
    the check to `pl-mobile` as well.
12. `RecenterHandle()`'s own fix had a timing gap: `css/ParchLock.css` animates `#windowport`'s
    width over a real 0.3s transition when `map-open` changes, but the class-change observer fired
    `RecenterHandle()` immediately, measuring the PRE-transition width -- the handle stayed
    stale-positioned until some unrelated later action happened to re-trigger it after the
    transition had actually finished (exactly the operator's own "doesn't adjust until you do some
    action" report). Fixed with a `transitionend` listener on `#windowport` that recenters again
    once the animation genuinely completes.

**One more operator request found while reviewing the same area**: desktop had no quick map-access
control at all (Menu -> Map only) -- `#pl-map-tab` already existed and its click handler
(`js/MobileLayout.js`'s `bindChrome()`) was never scoped to mobile, only the CSS hiding it was.
Added a `body:not(.pl-mobile) #pl-map-tab` rule so desktop gets the same quick-access tab mobile
already has, no JS changes needed.

New/extended regression coverage: `harness/directional-radial.js` grew to 112/112 (map-open
desktop-scoping, `RecenterHandle()`'s desktop-vs-mobile behavior). `harness/d119-live-audit.js`
grew to 50/50 (new Part 5: wide-desktop map-panel-open scenario end to end -- handle centering,
compass actually opens, a plain resize alone keeps it centered). All existing tutorial harnesses
(`tutorial-flow.js` 204/204, `tutorial-isolation.js` 43/43, `tutorial-storage-spy.js` 15/15,
`portrait-prompt.js` 27/27) re-verified green after the CSS/copy changes above. Rebuilding the
distribution and APK next.

<!-- D93-MOBILE-FOLLOWUP -->
### D93 mobile follow-up (operator live APK, grok)

- **Save-dialog IME:** DismissKeyboard/SyncMobilePromptFocus ignore #dialog inputs so Glk save-name fields keep focus (was flash-open then blur).
- **Intro/MORE padding:** has-char-input/has-line-input spacer + BufferWindow padding-bottom so story text clears the fixed input strip.
- **Mic far right:** mobile row order [LineInput][Submit][Mic]; default **MicHoldToTalk=true** (hold-to-talk); Options checkbox toggles tap-to-talk; Input.InitMic rebinds.
- **Restore text (superseded by D106):** refresh/scroll alone did not make the story print restored state. A successful native file restore now clears the native Glk story buffer, preserves the live prompt, and submits one settled `look`; undo/restart remain passive resyncs.
- **Menu chip (SUPERSEDED by D96 -- it sat over the text field):** small centered under input strip; 	op:auto prevents full-height stretch; Tools FAB stays hidden; Game Menu system unchanged except Tools remains a menu entry.
- **Library fav/done:** ody.main-menu only — icons always visible left/right outside title text.

## D121 Android file export + top reflow band

Operator-reported, two defects, both with a prior fix that passed its suite while broken on device.
Full architecture writeup: `ARCHITECTURE_UML.md` §55.

**File export (all five exports failed identically).** `js/Qol.js` `DownloadText` passed the `Blob`
to `Filesystem.writeFile`; a Blob cannot cross the Capacitor bridge, so Android rejected with
"The 'writeFile' input parameters aren't valid." Native now gets a string plus explicit
`encoding: "utf8"`. `harness/qol-download-text.js` had asserted `data instanceof Blob` — it
encoded the bug — and now asserts a string, the encoding, and a bridge-serialisation guard. 14/14.

**Top reflow band.** `#exits` is now a fixed flex column under the Glk status banner whose measured
height (`--pl-band-h`) is reserved as `padding-top` on the story buffer, with an opaque mask over
the gap — the top-edge mirror of the existing bottom input-strip pattern. Rows wrap, so extra
content pushes the text down; an empty band collapses to 0px. Absorbs all three previously
independent top-region sources (compass chips, non-cardinal spokes, notation icons).
`harness/exits-safe-area.js` rewritten, 28/28.

Also fixed here: `--pl-statusbar-h` was 0px for entire sessions; both observers needed
`DOMContentLoaded` binding (play.html declares `#windowport`/`#exits` after the script tag);
`offsetParent` is null for fixed elements so the band uses `getClientRects()`; `nonCardinalSpokes`
rebuilt itself ~5x/second and leaked stale spokes between rooms; the bottom/left rails needed the
right rail's `pointer-events` contract once `#exits` gained a stacking context. Mobile `#message`
also now sizes to content instead of rendering a near-full-screen box for a two-line error.

`service-worker.js` CACHE_VERSION -> `parchlock-shell-v30`.

**Operator gate (not closed here):** `build-android.bat dev` must be run to regenerate
`capacitor-www/` and `android/app/src/main/assets/public/`, then the APK reinstalled, to confirm
on real hardware: exports reach the share sheet with correct UTF-8 content; the band sits under the
banner and pushes text down as it grows; every chip and spoke travels on tap.

## D122 Equipment sheet

Inventory moves out of the map into its own sheet with categorisation, sorting, search, a container
tree and drag-and-drop. Full writeup: `ARCHITECTURE_UML.md` §56.

New `js/EquipmentUI.js` + `#equipment` sheet + `#pl-equip-tab` (beneath the map tab, only reachable
while a sheet is open; map -> equipment -> main screen). Container view renders the real
`parentId` tree to arbitrary depth with the self container (`playerId`) as a base-level node;
sub-containers nest and sort independently at every level. Dropdown: A-Z, Z-A, most recent, least
recent, containers first, worn first. Search preserves container paths. Drag-and-drop is Pointer
Events (HTML5 DnD does not fire on touch) and submits real game commands; closed containers and
cycles are refused. Indent is width- and depth-derived so deep chains stay on screen.

Map sheet: Items section hidden (markup retained so RenderInventory/`/items` keep working, with
every entry point re-routed via `Actionable.ShowInventory`), section breaks and touch targets
tidied. Both search lines are now sticky.

Also fixed: D121's `body.pl-mobile #exits` outranked `body.map-open #exits { display: none }` on
specificity, so sheets stopped hiding the exit rails on mobile and the right rail ate the tab taps.

`harness/equipment-ui.js` 25/25; live Playwright 20/20 mobile, 8/8 desktop.
CACHE_VERSION -> `parchlock-shell-v31`.

**Operator gate:** `build-android.bat dev` + reinstall, then confirm drag-and-drop with a real
finger and check the equipment sheet against a deeply nested save.

## D124 Live tutorial restored

The D120 isolated tutorial route is converted back to a live tour over the real app. Full writeup:
`ARCHITECTURE_UML.md` §57.

`js/Tutorial.js` and `css/Tutorial.css` fully rewritten: a scrim/spotlight/card overlay on
play.html, 17 information-only steps, read aloud, opening with what ParchLock is by name. Task
interactivity removed entirely (Back/Next/Skip remain); the app is inert via `body.pl-tutorial`.
The tour opens the real map and equipment sheets itself so every screen is seen without the player
doing anything. Covers the D121 exits band, D122 equipment sheet, D123 text size, notes/search,
narration and file export.

`js/MainMenu.js` no longer redirects to `tutorial.html`; that file becomes a redirect to
`index.html` so precache/dist/bookmarks still resolve. Options' Replay now replays in place.
Finish records the existing versioned key and reloads the module fresh.

`harness/tutorial-live.js` 41/41 (new); the three old tutorial suites moved to `.retired/`.
Live Playwright 18/18 at 412x860 and 1400x900. CACHE_VERSION -> `parchlock-shell-v32`.

**Operator gate:** `build-android.bat dev` + reinstall; confirm the tour on a real first run and
that narration speaks each step.

## D125 Equipment grab handle, scrollable sheet, sheets never stack

Three operator-reported items, plus cleanup of the retired tutorial.

**Map tab did nothing from the equipment view.** Both sheets are peers at z-index 20, so
`ParchLockMap.Toggle()` adding `map-open` on top of `equip-open` left BOTH set and `#equipment`
simply kept winning the paint. `Toggle`/`Show` now swap (clear `equip-open`), mirroring what
`EquipmentUI.Show` already did in the other direction. A CSS backstop
(`body.map-open.equip-open #map { display: none }`) makes stacking structurally impossible rather
than a convention two call sites have to keep agreeing on — it was exactly that convention failing
which produced an invisibly dead tab.

**The sheet was hard to scroll.** Drags started anywhere on a row, so the row needed
`touch-action: none` and every swipe beginning on an item was claimed as a drag. Each draggable row
now carries a dedicated `.equip-grip` handle: the row is `touch-action: pan-y` (scrolls like any
list) and only the handle is `touch-action: none`. The row is a `1fr auto 1fr` grid so the handle
sits dead-centre of its own item bar — including nested bars, which are indented, so the handle
follows the bar rather than the screen. Verified live: bar lefts 45/27 (mobile) and 757/739
(desktop) with the handle within 1px of each bar's own centre.

The handle rests at 0.18 opacity (0.26 on touch, which has no hover to reveal it) and brightens on
hover/press, so it never competes with the item description; it occupies its own grid track so it
cannot overlap the name. Dragging now outlines the row instead of fading it, since fading dimmed
the very text needed to aim the drop. The Yourself row gets no handle — it is a drop target, not
draggable.

**Tutorial cleanup.** The three retired D120 harnesses are deleted, and the stale references to
them in `harness/d96-menu-handle-map-tab.js` and `js/DirectionalRadial.js`, plus a dead empty rule
in `css/Tutorial.css`, are removed.

`harness/equipment-ui.js` 34/34 (9 new D125 assertions); live Playwright 10/10 at 412x860 and
1400x900. CACHE_VERSION -> `parchlock-shell-v33`.

## D126-D128 Drag ghost, auto-scroll, tutorial example items

**D126 drag ghost.** A translucent replica of the dragged line now follows the pointer, preserving
the grab offset. `pointer-events: none` on it is load-bearing: it sits under the pointer, so without
it `elementsFromPoint` would resolve the ghost and no drop would register. The drop-target outline
stays -- ghost answers "what am I carrying", outline answers "where will it land". The origin row is
outlined rather than faded, since fading dimmed the text needed to aim the drop.

**D127 drag auto-scroll.** Holding a dragged line within 64px of either edge of the equipment sheet
scrolls it (ramped, capped at 22px/frame), so rows that start off screen -- typically Yourself, i.e.
"take it out of its container" -- are reachable. The drop target is re-resolved every frame, since
rows move under a stationary pointer. The edge maths is a pure `edgeDelta(rect, y)` so it is tested
without a browser.

Found while testing: `Render()` is called from `Actionable.RenderInventory` on every inventory
refresh, and rebuilding the list detaches the grip holding the pointer capture, so the browser fires
`pointercancel` and the player's drag dies mid-gesture. `Render()` now defers while a drag is active
and runs on release.

**D128 tutorial example items.** The live tour runs over a real module and many modules start the
player with nothing, so the equipment steps were describing a blank panel. `EquipmentUI.DEMO_ITEMS`
supplies a sample shaped like the real case -- a worn container holding a container holding items,
three levels under Yourself, plus a closed container so the refuse-drop rule is demonstrable. It is
used ONLY when the inventory is genuinely empty and only while the tour asks for it; example rows
are captioned, dashed, carry no drag handle and are not drop targets, so they cannot be mistaken for
real gear or send a command. Map steps carry an `emptyBody` used when nothing has been explored yet
instead of describing an empty map as though it were full.

Verified separately: finishing the tour reloads to the module's title screen with no autosave keys
and no trace of moves made beforehand, i.e. it really does restart fresh.

`harness/equipment-ui.js` 56/56. CACHE_VERSION -> `parchlock-shell-v35`.

## D129 Save to device (Storage Access Framework)

Exports opened the share sheet instead of a file picker. Root cause is scoped storage, enforced at
targetSdk 36: no app can write to Downloads by path, and Capacitor's Directory.Documents uses raw
File APIs that Android refuses. Fixed with a local Capacitor plugin firing ACTION_CREATE_DOCUMENT --
the system "Save to..." picker, no permissions needed. Full writeup: ARCHITECTURE_UML.md §58.

New `android/app/src/main/java/com/parchlock/app/SaveFilePlugin.java`, registered in MainActivity
before super.onCreate. `ParchLockQol.DownloadText` prefers it; Filesystem+Share stays as the
fallback for older APKs, blob-anchor for browsers. MIME derived from the extension.

`harness/qol-download-text.js` 23/23. Native compiles clean; ParchLock-dev.apk built and verified to
contain the plugin class and shell v36. CACHE_VERSION -> `parchlock-shell-v36`.

**Operator gate:** install the rebuilt APK and confirm Download opens the file picker and the file
lands in Downloads.

## D130 Tutorial: library phase, readiness gate, and the wash-out fix

Four operator-reported faults in the D124 live tour.

**The screen was washed out.** Two dimmers were stacking: the full-screen `#pl-tut-scrim` at 0.72
AND the spotlight's own `0 0 0 9999px` shadow at 0.72, compounding to roughly 0.92 over every pixel
outside the highlight. The spotlight's shadow already dims everything it is not framing, so the
scrim now paints nothing whenever a spotlight is up (`.pl-tut-has-spot`), and the remaining single
layer drops to 0.45 (0.32 in light theme). The player has to be able to read the screen the tour is
describing.

**The tour never introduced the module library.** It started on play.html only, so starring,
the finished/unfinished filters and Manage modules were never explained. There is now a six-step
LIBRARY phase that runs on index.html over the real list, pointing at `#games-list`,
`#filter-options`, `#filter` and `#modules`, ending by handing the player to the real list to choose
a story. It has its own completion key (`PL_TutorialLibrarySeen`); finishing it does NOT end the
tour, so the play phase still runs once a story is up. Skipping it skips everything.

**It started before the story did.** `ShouldRun` only required a BufferWindow, which on a game with
a long title/intro sequence is while the player is still pressing SPACE through front matter --
every step then pointed at chrome that was not on screen. It now requires a real `.Input.LineInput`
(which cannot exist until the intro is done) plus a ~900ms settle so the first room description,
actionable marks and exits band exist to be pointed at.

**Wording.** The actionable-words step now states plainly that not everything you can interact with
is underlined and that the action list is not exhaustive, "so the story keeps its secrets", with a
reminder that anything can still be typed.

Also fixed while here: sheet targets are re-measured 320ms after the step renders, because the map
and equipment sheets animate in and a target measured on the next frame alone could still be
zero-sized and fall back to a centred card.

`harness/tutorial-live.js` 54/54. Live: library phase 11/11 (6 steps, 4 spotlighted, scrim
transparent under every spotlight), readiness gate 8/8 (tour provably does not start while
Anchorhead's intro is up, starts once the prompt appears). APK rebuilt.
CACHE_VERSION -> `parchlock-shell-v37`.

## D131 Equipment grab handle floats instead of interrupting the name

Operator-reported: "wedding ring" rendered as "wedding r..." because D125's `1fr auto 1fr` grid gave
the handle its own middle track, capping the item name at roughly half the row even when there was
empty space beside it.

The handle is now `position: absolute`, centred with `translate(-50%, -50%)` over a
`position: relative` row: it floats ABOVE the bar's content, takes no layout width at all, and
interrupts nothing. The name is `flex: 1 1 auto` and gets the entire bar; tags yield before the name
does. Touch target grew to 30px (38px on mobile) now that it costs no flow space.

Verified live at 412x860 and 1400x900: zero truncated names on any row (`wedding ring` measured
281/340px mobile, 545/604px desktop with `scrollWidth <= clientWidth`), handle within 1px of each
bar's own centre, `position: absolute` on every draggable row.

`harness/equipment-ui.js` 57/57.

## D132 Tutorial waits for anything else covering the screen

Follow-up to D130's readiness gate. Waiting for a real line prompt was necessary but not sufficient:
ParchLock's own first-run Help popup (`Message.ShowHelp`, fired on a new install) appears at almost
exactly the moment that prompt does, so the tour would have opened on top of it.

New `Tutorial.screenIsBusy()` blocks the tour while any of these are up, on both pages: the
ParchLock splash (`parchlock-splash-pending` or a rendered `#parchlock-splash`), `Message.IsOpen` /
`body.app-dialog-open` / a rendered `#message.show`, or Glk's own `#dialog_frame`. The poll simply
tries again rather than competing for the screen.

Verified with a genuine cold run -- nothing pre-dismissed, no keys pre-cleared, the probe behaving
like a player: splash seen, Help popup seen, intro-before-prompt seen, and **zero** frames where the
tour was up at the same time as any of them. The tour opened by itself once the story reached a real
prompt, on the welcome step, and step 2 framed a real rendered element (412x830).

Incidental finding, pre-existing and not introduced here: on a cold start the Help popup opens
BEHIND the splash, so the splash must be dismissed first. Worth a look separately -- it is not a
tutorial bug.

`harness/tutorial-live.js` 59/59.

### D132 follow-up: splash verified cold on the library screen too

The D132 verification covered play.html but pre-dismissed the splash on index.html, so the library
phase had never actually been tested against a live splash -- which is where a brand-new player meets
it first. Re-tested from a true cold start with nothing pre-set, deliberately leaving the splash up
for several polls: the splash appeared and stayed, the tutorial never once rendered over it, and the
tour opened only after the splash was clicked through -- on the welcome step, with the real module
list behind it. 8/8.

## D133 Desktop microphone

Operator: the mic button was missing on PC (workaround: Windows dictation). D93's R2 scoped voice
input to mobile, but only the CSS was mobile-specific -- `Input.MicSupported()` already accepted the
browser's own SpeechRecognition, `Input.Mic.startWeb` already implemented it, and the hold/tap
bindings already carried `mousedown`/`mouseup`/`click` fallbacks. A single
`#pl-input-mic { display: none }` was hiding a working feature.

Desktop now shows the button to the right of Submit. The width it needs is reserved through
`--pl-mic-gutter`, 0px by default and 50px only under `body.pl-mic-available`, which `Input.Mic.init`
sets from the same check that decides the button's state -- so a reserved gap with no button, or a
button sitting over the line input, are both impossible.

**Unavailable is shown, not hidden.** A missing control teaches nothing. With no recognizer at all
the button renders struck through (muted circle-and-slash, reusing the existing error visual) and
clicking it explains what is missing. Real failures explain themselves too, once per session and
only when actionable: a blocked mic names permission and where to grant it; a network/service
failure names the local-file cause the desktop build actually hits; a transient `no-speech` is never
escalated. Every message ends by reassuring that typing still works.

**Measured correction:** an earlier cut gated web support on `window.isSecureContext`, assuming a
`file://` page is insecure. Chromium reports `isSecureContext === true` for `file://`, so that gate
hid nothing where intended while risking hiding the button on valid setups. Availability is
presence-based; whether the microphone can actually be reached is only knowable by trying, so the
explanation happens at failure time.

**Regression caught and fixed during this work:** splitting the `:root` custom-property block to add
`--pl-mic-gutter` moved `--pl-safe-top/bottom/left/right` into `body.pl-mic-available`, which would
have silently disabled every safe-area inset (the D121 band, the mobile shell) unless voice input
happened to be available. Restored to `:root`; `harness/exits-safe-area.js` 28/28 confirms.

Live: 19/19 across a served secure origin and `file://` -- button visible at 44x44, right of Submit,
gutter reserved, no overlap with the line input, and all four error classes producing the correct
message. `harness/d95-mic-hold.js` 29/29. CACHE_VERSION -> `parchlock-shell-v38`.

## D134 ExitCalibrator: pre-travel exits for the whole non-Inform catalog

D61 gated `lookAheadExits` to Inform-compiled games, correctly -- Inform's direction-property
convention is a compiler fact, and applying it to ZIL produced five phantom exits on Zork1's "West
of House". The honest consequence was that Zork 1/2/3, Planetfall, Enchanter and Deadline had NO
pre-travel exit knowledge at all: live-measured, every room held exactly one exit, the direction the
player left by, though West of House really has three. That is the Planetfall breakdown.

`js/ExitCalibrator.js` closes it without decoding ZIL byte layouts (the guess that made D61's
phantoms). Travel is ground truth: when the player really moves A -> B by typing "north", the game
has just said A's north exit leads to B. The calibrator looks at which of A's properties actually
contain B and tallies that. A property becomes "north" only after predicting real travel in
**several distinct rooms** -- one room proves nothing, a byte can coincidentally equal a room id.
Nothing is emitted for an unproven property, so the pre-calibration behaviour is byte-identical to
today's honest empty list (D24). Same discipline as D73's AttrCalibrator: real evidence, repeated
confirmation, teardown on contradiction, persisted per game file.

**Measured on Zork1.** It learned the real properties from travel alone: north=31, south=28,
east=30, west. Those are the SAME properties D61 saw as "coincidentally holding valid-looking object
ids" -- they were never coincidence, they are Zork's genuine direction properties; D61 was right to
reject Inform's labelling of them, not the data. Predictions were then tested by walking them:
**15/15 correct, 0 wrong**, 4 blocked (conditional exits that exist but were not open).

Also: shipboard directions (port/starboard/fore/aft) are ordinary directions and now calibrate
identically -- without them Planetfall's entire ship deck could never be learned. Negative evidence
is recorded too: a direction tried that does not move the player is suppressed for that room, so a
blocked-with-message form whose bytes happen to start with a room number stops being offered.

Emission stays gated to non-Inform games, so D61's proven Inform path is untouched
(`d23-lookahead-labels` and `d46-room-identity` still green).

**Auto-travel.** With exits now in the graph, routing works where it previously could not:
Zork1 4/4 including a 3-step route, Planetfall 2/2 including a 2-step route across nautical
directions. A field-name bug of mine was caught here -- the calibrator emitted `targetName` where
`MapTopology.link` reads `targetRoomName`, which silently dropped every calibrated destination.

**Non-rooms in the room graph (fixed).** Enchanter routed to "scribbled scroll", Zork3 to "vial",
Anchorhead to "real estate office door". `isPlausibleMapRoom` explicitly exempted doors, and its
item test relies on `attrs.takeable`, which comes from an Inform-oriented profile and is unreliable
for ZIL (D73). Doors are now rejected outright -- a door is a thing an exit passes through, never a
destination -- and a structural containment test rejects any object sitting inside a top-level
place, which is compiler-agnostic.

`harness/exit-calibrator.js` 19/19.

## D136 Tutorial card placement and coverage

Walking the tour as a player (the operator's suggestion) found three things assertions had missed.

**The card sat on what it was describing.** Choosing "whichever side has more room" fails when the
target is the story window, which is nearly the whole screen and leaves no room either side. The
card now takes the larger free band and caps its height to fit it, scrolling internally rather than
spilling across the highlight. When the target genuinely fills the screen it pins to the BOTTOM --
always -- because the top carries the status banner and the direction/exits band, and burying those
is exactly what the operator reported. (A first attempt centred on the target's midpoint; a
full-height target's midpoint sits mid-screen, which flipped the card back to the top for no
benefit. Measured and corrected.)

**Missing subjects.** The tour had zero coverage of the action radial, holding an equipment line for
its actions, or the directional pad. All three are now steps, 19 in total.

Verified at 412x860, 390x844 and 1400x900: no card overlaps its own highlight, and the direction bar
and status line stay visible on every step.

## D137 (OPEN, not fixed) status line fields collide on a phone

Found during the same walkthrough: Anchorhead's status line renders as "Outside the Real Estatday
onee" -- the room name and "day one" written over each other. Recorded as open because the mangling
is in the grid's own cell contents, so the VM overwrote them: the game right-aligns its second field
at a column derived from the width GlkOte reported, and `--pl-cell-cols` pins that to 50. A CSS clip
was tried and measured to change nothing. Fixing it means reconciling the reported column count with
the real cell size (the D94 fit logic), not styling the result.

## D138-D140 Mapping and auto-travel across the catalog

Continuation of D134, sweeping real modules rather than reasoning from one.

**D138 Routes learn from failure.** Anchorhead routed out of the Local Pub by "s" three times in a
row, each time going nowhere: the step failed, the route aborted, and the identical impossible route
was re-planned on the next attempt. `Navigator` now records which edge a step was walking, and a
step that does not move the player demotes it. Deleting the map edge alone is futile --
`MapTopology.applyExits` recreates it from the look-ahead on the very next turn -- so the block is
also recorded in `ExitCalibrator` and filtered out of `lookAheadExits` for BOTH compilers. It is
self-healing: actually walking the exit clears the block, so a door that was locked and is later
opened comes back. Anchorhead 57% -> 80%, and the two impossible routes stopped being proposed at
all (tried fell 7 -> 5).

**D139 The room is not always the player's parent.** Sweeping the catalog found the mapping breaking
down for a reason that was not exits at all -- it was room IDENTITY:

| module | recorded as the room | actually |
|---|---|---|
| Cutthroats | `bed` | Your Room |
| Anchorhead | `real estate office door` | (a door, not a place) |
| Enchanter | `scribbled scroll` | (an item) |
| Zork3 | `vial` | (an item) |

Cutthroats starts the player IN BED, so `parent(player)` is furniture. `findLikelyLocation` now
walks UP the parent chain. Two measured corrections along the way: rooms are NOT reliably top-level
(Cutthroats parents its rooms to an unnamed ZIL grouping object, so "parent === 0" is not the test),
and taking the OUTERMOST plausible ancestor overshoots -- it regressed Zork1 from 100% to 67%. The
rule that holds is: start at the innermost plausible ancestor and step out only while that candidate
is something you can be in or on (container/supporter/vehicle). The printed room name settles it
outright when there is one.

Doors are now rejected as rooms outright, and a structural containment test rejects objects sitting
inside a place -- `attrs.takeable` could not do this job because it comes from an Inform-oriented
profile and is unreliable for ZIL (D73).

**D140 Meta commands are not exits.** wump2ka grew a map exit literally called "look": the room the
player stands in can change on a turn where they did not travel (a look that first reveals the room,
answering a restore prompt, a timed event), and the typed command was taken as the edge label
regardless. A stop-list -- not a whitelist, because games invent their own travel words (Wumpus's
"x1", Planetfall's "starboard") -- now refuses observation/meta commands as edge labels. Wumpus then
mapped 7 rooms with correct numbered exits and routed 1/1.

**Measured auto-travel after this work** (accuracy by room ID, so a look-ahead stub's internal name
being upgraded on first visit is not miscounted as a miss):

| module | auto-travel |
|---|---|
| Zork1 (ZIL) | 3/3 100% |
| Advent (Inform) | 4/4 100% |
| Balances (Inform) | 3/3 100% |
| 905 (Inform) | 2/2 100% |
| Planetfall (ZIL) | 2/2 100% |
| wump2ka (numbered exits) | 1/1 100% |
| Anchorhead (Inform) | 4/5 80% |

Still open, recorded rather than guessed at: Ballyhoo's room objects decode no short name at all
(the id resolves but is unnamed, so no room is ever created), and AllRoads reports a different
player object than the scene's protagonist (a multi-viewpoint game) -- both need their own
investigation and neither is an exits problem.

`harness/exit-calibrator.js` 26/26; full mapping suite (d46, d48, d23, phase2, d34) green.
CACHE_VERSION -> `parchlock-shell-v40`.

## D141 Adjective+noun command disambiguation

Operator: "green blob / yellow blob / blue blob -- it doesn't understand their difference."

This was a **planned Phase 4 item that was never built**: "adjective+noun unambiguous commands (query
the object's dictionary adjective properties, not just its noun, so a synthesized command like TAKE
SMALL BRASS KEY is unique enough to skip parser disambiguation - not just TAKE KEY)".

What was already there, and what was missing. D107's `pickCommandAlias` prefers a dictionary word no
other in-scope object shares -- so for three blobs it already picked "green", "yellow", "blue". But it
returns that word ALONE, dropping the noun, and its own comment concedes it gives up entirely when
every alias is shared. "take green" is weaker than "take green blob" and fails outright in a game
where the adjective is not standalone vocabulary.

`Actionable.headNounOf` + `Actionable.disambiguatedNoun` now build the real phrase: the head noun is
the rightmost word of the object's printed name that is also one of its own dictionary words
("blob"), and the qualifier is a dictionary word of that object which no CURRENT rival shares
("green"). Both halves are the object's own compiler-authored vocabulary, so the phrase is
parser-valid by construction. `ActionSynth.commandsForObject` consumes it.

Deliberately conservative, per D107: when no distinguishing dictionary word exists the real single
word is kept rather than falling back to the printed compound name -- D107 proved "long-handled
shovel" is rejected by the parser outright, and the story's own "Which do you mean?" is a normal
recoverable reply while a parse error is not. Disambiguation is also scope-sensitive: the same object
drops its qualifier the moment its rivals leave the room, so nothing gains a gratuitous adjective.

Limitation, stated rather than hidden: `ZRamReader.parserWords` is Inform-gated (D64), so ZIL objects
arrive with `aliases: []` and cannot be disambiguated this way. They fall through to existing
behaviour unchanged. Extending word-mining to ZIL needs its own evidence-based work, not a guessed
property convention (D61).

`harness/command-disambiguation.js` 13/13. Live sweep across Anchorhead and Balances: zero ambiguous
commands, and every unambiguous object's command is byte-identical to before.

### Association sweep findings (open, not fixed)

A new module-agnostic sweep reports, per object in scope, the command that would be submitted and the
verbs the radial would offer. It confirms D31's positional suppression is working correctly -- room
scenery offers only EXAMINE, a door offers open/close/lock/unlock, worn items offer examine/remove,
and only genuinely held items offer drop/give/put-in. Two real defects it surfaced:

1. Anchorhead's `rain` offers **EAT**. An attribute bit is being read as `edible` that is not. This is
   AttrCalibrator's domain (D73 established bit meanings differ per compiler and must be learned from
   observed opcodes, not assumed).
2. Anchorhead's `real estate office door` resolves its command noun to `"office"`, which risks the
   parser binding to the office rather than the door.

### Using items from inventory (spells) -- investigated, not implemented

Operator asked about using items such as spells from inventory. `ActionSynth.rules` is a fixed
attribute-to-verb map (takeable/openable/lockable/enterable/switchable/edible/wearable/container/
door/supporter/animate/talkable/default). There is no USE or READ concept at all, and no link between
an object and the game's own dictionary verbs (D34 extracts those, but not per object). A spell book
therefore offers only examine/drop/give-to/put-in.

The promising deterministic mechanism, for a future decision entry: an object whose own dictionary
word is ALSO a dictionary VERB (Enchanter-family spells are exactly this) could offer that word as an
action on that object. Not attempted here because it needs real evidence across spell-based titles
first, and most of that family is ZIL, where object word-mining is not available yet -- the same
blocker as above. Recorded rather than guessed at.

CACHE_VERSION -> `parchlock-shell-v41`.

## D142-D145 Object vocabulary, text decoding, and verb trust across compilers

Continuing the association sweep. Each of these was found by measuring real modules, and each fixes
something the earlier work had listed as an unresolved limitation rather than a completed item.

**D142 Object vocabulary for any compiler.** D64's `parserWords` reads Inform's reserved property 1
and is correctly Inform-gated, which left the entire ZIL/Infocom catalog with `aliases: []` -- no
command nouns, no disambiguation, nothing to tell same-named objects apart. `parserWordsStructural`
finds a word list WITHOUT assuming a property number, using a property that verifies itself: a
vocabulary property is an array of 2-byte DICTIONARY ADDRESSES, so every slot must land exactly on a
real dictionary entry, and one bad slot disqualifies the property. A routine address, a room number
or a flag word fails immediately. Nothing is assumed; the data proves it or it is ignored (D24/D61).
Measured: Zork1's mailbox yields `mailbo, box`; Planetfall's creatures yield `grue/creatu/mutant/
monste`, `troll/biped/mutant/monste` -- which is exactly what lets four monsters sharing "mutant" get
four distinct commands.

**D143 Z-text abbreviations were eating their own spaces.** `decodeZsc` recursed into itself to
expand abbreviations, and the inner call ended with `.replace(/\s+/g," ").trim()`. Z-machine
abbreviations routinely carry their surrounding spaces ("small ", " the "), so every name built from
one came out welded together: **"smallmailbox", "CanyonView", "YourRoom"**. Whitespace is now
normalised once, at the top level, and expansions return untouched. This corrects display names
across the whole ZIL catalog -- object names, room names and therefore map labels. (It also explains
the "CanyonView" oddity noted during the mapping sweep, which was recorded then as unexplained.)

**D144 Truncated dictionary forms are shown in full.** A Z-machine dictionary stores only the first
6 characters (9 from v4), so mining returns "mailbo", "unifor", "chrono". Those parse correctly --
the interpreter truncates input identically -- but read as typos in the radial. When a display token
simply extends the stored entry, both spellings resolve to the same entry, so the full word is shown.
Length-gated to the real truncation points so an ordinary short word is never "expanded" into
something the parser has not got.

**D145 Semantic attribute flags are not trusted on an uncalibrated compiler.** `AttributeSchema.
PROFILE` is an Inform-6 bit map, and D73 established that bit meanings genuinely differ per compiler
and must be learned from observed opcodes. Applying it to ZIL invents verbs: measured live on
Planetfall, the Patrol uniform offered **LOCK / UNLOCK / TALK TO** and the chronometer offered
**TALK TO**. For a non-Inform game the semantic flags (lockable, switchable, edible, wearable,
enterable, animate, talkable) are no longer asserted unless `AttrCalibrator.hasConfirmedFlag` says
that bit has been confirmed for THIS game. Physical, broadly-applicable actions are kept -- they fail
gracefully ("You can't open that") where offering TALK TO a wristwatch is simply wrong. An Inform
game is byte-identical, and a suppressed flag returns automatically once the game's own opcodes
confirm its bit, with no per-title branching.

This is deliberately conservative rather than clever, and it is a judgement call worth naming: the
honest position is that we do not yet know these bits for this compiler, so the app should not invite
the player to submit a command it has no reason to believe in.

Measured after: Planetfall's uniform now offers examine/drop/give-to/put-in only; Anchorhead's object
verbs are byte-identical to before; zero ambiguous commands in either.

`harness/command-disambiguation.js` 21/21. Regression suite green: d34, d31-known-topics,
d31-nested-inventory, d88-semantic-parity, attr-calibrator phase-b and phase-cd, exit-calibrator,
d46, d23, phase2, d48. CACHE_VERSION -> `parchlock-shell-v42`.

### Still open

- Anchorhead's `rain` offers EAT, and its `real estate office door` resolves its command noun to
  "office". Both are Inform-side and need their own evidence.
- Using items such as spells from inventory (D141 note) remains unimplemented. D142 removes its
  stated blocker -- ZIL objects now have real vocabulary -- so the proposed mechanism (an object
  whose own dictionary word is ALSO a dictionary verb) is now testable on the Enchanter family.

## D146-D148 One mark per object, dictionary-verified instrumental verbs, and the spell path

Follow-up to the D142-D145 sweep, closing the "using items such as spells from inventory" item the
previous section left open. Every claim below was measured live, not reasoned about.

### D146 One mark per object, and marking without vocabulary

`Actionable`'s wrap loop exempted name-derived targets from the one-mark-per-object rule, so a single
object could be underlined several times in one sentence. That exemption is gone, and the target list
is now walked in two passes so a full-name or head-noun match wins over an incidental alias.

`headNounOf` requires the word to be confirmed vocabulary, which is right for building a command and
wrong for choosing which word to underline: Anchorhead's `transom window` has no minable words at all,
so the longest token won and "transom" was marked while "window" sat unmarked in the same sentence.
`headTokenOf` (rightmost real token, no vocabulary requirement) is used for marks only, never for
commands. A first attempt that picked the longest token instead regressed `office` to `estate` and
`window` to `transom` and was caught by `tools/highlight-scope-regression.js`.

### D147 The instrumental verb has to exist in the game

`Use with...` submitted `use X with Y` for every object in every game. `use` is not a verb in either
the ZIL or the Inform 6 standard library. Measured against the catalog's own RAM dictionaries it is
ABSENT from Zork 1, Planetfall, Enchanter, Balances and Anchorhead, and PRESENT only in Advent.
Confirmed live in Enchanter: `use book with me` replies `I don't know the word "use".` The feature was
dead text everywhere it mattered, and no test noticed because none of them submitted it.

`Actionable.INSTRUMENTALS` now pairs each candidate verb with the phrasing that verb really takes, and
a launcher is offered only when this story's dictionary contains the verb:

- `use A with B`
- `cast A at B` -- confirmed live, `cast blorb at book` encloses the spell book in a strong box
- `unlock B with A` -- the instrument goes second

A game with none of them gets no launcher at all, rather than a command that cannot parse (D24).
`ZRamReader.hasDictionaryWord` answers membership for every compiler, because `parseDictionary`'s
`words` map is built from decoded entry text and needs no flag byte, unlike the `isVerb` flags that
only exist for the Inform layout. It is cached per game file and handles the 6/9-character entry
truncation the same way the interpreter truncates typed input (D144).

### D147 Spells were all one word

Every spell in the Enchanter family is an object named `<name> spell` whose only minable word is
`spell`, so all five reduced to the single command `spell` and the story had to stop and ask which was
meant -- the reported blob defect again, in spell form. `disambiguatedNoun` drew qualifiers only from
mined aliases, and `rezrov` is not among them.

A qualifier may now also come from the object's own printed name, provided the game's dictionary
actually contains that word. This is not the invented compound phrase D107 forbids: D107's failure was
submitting words the parser has never heard of (`long-handled`), whereas this is D142's
self-verification discipline -- the word ships in the story file, so it parses. Confirmed live that
`cast rezrov spell at me` parses exactly as `cast rezrov at me` does. A rival's printed name tokens now
count as "taken" alongside its mined words, since two objects both called `... spell` are not separated
by `spell` whichever list the word came from.

### D148 Held containers whose bits do not decode

`canSeeInside` reads `attrs.container`/`open`, and D73/D145 established those bit meanings are an
Inform-6 mapping that genuinely differs on other compilers. Measured on Enchanter: the held spell
book's bits decode as openable/static/switchable with no container and no open, so `canSeeInside` said
no and all four spells inside it -- blorb, nitfol, frotz, gnusto -- never reached the payload at all.
They were untappable, which is the entire "use items like spells from your inventory" path.

The inventory walk now looks inside a held, named object that demonstrably has children when there is
no container or supporter bit to obey. A container bit that DID decode is always obeyed, open or
closed: a closed opaque bag must never spill its contents, and that holds whatever the compiler. A
first attempt ignored closedness wherever the compiler was unknown, which would have spilled every
closed container in every ZIL game; `harness/d31-nested-inventory.js` caught it (2 failed) and the gate
was narrowed rather than the test weakened. Normal open/closed behaviour returns automatically once
AttrCalibrator confirms the game's container bit (D73).

### Measured after

Enchanter: scope 2 objects -> 6; all four spells in the book now reachable; ambiguous commands 1 -> 0,
each spell addressable as `rezrov spell` / `frotz spell` / `blorb spell` / `nitfol spell`.

Spellbreaker: five objects all named `cube` with no distinguishing word in the dictionary stay
ambiguous, and that is correct -- the cubes are genuinely indistinguishable until the player labels
them, which is the game's own puzzle. D107 keeps the real word rather than inventing a phrase.

`harness/command-disambiguation.js` 28/28, `harness/d31-nested-inventory.js` 60/60. Green:
d34-dictionary-verbs, exit-calibrator, highlight-scope, alley-actionable, alley-ram-actionable,
anchorhead, map-pathing, startup-menu. CACHE_VERSION -> `parchlock-shell-v43`.

`tools/startup-menu-regression.js` asserted `#start-screen a[href="index.html"]`, which D113's
navigation guard replaces with a real `#start-choose` button because target navigation in the
Capacitor WebView unloads the whole app. The assertion had been stale since that guard landed; it now
asserts the shipped control.

### Still open

- Spell objects decode `container` from their ZIL bits, so they offer `search`/`empty` alongside
  `cast`. Noise rather than breakage (the story replies gracefully), and gating `container` the way
  D145 gates the semantic flags would also suppress `search` on genuine ZIL containers across the
  catalog, so it needs its own evidence and sweep.
- Anchorhead's `rain` offers EAT, and its `real estate office door` resolves its command noun to
  "office". Both Inform-side, both still unexplained.
- D137 status-line field collision; Ballyhoo rooms decode no short name; AllRoads reports the wrong
  player object.

## D149 Character tracker

A stat panel at the top of the equipment sheet carrying **only** what the loaded module actually
tracks. Score and deaths first, then any other stat the module exposes, each appearing and
disappearing on its own evidence. Full research capture in `docs/ai-plan.md` under the same number.

### The data was already being read and thrown away

`WorldModel.refineRoomDisplayName` reads the status window, splits it into 3+-space columns (D80's
measured shape) and **discards** every column matching `/^(Score|Health|Moves?|Turns?)\s*:/i` in order
to find the room title. The stats wanted here were parsed and dropped one line before they could be
used. Nothing else in the codebase read score, turns or health, and there was no death handling at all.

### Four sources, cheapest and most certain first

**Header, v3 only, spec-guaranteed.** A v3 status line is drawn by the interpreter, so its inputs are
fixed: Flags1 bit 1 is 0 for score/turns and 1 for hours:mins. Measured: Zork 1 and Planetfall `0x60`,
**Deadline `0x62`**. Deadline is a timed mystery with no score, and the header says so before a turn is
played, so its score row never exists rather than sitting at zero.

**The game's own status window, v4+.** Measured verbatim: `Room #2   Score: 1   A large, textured
cavern   Health: 81%` (wump2ka) and `OPEN PLAIN   HIT POINTS: 15/15   Paths: ...   QUEST RATE: 0/500`
(TreasuresofaSlaversKingdom). Three value shapes are real, not one: plain, percent, and `n/m` fraction.
The fraction shape was missed by a first-pass regex and only surfaced because Slavers was probed.

**Globals, promoted only after matching observed text through a real change.** The Inform library often
uses the v3 slots (Advent `G1=36`=score, `G2`=moves; Balances `G1=0`, `G2`=moves), but two measured
counterexamples prove that assuming it would ship wrong numbers: Anchorhead's `G2` is 105 and constant
with its real turn counter at `G4`/`G10`, and Planetfall's `G2` climbs 40 a turn because it is the
Galactic Standard Time clock its own SCORE reply describes. So a slot is a candidate, never a source.
Promotion requires the stat to have actually **changed** between samples -- at turn one a scoreless game
has dozens of zero globals and any of them would "match" a score of 0. A slot that later disagrees with
the text is demoted. Same discipline as D73's AttrCalibrator and D134's ExitCalibrator.

**The SCORE reply**, the only route to a maximum and a rank. It costs a turn, so it is never issued
automatically: an "Identify stats" button asks for it once. Seven distinct phrasing families were
measured and are parsed in order, longest-information-first, because one of them (wump2ka's "scored 1
point in 3 turns") carries **no maximum at all** and its second number is the turn count -- matching it
with a maximum-bearing pattern would draw a progress bar of 1 out of 3. DIAGNOSE gets the same
treatment, ZIL-only, and yields **ordered qualitative bands rather than numbers**, because Infocom wrote
prose, not gauges: Enchanter's "You are wide awake. You are well hydrated and well fed." is three
separate stats -- sleep, thirst and hunger -- and none of them is a percentage.

`There is no scoring in this game.` (LDoDoom) is treated as a positive finding that suppresses the score
row permanently, not as a parse failure.

### Deaths

No module exposes a counter, so deaths are counted here. Confirmed live in Zork 1 by walking into the
dark cellar until a grue ate me: `**** You have died ****` -- ZIL uses four asterisks, Inform three, so
the detector accepts `\*{3,}`.

Per the operator, any involuntary in-game ending counts in any module, which is better served by
classifying the banner than by matching one sentence, since the convention is that **all** endings print
one: `won`/`win`/`victorio`/`triumph` is a win, `quit`/`session`/`have left` is voluntary and ignored,
and **anything else is an involuntary ending and counts**. Defaulting to death is what makes this work
on the ~217 modules nobody has probed. Only text that arrived since the last look is scanned, and each
banner is keyed by text plus turn, so a banner still sitting in the scrollback is not re-counted.

That same capture produced a rule that is easy to get wrong: **score fell 35 -> 25 on death.** A score
decrease is a normal event, so it emits `score-down` and never the rising cue; and if a death and a score
change land on the same turn the death cue wins, because a horn would be absurd.

### Sound, synthesised rather than bundled

There was no audio anywhere in this app -- no `AudioContext`, no `new Audio(`, no `<audio>`, no sound
preference (`ReadAloud.js` uses `speechSynthesis`, a different API). Both cues are WebAudio oscillators:
a rising 659 -> 880 Hz two-note triangle for a score gain, a 220 -> 110 Hz sine fall for a death.

A bundled asset would need registering in three separate places -- `play.html`, the service worker
precache list, and `make-dist.bat`'s allow-list -- which is exactly the trap that let D120's
`tutorial.html` ship missing. An oscillator needs none of them. The context is created lazily so it is
born inside a real user gesture, and cues are skipped while the tab is hidden.

### Display

`#pl-stats` sits between the equipment `<h1>` and `#equipment-controls`. Chips wrap onto as many rows as
they need, with labels allowed to wrap rather than truncate -- a truncated stat name is unreadable, the
same lesson as the clipped `wedding R...`. It is deliberately **not** sticky; the search row already is,
and a second sticky band costs a phone most of its list area. A proportional bar is drawn only when the
game itself stated a maximum, a segmented band for the qualitative scales, and **zero confirmed stats
hides the entire block** rather than showing empty furniture.

### Custom status windows

Every one of them is still the ordinary Glk grid window; what differs is that the *game* authored the
contents. So none needs a new window type and all are readable today. Catalogued: Slavers (HIT POINTS, a
`Paths:` exit list, QUEST RATE), wump2ka (Score, Health%), Sherlock (a clock only), curses (a bare turn
number and an in-game date), Anchorhead (`day one`). The decision is to **mirror, never suppress by
default** -- these windows sometimes carry things the tracker does not model (Slavers' `Paths:` is
really an exit list the map homes better), and hiding a window the player relies on is a regression.
Suppression is left as a future preference, gated on the mirror being proven for that module. The game's
window is never written to: the VM owns those cells and overwrites them, which is the documented cause
of D137.

### Verified

`harness/stat-tracker.js` 61/61 -- every measured SCORE phrasing, all three value shapes, the
no-scoring suppression, two-sightings-required, the un-latched `n/m` denominator, every banner
classification, the score-decrease rule, single-counting of a repeated banner, change-gated global
promotion, and demotion on contradiction.

`tools/stat-tracker-live.js` 12/12 against the real modules: Deadline finds a clock and no score from
its header alone; wump2ka finds score plus a percent Health; Slavers finds an `n/m` gauge and keeps
QUEST RATE under its own name; LDoDoom finds nothing and the block stays hidden; Zork 1 -- whose v3
status row shows only the room name -- gets its 350 maximum and a real non-zero score; Anchorhead invents
no score from a row that only says `day one`.

Green: equipment-ui, exits-safe-area, layout-regression, ui-regression, map-pathing-regression,
anchorhead-regression. `CACHE_VERSION` -> `parchlock-shell-v44`, and `js/StatTracker.js` is registered
in the service worker precache list, `make-dist.bat`'s runtime allow-list and `play.html`, with the
harness asserting all three so it cannot silently ship missing.

### Still open

- Sherlock's and curses' unlabelled date/turn columns are recognised as text but not modelled.
- 18 of the 235 non-Glulx modules were probed. Discovery is generic so an unprobed module works, but the
  catalogue is a sample, not a census.
- A v3 game that breaks the global convention fails the monotonic confirmation and shows nothing rather
  than a wrong number. Acceptable, but some v3 modules will legitimately display no score until their
  SCORE reply is asked for.
- Status-row suppression is designed but not built.

### D149 addendum: the v3 path, relevance-gated filters, and the tour

**The v3 games would have shown nothing.** First implementation promoted a global only by matching it
against the status text -- and every v3 game in this app renders the room name alone (D137), so there
was nothing to match and the entire Infocom catalogue displayed an empty tracker until the player spent
a turn on SCORE. Caught by running it, not by reading it.

The fix is the seeding path the plan specified. A v3 status line is drawn by the interpreter from globals
0/1/2, so the layout is the standard rather than a convention, but it is still not simply believed:
with no text to check against, the check comes from **behaviour**. Slot 2 is accepted as a turn counter
only once it has risen by a small amount (1..8) on consecutive turns and never fallen. Confirming that
also confirms the pairing, because the same clause that puts turns in slot 2 puts the score in slot 1 --
one verified slot licenses the other, and neither is guessed.

Measured after: Zork 1 shows `Score 0 / Turns 5` with no status text and without spending a turn;
Deadline shows `Time 8:05` and no score, its hours and minutes assembled from the same two slots;
**Planetfall shows nothing**, because its slot 2 climbs 40 a turn and fails the test -- exactly the
right outcome, since that slot is the Galactic Standard Time clock its own SCORE reply names. A stat the
game printed itself always outranks a seeded slot and is never overwritten by one.

**Relevance gating generalised to the equipment filters.** The same "only show what is relevant" rule now
governs the category controls, not just the stat chips: a category with no items in this module has its
checkbox hidden. The checkbox keeps its checked state while hidden, so a category that appears later --
the first container picked up, the first spell learned -- returns already enabled and nothing is ever
filtered out by a control the player never saw.

A `Spells` category was added on the same terms. Its gate is the dictionary-verified one D147 already
uses for the Cast launcher: `cast` present in this story's own dictionary, which is absent from Zork 1,
Planetfall, Anchorhead and Advent and present in Enchanter, Sorcerer, Spellbreaker and Balances. Within
such a game an item qualifies when its printed name carries a dictionary word that is not its head noun
-- the shape every spell in the Enchanter family has ("rezrov spell", head noun "spell", qualifier
"rezrov"). Honest about the limit: in a spellcasting game this can over-include an ordinary two-word
object, and it does group the spell book itself with the spells. The cost is one item joining an optional
filter that starts checked; no command changes and nothing is hidden.

Measured live: Enchanter shows a Spells group of 5 and hides Worn/Carried/Containers; Zork 1 and
wump2ka show no Spells control at all.

**The tour covers both.** Two steps were added to `js/Tutorial.js`:

- *Your character at a glance* (step 13, after the equipment tab) describes the strip, the score bar and
  chime, and the death count. It carries an `emptyBody` on the existing `isEmpty` mechanism, so in a
  module that tracks nothing it says the strip stays out of the way rather than describing a panel that
  is not on screen -- the same rule the map steps already follow. Its target falls back to
  `#equipment-controls` when `#pl-stats` is legitimately hidden, so the spotlight never points at nothing.
- *Only what this story has* (step 17) explains that every filter and action is built from what this
  particular story understands, and is worded to be true whether or not the module has spells.

`harness/stat-tracker.js` 68/68 (7 of them the v3 behaviour rules), `tools/stat-tracker-live.js` 12/12,
`harness/tutorial-live.js` 61/61, `harness/equipment-ui.js` 57/57.

## D150-D151 Post-APK sweep: mark-derived commands, drink, and the player on the furniture

A bug-hunting and cleanup pass over the whole codebase, run against the decision logs so nothing was
removed on the assumption it was dead. Three static sweeps and four live ones.

### What the static sweeps found, and what they correctly did NOT find

A duplicate-member scan across all 50 source files found exactly one hit: `Input.Clear` was defined
twice, at lines 67 and 888, with byte-identical bodies. The later silently shadowed the earlier, so
behaviour was unaffected; the duplicate was removed after proving the two blocks equal
character-for-character.

An undefined-member scan across all 46 singletons (collecting members from the object literals plus
every `X.y =` assignment and `X["y"]` access) found **zero** unresolved references.

A registration cross-check found three files loaded by no HTML and absent from the service worker:
`EmglkenHost.js`, `EmglkenProvider.js`, `HostEmglkenBridge.js`. These were **left alone**. They are
the modern-Parchment host swap PRODUCTION_PLAN §3.2 describes, they are guarded at their only call
site by `typeof EmglkenProvider !== "undefined"`, and `make-dist.bat` already excludes them by name.
Deleting them would have destroyed planned work that looks dead from the outside -- exactly the
failure mode this sweep was told to avoid.

### D150 A mark-derived phrase must never become a command

`Actionable.VerifiedNouns` records whichever phrase actually got underlined in the printed prose.
`commandNounFor` then returned it as the word to submit. D146 had already established that these are
two different questions, but the distinction was not applied here.

Measured on Anchorhead: the object `real estate office door` has no mined vocabulary at all, and the
word "door" never appears in the room text -- it reads "Outside the Real Estate Office". So the mark
landed on "estate" and the radial offered **Examine estate**.

A mark-derived phrase is now overridden by the object's own head token when the dictionary confirms
that token is real vocabulary. The branch is only reachable for an object with no mined vocabulary, and
for such an object every markable phrase is one of its own name tokens, so the head token is the right
one among them. Two guards keep it surgical: a verified phrase that already ends in the head token is a
more specific reference and is kept (`wedding ring` is not shortened to `ring`), and an object with no
verified phrase keeps its full display name. Measured across Anchorhead's nine in-scope objects,
**exactly one changed**: the door, `estate` -> `door`.

Stated honestly: both words parse in Anchorhead -- `examine estate` and `examine door` return the same
description -- so this fixes what the action *reads* as, not a parse failure.

### D150 `edible` covers drinking too

Anchorhead's `rain` offers EAT. The attribute is genuinely set in the compiled game, and the reason is
that the Inform library uses one `edible` attribute for both eating and drinking -- the story's own
reply to the command the radial offered is *"You don't eat rain, you drink it."*

DRINK is now offered alongside EAT whenever the story's dictionary contains the verb, the same
dictionary-verified gate as D147. EAT is deliberately kept: the game's own attribute licenses it, food
exists, and for a liquid the story declines in one graceful line rather than failing to parse.

### D151 The player can be standing on the furniture

D139 established that the player may be inside or on something, and that `findLikelyLocation` must walk
UP out of any container/supporter/vehicle to find the room. The search that walks back DOWN to find the
player did not do the same, so the two directions disagreed.

D75 already recovered an inventory root from an unnamed direct child of the current room. Measured on
905.z5, that is one level too shallow: the real PC is `(thief)`, a child of the **bed**, which is a
child of the Bedroom. The game opens `Bedroom (on the bed)` and reports soiled clothing and a gold
watch being worn, while the nominal `(self object)` holds nothing -- so the equipment sheet showed
**0 items for a player visibly wearing two**, and the operator's screenshot caught it.

`WorldModel.correctPlayerId` could not help: it derives the player from the inventory, and the
inventory was empty because the player was wrong -- `if (!inv.length) return payload.playerId` is a
closed loop. The fix belongs upstream, in `resolveInventoryRootId`, which now repeats the same D75
search one level deeper through any room child carrying `container`, `supporter` or `vehicle`.

Measured after: 905 reports `playerId 29` (corrected from 20) and an inventory of soiled clothing and
gold watch. Anchorhead, whose player object was already right, is untouched at four items. Zork 1,
which genuinely starts empty-handed, **stays empty** -- the recovery never adopts nearby furniture's
contents as an inventory, which is the negative case that matters most.

### Equipment count placement

Operator-reported: the item count sat in the `<h1>`, which put it above the new stats strip where it
read as a count of those rather than of the item list. It now sits directly above the list it counts,
is singular/plural correct, and hides itself when there is nothing to count, since the empty-state
message already says so.

### Verified

New: `harness/d150-noun-and-verbs.js` 10/10 (the door override and all four of its guards, plus the
drink gate), `tools/inventory-recovery-live.js` 6/6 (905 recovers, Anchorhead undisturbed, Zork 1 stays
empty).

Green: d31-nested-inventory, equipment-ui, command-disambiguation, stat-tracker, exits-safe-area,
d34-dictionary-verbs, highlight-scope, alley-actionable, alley-ram-actionable, anchorhead, ui-regression,
layout-regression, stat-tracker-live, map-pathing, tutorial-live, startup-menu.

Zero uncaught page errors across 17 modules at phone viewport: Zork 1, Anchorhead, Enchanter, Slavers,
wump2ka, curses, LostPig, photopia, Jigsaw, vespers, Sherlock, Spellbreaker, Deadline, Suspended,
Seastalker, The Lurking Horror, Hitchhiker's.

`CACHE_VERSION` -> `parchlock-shell-v45`.

### Still open

- Spell objects decode `container` from their ZIL bits and so offer `search`/`empty`. Noise rather than
  breakage; gating it the way D145 gates the semantic flags would also suppress `search` on genuine ZIL
  containers, so it needs its own evidence and sweep.
- D137 status-line field collision; Ballyhoo rooms decode no short name.
- The D151 recovery searches one level of furniture. A player nested two levels deep (in a box on a bed)
  would still be missed; no module in the catalogue has been observed doing that.


## D152-D153 The character tracker on a phone

Operator report: on a phone the stats section did not exist at all -- no panel above the equipment
list, even after scoring points -- while everything else worked. Three separate causes, each measured.

### D152 The status grid is too narrow to print stats on a phone

The status window is a fixed-width character grid. Measured on the same build at two widths:

    672px  ->  "Bedroom   Score: 9   Moves: 8"
    396px  ->  "Bedroom"

The score columns simply do not fit and never reach the DOM. That is the open D137 collision, and the
tracker's text source therefore had nothing to read on a phone. Promoting a global needs observed text
to verify against, so the fallback was dead too -- a closed loop that left the panel permanently empty.

What survives with no text is behaviour. The turn counter is now confirmed by behaviour alone on every
version, not just v3: it rises by exactly one per turn and never falls. Requiring exactly one is what
keeps a clock out (Planetfall's Galactic Standard Time climbs 40 a turn). For v3 the standard also
pairs the counter with the score in the previous slot, so one confirmation licenses both; for v4+ there
is no such clause, so the score waits for real corroboration.

A SCORE reply now also records a sample for the global matcher, so one press of Identify stats pins the
slot and the score then tracks live with no text at all.

Also fixed: Identify submitted SCORE and then DIAGNOSE, and the second submission overwrote the single
"which probe is pending" slot before the score reply had been read -- so the score was lost every time,
in exactly the case the button exists for. Both probes are now outstanding at once and each reply is
matched by its content, in any order.

### D153 A rolling window that never spanned a turn

`observe()` is driven by `WorldModel.apply`, which was measured running about **forty times per turn**,
not once. The eight-sample rolling window therefore held eight samples from inside a single turn, every
one identical, so no value ever appeared to change and nothing could ever be promoted. Anchorhead's
turn counter was advancing in globals 4 and 10 the whole time and was never seen to move.

A sample is now recorded only when something actually differs, so the window spans real changes rather
than real time -- which is what every consumer of it was actually asking about.

### D153 The turn counter is not always in slot 2

Anchorhead's slot 2 is a constant 105; its real counter sits in slots 4 and 10. The behavioural test is
now applied across all globals rather than slot 2 alone, with a delta of 0 or 1 per sample (a payload
can be re-applied within a turn) and enough real increments to prove it is counting.

### D153 The only way to ask was hidden behind having already succeeded

Identify stats lives inside the tracker block, and the block hid itself whenever nothing had been
discovered -- so in precisely the games that needed the button it could never be reached. The block now
stays up showing the button and one line of explanation until the story has actually been asked.

### Measured after, at 412px

Anchorhead: `Turns 6` immediately from global slot 4, panel rendered 358x116, and after Identify a score
of 0 out of 100. Planetfall: score 0/80, rank Beginner, plus health/hunger/rest from DIAGNOSE. 905:
`Turns 10`. Deadline: `Time 8:13` and no score, as its header dictates. Underlines (10) and equipment
(4 items) unaffected throughout.

### An honest limit

905 has no SCORE verb at all -- it answers "[That verb is not recognized.]" -- and prints its score only
into that too-narrow status window, so on a phone it can show Turns but never Score. Anchorhead's score
updates live only after Identify has been pressed at two different scores, which is what lets the
matcher pin its slot; a single press gives the value and the maximum but no live slot.

Verified: `harness/stat-tracker.js` 68/68, `tools/stat-tracker-live.js` 12/12,
`tools/inventory-recovery-live.js` 6/6, plus d150-noun-and-verbs, equipment-ui, d31-nested-inventory,
command-disambiguation, ui-regression, layout-regression, anchorhead-regression and tutorial-live.
CACHE_VERSION -> `parchlock-shell-v47`.


## D157-D159 The payload death, and read-aloud during fast travel

### D158 Provider registration lost to a navigation race -- the real cause

Operator report, twice: after finishing the tutorial (which restarts the module)
**and** after saving and loading, underlining, inventory, the stats strip and the
map were all dead, and stayed dead. The game itself still played.

Every provider registers itself from a `setTimeout(..., 0)` at script load. A
navigation that lands between the script executing and that timer firing throws
the timer away, and nothing registers it again. Measured in the broken state:

    providerNames: []      engine: "heuristic"    disc: 0    marks: 0
    ZRamProvider, ZRamReader, WorldModel all defined;  memOk: true
    localStorage byte-identical to a healthy run

So it was never corrupt saved data -- the objects were all present and the
registry was simply empty, which kills every consumer of the payload at once.
The tutorial's last act is `location.replace(location.href)`, and save/load
reloads too, which is why both paths produced it. It is a race, so it struck
about three runs in ten.

`WorldModel.ensureProviders()` rebuilds an empty registry from the provider
objects already loaded, before each collect. It is idempotent, never fabricates
a provider whose object is absent, and costs one array length check when the
registry is already populated. Ten runs after the fix: no failures.

### D154 An error reporter that threw, and hid everything behind it

`MainMenu` installs `window.onerror -> Message.Show`, but `Message.Show` called
`ParchLock.HandleOverlayOpened()` unguarded and `js/ParchLock.js` is loaded only
by play.html. Every error on the library page therefore threw a SECOND error
inside the handler, and the real one was never logged or displayed. That is why
this class of fault was so hard to see. Both `Message.Show` and `Message.Hide`
now guard the call, the handler logs the original error before anything else,
and the benign "ResizeObserver loop completed with undelivered notifications"
notice is filtered so it cannot raise an alarming modal for nothing.

### D155 Doors stopped being exits

D134 was right that a door is never a destination room, and added a door
rejection to `isPlausibleMapRoom`. But `MapTopology`'s exit-application path
calls that same predicate under a comment stating the opposite contract --
"Doors remain allowed (D42)" -- so the rejection silently broke it. Measured on
Anchorhead: the look-ahead produced six exits and two survived; `east -> real
estate office door` and `in -> real estate office door` were discarded.

`isPlausibleExitTarget` now answers the exit question (a door is a valid thing
to travel THROUGH) while `isPlausibleMapRoom` still answers the room question
unchanged. `ExitCalibrator` uses the new predicate. A first attempt also changed
`MapTopology`'s gate; that did not fix the symptom and risked minting a map room
named after a door, so it was reverted rather than left in. Door exits are
recorded in `ExitMeta` as hinted directions and offered to the player; they
become pathable map edges once actually walked, which is D35's honest-stub
design.

### D159 Read-aloud followed the route instead of the destination

Operator: "during fast travel read aloud does not catch up correctly ... it gets
stuck on your original location." Every room a route passes THROUGH prints a
description, each is queued for speech, and speech is far slower than travel.

Only the destination is worth hearing. `js/ReadAloud.js` is held by another
seat, so this is done from `Navigator` using that module's own public
`seedSilent()` ("treat what is on screen as already handled"). It has to run on
a timer, not once per step: ReadAloud speaks on a 350ms debounce while steps are
about 500ms apart, so a per-step seed lost the race every time and all three
rooms of a three-step route were still spoken. A 120ms hold consumes text while
the route runs and is released the moment the last step is dispatched, so the
arrival description is spoken normally. Measured on Zork 1, a three-step route:
three rooms spoken before, exactly one after -- the destination.

### D156 Two mobile-only gaps

A `max-width: 1023px` rule hid `#toolbar` wholesale, and that is the only home of
"Manage modules" -- so on a phone there was no way to add or remove a story at
all, and the library tour's "Adding your own" step pointed at a control that was
not on screen. The toolbar now stays, laid out for a narrow screen with 44px
targets; desktop is untouched. An intermediate version of this leaked the rules
to every width and hid the starred/finished filters on desktop; they are now in
their own bounded query.

The stats strip is also always present now, with a placeholder saying what it is
waiting for. An empty panel that removed itself read as a missing feature rather
than a tidy one. The strip sits above the Equipment title, and the item count
sits with the list it counts.

### D157 Forty storage writes a turn

`StatTracker.observe` is driven by `WorldModel.apply`, measured at about forty
calls per TURN. Each one serialised the model and wrote localStorage. The write
is now skipped unless the serialised model actually changed.

### Verified

`harness/d158-provider-recovery.js` 8/8 new. Green: stat-tracker,
d150-noun-and-verbs, d31-nested-inventory, equipment-ui, command-disambiguation,
exit-calibrator, exits-safe-area, d34-dictionary-verbs, qol-download-text,
global-navigation-guard, mobilelayout-backbutton, docs-sync, map-pathing,
anchorhead, highlight-scope, alley-actionable, alley-ram-actionable,
ui-regression, layout-regression, stat-tracker-live, inventory-recovery-live,
startup-menu, tutorial-live. Zero uncaught page errors across Anchorhead, 905,
Enchanter, Zork 1, curses and Slavers. CACHE_VERSION -> `parchlock-shell-v50`.

### Still open

- `js/ReadAloud.js` is held by the grok seat, so D159 is implemented from
  Navigator rather than where it naturally belongs. If that claim is released the
  hold logic should move into ReadAloud itself.
- A door exit is a hinted direction, not a pathable map edge, until it is walked.
  Resolving an Inform door's far side structurally (`door_to` is commonly a
  routine) has not been attempted.
- D137 status-line collision; Ballyhoo rooms decode no short name; spell objects
  offer search/empty from a misdecoded ZIL container bit.


## D160 Follow-ups: what closed, and what the remaining items really are

### Closed: AllRoads reported the wrong player object

Open since the D149 sweep. D151's furniture descent fixed it without being aimed
at it: AllRoads opens "Bedroom, in bed", so the player sits one level inside the
bed exactly as 905's does. Measured now: playerId corrected from 20 to 39, and
the payload inventory matches the two items the game itself lists.

### Closed: the library tour pointed at a control that was not on screen

The "Adding your own" step targets `["#modules", "#toolbar"]`, and both were
hidden on a phone by the blanket toolbar rule, so the spotlight fell through to
whatever was nearest -- the operator's screenshot caught it framing the search
box. With the toolbar kept (D156) every library step now resolves at 412px:
`#filter-options` 161x51, `#filter` 221x27, `#modules` 44x44. Desktop unchanged.

The module manager remains reachable from Tools in-game, from the in-game menu
and from the start screen -- `js/WorkspaceUI.js` and `js/ModuleLibrary.js` were
never modified. The toolbar icon is an additional entry point on the library
screen, kept at the operator's preference.

### D137, measured precisely rather than closed

The mechanism is now understood exactly, which it was not before. The status
window is a fixed-width character grid whose column count GlkOte derives in a
hidden `#layout_test_pane`: it renders "12345678" inside a
`div.WindowFrame.GridWindow` and takes `gridcharwidth = width / 8`. At 412px
with the mobile font that yields about 31 columns, against about 48 on desktop.

Anchorhead right-aligns "day one" for the column count it is given, so at 31
columns a 30-character room name and the day marker occupy the same cells and
the row reads "Outside the Real Estatday onee". That is the game's own rendering
at that width -- a real terminal 31 columns wide would do the same -- not a
ParchLock defect in the strict sense.

Changing it means shrinking the font of `.GridWindow` itself, since that is what
the test pane measures. Two attempts (targeting `.GridWindow.reverse`, then
`.GridWindow` plus `.GridLine` via an injected stylesheet) produced no change in
column count at 8-11px, so the lever is not where it appears to be. It is also
not a narrow change: every game that draws into a grid window -- Slavers' custom
HIT POINTS panel, wump2ka's two-column row -- would re-flow. Left open
deliberately rather than pushed through on a guess.

The player-facing cost is now small: D152/D153 read the turn counter from globals
with no text at all, so the tracker works on a phone regardless. What remains
lost is score-from-text for a game that has no SCORE verb either -- 905 answers
"[That verb is not recognized.]" -- where the status row is the only source.

### Ballyhoo, narrowed

Not "rooms decode no short name" as recorded. Measured: the room resolves to an
object actually named "Connection" (id 251) and no map room is created for it at
all (`mapExits: "no map room"`), while 20+ real objects are in scope. So this is
room IDENTITY picking the wrong object, not a decoding failure -- `Connection`
passes `isPlausibleMapRoom` because it has a plain name and is neither animate
nor a door. Fixing it is D47/D62 work on ZIL location resolution, which currently
serves Zork 1/2/3, Planetfall and Enchanter correctly; it is not worth
destabilising those on a guess for one title.

### Still open

- D137 as described above.
- Ballyhoo's room identity.
- Spell objects decode `container` from their ZIL bits and so offer
  `search`/`empty`. Noise, not breakage; gating it the way D145 gates the
  semantic flags would also suppress `search` on genuine ZIL containers.
- A door exit is a hinted direction, not a pathable map edge, until walked.
- `js/ReadAloud.js` is held by the grok seat, so D159's hold logic lives in
  Navigator rather than where it belongs.


## D161-D163 Restoring what the v27 build did, verified against the real APK

The operator supplied the actual build where these worked -- `ParchLock-dev.apk`,
23 Sep, `CACHE_VERSION v27` -- so this section is a diff against real code, not a
reconstruction. (Preserved as `ParchLock-v27-REFERENCE-2026-09-23.apk`; the
Android build replaces the whole dist folder and would have destroyed it.)

### What the diff actually showed

`DirectionalRadial.GetSlices` is **byte-identical** between v27 and today: both
read `room.Exits` only. The compass ring was never changed. Everything the
operator lost came from changes to what ends up IN `Exits`, made in three of my
own decisions:

| v27 | after | effect |
|---|---|---|
| `var label = normalizeLabel(readLastTypedCommand() \|\| "move")` -- no filter at all | D140 added `isNonTravelCommand`, which rejected EVERY multi-word command | "climb on can", "go through fence", "enter window" could never be learned |
| `isPlausibleMapRoom` carried `&& !attrs.door` -- doors explicitly EXEMPT | D134 added `if (attrs.door) return false;` | door-destination exits dropped out of the map |
| `findLikelyLocation` had no walk-up loop | D139 walks UP out of container/supporter/vehicle | standing on furniture stopped registering as a location change at all |

### D162 Multi-word commands can be travel again

D140's reasoning -- "a multi-word command is an action, never a direction" --
was wrong, and the case it was actually written for (wump2ka growing an exit
literally called "look") is a SINGLE word already covered by the stop-list.

An edge is only ever recorded when the player demonstrably changed location, so
the question is not "is this a direction" but "could this command have been what
moved them". A multi-word command now qualifies when it starts with a verb of
locomotion, plus the prepositional forms of `get`/`stand`/`sit`/`lie`/`hop`/
`step` -- because "stand on can" is how Anchorhead's alley is actually climbed,
while "get lamp" is an ordinary take. `take lamp`, `open door`, `push can to
wall` and `examine can` all remain refused, so an action that merely coincides
with a room change cannot become a phantom exit.

### D163 A step that moves you WITHIN a room

D139's walk-up is correct and stays -- the room should be the room, not the
furniture (Cutthroats reported "bed"). But it leaves the room ID identical on
both sides of "stand on can", so `changed` is false and nothing is learned. In
v27 there was no walk-up, the CAN became the location, the ID changed, and the
command was recorded.

The evidence is still there in the name the game prints for itself. Measured on
Anchorhead: `roomId` stays 107 while `roomName` goes "Alley" ->
"Alley, on the garbage can" -> "Alley". When the ID is unchanged but the printed
name is not, the player moved within the room, and the command is recorded as a
**hinted** step on that room -- no room minted, no pathable edge, because there
is no destination to point at.

### D161 The ring reads every known direction

`GetSlices` now builds from `Exits` UNION `ExitMeta` (minus non-vocabulary
`exit-N` keys), so hinted directions -- doors after D134, and now sub-location
steps -- reach the compass. This is a change v27 did not have and did not need,
because in v27 those directions were in `Exits` already.

### Measured after, Anchorhead's alley

    map Exits (pathable): ["nw"]
    ExitMeta (all known): ["exit-13","nw","stand on can","get off can"]
    RADIAL offers        : ["nw","stand on can","get off can"]
    MAP ROOMS            : ["Outside the Real Estat...","Alley","Narrow Street"]

The ring offers the can steps and no room was created for the top of the can --
the operator's description exactly.

### Verified on the operator's own device, and a correction

The operator confirmed auto-travel reaching Anchorhead's File Room from the
Narrow Beach using the can. An earlier draft of this section claimed
auto-pathing "cannot route through" any of this, which was too pessimistic and
is corrected here. Measured, walking the real alley puzzle (`push can to wall`,
`stand on can`, `in`):

    Alley      objId=107  exits=["nw","in"]  sub=["stand on can"]
    File Room  objId=622  exits=["w"]
    rooms: Outside the Real Estate Office, Alley, Narrow Street, File Room, Office

Two distinct things, and only the first is a graph edge:

- A multi-word command that reaches a REAL ROOM becomes an ordinary pathable
  exit and auto-travel routes through it. Confirmed end to end on Zork 1:
  `FindShortestRoute` planned `["n", "climb tree"]` and the player arrived at
  "Up a Tree". Anchorhead's `in` from the alley is the same shape.
- A step that only moves you WITHIN a room stays a ring-only entry
  (`sub: ["stand on can"]`), because there is genuinely no destination to point
  at. It is selectable, not routable -- and minting a node for it is exactly
  what D134/D139 exist to prevent.

No phantom room was created for the top of the can, which was the operator's
original requirement.

### Other honest limits
- The "Outside the Real Estat..." room name above is the D137 narrow status grid
  feeding a garbled name into the map. Unrelated and still open.

### D161 UI fixes in the same pass

- The mobile library header: `#toolbar` (absolute, `left:10px`) and
  `#windowport #filter` (absolute, `right:3px`, two-ID specificity so the old
  `<=1023px` hide never applied to it) collide at 412px -- measured toolbar
  x10-165 wrapping to three rows under an input starting at x164. The header now
  stacks into an icon row and a full-width search box below it, scoped to the
  library page; desktop is untouched.
- The character strip had no heading and read as a stray box; it now has one.
- The equipment sheet's X is gone -- the tab already toggles it.

Verified: `harness/d162-travel-commands.js` 38/38 new. Green: d158-provider-recovery,
stat-tracker, d150-noun-and-verbs, d31-nested-inventory, equipment-ui,
command-disambiguation, exit-calibrator, exits-safe-area, docs-sync, map-pathing,
anchorhead, ui-regression, layout-regression, stat-tracker-live,
inventory-recovery-live, tutorial-live, startup-menu.


## D164-D165 The duplicate room, and the corrupted room name

### D164 An object inside a room is not a room

Cutthroats' map carried two nodes both named "Your Room". They were not a
display glitch -- they were different RAM objects:

    146 "bed"        parent 183 ("Your Room")   kids ["cretin"]   plausible: TRUE
    183 "Your Room"  parent 221 (unnamed)       kids [closet, note, dresser, bed]

The player starts in bed, so while in it the BED was resolving as the room. This
is the exact case D139 was written for and it was still live, because the bed
survives every rejection in `isPlausibleMapRoom`: it is not animate, not worn,
not a door, and the takeable rule never fires since its ZIL bits misread as
`light`.

Rooms are the outermost named places; nothing real is nested one inside another.
So an object whose PARENT is itself a plausible room is furniture, an item or an
actor -- never a room. Checked one level only, with a depth guard, so it stays
O(1) on a hot path.

Swept across the catalogue before committing to it, and no real room is rejected
anywhere:

| module | rejected | what they were |
|---|---|---|
| Anchorhead | 0 | -- |
| 905 | 0 | -- |
| Cutthroats | 8 | chair in Lounge, bunk in Crew's Quarters, table in The Shanty |
| Zork 1 | 28 | "cretin" (the player object itself), sword in Living Room, torch in pedestal |
| Enchanter | 2 | loaf in oven, exex spell in scroll |

That list is the same class of false room D47/D62 recorded ("Enchanter's
scribbled scroll and Zork3's vial became map rooms"), so this removes a
long-standing family of them rather than one title's quirk. Cutthroats now shows
a single "Your Room" (ObjectId 183). Auto-travel after the change: Zork 1 100%,
Anchorhead 4/5 -- the Local Pub miss is the pre-existing D138 case, unchanged.

### D165 The status row is a fallback, not the preferred source

D54/D80 made `refineRoomDisplayName` prefer the printed status row over the
compiled room name. That is right for wump2ka, whose rooms compile to internal
labels like "C_ROOMS_3" -- there the row genuinely is the only real name. It is
wrong everywhere else, and on a phone it actively corrupts.

The status window is a fixed-width character grid with about 31 columns at 412px
against 48 on desktop, so a game that right-aligns a second field writes it over
the first. Anchorhead's row reads **"Outside the Real Estatday onee"** at phone
width, and that string was being adopted as the room's name -- into the map,
Known Rooms and the tracker. That is D137 surfacing as a visibly corrupted name
rather than as a missing statistic.

The row is now consulted only for a room whose own compiled name is
internal/meta. Measured at both widths after:

    Anchorhead   @412  "Outside the Real Estate Office"   @1400  same
    Zork 1       @412  "West of House"                    @1400  same
    Cutthroats   @412  "Your Room"                        @1400  same
    wump2ka      @412  banner used, as D54/D80 intended (its names are C_ROOMS_N)

D137 itself -- the grid being too narrow to print a full status line -- is
unchanged and still open. What is fixed is that its corruption no longer reaches
the room's identity-adjacent display name.

### Verified

Green: d162-travel-commands, d158-provider-recovery, stat-tracker,
d150-noun-and-verbs, d31-nested-inventory, equipment-ui, command-disambiguation,
exit-calibrator, exits-safe-area, d34-dictionary-verbs, docs-sync, map-pathing,
anchorhead, ui-regression, layout-regression, stat-tracker-live,
inventory-recovery-live, tutorial-live, startup-menu, highlight-scope. Zero
uncaught page errors across Cutthroats, Anchorhead, Zork 1, wump2ka, 905 and
Enchanter.


## D166 Four operator-reported UI and probe defects

### The module banner: icons above it, not on it

Operator: "the empty Gray bar is not a mistake it is the banner! It's just that
the icons are not located on it they're being cast above it."

`#listing-stories` carries the light background and is `color: transparent` on
mobile, so the bar exists precisely to hold the toolbar icons. D161 had made
`#toolbar` `position: static` to stop it colliding with the search field, and
that pushed the icons into the flow ABOVE the banner instead of over it.

The toolbar is absolutely positioned again and overlays the banner, with
`.status.TextGrid` as its containing block; only the search field -- the part
that genuinely does not fit alongside at 412px -- moves to its own full-width
row underneath. Measured at 412px: toolbar and `#listing-stories` both at y=66
h=32, icons centred at y=70, search at y=104.

### The strip is "Status", not "Character"

Renamed at the operator's request.

### Asking for stats printed a parser error

Operator: "the readout is interrupted by the statement that's not a verb I
recognize every time."

Identify stats submitted SCORE and DIAGNOSE unconditionally. Submitting a verb
the story does not have is the one thing this codebase already knows how to
avoid -- D147's `isGameWord` answers whether a word is in THIS story's
dictionary -- so a probe is now only sent for a verb that exists. Measured:

    Anchorhead  score in dict, diagnose NOT -> asks score only, no error
    905         neither in dict             -> submits nothing, no turn spent
    Zork 1      both in dict                -> asks both, both answer

905 was the worst case: it has no SCORE verb at all ("[That verb is not
recognized.]") and no DIAGNOSE, so every press produced two parser errors and
spent two turns for nothing. It now spends none.

### A health band read from a hypothetical

Found while verifying the above, not reported: Zork 1 answers "You are in
perfect health. You can be killed by a serious wound." and the tracker showed
**wounded**. The scale loop kept scanning so a graver band would override,
which is wrong -- the second sentence says what COULD happen, not what is true.
These replies state the current condition first, so the first match wins.
Verified across perfect / light wound / serious wound phrasings.

### The library tour was silent

Operator: "read aloud needs to start when the tutorial starts It completely
skips the first module screen tutorial windows."

`Tutorial.speak()` returns immediately when `ReadAloud` is undefined, and
`index.html` never loaded `js/ReadAloud.js` -- only `play.html` did. So the
entire module-screen half of the tour was narrated by nothing.

Adding it there is safe rather than merely expedient: `ReadAloud.speak` is
gated on the narration preference, and its automatic path collects from
`#windowport .BufferWindow`, which does not exist on the library page. Verified
live -- the tour cards are spoken and no part of the 309-title story list leaks
into narration.

Verified: stat-tracker 68/68, d162-travel-commands, d158-provider-recovery,
equipment-ui, d150-noun-and-verbs, d31-nested-inventory, exits-safe-area,
docs-sync, layout-regression, ui-regression, startup-menu, tutorial-live,
stat-tracker-live, map-pathing, anchorhead.


## D167 Nine operator-reported items, and a wumpus investigation

Planned first in the session scratchpad; items 1-7 implemented, 8 and 9 not
reproduced and deliberately left alone.

### 1/2 Tutorial wording

The exits step claimed every exit appears in the band under the status line.
The side rails carry them too (`css/ParchLock.css:3422`), so the wording now
describes both surfaces. The notes step explained what notes are but never how
to make one; it now gives the gesture D112 actually built (hold a room in Known
Rooms, right click on desktop) and mentions the Options button.

### 3 Microphone auto-send

D95 already had both modes. What was missing was submission: a hold-release
left the transcript sitting in the input. `MicAutoSendOnRelease` (default on,
Options toggle) submits through `Actionable.Submit`, the same choke-point every
other control uses. Tap mode still only inserts, as the operator asked, which
also preserves the dictate-then-edit flow. This revises R2's "nothing is ever
submitted" and the comment in `js/Input.js` now says so rather than contradicting
the code.

### 4/5 The score, the sound and the graphic were ONE defect

The cue chain is `value change -> emitChange -> playCues`, and the graphic is
driven by the same change. With the score frozen, nothing downstream could fire,
so three reported symptoms had one cause. Four separate faults were found:

**MAX_GLOBALS was 64.** The Z-machine allows 240. This silently truncated the
search space for EVERY statistic, not just score. Measured: Anchorhead keeps its
score in globals 15 and 16 and its turn counter at 4/10; other games sit higher.

**Identifying the slot headlessly.** The operator's requirement is that stats be
read from RAM, not by asking the game. The obstacle was never reading a global,
it was knowing WHICH one: `promoteGlobals` can only identify a slot once it has
seen the value change, on a phone there is no status text to see it change in
(D137), and a one-off SCORE reply supplies no change either. Both libraries
volunteer the missing piece unprompted -- "Your score has just gone up by two
points." costs no command and no turn -- and a known delta is exactly what
identifies the slot. One event narrows the field, a second settles it, and a
known total narrows it further. After that `readConfirmedGlobals` reads the
number out of RAM every turn with no text at all.

**Inform keeps a shadow copy.** Measured on Anchorhead: globals 15 AND 16 both
follow the score, so a unique candidate never emerges. Candidates that move
together and hold the same value are interchangeable for display and the lower
is taken -- but only after a second event, never from one, so a coincidence
still cannot become the score.

**Audio started suspended.** A context created outside a user gesture is
suspended on Android and in Chrome, so the first cue would have been silent
whatever else was fixed. It is armed on the first real touch, click or key.

**The badge was destroyed faster than it could be seen.** `Render` is driven by
`WorldModel.apply` and was measured running about a hundred times per turn; a
one-shot element created on the tick the score moved was wiped ~25ms later by
the next render. The change now carries a deadline and every render inside that
window draws it. Turns and clocks are excluded -- a "+1" every single turn is
clutter, not an event.

Measured per module at 412px afterwards: Zork 1 score=10 (moved) and turns from
globals 1/2; Enchanter the same; Deadline time 8:16 and correctly no score;
Slavers health and quest rate; wump2ka score and turns; Anchorhead and 905
turns. Verified end to end on Zork 1 that the tone really reaches the audio
layer (659->880 Hz) and the badge really renders ("+10").

### 6 The equipment sheet jumped after a drop

`Render` runs from `Actionable.RenderInventory` on every inventory refresh, so a
drop is immediately followed by a rebuild, and wiping the list resets the scroll
offset. D127 already deferred a rebuild landing MID-drag; this is the one that
lands just after. The offset is captured and restored around the rebuild,
clamped because the list can be shorter afterwards.

### 7 Following new output

`ParchLock.ScrollToBottom` targeted `#parchment .simplebar-content-wrapper`,
which **matches nothing in the current layout** -- so it had quietly been a
no-op, including after a restore where UndoRestoreSync calls it deliberately.
The real scrolling element is the Glk buffer window. Both callers now resolve it
through one helper.

New output is positioned so its FIRST line is at the top rather than its last:
the buffer's height before the text arrived is exactly where that text begins.
`AutoScrollOnOutput` (default on, Options toggle) controls it.

Stated honestly: turning the option off does not stop the view moving. GlkOte
scrolls the buffer to the bottom on its own, so the option governs ParchLock's
repositioning, not all scrolling, and the Options label says so.

### 8 Anchorhead's manual -- NOT diagnosed

No object in Anchorhead carries "manual" in its short name, and an alias search
finds nothing either because Anchorhead's objects mine almost no vocabulary
(D150 measured even "real estate office door" returning `aliases: []`). Depth is
ruled out: the walk reaches three levels and the operator's own screenshot shows
keys inside a keyring inside a worn trenchcoat listed correctly. It needs the
live game state; guessing at it would be inventing a cause.

### 9 The band behind the top directions -- NOT reproduced

Measured `--pl-band-h`, the band's real height, the buffer's `padding-top` and
the mask's height in the same frame across five room states, plus
`--pl-statusbar-h`, the status bar's real bottom and both elements' tops. All
agree exactly every time (band 28px, reserve and mask 32px, band top 38 = status
bottom 38). Both measurements are observer-driven. Nothing to fix without a
reproduction.

### Wumpus underlining -- investigated, no systematic fault found

Operator report of unreliable underlining. Measured across six sessions:

- Room naming is UNCHANGED by D165 and still correct. wump2ka's compiled names
  are internal (`C_ROOMS_17`, `C_ROOMS_15`...), so the printed banner is still
  used exactly as D54/D80 intended. Confirmed live: `ramShortName="C_ROOMS_17"`,
  `roomName="A fair-sized, rough cave"`, and the transcript subheader matches,
  so `Actionable.Refresh` still locates the room heading.
- Three sessions of 18 moves each: no failure. Two further sessions: 13 of 13
  described rooms underlined.
- One session did show six described rooms with no marks, at `roomId=120` with
  only 1-3 objects in scope -- possibly a room whose text genuinely contains
  none of its object names rather than a marking fault.

Worth recording because it misleads when measuring: wump2ka has no compass. It
prints "You don't have a compass and you were a terrible Scout. The best you can
do is number the exits", so travel is `x1`/`x2`/`x3`. A probe driving it with
compass words never changes room at all and reports false health.

Also: the buffer TRIMS old lines, so a cumulative `.pl-act` count goes DOWN over
a session. Older text losing its underlines is the transcript being trimmed, not
marking failing.

Left open pending a narrower reproduction.


## D168 Desktop sheet reflow, the mislaid mic button, and collapsible equipment options

Three operator-reported items. The first two share a shape worth naming: both
were CSS declarations that were present, spelled correctly and wrong only in
where they put the box. Every check in the repo that could have caught them was
a source-text check, so all of them stayed green.

### The equipment sheet painted over live story text (desktop)

`#equipment` is the map's peer -- same tier, same half of the screen, the same
`calc(50vw - 40px)` box -- and the CSS comment above it already said it is
driven "exactly as the map is driven by body.map-open". But the one rule that
makes room for a sheet lists only the map:

```css
body.map-open #parchment, body.map-open #windowport { width: calc(50vw - 40px) !important; }
```

So opening equipment left the story at full width with the sheet on top of it.
Measured at 1920px: map-open takes `#windowport` from 1864px to 942px; equip-open
left it at 1864px while the sheet occupied 980-1900. Every line of story text
past the halfway mark was simply covered, which is exactly what the operator's
screenshot shows.

Fixed with a desktop-scoped rule rather than by adding `equip-open` to the rule
above, because on mobile both sheets are full-screen and the map's own mobile
override deliberately keeps the story full width underneath. The fixed send and
mic buttons get the same treatment the map already gives them, or they would
have ended up under the sheet once the story moved.

### The mic button was thrown off the top of the screen (desktop)

D133's "voice unavailable" state draws a circle-and-slash as an `::after`, which
is absolutely positioned and so needs a positioned containing block. The rule
added `position: relative` to provide one. The button is already
`position: fixed`, which IS one -- so `relative` added nothing and destroyed the
fixed positioning. The button dropped into document flow at the top of the page,
and its own `bottom: 31px` then resolved against that box instead of the
viewport, putting it at **top: -31px**.

Measured: `getBoundingClientRect()` returns `[904, -31, 44, 44]` with computed
`position: relative`, against `[904, 1005, 44, 44]` and `fixed` after the fix.

Desktop only, and that is not a coincidence: the mobile rule carries
`position: fixed !important`, so the unavailable state never overrode it there.
The operator saw the button "stuck in the upper right hand corner" on PC while
mobile was fine.

Worth recording for future measurement: the unavailable state is what a `file://`
copy legitimately gets, because a browser cannot remember microphone permission
for a file. The button being absent from the input row on a local copy is
correct; being at the top of the screen was not.

### Equipment options are collapsible, and collapsed by default

Operator request, for mobile and desktop. Uses the same `details`/`summary`
disclosure as `#map-controls-tab`, so there is one collapse idiom in the app
rather than two, and no `open` attribute, so closed is the state on every open.
Measured gain in list space: the first item moves up 92px on desktop and
**220px on mobile**.

Two things this had to get right:

**The sticky moved to the wrapper.** `#equipment-controls` was
`position: sticky; top: 0`. A sticky element inside a collapsed `details` has
nothing to stick to, so the disclosure itself is now the pinned element and the
summary is what stays at the top of a scrolling sheet.

**A hidden filter must not be a silent one.** A category left unticked while the
row is closed would shorten the list with nothing on screen to explain it --
indistinguishable, to a player hunting for something they are carrying, from the
game not reporting it. `EquipmentUI.syncOptionsLabel` counts the non-default
settings onto the summary, and deliberately ignores a control that is hidden for
this module (the Spells checkbox outside a game that can cast, D149), because a
control the player cannot see must never be reported as an active filter.

**The tutorial uses those controls as a display** (operator-raised). Two steps
target `#equipment-controls`, and `Tutorial.resolveTarget` skips any target with
no width or height -- so a collapsed disclosure would NOT have failed loudly. It
would have quietly fallen through to highlighting the whole sheet while
`harness/tutorial-live.js`, which only asserts the selector is mentioned in the
source, stayed green. The tour now opens the disclosure for exactly those steps
and closes it again on the next one, so the player is left with the collapsed
default.

### Coverage

`tools/panel-reflow-live.js` (26 assertions) is geometric throughout: it
compares real `getBoundingClientRect()` boxes for the story, the sheet and the
buttons; asserts the unavailable mic stays inside the viewport and keeps
`position: fixed` in all three sheet states; asserts mobile does NOT shrink; and
drives the real tutorial to the sort/search step to assert `resolveTarget`
returns the options row itself rather than the fallback sheet.


## D169 Carried value and weight, tracked headlessly

Operator: in wump2ka the value you leave the cave with is part of your final
score, so it has to be tracked, and it has to update as items change rather
than only when asked.

### The game states it, but only when asked

Every inventory ends with the three figures:

    You are carrying 11 lbs of stuff (26% of your current capacity).
    It's all worth about $693.

That text is the BOOTSTRAP, not the mechanism. It only appears when an
inventory runs, so on its own it gives a number that is as stale as the last
time the player happened to ask. The mechanism is the one D167 built for score:
a known total identifies which slot in RAM holds it, and after that the figure
is read straight out of memory every turn with no command and no text.

### Where wump2ka keeps it

Not in a global, and not in a common property. Measured: every common property
on every carried object holds a routine or string ADDRESS -- this game computes
almost everything -- so a common-property scan finds nothing at all. The
per-item figures live in the INDIVIDUAL property table, reachable through
`ZRamReader.parseIndivTable` on common property 3:

    Transmat Popper 650, canteen 8, scribbled note 0, Glow Bar 35  = 693
    drop the Popper                                                = 43
    Glow Bar alone                                                 = 35

Exact against the game's own text in all three states. The property number is
never hardcoded: it is whichever individual property sums to the total the game
printed. Confirmed live end to end -- after the slot is pinned, dropping the
Popper with NO inventory command moves the figure to 43, and taking it back
moves it to 693.

### Pinning discipline

Normally two independent agreements, for the same reason D167 requires two
scoring events: at a single observation a small total makes several unrelated
slots add up by coincidence. The exception is a single surviving candidate over
a non-trivial total across several items -- one property out of 255 summing to
exactly 693 over four objects is evidence, not coincidence, and waiting for a
second inventory would leave the figure stale for no gain. Both guards matter:
with one item ANY property equal to the total matches trivially, and a total of
0 or 1 matches far too much. A contradiction tears the pin down.

### Weight is deliberately NOT pinned here, and that is the honest answer

Weight is individual property 100, and it pins the same way -- except that the
canteen computes its own, because what it weighs depends on how much water is
in it. A computed slot returns a routine ADDRESS, thousands rather than a
handful of pounds. Summing it would silently omit that item and report a
confident wrong number.

So `sumIndiv` returns null the moment any holder reports an implausible
quantity, and weight falls back to the figure the game itself last printed.
Capacity likewise. Measured: value pins to `indiv:98` and goes live; weight
stays `inventory-text` for as long as the canteen is carried. That is D24/D61 --
honest staleness over a confident fabrication.

The badge is given to value (a "+650" IS the event) and withheld from weight and
capacity, which move on the same turn and would say one thing three times.

Notation is captured from what the story printed rather than assumed: the
currency symbol and the unit of mass both come out of the matched text, so a
game that uses something other than dollars and pounds is not relabelled.

### Glow Bar switch on/off -- root cause found, NOT fixed

Operator: "Glow bar doesn't seem to have turn on and turn off available, and it
used to." The story itself handles it perfectly -- "You switch the Glow Bar
on." -- and AttrCalibrator does learn the verb from that. The problem is that
the radial will not offer what the player has not already typed somewhere else.

A dictionary-gated fallback for objects with no attribute evidence was written
and then REMOVED, because measuring it showed it fixes nothing here. wump2ka's
objects do have attributes; they are simply wrong:

    Glow Bar       scenery, worn
    canteen        light, static
    scribbled note clothing, wearable, locked

A carried Glow Bar is not scenery and a note is not clothing. This game's
attribute bits are being read with the standard Inform-6 layout and it does not
use that layout, which is exactly the class of problem D73/D145 already
describe. The fix therefore belongs in the attribute schema for this game, not
in a verb list -- patching the verb list would paper over a wrong schema that is
also feeding the equipment sheet and every other attribute consumer.

Recorded rather than guessed at. Anchorhead was measured alongside and is
entirely correct (trenchcoat -> wear/remove/search/open/close, rain ->
eat/drink), so this is specific to how wump2ka's bits are being interpreted.

### Wumpus intermittency -- resolved for the radial, open for underlining

wump2ka GENERATES A NEW CAVE EVERY GAME. Measured across four fresh sessions:
three started with Popper / brittle skeleton / scribbled note / canteen /
fungus (6-9 discovered objects, 16-20 underline marks), one started with frozen
skeleton / cold note / pick (3 objects, 4 marks).

That is the operator's "sometimes the canteen can't be taken from the radial" --
in some games it is not in the cave at all. When it is present it was marked and
actionable in every run.

It is NOT a complete explanation for the underlining report: one earlier session
showed six described rooms with zero marks, and even a bare cave still marks its
exits and skeleton. That case remains open. What is new is that it can now be
provoked by varying startup timing, which it could not be before.

Two measurement corrections worth recording, because both produced confident
nonsense earlier: `payload.discovered`, `payload.nouns` and `payload.objects` do
not exist (the field is `discoveredObjects`), so readings of them were of
`undefined`; and wump2ka opens with a "Would you like to restore a saved game?"
prompt that must be answered before any command lands, so a probe that skips it
measures the prompt rather than the game.


## D170 Locating the room banner: two real faults, one still open

Operator: "this instance of Wumpus does not want to underline exits or items...
we need all items and exits to reliably underline."

`Actionable.Refresh` finds the room's banner in the transcript by matching its
NAME against `ParchLockMap.CurrentRoom`. D81 recorded that this search exists
only for "wump2ka's unstable-label case (D62)" -- so it is keyed on the one
value D62 says is not stable. Two measured faults follow from that.

### 1 The status row is merged on a phone, so the name is garbage

`refineRoomDisplayName` splits the status row into columns on 3+ spaces. On a
handset there are none to split on: the status window is a fixed-width grid of
about 31 columns at 412px against 48 on desktop (D137), so a right-aligned
metric lands hard against a room name that has itself been truncated to fit.

Measured live at 412px on wump2ka:

    payloadRoomName = "A fair-sized, pocked, watery caverHealth: 83%"

One column, matching neither the generic-room-number nor the status-metric
discard pattern, adopted whole as the room's name -- and then unable to match
its own printed banner, for the rest of the session. A metric glued to the end
of a column is now stripped. The name stays TRUNCATED ("caver", not "cavern")
because the grid really did cut it off; inventing the missing letters would be
a guess (D24/D61).

This is why the report came from a handset. Desktop probes never showed it.

### 2 The locator could not survive that truncation, or a stale label

Two changes, both narrow:

- The banner is matched against `payload.roomName` BEFORE the map's stored
  label. The payload name is read on the same turn; the map's is a stored
  string that D62 says can go stale. Measured: room "A fair-sized, pocked
  cavern" against a printed banner of "A large, textured, watery room", where
  the payload name WAS the printed banner.
- A name match is allowed to be a prefix of the banner in either direction,
  with at least 8 shared characters, so grid truncation matches while unrelated
  rooms still cannot collide.
- A banner printed AFTER the player's last command wins over a name match that
  predates it. Measured: heading=28 against lastInput=196 in a 200-line buffer,
  where RoomLines then covered two lines from 168 lines earlier, long scrolled
  off screen.

`harness/d170-room-banner-locator.js` pins the measured shape deterministically,
because the live failure is not deterministic -- wump2ka generates a new cave
every game, and six sessions reproduced it twice and six more not at all.

### Still open, and NOT claimed as fixed

Underlining still fails in some wumpus states after both fixes. Measured at the
failure: names AGREE, a heading IS found (165) with lastInput 172,
`discoveredObjects` 2 and `exits` 1 -- so there is something to mark, the
locator found the right place, and nothing was marked. The remaining fault is
therefore past the locator, in the marking pass itself.

The codex seat audited this independently and corrected two of this seat's
readings, both worth recording so they are not repeated: in the operator's
failing screenshot the status line FITS the full name, so fault 1 is not that
screenshot's cause; and the `x3 -> A vast, polished cave` overlay is MapBeautify,
not a BufferLine, so it is not evidence of a stale transcript. Codex also named
three cases the harness does not yet cover: restore (lastInput = -1), a swim
reprint within the SAME roomId, and a look whose title is not a
`.Style_subheader` at all.

The last of those fits the evidence best. When an in-room step reprints a room
without a matched banner, `roomChanged` is false (same roomId), `newHeading` is
false, and `RoomLines` still holds connected lines -- so the refresh block is
skipped entirely and RoomLines keeps pointing at the previous room's text.

### Cross-module verification

Anchorhead, LostPig, 905, Zork1 and Enchanter were run at 412px before and
after, and the output is byte-identical in every one: same room names, same
mark counts, same map rooms. Two PRE-EXISTING faults surfaced while doing it and
are recorded here rather than fixed under this entry: Zork 1 underlines nothing
at all, and Enchanter names its room after an object ("scribbled scroll").

`tools/ui-regression.js` times out on this machine. Verified environmental, not
a regression: the D168 commit, which passed earlier the same day, times out
identically with these changes stashed and with a clean browser.


### D170 addendum: the locator's second guard, from an adversarial pass

The grok seat measured the first version of this rule against the operator's
save and falsified it. Recorded because the failure it found is the same shape
as the bug it was fixing:

    heading(name-match) 49, lastInput 47, lastBanner 63

Taking the last banner unconditionally moved the anchor to 63 -- an end-of-game
banner -- so RoomLines covered the score/quit epilogue, liveNouns went empty and
marks fell to 0 while the look with Exit 1/2/3 was still on screen. Fixing an
anchor that was too old by always taking the newest one simply made it too new.

The tell is in the numbers: 49 was already AFTER lastInput 47, so it was the
current room's banner and nothing later could improve on it. Two guards now:

  1. `heading <= lastInput` is required before the last banner may win. A name
     match already after the player's last command is kept.
  2. A subheader containing `***` is never an anchor. Both libraries delimit
     end-of-game banners that way (ZIL four asterisks, Inform three), the same
     convention StatTracker's death/win detection relies on.

Three of that seat's other hypotheses were also falsified with measurements, and
are recorded so they are not re-run: the payload does NOT go non-structural on a
swim turn (structural true, engineMode structural, probe z-ram-live on every
snapshot including zero-mark ticks); the signature early-return happens BEFORE
Stale(), so it cannot be what leaves marks stale; and the room title IS emitted
as `Style_subheader` in this save, while the exit lines are `Style_normal` and
are not eaten by IsInstruction.

Operator detail that narrows what remains: "everything worked fine on regular
room startups -- where the startup did not have all exits blocked by water."
A zero-mark tick has been measured with heading -1 AND discoveredObjects 0,
which is an empty payload rather than a misplaced anchor -- so the remaining
fault is most likely in resolving objects while the player is in water, not in
locating the banner.


## D171 The compiled room index: why Wumpus underlined nothing

Operator: "this instance of Wumpus does not want to underline exits or items",
and crucially "everything worked fine on regular room startups".

D170 fixed two real faults in WHERE the room's text was found. This is the fault
in WHICH ROOM the app thought the player was in, and it is the one that produced
the operator's bare rooms.

### The measurement

wump2ka compiles its rooms as numbered objects -- C_ROOMS_1 is object 25 and
C_ROOMS_121 is object 145, contiguous -- and prints that same index to the
player as "Room #N". Asking, for every tick, which candidate room's objects
actually appear in the text the game just printed:

    5 sessions, 45 ticks
    the two answers AGREED                                 : 39
    disagreed                                              : 6
      findLocationGlobal described the visible room        : 0
      the compiled-index answer described the visible room : 6

    example, printed "Room #4":
      findLocationGlobal -> id 35, 7 objects, 0 of them on screen
      compiled index     -> id 28, 2 objects, 1 on screen ("river", "fungus")

39/45 agreement is itself the evidence that the mapping is real; across 121
rooms, chance agreement would be negligible. D79's own entry records the same
mapping from the other side: "You are in room #2" with the correct RAM id 26,
and C_ROOMS_2 is object 26.

### Why the existing scan could not get there

Two distinct failures, both measured:

    printed #25  correct id 49: refs 2, kids 1  -> LOST to id 51 (refs 4)
    printed #10  correct id 34: refs 4, kids 5  -> REJECTED by isPlausibleMapRoom

The second cannot be fixed by reweighting, because the correct room was never an
eligible candidate. That gate is attribute-based, and this story randomises
attribute bits per session (D57/D58) -- the same mechanism D75 had to route
around for the inventory holder. A compiled name of C_ROOMS_<n> is the
compiler's own evidence that the object IS a room, so it is not subject to that
randomisation and the gate is skipped for an indexed room.

A wrong room means `scopeObjects` enumerates objects the player cannot see, so
the printed items have nothing to match and NOTHING underlines -- decided at
startup and persisting for the session, exactly as reported.

### What was changed

`ZRamReader.compiledRoomIndex` builds n -> objectId once per game identity by
scanning the object table for the compiler's own `C_ROOMS_<n>` names.
`printedRoomNumber` reads the number the story prints in its status row.
`findLikelyLocation` (the path `snapshot` actually uses) and
`findLocationGlobal` both consult it first, and `snapshot` no longer lets the
attribute plausibility gate veto an indexed room.

Identity remains the RAM ObjectId throughout (D47). The printed number only
SELECTS among real compiled objects -- it never becomes an id, is never stored
and never names a room -- and the status row stays display-only (D54). Gated on
the story actually having such an index, so every other game falls through to
the existing scan untouched.

### Verification

wump2ka: 8 sessions x 30 turns, ZERO rooms with visible exit text and no marks.
The same probe previously failed in most runs. Marks 4-11 throughout.

Cross-module at 412px, byte-identical to baseline: Anchorhead 6 marks / 3 rooms,
Zork1 0 marks / 3 rooms (pre-existing), Enchanter 3 / 1, LostPig 6 / 1, 905
10 / 2. Suites: d170-room-banner-locator 11, d162 38, d158 8, d31 60,
stat-tracker 85, highlight-scope, alley-actionable, alley-ram-actionable,
map-pathing -- all pass.

### Rejected while doing this, and why it is recorded

A companion change in `js/WorldModel.js` -- relaxing `refineRoomDisplayName`'s
early return and no longer discarding exits/objects in the D54 internal-name
block -- was implemented, measured, and REVERTED: it took Enchanter from 3 marks
to 0, reproducibly, twice against twice. Bisected by file. The remaining
residual below is real but not worth a cross-module regression.

### Still open

One residual measured after the fix: a tick with a VALID roomId (45) and
`discoveredObjects` 0. That is a scope/wipe question rather than a room-identity
one, and the grok seat's analysis of `snapshot`'s internal-name handling and
`WorldModel`'s D54 block is the place to resume.


### D171 addendum: D84 kept its precedence, and three claims verified

The grok seat audited 7b493e2 and confirmed the fix on the operator's own save:
roomId 34 (was a stuck 25), objects [fungus, river, light rain, rubble],
liveNouns 5, marks 5 -- where before it was marks 2 with exits only and no
items. It also conceded the point it had argued against: the visible nouns
belong to C_ROOMS_10, not C_ROOMS_1, and it had been treating the stuck id as
ground truth.

Three things it raised, all now settled by measurement rather than argument:

**D84 was made unreachable, and is restored.** Returning the indexed room first
short-circuited `findLikelyLocation` before D84's learned-slot consult, making
that path dead code for any story with a compiled index. D84's slot is learned
from repeated, contradiction-free observation of the exact game, which is
stronger evidence than a number read off the status row, so it is now consulted
first. It is null on wump2ka (nothing confirmed for that identity), so this costs
nothing there and restores the learned path everywhere else.

**D62's renumbering claim: not reproduced.** If wump2ka really relabels the same
RAM room with a different "Room #N" on revisit, D171's identity would hop
between C_ROOMS boxes and the map would grow duplicates. Measured over 3
sessions and 40 moves each: 114 revisit ticks, ZERO conflicts -- no printed
number ever carried a different room title, and no title ever appeared under two
numbers. Map rooms stayed at 1-4 with no duplicate growth. D62's original
observation is consistent with being an artifact of the stuck-id bug D79 found
afterwards.

**D54's naming system: intact.** Operator: "we had a naming system for rooms
that prevented the appearance of those stupid back end names -- those should
never appear to the user". Because D171 keeps indexed rooms alive in `snapshot`
instead of zeroing them, this needed re-checking. Measured across 42 ticks,
scanning map data, Known Rooms, the exits band, the notes panel and
CurrentRoom: ZERO internal names shown, ZERO empty room names. The map reads
"A tiny, rough cave", "A vast, pocked chamber" and so on, exactly as D54/D80/
D165 intend.

**The residual is not a defect.** The measured tick with a valid roomId 45 and
discoveredObjects 0 was audited as `scopeObjects` genuinely finding no printable
children -- a cave with nothing named in RAM. That is honest absence (D24), not
a wipe, and the D54 block should not be changed for it.


## D172 The command line ran under the send and mic buttons

Operator, desktop: with the equipment sheet open the input line continued
underneath the send and microphone buttons; with the map open it did not.

D168 gave `equip-open` its own rules for where those two fixed buttons SIT, so
they would not be left behind the sheet. But the space they sit in is reserved
by the LINE's own width, and that rule was still keyed to `map-open` alone:

    body.map-open #windowport .BufferWindow .Input.LineInput,
    body.map-open ... .Input.CharInput { width: calc(52vw - 88px - 50px - ...) }

So the buttons moved and the line did not shorten with them. Same 52vw
expression now applies to `body:not(.pl-mobile).equip-open`, because D168
deliberately gave both sheets the same geometry.

Measured after the fix, at 1920px: the line's right edge is 848 with the first
button at 854, identical to the map, and both sheets reserve the same 810px
width. `tools/panel-reflow-live.js` asserts all three, comparing the equipment
sheet against the map rather than against a constant, so the two can never drift
apart again (29 assertions). The selector accepts CharInput as well as
LineInput, since the same CSS rule governs both and a story sitting at a
"press any key" prompt would otherwise skip the check silently.


## D173 An announced score change has to be COUNTED, not only used to pin

Operator: "the score is not automatically updating -- this is the first two
points earned in the game but the system just simply will not register it", and
separately "I believe this caused the audio and the graphic not to display".

Both are one defect, and D167's own text names it: the cue chain is
`value change -> emitChange -> playCues`, so a frozen score silences everything
downstream.

### Why the first event could never register

D167 used the notification ONLY to identify which global holds the score. On
Anchorhead one event cannot identify it: globals 15 and 16 both shadow the
score, so no unique candidate emerges and `pinScoreByDelta` deliberately refuses
to tie-break from a single event -- a safety rule that is correct and is NOT
relaxed here. Nothing then wrote `stats.score`, the HUD stayed at 0, and the
tone and badge never fired.

Counting an announced change is a different job from identifying the slot, and
D167 only did the second.

### What it does now

The game stated its previous total in its own SCORE reply, then stated the
change. Adding them is arithmetic on the game's own words. `stats.score` is
moved by the delta and `emitChange` fires, which restores the number, the tone
and the "+2" badge from one write.

### Ordering is the whole safety argument

From the grok seat's review, and it is a ship-blocker if got wrong: the delta is
applied AFTER `pinScoreByDelta` and AFTER `readConfirmedGlobals`, against a
`scoreBefore` captured before either ran. So the pin still narrows against the
absolute the game last confirmed, never against a delta-applied running total --
which would have made it require a global holding `total + delta`, a value RAM
never holds, and the slot would then never pin at all. The fix would have broken
the very mechanism it was meant to bootstrap.

Four further guards, each answering a specific hazard raised in that review:

  no baseline      a delta with nothing to add to is RELATIVE, and presenting it
                   as the score would invent a total. Most games start at 0, but
                   "most games" is not evidence (D24), so the row does not move
                   until the game has stated an absolute.
  status source    Zork 1 has a real Score column and `recordObservation`
                   already emits from it; adding the delta too would count the
                   same points twice.
  already moved    if the value changed this tick -- by a pinned global reading
                   RAM, or by a status sample -- the delta is not added on top.
                   A source test alone misses this, because after pinning the
                   source is "global:N" rather than "status".
  replay           `fresh` comes from a buffer-length watermark, not a seen-set,
                   and SCORE_DELTA is `.exec` without /g, so a restore or a
                   transcript reprint can re-present an OLD notification as new.
                   Keyed by turn and amount, which is what survives a redraw.

### Rejected: an automatic SCORE probe

Worth recording because it turned on a measurement that corrects D167. D167
states "[the SCORE reply] costs a turn, so it is never issued automatically".
That was written without being measured, and it is WRONG -- SCORE is a meta
action:

    anchor.z8   before 7  afterSCORE 7  afterLOOK 8
    Zork1.z3    before 6  afterSCORE 6  afterLOOK 7   (status row agrees 6,6,7)
    LostPig.z8  before 6  afterSCORE 6  afterLOOK 7
    wump2ka.z5  before 7  afterSCORE 7  afterLOOK 8

So an automatic bootstrap probe WAS available, and it would have handled the
no-baseline case that this fix honestly refuses. It was not taken: the grok seat
argued the announced change should be counted directly rather than answered with
an injected command, which avoids transcript noise, reentrancy from issuing a
command inside `Tick`, and any story where SCORE has a side effect. The
measurement is recorded here because the false assumption in D167 should not
survive to mislead a third time.

### Coverage

`harness/stat-tracker.js` 92 (7 new): the baseline from a real SCORE reply, the
worded delta, the count itself, the score-up event that drives tone and badge,
the replay guard, a later event still counting, and a delta with no baseline
refusing to invent a score. `tools/stat-tracker-live.js` 12 and
`tools/carry-value-live.js` 16 unchanged.


## D174 A pinned figure that cannot answer this turn must not freeze

Found while answering the operator's question about how wump2ka reports weight
and value. It does NOT report them in its score section -- `score`, `full` and
`full score` all answer only "You have so far scored 1 point in 4 turns." The
figures appear solely in the inventory line, which is what D169 already parses.
The operator's request is satisfied in the app's own STATUS panel, where D169
places Value immediately after Score with weight and capacity following.

The measurement taken to confirm that found a real defect in D169.

### The freeze

Measured on wump2ka:

    Glow Bar alone       weight 4  [indiv:100]   pinned from RAM, correct
    + canteen            weight 4  [indiv:100]   WRONG -- capacity went 10% -> 22%
    canteen dropped      weight 5  [indiv:100]   correct again

The canteen computes its own weight, because what it weighs depends on how much
water is in it, so `sumIndiv` correctly refuses to return a total that omits it.
D169 then kept the last known figure -- and, worse, `observeCarryText` refused
the fresh inventory text that DID carry the real weight, because a RAM-pinned
source outranks text.

So the row showed a stale number while still labelled `indiv:100`, i.e. still
claiming to be read live from memory. A wrong number presented as authoritative
is the one outcome D24 exists to prevent, and it was worse than the honest
absence D169 thought it was choosing.

### The fix

`readCarryFromRam` marks the stat `ramStale` when the sum is unavailable, and
clears it as soon as RAM can answer again. `observeCarryText` may override a
RAM-sourced figure only while that flag is set, and corrects `source` to
`inventory-text` when it does, so the row never claims a provenance it does not
have.

Measured after:

    + canteen            weight 9  [inventory-text]   the game's own figure
    canteen dropped      weight 5  [indiv:100]        back to live RAM

### Coverage

`tools/carry-value-live.js` 19 (3 new): the fallback while an item computes its
own figure, the return to RAM once every item reports a plain weight, and that
carrying more actually weighs more. `harness/stat-tracker.js` 92 and
`tools/stat-tracker-live.js` 12 unchanged.


## D175 Two defects the audit found in D173, one of them in its own test

The grok seat audited D173 and found both. Recording them because the second is
the more instructive.

### The pin baseline was the running total

`pinScoreByDelta` read `stats.score.value` for its `known`. D173 counts an
announced change onto that field and marks it confirmed, so the NEXT
notification would narrow against a delta-derived running total rather than an
absolute the game stated.

This tick was safe, because the apply runs after the pin. The tick AFTER was
not: if the displayed total had drifted at all -- an undo, a missed
notification, a double apply -- then `known + delta` is a number RAM never
holds, every candidate is rejected, and the slot never pins. Headless reading
would never start, which is the exact mechanism D173 exists to bootstrap. The
fix would have destroyed the thing it was meant to enable, one turn later.

`model.scorePinKnown` now carries the pin baseline and is written from three
absolute sources only: a SCORE reply, the status row, and a pinned global.
The displayed value may run; the baseline may not.

### The replay guard was keyed on a TICK counter, and the test hid it

The guard used `StatTracker._turn`. That is a TICK counter -- D153 measured
observe() running about forty times per game turn -- so live, a replayed
notification always lands on a different tick, gets a different stamp, and is
counted again.

The harness passed because it held `_turn` still. That is a false green: the
test asserted the exact condition that never occurs in the app.

The key is now the GAME's own turn counter plus the notification text, mirroring
how `observeText` dedupes death and win banners. That is the right key because a
restore returns the game to an earlier turn, so a replayed notification produces
the same id it produced the first time and is correctly ignored. The test now
advances forty ticks while holding the game turn, and would fail against the old
implementation.

### Recorded, not fixed

Two exposures the audit raised and I am leaving documented rather than papering
over:

**Notification before RAM updates.** If the announcement appears in the buffer
before the global is written, the pin misses that event and the HUD runs ahead.
Once the slot pins, `readConfirmedGlobals` snaps the display back to RAM.

**Undo with an unpinned slot.** A counted change that is then undone leaves the
display high until a SCORE reply, a status sample or a pin corrects it.
`StatTracker` does not subscribe to `UndoRestoreSync`; with the pin baseline now
separate, an undo can no longer poison the pin, which was the serious half.

### Rejected again: an automatic probe for the no-baseline case

The audit reaffirmed it, on a rule rather than on cost: a probe is never issued
unasked. D149 established it, D169 honours it for value and weight, and the
Identify control remains the opt-in. So a player who never triggers a SCORE
reply and has no status column still sees no movement on their first points --
an honest absence (D24) rather than an invented total. The measurement that
SCORE is free (D173) stands; being free is not the same as being asked for.

### Coverage

`harness/stat-tracker.js` 95 (3 new): the SCORE reply seeding the pin baseline,
the baseline staying put while the display counts a change, and the replay guard
tested forty ticks later on the same game turn. `tools/stat-tracker-live.js` 12
and `tools/carry-value-live.js` 19 unchanged.


## D176 The pin baseline stuck too LOW, which D175 created

The grok seat audited D175 and found that fixing a baseline which ran too high
had produced the mirror fault.

After a SCORE reply of 0 and a counted +2, `scorePinKnown` is still 0 -- by
design, because only an absolute may seed it. A following +5 then makes the pin
demand a global holding `0 + 5 = 5`, while RAM holds 7. Every candidate is
rejected, the slot never pins, and because RAM can only refresh the baseline
ONCE pinned, there is no way out. A catch-22 for the headless path.

The hold-total filter is only sound while the baseline is CURRENT. The display
having moved past the last stated absolute is exactly the signal that it is not,
so in that case only the MOVEMENT filter is applied -- `globals[i] - prev[i] ===
delta`, which needs no baseline and is the original D167 evidence. Nothing is
loosened while the baseline is current.

### The suite missed it, again

95 assertions passed over this feature while the pin was dead, because they only
checked the HUD arithmetic and never that pinning still worked. That is the
second false green in the same feature -- after the tick-keyed replay guard in
D175 -- and both were found by reading the code rather than by running the
tests.

The new assertions are on `scoreDeltaEvents` and `scoreCandidates`, because
before the fix `pinScoreByDelta` returned at `if (!hits.length) return;` WITHOUT
recording either. Verified by removing the fix: the suite drops to 98/1 with
"event two is counted, so hits were not empty (1)". A test that does not fail
against the bug it describes is not evidence.

### Recorded, not fixed

Confirmed by the audit and left documented:

  - the replay guard falls back to the TICK counter for a story that exposes no
    turn counter, which reintroduces the D175 bug for those stories only
  - `ramStale` (D174) is set as soon as RAM cannot answer, but the row keeps its
    `indiv:` source and its stale number until the next inventory line arrives.
    A take that does not reprint the inventory leaves a live-looking figure
    until then. Better than refusing the text outright, still not honest
  - if any story computes an item's VALUE the way wump2ka computes the
    canteen's WEIGHT, the same freeze applies; it shares the code path, so the
    same flag covers it
