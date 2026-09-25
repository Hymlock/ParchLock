// D117 prototype: pure-logic coverage for slice population (dynamic per
// room/module, compass-word only tonight) and the angle+radius hit-testing
// hover logic, without needing a real DOM/pointer environment. Real
// touch/mouse-driven gesture timing (long-press fire, move-cancel, pointer
// capture) needs a live browser and is not exercised here -- this proves
// the pure math/data-selection logic is correct in isolation.
global.window = { innerWidth: 900, innerHeight: 700, addEventListener: function () {} };
function fakeElement() {
    return {
        classList: { add: function () {}, remove: function () {}, contains: function () { return false; } },
        style: {},
        dataset: {},
        appendChild: function () {},
        setAttribute: function () {},
        addEventListener: function () {},
        removeEventListener: function () {},
        setPointerCapture: function () {},
        releasePointerCapture: function () {},
        getBoundingClientRect: function () { return { left: 0, top: 0, width: 44, height: 44 }; },
        hidden: false
    };
}
var _bodyClasses = {};
global.document = {
    readyState: "complete",
    hidden: false,
    createElement: fakeElement,
    body: {
        appendChild: function () {},
        classList: {
            add: function (c) { _bodyClasses[c] = true; },
            remove: function (c) { delete _bodyClasses[c]; },
            contains: function (c) { return !!_bodyClasses[c]; }
        }
    },
    addEventListener: function () {},
    removeEventListener: function () {},
    querySelector: function () { return null; },
    getElementById: function () { return null; },
    activeElement: null
};
// codex #786 blocker 2 follow-up: Init() now observes #windowport/body for
// playability re-evaluation. No real MutationObserver in plain Node --
// a no-op stub is enough since this harness never calls Init() with real
// DOM mutations to react to; the observer's own callback logic is covered
// by direct IsStoryPlayable()/ApplyEnabledState() calls below instead.
global.MutationObserver = function (cb) {
    this.observe = function () {};
    this.disconnect = function () {};
};
// Per-module localStorage mock for the programmable Settings suite.
var _store = {};
global.localStorage = {
    getItem: function (k) { return Object.prototype.hasOwnProperty.call(_store, k) ? _store[k] : null; },
    setItem: function (k, v) { _store[k] = String(v); },
    removeItem: function (k) { delete _store[k]; }
};
global.ParchLock = { GameFilename: "testgame.z5.js" };
// codex #786 blocker 2: IsStoryPlayable() reads $("#windowport .BufferWindow")
// (the same signal js/ParchLock.js already uses). Default "playable" so the
// large body of pre-existing CanOpen()/keyboard tests below (about dialog/
// overlay blocking, not about playability itself) keep testing exactly what
// they always tested; a dedicated block later flips _fakeStoryPlayable to
// prove the new gate itself.
global._fakeStoryPlayable = true;
global.$ = function () {
    return { text: function () { return global._fakeStoryPlayable ? "some room text" : ""; }, length: global._fakeStoryPlayable ? 1 : 0 };
};

const fs = require("fs");
const path = require("path");
const src = fs.readFileSync(path.resolve(__dirname, "..", "js", "DirectionalRadial.js"), "utf8");
eval(src);

let pass = 0, fail = 0;
function assert(cond, msg) {
    if (cond) { pass++; console.log("PASS:", msg); }
    else { fail++; console.log("FAIL:", msg); }
}

// --- GetSlices: dynamic per room, compass-word + D63 borrowed-slot support ---
global.ParchLockMap = { GetCurrentRoom: function () { return { Exits: { n: 1, e: 2, up: 3, "exit 1": 4 } }; } };
global.Actionable = { commandForExitLabel: function (dir) { return dir; } };
var slices = DirectionalRadial.GetSlices();
var dirs = slices.map(function (s) { return s.dir; }).sort();
assert(dirs.length === 4 && dirs.indexOf("n") !== -1 && dirs.indexOf("e") !== -1 && dirs.indexOf("up") !== -1 && dirs.indexOf("exit 1") !== -1, "GetSlices returns the room's real exits (n, e, up) PLUS a D63 numbered-exit key (exit 1), not silently dropped");
var borrowed = slices.filter(function (s) { return s.dir === "exit 1"; })[0];
assert(borrowed && borrowed.label === "E1", "the numbered exit gets a short, legible borrowed label (E1), not the raw 'exit 1' text");
assert(borrowed && !(borrowed.ring === 0 && borrowed.angle === DirectionalRadial.LAYOUT.n.angle), "the borrowed slot never collides with n's own real angle/ring (n already claimed it)");
assert(borrowed && !(borrowed.ring === 0 && borrowed.angle === DirectionalRadial.LAYOUT.e.angle), "the borrowed slot never collides with e's own real angle/ring either");

// Every ring-0 slot claimed by real compass exits AND up/in/down/out already
// claim ring 1 -- a numbered exit must then borrow ring 1's remaining slots,
// never silently overwrite/collide with a real slice already there.
global.ParchLockMap = { GetCurrentRoom: function () { return { Exits: { n: 1, ne: 2, e: 3, se: 4, s: 5, sw: 6, w: 7, nw: 8, up: 9, "exit 1": 10 } }; } };
slices = DirectionalRadial.GetSlices();
var numbered = slices.filter(function (s) { return s.dir === "exit 1"; })[0];
assert(numbered && numbered.ring === 1, "once every ring-0 slot is claimed by real compass exits, a numbered exit borrows a ring-1 slot instead");
var upSlice = slices.filter(function (s) { return s.dir === "up"; })[0];
assert(upSlice && !(numbered.ring === upSlice.ring && numbered.angle === upSlice.angle), "the borrowed ring-1 slot never collides with Up's own real angle");

