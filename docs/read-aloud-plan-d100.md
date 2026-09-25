# D100 — Read aloud (automatic TTS for new story text)

**Status:** READY FOR IMPLEMENTATION after self-audit amendments (below §12)  
**Owner (implementation):** Codex (or assigned seat)  
**Review:** Grok adversarial after impl  
**Depends on:** D99 identity/prefs patterns; does **not** reopen D94 cell metrics or D98 Module Manager  
**Non-goals:** On-screen floating TTS button; forcing Android TalkBack; reading the entire scrollback every turn; uploading audio/text to a network service  
**Self-audit:** 2026-09-21 Grok — see §12. Blockers B1–B4 folded into this document.

---

## 1. Operator requirements (verbatim intent)

1. Hook platform **read-aloud / text-to-speech** so the app can speak story output.
2. User turns the feature **on or off** from **Settings / Options only** — **no** dedicated on-screen chrome button (no FAB, no input-row control, no Menu radial entry solely for TTS).
3. **Default: ON.**
4. **Default scope: only new text** (not full history on enable, not re-reading old buffer lines).
5. Automatic: when enabled, **new** popup / window text is spoken without a per-turn tap.

---

## 2. Product behavior

### 2.1 What gets spoken (default)

| Source | Default | Notes |
|--------|---------|--------|
| New **buffer** (main story) text from Glk updates | **Yes** | Primary path |
| New **grid** / status-line text | **No** (default) | Optional later; often noisy (score, turns) |
| In-app **Message** dialogs (Help, Options, About, errors, Module Manager copy) | **No** (default) | Optional pref; dialogs are UI not story |
| Radial menu labels / Tools | **Never** | Chrome |
| User-typed command line | **Never** | Input, not output |
| Map room names / notes UI | **Never** (v1) | Out of scope |

**“New text” definition:** plain text added to the story buffer since the last watermark.

**Cold start vs mid-game enable (mandatory — fixes audit B1):**

| Situation | Watermark policy | Speak? |
|-----------|------------------|--------|
| Fresh play session, buffer still empty | `lastPlain = ""`, observer on | **Yes** — first painted story text (opening quote, etc.) is “new” |
| User **enables** Read aloud mid-game (was off) | Set `lastPlain = normalize(buffer now)` **silently** | **No** backlog dump; only text after enable |
| User **disables** | `stop()`; keep observing or detach | Silence |
| Restart / restore / new story / buffer rebuild | Reset watermark to new buffer text **silently** | **No** full dump |

Do **not** initialize watermark to “current end” on an already-filled buffer at first boot if that would skip the opening text the user expects (M1).

### 2.2 Settings UI (Options only)

Extend **Menu → Options** (`WorkspaceUI.ShowOptions`), same checkbox pattern as Map animation / Hold mic to talk.

**v1 controls (required):**

| Control | Pref key | Default | UI label (exact) |
|---------|----------|---------|------------------|
| Master enable | `ReadAloud` | `true` | **Read aloud new story text** |
| Stop current utterance | (action) | — | Button: **Stop speaking** (only useful while speaking; still Settings-only, not chrome) |

**v1 controls (recommended, still Settings-only):**

| Control | Pref key | Default | UI label |
|---------|----------|---------|----------|
| Include status line | `ReadAloudStatus` | `false` | **Also read status line** |
| Include app dialogs | `ReadAloudDialogs` | `false` | **Also read app dialogs** |
| Rate | `ReadAloudRate` | `1.0` | **Speech rate** (− / value / +) range 0.7–1.4 |

No voice picker required in v1 (use system default voice). Optional v1.1: language/voice if Capacitor exposes it without clutter.

**Explicitly forbidden UI:**

- Mic-adjacent or input-row TTS button  
- Persistent “speaker” FAB  
- Menu radial top-level “Read aloud” action (toggle lives in Options)

### 2.3 Runtime behavior

