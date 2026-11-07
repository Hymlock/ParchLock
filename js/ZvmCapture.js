/* ZvmCapture - stash live ZVM instance for P2 RAM reads on play.html */
var ZvmCapture = {
    patchTries: 0,
    patched: false,
    // B7 (COMPARE-and-PROPOSAL r2): every game RAM change happens inside start/resume. vmRuns
    // moves on entry and exit; inRun > 0 while the VM executes. ZRamReader.snapshot's memo keys on both.
    vmRuns: 0,
    inRun: 0,

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
                ZvmCapture.vmRuns++; ZvmCapture.inRun++;
                try {
                    var r = ZvmCapture._origStart.apply(this, arguments);
                } finally { ZvmCapture.inRun--; ZvmCapture.vmRuns++; }
                try { window.__PARCHLOCK_ZVM__ = this; } catch (e) {}
                return r;
            };
        }
        if (!ZvmCapture._origResume && Proto.resume) {
            ZvmCapture._origResume = Proto.resume;
            Proto.resume = function () {
                try { window.__PARCHLOCK_ZVM__ = this; } catch (e) {}
                ZvmCapture.vmRuns++; ZvmCapture.inRun++;
                try { return ZvmCapture._origResume.apply(this, arguments); }
                finally { ZvmCapture.inRun--; ZvmCapture.vmRuns++; }
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
                    // E4: hook the shared native Dialog as early as the VM runs, so a first SAVE is seen.
                    if (!ZvmCapture._dialogHooked && this.options && this.options.Dialog && typeof Transcript !== "undefined") { ZvmCapture._dialogHooked = true; Transcript.hookDialog(this.options.Dialog); }
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
        // M11 (c): tell the map which snapshot a save_undo just created, so a
        // visit's own snapshot is bound at once (lib/zvm.js save_undo returns 1).
        if (!ZvmCapture._origSaveUndo && typeof Proto.save_undo === "function") {
            ZvmCapture._origSaveUndo = Proto.save_undo;
            Proto.save_undo = function () {
                var r = ZvmCapture._origSaveUndo.apply(this, arguments);
                try { if (r && typeof ParchLockMap !== "undefined" && ParchLockMap.OnSaveUndo) ParchLockMap.OnSaveUndo(this); } catch (eSU) {}
                return r;
            };
        }
        ["restore_undo", "restore_file", "restart"].forEach(function (name) {
            var original = Proto[name];
            if (typeof original !== "function") return;
            Proto[name] = function () {
                try { if (typeof Transcript !== "undefined" && this.options) Transcript.hookDialog(this.options.Dialog); } catch (eDlg) {}
                // M11: a native UNDO "seen to succeed" in this game = the game ran its
                // own @restore_undo and the VM undo stack got shorter. Per VM instance,
                // so per game per session; it arms Map "Rewind to here".
                var preUndoLen = (name === "restore_undo" && this.undo) ? this.undo.length : -1;
                var preUndoTop = preUndoLen > 0 ? this.undo[preUndoLen - 1] : null;
                var result = original.apply(this, arguments);
                try {
                    if (preUndoLen >= 0 && result && this.undo.length < preUndoLen) {
                        this.__pmUndoSeen = true;
                        this.__pmLastRestored = preUndoTop; // the exact snapshot the game consumed (Map rewind verify)
                    }
                } catch (eSeen) {}
                try {
                    if (typeof Transcript !== "undefined" && Transcript.onVmEvent) {
                        Transcript.onVmEvent(name, !!result || name === "restart", name === "restore_file" && arguments[1] === 1);
                    }
                } catch (eTx) {}
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
                        if (typeof UndoRestoreSync !== "undefined" && UndoRestoreSync.onStateRestored) UndoRestoreSync.onStateRestored(name, this);
                    } catch (eSync) {}
                }
                return result;
            };
        });
        // S1 stage 1 (I6): while StatTracker owns a hidden probe span it arms
        // ZvmCapture._pb with the probe verb's action routine, its action
        // number, and the story's `after`/`react_after` property numbers.
        // call/ret/_print are reached by property lookup from the JIT, so
        // these wrappers see every routine call and every printed string.
        // They record screen (main window, not memory stream 3, not the
        // status window) character offsets: where the action routine is
        // entered -- as a direct callee of a call whose first argument is the
        // action number (the library's action dispatcher) -- where its after
        // phase starts (stock InvSub calls AfterRoutines, which runs
        // obj.react_after / RunRoutines(obj, after) inside the routine), and
        // where it returns. Disarmed, each wrapper is a single null test.
        if (!ZvmCapture._origCall && typeof Proto.call === "function" && typeof Proto.ret === "function" && typeof Proto._print === "function") {
            var origCall = ZvmCapture._origCall = Proto.call;
            var origRet = ZvmCapture._origRet = Proto.ret;
            var origPrint = ZvmCapture._origPrint = Proto._print;
            Proto.call = function (t, i, e, s) {
                var pb = ZvmCapture._pb;
                if (pb && t !== 0 && !pb.bad && ZvmCapture._pbLive(pb)) { try { ZvmCapture._pbCall(pb, this, t, s); } catch (ePb) { pb.bad = "hook-exception"; } }
                return origCall.apply(this, arguments);
            };
            Proto.ret = function (t) {
                var pb = ZvmCapture._pb;
                if (pb && !pb.bad && ZvmCapture._pbLive(pb)) { try { ZvmCapture._pbRet(pb, this); } catch (ePb) { pb.bad = "hook-exception"; } }
                return origRet.apply(this, arguments);
            };
            Proto._print = function (t) {
                var pb = ZvmCapture._pb;
                if (pb && !pb.bad && ZvmCapture._pbLive(pb)) {
                    try {
                        var io = this.io;
                        if (io && !(io.streams[3] && io.streams[3].length) && !io.currentwin && io.streams[1]) {
                            pb.text += String(t);
                            if (pb.text.length > ZvmCapture.PB_TEXT_CAP) { pb.bad = "text-cap"; pb.text = ""; pb.stack = []; }
                        }
                    } catch (ePb) { pb.bad = "hook-exception"; }
                }
                return origPrint.apply(this, arguments);
            };
        }
        ZvmCapture.patched = true;
        try { window.__PARCHLOCK_ZVM_CAPTURE__ = { patched: true }; } catch (e) {}
        return true;
    },

    // S1 probe action boundary.
    // spec = { routine: packed address, action: number, afterProps: [n...], objMax: n,
    //          dispatcherGlobal: fn(packed) -> global number or null (stage 1b) }.
    PB_TEXT_CAP: 20000,
    PB_STACK_CAP: 4096,
    PB_NEST_CAP: 2,
    _pb: null,
    armProbeBoundary: function (spec) {
        ZvmCapture._pb = (spec && ZvmCapture._origCall) ? {
            routine: spec.routine, action: spec.action,
            afterProps: (spec.afterProps || []).slice(), objMax: spec.objMax || 0,
            dispatcherGlobal: typeof spec.dispatcherGlobal === "function" ? spec.dispatcherGlobal : null,
            text: "", stack: [], entry: -1, after: -1, ret: -1, entryDepth: -1, bad: null,
            outer: [], nested: false
        } : null;
        return !!ZvmCapture._pb;
    },
    takeProbeBoundary: function () {
        var pb = ZvmCapture._pb;
        ZvmCapture._pb = null;
        // Stage 1b: a nested (re-dispatched) action routine returned, but the
        // outer call it rebased from never did before ownership ended.
        if (pb && !pb.bad && pb.outer && pb.outer.length) pb.bad = "outer-unreturned";
        return pb;
    },
    // A probe that ends without endProbeOwnership must not keep recording:
    // the boundary disarms itself once StatTracker no longer owns a span.
    _pbLive: function (pb) {
        try {
            if (typeof StatTracker !== "undefined" && !StatTracker._statProbeOwned) {
                if (ZvmCapture._pb === pb) ZvmCapture._pb = null;
                return false;
            }
        } catch (eL) {}
        return true;
    },
    _pbPrune: function (pb, vm) {
        // A @throw unwinds frames without ret: drop calls that no longer exist.
        var n = vm.frames.length;
        while (pb.stack.length && pb.stack[pb.stack.length - 1].depth + 1 > n) pb.stack.pop();
        if (pb.entry >= 0 && (pb.ret < 0 || pb.outer.length) && n < pb.entryDepth + 1) pb.bad = "unwound";
    },
    // Is the frame that calls the action routine its dispatcher? Stage 1: the
    // frame's first argument is the action number. Stage 1b: the frame was
    // called with no argument, its routine is the library's ActionPrimitive
    // (shape A/B, decoded by StatTracker and cached per packed address) and
    // the `action` global it reads (header globals + 2k) holds the action now.
    // Returns null when it is, else the fault name.
    _pbDispatcherFault: function (pb, vm, parent) {
        if (parent.arg0 === pb.action) return null;
        if (parent.nargs !== 0 || !pb.dispatcherGlobal) return "routine-without-dispatcher";
        var k = null;
        try { k = pb.dispatcherGlobal(parent.routine); } catch (eD) { k = null; }
        if (k == null || !(k >= 0 && k < 240)) return "routine-without-dispatcher";
        var m = vm.m;
        if (m.getUint16(m.getUint16(0x0C) + 2 * k) !== pb.action) return "dispatcher-action-mismatch";
        return null;
    },
    _pbCall: function (pb, vm, t, args) {
        ZvmCapture._pbPrune(pb, vm);
        var depth = vm.frames.length;
        if (t === pb.routine) {
            var parent = pb.stack.length ? pb.stack[pb.stack.length - 1] : null;
            var fault = (parent && parent.depth + 1 === depth) ? ZvmCapture._pbDispatcherFault(pb, vm, parent) : "routine-without-dispatcher";
            if (pb.entry < 0) {
                if (!fault) { pb.entry = pb.text.length; pb.entryDepth = depth; }
                else pb.bad = pb.bad || fault;
            } else if (pb.ret < 0) {
                // Stage 1b nested re-dispatch (InvTallSub/InvWideSub: the
                // action routine re-runs itself through the dispatcher). Only
                // when the outer printed nothing and no after phase was seen
                // on the way in; the inner call then owns entry/after/ret.
                if (fault || pb.outer.length + 1 >= ZvmCapture.PB_NEST_CAP) pb.bad = pb.bad || "reentered";
                else if (pb.text.length !== pb.entry) pb.bad = "nested-pre-text";
                else if (pb.after >= 0) pb.bad = "nested-pre-after";
                else { pb.outer.push({ entry: pb.entry, entryDepth: pb.entryDepth }); pb.entry = pb.text.length; pb.entryDepth = depth; pb.after = -1; pb.nested = true; }
            } else if (pb.outer.length) pb.bad = pb.bad || "reentered";
        }
        // After phase: inside the action routine, the first call made with
        // (object, after|react_after). It starts at the entry of the action
        // routine's direct callee that contains it (AfterRoutines), or at the
        // call itself when the action routine makes it directly.
        if (pb.entry >= 0 && pb.ret < 0 && pb.after < 0 && args && args.length >= 2
            && pb.afterProps.indexOf(args[1]) >= 0 && args[0] >= 1 && args[0] <= pb.objMax && depth > pb.entryDepth) {
            var outer = null;
            for (var k = 0; k < pb.stack.length; k++) { if (pb.stack[k].depth === pb.entryDepth + 1) { outer = pb.stack[k]; break; } }
            pb.after = outer ? outer.o : pb.text.length;
        }
        pb.stack.push({ depth: depth, routine: t, nargs: args ? args.length : 0, arg0: args && args.length ? args[0] : null, o: pb.text.length });
        if (pb.stack.length > ZvmCapture.PB_STACK_CAP) { pb.bad = "stack-overflow"; pb.stack = []; pb.text = ""; }
    },
    _pbRet: function (pb, vm) {
        ZvmCapture._pbPrune(pb, vm);
        var n = vm.frames.length;
        if (pb.entry >= 0 && pb.ret < 0 && n === pb.entryDepth + 1) {
            pb.ret = pb.text.length;
            // Inner (nested) return: the outer frame is the one now awaited.
            if (pb.outer.length) pb.entryDepth = pb.outer[pb.outer.length - 1].entryDepth;
        } else if (pb.ret >= 0 && pb.outer.length && n === pb.entryDepth + 1) {
            // Outer return: it must not have printed after delegating.
            pb.outer.pop();
            if (pb.text.length !== pb.ret) pb.bad = "outer-printed";
        }
        if (pb.stack.length && pb.stack[pb.stack.length - 1].depth + 1 === n) pb.stack.pop();
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
