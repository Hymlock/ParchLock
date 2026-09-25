/* D38 P2 remaining-hole probe — generic exit formula across ≥2 Glulx titles.
 * Read-only. No product files. No GlulxRamProvider.
 *
 * Prior probes proved: 0x70 records, parent(player)=location, LSB attrs,
 * loc children, inventory, printed names = instance dict minus kind words
 * ("back alley"), live north move Back Alley -> Sigil Street.
 *
 * Still open: a P3-safe exits[] formula. CM p334/local_map (values 58/59)
 * produced a reciprocal 12-slot row, but CosmoServe p334 is a pointer
 * (992633), so that cannot be the generic I7 Map_Storage index.
 *
 * This probe tests, after a real cardinal move on 3 titles:
 *   row key = IK1_Count at pid 25 and pid 26, 0-based and 1-based
 *   nDir = 12 / 16 / 20
 *   slot schemes = compass-child index vs clockwise (n,ne,e,se,s,sw,w,nw,u,d,in,out)
 * and requires destRow[opposite(slot)] == src (reciprocal).
 *
 * Also records a draft collect() matching the #251 / ZRamProvider shape,
 * and retries an in-scope OPEN (not a locked out-of-scope door).
 *
 * Usage: node harness/_d38_p2_formula.js [story.js ...]
 */
const { chromium } = require("playwright");
const { pathToFileURL } = require("node:url");
const path = require("node:path");
const fs = require("fs");
const ROOT = path.resolve(__dirname, "..");

const STORIES = process.argv.slice(2).length
    ? process.argv.slice(2)
    : [
        "games/CounterfeitMonkey.gblorb.js",
        "games/CosmoServe.gblorb.js",
        "games/Alabaster.gblorb.js"
    ];

const CARD = ["north","south","east","west","northeast","northwest","southeast","southwest","up","down","in","out"];
const CLOCK = {
    north: 0, northeast: 1, east: 2, southeast: 3,
    south: 4, southwest: 5, west: 6, northwest: 7,
    up: 8, down: 9, in: 10, out: 11, inside: 10, outside: 11
};
const OPP = {
    north: "south", south: "north", east: "west", west: "east",
    northeast: "southwest", southwest: "northeast",
    northwest: "southeast", southeast: "northwest",
    up: "down", down: "up", in: "out", out: "in",
    inside: "outside", outside: "inside"
};

