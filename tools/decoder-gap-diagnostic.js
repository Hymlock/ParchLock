// Research instrument for the 46 fallback Inform modules (pl-s253 / D193).
//
// PRODUCTION_PLAN records those 46 in five categories and says explicitly that
// they "identify the FIRST rejected structural check, not a proven root cause".
// Codex added the sharper warning: "Missing compiler stamps do not prove symbols
// were stripped; earlier failures can conceal aliases." D193 proved that warning
// right once already -- 20 modules were filed under a decode rejection when the
// real cause was the single-identifier regex.
//
// So this tool does not classify. It instruments EVERY rejection point inside
// the real `informAttributeNames` by source substitution -- unique text anchors,
// each asserted to appear exactly once, so a drifted reader fails loudly instead
// of silently mis-reporting -- and records which gate fired with the observed
// values at that moment. No product file is modified and no check is relaxed.
//
// It answers three questions the documented categories cannot:
//   1. Which gate does each module ACTUALLY die at, post-D193?
//   2. Do the documented categories still match, or did D193 move any module?
//   3. For each gate, what do the real numbers look like -- is there a coherent
//      alternative layout behind it, or 22 unrelated accidents?
//
// Usage: node tools/decoder-gap-diagnostic.js [--json <out>] [--module <file>]
//        node tools/decoder-gap-diagnostic.js --symbols   (see below)
//
// --symbols answers the question the gate grouping cannot: for a module that
// fails, is the identifier-names table ABSENT from the file, or present and
// merely mislocated? Absent means no decoder can ever recover it. Mislocated
// means a better locator would.
//
// Method and its two corrections. A first pass scanned only from `himem`
// upward, mirroring the decoder's own `address < h.himem` bound -- which makes
// the scan unable to detect exactly the case where that bound is what is wrong.
// This scans the WHOLE file. It also discriminates on identifiers that cannot
// occur in prose (`each_turn`, `cant_go`, `n_to`, `short_name`), because a
// first pass matched `number`, `before` and `after`, which are ordinary English
// words and appear in game text.
const fs = require("fs"), path = require("path"), vm = require("vm");
const root = path.resolve(__dirname, "..");

