/* D38 P2 map-key / printed-name / OPEN-bit verification — read-only.
 * No product files. No GlulxRamProvider.
 *
 * Prior probes proved 0x70 records, parent(player)=location, LSB attrs (10/10),
 * loc children, inventory, and a live north move (Back Alley -> Sigil Street).
 * They did NOT land a unique Map_Storage index, clean printed names, or an
 * in-scope OPEN bit flip. Identifier-names appear +1 vs parseProps ids
 * (pid 1 = name dict words; table labels "name" at 2).
 *
 * This probe:
 *   1. uses instance parseProps only (no CPV fallback) for pid 25 / 334
 *   2. hunts (src,dest) pairs and (src,dir,dest) triples in RAM
 *   3. tests Map_Storage[rowKey * nDir + slot] against TWO live moves
 *   4. printedName = instance pid-1 dict minus kind pid-1 dict
 *   5. OPEN on an in-scope closed openable (Alabaster box; CM after move)
 *
 * Usage: node harness/_d38_p2_mapkey.js [story.js ...]
 */
const { chromium } = require("playwright");
const { pathToFileURL } = require("node:url");
const path = require("node:path");
const fs = require("fs");
const ROOT = path.resolve(__dirname, "..");
const CARD = ["north","south","east","west","northeast","northwest","southeast","southwest","up","down","in","out"];

