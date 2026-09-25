/**
 * D35 destination-resolution STRICT research (read-only, not a gate).
 *
 * Location source: the in-world PC whose parent is a map-room
 * (I7 indiv table carrying numbered door_dir keys). Not snap.roomId
 * (this game's "(self object)" parent is 0; location global g1 is stale).
 *
 * A trial counts only when:
 *   - Exit-N prompt was visible before the command
 *   - parser did not reject
 *   - PC parent actually changed
 * Then we ask: does afterLoc equal exactly one before-slot indiv[dprop]?
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
    async function waitLine(max = 16) {
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
            return numbered.some((d) => Object.prototype.hasOwnProperty.call(t, String(d)) || t[d] != null);
        }

        const mapRooms = [];
        for (let id = 1; id <= count; id++) {
            if (!isMapRoom(id)) continue;
            const links = ZRamReader.objectLinks(mem, id);
            mapRooms.push({
                id,
                name: ZRamReader.shortName(mem, id) || "",
                parent: (links && links.parent) || 0,
                parentName: (links && links.parent) ? (ZRamReader.shortName(mem, links.parent) || "") : "",
                childCount: ZRamReader.children(mem, id).length
            });
        }
        const roomSet = {};
        mapRooms.forEach((r) => { roomSet[r.id] = r; });

        const parentTally = {};
        mapRooms.forEach((r) => {
            const key = r.parent + ":" + r.parentName;
            parentTally[key] = (parentTally[key] || 0) + 1;
        });

        let populated = 0, inRoomSet = 0, inRange = 0, inRangeNotRoom = 0;
        let destIsIndiv = 0, reverseOk = 0, reverseMiss = 0, sameParent = 0;
        const notRoomEx = [];
        const reverseMissEx = [];
        const graphSample = [];
        const patternCounts = {};
        const gapRooms = [];

        mapRooms.forEach((r) => {
            const t = indivOf(r.id);
            const pattern = numbered.map((d) => (t[d] ? "1" : "0")).join("");
            patternCounts[pattern] = (patternCounts[pattern] || 0) + 1;
            const populatedProps = numbered.filter((d) => t[d]);
            if (populatedProps.length && populatedProps[0] !== numbered[0]) {
                if (gapRooms.length < 12) {
                    gapRooms.push({
                        id: r.id,
                        name: r.name,
                        pattern,
                        populatedProps,
                        slots: populatedProps.map((d) => ({ dprop: d, raw: t[d] }))
                    });
                }
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
                    if (dest.parent && r.parent && dest.parent === r.parent) sameParent++;
                    if (ZRamReader.isIndivTable(indivOf(raw))) destIsIndiv++;
                    const bt = indivOf(raw);
                    const back = numbered.filter((dd) => bt[dd] === r.id);
                    if (back.length) reverseOk++;
                    else {
                        reverseMiss++;
                        if (reverseMissEx.length < 6) reverseMissEx.push({ from: r.id, dprop: d, to: raw });
                    }
                    if (graphSample.length < 8) {
                        graphSample.push({
                            from: r.id, fromName: r.name, dprop: d, to: raw,
                            toName: dest.name, reverse: back, destParent: dest.parent
                        });
                    }
                } else {
                    inRangeNotRoom++;
                    if (notRoomEx.length < 8) {
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

        const occupants = [];
        for (let id = 1; id <= count; id++) {
            const o = ZRamReader.objectLinks(mem, id);
            if (!o || !o.parent || !roomSet[o.parent]) continue;
            occupants.push({
                id,
                name: ZRamReader.shortName(mem, id) || "",
                parent: o.parent,
                parentName: roomSet[o.parent].name,
                kids: ZRamReader.children(mem, id).length
            });
        }

        const compassKids = [];
        const holderLimit = Math.min(count, 96);
        let compassHolder = null;
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
                    const dd = ZRamReader.readProp(mem, kid, 21);
                    compassKids.push({
                        id: kid,
                        name: ZRamReader.shortName(mem, kid) || "",
                        doorDir: dd
                    });
                });
            }
        }

        const dict = ZRamReader.parseDictionary(mem);
        const dictHits = {};
        ["1", "2", "3", "x1", "x2", "x3", "x4", "x5", "x", "first", "second", "third", "exit", "go"].forEach((w) => {
            dictHits[w] = !!(dict.words && dict.words[w]);
        });

        const buf = $("#windowport .BufferWindow").text() || "";
        return {
            objectCount: count,
            snap: { roomId: snap.roomId, roomName: snap.roomName, playerId: snap.playerId },
            doorDirs,
            numbered,
            mapRoomCount: mapRooms.length,
            parentTally,
            occupants,
            tally: {
                populated, inRange, inRoomSet, inRangeNotRoom,
                destIsIndiv, reverseOk, reverseMiss, sameParent
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
            bufferTail: buf.slice(-700)
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
                if (!doorDirs.some((d) => Object.prototype.hasOwnProperty.call(t, String(d)) || t[d] != null)) continue;
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
            // Prefer the occupant that is not scenery-like: has children (inventory)
            // and whose name is not a typical room-contents noun. Research locator
            // only — dest validation never uses this name.
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
                occupants: inRoom.slice(0, 12),
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
        const ordinalHit = (moved && /^\s*x(\d+)\s*$/i.test(cmd))
            ? ordinal[+RegExp.$1 - 1] || null
            : null;
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
            from: { loc: before.loc, name: before.locName, populated: before.populated, slots: before.slots, printed: before.printedRoomNums, exits: before.exitMentions, pc: before.pc },
            to: { loc: after.loc, name: after.locName, populated: after.populated, printed: after.printedRoomNums, pc: after.pc, dead: after.dead },
            textDelta: delta.slice(-360)
        };
        trials.push(row);
        return row;
    }

    // Parser reject check from the start room (does not need to move).
    await tryCommand("1", "parser-probe");
    await tryCommand("go 1", "parser-probe");

    // Strict numbered-exit trials. Stay put on failure so we still try x2/x3
    // from the same room; hop onward on success.
    const numberedCmds = ["x1", "x2", "x3", "x4", "x5"];
    for (const cmd of numberedCmds) {
        const r = await tryCommand(cmd, "start-room");
        if (r.to && r.to.dead) break;
        if (r.moved) {
            for (let hop = 0; hop < 4; hop++) {
                const r2 = await tryCommand(cmd, "chain-" + cmd);
                if (!r2.moved || (r2.to && r2.to.dead)) break;
            }
        }
    }

    // Mix remaining working commands from wherever we landed.
    const worked = Array.from(new Set(trials.filter((t) => t.moved).map((t) => t.cmd)));
    for (let hop = 0; hop < 10; hop++) {
        if (!worked.length) break;
        const here = await snapMove();
        if (here.dead) break;
        const cmd = worked[hop % worked.length];
        const r = await tryCommand(cmd, "mix");
        if (r.to && r.to.dead) break;
    }

    // Also try first/second once if we still have a prompt.
    const here = await snapMove();
    if (here.promptVisible && !here.dead) {
        await tryCommand("first", "word-probe");
        await tryCommand("second", "word-probe");
    }

    await browser.close();

    const scored = trials.filter((t) => t.promptVisible && t.moved && !t.parserReject);
    const correspondence = {};
    scored.forEach((t) => {
        if (!correspondence[t.cmd]) {
            correspondence[t.cmd] = { n: 0, unique91: 0, unique92: 0, unique93: 0, unique94: 0, unique95: 0, multi: 0, none: 0, ordinalAgreed: 0 };
        }
        const c = correspondence[t.cmd];
        c.n++;
        if (t.uniqueMatch) c["unique" + t.uniqueMatch] = (c["unique" + t.uniqueMatch] || 0) + 1;
        else if (t.matchedDprop.length > 1) c.multi++;
        else c.none++;
        if (t.ordinalAgreed) c.ordinalAgreed++;
    });

    const out = {
        dump,
        trialCount: trials.length,
        scoredMoves: scored.length,
        correspondence,
        hypothesis: {
            structuralDestIsRoom: dump.tally && dump.tally.populated > 0 && dump.tally.inRoomSet === dump.tally.populated && dump.tally.inRangeNotRoom === 0,
            destAlwaysIndiv: dump.tally && dump.tally.destIsIndiv === dump.tally.populated,
            reverseComplete: dump.tally && dump.tally.reverseOk === dump.tally.populated && dump.tally.reverseMiss === 0,
            sameParentAlways: dump.tally && dump.tally.sameParent === dump.tally.populated,
            sameParentRate: dump.tally && dump.tally.populated ? dump.tally.sameParent / dump.tally.populated : null,
            gapRoomsFound: (dump.gapRooms || []).length,
            moveConfirmed: scored.length > 0,
            x1Is91: scored.filter((t) => t.cmd === "x1" && t.uniqueMatch === 91).length,
            x1Total: scored.filter((t) => t.cmd === "x1").length,
            x2Is92: scored.filter((t) => t.cmd === "x2" && t.uniqueMatch === 92).length,
            x2Total: scored.filter((t) => t.cmd === "x2").length,
            x3Is93: scored.filter((t) => t.cmd === "x3" && t.uniqueMatch === 93).length,
            x3Total: scored.filter((t) => t.cmd === "x3").length,
            anyMismatch: scored.filter((t) => t.uniqueMatch && t.cmd === "x1" && t.uniqueMatch !== 91
                || t.cmd === "x2" && t.uniqueMatch !== 92
                || t.cmd === "x3" && t.uniqueMatch !== 93).length,
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

    const outPath = path.join("tools", "screenshots", "matrix", "d35-dest-strict.json");
    fs.mkdirSync(path.dirname(outPath), { recursive: true });
    fs.writeFileSync(outPath, JSON.stringify(out, null, 2));
    console.log(JSON.stringify({
        tally: dump.tally,
        parentTally: dump.parentTally,
        mapRoomCount: dump.mapRoomCount,
        patternCounts: dump.patternCounts,
        gapRooms: dump.gapRooms,
        occupants: dump.occupants,
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
            from: t.from.loc + ":" + t.from.name + " pop=" + (t.from.populated || []).join(","),
            to: t.to.loc + ":" + t.to.name,
            delta: (t.textDelta || "").replace(/\s+/g, " ").slice(-160)
        }))
    }, null, 2));
})().catch((e) => { console.error(e && e.stack || e); process.exit(1); });