// Each entry: unique anchor in js/ZRamReader.js -> instrumented replacement.
// `__g(gate, detail)` records and returns a sentinel instead of null.
const GATES = [
    // D200 repointed: v3 is now an accepted version, so the gate reads [3,4,5,8].
    // The anchor assertion caught this correctly -- it threw rather than
    // silently instrumenting nothing.
    ["if (!h || [3, 4, 5, 8].indexOf(h.version) < 0 || !ZRamReader.isInformCompiled(mem)) return null;",
     "if (!h || [3, 4, 5, 8].indexOf(h.version) < 0 || !ZRamReader.isInformCompiled(mem)) return __g('version-gate', { version: h && h.version, inform: ZRamReader.isInformCompiled(mem) });"],

    ["if (!Number.isInteger(count) || count < 1 || count > 20000 || !len || h.globals >= len) return null;",
     "if (!Number.isInteger(count) || count < 1 || count > 20000 || !len || h.globals >= len) return __g('object-count', { count: count, firstObject: firstObject, firstProps: firstProps, entrySize: h.entrySize, globals: h.globals, len: len, integer: Number.isInteger(count) });"],

    ["if (ptr < firstProps || ptr >= h.globals) return null;",
     "if (ptr < firstProps || ptr >= h.globals) return __g('prop-pointer-range', { id: id, count: count, ptr: ptr, firstProps: firstProps, globals: h.globals, below: ptr < firstProps });"],

    ["if (!num || num >= previous) return null;",
     "if (!num || num >= previous) return __g('prop-number-order', { id: id, count: count, num: num, previous: previous, at: at, zero: !num });"],

    ["if (at >= h.globals) return null;",
     "if (at >= h.globals) return __g('prop-table-overrun', { id: id, count: count, at: at, globals: h.globals });"],

    ["if (cls > count || seen[cls] || ++classes > count) return null;",
     "if (cls > count || seen[cls] || classes + 1 > count) return __g('class-list', { cls: cls, count: count, classes: classes, end: end, repeat: !!seen[cls] });"],

    ["if (properties < 64 || namesAt + attributeCount * 2 > h.globals) return null;",
     "if (properties < 64 || namesAt + attributeCount * 2 > h.globals) return __g('property-name-count', { properties: properties, namesAt: namesAt, end: end, globals: h.globals, tooFew: properties < 64 });"],

    ["if (decode(ZRamReader.u16(mem, end + 2)) !== \"name\" ) return null;", null], // placeholder, real anchor below

    ["if (!entry) return null;",
     "if (!entry) return __g('attr-string-undecodable', { bit: bit, packed: packed, scale: scale, himem: h.himem });"],

    ["if (!/^[a-zA-Z_][a-zA-Z_0-9]*$/.test(name)) return null;",
     "if (!/^[a-zA-Z_][a-zA-Z_0-9]*$/.test(name)) return __g('segment-not-identifier', { bit: bit, entry: entry, segment: name, segments: segments });"],

    ["if (Object.prototype.hasOwnProperty.call(bits, name) && bits[name] !== bit) return null;",
     "if (Object.prototype.hasOwnProperty.call(bits, name) && bits[name] !== bit) return __g('name-two-bits', { name: name, bit: bit, already: bits[name], entry: entry });"],

    // Anchored to the following `finally` because a bare `} catch (e) { return
    // null; }` occurs three times in this file.
    ["} catch (e) { return null; }\n        finally { ZRamReader._attributeNamesCache.set(cacheKey, result); }",
     "} catch (e) { return __g('threw', { error: String(e && e.message || e) }); }\n        finally { ZRamReader._attributeNamesCache.set(cacheKey, result); }"]
];

// The "name" check and the required-subset check need their own handling.
const NAME_ANCHOR = ["if (decode(ZRamReader.u16(mem, end + 2)) !== \"name\") return null;",
    "if (decode(ZRamReader.u16(mem, end + 2)) !== \"name\") return __g('first-property-not-name', { decoded: decode(ZRamReader.u16(mem, end + 2)), packed: ZRamReader.u16(mem, end + 2), end: end, himem: h.himem, scale: scale });"];

// D200: the required set is now version-dependent (a different nine for v3), so
// this reads the reader's own `required` variable rather than a hardcoded copy.
// A hardcoded list would have silently reported the wrong missing names for v3.
const REQUIRED_ANCHOR = ["})) return null;",
    "})) return __g('required-subset', { version: h.version, declared: Object.keys(bits).sort(), required: required, missing: required.filter(function (n) { return !Object.prototype.hasOwnProperty.call(bits, n); }) });"];

function instrumentedSource() {
    // Normalised so multi-line anchors match regardless of the checkout's
    // line endings (git converts this tree to CRLF).
    let src = fs.readFileSync(path.join(root, "js", "ZRamReader.js"), "utf8").replace(/\r\n/g, "\n");
    const applied = [];
    const subs = GATES.filter(g => g[1]).concat([NAME_ANCHOR, REQUIRED_ANCHOR]);
    for (const [anchor, replacement] of subs) {
        const n = src.split(anchor).length - 1;
        if (n !== 1) throw new Error("anchor appears " + n + " times, expected 1 -- reader drifted:\n  " + anchor);
        src = src.replace(anchor, replacement);
        applied.push(anchor.slice(0, 40));
    }
    // The gate recorder itself, plus a shim so a recorded gate is not cached.
    src = src.replace("informAttributeNames: (mem) => {",
        "informAttributeNames: (mem) => {\n        var __g = function (gate, detail) { __GATE.gate = gate; __GATE.detail = detail; return null; };");
    return { src, applied };
}

