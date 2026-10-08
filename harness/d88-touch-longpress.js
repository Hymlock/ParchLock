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
        ok(el.classList.contains("pl-hold-active"), "selection suppressed while a hold is pending");
        await sleep(35); // past the 20ms long-press threshold
        ok(el.classList.contains("pl-hold-active"), "selection remains suppressed after the hold fires");
        handlers["touchmove.pmAct"].call(el, touchEvent(100, 250));
        ok(el.classList.contains("pl-hold-active"), "a fired hold remains suppressed during subsequent finger movement");
        ok(openCalls.length === 1, "a genuine held touch (no movement) opens exactly one radial via Actionable.Open()");
        ok(openCalls[0] && openCalls[0].noun === "guard" && openCalls[0].objectId === String(GUARD) && openCalls[0].kind === "object",
            "the opened radial carries the correct noun/objectId/kind -- same call shape as desktop right-click");
        const endEvent = touchEvent(100, 200);
        handlers["touchend.pmAct"].call(el, endEvent);
        ok(!el.classList.contains("pl-hold-active"), "selection suppression ends on release");
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
        ok(!el.classList.contains("pl-hold-active"), "scroll cancellation restores selection");
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
        ok(!el.classList.contains("pl-hold-active"), "OS cancellation restores selection");
        await sleep(35);
        ok(openCalls.length === 0, "touchcancel clears the pending long-press timer -- no delayed/phantom radial");
    }

    // --- Desktop click.pmAct / contextmenu.pmAct handlers are completely unaffected (same registration, same behavior) ---
    {
        const { sandbox, handlers } = makeSandbox();
        ok(typeof handlers["click.pmAct"] === "function" && typeof handlers["contextmenu.pmAct"] === "function",
            "click.pmAct and contextmenu.pmAct are still registered exactly as before -- touch handling is additive, not a replacement");
    }

    if (process.argv.includes("--browser")) await browserSelection();
    console.log(JSON.stringify({ ok: fail === 0, pass, fail }, null, 2));
    if (fail) {
        console.error("FAIL: d88-touch-longpress (" + fail + " failed, " + pass + " passed)");
        process.exit(1);
    }
    console.log("PASS: d88-touch-longpress (" + pass + " passed)");
}

