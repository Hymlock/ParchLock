/* D38 P2 geometric Map_Storage + printed-name + OPEN probe.
 * Read-only. No product files. No GlulxRamProvider.
 *
 * Prior probes proved: 0x70 records, parent(player)=loc, LSB attrs 10/10,
 * property 1 = dict words, property 2 = kind chain, live north move
 * Back Alley (5524017) -> Sigil Street (5523697). They did NOT land
 * Map_Storage, clean printed names, or an in-scope OPEN bit flip.
 * door_dir reads as 0 on every compass object (CPV default).
 *
 * This probe:
 *   1. dumps north's real property table + CPV[1..40]
 *   2. diagnoses why "rooms"/"facades" survive kind-word subtraction
 *   3. after a real north move, searches dest-pointer hits for a
 *      rectangular Map_Storage such that
 *        storage[(srcKey-1)*nDir + col] == dest
 *        storage[(destKey-1)*nDir + opposite] == src
 *      trying keys: pid 25 (empirical room index), p82_local_map (334),
 *      and 0-based vs 1-based, nDir in {8,10,12,16,20,24}
 *   4. OPEN on an in-scope closed openable, else backpack after naming
 *      its parent room
 *
 * Usage: node harness/_d38_p2_geom.js [story.js]
 */
const { chromium } = require("playwright");
const { pathToFileURL } = require("node:url");
const path = require("node:path");
const fs = require("fs");
const ROOT = path.resolve(__dirname, "..");

