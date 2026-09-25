/* D38 P2 contract probe — read-only. No product files. No GlulxRamProvider.
 *
 * #251 made the P3 collect() shape the explicit acceptance bar. This probe
 * fills the remaining P2 holes against that shape:
 *   roomId, roomName, exits, discoveredObjects, inventory
 * using live Counterfeit Monkey RAM (plus one second title).
 *
 * Prior probes proved: 0x70 records, parent(player)=location, LSB attrs
 * (10/10 vs MSB 0/10), loc children, inventory, a real north move
 * (Back Alley -> Sigil Street). They did NOT land Map_Storage, printed
 * names, or an in-scope OPEN bit flip.
 *
 * New hypotheses (from identifier-names, not Z-machine carry-over):
 *   door_dir=12, found_in=14, room_index=21, vector=23, KD_Count=25,
 *   IK1_Count=26, IK1_link=32, p82_local_map=334 (value 58 on Back Alley).
 *   Map row = Map_Storage[local_map * 12 + door_dir(north)] == dest.
 *   roomName = dict words (prop 1) minus dict words of kind objects (prop 2).
 *
 * Usage: node harness/_d38_p2_contract.js [story.js ...]
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
            for (let w = 0; w < Math.min(len, 16); w++) words.push(rw(data + w * 4));
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
    function kindAddrs(addr) {
        const out = [];
        parseProps(rw(addr + OFF_PROPS)).forEach((p) => {
            if (p.id !== 2) return;
            p.words.forEach((w) => { if (isObj(w)) out.push(w); });
        });
        return out;
    }
    function kindsOf(addr) {
        return kindAddrs(addr).map((w) => hwName(w)).filter(Boolean);
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
        idHits.push({
            tableAddr: a,
            common: { addr: a0, count: c0 },
            indiv: { addr: a1, count: c1 },
            attrs: { addr: a2, count: c2 }
        });
        if (idHits.length >= 2) break;
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
    const indivNames = idBest ? namesAt(idBest.indiv.addr, Math.min(idBest.indiv.count, 120), 120) : [];
    function propName(id) {
        if (id >= 1 && id - 1 < commonNames.length && commonNames[id - 1]) return commonNames[id - 1];
        if (id >= indivStart && id - indivStart < indivNames.length && indivNames[id - indivStart]) {
            return indivNames[id - indivStart];
        }
        return null;
    }
    function cpvDefault(id) {
        if (!cpv || id < 0) return null;
        const a = cpv + id * 4;
        const b = cpv + (id - 1) * 4;
        return { idx: rw(a), idxMinus1: id > 0 ? rw(b) : null };
    }
    function rawProp(addr, id) {
        return parseProps(rw(addr + OFF_PROPS)).find((p) => p.id === id) || null;
    }
    function propVal(addr, id) {
        const p = rawProp(addr, id);
        if (p && p.words.length) return p.words[0];
        const d = cpvDefault(id);
        return d ? d.idxMinus1 : null;
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
    const containedPersons = [];
    all.forEach((addr) => {
        const par = rw(addr + OFF_PARENT);
        if (!isObj(par) || !isPerson(addr) || !isRoom(par)) return;
        containedPersons.push({ addr, dict: dictWords(addr), parent: par });
    });
    const emptyDict = containedPersons.filter((p) => !p.dict.length);
    const playerAddr = (emptyDict[0] || containedPersons[0] || {}).addr || 0;
    const locAddr = playerAddr ? rw(playerAddr + OFF_PARENT) : 0;

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
    function nameFromDict(addr) {
        const dict = dictWords(addr);
        const kindWords = new Set();
        kindAddrs(addr).forEach((k) => {
            dictWords(k).forEach((w) => kindWords.add(w.toLowerCase()));
            const hw = (hwName(k) || "").replace(/^K\d+_/, "").replace(/_/g, " ");
            if (hw) kindWords.add(hw.toLowerCase());
        });
        const kept = dict.filter((w) => w && !kindWords.has(w.toLowerCase()));
        return (kept.length ? kept : dict).join(" ").trim();
    }

    const k1 = all.find((a) => hwName(a) === "K1_room") || 0;
    const rooms = all.filter(isRoom);
    const roomSet = new Set(rooms);

    const CARD_LOCAL = ["north","south","east","west","northeast","northwest","southeast","southwest","up","down","in","out"];
    function describeDir(addr) {
        const dict = dictWords(addr);
        const card = dict.find((d) => CARD_LOCAL.indexOf(d) >= 0) || dict[0] || "";
        const props = parseProps(rw(addr + OFF_PROPS)).map((p) => ({
            id: p.id, name: propName(p.id), len: p.len, words: p.words.slice(0, 6)
        }));
        return {
            addr, card, dict: dict.slice(0, 4),
            door_dir: propVal(addr, 12),
            door_to: propVal(addr, 13),
            vector: rawProp(addr, 23) && rawProp(addr, 23).words.slice(0, 4),
            room_index: propVal(addr, 21),
            with_key: propVal(addr, 24),
            KD_Count: propVal(addr, 25),
            props: props.filter((p) => p.id === 12 || p.id === 13 || p.id === 21 || p.id === 23 || p.id === 24 || p.id === 25 || (p.name && /door|vector|index|map|dir/i.test(p.name)))
        };
    }
    const dirs = compassKids.map(describeDir);
    const north = dirs.find((d) => d.card === "north") || dirs[0] || null;
    const south = dirs.find((d) => d.card === "south") || null;

    function roomMeta(addr) {
        if (!addr || !isObj(addr)) return null;
        return {
            addr,
            dict: dictWords(addr).slice(0, 6),
            name: nameFromDict(addr),
            kinds: kindsOf(addr).slice(0, 4),
            KD_Count: propVal(addr, 25),
            IK1_Count: propVal(addr, 26),
            IK1_link: propVal(addr, 32),
            room_index: propVal(addr, 21),
            local_map: propVal(addr, 334),
            in_dir: propVal(addr, 332),
            out_dir: propVal(addr, 333),
            hash: propVal(addr, 335)
        };
    }

    function scoreRow(ptr, nDir, dest, src) {
        let roomsN = 0, zeros = 0, objs = 0, junk = 0, hasDest = false, hasSrc = false;
        const words = [];
        for (let i = 0; i < nDir; i++) {
            const w = rw(ptr + i * 4);
            let kind = "zero";
            if (!w) { zeros++; }
            else if (dest && w === dest) { roomsN++; hasDest = true; kind = "DEST"; }
            else if (src && w === src) { roomsN++; hasSrc = true; kind = "SRC"; }
            else if (roomSet.has(w)) { roomsN++; kind = "room"; }
            else if (isObj(w)) { objs++; kind = "obj"; }
            else { junk++; kind = "junk"; }
            words.push({
                i, w, kind,
                name: (kind === "zero" || kind === "junk") ? "" : nameFromDict(w),
                dict: (kind === "zero" || kind === "junk") ? [] : dictWords(w).slice(0, 3)
            });
        }
        return { ptr, nDir, roomsN, zeros, objs, junk, hasDest, hasSrc, words };
    }

    function huntMap(src, dest) {
        if (!dest) return { error: "no dest" };
        const destHits = [];
        const lo = ramstart;
        const hi = Math.min(endmem - 4, ramstart + 5 * 1024 * 1024);
        for (let a = lo; a < hi; a += 4) {
            if (rw(a) !== dest) continue;
            destHits.push(a);
            if (destHits.length >= 60) break;
        }
        const srcMeta = roomMeta(src);
        const destMeta = roomMeta(dest);
        const local = srcMeta && typeof srcMeta.local_map === "number" ? srcMeta.local_map : null;
        const kd = srcMeta && typeof srcMeta.KD_Count === "number" ? srcMeta.KD_Count : null;
        const door = north && north.door_dir;
        const doorCpv = cpvDefault(12);

        const indexTrials = [];
        [12, 16, 8].forEach((nDir) => {
            [local, kd, (kd != null ? kd - 1 : null), (local != null ? local - 1 : null)].forEach((idx) => {
                if (idx == null || idx < 0 || idx > 4000) return;
                [0, 1, 2, 3, 6, door, doorCpv && doorCpv.idxMinus1, doorCpv && doorCpv.idx].forEach((slot) => {
                    if (slot == null || slot < 0 || slot >= nDir) return;
                    destHits.forEach((at) => {
                        const base = at - (idx * nDir + slot) * 4;
                        if (base < ramstart || base > endmem) return;
                        const row = scoreRow(base + idx * nDir * 4, nDir, dest, src);
                        if (!row.hasDest || row.junk > 1) return;
                        const destIdx = destMeta && destMeta.local_map;
                        const destKd = destMeta && destMeta.KD_Count;
                        const destRowIdx = (destIdx != null && destIdx === idx) ? idx : destIdx;
                        let recip = null;
                        if (destRowIdx != null && destRowIdx >= 0) {
                            const southSlot = (south && south.door_dir != null) ? south.door_dir : 1;
                            const dptr = base + destRowIdx * nDir * 4;
                            if (dptr >= ramstart && dptr + nDir * 4 <= endmem) {
                                recip = scoreRow(dptr, nDir, dest, src);
                            }
                        }
                        indexTrials.push({
                            nDir, idx, slot, at, base,
                            rowHasDest: row.hasDest,
                            destAt: row.words.filter((w) => w.kind === "DEST").map((w) => w.i),
                            rowRooms: row.words.filter((w) => w.kind !== "zero" && w.kind !== "junk").map((w) => ({ i: w.i, kind: w.kind, name: w.name, dict: w.dict })),
                            recipHasSrc: !!(recip && recip.hasSrc),
                            recipSrcAt: recip ? recip.words.filter((w) => w.kind === "SRC").map((w) => w.i) : [],
                            recipRooms: recip ? recip.words.filter((w) => w.kind !== "zero" && w.kind !== "junk").map((w) => ({ i: w.i, kind: w.kind, name: w.name, dict: w.dict })) : null
                        });
                    });
                });
            });
        });
        indexTrials.sort((a, b) => {
            const sa = (a.recipHasSrc ? 8 : 0) + (a.nDir === 12 ? 2 : 0) + a.rowRooms.length;
            const sb = (b.recipHasSrc ? 8 : 0) + (b.nDir === 12 ? 2 : 0) + b.rowRooms.length;
            return sb - sa;
        });

        // Also: 12-slot rows with dest at slot 0 (north-first) regardless of index.
        const slot0 = [];
        destHits.forEach((at) => {
            const row = scoreRow(at, 12, dest, src);
            if (row.junk > 1 || !row.hasDest) return;
            if (row.zeros < 6 && row.roomsN < 1) return;
            slot0.push({
                ptr: at,
                roomsN: row.roomsN,
                zeros: row.zeros,
                words: row.words.filter((w) => w.kind !== "zero").map((w) => ({ i: w.i, kind: w.kind, name: w.name, dict: w.dict }))
            });
        });

        return {
            destHits: destHits.length,
            destHitSample: destHits.slice(0, 12),
            srcMeta, destMeta,
            northDoorDir: door,
            southDoorDir: south && south.door_dir,
            doorCpv,
            local_map: local,
            KD_Count: kd,
            bestIndex: indexTrials.slice(0, 8),
            slot0Rows: slot0.slice(0, 8)
        };
    }

    const locKids = locAddr ? children(locAddr).filter((c) => c !== playerAddr) : [];
    const inventory = playerAddr ? children(playerAddr) : [];

    const dumpsterHits = [];
    const openableHits = [];
    all.forEach((addr) => {
        const dict = dictWords(addr);
        const lsb = bitsLsb(addr);
        if (dict.some((d) => /dumpster|trashbin|bin|cupboard|drawer|locker|chest|box/i.test(d))) {
            if (dumpsterHits.length < 12) {
                dumpsterHits.push({
                    addr, dict: dict.slice(0, 6), kinds: kindsOf(addr).slice(0, 3),
                    parent: rw(addr + OFF_PARENT),
                    parentIsLoc: rw(addr + OFF_PARENT) === locAddr,
                    found_in: rawProp(addr, 14) && rawProp(addr, 14).words.slice(0, 6),
                    lsb, name: nameFromDict(addr)
                });
            }
        }
        if (lsb.indexOf("openable") >= 0) {
            const par = rw(addr + OFF_PARENT);
            if (par === locAddr || par === playerAddr) {
                openableHits.push({
                    addr, dict: dict.slice(0, 6), kinds: kindsOf(addr).slice(0, 3),
                    parent: par, lsb, name: nameFromDict(addr), bytes: attrBytes(addr)
                });
            }
        }
    });

    function objPayload(addr) {
        return {
            id: addr,
            name: nameFromDict(addr),
            parentId: rw(addr + OFF_PARENT),
            attrs: attrsObj(addr),
            confidence: 0.85,
            discovered: true
        };
    }

    const look = (() => {
        try {
            const el = document.querySelector(".BufferWindow, #windowport");
            return ((el && el.innerText) || "").slice(-700);
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

    const locMeta = roomMeta(locAddr);
    const draft = {
        sources: [{ name: "glulx-ram", confidence: locAddr ? 0.95 : 0.02 }],
        engineMode: "structural",
        vmType: "glulx",
        roomId: locAddr || null,
        roomName: locAddr ? nameFromDict(locAddr) : "",
        discoveredObjects: locKids.map(objPayload).filter((o) => o.name),
        inventory: inventory.map(objPayload).filter((o) => o.name),
        exits: [],
        probe: { status: "glulx-ram-research", playerId: playerAddr, roomId: locAddr || 0, scopeCount: locKids.length }
    };

    return {
        ramstart, endmem, numAttr, indivStart, cpv, objectCount: all.length, roomCount: rooms.length,
        commonHead: commonNames.slice(0, 40).map((n, i) => ({ id: i + 1, name: n })),
        attrSample: attrNames.slice(0, 24),
        playerAddr, locAddr, locMeta,
        k1Props: k1 ? parseProps(rw(k1 + OFF_PROPS)).slice(0, 20).map((p) => ({
            id: p.id, name: propName(p.id), words: p.words.slice(0, 4)
        })) : [],
        dirs: dirs.map((d) => ({
            card: d.card, dict: d.dict, door_dir: d.door_dir, door_to: d.door_to,
            vector: d.vector, room_index: d.room_index, with_key: d.with_key, KD_Count: d.KD_Count, props: d.props
        })),
        locKids: locKids.map((c) => ({
            addr: c, name: nameFromDict(c), dict: dictWords(c).slice(0, 6),
            kinds: kindsOf(c).slice(0, 3), lsb: bitsLsb(c), parent: rw(c + OFF_PARENT)
        })),
        inventory: inventory.map((c) => ({
            addr: c, name: nameFromDict(c), dict: dictWords(c).slice(0, 6),
            kinds: kindsOf(c).slice(0, 3), lsb: bitsLsb(c)
        })),
        dumpsterHits, openableHits, draft, payloadNow, look
    };
};

function huntAfterMove(page, src, dest) {
    return page.evaluate(({ src, dest }) => {
        // Re-run just the map hunt against known dest by calling the same helpers
        // inlined: we re-evaluate HELPERS-equivalent hunt via a tiny stub that
        // the outer HELPERS already defined? Can't. Duplicate the hunt by
        // reading window.__d38hunt if set. Instead: stash huntMap on a global
        // during HELPERS... we didn't. Return dest/src so caller uses evaluate
        // of HELPERS after move, plus a dedicated hunt function below.
        return { src, dest };
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
    if (moved) {
        hunt = await page.evaluate((pair) => {
            // Recreate hunt using the same HELPERS closure by stuffing src/dest
            // into a global and calling a second evaluate of a hunt-only blob.
            window.__d38_pair = pair;
            return pair;
        }, { src: locBefore, dest: after.locAddr });
        hunt = await page.evaluate(() => {
            const pair = window.__d38_pair;
            // Call HELPERS then huntMap — HELPERS is not in this frame as a fn.
            // Inline a compact hunt using values already computed would require
            // HELPERS. We inject HELPERS' hunt by evaluating the full helper
            // again: patch by reading from a Function constructed from the
            // page's already-loaded Quixe. Duplicate of huntMap from the
            // helper source is heavy; instead recompute via the helper return
            // plus a small hunt copied here.
            const rb = (a) => Quixe.ReadByte(a) & 0xff;
            const rw = (a) => ((typeof Quixe.ReadWord === "function")
                ? Quixe.ReadWord(a) >>> 0
                : ((rb(a) << 24) | (rb(a + 1) << 16) | (rb(a + 2) << 8) | rb(a + 3)) >>> 0);
            const internals = Quixe.get_vm_internals();
            const accel = Array.from(internals.accel_params || []);
            const ramstart = rw(8);
            const endmem = rw(16);
            const numAttr = (accel[7] | 0) || 7;
            const classAddr = accel[2] | 0;
            const cpv = accel[8] | 0;
            const decoding = (internals.stringtable >>> 0) || rw(28);
            const indivStart = accel[1] | 0;
            const classesTable = accel[0] | 0;
            const OFF_NEXT = 1 + numAttr;
            const OFF_NAME = OFF_NEXT + 4;
            const OFF_PROPS = OFF_NAME + 4;
            const isObj = (a) => !!(a && a >= ramstart && rb(a) === 0x70);
            function decodeE0(ptr, cap) {
                if (rb(ptr) !== 0xe0) return null;
                let s = "";
                for (let i = ptr + 1; i < ptr + 1 + (cap || 40); i++) {
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
                    if (t === 2) { const c = rb(node + 1); s += c >= 32 && c < 127 ? String.fromCharCode(c) : "?"; node = root; continue; }
                    if (t === 3) { let i = node + 1; while (rb(i) && s.length < cap) { const c = rb(i++); s += c >= 32 && c < 127 ? String.fromCharCode(c) : "?"; } node = root; continue; }
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
                    p.words.forEach((w) => { if (isObj(w)) { const n = hwName(w); if (n) names.push(n); } });
                });
                return names;
            }
            function looksLikeNameList(addr, count) {
                if (!addr || count < 4 || count > 8000) return null;
                let good = 0;
                for (let i = 0; i < Math.min(count, 10); i++) {
                    const s = decodeString(rw(addr + i * 4));
                    if (s && s.length >= 1 && s.length < 40 && /[A-Za-z_]/.test(s)) good++;
                }
                return good >= 4;
            }
            let commonAddr = 0, commonCount = 0, indivAddr = 0, indivCount = 0;
            const scanLo = Math.max(36, (cpv || ramstart) - 0x20000);
            const scanHi = Math.min(endmem - 48, (classesTable || ramstart) + 0x20000);
            for (let a = scanLo; a < scanHi; a += 4) {
                const c0 = rw(a + 4), a0 = rw(a);
                const c1 = rw(a + 12), a1 = rw(a + 8);
                const c2 = rw(a + 20), a2 = rw(a + 16);
                if (c0 < 8 || c0 > 500 || c2 < 8 || c2 > 80 || c1 < 8 || c1 > 8000) continue;
                if (!looksLikeNameList(a0, c0) || !looksLikeNameList(a2, c2)) continue;
                commonAddr = a0; commonCount = c0; indivAddr = a1; indivCount = c1;
                break;
            }
            function namesAt(addr, count, cap) {
                const out = [];
                for (let i = 0; i < Math.min(count, cap || 80); i++) out.push(decodeString(rw(addr + i * 4)) || "");
                return out;
            }
            const commonNames = commonAddr ? namesAt(commonAddr, commonCount, 80) : [];
            const indivNames = indivAddr ? namesAt(indivAddr, Math.min(indivCount, 120), 120) : [];
            function propName(id) {
                if (id >= 1 && id - 1 < commonNames.length && commonNames[id - 1]) return commonNames[id - 1];
                if (id >= indivStart && id - indivStart < indivNames.length) return indivNames[id - indivStart] || null;
                return null;
            }
            function rawProp(addr, id) {
                return parseProps(rw(addr + OFF_PROPS)).find((p) => p.id === id) || null;
            }
            function propVal(addr, id) {
                const p = rawProp(addr, id);
                if (p && p.words.length) return p.words[0];
                if (!cpv || id < 1) return null;
                return rw(cpv + (id - 1) * 4);
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
            const roomSet = new Set(all.filter(isRoom));
            const src = pair.src, dest = pair.dest;
            function nameFromDict(addr) {
                const dict = dictWords(addr);
                const kindWords = new Set();
                parseProps(rw(addr + OFF_PROPS)).forEach((p) => {
                    if (p.id !== 2) return;
                    p.words.forEach((w) => {
                        if (!isObj(w)) return;
                        dictWords(w).forEach((d) => kindWords.add(d.toLowerCase()));
                    });
                });
                const kept = dict.filter((w) => w && !kindWords.has(w.toLowerCase()));
                return (kept.length ? kept : dict).join(" ");
            }
            function scoreRow(ptr, nDir) {
                const words = [];
                let roomsN = 0, zeros = 0, junk = 0, hasDest = false, hasSrc = false;
                for (let i = 0; i < nDir; i++) {
                    const w = rw(ptr + i * 4);
                    let kind = "zero";
                    if (!w) zeros++;
                    else if (w === dest) { roomsN++; hasDest = true; kind = "DEST"; }
                    else if (w === src) { roomsN++; hasSrc = true; kind = "SRC"; }
                    else if (roomSet.has(w)) { roomsN++; kind = "room"; }
                    else if (isObj(w)) kind = "obj";
                    else { junk++; kind = "junk"; }
                    words.push({ i, w, kind, name: (kind === "zero" || kind === "junk") ? "" : nameFromDict(w), dict: (kind === "zero" || kind === "junk") ? [] : dictWords(w).slice(0, 3) });
                }
                return { ptr, nDir, roomsN, zeros, junk, hasDest, hasSrc, words };
            }
            const destHits = [];
            for (let a = ramstart; a < Math.min(endmem - 4, ramstart + 5 * 1024 * 1024); a += 4) {
                if (rw(a) === dest) { destHits.push(a); if (destHits.length >= 80) break; }
            }
            const srcLocal = propVal(src, 334);
            const destLocal = propVal(dest, 334);
            const srcKd = propVal(src, 25);
            const destKd = propVal(dest, 25);
            const srcIk1 = propVal(src, 26);
            const destIk1 = propVal(dest, 26);
            const northDoor = (() => {
                // compass child's door_dir (prop 12) or cpv default
                let compass = 0;
                for (let i = 0; i < all.length; i++) if (hwName(all[i]) === "compass") { compass = all[i]; break; }
                const kids = [];
                if (compass) {
                    const OFF_CHILD = OFF_PROPS + 12;
                    const OFF_SIBLING = OFF_PROPS + 8;
                    let c = rw(compass + OFF_CHILD);
                    for (let i = 0; i < 20 && c; i++) { kids.push(c); c = rw(c + OFF_SIBLING); }
                }
                const n = kids.find((k) => dictWords(k).indexOf("north") >= 0);
                const s = kids.find((k) => dictWords(k).indexOf("south") >= 0);
                return {
                    north: n ? propVal(n, 12) : rw(cpv + 11 * 4),
                    south: s ? propVal(s, 12) : rw(cpv + 11 * 4),
                    northRaw: n ? rawProp(n, 12) : null,
                    southRaw: s ? rawProp(s, 12) : null,
                    northAll: n ? parseProps(rw(n + OFF_PROPS)).map((p) => ({ id: p.id, name: propName(p.id), words: p.words.slice(0, 4) })) : []
                };
            })();

            const trials = [];
            const idxs = [srcLocal, srcKd, srcIk1, srcLocal - 1, srcKd - 1, srcIk1 - 1].filter((x) => x != null && x >= 0 && x < 5000);
            const slots = [0, 1, 2, 3, 6, northDoor.north, 11].filter((x, i, a) => x != null && x >= 0 && a.indexOf(x) === i);
            [12, 16].forEach((nDir) => {
                idxs.forEach((idx) => {
                    slots.forEach((slot) => {
                        if (slot >= nDir) return;
                        destHits.forEach((at) => {
                            const base = at - (idx * nDir + slot) * 4;
                            if (base < ramstart) return;
                            const row = scoreRow(at - slot * 4, nDir);
                            if (!row.hasDest || row.junk > 1) return;
                            let recip = null;
                            const destIdx = destLocal != null ? destLocal : destKd;
                            if (destIdx != null && destIdx >= 0) {
                                const dptr = base + destIdx * nDir * 4;
                                if (dptr >= ramstart && dptr + nDir * 4 <= endmem) recip = scoreRow(dptr, nDir);
                            }
                            trials.push({
                                nDir, idx, slot, at, base,
                                destSlot: row.words.filter((w) => w.kind === "DEST").map((w) => w.i),
                                row: row.words.filter((w) => w.kind !== "zero" && w.kind !== "junk").map((w) => ({ i: w.i, kind: w.kind, name: w.name, dict: w.dict })),
                                recipHasSrc: !!(recip && recip.hasSrc),
                                recipSrcSlot: recip ? recip.words.filter((w) => w.kind === "SRC").map((w) => w.i) : [],
                                recip: recip ? recip.words.filter((w) => w.kind !== "zero" && w.kind !== "junk").map((w) => ({ i: w.i, kind: w.kind, name: w.name, dict: w.dict })) : null
                            });
                        });
                    });
                });
            });
            trials.sort((a, b) => (b.recipHasSrc ? 10 : 0) + (b.nDir === 12 ? 2 : 0) + b.row.length - ((a.recipHasSrc ? 10 : 0) + (a.nDir === 12 ? 2 : 0) + a.row.length));

            const slot0 = destHits.map((at) => {
                const row = scoreRow(at, 12);
                return {
                    ptr: at, roomsN: row.roomsN, zeros: row.zeros, junk: row.junk, hasDest: row.hasDest,
                    words: row.words.filter((w) => w.kind !== "zero").map((w) => ({ i: w.i, kind: w.kind, name: w.name, dict: w.dict }))
                };
            }).filter((r) => r.hasDest && r.junk <= 1 && r.roomsN >= 1).slice(0, 8);

            return {
                destHits: destHits.length,
                destHitSample: destHits.slice(0, 12),
                srcLocal, destLocal, srcKd, destKd, srcIk1, destIk1,
                northDoor,
                srcName: nameFromDict(src),
                destName: nameFromDict(dest),
                best: trials.slice(0, 10),
                slot0
            };
        });
    }

    const afterKids = after.openableHits || [];
    const beforeOpenable = (before.openableHits || []).concat(afterKids);
    const openCand = beforeOpenable[0] || (after.dumpsterHits || []).find((d) => d.parentIsLoc) || (before.dumpsterHits || [])[0];
    let openTrial = null;
    if (openCand && (openCand.dict && openCand.dict[0] || openCand.name)) {
        const noun = (openCand.dict || []).find((d) => !/things|device|rooms|backdrops|facades/i.test(d)) || (openCand.name || "").split(" ")[0];
        if (noun) {
            await inject("open " + noun);
            const afterOpen = await page.evaluate((addr) => {
                const rb = (a) => Quixe.ReadByte(a) & 0xff;
                const internals = Quixe.get_vm_internals();
                const numAttr = (internals.accel_params[7] | 0) || 7;
                const bytes = [];
                for (let i = 0; i < numAttr; i++) bytes.push(rb(addr + 1 + i));
                const el = document.querySelector(".BufferWindow, #windowport");
                return { bytes, look: ((el && el.innerText) || "").slice(-240) };
            }, openCand.addr);
            openTrial = {
                command: "open " + noun,
                addr: openCand.addr,
                dict: openCand.dict,
                name: openCand.name,
                lsbBefore: openCand.lsb,
                beforeBytes: openCand.bytes || null,
                afterBytes: afterOpen.bytes,
                bytesChanged: JSON.stringify(openCand.bytes || null) !== JSON.stringify(afterOpen.bytes),
                look: afterOpen.look
            };
        }
    }

    await page.close();
    return {
        story, errors,
        skipTail: skipLog.slice(-10),
        before: {
            playerAddr: before.playerAddr,
            locAddr: before.locAddr,
            locMeta: before.locMeta,
            locKids: before.locKids,
            inventory: before.inventory,
            dirs: before.dirs,
            dumpsterHits: before.dumpsterHits,
            openableHits: before.openableHits,
            draft: before.draft,
            payloadNow: before.payloadNow,
            k1Props: before.k1Props,
            commonHead: before.commonHead,
            attrSample: before.attrSample,
            roomCount: before.roomCount,
            look: before.look && before.look.slice(-220)
        },
        after: {
            locAddr: after.locAddr,
            locMeta: after.locMeta,
            locKids: after.locKids,
            draft: after.draft,
            look: after.look && after.look.slice(-180)
        },
        moved,
        hunt,
        openTrial
    };
}

(async () => {
    const stories = process.argv.slice(2);
    if (!stories.length) {
        stories.push("games/CounterfeitMonkey.gblorb.js", "games/CosmoServe.gblorb.js");
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
    const outPath = path.join(ROOT, "harness", "_d38_p2_contract.out.json");
    fs.writeFileSync(outPath, JSON.stringify(results, null, 2));
    const slim = results.map((r) => ({
        story: r.story,
        fatal: r.fatal || null,
        errors: r.errors || [],
        skipTail: r.skipTail,
        locBefore: r.before && r.before.locMeta,
        locAfter: r.after && r.after.locMeta,
        moved: r.moved,
        draftBefore: r.before && r.before.draft && {
            roomId: r.before.draft.roomId,
            roomName: r.before.draft.roomName,
            discovered: (r.before.draft.discoveredObjects || []).map((o) => o.name),
            inventory: (r.before.draft.inventory || []).map((o) => o.name),
            engineMode: r.before.draft.engineMode,
            sources: r.before.draft.sources
        },
        payloadNow: r.before && r.before.payloadNow,
        dirs: r.before && (r.before.dirs || []).map((d) => ({ card: d.card, door_dir: d.door_dir, vector: d.vector })),
        dumpsterHits: r.before && r.before.dumpsterHits,
        openableHits: r.before && r.before.openableHits,
        hunt: r.hunt && {
            destHits: r.hunt.destHits,
            srcLocal: r.hunt.srcLocal,
            destLocal: r.hunt.destLocal,
            srcKd: r.hunt.srcKd,
            destKd: r.hunt.destKd,
            srcIk1: r.hunt.srcIk1,
            destIk1: r.hunt.destIk1,
            srcName: r.hunt.srcName,
            destName: r.hunt.destName,
            northDoor: r.hunt.northDoor,
            best: r.hunt.best,
            slot0: r.hunt.slot0
        },
        openTrial: r.openTrial && {
            command: r.openTrial.command,
            bytesChanged: r.openTrial.bytesChanged,
            name: r.openTrial.name,
            look: r.openTrial.look && r.openTrial.look.slice(-140)
        }
    }));
    console.log("wrote", outPath);
    console.log(JSON.stringify(slim, null, 2));
})().catch((e) => { console.error("FATAL", e); process.exit(1); });
