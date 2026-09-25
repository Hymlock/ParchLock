/* D34 Phase A research probe — read-only decoder. Does not touch GrammarProvider/ZRamReader. */
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
        const buf = Buffer.from(m[1].replace(/\s+/g, ""), "base64");
        return extractZcode(buf);
    }
    return extractZcode(text);
}

function extractZcode(buf) {
    if (buf[0] >= 1 && buf[0] <= 8) return buf;
    // blorb FORM...IFRS
    const str = buf.toString("latin1");
    const zcod = str.indexOf("ZCOD");
    if (zcod >= 0) {
        const len = buf.readUInt32BE(zcod + 4);
        return buf.slice(zcod + 8, zcod + 8 + len);
    }
    throw new Error("not zcode/blorb, first=" + buf[0]);
}

const ELEM = {
    0: "noun", 1: "held", 2: "multi", 3: "multiheld", 4: "multiexcept",
    5: "multiinside", 6: "creature", 7: "special", 8: "number", 9: "topic"
};
const TT = {
    0: "ILLEGAL", 1: "ELEM", 2: "PREP", 3: "ROUTINE_FILTER",
    4: "ATTR_FILTER", 5: "SCOPE", 6: "GPR", 15: "ENDIT"
};

function flagBits(b) {
    return {
        verb: !!(b & 0x01),
        meta: !!(b & 0x02),
        plural: !!(b & 0x04),
        adj: !!(b & 0x08),
        bit4: !!(b & 0x10),
        bit5: !!(b & 0x20),
        bit6: !!(b & 0x40),
        noun: !!(b & 0x80)
    };
}

function parseDictFull(mem) {
    const h = ZR.header(mem);
    if (!h || !h.dict) return null;
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
    const max = Math.min(nentries, 8000);
    for (let i = 0; i < max; i++) {
        const eaddr = addr + i * entryLen;
        const text = ZR.decodeZsc(mem, eaddr, textBytes / 2).toLowerCase().trim();
        const data = [];
        for (let d = 0; d < dataBytes; d++) data.push(ZR.u8(mem, eaddr + textBytes + d));
        const e = { text, eaddr, data, flags: data[0] || 0 };
        entries.push(e);
        if (text) byText[text] = e;
    }
    return { entryLen, nentries, textBytes, dataBytes, entries, byText, nsep };
}

function tryGV2(mem, gaddr, dictByAddr) {
    const nlines = ZR.u8(mem, gaddr);
    if (nlines < 1 || nlines > 40) return null;
    let p = gaddr + 1;
    const lines = [];
    for (let li = 0; li < nlines; li++) {
        if (p + 3 > mem.length) return null;
        const actw = ZR.u16(mem, p); p += 2;
        const action = actw & 0x03ff;
        const reverse = !!(actw & 0x0400);
        const tokens = [];
        let guard = 0;
        while (guard++ < 12) {
            const tb = ZR.u8(mem, p); p += 1;
            if (tb === 15) break;
            const ttype = tb & 0x0f;
            if (ttype === 0 || ttype > 6) return null;
            if (p + 2 > mem.length) return null;
            const tdata = ZR.u16(mem, p); p += 2;
            let note = "";
            if (ttype === 1) note = ELEM[tdata] || ("elem#" + tdata);
            else if (ttype === 2) {
                const w = dictByAddr[tdata];
                note = "prep:" + (w ? w.text : ("@" + tdata.toString(16)));
            } else if (ttype === 3) note = "noun=Routine@" + tdata.toString(16);
            else if (ttype === 4) note = "attr=" + tdata;
            else if (ttype === 5) note = "scope=Routine@" + tdata.toString(16);
            else if (ttype === 6) note = "gpr@" + tdata.toString(16);
            tokens.push({ ttype, tname: TT[ttype], tdata, note });
        }
        if (guard >= 12) return null;
        lines.push({ action, reverse, tokens });
    }
    return { version: 2, nlines, lines, end: p };
}