const HELPERS = () => {
    if (typeof Quixe === "undefined" || typeof Quixe.ReadByte !== "function") {
        return { error: "no Quixe.ReadByte" };
    }
    const rb = (a) => Quixe.ReadByte(a) & 0xff;
    const rw = (a) => {
        if (typeof Quixe.ReadWord === "function") return Quixe.ReadWord(a) >>> 0;
        return ((rb(a) << 24) | (rb(a + 1) << 16) | (rb(a + 2) << 8) | rb(a + 3)) >>> 0;
    };
    const rs = (a) => ((rb(a) << 8) | rb(a + 1)) >>> 0;
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
    const isObj = (a) => !!(a && a >= ramstart && a < endmem && rb(a) === 0x70);

    function decodeE0(ptr, cap) {
        if (!ptr || rb(ptr) !== 0xe0) return null;
        let s = "";
        cap = cap || 48;
        for (let i = ptr + 1; i < ptr + 1 + cap; i++) {
            const c = rb(i); if (!c) break;
            s += c >= 32 && c < 127 ? String.fromCharCode(c) : "?";
        }
        return s;
    }
    function decodeE1(ptr, cap) {
        if (!ptr || rb(ptr) !== 0xe1 || !decoding) return null;
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
            const id = rs(base);
            const len = rs(base + 2);
            const data = rw(base + 4);
            const flags = rs(base + 8);
            const words = [];
            for (let w = 0; w < Math.min(len, 12); w++) words.push(rw(data + w * 4));
            out.push({ id, len, data, flags, words });
        }
        return out;
    }
    function hwName(addr) { return decodeString(rw(addr + OFF_NAME)) || ""; }
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
        idHits.push({ tableAddr: a, common: { addr: a0, count: c0 }, indiv: { addr: a1, count: c1 }, attrs: { addr: a2, count: c2 } });
        if (idHits.length >= 2) break;
    }
    function namesAt(addr, count, cap) {
        const out = [];
        for (let i = 0; i < Math.min(count, cap || 80); i++) out.push(decodeString(rw(addr + i * 4)) || "");
        return out;
    }
    const idBest = idHits[0] || null;
    const commonNames = idBest ? namesAt(idBest.common.addr, idBest.common.count, 80) : [];
    const attrNames = idBest ? namesAt(idBest.attrs.addr, idBest.attrs.count, 64) : [];
    const indivNames = idBest ? namesAt(idBest.indiv.addr, Math.min(idBest.indiv.count, 80), 80) : [];
    function propName(id) {
        if (id >= 1 && id - 1 < commonNames.length && commonNames[id - 1]) return commonNames[id - 1];
        if (id >= indivStart && id - indivStart < indivNames.length && indivNames[id - indivStart]) {
            return indivNames[id - indivStart];
        }
        return null;
    }

    const all = [];
    const seen = new Set();
    if (isObj(classAddr)) {
        let a = classAddr;
        for (let i = 0; i < 30000; i++) {
            if (!isObj(a) || seen.has(a)) break;
            seen.add(a); all.push(a);
            const next = rw(a + OFF_NEXT);
            if (!next) break;
            a = next;
        }
    }
    function dictWords(addr) {
        const out = [];
        parseProps(rw(addr + OFF_PROPS)).forEach((p) => {
            if (p.id !== 1) return;
            p.words.forEach((w) => { const d = decodeDictWord(w); if (d) out.push(d); });
        });
        return out;
    }
    function kindsOf(addr) {
        const names = [], objs = [];
        parseProps(rw(addr + OFF_PROPS)).forEach((p) => {
            if (p.id !== 2) return;
            p.words.forEach((w) => {
                if (!isObj(w)) return;
                objs.push(w);
                const n = hwName(w);
                if (n) names.push(n);
            });
        });
        return { names, objs };
    }
    function children(addr) {
        const kids = [];
        let c = rw(addr + OFF_CHILD);
        for (let i = 0; i < 80 && c; i++) { kids.push(c); c = rw(c + OFF_SIBLING); }
        return kids;
    }
    function bitsLsb(addr) {
        const names = [];
        for (let n = 0; n < numAttr * 8; n++) {
            const byte = rb(addr + 1 + Math.floor(n / 8));
            if (((byte >> (n % 8)) & 1) === 1) names.push(attrNames[n] || ("bit-" + n));
        }
        return names;
    }
    function attrBytes(addr) {
        const bytes = [];
        for (let i = 0; i < numAttr; i++) bytes.push(rb(addr + 1 + i));
        return bytes;
    }
    function propVal(addr, id) {
        const p = parseProps(rw(addr + OFF_PROPS)).find((x) => x.id === id);
        if (p && p.words.length) return p.words[0];
        if (cpv && id > 0 && id < indivStart) return rw(cpv + 4 * (id - 1));
        return 0;
    }
    function isRoom(addr) {
        const ks = kindsOf(addr).names;
        return ks.some((n) => /^K1_room$/i.test(n) || /_room$/i.test(n)) || bitsLsb(addr).indexOf("mark_as_room") >= 0;
    }
    function isPerson(addr) {
        return kindsOf(addr).names.some((n) => /person|man|woman|animal/i.test(n));
    }

    let compass = 0;
    for (let i = 0; i < all.length; i++) if (hwName(all[i]) === "compass") { compass = all[i]; break; }
    const compassKids = compass ? children(compass) : [];
    const CARD = ["north","south","east","west","northeast","northwest","southeast","southwest","up","down","in","out"];
    const dirs = compassKids.map((addr) => {
        const dict = dictWords(addr);
        const card = CARD.find((c) => dict.indexOf(c) >= 0) || dict[0] || "";
        return { addr, card, dict, props: parseProps(rw(addr + OFF_PROPS)).map((p) => ({
            id: p.id, name: propName(p.id), len: p.len, words: p.words.slice(0, 4)
        })) };
    });

    const containedPersons = [];
    all.forEach((addr) => {
        const par = rw(addr + OFF_PARENT);
        if (!isObj(par) || !isPerson(addr) || !isRoom(par)) return;
        containedPersons.push({ addr, dict: dictWords(addr), parent: par });
    });
    const emptyDict = containedPersons.filter((p) => !p.dict.length);
    const playerAddr = (emptyDict[0] || containedPersons[0] || {}).addr || 0;
    const locAddr = playerAddr ? rw(playerAddr + OFF_PARENT) : 0;

    function kindWordSet(kindAddr) {
        const out = new Set();
        const hw = hwName(kindAddr) || "";
        const m = hw.match(/^K\d+_(.+)$/i);
        const stem = (m ? m[1] : hw).toLowerCase();
        if (stem) {
            out.add(stem);
            if (stem.endsWith("y") && stem.length > 1) out.add(stem.slice(0, -1) + "ies");
            else out.add(stem + "s");
        }
        dictWords(kindAddr).forEach((w) => out.add(w.toLowerCase()));
        return [...out];
    }
    function printedDiag(addr) {
        const inst = dictWords(addr);
        const kinds = kindsOf(addr);
        const kindSets = kinds.objs.map((k) => ({
            addr: k, hw: hwName(k), dict: dictWords(k), words: kindWordSet(k)
        }));
        const kindWords = new Set();
        kindSets.forEach((k) => k.words.forEach((w) => kindWords.add(w)));
        const filtered = inst.filter((w) => !kindWords.has(w.toLowerCase()) && !/^K\d+_/.test(w));
        return {
            inst, kinds: kinds.names, kindSets,
            kindWords: [...kindWords],
            filtered,
            printed: (filtered.length ? filtered : inst).join(" ")
        };
    }

    const locKids = locAddr ? children(locAddr).filter((c) => c !== playerAddr) : [];
    const inventory = playerAddr ? children(playerAddr) : [];
    const rooms = all.filter(isRoom);

    const backpack = all.find((a) => dictWords(a).indexOf("backpack") >= 0) || 0;
    const backpackParent = backpack ? rw(backpack + OFF_PARENT) : 0;

    const look = (() => {
        try {
            const el = document.querySelector(".BufferWindow, #windowport");
            return ((el && el.innerText) || "").slice(-500);
        } catch (e) { return ""; }
    })();

    const cpvSlice = [];
    if (cpv) {
        for (let i = 0; i < 40; i++) {
            cpvSlice.push({ i, name: propName(i) || propName(i + 1), val: rw(cpv + 4 * i) });
        }
    }

    const north = dirs.find((d) => d.card === "north") || dirs[0] || null;

    return {
        ramstart, endmem, numAttr, indivStart, cpv, objectCount: all.length, roomCount: rooms.length,
        commonHead: commonNames.slice(0, 40).map((n, i) => ({ id: i + 1, name: n })),
        playerAddr, locAddr,
        locDict: locAddr ? dictWords(locAddr) : [],
        locPrinted: locAddr ? printedDiag(locAddr) : null,
        locPid25: locAddr ? propVal(locAddr, 25) : 0,
        locPid26: locAddr ? propVal(locAddr, 26) : 0,
        locLocalMap: locAddr ? propVal(locAddr, 334) : 0,
        locKids: locKids.map((c) => ({
            addr: c, dict: dictWords(c).slice(0, 6), printed: printedDiag(c).printed, lsb: bitsLsb(c)
        })),
        inventory: inventory.map((c) => ({
            addr: c, dict: dictWords(c).slice(0, 6), printed: printedDiag(c).printed, lsb: bitsLsb(c), bytes: attrBytes(c)
        })),
        north,
        dirs: dirs.map((d) => ({ card: d.card, dict: d.dict, nProps: d.props.length, props: d.props })),
        cpvSlice,
        backpack: backpack ? {
            addr: backpack,
            dict: dictWords(backpack),
            parent: backpackParent,
            parentDict: backpackParent && isObj(backpackParent) ? dictWords(backpackParent) : [],
            parentIsRoom: !!(backpackParent && isRoom(backpackParent)),
            lsb: bitsLsb(backpack),
            bytes: attrBytes(backpack)
        } : null,
        look
    };
};