const HELPERS = () => {
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
            const id = (rb(base) << 8) | rb(base + 1);
            const len = (rb(base + 2) << 8) | rb(base + 3);
            const data = rw(base + 4);
            const words = [];
            for (let w = 0; w < Math.min(len, 12); w++) words.push(rw(data + w * 4));
            out.push({ id, len, data, words });
        }
        return out;
    }
    function instProp(addr, id) {
        const p = parseProps(rw(addr + OFF_PROPS)).find((x) => x.id === id);
        return p || null;
    }
    function instWord(addr, id) {
        const p = instProp(addr, id);
        return p && p.words.length ? p.words[0] : null;
    }
    function hwName(addr) { return decodeString(rw(addr + OFF_NAME)); }
    function dictWords(addr) {
        const p = instProp(addr, 1);
        if (!p) return [];
        const out = [];
        p.words.forEach((w) => { const d = decodeDictWord(w); if (d) out.push(d); });
        return out;
    }
    function kindObjs(addr) {
        const p = instProp(addr, 2);
        if (!p) return [];
        return p.words.filter((w) => isObj(w));
    }
    function kindWords(addr) {
        const set = new Set();
        kindObjs(addr).forEach((k) => {
            const hw = (hwName(k) || "").replace(/^K\d+_/, "").replace(/_/g, " ");
            if (hw) {
                set.add(hw);
                if (hw.endsWith("y")) set.add(hw.slice(0, -1) + "ies");
                else set.add(hw + "s");
            }
            dictWords(k).forEach((w) => set.add(w.toLowerCase()));
        });
        return set;
    }
    function printedName(addr) {
        const inst = dictWords(addr);
        const drop = kindWords(addr);
        const kept = inst.filter((w) => w && !drop.has(w.toLowerCase()) && !/^K\d+_/.test(w));
        return (kept.length ? kept : inst).join(" ").trim();
    }
    function children(addr) {
        const kids = [];
        let c = rw(addr + OFF_CHILD);
        for (let i = 0; i < 80 && c; i++) { kids.push(c); c = rw(c + OFF_SIBLING); }
        return kids;
    }
    function bitsLsb(addr) {
        const names = [];
        const nums = [];
        for (let n = 0; n < numAttr * 8; n++) {
            const byte = rb(addr + 1 + Math.floor(n / 8));
            if (((byte >> (n % 8)) & 1) === 1) {
                nums.push(n);
                names.push(attrNames[n] || ("bit-" + n));
            }
        }
        return { names, nums };
    }
    function attrBytes(addr) {
        return Array.from({ length: numAttr }, (_, i) => rb(addr + 1 + i));
    }
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
    const indivNames = idBest ? namesAt(idBest.indiv.addr, Math.min(idBest.indiv.count, 200), 200) : [];
    const nameAt = [];
    commonNames.forEach((n, i) => { if (n === "name") nameAt.push(i); });

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
    const isRoom = (addr) => {
        const ks = kindsOfSafe(addr);
        return ks.some((n) => /^K1_room$/i.test(n) || /_room$/i.test(n));
    };
    function kindsOfSafe(addr) {
        const names = [];
        kindObjs(addr).forEach((w) => { const n = hwName(w); if (n) names.push(n); });
        return names;
    }
    const isPerson = (addr) => kindsOfSafe(addr).some((n) => /person|man|woman|animal/i.test(n));

    let compass = 0;
    for (let i = 0; i < all.length; i++) if (hwName(all[i]) === "compass") { compass = all[i]; break; }
    const compassKids = compass ? children(compass) : [];
    const CARD_LOCAL = ["north","south","east","west","northeast","northwest","southeast","southwest","up","down","in","out"];
    const dirs = compassKids.map((addr, idx) => {
        const dict = dictWords(addr);
        const card = CARD_LOCAL.find((c) => dict.indexOf(c) >= 0) || dict[0] || "";
        const inst = parseProps(rw(addr + OFF_PROPS)).filter((p) => p.words.some((w) => w < 64) || p.id === 11 || p.id === 12 || p.id === 20 || p.id === 22);
        return {
            addr, card, childIndex: idx, dict: dict.slice(0, 4),
            p11: instWord(addr, 11), p12: instWord(addr, 12), p20: instWord(addr, 20),
            p22: instWord(addr, 22), p24: instWord(addr, 24), p25: instWord(addr, 25),
            small: inst.map((p) => ({ id: p.id, words: p.words.slice(0, 4) }))
        };
    });
    const dirSet = new Set(dirs.map((d) => d.addr));
    const north = dirs.find((d) => d.card === "north") || null;
    const south = dirs.find((d) => d.card === "south") || null;

    const containedPersons = [];
    all.forEach((addr) => {
        const par = rw(addr + OFF_PARENT);
        if (!isObj(par) || !isPerson(addr) || !isRoom(par)) return;
        containedPersons.push({ addr, dict: dictWords(addr), parent: par });
    });
    const emptyDict = containedPersons.filter((p) => !p.dict.length);
    const playerAddr = (emptyDict[0] || containedPersons[0] || {}).addr || 0;
    const locAddr = playerAddr ? rw(playerAddr + OFF_PARENT) : 0;

    const rooms = all.filter(isRoom);
    const roomSet = new Set(rooms);

    function roomKey(addr) {
        return {
            addr,
            name: printedName(addr),
            dict: dictWords(addr).slice(0, 4),
            p20: instWord(addr, 20),
            p25: instWord(addr, 25),
            p26: instWord(addr, 26),
            p31: instWord(addr, 31),
            p334: instWord(addr, 334),
            p336: instWord(addr, 336),
            instIds: parseProps(rw(addr + OFF_PROPS)).map((p) => p.id)
        };
    }

    function labelWord(w) {
        if (!w) return { w, kind: "zero" };
        if (w === locAddr) return { w, kind: "LOC", name: printedName(w) };
        if (w === playerAddr) return { w, kind: "PLAYER" };
        if (dirSet.has(w)) {
            const d = dirs.find((x) => x.addr === w);
            return { w, kind: "DIR", card: d && d.card };
        }
        if (roomSet.has(w)) return { w, kind: "room", name: printedName(w), dict: dictWords(w).slice(0, 3) };
        if (isObj(w)) return { w, kind: "obj", dict: dictWords(w).slice(0, 3) };
        return { w, kind: "junk" };
    }

    function huntConnections(src, dest) {
        if (!src || !dest) return { error: "need src dest" };
        const pairs = [];
        const triples = [];
        const destHits = [];
        const lo = ramstart;
        const hi = Math.min(endmem - 12, ramstart + 8 * 1024 * 1024);
        for (let a = lo; a < hi; a += 4) {
            const w0 = rw(a);
            if (w0 === dest && destHits.length < 40) destHits.push(a);
            if (w0 !== src && w0 !== dest && !dirSet.has(w0)) continue;
            const w1 = rw(a + 4);
            const w2 = rw(a + 8);
            if (w0 === src && w1 === dest && pairs.length < 24) {
                pairs.push({ at: a, kind: "src-dest", around: [-2, -1, 2, 3].map((i) => labelWord(rw(a + i * 4))) });
            }
            if (w0 === dest && w1 === src && pairs.length < 24) {
                pairs.push({ at: a, kind: "dest-src", around: [-2, -1, 2, 3].map((i) => labelWord(rw(a + i * 4))) });
            }
            if (w0 === src && w2 === dest && triples.length < 24) {
                triples.push({ at: a, kind: "src-x-dest", mid: labelWord(w1) });
            }
            if (w0 === dest && w2 === src && triples.length < 24) {
                triples.push({ at: a, kind: "dest-x-src", mid: labelWord(w1) });
            }
            if (dirSet.has(w0) && ((w1 === src && w2 === dest) || (w1 === dest && w2 === src)) && triples.length < 24) {
                triples.push({ at: a, kind: "dir-ab", dir: labelWord(w0), a: labelWord(w1), b: labelWord(w2) });
            }
        }
        const neighborhoods = destHits.slice(0, 12).map((at) => ({
            at,
            window: [-4, -3, -2, -1, 0, 1, 2, 3, 4].map((i) => labelWord(rw(at + i * 4)))
        }));
        return { destHits: destHits.length, destHitSample: destHits.slice(0, 12), pairs, triples, neighborhoods };
    }

    function testIndex(src, dest, srcKey, destKey, nDir, slot, field) {
        const hits = [];
        const lo = ramstart;
        const hi = Math.min(endmem - 4, ramstart + 8 * 1024 * 1024);
        for (let a = lo; a < hi; a += 4) {
            if (rw(a) !== dest) continue;
            hits.push(a);
            if (hits.length >= 40) break;
        }
        const idx = srcKey && srcKey[field];
        const didx = destKey && destKey[field];
        if (idx == null || didx == null || idx < 0 || didx < 0) return { field, nDir, slot, skip: "null-key" };
        const trials = [];
        hits.forEach((at) => {
            const base = at - (idx * nDir + slot) * 4;
            if (base < ramstart || base + (Math.max(idx, didx) + 1) * nDir * 4 > endmem) return;
            const srcRow = [];
            for (let i = 0; i < nDir; i++) srcRow.push(labelWord(rw(base + (idx * nDir + i) * 4)));
            const destRow = [];
            for (let i = 0; i < nDir; i++) destRow.push(labelWord(rw(base + (didx * nDir + i) * 4)));
            const destSlots = srcRow.map((w, i) => w.w === dest ? i : -1).filter((i) => i >= 0);
            const srcSlots = destRow.map((w, i) => w.w === src ? i : -1).filter((i) => i >= 0);
            const srcJunk = srcRow.filter((w) => w.kind === "junk").length;
            const destJunk = destRow.filter((w) => w.kind === "junk").length;
            if (!destSlots.length || srcJunk > 2 || destJunk > 2) return;
            trials.push({
                at, base,
                destSlots,
                srcSlots,
                srcFilled: srcRow.filter((w) => w.kind !== "zero").map((w, i) => ({ i: srcRow.indexOf(w) >= 0 ? srcRow.findIndex((x) => x === w) : i, kind: w.kind, name: w.name || w.card, dict: w.dict })),
                destFilled: destRow.filter((w) => w.kind !== "zero").map((w) => ({ kind: w.kind, name: w.name || w.card, dict: w.dict, w: w.w }))
            });
        });
        // compact filled rows
        trials.forEach((t) => {
            const srcFilled = [];
            for (let i = 0; i < nDir; i++) {
                const w = labelWord(rw(t.base + (idx * nDir + i) * 4));
                if (w.kind !== "zero") srcFilled.push({ i, kind: w.kind, name: w.name || w.card, dict: w.dict });
            }
            const destFilled = [];
            for (let i = 0; i < nDir; i++) {
                const w = labelWord(rw(t.base + (didx * nDir + i) * 4));
                if (w.kind !== "zero") destFilled.push({ i, kind: w.kind, name: w.name || w.card, dict: w.dict });
            }
            t.srcFilled = srcFilled;
            t.destFilled = destFilled;
        });
        return {
            field, nDir, slot, idx, didx,
            nTrials: trials.length,
            best: trials.slice(0, 4)
        };
    }

    const locKids = locAddr ? children(locAddr).filter((c) => c !== playerAddr) : [];
    const inventory = playerAddr ? children(playerAddr) : [];
    function describe(addr) {
        const b = bitsLsb(addr);
        return {
            addr,
            name: printedName(addr),
            dict: dictWords(addr).slice(0, 6),
            kinds: kindsOfSafe(addr).slice(0, 4),
            lsb: b.names,
            open: b.names.indexOf("open") >= 0,
            openable: b.names.indexOf("openable") >= 0,
            container: b.names.indexOf("container") >= 0,
            parent: rw(addr + OFF_PARENT),
            bytes: attrBytes(addr)
        };
    }
    const openableHere = locKids.concat(inventory).map(describe).filter((o) => o.openable || o.container);
    const closedHere = openableHere.filter((o) => o.openable && !o.open);

    const look = (() => {
        try {
            const el = document.querySelector(".BufferWindow, #windowport");
            return ((el && el.innerText) || "").slice(-700);
        } catch (e) { return ""; }
    })();

    const p25vals = rooms.map((r) => instWord(r, 25)).filter((v) => v != null);
    const p334vals = rooms.map((r) => instWord(r, 334)).filter((v) => v != null);
    const uniq = (arr) => new Set(arr).size;

    return {
        ramstart, endmem, numAttr, objectCount: all.length, roomCount: rooms.length,
        identifierNameAt: nameAt,
        commonHead: commonNames.slice(0, 36).map((n, i) => ({ i, n })),
        playerAddr, locAddr,
        loc: locAddr ? describe(locAddr) : null,
        player: playerAddr ? describe(playerAddr) : null,
        locKey: locAddr ? roomKey(locAddr) : null,
        locKids: locKids.map(describe),
        inventory: inventory.map(describe),
        dirs: dirs.map((d) => ({
            card: d.card, addr: d.addr, childIndex: d.childIndex,
            p11: d.p11, p12: d.p12, p20: d.p20, p22: d.p22, p24: d.p24, p25: d.p25, small: d.small
        })),
        locIndiv: locAddr ? parseProps(rw(locAddr + OFF_PROPS)).filter((p) => p.id >= 256).map((p) => ({
            id: p.id, name: (indivNames[p.id - 256] || null),
            words: p.words.slice(0, 4),
            b0: p.words[0] ? rb(p.words[0]) : null,
            isObj: p.words[0] ? isObj(p.words[0]) : false,
            isRoom: p.words[0] ? isRoom(p.words[0]) : false
        })) : [],
        indivSample: indivNames.slice(0, 80).map((n, i) => ({ id: 256 + i, n })),
        openableHere, closedHere,
        p25: { present: p25vals.length, uniq: uniq(p25vals), sample: p25vals.slice(0, 12) },
        p334: { present: p334vals.length, uniq: uniq(p334vals), sample: p334vals.slice(0, 12) },
        look
    };
};

