// D117 (docs/directional-radial-plan-d117.md): a small, always-present,
// low-opacity, pulsing handle sits horizontally centered above the input
// row. Press and hold to expand a compass-rose radial of the CURRENT
// room's real known exits (ParchLockMap.GetCurrentRoom().Exits -- the same
// source the map already draws from, so this stays correct for whatever
// the loaded module actually offers); slide across a slice to highlight it
// live, release to submit that direction immediately via Actionable.Submit
// -- the same single choke-point every other tap-a-direction-and-go
// control already uses. No separate Enter/tap-to-confirm step.
//
// Built on Pointer Events (setPointerCapture), not touch-only handlers --
// the same event model ParchLockMap's own map-drag already uses -- so a
// mouse-driven click-hold-drag-release on desktop works identically to a
// real finger on mobile with zero separate code path. A genuine short TAP
// (not a hold) opens the programmable Settings panel instead -- see
// ShowSettings below -- and Ctrl+Alt+D plus arrow-key/Tab cycling and Enter
// is the keyboard-only path (BindKeyboard), for players using neither a
// mouse nor touch.
//
// FULLY IMPLEMENTED: idle pulsing handle; press-and-hold expand; dynamic
// per-room compass rose (only the directions the room actually has, plus
// D63 borrowed-slot support for non-compass/numbered-exit games); live
// slide-to-highlight; release-to-submit; edge-of-screen ring-chasing;
// a real programmable settings UI (add/edit/delete custom "static" slices
// and additional custom rings, per module, persisted in localStorage);
// a keyboard-only open/cycle/submit path; the Options togglable on/off
// preference. Works identically on desktop (mouse) and mobile (touch) --
// one shared implementation, not separate versions.
//
// D118 (docs/dirpad-arrowpad-merge-plan-d118.md): D111's GridWindow-
// CharInput auto arrow pad is merged into this same widget as a second
// render mode ("arrows" -- Up/Left/Enter/Right/Down, discrete tap-per-
// button, never slide-to-select). CharKeys.js keeps 100% of its own
// eligibility/lifecycle state machine (_autoEligible/_autoPadOwned/
// _autoSuppressed/_autoExitTimer, syncAutoPad, autoPadBlocked) --
// openArrowPad/closeArrowPad/isPadOpen/refreshPad now delegate to
// ExpandArrows/collapse/IsArrowModeOpen/SetArrowLive below instead of
// building a second #pl-arrowpad DOM tree. See PRODUCTION_PLAN.md D118 for
// the three merge-time bugs found and fixed, and codex's D117/D118 audits
// (bus #782, #786) for the further blockers/defects fixed after that --
// most recently: a shared playable-story gate (IsStoryPlayable) so the
// handle/keyboard path can't open over a no-story/pre-game screen, a
// stopPropagation fix so the handle's own Enter keydown can't be read a
// second time by the document-level keyboard handler, real keyboard
// (Enter/Space) activation for arrow-mode buttons (previously pointerdown-
// only), and routing forceReset() through CharKeys' own close/reset API in
// arrows mode instead of bypassing its ownership bookkeeping.
var DirectionalRadial = {

    LongPressMs: 420,
    MoveCancelPx: 12,

    // Angle in degrees (0 = east, increasing clockwise, matching
    // Math.atan2's screen-space convention used throughout this file).
    // ring 0 = the main compass ring; ring 1 = an outer ring for Up/Down/
    // In/Out (radius-separated from ring 0, not a tight angle -- see the
    // overlap self-audit below); ring 2+ are entirely player-defined
    // (Settings, section 2.5) and never populated by real exits.
    LAYOUT: {
        n:    { label: "N",    angle: -90, ring: 0 },
        ne:   { label: "NE",   angle: -45, ring: 0 },
        e:    { label: "E",    angle: 0,   ring: 0 },
        se:   { label: "SE",   angle: 45,  ring: 0 },
        s:    { label: "S",    angle: 90,  ring: 0 },
        sw:   { label: "SW",   angle: 135, ring: 0 },
        w:    { label: "W",    angle: 180, ring: 0 },
        nw:   { label: "NW",   angle: -135, ring: 0 },
        up:   { label: "Up",   angle: -90, ring: 1 },
        down: { label: "Down", angle: 90,  ring: 1 },
        "in": { label: "In",   angle: 0,   ring: 1 },
        out:  { label: "Out",  angle: 180, ring: 1 }
    },

    // D63: a room's real exit keys are not guaranteed to be compass words
    // (e.g. wump2ka's numbered "exit 1"/"exit 2") -- same principle
    // js/Map.js's own ALL_SLOTS/assignSlot already establishes for the map
    // grid. Any exit key not in LAYOUT above borrows a leftover slot from
    // these lists (ring 0 first, then ring 1) rather than being silently
    // dropped, so a numbered-exit game still gets a usable, non-overlapping
    // radial -- never colliding with a REAL compass/up-down-in-out slice
    // that the same room also has, since claimed angles are excluded first.
    BORROW_SLOTS: {
        0: [-90, -45, 0, 45, 90, 135, 180, -135],
        1: [-90, 0, 90, 180]
    },

    // D118: the merged arrow-pad mode's fixed layout (Up/Left/Right/Down on
    // the main ring, Enter at dead center -- `ring: "center"` is a sentinel
    // expand() special-cases, not a real numbered ring). Entirely separate
    // from the compass LAYOUT table above -- these are never confused with
    // N/E/S/W, and never merged with a room's real exits or custom slices.
    ARROW_LAYOUT: {
        up:    { label: "▲", angle: -90, ring: 0, key: "up" },
        left:  { label: "◀", angle: 180, ring: 0, key: "left" },
        right: { label: "▶", angle: 0,   ring: 0, key: "right" },
        down:  { label: "▼", angle: 90,  ring: 0, key: "down" },
        enter: { label: "⏎", ring: "center", key: "enter" }
    },

    Init: function () {
        if (DirectionalRadial._inited) return;
        DirectionalRadial._inited = true;

        DirectionalRadial.handle = document.createElement("div");
        DirectionalRadial.handle.id = "pl-dirpad-handle";
        // D117 audit fix (codex #782, blocker 8): a real focusable button,
        // not just a div with role="button" and no tabindex/activation --
        // native Tab order, Enter/Space both activate it (OpenKeyboardMode,
        // the same cycling mode Ctrl+Alt+D opens), and the accessible name
        // updates with selection state (aria-live region set in expand()).
        DirectionalRadial.handle.setAttribute("role", "button");
        DirectionalRadial.handle.setAttribute("tabindex", "0");
        DirectionalRadial.handle.setAttribute("aria-label", "Directions -- hold or press Enter for a compass of known exits, tap or Space to configure");
        DirectionalRadial.handle.title = "Hold for directions (Enter), tap to configure (Space)";
        document.body.appendChild(DirectionalRadial.handle);

        // A visually hidden live region announcing the currently-hovered/
        // selected slice, for screen readers -- the visual highlight alone
        // (.is-hovered) has no accessible equivalent otherwise.
        DirectionalRadial.liveRegion = document.createElement("div");
        DirectionalRadial.liveRegion.id = "pl-dirpad-live";
        DirectionalRadial.liveRegion.setAttribute("role", "status");
        DirectionalRadial.liveRegion.setAttribute("aria-live", "polite");
        document.body.appendChild(DirectionalRadial.liveRegion);

        DirectionalRadial.ring = document.createElement("div");
        DirectionalRadial.ring.id = "pl-dirpad-ring";
        DirectionalRadial.ring.hidden = true;
        DirectionalRadial.ring.setAttribute("aria-hidden", "true");
        document.body.appendChild(DirectionalRadial.ring);

        DirectionalRadial.ApplyEnabledState();

        // codex audit (bus #786, blocker 2): re-evaluate playability whenever
        // the story becomes ready or the no-story recovery screen is
        // entered/left. Two narrow, targeted observers matching this file's
        // #windowport MutationObserver precedent (js/ParchLock.js:183) --
        // deliberately NOT one subtree:true observer on the whole body,
        // which would refire on every story-text mutation during ordinary
        // gameplay for no benefit.
        var wpForPlayable = document.getElementById("windowport");
        DirectionalRadial._playableObserver = new MutationObserver(function () { DirectionalRadial.ApplyEnabledState(); });
        if (wpForPlayable) DirectionalRadial._playableObserver.observe(wpForPlayable, { childList: true });
        DirectionalRadial._playableObserver.observe(document.body, { attributes: true, attributeFilter: ["class"] });

        // Live-reported bug: toggling the map fires the class-attribute
        // observer above immediately, but css/ParchLock.css animates
        // #windowport's width over a real 0.3s transition (`transition:
        // width 0.3s`) when map-open changes -- RecenterHandle() ran
        // instantly and measured the PRE-transition (stale) width, so the
        // handle stayed wrong until some unrelated later action happened
        // to re-trigger it after the transition had actually finished.
        // Recentering again on transitionend closes that gap without
        // guessing at the transition's exact duration.
        if (wpForPlayable) wpForPlayable.addEventListener("transitionend", function (e) {
            if (e.propertyName === "width") DirectionalRadial.RecenterHandle();
        });

        DirectionalRadial.handle.addEventListener("pointerdown", DirectionalRadial.onPointerDown);
        // Prevent the OS long-press callout/text-selection from winning the
        // race against the hold timer (same reasoning as Actionable.js's
        // .pl-act long-press and D112's Known-Rooms hold).
        DirectionalRadial.handle.addEventListener("contextmenu", function (e) { e.preventDefault(); });
        DirectionalRadial.handle.addEventListener("keydown", function (e) {
            // codex audit (bus #786, high 3): this Enter keydown bubbles up
            // to BindKeyboard's document-level listener after
            // OpenKeyboardMode() runs and sets _keyboardOpen=true -- WITHOUT
            // guarding against that, the very same keystroke was then read a
            // second time as "Enter while open," submitting the initially-
            // hovered slice (North) in the same instant the ring opened.
            //
            // Self-caught while live-testing this exact fix (own adversarial
            // audit, codex unavailable): an EARLIER version of this fix used
            // an unconditional e.stopPropagation(), which also silently ate
            // every LATER Enter press while focus stays on the handle --
            // and nothing ever moves focus off it, so that is the normal
            // case, not an edge case. That meant Enter could open keyboard
            // mode once but could never submit afterward. Fixed correctly:
            // only intercept the OPENING press (closed -> open); once
            // _keyboardOpen is already true, this handler does nothing at
            // all and lets the event bubble to BindKeyboard's document-level
            // listener, which is what actually submits the highlighted
            // slice on a later, separate Enter.
            if (e.key === "Enter") {
                if (DirectionalRadial._keyboardOpen) return;
                e.preventDefault(); e.stopPropagation();
                DirectionalRadial.OpenKeyboardMode();
            }
            else if (e.key === " " || e.key === "Spacebar") {
                if (DirectionalRadial._keyboardOpen) return;
                e.preventDefault(); e.stopPropagation();
                if (DirectionalRadial.CanOpen()) DirectionalRadial.ShowSettings();
            }
        });

        // D117 audit fix (codex #782, blocker 6): a backgrounded tab/app or
        // a lost pointer capture (OS gesture takeover, etc.) must never
        // leave a stuck timer/open ring behind.
        window.addEventListener("blur", DirectionalRadial.forceReset);
        document.addEventListener("visibilitychange", function () {
            if (document.hidden) DirectionalRadial.forceReset();
        });

        DirectionalRadial.BindKeyboard();

        // Live-reported bug: a window resize alone (no body-class change)
        // never re-ran the desktop centering fix above, so resizing a
        // desktop window (or opening it at a size different from when the
        // page loaded) could leave the handle stuck at a stale horizontal
        // position.
        window.addEventListener("resize", DirectionalRadial.RecenterHandle);
    },

    forceReset: function () {
        if (DirectionalRadial._press) {
            clearTimeout(DirectionalRadial._press.timer);
            DirectionalRadial.releaseCapture(DirectionalRadial._press);
        }
        DirectionalRadial.cleanupListeners();
        DirectionalRadial._press = null;
        // codex audit (bus #786, high 5): arrows mode is CharKeys' pad, and
        // CharKeys owns its own auto-eligibility lifecycle
        // (_autoPadOwned/_autoEligible/_autoExitTimer) layered on top of
        // this shared DOM. Calling DirectionalRadial.collapse() directly
        // here (the prior version) closed the DOM but left that lifecycle
        // state exactly as it was -- a background/foreground cycle during
        // an auto-opened pad left _autoEligible stuck true with the DOM
        // already gone, so the next syncAutoPad() tick saw "already
        // eligible" and never reopened it for the rest of that native
        // menu. Route through CharKeys' own reset/close API (which itself
        // calls DirectionalRadial.collapse() internally) instead of
        // bypassing its bookkeeping.
        if (DirectionalRadial._mode === "arrows" && typeof CharKeys !== "undefined") {
            CharKeys.resetAutoPadState(true);
            CharKeys.closeArrowPad("system");
        } else {
            DirectionalRadial.collapse();
        }
        DirectionalRadial._keyboardOpen = false;
    },

    // Shared by Ctrl+Alt+D (BindKeyboard) and Enter on the focused handle
    // (Init's own keydown listener) -- one real path into the keyboard
    // cycling mode, not two slightly different copies.
    OpenKeyboardMode: function () {
        if (!DirectionalRadial.CanOpen()) return;
        var slices = DirectionalRadial.GetSlices();
        if (!slices.length) return;
        var rect = DirectionalRadial.handle.getBoundingClientRect();
        DirectionalRadial.expand(rect.left + rect.width / 2, rect.top + rect.height / 2, slices);
        DirectionalRadial._keyboardOpen = true;
        DirectionalRadial._hovered = null;
        if (slices[0]) {
            slices[0].el.classList.add("is-hovered");
            DirectionalRadial._hovered = slices[0];
            DirectionalRadial.announce(slices[0]);
        }
    },

    announce: function (slice) {
        if (DirectionalRadial.liveRegion) DirectionalRadial.liveRegion.textContent = slice ? ("Selected: " + slice.label) : "";
    },

    // codex audit (bus #786, blocker 2): reused, not reinvented -- the
    // BufferWindow-text-length signal js/ParchLock.js already uses at
    // lines 86/113 to know a story has actually produced content, plus a
    // GridWindow check so a legitimate native-menu-only screen (no buffer
    // text yet) doesn't get misread as "no story." Real Chromium repro
    // confirmed the no-story recovery screen had handle.hidden=false and
    // was directly hit-testable with nothing underneath to submit to.
    IsStoryPlayable: function () {
        if (document.body.classList.contains("no-story")) return false;
        try {
            if (typeof $ === "undefined") return false;
            return (typeof BufferRevision !== "undefined" ? BufferRevision.text("#windowport .BufferWindow") : $("#windowport .BufferWindow").text()).length > 0 || $("#windowport .GridWindow").length > 0;
        } catch (e) { return false; } // fail closed -- never show the handle over an unknown/unproven state
    },

    // Operator-reported live bug: on a wide desktop window with the map
    // panel open beside the story (a real two-column layout), the CSS rule
    // centering this handle at `left: 50%` centers it on the WHOLE
    // viewport -- which happens to land it near the seam between the story
    // column and the map panel, nowhere near the actual command line it's
    // supposed to sit above. That CSS is only correct on mobile, where the
    // story column IS the whole viewport width; it was never updated for
    // desktop's two-column layout. Fixed the same way this codebase
    // already handles "a real layout value that can't be guessed at build
    // time" (D116's --pl-statusbar-h): measure #windowport's own live
    // horizontal center and position over THAT instead of the viewport,
    // on desktop only -- mobile's own `left: 50% !important` CSS rule is
    // untouched and still wins there (a single-column layout has no seam
    // to get this wrong against).
    RecenterHandle: function () {
        if (!DirectionalRadial.handle) return;
        try {
            var mobile = !!(document.body && document.body.classList.contains("pl-mobile"));
            if (mobile) { DirectionalRadial.handle.style.left = ""; return; } // let the mobile !important rule win
            var wp = document.getElementById("windowport");
            if (!wp) return;
            var rect = wp.getBoundingClientRect();
            if (rect.width > 0) DirectionalRadial.handle.style.left = (rect.left + rect.width / 2) + "px";
        } catch (e) {}
    },

    // Global.Prefs.DirectionalRadialEnabled defaults true (operator
    // decision, D117 plan section 2.1) -- only an explicit false hides it.
    // Also requires IsStoryPlayable() (codex #786 blocker 2): the
    // preference alone was never enough to keep the handle off pre-game
    // screens.
    ApplyEnabledState: function () {
        if (!DirectionalRadial.handle) return;
        var prefOn = typeof Global === "undefined" || Global.Prefs.DirectionalRadialEnabled !== false;
        var playable = DirectionalRadial.IsStoryPlayable();
        var on = prefOn && playable;
        DirectionalRadial.handle.hidden = !on;
        DirectionalRadial.RecenterHandle();

        // D118 follow-up (operator): a real desktop keyboard already has
        // arrow keys, so the on-screen overlay on PC is manual-toggle-only
        // -- Global.Prefs.DesktopArrowPadEnabled, default OFF -- and never
        // driven by CharKeys' native-grid-menu auto-detection (that stays
        // exactly as it was: gated to pl-mobile via
        // Input.ManagesMobileIme()/ParchLockNoGlkAutofocus, never runs on
        // desktop at all, so there is no auto-open to conflict with here).
        // Strictly scoped to !mobile so this can never touch a mobile
        // player's own manually-opened (Tools > Arrow keys) or auto-opened
        // pad.
        try {
            if (typeof CharKeys !== "undefined" && typeof Global !== "undefined") {
                var mobile = !!(document.body && document.body.classList.contains("pl-mobile"));
                if (!mobile) {
                    var wantDesktopArrows = prefOn && playable && Global.Prefs.DesktopArrowPadEnabled === true;
                    if (wantDesktopArrows && !CharKeys.isPadOpen()) CharKeys.openArrowPad();
                    else if (!wantDesktopArrows && CharKeys.isPadOpen()) CharKeys.closeArrowPad();
                }
            }
        } catch (e) {}
    },

    // D117 audit fix (codex #782, blockers 2 and 4): the CSS rules that
    // hide the handle/ring under a dialog/other-radial/map/tutorial only
    // set `visibility:hidden` (so their own show/hide transitions and
    // z-index stacking keep working) -- they never touch the DOM `hidden`
    // property, and the KEYBOARD path (BindKeyboard) never went through
    // CSS/pointer-events at all, so it could open and submit a command
    // while completely invisible behind an open dialog. This is the single
    // real gate every open path (pointer hold-fire, Alt+D, and every
    // keydown while already open) now checks -- mirrors
    // CharKeys.autoPadBlocked()'s own condition list (the established
    // precedent for "what counts as another overlay being up") plus the
    // reverse of D117's own new addition there: blocked while the OTHER
    // (CharKeys) pad is open, so neither can silently operate under/behind
    // the other even though the two are not yet merged into one widget.
    CanOpen: function () {
        if (!DirectionalRadial.IsStoryPlayable()) return false; // codex #786 blocker 2: shared gate, not handle-visibility-only
        if (typeof Message !== "undefined" && Message.IsOpen) return false;
        if (document.querySelector("#dialog, #dialog_frame, #dialog_screen")) return false;
        if (document.body.classList.contains("native-dialog-open")) return false;
        if (document.body.classList.contains("app-dialog-open")) return false;
        if (document.body.classList.contains("radial-open")) return false;
        // Live-reported bug: on desktop, "map-open" means the map panel is
        // showing as a permanent SIDE-BY-SIDE column next to the story --
        // it never covers or blocks the story/command line at all (see the
        // operator's own screenshot). This check was written for mobile's
        // map, a genuine full-screen sheet that DOES cover everything and
        // should legitimately block the handle -- but it fired on desktop
        // too, silently making the handle completely non-functional
        // ("doesn't do anything") any time the map panel happened to be
        // open, which the operator found is apparently the common case.
        // The equivalent CSS visibility rule already gets this right
        // (`body.pl-mobile.map-open #pl-dirpad-handle`, mobile-scoped) --
        // this JS gate just never matched it.
        if (document.body.classList.contains("pl-mobile") && document.body.classList.contains("map-open")) return false;
        // D120: the old MobileTutorial (js/MobileLayout.js) overlay that
        // ran ON TOP of this same page is retired -- the D113 tutorial is
        // now its own separate route (tutorial.html) that never loads this
        // file or CharKeys.js at all (isolation rule; see
        // harness/tutorial-live.js). There is therefore no longer any
        // scenario where "the tutorial is active" and "this widget is
        // trying to open" can even occur in the same page/JS context to
        // guard against -- replacing this with a new always-false flag
        // would be dead code, not real defense-in-depth, so it is removed
        // rather than renamed. If a future tutorial revision ever again
        // runs inline over play.html, this is the line to restore.
        if (typeof CharKeys !== "undefined" && CharKeys.isPadOpen && CharKeys.isPadOpen()) return false;
        return true;
    },

    // --- Per-module custom-slice storage (plan section 2.5) -----------------
    // Same "PL_<Feature>_" + ParchLock.GameFilename keying convention
    // ParchLockMap.Save/Load already established for per-story map data.

    StorageKey: function () {
        return "PL_DirRadial_" + ((typeof ParchLock !== "undefined" && ParchLock.GameFilename) || "");
    },

    learningKeyFor: function (i) { return i && typeof i.filename === "string" && i.filename ? "PL_DirRadial_" + i.filename : null; },

    GetCustomSlices: function () {
        try {
            var raw = typeof LearningStores !== "undefined" ? LearningStores.read(DirectionalRadial.StorageKey()) : localStorage.getItem(DirectionalRadial.StorageKey());
            if (!raw) return [];
            var data = JSON.parse(raw);
            var list = Array.isArray(data.customSlices) ? data.customSlices : [];
            // D117 audit fix (codex #782, blocker 7): a saved record can be
            // corrupted (hand-edited storage, a partial write, a future
            // format change) -- e.g. `customSlices:[null]` crashed
            // GetSlices() downstream with "Cannot read properties of null."
            // Normalize/validate every record here, at the single read
            // choke-point, discarding anything invalid rather than trusting
            // raw storage -- bounded finite numbers, non-empty bounded
            // strings, a stable id (regenerated if missing/wrong type).
            return list.map(DirectionalRadial.NormalizeCustomSlice).filter(Boolean);
        } catch (e) { return []; }
    },

    NormalizeCustomSlice: function (s) {
        if (!s || typeof s !== "object") return null;
        var label = typeof s.label === "string" ? s.label.trim().slice(0, 20) : "";
        var command = typeof s.command === "string" ? s.command.trim().slice(0, 200) : "";
        var angle = Number(s.angle);
        var ring = Number(s.ring);
        if (!label || !command) return null;
        if (!isFinite(angle) || !isFinite(ring) || ring < 0) return null;
        angle = ((Math.round(angle) % 360) + 360) % 360;
        if (angle > 180) angle -= 360;
        ring = Math.round(ring);
        var id = (typeof s.id === "string" && s.id) ? s.id : ("cs" + Date.now().toString(36) + Math.random().toString(36).slice(2, 7));
        return { id: id, label: label, command: command, angle: angle, ring: ring };
    },

    SaveCustomSlices: function (list) {
        try {
            var json = JSON.stringify({ customSlices: list });
            var file = (typeof ParchLock !== "undefined" && ParchLock.GameFilename) || "";
            if (!(typeof LearningStores !== "undefined" && file && LearningStores.persist("dirRadial", { filename: file }, json))) localStorage.setItem(DirectionalRadial.StorageKey(), json);
        } catch (e) {}
    },

    // P13b R2: a module holds at most 64 custom slices; the 65th is refused
    // (returns null) rather than evicting one the player made.
    MAX_CUSTOM_SLICES: 64,
    CUSTOM_LIMIT_MESSAGE: "This story already has 64 custom slices. Delete one before adding another.",
    AddCustomSlice: function (slice) {
        var list = DirectionalRadial.GetCustomSlices();
        if (list.length >= DirectionalRadial.MAX_CUSTOM_SLICES) return null;
        slice = Object.assign({}, slice, { id: "cs" + Date.now().toString(36) + Math.random().toString(36).slice(2, 7) });
        list.push(slice);
        DirectionalRadial.SaveCustomSlices(list);
        return slice;
    },

    UpdateCustomSlice: function (id, patch) {
        var list = DirectionalRadial.GetCustomSlices();
        var idx = -1;
        for (var i = 0; i < list.length; i++) { if (list[i].id === id) { idx = i; break; } }
        if (idx === -1) return false;
        list[idx] = Object.assign({}, list[idx], patch, { id: id });
        DirectionalRadial.SaveCustomSlices(list);
        return true;
    },

    RemoveCustomSlice: function (id) {
        var list = DirectionalRadial.GetCustomSlices().filter(function (s) { return s.id !== id; });
        DirectionalRadial.SaveCustomSlices(list);
    },

    // --- Slice population: dynamic real exits + D63 borrowed slots + custom (static) slices ---

    GetSlices: function () {
        var room = (typeof ParchLockMap !== "undefined" && ParchLockMap.GetCurrentRoom) ? ParchLockMap.GetCurrentRoom() : null;

        // D161 (operator-reported: the hold-and-slide compass "used to pick up
        // all of the different exits ... in the window, down the narrow beach"
        // and no longer does).
        //
        // This read room.Exits, which holds only edges whose DESTINATION room
        // is already known. Every other known direction lives in ExitMeta as a
        // hinted entry -- and D134 moved a whole class into it, because a door
        // stopped qualifying as a destination room, so "in" and "east" through
        // Anchorhead's office door became hinted and silently left the compass.
        // The side exit band never lost them, which is why the same room showed
        // exits around the screen edge but an emptier ring.
        //
        // A hinted direction is still a real, submittable direction -- that is
        // the whole point of D35's honest stub -- so the ring is built from the
        // union. System prop-index keys ("exit-12") stay out: MapTopology
        // deletes them from Exits precisely because they are not vocabulary and
        // the parser rejects them.
        var known = {};
        Object.keys((room && room.Exits) || {}).forEach(function (d) { known[d] = true; });
        Object.keys((room && room.ExitMeta) || {}).forEach(function (d) {
            try {
                if (typeof MapTopology !== "undefined" && MapTopology.isSystemPropExitKey
                    && MapTopology.isSystemPropExitKey(d)) return;
            } catch (e) {}
            known[d] = true;
        });
        var exits = known;
        var cmdFor = function (dir) {
            return (typeof Actionable !== "undefined" && Actionable.commandForExitLabel) ? Actionable.commandForExitLabel(dir) : dir;
        };

        var slices = [];
        var claimed = { 0: {}, 1: {} };
        var unmatched = [];

        Object.keys(exits).forEach(function (dir) {
            var meta = DirectionalRadial.LAYOUT[dir];
            if (meta) {
                slices.push({ dir: dir, label: meta.label, angle: meta.angle, ring: meta.ring, command: cmdFor(dir) });
                claimed[meta.ring][meta.angle] = true;
            } else {
                unmatched.push(dir);
            }
        });

        // D63: borrow leftover ring-0 slots first, then ring-1, for any
        // exit key this game uses that isn't a compass/up-down-in-out word.
        var free0 = DirectionalRadial.BORROW_SLOTS[0].filter(function (a) { return !claimed[0][a]; });
        var free1 = DirectionalRadial.BORROW_SLOTS[1].filter(function (a) { return !claimed[1][a]; });
        unmatched.forEach(function (dir) {
            var angle, ring;
            if (free0.length) { angle = free0.shift(); ring = 0; }
            else if (free1.length) { angle = free1.shift(); ring = 1; }
            else return; // genuinely out of room -- dropped rather than overlapping something real
            slices.push({ dir: dir, label: DirectionalRadial.LabelForBorrowed(dir), angle: angle, ring: ring, command: cmdFor(dir) });
        });

        DirectionalRadial.GetCustomSlices().forEach(function (cs) {
            slices.push({ dir: "custom:" + cs.id, label: cs.label, angle: cs.angle, ring: cs.ring, command: cs.command, custom: true, id: cs.id });
        });

        return slices;
    },

    // A short, legible pill label for a non-compass exit key ("exit 1" ->
    // "E1"), since the raw key can be arbitrarily long text.
    LabelForBorrowed: function (dir) {
        var s = String(dir);
        var digits = s.match(/(\d+)/);
        var letter = (s.replace(/[^a-zA-Z]/g, "").charAt(0) || "X").toUpperCase();
        return digits ? (letter + digits[1]) : s.slice(0, 3).toUpperCase();
    },

    // --- Pointer gesture: hold+drag+release (radial) vs. short tap (settings) ---

    onPointerDown: function (e) {
        if (typeof e.button === "number" && e.button !== 0) return;
        // Ignore a second concurrent pointer entirely -- only one gesture
        // may be tracked at a time (D117 audit fix, codex #782 blocker 6).
        if (DirectionalRadial._press) return;
        var state = { el: DirectionalRadial.handle, startX: e.clientX, startY: e.clientY, fired: false, pointerId: e.pointerId };
        DirectionalRadial._press = state;
        Actionable.beginHoldSelection(state);

        // D117 audit fix (codex #782, blocker 6): capture the pointer
        // immediately, not deferred until the hold timer fires. The
        // handle's real hit target is small (~20-44px) -- a finger can
        // easily drift off it within the 420ms pre-fire window, and
        // WITHOUT capture, move/up events for an uncaptured pointer are
        // hit-tested normally and would never reach these listeners at
        // all once the finger leaves the element, leaving the timer/state
        // alive with nothing to clean it up (reproduced live: a same-
        // pointerId release outside the handle before firing evaded every
        // handler here). Capturing at down guarantees every subsequent
        // event for this exact pointerId is delivered here regardless of
        // where it physically moves.
        try { DirectionalRadial.handle.setPointerCapture(e.pointerId); } catch (err) {}

        state.timer = setTimeout(function () {
            if (DirectionalRadial._press !== state) return;
            if (!DirectionalRadial.CanOpen()) { Actionable.endHoldSelection(state); DirectionalRadial._press = null; DirectionalRadial.releaseCapture(state); return; } // an overlay opened mid-hold
            var slices = DirectionalRadial.GetSlices();
            if (!slices.length) { Actionable.endHoldSelection(state); DirectionalRadial._press = null; DirectionalRadial.releaseCapture(state); return; } // nothing to show -- no-op
            state.fired = true;
            Actionable.fireHoldSelection(state);
            DirectionalRadial.handle.classList.add("pl-press-pending");
            DirectionalRadial.expand(state.startX, state.startY, slices);
        }, DirectionalRadial.LongPressMs);

        DirectionalRadial.handle.addEventListener("pointermove", DirectionalRadial.onPointerMove);
        DirectionalRadial.handle.addEventListener("pointerup", DirectionalRadial.onPointerUp);
        DirectionalRadial.handle.addEventListener("pointercancel", DirectionalRadial.onPointerCancel);
        DirectionalRadial.handle.addEventListener("lostpointercapture", DirectionalRadial.onPointerCancel);
    },

    releaseCapture: function (state) {
        try { DirectionalRadial.handle.releasePointerCapture(state.pointerId); } catch (e) {}
    },

    onPointerMove: function (e) {
        var state = DirectionalRadial._press;
        if (!state || e.pointerId !== state.pointerId) return;
        if (!state.fired) {
            var dx = e.clientX - state.startX, dy = e.clientY - state.startY;
            if ((dx * dx + dy * dy) > (DirectionalRadial.MoveCancelPx * DirectionalRadial.MoveCancelPx)) {
                clearTimeout(state.timer);
                DirectionalRadial.cleanupListeners();
                DirectionalRadial._press = null;
            }
            return;
        }
        DirectionalRadial.updateHover(e.clientX, e.clientY);
    },

    onPointerUp: function (e) {
        var state = DirectionalRadial._press;
        if (!state || e.pointerId !== state.pointerId) return;
        clearTimeout(state.timer);
        if (state.fired) {
            e.preventDefault();
            var hovered = DirectionalRadial._hovered;
            DirectionalRadial.collapse();
            if (hovered && typeof Actionable !== "undefined") Actionable.SubmitTapMove(hovered.command);
        } else if (DirectionalRadial.CanOpen()) {
            // A genuine short tap -- released before the long-press timer
            // fired, and never moved past MoveCancelPx (a moved-away press
            // already nulled _press in onPointerMove, so onPointerUp never
            // reaches here for that gesture at all) -- opens the
            // programmable Settings panel. The Options > "Configure
            // directions..." button (WorkspaceUI.js) is the second,
            // more conventional entry point to the same panel. Gated by
            // CanOpen() too (codex #782 blocker 2) in case some other
            // overlay opened during the brief tap window.
            DirectionalRadial.ShowSettings();
        }
        DirectionalRadial.releaseCapture(state);
        DirectionalRadial.cleanupListeners();
        DirectionalRadial._press = null;
    },

    onPointerCancel: function (e) {
        var state = DirectionalRadial._press;
        if (!state || (e && typeof e.pointerId === "number" && e.pointerId !== state.pointerId)) return;
        if (state.fired) DirectionalRadial.collapse();
        clearTimeout(state.timer);
        DirectionalRadial.releaseCapture(state);
        DirectionalRadial.cleanupListeners();
        DirectionalRadial._press = null;
    },

    cleanupListeners: function () {
        Actionable.endHoldSelection(DirectionalRadial._press);
        DirectionalRadial.handle.classList.remove("pl-press-pending");
        DirectionalRadial.handle.removeEventListener("pointermove", DirectionalRadial.onPointerMove);
        DirectionalRadial.handle.removeEventListener("pointerup", DirectionalRadial.onPointerUp);
        DirectionalRadial.handle.removeEventListener("pointercancel", DirectionalRadial.onPointerCancel);
        DirectionalRadial.handle.removeEventListener("lostpointercapture", DirectionalRadial.onPointerCancel);
    },

    // --- Geometry ---------------------------------------------------------

    // At the main ring's radius, adjacent 45-degree-separated slices (a
    // full 8-point compass) must be far enough apart in ARC LENGTH (radius
    // * angle-in-radians) that two pills never touch even at their widest.
    MAIN_RADIUS: 68,
    OUTER_RADIUS: 118,
    // Custom rings (2+, Settings-defined) step outward by this much each.
    RING_STEP: 50,
    // Default reach (overwritten per-expand() by the actual max ring
    // present, see chaseIfNeeded) before the ring itself needs to shift to
    // keep up with the finger, rather than the finger running out of ring
    // to drag across.
    REACH: 118 + 26,

    RadiusForRing: function (ring) {
        ring = ring || 0;
        if (ring <= 0) return DirectionalRadial.MAIN_RADIUS;
        if (ring === 1) return DirectionalRadial.OUTER_RADIUS;
        return DirectionalRadial.OUTER_RADIUS + (ring - 1) * DirectionalRadial.RING_STEP;
    },

    // D118: mode is "exits" (default -- the room's real exits/custom
    // slices, slide-to-select) or "arrows" (the merged CharKeys pad --
    // Up/Left/Enter/Right/Down, discrete tap-per-button, never slide).
    // Only one shell, one `pl-dirpad-open` flag either way -- this is what
    // makes the mutual-exclusion checks (CanOpen/autoPadBlocked) trivially
    // correct without any cross-referencing, per D118 plan section 2.1.
    expand: function (cx, cy, slices, mode) {
        mode = mode || "exits";
        DirectionalRadial._mode = mode;
        var ring = DirectionalRadial.ring;
        ring.innerHTML = "";
        DirectionalRadial._hovered = null;
        DirectionalRadial._slices = slices;

        var maxRing = 1;
        slices.forEach(function (s) { if (typeof s.ring === "number" && s.ring > maxRing) maxRing = s.ring; });
        var maxRadius = DirectionalRadial.RadiusForRing(maxRing);

        // Must comfortably contain a slice at the outermost present ring's
        // radius plus its own width from center in every direction.
        var wanted = Math.max(280, 2 * (maxRadius + 40));

        // D117 audit fix (codex #782, blocker 3): a player-defined custom
        // ring (Settings, unbounded) can want a container far larger than
        // a real phone's own viewport -- reproduced live: a ring-2 slice
        // rendered fully off-screen at 320px wide. Scale every radius down
        // uniformly (never the pill's own CSS size, so text stays legible)
        // to whatever actually fits, rather than clamping only the
        // container's position and letting slices render past its edges.
        var availSize = Math.max(120, Math.min(window.innerWidth, window.innerHeight) - 16);
        var scale = wanted > availSize ? (availSize / wanted) : 1;
        DirectionalRadial._scale = scale;
        var size = Math.min(wanted, availSize);
        DirectionalRadial._reach = maxRadius * scale + 26;

        DirectionalRadial._ringSize = size;
        var left = Math.max(8, Math.min(cx - size / 2, window.innerWidth - size - 8));
        var top = Math.max(8, Math.min(cy - size / 2, window.innerHeight - size - 8));
        ring.style.left = left + "px";
        ring.style.top = top + "px";
        ring.style.width = size + "px";
        ring.style.height = size + "px";
        DirectionalRadial._centerX = left + size / 2;
        DirectionalRadial._centerY = top + size / 2;

        slices.forEach(function (slice) {
            var el;
            if (mode === "arrows") {
                // Real <button>s, same contract the retired #pl-arrowpad
                // buildPad() used: pointerdown-only with preventDefault so
                // the trailing synthetic click can never also fire (one
                // press = exactly one game event), and a real accessible
                // name/focus target (D117 audit fix, blocker 8, applied
                // here too rather than only to the exits-mode Settings UI).
                el = document.createElement("button");
                el.type = "button";
                el.className = "pl-dirpad-slice pl-dirpad-slice--arrow";
                el.setAttribute("aria-label", slice.dir);
                el.setAttribute("data-key", slice.key); // same query convention the retired #pl-arrowpad used
                el.textContent = slice.label;
                // codex audit (bus #786, high 4): a real pointer press fires
                // pointerdown THEN a trailing synthetic click; keyboard
                // activation (Enter/Space on a focused button) fires ONLY
                // click, with no pointerdown at all. The original code
                // called pressKey from pointerdown and unconditionally
                // swallowed every click, which correctly de-duped the
                // pointer case but silently ate the keyboard case entirely.
                // firedByPointer distinguishes "this click is the trailing
                // echo of a press already handled" from "this click IS the
                // press" -- pressKey still fires exactly once either way.
                var firedByPointer = false;
                el.addEventListener("pointerdown", function (e) {
                    e.preventDefault();
                    e.stopPropagation();
                    firedByPointer = true;
                    if (typeof CharKeys !== "undefined") CharKeys.pressKey(slice.key);
                });
                el.addEventListener("click", function (e) {
                    e.preventDefault();
                    e.stopPropagation();
                    if (firedByPointer) { firedByPointer = false; return; }
                    if (typeof CharKeys !== "undefined") CharKeys.pressKey(slice.key);
                });
                // Own adversarial live-browser audit (codex out of credits,
                // operator: "you'll have to do your own"): switching the
                // keyboard-activation fix from a bare "wait for the browser's
                // native click-on-Enter default action" to an EXPLICIT
                // keydown handler. Real Chromium/CDP testing found that on
                // this app's actual loaded page, Enter on a focused button
                // does NOT reliably synthesize a click at all -- reproduced
                // even with a completely bare, unstyled probe button freshly
                // appended straight to document.body, so it is not specific
                // to this widget's own CSS/markup. Root cause not fully
                // isolated (some interaction with this page's real listener
                // load / focus-management is the leading suspect, e.g.
                // CharKeys/Input's own mobile IME-ownership machinery), but
                // relying on an unreliable native default action would be
                // wrong regardless of the exact cause. Handling Enter/Space
                // explicitly here removes the dependency on it entirely --
                // the same firedByPointer flag still protects against a
                // double-fire on any real browser where the native click
                // DOES also end up firing afterward.
                el.addEventListener("keydown", function (e) {
                    if (e.key !== "Enter" && e.key !== " " && e.key !== "Spacebar") return;
                    e.preventDefault();
                    e.stopPropagation();
                    if (firedByPointer) return; // already handled by a real pointer press this same activation
                    firedByPointer = true; // pre-empt a real native click if the browser also fires one
                    if (typeof CharKeys !== "undefined") CharKeys.pressKey(slice.key);
                    // Reset shortly after, not immediately: a genuine trailing
                    // native click (if this browser's default action DOES
                    // fire one) arrives synchronously/near-instantly, well
                    // under this window -- but a held key's OS auto-repeat or
                    // a later, separate press of the SAME still-focused
                    // button must still fire again, not be silently eaten
                    // forever by a flag that never resets.
                    setTimeout(function () { firedByPointer = false; }, 350);
                });
            } else {
                el = document.createElement("div");
                el.className = "pl-dirpad-slice" + (slice.custom ? " pl-dirpad-slice--custom" : "");
                el.textContent = slice.label;
            }

            if (slice.ring === "center") {
                el.classList.add("pl-dirpad-slice--center");
                el.style.left = "50%";
                el.style.top = "50%";
            } else {
                var radius = DirectionalRadial.RadiusForRing(slice.ring || 0) * scale;
                var rad = slice.angle * Math.PI / 180;
                var x = Math.cos(rad) * radius;
                var y = Math.sin(rad) * radius;
                el.style.left = "calc(50% + " + x + "px)";
                el.style.top = "calc(50% + " + y + "px)";
            }
            ring.appendChild(el);
            slice.el = el;
        });

        ring.hidden = false;
        document.body.classList.add("pl-dirpad-open");
    },

    // --- D118: the merged arrow-pad mode's own public API (called from
    // CharKeys.js's openArrowPad/closeArrowPad/isPadOpen/refreshPad, which
    // keep their exact existing signatures and every eligibility/lifecycle
    // decision -- only WHAT they render changed). --------------------------

    ExpandArrows: function (cx, cy) {
        var slices = Object.keys(DirectionalRadial.ARROW_LAYOUT).map(function (key) {
            var meta = DirectionalRadial.ARROW_LAYOUT[key];
            return { dir: key, label: meta.label, angle: meta.angle, ring: meta.ring, key: meta.key };
        });
        DirectionalRadial.expand(cx, cy, slices, "arrows");
        DirectionalRadial.bindOutsideTapClose();
    },

    // The retired #pl-arrowpad had a real full-screen backdrop element, so
    // "tap outside the circle closes it" came for free (the backdrop WAS
    // the tap target). The shared shell has no backdrop (#pl-dirpad-ring
    // is pointer-events:none so exits-mode slices can rely on pointer
    // capture instead) -- restore the same player-facing behavior with an
    // explicit document-level listener, scoped to arrow mode only, bound
    // exactly while arrow mode is open and removed the moment it isn't.
    bindOutsideTapClose: function () {
        DirectionalRadial.unbindOutsideTapClose();
        DirectionalRadial._outsideTapHandler = function (e) {
            if (e.target && e.target.closest && e.target.closest(".pl-dirpad-slice--arrow, #pl-dirpad-handle")) return;
            e.preventDefault();
            e.stopPropagation();
            if (typeof CharKeys !== "undefined") CharKeys.closeArrowPad();
        };
        document.addEventListener("pointerdown", DirectionalRadial._outsideTapHandler, true);
    },

    unbindOutsideTapClose: function () {
        if (DirectionalRadial._outsideTapHandler) {
            document.removeEventListener("pointerdown", DirectionalRadial._outsideTapHandler, true);
            DirectionalRadial._outsideTapHandler = null;
        }
    },

    IsArrowModeOpen: function () {
        return document.body.classList.contains("pl-dirpad-open") && DirectionalRadial._mode === "arrows";
    },

    // Mirrors CharKeys' retired refreshPad(): an idle/live visual toggle
    // (no real char/line target currently exists vs. one does), polled by
    // CharKeys.js's own existing setInterval -- this function does not
    // start or own that timer, it is only ever told the current state.
    SetArrowLive: function (live) {
        if (!DirectionalRadial.IsArrowModeOpen()) return;
        DirectionalRadial.ring.classList.toggle("pl-dirpad-idle", !live);
        (DirectionalRadial._slices || []).forEach(function (s) {
            if (s.el && s.el.setAttribute) s.el.setAttribute("aria-disabled", live ? "false" : "true");
        });
    },

    // Operator: since the handle can sit anywhere near a screen edge, the
    // expanded ring can't always be centered under the finger without
    // running off-screen -- if the finger presses beyond the ring's useful
    // reach, the ring itself shifts toward the finger (clamped to the
    // viewport) so every slice stays reachable, "slide too far right, it
    // moves over; slide too far down, it moves itself up." Slices never
    // move relative to the ring (positioned via calc(50% + Npx) on the
    // ring container itself), so shifting the container carries the whole
    // compass with it.
    chaseIfNeeded: function (px, py) {
        var reach = DirectionalRadial._reach || DirectionalRadial.REACH;
        var dx = px - DirectionalRadial._centerX, dy = py - DirectionalRadial._centerY;
        var dist = Math.sqrt(dx * dx + dy * dy);
        if (dist <= reach || dist === 0) return;

        var excess = dist - reach;
        var ux = dx / dist, uy = dy / dist;
        var size = DirectionalRadial._ringSize;
        var curLeft = parseFloat(DirectionalRadial.ring.style.left) || 0;
        var curTop = parseFloat(DirectionalRadial.ring.style.top) || 0;
        var newLeft = Math.max(8, Math.min(curLeft + ux * excess, window.innerWidth - size - 8));
        var newTop = Math.max(8, Math.min(curTop + uy * excess, window.innerHeight - size - 8));

        DirectionalRadial.ring.style.left = newLeft + "px";
        DirectionalRadial.ring.style.top = newTop + "px";
        DirectionalRadial._centerX = newLeft + size / 2;
        DirectionalRadial._centerY = newTop + size / 2;
    },

    // Angle+radius bucketing (D117 plan section 2.4), not elementFromPoint --
    // robust once rings/slices overlap visually near the center. A small
    // dead zone at the very center selects nothing (lets the player abort
    // by not committing to any direction). Generalized to however many
    // distinct rings the CURRENT slice set actually uses (0/1 built-in,
    // 2+ only when custom slices are present).
    updateHover: function (px, py) {
        DirectionalRadial.chaseIfNeeded(px, py);

        var slices = DirectionalRadial._slices || [];
        var dx = px - DirectionalRadial._centerX, dy = py - DirectionalRadial._centerY;
        var dist = Math.sqrt(dx * dx + dy * dy);
        var angleDeg = Math.atan2(dy, dx) * 180 / Math.PI;

        var nearest = null;
        if (dist > 22) {
            var ringsPresent = [];
            slices.forEach(function (s) {
                var r = s.ring || 0;
                if (ringsPresent.indexOf(r) === -1) ringsPresent.push(r);
            });
            var activeRing = ringsPresent.length ? ringsPresent[0] : 0;
            var bestRingDelta = Infinity;
            ringsPresent.forEach(function (r) {
                var delta = Math.abs(dist - DirectionalRadial.RadiusForRing(r) * (DirectionalRadial._scale || 1));
                if (delta < bestRingDelta) { bestRingDelta = delta; activeRing = r; }
            });

            var best = Infinity;
            slices.forEach(function (slice) {
                if ((slice.ring || 0) !== activeRing) return;
                var delta = Math.abs(((angleDeg - slice.angle + 540) % 360) - 180);
                if (delta < best) { best = delta; nearest = slice; }
            });
            if (best > 40) nearest = null; // too far from any real slice's angle
        }

        if (nearest !== DirectionalRadial._hovered) {
            if (DirectionalRadial._hovered) DirectionalRadial._hovered.el.classList.remove("is-hovered");
            if (nearest) nearest.el.classList.add("is-hovered");
            DirectionalRadial._hovered = nearest;
            DirectionalRadial.announce(nearest);
        }
    },

    collapse: function () {
        DirectionalRadial.ring.hidden = true;
        DirectionalRadial.ring.innerHTML = "";
        DirectionalRadial.ring.classList.remove("pl-dirpad-idle");
        document.body.classList.remove("pl-dirpad-open");
        DirectionalRadial._hovered = null;
        DirectionalRadial._slices = null;
        DirectionalRadial._mode = null;
        DirectionalRadial.announce(null);
        DirectionalRadial.unbindOutsideTapClose(); // no-op if arrow mode's listener was never bound
    },

    // --- Keyboard-only path (operator: "maps to PC" -- the mouse-driven
    // gesture already works via Pointer Events, but a player using neither
    // a mouse nor touch needs a real way in). Alt+D opens the radial at
    // the handle's own screen position; Tab/Shift+Tab or the arrow keys
    // move the current selection; Enter submits it; Escape cancels. Scoped
    // to its own listener (not Input.js's own keydown switch) and ignores
    // every key while focus is in a real text field, so it never competes
    // with typing a command. -----------------------------------------------

    BindKeyboard: function () {
        document.addEventListener("keydown", function (e) {
            var active = document.activeElement;
            var typing = active && (active.tagName === "INPUT" || active.tagName === "TEXTAREA" || active.isContentEditable);

            if (DirectionalRadial._keyboardOpen) {
                // D117 audit fix (codex #782, blocker 2): re-check on EVERY
                // keydown while open, not just at the moment it opened --
                // an overlay (a game event's Message.Show, an incoming
                // dialog, etc.) can appear WHILE the keyboard path is mid-
                // selection. If it has, force-collapse without submitting
                // instead of letting Enter fire a command invisibly behind
                // whatever just opened.
                if (!DirectionalRadial.CanOpen()) {
                    DirectionalRadial.collapse();
                    DirectionalRadial._keyboardOpen = false;
                    return;
                }
                if (e.key === "Escape") {
                    e.preventDefault();
                    DirectionalRadial.collapse();
                    DirectionalRadial._keyboardOpen = false;
                    return;
                }
                if (e.key === "Tab") {
                    e.preventDefault();
                    DirectionalRadial.cycleKeyboardSelection(e.shiftKey ? -1 : 1);
                    return;
                }
                if (e.key.indexOf("Arrow") === 0) {
                    e.preventDefault();
                    DirectionalRadial.cycleKeyboardSelection(e.key);
                    return;
                }
                if (e.key === "Enter") {
                    e.preventDefault();
                    var hovered = DirectionalRadial._hovered;
                    DirectionalRadial.collapse();
                    DirectionalRadial._keyboardOpen = false;
                    if (hovered && typeof Actionable !== "undefined") Actionable.SubmitTapMove(hovered.command);
                    return;
                }
                return;
            }

            if (typing || DirectionalRadial.handle.hidden) return;
            // D117 audit fix (codex #782, blocker 9): plain Alt+D is
            // reserved by Chrome/Edge (focuses the address bar) and may
            // never reach page JS at all -- synthetic KeyboardEvent tests
            // cannot prove otherwise, only a real browser can. Ctrl+Alt+D
            // is not a known browser/OS reservation on any of this
            // project's target platforms; still needs the operator's own
            // live confirmation, not just this structural fix.
            if (e.ctrlKey && e.altKey && !e.metaKey && e.key.toLowerCase() === "d") {
                e.preventDefault();
                DirectionalRadial.OpenKeyboardMode();
            }
        });
    },

    cycleKeyboardSelection: function (dirOrDelta) {
        var slices = DirectionalRadial._slices || [];
        if (!slices.length) return;
        var nextIdx;
        if (typeof dirOrDelta === "number") {
            var idx = DirectionalRadial._hovered ? slices.indexOf(DirectionalRadial._hovered) : -1;
            nextIdx = (idx + dirOrDelta + slices.length) % slices.length;
        } else {
            var targetAngle = { ArrowUp: -90, ArrowRight: 0, ArrowDown: 90, ArrowLeft: 180 }[dirOrDelta];
            if (targetAngle === undefined) return;
            var best = Infinity;
            slices.forEach(function (s, i) {
                var delta = Math.abs(((s.angle - targetAngle + 540) % 360) - 180);
                if (delta < best) { best = delta; nextIdx = i; }
            });
        }
        if (nextIdx === undefined) return;
        if (DirectionalRadial._hovered) DirectionalRadial._hovered.el.classList.remove("is-hovered");
        DirectionalRadial._hovered = slices[nextIdx];
        DirectionalRadial._hovered.el.classList.add("is-hovered");
        DirectionalRadial.announce(DirectionalRadial._hovered);
    },

    // --- Programmable settings UI (plan section 2.5) -----------------------
    // A Message.Show panel (same weight/pattern as WorkspaceUI.ShowMaps),
    // per-module. "Static slices" = entries pinned regardless of the
    // room's real exits. "Additional radio circles" = ring 2+, entirely
    // player-defined, never populated by real exits (which only ever use
    // ring 0/1). One shared implementation -- desktop and mobile both open
    // the exact same dialog, no separate PC/mobile settings surfaces.

    ShowSettings: function () {
        var body = "<div class='pl-dirpad-settings'>" +
            "<p>Add your own command shortcuts for <strong>this module</strong>. Story exits appear automatically.</p>" +
            "<div id='pl-dirpad-settings-list'></div>" +
            "<div class='pl-dirpad-settings-add'>" +
            "<label>Label<input id='pl-dirpad-add-label' aria-label='Label' placeholder='e.g. Wait' maxlength='10'></label>" +
            "<label>Game command<input id='pl-dirpad-add-command' aria-label='Command' placeholder='e.g. wait' maxlength='80'></label>" +
            "<label>Angle (degrees)<input id='pl-dirpad-add-angle' aria-label='Angle' type='number' placeholder='0-359' min='0' max='359' value='0'></label>" +
            "<label>Ring<input id='pl-dirpad-add-ring' aria-label='Ring' type='number' placeholder='2 or higher' min='0' value='2'></label>" +
            "<p class='pl-dirpad-position-help'>Use ring 2 or higher for an outer ring. Rings 0 and 1 share space with story exits.</p>" +
            "<button id='pl-dirpad-add-btn' type='button'>Add slice</button>" +
            "<p id='pl-dirpad-add-error' role='alert'></p>" +
            "</div></div>";
        Message.Show("Directions settings", body, true);
        DirectionalRadial._editingId = null;
        DirectionalRadial.RenderSettingsList();
        $("#pl-dirpad-add-btn").off("click").on("click", DirectionalRadial.CommitAddOrEdit);
    },

    // D117 audit fix (codex #782, blocker 3): two slices at the exact same
    // ring+angle overlap and hit-testing always resolves to whichever was
    // added first, silently making the second unreachable. Checked against
    // every OTHER custom slice (excluding the one being edited) and every
    // BUILT-IN LAYOUT angle at that ring, so a player can't accidentally
    // shadow a real compass/up-down-in-out slice either.
    HasCollision: function (angle, ring, excludeId) {
        var conflict = DirectionalRadial.GetCustomSlices().some(function (s) {
            return s.id !== excludeId && s.ring === ring && s.angle === angle;
        });
        if (conflict) return true;
        return Object.keys(DirectionalRadial.LAYOUT).some(function (dir) {
            var meta = DirectionalRadial.LAYOUT[dir];
            return meta.ring === ring && meta.angle === angle;
        });
    },

    RenderSettingsList: function () {
        var list = DirectionalRadial.GetCustomSlices();
        var container = $("#pl-dirpad-settings-list").empty();
        if (!list.length) {
            $("<div>").addClass("empty").text("No custom slices yet.").appendTo(container);
            return;
        }
        list.forEach(function (s) {
            var row = $("<div>").addClass("pl-dirpad-settings-row").appendTo(container);
            $("<span>").addClass("pl-dirpad-settings-label").text(s.label + " → " + s.command + "  (angle " + s.angle + ", ring " + s.ring + ")").appendTo(row);
            // D117 audit fix (codex #782, blocker 8): real <button> elements,
            // not clickable <div>s -- native keyboard focus/activation.
            $("<button type='button'>").addClass("icon icon-edit-note").attr("aria-label", "Edit " + s.label).click(function () { DirectionalRadial.BeginEdit(s); }).appendTo(row);
            $("<button type='button'>").addClass("icon icon-delete-note").attr("aria-label", "Delete " + s.label).click(function () {
                if (!confirm("Delete this custom slice?")) return;
                DirectionalRadial.RemoveCustomSlice(s.id);
                DirectionalRadial.RenderSettingsList();
            }).appendTo(row);
        });
    },

    BeginEdit: function (s) {
        DirectionalRadial._editingId = s.id;
        $("#pl-dirpad-add-label").val(s.label);
        $("#pl-dirpad-add-command").val(s.command);
        $("#pl-dirpad-add-angle").val(s.angle);
        $("#pl-dirpad-add-ring").val(s.ring);
        $("#pl-dirpad-add-btn").text("Save changes");
    },

    CommitAddOrEdit: function () {
        var errEl = $("#pl-dirpad-add-error").text("");
        var label = ($("#pl-dirpad-add-label").val() || "").trim();
        var command = ($("#pl-dirpad-add-command").val() || "").trim();
        var angle = parseInt($("#pl-dirpad-add-angle").val(), 10);
        var ring = parseInt($("#pl-dirpad-add-ring").val(), 10);
        if (!label || !command || isNaN(angle) || isNaN(ring) || ring < 0) {
            errEl.text("Enter a label, a command, a numeric angle, and a ring (0 or higher).");
            return;
        }
        angle = ((angle % 360) + 360) % 360;
        if (angle > 180) angle -= 360; // normalize to this file's own -180..180 convention

        if (DirectionalRadial.HasCollision(angle, ring, DirectionalRadial._editingId)) {
            errEl.text("Another slice (real exit or custom) already occupies ring " + ring + " at angle " + angle + " -- pick a different angle or ring.");
            return;
        }

        if (DirectionalRadial._editingId) {
            DirectionalRadial.UpdateCustomSlice(DirectionalRadial._editingId, { label: label, command: command, angle: angle, ring: ring });
        } else {
            if (!DirectionalRadial.AddCustomSlice({ label: label, command: command, angle: angle, ring: ring })) {
                errEl.text(DirectionalRadial.CUSTOM_LIMIT_MESSAGE);
                return;
            }
        }
        DirectionalRadial._editingId = null;
        $("#pl-dirpad-add-label").val("");
        $("#pl-dirpad-add-command").val("");
        $("#pl-dirpad-add-angle").val(0);
        $("#pl-dirpad-add-ring").val(2);
        $("#pl-dirpad-add-btn").text("Add slice");
        DirectionalRadial.RenderSettingsList();
    }
};

if (typeof LearningStores !== "undefined") LearningStores.register("dirRadial", "PL_DirRadial_", DirectionalRadial.learningKeyFor);
if (typeof document !== "undefined") {
    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", DirectionalRadial.Init);
    else DirectionalRadial.Init();
}
