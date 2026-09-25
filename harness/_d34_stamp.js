const fs = require("fs");
function load(p) {
    const t = fs.readFileSync(p);
    if (p.endsWith(".js")) {
        const s = t.toString("utf8");
        const m = s.match(/processBase64Zcode\s*\(\s*['"]([\s\S]*?)['"]\s*\)/);
        const b = Buffer.from(m[1].replace(/\s+/g, ""), "base64");
        if (b[0] >= 1 && b[0] <= 8) return b;
        const z = b.toString("latin1").indexOf("ZCOD");
        return b.slice(z + 8, z + 8 + b.readUInt32BE(z + 4));
    }
    if (t[0] >= 1 && t[0] <= 8) return t;
    const z = t.toString("latin1").indexOf("ZCOD");
    return t.slice(z + 8, z + 8 + t.readUInt32BE(z + 4));
}
["games/Advent.z5.js","games/curses.z5.js","games/anchor.z8.js","harness/fixtures/LostPig.z8","harness/fixtures/wump2ka.z5","games/Bronze.zblorb.js","games/Zork1-TheGreatUndergroundEmpire.z3.js","games/photopia.z5.js","games/Galatea.zblorb.js"].forEach((p) => {
    const m = load(p);
    let stamp = "";
    for (let i = 0x3c; i < 0x40; i++) stamp += (m[i] >= 32 && m[i] < 127) ? String.fromCharCode(m[i]) : ".";
    const serial = String.fromCharCode(m[18], m[19], m[20], m[21], m[22], m[23]);
    console.log(JSON.stringify({ p, ver: m[0], stamp, serial }));
});
