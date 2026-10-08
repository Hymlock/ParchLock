/* D105: keys a phone cannot otherwise send to a Glk character prompt.
 *
 *  1. Keyboard proxy. GlkOte destroys and recreates .Input.CharInput after every key, so the OS keyboard
 *     cannot live on that element. A short tap on the char strip focuses ONE persistent proxy input; what
 *     the player types is decoded (composition-safe, first code point only) and re-issued to the single
 *     current CharInput exactly the way Input.SubmitPrompt already does (jQuery keypress/keydown, which is
 *     what GlkOte's own handlers listen to).
 *  2. Arrow pad. Tools > "Arrow keys" opens a radial-style pad (Up/Down/Left/Right around a circle, Enter in
 *     the centre, tap outside to close) that sends the same events. At a line prompt Up/Down walk the command
 *     history, Left/Right move the caret and Enter submits.
 *
 * Mobile shell only. Nothing here changes desktop, the input radial, or LineInput typing. See
 * docs/mobile-input-plan-d105.md. */
// ParchLock is the SOLE owner of game-input focus on the mobile shell: GlkOte's own autofocus of each recreated prompt
// (lib/main.js: three game-input sites, guarded by this predicate; its native-dialog focus calls are untouched) is off on
// mobile, so the OS keyboard sees exactly one focus target (the tapped line field, or the persistent key proxy) and no
// competing focus()/blur()/refocus cycles while it animates. Desktop keeps Glk's autofocus (predicate is false there).
window.ParchLockNoGlkAutofocus = function () {
    try {
        if (!(document.body && document.body.classList.contains("pl-mobile"))) return false;
        var nativeMobile = !!(window.Capacitor && typeof window.Capacitor.isNativePlatform === "function"
            && window.Capacitor.isNativePlatform());
        var uaMobile = !!(navigator.userAgentData && navigator.userAgentData.mobile)
            || /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent || "")
            || (/Macintosh/i.test(navigator.userAgent || "") && (navigator.maxTouchPoints || 0) > 1);
        var coarseTouch = (navigator.maxTouchPoints || 0) > 0 && !!(window.matchMedia
            && window.matchMedia("(pointer: coarse)").matches);
        return nativeMobile || uaMobile || coarseTouch;
    } catch (e) { return false; }
};

