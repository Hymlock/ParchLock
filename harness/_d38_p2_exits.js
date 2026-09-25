/* D38 P2 remaining-gap probe: I7 Map_Storage + printed names + OPEN bit.
 * Read-only. No product files. No GlulxRamProvider.
 *
 * Prior probes found parent(player), LSB attrs, loc children, inventory,
 * and a real north move (Back Alley -> Sigil Street). They looked for the
 * SOURCE room inside a 12-slot row, but I7 Map_Storage rows contain
 * DESTINATIONS. This probe uses the known dest to find the array, then
 * checks room-list order / IK1_Count / IK1_link as the row key.
 *
 * Usage: node harness/_d38_p2_exits.js [story.js]
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
            const words = [];
            for (let w = 0; w < Math.min(len, 16); w++) words.push(rw(data + w * 4));
            out.push({ id, len, data, words });
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
    function propVal(addr, id) {
        const p = parseProps(rw(addr + OFF_PROPS)).find((x) => x.id === id);
        return p ? p.words[0] : null;
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
    function propName(id) {
        if (id >= 0 && id < commonNames.length && commonNames[id]) return commonNames[id];
        if (id >= 1 && id - 1 < commonNames.length && commonNames[id - 1]) return commonNames[id - 1] + "?off1";
        return null;
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
    const isDir = (addr) => kindsOf(addr).some((n) => /direction/i.test(n)) || dictWords(addr).some((d) => /^(north|south|east|west|up|down|in|out|northeast|northwest|southeast|southwest|n|s|e|w)$/i.test(d));
    let compass = 0;
    for (let i = 0; i < all.length; i++) if (hwName(all[i]) === "compass") { compass = all[i]; break; }
    const compassKids = compass ? children(compass) : [];
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
    const dirs = all.filter(isDir);
    const k1 = all.find((a) => hwName(a) === "K1_room") || 0;

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

    const ik1OnRooms = rooms.slice(0, 12).map((r) => ({
        addr: r,
        dict: dictWords(r).slice(0, 4),
        p26: propVal(r, 26),
        p26name: propName(26),
        p31: propVal(r, 31),
        p31name: propName(31),
        p32: propVal(r, 32),
        p32name: propName(32),
        p24: propVal(r, 24),
        p25: propVal(r, 25),
        p40: propVal(r, 40)
    }));
    const k1Props = k1 ? parseProps(rw(k1 + OFF_PROPS)).filter((p) => p.id >= 24 && p.id <= 40).map((p) => ({
        id: p.id, name: propName(p.id), words: p.words.slice(0, 4)
    })) : [];

    const dirInfo = compassKids.map((c) => ({
        addr: c,
        dict: dictWords(c).slice(0, 4),
        p26: propVal(c, 26),
        p28: propVal(c, 28),
        p28name: propName(28),
        p23: propVal(c, 23),
        p23name: propName(23),
        p24: propVal(c, 24),
        p25: propVal(c, 25)
    }));

    const locKids = locAddr ? children(locAddr).filter((c) => c !== playerAddr).map((c) => ({
        addr: c,
        dict: dictWords(c).slice(0, 6),
        kinds: kindsOf(c).slice(0, 3),
        lsb: bitsLsb(c),
        bytes: attrBytes(c),
        nKids: children(c).length,
        parent: rw(c + OFF_PARENT)
    })) : [];
    const inventory = playerAddr ? children(playerAddr).map((c) => ({
        addr: c,
        dict: dictWords(c).slice(0, 6),
        kinds: kindsOf(c).slice(0, 3),
        lsb: bitsLsb(c),
        bytes: attrBytes(c)
    })) : [];

    const look = (() => {
        try {
            const el = document.querySelector(".BufferWindow, #windowport");
            return ((el && el.innerText) || "").slice(-700);
        } catch (e) { return ""; }
    })();

    return {
        ramstart, endmem, numAttr, indivStart, objectCount: all.length, roomCount: rooms.length,
        playerAddr, locAddr,
        locDict: locAddr ? dictWords(locAddr).slice(0, 6) : [],
        locKinds: locAddr ? kindsOf(locAddr) : [],
        locHw: locAddr ? (hwName(locAddr) || "") : "",
        locLsb: locAddr ? bitsLsb(locAddr) : [],
        locKids, inventory,
        ik1OnRooms, k1Props, dirInfo,
        commonNamed: commonNames.map((n, i) => ({ i, n })).filter((x) => x.n),
        look
    };
};

function huntMapAndNames(page, src, dest) {
    return page.evaluate(({ src, dest }) => {
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
        const isObj = (a) => !!(a && a >= ramstart && rb(a) === 0x70);
        function decodeE0(ptr, cap) {
            if (rb(ptr) !== 0xe0) return null;
            let s = "";
            cap = cap || 40;
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
            cap = cap || 40;
            for (let step = 0; step < 40000 && s.length < cap; step++) {
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
                    s += c >= 32 && c < 127 ? String.fromCharCode(c) : "?";
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
            const n = rw(ptr);
            if (n < 0 || n > 800) return [];
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
                p.words.forEach((w) => { if (isObj(w)) { const n = hwName(w); if (n) names.push(n); } });
            });
            return names;
        }
        const isRoom = (addr) => kindsOf(addr).some((n) => /^K1_room$/i.test(n) || /_room$/i.test(n));
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
        const rooms = all.filter(isRoom);
        const instances = rooms.filter((r) => {
            const hw = hwName(r) || "";
            if (/^K\d+_/.test(hw)) return false;
            return dictWords(r).length > 0;
        });
        const roomSet = new Set(rooms);
        const srcIdx = rooms.indexOf(src);
        const destIdx = rooms.indexOf(dest);
        const srcInst = instances.indexOf(src);
        const destInst = instances.indexOf(dest);

        function scoreRow(ptr, nDir) {
            let roomsN = 0, zeros = 0, objs = 0, junk = 0, hasDest = false, hasSrc = false;
            const words = [];
            for (let i = 0; i < nDir; i++) {
                const w = rw(ptr + i * 4);
                let kind = "zero";
                if (!w) { zeros++; }
                else if (w === dest) { roomsN++; hasDest = true; kind = "DEST"; }
                else if (w === src) { roomsN++; hasSrc = true; kind = "SRC"; }
                else if (roomSet.has(w)) { roomsN++; kind = "room"; }
                else if (isObj(w)) { objs++; kind = "obj"; }
                else { junk++; kind = "junk"; }
                words.push({
                    i, w, kind,
                    dict: (kind === "room" || kind === "DEST" || kind === "SRC" || kind === "obj") ? dictWords(w).slice(0, 3) : []
                });
            }
            return { ptr, nDir, roomsN, zeros, objs, junk, hasDest, hasSrc, words };
        }

        const destHits = [];
        const lo = ramstart;
        const hi = Math.min(endmem - 4, ramstart + 4 * 1024 * 1024);
        for (let a = lo; a < hi; a += 4) {
            if (rw(a) !== dest) continue;
            destHits.push(a);
            if (destHits.length >= 80) break;
        }

        const candidates = [];
        destHits.forEach((at) => {
            [12, 16, 8].forEach((nDir) => {
                for (let back = 0; back < nDir; back++) {
                    const ptr = at - back * 4;
                    if (ptr < ramstart) continue;
                    const row = scoreRow(ptr, nDir);
                    if (row.junk > 1) continue;
                    if (row.roomsN < 1) continue;
                    if (!row.hasDest) continue;
                    const density = row.roomsN / nDir;
                    const zeroish = row.zeros / nDir;
                    if (density < 0.05 && row.roomsN < 2) continue;
                    candidates.push(Object.assign({ at, back, zeroish, density }, row));
                }
            });
        });
        candidates.sort((a, b) => {
            const sa = (a.hasDest ? 4 : 0) + a.roomsN - a.junk * 3 + (a.nDir === 12 ? 1 : 0) + a.zeros * 0.1;
            const sb = (b.hasDest ? 4 : 0) + b.roomsN - b.junk * 3 + (b.nDir === 12 ? 1 : 0) + b.zeros * 0.1;
            return sb - sa;
        });
        const best = candidates[0] || null;

        let arrayGuess = null;
        if (best) {
            const nDir = best.nDir;
            const rowBytes = nDir * 4;
            // Walk backwards by row size while previous row looks map-like.
            let start = best.ptr;
            for (let i = 0; i < 400; i++) {
                const prev = start - rowBytes;
                if (prev < ramstart) break;
                const row = scoreRow(prev, nDir);
                if (row.junk > 2 || (row.roomsN === 0 && row.objs === 0)) break;
                start = prev;
            }
            let end = best.ptr + rowBytes;
            for (let i = 0; i < 400; i++) {
                if (end + rowBytes > endmem) break;
                const row = scoreRow(end, nDir);
                if (row.junk > 2 || (row.roomsN === 0 && row.objs === 0)) break;
                end += rowBytes;
            }
            const nRows = Math.floor((end - start) / rowBytes);
            const srcRowPtr = start + srcIdx * rowBytes;
            const srcRow = (srcIdx >= 0 && srcRowPtr + rowBytes <= endmem) ? scoreRow(srcRowPtr, nDir) : null;
            const destSlot = best.back;
            arrayGuess = {
                start, end, nDir, nRows, rowBytes,
                bestPtr: best.ptr,
                bestRowIndexFromStart: Math.floor((best.ptr - start) / rowBytes),
                srcIdxAmongK1: srcIdx,
                destIdxAmongK1: destIdx,
                srcRowMatchesBest: srcRowPtr === best.ptr,
                srcRowHasDest: !!(srcRow && srcRow.hasDest),
                srcRowDestSlot: srcRow ? srcRow.words.findIndex((w) => w.kind === "DEST") : -1,
                destSlotInBest: destSlot,
                srcRow: srcRow && {
                    ptr: srcRow.ptr,
                    roomsN: srcRow.roomsN,
                    zeros: srcRow.zeros,
                    words: srcRow.words.filter((w) => w.kind !== "zero")
                }
            };
        }

        // Printed-name hunt: latin-1 "Back Alley" / "Sigil Street" in RAM, plus E0 strings.
        function findAscii(needle) {
            const hits = [];
            const n = needle.length;
            for (let a = 0; a < endmem - n && hits.length < 6; a++) {
                let ok = true;
                for (let i = 0; i < n; i++) {
                    if (rb(a + i) !== needle.charCodeAt(i)) { ok = false; break; }
                }
                if (!ok) continue;
                const pre = a > 0 ? rb(a - 1) : 0;
                hits.push({ at: a, pre, e0: pre === 0xe0, asPtrHits: 0 });
            }
            hits.forEach((h) => {
                const target = h.e0 ? h.at - 1 : h.at;
                let nptr = 0;
                for (let a = ramstart; a < Math.min(endmem, ramstart + 4 * 1024 * 1024) && nptr < 8; a += 4) {
                    if (rw(a) === target) nptr++;
                }
                h.asPtrHits = nptr;
            });
            return hits;
        }

        return {
            destHits: destHits.length,
            destHitSample: destHits.slice(0, 8),
            candidates: candidates.slice(0, 6).map((c) => ({
                ptr: c.ptr, nDir: c.nDir, back: c.back, roomsN: c.roomsN, zeros: c.zeros, junk: c.junk,
                hasSrc: c.hasSrc, density: c.density,
                words: c.words.filter((w) => w.kind !== "zero")
            })),
            arrayGuess,
            nameHits: {
                backAlley: findAscii("Back Alley"),
                sigilStreet: findAscii("Sigil Street"),
                backAlleyComma: findAscii("Back Alley,")
            },
            srcDict: dictWords(src).slice(0, 6),
            destDict: dictWords(dest).slice(0, 6),
            srcHw: hwName(src) || "",
            destHw: hwName(dest) || "",
            roomCount: rooms.length
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
    for (let i = 0; i < 40 && !(await hasInput()); i++) {
        await page.keyboard.press("Space");
        await page.waitForTimeout(180);
    }
    const skipLog = [];
    for (let i = 0; i < 36; i++) {
        const tail = await page.evaluate(() => {
            const el = document.querySelector(".BufferWindow, #windowport");
            return ((el && el.innerText) || "").slice(-500);
        });
        const stillTalk = /Can you hear me|remember our name|half person|I was Alex|You were\.\.\.|need you on form|unrecognizable|synthesis|Have you played/i.test(tail);
        const playable = /You can see|You are carrying|is a dumpster|letter-remover|obvious exits|You are in |This is |north of |south of |This alley runs/i.test(tail)
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
    const moved = after.locAddr && after.locAddr !== locBefore;

    let hunt = null;
    if (moved) {
        hunt = await huntMapAndNames(page, locBefore, after.locAddr);
    }

    // OPEN: prefer an in-scope closed openable after the move.
    const pool = [].concat(after.locKids || [], after.inventory || []);
    const openCand = pool.find((k) => (k.lsb || []).indexOf("openable") >= 0 && (k.lsb || []).indexOf("open") < 0)
        || pool.find((k) => (k.lsb || []).indexOf("openable") >= 0)
        || pool.find((k) => (k.kinds || []).some((n) => /container|door/i.test(n)));
    let openTrial = null;
    if (openCand && openCand.dict && openCand.dict[0]) {
        const noun = openCand.dict.find((d) => !/things|device|rooms|backdrops|facades/i.test(d)) || openCand.dict[0];
        await inject("open " + noun);
        const afterOpen = await page.evaluate((addr) => {
            const rb = (a) => Quixe.ReadByte(a) & 0xff;
            const internals = Quixe.get_vm_internals();
            const numAttr = (internals.accel_params[7] | 0) || 7;
            const bytes = [];
            for (let i = 0; i < numAttr; i++) bytes.push(rb(addr + 1 + i));
            const lsb = [];
            for (let n = 0; n < numAttr * 8; n++) {
                const byteM = bytes[Math.floor(n / 8)];
                if (((byteM >> (n % 8)) & 1) === 1) lsb.push(n);
            }
            const el = document.querySelector(".BufferWindow, #windowport");
            return { bytes, lsb, look: ((el && el.innerText) || "").slice(-220) };
        }, openCand.addr);
        openTrial = {
            command: "open " + noun,
            addr: openCand.addr,
            dict: openCand.dict,
            kinds: openCand.kinds,
            lsbBefore: openCand.lsb,
            beforeBytes: openCand.bytes,
            afterBytes: afterOpen.bytes,
            bytesChanged: JSON.stringify(openCand.bytes) !== JSON.stringify(afterOpen.bytes),
            lsbBitsAfter: afterOpen.lsb,
            look: afterOpen.look
        };
    }

    await page.close();
    return {
        story, errors,
        skipTail: skipLog.slice(-8),
        before: {
            playerAddr: before.playerAddr,
            locAddr: before.locAddr,
            locDict: before.locDict,
            locKids: before.locKids,
            inventory: before.inventory,
            ik1OnRooms: before.ik1OnRooms,
            k1Props: before.k1Props,
            dirInfo: before.dirInfo,
            roomCount: before.roomCount,
            look: before.look && before.look.slice(-220)
        },
        after: {
            locAddr: after.locAddr,
            locDict: after.locDict,
            locKids: after.locKids,
            look: after.look && after.look.slice(-180)
        },
        moved,
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
    const outPath = path.join(ROOT, "harness", "_d38_p2_exits.out.json");
    fs.writeFileSync(outPath, JSON.stringify(result, null, 2));
    console.log("wrote", outPath);
    const slim = {
        story: result.story,
        fatal: result.fatal || null,
        errors: result.errors || [],
        skipTail: result.skipTail,
        locBefore: result.before && result.before.locDict,
        locAfter: result.after && result.after.locDict,
        moved: result.moved,
        roomCount: result.before && result.before.roomCount,
        ik1Sample: result.before && (result.before.ik1OnRooms || []).slice(0, 4),
        k1Props: result.before && result.before.k1Props,
        dirInfo: result.before && (result.before.dirInfo || []).slice(0, 4),
        destKids: result.after && (result.after.locKids || []).map((k) => ({ dict: k.dict, kinds: k.kinds, lsb: k.lsb })),
        hunt: result.hunt && {
            destHits: result.hunt.destHits,
            candidates: result.hunt.candidates,
            arrayGuess: result.hunt.arrayGuess,
            nameHits: result.hunt.nameHits,
            srcDict: result.hunt.srcDict,
            destDict: result.hunt.destDict,
            srcHw: result.hunt.srcHw,
            destHw: result.hunt.destHw,
            roomCount: result.hunt.roomCount
        },
        openTrial: result.openTrial && {
            command: result.openTrial.command,
            bytesChanged: result.openTrial.bytesChanged,
            lsbBefore: result.openTrial.lsbBefore,
            dict: result.openTrial.dict,
            look: result.openTrial.look && result.openTrial.look.slice(-140)
        }
    };
    console.log(JSON.stringify(slim, null, 2));
})().catch((e) => { console.error("FATAL", e); process.exit(1); });