function huntGeom(page, src, dest) {
    return page.evaluate(({ src, dest }) => {
        const rb = (a) => Quixe.ReadByte(a) & 0xff;
        const rw = (a) => (typeof Quixe.ReadWord === "function")
            ? Quixe.ReadWord(a) >>> 0
            : ((rb(a) << 24) | (rb(a + 1) << 16) | (rb(a + 2) << 8) | rb(a + 3)) >>> 0;
        const rs = (a) => ((rb(a) << 8) | rb(a + 1)) >>> 0;
        const internals = Quixe.get_vm_internals();
        const accel = Array.from(internals.accel_params || []);
        const ramstart = rw(8);
        const endmem = rw(16);
        const numAttr = (accel[7] | 0) || 7;
        const classAddr = accel[2] | 0;
        const cpv = accel[8] | 0;
        const indivStart = accel[1] | 0;
        const OFF_NEXT = 1 + numAttr;
        const OFF_NAME = OFF_NEXT + 4;
        const OFF_PROPS = OFF_NAME + 4;
        const isObj = (a) => !!(a && a >= ramstart && a < endmem && rb(a) === 0x70);
        function parseProps(ptr) {
            if (!ptr) return [];
            const n = rw(ptr);
            if (n < 0 || n > 800) return [];
            const out = [];
            for (let i = 0; i < n; i++) {
                const base = ptr + 4 + i * 10;
                out.push({ id: rs(base), len: rs(base + 2), data: rw(base + 4) });
            }
            return out;
        }
        function propVal(addr, id) {
            const p = parseProps(rw(addr + OFF_PROPS)).find((x) => x.id === id);
            if (p && p.len) return rw(p.data);
            if (cpv && id > 0 && id < indivStart) return rw(cpv + 4 * (id - 1));
            return 0;
        }
        const destHits = [];
        const hi = Math.min(endmem - 4, ramstart + 6 * 1024 * 1024);
        for (let a = ramstart; a < hi; a += 4) {
            if (rw(a) === dest) {
                destHits.push(a);
                if (destHits.length >= 80) break;
            }
        }
        const srcHits = [];
        for (let a = ramstart; a < hi && srcHits.length < 80; a += 4) {
            if (rw(a) === src) srcHits.push(a);
        }

        const keys = [
            { name: "pid25", srcKey: propVal(src, 25), destKey: propVal(dest, 25) },
            { name: "pid26", srcKey: propVal(src, 26), destKey: propVal(dest, 26) },
            { name: "localMap334", srcKey: propVal(src, 334), destKey: propVal(dest, 334) }
        ];
        const nDirs = [8, 10, 12, 16, 20, 24];
        const opposites = { 0: 4, 4: 0, 1: 5, 5: 1, 2: 6, 6: 2, 3: 7, 7: 3, 8: 9, 9: 8, 10: 11, 11: 10 };
        const hits = [];

        function tryRect(base, nDir, srcKey, destKey, zeroBased) {
            if (base < ramstart || base + nDir * 4 > endmem) return null;
            const sIdx = zeroBased ? srcKey : srcKey - 1;
            const dIdx = zeroBased ? destKey : destKey - 1;
            if (sIdx < 0 || dIdx < 0) return null;
            const srcRow = base + sIdx * nDir * 4;
            const destRow = base + dIdx * nDir * 4;
            if (srcRow < ramstart || destRow < ramstart) return null;
            let srcCol = -1;
            for (let c = 0; c < nDir; c++) {
                if (rw(srcRow + c * 4) === dest) { srcCol = c; break; }
            }
            if (srcCol < 0) return null;
            const opp = opposites[srcCol];
            const destHasSrc = (opp !== undefined) && rw(destRow + opp * 4) === src;
            const srcRowWords = [];
            const destRowWords = [];
            let srcRooms = 0, destRooms = 0, srcJunk = 0, destJunk = 0;
            for (let c = 0; c < nDir; c++) {
                const sw = rw(srcRow + c * 4);
                const dw = rw(destRow + c * 4);
                if (sw) {
                    if (isObj(sw)) srcRooms++; else srcJunk++;
                    srcRowWords.push({ c, w: sw, dest: sw === dest, src: sw === src });
                }
                if (dw) {
                    if (isObj(dw)) destRooms++; else destJunk++;
                    destRowWords.push({ c, w: dw, dest: dw === dest, src: dw === src });
                }
            }
            return {
                srcCol, destHasSrc, srcRooms, destRooms, srcJunk, destJunk,
                srcRow, destRow, srcRowWords, destRowWords
            };
        }

        destHits.forEach((at) => {
            keys.forEach((k) => {
                nDirs.forEach((nDir) => {
                    [false, true].forEach((zeroBased) => {
                        const sIdx = zeroBased ? k.srcKey : k.srcKey - 1;
                        if (sIdx < 0) return;
                        for (let col = 0; col < nDir; col++) {
                            const base = at - (sIdx * nDir + col) * 4;
                            const r = tryRect(base, nDir, k.srcKey, k.destKey, zeroBased);
                            if (!r) continue;
                            hits.push({
                                key: k.name, nDir, zeroBased, base, destAt: at,
                                srcKey: k.srcKey, destKey: k.destKey, ...r
                            });
                        }
                    });
                });
            });
        });

        hits.sort((a, b) => {
            const as = (a.destHasSrc ? 20 : 0) + a.srcRooms + a.destRooms - 3 * (a.srcJunk + a.destJunk);
            const bs = (b.destHasSrc ? 20 : 0) + b.srcRooms + b.destRooms - 3 * (b.srcJunk + b.destJunk);
            return bs - as;
        });

        // Dedup by base+nDir+key
        const seen = new Set();
        const unique = [];
        hits.forEach((h) => {
            const k = [h.key, h.nDir, h.zeroBased, h.base].join(":");
            if (seen.has(k)) return;
            seen.add(k);
            unique.push(h);
        });

        return {
            destHits: destHits.length,
            destHitSample: destHits.slice(0, 12),
            srcHits: srcHits.length,
            keys,
            recipHits: unique.filter((h) => h.destHasSrc).slice(0, 8),
            best: unique.slice(0, 8)
        };
    }, { src, dest });
}

