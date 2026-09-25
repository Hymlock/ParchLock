/* D38 P2 live research probe — read-only. No product files. */
const { chromium } = require("playwright");
const { pathToFileURL } = require("node:url");
const path = require("node:path");
const ROOT = path.resolve(__dirname, "..");

(async () => {
    const story = process.argv[2] || "games/CounterfeitMonkey.gblorb.js";
    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
    const errors = [];
    page.on("pageerror", (e) => errors.push(String(e.message || e)));
    await page.goto(pathToFileURL(path.resolve(ROOT, "play.html")).href + "?story=" + story);
    await page.waitForTimeout(4000);
    await page.evaluate(() => { if (window.Message) Message.Hide(); });

    async function inject(cmd) {
        if (!(await page.locator(".Input.LineInput").count())) return false;
        await page.evaluate((t) => { Input.Clear(); Input.Inject(t, true); }, cmd);
        await page.waitForTimeout(900);
        return true;
    }
    await inject("no");
    await inject("no");
    await inject("look");

    const result = await page.evaluate(() => {
        if (typeof Quixe === "undefined" || typeof Quixe.ReadByte !== "function") {
            return { error: "no Quixe.ReadByte" };
        }
        const rb = (a) => Quixe.ReadByte(a) & 0xff;
        const rw = (a) => {
            if (typeof Quixe.ReadWord === "function") return Quixe.ReadWord(a) >>> 0;
            return ((rb(a) << 24) | (rb(a + 1) << 16) | (rb(a + 2) << 8) | rb(a + 3)) >>> 0;
        };
        const magic = [rb(0), rb(1), rb(2), rb(3)];
        const ramstart = rw(8);
        const decodingHeader = rw(28);
        const internals = Quixe.get_vm_internals ? Quixe.get_vm_internals() : null;
        const internKeys = internals ? Object.keys(internals).slice(0, 40) : [];
        const accel = internals && internals.accel_params ? Array.from(internals.accel_params) : null;
        const decoding = (internals && internals.stringtable) ? (internals.stringtable >>> 0) : decodingHeader;

        function decodeE1(ptr, cap) {
            if (rb(ptr) !== 0xe1) {
                if (rb(ptr) === 0xe0) {
                    let s = "";
                    for (let i = ptr + 1; i < ptr + 80; i++) {
                        const c = rb(i);
                        if (!c) break;
                        s += c >= 32 && c < 127 ? String.fromCharCode(c) : "?";
                    }
                    return s;
                }
                return null;
            }
            const root = rw(decoding + 8);
            let addr = ptr + 1, bitnum = 0, node = root, s = "";
            cap = cap || 60;
            for (let step = 0; step < 80000 && s.length < cap; step++) {
                const t = rb(node);
                if (t === 0) {
                    const bit = (rb(addr) >> bitnum) & 1;
                    node = rw(node + 1 + 4 * bit);
                    bitnum++;
                    if (bitnum === 8) { bitnum = 0; addr++; }
                    continue;
                }
                if (t === 1) return s;
                if (t === 2) { const c = rb(node + 1); s += c >= 32 && c < 127 ? String.fromCharCode(c) : "?"; node = root; continue; }
                if (t === 3) {
                    let i = node + 1;
                    while (rb(i) && s.length < cap) {
                        const c = rb(i++);
                        s += c >= 32 && c < 127 ? String.fromCharCode(c) : "?";
                    }
                    node = root; continue;
                }
                s += "*"; node = root;
            }
            return s;
        }

        const ATTR = 7, SIZE = 32;
        function objName(addr) { return decodeE1(rw(addr + 12), 60); }
        function objParent(addr) { return rw(addr + 20); }
        function objSibling(addr) { return rw(addr + 24); }
        function objChild(addr) { return rw(addr + 28); }
        function objProps(addr) { return rw(addr + 16); }
        function isObj(addr) { return addr >= ramstart && rb(addr) === 0x70; }

        function describePtr(p) {
            if (!p) return { p, kind: "zero" };
            const t = rb(p);
            if (t === 0x70) return { p, kind: "object", name: objName(p) };
            if (t >= 0xc0 && t <= 0xcf) return { p, kind: "function" };
            if (t === 0xe0 || t === 0xe1 || t === 0xe2) return { p, kind: "string", text: decodeE1(p, 50), type: t };
            return { p, kind: "other", firstByte: t };
        }

        function parseProps(ptr) {
            if (!ptr) return [];
            const n = rw(ptr);
            if (n < 0 || n > 400) return [];
            const out = [];
            for (let i = 0; i < n; i++) {
                const base = ptr + 4 + i * 10;
                const id = (rb(base) << 8) | rb(base + 1);
                const len = (rb(base + 2) << 8) | rb(base + 3);
                const data = rw(base + 4);
                const flags = (rb(base + 8) << 8) | rb(base + 9);
                const words = [];
                for (let w = 0; w < Math.min(len, 4); w++) words.push(rw(data + w * 4));
                const wordKinds = words.map((w) => describePtr(w));
                const dataKind = describePtr(data);
                out.push({ id, len, data, flags, words, wordKinds, dataKind });
            }
            return out;
        }

        function children(addr) {
            const kids = [];
            let c = objChild(addr);
            for (let i = 0; i < 80 && c; i++) {
                kids.push({ addr: c, name: objName(c) });
                c = objSibling(c);
            }
            return kids;
        }

        // Find Class: first 0x70 at typical table; or accel[2]
        const classAddr = accel && accel[2] ? accel[2] : 0;
        const objectMeta = accel && accel[3] ? accel[3] : 0;
        const selfGlobalAddr = accel && accel[6] ? accel[6] : 0;
        const numAttr = accel && accel[7] ? accel[7] : null;
        const indivStart = accel && accel[1] ? accel[1] : null;
        const selfVal = selfGlobalAddr ? rw(selfGlobalAddr) : 0;

        const player = isObj(selfVal) ? {
            addr: selfVal,
            name: objName(selfVal),
            parent: objParent(selfVal),
            child: objChild(selfVal),
            attrs: [rb(selfVal + 1), rb(selfVal + 2), rb(selfVal + 3), rb(selfVal + 4), rb(selfVal + 5), rb(selfVal + 6), rb(selfVal + 7)]
        } : null;

        const locAddr = player ? player.parent : 0;
        const location = isObj(locAddr) ? {
            addr: locAddr,
            name: objName(locAddr),
            parent: objParent(locAddr),
            child: objChild(locAddr),
            kids: children(locAddr).slice(0, 20),
            props: parseProps(objProps(locAddr)).slice(0, 40)
        } : null;

        const inventory = player ? children(selfVal).slice(0, 20) : [];
        const playerProps = player ? parseProps(objProps(selfVal)).slice(0, 40) : [];

        // Compass object: hardware name "compass"
        let compass = null;
        if (classAddr && isObj(classAddr)) {
            // walk linked list a bit looking for name compass
            let a = classAddr;
            for (let i = 0; i < 40; i++) {
                if (!isObj(a)) break;
                const nm = objName(a);
                if (nm === "compass") {
                    compass = { addr: a, kids: children(a) };
                    break;
                }
                a = rw(a + 8);
            }
        }

        const globalHits = [];
        for (let g = 0; g < 250; g++) {
            const addr = ramstart + g * 4;
            const val = rw(addr);
            if (!isObj(val)) continue;
            const nm = objName(val);
            const par = objParent(val);
            const parName = isObj(par) ? objName(par) : null;
            const nKids = children(val).length;
            globalHits.push({ g, addr, val, name: nm, parent: par, parentName: parName, nKids });
        }

        const mapText = (() => {
            try {
                const el = document.querySelector("#map") || document.body;
                const t = (el.innerText || "").replace(/\s+/g, " ");
                return t.slice(0, 240);
            } catch (e) { return String(e); }
        })();

        return {
            magic,
            ramstart,
            decoding,
            internKeys,
            accel,
            classAddr,
            objectMeta,
            selfGlobalAddr,
            selfVal,
            numAttr,
            indivStart,
            player,
            location,
            inventory,
            playerProps,
            compass,
            globalHits: globalHits.slice(0, 40),
            globalCount: globalHits.length,
            guessed: (() => {
                // Player = global object whose parent is also a 0x70 object.
                // Location = that parent. Prefer the pair that appears more than once.
                const contained = globalHits.filter((h) => h.parent && isObj(h.parent));
                if (!contained.length) return null;
                const p = contained[0];
                const loc = p.parent;
                const namePtr = (addr) => rw(addr + 12);
                const locKids = children(loc);
                return {
                    playerAddr: p.val,
                    playerGlobal: p.g,
                    playerNamePtr: namePtr(p.val),
                    playerNameType: rb(namePtr(p.val)),
                    playerNameHex: [0,1,2,3,4,5,6,7].map((i) => rb(namePtr(p.val) + i)),
                    playerAttrs: [1,2,3,4,5,6,7].map((i) => rb(p.val + i)),
                    playerProps: parseProps(objProps(p.val)),
                    locAddr: loc,
                    locNamePtr: namePtr(loc),
                    locNameType: rb(namePtr(loc)),
                    locNameHex: [0,1,2,3,4,5,6,7].map((i) => rb(namePtr(loc) + i)),
                    locAttrs: [1,2,3,4,5,6,7].map((i) => rb(loc + i)),
                    locKids,
                    locProps: parseProps(objProps(loc)),
                    compassKid0: compass && compass.kids[0] ? {
                        addr: compass.kids[0].addr,
                        namePtr: namePtr(compass.kids[0].addr),
                        nameType: rb(namePtr(compass.kids[0].addr)),
                        nameHex: [0,1,2,3,4,5,6,7].map((i) => rb(namePtr(compass.kids[0].addr) + i)),
                        props: parseProps(objProps(compass.kids[0].addr))
                    } : null
                };
            })(),
            mapText,
            payload: (typeof WorldModel !== "undefined" && WorldModel.lastPayload) ? {
                engineMode: WorldModel.lastPayload.engineMode,
                roomId: WorldModel.lastPayload.roomId,
                roomName: WorldModel.lastPayload.roomName,
                exits: (WorldModel.lastPayload.exits || []).length,
                discovered: (WorldModel.lastPayload.discoveredObjects || []).length,
                inventory: (WorldModel.lastPayload.inventory || []).length,
                sources: WorldModel.lastPayload.sources
            } : null
        };
    });

    await browser.close();
    console.log(JSON.stringify({ story, errors, result }, null, 2));
})().catch((e) => { console.error("FATAL", e); process.exit(1); });
