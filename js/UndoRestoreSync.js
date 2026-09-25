var UndoRestoreSync = {
    generation: 0,
    pending: false,
    noteCommand: function (cmd) {
        var s = String(cmd || "").trim().toLowerCase();
        if (/^(undo|restore|restart|load)\b/.test(s)) {
            UndoRestoreSync.pending = true;
        }
    },
    resync: function () {
        UndoRestoreSync.generation++;
        UndoRestoreSync.pending = false;
        try {
            if (typeof ZvmCapture !== "undefined" && ZvmCapture.tick) ZvmCapture.tick();
            if (typeof WorldModel !== "undefined" && WorldModel.tick) WorldModel.tick();
            // Reset topology previous room so next location is fresh from RAM cascade
            if (typeof MapTopology !== "undefined") {
                MapTopology.prevRoomId = null;
                MapTopology.prevRoomName = "";
                if (WorldModel.lastPayload) MapTopology.tick(WorldModel.lastPayload);
            }
            if (typeof Actionable !== "undefined" && Actionable.Refresh) Actionable.Refresh();
            if (typeof ParchLockMap !== "undefined" && ParchLockMap.Draw) ParchLockMap.Draw();
            // Operator: restore updated the map but story text stayed stale.
            // Force buffer scroll + another WorldModel tick after the terp
            // has painted the restored room description.
            try {
                if (typeof TranslatorUI !== "undefined" && TranslatorUI.tick) TranslatorUI.tick();
            } catch (eT) {}
            try {
                if (typeof ParchLock !== "undefined" && ParchLock.ScrollToBottom) {
                    ParchLock.ContentHeight = 0;
                    ParchLock.ScrollToBottom();
                }
            } catch (eS) {}
            setTimeout(function () {
                try {
                    if (typeof ZvmCapture !== "undefined" && ZvmCapture.tick) ZvmCapture.tick();
                    if (typeof WorldModel !== "undefined" && WorldModel.tick) WorldModel.tick();
                    if (typeof Actionable !== "undefined" && Actionable.Refresh) Actionable.Refresh();
                    if (typeof ParchLock !== "undefined" && ParchLock.ScrollToBottom) {
                        ParchLock.ContentHeight = 0;
                        ParchLock.ScrollToBottom();
                    }
                } catch (e2) {}
            }, 400);
            // D88 Stage 5: pending/generation-bound semantic evidence must not
            // survive a real undo/restore/restart (PRODUCTION_PLAN.md's
            // sidecar-persistence step) -- only independently established,
            // already-persisted build-stable facts do. Nothing is ever
            // "confirmed" yet (Stage 4 has no structural witness wired), so
            // today this clears everything currently in Evidence; once a
            // later stage adds real confirmation, only the unconfirmed
            // remainder will be cleared here.
            if (typeof SemanticActions !== "undefined" && SemanticActions.generationReset) SemanticActions.generationReset();
        } catch (e) {}
    },
    tick: function () {
        if (!UndoRestoreSync.pending) return;
        // Allow terp to apply undo/restore first
        setTimeout(function () { UndoRestoreSync.resync(); }, 250);
    },
    // D94: opcode-level entry point. js/ZvmCapture.js wraps the VM's
    // restore_undo / restore_file / restart and calls this after a successful
    // restore or ANY restart (PRODUCTION_PLAN Phase 8: "@restore/@undo opcode
    // hooks -- map/discovery resync without relying only on typed command
    // sniffing"). This method was missing, so the call threw a TypeError from
    // inside the VM's own start-up `restart`, aborting boot and leaving the
    // game pane blank -- intermittently, because ZvmCapture's wrapper is
    // installed by a polling timer and only crashes when it lands before the
    // VM's first restart. Coalesced: undo+restart can fire back to back and
    // one resync after the terp has painted is enough.
    _restoreTimer: null,
    _restoreReason: "",
    _restoreLookToken: 0,
    clearStoryBeforeRestoreLook: function () {
        try {
            var $input = $(".Input.LineInput:visible");
            if ($input.length !== 1) return false;
            var input = $input[0];
            var $buffer = $input.closest(".BufferWindow");
            if ($buffer.length !== 1) return false;
            $buffer.find(".BufferLine").each(function () {
                // Keep the live prompt/input line: Glk owns that element and
                // the following LOOK must be submitted through it normally.
                if (this !== input && !$.contains(this, input)) $(this).remove();
            });
            return true;
        } catch (e) {
            return false;
        }
    },
    requestLookAfterRestore: function () {
        var token = ++UndoRestoreSync._restoreLookToken;
        var attempts = 0;
        var trySubmit = function () {
            if (token !== UndoRestoreSync._restoreLookToken) return;
            attempts++;

            var ready = false;
            var blocked = false;
            try {
                ready = typeof $ !== "undefined" && $(".Input.LineInput:visible").length === 1;
                blocked = (typeof Message !== "undefined" && Message.IsOpen)
                    || (typeof $ !== "undefined" && $("#dialog, #dialog_screen, #dialog_frame").length > 0);
            } catch (eReady) {}

            if (ready && !blocked) {
                try {
                    if (!UndoRestoreSync.clearStoryBeforeRestoreLook()) throw new Error("restore buffer not ready");
                    // Use the normal command choke point so transcript, map,
                    // learning, and accessibility observers see the same turn.
                    if (typeof Actionable !== "undefined" && Actionable.Submit
                        && Actionable.Submit("look") !== false) {
                        UndoRestoreSync._restoreLookToken++;
                        return;
                    }
                } catch (eSubmit) {}
            }

            // Native file dialogs and slower mobile WebViews can recreate the
            // Glk line input after the opcode returns. Wait for that real ready
            // signal, but never leave an unbounded command pending.
            if (attempts < 40) setTimeout(trySubmit, 125);
        };
        // restore_file returns before Glk has finished reconstructing the
        // saved window. Starting against the first visible input races that
        // rebuild: Glk can paint the saved transcript back after we clear it.
        setTimeout(trySubmit, 750);
    },
    onStateRestored: function (reason) {
        if (reason === "restore_file") UndoRestoreSync._restoreReason = reason;
        if (UndoRestoreSync._restoreTimer) return;
        UndoRestoreSync._restoreTimer = setTimeout(function () {
            var settledReason = UndoRestoreSync._restoreReason;
            UndoRestoreSync._restoreReason = "";
            UndoRestoreSync._restoreTimer = null;
            UndoRestoreSync.resync();
            if (settledReason === "restore_file") UndoRestoreSync.requestLookAfterRestore();
        }, 250);
    }
};
try {
    if (typeof Actionable !== "undefined" && Actionable.Submit && !Actionable._undoSyncWrapped) {
        var _s = Actionable.Submit;
        Actionable.Submit = function (cmd) {
            try { UndoRestoreSync.noteCommand(cmd); } catch (e) {}
            var r = _s.apply(this, arguments);
            try { UndoRestoreSync.tick(); } catch (e2) {}
            return r;
        };
        Actionable._undoSyncWrapped = true;
    }
} catch (e) {}
