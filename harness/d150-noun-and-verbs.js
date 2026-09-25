// D150: two defects found by the post-APK sweep, both measured on Anchorhead.
//
//   1. A mark-derived phrase leaked into command generation. VerifiedNouns
//      answers "what text was underlined in the prose", which D146 already
//      established is a different question from "what word names this object to
//      the parser". The object "real estate office door" is never printed with
//      the word "door" in it -- the room reads "Outside the Real Estate Office"
//      -- so the mark landed on "estate" and the radial offered "Examine estate".
//
//   2. `edible` is one Inform attribute covering both eating and drinking, so a
//      liquid carries it too. Anchorhead's own reply to the offered command was
//      "You don't eat rain, you drink it."
const fs = require("fs");
const path = require("path");

let pass = 0, fail = 0;
function assert(cond, msg) {
    if (cond) { pass++; console.log("PASS:", msg); }
    else { fail++; console.log("FAIL:", msg); }
}

global.window = global;
global.$ = function () { return { text: function () { return this; }, html: function () { return ""; } }; };
global.document = { addEventListener() {}, querySelectorAll: () => [], querySelector: () => null,
                    body: { classList: { contains: () => false } } };
global.Message = { Show() {} };
global.Global = { Prefs: {} };
let POOL = [];
global.WorldModel = { lastPayload: { get discoveredObjects() { return POOL; }, inventory: [] } };

eval(fs.readFileSync(path.resolve(__dirname, "..", "js", "Actionable.js"), "utf8"));
const A = global.Actionable || Actionable;

// Anchorhead's real dictionary, as measured: all of these are present.
const DICT = { door: 1, estate: 1, office: 1, ring: 1, window: 1, transom: 1,
               rain: 1, water: 1, drink: 1, eat: 1, sky: 1, alley: 1 };
A.isGameWord = (w) => !!DICT[String(w || "").toLowerCase()];

// ---- 1. the door -------------------------------------------------------
const door = { id: 106, name: "real estate office door", aliases: [] };
A.CommandNouns = {};
A.VerifiedNouns = { "106": "estate" };
assert(A.headTokenOf(door) === "door",
    "the object's head token is 'door' -- the thing it IS, which D146 already computes for marking");
assert(A.commandNounFor(door) === "door",
    "and the command noun is now 'door' rather than the underlined 'estate': a mark-derived phrase never decides what gets submitted");

// The guard rails around that override.
const ring = { id: 40, name: "wedding ring", aliases: [] };
A.VerifiedNouns = { "40": "wedding ring" };
assert(A.commandNounFor(ring) === "wedding ring",
    "a verified phrase that already ENDS in the head noun is a more specific reference and is KEPT -- 'wedding ring' is not shortened to 'ring'");

A.VerifiedNouns = { "41": "alley" };
assert(A.commandNounFor({ id: 41, name: "alley", aliases: [] }) === "alley",
    "a one-word object is unaffected");

A.VerifiedNouns = {};
assert(A.commandNounFor(ring) === "wedding ring",
    "an object with no verified phrase keeps its full display name exactly as before");

// A head token the dictionary does NOT contain is never substituted.
A.VerifiedNouns = { "42": "estate" };
assert(A.commandNounFor({ id: 42, name: "real estate office portcullis", aliases: [] }) === "estate",
    "the override requires the head token to be real vocabulary: an unverifiable word is left alone rather than guessed at");

// A mined command noun still outranks everything -- this branch is only for
// objects with no vocabulary at all.
A.CommandNouns = { "106": "door" };
A.VerifiedNouns = { "106": "estate" };
assert(A.commandNounFor(door) === "door", "a mined dictionary word still wins outright");
A.CommandNouns = {};

// ---- 2. drink ----------------------------------------------------------
global.Actionable = A;
eval(fs.readFileSync(path.resolve(__dirname, "..", "js", "ActionSynth.js"), "utf8"));
const S = global.ActionSynth || ActionSynth;

let verbs = S.verbsForAttrs({ edible: true }, 1);
assert(verbs.indexOf("eat") >= 0 && verbs.indexOf("drink") >= 0,
    "an edible object offers BOTH eat and drink -- Anchorhead's rain carries `edible` because you drink it, and the story says so itself");

DICT.drink = 0;
verbs = S.verbsForAttrs({ edible: true }, 1);
assert(verbs.indexOf("drink") < 0 && verbs.indexOf("eat") >= 0,
    "a story whose dictionary has no 'drink' is never offered it -- same dictionary-verified gate as D147");
DICT.drink = 1;

verbs = S.verbsForAttrs({ takeable: true }, 2);
assert(verbs.indexOf("drink") < 0, "a non-edible object is never offered drink");

console.log("\n" + pass + " PASS / " + fail + " FAIL");
process.exit(fail ? 1 : 0);
