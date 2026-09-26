/**
 * D170 #790 adversarial live probe. 412x860, real wump2ka, operator save.
 * Does not edit js/Actionable.js. Measures Claude's RoomLines-gate claim.
 * Usage: node harness/_d170_wumpus_underline_probe.js
 */
const { chromium } = require("playwright");
const { pathToFileURL } = require("url");
const fs = require("fs");
const path = require("path");

const SAVE_PATH = "C:\\Users\\hymlo\\Downloads\\wump2ka-z5-browser-save.json";
const OUT = path.resolve(__dirname, "..", "tools", "screenshots", "matrix", "d170-wumpus-underline-probe.json");

function storyUrl() {
    return pathToFileURL(path.resolve(__dirname, "..", "play.html")).href
        + "?story=games/wump2ka.z5.js&t=" + Date.now();
}

async function waitLine(page, ms) {
    const start = Date.now();
    while (Date.now() - start < ms) {
        const n = await page.locator(".Input.LineInput:visible").count();
        if (n) return true;
        await page.keyboard.press("Space").catch(() => {});
        await page.waitForTimeout(250);
    }
    return false;
}

async function submit(page, cmd) {
    await page.evaluate((t) => {
        try { Message.Hide(); } catch (e) {}
        Input.Clear();
        Input.Inject(t, true);
    }, cmd);
    await page.waitForTimeout(900);
    for (let i = 0; i < 8; i++) {
        const more = await page.evaluate(() => {
            const t = (document.body.innerText || "").slice(-400).toLowerCase();
            return /\bmore\b|\[[^\]]*(press|space|key)/.test(t) && !document.querySelector(".Input.LineInput");
        });
        if (!more) break;
        await page.keyboard.press("Space");
        await page.waitForTimeout(280);
    }
}

