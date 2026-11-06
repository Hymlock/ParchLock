# D93 — Android Portrait Mobile UI (Plan Only)

> **Historical ordering note (D110, 2026-09-22):** this document records
> D93's decision to retain D26's chrome-first input radial. The operator later
> superseded that policy. Current adaptive radials use uncapped usage first,
> then static prior and original order; see `PRODUCTION_PLAN.md` D110 and
> `ARCHITECTURE_UML.md` section 44. D93's mobile Tools-list behavior remains.
>
> **Status:** Collaborative draft for operator review. **No implementation in this phase.**
> **Author seats:** Claude (architect, baton holder), Grok (live adversarial co-auditor).
> **Note:** An earlier draft of this document credited "Codex" as a co-author. Codex was confirmed NOT live for this task (out of usage credits) — its bus messages came from a stale, unsupervised process orphaned since 9/16 that was never authorized to participate. That process has been killed and its content has been superseded here; nothing in this version depends on it being correct or credited.
> **Authority:** Operator directive 2026-09-20 — portrait primary; full functionality; Claude holds baton; Grok is the only other live seat.
> **Sources:** `PRODUCTION_PLAN.md`, `ARCHITECTURE_UML.md` §28/§30, `GUI_BASELINE.md`, live `js/MobileLayout.js`, `js/Actionable.js`, `js/Qol.js`, `js/Input.js`, `css/Parchmap.css`, `play.html`, `manifest.json`, `AndroidManifest.xml`, `capacitor.config.json`, live Playwright probes at 390×844, 360×740, 412×839, 1400×900 (both seats, independently).

---

## 0. Operator corrections (must supersede prior work)

| Prior (D92 / current code) | D93 requirement |
|----------------------------|-----------------|
| Landscape-primary play | **Portrait-primary** play |
| `manifest.json:9` `"orientation": "landscape"` | **`"portrait"`** (or `"portrait-primary"`) |
| `MobileLayout.js:89` `requestFullscreenLandscape()` → `screen.orientation.lock("landscape")` | **Delete** the lock call entirely — not made optional |
| `#pm-rotate-hint` ("Rotate your phone to landscape to play", `play.html:145-147`) | **Remove / invert** — portrait is normal, no rotate nag |
| Desktop-only command-bar assumptions | Full mobile parity + **submit arrow** (desktop too) + **mic** (mobile only) |

D92 remains valid for: `content://` unstyled diagnosis, PWA/Capacitor delivery path, the `visualViewport` keyboard-inset *concept*, map-as-sheet, the existence of a touch long-press mechanism (though not yet proven live, see §3).

Android-level note (Grok L1): `AndroidManifest.xml`'s Activity has **no** `android:screenOrientation` — the landscape force is entirely the PWA manifest + JS `orientation.lock`, not an OS-level constraint. Deleting the JS/manifest lock is sufficient; no native manifest change is required for portrait to work in the APK.

---

## 1. Goals

1. **Complete** Android phone UI in **portrait**, usable one-handed, with no rotate requirement.
2. **Every desktop play function** reachable on a phone without landscape or missing chrome.
3. **Keyboard-safe:** the OS keyboard never permanently covers the line input or primary actions.
4. **Touch-native:** tap = primary action; long-press = radial, proven on real touch input, not `contextmenu` simulation (ARCHITECTURE_UML.md:837-842 mobile gate).
5. **Delivery:** Capacitor APK / `https` / `localhost` PWA are the supported styled paths. `file://` (partial) and `content://` (broken) are documented, not silently assumed to work.
6. **No prose-mining UI.** Same structural command surfaces as desktop (D24/D88).

## 2. Non-goals (v1)

- Redesigning the desktop 1400px split layout.
- New VM/engine work.
- iOS as a primary target (graceful degrade acceptable; Android first).
- Implementing anything during this planning phase.
- Landscape as a user setting — it is deleted for v1, not hidden behind a toggle. A later, separate decision can reintroduce it as an enhancement.
- A new bottom-tab-bar app chrome (see §4, Q1 reversed below).

---

## 3. Live findings (grounded evidence, both seats — this is what the plan is fixing)

### 3.1 Portrait is actively treated as an error (Claude F1, Grok L1)

- `play.html:145-147` — `#pm-rotate-hint` literally says "Rotate your phone to landscape to play. The keyboard needs horizontal room."
- `js/MobileLayout.js:55-58` — hint shown whenever `compact && portrait`.
- `js/MobileLayout.js:89` — `requestFullscreenLandscape()` calls `screen.orientation.lock("landscape")`.
- `manifest.json:9` — `"orientation": "landscape"`.
- `css/Parchmap.css:2451-2453` — comment literally states "Prefer landscape; portrait shows a rotate hint."
- `ARCHITECTURE_UML.md:916` documents the lock; `PRODUCTION_PLAN.md` D92 documents it as shipped intent — both need rewriting once this plan is approved, not before.
- Confirmed live via Playwright at 390×844 and 360×740: `body.pm-mobile.pm-portrait` present, hint `display:block`, `hidden=false`.

### 3.2 First tap silently steals the session into landscape (Grok L3 — new, not previously found)

`MobileLayout.init` binds a capture-phase `touchend`/`click` listener on `document` (`js/MobileLayout.js:127-142`) that calls `requestFullscreenLandscape()` on the **first gesture anywhere** — including a tap on the menu, a noun, or the (currently untappable) input. Combined with §3.1, the very first thing a portrait user does can rotate them into the orientation they didn't ask for. This must be deleted, not just the hint text.

