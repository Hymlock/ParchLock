/**
 * D201 unresolved-object action contract.
 * Parser vocabulary may recover an addressable noun, but verbs require
 * compiler-declared attributes or confirmed per-object behavioral evidence.
 */
const fs = require("fs");
const path = require("path");
const vm = require("vm");

let pass = 0;
function check(value, message) {
    if (!value) throw new Error("FAIL: " + message);
    pass++;
    console.log("PASS: " + message);
}

const context = { console };
vm.createContext(context);
for (const file of ["js/ActionSynth.js", "js/Actionable.js"]) {
    vm.runInContext(fs.readFileSync(path.resolve(__dirname, "..", file), "utf8"), context, { filename: file });
}

const S = context.ActionSynth;
const A = context.Actionable;
let learned = [];
context.AttrCalibrator = {
    defaultInspectVerb: () => "examine",
    inspectVerbCurrentlyDisabled: () => false,
    allowedVerbsFor: () => learned.slice()
};
A.commandNounFor = obj => obj.name;
A.disambiguatedNoun = obj => obj.name;
A.isGameWord = word => word === "drink";

let obj = { id: 7, name: "pellets", attrs: {} };
let commands = S.commandsForEvidenceObject(obj, "room").map(c => c.command);
check(JSON.stringify(commands) === JSON.stringify(["examine pellets"]),
    "parser vocabulary alone grants only the established inspect command");

obj.attrs = { takeable: true, edible: true };
commands = S.commandsForEvidenceObject(obj, "room").map(c => c.command);
check(commands.includes("take pellets") && commands.includes("eat pellets"),
    "module-declared item capabilities reach the unresolved-object radial");
check(!commands.includes("drink pellets"),
    "dictionary membership alone does not add DRINK to an unresolved object");
check(S.commandsForObject(obj, "room").some(c => c.command === "drink pellets"),
    "ordinary catalogued-object synthesis remains unchanged");

obj = { id: 8, name: "bar", attrs: { switchable: true } };
commands = S.commandsForEvidenceObject(obj, "room").map(c => c.command);
check(commands.includes("switch on bar") && commands.includes("switch off bar"),
    "declared switch state exposes both established state commands");

obj = { id: 9, name: "hatch", attrs: {} };
learned = ["open", "close"];
commands = S.commandsForEvidenceObject(obj, "room").map(c => c.command);
check(commands.includes("open hatch") && commands.includes("close hatch"),
    "confirmed per-object learned capabilities remain available");

learned = [];
A.payloadPool = () => [{ id: 8, name: "bar", attrs: { switchable: true }, examineOnly: true }];
commands = A.resolveObjectCommands(8, "room").map(c => c.command);
check(commands.includes("switch on bar") && commands.includes("switch off bar"),
    "Actionable routes only promoted candidates through evidence-only synthesis");

console.log(`${pass} PASS / 0 FAIL`);