(async () => {
    if (!fs.existsSync(SAVE_PATH)) throw new Error("missing save " + SAVE_PATH);
    const save = JSON.parse(fs.readFileSync(SAVE_PATH, "utf8"));
    const browser = await chromium.launch({ executablePath: process.env.PW_CHROME, headless: true });
    const ctx = await browser.newContext({ viewport: { width: 412, height: 860 }, isMobile: true, hasTouch: true });
    const page = await ctx.newPage();
    const pageErrors = [];
    page.on("pageerror", (e) => pageErrors.push(String(e && e.message).slice(0, 240)));

    await page.addInitScript(() => {
        try {
            localStorage.setItem("PL_MobileTutorialSeen", "1");
            localStorage.setItem("PL_TutorialSeen", "1");
        } catch (e) {}
    });

    await page.goto(storyUrl(), { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(800);
    await page.evaluate(() => {
        const s = document.querySelector(".parchlock-splash__start");
        if (s) s.click();
        try { if (window.Message) Message.Hide(); } catch (e) {}
    });
    await page.waitForTimeout(3000);
    await page.keyboard.press("Space");
    await page.waitForTimeout(1400);
    await page.evaluate(() => { try { Message.Hide(); } catch (e) {} });

    const boot = await page.evaluate(() => ({
        gameId: (window.ParchLock && ParchLock.GameId) || "",
        story: (window.ParchLock && ParchLock.GameFilename) || "",
        text: (document.body.innerText || "").slice(0, 800),
        line: !!document.querySelector(".Input.LineInput"),
        dialog: !!document.querySelector("#dialog")
    }));

    const injected = await page.evaluate(({ save, gameId }) => {
        const out = { gameId: gameId || null, keys: [], story: (window.ParchLock && ParchLock.GameFilename) || null };
        (save.Save || []).forEach((entry) => {
            if (!entry || !entry.Key) return;
            const parts = String(entry.Key).split(":");
            if (gameId && parts.length >= 4) parts[2] = gameId;
            const key = parts.join(":");
            localStorage.setItem(key, entry.Data);
            out.keys.push(key);
        });
        try {
            if (Array.isArray(save.Map) && window.ParchLockMap) {
                ParchLockMap.Rooms = save.Map;
                localStorage.setItem("PL_Map_" + (ParchLock.GameFilename || "games/wump2ka.z5.js"), JSON.stringify(save.Map));
            }
        } catch (e) { out.mapErr = String(e); }
        return out;
    }, { save, gameId: boot.gameId });

    const restoreQ = /restore a saved game/i.test(boot.text);
    if (restoreQ) {
        await submit(page, "yes");
        await page.waitForTimeout(800);
        const dlg = await page.evaluate(() => {
            const d = document.querySelector("#dialog");
            return d ? d.innerText.slice(0, 500) : (document.body.innerText || "").slice(-500);
        });
        injected.dialogAfterYes = dlg;
        await page.keyboard.press("Digit1").catch(() => {});
        await page.keyboard.press("Enter").catch(() => {});
        const firstBtn = page.locator("#dialog button, #dialog input[type=button], .Dialog input[type=button]").first();
        if (await firstBtn.count()) await firstBtn.click().catch(() => {});
        await page.waitForTimeout(1500);
    }

    const hasLine = await waitLine(page, 8000);
    injected.boot = boot;
    injected.restoreQ = restoreQ;

    const stuckRestore = await page.evaluate(() => /please answer yes or no/i.test(document.body.innerText || ""));
    if (stuckRestore) {
        await submit(page, "no");
        await waitLine(page, 6000);
        injected.fellBackNo = true;
    }

    await page.evaluate(() => {
        window.__d170log = [];
        if (window.Actionable && !Actionable.__d170wrapped) {
            const orig = Actionable.Refresh.bind(Actionable);
            Actionable.Refresh = function () {
                const snap = function (tag) {
                    const lines = Array.from(document.querySelectorAll("#windowport .BufferWindow .BufferLine"));
                    let lastInput = -1;
                    lines.forEach((line, i) => { if (line.querySelector(".Style_input")) lastInput = i; });
                    let heading = -1, lastBanner = -1, subAfter = -1;
                    const payload = (window.WorldModel && WorldModel.lastPayload) || null;
                    const names = [];
                    try { if (payload && payload.roomName) names.push(String(payload.roomName).toLowerCase()); } catch (e) {}
                    try { if (window.ParchLockMap && ParchLockMap.CurrentRoom) names.push(String(ParchLockMap.CurrentRoom).toLowerCase()); } catch (e) {}
                    const clean = (t) => String(t || "").replace(/\s+/g, " ").trim().toLowerCase();
                    const nameMatches = (text) => {
                        const t = clean(text);
                        if (!t) return false;
                        for (let i = 0; i < names.length; i++) {
                            const n = names[i];
                            if (!n) continue;
                            if (t === n) return true;
                            const shorter = t.length < n.length ? t : n;
                            const longer = t.length < n.length ? n : t;
                            if (shorter.length >= 8 && longer.indexOf(shorter) === 0) return true;
                        }
                        return false;
                    };
                    lines.forEach((line, i) => {
                        const headers = line.classList && line.classList.contains("Style_subheader")
                            ? [line]
                            : Array.from(line.querySelectorAll(".Style_subheader"));
                        if (line.matches && line.matches(".Style_subheader")) headers.push(line);
                        if (headers.length) lastBanner = i;
                        if (headers.some((el) => nameMatches(el.textContent))) heading = i;
                        if (i > lastInput && headers.length) subAfter = i;
                    });
                    const live = Array.from(document.querySelectorAll(".pl-act:not(.is-stale)"));
                    const stale = Array.from(document.querySelectorAll(".pl-act.is-stale"));
                    const roomLines = (Actionable.RoomLines || []).filter((l) => l && l.isConnected);
                    const latestStart = Math.max(lastInput, heading >= lastInput ? heading : -1) + 1;
                    const latestText = lines.slice(latestStart).map((l) => l.textContent).join("\n").slice(0, 800);
                    const visibleExit = /exit\s+\d/i.test(lines.map((l) => l.textContent).join("\n"));
                    const roomExit = /exit\s+\d/i.test(roomLines.map((l) => l.textContent).join("\n"));
                    const stylesAfter = lines.slice(Math.max(0, lastInput + 1), Math.min(lines.length, lastInput + 8)).map((l) => ({
                        t: String(l.textContent || "").slice(0, 80),
                        cls: l.className,
                        sub: !!(l.querySelector && l.querySelector(".Style_subheader")),
                        header: !!(l.querySelector && l.querySelector(".Style_header"))
                    }));
                    let playerParent = null, loc = null, chain = [], ram = null;
                    try {
                        const mem = window.ZRamProvider && ZRamProvider.getMem && ZRamProvider.getMem();
                        const pid = (payload && payload.playerId) || (payload && payload.probe && payload.probe.playerId) || 0;
                        if (mem && window.ZRamReader && pid) {
                            const links = ZRamReader.objectLinks(mem, pid);
                            playerParent = links && links.parent;
                            let walk = links, guard = 0;
                            while (walk && walk.parent > 0 && guard++ < 8) {
                                const cid = walk.parent;
                                const cn = ZRamReader.shortName(mem, cid) || "";
                                const attrs = (ZRamReader.attrsFromObject && ZRamReader.attrsFromObject(mem, cid)) || {};
                                const kids = (ZRamReader.children && ZRamReader.children(mem, cid)) || [];
                                const plausible = !!(ZRamReader.isPlausibleMapRoom && ZRamReader.isPlausibleMapRoom(mem, cid));
                                chain.push({
                                    id: cid, name: cn, parent: (ZRamReader.objectLinks(mem, cid) || {}).parent,
                                    kids: kids.length, plausible,
                                    container: !!attrs.container, supporter: !!attrs.supporter, vehicle: !!attrs.vehicle
                                });
                                walk = ZRamReader.objectLinks(mem, cid);
                            }
                            loc = ZRamReader.findLikelyLocation(mem, pid, "") || 0;
                            ram = {
                                playerId: pid,
                                playerName: ZRamReader.shortName(mem, pid) || "",
                                loc, locName: loc ? (ZRamReader.shortName(mem, loc) || "") : "",
                                locPlausible: !!(loc && ZRamReader.isPlausibleMapRoom(mem, loc)),
                                enclosing: (ZRamReader.enclosingRoom && ZRamReader.enclosingRoom(mem, pid)) || 0,
                                snapRoomId: (ZRamReader.snapshot(mem) || {}).roomId || 0,
                                snapRoomName: (ZRamReader.snapshot(mem) || {}).roomName || "",
                                snapObjects: ((ZRamReader.snapshot(mem) || {}).discoveredObjects || []).map((o) => o && o.name),
                                snapExits: ((ZRamReader.snapshot(mem) || {}).exits || []).map((e) => e && e.label)
                            };
                        }
                    } catch (eLoc) { playerParent = String(eLoc); }
                    const structural = Actionable.isStructuralPayload(payload);
                    return {
                        tag,
                        lineInput: !!document.querySelector(".Input.LineInput"),
                        structural,
                        probe: payload && payload.probe,
                        engineMode: payload && payload.engineMode,
                        roomId: payload && payload.roomId,
                        roomName: payload && payload.roomName,
                        mapRoom: window.ParchLockMap && ParchLockMap.CurrentRoom,
                        exits: ((payload && payload.exits) || []).map((e) => e && e.label),
                        objects: ((payload && payload.discoveredObjects) || []).map((o) => o && o.name),
                        marks: live.length,
                        marksStale: stale.length,
                        liveNouns: live.map((el) => el.dataset.noun).slice(0, 20),
                        staleNouns: stale.map((el) => el.dataset.noun).slice(0, 12),
                        heading, lastInput, lastBanner, subAfter,
                        lineCount: lines.length,
                        roomLinesCount: roomLines.length,
                        roomLinesHasExit: roomExit,
                        latestHasExit: /exit\s+\d/i.test(latestText),
                        visibleExit,
                        latestText,
                        roomHeadingConnected: !!(Actionable.RoomHeading && Actionable.RoomHeading.isConnected),
                        signature: String(Actionable.Signature || "").slice(0, 180),
                        liveMarksArrLen: (Actionable.LiveMarks || []).length,
                        playerId: payload && payload.playerId,
                        objCount: ((payload && payload.discoveredObjects) || []).length,
                        exitCount: ((payload && payload.exits) || []).length,
                        playerParent, loc, chain, ram,
                        underwater: /partly underwater|need to swim/i.test(lines.map((l) => l.textContent).join("\n")),
                        stylesAfter,
                        gate: {
                            roomChanged: structural && payload && payload.roomId != null
                                ? Actionable.Scope.roomId !== payload.roomId
                                : Actionable.Scope.roomName !== (window.ParchLockMap && ParchLockMap.CurrentRoom),
                            newHeading: heading >= 0 && lines[heading] !== Actionable.RoomHeading,
                            headingGe0: heading >= 0,
                            roomLinesConnected: roomLines.length > 0
                        }
                    };
                };
                const before = snap("before");
                const ret = orig();
                const after = snap("after");
                window.__d170log.push({ before, after, t: Date.now() });
                if (window.__d170log.length > 40) window.__d170log.splice(0, window.__d170log.length - 40);
                return ret;
            };
            Actionable.__d170wrapped = true;
        }
    });

    async function measure(label) {
        await page.evaluate(() => { try { Actionable.Refresh(); } catch (e) {} });
        await page.waitForTimeout(200);
        return page.evaluate((label) => {
            const log = window.__d170log || [];
            return {
                label,
                last: log[log.length - 1] || null,
                textTail: (document.body.innerText || "").slice(-1200)
            };
        }, label);
    }

    const shots = [];
    shots.push(await measure("after-boot-or-restore"));

    if (await page.locator(".Input.LineInput:visible").count()) {
        await submit(page, "look");
        shots.push(await measure("after-look"));
        await submit(page, "x2");
        shots.push(await measure("after-x2"));
        await submit(page, "swim");
        shots.push(await measure("after-swim"));
        await submit(page, "x1");
        shots.push(await measure("after-x1"));
        await submit(page, "look");
        shots.push(await measure("after-look-2"));
    }

    const log = await page.evaluate(() => window.__d170log || []);
    const result = { injected, hasLine, pageErrors, shots, refreshCount: log.length, logTail: log.slice(-12) };
    fs.mkdirSync(path.dirname(OUT), { recursive: true });
    fs.writeFileSync(OUT, JSON.stringify(result, null, 2));
    console.log(JSON.stringify({
        out: OUT,
        hasLine,
        gameId: injected.gameId,
        keys: injected.keys,
        shots: shots.map((s) => ({
            label: s.label,
            after: s.last && s.last.after && {
                structural: s.last.after.structural,
                roomId: s.last.after.roomId,
                roomName: s.last.after.roomName,
                marks: s.last.after.marks,
                marksStale: s.last.after.marksStale,
                heading: s.last.after.heading,
                lastInput: s.last.after.lastInput,
                lastBanner: s.last.after.lastBanner,
                subAfter: s.last.after.subAfter,
                exits: s.last.after.exits,
                objects: s.last.after.objects,
                gate: s.last.after.gate,
                roomLinesHasExit: s.last.after.roomLinesHasExit,
                latestHasExit: s.last.after.latestHasExit,
                playerParent: s.last.after.playerParent,
                loc: s.last.after.loc,
                playerId: s.last.after.playerId,
                objCount: s.last.after.objCount,
                chain: s.last.after.chain,
                ram: s.last.after.ram,
                underwater: s.last.after.underwater,
                liveNouns: s.last.after.liveNouns
            },
            tail: (s.textTail || "").slice(-280)
        }))
    }, null, 2));
    await browser.close();
})().catch((err) => {
    console.error(err);
    process.exit(1);
});
