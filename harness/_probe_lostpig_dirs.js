const { chromium } = require("playwright");
const { pathToFileURL } = require("node:url");
const path = require("node:path");
const fs = require("node:fs");
const ROOT = path.resolve(__dirname, "..");
process.chdir(ROOT);

async function boot(browser) {
    const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
    await page.goto(pathToFileURL(path.resolve("play.html")).href + "?story=games/LostPig.z8.js");
    await page.waitForTimeout(1400);
    await page.evaluate(() => { if (window.Message) Message.Hide(); });
    for (let i = 0; i < 16 && !(await page.locator(".Input.LineInput").count()); i++) {
        await page.keyboard.press("Space");
        await page.waitForTimeout(250);
    }
    return page;
}
async function cmd(page, text) {
    await page.evaluate((t) => { Input.Clear(); Input.Inject(t, true); }, text);
    await page.waitForTimeout(1400);
}
async function snap(page) {
    return page.evaluate(() => {
        ZvmCapture.tick();
        const mem = ZRamProvider.getMem();
        const z = ZRamProvider.collect();
        const pid = ZRamReader.findPlayerId(mem);
        const pl = pid ? ZRamReader.objectLinks(mem, pid) : null;
        const text = (document.querySelector("#windowport") && document.querySelector("#windowport").innerText) || "";
        const tail = text.split("\n").slice(-8).map((s) => s.trim()).filter(Boolean);
        return {
            playerId: pid,
            parentId: pl && pl.parent,
            parentName: (pl && pl.parent) ? ZRamReader.shortName(mem, pl.parent) : "",
            roomId: z.roomId,
            roomName: z.roomName,
            scope: (z.discoveredObjects || []).filter((o) => o && o.id).map((o) => o.name + ":" + o.id),
            tail
        };
    });
}

(async () => {
    const browser = await chromium.launch({ executablePath: process.env.PW_CHROME, headless: true });
    const dirs = ["south", "s", "east", "e", "north", "n", "go south", "go east", "go north", "go farm"];
    const out = [];
    try {
        for (const d of dirs) {
            const page = await boot(browser);
            await cmd(page, "look");
            const start = await snap(page);
            await cmd(page, d);
            const after = await snap(page);
            const row = { cmd: d, startRoom: start.roomName + ":" + start.roomId, afterRoom: after.roomName + ":" + after.roomId, parent: after.parentName + ":" + after.parentId, changed: after.roomId !== start.roomId, tail: after.tail };
            out.push(row);
            console.log(JSON.stringify(row));
            await page.close();
        }
    } finally {
        await browser.close();
    }
    fs.writeFileSync("tools/screenshots/matrix/d22-lostpig-dirs.json", JSON.stringify(out, null, 2));
})().catch((e) => { console.error(e); process.exit(1); });
