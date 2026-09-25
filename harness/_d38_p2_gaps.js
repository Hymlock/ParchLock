/* D38 P2 remaining-gap probe — read-only. No product files. No GlulxRamProvider.
 *
 * Closes the three holes still open after contract/playable/exits:
 *   1. identifier-names property numbering (index vs index+1)
 *   2. I7 Map_Storage via RV__Pr (CPV fallback) + IK*_Count, not p82_local_map
 *   3. printed names = instance name-words minus kind name-words
 *   4. a real OPEN bit flip on an openable that is actually closed
 *
 * Usage: node harness/_d38_p2_gaps.js [story.js ...]
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
            for (let w = 0; w < Math.min(len, 16); w++) words.push(rw(data + w * 4));
            out.push({ id, len, data, flags, words, entry: base });
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
            if (pid < id) lo = mid + 1;
            else hi = mid - 1;
        }
        return 0;
    }
    function raPr(obj, id) {
        const prop = cpTab(obj, id);
        return prop ? rw(prop + 4) : 0;
    }
    function rvPr(obj, id) {
        const addr = raPr(obj, id);
        if (addr) return rw(addr);
        if (id > 0 && id < indivStart && cpv) return rw(cpv + 4 * id);
        return 0;
    }
    function rlPr(obj, id) {
        const prop = cpTab(obj, id);
        return prop ? rs(prop + 2) : 0;
    }
    function propWords(obj, id) {
        const prop = cpTab(obj, id);
        if (!prop) return [];
        const len = rs(prop + 2);
        const data = rw(prop + 4);
        const out = [];
        for (let w = 0; w < Math.min(len, 16); w++) out.push(rw(data + w * 4));
        return out;
    }

    function looksLikeNameList(addr, count) {
        if (!addr || count < 4 || count > 8000) return null;
        const sample = [];
        let good = 0;
        const n = Math.min(count, 12);
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

    function hwName(addr) { return decodeString(rw(addr + OFF_NAME)); }
    function dictWordsFromProp(addr, pid) {
        const out = [];
        propWords(addr, pid).forEach((w) => { const d = decodeDictWord(w); if (d) out.push(d); });
        return out;
    }
    function kindsFromProp(addr, pid) {
        const names = [];
        const objs = [];
        propWords(addr, pid).forEach((w) => {
            if (!isObj(w)) return;
            objs.push(w);
            const n = hwName(w);
            if (n) names.push(n);
        });
        return { names, objs };
    }

    // Score property numbering: which index maps the dict-word property to "name".
    // Observed: parseProps id===1 holds dictionary words on rooms.
    const numbering = { index: 0, plus1: 0 };
    const nameAt = [];
    commonNames.forEach((n, i) => {
        if (n === "name") nameAt.push(i);
    });
    // H_index: property id = array index (names[1]==="name" => id 1)
    // H_plus1: property id = index+1 (names[1]==="name" => id 2)
    const pidNameIndex = nameAt.length ? nameAt[0] : -1;
    const pidNamePlus1 = pidNameIndex >= 0 ? pidNameIndex + 1 : -1;
    function countDictOn(pid) {
        let n = 0, sample = [];
        for (let i = 0; i < Math.min(all.length, 400); i++) {
            const dw = dictWordsFromProp(all[i], pid);
            if (dw.length >= 2) {
                n++;
                if (sample.length < 4) sample.push({ addr: all[i], hw: hwName(all[i]), dw: dw.slice(0, 5) });
            }
        }
        return { n, sample };
    }
    const dictOn1 = countDictOn(1);
    const dictOn2 = countDictOn(2);
    if (pidNameIndex === 1 && dictOn1.n > dictOn2.n) numbering.index = dictOn1.n;
    if (pidNamePlus1 === 1 && dictOn1.n > dictOn2.n) numbering.plus1 = dictOn1.n;
    if (pidNameIndex === 2 && dictOn2.n > dictOn1.n) numbering.index = dictOn2.n;
    if (pidNamePlus1 === 2 && dictOn2.n > dictOn1.n) numbering.plus1 = dictOn2.n;
    const usePlus1 = numbering.plus1 > numbering.index;
    function propIdByName(want) {
        for (let i = 0; i < commonNames.length; i++) {
            if (commonNames[i] === want) return usePlus1 ? i + 1 : i;
        }
        return 0;
    }
    const PID = {
        name: propIdByName("name") || 1,
        add_to_scope: propIdByName("add_to_scope"),
        door_dir: propIdByName("door_dir"),
        door_to: propIdByName("door_to"),
        found_in: propIdByName("found_in"),
        short_name: propIdByName("short_name"),
        vector: propIdByName("vector"),
        KD_Count: propIdByName("KD_Count"),
        IK1_Count: propIdByName("IK1_Count"),
        IK5_Count: propIdByName("IK5_Count"),
        IK1_link: propIdByName("IK1_link"),
        IK5_link: propIdByName("IK5_link")
    };
    // Also search common names for IK*_Count even if exact miss.
    commonNames.forEach((n, i) => {
        const id = usePlus1 ? i + 1 : i;
        if (/^IK1_Count$/i.test(n)) PID.IK1_Count = id;
        if (/^IK5_Count$/i.test(n)) PID.IK5_Count = id;
        if (/^IK1_link$/i.test(n)) PID.IK1_link = id;
        if (/^IK5_link$/i.test(n)) PID.IK5_link = id;
        if (/^KD_Count$/i.test(n)) PID.KD_Count = id;
    });

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
    function hasBit(addr, name) {
        return bitsLsb(addr).names.indexOf(name) >= 0;
    }
    function kindSuffixes(kindAddr) {
        const hw = hwName(kindAddr) || "";
        const m = hw.match(/^K\d+_(.+)$/i);
        const stem = (m ? m[1] : hw).toLowerCase();
        const out = new Set();
        if (!stem) return out;
        out.add(stem);
        if (stem.endsWith("y")) out.add(stem.slice(0, -1) + "ies");
        else out.add(stem + "s");
        dictWordsFromProp(kindAddr, PID.name).forEach((w) => out.add(w));
        parseProps(rw(kindAddr + OFF_PROPS)).forEach((p) => {
            p.words.forEach((w) => { const d = decodeDictWord(w); if (d) out.add(d); });
        });
        return out;
    }
    function printedName(addr) {
        const inst = dictWordsFromProp(addr, PID.name);
        const kinds = kindsFromProp(addr, 2).objs;
        const kindWords = new Set();
        kinds.forEach((k) => kindSuffixes(k).forEach((w) => kindWords.add(w)));
        const fallback = inst.length ? inst : dictWordsFromProp(addr, 1);
        const filtered = fallback.filter((w) => !kindWords.has(w) && !/^K\d+_/.test(w));
        const words = filtered.length ? filtered : fallback;
        return words.join(" ");
    }
    function shortNameInfo(addr) {
        const pid = PID.short_name;
        const ra = raPr(addr, pid);
        const rv = rvPr(addr, pid);
        const words = propWords(addr, pid);
        let kind = "none";
        if (ra) {
            const t = rb(ra);
            if (t === 0xe0 || t === 0xe1 || t === 0xe2) kind = "string";
            else if (t === 0xc0 || t === 0xc1) kind = "routine";
            else kind = "data:" + t.toString(16);
        }
        return { pid, ra, rv, kind, decoded: kind === "string" ? decodeString(ra) : null, nWords: words.length };
    }

    function isRoom(addr) {
        const ks = kindsFromProp(addr, 2).names;
        if (ks.some((n) => /^K1_room$/i.test(n) || /_room$/i.test(n))) return true;
        return hasBit(addr, "mark_as_room");
    }
    function isPerson(addr) {
        const ks = kindsFromProp(addr, 2).names;
        return ks.some((n) => /person|man|woman|animal/i.test(n));
    }

    let compass = 0;
    for (let i = 0; i < all.length; i++) if (hwName(all[i]) === "compass") { compass = all[i]; break; }
    const compassKids = compass ? children(compass) : [];
    const CARD_LOCAL = ["north","south","east","west","northeast","northwest","southeast","southwest","up","down","in","out"];
    const dirs = compassKids.map((addr) => {
        const dict = dictWordsFromProp(addr, PID.name);
        const card = CARD_LOCAL.find((c) => dict.indexOf(c) >= 0) || dict[0] || "";
        return {
            addr, card, dict,
            door_dir: rvPr(addr, PID.door_dir),
            IK5_Count: PID.IK5_Count ? rvPr(addr, PID.IK5_Count) : null,
            KD_Count: PID.KD_Count ? rvPr(addr, PID.KD_Count) : null,
            vector: PID.vector ? rvPr(addr, PID.vector) : null
        };
    });

    const containedPersons = [];
    all.forEach((addr) => {
        const par = rw(addr + OFF_PARENT);
        if (!isObj(par) || !isPerson(addr) || !isRoom(par)) return;
        containedPersons.push({ addr, dict: dictWordsFromProp(addr, PID.name), parent: par });
    });
    const emptyDict = containedPersons.filter((p) => !p.dict.length);
    const playerAddr = (emptyDict[0] || containedPersons[0] || {}).addr || 0;
    const locAddr = playerAddr ? rw(playerAddr + OFF_PARENT) : 0;

    const rooms = all.filter(isRoom);
    const roomSet = new Set(rooms);

    function roomRowKey(addr) {
        return {
            IK1_Count: PID.IK1_Count ? rvPr(addr, PID.IK1_Count) : null,
            KD_Count: PID.KD_Count ? rvPr(addr, PID.KD_Count) : null,
            IK1_link: PID.IK1_link ? rvPr(addr, PID.IK1_link) : null
        };
    }

    // Discover a small unique integer property on rooms (map row) empirically
    // if named IK1_Count is 0/duplicate.
    const empiricalRow = [];
    const commonCount = Math.min(commonNames.length, 60);
    for (let pid = 1; pid < commonCount; pid++) {
        const vals = [];
        const seenV = new Set();
        let unique = 0, inRange = 0, nonzero = 0;
        rooms.forEach((r) => {
            const v = rvPr(r, pid);
            vals.push(v);
            if (v) nonzero++;
            if (v >= 0 && v <= rooms.length + 4) inRange++;
            if (!seenV.has(v)) { seenV.add(v); unique++; }
        });
        if (rooms.length >= 8 && unique >= Math.floor(rooms.length * 0.8) && inRange >= Math.floor(rooms.length * 0.9) && nonzero >= Math.floor(rooms.length * 0.5)) {
            empiricalRow.push({
                pid,
                name: usePlus1 ? (commonNames[pid - 1] || "") : (commonNames[pid] || ""),
                unique, inRange, nonzero,
                sample: vals.slice(0, 8)
            });
        }
    }
    const empiricalDir = [];
    for (let pid = 1; pid < commonCount; pid++) {
        const vals = dirs.map((d) => rvPr(d.addr, pid));
        const uniq = new Set(vals);
        const inRange = vals.filter((v) => v >= 0 && v <= 15).length;
        if (dirs.length >= 8 && uniq.size >= Math.min(8, dirs.length - 2) && inRange === vals.length) {
            empiricalDir.push({
                pid,
                name: usePlus1 ? (commonNames[pid - 1] || "") : (commonNames[pid] || ""),
                vals: dirs.map((d, i) => ({ card: d.card, v: vals[i] }))
            });
        }
    }

    const locKids = locAddr ? children(locAddr).filter((c) => c !== playerAddr) : [];
    const inventory = playerAddr ? children(playerAddr) : [];

    const openableHere = [];
    locKids.concat(inventory).forEach((addr) => {
        const b = bitsLsb(addr);
        if (b.names.indexOf("openable") < 0 && b.names.indexOf("container") < 0) return;
        openableHere.push({
            addr,
            name: printedName(addr),
            dict: dictWordsFromProp(addr, PID.name).slice(0, 6),
            lsb: b.names,
            open: b.names.indexOf("open") >= 0,
            openable: b.names.indexOf("openable") >= 0,
            container: b.names.indexOf("container") >= 0,
            bytes: Array.from({ length: numAttr }, (_, i) => rb(addr + 1 + i))
        });
    });
    const closedOpenable = [];
    all.forEach((addr) => {
        if (closedOpenable.length >= 12) return;
        const b = bitsLsb(addr);
        if (b.names.indexOf("openable") < 0) return;
        if (b.names.indexOf("open") >= 0) return;
        const par = rw(addr + OFF_PARENT);
        closedOpenable.push({
            addr,
            name: printedName(addr),
            dict: dictWordsFromProp(addr, PID.name).slice(0, 6),
            parent: par,
            parentIsLoc: par === locAddr,
            inInv: par === playerAddr,
            lsb: b.names.slice(0, 10)
        });
    });

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

    const draft = {
        sources: [{ name: "glulx-ram", confidence: locAddr ? 0.95 : 0.02 }],
        engineMode: "structural",
        vmType: "glulx",
        roomId: locAddr || null,
        roomName: locAddr ? printedName(locAddr) : "",
        discoveredObjects: locKids.map((id) => ({
            id, name: printedName(id), parentId: locAddr,
            attrs: bitsLsb(id).names.reduce((o, n) => { o[n] = true; return o; }, {}),
            confidence: 0.85, discovered: true
        })).filter((o) => o.name),
        inventory: inventory.map((id) => ({
            id, name: printedName(id), parentId: playerAddr,
            attrs: bitsLsb(id).names.reduce((o, n) => { o[n] = true; return o; }, {}),
            confidence: 0.85, discovered: true
        })).filter((o) => o.name),
        exits: [],
        probe: { status: "glulx-ram-research", playerId: playerAddr, roomId: locAddr || 0, scopeCount: locKids.length }
    };

    return {
        ramstart, endmem, numAttr, indivStart, cpv, objectCount: all.length, roomCount: rooms.length,
        numbering: {
            usePlus1,
            scores: numbering,
            pidNameIndex, pidNamePlus1,
            dictOn1: dictOn1.n, dictOn2: dictOn2.n,
            dictOn1sample: dictOn1.sample,
            commonHead: commonNames.slice(0, 45).map((n, i) => ({ index: i, plus1: i + 1, name: n })),
            PID
        },
        playerAddr, locAddr,
        loc: locAddr ? {
            addr: locAddr,
            dict: dictWordsFromProp(locAddr, PID.name),
            printed: printedName(locAddr),
            kinds: kindsFromProp(locAddr, 2).names,
            kindDump: kindsFromProp(locAddr, 2).objs.map((k) => ({
                addr: k, hw: hwName(k),
                dictName: dictWordsFromProp(k, PID.name),
                suffixes: Array.from(kindSuffixes(k)).slice(0, 8),
                propIds: parseProps(rw(k + OFF_PROPS)).slice(0, 8).map((p) => p.id)
            })),
            shortName: shortNameInfo(locAddr),
            row: roomRowKey(locAddr),
            nKids: locKids.length
        } : null,
        player: playerAddr ? {
            addr: playerAddr,
            printed: printedName(playerAddr),
            kinds: kindsFromProp(playerAddr, 2).names,
            parent: rw(playerAddr + OFF_PARENT)
        } : null,
        dirs,
        empiricalRow: empiricalRow.slice(0, 8),
        empiricalDir: empiricalDir.slice(0, 8),
        locKids: locKids.map((c) => ({
            addr: c, printed: printedName(c),
            dict: dictWordsFromProp(c, PID.name).slice(0, 6),
            kinds: kindsFromProp(c, 2).names.slice(0, 3),
            lsb: bitsLsb(c).names
        })),
        inventory: inventory.map((c) => ({
            addr: c, printed: printedName(c),
            dict: dictWordsFromProp(c, PID.name).slice(0, 6),
            lsb: bitsLsb(c).names
        })),
        openableHere, closedOpenable: closedOpenable.slice(0, 8),
        draft, payloadNow, look
    };
};

function huntMap(page, src, dest) {
    return page.evaluate(({ src, dest }) => {
        const rb = (a) => Quixe.ReadByte(a) & 0xff;
        const rw = (a) => (typeof Quixe.ReadWord === "function")
            ? Quixe.ReadWord(a) >>> 0
            : ((rb(a) << 24) | (rb(a + 1) << 16) | (rb(a + 2) << 8) | rb(a + 3)) >>> 0;
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
        const isObj = (a) => !!(a && a >= ramstart && rb(a) === 0x70);
        const rs = (a) => ((rb(a) << 8) | rb(a + 1)) >>> 0;
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
        function decodeDictWord(ptr) {
            if (!ptr || rb(ptr) !== 0x60) return null;
            let s = "";
            for (let i = 1; i <= 12; i++) {
                const c = rb(ptr + i); if (!c) break;
                if (c >= 32 && c < 127) s += String.fromCharCode(c);
            }
            return s;
        }
        function propWords(obj, id) {
            const prop = cpTab(obj, id);
            if (!prop) return [];
            const len = rs(prop + 2), data = rw(prop + 4), out = [];
            for (let w = 0; w < Math.min(len, 8); w++) out.push(rw(data + w * 4));
            return out;
        }
        function dictWords(addr) {
            const out = [];
            propWords(addr, 1).forEach((w) => { const d = decodeDictWord(w); if (d) out.push(d); });
            return out;
        }
        function hwName(addr) {
            const p = rw(addr + OFF_NAME);
            if (!p || rb(p) !== 0xe0) return "";
            let s = "";
            for (let i = p + 1; i < p + 40; i++) { const c = rb(i); if (!c) break; s += c >= 32 && c < 127 ? String.fromCharCode(c) : "?"; }
            return s;
        }
        function isRoom(addr) {
            return propWords(addr, 2).some((w) => isObj(w) && /room/i.test(hwName(w)));
        }
        const rooms = all.filter(isRoom);
        const destHits = [];
        const hi = Math.min(endmem - 4, ramstart + 6 * 1024 * 1024);
        for (let a = ramstart; a < hi; a += 4) {
            if (rw(a) === dest) {
                destHits.push(a);
                if (destHits.length >= 40) break;
            }
        }
        const nDir = 12;
        const trials = [];
        destHits.forEach((at) => {
            for (let slot = 0; slot < nDir; slot++) {
                const rowPtr = at - slot * 4;
                if (rowPtr < ramstart) continue;
                const row = [];
                let junk = 0, roomsN = 0, zeros = 0, hasSrc = false;
                for (let i = 0; i < nDir; i++) {
                    const w = rw(rowPtr + i * 4);
                    let kind = "zero";
                    if (!w) zeros++;
                    else if (w === dest) { roomsN++; kind = "DEST"; }
                    else if (w === src) { roomsN++; hasSrc = true; kind = "SRC"; }
                    else if (isObj(w) && isRoom(w)) { roomsN++; kind = "room"; }
                    else if (isObj(w)) { kind = "obj"; }
                    else { junk++; kind = "junk"; }
                    if (kind !== "zero") row.push({ i, kind, dict: dictWords(w).slice(0, 3) });
                }
                if (junk > 1) continue;
                if (roomsN < 1) continue;
                trials.push({ at, slot, rowPtr, zeros, roomsN, junk, hasSrc, row });
            }
        });
        trials.sort((a, b) => (b.hasSrc ? 4 : 0) + b.zeros - ((a.hasSrc ? 4 : 0) + a.zeros));

        // Reciprocal: dest's south should be src. I7 order n,ne,e,se,s,sw,w,nw,up,down,in,out
        // north=0 => south=4.
        const recip = [];
        trials.slice(0, 12).forEach((t) => {
            if (t.slot !== 0 && t.slot !== 4) return;
            destHits.forEach((dat) => {
                const southSlot = t.slot === 0 ? 4 : 0;
                const drow = dat - southSlot * 4;
                if (drow < ramstart) return;
                if (rw(drow + southSlot * 4) !== dest) return;
                const has = rw(drow + (t.slot === 0 ? 4 : 0) * 4) === src;
                if (has) recip.push({
                    srcRow: t.rowPtr, destRow: drow, northSlot: t.slot === 0 ? 0 : 4,
                    srcRowRooms: t.row, destHasSrc: true
                });
            });
        });

        return {
            destHits: destHits.length,
            destHitSample: destHits.slice(0, 10),
            srcDict: dictWords(src),
            destDict: dictWords(dest),
            roomCount: rooms.length,
            bestRows: trials.slice(0, 6),
            recip: recip.slice(0, 6)
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
    if (moved) hunt = await huntMap(page, locBefore, after.locAddr);

    let openTrial = null;
    const candidate = (before.openableHere || []).find((o) => o.openable && !o.open)
        || (before.closedOpenable || []).find((o) => o.parentIsLoc || o.inInv)
        || (before.openableHere || [])[0]
        || (before.closedOpenable || [])[0];
    if (candidate && candidate.dict && candidate.dict[0]) {
        const noun = candidate.dict[0];
        const beforeBytes = candidate.bytes || null;
        if (candidate.open) await inject("close " + noun);
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
            return { bytes, bits, look: ((el && el.innerText) || "").slice(-400) };
        }, candidate.addr);
        openTrial = {
            command: "open " + noun,
            addr: candidate.addr,
            dict: candidate.dict,
            name: candidate.name,
            lsbBefore: candidate.lsb,
            beforeBytes,
            afterBytes: snap.bytes,
            bytesChanged: !!(beforeBytes && snap.bytes && beforeBytes.join(",") !== snap.bytes.join(",")),
            afterBits: snap.bits,
            look: snap.look
        };
    }

    await page.close();
    return {
        story,
        errors,
        skipTail: skipLog.slice(-10),
        before: {
            numbering: before.numbering,
            playerAddr: before.playerAddr,
            loc: before.loc,
            player: before.player,
            dirs: (before.dirs || []).map((d) => ({ card: d.card, dict: d.dict, door_dir: d.door_dir, IK5_Count: d.IK5_Count, KD_Count: d.KD_Count })),
            empiricalRow: before.empiricalRow,
            empiricalDir: before.empiricalDir,
            locKids: before.locKids,
            inventory: before.inventory,
            openableHere: before.openableHere,
            closedOpenable: before.closedOpenable,
            draft: before.draft,
            payloadNow: before.payloadNow,
            look: before.look,
            roomCount: before.roomCount
        },
        after: after && after.loc ? { loc: after.loc, draft: after.draft, look: after.look } : null,
        moved,
        hunt,
        openTrial
    };
}

(async () => {
    const stories = process.argv.slice(2).length
        ? process.argv.slice(2)
        : ["games/CounterfeitMonkey.gblorb.js", "games/CosmoServe.gblorb.js"];
    const browser = await chromium.launch({
        executablePath: process.env.PW_CHROME || undefined,
        headless: true
    });
    const out = [];
    for (const story of stories) {
        try {
            out.push(await runStory(browser, story));
        } catch (e) {
            out.push({ story, error: String(e && e.stack || e) });
        }
    }
    await browser.close();
    const outPath = path.join(__dirname, "_d38_p2_gaps.out.json");
    fs.writeFileSync(outPath, JSON.stringify(out, null, 2));
    console.log("wrote", outPath);
    out.forEach((s) => {
        console.log("\n==", s.story, s.error || "");
        if (s.error) return;
        const b = s.before || {};
        console.log("moved", s.moved, "loc", b.loc && b.loc.printed, "->", s.after && s.after.loc && s.after.loc.printed);
        console.log("numbering", JSON.stringify(b.numbering && { usePlus1: b.numbering.usePlus1, scores: b.numbering.scores, PID: b.numbering.PID, dictOn1: b.numbering.dictOn1, dictOn2: b.numbering.dictOn2 }));
        console.log("draft room", b.draft && b.draft.roomName, "exits", b.draft && b.draft.exits && b.draft.exits.length, "disc", b.draft && b.draft.discoveredObjects && b.draft.discoveredObjects.length, "inv", b.draft && b.draft.inventory && b.draft.inventory.length);
        console.log("empiricalRow", JSON.stringify(b.empiricalRow));
        console.log("empiricalDir", JSON.stringify(b.empiricalDir));
        console.log("dirs", JSON.stringify((b.dirs || []).slice(0, 4)));
        console.log("hunt recip", s.hunt && s.hunt.recip && s.hunt.recip.length, "best", s.hunt && JSON.stringify((s.hunt.bestRows || []).slice(0, 2)));
        console.log("openTrial", JSON.stringify(s.openTrial));
        console.log("payloadNow", JSON.stringify(b.payloadNow));
    });
})().catch((e) => { console.error(e); process.exit(1); });