global.ParchLockMap = { GetCurrentRoom: function () { return { Exits: { w: 1, out: 2 } }; } };
slices = DirectionalRadial.GetSlices();
dirs = slices.map(function (s) { return s.dir; }).sort();
assert(dirs.length === 2 && dirs[0] === "out" && dirs[1] === "w", "a different room's slice set is fully dynamic -- only that room's own exits appear (w, out), matching D63's per-module-generality principle");

global.ParchLockMap = { GetCurrentRoom: function () { return { Exits: {} }; } };
assert(DirectionalRadial.GetSlices().length === 0, "a room with zero exits and no custom slices yields zero slices (handle press becomes a no-op, per onPointerDown's own guard)");

// --- Programmable settings: storage CRUD, per-module isolation, GetSlices merge ---
DirectionalRadial.SaveCustomSlices([]); // start clean for testgame.z5.js
assert(DirectionalRadial.GetCustomSlices().length === 0, "a fresh module starts with no custom slices");

var added = DirectionalRadial.AddCustomSlice({ label: "Wait", command: "wait", angle: 30, ring: 2 });
assert(added && added.id, "AddCustomSlice assigns a real id and persists");
assert(DirectionalRadial.GetCustomSlices().length === 1 && DirectionalRadial.GetCustomSlices()[0].command === "wait", "the custom slice is retrievable after adding");

DirectionalRadial.UpdateCustomSlice(added.id, { label: "Zzz", angle: 45 });
var updated = DirectionalRadial.GetCustomSlices()[0];
assert(updated.label === "Zzz" && updated.angle === 45 && updated.command === "wait", "UpdateCustomSlice merges the patch, leaving untouched fields (command) alone");

global.ParchLockMap = { GetCurrentRoom: function () { return { Exits: { n: 1 } }; } };
slices = DirectionalRadial.GetSlices();
var customInSlices = slices.filter(function (s) { return s.custom; })[0];
assert(customInSlices && customInSlices.label === "Zzz" && customInSlices.command === "wait", "GetSlices merges the module's saved custom slice in alongside the room's real exits");
assert(slices.some(function (s) { return s.dir === "n"; }), "...without losing the room's own real exit");

DirectionalRadial.RemoveCustomSlice(added.id);
assert(DirectionalRadial.GetCustomSlices().length === 0, "RemoveCustomSlice deletes it");

// Per-module isolation: a DIFFERENT module's storage key must not see this one's data.
DirectionalRadial.AddCustomSlice({ label: "Look", command: "look", angle: 0, ring: 2 });
var otherModuleKey = DirectionalRadial.StorageKey();
global.ParchLock = { GameFilename: "othergame.z5.js" };
assert(DirectionalRadial.GetCustomSlices().length === 0, "a different module (different GameFilename) sees NO custom slices from the first one -- per-module storage key isolation (same PL_<Feature>_<file> convention as ParchLockMap.Save/Load)");
global.ParchLock = { GameFilename: "testgame.z5.js" };
assert(DirectionalRadial.GetCustomSlices().length === 1, "switching back to the original module still has its own saved slice");
DirectionalRadial.SaveCustomSlices([]); // clean up for later tests

// --- RadiusForRing: built-in rings 0/1 plus unbounded custom rings (2+) ---
assert(DirectionalRadial.RadiusForRing(0) === DirectionalRadial.MAIN_RADIUS, "ring 0 uses MAIN_RADIUS");
assert(DirectionalRadial.RadiusForRing(1) === DirectionalRadial.OUTER_RADIUS, "ring 1 uses OUTER_RADIUS");
assert(DirectionalRadial.RadiusForRing(2) === DirectionalRadial.OUTER_RADIUS + DirectionalRadial.RING_STEP, "ring 2 (first custom ring) steps out from OUTER_RADIUS by RING_STEP");
assert(DirectionalRadial.RadiusForRing(3) === DirectionalRadial.OUTER_RADIUS + 2 * DirectionalRadial.RING_STEP, "ring 3 steps out again -- unbounded, not hardcoded to two rings");

// --- Operator's requested placement: up above N, down above S, in right-of-E, out left-of-W ---
assert(DirectionalRadial.LAYOUT.up.angle === DirectionalRadial.LAYOUT.n.angle && DirectionalRadial.LAYOUT.up.ring === 1 && DirectionalRadial.LAYOUT.n.ring === 0, "Up sits on the SAME angle as N but an outer ring -- 'above N' as an outward extension, not a separate direction");
assert(DirectionalRadial.LAYOUT.down.angle === DirectionalRadial.LAYOUT.s.angle && DirectionalRadial.LAYOUT.down.ring === 1 && DirectionalRadial.LAYOUT.s.ring === 0, "Down sits on the SAME angle as S but an outer ring -- 'above S' (outward) mirrors Up");
assert(DirectionalRadial.LAYOUT["in"].angle === DirectionalRadial.LAYOUT.e.angle && DirectionalRadial.LAYOUT["in"].ring === 1 && DirectionalRadial.LAYOUT.e.ring === 0, "In is on the SAME angle as E but the outer ring -- self-audit fix: a tight angular offset on the same ring as E made 'e'+'in' rooms render two overlapping pills every time (operator-reported live)");
assert(DirectionalRadial.LAYOUT.out.angle === DirectionalRadial.LAYOUT.w.angle && DirectionalRadial.LAYOUT.out.ring === 1 && DirectionalRadial.LAYOUT.w.ring === 0, "Out mirrors In: same angle as W, outer ring, never the same ring as W itself");

