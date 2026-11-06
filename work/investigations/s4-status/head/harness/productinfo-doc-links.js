// Operator-reported fix: the About dialog's Credits/Privacy/Third-party-
// notices/Source-and-build links used to be real <a href="X.md"
// target="_blank"> navigation. In the Android Capacitor WebView (no
// multi-window support) that navigates the SINGLE WebView away from the
// entire app instead of opening a tab, unloading all JS/game state -- the
// hardware back button then has nothing of this app's own to return to.
// This harness proves (1) no such real-navigation markup is generated any
// more, (2) the doc links resolve to the correct bundled filenames and
// never leave the page (preventDefault + in-app fetch/render), and (3)
// both the success and failure fetch paths still offer a way back to
// About rather than a dead end.
global.window = global;

var lastShow = null;
global.Message = {
    IsOpen: false,
    Show: function (title, body) { lastShow = { title: title, body: body }; global.Message.IsOpen = true; },
    Hide: function () { global.Message.IsOpen = false; }
};
global.ParchLockQol = { EscapeHtml: function (s) { return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;"); } };

// Minimal fake jQuery: just enough to record delegated handlers on
// "#message" and let the test manually invoke them by selector, matching
// how ProductInfo.bindDocLinks actually binds (a real DOM/browser is not
// available in this harness -- this is structural coverage; the actual
// fetch()-from-a-bundled-relative-path behavior is already proven
// elsewhere in this codebase, e.g. js/VmProbeLoader.js/js/EmglkenHost.js).
var handlers = {};
function fakeMessageEl() {
    var api = {
        off: function () { return api; },
        on: function (evt, sel, fn) { handlers[sel] = fn; return api; }
    };
    return api;
}
global.$ = function (sel) {
    if (sel === "#message") return fakeMessageEl();
    return { off: function () { return this; }, on: function () { return this; } };
};

const fs = require("fs");
const path = require("path");
const src = fs.readFileSync(path.resolve(__dirname, "..", "js", "ProductInfo.js"), "utf8");
eval(src);

let pass = 0, fail = 0;
function assert(cond, msg) {
    if (cond) { pass++; console.log("PASS:", msg); }
    else { fail++; console.log("FAIL:", msg); }
}

// --- showAbout: no real navigation markup ---
ProductInfo.showAbout();
assert(lastShow && lastShow.body.indexOf("target='_blank'") === -1 && lastShow.body.indexOf('target="_blank"') === -1, "About dialog no longer contains any target=_blank real-navigation link");
assert(lastShow.body.indexOf("href='CREDITS.md'") === -1, "Credits is no longer a real href navigation");
["CREDITS.md", "PRIVACY.md", "THIRD_PARTY_NOTICES.md", "SOURCE_BUILD.md"].forEach(function (f) {
    assert(lastShow.body.indexOf("data-doc='" + f + "'") !== -1, "About dialog still links to the correct bundled file: " + f);
});
assert(!!handlers[".pl-doc-link"], "bindDocLinks registers a delegated handler for .pl-doc-link");
assert(!!handlers[".pl-doc-back"], "bindDocLinks registers a delegated handler for .pl-doc-back");

// --- clicking a doc link never navigates (preventDefault) and fetches in-app ---
global.fetch = function (filename) {
    assert(filename === "PRIVACY.md", "clicking the Privacy link fetches exactly PRIVACY.md, not a browser navigation");
    return Promise.resolve({ ok: true, text: function () { return Promise.resolve("PRIVACY TEXT & <stuff>"); } });
};
var prevented = false;
var fakeEvent = { preventDefault: function () { prevented = true; } };
var fakeLinkEl = { data: function (k) { return k === "title" ? "Privacy" : "PRIVACY.md"; } };
// simulate jQuery's `this`/`$(this)` inside the handler -- any plain object
// passed in (standing in for `$(this)` on a real element) is returned as-is,
// so its own .data() stub answers the call.
global.$ = (function (orig) {
    var f = function (sel) {
        if (sel && typeof sel === "object") return sel;
        return orig(sel);
    };
    return f;
})(global.$);
handlers[".pl-doc-link"].call(fakeLinkEl, fakeEvent);
assert(prevented, "clicking a doc link calls preventDefault -- it never performs a real navigation");

// Let the fetch promise chain resolve before asserting the rendered result.
setTimeout(function () {
    assert(lastShow.title === "Privacy", "showDoc displays the doc under its own title");
    assert(lastShow.body.indexOf("PRIVACY TEXT &amp; &lt;stuff&gt;") !== -1, "fetched doc text is HTML-escaped before being rendered");
    assert(lastShow.body.indexOf("pl-doc-back") !== -1, "the loaded doc still offers a Back-to-About link (never a dead end)");

    // --- fetch failure still offers a way back, never a dead end ---
    global.fetch = function () { return Promise.reject(new Error("network down")); };
    handlers[".pl-doc-link"].call({ data: function (k) { return k === "title" ? "Credits" : "CREDITS.md"; } }, { preventDefault: function () {} });

    setTimeout(function () {
        assert(lastShow.body.indexOf("Could not load this document") !== -1, "a failed fetch shows an in-app error instead of a blank/dead page");
        assert(lastShow.body.indexOf("pl-doc-back") !== -1, "a failed fetch still offers a way back to About");

        console.log("\n" + pass + " PASS / " + fail + " FAIL");
        process.exit(fail ? 1 : 0);
    }, 0);
}, 0);