async function runStory(browser, story) {
    const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
    const errors = [];
    page.on("pageerror", (e) => errors.push(String(e.message || e)));
    await page.goto(pathToFileURL(path.resolve(ROOT, "play.html")).href + "?story=" + story);
    await page.waitForTimeout(2500);
    await page.evaluate(() => { if (window.Message) Message.Hide(); });

    async function hasInput() {
        return (await page.locator(".Input.LineInput").count()) > 0;
    }
    async function inject(cmd) {
        if (!(await hasInput())) return false;
        await page.evaluate((t) => { Input.Clear(); Input.Inject(t, true); }, cmd);
        await page.waitForTimeout(700);
        return true;
    }
    async function bufferTail() {
        return page.evaluate(() => {
            const el = document.querySelector(".BufferWindow, #windowport");
            return ((el && el.innerText) || "").slice(-800);
        });
    }

    const skipLog = [];
    for (let i = 0; i < 40 && !(await hasInput()); i++) {
        await page.keyboard.press("Space");
        await page.waitForTimeout(180);
    }
    for (let i = 0; i < 36; i++) {
        const tail = await bufferTail();
        const stillTalk = /Can you hear me|remember our name|half person|I was Alex|You were\.\.\.|need you on form|unrecognizable|synthesis|Have you played interactive fiction/i.test(tail);
        const playable = /You can see|You are carrying|is a dumpster|letter-remover|obvious exits|You are in |This is |north of |south of |This alley runs|Dark Woods|office/i.test(tail)
            && !stillTalk;
        if (playable && await hasInput()) { skipLog.push({ i, action: "playable" }); break; }
        if (!(await hasInput())) {
            await page.keyboard.press("Space");
            skipLog.push({ i, action: "space" });
            await page.waitForTimeout(180);
            continue;
        }
        if (/Have you played|Please answer yes or no|Can you hear me|remember our name|Are you|Shall I|ready\?/i.test(tail) || stillTalk) {
            await inject("yes");
            skipLog.push({ i, action: "yes" });
            continue;
        }
        await inject("look");
        skipLog.push({ i, action: "look" });
    }
    await inject("look");

    const before = await page.evaluate(HELPERS);
    const locBefore = before.locAddr;
    await inject("north");
    const after = await page.evaluate(HELPERS);
    const moved = !!(after.locAddr && after.locAddr !== locBefore);
    let hunt = null;
    if (moved) hunt = await huntGeom(page, locBefore, after.locAddr);

    let openTrial = null;
    const inScope = [].concat(after.locKids || [], after.inventory || []);
    const closedHere = inScope.find((o) => o.lsb && o.lsb.indexOf("openable") >= 0 && o.lsb.indexOf("open") < 0);
    const anyHere = inScope.find((o) => o.lsb && (o.lsb.indexOf("openable") >= 0 || o.lsb.indexOf("container") >= 0));
    const cand = closedHere || anyHere;
    if (cand && cand.dict && cand.dict[0]) {
        const noun = cand.dict.find((d) => !/things|device|rooms|backdrops|facades|container/i.test(d)) || cand.dict[0];
        const beforeBytes = cand.bytes || null;
        await inject("open " + noun);
        const snap = await page.evaluate((addr) => {
            const rb = (a) => Quixe.ReadByte(a) & 0xff;
            const internals = Quixe.get_vm_internals();
            const numAttr = (internals.accel_params[7] | 0) || 7;
            const bytes = [];
            for (let i = 0; i < numAttr; i++) bytes.push(rb(addr + 1 + i));
            const bits = [];
            for (let n = 0; n < numAttr * 8; n++) {
                const byte = rb(addr + 1 + Math.floor(n / 8));
                if (((byte >> (n % 8)) & 1) === 1) bits.push(n);
            }
            const el = document.querySelector(".BufferWindow, #windowport");
            return { bytes, bits, look: ((el && el.innerText) || "").slice(-300) };
        }, cand.addr);
        openTrial = {
            command: "open " + noun,
            addr: cand.addr,
            dict: cand.dict,
            inScope: true,
            beforeBytes,
            afterBytes: snap.bytes,
            bytesChanged: !!(beforeBytes && snap.bytes && beforeBytes.join(",") !== snap.bytes.join(",")),
            afterBits: snap.bits,
            look: snap.look
        };
    } else if (before.backpack && before.backpack.dict && before.backpack.dict[0]) {
        const noun = "backpack";
        await inject("open " + noun);
        const snap = await page.evaluate((addr) => {
            const rb = (a) => Quixe.ReadByte(a) & 0xff;
            const internals = Quixe.get_vm_internals();
            const numAttr = (internals.accel_params[7] | 0) || 7;
            const bytes = [];
            for (let i = 0; i < numAttr; i++) bytes.push(rb(addr + 1 + i));
            const el = document.querySelector(".BufferWindow, #windowport");
            return { bytes, look: ((el && el.innerText) || "").slice(-300) };
        }, before.backpack.addr);
        openTrial = {
            command: "open " + noun,
            addr: before.backpack.addr,
            dict: before.backpack.dict,
            inScope: false,
            parentDict: before.backpack.parentDict,
            beforeBytes: before.backpack.bytes,
            afterBytes: snap.bytes,
            bytesChanged: !!(before.backpack.bytes && snap.bytes && before.backpack.bytes.join(",") !== snap.bytes.join(",")),
            look: snap.look
        };
    }

    await page.close();
    return {
        story, errors, skipTail: skipLog.slice(-8),
        before: {
            locDict: before.locDict,
            locPrinted: before.locPrinted,
            locPid25: before.locPid25,
            locPid26: before.locPid26,
            locLocalMap: before.locLocalMap,
            locKids: before.locKids,
            inventory: before.inventory,
            north: before.north,
            dirs: (before.dirs || []).map((d) => ({ card: d.card, dict: d.dict, nProps: d.nProps, props: d.props })),
            cpvSlice: before.cpvSlice,
            backpack: before.backpack,
            roomCount: before.roomCount,
            commonHead: before.commonHead,
            look: before.look
        },
        after: {
            locDict: after.locDict,
            locPrinted: after.locPrinted,
            locPid25: after.locPid25,
            locPid26: after.locPid26,
            locLocalMap: after.locLocalMap,
            locKids: after.locKids
        },
        moved,
        locBefore,
        locAfter: after.locAddr,
        hunt,
        openTrial
    };
}

