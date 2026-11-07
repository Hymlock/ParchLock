// D124 live tutorial. Replaces harness/tutorial-flow.js, tutorial-isolation.js
// and tutorial-storage-spy.js, which asserted the D120 isolated-route contract
// (a separate tutorial.html that simulated the library/play/map screens and
// made the player perform tasks against those fakes). That route is retired,
// so those three suites tested behaviour that no longer exists.
//
// What matters now is the opposite property: the tour must point at the REAL
// app, must not be interactive, and must not leave the player stuck.
const fs = require("fs");
const path = require("path");
const root = path.resolve(__dirname, "..");
const js = fs.readFileSync(path.join(root, "js", "Tutorial.js"), "utf8");
const css = fs.readFileSync(path.join(root, "css", "Tutorial.css"), "utf8");
const play = fs.readFileSync(path.join(root, "play.html"), "utf8");
const menu = fs.readFileSync(path.join(root, "js", "MainMenu.js"), "utf8");
const tutHtml = fs.readFileSync(path.join(root, "tutorial.html"), "utf8");

let pass = 0, fail = 0;
function assert(cond, msg) {
    if (cond) { pass++; console.log("PASS:", msg); }
    else { fail++; console.log("FAIL:", msg); }
}

// ---- it runs live, on the real app --------------------------------------
assert(/<script src="js\/Tutorial\.js">/.test(play), "js/Tutorial.js is loaded by play.html, where the real screens are");
assert(/<link rel="stylesheet" href="css\/Tutorial\.css">/.test(play), "css/Tutorial.css is loaded by play.html");
assert(!/location\.replace\("tutorial\.html"\)/.test(menu), "index.html no longer redirects first-time players into an isolated route");
assert(/location\.replace\("index\.html"\)/.test(tutHtml), "the retired tutorial.html is a redirect, not a 404 (bookmarks, precache and make-dist still resolve)");

// The simulation is genuinely gone, not merely unused.
["renderCardList", "renderMapCanvas", "renderKnownRooms", "renderNotes", "openAddNoteForm", "flashInto", "bindLibraryScene", "bindMapScene"].forEach(function (fn) {
    assert(js.indexOf(fn) === -1, "the fake-screen simulator '" + fn + "' is gone");
});

// ---- the opening must say what ParchLock is ------------------------------
const steps = js.match(/STEPS:\s*\[([\s\S]*?)\n    \],/);
assert(!!steps, "a flat STEPS list exists");
const first = js.slice(js.indexOf("STEPS:"), js.indexOf("ShouldRun"));
assert(/Welcome to ParchLock/.test(first), "the tour opens by naming ParchLock");
assert(/graphical interface/i.test(first) && /interactive fiction/i.test(first), "the opening says what the program is actually for");

