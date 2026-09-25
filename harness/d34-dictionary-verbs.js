/**
 * D34 follow-up: Inform dictionary verb flags as game-wide specialCommands.
 *
 * Phase A closed: per-object grammar lists are not RAM-deterministic.
 * This gate is the authorized smaller win only:
 *   - Inform v4+ entryLen===9: bit 0 of the first data byte is a verb flag
 *   - Infocom layouts are gated off (those extra bytes mean something else)
 *   - GrammarProvider emits dictionary-verb specialCommands, never a
 *     hardcoded look/inventory pair, never per-object radial verbs
 *
 * Usage: node harness/d34-dictionary-verbs.js
 */
const fs = require("fs");
const path = require("path");
const vm = require("vm");

const root = path.join(__dirname, "..");
const sandbox = { console, setTimeout: function (fn) { try { fn(); } catch (e) {} }, window: {} };
vm.createContext(sandbox);
vm.runInContext(fs.readFileSync(path.join(root, "js", "ZRamReader.js"), "utf8"), sandbox);
vm.runInContext(fs.readFileSync(path.join(root, "js", "GrammarProvider.js"), "utf8"), sandbox);

const ZRamReader = sandbox.ZRamReader;
const GrammarProvider = sandbox.GrammarProvider;
if (!ZRamReader || !GrammarProvider) {
    console.error("FAIL: ZRamReader / GrammarProvider did not load");
    process.exit(1);
}

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

