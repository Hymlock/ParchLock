/* ZvmCapture - stash live ZVM instance for P2 RAM reads on play.html */
var ZvmCapture = {
    patchTries: 0,
    patched: false,

    armConstructorHook: () => {
        if (typeof window === "undefined" || window.ZVM) return false;
        var descriptor;
        try { descriptor = Object.getOwnPropertyDescriptor(window, "ZVM"); } catch (e) {}
        if (descriptor && !descriptor.configurable) return false;
        if (descriptor && (descriptor.get || descriptor.set)) return false;
        try {
            Object.defineProperty(window, "ZVM", {
                configurable: true,
                enumerable: true,
                get: function () { return undefined; },
                set: function (Ctor) {
                    Object.defineProperty(window, "ZVM", {
                        configurable: true,
                        enumerable: true,
                        writable: true,
                        value: Ctor
                    });
                    ZvmCapture.install();
                }
            });
            return true;
        } catch (eHook) {
            return false;
        }
    },

    install: () => {
        if (ZvmCapture.patched) return true;
        if (typeof window === "undefined" || !window.ZVM) return false;
        var Proto = window.ZVM.prototype;
        if (!Proto) return false;
        if (!ZvmCapture._origPrepare && Proto.prepare) {
            ZvmCapture._origPrepare = Proto.prepare;
            Proto.prepare = function (data, opts) {
                try { window.__PARCHLOCK_ZVM__ = this; } catch (e) {}
                return ZvmCapture._origPrepare.apply(this, arguments);
            };
        }
        if (!ZvmCapture._origStart && Proto.start) {
            ZvmCapture._origStart = Proto.start;
            Proto.start = function () {
                try { window.__PARCHLOCK_ZVM__ = this; } catch (e) {}
                var r = ZvmCapture._origStart.apply(this, arguments);
                try { window.__PARCHLOCK_ZVM__ = this; } catch (e) {}
                return r;
            };
        }
        if (!ZvmCapture._origResume && Proto.resume) {
            ZvmCapture._origResume = Proto.resume;
            Proto.resume = function () {
                try { window.__PARCHLOCK_ZVM__ = this; } catch (e) {}
                return ZvmCapture._origResume.apply(this, arguments);
            };
        }
        // D73/AttrCalibrator Phase B: `lib/zvm.js` JIT-compiles Z-machine
        // opcodes into JS source that calls these six methods on the VM
        // instance by ordinary property lookup at call time (confirmed:
        // not baked into closures), so patching them here -- once, on the
        // shared prototype, exactly like prepare/start/resume above --
        // lets a real compiled game's own precondition/action routines be
        // OBSERVED as they actually run, instead of only ever approximated
        // via a static attribute-bit profile (`AttributeSchema.PROFILE`).
        // This file stays fully decoupled from `AttrCalibrator.js`: the
        // passthrough call is guarded by `typeof AttrCalibrator` so every
        // game behaves identically whether or not that file is loaded.
        // D84 investigation note: `variable(t, value)` was tried as an
        // additional hook here (to observe global-variable writes for
        // location-global calibration) but direct inspection of this file's
        // own JIT code-generator proved it insufficient -- the compiled
        // "store into a global" path is `e.ram.setUint16(...)`, a direct
        // per-instance memory-view write that never calls `variable()` at
        // all (that method is only reached via a narrower `returnval`
        // path). Patching the memory-view's own write method would mean
        // hooking every single RAM write in the whole VM (a far hotter,
        // less semantically-scoped path than the six opcodes below, all of
        // which DO route through their own named method for every call
        // that matters) -- correctly out of scope for this file. Location-
        // global calibration instead reads already-settled RAM directly
        // (`ZRamReader.u16`, the same primitive `findLocationGlobal` already
        // uses) rather than trying to intercept the write; see
        // `AttrCalibrator.js`'s location-calibration comment for the design.
        ["test_attr", "set_attr", "clear_attr", "get_prop", "insert_obj", "remove_obj"].forEach(function (opName) {
            var origKey = "_origOp_" + opName;
            if (ZvmCapture[origKey] || typeof Proto[opName] !== "function") return;
            ZvmCapture[origKey] = Proto[opName];
            Proto[opName] = function () {
                var result = ZvmCapture[origKey].apply(this, arguments);
                try {
                    if (typeof AttrCalibrator !== "undefined" && AttrCalibrator.onOpcode) {
                        AttrCalibrator.onOpcode(opName, this, Array.prototype.slice.call(arguments), result);
                    }
                } catch (eOp) {}
                // D86 migration: additive fan-out to TurnRecorder (diagnostic-
                // only until analyzers are individually cut over -- the six
                // patched methods and AttrCalibrator's own write path above
                // are unchanged). Removed alongside AttrCalibrator.onOpcode's
                // bridge role once migration completes.
                try {
                    if (typeof TurnRecorder !== "undefined" && TurnRecorder.onOpcode) {
                        TurnRecorder.onOpcode(opName, this, Array.prototype.slice.call(arguments), result);
                    }
                } catch (eOp2) {}
                return result;
            };
        });
        ["restore_undo", "restore_file", "restart"].forEach(function (name) {
            var original = Proto[name];
            if (typeof original !== "function") return;
            Proto[name] = function () {
                var result = original.apply(this, arguments);
                if (name === "restart" || result) {
                    if (name === "restore_file" && result) {
                        // Clear through Glk itself, not just the rendered DOM.
                        // Glk owns an internal buffer model and otherwise
                        // recreates removed transcript lines on its next update.
                        try {
                            if (this.Glk && this.Glk.glk_window_clear && this.mainwin) {
                                this.Glk.glk_window_clear(this.mainwin);
                            }
                        } catch (eClear) {}
                    }
                    // D94: this wrapper is a passive observer. A failure in
                    // it (a missing/renamed callee, a bug in a resync) must
                    // never throw into the VM's own restart/restore control
                    // flow -- restart runs during VM boot, so an escaping
                    // exception here aborted the whole game start.
                    try {
                        if (typeof UndoRestoreSync !== "undefined" && UndoRestoreSync.onStateRestored) UndoRestoreSync.onStateRestored(name);
                    } catch (eSync) {}
                }
                return result;
            };
        });
        ZvmCapture.patched = true;
        try { window.__PARCHLOCK_ZVM_CAPTURE__ = { patched: true }; } catch (e) {}
        return true;
    },

    tick: () => {
        if (!ZvmCapture.patched) {
            ZvmCapture.patchTries++;
            ZvmCapture.install();
        }
        try {
            if (window.__PARCHLOCK_ZVM__) return window.__PARCHLOCK_ZVM__;
        } catch (e) {}
        return null;
    }
};

try {
    // lib/main.js loads lib/zvm.js asynchronously and constructs the VM in
    // the same promise turn. Polling alone can miss that interval on a fast
    // desktop load, so intercept the constructor assignment before main.js.
    ZvmCapture.armConstructorHook();
    if (!ZvmCapture.install()) {
        var _ziv = setInterval(function () {
            if (ZvmCapture.install() || ZvmCapture.patchTries > 200) clearInterval(_ziv);
            ZvmCapture.patchTries++;
        }, 50);
    }
} catch (e) {}
