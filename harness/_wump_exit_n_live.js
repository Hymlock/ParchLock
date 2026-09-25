/**
 * Live #28/#29 gate: wump2ka numbered exits must appear as honest exit-N
 * stubs and count in map-stats (not "0 exits").
 * Usage: node harness/_wump_exit_n_live.js
 */
const { chromium } = require("playwright");
const { pathToFileURL } = require("node:url");
const path = require("node:path");
const fs = require("node:fs");
const ROOT = path.resolve(__dirname, "..");
process.chdir(ROOT);

(async () => {
    const chrome = process.env.PW_CHROME || undefined;
    const browser = await chromium.launch({ executablePath: chrome, headless: true });
    const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
    await page.goto(pathToFileURL(path.resolve("play.html")).href + "?story=games/wump2ka.z5.js");
    await page.waitForTimeout(1600);
    await page.evaluate(() => { if (window.Message) Message.Hide(); });
    async function inject(cmd) {
        if (!(await page.locator(".Input.LineInput").count())) return false;
        await page.evaluate((t) => { Input.Clear(); Input.Inject(t, true); }, cmd);
        await page.waitForTimeout(800);
        return true;
    }
    for (let i = 0; i < 50; i++) {
        const t = await page.evaluate(() => (document.body.innerText || ""));
        const has = await page.locator(".Input.LineInput").count();
        if (/Exit 1|jagged cave|polished chamber|watery dead-end/i.test(t) && has) break;
        if (/yes or no|restore a saved game/i.test(t) && has) { await inject("n"); continue; }
        await page.keyboard.press("Space");
        await page.waitForTimeout(160);
    }
    await inject("look");
    const info = await page.evaluate(() => {
        try { if (window.ZvmCapture) ZvmCapture.tick(); } catch (e0) {}
        try { if (window.WorldModel) WorldModel.tick(); } catch (e1) {}
        try { if (window.MapTopology) MapTopology.tick(WorldModel && WorldModel.lastPayload); } catch (e2) {}
        try { if (window.ParchLockMap && ParchLockMap.UpdateStats) ParchLockMap.UpdateStats(); } catch (e3) {}
        const p = WorldModel && WorldModel.lastPayload;
        const exits = (p && p.exits) || [];
        const room = (typeof ParchLockMap !== "undefined" && ParchLockMap.CurrentRoom)
            ? ParchLockMap.GetRoom(ParchLockMap.CurrentRoom)
            : null;
        const counted = (room && typeof MapTopology !== "undefined" && MapTopology.countRoomExits)
            ? MapTopology.countRoomExits(room)
            : 0;
        return {
            roomId: p && p.roomId,
            roomName: p && p.roomName,
            stats: (document.querySelector("#map-stats") && document.querySelector("#map-stats").textContent) || "",
            payloadExits: exits.map((e) => ({
                label: e.label,
                targetRoomId: e.targetRoomId || null,
                hinted: !!e.hinted
            })),
            counted,
            hintedMeta: room && room.ExitMeta ? Object.keys(room.ExitMeta) : []
        };
    });
    await browser.close();
    const stubs = (info.payloadExits || []).filter((e) => /^exit-\d+$/i.test(e.label));
    const ok = stubs.length >= 1 && info.counted >= 1 && !/^1 rooms \/ 0 exits/.test(info.stats);
    const out = Object.assign({ ok, stubCount: stubs.length }, info);
    const outPath = path.join("tools", "screenshots", "matrix", "wump-exit-n-live.json");
    fs.mkdirSync(path.dirname(outPath), { recursive: true });
    fs.writeFileSync(outPath, JSON.stringify(out, null, 2));
    console.log(JSON.stringify(out, null, 2));
    if (!ok) {
        console.error("FAIL wump2ka exit-N stubs: stubs=" + stubs.length + " counted=" + info.counted + " stats=" + info.stats);
        process.exit(1);
    }
    console.log("PASS wump2ka exit-N stubs", stubs.length, "counted", info.counted, info.stats);
})().catch((e) => { console.error(e); process.exit(1); });