// --- Self-audit: no two slices in the SAME ring can ever collide, for every possible room (the actual reported bug) ---
var ALL_DIRS = Object.keys(DirectionalRadial.LAYOUT);
var minGapDeg = 999;
[0, 1].forEach(function (ring) {
    var anglesInRing = ALL_DIRS.filter(function (d) { return DirectionalRadial.LAYOUT[d].ring === ring; }).map(function (d) { return DirectionalRadial.LAYOUT[d].angle; }).sort(function (a, b) { return a - b; });
    for (var i = 1; i < anglesInRing.length; i++) {
        minGapDeg = Math.min(minGapDeg, anglesInRing[i] - anglesInRing[i - 1]);
    }
});
assert(minGapDeg >= 45, "every pair of same-ring slices is at least 45 degrees apart (the smallest real gap in the whole layout) -- no combination of a room's exits can ever produce two slices closer together than that, which is what actually caused the reported overlap");
var mainRingArc = DirectionalRadial.MAIN_RADIUS * (45 * Math.PI / 180);
assert(mainRingArc > 50, "at the main ring's radius, that minimum 45-degree gap is still comfortably wider (" + mainRingArc.toFixed(1) + "px of arc) than a single rendered pill (~26-50px) -- not just angularly non-overlapping in theory, but with real visual clearance");

// --- updateHover: angle+radius bucketing picks the right slice, ignores the wrong ring, has a dead zone ---
function makeSlice(dir) {
    var meta = DirectionalRadial.LAYOUT[dir];
    return { dir: dir, angle: meta.angle, ring: meta.ring, el: { classList: { add: function () {}, remove: function () {} } } };
}
DirectionalRadial._centerX = 100;
DirectionalRadial._centerY = 100;
DirectionalRadial._hovered = null;
DirectionalRadial._slices = [makeSlice("n"), makeSlice("e"), makeSlice("s"), makeSlice("w"), makeSlice("up")];

DirectionalRadial.updateHover(100, 100 - DirectionalRadial.MAIN_RADIUS); // straight up from center, main ring
assert(DirectionalRadial._hovered && DirectionalRadial._hovered.dir === "n", "a finger straight above center, at the main ring's radius, hovers N (got " + (DirectionalRadial._hovered && DirectionalRadial._hovered.dir) + ")");

DirectionalRadial.updateHover(100 + DirectionalRadial.MAIN_RADIUS, 100); // straight right, main ring
assert(DirectionalRadial._hovered && DirectionalRadial._hovered.dir === "e", "a finger straight right of center, at the main ring's radius, hovers E");

DirectionalRadial.updateHover(100, 100 - DirectionalRadial.OUTER_RADIUS); // straight up, OUTER ring -- should hit Up, not N
assert(DirectionalRadial._hovered && DirectionalRadial._hovered.dir === "up", "the SAME angle at the outer ring's radius hovers Up, not N -- ring matters, not just angle");

DirectionalRadial.updateHover(100, 100); // dead-center
assert(DirectionalRadial._hovered === null, "the dead zone at the very center selects nothing (lets the player abort without committing)");

DirectionalRadial.updateHover(100 + DirectionalRadial.MAIN_RADIUS, 100 - DirectionalRadial.MAIN_RADIUS); // NE-ish, no NE slice in this set
assert(DirectionalRadial._hovered === null, "a finger positioned where no slice exists in the CURRENT set (only n/e/s/w/up here) selects nothing, rather than snapping to the nearest unrelated slice");

// --- chaseIfNeeded: the ring follows the finger once it presses beyond REACH ---
DirectionalRadial._ringSize = 240;
DirectionalRadial.ring = { style: { left: "400px", top: "400px" } };
DirectionalRadial._centerX = 400 + 120; // 520
DirectionalRadial._centerY = 400 + 120; // 520
global.window = { innerWidth: 2000, innerHeight: 2000 }; // huge viewport -- no clamping in play here

DirectionalRadial.chaseIfNeeded(DirectionalRadial._centerX + 50, DirectionalRadial._centerY); // well within REACH (182)
assert(DirectionalRadial.ring.style.left === "400px", "the ring does NOT move for a press still within its reach");

var beforeLeft = parseFloat(DirectionalRadial.ring.style.left);
DirectionalRadial.chaseIfNeeded(DirectionalRadial._centerX + 300, DirectionalRadial._centerY); // straight right, well past REACH
assert(parseFloat(DirectionalRadial.ring.style.left) > beforeLeft, "sliding too far RIGHT shifts the ring itself to the right (operator's own example)");
assert(DirectionalRadial.ring.style.top === "400px", "a purely rightward slide does not also shift the ring vertically");

DirectionalRadial.ring.style.left = "400px";
DirectionalRadial.ring.style.top = "400px";
DirectionalRadial._centerX = 520;
DirectionalRadial._centerY = 520;
var beforeTop = parseFloat(DirectionalRadial.ring.style.top);
DirectionalRadial.chaseIfNeeded(DirectionalRadial._centerX, DirectionalRadial._centerY + 300); // straight down, well past REACH
assert(parseFloat(DirectionalRadial.ring.style.top) > beforeTop, "sliding too far DOWN shifts the ring itself downward (moving it 'up' relative to the finger, operator's own example)");

