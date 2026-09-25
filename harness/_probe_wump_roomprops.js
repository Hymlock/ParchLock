/**
 * Dump C_ROOMS instance properties + pointer follows + index tables.
 * Usage: node harness/_probe_wump_roomprops.js
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
        const len = mem.byteLength || 0;
        const staticMem = h.staticMem || 0;
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
                    num = sizebyte & 0x1f; sz = (sizebyte >> 5) + 1;
                    dataAddr = addr + 1; addr = dataAddr + sz;
                } else {
                    num = sizebyte & 0x3f;
                    if (sizebyte & 0x80) {
                        const sizebyte2 = ZRamReader.u8(mem, addr + 1);
                        sz = sizebyte2 & 0x3f; if (sz === 0) sz = 64;
                        dataAddr = addr + 2; addr = dataAddr + sz;
                    } else {
                        sz = (sizebyte & 0x40) ? 2 : 1;
                        dataAddr = addr + 1; addr = dataAddr + sz;
                    }
                }
                const words = [];
                for (let i = 0; i + 1 < sz && words.length < 16; i += 2) words.push(ZRamReader.u16(mem, dataAddr + i));
                if (sz === 1) words.push(ZRamReader.u8(mem, dataAddr));
                props.push({ num, sz, dataAddr, words });
            }
            return props;
        }
        function peek(addr, n) {
            if (addr < 0 || addr + n * 2 >= len) return null;
            const words = [];
            for (let i = 0; i < n; i++) {
                const v = ZRamReader.u16(mem, addr + i * 2);
                words.push({
                    v,
                    n: (v >= 1 && v <= count) ? (ZRamReader.shortName(mem, v) || "") : ""
                });
            }
            return words;
        }
        const roomId = p && p.roomId;
        const sampleIds = [25, 26, 28, roomId, roomId && roomId + 1].filter(Boolean);
        const rooms = sampleIds.map((id) => {
            const props = listProps(id);
            return {
                id,
                name: ZRamReader.shortName(mem, id),
                parent: (ZRamReader.objectLinks(mem, id) || {}).parent,
                child: (ZRamReader.objectLinks(mem, id) || {}).child,
                props: props.map((pr) => ({
                    num: pr.num,
                    sz: pr.sz,
                    words: pr.words,
                    asObj: pr.words.map((w) => (w >= 1 && w <= count) ? (ZRamReader.shortName(mem, w) || "") : ""),
                    followByte: peek(pr.words[0] || 0, 8),
                    followPacked: peek((pr.words[0] || 0) * 4, 8)
                }))
            };
        });
        const caveMin = 25, caveMax = 146;
        const indexHits = [];
        const roomNum = roomId ? roomId - 24 : 0;
        for (const cols of [2, 3, 4, 5]) {
            for (const indexBase of [0, 1]) {
                const rows = 121;
                const bytes = rows * cols * 2;
                for (let addr = 64; addr + bytes < Math.min(staticMem || len, 70000); addr += 2) {
                    let good = 0, bad = 0, zeros = 0, totalEx = 0;
                    for (let r = 0; r < rows; r++) {
                        let ex = 0, rowBad = 0;
                        for (let c = 0; c < cols; c++) {
                            const v = ZRamReader.u16(mem, addr + (r * cols + c) * 2);
                            if (v === 0) { zeros++; continue; }
                            if (v >= 1 && v <= 121) ex++;
                            else if (v >= caveMin && v <= caveMax) ex++;
                            else rowBad++;
                        }
                        if (rowBad) bad++;
                        else if (ex >= 1) { good++; totalEx += ex; }
                    }
                    if (good >= 80 && bad <= 20) {
                        const idx = roomNum - indexBase;
                        const at = [];
                        if (idx >= 0 && idx < rows) {
                            for (let c = 0; c < cols; c++) {
                                const v = ZRamReader.u16(mem, addr + (idx * cols + c) * 2);
                                at.push({
                                    v,
                                    n: (v >= 1 && v <= count) ? (ZRamReader.shortName(mem, v) || "") : "",
                                    asRoom: (v >= 1 && v <= 121) ? ("C_ROOMS_" + v) : ""
                                });
                            }
                        }
                        indexHits.push({ addr, cols, indexBase, good, bad, zeros, totalEx, at });
                    }
                }
            }
        }
        indexHits.sort((a, b) => b.good - a.good || b.totalEx - a.totalEx);
        const byteHits = [];
        for (const cols of [2, 3, 4, 5]) {
            const rows = 121;
            const bytes = rows * cols;
            for (let addr = 64; addr + bytes < Math.min(staticMem || len, 70000); addr += 1) {
                let good = 0, bad = 0, zeros = 0, totalEx = 0;
                for (let r = 0; r < rows; r++) {
                    let ex = 0, rowBad = 0;
                    for (let c = 0; c < cols; c++) {
                        const v = ZRamReader.u8(mem, addr + r * cols + c);
                        if (v === 0) { zeros++; continue; }
                        if (v >= 1 && v <= 121) ex++;
                        else rowBad++;
                    }
                    if (rowBad) bad++;
                    else if (ex >= 1) { good++; totalEx += ex; }
                }
                if (good >= 90 && bad <= 10) {
                    const idx = roomNum - 1;
                    const at = [];
                    if (idx >= 0 && idx < rows) {
                        for (let c = 0; c < cols; c++) {
                            const v = ZRamReader.u8(mem, addr + idx * cols + c);
                            at.push({ v, asRoom: v ? ("C_ROOMS_" + v) : "" });
                        }
                    }
                    byteHits.push({ addr, cols, good, bad, zeros, totalEx, at });
                }
            }
        }
        byteHits.sort((a, b) => b.good - a.good);
        const text = document.body.innerText || "";
        return {
            stats: (document.querySelector("#map-stats") && document.querySelector("#map-stats").textContent) || "",
            roomId,
            roomName: p && p.roomName,
            roomNum,
            staticMem,
            objectCount: count,
            exitMentions: (text.match(/Exit \d+[^.]*\./gi) || []).slice(-6),
            rooms,
            indexHits: indexHits.slice(0, 8),
            byteHits: byteHits.slice(0, 8),
            textTail: text.slice(-500)
        };
    });
    const out = path.join("tools", "screenshots", "matrix", "wump-roomprops-probe.json");
    fs.mkdirSync(path.dirname(out), { recursive: true });
    fs.writeFileSync(out, JSON.stringify(info, null, 2));
    console.log(JSON.stringify({
        stats: info.stats,
        roomId: info.roomId,
        roomName: info.roomName,
        roomNum: info.roomNum,
        staticMem: info.staticMem,
        exitMentions: info.exitMentions,
        rooms: info.rooms,
        indexHits: info.indexHits,
        byteHits: info.byteHits
    }, null, 2));
    await browser.close();
})().catch((e) => { console.error(e); process.exit(1); });
