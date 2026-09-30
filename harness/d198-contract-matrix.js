/* D198 final contract checks that span runtime owners and packaging. */
const assert = require("assert");
const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const read = file => fs.readFileSync(path.join(root, file), "utf8");
let checks = 0;

function ok(value, message) {
    assert.ok(value, message);
    checks++;
}

const play = read("play.html");
const moduleAt = play.indexOf('src="js/ModuleLibrary.js"');
const loaderAt = play.indexOf('src="lib/main.js"');
ok(moduleAt >= 0 && loaderAt > moduleAt,
    "ModuleLibrary installs the story-response adapter before the interpreter loader starts");

const shell = read("service-worker.js");
[
    "js/ModuleLibrary.js", "js/WorldModel.js", "js/GrammarProvider.js",
    "js/AttrCalibrator.js", "js/SemanticActions.js", "js/ExitCalibrator.js",
    "js/UndoRestoreSync.js"
].forEach(file => ok(shell.includes('"' + file + '"'), file + " is in the offline app shell"));
const cacheGeneration = /CACHE_VERSION\s*=\s*"parchlock-shell-v(\d+)"/.exec(shell);
ok(cacheGeneration && Number(cacheGeneration[1]) >= 82,
    "D198 and later work retain a distinct service-worker cache generation");

const dist = read("make-dist.bat");
ok(/robocopy "%SRC%\\js" "%DEST%\\js" \*\.js/.test(dist),
    "the runtime allow-list includes every D198 JavaScript owner");
ok(/for %%F in \(\s*index\.html play\.html tutorial\.html/.test(dist),
    "runtime distribution is built from an explicit root-file allow-list");
ok(!/for %%F in \([^)]*(?:PRODUCTION_PLAN|ARCHITECTURE_UML|docs\\ai-|harness)/s.test(dist),
    "internal plans, AI records and harnesses are absent from the runtime root allow-list");
ok(/Never include games, AI\/internal docs, build output/.test(dist),
    "corresponding-source packaging documents its internal-document exclusion");

const grammar = read("js/GrammarProvider.js");
const semantic = read("js/SemanticActions.js");
const exits = read("js/ExitCalibrator.js");
const calibrator = read("js/AttrCalibrator.js");
[
    [grammar, "PL_D198_GrammarValve_v1"],
    [semantic, "PL_D198_SemanticValve_v1"],
    [exits, "PL_D198_ExitValve_v1"]
].forEach(([source, key]) => {
    ok(source.includes(key), key + " is versioned and owner-local");
    ok(/return value === "shadow" \|\| value === "on" \? value : "off"/.test(source),
        key + " fails closed to off");
});

const executableLines = [grammar, semantic, exits, calibrator].join("\n")
    .split(/\r?\n/).filter(line => !/^\s*\/\//.test(line)).join("\n");
ok(!/Input\.Inject\s*\(|Actionable\.Submit\s*\(/.test(executableLines),
    "D198 owners contain no active command probes");
ok(!/title\s*===|filename\s*===|StoryPath\s*===/.test(grammar),
    "the family decoder contains no title or filename classifier branch");
ok(/d198ProvenanceForObject/.test(calibrator) && !/allowedVerbsFor\([^)]*\).*d198/is.test(calibrator),
    "D198 provenance has a dedicated query instead of promoting legacy allowed verbs");
ok(/directionLinkEvidence\s*===\s*"validated"/.test(exits),
    "grammar classification alone cannot authorize structural exits");

const requiredHarnesses = [
    "d198-loader-identity.js", "d198-provider-completeness.js",
    "d198-grammar-decoder.js", "d198-grammar-shadow.js",
    "d198-semantic-provenance.js", "d198-exit-valve.js", "d198-lifecycle.js"
];
requiredHarnesses.forEach(file => ok(fs.existsSync(path.join(root, "harness", file)), file + " exists"));

console.log("PASS D198 contract matrix: " + checks + " script-order, valve, no-probe, cache and packaging checks");
