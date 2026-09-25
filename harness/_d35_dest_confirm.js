/**
 * D35 destination-resolution confirmation (read-only, not a gate).
 *
 * Verifies or refutes: indiv[dprop] for dprop in directionDoorDirs (91-95)
 * is a destination room object id. Then maps printed Exit N / typed xN
 * onto those keys with repeated live moves.
 *
 * Dest validation is structural only:
 *   in-range 1..objectCount AND dest itself carries an I7 indiv table
 *   with numbered door_dir keys. Parent-sharing is reported, not gated
 *   on the C_ROOMS_N name or on a hardcoded parent=24.
 *
 * Location for move trials is the in-world PC parented to a map-room,
 * not snap.roomId (this game's "(self object)" parent is 0).
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
        await page.waitForTimeout(1200);
        return true;
    }
    async function waitLine(max = 18) {
        for (let i = 0; i < max; i++) {
            if (await hasLine()) return true;
            await page.keyboard.press("Space");
            await page.waitForTimeout(180);
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

        function indivOf(id) {
            return ZRamReader.parseIndivTable(mem, ZRamReader.readProp(mem, id, 3));
        }
        function isMapRoom(id) {
            const t = indivOf(id);
            if (!ZRamReader.isIndivTable(t)) return false;
            return numbered.some((d) => t[d] != null || Object.prototype.hasOwnProperty.call(t, String(d)));
        }

        const mapRooms = [];
        for (let id = 1; id <= count; id++) {
            if (!isMapRoom(id)) continue;
            const links = ZRamReader.objectLinks(mem, id);
            const t = indivOf(id);
            mapRooms.push({
                id,
                name: ZRamReader.shortName(mem, id) || "",
                parent: (links && links.parent) || 0,
                parentName: (links && links.parent) ? (ZRamReader.shortName(mem, links.parent) || "") : "",
                childCount: ZRamReader.children(mem, id).length,
                populated: numbered.filter((d) => t[d]),
                slots: numbered.reduce((acc, d) => { acc[d] = t[d] || 0; return acc; }, {})
            });
        }
        const roomSet = {};
        mapRooms.forEach((r) => { roomSet[r.id] = r; });

        const parentTally = {};
        mapRooms.forEach((r) => {
            const key = r.parent + ":" + r.parentName;
            parentTally[key] = (parentTally[key] || 0) + 1;
        });

        let populated = 0, inRange = 0, inRoomSet = 0, inRangeNotRoom = 0;
        let destIsIndiv = 0, reverseOk = 0, reverseMiss = 0, sameParent = 0, destParent0 = 0;
        const notRoomEx = [];
        const reverseMissEx = [];
        const graphSample = [];
        const patternCounts = {};
        const gapRooms = [];
        const destParentTally = {};

        mapRooms.forEach((r) => {
            const t = indivOf(r.id);
            const pattern = numbered.map((d) => (t[d] ? "1" : "0")).join("");
            patternCounts[pattern] = (patternCounts[pattern] || 0) + 1;
            const populatedProps = numbered.filter((d) => t[d]);
            const expectedPrefix = numbered.slice(0, populatedProps.length);
            const isGap = populatedProps.length > 0 && populatedProps.some((d, i) => d !== expectedPrefix[i]);
            if (isGap && gapRooms.length < 16) {
                gapRooms.push({ id: r.id, name: r.name, pattern, populatedProps });
            }
            numbered.forEach((d) => {
                const raw = t[d] || 0;
                if (!raw) return;
                populated++;
                const inR = raw >= 1 && raw <= count;
                if (inR) inRange++;
                if (roomSet[raw]) {
                    inRoomSet++;
                    const dest = roomSet[raw];
                    const dp = dest.parent || 0;
                    destParentTally[dp + ":" + dest.parentName] = (destParentTally[dp + ":" + dest.parentName] || 0) + 1;
                    if (dp === 0) destParent0++;
                    if (dest.parent && r.parent && dest.parent === r.parent) sameParent++;
                    if (ZRamReader.isIndivTable(indivOf(raw))) destIsIndiv++;
                    const bt = indivOf(raw);
                    const back = numbered.filter((dd) => bt[dd] === r.id);
                    if (back.length) reverseOk++;
                    else {
                        reverseMiss++;
                        if (reverseMissEx.length < 8) reverseMissEx.push({ from: r.id, dprop: d, to: raw });
                    }
                    if (graphSample.length < 10) {
                        graphSample.push({
                            from: r.id, fromName: r.name, dprop: d, to: raw,
                            toName: dest.name, reverse: back, destParent: dest.parent
                        });
                    }
                } else {
                    inRangeNotRoom++;
                    if (notRoomEx.length < 10) {
                        const o = (inR && ZRamReader.objectLinks(mem, raw)) || {};
                        notRoomEx.push({
                            from: r.id, dprop: d, raw, inRange: inR,
                            name: inR ? (ZRamReader.shortName(mem, raw) || "") : "",
                            parent: o.parent || 0,
                            isIndiv: inR ? ZRamReader.isIndivTable(indivOf(raw)) : false
                        });
                    }
                }
            });
        });

        // Occupants of map rooms (PC locator, not a dest gate).
        const occupants = [];
        for (let id = 1; id <= count; id++) {
            const o = ZRamReader.objectLinks(mem, id);
            if (!o || !o.parent || !roomSet[o.parent]) continue;
            occupants.push({
                id,
                name: ZRamReader.shortName(mem, id) || "",
                parent: o.parent,
                parentName: roomSet[o.parent].name,
                kids: ZRamReader.children(mem, id).length,
                parentPopulated: roomSet[o.parent].populated.length
            });
        }

        const compassKids = [];
        let compassHolder = null;
        const holderLimit = Math.min(count, 96);
        for (let id = 1; id <= holderLimit; id++) {
            const kids = ZRamReader.children(mem, id);
            if (kids.length < 8) continue;
            let good = true, kind0 = 0, slots = [];
            const seen = {};
            for (let i = 0; i < kids.length; i++) {
                const dd = ZRamReader.readProp(mem, kids[i], 21);
                const kind = ZRamReader.readProp(mem, kids[i], 2);
                if (!(dd >= 1 && dd <= 255) || !kind) { good = false; break; }
                if (!kind0) kind0 = kind;
                else if (kind !== kind0) { good = false; break; }
                if (!seen[dd]) { seen[dd] = 1; slots.push(dd); }
            }
            if (good && slots.length >= 8 && (!compassHolder || slots.length > compassHolder.slotCount)) {
                compassHolder = { id, name: ZRamReader.shortName(mem, id) || "", slotCount: slots.length };
                compassKids.length = 0;
                kids.forEach((kid) => {
                    compassKids.push({
                        id: kid,
                        name: ZRamReader.shortName(mem, kid) || "",
                        doorDir: ZRamReader.readProp(mem, kid, 21)
                    });
                });
            }
        }

        const dict = ZRamReader.parseDictionary(mem);
        const dictHits = {};
        ["1", "2", "3", "4", "5", "x1", "x2", "x3", "x4", "x5", "x", "first", "second", "third", "fourth", "fifth", "exit", "go"].forEach((w) => {
            dictHits[w] = !!(dict.words && dict.words[w]);
        });

        const buf = $("#windowport .BufferWindow").text() || "";
        const roomsWithPop = mapRooms.filter((r) => r.populated.length > 0);
        const roomsParent0 = roomsWithPop.filter((r) => r.parent === 0).length;
        const roomsParent24 = roomsWithPop.filter((r) => r.parent === 24).length;

        return {
            objectCount: count,
            snap: { roomId: snap.roomId, roomName: snap.roomName, playerId: snap.playerId },
            doorDirs,
            numbered,
            mapRoomCount: mapRooms.length,
            roomsWithPopulatedSlots: roomsWithPop.length,
            roomsParent0,
            roomsParent24,
            parentTally,
            destParentTally,
            occupants: occupants.slice(0, 24),
            occupantCount: occupants.length,
            tally: {
                populated, inRange, inRoomSet, inRangeNotRoom,
                destIsIndiv, reverseOk, reverseMiss, sameParent, destParent0
            },
            patternCounts,
            gapRooms,
            notRoomEx,
            reverseMissEx,
            graphSample,
            compassHolder,
            compassNumbered: compassKids.filter((c) => c.doorDir >= 64),
            dictHits,
            promptVisible: /Exit\s+\d+/i.test(buf),
            bufferTail: buf.slice(-800)
        };
    });

    async function snapMove() {
        return page.evaluate(() => {
            try { if (window.ZvmCapture) ZvmCapture.tick(); } catch (e0) {}
            const mem = ZRamProvider.getMem();
            if (!mem) return { error: "no-mem" };
            const h = ZRamReader.header(mem);
            const count = ZRamReader.objectCount(mem, h);
            const snap = ZRamReader.snapshot(mem);
            const doorDirs = ZRamReader.directionDoorDirs(mem).filter((d) => d >= 64);

            function indivOf(id) {
                return ZRamReader.parseIndivTable(mem, ZRamReader.readProp(mem, id, 3));
            }
            const roomSet = {};
            for (let id = 1; id <= count; id++) {
                const t = indivOf(id);
                if (!ZRamReader.isIndivTable(t)) continue;
                if (!doorDirs.some((d) => t[d] != null || Object.prototype.hasOwnProperty.call(t, String(d)))) continue;
                roomSet[id] = ZRamReader.shortName(mem, id) || "";
            }

            const inRoom = [];
            for (let id = 1; id <= count; id++) {
                const o = ZRamReader.objectLinks(mem, id);
                if (!o || !roomSet[o.parent]) continue;
                inRoom.push({
                    id,
                    name: ZRamReader.shortName(mem, id) || "",
                    parent: o.parent,
                    parentName: roomSet[o.parent],
                    kids: ZRamReader.children(mem, id).length
                });
            }
            // Research locator only. Dest validation never uses this name.
            let pc = inRoom.find((o) => /^\(CustomPlayer\)$/i.test(o.name))
                || inRoom.find((o) => o.kids >= 1 && !/^(skeleton|paper|feather|canteen|pellet|transmat)/i.test(o.name))
                || inRoom[0]
                || null;

            const loc = pc ? pc.parent : 0;
            const t = loc ? indivOf(loc) : {};
            const slots = {};
            const populated = [];
            doorDirs.forEach((d) => {
                const raw = t[d] || 0;
                slots[d] = raw;
                if (raw) populated.push(d);
            });
            const buf = $("#windowport .BufferWindow").text() || "";
            const printed = [];
            const re = /(?:You are (?:back )?in room #(\d+)|Room #(\d+))/gi;
            let m;
            while ((m = re.exec(buf))) printed.push(+(m[1] || m[2]));
            const exitMentions = buf.match(/Exit\s+\d+[^\n.]{0,90}/gi) || [];
            return {
                snapRoomId: snap.roomId,
                snapRoomName: snap.roomName,
                loc,
                locName: loc ? (roomSet[loc] || "") : "",
                pc,
                occupantCount: inRoom.length,
                slots,
                populated,
                printedRoomNums: printed.slice(-4),
                exitMentions: exitMentions.slice(-8),
                promptVisible: /Exit\s+\d+/i.test(buf.slice(-1400)),
                dead: /you (have (been )?died|are dead)|game over|would you like to/i.test(buf.slice(-500)),
                bufferTail: buf.slice(-420)
            };
        });
    }

    const trials = [];
    async function tryCommand(cmd, phase) {
        const before = await snapMove();
        const bufBefore = await bufferText();
        const okInject = await inject(cmd);
        await waitLine();
        await page.waitForTimeout(250);
        const after = await snapMove();
        const bufAfter = await bufferText();
        const delta = bufAfter.slice(Math.max(0, bufBefore.length - 30));
        const parserReject = /not a verb I recognise|don't understand|can't see any such|that's not a direction/i.test(delta);
        const moved = !!(before.loc && after.loc && before.loc !== after.loc);
        const matched = [];
        if (moved && before.slots) {
            Object.keys(before.slots).forEach((d) => {
                if (before.slots[d] && before.slots[d] === after.loc) matched.push(+d);
            });
        }
        const ordinal = before.populated || [];
        const xn = /^\s*x(\d+)\s*$/i.test(cmd) ? +RegExp.$1 : 0;
        const ordinalHit = (moved && xn) ? (ordinal[xn - 1] || null) : null;
        const row = {
            phase,
            cmd,
            okInject,
            promptVisible: !!before.promptVisible,
            parserReject,
            moved,
            matchedDprop: matched,
            uniqueMatch: matched.length === 1 ? matched[0] : null,
            ordinalDprop: ordinalHit,
            ordinalAgreed: !!(ordinalHit && matched.length === 1 && matched[0] === ordinalHit),
            from: {
                loc: before.loc, name: before.locName, populated: before.populated,
                slots: before.slots, printed: before.printedRoomNums,
                exits: before.exitMentions, pc: before.pc,
                snapRoomId: before.snapRoomId
            },
            to: {
                loc: after.loc, name: after.locName, populated: after.populated,
                printed: after.printedRoomNums, pc: after.pc, dead: after.dead,
                snapRoomId: after.snapRoomId
            },
            textDelta: delta.slice(-360)
        };
        trials.push(row);
        return row;
    }

    await tryCommand("1", "parser-probe");
    await tryCommand("go 1", "parser-probe");

    const numberedCmds = ["x1", "x2", "x3", "x4", "x5"];
    for (const cmd of numberedCmds) {
        const r = await tryCommand(cmd, "start-room");
        if (r.to && r.to.dead) break;
        if (r.moved) {
            for (let hop = 0; hop < 3; hop++) {
                const r2 = await tryCommand(cmd, "chain-" + cmd);
                if (!r2.moved || (r2.to && r2.to.dead)) break;
            }
        }
    }

    const worked = Array.from(new Set(trials.filter((t) => t.moved).map((t) => t.cmd)));
    for (let hop = 0; hop < 12; hop++) {
        if (!worked.length) break;
        const here = await snapMove();
        if (here.dead) break;
        // Prefer a command that can distinguish slots: if 93 is populated, fire x3.
        let cmd = worked[hop % worked.length];
        if (here.slots && here.slots[93] && here.promptVisible) cmd = "x3";
        else if (here.slots && here.slots[94] && here.promptVisible && hop % 3 === 2) cmd = "x4";
        else if (here.slots && here.slots[92] && here.promptVisible && hop % 2 === 1) cmd = "x2";
        else if (here.slots && here.slots[91] && here.promptVisible) cmd = "x1";
        const r = await tryCommand(cmd, "mix");
        if (r.to && r.to.dead) break;
    }

    const here = await snapMove();
    if (here.promptVisible && !here.dead) {
        await tryCommand("first", "word-probe");
        if (!(await snapMove()).dead) await tryCommand("second", "word-probe");
        const h3 = await snapMove();
        if (h3.promptVisible && !h3.dead && h3.slots && h3.slots[93]) {
            await tryCommand("third", "word-probe");
        }
    }

    await browser.close();

    const scored = trials.filter((t) => t.promptVisible && t.moved && !t.parserReject);
    const correspondence = {};
    scored.forEach((t) => {
        if (!correspondence[t.cmd]) {
            correspondence[t.cmd] = {
                n: 0, unique91: 0, unique92: 0, unique93: 0, unique94: 0, unique95: 0,
                multi: 0, none: 0, ordinalAgreed: 0, rooms: []
            };
        }
        const c = correspondence[t.cmd];
        c.n++;
        if (t.uniqueMatch) c["unique" + t.uniqueMatch] = (c["unique" + t.uniqueMatch] || 0) + 1;
        else if (t.matchedDprop.length > 1) c.multi++;
        else c.none++;
        if (t.ordinalAgreed) c.ordinalAgreed++;
        if (c.rooms.length < 6) {
            c.rooms.push({
                from: t.from.loc, to: t.to.loc,
                populated: t.from.populated, unique: t.uniqueMatch
            });
        }
    });

    const out = {
        dump,
        trialCount: trials.length,
        scoredMoves: scored.length,
        correspondence,
        hypothesis: {
            structuralDestIsRoom: dump.tally && dump.tally.populated > 0
                && dump.tally.inRoomSet === dump.tally.populated
                && dump.tally.inRangeNotRoom === 0,
            destAlwaysIndiv: dump.tally && dump.tally.destIsIndiv === dump.tally.populated,
            reverseComplete: dump.tally && dump.tally.reverseOk === dump.tally.populated && dump.tally.reverseMiss === 0,
            sameParentAlways: dump.tally && dump.tally.sameParent === dump.tally.populated,
            sameParentRate: dump.tally && dump.tally.populated ? dump.tally.sameParent / dump.tally.populated : null,
            destParent0Rate: dump.tally && dump.tally.populated ? dump.tally.destParent0 / dump.tally.populated : null,
            parent24IsRoomParent: dump.roomsParent24 > 0 && dump.roomsParent24 >= dump.roomsParent0,
            gapRoomsFound: (dump.gapRooms || []).length,
            moveConfirmed: scored.length > 0,
            x1Is91: scored.filter((t) => t.cmd === "x1" && t.uniqueMatch === 91).length,
            x1Total: scored.filter((t) => t.cmd === "x1").length,
            x2Is92: scored.filter((t) => t.cmd === "x2" && t.uniqueMatch === 92).length,
            x2Total: scored.filter((t) => t.cmd === "x2").length,
            x3Is93: scored.filter((t) => t.cmd === "x3" && t.uniqueMatch === 93).length,
            x3Total: scored.filter((t) => t.cmd === "x3").length,
            x4Is94: scored.filter((t) => t.cmd === "x4" && t.uniqueMatch === 94).length,
            x4Total: scored.filter((t) => t.cmd === "x4").length,
            anyMismatch: scored.filter((t) => {
                if (!t.uniqueMatch) return t.matchedDprop.length !== 1;
                if (t.cmd === "x1") return t.uniqueMatch !== 91;
                if (t.cmd === "x2") return t.uniqueMatch !== 92;
                if (t.cmd === "x3") return t.uniqueMatch !== 93;
                if (t.cmd === "x4") return t.uniqueMatch !== 94;
                if (t.cmd === "x5") return t.uniqueMatch !== 95;
                if (t.cmd === "first") return t.uniqueMatch !== 91;
                if (t.cmd === "second") return t.uniqueMatch !== 92;
                if (t.cmd === "third") return t.uniqueMatch !== 93;
                return false;
            }).length,
            ordinalAlways: scored.length > 0 && scored.every((t) => !/^x\d+$/i.test(t.cmd) || t.ordinalAgreed)
        },
        trials: trials.map((t) => ({
            phase: t.phase,
            cmd: t.cmd,
            promptVisible: t.promptVisible,
            parserReject: t.parserReject,
            moved: t.moved,
            uniqueMatch: t.uniqueMatch,
            matchedDprop: t.matchedDprop,
            ordinalDprop: t.ordinalDprop,
            ordinalAgreed: t.ordinalAgreed,
            from: t.from,
            to: t.to,
            textDelta: t.textDelta
        }))
    };

    const outPath = path.join("tools", "screenshots", "matrix", "d35-dest-confirm.json");
    fs.mkdirSync(path.dirname(outPath), { recursive: true });
    fs.writeFileSync(outPath, JSON.stringify(out, null, 2));
    console.log(JSON.stringify({
        tally: dump.tally,
        parentTally: dump.parentTally,
        destParentTally: dump.destParentTally,
        mapRoomCount: dump.mapRoomCount,
        roomsWithPopulatedSlots: dump.roomsWithPopulatedSlots,
        roomsParent0: dump.roomsParent0,
        roomsParent24: dump.roomsParent24,
        patternCounts: dump.patternCounts,
        gapRooms: dump.gapRooms,
        occupantCount: dump.occupantCount,
        occupants: (dump.occupants || []).slice(0, 8),
        snap: dump.snap,
        dictHits: dump.dictHits,
        compassNumbered: dump.compassNumbered,
        graphSample: dump.graphSample,
        notRoomEx: dump.notRoomEx,
        trialCount: out.trialCount,
        scoredMoves: out.scoredMoves,
        correspondence: out.correspondence,
        hypothesis: out.hypothesis,
        trials: out.trials.map((t) => ({
            phase: t.phase, cmd: t.cmd,
            prompt: t.promptVisible, reject: t.parserReject, moved: t.moved,
            unique: t.uniqueMatch, matched: t.matchedDprop,
            ordinal: t.ordinalDprop, ordinalOk: t.ordinalAgreed,
            from: t.from.loc + ":" + t.from.name + " pop=" + (t.from.populated || []).join(",") + " snap=" + t.from.snapRoomId,
            to: t.to.loc + ":" + t.to.name + " snap=" + t.to.snapRoomId,
            delta: (t.textDelta || "").replace(/\s+/g, " ").slice(-160)
        }))
    }, null, 2));
})().catch((e) => { console.error(e && e.stack || e); process.exit(1); });