### 3.3 `.Input.LineInput` is untappable — root cause isolated (Claude F2/F3, Grok L2)

Live Playwright evidence at 360×740:
- `.Input.LineInput`: `position:fixed`, `z-index:25`, `font-size:16px`, real geometry (y=686, h=44).
- `document.elementFromPoint()` at the input's own center returns `#parchment`, not the input.
- `#parchment`: `position:fixed`, `opacity:0`, `pointer-events:auto`, `z-index:3`, occupying the exact same rect as `#windowport`.
- `#game-menu` (also fixed-position) tests as correctly tappable at the same viewport — the bug is not "all fixed elements," it's specific to this stacking arrangement.

**Mechanism (Grok, confirmed against source):** `css/Parchmap.css:2499-2510`'s mobile rule sets **both** `#parchment` and `#windowport` to `z-index:3`. This traps `.Input.LineInput`'s `z-index:25` *inside* `#windowport`'s own stacking context — the input's high z-index only wins within that context, not against siblings outside it. `#parchment` is a later DOM sibling of `#windowport` (`play.html:155` then `:171`), so it paints on top regardless of the input's nominally higher number. `opacity:0` does not disable hit-testing — `#parchment` is invisible but still eating pointer events.

On desktop (1400×900), `#windowport` is `z-index:2` and `#parchment` is `z-index:auto` — the input escapes cleanly and desktop is unaffected. **Any fix must not touch the desktop rule.**

### 3.4 Tools FAB is hidden by default on mobile boot (Grok L4 — new)

`css/Parchmap.css:2225-2226` sets `#tools-toggle{display:none}` until `body` gets a `tools-button-visible` class, which is only added by `js/Input.js:276-280` when the user **types** `/tools`. The `body.pm-mobile #tools-toggle` rules (from `:2570` on) never override that `display:none`. Result: on a fresh mobile boot, the **only** always-visible chrome is `#game-menu` (Save/Restore/Map/Options/Help/Exit). Items, Transcript, History, Display, Commands, Theme, Maps slots, and Save files are all unreachable unless the user already knows to type a slash-command — which defeats the point of a touch UI.

### 3.5 The input-line radial has no touch path at all (Grok L5 — new)

