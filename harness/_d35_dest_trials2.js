/**
 * D35 dest-resolution research pass 2 (read-only).
 * - Room-set = objects whose prop-3 decodes as I7 indiv table containing
 *   the numbered door_dir keys (91-95). No name-pattern gate.
 * - Reverse-edge check: if A.indiv[dprop]=B, does B have some door_dir
 *   slot pointing back at A?
 * - Parser vocabulary: try first/second/first exit against BufferWindow.
 * - Locate the real yourself object and its parent vs location-global.
 */
const { chromium } = require("playwright");
const { pathToFileURL } = require("node:url");
const path = require("node:path");
const fs = require("node:fs");
const ROOT = path.resolve(__dirname, "..");
process.chdir(ROOT);

(async () => {
    const chrome = process.env.PW_CHROME || "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
    const browser = await chromium.launch({
        executablePath: fs.existsSync(chrome) ? chrome : undefined,
        headless: true
    });
    const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
    await page.goto(pathToFileURL(path.resolve("play.html")).href + "?story=games/wump2ka.z5.js");
    await page.waitForTimeout(1800);
    await page.evaluate(() => { if (window.Message) Message.Hide(); });

    async function hasLine() {
        return (await page.locator(".Input.LineInput").count()) > 0;
    }
    async function inject(cmd) {
        if (!(await hasLine())) return false;
        await page.evaluate((t) => { Input.Clear(); Input.Inject(t, true); }, cmd);
        await page.waitForTimeout(1200);
        return true;
    }
    async function fillEnter(cmd) {
        const loc = page.locator(".Input.LineInput").first();
        if (!(await loc.count())) return false;
        await loc.fill(cmd);
        await loc.press("Enter");
        await page.waitForTimeout(1200);
        return true;
    }
    for (let i = 0; i < 60; i++) {
        const t = await page.evaluate(() => (document.body.innerText || ""));
        const has = await hasLine();
        if (/yes or no|restore a saved game/i.test(t) && has) { await inject("n"); continue; }
        if (/Exit 1/i.test(t) && has) break;
        await page.keyboard.press("Space");
        await page.waitForTimeout(160);
    }
    await inject("look");
    await page.waitForTimeout(400);

    const dump = await page.evaluate(() => {
        try { if (window.ZvmCapture) ZvmCapture.tick(); } catch (e0) {}
        const mem = ZRamProvider.getMem();
        const h = ZRamReader.header(mem);
        const count = ZRamReader.objectCount(mem, h);
        const snap = ZRamReader.snapshot(mem);
        const doorDirs = ZRamReader.directionDoorDirs(mem);
        const numbered = doorDirs.filter((d) => d >= 64);
        const dict = ZRamReader.parseDictionary(mem);
        const dictHits = {};
        ["1", "2", "3", "first", "second", "third", "fourth", "fifth", "exit", "go", "enter"].forEach((w) => {
            dictHits[w] = !!(dict.words && dict.words[w]);
        });

        function indivOf(id) {
            return ZRamReader.parseIndivTable(mem, ZRamReader.readProp(mem, id, 3));
        }
        function isMapRoom(id) {
            const t = indivOf(id);
            if (!ZRamReader.isIndivTable(t)) return false;
            // Must carry at least one numbered door_dir key (even if value 0).
            for (let i = 0; i < numbered.length; i++) {
                if (Object.prototype.hasOwnProperty.call(t, String(numbered[i])) || t[numbered[i]] != null) return true;
            }
            // keys may be numbers not strings
            return numbered.some((d) => t[d] != null || t[d] === 0 || Object.keys(t).indexOf(String(d)) >= 0);
        }

        const mapRooms = [];
        for (let id = 1; id <= count; id++) {
            const t = indivOf(id);
            if (!ZRamReader.isIndivTable(t)) continue;
            const hasNum = numbered.some((d) => Object.keys(t).indexOf(String(d)) >= 0);
            if (!hasNum) continue;
            const links = ZRamReader.objectLinks(mem, id);
            mapRooms.push({
                id,
                name: ZRamReader.shortName(mem, id) || "",
                parent: links && links.parent,
                childCount: ZRamReader.children(mem, id).length,
                keys: Object.keys(t).map(Number)
            });
        }
        const roomSet = {};
        mapRooms.forEach((r) => { roomSet[r.id] = r; });

        const you = [];
        for (let id = 1; id <= count; id++) {
            const nm = ZRamReader.shortName(mem, id) || "";
            if (/you|self|player|adventurer|body/i.test(nm)) {
                const o = ZRamReader.objectLinks(mem, id);
                you.push({
                    id, nm,
                    parent: o && o.parent,
                    parentName: o && o.parent ? (ZRamReader.shortName(mem, o.parent) || "") : "",
                    kids: ZRamReader.children(mem, id).length
                });
            }
        }

        const locGlobals = [];
        for (let g = 0; g < 40; g++) {
            const val = ZRamReader.u16(mem, h.globals + g * 2);
            if (val >= 1 && val <= count && roomSet[val]) {
                locGlobals.push({ g, val, name: ZRamReader.shortName(mem, val) || "" });
            }
        }

        // Per-room door_dir slot analysis + reverse edges.
        let populated = 0, inRoomSet = 0, inRangeNotRoom = 0, reverseOk = 0, reverseMiss = 0;
        const reverseMissEx = [];
        const notRoomEx = [];
        const graphSample = [];
        mapRooms.forEach((r) => {
            const t = indivOf(r.id);
            numbered.forEach((d) => {
                const raw = t[d] || 0;
                if (!raw) return;
                populated++;
                const inSet = !!roomSet[raw];
                if (inSet) inRoomSet++;
                else {
                    inRangeNotRoom++;
                    if (notRoomEx.length < 8) {
                        const o = ZRamReader.objectLinks(mem, raw);
                        notRoomEx.push({
                            from: r.id, dprop: d, raw,
                            name: (raw >= 1 && raw <= count) ? (ZRamReader.shortName(mem, raw) || "") : "",
                            parent: o && o.parent,
                            inRange: raw >= 1 && raw <= count,
                            isIndiv: (raw >= 1 && raw <= count) ? ZRamReader.isIndivTable(indivOf(raw)) : false
                        });
                    }
                }
                if (inSet) {
                    const bt = indivOf(raw);
                    const back = numbered.filter((dd) => bt[dd] === r.id);
                    if (back.length) reverseOk++;
                    else {
                        reverseMiss++;
                        if (reverseMissEx.length < 8) reverseMissEx.push({ from: r.id, dprop: d, to: raw });
                    }
                    if (graphSample.length < 12) {
                        graphSample.push({
                            from: r.id, fromName: r.name, dprop: d, to: raw,
                            toName: ZRamReader.shortName(mem, raw) || "",
                            reverseDprops: back
                        });
                    }
                }
            });
        });

        const roomId = snap.roomId;
        const cur = indivOf(roomId);
        const curSlots = numbered.map((d) => ({
            dprop: d,
            raw: cur[d] || 0,
            inRoomSet: !!(cur[d] && roomSet[cur[d]])
        }));
        const curAll = Object.keys(cur).map((k) => {
            const raw = cur[k];
            const inRange = raw >= 1 && raw <= count;
            return {
                k: +k, raw, inRange,
                name: inRange ? (ZRamReader.shortName(mem, raw) || "") : "",
                inRoomSet: !!(inRange && roomSet[raw]),
                isIndiv: inRange ? ZRamReader.isIndivTable(indivOf(raw)) : false
            };
        });

        const roomKids = roomId ? ZRamReader.children(mem, roomId).map((id) => ({
            id, name: ZRamReader.shortName(mem, id) || ""
        })) : [];

        const compassKids = ZRamReader.children(mem, 6).map((id) => ({
            id,
            name: ZRamReader.shortName(mem, id) || "",
            doorDir: ZRamReader.readProp(mem, id, 21)
        }));

        const buf = (($("#windowport .BufferWindow").text() || "")).slice(-800);
        return {
            objectCount: count,
            snap: { roomId: snap.roomId, roomName: snap.roomName, playerId: snap.playerId },
            you,
            locGlobals,
            dictHits,
            doorDirs,
            numbered,
            mapRoomCount: mapRooms.length,
            mapRoomIdRange: mapRooms.length ? { min: mapRooms[0].id, max: mapRooms[mapRooms.length - 1].id, first5: mapRooms.slice(0, 5), last3: mapRooms.slice(-3) } : null,
            tally: { populated, inRoomSet, inRangeNotRoom, reverseOk, reverseMiss },
            reverseMissEx,
            notRoomEx,
            graphSample,
            curSlots,
            curAll,
            roomKids,
            compassKids: compassKids.filter((c) => c.doorDir >= 64 || /exit/i.test(c.name)),
            bufferTail: buf
        };
    });

    async function snapMove() {
        return page.evaluate(() => {
            try { if (window.ZvmCapture) ZvmCapture.tick(); } catch (e0) {}
            const mem = ZRamProvider.getMem();
            const snap = ZRamReader.snapshot(mem);
            const h = ZRamReader.header(mem);
            const count = ZRamReader.objectCount(mem, h);
            let youParent = null;
            for (let id = 1; id <= count; id++) {
                const nm = ZRamReader.shortName(mem, id) || "";
                if (/^yourself$/i.test(nm) || /^player$/i.test(nm)) {
                    const o = ZRamReader.objectLinks(mem, id);
                    youParent = { id, nm, parent: o && o.parent, parentName: o && o.parent ? (ZRamReader.shortName(mem, o.parent) || "") : "" };
                    break;
                }
            }
            const indiv = ZRamReader.parseIndivTable(mem, ZRamReader.readProp(mem, snap.roomId, 3));
            const doorDirs = ZRamReader.directionDoorDirs(mem).filter((d) => d >= 64);
            const slots = {};
            doorDirs.forEach((d) => { slots[d] = indiv[d] || 0; });
            return {
                roomId: snap.roomId,
                roomName: snap.roomName,
                youParent,
                slots,
                bufferTail: ($("#windowport .BufferWindow").text() || "").slice(-500)
            };
        });
    }

    const trials = [];
    const cmds = [
        { how: "inject", cmd: "first" },
        { how: "inject", cmd: "second" },
        { how: "inject", cmd: "first exit" },
        { how: "inject", cmd: "go first" },
        { how: "inject", cmd: "go first exit" },
        { how: "fill", cmd: "first" },
        { how: "fill", cmd: "1" },
        { how: "fill", cmd: "go 1" }
    ];
    for (const spec of cmds) {
        const before = await snapMove();
        if (spec.how === "fill") await fillEnter(spec.cmd);
        else await inject(spec.cmd);
        for (let i = 0; i < 6; i++) {
            if (!(await hasLine())) {
                await page.keyboard.press("Space");
                await page.waitForTimeout(180);
            } else break;
        }
        const after = await snapMove();
        const movedSnap = after.roomId && after.roomId !== before.roomId;
        const movedYou = !!(before.youParent && after.youParent && before.youParent.parent && after.youParent.parent && before.youParent.parent !== after.youParent.parent);
        const matched = [];
        Object.keys(before.slots || {}).forEach((d) => {
            if (before.slots[d] && (before.slots[d] === after.roomId || (after.youParent && before.slots[d] === after.youParent.parent))) {
                matched.push(+d);
            }
        });
        trials.push({
            how: spec.how,
            cmd: spec.cmd,
            movedSnap,
            movedYou,
            matchedDprop: matched,
            before: { roomId: before.roomId, roomName: before.roomName, youParent: before.youParent, slots: before.slots },
            after: { roomId: after.roomId, roomName: after.roomName, youParent: after.youParent },
            bufferAfter: after.bufferTail
        });
        if (movedSnap || movedYou) {
            // keep going from new room with the working command once more
            const b2 = await snapMove();
            if (spec.how === "fill") await fillEnter(spec.cmd);
            else await inject(spec.cmd);
            await page.waitForTimeout(800);
            const a2 = await snapMove();
            const matched2 = [];
            Object.keys(b2.slots || {}).forEach((d) => {
                if (b2.slots[d] && (b2.slots[d] === a2.roomId || (a2.youParent && b2.slots[d] === a2.youParent.parent))) {
                    matched2.push(+d);
                }
            });
            trials.push({
                how: spec.how,
                cmd: spec.cmd,
                hop: 2,
                movedSnap: a2.roomId !== b2.roomId,
                movedYou: !!(b2.youParent && a2.youParent && b2.youParent.parent !== a2.youParent.parent),
                matchedDprop: matched2,
                before: { roomId: b2.roomId, roomName: b2.roomName, youParent: b2.youParent, slots: b2.slots },
                after: { roomId: a2.roomId, roomName: a2.roomName, youParent: a2.youParent },
                bufferAfter: a2.bufferTail
            });
        }
    }

    await browser.close();
    const out = { dump, trials };
    const outPath = path.join("tools", "screenshots", "matrix", "d35-dest-trials2.json");
    fs.mkdirSync(path.dirname(outPath), { recursive: true });
    fs.writeFileSync(outPath, JSON.stringify(out, null, 2));
    console.log(JSON.stringify({
        snap: dump.snap,
        you: dump.you,
        locGlobals: dump.locGlobals,
        dictHits: dump.dictHits,
        mapRoomCount: dump.mapRoomCount,
        mapRoomIdRange: dump.mapRoomIdRange,
        tally: dump.tally,
        reverseMissEx: dump.reverseMissEx,
        notRoomEx: dump.notRoomEx,
        graphSample: dump.graphSample,
        curSlots: dump.curSlots,
        compassKids: dump.compassKids,
        bufferTail: dump.bufferTail,
        trials: trials.map((t) => ({
            how: t.how, cmd: t.cmd, hop: t.hop || 1,
            movedSnap: t.movedSnap, movedYou: t.movedYou,
            matchedDprop: t.matchedDprop,
            from: t.before, to: t.after,
            buf: (t.bufferAfter || "").slice(-240)
        }))
    }, null, 2));
})().catch((e) => { console.error(e && e.stack || e); process.exit(1); });
