/**
 * D85: per-game learned verb-disablement + substitute-verb calibration.
 *
 * Live-verified real-play finding (2026-09-14, AOTYRZ.z5.js, using D86 stage
 * 1's now-correct Input.Inject entry-point coverage): "examine dead soldier",
 * "examine cell phone", "examine plasma rifle" (3 distinct real objects) all
 * return the BYTE-IDENTICAL author-written stub text ("In this game examine,
 * look at, ... have not been implemented..."), while "examine closet" and
 * "examine smashed furniture" return genuinely DIFFERENT, real per-object
 * text ("The closet is empty." / "Never mind the smashed furniture.") --
 * confirming the mechanism must require ALL sampled responses to match, not
 * just a majority, and must not falsely confirm on a partial run. Live proof:
 * before any observation, `ActionSynth.inspectVerbDisabled()` is false; after
 * the 3 identical-response commands above, it flips to true, and
 * `ActionSynth.commandsForPayloadObjectId(closetId, "room")` no longer
 * offers "examine" at all -- the exact original bug report (radial still
 * offering a verb the game itself disabled) is fixed end-to-end.
 *
 * AOTYRZ.z5.js itself offers no real working substitute inspect verb (its
 * own intro text: "You can still use look, inventory and read" -- all
 * global, non-object-targeted; live-tested "read dead soldier"/"read cell
 * phone"/"read plasma rifle" also return byte-identical stub text, "It
 * contains no writing.", so "read" is correctly never confirmed as a
 * substitute either) -- an honest absence, not a gap in this mechanism. The
 * substitute-verb branch is instead verified here with a synthetic,
 * structurally-real sandbox (same precedent as
 * harness/attr-calibrator-location-global.js's synthetic RAM buffer), since
 * no currently-cataloged title happens to need a real learned substitute.
 *
 * Proves:
 *   - disablement does NOT confirm before CONFIRM_THRESHOLD distinct nouns
 *   - disablement DOES confirm once threshold-count distinct nouns all
 *     return byte-identical response text
 *   - a run that includes even one genuinely different response among the
 *     sampled nouns never confirms (the real closet/smashed-furniture case)
 *   - once confirmed, `inspectVerbDisabled()` is true and
 *     `ActionSynth.verbsForAttrs` no longer offers the disabled verb
 *   - substitute-verb learning only starts once the default is confirmed
 *     disabled, and only confirms once a different, player-typed verb
 *     produces genuinely DISTINCT text across threshold-count objects
 *   - a substitute candidate that is ITSELF just another stub (identical
 *     text across objects) never gets promoted
 *   - once a substitute is confirmed, `defaultInspectVerb()` returns it and
 *     `inspectVerbCurrentlyDisabled()` correctly flips back to false (the
 *     CURRENT default now works)
 *   - a game with zero verb-behavior observations is completely unaffected
 *     (Anchorhead-style regression guard: default verb stays "examine",
 *     disabled stays false, byte-identical to pre-D85 behavior)
 *
 * Usage: node harness/attr-calibrator-verb-disablement.js
 */
const fs = require("fs");
const path = require("path");
const vm = require("vm");

const root = path.join(__dirname, "..");

function makeFakeJQuery(state) {
    // Minimal stand-in for the one jQuery shape AttrCalibrator's
    // verb-behavior windows actually use: $(".selector").length and
    // $(".selector").toArray() returning objects with .textContent.
    return function (selector) {
        if (String(selector).indexOf("BufferLine") >= 0) {
            var lines = state.lines.map(function (t) { return { textContent: t }; });
            return { length: lines.length, toArray: function () { return lines; } };
        }
        return { length: 0, toArray: function () { return []; } };
    };
}

