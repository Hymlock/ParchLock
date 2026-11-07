var Input = {

    KeyboardNavigation: {

        n: "Up Arrow (or / or *)",
        s: "Down Arrow (or numeric keypad 5)",
        w: "Left Arrow",
        e: "Right Arrow",
        ne: "PageUp",
        se: "PageDown",
        sw: "End",
        nw: "Home"
    },

    HistoryIndex: -1,

    // D105: ONE authoritative "the player asked for the on-screen keyboard" state
    // (null | "line" | "char"). Set only by a short tap on the input strip; cleared by
    // every dismiss gesture (DismissKeyboard) and when the IME is dismissed. Replaces the
    // per-DOM-element data("pmUserFocus"), which was lost whenever Glk replaced the field.
    _kbIntent: null,
    _kbLineEl: null,     // the line field the player tapped (line intent only); a replacement field means a turn was submitted
    KbIntent: () => Input._kbIntent,
    SetKbIntent: (mode) => { Input._kbIntent = mode === "line" || mode === "char" ? mode : null; },
    ClearKbIntent: () => { Input._kbIntent = null; },
    ManagesMobileIme: () => {
        try { return !!(window.ParchLockNoGlkAutofocus && window.ParchLockNoGlkAutofocus()); } catch (e) { return false; }
    },

    Value: () => $(".Input.LineInput").val(),

    Inject: (text, hitEnter, source) => {
        if (typeof WorkspaceUI !== 'undefined' && WorkspaceUI._leaving) return false;
        source = source || "inject";
        try { if (source !== "stat-probe" && typeof MapTopology !== "undefined") MapTopology.noteCommand(text); } catch (e) {}
        if (!$(".Input.LineInput").length || (hitEnter && (Message.IsOpen || $("#dialog").length))) return false;
        if (!$(".Input.LineInput:visible").length
            // D192 (grok round 2): the `equip-open` escape has been removed.
            // It allowed ANY injection into a hidden line input for as long as
            // the sheet was open -- a radial or a map tap, not just the sheet's
            // own drag-and-drop -- which contradicts D86's rule that
            // Input.Inject is the single non-typed choke point. The probe's own
            // submission has its own narrow permission below.
            //
            // Measured before removing it: with the sheet open the line input
            // is VISIBLE on both desktop and mobile (412px), so the sheet's
            // drag-and-drop and Refresh still pass the visibility test above
            // and never needed this clause.
            && !(typeof StatTracker !== "undefined" && StatTracker._carryProbeSubmitting)) return false;
        $(".Input.LineInput").val($(".Input.LineInput").val() + text);
        if (hitEnter) {

            /* D86 stage 1: this is the sole non-typed submission choke point --
               every click/radial/map/menu-driven command reaches the VM through
               here. A real native keypress (genuine typing) is still covered by
               AttrCalibrator's own document-level capture listener, so this call
               only needs to cover the case that listener structurally cannot see:
               the synthetic jQuery-triggered event below. Uses the FINAL, already-
               appended input value (not the raw `text` argument), since Inject
               appends to whatever the box already held. */
            // D100: new player turn — clear ReadAloud fingerprints (Claude #650).
            try { if (source !== "stat-probe" && typeof ReadAloud !== "undefined" && ReadAloud.onPlayerTurn) ReadAloud.onPlayerTurn(); } catch (eRA) {}
            // T10 (operator): every command the player sends -- radial, map,
            // menu, repeat or the Send button -- joins the recent-command
            // history. Automatic status probes never do.
            try { if (source !== "stat-probe" && typeof ParchLockQol !== "undefined" && ParchLockQol.RecordSent) ParchLockQol.RecordSent($(".Input.LineInput").val()); } catch (eRS) {}
            try {
                var finalValue = $(".Input.LineInput").val();
                if (typeof AttrCalibrator !== "undefined") {
                    // D86 CUTOVER: the legacy observeCommand/observeLocation/
                    // observeVerbBehavior calls are removed -- TurnRecorder's
                    // three registered analyzers (js/AttrCalibrator.js) are
                    // now the sole real writers, proven byte-for-byte
                    // equivalent via live A/B proofs before this cutover.
                }
                if (typeof TurnRecorder !== "undefined" && TurnRecorder.onAcceptedSubmit) {
                    TurnRecorder.onAcceptedSubmit(finalValue, source);
                }
            } catch (eC) {}

            $(".Input.LineInput").trigger($.Event( "keypress", { which: 13 } ));
        }
        return true;
    },

    Clear: () => {

        $(".Input.LineInput").val("");
    },

    Focus: () => {
        // Mobile: never steal focus (opens soft keyboard). Desktop only.
        if (Input.ManagesMobileIme()) return;
        if ($(".Input.CharInput:visible").length) return;
        var $line = $(".Input.LineInput:visible");
        if ($line.length) $line.focus();
    },

    // Force OS keyboard down on Glk line/char fields only. Never touch
    // #dialog / native save-name inputs (operator: save dialog field was
    // unusable because every tick/dismiss blurred it).
    DismissKeyboard: () => {
        try {
            Input._kbIntent = null;
            Input._kbLineEl = null;
            try { if (typeof CharKeys !== "undefined") CharKeys.blurProxy(); } catch (eP) {}
            $(".Input.LineInput").each(function () {
                $(this).attr("inputmode", "none");
                try { this.blur(); } catch (e) {}
            });
            $(".Input.CharInput").each(function () {
                $(this).attr("inputmode", "none").attr("readonly", "readonly");
                try { this.blur(); } catch (e) {}
            });
            var ae = document.activeElement;
            if (ae && $(ae).closest("#dialog, #dialog_frame, #dialog_screen, #message").length) {
                return;
            }
            if (ae && $(ae).is(".Input.LineInput, .Input.CharInput")) {
                try { ae.blur(); } catch (e2) {}
            }
        } catch (e) {}
    },

    IsDialogInput: (el) => {
        try {
            return !!(el && $(el).closest("#dialog, #dialog_frame, #dialog_screen").length);
        } catch (e) {
            return false;
        }
    },

    BindKeyboard: () => {

        $("body").unbind().keydown(Input.KeyPressed);
        // Claim these keys before GlkOte's line-history handler stops bubbling.
        if (!Input._movementCaptureBound) {
            Input._movementCaptureBound = true;
            document.addEventListener("keydown", Input.CaptureMovement, true);
        }
    },

    CaptureMovement: (e) => {
        if (!e.ctrlKey || !e.shiftKey || e.altKey || e.metaKey || e.isComposing
            || (e.key !== "ArrowUp" && e.key !== "ArrowDown")) return;
        var $line = $(".Input.LineInput");
        if ($line.length !== 1 || !$line.is(":visible") || $line.prop("disabled")
            || $(".Input.CharInput:visible").length) return;
        var target = e.target;
        if (target !== $line[0] && $(target).closest("input, textarea, select, button, a, [contenteditable], #pl-key-proxy").length) return;
        e.preventDefault();
        e.stopImmediatePropagation();
        if ((typeof WorkspaceUI !== "undefined" && WorkspaceUI._leaving)
            || (typeof Message !== "undefined" && Message.IsOpen)
            || $("#dialog, #dialog_frame, #dialog_screen").length
            || $("body").is(".native-dialog-open, .app-dialog-open, .radial-open, .equip-open, .pl-dirpad-open")
            || $("#radial-menu.show").length
            || (typeof WorldMap !== "undefined" && WorldMap.IsOpen())
            || $("body").is(".pl-mobile.map-open")) return;
        // Holding a key must not queue multiple moves across prompt replacement.
        if (e.repeat) return;
        // M6: a compass shortcut is a tap move (seated get-out prefix), not typed text.
        if (typeof Actionable !== "undefined" && Actionable.SubmitTapMove) { Input.Clear(); Actionable.SubmitTapMove(e.key === "ArrowUp" ? "n" : "s", "user-navigation"); return; }
        Input.Clear();
        Input.Inject(e.key === "ArrowUp" ? "n" : "s", true, "user-navigation");
    },

    // D93: CharInput ("press any key") completes via ➤ without IME.
    // LineInput uses Inject. Soft keyboard only after a short tap on the
    // line field (not long-press, not Glk auto-focus, not Tools/Menu taps).
    SubmitPrompt: () => {
        var $char = $(".Input.CharInput:visible");
        if ($char.length) {
            // D105: exactly one eligible char prompt or fail closed (Glk may request char input in several windows).
            if ($char.length > 1) return true;
            try {
                var el = $char.get(0);
                $char.prop("readonly", false);
                $char.trigger($.Event("keypress", { which: 13, keyCode: 13, charCode: 13, bubbles: true }));
                if ($(".Input.CharInput:visible").length) {
                    $char.trigger($.Event("keypress", { which: 32, keyCode: 32, charCode: 32, bubbles: true }));
                }
                $char.prop("readonly", true).attr("inputmode", "none");
                try { if (el) el.blur(); } catch (e2) {}
            } catch (e) {}
            // D105: with the char-prompt keyboard open, keep it open across the synthetic key.
            if (Input._kbIntent !== "char") Input.DismissKeyboard();
            return true;
        }
        var $line = $(".Input.LineInput:visible");
        // Exactly one eligible line prompt or fail closed (D105 rule, as for
        // char prompts): with several, neither a repeat nor a send is safe.
        if ($line.length > 1) return true;
        // T10 (operator): Send on an EMPTY line repeats the last command the
        // player submitted. Exactly one eligible line prompt; anything typed
        // is submitted as before; no history keeps the old behaviour.
        if ($line.length === 1 && !String($line.val() || "").trim()) {
            var last = null;
            try { last = ParchLockQol.GetHistory()[0] || null; } catch (eH) {}
            if (last && typeof Actionable !== "undefined" && Actionable.Submit) {
                Actionable.Submit(last);
                if (Input.ManagesMobileIme()) Input.DismissKeyboard();
                return true;
            }
        }
        if ($line.length) {
            Input.Inject("", true, 'user-send');
            // D105: the keyboard retracts after a submitted command so it never covers the reply.
            if (Input.ManagesMobileIme()) Input.DismissKeyboard();
            return true;
        }
        return false;
    },

    // Every ParchLock tick: defeat GlkOte's auto-focus on Line/Char only.
    // Leave #dialog save-name fields alone (operator: keyboard flash-off).
    SyncMobilePromptFocus: (lineReady, charReady) => {
        if (!Input.ManagesMobileIme()) return;
        // D105: overlay reconciliation must run BEFORE the early returns below (dialogs), or the pad/intent survive them.
        try { if (typeof CharKeys !== "undefined") CharKeys.reconcileOverlays(); } catch (eOv) {}
        try {
            if (Input.IsDialogInput(document.activeElement)) return;
            if ($("#dialog:visible").length || document.body.classList.contains("native-dialog-open")) {
                return;
            }
            if (charReady) {
                var $char = $(".Input.CharInput:visible");
                $char.attr("inputmode", "none").attr("readonly", "readonly");
                try {
                    if (document.activeElement && $(document.activeElement).is(".Input.CharInput")) {
                        document.activeElement.blur();
                    }
                } catch (eB) {}
            }
            if (lineReady) {
                var $line = $(".Input.LineInput:visible");
                // The field the player tapped was replaced by Glk: a command was submitted -> retract the keyboard.
                if (Input._kbIntent === "line" && Input._kbLineEl && !document.body.contains(Input._kbLineEl)) Input.DismissKeyboard();
                $line.each(function () {
                    var $el = $(this);
                    if (Input._kbIntent === "line" && Input._kbLineEl === this) {
                        if (!$el.attr("inputmode") || $el.attr("inputmode") === "none") {
                            $el.attr("inputmode", "text");
                        }
                        return;
                    }
                    $el.attr("inputmode", "none");
                    if (document.activeElement === this) {
                        try { this.blur(); } catch (eL) {}
                    }
                });
            }
            try { if (typeof CharKeys !== "undefined") CharKeys.sync(lineReady, charReady); } catch (eCk) {}
        } catch (e) {}
    },

    _lineTouch: null,

    BindInputRow: () => {

        // T10: a command typed and sent with Enter joins the recent-command
        // history. Capture phase on the document, so no handler that stops
        // propagation (mobile line handling) can hide it. Synthetic sends go
        // through Input.Inject, which records them itself.
        if (!Input._sentCaptureBound) {
            Input._sentCaptureBound = true;
            document.addEventListener("keydown", function (e) {
                try {
                    if (!(e.key === "Enter" || e.keyCode === 13) || !e.isTrusted) return;
                    if (e.target && $(e.target).closest("#message, #dialog, #pl-key-proxy").length) return;
                    // Mobile keeps the line field unfocused, so Enter arrives on the
                    // page while the one line prompt holds the text being sent.
                    var $l = $(e.target).is(".Input.LineInput") ? $(e.target) : $(".Input.LineInput");
                    if ($l.length === 1 && String($l.val() || "").trim()
                        && typeof ParchLockQol !== "undefined" && ParchLockQol.RecordSent) ParchLockQol.RecordSent($l.val());
                } catch (eRS) {}
            }, true);
        }

        $("#pl-input-submit").off("click.pmInputRow").on("click.pmInputRow", () => {
            // T10: the click trailing a hold that opened the history radial is
            // not a tap -- with the empty-line repeat it would resend a command.
            if (Date.now() - (Input._submitHoldAt || 0) < 800) return;
            Input.SubmitPrompt();
        });

        // Any chrome tap dismisses IME so Tools/Menu/submit never leave the
        // keyboard up after Glk re-focuses.
        $("#pl-input-submit, #pl-input-mic, #tools-toggle, #game-menu")
            .off("touchstart.pmDismissKb")
            .on("touchstart.pmDismissKb", function () {
                // Tools / Menu / mic: always dismiss IME. Submit keeps
                // pmUserFocus handling inside SubmitPrompt.
                if (this.id === "tools-toggle" || this.id === "game-menu" || this.id === "pl-input-mic") {
                    Input.DismissKeyboard();
                }
            });

        // Tapping the story buffer (scroll, nouns, empty space) must not
        // leave the soft keyboard up. Glk often re-focuses the line field
        // after content updates; dismiss on any touch outside the input row.
        $(document).off("touchstart.pmStoryDismissKb");
        $(document).on("touchstart.pmStoryDismissKb", function (e) {
            if (!Input.ManagesMobileIme()) return;
            var t = e.target;
            if (!t) return;
            if ($(t).closest(".Input.LineInput, .Input.CharInput, #pl-input-submit, #pl-input-mic, #tools-toggle, #game-menu, #radial-menu, #autocomplete, #message, #dialog, #dialog_frame, #dialog_screen, #pl-arrowpad, #pl-key-proxy").length) {
                return;
            }
            if (Input._kbIntent || (document.activeElement && $(document.activeElement).is(".Input.LineInput, .Input.CharInput, #pl-key-proxy"))) {
                Input.DismissKeyboard();
            }
        });

        // Hard gate: only Glk Line/Char -- never #dialog inputs.
        $(document).off("focusin.pmKeyboardGate");
        $(document).on("focusin.pmKeyboardGate", ".Input.LineInput, .Input.CharInput", function (e) {
            if (!Input.ManagesMobileIme()) return;
            if (Input.IsDialogInput(this)) return;
            var $el = $(this);
            if ($el.hasClass("CharInput")) {
                try { this.blur(); } catch (eC) {}
                return;
            }
            if (Input._kbIntent !== "line" || Input._kbLineEl !== this) {
                try { this.blur(); } catch (eL) {}
                // Glk auto-focused the NEW field after a submitted command: the keyboard intent ended with the old one.
                if (Input._kbIntent === "line" && Input._kbLineEl && !document.body.contains(Input._kbLineEl)) Input.DismissKeyboard();
            }
        });

        // D105: the IME was dismissed (e.g. Android Back) -> the player no longer wants the keyboard.
        // A field that Glk replaced (disconnected) keeps the intent; a still-connected field that lost
        // focus to nothing/other chrome clears it, so the per-tick sync never refocuses it.
        $(document).off("focusout.pmKbIntent");
        $(document).on("focusout.pmKbIntent", ".Input.LineInput, #pl-key-proxy", function () {
            if (!Input.ManagesMobileIme()) return;
            var el = this;
            setTimeout(function () {
                if (!Input._kbIntent) return;
                if (!document.body.contains(el)) return;
                var ae = document.activeElement;
                if (ae && $(ae).is(".Input.LineInput, .Input.CharInput, #pl-key-proxy, #pl-input-submit")) return;
                Input._kbIntent = null;
            }, 250);
        });

        // Line field touch: short tap = open keyboard; long-press = radial
        // (does not open keyboard). Accidental brushes while scrolling the
        // story must not set pmUserFocus.
        Actionable.endHoldSelection(Input._lineTouch);
        $(document).off("touchstart.pmLineTap touchmove.pmLineTap touchend.pmLineTap touchcancel.pmLineTap");
        $(document).on("touchstart.pmLineTap", ".Input.LineInput", function (e) {
            if (!Input.ManagesMobileIme()) return;
            // D105 (F3): the keyboard is already open on this field -> the OS owns the touch
            // (caret placement, selection handles, Cut/Copy/Paste). No radial timer, no preventDefault.
            if (Input._kbIntent === "line" && document.activeElement === this) return;
            var touches = e.originalEvent && e.originalEvent.touches;
            var touch = touches && touches[0];
            if (!touch) return;
            var el = this;
            // Prevent the browser from focusing immediately (would open IME
            // before we know if this is a long-press).
            e.preventDefault();
            var state = {
                el: el,
                touchId: touch.identifier,
                startX: touch.clientX,
                startY: touch.clientY,
                long: false,
                moved: false
            };
            Input._lineTouch = state;
            Actionable.beginHoldSelection(state);
            var cancelPx = typeof Actionable !== "undefined" ? Actionable.LongPressMoveCancelPx : 20;
            var longMs = typeof Actionable !== "undefined" ? Actionable.LongPressMs : 500;
            state.timer = setTimeout(function () {
                if (Input._lineTouch !== state) return;
                state.long = true;
                Actionable.fireHoldSelection(state);
                // Long-press: input radial, no keyboard.
                try {
                    var commands = ParchLockQol.GetRadialCommands();
                    var r = el.getBoundingClientRect();
                    ParchLockQol.OpenRadial(r.left + r.width / 2, r.top + r.height / 2, commands, { source: "input" });
                } catch (eR) {}
            }, longMs);
            state.moveHandler = function (ev) {
                if (Input._lineTouch !== state) return;
                var ts = ev.originalEvent && ev.originalEvent.touches;
                var t = ts && ts[0];
                if (!t) return;
                var dx = t.clientX - state.startX, dy = t.clientY - state.startY;
                // Movement cancels only a PENDING hold; once the radial is open
                // the finger may travel to the ring and keeps suppression (P2).
                if (!state.long && (dx * dx + dy * dy) > (cancelPx * cancelPx)) {
                    state.moved = true;
                    Actionable.endHoldSelection(state);
                    clearTimeout(state.timer);
                    Input._lineTouch = null;
                }
            };
            $(document).on("touchmove.pmLineTap", state.moveHandler);
            // Whatever ends this hold (including off-target capture cleanup)
            // also removes the dynamic document touchmove callback.
            state.selectionCleanup = function () { $(document).off("touchmove.pmLineTap", state.moveHandler); };
        }).on("touchend.pmLineTap", ".Input.LineInput", function (e) {
            if (!Input.ManagesMobileIme()) return;
            var state = Input._lineTouch;
            if (!state || state.el !== this) return;
            clearTimeout(state.timer);
            Actionable.endHoldSelection(state);
            $(document).off("touchmove.pmLineTap", state.moveHandler);
            Input._lineTouch = null;
            if (state.long || state.moved) {
                e.preventDefault();
                return;
            }
            // Short tap: user wants the keyboard.
            e.preventDefault();
            Input._kbIntent = "line";
            Input._kbLineEl = this;
            $(this).attr("inputmode", "text");
            try { this.focus(); } catch (eF) {}
        }).on("touchcancel.pmLineTap", ".Input.LineInput", function () {
            var state = Input._lineTouch;
            if (!state || state.el !== this) return;
            clearTimeout(state.timer);
            Actionable.endHoldSelection(state);
            $(document).off("touchmove.pmLineTap", state.moveHandler);
            Input._lineTouch = null;
        });

        // Desktop: normal click focuses line input.
        $(document).off("mousedown.pmLineTap");
        $(document).on("mousedown.pmLineTap", ".Input.LineInput", function () {
            if (Input.ManagesMobileIme()) return;
            Input._kbIntent = "line";
        });

        Input.BindInputRadialTouch();
        try { if (typeof CharKeys !== "undefined") CharKeys.init(); } catch (eCk) {}
        Input.InitMic();
    },

    // D93 (G14): the input-line's own radial menu (undo/save/restore/map/
    // history/transcript "chrome", plus RAM/universal commands -- D26)
    // was reachable only via desktop right-click (js/Qol.js:22,
    // ShowRadialMenu bound to contextmenu on .Input.LineInput). A focused
    // text field's long-press on Android opens the OS's own cut/copy/paste
    // UI, not a page-level radial (confirmed: Qol.js's contextmenu handler
    // never fires from a real touch long-press on a focused input) -- so
    // mobile needs its own, separate touch affordance rather than trying to
    // make the input itself respond to a long-press. Reuses the adjacent
    // #pl-input-submit button (already built, already in the input row) as
    // that affordance: a normal tap still submits (existing click handler
    // above); a ~500ms hold opens the same radial ShowRadialMenu would,
    // same LongPressMs/cancel-threshold convention as Actionable.js's noun
    // long-press, so the two touch gestures feel consistent across the app.
    _submitTouch: null,
    BindInputRadialTouch: () => {

        var $submit = $("#pl-input-submit");
        Actionable.endHoldSelection(Input._submitTouch);
        $submit.off("touchstart.pmInputRadial touchmove.pmInputRadial touchend.pmInputRadial touchcancel.pmInputRadial");
        $submit.on("touchstart.pmInputRadial", function (e) {
            var touches = e.originalEvent && e.originalEvent.touches;
            var touch = touches && touches[0];
            if (!touch) return;
            var el = this;
            Input._submitTouch = { el: el, startX: touch.clientX, startY: touch.clientY, fired: false, touchId: touch.identifier };
            var state = Input._submitTouch;
            Actionable.beginHoldSelection(state);
            state.timer = setTimeout(function () {
                if (Input._submitTouch !== state) return;
                state.fired = true;
                Actionable.fireHoldSelection(state);
                Input._submitHoldAt = Date.now();
                // T10 (operator): holding Send opens the player's recent
                // commands. The general radial stays on the input-line hold
                // and right-click, so nothing is lost.
                var commands = ParchLockQol.GetHistoryRadialCommands();
                var r = el.getBoundingClientRect();
                ParchLockQol.OpenRadial(r.left + r.width / 2, r.top + r.height / 2, commands, { source: "history" });
            }, typeof Actionable !== "undefined" ? Actionable.LongPressMs : 500);
        }).on("touchmove.pmInputRadial", function (e) {
            var state = Input._submitTouch;
            if (!state || state.el !== this) return;
            var touches = e.originalEvent && e.originalEvent.touches;
            var touch = touches && touches[0];
            if (!touch) return;
            var dx = touch.clientX - state.startX, dy = touch.clientY - state.startY;
            var cancelPx = typeof Actionable !== "undefined" ? Actionable.LongPressMoveCancelPx : 20;
            // Only a pending hold is cancelled by movement (P2); a fired one
            // keeps suppression while the finger moves to the history ring.
            if (!state.fired && (dx * dx + dy * dy) > (cancelPx * cancelPx)) {
                clearTimeout(state.timer);
                Actionable.endHoldSelection(state);
                Input._submitTouch = null;
            }
        }).on("touchend.pmInputRadial", function (e) {
            var state = Input._submitTouch;
            if (!state || state.el !== this) return;
            clearTimeout(state.timer);
            Actionable.endHoldSelection(state);
            if (state.fired) {
                // Duplicate-submission prevention: the long-press already
                // opened the radial -- stop this touch's own trailing
                // synthetic click from ALSO submitting the line.
                e.preventDefault();
                Input._submitHoldAt = Date.now();   // T10: also guard a late click
            }
            Input._submitTouch = null;
        }).on("touchcancel.pmInputRadial", function () {
            var state = Input._submitTouch;
            if (!state || state.el !== this) return;
            clearTimeout(state.timer);
            Actionable.endHoldSelection(state);
            Input._submitTouch = null;
        });
    },

    // ======================================================================
    // Voice input (D95). Two modes, chosen by Global.Prefs.MicHoldToTalk:
    //   hold (default) -- records for as long as the button is held;
    //   tap            -- tap to start, ends by itself on silence, tap again to stop.
    //
    // Designed around how the engines really behave, not an idealised model:
    //   * Android's SpeechRecognizer (via @capacitor-community/speech-recognition)
    //     ends EACH session by itself a moment after speech stops, so one start()
    //     can never last "as long as the button is held". Hold mode therefore runs
    //     back-to-back segments while the finger is down and accumulates the text.
    //   * A session that heard nothing rejects ("No match" / "No speech input").
    //     That is a normal outcome of pressing without speaking, not a failure.
    //   * The permission/availability checks are async and the permission prompt
    //     steals the touch, so feedback must not wait on them, and a release that
    //     happens before recognition has started must cancel cleanly.
    // Nothing is inserted until the gesture ends. D167 (operator request)
    // revises R2's "nothing is ever submitted": a HOLD gesture now submits the
    // transcript on release when Global.Prefs.MicAutoSendOnRelease is on (the
    // default), because holding the button is itself a deliberate "say this and
    // go". TAP mode still only inserts and never submits -- the operator asked
    // for that explicitly, and it keeps the original dictate-then-edit flow for
    // anyone who wants it. The preference turns the hold behaviour off too.
    // ======================================================================
    NativeMicPlugin: () => (window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.SpeechRecognition) || null,
    // D133: support means "a recognizer exists", nothing more. An earlier cut
    // of this also required window.isSecureContext, on the assumption that a
    // file:// page is insecure -- MEASURED AND WRONG: Chromium reports
    // isSecureContext === true for file:// URLs, so that gate hid nothing on
    // the desktop distribution while risking hiding the button on legitimate
    // setups. Whether the microphone can actually be reached is only knowable
    // by trying, so availability is presence-based here and any real failure
    // is explained at the moment it happens (see classify/unavailableReason).
    // D133 follow-up (operator-reported): on a file:// page the browser has no
    // real origin to remember a permission against, so EVERY start re-prompts
    // -- and in hold-to-talk the prompt steals focus, which fires the button's
    // release, which lets the next press prompt again. The result is the
    // permission dialog reappearing no matter which button you pick. That is
    // not a bug we can fix from inside the page; a local file simply cannot
    // hold a microphone grant. Treat it as unsupported so the button shows
    // its struck-through state and explains the situation once, instead of
    // trapping the player in a prompt loop.
    //
    // (isSecureContext is NOT the right test -- measured: Chromium reports it
    // true for file:// URLs. The protocol is.)
    MicWebSupported: () => {
        if (!(window.SpeechRecognition || window.webkitSpeechRecognition)) return false;
        try { if (String(location.protocol).toLowerCase() === "file:") return false; } catch (e) {}
        return true;
    },
    MicSupported: () => !!(Input.NativeMicPlugin() || Input.MicWebSupported()),
    InitMic: () => Input.Mic.init(),

    Mic: {
        epoch: 0,          // bumped per gesture; stale async results compare against it
        active: false,     // a gesture (hold or tap session) is in progress
        held: false,       // finger/mouse currently down (hold mode)
        hold: true,        // current mode
        parts: [],         // text of finished segments
        seg: null,         // current recognizer segment {stop()}
        finalizing: false, // released, waiting for the last segment
        ready: false,      // native availability + permission already confirmed
        touchAt: 0,
        statusTimer: 0,
        lastError: "",     // diagnostics only -- never displayed

        // ---- UI ----
        // NO TEXT, ever (operator: no clutter). The BUTTON is the whole indicator:
        //   lit (pl-mic-active)     -- recording; in hold mode exactly as long as it is held
        //   dimmed (pl-mic-busy)    -- released, the recognizer is delivering its last words
        //   red + circle-with-a-line (pl-mic-error) -- a genuine failure, for ~2.5s.
        //     A title attribute is invisible on a touchscreen, so a failure has to be
        //     shown on the button itself; the reason goes to lastError/console only.
        ui: (state, msg) => {
            var $b = $("#pl-input-mic");
            $b.toggleClass("pl-mic-active", state === "listening")
              .toggleClass("pl-mic-busy", state === "finishing")
              .toggleClass("pl-mic-error", state === "error")
              .attr("aria-pressed", state === "listening" ? "true" : "false");
            clearTimeout(Input.Mic.statusTimer);
            if (state === "error") {
                Input.Mic.lastError = msg || "error";
                try { console.warn("Voice input: " + Input.Mic.lastError); } catch (e) {}
                Input.Mic.statusTimer = setTimeout(() => { $b.removeClass("pl-mic-error"); }, 2500);
                // D133: a red flash alone tells the player nothing they can act
                // on. A blocked microphone or a recognizer that cannot reach
                // its service is a fixable situation, so say what it is -- once
                // per session, so a repeated failure cannot nag.
                if (!Input.Mic._explained && Input.Mic.isActionableError(Input.Mic.lastError)) {
                    Input.Mic._explained = true;
                    var r = Input.Mic.unavailableReason(Input.Mic.lastError);
                    try { Message.Show(r.title, r.body, true); } catch (e2) {}
                }
            }
        },
        buzz: (ms) => { try { if (navigator.vibrate) navigator.vibrate(ms); } catch (e) {} },

        // Why can't we listen? Each case has a different, actionable answer,
        // so this never gives a generic "not supported" shrug.
        _explained: false,

        // Errors worth interrupting the player for: ones they can actually do
        // something about. A transient no-speech/aborted is not one.
        isActionableError: (err) => /not-allowed|service-not-allowed|denied|permission|network|audio-capture/i.test(String(err || "")),

        unavailableReason: (err) => {
            var hasCtor = !!(window.SpeechRecognition || window.webkitSpeechRecognition);
            var e = String(err || "");
            var native = !!(window.Capacitor && typeof window.Capacitor.isNativePlatform === "function"
                && window.Capacitor.isNativePlatform());

            var isFile = false;
            try { isFile = String(location.protocol).toLowerCase() === "file:"; } catch (e2) {}
            if (isFile && !native) {
                return {
                    title: "Voice input needs ParchLock installed",
                    body: "This copy is open as a local file, and a browser cannot remember microphone " +
                          "permission for a file — it would ask again every single time you spoke. " +
                          "Install ParchLock as an app, or open it from an http address, and voice input " +
                          "works normally. Everything else is unaffected, and you can always type your commands."
                };
            }
            if (/not-allowed|denied|permission|audio-capture/i.test(e)) {
                return {
                    title: "ParchLock needs the microphone",
                    body: "Voice input was blocked. Allow microphone access for this page in your browser " +
                          "(the padlock or camera icon in the address bar), and check that a microphone is " +
                          "plugged in and selected. You can always type your commands instead."
                };
            }
            if (/network|service-not-allowed/i.test(e)) {
                return {
                    title: "Voice input could not reach its service",
                    body: "Your browser's speech recognition sends audio to an online service, so it needs " +
                          "an internet connection — and it is often refused when the page is opened as a " +
                          "local file. Installing ParchLock as an app, or opening it from an https address, " +
                          "resolves both. You can always type your commands instead."
                };
            }

            if (native) {
                return {
                    title: "Voice input unavailable",
                    body: "This device's speech recognition service did not load. Check that microphone " +
                          "permission is granted to ParchLock in your system settings, and that a speech " +
                          "recognition service is installed and enabled."
                };
            }
            if (!hasCtor) {
                return {
                    title: "Voice input not supported here",
                    body: "This browser does not provide speech recognition. Chrome or Edge support it; " +
                          "Firefox and Safari on the desktop currently do not. You can always type your " +
                          "commands instead, and the Android app has its own built-in voice input."
                };
            }
            return {
                title: "Voice input unavailable",
                body: "Speech recognition could not be started. You can always type your commands instead."
            };
        },

        // ---- engine selection ----
        classify: (err) => {
            var m = String((err && (err.message || err.error)) || err || "");
            if (/no match|no speech|didn'?t understand|aborted|no-speech/i.test(m)) return { quiet: true };
            if (/busy|client side/i.test(m)) return { retry: true, message: "Voice input busy - try again" };
            if (/permission|not-allowed|service-not-allowed/i.test(m)) return { message: "Microphone permission denied", perm: true };
            if (/audio-capture|audio recording/i.test(m)) return { message: "No microphone available" };
            if (/network|server/i.test(m)) return { message: "Voice input needs a network connection" };
            return { message: "Voice input failed" + (m ? " (" + m + ")" : "") };
        },
        // Resolves {ok:true} or {ok:false,message}. Native is checked once, then cached.
        ensure: () => {
            var M = Input.Mic, native = Input.NativeMicPlugin();
            if (!native) return Promise.resolve({ ok: Input.MicWebSupported(), message: "Voice input unavailable" });
            if (M.ready) return Promise.resolve({ ok: true });
            return native.available().then((res) => {
                if (!res || !res.available) return { ok: false, message: "Voice input unavailable on this device" };
                return native.checkPermissions().then((st) => {
                    if (st && st.speechRecognition === "granted") return true;
                    return native.requestPermissions().then((rq) => !!(rq && rq.speechRecognition === "granted"));
                }).then((granted) => {
                    if (!granted) return { ok: false, message: "Microphone permission denied" };
                    M.ready = true;
                    return { ok: true };
                });
            }).catch((err) => ({ ok: false, message: "Voice input failed" + (err && err.message ? " (" + err.message + ")" : "") }));
        },
        // One recognizer session. Resolves {text} or {err} -- never rejects.
        // ---- I3/P3 lifecycle + diagnostics (metadata only, never recognised text) ----
        // The recognizer's real end is its START promise settling (onResults /
        // onError). The installed plugin's stop() call is never resolved, so it
        // is fired and never awaited. `live` is the most recent segment, across
        // gestures, so a new press can wait for it to end.
        live: null,
        diag: {
            ring: [],
            // A JS session id and boot time tell a slow episode in a demonstrably
            // fresh runtime apart from a resumed one (closing the app need not
            // destroy the WebView). The build is read once, asynchronously.
            session: { id: Math.random().toString(36).slice(2, 10), bootAt: Date.now() },
            // App and shell results are stored separately and composed at export,
            // so neither async completion order can lose the other.
            build: null,
            buildApp: "",
            buildShell: "",
            readBuild: () => {
                var d = Input.Mic.diag;
                if (d.build !== null) return;
                d.build = "";
                try {
                    var app = window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.App;
                    if (app && app.getInfo) app.getInfo().then((i) => { d.buildApp = (i && (i.version + "/" + i.build)) || ""; }, () => {});
                } catch (e) {}
                try {
                    if (window.caches && caches.keys) caches.keys().then((ks) => {
                        d.buildShell = ks.filter((x) => /^parchlock-shell/.test(x)).pop() || "";
                    }, () => {});
                } catch (e) {}
            },
            buildText: () => { var d = Input.Mic.diag; return [d.buildApp, d.buildShell].filter(Boolean).join(" "); },
            add: (type, data) => {
                Input.Mic.diag.readBuild();
                var r = Input.Mic.diag.ring, tts = (typeof ReadAloud !== "undefined" && ReadAloud.ttsCounts) || {};
                r.push(Object.assign({ t: Date.now(), type: type, ttsSpeak: tts.speak || 0, ttsStop: tts.stop || 0, ttsStopFail: tts.stopFail || 0 }, data || {}));
                if (r.length > 50) r.splice(0, r.length - 50);
            },
            export: () => JSON.stringify({ at: new Date().toISOString(), ua: (typeof navigator !== "undefined" && navigator.userAgent) || "",
                session: Input.Mic.diag.session.id, sessionBootAt: new Date(Input.Mic.diag.session.bootAt).toISOString(),
                uptimeMs: Date.now() - Input.Mic.diag.session.bootAt, build: Input.Mic.diag.buildText(),
                backend: Input.NativeMicPlugin() ? "native" : "web", events: Input.Mic.diag.ring }, null, 1)
        },
        // Calls `then` once the previous segment has settled. After a bounded wait
        // it is abandoned (its gesture epoch is already stale, so its text can
        // never commit):
        //   native -- the plugin destroys and recreates its recognizer per start;
        //   web    -- the old SpeechRecognition is aborted, and a new one starts
        //             only once that abort has actually ended it. A web session
        //             that will not end fails closed (`fail`): never two at once.
        whenIdle: (then, fail) => {
            var M = Input.Mic, prev = M.live;
            if (!prev || prev.settled) return then();
            M.diag.add("wait-prev", { backend: prev.backend, ageMs: Date.now() - prev.startedAt });
            var done = false, finish = (how) => {
                if (done) return; done = true;
                if (how === "settled") return then();
                if (how === "abandon") {
                    prev.abandoned = true;
                    M.diag.add("abandon-prev", { backend: prev.backend, ageMs: Date.now() - prev.startedAt });
                    if (M.live === prev) M.live = null;
                    return then();
                }
                M.diag.add("prev-unresettable", { backend: prev.backend, ageMs: Date.now() - prev.startedAt });
                if (fail) fail();
            };
            prev.promise.then(() => finish("settled"), () => finish("settled"));
            setTimeout(() => {
                if (done) return;
                if (prev.backend !== "web") return finish("abandon");
                prev.abandoned = true;
                M.diag.add("abort-prev", { backend: "web", ageMs: Date.now() - prev.startedAt });
                if (prev.abort) prev.abort();
                setTimeout(() => finish("fail"), 1000);   // the abort's onend settles it -> "settled" first
            }, 2500);
        },
        segment: (continuous) => {
            var native = Input.NativeMicPlugin(), M = Input.Mic, s;
            if (native) {
                s = {
                    promise: native.start({ partialResults: false }).then(
                        (r) => ({ text: (r && r.matches && r.matches[0]) || "" }),
                        (err) => ({ err: err })),
                    stop: () => { try { native.stop().catch(() => {}); } catch (e) {} }
                };
                return M.track(s, "native");
            }
            var R = window.SpeechRecognition || window.webkitSpeechRecognition, rec = new R(), text = "";
            rec.continuous = !!continuous;
            rec.interimResults = false;
            var promise = new Promise((resolve) => {
                rec.onresult = (e) => {
                    for (var i = e.resultIndex; i < e.results.length; i++) {
                        if (e.results[i].isFinal) text += (text ? " " : "") + String(e.results[i][0].transcript || "").trim();
                    }
                };
                rec.onerror = (e) => resolve({ err: e, text: text });
                rec.onend = () => resolve({ text: text });
                try { rec.start(); } catch (e) { resolve({ err: e, text: text }); }
            });
            return M.track({ promise: promise, stop: () => { try { rec.stop(); } catch (e) {} },
                abort: () => { try { rec.abort(); } catch (e) {} } }, "web");
        },
        // Stamps a segment's start/settle for the barrier and the diagnostics.
        track: (s, backend) => {
            var M = Input.Mic;
            s.startedAt = Date.now(); s.settled = false; s.backend = backend;
            M.live = s;
            M.diag.add("start", { backend: backend });
            s.promise = s.promise.then((r) => {
                s.settled = true;
                var code = r && r.err ? String((r.err && (r.err.error || r.err.code || r.err.message)) || r.err).slice(0, 40) : null;
                M.diag.add("settle", { backend: backend, ms: Date.now() - s.startedAt, hasText: !!(r && r.text), err: code, abandoned: !!s.abandoned });
                if (M.live === s) M.live = null;
                return r;
            });
            return s;
        },

        // ---- gesture ----
        press: () => {
            var M = Input.Mic, ttsStopped = Promise.resolve();
            // Ignored presses and the tap-mode stop tap must not cancel narration
            // deferred during recording (it resumes after commit) -- only a NEW
            // recording silences read-aloud.
            if (M.finalizing) return;
            if (M.active) {                       // tap mode: second tap stops
                if (!M.hold) M.release();
                return;
            }
            try { if (typeof ReadAloud !== "undefined" && ReadAloud.stop) ttsStopped = Promise.resolve(ReadAloud.stop()).catch(() => {}); } catch (e) {}
            M.hold = !(typeof Global !== "undefined" && Global.Prefs && Global.Prefs.MicHoldToTalk === false);
            M.epoch++; M.active = true; M.held = true; M.parts = []; M.seg = null;
            try { Input.DismissKeyboard(); } catch (e) {}
            M.ui("listening");
            M.buzz(12);
            var e0 = M.epoch;
            // Watchdog: if the release event is ever lost (element hidden mid-press, OS
            // interruption) the mic must not stay lit and recording forever.
            if (M.hold) setTimeout(() => { if (M.epoch === e0 && M.held) M.release(); }, 60000);
            M.diag.add("press", { hold: M.hold });
            // I3/P3: never start recognition over narration still releasing the
            // audio (bounded: a hung TTS stop cannot block the mic), nor over a
            // previous recognizer session that has not ended.
            var ttsAt = Date.now();
            Promise.race([ttsStopped.then(() => "settled"), new Promise((r) => setTimeout(() => r("timeout"), 600))]).then((how) => {
                M.diag.add("tts-wait", { result: how, ms: Date.now() - ttsAt });
                if (M.epoch !== e0) return;
                M.whenIdle(() => { if (M.epoch === e0) M.run(e0); },
                    () => { if (M.epoch === e0) M.commit(e0, false, "Voice input busy - try again"); });
            });
        },
        release: () => {
            var M = Input.Mic;
            if (!M.active || M.finalizing) return;
            M.held = false;
            M.finalizing = true;
            M.diag.add("release", { segPending: !!M.seg });
            M.ui("finishing");
            M.buzz(8);
            if (M.seg) M.seg.stop();
            var e = M.epoch;                      // safety net: never hang if the engine never settles
            setTimeout(() => { if (M.epoch === e && M.active) M.commit(e, true); }, 4000);
        },
        run: (e) => {
            var M = Input.Mic, retries = 0, empties = 0;
            var step = () => {
                if (M.epoch !== e) return;
                if (M.hold && !M.held) return M.commit(e);        // released before/between segments
                var s = M.segment(M.hold);
                M.seg = s;
                s.promise.then((r) => {
                    if (M.epoch !== e) return;                    // abandoned or superseded: never commits
                    M.seg = null;
                    if (r.text) { M.parts.push(r.text); empties = 0; }
                    var c = r.err ? M.classify(r.err) : null;
                    if (c && !c.quiet) {
                        if (c.retry && retries++ < 2 && M.held) return setTimeout(step, 300);
                        if (c.perm) M.ready = false;
                        return M.commit(e, false, c.message);
                    }
                    if (M.hold && M.held) {
                        // Recognizer ended by itself mid-hold: keep going. Only a segment
                        // that ends EMPTY almost at once (< 1s -- the busy/error loop that
                        // hammers the speech service) counts toward backoff; an ordinary
                        // silence timeout during a pause resets it, so a held button keeps
                        // listening through pauses and long dictation (I3/P3).
                        var quick = !r.text && (Date.now() - s.startedAt) < 1000;
                        if (!quick) empties = 0;
                        else if (++empties >= 3) { M.diag.add("backoff-stop", { empties: empties }); return M.commit(e); }
                        return setTimeout(step, quick ? Math.min(2000, 150 * Math.pow(2, empties)) : 150);
                    }
                    M.commit(e);
                });
            };
            var ensureAt = Date.now();
            M.diag.add("ensure-begin", { cached: !!M.ready });
            M.ensure().then((res) => {
                M.diag.add("ensure-end", { ok: !!res.ok, ms: Date.now() - ensureAt });
                if (M.epoch !== e) return;
                if (!res.ok) return M.commit(e, false, res.message);
                if (M.hold && !M.held) {
                    // The permission prompt (or a quick tap) ended the press before we could start.
                    M.commit(e);
                    return;
                }
                step();
            });
        },
        commit: (e, forced, errMsg) => {
            var M = Input.Mic;
            if (M.epoch !== e || !M.active) return;
            M.epoch++;                             // any late engine callbacks are now stale
            if (M.seg && forced) M.seg.stop();
            var text = M.parts.join(" ").replace(/\s+/g, " ").trim();
            M.diag.add("commit", { forced: !!forced, err: errMsg ? String(errMsg).slice(0, 40) : null, hasText: !!text, segments: M.parts.length });
            M.active = false; M.held = false; M.finalizing = false; M.seg = null; M.parts = [];
            if (errMsg) M.ui("error", errMsg);
            else {
                M.ui("idle");
                if (text) Input.Mic.insert(text, M.hold);
            }
            // Narration deferred while recording resumes on every outcome. After
            // insert, so a submitted command's own reply supersedes a stale UI line.
            try { if (typeof ReadAloud !== "undefined" && ReadAloud.resumeAfterMic) ReadAloud.resumeAfterMic(); } catch (e2) {}
        },
        // `fromHold` is true only for a press-and-hold gesture, never for tap.
        insert: (text, fromHold) => {
            var autoSend = true;
            try {
                if (typeof Global !== "undefined" && Global.Prefs
                    && Global.Prefs.MicAutoSendOnRelease === false) autoSend = false;
            } catch (e) {}
            if (fromHold && autoSend) {
                // Submit through the same choke-point every other control uses
                // (map room taps, exit chips, the radial), so voice is not a
                // second submission path with its own rules.
                var say = String(text || "").trim();
                if (say) {
                    try { Input.Clear(); } catch (e) {}
                    try {
                        if (typeof Actionable !== "undefined" && Actionable.Submit) {
                            Actionable.Submit(say, 'user-voice');
                            return;
                        }
                    } catch (e) {}
                    // No Actionable (library page, or it failed to load): fall
                    // through and insert rather than losing what was said.
                }
            }
            Input.Mic.place(text);
        },
        place: (text) => {
            var cur = $(".Input.LineInput").val() || "";
            Input.Inject((cur && !/\s$/.test(cur) ? " " : "") + text, false);
            // Do not Focus() on mobile -- leaves the IME up after speech.
            if (!Input.ManagesMobileIme()) Input.Focus();
        },
        abort: () => { var M = Input.Mic; if (M.active && !M.finalizing) M.release(); },

        // ---- wiring ----
        init: () => {
            var M = Input.Mic, $mic = $("#pl-input-mic");
            // D133: the body flag drives --pl-mic-gutter, the width the desktop
            // line input gives up to make room for this button. The button is
            // always present now, so the gutter is always reserved and the two
            // can never disagree (a reserved gap with no button, or a button
            // sitting over the input).
            $mic.removeAttr("hidden");
            try { document.body.classList.add("pl-mic-available"); } catch (e) {}

            // Voice unavailable: show the button struck through rather than
            // hiding it. A missing control teaches nothing -- the player is
            // left wondering whether the app has voice at all. A struck-through
            // one that explains itself on click tells them exactly what is
            // wrong and what to do about it.
            if (!Input.MicSupported()) {
                $mic.off(".pmMic .pmMicHold click.pmInputRow")
                    .addClass("pl-mic-unavailable")
                    .attr({ "aria-disabled": "true", "aria-pressed": "false",
                            "aria-label": "Voice input unavailable",
                            title: "Voice input unavailable — tap for details" });
                $mic.on("click.pmMic", function (e) {
                    e.preventDefault();
                    var r = M.unavailableReason();
                    try { Message.Show(r.title, r.body, true); } catch (e2) {}
                });
                return;
            }
            $mic.removeClass("pl-mic-unavailable").removeAttr("aria-disabled");
            $mic.off(".pmMic click.pmInputRow touchstart.pmMicHold touchend.pmMicHold touchcancel.pmMicHold mousedown.pmMicHold mouseup.pmMicHold mouseleave.pmMicHold");
            $(document).off("mouseup.pmMic visibilitychange.pmMic");
            $(window).off("blur.pmMic");
            M.hold = !(typeof Global !== "undefined" && Global.Prefs && Global.Prefs.MicHoldToTalk === false);
            $mic.attr({ "aria-pressed": "false", "aria-label": M.hold ? "Hold to talk" : "Tap to talk", title: M.hold ? "Hold to talk" : "Tap to talk" });
            // A long press must never start text selection or the OS context menu:
            // either one cancels the touch and would cut the recording short.
            $mic.on("contextmenu.pmMic dragstart.pmMic selectstart.pmMic", (e) => { e.preventDefault(); return false; });
            if (M.hold) {
                $mic.on("touchstart.pmMic", (e) => { e.preventDefault(); e.stopPropagation(); M.touchAt = Date.now(); M.press(); });
                $mic.on("touchend.pmMic touchcancel.pmMic", (e) => { e.preventDefault(); e.stopPropagation(); M.release(); });
                // Desktop / mouse fallback.
                $mic.on("mousedown.pmMic", (e) => { if (e.button !== 0 || Date.now() - M.touchAt < 800) return; e.preventDefault(); M.press(); });
                $(document).on("mouseup.pmMic", () => { if (Date.now() - M.touchAt >= 800) M.release(); });
            } else {
                $mic.on("touchstart.pmMic", (e) => { e.preventDefault(); e.stopPropagation(); M.touchAt = Date.now(); M.press(); });
                $mic.on("touchend.pmMic touchcancel.pmMic", (e) => { e.preventDefault(); e.stopPropagation(); });
                $mic.on("click.pmMic", () => { if (Date.now() - M.touchAt < 800) return; M.press(); });
            }
            // Losing the page (call, app switch, dialog) must not leave a recording running.
            $(document).on("visibilitychange.pmMic", () => { if (document.hidden) M.abort(); });
            $(window).on("blur.pmMic", () => M.abort());
        }
    },

    KeyPressed: (e) => {

        // D105: keys typed into the char-prompt key proxy are decoded by CharKeys (letters reach the game as keypress);
        // they must never also run the app's global shortcuts (map toggle, autocomplete, Escape chrome).
        if (e && e.target && e.target.id === "pl-key-proxy") return;

        if ($(e.target).closest("#message, #dialog").length && e.key !== "Escape") {
            if (Message.IsOpen && e.key === "Tab") {
                var controls = $("#message").find("button, input, textarea, select, summary, a[href], [tabindex='0']").filter(":visible:not(:disabled)").toArray();
                var index = controls.indexOf(document.activeElement);
                if (controls.length) { e.preventDefault(); controls[(index + (e.shiftKey ? controls.length - 1 : 1)) % controls.length].focus(); }
            }
            return;
        }
        if (e.key != "Tab") Autocomplete.CurrentToggleWord = "";

        if (Message.IsOpen && !Message.NoTypeToClose && e.key !== "Escape" && !$(e.target).closest("#message").length) {
            
            Message.Hide();
            setTimeout(() => Input.Clear(), 100);
        }

        if (e.shiftKey && e.ctrlKey) {

            switch(e.key) {

                case "/": Input.Clear(); Input.Inject("n", true); break;
                case "*": Input.Clear(); Input.Inject("n", true); break;
                case "Clear": Input.Clear(); Input.Inject("s", true); break;
                case "ArrowLeft": Input.Clear(); Input.Inject("w", true); break;
                case "ArrowRight": Input.Clear(); Input.Inject("e", true); break;
                case "PageUp": Input.Clear(); Input.Inject("ne", true); break;
                case "PageDown": Input.Clear(); Input.Inject("se", true); break;
                case "End": Input.Clear(); Input.Inject("sw", true); break;
                case "Home": Input.Clear(); Input.Inject("nw", true); break;
            }
        }
        else {
            
            switch(e.key) {

                case "Tab":
                    // B7 a11y: autocomplete Tab only when the command line (or its
                    // key-proxy) owns focus. Chrome buttons/tabs need native Tab.
                    if (!$(e.target).closest(".Input.LineInput, .Input.CharInput, #pl-key-proxy, .LineInput, .CharInput").length) {
                        break;
                    }
                    e.preventDefault();
                    if (Input.Value().length > 0) {
                        Autocomplete.ToggleSuggestions(Input.Value());
                    }
                    break;
                
                case "`": 
                
                    setTimeout(() => {

                        if (Input.Value().length == 1) {
    
                            Input.Clear(); 
                            ParchLockMap.Toggle(); 
                        }

                    }, 100);

                    break;

                case "Escape": 

                    if (typeof CharKeys !== "undefined" && CharKeys.isPadOpen()) {

                        CharKeys.closeArrowPad();
                    }
                    else if ($("#radial-menu").hasClass("show")) {

                        ParchLockQol.HideRadialMenu(e);
                    }
                    else if (Message.IsOpen) {

                        Message.Hide();
                    }
                    else if ($("#dialog_cancel").length) {

                        $("#dialog_cancel").trigger("click");
                    }
                    else if (typeof WorldMap !== "undefined" && WorldMap.IsOpen()) {

                        WorldMap.Close();
                    }
                    else {

                        Input.Clear();
                        ParchLockMap.Toggle();
                    }
                    
                    break;

                case "ArrowUp":

                    if (e.ctrlKey) {

                        e.preventDefault();
                        Input.RecallHistory(1);
                    }

                    break;

                case "ArrowDown":

                    if (e.ctrlKey) {

                        e.preventDefault();
                        Input.RecallHistory(-1);
                    }

                    break;
            }
        }
    },

    RecallHistory: (direction) => {

        var history = ParchLockQol.GetHistory();
        if (!history.length) return;

        Input.HistoryIndex += direction;
        if (Input.HistoryIndex < 0) Input.HistoryIndex = history.length - 1;
        if (Input.HistoryIndex >= history.length) Input.HistoryIndex = 0;

        Input.Clear();
        Input.Inject(history[Input.HistoryIndex]);
    },


    GetLastDirection: () => {

        var dir = null;

        // Scan backwards and get the text that was added after the last input
        $($(".Style_input").get().reverse()).each(function() {

            var line = $(this);

            var text = line.text().trim().toLowerCase();
    
            if (Directions[text]) {

                dir = Directions[text];
                return false;
            }
        });

        return dir;
    },

    SpecialCommandDetected: (text) => {

        Input.Clear();
    },

    GetAllRoomCommands: () => {

        return [ "/goto","/room-notes", "/see" ].sort();
    },

    GetAllSpecialCommands: () => {

        return [ "/commands", "/display", "/export-map", "/help", "/history", "/items", "/map", "/micdiag", "/note", "/clear", "/goto", "/notes", "/room-notes", "/quit", "/see", "/theme", "/tools", "/transcript" ].sort();
    },

    Process: () => {

        var value = $(".Input.LineInput").val();
        if (!value) {
         
            Autocomplete.Clear();
            return;
        }

        if (Message.IsOpen && !Message.NoTypeToClose) Message.Hide();

        var text = value.trim();
        var lastChar = text[text.length - 1];

        if (text.length > 1 && text[0] == "/") {

            if (text.toLowerCase() == "/help") {

                Input.SpecialCommandDetected(text);
                Message.ShowHelp();
            }
            else if (text.toLowerCase() == "/commands") {

                Input.SpecialCommandDetected(text);
                ParchLockQol.ShowCommands();
            }
            else if (text.toLowerCase() == "/display") {

                Input.SpecialCommandDetected(text);
                ParchLockQol.ShowDisplay();
            }
            else if (text.toLowerCase() == "/micdiag") {

                // I3/P3: voice-input timing diagnostics (metadata only: timings,
                // error codes, TTS counts -- never recognised text), for the
                // player to copy after a slow episode.
                Input.SpecialCommandDetected(text);
                var json = Input.Mic.diag.export().replace(/&/g, "&amp;").replace(/</g, "&lt;");
                Message.Show("Voice diagnostics", "<p>Copy this after voice input becomes slow.</p><textarea readonly style='width:100%;height:55vh;font-size:12px'>" + json + "</textarea>", true);
            }
            else if (text.toLowerCase() == "/history") {

                Input.SpecialCommandDetected(text);
                ParchLockQol.ShowHistory();
            }
            else if (text.toLowerCase() == "/export-map") {

                Input.SpecialCommandDetected(text);
                ParchLockMap.ExportMap();
            }
            else if (text.toLowerCase() == "/transcript") {

                Input.SpecialCommandDetected(text);
                ParchLockQol.ShowTranscript();
            }
            else if (text.toLowerCase() == "/tools") {

                Input.SpecialCommandDetected(text);
                $("body").addClass("tools-button-visible");
                ParchLockQol.ToggleTools();
            }
            else if (text.toLowerCase() == "/items") {
                Input.SpecialCommandDetected(text);
                Actionable.ShowInventory();
            }
            else if (text.toLowerCase() == "/map") {

                Input.SpecialCommandDetected(text);
                ParchLockMap.Toggle();
            }
            else if (text.toLowerCase() == "/clear map") {

                Input.SpecialCommandDetected(text);
                ParchLockMap.Clear();
            }
            else if (text.toLowerCase() == "/clear notes") {

                Input.SpecialCommandDetected(text);
                ParchLockMap.ClearNotes();
            }
            else if (text.toLowerCase() == "/theme") {
                
                Input.SpecialCommandDetected(text);
                Global.ToggleTheme();
            }
            else if (text.toLowerCase() == "/notes") {

                Input.SpecialCommandDetected(text);
                ParchLockMap.ShowNotes();
            }
            else if (text.toLowerCase() == "/quit") {

                Input.SpecialCommandDetected(text);
                WorkspaceUI.ExitGame();
            }
            else if (text.toLowerCase().includes("/room-notes") && lastChar == ";") {

                Input.SpecialCommandDetected(text);
                var roomName = text.replace("/room-notes", "").replace(";", "").trim();
                ParchLockMap.ShowNotes(null, roomName);
            }
            else if (text.toLowerCase().includes("/goto") && lastChar == ";") {

                Input.SpecialCommandDetected(text);
                var roomName = text.replace("/goto", "").replace(";", "").trim();
                var room = ParchLockMap.GetRoom(roomName);

                if (room) {

                    Navigator.FindRoute(ParchLockMap.GetCurrentRoom(), room);
                }
                else {

                    Message.RoomNotFound(roomName);
                }
            }
            else if (text.toLowerCase().includes("/see") && lastChar == ";") {

                Input.SpecialCommandDetected(text);
                var roomName = text.replace("/see", "").replace(";", "").trim();

                if (roomName.toLowerCase() == "me") {

                    ParchLockMap.Draw();
                }
                else {

                    var room = ParchLockMap.GetRoom(roomName);
    
                    if (room) {
    
                        ParchLockMap.Draw(roomName);
                    }
                    else {
    
                        Message.RoomNotFound(roomName);
                    }
                }
            }
            else if (text.toLowerCase().includes("/note") && lastChar == ";") {

                Input.SpecialCommandDetected(text);
                var note = text.replace("/note", "").replace(";", "");

                ParchLockMap.AddNote(note);
            }
        }

        Autocomplete.Suggest(value);
    }
}
