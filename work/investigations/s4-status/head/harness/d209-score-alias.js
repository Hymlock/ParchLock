// D209: a labelled status metric is shown AS the score only on fresh, repeated,
// unambiguous evidence; never from one equal sighting or stale ordering.
//   node harness/d209-score-alias.js
const path = require("path");
let pass = 0, fail = 0;
function assert(cond, msg) { if (cond) { pass++; console.log("PASS:", msg); } else { fail++; console.log("FAIL:", msg); } }
const store = {};
global.localStorage = { getItem: k => (k in store ? store[k] : null), setItem: (k, v) => { store[k] = String(v); }, removeItem: k => { delete store[k]; } };
const S = require(path.resolve(__dirname, "..", "js", "StatTracker.js"));

function fresh() {
    S._aliasEv = null; S._storyEpoch = 1; S._turn = 0;
    return { stats: { score: { key: "score", label: "Score", value: 0, max: 500, boundSource: "score-command", confirmed: true },
                      "quest rate": { key: "quest rate", label: "QUEST RATE", value: 0, max: 500, confirmed: true } } };
}
// One tick: optionally a fresh score reading, then the sighted status metrics.
function tick(model, scoreValue, sighted, scoreFresh) {
    S._turn++;
    if (scoreValue != null) model.stats.score.value = scoreValue;
    if (scoreFresh) S._scoreFreshTick = S._turn;
    S._observedTick = { turn: S._turn, observed: sighted };
    S.updateScoreAlias(model);
}
const q = (v, max) => ({ "quest rate": { key: "quest rate", value: v, max: max == null ? 500 : max } });

let m = fresh();
tick(m, 0, q(0), true);
assert(S.scoreAliasKey() === null, "one equal fresh sighting (0=0) stays split");
tick(m, 2, q(2), true);
assert(S.scoreAliasKey() === "quest rate", "a second distinct fresh match creates the alias");
m.stats["quest rate"].value = 2;   // the stored reading agrees now
S._model = m;
const realModel = S.model; S.model = () => m;
const rows = S.visibleStats();
S.model = realModel;
assert(rows.filter(r => r.key === "score" || r.key === "quest rate").length === 1 && rows.some(r => r.key === "score" && r.label === "QUEST RATE"),
    "one merged row under the story's own label: " + JSON.stringify(rows.map(r => r.key + ':' + r.label)));

m = fresh();
tick(m, 0, q(0), true);
tick(m, null, q(2), false);              // the grid moved, score NOT fresh this tick
tick(m, 0, q(2), true);                   // stale: score still 0 vs grid 2 -> contradiction
assert(S.scoreAliasKey() === null, "stale ordering never pairs a fresh grid with an unrefreshed score");

m = fresh();
tick(m, 0, q(0), true); tick(m, 2, q(2), true);
assert(S.scoreAliasKey() === "quest rate", "alias formed");
tick(m, 5, q(4), true);
assert(S.scoreAliasKey() === null, "a fresh contradiction splits immediately");

m = fresh();
tick(m, 0, q(0, 100), true); tick(m, 2, q(2, 100), true);
assert(S.scoreAliasKey() === null, "a metric whose max differs from the SCORE-reply max never aliases");

m = fresh();
const two = (v) => Object.assign(q(v), { renown: { key: "renown", value: v, max: 500 } });   // a second CUSTOM label
tick(m, 0, two(0), true); tick(m, 2, two(2), true);
assert(S.scoreAliasKey() === null, "two qualifying metrics stay ambiguous and split");

m = fresh();
tick(m, 0, q(0), true); tick(m, 2, q(2), true);
S.Resync && S.Resync("restore");
assert(S.scoreAliasKey() === null, "Resync (undo/restore/restart) clears the evidence");

m = fresh();
m.stats.score.boundSource = "status";
tick(m, 0, q(0), true); tick(m, 2, q(2), true);
assert(S.scoreAliasKey() === null, "no alias without a max stated by the story's own SCORE reply");

// ---- Codex #1544/#1545 regressions ----
const render = (model) => { const real = S.model; S.model = () => model; const r = S.visibleStats(); S.model = real; return r; };
const keysOf = (rows) => rows.map(r => r.key + ":" + r.label + "=" + r.value + "/" + r.max).join(" ");

m = fresh();
tick(m, 0, q(0), true); tick(m, 2, q(2), true);           // alias established
m.stats.score.value = 2; m.stats["quest rate"].value = 3;  // grid moved, score stale (no fresh tick)
tick(m, null, q(3), false);
let r = render(m);
assert(r.some(x => x.key === "quest rate" && x.value === 3) && r.some(x => x.key === "score" && x.value === 2),
    "after alias: a grid change with a stale score renders BOTH rows, never a stale merged row: " + keysOf(r));
m.stats.score.value = 3;
r = render(m);
assert(r.filter(x => x.key === "score" || x.key === "quest rate").length === 1, "once both agree again the merged row returns (evidence retained): " + keysOf(r));

