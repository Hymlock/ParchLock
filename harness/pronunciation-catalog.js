// Checks every example in js/PronunciationCatalog.js, then the full spoken
// pipeline (normalizeSpokenCaps -> applyPronunciations) on real game text.
//   node harness/pronunciation-catalog.js
const path = require("path");
let pass = 0, fail = 0;
const ok = (c, m) => { if (c) { pass++; console.log("PASS:", m); } else { fail++; console.log("FAIL:", m); } };

const Catalog = require(path.resolve(__dirname, "..", "js", "PronunciationCatalog.js"));
global.PronunciationCatalog = Catalog;
global.window = {}; global.document = {}; global.MutationObserver = function () { this.observe = function () {}; };
const fs = require("fs");
const src = fs.readFileSync(path.resolve(__dirname, "..", "js", "ReadAloud.js"), "utf8").replace(/^var ReadAloud/m, "global.ReadAloud");
eval(src);

const ids = new Set();
Catalog.entries.forEach(function (e) {
    ok(!ids.has(e.id), "unique id " + e.id); ids.add(e.id);
    ok(e.source && e.examples && e.examples.length, e.id + " has a source and examples");
    e.examples.forEach(function (ex) {
        const got = Catalog.apply(ex[0]);
        ok(got === ex[1], e.id + ": " + JSON.stringify(ex[0]) + " -> " + JSON.stringify(got) + (got === ex[1] ? "" : " (want " + JSON.stringify(ex[1]) + ")"));
    });
});

// Full pipeline on capitals as interactive fiction prints them.
const spoken = (t) => ReadAloud.applyPronunciations(ReadAloud.normalizeSpokenCaps(t));
[
    ["the CASTLE of the SLAVER KING", "the Castle of the Slayver King"],
    ["AT THE GRAVEL PIT", "at the Gravel PIT"],          // AT stays a word, never "attack total" (3-letter caps kept by normalizeSpokenCaps)
    ["You see an NPC and an AI.", "You see an N. P. C. and an A. I.."],   // existing initialism output, unchanged here
    ["HIT POINTS: 15/15", "HIT Points: 15/15"],
    ["The EMP knocked out 10 HP.", "The electromagnetic pulse knocked out 10 hit points."],
    ["EVA waved.", "EVA waved."]                          // a name, not extravehicular activity
].forEach(function (c) {
    const got = spoken(c[0]);
    ok(got === c[1], "pipeline: " + JSON.stringify(c[0]) + " -> " + JSON.stringify(got) + (got === c[1] ? "" : " (want " + JSON.stringify(c[1]) + ")"));
});

ok(ReadAloud.applyPronunciations("an anchor") === "an anker", "ReadAloud routes through the catalog");

console.log(pass + " PASS / " + fail + " FAIL");
process.exit(fail ? 1 : 0);
