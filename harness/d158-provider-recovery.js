// D158: provider registration is scheduled with setTimeout(0) at script load.
// A navigation landing between script execution and that timer discards it,
// leaving every provider object defined and WorldModel.providers EMPTY -- which
// kills the whole payload: no underlined words, no inventory, no map, no stats,
// engineMode stuck on "heuristic".
//
// Measured by finishing the tutorial (whose last act is location.replace to
// restart the module) and reported independently after save/load. It is a race,
// so it struck about three runs in ten before this fix and none in ten after.
const fs = require("fs");
const path = require("path");
let pass = 0, fail = 0;
function assert(c, m) { if (c) { pass++; console.log("PASS:", m); } else { fail++; console.log("FAIL:", m); } }

global.window = global;
global.$ = function () { return { text: () => "", length: 0, first: () => ({ length: 0 }) }; };
global.document = { addEventListener() {}, querySelector: () => null, querySelectorAll: () => [],
                    body: { classList: { contains: () => false } } };
eval(fs.readFileSync(path.resolve(__dirname, "..", "js", "WorldModel.js"), "utf8"));
const W = global.WorldModel || WorldModel;

assert(typeof W.ensureProviders === "function", "WorldModel can re-establish its provider registry");

// The exact broken shape: the objects exist, the registry does not.
W.providers = [];
global.ZRamProvider = { collect: () => ({ sources: [{ name: "z-ram", confidence: 0.9 }], engineMode: "structural" }) };
global.GrammarProvider = { collect: () => ({ sources: [{ name: "grammar-ram", confidence: 0.5 }] }) };
W.ensureProviders();
const names = W.providers.map(p => p.name);
assert(names.indexOf("z-ram") >= 0,
    "an empty registry is rebuilt from the provider objects that are already loaded -- z-ram is what carries rooms, inventory and underlining");
assert(names.indexOf("grammar-ram") >= 0, "and the other registered providers come back with it");

// Idempotent: a populated registry is left exactly as it was.
const before = W.providers.length;
W.ensureProviders();
assert(W.providers.length === before, "calling it again changes nothing -- it is a repair, not a re-registration on every collect");

// A provider that is genuinely absent is not invented.
W.providers = [];
delete global.GrammarProvider;
W.ensureProviders();
assert(W.providers.map(p => p.name).indexOf("grammar-ram") < 0,
    "a provider whose object is not loaded at all is not fabricated");
assert(W.providers.map(p => p.name).indexOf("z-ram") >= 0, "while the ones that are present still recover");

// The recovered provider really is callable -- a name-only entry would leave
// the payload just as dead.
W.providers = [];
global.GrammarProvider = { collect: () => ({ sources: [] }) };
W.ensureProviders();
const z = W.providers.filter(p => p.name === "z-ram")[0];
assert(z && typeof z.collect === "function" && z.collect().engineMode === "structural",
    "and it is wired to the real collect(), so the payload actually comes back structural");

// The repair is reached from the collect path, not only by hand.
const src = fs.readFileSync(path.resolve(__dirname, "..", "js", "WorldModel.js"), "utf8");
assert(/ensureProviders\(\);[\s\S]{0,200}collectHeuristic/.test(src),
    "collectProviders repairs the registry before every collect, so the very next turn recovers on its own");

console.log("\n" + pass + " PASS / " + fail + " FAIL");
process.exit(fail ? 1 : 0);
