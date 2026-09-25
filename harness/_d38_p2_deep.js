/* D38 P2 deep research probe — read-only. No product files. No GlulxRamProvider.
 *
 * Proves, on a live Quixe image:
 *   - object record offsets from accel NUM_ATTR_BYTES (not assumed from Z-machine)
 *   - accel[6] is the *address of* the self global and is 0 at idle (not the player)
 *   - I7 visible names come from a printed-name property, not the 0x70 hardware name
 *   - player / location / inventory / in-scope children / compass / exit candidates
 *   - attribute bits on those objects, plus a before/after OPEN and a move
 *   - dictionary words hanging off the name property (0x60 entries)
 *
 * Usage: node harness/_d38_p2_deep.js [story.js]
 */
const { chromium } = require("playwright");
const { pathToFileURL } = require("node:url");
const path = require("node:path");
const ROOT = path.resolve(__dirname, "..");

const COMPASS_WORDS = {
    north: 1, south: 1, east: 1, west: 1,
    northeast: 1, northwest: 1, southeast: 1, southwest: 1,
    up: 1, down: 1, in: 1, out: 1,
    n: 1, s: 1, e: 1, w: 1, ne: 1, nw: 1, se: 1, sw: 1
};

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
        await page.waitForTimeout(900);
        return true;
    }

    // Dismiss common yes/no banners without depending on a specific story.
    await inject("look");
    if (await page.locator(".Input.LineInput").count()) {
        await inject("no");
        await inject("no");
        await inject("look");
    }

    const snapshot = await page.evaluate((compassWords) => {
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
        const selfGlobalAddr = accel[6] | 0;
        const selfVal = selfGlobalAddr ? rw(selfGlobalAddr) : 0;
        const OFF_NEXT = 1 + numAttr;
        const OFF_NAME = OFF_NEXT + 4;
        const OFF_PROPS = OFF_NAME + 4;
        const OFF_PARENT = OFF_PROPS + 4;
        const OFF_SIBLING = OFF_PARENT + 4;
        const OFF_CHILD = OFF_SIBLING + 4;
        const OBJ_SIZE = 1 + numAttr + 24;

        function isObj(addr) {
            return !!(addr && addr >= ramstart && rb(addr) === 0x70);
        }
        function attrsOf(addr) {
            const bytes = [];
            for (let i = 0; i < numAttr; i++) bytes.push(rb(addr + 1 + i));
            const bits = [];
            for (let n = 0; n < numAttr * 8; n++) {
                const byte = bytes[Math.floor(n / 8)];
                if (((byte >> (7 - (n % 8))) & 1) === 1) bits.push(n);
            }
            return { bytes, bits };
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
        function hwName(addr) {
            return decodeString(rw(addr + OFF_NAME));
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
            if (n < 0 || n > 400) return [];
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
        function stringHitsOn(addr) {
            const hits = [];
            parseProps(rw(addr + OFF_PROPS)).forEach((p) => {
                p.words.forEach((w, ix) => {
                    const text = decodeString(w);
                    if (text) hits.push({ prop: p.id, ix, text });
                    const dw = decodeDictWord(w);
                    if (dw) hits.push({ prop: p.id, ix, dict: dw });
                });
            });
            return hits;
        }
        function kindNamesOn(addr) {
            const names = [];
            parseProps(rw(addr + OFF_PROPS)).forEach((p) => {
                const kn = [];
                p.words.forEach((w) => {
                    if (!isObj(w)) return;
                    const n = hwName(w);
                    if (n && /^(K\d+_|Class|Object|CompassDirection|kind)/i.test(n)) kn.push(n);
                });
                if (kn.length) names.push({ prop: p.id, kinds: kn });
            });
            return names;
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

        // Printed-name property: a common property that holds compass-word strings
        // on compass children. Confirmed independently of any Z-machine prop number.
        let compass = 0;
        for (let i = 0; i < all.length; i++) {
            if (hwName(all[i]) === "compass") { compass = all[i]; break; }
        }
        const compassKids = compass ? children(compass) : [];
        const compassNameVotes = {};
        compassKids.forEach((kid) => {
            stringHitsOn(kid).forEach((h) => {
                if (!h.text) return;
                const t = h.text.toLowerCase().trim();
                if (!compassWords[t]) return;
                compassNameVotes[h.prop] = (compassNameVotes[h.prop] || 0) + 1;
            });
        });
        let printedNameProp = 0;
        let bestVote = 0;
        Object.keys(compassNameVotes).forEach((k) => {
            if (compassNameVotes[k] > bestVote) {
                bestVote = compassNameVotes[k];
                printedNameProp = k | 0;
            }
        });

        function printedName(addr) {
            if (printedNameProp) {
                const props = parseProps(rw(addr + OFF_PROPS));
                for (let i = 0; i < props.length; i++) {
                    if (props[i].id !== printedNameProp) continue;
                    for (let w = 0; w < props[i].words.length; w++) {
                        const t = decodeString(props[i].words[w]);
                        if (t) return t;
                    }
                }
            }
            return hwName(addr) || "";
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
            const k = kindNamesOn(addr);
            return k.length ? k[0] : null;
        }

        const compassInfo = compassKids.map((kid) => {
            const nums = [];
            parseProps(rw(kid + OFF_PROPS)).forEach((p) => {
                p.words.forEach((w) => {
                    if (w > 0 && w < 512) nums.push({ prop: p.id, val: w });
                });
            });
            return {
                addr: kid,
                printed: printedName(kid),
                hw: hwName(kid) || "",
                nums,
                dict: dictWords(kid),
                attrs: attrsOf(kid).bits
            };
        });

        // Player: prefer printed-name "yourself", else a person contained in a room.
        function isRoom(addr) {
            const k = kindsOf(addr);
            if (!k) return false;
            return k.kinds.some((n) => /^K1_room$/i.test(n) || /_room$/i.test(n));
        }
        function isPerson(addr) {
            const k = kindsOf(addr);
            if (!k) return false;
            return k.kinds.some((n) => /person|man|woman|animal/i.test(n));
        }

        const contained = [];
        all.forEach((addr) => {
            const par = rw(addr + OFF_PARENT);
            if (!isObj(par)) return;
            const pn = printedName(addr);
            contained.push({
                addr,
                printed: pn,
                parent: par,
                parentPrinted: printedName(par),
                person: isPerson(addr),
                parentIsRoom: isRoom(par),
                nKids: children(addr).length
            });
        });

        let playerAddr = 0;
        const you = contained.filter((c) => /^(yourself|your former self|cretin)$/i.test(c.printed));
        if (you.length) playerAddr = you[0].addr;
        else {
            const personsInRooms = contained.filter((c) => c.person && c.parentIsRoom);
            if (personsInRooms.length) playerAddr = personsInRooms[0].addr;
        }

        const locAddr = playerAddr ? rw(playerAddr + OFF_PARENT) : 0;

        function describe(addr) {
            if (!isObj(addr)) return null;
            return {
                addr,
                printed: printedName(addr),
                hw: hwName(addr) || "",
                parent: rw(addr + OFF_PARENT),
                dict: dictWords(addr),
                kinds: kindsOf(addr),
                attrs: attrsOf(addr),
                nKids: children(addr).length
            };
        }

        const locKids = locAddr ? children(locAddr).map(describe) : [];
        const inventory = playerAddr ? children(playerAddr).map(describe) : [];

        // Exit candidates: location properties whose value is an object, plus
        // location[N] where N is a small integer stored on a compass direction.
        const exitFromProps = [];
        const seenExit = {};
        function pushExit(label, prop, dest, via) {
            if (!isObj(dest)) return;
            const key = prop + "->" + dest;
            if (seenExit[key]) return;
            seenExit[key] = 1;
            exitFromProps.push({
                label: label || "",
                prop,
                dest,
                destPrinted: printedName(dest),
                destHw: hwName(dest) || "",
                destKinds: kindsOf(dest),
                via
            });
        }
        if (locAddr) {
            parseProps(rw(locAddr + OFF_PROPS)).forEach((p) => {
                p.words.forEach((w) => {
                    if (!isObj(w)) return;
                    if (w === playerAddr) return;
                    pushExit("", p.id, w, "room-prop-object");
                });
            });
            compassInfo.forEach((d) => {
                d.nums.forEach((n) => {
                    const props = parseProps(rw(locAddr + OFF_PROPS));
                    const hit = props.find((p) => p.id === n.val);
                    if (hit) {
                        hit.words.forEach((w) => pushExit(d.printed, n.val, w, "dir-num-as-prop"));
                    }
                });
            });
        }

        const payload = (typeof WorldModel !== "undefined" && WorldModel.lastPayload) ? {
            engineMode: WorldModel.lastPayload.engineMode,
            roomId: WorldModel.lastPayload.roomId,
            roomName: WorldModel.lastPayload.roomName,
            exits: (WorldModel.lastPayload.exits || []).length,
            discovered: (WorldModel.lastPayload.discoveredObjects || []).length,
            inventory: (WorldModel.lastPayload.inventory || []).length
        } : null;

        const mapText = (() => {
            try {
                const t = (document.body.innerText || "").replace(/\s+/g, " ");
                const m = t.match(/(\d+)\s+rooms\s*\/\s*(\d+)\s+exits[\s\S]{0,80}Items\s+(\d+)/i);
                return m ? { rooms: m[1], exits: m[2], items: m[3], snippet: t.slice(t.indexOf("Center"), t.indexOf("Center") + 180) } : { snippet: t.slice(0, 200) };
            } catch (e) { return { error: String(e) }; }
        })();

        const lookText = (() => {
            try {
                const el = document.querySelector(".BufferWindow, #windowport");
                const t = (el && el.innerText) || "";
                return t.slice(-500);
            } catch (e) { return ""; }
        })();

        return {
            ramstart,
            decoding,
            accel,
            numAttr,
            objSize: OBJ_SIZE,
            indivStart,
            classAddr,
            objectCount: all.length,
            selfGlobalAddr,
            selfVal,
            printedNameProp,
            printedNameVotes: compassNameVotes,
            compass: { addr: compass, kids: compassInfo },
            containedCount: contained.length,
            yourselfHits: you.map((c) => ({ addr: c.addr, parent: c.parent, parentPrinted: c.parentPrinted })),
            player: describe(playerAddr),
            location: describe(locAddr),
            locKids: locKids.filter(Boolean).map((o) => ({
                addr: o.addr, printed: o.printed, hw: o.hw, dict: o.dict,
                kinds: o.kinds, attrs: o.attrs.bits, nKids: o.nKids
            })),
            inventory: inventory.filter(Boolean).map((o) => ({
                addr: o.addr, printed: o.printed, hw: o.hw, dict: o.dict,
                kinds: o.kinds, attrs: o.attrs.bits
            })),
            exits: exitFromProps.slice(0, 40),
            payload,
            mapText,
            lookText
        };
    }, COMPASS_WORDS);

    // Attribute-flip experiment: OPEN the first in-scope object that looks like a container kind.
    let openTrial = null;
    if (snapshot && snapshot.locKids && snapshot.locKids.length) {
        const cand = snapshot.locKids.find((k) => k.kinds && k.kinds.kinds && k.kinds.kinds.some((n) => /container|door/i.test(n)))
            || snapshot.locKids.find((k) => k.printed && !/^(compass|class|object)/i.test(k.printed));
        if (cand && cand.printed) {
            const beforeBits = cand.attrs;
            await inject("open " + cand.printed);
            openTrial = await page.evaluate((addr) => {
                if (typeof Quixe === "undefined") return { error: "no quixe" };
                const rb = (a) => Quixe.ReadByte(a) & 0xff;
                const internals = Quixe.get_vm_internals ? Quixe.get_vm_internals() : null;
                const accel = internals && internals.accel_params ? Array.from(internals.accel_params) : [];
                const numAttr = (accel[7] | 0) || 7;
                const bytes = [];
                for (let i = 0; i < numAttr; i++) bytes.push(rb(addr + 1 + i));
                const bits = [];
                for (let n = 0; n < numAttr * 8; n++) {
                    const byte = bytes[Math.floor(n / 8)];
                    if (((byte >> (7 - (n % 8))) & 1) === 1) bits.push(n);
                }
                const look = (() => {
                    try {
                        const el = document.querySelector(".BufferWindow, #windowport");
                        return ((el && el.innerText) || "").slice(-280);
                    } catch (e) { return ""; }
                })();
                return { addr, bytes, bits, look };
            }, cand.addr);
            openTrial = {
                command: "open " + cand.printed,
                addr: cand.addr,
                beforeBits,
                afterBits: openTrial && openTrial.bits,
                flipped: (openTrial && openTrial.bits || []).filter((b) => beforeBits.indexOf(b) < 0)
                    .concat((beforeBits || []).filter((b) => (openTrial.bits || []).indexOf(b) < 0)),
                look: openTrial && openTrial.look
            };
        }
    }

    // Movement experiment: first compass direction with a real dest.
    let moveTrial = null;
    const dir = snapshot && snapshot.compass && snapshot.compass.kids
        ? snapshot.compass.kids.find((k) => k.printed && COMPASS_WORDS[k.printed.toLowerCase()])
        : null;
    if (dir && dir.printed) {
        const beforeLoc = snapshot.player && snapshot.player.parent;
        await inject(dir.printed);
        moveTrial = await page.evaluate((prev) => {
            if (typeof Quixe === "undefined") return { error: "no quixe" };
            const rb = (a) => Quixe.ReadByte(a) & 0xff;
            const rw = (a) => {
                if (typeof Quixe.ReadWord === "function") return Quixe.ReadWord(a) >>> 0;
                return ((rb(a) << 24) | (rb(a + 1) << 16) | (rb(a + 2) << 8) | rb(a + 3)) >>> 0;
            };
            const internals = Quixe.get_vm_internals ? Quixe.get_vm_internals() : null;
            const accel = internals && internals.accel_params ? Array.from(internals.accel_params) : [];
            const numAttr = (accel[7] | 0) || 7;
            const ramstart = rw(8);
            const OFF_PARENT = 1 + numAttr + 12;
            const OFF_NAME = 1 + numAttr + 4;
            const OFF_PROPS = 1 + numAttr + 8;
            function isObj(addr) { return !!(addr && addr >= ramstart && rb(addr) === 0x70); }
            function decodeE1(ptr) {
                const decoding = (internals && internals.stringtable) ? internals.stringtable >>> 0 : rw(28);
                if (rb(ptr) === 0xe0) {
                    let s = "";
                    for (let i = ptr + 1; i < ptr + 60; i++) {
                        const c = rb(i); if (!c) break;
                        s += c >= 32 && c < 127 ? String.fromCharCode(c) : "?";
                    }
                    return s;
                }
                if (rb(ptr) !== 0xe1) return null;
                const root = rw(decoding + 8);
                let addr = ptr + 1, bitnum = 0, node = root, s = "";
                for (let step = 0; step < 80000 && s.length < 60; step++) {
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
                    if (t === 3) {
                        let i = node + 1;
                        while (rb(i) && s.length < 60) {
                            const c = rb(i++);
                            s += c >= 32 && c < 127 ? String.fromCharCode(c) : "?";
                        }
                        node = root; continue;
                    }
                    s += "*"; node = root;
                }
                return s;
            }
            function printed(addr, propId) {
                const n = rw(addr + OFF_PROPS);
                const count = rw(n);
                for (let i = 0; i < count && i < 80; i++) {
                    const base = n + 4 + i * 10;
                    const id = (rb(base) << 8) | rb(base + 1);
                    if (id !== propId) continue;
                    const len = (rb(base + 2) << 8) | rb(base + 3);
                    const data = rw(base + 4);
                    for (let w = 0; w < Math.min(len, 4); w++) {
                        const t = decodeE1(rw(data + w * 4));
                        if (t) return t;
                    }
                }
                return decodeE1(rw(addr + OFF_NAME)) || "";
            }
            const player = prev.playerAddr;
            const loc = isObj(player) ? rw(player + OFF_PARENT) : 0;
            const look = (() => {
                try {
                    const el = document.querySelector(".BufferWindow, #windowport");
                    return ((el && el.innerText) || "").slice(-280);
                } catch (e) { return ""; }
            })();
            return {
                playerStill: player,
                locBefore: prev.locBefore,
                locAfter: loc,
                locChanged: loc !== prev.locBefore,
                locPrinted: loc ? printed(loc, prev.printedNameProp) : "",
                look
            };
        }, {
            playerAddr: snapshot.player && snapshot.player.addr,
            locBefore: beforeLoc,
            printedNameProp: snapshot.printedNameProp
        });
        moveTrial.command = dir.printed;
    }

    await browser.close();
    const out = { story, errors, snapshot, openTrial, moveTrial };
    console.log(JSON.stringify(out, null, 2));
})().catch((e) => { console.error("FATAL", e); process.exit(1); });
