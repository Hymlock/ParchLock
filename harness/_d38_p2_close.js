/* D38 P2 remaining-gaps live probe — read-only. No product files. No GlulxRamProvider.
 * Closes: identifier-names (if live), door_dir/Map_Storage, parent change after
 * a real move, OPEN bit flip on a real container, second-story check.
 * Usage: node harness/_d38_p2_close.js [story.js]
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
    for (let i = 0; i < 30 && !(await page.locator(".Input.LineInput").count()); i++) {
        await page.keyboard.press("Space");
        await page.waitForTimeout(200);
    }
    async function inject(cmd) {
        if (!(await page.locator(".Input.LineInput").count())) return false;
        await page.evaluate((t) => { Input.Clear(); Input.Inject(t, true); }, cmd);
        await page.waitForTimeout(700);
        return true;
    }
    // Dismiss yes/no + tutorial chatter without story-specific answers.
    for (let i = 0; i < 8; i++) {
        await inject("yes");
        await inject("no");
    }
    for (let i = 0; i < 12; i++) {
        await inject("look");
        const t = await page.evaluate(() => {
            const el = document.querySelector(".BufferWindow, #windowport");
            return ((el && el.innerText) || "").slice(-240);
        });
        if (/You can see|is a |There is |You are |This is |north|south|east|west/i.test(t)
            && !/remember our name|Can you hear me|half person/i.test(t)) break;
        await inject("z");
    }

    const helpersSrc = () => {
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
        const endmem = rw(16);
        const decoding = (internals && internals.stringtable) ? (internals.stringtable >>> 0) : rw(28);
        const numAttr = (accel[7] | 0) || 7;
        const indivStart = accel[1] | 0;
        const classAddr = accel[2] | 0;
        const cpv = accel[8] | 0;
        const classesTable = accel[0] | 0;
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
            cap = cap || 48;
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
            cap = cap || 48;
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
        function decodeString(ptr) {
            if (!ptr) return null;
            const t = rb(ptr);
            if (t === 0xe0) return decodeE0(ptr, 48);
            if (t === 0xe1) return decodeE1(ptr, 48);
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
                for (let w = 0; w < Math.min(len, 8); w++) words.push(rw(data + w * 4));
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
        function attrBytes(addr) {
            const bytes = [];
            for (let i = 0; i < numAttr; i++) bytes.push(rb(addr + 1 + i));
            return bytes;
        }
        function getProp(addr, id) {
            return parseProps(rw(addr + OFF_PROPS)).find((p) => p.id === id) || null;
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
        const isRoom = (addr) => kindsOf(addr).some((n) => /^K1_room$/i.test(n) || /_room$/i.test(n));
        const isPerson = (addr) => kindsOf(addr).some((n) => /person|man|woman|animal/i.test(n));
        let compass = 0;
        for (let i = 0; i < all.length; i++) if (hwName(all[i]) === "compass") { compass = all[i]; break; }
        const compassKids = compass ? children(compass) : [];

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

        // Identifier-names table: 5 (addr,count) pairs near cpv/classes.
        function looksLikeNameList(addr, count) {
            if (!addr || count < 4 || count > 8000) return null;
            const sample = [];
            let good = 0;
            const n = Math.min(count, 10);
            for (let i = 0; i < n; i++) {
                const s = decodeString(rw(addr + i * 4));
                if (s && s.length >= 1 && s.length < 40 && /[A-Za-z_]/.test(s)) {
                    good++; sample.push(s);
                }
            }
            return good >= 4 ? sample : null;
        }
        const idHits = [];
        const scanLo = Math.max(36, (cpv || ramstart) - 0x20000);
        const scanHi = Math.min(endmem - 48, (classesTable || ramstart) + 0x20000);
        for (let a = scanLo; a < scanHi; a += 4) {
            const c0 = rw(a + 4), a0 = rw(a);
            const c1 = rw(a + 12), a1 = rw(a + 8);
            const c2 = rw(a + 20), a2 = rw(a + 16);
            if (c0 < 8 || c0 > 500 || c2 < 8 || c2 > 80 || c1 < 8 || c1 > 8000) continue;
            const s0 = looksLikeNameList(a0, c0);
            const s2 = looksLikeNameList(a2, c2);
            if (!s0 || !s2) continue;
            const s1 = looksLikeNameList(a1, Math.min(c1, 20));
            idHits.push({
                tableAddr: a,
                common: { addr: a0, count: c0, sample: s0 },
                indiv: { addr: a1, count: c1, sample: s1 },
                attrs: { addr: a2, count: c2, sample: s2 }
            });
            if (idHits.length >= 3) break;
        }
        function namesAt(addr, count, cap) {
            const out = [];
            for (let i = 0; i < Math.min(count, cap || 80); i++) {
                out.push(decodeString(rw(addr + i * 4)) || "");
            }
            return out;
        }
        const idBest = idHits[0] || null;
        const commonNames = idBest ? namesAt(idBest.common.addr, idBest.common.count, 80) : [];
        const attrNames = idBest ? namesAt(idBest.attrs.addr, idBest.attrs.count, 64) : [];
        const indivNames = idBest ? namesAt(idBest.indiv.addr, Math.min(idBest.indiv.count, 80), 80) : [];
        function propName(id) {
            if (id >= 1 && id < indivStart && commonNames[id - 1]) return commonNames[id - 1];
            if (id >= indivStart && indivNames[id - indivStart]) return indivNames[id - indivStart];
            return null;
        }

        const locProps = locAddr ? parseProps(rw(locAddr + OFF_PROPS)).map((p) => ({
            id: p.id,
            name: propName(p.id),
            indiv: p.id >= indivStart,
            words: p.words.slice(0, 4).map((w) => {
                if (isObj(w)) return { w, k: "obj", dict: dictWords(w).slice(0, 4), kinds: kindsOf(w).slice(0, 2), hw: hwName(w) };
                const d = decodeDictWord(w); if (d) return { w, k: "dict", t: d };
                const s = decodeString(w); if (s) return { w, k: "str", t: s.slice(0, 40) };
                if (w < 4096) return { w, k: "small" };
                return { w, k: "other", b0: rb(w) };
            })
        })) : [];

        const compassInfo = compassKids.map((c) => {
            const props = parseProps(rw(c + OFF_PROPS)).map((p) => ({
                id: p.id,
                name: propName(p.id),
                words: p.words.slice(0, 4)
            }));
            return {
                addr: c,
                dict: dictWords(c),
                props: props.filter((p) => p.words.some((w) => w < 4096) || /door|map|dir|n_to|vector|index/i.test(p.name || "")),
                allNamed: props.filter((p) => p.name).map((p) => ({ id: p.id, name: p.name, words: p.words.slice(0, 3) }))
            };
        });

        // Map_Storage hunt: words equal to a known room dest near loc.
        const destRooms = [];
        locProps.forEach((p) => {
            p.words.forEach((w) => {
                if (w.k === "obj" && (w.kinds || []).some((n) => /K1_room|_room/i.test(n))) destRooms.push(w.w);
            });
        });
        const mapHits = [];
        if (destRooms.length) {
            const target = destRooms[0];
            const lo = ramstart;
            const hi = Math.min(endmem - 4, ramstart + 2 * 1024 * 1024);
            for (let a = lo; a < hi; a += 4) {
                if (rw(a) !== target) continue;
                const neigh = [];
                for (let k = -4; k <= 4; k++) {
                    const w = rw(a + k * 4);
                    neigh.push({ off: k, w, obj: isObj(w), dict: isObj(w) ? dictWords(w).slice(0, 3) : [], room: isObj(w) && isRoom(w) });
                }
                mapHits.push({ at: a, neigh });
                if (mapHits.length >= 8) break;
            }
        }

        // Container candidates: kinds mentioning container, or children of location with extra kids.
        const containerKinds = [];
        all.forEach((addr) => {
            const hw = hwName(addr);
            if (hw && /container|openable|door/i.test(hw)) containerKinds.push({ addr, hw });
        });
        const locKids = locAddr ? children(locAddr).filter((c) => c !== playerAddr).map((c) => ({
            addr: c,
            dict: dictWords(c).slice(0, 6),
            kinds: kindsOf(c).slice(0, 4),
            hw: hwName(c) || "",
            msb: bitsMsb(c),
            bytes: attrBytes(c),
            nKids: children(c).length
        })) : [];
        const inventory = playerAddr ? children(playerAddr).map((c) => ({
            addr: c,
            dict: dictWords(c).slice(0, 6),
            kinds: kindsOf(c).slice(0, 4),
            msb: bitsMsb(c),
            bytes: attrBytes(c),
            nKids: children(c).length
        })) : [];

        const look = (() => {
            try {
                const el = document.querySelector(".BufferWindow, #windowport");
                return ((el && el.innerText) || "").slice(-500);
            } catch (e) { return ""; }
        })();

        return {
            ramstart, endmem, numAttr, indivStart, classAddr, objectCount: all.length,
            accel, cpv, classesTable,
            playerAddr,
            playerDict: playerAddr ? dictWords(playerAddr) : [],
            playerKinds: playerAddr ? kindsOf(playerAddr) : [],
            playerMsb: playerAddr ? bitsMsb(playerAddr) : [],
            locAddr,
            locDict: locAddr ? dictWords(locAddr) : [],
            locKinds: locAddr ? kindsOf(locAddr) : [],
            locHw: locAddr ? hwName(locAddr) : "",
            locProps,
            locKids,
            inventory,
            compassInfo,
            idHits: idHits.slice(0, 2),
            attrNames,
            commonNames: commonNames.map((n, i) => ({ id: i + 1, name: n })).filter((x) => x.name),
            destRooms,
            mapHits: mapHits.slice(0, 5),
            containerKinds: containerKinds.slice(0, 20),
            look
        };
    };

    const before = await page.evaluate(helpersSrc);

    // Movement: try compass dict words until parent(player) changes.
    const moveTrials = [];
    const dirs = (before.compassInfo || []).map((k) => (k.dict || []).find((d) => CARD.indexOf(d) >= 0)).filter(Boolean);
    const uniqueDirs = [...new Set(dirs)];
    let moved = null;
    for (const d of uniqueDirs.slice(0, 8)) {
        const locBefore = before.locAddr;
        await inject(d);
        const after = await page.evaluate(helpersSrc);
        const changed = after.locAddr !== locBefore;
        moveTrials.push({
            command: d,
            locBefore,
            locAfter: after.locAddr,
            changed,
            locDictAfter: after.locDict,
            look: after.look && after.look.slice(-180)
        });
        if (changed) { moved = after; break; }
    }

    // OPEN: prefer a kid whose kind name mentions container/door, else inventory container.
    const pool = [].concat(before.locKids || [], before.inventory || []);
    const openCand = pool.find((k) => (k.kinds || []).some((n) => /container|door|openable/i.test(n)))
        || pool.find((k) => (k.dict || []).length && !/sky|backdrop|facade|player/i.test((k.dict || []).join(" ")));
    let openTrial = null;
    if (openCand && openCand.dict && openCand.dict[0]) {
        const noun = openCand.dict[0];
        await inject("open " + noun);
        const after = await page.evaluate((addr) => {
            const rb = (a) => Quixe.ReadByte(a) & 0xff;
            const internals = Quixe.get_vm_internals();
            const numAttr = (internals.accel_params[7] | 0) || 7;
            const bytes = [];
            for (let i = 0; i < numAttr; i++) bytes.push(rb(addr + 1 + i));
            const msb = [];
            for (let n = 0; n < numAttr * 8; n++) {
                const byteM = bytes[Math.floor(n / 8)];
                if (((byteM >> (7 - (n % 8))) & 1) === 1) msb.push(n);
            }
            const el = document.querySelector(".BufferWindow, #windowport");
            return { bytes, msb, look: ((el && el.innerText) || "").slice(-220) };
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
            msbFlipped: after.msb.filter((b) => openCand.msb.indexOf(b) < 0).concat((openCand.msb || []).filter((b) => after.msb.indexOf(b) < 0)),
            look: after.look
        };
    }

    await browser.close();
    const out = { story, errors, before, moveTrials, moved: moved ? {
        locAddr: moved.locAddr, locDict: moved.locDict, locKids: moved.locKids, locProps: moved.locProps
    } : null, openTrial };
    const tag = path.basename(story).replace(/\W+/g, "_").slice(0, 24);
    const outPath = path.join(ROOT, "harness", "_d38_p2_close." + tag + ".out.json");
    fs.writeFileSync(outPath, JSON.stringify(out, null, 2));
    console.log("wrote", outPath);
    console.log(JSON.stringify({
        story,
        errors,
        playerAddr: before.playerAddr,
        locDict: before.locDict,
        locHw: before.locHw,
        attrNames: before.attrNames,
        commonNamed: (before.commonNames || []).filter((x) => /name|door|map|n_to|found|print|open|vector|index|dir/i.test(x.name)),
        locPropsNamed: (before.locProps || []).filter((p) => p.name || (p.words || []).some((w) => w.k === "obj")),
        compassNamed: (before.compassInfo || []).slice(0, 4).map((c) => ({ dict: c.dict, allNamed: c.allNamed })),
        destRooms: before.destRooms,
        mapHits: (before.mapHits || []).slice(0, 3),
        containerKinds: before.containerKinds,
        locKids: (before.locKids || []).map((k) => ({ dict: k.dict, kinds: k.kinds, msb: k.msb })),
        inventory: before.inventory,
        moveTrials,
        openTrial,
        look: before.look && before.look.slice(-250)
    }, null, 2));
})().catch((e) => { console.error("FATAL", e); process.exit(1); });
