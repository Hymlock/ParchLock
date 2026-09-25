/* D38 P2 identifier-names + Map_Storage static probe — read-only. No product files.
 * Finds the I6 identifier-names table (common props, indiv props, attributes)
 * and hunts Map_Storage-like arrays of object pointers.
 * Usage: node harness/_d38_p2_ids.js [story.js ...]
 */
const fs = require("fs");
const path = require("path");

function loadGlulx(p) {
    const text = fs.readFileSync(p, "utf8");
    const m = text.match(/processBase64Zcode\s*\(\s*['"]([\s\S]*?)['"]\s*\)/);
    if (!m) throw new Error("no base64 in " + p);
    const buf = Buffer.from(m[1].replace(/\s+/g, ""), "base64");
    if (buf[0] === 0x47 && buf[1] === 0x6c && buf[2] === 0x75 && buf[3] === 0x6c) return buf;
    if (buf.toString("ascii", 0, 4) !== "FORM") throw new Error("not glulx/blorb");
    let off = 12;
    while (off + 8 <= buf.length) {
        const id = buf.toString("ascii", off, off + 4);
        const size = buf.readUInt32BE(off + 4);
        const data = buf.slice(off + 8, off + 8 + size);
        if (id === "GLUL") return data;
        off += 8 + size + (size & 1);
    }
    throw new Error("no GLUL chunk");
}
function u32(buf, a) {
    if (a < 0 || a + 4 > buf.length) return 0;
    return buf.readUInt32BE(a) >>> 0;
}
function decodeE0(buf, ptr, maxLen) {
    if (buf[ptr] !== 0xe0) return null;
    let s = "";
    const lim = Math.min(buf.length, ptr + 1 + (maxLen || 80));
    for (let i = ptr + 1; i < lim; i++) {
        const c = buf[i];
        if (c === 0) break;
        s += c >= 32 && c < 127 ? String.fromCharCode(c) : "?";
    }
    return s;
}
function decodeE1(buf, ptr, tableAddr, maxChars) {
    if (buf[ptr] !== 0xe1 || !tableAddr) return null;
    const root = u32(buf, tableAddr + 8);
    if (!root || root >= buf.length) return null;
    let addr = ptr + 1, bitnum = 0, node = root, s = "";
    const cap = maxChars || 48;
    for (let step = 0; step < 80000 && s.length < cap; step++) {
        if (node >= buf.length) return s;
        const t = buf[node];
        if (t === 0) {
            if (addr >= buf.length) return s;
            const bit = (buf[addr] >> bitnum) & 1;
            node = u32(buf, node + 1 + 4 * bit);
            bitnum++;
            if (bitnum === 8) { bitnum = 0; addr++; }
            continue;
        }
        if (t === 1) return s;
        if (t === 2) {
            const c = buf[node + 1];
            s += c >= 32 && c < 127 ? String.fromCharCode(c) : (c === 10 ? " " : "?");
            node = root; continue;
        }
        if (t === 3) {
            let i = node + 1;
            while (i < buf.length && buf[i] && s.length < cap) {
                const c = buf[i++];
                s += c >= 32 && c < 127 ? String.fromCharCode(c) : "?";
            }
            node = root; continue;
        }
        if (t === 4) {
            const cp = u32(buf, node + 1);
            s += cp >= 32 && cp < 127 ? String.fromCharCode(cp) : "?";
            node = root; continue;
        }
        if (t === 5) {
            let i = node + 1;
            while (s.length < cap) {
                const cp = u32(buf, i);
                if (!cp) break;
                s += cp >= 32 && cp < 127 ? String.fromCharCode(cp) : "?";
                i += 4;
            }
            node = root; continue;
        }
        s += "*"; node = root;
    }
    return s;
}
function decodeStr(buf, ptr, decoding) {
    if (!ptr || ptr >= buf.length) return null;
    const t = buf[ptr];
    if (t === 0xe0) return decodeE0(buf, ptr, 48);
    if (t === 0xe1) return decodeE1(buf, ptr, decoding, 48);
    return null;
}
function looksLikeNameList(buf, addr, count, decoding) {
    if (!addr || count < 4 || count > 8000) return 0;
    if (addr + count * 4 > buf.length) return 0;
    let good = 0;
    const sample = [];
    const n = Math.min(count, 12);
    for (let i = 0; i < n; i++) {
        const p = u32(buf, addr + i * 4);
        const s = decodeStr(buf, p, decoding);
        if (s && s.length >= 1 && s.length < 40 && /[A-Za-z_]/.test(s)) {
            good++;
            sample.push(s);
        }
    }
    return good >= Math.max(3, Math.floor(n * 0.5)) ? { good, sample } : 0;
}

function findIdTable(buf, decoding, ramstart) {
    const hits = [];
    const end = buf.length - 48;
    for (let a = 36; a < end; a += 4) {
        const c0 = u32(buf, a + 4), a0 = u32(buf, a);
        const c1 = u32(buf, a + 12), a1 = u32(buf, a + 8);
        const c2 = u32(buf, a + 20), a2 = u32(buf, a + 16);
        const c3 = u32(buf, a + 28), a3 = u32(buf, a + 24);
        const c4 = u32(buf, a + 36), a4 = u32(buf, a + 32);
        if (c0 < 8 || c0 > 500) continue;
        if (c2 < 8 || c2 > 80) continue;
        if (c1 < 8 || c1 > 8000) continue;
        if (c3 < 8 || c3 > 8000) continue;
        const p0 = looksLikeNameList(buf, a0, c0, decoding);
        const p2 = looksLikeNameList(buf, a2, c2, decoding);
        if (!p0 || !p2) continue;
        const p1 = looksLikeNameList(buf, a1, Math.min(c1, 40), decoding);
        const p3 = looksLikeNameList(buf, a3, Math.min(c3, 40), decoding);
        hits.push({
            tableAddr: a,
            region: a >= ramstart ? "RAM" : "ROM",
            common: { addr: a0, count: c0, sample: p0.sample },
            indiv: { addr: a1, count: c1, sample: p1 ? p1.sample : [] },
            attrs: { addr: a2, count: c2, sample: p2.sample },
            actions: { addr: a3, count: c3, sample: p3 ? p3.sample : [] },
            arrays: { addr: a4, count: c4 }
        });
        if (hits.length >= 6) break;
    }
    return hits;
}

function decodeAllNames(buf, addr, count, decoding) {
    const out = [];
    for (let i = 0; i < count && i < 400; i++) {
        const p = u32(buf, addr + i * 4);
        out.push(decodeStr(buf, p, decoding) || "");
    }
    return out;
}

function summarize(p) {
    const buf = loadGlulx(p);
    const ramstart = u32(buf, 8);
    const decoding = u32(buf, 28);
    const tables = findIdTable(buf, decoding, ramstart);
    const best = tables[0] || null;
    let common = [], attrs = [], indiv = [];
    if (best) {
        common = decodeAllNames(buf, best.common.addr, best.common.count, decoding);
        attrs = decodeAllNames(buf, best.attrs.addr, best.attrs.count, decoding);
        indiv = decodeAllNames(buf, best.indiv.addr, Math.min(best.indiv.count, 80), decoding);
    }
    const interestingCommon = [];
    common.forEach((n, i) => {
        if (/name|short|print|door|map|n_to|s_to|e_to|w_to|found_in|direction|article|list|plural|add_to|vector|kd_|room|open|container/i.test(n)) {
            interestingCommon.push({ id: i + 1, name: n });
        }
    });
    const interestingIndiv = [];
    indiv.forEach((n, i) => {
        if (/door|map|n_to|s_to|direction|open|container|room_index|found_in/i.test(n)) {
            interestingIndiv.push({ id: 256 + i, name: n });
        }
    });
    return {
        file: path.basename(p),
        bytes: buf.length,
        ramstart,
        decoding,
        idTableHits: tables.length,
        idTable: best,
        attrNames: attrs.map((n, i) => ({ bit: i, name: n })),
        interestingCommon,
        interestingIndiv,
        commonHead: common.slice(0, 40).map((n, i) => ({ id: i + 1, name: n })),
        indivHead: indiv.slice(0, 40).map((n, i) => ({ id: 256 + i, name: n }))
    };
}

const stories = process.argv.slice(2).length
    ? process.argv.slice(2)
    : ["games/CounterfeitMonkey.gblorb.js", "games/Alabaster.gblorb.js", "games/CosmoServe.gblorb.js"];
const out = stories.map((p) => {
    try { return summarize(p); }
    catch (e) { return { file: p, error: String(e && e.stack || e) }; }
});
const outPath = path.join(__dirname, "_d38_p2_ids.out.json");
fs.writeFileSync(outPath, JSON.stringify(out, null, 2));
console.log("wrote", outPath);
out.forEach((s) => {
    console.log("\n==", s.file, s.error || "");
    if (s.error) return;
    console.log("idTableHits", s.idTableHits, "table", s.idTable && s.idTable.tableAddr, s.idTable && s.idTable.region);
    console.log("attrs", (s.attrNames || []).map((a) => a.bit + ":" + a.name).join(", "));
    console.log("interestingCommon", s.interestingCommon);
    console.log("interestingIndiv", s.interestingIndiv);
    console.log("commonHead", s.commonHead);
});