`js/Qol.js:22` binds the input's radial menu to `contextmenu` only. There is no `touchstart`/long-press handler on `.Input.LineInput` (unlike `.pm-act`, which does have one — see §3.6). On Android, a long-press on a text input triggers the OS's own cut/copy/paste UI, not our radial. Combined with §3.3 (the input can't even be tapped to focus), this command surface is currently unreachable by finger.

### 3.6 Noun long-press exists in code but is not proven live, and has three additional concrete failure paths beyond the stacking bug (Claude F4, sharpened by Grok L6)

`js/Actionable.js:173-219` is real: `touchstart`/`touchmove`/`touchend`/`touchcancel`, 500ms hold, 10px move-cancel. `harness/d88-touch-longpress.js` passes, but it's a jQuery/vm mock, which `ARCHITECTURE_UML.md:837-842` already says does not constitute proof at a real viewport. Beyond §3.3's stacking bug (which explains outright tap failure if `.pm-act` content sits under the same `#parchment` overlay), Grok identified three more concrete killers that must each be fixed, not just "verified":

- **(a)** No `user-select:none` on `.pm-act` — only `#map #rooms` has it (`css/Parchmap.css:1832`). A long-press on story text starts native Android text selection, which fires `touchcancel`, which `Actionable.js:211-216` uses to clear the long-press timer. The radial never opens.
- **(b)** `Qol.HideRadialMenu` is bound to `document mousedown`/`keydown`/`scroll` (`js/Qol.js:23`). A touch radial that just opened can be immediately dismissed by the same gesture's synthesized `mousedown` or by buffer scroll.
- **(c)** `LongPressMoveCancelPx: 10` is smaller than typical finger jitter on a scrollable buffer, causing legitimate long-presses to self-cancel.

Conclusion: "tap/long-press not working" on a real phone is **not** fully explained by the stacking bug alone. Tap failure = stacking (§3.3). Long-press failure = stacking **plus** (a) and (c) above.

**Correction (Grok final pass, R3):** (b) — `HideRadialMenu` dismissing a just-opened radial via the same gesture — is **not** currently live-proven from source. `HideRadialMenu` is bound to `document` `mousedown`/`keydown`/`scroll` (`js/Qol.js:23,696-700`); a scroll on `#windowport` does not bubble to `document`, and a successful long-press already calls `preventDefault()` on `touchend` (`Actionable.js:204-208`), which should suppress the synthesized compatibility `mousedown`. Keep it as **G18, a defensive gate** (guard against a synthesized `mousedown` from the same touch dismissing the radial it just opened) rather than presenting it as an observed live failure. (a) and (c) remain confirmed live defects independent of the stacking fix.

### 3.7 Radial pagination buries universal commands on phones (Grok L7 — new)

`js/Qol.js:564`: `capacity = (innerWidth<600 || innerHeight<600) ? 6 : 16`. Confirmed live: phones get capacity 6, desktop gets 16. `RankInputRadialCommands` keeps a 6-item "chrome" group (undo/save/restore/map/history/transcript) first, so with capacity 6 (page size 5 + "More…"), page 1 on a phone is five chrome commands and a "More…" — Look/Inventory/Wait and dictionary verbs are pushed off-page. Also, `OpenRadial` positions using `window.innerWidth/innerHeight` (`js/Qol.js:667-668`), not `visualViewport` — unlike `WorkspaceUI.OpenTools`, which already centers correctly on `visualViewport` (`WorkspaceUI.js:31-38`). A radial opened while the keyboard is up can render partially under it.

### 3.8 No submit control exists anywhere; no keyboard-safe mic permission exists for R2 (Grok L8 — confirms operator's own report)

Live probe across all three mobile viewports: `submitBtn=false`, `micBtn=false`. These are genuine absences (R1/R2), not regressions. Additionally: `AndroidManifest.xml` currently declares **only** `android.permission.INTERNET` — no `RECORD_AUDIO`. A Capacitor-wrapped `SpeechRecognition` call will fail silently/closed in the APK without that permission being added at implementation time. This must be planned as a manifest change, not assumed to "just work" because the browser API exists.

### 3.9 `content://` remains broken; `file://` is fine for testing (Grok L9, confirms D92)

Both seats' Playwright audits used `file://` successfully (CSS/JS loaded). The distinct, real-world failure is Android's `content://` share-sheet URIs, which break relative asset loading — this is why Capacitor (`androidScheme: https` in `capacitor.config.json`) is the real APK delivery path, not a workaround.

---

## 4. Information architecture (portrait) — REVISED

**Decision reversed from the first draft:** a new 4-tab bottom-nav app chrome (Story/Map/Items/More) was proposed and then rejected. `GUI_BASELINE.md`'s note ("Mobile uses modals - floor tabs need a bottom-sheet pattern, not a third column") is about **floor tabs inside the map sheet**, not license to invent new persistent app-level chrome. A bottom-nav bar would also spend vertical space the story buffer doesn't have, and duplicates what `#game-menu` + the existing map sheet already do. **v1 keeps the existing sheet/modal pattern** and instead fixes what's actually broken:

### 4.1 Primary column (unchanged shape, existing CSS)

```
┌─────────────────────────────┐
│ status grid (Glk, existing) │  safe-area-inset-top
├─────────────────────────────┤
│                             │
│   STORY BUFFER (flex:1)     │  scroll
│   #windowport / #parchment  │
│                             │
├─────────────────────────────┤
│ [mic] [======input======] [➤] │  pinned above keyboard (new: mic + ➤)
└─────────────────────────────┘
     ↑ grows with --pm-kb-inset (visualViewport)
```

### 4.2 Chrome fix (replaces the bottom-nav idea)

- `#game-menu` stays as the primary always-visible entry point (Save/Restore/Map/Options/Help/Exit) — already correct.
- `#tools-toggle` (Tools FAB) becomes **visible by default on `body.pm-mobile`**, not gated behind typing `/tools` (fixes §3.4). This alone restores Items/Transcript/History/Display/Commands/Theme/Maps/Save-files reachability without inventing new chrome.
- Map sheet, unchanged: full-viewport sheet, existing `translateY(110%) → 0` pattern. **Not** a default half-height split (this decision from the first draft is kept — it was never in dispute).

### 4.3 Desktop still required

- R1 (submit control) ships on the **desktop** line-input row too — operator confirmed it's missing there as well, not mobile-only.
- Desktop 1400px split layout is otherwise unchanged (non-goal, §2).
- D88 semantic-cutover flag stays default-off; none of this requires flipping it (Grok G23).

---

## 5. Full functionality matrix (desktop → mobile)

| Capability | Desktop today | Mobile D93 |
|---|---|---|
| Story scroll + status | yes | yes, full width |
| Line input + Enter | yes | yes + **tappable (G9, fixes §3.3)** + **submit ➤ (G10)** |
| Noun tap / long-press radial | yes | yes; real touch, all four §3.6 causes fixed (G11, G18, G22) |
| Input-line radial | contextmenu | **new: touch long-press or explicit button (G14, fixes §3.5)** |
| Tools / game menu | control-panel + radials | `#game-menu` + **Tools FAB visible by default (G13, fixes §3.4)** |
| Autocomplete | yes | yes; anchored above input, must out-rank `#parchment` (G12) |
| Radial command set | capacity 16, universals on page 1 | **capacity/ranking revisited so Look/Inventory/Wait aren't buried (G17, fixes §3.7)** |
| Inventory | yes | via Tools/menu, nested chips (D31) unchanged |
| Map pan/zoom/center/search/known-rooms/notes | side panel | Map sheet (unchanged, already correct) |
| Save / Restore / packages | control-panel | via `#game-menu` (already correct) |
| History / transcript / display / theme / options / help | yes | via Tools FAB once visible (G13) |
| Voice input | no | **Mic, mobile-only, RECORD_AUDIO + fail-closed (G10, G15, fixes §3.8)** |
| Keyboard room | partial | `visualViewport` inset (keep), verify no Capacitor `adjustResize` double-count (G3 note) |

Audit requirement (not assumption): every live `#control-panel` button (Map Animations, Assume 2-way, Show help, etc.) must be checked off as reachable via the Tools FAB / Options path — enumerated, not asserted (G12 old / now folded into the checklist below).

---

## 6. Orientation & shell policy

1. **Default: portrait.** Playable without ever rotating.
2. **Delete**, not disable: `screen.orientation.lock("landscape")` call, the first-gesture auto-lock chain (§3.2), the `#pm-rotate-hint` "rotate to landscape" copy, and `manifest.json`'s `"orientation": "landscape"`.
3. `manifest.json`: `"orientation": "portrait-primary"` (or `"any"` if no lock at all is preferred — flagged as an open question, §9).
4. Android Activity needs no change (§0 note — it was never locked at the OS level).
5. Capacitor: no forced orientation in `capacitor.config.json`; `adjustResize` (or Capacitor's keyboard plugin) supplements `visualViewport`, doesn't replace it — verify no double-counted inset on a real APK (G3).

**Correction (Grok 4th pass, G31):** the live APK's actual keyboard mode is the AppCompat/splash default `windowSoftInputMode=stateUnspecified|adjustPan` — `android/app/src/main/res/values/styles.xml` does not declare `adjustResize` today, so §6.5/G3 above was describing target behavior as if it were already configured. Implementation must explicitly decide keep-`adjustPan` (rely on `visualViewport` alone) vs switch-to-`adjustResize` (and then actually prove no double-count against the `visualViewport` inset on a real APK, not the PWA) — this is an open implementation decision, not a given.
6. Landscape becomes a later, optional, explicitly-new decision (e.g. a side-map enhancement) — not part of D93 v1 acceptance, not a hidden setting.
7. `harness/mobile-fullscreen-landscape.js` currently asserts `lock("landscape")` 13/13 — this harness is validating the wrong behavior and must be rewritten to assert the *absence* of any orientation lock, or it will report false-green confidence after the fix (G19).

**Correction (Grok final pass, R1):** the cross-reference in the original draft of this section pointed to "§9" for the portrait-primary-vs-`any` manifest question; the correct section is **§13** (Open questions), not §9. G20 below is worded against §13.

---

## 7. Input row specification (R1 + R2 + §3.3 + §3.5)

```
[ 🎤 mic ] [     line input (flex)     ] [ ➤ submit ]
```

| Control | Where | Behavior |
|---|---|---|
| **Mic** | Mobile only, left of input | Tap start/stop STT; inserts transcript into input; does **not** auto-submit (user reviews, then taps ➤ or presses Enter) |
| **Input** | Always | Existing Glk `.Input.LineInput`; must receive taps (G9) and support long-press-to-radial or an explicit button (G14) |
| **Submit ➤** | Desktop + mobile | Submits current line, same effect as Enter |

**Critical correctness note (Grok 5th pass, previously-unaddressed):** `.Input.LineInput` is created and owned by GlkOte inside `#windowport`'s `.BufferWindow`, not static host markup in `play.html` — the "flex row wrapping the input" language elsewhere in this plan means an *overlay* with reserved gutters around Glk's own node (or an explicit reparent-on-each-prompt, proven not to fight GlkOte's own re-layout on the next prompt), not a literal DOM restructure of Glk-owned markup. Separately, and more urgent: `Input.Inject(text, true)` (`js/Input.js:19-22`) **appends** `text` to whatever is already typed, then submits. ➤ must call `Inject("", true)` — append nothing, just fire the submit keypress on the existing value. Calling `Inject(currentValue, true)` would **double the command**. This must be specified exactly this way at implementation time, not left to the implementer's guess (folded as G39 below).

### STT notes (plan only, exact plugin decided at implement time)

- Browser/PWA path: `SpeechRecognition` / `webkitSpeechRecognition` where available.
- APK path: a Capacitor community speech-recognition plugin — **requires adding `RECORD_AUDIO` to `AndroidManifest.xml`**, which it does not currently have (§3.8). Decide the exact plugin via a live APK probe, not assumption (G15).
- Fail closed with a toast if permission is denied or the engine is unavailable; must never block normal typed play (G15).
- No server-side voice upload in v1.

### Stacking-bug fix direction (§3.3, implement later — this is now a precisely scoped CSS fix, not an open investigation)

- Root cause is `css/Parchmap.css:2499-2510` pairing `#parchment` and `#windowport` at the same `z-index:3` on mobile, trapping the input's higher `z-index:25` inside `#windowport`'s local stacking context while `#parchment` paints after it as a later sibling. Why desktop is unaffected (Grok 4th pass): desktop's `#windowport{z-index:2}` (`css:364-368`) beats `#parchment`'s `opacity:0` (which creates its own stacking context at effectively the bottom) — mobile's rule equalizes both to `3`, which is what lets `#parchment` win.
- **Preferred direction (Grok 4th pass, G33):** give `#parchment` `pointer-events:none` while it's the invisible (`opacity:0`) overlay — it is an empty overlay element (already fully hidden via `display:none` under `html.pm-host-emglken`, `css:2430`, in at least one existing mode), so disabling its hit-testing should be safe and is the smallest change. Relocating the input (and row wrapper) out of `#windowport`'s DOM/stacking context is a **last resort only** — Glkote owns and actively updates that subtree (status updates, MORE prompts, char input), so moving Glk-owned markup risks breaking Glkote's own update/focus logic. **Must not change the desktop rule** (`#windowport` is `z-index:2` there and already correct — verify the fix doesn't touch it, G24).
- Gate G9 requires this proven via `elementFromPoint` at the input's own center returning the input (not `#parchment`) on real portrait viewports, plus the same check against at least one live `.pm-act` element.
- **New (Grok 4th pass, G32):** `lib/main.js` appends Glk's own dialog markup (`#dialog_screen`/`#dialog_frame`/`#dialog` — the native Save/Restore file pickers) into `#windowport` as well. If the stacking bug isn't fixed at the `#parchment`/`#windowport` level, those dialogs are likely just as untappable as the line input, not only the input itself. G9/G12 and gate G4 (save/restore flow) must each separately confirm `elementFromPoint` on an open Glk dialog resolves to the dialog, not `#parchment`.

---

## 8. Keyboard behavior

Keep and harden the existing `--pm-vv-height` / `--pm-kb-inset` system — it already works, this is not a rewrite:

- On `visualViewport` resize/scroll and input focus, recompute the inset (existing).
- `pm-keyboard-open`: never cover the input row (mic/input/➤) — verify this still holds once those two new buttons widen the row.
- Test Android Chrome with `interactive-widget=resizes-content`, with a fallback path if an OEM browser ignores it.
- Capacitor: `adjustResize` (or the Capacitor keyboard plugin) as a supplement, with an explicit check that it doesn't double-apply on top of the `visualViewport` inset in the native WebView (§6.5, G3).

---

## 9. Touch & command parity (D88)

- Tap on a noun → primary action (existing `Actionable.js` click/tap path).
- Long-press → radial — requires all of §3.3 + §3.6(a)(b)(c) fixed together, not just the stacking bug, to actually work on a real device (G11, G18, G22).
- Scroll cancels long-press (already modeled in the harness; must additionally not be defeated by native text-selection, §3.6a).
- Map: one-finger pan, pinch zoom if present, optional drag-to-dismiss sheet.
- No reliance on `contextmenu` simulation for any mobile acceptance gate (`ARCHITECTURE_UML.md:837-842`).
- D88 semantic-cutover flag stays default-off; mobile chrome changes must work with it off, and parity must hold if it's later turned on (G23).

---

## 10. Delivery / packaging

| Mode | Styled UI? | Notes |
|---|---|---|
| Capacitor APK | **Yes** — primary Android product | Bundled assets; avoids `content://` relative-link failure |
| PWA `https` / `localhost` | Yes | Service worker; portrait manifest |
| `http://LAN-IP` | Partial | Service worker may not register (insecure context) |
| `file://` | Works for testing | Confirmed via both seats' Playwright audits |
| `content://` (Android share-sheet) | **Unsupported** for full styled UI | Document in `TEST-DIST-README.txt`; this is the real D92 root cause, distinct from `file://` |

---

## 11. Implementation ownership (later phase — not now)

Single-owner decision (reversed from the first draft's proposed new `MobileShell.js` — rejected as an unnecessary claim split; `MobileLayout.js` already owns this surface and the fix is corrective + additive, not a rewrite):

| Area | Likely owner file(s) | Notes |
|---|---|---|
| Portrait shell, orientation delete, inset | `js/MobileLayout.js` | Sole owner, evolved in place |
| Stacking-context fix, mobile CSS | `css/Parchmap.css` | Precise fix to the `:2499-2510` pairing only; desktop rule untouched |
| Input row chrome (mic/➤) | `play.html` host markup + `js/Input.js` (submit wiring) | New, additive |
| Input-line touch radial | `js/Qol.js` | Add `touchstart` alongside existing `contextmenu` |
| Radial pagination/positioning | `js/Qol.js` | Capacity/ranking + `visualViewport` positioning fix |
| Long-press robustness | `js/Actionable.js` + CSS `user-select:none` on `.pm-act` | Fixes §3.6 (a)(b)(c) |
| STT | New small module + Capacitor plugin | Mobile only |
| Manifest / service worker | `manifest.json`, `service-worker.js` | Orientation portrait |
| Capacitor / native permission | `capacitor.config.json`, `AndroidManifest.xml`, `build-android.bat` | Add `RECORD_AUDIO` only if R2 ships |
| Touch verification | `harness/d88-touch-longpress.js` (extend) + new real-device/Playwright portrait harness | `harness/mobile-fullscreen-landscape.js` must be rewritten, not left green-but-wrong (G19) |
| Help copy | `js/WorkspaceUI.js` (`ShowHelp`) | **Added (Grok 5th pass):** current help text tells the player to use the menu, right-click the input, and type `/tools` to enable Tools — all become false once G13/G14 ship and must be updated in the same change, not left stale |
| Docs | `PRODUCTION_PLAN.md` D93, `ARCHITECTURE_UML.md` §30 rewrite | **After operator approves this plan, not before** |

**Note (Grok final pass, R8/G26):** `capacitor.config.json`'s `webDir` currently points at an **absolute, outside-the-repo path** (`C:\Users\hymlo\Downloads\Parchmap-dist`). Implementation must switch this to a repo-relative path (e.g. `dist/` or `www/`) so APK builds are reproducible and not tied to one machine's folder layout. Any APK evidence gathered for G6 must come from a fresh `build-android.bat`/`make-dist.bat` run, not a stale existing `Parchmap-dist` folder.

---

## 12. Acceptance gates (implement later; this plan is incomplete without these passing)

| Gate | Criterion |
|---|---|
| G1 | Portrait 390×844 and 360×740: boot story, scroll, all primary chrome reachable |
| G2 | Real touch long-press opens radial; scroll cancels (extend existing harness) |
| G3 | Map sheet open/close; path/travel; d48 single-box gate stays green; Capacitor keyboard inset does not double-count with `visualViewport` |
| G4 | Save / restore / package from the (now-visible) Tools path |
| G5 | Items/inventory reachable and usable in portrait. **Correction (Grok 5th pass):** Items is not a separate modal — `Actionable.ShowInventory` (`Actionable.js:544-548`) calls `ParchmapMap.Show()` and toggles `#items-tab` *inside the map sheet*. The gate is: Tools → Items opens the map sheet with the items tab active, nested inventory chips are tappable, and the item radial works inside the portrait sheet's constrained height (`rooms-shell min(42vh,280px)`, `Parchmap.css:2542-2544`) |
| G6 | Capacitor debug APK loads CSS/JS correctly (not blank/unstyled) |
| G7 | No `orientation.lock('landscape')` anywhere; portrait play with no rotate prompt |
| G8 | Desktop `layout-regression` + `ui-regression` harnesses stay green |
| G9 | `.Input.LineInput` reliably tappable (`elementFromPoint` returns the input, not `#parchment`) at all tested portrait viewports |
| G10 | Submit ➤ works desktop + mobile; mic works mobile, hides gracefully when STT is unsupported |
| G11 | Long-press-to-radial verified on real touch input at real portrait viewports, not harness-only |
| G12 | `#parchment` no longer wins hit-testing over `#windowport`/input while invisible (`pointer-events:none` or restacked); autocomplete's z-index also beats `#parchment` |
| G13 | Tools/Items reachable via a visible control on portrait boot — no `/tools` typing required |
| G14 | Input-line radial has a working touch path (long-press or explicit button), not `contextmenu`-only |
| G15 | R2 mic: `RECORD_AUDIO` permission added and requested; fails closed (toast, no silent empty transcript) if denied; browser-vs-Capacitor-plugin choice confirmed via a live APK probe |
| G16 | The first gesture on a portrait session never triggers the landscape-lock chain (`MobileLayout.js:127-142`'s capture-phase `requestFullscreenLandscape`), which — note, corrected — does not cancel the tap via `preventDefault`/`stopPropagation`; the hazard is the fullscreen+orientation layout jump it causes mid-gesture, not gesture cancellation |
| G17 | **Reframed as an operator policy question, not an assumed bugfix (Grok 5th pass):** the input radial's chrome-prefix (undo/save/restore/map/history/transcript staying first) is D26's *intentional* design, not an oversight — capacity-6 on phones happens to make page 1 all-chrome as a side effect. This plan does **not** unilaterally override D26; see new **§13 Q4** for the operator to pick between (i) a compact-only ranker exception putting universals on page 1, (ii) raising phone radial capacity, or (iii) keeping chrome-first and accepting universals are one "More…" tap away. **`WorkspaceUI.OpenTools` is a separate, uncontested extension** (not a D26 policy question): it also builds via the same paginated `OpenRadial` (12 entries, `WorkspaceUI.js:22-29`) and hits the same capacity-6 clamp — page 1 becomes Save/Restore/Save files/Maps/Items/More…, burying Options/Theme/Display/Commands/Help/Transcript/History. This part is not D26-protected and should use a scrollable list or higher capacity on `pm-mobile` rather than generic radial pagination |
| G18 | Defensive gate (see §3.6 correction): guard against a synthesized `mousedown` from the same touch gesture self-dismissing a radial it just opened — not currently proven as a live failure, but must not regress |
| G19 | `harness/mobile-fullscreen-landscape.js` rewritten so it cannot pass while any `lock('landscape')` call still exists in the shipped code |
| G20 | `manifest.json` orientation is `portrait-primary` (or `any`, per **§13** open question — corrected xref, R1); Android Activity stays unlocked |
| G21 | Any `[MORE]`/char-input prompt has a visible tap target on portrait — does not silently require a physical keyboard. **Extended (Grok final pass, R5):** when no `.Input.LineInput` is visible (`Parchmap.js:60-61`'s `has-line-input` toggle; `WorkspaceUI.Command` already refuses save/restore without it), the new ➤ and mic controls must be hidden or disabled, not left as a silent no-op; the existing `MorePrompt` element (`Parchmap.css:1457`, `position:absolute`) needs its own mobile-sized tap target |
| G22 | `.pm-act` has `user-select:none` (or equivalent touch-action) so native text selection cannot cancel a long-press via `touchcancel`. **Correction (Grok 4th pass):** prefer a *press-scoped* suppression (applied only while a long-press timer is pending, removed after) over a permanent `user-select:none` on all `.pm-act` — a permanent rule silently blocks the user from ever copying noun-bearing story text, which is a real regression in its own right, not a free fix |
| G23 | D88 Stage 6 semantic-cutover flag stays default-off; none of these mobile changes require flipping it, and parity holds if it's later turned on |
| G24 | Desktop `layout-regression`/`ui-regression` green (same as G8) **and** desktop `.Input.LineInput` remains hittable — the stacking fix must not regress desktop, which is currently correct |
| G25 | Every live `#control-panel` control is enumerated and checked off as reachable via the mobile Tools/Options path — audited, not assumed. **Enumeration aid (Grok final pass, R9):** Import/Export is already `ParchmapQol.ShowSaveManager` (`Parchmap.js:127`), the same handler as Tools' "Save files" — not a separately-missing function. Map Animations/Show help/Assume 2-way are `WorkspaceUI.ShowOptions` (`WorkspaceUI.js:70-76`). The game-menu radial is a fixed 6 items with no pagination (`OpenGameMenu`, `Qol.js:52`) |
| G26 | (Grok final pass, R4) `isCompact()` is `(max-width:900) OR (max-height:520) OR (pointer:coarse)` (`MobileLayout.js:10-16`) — a touchscreen desktop/laptop at the 1400×900 layout-regression viewport matches `pointer:coarse` and would incorrectly get `body.pm-mobile` (stacking rules, sheets, Tools-visible, rotate-hint). Mobile chrome must not activate at desktop-regression viewports; recommend deriving the *layout* class from width/height only, with `pointer:coarse` allowed to separately enable touch handlers without switching the whole shell |
| G27 | (Grok final pass, R6) `body.pm-mobile.pm-keyboard-open` already sets `#tools-toggle`/`#game-menu` to `pointer-events:none` (`Parchmap.css:2627-2632`) while the keyboard is open — acceptable only because submit/mic live on the input row itself, not on those FABs; verify this still holds once the row gains its two new buttons |
| G28 | (Grok final pass, R7) Mic and ➤ each meet a minimum 44×44px touch target, matching the existing Tools/Menu minimums (`min-height:44`/`min-width:48`, `Parchmap.css:2575-2576`) |
| G29 | (Grok 4th pass) `service-worker.js`'s `CACHE_VERSION` (currently `parchmap-shell-v1`) must be bumped when the orientation/manifest changes ship — `APP_SHELL` includes `manifest.json` itself, so an already-installed PWA will keep serving the cached landscape manifest indefinitely without a version bump |
| G30 | (Grok 4th pass) `capacitor.config.json`'s `webDir` changed to a repo-relative path (distinct from G26's `isCompact` leak — this is the packaging path, not the layout predicate); any G6 APK evidence must come from a fresh `build-android.bat`/`make-dist.bat` run, not a stale `Parchmap-dist` folder (the `android/` project's own copy of `MobileLayout.js` will still contain the old `lock('landscape')` until it's rebuilt — expected, not a separate bug) |
| G31 | The live APK's actual `windowSoftInputMode` is confirmed (currently the AppCompat/splash default `stateUnspecified\|adjustPan`, not `adjustResize` as earlier drafts implied) and a deliberate keep-`adjustPan`-vs-switch-to-`adjustResize` decision is made and proven not to double-count against the `visualViewport` inset on a **real APK**, not just the PWA (§6.5) |
| G32 | Glk's own dialog markup (`#dialog_screen`/`#dialog_frame`/`#dialog`, appended into `#windowport` by `lib/main.js` — the native Save/Restore file pickers) is confirmed tappable via `elementFromPoint`, not just the line input — the stacking bug plausibly affects these too and G4 (save/restore flow) must prove it either way |
| G33 | The stacking fix uses `#parchment{pointer-events:none}` (preferred, smallest change) rather than relocating Glk-owned input markup out of `#windowport`'s DOM (last resort only, risks breaking Glkote's own update/focus logic) |
| G34 | Glk `CharInput` prompts (Y/N, menus, "press any key") — distinct from `[MORE]`/no-LineInput, which G21 covers — either get an explicit visible tap target on portrait, or are explicitly written into §2 Non-goals as a known v1 gap; the plan may not silently claim "full functionality" while leaving keyboard-only char-input on a device with no hardware keyboard |
| G35 | The new mic/➤ buttons (44×44 minimum, G28) do not visually collide with the existing Tools/Menu FABs — live geometry shows only a ~4px gap between the FAB row (`bottom:calc(58px+kb+safe)`) and the input row (`bottom:calc(10px+kb+safe)`) today; this must be explicitly checked once the input row gets taller/wider, not assumed to fit |
| G36 | The D88 single-choke-point invariant (D86) is proven, not just stated: ➤ calls `Input.Inject(text, true)` / `Actionable.Submit` — never a second, parallel submission path; the input-line touch radial reuses the existing `GetRadialCommands`/`ShowRadialMenu` machinery, not a new command list; mic only ever inserts text, never auto-submits or resolves commands itself; D88 Stage 6 cutover stays default-off throughout (G23) |
| G37 | Capacitor's Android hardware back button, while a sheet/radial/Message dialog is open, dismisses that UI rather than exiting the app (APK-only; no PWA equivalent) |
| G38 | Once G9 is fixed, a real Android IME's Enter key submits the line on both Chrome (PWA) and the Capacitor WebView (APK) — `ARCHITECTURE_UML.md:837-842`'s "virtual-keyboard Enter" requirement; ➤ is an additive convenience, not a substitute for this |
| G39 | (Grok 5th pass) ➤ submits via `Input.Inject("", true)` specifically — appending nothing, only firing the submit keypress — never `Inject(currentValue, true)`, which would duplicate the typed command (see §7's critical correctness note) |
| G40 | (Grok 5th pass) The chosen stacking fix (G9/G12/G33) restores hit-testing for **every** Glk-owned element inside `#windowport`, not just the line input — `.pm-act` marks, `.MorePrompt`, `CharInput`, and the native dialog (G32) all sit in the same subtree and are all affected by the same bug. A fix that only targets the input specifically (rather than neutralizing `#parchment`'s hit-testing or restacking it below `#windowport` generally) would pass G9 while still leaving G11/G21/G32 broken |
| G41 | (Grok 5th pass) After the stacking fix ships, the story buffer is still touch-scrollable and still auto-follows new output — `Parchmap.ScrollToBottom` (`Parchmap.js:203-214`) currently targets `#parchment .simplebar-content-wrapper`; if `#parchment` becomes `pointer-events:none`, `#windowport .BufferWindow` itself must remain finger-scrollable and the auto-scroll-to-bottom behavior must be re-verified against whichever element ends up actually scrollable |
| G42 | (Grok 5th pass) Live geometry check, not assumption: at 360×740 the proposed input-row buttons and the existing FABs (`#tools-toggle`/`#game-menu`, `bottom:calc(58px+kb+safe)`) may **occlude**, not just crowd, given the input row sits at `bottom:calc(10px+kb+safe)` — resolve via relocating the FABs or an explicit gutter, with a real-viewport check, not a diagram assumption |
| G43 | (Grok 5th pass) Mobile radial buttons (`.radial-command` min-height 32px, `#radial-menu` button 36px — `Parchmap.css:2119,2234`) are raised to the 44px touch-target minimum used elsewhere, or the exception is explicitly documented as intentional |
| G44 | (Grok 5th pass) The native Glk dialog (`#dialog`, `width:400px`, `margin-top:100px`) is confirmed usable at 360×740 portrait — it currently overflows a viewport that narrow independent of the stacking fix, and `.MorePrompt` (`padding:2px 6px; opacity:.5; position:absolute`) needs an actual mobile size spec, not just a tap-target mention (G21) |

---

## 13. Open questions for the operator (flag, don't guess)

1. Does the fullscreen-on-first-gesture *request* stay (with the orientation **lock** removed, i.e. fullscreen but still portrait-shaped), or should mobile just run in the browser's normal chrome with no fullscreen request at all? Both are consistent with "delete the landscape lock" — this is a separate, smaller call. **Grok's recommendation:** delete the whole first-gesture fullscreen chain for v1 — the PWA manifest already requests `display:fullscreen`, the Capacitor WebView is already its own app chrome, and a JS `requestFullscreen()` on first tap is redundant for the APK while being the direct cause of §3.2's layout jump.
2. `manifest.json` orientation: `"portrait-primary"` (locks portrait, blocks landscape entirely) vs `"any"` (no lock, user can freely rotate, we just don't design for it in v1)? Recommend `"portrait-primary"` for the installed PWA/APK since landscape layout isn't in scope for v1; an in-browser-tab visit could reasonably stay `"any"` as a separate, lower-stakes call — but this is the operator's decision.
3. Exact STT plugin (Capacitor community package vs. alternative) — recommend deciding at implementation time via a live APK probe rather than now, since it's a live-environment question, not a design one.
4. **(Grok 5th pass)** Input radial policy on phones: keep D26's chrome-prefix (undo/save/restore/map/history/transcript first) and accept Look/Inventory/Wait are one "More…" tap away, **or** carve a compact-only exception to D26's ranking, **or** raise the phone radial's page capacity above 6. This plan does not decide this unilaterally since it touches an existing, intentional design decision (D26) — operator call.
5. **(Grok 5th pass)** Input-row-vs-FAB layout at narrow viewports (G42): relocate the existing Tools/Menu FABs, or gutter the new input row around them — a smaller implementation-detail call, noted here so it isn't silently decided mid-implementation.

---

Non-blocking notes (Grok, do not block operator review, address at implementation time):
- The existing landscape-only CSS at `Parchmap.css:2615-2625` does not need to be deleted for v1 — it can remain as a harmless leftover for a user who physically rotates the device, since landscape is merely unlocked, not actively redesigned, in this plan.
- `WorkspaceUI.ShowHelp`'s in-game help text currently tells the player to type `/tools` and right-click the input for its radial — both become false once G13/G14 ship, and must be updated at implementation time.
- `#autocomplete` is already a later DOM sibling at the same `z-index:3` as mobile `#parchment` (`Parchmap.css:385-392`, `play.html:175`), so it likely already beats `#parchment` by sibling order today — but G12 should still give it an explicit higher z-index rather than depending on DOM order surviving future edits.

## 14. Collaboration status

| Seat | Contribution |
|---|---|
| **Claude** (architect, baton) | This document; original F1-F4/R1-R2 findings (#541); plan structure and gate synthesis |
| **Grok** (live adversarial co-auditor) | Four successive audit passes (§3's L1-L9 findings; R1-R10 correcting §3.6(b)/G16/xrefs/G17/adding G26-G28; and a 4th pass adding G29-G38 covering service-worker cache versioning, real APK keyboard mode, Glk dialog stacking exposure, CharInput coverage, FAB/input-row layout collision, the D88 choke-point invariant, and Android back-button behavior), plus the two reversed decisions in §4/§11 |
| ~~Codex~~ | Not live this task (confirmed by operator, out of usage credits); an earlier draft credited it, but that draft came from a stale, unauthorized process and has been superseded by this version |
| **Operator** | Final review before any `PRODUCTION_PLAN.md` / `ARCHITECTURE_UML.md` commit or implementation |

**Status: FULLY IMPLEMENTED, 2026-09-20 (operator authorized, then operator directive: "Nothing should be deferred I want everything completed").** See `PRODUCTION_PLAN.md`'s D93 entry (including its closure-round addendum) and `ARCHITECTURE_UML.md` §30 for the full implementation record and live verification evidence. Every gate in this document, plus every item Grok's post-implementation code audit raised, is closed: the stacking-context fix, orientation deletion, Tools reachability (both the always-visible FAB and the mobile scrollable-list rendering replacing pagination), long-press hardening, the submit/mic input row (mic now has a real native-APK path via `@capacitor-community/speech-recognition`, not just the browser API), the input-line radial's mobile touch path (long-press on the submit button), the repo-relative Capacitor `webDir`, the APK's `windowSoftInputMode`, Glk `CharInput` mobile support, and the Android hardware back button (`@capacitor/app`) are all implemented and live-verified. The one remaining item from §13 was a genuine operator decision, not an implementation gap, and was resolved: Q4 (input-radial pagination) -- D26's chrome-prefix stays as designed for the input radial specifically; only the Tools radial (never D26-protected) got the scrollable-list treatment. A pre-existing, unrelated `tools/ui-regression.js` failure (`.Input.LineInput` absent from the DOM after a specific save/restore/inventory sequence -- Glk's own rendering, not CSS/JS) was found, isolated, and proven not caused by this work; it remains open as its own, separate issue.
