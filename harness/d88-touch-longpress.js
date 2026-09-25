/**
 * D88 Stage 6 gate -- genuine touch long-press (ARCHITECTURE_UML.md "Mobile
 * and out-of-sample gate": "contextmenu simulation at a narrow viewport is
 * not proof of mobile support... must exercise pointer/touch long-press").
 * Exercises the REAL touchstart/touchmove/touchend handlers registered by
 * Actionable.Init(), with real (short-circuited) timers, real event
 * objects, real cancellation-by-movement, and real duplicate-submission
 * prevention -- not a contextmenu substitute.
 *
 * Usage: node harness/d88-touch-longpress.js
 */
const fs = require("fs");
const path = require("path");
const vm = require("vm");
const assert = require("assert");

const root = path.join(__dirname, "..");
function load(sandbox, file) {
    vm.runInContext(fs.readFileSync(path.join(root, "js", file), "utf8"), sandbox);
}

function makeSandbox() {
    const handlers = {}; // event -> handler
    const chain = {
        off: function () { return this; },
        on: function (evt, selector, handler) { handlers[evt] = handler; return this; }
    };
    const openCalls = [];
    const sandbox = {
        console, setTimeout, clearTimeout, window: {}, document: {},
        $: function (sel) { return typeof sel === "string" ? { length: 0, off() { return this; }, on() { return this; } } : chain; },
        Message: { IsOpen: false },
        ParchLockQol: { OpenRadial: function () {} },
        Input: { Clear() {}, Focus() {}, Inject() { return true; } },
        TurnRecorder: { subscribeAcceptedSubmit() {} },
        AttrCalibrator: { defaultInspectVerb: () => "examine", inspectVerbCurrentlyDisabled: () => false }
    };
    vm.createContext(sandbox);
    load(sandbox, "AttributeSchema.js");
    load(sandbox, "ActionSynth.js");
    load(sandbox, "SemanticActions.js");
    load(sandbox, "Actionable.js");
    load(sandbox, "WorldModel.js");
    sandbox.Actionable.Open = function (noun, kind, x, y, objectId) { openCalls.push({ noun, kind, x, y, objectId }); };
    sandbox.Actionable.LongPressMs = 20; // short-circuited for a fast, deterministic test
    sandbox.Actionable.LongPressMoveCancelPx = 10;
    vm.runInContext("Actionable.Init();", sandbox);
    return { sandbox, handlers, openCalls };
}

function touchEvent(x, y) {
    var pd = false;
    return { originalEvent: { touches: [{ clientX: x, clientY: y }] }, preventDefault: function () { pd = true; }, __wasPrevented: function () { return pd; } };
}

// D93 (G22): real DOM elements always have classList; Actionable.js's
// touch handlers now toggle a press-scoped "pl-press-pending" class
// (see js/Actionable.js), so this mock element needs a real (if minimal)
// classList implementation to match reality, not a fake without one.
function makeEl(noun, kind, objectId) {
    var classes = {};
    return {
        dataset: { noun: noun, kind: kind, objectId: objectId },
        classList: {
            add: function (c) { classes[c] = true; },
            remove: function (c) { delete classes[c]; },
            contains: function (c) { return !!classes[c]; }
        }
    };
}

function sleep(ms) { return new Promise(function (r) { setTimeout(r, ms); }); }

let pass = 0, fail = 0;
function ok(cond, msg) { if (cond) { pass++; console.log("PASS:", msg); } else { fail++; console.error("FAIL:", msg); } }

