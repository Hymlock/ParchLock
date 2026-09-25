// D114 (operator-reported, pre-existing -- Download map/Text export/
// transcript/save-package exports never worked on the Android APK).
// MainActivity.java has no download handling of any kind and Android's
// WebView does not reliably fire download handling for blob: URLs at all,
// so the old <a download> blob-anchor click silently did nothing there.
// This proves ParchLockQol.DownloadText now routes through
// @capacitor/filesystem + @capacitor/share when present (the real device
// path) and falls back to the exact original blob-anchor technique
// everywhere else (desktop/browser), unchanged.
global.window = global;
global.URL = { createObjectURL: function () { return "blob:fake"; }, revokeObjectURL: function () {} };
global.Blob = function (parts, opts) { this.parts = parts; this.opts = opts; };
// ParchLockQol.EscapeHtml uses jQuery ($("<div>").text(x).html()) -- stub
// just enough of it for that one call pattern (this harness never touches
// real DOM rendering otherwise).
global.$ = function () {
    var state = { text: "" };
    var api = {
        text: function (v) { state.text = v; return api; },
        html: function () { return String(state.text).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;"); }
    };
    return api;
};

var appended = [];
var clicked = [];
global.document = {
    createElement: function (tag) {
        var el = { tag: tag, attrs: {}, click: function () { clicked.push(el); } };
        return el;
    },
    body: {
        appendChild: function (el) { appended.push(el); },
        removeChild: function () {}
    }
};
global.setTimeout = function () {}; // don't actually schedule anything in this harness

const fs = require("fs");
const path = require("path");
const src = fs.readFileSync(path.resolve(__dirname, "..", "js", "Qol.js"), "utf8");
// Qol.js is a large object literal assigned to ParchLockQol -- extract just
// enough surrounding context for DownloadText to run standalone. Simpler and
// more robust than stubbing every other method: eval the whole file (it only
// defines `var ParchLockQol = {...}`, no top-level side effects) and call
// the one function under test directly, same approach as this repo's other
// harnesses (e.g. harness/d48-map-single-room-per-destination.js).
global.Message = { Show: function () {} };
eval(src);

let pass = 0, fail = 0;
function assert(cond, msg) {
    if (cond) { pass++; console.log("PASS:", msg); }
    else { fail++; console.log("FAIL:", msg); }
}

// --- No Capacitor plugins present (desktop/browser): unchanged legacy path ---
delete global.window.Capacitor;
appended = []; clicked = [];
ParchLockQol.DownloadText("map.json", "{}");
assert(appended.length === 1 && appended[0].tag === "a", "without Capacitor plugins, DownloadText still creates and appends an <a> element");
assert(appended[0].download === "map.json", "the fallback <a> still carries the correct download filename");
assert(clicked.length === 1 && clicked[0] === appended[0], "the fallback <a> is still click()ed to trigger the browser's own download");

// --- Capacitor Filesystem + Share present (real Android device): new path, never touches the anchor technique ---
var writeFileCalls = [], shareCalls = [];
global.window.Capacitor = {
    isNativePlatform: function () { return true; },
    Plugins: {
        Filesystem: {
            writeFile: function (opts) { writeFileCalls.push(opts); return Promise.resolve({ uri: "file:///data/user/0/com.parchlock.app/cache/map.json" }); }
        },
        Share: {
            share: function (opts) { shareCalls.push(opts); return Promise.resolve(); }
        }
    }
};
appended = []; clicked = [];
ParchLockQol.DownloadText("map.json", "{\"rooms\":[]}");
assert(appended.length === 0, "with Capacitor Filesystem+Share present, the old blob-anchor technique is never used at all");
assert(writeFileCalls.length === 1 && writeFileCalls[0].path === "map.json", "Filesystem.writeFile is called with the correct filename");
// D121: this assertion used to demand `data instanceof Blob`, which is what
// let the D114 bug ship -- a Blob cannot cross the Capacitor bridge (the
// plugin's own typings: "Blob data is only supported on Web") and Android
// rejected every export with "The 'writeFile' input parameters aren't
// valid.". The stub below always resolved, so nothing ever noticed.
assert(typeof writeFileCalls[0].data === "string" && writeFileCalls[0].data === "{\"rooms\":[]}", "Filesystem.writeFile is given the payload as a STRING -- a Blob cannot cross the native bridge");
assert(writeFileCalls[0].encoding === "utf8", "an explicit utf8 encoding is passed -- without it the native plugin base64-decodes `data` and fails on plain text");
assert(!(writeFileCalls[0].data instanceof global.Blob), "the options object never carries a Blob on the native path");
// Bridge-serialization guard: whatever is passed must survive the structured
// /JSON round-trip the Capacitor bridge performs. A Blob collapses to {} here,
// so this fails closed if anyone reintroduces one.
var bridged = JSON.parse(JSON.stringify(writeFileCalls[0]));
assert(typeof bridged.data === "string" && bridged.data.length > 0, "the writeFile options survive bridge serialization with `data` intact (a Blob would serialize to {})");
assert(writeFileCalls[0].directory === "CACHE", "the file is written into the app's own Cache directory (no runtime permission prompt needed on Android)");

// share() is called asynchronously off writeFile's resolution -- flush microtasks.
setImmediate(function () {
    assert(shareCalls.length === 1 && shareCalls[0].files && shareCalls[0].files[0] === "file:///data/user/0/com.parchlock.app/cache/map.json", "Share.share is called with the written file's real uri, letting the player save it via the native share sheet");
    assert(shareCalls[0].title === "map.json", "the share sheet is titled with the export's filename");

    // --- A cancelled/failed share must not throw or leave the user stuck ---
    var shownError = null;
    global.Message.Show = function (title, body) { shownError = { title: title, body: body }; };
    global.window.Capacitor.Plugins.Share.share = function () { return Promise.reject(new Error("User canceled")); };
    ParchLockQol.DownloadText("map.json", "{}");
    setImmediate(function () {
        assert(shownError === null, "the user backing out of the share sheet (a 'cancel'-flavored rejection) is not treated as an error worth interrupting them over");

        global.window.Capacitor.Plugins.Share.share = function () { return Promise.reject(new Error("disk full")); };
        ParchLockQol.DownloadText("map.json", "{}");
        setImmediate(function () {
            assert(shownError && /Could not save/.test(shownError.title), "a genuine failure (not a cancel) shows an in-app message instead of failing silently");

                // ---- D129: save-to-device via the Storage Access Framework ----------
    // The share sheet is the right verb for "send this elsewhere" and the
    // wrong one for "save this onto my phone". Scoped storage blocks writing
    // to Downloads by path at targetSdk 36, so SAF's ACTION_CREATE_DOCUMENT
    // (the system "Save to..." picker) is the sanctioned route.
    var saveCalls = [];
    global.window.Capacitor.Plugins.SaveFile = {
        saveFile: function (opts) { saveCalls.push(opts); return Promise.resolve({ uri: "content://com.android.providers.downloads.documents/document/42" }); }
    };
    writeFileCalls.length = 0; shareCalls.length = 0; appended = []; clicked = [];
    ParchLockQol.DownloadText("map.txt", "hello");
    setImmediate(function () {
        assert(saveCalls.length === 1, "when the native save plugin is present it is used, so the player gets a file picker rather than a share sheet");
        assert(saveCalls[0].filename === "map.txt" && saveCalls[0].data === "hello", "the picker is handed the filename and the payload as a string");
        assert(saveCalls[0].mimeType === "text/plain", "a .txt export declares text/plain so the picker does not hide folders");
        assert(writeFileCalls.length === 0 && shareCalls.length === 0, "the share-sheet route is NOT used when a real save is available");
        assert(appended.length === 0, "and the browser blob-anchor route is not used either");

        ParchLockQol.DownloadText("save-package.json", "{}");
        setImmediate(function () {
            assert(saveCalls[1] && saveCalls[1].mimeType === "application/json", "a .json export declares application/json");

            // Backing out of the picker must be silent; a real failure must not be.
            var shown = null;
            global.Message.Show = function (title, body) { shown = { title: title, body: body }; };
            global.window.Capacitor.Plugins.SaveFile.saveFile = function () { return Promise.reject(new Error("canceled")); };
            ParchLockQol.DownloadText("map.txt", "x");
            setImmediate(function () {
                assert(shown === null, "backing out of the file picker is not treated as an error");

                global.window.Capacitor.Plugins.SaveFile.saveFile = function () { return Promise.reject(new Error("no space left")); };
                ParchLockQol.DownloadText("map.txt", "x");
                setImmediate(function () {
                    assert(shown && /Could not save/.test(shown.title), "a genuine save failure is reported");

                    // An APK built before the plugin existed must still work.
                    delete global.window.Capacitor.Plugins.SaveFile;
                    writeFileCalls.length = 0;
                    ParchLockQol.DownloadText("map.txt", "x");
                    assert(writeFileCalls.length === 1, "without the native save plugin it falls back to the Filesystem+Share route rather than doing nothing");

                    console.log("\n" + pass + " PASS / " + fail + " FAIL");
                    process.exit(fail ? 1 : 0);
                });
            });
        });
    });

        });
    });
});