(async () => {
    const story = process.argv[2] || "games/CounterfeitMonkey.gblorb.js";
    const browser = await chromium.launch({
        executablePath: process.env.PW_CHROME || undefined,
        headless: true
    });
    let result;
    try {
        result = await runStory(browser, story);
    } catch (e) {
        result = { story, fatal: String(e && e.stack || e) };
    }
    await browser.close();
    const outPath = path.join(ROOT, "harness", "_d38_p2_geom.out.json");
    fs.writeFileSync(outPath, JSON.stringify(result, null, 2));
    console.log("wrote", outPath);
    if (result.fatal) { console.log("FATAL", result.fatal); process.exit(1); }
    const b = result.before || {};
    console.log("moved", result.moved, b.locDict, "->", result.after && result.after.locDict);
    console.log("keys src pid25", b.locPid25, "pid26", b.locPid26, "localMap", b.locLocalMap);
    console.log("keys dest pid25", result.after && result.after.locPid25, "pid26", result.after && result.after.locPid26, "localMap", result.after && result.after.locLocalMap);
    console.log("printed", JSON.stringify(b.locPrinted));
    console.log("north props", JSON.stringify(b.north && b.north.props));
    const h = result.hunt || {};
    console.log("hunt destHits", h.destHits, "recip", (h.recipHits || []).length);
    console.log("recipHits", JSON.stringify(h.recipHits));
    console.log("best", JSON.stringify(h.best));
    console.log("openTrial", JSON.stringify(result.openTrial && {
        command: result.openTrial.command,
        inScope: result.openTrial.inScope,
        bytesChanged: result.openTrial.bytesChanged,
        look: result.openTrial.look && result.openTrial.look.slice(-160)
    }));
    console.log("backpack", JSON.stringify(b.backpack && { dict: b.backpack.dict, parentDict: b.backpack.parentDict, parentIsRoom: b.backpack.parentIsRoom, lsb: b.backpack.lsb }));
})().catch((e) => { console.error("FATAL", e); process.exit(1); });