1. On each **story buffer append** (after Glk update settles): if `ReadAloud === true`, extract **delta** plain text → normalize → enqueue speak.
2. **Interrupt policy:** new story delta **cancels** the current utterance and starts the new one (keeps pace with the game). Optional later: queue mode pref; v1 = interrupt.
3. **Stop speaking** in Options (and auto-stop on: Exit game, story unload, Options uncheck, app background if platform requires).
4. **Empty / whitespace-only** deltas: skip.
5. **Dedup:** if delta equals last spoken string within 300 ms, skip (guards double-fire from dual update paths).
6. **Permission:** Android TTS normally needs **no** mic permission and usually **no** special runtime prompt; if engine missing, fail soft (see §6).
7. **Privacy:** all synthesis is **on-device** (system TTS or Web Speech). No network TTS services. Document in PRIVACY.md one line.

### 2.4 Platforms

| Platform | Engine (priority order) |
|----------|-------------------------|
| Android (Capacitor) | Native **TextToSpeech** via Capacitor plugin (preferred) |
| Desktop browser / PWA | `window.speechSynthesis` |
| iOS (if/when shipped) | Same plugin or `AVSpeechSynthesizer` path in plugin |
| Unsupported | Pref still visible; enabling no-ops with one-line note under checkbox: “Speech not available on this device.” |

---

## 3. Architecture

### 3.1 New module: `js/ReadAloud.js`

Single owner for TTS (mirrors `Input.Mic` cohesion without touching mic code).

```
ReadAloud
  init()                    // after Global.LoadPrefs; bind nothing on-screen
  applyPrefs()              // enable/disable engine
  onStoryDelta(plainText)   // from buffer observer
  onDialog?(plainText)      // if ReadAloudDialogs
  stop()
  speak(text)
  isSupported()
  getWatermark / setWatermark
```

Load from `play.html` (and dist allow-list) after `Global.js`, before game tick consumers.

### 3.2 Prefs (`Global.Prefs` / `PL_Prefs`)

```js
ReadAloud: true,           // default ON
ReadAloudStatus: false,
ReadAloudDialogs: false,
ReadAloudRate: 1.0
```

Migration: missing keys → defaults above (`Object.assign` already merges defaults over saved prefs carefully: **defaults must win for new keys** — current `Object.assign({}, Global.Prefs, prefs)` means **saved prefs override defaults**. For brand-new keys absent from old saves, defaults apply. Good.)

Users who had old prefs JSON without `ReadAloud` get **ON** automatically.

### 3.3 Capturing “new” buffer text

**Chosen approach (v1): MutationObserver on buffer window(s) + watermark.**  
Primary signal: **added DOM nodes** (and characterData in those nodes). Full `innerText` diff is a **fallback** only when addedNodes yield nothing but text grew.

Why:

- Does not require forking minified GlkOte.
- Works for ZVM and Quixe paths that both render into buffer DOM.
- Aligns with “new text only.”
- Survives Glk **scrollback trim** (top lines removed) better than naive `startsWith` alone (audit B2).

**Targets:** all `#windowport .BufferWindow` elements (some stories use more than one). Maintain a weak map of watermark per element, or one watermark on concatenated main-buffer text if only one content buffer is active. Ignore `.Input.LineInput` / `.Input.CharInput` nodes inside the buffer.

Algorithm:

1. After splash dismissed and play shell ready: if buffer empty → `lastPlain = ""`; if user just turned feature on with existing text → silent seed (table above).
2. `MutationObserver` on each buffer root: `childList`, `characterData`, `subtree`. Re-attach if Glk replaces the window node (observe `#windowport` for added `.BufferWindow`).
3. Debounce 50–120 ms.
4. **Preferred delta:** concatenate `normalize(text)` from `mutation.addedNodes` (elements and text nodes) that lie under a BufferWindow and are not input chrome. If non-empty → speak.
5. **Fallback delta:** `now = normalize(buffer.innerText)` (excluding input fields if easily filtered).
   - If `now.startsWith(lastPlain)` → `delta = now.slice(lastPlain.length)`.
   - Else if `lastPlain.startsWith(now)` → scrollback trim only → `lastPlain = now`, **no speak**.
   - Else if length dropped a lot or similarity low → treat as **rebuild** → silent `lastPlain = now`.
   - Else longest-common-prefix slice if `now.length > lastPlain.length`.
6. Update watermark; if delta meaningful → `onStoryDelta(delta)`.