function huntWithPair(src, dest) {
    // Re-run connection hunt inside the page using src/dest captured after a move.
    return (s, d) => {
        // This wrapper is unused; hunt is done via evaluate with args below.
        return { s, d };
    };
}

const HUNT = ({ src, dest }) => {
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
    const classAddr = accel[2] | 0;
    const OFF_NEXT = 1 + numAttr;
    const OFF_NAME = OFF_NEXT + 4;
    const OFF_PROPS = OFF_NAME + 4;
    const OFF_PARENT = OFF_PROPS + 4;
    const OFF_SIBLING = OFF_PARENT + 4;
    const OFF_CHILD = OFF_SIBLING + 4;
    const isObj = (a) => !!(a && a >= ramstart && a < endmem && rb(a) === 0x70);
    function decodeE0(ptr, cap) {
        if (!ptr || rb(ptr) !== 0xe0) return null;
        let s = ""; cap = cap || 40;
        for (let i = ptr + 1; i < ptr + 1 + cap; i++) {
            const c = rb(i); if (!c) break;
            s += c >= 32 && c < 127 ? String.fromCharCode(c) : "?";
        }
        return s;
    }
    function decodeE1(ptr, cap) {
        if (!ptr || rb(ptr) !== 0xe1 || !decoding) return null;
        const root = rw(decoding + 8); if (!root) return null;
        let addr = ptr + 1, bitnum = 0, node = root, s = "";
        cap = cap || 40;
        for (let step = 0; step < 60000 && s.length < cap; step++) {
            const t = rb(node);
            if (t === 0) {
                const bit = (rb(addr) >> bitnum) & 1;
                node = rw(node + 1 + 4 * bit);
                bitnum++; if (bitnum === 8) { bitnum = 0; addr++; }
                continue;
            }
            if (t === 1) return s;
            if (t === 2) { const c = rb(node + 1); s += c >= 32 && c < 127 ? String.fromCharCode(c) : "?"; node = root; continue; }
            if (t === 3) { let i = node + 1; while (rb(i) && s.length < cap) { const c = rb(i++); s += c >= 32 && c < 127 ? String.fromCharCode(c) : "?"; } node = root; continue; }
            if (t === 4) { const cp = rw(node + 1); s += cp >= 32 && cp < 127 ? String.fromCharCode(cp) : "?"; node = root; continue; }
            if (t === 5) { let i = node + 1; while (s.length < cap) { const cp = rw(i); if (!cp) break; s += cp >= 32 && cp < 127 ? String.fromCharCode(cp) : "?"; i += 4; } node = root; continue; }
            s += "*"; node = root;
        }
        return s;
    }
    function decodeString(ptr) {
        if (!ptr) return null;
        const t = rb(ptr);
        if (t === 0xe0) return decodeE0(ptr, 40);
        if (t === 0xe1) return decodeE1(ptr, 40);
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
        const n = rw(ptr); if (n < 0 || n > 800) return [];
        const out = [];
        for (let i = 0; i < n; i++) {
            const base = ptr + 4 + i * 10;
            const id = (rb(base) << 8) | rb(base + 1);
            const len = (rb(base + 2) << 8) | rb(base + 3);
            const data = rw(base + 4);
            const words = [];
            for (let w = 0; w < Math.min(len, 8); w++) words.push(rw(data + w * 4));
            out.push({ id, len, data, words });
        }
        return out;
    }
    function instWord(addr, id) {
        const p = parseProps(rw(addr + OFF_PROPS)).find((x) => x.id === id);
        return p && p.words.length ? p.words[0] : null;
    }
    function hwName(addr) { return decodeString(rw(addr + OFF_NAME)); }
    function dictWords(addr) {
        const p = parseProps(rw(addr + OFF_PROPS)).find((x) => x.id === 1);
        if (!p) return [];
        const out = [];
        p.words.forEach((w) => { const d = decodeDictWord(w); if (d) out.push(d); });
        return out;
    }
    function children(addr) {
        const kids = [];
        let c = rw(addr + OFF_CHILD);
        for (let i = 0; i < 80 && c; i++) { kids.push(c); c = rw(c + OFF_SIBLING); }
        return kids;
    }
    const all = [];
    const seen = new Set();
    if (isObj(classAddr)) {
        let a = classAddr;
        for (let i = 0; i < 30000; i++) {
            if (!isObj(a) || seen.has(a)) break;
            seen.add(a); all.push(a);
            const next = rw(a + OFF_NEXT); if (!next) break; a = next;
        }
    }
    function kindsOf(addr) {
        const p = parseProps(rw(addr + OFF_PROPS)).find((x) => x.id === 2);
        if (!p) return [];
        return p.words.filter((w) => isObj(w)).map((w) => hwName(w)).filter(Boolean);
    }
    const isRoom = (addr) => kindsOf(addr).some((n) => /^K1_room$/i.test(n) || /_room$/i.test(n));
    const rooms = all.filter(isRoom);
    const roomSet = new Set(rooms);
    let compass = 0;
    for (let i = 0; i < all.length; i++) if (hwName(all[i]) === "compass") { compass = all[i]; break; }
    const compassKids = compass ? children(compass) : [];
    const CARD_LOCAL = ["north","south","east","west","northeast","northwest","southeast","southwest","up","down","in","out"];
    const dirs = compassKids.map((addr, idx) => {
        const dict = dictWords(addr);
        const card = CARD_LOCAL.find((c) => dict.indexOf(c) >= 0) || dict[0] || "";
        return { addr, card, childIndex: idx };
    });
    const dirSet = new Set(dirs.map((d) => d.addr));
    function printedName(addr) {
        const inst = dictWords(addr);
        const drop = new Set();
        const p = parseProps(rw(addr + OFF_PROPS)).find((x) => x.id === 2);
        (p ? p.words : []).forEach((k) => {
            if (!isObj(k)) return;
            const hw = (hwName(k) || "").replace(/^K\d+_/, "").replace(/_/g, " ");
            if (hw) { drop.add(hw); drop.add(hw + "s"); }
            dictWords(k).forEach((w) => drop.add(w.toLowerCase()));
        });
        const kept = inst.filter((w) => w && !drop.has(w.toLowerCase()));
        return (kept.length ? kept : inst).join(" ");
    }
    function labelWord(w) {
        if (!w) return { w, kind: "zero" };
        if (w === src) return { w, kind: "SRC", name: printedName(w) };
        if (w === dest) return { w, kind: "DEST", name: printedName(w) };
        if (dirSet.has(w)) {
            const d = dirs.find((x) => x.addr === w);
            return { w, kind: "DIR", card: d && d.card };
        }
        if (roomSet.has(w)) return { w, kind: "room", name: printedName(w) };
        if (isObj(w)) return { w, kind: "obj", dict: dictWords(w).slice(0, 3) };
        return { w, kind: "junk" };
    }
    const pairs = [];
    const triples = [];
    const destHits = [];
    const lo = ramstart;
    const hi = Math.min(endmem - 12, ramstart + 8 * 1024 * 1024);
    for (let a = lo; a < hi; a += 4) {
        const w0 = rw(a);
        if (w0 === dest && destHits.length < 40) destHits.push(a);
        if (w0 !== src && w0 !== dest && !dirSet.has(w0)) continue;
        const w1 = rw(a + 4);
        const w2 = rw(a + 8);
        if (w0 === src && w1 === dest && pairs.length < 20) {
            pairs.push({ at: a, kind: "src-dest", around: [-2, -1, 2, 3].map((i) => labelWord(rw(a + i * 4))) });
        }
        if (w0 === dest && w1 === src && pairs.length < 20) {
            pairs.push({ at: a, kind: "dest-src", around: [-2, -1, 2, 3].map((i) => labelWord(rw(a + i * 4))) });
        }
        if (w0 === src && w2 === dest && triples.length < 20) triples.push({ at: a, kind: "src-x-dest", mid: labelWord(w1) });
        if (w0 === dest && w2 === src && triples.length < 20) triples.push({ at: a, kind: "dest-x-src", mid: labelWord(w1) });
        if (dirSet.has(w0) && ((w1 === src && w2 === dest) || (w1 === dest && w2 === src)) && triples.length < 20) {
            triples.push({ at: a, kind: "dir-ab", dir: labelWord(w0), a: labelWord(w1), b: labelWord(w2) });
        }
    }
    const neighborhoods = destHits.slice(0, 10).map((at) => ({
        at,
        window: [-4, -3, -2, -1, 0, 1, 2, 3, 4].map((i) => labelWord(rw(at + i * 4)))
    }));
    function keyOf(addr) {
        return {
            name: printedName(addr),
            p20: instWord(addr, 20),
            p25: instWord(addr, 25),
            p26: instWord(addr, 26),
            p334: instWord(addr, 334),
            p336: instWord(addr, 336)
        };
    }
    const srcKey = keyOf(src);
    const destKey = keyOf(dest);
    function test(field, nDir, slot) {
        const idx = srcKey[field];
        const didx = destKey[field];
        if (idx == null || didx == null || idx < 0 || didx < 0) return { field, nDir, slot, skip: "null-key" };
        const out = [];
        destHits.forEach((at) => {
            const base = at - (idx * nDir + slot) * 4;
            if (base < ramstart) return;
            if (base + (Math.max(idx, didx) + 1) * nDir * 4 > endmem) return;
            const srcFilled = [];
            let destSlots = [];
            let junk = 0;
            for (let i = 0; i < nDir; i++) {
                const lab = labelWord(rw(base + (idx * nDir + i) * 4));
                if (lab.kind === "junk") junk++;
                if (lab.w === dest) destSlots.push(i);
                if (lab.kind !== "zero") srcFilled.push({ i, kind: lab.kind, name: lab.name || lab.card, dict: lab.dict });
            }
            if (!destSlots.length || junk > 2) return;
            const destFilled = [];
            let srcSlots = [];
            let djunk = 0;
            for (let i = 0; i < nDir; i++) {
                const lab = labelWord(rw(base + (didx * nDir + i) * 4));
                if (lab.kind === "junk") djunk++;
                if (lab.w === src) srcSlots.push(i);
                if (lab.kind !== "zero") destFilled.push({ i, kind: lab.kind, name: lab.name || lab.card, dict: lab.dict });
            }
            if (djunk > 2) return;
            out.push({ at, base, destSlots, srcSlots, srcFilled, destFilled, recip: srcSlots.length > 0 });
        });
        return { field, nDir, slot, idx, didx, n: out.length, best: out.slice(0, 3) };
    }
    const indexTrials = [];
    ["p20", "p25", "p26", "p334", "p336"].forEach((field) => {
        [12, 16].forEach((nDir) => {
            for (let slot = 0; slot < nDir; slot++) {
                const t = test(field, nDir, slot);
                if (!t.skip && t.n) indexTrials.push(t);
            }
        });
    });
    indexTrials.sort((a, b) => {
        const sa = (a.best[0] && a.best[0].recip ? 20 : 0) + a.n + (a.nDir === 12 ? 2 : 0);
        const sb = (b.best[0] && b.best[0].recip ? 20 : 0) + b.n + (b.nDir === 12 ? 2 : 0);
        return sb - sa;
    });

    // Grid hunt: Map_Storage[row*nDir + slot] is dest ADDRESS or dest index.
    // Required because a 12-word window around DEST will not contain SRC
    // (SRC lives on a different row). Reciprocal check is the filter.
    const gridHits = [];
    const srcIdx = srcKey.p25;
    const destIdx = destKey.p25;
    if (srcIdx != null && destIdx != null && srcIdx >= 0 && destIdx >= 0 && srcIdx < 400 && destIdx < 400) {
        const nDir = 12;
        const span = (Math.max(srcIdx, destIdx) + 1) * nDir * 4;
        const lo = ramstart;
        const hi = Math.min(endmem - span, ramstart + 5 * 1024 * 1024);
        for (let base = lo; base < hi && gridHits.length < 16; base += 4) {
            for (let slot = 0; slot < nDir; slot++) {
                const v = rw(base + (srcIdx * nDir + slot) * 4);
                if (v !== dest && v !== destIdx) continue;
                if (v === destIdx && destIdx < 8) continue; // too-small index: noise
                let srcSlot = -1, destJunk = 0, srcJunk = 0;
                const destFilled = [];
                const srcFilled = [];
                for (let i = 0; i < nDir; i++) {
                    const w = rw(base + (srcIdx * nDir + i) * 4);
                    const lab = labelWord(w);
                    if (lab.kind === "junk") srcJunk++;
                    if (lab.kind !== "zero") srcFilled.push({ i, kind: lab.kind, name: lab.name || lab.card });
                }
                for (let i = 0; i < nDir; i++) {
                    const w = rw(base + (destIdx * nDir + i) * 4);
                    const lab = labelWord(w);
                    if (lab.kind === "junk") destJunk++;
                    if (w === src || w === srcIdx) srcSlot = i;
                    if (lab.kind !== "zero") destFilled.push({ i, kind: lab.kind, name: lab.name || lab.card });
                }
                if (srcJunk > 3 || destJunk > 3) continue;
                if (v !== dest && srcSlot < 0) continue;
                gridHits.push({
                    base, slot,
                    match: v === dest ? "addr" : "idx",
                    srcSlot, srcJunk, destJunk,
                    srcFilled, destFilled,
                    recip: srcSlot >= 0
                });
            }
        }
    }
    return {
        src, dest, srcKey, destKey,
        destHits: destHits.length,
        destHitSample: destHits.slice(0, 12),
        pairs, triples, neighborhoods,
        indexTrials: indexTrials.slice(0, 12),
        gridHits: gridHits.slice(0, 12)
    };
};

