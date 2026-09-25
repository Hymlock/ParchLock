/**
 * D22 post-movement coverage: prove the P2 RAM pipeline after leaving the
 * start room, not just at boot.
 *
 * Why a new file instead of extending harness/d22-ram-matrix.js:
 * the existing matrix is the start-room (and Anchorhead-Alley) catalog
 * scan and is already 7/7. Mixing post-move round-trip assertions into it
 * would either weaken its pass criteria or fail stories that cannot
 * parent(player)-walk. This fixture is the dedicated movement proof.
 *
 * Assigned D22-matrix stories (anchorhead / lostpig / advent):
 *   - Anchorhead: Outside the Real Estate Office --southeast--> Alley
 *     --northwest--> start. I7: parent(player) is "(con_topics)", so roomId
 *     is the location global (still RAM, not name-matching). Reverse is the
 *     look-ahead target back to room 105; northwest is the Inform reverse of
 *     southeast and is deterministic (no NPC/puzzle on that hop).
 *   - Advent: At End Of Road --west--> At Hill In Road --east--> start.
 *     I6 "(self object)" is the PC; parent(player) is the room. West/east
 *     are open outdoor roads, no cave/puzzle gate.
 *   - Lost Pig is intentionally omitted: every compass exit from Outside is
 *     a parser gate ("Grunk get in big trouble if Grunk go back with no pig"
 *     / "Forest look dark... Not want end up lost"). The only RAM parent
 *     change ("climb wall") parents Grunk onto scenery wall:95, not a room.
 *
 * Extra parent(player) round-trips (already proven, kept as regression):
 *   - Wishbringer: Hilltop --east--> Outside Cottage --west--> Hilltop
 *   - Zork1:       West of House --south--> South of House --west--> West of House
 *   - Curses:      Attic --east--> Servant's Room --west--> Attic
 *
 * lookAheadExits currently emits property-index labels ("exit-24"), not
 * Inform direction words, so the fixture issues known-safe parser commands
 * rather than typing those labels. Exit *resolution* (targetRoomId present)
 * is still asserted on whatever look-ahead returns.
 *
 * Post-move ActionSynth + inventory (D22 arbitrary-room):
 *   After the hop, assert RAM inventory (id-backed) and ActionSynth
 *   radials for parent(player) stories (advent room-radials; curses
 *   inventory+radials — Advent's west hop has empty hands) and one
 *   location-global story (anchorhead). Room-context objects must
 *   expose examine and not drop; inventory-context objects expose
 *   drop and not take. Other stories get the same check as regression.
 *
 * Usage: node harness/d22-post-move.js
 */
const { chromium } = require("playwright");
const { pathToFileURL } = require("node:url");
const path = require("node:path");
const fs = require("node:fs");

const ROOT = path.resolve(__dirname, "..");
process.chdir(ROOT);

function pickStory(re) {
    const files = fs.readdirSync("games");
    const hit = files.find((f) => re.test(f));
    if (!hit) throw new Error("catalog story not found: " + re);
    return "games/" + hit;
}

const STORIES = [
    {
        name: "anchorhead",
        re: /anchor/i,
        go: "southeast",
        back: "northwest",
        requireParent: false,
        assertSynth: true,
        why: "I7 z8 D22 fixture; Outside the Real Estate Office (105) --southeast--> Alley (107). parent(player) is (con_topics); roomId is the RAM location global, not a name scrape. northwest is the Inform reverse (look-ahead exit-13 -> 105). Location-global story for post-move ActionSynth+inventory."
    },
    {
        name: "advent",
        re: /^Advent\.z5\.js$/i,
        go: "west",
        back: "east",
        requireParent: true,
        assertSynth: true,
        why: "I6 z5 D22 fixture; At End Of Road --west--> At Hill In Road via parent('(self object)'). Open road, no cave/puzzle. east returns. parent(player) story for post-move ActionSynth+inventory."
    },
    {
        name: "wishbringer",
        re: /Wishbringer/i,
        go: "east",
        back: "west",
        requireParent: true,
        why: "Infocom z3; parent(player) is Hilltop then Outside Cottage; west is a deterministic reverse with no gate."
    },
    {
        name: "zork1",
        re: /Zork1/i,
        go: "south",
        back: "west",
        requireParent: true,
        why: "Infocom z3; West of House -> South of House via parent(player). Reverse is west (north from South of House is the house, not a return)."
    },
    {
        name: "curses",
        re: /curses\.z5/i,
        go: "east",
        back: "west",
        requireParent: true,
        assertSynth: true,
        why: "I6 z5; Attic -> Servant's Room via parent(player); west returns. No NPC/puzzle on that hop. parent(player) story with starting inventory (biscuit/torch/paper) so post-move drop/not-take is not vacuous the way Advent's empty-hands hop is."
    }
];