**normalize():** collapse `\r`, strip ZW chars, trim trailing spaces per line, keep newlines as pauses; if entire delta is only a bare `>` prompt line, skip.

**Glk “more” pagination:** counts as new buffer text when the next chunk appears — desired.

### 3.4 Status line (optional pref)

If `ReadAloudStatus`: observe `#windowport .GridWindow` with a **replace** model (speak only when normalized grid text **changes**, not append), rate-limited to 1 speak / 1.5 s.

### 3.5 Dialogs (optional pref)

If `ReadAloudDialogs`: wrap or hook `Message.Show(title, body)` to speak `title + ". " + stripHtml(body)` once per show. Never speak Options panel repeatedly on each checkbox click (only on open).

### 3.6 Native bridge

**Preferred plugin:** evaluate `@capacitor-community/text-to-speech` (or current maintained Capacitor 8–compatible TTS plugin) at implement time; pin version next to `@capacitor-community/speech-recognition`.

API shape (adapter hides plugin):

```js
await ReadAloud.engine.speak({ text, rate })
await ReadAloud.engine.stop()
await ReadAloud.engine.isAvailable()
```

Web fallback:

```js
const u = new SpeechSynthesisUtterance(text);
u.rate = rate;
speechSynthesis.cancel();
speechSynthesis.speak(u);
```

**User-gesture / autoplay (audit B3):** Some desktop browsers block `speechSynthesis` until a user gesture. Mitigation (required):

1. Android Capacitor native TTS is the **authoritative** path in the APK (no gesture issue in normal use).
2. On web: call a no-op `speechSynthesis.resume()` / warm-up on the first **existing** user gesture already required to play (splash Continue, first tap, or opening Options) — do **not** add a new TTS button. If speak fails with a “not allowed” class error, set soft flag and show Options subtitle once: “Tap anywhere once to allow speech” is **forbidden** as chrome; instead rely on splash/Options gesture warm-up only, then fail soft.

**Phase 0 plugin gate (audit B4):** Before Phase 1 merge, name and pin a Capacitor 8–compatible TTS package in `package.json` (candidate: `@capacitor-community/text-to-speech` if it supports current Capacitor; otherwise first maintained fork that builds). Spike must prove: speak + stop on dev APK, **zero** new `INTERNET` permission, no `RECORD_AUDIO` coupling.

**Do not** add RECORD_AUDIO or INTERNET for TTS.

### 3.7 Interaction with existing features

| Feature | Rule |
|---------|------|
| Mic / STT (D95) | Independent. Speaking output must not open the mic. If both active, TTS plays while user is not holding mic; optional: `stop()` TTS when mic press starts (v1 **yes** — avoid feedback loops on loud devices). |
| Display font / D94 | **No CSS or cell changes.** ReadAloud never touches CharCell or font metrics. |
| Splash | No TTS during splash. Init observer after story buffer exists. |
| Module Manager | Local only; no speak of file paths/hashes unless dialogs pref on. |

---

## 4. Implementation phases

### Phase 0 — Spike (½ day)

- Confirm Capacitor TTS plugin works on a debug APK with a hard-coded sentence.
- Confirm `speechSynthesis` on desktop Chrome for play.html.
- Document any manifest permission delta (must stay INTERNET-free).

### Phase 1 — Core path (1–2 days)

- `Global.Prefs` keys + Options checkboxes + Stop speaking.
- `js/ReadAloud.js` + play.html script tag + make-dist js allow-list.
- Buffer MutationObserver + watermark + interrupt speak.
- Mic-press stops TTS.
- Web + Android engines behind one adapter.

### Phase 2 — Hardening (1 day)

- Story change / restore / restart silent reset.
- Debounce, dedup, empty delta.
- Background/pause: stop on `visibilitychange` hidden (mobile courtesy).
- Soft failure UI under Options if unsupported.

### Phase 3 — Optional prefs (½–1 day)

- Status line + dialogs toggles.
- Rate control.

### Phase 4 — Proof (½–1 day)

- Harness + manual matrix (§5).
- PRIVACY.md / USER_GUIDE.md one paragraph each.
- `PRODUCTION_PLAN.md` decision log D100 implemented evidence.
- Rebuild dist + dev APK.

