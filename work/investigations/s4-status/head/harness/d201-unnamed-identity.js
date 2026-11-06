/**
 * D201 live gate: unnamed early-Inform identity, status translation and held
 * items. Runs real story files on desktop/mobile Chromium.
 * Usage: node harness/d201-unnamed-identity.js
 */
const { chromium } = require("playwright");
const { pathToFileURL } = require("url");
const path = require("path");

const root = path.resolve(__dirname, "..");
const play = pathToFileURL(path.join(root, "play.html")).href;
let pass = 0, fail = 0;
function check(ok, message, detail) {
    if (ok) { pass++; console.log("PASS: " + message); }
    else { fail++; console.error("FAIL: " + message + (detail ? " -- " + detail : "")); }
}

async function boot(browser, story, mobile) {
    const context = await browser.newContext(mobile ? {
        viewport: { width: 412, height: 860 }, isMobile: true, hasTouch: true
    } : { viewport: { width: 1200, height: 850 } });
    const page = await context.newPage(), errors = [];
    page.on("pageerror", error => errors.push(String(error && error.message || error)));
    await page.addInitScript(() => {
        localStorage.setItem("PL_MobileTutorialSeen", "1");
        localStorage.setItem("PL_TutorialSeen", "1");
    });
    await page.goto(play + "?story=games/" + encodeURIComponent(story) + "&t=" + Date.now(), {
        waitUntil: "domcontentloaded"
    });
    await page.waitForTimeout(350);
    await page.evaluate(() => {
        const start = document.querySelector(".parchlock-splash__start");
        if (start) start.click();
    });
    // Let ordinary line-prompt stories settle before offering Space to a
    // genuine startup char prompt. Pressing Space continuously can itself
    // advance a story after its prompt appears and makes desktop timing flaky.
    await page.waitForTimeout(1800);
    for (let i = 0; i < 20; i++) {
        const ready = await page.evaluate(() => {
            const text = document.body.innerText || "";
            return !!document.querySelector(".Input.LineInput") || />\s*$/.test(text.trim());
        });
        if (ready) break;
        await page.keyboard.press("Space").catch(() => {});
        await page.waitForTimeout(200);
    }
    const restoreQuestion = await page.evaluate(() => /restore a saved game/i.test(document.body.innerText || ""));
    if (restoreQuestion && await page.locator(".Input.LineInput").count()) {
        await page.evaluate(() => { try { Message.Hide(); } catch (e) {} Input.Clear(); Input.Inject("no", true); });
        await page.waitForTimeout(1800);
    }
    // Wumpus and a few other stories follow an initial line question with a
    // VM-owned "press any key" screen. Advance only that explicit char prompt.
    for (let i = 0; i < 12; i++) {
        const mode = await page.evaluate(() => ({
            char: !!document.querySelector(".Input.CharInput"),
            line: !!document.querySelector(".Input.LineInput"),
            text: (document.body.innerText || "").slice(-600)
        }));
        if (!mode.char || mode.line) break;
        await page.keyboard.press("Space").catch(() => {});
        await page.waitForTimeout(250);
    }
    // Object initialization can trail the first DOM prompt on slower desktop
    // runs. Wait for real RAM evidence instead of treating prompt timing as
    // engine readiness.
    for (let i = 0; i < 30; i++) {
        const ready = await page.evaluate(() => {
            try {
                if (window.ZvmCapture) ZvmCapture.tick();
                const mem = ZRamProvider.getMem();
                return !!(mem && ZRamReader.header(mem) && ZRamReader.resolvePlayer(mem).id);
            } catch (e) { return false; }
        });
        if (ready) break;
        await page.waitForTimeout(200);
    }
    await page.evaluate(() => {
        try { Message.Hide(); } catch (e) {}
        try { if (window.ZvmCapture) ZvmCapture.tick(); } catch (e) {}
        try { if (window.WorldModel) WorldModel.tick(); } catch (e) {}
        try { if (window.TranslatorUI) TranslatorUI.tick(); } catch (e) {}
        try { if (window.Actionable) Actionable.Refresh(); } catch (e) {}
    });
    await page.waitForTimeout(450);
    return { context, page, errors };
}