function freshSandbox() {
    const store = {};
    const state = { lines: [] };
    const sandbox = {
        console, setTimeout, window: {},
        localStorage: {
            getItem: (k) => (k in store ? store[k] : null),
            setItem: (k, v) => { store[k] = String(v); },
            removeItem: (k) => { delete store[k]; }
        }
    };
    vm.createContext(sandbox);
    sandbox.$ = makeFakeJQuery(state);
    sandbox.Actionable = { Submit: function (command) {} };
    sandbox.WorldModel = { lastPayload: { discoveredObjects: [], inventory: [] } };
    var memBytes = new Array(64).fill(0);
    memBytes[0] = 5; // version 5
    memBytes[2] = 0; memBytes[3] = 1; // release 1
    "060825".split("").forEach(function (ch, i) { memBytes[0x12 + i] = ch.charCodeAt(0); });
    var fakeMem = { getUint8: (a) => memBytes[a] || 0, byteLength: memBytes.length };
    sandbox.ZvmCapture = { getMem: function () { return fakeMem; } };
    var gameKey = "1-060825";
    sandbox.LearningStores = {
        register: function () {},
        identity: function () { return { identityKey: gameKey, digest: "060825" }; },
        readOwned: function (kind, id) {
            var prefix = kind === "attrCalib" ? "PL_AttrCalib_" : (kind + "_");
            return { status: "ready", value: store[prefix + (id && id.identityKey)] || null };
        },
        persist: function (kind, i, value) {
            var prefix = kind === "attrCalib" ? "PL_AttrCalib_" : (kind + "_");
            store[prefix + i.identityKey] = value;
        }
    };
    vm.runInContext(fs.readFileSync(path.join(root, "js", "AttributeSchema.js"), "utf8"), sandbox);
    vm.runInContext(fs.readFileSync(path.join(root, "js", "ZRamReader.js"), "utf8"), sandbox);
    vm.runInContext(fs.readFileSync(path.join(root, "js", "ActionSynth.js"), "utf8"), sandbox);
    vm.runInContext(fs.readFileSync(path.join(root, "js", "AttrCalibrator.js"), "utf8"), sandbox);
    return { sandbox, state, store };
}

// D86 CUTOVER, 2026-09-14: drives AttrCalibrator.analyzers.verbBehavior
// directly (the legacy observeVerbBehavior/_resolveVerbBehavior/
// `_verbBehaviorWindow` window this harness originally used has been
// removed -- the analyzer reuses the exact same _correlateVerbBehavior
// logic, now orchestrated by TurnRecorder in production). prepare()
// captures the verb/noun/objectId split at "open" time; captureAfter()
// (called here right after the response is "printed", matching the old
// resolve timing but without waiting on a real 450ms timer) slices the
// transcript and does the read-after-plus-correlate step in one call.
function submit(sandbox, state, obj, verb, responseText, commandNounOverride) {
    sandbox.WorldModel.lastPayload.discoveredObjects = [obj];
    var analyzer = sandbox.AttrCalibrator.analyzers.verbBehavior;
    var turn = { command: verb + " " + (commandNounOverride || obj.name), startLine: state.lines.length, endLine: null, analyzerSnapshots: {} };
    var interest = analyzer.prepare(turn);
    state.lines.push(responseText);
    if (interest && interest.captureAfter) turn.analyzerSnapshots["diag-verbBehavior"] = interest.captureAfter(turn);
}

let pass = 0, fail = 0;
function check(name, cond) {
    if (cond) { pass++; console.log("PASS: " + name); }
    else { fail++; console.log("FAIL: " + name); }
}

// --- Test 1: does not confirm before threshold ---
(function () {
    const { sandbox, state } = freshSandbox();
    const STUB = "This verb has not been implemented.";
    submit(sandbox, state, { id: 1, name: "alpha" }, "examine", STUB);
    check("1 observation: not yet confirmed", sandbox.AttrCalibrator.inspectVerbCurrentlyDisabled() === false);
    submit(sandbox, state, { id: 2, name: "beta" }, "examine", STUB);
    check("2 observations (threshold is 3): still not confirmed", sandbox.AttrCalibrator.inspectVerbCurrentlyDisabled() === false);
})();

// --- Test 2: confirms once threshold-count distinct nouns are byte-identical ---
(function () {
    const { sandbox, state } = freshSandbox();
    const STUB = "This verb has not been implemented.";
    submit(sandbox, state, { id: 1, name: "alpha" }, "examine", STUB);
    submit(sandbox, state, { id: 2, name: "beta" }, "examine", STUB);
    submit(sandbox, state, { id: 3, name: "gamma" }, "examine", STUB);
    check("3 identical-text observations: CONFIRMED disabled", sandbox.AttrCalibrator.inspectVerbCurrentlyDisabled() === true);
    check("verbsForAttrs omits the disabled default verb entirely", sandbox.ActionSynth.verbsForAttrs({}).indexOf("examine") < 0);
})();

// --- Test 3: the real AOTYRZ edge case -- one genuinely different response
//     among the sampled nouns must NEVER confirm, even past the threshold
//     count of distinct nouns tried ---
(function () {
    const { sandbox, state } = freshSandbox();
    const STUB = "This verb has not been implemented.";
    submit(sandbox, state, { id: 1, name: "dead soldier" }, "examine", STUB);
    submit(sandbox, state, { id: 2, name: "closet" }, "examine", "The closet is empty."); // real, distinct text
    submit(sandbox, state, { id: 3, name: "cell phone" }, "examine", STUB);
    check("a genuinely different response among 3 samples: NEVER confirms (real closet/smashed-furniture case)", sandbox.AttrCalibrator.inspectVerbCurrentlyDisabled() === false);
    // A 4th, still-identical-to-stub noun does not retroactively confirm the
    // contaminated run either -- responsesByObject keeps the closet's real
    // entry forever (never overwritten), so texts.every(...) can never pass.
    submit(sandbox, state, { id: 4, name: "plasma rifle" }, "examine", STUB);
    check("adding a 4th identical noun after contamination still never confirms", sandbox.AttrCalibrator.inspectVerbCurrentlyDisabled() === false);
})();

