/**
 * Throwaway probe: start-room parent(player) + exits + trial moves
 * for the D22 matrix stories the assignment named.
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

const SPECS = [
    { name: "anchorhead", re: /anchor/i, trials: ["southeast", "northwest", "south", "east", "west", "north"] },
    { name: "lostpig", re: /LostPig/i, trials: ["east", "west", "north", "south", "in"] },
    { name: "advent", re: /^Advent\.z5\.js$/i, trials: ["west", "east", "south", "north", "in"] }
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
        const viaParent = !!(parentId && z.roomId && parentId === z.roomId && parentName && parentName.charAt(0) !== "(");
        const discovered = (z.discoveredObjects || []).filter((o) => o && o.id != null && o.name);
        return {
            playerId,
            playerName: (mem && playerId) ? (ZRamReader.shortName(mem, playerId) || "") : "",
            parentId: parentId || 0,
            parentName,
            roomId: z.roomId || null,
            roomName: z.roomName || "",
            viaParent,
            probe: z.probe,
            scope: discovered.map((o) => o.name + ":" + o.id).slice(0, 10),
            exits: (z.exits || []).map((e) => ({
                label: e.label,
                targetRoomId: e.targetRoomId,
                targetRoomName: e.targetRoomName
            }))
        };
    });
}

(async () => {
    const chrome = process.env.PW_CHROME || undefined;
    const browser = await chromium.launch({ executablePath: chrome, headless: true });
    const out = [];
    try {
        for (const spec of SPECS) {
            const row = { name: spec.name, story: pickStory(spec.re) };
            const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
            try {
                await page.goto(pathToFileURL(path.resolve("play.html")).href + "?story=" + row.story);
                await page.waitForTimeout(1400);
                await page.evaluate(() => { if (window.Message) Message.Hide(); });
                for (let i = 0; i < 16 && !(await page.locator(".Input.LineInput").count()); i++) {
                    await page.keyboard.press("Space");
                    await page.waitForTimeout(250);
                }
                if (!(await page.locator(".Input.LineInput").count())) {
                    row.err = "no line input";
                    out.push(row);
                    await page.close();
                    continue;
                }
                await page.evaluate((t) => { Input.Clear(); Input.Inject(t, true); }, "look");
                await page.waitForTimeout(900);
                row.start = await snap(page);
                row.trials = [];
                for (const dir of spec.trials) {
                    await page.evaluate((t) => { Input.Clear(); Input.Inject(t, true); }, dir);
                    await page.waitForTimeout(900);
                    const after = await snap(page);
                    const changed = after.roomId && after.roomId !== row.start.roomId;
                    row.trials.push({ dir, changed, roomId: after.roomId, roomName: after.roomName, viaParent: after.viaParent, parentName: after.parentName, scope: after.scope, exits: after.exits });
                    if (changed) {
                        // try reverse of last dir-ish: undo
                        await page.evaluate((t) => { Input.Clear(); Input.Inject(t, true); }, "undo");
                        await page.waitForTimeout(900);
                        const undid = await snap(page);
                        row.undoAfter = { dir, roomId: undid.roomId, roomName: undid.roomName, viaParent: undid.viaParent };
                        break;
                    }
                }
            } catch (e) {
                row.err = String(e && e.message || e);
            }
            out.push(row);
            console.log(JSON.stringify(row, null, 2));
            await page.close().catch(() => {});
        }
    } finally {
        await browser.close();
    }
    fs.mkdirSync(path.join("tools", "screenshots", "matrix"), { recursive: true });
    fs.writeFileSync(path.join("tools", "screenshots", "matrix", "d22-move-probe.json"), JSON.stringify(out, null, 2));
})().catch((e) => { console.error(e); process.exit(1); });
