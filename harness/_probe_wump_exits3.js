const { chromium } = require("playwright");
const { pathToFileURL } = require("node:url");
const path = require("node:path");
const fs = require("node:fs");
process.chdir(path.resolve(__dirname, ".."));

(async () => {
    const chrome = process.env.PW_CHROME || "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
    const browser = await chromium.launch({ executablePath: chrome, headless: true });
    const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
    await page.goto(pathToFileURL(path.resolve("play.html")).href + "?story=games/wump2ka.z5.js");
    await page.waitForTimeout(1600);
    await page.evaluate(() => { if (window.Message) Message.Hide(); });
    for (let i = 0; i < 12 && !(await page.locator(".Input.LineInput").count()); i++) {
        await page.keyboard.press("Space");
        await page.waitForTimeout(220);
    }
    async function inject(cmd) {
        if (!(await page.locator(".Input.LineInput").count())) return false;
        await page.evaluate((t) => { Input.Clear(); Input.Inject(t, true); }, cmd);
        await page.waitForTimeout(700);
        return true;
    }
    await inject("n");
    for (let i = 0; i < 30; i++) {
        const t = await page.evaluate(() => (document.body.innerText || ""));
        if (/Exit 1|exit 1 corkscrews|jagged cave|polished chamber/i.test(t) && await page.locator(".Input.LineInput").count()) break;
        if (await page.locator(".Input.LineInput").count() && /What do you want to do|>$/m.test(t) && i > 8) break;
        await page.keyboard.press("Space");
        await page.waitForTimeout(180);
    }
    await inject("look");
    const info = await page.evaluate(() => {
        try { ZvmCapture.tick(); WorldModel.tick(); } catch (e) {}
        const mem = ZRamProvider.getMem();
        const p = WorldModel.lastPayload;
        const h = ZRamReader.header(mem);
        const count = ZRamReader.objectCount(mem, h);
        const len = mem.byteLength || 0;
        function u16(a) { return ZRamReader.u16(mem, a); }
        const roomId = (p && p.roomId) || 0;
        const text = (document.body.innerText || "").slice(-1000);
        const stats = (document.querySelector("#map-stats") && document.querySelector("#map-stats").textContent) || "";
        const objHits = [];
        const scanMax = Math.min(len - 800, 80000);
        for (let addr = 200; addr < scanMax; addr += 2) {
            for (const mul of [2]) {
                let roomOk = 0, roomZero = 0, roomNoise = 0;
                for (let id = 25; id <= 145; id++) {
                    const v = u16(addr + id * mul);
                    if (v >= 25 && v <= 145) roomOk++;
                    else if (v === 0) roomZero++;
                    else roomNoise++;
                }
                if (roomOk >= 30 && roomNoise <= 25) {
                    objHits.push({
                        addr, roomOk, roomZero, roomNoise,
                        atRoom: roomId ? u16(addr + roomId * mul) : 0,
                        at38: u16(addr + 38 * mul),
                        at37: u16(addr + 37 * mul),
                        at25: u16(addr + 25 * mul)
                    });
                }
            }
        }
        objHits.sort((a, b) => b.roomOk - a.roomOk || a.roomNoise - b.roomNoise);
        // 121 x 5 table of room-ids
        const tableHits = [];
        for (const cols of [2, 3, 4, 5]) {
            const rows = 121;
            const bytes = rows * cols * 2;
            for (let addr = 200; addr + bytes < Math.min(len, 70000); addr += 2) {
                let good = 0, bad = 0, totalEx = 0;
                for (let r = 0; r < rows; r++) {
                    let ex = 0, rowBad = 0;
                    for (let c = 0; c < cols; c++) {
                        const v = u16(addr + (r * cols + c) * 2);
                        if (v === 0) continue;
                        if (v >= 25 && v <= 145) ex++;
                        else rowBad++;
                    }
                    if (rowBad) bad++;
                    else if (ex >= 1) { good++; totalEx += ex; }
                }
                if (good >= 60 && bad <= 20) {
                    tableHits.push({ addr, cols, good, bad, totalEx, row0: Array.from({ length: cols }, (_, c) => u16(addr + c * 2)) });
                }
            }
        }
        tableHits.sort((a, b) => b.good - a.good);
        const custom = ZRamReader.objectLinks(mem, 171);
        const compass = ZRamReader.children(mem, 6).map((c) => {
            const doorDir = ZRamReader.readProp(mem, c, 21);
            return {
                id: c,
                name: ZRamReader.shortName(mem, c),
                doorDir,
                dest: roomId ? ZRamReader.readProp(mem, roomId, doorDir) : null
            };
        });
        return {
            stats, text, roomId, roomName: p && p.roomName, exits: p && p.exits,
            custom: custom && { parent: custom.parent, pname: ZRamReader.shortName(mem, custom.parent) },
            kids: roomId ? ZRamReader.children(mem, roomId).map((c) => ({ id: c, n: ZRamReader.shortName(mem, c) })) : [],
            compassNum: compass.filter((c) => /exit/i.test(c.name || "")),
            objHits: objHits.slice(0, 10),
            tableHits: tableHits.slice(0, 8),
            lookAhead: roomId ? ZRamReader.lookAheadExits(mem, roomId) : [],
            memLen: len
        };
    });
    console.log(JSON.stringify(info, null, 2));
    fs.writeFileSync("tools/screenshots/matrix/wump-exits-probe3.json", JSON.stringify(info, null, 2));
    await browser.close();
})().catch((e) => { console.error(e); process.exit(1); });
