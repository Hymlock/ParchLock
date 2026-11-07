// D86: Unified Turn Recorder substrate (v13 consensus, mailbox #379-#450).
// Loaded BEFORE js/AttrCalibrator.js -- this file owns capture mechanics
// only (when a turn opens/closes, what line-count/opcode/status data an
// analyzer may request, and when). It has ZERO knowledge of what a
// "location global" or a "disabled verb" is -- that domain logic lives
// entirely in the analyzers registered against it (js/AttrCalibrator.js,
// not yet ported as of this stage -- see PRODUCTION_PLAN.md D86's staged
// migration).
//
// Concurrency model (v12, corrected from an earlier "force-close reads
// current state" design that risked cutting a still-settling turn short or
// bleeding into the next turn's text -- codex caught this):
//   - Opcode attribution uses a SINGLE ACTIVE TURN ID. Single-threaded JS
//     means only one command's synchronous VM processing can ever be in
//     flight at a time, so this is sound by construction.
//   - Transcript/status reading is NOT force-closed immediately when a new
//     command is accepted. Instead, the new command's acceptance STAMPS the
//     previous turn's `endLine` boundary right then (freezing where its
//     slice ends) and opens the new turn with `startLine` at that same
//     boundary. The previous turn's own original ~450ms settle timer still
//     fires on its own schedule, analyzing using its now-frozen boundary --
//     never "whatever is current" at that later moment.
//   - Analyzer-visible post-turn signals (status text, RAM snapshots, etc)
//     must be frozen at the SAME moment as the boundary stamp (v13, #412-
//     414/#444's contamination lesson generalized) -- an analyzer that
//     requested a `captureAfter` hook gets it invoked exactly once, at
//     whichever comes first: natural close, or boundary-stamp time.
//
// Entry points (settled after real regressions were found and fixed in
// D86 stage 1): a genuine native keypress (installed by AttrCalibrator's
// own document-capture listener today; TurnRecorder does not install its
// own -- it is invoked BY that listener and by Input.Inject, both calling
// `TurnRecorder.onAcceptedSubmit`) and `Input.Inject`'s in-place hook.
// `Actionable.Submit` is explicitly NOT a separate entry point -- it always
// calls `Input.Inject(command, true)` after its own guard passes.
//
// Analyzer interface:
//   prepare(turn) -> { wantsOpcodes: bool, wantsStatusBefore: bool,
//                       captureAfter: (turn) => snapshot, hasWitness: (turn) => bool }
//     Called once, synchronously, when a turn opens. May read live state
//     (nothing has happened yet for THIS turn). Returning null/undefined
//     means "not interested in this turn at all" -- cheapest possible path.
//   observeOpcode(turn, op, vmInstance, args, result)
//     Called for every opcode while this turn is active, ONLY for analyzers
//     whose prepare() set wantsOpcodes truthy.
//   analyze(turn)
//     Called once, after the turn's endLine is frozen (boundary-stamp or
//     natural close) AND hasWitness(turn) (if provided) returns true. Must
//     read ONLY the immutable `turn` object -- never live DOM/VM/ZRamReader
//     itself. This is enforced by convention, not by the runtime (analyzers
//     are trusted, first-party code in this same file's future ported
//     versions), but the contract is load-bearing for correctness.
//
// Capture stays lazy by construction: `startLine`/`command`/`source` are
// always cheap and unconditional; everything else (opcodes, statusBefore,
// analyzerSnapshots) is captured ONLY when a specific analyzer's prepare()
// declared interest for THIS turn.
var TurnRecorder = {
    _activeTurn: null,
    _unsettled: [],
    whenSettled: function (timeoutMs) {
        var timer;
        var pending = TurnRecorder._unsettled.map(function (t) { return t.settlement; });
        return Promise.race([Promise.all(pending).then(function () { return true; }),new Promise(function(resolve) {
            timer=setTimeout(function() { resolve(false); },timeoutMs || 1500);
        })]).then(function(ok) { clearTimeout(timer); return ok; });
    },
    _analyzers: [],
    _submitListeners: {},
    _submissionId: 0,
    pageEpoch: Date.now().toString(36) + Math.random().toString(36).slice(2),

    subscribeAcceptedSubmit: function (id, callback) {
        TurnRecorder._submitListeners[id] = callback;
        return function () { delete TurnRecorder._submitListeners[id]; };
    },

    registerAnalyzer: function (analyzer) {
        if (!analyzer || !analyzer.id) return;
        for (var i = 0; i < TurnRecorder._analyzers.length; i++) {
            if (TurnRecorder._analyzers[i].id === analyzer.id) return; // no duplicate registration
        }
        TurnRecorder._analyzers.push(analyzer);
    },

    _lineCount: function () {
        try { if (typeof $ !== "undefined") return $("#windowport .BufferWindow .BufferLine").length; } catch (e) {}
        return 0;
    },

    // Generic, domain-ignorant "read the story's own current status display
    // text" primitive -- mirrors AttrCalibrator._currentRoomStatusText's
    // exact mechanism (reuses WorldModel.refineRoomDisplayName, D80's
    // already-reviewed carve-out) but lives here, load-order-independent of
    // AttrCalibrator.js, since core capture must not depend on any analyzer
    // file. Never used as an identity source, only a raw text snapshot --
    // the SAME discipline every other reader of this text already follows.
    _currentStatusText: function () {
        try {
            if (typeof WorldModel === "undefined" || !WorldModel.refineRoomDisplayName) return "";
            return String(WorldModel.refineRoomDisplayName({ roomName: "?" }) || "");
        } catch (e) { return ""; }
    },

    // The sole entry point for "a command was just accepted, submit it."
    // Called by the native keypress capture listener (typed commands) and
    // by Input.Inject's in-place hook (every other real path), both passing
    // the TRUE final command text.
    onAcceptedSubmit: function (command, source) {
        try {
            var event = Object.freeze({ submissionId: ++TurnRecorder._submissionId, pageEpoch: TurnRecorder.pageEpoch, command: String(command || ""), source: source || "unknown" });
            // Read-only learning pass shares one pool (radial slowdown 2026-10-18); listeners stay outside.
            var pooled = function (fn) { return (typeof Actionable !== "undefined" && Actionable.withResolutionPool) ? Actionable.withResolutionPool(fn) : fn(); };
            try { if (typeof LearnedWords !== 'undefined') pooled(function () { LearnedWords.observeSubmit(event); }); } catch (eLearning) {}
            if (event.source !== "stat-probe") {
                if (typeof MapTopology !== "undefined") MapTopology.noteCommand(event.command);
                if (typeof UndoRestoreSync !== "undefined") UndoRestoreSync.noteCommand(event.command);
                if (typeof Navigator !== "undefined" && Navigator.Running && !Navigator.Submitting) Navigator.ClearQueue();
            }
            Object.keys(TurnRecorder._submitListeners).forEach(function (id) {
                try { TurnRecorder._submitListeners[id](event); } catch (e) {}
            });
            var lineCountNow = TurnRecorder._lineCount();

            if (TurnRecorder._activeTurn) {
                TurnRecorder._boundaryStamp(TurnRecorder._activeTurn, lineCountNow);
            }

            var turn = {
                submissionId: event.submissionId,
                pageEpoch: event.pageEpoch,
                command: String(command || ""),
                source: source || "unknown",
                startLine: lineCountNow,
                endLine: null,
                boundedByLaterCommand: false,
                statusBefore: null,
                opcodeSummary: {},
                analyzerSnapshots: {},
                _interests: []
            };

            pooled(function () { TurnRecorder._analyzers.forEach(function (a) {
                try {
                    if (turn.source === "stat-probe" && a.id !== "d204-stat-ledger") return;
                    var interest = a.prepare ? a.prepare(turn) : null;
                    if (!interest) return; // not interested in this turn -- cheapest path
                    turn._interests.push({ analyzer: a, interest: interest });
                    if (interest.wantsStatusBefore) turn.statusBefore = TurnRecorder._currentStatusText();
                } catch (e) {}
            }); });

            TurnRecorder._activeTurn = turn;
            turn.settlement = new Promise(function (resolve) { turn._resolveSettlement = resolve; });
            TurnRecorder._unsettled.push(turn);
            setTimeout(function () { TurnRecorder._settle(turn); }, 450);
        } catch (e) {}
    },

    // Forwarded by ZvmCapture.js for every patched opcode call, live, while
    // the game runs. Cheap no-op unless the active turn has at least one
    // analyzer that declared wantsOpcodes.
    onOpcode: function (op, vmInstance, args, result) {
        var turn = TurnRecorder._activeTurn;
        if (!turn || !turn._interests.length) return;
        turn._interests.forEach(function (entry) {
            try {
                if (entry.interest.wantsOpcodes && entry.analyzer.observeOpcode) {
                    entry.analyzer.observeOpcode(turn, op, vmInstance, args, result);
                }
            } catch (e) {}
        });
    },

    // Freezes `endLine` right now (a later command was just accepted while
    // this turn was still within its settle window) and runs every
    // requesting analyzer's captureAfter hook AT THIS EXACT MOMENT, before
    // the later command's own interpreter handling begins -- this is the
    // v13 fix generalized: not just the transcript line-count boundary, but
    // every analyzer-visible post-turn signal freezes here too.
    _boundaryStamp: function (turn, lineCount) {
        if (turn.endLine != null) return; // already stamped or naturally closed
        turn.endLine = lineCount;
        turn.boundedByLaterCommand = true;
        if (TurnRecorder._activeTurn === turn) TurnRecorder._activeTurn = null;
        TurnRecorder._runCaptureAfter(turn);
    },

    // Fires on this turn's own ~450ms timer. If a later command already
    // boundary-stamped this turn, endLine/analyzerSnapshots are already
    // frozen -- this only runs analyze(). Otherwise this IS the natural
    // close: freeze endLine/captureAfter now, using CURRENT state (safe
    // here specifically because nothing boundary-stamped it in the
    // meantime, so "current" and "this turn's own" are the same thing).
    _settle: function (turn) {
        if (turn._settled) return;
        turn._settled = true;
        if (turn.endLine == null) {
            turn.endLine = TurnRecorder._lineCount();
            if (TurnRecorder._activeTurn === turn) TurnRecorder._activeTurn = null;
            TurnRecorder._runCaptureAfter(turn);
        }
        turn._interests.forEach(function (entry) {
            try {
                var hasWitness = entry.interest.hasWitness ? entry.interest.hasWitness(turn) : (turn.endLine > turn.startLine);
                if (hasWitness && entry.analyzer.analyze) entry.analyzer.analyze(turn);
            } catch (e) {}
        });
        TurnRecorder._unsettled = TurnRecorder._unsettled.filter(function (t) { return t !== turn; });
        if (turn._resolveSettlement) turn._resolveSettlement();
    },

    _runCaptureAfter: function (turn) {
        turn._interests.forEach(function (entry) {
            try {
                if (entry.interest.captureAfter) {
                    turn.analyzerSnapshots[entry.analyzer.id] = entry.interest.captureAfter(turn);
                }
            } catch (e) {}
        });
    }
};
