// D193 verification: slash-separated attribute-name aliases.
//
// Two things are proven here, and they are different claims.
//
//   1. ADDITIVE. Every module that already decoded a declaration table before
//      the alias change decodes the IDENTICAL bit map after it. Recovering 20
//      modules is worthless if it perturbs the 205 that already worked, and a
//      catalog pass/fail count cannot detect that -- both runs were 323/0.
//
//   2. VALIDATION STILL BITES. The relaxation is exactly "split on /", not
//      "accept more tables". Mutation cases drive real module memory through
//      the real decoder with one name rewritten, and assert the table is
//      rejected for an empty segment or a name claiming two bits, while an
//      OPTIONAL alias may be dropped without losing the table.
//
// Mutation works by stubbing ZRamReader.decodeZsc -- the function the packed
// attribute-name reader actually calls -- so cases travel the production path
// rather than a reimplementation of it. Per codex (docs/ai-review.md:94-98):
// removing an optional alias must PASS; removing a required name or leaving an
// empty segment must REJECT.
//
// Usage: node tools/attribute-alias-catalog.js [--baseline <catalog.json>]
const fs = require("fs"), path = require("path"), vm = require("vm");
const root = path.resolve(__dirname, "..");

let pass = 0, fail = 0;
const assert = (ok, what) => { if (ok) { pass++; } else { fail++; console.log("FAIL: " + what); } };

function loadMem(file) {
    let mem;
    vm.runInNewContext(fs.readFileSync(path.join(root, "games", file), "utf8"), {
        processBase64Zcode: encoded => { mem = new Uint8Array(Buffer.from(encoded, "base64")); }
    }, { timeout: 1000 });
    if (Buffer.from(mem.slice(0, 4)).toString() === "FORM") {
        const container = Buffer.from(mem);
        mem = null;
        for (let at = 12; at + 8 <= container.length;) {
            const size = container.readUInt32BE(at + 4);
            if (container.toString("ascii", at, at + 4) === "ZCOD") { mem = new Uint8Array(container.subarray(at + 8, at + 8 + size)); break; }
            at += 8 + size + (size % 2);
        }
    }
    return mem;
}

function freshReader() {
    const c = {}; vm.createContext(c);
    ["ZRamReader", "AttributeSchema"].forEach(n => vm.runInContext(fs.readFileSync(path.join(root, "js", n + ".js"), "utf8"), c));
    return c.ZRamReader;
}

// Decode `file`'s table with `rewrite` applied to every decoded string.
function decodeWith(file, rewrite) {
    const R = freshReader(), mem = loadMem(file);
    if (rewrite) {
        const real = R.decodeZsc.bind(R);
        R.decodeZsc = function (m, a, w) { return rewrite(real(m, a, w)); };
    }
    R._attributeNamesCache = new WeakMap();
    return R.informAttributeNames(mem);
}

// ---------------------------------------------------------------- 1. additive
const argIdx = process.argv.indexOf("--baseline");
const baselinePath = argIdx > -1 ? process.argv[argIdx + 1] : null;
const current = JSON.parse(fs.readFileSync(path.join(root, "tools/screenshots/matrix/d186-attribute-catalog.json"), "utf8"));

if (baselinePath && fs.existsSync(baselinePath)) {
    const before = JSON.parse(fs.readFileSync(baselinePath, "utf8"));
    const byFile = m => Object.fromEntries(m.modules.map(x => [x.file, x]));
    const b = byFile(before), a = byFile(current);
    const wasDeclared = Object.keys(b).filter(f => b[f].table);
    let perturbed = [];
    for (const f of wasDeclared) {
        if (!a[f] || !a[f].table) { perturbed.push(f + ": table LOST"); continue; }
        if (JSON.stringify(b[f].table.bits) !== JSON.stringify(a[f].table.bits)) perturbed.push(f + ": bits changed");
    }
    assert(perturbed.length === 0, "D193 additive: " + perturbed.length + " previously-decoded module(s) perturbed: " + perturbed.slice(0, 6).join("; "));
    const gained = Object.keys(a).filter(f => a[f].table && (!b[f] || !b[f].table));
    console.log("recovered " + gained.length + " module(s): " + gained.join(", "));
    assert(gained.length > 0, "D193: the change recovers at least one module");
    // Every recovered module must genuinely contain an alias -- otherwise the
    // gain came from somewhere other than the stated cause.
    for (const f of gained) {
        const bits = a[f].table.bits, byBit = {};
        Object.keys(bits).forEach(n => (byBit[bits[n]] = byBit[bits[n]] || []).push(n));
        const shared = Object.keys(byBit).filter(k => byBit[k].length > 1);
        assert(shared.length > 0, "D193 cause: " + f + " recovered but declares no shared-bit alias");
    }
    console.log("previously declared: " + wasDeclared.length + " -> now: " + Object.keys(a).filter(f => a[f].table).length);
} else {
    console.log("(no --baseline given; skipping the additive comparison)");
}

// ------------------------------------------------------- 2. mutation cases
// chix.z5.js is a measured real alias carrier: door and nolook share one bit.
const SUBJECT = "chix.z5.js";
if (!fs.existsSync(path.join(root, "games", SUBJECT))) {
    console.log("SKIP mutation cases: " + SUBJECT + " absent");
} else {
    const plain = decodeWith(SUBJECT, null);
    assert(!!plain, "D193 positive: " + SUBJECT + " decodes a table");
    if (plain) {
        assert(plain.bits.door != null && plain.bits.door === plain.bits.nolook,
            "D193 positive: door and nolook share one bit (alias accepted, several names per bit)");
        // An OPTIONAL alias may be dropped: the required subset is intact.
        const dropped = decodeWith(SUBJECT, s => (s === "door/nolook" ? "door" : s));
        assert(!!dropped && dropped.bits.door === plain.bits.door && dropped.bits.nolook == null,
            "D193 positive: dropping the OPTIONAL alias keeps the table (required names intact)");
        // A REQUIRED name removed must reject the whole table.
        const requiredGone = decodeWith(SUBJECT, s => (s === "static" ? "renamedflag" : s));
        assert(requiredGone === null, "D193 negative: a missing REQUIRED name rejects the whole table");
        // An empty segment means the string is not a name list.
        assert(decodeWith(SUBJECT, s => (s === "door/nolook" ? "door/" : s)) === null,
            "D193 negative: a trailing empty segment rejects the whole table");
        assert(decodeWith(SUBJECT, s => (s === "door/nolook" ? "/nolook" : s)) === null,
            "D193 negative: a leading empty segment rejects the whole table");
        assert(decodeWith(SUBJECT, s => (s === "door/nolook" ? "door//nolook" : s)) === null,
            "D193 negative: a doubled separator rejects the whole table");
        // One name may not claim two different bit positions.
        assert(decodeWith(SUBJECT, s => (s === "edible" ? "door" : s)) === null,
            "D193 negative: one name at two different bits rejects the whole table");
        // A non-identifier segment is still refused.
        assert(decodeWith(SUBJECT, s => (s === "door/nolook" ? "door/no look" : s)) === null,
            "D193 negative: a non-identifier segment rejects the whole table");
        assert(decodeWith(SUBJECT, s => (s === "door/nolook" ? "door/9lives" : s)) === null,
            "D193 negative: a segment starting with a digit rejects the whole table");
    }
}

console.log("\n" + pass + " PASS / " + fail + " FAIL");
process.exitCode = fail ? 1 : 0;