async function state(page) {
    return page.evaluate(() => {
        const mem = ZRamProvider.getMem();
        const resolved = ZRamReader.resolvePlayer(mem);
        const snap = ZRamReader.snapshot(mem);
        const provider = ZRamProvider.collect();
        const world = WorldModel.lastPayload || WorldModel.tick();
        const stats = StatTracker.model();
        const index = ZRamReader.compiledRoomIndex(mem);
        const printed = ZRamReader.printedRoomNumber();
        return {
            resolved, snap, provider,
            world: {
                playerId: world.playerId, roomId: world.roomId, roomName: world.roomName,
                inventory: world.inventory, objects: world.discoveredObjects,
                metrics: world.hudMetrics
            },
            stats: stats.stats,
            indexedRoom: printed != null && index && index.table ? index.table[printed] : null,
            indexCount: index && index.count || 0,
            mapRoom: window.ParchLockMap && ParchLockMap.CurrentRoom,
            mapHasId: !!(window.ParchLockMap && (ParchLockMap.Rooms || []).some(room =>
                room && room.HasRealId && String(room.ObjectId) === String(world.roomId))),
            marks: Array.from(document.querySelectorAll(".pl-act:not(.is-stale)")).map(el => ({
                noun: el.dataset.noun || "", text: el.textContent || ""
            })),
            line: !!document.querySelector(".Input.LineInput")
        };
    });
}

async function submit(page, command) {
    const accepted = await page.evaluate(cmd => {
        try { Message.Hide(); } catch (e) {}
        Input.Clear();
        return Input.Inject(cmd, true);
    }, command);
    await page.waitForTimeout(800);
    return accepted;
}

