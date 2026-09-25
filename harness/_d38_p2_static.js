/* D38 P2 research probe — read-only Glulx object-model decoder.
 * Does not touch product files. No GlulxRamProvider.
 *
 * Hypothesis (Zarf Glulx Inform Technical Reference, compiler convention
 * not VM spec): Inform objects are 0x70-typed records:
 *   byte 0x70
 *   byte[NUM_ATTR_BYTES] attributes  (default 7; length is 4i+3)
 *   long next, name, props, parent, sibling, child
 *   size = 1 + NUM_ATTR_BYTES + 24
 */
const fs = require("fs");
const path = require("path");

function loadGlulx(p) {
    const text = fs.readFileSync(p, "utf8");
    const m = text.match(/processBase64Zcode\s*\(\s*['"]([\s\S]*?)['"]\s*\)/);
    if (!m) throw new Error("no base64 in " + p);
    const buf = Buffer.from(m[1].replace(/\s+/g, ""), "base64");
    if (buf[0] === 0x47 && buf[1] === 0x6c && buf[2] === 0x75 && buf[3] === 0x6c) return buf;
    // Blorb FORM/IFRS
    if (buf.toString("ascii", 0, 4) !== "FORM") throw new Error("not glulx/blorb, first=" + buf[0]);
    let off = 12;
    while (off + 8 <= buf.length) {
        const id = buf.toString("ascii", off, off + 4);
        const size = buf.readUInt32BE(off + 4);
        const data = buf.slice(off + 8, off + 8 + size);
        if (id === "GLUL") return data;
        off += 8 + size + (size & 1);
    }
    throw new Error("no GLUL chunk in " + p);
}

function u32(buf, a) {
    if (a < 0 || a + 4 > buf.length) return 0;
    return buf.readUInt32BE(a) >>> 0;
}
function u16(buf, a) {
    if (a < 0 || a + 2 > buf.length) return 0;
    return buf.readUInt16BE(a);
}

function header(buf) {
    return {
        magic: buf.toString("ascii", 0, 4),
        version: u32(buf, 4),
        ramstart: u32(buf, 8),
        extstart: u32(buf, 12),
        endmem: u32(buf, 16),
        stacksize: u32(buf, 20),
        startfunc: u32(buf, 24),
        decoding: u32(buf, 28),
        checksum: u32(buf, 32)
    };
}

function infoStamp(buf) {
    // Immediately after the 36-byte header: 'Info' + layout + versions
    const tag = buf.toString("ascii", 36, 40);
    if (tag !== "Info") return { tag };
    return {
        tag,
        layout: u32(buf, 40),
        informVer: buf.toString("ascii", 44, 48),
        glulxBack: buf.toString("ascii", 48, 52),
        release: u16(buf, 52),
        serial: buf.toString("ascii", 54, 60)
    };
}

function looksLikeStringPtr(buf, ptr) {
    if (ptr < 36 || ptr >= buf.length) return false;
    const t = buf[ptr];
    return t === 0xe0 || t === 0xe1 || t === 0xe2;
}

// Glulx spec 1.6.1: E0 = uncompressed Latin-1, E1 = Huffman-compressed, E2 = Unicode.
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
    if (buf[ptr] !== 0xe1 || !tableAddr) return "(E1)";
    const root = u32(buf, tableAddr + 8);
    if (!root || root >= buf.length) return "(E1-bad-root)";
    let addr = ptr + 1;
    let bitnum = 0;
    let node = root;
    let s = "";
    const cap = maxChars || 80;
    for (let step = 0; step < 200000 && s.length < cap; step++) {
        if (node >= buf.length) return s + "(bad-node)";
        const nodetype = buf[node];
        if (nodetype === 0) {
            if (addr >= buf.length) return s + "(eof)";
            const bit = (buf[addr] >> bitnum) & 1;
            node = u32(buf, node + 1 + 4 * bit);
            bitnum++;
            if (bitnum === 8) { bitnum = 0; addr++; }
            continue;
        }
        if (nodetype === 1) return s;
        if (nodetype === 2) {
            const c = buf[node + 1];
            s += c >= 32 && c < 127 ? String.fromCharCode(c) : (c === 10 ? " " : "?");
            node = root;
            continue;
        }
        if (nodetype === 3) {
            let i = node + 1;
            while (i < buf.length && buf[i] && s.length < cap) {
                const c = buf[i++];
                s += c >= 32 && c < 127 ? String.fromCharCode(c) : "?";
            }
            node = root;
            continue;
        }
        if (nodetype === 4) {
            const cp = u32(buf, node + 1);
            s += cp >= 32 && cp < 127 ? String.fromCharCode(cp) : "?";
            node = root;
            continue;
        }
        if (nodetype === 5) {
            let i = node + 1;
            while (i + 4 <= buf.length && s.length < cap) {
                const cp = u32(buf, i);
                if (!cp) break;
                s += cp >= 32 && cp < 127 ? String.fromCharCode(cp) : "?";
                i += 4;
            }
            node = root;
            continue;
        }
        // 8/9 indirect references — skip marker, resume at root
        s += "*";
        node = root;
    }
    return s;
}

function decodeName(buf, ptr, tableAddr) {
    if (!ptr || ptr >= buf.length) return null;
    const t = buf[ptr];
    if (t === 0xe0) return decodeE0(buf, ptr, 80);
    if (t === 0xe1) return decodeE1(buf, ptr, tableAddr, 80);
    if (t === 0xe2) {
        let s = "";
        for (let i = ptr + 4; i + 4 <= buf.length && s.length < 80; i += 4) {
            const cp = u32(buf, i);
            if (cp === 0) break;
            s += cp < 128 ? String.fromCharCode(cp) : "?";
        }
        return s;
    }
    return null;
}

function looksLikePropTable(buf, ptr) {
    if (ptr < 36 || ptr + 4 > buf.length) return false;
    const n = u32(buf, ptr);
    if (n < 0 || n > 400) return false;
    if (ptr + 4 + n * 10 > buf.length) return false;
    // first few property IDs should be sorted, 16-bit, typically 1..512+
    let prev = -1;
    const lim = Math.min(n, 6);
    for (let i = 0; i < lim; i++) {
        const id = u16(buf, ptr + 4 + i * 10);
        const len = u16(buf, ptr + 6 + i * 10);
        const data = u32(buf, ptr + 8 + i * 10);
        if (id < prev) return false;
        if (len > 4096) return false;
        if (data !== 0 && data >= buf.length) return false;
        prev = id;
    }
    return true;
}

function tryWalkChain(buf, start, attrBytes, tableAddr) {
    const size = 1 + attrBytes + 24;
    const nameOff = 1 + attrBytes + 4;
    const propsOff = 1 + attrBytes + 8;
    const nextOff = 1 + attrBytes;
    const seen = new Set();
    const objs = [];
    let addr = start;
    for (let n = 0; n < 20000; n++) {
        if (addr < 36 || addr + size > buf.length) break;
        if (buf[addr] !== 0x70) break;
        if (seen.has(addr)) break;
        seen.add(addr);
        const next = u32(buf, addr + nextOff);
        const namePtr = u32(buf, addr + nameOff);
        const props = u32(buf, addr + propsOff);
        const parent = u32(buf, addr + propsOff + 4);
        const sibling = u32(buf, addr + propsOff + 8);
        const child = u32(buf, addr + propsOff + 12);
        if (!looksLikeStringPtr(buf, namePtr) && namePtr !== 0) break;
        if (!looksLikePropTable(buf, props) && props !== 0) {
            // I7 sometimes has empty/odd tables; allow if name is a real string
            if (!looksLikeStringPtr(buf, namePtr)) break;
        }
        objs.push({
            addr,
            next,
            namePtr,
            props,
            parent,
            sibling,
            child,
            name: decodeName(buf, namePtr, tableAddr)
        });
        if (next === 0) break;
        // sequential compiler layout is the strong signal
        if (next !== addr + size && objs.length < 3) {
            // first few must be sequential or we likely misaligned
            if (buf[next] !== 0x70) break;
        }
        addr = next;
    }
    return objs;
}

function findObjectTable(buf, h) {
    const attrCandidates = [7, 11, 15, 3, 19];
    const ranges = [
        [h.ramstart, Math.min(h.extstart || buf.length, buf.length)],
        [36, Math.min(h.ramstart, buf.length)]
    ];
    const hits = [];
    for (const attrBytes of attrCandidates) {
        const size = 1 + attrBytes + 24;
        for (const [lo, hi] of ranges) {
            const limit = Math.min(hi, buf.length) - size;
            for (let addr = lo; addr < limit; addr++) {
                if (buf[addr] !== 0x70) continue;
                const namePtr = u32(buf, addr + 1 + attrBytes + 4);
                const next = u32(buf, addr + 1 + attrBytes);
                if (!looksLikeStringPtr(buf, namePtr)) continue;
                if (next !== 0 && next !== addr + size && buf[next] !== 0x70) continue;
                const chain = tryWalkChain(buf, addr, attrBytes, h.decoding);
                if (chain.length >= 8) {
                    hits.push({
                        attrBytes,
                        size,
                        start: addr,
                        count: chain.length,
                        sequential: chain.filter((o, i) => i === 0 || o.addr === chain[i - 1].addr + size).length,
                        named: chain.filter((o) => o.name && o.name !== "(compressed)").length,
                        sample: chain.slice(0, 12).map((o) => ({
                            addr: o.addr,
                            name: o.name,
                            parent: o.parent,
                            child: o.child
                        })),
                        region: addr >= h.ramstart ? "RAM" : "ROM"
                    });
                    addr += chain.length * size - 1;
                }
            }
        }
    }
    hits.sort((a, b) => b.count - a.count);
    return hits;
}

function scanDict(buf) {
    // type 0x60 dict words. Look for a long count then 0x60.
    // Default DICT_WORD_SIZE=9 => entry = 1+9+6 = 16 bytes, plus 4-byte count.
    const hits = [];
    const end = Math.min(buf.length - 32, 8 * 1024 * 1024);
    for (let addr = 36; addr < end; addr += 4) {
        const n = u32(buf, addr);
        if (n < 50 || n > 20000) continue;
        if (buf[addr + 4] !== 0x60) continue;
        // probe a few entries
        let ok = 0;
        const entryGuesses = [16, 12, 20, 24, 40];
        for (const es of entryGuesses) {
            let good = 0;
            for (let i = 0; i < Math.min(n, 8); i++) {
                const e = addr + 4 + i * es;
                if (e >= buf.length || buf[e] !== 0x60) break;
                good++;
            }
            if (good >= 6) {
                const words = [];
                for (let i = 0; i < Math.min(n, 12); i++) {
                    const e = addr + 4 + i * es;
                    let s = "";
                    for (let k = 1; k < es - 6 && k <= 12; k++) {
                        const c = buf[e + k];
                        if (c === 0) break;
                        if (c >= 32 && c < 127) s += String.fromCharCode(c);
                    }
                    words.push(s);
                }
                hits.push({ addr, count: n, entrySize: es, sample: words });
                break;
            }
        }
        if (hits.length >= 3) break;
    }
    return hits;
}

function hexdump(buf, addr, n) {
    const out = [];
    for (let i = 0; i < n && addr + i < buf.length; i++) {
        out.push(buf[addr + i].toString(16).padStart(2, "0"));
    }
    return out.join(" ");
}

function summarizeStory(p) {
    const buf = loadGlulx(p);
    const h = header(buf);
    const info = infoStamp(buf);
    const tables = findObjectTable(buf, h);
    const best = tables[0] || null;
    const dict = scanDict(buf);
    const chain = best ? tryWalkChain(buf, best.start, best.attrBytes, h.decoding) : [];
    const dumps = chain.slice(0, 6).map((o) => ({
        addr: o.addr,
        objHex: hexdump(buf, o.addr, 32),
        namePtr: o.namePtr,
        nameType: o.namePtr < buf.length ? buf[o.namePtr] : null,
        nameHex: o.namePtr ? hexdump(buf, o.namePtr, 16) : null,
        props: o.props,
        propCount: o.props ? u32(buf, o.props) : null,
        parent: o.parent,
        child: o.child,
        decoded: o.name
    }));
    const parented = chain.filter((o) => o.parent !== 0).length;
    const childed = chain.filter((o) => o.child !== 0).length;
    const treeOk = chain.filter((o) => o.child && chain.some((c) => c.addr === o.child && c.parent === o.addr)).length;
    return {
        file: path.basename(p),
        bytes: buf.length,
        header: h,
        info,
        objectTableHits: tables.slice(0, 2).map((t) => ({
            attrBytes: t.attrBytes,
            size: t.size,
            start: t.start,
            count: t.count,
            sequential: t.sequential,
            region: t.region
        })),
        parentedInStaticImage: parented,
        childed,
        treeOkChildParentMatch: treeOk,
        firstDumps: dumps,
        firstNames: chain.slice(0, 30).map((o) => o.name),
        playerish: chain.filter((o) => /player|yourself|self object|cretin|protagonist/i.test(o.name || "")).map((o) => ({
            addr: o.addr, name: o.name, parent: o.parent, child: o.child
        })),
        compassKids: (() => {
            const compass = chain.find((o) => o.name === "compass");
            if (!compass) return [];
            const kids = [];
            let c = compass.child;
            const byAddr = new Map(chain.map((o) => [o.addr, o]));
            for (let i = 0; i < 20 && c; i++) {
                const o = byAddr.get(c);
                kids.push({ addr: c, name: o ? o.name : null, parent: o ? o.parent : null });
                c = o ? o.sibling : 0;
            }
            return kids;
        })(),
        instanceSample: chain.filter((o) => o.name && !/^(K\d+_|\(|Class|Object|Routine|String|VPH|compass)/.test(o.name)).slice(0, 25).map((o) => o.name),
        dictHits: dict.slice(0, 2)
    };
}

const stories = process.argv.slice(2).length
    ? process.argv.slice(2)
    : [
          "games/CounterfeitMonkey.gblorb.js",
          "games/Alabaster.gblorb.js",
          "games/Grooverland.gblorb.js"
      ];

const out = stories.map((p) => {
    try {
        return summarizeStory(p);
    } catch (e) {
        return { file: p, error: String(e && e.stack || e) };
    }
});
console.log(JSON.stringify(out, null, 2));