// --- chaseIfNeeded: clamped to the viewport, never pushed off-screen ---
DirectionalRadial.ring.style.left = "1900px";
DirectionalRadial.ring.style.top = "400px";
DirectionalRadial._centerX = 1900 + 120;
DirectionalRadial._centerY = 400 + 120;
global.window = { innerWidth: 2000, innerHeight: 2000 };
DirectionalRadial.chaseIfNeeded(DirectionalRadial._centerX + 500, DirectionalRadial._centerY); // pressing further right than the viewport even has room for
assert(parseFloat(DirectionalRadial.ring.style.left) <= (2000 - 240 - 8) + 0.01, "the ring never chases the finger PAST the viewport's own edge -- stays fully on-screen");

// --- Polish pass: Options toggle wiring and overlay-hiding CSS exist ---
var workspaceSrc = fs.readFileSync(path.resolve(__dirname, "..", "js", "WorkspaceUI.js"), "utf8");
assert(/DirectionalRadialEnabled/.test(workspaceSrc) && /DirectionalRadial\.ApplyEnabledState/.test(workspaceSrc), "WorkspaceUI.ShowOptions has a real checkbox wired to Global.Prefs.DirectionalRadialEnabled and DirectionalRadial.ApplyEnabledState -- 'togglable in its own settings UI' is not just a default pref with no control");