---

## 5. Acceptance tests

### 5.1 Automated (new `harness/d100-read-aloud.js`)

Use Playwright + mocked `speechSynthesis` (and stub Capacitor plugin if present):

1. Default pref `ReadAloud === true` on fresh storage.
2. With mock engine, injecting buffer text A then B speaks only delta B (not A+B concatenation re-read).
3. Toggling off prevents further speak calls.
4. Buffer replace (simulate restart) does not speak full backlog.
5. No `#pl-read-aloud` / FAB / input-row speaker control exists in DOM.
6. Options contains checkbox labeled **Read aloud new story text**.
7. Mic press path calls `stop` (unit with stub).

### 5.2 Manual matrix

| # | Case | Expect |
|---|------|--------|
| M1 | Fresh install, Anchorhead boot | Opening quote / title spoken as it appears (new only); no double full dump on second update |
| M2 | Options → uncheck Read aloud | Silence on further turns |
| M3 | Re-check mid-game | No backlog dump; next turn spoken |
| M4 | Desktop Chrome | Web Speech works or soft “not available” |
| M5 | Android dev APK | System voice speaks; no new INTERNET permission |
| M6 | Rapid turns | Interrupt; latest text wins |
| M7 | Hold mic while TTS | TTS stops on press |
| M8 | No on-screen TTS button in play chrome | Visual confirm |

---

## 6. Failure modes

| Failure | Behavior |
|---------|----------|
| No TTS engine | Checkbox works; subtitle “Speech not available on this device”; no throw |
| Engine busy / error | Log once; drop utterance; do not brick input |
| Huge delta (> 4k chars) | Speak first 4k + stop (or split sentences up to cap) |
| User disables mid-utterance | `stop()` immediately |
| TalkBack also on | App TTS may double-speak with TalkBack — document: prefer one; v1 no auto-detect |

---

## 7. Files to touch (implementation claim set)

| File | Change |
|------|--------|
| `js/ReadAloud.js` | **New** module |
| `js/Global.js` | Pref defaults |
| `js/WorkspaceUI.js` | Options UI |
| `js/Input.js` | Mic press → `ReadAloud.stop()` only |
| `play.html` | Script include **after `Global.js`, before `Input.js`** (mic can call stop) |
| `make-dist.bat` | `*.js` robocopy already copies new files; no special case unless XF list grows |
| `package.json` / Capacitor | TTS plugin pin + `cap sync` / android copy |
| `PRIVACY.md` / `USER_GUIDE.md` | Short notes |
| `harness/d100-read-aloud.js` | **New** tests |
| `PRODUCTION_PLAN.md` / `ARCHITECTURE_UML.md` | D100 decision + small sequence diagram |
| `service-worker.js` | Bump `CACHE_VERSION` **and** add `js/ReadAloud.js` to explicit `APP_SHELL` array (shell is not a glob) |

**Do not touch:** `css/CharCell.css` font metrics, Emglken stacks, ModuleLibrary format rules, Android INTERNET.

---

## 8. Settings copy (final)

Under **Game options**:

```
☑ Read aloud new story text
☐ Also read status line
☐ Also read app dialogs
Speech rate: [ − ] 1.0 [ + ]
[ Stop speaking ]
```

Default = first box checked, others unchecked, rate 1.0.

---

## 9. Decision summary

| ID | Decision |
|----|----------|
| Q1 | Settings/Options only; no chrome button |
| Q2 | Default **ON** |
| Q3 | Default **new buffer text only** |
| Q4 | Interrupt on newer text |
| Q5 | Mic press stops TTS |
| Q6 | On-device TTS only; no network voice API |
| Q7 | No D94/CSS metric changes |
| Q8 | Status/dialogs off by default, optional |

---

## 10. Open operator confirmations (non-blocking defaults above)

1. Confirm **default ON** is desired even in public spaces (can still uncheck once).  
2. Confirm **interrupt** (not queue) for multi-paragraph dumps.  
3. Confirm status/dialogs stay **off** unless user opts in.

---

## 11. Done when