// --- Test 4: substitute-verb learning only starts once disabled is confirmed,
//     and only confirms once a different verb's text is genuinely distinct
//     across threshold-count objects ---
(function () {
    const { sandbox, state } = freshSandbox();
    const STUB = "This verb has not been implemented.";
    submit(sandbox, state, { id: 1, name: "alpha" }, "examine", STUB);
    submit(sandbox, state, { id: 2, name: "beta" }, "examine", STUB);
    submit(sandbox, state, { id: 3, name: "gamma" }, "examine", STUB);
    check("precondition: examine confirmed disabled before substitute learning starts", sandbox.AttrCalibrator.inspectVerbCurrentlyDisabled() === true);
    check("no substitute learned yet", sandbox.AttrCalibrator.defaultInspectVerb() === "examine");

    submit(sandbox, state, { id: 1, name: "alpha" }, "inspect", "A rusty alpha widget.");
    submit(sandbox, state, { id: 2, name: "beta" }, "inspect", "A shiny beta gadget.");
    check("2 distinct-text substitute observations: not yet confirmed", sandbox.AttrCalibrator.defaultInspectVerb() === "examine");
    submit(sandbox, state, { id: 3, name: "gamma" }, "inspect", "A dull gamma thing.");
    check("3 genuinely DISTINCT substitute observations: CONFIRMED as the new default", sandbox.AttrCalibrator.defaultInspectVerb() === "inspect");
    check("inspectVerbCurrentlyDisabled flips back to false (the current default now works)", sandbox.AttrCalibrator.inspectVerbCurrentlyDisabled() === false);
})();

// --- Test 5: a substitute candidate that is ITSELF just another global stub
//     (identical text across objects) must NEVER be promoted ---
(function () {
    const { sandbox, state } = freshSandbox();
    const STUB = "This verb has not been implemented.";
    submit(sandbox, state, { id: 1, name: "alpha" }, "examine", STUB);
    submit(sandbox, state, { id: 2, name: "beta" }, "examine", STUB);
    submit(sandbox, state, { id: 3, name: "gamma" }, "examine", STUB);

    const OTHER_STUB = "It contains no writing.";
    submit(sandbox, state, { id: 1, name: "alpha" }, "read", OTHER_STUB);
    submit(sandbox, state, { id: 2, name: "beta" }, "read", OTHER_STUB);
    submit(sandbox, state, { id: 3, name: "gamma" }, "read", OTHER_STUB);
    check("a substitute candidate whose text is ALSO identical across objects is never promoted (AOTYRZ's real 'read' case)", sandbox.AttrCalibrator.defaultInspectVerb() === "examine");
    check("stays correctly disabled with no working substitute (honest absence)", sandbox.AttrCalibrator.inspectVerbCurrentlyDisabled() === true);
})();

// --- Test 6: zero-observation game is completely unaffected ---
(function () {
    const { sandbox } = freshSandbox();
    check("zero observations: defaultInspectVerb stays 'examine' (byte-identical to pre-D85 behavior)", sandbox.AttrCalibrator.defaultInspectVerb() === "examine");
    check("zero observations: inspectVerbCurrentlyDisabled stays false", sandbox.AttrCalibrator.inspectVerbCurrentlyDisabled() === false);
    check("zero observations: verbsForAttrs still offers the default verb exactly as before", sandbox.ActionSynth.verbsForAttrs({}).indexOf("examine") === 0);
})();

// --- Test 7: persistence round-trips through localStorage, keyed by real
//     game identity, exactly like every other calibrated fact in this file ---
(function () {
    const { sandbox, state, store } = freshSandbox();
    const STUB = "This verb has not been implemented.";
    submit(sandbox, state, { id: 1, name: "alpha" }, "examine", STUB);
    submit(sandbox, state, { id: 2, name: "beta" }, "examine", STUB);
    submit(sandbox, state, { id: 3, name: "gamma" }, "examine", STUB);
    check("a real localStorage entry is written under the PL_AttrCalib_ prefix", Object.keys(store).some((k) => k.indexOf("PL_AttrCalib_") === 0));

    const { sandbox: sandbox2 } = freshSandbox();
    // Reuse the same backing store to simulate a fresh page load / hydrate.
    Object.keys(store).forEach((k) => { sandbox2.localStorage.setItem(k, store[k]); });
    var mem2 = sandbox2.ZvmCapture.getMem();
    sandbox2.AttrCalibrator.hydrate(mem2);
    check("a fresh hydrate from the SAME localStorage backing store restores the confirmed disablement", sandbox2.AttrCalibrator.inspectVerbCurrentlyDisabled() === true);
})();