// ---- it walks the real UI ------------------------------------------------
// `target` is either a selector or an ordered fallback list, so collect
// every selector mentioned in any target declaration.
const targetBlocks = js.match(/target:\s*(?:\[[^\]]*\]|"[^"]*")/g) || [];
const targets = [];
targetBlocks.forEach(function (b) { (b.match(/"([^"]+)"/g) || []).forEach(function (q) { targets.push(q.slice(1, -1)); }); });
assert(targetBlocks.length >= 8, "most steps spotlight a real element (" + targetBlocks.length + " targeted steps)");
assert(targetBlocks.some(b => b.indexOf("[") !== -1), "steps whose primary target can legitimately be absent (hidden mic, collapsed exits band, no .pl-act yet) name an always-present fallback");
[
    ["#windowport .BufferWindow", "the story window"],
    [".Input.LineInput", "the command line"],
    ["#exits .row.horizontal.top", "the D121 exits band"],
    ["#pl-map-tab", "the map tab"],
    ["#rooms-list", "known rooms and search"],
    ["#pl-equip-tab", "the D122 equipment tab"],
    ["#equipment-list", "the equipment container tree"],
    ["#equipment-controls", "equipment sort/search"]
].forEach(function (pair) {
    assert(targets.indexOf(pair[0]) !== -1, "the tour covers " + pair[1] + " (" + pair[0] + ")");
});
assert(/sheet:\s*"map"/.test(js) && /sheet:\s*"equipment"/.test(js), "the tour opens the REAL map and equipment sheets itself, so the player sees every screen without doing anything");
assert(/map-open/.test(js) && /equip-open/.test(js), "sheets are driven through the app's own body classes, never faked");

// Everything added since the original live tour must be covered.
assert(/Narration and text size/.test(js), "narration and the D123 text-size setting are covered");
assert(/Saving and taking your game/.test(js), "saving and real file export are covered");
assert(/container hierarchy|containers inside containers|sub-container|keeping each result's container path/i.test(js),
    "sub-container nesting is explained");

// ---- no task interactivity, but still navigable --------------------------
assert(/id="pl-tut-next"/.test(js) && /id="pl-tut-back"/.test(js) && /id="pl-tut-skip"/.test(js), "the player can still go forward, back, or skip the tour");
assert(!/waitFor|expectTap|awaitGesture|taskComplete|requireAction/i.test(js), "no step waits on the player to perform a task");
assert(/body\.pl-tutorial[\s\S]{0,900}pointer-events:\s*none/.test(css), "the live app is inert while the tour runs, so a highlighted control is explained but cannot be operated");
assert(/body\.pl-tutorial\s+\.Input\.LineInput[\s\S]{0,120}pointer-events:\s*none/.test(css), "the command line is inert too -- no keyboard pops up mid-tour to resize the shell under a spotlight");

// ---- read aloud ----------------------------------------------------------
assert(/ReadAloud\.speak\(def\.title/.test(js), "every step is read aloud");
assert(/ReadAloud\.stop|speechSynthesis\.cancel/.test(js), "the previous utterance is cancelled before the next step speaks");

// ---- degradation ---------------------------------------------------------
assert(/resolveTarget/.test(js) && /if \(!r\.width \|\| !r\.height\) continue/.test(js), "a target that is not actually rendered is skipped, falling through to the next fallback or a centred card instead of framing empty space");
assert(/ShouldRun[\s\S]{0,1400}no-story/.test(js), "the tour never starts without a real module loaded to point at");

// ---- D130: two phases, and the play phase waits for the story ------------
assert(/LIBRARY_STEPS/.test(js), "a library phase introduces module selection before a story is chosen");
["#games-list", "#filter-options", "#filter", "#modules"].forEach(function (sel) {
    assert(js.indexOf(sel) !== -1, "the library phase points at the real " + sel + " control");
});
assert(/Starred and finished/.test(js), "starring and the finished/unfinished filters are explained, as they were before");
assert(/Adding your own/.test(js), "Manage modules is explained");
assert(/page:\s*function/.test(js) && /"library"/.test(js) && /"play"/.test(js), "the tour detects which screen it is on from real markup, not the filename");
assert(/LIBRARY_KEY/.test(js), "the library phase has its own completion key, so finishing it does not end the whole tour");
assert(/libraryDone\(\)[\s\S]{0,260}STEPS\.slice\(1\)/.test(js),
    "the welcome step is shown ONCE: the play phase drops it when the library phase already gave it, but keeps it for a player who arrives at play.html directly");
assert(/screenIsBusy/.test(js), "the tour refuses to open while something else is covering the screen");
// The opening splash is the one the player MUST see and click through first.
assert(/screenIsBusy[\s\S]{0,700}parchlock-splash-pending/.test(js) && /screenIsBusy[\s\S]{0,700}getElementById\("parchlock-splash"\)/.test(js),
    "the splash specifically blocks the tour on BOTH pages -- the player has to see it and click past it before any tutorial appears");
["parchlock-splash", "Message.IsOpen", "app-dialog-open", "dialog_frame"].forEach(function (sig) {
    assert(js.indexOf(sig) !== -1, "it waits for " + sig + " to clear before opening");
});
assert(/Input\.LineInput/.test(js) && /_readySince/.test(js),
    "the play phase waits for a real LINE prompt plus a settle -- a long title/intro sequence must not be mistaken for a running game");
assert(/Not everything you can interact with will be underlined/.test(js) && /keeps its secrets/.test(js),
    "the tour says plainly that not everything is underlined and that the action list is not exhaustive");

const css2 = fs.readFileSync(path.resolve(root, "css", "Tutorial.css"), "utf8");
assert(/pl-tut-has-spot #pl-tut-scrim \{ background: transparent/.test(css2),
    "the scrim stops painting while a spotlight is up -- the two dimmers were stacking to ~0.92 and washing the screen out");
assert(!/rgba\(4, 10, 9, 0\.72\)/.test(css2), "the remaining single dim layer is lightened so the screen stays readable");

// ---- completion and restart ---------------------------------------------
assert(/TutorialMarkComplete/.test(js), "finishing or skipping records completion against the existing versioned key");
assert(/close\(false\)/.test(js) && /close\(true\)/.test(js), "Skip and Finish share one exit path, so neither can leave the overlay up");
assert(/if \(restart\)[\s\S]{0,400}location\.replace/.test(js), "finishing restarts the module so play begins fresh; skipping does not");

console.log("\n" + pass + " PASS / " + fail + " FAIL");
process.exit(fail ? 1 : 0);