async function runStory(browser, story) {
    const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
    page.setDefaultTimeout(180000);
    const errors = [];
    page.on("pageerror", (e) => errors.push(String(e.message || e)));
    await page.goto(pathToFileURL(path.resolve(ROOT, "play.html")).href + "?story=" + story);
    await page.waitForTimeout(2500);
    await page.evaluate(() => { if (window.Message) Message.Hide(); });

    async function hasInput() {
        return (await page.locator(".Input.LineInput").count()) > 0;
    }
    async function waitInput(n) {
        for (let i = 0; i < (n || 50) && !(await hasInput()); i++) {
            await page.keyboard.press("Space");
            await page.waitForTimeout(180);
        }
        return hasInput();
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
    await waitInput(50);
    for (let i = 0; i < 40; i++) {
        const tail = await bufferTail();
        const yn = /please answer yes or no|Have you played|Do you need instructions|Y\/N|yes or no/i.test(tail);
        const stillTalk = /Can you hear me|remember our name|half person|I was Alex|You were\.\.\.|need you on form|unrecognizable|synthesis/i.test(tail);
        const playable = /You can see|You are carrying|is a dumpster|letter-remover|obvious exits|You are in |This is |north of |south of |This alley runs/i.test(tail)
            && !stillTalk && !yn;
        if (playable && await hasInput()) { skipLog.push({ i, action: "playable" }); break; }
        if (!(await hasInput())) {
            await page.keyboard.press("Space");
            skipLog.push({ i, action: "space" });
            await page.waitForTimeout(180);
            continue;
        }
        if (yn || stillTalk || /Can you hear me|remember our name|Are you|Shall I|ready\?/i.test(tail)) {
            await inject("yes");
            skipLog.push({ i, action: "yes" });
            continue;
        }
        await inject("look");
        skipLog.push({ i, action: "look" });
    }
    await inject("look");

    const before = await page.evaluate(HELPERS);
    const src = before.locAddr;
    const moveTrials = [];
    let dest = 0;
    let moved = null;
    for (const d of ["north", "east", "south", "west"]) {
        const locBefore = (moved && moved.locAddr) || src;
        await inject(d);
        const after = await page.evaluate(HELPERS);
        const changed = after.locAddr && after.locAddr !== locBefore;
        moveTrials.push({
            command: d,
            locBefore,
            locAfter: after.locAddr,
            changed,
            locName: after.loc && after.loc.name,
            closedHere: after.closedHere,
            look: after.look && after.look.slice(-160)
        });
        if (changed && !dest) {
            dest = after.locAddr;
            moved = after;
            break;
        }
    }

    let hunt = null;
    if (src && dest) {
        hunt = await page.evaluate(HUNT, { src, dest });
    }

    // Second move for a second connection (constrain slot/index).
    let hunt2 = null;
    let dest2 = 0;
    if (moved) {
        for (const d of ["east", "west", "south", "north"]) {
            const locBefore = moved.locAddr;
            await inject(d);
            const after = await page.evaluate(HELPERS);
            if (after.locAddr && after.locAddr !== locBefore) {
                dest2 = after.locAddr;
                hunt2 = await page.evaluate(HUNT, { src: locBefore, dest: dest2 });
                moved = after;
                moveTrials.push({
                    command: d,
                    locBefore,
                    locAfter: after.locAddr,
                    changed: true,
                    locName: after.loc && after.loc.name,
                    closedHere: after.closedHere
                });
                break;
            }
        }
    }

    let openTrial = null;
    const snap = moved || before;
    const cand = (snap.closedHere && snap.closedHere[0])
        || (snap.openableHere && snap.openableHere.find((o) => o.openable && !o.open))
        || (before.closedHere && before.closedHere[0])
        || (before.inventory && before.inventory.find((o) => o.openable && !o.open));
    if (cand && cand.dict && cand.dict.length) {
        const noun = cand.dict.find((d) => !/things|device|rooms|backdrops|facades|container/i.test(d)) || cand.dict[0];
        await inject("open " + noun);
        const after = await page.evaluate(HELPERS);
        const afterObj = [].concat(after.locKids || [], after.inventory || [], after.openableHere || [])
            .find((o) => o && o.addr === cand.addr);
        openTrial = {
            command: "open " + noun,
            addr: cand.addr,
            name: cand.name,
            dict: cand.dict,
            beforeBytes: cand.bytes,
            afterBytes: afterObj && afterObj.bytes,
            bytesChanged: !!(afterObj && JSON.stringify(cand.bytes) !== JSON.stringify(afterObj.bytes)),
            lsbBefore: cand.lsb,
            lsbAfter: afterObj && afterObj.lsb,
            look: after.look && after.look.slice(-220)
        };
    }

    await page.close();
    return {
        story, errors, skipLog: skipLog.slice(-10),
        identifierNameAt: before.identifierNameAt,
        commonHead: before.commonHead,
        loc: before.loc,
        locKey: before.locKey,
        locKids: before.locKids,
        inventory: before.inventory,
        p25: before.p25,
        p334: before.p334,
        dirs: before.dirs,
        locIndiv: before.locIndiv,
        indivSample: before.indivSample,
        closedHere: before.closedHere,
        openableHere: before.openableHere,
        moveTrials,
        hunt, hunt2,
        openTrial,
        playableLook: before.look && before.look.slice(-220)
    };
}

(async () => {
    const stories = process.argv.slice(2);
    if (!stories.length) {
        stories.push("games/CounterfeitMonkey.gblorb.js", "games/Alabaster.gblorb.js");
    }
    const browser = await chromium.launch({
        executablePath: process.env.PW_CHROME || undefined,
        headless: true
    });
    const results = [];
    for (const story of stories) {
        try {
            results.push(await runStory(browser, story));
        } catch (e) {
            results.push({ story, fatal: String(e && e.stack || e) });
        }
    }
    await browser.close();
    const outPath = path.join(ROOT, "harness", "_d38_p2_mapkey.out.json");
    fs.writeFileSync(outPath, JSON.stringify(results, null, 2));
    const slim = results.map((r) => ({
        story: r.story,
        fatal: r.fatal || null,
        errors: r.errors || [],
        identifierNameAt: r.identifierNameAt,
        locName: r.loc && r.loc.name,
        locKey: r.locKey,
        p25: r.p25,
        p334: r.p334,
        kids: (r.locKids || []).map((k) => k.name),
        inv: (r.inventory || []).map((k) => k.name),
        closedHere: r.closedHere,
        moveTrials: r.moveTrials,
        hunt: r.hunt && {
            srcKey: r.hunt.srcKey,
            destKey: r.hunt.destKey,
            destHits: r.hunt.destHits,
            nPairs: (r.hunt.pairs || []).length,
            nTriples: (r.hunt.triples || []).length,
            pairs: r.hunt.pairs,
            triples: r.hunt.triples,
            neighborhoods: r.hunt.neighborhoods,
            indexTrials: r.hunt.indexTrials,
            gridHits: r.hunt.gridHits
        },
        hunt2: r.hunt2 && {
            srcKey: r.hunt2.srcKey,
            destKey: r.hunt2.destKey,
            destHits: r.hunt2.destHits,
            nPairs: (r.hunt2.pairs || []).length,
            nTriples: (r.hunt2.triples || []).length,
            pairs: r.hunt2.pairs,
            triples: r.hunt2.triples,
            indexTrials: r.hunt2.indexTrials,
            gridHits: r.hunt2.gridHits
        },
        dirs: r.dirs,
        locIndiv: r.locIndiv,
        indivSample: (r.indivSample || []).filter((x) => x.n),
        openTrial: r.openTrial && {
            command: r.openTrial.command,
            bytesChanged: r.openTrial.bytesChanged,
            lsbBefore: r.openTrial.lsbBefore,
            lsbAfter: r.openTrial.lsbAfter,
            look: r.openTrial.look && r.openTrial.look.slice(-140)
        },
        playableLook: r.playableLook
    }));
    console.log("wrote", outPath);
    console.log(JSON.stringify(slim, null, 2));
})().catch((e) => { console.error("FATAL", e); process.exit(1); });