function loadMem(file) {
    let mem;
    vm.runInNewContext(fs.readFileSync(path.join(root, "games", file), "utf8"), {
        processBase64Zcode: encoded => { mem = new Uint8Array(Buffer.from(encoded, "base64")); }
    }, { timeout: 2000 });
    if (mem && Buffer.from(mem.slice(0, 4)).toString() === "FORM") {
        const c = Buffer.from(mem); mem = null;
        for (let at = 12; at + 8 <= c.length;) {
            const size = c.readUInt32BE(at + 4);
            if (c.toString("ascii", at, at + 4) === "ZCOD") { mem = new Uint8Array(c.subarray(at + 8, at + 8 + size)); break; }
            at += 8 + size + (size % 2);
        }
    }
    return mem;
}

const { src, applied } = instrumentedSource();
console.log("instrumented " + applied.length + " rejection gates in js/ZRamReader.js (no product file modified)\n");

const only = process.argv.indexOf("--module");
const files = only > -1 ? [process.argv[only + 1]]
    : fs.readdirSync(path.join(root, "games")).filter(f => /\.(z[1-8]|zblorb)\.js$/i.test(f));

const rows = [];
for (const file of files) {
    let mem;
    try { mem = loadMem(file); } catch (e) { continue; }
    if (!mem) continue;
    const ctx = { __GATE: {} }; vm.createContext(ctx);
    vm.runInContext(src, ctx);
    const R = ctx.ZRamReader;
    let header;
    try { header = R.header(mem); } catch (e) { header = null; }
    if (!header) continue;
    let inform = false;
    try { inform = R.isInformCompiled(mem); } catch (e) {}
    if (!inform) continue;                      // non-Inform is a separate, intended path
    ctx.__GATE = {};
    R._attributeNamesCache = new WeakMap();
    const table = R.informAttributeNames(mem);
    rows.push({ file, version: header.version, declared: !!table,
                gate: table ? null : (ctx.__GATE.gate || "unknown"),
                detail: table ? null : (ctx.__GATE.detail || null),
                names: table ? Object.keys(table.bits).length : 0 });
}

const declared = rows.filter(r => r.declared), fallback = rows.filter(r => !r.declared);
console.log("Inform modules: " + rows.length + "   declaring: " + declared.length + "   fallback: " + fallback.length + "\n");

const byGate = {};
fallback.forEach(r => (byGate[r.gate] = byGate[r.gate] || []).push(r));
console.log("=== fallback modules grouped by the gate that ACTUALLY fired ===");
for (const gate of Object.keys(byGate).sort((a, b) => byGate[b].length - byGate[a].length)) {
    const g = byGate[gate];
    console.log("\n[" + gate + "]  " + g.length + " module(s)");
    g.forEach(r => console.log("   " + r.file.padEnd(24) + " v" + r.version + "  " + JSON.stringify(r.detail)));
}

