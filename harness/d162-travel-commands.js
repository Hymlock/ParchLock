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
assert(src.indexOf("playerParentId(payload)") >= 0,
    "D213: the evidence is the player's RAM parent changing, not the printed name (Anchorhead's refined name stays 'Alley' on the can)");
assert(src.indexOf("hinted: true") >= 0,
    "the step is hinted: there is no destination room for the top of a garbage can");
assert(src.indexOf("isNonTravelCommand(subCmd)") >= 0,
    "an ordinary action that merely coincides with a name change is still refused");
// ---- D213: a name change alone is not movement ---------------------------
// Treasures' combat grid replaces the room banner with "BARBARIAN"; a bare
// "assail" was recorded as a compass step. Behavioural run of the real
// applyStateDelta with stubbed RAM parents (measured live: Anchorhead's player
// 20 goes Alley 107 -> garbage can 110 on "stand on can"; Treasures' player
// stays in room 186 through combat).
{
    const room = { Name: "", ExitMeta: {} };
    T.ensureRoom = () => room;
    T.isInternalRoomName = () => false;
    let parent = 0, typed = "";
    T.readLastTypedCommand = () => typed;
    global.ZRamProvider = { getMem: () => ({}) };
    // Object tree: player 20 -> parent (107 room or 110 can); can 110 -> room 107.
    let links = { 110: { parent: 107 }, 107: { parent: 0 } };
    global.ZRamReader = { objectLinks: (mem, id) => (id === 20 ? { parent } : links[id] || null) };
    const step = (name, p, cmd) => { parent = p; typed = cmd; T.applyStateDelta({ roomId: 107, roomName: name, playerId: 20 }); };
    const reset = () => { room.ExitMeta = {}; T.prevRoomId = null; T.prevRoomName = ""; T.prevPlayerParent = null; };

    reset(); step("GRAVEL PIT OF ROGUES", 107, "look"); step("BARBARIAN", 107, "assail");
    assert(!Object.keys(room.ExitMeta).length, "D213: a status-banner change with the player still in the room records nothing (Treasures 'assail')");
    reset(); step("GRAVEL PIT", 107, "look"); step("BARBARIAN", 107, "attack von darth");
    assert(!Object.keys(room.ExitMeta).length, "D213: a multi-word non-locomotion command with no parent change records nothing");
    reset(); step("Alley", 107, "look"); step("Alley, on the garbage can", 110, "stand on can");
    assert(room.ExitMeta["stand on can"] && room.ExitMeta["stand on can"].evidence === "containment",
        "D213: room -> can parent change plus a locomotion form records the in-room step (Anchorhead)");
    step("Alley", 107, "get off can");
    assert(room.ExitMeta["get off can"] && room.ExitMeta["get off can"].subLocation, "D213: can -> room records the step back");
    reset(); step("Alley", 107, "look"); step("Alley, on the garbage can", 110, "climb"); step("Alley", 107, "out");
    assert(room.ExitMeta.climb && room.ExitMeta.out, "D213: the original D163 command gate is unchanged: single words with a real parent change are still learned");
    reset(); step("Alley", 107, "look"); T.prevRoomId = null; T.prevRoomName = ""; step("Alley, on the garbage can", 110, "stand on can");
    assert(!Object.keys(room.ExitMeta).length, "D213: after a lifecycle reset (prevRoomId/prevRoomName cleared, as every real reset does) nothing is recorded: " + JSON.stringify(room.ExitMeta));

    // #1607: a corrupt object chain (cycle 110 <-> 111) never stamps containment.
    links = { 110: { parent: 111 }, 111: { parent: 110 }, 107: { parent: 0 } };
    reset(); step("Alley", 107, "look"); step("Alley, on the garbage can", 110, "stand on can");
    assert(!Object.keys(room.ExitMeta).length, "D213: a parent chain that never reaches the room (cycle) is unknown, so nothing is recorded");
    links = { 110: { parent: 107 }, 107: { parent: 0 } };

    // #1607: legacy unproven steps are quarantined, never deleted, and a later
    // containment-proven step for the same command clears the quarantine.
    const legacy = [{ ExitMeta: { up: { label: "up" }, assail: { subLocation: true, hinted: true },
        "stand on can": { subLocation: true, hinted: true }, "get off can": { subLocation: true, evidence: "containment" } } }];
    T.quarantineUnprovenSubSteps(legacy);
    const L = legacy[0];
    assert(!L.ExitMeta.assail && !L.ExitMeta["stand on can"] && L.ExitMeta.up && L.ExitMeta["get off can"],
        "D213 (operator ruling: reset acceptable): every unproven legacy step is set aside uniformly; real exits and proven steps stay active");
    assert(L.UnprovenSubSteps && L.UnprovenSubSteps.assail && L.UnprovenSubSteps.assail.hinted && L.UnprovenSubSteps["stand on can"],
        "D213: the set-aside originals are preserved unchanged in UnprovenSubSteps (no word-list guess)");
    room.ExitMeta = L.ExitMeta; room.UnprovenSubSteps = L.UnprovenSubSteps;
    T.prevRoomId = null; T.prevRoomName = ""; T.prevPlayerParent = null;
    step("Alley", 107, "look"); step("Alley, on the garbage can", 110, "stand on can");
    assert(room.ExitMeta["stand on can"] && room.ExitMeta["stand on can"].evidence === "containment" && !room.UnprovenSubSteps["stand on can"] && room.UnprovenSubSteps.assail,
        "D213: re-proving a quarantined step restores it and clears only its own quarantine record");
}

console.log("\n" + pass + " PASS / " + fail + " FAIL");
process.exit(fail ? 1 : 0);