async function run() {
    const GUARD = 10;

    // --- Genuine long-press: hold past LongPressMs without moving -> opens the SAME Actionable.Open() radial ---
    {
        const { handlers, openCalls } = makeSandbox();
        const el = makeEl("guard", "object", String(GUARD));
        handlers["touchstart.pmAct"].call(el, touchEvent(100, 200));
        await sleep(35); // past the 20ms long-press threshold
        ok(openCalls.length === 1, "a genuine held touch (no movement) opens exactly one radial via Actionable.Open()");
        ok(openCalls[0] && openCalls[0].noun === "guard" && openCalls[0].objectId === String(GUARD) && openCalls[0].kind === "object",
            "the opened radial carries the correct noun/objectId/kind -- same call shape as desktop right-click");
        const endEvent = touchEvent(100, 200);
        handlers["touchend.pmAct"].call(el, endEvent);
        ok(endEvent.__wasPrevented(), "touchend after a fired long-press calls preventDefault() -- duplicate-submission prevention");
    }

    // --- Genuine tap: touchend fires WELL before the long-press threshold -> no radial, no preventDefault (falls through to native click) ---
    {
        const { handlers, openCalls } = makeSandbox();
        const el = makeEl("guard", "object", String(GUARD));
        handlers["touchstart.pmAct"].call(el, touchEvent(100, 200));
        await sleep(5); // well under the 20ms threshold
        const endEvent = touchEvent(100, 200);
        handlers["touchend.pmAct"].call(el, endEvent);
        await sleep(35); // long enough that a still-pending timer WOULD have fired by now if not cleared
        ok(openCalls.length === 0, "a quick tap (touchend before the threshold) never opens a radial");
        ok(!endEvent.__wasPrevented(), "a quick tap's touchend does NOT preventDefault -- the browser's own synthetic click is left to fire, reaching the existing click.pmAct handler");
    }

    // --- Cancellation: real finger movement past the threshold cancels the pending long-press ---
    {
        const { handlers, openCalls } = makeSandbox();
        const el = makeEl("guard", "object", String(GUARD));
        handlers["touchstart.pmAct"].call(el, touchEvent(100, 200));
        handlers["touchmove.pmAct"].call(el, touchEvent(100, 250)); // 50px vertical move, well past the 10px cancel radius
        await sleep(35); // past the original threshold
        ok(openCalls.length === 0, "a real drag/scroll movement past the cancel threshold prevents the long-press from firing at all");
    }

    // --- Small jitter (within the cancel threshold) does NOT cancel a genuine hold ---
    {
        const { handlers, openCalls } = makeSandbox();
        const el = makeEl("guard", "object", String(GUARD));
        handlers["touchstart.pmAct"].call(el, touchEvent(100, 200));
        handlers["touchmove.pmAct"].call(el, touchEvent(103, 202)); // ~3.6px jitter, well under the 10px threshold
        await sleep(35);
        ok(openCalls.length === 1, "small sub-threshold jitter during a genuine hold does not cancel the long-press");
    }

    // --- touchcancel (e.g. an incoming phone call, OS gesture) clears the pending timer ---
    {
        const { handlers, openCalls } = makeSandbox();
        const el = makeEl("guard", "object", String(GUARD));
        handlers["touchstart.pmAct"].call(el, touchEvent(100, 200));
        handlers["touchcancel.pmAct"].call(el, {});
        await sleep(35);
        ok(openCalls.length === 0, "touchcancel clears the pending long-press timer -- no delayed/phantom radial");
    }

    // --- Desktop click.pmAct / contextmenu.pmAct handlers are completely unaffected (same registration, same behavior) ---
    {
        const { sandbox, handlers } = makeSandbox();
        ok(typeof handlers["click.pmAct"] === "function" && typeof handlers["contextmenu.pmAct"] === "function",
            "click.pmAct and contextmenu.pmAct are still registered exactly as before -- touch handling is additive, not a replacement");
    }

    console.log(JSON.stringify({ ok: fail === 0, pass, fail }, null, 2));
    if (fail) {
        console.error("FAIL: d88-touch-longpress (" + fail + " failed, " + pass + " passed)");
        process.exit(1);
    }
    console.log("PASS: d88-touch-longpress (" + pass + " passed)");
}

run();
