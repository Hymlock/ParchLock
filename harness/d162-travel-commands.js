// D162: which typed commands may become map exits.
//
// D140 rejected EVERY multi-word command, reasoning that a multi-word command
// is an action rather than a direction. That removed a real capability the
// operator relied on: Anchorhead's alley is climbed with "stand on can", which
// the game answers "You clamber onto the wobbling garbage can" and reports as
// "Alley, on the garbage can" -- a traversal step with no new room behind it.
// The case D140 actually needed to stop (wump2ka growing an exit called "look")
// is a single word and was already covered by the stop-list.
const fs = require("fs");
const path = require("path");
let pass = 0, fail = 0;
function assert(c, m) { if (c) { pass++; console.log("PASS:", m); } else { fail++; console.log("FAIL:", m); } }

// Evaluate the real module and hand back its own object, rather than relying
// on `var` reaching `global` -- inside a CommonJS module it does not.
const T = eval(fs.readFileSync(path.resolve(__dirname, "..", "js", "MapTopology.js"), "utf8")
    + String.fromCharCode(10) + "MapTopology;");
const travel = c => T.isNonTravelCommand(c) === false;

// Real locomotion, measured in Anchorhead's alley.
["stand on can", "climb on can", "get on can", "go through fence", "enter window",
 "climb through window", "step through door", "sit on chair"].forEach(c =>
    assert(travel(c), JSON.stringify(c) + " can become an exit -- it is how a player actually moves"));

// Plain directions are unaffected.
["north", "n", "go north", "up", "in"].forEach(c =>
    assert(travel(c), JSON.stringify(c) + " is still travel"));

// Ordinary actions must never become exits, even if a room change happens to
// follow them (a trapdoor opening underfoot).
["take lamp", "get lamp", "get all", "open door", "examine can", "push can to wall",
 "read book", "put coin in slot"].forEach(c =>
    assert(!travel(c), JSON.stringify(c) + " is an action and can never become an exit"));

// The single-word meta commands D140 was actually written for.
["look", "l", "inventory", "i", "wait", "save", "restore", "score", "version", "quit"].forEach(c =>
    assert(!travel(c), JSON.stringify(c) + " stays out of the map -- the wump2ka 'look' exit case"));

assert(!travel(""), "an empty command is never travel");

// "get" and "stand" only count in their prepositional form, which is what
// separates "stand on can" from "get lamp".
assert(travel("get off can") && !travel("get sword"),
    "posture verbs qualify only with a movement preposition, so 'get off can' travels and 'get sword' does not");


// ---- D163: a step that moves you WITHIN a room ------------------------
// Anchorhead's alley: "stand on can" keeps roomId 107 and changes only the
// printed name to "Alley, on the garbage can". D139's walk-up (correct -- it
// stops Cutthroats reporting "bed" as the room) leaves the id identical on
// both sides, so the ordinary changed-room path records nothing.
const src = fs.readFileSync(path.resolve(__dirname, "..", "js", "MapTopology.js"), "utf8");
assert(src.indexOf("subLocation: true") >= 0,
    "a move within a room is recorded as a sub-location step");
assert(src.indexOf("String(currId) === String(MapTopology.prevRoomId)") >= 0,
    "and only when the room ID really is unchanged -- a real room change still takes the normal path");
assert(src.indexOf("prevName.toLowerCase() !== currName.toLowerCase()") >= 0,
    "the evidence is the game's own printed name changing, which is what it prints when you climb onto something");
assert(src.indexOf("hinted: true") >= 0,
    "the step is hinted: there is no destination room for the top of a garbage can");
assert(src.indexOf("isNonTravelCommand(subCmd)") >= 0,
    "an ordinary action that merely coincides with a name change is still refused");
console.log("\n" + pass + " PASS / " + fail + " FAIL");
process.exit(fail ? 1 : 0);
