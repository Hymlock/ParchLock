// Item 2 (APK 64, codex R7 #2312/#2313): a status probe's inventory load
// summary stays hidden; real events in the same turn are still released (D207).
// Node fixture with minimal BufferLine doubles (claude).
const path = require("path");
let pass = 0, fail = 0;
function assert(cond, msg) { if (cond) { pass++; console.log("PASS:", msg); } else { fail++; console.log("FAIL:", msg); } }
const store = {};
global.localStorage = { getItem: k => (k in store ? store[k] : null), setItem: (k, v) => { store[k] = String(v); }, removeItem: k => { delete store[k]; } };
const S = require(path.resolve(__dirname, "..", "js", "StatTracker.js"));

// A hidden probe line, as the D207 guard leaves it at insertion.
function line(text) {
    const classes = new Set(["BufferLine", "pl-stat-probe"]), attrs = { "aria-hidden": "true" };
    return {
        isConnected: true, textContent: text,
        classList: { contains: c => classes.has(c), remove: (...c) => c.forEach(x => classes.delete(x)), add: c => classes.add(c) },
        removeAttribute: a => { delete attrs[a]; }, setAttribute: (a, v) => { attrs[a] = v; },
        querySelector: () => null, querySelectorAll: () => [],
        get hidden() { return classes.has("pl-stat-probe"); }, get event() { return attrs["data-pl-probe-event"] === "1"; }
    };
}
function release(verb, texts) {
    const lines = texts.map(line);
    S._spanLines = lines;
    S._spanOrigin = { verb, fact: null };
    S.releaseProbeEvents();
    return lines;
}
const SUMMARY = "You are carrying 4 lbs of stuff (10% of your current capacity). It's all worth about $35.";
const ATTACK = "The wumpus lunges out of the darkness and bites you!";

let r = release("inventory", ["You are carrying:", "  a Glow Bar", "", SUMMARY]);
assert(r[3].hidden && !r[3].event, "the reported Wumpus load summary after the item list stays hidden");
assert(r.every(l => l.hidden), "nothing of the inventory reply is shown");

r = release("inventory", ["You are carrying:", "  a Glow Bar", "", "You are carrying 13 lbs of stuff (31% of your current capacity). It's all worth about $693."]);
assert(r[3].hidden, "the same grammar with other numbers is hidden too (no literal strings)");

r = release("inventory", ["You are carrying:", "  a Glow Bar", "", SUMMARY, "", ATTACK]);
assert(r[3].hidden && !r[5].hidden && r[5].event, "a real attack in the same turn is still shown and marked as a turn event (D207)");

r = release("inventory", ["You are carrying:", "  a Glow Bar", "", ATTACK, "", ATTACK]);
assert(!r[3].hidden && !r[5].hidden, "a repeated attack is shown every time");

r = release("inventory", ["You are carrying:", "  a Glow Bar", "", SUMMARY + " " + ATTACK]);
assert(!r[3].hidden && r[3].event, "a paragraph mixing the summary with anything else is not claimed as reply (whole-paragraph rule)");

r = release("inventory", ["You are carrying:", "  a Glow Bar", "", "You are carrying the torch, it seems."]);
assert(!r[3].hidden, "a carrying sentence without a measured weight is not taken for the summary");

r = release("score", ["You have scored 5 points.", "", SUMMARY]);
assert(!r[2].hidden, "the summary rule is scoped to inventory-origin spans only");

// Heading continuation is bounded by the paragraph (codex #2313).
r = release("inventory", ["You are carrying:", "", "  a Glow Bar", "  a canteen", "", ATTACK]);
assert(r[2].hidden && r[3].hidden && !r[5].hidden, "heading / blank / items stay reply; the next paragraph's attack is shown");

// codex #2316: no free prose after the measured figures.
assert(!S.isCarrySummaryLine("You are carrying 4 lbs and the wumpus bites you!", "inventory"), "an event in the same carrying sentence is not hidden");
assert(!S.isCarrySummaryLine("It's all worth 35 and the enemy hits you!", "inventory"), "an event in the same worth sentence is not hidden");
assert(!S.isCarrySummaryLine("You are carrying 4 lbs of stuff (10% of your current capacity), but the floor gives way.", "inventory"), "a trailing clause after the capacity is not hidden");
assert(S.isCarrySummaryLine("You are carrying 4 lbs of stuff (10% of your current capacity). It is all worth about $35.", "inventory"), "the expanded 'It is all worth' form is recognised");
assert(S.isCarrySummaryLine("You are carrying 4 lbs.", "inventory") && S.isCarrySummaryLine("It's all worth 12 gold.", "inventory"), "the shorter metric forms are recognised");
assert(S.isCarrySummaryLine(SUMMARY, "i") && S.isCarrySummaryLine(SUMMARY, "inventory"), "the abbreviated and full inventory verbs both qualify");
assert(!S.isCarrySummaryLine("", "inventory"), "an empty line is never a summary");

console.log(pass + " PASS / " + fail + " FAIL");
process.exit(fail ? 1 : 0);
