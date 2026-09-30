// D201 catalog classifier. No product file is modified.
// Usage: node tools/d201-unnamed-identity-audit.js [--json <path>]
const fs = require("fs"), path = require("path"), vm = require("vm");
const root = path.resolve(__dirname, "..");

function loadMem(file) {
    let mem;
    vm.runInNewContext(fs.readFileSync(path.join(root, "games", file), "utf8"), {
        processBase64Zcode: encoded => { mem = new Uint8Array(Buffer.from(encoded, "base64")); }
    }, { timeout: 2000 });
    if (mem && Buffer.from(mem.slice(0, 4)).toString() === "FORM") {
        const form = Buffer.from(mem); mem = null;
        for (let at = 12; at + 8 <= form.length;) {
            const size = form.readUInt32BE(at + 4);
            if (form.toString("ascii", at, at + 4) === "ZCOD") {
                mem = new Uint8Array(form.subarray(at + 8, at + 8 + size));
                break;
            }
            at += 8 + size + (size % 2);
        }
    }
    return mem;
}

const sandbox = {};
vm.createContext(sandbox);
for (const file of ["js/AttributeSchema.js", "js/ZRamReader.js"]) {
    vm.runInContext(fs.readFileSync(path.join(root, file), "utf8"), sandbox);
}
const R = sandbox.ZRamReader;
const files = fs.readdirSync(path.join(root, "games")).filter(file => /\.(?:z[1-8]|zblorb)\.js$/i.test(file));
const rows = [];

for (const file of files) {
    let mem;
    try { mem = loadMem(file); } catch (error) { continue; }
    if (!mem || !R.header(mem) || !R.isInformCompiled(mem)) continue;
    const count = R.objectCount(mem), parserSelf = [];
    for (let id = 2; id <= count; id++) {
        let aliases = [], attrs = {}, links = null, parentName = "";
        try {
            aliases = R.parserWordsAny(mem, id) || [];
            if (!aliases.some(word => String(word).toLowerCase() === "yourself")) continue;
            attrs = R.attrsFromObject(mem, id) || {};
            links = R.objectLinks(mem, id);
            parentName = links && links.parent ? (R.shortName(mem, links.parent) || "") : "";
        } catch (error) { continue; }
        parserSelf.push({
            id,
            name: R.shortName(mem, id) || "",
            aliases,
            animate: !!attrs.animate,
            parentId: links ? links.parent : 0,
            classOwned: /^class$/i.test(parentName)
        });
    }
    const resolved = R.resolvePlayer(mem);
    rows.push({
        file,
        version: R.header(mem).version,
        playerId: resolved.id,
        source: resolved.source,
        ambiguous: resolved.ambiguous,
        parserSelf,
        viableParserSelf: parserSelf.filter(candidate => candidate.animate && !candidate.classOwned).length
    });
}

const unique = rows.filter(row => row.viableParserSelf === 1);
const multi = rows.filter(row => row.viableParserSelf > 1);
const ambiguous = rows.filter(row => row.ambiguous);
const recovered = rows.filter(row => row.source === "parser-self");
console.log(`Inform modules: ${rows.length}`);
console.log(`Unique viable parser-self: ${unique.length}`);
console.log(`Multiple viable parser-self candidates: ${multi.length}`);
console.log(`Unresolved equal-score ambiguity: ${ambiguous.length}`);
console.log(`Resolved through D201 parser-self: ${recovered.length}`);
console.log("\nD201 parser-self resolutions:");
for (const row of recovered) console.log(`  ${row.file.padEnd(28)} v${row.version} player=${row.playerId}`);
if (multi.length) {
    console.log("\nMultiple-candidate controls (stronger structural evidence may resolve):");
    for (const row of multi) console.log(`  ${row.file.padEnd(28)} candidates=${row.viableParserSelf} resolved=${row.playerId || 0} source=${row.source || "none"}`);
}
if (ambiguous.length) {
    console.log("\nFail-closed ambiguous controls:");
    for (const row of ambiguous) console.log(`  ${row.file.padEnd(28)} candidates=${row.viableParserSelf} resolved=${row.playerId || 0}`);
}

const llr = rows.find(row => /^LLR3\.z8\.js$/i.test(row.file));
if (!llr || llr.playerId !== 96 || llr.source !== "parser-self" || llr.ambiguous) {
    console.error("\nFAIL: LLR3 must resolve unique parser-self object 96: " + JSON.stringify(llr));
    process.exitCode = 1;
} else {
    console.log("\nPASS: LLR3 resolves unique parser-self object 96.");
}

const jsonAt = process.argv.indexOf("--json");
if (jsonAt >= 0) {
    const out = path.resolve(process.cwd(), process.argv[jsonAt + 1]);
    fs.mkdirSync(path.dirname(out), { recursive: true });
    fs.writeFileSync(out, JSON.stringify({ summary: {
        inform: rows.length, unique: unique.length, multi: multi.length,
        ambiguous: ambiguous.length, recovered: recovered.length
    }, rows }, null, 2));
    console.log("Wrote " + out);
}
