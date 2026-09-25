/* D38 P2 trials — read-only. No product files. No GlulxRamProvider.
 * Closes remaining research gaps from _d38_p2_deep.js:
 *   printed-name decode, compass-dir -> room-prop, LSB vs MSB attrs,
 *   parent(player) after a real move, OPEN bit flip, player globals.
 * Usage: node harness/_d38_p2_trials.js [story.js]
 */
const { chromium } = require("playwright");
const { pathToFileURL } = require("node:url");
const path = require("node:path");
const fs = require("fs");
const ROOT = path.resolve(__dirname, "..");

const CARD = ["north","south","east","west","northeast","northwest","southeast","southwest","up","down","in","out"];

(async () => {
    const story = process.argv[2] || "games/CounterfeitMonkey.gblorb.js";
    const browser = await chromium.launch({
        executablePath: process.env.PW_CHROME || undefined,
        headless: true
    });
    const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
    const errors = [];
    page.on("pageerror", (e) => errors.push(String(e.message || e)));
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
        await page.waitForTimeout(900);
        return true;
    }
    for (let i = 0; i < 10; i++) {
        await inject("yes");
        if (await page.locator(".Input.LineInput").count()) break;
    }
    await inject("look");

    const helpers = () => {
        if (typeof Quixe === "undefined" || typeof Quixe.ReadByte !== "function") {
            return { error: "no Quixe.ReadByte" };
        }
        const rb = (a) => Quixe.ReadByte(a) & 0xff;
        const rw = (a) => {
            if (typeof Quixe.ReadWord === "function") return Quixe.ReadWord(a) >>> 0;
            return ((rb(a) << 24) | (rb(a + 1) << 16) | (rb(a + 2) << 8) | rb(a + 3)) >>> 0;
        };
        const internals = Quixe.get_vm_internals ? Quixe.get_vm_internals() : null;
        const accel = internals && internals.accel_params ? Array.from(internals.accel_params) : [];
        const ramstart = rw(8);
        const decoding = (internals && internals.stringtable) ? (internals.stringtable >>> 0) : rw(28);
        const numAttr = (accel[7] | 0) || 7;
        const indivStart = accel[1] | 0;
        const classAddr = accel[2] | 0;
        const OFF_NEXT = 1 + numAttr;
        const OFF_NAME = OFF_NEXT + 4;
        const OFF_PROPS = OFF_NAME + 4;
        const OFF_PARENT = OFF_PROPS + 4;
        const OFF_SIBLING = OFF_PARENT + 4;
        const OFF_CHILD = OFF_SIBLING + 4;
        const isObj = (a) => !!(a && a >= ramstart && rb(a) === 0x70);
        function decodeE0(ptr, cap) {
            if (rb(ptr) !== 0xe0) return null;
            let s = "";
            cap = cap || 80;
            for (let i = ptr + 1; i < ptr + 1 + cap; i++) {
                const c = rb(i); if (!c) break;
                s += c >= 32 && c < 127 ? String.fromCharCode(c) : "?";
            }
            return s;
        }
        function decodeE1(ptr, cap) {
            if (rb(ptr) !== 0xe1 || !decoding) return null;
            const root = rw(decoding + 8);
            if (!root) return null;
            let addr = ptr + 1, bitnum = 0, node = root, s = "";
            cap = cap || 80;
            for (let step = 0; step < 120000 && s.length < cap; step++) {
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
                if (t === 4) {
                    const cp = rw(node + 1);
                    s += cp >= 32 && cp < 127 ? String.fromCharCode(cp) : "?";
                    node = root; continue;
                }
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
        function decodeE2(ptr, cap) {
            if (rb(ptr) !== 0xe2) return null;
            let s = "";
            for (let i = ptr + 4; i + 4 <= ptr + 4 + (cap || 80) * 4; i += 4) {
                const cp = rw(i); if (!cp) break;
                s += cp >= 32 && cp < 127 ? String.fromCharCode(cp) : "?";
            }
            return s;
        }
        function decodeString(ptr) {
            if (!ptr) return null;
            const t = rb(ptr);
            if (t === 0xe0) return decodeE0(ptr, 80);
            if (t === 0xe1) return decodeE1(ptr, 80);
            if (t === 0xe2) return decodeE2(ptr, 80);
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
                const id = (rb(base) << 8) | rb(base + 1);
                const len = (rb(base + 2) << 8) | rb(base + 3);
                const data = rw(base + 4);
                const flags = (rb(base + 8) << 8) | rb(base + 9);
                const words = [];
                for (let w = 0; w < Math.min(len, 12); w++) words.push(rw(data + w * 4));
                out.push({ id, len, data, flags, words });
            }
            return out;
        }
        function hwName(addr) { return decodeString(rw(addr + OFF_NAME)); }
        function dictWords(addr) {
            const out = [];
            parseProps(rw(addr + OFF_PROPS)).forEach((p) => {
                if (p.id !== 1) return;
                p.words.forEach((w) => { const d = decodeDictWord(w); if (d) out.push(d); });
            });
            return out;
        }
        function kindsOf(addr) {
            const names = [];
            parseProps(rw(addr + OFF_PROPS)).forEach((p) => {
                if (p.id !== 2) return;
                p.words.forEach((w) => {
                    if (!isObj(w)) return;
                    const n = hwName(w);
                    if (n) names.push(n);
                });
            });
            return names;
        }
        function children(addr) {
            const kids = [];
            let c = rw(addr + OFF_CHILD);
            for (let i = 0; i < 80 && c; i++) { kids.push(c); c = rw(c + OFF_SIBLING); }
            return kids;
        }
        function bitsMsb(addr) {
            const bits = [];
            for (let n = 0; n < numAttr * 8; n++) {
                const byte = rb(addr + 1 + Math.floor(n / 8));
                if (((byte >> (7 - (n % 8))) & 1) === 1) bits.push(n);
            }
            return bits;
        }
        function bitsLsb(addr) {
            const bits = [];
            for (let n = 0; n < numAttr * 8; n++) {
                const byte = rb(addr + 1 + (n >> 3));
                if ((byte & (1 << (n & 7))) !== 0) bits.push(n);
            }
            return bits;
        }
        function attrBytes(addr) {
            const bytes = [];
            for (let i = 0; i < numAttr; i++) bytes.push(rb(addr + 1 + i));
            return bytes;
        }
        function scanFnStrings(fn, capBytes) {
            if (!fn) return [];
            const t0 = rb(fn);
            if (t0 !== 0xc0 && t0 !== 0xc1) return [];
            const hits = [];
            const lim = fn + (capBytes || 160);
            for (let i = fn; i < lim; i++) {
                const s = decodeString(i);
                if (s && s.length >= 2 && /[A-Za-z]/.test(s)) hits.push({ at: i, s: s.slice(0, 60) });
                if (rb(i) === 0x60) {
                    const d = decodeDictWord(i);
                    if (d) hits.push({ at: i, dict: d });
                }
            }
            // also scan word-aligned pointers in the function body
            for (let i = fn; i + 4 < lim; i++) {
                const w = rw(i);
                const s = decodeString(w);
                if (s && s.length >= 2 && /[A-Za-z]/.test(s)) hits.push({ at: i, ptr: w, s: s.slice(0, 60) });
            }
            const uniq = [];
            const seen = {};
            hits.forEach((h) => {
                const k = (h.s || h.dict) + "@" + (h.ptr || h.at);
                if (seen[k]) return;
                seen[k] = 1;
                uniq.push(h);
            });
            return uniq.slice(0, 8);
        }
        function getProp(addr, id) {
            return parseProps(rw(addr + OFF_PROPS)).find((p) => p.id === id) || null;
        }
        function displayName(addr) {
            const p17 = getProp(addr, 17);
            if (p17 && p17.words[0]) {
                const w = p17.words[0];
                const s = decodeString(w);
                if (s) return { via: "prop17-string", name: s };
                const hits = scanFnStrings(w, 200);
                const str = hits.find((h) => h.s);
                if (str) return { via: "prop17-fn-string", name: str.s, hits: hits.slice(0, 4) };
                return { via: "prop17-fn", fn: w, fnType: rb(w), hits };
            }
            const hw = hwName(addr);
            if (hw) return { via: "hardware", name: hw };
            const d = dictWords(addr).filter((x) => !/^(rooms|things|people|direction|directions|backdrops|facades|device)$/i.test(x));
            if (d.length) return { via: "dict", name: d.join(" ") };
            return { via: "none", name: "" };
        }
        const all = [];
        const seen = new Set();
        if (isObj(classAddr)) {
            let a = classAddr;
            for (let i = 0; i < 30000; i++) {
                if (!isObj(a) || seen.has(a)) break;
                seen.add(a);
                all.push(a);
                const next = rw(a + OFF_NEXT);
                if (!next) break;
                a = next;
            }
        }
        function isRoom(addr) { return kindsOf(addr).some((n) => /^K1_room$/i.test(n) || /_room$/i.test(n)); }
        function isPerson(addr) { return kindsOf(addr).some((n) => /person|man|woman|animal/i.test(n)); }
        let compass = 0;
        for (let i = 0; i < all.length; i++) if (hwName(all[i]) === "compass") { compass = all[i]; break; }
        const compassKids = compass ? children(compass).map((c) => ({
            addr: c,
            dict: dictWords(c),
            kinds: kindsOf(c),
            display: displayName(c),
            props: parseProps(rw(c + OFF_PROPS)).map((p) => ({
                id: p.id,
                indiv: p.id >= indivStart,
                words: p.words.slice(0, 4).map((w) => {
                    if (isObj(w)) return { w, k: "obj", dict: dictWords(w).slice(0, 3), kinds: kindsOf(w).slice(0, 2) };
                    const d = decodeDictWord(w); if (d) return { w, k: "dict", t: d };
                    const s = decodeString(w); if (s) return { w, k: "str", t: s.slice(0, 40) };
                    if (rb(w) === 0xc0 || rb(w) === 0xc1) return { w, k: "fn", t0: rb(w) };
                    if (w < 4096) return { w, k: "small" };
                    return { w, k: "other", b0: rb(w) };
                })
            }))
        })) : [];
        // player: K8_person contained in a room, empty dict preferred (yourself)
        let playerAddr = 0;
        const containedPersons = [];
        all.forEach((addr) => {
            const par = rw(addr + OFF_PARENT);
            if (!isObj(par) || !isPerson(addr) || !isRoom(par)) return;
            containedPersons.push({ addr, dict: dictWords(addr), parent: par });
        });
        const emptyDict = containedPersons.filter((p) => !p.dict.length);
        playerAddr = (emptyDict[0] || containedPersons[0] || {}).addr || 0;
        const locAddr = playerAddr ? rw(playerAddr + OFF_PARENT) : 0;
        const playerGlobals = [];
        if (playerAddr) {
            for (let g = 0; g < 200; g++) {
                const v = rw(ramstart + 16 + g * 4);
                if (v === playerAddr) playerGlobals.push(g);
            }
        }
        const locRoomProps = locAddr ? parseProps(rw(locAddr + OFF_PROPS)).filter((p) => {
            if (p.id === 2) return false;
            return p.words.some((w) => isObj(w) && isRoom(w));
        }).map((p) => ({
            id: p.id,
            dests: p.words.filter((w) => isObj(w) && isRoom(w)).map((w) => ({
                addr: w, dict: dictWords(w), display: displayName(w)
            }))
        })) : [];
        const locKids = locAddr ? children(locAddr).filter((c) => c !== playerAddr).map((c) => ({
            addr: c,
            dict: dictWords(c).slice(0, 8),
            kinds: kindsOf(c).slice(0, 3),
            display: displayName(c),
            msb: bitsMsb(c),
            lsb: bitsLsb(c),
            bytes: attrBytes(c),
            nKids: children(c).length
        })) : [];
        const inventory = playerAddr ? children(playerAddr).map((c) => ({
            addr: c,
            dict: dictWords(c).slice(0, 8),
            kinds: kindsOf(c).slice(0, 3),
            display: displayName(c),
            msb: bitsMsb(c),
            lsb: bitsLsb(c),
            bytes: attrBytes(c)
        })) : [];
        const look = (() => {
            try {
                const el = document.querySelector(".BufferWindow, #windowport");
                return ((el && el.innerText) || "").slice(-400);
            } catch (e) { return ""; }
        })();
        return {
            ramstart, numAttr, indivStart, classAddr, objectCount: all.length,
            accel,
            playerAddr,
            playerDisplay: playerAddr ? displayName(playerAddr) : null,
            playerKinds: playerAddr ? kindsOf(playerAddr) : [],
            playerGlobals,
            playerMsb: playerAddr ? bitsMsb(playerAddr) : [],
            playerLsb: playerAddr ? bitsLsb(playerAddr) : [],
            playerBytes: playerAddr ? attrBytes(playerAddr) : [],
            locAddr,
            locDisplay: locAddr ? displayName(locAddr) : null,
            locDict: locAddr ? dictWords(locAddr) : [],
            locKinds: locAddr ? kindsOf(locAddr) : [],
            locRoomProps,
            locKids,
            inventory,
            compassKids: compassKids.map((k) => ({
                addr: k.addr,
                dict: k.dict,
                display: k.display,
                smalls: k.props.flatMap((p) => p.words.filter((w) => w.k === "small").map((w) => ({ prop: p.id, val: w.w }))),
                fns: k.props.filter((p) => p.words.some((w) => w.k === "fn")).map((p) => ({ id: p.id, words: p.words })),
                strs: k.props.filter((p) => p.words.some((w) => w.k === "str")).map((p) => ({ id: p.id, words: p.words }))
            })),
            look
        };
    };

    const before = await page.evaluate(helpers);

    // Movement trials: try each compass dict word until parent changes.
    const moveTrials = [];
    const dirs = (before.compassKids || []).map((k) => (k.dict || []).find((d) => CARD.indexOf(d) >= 0)).filter(Boolean);
    const uniqueDirs = [...new Set(dirs)];
    for (const d of uniqueDirs.slice(0, 8)) {
        const locBefore = before.locAddr;
        await inject(d);
        const after = await page.evaluate(helpers);
        const changed = after.locAddr !== locBefore;
        moveTrials.push({
            command: d,
            locBefore,
            locAfter: after.locAddr,
            changed,
            locDictAfter: after.locDict,
            locDisplayAfter: after.locDisplay,
            look: after.look && after.look.slice(-180)
        });
        if (changed) {
            // go back if possible
            await inject("look");
            break;
        }
    }

    // OPEN trial: prefer a locKid whose kinds mention container/door, else first dict-named kid.
    let openTrial = null;
    const openCand = (before.locKids || []).find((k) => (k.kinds || []).some((n) => /container|door/i.test(n)))
        || (before.locKids || []).find((k) => (k.dict || []).length && !/sky|backdrop/i.test((k.dict || []).join(" ")));
    if (openCand && openCand.dict && openCand.dict[0]) {
        const noun = openCand.dict[0];
        await inject("open " + noun);
        const after = await page.evaluate((addr) => {
            const rb = (a) => Quixe.ReadByte(a) & 0xff;
            const internals = Quixe.get_vm_internals();
            const numAttr = (internals.accel_params[7] | 0) || 7;
            const bytes = [];
            for (let i = 0; i < numAttr; i++) bytes.push(rb(addr + 1 + i));
            const msb = [], lsb = [];
            for (let n = 0; n < numAttr * 8; n++) {
                const byteM = bytes[Math.floor(n / 8)];
                if (((byteM >> (7 - (n % 8))) & 1) === 1) msb.push(n);
                const byteL = bytes[n >> 3];
                if ((byteL & (1 << (n & 7))) !== 0) lsb.push(n);
            }
            const el = document.querySelector(".BufferWindow, #windowport");
            return { bytes, msb, lsb, look: ((el && el.innerText) || "").slice(-220) };
        }, openCand.addr);
        openTrial = {
            command: "open " + noun,
            addr: openCand.addr,
            dict: openCand.dict,
            kinds: openCand.kinds,
            beforeBytes: openCand.bytes,
            afterBytes: after.bytes,
            bytesChanged: JSON.stringify(openCand.bytes) !== JSON.stringify(after.bytes),
            msbBefore: openCand.msb,
            msbAfter: after.msb,
            msbFlipped: after.msb.filter((b) => openCand.msb.indexOf(b) < 0).concat(openCand.msb.filter((b) => after.msb.indexOf(b) < 0)),
            lsbBefore: openCand.lsb,
            lsbAfter: after.lsb,
            lsbFlipped: after.lsb.filter((b) => openCand.lsb.indexOf(b) < 0).concat(openCand.lsb.filter((b) => after.lsb.indexOf(b) < 0)),
            look: after.look
        };
    }

    await browser.close();
    const out = { story, errors, before, moveTrials, openTrial };
    const outPath = path.join(ROOT, "harness", "_d38_p2_trials.out.json");
    fs.writeFileSync(outPath, JSON.stringify(out, null, 2));
    console.log("wrote", outPath);
    console.log(JSON.stringify({
        playerAddr: before.playerAddr,
        playerDisplay: before.playerDisplay,
        playerGlobals: before.playerGlobals,
        locDisplay: before.locDisplay,
        locDict: before.locDict,
        locRoomProps: before.locRoomProps,
        locKids: (before.locKids || []).map((k) => ({ dict: k.dict, kinds: k.kinds, display: k.display, msb: k.msb, lsb: k.lsb })),
        inventory: before.inventory,
        compassSample: (before.compassKids || []).slice(0, 4),
        moveTrials,
        openTrial,
        look: before.look && before.look.slice(-250),
        errors
    }, null, 2));
})().catch((e) => { console.error("FATAL", e); process.exit(1); });
