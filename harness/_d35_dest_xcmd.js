/**
 * D35 destination-resolution research (read-only, not a gate, not a product change).
 *
 * Prior probes typed "1" / "first"; the game itself says number exits as x1, x2, x3
 * and rejects bare "1" as an unrecognized verb. This pass:
 *   1. Builds the room-set structurally (I7 indiv table containing numbered
 *      door_dir keys from directionDoorDirs). No C_ROOMS_N name-pattern gate,
 *      no parent=24 assumption.
 *   2. Tries the game-instructed xN commands with multi-source location
 *      (snap.roomId, CustomPlayer parent, loc globals, printed "room #N")
 *      and only scores a trial if the Exit prompt was visible AND location
 *      actually changed.
 *
 * Does not implement pushExit-style destination-backed exits.
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
    async function bufferText() {
        return page.evaluate(() => ($("#windowport .BufferWindow").text() || ""));
    }
    async function inject(cmd) {
        if (!(await hasLine())) return false;
        await page.evaluate((t) => { Input.Clear(); Input.Inject(t, true); }, cmd);
        await page.waitForTimeout(1300);
        return true;
    }
    async function waitLine(max = 12) {
        for (let i = 0; i < max; i++) {
            if (await hasLine()) return true;
            await page.keyboard.press("Space");
            await page.waitForTimeout(200);
        }
        return hasLine();
    }

    for (let i = 0; i < 70; i++) {
        const t = await page.evaluate(() => (document.body.innerText || ""));
        const has = await hasLine();
        if (/yes or no|restore a saved game/i.test(t) && has) { await inject("n"); continue; }
        if (/Exit 1/i.test(t) && has) break;
        await page.keyboard.press("Space");
        await page.waitForTimeout(160);
    }
    await inject("look");
    await waitLine();

    const dump = await page.evaluate(() => {
        try { if (window.ZvmCapture) ZvmCapture.tick(); } catch (e0) {}
        const mem = ZRamProvider.getMem();
        if (!mem) return { error: "no-mem" };
        const h = ZRamReader.header(mem);
        const count = ZRamReader.objectCount(mem, h);
        const snap = ZRamReader.snapshot(mem);
        const doorDirs = ZRamReader.directionDoorDirs(mem);
        const numbered = doorDirs.filter((d) => d >= 64);
        const dict = ZRamReader.parseDictionary(mem);
        const dictHits = {};
        ["1", "2", "3", "x1", "x2", "x3", "x4", "x5", "x", "first", "second", "third", "exit", "go"].forEach((w) => {
            dictHits[w] = !!(dict.words && dict.words[w]);
        });

        function indivOf(id) {
            return ZRamReader.parseIndivTable(mem, ZRamReader.readProp(mem, id, 3));
        }
        function hasNumberedKeys(t) {
            return numbered.some((d) => Object.keys(t).indexOf(String(d)) >= 0);
        }
        function isMapRoom(id) {
            const t = indivOf(id);
            return ZRamReader.isIndivTable(t) && hasNumberedKeys(t);
        }

        const mapRooms = [];
        for (let id = 1; id <= count; id++) {
            if (!isMapRoom(id)) continue;
            const links = ZRamReader.objectLinks(mem, id);
            mapRooms.push({
                id,
                name: ZRamReader.shortName(mem, id) || "",
                parent: (links && links.parent) || 0,
                childCount: ZRamReader.children(mem, id).length
            });
        }
        const roomSet = {};
        mapRooms.forEach((r) => { roomSet[r.id] = r; });

        let populated = 0, inRoomSet = 0, inRangeNotRoom = 0, reverseOk = 0, reverseMiss = 0, parent24 = 0, parent0 = 0, otherParent = 0;
        const notRoomEx = [];
        const reverseMissEx = [];
        const parentEx = [];
        const graphSample = [];
        mapRooms.forEach((r) => {
            if (r.parent === 0) parent0++;
            else if (r.parent === 24) parent24++;
            else {
                otherParent++;
                if (parentEx.length < 6) parentEx.push({ id: r.id, parent: r.parent, parentName: ZRamReader.shortName(mem, r.parent) || "" });
            }
            const t = indivOf(r.id);
            numbered.forEach((d) => {
                const raw = t[d] || 0;
                if (!raw) return;
                populated++;
                if (roomSet[raw]) {
                    inRoomSet++;
                    const bt = indivOf(raw);
                    const back = numbered.filter((dd) => bt[dd] === r.id);
                    if (back.length) reverseOk++;
                    else {
                        reverseMiss++;
                        if (reverseMissEx.length < 6) reverseMissEx.push({ from: r.id, dprop: d, to: raw });
                    }
                    if (graphSample.length < 10) {
                        graphSample.push({ from: r.id, fromName: r.name, dprop: d, to: raw, toName: ZRamReader.shortName(mem, raw) || "", reverse: back });
                    }
                } else {
                    inRangeNotRoom++;
                    if (notRoomEx.length < 8) {
                        const o = ZRamReader.objectLinks(mem, raw);
                        notRoomEx.push({
                            from: r.id, dprop: d, raw,
                            inRange: raw >= 1 && raw <= count,
                            name: (raw >= 1 && raw <= count) ? (ZRamReader.shortName(mem, raw) || "") : "",
                            parent: o && o.parent,
                            isIndiv: (raw >= 1 && raw <= count) ? ZRamReader.isIndivTable(indivOf(raw)) : false
                        });
                    }
                }
            });
        });

        const players = [];
        for (let id = 1; id <= count; id++) {
            const nm = ZRamReader.shortName(mem, id) || "";
            if (!/(self object|player|yourself|CustomPlayer|^you$)/i.test(nm)) continue;
            const o = ZRamReader.objectLinks(mem, id);
            players.push({
                id, nm,
                parent: o && o.parent,
                parentName: o && o.parent ? (ZRamReader.shortName(mem, o.parent) || "") : "",
                parentIsMapRoom: !!(o && o.parent && roomSet[o.parent])
            });
        }

        const locGlobals = [];
        for (let g = 0; g < 40; g++) {
            const val = ZRamReader.u16(mem, h.globals + g * 2);
            if (val >= 1 && val <= count && roomSet[val]) {
                locGlobals.push({ g, val, name: ZRamReader.shortName(mem, val) || "" });
            }
        }

        const curId = snap.roomId;
        const cur = indivOf(curId);
        const curSlots = numbered.map((d) => ({
            dprop: d,
            raw: cur[d] || 0,
            inRoomSet: !!(cur[d] && roomSet[cur[d]]),
            destName: (cur[d] && roomSet[cur[d]]) ? roomSet[cur[d]].name : ""
        }));
        const curAll = Object.keys(cur).map((k) => {
            const raw = cur[k];
            const inRange = raw >= 1 && raw <= count;
            return {
                k: +k, raw, inRange,
                name: inRange ? (ZRamReader.shortName(mem, raw) || "") : "",
                inRoomSet: !!(inRange && roomSet[raw]),
                isDoorDir: numbered.indexOf(+k) >= 0
            };
        });

        const compassKids = ZRamReader.children(mem, 6).map((id) => ({
            id,
            name: ZRamReader.shortName(mem, id) || "",
            doorDir: ZRamReader.readProp(mem, id, 21)
        }));

        return {
            objectCount: count,
            snap: { roomId: snap.roomId, roomName: snap.roomName, playerId: snap.playerId },
            doorDirs,
            numbered,
            dictHits,
            mapRoomCount: mapRooms.length,
            parentTally: { parent0, parent24, otherParent, parentEx },
            tally: { populated, inRoomSet, inRangeNotRoom, reverseOk, reverseMiss },
            notRoomEx,
            reverseMissEx,
            graphSample,
            players,
            locGlobals,
            curSlots,
            curAll,
            compassNumbered: compassKids.filter((c) => c.doorDir >= 64),
            bufferTail: ($("#windowport .BufferWindow").text() || "").slice(-700)
        };
    });

    async function snapMove() {
        return page.evaluate(() => {
            try { if (window.ZvmCapture) ZvmCapture.tick(); } catch (e0) {}
            const mem = ZRamProvider.getMem();
            const snap = ZRamReader.snapshot(mem);
            const h = ZRamReader.header(mem);
            const count = ZRamReader.objectCount(mem, h);
            const doorDirs = ZRamReader.directionDoorDirs(mem).filter((d) => d >= 64);

            function indivOf(id) {
                return ZRamReader.parseIndivTable(mem, ZRamReader.readProp(mem, id, 3));
            }
            const roomSet = {};
            for (let id = 1; id <= count; id++) {
                const t = indivOf(id);
                if (!ZRamReader.isIndivTable(t)) continue;
                if (!doorDirs.some((d) => Object.keys(t).indexOf(String(d)) >= 0)) continue;
                roomSet[id] = true;
            }

            const players = [];
            for (let id = 1; id <= count; id++) {
                const nm = ZRamReader.shortName(mem, id) || "";
                if (!/(self object|player|yourself|CustomPlayer|^you$)/i.test(nm)) continue;
                const o = ZRamReader.objectLinks(mem, id);
                players.push({
                    id, nm,
                    parent: o && o.parent,
                    parentName: o && o.parent ? (ZRamReader.shortName(mem, o.parent) || "") : "",
                    parentIsMapRoom: !!(o && o.parent && roomSet[o.parent])
                });
            }
            const playerInMap = players.find((p) => p.parentIsMapRoom) || null;
            const locFromPlayer = playerInMap ? playerInMap.parent : 0;

            const locGlobals = [];
            for (let g = 0; g < 40; g++) {
                const val = ZRamReader.u16(mem, h.globals + g * 2);
                if (val >= 1 && val <= count && roomSet[val]) {
                    locGlobals.push({ g, val, name: ZRamReader.shortName(mem, val) || "" });
                }
            }

            function slotsOf(id) {
                const t = indivOf(id);
                const slots = {};
                doorDirs.forEach((d) => { slots[d] = t[d] || 0; });
                return slots;
            }

            const buf = $("#windowport .BufferWindow").text() || "";
            const printed = [];
            const re = /(?:You are (?:back )?in room #(\d+)|Room #(\d+))/gi;
            let m;
            while ((m = re.exec(buf))) printed.push(+(m[1] || m[2]));
            const exitMentions = buf.match(/Exit\s+\d+[^\n.]{0,90}/gi) || [];

            const candidateIds = [];
            function addCand(id, src) {
                if (!id || !roomSet[id]) return;
                if (candidateIds.some((c) => c.id === id)) return;
                candidateIds.push({ id, src, name: ZRamReader.shortName(mem, id) || "", slots: slotsOf(id) });
            }
            addCand(snap.roomId, "snap");
            addCand(locFromPlayer, "playerParent");
            locGlobals.forEach((g) => addCand(g.val, "g" + g.g));

            return {
                snapRoomId: snap.roomId,
                snapRoomName: snap.roomName,
                locFromPlayer,
                locFromPlayerName: locFromPlayer ? (ZRamReader.shortName(mem, locFromPlayer) || "") : "",
                players,
                locGlobals,
                candidates: candidateIds,
                printedRoomNums: printed.slice(-4),
                exitMentions: exitMentions.slice(-8),
                promptVisible: /Exit\s+\d+/i.test(buf.slice(-1200)),
                bufferTail: buf.slice(-500)
            };
        });
    }

    function matchAgainst(before, afterLocs) {
        const hits = [];
        (before.candidates || []).forEach((cand) => {
            Object.keys(cand.slots || {}).forEach((d) => {
                const raw = cand.slots[d];
                if (!raw) return;
                afterLocs.forEach((loc) => {
                    if (loc && loc === raw) {
                        hits.push({
                            fromSrc: cand.src,
                            fromId: cand.id,
                            dprop: +d,
                            dest: raw,
                            afterLoc: loc
                        });
                    }
                });
            });
        });
        return hits;
    }

    const trials = [];
    const COMMANDS = ["x1", "x2", "x3", "x4", "x5", "x 1", "go x1", "first", "first exit", "1"];

    async function tryCommand(cmd) {
        const before = await snapMove();
        const bufBefore = await bufferText();
        const okInject = await inject(cmd);
        await waitLine();
        await page.waitForTimeout(300);
        const after = await snapMove();
        const bufAfter = await bufferText();
        const afterLocs = [];
        if (after.snapRoomId) afterLocs.push(after.snapRoomId);
        if (after.locFromPlayer) afterLocs.push(after.locFromPlayer);
        (after.locGlobals || []).forEach((g) => afterLocs.push(g.val));
        const uniqueAfter = Array.from(new Set(afterLocs));
        const beforeLocs = [];
        if (before.snapRoomId) beforeLocs.push(before.snapRoomId);
        if (before.locFromPlayer) beforeLocs.push(before.locFromPlayer);
        const movedSnap = !!(after.snapRoomId && before.snapRoomId && after.snapRoomId !== before.snapRoomId);
        const movedPlayer = !!(after.locFromPlayer && before.locFromPlayer && after.locFromPlayer !== before.locFromPlayer);
        const printedBefore = (before.printedRoomNums || []).slice(-1)[0] || null;
        const printedAfter = (after.printedRoomNums || []).slice(-1)[0] || null;
        const movedPrinted = !!(printedBefore && printedAfter && printedBefore !== printedAfter);
        const parserReject = /not a verb I recognise|don't understand|can't see any such/i.test(bufAfter.slice(bufBefore.length - 40));
        const hits = matchAgainst(before, uniqueAfter);
        return {
            cmd,
            okInject,
            promptVisible: !!before.promptVisible,
            movedSnap,
            movedPlayer,
            movedPrinted,
            parserReject,
            hits,
            before: {
                snap: { id: before.snapRoomId, name: before.snapRoomName },
                playerParent: { id: before.locFromPlayer, name: before.locFromPlayerName },
                printed: before.printedRoomNums,
                exits: before.exitMentions,
                candidates: before.candidates
            },
            after: {
                snap: { id: after.snapRoomId, name: after.snapRoomName },
                playerParent: { id: after.locFromPlayer, name: after.locFromPlayerName },
                printed: after.printedRoomNums,
                exits: after.exitMentions
            },
            textDelta: bufAfter.slice(Math.max(0, bufBefore.length - 20)).slice(-420)
        };
    }

    // Exhaust commands from the starting room first (stay if no move).
    for (const cmd of COMMANDS) {
        const result = await tryCommand(cmd);
        trials.push(Object.assign({ phase: "start-room" }, result));
        if (result.movedSnap || result.movedPlayer || result.movedPrinted) {
            // hop onward a few times with the working command
            for (let hop = 0; hop < 5; hop++) {
                const r2 = await tryCommand(cmd);
                trials.push(Object.assign({ phase: "chain", hop: hop + 1 }, r2));
                if (!(r2.movedSnap || r2.movedPlayer || r2.movedPrinted)) break;
            }
        }
    }

    // If x1 worked, also try x2/x3 from wherever we are without resetting.
    const worked = trials.filter((t) => t.movedSnap || t.movedPlayer || t.movedPrinted).map((t) => t.cmd);
    const extras = ["x2", "x3", "x1"].filter((c) => worked.indexOf(c) >= 0);
    for (let hop = 0; hop < 6; hop++) {
        if (!extras.length) break;
        const cmd = extras[hop % extras.length];
        const r = await tryCommand(cmd);
        trials.push(Object.assign({ phase: "mix", hop: hop + 1 }, r));
        if (!(r.movedSnap || r.movedPlayer || r.movedPrinted)) continue;
    }

    await browser.close();

    const moves = trials.filter((t) => t.movedSnap || t.movedPlayer || t.movedPrinted);
    const correspondence = {};
    moves.forEach((t) => {
        if (!correspondence[t.cmd]) correspondence[t.cmd] = [];
        correspondence[t.cmd].push({
            hits: t.hits,
            fromSnap: t.before.snap,
            toSnap: t.after.snap,
            fromPlayer: t.before.playerParent,
            toPlayer: t.after.playerParent,
            printed: { from: t.before.printed, to: t.after.printed }
        });
    });

    const out = {
        dump,
        trialCount: trials.length,
        successfulMoves: moves.length,
        correspondence,
        hypothesis: {
            structuralDestIsRoom: dump.tally && dump.tally.populated > 0 && dump.tally.inRoomSet === dump.tally.populated && dump.tally.inRangeNotRoom === 0,
            reverseComplete: dump.tally && dump.tally.reverseOk === dump.tally.populated && dump.tally.reverseMiss === 0,
            parent24IsRoomParent: dump.parentTally && dump.parentTally.parent24 > 0 && dump.parentTally.parent0 === 0,
            moveConfirmed: moves.length > 0,
            moveMatchedIndiv: moves.filter((t) => t.hits && t.hits.length).length,
            x1Matched91: moves.filter((t) => t.cmd === "x1" && t.hits.some((h) => h.dprop === 91)).length,
            x2Matched92: moves.filter((t) => t.cmd === "x2" && t.hits.some((h) => h.dprop === 92)).length,
            x3Matched93: moves.filter((t) => t.cmd === "x3" && t.hits.some((h) => h.dprop === 93)).length
        },
        trials: trials.map((t) => ({
            phase: t.phase,
            hop: t.hop || 0,
            cmd: t.cmd,
            promptVisible: t.promptVisible,
            movedSnap: t.movedSnap,
            movedPlayer: t.movedPlayer,
            movedPrinted: t.movedPrinted,
            parserReject: t.parserReject,
            hits: t.hits,
            from: t.before,
            to: t.after,
            textDelta: t.textDelta
        }))
    };

    const outPath = path.join("tools", "screenshots", "matrix", "d35-dest-xcmd.json");
    fs.mkdirSync(path.dirname(outPath), { recursive: true });
    fs.writeFileSync(outPath, JSON.stringify(out, null, 2));
    console.log(JSON.stringify({
        tally: dump.tally,
        parentTally: dump.parentTally,
        dictHits: dump.dictHits,
        snap: dump.snap,
        players: dump.players,
        locGlobals: dump.locGlobals,
        curSlots: dump.curSlots,
        compassNumbered: dump.compassNumbered,
        graphSample: dump.graphSample,
        notRoomEx: dump.notRoomEx,
        trialCount: out.trialCount,
        successfulMoves: out.successfulMoves,
        correspondence,
        hypothesis: out.hypothesis,
        trials: out.trials.map((t) => ({
            phase: t.phase, hop: t.hop, cmd: t.cmd,
            promptVisible: t.promptVisible,
            movedSnap: t.movedSnap, movedPlayer: t.movedPlayer, movedPrinted: t.movedPrinted,
            parserReject: t.parserReject,
            hits: t.hits,
            fromSnap: t.from.snap, toSnap: t.to.snap,
            fromPlayer: t.from.playerParent, toPlayer: t.to.playerParent,
            printedFrom: t.from.printed, printedTo: t.to.printed,
            delta: (t.textDelta || "").slice(-180)
        }))
    }, null, 2));
})().catch((e) => { console.error(e && e.stack || e); process.exit(1); });