var CharKeys = {

    SENTINEL: "​",
    proxy: null,
    // pad: retired by D118 -- DirectionalRadial owns the arrow-pad DOM now
    // (isPadOpen()/openArrowPad()/closeArrowPad()/refreshPad() all delegate
    // to it). Kept out of this state object entirely rather than left as a
    // stale, always-null property nothing reads.
    _composing: false,
    _handled: null,          // {type, at}: a keydown already turned into a game key (dedupes only its own follow-up input)
    _lastCommit: null,       // {text, at}: last composition commit (dedupes a post-composition final input)
    _noneSince: 0,
    _padTimer: null,
    _tap: null,
    _autoEligible: false,
    _autoSuppressed: false,
    _autoPadOwned: false,
    _autoExitTimer: null,

    isMobile: () => !!(document.body && document.body.classList.contains("pl-mobile")),
    managesIme: () => !!window.ParchLockNoGlkAutofocus(),

    log: (kind, value) => {
        try { if (window.__ckLog) window.__ckLog.push({ kind: kind, value: value }); } catch (e) {}
    },

    // ---- pure decoder (unit-tested) -------------------------------------------------------------
    // prev/next are the proxy value before/after an input event; it always holds exactly one sentinel
    // between commits so a deletion is observable even on an "empty" field.
    decode: (prev, next, composing) => {
        var S = CharKeys.SENTINEL;
        if (composing) return { kind: "none" };
        if (next === prev) return { kind: "none" };
        if (prev === S && next === "") return { kind: "backspace" };
        var added = next.split(S).join("");
        if (!added) return { kind: "none" };
        var first = Array.from(added)[0];
        if (first === "\n" || first === "\r") return { kind: "enter" };
        return { kind: "char", ch: first };
    },

    // ---- target selection: exactly one eligible prompt, else fail closed --------------------------
    charTarget: () => {
        var all = $(".Input.CharInput:visible").toArray();
        return all.length === 1 ? all[0] : null;
    },
    lineTarget: () => {
        var all = $(".Input.LineInput:visible").toArray();
        return all.length === 1 ? all[0] : null;
    },

    // ---- event emission (same mechanism as Input.SubmitPrompt) --------------------------------------
    sendKeypress: (code) => {
        var t = CharKeys.charTarget();
        if (!t) return false;
        CharKeys.log("keypress", code);
        $(t).trigger($.Event("keypress", { which: code, keyCode: code, charCode: code }));
        return true;
    },
    sendKeydown: (code) => {
        var t = CharKeys.charTarget();
        if (!t) return false;
        CharKeys.log("keydown", code);
        $(t).trigger($.Event("keydown", { which: code, keyCode: code }));
        return true;
    },
    sendChar: (ch) => {
        if (!ch) return false;
        var code = ch.charCodeAt(0);
        if (ch.length !== 1 || code > 0xFFFF) return false;      // one Glk char request consumes one BMP key
        return CharKeys.sendKeypress(code);
    },

    // ---- proxy --------------------------------------------------------------------------------------
    ensureProxy: () => {
        if (CharKeys.proxy && document.body.contains(CharKeys.proxy)) return CharKeys.proxy;
        var el = document.createElement("input");
        el.id = "pl-key-proxy";
        el.type = "text";
        el.value = CharKeys.SENTINEL;
        el.setAttribute("aria-label", "Game key entry");
        el.setAttribute("autocomplete", "off");
        el.setAttribute("autocorrect", "off");
        el.setAttribute("autocapitalize", "off");
        el.setAttribute("spellcheck", "false");
        el.setAttribute("inputmode", "text");
        el.setAttribute("enterkeyhint", "go");
        el.setAttribute("tabindex", "-1");
        document.body.appendChild(el);
        el.addEventListener("compositionstart", function () { CharKeys._composing = true; });
        el.addEventListener("compositionend", function () { CharKeys._composing = false; CharKeys.consume("compositionend", true); });
        el.addEventListener("input", function (e) {
            if (e.isComposing || CharKeys._composing) return;
            CharKeys.consume(e.inputType || "", false);
        });
        el.addEventListener("keydown", function (e) {
            var k = e.key, real = e.keyCode !== 229;
            var map = { ArrowUp: 38, ArrowDown: 40, ArrowLeft: 37, ArrowRight: 39, Escape: 27, Tab: 9, Delete: 8 };
            // A key the proxy turns into a game key is fully consumed: it must not also reach the app's global
            // Input.KeyPressed (Escape would close an overlay / toggle the map; Tab would run the autocomplete path).
            var consumed = function () { e.preventDefault(); e.stopPropagation(); };
            if (k === "Enter") { consumed(); CharKeys._handled = { type: "enter", at: Date.now() }; CharKeys.sendKeypress(13); return; }
            if (k === "Backspace" && real) { consumed(); CharKeys._handled = { type: "backspace", at: Date.now() }; CharKeys.sendKeydown(8); return; }
            if (map[k] && real) { consumed(); CharKeys.sendKeydown(map[k]); }
        });
        CharKeys.proxy = el;
        return el;
    },
    resetProxy: () => {
        var p = CharKeys.proxy;
        if (!p) return;
        p.value = CharKeys.SENTINEL;
        try { p.setSelectionRange(1, 1); } catch (e) {}
    },
    // inputType: the input event's type ("" for compositionend); fromComposition: this commit ends an IME composition.
    consume: (inputType, fromComposition) => {
        var p = CharKeys.proxy;
        if (!p) return;
        var next = p.value, now = Date.now();
        CharKeys.resetProxy();
        // A keydown already sent is deduped ONLY against the matching follow-up input of that same key, and only briefly.
        var h = CharKeys._handled;
        CharKeys._handled = null;
        if (h && now - h.at < 300 && ((h.type === "enter" && inputType === "insertLineBreak") || (h.type === "backspace" && inputType === "deleteContentBackward"))) return;
        var d = CharKeys.decode(CharKeys.SENTINEL, next, false);
        if (d.kind === "char") {
            // Some Android IMEs re-apply the composed text in a final non-composing input right after compositionend.
            var lc = CharKeys._lastCommit;
            if (!fromComposition && lc && lc.text === d.ch && now - lc.at < 80) return;
            CharKeys._lastCommit = fromComposition ? { text: d.ch, at: now } : null;
            CharKeys.sendChar(d.ch);
        } else if (d.kind === "backspace") CharKeys.sendKeydown(8);
        else if (d.kind === "enter") CharKeys.sendKeypress(13);
    },
    focusProxy: () => {
        var p = CharKeys.ensureProxy();
        CharKeys.resetProxy();
        try { p.focus({ preventScroll: true }); } catch (e) { try { p.focus(); } catch (e2) {} }
        CharKeys.resetProxy();
    },
    blurProxy: () => {
        var p = CharKeys.proxy;
        if (p && document.activeElement === p) { try { p.blur(); } catch (e) {} }
    },

    // ---- short tap on the char strip = "I want the keyboard" ---------------------------------------
    bind: () => {
        Actionable.endHoldSelection(CharKeys._tap);
        $(document).off("touchstart.pmCharTap touchmove.pmCharTap touchend.pmCharTap touchcancel.pmCharTap contextmenu.pmCharTap");
        var cancel = function () { var s = CharKeys._tap; if (s) { clearTimeout(s.timer); Actionable.endHoldSelection(s); } CharKeys._tap = null; };
        // Same gesture split as the line field: short tap = keyboard; hold = the existing input radial (no keyboard).
        $(document).on("touchstart.pmCharTap", ".Input.CharInput", function (e) {
            if (!CharKeys.managesIme()) return;
            var t = e.originalEvent && e.originalEvent.touches && e.originalEvent.touches[0];
            if (!t) return;
            cancel();
            var el = this;
            var s = { el: el, x: t.clientX, y: t.clientY, at: Date.now(), moved: false, fired: false, touchId: t.identifier };
            Actionable.beginHoldSelection(s);
            var longMs = typeof Actionable !== "undefined" ? Actionable.LongPressMs : 500;
            s.timer = setTimeout(function () {
                if (CharKeys._tap !== s) return;
                s.fired = true;
                Actionable.fireHoldSelection(s);
                try {
                    Input.DismissKeyboard();
                    var r = el.getBoundingClientRect();
                    ParchLockQol.OpenRadial(r.left + r.width / 2, r.top + r.height / 2, ParchLockQol.GetRadialCommands(), { source: "input" });
                } catch (eR) {}
            }, longMs);
            CharKeys._tap = s;
        }).on("touchmove.pmCharTap", ".Input.CharInput", function (e) {
            var s = CharKeys._tap;
            var t = e.originalEvent && e.originalEvent.touches && e.originalEvent.touches[0];
            if (!s || !t) return;
            var px = typeof Actionable !== "undefined" ? Actionable.LongPressMoveCancelPx : 20;
            if (!s.fired && (t.clientX - s.x) * (t.clientX - s.x) + (t.clientY - s.y) * (t.clientY - s.y) > px * px) { s.moved = true; clearTimeout(s.timer); Actionable.endHoldSelection(s); }
        }).on("touchend.pmCharTap", ".Input.CharInput", function (e) {
            var s = CharKeys._tap;
            CharKeys._tap = null;
            if (!s) return;
            clearTimeout(s.timer);
            Actionable.endHoldSelection(s);
            if (!CharKeys.managesIme() || s.el !== this) return;
            // A fired hold (or a moved touch) must not also act as a tap: suppress the trailing synthetic click.
            if (s.fired || s.moved) { e.preventDefault(); return; }
            // Suppress the compatibility mouse/focus events, which would focus the (gated) CharInput and
            // immediately blur it again, taking the keyboard down with it.
            e.preventDefault();
            if (CharKeys._autoPadOwned) CharKeys.closeArrowPad();
            Input._kbIntent = "char";
            CharKeys.focusProxy();
        }).on("touchcancel.pmCharTap", ".Input.CharInput", cancel);
        // A long press can emit contextmenu: the char strip has no text to select, so never show the native menu.
        $(document).on("contextmenu.pmCharTap", ".Input.CharInput", function (e) {
            if (CharKeys.managesIme()) { e.preventDefault(); e.stopPropagation(); }
        });
    },

    // An app overlay (Message, native Glk dialog, tutorial, radial) owns the screen: the keyboard intent and the pad end.
    // Never touches the overlay's own inputs (only blurs the proxy if the proxy itself holds focus).
    onOverlay: () => {
        try {
            CharKeys.resetAutoPadState(true);
            CharKeys.closeArrowPad("system");
            Input._kbIntent = null;
            CharKeys.blurProxy();
        } catch (e) {}
    },
    reconcileOverlays: () => {
        if (!CharKeys.managesIme()) return;
        try {
            // D120: pl-mobile-tutorial-open is retired along with
            // MobileTutorial itself -- the D113 tutorial is now its own
            // separate route that never loads this file, so no play.html
            // overlay-reconciliation check can ever observe it again (see
            // the matching note in DirectionalRadial.CanOpen()).
            var overlay = (typeof Message !== "undefined" && Message.IsOpen) || document.querySelector("#dialog, #dialog_frame, #dialog_screen")
                || document.body.classList.contains("native-dialog-open")
                || document.querySelector("#radial-menu.show");
            if (overlay && (Input._kbIntent || CharKeys.isPadOpen() || document.activeElement === CharKeys.proxy)) CharKeys.onOverlay();
        } catch (e) {}
    },

    // ---- per-tick reconciliation (called from Input.SyncMobilePromptFocus) --------------------------
    sync: (lineReady, charReady) => {
        if (!CharKeys.managesIme()) return;
        try {
            CharKeys.syncAutoPad(lineReady, charReady);
            var intent = Input._kbIntent;
            if (charReady && intent === "line") {              // a submitted command opened a char prompt (menu): keyboard retracts
                Input.DismissKeyboard();
            } else if (lineReady && intent === "char") {       // leaving a char prompt for the command line: keyboard retracts
                Input.DismissKeyboard();
            } else if (!lineReady && !charReady && intent) {   // no prompt: tolerate short gaps between prompts
                CharKeys._noneSince = CharKeys._noneSince || Date.now();
                if (Date.now() - CharKeys._noneSince > 1500) { Input._kbIntent = null; CharKeys.blurProxy(); }
            }
            if (lineReady || charReady) CharKeys._noneSince = 0;
            // The arrow pad must not sit over a dialog / tutorial / native dialog.
            // D118: CharKeys.pad is retired (DirectionalRadial owns the DOM) --
            // isPadOpen() is the correct check regardless of which shell renders it.
            if (CharKeys.isPadOpen()) {
                if ((typeof Message !== "undefined" && Message.IsOpen) || document.querySelector("#dialog")
                    || document.querySelector("#radial-menu.show")) {
                    CharKeys.closeArrowPad();
                }
            }
        } catch (e) {}
    },

    gridCharTarget: () => {
        var target = CharKeys.charTarget();
        return target && target.closest && target.closest(".GridWindow") ? target : null;
    },
    autoPadBlocked: () => {
        // D118 merge correctness fix: after merging, CharKeys' OWN arrow
        // pad ALSO sets pl-dirpad-open (it is the same shared shell now).
        // Blocking on that flag unconditionally (the original D117 audit-
        // fix version of this line) would make the auto-pad's own open
        // state satisfy its own "blocked" check -- syncAutoPad's very next
        // tick would then see eligible=false purely because the pad it
        // just opened is open, and immediately close what it just opened.
        // Block only when the OTHER (player-initiated exits/Settings)
        // mode is what's actually showing -- never our own arrow mode.
        var dirpadBlocking = typeof DirectionalRadial !== "undefined"
            && document.body.classList.contains("pl-dirpad-open")
            && DirectionalRadial._mode !== "arrows";
        // Follow-up fix (operator-confirmed original ask): D118 merged the
        // arrow pad's DOM/rendering into DirectionalRadial, but
        // Global.Prefs.DirectionalRadialEnabled never actually gated arrow
        // mode -- ApplyEnabledState() only hid the exits-mode handle
        // element, so turning the whole widget off in Options left the
        // auto arrow pad opening anyway. Now a single shared preference
        // really does govern both modes of the one merged widget.
        var disabledByPref = typeof Global !== "undefined" && Global.Prefs.DirectionalRadialEnabled === false;
        // D120: pl-mobile-tutorial-open dropped from this list -- retired
        // along with MobileTutorial itself (see DirectionalRadial.CanOpen()'s
        // matching note for why no replacement flag was needed).
        return !!((typeof Message !== "undefined" && Message.IsOpen)
            || document.querySelector("#dialog, #dialog_frame, #dialog_screen")
            || document.body.classList.contains("native-dialog-open")
            || document.querySelector("#radial-menu.show")
            || dirpadBlocking
            || disabledByPref);
    },
    resetAutoPadState: (cancelTimer) => {
        if (cancelTimer && CharKeys._autoExitTimer) clearTimeout(CharKeys._autoExitTimer);
        if (cancelTimer) CharKeys._autoExitTimer = null;
        CharKeys._autoEligible = false;
        CharKeys._autoSuppressed = false;
    },
    leaveAutoPadMode: () => {
        if (CharKeys._autoExitTimer) clearTimeout(CharKeys._autoExitTimer);
        CharKeys._autoExitTimer = null;
        CharKeys._autoEligible = false;
        CharKeys._autoSuppressed = false;
        if (CharKeys._autoPadOwned) CharKeys.closeArrowPad("auto-exit");
    },
    syncAutoPad: (lineReady, charReady) => {
        var eligible = !!CharKeys.gridCharTarget() && !CharKeys.autoPadBlocked();
        if (eligible) {
            if (CharKeys._autoExitTimer) clearTimeout(CharKeys._autoExitTimer);
            CharKeys._autoExitTimer = null;
            if (!CharKeys._autoEligible) {
                CharKeys._autoEligible = true;
                CharKeys._autoSuppressed = false;
                if (!CharKeys.isPadOpen()) CharKeys.openArrowPad("auto");
            }
            return;
        }

        // A real prompt-mode change closes immediately. A brief no-prompt gap
        // is Glk replacing CharInput after a key; hold state across that gap so
        // the pad cannot flash closed and open on every arrow press.
        if (lineReady || charReady || CharKeys.autoPadBlocked()) {
            CharKeys.leaveAutoPadMode();
        } else if (CharKeys._autoEligible && !CharKeys._autoExitTimer) {
            CharKeys._autoExitTimer = setTimeout(function () {
                CharKeys._autoExitTimer = null;
                if (!CharKeys.gridCharTarget() || CharKeys.autoPadBlocked()) CharKeys.leaveAutoPadMode();
            }, 750);
        }
    },

    // ---- Arrow pad (Tools > Arrow keys) -----------------------------------------------------------------
    // D118: merged into the DirectionalRadial widget (docs/dirpad-arrowpad-merge-plan-d118.md) --
    // this file keeps 100% of its own eligibility/lifecycle state machine
    // (_autoEligible/_autoPadOwned/_autoSuppressed/_autoExitTimer,
    // syncAutoPad, autoPadBlocked, leaveAutoPadMode, resetAutoPadState --
    // all completely unchanged below and above this section) and every
    // external caller (js/Input.js's Escape chain, js/MobileLayout.js's
    // back-button chain, js/WorkspaceUI.js's Tools > Arrow keys entry)
    // keeps calling these exact same four functions with the exact same
    // signatures. Only WHAT they render changed: DirectionalRadial's
    // shared handle/ring shell in "arrows" mode (discrete tap-per-button,
    // never slide-to-select), not a separate #pl-arrowpad DOM tree/CSS.
    // buildPad()/CharKeys.pad are retired -- DirectionalRadial owns the DOM.
    pressKey: (name) => {
        var codes = { up: 38, down: 40, left: 37, right: 39 };
        var ct = CharKeys.charTarget();
        if (ct) {
            if (name === "enter") return CharKeys.sendKeypress(13);
            return CharKeys.sendKeydown(codes[name]);
        }
        var lt = CharKeys.lineTarget();
        if (!lt) return false;
        if (name === "enter") { CharKeys.log("line-enter", 13); return Input.SubmitPrompt(); }
        if (name === "up" || name === "down") { CharKeys.log("line-keydown", codes[name]); $(lt).trigger($.Event("keydown", { which: codes[name], keyCode: codes[name] })); return true; }
        var pos = typeof lt.selectionStart === "number" ? lt.selectionStart : (lt.value || "").length;
        pos = Math.max(0, Math.min((lt.value || "").length, pos + (name === "left" ? -1 : 1)));
        try { lt.setSelectionRange(pos, pos); } catch (e) {}
        CharKeys.log("line-caret", pos);
        return true;
    },
    refreshPad: () => {
        if (typeof DirectionalRadial === "undefined") return;
        DirectionalRadial.SetArrowLive(!!(CharKeys.charTarget() || CharKeys.lineTarget()));
    },
    openArrowPad: (mode) => {
        if (typeof DirectionalRadial === "undefined") return;
        // Manual entry (Tools > Arrow keys) has no autoPadBlocked() gate of
        // its own -- guard directly against the OTHER (exits/Settings) mode
        // already showing, same mutual-exclusion principle, never against
        // our own arrow mode (re-opening while already open is a harmless
        // no-op rebuild, not a conflict).
        if (document.body.classList.contains("pl-dirpad-open") && DirectionalRadial._mode !== "arrows") return;
        // Same merged-preference gate as autoPadBlocked() above, applied to
        // manual entry too -- disabling the directional widget in Options
        // must disable BOTH of its modes, not just the exits-mode handle.
        if (typeof Global !== "undefined" && Global.Prefs.DirectionalRadialEnabled === false) return;
        // codex #786 blocker 2, applied here too: the desktop persistent
        // toggle (DirectionalRadial.ApplyEnabledState) can call this at
        // page-load time before a story exists at all -- never open over a
        // no-story/pre-game screen.
        if (!DirectionalRadial.IsStoryPlayable()) return;
        try { if (typeof Input !== "undefined" && Input.DismissKeyboard) Input.DismissKeyboard(); } catch (e) {}
        CharKeys._autoPadOwned = mode === "auto";
        var rect = DirectionalRadial.handle.getBoundingClientRect();
        DirectionalRadial.ExpandArrows(rect.left + rect.width / 2, rect.top + rect.height / 2);
        CharKeys.refreshPad();
        clearInterval(CharKeys._padTimer);
        CharKeys._padTimer = setInterval(CharKeys.refreshPad, 400);
    },
    closeArrowPad: (reason) => {
        if (typeof DirectionalRadial === "undefined" || !DirectionalRadial.IsArrowModeOpen()) return;
        if (CharKeys._autoPadOwned && !reason && CharKeys._autoEligible) CharKeys._autoSuppressed = true;
        DirectionalRadial.collapse();
        clearInterval(CharKeys._padTimer);
        CharKeys._autoPadOwned = false;
    },
    isPadOpen: () => typeof DirectionalRadial !== "undefined" && DirectionalRadial.IsArrowModeOpen(),

    init: () => {
        try { CharKeys.bind(); } catch (e) {}
    }
};