// ------------------------------------------------- symbol-presence discriminator
if (process.argv.indexOf("--symbols") > -1) {
    // Inform identifiers that cannot plausibly appear in story prose.
    const ATTRS = ["switchable", "openable", "scenery", "workflag", "pluralname",
        "transparent", "concealed", "enterable", "supporter", "talkable",
        "pluralname", "lockable", "clothing", "animate", "edible"];
    const PROPS = ["each_turn", "cant_go", "found_in", "short_name", "react_before",
        "react_after", "when_open", "when_closed", "time_left", "n_to", "s_to",
        "d_to", "u_to", "door_dir", "with_key", "add_to_scope", "list_together",
        "parse_name", "invent", "describe"];
    const ctx2 = {}; vm.createContext(ctx2);
    vm.runInContext(fs.readFileSync(path.join(root, "js", "ZRamReader.js"), "utf8"), ctx2);
    const R2 = ctx2.ZRamReader;

    // Codex, D197 follow-up: this scan used to stop at the first hit per name and
    // report only counts, so it printed "Recoverable ... 5" and listed Enemies and
    // vindaloo -- contradicting the 3/43/228 conclusion D196 cites it for. The
    // clustering that cut 5 to 3 lived in a throwaway shell one-liner. It lives
    // here now: every hit ADDRESS is collected, and the classification is computed
    // and printed by the tracked command.
    const WINDOW = 256;          // bytes; an identifier-names array is contiguous
    const CLUSTER_MIN = 3;       // distinct names inside one window to call it a table

    const scan = (mem, wanted) => {
        const hits = [], len = mem.length;
        // Whole file, every even address. No himem assumption, and no early exit:
        // a name can occur in the table AND in the dictionary or prose, so we need
        // all occurrences to find the dense one.
        for (let a = 0; a + 2 <= len; a += 2) {
            let stop = a, w = 0;
            for (; w < 10 && stop + 2 <= len; w++, stop += 2) if (mem[stop] & 128) break;
            if (w >= 10) continue;
            let s; try { s = R2.decodeZsc(mem, a, w + 1); } catch (e) { continue; }
            if (s && wanted.indexOf(s) > -1) hits.push({ name: s, at: a });
        }
        return hits;
    };

    // The tightest window containing the most DISTINCT names. Overall span is the
    // wrong metric: anchor.z8 spans ~470KB because its names also appear in the
    // dictionary, yet it plainly has a table. Density is what distinguishes a
    // contiguous array from scattered coincidences.
    const densest = (hits) => {
        const sorted = hits.slice().sort((x, y) => x.at - y.at);
        let best = { count: 0, at: null, span: 0, names: [] };
        for (let i = 0; i < sorted.length; i++) {
            const names = new Set(); let j = i, last = sorted[i].at;
            while (j < sorted.length && sorted[j].at - sorted[i].at <= WINDOW) {
                names.add(sorted[j].name); last = sorted[j].at; j++;
            }
            if (names.size > best.count) {
                best = { count: names.size, at: sorted[i].at, span: last - sorted[i].at, names: [...names].sort() };
            }
        }
        return best;
    };

    const subjects = fallback.map(r => r.file);
    // D200 implemented the v3 reader, so these three now DECLARE and have left
    // the fallback set. Codex's requirement: keep "recoverable before D200"
    // visible and distinct from "declaring today", without reclassifying the 43.
    // Scanned alongside the controls so the clustered evidence that predicted
    // them stays reproducible from this command.
    const D200_RECOVERED = ["catseye.z3.js", "gussdeath.z3.js", "moonglow.z3.js"];
    const controls = ["anchor.z8.js", "HugeCave.z8.js", "ztuu.z5.js"].concat(D200_RECOVERED);
    console.log("\n\n=== symbol presence (whole-file scan, prose-proof identifiers) ===");
    console.log("CONTROLS (known to declare a table):");
    const report = [];
    for (const file of controls.concat(["--"], subjects)) {
        if (file === "--") { console.log("\nTHE " + subjects.length + " FALLBACK MODULES:"); continue; }
        let mem; try { mem = loadMem(file); } catch (e) { continue; }
        if (!mem) continue;
        const aHits = scan(mem, ATTRS), pHits = scan(mem, PROPS);
        const aNames = new Set(aHits.map(h => h.name)), pNames = new Set(pHits.map(h => h.name));
        const cluster = densest(aHits);
        const hasTable = cluster.count >= CLUSTER_MIN;
        const verdict = hasTable ? "TABLE PRESENT (clustered)"
            : (aNames.size ? "scattered matches only -> NO TABLE"
                : (pNames.size ? "property names only -> NO attribute table" : "NO SYMBOLS AT ALL"));
        report.push({ file, attrNamesDistinct: aNames.size, propNamesDistinct: pNames.size,
                      clusterDistinct: cluster.count, clusterAt: cluster.at, clusterSpan: cluster.span,
                      clusterNames: cluster.names, hasTable, verdict,
                      attrHits: aHits.map(h => h.name + "@" + h.at) });
        console.log("  " + file.padEnd(24) + " attrNames=" + String(aNames.size).padEnd(3) +
            " densest=" + String(cluster.count).padEnd(3) + " in " + String(cluster.span).padEnd(5) + "B" +
            "  " + verdict);
    }

    const subjectRows = report.filter(r => subjects.indexOf(r.file) > -1);
    const grouped = {};
    subjectRows.forEach(r => (grouped[r.verdict] = (grouped[r.verdict] || 0) + 1));
    console.log("\nSUMMARY of the " + subjects.length + " fallback modules" +
        "  (a table = " + CLUSTER_MIN + "+ distinct names within " + WINDOW + " bytes):");
    Object.keys(grouped).sort((a, b) => grouped[b] - grouped[a])
        .forEach(k => console.log("  " + String(grouped[k]).padStart(3) + "  " + k));

    // The classification D196 cites. Computed and printed here so the command
    // reproduces the documented conclusion instead of contradicting it.
    const recoverable = subjectRows.filter(r => r.hasTable);
    const absent = subjectRows.filter(r => !r.hasTable);
    console.log("\n=== FINAL CLASSIFICATION (D196, as implemented by D200) ===");
    const rec200 = report.filter(r => D200_RECOVERED.indexOf(r.file) > -1);
    const recoveredToday = rec200.filter(r => {
        const row = rows.find(x => x.file === r.file);
        return !!(row && row.declared);
    });
    console.log("  recoverable before D200, DECLARING TODAY: " + recoveredToday.length + " of " + D200_RECOVERED.length);
    rec200.forEach(r => console.log("     " + r.file.padEnd(22) + " v" + ((rows.find(x => x.file === r.file) || {}).version) +
        "  " + r.clusterDistinct + " names in " + r.clusterSpan + "B" +
        "  declaring=" + !!(rows.find(x => x.file === r.file) || {}).declared));
    if (recoverable.length) {
        console.log("  still fallback but clustered (would be new recovery candidates): " + recoverable.length);
        recoverable.forEach(r => console.log("     " + r.file + "  " + r.clusterDistinct + " names in " + r.clusterSpan + "B"));
    } else {
        console.log("  still fallback but clustered (new recovery candidates): 0");
    }
    console.log("  no attribute-name table in the file: " + absent.length);
    console.log("  rejected as coincidence (matched but never clustered): " +
        subjectRows.filter(r => !r.hasTable && r.attrNamesDistinct > 0)
                   .map(r => r.file + "(" + r.attrNamesDistinct + ")").join(", "));
    console.log("  CEILING: " + declared.length + " declaring today + " + recoverable.length +
        " recoverable = " + (declared.length + recoverable.length) + " of " + rows.length + " Inform modules");
    console.log("  controls (must all show a table): " +
        report.filter(r => controls.indexOf(r.file) > -1)
              .map(r => r.file + "=" + r.clusterDistinct + "/" + r.clusterSpan + "B").join("  "));

    try {
        fs.writeFileSync(path.join(root, "tools/screenshots/matrix/d196-symbol-presence.json"), JSON.stringify(report, null, 2));
        console.log("\n(also wrote tools/screenshots/matrix/d196-symbol-presence.json -- local convenience;");
        console.log(" .gitignore excludes tools/screenshots/, so the COMMAND above is the citation)");
    } catch (e) { console.log("\n(could not write the local JSON: " + e.message + ")"); }
}

const outIdx = process.argv.indexOf("--json");
if (outIdx > -1) {
    fs.writeFileSync(path.resolve(process.argv[outIdx + 1]), JSON.stringify({ rows, byGate: Object.fromEntries(Object.entries(byGate).map(([k, v]) => [k, v.map(r => r.file)])) }, null, 2));
    console.log("\nwrote " + process.argv[outIdx + 1]);
}