const SNAP = () => {
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
            const words = [];
            for (let w = 0; w < Math.min(len, 16); w++) words.push(rw(data + w * 4));
            out.push({ id, len, data, words });
        }
        return out;
    }
    function cpTab(obj, id) {
        if (!isObj(obj)) return 0;
        const otab = rw(obj + OFF_PROPS);
        if (!otab) return 0;
        const max = rw(otab);
        if (max < 0 || max > 800) return 0;
        let lo = 0, hi = max - 1;
        while (lo <= hi) {
            const mid = (lo + hi) >> 1;
            const entry = otab + 4 + mid * 10;
            const pid = rs(entry);
            if (pid === id) return entry;
            if (pid < id) lo = mid + 1; else hi = mid - 1;
        }
        return 0;
    }
    function rvPr(obj, id) {
        const prop = cpTab(obj, id);
        if (prop) return rw(rw(prop + 4));
        if (id > 0 && id < indivStart && cpv) return rw(cpv + 4 * id);
        return 0;
    }
    function propWords(obj, id) {
        const prop = cpTab(obj, id);
        if (!prop) return [];
        const len = rs(prop + 2), data = rw(prop + 4), out = [];
        for (let w = 0; w < Math.min(len, 12); w++) out.push(rw(data + w * 4));
        return out;
    }
    function hwName(addr) { return decodeString(rw(addr + OFF_NAME)) || ""; }
    function dictWords(addr) {
        const out = [];
        propWords(addr, 1).forEach((w) => { const d = decodeDictWord(w); if (d) out.push(d); });
        return out;
    }
    function children(addr) {
        const kids = [];
        let c = rw(addr + OFF_CHILD);
        for (let i = 0; i < 80 && c; i++) { kids.push(c); c = rw(c + OFF_SIBLING); }
        return kids;
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
    function pidOf(name) {
        const i = commonNames.indexOf(name);
        return i >= 0 ? i : 0;
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
    function kindsOf(addr) {
        return propWords(addr, 2).filter(isObj).map(hwName).filter(Boolean);
    }
    const isRoom = (addr) => kindsOf(addr).some((n) => /^K1_room$/i.test(n) || /_room$/i.test(n));
    const isPerson = (addr) => kindsOf(addr).some((n) => /person|man|woman|animal/i.test(n));
    function printedName(addr) {
        const dict = dictWords(addr);
        const drop = new Set();
        propWords(addr, 2).filter(isObj).forEach((k) => {
            dictWords(k).forEach((w) => drop.add(w.toLowerCase()));
            const hw = (hwName(k) || "").replace(/^K\d+_/, "").replace(/_/g, " ");
            hw.split(/\s+/).forEach((p) => {
                if (!p) return;
                drop.add(p.toLowerCase());
                if (!/s$/i.test(p)) drop.add(p.toLowerCase() + "s");
            });
        });
        const kept = dict.filter((w) => w && !drop.has(w.toLowerCase()));
        return (kept.length ? kept : dict).join(" ").trim();
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
    function attrsObj(addr) {
        const o = {};
        bitsLsb(addr).forEach((n) => { if (n && n.indexOf("bit-") !== 0) o[n] = true; });
        return o;
    }

    let compass = 0;
    for (let i = 0; i < all.length; i++) if (hwName(all[i]) === "compass") { compass = all[i]; break; }
    const compassKids = compass ? children(compass) : [];
    const CARD_LOCAL = ["north","south","east","west","northeast","northwest","southeast","southwest","up","down","in","out"];
    const dirs = compassKids.map((addr, childIndex) => {
        const dict = dictWords(addr);
        const card = dict.find((d) => CARD_LOCAL.indexOf(d) >= 0) || dict[0] || "";
        return { addr, card, dict: dict.slice(0, 4), childIndex };
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
    const rooms = all.filter(isRoom);
    const roomSet = new Set(rooms);
    const locKids = locAddr ? children(locAddr).filter((c) => c !== playerAddr) : [];
    const inventory = playerAddr ? children(playerAddr) : [];

    const pid25 = pidOf("IK1_Count") || 25;
    const pid26 = pidOf("IK1_Count") ? pidOf("IK1_Count") + 1 : 26;
    const pid334 = pidOf("p82_local_map") || 334;

    function objPayload(addr) {
        return {
            id: addr,
            name: printedName(addr),
            parentId: rw(addr + OFF_PARENT),
            attrs: attrsObj(addr),
            confidence: 0.85,
            discovered: true
        };
    }
    const look = (() => {
        try {
            const el = document.querySelector(".BufferWindow, #windowport");
            return ((el && el.innerText) || "").slice(-500);
        } catch (e) { return ""; }
    })();
    const payloadNow = (() => {
        try {
            if (typeof WorldModel === "undefined" || !WorldModel.lastPayload) return null;
            const p = WorldModel.lastPayload;
            return {
                roomId: p.roomId || null,
                roomName: p.roomName || "",
                exits: (p.exits || []).length,
                discovered: (p.discoveredObjects || []).length,
                inventory: (p.inventory || []).length,
                engineMode: p.engineMode || "",
                sources: (p.sources || []).map((s) => s && s.name)
            };
        } catch (e) { return { error: String(e) }; }
    })();

    const closedHere = locKids.concat(inventory).map((addr) => {
        const b = bitsLsb(addr);
        return {
            addr,
            name: printedName(addr),
            dict: dictWords(addr).slice(0, 4),
            lsb: b,
            open: b.indexOf("open") >= 0,
            openable: b.indexOf("openable") >= 0,
            container: b.indexOf("container") >= 0,
            bytes: attrBytes(addr)
        };
    }).filter((o) => o.openable || o.container);

    return {
        ramstart, endmem, numAttr, objectCount: all.length, roomCount: rooms.length,
        pid25, pid26, pid334,
        commonHead: commonNames.slice(0, 36).map((n, i) => ({ i, n })),
        playerAddr, locAddr,
        locName: locAddr ? printedName(locAddr) : "",
        locDict: locAddr ? dictWords(locAddr) : [],
        locIK1_25: locAddr ? rvPr(locAddr, pid25) : null,
        locIK1_26: locAddr ? rvPr(locAddr, pid26) : null,
        locP334: locAddr ? rvPr(locAddr, pid334) : null,
        dirs: dirs.map((d) => ({ card: d.card, childIndex: d.childIndex, dict: d.dict })),
        locKids: locKids.map(objPayload).filter((o) => o.name),
        inventory: inventory.map(objPayload).filter((o) => o.name),
        closedHere,
        look, payloadNow,
        roomAddrs: rooms.slice(0, 4)
    };
};

const HUNT = ({ src, dest, moveCard, pid25, pid26, pid334 }) => {
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
    const numAttr = (accel[7] | 0) || 7;
    const classAddr = accel[2] | 0;
    const cpv = accel[8] | 0;
    const indivStart = accel[1] | 0;
    const OFF_NEXT = 1 + numAttr;
    const OFF_NAME = OFF_NEXT + 4;
    const OFF_PROPS = OFF_NAME + 4;
    const OFF_PARENT = OFF_PROPS + 4;
    const OFF_SIBLING = OFF_PARENT + 4;
    const OFF_CHILD = OFF_SIBLING + 4;
    const isObj = (a) => !!(a && a >= ramstart && a < endmem && rb(a) === 0x70);
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
            out.push({ id: rs(base), len: rs(base + 2), data: rw(base + 4) });
        }
        return out;
    }
    function cpTab(obj, id) {
        if (!isObj(obj)) return 0;
        const otab = rw(obj + OFF_PROPS);
        if (!otab) return 0;
        const max = rw(otab);
        if (max < 0 || max > 800) return 0;
        let lo = 0, hi = max - 1;
        while (lo <= hi) {
            const mid = (lo + hi) >> 1;
            const entry = otab + 4 + mid * 10;
            const pid = rs(entry);
            if (pid === id) return entry;
            if (pid < id) lo = mid + 1; else hi = mid - 1;
        }
        return 0;
    }
    function rvPr(obj, id) {
        const prop = cpTab(obj, id);
        if (prop) return rw(rw(prop + 4));
        if (id > 0 && id < indivStart && cpv) return rw(cpv + 4 * id);
        return 0;
    }
    function hwName(addr) {
        const p = rw(addr + OFF_NAME);
        if (!p || rb(p) !== 0xe0) return "";
        let s = "";
        for (let i = p + 1; i < p + 40; i++) {
            const c = rb(i); if (!c) break;
            s += c >= 32 && c < 127 ? String.fromCharCode(c) : "?";
        }
        return s;
    }
    function dictWords(addr) {
        const prop = cpTab(addr, 1);
        if (!prop) return [];
        const len = rs(prop + 2), data = rw(prop + 4), out = [];
        for (let w = 0; w < Math.min(len, 8); w++) {
            const d = decodeDictWord(rw(data + w * 4));
            if (d) out.push(d);
        }
        return out;
    }
    function children(addr) {
        const kids = [];
        let c = rw(addr + OFF_CHILD);
        for (let i = 0; i < 40 && c; i++) { kids.push(c); c = rw(c + OFF_SIBLING); }
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
    function isRoom(addr) {
        const prop = cpTab(addr, 2);
        if (!prop) return false;
        const len = rs(prop + 2), data = rw(prop + 4);
        for (let w = 0; w < Math.min(len, 8); w++) {
            const k = rw(data + w * 4);
            if (isObj(k) && /room/i.test(hwName(k))) return true;
        }
        return false;
    }
    const roomSet = new Set(all.filter(isRoom));
    function label(addr) {
        if (!addr) return "";
        if (addr === src) return "SRC";
        if (addr === dest) return "DEST";
        if (roomSet.has(addr)) return "room:" + dictWords(addr).slice(0, 3).join(" ");
        if (isObj(addr)) return "obj:" + dictWords(addr).slice(0, 2).join(" ");
        return "junk";
    }
    function rowAt(ptr, nDir) {
        const words = [];
        let zeros = 0, roomsN = 0, junk = 0, objs = 0;
        for (let i = 0; i < nDir; i++) {
            const w = rw(ptr + i * 4);
            let kind = "zero";
            if (!w) zeros++;
            else if (w === dest) { roomsN++; kind = "DEST"; }
            else if (w === src) { roomsN++; kind = "SRC"; }
            else if (roomSet.has(w)) { roomsN++; kind = "room"; }
            else if (isObj(w)) { objs++; kind = "obj"; }
            else { junk++; kind = "junk"; }
            if (kind !== "zero") words.push({ i, w, kind, name: label(w) });
        }
        return { ptr, zeros, roomsN, junk, objs, words };
    }

    let compass = 0;
    for (let i = 0; i < all.length; i++) if (hwName(all[i]) === "compass") { compass = all[i]; break; }
    const compassKids = compass ? children(compass) : [];
    const childIndex = {};
    compassKids.forEach((addr, i) => {
        const dict = dictWords(addr);
        const card = dict.find((d) => ["north","south","east","west","northeast","northwest","southeast","southwest","up","down","in","out"].indexOf(d) >= 0) || dict[0];
        if (card) childIndex[card] = i;
    });
    const CLOCK = {
        north: 0, northeast: 1, east: 2, southeast: 3,
        south: 4, southwest: 5, west: 6, northwest: 7,
        up: 8, down: 9, in: 10, out: 11
    };
    const OPP = {
        north: "south", south: "north", east: "west", west: "east",
        northeast: "southwest", southwest: "northeast",
        northwest: "southeast", southeast: "northwest",
        up: "down", down: "up", in: "out", out: "in"
    };
    const oppCard = OPP[moveCard] || "";
    const schemes = [
        { name: "child", slot: childIndex[moveCard], opp: childIndex[oppCard] },
        { name: "clock", slot: CLOCK[moveCard], opp: CLOCK[oppCard] }
    ];

    const keys = [
        { name: "IK1_25", srcK: rvPr(src, pid25), destK: rvPr(dest, pid25) },
        { name: "IK1_26", srcK: rvPr(src, pid26), destK: rvPr(dest, pid26) },
        { name: "p334", srcK: rvPr(src, pid334), destK: rvPr(dest, pid334) }
    ];

    const destHits = [];
    const hi = Math.min(endmem - 4, ramstart + 6 * 1024 * 1024);
    for (let a = ramstart; a < hi; a += 4) {
        if (rw(a) === dest) {
            destHits.push(a);
            if (destHits.length >= 40) break;
        }
    }

    const hits = [];
    [12, 16, 20].forEach((nDir) => {
        schemes.forEach((sch) => {
            if (sch.slot == null || sch.opp == null || sch.slot < 0 || sch.opp < 0) return;
            if (sch.slot >= nDir || sch.opp >= nDir) return;
            keys.forEach((key) => {
                [true, false].forEach((zeroBased) => {
                    const sIdx = zeroBased ? key.srcK : key.srcK - 1;
                    const dIdx = zeroBased ? key.destK : key.destK - 1;
                    if (sIdx == null || dIdx == null || sIdx < 0 || dIdx < 0) return;
                    if (sIdx > 4000 || dIdx > 4000) return;
                    destHits.forEach((at) => {
                        const base = at - (sIdx * nDir + sch.slot) * 4;
                        if (base < ramstart || base + (Math.max(sIdx, dIdx) + 1) * nDir * 4 > endmem) return;
                        if (rw(base + (sIdx * nDir + sch.slot) * 4) !== dest) return;
                        const srcRow = rowAt(base + sIdx * nDir * 4, nDir);
                        const destRow = rowAt(base + dIdx * nDir * 4, nDir);
                        if (srcRow.junk > 2 || destRow.junk > 2) return;
                        const recip = rw(base + (dIdx * nDir + sch.opp) * 4) === src;
                        const score = (recip ? 40 : 0) + srcRow.roomsN + destRow.roomsN - 3 * (srcRow.junk + destRow.junk) + (nDir === 12 ? 2 : 0);
                        hits.push({
                            nDir, scheme: sch.name, key: key.name, zeroBased,
                            sIdx, dIdx, slot: sch.slot, opp: sch.opp, base, at,
                            recip, score,
                            srcFilled: srcRow.words,
                            destFilled: destRow.words
                        });
                    });
                });
            });
        });
    });
    hits.sort((a, b) => b.score - a.score);
    const seenH = new Set();
    const unique = [];
    hits.forEach((h) => {
        const k = [h.nDir, h.scheme, h.key, h.zeroBased, h.base].join(":");
        if (seenH.has(k)) return;
        seenH.add(k);
        unique.push(h);
    });
    const recip = unique.filter((h) => h.recip);
    return {
        src, dest, moveCard, oppCard,
        srcIK1_25: rvPr(src, pid25), destIK1_25: rvPr(dest, pid25),
        srcIK1_26: rvPr(src, pid26), destIK1_26: rvPr(dest, pid26),
        srcP334: rvPr(src, pid334), destP334: rvPr(dest, pid334),
        childIndex, destHits: destHits.length,
        destHitSample: destHits.slice(0, 12),
        recipCount: recip.length,
        recip: recip.slice(0, 8),
        best: unique.slice(0, 8)
    };
};

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
        await page.waitForTimeout(800);
        return true;
    }
    async function bufferTail() {
        return page.evaluate(() => {
            const el = document.querySelector(".BufferWindow, #windowport");
            return ((el && el.innerText) || "").slice(-800);
        });
    }

    for (let i = 0; i < 40 && !(await hasInput()); i++) {
        await page.keyboard.press("Space");
        await page.waitForTimeout(180);
    }
    const skipLog = [];
    for (let i = 0; i < 40; i++) {
        const tail = await bufferTail();
        if (/\(more\)|>\s*More\b/i.test(tail) && !(await hasInput())) {
            await page.keyboard.press("Space");
            skipLog.push({ i, action: "more" });
            await page.waitForTimeout(180);
            continue;
        }
        const stillTalk = /Can you hear me|remember our name|half person|I was Alex|You were\.\.\.|need you on form|unrecognizable|synthesis|Have you played interactive fiction/i.test(tail);
        const playable = /You can see|You are carrying|is a dumpster|letter-remover|obvious exits|You are in |This is |north of |south of |This alley runs|Dark Woods|office|Queen|Mirror/i.test(tail)
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

    const before = await page.evaluate(SNAP);
    const locBefore = before.locAddr;
    let moved = null;
    const tryDirs = ["north", "south", "east", "west", "in", "out", "up", "down"];
    for (const d of tryDirs) {
        await inject(d);
        const afterTry = await page.evaluate(SNAP);
        if (afterTry.locAddr && afterTry.locAddr !== locBefore) {
            moved = { command: d, after: afterTry };
            break;
        }
    }
    let hunt = null;
    if (moved) {
        hunt = await page.evaluate(HUNT, {
            src: locBefore,
            dest: moved.after.locAddr,
            moveCard: moved.command,
            pid25: before.pid25,
            pid26: before.pid26,
            pid334: before.pid334
        });
    }

    const draftExits = [];
    const bestRecip = hunt && hunt.recip && hunt.recip[0];
    if (bestRecip) {
        const after = moved.after;
        const filled = bestRecip.srcFilled || [];
        const clockNames = ["north","northeast","east","southeast","south","southwest","west","northwest","up","down","in","out"];
        filled.forEach((w) => {
            if (w.kind !== "DEST" && w.kind !== "room") return;
            let label = "";
            if (bestRecip.scheme === "clock") label = clockNames[w.i] || ("exit-" + w.i);
            else {
                const d = (before.dirs || []).find((x) => x.childIndex === w.i);
                label = (d && d.card) || ("exit-" + w.i);
            }
            draftExits.push({
                label,
                prop: w.i,
                targetRoomId: w.w,
                targetRoomName: (w.name || "").replace(/^(DEST|SRC|room:)/, "").trim(),
                isDoor: false,
                isLocked: false,
                isNonCardinal: ["north","south","east","west","northeast","northwest","southeast","southwest","up","down","in","out"].indexOf(label) < 0,
                hinted: false,
                confidence: 0.85
            });
        });
        // After a move, the current room's exits are destFilled of the hunt
        // (dest is the new location). Rebuild from destFilled for the draft.
        draftExits.length = 0;
        (bestRecip.destFilled || []).forEach((w) => {
            if (w.kind !== "SRC" && w.kind !== "room" && w.kind !== "DEST") return;
            let label = "";
            if (bestRecip.scheme === "clock") label = clockNames[w.i] || ("exit-" + w.i);
            else {
                const d = (before.dirs || []).find((x) => x.childIndex === w.i);
                label = (d && d.card) || ("exit-" + w.i);
            }
            draftExits.push({
                label,
                prop: w.i,
                targetRoomId: w.w,
                targetRoomName: (w.name || "").replace(/^(DEST|SRC|room:)/, "").trim(),
                isDoor: false,
                isLocked: false,
                isNonCardinal: ["north","south","east","west","northeast","northwest","southeast","southwest","up","down","in","out"].indexOf(label) < 0,
                hinted: false,
                confidence: 0.85
            });
        });
    }

    const locNow = (moved && moved.after) || before;
    const draft = {
        sources: [{ name: "glulx-ram", confidence: locNow.locAddr ? 0.95 : 0.02 }],
        engineMode: "structural",
        vmType: "glulx",
        roomId: locNow.locAddr || null,
        roomName: locNow.locName || "",
        discoveredObjects: locNow.locKids || [],
        inventory: locNow.inventory || [],
        exits: draftExits,
        probe: {
            status: "glulx-ram-research",
            playerId: locNow.playerAddr,
            roomId: locNow.locAddr || 0,
            scopeCount: (locNow.locKids || []).length,
            exitFormula: bestRecip ? {
                nDir: bestRecip.nDir, scheme: bestRecip.scheme, key: bestRecip.key,
                zeroBased: bestRecip.zeroBased, base: bestRecip.base
            } : null
        }
    };

    let openTrial = null;
    const cand = (before.closedHere || []).find((o) => o.openable && !o.open)
        || (locNow.closedHere || []).find((o) => o.openable && !o.open)
        || (before.closedHere || [])[0];
    if (cand && cand.dict && cand.dict[0]) {
        const noun = cand.dict[0];
        if (cand.open) await inject("close " + noun);
        await inject("open " + noun);
        const snap = await page.evaluate((addr) => {
            const rb = (a) => Quixe.ReadByte(a) & 0xff;
            const internals = Quixe.get_vm_internals();
            const numAttr = (internals.accel_params[7] | 0) || 7;
            const bytes = [];
            for (let i = 0; i < numAttr; i++) bytes.push(rb(addr + 1 + i));
            const el = document.querySelector(".BufferWindow, #windowport");
            return { bytes, look: ((el && el.innerText) || "").slice(-350) };
        }, cand.addr);
        openTrial = {
            command: "open " + noun,
            addr: cand.addr,
            name: cand.name,
            dict: cand.dict,
            lsbBefore: cand.lsb,
            beforeBytes: cand.bytes,
            afterBytes: snap.bytes,
            bytesChanged: !!(cand.bytes && snap.bytes && cand.bytes.join(",") !== snap.bytes.join(",")),
            look: snap.look
        };
    }

    await page.close();
    return {
        story,
        errors,
        skipTail: skipLog.slice(-8),
        before: {
            playerAddr: before.playerAddr,
            locAddr: before.locAddr,
            locName: before.locName,
            locDict: before.locDict,
            locIK1_25: before.locIK1_25,
            locIK1_26: before.locIK1_26,
            locP334: before.locP334,
            locKids: before.locKids,
            inventory: before.inventory,
            payloadNow: before.payloadNow,
            pid25: before.pid25,
            pid26: before.pid26,
            pid334: before.pid334,
            roomCount: before.roomCount
        },
        moved: moved ? { command: moved.command, locName: moved.after.locName, locAddr: moved.after.locAddr } : null,
        hunt,
        draft,
        openTrial
    };
}

(async () => {
    const browser = await chromium.launch({
        executablePath: process.env.PW_CHROME,
        headless: true
    });
    const results = [];
    for (const story of STORIES) {
        try {
            results.push(await runStory(browser, story));
        } catch (e) {
            results.push({ story, errors: [String(e && e.stack || e)] });
        }
    }
    await browser.close();
    const outPath = path.join(ROOT, "harness", "_d38_p2_formula.out.json");
    fs.writeFileSync(outPath, JSON.stringify(results, null, 2));
    console.log("wrote", outPath);
    results.forEach((r) => {
        const rec = r.hunt && r.hunt.recip ? r.hunt.recip.length : 0;
        const ex = r.draft && r.draft.exits ? r.draft.exits.length : 0;
        console.log(
            r.story,
            "moved=" + JSON.stringify(r.moved),
            "recip=" + rec,
            "draftExits=" + ex,
            "open=" + (r.openTrial && r.openTrial.bytesChanged),
            "err=" + ((r.errors || []).length)
        );
        if (r.hunt && r.hunt.recip && r.hunt.recip[0]) {
            const h = r.hunt.recip[0];
            console.log("  bestRecip", JSON.stringify({
                nDir: h.nDir, scheme: h.scheme, key: h.key, zeroBased: h.zeroBased,
                slot: h.slot, opp: h.opp, base: h.base,
                srcFilled: h.srcFilled, destFilled: h.destFilled
            }));
        }
    });
})().catch((e) => {
    console.error(e);
    process.exit(1);
});
