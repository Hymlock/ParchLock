/* D38 P2 map/name/player-global probe — read-only. No product files.
 * Usage: node harness/_d38_p2_map.js [story.js]
 */
const { chromium } = require("playwright");
const { pathToFileURL } = require("node:url");
const path = require("node:path");
const ROOT = path.resolve(__dirname, "..");
const fs = require("fs");

(async () => {
    const story = process.argv[2] || "games/CounterfeitMonkey.gblorb.js";
    const browser = await chromium.launch({
        executablePath: process.env.PW_CHROME,
        headless: true
    });
    const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
    await page.goto(pathToFileURL(path.resolve(ROOT, "play.html")).href + "?story=" + story);
    await page.waitForTimeout(2500);
    await page.evaluate(() => { if (window.Message) Message.Hide(); });
    for (let i = 0; i < 24 && !(await page.locator(".Input.LineInput").count()); i++) {
        await page.keyboard.press("Space");
        await page.waitForTimeout(200);
    }
    async function inject(cmd) {
        if (!(await page.locator(".Input.LineInput").count())) return false;
        await page.evaluate((t) => { Input.Clear(); Input.Inject(t, true); }, cmd);
        await page.waitForTimeout(800);
        return true;
    }
    // Finish CM yes/no intro so movement works.
    for (let i = 0; i < 8; i++) {
        await inject("yes");
        if (await page.locator(".Input.LineInput").count()) break;
    }
    await inject("look");

    const dump = await page.evaluate(() => {
        const rb = (a) => Quixe.ReadByte(a) & 0xff;
        const rw = (a) => {
            if (typeof Quixe.ReadWord === "function") return Quixe.ReadWord(a) >>> 0;
            return ((rb(a) << 24) | (rb(a + 1) << 16) | (rb(a + 2) << 8) | rb(a + 3)) >>> 0;
        };
        const internals = Quixe.get_vm_internals();
        const accel = Array.from(internals.accel_params);
        const ramstart = rw(8);
        const decoding = internals.stringtable >>> 0;
        const numAttr = accel[7] | 0;
        const indivStart = accel[1] | 0;
        const classAddr = accel[2] | 0;
        const OFF_NEXT = 1 + numAttr, OFF_NAME = OFF_NEXT + 4, OFF_PROPS = OFF_NAME + 4;
        const OFF_PARENT = OFF_PROPS + 4, OFF_SIBLING = OFF_PARENT + 4, OFF_CHILD = OFF_SIBLING + 4;
        const isObj = (a) => !!(a && a >= ramstart && rb(a) === 0x70);

        function decodeE1(ptr, cap) {
            const t0 = rb(ptr);
            if (t0 === 0xe0) {
                let s = "";
                for (let i = ptr + 1; i < ptr + 1 + (cap || 80); i++) {
                    const c = rb(i); if (!c) break;
                    s += c >= 32 && c < 127 ? String.fromCharCode(c) : "?";
                }
                return s;
            }
            if (t0 === 0xe2) {
                let s = "";
                for (let i = ptr + 4; i < ptr + 4 + (cap || 80) * 4; i += 4) {
                    const cp = rw(i); if (!cp) break;
                    s += cp >= 32 && cp < 127 ? String.fromCharCode(cp) : "?";
                }
                return s;
            }
            if (t0 !== 0xe1 || !decoding) return null;
            const root = rw(decoding + 8);
            let addr = ptr + 1, bitnum = 0, node = root, s = "";
            cap = cap || 80;
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
                if (t === 2) {
                    const c = rb(node + 1);
                    s += c >= 32 && c < 127 ? String.fromCharCode(c) : (c === 10 ? " " : "?");
                    node = root; continue;
                }
                if (t === 3) {
                    let i = node + 1;
                    while (rb(i) && s.length < cap) {
                        const c = rb(i++);
                        s += c >= 32 && c < 127 ? String.fromCharCode(c) : "?";
                    }
                    node = root; continue;
                }
                if (t === 4) { const cp = rw(node + 1); s += cp >= 32 && cp < 127 ? String.fromCharCode(cp) : "?"; node = root; continue; }
                if (t === 5) {
                    let i = node + 1;
                    while (s.length < cap) {
                        const cp = rw(i); if (!cp) break;
                        s += cp >= 32 && cp < 127 ? String.fromCharCode(cp) : "?";
                        i += 4;
                    }
                    node = root; continue;
                }
                s += "*"; node = root;
            }
            return s;
        }
        function decodeString(ptr) {
            if (!ptr) return null;
            const t = rb(ptr);
            if (t === 0xe0 || t === 0xe1 || t === 0xe2) return decodeE1(ptr, 80);
            return null;
        }
        function decodeDictWord(ptr) {
            if (!ptr || rb(ptr) !== 0x60) return null;
            let s = "";
            for (let i = 1; i <= 12; i++) {
                const c = rb(ptr + i); if (!c) break;
                if (c >= 32 && c < 127) s += String.fromCharCode(c);
            }
            return s;
        }
        function parseProps(ptr) {
            if (!ptr) return [];
            const n = rw(ptr);
            if (n < 0 || n > 800) return [];
            const out = [];
            for (let i = 0; i < n; i++) {
                const base = ptr + 4 + i * 10;
                out.push({
                    id: (rb(base) << 8) | rb(base + 1),
                    len: (rb(base + 2) << 8) | rb(base + 3),
                    data: rw(base + 4),
                    flags: (rb(base + 8) << 8) | rb(base + 9)
                });
            }
            return out;
        }
        function propWords(p) {
            const words = [];
            for (let w = 0; w < Math.min(p.len, 16); w++) words.push(rw(p.data + w * 4));
            return words;
        }
        function hwName(addr) { return decodeString(rw(addr + OFF_NAME)) || ""; }
        function dictWords(addr) {
            const out = [];
            parseProps(rw(addr + OFF_PROPS)).forEach((p) => {
                if (p.id !== 1) return;
                propWords(p).forEach((w) => { const d = decodeDictWord(w); if (d) out.push(d); });
            });
            return out;
        }
        function kindsOf(addr) {
            const names = [];
            parseProps(rw(addr + OFF_PROPS)).forEach((p) => {
                if (p.id !== 2) return;
                propWords(p).forEach((w) => { if (isObj(w)) { const n = hwName(w); if (n) names.push(n); } });
            });
            return names;
        }
        function isRoom(addr) { return kindsOf(addr).some((n) => /^K1_room$/i.test(n) || /_room$/i.test(n)); }
        function isPerson(addr) { return kindsOf(addr).some((n) => /person|man|woman/i.test(n)); }
        function children(addr) {
            const kids = [];
            let c = rw(addr + OFF_CHILD);
            for (let i = 0; i < 40 && c; i++) { kids.push(c); c = rw(c + OFF_SIBLING); }
            return kids;
        }
        function getProp(addr, id) {
            return parseProps(rw(addr + OFF_PROPS)).find((p) => p.id === id) || null;
        }

        // Scan @streamstr (opcode 0x72) in a Glulx function for a string addr.
        function streamstrInFn(fn, cap) {
            if (!fn) return null;
            const t = rb(fn);
            if (t !== 0xc0 && t !== 0xc1) return null;
            let i = fn + 1;
            // skip locals descriptor
            if (t === 0xc0) {
                // 0 locals typically; C0 then 00
            } else {
                const nloc = rb(i++);
                i += nloc; // each local type byte? actually: number of local groups, then pairs
            }
            // C0: next byte is # of local groups. 0 means none.
            // Re-parse properly:
            i = fn + 1;
            const ntypes = rb(i++);
            for (let g = 0; g < ntypes; g++) i += 2; // type, count
            const end = fn + (cap || 80);
            const hits = [];
            for (let p = i; p < end && p < fn + 64; p++) {
                if (rb(p) === 0x72) {
                    // streamstr; addressing mode of next operand is in the following nibble/byte
                    const op = rb(p);
                    const modes = rb(p + 1);
                    const mode0 = modes & 0x0f;
                    let q = p + 2;
                    let addr = 0;
                    if (mode0 === 7) { addr = rw(q); q += 4; } // ram+addr? 
                    else if (mode0 === 8) { addr = q; } // inline? no
                    else if (mode0 === 3) { addr = (rb(q) << 8 | rb(q + 1)); q += 2; }
                    else if (mode0 === 6) { addr = rw(q); q += 4; } // const 4
                    else if (mode0 === 5) { addr = (rb(q) << 8) | rb(q + 1); q += 2; } // const 2
                    else if (mode0 === 1) { addr = rb(q); q += 1; }
                    const s = decodeString(addr);
                    if (s) hits.push({ at: p - fn, mode0, addr, text: s });
                }
            }
            return hits;
        }

        const all = [];
        const seen = new Set();
        let a = classAddr;
        for (let n = 0; n < 30000 && isObj(a) && !seen.has(a); n++) {
            seen.add(a); all.push(a);
            a = rw(a + OFF_NEXT);
            if (!a) break;
        }

        // Globals: which hold a person / room.
        const globals = [];
        for (let g = 0; g < 96; g++) {
            const addr = ramstart + g * 4;
            const v = rw(addr);
            if (!isObj(v)) continue;
            const k = kindsOf(v);
            const person = isPerson(v);
            const room = isRoom(v);
            if (!person && !room && hwName(v) !== "compass") continue;
            globals.push({
                g, v,
                hw: hwName(v),
                dict: dictWords(v).slice(0, 6),
                kinds: k.slice(0, 3),
                parent: rw(v + OFF_PARENT),
                nKids: children(v).length,
                person, room
            });
        }

        // Player candidate: person global whose parent is a room. Prefer empty-dict K8_person (the PC).
        const personGlobals = globals.filter((g) => g.person);
        const pcLike = personGlobals.filter((g) => {
            const k = g.kinds || [];
            return k[0] === "K8_person" && (!g.dict || g.dict.length === 0);
        });

        const playerAddr = (pcLike[0] || personGlobals[0] || {}).v || 0;
        const locAddr = playerAddr ? rw(playerAddr + OFF_PARENT) : 0;

        function summarizeProps(addr) {
            return parseProps(rw(addr + OFF_PROPS)).map((p) => {
                const words = propWords(p);
                const classified = words.slice(0, 8).map((w) => {
                    if (!w) return { w, k: "0" };
                    if (isObj(w)) return { w, k: "obj", dict: dictWords(w).slice(0, 4), kinds: kindsOf(w).slice(0, 2), hw: hwName(w) };
                    const d = decodeDictWord(w); if (d) return { w, k: "dict", t: d };
                    const s = decodeString(w); if (s) return { w, k: "str", t: s.slice(0, 60) };
                    const t = rb(w);
                    if (t === 0xc0 || t === 0xc1) {
                        const streams = streamstrInFn(w, 96);
                        return { w, k: "fn", t0: t, streams: (streams || []).slice(0, 3) };
                    }
                    if (w < 4096) return { w, k: "small" };
                    return { w, k: "other", b0: t };
                });
                return { id: p.id, indiv: p.id >= indivStart, len: p.len, flags: p.flags, words: classified };
            });
        }

        const locProps = locAddr ? summarizeProps(locAddr) : [];
        const playerProps = playerAddr ? summarizeProps(playerAddr) : [];
        const inv = playerAddr ? children(playerAddr).map((c) => ({
            addr: c,
            dict: dictWords(c),
            kinds: kindsOf(c),
            attrs: (() => {
                const bits = [];
                for (let n = 0; n < numAttr * 8; n++) {
                    const byte = rb(c + 1 + Math.floor(n / 8));
                    if (((byte >> (7 - (n % 8))) & 1) === 1) bits.push(n);
                }
                return bits;
            })(),
            stringsFrom17: (() => {
                const p = getProp(c, 17);
                if (!p) return [];
                return propWords(p).flatMap((w) => streamstrInFn(w, 96) || []);
            })()
        })) : [];

        const locKids = locAddr ? children(locAddr).filter((c) => c !== playerAddr).map((c) => ({
            addr: c,
            dict: dictWords(c).slice(0, 8),
            kinds: kindsOf(c).slice(0, 3),
            stringsFrom17: (() => {
                const p = getProp(c, 17);
                if (!p) return [];
                return propWords(p).flatMap((w) => streamstrInFn(w, 96) || []);
            })()
        })) : [];

        const locName17 = locAddr ? (() => {
            const p = getProp(locAddr, 17);
            if (!p) return null;
            return propWords(p).flatMap((w) => streamstrInFn(w, 128) || []);
        })() : null;

        // Compass: property that looks like a room-property-id (I7 direction_property).
        let compass = 0;
        for (let i = 0; i < all.length; i++) if (hwName(all[i]) === "compass") { compass = all[i]; break; }
        const compassKids = compass ? children(compass).map((c) => {
            const props = summarizeProps(c);
            const smalls = [];
            props.forEach((p) => p.words.forEach((w) => { if (w.k === "small") smalls.push({ prop: p.id, val: w.w }); }));
            return { addr: c, dict: dictWords(c), smalls, name17: (() => {
                const p = getProp(c, 17);
                return p ? propWords(p).flatMap((w) => streamstrInFn(w, 64) || []) : [];
            })() };
        }) : [];

        // For the location, any prop whose value is a room (except kind prop 2).
        const locRoomProps = locProps.filter((p) => p.id !== 2 && p.words.some((w) => w.k === "obj" && (w.kinds || []).some((k) => /room/i.test(k))));

        const look = (() => {
            try {
                const el = document.querySelector(".BufferWindow, #windowport");
                return ((el && el.innerText) || "").slice(-500);
            } catch (e) { return ""; }
        })();

        return {
            numAttr, indivStart, objectCount: all.length,
            personGlobals, pcLike, playerAddr, locAddr,
            locDict: locAddr ? dictWords(locAddr) : [],
            locKinds: locAddr ? kindsOf(locAddr) : [],
            locName17,
            locRoomProps,
            locPropIds: locProps.map((p) => p.id),
            locPropsInteresting: locProps.filter((p) =>
                p.id <= 3 || p.id === 17 || p.indiv ||
                p.words.some((w) => w.k === "obj" || w.k === "str" || w.k === "fn" || w.k === "small")
            ),
            playerPropIds: playerProps.map((p) => p.id),
            playerPropsInteresting: playerProps.filter((p) =>
                p.id <= 3 || p.id === 17 || p.indiv ||
                p.words.some((w) => w.k === "str" || w.k === "fn" || w.k === "obj")
            ),
            inv, locKids, compassKids,
            look
        };
    });

    await browser.close();
    const outPath = path.join(ROOT, "harness", "_d38_p2_map.out.json");
    fs.writeFileSync(outPath, JSON.stringify(dump, null, 2));
    console.log("wrote", outPath);
    console.log(JSON.stringify({
        playerAddr: dump.playerAddr,
        locAddr: dump.locAddr,
        locDict: dump.locDict,
        locName17: dump.locName17,
        locRoomProps: dump.locRoomProps,
        locPropIds: dump.locPropIds,
        pcLike: dump.pcLike,
        personGlobalCount: (dump.personGlobals || []).length,
        personGlobalsSample: (dump.personGlobals || []).slice(0, 8),
        inv: dump.inv,
        locKids: dump.locKids,
        compassKids: (dump.compassKids || []).slice(0, 4),
        look: dump.look && dump.look.slice(-300)
    }, null, 2));
})().catch((e) => { console.error("FATAL", e); process.exit(1); });
