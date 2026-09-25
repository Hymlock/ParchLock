/**
 * D35 destination-resolution cross-check: type the numbered exit command
 * and confirm the REAL post-move roomId equals indiv[door_dir]'s value
 * read BEFORE moving. Read-only research probe, not a gate.
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
    const before = await page.evaluate(() => {
        if (window.ZvmCapture) ZvmCapture.tick();
        const z = window.__PARCHLOCK_ZVM__;
        const m = z.m && z.m.buffer ? new DataView(z.m.buffer, z.m.byteOffset || 0, z.m.byteLength || z.m.length) : (z.ram && z.ram.buffer ? new DataView(z.ram.buffer) : z.ram);
        const snap = ZRamReader.snapshot(m);
        const h = ZRamReader.header(m);
        const indivPtr = ZRamReader.readProp(m, snap.roomId, 3);
        const indiv = ZRamReader.parseIndivTable(m, indivPtr);
        return { roomId: snap.roomId, roomName: snap.roomName, indiv91: indiv[91], indiv92: indiv[92], indiv93: indiv[93] };
    });
    await inject("1");
    const after = await page.evaluate(() => {
        if (window.ZvmCapture) ZvmCapture.tick();
        const z = window.__PARCHLOCK_ZVM__;
        const m = z.m && z.m.buffer ? new DataView(z.m.buffer, z.m.byteOffset || 0, z.m.byteLength || z.m.length) : (z.ram && z.ram.buffer ? new DataView(z.ram.buffer) : z.ram);
        const snap = ZRamReader.snapshot(m);
        return { roomId: snap.roomId, roomName: snap.roomName };
    });
    await browser.close();
    console.log(JSON.stringify({ before, after, matchesIndiv91: after.roomId === before.indiv91 }, null, 2));
})().catch((e) => { console.error(e); process.exit(1); });
