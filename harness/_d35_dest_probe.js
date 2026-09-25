/**
 * D35 destination-resolution research probe (read-only, not a gate).
 * Boots wump2ka live and dumps the raw indiv[door_dir] values against
 * the real object-id space to see whether they look like genuine
 * destination room ids.
 */
const { chromium } = require("playwright");
const { pathToFileURL } = require("node:url");
const path = require("node:path");
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
        const mem = ZvmCapture && ZvmCapture.tick();
        const memBuf = window.__PARCHLOCK_ZVM__ && (window.__PARCHLOCK_ZVM__.m || window.__PARCHLOCK_ZVM__.ram);
        const snap = ZRamReader.snapshot(memBuf.buffer ? new DataView(memBuf.buffer, memBuf.byteOffset || 0, memBuf.byteLength || memBuf.length) : memBuf);
        const roomId = snap.roomId;
        const h = ZRamReader.header(memBuf.buffer ? new DataView(memBuf.buffer, memBuf.byteOffset || 0, memBuf.byteLength || memBuf.length) : memBuf);
        const m = memBuf.buffer ? new DataView(memBuf.buffer, memBuf.byteOffset || 0, memBuf.byteLength || memBuf.length) : memBuf;
        const count = ZRamReader.objectCount(m, h);
        const indivPtr = ZRamReader.readProp(m, roomId, 3);
        const indiv = ZRamReader.parseIndivTable(m, indivPtr);
        const doorDirs = ZRamReader.directionDoorDirs(m);
        const rows = Object.keys(indiv).map((k) => {
            const val = indiv[k];
            const inRange = val >= 1 && val <= count;
            return { doorDir: k, rawValue: val, inRange, shortName: inRange ? ZRamReader.shortName(m, val) : null };
        });
        // also dump every room object's name+id near roomId for context
        const nearbyRooms = [];
        for (let id = Math.max(1, roomId - 3); id <= Math.min(count, roomId + 6); id++) {
            nearbyRooms.push({ id, name: ZRamReader.shortName(m, id) });
        }
        return { roomId, roomName: snap.roomName, isIndivTable: ZRamReader.isIndivTable(indiv), indivPtr, doorDirs, rows, nearbyRooms, exits: snap.exits };
    });
    await browser.close();
    console.log(JSON.stringify(info, null, 2));
})().catch((e) => { console.error(e); process.exit(1); });