(async () => {
    const browser = await chromium.launch({ executablePath: process.env.PW_CHROME, headless: true });
    let takeCase = null;
    const llrRooms = [];

    async function captureTakeCase(live) {
        // Publish the current observed reply before asking the UI resolver
        // whether this raw candidate actually has a Take command.
        await live.page.evaluate(() => { Actionable.Refresh(); });
        const candidate = await live.page.evaluate(() => {
            const mem = ZRamProvider.getMem(), z = ZRamProvider.collect();
            const item = (z.unnamedCandidates || []).find(item => {
                const attrs = ZRamReader.attrsFromObject(mem, item.id) || {};
                const admitted = Actionable.payloadPool().find(o => String(o.id) === String(item.id));
                const ref = admitted && Actionable.referenceFor(admitted);
                const marked = Actionable.LiveMarks.some(m => {
                    let ids = []; try { ids = JSON.parse(m.dataset.candidateIds || '[]'); } catch(e) {}
                    return !m.classList.contains('is-stale') && (String(m.dataset.objectId) === String(item.id) || ids.some(id => String(id) === String(item.id)));
                });
                // Derived takeable also describes NPCs. This scenario tests
                // loose generated items, never taking an unconfirmed actor.
                return attrs.takeable && !attrs.animate && item.aliases && item.aliases.length && ref && ref.unique && marked
                    && Actionable.resolveObjectCommands(item.id, "room").some(action => /^take\s/i.test(action.command));
            });
            if (!item) return null;
            return Object.assign({}, item, { commandNoun: Actionable.referenceFor(Actionable.payloadPool().find(o => String(o.id) === String(item.id))).noun });
        });
        if (!candidate) return null;
        const noun = candidate.commandNoun;
        await live.page.evaluate(() => { try { Actionable.Refresh(); } catch (e) {} });
        await live.page.waitForTimeout(300);
        const candidateState = await state(live.page);
        const marked = candidateState.marks.some(mark => candidate.aliases.some(alias =>
            mark.noun.toLowerCase() === String(alias).toLowerCase()
            || mark.text.toLowerCase().indexOf(String(alias).toLowerCase()) >= 0));
        const radialCommands = await live.page.evaluate(id =>
            Actionable.resolveObjectCommands(id, "room").map(action => action.command), candidate.id);
        await submit(live.page, "take " + noun);
        const held = await state(live.page);
        const item = held.world.inventory.find(entry => entry.id === candidate.id);
        await submit(live.page, "drop " + noun);
        const dropped = await state(live.page);
        return { candidate, noun, marked, radialCommands, item,
            dropped: !dropped.world.inventory.some(entry => entry.id === candidate.id) };
    }

    for (let run = 0; run < 5; run++) {
        const live = await boot(browser, "LLR3.z8.js", run % 2 === 0);
        const before = await state(live.page);
        llrRooms.push(before.world.roomId);
        check(!live.errors.length, `LLR run ${run + 1} has no page error`, live.errors.join(" | "));
        check(before.resolved.id === 96 && before.resolved.source === "parser-self" && !before.resolved.ambiguous,
            `LLR run ${run + 1} resolves unique real player 96`, JSON.stringify(before.resolved));
        check(!!before.world.roomId && !!before.world.roomName && before.snap.roomSource === "player-containment",
            `LLR run ${run + 1} maps the unnamed containing room`, JSON.stringify(before.world));
        check(before.world.playerId === 96 && before.mapHasId,
            `LLR run ${run + 1} shares player and room identity with map consumers`);
        check(before.world.metrics.some(m => m.key === "level") && before.world.metrics.some(m => m.key === "strength"),
            `LLR run ${run + 1} emits Level and Strength metrics`);
        check(before.stats.level && before.stats.level.confirmed && before.stats.strength && before.stats.strength.confirmed,
            `LLR run ${run + 1} confirms Level and Strength in StatTracker`);

        await submit(live.page, "look");
        const afterLook = await state(live.page);
        check(afterLook.world.roomId === before.world.roomId,
            `LLR run ${run + 1} keeps the same ObjectId on LOOK`);

        if (!takeCase) {
            takeCase = await captureTakeCase(live);
        }
        await live.context.close();
    }
    // The map is randomized and some valid starts contain no generated loose
    // item. Preserve the five required identity starts above, then use bounded
    // additional boots only to acquire the item/action fixture.
    for (let retry = 0; retry < 7 && !takeCase; retry++) {
        const live = await boot(browser, "LLR3.z8.js", retry % 2 === 0);
        takeCase = await captureTakeCase(live);
        await live.context.close();
    }
    check(llrRooms.every(Boolean), "five randomized LLR starts all produce structural room IDs", JSON.stringify(llrRooms));
    check(!!takeCase, "at least one randomized LLR start exposes a takeable generated object");
    if (takeCase) {
        check(takeCase.marked, "LLR generated object is underlined through D184 parser vocabulary", JSON.stringify(takeCase));
        check(takeCase.radialCommands.some(command => /^take\s+/i.test(command)
            && command.toLowerCase() === "take " + takeCase.noun.toLowerCase()),
            "LLR generated object radial includes declaration-proven TAKE", JSON.stringify(takeCase));
        check(takeCase.item && ["parser-vocabulary", "story-short-name"].includes(takeCase.item.labelProvenance) /* S9: 8ea2f663 story short_name wins when its words are the object's own */
            && takeCase.noun.split(/\s+/).every(word => takeCase.item.aliases.some(alias => String(alias).toLowerCase() === word.toLowerCase())),
            "taken LLR object enters inventory with its real ID, aliases and parser label", JSON.stringify(takeCase));
        check(takeCase.dropped, "dropping the generated LLR object removes it from inventory");
    }


    // D201 map follow-up: travel must create pathable Exits[] on the
    // departure room (state-delta), and look-ahead with blank compiled
    // destination names must still populate radial/ExitMeta. Named
    // compilers are unchanged; this is the unnamed-family stress case.
    // LLR randomizes topology, so a single boot may offer look-ahead
    // directions that the story then refuses; retry a few starts rather
    // than treating an unlucky seed as a product regression.
    {
        let travelCase = null;
        let exitSample = null;
        let radialSample = null;
        for (let attempt = 0; attempt < 4 && !travelCase; attempt++) {
            const live = await boot(browser, "LLR3.z8.js", attempt % 2 === 1);
            let before = await state(live.page);
            const exits = await live.page.evaluate(() => {
                const w = WorldModel.lastPayload || {};
                return (w.exits || []).map(e => ({
                    label: e.label, command: e.command || e.label, toId: e.targetRoomId, prop: e.prop
                }));
            });
            const radial = await live.page.evaluate(() =>
                ParchLockQol.GetRadialCommands().filter(c => c.source === "ram-exit").map(c => c.Command));
            if (!exitSample) exitSample = exits;
            if (!radialSample) radialSample = radial;
            const cmds = [];
            const seen = {};
            exits.forEach(e => {
                const cmd = String(e.command || e.label || "").toLowerCase();
                if (!cmd || seen[cmd] || /^exit-/.test(cmd)) return;
                seen[cmd] = 1;
                cmds.push(cmd);
            });
            for (const cmd of cmds) {
                const fromId = before.world.roomId;
                await submit(live.page, cmd);
                const after = await state(live.page);
                if (String(after.world.roomId) !== String(fromId)) {
                    const graph = await live.page.evaluate((fromId) => {
                        const rooms = (ParchLockMap.Rooms || []).filter(r => r && r.HasRealId);
                        const prev = rooms.find(r => String(r.ObjectId) === String(fromId));
                        return {
                            roomCount: rooms.length,
                            prevExits: prev ? Object.keys(prev.Exits || {}) : [],
                            names: rooms.map(r => r.Name)
                        };
                    }, fromId);
                    travelCase = { cmd, fromId, toId: after.world.roomId, graph, cmds };
                    break;
                }
                before = after;
            }
            await live.context.close();
        }
        check((exitSample || []).length > 0, "LLR look-ahead emits exits for radial/map consumers", JSON.stringify(exitSample));
        check(!(exitSample || []).some(e => String(e.label || "").toLowerCase() === "up" && e.prop >= 12 && e.prop <= 15),
            "LLR look-ahead does not label a cardinal slot as UP", JSON.stringify(exitSample));
        check((radialSample || []).length > 0, "LLR radial offers RAM look-ahead exits", JSON.stringify(radialSample));
        check(!!travelCase, "LLR can travel through a look-ahead exit", JSON.stringify(travelCase && travelCase.cmds || exitSample));
        if (travelCase) {
            check(travelCase.graph.roomCount >= 2, "LLR travel admits both rooms on the map", JSON.stringify(travelCase.graph));
            check(travelCase.graph.prevExits.length > 0,
                "LLR travel writes a pathable map edge on the departure room", JSON.stringify(travelCase.graph));
        }
    }

    for (const story of ["RoTA.zblorb.js", "Bronze.zblorb.js", "Accuse.zblorb.js"]) {
        const live = await boot(browser, story, false);
        let got = await state(live.page);
        if (!got.world.roomId) {
            await submit(live.page, "look");
            got = await state(live.page);
        }
        check(!live.errors.length, `${story} has no page error`, live.errors.join(" | "));
        check(got.resolved.id > 0 && got.resolved.source === "parser-self" && !got.resolved.ambiguous,
            `${story} resolves its compiler-owned parser-self`, JSON.stringify(got.resolved));
        check(!!got.world.roomId && !!got.world.roomName,
            `${story} retains a mapped player-facing room`, JSON.stringify(got.world));
        await live.context.close();
    }

    const anchor = await boot(browser, "anchor.z8.js", false);
    const anchorState = await state(anchor.page);
    check(!anchor.errors.length && anchorState.world.roomId && anchorState.world.roomName,
        "Anchorhead named-room control remains structural", JSON.stringify(anchorState.world));
    const anchorExits = await anchor.page.evaluate(() => {
        const mem = ZRamProvider.getMem();
        const room = (WorldModel.lastPayload && WorldModel.lastPayload.roomId) || 0;
        return (ZRamReader.lookAheadExits(mem, room) || []).map(e => ({
            label: e.label, name: e.targetRoomName || ""
        }));
    });
    check(anchorExits.some(e => e.label === "east") && anchorExits.some(e => e.label === "west")
        && anchorExits.some(e => e.label === "in"),
        "Anchorhead keeps east/west/in", JSON.stringify(anchorExits));
    check(anchorExits.some(e => e.label === "southeast" && /alley/i.test(e.name)),
        "Anchorhead still asserts Alley as southeast", JSON.stringify(anchorExits));
    await anchor.context.close();

    const wumpus = await boot(browser, "wump2ka.z5.js", true);
    const wumpusState = await state(wumpus.page);
    check(!wumpus.errors.length, "Wumpus control has no page error", wumpus.errors.join(" | "));
    check(wumpusState.indexCount > 0 && wumpusState.world.roomId
        && wumpusState.world.roomId === wumpusState.indexedRoom,
        "Wumpus keeps its compiled indexed-room identity", JSON.stringify(wumpusState));
    check(!!wumpusState.world.roomName && !/^c_rooms/i.test(wumpusState.world.roomName),
        "Wumpus keeps its status-grid room descriptor", wumpusState.world.roomName);
    const wumpDirs = await wumpus.page.evaluate(() => {
        try { if (window.ZvmCapture) ZvmCapture.tick(); } catch (e) {}
        try { if (window.WorldModel) WorldModel.tick(); } catch (e) {}
        try { if (window.Actionable) Actionable.Refresh(); } catch (e) {}
        const mem = ZRamProvider.getMem();
        const room = (WorldModel.lastPayload && WorldModel.lastPayload.roomId) || 0;
        const exits = (ZRamReader.lookAheadExits(mem, room) || []).map(e => ({
            label: e.label, command: e.command, prop: e.prop, dest: e.targetRoomId
        }));
        const door = ZRamReader.directionDoorDirs(mem);
        const text = (document.querySelector(".BufferWindow") || document.body).innerText || "";
        const marks = Array.from(document.querySelectorAll(".pl-act:not(.is-stale)")).map(el =>
            (el.textContent || "").replace(/\s+/g, " ").trim().toLowerCase());
        return {
            room, exits, door,
            numbered: door.filter(n => n >= 64),
            exitWords: (text.match(/exit\s+\d+/ig) || []).slice(0, 6),
            marks
        };
    });
    check(wumpDirs.numbered.indexOf(91) >= 0 && wumpDirs.numbered.indexOf(95) >= 0,
        "Wumpus door_dir set keeps numbered exit slots 91-95", JSON.stringify(wumpDirs.numbered));
    check(wumpDirs.exits.some(e => /^exit \d+$/.test(String(e.label || ""))),
        "Wumpus look-ahead detects numbered exits", JSON.stringify(wumpDirs.exits));
    check(!wumpDirs.exits.some(e => String(e.label || "").toLowerCase() === "up"),
        "Wumpus does not invent an UP compass exit", JSON.stringify(wumpDirs.exits));
    if (wumpDirs.exitWords.length) {
        check(wumpDirs.marks.some(m => /exit\s*\d+/.test(m)),
            "Wumpus underlines a printed numbered exit", JSON.stringify({ words: wumpDirs.exitWords, marks: wumpDirs.marks }));
    }
    await wumpus.context.close();

    const llrScore = await boot(browser, "LLR3.z8.js", true);
    await submit(llrScore.page, "score");
    await llrScore.page.waitForTimeout(400);
    await llrScore.page.evaluate(() => {
        try { if (window.WorldModel) WorldModel.tick(); } catch (e) {}
        try { if (window.StatTracker) StatTracker.Tick(); } catch (e) {}
    });
    const llrAfter = await state(llrScore.page);
    const exp = llrAfter.stats && llrAfter.stats.experience;
    check(!!exp && exp.confirmed === true && typeof exp.value === "number" && exp.label === "EXP",
        "LLR score text puts EXP on the status model", JSON.stringify(exp));
    check(!!exp && exp.max === 50,
        "LLR score text puts next-level EXP requirement on the model", JSON.stringify(exp));
    const gridExp = await llrScore.page.evaluate(() => {
        const decoded = StatusGridDecoder.decode("East-west passage   LVL:1 STR:12/12 EXP:20/50   20/50 exp");
        return (decoded.metrics || []).map(m => m.key + "=" + m.value + (m.max != null ? ":" + m.max : "") + "/" + m.label);
    });
    check(gridExp.indexOf("experience=20:50/EXP") >= 0,
        "status grid EXP:20/50 decodes as EXP with next-level max", gridExp.join(","));
    await llrScore.context.close();

    await browser.close();
    console.log(`\n${pass} PASS / ${fail} FAIL`);
    if (fail) process.exitCode = 1;
})().catch(error => {
    console.error(error && error.stack || error);
    process.exit(1);
});
