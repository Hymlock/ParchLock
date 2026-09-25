const { chromium } = require("playwright");
const { pathToFileURL } = require("node:url");
const path = require("node:path");
const fs = require("node:fs");

const ROOT = path.resolve(__dirname, "..");
process.chdir(ROOT);

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
        throw new Error("no line input: " + story);
    }
    return page;
}

async function cmd(page, text) {
    await page.evaluate((t) => { Input.Clear(); Input.Inject(t, true); }, text);
    await page.waitForTimeout(1100);
}

async function snap(page) {
    return page.evaluate(() => {
        try { if (window.ZvmCapture) ZvmCapture.tick(); } catch (e0) {}
        const mem = ZRamProvider.getMem();
        const z = ZRamProvider.collect();
        const playerId = ZRamReader.findPlayerId(mem);
        const pl = playerId ? ZRamReader.objectLinks(mem, playerId) : null;
        return {
            playerId,
            playerName: playerId ? (ZRamReader.shortName(mem, playerId) || "") : "",
            parentId: pl && pl.parent,
            parentName: (pl && pl.parent) ? (ZRamReader.shortName(mem, pl.parent) || "") : "",
            roomId: z.roomId,
            roomName: z.roomName,
            scope: (z.discoveredObjects || []).filter((o) => o && o.id).map((o) => o.name + ":" + o.id).slice(0, 12)
        };
    });
}

(async () => {
    const chrome = process.env.PW_CHROME || undefined;
    const browser = await chromium.launch({ executablePath: chrome, headless: true });
    const out = {};
    try {
        // Lost Pig: try object-as-location commands, restore between
        const lpPage = await boot(browser, "games/LostPig.z8.js");
        await cmd(lpPage, "look");
        const lpStart = await snap(lpPage);
        out.lostpigStart = lpStart;
        out.lostpigTrials = [];
        const lpCmds = [
            "enter farm", "go farm", "farm", "enter forest", "go forest", "forest",
            "follow tracks", "go tracks", "climb wall", "enter wall",
            "go to farm", "go to forest", "pig", "enter pig", "sty", "go sty",
            "northeast", "northwest", "southeast", "southwest", "up", "down", "out"
        ];
        for (const c of lpCmds) {
            await cmd(lpPage, c);
            const after = await snap(lpPage);
            const changed = after.roomId && after.roomId !== lpStart.roomId;
            out.lostpigTrials.push({ cmd: c, changed, roomId: after.roomId, roomName: after.roomName, parentName: after.parentName });
            if (changed) {
                out.lostpigHit = { cmd: c, after };
                break;
            }
        }
        await lpPage.close();
        console.log("LOSTPIG", JSON.stringify({ start: lpStart, hit: out.lostpigHit, trials: out.lostpigTrials }, null, 2));

        // Advent: dump player-like objects and a west/east round trip
        const adPage = await boot(browser, "games/Advent.z5.js");
        await cmd(adPage, "look");
        const adDump = await adPage.evaluate(() => {
            const mem = ZRamProvider.getMem();
            const h = ZRamReader.header(mem);
            const count = ZRamReader.objectCount(mem, h);
            const players = [];
            for (let id = 1; id <= Math.min(count, 80); id++) {
                const nm = ZRamReader.shortName(mem, id) || "";
                const obj = ZRamReader.objectLinks(mem, id);
                if (!obj) continue;
                const low = nm.toLowerCase();
                if (/you|self|cretin|grunk|adventurer|player|body/.test(low) || id <= 5) {
                    players.push({
                        id, name: nm, parent: obj.parent,
                        parentName: obj.parent ? (ZRamReader.shortName(mem, obj.parent) || "") : "",
                        child: obj.child
                    });
                }
            }
            const globals = [];
            for (let g = 0; g < 40; g++) {
                const v = ZRamReader.u16(mem, h.globals + g * 2);
                if (v >= 1 && v <= count) {
                    const nm = ZRamReader.shortName(mem, v) || "";
                    if (nm && nm.charAt(0) !== "(") globals.push({ g, v, name: nm });
                }
            }
            return { count, findPlayer: ZRamReader.findPlayerId(mem), players, globals: globals.slice(0, 25), room: ZRamProvider.collect().roomName, roomId: ZRamProvider.collect().roomId };
        });
        await cmd(adPage, "west");
        const adWest = await snap(adPage);
        await cmd(adPage, "east");
        const adEast = await snap(adPage);
        out.advent = { dump: adDump, west: adWest, eastBack: adEast };
        console.log("ADVENT", JSON.stringify(out.advent, null, 2));
        await adPage.close();
    } finally {
        await browser.close();
    }
    fs.writeFileSync("tools/screenshots/matrix/d22-lostpig-advent-probe.json", JSON.stringify(out, null, 2));
})().catch((e) => { console.error(e); process.exit(1); });