async function browserSelection() {
    const { chromium } = require("playwright");
    const { pathToFileURL } = require("url");
    const browser = await chromium.launch();
    try {
        const ctx = await browser.newContext({ viewport: { width: 360, height: 850 }, hasTouch: true });
        const page = await ctx.newPage();
        await page.addInitScript(() => {
            sessionStorage.setItem("PL_ParchLockSplashSeen", "1");
            ["PL_TutorialSeen", "PL_MobileTutorialSeen", "PL_LearnedWordsTutorialSeen"].forEach(k => localStorage.setItem(k, "1"));
        });
        await page.goto(pathToFileURL(path.join(root, "play.html")).href + "?story=games/deephome.z5.js");
        await page.waitForTimeout(6000);
        await page.evaluate(() => { if (Message.IsOpen) Message.Hide(); });
        const checks = await page.evaluate(async () => {
            const checks = [];
            const check = (value, name) => checks.push([!!value, name]);
            const plain = document.createElement("p"); plain.textContent = "Copy this ordinary story text"; document.body.appendChild(plain);
            const target = document.createElement("span"); target.textContent = "radial target"; document.body.appendChild(target);
            const select = el => { const range = document.createRange(); range.selectNodeContents(el); const sel = getSelection(); sel.removeAllRanges(); sel.addRange(range); };
            select(plain);
            const state = { el: target }; Actionable.beginHoldSelection(state);
            check(getComputedStyle(target).userSelect === "none", "browser: active target suppresses selection");
            const event = new Event("selectstart", { bubbles: true, cancelable: true }); target.dispatchEvent(event);
            check(event.defaultPrevented, "browser: native selection start blocked for active target");
            const normal = new Event("selectstart", { bubbles: true, cancelable: true }); plain.dispatchEvent(normal);
            check(!normal.defaultPrevented, "browser: ordinary transcript selection is untouched");
            Actionable.fireHoldSelection(state);
            check(getSelection().toString() === plain.textContent, "browser: unrelated selected text survives radial opening");
            select(target); Actionable.fireHoldSelection(state);
            check(!getSelection().rangeCount, "browser: successful hold clears its own accidental range");
            document.dispatchEvent(new Event("touchend", { bubbles: true }));
            check(!target.classList.contains("pl-hold-active"), "browser: off-target end cleans suppression");
            check(!Actionable._holdSelectionObserver, "browser: normal release disconnects the hold observer");
            const finger = { el: target, touchId: 7 }; Actionable.beginHoldSelection(finger);
            const otherEnd = new Event("touchend", { bubbles: true }); Object.defineProperty(otherEnd, "changedTouches", { value: [{ identifier: 9 }] }); document.dispatchEvent(otherEnd);
            check(target.classList.contains("pl-hold-active"), "browser: another finger ending does not cancel this hold");
            const ownEnd = new Event("touchend", { bubbles: true }); Object.defineProperty(ownEnd, "changedTouches", { value: [{ identifier: 7 }] }); document.dispatchEvent(ownEnd);
            check(!target.classList.contains("pl-hold-active"), "browser: matching finger end restores selection");
            Actionable.beginHoldSelection(state); target.remove();
            await new Promise(r => setTimeout(r, 0));
            check(!Actionable._selectionHolds.length && !Actionable._holdSelectionObserver, "browser: removed target releases state and observer");
            const li = document.querySelector(".Input.LineInput"); li.value = "copy these words"; Input._kbIntent = "line"; Input._kbLineEl = li; li.focus(); li.setSelectionRange(0, 4);
            const touch = new Event("touchstart", { bubbles: true, cancelable: true }); Object.defineProperty(touch, "touches", { value: [{ clientX: 10, clientY: 10 }] }); li.dispatchEvent(touch);
            check(!li.classList.contains("pl-hold-active") && li.selectionStart === 0 && li.selectionEnd === 4, "browser: keyboard-open input keeps native selection");
            li.value = ""; Input._kbIntent = "none"; li.blur(); plain.remove();
            const emit = (el, type, x = 10, y = 10) => {
                const e = new Event(type, { bubbles: true, cancelable: true });
                const points = [{ identifier: 2, clientX: x, clientY: y }];
                Object.defineProperty(e, "touches", { value: type === "touchend" ? [] : points });
                Object.defineProperty(e, "changedTouches", { value: points }); el.dispatchEvent(e);
            };
            const row = document.createElement("div"); row.textContent = "inventory item"; document.body.appendChild(row);
            const open = Actionable.Open, isOpen = EquipmentUI.IsOpen, ms = Actionable.LongPressMs;
            let opens = 0; Actionable.Open = () => { opens++; }; EquipmentUI.IsOpen = () => true; Actionable.LongPressMs = 20;
            emit(li, "touchstart"); await new Promise(r => setTimeout(r, 35));
            const lineState = Input._lineTouch;
            check(lineState && lineState.long && li.classList.contains("pl-hold-active"), "browser: closed-keyboard line hold suppresses selection through fire");
            emit(li, "touchmove", 60, 60);
            check(li.classList.contains("pl-hold-active"), "browser: fired input-line hold survives movement");
            emit(li, "touchend");
            const moves = ($._data(document, "events") || {}).touchmove || [];
            check(!li.classList.contains("pl-hold-active") && !moves.some(e => e.handler === lineState.moveHandler), "browser: input-line release removes dynamic move listener");
            ParchLockQol.HideRadialMenu();
            EquipmentUI.bindHold(row, { name: "item", id: 999 }); emit(row, "touchstart"); await new Promise(r => setTimeout(r, 35));
            check(opens === 1 && row.classList.contains("pl-hold-active"), "browser: equipment hold opens once and retains suppression");
            emit(row, "touchmove", 60, 60);
            check(row.classList.contains("pl-hold-active"), "browser: equipment fired hold survives finger movement");
            emit(row, "touchend"); check(!row.classList.contains("pl-hold-active"), "browser: equipment release restores selection");
            const grip = document.createElement("span"); grip.className = "equip-grip"; row.appendChild(grip); emit(grip, "touchstart");
            check(!row.classList.contains("pl-hold-active"), "browser: equipment drag grip is excluded from radial hold");
            row.remove(); EquipmentUI.IsOpen = isOpen; Actionable.Open = open;
            const char = document.createElement("input"); char.className = "Input CharInput"; document.body.appendChild(char);
            const manages = CharKeys.managesIme; CharKeys.managesIme = () => true;
            emit(char, "touchstart"); await new Promise(r => setTimeout(r, 35));
            check(char.classList.contains("pl-hold-active") && CharKeys._tap.fired, "browser: character-input hold retains suppression through fire");
            emit(char, "touchmove", 60, 60); check(char.classList.contains("pl-hold-active"), "browser: character-input fired hold survives movement");
            emit(char, "touchend"); check(!char.classList.contains("pl-hold-active"), "browser: character-input release restores selection");
            char.remove(); CharKeys.managesIme = manages; Actionable.LongPressMs = ms; ParchLockQol.HideRadialMenu();
            return checks;
        });
        checks.forEach(([value, name]) => ok(value, name));
        // Actual CDP finger events exercise Send's successful hold lifecycle.
        const cdp = await ctx.newCDPSession(page);
        const box = await page.locator("#pl-input-submit").boundingBox();
        await cdp.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ x: box.x + box.width / 2, y: box.y + box.height / 2 }] });
        await page.waitForTimeout(120);
        ok(await page.locator("#pl-input-submit").evaluate(el => el.classList.contains("pl-hold-active")), "CDP: Send suppresses selection while pending");
        await page.waitForTimeout(520);
        ok(await page.locator("#pl-input-submit").evaluate(el => el.classList.contains("pl-hold-active")), "CDP: Send suppression survives radial opening");
        await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
        ok(await page.locator("#pl-input-submit").evaluate(el => !el.classList.contains("pl-hold-active")), "CDP: Send release cleans suppression");
    } finally { await browser.close(); }
}
run().catch(error => { console.error(error); process.exitCode = 1; });