// --- Test 8 (codex #441): observeVerbBehavior must recognize a command
//     built from Actionable.commandNounFor(obj)'s VERIFIED ALIAS, not just
//     obj.name -- js/ActionSynth.js's commandsForObject submits exactly
//     that alias (D64), so a radial/click command using it would otherwise
//     be silently invisible to this mechanism even though D86 stage 1
//     correctly delivers it to the VM. ---
(function () {
    const { sandbox, state } = freshSandbox();
    const STUB = "This verb has not been implemented.";
    sandbox.Actionable.VerifiedNouns = { "1": "banged-up soldier", "2": "cellular phone", "3": "ray gun" };
    sandbox.Actionable.commandNounFor = function (obj) {
        return (obj && obj.id != null && sandbox.Actionable.VerifiedNouns[String(obj.id)]) || (obj && obj.name) || "";
    };
    // Commands are built from the ALIAS (what ActionSynth would actually
    // submit), but the payload objects still carry their structural name.
    submit(sandbox, state, { id: 1, name: "dead soldier" }, "examine", STUB, "banged-up soldier");
    submit(sandbox, state, { id: 2, name: "cell phone" }, "examine", STUB, "cellular phone");
    submit(sandbox, state, { id: 3, name: "plasma rifle" }, "examine", STUB, "ray gun");
    check("alias-driven commands (Actionable.commandNounFor, not obj.name) are recognized and confirm disablement", sandbox.AttrCalibrator.inspectVerbCurrentlyDisabled() === true);
})();

// --- Test 9 (codex #444): a real object examined under BOTH its structural
//     name AND its verified alias must count as ONE distinct object, never
//     two -- confirmation must require genuinely DISTINCT object ids, not
//     merely distinct noun STRINGS. Two real objects (one probed twice,
//     under two different noun spellings) must NEVER reach the 3-distinct-
//     object threshold, even though 3 distinct noun keys were submitted. ---
(function () {
    const { sandbox, state } = freshSandbox();
    const STUB = "This verb has not been implemented.";
    sandbox.Actionable.VerifiedNouns = { "1": "banged-up soldier" };
    sandbox.Actionable.commandNounFor = function (obj) {
        return (obj && obj.id != null && sandbox.Actionable.VerifiedNouns[String(obj.id)]) || (obj && obj.name) || "";
    };
    submit(sandbox, state, { id: 1, name: "dead soldier" }, "examine", STUB);                       // object 1, noun "dead soldier"
    submit(sandbox, state, { id: 1, name: "dead soldier" }, "examine", STUB, "banged-up soldier");    // SAME object 1, different noun (alias)
    submit(sandbox, state, { id: 2, name: "cell phone" }, "examine", STUB);                          // object 2, noun "cell phone"
    check("codex #444: name+alias for the SAME object plus one other object (2 real distinct objects, 3 noun strings) never falsely confirms", sandbox.AttrCalibrator.inspectVerbCurrentlyDisabled() === false);
    // A genuine 3rd distinct object now correctly reaches the threshold.
    submit(sandbox, state, { id: 3, name: "plasma rifle" }, "examine", STUB);
    check("a genuine 3rd distinct object id correctly confirms", sandbox.AttrCalibrator.inspectVerbCurrentlyDisabled() === true);
})();

// --- Test 10 (D107 audit): a real parser alias shared by two scoped
//     objects may trigger the story's own disambiguation prompt, but it must
//     never be attributed to the first payload object for calibration. ---
(function () {
    const { sandbox } = freshSandbox();
    sandbox.Actionable.commandNounFor = function () { return "key"; };
    sandbox.WorldModel.lastPayload.discoveredObjects = [
        { id: 1, name: "brass key" },
        { id: 2, name: "iron key" }
    ];
    var split = sandbox.AttrCalibrator._splitAnyVerbNoun("examine key");
    check("D107: ambiguous shared alias fails closed instead of calibrating the first object", split === null);
})();

console.log("\n" + pass + " PASS / " + fail + " FAIL");
process.exit(fail ? 1 : 0);
