/* D38 P2 playable-turn research probe — read-only. No product files. No GlulxRamProvider.
 *
 * Previous probes (static/live/deep/ids/map/props/trials/close) decoded the
 * 0x70 object record and identifier-names tables, but Counterfeit Monkey's
 * yes/no intro swallowed compass/OPEN trials (locAddr never changed,
 * OPEN bytesChanged:false). This probe:
 *   1. reaches a real parser turn (not the intro conversation)
 *   2. dumps the UIPayload-shaped fields P3 must fill (room/exits/scope/inv)
 *   3. scores LSB vs MSB attribute numbering against identifier-names
 *   4. hunts I7 12-slot map rows (no n_to on I7)
 *   5. retries a real move + OPEN on a K5_container / openable object
 *   6. repeats on a second Glulx title that boots playable
 *
 * Usage: node harness/_d38_p2_playable.js [story.js ...]
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
    function bitsOf(addr, lsb) {
        const bits = [];
        for (let n = 0; n < numAttr * 8; n++) {
            const byte = rb(addr + 1 + Math.floor(n / 8));
            const on = lsb
                ? ((byte >> (n % 8)) & 1) === 1
                : ((byte >> (7 - (n % 8))) & 1) === 1;
            if (on) bits.push(n);
        }
        return bits;
    }
    function attrBytes(addr) {
        const bytes = [];
        for (let i = 0; i < numAttr; i++) bytes.push(rb(addr + 1 + i));
        return bytes;
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
    const indivNames = idBest ? namesAt(idBest.indiv.addr, Math.min(idBest.indiv.count, 80), 80) : [];
    function propName(id) {
        if (id >= 1 && id < indivStart && commonNames[id - 1]) return commonNames[id - 1];
        if (id >= indivStart && indivNames[id - indivStart]) return indivNames[id - indivStart];
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

    function namedBits(addr, lsb) {
        return bitsOf(addr, lsb).map((b) => ({ b, n: attrNames[b] || ("bit-" + b) }));
    }
    function describe(addr) {
        if (!addr || !isObj(addr)) return null;
        const dict = dictWords(addr);
        const kinds = kindsOf(addr);
        const lsb = namedBits(addr, true);
        const msb = namedBits(addr, false);
        const strings = [];
        parseProps(rw(addr + OFF_PROPS)).forEach((p) => {
            p.words.forEach((w) => {
                const s = decodeString(w);
                if (s) strings.push({ id: p.id, name: propName(p.id), s: s.slice(0, 48) });
            });
        });
        return {
            addr,
            dict: dict.slice(0, 8),
            kinds: kinds.slice(0, 4),
            hw: hwName(addr) || "",
            parent: rw(addr + OFF_PARENT),
            nKids: children(addr).length,
            bytes: attrBytes(addr),
            lsb: lsb.map((x) => x.n),
            msb: msb.map((x) => x.n),
            lsbBits: lsb.map((x) => x.b),
            strings: strings.slice(0, 6)
        };
    }

    // Score LSB vs MSB: scenery/static on loc kids, animate on player, moved on inventory.
    function scoreEndian(lsb) {
        let hits = 0, checks = 0;
        function has(addr, name) {
            checks++;
            const names = namedBits(addr, lsb).map((x) => x.n);
            if (names.indexOf(name) >= 0) hits++;
        }
        if (playerAddr) has(playerAddr, "animate");
        children(locAddr).forEach((c) => {
            if (c === playerAddr) return;
            const d = dictWords(c).join(" ");
            if (/sky|facade|building|wall|floor|ceiling/i.test(d) || kindsOf(c).some((k) => /backdrop|facade/i.test(k))) {
                has(c, "scenery");
                has(c, "static");
            }
        });
        if (playerAddr) {
            children(playerAddr).forEach((c) => {
                has(c, "moved");
            });
        }
        return { hits, checks, ratio: checks ? hits / checks : 0 };
    }

    const locKids = locAddr ? children(locAddr).filter((c) => c !== playerAddr).map(describe) : [];
    const inventory = playerAddr ? children(playerAddr).map(describe) : [];

    // Hunt objects whose dict matches likely in-scope nouns (dumpster, etc.).
    const nounHits = [];
    const want = /dumpster|letter|remover|pouch|container|door|box|chest|bag|cupboard|drawer|locker|trash|bin/i;
    all.forEach((addr) => {
        const dict = dictWords(addr);
        if (!dict.some((d) => want.test(d))) return;
        if (nounHits.length >= 24) return;
        nounHits.push(Object.assign(describe(addr), { inLoc: rw(addr + OFF_PARENT) === locAddr }));
    });

    // Map row: individual props whose data is 12 words of (0 | room-obj | door-obj).
    const mapRows = [];
    function rowScore(ptr) {
        if (!ptr || ptr < ramstart || ptr + 48 > endmem) return null;
        const words = [];
        let rooms = 0, zeros = 0, doors = 0, otherObj = 0, junk = 0;
        for (let i = 0; i < 12; i++) {
            const w = rw(ptr + i * 4);
            let kind = "zero";
            if (!w) { zeros++; }
            else if (isObj(w) && isRoom(w)) { rooms++; kind = "room"; }
            else if (isObj(w) && kindsOf(w).some((n) => /door/i.test(n))) { doors++; kind = "door"; }
            else if (isObj(w)) { otherObj++; kind = "obj"; }
            else { junk++; kind = "junk"; }
            words.push({
                w,
                kind,
                dict: isObj(w) ? dictWords(w).slice(0, 3) : []
            });
        }
        if (junk > 2 || rooms + doors < 1) return null;
        return { ptr, rooms, doors, zeros, otherObj, junk, words };
    }
    if (locAddr) {
        parseProps(rw(locAddr + OFF_PROPS)).forEach((p) => {
            const row = rowScore(p.data);
            if (row) mapRows.push(Object.assign({ via: "prop-data", id: p.id, name: propName(p.id) }, row));
            if (p.len === 12) {
                const row2 = rowScore(p.data);
                if (row2 && !mapRows.some((m) => m.ptr === row2.ptr)) {
                    mapRows.push(Object.assign({ via: "prop-len12", id: p.id, name: propName(p.id) }, row2));
                }
            }
            p.words.forEach((w) => {
                const row3 = rowScore(w);
                if (row3 && !mapRows.some((m) => m.ptr === row3.ptr)) {
                    mapRows.push(Object.assign({ via: "prop-word", id: p.id, name: propName(p.id) }, row3));
                }
            });
        });
    }
    // Also scan a window of RAM around locAddr for a 12-slot row containing locAddr.
    if (locAddr && mapRows.length < 3) {
        const lo = Math.max(ramstart, locAddr - 0x8000);
        const hi = Math.min(endmem - 48, locAddr + 0x20000);
        for (let a = lo; a < hi && mapRows.length < 6; a += 4) {
            if (rw(a) !== locAddr) continue;
            for (let back = 0; back < 12; back++) {
                const ptr = a - back * 4;
                const row = rowScore(ptr);
                if (row && row.rooms >= 2 && !mapRows.some((m) => m.ptr === ptr)) {
                    mapRows.push(Object.assign({ via: "ram-scan" }, row));
                }
            }
        }
    }

    const CARD_LOCAL = ["north","south","east","west","northeast","northwest","southeast","southwest","up","down","in","out"];
    const compassInfo = compassKids.map((c) => {
        const dict = dictWords(c);
        const card = dict.find((d) => CARD_LOCAL.indexOf(d) >= 0) || dict[0] || "";
        const props = parseProps(rw(c + OFF_PROPS)).filter((p) => {
            const nm = propName(p.id) || "";
            return /door|map|dir|vector|index|key/i.test(nm) || p.words.some((w) => w < 64 || isObj(w));
        }).slice(0, 8).map((p) => ({
            id: p.id,
            name: propName(p.id),
            words: p.words.slice(0, 4)
        }));
        return { addr: c, card, dict: dict.slice(0, 4), props };
    });

    const destFromProps = [];
    if (locAddr) {
        parseProps(rw(locAddr + OFF_PROPS)).forEach((p) => {
            p.words.forEach((w) => {
                if (!isObj(w) || !isRoom(w) || w === locAddr) return;
                destFromProps.push({
                    id: p.id,
                    name: propName(p.id),
                    dest: w,
                    dict: dictWords(w).slice(0, 4)
                });
            });
        });
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

    const lsbScore = scoreEndian(true);
    const msbScore = scoreEndian(false);
    const openable = [];
    const pool = locKids.concat(inventory).concat(nounHits);
    const seenA = new Set();
    pool.forEach((o) => {
        if (!o || seenA.has(o.addr)) return;
        seenA.add(o.addr);
        const names = (o.lsb || []).concat(o.msb || []);
        const kinds = o.kinds || [];
        if (names.indexOf("openable") >= 0 || names.indexOf("container") >= 0
            || names.indexOf("door") >= 0
            || kinds.some((k) => /container|door|openable/i.test(k))) {
            openable.push(o);
        }
    });

    return {
        ramstart, endmem, numAttr, indivStart, objectCount: all.length,
        playerAddr, locAddr,
        player: describe(playerAddr),
        loc: describe(locAddr),
        locKids,
        inventory,
        nounHits,
        openable: openable.slice(0, 12),
        compassInfo,
        destFromProps,
        mapRows: mapRows.slice(0, 6),
        lsbScore,
        msbScore,
        attrSample: attrNames.slice(0, 24),
        look,
        payloadNow
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
    async function waitInput(n) {
        for (let i = 0; i < (n || 40) && !(await hasInput()); i++) {
            await page.keyboard.press("Space");
            await page.waitForTimeout(200);
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
    await waitInput(40);
    for (let i = 0; i < 36; i++) {
        const tail = await bufferTail();
        const stillTalk = /Can you hear me|remember our name|half person|I was Alex|You were\.\.\.|need you on form|unrecognizable|synthesis/i.test(tail);
        const playable = /You can see|You are carrying|is a dumpster|letter-remover|obvious exits|You are in |This is |north of |south of /i.test(tail)
            && !stillTalk;
        if (playable && await hasInput()) {
            skipLog.push({ i, action: "playable" });
            break;
        }
        if (!(await hasInput())) {
            await page.keyboard.press("Space");
            skipLog.push({ i, action: "space" });
            await page.waitForTimeout(200);
            continue;
        }
        if (/Can you hear me|remember our name|Are you|Shall I|ready\?/i.test(tail) || stillTalk) {
            await inject("yes");
            skipLog.push({ i, action: "yes" });
            continue;
        }
        await inject("look");
        skipLog.push({ i, action: "look" });
    }
    await inject("look");

    const before = await page.evaluate(HELPERS);

    const moveTrials = [];
    let moved = null;
    const dirs = (before.compassInfo || []).map((k) => k.card).filter((d) => CARD.indexOf(d) >= 0);
    const uniqueDirs = [...new Set(dirs)];
    for (const d of uniqueDirs.slice(0, 8)) {
        const locBefore = before.locAddr;
        await inject(d);
        const after = await page.evaluate(HELPERS);
        const changed = after.locAddr && after.locAddr !== locBefore;
        moveTrials.push({
            command: d,
            locBefore,
            locAfter: after.locAddr,
            changed,
            locDictAfter: after.loc && after.loc.dict,
            look: after.look && after.look.slice(-180)
        });
        if (changed) { moved = after; break; }
    }

    let openTrial = null;
    const cand = (before.openable && before.openable[0])
        || (before.nounHits || []).find((o) => (o.lsb || []).indexOf("openable") >= 0 || (o.kinds || []).some((k) => /container|door/i.test(k)));
    if (cand && cand.dict && cand.dict[0]) {
        const noun = cand.dict.find((d) => !/things|device|rooms|backdrops|facades/i.test(d)) || cand.dict[0];
        await inject("open " + noun);
        const after = await page.evaluate(HELPERS);
        const afterObj = [].concat(after.locKids || [], after.inventory || [], after.nounHits || [])
            .find((o) => o && o.addr === cand.addr);
        openTrial = {
            command: "open " + noun,
            addr: cand.addr,
            dict: cand.dict,
            kinds: cand.kinds,
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
        story,
        errors,
        skipLog: skipLog.slice(-12),
        playableLook: before.look && before.look.slice(-250),
        playerAddr: before.playerAddr,
        locAddr: before.locAddr,
        loc: before.loc,
        player: before.player,
        locKids: before.locKids,
        inventory: before.inventory,
        nounHits: (before.nounHits || []).map((o) => ({
            addr: o.addr, dict: o.dict, kinds: o.kinds, inLoc: o.inLoc, lsb: o.lsb, parent: o.parent
        })),
        openable: (before.openable || []).map((o) => ({ addr: o.addr, dict: o.dict, kinds: o.kinds, lsb: o.lsb })),
        destFromProps: before.destFromProps,
        mapRows: (before.mapRows || []).map((r) => ({
            via: r.via, id: r.id, name: r.name, ptr: r.ptr, rooms: r.rooms, doors: r.doors, zeros: r.zeros,
            words: (r.words || []).map((w) => ({ kind: w.kind, dict: w.dict }))
        })),
        compassInfo: (before.compassInfo || []).map((c) => ({ card: c.card, dict: c.dict, props: c.props })),
        lsbScore: before.lsbScore,
        msbScore: before.msbScore,
        attrSample: before.attrSample,
        payloadNow: before.payloadNow,
        moveTrials,
        moved: moved ? {
            locAddr: moved.locAddr,
            loc: moved.loc,
            locKids: moved.locKids
        } : null,
        openTrial
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
    const outPath = path.join(ROOT, "harness", "_d38_p2_playable.out.json");
    fs.writeFileSync(outPath, JSON.stringify(results, null, 2));
    const slim = results.map((r) => ({
        story: r.story,
        fatal: r.fatal || null,
        errors: r.errors || [],
        skipTail: (r.skipLog || []).slice(-6),
        locDict: r.loc && r.loc.dict,
        locHw: r.loc && r.loc.hw,
        locStrings: r.loc && r.loc.strings,
        playerLsb: r.player && r.player.lsb,
        locKids: (r.locKids || []).map((k) => ({ dict: k.dict, kinds: k.kinds, lsb: k.lsb })),
        inventory: (r.inventory || []).map((k) => ({ dict: k.dict, kinds: k.kinds, lsb: k.lsb })),
        openable: r.openable,
        nounHits: (r.nounHits || []).slice(0, 8),
        destFromProps: r.destFromProps,
        mapRows: r.mapRows,
        lsbScore: r.lsbScore,
        msbScore: r.msbScore,
        payloadNow: r.payloadNow,
        moveTrials: r.moveTrials,
        movedLoc: r.moved && r.moved.loc && r.moved.loc.dict,
        openTrial: r.openTrial && {
            command: r.openTrial.command,
            bytesChanged: r.openTrial.bytesChanged,
            lsbBefore: r.openTrial.lsbBefore,
            lsbAfter: r.openTrial.lsbAfter,
            look: r.openTrial.look && r.openTrial.look.slice(-120)
        },
        playableLook: r.playableLook
    }));
    console.log("wrote", outPath);
    console.log(JSON.stringify(slim, null, 2));
})().catch((e) => { console.error("FATAL", e); process.exit(1); });
