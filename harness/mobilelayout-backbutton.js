// D115 (operator-reported, still reproducing after D113): with nothing else
// open -- e.g. reading ordinary story text, including a native BufferWindow
// "[Please press SPACE.]" MORE/CharInput prompt -- the hardware back button
// used to call CapApp.exitApp() immediately and silently, killing the whole
// Activity. A cold relaunch from the home screen/recent-apps is
// indistinguishable from "the game reset" to the player, with zero warning.
// This proves the final fallback now requires an explicit confirm() first
// (the same mechanism this app already uses for Reset Map/Remove all
// modules), and that every earlier-priority dismiss case is untouched.
global.window = global;
global.document = { body: { classList: { contains: function () { return false; } } } };

let pass = 0, fail = 0;
function assert(cond, msg) {
    if (cond) { pass++; console.log("PASS:", msg); }
    else { fail++; console.log("FAIL:", msg); }
}

// D120: MobileLayout.js used to also define its own real
// `var MobileTutorial = {...}` in this same file, which loadFresh() had to
// return alongside MobileLayout so tests could monkey-patch the real object
// eval just (re-)defined. MobileTutorial is fully retired now (replaced by
// the separate tutorial.html route) -- loadFresh() returns MobileLayout only.
function loadFresh() {
    const fs = require("fs");
    const path = require("path");
    const src = fs.readFileSync(path.resolve(__dirname, "..", "js", "MobileLayout.js"), "utf8");
    eval(src);
    return { MobileLayout: MobileLayout };
}

function makeCapApp() {
    var calls = { exitApp: 0, addListener: null };
    var CapApp = {
        addListener: function (name, fn) { calls.addListener = fn; },
        exitApp: function () { calls.exitApp++; }
    };
    global.window.Capacitor = { Plugins: { App: CapApp } };
    return calls;
}

function resetStubs() {
    global.CharKeys = undefined;
    global.$ = function () { return { hasClass: function () { return false; }, length: 0 }; };
    global.Message = { IsOpen: false };
    global.ParchLockMap = undefined;
    global.document.body.classList.contains = function () { return false; };
}

// --- Nothing else open: back now REQUIRES confirmation before exiting ---
(function () {
    resetStubs();

    var ML = loadFresh();
    var calls = makeCapApp();
    ML.MobileLayout.bindAndroidBackButton();

    global.confirm = function () { return false; }; // player says "no, don't exit"
    calls.addListener();
    assert(calls.exitApp === 0, "declining the confirmation does not exit the app");

    global.confirm = function () { return true; }; // player confirms
    calls.addListener();
    assert(calls.exitApp === 1, "confirming the prompt does exit the app (back still works, just never silently)");
})();

// D120: MobileTutorial._active is no longer a priority case at all -- the
// D113 tutorial runs on its own separate route (tutorial.html) that this
// back-button handler (bound only on play.html) can never observe, so
// there is nothing left to test here. Confirm the retirement itself
// structurally instead: MobileTutorial must not exist as a global once
// MobileLayout.js has been loaded.
(function () {
    resetStubs();
    var ML = loadFresh();
    assert(typeof MobileTutorial === "undefined", "MobileTutorial no longer exists as a global at all once MobileLayout.js loads (fully retired, not just unused)");
})();

// --- Every earlier-priority dismiss case is untouched and still pre-empts the confirm ---
(function () {
    resetStubs();
    global.CharKeys = { isPadOpen: function () { return true; }, closeArrowPad: function () { this.closed = true; } };
    global.confirm = function () { assert(false, "confirm() must never be reached while the arrow pad is open"); return false; };

    var ML = loadFresh();
    var calls = makeCapApp();
    ML.MobileLayout.bindAndroidBackButton();
    calls.addListener();
    assert(global.CharKeys.closed === true, "an open arrow pad still closes on back, ahead of the confirm gate");
    assert(calls.exitApp === 0, "the arrow-pad case never exits the app");
})();

(function () {
    resetStubs();
    global.Message = { IsOpen: true, hidden: false, Hide: function () { this.hidden = true; } };
    global.confirm = function () { assert(false, "confirm() must never be reached while a Message dialog is open"); return false; };

    var ML = loadFresh();
    var calls = makeCapApp();
    ML.MobileLayout.bindAndroidBackButton();
    calls.addListener();
    assert(global.Message.hidden === true, "an open Message dialog still hides on back, ahead of the confirm gate");
    assert(calls.exitApp === 0, "the Message-dialog case never exits the app");
})();

(function () {
    resetStubs();
    global.ParchLockMap = { Toggle: function () { this.toggled = true; } };
    global.document.body.classList.contains = function (c) { return c === "map-open"; };
    global.confirm = function () { assert(false, "confirm() must never be reached while the map panel is open"); return false; };

    var ML = loadFresh();
    var calls = makeCapApp();
    ML.MobileLayout.bindAndroidBackButton();
    calls.addListener();
    assert(global.ParchLockMap.toggled === true, "an open map panel still toggles closed on back, ahead of the confirm gate");
    assert(calls.exitApp === 0, "the map-open case never exits the app");
})();

// --- A genuinely unexpected internal error is still a last-resort immediate exit ---
(function () {
    resetStubs();
    global.$ = function () { throw new Error("boom"); }; // simulate an unexpected failure partway through the chain
    global.confirm = function () { assert(false, "the error fallback must not go through the ordinary confirm gate"); return false; };

    var ML = loadFresh();
    var calls = makeCapApp();
    ML.MobileLayout.bindAndroidBackButton();
    calls.addListener();
    assert(calls.exitApp === 1, "a genuinely unexpected internal error still falls back to an immediate exit, as a last resort");
})();

console.log("\n" + pass + " PASS / " + fail + " FAIL");
process.exit(fail ? 1 : 0);
