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
const fs = require("fs"), path = require("path"), vm = require("vm");
const root = path.resolve(__dirname, "..");

// Each entry: unique anchor in js/ZRamReader.js -> instrumented replacement.
// `__g(gate, detail)` records and returns a sentinel instead of null.
const GATES = [
    ["if (!h || [4, 5, 8].indexOf(h.version) < 0 || !ZRamReader.isInformCompiled(mem)) return null;",
     "if (!h || [4, 5, 8].indexOf(h.version) < 0 || !ZRamReader.isInformCompiled(mem)) return __g('version-gate', { version: h && h.version, inform: ZRamReader.isInformCompiled(mem) });"],

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

    ["if (properties < 64 || namesAt + 96 > h.globals) return null;",
     "if (properties < 64 || namesAt + 96 > h.globals) return __g('property-name-count', { properties: properties, namesAt: namesAt, end: end, globals: h.globals, tooFew: properties < 64 });"],

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

const REQUIRED_ANCHOR = ["})) return null;",
    "})) return __g('required-subset', { declared: Object.keys(bits).sort(), missing: [\"animate\",\"static\",\"scenery\",\"container\",\"open\",\"openable\",\"on\",\"switchable\",\"worn\"].filter(function (n) { return !Object.prototype.hasOwnProperty.call(bits, n); }) });"];

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

const outIdx = process.argv.indexOf("--json");
if (outIdx > -1) {
    fs.writeFileSync(path.resolve(process.argv[outIdx + 1]), JSON.stringify({ rows, byGate: Object.fromEntries(Object.entries(byGate).map(([k, v]) => [k, v.map(r => r.file)])) }, null, 2));
    console.log("\nwrote " + process.argv[outIdx + 1]);
}
