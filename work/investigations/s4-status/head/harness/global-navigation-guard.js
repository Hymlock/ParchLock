// Operator-reported bug class + explicit operator instruction: don't hunt
// down every individual spot that could navigate the app away -- add one
// general backstop instead. This proves Global.BindNavigationGuard's single
// delegated click listener blocks any relative-link navigation (which would
// unload the whole running app in the Capacitor WebView) while leaving real
// external links, in-page anchors, and non-anchor clicks alone.
global.window = global;

var registered = null;
global.document = {
    __plNavGuardBound: false,
    addEventListener: function (evt, fn, capture) {
        if (evt === "click") registered = fn;
    }
};

const fs = require("fs");
const path = require("path");
const src = fs.readFileSync(path.resolve(__dirname, "..", "js", "Global.js"), "utf8");
// Global.js self-invokes Global.BindNavigationGuard() at the bottom using
// the real `document` global as loaded in a browser -- eval against our
// fake `document` above exercises exactly that same self-invocation.
eval(src);

let pass = 0, fail = 0;
function assert(cond, msg) {
    if (cond) { pass++; console.log("PASS:", msg); }
    else { fail++; console.log("FAIL:", msg); }
}

assert(typeof registered === "function", "Global.js registers a delegated click listener on document at load time");

function fakeAnchor(href, hasDownload) {
    var el = {
        tagName: "A",
        getAttribute: function (k) { return k === "href" ? href : null; },
        hasAttribute: function (k) { return k === "download" && !!hasDownload; },
        closest: function () { return el; }
    };
    return el;
}
function fire(anchorOrNull) {
    var prevented = false;
    var evt = {
        target: anchorOrNull ? { closest: function () { return anchorOrNull; } } : { closest: function () { return null; } },
        preventDefault: function () { prevented = true; }
    };
    registered(evt);
    return prevented;
}

assert(fire(fakeAnchor("blob:https://localhost/2fdb41d4-fake-uuid", true)) === false, "a [download] blob: link (ParchLockQol.DownloadText's export technique -- Download map/Text export/transcript/save-package all use it) is never blocked, regardless of its blob: scheme");
assert(fire(fakeAnchor("relative/export.json", true)) === false, "a [download] link is exempted by the attribute itself, not by enumerating safe schemes -- any future export technique is covered automatically");
assert(fire(fakeAnchor("CREDITS.md")) === true, "a relative local-file link (the exact class of bug reported) is blocked");
assert(fire(fakeAnchor("SOURCE_BUILD.md")) === true, "any other relative .md link is blocked the same way, without needing to be named specifically");
assert(fire(fakeAnchor("some/nested/path.html")) === true, "a relative link is blocked regardless of extension or nesting -- this is a general backstop, not a filename allowlist");
assert(fire(fakeAnchor("#notes-tab")) === false, "an in-page anchor (#fragment) is left alone");
assert(fire(fakeAnchor("")) === false, "an anchor with no real href is left alone");
assert(fire(fakeAnchor("https://example.com/license")) === false, "a real absolute external URL is left alone (safe to hand to the OS)");
assert(fire(fakeAnchor("http://example.com")) === false, "http (not just https) absolute URLs are left alone");
assert(fire(fakeAnchor("mailto:test@example.com")) === false, "mailto: links are left alone");
assert(fire(fakeAnchor("tel:+15555550123")) === false, "tel: links are left alone");
assert(fire(null) === false, "a click that isn't on any <a> element is a no-op (never throws)");

console.log("\n" + pass + " PASS / " + fail + " FAIL");
process.exit(fail ? 1 : 0);