m = fresh();
tick(m, 0, q(0), true); tick(m, 2, q(2), true);
tick(m, 4, q(4, 100), true);                                 // fresh pair, metric max now 100 vs score 500
assert(S.scoreAliasKey() === null, "a fresh max mismatch invalidates already-qualified evidence");

m = fresh();
m.stats.health = { key: "health", label: "HIT POINTS", value: 0, max: 500, confirmed: true };
const hp = (v) => ({ health: { key: "health", value: v, max: 500 } });
tick(m, 0, hp(0), true); tick(m, 2, hp(2), true);
assert(S.scoreAliasKey() === null, "a canonical stat (health) with the same max and two matched values is never aliased");

m = fresh();
tick(m, 0, q(0), true); tick(m, 2, q(2), true);
delete m.stats["quest rate"];
r = render(m);
assert(r.some(x => x.key === "score" && x.label === "Score"), "if the metric disappears no alias row is drawn: " + keysOf(r));

m = fresh();
tick(m, 0, q(0), true); tick(m, 2, q(2), true);
m.stats.score.boundSource = "status";
r = render(m);
assert(!r.some(x => x.key === "score" && x.label === "QUEST RATE"), "if the score max is no longer from the SCORE reply the alias is not drawn");

// Codex #1552: a delta applied to experience (W&W-style scoreMetricKey) is not
// a fresh SCORE reading.
{
    const mm = { stats: { score: { key: "score", value: 2, max: 500, boundSource: "score-command", confirmed: true },
                          experience: { key: "experience", value: 10, confirmed: true, source: "score-command" } },
                 scoreMetricKey: "experience", seenDeltas: {} };
    const realModel = S.model, realKey = S.scoreMetricKey, realShows = S.statusShowsScore;
    S.model = () => mm; S.scoreMetricKey = () => "experience"; S.statusShowsScore = () => false;
    S._turn = 99; S._scoreFreshTick = -1;
    try { S.applyScoreDeltaToDisplay(mm, 1, 10); } catch (e) {}
    S.model = realModel; S.scoreMetricKey = realKey; S.statusShowsScore = realShows;
    assert(mm.stats.experience.value === 11 && mm.stats.score.value === 2, "the experience delta is applied to experience only: exp=" + mm.stats.experience.value + " score=" + mm.stats.score.value);
    assert(S._scoreFreshTick !== 99, "an experience delta never stamps the score as freshly read");
}

// Executable-authenticated semantic facts work at the FIRST restored value.
{
    const digest = "257edae1fea429656e638fa539a65c0f4e4daeb4f9669a2a5be368e6a9aca756";
    global.ModuleLibrary = { currentExecutableIdentity: () => ({ digest }) };
    const restored = fresh(); restored.stats.score.value = restored.stats["quest rate"].value = 43;
    assert(S.scoreAliasKey() === null && S.displayScoreAlias(restored) === "quest rate", "authenticated first stationary43 pair merges without dynamic observations");
    const fact = S.probeFactsForIdentity({ digest });
    assert(fact.command === "score" && fact.additionalProbes.some(p => p.command === "prowess"), "semantic overlay preserves SCORE and PROWESS capabilities");
    restored.stats["quest rate"].value = 44;
    assert(S.displayScoreAlias(restored) === null, "declared alias splits on current value disagreement");
    restored.stats["quest rate"].value = 43; restored.stats["quest rate"].max = 501;
    assert(S.displayScoreAlias(restored) === null, "declared alias splits on max disagreement");
    restored.stats["quest rate"].max = 500; restored.stats.score.boundSource = "status";
    assert(S.displayScoreAlias(restored) === null, "declared alias needs SCORE-reply maximum provenance");
    restored.stats.score.boundSource = "score-command"; restored.stats["quest rate"].confirmed = false;
    assert(S.displayScoreAlias(restored) === null, "unconfirmed restored metric does not merge");
    restored.stats["quest rate"].confirmed = true; restored.scoreUnavailable = true;
    assert(S.displayScoreAlias(restored) === null, "unavailable score cannot merge");
    restored.scoreUnavailable = false;
    global.ModuleLibrary.currentExecutableIdentity = () => ({ digest: "unknown" });
    assert(S.displayScoreAlias(restored) === null, "equal numbers on an unknown executable remain split");
    const actualFacts = S.probeFactsForIdentity;
    for (const declaration of [null, [], ["quest rate"], "", "score", "health", "missing"]) {
        S.probeFactsForIdentity = () => ({ scoreAliasField: declaration });
        assert(S.displayScoreAlias(restored) === null, "malformed/canonical/missing declared field fails closed: " + JSON.stringify(declaration));
    }
    S.probeFactsForIdentity = actualFacts;
    delete global.ModuleLibrary;
}
console.log(pass + " PASS / " + fail + " FAIL");
process.exit(fail ? 1 : 0);
