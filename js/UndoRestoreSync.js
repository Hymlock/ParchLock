var UndoRestoreSync = {
    generation: 0,
    pending: false,
    _commandTimer: null,
    noteCommand: function (cmd) {
        var s = String(cmd || "").trim().toLowerCase();
        if (/^(undo|restore|restart|load)\b/.test(s)) {
            // An attempted command is not a successful timeline change.
            if (/^(undo|restore|restart)\b/.test(s) && typeof ZvmCapture !== "undefined" && ZvmCapture.patched
                && typeof window !== "undefined" && window.__PARCHLOCK_ZVM__) {
                clearTimeout(UndoRestoreSync._commandTimer);
                UndoRestoreSync._commandTimer = null;
                UndoRestoreSync.pending = false;
                return;
            }
            UndoRestoreSync.pending = true;
        }
    },
    resync: function (reason) {
        clearTimeout(UndoRestoreSync._commandTimer);
        UndoRestoreSync._commandTimer = null;
        UndoRestoreSync.generation++;
        try { $("#radial-menu .pl-object-status").remove(); } catch (eStatus) {}
        if (typeof LearnedWords !== 'undefined') { LearnedWords.clearProjection(); if (LearnedWords._open) LearnedWords.close(false); }
        UndoRestoreSync.pending = false;
        if (typeof Actionable !== "undefined") {
            // Item 4: verified display names survive an undo (each is revalidated
            // against the object's live parser words); only a new game drops
            // them, and a save restore replaces them with that save's own.
            if (reason === "restart" && Actionable.clearLabelSnapshot) Actionable.clearLabelSnapshot();
            Actionable.VerifiedNouns = {};
            Actionable.CommandNouns = {};
            Actionable.Scope.lastLookText = "";
            Actionable.Scope.lastInventoryText = "";
            Actionable.RoomLines = [];
            Actionable.Signature = "";
        }
        var mapHandled = false;
        try {
            if (typeof SaveState !== "undefined" && SaveState.applyPending)
                mapHandled = SaveState.applyPending(reason, UndoRestoreSync.generation) === true;
        } catch(eState) {}
        if (!mapHandled && reason === "restart" && typeof ParchLockMap !== "undefined") {
            ParchLockMap.Clear({ seed: false });
            ParchLockMap.Save();
        }
        try {
            if (typeof ZvmCapture !== "undefined" && ZvmCapture.tick) ZvmCapture.tick();
            // D180: the stats are a subsystem of this resync too. Undo, restore
            // and restart all move the story to a different point in time, and a
            // score or a carried total from the abandoned one is not this game's
            // figure. Readings are dropped; what was LEARNED about the story file
            // is kept, so they come back immediately.
            //
            // D181 (grok seat, adversarial): this MUST run before
            // WorldModel.tick. The other way round, the tick re-derives from the
            // restored state first and the figures move -- 693 to 35 -- which is
            // indistinguishable from the player scoring, so the score-up tone
            // fires on a restore. Order alone is not sufficient (see
            // StatTracker.emitChange), but it is necessary.
            if (typeof StatTracker !== "undefined" && StatTracker.Resync) StatTracker.Resync(reason);
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
            // D198 keeps generation facts under their existing domain owners.
            // Clear them explicitly without disturbing learned/persisted
            // AttrCalibrator or ExitCalibrator tables.
            if (typeof AttrCalibrator !== "undefined" && AttrCalibrator.clearD198GenerationEvidence) AttrCalibrator.clearD198GenerationEvidence();
            if (typeof ExitCalibrator !== "undefined" && ExitCalibrator.clearD198GenerationHints) ExitCalibrator.clearD198GenerationHints();
        } catch (e) {}
    },
    tick: function () {
        if (!UndoRestoreSync.pending || UndoRestoreSync._commandTimer) return;
        // Coalesced fallback for engines without authoritative ZVM hooks.
        UndoRestoreSync._commandTimer = setTimeout(function () {
            UndoRestoreSync._commandTimer = null;
            if (UndoRestoreSync.pending) UndoRestoreSync.resync();
        }, 250);
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
    _restartVms: typeof WeakSet !== "undefined" ? new WeakSet() : null,
    onStateRestored: function (reason, vm) {
        if (reason === "restart" && vm && UndoRestoreSync._restartVms) {
            var seen = UndoRestoreSync._restartVms.has(vm);
            UndoRestoreSync._restartVms.add(vm);
            // Boot is not a timeline change. A late-attached VM must still
            // process its first observed real restart once boot has finished.
            if (!seen && typeof Transcript !== "undefined" && Transcript._booting === true)return;
            UndoRestoreSync._restoreReason = "restart";
        }
        clearTimeout(UndoRestoreSync._commandTimer);
        UndoRestoreSync._commandTimer = null;
        UndoRestoreSync.pending = false;
        if (reason === "restart") {
            var gameKey = typeof ParchLock !== "undefined" ? ParchLock.GameFilename : "";
            if (UndoRestoreSync._startedGameKey === gameKey) UndoRestoreSync._restoreReason = "restart";
            UndoRestoreSync._startedGameKey = gameKey;
        }
        if (reason === "restore_file") UndoRestoreSync._restoreReason = reason;
        if (UndoRestoreSync._restoreTimer) return;
        UndoRestoreSync._restoreTimer = setTimeout(function () {
            var settledReason = UndoRestoreSync._restoreReason;
            UndoRestoreSync._restoreReason = "";
            UndoRestoreSync._restoreTimer = null;
            UndoRestoreSync.resync(settledReason);
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
