/**
 * D31 Known Topics — part 1 gate (talk to).
 *
 * Part 1 (this file, now): an animate object actually synthesizes
 * "talk to <name>" because ActionSynth.rules maps the AttributeSchema
 * `animate` key (and `talkable`) onto that verb. The commandsForObject
 * special case for "talk to" is no longer dead.
 *
 * Part 2 (ask about <topic>): approved and implemented in
 * js/Actionable.js Open() — an "Ask about..." submenu, only for a clicked
 * object with attrs.animate || attrs.talkable, sourced strictly from
 * Actionable.payloadPool() (real RAM-scope discoveredObjects/inventory),
 * excluding the NPC itself and the player. No dictionary/transcript
 * involvement — verified below at the source level (Actionable.js is
 * jQuery/DOM-coupled, so its Open() logic is checked via source
 * assertions plus the full live-gameplay Playwright suite, the same
 * split used elsewhere for DOM-heavy code in this codebase).
 *
 * Usage: node harness/d31-known-topics.js
 */
const fs = require("fs");
const path = require("path");
const vm = require("vm");

const root = path.join(__dirname, "..");
const sandbox = { console, setTimeout, window: {} };
vm.createContext(sandbox);
vm.runInContext(fs.readFileSync(path.join(root, "js", "AttributeSchema.js"), "utf8"), sandbox);
vm.runInContext(fs.readFileSync(path.join(root, "js", "ActionSynth.js"), "utf8"), sandbox);
vm.runInContext(fs.readFileSync(path.join(root, "js", "WorldModel.js"), "utf8"), sandbox);

const ActionSynth = sandbox.ActionSynth;
const WorldModel = sandbox.WorldModel;
const asSrc = fs.readFileSync(path.join(root, "js", "ActionSynth.js"), "utf8");

let pass = 0;
let fail = 0;
function assert(cond, msg) {
    if (!cond) {
        fail++;
        console.error("FAIL:", msg);
        return;
    }
    pass++;
    console.log("PASS:", msg);
}

function verbsOf(cmds) {
    return (cmds || []).map(function (c) { return String(c.verb || ""); });
}
function commandsOf(cmds) {
    return (cmds || []).map(function (c) { return String(c.command || ""); });
}

assert(/animate:\s*\[\s*"talk to"\s*\]/.test(asSrc),
    "ActionSynth.rules has animate -> talk to (AttributeSchema key, not creature)");
assert(/talkable:\s*\[\s*"talk to"\s*\]/.test(asSrc),
    "ActionSynth.rules also maps talkable (I6 bit 22) -> talk to");
assert(!/creature\s*:/.test(asSrc),
    "ActionSynth.rules has no creature key (AttributeSchema does not define one)");

assert(ActionSynth.verbsForAttrs({ animate: true }).indexOf("talk to") >= 0,
    "verbsForAttrs(animate) includes talk to");
assert(ActionSynth.verbsForAttrs({ talkable: true }).indexOf("talk to") >= 0,
    "verbsForAttrs(talkable) includes talk to");
assert(ActionSynth.verbsForAttrs({}).indexOf("talk to") < 0,
    "verbsForAttrs with no bits does not invent talk to");
assert(ActionSynth.verbsForAttrs({ container: true, openable: true }).indexOf("talk to") < 0,
    "container/openable does not offer talk to");

const PLAYER = 1;
const GUARD = 10;
const ROCK = 11;
const RADIO = 12;
WorldModel.lastPayload = {
    playerId: PLAYER,
    probe: { status: "z-ram-live", playerId: PLAYER },
    discoveredObjects: [
        { id: GUARD, name: "guard", parentId: 2, attrs: { animate: true } },
        { id: ROCK, name: "rock", parentId: 2, attrs: { takeable: true } },
        { id: RADIO, name: "radio", parentId: 2, attrs: { talkable: true, switchable: true } }
    ],
    inventory: []
};

const guard = ActionSynth.commandsForPayloadObjectId(GUARD, "room");
assert(verbsOf(guard).indexOf("talk to") >= 0, "animate guard offers talk to");
assert(commandsOf(guard).indexOf("talk to guard") >= 0,
    "animate guard command is talk to guard (special-case is live)");
assert(verbsOf(guard).indexOf("examine") >= 0, "animate guard still offers examine");
assert(verbsOf(guard).indexOf("take") < 0, "animate guard does not default take");

const rock = ActionSynth.commandsForPayloadObjectId(ROCK, "room");
assert(verbsOf(rock).indexOf("talk to") < 0, "inanimate rock does not offer talk to");
assert(commandsOf(rock).indexOf("talk to rock") < 0, "no talk to rock command");

const radio = ActionSynth.commandsForPayloadObjectId(RADIO, "room");
assert(commandsOf(radio).indexOf("talk to radio") >= 0,
    "talkable (not animate) radio still synthesizes talk to radio");
assert(verbsOf(radio).indexOf("switch on") >= 0, "talkable radio keeps switchable verbs");

const direct = ActionSynth.commandsForObject(
    { id: 99, name: "king", attrs: { animate: true } },
    "room"
);
assert(direct.some(function (c) { return c.command === "talk to king"; }),
    "commandsForObject on a bare animate object synthesizes talk to king");

// --- Part 2: Ask about... submenu (js/Actionable.js Open()) ---
const actionableSrc = fs.readFileSync(path.join(root, "js", "Actionable.js"), "utf8");
assert(/Ask about\.\.\./.test(actionableSrc), "Actionable.Open synthesizes an 'Ask about...' slice");
assert(/clickedAttrs\.animate \|\| clickedAttrs\.talkable/.test(actionableSrc),
    "Ask about... is gated on attrs.animate || attrs.talkable, same as talk to");
assert(/ask " \+ Actionable\.commandNounFor\(clicked\) \+ " about " \+ Actionable\.commandNounFor\(topic\)/.test(actionableSrc),
    "Ask about command template is 'ask <npc> about <topic>', built from commandNounFor on both operands (not raw noun/topic.name, so name collisions resolve to the correct object like D47)");
assert(/payloadPool\(\)\.filter/.test(actionableSrc.slice(actionableSrc.indexOf("Ask about"))) ||
    /Actionable\.payloadPool\(\)/.test(actionableSrc.slice(actionableSrc.lastIndexOf("clickedAttrs"))),
    "Ask about topics are sourced from Actionable.payloadPool() (RAM scope)");
const askStart = actionableSrc.indexOf("try {", actionableSrc.indexOf("Known Topics"));
const askBlock = actionableSrc.slice(askStart, askStart + 1400);
assert(!/lastLookText|lastInventoryText|windowport|BufferLine|\.textContent|RoomLines/.test(askBlock),
    "Ask about... code does not reference lastLookText/windowport/BufferLine/RoomLines (only a source-code comment may mention 'transcript' as prose)");

console.log(JSON.stringify({
    ok: fail === 0,
    pass: pass,
    fail: fail,
    guardCommands: commandsOf(guard),
    rockVerbs: verbsOf(rock),
    radioCommands: commandsOf(radio)
}, null, 2));

if (fail) {
    console.error("FAIL: d31-known-topics (" + fail + " failed, " + pass + " passed)");
    process.exit(1);
}
console.log("PASS: d31-known-topics (" + pass + " passed)");