var cssSrc = fs.readFileSync(path.resolve(__dirname, "..", "css", "ParchLock.css"), "utf8");
assert(/body\.app-dialog-open #pl-dirpad-handle/.test(cssSrc), "the handle/ring hide under any Message dialog on EVERY platform (desktop's own #message z-index:5 is otherwise below the dirpad's 27/28)");
assert(/body\.pl-mobile\.map-open #pl-dirpad-handle/.test(cssSrc), "the handle/ring hide while the full-screen mobile map sheet is open (z-index 27/28 would otherwise float above it)");
assert(/body\.pl-mobile\.radial-open #pl-dirpad-handle/.test(cssSrc), "the handle/ring hide while the OTHER (unrelated) radial menu is open");

// --- Operator-reported: handle recentered + everything shrunk more compact ---
var cssSrc2 = fs.readFileSync(path.resolve(__dirname, "..", "css", "ParchLock.css"), "utf8");
assert(/#pl-dirpad-handle\s*\{[^}]*left:\s*50%;/.test(cssSrc2) && /#pl-dirpad-handle\s*\{[^}]*transform:\s*translateX\(-50%\);/.test(cssSrc2), "the handle sits at the horizontal CENTER of the screen (desktop), not anchored to the submit button's position");
assert(/body\.pl-mobile #pl-dirpad-handle\s*\{[^}]*left:\s*50%\s*!important;/.test(cssSrc2), "the handle is centered on mobile too, not right-anchored above the submit button");
assert(DirectionalRadial.MAIN_RADIUS < 92 && DirectionalRadial.OUTER_RADIUS < 168, "the radial's radii were shrunk from the previous build (operator: 'radials are too large')");

// --- Keyboard-only path: cycling selection by Tab (index) and by arrow key (nearest-angle) ---
DirectionalRadial._slices = [makeSlice("n"), makeSlice("e"), makeSlice("s"), makeSlice("w")];
DirectionalRadial._hovered = null;
DirectionalRadial.cycleKeyboardSelection(1);
assert(DirectionalRadial._hovered && DirectionalRadial._hovered.dir === "n", "Tab from nothing selected starts at the first slice");
DirectionalRadial.cycleKeyboardSelection(1);
assert(DirectionalRadial._hovered && DirectionalRadial._hovered.dir === "e", "Tab again advances to the next slice in order");
DirectionalRadial.cycleKeyboardSelection(-1);
assert(DirectionalRadial._hovered && DirectionalRadial._hovered.dir === "n", "Shift+Tab (delta -1) moves back");

DirectionalRadial._hovered = null;
DirectionalRadial.cycleKeyboardSelection("ArrowUp");
assert(DirectionalRadial._hovered && DirectionalRadial._hovered.dir === "n", "ArrowUp selects whichever slice is closest to the 'up' compass angle (n)");
DirectionalRadial.cycleKeyboardSelection("ArrowRight");
assert(DirectionalRadial._hovered && DirectionalRadial._hovered.dir === "e", "ArrowRight selects the slice closest to 'right' (e)");

// --- Settings UI wiring: a real second entry point exists in Options, and the CSS for the panel is real ---
assert(/Configure directions/.test(workspaceSrc) && /DirectionalRadial\.ShowSettings/.test(workspaceSrc), "Options has a real 'Configure directions...' button wired to DirectionalRadial.ShowSettings -- the second, conventional entry point to the full programmable suite (a short tap on the handle itself is the first)");
assert(/\.pl-dirpad-settings-row/.test(cssSrc2) && /\.pl-dirpad-settings-add/.test(cssSrc2), "the settings panel's row/add-form CSS exists, not just the JS building unstyled markup");
var drSrcForKb = fs.readFileSync(path.resolve(__dirname, "..", "js", "DirectionalRadial.js"), "utf8");
assert(/BindKeyboard/.test(drSrcForKb), "a keyboard-only entry point (Ctrl+Alt+D, Tab/arrows, Enter, Escape) is wired at Init(), not just the mouse/touch gesture -- the operator's 'maps to PC' requirement in full, not just the drag gesture working with a mouse");
assert(/e\.ctrlKey && e\.altKey/.test(drSrcForKb) && !/e\.altKey && !e\.ctrlKey[\s\S]{0,40}e\.key\.toLowerCase\(\) === "d"/.test(drSrcForKb), "the open shortcut is Ctrl+Alt+D, not plain Alt+D (codex #782 blocker 9: plain Alt+D is reserved for the address bar in Chrome/Edge and may never reach page JS)");

// --- codex #782 audit fixes: CanOpen gate, corrupt-storage normalization, collision rejection ---
assert(typeof DirectionalRadial.CanOpen === "function", "a central CanOpen() gate exists (blocker 2/4)");
_bodyClasses = {};
assert(DirectionalRadial.CanOpen() === true, "CanOpen() is true when nothing is blocking (clean state)");
global.Message = { IsOpen: true };
assert(DirectionalRadial.CanOpen() === false, "CanOpen() is false while a Message dialog is open");
global.Message = { IsOpen: false };
_bodyClasses["radial-open"] = true;
assert(DirectionalRadial.CanOpen() === false, "CanOpen() is false while the OTHER (unrelated) radial menu is open");
_bodyClasses = {};
global.CharKeys = { isPadOpen: function () { return true; } };
assert(DirectionalRadial.CanOpen() === false, "CanOpen() is false while CharKeys' arrow pad is open -- immediate mutual exclusion (blocker 4) even before the full D118 merge");
global.CharKeys = undefined;
assert(DirectionalRadial.CanOpen() === true, "CanOpen() is true again once every blocking condition clears");

// --- Live bug (operator's own wide-desktop screenshot): "map-open" means
// two very different things depending on platform -- a real full-screen
// sheet covering everything on mobile (should legitimately block), vs a
// permanent side-by-side column on desktop that never covers the story at
// all. This used to block unconditionally, silently making the handle
// completely non-functional on desktop any time the map panel was open. ---
_bodyClasses = {};
_bodyClasses["map-open"] = true;
assert(DirectionalRadial.CanOpen() === true, "CanOpen() is true on desktop (no pl-mobile class) even while map-open is set -- desktop's map panel never covers the story");
_bodyClasses["pl-mobile"] = true;
assert(DirectionalRadial.CanOpen() === false, "CanOpen() is still false on MOBILE while map-open is set -- mobile's map really is a full-screen sheet that covers the story, so this block is still correct there");
_bodyClasses = {};

// --- Live bug (same report): the handle's CSS centers it on the WHOLE
// viewport (`left: 50%`), which is only correct on mobile's single-column
// layout -- on a desktop two-column layout (map panel open beside the
// story) this landed the handle near the seam between the two columns,
// nowhere near the actual command line. RecenterHandle() measures
// #windowport's own live bounds and positions over THAT on desktop. ---
(function () {
    var fakeWp = { getBoundingClientRect: function () { return { left: 100, width: 800 }; } }; // center = 500
    var realGetById = global.document.getElementById;
    global.document.getElementById = function (id) { return id === "windowport" ? fakeWp : realGetById(id); };
    DirectionalRadial.handle = { style: {}, hidden: false };
    _bodyClasses = {}; // desktop (no pl-mobile)
    DirectionalRadial.RecenterHandle();
    assert(DirectionalRadial.handle.style.left === "500px", "RecenterHandle() positions the handle at #windowport's live horizontal center on desktop (100 + 800/2 = 500px), not a viewport-relative 50%");
    _bodyClasses["pl-mobile"] = true;
    DirectionalRadial.handle.style.left = "999px"; // sentinel to prove it gets cleared, not left stale
    DirectionalRadial.RecenterHandle();
    assert(DirectionalRadial.handle.style.left === "", "RecenterHandle() clears any inline left on mobile so the mobile-only `left: 50% !important` CSS rule (correct there -- single column) wins instead");
    global.document.getElementById = realGetById;
    _bodyClasses = {};
})();

// Corrupt/malformed storage never crashes GetSlices (blocker 7).
global.ParchLock = { GameFilename: "corrupt-test.z5.js" };
global.localStorage.setItem(DirectionalRadial.StorageKey(), JSON.stringify({ customSlices: [null, { label: "OK", command: "ok", angle: 10, ring: 2 }, { label: "", command: "bad" }, { label: "Huge", command: "x", angle: 1e20, ring: -5 }, "not an object"] }));
var normalized = DirectionalRadial.GetCustomSlices();
assert(normalized.length === 1 && normalized[0].label === "OK", "GetCustomSlices discards every invalid record (null, empty label, non-finite/negative angle-ring, a bare string) and keeps only the one genuinely valid slice, instead of crashing");
global.ParchLockMap = { GetCurrentRoom: function () { return { Exits: { n: 1 } }; } };
global.Actionable = { commandForExitLabel: function (dir) { return dir; } };
assert(DirectionalRadial.GetSlices().length === 2, "GetSlices() itself does not crash or choke on the corrupted record either -- real exit (n) plus the one valid custom slice");
global.localStorage.removeItem(DirectionalRadial.StorageKey());
global.ParchLock = { GameFilename: "testgame.z5.js" };

// Collision rejection (blocker 3): a custom slice can't shadow a real built-in slot,
// nor silently double up on another custom slice's exact ring+angle.
DirectionalRadial.SaveCustomSlices([]);
assert(DirectionalRadial.HasCollision(DirectionalRadial.LAYOUT.n.angle, DirectionalRadial.LAYOUT.n.ring, null) === true, "HasCollision detects a custom slice that would land exactly on N's real built-in slot");
assert(DirectionalRadial.HasCollision(999, 2, null) === false, "HasCollision is false for a genuinely free angle/ring combination");
var firstCustom = DirectionalRadial.AddCustomSlice({ label: "A", command: "a", angle: 50, ring: 2 });
assert(DirectionalRadial.HasCollision(50, 2, null) === true, "HasCollision detects a collision against an EXISTING custom slice at the same ring+angle");
assert(DirectionalRadial.HasCollision(50, 2, firstCustom.id) === false, "...but not against itself when editing (excludeId)");
DirectionalRadial.SaveCustomSlices([]);

// Viewport-aware scaling (blocker 3): an oversized custom-ring request never
// renders a slice outside the actual viewport.
global.ParchLockMap = { GetCurrentRoom: function () { return { Exits: {} }; } };
global.localStorage.setItem(DirectionalRadial.StorageKey(), JSON.stringify({ customSlices: [{ id: "big", label: "Far", command: "far", angle: 0, ring: 6 }] }));
global.window.innerWidth = 320; global.window.innerHeight = 640;
DirectionalRadial.ring = fakeElement(); // an earlier test block replaced .ring with a plain stub
var bigSlices = DirectionalRadial.GetSlices();
DirectionalRadial.expand(160, 500, bigSlices);
assert(DirectionalRadial._scale < 1, "expand() scales the ring DOWN when the requested geometry (a far-out custom ring) would exceed a 320px-wide viewport");
assert(DirectionalRadial._ringSize <= Math.min(global.window.innerWidth, global.window.innerHeight) - 16, "the actual rendered ring container never exceeds the real viewport, even for ring 6");
global.window.innerWidth = 900; global.window.innerHeight = 700;
DirectionalRadial.SaveCustomSlices([]);

// --- Remaining codex #782 audit fixes: reload race, service worker, CharKeys mutual exclusion ---
var parchLockSrc = fs.readFileSync(path.resolve(__dirname, "..", "js", "ParchLock.js"), "utf8");
assert(/Global\.LoadPrefs\(\);[\s\S]*?DirectionalRadial\.ApplyEnabledState[\s\S]*?ProductInfo\.applyDocumentIdentity/.test(parchLockSrc), "ParchLock.Init() re-applies DirectionalRadial's enabled state immediately after Global.LoadPrefs() -- and before the rest of Init() continues (blocker 1: closes the reload race where a disabled preference was ignored)");

var swSrc = fs.readFileSync(path.resolve(__dirname, "..", "service-worker.js"), "utf8");
assert(/"js\/DirectionalRadial\.js"/.test(swSrc), "js/DirectionalRadial.js is in the service worker's precache list (blocker 5: it was missing, so installed PWA clients might never get the feature)");
// D120: this used to hardcode the exact post-fix version string
// ("parchlock-shell-v28"), which broke the moment a later, entirely
// legitimate bump (D120's own v28->v29 for the tutorial route) landed --
// checking only that the specific historical regression (v27, the version
// that shipped WITHOUT this file precached) is gone proves the same thing
// without re-breaking on every future bump.
assert(!/parchlock-shell-v27"/.test(swSrc), "the cache version was bumped past the specific version that shipped without this file precached, so existing installed clients actually pick up the new shell file");

var ckSrc = fs.readFileSync(path.resolve(__dirname, "..", "js", "CharKeys.js"), "utf8");
assert(/pl-dirpad-open/.test(ckSrc), "CharKeys.autoPadBlocked() now also blocks the auto arrow pad while DirectionalRadial's ring is open (blocker 4: immediate mutual exclusion, the existing extension point, not a rewrite of the auto-pad's own lifecycle)");

// --- D118: merged arrow-pad mode -------------------------------------------
_bodyClasses = {};
global.CharKeys = { isPadOpen: function () { return false; } };
DirectionalRadial.ring = fakeElement();
DirectionalRadial.handle = fakeElement();
DirectionalRadial.ExpandArrows(100, 100);
var arrowDirs = (DirectionalRadial._slices || []).map(function (s) { return s.dir; }).sort();
assert(arrowDirs.length === 5 && arrowDirs.join(",") === "down,enter,left,right,up", "ExpandArrows populates exactly Up/Left/Enter/Right/Down, never the compass LAYOUT or a room's real exits/custom slices");
assert(DirectionalRadial._mode === "arrows", "expand() records mode=arrows");
assert(DirectionalRadial.IsArrowModeOpen() === true, "IsArrowModeOpen() is true right after ExpandArrows");
var enterSlice = (DirectionalRadial._slices || []).filter(function (s) { return s.dir === "enter"; })[0];
assert(enterSlice && enterSlice.ring === "center", "Enter is the special dead-center sentinel, not a normal angle/ring slice (D118 plan section 3 Q1)");

DirectionalRadial.collapse();
assert(DirectionalRadial.IsArrowModeOpen() === false, "IsArrowModeOpen() is false after collapse() (mode reset)");

// A room's real exits still populate normally afterward -- arrow mode and
// exits mode share the shell but never share slice data.
global.ParchLockMap = { GetCurrentRoom: function () { return { Exits: { n: 1 } }; } };
global.Actionable = { commandForExitLabel: function (dir) { return dir; } };
DirectionalRadial.expand(100, 100, DirectionalRadial.GetSlices(), "exits");
assert(DirectionalRadial._mode === "exits" && DirectionalRadial.IsArrowModeOpen() === false, "the shell correctly returns to exits mode afterward -- the two modes never bleed into each other's slice data");
DirectionalRadial.collapse();

// Outside-tap-close: restores the retired #pl-arrowpad's own "tap outside
// the circle closes it" behavior, which the new backdrop-less shell has no
// other way of providing.
var addedHandlers = [];
DirectionalRadial.ring = fakeElement();
global.document.addEventListener = function (evt, fn, capture) { if (evt === "pointerdown" && capture) addedHandlers.push(fn); };
var removedCount = 0;
global.document.removeEventListener = function () { removedCount++; };
DirectionalRadial.ExpandArrows(100, 100);
assert(addedHandlers.length === 1, "ExpandArrows binds exactly one capture-phase document pointerdown listener for outside-tap-close");
var closeCalls = 0;
global.CharKeys = { isPadOpen: function () { return true; }, closeArrowPad: function () { closeCalls++; } };
var handler = addedHandlers[0];
var prevented = false;
handler({ target: { closest: function () { return null; } }, preventDefault: function () { prevented = true; }, stopPropagation: function () {} });
assert(closeCalls === 1 && prevented, "a tap that hits neither an arrow button nor the handle closes arrow mode (and is itself swallowed, matching the old backdrop's behavior)");
handler({ target: { closest: function (sel) { return sel.indexOf(".pl-dirpad-slice--arrow") !== -1 ? {} : null; } }, preventDefault: function () {}, stopPropagation: function () {} });
assert(closeCalls === 1, "a tap that DOES hit an arrow button does not also trigger outside-tap-close");
DirectionalRadial.collapse();
assert(removedCount >= 1, "collapse() unbinds the outside-tap-close listener again (no leaked document-level handler once arrow mode is gone)");

// --- D118 source-level checks: retired DOM, delegated API, self-block fix ---
var ckSrc2 = fs.readFileSync(path.resolve(__dirname, "..", "js", "CharKeys.js"), "utf8");
assert(!/buildPad\s*:/.test(ckSrc2), "CharKeys.buildPad() is fully retired -- DirectionalRadial owns the arrow-pad DOM now, not a second #pl-arrowpad tree");
assert(/DirectionalRadial\.ExpandArrows/.test(ckSrc2) && /DirectionalRadial\.IsArrowModeOpen/.test(ckSrc2) && /DirectionalRadial\.SetArrowLive/.test(ckSrc2), "openArrowPad/isPadOpen/refreshPad all delegate to DirectionalRadial's shared shell");
assert(/CharKeys\.pad\s*[=.&]/.test(ckSrc2) === false, "no remaining LIVE-CODE reference to the retired CharKeys.pad property (an assignment or property access) -- explanatory comments mentioning it by name for documentation are fine and expected");
assert(/DirectionalRadial\._mode !== "arrows"/.test(ckSrc2), "autoPadBlocked()'s pl-dirpad-open check excludes the auto-pad's OWN open state (D118 correctness fix: without this, the very next sync() tick after auto-opening would immediately close what it just opened, since the pad's own open flag would satisfy its own 'blocked' condition)");

var cssSrc3 = fs.readFileSync(path.resolve(__dirname, "..", "css", "ParchLock.css"), "utf8");
assert(/\.pl-dirpad-slice--arrow\s*\{[^}]*pointer-events:\s*auto/.test(cssSrc3), "arrow-mode buttons explicitly re-enable pointer-events (the ring container is pointer-events:none, which is inherited -- without this override every arrow button would be silently unclickable in a real browser, a class of bug no fake-DOM test can catch on its own)");
// Strip comments before checking -- a documentation comment naming the
// retired classes (explaining WHY they're gone) is expected and fine; an
// actual leftover CSS RULE for them is not.
var cssNoComments = cssSrc3.replace(/\/\*[\s\S]*?\*\//g, "");
assert(!/#pl-arrowpad\s*\{/.test(cssNoComments) && !/\.pl-arrowpad__[a-z]/.test(cssNoComments), "the retired #pl-arrowpad/.pl-arrowpad__* CSS RULES are fully removed (comments mentioning the old names for documentation are fine)");

// --- D118 follow-up (operator-confirmed original ask): DirectionalRadialEnabled
// must be ONE merged preference governing both modes of the merged widget --
// ApplyEnabledState() only ever hid the exits-mode handle element, leaving the
// arrow pad (auto AND manual Tools entry) fully live even when "disabled" ---
var ckSrc3 = fs.readFileSync(path.resolve(__dirname, "..", "js", "CharKeys.js"), "utf8");
assert(/autoPadBlocked[\s\S]{0,900}Global\.Prefs\.DirectionalRadialEnabled === false/.test(ckSrc3), "autoPadBlocked() now also blocks the auto arrow pad when the merged DirectionalRadialEnabled preference is off (previously only the exits-mode handle respected this preference)");
assert(/openArrowPad[\s\S]{0,900}Global\.Prefs\.DirectionalRadialEnabled === false/.test(ckSrc3), "manual Tools > Arrow keys (openArrowPad) also refuses to open when the merged preference is off, not just the auto path");

var workspaceSrc2 = fs.readFileSync(path.resolve(__dirname, "..", "js", "WorkspaceUI.js"), "utf8");
assert(/dirRadialOn[\s\S]{0,80}Arrow keys/.test(workspaceSrc2), "Tools menu hides the 'Arrow keys' manual entry point when the merged preference is off, instead of leaving a dead menu item");
assert(/arrow-key pad/.test(workspaceSrc2), "the Options checkbox label was updated to state it covers both the handle and the arrow-key pad, since one preference now governs the whole merged widget");

// === codex D117/D118 audit, bus #786: blockers 1-2, high 3-5, and the ===
// === operator's desktop arrow-overlay follow-up =========================

// --- Blocker 2: shared playable-story gate ---
_bodyClasses = {};
global._fakeStoryPlayable = true;
assert(DirectionalRadial.IsStoryPlayable() === true, "IsStoryPlayable() is true once #windowport has real BufferWindow/GridWindow content");
global._fakeStoryPlayable = false;
assert(DirectionalRadial.IsStoryPlayable() === false, "IsStoryPlayable() is false before any story content exists (e.g. mid-boot)");
assert(DirectionalRadial.CanOpen() === false, "CanOpen() itself refuses when the story isn't playable, not just the handle's own visibility");
DirectionalRadial.ApplyEnabledState();
assert(DirectionalRadial.handle.hidden === true, "ApplyEnabledState() hides the handle when the story isn't playable, even though the preference is on");
global._fakeStoryPlayable = true;
_bodyClasses["no-story"] = true;
assert(DirectionalRadial.IsStoryPlayable() === false, "IsStoryPlayable() is false on the no-story recovery screen specifically (real operator/codex repro) even if #windowport somehow still had stale content");
delete _bodyClasses["no-story"];
DirectionalRadial.ApplyEnabledState();
assert(DirectionalRadial.handle.hidden === false, "the handle becomes visible again once the story is genuinely playable (leaving no-story, real content present)");

// --- High 5: forceReset() routes arrows-mode teardown through CharKeys' ownership API ---
var frCollapseCalls = 0, frResetCalls = 0, frCloseCalls = 0, frCloseReason = "unset";
var realCollapse = DirectionalRadial.collapse;
DirectionalRadial.collapse = function () { frCollapseCalls++; DirectionalRadial._mode = null; document.body.classList.remove("pl-dirpad-open"); };
global.CharKeys = {
    resetAutoPadState: function () { frResetCalls++; },
    closeArrowPad: function (reason) { frCloseCalls++; frCloseReason = reason; },
    isPadOpen: function () { return true; }
};
DirectionalRadial._mode = "arrows";
DirectionalRadial._press = null;
DirectionalRadial.forceReset();
assert(frResetCalls === 1 && frCloseCalls === 1 && frCloseReason === "system", "forceReset() in arrows mode calls CharKeys.resetAutoPadState() and CharKeys.closeArrowPad('system') -- not DirectionalRadial.collapse() directly -- so ownership/eligibility bookkeeping is never bypassed by a blur/visibilitychange");
assert(frCollapseCalls === 0, "forceReset() in arrows mode does not ALSO call collapse() itself directly (that is CharKeys.closeArrowPad's own job internally)");
frCollapseCalls = 0;
DirectionalRadial._mode = "exits";
DirectionalRadial.forceReset();
assert(frCollapseCalls === 1 && frResetCalls === 1 && frCloseCalls === 1, "forceReset() in exits mode still calls DirectionalRadial.collapse() directly -- the CharKeys ownership API is only relevant to arrows mode");
DirectionalRadial.collapse = realCollapse;
DirectionalRadial._mode = null;

// --- Desktop arrow-overlay toggle (operator: default OFF, manual-only, no auto-detect on PC) ---
var daCalls = { open: 0, close: 0 };
global.CharKeys = {
    isPadOpen: function () { return daCalls.open > daCalls.close; },
    openArrowPad: function () { daCalls.open++; },
    closeArrowPad: function () { daCalls.close++; }
};
global.Global = { Prefs: { DirectionalRadialEnabled: true, DesktopArrowPadEnabled: false } };
_bodyClasses = {}; // not pl-mobile => desktop
global._fakeStoryPlayable = true;
DirectionalRadial.ApplyEnabledState();
assert(daCalls.open === 0, "desktop arrow overlay stays closed when DesktopArrowPadEnabled is false (the required default)");
global.Global.Prefs.DesktopArrowPadEnabled = true;
DirectionalRadial.ApplyEnabledState();
assert(daCalls.open === 1 && daCalls.close === 0, "toggling DesktopArrowPadEnabled on opens the desktop arrow overlay via CharKeys.openArrowPad() (the existing manual, non-auto entry point)");
DirectionalRadial.ApplyEnabledState();
assert(daCalls.open === 1, "ApplyEnabledState() does not re-open an already-open desktop overlay on every re-evaluation (idempotent, no thrash)");
global.Global.Prefs.DesktopArrowPadEnabled = false;
DirectionalRadial.ApplyEnabledState();
assert(daCalls.close === 1, "toggling DesktopArrowPadEnabled back off closes it via CharKeys.closeArrowPad()");
// Mobile must never be touched by this desktop-only logic, in either direction.
daCalls = { open: 0, close: 0 };
_bodyClasses["pl-mobile"] = true;
global.Global.Prefs.DesktopArrowPadEnabled = true;
DirectionalRadial.ApplyEnabledState();
assert(daCalls.open === 0 && daCalls.close === 0, "on mobile (pl-mobile), the desktop-only overlay logic never calls openArrowPad/closeArrowPad at all -- mobile's own auto-detect/Tools entry stays the sole owner of its arrow pad");
delete _bodyClasses["pl-mobile"];

var globalSrc = fs.readFileSync(path.resolve(__dirname, "..", "js", "Global.js"), "utf8");
assert(/DesktopArrowPadEnabled:\s*false/.test(globalSrc), "Global.Prefs.DesktopArrowPadEnabled defaults to false (operator: PC already has a keyboard with arrow keys)");

var workspaceSrc3 = fs.readFileSync(path.resolve(__dirname, "..", "js", "WorkspaceUI.js"), "utf8");
assert(/DesktopArrowPadEnabled/.test(workspaceSrc3), "Options has a real checkbox wired to Global.Prefs.DesktopArrowPadEnabled");
assert(/pl-mobile[\s\S]{0,700}DesktopArrowPadEnabled/.test(workspaceSrc3), "the DesktopArrowPadEnabled checkbox is gated to the non-mobile (desktop) branch only, not shown on mobile where the merged DirectionalRadialEnabled checkbox already covers it");

console.log("\n" + pass + " PASS / " + fail + " FAIL");
process.exit(fail ? 1 : 0);