function tryGV1(mem, gaddr) {
    const nlines = ZR.u8(mem, gaddr);
    if (nlines < 1 || nlines > 40) return null;
    let p = gaddr + 1;
    const lines = [];
    for (let li = 0; li < nlines; li++) {
        if (p + 8 > mem.length) return null;
        const params = ZR.u8(mem, p);
        const toks = [];
        for (let t = 0; t < 6; t++) toks.push(ZR.u8(mem, p + 1 + t));
        const action = ZR.u8(mem, p + 7);
        p += 8;
        if (params > 6) return null;
        lines.push({ params, toks, action });
    }
    return { version: 1, nlines, lines, end: p };
}

function decodeGrammar(mem, dict) {
    const h = ZR.header(mem);
    const staticMem = h.staticMem;
    const dictByAddr = {};
    dict.entries.forEach((e) => { dictByAddr[e.eaddr] = e; });

    const verbs = dict.entries.filter((e) => e.flags & 0x01);
    const samples = [];
    let gv2ok = 0, gv1ok = 0, fail = 0;
    const tokenHist = {};
    let objectIdLike = 0;
    let routineFilter = 0;
    let attrFilter = 0;
    let elemNoun = 0;

    function consider(e, g, kind) {
        if (!g) return false;
        if (kind === "gv2") gv2ok++;
        else gv1ok++;
        if (samples.length < 12 && /^(take|get|eat|open|look|inventory|i|examine|x|wind|pray)$/.test(e.text)) {
            samples.push({ word: e.text, verbByte: e.data[1], kind, nlines: g.nlines, lines: g.lines.slice(0, 4) });
        }
        g.lines.forEach((ln) => {
            (ln.tokens || []).forEach((t) => {
                tokenHist[t.tname + ":" + t.note] = (tokenHist[t.tname + ":" + t.note] || 0) + 1;
                if (t.ttype === 3) routineFilter++;
                if (t.ttype === 4) attrFilter++;
                if (t.ttype === 1 && t.tdata === 0) elemNoun++;
                // object IDs in Z-machine are typically 1..objectCount, packed addresses are large
            });
        });
        return true;
    }

    verbs.forEach((e) => {
        const vb = e.data[1] || 0;
        const idxFrom255 = 255 - vb;
        const candidates = [
            { idx: vb, addr: ZR.u16(mem, staticMem + 2 * vb) },
            { idx: idxFrom255, addr: ZR.u16(mem, staticMem + 2 * idxFrom255) }
        ];
        let ok = false;
        for (const c of candidates) {
            if (!c.addr || c.addr < staticMem) continue;
            const g2 = tryGV2(mem, c.addr, dictByAddr);
            if (g2 && consider(e, g2, "gv2")) { ok = true; e._g = { idx: c.idx, addr: c.addr, kind: "gv2" }; break; }
            const g1 = tryGV1(mem, c.addr);
            if (g1 && consider(e, g1, "gv1")) { ok = true; e._g = { idx: c.idx, addr: c.addr, kind: "gv1" }; break; }
        }
        if (!ok) fail++;
    });

    return { staticMem, verbCount: verbs.length, gv2ok, gv1ok, fail, samples, tokenHistTop: Object.entries(tokenHist).sort((a, b) => b[1] - a[1]).slice(0, 20), routineFilter, attrFilter, elemNoun, objectIdLike };
}