function loadStory(p) {
    const abs = path.isAbsolute(p) ? p : path.join(root, p);
    const text = fs.readFileSync(abs);
    if (p.endsWith(".js")) {
        const s = text.toString("utf8");
        const m = s.match(/processBase64Zcode\s*\(\s*['"]([\s\S]*?)['"]\s*\)/);
        if (!m) throw new Error("no base64 in " + p);
        return extractZcode(Buffer.from(m[1].replace(/\s+/g, ""), "base64"));
    }
    return extractZcode(text);
}
function extractZcode(buf) {
    if (buf[0] >= 1 && buf[0] <= 8) return buf;
    const str = buf.toString("latin1");
    const zcod = str.indexOf("ZCOD");
    if (zcod >= 0) {
        const len = buf.readUInt32BE(zcod + 4);
        return buf.slice(zcod + 8, zcod + 8 + len);
    }
    throw new Error("not zcode/blorb");
}

function entryOf(dict, word) {
    const want = String(word).toLowerCase();
    for (let i = 0; i < dict.entries.length; i++) {
        if (dict.entries[i].word === want) return dict.entries[i];
    }
    return null;
}

const gpSrc = fs.readFileSync(path.join(root, "js", "GrammarProvider.js"), "utf8");
const tuiSrc = fs.readFileSync(path.join(root, "js", "TranslatorUI.js"), "utf8");
const qolSrc = fs.readFileSync(path.join(root, "js", "Qol.js"), "utf8");

assert(!/label:\s*"look"/.test(gpSrc) && !/label:\s*"inventory"/.test(gpSrc),
    "GrammarProvider no longer hardcodes look/inventory specialCommands");
assert(/informVerbFlags/.test(gpSrc) && /dictionary-verb/.test(gpSrc),
    "GrammarProvider is gated on informVerbFlags and tags dictionary-verb");
assert(/source === "dictionary-verb"/.test(tuiSrc),
    "TranslatorUI skips dictionary-verb items on the special-commands bar");
assert(/fromDict \? 42 : 60/.test(qolSrc) || /dictionary-verb" \? 42/.test(qolSrc),
    "Qol scores dictionary-verb below ram-exit/ram-synth");
assert(!/discoveredObjects/.test(gpSrc),
    "GrammarProvider does not attach verbs to discoveredObjects");

const advent = loadStory("games/Advent.z5.js");
const curses = loadStory("games/curses.z5.js");
const zork1 = loadStory("games/Zork1-TheGreatUndergroundEmpire.z3.js");
const wish = loadStory("games/Wishbringer.z3.js");
const hitchhik = loadStory("games/Hitchhik.z5.js");
const borderzo = loadStory("games/Borderzo.z5.js");
const adverbum = loadStory("games/adverbum.z5.js");

const dAdvent = ZRamReader.parseDictionary(advent);
const dCurses = ZRamReader.parseDictionary(curses);
const dZork = ZRamReader.parseDictionary(zork1);
const dWish = ZRamReader.parseDictionary(wish);
const dHitch = ZRamReader.parseDictionary(hitchhik);
const dBorder = ZRamReader.parseDictionary(borderzo);
const dAdverb = ZRamReader.parseDictionary(adverbum);

assert(dAdvent.words && dAdvent.words.take, "parseDictionary still maps Advent 'take' text→address");
assert(dAdvent.entryLen === 9 && dAdvent.informVerbFlags === true, "Advent is Inform v4+ entryLen 9 with verb flags");
assert(dAdvent.entries && dAdvent.entries.length > 0, "Advent parseDictionary returns entries");
assert(entryOf(dAdvent, "take") && entryOf(dAdvent, "take").isVerb, "Advent 'take' is verb-flagged");
assert(entryOf(dAdvent, "pray") && entryOf(dAdvent, "pray").isVerb, "Advent 'pray' is verb-flagged");
assert(entryOf(dAdvent, "xyzzy") && entryOf(dAdvent, "xyzzy").isVerb, "Advent 'xyzzy' is verb-flagged");
assert(entryOf(dAdvent, "north") && entryOf(dAdvent, "north").isVerb === false, "Advent 'north' is not a verb flag (noun only)");

assert(dCurses.informVerbFlags === true, "curses is Inform-gated");
assert(entryOf(dCurses, "wind") && entryOf(dCurses, "wind").isVerb, "curses 'wind' is verb-flagged");
assert(dCurses.entryLen === 9 && ZRamReader.u8(curses, 0x3C) === 0,
    "curses is unstamped early Inform (no 6.xx at $3C) and still passes");
assert(entryOf(dCurses, "n") && entryOf(dCurses, "n").isVerb === false,
    "curses compass 'n' is a noun, which is the unstamped Inform signal");

assert(dZork.entryLen === 7 && dZork.informVerbFlags === false, "Zork1 Infocom v3 entryLen 7 is gated off");
assert(!dZork.entries || dZork.entries.length === 0, "Zork1 does not expose Inform isVerb entries");
assert(dZork.words && dZork.words.take, "Zork1 words map still works without verb flags");

assert(dWish.informVerbFlags === false, "Wishbringer Infocom is gated off");
assert(!dWish.entries || dWish.entries.length === 0, "Wishbringer does not expose Inform isVerb entries");

assert(dHitch.entryLen === 9 && dHitch.words && dHitch.words.take,
    "Hitchhik Infocom v5 is entryLen 9 and still maps words");
assert(dHitch.informVerbFlags === false, "Hitchhik Infocom v5 is gated off despite entryLen 9");
assert(!dHitch.entries || dHitch.entries.length === 0, "Hitchhik does not expose Inform isVerb entries");
assert(dBorder.entryLen === 9 && dBorder.informVerbFlags === false,
    "Border Zone Infocom v5 is gated off despite entryLen 9");
assert(!dBorder.entries || dBorder.entries.length === 0, "Border Zone does not expose Inform isVerb entries");
assert(ZRamReader.u8(hitchhik, 0x3C) === 0 && ZRamReader.u8(borderzo, 0x3C) === 0,
    "Hitchhik/Border Zone have no Inform 6.xx stamp at $3C");

assert(dAdverb.informVerbFlags === true, "adverbum stamped Inform still passes when compass n is also a verb");
assert(entryOf(dAdverb, "n") && entryOf(dAdverb, "n").isVerb === true,
    "adverbum 'n' is verb-flagged (stamp, not compass-noun, is the Inform signal)");

const adventVerbs = GrammarProvider.readVerbWords(advent);
const cursesVerbs = GrammarProvider.readVerbWords(curses);
const zorkVerbs = GrammarProvider.readVerbWords(zork1);
const wishVerbs = GrammarProvider.readVerbWords(wish);
const hitchVerbs = GrammarProvider.readVerbWords(hitchhik);
const borderVerbs = GrammarProvider.readVerbWords(borderzo);
const adverbVerbs = GrammarProvider.readVerbWords(adverbum);

assert(adventVerbs.indexOf("pray") >= 0 && adventVerbs.indexOf("xyzzy") >= 0, "Advent verb list includes pray/xyzzy");
assert(adventVerbs.indexOf("take") >= 0 && adventVerbs.indexOf("look") >= 0, "Advent verb list includes take/look");
assert(adventVerbs.indexOf("north") < 0 && adventVerbs.indexOf("n") < 0, "Advent verb list does not include compass nouns");
assert(adventVerbs.length >= 100, "Advent verb list is a real vocabulary, not a 2-item stub (" + adventVerbs.length + ")");
assert(cursesVerbs.indexOf("wind") >= 0, "curses verb list includes wind");
assert(zorkVerbs.length === 0, "Zork1 verb list is empty (Infocom gate)");
assert(wishVerbs.length === 0, "Wishbringer verb list is empty (Infocom gate)");
assert(hitchVerbs.length === 0, "Hitchhik verb list is empty (Infocom v5 gate)");
assert(borderVerbs.length === 0, "Border Zone verb list is empty (Infocom v5 gate)");
assert(adverbVerbs.length >= 50, "adverbum still emits a real Inform verb list (" + adverbVerbs.length + ")");

sandbox.ZRamProvider = { getMem: function () { return null; } };
const emptyCollect = GrammarProvider.collect();
assert((emptyCollect.specialCommands || []).length === 0, "collect() with no mem emits no hardcoded specialCommands");

sandbox.ZRamProvider = { getMem: function () { return advent; } };
const adventCollect = GrammarProvider.collect();
const adventSpecial = adventCollect.specialCommands || [];
assert(adventSpecial.length === adventVerbs.length, "collect() specialCommands matches readVerbWords");
assert(adventSpecial.every(function (c) { return c && c.source === "dictionary-verb"; }),
    "every Advent specialCommand is tagged dictionary-verb");
assert(adventSpecial.some(function (c) { return c.command === "xyzzy"; }), "collect() includes xyzzy");
assert(!adventCollect.discoveredObjects, "collect() does not return discoveredObjects");

sandbox.ZRamProvider = { getMem: function () { return zork1; } };
const zorkCollect = GrammarProvider.collect();
assert((zorkCollect.specialCommands || []).length === 0, "Infocom collect() is empty, not a fake look/inventory pair");
assert(zorkCollect.sources && zorkCollect.sources[0] && zorkCollect.sources[0].confidence < 0.1,
    "empty collect() does not advertise fake confidence");

sandbox.ZRamProvider = { getMem: function () { return hitchhik; } };
const hitchCollect = GrammarProvider.collect();
assert((hitchCollect.specialCommands || []).length === 0,
    "Hitchhik Infocom v5 collect() is empty despite entryLen 9");

const qolSandbox = { console, window: {}, $: null, setTimeout: function () {} };
vm.createContext(qolSandbox);
vm.runInContext(fs.readFileSync(path.join(root, "js", "Qol.js"), "utf8"), qolSandbox);
const Qol = qolSandbox.ParchLockQol;
qolSandbox.WorldModel = {
    lastPayload: {
        exits: [{ label: "aft" }],
        specialCommands: [
            { label: "xyzzy", command: "xyzzy", source: "dictionary-verb" },
            { label: "yes", command: "yes" }
        ]
    }
};
const radial = Qol.GetRadialCommands();
const byCmd = {};
radial.forEach(function (c) { byCmd[c.Command] = c; });
assert(byCmd.xyzzy && byCmd.xyzzy.source === "dictionary-verb", "input radial includes dictionary-verb xyzzy");
assert(byCmd.aft && byCmd.aft.source === "ram-exit", "input radial still includes RAM exit aft");
assert(byCmd.yes && byCmd.yes.source === "ram-special", "non-dictionary specialCommands stay ram-special");
assert(byCmd.xyzzy.Score < byCmd.aft.Score, "dictionary-verb score is below ram-exit so dumps do not bury exits");
assert(byCmd.undo && byCmd.look, "chrome/universals still present");
assert(byCmd.look.source === "universal" && byCmd.inventory.source === "universal" && byCmd.wait.source === "universal",
    "look/inventory/wait stay universals even when the dictionary also flags them");
assert(byCmd.look.Score > byCmd.xyzzy.Score, "universal look outranks dictionary-verb dump items");

console.log("");
console.log(fail === 0 ? "ALL PASS" : "FAILURES", pass + " passed,", fail + " failed");
process.exit(fail === 0 ? 0 : 1);