- Options exposes the controls in §8 with defaults in §2.  
- New story buffer text auto-speaks on Android + desktop when supported.  
- No on-screen TTS button anywhere in play chrome.  
- `harness/d100-read-aloud.js` green; M1–M8 manual notes recorded.  
- Privacy/user guide updated; dist/APK rebuilt; INTERNET still absent.  
- Cold-start speaks opening text; mid-game enable does not dump backlog (§2.1 table).  
- `js/ReadAloud.js` listed in `service-worker.js` `APP_SHELL` + cache bump.

---

## 12. Self-audit (Grok, 2026-09-21)

Adversarial review of this plan against live tree (`play.html`, `WorkspaceUI.ShowOptions`, `Global.Prefs`/`PL_Prefs`, `Input.Mic`, `make-dist.bat` js `*.js` robocopy, `service-worker.js` APP_SHELL, D99 INTERNET ban, D94/D95).

### Verdict

**CONDITIONAL PASS → PASS after amendments in this revision.** Operator intent is met. Four blockers were real; all are folded above. No architecture reopen of D94/D98/D99.

### What held up

| Item | Evidence |
|------|----------|
| Options-only, no chrome button | Matches Menu → **Options** (`ShowOptions`); no FAB in forbidden list |
| Default ON + new text only | Pref defaults + watermark table |
| On-device, no network TTS | Aligns D99 no-INTERNET |
| Mic stop coupling | Clear; `Input.js` already owns press path |
| make-dist | `robocopy js *.js` already ships new modules |
| Non-goals | TalkBack / full dump / network correctly excluded |

### Blockers found and resolved in-doc

| ID | Severity | Issue | Resolution |
|----|----------|-------|------------|
| **B1** | **HIGH** | Cold-start text said both “watermark = current end” (skips opening) and M1 “speak opening quote” | §2.1 table: empty buffer → speak first paint; mid-game enable → silent seed |
| **B2** | **HIGH** | Pure `innerText` + `startsWith` breaks when Glk trims scrollback or rebuilds buffer | §3.3: prefer **addedNodes** delta; trim/rebuild = silent reset |
| **B3** | **MED** | Desktop `speechSynthesis` often needs a prior user gesture | §3.6: Android native authoritative; web warm-up on existing splash/Options gesture only |
| **B4** | **MED** | Plugin “evaluate later” too vague for Capacitor 8 | Phase 0 must pin package + prove no INTERNET |

### Non-blocking findings (implementer must still honor)

| ID | Severity | Note |
|----|----------|------|
| N1 | LOW | Menu label is **Options**, not “Settings” — UI copy uses Options; operator “settings category” maps here |
| N2 | LOW | Operator “popup” ≈ story window by default; Message dialogs remain **opt-in** (`ReadAloudDialogs`) so Options open does not narrate itself unless enabled |
| N3 | LOW | **Stop speaking** only inside Options is intentional (no chrome); long monologues require opening Options or waiting for interrupt on next turn — document in USER_GUIDE |
| N4 | LOW | Multiple `.BufferWindow` possible — §3.3 now requires handling all / ignoring inputs |
| N5 | LOW | `APP_SHELL` is an explicit list — must add `ReadAloud.js` (not only CACHE_VERSION bump) |
| N6 | LOW | Script order: `ReadAloud.js` after `Global.js`, before `Input.js` so mic can `ReadAloud.stop` |
| N7 | INFO | Default ON in public may surprise — operator-accepted; one-line USER_GUIDE note |
| N8 | INFO | TalkBack double-speak residual stays documented, not auto-fixed |

### Reject rules for implementation review

Reject the PR/impl if it:

- Adds any play-chrome TTS control  
- Speaks full scrollback on enable or on restore  
- Skips opening text on cold start with default ON  
- Adds INTERNET or ties TTS to SpeechRecognition permissions  
- Touches CharCell / play font metrics  
- Omits `ReadAloud.js` from SW `APP_SHELL` while caching play shell  
- Ships without Phase 0 native speak/stop proof on dev APK  

### Residual risks (accepted)

- Some WebViews still weak on web TTS → native path covers APK.  
- Pathological games that rewrite the whole buffer every turn may under- or over-speak → fallback rebuild = silent; monitor in M1/M6.  
- No queue mode in v1 (interrupt only).