function probeFile(label, p) {
    const mem = loadStory(p);
    const h = ZR.header(mem);
    const dict = parseDictFull(mem);
    const serial = String.fromCharCode(...[18, 19, 20, 21, 22, 23].map((i) => mem[i] || 32));
    const release = ZR.u16(mem, 2);
    const want = ["take", "get", "drop", "look", "inventory", "i", "examine", "x", "open", "eat", "north", "n", "lamp", "door", "unlock", "wind", "pray", "xyzzy", "quit", "save"];
    const wanted = {};
    want.forEach((w) => {
        const e = dict.byText[w];
        if (!e) { wanted[w] = null; return; }
        wanted[w] = { data: e.data, bits: flagBits(e.flags) };
    });
    const verbs = dict.entries.filter((e) => e.flags & 0x01);
    const nouns = dict.entries.filter((e) => e.flags & 0x80);
    const metas = dict.entries.filter((e) => e.flags & 0x02);
    const preps = dict.entries.filter((e) => e.flags & 0x08);
    const bit6 = dict.entries.filter((e) => e.flags & 0x40);

    // Infocom-style: v3 extra byte often has bit7 set always, bit6 verb
    const infocomGuess = h.version <= 3 && dict.dataBytes === 1;
    const v3bit6 = dict.entries.filter((e) => (e.flags & 0x40) && !(e.flags & 0x01));
    const v3bit7always = dict.entries.filter((e) => e.flags & 0x80).length;

    const g = decodeGrammar(mem, dict);

    // GrammarProvider-equivalent: dict.entries from real parseDictionary
    const gpShape = ZR.parseDictionary(mem);
    const gpWouldSee = gpShape.entries; // expected undefined

    return {
        label, file: p, bytes: mem.length,
        version: h.version, release, serial: serial.replace(/[^\x20-\x7e]/g, "?"),
        staticMem: h.staticMem, dictAddr: h.dict, himem: h.himem,
        dict: { entryLen: dict.entryLen, nentries: dict.nentries, textBytes: dict.textBytes, dataBytes: dict.dataBytes, nsep: dict.nsep },
        counts: { verbs: verbs.length, nouns: nouns.length, metas: metas.length, preps: preps.length, bit6: bit6.length, v3bit6notVerb0: v3bit6.length, bit7set: v3bit7always },
        sampleWords: wanted,
        verbListHead: verbs.slice(0, 25).map((e) => e.text + ":" + (e.data[1] || 0)),
        parseDictionaryShape: { hasEntries: !!gpWouldSee, keys: Object.keys(gpShape), count: gpShape.count, entryLen: gpShape.entryLen, sampleWord: gpShape.words && gpShape.words.take },
        grammar: g
    };
}

const games = [
    ["Advent.z5 (I6)", "games/Advent.z5.js"],
    ["curses.z5 (I6)", "games/curses.z5.js"],
    ["anchor.z8 (I6)", "games/anchor.z8.js"],
    ["LostPig.z8 (I7)", "harness/fixtures/LostPig.z8"],
    ["wump2ka.z5 (I7)", "harness/fixtures/wump2ka.z5"],
    ["lost.z5 (I6?)", "harness/fixtures/lost.z5"],
    ["Zork1.z3 (Infocom)", "games/Zork1-TheGreatUndergroundEmpire.z3.js"],
    ["Wishbringer.z3 (Infocom)", "games/Wishbringer.z3.js"]
];

const compact = process.argv.includes("--compact");
const out = [];
for (const [label, p] of games) {
    try { out.push(probeFile(label, p)); }
    catch (e) { out.push({ label, file: p, error: String(e.stack || e) }); }
}
if (!compact) {
    console.log(JSON.stringify(out, null, 2));
} else {
    out.forEach((r) => {
        if (r.error) { console.log(JSON.stringify({ label: r.label, error: r.error })); return; }
        const sw = {};
        Object.keys(r.sampleWords).forEach((w) => {
            const e = r.sampleWords[w];
            sw[w] = e ? e.data.join(",") + " v=" + e.bits.verb + " m=" + e.bits.meta + " n=" + e.bits.noun + " a=" + e.bits.adj + " b6=" + e.bits.bit6 : null;
        });
        console.log(JSON.stringify({
            label: r.label, ver: r.version, rel: r.release, serial: r.serial,
            dict: r.dict, counts: r.counts,
            gp: r.parseDictionaryShape,
            g: r.grammar && { verbCount: r.grammar.verbCount, gv2: r.grammar.gv2ok, gv1: r.grammar.gv1ok, fail: r.grammar.fail, routineFilter: r.grammar.routineFilter, attrFilter: r.grammar.attrFilter, elemNoun: r.grammar.elemNoun, samples: r.grammar.samples, tokenHistTop: r.grammar.tokenHistTop },
            words: sw
        }));
    });
}
