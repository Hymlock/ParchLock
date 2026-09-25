/**
 * Live dump: wump2ka CompassDirection children vs printed Exit N.
 * Usage: node harness/_probe_wump_compass.js
 */
const { chromium } = require("playwright");
const { pathToFileURL } = require("node:url");
const path = require("node:path");
const fs = require("node:fs");

const ROOT = path.resolve(__dirname, "..");
process.chdir(ROOT);

(async () => {
    const chrome = process.env.PW_CHROME || "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
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
        try { ZvmCapture.tick(); WorldModel.tick(); } catch (e0) {}
        const mem = ZRamProvider.getMem();
        const p = WorldModel.lastPayload;
        const h = ZRamReader.header(mem);
        const count = ZRamReader.objectCount(mem, h);
        function listProps(id) {
            const obj = ZRamReader.objectLinks(mem, id);
            if (!obj || !obj.props) return [];
            let addr = obj.props;
            const textLen = ZRamReader.u8(mem, addr);
            addr += 1 + textLen * 2;
            const props = [];
            let guard = 0;
            while (guard++ < 80) {
                const sizebyte = ZRamReader.u8(mem, addr);
                if (!sizebyte) break;
                let num, sz, dataAddr;
                if (h.version <= 3) {
                    num = sizebyte & 0x1f;
                    sz = (sizebyte >> 5) + 1;
                    dataAddr = addr + 1;
                    addr = dataAddr + sz;
                } else {
                    num = sizebyte & 0x3f;
                    if (sizebyte & 0x80) {
                        const sizebyte2 = ZRamReader.u8(mem, addr + 1);
                        sz = sizebyte2 & 0x3f;
                        if (sz === 0) sz = 64;
                        dataAddr = addr + 2;
                        addr = dataAddr + sz;
                    } else {
                        sz = (sizebyte & 0x40) ? 2 : 1;
                        dataAddr = addr + 1;
                        addr = dataAddr + sz;
                    }
                }
                const words = [];
                for (let i = 0; i + 1 < sz && words.length < 12; i += 2) words.push(ZRamReader.u16(mem, dataAddr + i));
                if (sz === 1) words.push(ZRamReader.u8(mem, dataAddr));
                props.push({
                    num, sz, words,
                    decoded: words.map((w) => ({
                        w,
                        asObj: (w >= 1 && w <= count) ? (ZRamReader.shortName(mem, w) || "") : ""
                    }))
                });
            }
            return props;
        }
        let compassId = 0;
        for (let id = 1; id <= Math.min(count, 40); id++) {
            const nm = (ZRamReader.shortName(mem, id) || "").toLowerCase();
            if (nm === "compass") { compassId = id; break; }
        }
        const kids = compassId ? ZRamReader.children(mem, compassId) : [];
        const dirs = kids.map((id) => ({
            id,
            name: ZRamReader.shortName(mem, id),
            parent: (ZRamReader.objectLinks(mem, id) || {}).parent,
            props: listProps(id)
        }));
        const stats = (document.querySelector("#map-stats") && document.querySelector("#map-stats").textContent) || "";
        const text = (document.body.innerText || "");
        const exitMentions = (text.match(/Exit \d+/gi) || []).slice(-8);
        return {
            stats,
            exitMentions,
            roomId: p && p.roomId,
            roomName: p && p.roomName,
            payloadExits: p && p.exits,
            lookAhead: (p && p.roomId) ? ZRamReader.lookAheadExits(mem, p.roomId) : [],
            compassId,
            dirs,
            objectCount: count,
            textTail: text.slice(-700)
        };
    });
    const out = path.join("tools", "screenshots", "matrix", "wump-compass-probe.json");
    fs.mkdirSync(path.dirname(out), { recursive: true });
    fs.writeFileSync(out, JSON.stringify(info, null, 2));
    console.log(JSON.stringify({
        stats: info.stats,
        roomId: info.roomId,
        roomName: info.roomName,
        exitMentions: info.exitMentions,
        payloadExits: info.payloadExits,
        lookAhead: info.lookAhead,
        compassId: info.compassId,
        dirs: (info.dirs || []).map((d) => ({
            id: d.id,
            name: d.name,
            props: (d.props || []).map((pr) => ({
                num: pr.num,
                words: pr.decoded
            }))
        }))
    }, null, 2));
    await browser.close();
})().catch((e) => { console.error(e); process.exit(1); });
