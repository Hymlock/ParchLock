const fs = require("fs");
const vm = require("vm");
const zrSrc = fs.readFileSync("js/ZRamReader.js", "utf8");
const ctx = { console, ZRamReader: undefined };
vm.runInNewContext(zrSrc, ctx);
const ZR = ctx.ZRamReader;

function loadJs(p) {
    const s = fs.readFileSync(p, "utf8");
    const m = s.match(/processBase64Zcode\s*\(\s*['"]([\s\S]*?)['"]\s*\)/);
    return Buffer.from(m[1].replace(/\s+/g, ""), "base64");
}
function loadRaw(p) { return fs.readFileSync(p); }

function dictParse(mem) {
    const h = ZR.header(mem);
    let addr = h.dict;
    const nsep = ZR.u8(mem, addr);
    addr += 1 + nsep;
    const el = ZR.u8(mem, addr);
    const n = ZR.u16(mem, addr + 1);
    addr += 3;
    const tb = h.version <= 3 ? 4 : 6;
    const words = {};
    for (let i = 0; i < n; i++) {
        const ea = addr + i * el;
        const t = ZR.decodeZsc(mem, ea, tb / 2).toLowerCase().trim();
        const d = [ZR.u8(mem, ea + tb), ZR.u8(mem, ea + tb + 1), ZR.u8(mem, ea + tb + 2)];
        if (t) words[t] = { ea, d, el };
    }
    return { h, words };
}

function check(label, mem) {
    const { h, words } = dictParse(mem);
    const take = words.take;
    if (!take) { console.log(label, "no take"); return; }
    const vb = take.d[1];
    const a1 = ZR.u16(mem, h.staticMem + 2 * vb);
    const a2 = ZR.u16(mem, h.staticMem + 2 * (255 - vb));
    console.log(JSON.stringify({
        label, ver: h.version, staticMem: h.staticMem,
        takeData: take.d, vb, idx255: 255 - vb,
        addrAtVb: a1, nlinesAtVb: a1 ? ZR.u8(mem, a1) : null,
        addrAt255minus: a2, nlinesAt255minus: a2 ? ZR.u8(mem, a2) : null
    }));
}

check("Advent", loadJs("games/Advent.z5.js"));
check("curses", loadJs("games/curses.z5.js"));
check("anchor", loadJs("games/anchor.z8.js"));
check("LostPig", loadRaw("harness/fixtures/LostPig.z8"));
check("wump2ka", loadRaw("harness/fixtures/wump2ka.z5"));