async function snap(page) {
    return page.evaluate(() => {
        try { if (window.ZvmCapture) ZvmCapture.tick(); } catch (e0) {}
        try { if (window.WorldModel) WorldModel.tick(); } catch (e1) {}
        const mem = (typeof ZRamProvider !== "undefined" && ZRamProvider.getMem) ? ZRamProvider.getMem() : null;
        const playerId = mem && ZRamReader.findPlayerId(mem);
        const pl = (mem && playerId) ? ZRamReader.objectLinks(mem, playerId) : null;
        const parentId = pl && pl.parent;
        const parentName = (mem && parentId) ? (ZRamReader.shortName(mem, parentId) || "") : "";
        const z = (typeof ZRamProvider !== "undefined") ? ZRamProvider.collect() : {};
        const wm = (typeof WorldModel !== "undefined") ? WorldModel.lastPayload : null;
        const discovered = (z.discoveredObjects || []).filter((o) => o && o.id != null && o.name);
        const containers = [];
        const leaked = [];
        discovered.forEach((o) => {
            const a = o.attrs || {};
            if (!a.container) return;
            const canSee = (typeof AttributeSchema !== "undefined" && AttributeSchema.canSeeInside)
                ? AttributeSchema.canSeeInside(a)
                : !!(a.open || a.transparent || a.supporter);
            containers.push({
                id: o.id,
                name: o.name,
                open: !!(a.open || a.isOpen),
                transparent: !!a.transparent,
                canSeeInside: !!canSee
            });
            if (mem && a.container && !canSee) {
                (ZRamReader.children(mem, o.id) || []).forEach((cid) => {
                    const kidName = ZRamReader.shortName(mem, cid);
                    const inScope = discovered.some((d) => d.id === cid);
                    if (inScope) leaked.push({ parentId: o.id, parent: o.name, id: cid, name: kidName });
                });
            }
        });
        const viaParent = !!(parentId && z.roomId && parentId === z.roomId && parentName && parentName.charAt(0) !== "(");
        const inventory = ((z.inventory && z.inventory.length ? z.inventory : (wm && wm.inventory)) || []).filter((o) => o && o.id != null && o.name);
        function synthVerbs(obj, ctx) {
            if (typeof ActionSynth === "undefined" || !ActionSynth.commandsForObject) return [];
            return (ActionSynth.commandsForObject(obj, ctx) || []).map((c) => c.verb);
        }
        return {
            zvm: !!(window.__PARCHLOCK_ZVM__),
            playerId,
            playerName: (mem && playerId) ? (ZRamReader.shortName(mem, playerId) || "") : "",
            parentId: parentId || 0,
            parentName,
            roomId: z.roomId || null,
            roomName: z.roomName || "",
            viaParent,
            wmRoomId: wm && wm.roomId,
            wmEngine: wm && wm.engineMode,
            probe: z.probe,
            scope: discovered.map((o) => ({ id: o.id, name: o.name })),
            scopeCount: discovered.length,
            idBacked: discovered.every((o) => o.id != null && o.name),
            inventory: inventory.map((o) => ({
                id: o.id,
                name: o.name,
                worn: !!(o.attrs && (o.attrs.worn || o.attrs.isWorn)),
                verbs: synthVerbs(o, "inventory")
            })),
            roomRadials: discovered.map((o) => ({
                id: o.id,
                name: o.name,
                verbs: synthVerbs(o, "room")
            })),
            exits: (z.exits || []).map((e) => ({
                label: e.label,
                targetRoomId: e.targetRoomId,
                targetRoomName: e.targetRoomName,
                locked: !!e.isLocked,
                hinted: !!e.hinted
            })),
            containers,
            leaked
        };
    });
}

