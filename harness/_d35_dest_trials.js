/**
 * D35 destination-resolution research (read-only, not a gate, not a product change).
 *
 * Questions:
 *   1. Is indiv[dprop] (dprop from directionDoorDirs, e.g. 91-95) a real
 *      destination room object id? Structural checks: in-range 1..objectCount,
 *      same parent as other rooms (not a coincidental indiv value).
 *   2. What is the correspondence between printed "Exit N" / typed "N" and
 *      door_dir property numbers? Confirm with real successful moves.
 *
 * Does not implement pushExit-style destination-backed exits.
 */
const { chromium } = require("playwright");
const { pathToFileURL } = require("node:url");
const path = require("node:path");
const fs = require("node:fs");
const ROOT = path.resolve(__dirname, "..");
process.chdir(ROOT);

function memView() {
    return `
        (function () {
            try { if (window.ZvmCapture) ZvmCapture.tick(); } catch (e0) {}
            try { if (window.WorldModel) WorldModel.tick(); } catch (e1) {}
            var mem = (window.ZRamProvider && ZRamProvider.getMem && ZRamProvider.getMem()) || null;
            if (!mem) {
                var z = window.__PARCHLOCK_ZVM__;
                if (z) {
                    if (z.m && z.m.buffer) mem = new DataView(z.m.buffer, z.m.byteOffset || 0, z.m.byteLength || z.m.length);
                    else if (z.ram && z.ram.buffer) mem = new DataView(z.ram.buffer);
                    else mem = z.ram || z.m;
                }
            }
            return mem;
        })()
    `;
}

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

    async function bodyText() {
        return page.evaluate(() => (document.body.innerText || ""));
    }
    async function hasLine() {
        return (await page.locator(".Input.LineInput").count()) > 0;
    }
    async function inject(cmd) {
        if (!(await hasLine())) return false;
        await page.evaluate((t) => { Input.Clear(); Input.Inject(t, true); }, cmd);
        await page.waitForTimeout(1100);
        return true;
    }
    async function waitReady(max = 70) {
        for (let i = 0; i < max; i++) {
            const t = await bodyText();
            const has = await hasLine();
            if (/yes or no|restore a saved game/i.test(t) && has) {
                await inject("n");
                continue;
            }
            if (/Exit 1|jagged cave|polished chamber|watery dead-end|corkscrews|curves away/i.test(t) && has) {
                return t;
            }
            if (has && /What do you want to do/i.test(t) && i > 10) return t;
            await page.keyboard.press("Space");
            await page.waitForTimeout(180);
        }
        return bodyText();
    }

    await waitReady();
    await inject("look");
    await page.waitForTimeout(500);
    let text = await waitReady(20);

    const dump = await page.evaluate((memExpr) => {
        const mem = eval(memExpr);
        if (!mem) return { error: "no-mem" };
        const h = ZRamReader.header(mem);
        const count = ZRamReader.objectCount(mem, h);
        const snap = ZRamReader.snapshot(mem);
        const playerId = snap.playerId;
        const roomId = snap.roomId;
        const doorDirs = ZRamReader.directionDoorDirs(mem);
        const text = (document.body.innerText || "");
        const exitMentions = text.match(/Exit\s+\d+[^\n.]{0,80}/gi) || [];

        function objMeta(id) {
            if (!(id >= 1 && id <= count)) return { id, inRange: false };
            const links = ZRamReader.objectLinks(mem, id);
            const parent = links && links.parent;
            const indivPtr = ZRamReader.readProp(mem, id, 3);
            const indiv = ZRamReader.parseIndivTable(mem, indivPtr);
            return {
                id,
                inRange: true,
                name: ZRamReader.shortName(mem, id) || "",
                parent: parent || 0,
                parentName: parent ? (ZRamReader.shortName(mem, parent) || "") : "",
                childCount: ZRamReader.children(mem, id).length,
                isIndivTable: ZRamReader.isIndivTable(indiv),
                indivKeys: Object.keys(indiv).map(Number)
            };
        }

        const room = objMeta(roomId);
        const player = objMeta(playerId);
        const roomParent = room.parent;

        const compassHolder = (function () {
            const limit = Math.min(count, 96);
            let best = null;
            for (let id = 1; id <= limit; id++) {
                const kids = ZRamReader.children(mem, id);
                if (kids.length < 8) continue;
                let good = true;
                let kind0 = 0;
                const slots = [];
                const seen = {};
                for (let i = 0; i < kids.length; i++) {
                    const dd = ZRamReader.readProp(mem, kids[i], 21);
                    const kind = ZRamReader.readProp(mem, kids[i], 2);
                    if (!(dd >= 1 && dd <= 255) || !kind) { good = false; break; }
                    if (!kind0) kind0 = kind;
                    else if (kind !== kind0) { good = false; break; }
                    if (!seen[dd]) { seen[dd] = 1; slots.push(dd); }
                }
                if (good && slots.length >= 8 && (!best || slots.length > best.slots.length)) {
                    best = { id, name: ZRamReader.shortName(mem, id) || "", slots, kids };
                }
            }
            return best;
        })();

        const compassKids = (compassHolder ? compassHolder.kids : []).map((id) => {
            const dd = ZRamReader.readProp(mem, id, 21);
            return {
                id,
                name: ZRamReader.shortName(mem, id) || "",
                doorDir: dd
            };
        });

        function destRow(dprop, raw) {
            const inRange = raw >= 1 && raw <= count;
            const dest = inRange ? objMeta(raw) : { id: raw, inRange: false };
            return {
                dprop,
                raw,
                inRange,
                sameParentAsRoom: !!(inRange && dest.parent && dest.parent === roomParent),
                dest
            };
        }

        const currentIndivPtr = ZRamReader.readProp(mem, roomId, 3);
        const currentIndiv = ZRamReader.parseIndivTable(mem, currentIndivPtr);
        const currentDoorSlots = doorDirs.map((d) => destRow(d, currentIndiv[d] || 0));
        const currentAllIndiv = Object.keys(currentIndiv).map((k) => destRow(+k, currentIndiv[k]));

        // Scan every sibling of the current room (same parent) and every
        // object that itself has an I7 indiv table. Do not use name patterns
        // as a structural gate — parent-sharing is the check.
        const siblingRooms = [];
        const otherIndivTables = [];
        if (roomParent) {
            const sibs = ZRamReader.children(mem, roomParent);
            for (let i = 0; i < sibs.length; i++) {
                const sid = sibs[i];
                const indivPtr = ZRamReader.readProp(mem, sid, 3);
                const indiv = ZRamReader.parseIndivTable(mem, indivPtr);
                const slots = doorDirs.map((d) => destRow(d, indiv[d] || 0));
                siblingRooms.push({
                    id: sid,
                    name: ZRamReader.shortName(mem, sid) || "",
                    isIndivTable: ZRamReader.isIndivTable(indiv),
                    populatedDoorDirs: slots.filter((s) => s.raw).map((s) => s.dprop),
                    slots
                });
            }
        }
        for (let id = 1; id <= Math.min(count, 220); id++) {
            const indivPtr = ZRamReader.readProp(mem, id, 3);
            const indiv = ZRamReader.parseIndivTable(mem, indivPtr);
            if (!ZRamReader.isIndivTable(indiv)) continue;
            if (roomParent && ZRamReader.objectLinks(mem, id).parent === roomParent) continue;
            otherIndivTables.push({
                id,
                name: ZRamReader.shortName(mem, id) || "",
                parent: (ZRamReader.objectLinks(mem, id) || {}).parent || 0,
                parentName: (function () {
                    const p = (ZRamReader.objectLinks(mem, id) || {}).parent;
                    return p ? (ZRamReader.shortName(mem, p) || "") : "";
                })(),
                keys: Object.keys(indiv).map(Number),
                doorDirHits: doorDirs.map((d) => ({ dprop: d, raw: indiv[d] || 0 }))
            });
        }

        // Structural tallies across sibling rooms: how often is a populated
        // door_dir value (a) in-range, (b) a sibling of the same parent,
        // (c) something else (routine-looking, fish, etc.).
        const tally = {
            siblingCount: siblingRooms.length,
            populatedSlots: 0,
            inRange: 0,
            sameParent: 0,
            zero: 0,
            otherInRange: 0,
            examplesOther: []
        };
        siblingRooms.forEach((r) => {
            r.slots.forEach((s) => {
                if (!s.raw) { tally.zero++; return; }
                tally.populatedSlots++;
                if (s.inRange) tally.inRange++;
                if (s.sameParentAsRoom) tally.sameParent++;
                else if (s.inRange) {
                    tally.otherInRange++;
                    if (tally.examplesOther.length < 8) {
                        tally.examplesOther.push({
                            from: r.id,
                            fromName: r.name,
                            dprop: s.dprop,
                            dest: s.dest
                        });
                    }
                }
            });
        });

        return {
            objectCount: count,
            player,
            room,
            roomParent,
            roomParentName: room.parentName,
            doorDirs,
            compassHolder: compassHolder && { id: compassHolder.id, name: compassHolder.name, slotCount: compassHolder.slots.length },
            compassKids,
            currentDoorSlots,
            currentAllIndiv,
            exitMentions: exitMentions.slice(-8),
            payloadExits: (window.WorldModel && WorldModel.lastPayload && WorldModel.lastPayload.exits) || [],
            tally,
            siblingRooms,
            otherIndivTables: otherIndivTables.slice(0, 12),
            textTail: text.slice(-900)
        };
    }, memView());

    async function snapshotMove() {
        return page.evaluate((memExpr) => {
            const mem = eval(memExpr);
            if (!mem) return { error: "no-mem" };
            const snap = ZRamReader.snapshot(mem);
            const h = ZRamReader.header(mem);
            const count = ZRamReader.objectCount(mem, h);
            const indivPtr = ZRamReader.readProp(mem, snap.roomId, 3);
            const indiv = ZRamReader.parseIndivTable(mem, indivPtr);
            const doorDirs = ZRamReader.directionDoorDirs(mem);
            const links = ZRamReader.objectLinks(mem, snap.roomId);
            const text = document.body.innerText || "";
            const exitMentions = text.match(/Exit\s+\d+[^\n.]{0,80}/gi) || [];
            const slots = {};
            doorDirs.forEach((d) => {
                const raw = indiv[d] || 0;
                let destParent = 0;
                let destParentName = "";
                let destName = "";
                if (raw >= 1 && raw <= count) {
                    destName = ZRamReader.shortName(mem, raw) || "";
                    const dl = ZRamReader.objectLinks(mem, raw);
                    destParent = (dl && dl.parent) || 0;
                    destParentName = destParent ? (ZRamReader.shortName(mem, destParent) || "") : "";
                }
                slots[d] = {
                    raw,
                    inRange: raw >= 1 && raw <= count,
                    destName,
                    destParent,
                    destParentName,
                    sameParent: !!(links && destParent && destParent === links.parent)
                };
            });
            return {
                roomId: snap.roomId,
                roomName: snap.roomName,
                playerId: snap.playerId,
                parent: links && links.parent,
                parentName: links && links.parent ? (ZRamReader.shortName(mem, links.parent) || "") : "",
                slots,
                exitMentions: exitMentions.slice(-6),
                textTail: text.slice(-700)
            };
        }, memView());
    }

    const trials = [];
    const COMMANDS = ["1", "2", "3", "4", "5"];
    // If a bare number does not move, try these once from the first room.
    const FALLBACKS = ["go 1", "exit 1", "enter 1", "go exit 1"];

    async function tryCommand(cmd, before) {
        const textBefore = await bodyText();
        const okInject = await inject(cmd);
        // Extra wait + space in case of more-prompt after a successful move.
        for (let i = 0; i < 8; i++) {
            if (!(await hasLine())) {
                await page.keyboard.press("Space");
                await page.waitForTimeout(200);
            } else break;
        }
        await page.waitForTimeout(400);
        const after = await snapshotMove();
        const textAfter = await bodyText();
        const moved = !!(after && before && after.roomId && after.roomId !== before.roomId);
        const delta = textAfter.slice(Math.max(0, textBefore.length - 80));
        const match = {};
        if (before && before.slots) {
            Object.keys(before.slots).forEach((d) => {
                const raw = before.slots[d] && before.slots[d].raw;
                match["indiv" + d] = raw === after.roomId;
            });
        }
        const matchedDprop = Object.keys(match).filter((k) => match[k]).map((k) => +k.replace("indiv", ""));
        const printedExitsBefore = (before.exitMentions || []).slice();
        return {
            cmd,
            okInject,
            moved,
            beforeRoom: { id: before.roomId, name: before.roomName, parent: before.parent, parentName: before.parentName },
            afterRoom: { id: after.roomId, name: after.roomName, parent: after.parent, parentName: after.parentName },
            beforeSlots: before.slots,
            printedExitsBefore,
            printedExitsAfter: after.exitMentions,
            matchedDprop,
            match,
            promptVisible: /Exit\s+\d+/i.test((before.exitMentions || []).join(" ") + " " + (before.textTail || "")),
            textDelta: delta.slice(-500)
        };
    }

    // First-room trials for 1..5.
    let before = await snapshotMove();
    for (const cmd of COMMANDS) {
        const result = await tryCommand(cmd, before);
        trials.push(result);
        if (result.moved) {
            // Continue from the new room; also try remaining numbers there later.
            before = await snapshotMove();
        } else {
            // Stay put; next number from same room.
            before = await snapshotMove();
        }
    }

    const anyBareMove = trials.some((t) => t.moved);
    if (!anyBareMove) {
        before = await snapshotMove();
        for (const cmd of FALLBACKS) {
            const result = await tryCommand(cmd, before);
            trials.push(result);
            if (result.moved) {
                before = await snapshotMove();
                break;
            }
        }
    }

    // Chain further successful numbered moves from wherever we landed,
    // to get multiple rooms. Prefer a command that already worked.
    const working = trials.filter((t) => t.moved).map((t) => t.cmd);
    const chainCmds = working.length ? working : COMMANDS;
    for (let hop = 0; hop < 8; hop++) {
        before = await snapshotMove();
        let hopped = false;
        for (const cmd of chainCmds) {
            const result = await tryCommand(cmd, before);
            trials.push(Object.assign({ hop: hop + 1 }, result));
            if (result.moved) {
                hopped = true;
                break;
            }
        }
        if (!hopped) break;
    }

    await browser.close();

    const moves = trials.filter((t) => t.moved);
    const correspondence = {};
    moves.forEach((t) => {
        const key = t.cmd;
        if (!correspondence[key]) correspondence[key] = [];
        correspondence[key].push({
            from: t.beforeRoom,
            to: t.afterRoom,
            matchedDprop: t.matchedDprop,
            populatedBefore: Object.keys(t.beforeSlots || {}).filter((d) => t.beforeSlots[d] && t.beforeSlots[d].raw)
        });
    });

    const out = {
        dump: {
            objectCount: dump.objectCount,
            player: dump.player,
            room: dump.room,
            doorDirs: dump.doorDirs,
            compassHolder: dump.compassHolder,
            compassKids: dump.compassKids,
            currentDoorSlots: dump.currentDoorSlots,
            currentAllIndiv: dump.currentAllIndiv,
            exitMentions: dump.exitMentions,
            payloadExits: dump.payloadExits,
            tally: dump.tally,
            siblingSample: (dump.siblingRooms || []).slice(0, 8),
            siblingCount: (dump.siblingRooms || []).length,
            otherIndivTables: dump.otherIndivTables,
            textTail: dump.textTail
        },
        trialCount: trials.length,
        successfulMoves: moves.length,
        correspondence,
        trials,
        hypothesis: {
            indivDoorDirLooksLikeRoomId:
                dump.tally && dump.tally.populatedSlots > 0 &&
                dump.tally.sameParent === dump.tally.populatedSlots,
            sameParentRate: dump.tally && dump.tally.populatedSlots
                ? dump.tally.sameParent / dump.tally.populatedSlots
                : null,
            moveConfirmed: moves.length > 0,
            moveMatchedIndiv: moves.filter((t) => t.matchedDprop && t.matchedDprop.length).length
        }
    };

    const outPath = path.join("tools", "screenshots", "matrix", "d35-dest-trials.json");
    fs.mkdirSync(path.dirname(outPath), { recursive: true });
    fs.writeFileSync(outPath, JSON.stringify(out, null, 2));
    // Keep siblingRooms out of the console dump (large); file has a sample.
    console.log(JSON.stringify({
        tally: dump.tally,
        startRoom: dump.room,
        doorDirs: dump.doorDirs,
        currentDoorSlots: dump.currentDoorSlots,
        compassKids: dump.compassKids,
        exitMentions: dump.exitMentions,
        trialCount: trials.length,
        successfulMoves: moves.length,
        correspondence,
        hypothesis: out.hypothesis,
        trials: trials.map((t) => ({
            hop: t.hop || 0,
            cmd: t.cmd,
            moved: t.moved,
            promptVisible: t.promptVisible,
            from: t.beforeRoom,
            to: t.afterRoom,
            matchedDprop: t.matchedDprop,
            printedExitsBefore: t.printedExitsBefore
        }))
    }, null, 2));
})().catch((e) => { console.error(e && e.stack || e); process.exit(1); });
