/* D34 Phase A deep probe — read-only. Does not touch GrammarProvider/ZRamReader. */
const fs = require("fs");
const path = require("path");
const vm = require("vm");

const zrSrc = fs.readFileSync(path.join("js", "ZRamReader.js"), "utf8");
const ctx = { console, ZRamReader: undefined };
vm.runInNewContext(zrSrc, ctx);
const ZR = ctx.ZRamReader;

function loadStory(p) {
    const text = fs.readFileSync(p);
    if (p.endsWith(".js")) {
        const s = text.toString("utf8");
        const m = s.match(/processBase64Zcode\s*\(\s*['"]([\s\S]*?)['"]\s*\)/);
        if (!m) throw new Error("no base64 in " + p);
        return extractZcode(Buffer.from(m[1].replace(/\s+/g, ""), "base64"));
    }
    return extractZcode(text);
}
function extractZcode(buf) {
    if (buf[0] >= 1 && buf[0] <= 8) return buf;
    const str = buf.toString("latin1");
    const zcod = str.indexOf("ZCOD");
    if (zcod >= 0) {
        const len = buf.readUInt32BE(zcod + 4);
        return buf.slice(zcod + 8, zcod + 8 + len);
    }
    throw new Error("not zcode/blorb");
}

const ELEM = ["noun","held","multi","multiheld","multiexcept","multiinside","creature","special","number","topic"];
const TT = { 0:"ILLEGAL",1:"ELEM",2:"PREP",3:"ROUTINE_FILTER",4:"ATTR_FILTER",5:"SCOPE",6:"GPR",15:"ENDIT" };

function parseDictFull(mem) {
    const h = ZR.header(mem);
    let addr = h.dict;
    const nsep = ZR.u8(mem, addr);
    addr += 1 + nsep;
    const entryLen = ZR.u8(mem, addr);
    const nentries = ZR.u16(mem, addr + 1);
    addr += 3;
    const textBytes = h.version <= 3 ? 4 : 6;
    const dataBytes = entryLen - textBytes;
    const entries = [];
    const byText = {};
    for (let i = 0; i < nentries; i++) {
        const eaddr = addr + i * entryLen;
        const text = ZR.decodeZsc(mem, eaddr, textBytes / 2).toLowerCase().trim();
        const data = [];
        for (let d = 0; d < dataBytes; d++) data.push(ZR.u8(mem, eaddr + textBytes + d));
        const e = { text, eaddr, data, flags: data[0] || 0 };
        entries.push(e);
        if (text) byText[text] = e;
    }
    return { h, entryLen, nentries, textBytes, dataBytes, entries, byText };
}

function tryGV2(mem, gaddr, dictByAddr) {
    const nlines = ZR.u8(mem, gaddr);
    if (nlines < 1 || nlines > 32) return null;
    let p = gaddr + 1;
    const lines = [];
    for (let li = 0; li < nlines; li++) {
        if (p + 3 > mem.length) return null;
        const actw = ZR.u16(mem, p); p += 2;
        const action = actw & 0x03ff;
        const reverse = !!(actw & 0x0400);
        const extra = actw >> 11;
        const tokens = [];
        let guard = 0;
        while (guard++ < 16) {
            if (p >= mem.length) return null;
            const tb = ZR.u8(mem, p); p += 1;
            if (tb === 15) break;
            const ttype = tb & 0x0f;
            if (ttype === 0 || ttype > 6) return null;
            if (p + 2 > mem.length) return null;
            const tdata = ZR.u16(mem, p); p += 2;
            tokens.push({ ttype, tname: TT[ttype], tdata });
        }
        if (guard >= 16) return null;
        lines.push({ action, reverse, extra, tokens });
    }
    return { version: 2, nlines, lines, end: p };
}

function tryGV1(mem, gaddr) {
    const nlines = ZR.u8(mem, gaddr);
    if (nlines < 1 || nlines > 32) return null;
    let p = gaddr + 1;
    const lines = [];
    for (let li = 0; li < nlines; li++) {
        if (p + 8 > mem.length) return null;
        const params = ZR.u8(mem, p);
        if (params > 6) return null;
        const toks = [];
        for (let t = 0; t < 6; t++) toks.push(ZR.u8(mem, p + 1 + t));
        const action = ZR.u8(mem, p + 7);
        p += 8;
        lines.push({ params, toks, action });
    }
    return { version: 1, nlines, lines, end: p };
}

function grammarHeaderLook(mem, h) {
    const sm = h.staticMem;
    const w0 = ZR.u16(mem, sm);
    const w1 = ZR.u16(mem, sm + 2);
    const w2 = ZR.u16(mem, sm + 4);
    // If w0 looks like a count (Glulx-style) vs first grammar addr
    return {
        staticMem: sm,
        w0, w1, w2,
        w0LooksAddr: w0 > sm && w0 < mem.length,
        w1LooksAddr: w1 > sm && w1 < mem.length,
        nlinesAtW0: w0 && w0 < mem.length ? ZR.u8(mem, w0) : null,
        nlinesAtW1: w1 && w1 < mem.length ? ZR.u8(mem, w1) : null
    };
}

function decode(label, p) {
    const mem = loadStory(p);
    const dict = parseDictFull(mem);
    const h = dict.h;
    const serial = String.fromCharCode(...[18,19,20,21,22,23].map(i => mem[i] || 32)).replace(/[^\x20-\x7e]/g, "?");
    const dictByAddr = {};
    dict.entries.forEach(e => { dictByAddr[e.eaddr] = e; });
    const verbs = dict.entries.filter(e => e.flags & 0x01);
    const gp = ZR.parseDictionary(mem);

    const hdr = grammarHeaderLook(mem, h);

    let gv2 = 0, gv1 = 0, fail = 0;
    let usedIdx255 = 0, usedIdxRaw = 0;
    const tokenHist = {};
    const attrFilters = [];
    const routineFilters = [];
    const samples = [];
    let nounish = 0, heldish = 0, creatureish = 0, intransitive = 0, prepOnly = 0;
    let objectIdLike = 0;
    const objCount = ZR.objectCount(mem, h);

    function noteTokens(g) {
        if (g.version !== 2) return;
        g.lines.forEach(ln => {
            if (!ln.tokens.length) intransitive++;
            let hasNounish = false, hasPrep = false, onlyPrep = true;
            ln.tokens.forEach(t => {
                const key = t.tname + (t.ttype === 1 ? ":" + (ELEM[t.tdata] || t.tdata) : t.ttype === 4 ? ":attr=" + t.tdata : "");
                tokenHist[key] = (tokenHist[key] || 0) + 1;
                if (t.ttype === 1 && t.tdata === 0) { nounish++; hasNounish = true; onlyPrep = false; }
                if (t.ttype === 1 && t.tdata === 1) { heldish++; hasNounish = true; onlyPrep = false; }
                if (t.ttype === 1 && t.tdata === 6) { creatureish++; hasNounish = true; onlyPrep = false; }
                if (t.ttype === 1) onlyPrep = false;
                if (t.ttype === 2) hasPrep = true;
                if (t.ttype === 4) {
                    attrFilters.push(t.tdata);
                    onlyPrep = false;
                }
                if (t.ttype === 3) {
                    routineFilters.push(t.tdata);
                    onlyPrep = false;
                }
                // packed/byte addresses for routines are typically >> objectCount
                if ((t.ttype === 1 || t.ttype === 4) && t.tdata >= 1 && t.tdata <= objCount) objectIdLike++;
            });
            if (hasPrep && onlyPrep) prepOnly++;
        });
    }

    verbs.forEach(e => {
        const vb = e.data[1] || 0;
        const idx255 = 255 - vb;
        const cands = [
            { which: "raw", idx: vb, addr: ZR.u16(mem, h.staticMem + 2 * vb) },
            { which: "255", idx: idx255, addr: ZR.u16(mem, h.staticMem + 2 * idx255) }
        ];
        let ok = false;
        for (const c of cands) {
            if (!c.addr || c.addr < h.staticMem || c.addr >= mem.length) continue;
            const g2 = tryGV2(mem, c.addr, dictByAddr);
            if (g2) {
                gv2++;
                if (c.which === "255") usedIdx255++; else usedIdxRaw++;
                e._g = { kind: "gv2", idx: c.idx, which: c.which, addr: c.addr, nlines: g2.nlines };
                noteTokens(g2);
                if (samples.length < 8 && /^(take|open|eat|examine|pray|xyzzy|wind|unlock)$/.test(e.text)) {
                    samples.push({
                        word: e.text, data: e.data, which: c.which, idx: c.idx, addr: c.addr,
                        nlines: g2.nlines,
                        lines: g2.lines.map(ln => ({
                            action: ln.action, reverse: ln.reverse,
                            tokens: ln.tokens.map(t => t.tname + (t.ttype===1?(":"+ELEM[t.tdata]):t.ttype===2?(":"+((dictByAddr[t.tdata]||{}).text||("@"+t.tdata.toString(16)))):t.ttype===4?(":attr="+t.tdata):(":"+t.tdata)))
                        }))
                    });
                }
                ok = true;
                break;
            }
            const g1 = tryGV1(mem, c.addr);
            if (g1) {
                gv1++;
                if (c.which === "255") usedIdx255++; else usedIdxRaw++;
                e._g = { kind: "gv1", idx: c.idx, which: c.which, addr: c.addr, nlines: g1.nlines };
                if (samples.length < 8 && /^(take|open|eat|examine|pray|xyzzy|wind|unlock)$/.test(e.text)) {
                    samples.push({ word: e.text, data: e.data, which: c.which, idx: c.idx, kind: "gv1", nlines: g1.nlines, lines: g1.lines.slice(0,4) });
                }
                ok = true;
                break;
            }
        }
        if (!ok) fail++;
    });

    // Unique attr filters
    const attrUniq = {};
    attrFilters.forEach(a => { attrUniq[a] = (attrUniq[a] || 0) + 1; });

    // Dictionary flag sanity: words that are verbs vs nouns vs both
    const verbOnly = verbs.filter(e => !(e.flags & 0x80)).length;
    const nounOnly = dict.entries.filter(e => (e.flags & 0x80) && !(e.flags & 0x01)).length;
    const both = dict.entries.filter(e => (e.flags & 0x81) === 0x81).length;
    const meta = dict.entries.filter(e => e.flags & 0x02).length;
    const prep = dict.entries.filter(e => e.flags & 0x08).length;

    // Infocom-ish: directions flagged as verbs?
    const dirWords = ["north","south","east","west","n","s","e","w"];
    const dirAsVerb = {};
    dirWords.forEach(w => {
        const e = dict.byText[w];
        dirAsVerb[w] = e ? { data: e.data, verbBit: !!(e.flags & 1), nounBit: !!(e.flags & 0x80) } : null;
    });

    const want = ["take","get","drop","look","inventory","examine","open","eat","unlock","pray","xyzzy","quit"];
    const wordBits = {};
    want.forEach(w => {
        const e = dict.byText[w];
        wordBits[w] = e ? e.data : null;
    });

    return {
        label, ver: h.version, rel: ZR.u16(mem, 2), serial,
        dict: { entryLen: dict.entryLen, nentries: dict.nentries, dataBytes: dict.dataBytes },
        gpKeys: Object.keys(gp), gpHasEntries: !!gp.entries,
        hdr,
        verbFlagged: verbs.length,
        decode: { gv2, gv1, fail, usedIdx255, usedIdxRaw },
        flags: { verbOnly, nounOnly, both, meta, prep },
        tokenHistTop: Object.entries(tokenHist).sort((a,b)=>b[1]-a[1]).slice(0,15),
        attrFilterUniq: attrUniq,
        attrFilterCount: attrFilters.length,
        routineFilterCount: routineFilters.length,
        nounish, heldish, creatureish, intransitive, prepOnly,
        objectIdLike, objCount,
        dirAsVerb,
        wordBits,
        samples
    };
}

const games = [
    ["Advent.z5 I6", "games/Advent.z5.js"],
    ["curses.z5 I6-old", "games/curses.z5.js"],
    ["anchor.z8 I6", "games/anchor.z8.js"],
    ["LostPig.z8 I7", "harness/fixtures/LostPig.z8"],
    ["wump2ka.z5 I7", "harness/fixtures/wump2ka.z5"],
    ["Bronze.zblorb I7", "games/Bronze.zblorb.js"],
    ["Zork1.z3 Infocom", "games/Zork1-TheGreatUndergroundEmpire.z3.js"],
    ["Wishbringer.z3 Infocom", "games/Wishbringer.z3.js"],
    ["photopia.z5 I6?", "games/photopia.z5.js"],
    ["Galatea.zblorb I7?", "games/Galatea.zblorb.js"]
];

for (const [label, p] of games) {
    try {
        console.log(JSON.stringify(decode(label, p)));
    } catch (e) {
        console.log(JSON.stringify({ label, error: String(e.stack || e) }));
    }
}