async function command(page, text) {
    await page.evaluate((t) => { Input.Clear(); Input.Inject(t, true); }, text);
    await page.waitForTimeout(900);
}

async function boot(browser, story) {
    const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
    await page.goto(pathToFileURL(path.resolve("play.html")).href + "?story=" + story);
    await page.waitForTimeout(1400);
    await page.evaluate(() => { if (window.Message) Message.Hide(); });
    for (let i = 0; i < 16 && !(await page.locator(".Input.LineInput").count()); i++) {
        await page.keyboard.press("Space");
        await page.waitForTimeout(250);
    }
    if (!(await page.locator(".Input.LineInput").count())) {
        await page.close();
        throw new Error("no line input after boot");
    }
    return page;
}

function failRow(row, msg) {
    row.ok = false;
    row.err = msg;
    return row;
}

(async () => {
    const chrome = process.env.PW_CHROME || undefined;
    const browser = await chromium.launch({ executablePath: chrome, headless: true });
    const results = [];
    try {
        for (const spec of STORIES) {
            const row = { name: spec.name, why: spec.why, go: spec.go, back: spec.back, requireParent: !!spec.requireParent, ok: false, err: null };
            let page;
            try {
                row.story = pickStory(spec.re);
                page = await boot(browser, row.story);
                await command(page, "look");
                const start = await snap(page);
                await command(page, spec.go);
                const moved = await snap(page);
                await command(page, spec.back);
                const revisited = await snap(page);
                row.start = start;
                row.moved = moved;
                row.revisited = revisited;

                if (!start.zvm) throw new Error("ZVM not captured at start");
                if (!start.roomId) throw new Error("start roomId missing");
                if (!start.idBacked) throw new Error("start discoveredObjects missing ids");
                if (!(start.probe && start.probe.status === "z-ram-live")) {
                    throw new Error("start probe not z-ram-live: " + JSON.stringify(start.probe));
                }
                if (spec.requireParent) {
                    if (!start.viaParent) {
                        throw new Error("start roomId not via parent(player); parent=" + start.parentName + " room=" + start.roomName + " id=" + start.roomId);
                    }
                } else if (start.viaParent) {
                    row.parentNote = "parent(player) happened to match; still treated as location-global story";
                } else {
                    row.parentNote = "parent(player) is meta (" + start.parentName + "); roomId from RAM location global " + start.roomId;
                }

                if (!moved.roomId) throw new Error("post-move roomId missing");
                if (moved.roomId === start.roomId) throw new Error("move did not change roomId (still " + start.roomId + " " + start.roomName + ")");
                if (!moved.idBacked) throw new Error("post-move discoveredObjects missing ids");
                if (!(moved.probe && moved.probe.status === "z-ram-live")) {
                    throw new Error("post-move probe not z-ram-live: " + JSON.stringify(moved.probe));
                }
                if (spec.requireParent && !moved.viaParent) {
                    throw new Error("post-move roomId not via parent(player); parent=" + moved.parentName + " room=" + moved.roomName);
                }
                if (moved.wmRoomId !== moved.roomId) throw new Error("WorldModel.lastPayload.roomId " + moved.wmRoomId + " != z-ram " + moved.roomId);

                if (moved.leaked && moved.leaked.length) {
                    throw new Error("closed-container leak after move: " + JSON.stringify(moved.leaked));
                }
                if (start.leaked && start.leaked.length) {
                    throw new Error("closed-container leak at start: " + JSON.stringify(start.leaked));
                }
                row.closedContainer = {
                    startClosed: (start.containers || []).filter((c) => !c.canSeeInside).map((c) => c.name),
                    movedClosed: (moved.containers || []).filter((c) => !c.canSeeInside).map((c) => c.name),
                    leaked: (moved.leaked || []).length
                };

                const badExit = (moved.exits || []).find((e) => !e.targetRoomId && !e.hinted);
                if (badExit) throw new Error("look-ahead exit missing targetRoomId: " + JSON.stringify(badExit));

                if (spec.assertSynth) {
                    if (!Array.isArray(moved.inventory)) {
                        throw new Error("post-move inventory missing");
                    }
                    if (moved.inventory.some((o) => o.id == null || !o.name)) {
                        throw new Error("post-move inventory not id-backed");
                    }
                    moved.inventory.forEach((o) => {
                        // D31 positional verb suppression: a WORN item only offers
                        // examine/remove (never drop/wear directly); a held-not-worn
                        // item offers drop, never take, while it's already in hand.
                        if (o.worn) {
                            if ((o.verbs || []).indexOf("remove") < 0) {
                                throw new Error("worn inventory " + o.name + " ActionSynth missing remove");
                            }
                            if ((o.verbs || []).indexOf("drop") >= 0) {
                                throw new Error("worn inventory " + o.name + " ActionSynth still offers drop");
                            }
                        } else if ((o.verbs || []).indexOf("drop") < 0) {
                            throw new Error("inventory " + o.name + " ActionSynth missing drop");
                        }
                        if ((o.verbs || []).indexOf("take") >= 0) {
                            throw new Error("inventory " + o.name + " ActionSynth still offers take");
                        }
                    });
                    const roomWithExamine = (moved.roomRadials || []).filter((o) => (o.verbs || []).indexOf("examine") >= 0);
                    if (!roomWithExamine.length) {
                        throw new Error("post-move ActionSynth produced no examine radial for room objects (scope=" + moved.scopeCount + ")");
                    }
                    const roomDrop = (moved.roomRadials || []).find((o) => (o.verbs || []).indexOf("drop") >= 0);
                    if (roomDrop) {
                        throw new Error("room-context ActionSynth offered drop for " + roomDrop.name);
                    }
                    row.synth = {
                        inventory: moved.inventory.map((o) => o.name + ":" + (o.verbs || []).join(",")),
                        roomExamine: roomWithExamine.length,
                        roomSample: roomWithExamine.slice(0, 4).map((o) => o.name + ":" + (o.verbs || []).join(","))
                    };
                }

                if (spec.requireParent && !revisited.viaParent) {
                    throw new Error("revisit roomId not via parent(player)");
                }
                if (revisited.roomId !== start.roomId) {
                    throw new Error("revisit roomId " + revisited.roomId + " != start " + start.roomId);
                }
                if (revisited.wmRoomId !== start.roomId) {
                    throw new Error("revisit WorldModel.roomId " + revisited.wmRoomId + " != start " + start.roomId);
                }

                row.ok = true;
            } catch (e) {
                failRow(row, String(e && e.message || e));
            }
            if (page) await page.close().catch(() => {});
            results.push(row);
            console.log(
                (row.ok ? "PASS" : "FAIL"),
                row.name,
                row.ok
                    ? (row.start.roomName + " " + row.start.roomId + " --" + spec.go + "--> " + row.moved.roomName + " " + row.moved.roomId + " --" + spec.back + "--> " + row.revisited.roomId +
                        (row.synth ? (" synth examine=" + row.synth.roomExamine + " inv=" + row.synth.inventory.length) : ""))
                    : row.err
            );
        }
    } finally {
        await browser.close();
    }

    fs.mkdirSync(path.join("tools", "screenshots", "matrix"), { recursive: true });
    const outPath = path.join("tools", "screenshots", "matrix", "d22-post-move.json");
    fs.writeFileSync(outPath, JSON.stringify(results, null, 2));
    const failed = results.filter((r) => !r.ok);
    const summary = {
        total: results.length,
        passed: results.length - failed.length,
        failed: failed.map((f) => f.name + ": " + f.err),
        outPath
    };
    console.log(JSON.stringify(summary, null, 2));
    if (failed.length) process.exitCode = 1;
})().catch((e) => {
    console.error(e);
    process.exitCode = 1;
});
