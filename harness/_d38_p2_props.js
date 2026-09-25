/* D38 P2 property-table dump — read-only. No product files. No GlulxRamProvider.
 * Follow-up to _d38_p2_deep.js: printed names, I7 map props, player global, attrs.
 * Usage: node harness/_d38_p2_props.js [story.js]
 */
const { chromium } = require("playwright");
const { pathToFileURL } = require("node:url");
const path = require("node:path");
const ROOT = path.resolve(__dirname, "..");

(async () => {
    const story = process.argv[2] || "games/CounterfeitMonkey.gblorb.js";
    const browser = await chromium.launch({
        executablePath: process.env.PW_CHROME,
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
        await page.waitForTimeout(250);
    }
    async function inject(cmd) {
        if (!(await page.locator(".Input.LineInput").count())) return false;
        await page.evaluate((t) => { Input.Clear(); Input.Inject(t, true); }, cmd);
        await page.waitForTimeout(1000);
        return true;
    }
    await inject("look");
    await inject("no");
    await inject("no");
    await inject("look");
    await inject("inventory");

    const dump = await page.evaluate(() => {
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

        function isObj(addr) {
            return !!(addr && addr >= ramstart && rb(addr) === 0x70);
        }
        function decodeE0(ptr, cap) {
            if (rb(ptr) !== 0xe0) return null;
            let s = "";
            cap = cap || 80;
            for (let i = ptr + 1; i < ptr + 1 + cap; i++) {
                const c = rb(i);
                if (!c) break;
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
                        const cp = rw(i);
                        if (!cp) break;
                        s += cp >= 32 && cp < 127 ? String.fromCharCode(cp) : "?";
                        i += 4;
                    }
                    node = root; continue;
                }
                s += "*";
                node = root;
            }
            return s;
        }
        function decodeE2(ptr, cap) {
            if (rb(ptr) !== 0xe2) return null;
            let s = "";
            cap = cap || 80;
            for (let i = ptr + 4; i + 4 <= ptr + 4 + cap * 4; i += 4) {
                const cp = rw(i);
                if (!cp) break;
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
                const c = rb(ptr + i);
                if (!c) break;
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
        function classify(w) {
            if (!w) return { w, kind: "zero" };
            if (isObj(w)) return { w, kind: "obj" };
            if (rb(w) === 0x60) return { w, kind: "dict", text: decodeDictWord(w) };
            const s = decodeString(w);
            if (s != null) return { w, kind: "str", text: s };
            const t = rb(w);
            if (t === 0xc0 || t === 0xc1) return { w, kind: "fn", fnType: t };
            if (w < 1024) return { w, kind: "small" };
            return { w, kind: "other", byte0: t };
        }
        function hwName(addr) {
            return decodeString(rw(addr + OFF_NAME));
        }
        function dictWords(addr) {
            const out = [];
            parseProps(rw(addr + OFF_PROPS)).forEach((p) => {
                if (p.id !== 1) return;
                p.words.forEach((w) => {
                    const d = decodeDictWord(w);
                    if (d) out.push(d);
                });
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
        function isRoom(addr) {
            return kindsOf(addr).some((n) => /^K1_room$/i.test(n) || /_room$/i.test(n));
        }
        function isPerson(addr) {
            return kindsOf(addr).some((n) => /person|man|woman|animal/i.test(n));
        }
        function children(addr) {
            const kids = [];
            let c = rw(addr + OFF_CHILD);
            for (let i = 0; i < 80 && c; i++) {
                kids.push(c);
                c = rw(c + OFF_SIBLING);
            }
            return kids;
        }
        function attrsOf(addr) {
            const bits = [];
            for (let n = 0; n < numAttr * 8; n++) {
                const byte = rb(addr + 1 + Math.floor(n / 8));
                if (((byte >> (7 - (n % 8))) & 1) === 1) bits.push(n);
            }
            return bits;
        }
        function dumpObj(addr, label) {
            if (!isObj(addr)) return { label, addr, error: "not obj" };
            const props = parseProps(rw(addr + OFF_PROPS)).map((p) => ({
                id: p.id,
                indiv: p.id >= indivStart,
                len: p.len,
                flags: p.flags,
                words: p.words.map(classify)
            }));
            const stringProps = [];
            props.forEach((p) => {
                p.words.forEach((w) => {
                    if (w.kind === "str" && w.text) stringProps.push({ prop: p.id, text: w.text });
                });
            });
            const roomValued = [];
            props.forEach((p) => {
                p.words.forEach((w) => {
                    if (w.kind === "obj" && isRoom(w.w)) {
                        roomValued.push({
                            prop: p.id,
                            dest: w.w,
                            destDict: dictWords(w.w),
                            destKinds: kindsOf(w.w)
                        });
                    }
                });
            });
            return {
                label,
                addr,
                hw: hwName(addr) || "",
                dict: dictWords(addr),
                kinds: kindsOf(addr),
                parent: rw(addr + OFF_PARENT),
                nKids: children(addr).length,
                attrs: attrsOf(addr),
                nProps: props.length,
                nIndiv: props.filter((p) => p.indiv).length,
                stringProps,
                roomValued,
                props
            };
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

        let compass = 0;
        for (let i = 0; i < all.length; i++) {
            if (hwName(all[i]) === "compass") { compass = all[i]; break; }
        }
        const compassKids = compass ? children(compass) : [];

        const personsInRooms = [];
        all.forEach((addr) => {
            const par = rw(addr + OFF_PARENT);
            if (isPerson(addr) && isObj(par) && isRoom(par)) {
                personsInRooms.push({
                    addr,
                    dict: dictWords(addr),
                    kinds: kindsOf(addr),
                    parent: par,
                    parentDict: dictWords(par),
                    nKids: children(addr).length,
                    attrs: attrsOf(addr)
                });
            }
        });

        const playerGuess = personsInRooms.slice().sort((a, b) => b.nKids - a.nKids)[0] || null;
        const playerAddr = playerGuess ? playerGuess.addr : 0;
        const locAddr = playerAddr ? rw(playerAddr + OFF_PARENT) : 0;

        const globals = [];
        for (let g = 0; g < 64; g++) {
            const addr = ramstart + g * 4;
            const v = rw(addr);
            const hit = {
                g,
                addr,
                v,
                isPlayer: v === playerAddr,
                isLoc: v === locAddr,
                isObj: isObj(v)
            };
            if (isObj(v)) {
                hit.dict = dictWords(v);
                hit.kinds = kindsOf(v).slice(0, 3);
                hit.hw = hwName(v) || "";
            }
            globals.push(hit);
        }
        const playerGlobals = globals.filter((g) => g.isPlayer);
        const locGlobals = globals.filter((g) => g.isLoc);

        const locDump = dumpObj(locAddr, "location");
        const playerDump = dumpObj(playerAddr, "player");
        const invAddr = playerAddr ? children(playerAddr)[0] : 0;
        const invDump = invAddr ? dumpObj(invAddr, "inventory0") : null;
        const north = compassKids[0] ? dumpObj(compassKids[0], "compass0") : null;
        const sky = locAddr ? children(locAddr).find((c) => c !== playerAddr) : 0;
        const skyDump = sky ? dumpObj(sky, "locChild0") : null;

        // Scan ALL rooms for individual props that point at other rooms (map).
        const rooms = all.filter(isRoom);
        const mapSample = [];
        rooms.slice(0, 8).forEach((r) => {
            const d = dumpObj(r, "room");
            if (d.roomValued && d.roomValued.length) {
                mapSample.push({
                    addr: r,
                    dict: d.dict,
                    roomValued: d.roomValued,
                    stringProps: d.stringProps
                });
            }
        });

        // Frequency of string-valued property ids across all objects (printed-name hunt).
        const strPropVotes = {};
        const fnPropVotes = {};
        all.forEach((addr) => {
            parseProps(rw(addr + OFF_PROPS)).forEach((p) => {
                p.words.forEach((w) => {
                    if (decodeString(w)) strPropVotes[p.id] = (strPropVotes[p.id] || 0) + 1;
                    const t = rb(w);
                    if (t === 0xc0 || t === 0xc1) fnPropVotes[p.id] = (fnPropVotes[p.id] || 0) + 1;
                });
            });
        });
        const topStrProps = Object.keys(strPropVotes).map((k) => ({ prop: k | 0, n: strPropVotes[k] }))
            .sort((a, b) => b.n - a.n).slice(0, 12);
        const topFnProps = Object.keys(fnPropVotes).map((k) => ({ prop: k | 0, n: fnPropVotes[k] }))
            .sort((a, b) => b.n - a.n).slice(0, 12);

        // Sample strings from the top string prop.
        const topStr = topStrProps[0] ? topStrProps[0].prop : 0;
        const strSamples = [];
        if (topStr) {
            for (let i = 0; i < all.length && strSamples.length < 20; i++) {
                parseProps(rw(all[i] + OFF_PROPS)).forEach((p) => {
                    if (p.id !== topStr) return;
                    p.words.forEach((w) => {
                        const t = decodeString(w);
                        if (t && strSamples.length < 20) {
                            strSamples.push({ addr: all[i], dict: dictWords(all[i]), text: t, kinds: kindsOf(all[i]).slice(0, 2) });
                        }
                    });
                });
            }
        }

        const lookText = (() => {
            try {
                const el = document.querySelector(".BufferWindow, #windowport");
                return ((el && el.innerText) || "").slice(-600);
            } catch (e) { return ""; }
        })();

        return {
            ramstart,
            accel,
            numAttr,
            indivStart,
            objectCount: all.length,
            personsInRooms,
            playerGlobals: playerGlobals.map((g) => g.g),
            locGlobals: locGlobals.map((g) => g.g),
            interestingGlobals: globals.filter((g) => g.isPlayer || g.isLoc || (g.isObj && g.kinds && g.kinds.some((k) => /person|room/i.test(k)))),
            location: locDump,
            player: playerDump,
            inventory0: invDump,
            compass0: north,
            locChild0: skyDump,
            mapSample,
            topStrProps,
            topFnProps,
            strSamples,
            lookText
        };
    });

    // Movement trial using a dictionary compass word, not a printed name.
    let moveTrial = null;
    await inject("north");
    moveTrial = await page.evaluate((prevLoc) => {
        if (typeof Quixe === "undefined") return { error: "no quixe" };
        const rb = (a) => Quixe.ReadByte(a) & 0xff;
        const rw = (a) => ((rb(a) << 24) | (rb(a + 1) << 16) | (rb(a + 2) << 8) | rb(a + 3)) >>> 0;
        const internals = Quixe.get_vm_internals ? Quixe.get_vm_internals() : null;
        const accel = internals && internals.accel_params ? Array.from(internals.accel_params) : [];
        const numAttr = (accel[7] | 0) || 7;
        const ramstart = rw(8);
        const OFF_PARENT = 1 + numAttr + 12;
        const OFF_PROPS = 1 + numAttr + 8;
        const OFF_NAME = 1 + numAttr + 4;
        function isObj(addr) { return !!(addr && addr >= ramstart && rb(addr) === 0x70); }
        function decodeDictWord(ptr) {
            if (!ptr || rb(ptr) !== 0x60) return null;
            let s = "";
            for (let i = 1; i <= 12; i++) {
                const c = rb(ptr + i);
                if (!c) break;
                if (c >= 32 && c < 127) s += String.fromCharCode(c);
            }
            return s;
        }
        function dictWords(addr) {
            const ptr = rw(addr + OFF_PROPS);
            const n = rw(ptr);
            const out = [];
            for (let i = 0; i < n && i < 80; i++) {
                const base = ptr + 4 + i * 10;
                const id = (rb(base) << 8) | rb(base + 1);
                if (id !== 1) continue;
                const len = (rb(base + 2) << 8) | rb(base + 3);
                const data = rw(base + 4);
                for (let w = 0; w < Math.min(len, 8); w++) {
                    const d = decodeDictWord(rw(data + w * 4));
                    if (d) out.push(d);
                }
            }
            return out;
        }
        const player = prevLoc.playerAddr;
        const loc = isObj(player) ? rw(player + OFF_PARENT) : 0;
        const look = (() => {
            try {
                const el = document.querySelector(".BufferWindow, #windowport");
                return ((el && el.innerText) || "").slice(-280);
            } catch (e) { return ""; }
        })();
        return {
            locBefore: prevLoc.locBefore,
            locAfter: loc,
            locChanged: loc !== prevLoc.locBefore,
            afterDict: loc ? dictWords(loc) : [],
            look
        };
    }, {
        playerAddr: dump.player && dump.player.addr,
        locBefore: dump.location && dump.location.addr
    });

    await browser.close();
    const slim = (obj) => {
        if (!obj) return obj;
        const copy = Object.assign({}, obj);
        if (copy.props) {
            copy.propIds = copy.props.map((p) => p.id);
            copy.indivIds = copy.props.filter((p) => p.indiv).map((p) => p.id);
            // Keep only props that are strings, rooms, small ints, or interesting
            copy.props = copy.props.filter((p) =>
                p.id === 1 || p.id === 2 || p.id === 3 ||
                p.words.some((w) => w.kind === "str" || w.kind === "obj" || w.kind === "fn" || w.kind === "small")
            );
        }
        return copy;
    };
    const out = {
        story,
        errors,
        ramstart: dump.ramstart,
        accel: dump.accel,
        numAttr: dump.numAttr,
        indivStart: dump.indivStart,
        objectCount: dump.objectCount,
        personsInRooms: dump.personsInRooms,
        playerGlobals: dump.playerGlobals,
        locGlobals: dump.locGlobals,
        interestingGlobals: dump.interestingGlobals,
        location: slim(dump.location),
        player: slim(dump.player),
        inventory0: slim(dump.inventory0),
        compass0: slim(dump.compass0),
        locChild0: slim(dump.locChild0),
        mapSample: dump.mapSample,
        topStrProps: dump.topStrProps,
        topFnProps: dump.topFnProps,
        strSamples: dump.strSamples,
        lookText: dump.lookText,
        moveTrial
    };
    console.log(JSON.stringify(out, null, 2));
})().catch((e) => { console.error("FATAL", e); process.exit(1); });
